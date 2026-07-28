// ═══════════════════════════════════════
// move.js — 移動先選択・ノード遷移
// 依存: constants.js, state.js, events.js, pool.js, battle.js
// ═══════════════════════════════════════

function chooseMove(nt){
  if(typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G.worldMap){
    if(typeof goToWorldMap==='function') goToWorldMap();
    return;
  }
  G.floor++;
  if(G.floor>20){ showScreen('clear'); return; }
  if(nt==='battle'||nt==='boss'){
    showScreen('battle'); startBattle();
  }
}
