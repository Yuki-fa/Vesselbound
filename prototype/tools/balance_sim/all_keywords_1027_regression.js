'use strict';
// 全キーワード＋開戦召喚。計算・イベント・次の乱数を作業開始時のmainと比較し、
// 実際の状態VFXを手動rAFで進めて、詰め／攻撃のtransformを奪わないことも確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { sheetRows } = require('./sheet_data');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
const ROOT = path.resolve(__dirname, '../..');
const BASE_REF = process.env.VB_BASE_REF || 'ea83fd13a37a5f3575856f56fbc47b6e535fff02';
const KEYWORDS = ['貫通','復活','邪眼2','毒牙2','衝撃1','二段攻撃','隠密','先制','熟練1','生命吸収','三方向攻撃','結界'];
const copy = x => JSON.parse(JSON.stringify(x));
function unit(no, id, extra = {}) {
  const row = sheetRows('card').find(r => r['No.'] === no);
  assert.ok(row, no);
  return { id, no, name: row['名前'], color: row['カラー'], race: row['種族'],
    atk: Number(row['パワー']), hp: Number(row['ライフ']), maxHp: Number(row['ライフ']),
    desc: row['効果'] || '', keywords: String(row['キーワード'] || '').split(/[\s、,]+/).filter(Boolean),
    lane: 'front', _panelSummoned: true, ...extra };
}
const summonDefs = sheetRows('card').map(r => unit(r['No.'], r['No.']));
function variants() {
  return [[], ...KEYWORDS.map((_, i) => KEYWORDS.slice(0, i + 1)),
    ...KEYWORDS.filter(k => k !== '隠密').map(k => ['隠密', k]), ['隠密'], ['隠密','三段攻撃','全体攻撃','防戦','根性']];
}
function fixture(keywords = KEYWORDS, side = 'p1', lane = 'front', no = 'C060') {
  const other = side === 'p1' ? 'p2' : 'p1';
  const plain = (id, l) => ({ id, name: id, no: 'C006', atk: 2, hp: 50, maxHp: 50, lane: l, keywords: [], desc: '' });
  return { seed: 1027, turnLimit: 8, summonDefs: copy(summonDefs),
    sides: { [side]: { units: [unit(no, 'actor', { lane, keywords: [...keywords], hp: 30, maxHp: 30 }), plain('support', lane === 'front' ? 'rear' : 'front')] },
      [other]: { units: [plain('f0', 'front'), plain('f1', 'front'), plain('f2', 'front'), plain('r0', 'rear')] } } };
}
function run(engine, setup) {
  const state = engine.createBattleState(copy(setup)), rng = createSeededRng(setup.seed || 1027), events = [];
  const result = engine.runBattleCore(state, rng, { turnLimit: setup.turnLimit || 8, onEvent: e => events.push(e) });
  return copy({ result, events, final: engine.battleCoreFinalState(state), next: rng.next() });
}
function calculationChecks() {
  const baseline = { module: { exports: {} }, exports: {}, console };
  vm.createContext(baseline);
  vm.runInContext(execFileSync('git', ['show', BASE_REF + ':prototype/js/battle/core.js'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 4e6 }), baseline);
  let count = 0;
  const check = setup => {
    const actual = run(core, setup), expected = run(baseline.module.exports, setup);
    assert.deepEqual(actual, expected, '開始時mainとの結果・イベント・次の乱数の差');
    assert.deepEqual(run(core, copy(setup)), actual, '保存した入力からの再計算');
    for (const side of ['p1', 'p2']) {
      const ids = actual.final[side].units.map(u => u.id);
      assert.equal(new Set(ids).size, ids.length, '同じ体の重複配置');
    }
    count++;
    return actual;
  };
  for (const side of ['p1', 'p2']) for (const lane of ['front', 'rear']) for (const keywords of variants()) {
    const result = check(fixture(keywords, side, lane));
    const summons = result.events.filter(e => e.type === 'summon' && e.sourceId === 'actor');
    const expected = Number(unit('C060', 'actor').desc.match(/(\d+)体/)[1]);
    assert.equal(summons.length, expected, 'ミテーラの召喚数');
    assert.ok(summons.every(e => e.unit.lane === 'front'), '後衛からも前衛へ召喚');
    assert.ok(summons.every(e => !e.unit.keywords.includes('隠密')), '召喚元の隠密を眷属へ写さない');
  }
  // 対象外の全キャラクターも比較する。表示のみの修正なので許容差は一切設けない。
  for (const row of sheetRows('card').filter(r => r['実装'] !== 'false')) check(fixture([], 'p1', 'front', row['No.']));
  console.log(`OK 全キーワード1027 計算${count}件：開始時mainと結果・全イベント・次の乱数が完全一致、JSON保存入力も一致`);
}

function visualHarness(sourceRef) {
  let time = 0, seq = 0;
  const frames = new Map(), slots = new Map(), clones = [];
  function style() {
    const values = new Map(), priorities = new Map();
    return new Proxy({
      setProperty(k, v, p = '') { values.set(k, String(v)); priorities.set(k, p); },
      getPropertyValue: k => values.get(k) || '', getPropertyPriority: k => priorities.get(k) || '',
      removeProperty(k) { values.delete(k); priorities.delete(k); },
    }, { get: (o, k) => k in o ? o[k] : values.get(k) || '', set: (o, k, v) => { values.set(k, String(v)); return true; } });
  }
  function drawingContext() {
    return new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (o, k) => k in o ? o[k] : () => {} });
  }
  function element(id = '', cls = '') {
    const classes = new Set(cls.split(/\s+/).filter(Boolean));
    const e = { nodeType: 1, dataset: id ? { unitId: id } : {}, children: [], style: style(), isConnected: true,
      offsetWidth: 95, offsetHeight: 140,
      classList: { contains: c => classes.has(c), add: (...v) => v.forEach(c => classes.add(c)), remove: (...v) => v.forEach(c => classes.delete(c)) },
      get className() { return [...classes].join(' '); }, set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
      matches(s) { return s.split(',').some(q => [...q.matchAll(/\.([\w-]+)/g)].length && [...q.matchAll(/\.([\w-]+)/g)].every(m => classes.has(m[1]))); },
      querySelectorAll(s) { const all = this.children.flatMap(c => [c, ...c.querySelectorAll('*')]); return s === '*' ? all : all.filter(c => c.matches(s)); },
      querySelector(s) { return this.querySelectorAll(s)[0] || null; }, closest() { return null; }, hasAttribute() { return false; },
      getContext: drawingContext, setAttribute() {}, removeAttribute() {}, addEventListener() {},
      getBoundingClientRect() { return { left: 400, top: 550, width: 95, height: 140, right: 495, bottom: 690 }; },
      appendChild(c) { c.remove(); this.children.push(c); c.parentNode = c.parentElement = this; c.isConnected = true; return c; },
      insertBefore(c, ref) { c.remove(); this.children.splice(this.children.indexOf(ref), 0, c); c.parentNode = c.parentElement = this; c.isConnected = true; return c; },
      remove() { this.isConnected = false; if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = this.parentElement = null; },
      cloneNode() { const n = element('', this.className); n.dataset = { ...this.dataset }; for (const k of ['transform','opacity','filter','transition']) n.style.setProperty(k, this.style.getPropertyValue(k), this.style.getPropertyPriority(k)); this.children.forEach(c => n.appendChild(c.cloneNode(true))); return n; },
    };
    return e;
  }
  const body = element(), screen = element('', 'active');
  const ctx = { console, URL, Uint8ClampedArray, Map, Set, WeakMap, WeakSet, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, performance: { now: () => time },
    requestAnimationFrame(fn) { frames.set(++seq, fn); return seq; }, cancelAnimationFrame: id => frames.delete(id), setTimeout: () => ++seq, clearTimeout() {},
    document: { body, baseURI: 'file:///prototype/index.html', createElement: () => element(), getElementById: id => id === 'scr-battle' ? screen : null,
      querySelectorAll: s => s.includes('attack-motion-clone') ? clones.filter(c => c.isConnected) : [], querySelector: () => null },
    getComputedStyle: e => new Proxy({ getPropertyValue: k => e.style.getPropertyValue(k), visibility: 'visible', opacity: e.style.opacity || '1',
      display: 'block', filter: e.style.filter || 'none', transform: e.style.transform || 'none' }, { get: (o, k) => k in o ? o[k] : '' }),
    DOMMatrixReadOnly: class { constructor() { this.a = this.d = 1; this.b = this.c = 0; } },
    G: { phase: 'battle', allies: [], enemies: [] }, _vfxClipLayer: () => body, _gameScale: () => 1,
    getCurrentUnitSlot: (_side, u) => slots.get(u.id) || null,
  };
  ctx.window = ctx; vm.createContext(ctx);
  for (const file of ['js/battle/present.js', ...require('../vfx_export').RUNTIME_SCRIPTS, 'js/engine/battle_fx.js', 'js/engine/render_attack_motion.js']) {
    const source = sourceRef && ['js/engine/battle_fx.js','js/engine/render_attack_motion.js'].includes(file)
      ? execFileSync('git', ['show', sourceRef + ':prototype/' + file], { cwd: ROOT, encoding: 'utf8', maxBuffer: 4e6 })
      : fs.readFileSync(path.join(ROOT, file), 'utf8');
    vm.runInContext(source, ctx, { filename: file });
  }
  function frame() {
    time += 16;
    const pending = [...frames]; frames.clear(); pending.forEach(([, fn]) => fn(time));
  }
  function start(keywords) {
    ctx.stopBattleLabFx(); frames.clear(); slots.clear(); clones.length = 0;
    const u = unit('C060', 'actor', { keywords, hp: 40, maxHp: 40, shield: keywords.includes('結界') ? 1 : 0 });
    const slot = element(u.id, 'slot unit-card'); slot.appendChild(element('', 'unit-portrait'));
    ctx.G.allies = [u]; slots.set(u.id, slot);
    return { u, slot };
  }
  return { ctx, slots, clones, frame, start, element };
}
function displayChecks(sourceRef) {
  const h = visualHarness(sourceRef);
  let count = 0;
  for (const keywords of variants()) {
    const { u, slot } = h.start(keywords);
    slot.style.setProperty('transform', 'translate(-130px,0px)', 'important');
    h.ctx.battleFxSyncUnit(u, 'ally', slot); h.frame(); h.frame();
    for (const transform of ['none', 'translate(75px,-200px)', 'translate(0px,0px)']) {
      slot.style.setProperty('transform', transform, 'important'); h.frame();
      assert.equal(slot.style.transform, transform, '状態ループが詰め／攻撃のtransformを上書き: ' + keywords.join('・'));
    }
    const clone = h.ctx._buildMotionCardClone(slot, slot.getBoundingClientRect());
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      if (el !== clone) assert.ok(!el.style.opacity || el.style.opacity === '1', '複製へVFX中の透明度を残さない');
    }
    h.clones.push(clone); h.frame(); h.frame();
    clone.style.setProperty('transform', 'translate(75px,-200px)', 'important'); h.frame();
    assert.equal(clone.style.transform, 'translate(75px,-200px)', '攻撃複製の移動を状態ループが上書き');
    clone.remove(); h.frame(); h.frame();
    slot.style.setProperty('transform', 'none', 'important'); h.frame();
    assert.equal(slot.style.transform, 'none', '戻り後に古い移動量を復元');
    const next = h.element(u.id, 'slot unit-card'); next.appendChild(h.element('', 'unit-portrait'));
    slot.remove(); h.slots.set(u.id, next); h.frame(); h.frame();
    assert.ok(!next.style.transform || next.style.transform === 'none', '再描画で旧移動量が残る');
    u._deathFxReady = true; h.frame();
    assert.equal(h.ctx.VbFx.activeCount(), 0, '死亡時に状態を終了');
    count++;
  }
  h.ctx.stopBattleLabFx();
  console.log(`OK 全キーワード1027 実VFX${count}組：詰め・攻撃・複製・戻り・DOM再生成・死亡の干渉なし`);
}
async function routeChecks() {
  // 数値の受け渡しは実際の受け口でも比較する。ここだけは描画を既存ハーネスへ任せ、
  // 本物の状態VFX・複製の検査は上の独立した手動rAFで行う。
  const h = require('./presentation_1020b_harness'); await h.ready;
  const stats = units => Object.fromEntries(['p1','p2'].map(side => [side, (units[side] || []).filter(u => u && u.hp > 0)
    .map(u => [u.id,u.atk,u.hp,u.lane]).sort((a,b) => String(a[0]).localeCompare(String(b[0])))]));
  const drawNames = ['renderHandEditor','renderRewCards','_syncRewardProductionUi','_playItemUseVfx'];
  const draws = drawNames.map(name => global[name]); drawNames.forEach(name => { global[name] = () => {}; });
  try {
    for (const lane of ['front','rear']) {
      initState(); G._debugMode = true; G.phase = 'reward'; G.mapPanelPowers = {};
      const index = lane === 'rear' ? MAIN_BOARD_REAR_SLOTS[0] : MAIN_BOARD_FRONT_SLOTS[0];
      const card = makePanel(PANEL_POOL.find(c => c.no === 'C060').id);
      G.mainBoard.fill(null); G.mainBoard[index] = card;
      for (const keyword of KEYWORDS) {
        const n = /^(.*?)(\d+)$/.exec(keyword), base = n ? n[1] : keyword;
        const def = ITEM_POOL.find(i => _itemGrantedKeyword(i).replace(/(?:X|\d+)$/, '') === base);
        assert.ok(def, '巻物がない: ' + keyword);
        const item = makeItem(def.id, n ? Number(n[2]) : undefined);
        _ensureItemSlots()[0] = item;
        G._pendingItemUse = {key:item.itemEffectKey,card:item,slotIdx:0};
        _applyPendingItemAt(_pickingLocation('board',index));
        assert.equal(G._pendingItemUse, null, '巻物を使い終える');
      }
      const formation = buildOnlineSelfFormation();
      assert.ok(formation.units[0].lane === lane && KEYWORDS.every(k => formation.units[0].keywords.includes(k)), '巻物→魔導板→オンラインpayloadで前後衛・キーワードを保持');
      G.mainBoard = copy(G.mainBoard);
      assert.ok(KEYWORDS.every(k => buildOnlineSelfFormation().units[0].keywords.includes(k)), '魔導板のJSON保存後も全キーワードを保持');
    }
  } finally { drawNames.forEach((name,i) => { global[name] = draws[i]; }); }
  for (const side of ['p1','p2']) for (const lane of ['front','rear']) {
    const setup = fixture(KEYWORDS, side, lane), pve = h.setup(setup);
    const runner = core.createBattleRunner(pve.state, pve.rng, pve.emit);
    let attacked = false;
    for (let i = 0; i < 17; i++) {
      const expected = stats(pve.state.units);
      await pve.pve();
      assert.deepEqual(stats({p1:G.allies,p2:G.enemies}), expected, 'PvE受け口で計算値が変わる');
      if (attacked || runner.result) break;
      Object.assign(pve.before, Object.fromEntries(['p1','p2'].map(s => [s,pve.state.units[s].map(u => u && core.coreUnitSnapshot(u))])));
      pve.original.clear(); [...G.allies,...G.enemies].filter(Boolean).forEach(u => pve.original.add(u));
      pve.events.length = 0;
      runner.step({deferCompact:true});
      attacked = pve.events.some(e => e.type === 'attack' && e.attackerId === 'actor');
    }
    assert.ok(attacked, 'PvEで対象キャラの攻撃まで再生');
    const online = h.setup(setup), onlineRunner = core.createBattleRunner(online.state, online.rng, online.emit);
    for (let i = 0; i < 16 && !onlineRunner.result && !online.events.some(e => e.type === 'attack' && e.attackerId === 'actor'); i++) onlineRunner.step({deferCompact:true});
    const hide = global.hideOnlineVersusBoard; global.hideOnlineVersusBoard = () => {};
    try {
      await online.online();
      assert.deepEqual(stats({p1:G.allies,p2:G.enemies}), stats(online.state.units), 'オンライン再生とコアの結果');
    } finally { global.hideOnlineVersusBoard = hide; hide(); }
  }
  const finish = global.finishBattleAsVictory, defeat = global.handleBattleDefeat;
  const applyEnd = async () => SaveRun.applyEnd({units:{p1:G.allies,p2:G.enemies}});
  global.finishBattleAsVictory = global.handleBattleDefeat = applyEnd;
  try {
    for (const lane of ['front','rear']) {
      const saved = h.setup(fixture(KEYWORDS, 'p1', lane));
      saved.state.life = {p1:3,p2:3}; saved.state.maxLife = {p1:3,p2:3};
      const pending = SaveRun.computeBattle(copy(saved.state), 1027);
      const restored = SaveRun.unpackBattleEvents(copy(SaveRun.packBattleEvents(pending)));
      assert.deepEqual(restored.events, pending.events, '保存イベントの圧縮・JSON往復');
      SaveRun.installSetup(restored);
      await SaveRun.replay(restored, G._battleRunId);
      assert.deepEqual(stats({p1:G.allies,p2:G.enemies}), stats(restored.finalState.units), '保存した戦闘の実再生とコアの最終結果');
    }
  } finally { global.finishBattleAsVictory = finish; global.handleBattleDefeat = defeat; }
  console.log('OK 全キーワード1027 実受け口：巻物→魔導板→payload、PvE／オンライン両陣営×前後衛、保存の圧縮・JSON往復・実再生×前後衛');
}
if (require.main === module) {
  (async () => { calculationChecks(); displayChecks(process.env.VB_PRESENT_REF); await routeChecks(); })()
    .catch(e => { console.error(e.stack); process.exitCode = 1; });
}
module.exports = { KEYWORDS, BASE_REF, variants, fixture, run, calculationChecks, displayChecks, routeChecks };
