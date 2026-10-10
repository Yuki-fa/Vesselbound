'use strict';

// 敗北→編成→再戦とSaveRunの実経路を検査する。DOM演出だけを省略し、Chromeは不要。
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const {makeElement}=require('./stub');
global.requestAnimationFrame=()=>0;
global.setInterval=()=>0;
let now=0;global.performance={now:()=>now+=1000};
console.table=()=>{};
for(const match of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)){
  if(!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT,match[1]),'utf8'),{filename:match[1]});
}
const elements=new Map();
document.getElementById=id=>{
  if(!elements.has(id)) elements.set(id,makeElement());
  return elements.get(id);
};
const noop=()=>{},done=async()=>{};
// 表示と待機は差し替える。敵生成・編成・開戦コア・敗北後処理・報酬・保存は本番の関数を使う。
renderAll=renderControls=renderHandEditor=renderRewCards=renderMoveSlotsInEnemy=renderFieldEditor=updateHUD=noop;
_updateLaneOffset=_warmBattleHitSfx=_settleBattleOpeningLayout=refreshRewardGoldUi=noop;
playBgm=playSfx=warmBgm=actionBannerSetBattleData=noop;
playBattleOpeningSequence=playBattleStartLines=playBattlePlayerDefeatLines=done;
_playBattleStartIntro=async()=> 'normal';
_awaitFrame=_flushCorePveHitEvents=_queueRingManaThresholdEffects=_flushRingManaThresholdEffects=done;
SaveRun.showAutoSaveIndicator=done;
let continued,defeatTask,replayed,gameovers=0,draws=0,mixed=0,reveals=0;
showVictoryOverlay=callback=>{continued=callback();};
gameOver=()=>{gameovers++;};
const finishDefeat=_finishWaveBattleDefeat;
_finishWaveBattleDefeat=spec=>(defeatTask=finishDefeat(spec));
const draw=drawRewards,mix=questMixBattleRewards;
drawRewards=(...args)=>{draws++;return draw(...args);};
questMixBattleRewards=(...args)=>{mixed++;return mix(...args);};
_playRewardReveal=()=>{reveals++;};
const originalReplay=SaveRun.replay;
SaveRun.replay=async pending=>{replayed=pending;};
let checked=0;
async function check(name,fn){await fn();checked++;console.log('OK '+name);}
const plain=value=>JSON.parse(JSON.stringify(value));
function reset(type='battle'){
  initState();elements.clear();SaveRun.cancelResume();
  SaveProfile.hasClearedRun=()=>true;
  G._runId='defeat-retry-regression';G._runSeed=23;G._runRngState=23;
  G._wave=1;G._waveStage=type==='elite'?4:type==='boss'?9:2;
  G._waveBattleType=type;G._waveLife=3;G.phase='enemy';
  G.floor=_waveStageFloor(G._wave,G._waveStage,type);
  const card=PANEL_POOL.find(c=>c.category==='キャラクター'&&c.power>0&&c.life>0&&!c.desc&&!c.keywords.length);
  assert.ok(card,'素の味方カードが必要');
  G.mainBoard[1]=makePanel(card.id);
  G.allies=[{id:'lost-ally',atk:0,hp:0,maxHp:100,lane:'rear',poison:99,shield:99}];
  G._waveEnemySnapshot=[{id:'before-battle',hp:100,maxHp:100,atk:10}];
  continued=defeatTask=replayed=null;draws=mixed=reveals=gameovers=0;
  _rewCards=[makePanel(card.id)];_rewFreePickDone=false;
}
function unit(id,index,extra={}){
  return {id,name:id,atk:7,hp:12,maxHp:30,baseAtk:9,baseMaxHp:35,_baseAtk:9,_baseMaxHp:35,
    side:'p2',slot:index,lane:'front',keywords:[],desc:'',effectData:{},allyTarget:false,_stageNumber:1,_voidWalkerBonus:0,...extra};
}
function endBoard(){
  const wounded=unit('wounded',0,{atk:4,hp:8,maxHp:28,poison:3,weaken:2,shield:1,
    keywords:['結界4','加護3','根性'],_wardCharges:1,_starterRegenUsed:true,
    _corePassiveOpeningApplied:true,customStatus:{stacks:7}});
  const summoned=unit('summoned',2,{name:'召喚された敵',atk:16,hp:9,maxHp:15,
    _summonedInBattle:true,_openingDuplicate:true,keywords:['復活'],_starterRegenUsed:false});
  const transformed=unit('transformed',3,{name:'ドラゴン',no:'C104',artCode:'C104',_artCode:'C104',art:'',
    lane:'rear',atk:25,hp:2,maxHp:40,keywords:['結界3'],shield:0,effectData:{effectTexts:['攻撃：1マナを得る。']}});
  const dead=unit('dead',4,{hp:0,atk:0,_starterRegenUsed:true,keywords:['復活']});
  const sealed=unit('sealed',5,{lane:'rear',keywords:['封印9'],_sealed:true,_sealValue:6,_sealOrder:101.5});
  const released=unit('released',6,{lane:'rear',keywords:['封印5'],_sealed:false,_sealOrder:104});
  const infinite=unit('infinite',7,{lane:'rear',keywords:['封印∞'],_sealed:true,_sealValue:Infinity,_sealInfinity:true});
  const silenced=unit('silenced',8,{lane:'rear',keywords:['結界2','根性'],shield:0,desc:'開戦：このキャラクターは+2/+2を得る。'});
  coreSilenceUnit(silenced);
  wounded._lastDamageSource=G.allies[0];G.allies[0]._lastDamageSource=wounded;
  wounded._currentAttackTarget=wounded;
  wounded._coreRunner={unit:wounded,step:noop};
  wounded._lastVisualRect={getBoundingClientRect:noop};
  wounded._stealPresent={clone:makeElement(),unit:wounded};
  Object.assign(wounded,{_displayHp:999,_displayWeaken:999,_shownPoison:999,_battleLinesShown:true,
    _deathFxReady:true,_deathProcessed:true,_coreDeathTriggered:true,_coreDeathEffectsTriggered:true,
    _coreDeathObserved:true,_coreAttackEffectsState:'old-token',_coreInjuryReentry:true,
    _corePendingSummon:true,_manaFireCounts:{x:2},_reviveHidden:true,_motionHidden:true,
    _deathProcessing:true,_deathWithoutEvent:true,_deathByStatDrain:true,_stealPendingPresent:true,
    _preDeathSnapshot:{hp:999},_battleStartHp:999,_coreInjuryEffectsResolving:true,
    _lastInjuryEffectDispatch:'old-token',_attackEffectPending:true,_attackEffectDispatching:true,
    _attackObserverFired:true,_skipCurrentAttack:true,_fleeInsteadOfAttack:true,_coreAtkGainEffectDepth:true});
  return [wounded,null,summoned,transformed,dead,sealed,released,infinite,silenced];
}
async function lose(){
  handleBattleDefeat();
  assert.ok(defeatTask,'通常の敗北経路へ届く');
  await defeatTask;await continued;
}
function assertNoRewards(){
  assert.equal(draws,0,'敗北ではカード・アイテムの抽選を呼ばない');
  assert.equal(mixed,0,'敗北ではクエストの落とし物を混入しない');
  assert.equal(reveals,0,'敗北では報酬めくりを呼ばない');
  assert.deepEqual(_rewCards,[]);assert.equal(_rewFreePickDone,true);
  assert.deepEqual(G._ringOffer,[]);assert.equal(G._ringOfferPhase,false);
  assert.deepEqual(G._rewardStartSnapshot.rewCards,[],'元に戻すでも報酬は復活しない');
}
// 開戦時の敵を実経路で作る（startBattle が _waveEnemySnapshot を控える）。
async function startFresh(type){
  reset(type);G._waveEnemySnapshot=null;G._waveRetryEnemyKey=null;
  await startBattle();
  assert.ok(Array.isArray(G._waveEnemySnapshot)&&G._waveEnemySnapshot.some(Boolean),'開戦時の敵を控える');
  G.phase='enemy';G._waveBattleType=type;replayed=null;
  G.allies=[{id:'lost-ally',atk:0,hp:0,maxHp:100,lane:'rear',poison:99,shield:99}];
  return plain(G._waveEnemySnapshot);
}
// 並び（配列の位置）・前衛／後衛・IDだけを比べる。
const firstOf=list=>(list||[]).find(Boolean)||{};
const layoutOf=list=>(list||[]).map(u=>u?{id:u.id,lane:u.lane||'front'}:null);
function assertCarry(expected,actual){
  // コアが再スタンプするside/slotも含め、終了時の全保存可能データを比較する。
  assert.deepEqual(SaveRun.copy(actual,{battleCarry:true}),expected);
  assert.equal(actual[4].hp,0,'死亡した敵を復活させない');
  assert.equal(actual[3].artCode,'C104','変身後の絵を維持');
  assert.equal(actual[2]._summonedInBattle,true,'召喚された体を維持');
  assert.equal(actual[5]._sealValue,6,'封印の残量を維持');
  assert.equal(actual[6]._sealed,false,'解放済みを再封印しない');
  assert.equal(actual[7]._sealInfinity,true);
  assert.ok(!actual.some(u=>u&&u.id==='before-battle'));
}

(async()=>{
  await loadGameData();SaveRun.ready();
  for(const type of ['battle','elite','boss']){
    await check(type+'：敗北で抽選・報酬・指輪を出さず、開始時の敵の控えを終了時で上書きしない',async()=>{
      const start=await startFresh(type);
      G.enemies=endBoard();G._enemyBlood=4;
      const board=plain(G.mainBoard),gold=G.gold;
      await lose();assertNoRewards();
      assert.equal(G._waveLife,2);assert.equal(G.gold,gold);assert.deepEqual(G.mainBoard,board);
      assert.deepEqual(plain(G._waveEnemySnapshot),start,'開戦時の控えのまま');
      assert.equal(G._waveEnemySnapshotAtEnd,false);assert.equal(G._waveEnemySnapshotBlood,0);
      assert.equal(G.enemies.length,0);assert.ok(_waveRetryPending());
      assert.deepEqual(loadRun().state.reward.cards,[],'敗北後のセーブも報酬なし');
      assert.deepEqual(plain(loadRun().state.progress._waveEnemySnapshot),start);
    });
    await check(type+'：再戦は開始時の敵（HP・前衛／後衛・並び）に戻り、敵も通常どおり開戦する',async()=>{
      const start=plain(G._waveEnemySnapshot);
      G._waveBattleType=type;G._waveIsRetry=true;G.phase='enemy';
      await startBattle();
      assert.ok(replayed);assert.deepEqual(layoutOf(replayed.setup.units.p2),layoutOf(start),'並びと前衛／後衛が開始時と同じ');
      replayed.setup.units.p2.forEach((u,i)=>{ if(u) assert.equal(u.hp,start[i].hp,'HPは開始時の値'); });
      assert.equal(replayed.setup.openingSides,undefined,'敵も開戦する');
      assert.equal(replayed.setup.blood.p2,0,'敵の血も初期化');
      assert.ok(G.allies.some(u=>u&&u.hp>0),'味方は魔導板から従来どおり再出撃');
      assert.deepEqual(SaveRun.computeBattle(replayed.setup,replayed.seed),replayed);
    });
  }
  await check('敗北後のSaveRunを読み直し、報酬なしの編成から開始時の敵へ再戦',async()=>{
    const start=await startFresh('battle');G.enemies=endBoard();await lose();
    const save=loadRun(),expected=plain(save.state.progress._waveEnemySnapshot);
    assert.deepEqual(expected,start);
    G._waveEnemySnapshot=[];_rewCards=[];SaveRun.restoreRunState(save);
    goToReward({restoreCheckpoint:true});assertNoRewards();
    assert.equal(G._waveEnemySnapshotAtEnd,false);assert.deepEqual(plain(G._waveEnemySnapshot),expected);
    G._waveBattleType='battle';G.phase='enemy';await startBattle();
    assert.deepEqual(layoutOf(replayed.setup.units.p2),layoutOf(start));
  });
  await check('再戦開始後のbattleチェックポイントから再開してもsetupと敵を維持',async()=>{
    const save=loadRun(),expected=plain(save.pendingBattle.setup.units.p2);
    SaveRun.restoreRunState(save);
    SaveRun.takeResume=()=>plain(save.pendingBattle);
    try{await startBattle();assert.deepEqual(layoutOf(G.enemies),layoutOf(expected));assert.deepEqual(replayed,save.pendingBattle);}
    finally{SaveRun.takeResume=()=>null;}
  });
  await check('再戦では敵の血も封印も開始時へ戻す',async()=>{
    const start=await startFresh('battle');G._enemyBlood=7;G._blood=31;
    G.enemies=endBoard();await lose();const save=loadRun();
    assert.equal(save.state.progress._waveEnemySnapshotBlood,0);
    SaveRun.restoreRunState(save);G._waveBattleType='battle';G.phase='enemy';await startBattle();
    assert.equal(replayed.setup.blood.p1,0);assert.equal(replayed.setup.blood.p2,0);
    assert.deepEqual(layoutOf(replayed.setup.units.p2),layoutOf(start));
  });
  await check('新しい旗が無い旧セーブも復元でき、開始時の敵として初期化',async()=>{
    reset();G.enemies=[unit('legacy',0,{keywords:['結界3'],shield:0})];
    G._waveEnemySnapshot=plain(G.enemies);G._waveRetryEnemyKey='1:2:battle';
    const save=SaveRun.buildRunSave('reward');delete save.state.progress._waveEnemySnapshotAtEnd;
    delete save.state.progress._waveEnemySnapshotBlood;
    SaveRun.restoreRunState(save);assert.equal(G._waveEnemySnapshotAtEnd,false);
    assert.equal(G._waveEnemySnapshotBlood,0);
    G._waveBattleType='battle';await startBattle();
    assert.equal(G._preserveEnemyOpening,false);assert.equal(replayed.setup.openingSides,undefined);
    assert.ok(replayed.events.some(ev=>ev.type==='shield_set'&&ev.side==='p2'));
  });
  await check('保存しないPvE経路でも再戦は開始時の敵へ戻る',async()=>{
    const start=await startFresh('battle');G.enemies=endBoard();await lose();
    const turn=nextTurn;
    G._debugMode=true;G._waveBattleType='battle';G.phase='enemy';nextTurn=done;
    try{await startBattle();assert.deepEqual(layoutOf(G.enemies),layoutOf(start));assert.equal(G._preserveEnemyOpening,false);}
    finally{nextTurn=turn;}
  });
  await check('旧セーブ（終了時の盤面を維持していた頃）の再戦でも味方の開戦効果は敵へ作用し、敵の結界を付け直さない',async()=>{
    reset();G._preserveEnemyOpening=true;
    G.allies=[unit('opening-ally',0,{side:'p1',desc:'開戦：全ての敵に弱体3を与える。'})];
    G.activeBattleItems=[{id:'meteor',itemEffectKey:'meteor_scroll'}];
    G.enemies=[unit('retained-enemy',0,{shield:1,keywords:['結界3'],poison:2,
      desc:'開戦：このキャラクターのATKを2倍にする。'})];
    const state=_createPveCoreState();_stampCoreSideSlots(state);
    const events=[];createBattleRunner(state,createSeededRng(5),event=>events.push(event));
    assert.equal(G.enemies[0].shield,0,'味方の新しい開戦効果で残り結界を消費する');
    assert.equal(G.enemies[0].poison,2);assert.equal(G.enemies[0].hp,12);
    assert.equal(G.enemies[0].weaken,3,'味方の開戦効果も敵へ作用する');
    assert.equal(G.enemies[0].atk,7,'開戦済みの敵の効果を再発動しない');
    assert.ok(events.some(event=>event.type==='damage'&&event.side==='p2'));
    assert.ok(!events.some(event=>event.type==='shield_set'&&event.side==='p2'));
  });
  await check('オンライン対戦は再戦入力を読まず、両陣営の開戦と結果が不変',async()=>{
    reset();G._onlineMode=true;
    const setup={seed:5,sides:{p1:{units:[unit('p1',0,{side:'p1',keywords:['結界2']})]},
      p2:{units:[unit('p2',0,{keywords:['結界3']})]}}};
    const result=simulateOnlineBattle(setup);
    G._preserveEnemyOpening=true;G._waveEnemySnapshotAtEnd=true;G._waveRetryEnemyKey='1:2:battle';
    assert.deepEqual(simulateOnlineBattle(setup),result);
    for(const side of ['p1','p2']) assert.ok(result.events.some(event=>event.type==='shield_set'&&event.side===side));
    assert.equal(defeatTask,null);assert.equal(draws,0);
  });
  await check('コアが実際に解決した敗北を2回再戦しても、毎回開始時のHPの敵からやり直す',async()=>{
    reset();G._battleCoreEvents=[];G._battleRunId=1;
    G.allies=[{id:'weak',name:'弱い味方',atk:1,hp:2,maxHp:2,lane:'front',keywords:[]}];
    G.enemies=[unit('strong',0,{atk:50,hp:200,maxHp:200})];
    G._waveEnemySnapshot=clone(G.enemies);
    const initial=_createPveCoreState();_stampCoreSideSlots(initial);
    const first=SaveRun.computeBattle(initial,57);assert.equal(first.outcome,'p2');
    assert.ok(first.finalState.units.p2[0].hp<200,'初戦で実際にダメージを受ける');
    await originalReplay(first,1);await defeatTask;await continued;
    assert.equal(firstOf(G._waveEnemySnapshot).hp,200,'控えは開始時のまま');
    G._waveBattleType='battle';G.phase='enemy';await startBattle();
    const second=replayed;assert.equal(firstOf(second.setup.units.p2).hp,200);
    defeatTask=continued=null;
    await originalReplay(second,G._battleRunId);await defeatTask;await continued;
    assert.equal(G._waveLife,1);assert.equal(firstOf(G._waveEnemySnapshot).hp,200);
    SaveRun.restoreRunState(loadRun());G._waveBattleType='battle';G.phase='enemy';await startBattle();
    assert.equal(firstOf(replayed.setup.units.p2).hp,200);
  });
  await check('相打ちで敵が全滅した場合は既存どおり勝利処理へ渡す',async()=>{
    reset();G.enemies=[];let victories=0;
    const victory=_onAllEnemiesDefeated;
    _onAllEnemiesDefeated=()=>{victories++;};
    try{handleBattleDefeat();assert.equal(victories,1);assert.equal(G._waveLife,3);assert.equal(defeatTask,null);}
    finally{_onAllEnemiesDefeated=victory;}
  });
  await check('空盤面が敗北として渡されても開始時の敵の控えから再戦し、敵を生成し直さない',async()=>{
    reset();G._waveEnemySnapshot=[unit('before-battle',0)];
    G.enemies=[];await _finishWaveBattleDefeat(null);await continued;assertNoRewards();
    const save=loadRun();SaveRun.restoreRunState(save);
    assert.deepEqual(layoutOf(G._waveEnemySnapshot),[{id:'before-battle',lane:'front'}]);
    G._waveBattleType='battle';G.phase='enemy';
    const generate=generateEnemies;generateEnemies=()=>{throw new Error('再生成してはいけない');};
    try{await startBattle();assert.deepEqual(layoutOf(replayed.setup.units.p2).filter(Boolean),[{id:'before-battle',lane:'front'}]);}
    finally{generateEnemies=generate;}
  });
  await check('ライフ0の敗北はゲームオーバーで報酬を出さない',async()=>{
    reset();G._waveLife=1;G.enemies=[unit('survivor',0)];await lose();
    assert.equal(gameovers,1);assert.equal(draws,0);assert.equal(mixed,0);assert.equal(reveals,0);
  });
  await check('追撃戦の失敗は再戦せず通過するが、新しい戦闘報酬を出さない',async()=>{
    reset();const entry=questDebugForceWaveQuest(2,'Q004');
    entry.status='accepted';entry.encounterPhase='garm';entry.encounterTarget={wave:2,stage:6};
    G._wave=2;G._waveStage=6;G._waveBattleType='battle';
    G._mapBattle={nodeId:'quest-garm',type:'battle'};
    G.enemies=[unit('garm',0,{artCode:'EN032',_questGarm:true})];
    const dialogue=questPlayBattleDefeatDialogue;questPlayBattleDefeatDialogue=done;
    try{await lose();assertNoRewards();assert.equal(entry.status,'failed');
      assert.equal(G._waveStage,7);assert.equal(G._waveRetryEnemyKey,null);assert.equal(G._waveEnemySnapshot,null);}
    finally{questPlayBattleDefeatDialogue=dialogue;}
  });
  await check('目標討伐後の追撃戦敗北は既存の成功報告へ渡し、謝礼の例外を維持',async()=>{
    reset();let campOptions;
    const camp=_qShowGarmCamp;_qShowGarmCamp=async(_entry,_escaped,options)=>{campOptions=options;};
    try{await questFinishBattleDefeat({handled:true,success:true,entry:{}});
      assert.deepEqual(campOptions,{defeatedThenRetreat:true});assert.equal(draws,0);}
    finally{_qShowGarmCamp=camp;}
  });
  await check('闘技場の敗北は賞金0・入場前の編成へ戻り、報酬抽選と再戦を通らない',async()=>{
    reset();G._arenaActive=true;G._arenaWins=3;
    G._waveEnemySnapshotAtEnd=true;
    G._waveEnemySnapshotBlood=7;
    G._arenaEntrySnapshot=_arenaCaptureEntrySnapshot();
    const before=plain(G.mainBoard);
    G.mainBoard.fill(null);G._waveEnemySnapshotAtEnd=false;
    G._waveEnemySnapshotBlood=0;
    _arenaRestoreEntrySnapshot();assert.deepEqual(G.mainBoard,before);assert.equal(G._waveEnemySnapshotAtEnd,true);
    assert.equal(G._waveEnemySnapshotBlood,7);
    let reception=0,paid=0;
    const keys=['fadeScreenSwitch','_arenaPrepareReception','_facilityGreetingEntry','_showFacilityPortraitPair',
      '_qStartDialogue','_qClearPresentation','_hideFacilityGreetingScene','openMapVillage','gainEventGold','stopBgm'];
    const originals=keys.map(key=>global[key]);
    Object.assign(global,{fadeScreenSwitch:async fn=>fn(),_arenaPrepareReception:()=>{reception++;G._arenaActive=false;},
      _facilityGreetingEntry:()=>({}),_showFacilityPortraitPair:done,_qStartDialogue:done,
      _qClearPresentation:done,_hideFacilityGreetingScene:noop,openMapVillage:noop,gainEventGold:n=>{paid+=n;},stopBgm:noop});
    try{await _arenaFinish('lose',3);assert.equal(reception,1);assert.equal(paid,0);assert.equal(draws,0);
      assert.equal(Object.values(G._arenaResults)[0].prize,0);assert.equal(G._arenaActive,false);}
    finally{keys.forEach((key,index)=>{global[key]=originals[index];});}
  });
  await check('勝利時の報酬抽選・クエスト混入・めくりは従来どおり',async()=>{
    reset();G.phase='reward';G._waveRewardCount=5;goToReward({checkpoint:true});
    assert.equal(draws,1);assert.equal(mixed,1);assert.equal(reveals,1);assert.equal(_rewCards.length,5);
    assert.equal(_rewFreePickDone,false);
  });
  SaveRun.replay=originalReplay;
  console.log(`敗北・再戦・保存の回帰: ${checked}件OK`);
})().catch(error=>{console.error(error);process.exitCode=1;});
