'use strict';
// 2026-10-20 利用者指摘：闘技場で嵐の指輪が戦闘（wave）ごとに、マナ20以上だと複数回発動した。
// マナ効果や他の未処理効果は wave を跨がない。開戦時マナ20で1回目の嵐の指輪で敵が全滅したら、
// 残りの嵐の指輪は次の wave の開始時に処理しない。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); } };
const foe = (id, hp = 30) => ({ id, name: id, atk: 1, hp, maxHp: hp, keywords: [] });
function stormState(mana, foes) {
  const state = core.createBattleState({ sides: { p1: { units: [{ id: 'a', name: '味方', atk: 1, hp: 50, maxHp: 50, keywords: [] }] },
    p2: { units: foes } }, rings: { p1: [{ name: '嵐の指輪' }], p2: [] } });
  state.resources.p1.mana = mana;
  const events = [], emit = e => events.push(e), rng = createSeededRng(7);
  const hit = (s, t, n, c, ss, st, o) => core.coreResolveHit(state, s, t, n, c, rng, emit, { skipSourceEffects: !!ss, skipTough: !!st, ...(o || {}) });
  return { state, events, run: () => core.coreApplyRingManaEffects(state, rng, emit, hit) };
}
check('嵐の指輪：1回目で敵が全滅したら、残りの到達分は発動済みにして捨てる', () => {
  const x = stormState(20, [foe('f0', 50)]);   // 20マナ×5＝100ダメージで1回目に全滅
  x.run();
  assert.equal(x.events.filter(e => e.type === 'ring_effect').length, 1, JSON.stringify(x.events.map(e => e.type)));
  assert.equal(x.state._stormRingFireCount, 2);
});
check('嵐の指輪：敵が生きていれば到達回数ぶん発動する（従来どおり）', () => {
  const x = stormState(20, [foe('f0', 1000)]);
  x.run();
  assert.equal(x.events.filter(e => e.type === 'ring_effect').length, 2);
});
check('継戦の開始：持ち越したマナで到達済みの嵐の指輪は発動しない。次の10マナ到達で1回', () => {
  const x = stormState(20, [foe('f0', 1000)]);
  core.coreConsumeCarriedManaEffects(x.state);
  x.run();
  assert.equal(x.events.filter(e => e.type === 'ring_effect').length, 0);
  x.state.resources.p1.mana = 30; x.run();
  assert.equal(x.events.filter(e => e.type === 'ring_effect').length, 1);
});
check('継戦の開始：味方のマナ効果も到達済みの分は発動済みにし、効果もイベントも出さない', () => {
  const unit = { id: 'w', name: '活性化持ち', atk: 1, hp: 50, maxHp: 50, keywords: [], manaCost: 1, manaRepeat: true,
    manaThresholdDesc: 'このキャラクターは+1/+1を得る。' };
  const state = core.createBattleState({ sides: { p1: { units: [unit] }, p2: { units: [foe('f0', 1000)] } } });
  state.resources.p1.mana = 20;
  const live = state.units.p1[0], events = [], emit = e => events.push(e), rng = createSeededRng(3);
  const hit = (s, t, n, c, ss, st, o) => core.coreResolveHit(state, s, t, n, c, rng, emit, { skipSourceEffects: !!ss, skipTough: !!st, ...(o || {}) });
  core.coreConsumeCarriedManaEffects(state);
  assert.equal(live.atk, 1, '効果は起こさない'); assert.equal(events.length, 0);
  core.coreApplyManaThresholdEffects(state, rng, emit, hit);
  assert.equal(events.filter(e => e.type === 'mana_threshold').length, 0, '到達済みの20回は再発動しない');
  state.resources.p1.mana = 21;
  core.coreApplyManaThresholdEffects(state, rng, emit, hit);
  assert.equal(events.filter(e => e.type === 'mana_threshold').length, 1, '次の1マナで1回');
  assert.equal(live.atk, 2);
});
check('PvE：継戦の開始時に到達済みを消費し、嵐の指輪の回数を戦闘の状態へ渡して書き戻す', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../js/engine/battle.js'), 'utf8');
  assert.match(src, /if\(carryBattle&&typeof coreConsumeCarriedManaEffects==='function'\)/);
  assert.match(src, /_stormRingFireCount:Math\.max\(0,Number\(G\._stormRingFireCount\)\|\|0\)/);
  assert.match(src, /if\(state\._stormRingFireCount!=null\) G\._stormRingFireCount=/);
});
if (failed) { process.exitCode = 1; console.error(`闘技場の継戦とマナ1020：${failed}件NG`); } else console.log('闘技場の継戦とマナ1020：OK');
