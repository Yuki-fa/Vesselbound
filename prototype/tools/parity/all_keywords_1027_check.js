'use strict';
// 実Chrome専用。既定は5500、最後にfile://も確認する。--syntax-onlyはブラウザ不要。
// 巻物→魔導板→共通編成→コア→PvE／オンライン／保存再生の経路を通す。
const assert = require('node:assert/strict'), vm = require('node:vm');
const path = require('node:path'), { pathToFileURL } = require('node:url');
const { launch } = require('./headless');
const { KEYWORDS, variants } = require('../balance_sim/all_keywords_1027_regression');
const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const FILE = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;

async function browserCase(options) {
  const { keywords, lane, side, route, no = 'C060' } = options;
  const fail = (ok, why) => { if (!ok) throw new Error(why); };
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const clone = x => JSON.parse(JSON.stringify(x));
  stopBattleLabFx(); presentResetPlayback(); initState(); initializeBattlePresentationState();
  G._debugMode = true; G.phase = 'reward'; G._battleRunId = 1;
  G._battleCoreEvents = []; G.battleCounters = { damage: 0, deaths: 0 };
  G._waveLife = G.life = 3; G.mana = 0; G.rings = []; G.activeBattleItems = [];
  G.mapPanelPowers = {};
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const screen = document.getElementById('scr-battle'); screen.classList.add('active');
  screen.style.setProperty('display', 'block', 'important'); document.body.className = 'test-battle-active';
  const cardDef = PANEL_POOL.find(c => c.no === no), card = makePanel(cardDef.id);
  const boardIndex = lane === 'rear' ? MAIN_BOARD_REAR_SLOTS[0] : MAIN_BOARD_FRONT_SLOTS[0];
  G.mainBoard.fill(null); G.mainBoard[boardIndex] = card;
  // X付きの巻物もmakeItemを通して現行の本文へ置き換え、実際の付与関数を呼ぶ。
  // 追加の防戦／三段など巻物がない検査だけは魔導板のキーワードへ直接加える。
  const itemFx = _playItemUseVfx; _playItemUseVfx = () => {};
  try {
    for (const keyword of keywords) {
      if (coreUnitHasKeyword(card, keyword)) continue;
      const numbered = /^(.*?)(\d+)$/.exec(keyword), base = numbered ? numbered[1] : keyword;
      const def = ITEM_POOL.find(i => _itemGrantedKeyword(i).replace(/(?:X|\d+)$/, '') === base);
      if (!def) { card.keywords = _mergeCardKeywordsForBond(card.keywords || [], [keyword]); continue; }
      const item = makeItem(def.id, numbered ? Number(numbered[2]) : undefined);
      _ensureItemSlots()[0] = item; G._pendingItemUse = { key: item.itemEffectKey, card: item, slotIdx: 0 };
      _applyPendingItemAt(_pickingLocation('board', boardIndex));
      fail(!G._pendingItemUse && (card.keywords || []).includes(keyword), '巻物の付与失敗: ' + keyword);
    }
  } finally { _playItemUseVfx = itemFx; }
  const self = buildOnlineSelfFormation(), actor = self.units.find(u => u.no === no);
  fail(!!actor && actor.lane === lane, '魔導板の前後衛が編成に届かない');
  fail(keywords.every(k => (actor.keywords || []).includes(k)), '巻物のキーワードがオンラインpayloadで欠落');
  actor.hp = actor.maxHp = 40;
  const mustAttack = !coreUnitHasKeyword(actor, '防戦');
  const other = side === 'p1' ? 'p2' : 'p1';
  const enemy = (id, l) => ({ id, name: id, no: 'C006', color: '赤', lane: l,
    atk: 1, hp: 24, maxHp: 24, desc: '', keywords: [], _panelSummoned: true });
  const setup = { sides: { [side]: { units: [actor] }, [other]: { units: [enemy('f0','front'), enemy('f1','front'), enemy('f2','front'), enemy('r0','rear')] } },
    summonDefs: PANEL_POOL, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, life: { p1: 3, p2: 3 } };
  const state = createBattleState(setup), before = clone(state.units), actorId = actor.id;
  state.life = { p1: 3, p2: 3 }; state.maxLife = { p1: 3, p2: 3 };
  const events = [], rng = createSeededRng(1027);
  state._coreFirstSide = side;
  let done = false, samples = 0, doubled = 0, actorMoves = [], errors = [], summonChecks = 0;
  const visible = el => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
    for (let n = el; n && n !== document; n = n.parentElement) {
      const s = getComputedStyle(n); if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) <= .05) return false;
    }
    return true;
  };
  const sample = () => {
    if (done) return;
    samples++;
    const nodes = [...document.querySelectorAll('.slot[data-unit-id],.attack-motion-clone[data-unit-id]')].filter(visible);
    const counts = new Map(); nodes.forEach(n => counts.set(n.dataset.unitId, (counts.get(n.dataset.unitId) || 0) + 1));
    if ([...counts.values()].some(n => n > 1)) doubled++;
    const moving = nodes.find(n => n.dataset.unitId === actorId && n.classList.contains('attack-motion-clone'));
    if (moving) { const r = moving.getBoundingClientRect(); actorMoves.push({ x: r.left, y: r.top, w: r.width }); }
    // ペリカンの絵へ召喚元の半透明が写っていないことを、実際の透明度で調べる。
    for (const u of [...G.allies || [], ...G.enemies || []].filter(Boolean)) {
      if (!String(u.name).includes('ペリカン') || u._corePendingSummon) continue;
      const el = nodes.find(n => n.dataset.unitId === String(u.id));
      if (!el || VbFx.snapshot().some(j => j.name.includes('summon'))) continue;
      const art = el.querySelector('.unit-portrait');
      if (art && getComputedStyle(art).opacity !== '1' && errors.length < 8) errors.push('ペリカンの絵が半透明: ' + getComputedStyle(art).opacity);
    }
    requestAnimationFrame(sample);
  };
  const settle = async () => { const t = performance.now(); while (performance.now() - t < 380) await frame(); };
  const stable = () => {
    for (const s of ['p1', 'p2']) {
      const field = document.getElementById(s === 'p1' ? 'f-ally' : 'f-enemy');
      const units = (s === 'p1' ? G.allies : G.enemies).filter(u => u && presentShownHp(u) > 0 && !u._corePendingSummon && !u._isObject && !u._isSoul);
      const nodes = [...field.querySelectorAll('.slot[data-unit-id]')];
      fail(new Set(nodes.map(n => n.dataset.unitId)).size === nodes.length, '同一IDのDOMが重複');
      for (const l of ['front', 'rear']) {
        const row = units.filter(u => (u.lane || 'front') === l).map(u => nodes.find(n => n.dataset.unitId === String(u.id)));
        fail(row.every(visible), '生存キャラが画面にない: ' + s + '/' + l);
        if (!row.length) continue;
        const rects = row.map(n => n.getBoundingClientRect()), f = field.getBoundingClientRect();
        const center = (rects[0].left + rects.at(-1).right) / 2;
        fail(Math.abs(center - (f.left + f.width / 2)) <= 2, '味方／敵の列の外へずれた: ' + s + '/' + l);
        for (let i = 1; i < rects.length; i++) fail(rects[i].left >= rects[i - 1].right - 1, '召喚体が重なっている');
        const top = rects[0].top;
        fail(rects.every(r => Math.abs(r.top - top) <= 1), '同じ前後衛が別の段へ移動');
        for (const n of row) {
          const m = new DOMMatrixReadOnly(getComputedStyle(n).transform);
          fail(Math.abs(m.e) <= 1 && Math.abs(m.f) <= 1, '待機位置に状態VFXの移動量が残った');
          const a = n.querySelector('.slot-stats .a'), hp = n.querySelector('.slot-stats .h');
          fail(visible(a) && visible(hp) && [a,hp].every(el => {
            const s = getComputedStyle(el);
            return Number(s.opacity) > .95 && s.color !== 'rgba(0, 0, 0, 0)' && s.color !== 'transparent';
          }), '数値が隠密と一緒に薄くなった');
        }
      }
    }
    summonChecks++;
  };
  const stats = units => Object.fromEntries(['p1','p2'].map(s => [s, (units[s] || []).filter(u => u && u.hp > 0 && !u._isObject && !u._isSoul)
    .map(u => [u.id, u.atk, u.hp, u.lane]).sort((a,b) => String(a[0]).localeCompare(String(b[0])))]));
  let expected;
  requestAnimationFrame(sample);
  try {
    if (route === 'saved') {
      const pending = SaveRun.computeBattle(clone(state), 1027);
      // セーブの実圧縮・JSON往復・展開を経たデータを実際の保存再生へ渡す。
      const restored = SaveRun.unpackBattleEvents(clone(SaveRun.packBattleEvents(pending)));
      fail(JSON.stringify(restored.events) === JSON.stringify(pending.events), '保存イベントが一致しない');
      SaveRun.installSetup(restored); renderAll();
      await SaveRun.replay(restored, G._battleRunId);
      expected = stats(restored.finalState.units);
    } else {
      const runner = createBattleRunner(state, rng, e => events.push(e));
      const original = new Set([...before.p1, ...before.p2].map(u => u.id));
      const flush = async old => {
        const held = [...state.units.p1, ...state.units.p2].filter(u => u && old[u.id]);
        held.forEach(u => { const v = old[u.id]; presentHoldShown(u, v.atk, v.hp, v.maxHp, v.shield || 0, v.weaken || 0); });
        try { await _flushCorePveHitEvents(state, events.splice(0), new Set([...state.units.p1, ...state.units.p2].filter(u => original.has(u.id)))); }
        finally { [...state.units.p1, ...state.units.p2].forEach(u => u && presentReleaseShown(u)); }
        requestBattleCompact({ forceRender: true }); await settle(); stable();
      };
      if (route === 'pve') {
        G._coreDrivenBattle = true; G.phase = 'battle'; G._savedBattleReplaying = true;
        G.allies = state.units.p1; G.enemies = state.units.p2;
        renderAll(); await flush(Object.fromEntries([...before.p1, ...before.p2].map(u => [u.id, u])));
      }
      let actorAttacked = false;
      for (let i = 0; i < 16 && !runner.result && !actorAttacked; i++) {
        const old = Object.fromEntries([...state.units.p1, ...state.units.p2].filter(Boolean).map(u => [u.id, coreUnitSnapshot(u)]));
        const at = events.length; runner.step({ deferCompact: true });
        actorAttacked = events.slice(at).some(e => e.type === 'attack' && e.attackerId === actorId);
        if (route === 'pve') await flush(old);
        runner.compact();
        if (!mustAttack && i >= 1) break;
      }
      expected = stats(state.units);
      if (route === 'online') {
        const out = { events: clone(events), formations: { p1: { units: before.p1, rings: [], items: [] }, p2: { units: before.p2, rings: [], items: [] } } };
        beginOnlineVersusField(out);
        await playOnlineBattleEvents(out, { onEvent: async (ev, ctx) => {
          await renderOnlineVersusBoard(ev, ctx);
          if (ev.type === 'summon') { await settle(); stable(); }
        } });
      }
      fail(!mustAttack || actorAttacked, '対象キャラの攻撃に到達しない');
    }
    await settle(); stable();
    fail(JSON.stringify(stats({ p1: G.allies, p2: G.enemies })) === JSON.stringify(expected), '描画後とコアの戦闘結果が不一致');
    fail(doubled === 0 && errors.length === 0, JSON.stringify({ doubled, errors }));
    fail(samples > 5 && summonChecks > 0, 'rAF／配置測定が実行されていない');
    fail(!mustAttack || actorMoves.length > 5, '対象キャラの攻撃モーションが表示されない');
    if (actorMoves.length) {
      const travel = Math.max(...actorMoves.map(r => r.y)) - Math.min(...actorMoves.map(r => r.y));
      fail(travel > actorMoves[0].w * .3, '隠密の状態ループが攻撃の動きを止めている');
    }
    fail(!document.querySelector('.attack-motion-clone'), '攻撃後に複製が残った');
    return { samples, actorSamples: actorMoves.length, summonChecks, doubled, errors, final: expected };
  } finally { done = true; if (route === 'online') hideOnlineVersusBoard(); stopBattleLabFx(); }
}
const cases = variants().map(keywords => ({ keywords, side: 'p1', lane: 'front', route: 'pve' }));
for (const route of ['pve','online']) for (const side of ['p1','p2']) for (const lane of ['front','rear']) {
  if (route === 'pve' && side === 'p1' && lane === 'front') continue;
  cases.push({ keywords: KEYWORDS, side, lane, route });
}
for (const lane of ['front','rear']) cases.push({ keywords: KEYWORDS, side: 'p1', lane, route: 'saved' });
cases.push({ keywords: ['隠密','二段攻撃','三方向攻撃'], side: 'p1', lane: 'front', route: 'pve', no: 'C006' });
const source = options => `return await (${browserCase.toString()})(${JSON.stringify(options)});`;
for (const options of cases) new vm.Script('(async()=>{' + source(options) + '})');
if (process.argv.includes('--syntax-only')) console.log(`OK 全キーワード1027 Chrome検査スクリプト構文：${cases.length}ケース＋file://`);
else (async () => {
  const browser = await launch({ width: 1920, height: 1080 });
  try {
    for (const [url, options] of [...cases.map(c => [URL, c]), [FILE, { keywords: KEYWORDS, side: 'p1', lane: 'rear', route: 'pve' }]]) {
      await browser.goto(url);
      await browser.waitFor('typeof SaveRun!=="undefined"&&typeof buildOnlineSelfFormation==="function"&&PANEL_POOL.some(c=>c.no==="C060"&&c._sheetSeen)', 20000);
      await browser.eval('_revealTitleMenu();');
      await browser.waitFor('document.getElementById("scr-title").classList.contains("startup-menu-ready")&&Number(getComputedStyle(document.getElementById("scr-loading")).opacity)===0', 5000);
      const result = await browser.eval(source(options));
      assert.equal(result.doubled, 0); assert.deepEqual(result.errors, []);
      console.log('OK ' + JSON.stringify({ url, ...options, ...result }));
    }
    const runtimeErrors = browser.events.filter(e => e.method === 'Runtime.exceptionThrown').map(e => e.params.exceptionDetails);
    assert.deepEqual(runtimeErrors, []);
    assert.deepEqual(await browser.consoleErrors(), []);
  } finally { await browser.close(); }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
