'use strict';
// 2026-10-29 利用者報告：「ラスボス戦で全滅すると、発動済の不死の指輪が発動し、更に勝利扱いになった」。
// 原因：味方が一斉に全滅した手番の終わりに不死の指輪がスケルトンを召喚すると、
//   1) 手番の打ち切り（stop）が残ったまま、2) 召喚の途中で立った決着の印（_coreBattleStopped）も残った。
//   進行役は結果の無いまま終戦し「手番上限の引き分け」＝PvEでは勝利扱い（ラスボスならエンディング）になっていた。
const assert = require('node:assert/strict');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); } };
const ring = { name: '不死の指輪', desc: '常時：前衛の味方が全滅した時、一度だけ「青スケルトン」を3体召喚する。' };
function battle(skeletonHp) {
  const state = core.createBattleState({ sides: {
    p1: { units: [0, 1, 2, 3, 4].map(i => ({ id: 'a' + i, name: 'A' + i, atk: 1, hp: 2, maxHp: 2, lane: i < 3 ? 'front' : 'rear', keywords: [] })) },
    p2: { units: [{ id: 'lumia', name: 'ルミア', atk: 30, hp: 500, maxHp: 500, keywords: [], desc: '常時：味方が攻撃するたび、全ての敵に8ダメージを与える。' }] } },
    rings: { p1: [ring], p2: [] }, summonDefs: [{ name: '青スケルトン', color: '青', atk: 1, hp: skeletonHp, category: 'キャラクター' }] });
  state._coreFirstSide = 'p2';
  const events = [];
  const runner = core.createBattleRunner(state, createSeededRng(1), e => events.push(e));
  while (!runner.result && state.turn < 50) { if (runner.step()) break; }
  return { result: runner.finish(), events, state };
}
check('一斉に全滅→不死の指輪→スケルトンも倒れる：敗北（引き分けにしない）', () => {
  const x = battle(1);
  assert.deepEqual([x.result.outcome, x.result.endReason], ['p2', 'wiped']);
  assert.equal(x.events.filter(e => e.type === 'ring_effect').length, 1, '指輪は一度だけ');
});
check('スケルトンが生き残っている間は戦闘を続ける（召喚の直後で打ち切らない）', () => {
  const x = battle(1000);
  assert.ok(x.state.turn > 3, '手番 ' + x.state.turn);
  assert.ok(x.events.some(e => e.type === 'attack' && e.side === 'p1'), 'スケルトンが攻撃する');
});
if (failed) { process.exitCode = 1; console.error(`不死の指輪と全滅1029：${failed}件NG`); } else console.log('不死の指輪と全滅1029：OK');
