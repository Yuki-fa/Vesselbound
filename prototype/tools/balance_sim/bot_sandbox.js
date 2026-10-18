'use strict';

// 先読みの全てを別のGと乱数で行う。呼び出し元のオブジェクトは書き換えない。
// Promiseを跨ぐため同一プロセスで並列実行しない（CLIの周回も直列）。
let forecastCompute=null;
function configure({compute}={}){forecastCompute=compute||null;}
function random(seed) {
  let t=seed>>>0;return ()=>{t=(t+0x6D2B79F5)>>>0;let x=Math.imul(t^(t>>>15),t|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;};
}
function hash(value) {
  let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;
}
async function isolated(fn,{state=G,seed=1}={}) {
  const saved={state:G,random:Math.random,cards:_rewCards,free:_rewFreePickDone,phase:_rewPhaseId,
    drag:_dragSrc,boss:_isBossFight,opening:_pveOpeningSummonState,live:_pveLiveCoreState};
  try {
    G=structuredClone(state);G._botProbe=true;Math.random=random(seed);
    _rewCards=structuredClone(saved.cards);_rewFreePickDone=saved.free;
    _pveOpeningSummonState=null;_pveLiveCoreState=null;
    return await fn();
  } finally {
    G=saved.state;Math.random=saved.random;_rewCards=saved.cards;_rewFreePickDone=saved.free;_rewPhaseId=saved.phase;
    _dragSrc=saved.drag;_isBossFight=saved.boss;_pveOpeningSummonState=saved.opening;_pveLiveCoreState=saved.live;
  }
}
function nextBattle() {
  let wave=Math.max(1,Number(G._wave)||1),stage=Number(G._waveStage)||1;
  if(Number(G._wave)===0)stage=2;
  for(let guard=0;guard<15;guard++) {
    const node=_waveRouteNode(stage,wave);
    if(node==='city'){stage++;continue;}
    if(node==='altar'){if(wave>=4)return null;wave++;stage=1;continue;}
    return {wave,stage,type:node==='elite'||node==='boss'?node:'battle',floor:_waveStageFloor(wave,stage,node)};
  }
  throw new Error('次戦の旅程が見つからない');
}

async function enemySamples(target,count,{partition='lookahead'}={}) {
  const retryKey=`${target.wave}:${target.stage}:${target.type}`;
  const retry=G._waveRetryEnemyKey===retryKey&&Array.isArray(G._waveEnemySnapshot);
  const cases=[];
  for(let index=0;index<count;index++) {
    const seed=hash(`${partition}:${G._runSeed}:${target.wave}:${target.stage}:${index}`);
    cases.push(await isolated(()=>{
      G._wave=target.wave;G._waveStage=target.stage;G._waveBattleType=target.type;G.floor=target.floor;
      G._mapBattle={mapIndex:target.wave,type:target.type,floor:target.floor,normalBattleNo:target.stage,turn:0};
      G._runRngState=seed;G._waveEnemyPreview={};G._enemyLaneFixed=false;
      _isBossFight=target.type==='boss';
      const enemies=retry?structuredClone(G._waveEnemySnapshot):runWithKeyedRandom(`bot-probe:${seed}`,()=>
        target.type==='elite'?generateEliteEnemies(target.floor):generateEnemies(target.floor));
      G.enemies=enemies;
      _layoutStartingBattleEnemies(null,retry,false,false,false,G._mapBattle,target.floor,false);
      return {seed,enemies:structuredClone(G.enemies),retry};
    },{seed}));
  }
  return cases;
}

async function trial(target,sample) {
  G._wave=target.wave;G._waveStage=target.stage;G.floor=target.floor;G._waveBattleType=target.type;
  G._mapBattle={mapIndex:target.wave,type:target.type,floor:target.floor,normalBattleNo:target.stage,turn:0};
  G.allies=[];G.enemies=structuredClone(sample.enemies);G.mana=0;G._blood=0;G._enemyBlood=0;
  G._battleCoreEvents=[];G._battleDefeatHandled=false;G._battleEndEffectsApplied=false;
  G._preserveEnemyOpening=false;G._deferManaThresholdEffects=true;G.phase='player';
  _prepareStartingBattleItems(false);_initSealStates();
  await applyNewPanelBattleStart({deferOpeningEffects:true,persistEternal:true});
  _initSealStates();_applyTerrainReinforcements();
  const state=_createPveCoreState();_stampCoreSideSlots(state);
  const result=(forecastCompute||SaveRun.computeBattle)(state,sample.seed);
  return {win:result.outcome==='p1'?1:0,hp:coreLivingUnits(result.finalState.units.p1).reduce((s,u)=>s+Math.max(0,u.hp),0),
    progress:result.outcome==='p1'?1:Math.max(0,1-coreLivingUnits(result.finalState.units.p2).reduce((s,u)=>s+Math.max(0,u.hp),0)/
      Math.max(1,sample.enemies.reduce((s,u)=>s+Math.max(0,u?.hp||0),0))),
    damage:result.events.filter(e=>e.type==='damage'&&e.side==='p2').reduce((s,e)=>s+Math.max(0,Number(e.amount)||0),0),
    outcome:result.outcome,turns:result.finalState.turn};
}

module.exports={isolated,nextBattle,enemySamples,trial,hash,random,configure};
