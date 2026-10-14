'use strict';
// C043/E075の組合せと、退場・非表示・複製中の薙ぎ払いの発生座標を一括検査する。
// 通常はChromeで両受け口を実測。--node は描画DOMだけを代替し、同じ関数・ケースを実行する。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const NODE = process.argv.includes('--node');
const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';

function fixture(kind, side) {
  initState(); initializeBattlePresentationState(); presentResetPlayback();
  G.phase = 'player'; G._coreDrivenBattle = true; G._savedBattleReplaying = true;
  const arassus = PANEL_POOL.find(c => c.no === 'C043');
  const soul = PANEL_POOL.find(c => c.no === 'E075');
  if (!arassus || !soul) throw new Error('C043/E075のシート定義がない');
  const make = (id, def = {}) => ({ ...def, id, atk: 8, hp: 200, maxHp: 200,
    lane: 'front', keywords: [...(def.keywords || [])], desc: def.desc || '' });
  const other = side === 'p1' ? 'p2' : 'p1';
  const source = make('arassus', arassus);
  source._adjacentPanelEffectTexts = [soul.desc];
  const s = createBattleState({ sides: { [side]: { units: [source] },
    [other]: { units: [make('foe0'), make('foe1')] } }, summonDefs: PANEL_POOL });
  let u = s.units[side][0];
  const pre = [], emitPre = e => pre.push(e);
  if (kind === 'transform') {
    const plain = make('arassus'); s.units[side][0] = createCoreUnit(plain, side, 0); u = s.units[side][0];
    coreTransformUnit(s, u, arassus.name, emitPre);
    u._adjacentPanelEffectTexts = [soul.desc];
  }
  if (kind === 'copy') {
    u = coreSummonUnit(s, side, { ...coreUnitSnapshot(u), id: 'arassus-copy', _inheritsStats: true }, emitPre, u.id);
    if (!u || !coreUnitHasKeyword(u, '眷属')) throw new Error('C043の眷属コピーがない');
  }
  if (kind === 'revive') {
    u.keywords.push('復活'); u.hp = 0;
    if (!coreTryRevive(u, s, emitPre)) throw new Error('C043の復活が不成立');
  }
  if (kind === 'injury-death') {
    const minotaur = PANEL_POOL.find(c => /ミノタウロス/.test(c.name));
    if (!minotaur) throw new Error('ミノタウロスのシート定義がない');
    s.units[other][0] = createCoreUnit(make('foe0', minotaur), other, 0);
    s.units[other][0].atk = 10000; u.hp = 1;
  }
  if (kind === 'soul-kills-enemy') {
    s.units[other][0] = createCoreUnit(make('enemy-arassus', arassus), other, 0);
    s.units[other][0].hp = 8;
  }
  const events = [], rng = createSeededRng(53), emit = e => events.push(e);
  const hit = (a, b, n, counter, ss, st, opt) => coreResolveHit(s, a, b, n, counter, rng, emit,
    { skipSourceEffects: !!ss, skipTough: !!st, ...(opt || {}) });
  coreApplyAttackEffects(u, s, rng, emit, hit);
  return { state: s, source: u, events, pre, side, other };
}

async function measure(mode, side, speed, receiver, kind = 'alive') {
  const f = fixture(kind, side), u = f.source;
  G.allies = f.state.units.p1; G.enemies = f.state.units.p2;
  getBattlePresentationSpeedScale = () => speed;
  // 変身・復活と同じく、召喚も成立後の姿を測る。コア生成直後は未表示なので、
  // fixtureの召喚イベント分だけ配置済みにしてから実際のrenderFieldを通す。
  for (const ev of f.pre.filter(e => e.type === 'summon')) {
    const summoned = f.state.units[ev.side].find(x => x && x.id === ev.unit.id);
    if (summoned) delete summoned._corePendingSummon;
  }
  // 状態生成とコアは本物。描画はブラウザでは本物、Nodeでは矩形を持つDOMだけに置き換える。
  renderField('f-ally', G.allies, false); renderField('f-enemy', G.enemies, true);
  const sourceSide = side === 'p2' ? 'enemy' : 'ally';
  const slot = getCurrentUnitSlot(sourceSide, u);
  if (!slot) throw new Error('検査の発生元カードがない');
  let expected = _copyBattleVisualRect(slot.getBoundingClientRect());
  u._lastVisualRect = { ...expected };
  let motion = null;
  if (mode === 'motion') {
    // 本番の複製入口で--motion-card-w/hと!important寸法を設定する。
    // 単なるdivのwidth/heightだけではCSSのvar指定に負け、Chromeで0×0になる。
    motion = _buildMotionCardClone(slot, { ...expected, left: expected.left + 37, top: expected.top - 29 });
    document.body.appendChild(motion); expected = _copyBattleVisualRect(motion.getBoundingClientRect());
    if (!(expected.width > 0 && expected.height > 0)) {
      motion.remove(); throw new Error('検査の攻撃モーション複製が0×0');
    }
  } else if (mode !== 'live') {
    // 敵側はdisplay/visibility/opacityに!importantがある。実DOMでも確実に隠す。
    slot.style.setProperty('transition', 'none', 'important');
    if (mode === 'zero' || mode === 'none') slot.style.setProperty('display', 'none', 'important');
    else if (mode === 'hidden') slot.style.setProperty('visibility', 'hidden', 'important');
    else if (mode === 'transparent') slot.style.setProperty('opacity', '0', 'important');
    else if (mode === 'wrong-id') slot.dataset.unitId = 'replacement';
    else slot.remove();
    const style = getComputedStyle(slot), rect = slot.getBoundingClientRect();
    if ((mode === 'zero' || mode === 'none') && (rect.width !== 0 || rect.height !== 0)
      || mode === 'hidden' && style.visibility !== 'hidden'
      || mode === 'transparent' && Number(style.opacity) !== 0) {
      throw new Error('検査の発生元カードを非表示にできなかった: ' + mode);
    }
    // 消えた枠や同じ添字の別カードが左端へ再配置されても、保存済みの位置を使う。
    if (['hidden', 'transparent', 'wrong-id'].includes(mode)) slot.style.setProperty('left', '0px', 'important');
    u.hp = 0;
    if (mode === 'none') delete u._lastVisualRect;
  }
  const sweep = f.events.find(e => e.type === 'sweep_vfx' && e.unitId === u.id);
  if (!sweep) throw new Error('コアからC043のsweep_vfxが出なかった');
  const origins = [], plays = [], play = VbFx.play;
  VbFx.play = function(name, options) {
    const host = options && options.source;
    const sweepHost = host && host.className === 'sweep-vfx-host';
    if (sweepHost) {
      // コード描画のsource原点はホスト中央。旧WebPホストの左上ではない。
      // DOMへ配置された後・回転開始前の実画面座標を測り、クリップ親の位置も含める。
      const rect = host.getBoundingClientRect();
      origins.push({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    const promise = play.apply(this, arguments);
    if (sweepHost) plays.push(promise);
    return promise;
  };
  try {
    if (receiver === 'pve') await _flushCorePveHitEvents(f.state, [sweep], new Set([...G.allies, ...G.enemies]));
    else await renderOnlineVersusBoard(sweep, { events: [sweep], eventIndex: 0,
      board: f.state.units, visualizedDamageEvents: new Set() });
    await Promise.all(plays);
  } finally { VbFx.play = play; if (motion) motion.remove(); }
  return { expected, origins, suppressed: mode === 'none' };
}

async function run(evaluate) {
  const failures = []; let count = 0;
  const check = async (name, fn) => {
    count++;
    try { await fn(); } catch (e) { failures.push(name + ': ' + e.message); }
  };
  for (const side of ['p1', 'p2']) for (const kind of ['alive', 'injury-death', 'soul-kills-enemy', 'transform', 'revive', 'copy']) {
    await check(`コア ${side}/${kind}`, async () => {
      const r = await evaluate(`const f=(${fixture})(${JSON.stringify(kind)},${JSON.stringify(side)});
        return {events:f.events,pre:f.pre,id:f.source.id,hp:f.source.hp};`);
      const sweeps = r.events.filter(e => e.type === 'sweep_vfx');
      assert.equal(sweeps.length, 1, '魔族の魂にC043の炎を重ねない');
      const enchantHits = r.events.filter(e => e.type === 'damage' && e.sourceId === r.id && e.effectSource === false && e.area);
      assert.ok(enchantHits.length > 0, 'E075の全体ダメージがない');
      if (kind === 'injury-death') assert.equal(r.hp, 0, '攻撃効果の途中でC043が倒れていない');
      if (kind === 'soul-kills-enemy') assert.ok(r.events.some(e => e.type === 'death' && e.unitId === 'enemy-arassus'), 'E075で敵C043が倒れていない');
      if (kind === 'transform') assert.ok(r.pre.some(e => e.type === 'transform'));
      if (kind === 'revive') assert.ok(r.pre.some(e => e.type === 'revive'));
      if (kind === 'copy') assert.ok(r.pre.some(e => e.type === 'summon'));
    });
  }
  for (const side of ['p1', 'p2']) for (const speed of [1, 2, 3]) for (const receiver of ['pve', 'online']) {
    for (const mode of ['live', 'motion', 'removed', 'zero', 'hidden', 'transparent', 'wrong-id', 'none']) {
      await check(`原点 ${side}/${speed}倍/${receiver}/${mode}`, async () => {
        const r = await evaluate(`return await (${measure})(${JSON.stringify(mode)},${JSON.stringify(side)},${speed},${JSON.stringify(receiver)});`);
        if (r.suppressed) return assert.equal(r.origins.length, 0, '位置不明なのに炎を生成した');
        assert.equal(r.origins.length, 1, '最後の位置から炎を生成していない');
        const p = r.origins[0], x = p.x, y = p.y, rect = r.expected;
        assert.ok(Number.isFinite(x) && Number.isFinite(y), '原点が有限座標でない');
        assert.ok(Math.abs(x - (rect.left + rect.width * .5)) < 1 && Math.abs(y - (rect.top + (side === 'p2' ? rect.height : 0))) < 1,
          `原点(${x},${y})がカード(${rect.left},${rect.top},${rect.width},${rect.height})から外れた`);
        assert.ok(x > 0 && y > 0, '画面左端・左上から炎が出た');
      });
    }
    for (const kind of ['transform', 'revive', 'copy']) await check(`姿 ${side}/${speed}倍/${receiver}/${kind}`, async () => {
      const r = await evaluate(`return await (${measure})('live',${JSON.stringify(side)},${speed},${JSON.stringify(receiver)},${JSON.stringify(kind)});`);
      const p = r.origins[0]; assert.ok(p, '炎がない');
      assert.ok(Math.abs(p.x - (r.expected.left + r.expected.width * .5)) < 1);
      assert.ok(Math.abs(p.y - (r.expected.top + (side === 'p2' ? r.expected.height : 0))) < 1);
    });
  }
  failures.forEach(e => console.error('NG ' + e));
  console.log(`薙ぎ払い原点検査 (${NODE ? 'Node矩形DOM' : 'Chrome実測'}): ${count}件 / 成功${count - failures.length} / 失敗${failures.length}`);
  if (failures.length) process.exitCode = 1;
}

async function nodeRun() {
  const { makeElement } = require('../balance_sim/stub');
  document.head = makeElement('head'); global.setInterval = global.requestAnimationFrame = () => 0;
  global.setTimeout = fn => { queueMicrotask(fn); return 0; }; console.table = () => {};
  for (const m of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
    if (!m[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), { filename: m[1] });
  }
  const slots = { 'f-ally': [], 'f-enemy': [] }, clips = [];
  document.createElement = tag => {
    const e = makeElement(tag); e.isConnected = true;
    if (tag === 'canvas') {
      // 共通レンダラーの初期化・手続き素材の生成は、本物の処理を最後まで通す。
      const context = e.getContext();
      context.setTransform = () => {};
      context.createImageData = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
      context.putImageData = () => {};
      context.createRadialGradient = () => ({ addColorStop() {} });
      e.getContext = () => context;
    }
    e.animate = () => ({ addEventListener() {} });
    e.style.setProperty = (name, value) => { e.style[name] = String(value); };
    e.style.getPropertyValue = name => e.style[name] || '';
    e.style.removeProperty = name => { delete e.style[name]; };
    e.classList.add = (...names) => { e.className = [...new Set([...e.className.split(' ').filter(Boolean), ...names])].join(' '); };
    e.classList.remove = (...names) => { e.className = e.className.split(' ').filter(c => !names.includes(c)).join(' '); };
    e.classList.contains = c => e.className.split(' ').includes(c);
    e.cloneNode = () => {
      const clone = document.createElement(tag); clone.className = e.className;
      Object.assign(clone.dataset, e.dataset);
      for (const [name, value] of Object.entries(e.style)) if (typeof value === 'string') clone.style[name] = value;
      return clone;
    };
    e.remove = () => { e.isConnected = false; };
    e.getBoundingClientRect = () => {
      const zero = !e.isConnected || e.style.display === 'none';
      let left = zero ? 0 : parseFloat(e.style.left) || 0, top = zero ? 0 : parseFloat(e.style.top) || 0;
      if (!zero && e.style.position === 'absolute' && e.parentNode) {
        const parent = e.parentNode.getBoundingClientRect();
        left += parent.left; top += parent.top;
      }
      const width = zero ? 0 : parseFloat(e.style.width) || 0, height = zero ? 0 : parseFloat(e.style.height) || 0;
      return { left, top, width, height, right: left + width, bottom: top + height };
    };
    const append = e.appendChild;
    e.appendChild = c => { if (c.className === 'sweep-vfx-clip') clips.push(c); return append.call(e, c); };
    return e;
  };
  const screen = document.createElement('div'); screen.className = 'active';
  // クリップ親が画面左上にない場合も、親の座標補正を検査する。
  Object.assign(screen.style, { left: '31px', top: '23px', width: '1280px', height: '800px' });
  document.getElementById = id => id === 'scr-battle' ? screen : slots[id] ? {
    querySelectorAll: () => slots[id].filter(e => e.isConnected),
    querySelector: q => slots[id].find(e => e.isConnected && q.includes(`"${e.dataset.unitIdx}"`)) || null,
  } : null;
  document.querySelectorAll = q => q.startsWith('.attack-motion-clone')
    ? document.body.children.filter(e => e.isConnected && e.classList.contains('attack-motion-clone')) : [];
  getComputedStyle = e => ({ display: e.style.display || 'block', visibility: e.style.visibility || 'visible', opacity: e.style.opacity || '1',
    getPropertyValue: name => e.style.getPropertyValue(name) });
  renderField = (id, list, enemy) => { slots[id] = list.map((u, i) => {
    if (!u || u.hp <= 0 || u._corePendingSummon) return null;
    const el = document.createElement('div'); el.className = 'slot'; el.dataset.unitId = String(u.id); el.dataset.unitIdx = String(i);
    Object.assign(el.style, { left: `${450 + i * 140}px`, top: enemy ? '160px' : '520px', width: '100px', height: '150px' }); return el;
  }).filter(Boolean); };
  _vfxHostParent = () => screen; _syncEffectFlashWithVfx = actionBannerTrackVfxHost = () => {};
  _actionBannerShow = () => {};
  playSfx = updateHUD = renderControls = renderAll = () => {}; requestBattleCompact = () => {};
  await loadGameData();
  global.fixture = fixture;
  await run(code => vm.runInThisContext(`(async()=>{${code}})()`));
}

(async () => {
  if (NODE) return await nodeRun();
  const b = await require('./headless').launch();
  try {
    await b.goto(URL); await b.waitFor('PANEL_POOL.length>20&&typeof presentSweepAttack==="function"', 20000);
    await b.eval(`document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));
      document.getElementById('scr-battle').classList.add('active'); document.body.className='';
      window.fixture=${fixture};`);
    await run(code => b.eval(code));
  } finally { await b.close(); }
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
