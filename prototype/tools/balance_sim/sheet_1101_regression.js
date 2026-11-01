'use strict';
// 2026-11-01 シート追加の強化（E014・E078〜E087）をコアへ実装した検査。通常・強化後、PvE・保存再計算・オンライン入口の一致まで。
const assert = require('node:assert/strict');
let failed = 0;
const check = async (name, fn) => { try { await fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); } };
(async () => {
  const H = require('./rules_1026_harness');
  const { card, enchanted, plain, harness, initRun, pipelines } = H;
  console.table = () => {}; await loadGameData();
  const run = (h, steps = 400) => { const runner = createBattleRunner(h.state, h.rng, h.emit); for (let i = 0; i < steps && !runner.result; i++) { runner.step({ deferCompact: true }); runner.compact(); } return runner.finish(); };
  const opening = h => coreRunOpening ? coreRunOpening(h.state, h.rng, h.emit, h.hit) : null;
  // 魔導板で1体組む（実戦と同じ formation）。slot1のキャラクターに、slot0の強化を右向きで接続。
  function formed(no, enhanced, opts = {}) {
    initRun(); G.mainBoard.fill(null); G.mapPanelPowers = opts.powers || {};
    const c = card(no, enhanced); c.directions = ['right']; G.mainBoard[opts.panelSlot ?? 0] = c;
    (opts.extra || []).forEach(([slot, x]) => { G.mainBoard[slot] = x; });
    const base = { ...makePanel(PANEL_POOL.find(x => x.no === 'C006').id), directions: ['left', 'up', 'down'] };
    G.mainBoard[(opts.panelSlot ?? 0) + 1] = base;
    const f = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false });
    return f.ordered.find(e => e.unit._mainBoardSlot === (opts.panelSlot ?? 0) + 1).unit;
  }
  const unitFrom = (u, id = 'source', extra = {}) => ({ ...u, id, effectData: { releaseAtkBonus: 0, releaseHpBonus: 0, ...u.effectData }, ...extra });

  await check('E014 魔力の盾：8マナで結界を得る（強化後は8マナ毎）', async () => {
    for (const enhanced of [false, true]) {
      const h = harness('p1', [unitFrom(formed('E014', enhanced))], { resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
      h.state.resources.p1.mana = 8;
      coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit);
      assert.ok(h.u.shield > 0, '8マナで結界を得る');
      h.u.shield = 0; h.state.resources.p1.mana = 16;
      coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit);
      assert.equal(h.u.shield > 0, enhanced, '16マナで再び得るのは強化後（8マナ毎）だけ');
      await pipelines(h.initial);
    }
  });
  await check('E078 最強の武器：+25/+25（強化+50/+50）、他の強化の効果は無効（キーワード・本文・数値とも）', () => {
    for (const enhanced of [false, true]) {
      const lifesteal = card('E001'); lifesteal.directions = ['down'];
      const u = formed('E078', enhanced, { extra: [] });
      const base = PANEL_POOL.find(x => x.no === 'C006');
      assert.equal(u.atk, Number(base.power ?? base.atk) + (enhanced ? 50 : 25));
      // 同じキャラクターへ別の強化（上から接続）を足しても効果が乗らない
      initRun(); G.mainBoard.fill(null); G.mapPanelPowers = {};
      const w = card('E078', enhanced); w.directions = ['right']; G.mainBoard[5] = w;
      const other = card('E086'); other.directions = ['down']; G.mainBoard[1] = other;
      G.mainBoard[6] = { ...makePanel(base.id), directions: ['left', 'up'] };
      const enh = _collectAdjacentEnhancements(_getPartyBoardUnit(), 6);
      assert.ok(!enh.keywords.some(k => /邪眼/.test(k)), '邪眼（深淵の目）が無効');
      assert.ok(_enchantmentEffectsList({ ..._getPartyBoardUnit(), _ownedBoardPreview: true }, 6).every(e => e.panel.no !== 'E086'), '表示も最強の武器だけ');
      G.mainBoard[5] = null;
      assert.ok(_collectAdjacentEnhancements(_getPartyBoardUnit(), 6).keywords.some(k => /邪眼/.test(k)), '最強の武器が無ければ邪眼を得る');
    }
  });
  await check('E079 ポリリズム：攻撃で異なる色の味方全員に+1/+1（強化後は2回）', async () => {
    for (const enhanced of [false, true]) {
      const src = enchanted('E079', enhanced, undefined, { color: '赤' });
      const h = harness('p1', [src, plain('blue', { color: '青' }), plain('red', { color: '赤' })]);
      coreApplyAttackEffects(h.u, h.state, h.rng, h.emit, h.hit);
      const gain = id => h.events.filter(e => e.type === 'stat_change' && e.unitId === id && e.reason === 'polyrhythm').length;
      assert.equal(gain('blue'), enhanced ? 2 : 1); assert.equal(gain('red'), 0); assert.equal(gain('source'), 0);
      await pipelines(h.initial);
    }
  });
  await check('E080 強打・E086 深淵の目：衝撃1/2・邪眼1/2を得る', () => {
    for (const [no, kw] of [['E080', '衝撃'], ['E086', '邪眼']]) for (const enhanced of [false, true]) {
      const u = formed(no, enhanced);
      assert.ok(coreUnitKeywords(u).includes(kw + (enhanced ? 2 : 1)), no + enhanced);
    }
  });
  await check('E081 鳥葬：死亡で緑ペリカンを1体（強化後2体）召喚', async () => {
    for (const enhanced of [false, true]) {
      const h = harness('p1', [enchanted('E081', enhanced, undefined, { hp: 1, maxHp: 1 }), plain('ally')]);
      h.u.hp = 0;
      coreTriggerDeath(h.u, h.state, h.emit, h.rng, h.hit);
      coreApplyDeathEffects(h.u, h.state, h.rng, h.emit, h.hit);
      const summons = h.events.filter(e => e.type === 'summon' && e.side === 'p1');
      assert.equal(summons.length, enhanced ? 2 : 1);
      assert.ok(summons.every(e => /ペリカン/.test(e.unit && e.unit.name || e.name || '')), JSON.stringify(summons.map(e => e.unit && e.unit.name)));
    }
  });
  await check('E082 複製：特殊マスに置いた時だけ、開戦で1/1のコピー（強化後2体）', () => {
    for (const enhanced of [false, true]) for (const special of [false, true]) {
      initRun(); G.mainBoard.fill(null); G.mapPanelPowers = special ? { 5: 'summon' } : {};
      const c = card('E082', enhanced); c.directions = ['right']; G.mainBoard[5] = c;
      G.mainBoard[6] = { ...makePanel(PANEL_POOL.find(x => x.no === 'C006').id), directions: ['left'] };
      const enh = _collectAdjacentEnhancements(_getPartyBoardUnit(), 6);
      assert.equal(enh.effectTexts.some(t => /コピー/.test(t)), special, `special=${special}`);
    }
  });
  await check('E083 死体漁り：このキャラクターが敵を倒すと15G（強化後30G）。最後の敵を倒した時も得る', async () => {
    for (const enhanced of [false, true]) {
      const h = harness('p1', [enchanted('E083', enhanced, undefined, { atk: 50 })], { foes: [plain('foe', { hp: 10, maxHp: 10, atk: 1 })] });
      h.hit(h.u, h.foes[0], 50);
      const gold = h.events.filter(e => e.type === 'gold_gain' && e.reason === 'scavenger');
      assert.equal(gold.length, 1); assert.equal(gold[0].amount, enhanced ? 30 : 15);
      await pipelines(h.initial);
    }
  });
  await check('E084 金の盾：受けるダメージを所持金で払って無効（強化後は半分）。払えない分は受ける', async () => {
    for (const enhanced of [false, true]) {
      const h = harness('p1', [enchanted('E084', enhanced)], { resources: { p1: { mana: 0, gold: 10 }, p2: { mana: 0, gold: 0 } } });
      const hp = h.u.hp;
      h.hit(h.foes[0], h.u, 6);
      assert.equal(h.u.hp, hp, '6ダメージは全て無効');
      assert.equal(h.state.resources.p1.gold, enhanced ? 7 : 4);
      h.hit(h.foes[0], h.u, 20);
      const paid = enhanced ? 7 : 4, nullified = enhanced ? 14 : 4;
      assert.equal(h.state.resources.p1.gold, 0);
      assert.equal(h.u.hp, hp - (20 - nullified), '払えない分は受ける');
      assert.ok(h.events.some(e => e.type === 'gold_spend' && e.reason === 'gold_shield' && e.amount === paid));
      await pipelines(h.initial);
    }
  });
  await check('E085 金の剣：開戦でATK+所持金の半分（強化後は所持金）、所持金が変わると追従', async () => {
    for (const enhanced of [false, true]) {
      const h = harness('p1', [enchanted('E085', enhanced)], { resources: { p1: { mana: 0, gold: 41 }, p2: { mana: 0, gold: 0 } } });
      const atk = h.u.atk;
      coreApplyOpeningEffects(h.u, h.state, h.rng, h.emit, h.hit);
      assert.equal(h.u.atk, atk + (enhanced ? 41 : 20));
      coreGainResource(h.state, 'p1', 'gold', 9, null, h.emit, 'test');
      assert.equal(h.u.atk, atk + (enhanced ? 50 : 25));
      await pipelines(h.initial);
    }
  });
  await check('E087 勇猛果敢：開戦で結界を得てから攻撃する（強化後は2回）', async () => {
    for (const enhanced of [false, true]) {
      const h = harness('p1', [enchanted('E087', enhanced, undefined, { atk: 3 })], { foes: [plain('foe', { hp: 100, maxHp: 100, atk: 1 })] });
      coreApplyOpeningEffects(h.u, h.state, h.rng, h.emit, h.hit);
      const attacks = h.events.filter(e => e.type === 'attack' && e.attackerId === 'source');
      assert.equal(attacks.length, enhanced ? 2 : 1);
      const firstAttack = h.events.findIndex(e => e.type === 'attack');
      assert.ok(h.events.slice(0, firstAttack).some(e => e.type === 'keyword_effect' && e.effect === 'shield' && e.unitId === 'source'), '攻撃の前に結界');
      assert.equal(h.foes[0].hp, 100 - 3 * (enhanced ? 2 : 1));
      await pipelines(h.initial);
    }
  });
  if (failed) { process.exitCode = 1; console.error(`シート1101：${failed}件NG`); } else console.log('シート1101：OK');
})();
