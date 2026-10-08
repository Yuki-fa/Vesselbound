'use strict';
// 2026-10-07: 反撃の結界、召喚体の指輪補正、召喚直後の攻撃の戻りをNodeで再現する。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const core = require('../../js/battle/core');
const present = require('../../js/battle/present');
const { createSeededRng } = require('../../js/online/protocol');
Object.assign(global, { createSeededRng, createBattleState: core.createBattleState,
  runBattleCore: core.runBattleCore, battleCoreFinalState: core.battleCoreFinalState, ONLINE_PROTOCOL_VERSION: 1 });
const { simulateOnlineBattle } = require('../../js/online/sim');
const { sheetRows } = require('./sheet_data');
const ROOT = path.resolve(__dirname, '../..'), failures = [];
let cases = 0;
async function check(label, fn) {
  try { await fn(); cases++; console.log('OK ' + label); }
  catch (e) { failures.push(label + ': ' + e.message); console.error('NG ' + label + ': ' + e.message); }
}
const rows = sheetRows('card'), rings = sheetRows('ring');
function card(name, id, overrides = {}) {
  const row = rows.find(r => r['名前'] === name);
  assert.ok(row, 'シートにキャラクターがない: ' + name);
  const desc = row['効果'] || '', mana = desc.match(/^(\d+)マナ(毎)?[：:]\s*(.+)$/);
  return { id, name, no: row['No.'], color: row['カラー'], race: row['種族'],
    atk: Number(row['パワー']), hp: Number(row['ライフ']), maxHp: Number(row['ライフ']), desc,
    keywords: String(row['キーワード'] || '').split(/[\s　、,]+/).filter(Boolean),
    manaCost: mana ? Number(mana[1]) : 0, manaRepeat: !!(mana && mana[2]),
    manaThresholdDesc: mana ? mana[3] : '', ...overrides };
}
function ring(name) {
  const row = rings.find(r => r['名前'] === name);
  assert.ok(row, 'シートに指輪がない: ' + name);
  return { name, no: row['No.'], desc: row['効果'] };
}
const summonDefs = rows.map(r => card(r['名前'], r['No.']));
const plain = (id, extra = {}) => ({ id, name: '検査用', atk: 1, hp: 1000, maxHp: 1000,
  color: '青', keywords: [], desc: '', ...extra });
function harness(side, units, ringNames = [], extra = {}) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = core.createBattleState({ sides: { [side]: { units }, [other]: { units: [plain('target')] } },
    rings: { [side]: ringNames.map(ring) }, summonDefs, ...extra });
  const events = [], rng = createSeededRng(1007), emit = e => events.push(e);
  const hit = (s, t, n, counter, skipSourceEffects, skipTough, opt) =>
    core.coreResolveHit(state, s, t, n, counter, rng, emit, { skipSourceEffects, skipTough, ...(opt || {}) });
  const source = state.units[side][0]; source._currentAttackTarget = state.units[other][0];
  return { state, events, rng, emit, hit, source, other };
}
function oneStrike(units, target = plain('target', { atk: 5 }), ringNames = []) {
  const h = harness('p1', units, ringNames);
  h.state.units.p2 = [core.createCoreUnit(target, 'p2', 0)];
  h.state._coreFirstSide = 'p1';
  core.createBattleRunner(h.state, h.rng, h.emit).step({ deferCompact: true });
  return h;
}
function contactShield(events, attackerId) {
  const index = events.findIndex(e => e.type === 'attack' && e.attackerId === attackerId && e.attackVisual !== false);
  assert.ok(index >= 0, '攻撃がない');
  const lost = events.find(e => e.type === 'shield_lost' && e.unitId === attackerId);
  assert.ok(lost, '反撃で結界を消費していない');
  assert.ok(present.presentAttackContactHitEvents(events, index).includes(lost), '反撃の結界消失が接触対象から漏れた');
  // JSON保存後も同じイベントを選ぶ（オブジェクト同一性や現在盤面に依存しない）。
  const replay = JSON.parse(JSON.stringify(events));
  assert.ok(present.presentAttackContactHitEvents(replay, index).some(e => e.type === 'shield_lost' && e.unitId === attackerId));
}

// 実際のVbFxと攻撃モーションを動かす仮DOM。時刻とrAFだけ手動で進める。
function motionHarness() {
  let clock = 0, seq = 0;
  const frames = new Map(), timers = new Map(), slots = new Map(), traces = [], sounds = [];
  function style(initial = []) {
    const values = new Map(initial), priority = new Map();
    return new Proxy({
      setProperty(k, v, p = '') { values.set(k, String(v)); priority.set(k, p); },
      getPropertyValue: k => values.get(k) || '', getPropertyPriority: k => priority.get(k) || '',
      removeProperty(k) { const old = values.get(k); values.delete(k); priority.delete(k); return old || ''; },
      copy: () => [...values],
    }, { get: (o, k) => k in o ? o[k] : values.get(k) || '',
      set: (o, k, v) => { values.set(k, String(v)); return true; } });
  }
  function drawingContext() {
    return new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (o, k) => k in o ? o[k] : () => {} });
  }
  function element(id = '', classes = []) {
    const classNames = new Set(classes), e = { id, nodeType: 1, dataset: {}, style: style(), children: [],
      isConnected: false, offsetWidth: 95, offsetHeight: 140, rect: { left: 100, top: 550, width: 95, height: 140 },
      classList: { add: (...v) => v.forEach(c => classNames.add(c)), remove: (...v) => v.forEach(c => classNames.delete(c)),
        contains: c => classNames.has(c) },
      getContext: drawingContext, hasAttribute: () => false, closest: () => null,
      setAttribute(k, v) { this[k] = String(v); }, removeAttribute() {}, addEventListener() {},
      getBoundingClientRect() {
        const r = { ...this.rect }, move = this.style.transform.match(/translate\(([-\d.]+)(?:px)?,\s*([-\d.]+)(?:px)?\)/);
        if (move) { r.left += Number(move[1]); r.top += Number(move[2]); }
        r.right = r.left + r.width; r.bottom = r.top + r.height; return r;
      },
      querySelectorAll(selector) {
        const descendants = this.children.flatMap(c => [c, ...c.querySelectorAll('*')]);
        if (selector === '*') return descendants;
        return descendants.filter(c => selector.split(',').some(s => {
          const names = [...s.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
          if (!names.length || !names.every(n => c.classList.contains(n))) return false;
          if (s.includes('[data-unit-id]') && !c.dataset.unitId) return false;
          return true;
        }));
      },
      querySelector(s) { return this.querySelectorAll(s)[0] || null; },
      appendChild(c) { if (c.parentNode) c.remove(); this.children.push(c); c.parentNode = c.parentElement = this; c.isConnected = this.isConnected; return c; },
      remove() { this.isConnected = false; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; },
      cloneNode() { const n = element(this.id, [...classNames]); n.dataset = { ...this.dataset }; n.style = style(this.style.copy()); n.rect = { ...this.rect }; return n; },
    };
    if (id) e.dataset.unitId = id;
    return e;
  }
  const body = element(), screen = element('', ['active']), ally = element(), enemy = element();
  body.isConnected = true; body.appendChild(screen); body.appendChild(ally); body.appendChild(enemy);
  const ctx = { console, URL, Uint8Array, Uint8ClampedArray, Uint32Array, Map, Set, WeakMap, WeakSet,
    Path2D: function(d) { this.d = d; },
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, addEventListener() {}, removeEventListener() {},
    DOMMatrixReadOnly: class { constructor() { this.a = 1; this.b = 0; } },
    performance: { now: () => clock }, requestAnimationFrame: fn => { const id = ++seq; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, ms = 0) => { const id = ++seq; timers.set(id, { fn, at: clock + ms }); return id; }, clearTimeout: id => timers.delete(id),
    document: { body, baseURI: 'file:///prototype/index.html', createElement: () => element(), createElementNS: () => element(),
      getElementById: id => ({ 'scr-battle': screen, 'f-ally': ally, 'f-enemy': enemy })[id] || null,
      querySelectorAll: s => body.querySelectorAll(s), querySelector: s => body.querySelector(s), addEventListener() {} },
    getComputedStyle: e => new Proxy({ getPropertyValue: k => e.style.getPropertyValue(k),
      visibility: e.style.visibility || 'visible', display: 'block', opacity: e.style.opacity || '1',
      filter: e.style.filter || 'none', transform: e.style.transform || 'none' }, { get: (o, k) => k in o ? o[k] : '' }),
    G: { phase: 'battle', allies: [], enemies: [] }, _vfxClipLayer: () => body,
  };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['js/battle/present.js', ...require('../vfx_export').RUNTIME_SCRIPTS, 'js/engine/battle_fx.js', 'js/engine/render.js', 'js/battle/present_events.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  Object.assign(ctx, { _gameScale: () => 1, _getAttackTargetRect: e => e.getBoundingClientRect(),
    getCurrentUnitSlot: (_side, u) => slots.get(u.id), _syncEffectFlashWithVfx() {}, renderAll() {},
    _recordBattleTrace: (type, data) => traces.push({ type, ...data }),
    playSfx: (code, opt) => { sounds.push({ code, opt }); return true; },
    getKeywordEffectSfxKey: k => k === '結界' ? 'K018' : '', updateUnitShieldUi() {},
  });
  const unit = plain('summoned', { side: 'p1', atk: 4, hp: 11, maxHp: 11, shield: 1, keywords: ['眷属'] });
  const target = plain('target', { side: 'p2', hp: 100, maxHp: 100 });
  ctx.G.allies = [unit]; ctx.G.enemies = [target];
  for (const [u, parent, top] of [[unit, ally, 550], [target, enemy, 140]]) {
    const e = element(u.id, ['slot']); e.rect.top = top; parent.appendChild(e); slots.set(u.id, e);
  }
  async function frame(stepMs = 16) {
    clock += stepMs;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
    const pending = [...frames]; frames.clear(); pending.forEach(([, fn]) => fn(clock));
    for (let i = 0; i < 6; i++) await Promise.resolve();
  }
  async function settle(promise) {
    let done = false, error; promise.then(() => { done = true; }, e => { done = true; error = e; });
    for (let i = 0; i < 300 && !done; i++) await frame();
    assert.ok(done, '仮DOMの再生が終了する'); if (error) throw error;
  }
  return { ctx, unit, target, slots, traces, sounds, frame, settle, clones: () => body.querySelectorAll('.attack-motion-clone[data-unit-id]') };
}

async function run() {
  await check('通常攻撃の反撃結界は接触に含まれる', () => {
    const h = oneStrike([plain('A', { keywords: ['結界1'] })]); contactShield(h.events, 'A');
  });
  await check('常時効果を挟む反撃結界も接触に含まれる', () => {
    const h = oneStrike([plain('A', { keywords: ['結界1'] }), plain('passive', {
      desc: '常時：キャラクターがダメージを受けるたび、このキャラクターは+1/+1を得る。' })]); contactShield(h.events, 'A');
  });
  await check('召喚体の即時攻撃の反撃結界も接触に含まれる', () => {
    const h = oneStrike([card('スケルトンキング', 'king', { hp: 100, maxHp: 100 })], undefined, ['光の指輪']);
    const summon = h.events.find(e => e.type === 'summon'); assert.ok(summon);
    contactShield(h.events, summon.unit.id);
  });
  await check('負傷効果による即時攻撃の反撃結界も接触に含まれる', () => {
    const h = harness('p1', [plain('injury-attack', { keywords: ['結界1'], desc: '負傷：直ちにランダムな敵に攻撃する。' })]);
    h.source.shield = 1;
    core.coreApplyInjuryEffects(h.source, 1, h.state, h.rng, h.emit, h.hit);
    contactShield(h.events, h.source.id);
  });
  await check('割り込み攻撃を挟んでも、元の攻撃への反撃結界だけ拾う', () => {
    const attack = { type: 'attack', attackerId: 'A', targetId: 'T', immediate: true };
    const direct = { type: 'damage', side: 'p2', unitId: 'T', sourceId: 'A', damageKind: 'attack_effect', amount: 1 };
    const other = { type: 'attack', attackerId: 'T', targetId: 'A', immediate: true };
    const incoming = { type: 'damage', side: 'p1', unitId: 'A', sourceId: 'T', damageKind: 'combat', amount: 0, blockedBy: 'shield' };
    const lostOther = { type: 'shield_lost', side: 'p1', unitId: 'A', shield: 1 };
    const counter = { ...incoming, counter: true, damageKind: 'attack_effect' };
    const lost = { ...lostOther, shield: 0 };
    const events = [attack, direct, other, incoming, lostOther, { type: 'damage', ...direct, counter: true }, counter, lost];
    assert.deepEqual(present.presentAttackContactHitEvents(events, 0), [counter, lost]);
  });
  await check('後続の別効果・ATK攻撃・次の攻撃を接触へ繰り上げない', () => {
    const a = { type: 'attack', attackerId: 'A', targetId: 'T' };
    const hit = { type: 'damage', sourceId: 'A', unitId: 'T', side: 'p2', amount: 2, damageKind: 'combat' };
    const effect = { ...hit, amount: 3, damageKind: 'injury_effect', effect: true };
    const other = { ...hit, sourceId: 'next' };
    assert.deepEqual(present.presentAttackContactHitEvents([a, hit, effect, { ...a, attackerId: 'next' }, other], 0), [hit]);
    assert.deepEqual(present.presentAttackContactHitEvents([a, { type: 'stat_change' }, { ...hit, damageTo: 'atk' }], 0), []);
  });
  for (const side of ['p1', 'p2']) {
    const routes = [
      ['スケルトンキング', '青', h => core.coreApplyAttackEffects(h.source, h.state, h.rng, h.emit, h.hit)],
      ['ダイアウルフ', '緑', h => core.coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit)],
      ['ケットシー', '黄', h => core.coreApplyInjuryEffects(h.source, 1, h.state, h.rng, h.emit, h.hit)],
      ['デスナイト', '青', h => { h.source.hp = 0; core.coreApplyDeathEffects(h.source, h.state, h.rng, h.emit, h.hit); }],
    ];
    for (const [name, color, invoke] of routes) await check(`${side}/${name}の召喚に色・虹・召喚師・光の指輪`, () => {
      const colorRing = rings.find(r => String(r['効果']).includes(`全ての${color}の味方は+10/+10`)); assert.ok(colorRing);
      const h = harness(side, [card(name, 'source', { hp: 100, maxHp: 100 }), plain('peer', { color: '赤' })],
        [colorRing['名前'], '虹の瞳の指輪', '召喚師の指輪', '光の指輪'], { resources: { [side]: { mana: 3 } } });
      invoke(h);
      const spawned = h.events.filter(e => e.type === 'summon'); assert.ok(spawned.length);
      for (const ev of spawned) {
        const def = summonDefs.find(d => d.no === ev.unit.no); assert.ok(def);
        const per = core.coreRainbowRingBonusForUnits(h.state.units[side]);
        const live = h.state.units[side].find(u => u.id === ev.unit.id);
        const base = side === 'p2' ? { atk: live._baseAtk, hp: live._baseMaxHp } : { atk: def.atk, hp: def.maxHp };
        assert.equal(ev.unit.atk, base.atk + 10 + 5 + per, '召喚時ATK');
        assert.equal(ev.unit.maxHp, base.hp + 10 + 5 + per, '召喚時最大HP');
        assert.equal(ev.unit.shield, core.coreUnitShieldValue(core.createCoreUnit(def, side, 0)) + 1, '光の指輪');
        assert.ok(ev.unit.keywords.includes('眷属'));
      }
    });
    await check(`${side}/スケルトンの復活後も色・虹・召喚師・光が残る`, () => {
      const h = harness(side, [plain('source')], ['青い瞳の指輪', '虹の瞳の指輪', '召喚師の指輪', '光の指輪']);
      const child = core.coreSummonUnit(h.state, side, { name: '青スケルトン', color: '青' }, h.emit, h.source.id);
      const baseAtk = child._baseAtk, baseHp = child._baseMaxHp;
      child.hp = 0; child.shield = 0;
      assert.equal(core.coreTryRevive(child, h.state, h.emit), '復活');
      assert.equal(child.atk, Math.floor(baseAtk / 2) + 10 + 3 + 5);
      assert.equal(child.maxHp, Math.max(1, Math.floor(baseHp / 2)) + 10 + 3 + 5);
      assert.equal(child.shield, 1); assert.ok(child.keywords.includes('眷属'));
      assert.equal(h.state._summonCount[side], 1, '復活は召喚累計を増やさない');
    });
    await check(`${side}/指輪復活・根性・値を引き継ぐコピーへ二重加算しない`, () => {
      const h = harness(side, [plain('source')], ['青い瞳の指輪', '虹の瞳の指輪']);
      const child = core.coreSummonUnit(h.state, side, { name: '青スケルトン', color: '青', atk: 33, hp: 44, maxHp: 44, _inheritsStats: true }, h.emit, h.source.id);
      const base = side === 'p2' ? { atk: child._baseAtk, hp: child._baseMaxHp } : { atk: 33, hp: 44 };
      assert.equal(child.atk, base.atk); assert.equal(child.maxHp, base.hp);
      child.keywords = ['眷属', '根性']; child.hp = 0;
      assert.equal(core.coreTryRevive(child, h.state, h.emit), '根性'); assert.equal(child.atk, base.atk); assert.equal(child.maxHp, base.hp);
      const h2 = harness('p1', [plain('source')], ['青い瞳の指輪', '虹の瞳の指輪', '復活の指輪']);
      const c2 = core.coreSummonUnit(h2.state, 'p1', { name: '青スケルトン', color: '青' }, h2.emit, h2.source.id);
      const before = [c2.atk, c2.maxHp]; c2.hp = 0; core.coreTryRevive(c2, h2.state, h2.emit);
      assert.deepEqual([c2.atk, c2.maxHp], before);
    });
    await check(`${side}/鏡で増えた色・虹の指輪と今回の召喚色を数える`, () => {
      const h = harness(side, [plain('source', { color: '赤' })], ['鏡の指輪', '青い瞳の指輪', '鏡の指輪', '虹の瞳の指輪']);
      // 鏡の指輪は右隣の指輪を写す。青は今回の体で初めて加わる色。
      const child = core.coreSummonUnit(h.state, side, { name: '青スケルトン', color: '青' }, h.emit, h.source.id);
      assert.equal(child.atk, child._baseAtk + 20 + 12);
      assert.equal(child.maxHp, child._baseMaxHp + 20 + 12);
      assert.equal(child._rainbowRingBonus, 6);
    });
    await check(`${side}/無色の召喚体へ無関係な指輪の色補正を付けない`, () => {
      const h = harness(side, [plain('source')], ['召喚師の指輪', '光の指輪']);
      const child = core.coreSummonUnit(h.state, side, { name: '無色の検査用', color: '', atk: 2, hp: 3 }, h.emit, 'item-source');
      assert.equal(child.atk, 7); assert.equal(child.maxHp, 8); assert.equal(child.shield, 1);
    });
  }
  await check('指輪つき即時召喚・復活のPvE／オンライン／JSON保存再生が一致', () => {
    const names = ['青い瞳の指輪', '虹の瞳の指輪', '召喚師の指輪', '光の指輪'];
    const setup = { seed: 100707, turnLimit: 20, summonDefs,
      rings: { p1: names.map(ring), p2: names.map(ring) },
      sides: { p1: { units: [card('スケルトンキング', 'king', { hp: 100, maxHp: 100 })] },
        p2: { units: [card('ケットシー', 'cat', { atk: 40, hp: 200, maxHp: 200 })] } } };
    const copy = v => JSON.parse(JSON.stringify(v));
    const state = core.createBattleState(copy(setup));
    const events = [];
    core.runBattleCore(state, createSeededRng(setup.seed), { turnLimit: setup.turnLimit, onEvent: e => events.push(e) });
    const online = simulateOnlineBattle(copy(setup)), saved = simulateOnlineBattle(copy(JSON.parse(JSON.stringify(setup))));
    assert.deepEqual(online.events, events); assert.deepEqual(online.finalState, core.battleCoreFinalState(state));
    assert.deepEqual(saved.events, events); assert.deepEqual(saved.finalState, online.finalState);
    assert.ok(events.some(e => e.type === 'summon'));
    assert.ok(events.some(e => e.type === 'revive' && String(e.unitId).includes('-summon-')));
    const replay = copy(events);
    replay.forEach((ev, i) => {
      if (ev.type !== 'attack') return;
      assert.deepEqual(present.presentAttackContactHitEvents(replay, i), copy(present.presentAttackContactHitEvents(events, i)));
    });
  });
  await check('present_parityの追加5場面と生成したブラウザ用スクリプトは構文が正しい', () => {
    const file = path.join(ROOT, 'tools/parity/present_parity.js'), source = fs.readFileSync(file, 'utf8');
    const data = vm.runInNewContext(source.slice(0, source.indexOf('(async () => {'))
      + '\n({ SCENARIOS, pveScript, onlineScript });', { require: require('node:module').createRequire(file), process });
    for (const scene of data.SCENARIOS.slice(0, 5)) {
      new vm.Script('(async () => {' + data.pveScript(scene) + '})()');
      new vm.Script('(async () => {' + data.onlineScript(scene) + '})()');
      const unit = ([name, id, extra]) => rows.some(r => r['名前'] === name) ? card(name, id, extra) : plain(id, extra);
      const result = simulateOnlineBattle({ seed: scene.seed, turnLimit: 30, summonDefs,
        sides: { p1: { units: scene.p1.map(unit) }, p2: { units: scene.p2.map(unit) } },
        rings: { p1: scene.rings.p1.map(ring) } });
      for (const type of scene.requires) assert.ok(result.events.some(e => e.type === type), scene.name + ': ' + type);
      if (scene.summonStats) {
        const expected = scene.summonStats, children = result.events.filter(e => e.type === 'summon' && e.unit.name === expected.name);
        assert.ok(children.length, scene.name + ': 召喚なし');
        for (const { unit: child } of children) assert.deepEqual([child.atk, child.maxHp, child.shield], [expected.atk, expected.hp, expected.shield]);
      }
    }
  });
  for (const firstFrameMs of [16, 600]) await check(`召喚直後の攻撃は接触から戻り終端まで可視（初回rAF ${firstFrameMs}ms）`, async () => {
    const h = motionHarness();
    h.unit.keywords.push('復活');
    h.ctx.battleFxSyncUnit(h.unit, 'ally', h.slots.get(h.unit.id));
    h.ctx._battleFxFollowStates();
    await h.settle(h.ctx.playSummonAppearVfx(h.unit, 'ally'));
    assert.ok(h.ctx.VbFx.activeCount() > 0, '登場の後半が攻撃開始時も続く');
    let contact = false, done = false, returned = 0;
    const motion = h.ctx.playAttackMotion(h.unit, h.target, false, null, { onContact: () => { contact = true; } });
    motion.then(() => { done = true; });
    // 素材デコードなどで最初の描画が遅れると、登場VFXの終了タイマーが先に走る。
    // この時点ではクローンへVFXが付け替わっておらず、コピーしたopacityが残っていた。
    await h.frame(firstFrameMs);
    for (let i = 0; i < 100 && !done; i++) {
      await h.frame(); const clone = h.clones()[0];
      if (contact && clone) {
        assert.ok(Number(h.ctx.getComputedStyle(clone).opacity) > .95, '戻るクローンの透明度: ' + clone.style.opacity);
        assert.equal(h.slots.get(h.unit.id).style.visibility, 'hidden', '戻り中に元のカードを表示しない');
        returned++;
      }
    }
    await motion; assert.ok(returned >= 10, '接触後も戻りの中間フレームが見える');
    assert.equal(h.clones().length, 0); assert.equal(h.unit._motionHidden, false);
    assert.ok(h.traces.some(t => t.type === 'attack_motion_end'));
    h.ctx.stopBattleLabFx();
  });
  await check('接触で攻撃側の結界ループ・破壊VFX・K018を各1回だけ進める', async () => {
    const h = motionHarness();
    h.ctx.battleFxSyncUnit(h.unit, 'ally', h.slots.get(h.unit.id)); h.ctx._battleFxFollowStates(); await h.frame();
    assert.ok(h.ctx.VbFx.snapshot().some(s => s.name === 'shield-state'));
    const events = [{ type: 'attack', attackerId: h.unit.id, targetId: h.target.id, immediate: true },
      { type: 'damage', side: 'p2', unitId: h.target.id, sourceId: h.unit.id, amount: 4, damageKind: 'attack_effect' },
      { type: 'damage', side: 'p1', unitId: h.unit.id, sourceId: h.target.id, amount: 0, counter: true, damageKind: 'attack_effect', blockedBy: 'shield' },
      { type: 'shield_lost', side: 'p1', unitId: h.unit.id, shield: 0 }];
    const damage = [];
    await h.ctx.presentAttackContactHits(events, 0, { damage: ev => { damage.push(ev); return true; },
      shield: { findUnit: () => h.unit } });
    assert.equal(h.ctx.VbFx.snapshot().some(s => s.name === 'shield-state'), false, '接触でループ停止');
    assert.equal(h.ctx.VbFx.snapshot().filter(s => s.name === 'shield-break').length, 1);
    assert.equal(h.sounds.filter(s => s.code === 'K018').length, 1);
    h.ctx.presentShieldLostEvent(events[3], { findUnit: () => h.unit });
    assert.equal(h.sounds.filter(s => s.code === 'K018').length, 1, '通常再生時に重ねない');
    assert.equal(damage.length, 1, '即時攻撃の正の効果ダメージは後続イベントの順番を維持'); h.ctx.stopBattleLabFx();
  });
  console.log(`attack_summon_regression: OK ${cases}, NG ${failures.length}`);
  if (failures.length) process.exitCode = 1;
}
run().catch(e => { console.error(e.stack); process.exitCode = 1; });
