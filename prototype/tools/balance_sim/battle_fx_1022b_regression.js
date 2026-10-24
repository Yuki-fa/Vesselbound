'use strict';
// 2026-10-22 の3件。実コア・保存再生・両受け口・VFXレンダラーをNodeで動かす。
// 仮DOMと手動フレームでの確認であり、画面・聴感の確認とは分ける。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { harness } = require('./vfx_data_regression');
const h = require('./presentation_1020b_harness');
const root = path.resolve(__dirname, '../..');
const source = file => process.env.VB_SOURCE_REF
  ? execFileSync('git', ['show', `${process.env.VB_SOURCE_REF}:prototype/${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 4e6 })
  : fs.readFileSync(path.join(root, file), 'utf8');
let checked = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); checked++; console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
function renderer() {
  return harness(false, null, { sourceLoader: file => file === 'js/vfx/renderer.js'
    ? source(file) : fs.readFileSync(path.join(root, file), 'utf8') });
}
const echoes = r => r.body.children.flatMap(el => el.children).filter(el => el._vbFxMask);
const visibleEchoes = r => echoes(r).filter(el => el.isConnected && el.style.visibility !== 'hidden' && Number(el.style.opacity) > 0);
const basic = (id, extra = {}) => h.unit(id, '', { atk: 1, hp: 200, maxHp: 200, desc: '', keywords: [], ...extra });
function opening(options = {}) {
  const dragon = h.unit('dragon', 'C064');
  const x = h.setup({ sides: { p1: { units: [dragon] }, p2: { units: [basic('foe', { hp: options.hp || 1000, maxHp: options.hp || 1000 })] } },
    rings: { p1: [h.card('R023', 'ring')], p2: [] }, summonDefs: PANEL_POOL });
  x.state.resources.p1.mana = 20;
  coreRunOpening(x.state, x.rng, x.emit, x.hit, () => {});
  assert.ok(x.events.some(e => e.type === 'transform'), 'ドラゴネットの実際の変身を通る');
  return x;
}
async function observeMorph(play) {
  const sleep0 = global.sleep, render0 = global.renderAll, field0 = global.renderField, fx0 = VbFx.play, victory0 = global.finishBattleAsVictory;
  const seen = []; let impact = false;
  const sample = () => {
    const dragon = G.allies.find(u => u?.id === 'dragon');
    if (dragon) seen.push({ impact, no: battleFxShownForm(dragon).no });
  };
  global.renderAll = () => { sample(); render0(); };
  global.renderField = (...args) => { sample(); field0(...args); };
  global.sleep = async () => global.renderAll();
  global.finishBattleAsVictory = async () => {};
  VbFx.play = (name, options) => {
    sample();
    if (name === 'dragonnet') {
      const hit = options.onImpact;
      options = { ...options, onImpact: i => { sample(); impact = true; hit?.(i); } };
    }
    return fx0(name, options);
  };
  try {
    await play();
    assert.ok(impact, '変身の固有VFXを再生する');
    assert.ok(seen.some(s => !s.impact));
    assert.ok(seen.filter(s => !s.impact).every(s => s.no === 'C064'), JSON.stringify(seen.slice(0, 10)));
    assert.ok(seen.some(s => s.impact && s.no === 'CF004'), '命中後に緑ドラゴンへ替える');
  } finally { global.sleep = sleep0; global.renderAll = render0; global.renderField = field0; VbFx.play = fx0; global.finishBattleAsVictory = victory0; }
}

(async () => {
  await h.ready;
  SaveRun.ready();
  await check('1：消えたカードのechoを後の死亡位置へ残さない', async () => {
    const r = renderer();
    r.source.dataset.unitId = '先に死亡した体';
    let current = r.source;
    const done = r.fx.play('overlord', { source: r.source, targets: [r.target], durationMs: 1000,
      resolveElement: () => current, seed: 53 });
    r.step(0); r.step(180);
    assert.ok(visibleEchoes(r).length, '実際にカードの複製が出ている');
    r.source.isConnected = false; current = null;
    // 死亡後にカードが消え、次の体の死亡演出でフレームが進む場面。
    r.step(200);
    assert.equal(visibleEchoes(r).length, 0, '参照先のない以前の絵が、最後の位置・濃さで残った');
    r.fx.stopAll(); await done;
  });
  await check('1：echoの表示区間が終わった後、別のVFXが続いても複製を描かない', async () => {
    const r = renderer();
    const done = r.fx.play('overlord', { source: r.source, targets: [r.target], durationMs: 1000, seed: 53 });
    r.step(0); r.step(180); assert.ok(visibleEchoes(r).length);
    r.step(650);
    assert.equal(visibleEchoes(r).length, 0, '層の終了後も最後に描いた残像が残った');
    r.fx.stopAll(); await done;
  });
  await check('1：詰め直した別キャラのスロットを、失われたIDの代用にしない', () => {
    const body = source('js/engine/render.js');
    const start = body.indexOf('function getCurrentUnitSlot('), end = body.indexOf('\n// ', start);
    const old = basic('old', { hp: 0 }), next = basic('next');
    const slot = { dataset: { unitId: next.id }, classList: { contains: () => false }, getBoundingClientRect: () => ({ width: 95, height: 140 }) };
    const field = { querySelectorAll: () => [slot], querySelector: () => slot };
    const c = { G: { enemies: [old, next] }, document: { getElementById: () => field } };
    vm.createContext(c); vm.runInContext(body.slice(start, end), c);
    assert.equal(c.getCurrentUnitSlot('enemy', old), null, 'IDが違う生存カードを死亡用に複製する');
    assert.equal(c.getCurrentUnitSlot('enemy', next), slot);
    assert.equal(c.getCurrentUnitSlot('enemy', 0), slot, '添字を指定する既存APIは維持');
  });
  await check('1：盤面から外れた体の旧DOMは、接続中でもVFXへ再接続しない', () => {
    h.setup({ sides: { p1: { units: [basic('ally')] }, p2: { units: [basic('next')] } } });
    const old = { dataset: { unitId: 'old' }, isConnected: true };
    assert.equal(_battleFxResolveElement(old), null);
  });

  for (const hp of [50, 1000]) for (const mode of ['pve', 'online']) {
    await check(`2：開戦の変身直後も嵐の指輪の落雷を出す（${mode}・敵HP${hp}）`, async () => {
      const x = opening({ hp });
      const expected = x.events.filter(e => e.type === 'ring_effect' && e.ring === '嵐の指輪').length;
      assert.equal(expected, hp === 50 ? 1 : 2);
      const before = structuredClone({ events: x.events, state: x.state.units });
      await x[mode]();
      assert.equal(h.calls.filter(c => c.name === 'storm-ring').length, expected, '直前のマナ効果へ指輪の命中が取り込まれた');
      assert.deepEqual(x.events, before.events, '表示でコアイベントを変えない');
      if (mode === 'pve') assert.deepEqual(x.state.units.p1.map(u => [u.id, u.atk, u.hp]), before.state.p1.map(u => [u.id, u.atk, u.hp]));
    });
  }
  await check('2：保存ありの闘技場継戦で発動済み回数をsetup・各frame・復元・Gまで渡す', async () => {
    const x = h.setup({ sides: { p1: { units: [basic('ally', { atk: 100 })] }, p2: { units: [basic('foe', { hp: 1, maxHp: 1 })] } },
      rings: { p1: [h.card('R023', 'ring')], p2: [] } });
    initState(); G._runId = 'battle-fx-1022b'; G._runSeed = 7; G._runRngState = 7;
    G._arenaActive = true; G._arenaRound = 2; G._wave = 3; G._waveStage = 2; G._waveLife = 3;
    G.allies = x.state.units.p1; G.enemies = x.state.units.p2; G.rings = [h.card('R023', 'ring')];
    G.mana = 20; G._stormRingFireCount = 2;
    const p = await SaveRun.prepareBattle();
    assert.equal(p.events.filter(e => e.type === 'ring_effect' && e.ring === '嵐の指輪').length, 0, '持ち越し20マナで再発動した');
    assert.equal(p.setup._stormRingFireCount, 2);
    assert.ok(p.frames.every(f => f.state._stormRingFireCount === 2));
    const save = SaveRun.buildRunSave('battle', p); SaveRun.saveRun(save);
    const loaded = SaveRun.loadRun(); assert.ok(loaded);
    G._stormRingFireCount = 0; SaveRun.installSetup(loaded.pendingBattle);
    assert.equal(G._stormRingFireCount, 2, '保存からの再開');
    G._battleCoreEvents = [];
    G._savedBattleEnd = { pending: loaded.pendingBattle, applied: false };
    const state = { units: { p1: G.allies, p2: G.enemies } };
    SaveRun.applyEnd(state);
    assert.equal(G._stormRingFireCount, 2, '最終frameからGへの同期');
    // 次に得た10マナだけで1回発動する。到達済みの2回を再演しない。
    G.mana = 30; G.enemies = [basic('next-foe', { side: 'p2', hp: 1000, maxHp: 1000 })];
    const next = _createPveCoreState(), events = [], rng = createSeededRng(9);
    const hit = (a, b, n, c, ss, st, options) => coreResolveHit(next, a, b, n, c, rng, e => events.push(e), options);
    coreApplyRingManaEffects(next, rng, e => events.push(e), hit);
    assert.equal(events.filter(e => e.type === 'ring_effect').length, 1);
  });
  await check('2：PvEの旧マナ入口も、コアの指輪イベントと同じ落雷を再生する', async () => {
    const x = h.setup({ sides: { p1: { units: [basic('ally')] }, p2: { units: [basic('foe', { hp: 50, maxHp: 50 })] } },
      rings: { p1: [h.card('R023', 'ring')], p2: [] } });
    G.rings = [h.card('R023', 'ring')]; G.mana = 20; G._stormRingFireCount = 0;
    G._coreDrivenBattle = false;
    await _checkRingManaThresholdEffects();
    assert.equal(G._stormRingFireCount, 2, '全滅後の残りの到達分をコアで消費する');
    assert.equal(h.calls.filter(c => c.name === 'storm-ring').length, 1);
  });
  await check('2：保存なしの開戦後も、発動済み回数を同期して旧キューで二重発動させない', async () => {
    h.setup({ sides: { p1: { units: [basic('mana', { desc: '開戦：20マナを得る。' })] },
      p2: { units: [basic('foe', { hp: 1000, maxHp: 1000 })] } } });
    G.rings = [h.card('R023', 'ring')]; G.mana = 0; G._stormRingFireCount = 0;
    await _finishNewPanelBattleStartEffects();
    assert.equal(G._stormRingFireCount, 2, '開戦コアからGへ戻す');
    assert.equal(G.enemies[0].hp, 800);
    await _checkRingManaThresholdEffects();
    assert.equal(G.enemies[0].hp, 800, '同じ20マナで追加のダメージを与えない');
    assert.equal(h.calls.filter(c => c.name === 'storm-ring').length, 2);
  });

  await check('3：保存再生中の多数のマナ効果で描き直しても、変身VFXの命中まで元の絵を保つ', async () => {
    const x = h.setup({ sides: { p1: { units: [basic('mana', { desc: '開戦：20マナを得る。' }),
      basic('buff', { manaCost: 1, manaRepeat: true, manaThresholdDesc: 'このキャラクターは+1/+1を得る。',
        _manaThresholdNo: 'E045', _manaThresholdOrder: 1 }), h.unit('dragon', 'C064')] },
      p2: { units: [basic('foe', { hp: 1, maxHp: 1 })] } }, summonDefs: PANEL_POOL });
    x.state.blood = { p1: 0, p2: 0 };
    x.state.life = x.state.maxLife = { p1: 3, p2: 3 };
    const p = SaveRun.computeBattle(x.state, 13, { skipBattleEnd: true });
    assert.ok(p.events.filter(e => e.type === 'mana_threshold').length >= 20, '多数のマナ効果を再現');
    assert.ok(p.events.some(e => e.type === 'transform' && e.unitId === 'dragon'));
    SaveRun.installSetup(p); G._battleRunId = 1; G._battleCoreEvents = [];
    await observeMorph(() => SaveRun.replay(p, 1));
  });
  await check('3：保存なしの開戦でも、コア計算後の描き直しで変身後の絵を先に出さない', async () => {
    h.setup({ sides: { p1: { units: [basic('mana', { desc: '開戦：20マナを得る。' }), h.unit('dragon', 'C064')] },
      p2: { units: [basic('foe')] } }, summonDefs: PANEL_POOL });
    G.mana = 0;
    await observeMorph(() => _finishNewPanelBattleStartEffects());
  });
  await check('3：オンラインでも変身の命中前後で同じ姿を見せる', async () => {
    const x = opening();
    await observeMorph(() => x.online());
  });
  console.log(`戦闘演出1022b：${checked}件OK / ${failed}件NG（画面・聴感は別途確認）`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
