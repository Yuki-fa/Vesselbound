'use strict';
// 2026-10-29 利用者報告：「リッチに闇の火球をつけると、リッチの効果で闇の火球のVFXが出ていることがある」。
// 原因：リッチの「常時：味方が死亡するたび、ランダムな敵に4ダメージ」は味方の死亡処理の中で起きるため、
// コアが死亡効果のダメージ（death_effect）として出し、表示側が付けた死亡の強化カード（闇の火球）を発生元に選んでいた。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
let failed = 0;
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
function lichWithFireball() {
  const fire = h.card('E006');
  return h.unit('lich', 'C050', { boardCards: [fire], _adjacentPanelEffectTexts: [fire.desc], _adjacentPanelAbilities: [fire.name],
    effectData: { effectNames: [fire.name], effectTexts: [fire.desc] } });
}
const foes = () => [h.unit('f0'), h.unit('f1'), h.unit('f2')];
(async () => {
  await h.ready;
  await check('味方の死亡でリッチが撃つ4ダメージは、リッチの演出（闇の火球ではない）', async () => {
    const x = h.setup({ sides: { p1: { units: [h.unit('v', null, { hp: 1, maxHp: 1, atk: 1 }), lichWithFireball()] }, p2: { units: foes() } } });
    x.hit(x.find('f0'), x.find('v'), 5);
    const hits = x.events.filter(e => e.type === 'damage' && e.sourceId === 'lich');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].damageKind, 'other', '常時効果のダメージ');
    for (const mode of ['pve', 'online']) {
      await x[mode]();
      const names = h.calls.map(c => c.name);
      assert.ok(names.includes('lich'), mode + ' ' + names);
      assert.ok(!names.includes('dark-fireball'), mode + ' ' + names);
    }
  });
  await check('リッチ自身が死んだ時の闇の火球は、闇の火球の演出', async () => {
    const x = h.setup({ sides: { p1: { units: [lichWithFireball(), h.unit('ally')] }, p2: { units: foes() } } });
    const lich = x.find('lich'); lich.hp = 1;
    x.hit(x.find('f0'), lich, 5);
    assert.ok(x.events.some(e => e.type === 'damage' && e.sourceId === 'lich' && e.damageKind === 'death_effect'));
    await x.pve();
    assert.ok(h.calls.some(c => c.name === 'dark-fireball'), h.calls.map(c => c.name).join(','));
  });
  if (failed) { process.exitCode = 1; console.error(`リッチと闇の火球1029：${failed}件NG`); } else console.log('リッチと闇の火球1029：OK');
})();
