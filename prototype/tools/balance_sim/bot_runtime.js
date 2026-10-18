'use strict';

// 周回専用。既存 load/ai の単体検査を変更せず、必要な時だけ導入する。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {ROOT} = require('./load');
const {makeElement} = require('./stub');
const source = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// load.js が表示入口を無効にした後なので、この1関数だけ本体から復元する。
// 本体に追従できなくなった時は黙って代替せず失敗する。
function restoreFunction(rel, name) {
  const match = source(rel).match(new RegExp(`^(?:async )?function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^\\}`, 'm'));
  if (!match) throw new Error(`本体の入口を復元できない: ${rel}:${name}`);
  vm.runInThisContext(match[0], {filename: `bot_restore:${rel}:${name}`});
}

// loader 内に閉じた既存パーサーをそのまま使う。効果文の解析を検査側に複製しない。
function loaderParsers() {
  const text = source('js/data/loader.js');
  const from = text.indexOf('    const _normalizeColorText =');
  const to = text.indexOf('    const _syncPanelFromRow =', from);
  if (from < 0 || to < 0) throw new Error('loader の効果文パーサーの位置が変わった');
  return vm.runInThisContext(`(()=>{${text.slice(from, to)}\nreturn {character:_setPanelKeywordsFromDesc,enchant:_setEnchantFieldsFromDesc,merge:_buildMergedPanelForm};})()`);
}

const BYPASSES = [
  'load.js/stub.js の既存 DOM・タイマー・音声・保存無効化を継承。ブラウザ画面は作らない。',
  'goToReward は本体から復元。描画・SE・VFX・ムービー・立ち絵・チュートリアルは無処理。必要な固定IDだけ空DOMを供給。',
  '_finishNewPanelBattleStartEffects を置換。startBattle → applyNewPanelBattleStart → buildBoardFormation は本体のまま。開戦以降は本番セーブ経路の SaveRun.computeBattle → createBattleRunner → runBattleCore で一括計算。30手ハーネスは使わず本体上限を使用。',
  'コア結果のライフ・マナ・ゴールドは本体 _syncCore*ToG。永久能力・効果消耗は本体 persist ヘルパー。item_reward の所持枠挿入と bonus_reward のキュー接続だけ演出受け口の代用。終戦効果は再実行しない。',
  'showVictoryOverlay はコールバックを即時実行。gameOver は結果だけ記録。勝利・敗北・再戦・次マスは本体 finishWaveBattleVictory／_finishWaveBattleDefeat／_startWaveFlowNext。',
  '行商人は本体の判定・イベント・品揃えを使用し、会話を即時完了。クエストも会話のonLine/onDoneを実行して本体から受領・達成。初回ホーム・酒場は本体に報酬処理がないため配布を追加しない。',
  'SaveRun.begin 後に種・乱数状態・runId を固定。ラン抽選は本体 SaveRun.random／鍵付き乱数を使用。Math.random（uid・非ラン抽選）と Date.now も周回内で固定。所要時間は別メタデータ。SaveRun.enabled の公開入口は既存loadと同じくfalseで保存再生を開始しない。',
  '指輪の取得は _syncRewardProductionRings が登録する本物の drop ハンドラを空DOM上で実行。還魂の枚数・取得済み処理を複製しない。',
  '祝福の座は本体openTowerBoonSeat／towerBoonChoose／towerBoonRerollRewardsを使用。scr-village・戻るボタンの空DOMと、選択肢/再抽選ボタンの描画無処理だけを追加。ボス撃破の本体記録関数をコア結果へ呼ぶ。lookaheadの予測だけ固定比較と同じ表示フレーム省略computeを使い、実戦computeBattleは本体のまま。',
  '宿屋の会話選択は _qStartDialogue の受け口で支払可能な最大回復を選ぶ。支払・回復・利用済みは本体 _runVillageInnDialogue。',
];

const NOOPS = [
  'showScreen','renderAll','renderControls','updateHUD','renderRewCards','renderFieldEditor',
  'renderHandEditor','renderMoveSlotsInEnemy','renderRaceBuffSummary','renderMapForgeOffers',
  'refreshRewardGoldUi','renderVillageScreen','_syncRewardProductionUi','_updateLaneOffset',
  '_syncItemUsePickingUi','_syncRewardPanelPlacementOverlay','_flashConnectedBoardCards',
  '_playTripleMergeAnimation','_beginTripleMergeHidden','_clearTripleMergeHidden',
  '_finishRewardReveal','_playRewardReveal','_storeRewardStartSnapshot',
  'playSfx','playBgm','stopBgm','stopEveryBgmLayer','warmBgm','unlockSfx',
  '_syncStageAmbience','_applyFacilityBackground','_applyFacilityAmbience','_clearShopPortrait',
  '_warmBattleHitSfx','_hideRewardUiForBattle','_settleBattleOpeningLayout',
  'actionBannerSetBattleData','_queueRingManaThresholdEffects','_showFacilityPortraitPair',
  '_qShowPortraitPair','_qRemoveDialogue','_qShowNamePlate','_qHideNamePlate','_qEnsureStyle',
  '_qCustomizeTavernVillage','_qShowTavernResponsePortraits','_qMovePresentationHost',
  'defeatPeddlerApplySaleScene','applyScreenAssetBackground','_setOverrideBackground',
  'markCardAcquired','markCardSeen',
  'renderTowerBoonChoices','towerBoonSyncRerollButton',
];

function install() {
  const arrival={tower:maybeStartQ009TowerArrival,town:maybeStartQuestTownArrival,resume:questResumePendingEvent};
  restoreFunction('js/engine/reward.js', 'goToReward');
  for (const name of NOOPS) {
    if (typeof globalThis[name] === 'function') globalThis[name] = () => {};
  }
  const fixedIds = new Map(['ally-section','reward-info-bar','reward-cards-section','btn-pass','scr-village','village-depart-btn']
    .map(id => [id, makeElement()]));
  fixedIds.get('village-depart-btn').querySelector=()=>makeElement('span');
  document.getElementById = id => fixedIds.get(id) || null;
  globalThis.Image=function(){return {...makeElement('img'),decode:async()=>{}};};
  _playVillageEnterIntro = async build => { build(); return true; };
  _prepareStoryArrival = () => null;
  _runStoryArrival = async () => null;
  _qClearPresentation = async () => {};
  playBattlePlayerDefeatLines = async () => {};
  _playMapForgeSlotRoll = async () => {};
  _flushRingManaThresholdEffects = async () => {};
  restoreFunction('js/engine/peddler.js','defeatPeddlerPending');
  showVictoryOverlay = callback => { if (callback) return callback(); };
  gameOver = options => { G._botEnded = {clear:!!options?.clear, firstRunClear:!!options?.firstRunClear,questLoss:!!options?.questLoss}; };
  // 演出のPromiseが後のランへ残らないよう、到着イベントも省略する。
  maybeStartQ009TowerArrival = () => false;
  maybeStartQuestTownArrival = () => false;
  questResumePendingEvent = () => false;

  const api = {pending:null, battle:null, seed:1, cycle:1, hooks:{},jobs:[],arrival};
  api.track=promise=>{const job=Promise.resolve(promise);api.jobs.push(job);return job;};
  api.drain=async()=>{for(let i=0;api.jobs.length&&i<50;i++){const jobs=api.jobs.splice(0);await Promise.all(jobs);}if(api.jobs.length)throw new Error('会話の後処理が収束しない');};
  api.resetRun=()=>{api.jobs=[];_qFormationContext=null;_qTownSession=false;_qTowerSession=false;_qDestroySession=null;_qPendingEventSession=false;};
  const pendingEvent=_qRunPendingEvent;
  _qRunPendingEvent=(...args)=>api.track(pendingEvent(...args));
  fadeScreenSwitch=action=>api.track(Promise.resolve().then(action));
  _qEventFormationSwitch=action=>api.track(Promise.resolve().then(action));
  _qStartDialogue=(lines,options={})=>api.track((async()=>{
    for(let index=0;index<lines.length;index++)if(options.onLine)await options.onLine(index);
    const choices=lines.flatMap(line=>line.choices||[]);
    const chosen=choices.find(c=>/受ける|受領/.test(c.text||''))||choices.filter(c=>!c.cancel&&c.price<=G.gold)
      .sort((a,b)=>b.life-a.life||a.price-b.price)[0]||choices.find(c=>c.cancel)||choices[0];
    if(options.onDone)await options.onDone();return chosen;
  })());
  const peddler=runDefeatPeddlerEvent;
  runDefeatPeddlerEvent=()=>api.track(peddler());
  const begin = SaveRun.begin;
  SaveRun.begin = () => {
    begin();
    G._runSeed=api.seed; G._runRngState=api.seed; G._runId=`bot-${api.seed}`;
  };
  SaveProfile.hasClearedRun = () => api.cycle === 2;
  const layout = _layoutStartingBattleEnemies;
  _layoutStartingBattleEnemies = (...args) => {
    layout(...args);
    if(!G._botProbe)api.hooks.enemies?.(G.enemies);
  };
  const giveItem = _grantWaveEliteItem;
  _grantWaveEliteItem = () => {
    const before = new Set(_ensureItemSlots().filter(Boolean));
    giveItem();
    _ensureItemSlots().filter(c => c && !before.has(c)).forEach(c => api.hooks.grant?.(c,'elite'));
  };
  const originalStart = startBattle;
  startBattle = () => {
    const pending = originalStart();
    api.pending = pending;
    return pending;
  };

  _finishNewPanelBattleStartEffects = async () => {
    const state = _createPveCoreState();
    _stampCoreSideSlots(state);
    const seed = Math.floor(runRandom()*4294967296);
    const result = SaveRun.computeBattle(state, seed);
    api.battle = result;
    // 保存経路が持つ最終stateを採用。setupから省略された表示用カードだけ戻す。
    const setupUnits = new Map([...state.units.p1,...state.units.p2].filter(Boolean).map(u=>[u.id,u]));
    for (const side of ['p1','p2']) {
      for (const unit of result.finalState.units[side]) {
        if (unit && !unit.boardCards && setupUnits.has(unit.id)) unit.boardCards=setupUnits.get(unit.id).boardCards;
      }
    }
    G.allies = result.finalState.units.p1;
    G.enemies = result.finalState.units.p2;
    G._battleCoreEvents = result.events;
    _syncCoreResourcesToG(result.finalState);
    _syncCoreLifeToG(result.finalState);
    _syncCoreManaToG(result.finalState);
    _syncCoreBloodToG(result.finalState);
    const board = _getPartyBoardUnit();
    for (const ev of result.events) {
      if (ev.type==='stat_change' && ev.persistent && ev.side==='p1') _persistPermanentStatOrWarn(board,ev);
      if (ev.type==='keyword_effect' && ev.effect==='effect_value') _persistPermanentEffectDamageOrWarn(board,ev);
      if (ev.type==='bonus_reward' && ev.side==='p1' && ev.unit) _queueBonusRewardPanel(ev.unit);
      if (ev.type==='item_reward' && ev.side==='p1' && ev.item) {
        const slots=_ensureItemSlots(), index=slots.findIndex(c=>!c);
        if (index>=0) { slots[index]=clone(ev.item); api.hooks.grant?.(slots[index],'effect'); }
      }
    }
    G.turn=result.finalState.turn;
    G._battleEndEffectsApplied=true; G._coreBattleEndTriggered=true;
    G._battleDraw=result.outcome==='draw';
    // startBattle の残りは表示の後始末だけにする。進行は呼び出し側が結果を受けて行う。
    G.phase='reward'; G._battlePhaseRunning=false;
  };

  api.takeRing = (offerIndex,replaceIndex) => {
    if(G.rings.every(Boolean)&&Number.isInteger(replaceIndex)) {
      const open=_openRewardActionTooltip;
      try {
        _openRewardActionTooltip=(_anchor,_title,_desc,actions)=>{const discard=actions[1];if(!discard.disabled)discard.onClick();};
        _openRingActionConfirm(replaceIndex,makeElement());
      } finally {_openRewardActionTooltip=open;}
    }
    const query = document.querySelectorAll;
    const slots = Array.from({length:4},()=>{
      const el=makeElement('i'); el.listeners={};
      el.addEventListener=(type,fn)=>{el.listeners[type]=fn;};
      return el;
    });
    document.querySelectorAll = selector => selector==='.reward-prod-ring .reward-prod-slots i'?slots:[];
    try {
      _syncRewardProductionRings();
      const index=G.rings.findIndex(r=>!r);
      if (index<0) return false;
      _dragSrc={arr:'ringOffer',idx:offerIndex};
      slots[index].listeners.drop({preventDefault(){},stopPropagation(){}});
      return !!G.rings[index];
    } finally { document.querySelectorAll=query; _dragSrc=null; }
  };
  api.parsers=loaderParsers();
  return api;
}

module.exports={install,source,loaderParsers,BYPASSES,NOOPS};
