'use strict';

// 2026-10-20 利用者指定：コピーされたキャラクター（ツインデビル・複製の力）の枠は、コピー元のキャラと同じにする。ブラウザは使わない。
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
applyFrameRadiusKey = () => {}; applyCharacterArtVars = () => true;
async function check(name, fn) { await fn(); checked++; console.log('OK ' + name); }
function el(enemy) {
  const props = {}, classes = new Set(enemy ? ['enemy'] : []);
  return { classList: { contains: c => classes.has(c), add: c => classes.add(c), remove: c => classes.delete(c) },
    style: { setProperty: (k, v) => { props[k] = v; }, removeProperty: k => { delete props[k]; }, getPropertyValue: k => props[k] || '' },
    dataset: {}, setAttribute() {}, getAttribute: () => null, removeAttribute() {}, querySelector: () => null, props };
}
function copies(source, side = 'p1') {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = createBattleState({ sides: { [side]: { units: [source] }, [other]: { units: [{ id: 'foe', name: '敵', atk: 1, hp: 999, maxHp: 999 }] } } });
  const events = []; coreRunOpening(state, createSeededRng(3), e => events.push(e), () => null, () => {});
  const list = state.units[side].filter(Boolean);
  return { orig: list.find(u => !u._openingDuplicate), copies: list.filter(u => u._openingDuplicate) };
}
const twin = (extra = {}) => ({ id: 'twin', name: 'ツインデビル', no: 'C087', atk: 4, hp: 4, maxHp: 4, color: '紫', keywords: [], _panelSummoned: false,
  desc: '開戦：このキャラクターのコピーを召喚する。', ...extra });
(async () => {
  await loadGameData();
  await check('味方：コピーは魔導板から出撃したコピー元と同じ枠（色の召喚枠にしない）', () => {
    const { orig, copies: list } = copies(twin());
    assert.equal(list.length, 1);
    assert.deepEqual(list[0]._copyFrame, { hero: true, merged: false, enemyVisual: false, npc: false });
    const a = el(false), b = el(false); applyUnitVisual(a, orig); applyUnitVisual(b, list[0]);
    assert.equal(b.props['--unit-frame'], a.props['--unit-frame']);
  });
  await check('味方：強化済み（旧合体枠）のコピー元なら、コピーも同じ枠', () => {
    const { orig, copies: list } = copies(twin({ _tripleMerged: true, _merged: true, desc: '開戦：このキャラクターのコピーを2体召喚する。' }));
    assert.equal(list.length, 2);
    list.forEach(c => { const a = el(false), b = el(false); applyUnitVisual(a, orig); applyUnitVisual(b, c); assert.equal(b.props['--unit-frame'], a.props['--unit-frame']); });
  });
  await check('召喚体（色の召喚枠）のコピー元なら、コピーも同じ色の召喚枠', () => {
    const { orig, copies: list } = copies(twin({ _panelSummoned: true, color: '赤' }));
    const a = el(false), b = el(false); applyUnitVisual(a, orig); applyUnitVisual(b, list[0]);
    assert.equal(b.props['--unit-frame'], a.props['--unit-frame']);
    assert.equal(list[0]._copyFrame.hero, false);
  });
  await check('敵：コピーも敵の枠', () => {
    const { orig, copies: list } = copies(twin(), 'p2');
    const a = el(true), b = el(true); applyUnitVisual(a, orig); applyUnitVisual(b, list[0]);
    assert.equal(b.props['--unit-frame'], a.props['--unit-frame']);
  });
  console.log(`コピーの枠1020：${checked}項目 OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
