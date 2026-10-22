'use strict';
// 2026-10-22 利用者指定：
// 「邪眼の巻物 対象のキャラクターに邪眼Xを与える。などはXは1〜5のランダムで、レアリティと一致します。
//   また、レアリティが違っても同じ種類の巻物は同時に出しません。」
// シートで「実装」が false の巻物も、true にした時にこの規則で出るよう、検査では実装扱いにして抽選する。
const assert = require('node:assert/strict');
const { initialize } = require('./run_bot');
let checked = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); checked++; console.log('OK ' + name); }
  catch (e) { failed++; console.log('NG ' + name + '\n' + (e && e.stack || e)); }
}
(async () => {
  await initialize();
  const byNo = no => ITEM_POOL.find(i => 'I' + String(i.no).padStart(3, '0') === no);
  const xItems = ['I015', 'I016', 'I017'].map(byNo);
  await check('シートのレアリティ「X」を読み、キーワードを与える巻物は共通の処理で動く', () => {
    xItems.forEach(item => { assert.ok(item, '巻物がある'); assert.equal(item._rarityX, true, item.name); assert.equal(item.itemEffectKey, 'keyword_scroll'); assert.ok(!item._noItemEffectImpl); });
    assert.equal(byNo('I018').itemEffectKey, 'keyword_scroll', '二段攻撃の巻物');
    assert.equal(byNo('I003').itemEffectKey, 'shield_scroll', '専用の処理を持つ盾の巻物はそのまま');
  });
  const saved = xItems.map(i => i._implemented);
  xItems.forEach(i => { i._implemented = true; });
  try {
    await check('X は 1〜5 で、レアリティ・本文の数字と一致する', () => {
      const seen = new Set();
      for (let k = 0; k < 300; k++) for (const it of drawItems(3, 5)) {
        if (!it._xValue) continue;
        assert.ok(it._xValue >= 1 && it._xValue <= 5);
        assert.equal(it.rarity, it._xValue, it.name + ' のレアリティ');
        assert.ok(!/X/.test(it.desc), '本文に X が残らない');
        assert.ok(it.desc.includes(String(it._xValue)), '本文に X の値');
        seen.add(it._xValue);
      }
      assert.equal(seen.size, 5, '1〜5 の全てが出る');
    });
    await check('レアリティが違っても同じ種類の巻物は同時に出さない', () => {
      for (let k = 0; k < 300; k++) {
        const names = drawItems(3, 5).map(it => it.name);
        assert.equal(new Set(names).size, names.length, names.join('・'));
      }
    });
    await check('X を指定しない作り方（デバッグの一覧など）でも 1〜5 に決まる', () => {
      const it = makeItem(xItems[1].id);
      assert.ok(it._xValue >= 1 && it._xValue <= 5);
      assert.equal(it.rarity, it._xValue);
      assert.equal(makeItem(xItems[1].id, 4).desc, '対象のキャラクターに邪眼4を与える。');
    });
  } finally { xItems.forEach((i, n) => { i._implemented = saved[n]; }); }
  console.log(`アイテムX1022：${checked}件成功・${failed}件失敗`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
