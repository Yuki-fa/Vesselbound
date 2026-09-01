'use strict';

// 旧オフライン実装（Git基準版）と、現在の共通コア／オンライン再生経路の
// 「イベント列」と「演出接続」を比較する静的＋動的回帰検証。
// カード個別の期待値ではなく、召喚・攻撃・ダメージ・死亡の順序と待機を監査する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const core = require('../../js/battle/core');
const {createSeededRng} = require('../../js/online/protocol');

const ROOT = path.resolve(__dirname, '../..');
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function oldRead(rel) {
  return cp.execFileSync('git', ['show', `HEAD:prototype/${rel}`], {
    cwd: path.resolve(ROOT, '..'), encoding: 'utf8'
  });
}
function count(text, re) { return (text.match(re) || []).length; }

function runSummonScenario() {
  const state = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'lich', name: 'リッチ', atk: 7, hp: 3, maxHp: 3, color: '青',
        desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
      {id: 'wolf-maker', name: 'ダイアウルフ', atk: 3, hp: 3, maxHp: 3, color: '緑',
        desc: '攻撃：「緑ウルフ」を召喚する。'},
    ]}, p2: {units: []}},
    summonDefs: [{name: '緑ウルフ', power: 1, life: 2, color: '緑'},
      {name: 'シャドウ', power: 1, life: 1, color: '青'}],
  });
  const events = [];
  core.coreApplyAttackEffects(state.units.p1[1], state, createSeededRng(1),
    event => events.push({...event, t: events.length}), () => ({amount: 0, died: false}));
  core.coreFlushPendingLichSummons(state, event => events.push({...event, t: events.length}));
  return events;
}

function runBatchedLichScenario() {
  const state = core.createBattleState({
    sides: {p1: {units: [
      {id: 'lich', name: 'リッチ', atk: 7, hp: 3, maxHp: 3, color: '青',
        desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
      {id: 'miteera', name: 'ミテーラ', atk: 4, hp: 3, maxHp: 3, color: '緑',
        desc: '開戦：「緑ペリカン」を3体召喚する。'},
    ]}, p2: {units: []}},
    summonDefs: [{name: '緑ペリカン', power: 1, life: 1, color: '緑'},
      {name: '青シャドウ', power: 1, life: 1, color: '青'}],
  });
  const events = [];
  const emit = event => events.push(event);
  state._deferLichSummons = true;
  core.coreApplyOpeningEffects(state.units.p1[1], state, createSeededRng(4), emit, () => ({amount: 0, died: false}));
  core.coreFlushPendingLichSummons(state, emit);
  const summons = events.filter(e => e.type === 'summon').map(e => e.unit.name);
  // 召喚は前衛の右端にだけ出る。前衛（7枠）が埋まった時点で以降は成立しない。
  // ミテーラ＋リッチ＋ペリカン3体＝5体、そこへシャドウが2体入って7体で満杯になり、
  // 3体目のシャドウは召喚されない（後衛へは逃がさない）。
  assert.deepEqual(summons, ['ペリカン', 'ペリカン', 'ペリカン', 'シャドウ', 'シャドウ'],
    '複数召喚時のリッチ誘発が本体列の後ろにまとまっていない、または前衛の上限を超えている');
}

function runCrossStateSummonIdScenario() {
  // PvEの各トリガは薄いコアstateを作り直すため、同じ盤面配列を引き継いだ
  // 新stateから同じ召喚元を2回処理してもIDが衝突しないことを確認する。
  const state = core.createBattleState({
    sides: {p1: {units: [{id: 'ketsie', name: 'ケットシー', atk: 3, hp: 4, maxHp: 4,
      desc: '負傷：黄ナイトキャットを召喚する。'}]}, p2: {units: []}},
    summonDefs: [{name: '黄ナイトキャット', power: 2, life: 3, color: '黄'}],
  });
  const events = [];
  const emit = event => events.push(event);
  const hit = () => ({amount: 0, died: false});
  core.coreApplyInjuryEffects(state.units.p1[0], 1, state, createSeededRng(51), emit, hit);
  const nextState = {...state, units: state.units};
  core.coreApplyInjuryEffects(state.units.p1[0], 1, nextState, createSeededRng(52), emit, hit);
  const summons = events.filter(e => e.type === 'summon');
  assert.equal(summons.length, 2, 'state再生成後のケットシー召喚が2回成立していない');
  assert.notEqual(summons[0].unit.id, summons[1].unit.id, 'state再生成で召喚IDが衝突している');
}

function runDeferredManaScenario() {
  const state = core.createBattleState({
    resources: {p1: {mana: 2, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'mana-test', name: '試験', atk: 1, hp: 1, maxHp: 1,
      manaCost: 2, manaThresholdDesc: '+2/+2を得る'}]}, p2: {units: []}},
  });
  state.deferManaThresholdEffects = true;
  const events = [];
  core.coreApplyManaThresholdEffects(state, core.coreMathRng, e => events.push(e), () => ({amount: 0, died: false}));
  const threshold = events.find(e => e.type === 'mana_threshold');
  assert.ok(threshold && threshold.deferredAfter, 'マナ閾値の遅延スナップショットがない');
  assert.equal(state.units.p1[0].atk, 1, 'VFX開始前にマナ効果のATKが反映されている');
  core.coreRestoreDeferredState(state, threshold.deferredAfter);
  assert.equal(state.units.p1[0].atk, 3, 'マナVFX開始時の状態復元に失敗');
}

function runManaSummonLichScenario() {
  const state = core.createBattleState({
    resources: {p1: {mana: 3, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'lich-mana', name: 'リッチ', atk: 7, hp: 3, maxHp: 3, color: '青',
        desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
      {id: 'dire-wolf-mana', name: 'ダイアウルフ', atk: 3, hp: 3, maxHp: 3, color: '緑',
        manaCost: 3, manaThresholdDesc: '「緑ウルフ」を召喚する。'},
    ]}, p2: {units: []}},
    summonDefs: [{name: '緑ウルフ', power: 1, life: 2, color: '緑'},
      {name: '青シャドウ', power: 1, life: 1, color: '青'}],
  });
  state.deferManaThresholdEffects = false;
  state._deferLichSummons = true;
  const events = [];
  core.coreApplyManaThresholdEffects(state, createSeededRng(41), e => events.push(e),
    () => ({amount: 0, died: false}));
  core.coreFlushPendingLichSummons(state, e => events.push(e));
  assert.deepEqual(events.filter(e => e.type === 'summon').map(e => e.unit.name),
    ['ウルフ', 'シャドウ'],
    'マナ閾値召喚の直後にリッチ誘発が続いていない');

  // runBattleCore の開戦経路でも、既に閾値へ到達している場合を確認する。
  const openingEvents = [];
  const openingState = core.createBattleState({
    resources: {p1: {mana: 3, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [
      {id: 'opening-lich', name: 'リッチ', atk: 7, hp: 3, maxHp: 3, color: '青',
        desc: '常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
      {id: 'opening-wolf', name: 'ダイアウルフ', atk: 3, hp: 3, maxHp: 3, color: '緑',
        manaCost: 3, manaThresholdDesc: '「緑ウルフ」を召喚する。'},
    ]}, p2: {units: []}},
    summonDefs: [{name: '緑ウルフ', power: 1, life: 2, color: '緑'},
      {name: '青シャドウ', power: 1, life: 1, color: '青'}],
  });
  core.runBattleCore(openingState, createSeededRng(42), {turnLimit: 1,
    onEvent: event => openingEvents.push(event)});
  assert.deepEqual(openingEvents.filter(e => e.type === 'summon').map(e => e.unit.name),
    ['ウルフ', 'シャドウ'],
    '開戦マナ閾値召喚のリッチ誘発が次のトリガへ遅延している');
}

function runPersistentDeathObserverScenario() {
  const state = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {
      p1: {units: [{id: 'eidolon', name: 'エイドロン', atk: 1, hp: 5, maxHp: 5},
        {id: 'hellhound', name: 'ヘルハウンド', atk: 1, hp: 5, maxHp: 5,
          desc: '敵が死亡するたび、このキャラクターは+X/+Xを得る。Xは死亡した敵の数に等しい。'},
        {id: 'ally-a', name: '味方A', atk: 1, hp: 1, maxHp: 1},
        {id: 'ally-b', name: '味方B', atk: 1, hp: 1, maxHp: 1},
        {id: 'ally-c', name: '味方C', atk: 1, hp: 1, maxHp: 1}]},
      p2: {units: [{id: 'enemy-a', name: '敵A', atk: 1, hp: 1, maxHp: 1},
        {id: 'enemy-b', name: '敵B', atk: 1, hp: 1, maxHp: 1}]},
    },
  });
  const events = [];
  const emit = event => events.push(event);
  const hit = () => ({amount: 0, died: false});
  for (const dead of state.units.p1.slice(2)) {
    dead.hp = 0;
    core.coreApplyDeathObservers(dead, state, createSeededRng(21), emit, hit);
  }
  assert.equal(state.resources.p1.mana, 1, 'エイドロンの3体死亡カウンタが状態をまたいでいない');
  assert.equal(events.filter(e => e.type === 'mana_gain' && e.reason === 'eidolon').length, 1,
    'エイドロンのマナ効果がちょうど1回発動していない');

  for (const dead of state.units.p2) {
    dead.hp = 0;
    // 実戦アダプタではこの値をGから毎回引き継ぐ。
    state._enemyDeaths = state._enemyDeaths || 0;
    core.coreApplyDeathObservers(dead, state, createSeededRng(22), emit, hit);
  }
  assert.equal(state.units.p1[1].atk, 4, 'ヘルハウンドが敵死亡回数（1+2）で強化されていない');
}

function runSuccubusCaptureScenario() {
  const state = core.createBattleState({
    sides: {
      p1: {units: [{id: 'succubus', name: 'サキュバス', atk: 6, hp: 3, maxHp: 3}]},
      p2: {units: [{id: 'victim', name: '敵キャラ', atk: 4, hp: 0, maxHp: 7}]},
    },
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
  });
  const victim = state.units.p2[0];
  victim._lastDamageSource = state.units.p1[0];
  victim._lastDamageWasCounter = false;
  // 実戦の接触命中を再現する（反撃・効果ダメージでは捕獲しないことも別途検証する）。
  state.units.p1[0]._coreAttackContact = true;
  const events = [];
  core.coreApplyDeathEffects(victim, state, createSeededRng(31), e => events.push(e),
    (source, target, amount, counter) => core.coreResolveHit(state, source, target, amount, counter, createSeededRng(31), e => events.push(e)));
  const summon = events.find(e => e.type === 'summon');
  assert.ok(summon, 'サキュバスの撃破時召喚が発生していない');
  assert.equal(summon.unit._useEnemyVisualFrame, true, 'サキュバスの仲間化ユニットが敵枠を保持していない');

  // coreResolveHit() は死亡効果まで同期的に解決する。戦闘ループ側に同じ
  // 撃破後召喚を残すと、1回の撃破で仲間化が2体になり、配置・後続攻撃対象が崩れる。
  const liveState = core.createBattleState({
    sides: {
      p1: {units: [{id: 'succubus-live', name: 'サキュバス', atk: 6, hp: 3, maxHp: 3}]},
      p2: {units: [{id: 'victim-live', name: '敵キャラ', atk: 4, hp: 1, maxHp: 7}]},
    },
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
  });
  const liveEvents = [];
  const liveHit = (source, target, amount, counter) =>
    core.coreResolveHit(liveState, source, target, amount, counter, createSeededRng(32), e => liveEvents.push(e));
  liveState.units.p1[0]._coreAttackContact = true;
  liveHit(liveState.units.p1[0], liveState.units.p2[0], 6, false);
  assert.equal(liveEvents.filter(e => e.type === 'summon').length, 1,
    'サキュバスの1回の撃破で仲間化召喚が二重発生している');

  // 反撃で死亡したキャラクターは「サキュバスが攻撃で倒した敵」ではない。
  // counter情報が死亡効果まで届かないと、反撃時だけ仲間化が誤発動する。
  const counterState = core.createBattleState({
    sides: {
      p1: {units: [{id: 'succubus-counter', name: 'サキュバス', atk: 1, hp: 1, maxHp: 1}]},
      p2: {units: [{id: 'counter-killer', name: '敵', atk: 4, hp: 5, maxHp: 5}]},
    },
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
  });
  const counterEvents = [];
  const counterHit = (source, target, amount, counter) =>
    core.coreResolveHit(counterState, source, target, amount, counter, createSeededRng(33), e => counterEvents.push(e));
  counterHit(counterState.units.p2[0], counterState.units.p1[0], 1, true);
  assert.equal(counterEvents.filter(e => e.type === 'summon').length, 0,
    'サキュバスが反撃ダメージによる死亡で仲間化召喚している');
}

function runSummonLimitScenario() {
  const units = Array.from({length: 14}, (_, i) => ({
    id: `full-${i}`, name: `味方${i}`, atk: 1, hp: 3, maxHp: 3, color: '赤'
  }));
  const state = core.createBattleState({
    sides: {p1: {units}, p2: {units: []}},
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    summonDefs: [{name: '召喚体', power: 1, life: 1, color: '青'}],
  });
  const events = [];
  const result = core.coreSummonUnit(state, 'p1', {name: '召喚体'}, e => events.push(e), 'full-0');
  assert.equal(result, null, '召喚上限14体到達後もコアが召喚体を生成している');
  assert.equal(events.filter(e => e.type === 'summon').length, 0, '召喚上限到達後にsummonイベントを生成している');
  assert.equal(events.filter(e => e.type === 'summon_rejected').length, 1, '召喚上限拒否を記録していない');
  assert.equal(state.units.p1.length, 14, '召喚上限到達後に盤面配列が増えている');

  // 召喚は前衛の右端にだけ出る。陣営全体に空きがあっても前衛が満杯なら成立しない。
  const frontFull = core.createBattleState({
    sides: {p1: {units: units.slice(0, 13)}, p2: {units: []}},
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    summonDefs: [{name: '召喚体', power: 1, life: 1, color: '青'}],
  });
  const frontFullEvents = [];
  const frontFullSpawn = core.coreSummonUnit(frontFull, 'p1', {name: '召喚体'}, e => frontFullEvents.push(e), 'full-0');
  assert.equal(frontFullSpawn, null, '前衛が満杯なのに召喚している（後衛へ逃がしてはいけない）');
  assert.equal(frontFullEvents.filter(e => e.type === 'summon_rejected').length, 1,
    '前衛満杯による拒否を記録していない');

  // 前衛に空きがあるときだけ召喚が成立する（後衛の在席は前衛の空きを埋めない）。
  const roomUnits = units.slice(0, 10).map((u, i) => ({...u, lane: i < 6 ? 'front' : 'rear'}));
  const room = core.createBattleState({
    sides: {p1: {units: roomUnits}, p2: {units: []}},
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    summonDefs: [{name: '召喚体', power: 1, life: 1, color: '青'}],
  });
  const roomEvents = [];
  const spawned = core.coreSummonUnit(room, 'p1', {name: '召喚体'}, e => roomEvents.push(e), 'full-0');
  assert.ok(spawned && roomEvents.filter(e => e.type === 'summon').length === 1,
    '前衛に空きがあるのに召喚イベントが生成されていない');
}

function main() {
  const currentBattle = read('js/engine/battle.js');
  const oldBattle = oldRead('js/engine/battle.js');
  const playback = read('js/online/playback.js');
  const board = read('js/online/board.js');
  const presentSrc = read('js/battle/present.js');
  const versusSrc = read('js/online/versus.js');
  const render = read('js/engine/render.js');
  const injuryStart = currentBattle.indexOf('async function _runCoreLiveInjuryEffects');
  const injuryFn = currentBattle.slice(injuryStart, currentBattle.indexOf('async function _fireAllyInjuryEffects', injuryStart));
  assert.match(currentBattle, /_genericAllyDeaths:Number\(G\._genericAllyDeaths\)\|\|0/,
    '死亡観測の累積カウンタを一時コア状態へ引き継いでいない');
  assert.match(currentBattle, /G\._genericAllyDeaths=Math\.max\(0,Number\(state\._genericAllyDeaths\)/,
    '死亡観測の累積カウンタをGへ戻していない');
  assert.match(currentBattle, /_enemyDeaths:unitIsEnemy\?Math\.max\(0,\(Number\(G\._enemyDeathsThisBattle\)\|\|0\)-1\):0/,
    '敵死亡観測の現在死亡分を除いた累積値をコアへ渡していない');
  assert.doesNotMatch(currentBattle, /if\(Number\(unit\.manaOnAttack\)>0\) await _playManaEffectCue/,
    '単純な攻撃時マナ獲得にマナVFXを追加して旧挙動を変えている');
  assert.doesNotMatch(currentBattle, /if\(Number\(unit\.manaOnInjury\)>0\) await _playManaEffectCue/,
    '単純な負傷時マナ獲得にマナVFXを追加して旧挙動を変えている');
  assert.match(read('js/engine/render.js'), /function playSacrificeDestroyVfx\(unit, side, onReverseStart\)/,
    '生贄VFXの逆再生開始コールバックがない');
  assert.match(currentBattle, /playSacrificeDestroyVfx\(u,isEnemySide\?'enemy':'ally',\(\)=>\{/,
    '生贄死亡効果を逆再生開始へ接続していない');
  assert.match(currentBattle, /const domBefore=`\$\{liveDomLayout\('p1'\)\}\|\|\$\{liveDomLayout\('p2'\)\}`;[\s\S]*_lastVisualRect=/,
    '死亡効果VFX用の直前DOM矩形を詰め処理前に保持していない');
  assert.doesNotMatch(currentBattle, /await playSacrificeDestroyVfx\(u,isEnemySide\?'enemy':'ally'\);[\s\S]{0,180}await fireDeathEffects\(u\);/,
    '生贄死亡効果をVFX完了後へ遅延している');
  assert.match(currentBattle, /const goldBefore=Math\.max\(0,Number\(G\.gold\)\|\|0\)/,
    '死亡時ゴールドをVFX開始前に表示へ反映している');
  assert.match(currentBattle, /e\.type==='gold_gain'[\s\S]*_playCardEffectVfx\('C001'/,
    '死亡時ゴールドの固有VFX接続がない');
  const coreEvents = runSummonScenario();
  runBatchedLichScenario();
  runCrossStateSummonIdScenario();
  runDeferredManaScenario();
  runManaSummonLichScenario();
  runPersistentDeathObserverScenario();
  runSuccubusCaptureScenario();
  runSummonLimitScenario();
  const types = coreEvents.map(e => e.type);
  const summonIndexes = coreEvents.map((e, i) => e.type === 'summon' ? i : -1).filter(i => i >= 0);

  // 旧実装に存在した召喚入口と、現在の共通経路が双方残っていることを明示する。
  const sourceCompare = {
    oldAdhocSummon: count(oldBattle, /_spawnAdhocAllyUnit\(/g),
    currentAdhocSummon: count(currentBattle, /_spawnAdhocAllyUnit\(/g),
    oldSummonWaits: count(oldBattle, /await\s+_spawnAdhocAllyUnit\(/g),
    currentSummonWaits: count(currentBattle, /await\s+_spawnAdhocAllyUnit\(/g),
    currentCoreFlush: /_flushCorePveHitEvents\(state,localEvents/.test(currentBattle),
    playbackSummonWaitMs: Number((playback.match(/summon:\s*(\d+)/) || [])[1]),
  };

  // 表示タイミング監査：召喚のイベント生成直後に再生側が待機を入れていないこと。
  assert.equal(sourceCompare.playbackSummonWaitMs, 0, 'オンラインsummon再生に待機がある');
  assert.ok(sourceCompare.currentCoreFlush, 'PvEが共通イベントを演出へ接続していない');
  assert.match(currentBattle, /G\.allies\.splice\(0,G\.allies\.length,\.\.\.nextAllies\)/,
    '盤面詰め時にG.alliesの配列参照を差し替えている');
  assert.match(currentBattle, /G\.enemies\.splice\(0,G\.enemies\.length,\.\.\.nextEnemies\)/,
    '盤面詰め時にG.enemiesの配列参照を差し替えている');
  assert.match(currentBattle, /const rearSlots=Math\.max\(0,maxA-frontSlots\)/,
    '盤面詰め処理が後衛を3枠に固定し、14体上限まで保持していない');
  assert.match(currentBattle, /if\(typeof requestBattleCompact==='function'\) requestBattleCompact\(_summonHasDom\?undefined:\{forceDuringMotion:true\}\);/,
    '召喚後に人数変化用の詰めアニメーションを実行していない');
  // 召喚体にDOMが無いまま攻撃モーション完了を待つと、画面に出ないのに攻撃・被弾が進み、
  // 攻撃モーションが再生されずダメージ数値だけが左端へ出る。DOM無しの時だけ強制描画する。
  assert.match(currentBattle, /const _summonHasDom=!!document\.querySelector\(/,
    '召喚体のDOM有無を見ずに描画を遅延している');
  // HP1の召喚体は反撃で即死するため、演出時には既にHP0で描画されない。
  // 攻撃を見せ終えるまで表示上だけ生かしておく。
  assert.match(currentBattle, /const _attackerIdsInFlush=new Set\(eventList/,
    'フラッシュ内で攻撃する召喚体を先に把握していない');
  assert.match(currentBattle, /if\(unit\.hp<=0&&_attackerIdsInFlush\.has\(String\(unit\.id\)\)\)\{/,
    '攻撃前に死んでいる召喚体を表示用に生かしていない（召喚も割り込み攻撃も見えない）');
  assert.match(currentBattle, /if\(attacker&&attacker\._presentSummonDeathPending\)\{/,
    '表示用に生かした召喚体を攻撃後に死亡状態へ戻していない');
  // 「代わりに攻撃させる」で本体の攻撃が省かれる場合、モーションは最後まで見せ、
  // ダメージと反撃だけを抑止する。25%地点から引き返すと本体が動かないように見え、
  // skipAttack を読まないとPvEだけ本体が殴って反撃まで受ける（コアは省いている）。
  assert.match(currentBattle, /result\.skipAttack=true;\s*\n\s*return null;/,
    '肩代わり攻撃で本体のモーションを途中で打ち切っている');
  assert.match(currentBattle, /if\(attackResult\.skipAttack\) return;/,
    '肩代わり攻撃なのに本体のダメージ・反撃を発生させている');
  assert.doesNotMatch(currentBattle, /result\.contacted=damage>0;/,
    'skipAttack を見ずに接触扱いにしている');
  // PvEの盤面配列は null を含む固定長。コアが詰まった配列前提で回すと例外になり、
  // 攻撃処理ごと中断して手番が相手へ渡らない（邪眼＝スリンで100%再現した）。
  assert.match(read('js/battle/core.js'),
    /\(state\.units\[attacker\.side\] \|\| \[\]\)\.some\(x => x && x\.hp > 0/,
    'コアが疎配列のnullをガードしていない');
  // 戦闘の進め方はコアが唯一の実装。PvEは1手ずつ step() を呼ぶだけにする。
  assert.match(currentBattle, /const runner=createBattleRunner\(state,coreMathRng,emit,\{skipOpening:true\}\);/,
    'PvEがコアの進行（createBattleRunner）を使っていない');
  // 詰め処理は演出の後。先に詰めると再生時に攻撃対象が盤面から消え、
  // 攻撃モーションが出せなくなる（アニメーションが全て飛ぶ）。
  assert.match(currentBattle, /stop=runner\.step\(\{deferCompact:true\}\);/,
    'PvEが1手ずつ coreBattleStep() を呼んでいない、または詰め処理を演出前に行っている');
  // 演出フラグは step() の前から立てる。step()でHPが0になった直後に再描画が挟まると、
  // 死亡した体が空きスロットへ描き直され、あとから出る数値・VFXが何もない場所へ出る。
  assert.match(currentBattle, /presentBeginPlayback\(\);[\s\S]{0,600}?\n\s*let stepped=false;/,
    'step()の前に演出フラグを立てていない（死亡直後の再描画で数値位置がずれる）');
  // 画面のATK/HPは「まだ見せていない変化」を反映しない。コアは1手番ぶんを先に
  // 解決するため、据え置かないと数値・VFXより先にHP/ATKだけが変わって見える。
  assert.match(read('js/battle/present.js'), /function presentShownHp\(unit\)/,
    '画面に出すHPの規則が present.js に無い');
  assert.match(read('js/engine/render.js'), /const _shownHp=typeof presentShownHp==='function'/,
    'カードのHP表示が据え置き値を見ていない');
  assert.match(currentBattle, /presentHoldShown\(u,atk,hp,maxHp\)/,
    'PvEが手番の頭で表示値を据え置いていない');
  assert.match(currentBattle, /presentAdvanceShown\(target,\{hp:e\.hpAfter\}\)/,
    'PvEが数値を出す瞬間に表示HPを進めていない');
  // 全体ダメージは「全員に入れてから、まとめて誘発」。1体ずつ誘発まで解決すると、
  // 割り込み攻撃（ミノタウロス）が残りの対象へのダメージより先に起きる。
  assert.match(read('js/battle/core.js'), /function coreApplyHitTriggers\(/,
    '命中後の誘発が切り出されていない（全員にダメージ→まとめて誘発ができない）');
  assert.match(read('js/battle/core.js'),
    /\{ deferTriggers: true, collect: pending \}\)\);/,
    '全体ダメージが1体ずつ誘発まで解決している');
  // 固有SEもVFXと同じ規則で選ぶ。カード自身の効果文がダメージに触れていない場合は
  // 鳴らさない（ノームに闇の炎を付けた死亡ダメージでノームのSEが鳴っていた）。
  assert.match(currentBattle,
    /if\(vfxSource&&!sweepSources\.has\(vfxSource\.id\)\) effectDamageSources\.add\(vfxSource\.id\);/,
    '固有SEの発生元がVFXと別の規則になっている');
  assert.doesNotMatch(currentBattle, /if\(e\.effect&&source&&!sweepSources\.has\(source\.id\)\)\{\n\s*effectDamageSources\.add/,
    '固有SEを効果ダメージなら無条件に鳴らしている');
  // 1体の行動と次の行動の間には必ず「間」を置く（途切れなく続くと追えない）。
  assert.match(read('js/battle/present.js'), /const PRESENT_TURN_GAP_MS = /,
    '手番の間の長さが present.js に無い');
  [['PvE', currentBattle], ['オンライン', read('js/online/board.js')]].forEach(([name, src]) => {
    assert.match(src, /PRESENT_TURN_GAP_MS/, `${name}が手番の間を置いていない`);
  });
  // VFXのURLは毎回乱数で崩さない。崩すと命中のたびに画像を読み直し、
  // 同時に出るはずの数値が1体だけ先に出る／音がずれる。
  assert.doesNotMatch(read('js/engine/render.js'), /hitUrl\.includes\('\?'\)\?'&':'\?'\)\+'_r='\+Math\.random\(\)/,
    '命中VFXのURLを毎回乱数にしている（画像の読み直しで表示・音がずれる）');
  assert.match(read('js/engine/render.js'), /function _vfxVariantIndex\(\)/,
    'VFXのURLの印が使い回しになっていない');
  // 飛んでいる複製の数値も据え置き値を使う（止まった瞬間に反撃ダメージが入って見えた）。
  assert.match(read('js/engine/render.js'), /presentShownAtk\(attacker\)/,
    '攻撃モーションの複製が実体のATK/HPを直に読んでいる');
  // 封印中のATK/HPは暗くしても読めること（filterとopacityの二重掛けで消えていた）。
  assert.doesNotMatch(read('index.html'),
    /sealed-unit \.slot-stats,\n[^}]*\n\s*opacity:\.5!important;/,
    '封印中のATK/HPが読めない濃さになっている');
  assert.match(currentBattle, /if\(typeof runner\.compact==='function'\) runner\.compact\(\);/,
    '演出の後に盤面を詰めていない（コアと配列の並びが食い違う）');
  {
    const render = read('js/engine/render.js');
    // 再生中に倒れた体はカードを残す。ここをhp>0に戻すと、数値・個別VFXが
    // 位置指定のない空枠へ吸い寄せられ「何もない場所」に出る。
    assert.match(render, /const _alive=!!u&&\(u\.hp>0\|\|_pendingDeath\);/,
      '描画が死亡直後の体を保持していない');
    assert.match(render, /\n    if\(_alive\)\{/,
      'カード本体の描画条件が hp>0 のまま（死亡直後に数値の行き先が消える）');
    assert.match(render, /if\(u&&\(!isEnemy\|\|_alive\)\)\{/,
      '敵カードの中身の描画条件が hp>0 のまま');
    // 空きスロットは7枠等間隔の位置にあり、生存時の中央寄せとは別の場所にある。
    assert.match(render, /if\(found&&typeof idxOrUnit==='object'&&found\.classList&&found\.classList\.contains\('dead-empty'\)\) return null;/,
      'キャラ指定の解決が空きスロットを返しうる（数値・VFXが何もない場所へ出る）');
    // 盤面はFLIPで動くため、演出は対象カードへ追従させる。
    assert.match(render, /if\(typeof opt\.getRect==='function'\)\{/,
      'VFX・ダメージ数値が対象カードへ追従していない');
  }
  {
    // キャラクター固有VFXの「見せ方の規則」は present.js が唯一の実装。
    // PvE・オンラインの双方が同じ関数を呼び、判断を自前で持たないこと。
    const board = read('js/online/board.js');
    const present = read('js/battle/present.js');
    assert.match(present, /function presentDamageVfxSource\(/,
      '被弾時の固有VFX発生元の規則が present.js に無い');
    assert.match(present, /function presentStatChangeVfxAllowed\(/,
      '能力変化の固有VFX可否の規則が present.js に無い');
    assert.match(present, /const PRESENT_STAT_CHANGE_VFX_REASONS = new Set\(\[/,
      '固有VFXを出す効果の一覧が present.js に無い');
    [['PvE', currentBattle], ['オンライン', board]].forEach(([name, src]) => {
      assert.match(src, /presentDamageVfxSource\(/,
        `${name}が被弾時の固有VFX発生元を present.js に委ねていない`);
      assert.match(src, /presentStatChangeVfxAllowed\(/,
        `${name}が能力変化の固有VFX可否を present.js に委ねていない`);
      // 規則を呼び出し側へ書き戻すと、また片側だけ直る状態に戻る。
      assert.doesNotMatch(src, /redirectedFrom\s*[?]/,
        `${name}が肩代わりの判断を自前で持っている（present.jsへ戻すこと）`);
      assert.doesNotMatch(src, /'mana_threshold_arachne_buff'/,
        `${name}が固有VFXを出す効果の一覧を自前で持っている（present.jsへ戻すこと）`);
    });
    // 「演出の再生中」フラグも present.js が唯一の実装。片側だけが立てると、
    // 同じ不具合（数値が何もない場所へ出る／倒れたカードが残る）がもう片方で再発する。
    assert.match(present, /function presentIsPlaying\(\)/,
      '再生中フラグが present.js に無い');
    [['PvE', currentBattle], ['オンライン', board]].forEach(([name, src]) => {
      assert.match(src, /presentBeginPlayback\(\)/, `${name}が再生中フラグを立てていない`);
      assert.match(src, /presentEndPlayback\(\)/, `${name}が再生中フラグを下ろしていない`);
      assert.doesNotMatch(src, /_flushingCoreEvents/,
        `${name}が独自の再生中フラグを持っている（present.jsへ戻すこと）`);
      // 数値を出し終えた印。これが無いと倒れたカードが再生の終わりまで残る。
      assert.match(src, /_deathFxReady\s*=\s*true/, `${name}が死亡演出の開始印を付けていない`);
    });
    // 死亡もコアが出したイベントの順番のまま処理する。まとめて後回しにすると、
    // 同じ盤面でもオンラインと「消える順番」が食い違う。
    assert.match(currentBattle, /if\(e\.type==='death'\)\{/,
      'PvEが死亡をイベントの順番で処理していない');
    assert.doesNotMatch(currentBattle, /if\(e\.type==='death'\) continue;/,
      'PvEが死亡を末尾へ後回ししている（オンラインと消える順番が食い違う）');
    // 固有VFXの大きさも present.js が唯一の実装。呼び出し側が持つと片方だけ巨大に出る。
    assert.match(present, /function presentCharacterVfxScale\(/,
      '固有VFXの大きさの規則が present.js に無い');
    assert.match(read('js/engine/render.js'), /presentCharacterVfxScale\(charVfxCode\)/,
      '被弾演出が固有VFXの大きさを present.js に委ねていない（マータ等が巨大に出る）');
    assert.doesNotMatch(currentBattle, /code==='C001'\|\|code==='C002'\|\|code==='C003'/,
      '固有VFXの大きさの一覧を呼び出し側が持っている（present.jsへ戻すこと）');
    // 死亡演出に入るまでは暗くしない。暗くすると「死体が場に残る」ように見える。
    assert.match(read('js/engine/render.js'), /if\(u\.hp<=0&&!_pendingDeath\) slot\.classList\.add\('dead-unit'\);/,
      '数値を出し切る間の体まで暗くしている');
    // 攻撃モーション中は実スロットを必ず隠す。敵スロットには
    // `body #f-enemy .slot{visibility:visible!important}` が当たっており、
    // ID指定を含まない motion-hidden の指定では詳細度で負ける。
    assert.match(read('index.html'),
      /html body #f-ally \.slot\.motion-hidden,\s*\n\s*html body #f-enemy \.slot\.motion-hidden,/,
      '攻撃モーション中の非表示指定が敵スロットの visible!important に負ける');
    // 効果ダメージかどうかは呼び出し側が決める。ここで決め打ちすると、
    // 通常攻撃まで効果扱いになり、攻撃するたびに攻撃者の固有VFX・固有SEが出る。
    assert.match(read('js/battle/core.js'),
      /effect: \(opts && opts\.effect !== undefined\) \? !!opts\.effect/,
      'コアが effect を上書きしている（通常攻撃で固有VFX・固有SEが出る）');
    // 命中音は両方で同じ関数を使う。PvEに無いと攻撃開始音だけになる。
    [['PvE', currentBattle], ['オンライン', board]].forEach(([name, src]) => {
      assert.match(src, /playAttackDamageSfx\(/, `${name}が命中音を鳴らしていない`);
    });
    // 薙ぎ払いの見せ方は1つの実装を両方から呼ぶ。
    assert.match(read('js/engine/render.js'), /async function presentSweepAttack\(/,
      '薙ぎ払いの共通実装が render.js に無い');
    [['PvE', currentBattle], ['オンライン', board]].forEach(([name, src]) => {
      assert.match(src, /presentSweepAttack\(/, `${name}が薙ぎ払いの共通実装を呼んでいない`);
    });
    assert.doesNotMatch(read('js/engine/render.js'), /_flushingCoreEvents/,
      '描画が独自の再生中フラグを見ている（present.jsへ戻すこと）');
    // 重複の数え方（SEは発生元＋効果、VFXは＋対象）も両側で同じにする。
    [['PvE', currentBattle], ['オンライン', board]].forEach(([name, src]) => {
      assert.match(src, /\$\{cueKey\}:\$\{(target|u)\.id\}/,
        `${name}の能力変化VFXが対象ごとの重複ゲートを通っていない`);
    });
  }
  assert.doesNotMatch(currentBattle, /let side=\(typeof corePickFirstSide/,
    'PvEに独自のターンループが残っている（オンラインと結果が食い違う）');
  // 同じ効果を二重に解決しないための歯止め。
  ['_applyDeathKeywordEffects', '_resolveSeals', '_tryNecromancerRingRevive',
    '_applyCoreShieldLostEffectsLive'].forEach(fn => {
    assert.match(currentBattle, new RegExp(`function ${fn}\\(|async function ${fn}\\(`),
      `${fn} が見つからない`);
  });
  assert.equal((currentBattle.match(/if\(G\._coreDrivenBattle\) return/g) || []).length >= 4, true,
    'コア駆動時にPvE側の重複解決を止めていない（効果が二重に発動する）');
  // 先攻は同数なら乱数。PvEとオンラインで唯一意図的に食い違っていたが揃えた。
  assert.match(read('js/battle/core.js'), /function corePickFirstSide\(state, rng\) \{/,
    '先攻の判定が共通実装になっていない');
  // 先攻の判定も createBattleRunner() の中（corePickFirstSide）が決める。
  // PvE側に判定を書き戻さないこと。
  assert.doesNotMatch(currentBattle, /corePickFirstSide\(/,
    'PvEが先攻判定を自前で持っている（同数時にオンラインと食い違う）');
  // カード固有VFXは本来の効果のときだけ。強化で得た効果に使うと別物の演出が出る。
  assert.match(currentBattle, /function _characterVfxAllowedForDamage\(unit\)\{/,
    '強化カード由来の効果でもカード固有VFXを再生している');
  // 記録の直列化が戦闘を止めてはならない（ユニット同士の相互参照で循環する）。
  assert.match(currentBattle, /function _battleTraceJson\(list\)\{/,
    'トレースの直列化が循環参照で例外を投げ得る');
  const allyDamageFn=currentBattle.slice(currentBattle.indexOf('function dealDmgToAlly'),currentBattle.indexOf('// レムレース：',currentBattle.indexOf('function dealDmgToAlly')));
  assert.doesNotMatch(allyDamageFn,/manaOnInjury[\s\S]{0,80}_gainMana/,
    '負傷マナを旧dealDmgToAlly経路でも加算し、共通コアと二重解決している');
  assert.match(currentBattle, /_corePendingSummon/, 
    '未表示召喚体を演出フラッシュ前に盤面配置から退避していない');
  assert.match(currentBattle, /pendingSummons\.delete\(String\(e\.unit\.id\)\)/,
    '表示済み召喚体を保留表から消費していない');
  assert.match(currentBattle, /filter\(u=>u&&!before\.has\(u\)&&!u\._corePendingSummon\)/,
    'コア保留召喚を演出前にG配列へ先行接続している');
  assert.match(currentBattle, /if\(e\.type==='transform'\)[\s\S]*Object\.assign\(target,e\.unit\)/,
    '戦闘中の変身イベントで画像・枠を含むスナップショットを表示へ反映していない');
  assert.match(currentBattle, /if\(spawnedUnit\._corePendingSummon\) continue/,
    '配置失敗した保留召喚をフラッシュ後段で上限超過追加している');
  assert.match(currentBattle, /_battleCompactAnimatingUntil/,
    '連続召喚で前の詰め移動がDOM再構築により中断される');
  assert.match(currentBattle, /void _playManaEffectCue\(source,e\.side==='p2'\);[\s\S]*_recordBattleTrace\('mana_state_apply'/,
    '攻撃中のマナ効果演出を待機せず並行再生していない');
  // 同時に発動した複数のマナ閾値効果でマナ効果VFXが重ならないこと。
  // 「どういう規則で見せるか」は battle/present.js が唯一の実装。PvEもオンラインもそこを呼ぶ。

  assert.match(presentSrc, /^function presentChooseSummonSlot\(/m, 'present.jsに召喚スロット選択が無い');
  assert.match(presentSrc, /^function presentCreateDamageGate\(/m, 'present.jsにダメージ表示の順番待ちが無い');
  assert.match(presentSrc, /^function presentCreateOnceGate\(/m, 'present.jsに1回だけ見せるゲートが無い');
  assert.doesNotMatch(presentSrc, /document\.|window\.G\b|\bG\./, 'present.jsがDOMやGを触っている（方針だけを置く層）');
  // PvE側
  assert.match(currentBattle, /const manaCueGate=presentCreateOnceGate\(\);/,
    'PvEのマナ効果VFX間引きが共通ゲートを使っていない');
  assert.match(currentBattle, /const damageGate=presentCreateDamageGate\(/,
    'PvEのダメージ表示の順番待ちが共通ゲートを使っていない');
  assert.match(currentBattle, /const effectStatVfxGate=presentCreateOnceGate\(\);/,
    'PvEの固有VFX重複抑止が共通ゲートを使っていない');
  // 待ち時刻は present.js が呼び出しをまたいで共有する（reserve）。
  // バッチごとに別の表で管理すると、同じキャラクターへ別経路から同時にダメージが
  // 入った時に互いを知らず、数値が重なって読めなくなる。
  assert.match(currentBattle, /const damageLabelGate=typeof presentCreateDamageGate==='function'\?presentCreateDamageGate\(\):null;/,
    'applyDamageBatchが共通のダメージ表示ゲートを使っていない');
  assert.match(currentBattle, /damageLabelGate\?Math\.max\(0,damageLabelGate\.reserve\(key\)\):0/,
    'applyDamageBatchのダメージ表示を予約制にしていない（数値が重なる）');
  assert.match(currentBattle, /const waitMs=damageGate\.reserve\(`u:\$\{target\.id\}`\);/,
    'イベント再生のダメージ表示が同じ予約表を使っていない');
  assert.doesNotMatch(currentBattle, /const damageDisplayQueues=new Map\(\);/,
    'バッチ内だけの順番待ちが残っている（別経路と重なる）');
  // オンライン側
  // 召喚の位置決めはコアが唯一の実装（戦闘中の召喚は前衛の右端）。
  // 以前はオンラインだけ「左から最初の空き枠」を使っており、
  // 前の召喚体が倒れた後の召喚が味方の左側へ出ていた。
  assert.match(board, /coreInsertSummonedUnit\(list, summoned, spec \|\| \{\}, FRONT_SLOTS\);/,
    'オンラインの召喚位置がコアの共通実装を使っていない');
  assert.doesNotMatch(board, /presentChooseSummonSlot\(/,
    'オンラインが古い空き枠探しを使っている（PvEと配置が食い違う）');
  // 盤面配列の持ち方もPvE（コア）と同じ「左詰め＋laneで前後」にする。
  assert.doesNotMatch(board, /let f = 0, r = FRONT_SLOTS;/,
    'オンラインが前衛0..6／後衛7..13の固定枠のまま（PvEと配置規則が食い違う）');
  assert.match(board, /_manaCueGate = presentCreateOnceGate\(\);/,
    'オンラインのマナ効果VFX間引きが共通ゲートを使っていない');
  assert.match(board, /const waitMs = _damageGate\.reserve\(`u:\$\{u\.id\}`\);/,
    'オンラインのダメージ表示が順番待ちになっていない（PvEと食い違う）');
  assert.doesNotMatch(board, /const MANA_CUE_RUN_TYPES = new Set/,
    'オンラインにマナ解決の継続種別の独自定義が残っている（present.jsとの二重実装）');
  // 攻撃モーションの進捗は「最初のフレームが来た時刻」を起点にする。
  // 予約時刻を起点にすると、起動直後のデコードでメインスレッドが尺以上止まったとき
  // 1フレーム目で終端へ飛び、攻撃モーションが再生されない（起動後の数戦で発生）。
  assert.match(render, /let startedAt=null;[\s\S]{0,600}if\(startedAt===null\)\{[\s\S]{0,80}startedAt=now;/,
    '攻撃モーションの起点が最初のフレームになっていない');
  assert.doesNotMatch(render, /const startedAt=performance\.now\(\);/,
    '攻撃モーションが予約時刻起点のまま（起動直後にモーションが飛ぶ）');
  // 負傷効果は、そのダメージ表示が出てから少し間を置いてから発動する。
  // 命中から結果を見せ始めるまでの間は present.js の PRESENT_HIT_BEAT_MS が唯一の定義。
  // PvEもオンラインの再生も同じ値を使う（別々に数値を書くとテンポが食い違う）。
  assert.match(presentSrc, /const PRESENT_HIT_BEAT_MS = \d+;/,
    'present.jsに命中後の間（PRESENT_HIT_BEAT_MS）が無い');
  assert.match(currentBattle, /const INJURY_EFFECT_DELAY_MS=\(typeof PRESENT_HIT_BEAT_MS==='number'&&PRESENT_HIT_BEAT_MS\)/,
    'PvEの負傷効果の待ちが共通定数を使っていない');
  // 固定待ちは「その演出を待っていない場合」だけに置く。再生側が既に await
  // している種別へ足すと、PvEには無い分だけオンラインだけ間延びする。
  assert.match(playback, /\n  damage: 0,\n  death: 0,\n  sacrifice: 0,\n  seal_release: 0,/,
    '既に待っている種別に固定待ちを足している（オンラインだけ動きが重くなる）');
  assert.match(board, /const waitMs = _damageGate\.reserve\(`u:\$\{u\.id\}`\);/,
    'オンラインのダメージ表示が共通の順番待ちを使っていない');
  // 待ちを入れるのは「同じキャラクターへ数値が重なって出る」場合だけ。
  // 1発だけのダメージでも毎回待つと、命中してから戻るまでが常に一拍長くなる。
  assert.match(currentBattle, /const _needsInjuryBeat=\[\.\.\.injuredAllies,\.\.\.injuredEnemies\]\.some\(r=>r&&damageOverlapUnits\.has\(r\.unit\)\);/,
    '負傷効果の待ちを数値の重なりで判定していない');
  assert.match(currentBattle, /if\(_needsInjuryBeat\) await sleep\(INJURY_EFFECT_DELAY_MS\);/,
    '負傷効果をダメージ表示の直後に走らせている（数値より先に効果が動いて見える）');
  assert.match(currentBattle, /if\(r\.unit\) damageOverlapUnits\.add\(r\.unit\);/,
    '数値が重なる対象を記録していない');
  // 攻撃モーションの複製が生きている間は、元位置の実スロットを必ず隠す。
  // 深度カウンタだけに頼ると数え違いでカードが2枚に見える。
  assert.match(render, /attack-motion-clone\[data-unit-id=/,
    'renderFieldが生存中のモーション複製をDOMで確認していない');
  assert.match(render, /transition','transform 260ms ease'/,
    '人数変化時のFLIPがtransform遷移になっていない');
  assert.match(render, /_battleCompactMoves/,
    '再描画後にFLIPの残り移動量を引き継ぐ状態がない');
  assert.match(currentBattle, /unit\.lane='rear';\s*unit\._battleSlot=i/,
    '後衛召喚のスロット番号を保持していない');
  assert.match(currentBattle, /sourceIsRear&&sourceIdx>=frontSlots[\s\S]*rear\.splice\(logicalSource\+1,0,unit\)/,
    '後衛の効果元に対する右隣召喚が前衛へ移動している');
  assert.match(currentBattle, /let insertAt=placement&&placement\.leftOf\?logicalSource:logicalSource\+1;[\s\S]*return insertAt;/,
    '効果元の左隣召喚が実際の挿入スロットを返していない');
  assert.match(currentBattle, /sourceIdx<0&&source\.id!=null\) sourceIdx=arr\.findIndex\(u=>u&&u\.id===source\.id\)/,
    '召喚元の別オブジェクト参照でrightOfSourceが位置フォールバックしている');
  assert.match(currentBattle, /const logicalSource=front\.indexOf\(actualSource\)/,
    '前衛の召喚挿入位置が補正前のsource参照を使っている');
  assert.match(currentBattle, /const logicalSource=rear\.indexOf\(actualSource\)/,
    '後衛の召喚挿入位置が補正前のsource参照を使っている');
  // 召喚は前衛の右端にだけ出る。後衛へ逃がすと陣営の上限を超え、
  // 編成していない後衛枠にキャラクターが現れる。
  assert.match(currentBattle, /const rearIdx=_summonMidBattleAllyFront\(summoned,isEnemySide,placement\);/,
    '召喚が前衛以外へフォールバックしている');
  // 後衛へ置いてよいのは編成どおりに並べる開戦時の配置だけ。
  // 戦闘中の召喚が後衛へ落ちると、陣営の上限を超え、編成していない枠に現れる。
  assert.equal((currentBattle.match(/_summonPanelUnitToRear\(/g) || []).length, 2,
    '戦闘中の召喚に後衛フォールバックが残っている（開戦配置の定義と呼び出しの2箇所だけが正しい）');
  assert.match(currentBattle, /const placed=entry\.toRear\s*\n\s*\?_summonPanelUnitToRear\(summoned,false,summoned\._battleSlot\)/,
    '開戦時の後衛配置まで消している（編成どおりに並ばなくなる）');
  assert.match(read('js/battle/core.js'), /const frontFull = liveFront >= frontSlots;/,
    'コアが前衛の空きを見ずに召喚している（PvEだけ拒否すると内部と画面がずれる）');
  assert.doesNotMatch(currentBattle, /e\.atk=3; e\.baseAtk=3;[\s\S]*e\.maxHp=500; e\.hp=500;/,
    'デバッグ試験戦闘で敵ステータスを上書きしている');
  assert.match(currentBattle, /\} else if\(attacker&&target&&typeof playAttackMotion==='function'\)/,
    '即時攻撃イベントを対象のHP0判定で演出ごとスキップしている');
  assert.equal(count(currentBattle, /await playAttackMotion\(/g), 5,
    'PvEのplayAttackMotion呼び出し数が想定外に変化している');
  // 攻撃効果は「少し動き出した時点」で見せる。攻撃より前に効果があるときは、
  // 先にモーションを始めて25%地点で止め、効果を見せてから接触まで進める。
  assert.match(currentBattle, /const _preAttackHasEffects=/,
    'PvEが攻撃効果を攻撃モーションより先に出したままになっている');
  assert.match(read('js/online/board.js'), /_preAttack = _startAttackMotion\(atkEv, ctx, true\)/,
    'オンラインが攻撃効果を攻撃モーションより先に出したままになっている');
  // 先出しモーションは「効果を起こした本人」の攻撃を掴む。最初のattackを掴むと、
  // ミノタウロスの割り込み攻撃を先出ししてしまう。
  assert.match(currentBattle, /const _preAttackActorId=/,
    'PvEの先出しモーションが効果の発生元を見ていない');
  assert.match(read('js/online/board.js'), /if \(actorId != null && String\(n\.attackerId\) === actorId\)/,
    'オンラインの先出しモーションが効果の発生元を見ていない');
  // 「全てのキャラクター」に自分自身は含めない。
  assert.match(read('js/battle/core.js'), /\[\.\.\.allies, \.\.\.foes\]\.filter\(x => x !== unit && x\.hp > 0/,
    '全体ダメージが自分自身も対象にしている');
  // 解放演出はコア駆動でも必ず出す（_resolveSeals は通らない）。
  assert.match(currentBattle, /if\(e\.type==='seal_release'\)\{/,
    'PvEが封印の解放演出を出していない');
  // 音源は使い回す。毎回cloneNode()すると読み込みからやり直しになり、
  // 鳴り始めが1回ごとにばらついて「同じ瞬間の音がずれて聞こえる」。
  assert.match(read('js/engine/audio.js'), /function _takeSfxVoice\(key, ?base\)/,
    'SEの複製を使い回していない（鳴り始めがばらつく）');
  assert.doesNotMatch(read('js/engine/audio.js'), /const a=base\.cloneNode\(\);\n {2}\/\/ iOS/,
    'playSfxが毎回cloneNodeしている（プールを経由すること）');
  // 連続する命中音はまとめて鳴らす（VFXのデコードで音がずれるため）。
  [['PvE', currentBattle], ['オンライン', read('js/online/board.js')]].forEach(([name, src]) => {
    assert.match(src, /damageSfxDone|_damageSfxDone/i, `${name}が命中音をまとめて鳴らしていない`);
  });
  assert.match(currentBattle,
    /if\(attacker&&target&&typeof playAttackMotion==='function'\)\{[\s\S]*beginBattleMotion\(\);[\s\S]*try\{[\s\S]*await playAttackMotion\([\s\S]*finally \{[\s\S]*endBattleMotion\(\);/,
    'PvEのコア効果由来playAttackMotionがbeginBattleMotionで保護されていない');
  assert.match(board,
    /const motionDepthStarted = typeof beginBattleMotion === 'function';[\s\S]*if \(motionDepthStarted\) beginBattleMotion\(\);[\s\S]*_motion = playAttackMotion\([\s\S]*await _awaitMotion\(\); \}[\s\S]*finally \{ if \(motionDepthStarted\) endBattleMotion\(\); \}/,
    'オンラインのplayAttackMotionが完了待ちを含むbegin/endBattleMotionで保護されていない');
  assert.match(render, /targetRectOverride=opt\.targetRect[\s\S]*!toEl&&!targetRectOverride/,
    '即時攻撃の対象DOMが死亡後に消えた場合の攻撃モーション矩形フォールバックがない');
  assert.match(currentBattle, /targetRect:target\._lastVisualRect\|\|null/,
    '即時攻撃イベントから死亡直前の対象矩形を演出へ渡していない');
  const manaFlush=currentBattle.slice(currentBattle.indexOf('async function _flushRingManaThresholdEffects'), currentBattle.indexOf('// 嵐の指輪'));
  assert.doesNotMatch(manaFlush, /_manaUnitEffectQueue/, '旧マナ効果キューを攻撃／負傷処理が待機している');
  assert.doesNotMatch(injuryFn, /const spawned=[\s\S]*_flushCorePveHitEvents/,
    '負傷経路がsummonイベント処理前に召喚ユニットを先行追加している');
  assert.match(currentBattle, /_injuryDispatchSequence/,
    '負傷効果はダメージバッチ単位のdispatch tokenで再入を防ぐ');
  assert.match(currentBattle, /_fireAllyInjuryEffects\(r\.unit,r\.actualDmg,r\.source,injuryDispatchToken\)/,
    '味方負傷効果へ同一バッチのtokenを渡す');
  assert.match(currentBattle, /_fireEnemyInjuryEffects\(r\.unit,r\.actualDmg,r\.source,injuryDispatchToken\)/,
    '敵負傷効果へ同一バッチのtokenを渡す');
  assert.ok(summonIndexes.length >= 2, `リッチ誘発召喚を含むsummon列が不足: ${types.join(' > ')}`);
  assert.equal(coreEvents[summonIndexes[0]].unit.name, 'ウルフ', '発動元召喚の順序が不正');
  assert.equal(coreEvents[summonIndexes[1]].unit.name, 'シャドウ', 'リッチ誘発召喚の順序が不正');
  assert.equal(coreEvents[summonIndexes[1]].sourceId, coreEvents[summonIndexes[0]].unit.id,
    'リッチ誘発の親子関係が崩れ、シャドウの配置元が元キャラになっている');

  const capped = core.createBattleState({
    sides: {p1: {units: Array.from({length: 14}, (_, i) => ({id: `u${i}`, name: 'ゴーレム', atk: 1, hp: 1, maxHp: 1}))}, p2: {units: []}},
  });
  const cappedEvents = [];
  assert.equal(core.coreSummonUnit(capped, 'p1', {name: 'シャドウ', atk: 1, hp: 1}, e => cappedEvents.push(e), 'u0'), null,
    '召喚上限到達後に召喚できている');
  assert.equal(cappedEvents.filter(e => e.type === 'summon').length, 0, '上限到達後の召喚イベントが生成されている');
  assert.equal(cappedEvents.filter(e => e.type === 'summon_rejected').length, 1, '上限到達後の拒否イベントが生成されていない');

  // 前衛の空きが1つだけの状態では1体だけ受け付け、続けて同期処理で呼ばれても
  // 2体目のイベントを作らないことを確認する。配列長だけを見ると、疎配列
  // や保留召喚を含む経路で上限超過を見逃すため、生存実体数とイベント数を併記する。
  // 召喚は前衛の右端にだけ出るため、後衛の在席は前衛の空きを埋めない。
  const nearCap = core.createBattleState({
    sides: {p1: {units: Array.from({length: 13}, (_, i) => ({
      id: `n${i}`, name: 'ゴーレム', atk: 1, hp: 1, maxHp: 1, lane: i < 6 ? 'front' : 'rear'
    }))}, p2: {units: []}},
  });
  const nearCapEvents = [];
  const accepted = core.coreSummonUnit(nearCap, 'p1', {name: 'シャドウ', atk: 1, hp: 1}, e => nearCapEvents.push(e), 'n0');
  const rejected = core.coreSummonUnit(nearCap, 'p1', {name: 'シャドウ', atk: 1, hp: 1}, e => nearCapEvents.push(e), 'n0');
  assert.ok(accepted, '上限直前の召喚が拒否されている');
  assert.equal(rejected, null, '上限到達直後の追加召喚が許可されている');
  assert.equal(nearCap.units.p1.filter(u => u && u.hp > 0).length, 14, '召喚上限後の戦闘状態が15体以上になっている');
  assert.equal(nearCapEvents.filter(e => e.type === 'summon').length, 1, '上限超過分のsummonイベントが生成されている');

  // 開戦アイテム由来の3体召喚も通常召喚と同じ上限・誘発経路を通る。
  // 旧実装の直接pushは14体を超えてstate.unitsへ追加していた。
  // 召喚は前衛の右端にだけ出るため、前衛に空きが1つだけの盤面を作る。
  const itemCap = core.createBattleState({
    sides: {p1: {units: [
      {id: 'item-lich', name: 'リッチ', atk: 1, hp: 3, maxHp: 3, lane: 'front'},
      ...Array.from({length: 12}, (_, i) => ({id: `item-u${i}`, name: 'ゴーレム', atk: 1, hp: 1, maxHp: 1,
        lane: i < 5 ? 'front' : 'rear'}))
    ]}, p2: {units: []}},
    items: {p1: [{id: 'illusion', itemEffectKey: 'illusion_scroll'}], p2: []},
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
  });
  const itemCapEvents = [];
  core.coreApplyOpeningItems(itemCap, createSeededRng(9), e => itemCapEvents.push(e),
    () => ({amount: 0, died: false}));
  assert.equal(itemCap.units.p1.filter(u => u && u.hp > 0).length, 14,
    '開戦アイテム召喚が盤面上限を超えている');
  assert.equal(itemCapEvents.filter(e => e.type === 'summon').length, 1,
    '開戦アイテム召喚の上限拒否が機能していない');

  // 召喚本体とリッチ誘発体は、1体ずつ処理される間に親子順を維持する。
  const chained = core.createBattleState({
    sides: {p1: {units: [{id: 'lich', name: 'リッチ', atk: 1, hp: 3, maxHp: 3}]}, p2: {units: []}},
  });
  const chainedEvents = [];
  core.coreSummonUnit(chained, 'p1', {name: 'ペリカン', atk: 1, hp: 1}, e => chainedEvents.push(e), 'lich');
  const chainedSummons = chainedEvents.filter(e => e.type === 'summon');
  assert.deepEqual(chainedSummons.map(e => e.unit.name), ['ペリカン', 'シャドウ'],
    'リッチ誘発の召喚順が本体→シャドウになっていない');
  assert.equal(chainedSummons[1].sourceId, chainedSummons[0].unit.id,
    'リッチ誘発体のsourceIdが直前の召喚体になっていない');
  assert.ok(chained.units.p1.filter(u => u && u.hp > 0).length <= 14,
    '連続召喚で戦闘状態の上限を超えている');
  assert.ok(!chainedSummons.some(e => /^青|^赤|^緑|^黄|^紫/.test(e.unit.name)),
    '召喚キャラクター名に色接頭辞が表示データとして残っている');

  const catState = core.createBattleState({
    sides: {p1: {units: [{id: 'cat', name: 'ケットシー', atk: 3, hp: 4, maxHp: 4}]}, p2: {units: []}},
    summonDefs: [{name: 'ナイトキャット', power: 2, life: 3, color: '黄'}],
  });
  const catEvents = [];
  core.coreApplyInjuryEffects(catState.units.p1[0], 1, catState, createSeededRng(7), e => catEvents.push(e),
    () => ({amount: 0, died: false}));
  const catSummon = catEvents.find(e => e.type === 'summon' && e.unit && e.unit.name === 'ナイトキャット');
  assert.equal(catSummon && catSummon.placement, 'rightOfSource',
    'ナイトキャットがケットシーの右側へ出る配置指定になっていない');

  // 召喚側が仮置きの1/2を持ち込むと、シートのナイトキャット数値が
  // オフライン／オンライン共通コアへ届かず、表示と戦闘値が食い違う。
  const catStatsState = core.createBattleState({
    sides: {p1: {units: [{id: 'cat-stats', name: 'ケットシー', atk: 3, hp: 4, maxHp: 4}]}, p2: {units: []}},
    summonDefs: [{name: 'ナイトキャット', power: 5, life: 8, color: '黄'}],
  });
  const catStatsEvents = [];
  core.coreApplyInjuryEffects(catStatsState.units.p1[0], 1, catStatsState, createSeededRng(8),
    e => catStatsEvents.push(e), () => ({amount: 0, died: false}));
  const catStatsSummon = catStatsEvents.find(e => e.type === 'summon' && e.unit && e.unit.name === 'ナイトキャット');
  assert.equal(catStatsSummon && catStatsSummon.unit.atk, 5,
    'ナイトキャットのATKが召喚定義のシート値ではない');
  assert.equal(catStatsSummon && catStatsSummon.unit.hp, 8,
    'ナイトキャットのHPが召喚定義のシート値ではない');

  // 現在のPvE接続がイベント種別をまとめて処理している場合、旧実装の逐次順序を壊す。
  // この検出結果を失敗として残し、個別カード修正で隠さない。
  const grouped = /else if\s*\(e&&e\.type==='summon'[\s\S]{0,1000}\(events\|\|\[\]\)\.filter\(e=>e&&e\.type==='damage'/.test(currentBattle);
  const findings = [];
  if (grouped) findings.push('PvEイベント再生がsummonを先に一括処理しており、旧実装の逐次順序を壊す可能性');

  const vfxChecks = {
    characterVfxResolver: /getCharacterEffectVfxPath\(/.test(render),
    keywordVfxResolver: /getKeywordEffectVfxPath\(/.test(render),
    onlineVfxOption: /keywordEffect:\s*ev\.keywordEffect/.test(board),
    asyncPlayback: /await\s+_onlineSleep\(/.test(playback),
  };
  assert.ok(vfxChecks.characterVfxResolver && vfxChecks.keywordVfxResolver, 'VFX解決器が存在しない');
  assert.ok(vfxChecks.onlineVfxOption, 'オンラインへVFX種別が渡されていない');
  assert.match(board, /const MAX_SLOTS = 14/, 'オンライン盤面上限がPvEの14体と一致していない');
  // 魔導板スロットの前衛／後衛の区切りをPvE（idx<10=前衛 / idx>=10=後衛）と揃える。
  // レーン・出撃順の規則は共通ビルダー（battle/formation.js）だけが持つ。
  const formationSrc = read('js/battle/formation.js');
  assert.match(formationSrc, /MAIN_BOARD_REAR_SLOTS/,
    '共通ビルダーが魔導板の後衛スロット定義を使っていない');
  assert.match(formationSrc, /_battleSlotForMainBoardSlot\(idx, toRear\)/,
    '共通ビルダーが列マッピングで並び順を決めていない');
  assert.doesNotMatch(versusSrc, /lane: idx/,
    'オンラインが独自にレーンを決めている（共通ビルダーとの二重実装）');
  // 負傷効果の反復回数をPvEとコアで同じ式にする。
  assert.match(currentBattle, /const repeat=1\+coreRingCount\(state,side,'激怒の指輪'\)\+coreEffectCount\(unit,'執念の炎'\)/,
    'PvEの負傷反復回数がコアと同じ式になっていない');
  assert.doesNotMatch(currentBattle, /const repeat=isEnemySide\?1:/,
    'PvEの負傷反復が敵側を一律1回に固定したままになっている');
  // leftOfSource/rightOfSource の反映も present.js が唯一の実装。
  assert.match(presentSrc, /placement === 'leftOfSource' \? sourceIndex : sourceIndex \+ 1/,
    '共通実装がleftOfSource/rightOfSourceを反映していない');
  // 固定長スロット配列へpushすると描画対象外（index>=MAX_SLOTS）へ入り、
  // DOMスロットが作られず「攻撃しているのに画面上は何も起きない」状態になる。
  assert.doesNotMatch(board, /\blist\.push\(summoned\)/,
    'オンライン召喚がスロット配列の末尾へpushしている');
  // 召喚は「その場で姿が出る」演出。保留すると次の死亡まで画面に出ない。
  // ただし常に割り込むと、飛行中の複製の戻り先が動いてカードが二重に見える。
  // DOMがまだ無い召喚体のときだけ割り込む（PvEと同じ規則）。
  assert.match(board, /_summonHasDom\?\{forceRender:true\}:\{forceRender:true,forceDuringMotion:true\}/,
    'オンライン召喚後のFLIP詰め処理がPvEと同じ規則になっていない');
  // 死亡の詰めは攻撃モーションの完了を待つ（飛行中に詰めると戻り先が動く）。
  // イベントごとに詰めてもいけない。出したばかりの数値が行き場を失う。
  assert.match(board, /case ONLINE_EVENT\.DEATH:[\s\S]*requestBattleCompact\(\{forceRender:true\}\)/,
    'オンライン死亡後にFLIP詰め処理を実行していない');
  assert.doesNotMatch(currentBattle, /if\(typeof presentIsPlaying==='function'&&presentIsPlaying\(\)\) return;\n  if\(!G\._battleMotionDepth&&G\._pendingBattleCompact\)/,
    'モーション終了時の保留分を再生中に流せないままになっている');
  assert.match(board, /case 'mana_threshold':[\s\S]*await _awaitManaReverseStart\(source, ev\.side === 'p2'\)/,
    'オンラインのマナ閾値効果がVFX逆再生開始を待っていない');
  assert.match(board, /async function _awaitManaReverseStart\(unit, isEnemy\)/,
    'オンラインのマナ閾値VFX境界処理がない');
  assert.match(board, /liveCount < MAX_SLOTS/, 'オンライン召喚が盤面上限を拒否していない');
  assert.match(board, /const frontCount = list\.filter[\s\S]*summoned\.lane = 'rear'/,
    'オンライン前衛満杯時に召喚体を後衛へ表示できない');
  assert.match(board, /String\(x\.id\) === String\(ev\.unit\.id\)/, 'オンライン召喚のID型違い重複を防止していない');

  const twin = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {p1: {units: [{id: 'twin', name: 'ツインデビル', atk: 2, hp: 1, maxHp: 1,
      summonCount: 1, desc: '開戦：コピーを1体召喚する。'}]}, p2: {units: []}},
  });
  twin._openingPhase = true;
  const twinEvents = [];
  core.coreApplyOpeningEffects(twin.units.p1[0], twin, createSeededRng(2), e => twinEvents.push(e), () => ({amount: 0, died: false}), 0);
  core.coreApplyOpeningEffects(twin.units.p1[0], twin, createSeededRng(2), e => twinEvents.push(e), () => ({amount: 0, died: false}), 0);
  assert.equal(twinEvents.filter(e => e.type === 'summon').length, 1,
    'ツインデビルの開戦コピーが発動していない');
  assert.equal(twinEvents[0].unit._openingDuplicate, true,
    '開戦コピーに再発動防止フラグがない');

  const repeated = core.createBattleState({
    sides: {p1: {units: [{id: 'repeat', name: '試験', atk: 1, hp: 1, maxHp: 1, effectData: {effectNames: ['咆哮']}}]}, p2: {units: []}},
  });
  const repeatedEvents = [];
  core.coreApplyOpeningEffects(repeated.units.p1[0], repeated, createSeededRng(3), e => repeatedEvents.push(e), () => ({amount: 0, died: false}), 0);
  core.coreApplyOpeningEffects(repeated.units.p1[0], repeated, createSeededRng(3), e => repeatedEvents.push(e), () => ({amount: 0, died: false}), 1);
  assert.equal(repeatedEvents.filter(e => e.type === 'stat_change' && e.reason === 'roar').length, 2,
    '正規の開戦反復発動が抑制されている');

  console.log(JSON.stringify({
    baseline: 'git:HEAD（オンライン化前の現リポジトリ基準版）',
    sourceCompare, coreEventTimeline: coreEvents.map(e => ({t:e.t, type:e.type, sourceId:e.sourceId || null, unitId:e.unitId || null, unit:e.unit && e.unit.name || null})),
    vfxChecks,
    findings,
    result: findings.length ? 'FINDINGS' : 'OK',
  }, null, 2));
}
main();
