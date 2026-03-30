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
  document.getElementById('h-reward-grade').textContent='G'+(G.rewardGrade||1);
  document.getElementById('h-life').textContent=G.magicLevel;
  document.getElementById('h-gold').textContent=G.gold;
  document.getElementById('h-act').textContent=G.actionsLeft+'/'+G.actionsPerTurn;
  const _nf=document.getElementById('h-next-floor');
  if(_nf&&G.phase!=='reward') _nf.style.display='none';
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
function gameOver(){ G.rings.forEach(r=>{ if(r) r._count=0; }); document.getElementById('go-sub').textContent=`${G.floor}階で力尽きました`; showScreen('gameover'); }
function showVictoryOverlay(){ document.getElementById('victory-overlay').style.display='flex'; }
function hideVictoryOverlay(){ document.getElementById('victory-overlay').style.display='none'; goToReward(); }

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
