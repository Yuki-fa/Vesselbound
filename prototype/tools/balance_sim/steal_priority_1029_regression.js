'use strict';
// 2026-10-29 利用者指定：「敵を奪う効果は同じタイミングの他の効果より優先処理し、以後の敵を対象にした効果は受けないように
// （奪った敵は既に味方になっているので、リッチなどの対象にならないようにする）」。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
let failed = 0;
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
const withEnchant = (u, no) => { const e = h.card(no); return { ...u, boardCards: [e], _adjacentPanelEffectTexts: [e.desc], _adjacentPanelAbilities: [e.name],
  effectData: { effectNames: [e.name], effectTexts: [e.desc] } }; };
(async () => {
  await h.ready;
  await check('闇の火球を付けたサキュバス：奪った敵へ闇の火球のダメージを与えない', async () => {
    for (let seed = 0; seed < 25; seed++) {
      const succubus = withEnchant(h.unit('succ', 'C115', { hp: 1, maxHp: 1 }), 'E006');
      const x = h.setup({ sides: { p1: { units: [succubus, h.unit('a2')] },
        p2: { units: [h.unit('f0', null, { lane: 'front' }), h.unit('r0', null, { lane: 'rear' }), h.unit('r1', null, { lane: 'rear' })] } } });
      for (let i = 0; i < seed; i++) x.rng.next();
      x.hit(x.find('r0'), x.find('succ'), 5);
      const stolen = x.events.filter(e => e.type === 'unit_stolen').map(e => e.unitId);
      assert.deepEqual(stolen, ['f0'], 'seed ' + seed);
      const stealAt = x.events.findIndex(e => e.type === 'unit_stolen');
      const fireHits = x.events.filter(e => e.type === 'damage' && e.sourceId === 'succ');
      assert.ok(fireHits.length > 0, '闇の火球は発動する');
      assert.ok(fireHits.every(e => e.unitId !== 'f0'), 'seed ' + seed + ' ' + fireHits.map(e => e.unitId));
      assert.ok(x.events.indexOf(fireHits[0]) > stealAt, '奪うのが先');
    }
  });
  await check('同時に倒れた時：奪う効果を先に処理し、リッチの常時効果は奪った敵を狙わない', async () => {
    for (let seed = 0; seed < 25; seed++) {
      const x = h.setup({ sides: { p1: { units: [h.unit('v', null, { hp: 1, maxHp: 1 }), h.unit('succ', 'C115', { hp: 1, maxHp: 1 }), h.unit('lich', 'C050')] },
        p2: { units: [h.unit('f0', null, { lane: 'front' }), h.unit('r0', null, { lane: 'rear' })] } } });
      for (let i = 0; i < seed; i++) x.rng.next();
      coreHitAll(x.state, x.rng, x.emit, x.hit, x.find('r0'), [x.find('v'), x.find('succ')], 5);
      const stealAt = x.events.findIndex(e => e.type === 'unit_stolen');
      assert.ok(stealAt >= 0, '奪う');
      const lichHits = x.events.filter(e => e.type === 'damage' && e.sourceId === 'lich');
      assert.equal(lichHits.length, 2, '味方2体の死亡を観測');
      assert.ok(lichHits.every(e => e.unitId !== 'f0' && x.events.indexOf(e) > stealAt), 'seed ' + seed + ' ' + lichHits.map(e => e.unitId));
    }
  });
  if (failed) { process.exitCode = 1; console.error(`奪う効果の優先1029：${failed}件NG`); } else console.log('奪う効果の優先1029：OK');
})();
