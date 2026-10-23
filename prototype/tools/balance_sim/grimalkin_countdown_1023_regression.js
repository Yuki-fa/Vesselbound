'use strict';
// 2026-10-23 利用者指摘：「グリマルキンの（あとX戦）が、Xのままです。」
// X は次に発動するまでの残りの戦闘数（N回目の終戦ごと − 数えた終戦の回数 _battleEndCount）。
const assert = require('node:assert/strict');
const { initialize } = require('./run_bot');
(async () => {
  await initialize();
  const def = PANEL_POOL.find(p => p.name === 'グリマルキン');
  assert.ok(def && /（あとX戦）/.test(def.desc), 'シートの本文に（あとX戦）');
  const shown = count => _rawSubstitutedDesc({ ...def, _battleEndCount: count }).match(/（あと(\d+)戦）/)?.[1];
  assert.deepEqual([0, 1, 2, 3, 4, 5, 8].map(shown), ['4', '3', '2', '1', '4', '3', '4']);
  const merged = enhancedPanelCopy({ ...def }); merged._battleEndCount = 2;
  assert.match(_rawSubstitutedDesc(merged), /エンチャント2枚を強化する。（あと2戦）/, '強化後の本文も同じ');
  assert.ok(!/X/.test(computeDesc({ ...def, _battleEndCount: 1 })), '表示の本文に X が残らない');
  console.log('グリマルキン1023：成功');
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
