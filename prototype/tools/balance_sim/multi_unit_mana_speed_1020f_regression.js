'use strict';
// 実際のコア・PvE・オンライン受け口を使い、描画境界だけを仮時計へ接続する。
// VB_SOURCE_REF=<修正前のコミット> でも同じ検査を実行できる。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
const immediate = setImmediate;
let now = 1000, sequence = 0, failed = 0;
const timers = new Map(), visuals = [], sounds = [], updates = [], flashes = [];
function later(fn, ms, kind = 'timer') {
  const delay = Math.max(0, Number(ms) || 0), id = ++sequence;
  // ブラウザの入れ子タイマーの下限。体ごとの gateMs:0 の await も検出する。
  const entry = { id, at: now + Math.max(4, delay), delay, kind, fn };
  timers.set(id, entry); return id;
}
const wait = (ms, kind) => new Promise(resolve => later(resolve, ms, kind));
async function advance(run) {
  let done = false, error;
  const start = now;
  Promise.resolve().then(run).then(() => { done = true; }, e => { error = e; done = true; });
  for (let step = 0; !done && step < 50000; step++) {
    // Promise の連鎖を全部進めてから、最も近いタイマーへ進む。
    await new Promise(resolve => immediate(resolve));
    if (done) break;
    assert.ok(timers.size, '再生がタイマーなしで停止していない');
    now = Math.min(...[...timers.values()].map(t => t.at));
    for (const t of [...timers.values()].filter(t => t.at <= now)) {
      if (timers.delete(t.id)) t.fn();
    }
  }
  assert.ok(done, '仮時計の上限内で再生が完了する');
  if (error) throw error;
  return now - start;
}
function reset() {
  timers.clear(); visuals.length = sounds.length = updates.length = flashes.length = 0;
  now = 1000;
}
function installClock() {
  global.performance.now = () => now;
  global.getBattlePresentationSpeedScale = () => 1;
  global.setTimeout = (fn, ms, ...args) => later(() => fn(...args), ms);
  global.clearTimeout = id => timers.delete(id);
  global.battlePresentationSetTimeout = (fn, ms) => later(fn, ms, 'battlePresentationSetTimeout');
  global.sleep = ms => wait(ms, 'sleep');
  const render = global.renderAll;
  const syncStates = () => {
    render();
    for (const [side, units] of [['ally', G.allies], ['enemy', G.enemies]])
      for (const u of units || []) if (u) battleFxSyncUnit(u, side, getCurrentUnitSlot(side, u));
  };
  global.renderAll = global.renderField = global.requestBattleCompact = syncStates;
  global._syncEffectFlashWithVfx = () => presentFlushEffectFlashes();
  global.playEffectFlash = (unit, side, color) => { flashes.push({ id: unit.id, side, color, at: now }); };
  global.playSfx = code => { sounds.push({ code, at: now }); return true; };
  global._playCardEffectSfxAtCue = (code, ms) => { sounds.push({ code, ms, at: now }); };
  global.updateUnitDamageUi = unit => {
    updates.push({ id: unit.id, atk: presentShownAtk(unit), hp: presentShownHp(unit), at: now });
  };
  global._playCardEffectVfx = (code, targets, options = {}) => {
    presentFlushEffectFlashes();
    visuals.push({ name: code, targets: targets.map(u => u.id), at: now, ms: options.hitDuration });
    // 本物の _playCardEffectVfx は gateMs だけ待つ。絵の尺を待ちに水増ししない。
    return wait(options.waitForFinish ? options.hitDuration : options.gateMs ?? 180, 'card-vfx-gate');
  };
  global.playHitVfxAtRect = (_rect, _amount, options = {}) => {
    presentFlushEffectFlashes();
    const ms = options.hitDuration || 800;
    later(() => options.onFadeStart?.(), Math.max(0, ms - (options.fadeDuration || 140)), 'cue-fade');
    return wait(options.waitForFinish ? ms : options.gateMs ?? 200, 'cue-gate');
  };
  VbFx.play = (name, options = {}) => {
    if (name.endsWith('-state')) return Promise.resolve(true);
    const base = VbFx.duration(name, options.speed || 1), ms = options.durationMs || base;
    const entry = { name, source: options.source?.element?.dataset.unitId,
      targets: (options.targets || []).map(r => r.element?.dataset.unitId), at: now, ms, end: now + ms };
    visuals.push(entry);
    (options.targets || []).forEach((_, i) => later(() => options.onImpact?.(i),
      options.impactTimesMs?.[i] ?? VbFx.impactMs(name, options.speed || 1) * ms / base, 'vfx-impact'));
    (options.cueTimesMs || []).forEach((t, i) => later(() => options.onCue?.(i), t, 'vfx-cue'));
    return wait(ms, 'vfx-completion');
  };
}
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
function fixture(count, manySpriggans) {
  const activation = h.card('E045');
  const row = h.sheetRows('enchant').find(r => r['No.'] === activation.no);
  const threshold = { cost: Number(activation.desc.match(/^(\d+)マナ/)[1]), repeat: true,
    no: activation.no, desc: coreManaThresholdDescFromText(activation.desc), order: Number(row['マナ順位']) };
  const units = Array.from({ length: count }, (_, i) => h.unit('ally' + i, manySpriggans || i === 0 ? 'C079' : 'C087', {
    // コピー出撃後に20マナへ到達した状況。全員へ活性化2枚を接続する。
    boardCards: [activation, activation], _adjacentPanelEffectTexts: [activation.desc, activation.desc],
    _extraManaThresholds: [h.clone(threshold), h.clone(threshold)],
  }));
  const x = h.setup({ sides: { p1: { units }, p2: { units: [h.unit('foe', '', { hp: 10000, maxHp: 10000 })] } },
    resources: { p1: { mana: 40 } } });
  renderAll();
  coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit);
  return x;
}
async function measure(mode, count, manySpriggans = false) {
  reset();
  const x = fixture(count, manySpriggans), serialized = JSON.stringify(x.events);
  // setup の後始末によるタイマーは計測に含めない。
  reset();
  const elapsed = await advance(async () => {
    if (mode === 'PvE') await x.pve();
    else {
      const result = { events: [{ type: 'battle_start', sides: h.clone(x.before) }, ...h.clone(x.events)],
        formations: Object.fromEntries(['p1', 'p2'].map(side => [side,
          { units: x.before[side], rings: x.state.rings[side], items: x.state.items[side] }])) };
      beginOnlineVersusField(result);
      await playOnlineBattleEvents(result, { onEvent: renderOnlineVersusBoard });
    }
    // 終了時の表示値も、コアが確定した値と一致していること。
    for (const expected of x.state.units.p1) {
      if (!expected) continue;
      const shown = G.allies.find(u => u?.id === expected.id);
      assert.equal(presentShownAtk(shown), expected.atk, mode + ' ATK');
      assert.equal(presentShownHp(shown), expected.hp, mode + ' HP');
      assert.equal(presentShownMaxHp(shown), expected.maxHp, mode + ' 最大HP');
    }
  });
  assert.equal(JSON.stringify(x.events), serialized, 'コアのイベント列を変更しない');
  // elapsed は全てのタイマー・sleep・VFX完了待ちによる時計の前進量の合計。
  // 同時に待つ全員の尺は1回だけ数え、待っていない安全弁や取り消した予約は加算しない。
  const result = { mode, count, elapsed, events: h.clone(x.events),
    visuals: h.clone(visuals), sounds: h.clone(sounds), updates: h.clone(updates), flashes: h.clone(flashes) };
  if (mode !== 'PvE') hideOnlineVersusBoard();
  return result;
}
(async () => {
  await h.ready; installClock();
  const measurements = [];
  for (const manySpriggans of [false, true]) {
    const results = {};
    for (const mode of ['PvE', 'オンライン']) {
      results[mode] = [];
      for (const count of [1, 3, 6]) {
        const r = await measure(mode, count, manySpriggans);
        results[mode].push(r);
        measurements.push({ 構成: manySpriggans ? '全員スプリガン＋活性化2枚' : '活性化2枚＋スプリガン1体',
          再生: mode, 体数: count, 再生待ち合計ms: Number(r.elapsed.toFixed(2)) });
      }
      await check(`${mode}：${manySpriggans ? '固有VFXも' : '活性化も'}6体で1体の1.3倍以内`, () => {
        for (const r of results[mode].slice(1)) {
          assert.ok(r.elapsed <= results[mode][0].elapsed * 1.3, '同時VFXの完了待ちが体数に比例しない');
        }
      });
      await check(`${mode}：発動回ごとに能力値・VFX・SEを全員同時に見せる`, () => {
        for (const r of results[mode]) {
          const thresholds = r.events.filter(e => e.type === 'mana_threshold' && e.effectNo === 'E045');
          const waves = new Set(thresholds.map(e => e.wave));
          const buffs = r.visuals.filter(v => v.name === 'S008');
          assert.equal(r.sounds.filter(s => Assets.sfx[s.code] === Assets.sfx.S008).length, waves.size,
            '能力変化のSEは素材キーの別名も含めてwaveにつき1本');
          assert.equal(buffs.length, waves.size, '能力変化のVFXはwave単位で全員を対象にする');
          assert.ok(buffs.every(v => new Set(v.targets).size === r.count), '全員に同じVFXを出す');
          assert.equal(buffs[0].ms, PRESENT_CARD_EFFECT_VFX_MS, '初回の尺を保つ');
          assert.ok(buffs.slice(1).every(v => v.ms === PRESENT_MANA_RUN_GAP_MS), '2回目以降の既存の尺を保つ');
          const statEvents = r.events.filter(e => e.type === 'stat_change');
          assert.equal(r.updates.length, statEvents.length, '全能力変化を1回ずつ反映する');
          for (let wave = 0; wave < waves.size; wave++) {
            const changes = r.updates.slice(wave * r.count * 2, (wave + 1) * r.count * 2);
            assert.equal(new Set(changes.map(c => c.at)).size, 1, '同じwaveの数値を同時に更新する');
          }
          const main = r.visuals.filter(v => v.name === 'spriggan');
          assert.ok(main.length, 'スプリガンの実経路を通る');
          assert.ok(Math.min(...main.map(v => v.at)) >= Math.max(...buffs.map(v => v.at)), '上位の活性化を全部終えてからスプリガンへ移る');
          if (manySpriggans) {
            const byTime = new Map();
            for (const v of main) byTime.set(v.at, (byTime.get(v.at) || 0) + 1);
            assert.ok([...byTime.values()].every(n => n === r.count), '同じwaveの固有VFXを全員同時に開始する');
            assert.equal(r.sounds.filter(s => s.code === 'C079').length, byTime.size, '固有SEもwaveにつき1本');
            const gains = r.visuals.filter(v => v.name === 'shield-gain');
            assert.equal(gains.length, byTime.size, '結界獲得の引き継ぎもwaveにつき1組');
            for (const gain of gains) {
              const previous = main.filter(v => v.at < gain.at).at(-1);
              assert.ok(gain.at >= previous.end, '固有VFXが消えてから結界獲得へ続ける');
            }
          }
        }
      });
    }
    await check('PvEとオンラインの尺・数値・SEが一致する', () => {
      for (let i = 0; i < 3; i++) {
        const a = results.PvE[i], b = results['オンライン'][i];
        assert.equal(b.elapsed, a.elapsed);
        assert.deepEqual(b.visuals.map(v => [v.name, v.at, v.ms, v.targets]), a.visuals.map(v => [v.name, v.at, v.ms, v.targets]));
        assert.deepEqual(b.sounds, a.sounds);
        assert.deepEqual(b.updates, a.updates);
      }
    });
  }
  await check('固有VFXの対象ごとの命中時刻を、同時発動の能力更新で追い越さない', async () => {
    reset();
    const sources = [h.unit('early', 'C008'), h.unit('late', 'C008')];
    const x = h.setup({ sides: { p1: { units: sources }, p2: { units: [h.unit('foe')] } },
      resources: { p1: { mana: sources[0].manaCost } } });
    renderAll(); coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit); reset();
    const play = VbFx.play;
    VbFx.play = (name, options) => play(name, name === 'arachne-ring' ? { ...options,
      impactTimesMs: options.targets.map(() => options.source.element.dataset.unitId === 'early' ? 100 : 500) } : options);
    try { await advance(() => x.pve()); } finally { VbFx.play = play; }
    const shownAtk = new Map(x.before.p1.concat(x.before.p2).filter(Boolean).map(u => [u.id, u.atk]));
    const buffs = updates.filter(u => {
      const changed = u.atk !== shownAtk.get(u.id); shownAtk.set(u.id, u.atk); return changed;
    });
    assert.equal(buffs.length, 4, '2発動元×味方2体の能力変化を全部表示する');
    assert.equal(buffs[2].at - buffs[0].at, 400, '各発動元のVFXの命中で能力値を更新する');
  });
  await check('同じwaveでも、陣営・効果・攻撃／死亡の境界をまたいで能力変化を先出ししない', () => {
    const threshold = { type: 'mana_threshold', side: 'p1', unitId: 'a', wave: 1, effectNo: 'E045', cost: 1, desc: '強化' };
    const stat = { type: 'stat_change', side: 'p1', unitId: 'a', sourceId: 'a', reason: 'mana_threshold', atk: 1, hp: 1 };
    for (const boundary of [
      [{ ...threshold, side: 'p2', unitId: 'b' }],
      [{ ...threshold, effectNo: 'C088', unitId: 'b' }],
      [{ ...threshold, wave: 2, unitId: 'b' }],
      [{ type: 'attack' }, { ...threshold, unitId: 'b' }],
      [{ type: 'death' }, { ...threshold, unitId: 'b' }],
    ]) {
      const evs = [{ ...threshold }, { ...stat }, ...boundary, { ...stat, sourceId: 'b', unitId: 'b' }];
      assert.deepEqual(presentManaStatChangeEvents(evs[1], evs, 1), [evs[1]]);
    }
  });
  console.log('計測 ' + JSON.stringify(measurements));
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
