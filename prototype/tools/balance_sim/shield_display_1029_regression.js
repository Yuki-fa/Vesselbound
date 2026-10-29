'use strict';
// 2026-10-29 利用者報告：「エピトメの結界がリッチや闇の火球を防いでいないように見える」。
// コアは結界で正しく防いでいた。カードのキーワード欄が、戦闘中に結界が割れた後もキーワード「結界1」から
// 「結界」を出し続け、結界があるのにダメージが通ったように見えていた。戦闘中は今の結界の有無だけで出す。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
let failed = 0;
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
(async () => {
  await h.ready;
  const fire = h.card('E006');
  const lich = () => h.unit('lich', 'C050', { boardCards: [fire], _adjacentPanelEffectTexts: [fire.desc], _adjacentPanelAbilities: [fire.name],
    effectData: { effectNames: [fire.name], effectTexts: [fire.desc] } });
  await check('コア：結界はリッチの常時効果と闇の火球のダメージを防ぐ（毒・加護があっても）', async () => {
    for (const poison of [0, 3]) {
      const x = h.setup({ sides: { p1: { units: [h.unit('v', null, { hp: 1, maxHp: 1 }), lich(), h.unit('a2')] },
        p2: { units: [h.unit('epi', null, { keywords: ['加護3', '結界1'], hp: 50, maxHp: 50, poison })] } } });
      const epi = x.find('epi');
      x.hit(epi, x.find('v'), 5);
      assert.deepEqual(x.events.filter(e => e.type === 'damage' && e.unitId === 'epi').map(e => [e.amount, e.blockedBy]), [[0, 'shield']]);
      assert.equal(epi.hp, 50);
      x.find('lich').hp = 1; epi.shield = 1; x.events.length = 0;
      x.hit(epi, x.find('lich'), 5);
      assert.deepEqual(x.events.filter(e => e.type === 'damage' && e.unitId === 'epi').map(e => [e.amount, e.blockedBy]), [[0, 'shield']], '闇の火球');
    }
  });
  await check('表示：戦闘中に結界が割れたら、キーワード欄に「結界」を出さない', async () => {
    const x = h.setup({ sides: { p1: { units: [h.unit('a')] }, p2: { units: [h.unit('epi', null, { keywords: ['加護3', '結界1'] })] } } });
    const epi = x.find('epi');
    G.phase = 'player';
    epi._displayShield = 1;
    assert.ok(_unitDisplayKeywords(epi, '').includes('結界'), '結界がある間は出す');
    epi.shield = 0; epi._displayShield = 0;
    assert.ok(!_unitDisplayKeywords(epi, '').includes('結界'), '割れた後は出さない');
    G.phase = 'battle';
    assert.ok(!_unitDisplayKeywords(epi, '').includes('結界'), 'オンラインの対戦画面も同じ');
  });
  await check('表示：盤面外のカード（戦闘外）はキーワードの結界を出す（従来どおり）', async () => {
    G.phase = 'reward';
    const card = { name: 'エルフ', keywords: ['結界1'], desc: '' };
    assert.ok(_unitDisplayKeywords(card, '').includes('結界'));
  });
  if (failed) { process.exitCode = 1; console.error(`結界の表示1029：${failed}件NG`); } else console.log('結界の表示1029：OK');
})();
