// arena.js — ギャラハ「闘技場」
// 施設の会話・連戦の進行・受付への復帰だけを持つ。戦闘の数値計算と勝敗判定は
// enemy.js / battle.js / battle/core.js の共通経路を使う。

// 参加費はシートの選択肢の文（「・参加する（120G）」）から読む。読めない時だけこの値（2026-09-25 利用者指定で120G）。
const ARENA_ENTRY_COST=120;
const ARENA_ROUND_COUNT=6;
let _arenaFinishBusy=false;

function arenaIsActive(){
  return !!(typeof G!=='undefined'&&G&&G._arenaActive);
}

function arenaPrizeForWins(wins){
  const n=Math.max(0,Math.min(ARENA_ROUND_COUNT,Number(wins)||0));
  return n>0?25*Math.pow(2,n-1):0;
}

function _arenaHideDebugButtons(){
  ['btn-debug-kill','btn-debug-gameover','btn-test-battle','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display='none';
  });
}

function _arenaCopy(value){
  return typeof clone==='function'?clone(value):JSON.parse(JSON.stringify(value));
}

function _arenaFacilityKey(){
  return Math.max(0,Number(G&&G._wave)||0);
}

function _arenaCaptureEntrySnapshot(){
  return {
    floor:G.floor,
    waveStage:G._waveStage,
    waveBattleType:G._waveBattleType,
    mapBattle:_arenaCopy(G._mapBattle||null),
    waveBattleWon:G._waveBattleWon,
    mainBoard:_arenaCopy(G.mainBoard||[]),
    globalPanels:_arenaCopy(G.globalPanels||[]),
    spellSlots:_arenaCopy(G.spellSlots||[]),
    rings:_arenaCopy(G.rings||[]),
    mapPanelPowers:_arenaCopy(G.mapPanelPowers||[]),
    panelPermanentBuffs:_arenaCopy(G.panelPermanentBuffs||{}),
    panelColorPermanentBuffs:_arenaCopy(G.panelColorPermanentBuffs||{}),
    baseIncome:G.baseIncome,
    gold:G.gold,
    mana:G.mana,
    blood:G._blood,
    enemyBlood:G._enemyBlood,
    life:G.life,
    waveLife:G._waveLife,
    runStats:_arenaCopy(G.runStats||null),
    waveRewardCount:G._waveRewardCount,
    waveEliteWon:G._waveEliteWon,
    battleBossMult:G._battleBossMult,
    extraBattleMult:G._extraBattleMult,
    isEliteFight:G._isEliteFight,
    eliteIdx:G._eliteIdx,
    bossSlot:G._bossSlot,
    bossJustDefeated:!!G._bossJustDefeated,
    isBossRewardCycle:!!G._isBossRewardCycle,
    isBossFight:!!G._isBossFight,
    waveWithdraw:!!G._waveWithdraw,
    waveIsRetry:!!G._waveIsRetry,
    waveDefeatCount:G._waveDefeatCount,
    waveEnemySnapshot:_arenaCopy(G._waveEnemySnapshot||null),
    retryFloor:G._retryFloor,
    mapReturnAfterReward:!!G._mapReturnAfterReward,
    isRewardTown:!!G._isRewardTown,
    freeRewardPanelMode:!!G._freeRewardPanelMode,
    rewardOnePickMode:!!G._rewardOnePickMode,
    freeItemPhase:G._freeItemPhase,
    freeItemUsed:!!G._freeItemUsed,
    showGlobalPanels:!!G._showGlobalPanels,
    selectedBoardUnitIdx:G._selectedBoardUnitIdx,
    selectedBoardCardIdx:G._selectedBoardCardIdx,
    pendingBattleItems:_arenaCopy(G.pendingBattleItems||[]),
    nextBattleItems:_arenaCopy(G.nextBattleItems||[]),
    activeBattleItems:_arenaCopy(G.activeBattleItems||[]),
  };
}

function _arenaRestoreEntrySnapshot(){
  const snap=G._arenaEntrySnapshot;
  if(!snap) return;
  if(snap.floor!==undefined) G.floor=snap.floor;
  if(snap.waveStage!==undefined) G._waveStage=snap.waveStage;
  G._waveBattleType=snap.waveBattleType==null?null:snap.waveBattleType;
  G._mapBattle=_arenaCopy(snap.mapBattle||null);
  G._waveBattleWon=snap.waveBattleWon==null?null:snap.waveBattleWon;
  G.mainBoard=_arenaCopy(snap.mainBoard||[]);
  G.globalPanels=_arenaCopy(snap.globalPanels||[]);
  G.spellSlots=_arenaCopy(snap.spellSlots||[]);
  G.rings=_arenaCopy(snap.rings||[]);
  G.mapPanelPowers=_arenaCopy(snap.mapPanelPowers||[]);
  G.panelPermanentBuffs=_arenaCopy(snap.panelPermanentBuffs||{});
  G.panelColorPermanentBuffs=_arenaCopy(snap.panelColorPermanentBuffs||{});
  if(snap.baseIncome!==undefined) G.baseIncome=snap.baseIncome;
  if(snap.gold!==undefined) G.gold=snap.gold;
  if(snap.mana!==undefined) G.mana=snap.mana;
  if(snap.blood!==undefined) G._blood=snap.blood;
  if(snap.enemyBlood!==undefined) G._enemyBlood=snap.enemyBlood;
  if(snap.life!==undefined) G.life=snap.life;
  if(snap.waveLife!==undefined) G._waveLife=snap.waveLife;
  if(snap.runStats!==undefined){
    G.runStats=_arenaCopy(snap.runStats||null);
    if(G.runStats&&typeof performance!=='undefined') G.runStats.startedAt=performance.now();
  }
  if(snap.waveRewardCount!==undefined) G._waveRewardCount=snap.waveRewardCount;
  if(snap.waveEliteWon!==undefined) G._waveEliteWon=snap.waveEliteWon;
  if(snap.battleBossMult!==undefined) G._battleBossMult=snap.battleBossMult;
  if(snap.extraBattleMult!==undefined) G._extraBattleMult=snap.extraBattleMult;
  if(snap.isEliteFight!==undefined) G._isEliteFight=snap.isEliteFight;
  if(snap.eliteIdx!==undefined) G._eliteIdx=snap.eliteIdx;
  if(snap.bossSlot!==undefined) G._bossSlot=snap.bossSlot;
  if(snap.bossJustDefeated!==undefined) G._bossJustDefeated=!!snap.bossJustDefeated;
  if(snap.isBossRewardCycle!==undefined) G._isBossRewardCycle=!!snap.isBossRewardCycle;
  if(snap.isBossFight!==undefined) G._isBossFight=!!snap.isBossFight;
  if(snap.waveWithdraw!==undefined) G._waveWithdraw=!!snap.waveWithdraw;
  if(snap.waveIsRetry!==undefined) G._waveIsRetry=!!snap.waveIsRetry;
  if(snap.waveDefeatCount!==undefined) G._waveDefeatCount=snap.waveDefeatCount;
  if(snap.waveEnemySnapshot!==undefined) G._waveEnemySnapshot=_arenaCopy(snap.waveEnemySnapshot||null);
  if(snap.retryFloor!==undefined) G._retryFloor=snap.retryFloor;
  if(snap.mapReturnAfterReward!==undefined) G._mapReturnAfterReward=!!snap.mapReturnAfterReward;
  if(snap.isRewardTown!==undefined) G._isRewardTown=!!snap.isRewardTown;
  if(snap.freeRewardPanelMode!==undefined) G._freeRewardPanelMode=!!snap.freeRewardPanelMode;
  if(snap.rewardOnePickMode!==undefined) G._rewardOnePickMode=!!snap.rewardOnePickMode;
  if(snap.freeItemPhase!==undefined) G._freeItemPhase=snap.freeItemPhase;
  if(snap.freeItemUsed!==undefined) G._freeItemUsed=!!snap.freeItemUsed;
  if(snap.showGlobalPanels!==undefined) G._showGlobalPanels=!!snap.showGlobalPanels;
  if(snap.selectedBoardUnitIdx!==undefined) G._selectedBoardUnitIdx=snap.selectedBoardUnitIdx;
  if(snap.selectedBoardCardIdx!==undefined) G._selectedBoardCardIdx=snap.selectedBoardCardIdx;
  G.pendingBattleItems=_arenaCopy(snap.pendingBattleItems||[]);
  G.nextBattleItems=_arenaCopy(snap.nextBattleItems||[]);
  G.activeBattleItems=_arenaCopy(snap.activeBattleItems||[]);
  if(typeof goldFxSnap==='function') goldFxSnap();
  G.allies=[];
  G.enemies=[];
  G._partyBoardUnit=null;
  G._allyBattleStartSnapshot=null;
  G._rewardBattleStateRestored=false;
  G._battleCoreEvents=[];
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
}

function _arenaMarkChallenge(){
  G._arenaChallengeUsed=G._arenaChallengeUsed||{};
  G._arenaChallengeUsed[_arenaFacilityKey()]=true;
}

async function _arenaBeginChallenge(){
  if(!G._arenaEntrySnapshot) G._arenaEntrySnapshot=_arenaCaptureEntrySnapshot();
  _arenaMarkChallenge();
  G._arenaActive=true;
  G._arenaRound=1;
  G._arenaWins=0;
  G._arenaOutcomePending=false;
  G._waveBosses=G._waveBosses||{};
  // enemy.js が通常ボスの記録を持っていない古いランでも、ここで候補を確定する。
  if(typeof _arenaEnsureUsedBoss==='function'){
    _arenaEnsureUsedBoss(1);
    _arenaEnsureUsedBoss(2);
  }
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpointFacilityTalk(false,{arenaPaid:true});
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
}

async function _arenaLeaveEntry(){
  await fadeScreenSwitch(()=>{
    if(typeof _qClearPresentation==='function') void _qClearPresentation({immediate:true});
    _hideFacilityGreetingScene();
    if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('village');
    if(typeof renderVillageScreen==='function') renderVillageScreen();
  });
}

async function _runVillageArenaDialogue(talk){
  if(talk['台詞1']) await _qStartDialogue([talk['台詞1']],{screen:'village'});
  await _maybeStartArenaTutorial();
  const prompt=talk['台詞2'];
  if(!prompt){ await _arenaLeaveEntry(); return; }
  const choices=typeof _villageDialogueChoices==='function'
    ?_villageDialogueChoices(prompt.text):[];
  const chosen=await _qStartDialogue([{...prompt,choices}],{screen:'village'});
  if(!chosen||chosen.cancel){ await _arenaLeaveEntry(); return; }
  const entryCost=Number(chosen.price)>0?Number(chosen.price):ARENA_ENTRY_COST;
  if((Number(G.gold)||0)<entryCost){
    if(talk['ゴールド不足時台詞']) await _qStartDialogue([talk['ゴールド不足時台詞']],{screen:'village'});
    await _arenaLeaveEntry();
    return;
  }
  G.gold=Math.max(0,(Number(G.gold)||0)-entryCost);
  if(typeof updateHUD==='function') updateHUD();
  if(typeof playSfx==='function') playSfx('purchase',{group:'ui'});
  await _arenaBeginChallenge();
  if(talk['台詞3']) await _qStartDialogue([talk['台詞3']],{screen:'village'});
  await fadeScreenSwitch(async()=>{
    if(typeof _qClearPresentation==='function') void _qClearPresentation({immediate:true});
    _hideFacilityGreetingScene();
    _arenaStartBattle();
  });
}

function _arenaStartBattle(){
  if(!arenaIsActive()) return;
  const round=Math.max(1,Math.min(ARENA_ROUND_COUNT,Number(G._arenaRound)||1));
  const kind=typeof arenaRoundKind==='function'?arenaRoundKind(round):(round===ARENA_ROUND_COUNT?'boss':'elite');
  const floor=typeof _arenaRoundStatFloor==='function'
    ?_arenaRoundStatFloor(round)
    :Math.max(1,(round-1)*6+2);
  G._waveVillage=false;
  G._isWaveAltar=false;
  G._isShop=false;G._isForge=false;G._isTavern=false;G._isItemShop=false;
  G._isVillageMenu=false;G._isRingExchange=false;G._facilityLabel='';
  G._facilityCacheKey=null;
  G._villageBgmActive=false;
  G._waveBattleType='arena';
  G._waveBattleWon=null;
  G._waveWithdraw=false;
  G._waveIsRetry=false;
  G._extraBattleMult=kind==='boss'?2:1.5;
  G._battleBossMult=G._extraBattleMult;
  G._mapBattle={mapIndex:Math.max(1,Number(G._wave)||1),nodeId:'arena',type:'arena',floor,forcedBoss:false,turn:0};
  G.floor=floor;
  G.phase='battle';
  _arenaHideDebugButtons();
  if(typeof warmBgm==='function') warmBgm('battle2');
  const host=document.getElementById('scr-battle');
  if(host&&round===1){
    host.classList.remove('battle-bg-normal','battle-bg-reveal','battle-bg-scroll-ready','battle-bg-scrolling');
    host.classList.add('battle-bg-reveal');
  }
  if(round===1&&typeof prepareBattleIntroFocus==='function') prepareBattleIntroFocus(kind);
  document.body.classList.remove('world-map-active','village-screen-active');
  if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('battle');
  if(typeof showScreen==='function') showScreen('battle');
  if(typeof _syncStageAmbience==='function') _syncStageAmbience();
  if(typeof startBattle==='function') void startBattle();
}

// 支払い直後の街チェックポイントからの再開。会話は保存せず、支払い済みなら
// そのまま第1戦を始める（戦闘中チェックポイントは通常のSaveRun.replayへ渡す）。
async function arenaResumeFromCheckpoint(){
  if(!arenaIsActive()) return false;
  G._waveVillage=false;
  _arenaStartBattle();
  return true;
}

function _arenaConfirmText(key,fallback){
  return typeof textMessage==='function'?textMessage(key,fallback):fallback;
}

function _arenaShowContinueConfirm(round){
  const reward=arenaPrizeForWins(round);
  _arenaHideDebugButtons();
  const root=typeof _ensureGameConfirm==='function'
    ?_ensureGameConfirm()
    :document.getElementById('game-confirm-root');
  if(root){
    root.style.opacity='0';
    root.style.transition='opacity .36s ease';
  }
  const show=typeof showGameConfirm==='function';
  if(!show){
    G._arenaOutcomePending=false;
    void _arenaContinue(round);
    return;
  }
  showGameConfirm({
    title:_arenaConfirmText('「闘技場継戦確認」見出し','闘技場'),
    message:_arenaConfirmText('闘技場継戦確認','次の戦闘へ進みますか？（賞金：XG）').replace(/X/g,String(reward)),
    okLabel:_arenaConfirmText('「続ける」ボタン','続ける'),
    cancelLabel:_arenaConfirmText('「やめる」ボタン','やめる'),
    okTone:'blue',allowOptions:true,
    onOk:()=>{
      if(root){ root.style.opacity='';root.style.transition=''; }
      G._arenaOutcomePending=false;
      void _arenaContinue(round);
    },
    onCancel:()=>{
      if(root){ root.style.opacity='';root.style.transition=''; }
      G._arenaOutcomePending=false;
      void _arenaFinish('win',round);
    },
  });
  if(root) requestAnimationFrame(()=>requestAnimationFrame(()=>{ root.style.opacity='1'; }));
}

async function _arenaContinue(round){
  if(!arenaIsActive()) return;
  G._arenaRound=Math.min(ARENA_ROUND_COUNT,Math.max(1,Number(round)||1)+1);
  G._arenaWins=Math.max(0,Number(round)||0);
  G._battleVictoryPending=false;
  G._battleDefeatHandled=false;
  // 画面は暗くしない。味方はそのまま、敵の場に次の敵が出てくる（2026-09-26 利用者指定）。
  document.body.classList.remove('battle-victory-pending','battle-turn-active');
  _arenaStartBattle();
}

async function arenaHandleBattleVictory(){
  if(!arenaIsActive()||G._arenaOutcomePending) return;
  G._arenaOutcomePending=true;
  const round=Math.max(1,Math.min(ARENA_ROUND_COUNT,Number(G._arenaRound)||1));
  G._arenaWins=round;
  // 通常の勝利演出（showVictoryOverlay）と同じく、デバッグ用のボタンは隠す（継戦確認の後ろに出ていた）。
  _arenaHideDebugButtons();
  if(typeof _waitForPendingVfx==='function') await _waitForPendingVfx();
  if(!arenaIsActive()) return;
  if(round<ARENA_ROUND_COUNT){
    if(typeof playSfx==='function') playSfx('cheers1',{group:'ui',guardMs:0});
    _arenaShowContinueConfirm(round);
    return;
  }
  G._bossJustDefeated=true;
  if(typeof playSfx==='function') playSfx('cheers2',{group:'ui',guardMs:0});
  if(typeof showVictoryOverlay==='function'){
    showVictoryOverlay(()=>{
      // continueAfterBattleVictory() の共通暗転を _arenaFinish() の
      // fadeScreenSwitch() へ引き渡し、村へ切り替わるまで黒を維持する。
      G._battleFadeHeldByCaller=true;
      G._arenaOutcomePending=false;
      void _arenaFinish('win',ARENA_ROUND_COUNT);
    });
  }else{
    G._arenaOutcomePending=false;
    void _arenaFinish('win',ARENA_ROUND_COUNT);
  }
}

async function arenaHandleBattleDefeat(){
  if(!arenaIsActive()||G._arenaOutcomePending) return;
  G._arenaOutcomePending=true;
  G._battleDefeatHandled=true;
  G._battleVictoryPending=true;
  G._battlePhaseRunning=false;
  _arenaHideDebugButtons();
  G.phase='reward';
  document.body.classList.remove('battle-turn-active');
  document.body.classList.add('battle-victory-pending');
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
  if(typeof _waitForPendingVfx==='function') await _waitForPendingVfx();
  const wins=Math.max(0,Number(G._arenaWins)||0);
  const finish=()=>{
    // 共通の「進む」暗転を、村へ戻す _arenaFinish() まで保持する。
    G._battleFadeHeldByCaller=true;
    G._arenaOutcomePending=false;
    void _arenaFinish('lose',wins);
  };
  if(typeof showBattleCutin==='function'){
    const overlay=await showBattleCutin('defeat',{
      resultKey:'闘技場戦闘結果「敗北」',
      // 闘技場の敗北はランのライフを失わないため、ハート消失演出は出さない。
      skipLifeFx:true
    });
    if(typeof _armBattleContinue==='function'){
      _armBattleContinue(overlay,finish);
      return;
    }
  }
  finish();
}

function _arenaPrepareReception(){
  _arenaRestoreEntrySnapshot();
  G._arenaActive=false;
  G._waveVillage=true;
  G._waveBattleType=null;
  G._mapBattle=null;
  G._waveWithdraw=false;
  G._isWaveAltar=false;
  G._isShop=false;G._isForge=false;G._isTavern=false;G._isItemShop=false;
  G._isRingExchange=false;G._isVillageMenu=true;
  G._villageBgmActive=false;
  if(typeof _isBossFight!=='undefined') _isBossFight=false;
  const fac={key:'arena',name:'闘技場'};
  G._facilityGreetingKey=fac.key;
  if(typeof _showFacilityGreetingScene==='function') _showFacilityGreetingScene(fac);
  if(typeof showScreen==='function') showScreen('village');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
}

async function _arenaFinish(result,wins){
  if(_arenaFinishBusy) return;
  _arenaFinishBusy=true;
  const talk=_facilityGreetingEntry({name:'闘技場'})||{};
  const finishedWins=Math.max(0,Math.min(ARENA_ROUND_COUNT,Number(wins)||0));
  const prize=result==='win'?arenaPrizeForWins(finishedWins):0;
  const allWon=result==='win'&&finishedWins===ARENA_ROUND_COUNT;
  if(typeof stopBgm==='function') stopBgm(600);
  await fadeScreenSwitch(()=>{
    if(typeof _qClearPresentation==='function') void _qClearPresentation({immediate:true});
    _arenaPrepareReception();
    // showScreen('village') が戦闘用フェードを除去した後で、共通進行側へ
    // 「呼び出し側が暗転を保持中」の印を返す。
    G._battleFadeHeldByCaller=false;
  });
  // 闘技場後の魔導店会話が結果を1回だけ選べるよう、賞金額と全勝を街へ戻った時点で保存する。
  G._arenaResults=G._arenaResults||{};
  G._arenaResults[_arenaFacilityKey()]={wins:finishedWins,prize,allWon};
  G._arenaEntrySnapshot=null;
  if(typeof showTavernPortrait==='function') await showTavernPortrait('MC001',{screen:'village'});
  if(result==='win'){
    if(prize&&typeof gainEventGold==='function') gainEventGold(prize);
    if(typeof updateHUD==='function') updateHUD();
  }
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  if(result==='win'){
    const resultLine=allWon?talk['特殊台詞1']:talk['台詞4'];
    if(resultLine) await _qStartDialogue([resultLine],{screen:'village'});
  }else if(talk['台詞5']){
    await _qStartDialogue([talk['台詞5']],{screen:'village'});
  }
  await fadeScreenSwitch(async()=>{
    if(typeof _qClearPresentation==='function') void _qClearPresentation({immediate:true});
    _hideFacilityGreetingScene();
    // 戦闘の終わりに付いた勝利待ちの印を残さない（街の画面へ持ち越さない）。
    document.body.classList.remove('battle-victory-pending','battle-turn-active');
    G._arenaOutcomePending=false;
    G._arenaActive=false;
    G._waveVillage=true;
    G.phase='reward';
    if(typeof openMapVillage==='function') openMapVillage();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
      const saved=SaveRun.checkpoint('town');
      if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
    }
  });
  _arenaFinishBusy=false;
}
