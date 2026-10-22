#!/usr/bin/env node
'use strict';

// 内蔵シートを本体loaderで読み、常時修正の編成・表示・送信・戦闘入口を検査する。
// DOMの見え方は対象外。修正前に編成・表示・封印・静寂などが失敗することを確認済み。
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {initialize} = require('./run_bot');
const {source} = require('./bot_runtime');
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + (error.stack || error)); }
}
const copy = value => JSON.parse(JSON.stringify(value));
const stats = unit => [unit.atk, unit.hp, unit.maxHp];
const card = no => {
  const def = PANEL_POOL.find(c => c.no === no);
  assert.ok(def, no + ' のシート定義');
  return makePanel(def.id);
};
function fresh({stage = 1, acquired = stage, power = 60, life = 80, fate = true,
  might = false, sealed = false, levels, boon, merged = false} = {}) {
  initState();
  Object.assign(G, {phase: 'reward', _wave: stage, _onlineMode: false, _waveLife: 3});
  G.mainBoard.fill(null); G.rings = []; G.mapPanelPowers = {};
  if (levels) G.runLevels.values = coreNormalizeRunLevels(levels);
  let hero = card('C003');
  hero.power = power; hero.life = life; hero.directions = ['left', 'right'];
  if (merged) { hero = enhancedPanelCopy(hero); assert.ok(hero, 'シートの強化後の姿'); }
  if (sealed) hero.keywords = ['封印99'];
  G.mainBoard[1] = hero;
  if (fate) {
    const enchant = card('E066'); enchant.directions = ['right'];
    if (acquired != null) enchant._engravingStage = acquired;
    if (boon) coreApplyCardBoon(enchant, boon);
    G.mainBoard[0] = enchant;
  }
  if (might) { G.mainBoard[2] = card('E003'); G.mainBoard[2].directions = ['left']; }
  return _getPartyBoardUnit();
}
function formed(board, options = {}) {
  const entry = buildBoardFormation(board, {persistEternal: false, ...options}).ordered.find(e => e.slotIdx === 1);
  assert.ok(entry, '検査キャラクターが編成される');
  entry.unit.id = 'self-1';
  entry.unit.boardCards = _panelSummonDisplayBoardCards(entry.panel, entry.contributingPanels);
  return entry.unit;
}
function opening(raw, {side = 'p1', rings = [], silence = false, stage = G._wave} = {}) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const setup = {seed: 1020, stageNumber: stage, rings: {[side]: rings},
    items: {[other]: silence ? [{name: '静寂の巻物', itemEffectKey: 'silence_scroll'}] : []},
    sides: {[side]: {units: [copy(raw)]}, [other]: {units: [{id: 'foe', atk: 1, hp: 10000, maxHp: 10000}]}}};
  const state = createBattleState(setup), events = [], rng = createSeededRng(setup.seed);
  const runner = createBattleRunner(state, rng, e => events.push(e));
  return {state, events, runner, unit: state.units[side].find(u => u.id === raw.id)};
}
function battle(setup, online) {
  if (online) return simulateOnlineBattle(copy(setup));
  const state = createBattleState(copy(setup)), events = [];
  const result = runBattleCore(state, createSeededRng(setup.seed), {turnLimit: setup.turnLimit, onEvent: e => events.push(e)});
  return {...result, events, finalState: battleCoreFinalState(state)};
}
// 表示用カード・effectDataの格納形だけを除き、コアが確定した値・効果・順序を比較する。
function gameplay(result) {
  const keys = ['type', 'side', 'unitId', 'sourceId', 'attackerId', 'targetId', 'reason', 'effect', 'keyword',
    'amount', 'atk', 'hp', 'maxHp', 'hpAfter', 'damage', 'counterDamage', 'statChange', 'outcome'];
  return {events: result.events.map(e => Object.fromEntries(keys.filter(k => e[k] !== undefined).map(k => [k, e[k]]))),
    outcome: result.outcome, endReason: result.endReason, turns: result.turns,
    units: ['p1', 'p2'].map(side => result.finalState[side].units.map(u =>
      [u.id, ...stats(u), u.keywords, !!u._sealed, !!u._fled]))};
}

(async () => {
  await initialize();
  for (const stage of [1, 2, 3, 4, 5]) check(`ステージ${stage}：編成と魔導板表示へ-${stage * 5}/-${stage * 5}`, () => {
    const board = fresh({stage}), before = copy(G.mainBoard), unit = formed(board);
    assert.deepEqual(stats(unit), [60 - stage * 5, 80 - stage * 5, 80 - stage * 5]);
    assert.deepEqual(_panelCharacterPreviewStats(board, 1, G.mainBoard[1]), {atk: unit.atk, hp: unit.hp});
    assert.deepEqual(stats(formed(board)), stats(unit), '編成の再作成で累積しない');
    assert.deepEqual(G.mainBoard, before, 'カード本体・保存する値へ焼き込まない');
  });
  check('取得ステージを固定、未記録の古いカードは現在ステージ、明示stageNumberも使う', () => {
    let board = fresh({stage: 5, acquired: 2});
    assert.deepEqual(stats(formed(board)), [50, 70, 70]);
    board = fresh({stage: 4, acquired: null});
    assert.deepEqual(stats(formed(board)), [40, 60, 60]);
    assert.deepEqual(stats(formed(board, {stageNumber: 3})), [45, 65, 65]);
    assert.deepEqual(stats(formed(board)), [40, 60, 60], '呼び出し間でステージを保存しない');
  });
  check('開戦で二重減算せず、宿業用のstat_changeや発光を追加しない', () => {
    const raw = formed(fresh({stage: 2})), h = opening(raw);
    assert.deepEqual(stats(h.unit), [50, 70, 70]);
    assert.ok(!h.events.some(e => e.reason === 'fate_engraving'));
    assert.deepEqual(stats(h.events.find(e => e.type === 'battle_start').sides.p1[0]), stats(raw));
  });
  check('内なる大力と合算：60/80＋3/2−10/10、ゴーレム2/4＋3/2−5/5', () => {
    let board = fresh({stage: 2, might: true});
    assert.deepEqual(stats(formed(board)), [54, 73, 73]);
    board = fresh({power: 2, life: 4, might: true});
    assert.deepEqual(stats(formed(board)), [1, 2, 2]);
    assert.deepEqual(_panelCharacterPreviewStats(board, 1, G.mainBoard[1]), {atk: 1, hp: 2});
  });
  check('封印中も内なる大力と同じ編成値を保ち、解放で再減算しない', () => {
    const raw = formed(fresh({stage: 2, might: true, sealed: true})), h = opening(raw);
    assert.deepEqual(stats(h.unit), [54, 73, 73]); assert.ok(coreIsSealed(h.unit));
    h.unit._sealed = false; delete h.unit._sealValue;
    coreApplyReleaseEffects(h.unit, [], h.state, createSeededRng(2), e => h.events.push(e), () => {});
    assert.deepEqual(stats(h.unit), [54, 73, 73]);
  });
  check('静寂でも編成済みの常時修正は残り、静寂解除で再減算しない（両陣営）', () => {
    for (const side of ['p1', 'p2']) {
      const raw = formed(fresh({stage: 2, might: true})), h = opening(raw, {side, silence: true});
      assert.ok(coreUnitIsSilenced(h.unit)); assert.deepEqual(stats(h.unit), [54, 73, 73]);
      coreUnsilenceUnit(h.unit);
      assert.ok(!coreUnitIsSilenced(h.unit)); assert.deepEqual(stats(h.unit), [54, 73, 73]);
    }
  });
  check('祝福は刻印個体へ一度だけ、キャラ本体の祝福・runLevels・強化は基礎値へ先に適用', () => {
    const board = fresh({stage: 4, acquired: 2, might: true, levels: {atk: 2, hp: 3}, boon: {modDelta: 2, modMul: 3}});
    coreApplyCardBoon(G.mainBoard[1], {statMul: 2, modDelta: 9});
    const unit = formed(board);
    assert.deepEqual(stats(unit), [60 * 2 * 2 + 4 - 36, 80 * 2 * 3 + 3 - 36, 80 * 2 * 3 + 3 - 36]);
    assert.deepEqual(_panelCharacterPreviewStats(board, 1, G.mainBoard[1]), {atk: unit.atk, hp: unit.hp});
    const mergedBoard = fresh({stage: 2, merged: true});
    assert.deepEqual(stats(formed(mergedBoard)), [G.mainBoard[1].power - 10, G.mainBoard[1].life - 10, G.mainBoard[1].life - 10]);
  });
  check('同名2枚も取得ステージ・祝福を個別に合算、復活時も同じ値で掛け直す', () => {
    const board = fresh({stage: 5, acquired: 1});
    const second = card('E066'); second._engravingStage = 2; second.directions = ['left'];
    coreApplyCardBoon(second, {modMul: 2}); G.mainBoard[2] = second;
    const raw = formed(board); raw.keywords = ['復活'];
    assert.deepEqual(stats(raw), [35, 55, 55]);
    const h = opening(raw); h.unit.hp = 0;
    coreTryRevive(h.unit, h.state, e => h.events.push(e), createSeededRng(1020), () => {});
    assert.deepEqual(stats(h.unit), [5, 15, 15], '基礎60/80の半分−5−20');
  });
  check('キャラクター用説明文・ホバー・エンチャント本文のXは取得時ステージと祝福に一致', () => {
    const board = fresh({stage: 5, acquired: 2, boon: {modDelta: 2, modMul: 3}});
    const desc = _groupedEnchantEffectTexts(board, 1).charTexts.join('\n');
    assert.match(desc, /「宿業の刻印」の効果で-36\/-36/); assert.ok(!desc.includes('X'));
    const preview = {...G.mainBoard[1], boardCards: G.mainBoard};
    assert.match(_unitPreviewText(preview, '', 1), /-36\/-36/);
    assert.match(_stageEngravingDescription(G.mainBoard[0], G.mainBoard[0].desc), /-36\/-36/);
  });
  check('復活時の熟練も通常の常時マイナス修正と同じ入口で加算する', () => {
    const raw = formed(fresh({stage: 2})); raw.keywords = ['復活', '熟練2'];
    const h = opening(raw); h.unit.hp = 0;
    coreTryRevive(h.unit, h.state, e => h.events.push(e), createSeededRng(1020), () => {});
    assert.deepEqual(stats(h.unit), [18, 28, 28], '本体60/80の半分−(10＋熟練2)');
  });
  check('HP0は獰猛と同じ0下限・瞳の救済、開戦前HP0に死亡効果・観測・復活を新規発動しない', () => {
    const board = fresh({power: 50, life: 2}), raw = formed(board);
    raw.keywords.push('復活'); raw.manaOnDeath = 2;
    assert.deepEqual(stats(raw), [45, 0, 0]); assert.equal(raw._deployedAtZeroHp, true);
    assert.deepEqual(_panelCharacterPreviewStats(board, 1, G.mainBoard[1]), {atk: 45, hp: 0});
    const h = opening(raw);
    assert.equal(h.unit.hp, 0); assert.equal(h.state.resources.p1.mana, 0);
    assert.ok(!h.events.some(e => ['death', 'revive'].includes(e.type)));
    const eye = copy(RING_POOL.find(r => r.name === '赤い瞳の指輪'));
    G.mainBoard[1].color = '赤'; raw.color = '赤'; G.rings = [eye];
    assert.deepEqual(stats(opening(raw, {rings: [eye]}).unit), [55, 10, 10]);
    assert.deepEqual(_panelCharacterPreviewStats(board, 1, G.mainBoard[1]), {atk: 55, hp: 10});
    const referenceBoard = fresh({fate: false, power: 50, life: 2});
    G.mainBoard[0] = card('E034'); G.mainBoard[0].directions = ['right'];
    const reference = opening(formed(referenceBoard));
    assert.equal(reference.unit.hp, 0); assert.ok(!reference.events.some(e => e.type === 'death'));
  });
  check('PvE編成→オンラインpayload→コア→receiverの能力値・固定ステージ・戦闘結果が一致', () => {
    const receiverSource = source('js/online/board.js');
    const start = receiverSource.indexOf('  function _fieldUnit('), end = receiverSource.indexOf('\n  // 前衛・後衛', start);
    const receiver = vm.runInNewContext('(' + receiverSource.slice(start, end).trim() + ')', {_cardInfo: {p1: new Map(), p2: new Map()}});
    for (const sealed of [false, true]) for (const side of ['p1', 'p2']) {
      const board = fresh({stage: 5, acquired: 2, might: true, sealed}), raw = formed(board);
      const payload = copy(buildOnlineSelfFormation()), sent = payload.units[0];
      assert.deepEqual([sent.atk, sent.hp], [raw.atk, raw.hp]);
      assert.deepEqual(sent._engravingStages, raw._engravingStages);
      const other = side === 'p1' ? 'p2' : 'p1';
      const setup = {seed: 1020, stageNumber: payload.stageNumber, turnLimit: 8,
        sides: {[side]: {units: [raw]}, [other]: {units: [{id: 'foe', atk: 1, hp: 10000, maxHp: 10000}]}}};
      const pve = battle(setup, false); setup.sides[side].units = [sent];
      const online = battle(setup, true);
      assert.deepEqual(gameplay(online), gameplay(pve));
      const initial = online.events.find(e => e.type === 'battle_start').sides[side][0];
      const received = receiver(initial, side);
      assert.deepEqual(stats(received), stats(raw));
      assert.equal(received.boardCards[1]._engravingStage, 2, '説明用の取得ステージもreceiverへ届く');
    }
  });
  check('宿業でHP0の編成も0のまま送信・受信し、瞳の有無でPvEとオンラインの結果が一致', () => {
    const receiverSource = source('js/online/board.js');
    const start = receiverSource.indexOf('  function _fieldUnit('), end = receiverSource.indexOf('\n  // 前衛・後衛', start);
    const receiver = vm.runInNewContext('(' + receiverSource.slice(start, end).trim() + ')', {_cardInfo: {p1: new Map(), p2: new Map()}});
    for (const withEye of [false, true]) {
      const board = fresh({power: 50, life: 2}); G.mainBoard[1].color = '赤';
      if (withEye) G.rings = [copy(RING_POOL.find(r => r.name === '赤い瞳の指輪'))];
      const raw = formed(board), payload = copy(buildOnlineSelfFormation()), sent = payload.units[0];
      assert.equal(sent.hp, 0); assert.equal(sent._deployedAtZeroHp, true);
      const setup = {seed: 1020, stageNumber: 1, turnLimit: 4, rings: payload.rings,
        sides: {p1: {units: [raw]}, p2: {units: [{id: 'foe', atk: 1, hp: 10000, maxHp: 10000}]}}};
      const pve = battle(setup, false); setup.sides.p1.units = [sent];
      const online = battle(setup, true);
      assert.deepEqual(gameplay(online), gameplay(pve));
      assert.deepEqual(stats(receiver(online.events.find(e => e.type === 'battle_start').sides.p1[0], 'p1')), [45, 0, 0]);
      assert.equal(online.events.some(e => e.type === 'stat_change' && e.reason === 'color_ring'), withEye);
    }
  });
  console.log(`宿業の刻印1020e：${passed}件OK / ${failed}件NG`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
