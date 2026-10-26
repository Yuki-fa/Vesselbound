'use strict';
// 内蔵CSVを正とし、実コア・presenter・両受け口・保存再生・攻撃モーションを通す。
// DOMと時計だけを代用する。VB_SOURCE_REF=<開始時main> で修正前の複製表示も再現できる。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const sheet = require('./sheet_data');
const h = require('./presentation_1020b_harness');
const { makeElement } = require('./stub');
const BASELINE = '2bdffaecbd6f8dfc25c028b26a0546104effe4c9';
const copy = h.clone, slots = new Map(), clones = [], updates = [];
let passed = 0, failed = 0;
let updateStats, verifyDisplay = true;
async function check(label, run) {
  if (process.env.VB_ONLY && !new RegExp(process.env.VB_ONLY).test(label)) return;
  try { await run(); passed++; console.log('OK ' + label); }
  catch (e) { failed++; console.error('NG ' + label + '\n' + e.stack); }
}
function runtimeSource(file) {
  return process.env.VB_SOURCE_REF
    ? execFileSync('git', ['show', `${process.env.VB_SOURCE_REF}:prototype/${file}`], { encoding: 'utf8', maxBuffer: 2e6 })
    : fs.readFileSync(require('node:path').resolve(__dirname, '../..', file), 'utf8');
}
function card(no, enhanced = false) {
  const def = PANEL_POOL.find(c => c.no === no); assert.ok(def, no);
  return enhanced ? enhancedPanelCopy(makePanel(def.id)) : makePanel(def.id);
}
function unit(no, enhanced = false, extra = {}, enchants = []) {
  const c = card(no, enhanced);
  return { ..._makePanelSummonUnit(_panelSummonSpec(c), []), id: no,
    atk: 4, hp: 60, maxHp: 60, effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 },
    boardCards: enchants, _adjacentPanelEffectTexts: enchants.map(e => e.desc),
    _resonanceEffectNames: enchants.map(e => e.name), ...extra };
}
const plain = (id, extra = {}) => ({ id, name: id, atk: 1, hp: 100, maxHp: 100,
  color: '赤', keywords: [], desc: '', effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 }, ...extra });
function fixture(side = 'p1', enhanced = false, extra = {}) {
  const { minoEnhanced = false, resonanceEnhanced = false, copies = 1, additions = [], foeHp = 100, ...options } = extra;
  const enchants = [...Array.from({ length: copies }, () => card('E037', enhanced)), card('E054', resonanceEnhanced), ...additions];
  const other = side === 'p1' ? 'p2' : 'p1';
  return h.setup({ sides: { [side]: { units: [unit('C014', minoEnhanced, {}, enchants), plain('same'), plain('different', { color: '青' })] },
    [other]: { units: [plain('foe', { hp: foeHp, maxHp: foeHp })] } }, summonDefs: [...PANEL_POOL, ...ENEMY_POOL],
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, ...options });
}
// 実DOMの代わりに数字・HPバー・表示状態を持つ。複製に設定した座標や書式も保持する。
function slot(id) {
  const root = makeElement(), nodes = {};
  root.dataset.unitId = id; root.isConnected = true;
  root.getBoundingClientRect = () => ({ left: 100, top: 200, width: 95, height: 140, right: 195, bottom: 340 });
  root.style.getPropertyPriority = () => '';
  root.style.setProperty = (k, v) => { root.style[k] = String(v); };
  root.style.removeProperty = k => { delete root.style[k]; };
  root.classList = { add() {}, remove() {}, contains: () => false };
  for (const key of ['a', 'h', 'fill', 'bar', 'stats']) {
    nodes[key] = makeElement(); const classes = new Set();
    nodes[key].classList = { add: (...cs) => cs.forEach(c => classes.add(c)), remove: (...cs) => cs.forEach(c => classes.delete(c)),
      contains: c => classes.has(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c) };
    nodes[key].style.left = '7px'; nodes[key].style.fontSize = '12px';
  }
  Object.defineProperty(nodes.stats, 'innerHTML', {
    get: () => JSON.stringify(['a', 'h'].map(k => ({ text: nodes[k].textContent,
      left: nodes[k].style.left, fontSize: nodes[k].style.fontSize }))),
    set: value => JSON.parse(value).forEach((n, i) => {
      const el = nodes[i ? 'h' : 'a']; el.textContent = n.text; el.style.left = n.left; el.style.fontSize = n.fontSize;
    }),
  });
  root.querySelector = selector => ({ '.slot-stats': nodes.stats, '.slot-stats .a': nodes.a, '.slot-stats .h': nodes.h,
    '.slot-life-fill': nodes.fill, '.slot-life-bar': nodes.bar })[selector] || null;
  root.remove = () => { root.isConnected = false; };
  return root;
}
function numbers(el) { return ['a', 'h'].map(k => Number(el.querySelector('.slot-stats .' + k).textContent)); }
function paint(el, u) {
  el.querySelector('.slot-stats .a').textContent = presentShownAtk(u);
  el.querySelector('.slot-stats .h').textContent = presentShownHp(u);
  el.querySelector('.slot-life-fill').style.width = `${presentShownHp(u) / presentShownMaxHp(u) * 100}%`;
}
function render() {
  for (const u of [...G.allies || [], ...G.enemies || []].filter(Boolean)) {
    if (!slots.has(u.id)) slots.set(u.id, slot(u.id));
    // 通常の再描画も盤面の実枠だけを描く。複製への同期をテスト側で補わない。
    paint(slots.get(u.id), u);
  }
}
function updateFrom(source) {
  const start = source.indexOf('function updateUnitDamageUi(');
  return vm.runInThisContext('(' + source.slice(start, source.indexOf('// 戦闘中、ATK/HP', start)) + ')', { filename: 'real-updateUnitDamageUi.js' });
}
function installDisplay() {
  let now = 1000;
  global.performance.now = Date.now = () => now;
  global.setTimeout = (fn, ms, ...args) => {
    queueMicrotask(() => { now += Math.max(0, Number(ms) || 0); fn(...args); }); return 0;
  };
  global.battlePresentationSetTimeout = global.setTimeout;
  global.sleep = async ms => { now += Math.max(0, Number(ms) || 0); };
  updateStats = updateFrom(runtimeSource('js/engine/render.js'));
  global.updateUnitDamageUi = (u, side) => {
    updateStats(u, side);
    const visible = clones.filter(c => c.isConnected && c.dataset.unitId === u.id && c.style.opacity !== '0').at(-1);
    updates.push({ id: u.id, expected: [presentShownAtk(u), presentShownHp(u)],
      shown: numbers(visible || slots.get(u.id)), moving: !!visible });
    if (visible && verifyDisplay) {
      assert.deepEqual(numbers(visible), [presentShownAtk(u), presentShownHp(u)], '動いている複製もイベントごとの数値を表示する');
      assert.equal(visible.querySelector('.slot-life-fill').style.width,
        slots.get(u.id).querySelector('.slot-life-fill').style.width, '複製のHPバーも同時に進む');
      for (const k of ['a', 'h']) {
        assert.equal(visible.querySelector('.slot-stats .' + k).style.left, '17px');
        assert.equal(visible.querySelector('.slot-stats .' + k).style.fontSize, '43px', '数字更新で複製の座標・書式を壊さない');
      }
    }
  };
  const get = document.getElementById;
  document.getElementById = id => ['f-ally', 'f-enemy'].includes(id) ? {
    querySelectorAll: () => (id === 'f-ally' ? G.allies : G.enemies).filter(Boolean).map(u => slots.get(u.id)).filter(Boolean),
  } : get(id);
  global.getCurrentUnitSlot = (side, u) => slots.get(typeof u === 'object' ? u.id : (side === 'enemy' ? G.enemies : G.allies)[u]?.id) || null;
  global.renderAll = global.renderField = global.requestBattleCompact = render;
  global._buildMotionCardClone = source => {
    const clone = slot(source.dataset.unitId);
    clone.querySelector('.slot-stats').innerHTML = source.querySelector('.slot-stats').innerHTML;
    for (const k of ['a', 'h']) {
      const el = clone.querySelector('.slot-stats .' + k); el.style.left = '17px'; el.style.fontSize = '43px';
    }
    clone.querySelector('.slot-life-fill').style.width = source.querySelector('.slot-life-fill').style.width;
    clones.push(clone); return clone;
  };
  global._getAttackTargetRect = el => el.getBoundingClientRect();
  global._battleLayoutSignature = () => '';
  global._battleDomLayoutMatchesUnits = () => true;
  global._attackLayoutIsMoving = () => false;
  global._waitForAttackLayoutSettled = async () => true;
  // 待機・入れ子・接触・復帰は本番のモーションを使う。停止を無視すると接触ダメージを先取りする。
  global.playAttackMotion = (a, b, enemy, pause, options) => _playAttackMotionCore(a, b, enemy, pause, options);
}
function resetDisplay() { slots.clear(); clones.length = updates.length = 0; presentResetLabEvents(); }
async function holdMotion(id) {
  if (!id) return async () => {};
  const a = [...G.allies, ...G.enemies].find(u => u?.id === id), enemy = G.enemies.includes(a);
  const target = (enemy ? G.allies : G.enemies).find(u => u?.hp > 0);
  assert.ok(a && target);
  let ready, release;
  const stopped = new Promise(resolve => { release = resolve; }), paused = new Promise(resolve => { ready = resolve; });
  const motion = playAttackMotion(a, target, enemy, () => { ready(); return stopped; }, { stopRatio: .25 });
  await paused;
  return async () => { release(); await motion; };
}
async function display(x, pausedId) {
  const serialized = JSON.stringify(x.events);
  for (const u of [...x.before.p1, ...x.before.p2].filter(Boolean)) {
    const live = x.find(u.id); if (live) presentHoldShown(live, u.atk, u.hp, u.maxHp, u.shield || 0, u.weaken || 0);
  }
  resetDisplay(); render();
  const release = await holdMotion(pausedId);
  try { await x.pve(); } finally { await release(); }
  const pve = copy(updates);
  assert.ok(pve.some(u => u.moving), '実際に動く複製を検査する');
  assert.equal(clones.filter(c => c.isConnected).length, 0, '入れ子のモーションが複製を残さない');
  resetDisplay();
  if (!pausedId) await x.online();
  else {
    const result = { events: [{ type: 'battle_start', sides: copy(x.before) }, ...copy(x.events)],
      formations: Object.fromEntries(['p1', 'p2'].map(side => [side, { units: x.before[side], rings: x.state.rings[side], items: x.state.items[side] }])) };
    beginOnlineVersusField(result); render(); let releaseOnline;
    try {
      await playOnlineBattleEvents(result, { onEvent: async (e, ctx) => {
        await renderOnlineVersusBoard(e, ctx);
        if (e.type === 'battle_start') releaseOnline = await holdMotion(pausedId);
      } });
    } finally { await releaseOnline?.(); hideOnlineVersusBoard(); }
  }
  assert.deepEqual(updates, pve, 'PvEとオンラインの各表示更新');
  assert.equal(JSON.stringify(x.events), serialized, '演出で元のイベント列を変更しない');
  return pve;
}
function verifyPenance(x, side, count, reactions, buffs) {
  const self = x.events.filter(e => e.type === 'damage' && e.unitId === 'C014' && e.damageKind === 'attack_effect');
  assert.equal(self.length, count); assert.ok(self.every(e => e.amount === 1));
  assert.equal(x.events.filter(e => e.type === 'attack' && e.immediate && e.attackerId === 'C014').length, count * reactions);
  for (const id of ['C014', 'same']) {
    const stats = x.events.filter(e => e.type === 'stat_change' && e.unitId === id && e.reason === 'resonance');
    assert.equal(stats.length, (1 + count * reactions) * buffs, '本来の攻撃1回＋負傷からの各割り込み攻撃');
    assert.ok(stats.every(e => e.atk === 1 && e.hp === 1 && e.side === side));
  }
  assert.ok(!x.events.some(e => e.type === 'stat_change' && e.unitId === 'different' && e.reason === 'resonance'));
  const firstHit = x.events.indexOf(self[0]);
  assert.equal(x.events.slice(0, firstHit).filter(e => e.reason === 'resonance' && e.unitId === 'C014').length, buffs,
    '本来の攻撃の共振を、最初の自傷より前に独立して出す');
}
function initRun() {
  initState(); G._runId = 'resonance-1026'; G._runSeed = 1026; G._runRngState = 1026;
  G._wave = G._waveStage = G.floor = 1; G._waveLife = 3;
}
const eventCopy = events => SaveRun.copy(events.map(({ pveRewardGold, ...e }) => e));
async function pipelines(initial) {
  initial.life = { p1: 3, p2: 3 }; initial.maxLife = { p1: 3, p2: 3 };
  // 1手の再現用ハーネスだけの先手固定を外し、両入口とも本来の先手抽選を使う。
  delete initial._coreFirstSide;
  const seed = 10261026, state = SaveRun.copy(initial), events = [], rng = createSeededRng(seed);
  coreInitializeBattleState(state);
  const runner = createBattleRunner(state, rng, e => events.push(SaveRun.copy(e)));
  while (!runner.result && state.turn < BATTLE_CORE_TURN_LIMIT) { runner.step({ deferCompact: true }); runner.compact(); }
  const result = runner.finish(), next = rng.next(), originalRng = createSeededRng;
  let captured;
  createSeededRng = value => { const r = originalRng(value); if (value === seed) captured = r; return r; };
  let saved, online;
  try {
    saved = SaveRun.computeBattle(copy(initial), seed); assert.equal(captured.next(), next);
    online = simulateOnlineBattle({ ...copy(initial), seed,
      sides: { p1: { units: initial.units.p1 }, p2: { units: initial.units.p2 } } });
    assert.equal(captured.next(), next);
  } finally { createSeededRng = originalRng; }
  assert.deepEqual(eventCopy(saved.events), eventCopy(events));
  assert.deepEqual(eventCopy(online.events), eventCopy(events)); assert.equal(online.outcome, result.outcome);
  const stats = list => SaveRun.copy(list.map(u => coreUnitSnapshot({ ...u,
    boardCards: u.boardCards || [...initial.units.p1, ...initial.units.p2].find(v => v.id === u.id)?.boardCards || [] })));
  for (const side of ['p1', 'p2']) {
    assert.deepEqual(stats(saved.finalState.units[side]), stats(state.units[side]));
    assert.deepEqual(stats(online.finalState[side].units), stats(state.units[side]));
  }
  assert.deepEqual(SaveRun.computeBattle(copy(saved.setup), seed), saved);
  const unpacked = SaveRun.unpackBattleEvents(copy(SaveRun.packBattleEvents(saved)));
  assert.deepEqual(unpacked, saved);
  initRun(); const checkpoint = SaveRun.buildRunSave('battle', unpacked);
  SaveRun.restoreRunState(copy(checkpoint)); SaveRun.installSetup(unpacked);
  G._battleRunId = 1026; G._battleCoreEvents = []; G._coreDrivenBattle = true;
  const original = { _flushCorePveHitEvents, finishBattleAsVictory, handleBattleDefeat };
  let frameIndex = 0;
  global._flushCorePveHitEvents = async (s, es, before) => {
    const frame = saved.frames[frameIndex++];
    assert.deepEqual(es, saved.events.slice(frame.from, frame.to), '保存フレームの全イベント');
    resetDisplay(); render(); await original._flushCorePveHitEvents(s, es, before);
    assert.ok(updates.every(u => JSON.stringify(u.expected) === JSON.stringify(u.shown)), '保存再生の複製も各イベントと一致');
  };
  global.finishBattleAsVictory = global.handleBattleDefeat = async () => SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
  try {
    await SaveRun.replay(unpacked, 1026); assert.equal(frameIndex, saved.frames.length - 1);
    for (const [side, units] of [['p1', G.allies], ['p2', G.enemies]])
      assert.deepEqual(stats(units.filter(Boolean)), stats(saved.finalState.units[side]), '保存再生の終戦後も同じ最終状態');
  }
  finally { Object.assign(global, original); }
}
function unchangedMain() {
  const context = { module: { exports: {} } };
  const source = execFileSync('git', ['show', `${BASELINE}:prototype/js/battle/core.js`], { encoding: 'utf8', maxBuffer: 2e6 });
  // effects-1026c: コアの改訂後も非対象の結果・イベント・乱数を比較する。
  vm.runInNewContext(source, context);
  const baseline = context.module.exports, current = require('../../js/battle/core'); let compared = 0;
  const run = (api, input, seed) => {
    const state = api.createBattleState(copy(input)), events = [], rng = createSeededRng(seed);
    const result = api.runBattleCore(state, rng, { turnLimit: 6, onEvent: e => events.push(e) });
    return copy({ result, events, finalState: api.battleCoreFinalState(state), nextRandom: rng.next() });
  };
  // effects-1026cで直した強化C016・R019だけを除き、通常／強化・両陣営・複数seedを比較する。
  for (const row of [...sheet.sheetRows('card'), ...sheet.sheetRows('enchant')]) {
    const def = PANEL_POOL.find(c => c.no === row['No.']); if (!def) continue;
    for (const enhanced of [false, true]) for (const side of ['p1', 'p2']) for (const seed of [1, 1026, 261026]) {
      if(row['No.']==='C016'&&enhanced) continue;
      const c = { ...copy(def), desc: sheet.effectText(row['No.'], enhanced) };
      const own = def.category === 'キャラクター'
        ? { ..._makePanelSummonUnit(_panelSummonSpec(c), []), id: 'subject', atk: 4, hp: 60, maxHp: 60 }
        : plain('subject', { boardCards: [c], _adjacentPanelEffectTexts: [c.desc] });
      const other = side === 'p1' ? 'p2' : 'p1';
      const input = { sides: { [side]: { units: [own, plain('ally')] }, [other]: { units: [plain('foe', { hp: 5, maxHp: 5 }), plain('foe2')] } },
        resources: { p1: { mana: 8, gold: 800 }, p2: { mana: 8, gold: 800 } }, summonDefs: PANEL_POOL };
      assert.deepEqual(run(current, input, seed), run(baseline, input, seed), `${row['No.']}/${enhanced}/${side}/${seed}`); compared++;
    }
  }
  for (const ring of RING_POOL.filter(r => r._implemented !== false && r.no !== 'R019')) {
    const input = { sides: { p1: { units: [plain('one'), plain('two')] }, p2: { units: [plain('foe'), plain('foe2')] } },
      rings: { p1: [ring] }, resources: { p1: { mana: 15, gold: 800 } }, summonDefs: PANEL_POOL };
    assert.deepEqual(run(current, input, 1026), run(baseline, input, 1026), ring.no); compared++;
  }
  // 修正対象の組み合わせでもルールとイベントを変えていないことを明示する。
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    const x = fixture(side, enhanced), input = { ...copy(x.state), sides: Object.fromEntries(['p1', 'p2'].map(s => [s, { units: x.state.units[s] }])) };
    assert.deepEqual(run(current, input, 1026), run(baseline, input, 1026)); compared++;
  }
  assert.ok(compared > 2400); console.log(`  ${compared}戦闘：開始時main ${BASELINE.slice(0, 7)} と結果・全イベント・最終状態・次の乱数が完全一致`);
}
(async () => {
  await h.ready; installDisplay();
  await check('内蔵シート：共振は攻撃効果、明示的なN回ダメージの全件を列挙', () => {
    assert.equal(sheet.effectText('E054'), '攻撃：全ての同じ色の味方に+1/+1を与える。');
    const repeat = ['card', 'enchant', 'enemy'].flatMap(k => sheet.sheetRows(k)).filter(r => /ダメージを\d+回(?:受ける|与える)/.test(r['効果'] + r['強化効果']));
    assert.deepEqual(repeat.map(r => r['No.']), ['C001', 'C013', 'C016', 'C027', 'E037']);
  });
  await check('開始時mainの描画で、最初の表示だけATKが2増える現象を再現', async () => {
    const fixed = updateStats;
    try {
      updateStats = updateFrom(execFileSync('git', ['show', `${BASELINE}:prototype/js/engine/render.js`], { encoding: 'utf8', maxBuffer: 2e6 }));
      verifyDisplay = false;
      const x = fixture(); createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true }).step();
      const shown = (await display(x)).filter(u => u.id === 'C014').map(u => u.shown[0]);
      const changes = shown.filter((n, i) => i === 0 || n !== shown[i - 1]);
      assert.deepEqual(changes, [4, 6, 7], '本来の共振を見せず、最初の割り込みで+2、その後は+1になる');
    } finally { updateStats = fixed; verifyDisplay = true; }
  });
  for (const enhanced of [false, true]) await check(`実際の魔導板/${enhanced}: 接続→PvE出撃・オンラインpayload→表示・保存再生`, async () => {
    initRun(); G.mainBoard.fill(null); G.mapPanelPowers = {};
    _pveOpeningSummonState = _pveLiveCoreState = null;
    G.mainBoard[1] = { ...card('C014'), directions: ['down', 'right'] };
    G.mainBoard[6] = { ...card('E037', enhanced), directions: ['up', 'right'] };
    G.mainBoard[2] = { ...card('E054'), directions: ['left', 'down'] };
    const payload = buildOnlineSelfFormation();
    await applyNewPanelBattleStart({ deferOpeningEffects: true, persistEternal: false });
    const live = G.allies.find(Boolean), sent = payload.units[0];
    assert.ok(live && sent);
    assert.deepEqual(live._adjacentPanelEffectTexts.slice().sort(), [sheet.effectText('E037', enhanced), sheet.effectText('E054')].sort());
    for (const key of ['atk', 'hp', 'desc', '_adjacentPanelEffectTexts', '_resonanceEffectNames']) assert.deepEqual(live[key], sent[key], key);
    // 本番入口と同じ既定値を一度揃える（未指定の0とeffectData:{}の差を作らない）。
    const x = h.setup({ sides: { p1: { units: [{ ...live, id: sent.id, hp: 60, maxHp: 60,
      effectData: { releaseAtkBonus: 0, releaseHpBonus: 0, ...live.effectData } }] }, p2: { units: [plain('foe')] } },
      summonDefs: [...PANEL_POOL, ...ENEMY_POOL], resources: { p1: { mana: 0 }, p2: { mana: 0 } } });
    const initial = SaveRun.copy(x.state);
    createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true }).step();
    const self = x.events.filter(e => e.type === 'damage' && e.unitId === sent.id && e.damageKind === 'attack_effect');
    assert.equal(self.length, enhanced ? 4 : 2);
    const stats = x.events.filter(e => e.reason === 'resonance' && e.unitId === sent.id);
    assert.equal(stats.length, self.length + 1); assert.ok(stats.every(e => e.atk === 1 && e.hp === 1));
    await display(x); await pipelines(initial);
  });
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    await check(`${side}/${enhanced}: ミノタウロス＋懺悔＋共振、各1回の実表示・オンライン`, async () => {
      const x = fixture(side, enhanced); x.state._coreFirstSide = side;
      createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true }).step();
      verifyPenance(x, side, enhanced ? 4 : 2, 1, 1);
      const shown = (await display(x)).filter(u => u.id === 'C014');
      const atk = shown.filter((u, i) => i === 0 || u.shown[0] !== shown[i - 1].shown[0]).map(u => u.shown[0]);
      assert.deepEqual(atk, Array.from({ length: (enhanced ? 4 : 2) + 1 }, (_, i) => 5 + i), '最初も以後もATKは1ずつ表示される');
    });
    await check(`${side}/${enhanced}: 強化ミノタウロス・共振の反復・懺悔2枚を区別`, async () => {
      const x = fixture(side, enhanced, { minoEnhanced: true, resonanceEnhanced: true, copies: 2, foeHp: 2000 }); x.state._coreFirstSide = side;
      createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true }).step();
      verifyPenance(x, side, enhanced ? 8 : 4, 2, 2); await display(x);
    });
    await check(`${side}/${enhanced}: PvE計算・オンライン計算・保存→読込→実再生の全イベント`, async () => {
      const x = fixture(side, enhanced); await pipelines(SaveRun.copy(x.state));
    });
    for (const no of ['C001', 'C013', 'C016', 'C027']) await check(`${side}/${enhanced}: ${no}の各ダメージ→負傷攻撃→共振`, async () => {
      const other = side === 'p1' ? 'p2' : 'p1', mino = unit('C014', false, {}, [card('E054')]);
      const source = unit(no, enhanced, { id: 'source' });
      const sameSide = ['C013', 'C016'].includes(no);
      const options = { sides: { [side]: { units: [mino, ...sameSide ? [source] : []] },
        [other]: { units: [plain('wall', { hp: 500, maxHp: 500 }), ...sameSide ? [] : [source]] } },
        resources: { p1: { mana: 0 }, p2: { mana: 0 } }, summonDefs: [...PANEL_POOL, ...ENEMY_POOL] };
      const x = h.setup(options), initial = SaveRun.copy(x.state);
      const actor = x.find('source');
      if (no === 'C013' || no === 'C001') {
        if (no === 'C001') {
          // 実際の3マナ付与をミノタウロスの攻撃相手へ載せる。
          x.state.units[other] = x.state.units[other].filter(u => u.id === 'source');
          G.enemies = x.state.units.p2; G.allies = x.state.units.p1;
          x.before[other] = x.before[other].filter(u => u.id === 'source');
        }
        x.state.resources[actor.side].mana = 3;
        coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit);
        if (no === 'C001') {
          assert.equal(actor.effectData.grantedInjuryEffects.length, 1);
          x.hit(x.find('C014'), actor, 1);
        }
      } else if (no === 'C016') coreApplyAttackEffects(actor, x.state, x.rng, x.emit, x.hit);
      else x.hit(x.find('C014'), actor, 10000, false, true);
      // effects-1026c: C016強化も本文どおり2回。
      // 今回は表示の二重化を直し、単体戦闘のコアも開始時mainと一致させる指定に従い維持する。
      const repetitions = enhanced ? 2 : 1;
      const cause = x.events.filter(e => e.type === 'damage' && e.unitId === 'C014' && e.damageKind !== 'combat');
      assert.equal(cause.length, repetitions, 'N回それぞれが独立した被弾');
      const buffs = x.events.filter(e => e.reason === 'resonance' && e.unitId === 'C014');
      assert.equal(buffs.length, repetitions); assert.ok(buffs.every(e => e.atk === 1 && e.hp === 1));
      // 攻撃停止中に別の効果から負傷しても、見えている元の複製へ1回ずつ反映する。
      await display(x, 'C014');
      // C001は実マナ付与を開戦から再現する。その他も通常の戦闘入口で保存・再生を検査する。
      if (no === 'C001') {
        initial.units[other] = initial.units[other].filter(u => u.id === 'source');
        initial.resources[other].mana = 3;
      }
      if (no === 'C013') initial.resources[side].mana = 3;
      await pipelines(initial);
    });
    await check(`${side}/${enhanced}: 懺悔＋逆襲・治癒能力の負傷修正も1件ずつ表示`, async () => {
      const x = fixture(side, enhanced, { additions: [card('E001'), card('E012')] }); x.state._coreFirstSide = side;
      createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true }).step();
      assert.ok(x.events.some(e => e.type === 'stat_change' && e.unitId === 'C014' && e.atk === 2 && e.hp === 1));
      assert.ok(x.events.some(e => e.type === 'stat_change' && e.unitId === 'C014' && e.atk === 0 && e.hp === 3));
      await display(x);
    });
  }
  await check('対象外も含む全カードが開始時mainのコアと完全一致', unchangedMain);
  console.log(`共振1026: OK ${passed} / NG ${failed}`); process.exitCode = failed ? 1 : 0;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
