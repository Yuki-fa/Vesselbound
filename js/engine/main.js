// ═══════════════════════════════════════
// main.js — UIヘルパー・ゲームフロー
// 依存: state.js, battle.js
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active')); document.getElementById('scr-'+id).classList.add('active'); }
function updateGoldenDrop(){
  G.hasGoldenDrop=!!(G.rings&&G.rings.some(r=>r&&r.unique==='great_mother'));
}
function updateHUD(){
  if(G.phase!=='reward'){
    document.getElementById('h-floor').textContent=G.floor;
    const _nl=document.getElementById('h-next-label'); if(_nl) _nl.style.display='none';
  }
  document.getElementById('h-reward-grade').textContent='★'.repeat(G.rewardGrade||1);
  document.getElementById('h-life').textContent=G.magicLevel;
  document.getElementById('h-gold').textContent=G.gold;
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
// リスNPC
// ═══════════════════════════════════════
function squirrelSay(trigger){
  const msgs=SQUIRREL_MESSAGES[trigger];
  if(!msgs||!msgs.length) return;
  const el=document.getElementById('squirrel-npc');
  const bubble=document.getElementById('squirrel-bubble');
  if(!el||!bubble) return;
  bubble.textContent=randFrom(msgs);
  el.classList.add('visible');
}
function squirrelHide(){
  const el=document.getElementById('squirrel-npc');
  if(el) el.classList.remove('visible');
}

// ═══════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════
function startGame(debugMode){
  initState();
  G._debugMode=!!debugMode;
  if(G._debugMode){
    G.gold=999;
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='';
    log('[DEBUG] デバッグモード：ソウル999','sys');
  }
  showScreen('battle'); startBattle();
}

function debugKillAll(){
  if(!G._debugMode||G.phase!=='player') return;
  const alive=G.enemies.filter(e=>e&&e.hp>0);
  if(!alive.length) return;
  alive.forEach((e,_)=>{ e.hp=0; processEnemyDeath(e,G.enemies.indexOf(e)); });
  log('[DEBUG] 全敵を撃破','sys');
  if(G.enemies.filter(e=>e&&e.hp>0).length===0) _onAllEnemiesDefeated();
}
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
