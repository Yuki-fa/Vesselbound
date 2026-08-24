'use strict';

// 本体の戦闘入口（allyAttackAction / enemyAttackAction）だけを使う、差し替え可能な簡易AI。
// 移動用の本体入口は現行 battle.js に存在しないため、攻撃不能時はパスとして扱う。
const SIM_MAX_TURNS = 30;

function _simLiving(list, enemy) {
  return (list || []).filter(u => u && u.hp > 0 && !u._isObject &&
    (enemy || (!u._isSoul && !u._isObject)) && !(_isSealed && _isSealed(u)));
}

function _simTargetFor(attacker, targets) {
  const live = _simLiving(targets, true);
  if (!live.length) return null;
  const atk = Math.max(0, Number(_attackDamageValue(attacker)) || 0);
  const killable = live.filter(t => atk >= Math.max(0, Number(t.hp) || 0));
  // 倒せる敵が複数なら、最もATKが高い敵を優先する。
  if (killable.length) return killable.sort((a, b) => (b.atk || 0) - (a.atk || 0))[0];
  // 倒せない場合は最もHPが低い敵を優先する。
  return live.slice().sort((a, b) => (a.hp || 0) - (b.hp || 0) || (b.atk || 0) - (a.atk || 0))[0];
}

function installBalanceAi() {
  if (globalThis._balanceAiInstalled) return;
  globalThis._balanceAiInstalled = true;
  const originalGetAttackTarget = getAttackTarget;
  getAttackTarget = function (attacker, targets) {
    if (G._simAiTarget && G.allies && G.allies.includes(attacker) && targets === G.enemies) {
      const target = G._simAiTarget;
      if (target && target.hp > 0 && G.enemies.includes(target)) return target;
    }
    return originalGetAttackTarget(attacker, targets);
  };

  // startPlayerPhase -> _advanceToBattlePhase -> battlePhase から呼ばれる差し替え点。
  battlePhase = async function balanceSimulationBattlePhase() {
    let turn = Math.max(1, Number(G.turn) || 1);
    while (G.phase !== 'reward' && !G._battleDefeatHandled && turn <= SIM_MAX_TURNS) {
      G.phase = 'player';
      G.actionsLeft = G.actionsPerTurn || 1;
      const allies = _simLiving(G.allies, false).slice();
      for (const ally of allies) {
        if (G.phase === 'reward' || G._battleDefeatHandled) break;
        G._simAiTarget = _simTargetFor(ally, G.enemies);
        // 攻撃入口を直接呼ぶ。ATK0・防戦などは何もせずパスする。
        await allyAttackAction(ally, G.allies.indexOf(ally));
        if (typeof _checkBattleOver === 'function' && _checkBattleOver()) break;
      }
      delete G._simAiTarget;
      if (G.phase === 'reward' || G._battleDefeatHandled) break;
      G.phase = 'enemy';
      const enemies = _simLiving(G.enemies, true).slice();
      for (const enemy of enemies) {
        if (G.phase === 'reward' || G._battleDefeatHandled) break;
        await enemyAttackAction(enemy, G.enemies.indexOf(enemy));
        if (typeof _checkBattleOver === 'function' && _checkBattleOver()) break;
      }
      if (G.phase === 'reward' || G._battleDefeatHandled) break;
      if (turn >= SIM_MAX_TURNS) break;
      turn++;
      G.turn = turn;
      G.phase = 'player';
      await new Promise(resolve => setImmediate(resolve));
    }
    delete G._simAiTarget;
    if (G.phase !== 'reward' && !G._battleDefeatHandled) {
      G._simTimeout = true;
      G.phase = 'timeout';
      G._battlePhaseRunning = false;
    }
  };
}

module.exports = {installBalanceAi, SIM_MAX_TURNS};
