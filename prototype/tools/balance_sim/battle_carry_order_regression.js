'use strict';

// 終了時のコア盤面を、実際の startBattle / SaveRun.prepareBattle へ持ち越す。Chromeは不要。
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const {makeElement}=require('./stub');
global.requestAnimationFrame=()=>0;global.setInterval=()=>0;
let now=0;global.performance={now:()=>now+=1000};
console.table=()=>{};
for(const match of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)){
  if(!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT,match[1]),'utf8'),{filename:match[1]});
}
const elements=new Map(),renders=[];
document.getElementById=id=>{
  if(!elements.has(id)) elements.set(id,makeElement());
  return elements.get(id);
};
const ids=list=>list.filter(u=>u&&u.hp>0).map(u=>u.id);
const noop=()=>{},done=async()=>{};
// 並びは renderField と同じく配列順＋lane。仮DOMも前戦終了時の人数を保持する。
renderAll=()=>{
  renders.push(ids(G.allies));
  for(const [id,list] of [['f-ally',G.allies],['f-enemy',G.enemies]]){
    document.getElementById(id).querySelectorAll=()=>list.filter(u=>u&&u.hp>0).map(u=>{
      const slot=makeElement();slot.dataset.unitId=u.id;return slot;
    });
  }
};
renderControls=renderHandEditor=updateHUD=_updateLaneOffset=_warmBattleHitSfx=_settleBattleOpeningLayout=noop;
playBgm=playSfx=warmBgm=actionBannerSetBattleData=noop;
playBattleOpeningSequence=playBattleStartLines=_showArenaWaveIntro=done;
_playBattleStartIntro=async()=> 'normal';
nextTurn=done;checkInstantVictory=()=>false;
SaveRun.showAutoSaveIndicator=done;
let pending=null;SaveRun.replay=async p=>{pending=p;};
const plain=value=>JSON.parse(JSON.stringify(value));
function unit(id,lane='front',slot=0,extra={}){
  return {id,name:id,atk:20,hp:30,maxHp:30,baseAtk:20,baseMaxHp:30,
    side:'p1',slot,lane,_battleSlot:slot,_voidWalkerBonus:0,keywords:[],desc:'',effectData:{},...extra};
}
function firstBattle(deadLeft){
  initState();elements.clear();renders.length=0;SaveRun.cancelResume();pending=null;
  G._runId='carry-order-regression';G._runSeed=23;G._runRngState=23;
  G._wave=3;G._waveStage=2;G.floor=1;G._waveLife=3;G.phase='enemy';
  const alassus=unit('alassus','front',2,{name:'アラッサス',atk:31,hp:33,maxHp:40,poison:2,weaken:1,shield:1});
  const middle=unit('middle','front',3);
  // 開戦配置由来の空欄と、後衛を含む盤面。数値slotと_battleSlotは次の戦闘の順序ではない。
  G.allies=[null,deadLeft?unit('left-dead','front',1):null,alassus,middle,null,null,null,
    null,null,null,unit('rear0','rear',10),unit('rear1','rear',11),unit('rear2','rear',12),null];
  G.enemies=[unit('foe','front',0,{side:'p2',atk:1,hp:100,maxHp:100})];
  const state=_createPveCoreState(),events=[];
  if(deadLeft){
    const dead=G.allies[1];
    coreResolveHit(state,G.enemies[0],dead,dead.hp,false,createSeededRng(7),ev=>events.push(ev));
    assert.ok(events.some(ev=>ev.type==='death'&&ev.unitId===dead.id),'1戦目で左端が実際に死亡');
  }
  coreCompactUnits(state);
  const before=ids(G.allies);
  for(let i=0;i<4;i++){
    const child=coreSummonUnit(state,'p1',{name:'ペリカン',atk:23,hp:23},ev=>events.push(ev),'rear0');
    assert.ok(child);
    // summonイベント表示済みの印（PvE受け口が付ける値）。元の出撃体の枠番号とは衝突し得る。
    delete child._corePendingSummon;child._battleSlot=state.units.p1.indexOf(child);
  }
  coreCompactUnits(state);
  assert.equal(events.filter(ev=>ev.type==='summon').length,4);
  assert.deepEqual(ids(G.allies).slice(0,2),before.slice(0,2),'召喚は生存アラッサスの右へ出る');
  assert.deepEqual(G.allies.filter(u=>u.lane==='rear').map(u=>u.id),['rear0','rear1','rear2']);
  G._lastCompactLiveCounts={allies:G.allies.length,enemies:1};
  G._coreDrivenBattle=false;renderAll();renders.length=0;
  return G.allies;
}
function setCarry(kind){
  if(kind==='arena'){
    G._arenaActive=true;G._arenaRound=2;G._waveBattleType='arena';
    G._mapBattle={type:'arena',floor:1};
  }else{
    const entry=questDebugForceWaveQuest(2,'Q004');
    entry.status='accepted';entry.encounterPhase='garm';entry.encounterTarget={wave:2,stage:6};
    G._wave=2;G._waveStage=6;G._waveBattleType='battle';G._mapBattle={nodeId:'quest-garm',type:'battle',floor:1};
    assert.ok(questBattleCarryActive());
  }
}
(async()=>{
  await loadGameData();SaveRun.ready();SaveProfile.hasClearedRun=()=>true;
  let checked=0;
  for(const kind of ['arena','quest']) for(const deadLeft of [false,true]) for(const save of [false,true]){
    const label=`${kind} / ${deadLeft?'左端死亡後':'アラッサス左端生存'} / ${save?'保存あり':'保存なし'}`;
    if(process.env.VB_ONLY&&!label.includes(process.env.VB_ONLY)) continue;
    const allies=firstBattle(deadLeft),expected=ids(allies),stats=allies.map(u=>[u.id,u.atk,u.hp,u.maxHp,u.poison,u.weaken,u.shield,u.lane]);
    setCarry(kind);G._debugMode=!save;
    await startBattle();
    assert.deepEqual(ids(G.allies),expected,label+'：2戦目も1戦目終了時のコア順');
    assert.equal(G.allies,allies,label+'：持ち越し配列の参照を維持');
    assert.ok(G.allies.every(Boolean),label+'：死亡・nullは通常のコア規則で詰める');
    assert.deepEqual(G.allies.map(u=>[u.id,u.atk,u.hp,u.maxHp,u.poison,u.weaken,u.shield,u.lane]),stats,label+'：HP・状態・laneを維持');
    for(const order of renders) assert.deepEqual(order,expected,label+'：開戦準備の途中も元の順序');
    if(save){
      assert.ok(pending);assert.deepEqual(ids(pending.setup.units.p1),expected,label+'：保存setupの並び');
      const resume=SaveRun.takeResume;SaveRun.takeResume=()=>plain(pending);
      try{await startBattle();assert.deepEqual(ids(G.allies),expected,label+'：保存再開の並び');}
      finally{SaveRun.takeResume=resume;}
    }else assert.equal(pending,null);
    console.log('OK '+label);checked++;
  }
  if(!process.env.VB_ONLY) for(const kind of ['arena','quest']){
    const allies=firstBattle(true),expected=ids(allies);
    // 終戦時に空欄・消滅済みの体が残った場合も、通常の戦闘と同じく取り除く。
    allies.splice(1,0,null,unit('finished-death','front',0,{hp:0,_deathFxReady:true}));
    setCarry(kind);G._debugMode=true;
    await startBattle();assert.deepEqual(ids(G.allies),expected);
    assert.equal(G.allies,allies);assert.ok(G.allies.every(u=>u&&u.hp>0));
    console.log('OK '+kind+' / 終戦時の死亡体・nullを詰めて持ち越し');checked++;
  }
  if(!process.env.VB_ONLY) for(const save of [false,true]){
    const end=firstBattle(true);
    // 味方と同じ枠番号の衝突を持つ敵の終戦盤面。空欄・死亡体も保存どおり残す。
    G._wave=1;G._waveStage=2;G._waveBattleType='battle';G.floor=_waveStageFloor(1,2,'battle');
    G._waveEnemySnapshot=SaveRun.copy(end,{battleCarry:true});
    G._waveEnemySnapshot.splice(1,0,null,unit('enemy-dead','front',1,{hp:0}));
    G._waveEnemySnapshot.forEach((u,i)=>{if(u){u.side='p2';u.slot=i;u._stageNumber=1;u.allyTarget=false;}});
    G._waveEnemySnapshotAtEnd=true;G._waveEnemySnapshotBlood=4;G._waveRetryEnemyKey='1:2:battle';
    const expected=plain(G._waveEnemySnapshot);
    const card=PANEL_POOL.find(c=>c.category==='キャラクター'&&c.power>0&&c.life>0&&!c.desc&&!c.keywords.length);
    assert.ok(card);G.mainBoard[1]=makePanel(card.id);G.allies=[];G._debugMode=!save;
    await startBattle();assert.deepEqual(SaveRun.copy(G.enemies,{battleCarry:true}),expected);
    assert.equal(G._preserveEnemyOpening,true);
    if(save){
      assert.deepEqual(pending.setup.units.p2,expected);
      const resume=SaveRun.takeResume;SaveRun.takeResume=()=>plain(pending);
      try{await startBattle();assert.deepEqual(SaveRun.copy(G.enemies,{battleCarry:true}),expected);}
      finally{SaveRun.takeResume=resume;}
    }
    console.log('OK 敵の再戦 / 枠番号衝突・空欄・死亡体 / '+(save?'保存・再開あり':'保存なし'));checked++;
  }
  console.log(`連戦の持ち越し順: ${checked}件OK`);
})().catch(error=>{console.error(error);process.exitCode=1;});
