'use strict';

// 2026-10-20 利用者指定：キャラクター用説明文などで「」に括ったカード名は、キーワードを含んでも太字にしない。ブラウザは使わない。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
global.requestAnimationFrame = () => 0;
global.setInterval = () => 0;
let now = 0;
global.performance = { now: () => now += 1000 };
console.table = () => {};
for (const match of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, match[1]), 'utf8'), { filename: match[1] });
}
renderAll = renderField = renderControls = updateHUD = showScreen = () => {};
playSfx = playFileSfx = _warmBattleHitSfx = () => {};
playBattleOpeningSequence = async () => {};
_playBattleStartIntro = async () => 'normal';
const copy = value => JSON.parse(JSON.stringify(value));
let checked = 0;
async function check(name, fn) { await fn(); checked++; console.log('OK ' + name); }
(async () => {
  await loadGameData();
  const strongs = html => [...String(html).matchAll(/<strong class="preview-keyword">([^<]*)<\/strong>/g)].map(m => m[1]);
  await check('「」で括ったカード名の中のキーワードは太字にしない', () => {
    assert.deepEqual(strongs(_boldKeywordsInHtml('「宿業の刻印」の効果で-10/-10された。')), []);
    assert.deepEqual(strongs(_boldKeywordsInHtml('「大いなる守護」の効果でHP+10を得た。')), []);
  });
  await check('括った中身がキーワードそのもの・括っていないキーワードは従来どおり太字', () => {
    assert.deepEqual(strongs(_boldKeywordsInHtml('「毒牙」を得る。')), ['毒牙']);
    assert.deepEqual(strongs(_boldKeywordsInHtml('このキャラクターは結界と刻印を持つ。')), ['結界', '刻印']);
    assert.deepEqual(strongs(_boldKeywordsInHtml('「宿業の刻印」の効果で結界を失った。')), ['結界']);
  });
  console.log(`カード名の太字1020：${checked}項目 OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
