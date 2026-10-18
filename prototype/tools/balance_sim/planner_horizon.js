'use strict';

const {isolated,enemySamples,trial,hash}=require('./bot_sandbox');
const planner=require('./planner');
const {placement,exchangeChoices,arrange}=require('./policies');
const {useItems}=require('./bot_items');

// 候補を全て数手先まで展開しない。独立した二つの将来提示と、追加取得なしを比較する。
const LIMITS={candidates:3,enemies:2,futures:2,missWeight:.35,arrangePasses:1,maxAudits:12};
const stats={decisions:0,candidates:0,trials:0,cacheHits:0,projections:0,changes:0,futureCards:0};
const combatCache=new Map(),projectionCache=new Map(),sampleCache=new Map();
let audits=[];
const round=x=>Number(x.toFixed(6));
const signature=()=>JSON.stringify([G.mainBoard,G.rings,G.spellSlots,G.pendingBattleItems,G.nextBattleItems,
  G.mapPanelPowers,G.panelPermanentBuffs,G.panelColorPermanentBuffs,G.towerBoons,G.runLevels?.values,G.gold,G._waveLife]);
function wallFrom(next){
  const opportunities=[];
  for(let wave=next.wave;wave<=4;wave++){
    const route=_waveRouteForWave(wave);
    for(let stage=wave===next.wave?next.stage:1;stage<=route.length;stage++){
      const type=route[stage-1];
      if(type==='elite'||type==='boss')return {target:{wave,stage,type,floor:_waveStageFloor(wave,stage,type)},
        distance:opportunities.filter(n=>n.type==='reward').length,opportunities};
      // 通常戦だけが5枚から1枚の報酬。エリート/ボスの報酬を架空に追加しない。
      if(type==='battle')opportunities.push({wave,stage:stage+1,type:'reward'});
      if(type==='city')opportunities.push({wave,stage,type:'exchange'});
    }
  }
  return null;
}
function boardRecord(){return G.mainBoard.map((c,slot)=>c?{slot,id:c.id,name:c.name,power:c.power,life:c.life,
  directions:c.directions,boon:c.boon}:null);}
function actionName(action){
  if(action.index!==undefined)return _rewCards[action.index]?.name||'取得';
  if(action.exchange)return `${G.mainBoard[action.exchange.slot]?.name}→${_rewCards[action.exchange.index]?.name}`;
  if(action.ring!==undefined)return `${G._ringOffer[action.ring]?.name}（還魂${action.sacrifice.map(s=>G.mainBoard[s]?.name).join('/')}）`;
  if(action.swaps?.length)return '配置'+action.swaps.map(([a,b])=>`${a}↔${b}`).join('/');
  return '見送り/配置維持';
}
function beginOffers(op,seed){
  G._wave=op.wave;G._waveStage=op.stage;G._runRngState=seed;G.phase='reward';
  for(const key of ['_isItemShop','_isPeddler','_isTavern','_isLibrary','_isRingExchange','_ringOfferPhase','_isVillageMenu'])G[key]=false;
  G._isShop=op.type==='exchange';G._isRewardTown=G._isShop;
  G._freeRewardPanelMode=true;G._rewardOnePickMode=!G._isShop;G._pendingPanelPlacement=null;
  _rewFreePickDone=false;_rewPhaseId++;
  _rewCards=runWithKeyedRandom(`planner-future:${seed}`,()=>drawRewards(G._isShop?SHOP_EXCHANGE_TRIAL.stockCount:5));
  for(const card of _rewCards)if(card)card._isOriginalReward=true;
}
function futurePick(context,op){
  // 役割・既存の型・本体の合法配置で、実際に出た提示から相手を選ぶ。
  if(op.type==='exchange'){
    const choice=exchangeChoices('planner',context)[0];
    if(!choice||choice.gain<=0)return null;
    const name=_rewCards[choice.index].name;
    return exchangeShopCard(choice.index,choice.slot)?{name,slot:choice.slot}:null;
  }
  let best=null;
  for(const [index,card] of _rewCards.entries()){
    if(card?.type!=='panel')continue;
    const place=placement('planner',card,context);
    if(place&&place.gain>0&&(!best||place.gain>best.gain))best={...place,index,name:card.name};
  }
  if(!best)return null;
  const card=_rewCards[best.index];takeRewCard(best.index,best.slot);
  return !G._pendingPanelPlacement&&_rewCards[best.index]!==card?{name:best.name,slot:best.slot}:null;
}
async function project(context,wall,future){
  const key=JSON.stringify([wall,future,signature(),G.panelSaleStock,context.planner.weights]);
  if(projectionCache.has(key))return structuredClone(projectionCache.get(key));
  const acquired=[],local={...context,planner:structuredClone(context.planner)};
  // 実ランは出発前に道具を使う。未来の本体が出るまで永久強化を保留しない。
  await useItems('planner',local);
  if(future<0&&wall.distance>0)_prepareStartingBattleItems(false);
  if(future>=0)for(const [i,op] of wall.opportunities.entries()){
    // 通常戦を越えてから報酬を受け取る。一時効果の消費は本体の準備経路で進める。
    // 山場のtrialでも再び準備するため、ここで使った巻物は山場へ残らない。
    if(op.type==='reward')_prepareStartingBattleItems(false);
    const seed=hash(`planner-future:${G._runSeed}:${wall.target.wave}:${wall.target.stage}:${future}:${i}`);
    beginOffers(op,seed);planner.refresh(local,'projection');
    const pick=futurePick(local,op);if(pick){acquired.push({...pick,...op});stats.futureCards++;}
    await useItems('planner',local);
  }
  // 実際の配置改善と同じ探索。何も引かなかった枝では選択した配置をそのまま試す。
  if(future>=0&&acquired.length)arrange('planner',local,{passes:LIMITS.arrangePasses});
  stats.projections++;
  const queuedItems=[...new Set([...(G.pendingBattleItems||[]),...(G.nextBattleItems||[])].filter(Boolean).map(c=>c.name))];
  const result={state:structuredClone(G),acquired,board:boardRecord(),synergy:planner.describe(),queuedItems};
  projectionCache.set(key,result);return result;
}
async function combat(context,wall,samples,projected){
  return isolated(async()=>{
    await useItems('planner',context);
    const key=JSON.stringify([wall.target,samples,signature()]);
    if(combatCache.has(key)){stats.cacheHits++;return combatCache.get(key);}
    const point={win:0,hp:0,damage:0,progress:0};
    for(const sample of samples){
      const value=await isolated(()=>trial(wall.target,sample),{seed:sample.seed});stats.trials++;
      for(const field of Object.keys(point))point[field]+=value[field]/samples.length;
    }
    combatCache.set(key,point);return point;
  },{state:projected.state,seed:hash(`planner-items:${G._runSeed}`)});
}
async function evaluate(context,action,value,wall,samples,apply){
  stats.candidates++;
  return isolated(async()=>{
    if(!apply(action))return {...value,total:-1e9};
    const candidate=structuredClone(G),scenarios=[];
    const count=wall.opportunities.length?LIMITS.futures:0;
    for(let future=-1;future<count;future++){
      const projected=await isolated(()=>project(context,wall,future),{state:candidate,seed:hash(`planner-world:${future}`)});
      const point=await combat(context,wall,samples,projected);
      const weight=count?(future<0?LIMITS.missWeight:(1-LIMITS.missWeight)/count):1;
      scenarios.push({future,weight,...point,acquired:projected.acquired,board:projected.board,synergy:projected.synergy,queuedItems:projected.queuedItems});
    }
    const win=scenarios.reduce((s,x)=>s+x.win*x.weight,0),hp=scenarios.reduce((s,x)=>s+x.hp*x.weight,0),progress=scenarios.reduce((s,x)=>s+x.progress*x.weight,0);
    const enemyHp=samples.reduce((s,x)=>s+x.enemies.reduce((v,e)=>v+Math.max(1,e?.hp||0),0),0)/samples.length;
    const distanceWeight=1/(1+planner.LIMITS.distanceDecay*wall.distance);
    const bonus=distanceWeight*(planner.LIMITS.wall*win+planner.LIMITS.wallHp*Math.log1p(hp/Math.max(40,enemyHp))+planner.LIMITS.wallProgress*progress);
    return {...value,total:round(value.total+bonus),horizon:{...wall,win:round(win),hp:round(hp),progress:round(progress),bonus:round(bonus),distanceWeight,scenarios,
      enemySource:samples.every(s=>s.retry)?'known':'generated',enemySignatures:samples.map(s=>({seed:s.seed,known:s.retry,hash:hash(JSON.stringify(s.enemies))}))}};
  },{seed:hash(`planner-candidate:${G._runSeed}`)});
}
async function rerank(context,next,candidates,original,apply){
  if(!original)return original;
  const wall=wallFrom(next);if(!wall)return original;
  stats.decisions++;
  const knownKey=`${wall.target.wave}:${wall.target.stage}:${wall.target.type}`;
  const sampleKey=JSON.stringify([G._runSeed,wall.target,G._waveRetryEnemyKey===knownKey?G._waveEnemySnapshot:null]);
  if(!sampleCache.has(sampleKey))sampleCache.set(sampleKey,await enemySamples(wall.target,LIMITS.enemies,{partition:'planner-wall'}));
  const samples=sampleCache.get(sampleKey),seen=new Set(),short=[];
  const add=c=>{const key=JSON.stringify(c.action||{});if(!seen.has(key)&&c.value.win>=0){seen.add(key);short.push(c);}};
  // 次戦で候補を絞り、既存の将来評価で首位だった候補と「見送り」も必ず残す。
  add({action:original.action||{},value:original.value});
  candidates.slice().sort((a,b)=>b.value.immediate-a.value.immediate).slice(0,LIMITS.candidates).forEach(add);
  const stay=candidates.find(c=>!Object.keys(c.action).length);if(stay)add(stay);
  if(!short.length)return original;
  const evaluated=[];
  for(const candidate of short)evaluated.push({...candidate,value:await evaluate(context,candidate.action,candidate.value,wall,samples,apply)});
  let best=evaluated[0];for(const c of evaluated)if(c.value.total>best.value.total+1e-6)best=c;
  const without=evaluated.find(c=>JSON.stringify(c.action)===JSON.stringify(original.action||{}));
  const baseline=evaluated.find(c=>!Object.keys(c.action).length);
  const changed=JSON.stringify(best.action)!==JSON.stringify(original.action||{});
  const audit={changed,wave:G._wave,stage:G._waveStage,target:wall.target,distance:wall.distance,
    chosen:{action:best.action,name:actionName(best.action),immediate:best.value.immediate,future:best.value.future,total:best.value.total,horizon:best.value.horizon},
    without:{action:without.action,name:actionName(without.action),immediate:without.value.immediate,future:without.value.future,total:without.value.total,horizon:without.value.horizon}};
  if(changed){stats.changes++;if(audits.length<LIMITS.maxAudits)audits.push(audit);}
  return {...original,action:Object.keys(best.action).length?best.action:null,value:best.value,
    ...(baseline?{baseline:baseline.value}:{}),horizonDecision:{changed,target:wall.target,distance:wall.distance,
      withoutAction:without.action,withoutName:actionName(without.action),chosenName:actionName(best.action),withoutWin:without.value.horizon.win,chosenWin:best.value.horizon.win,
      withoutHp:without.value.horizon.hp,chosenHp:best.value.horizon.hp}};
}
function reset(){combatCache.clear();projectionCache.clear();sampleCache.clear();audits=[];for(const k of Object.keys(stats))stats[k]=0;}
function end(){return {stats:{...stats},audits};}
function recordedChoices(row){return row.actions.flatMap(a=>[
  ...(a.horizonDecision?[{...a.horizonDecision,type:a.type,name:a.name||a.horizonDecision.chosenName,wave:a.wave,stage:a.stage,value:a.forecast}]:[]),
  ...(Array.isArray(a.forecast)?a.forecast.filter(c=>c.horizonDecision).map(c=>({...c.horizonDecision,type:a.type,name:c.horizonDecision.chosenName,wave:a.wave,stage:a.stage,value:c.value})):[])]);}
module.exports={LIMITS,stats,wallFrom,rerank,reset,end,recordedChoices};
