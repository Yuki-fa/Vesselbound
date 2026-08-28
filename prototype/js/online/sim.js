// ═══════════════════════════════════════
// online/sim.js — 対戦シミュレータ（層1）
//
// このファイルは戦闘ルールを持たない。ルールは js/battle/core.js（共通戦闘コア）に一本化し、
// ここは「seedと初期状態を渡してコアを回し、イベント列・勝敗・最終状態にまとめる」だけの薄い層。
// PvE（battle.js）との違いは以下の3点だけに留めること。
//   - 初期状態を誰が用意するか  … PvP はサーバー（server_local.js）が両陣営を用意する
//   - seed を誰が決めるか        … PvP はサーバーが決める
//   - イベント列をどこで再生するか … PvP は playback.js が再生する
//
// 制約（サーバーへそのまま移すため）
//   - DOM を触らない / G を触らない / Math.random を使わない / 同期のみ
// ═══════════════════════════════════════

/**
 * 対戦を最後まで計算する。
 * @param {{seed:number, sides:{p1:{units:Array}, p2:{units:Array}}, turnLimit?:number}} setup
 * @returns {{version:number, seed:number, events:Array, outcome:'p1'|'p2'|'draw',
 *            endReason:string, turns:number, finalState:{p1:{units:Array},p2:{units:Array}}}}
 */
function simulateOnlineBattle(setup) {
  const seed = Number(setup && setup.seed) || 1;
  const rng = createSeededRng(seed);
  const state = createBattleState({ sides: (setup && setup.sides) || {} });

  const events = [];
  const result = runBattleCore(state, rng, {
    onEvent: ev => events.push(ev),
    turnLimit: setup && setup.turnLimit,
  });

  return {
    version: ONLINE_PROTOCOL_VERSION,
    seed,
    events,
    // ← 勝敗はここが唯一の正。イベント列から推測しないこと。
    outcome: result.outcome,
    endReason: result.endReason,
    turns: result.turns,
    finalState: battleCoreFinalState(state),
  };
}

if (typeof window !== 'undefined') {
  window.simulateOnlineBattle = simulateOnlineBattle;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { simulateOnlineBattle };
}
