// ═══════════════════════════════════════
// main.js — UIヘルパー・ゲームフロー
// 依存: state.js, battle.js
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById('scr-'+id).classList.add('active'); }
function updateHUD(){
  document.getElementById('h-floor').textContent=G.floor;
  document.getElementById('h-life').textContent=G.life;
  document.getElementById('h-gold').textContent=G.gold;
  document.getElementById('h-rlv').textContent=G.rewardLv;
  document.getElementById('h-turn').textContent=G.turn;
  document.getElementById('h-act').textContent=G.actionsLeft+'/'+G.actionsPerTurn;
}
function log(msg,cls=''){
  const b=document.getElementById('log-box');
  const p=document.createElement('p');
  if(cls) p.className=cls;
  p.textContent=msg;
  b.appendChild(p);
  b.scrollTop=b.scrollHeight;
}
function clearLog(){ document.getElementById('log-box').innerHTML=''; }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ═══════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════
function startGame(){ initState(); showScreen('battle'); startBattle(); }
function gameOver(){ document.getElementById('go-sub').textContent=`${G.floor}階で力尽きました`; showScreen('gameover'); }

// ── 起動時データ読み込み ─────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const msgEl = document.getElementById('load-msg');
  const ok = await loadGameData();
  if (msgEl) {
    msgEl.textContent = ok
      ? '✓ データを読み込みました'
      : '⚠ オフライン：内蔵データで起動します';
    msgEl.style.color = ok ? 'var(--teal2)' : 'var(--gold2)';
  }
  setTimeout(() => showScreen('title'), ok ? 300 : 1500);
});
