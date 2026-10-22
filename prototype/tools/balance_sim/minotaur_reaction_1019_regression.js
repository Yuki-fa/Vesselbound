'use strict';
// 2026-10-22 利用者指定：割り込み攻撃でも攻撃効果を発動する。
// 懺悔の再発動による負傷の再入は止め、攻撃と反撃を検証する。
const assert = require('node:assert/strict');
const core = require(process.env.VB_CORE_BASELINE || '../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
const PENANCE = '攻撃：このキャラクターは1ダメージを2回受ける。';
let failed = 0;
function check(name, fn) {
  try { fn(); console.log('OK ' + name); } catch (error) { failed++; console.error('NG ' + name + '\n' + error.message); }
}
function run(side, penances, extraText = [], foeSpec = null, minoKeywords = []) {
  const foe = side === 'p1' ? 'p2' : 'p1';
  const texts = [...Array(penances).fill(PENANCE), ...extraText];
  const mino = { id: 'mino', name: 'ミノタウロス', no: 'C009', atk: 4, hp: 40, maxHp: 40, color: '赤', keywords: minoKeywords,
    desc: require('./sheet_data').effectText('C009'),
    _adjacentPanelEffectTexts: texts, effectData: { effectTexts: texts } };
  const state = core.createBattleState({ sides: { [side]: { units: [mino] },
    [foe]: { units: foeSpec || [{ id: 'foe', name: 'foe', atk: 1, hp: 500, maxHp: 500, keywords: [] }] } } });
  state._coreFirstSide = side;
  const events = [];
  core.createBattleRunner(state, createSeededRng(1019), e => events.push(e), { skipOpening: true }).step();
  return { events, mino: state.units[side].find(u => u.id === 'mino'), foe: state.units[foe][0] };
}
for (const side of ['p1', 'p2']) {
  check(`${side}：懺悔2枚は1ダメージごとに結界＋攻撃を4回、割り込み攻撃でも懺悔を再発動する`, () => {
    const { events, mino, foe } = run(side, 2);
    const reactions = events.filter(e => e.type === 'attack' && e.immediate && e.attackerId === 'mino');
    assert.equal(reactions.length, 4);
    const selfHits = events.filter(e => e.type === 'damage' && e.unitId === 'mino' && (e.amount ?? e.damage) > 0);
    assert.equal(selfHits.length, 25, '本来と割り込み4回の懺悔20回＋各攻撃の反撃5回');
    assert.equal(mino.hp, 15);
    assert.equal(foe.hp, 500 - 4 * 5);
    assert.equal(events.filter(e=>e.type==='keyword_effect'&&e.effect==='shield').length,0,'新本文は結界を与えない');
  });
  check(`${side}：他の攻撃効果（このキャラクターは+1/+1を得る）も割り込み攻撃で発動する`, () => {
    const { events } = run(side, 1, ['攻撃：このキャラクターは+1/+1を得る。']);
    assert.equal(events.filter(e => e.type === 'attack' && e.immediate).length, 2);
    assert.equal(events.filter(e => e.type === 'stat_change' && e.unitId === 'mino' && e.atk > 0).length, 3, '本来1回＋割り込み2回');
  });
}
for (const side of ['p1', 'p2']) {
  const weak = () => [0, 1, 2, 3, 4].map(i => ({ id: 'f' + i, name: 'f' + i, atk: 1, hp: 4, maxHp: 4, keywords: [] }));
  check(`${side}：割り込み攻撃で相手を倒しても先制が無ければ反撃を受け、結界が消えて懺悔4回ぶん攻撃する`, () => {
    const { events } = run(side, 2, [], weak());
    assert.equal(events.filter(e => e.type === 'attack' && e.immediate).length, 4);
    assert.equal(events.filter(e => e.type === 'damage' && e.unitId === 'mino' && e.effect && e.blockedBy).length, 0, '懺悔の1ダメージを結界が防がない');
    assert.ok(events.filter(e => e.type === 'damage' && e.unitId === 'mino' && e.counter).length >= 4, '倒した相手からも反撃');
  });
  check(`${side}：先制で相手を倒した時だけ割り込み攻撃でも反撃を受けない（通常の攻撃と同じ）`, () => {
    const { events } = run(side, 2, [], weak(), ['先制']);
    const first = events.findIndex(e => e.type === 'attack' && e.immediate);
    const next = events.slice(first + 1);
    const end = next.findIndex(e => e.type === 'attack' || (e.type === 'damage' && e.unitId === 'mino' && e.effect));
    assert.equal(next.slice(0, end < 0 ? undefined : end).some(e => e.type === 'damage' && e.unitId === 'mino' && e.counter), false);
  });
}
if (failed) { process.exitCode = 1; console.error(`ミノタウロス1019：${failed}件NG`); }
else console.log('ミノタウロス1019：OK');
