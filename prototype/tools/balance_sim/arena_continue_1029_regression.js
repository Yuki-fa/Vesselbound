'use strict';
// 2026-10-29 利用者指定：「闘技場では敵が全滅した後に処理を中断せず、最後まで行ってから次のwaveに移行する」。
// コアは決着後に効果を打ち切る（coreBattleEffectsStopped）。闘技場は盤面を次の戦闘へ持ち越すので、
// continueAfterDecided を付けた戦闘だけは打ち切らず、手番だけを終える。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); } };
const watcher = '常時：敵が死亡するたび、このキャラクターは+1/+1を得る。';
function run(continueAfterDecided) {
  const state = core.createBattleState({ sides: {
    p1: { units: [
      { id: 'a', name: '全体攻撃', atk: 5, hp: 50, maxHp: 50, keywords: [], desc: '攻撃：全ての敵に1ダメージを与える。', effectText: '攻撃：全ての敵に1ダメージを与える。' },
      { id: 'b', name: '観測', atk: 5, hp: 50, maxHp: 50, keywords: [], desc: watcher, effectText: watcher }] },
    p2: { units: [0, 1].map(i => ({ id: 'f' + i, name: 'F' + i, atk: 1, hp: 1, maxHp: 1, keywords: [] })) } } });
  const events = [];
  const result = core.runBattleCore(state, createSeededRng(5), { onEvent: e => events.push(e), continueAfterDecided });
  const gains = events.filter(e => e.type === 'stat_change' && e.unitId === 'b').length;
  return { result, state, gains };
}
check('通常の戦闘：最後の敵の死亡で効果を打ち切る（従来どおり）', () => {
  const x = run(false);
  assert.equal(x.result.outcome, 'p1');
  assert.equal(x.gains, 1);
});
check('闘技場：最後の敵の死亡に反応する効果も処理してから終える', () => {
  const x = run(true);
  assert.equal(x.result.outcome, 'p1');
  assert.equal(x.gains, 2, '2体の死亡を両方観測する');
  assert.equal(x.state.units.p1[1].atk, 7);
});
check('PvE と保存の両方の入口で闘技場だけに指定する', () => {
  const battle = fs.readFileSync(path.join(__dirname, '../../js/engine/battle.js'), 'utf8');
  assert.match(battle, /const continueAfterDecided=!!\(typeof arenaIsActive==='function'&&arenaIsActive\(\)\);/);
  assert.match(battle, /createBattleRunner\(state,coreMathRng,emit,\{skipOpening:true,continueAfterDecided\}\)/);
  const save = fs.readFileSync(path.join(__dirname, '../../js/save/run_save.js'), 'utf8');
  assert.match(save, /continueAfterDecided:arenaBattle,/);
  assert.match(save, /continueAfterDecided:!!opts\.continueAfterDecided/);
});
if (failed) { process.exitCode = 1; console.error(`闘技場の決着後1029：${failed}件NG`); } else console.log('闘技場の決着後1029：OK');
