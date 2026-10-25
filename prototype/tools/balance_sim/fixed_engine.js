'use strict';

// 固定比較専用。本体と周回ボットのファイルは変更しない。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const bot=require('./run_bot');
const overrides=require('./bot_override');
const {isolated,hash,random}=require('./bot_sandbox');
const {source}=require('./bot_runtime');
const SCENES=[2,3].flatMap(wave=>[2,3].map(stage=>({id:`st${wave}_${stage===2?'normal':'elite'}`,wave,stage,type:stage===2?'battle':'elite',label:`ステージ${wave} ${stage===2?'通常（2マス目）':'エリート（3マス目）'}`})));
let api,originalCompute,fastCompute,originalPools;
const copy=value=>structuredClone(value);
function sha(value){return crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');}
async function initialize(){
  if(api)return api;
  api=await bot.initialize();originalPools=overrides.snapshot();originalCompute=SaveRun.computeBattle;
  // 本体の受け口をそのまま読み出す。途中の表示フレーム保存だけを省き、
  // 不変なカード定義を共有する。撃破Gのタイミング・コアの進行は原文のまま。
  const text=source('js/save/run_save.js'),start=text.indexOf('  function snapshotCore('),end=text.indexOf('  function installSetup(',start);
  if(start<0||end<0)throw new Error('本体computeBattleの境界が変わった');
  let code=text.slice(start,end);
  const frame='frames.push({from,to:events.length,state:snapshotCore(state,setupIds)});from=events.length;';
  if(code.split(frame).length!==2||code.split('const state=copy(initial);').length!==2)throw new Error('本体computeBattleの高速化箇所が変わった');
  code=code.replace(frame,'from=events.length;').replace('const state=copy(initial);',
    'const {summonDefs:_fixedSummonDefs,itemDefs:_fixedItemDefs,..._fixedRest}=initial;const state=copy(_fixedRest);state.summonDefs=_fixedSummonDefs;state.itemDefs=_fixedItemDefs;');
  fastCompute=vm.runInThisContext(`(()=>{const copy=SaveRun.copy;${code}\nreturn computeBattle;})()`,{filename:'fixed_compute_without_frames.js'});
  for(const scene of SCENES){initState();G._wave=scene.wave;G._waveStage=scene.stage;scene.floor=_waveStageFloor(scene.wave,scene.stage,scene.type);scene.deepLevel=_waveDeepLevel(scene.stage,scene.wave,scene.type);}
  return api;
}
function compute(initial,seed,{original=false}={}){return (original?originalCompute:fastCompute)(initial,seed);}
function resetOverride(data={change:[],add:[]}){overrides.restore(originalPools);return overrides.applyOverride(data,api.parsers);}
function sceneById(id){const scene=SCENES.find(s=>s.id===id);if(!scene)throw new Error(`不明な場面: ${id}`);return scene;}
function location(scene){
  Object.assign(G,{_wave:scene.wave,_waveStage:scene.stage,_waveBattleType:scene.type,floor:scene.floor,
    _mapBattle:{mapIndex:scene.wave,type:scene.type,floor:scene.floor,normalBattleNo:scene.stage,turn:0},
    _waveRetryEnemyKey:null,_waveEnemyPreview:{},_waveEnemySnapshot:null,_waveIsRetry:false,_enemyLaneFixed:false,
    _onlineMode:false,_testBattleMode:false,_libraryTestBattleMode:false,_arenaActive:false,_botProbe:true});
  _isBossFight=false;
}
async function enemySamples(scene,count,seed=1,partition='evaluation'){
  const samples=[];
  for(let i=0;i<count;i++){
    const enemySeed=hash(`fixed:${seed}:${scene.id}:${partition}:enemy:${i}`),battleSeed=hash(`fixed:${seed}:${scene.id}:${partition}:battle:${i}`);
    samples.push(await isolated(()=>{
      initState();location(scene);G._runSeed=enemySeed;G._runRngState=enemySeed;
      G.enemies=runWithKeyedRandom(`fixed-enemy:${enemySeed}`,()=>scene.type==='elite'?generateEliteEnemies(scene.floor):generateEnemies(scene.floor));
      _layoutStartingBattleEnemies(null,false,false,false,false,G._mapBattle,scene.floor,false);
      return {index:i,enemySeed,battleSeed,enemies:copy(G.enemies)};
    },{seed:enemySeed}));
  }
  return samples;
}
function view(card,slot){return card?{slot,id:card.id,name:card.name,category:card.category,color:card.color||'',rarity:card.rarity,grade:card.grade,
  power:card.power??0,life:card.life??0,desc:card.desc||'',keywords:card.keywords||[],directions:card.directions||[],triple:!!card._tripleMerged,bond:!!card._merged,powerId:mapPanelPowerIdAt(slot)}:null;}
function boardView(){return G.mainBoard.map(view);}
function signature(board){return sha(board.map(c=>c?{name:c.name,color:c.color,power:c.power,life:c.life,desc:c.desc,keywords:c.keywords,directions:c.directions,powerId:c.powerId,triple:c.triple,bond:c.bond}:null));}
function features(board){
  const chars=board.filter(c=>c?.category==='キャラクター'),colors={};
  for(const c of chars)colors[c.color||'無色']=(colors[c.color||'無色']||0)+1;
  const main=chars.slice().sort((a,b)=>(b.power+b.life)-(a.power+a.life)||a.name.localeCompare(b.name,'ja')).slice(0,3).map(c=>c.name);
  return {colors,main,type:Object.keys(colors).sort().map(c=>`${c}${colors[c]}`).join('・')+' / '+main.join('・')};
}
async function reconstruct(record){
  return isolated(()=>{
    initState();const scene=sceneById(record.scene);location(scene);G._runSeed=record.seed;G._runRngState=record.seed;
    G._waveLife=record.life;G.life=record.life;G.gold=record.gold;G.mainBoard.fill(null);G.mapPanelPowers={};
    for(const card of record.board.filter(Boolean)){
      const c=makePanel(card.id)||makePanel(card.name);if(!c)throw new Error(`盤面カードが本体プールにない: ${card.name}`);
      if(card.triple||card.bond)applyMergedPanelForm(c);
      Object.assign(c,{power:card.power,life:card.life,desc:card.desc,rarity:card.rarity,grade:card.grade,color:card.color,keywords:copy(card.keywords),directions:copy(card.directions),_tripleMerged:!!card.triple,_merged:!!card.bond});
      G.mainBoard[card.slot]=c;if(card.powerId)G.mapPanelPowers[card.slot]=card.powerId;
    }
    G.rings=(record.rings||[]).map(c=>copy(RING_POOL.find(r=>r.id===c.id||r.name===c.name)||c));while(G.rings.length<4)G.rings.push(null);
    return SaveRun.copy(G);
  },{seed:hash(`reconstruct:${record.seed}:${record.scene}`)});
}
async function setup(snapshot,scene,sample,{mutate,preparedItems=false,seed=1}={}){
  return isolated(async()=>{
    location(scene);G.allies=[];G.enemies=copy(sample.enemies);G.mana=0;G._blood=0;G._enemyBlood=0;
    G._battleCoreEvents=[];G._battleDefeatHandled=false;G._battleEndEffectsApplied=false;
    G._preserveEnemyOpening=false;G._deferManaThresholdEffects=true;G.phase='player';
    if(mutate)mutate();
    if(!preparedItems)_prepareStartingBattleItems(false);
    _initSealStates();await applyNewPanelBattleStart({deferOpeningEffects:true,persistEternal:true});
    _initSealStates();_applyTerrainReinforcements();
    const state=_createPveCoreState();_stampCoreSideSlots(state);return state;
  },{state:snapshot,seed});
}
function eventDigest(events){
  const ignore=new Set(['battle_start','effect_flash','turn_begin']);
  const drop=new Set(['unit','name','unitName','sourceName','targetName','desc','effectText','text','reasonText','pveRewardGold']);
  return sha(JSON.stringify(events.filter(e=>!ignore.has(e.type)),(k,v)=>drop.has(k)?undefined:v));
}
function measure(result){
  return {win:result.outcome==='p1'?1:0,outcome:result.outcome,reason:result.endReason,turns:result.finalState.turn,
    hp:coreLivingUnits(result.finalState.units.p1).reduce((s,u)=>s+Math.max(0,u.hp),0),
    damage:result.events.filter(e=>e.type==='damage'&&e.side==='p2').reduce((s,e)=>s+Math.max(0,Number(e.amount)||0),0),digest:eventDigest(result.events)};
}
async function evaluate(snapshot,scene,samples,{mutate,preparedItems=false,setupSeed=1,original=false}={}){
  // 敵の生成結果だけを替え、同じカード配置・IDで全サンプルを測る。
  const initial=await setup(snapshot,scene,samples[0],{mutate,preparedItems,seed:setupSeed});
  const points=[];
  for(const sample of samples){
    // 敵は本体の初期化を通す。味方編成・定義一覧は不変なので共有する。
    const foe=coreInitializeBattleState({units:{p1:[],p2:copy(sample.enemies)},stageNumber:scene.wave,mapIndex:scene.floor}).units.p2;
    _stampCoreSideSlots({units:{p1:[],p2:foe},stageNumber:scene.wave});
    const state={...initial,units:{p1:initial.units.p1,p2:foe}};
    points.push(measure(compute(state,sample.battleSeed,{original})));
  }
  return {points,winRate:points.reduce((s,p)=>s+p.win,0)/points.length,meanHp:points.reduce((s,p)=>s+p.hp,0)/points.length,
    meanDamage:points.reduce((s,p)=>s+p.damage,0)/points.length,initial};
}
function eligible(){return PANEL_POOL.filter(c=>['キャラクター','エンチャント'].includes(c.category)&&_isImplementedPoolCard(c)&&!c.removed&&c.rarity>=1&&panelSaleStockCount(c)>0&&
  ((!c._rewardExcluded&&c._rewardAvailable!==false)||(!c._shopExcluded&&c._shopAvailable!==false)));}
async function cardForms(seed=1){
  return isolated(()=>{
    initState();G._freeRewardPanelMode=false;const forms=[];
    for(const def of eligible()){
      const base=makePanel(def.id),key=String(def.id);base._fixedProbeId=key;
      forms.push({key:key+':base',baseId:key,name:def.name,category:def.category,form:'通常',rarity:base.rarity,grade:base.grade||1,price:_mapSalePrice(base),card:copy(base)});
      G.mainBoard.fill(null);for(let i=0;i<3;i++)G.mainBoard[i]=copy(base);
      const merged=_tryTripleMergeOnBoard(_getPartyBoardUnit(),2);
      if(merged){const card=copy(G.mainBoard[merged.targetIdx]);forms.push({key:key+':merged',baseId:key,name:def.name+'+',category:def.category,form:'合体',rarity:card.rarity,grade:card.grade||1,price:_mapSalePrice(card),card});}
    }
    return forms;
  },{seed:hash(`fixed-card-directions:${seed}`)});
}
function ablated(card){
  const c=copy(card);c.desc='';c.characterDesc='';c.effectText='';c.effect='';
  for(const k of Object.keys(c))if(/^(mana|adjacent|goldOn|randomItem|release|summonCount|_manaThreshold|_mergedSource|mergedForm)/.test(k))delete c[k];
  for(const k of ['effectRepeatBonus','_effectRepeatBonus','_resonanceEffectName','_permanentEffectDamage'])delete c[k];
  // 本体には空本文でもカード名から起動する互換処理がある。
  // 効果を除去する対照側だけ名前も無効にし、通常の実測カードは保つ。
  c.name='固定比較・効果なし';
  if(c.category==='キャラクター')api.parsers.character(c);else api.parsers.enchant(c);
  // 文の由来でないキーワードは残す。効果文専用エンチャントの派生キーワードは除く。
  if(c.category==='キャラクター')c.keywords=copy(card.keywords||[]);
  else {c.adjacentKeywords=[];c.keywords=[];}
  return c;
}
async function placements(snapshot,form){
  return isolated(()=>{
    const unit=_getPartyBoardUnit(),deploy=formationDeploySlots(unit).map(x=>x.idx),characters=deploy.filter(i=>G.mainBoard[i]?.category==='キャラクター');
    if(form.category==='キャラクター'){
      const slot=characters.sort((a,b)=>(Number(G.mainBoard[a].power)+Number(G.mainBoard[a].life))-(Number(G.mainBoard[b].power)+Number(G.mainBoard[b].life))||a-b)[0];
      if(slot===undefined)return [];
      const card=copy(form.card);card.directions=copy(G.mainBoard[slot].directions||[]);
      return [{slot,card,targets:[{slot,name:G.mainBoard[slot].name}],replaced:G.mainBoard[slot].name}];
    }
    const enchants=G.mainBoard.map((c,slot)=>({c,slot})).filter(x=>x.c?.category==='エンチャント').sort((a,b)=>(Number(a.c.adjacentAtkBonus)||0)+(Number(a.c.adjacentHpBonus)||0)-(Number(b.c.adjacentAtkBonus)||0)-(Number(b.c.adjacentHpBonus)||0)||(Number(a.c.rarity)||0)-(Number(b.c.rarity)||0)||a.slot-b.slot);
    const slots=G.mainBoard.map((c,i)=>!c?i:-1).filter(i=>i>=0);if(enchants[0])slots.push(enchants[0].slot);
    const result=[];
    for(const slot of slots){
      const card=copy(form.card);if(!_canCardUseBoardSlot(card,slot,unit))continue;
      const old=G.mainBoard[slot];G.mainBoard[slot]=card;
      const targets=characters.filter(idx=>_collectEnhancementPanelsForSlot(unit,idx).some(e=>e.idx===slot)).map(idx=>({slot:idx,name:G.mainBoard[idx].name}));
      const legal=_canApplyBoardChange(unit,G.mainBoard);G.mainBoard[slot]=old;
      if(legal&&targets.length)result.push({slot,card,targets,replaced:old?.name||null});
    }
    // 接続できない場合も、非接続の観測を残す（全本体に効かない証拠とは区別）。
    if(!result.length&&slots.length)result.push({slot:slots[0],card:copy(form.card),targets:[],replaced:G.mainBoard[slots[0]]?.name||null});
    return result;
  },{state:snapshot,seed:1});
}
function sourceHashes(){
  const files=['js/battle/core.js','js/battle/formation.js','js/engine/battle.js','js/engine/battle_damage.js','js/engine/battle_panel_formation.js','js/engine/battle_intro.js','js/engine/render.js','js/engine/render_death_effects.js','js/engine/render_card_display.js','js/engine/render_attack_motion.js','js/engine/render_tooltip_helpers.js','js/engine/battle_debug.js','js/engine/enemy.js','js/engine/main.js','js/engine/pool.js','js/engine/reward.js','js/engine/reward_drag.js','js/engine/reward_debug.js','js/engine/map.js','js/engine/quest.js','js/engine/quest_event_flow.js','js/engine/tower_boon.js','js/engine/run_levels.js','js/save/run_save.js','js/data/loader.js','js/data/local_xlsx_data.js'];
  return Object.fromEntries(files.map(f=>[f,sha(source(f))]));
}
function toolHashes(){return Object.fromEntries(['fixed_engine.js','fixed_compare.js','fixed_worker.js','fixed_pool.js','fixed_boards.js'].map(f=>[f,sha(fs.readFileSync(path.join(__dirname,f),'utf8'))]));}
module.exports={initialize,SCENES,sceneById,enemySamples,reconstruct,setup,evaluate,compute,measure,cardForms,placements,ablated,
  resetOverride,copy,sha,hash,random,isolated,view,boardView,signature,features,sourceHashes,toolHashes,get originalCompute(){return originalCompute;},get fastCompute(){return fastCompute;},bot,overrides};
