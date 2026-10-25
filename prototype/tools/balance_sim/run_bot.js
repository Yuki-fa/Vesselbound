#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {performance:wall}=require('node:perf_hooks');
const {install,BYPASSES,NOOPS,source}=require('./bot_runtime');
const {policies,score,character,enchant,placement,arrange,layoutScore,exchangeChoices,sacrificePlans}=require('./policies');
const overrides=require('./bot_override');
const lookahead=require('./lookahead');
const {isolated}=require('./bot_sandbox');
const {useItems:useBotItems}=require('./bot_items');
const boons=require('./bot_boons');
const planner=require('./planner');
const horizon=require('./planner_horizon');

const SCHEMA_VERSION=1;
const MAX_ACTIONS=300;
let api,loaded;
function rng(seed) {let t=seed>>>0;return ()=>{t=(t+0x6D2B79F5)>>>0;let x=Math.imul(t^(t>>>15),t|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};}
function cardInfo(c) {
  if(!c) return null;
  return {id:c.id,name:c.name,category:overrides.kind(c),color:c.color||'',rarity:c.rarity,grade:c.grade,
    power:c.power??c.atk??0,life:c.life??c.hp??0,desc:c.desc||'',directions:c.directions||[],
    keywords:c.keywords||[],triple:!!c._tripleMerged,bond:!!c._merged,
    ...(c.boon?{boon:clone(c.boon)}:{}),...(c._towerBoonBoss?{towerBoonBoss:true}:{})};
}
function boardInfo() {return G.mainBoard.map((c,slot)=>c?{slot,...cardInfo(c),powerId:mapPanelPowerIdAt(slot)}:null);}
function enemyInfo(e) {return {id:e.id,name:e.name,atk:e.atk,hp:e.hp,lane:e.lane||'front',grade:e.grade,
  boss:!!e.boss,elite:!!e.elite,keywords:e.keywords||[],code:e._artCode||''};}
async function initialize() {
  if(!loaded) {
    const log=console.log,table=console.table;
    try {console.log=()=>{};console.table=()=>{};await loadGameData();}
    finally {console.log=log;console.table=table;}
    api=install();loaded=overrides.snapshot();
    lookahead.configure({ring:api.takeRing});
  }
  return api;
}

async function simulateRun({seed=1,policy='greedy',storyCycle=1,override={change:[],add:[]},towerBoon='on',plannerStage='r2',plannerWeights}={}) {
  await initialize();
  if(!policies[policy]) throw new Error(`不明な方針: ${policy}`);
  if(!['on','off'].includes(towerBoon))throw Error('towerBoonはonかoff');
  const forecasting=['lookahead','planner'].includes(policy);
  if(forecasting){
    // 固定比較と同じ本体ソースの受け口で予測用の表示フレームだけを省く。
    // 実戦のSaveRun.computeBattleは本体のまま。
    const fixed=require('./fixed_engine');await fixed.initialize();
    require('./bot_sandbox').configure({compute:fixed.fastCompute});
  }
  overrides.restore(loaded);
  overrides.applyOverride(override,api.parsers);
  const oldRandom=Math.random,oldNow=Date.now,oldWeights={...planner.LIMITS};
  if(policy==='planner')planner.configure(plannerStage,plannerWeights);
  Math.random=rng(seed);Date.now=()=>1700000000000+(seed>>>0);
  api.seed=seed>>>0;api.cycle=storyCycle;api.pending=null;api.battle=null;
  api.resetRun();lookahead.resetStats();horizon.reset();
  const row={schemaVersion:SCHEMA_VERSION,seed:seed>>>0,policy,storyCycle,towerBoonMode:towerBoon,clear:false,status:'running',
    route:[],battles:[],offers:[],acquisitions:[],actions:[],trajectory:[],finalBoard:[],rings:[],items:[],combos:[]};
  if(policy==='planner'){row.plannerStage=plannerStage;row.plannerWeights={...planner.LIMITS};}
  const ctx={color:'',policy,plannerStage};
  const refresh=reason=>{if(policy==='planner')planner.refresh(ctx,reason);};
  const strategyRecord=(chosen,card)=>policy==='planner'?{investment:!!chosen?.investment,
    horizonDecision:chosen?.horizonDecision,
    bestImmediate:chosen?.bestImmediate,chosenCard:card?cardInfo(card):undefined,synergyAfter:planner.describe(),battleIndex:row.battles.length,acquisitionIndex:row.acquisitions.length}:{};
  let battleStart,offerSeq=0;
  const grant=(card,source,offerId=null)=>{
    row.acquisitions.push({card:cardInfo(card),source,offerId,wave:G._wave,stage:G._waveStage});
    if(!ctx.color&&character(card)) ctx.color=card.color;
  };
  api.hooks={
    enemies:enemies=>{battleStart={wave:G._wave,stage:G._waveStage,type:G._waveBattleType,floor:G.floor,
      deepLevel:_waveDeepLevel(G._waveStage),retry:!!G._waveIsRetry,lifeBefore:_currentBattleLife(),goldBefore:G.gold,
      enemies:enemies.filter(Boolean).map(enemyInfo),board:boardInfo(),runLevels:clone(runLevelBattleValues()),synergy:planner.describe()};},
    grant,
  };
  const checkpoint=event=>row.trajectory.push({event,wave:G._wave,stage:G._waveStage,
    life:_currentBattleLife(),gold:G.gold,mana:Number(G.mana)||0,runLevels:clone(runLevelBattleValues())});
  const recordOffers=(cards,source)=>cards.map((c,index)=>{
    if(!c) return null;
    const offered={id:`o${++offerSeq}`,source,wave:G._wave,stage:G._waveStage,index,card:cardInfo(c)};
    row.offers.push(offered);return offered;
  });
  const recordCombos=()=>{
    const unit=_getPartyBoardUnit();
    for(const {idx} of formationDeploySlots(unit)) {
      const body=unit.boardCards[idx];if(!character(body)) continue;
      for(const entry of _collectEnhancementPanelsForSlot(unit,idx)) if(enchant(entry.panel)) {
        row.combos.push({wave:G._wave,stage:G._waveStage,body:body.name,enchant:entry.panel.name,
          bodySlot:idx,enchantSlot:entry.idx});
      }
    }
  };
  async function rearrange({retry=false}={}) {
    const before=boardInfo();
    const changes=forecasting?await lookahead.arrange(ctx,{retry}):arrange(policy,ctx,{retry});
    if(retry||JSON.stringify(before)!==JSON.stringify(boardInfo()))row.actions.push({type:retry?'retry_rebuild':'arrange',
      wave:G._wave,stage:G._waveStage,changed:JSON.stringify(before)!==JSON.stringify(boardInfo()),
      before,after:boardInfo(),forecast:forecasting?changes:undefined});
    refresh('arrange');
  }
  async function exchangeCards(source='shop') {
    const offers=recordOffers(_rewCards,source);
    const visited=new Set();
    for(let turn=0;turn<MAX_ACTIONS;turn++) {
      const signature=JSON.stringify([boardInfo(),_rewCards.map(cardInfo)]);
      if(visited.has(signature))break;visited.add(signature);
      const chosen=forecasting?await lookahead.chooseExchange(ctx):null;
      const pick=forecasting?chosen?.action?.exchange:exchangeChoices(policy,ctx).find(c=>c.gain>0.01);
      if(!pick)break;
      const {index,slot}=pick,incoming=_rewCards[index],outgoing=G.mainBoard[slot],gold=G.gold;
      if(!exchangeShopCard(index,slot))throw Error('選択した交換を実行できない');
      grant(incoming,source,offers[index]?.id);
      row.actions.push({type:'exchange',name:incoming.name,given:cardInfo(outgoing),index,slot,gold:G.gold-gold,
        source,wave:G._wave,stage:G._waveStage,forecast:chosen?.value,...strategyRecord(chosen,incoming)});
      refresh('exchange');
      offers[index]=recordOffers([_rewCards[index]],source+'_return')[0];
      offers[index].index=index;
    }
  }
  async function takeCards(source,{shop=false}={}) {
    const offers=recordOffers(_rewCards,source);
    // 魔導店以外でのカード購入もボットは行わない。道具の購入は従来どおり。
    for(let turn=0;turn<(shop?4:1);turn++) {
      let best=null;
      if(forecasting) {
        const chosen=await lookahead.chooseCard(ctx,{shop});
        if(chosen?.action)best={index:chosen.action.index,slot:chosen.action.slot,forecast:chosen.value,chosen};
      } else for(let index=0;index<_rewCards.length;index++) {
        const card=_rewCards[index];if(!card||card._shopSalePending||shop&&card.type!=='consumable')continue;
        let choice;
        if(card.type==='consumable') {
          if(shop&&(card._buyPrice||0)>G.gold||_ensureItemSlots().every(Boolean))continue;
          choice={gain:score(policy,card,ctx)*0.6,slot:null};
        } else choice=placement(policy,card,ctx);
        if(!choice||choice.gain<=0)continue;
        const value=choice.gain+(character(card)?score(policy,card,ctx)*0.15:0);
        if(!best||value>best.value)best={index,slot:choice.slot,value};
      }
      if(!best)break;
      const {index,slot}=best,card=_rewCards[index],gold=G.gold;
      takeRewCard(index,slot);
      if(G._pendingPanelPlacement||_rewCards[index]===card)break;
      grant(card,source,offers[index]?.id);
      row.actions.push({type:shop?'item_purchase':'take',name:card.name,slot,gold:G.gold-gold,wave:G._wave,stage:G._waveStage,forecast:best.forecast,...strategyRecord(best.chosen,card)});
      refresh('take');
      if(!forecasting)arrange(policy,ctx);
      if(shop)_syncWaveFacilityCache();
    }
  }

  async function useItems() {
    await useBotItems(policy,ctx,card=>row.actions.push({type:'item',name:card.name,wave:G._wave,stage:G._waveStage}));
  }

  async function facilityTurn() {
    const tower=!!G._isWaveAltar;
    const facs=villageFacilityList();
    row.route.push({wave:G._wave,stage:G._waveStage,type:tower?'altar':'city'});
    const arrivalGold=G.gold;
    if(tower)await api.arrival.tower();else await api.arrival.town();
    await api.drain();
    if(G.gold!==arrivalGold)row.actions.push({type:'quest_reward',gold:G.gold-arrivalGold,wave:G._wave,stage:G._waveStage});
    for(const key of ['home','tavern','inn','shop','item','forge','ringExchange']) {
      const fac=facs.find(f=>f.key===key);
      if(!fac||_villageFacilityDisabled(fac)) continue;
      row.actions.push({type:'facility',key,wave:G._wave,stage:G._waveStage});
      if(key==='home'||key==='tavern') {
        if(isFirstStoryRun()) {
          await _runFirstStoryFacilityEvent(fac);await api.drain();
          row.actions.push({type:'story',key,wave:G._wave,stage:G._waveStage,gold:0});
        } else if(key==='tavern'&&questTavernAvailable(G._wave)) {
          const entry=_qEnsureSelected(),cfg=_qConfig(entry);
          if(entry&&entry.status==='offered') {
            if(cfg.pursuit||cfg.towerDeparture)row.actions.push({type:'quest_skipped',id:entry.questId,reason:'追撃戦／専用の出発会話を選ばない',wave:G._wave,stage:G._waveStage});
            else {
              await openTavern();await api.drain();
              if(G._isTavern&&_rewCards.length)await takeCards('quest');
              if(G._isTavern&&cfg.ringOffer&&G._ringOffer?.length){const ring=G._ringOffer[0];if(api.takeRing(0))grant(ring,'quest');}
              if(G._isTavern&&_qHasRequiredOnBoard(entry))_qAcceptTavernQuest();
              else if(G._isTavern)_qRejectTavernQuest();
              await api.drain();
              row.actions.push({type:'quest',id:entry.questId,status:entry.status,wave:G._wave,stage:G._waveStage});
            }
          }
        }
      } else if(key==='inn') {
        const talk=_facilityGreetingEntry(fac);
        const gold=G.gold,life=_currentBattleLife();
        if(talk) await _runVillageInnDialogue(talk);
        row.actions.push({type:'inn',gold:G.gold-gold,lifeBefore:life,lifeAfter:_currentBattleLife(),wave:G._wave,stage:G._waveStage});
      } else if(key==='shop'||key==='item') {
        if(key==='shop') openMapShop();else openMapItemShop();
        if(key==='shop')await exchangeCards();else await takeCards(key,{shop:true});
        if(boons.rerollShop(policy,a=>row.actions.push({...a,wave:G._wave,stage:G._waveStage}))){
          if(key==='shop')await exchangeCards('shop:reroll');else await takeCards('item:reroll',{shop:true});
        }
        await useItems();
        _syncWaveFacilityCache();
      } else if(key==='forge') {
        openMapForge();
        for(let attempt=0;attempt<=boons.SETTINGS[policy].maxShopRerolls;attempt++){
        const offers=(G._mapForgeOffers||[]).filter(Boolean).sort((a,b)=>
          (b.id==='summon'?10:0)-(a.id==='summon'?10:0));
        for(const power of offers) if(mapForgePrice(power)<=G.gold && _mapForgeCandidateSlots(power).length) {
          const gold=G.gold;
          if(await applyPendingMapForgePower(power)) row.actions.push({type:'forge',power:power.id,gold:G.gold-gold,wave:G._wave,stage:G._waveStage});
        }
          if(attempt===boons.SETTINGS[policy].maxShopRerolls||!boons.rerollShop(policy,a=>row.actions.push({...a,wave:G._wave,stage:G._waveStage})))break;
        }
        _syncWaveFacilityCache();
      } else if(key==='ringExchange') {
        openMapRingExchange();
        const offers=recordOffers(G._ringOffer,'ringExchange');
        const unit=_getPartyBoardUnit(),required=ringExchangeDepartureBlocked();
        const groups=sacrificePlans(policy==='lookahead'?'greedy':policy,ctx);
        if(!G._ringOfferResolved&&required) {
          const plan=forecasting?await lookahead.chooseRing(ctx):null;
          const sacrifice=plan?.action?.sacrifice||groups[0]?.sacrifice;
          if(!sacrifice)throw Error('必須の指輪交換で還魂候補がない');
          for(const slot of sacrifice)_discardBoardCardForRingOffer(slot,G.mainBoard[slot]);
          const chosen=plan?.action?{card:G._ringOffer[plan.action.ring],index:plan.action.ring}:
            G._ringOffer.map((card,index)=>({card,index,value:score(policy,card,ctx)})).sort((a,b)=>b.value-a.value)[0];
          const replace=plan?.action?.replaceRing??(G.rings.every(Boolean)?G.rings.map((card,index)=>({card,index}))
            .filter(x=>!(typeof questRingActionsLocked==='function'&&questRingActionsLocked(x.card)))
            .sort((a,b)=>score(policy,a.card,ctx)-score(policy,b.card,ctx))[0]?.index:undefined);
          if(!G._ringOfferUnlocked||!chosen||!api.takeRing(chosen.index,replace))throw Error('必須の指輪を取得できない');
          grant(chosen.card,'ringExchange',offers[chosen.index].id);
          row.actions.push({type:'ring_exchange',name:chosen.card.name,sacrifice,wave:G._wave,stage:G._waveStage,required:true,
            ...(policy==='planner'?{forecast:plan?.value,...strategyRecord(plan,chosen.card)}:{})});
          refresh('ring');
        } else if(!G._ringOfferResolved) {
          row.actions.push({type:'ring_shortage',wave:G._wave,stage:G._waveStage,capacity:ringExchangeSacrificeCapacity(),cost:SHOP_EXCHANGE_TRIAL.ringCardCost});
        }
        if(!G._ringOfferResolved)_reclaimSacrificedRingCards();
        _syncWaveFacilityCache();
        _syncUnitPanelEffectsAfterMove(unit);
      }
      // 施設を離れる本体の処理（在庫確定・フラグ解除）。到着イントロは再実行しない。
      openMapVillage({tower});
      checkpoint(`facility:${key}`);
    }
    await rearrange();await useItems();
  }

  try {
    localStorage.clear();
    startGame(false,false);
    await Promise.resolve();await Promise.resolve();await api.drain();
    for(const c of G.mainBoard.filter(Boolean)) {
      const offered=recordOffers([c],'initial')[0];grant(c,'initial',offered.id);
    }
    row.initialBoard=boardInfo();checkpoint('start');
    refresh('initial');
    for(let action=0;action<MAX_ACTIONS&&!G._botEnded;action++) {
      if(api.pending) {
        const pending=api.pending;api.pending=null;
        await pending;
        const result=api.battle;
        if(!result||!battleStart) throw new Error('戦闘コアの結果がない');
        const types={},reasons={};for(const e of result.events){types[e.type]=(types[e.type]||0)+1;if(e.reason)reasons[e.reason]=(reasons[e.reason]||0)+1;}
        const battle={...battleStart,index:row.battles.length,outcome:result.outcome,endReason:result.endReason,
          turns:result.finalState.turn,coreLifeAfter:_currentBattleLife(),lifeAfter:_currentBattleLife(),goldAfter:G.gold,manaAfter:G.mana,eventCounts:types,
          remainingEnemies:result.finalState.units.p2.filter(e=>e&&e.hp>0).map(enemyInfo),effectReasons:reasons};
        row.battles.push(battle);
        row.route.push({wave:battle.wave,stage:battle.stage,type:battle.type,retry:battle.retry});
        recordCombos();
        towerBoonRecordBattleDeaths(result.events,[...result.setup.units.p2.filter(Boolean),...result.finalState.units.p2.filter(Boolean)]);
        questRecordBattleDeaths(result.events,[...result.setup.units.p2.filter(Boolean),...result.finalState.units.p2.filter(Boolean)]);
        if(result.endReason==='turn_limit') {row.status='timeout';checkpoint('battle');api.battle=null;break;}
        if(result.outcome==='p2') {
          await _finishWaveBattleDefeat(null);
          await api.drain();
        } else {
          G._battleDefeatHandled=false;
          if(!finishWaveBattleVictory(false)) {
            _cleanupBattleEndTransientUnits();
            goToReward({checkpoint:true});
          }
        }
        await api.drain();
        battle.lifeAfter=_currentBattleLife();
        checkpoint('battle');
        api.battle=null;
        continue;
      }
      if(G._isVillageMenu) {
        await facilityTurn();
      } else {
        // 5枚提示から1枚だけ選び、編成を整えて次の戦闘へ。
        if(runLevelRewardActive()){
          boons.acceptLevelReward(policy,a=>row.actions.push({...a,wave:G._wave,stage:G._waveStage}));
          refresh('level_reward');checkpoint('level_reward');
        }
        else if(G._isPeddler){row.actions.push({type:'peddler',wave:G._wave,stage:G._waveStage,stock:_rewCards.map(cardInfo)});await exchangeCards('peddler');}
        else if(!G._battleDefeatHandled){
          if(towerBoon==='on')await boons.rerollIfWeak(policy,ctx,{record:a=>row.actions.push({...a,wave:G._wave,stage:G._waveStage}),recordOffers});
          await takeCards('reward');
        }
        await rearrange({retry:_waveRetryPending(G._waveStage)});await useItems();
      }
      if(!boardHasDeployableCharacter(_getPartyBoardUnit())) {row.status='stalled';row.stallReason='出撃可能キャラクターなし';break;}
      if(_startWaveFlowNext()===false)throw Error('出発条件を満たさず次のマスへ進もうとした');
      await Promise.resolve();await Promise.resolve();
    }
    if(G._botEnded) {row.clear=G._botEnded.clear;row.status=row.clear?'clear':'gameover';}
    row.gameOverReason=G._botEnded?.questLoss?'quest_card_loss':row.status==='gameover'?'life_zero':null;
    if(row.status==='running') {row.status='stalled';row.stallReason='行動上限';}
    row.reachedWave=Math.max(1,...row.route.map(n=>n.wave));
    const visited=row.route.filter(n=>n.wave===row.reachedWave);
    row.reachedStage=Math.max(1,...visited.map(n=>n.stage));
    row.progress=row.reachedWave+row.reachedStage/100;
    row.finalBoard=boardInfo();row.rings=G.rings.filter(Boolean).map(cardInfo);row.items=_ensureItemSlots().filter(Boolean).map(cardInfo);
    row.finalLife=_currentBattleLife();row.finalGold=G.gold;row.finalMana=G.mana||0;
    row.deathBattle=!row.clear?row.battles.at(-1)||null:null;
    row.color=ctx.color;
    row.lookahead={...lookahead.stats};row.questProgress=clone(G.questProgress);
    row.towerBoons=clone(towerBoonState());row.runLevels=clone(runLevelState());
    row.synergy=planner.describe();
    if(policy==='planner'){row.planner=planner.end(ctx);if(plannerStage==='r2')row.horizon=horizon.end();}
    const unique=new Map();for(const c of row.combos) unique.set(`${c.enchant}\0${c.body}`,c);
    row.combos=[...unique.values()];
    // JSONLとAPIの戻り値の表現も一致させる（未指定フィールドは欠落として扱う）。
    return JSON.parse(JSON.stringify(row));
  } finally {
    api.hooks={};Math.random=oldRandom;Date.now=oldNow;
    overrides.restore(loaded);
    for(const key of Object.keys(planner.LIMITS))delete planner.LIMITS[key];Object.assign(planner.LIMITS,oldWeights);
  }
}

function parseArgs(args) {
  const opts={runs:200,lookaheadRuns:100,lookaheadSamples:3,workers:1,policy:'all',seed:1,out:path.join(__dirname,'out'),storyCycle:1,towerBoon:'on',plannerStage:'r2'};
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--help') return {...opts,help:true};
    const keys={'--runs':'runs','--lookahead-runs':'lookaheadRuns','--lookahead-samples':'lookaheadSamples','--workers':'workers','--policy':'policy','--seed':'seed','--out':'out','--override':'overrideFile','--story-cycle':'storyCycle','--tower-boon':'towerBoon','--planner-stage':'plannerStage','--planner-weights':'plannerWeightsFile'};
    const key=keys[args[i]];
    if(!key||args[i+1]===undefined) throw new Error(`不正な引数: ${args[i]}`);
    opts[key]=args[++i];
  }
  for(const key of ['runs','seed','storyCycle','lookaheadRuns','lookaheadSamples','workers']) opts[key]=Number(opts[key]);
  if(!Number.isInteger(opts.runs)||opts.runs<1) throw new Error('--runs は正の整数');
  for(const key of ['lookaheadRuns','lookaheadSamples'])if(!Number.isInteger(opts[key])||opts[key]<1)throw new Error(`${key} は正の整数`);
  if(!Number.isInteger(opts.workers)||opts.workers<1||opts.workers>8)throw new Error('--workers は1〜8');
  if(!Number.isInteger(opts.seed)||opts.seed<0||opts.seed+opts.runs-1>0xffffffff) throw new Error('--seed は32ビット符号なし整数（全試行分）');
  if(![1,2].includes(opts.storyCycle)) throw new Error('--story-cycle は1か2');
  if(!['on','off'].includes(opts.towerBoon))throw Error('--tower-boonはonかoff');
  if(!['r1','r2'].includes(opts.plannerStage))throw Error('--planner-stageはr1かr2');
  if(opts.policy!=='all'&&opts.policy.split(',').some(name=>!policies[name])) throw new Error(`不明な方針: ${opts.policy}`);
  opts.out=path.resolve(opts.out);return opts;
}

async function main(args=process.argv.slice(2)) {
  const opts=parseArgs(args);
  if(opts.help) {console.log('node tools/balance_sim/run_bot.js --runs 200 --policy all --seed 1 --out <出力先> [--override <json>] [--story-cycle 1|2] [--tower-boon on|off] [--planner-stage r1|r2] [--planner-weights <json>]');return;}
  if(opts.workers>1)return require('./bot_batch').batch(opts);
  await initialize();
  lookahead.configure({limits:{samples:opts.lookaheadSamples}});
  const override=overrides.readOverride(opts.overrideFile);
  overrides.restore(loaded);
  const notes=overrides.applyOverride(override,api.parsers);
  const {probeCard}=require('./bot_probe');
  for(const note of notes) if(note.patch.desc!==undefined) {
    const card=Object.values(overrides.pools()).flat().find(c=>c.name===note.name);
    const probe=probeCard(card);note.interpretation=probe.message;note.probe=probe;
  }
  const cards=overrides.catalog();
  overrides.restore(loaded);
  fs.mkdirSync(opts.out,{recursive:true});
  const output=path.join(opts.out,'runs.jsonl');
  const fd=fs.openSync(output,'w');
  const names=opts.policy==='all'?Object.keys(policies):opts.policy.split(',');
  const counts=Object.fromEntries(names.map(name=>[name,name==='lookahead'&&opts.policy==='all'?Math.min(opts.runs,opts.lookaheadRuns):opts.runs]));
  const total=Object.values(counts).reduce((a,b)=>a+b,0),policyElapsed={};
  const start=wall.now();
  let completed=0;
  try {
    for(const policy of names) for(let i=0;i<counts[policy];i++) {
      const runStart=wall.now();
      const row=await simulateRun({seed:opts.seed+i,policy,storyCycle:opts.storyCycle,override,towerBoon:opts.towerBoon,plannerStage:opts.plannerStage,
        plannerWeights:opts.plannerWeightsFile?JSON.parse(fs.readFileSync(opts.plannerWeightsFile,'utf8')).weights:undefined});
      fs.writeSync(fd,JSON.stringify(row)+'\n');completed++;
      const duration=wall.now()-runStart;policyElapsed[policy]=(policyElapsed[policy]||0)+duration;
      console.log(`${completed}/${total} ${policy} seed=${row.seed} ${row.status} St${row.reachedWave}:${row.reachedStage} 戦闘${row.battles.length} ${duration.toFixed(1)}ms`);
    }
  } finally {fs.closeSync(fd);}
  const elapsedMs=wall.now()-start;
  const files=['js/engine/main.js','js/engine/map.js','js/engine/pool.js','js/engine/enemy.js','js/engine/reward.js','js/engine/reward_drag.js','js/engine/reward_debug.js',
    'js/engine/reward_items.js','js/engine/render.js','js/engine/render_death_effects.js','js/engine/render_card_display.js','js/engine/render_attack_motion.js','js/engine/render_tooltip_helpers.js','js/engine/battle.js','js/engine/battle_panel_formation.js','js/engine/battle_intro.js','js/engine/battle_debug.js','js/engine/tower_boon.js','js/engine/run_levels.js','js/engine/peddler.js','js/battle/core.js','js/battle/formation.js','js/save/run_save.js','js/data/local_xlsx_data.js'];
  const meta={schemaVersion:SCHEMA_VERSION,botVersion:11,trial:{panelMerge:PANEL_MERGE_TRIAL.enabled,exchangeItemSale:false},policyCounts:counts,policyElapsedMs:policyElapsed,lookahead:{...lookahead.DEFAULTS},planner:planner.weights(opts.plannerStage,opts.plannerWeightsFile?JSON.parse(fs.readFileSync(opts.plannerWeightsFile,'utf8')).weights:undefined),horizon:horizon.LIMITS,options:{...opts,overrideFile:opts.overrideFile?path.basename(opts.overrideFile):null},
    runLevels:{config:clone(RUN_LEVEL_CONFIG),settings:boons.SETTINGS,limits:boons.LIMITS,shopRerollCost:SHOP_REROLL_COST},
    completed,elapsedMs,msPerRun:elapsedMs/completed,policies:Object.fromEntries(names.map(n=>[n,policies[n].description])),
    catalog:cards,override:override,overrideNotes:notes,bypasses:BYPASSES,noopFunctions:NOOPS,
    unsupported:['初回ストーリーのホーム・酒場は本体にカード配布なし（通常クエストはstory-cycle 2で受託）','追撃戦・専用出発イベント型クエストはAIが選ばない','闘技場','五聖の座の刻印と隠しステージ5',
      '任意のポータル帰還・キャラ破壊アイテム（AIが選ばない）','セーブ復元・画面・VFX・SE・操作時間'],
    limits:{maxActions:MAX_ACTIONS,coreTurnLimit:BATTLE_CORE_TURN_LIMIT,minSample:20,arrangePasses:3},
    sourceHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(source(f)).digest('hex')])),
    toolHashes:Object.fromEntries(['run_bot.js','policies.js','planner.js','planner_horizon.js','planner_tune.js','planner_weights.json','synergy.js','bot_runtime.js','bot_override.js','bot_probe.js','bot_sandbox.js','bot_items.js','bot_batch.js','bot_boons.js','fixed_engine.js','lookahead.js','load.js','stub.js']
      .map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,f))).digest('hex')]))};
  fs.writeFileSync(path.join(opts.out,'meta.json'),JSON.stringify(meta,null,2)+'\n');
  console.log(`完了 ${completed}周、${(elapsedMs/1000).toFixed(2)}秒、平均${meta.msPerRun.toFixed(2)}ms/周: ${output}`);
}

if(require.main===module) main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={initialize,simulateRun,parseArgs,rng,cardInfo,SCHEMA_VERSION};
