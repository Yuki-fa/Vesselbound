'use strict';
// 2026-10-12 利用者指摘：手番の途中で死亡して復活した体は、残りの攻撃（二段・三段攻撃・疾風の指輪等）を行わない。
// スケルトンキング（攻撃：「青スケルトン」を召喚し、このキャラクターの前に攻撃させる）が1撃目の反撃で死亡→復活した後に、
// 2撃目のスケルトンを召喚していた。根性（死亡ではない）で耐えた場合は残りの攻撃を続ける。ブラウザは使わない。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
global.requestAnimationFrame = () => 0;
global.setInterval = () => 0;
console.table = () => {};
for (const match of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, match[1]), 'utf8'), { filename: match[1] });
}
let checked = 0;
const check = (name, fn) => { fn(); checked++; console.log('OK ' + name); };
function oneTurn(keywords, extraKeyword, enemyAtk) {
  const king = PANEL_POOL.find(c => c.no === 'C026');
  const u = { id: 'A0', name: king.name, no: 'C026', desc: king.desc, keywords: [...keywords, extraKeyword], atk: 4, hp: 10, maxHp: 10,
    _baseAtk: 4, _baseMaxHp: 10, lane: 'front', color: '青' };
  const state = createBattleState({ sides: { p1: { units: [u] }, p2: { units: [{ id: 'E0', name: 'オーク', atk: enemyAtk, hp: 300, maxHp: 300, lane: 'front', keywords: [], desc: '' }] } } });
  state._coreFirstSide = 'p1';
  const events = [];
  createBattleRunner(state, createSeededRng(7), e => events.push(e), { skipOpening: true }).step();
  return events;
}
(async () => {
  await loadGameData();
  for (const extra of ['二段攻撃', '三段攻撃']) {
    check(`${extra}：1撃目の反撃で死亡→復活したら、残りの攻撃（スケルトンの召喚を含む）はしない`, () => {
      const ev = oneTurn(['復活'], extra, 50);
      assert.equal(ev.filter(e => e.type === 'revive' && e.unitId === 'A0').length, 1, '復活する');
      const reviveAt = ev.findIndex(e => e.type === 'revive' && e.unitId === 'A0');
      assert.deepEqual(ev.slice(reviveAt + 1).filter(e => ['summon', 'attack', 'effect_flash'].includes(e.type)), [], '復活の後に攻撃しない');
      assert.equal(ev.filter(e => e.type === 'summon').length, 1, 'スケルトンは1体だけ');
    });
  }
  check('根性で耐えた（死亡していない）場合は、残りの攻撃を続ける', () => {
    const ev = oneTurn(['根性'], '二段攻撃', 50);
    const guts = ev.findIndex(e => e.type === 'revive' && e.reason === '根性');
    assert.ok(guts >= 0, '根性で耐える');
    assert.ok(ev.slice(guts + 1).some(e => e.type === 'summon'), '2撃目のスケルトンを召喚する');
  });
  check('死なない場合は、二段攻撃で2体召喚して2回攻撃する（従来どおり）', () => {
    const ev = oneTurn(['復活'], '二段攻撃', 1);
    assert.equal(ev.filter(e => e.type === 'summon').length, 2);
    assert.equal(ev.filter(e => e.type === 'attack' && e.attackerId === 'A0').length, 2);
  });
  console.log(`手番途中の死亡と復活: ${checked}件OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
