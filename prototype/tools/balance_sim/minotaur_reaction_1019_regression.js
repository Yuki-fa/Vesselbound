'use strict';
// 2026-10-19 利用者指定：ミノタウロスの効果による攻撃では「攻撃：」の効果を発動しない。
// 懺悔2枚なら「懺悔の1ダメージ→結界1→攻撃（反撃は結界が受ける）」を4回繰り返してから本来の攻撃をする。
const assert = require('node:assert/strict');
const core = require(process.env.VB_CORE_BASELINE || '../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
const PENANCE = '攻撃：このキャラクターは1ダメージを2回受ける。';
let failed = 0;
function check(name, fn) {
  try { fn(); console.log('OK ' + name); } catch (error) { failed++; console.error('NG ' + name + '\n' + error.message); }
}
function run(side, penances, extraText = []) {
  const foe = side === 'p1' ? 'p2' : 'p1';
  const texts = [...Array(penances).fill(PENANCE), ...extraText];
  const mino = { id: 'mino', name: 'ミノタウロス', no: 'C009', atk: 4, hp: 40, maxHp: 40, color: '赤', keywords: [],
    desc: '負傷：効果ダメージを受けた場合、結界1を得てからランダムな敵に攻撃する。',
    _adjacentPanelEffectTexts: texts, effectData: { effectTexts: texts } };
  const state = core.createBattleState({ sides: { [side]: { units: [mino] },
    [foe]: { units: [{ id: 'foe', name: 'foe', atk: 1, hp: 500, maxHp: 500, keywords: [] }] } } });
  state._coreFirstSide = side;
  const events = [];
  core.createBattleRunner(state, createSeededRng(1019), e => events.push(e), { skipOpening: true }).step();
  return { events, mino: state.units[side].find(u => u.id === 'mino'), foe: state.units[foe][0] };
}
for (const side of ['p1', 'p2']) {
  check(`${side}：懺悔2枚は1ダメージごとに結界＋攻撃を4回、割り込み攻撃では懺悔を再発動しない`, () => {
    const { events, mino, foe } = run(side, 2);
    const reactions = events.filter(e => e.type === 'attack' && e.immediate && e.attackerId === 'mino');
    assert.equal(reactions.length, 4);
    const selfHits = events.filter(e => e.type === 'damage' && e.unitId === 'mino' && (e.amount ?? e.damage) > 0);
    assert.equal(selfHits.length, 5, '懺悔4回＋本来の攻撃の反撃1回（割り込み攻撃の反撃は結界が受ける）');
    assert.equal(mino.hp, 35);
    assert.equal(foe.hp, 500 - 4 * 5);
    // 各割り込み攻撃の直前は「1ダメージ→結界」で、間に懺悔の追加ダメージが入らない。
    for (const reaction of reactions) {
      const i = events.indexOf(reaction), before = events.slice(0, i).filter(e => e.type !== 'effect_flash');
      assert.equal(before.at(-1).type, 'keyword_effect');
      assert.equal(before.at(-2).type, 'damage');
      assert.equal(before.at(-2).amount ?? before.at(-2).damage, 1);
    }
  });
  check(`${side}：他の攻撃効果（このキャラクターは+1/+1を得る）も割り込み攻撃では発動しない`, () => {
    const { events } = run(side, 1, ['攻撃：このキャラクターは+1/+1を得る。']);
    assert.equal(events.filter(e => e.type === 'attack' && e.immediate).length, 2);
    assert.equal(events.filter(e => e.type === 'stat_change' && e.unitId === 'mino' && e.atk > 0).length, 1, '本来の攻撃の1回だけ');
  });
}
if (failed) { process.exitCode = 1; console.error(`ミノタウロス1019：${failed}件NG`); }
else console.log('ミノタウロス1019：OK');
