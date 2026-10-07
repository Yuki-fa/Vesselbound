'use strict';

// 開戦まで本体を通し、以後は本番と同じコアで計算する数値用の受け口。
// 数値・勝敗・対象選択を検査側では実装しない。30手での打ち切りだけは検査条件。
const SIM_MAX_TURNS = 30;

function installBalanceCoreHarness() {
  if (globalThis._balanceCoreHarnessInstalled) return;
  globalThis._balanceCoreHarnessInstalled = true;
  // 旧 _applyDamageState の計測をコアの適用点へ移す。開戦も含め、実際に失ったHPを読む。
  // HPの増加・回復・復活をイベントから推測せず、コアの実体を前後で比較する。
  const applyDamage = coreApplyDamage;
  coreApplyDamage = function balanceSimulationDamage(target, amount, emit, opts) {
    if (!G._simMetrics) return applyDamage(target, amount, emit, opts);
    const before = target.hp;
    const fromAllies = (G.allies || []).some(u => u && u.id === (opts && opts.sourceId));
    const fromEnemies = (G.enemies || []).some(u => u && u.id === (opts && opts.sourceId));
    const result = applyDamage(target, amount, emit, opts);
    const actual = Math.max(0, before - target.hp);
    if (target.side === 'p2' && fromAllies) G._simMetrics.dealt += actual;
    if (target.side === 'p1' && fromEnemies) G._simMetrics.taken += actual;
    return result;
  };
  battlePhase = async function balanceSimulationBattlePhase() {
    const state = _createPveCoreState(); _stampCoreSideSlots(state);
    const emit = ev => {
      G._battleCoreEvents.push(ev);
    };
    const result = runBattleCore(state, coreMathRng, { skipOpening: true, turnLimit: SIM_MAX_TURNS, onEvent: emit });
    _syncCoreResourcesToG(state); _syncCoreBloodToG(state);
    G.turn = result.turns; G._simOutcome = result;
    G._simTimeout = result.outcome === 'draw';
    G._battleDefeatHandled = result.outcome === 'p2';
    G.phase = result.outcome === 'p1' ? 'reward' : G._simTimeout ? 'timeout' : 'defeat';
    G._battlePhaseRunning = false;
  };
}

module.exports = {installBalanceCoreHarness, SIM_MAX_TURNS};
