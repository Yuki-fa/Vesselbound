// battle_debug.js — 演出確認用の試験戦闘（デバッグモード専用の「試験戦闘」ボタン）
// 2026-10-25 リファクタリング：battle.js の末尾から節ごと移した（処理は変えていない）。battle.js の直後に読み込む。

// ── 演出確認用の試験戦闘（デバッグモード専用）────────────────
// ステージ20の敵構成を使い、キャラクターの効果・演出を試せるようにする。
// 2026-10-12 利用者報告: 店・イベントの立ち絵を試験戦闘中だけ退避し、同じDOMを戻す。
// DOM参照はGやセーブに含めない。表情・位置・店の人の印もそのまま保持する。
let _testBattlePortraitSnapshot=null;
function _suspendTestBattlePortraits(){
  const host=document.getElementById('tavern-presentation-layer');
  _testBattlePortraitSnapshot=host?{host,parent:host.parentNode,next:host.nextSibling,screen:host.closest('.screen')}:null;
  if(host) host.remove();
}
function _restoreTestBattlePortraits(){
  const saved=_testBattlePortraitSnapshot;
  _testBattlePortraitSnapshot=null;
  if(!saved||!saved.parent) return;
  // 行商人などは編成の再描画で新しい層が出来るので、退避した姿を唯一の表示に戻す。
  const current=document.getElementById('tavern-presentation-layer');
  if(current&&current!==saved.host) current.remove();
  saved.parent.insertBefore(saved.host,saved.next&&saved.next.parentNode===saved.parent?saved.next:null);
  // 酒場・campは街画面に立ち絵がある。試験戦闘で切り替えた画面も戻して、復帰後に実際に見せる。
  if(saved.screen&&!saved.screen.classList.contains('active')&&typeof showScreen==='function'){
    const screenId=String(saved.screen.id||'').replace(/^scr-/,'');
    showScreen(screenId);
    if(screenId==='village'&&typeof renderVillageScreen==='function') renderVillageScreen();
  }
}
function startTestBattle(){
  if(!G||G.phase!=='reward') return;
  // 図書館の「試験戦闘」は通常プレイの機能なので、デバッグモードでなくても開始できる。
  // デバッグ用の試験戦闘ボタン（#btn-test-battle）はデバッグモード中しか表示されない。
  if(!G._debugMode&&!G._isLibrary) return;
  if(G._testBattleMode) return;
  _suspendTestBattlePortraits();
  G._testBattleMode=true;
  G._testBattleSavedGameSummonBuff={...G.gameSummonBuff};
  G._testBattleExitPending=false;
  // 前回の試験戦闘が中断で終わっていた場合の保険（残っていると次が進まない）。
  G._battlePhaseRunning=false;
  if(typeof _resetManaEffectRun==='function') _resetManaEffectRun();
  G._libraryTestBattleMode=!!G._isLibrary;
  if(G._libraryTestBattleMode){
    G._libraryLoanCardsState=typeof clone==='function'?clone(_rewCards||[]):(_rewCards||[]).slice();
    document.body.classList.remove('library-formation-active');
    if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
  }else{
    // 施設／報酬画面からの試験戦闘では、戦闘終了時に onBattleEnd() が報酬カードを
    // 入れ替えるため、開始時の画面と品揃えをまとめて退避しておく。施設フラグを
    // 残したまま goToReward() へ進むと、試験戦闘の報酬が商品として描画される。
    const copy=typeof clone==='function'?clone:(v=>v);
    G._testBattleReturnState={
      flags:{
        isShop:!!G._isShop, isItemShop:!!G._isItemShop, isForge:!!G._isForge, isPeddler:!!G._isPeddler,
        isTavern:!!G._isTavern, isVillageMenu:!!G._isVillageMenu,
        isRingExchange:!!G._isRingExchange, isWaveAltar:!!G._isWaveAltar,
        isLibrary:!!G._isLibrary, isLibraryMenu:!!G._isLibraryMenu,
        facilityLabel:G._facilityLabel, facilityCacheKey:G._facilityCacheKey,
        mapReturnAfterReward:!!G._mapReturnAfterReward, isRewardTown:!!G._isRewardTown,
        freeRewardPanelMode:!!G._freeRewardPanelMode, rewardOnePickMode:!!G._rewardOnePickMode,
        freeItemPhase:G._freeItemPhase, freeItemUsed:!!G._freeItemUsed,
        isBossRewardCycle:!!G._isBossRewardCycle,
        questCampScene:!!G._questCampScene, questNoBgm:!!G._questNoBgm
      },
      rewCards:copy(_rewCards||[]),
      rewFreePickDone:!!_rewFreePickDone,
      mapForgeOffers:copy(G._mapForgeOffers||[]),
      mapPanelPowers:copy(G.mapPanelPowers||{}),
      ringOffer:copy(G._ringOffer||[]),
      ringOfferUnlocked:!!G._ringOfferUnlocked,
      ringOfferResolved:!!G._ringOfferResolved,
      ringOfferPhase:!!G._ringOfferPhase,
      boardDiscardCount:G._boardDiscardCount||0,
      rewardStartSnapshot:G._rewardStartSnapshot?copy(G._rewardStartSnapshot):null,
      spellSlots:copy(G.spellSlots||[]),
      gold:G.gold,
      mana:G.mana,
      life:G.life,
      waveLife:G._waveLife,
      blood:G._blood,
      enemyBlood:G._enemyBlood
    };
  }
  G._testBattleAbort=false;
  G._testBattleSavedFloor=G.floor;
  document.body.classList.add('test-battle-active');
  // 図書館の試験戦闘は勝敗が付くまで行うため「戦闘終了」ボタンを出さない。
  // ボタンの表示はCSS（body.test-battle-active）が担うので、専用クラスで打ち消す。
  document.body.classList.toggle('library-test-battle-active',!!G._libraryTestBattleMode);
  G.floor=19; // ステージ20（0-indexed）
  showScreen('battle');
  startBattle();
}

// 「戦闘終了」クリック時：進行中の戦闘ループに中断を通知するだけに留める。
// 実際の画面遷移はbattlePhase()のループを安全に抜けた後（_exitTestBattle）で行う。
function stopTestBattle(){
  if(!G._testBattleMode) return;
  G._testBattleAbort=true;
  // 押した瞬間に音を止める。効果のSEは長いものがあり、戦闘ループが
  // 安全に抜けるまで鳴り続けると「終了したのに音だけ続く」状態になる。
  if(typeof _resetManaEffectRun==='function') _resetManaEffectRun();
  if(typeof stopAllSfx==='function') stopAllSfx();
  // 攻撃演出やVFXの待機中は戦闘ループが安全に抜けるのを待つ。
  // ここで画面を切り替えると、進行中の複製カード・死亡演出が編成画面へ残る。
  if(!G._battlePhaseRunning) void _exitTestBattle();
}

async function _exitTestBattle(){
  if(G._testBattleExitPending) return;
  if(!G._testBattleMode&&G.phase==='reward') return;
  G._testBattleExitPending=true;
  // **中断された戦闘の実行中フラグと、鳴りっぱなしのSE・VFXをここで必ず断つ。**
  // 戦闘ループは return で抜けるだけなので、ここを通さないと次の試験戦闘が
  // 「前の盤面のまま進まない」「前の効果のSEが鳴り続ける」状態になる。
  G._battlePhaseRunning=false;
  if(typeof _resetManaEffectRun==='function') _resetManaEffectRun();
  if(typeof stopAllSfx==='function') stopAllSfx();
  // 決着後の遷移が長くなりすぎたため、全演出の終了待ちは行わない。
  // 残っている演出は直後の _forceStopAllVfx() で打ち切る。
  const returnToLibrary=!!G._libraryTestBattleMode;
  // デバッグ試験戦闘でも、戦闘を終えた時点の終戦効果を実戦闘経路と同じく確定する。
  // **ここで失敗しても後始末は必ず続ける**（途中で抜けると _testBattleExitPending が
  // 立ったままになり、以後の終了処理が全て素通りする）。
  try{ await onBattleEnd(); }
  catch(err){ console.error('[testBattle onBattleEnd]',err); }
  G.gameSummonBuff=G._testBattleSavedGameSummonBuff||{atk:0,hp:0};
  delete G._testBattleSavedGameSummonBuff;
  G._testBattleMode=false;
  G._libraryTestBattleMode=false;
  G._testBattleAbort=false;
  if(G._testBattleSavedFloor!=null){ G.floor=G._testBattleSavedFloor; G._testBattleSavedFloor=null; }
  document.body.classList.remove('battle-turn-active');
  document.body.classList.remove('test-battle-active');
  document.body.classList.remove('library-test-battle-active');
  document.body.classList.remove('battle-opening-active','battle-start-units-collapsed','battle-start-units-revealing','battle-victory-pending','gameover-active','game-clear-active');
  clearBattleFocus();
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
  if(typeof _resetManaEffectRun==='function') _resetManaEffectRun();
  if(typeof hideAttackLine==='function') hideAttackLine();
  // 通常の戦闘終了時はonBattleEnd()がパネル召喚ユニット（＝現行仕様の全味方）をG.alliesから
  // 除去してから報酬/編成画面に戻るが、試験戦闘の中断はその経路を通らない。これを怠ると、
  // 次回の試験戦闘開始時にapplyNewPanelBattleStart()が現在の編成を「今回分」として追加召喚する際、
  // 前回分の残留ユニットと重複し、出撃から外したキャラが残ったり同じキャラが増殖したりする。
  // **盤面は空にする。** パネル召喚の印が付いた体だけを消していた頃は、
  // 戦闘中に召喚された体・変身した体が残り、次の戦闘で編成ぶんが改めて出撃して
  // **キャラクターが複製された**（試験戦闘を途中で終えて通常戦闘へ入った時）。
  // 次の戦闘は編成から作り直すので、ここで残す必要のある体は無い。
  if(Array.isArray(G.allies)) G.allies.length=0;
  if(Array.isArray(G.enemies)) G.enemies.length=0;
  // goToReward()はG.phaseが'player'/'enemy'の間は何もしないガードを持つため、
  // 戦闘フェイズの残留状態のまま呼んでも遷移しないよう先に外しておく。
  G.phase=null;
  // **戦闘フェイズの実行中フラグを必ず降ろす。** 試験戦闘を途中で終了すると
  // battlePhase() のループは `return` で抜けるだけなので、ここで降ろさないと
  // 立ったままになる。次に試験戦闘を始めても _advanceToBattlePhase() の
  // `if(G._battlePhaseRunning) return;` に弾かれ、
  // **前の盤面が出たまま何も進まない**（利用者報告の再現条件）。
  G._battlePhaseRunning=false;
  if(returnToLibrary&&typeof openMapLibraryFormation==='function'){
    openMapLibraryFormation();
    _restoreTestBattlePortraits();
    G._testBattleExitPending=false;
    return;
  }
  const returnState=G._testBattleReturnState;
  if(returnState){
    const copy=typeof clone==='function'?clone:(v=>v);
    const f=returnState.flags||{};
    G._isShop=!!f.isShop; G._isItemShop=!!f.isItemShop; G._isForge=!!f.isForge;
    G._isPeddler=!!f.isPeddler;
    G._isTavern=!!f.isTavern; G._isVillageMenu=!!f.isVillageMenu;
    G._isRingExchange=!!f.isRingExchange; G._isWaveAltar=!!f.isWaveAltar;
    G._isLibrary=!!f.isLibrary; G._isLibraryMenu=!!f.isLibraryMenu;
    G._facilityLabel=f.facilityLabel; G._facilityCacheKey=f.facilityCacheKey;
    G._mapReturnAfterReward=!!f.mapReturnAfterReward; G._isRewardTown=!!f.isRewardTown;
    G._freeRewardPanelMode=!!f.freeRewardPanelMode; G._rewardOnePickMode=!!f.rewardOnePickMode;
    G._freeItemPhase=f.freeItemPhase; G._freeItemUsed=!!f.freeItemUsed;
    G._isBossRewardCycle=!!f.isBossRewardCycle;
    G._questCampScene=!!f.questCampScene; G._questNoBgm=!!f.questNoBgm;
    _rewCards=copy(returnState.rewCards||[]);
    _rewFreePickDone=!!returnState.rewFreePickDone;
    G._mapForgeOffers=copy(returnState.mapForgeOffers||[]);
    G.mapPanelPowers=copy(returnState.mapPanelPowers||{});
    G._ringOffer=copy(returnState.ringOffer||[]);
    G._ringOfferUnlocked=!!returnState.ringOfferUnlocked;
    G._ringOfferResolved=!!returnState.ringOfferResolved;
    G._ringOfferPhase=!!returnState.ringOfferPhase;
    G._boardDiscardCount=returnState.boardDiscardCount||0;
    G._rewardStartSnapshot=copy(returnState.rewardStartSnapshot);
    G.spellSlots=copy(returnState.spellSlots||[]);
    G.gold=returnState.gold; G.mana=returnState.mana;
    G.life=returnState.life; G._waveLife=returnState.waveLife;
    G._blood=returnState.blood; G._enemyBlood=returnState.enemyBlood;
    G._testBattleReturnState=null;
    if(typeof goToReward==='function') goToReward({restoreCheckpoint:true});
  }else if(typeof goToReward==='function') goToReward();
  _restoreTestBattlePortraits();
  G._testBattleExitPending=false;
}

// showVictoryOverlay()はmain.jsで定義（スクリプト読み込み順の都合上こちらは重複のため削除済み）
