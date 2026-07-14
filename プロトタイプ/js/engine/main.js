// ═══════════════════════════════════════
// main.js — UIヘルパー・ゲームフロー
// 依存: state.js, battle.js
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function showScreen(id){
  if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground(id);
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('scr-'+id).classList.add('active');
}
function updateGoldenDrop(){
  G.hasGoldenDrop=false;
}
function updateHUD(){
  if(G.phase!=='reward'){
    document.getElementById('h-floor').textContent=G.floor;
    const _nl=document.getElementById('h-next-label'); if(_nl) _nl.style.display='none';
  }
  document.getElementById('h-reward-grade').textContent='★'.repeat(G.rewardGrade||1);
  const magicEl=document.getElementById('h-magic');
  if(magicEl) magicEl.textContent=G.magicLevel;
  const lifeEl=document.getElementById('h-life');
  if(lifeEl){
    const life=Math.max(0,Math.min(3,G.life==null?3:G.life));
    lifeEl.textContent='♥'.repeat(life)+'♡'.repeat(3-life);
  }
  document.getElementById('h-gold').textContent=G.gold;
  document.getElementById('h-act').textContent=G.actionsLeft+'/'+G.actionsPerTurn;
  if(G._debugMode){
    _positionDebugKillButton();
    if(typeof renderDebugRewardRerollButton==='function') renderDebugRewardRerollButton();
  }
}
// 味方キャラ名は水色、敵キャラ名はピンクで表示する（ログ本文中の名前を包む用）
function _lc(name,isEnemy){
  return name?`<span class="${isEnemy?'log-nm-enemy':'log-nm-ally'}">${name}</span>`:'';
}
// ログ履歴に場面の区切り（空行）を1本入れる
function logSceneBreak(){
  const b=document.getElementById('log-box');
  if(!b) return;
  if(!b.lastElementChild||!b.lastElementChild.classList.contains('log-scene-break')){
    const p=document.createElement('p');
    p.className='log-scene-break';
    b.appendChild(p);
  }
}
let _lastLogPlainText=null;
function log(msg,cls=''){
  const b=document.getElementById('log-box');
  const plainMsg=String(msg||'').replace(/<[^>]*>/g,'');
  // 直前のログと異なる内容の場合は、その間に1行空ける（同じ内容の連続表示はそのまま詰める）
  const sceneChanged=!!(b&&b.lastElementChild&&plainMsg&&plainMsg!==_lastLogPlainText);
  if(sceneChanged) logSceneBreak();
  if(plainMsg) _lastLogPlainText=plainMsg;
  const p=document.createElement('p');
  if(cls) p.className=cls;
  if(/^──\s*(階層|ターン|T\d+)/.test(String(msg||''))) p.classList.add('log-heading');
  p.innerHTML=msg;
  b.appendChild(p);
  b.scrollTop=b.scrollHeight;
  requestAnimationFrame(()=>{ b.scrollTop=b.scrollHeight; });
  _spawnLogFx(msg,sceneChanged);
}
// 戦闘画面：敵前衛の少し上から敵後衛の半分あたりまで白文字でフェードしながら浮遊する演出
// 全ログを常に同一軌道・同一速度(px/ms)で動かし、後発のログが先行ログに追いつかないようにする
const _LOG_FX_SPEED=0.04; // px/ms
// 同一タイミングで複数のログが呼ばれても重ならないよう、実際の生成タイミングを最低間隔ぶんずつずらす
const _LOG_FX_MIN_GAP=700; // ms
// 直前と異なる内容のログの前には、この分だけ余分に間隔を空けて「空行」を表現する
const _LOG_FX_SCENE_GAP=500; // ms
let _logFxNextSpawnAt=0;
let _logFxFastMode=false;
// spawn待ち（setTimeoutでスケジュール済みだがまだ発生していない）浮遊ログのタイマーID。
// 戦闘終了・リトライ時にキャンセルしないと、次の戦闘画面で前回のログが遅れて流れてくる原因になる。
const _pendingLogFxTimers=new Set();
function _spawnLogFx(msg,sceneChanged){
  if(!msg) return;
  if(/を召喚/.test(msg)) return;
  const now=performance.now();
  let spawnAt=Math.max(now,_logFxNextSpawnAt);
  if(sceneChanged) spawnAt+=_LOG_FX_SCENE_GAP;
  _logFxNextSpawnAt=spawnAt+_LOG_FX_MIN_GAP;
  const delay=spawnAt-now;
  if(delay<=0){ _doSpawnLogFx(msg,_logFxFastMode); return; }
  const timerId=setTimeout(()=>{ _pendingLogFxTimers.delete(timerId); _doSpawnLogFx(msg,_logFxFastMode); },delay);
  _pendingLogFxTimers.add(timerId);
}
function _doSpawnLogFx(msg,fastMode=_logFxFastMode){
  if(document.body.classList.contains('reward-screen-active')) return;
  const scrBattle=document.getElementById('scr-battle');
  if(!scrBattle||!scrBattle.classList.contains('active')) return;
  const frontSlot=document.querySelector('#f-enemy .slot.is-front');
  if(!frontSlot) return;
  const fr=frontSlot.getBoundingClientRect();
  if(!fr.width) return;
  const rearSlot=document.querySelector('#f-enemy .slot.is-rear');
  const rr=rearSlot?rearSlot.getBoundingClientRect():null;
  const startY=fr.top-fr.height*0.15;
  let fadeStartY, fadeEndY;
  if(rr&&rr.width&&(fr.top-rr.top)>fr.height*0.5){
    // 通常ケース：後衛列が前衛より十分上にある
    fadeStartY=rr.top+rr.height*0.5;
    fadeEndY=rr.top;
  } else {
    // 後衛が存在しない・前衛と同じ高さ等で距離が取れない場合は、前衛スロットの高さを基準に距離を作る
    fadeStartY=startY-fr.height*1.5;
    fadeEndY=startY-fr.height*3;
  }
  const totalDist=startY-fadeEndY;
  if(!(totalDist>0)) return;
  const leftX=fr.left-fr.width*0.7;
  const gameScale=typeof _gameScale==='function'?_gameScale():1;
  const fontSize=Math.max(14,26*gameScale);
  const el=document.createElement('div');
  el.className='log-fx-line';
  el.innerHTML=msg;
  el.style.cssText=`position:fixed;left:${leftX}px;top:${startY}px;transform:translate(0,-50%);font-size:${fontSize}px;color:#fff;font-weight:700;white-space:nowrap;text-shadow:0 2px 6px rgba(0,0,0,.9),0 0 4px rgba(0,0,0,.9);pointer-events:none;z-index:9500;`;
  document.body.appendChild(el);
  const fadeStartOffset=Math.max(0,Math.min(1,(startY-fadeStartY)/totalDist));
  const duration=totalDist/_LOG_FX_SPEED;
  const anim=el.animate([
    {transform:'translate(0,-50%)',opacity:1,offset:0},
    {transform:`translate(0,-50%) translateY(${-(startY-fadeStartY)}px)`,opacity:1,offset:fadeStartOffset},
    {transform:`translate(0,-50%) translateY(${-totalDist}px)`,opacity:0,offset:1},
  ],{duration,easing:'linear'});
  anim.playbackRate=fastMode?8:1;
  el._logFxAnim=anim;
  _activeLogFxEls.add(el);
  const cleanup=()=>{ _activeLogFxEls.delete(el); el.remove(); };
  anim.onfinish=cleanup;
  anim.oncancel=cleanup;
  // 画面比率によっては演出の終点が実際のビューポート外まで届かないことがあるため、
  // ビューポート外に出た時点で（アニメーション終了を待たず）即座に消す
  _watchLogFxOffscreen(el);
}
// 画面外（ビューポート上端より上）に出た浮遊ログを毎フレーム監視し、出た瞬間に削除する
const _activeLogFxEls=new Set();
function _watchLogFxOffscreen(el){
  const check=()=>{
    if(!el.isConnected){ _activeLogFxEls.delete(el); return; }
    const rect=el.getBoundingClientRect();
    if(rect.bottom<0||rect.top>window.innerHeight){
      _activeLogFxEls.delete(el);
      el.remove();
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
// You Win表示など、画面遷移の少し前のタイミングで呼び、まだアニメーション中の浮遊ログを高速再生して素早く消す
function _fastForwardLogFx(){
  _logFxFastMode=true;
  _logFxNextSpawnAt=Math.max(_logFxNextSpawnAt,performance.now());
  _activeLogFxEls.forEach(el=>{
    const anim=el._logFxAnim;
    if(anim) anim.playbackRate=8;
  });
}
// 報酬フェイズへの実際の画面遷移時に呼び、残っている浮遊ログを問答無用で即座に消し切る（最終保証）
function _clearAllLogFx(){
  _logFxFastMode=false;
  _logFxNextSpawnAt=0;
  _activeLogFxEls.forEach(el=>el.remove());
  _activeLogFxEls.clear();
  // まだ発生していない（setTimeoutで予約済みの）浮遊ログも合わせてキャンセルする。
  // これを怠ると、次の戦闘・リトライ後の画面に前回のログが遅れて流れ込んでしまう。
  _pendingLogFxTimers.forEach(id=>clearTimeout(id));
  _pendingLogFxTimers.clear();
}
function clearLog(){
  if(typeof _clearAllLogFx==='function') _clearAllLogFx();
  _logFxFastMode=false;
  _logFxNextSpawnAt=0;
  const b=document.getElementById('log-box');
  b.innerHTML='';
  b.scrollTop=0;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ═══════════════════════════════════════
// GAME FLOW
// ═══════════════════════════════════════
// ボタンを所持金表示（#rw-gold）の直下・右端揃えに配置する共通処理。
// #reward-info-bar が position:absolute の基準要素になるため、
// getBoundingClientRect（画面座標）ではなく offsetLeft/offsetWidth（バー内のローカル座標）を使う。
// こうするとゲーム全体のスケール変換（--game-scale）の影響を受けない。
function _positionBelowGold(btn){
  const gold=document.getElementById('rw-gold');
  if(!btn||!gold||btn.style.display==='none') return;
  if(gold.offsetWidth===0&&gold.offsetHeight===0) return; // 非表示中は位置更新しない
  btn.style.left=(gold.offsetLeft+gold.offsetWidth-btn.offsetWidth)+'px';
  btn.style.top=(gold.offsetTop+gold.offsetHeight+20)+'px';
}
// 全敵撃破ボタン（戦闘中のみ表示）
function _positionDebugKillButton(){
  _positionBelowGold(document.getElementById('btn-debug-kill'));
}
// リロールボタン（デバッグモード・報酬フェイズ中のみ表示。全敵撃破と同じ枠を共有）
function _positionDebugRerollButton(){
  _positionBelowGold(document.getElementById('rw-appearance-mode'));
}
window.addEventListener('resize',()=>{
  if(typeof G==='undefined'||!G._debugMode) return;
  _positionDebugKillButton();
  _positionDebugRerollButton();
});

function startGame(debugMode){
  initState();
  window.__vesselboundRetryRewards=null;
  clearLog();
  G._debugMode=!!debugMode;
  if(G._debugMode){
    G.gold=999;
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='';
    log('[DEBUG] デバッグモード：ソウル999','sys');
    requestAnimationFrame(_positionDebugKillButton);
  } else {
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='none';
  }
  showScreen('battle');
  goToReward();
}

function debugKillAll(){
  if(!G._debugMode||G.phase!=='player') return;
  const alive=G.enemies.filter(e=>e&&e.hp>0);
  if(!alive.length) return;
  alive.forEach((e,_)=>{ e.hp=0; processEnemyDeath(e,G.enemies.indexOf(e)); });
  log('[DEBUG] 全敵を撃破','sys');
  if(G.enemies.filter(e=>e&&e.hp>0).length===0) _onAllEnemiesDefeated();
}

function _debugRefillActions(){
  if(!G._debugMode) return;
  G.actionsLeft=G.actionsPerTurn;
  updateHUD();
}
function gameOver(){
  const victory=document.getElementById('victory-overlay');
  if(victory) victory.style.display='none';
  ['rw-cards','reward-cards-section'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(id==='rw-cards') el.replaceChildren();
    else el.style.display='none';
  });
  document.getElementById('go-sub').textContent=`${G.floor}階で力尽きました`;
  showScreen('gameover');
}
// onShown：オーバーレイが実際に表示された後、指定ms後に呼ばれるコールバック（省略可）。
// 呼び出し側で独立したsetTimeoutを組むと、renderAll()等の重い同期処理でメインスレッドが
// 詰まった際に「表示」と「非表示」のタイマーがほぼ同時に発火し、一瞬で消えてしまう競合が起きるため、
// 表示が確定してから逆算する形でチェーンする。
function showVictoryOverlay(onShown,shownDuration){
  if(G._battleDefeatHandled) return;
  // 注：onBattleEnd()が_panelSummonedユニット（＝現行仕様の全味方）をG.alliesから除去済みのため、
  // ここでの味方生存チェックは常にtrueとなり誤って早期returnしてしまう。勝利可否は呼び出し元で判定済み。
  // 「You Win」表示と同時に浮遊ログのフェードを加速し、画面遷移までに確実に消しきる
  if(typeof _fastForwardLogFx==='function') _fastForwardLogFx();
  setTimeout(()=>{
    if(G._battleDefeatHandled||G.phase!=='reward') return;
    const ov=document.getElementById('victory-overlay');
    const title=ov?ov.querySelector('.victory-title'):null;
    const isDraw=!!G._battleDraw;
    if(title) title.textContent=isDraw?'Draw':'You Win';
    if(!isDraw&&typeof playSfx==='function') playSfx('victory',{group:'ui'});
    if(ov) ov.style.display='flex';
    if(typeof onShown==='function') setTimeout(onShown,shownDuration||680);
  },120);
}
function hideVictoryOverlay(){ document.getElementById('victory-overlay').style.display='none'; goToReward(); }

// ── 起動時データ読み込み ─────────────────────────────
window.addEventListener('resize', ()=>{ if(typeof _updateLaneOffset==='function') _updateLaneOffset(); });
window.addEventListener('DOMContentLoaded', async () => {
  if(typeof setScreenAssetBackground==='function') setScreenAssetBackground('title','title');
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
