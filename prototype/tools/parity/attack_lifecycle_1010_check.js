'use strict';
// 2026-10-10 不具合1・5を1本で再現する。VB_ONLY=部分一致で盤面を絞れる。
// node tools/parity/attack_lifecycle_1010_check.js --node はコア・計画・実モーションの仮DOM検査。
// 引数なしは実Chromeで各フレームの可視カード数・踏み込み後VFX・通常死亡・戻りを検査する。
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const core = require('../../js/battle/core'), present = require('../../js/battle/present');
const sheet = require('../balance_sim/sheet_data');
const { createSeededRng } = require('../../js/online/protocol');
const { launch } = require('./headless');
const ROOT = path.resolve(__dirname, '../..');
const variants = [
  { name: '1回', keywords: [], count: 1 },
  { name: '二段', keywords: ['二段攻撃'], count: 2 },
  { name: '三段', keywords: ['三段攻撃'], count: 3 },
  { name: '強化の二段', keywords: [], effectData: { adjacentAbilities: ['二段攻撃'] }, count: 2 },
  { name: '疾風と三段', keywords: ['三段攻撃'], rings: [{ name: '疾風の指輪' }], count: 4 },
  { name: '味方の攻撃回数バフ', keywords: [], supportDesc: '常時：味方の攻撃回数は1回追加される。', supportName: 'タイタニア', count: 2 },
];
const routes = ['生存', '初撃で対象死亡', '反撃死', '呪詛', '自傷死', '帰滅の反撃死', '呪詛と根性'];
function setupFor(v, route) {
  const c = sheet.characterCards().find(x => x.name === 'アラッサス');
  const actor = { ...c, id: 'A', no: 'C058', artCode: 'C058', atk: 7, hp: 100, maxHp: 100,
    keywords: v.keywords.slice(), _panelSummoned:false, effectData: v.effectData || {} };
  const support = { id: 'S', name: v.supportName || 'ゴブリン', atk: 1, hp: 100, maxHp: 100,
    keywords: [], desc: v.supportDesc || '' };
  const enemy = { id: 'E0', name: 'オーク', atk: 1, hp: 200, maxHp: 200, guardian: true, keywords: [], desc: '' };
  const second = { id: 'E1', name: 'ゴブリン', atk: 1, hp: 200, maxHp: 200, keywords: [], desc: '' };
  if (route === '初撃で対象死亡') enemy.hp = enemy.maxHp = 10;
  if (route.includes('反撃死') || route === '自傷死') actor.hp = actor.maxHp = 1;
  if (route.includes('反撃死')) enemy.atk = 20;
  if (route.includes('呪詛')) { enemy.keywords = ['呪詛']; enemy.no = enemy.artCode = 'EN031'; }
  if (route === '呪詛と根性') actor.keywords.push('根性');
  if (route.includes('帰滅')) actor.keywords.push('帰滅');
  if (route === '自傷死') {
    const penance = sheet.enchantCards().find(x => x.name === '懺悔');
    actor.effectData = { effectNames: [...(actor.effectData.effectNames || []), '懺悔'], effectTexts: [penance.desc] };
  }
  return { sides: { p1: { units: [actor, support] }, p2: { units: [enemy, second] } },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } },
    rings: { p1: v.rings || [], p2: [] }, life: { p1: 3, p2: 0 } };
}
function oneTurn(engine, setup) {
  const state = engine.createBattleState(JSON.parse(JSON.stringify(setup)));
  state._coreFirstSide = 'p1';
  const events = [], runner = engine.createBattleRunner(state, createSeededRng(53), e => events.push(e), { skipOpening: true });
  runner.step({ deferCompact: true });
  return { events, final: engine.battleCoreFinalState(state), actorHp: state.units.p1[0].hp };
}

// DOM・時計だけを差し替え、変更前後の _playAttackMotionCore そのものを実行する。
async function overlappingMotion(source, speed) {
  let now = 0, nextId = 0;
  const frames = new Map(), nodes = [], bad = [];
  function el(id, left, top) {
    const classes = new Set();
    return { dataset: { unitId: id }, isConnected: true, style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
      getBoundingClientRect: () => ({ left, top, width: 100, height: 150 }), querySelector: () => null,
      remove() { this.isConnected = false; } };
  }
  const slot = el('A', 100, 500), target = el('E0', 400, 100);
  const attacker = { id: 'A', hp: 100, atk: 7 }, enemy = { id: 'E0', hp: 100 };
  const ctx = { G: { allies: [attacker], enemies: [enemy] }, console, Map, Set,
    performance: { now: () => now }, requestAnimationFrame: fn => { frames.set(++nextId, fn); },
    setTimeout: () => ++nextId, clearTimeout() {}, getBattlePresentationSpeedScale: () => speed,
    _getAttackTargetRect: x => x.getBoundingClientRect(), _copyBattleVisualRect: x => x,
    _buildMotionCardClone: () => el('A', 100, 500),
    _setUnitStatText() {},
    getCurrentUnitSlot: side => side === 'ally' ? slot : target,
    document: { body: { appendChild: node => nodes.push(node) }, getElementById: side => ({ querySelectorAll: () => [side === 'f-ally' ? slot : target] }) } };
  ctx.window = ctx;
  vm.createContext(ctx);
  const begin = source.includes('const _attackMotionOwners=') ? source.indexOf('const _attackMotionOwners=') : source.indexOf('function _playAttackMotionCore(');
  vm.runInContext(source.slice(begin, source.indexOf('\nfunction playAttackMotion(', begin)), ctx);
  async function step() {
    now += 20;
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    for (let i = 0; i < 6; i++) await Promise.resolve();
    const count = nodes.filter(n => n.isConnected).length + (slot.style.visibility === 'hidden' ? 0 : 1);
    if (count > 1) bad.push([now, count]);
  }
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const first = ctx._playAttackMotionCore(attacker, enemy, false, () => held, { firstDuration: 260, stopRatio: .25 });
  for (let i = 0; i < 22; i++) await step();
  // 1撃目が効果待ちのまま、同じIDの次の攻撃が到着する境界を再現。
  const second = ctx._playAttackMotionCore(attacker, enemy, false, () => held, { firstDuration: 260, stopRatio: .25 });
  await step();
  release({ abort: true });
  for (let i = 0; i < 80; i++) await step();
  await Promise.all([first, second]);
  assert.equal(nodes.filter(n => n.isConnected).length, 0, '複製が残らない');
  assert.notEqual(slot.style.visibility, 'hidden', '終了後に実枠1枚へ戻る');
  return bad;
}

// 2026-10-10：対象死亡時も元枠と死亡用の複製を数える。CSSの visibility 遷移は
// visible→hidden の終端まで visible のままなので、単なる style.visibility 判定では捕まらない。
// 実際の死亡開始・演出選択関数を使い、DOMとCSS遷移の時計だけを差し替える。
function deathHandoff(source, speed, side, statChange) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const slotRule = html.match(/\.slot\{([^}]+)\}/);
  const transition = slotRule && slotRule[1].match(/transition:\s*all\s+([\d.]+)s/);
  assert.ok(transition, '元枠の実CSSにある可視遷移を再現する');
  const transitionMs = Number(transition[1]) * 1000;
  let now = 0, hiddenAt = Infinity;
  const values = new Map(), effects = [], overlap = [];
  const unit = { id: side === 'enemy' ? 'E0' : 'A', hp: 0, _displayHp: 0, _deathByStatDrain: statChange };
  const rect = { left: 100, top: side === 'enemy' ? 100 : 500, width: 100, height: 150 };
  const slot = { dataset: { unitId: unit.id }, offsetWidth: 100, offsetHeight: 150,
    style: { setProperty(key, value) {
      values.set(key, value);
      if (key === 'visibility' && value === 'hidden') hiddenAt = values.get('transition') === 'none' ? now : now + transitionMs;
      if (key === 'transition' && value === 'none' && values.get('visibility') === 'hidden') hiddenAt = now;
    } },
    getBoundingClientRect: () => rect,
    cloneNode: () => ({ dataset: { unitId: unit.id }, visibility: now < hiddenAt ? 'visible' : 'hidden', querySelectorAll: () => [] }) };
  const startFx = kind => (node, bounds, size) => {
    assert.equal(node.visibility, 'visible', '隠す前に死亡用カードを確保する');
    assert.equal(node.dataset.unitId, unit.id);
    assert.equal(bounds, rect, '死亡前のカード位置を使う');
    assert.deepEqual(JSON.parse(JSON.stringify(size)), { width: 100, height: 150 }, '死亡前の寸法を使う');
    effects.push({ kind, end: now + (kind === 'burn' ? 900 : 1100) / speed });
  };
  const ctx = { presentShownHp: u => u._displayHp, battleFxStopUnitStates() {},
    getCurrentUnitSlot: (s, u) => s === side && u === unit ? slot : null,
    playCardBurnAway: startFx('burn'), playCardWaveAway: startFx('wave'), playWastedLabel() {} };
  const begin = source.indexOf('function playUnitDeathBurn(');
  vm.runInNewContext(source.slice(begin, source.indexOf('// 演出用ホストの追加先。', begin)), ctx);
  assert.equal(ctx.playUnitDeathBurn(unit, side), true, '通常の死亡演出を始める');
  assert.equal(ctx.playUnitDeathBurn(unit, side), false, '同じ死亡演出を重ねない');
  assert.equal(effects.length, 1);
  assert.equal(effects[0].kind, statChange ? 'wave' : 'burn', '既存の死亡演出を選ぶ');
  for (now = 0; now <= 1200; now += 10) {
    const visibleCards = Number(now < hiddenAt) + effects.filter(e => now < e.end).length;
    if (visibleCards > 1) overlap.push({ now, visibleCards });
  }
  assert.equal(Number(now < hiddenAt) + effects.filter(e => now < e.end).length, 0, '死亡演出の後にカードは残らない');
  return overlap;
}

// 2026-10-10：CSSOMが返す translate(xpx, ypx) はカンマ後に空白が入る。
// 書式だけで踏み込みを誤判定せず、可視の複製と1pxを超える移動は引き続き必須にする。
function sweepHasStepped(sweep) {
  const moved = sweep && String(sweep.transform).match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/);
  return !!(sweep && sweep.hasClone && moved && Math.hypot(+moved[1], +moved[2]) > 1);
}
function sweepStepChecks() {
  const compact = 'translate(42px,-85px) rotate(4deg)';
  const serialized = 'translate(42px, -85px) rotate(4deg)';
  const legacy = /translate\((-?[\d.]+)px,(-?[\d.]+)px\)/;
  assert.ok(legacy.test(compact), '旧判定は空白なしの移動を認識する');
  assert.equal(legacy.test(serialized), false, '旧判定でCSSOMの空白による誤検出を再現');
  for (const transform of [compact, serialized, 'translate( -42px , -85px ) rotate(-4deg)']) {
    assert.equal(sweepHasStepped({ hasClone: true, transform }), true, '可視の移動済み複製を認識する: ' + transform);
    assert.equal(sweepHasStepped({ hasClone: false, transform }), false, '非表示の複製は合格にしない');
  }
  for (const transform of ['translate(0px, 0px)', 'translate(0.6px, 0.8px)', 'none', '']) {
    assert.equal(sweepHasStepped({ hasClone: true, transform }), false, '踏み込み前・1px以下の移動は合格にしない: ' + transform);
  }
  assert.equal(sweepHasStepped(null), false, '炎の記録が無い場合は合格にしない');
}

async function nodeChecks() {
  sweepStepChecks();
  const baseline = { module: { exports: {} }, console };
  // 2026-10-24：カード番号を振り直したので、前の版のコアも今の番号（C043→C058 等）へ読み替えて動かす。
  vm.runInNewContext(require('../balance_sim/card_renumber').relabelSource(execFileSync('git', ['show', '3cac2e0:prototype/js/battle/core.js'], { cwd: ROOT, encoding: 'utf8' })), baseline);
  const oldCore = baseline.module.exports;
  const normalize = value => JSON.parse(JSON.stringify(value, function (key, v) {
    return key === 'targetId' && this.type === 'effect_flash' ? undefined : v;
  }));
  for (const v of variants) for (const route of routes) {
    const setup = setupFor(v, route), current = oneTurn(core, setup), before = oneTurn(oldCore, setup);
    assert.deepEqual(normalize(current), normalize(before), `${v.name}/${route}: 見た目の修正で戦闘結果を変えない`);
    const original = JSON.stringify(current.events), shown = present.presentReorderDeathsAfterDamageBatch(current.events);
    assert.equal(JSON.stringify(current.events), original, '元の事象は書き換えない');
    if (['呪詛', '自傷死'].includes(route)) {
      const dying = shown.findIndex(e => e.unitId === 'A' && ['death', 'curse_death'].includes(e.type));
      const ending = shown.findIndex(e => e.type === 'attack' && e.attackerId === 'A' && e.effectOnly);
      assert.ok(ending >= 0 && ending < dying, `${route}: 通常死亡前に戻る`);
      const plan = present.presentPreAttackPlan(shown, shown.findIndex(e => e.type === 'turn_begin'));
      assert.ok(plan && plan.event.effectOnly, `${route}: 効果より前に踏み込む`);
      assert.equal(shown.filter(e => e.type === 'death' && e.unitId === 'A').length, 1);
    }
    if (route.includes('反撃死')) {
      const normalAttack = shown.findIndex(e => e.type === 'attack' && e.attackerId === 'A' && !e.effectOnly);
      const normalDeath = shown.findIndex(e => e.type === 'death' && e.unitId === 'A');
      assert.ok(normalAttack >= 0 && normalDeath > normalAttack, `${route}: 接触後に通常死亡へ進む`);
      assert.equal(shown.filter(e => e.type === 'death' && e.unitId === 'A').length, 1);
    }
    if (route === '呪詛と根性') {
      const revived = shown.findIndex(e => e.type === 'revive' && e.reason === '根性' && e.unitId === 'A');
      assert.ok(revived >= 0, '根性で最初の呪詛を耐える');
      assert.equal(shown.slice(0, revived).filter(e => e.type === 'death' && e.unitId === 'A').length, 0,
        '根性で耐えた呪詛へ死亡演出を補わない');
    }
    if (route === '生存' || route === '初撃で対象死亡') {
      const attacks = current.events.filter(e => e.type === 'attack' && e.attackerId === 'A');
      assert.equal(attacks.length, v.count, `${v.name}: 回数どおり攻撃する`);
      if (route === '初撃で対象死亡' && v.count > 1) assert.notEqual(attacks[0].targetId, attacks[1].targetId, '倒した対象から再選択');
    }
  }
  const currentRender = ['js/engine/render.js','js/engine/render_card_display.js','js/engine/render_attack_motion.js','js/engine/render_tooltip_helpers.js'].map(file=>fs.readFileSync(path.join(ROOT,file),'utf8')).join('\n');
  const oldRender = execFileSync('git', ['show', '44bf3d5:prototype/js/engine/render.js'], { cwd: ROOT, encoding: 'utf8' });
  for (const speed of [1, 2, 3]) {
    assert.ok((await overlappingMotion(oldRender, speed)).length, '変更前で複製の重なりを再現');
    assert.equal((await overlappingMotion(currentRender, speed)).length, 0, `${speed}倍: 同じIDの可視カードは常に1枚`);
    for (const side of ['ally', 'enemy']) for (const statChange of [false, true]) {
      const tag = `${side}/${statChange ? '衰弱死' : '通常死亡'}/${speed}倍`;
      assert.ok(deathHandoff(oldRender, speed, side, statChange).length, tag + ': 旧版で死亡時の元枠重複を再現');
      assert.equal(deathHandoff(currentRender, speed, side, statChange).length, 0, tag + ': 死亡時も同じIDは1枚以下');
    }
  }
  console.log('攻撃ライフサイクル1010 Node: 42盤面で戦闘結果不変・死亡前の戻り計画・旧複製重複の再現/修正・死亡時の可視遷移12通り（1/2/3倍）・CSSOM書式と踏み込み判定 OK');
}

const WATCH = `
  const watch = { frames:0, overlap:[], sweeps:[], burns:[], motions:[], ended:[], deathFrames:0, initialCenter:null };
  const visible = el => {
    if(!el || !el.isConnected) return false;
    const r=el.getBoundingClientRect(); if(!(r.width>0 && r.height>0)) return false;
    for(let p=el;p && p.nodeType===1;p=p.parentElement) {
      const s=getComputedStyle(p); if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<=.001) return false;
    }
    return true;
  };
  const allCards = () => [...document.querySelectorAll('#f-ally .slot[data-unit-id],#f-enemy .slot[data-unit-id],.attack-motion-clone[data-unit-id],.death-burn-clone [data-unit-id]')];
  const saved = { trace:_recordBattleTrace, sweep:presentSweepAttack, burn:playUnitDeathBurn };
  _recordBattleTrace = function(kind,data) {
    if(kind==='attack_motion_start') watch.motions.push(data.attackerId);
    if(kind==='attack_motion_end') watch.ended.push(data.attackerId);
    return saved.trace.apply(this,arguments);
  };
  presentSweepAttack = function(unit) {
    const clone=[...document.querySelectorAll('.attack-motion-clone')].find(el=>el.dataset.unitId===unit.id);
    watch.sweeps.push({id:unit.id,hasClone:visible(clone),transform:clone&&clone.style.transform});
    return saved.sweep.apply(this,arguments);
  };
  playUnitDeathBurn = function(unit) {
    const result=saved.burn.apply(this,arguments);
    watch.burns.push({id:unit.id,started:result,moving:document.querySelectorAll('.attack-motion-clone[data-unit-id="'+unit.id+'"]').length});
    return result;
  };
  let watching=true;
  function frame() {
    if(!watching) return;
    watch.frames++;
    if(!watch.initialCenter) {
      const el=document.querySelector('#f-ally .slot[data-unit-id="A"]'),r=el&&el.getBoundingClientRect();
      if(r&&r.width>0)watch.initialCenter={x:r.left+r.width/2,y:r.top+r.height/2};
    }
    const cards=new Map();
    for(const el of allCards().filter(visible)) {
      const id=el.dataset.unitId;if(!cards.has(id))cards.set(id,[]);cards.get(id).push(el);
    }
    cards.forEach((els,id)=>{
      if(els.length<=1||watch.overlap.some(x=>x.id===id))return;
      watch.overlap.push({id,n:els.length,frame:watch.frames,elements:els.map(el=>{
        const s=getComputedStyle(el),r=el.getBoundingClientRect();
        return {className:el.className,parentClass:el.parentElement&&el.parentElement.className,
          visibility:s.visibility,opacity:s.opacity,transition:s.transition,
          rect:{left:r.left,top:r.top,width:r.width,height:r.height}};
      })});
    });
    if([...document.querySelectorAll('.death-burn-clone [data-unit-id="A"]')].some(visible))watch.deathFrames++;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
`;
function browserScript(setup, mode, speed) {
  return `
    const setup=${JSON.stringify(setup)};
    window.VB_OPTION_SPEED=${JSON.stringify(speed === 1 ? 'normal' : 'x' + speed)};
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById('scr-battle').classList.add('active');
    G.phase='battle';G.life=3;G._waveLife=3;G.mana=0;G._enemyMana=0;G.gold=0;G.battleCounters={damage:0,deaths:0};
    G.rings=setup.rings.p1;G._battleMotionDepth=0;G._battlePhaseRunning=true;G._savedBattleReplaying=false;
    G._coreDrivenBattle=${mode === 'pve'};
    G._pendingBattleCompact=false;G._battleCompactAnimatingUntil=0;G._battleDefeatHandled=false;
    initializeBattlePresentationState();presentResetPlayback();
    const state=createBattleState(setup);state._coreFirstSide='p1';
    G.allies=state.units.p1;G.enemies=state.units.p2;
    while(G.allies.length<14)G.allies.push(null);while(G.enemies.length<14)G.enemies.push(null);
    renderAll();await new Promise(r=>requestAnimationFrame(r));
    const before=new Set([...G.allies,...G.enemies].filter(Boolean));
    const held=[...before].map(u=>[u,u.atk,u.hp,u.maxHp,u.shield,u.weaken]);
    const initial={p1:state.units.p1.filter(Boolean).map(coreUnitSnapshot),p2:state.units.p2.filter(Boolean).map(coreUnitSnapshot)};
    const events=[],runner=createBattleRunner(state,createSeededRng(53),e=>events.push(e),{skipOpening:true});
    presentBeginPlayback();runner.step({deferCompact:true});
    held.forEach(args=>presentHoldShown(...args));
    const out={events:[{type:'battle_start',sides:initial},...events],formations:{p1:{units:initial.p1},p2:{units:initial.p2}},rings:setup.rings,resources:setup.resources};
    ${mode === 'online' ? "held.forEach(([u])=>presentReleaseShown(u));presentEndPlayback();beginOnlineVersusField(out);" : ''}
    ${WATCH}
    try {
      // 2026-10-10：PvEは実際のbattlePhaseと同じく、外側の再生を閉じてから保留した盤面の詰めを行う。
      ${mode === 'online' ? "await playOnlineBattleEvents(out,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});" : "await _flushCorePveHitEvents(state,events,before);held.forEach(([u])=>presentReleaseShown(u));presentEndPlayback();requestBattleCompact();"}
      await new Promise(r=>setTimeout(r,1900));
      watching=false;
      const actor=(G.allies||[]).find(u=>u&&u.id==='A');
      watch.finalCards=allCards().filter(el=>el.dataset.unitId==='A'&&visible(el)).length;
      watch.alive=!!actor&&actor.hp>0;
      const original=document.querySelector('#f-ally .slot[data-unit-id="A"]'),rect=original&&original.getBoundingClientRect();
      watch.finalOriginal=visible(original);
      watch.finalCenter=rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;
      watch.leftovers=document.querySelectorAll('.attack-motion-clone,.slot.motion-hidden').length;
      watch.events=events.map(e=>e.type+':'+(e.unitId||e.attackerId||'')+':'+(e.amount||''));
      return watch;
    } finally {
      watching=false;_recordBattleTrace=saved.trace;presentSweepAttack=saved.sweep;playUnitDeathBurn=saved.burn;
      ${mode === 'online' ? 'hideOnlineVersusBoard();' : ''}
    }
  `;
}
async function browserChecks() {
  const b = await launch();
  try {
    await b.call('Emulation.setDeviceMetricsOverride', { width:1860,height:1180,deviceScaleFactor:1,mobile:false });
    // 2026-10-10：実Chromeが正規化した書式も同じ踏み込み判定へ通す。
    const cssomTransform=await b.eval("const probe=document.createElement('div');probe.style.transform='translate(42px,-85px) rotate(4deg)';return probe.style.transform;");
    assert.ok(sweepHasStepped({hasClone:true,transform:cssomTransform}),'CSSOMの移動済みtransformを認識する: '+cssomTransform);
    const only = String(process.env.VB_ONLY || '');
    for(const v of variants) for(const route of routes) {
      const tag=v.name+'/'+route;if(only&&!only.split('|').some(x=>tag.includes(x)))continue;
      for(const speed of [1,2,3]) {
        const results=[];
        for(const mode of ['pve','online']) {
          await b.goto(process.env.VB_URL || pathToFileURL(path.join(ROOT,'index.html')).href);
          await b.waitFor("typeof G!=='undefined'&&typeof _flushCorePveHitEvents==='function'&&PANEL_POOL.length>0");
          const r=await b.eval(browserScript(setupFor(v,route),mode,speed));results.push(r);
          assert.ok(r.frames>3, tag+': rAFで実際に観測する');
          assert.deepEqual(r.overlap,[],tag+'/'+mode+'/'+speed+': 同じIDが2枚見えない '+JSON.stringify(r.overlap));
          assert.equal(r.leftovers,0,tag+': 複製・非表示枠が残らない');
          assert.equal(r.finalCards,r.alive?1:0,tag+': 最後は生存なら実枠1枚');
          if(r.alive)assert.ok(r.finalOriginal&&r.initialCenter&&r.finalCenter
            &&Math.hypot(r.initialCenter.x-r.finalCenter.x,r.initialCenter.y-r.finalCenter.y)<4,tag+': 元の位置へ戻る');
          if(route==='呪詛') {
            const sweep=r.sweeps.find(x=>x.id==='A');
            assert.ok(sweepHasStepped(sweep),tag+'/'+mode+'/'+speed+': 踏み込み後の炎 '+JSON.stringify(r.sweeps));
          }
          if(!r.alive) {
            assert.ok(r.burns.some(x=>x.id==='A'&&x.started&&x.moving===0),tag+': 戻って通常死亡');
            assert.ok(r.deathFrames>0,tag+': 死亡カードが実際に見える');
          }
        }
        assert.deepEqual(results[0].events,results[1].events,tag+': コア列一致');
        assert.deepEqual(results[0].motions,results[1].motions,tag+': 演出回数一致');
        console.log('OK '+tag+' '+speed+'倍 PvE/オンライン（毎フレーム1枚・通常死亡・戻り）');
      }
    }
  } finally { await b.close(); }
}
async function main() {
  // ブラウザへ渡すコードもChromeなしで構文確認する。
  for(const mode of ['pve','online']) new vm.Script('(async()=>{'+browserScript(setupFor(variants[0],'呪詛'),mode,1)+'})()');
  await nodeChecks();
  if(!process.argv.includes('--node')) await browserChecks();
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={nodeChecks,setupFor,variants,routes,browserScript};
