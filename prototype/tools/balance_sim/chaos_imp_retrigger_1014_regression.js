'use strict';
// 2026-10-14：カオス・インプ（C119「常時：味方が解放された時、ランダムな味方の開戦効果を発動する。」）は、
// 通常の開戦を済ませた体にも開戦効果をもう一度発動させる。以前は発動番号（release:...）を0に戻していたため
// 通常の開戦（0）と重なって止まっていた（VFX21 制作中に Codex が発見）。ブラウザは使わない。
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
(async () => {
  await loadGameData();
  const imp = PANEL_POOL.find(c => c.no === 'C119');
  assert.match(imp.desc, /味方が解放された時、ランダムな味方の開戦効果を発動する/);
  const opener = { id: 'O', name: '開戦役', atk: 3, hp: 50, maxHp: 50, lane: 'front', keywords: [], desc: '開戦：全ての味方は+1/+1を得る。' };
  const impUnit = { id: 'I', name: imp.name, no: 'C119', atk: 2, hp: 50, maxHp: 50, lane: 'front', keywords: [], desc: imp.desc };
  const released = { id: 'R', name: '解放役', atk: 2, hp: 50, maxHp: 50, lane: 'rear', keywords: [], desc: '' };
  const state = createBattleState({ sides: { p1: { units: [opener, impUnit, released] }, p2: { units: [{ id: 'E', name: '敵', atk: 1, hp: 100, maxHp: 100, lane: 'front', keywords: [], desc: '' }] } } });
  const rng = createSeededRng(3), events = [], emit = e => events.push(e);
  const hit = (s, t, a, c, skip, tough, o) => coreResolveHit(state, s, t, a, c, rng, emit, { skipSourceEffects: skip, skipTough: tough, ...o });
  const [o] = state.units.p1;
  coreApplyOpeningEffects(o, state, rng, emit, hit, 0);
  const firstRun = events.filter(e => e.type === 'stat_change' && e.sourceId === 'O').length;
  check('通常の開戦で1回発動する', () => assert.ok(firstRun > 0));
  check('同じ番号（0）の再入は止める（二重発動防止は維持）', () => {
    const before = events.length; coreApplyOpeningEffects(o, state, rng, emit, hit, 0);
    assert.equal(events.filter((e, i) => i >= before && e.type === 'stat_change' && e.sourceId === 'O').length, 0);
  });
  check('味方が解放されると、開戦を済ませた体の開戦効果をもう一度発動する（カオス・インプ）', () => {
    // ランダムな味方が開戦役になるまで解放を繰り返す（対象はインプ以外の生きている味方）。
    let fired = 0;
    for (let n = 0; n < 12 && !fired; n++) {
      const before = events.length;
      coreApplyReleaseEffects(state.units.p1[2], 0, state, rng, emit, hit);
      fired = events.filter((e, i) => i >= before && e.type === 'stat_change' && e.sourceId === 'O').length;
    }
    assert.ok(fired > 0, '解放で開戦役の開戦効果が再発火する');
  });
  console.log(`カオス・インプの再発火: ${checked}件OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
