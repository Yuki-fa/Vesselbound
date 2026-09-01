// ═══════════════════════════════════════
// main.js — UIヘルパー・ゲームフロー
// 依存: state.js, battle.js
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function showScreen(id){
  if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground(id);
  if(id==='title') _startTitleBgVideo();
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('scr-'+id).classList.add('active');
  // 街（村）専用画面のCSSスコープ。編成画面のボタン等の複製ルールがこのクラスに依存する。
  document.body.classList.toggle('village-screen-active',id==='village');
  document.body.classList.toggle('library-screen-active',id==='village'&&!!(G&&G._isLibraryMenu));
  if(id!=='reward'){
    document.body.classList.remove('debug-mode');
    ['btn-debug-gameover','btn-test-battle'].forEach(debugId=>{
      const debugEl=document.getElementById(debugId);
      if(debugEl) debugEl.style.display='none';
    });
  }
  const battleCutin=document.getElementById('battle-start-intro');
  const hideDebugCutin=!!(battleCutin||document.body.classList.contains('battle-victory-pending'));
  ['btn-debug-gameover','btn-test-battle'].forEach(debugId=>{
    const debugEl=document.getElementById(debugId);
    if(debugEl&&hideDebugCutin) debugEl.style.display='none';
  });
  // 出発時の一時非表示は、次に村を開いた時点で必ず解除する。
  if(id==='village') document.body.classList.remove('village-departing');
  // startGame() は導入演出用のクラス（startup-title-visible 等）をタイトルから外す。
  // #scr-title.startup-title はそのクラスが無いと opacity:0 なので、
  // ゲームオーバーから「タイトルに戻る」と画面が真っ暗になっていた。
  // 導入は既に見終えているので、メニューを出した状態へ戻す。
  if(id==='title'){
    const titleEl=document.getElementById('scr-title');
    if(titleEl&&titleEl.classList.contains('startup-title')
      &&!titleEl.classList.contains('startup-title-visible')){
      titleEl.classList.add('startup-title-visible','startup-menu-visible');
    }
    // 戦闘・村で付いた一時クラスを持ち越すと、タイトルの上に暗転が残る。
    document.body.classList.remove('battle-victory-pending','village-departing',
      'gameover-active','game-clear-active','gameover-ui-pending');
  }
  const battleCounters=document.getElementById('battle-counters');
  const battleStatus=document.getElementById('battle-status-hud');
  const transitionFade=document.getElementById('battle-transition-fade');
  if(id!=='battle'){
    if(battleCounters) battleCounters.style.display='none';
    if(battleStatus) battleStatus.style.display='none';
    if(transitionFade) transitionFade.classList.remove('is-visible');
    const endFade=document.getElementById('battle-end-fade');
    if(endFade){ endFade.classList.remove('is-visible','is-final'); endFade.removeAttribute('style'); }
  }
  if(id==='battle'&&typeof _clearLogDom==='function') _clearLogDom();
  // 街のBGMが鳴っている間（街画面／街の施設）はBGMを切り替えない。
  if(typeof playBgm==='function'&&!(typeof G!=='undefined'&&G&&G._villageBgmActive)){
    // 街（村）専用画面と、商談（報酬/編成）フェイズ中の戦闘画面はメニュー曲を使う。
    const isMenuLike=typeof G!=='undefined'&&G&&(G.phase==='map'||G.phase==='reward');
    const isBossBattle=typeof G!=='undefined'&&G&&G._waveBattleType==='boss';
    // ラスボス戦だけは専用BGM（battle4.wav、1:17から）を使う。
    const isFinalBoss=typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow();
    // 音量は曲ごとにBGM_DEFAULT_VOLUMES（audio.js）で決める。ここで.32を渡すと
    // 戦闘BGMだけが他より小さくなるため、指定せず既定値に任せる。
    if(id==='title') _startTitleBgm();
    else if(id==='battle') playBgm(isMenuLike?'menu':(isFinalBoss?'battle4':(isBossBattle?'battle3':'battle1')),{fadeInMs:700});
    // 街は入場演出中はboom.wav後に演出側が鳴らすため何もしない。
    else if(id==='village'){
      if(!(typeof G!=='undefined'&&G&&G._villageIntroPlaying)){
        if(typeof playVillageBgm==='function') playVillageBgm(600);
        else playBgm('menu',{fadeInMs:700});
      }
    }
    else stopBgm(350);
  }
}
function updateGoldenDrop(){
  G.hasGoldenDrop=false;
}
function updateHUD(){
  const _lifeMax=typeof waveLifeMax==='function'?waveLifeMax():3;
  const displayLife=Math.max(0,Math.min(_lifeMax,
    G._waveLife!=null ? Number(G._waveLife) : (G.life==null?3:Number(G.life))
  ));
  if(G.phase!=='reward'){
    document.getElementById('h-floor').textContent=G.floor;
    const _nl=document.getElementById('h-next-label'); if(_nl) _nl.style.display='none';
  }
  document.getElementById('h-reward-grade').textContent='★'.repeat(G.rewardGrade||1);
  const magicEl=document.getElementById('h-magic');
  if(magicEl) magicEl.textContent=G.magicLevel;
  const lifeEl=document.getElementById('h-life');
  if(lifeEl){
    const life=displayLife;
    lifeEl.innerHTML=`<span class="life-empty">${'♡'.repeat(Math.max(0,_lifeMax-life))}</span><span class="life-full">${Array.from({length:life},()=>'<span class="life-heart">♥</span>').join('')}</span>`;
  }
  // 所持金はカウントアップ演出中の表示値を使い、3桁区切りで表示する。
  const _goldShown=typeof goldDisplayValue==='function'?goldDisplayValue():(Number(G.gold)||0);
  document.getElementById('h-gold').textContent=Number(_goldShown).toLocaleString('ja-JP');
  document.getElementById('h-act').textContent=G.actionsLeft+'/'+G.actionsPerTurn;
  const battleGold=document.getElementById('battle-gold-value');
  if(battleGold) battleGold.textContent=Number(_goldShown).toLocaleString('ja-JP');
  const battleLife=document.getElementById('battle-life-value');
  if(battleLife){
    const life=displayLife;
    // 枠数（通常3／オンライン対戦5）を常に保持し、減少分だけ輪郭（♡）にする。
    // 枠自体を減らすと残数に応じて文字位置が詰まり、編成画面と異なる位置に見えるため。
    battleLife.innerHTML=Array.from({length:_lifeMax},(_,i)=>{
      const filled=i>=_lifeMax-life;
      return `<span class="battle-life-heart ${filled?'battle-life-heart-filled':'battle-life-heart-empty'}">${filled?'♥':'♡'}</span>`;
    }).join('');
  }
  // 所持金・ターン枠（編成画面と同じ#reward-production-ui .reward-prod-bottom）は
  // マップ・戦闘画面でも常時表示するため、reward.js側の描画を待たずここでも更新する。
  if(typeof _syncMoneyTurnTile==='function') _syncMoneyTurnTile();
  if(typeof renderBattleCounters==='function') renderBattleCounters();
  if(G._debugMode){
    // 画面切り替え直後はCSS適用前でoffsetが確定していないため、次フレームで位置を測る。
    // ここで即時計測すると、編成画面へ入った直後にデバッグボタンが一度上へ跳ねる。
    requestAnimationFrame(()=>{
      if(typeof G==='undefined'||!G||!G._debugMode) return;
      _positionDebugKillButton();
      _positionDebugMuteButton();
      _positionDebugFormationButton();
      _positionDebugMapButton();
    });
    if(typeof renderDebugRewardRerollButton==='function') renderDebugRewardRerollButton();
  }
}
// 味方キャラ名は水色、敵キャラ名はピンクで表示する（ログ本文中の名前を包む用）
function _lc(name,isEnemy){
  return name?`<span class="${isEnemy?'log-nm-enemy':'log-nm-ally'}">${name}</span>`:'';
}
// ログ履歴に場面の区切り（空行）を1本入れる
let _lastLogPlainText=null;
// 戦闘ログ機能は廃止済み。呼び出し箇所が多数残っているため、
// 受け口だけを残して何もしない（削除するとそれら全てが例外になる）。
function log(){ }
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
function _doSpawnLogFx(msg,fastMode=_logFxFastMode){
  return;
  // 戦闘中のログ表示（浮遊テキスト演出）は行わない
  if(G.phase==='player'||G.phase==='enemy') return;
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
function _clearLogDom(){
  if(typeof _clearAllLogFx==='function') _clearAllLogFx();
  const b=document.getElementById('log-box');
  if(!b) return;
  b.innerHTML='';
  b.scrollTop=0;
}
function clearLog(){
  _clearLogDom();
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
// ミュートボタン（デバッグモード中は常時表示・オプションボタンの直下に追従）
function _positionDebugMuteButton(){
  const btn=document.getElementById('battle-mute-btn');
  const opt=document.getElementById('battle-options-btn');
  if(!btn||!opt||btn.style.display==='none') return;
  if(opt.offsetWidth===0&&opt.offsetHeight===0) return;
  btn.style.left=opt.offsetLeft+'px';
  btn.style.top=(opt.offsetTop+opt.offsetHeight+20)+'px';
  btn.style.width=opt.offsetWidth+'px';
  btn.style.height=opt.offsetHeight+'px';
}
// 編成画面ボタン（デバッグモード中のみ表示・ミュートボタンの直下に追従）
function _positionDebugFormationButton(){
  const btn=document.getElementById('battle-formation-btn');
  const mute=document.getElementById('battle-mute-btn');
  if(!btn||!mute||btn.style.display==='none') return;
  if(mute.offsetWidth===0&&mute.offsetHeight===0) return;
  btn.style.left=mute.offsetLeft+'px';
  btn.style.top=(mute.offsetTop+mute.offsetHeight+20)+'px';
  btn.style.width=mute.offsetWidth+'px';
  btn.style.height=mute.offsetHeight+'px';
  btn.style.fontSize=Math.round(mute.offsetHeight*0.34)+'px';
}
function _positionDebugMapButton(){
  const btn=document.getElementById('battle-debug-map-btn');
  const form=document.getElementById('battle-formation-btn');
  if(!btn||!form||btn.style.display==='none') return;
  if(form.offsetWidth===0&&form.offsetHeight===0) return;
  btn.style.left=form.offsetLeft+'px';
  btn.style.top=(form.offsetTop+form.offsetHeight+20)+'px';
  btn.style.width=form.offsetWidth+'px';
  btn.style.height=form.offsetHeight+'px';
  btn.style.fontSize=Math.round(form.offsetHeight*0.34)+'px';
}
function _setDebugMapButtonVisible(visible){
  ['battle-debug-map-btn','map-debug-map-btn'].forEach(id=>{
    const btn=document.getElementById(id);
    if(btn) btn.style.display=visible?'':'none';
  });
  if(visible) requestAnimationFrame(_positionDebugMapButton);
}
function debugToggleMapLoop(){
  if(typeof G==='undefined'||!G||!G._debugMode) return;
  if(G._debugMapLoopActive){
    G._debugMapLoopActive=false;
    document.body.classList.remove('world-map-active');
    const mapScreen=document.getElementById('scr-map');
    if(mapScreen) mapScreen.classList.remove('active');
    showScreen(G._debugMapLoopReturnScreen||'battle');
    _setDebugMapButtonVisible(true);
    return;
  }
  G._debugMapLoopActive=true;
  G._debugMapLoopReturnScreen=document.querySelector('.screen.active')?.id.replace(/^scr-/,'')||'battle';
  if(typeof _ensureWorldMap==='function') _ensureWorldMap();
  const wave=Math.max(1,Number(G._wave)||1);
  const stage=Math.max(1,Number(G._waveStage)||1);
  const line=typeof worldMapActiveLine==='function'?worldMapActiveLine(wave,stage):1;
  renderWorldMapScreen(line||1,wave,stage);
  document.body.classList.add('world-map-active');
  showScreen('map');
  _setDebugMapButtonVisible(true);
}
// デバッグ用：どの画面からでも編成画面を開く。
function debugOpenFormation(){
  if(typeof G==='undefined'||!G||!G._debugMode) return;
  if(G._villageIntroPlaying||G._pendingPanelPlacement) return;
  // 結果・クリア画面から開く場合は、先にゲームオーバー演出を閉じてから編成へ移る。
  if(document.body.classList.contains('gameover-active')){
    if(typeof returnFromDebugGameOver==='function'){ returnFromDebugGameOver(); return; }
    if(typeof closeGameOverOverlay==='function') closeGameOverOverlay();
  }
  // 戦闘中の非同期攻撃ループを、編成画面へ切り替えた後まで走らせない。
  // フラグだけでは次のstartBattle()で解除された瞬間に前の戦闘が再開してしまうため、
  // abortBattleForDebug()が世代番号を進めて古いループを完全に無効化する。
  if(['battle','player','enemy','commander'].includes(G.phase)){
    if(typeof abortBattleForDebug==='function') abortBattleForDebug();
    else { G._debugFormationAbort=true; document.body.classList.remove('battle-turn-active'); }
    // 戦闘中だけ存在する召喚ユニットを編成画面へ持ち越さない。
    // 残すと次回の開戦時に同じパネルカードが重複召喚される。
    G.allies=(G.allies||[]).map(u=>u&&u._panelSummoned?null:u);
    G.enemies=(G.enemies||[]).map(u=>u&&u._panelSummoned?null:u);
    // 戦闘中の敵は編成画面・次の移動先へ持ち越さない（前の戦闘の続きが起きる原因）。
    G.enemies=new Array((typeof MAX_ENEMIES!=='undefined'&&MAX_ENEMIES)||14).fill(null);
    if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
  }
  document.body.classList.remove('village-screen-active','world-map-active');
  if(typeof _openWaveFormation==='function') _openWaveFormation();
}
// リロールボタン（デバッグモード・報酬フェイズ中のみ表示。全敵撃破と同じ枠を共有）
function _positionDebugRerollButton(){
  _positionBelowGold(document.getElementById('rw-appearance-mode'));
}
window.addEventListener('resize',()=>{
  if(typeof G==='undefined'||!G._debugMode) return;
  _positionDebugKillButton();
  _positionDebugRerollButton();
  _positionDebugMuteButton();
  _positionDebugFormationButton();
  _positionDebugMapButton();
});

function _starterCardCandidates(category){
  const cats=Array.isArray(category)?category:[category];
  return (typeof PANEL_POOL!=='undefined'?PANEL_POOL:[]).filter(p=>{
    if(!p||!p.id||p.initial!==true||p.removed) return false;
    if(typeof _isImplementedPoolCard==='function'&&!_isImplementedPoolCard(p)) return false;
    if(p._sheetSeen===false||p._implemented===false) return false;
    if(String(p.category||'')==='キャラクター'){
      if((Number(p.power??p.atk??0)||0)<=0) return false;
      if((p.keywords||[]).some(k=>/^封印\d+$/.test(String(k||'')))||/封印\s*\d+/.test(String(p.desc||''))) return false;
    }
    return cats.includes(String(p.category||''));
  });
}
function _takeStarterPanel(category){
  const pool=_starterCardCandidates(category).filter(p=>typeof panelSaleStockCount!=='function'||panelSaleStockCount(p)>0);
  const def=pool.length?randFrom(pool):randFrom(_starterCardCandidates(category));
  if(!def||typeof makePanel!=='function') return null;
  if(typeof consumePanelSaleStock==='function') consumePanelSaleStock(def);
  return makePanel(def.id);
}
function _pickStarterPanelDef(category){
  const pool=_starterCardCandidates(category).filter(p=>typeof panelSaleStockCount!=='function'||panelSaleStockCount(p)>0);
  return pool.length?randFrom(pool):randFrom(_starterCardCandidates(category));
}
function _makeStarterPanelFromDef(def,consume){
  if(!def||typeof makePanel!=='function') return null;
  if(consume&&typeof consumePanelSaleStock==='function') consumePanelSaleStock(def);
  return makePanel(def.id);
}
function _giveInitialRandomBoardCards(){
  if(!Array.isArray(G.mainBoard)) return;
  const cols=typeof MAIN_BOARD_COLS!=='undefined'?MAIN_BOARD_COLS:5;
  const deploySlots=(typeof MAIN_BOARD_FRONT_SLOTS!=='undefined'?MAIN_BOARD_FRONT_SLOTS:[1,3])
    .filter(i=>i>=0&&i<G.mainBoard.length);
  const deploySlotSet=new Set(deploySlots);
  // 初期キャラクターは前衛の出撃パネル（MAIN_BOARD_FRONT_SLOTS）のいずれかに配置する。
  // 従来は固定でスロット7（非出撃スロット）に置いていたため、開始時から出撃不可の見た目になっていた。
  const charSlot=deploySlots.length?randFrom(deploySlots):7;
  const opposite={up:'down',right:'left',down:'up',left:'right'};
  const dirs=['up','right','down','left'];
  const step=(idx,dir)=>{
    const x=idx%cols, y=Math.floor(idx/cols);
    if(dir==='up') return y>0?idx-cols:null;
    if(dir==='down') return y<Math.floor((G.mainBoard.length-1)/cols)?idx+cols:null;
    if(dir==='left') return x>0?idx-1:null;
    if(dir==='right') return x<cols-1?idx+1:null;
    return null;
  };
  const starterPaths=[];
  dirs.forEach(charDir=>{
    const midSlot=step(charSlot,charDir);
    if(midSlot==null||deploySlotSet.has(midSlot)) return;
    dirs.forEach(midDir=>{
      if(midDir===opposite[charDir]) return;
      const endSlot=step(midSlot,midDir);
      if(endSlot==null||endSlot===charSlot||deploySlotSet.has(endSlot)) return;
      starterPaths.push({charDir,midDir,midSlot,endSlot});
    });
  });
  let picked=null;
  for(let attempt=0;attempt<240&&!picked;attempt++){
    const charDef=_pickStarterPanelDef('キャラクター');
    const midDef=_pickStarterPanelDef(['エンチャント','強化']);
    const charCard=_makeStarterPanelFromDef(charDef,false);
    const midCard=_makeStarterPanelFromDef(midDef,false);
    if(!charCard||!midCard) continue;
    const paths=starterPaths.filter(p=>
      (charCard.directions||[]).includes(p.charDir)&&
      (midCard.directions||[]).includes(opposite[p.charDir])
    );
    if(!paths.length) continue;
    picked={path:randFrom(paths),defs:[charDef,midDef],cards:[charCard,midCard]};
  }
  if(picked){
    picked.defs.forEach(def=>{ if(def&&typeof consumePanelSaleStock==='function') consumePanelSaleStock(def); });
    const [charCard,midCard]=picked.cards;
    G.mainBoard[charSlot]=charCard;
    G.mainBoard[picked.path.midSlot]=midCard;
  } else {
    const charCard=_takeStarterPanel('キャラクター');
    if(charCard) G.mainBoard[charSlot]=charCard;
    // フォールバックでも強化カードは1枚だけ、必ずキャラクターに接続する。
    if(charCard){
      let placed=false;
      for(const charDir of dirs){
        const midSlot=step(charSlot,charDir);
        if(midSlot==null||deploySlotSet.has(midSlot)||G.mainBoard[midSlot]) continue;
        for(let attempt=0;attempt<60&&!placed;attempt++){
          const def=_pickStarterPanelDef(['エンチャント','強化']);
          const card=_makeStarterPanelFromDef(def,false);
          if(!card) continue;
          if((charCard.directions||[]).includes(charDir)&&(card.directions||[]).includes(opposite[charDir])){
            if(typeof consumePanelSaleStock==='function') consumePanelSaleStock(def);
            G.mainBoard[midSlot]=card;
            placed=true;
          }
        }
        if(placed) break;
      }
      if(!placed){
        const charDir=dirs.find(d=>{
          const slot=step(charSlot,d);
          return slot!=null&&!deploySlotSet.has(slot)&&!G.mainBoard[slot]&&(charCard.directions||[]).includes(d);
        });
        if(charDir){
          const slot=step(charSlot,charDir);
          const card=_takeStarterPanel(['エンチャント','強化']);
          if(card){
            card.directions=Array.from(new Set([opposite[charDir],...(card.directions||[])]));
            G.mainBoard[slot]=card;
          }
        }
      }
    }
  }
  if(!G.mainBoard[charSlot]){
    const fallbackSlot=deploySlots.find(i=>i>=0&&i<G.mainBoard.length&&!G.mainBoard[i]);
    const fallbackChar=_takeStarterPanel('キャラクター');
    if(fallbackChar&&fallbackSlot!=null) G.mainBoard[fallbackSlot]=fallbackChar;
  }
  if(typeof _getPartyBoardUnit==='function'&&typeof _syncUnitPanelEffectsAfterMove==='function'){
    _syncUnitPanelEffectsAfterMove(_getPartyBoardUnit());
  }
}

function _giveDebugGolem(){
  if(!G._debugMode||!Array.isArray(G.mainBoard)||typeof makePanel!=='function') return;
  const golem=makePanel('ゴーレム')||makePanel('panel_golem');
  if(!golem) return;
  golem.power=9999; golem.life=9999;
  golem.atk=9999; golem.hp=9999; golem.maxHp=9999;
  golem._permBasePower=9999; golem._permBaseLife=9999;
  const deploySlots=(typeof MAIN_BOARD_FRONT_SLOTS!=='undefined'?MAIN_BOARD_FRONT_SLOTS:[1,3]);
  const slot=deploySlots.find(i=>i>=0&&i<G.mainBoard.length&&!G.mainBoard[i]);
  if(slot!=null) G.mainBoard[slot]=golem;
}

// Sceneごとの進行構成。表示側もこの定義を参照して進捗を生成する。
const SCENE_FLOW_DATA={
  standard:['battle','battle','elite','city','battle','battle','battle','battle','boss','altar'],
  // Scene 5は「村→通常戦→通常戦→ボス（万象の揺り籠“エピトメ”）」。
  // エピトメ撃破後に続くラスボス（刻を織る者“ウルズ・ラグナ”＝stage5）は
  // ルートに載せず、プレイヤーからは見えないようにする。
  final:['city','battle','battle','boss'],
};

// Scene 1～4：通常戦×2→エリート→村→通常戦×4→ボス→祭壇。
// Scene 5：村→通常戦×2→ボス（＋伏せられたラスボス）。
// そのステージ（wave）のマス構成。旅の進捗の表示と同じ配列を使う。
function _waveRouteForWave(wave){
  const scene=Math.max(1,Math.min(5,Number(wave)||1));
  return (typeof _journeyRouteForScene==='function'?_journeyRouteForScene(scene):null)||[];
}
function _waveRouteNode(stage,wave){
  const route=_waveRouteForWave(wave??(G&&G._wave));
  return route[Math.max(0,(Number(stage)||1)-1)]||'battle';
}
// ステージ1は先頭が村でエリート・街が1つ後ろにずれるため、stage番号の決め打ちではなく
// ルート（_journeyRouteForScene）から種別を引く。
function _waveBattleType(stage){
  // Scene 5のstage5はルートに載せていない伏せられたラスボス戦。
  if(Number(G&&G._wave)===5&&Number(stage)===5) return 'boss';
  const node=_waveRouteNode(stage);
  if(node==='elite') return 'elite';
  if(node==='boss'||node==='finalBoss') return 'boss';
  return 'battle';
}
// 深層レベル＝そのwave内で何回目の通常戦闘か（1〜6）。エリート/ボスは固定値。
function _waveDeepLevel(stage){
  // ステージ1はルートが1つ後ろにずれる（1=村/2,3=通常/4=エリート/5=街/6,7,8=通常/9=ボス）。
  // 街の後の戦闘は3戦だが、ボス直前が最高難度になるよう深層レベルは4,5,6を割り当てる。
  if(Number(G&&G._wave)===1){
    const t1={2:1,3:2,4:2,6:4,7:5,8:6,9:6};
    return t1[stage]||1;
  }
  const table={1:1,2:2,3:2,5:3,6:4,7:5,8:6,9:6};
  return table[stage]||1;
}
function _waveStageFloor(wave,stage){
  const maxDeep=typeof _mapDeepLevelsPerMap==='function'?_mapDeepLevelsPerMap():6;
  const deep=_waveDeepLevel(stage);
  return Math.max(1,(Math.max(1,Number(wave)||1)-1)*maxDeep+deep);
}
// 編成・報酬画面の背景動画（back1.webm）を再開する。
// 街・施設・ワールドマップの間は#scr-battleごとdisplay:noneになるため、ブラウザが
// 「表示されていないミュート動画」として自動的に一時停止する（＝村や店から戻ると
// 静止画のまま止まって見える）。報酬画面へ入るたびに明示的に再生し直す。
function _resumeRewardBgVideo(){
  const video=document.getElementById('reward-bg-video');
  if(!video||!document.body) return;
  if(!document.body.classList.contains('reward-screen-active')) return;
  if(document.body.classList.contains('gameover-active')) return; // ゲームオーバー中は意図的に止めている
  try{
    video.muted=true;
    video.loop=true;
    if(!video.paused) return;
    const playResult=video.play();
    if(playResult&&typeof playResult.catch==='function') void playResult.catch(()=>{});
  }catch(_e){}
}
function _openWaveFormation(){
  showScreen('battle');
  G.phase=null;
  G._showGlobalPanels=true;
  G._waveVillage=false;
  G._isShop=false; G._isForge=false; G._isTavern=false; G._isVillageMenu=false; G._isWaveAltar=false; G._isItemShop=false; G._facilityLabel='';
  // 祭壇（指輪交換）の状態も必ず解除する。残っていると次の報酬画面が
  // 「栄光の力」（指輪提示）表示のままになる。
  G._isRingExchange=false;
  G._ringOfferPhase=false;
  G._villageBgmActive=false;
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground(null);
  if(typeof goToReward==='function') goToReward();
  // ゲームオーバー中に停止した編成背景動画は、reward-screen-active適用後に明示的に再開する。
  requestAnimationFrame(()=>{
    const rewardBgVideo=document.getElementById('reward-bg-video');
    if(!rewardBgVideo||!document.body.classList.contains('reward-screen-active')) return;
    try{
      rewardBgVideo.muted=true;
      rewardBgVideo.loop=true;
      const playResult=rewardBgVideo.play();
      if(playResult&&typeof playResult.catch==='function') void playResult.catch(()=>{});
    }catch(_e){}
  });
  _rewCards=[];
  _rewFreePickDone=true;
  G._waveRewardCount=null;
  G._waveWithdraw=false;
  const cards=document.getElementById('reward-cards-section');
  if(cards) cards.style.display='none';
  if(typeof renderRewCards==='function') renderRewCards();
  if(cards) cards.style.display='none';
  if(typeof renderMoveSlotsInEnemy==='function') renderMoveSlotsInEnemy();
}
function _grantWaveEliteItem(){
  if(typeof drawItems!=='function'||typeof _ensureItemSlots!=='function') return;
  const item=drawItems(1)[0];
  if(!item) return;
  const slots=_ensureItemSlots();
  const idx=slots.findIndex(c=>!c);
  if(idx<0) return;
  slots[idx]=item;
  log(`${item.name||'アイテム'}を獲得した。`,'gold');
}
// stage5：村（ショップ・クエスト受託）
function _openWaveVillage(stage,eliteWon){
  // ここでshowScreen('battle')を呼ぶとG.phaseがまだ戦闘中の値のためbattle1.wavが再生されてしまう。
  // 画面切り替えはopenMapVillage()（入場演出）側に任せる。
  G._waveStage=stage;
  G._waveVillage=true;
  G._waveEliteWon=!!eliteWon;
  G._isWaveAltar=false;
  G.phase=null;
  if(typeof openMapVillage==='function') openMapVillage({intro:true});
}
// stage10：祭壇（鍛冶・指輪交換）
function _openWaveAltar(stage){
  // 塔も村と全く同じ形式（#scr-village＋入場演出）。showScreen('battle')は呼ばない
  // （呼ぶとG.phaseがまだ戦闘中の値のためbattle1/battle3が一瞬鳴ってしまう）。
  G._waveStage=stage;
  G._waveVillage=true;
  G._isWaveAltar=true;
  G.phase=null;
  if(typeof openMapVillage==='function') openMapVillage({intro:true,tower:true});
}
function _startWaveBattle(stage){
  // 試験戦闘の終了操作と通常の戦闘開始が近接しても、試験用の敵・終了処理を
  // 次の通常戦闘へ持ち越さない。通常開始側を最終的なフラグ境界にする。
  G._testBattleMode=false;
  G._testBattleAbort=false;
  G._testBattleSavedFloor=null;
  G._libraryTestBattleMode=false;
  document.body.classList.remove('test-battle-active');
  const type=_waveBattleType(stage);
  const wave=Math.max(1,Number(G._wave)||1);
  // showScreen('battle') が描画される前に背景位置を確定する。
  // 通常戦闘では、開幕演出側のクラス付与を待つと一瞬だけ既定位置（上寄り）が見える。
  const battleHost=document.getElementById('scr-battle');
  if(battleHost){
    battleHost.classList.remove('battle-bg-normal','battle-bg-reveal','battle-bg-scroll-ready','battle-bg-scrolling');
    battleHost.classList.add(type==='elite'||type==='boss'?'battle-bg-reveal':'battle-bg-normal');
  }
  // 敗北時、どの画面（村/祭壇/通常の報酬画面）の開始時点までやり直すかを記録しておく。
  // 村／祭壇を出た直後の戦闘で敗北した場合は、施設へ戻さず報酬付き編成画面へ送る。
  // それ以外の敗北は従来どおり、直前の画面種別へ戻す。
  G._waveDefeatReturnTo='reward';
  G._waveVillage=false;
  G._isWaveAltar=false;
  // 戦闘開始時は村・祭壇・施設メニューを必ず閉じる。Scene 2以降の
  // 村/祭壇からの遷移でも、前画面のフラグが次の報酬UIへ残らないようにする。
  G._isShop=false;
  G._isForge=false;
  G._isTavern=false;
  G._isItemShop=false;
  G._isVillageMenu=false;
  G._isRingExchange=false;
  // 指輪提示フェイズも解除する。残っていると戦闘後の報酬画面が指輪提示のままになる。
  G._ringOfferPhase=false;
  G._facilityLabel='';
  // 施設を出たので、施設在庫の保存先キー（openMap*()で記録）も破棄する。
  G._facilityCacheKey=null;
  // 街を出て戦闘へ入るのでBGMは通常制御へ戻す。
  G._villageBgmActive=false;
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground(null);
  G._waveStage=stage;
  G._waveBattleType=type;
  G._waveBattleWon=null;
  G._waveRewardCount=null;
  G._waveWithdraw=false;
  // 強敵補正：通常戦=1、エリート=1.5、ボス（地域・ラスボス共通）=2
  G._extraBattleMult=type==='elite'?1.5:(type==='boss'?2:1);
  // _extraBattleMultは敵生成直後に1.0へリセットされるため、戦闘中に参照する用の控えを残す。
  G._battleBossMult=G._extraBattleMult;
  G._mapBattle={mapIndex:wave,nodeId:null,type,floor:_waveStageFloor(wave,stage),forcedBoss:false,normalBattleNo:stage===1?1:stage===2?2:0,turn:0};
  G.floor=G._mapBattle.floor;
  G.phase='battle';
  document.body.classList.remove('world-map-active');
  showScreen('battle');
  // ステージ持続環境音（ステージ4の雷はstage1＝最初の戦闘から）。
  // showScreen()内のplayBgm()＝stopBgm()より後に呼ぶ。
  if(typeof _syncStageAmbience==='function') _syncStageAmbience();
  startBattle();
}
function _startWaveFlowNext(){
  // オンライン対戦：次のマスへ進むかどうかはサーバーが決める。
  // ここでは準備完了を通知するだけで、画面の切り替えは flow.js がサーバー状態を見て行う。
  // （双方が準備完了、または制限時間の締め切りでサーバーが step を進める）
  if(G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch&&OnlineMatch.isActive()){
    const formation=typeof buildOnlineSelfFormation==='function'?buildOnlineSelfFormation():null;
    // 押した時点で報酬カードを消す（次の編成画面で引き直す）。
    if(typeof _rewCards!=='undefined'){ _rewCards=[]; }
    if(typeof renderRewCards==='function') renderRewCards();
    // 「戦闘待機中」にするのは対戦の直前だけ。編成1/3・2/3は次の編成画面へ進むだけなので、
    // 待機表示も操作ロックもしない（サーバー側も相手を待たずに進める）。
    const _st=OnlineMatch.getState();
    const _isLastFormation=!!(_st&&_st.nodeType==='formation'
      &&(Number(_st.formationIndex)||0)>=(Number(_st.formationTotal)||3));
    if(_isLastFormation){
      // 解除は次のマスへ進んだ時（flow.js）に行う。
      G._onlineWaiting=true;
      document.body.classList.add('online-waiting');
    }
    if(typeof renderMoveSlotsInEnemy==='function') renderMoveSlotsInEnemy();
    if(typeof onlineNotifyReady==='function') void onlineNotifyReady(formation);
    return true;
  }
  // ステージ0＝リーゼ（ゲーム開始地点）。出発したらステージ1の最初の戦闘へ。
  // ステージ1のstage1は村（リーゼ）なので、出発したらstage2の通常戦闘から始まる。
  if(Number(G._wave)===0){ G._wave=1; _startWaveBattle(2); return true; }
  const stage=Number(G._waveStage)||1;
  const wave=Math.max(1,Number(G._wave)||1);
  // ※以前はwave===5専用に「stage3ならstage4（ラスボス）へ」という決め打ちがあり、
  //   stage2の通常戦闘に勝ってstage3（エリート）へ進んだ直後にそれが働いて
  //   **エリートを飛ばしてラスボスへ**行っていた。エリート勝利後の遷移は
  //   finishWaveBattleVictory()側が担当しているので、ここは他ステージと同じ
  //   ルート基準の判定に統一する。
  const node=_waveRouteNode(stage,wave);
  if(node==='city'){ _startWaveBattle(stage+1); return true; }
  if(node==='altar'){
    if(wave>=4){
      G._wave=5;
      _openWaveVillage(1,false);
      return true;
    }
    G._wave=Math.min(4,wave+1);
    _startWaveBattle(1);
    return true;
  }
  _startWaveBattle(stage);
  return true;
}
function finishWaveBattleVictory(showVictoryIntro){
  if(!G._waveBattleType) return false;
  const type=G._waveBattleType;
  const stage=Number(G._waveStage)||1;
  const wave=Math.max(1,Number(G._wave)||1);
  const runTransition=fn=>{
    if(!showVictoryIntro){ fn(); return; }
    showVictoryOverlay(()=>{
      const ov=document.getElementById('victory-overlay');
      if(ov) ov.style.display='none';
      fn();
    });
  };
  G._waveBattleWon=true;
  if(type==='battle'){
    G._waveStage=stage+1;
    G._waveRewardCount=5;
    G._waveWithdraw=false;
    G._mapBattle=null;
    G._waveBattleType=null;
    return false;
  }
  if(type==='elite'){
    // Scene 1～4のエリート勝利後は村へ直行。stage番号はルートから求める
    // （ステージ1は先頭が村な分ずれて stage5＝エルム になる）。
    const route=_waveRouteForWave(wave);
    let cityStage=route.indexOf('city',stage)+1;
    if(cityStage<=0) cityStage=4;
    runTransition(()=>{
      _grantWaveEliteItem();
      G._mapBattle=null;
      G._waveBattleType=null;
      if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
      G.enemies=[]; G.phase=null;
      _openWaveVillage(cityStage,true);
    });
    return true;
  }
  if(type==='boss'&&wave===5&&stage===4){
    // Scene 5のボス（エピトメ）撃破：勝利演出は出さず、movie3 → 伏せられたラスボス戦へ。
    // 通常はfinishBattleAsVictory()側で先に分岐するため、ここは保険。
    void startFinalBossIntroSequence();
    return true;
  }
  if(type==='boss'&&wave===5&&stage===5){
    // ラスボス撃破：ゲームクリア
    runTransition(()=>{
      G._mapBattle=null; G._waveBattleType=null;
      if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
      G.enemies=[]; G.phase='clear'; showScreen('clear');
    });
    return true;
  }
  if(type==='boss'){
    // Scene 1～4のstage9（地域ボス）勝利：報酬なしで祭壇(stage10)へ直行
    runTransition(()=>{
      G._mapBattle=null; G._waveBattleType=null;
      if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
      G.enemies=[]; G.phase=null;
      _openWaveAltar(10);
    });
    return true;
  }
  return false;
}
// 敗北は常にゲームオーバー（通常戦・エリート戦・ボス戦とも例外なし）。
// 敵の種類に関わらず、敗北するとライフを1失う。3つとも失うとゲームオーバー。
// ライフが残っていれば同じstageを最初からやり直す。
function handleWaveBattleDefeat(){
  if(!G._waveBattleType) return false;
  G._waveRetryEnemyKey=`${Number(G._wave)||1}:${Number(G._waveStage)||1}:${String(G._waveBattleType||'')}`;
  G._mapBattle=null; G._waveBattleType=null;
  G._waveLife=Math.max(0,(G._waveLife==null?(typeof waveLifeMax==='function'?waveLifeMax():3):Number(G._waveLife))-1);
  if(G._waveLife<=0){
    G._battleDefeatHandled=true;
    // オンライン対戦：CPU戦でのゲームオーバーもサーバーへ通知する（相手には通知されない仕様）。
    if(G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch&&OnlineMatch.isActive()){
      G._onlinePerfectWin=false;
      void OnlineMatch.reportGameOver();
    }
    gameOver();
    return true;
  }
  log(`敗北した。ライフを1失った（残り${G._waveLife}）。`,'bad');
  // 直前の村/祭壇/報酬画面を開いた時点まで所持金・アイテム・指輪などを巻き戻す。
  // 魔導板の配置は巻き戻さず、直前に取得した報酬カードを保持する。
  // _rewardStartSnapshotはgoToReward()が村/祭壇/報酬いずれの画面でも共通で取得済みのものを流用する。
  const snap=G._rewardStartSnapshot;
  if(snap){
    G.spellSlots=clone(snap.spellSlots||[]);
    G.inventory=clone(snap.inventory||[]);
    G.gold=Number(snap.gold)||0;
    G.rings=clone(snap.rings||[]);
    G.mapPanelPowers=clone(snap.mapPanelPowers||{});
  }
  if(typeof _removeAbsentKiemetsuCards==='function') _removeAbsentKiemetsuCards();
  if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
  G.enemies=[];
  G._battleDefeatHandled=false;
  G._waveWithdraw=true;
  // showVictoryOverlay()はG.phase==='reward'を要求するためここで先に立てるが、
  // 実際の画面構築（村/祭壇/新規報酬5枚）は「Withdraw」が消えた後のコールバックで行う。
  G.phase='reward';
  if(typeof updateHUD==='function') updateHUD();
  const returnTo=G._waveDefeatReturnTo||'reward';
  showVictoryOverlay(()=>{
    const ov=document.getElementById('victory-overlay');
    if(ov) ov.style.display='none';
    G._battleDefeatHandled=true;
    G._waveWithdraw=false;
    G._waveRewardCount=null;
    G.phase=null;
    if(returnTo==='altar'&&typeof _openWaveAltarMenu==='function') _openWaveAltarMenu();
    else if(returnTo==='village'&&typeof openMapVillage==='function') openMapVillage({intro:true});
    else if(typeof goToReward==='function') goToReward();
  });
  return true;
}
// ── オープニングムービー ─────────────────────────────────────
// タイトルで「初めて」ゲームスタートを押した時だけ流す。
// ゲームオーバー等で一度タイトルへ戻った後は、再度押しても流さない。
// G は startGame() の initState() で作り直されるため、再生済みフラグはモジュール変数で持つ。
let _openingMovieShown = false;
const OPENING_MOVIE_SRC = 'assets/movie/movie1.webm';
const OPENING_MOVIE_FADE_START = 7;    // 秒。ここからフェードアウトを開始する
const OPENING_MOVIE_TAIL_MARGIN = 400; // ms。動画が終わる何ms前までに真っ黒にするか
const FINAL_BOSS_MOVIE_SRC = 'assets/movie/movie3.webm';
const GAME_CLEAR_MOVIE_SRC = 'assets/art/backgrounds/game_clear.webm';
const FINAL_CLEAR_MOVIE_SRC = 'assets/movie/movie4.webm'; // ラスボス撃破後のエンディング動画

// カットシーン動画の音声を、映像のフェードアウトと同じ時間で絞る。
// 映像だけ暗転して音が鳴りっぱなしのまま切れると不自然なため、両方を同時に落とす。
// 非表示タブでも進むよう rAF ではなく setInterval で刻む。戻り値は中断用の関数。
function _fadeCutsceneAudio(video, ms){
  if(!video) return null;
  const from = Math.max(0, Math.min(1, Number(video.volume)));
  const dur = Math.max(1, Number(ms) || 0);
  if(!(from > 0)) return null;
  const start = Date.now();
  const id = window.setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / dur);
    try{ video.volume = Math.max(0, from * (1 - t)); }catch(_e){}
    if(t >= 1) window.clearInterval(id);
  }, 40);
  return () => window.clearInterval(id);
}

// 暗転 → 全画面再生 → 7秒からフェードアウト → 完全暗転。左クリックでいつでもスキップ。
// 再生できない／終わらない場合でも必ず抜けるよう安全弁を張る（出発ムービーと同じ方針）。
async function _playOpeningMovie(){
  const fade  = typeof _ensureVillageEnterFadeEl === 'function' ? _ensureVillageEnterFadeEl() : null;
  const video = typeof _ensureCutsceneVideoEl === 'function' ? _ensureCutsceneVideoEl() : null;
  if(!fade || !video) return;
  const wait = ms => new Promise(r => window.setTimeout(r, ms));
  const timers = [];
  let skipHandler = null;
  let stopAudioFade = null;
  try{
    // タイトルBGMを落としてから暗転する。
    if(typeof stopBgm === 'function') stopBgm(600);
    fade.style.transition = 'opacity .34s ease';
    fade.style.opacity = '1';
    await wait(360);

    if(video.getAttribute('src') !== OPENING_MOVIE_SRC){
      video.setAttribute('src', OPENING_MOVIE_SRC);
      video.load();
    }
    video.currentTime = 0;
    video.loop = false;
    // デバッグミュート（SFX_SETTINGS.masterVolume=0）に追従する。
    const master = (typeof SFX_SETTINGS !== 'undefined' && Number(SFX_SETTINGS.masterVolume));
    video.muted  = !(master > 0);
    video.volume = Math.max(0, Math.min(1, Number.isFinite(master) ? master : 1));
    video.classList.add('is-active');

    await new Promise(resolve => {
      let settled = false;
      const finish = () => { if(settled) return; settled = true; resolve(); };

      // 左クリックでスキップ。タイトルの「ゲームスタート」が黒幕の下に居るため、
      // captureで捕まえて伝播を止めないと二重にstartGame()が走る。
      skipHandler = ev => {
        if(ev.button !== undefined && ev.button !== 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        fade.style.transition = 'opacity .22s ease';
        fade.style.opacity = '1';
        stopAudioFade = _fadeCutsceneAudio(video, 220) || stopAudioFade;
        window.setTimeout(finish, 230);
      };
      window.addEventListener('pointerdown', skipHandler, true);

      video.addEventListener('ended', finish, { once:true });
      video.addEventListener('error', finish, { once:true });

      // 尺が分かり次第、7秒からのフェードアウトと安全弁を仕込む。
      const schedule = () => {
        const dur = Number(video.duration);
        if(Number.isFinite(dur) && dur > 0){
          // 動画が終わる OPENING_MOVIE_TAIL_MARGIN ms 前までに暗転を完了させる。
          const fadeMs = Math.max(300, (dur - OPENING_MOVIE_FADE_START) * 1000 - OPENING_MOVIE_TAIL_MARGIN);
          const delay  = Math.max(0, OPENING_MOVIE_FADE_START * 1000 - video.currentTime * 1000);
          timers.push(window.setTimeout(() => {
            fade.style.transition = `opacity ${fadeMs}ms linear`;
            fade.style.opacity = '1';
            // 映像のフェードアウトと同じ長さで音声も絞る。
            stopAudioFade = _fadeCutsceneAudio(video, fadeMs) || stopAudioFade;
          }, delay));
          timers.push(window.setTimeout(finish, dur * 1000 + 1500));
        }else{
          timers.push(window.setTimeout(finish, 30000));
        }
      };
      if(video.readyState >= 1) schedule();
      else video.addEventListener('loadedmetadata', schedule, { once:true });

      // 再生開始と同時に明転する（暗転はフェードアウト側で掛け直す）。
      Promise.resolve(video.play()).catch(() => {}).then(() => {
        fade.style.transition = 'opacity .5s ease';
        fade.style.opacity = '0';
      });
    });

    // ここに来た時点で必ず真っ黒にしておく（スキップ・エラー経路も含む）。
    fade.style.transition = 'opacity .2s ease';
    fade.style.opacity = '1';
    stopAudioFade = _fadeCutsceneAudio(video, 200) || stopAudioFade;
    await wait(210);
  }finally{
    timers.forEach(t => window.clearTimeout(t));
    if(typeof stopAudioFade === 'function') stopAudioFade();
    if(skipHandler) window.removeEventListener('pointerdown', skipHandler, true);
    try{ video.pause(); }catch(_e){}
    video.classList.remove('is-active');
  }
}

// いま進行中の戦闘がScene 5のボス戦（万象の揺り籠“エピトメ”＝stage4）かどうか。
// 勝利時は通常の勝利演出・報酬を挟まず、movie3 → 伏せられたラスボス戦へ直行する。
function isEpitomeVictoryBattle(){
  return !!(G&&String(G._waveBattleType||'')==='boss'
    &&Number(G._wave)===5&&Number(G._waveStage)===4);
}
// いま進行中の戦闘が伏せられたラスボス戦（Scene 5 / stage5 / boss）かどうか。
// 戦闘開始演出の省略と、登場演出のフェードイン化に使う。
function isFinalBossBattleNow(){
  return !!(G&&String(G._waveBattleType||'')==='boss'
    &&Number(G._wave)===5&&Number(G._waveStage)===5);
}
function isFinalBossVictoryBattle(){
  return isFinalBossBattleNow();
}

// 戦闘画面を黒へフェードしてからmovie3を表示し、動画末尾も黒へフェードする。
// movie3が7秒より短い場合もあるため、末尾フェードは尺に合わせて開始位置を前倒しする。
async function _playFinalBossMovieToBlack(){
  return _playCutsceneMovieToBlack(FINAL_BOSS_MOVIE_SRC);
}
// 画面を黒へフェードしてから指定の動画を全画面再生し、動画末尾も黒へフェードする。
// 7秒より短い動画でも、末尾約1.6秒を使って必ずフェードアウトする。
async function _playCutsceneMovieToBlack(src){
  const fade=typeof _ensureVillageEnterFadeEl==='function'?_ensureVillageEnterFadeEl():null;
  const video=typeof _ensureCutsceneVideoEl==='function'?_ensureCutsceneVideoEl():null;
  if(!fade||!video) return;
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  const timers=[];
  let stopAudioFade=null;
  try{
    const currentFadeOpacity=parseFloat(getComputedStyle(fade).opacity);
    if(!(Number.isFinite(currentFadeOpacity)&&currentFadeOpacity>=.99)){
      fade.style.transition='none';
      fade.style.opacity=String(Number.isFinite(currentFadeOpacity)?currentFadeOpacity:0);
      void fade.offsetWidth;
      fade.style.transition='opacity .6s ease';
      fade.style.opacity='1';
      await wait(630);
    }

    if(video.getAttribute('src')!==src){
      video.setAttribute('src',src);
      video.load();
    }
    video.currentTime=0;
    video.loop=false;
    const master=(typeof SFX_SETTINGS!=='undefined'&&Number(SFX_SETTINGS.masterVolume));
    video.muted=!(master>0);
    video.volume=Math.max(0,Math.min(1,Number.isFinite(master)?master:1));
    video.classList.add('is-active');

    await new Promise(resolve=>{
      let settled=false;
      const finish=()=>{ if(settled) return; settled=true; resolve(); };
      video.addEventListener('ended',finish,{once:true});
      video.addEventListener('error',finish,{once:true});
      const schedule=()=>{
        const dur=Number(video.duration);
        if(Number.isFinite(dur)&&dur>0){
          // 7秒より短い動画でも、末尾約1.6秒を使って必ずフェードアウトする。
          const fadeStart=Math.min(OPENING_MOVIE_FADE_START,Math.max(0,dur-1.6));
          const fadeMs=Math.max(500,(dur-fadeStart)*1000-200);
          const delay=Math.max(0,fadeStart*1000-video.currentTime*1000);
          timers.push(window.setTimeout(()=>{
            fade.style.transition=`opacity ${fadeMs}ms linear`;
            fade.style.opacity='1';
            // 映像のフェードアウトと同じ長さで音声も絞る。
            stopAudioFade=_fadeCutsceneAudio(video,fadeMs)||stopAudioFade;
          },delay));
          timers.push(window.setTimeout(finish,dur*1000+1500));
        }else timers.push(window.setTimeout(finish,30000));
      };
      if(video.readyState>=1) schedule();
      else video.addEventListener('loadedmetadata',schedule,{once:true});
      let revealed=false;
      const reveal=()=>{
        if(revealed) return;
        revealed=true;
        const show=()=>{
          fade.style.transition='opacity .5s ease';
          fade.style.opacity='0';
        };
        // play()の完了だけでは最初の映像フレームが未描画の場合がある。
        if(typeof video.requestVideoFrameCallback==='function') video.requestVideoFrameCallback(show);
        else requestAnimationFrame(show);
      };
      video.addEventListener('playing',reveal,{once:true});
      Promise.resolve(video.play()).catch(()=>{});
    });

    fade.style.transition='opacity .2s ease';
    fade.style.opacity='1';
    stopAudioFade=_fadeCutsceneAudio(video,200)||stopAudioFade;
    await wait(210);
  }finally{
    timers.forEach(timer=>window.clearTimeout(timer));
    if(typeof stopAudioFade==='function') stopAudioFade();
    try{ video.pause(); }catch(_e){}
    video.classList.remove('is-active');
  }
}

// 最終エリート撃破後の導入。movie3を最後まで（フェードアウト込みで）流し、
// 暗転のまま2秒待ってからラスボス戦を開始し、last_battle.webmを明転させる。
const FINAL_BOSS_INTRO_PRE_WAIT_MS=2000;   // エリート撃破からmovie3を始めるまでの待ち
const FINAL_BOSS_INTRO_BLACK_WAIT_MS=2000; // movie3のフェードアウト完了後に待つ時間
const FINAL_BOSS_INTRO_REVEAL_MS=1200;     // last_battle.webmをフェードインさせる時間
const FINAL_CLEAR_PRE_WAIT_MS=2000; // ラスボス撃破からmovie4を始めるまでの待ち
// ラスボス撃破後、クリア画面へ渡す前の暗転だけを行う（現在は未使用。手動テスト用に残す）。

async function startFinalBossIntroSequence(){
  if(G._finalBossIntroRunning) return;
  G._finalBossIntroRunning=true;
  try{
    if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
    if(typeof stopBgm==='function') stopBgm(600);
    if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(600);
    // 撃破の余韻を残してから動画へ入る。
    await new Promise(resolve=>window.setTimeout(resolve,FINAL_BOSS_INTRO_PRE_WAIT_MS));
    await _playFinalBossMovieToBlack();
    // movie3は完全暗転で終わる。その黒幕を保ったまま2秒待つ。
    await new Promise(resolve=>window.setTimeout(resolve,FINAL_BOSS_INTRO_BLACK_WAIT_MS));
    G._mapBattle=null;
    G._waveBattleType=null;
    if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
    G.enemies=[];
    G.phase=null;
    // 伏せられたラスボス戦（stage5）を開始する。_stageBgVideoSetting()が
    // last_battle.webmを返すため、画面構築と同時に背景動画が入る。
    _startWaveBattle(5);
    // 黒幕を外して last_battle.webm を明転させる（＝フェードイン）。
    const fade=typeof _ensureVillageEnterFadeEl==='function'?_ensureVillageEnterFadeEl():null;
    if(fade){
      await new Promise(resolve=>window.setTimeout(resolve,120));
      fade.style.transition=`opacity ${FINAL_BOSS_INTRO_REVEAL_MS}ms ease`;
      fade.style.opacity='0';
    }
  }finally{
    G._finalBossIntroRunning=false;
  }
}

async function startFinalBossClearSequence(){
  if(G._finalClearSequenceRunning) return;
  G._finalClearSequenceRunning=true;
  try{
    if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
    if(typeof stopBgm==='function') stopBgm(600);
    if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(600);
    // 撃破の余韻を残してからエンディングへ入る。
    await new Promise(resolve=>window.setTimeout(resolve,FINAL_CLEAR_PRE_WAIT_MS));
    // movie4とgame_clear.wavを同時に始める。BGMはクリア画面まで鳴り続ける
    // （gameOver()はisClearのときstopBgm()しない）。
    if(typeof playBgm==='function') playBgm('gameClear',{fadeInMs:0});
    // movie3と同じく、末尾は黒へフェードアウトして終わる。
    await _playCutsceneMovieToBlack(FINAL_CLEAR_MOVIE_SRC);
    G._mapBattle=null;
    G._waveBattleType=null;
    if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
    G.enemies=[];
    gameOver({clear:true});
  }finally{
    G._finalClearSequenceRunning=false;
  }
}

// タイトルの「ゲームスタート」から呼ぶ。初回だけオープニングを挟んでからゲームを始める。
// 開始SEもここで鳴らす（ボタン側のonclickで鳴らすと、ムービー終了直後の
// クリックが黒幕の下のボタンに届いてSEが二重に鳴り、ゲームも再開始されてしまう）。
let _startingFromTitle = false;
let _titleStartToken = 0;
// タイトルでCtrl（またはmacのCommand）を押している間だけ
// 「ゲームスタート」を「デバッグモード」に差し替える。
// （メニューから常設のデバッグ項目を無くしたため、こちらが唯一の入口）
let _titleCtrlHeld = false;
let _titleMenuClickBlockedUntil = 0;
const TITLE_START_LABEL='ゲームスタート';
const TITLE_DEBUG_LABEL='デバッグモード';
function _syncTitleStartLabel(){
  const title=document.getElementById('scr-title');
  if(title) title.classList.toggle('title-debug-ready',_titleCtrlHeld);
  const label=document.querySelector('#title-menu .title-menu-item.game-start .title-menu-label');
  if(label) label.textContent=_titleCtrlHeld?TITLE_DEBUG_LABEL:TITLE_START_LABEL;
}
function _setTitleCtrlHeld(on){
  const title=document.getElementById('scr-title');
  const active=!!(title&&title.classList.contains('active'));
  const next=!!on&&active;
  if(_titleCtrlHeld===next) return;
  _titleCtrlHeld=next;
  _syncTitleStartLabel();
}
const _isTitleDebugModifier=e=>!!(e&&(e.key==='Control'||e.key==='Meta'||e.ctrlKey||e.metaKey));
document.addEventListener('keydown',e=>{ if(_isTitleDebugModifier(e)) _setTitleCtrlHeld(true); });
document.addEventListener('keyup',e=>{ if(!e.ctrlKey&&!e.metaKey) _setTitleCtrlHeld(false); });
window.addEventListener('blur',()=>_setTitleCtrlHeld(false));

// タイトルの「オンライン対戦」。ライフ5で通常のウェーブ進行と同じ画面を使い、
// 進行・ライフ・勝敗の権威は OnlineServer（将来は本番サーバー）が持つ。
// マッチングはリーゼで「出発する」を押した時点で行う（仕様）ため、ここでは開始だけ。
function startOnlineMatchFromTitle(){
  if(_startingFromTitle) return;
  _titleStartToken++;
  _startingFromTitle = true;
  _titleCtrlHeld = false;
  if(typeof playSfx === 'function') playSfx('gameStart', { guardKey:'ui:title-online' });
  startGame(false, true);
  _startingFromTitle = false;
}

function startGameFromTitle(){
  if(_startingFromTitle) return;
  // Ctrl／Command押下中はデバッグモードで開始する（オープニングムービーは挟まない）。
  // ここでラベルを戻すと、タイトルが消える前に一瞬「ゲームスタート」に見えるため戻さない。
  // 表示はタイトルへ戻った時（returnToTapStart）に既定へ復帰させる。
  if(_titleCtrlHeld){
    _titleCtrlHeld=false;
    startGame(true);
    return;
  }
  _startingFromTitle = true;
  const startToken=++_titleStartToken;
  if(typeof playSfx === 'function') playSfx('gameStart', { guardKey:'ui:title-game-start' });
  if(_openingMovieShown){ startGame(); _startingFromTitle = false; return; }
  _openingMovieShown = true;
  void _playOpeningMovie().then(() => {
    if(startToken!==_titleStartToken) return;
    startGame(); _startingFromTitle = false;
  });
}

function startGame(debugMode,onlineMode){
  // タイトルの初回入力が導入演出のハンドラで消費された場合でも、
  // ゲーム開始操作そのものをユーザー操作としてSE再生の解禁に使う。
  if(typeof unlockSfx==='function') unlockSfx();
  // タイトルの導入用オーバーレイは、通常／デバッグ開始後に残さない。
  // オンラインはマッチング成立までタイトルを表示する仕様のため除外する。
  if(!onlineMode){
    const title=document.getElementById('scr-title');
    if(title) title.classList.remove('active','startup-title-visible','startup-menu-visible','startup-menu-ready','startup-menu-hover-ready');
  }
  // 前回のランのステージ持続環境音（雷雨など）を持ち越さない。
  if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(0);
  initState();
  G.runStats={
    startedAt:performance.now(), areaName:'', finalBattle:'', allyDeaths:0, enemyKills:0,
    maxDamage:{amount:0,type:''}, maxAtk:0, maxHp:0
  };
  // デバッグモードでは初期カードを配らず、9999のゴーレムだけを置く。
  if(!debugMode) _giveInitialRandomBoardCards();
  window.__vesselboundRetryRewards=null;
  clearLog();
  G._debugMode=!!debugMode;
  if(G._debugMode){
    // デバッグ試験戦闘の実機計測専用。通常モードでは公開しない。
    window.__vesselboundDebugState=G;
    _giveDebugGolem();
    G.gold=100000;
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='';
    const muteBtn=document.getElementById('battle-mute-btn');
    if(muteBtn) muteBtn.style.display='';
    const formBtn=document.getElementById('battle-formation-btn');
    if(formBtn) formBtn.style.display='';
    _setDebugMapButtonVisible(true);
    log('[DEBUG] デバッグモード：ソウル100000','sys');
    requestAnimationFrame(_positionDebugKillButton);
    requestAnimationFrame(()=>{ _positionDebugMuteButton(); _positionDebugFormationButton(); });
  } else {
    window.__vesselboundDebugState=null;
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='none';
    const muteBtn=document.getElementById('battle-mute-btn');
    if(muteBtn) muteBtn.style.display='none';
    const formBtn=document.getElementById('battle-formation-btn');
    if(formBtn) formBtn.style.display='none';
    _setDebugMapButtonVisible(false);
  }
  // オンライン対戦モード。ライフ5・ステージ構成・制限時間はすべてサーバー権威なので、
  // ここではフラグを立てるだけ。マッチングはリーゼの「出発する」で行う。
  G._onlineMode=!!onlineMode;
  if(typeof OnlineMatch!=='undefined'&&OnlineMatch&&typeof OnlineMatch.reset==='function') OnlineMatch.reset();
  if(typeof resetOnlineFlow==='function') resetOnlineFlow();
  document.body.classList.toggle('online-mode-active',!!onlineMode);
  // ゲーム開始地点は「風止みの村 リーゼ」（地域情報シートのステージ0）。
  // 普通の村と同じ#scr-village＋入場演出で開く。施設（ホーム・図書館）は未実装のため
  // 暗く表示され、選べるのは「出発する」だけ。
  G._wave=0;
  // 旅の進捗の先頭マス（村＝リーゼ）に対応するstage1で開く。
  // ※_openWaveVillage(stage)が G._waveStage を上書きするので、ここではなく引数で渡す。
  G._waveStage=1;
  // 前回のランのステージ持続演出（雷雨の動画・環境音）を持ち越さない。
  if(typeof _syncStageAmbience==='function') _syncStageAmbience();
  G._waveBattleType=null;
  G._waveFinalVillage=false;
  // オンライン対戦はライフ5から始まる（サーバー側の初期値 ONLINE_START_LIFE と合わせる）。
  // マッチ開始後は OnlineMatch が持つサーバーの値が正になる。
  G._waveLife=G._onlineMode?(typeof ONLINE_START_LIFE!=='undefined'?ONLINE_START_LIFE:5):3;
  if(G._onlineMode){
    // 仕様：マッチングが成立するまではタイトル画面のまま待つ（画面を切り替えない）。
    // 4人揃った後の進行（編成画面へ）は flow.js がサーバー状態を見て行うので、
    // ここで primeOnlineFlow() は呼ばない（呼ぶと成立後の遷移が飛ぶ）。
    G._wave=1; G._waveStage=1;
    if(typeof OnlineMatch!=='undefined'&&OnlineMatch){
      void OnlineMatch.start({seedSource:`vb-${Date.now()}`,selfId:(G._onlineSelfId||'あなた')});
    }
    if(typeof showOnlineMatching==='function') showOnlineMatching();
    return;
  }
  _openWaveVillage(1,false);
}

function _runStatsAreaName(){
  // 到達地点は「地域情報」シートの道の名前。街より前なら「街までの名前」、
  // 街を出た後（塔へ向かう区間）なら「塔までの名前」を使う（戦闘カットインの副題と同じ）。
  const routeName=typeof _waveBattleRouteName==='function'?String(_waveBattleRouteName()||'').trim():'';
  if(routeName) return routeName;
  return String(G.worldMap?.areaName||G.areaName||G.mapAreaName||G.floorName||`${G.floor||1}階`);
}
function _recordRunStatsSnapshot(){
  if(!G.runStats) return;
  G.runStats.areaName=_runStatsAreaName();
  [...(G.allies||[])].forEach(u=>{
    if(!u||u._isObject||u._isSoul) return;
    G.runStats.maxAtk=Math.max(G.runStats.maxAtk,Number(u.atk)||0);
    G.runStats.maxHp=Math.max(G.runStats.maxHp,Number(u.maxHp??u.hp)||0);
  });
}
function _recordRunStatsDamage(amount,type){
  if(!G.runStats||!(Number(amount)>0)) return;
  const n=Number(amount)||0;
  if(n>(G.runStats.maxDamage?.amount||0)) G.runStats.maxDamage={amount:n,type:type==='毒'?'毒':''};
}
function _runStatsTimeText(){
  const sec=Math.max(0,Math.floor(((performance.now()-(G.runStats?.startedAt||performance.now()))/1000)));
  return `${Math.floor(sec/60)} : ${String(sec%60).padStart(2,'0')}`;
}
function _animateGameOverNumber(id,target,duration=650,formatter=n=>String(Math.floor(n)),delay=0){
  const el=document.getElementById(id); if(!el) return;
  const end=Math.max(0,Number(target)||0);
  el.textContent=formatter(0);
  window.setTimeout(()=>{
    const started=performance.now();
    const tick=now=>{
      const p=Math.min(1,(now-started)/duration);
      const eased=1-Math.pow(1-p,3);
      el.textContent=formatter(end*eased);
      if(p<1) requestAnimationFrame(tick); else el.textContent=formatter(end);
    };
    requestAnimationFrame(tick);
  },Math.max(0,delay));
}
function _animateGameOverPair(id,a,b,duration=650,delay=0){
  const aa=Math.max(0,Number(a)||0), bb=Math.max(0,Number(b)||0);
  _animateGameOverNumber(id,aa,duration,n=>`${Math.floor(n)} / ${Math.floor(bb*Math.min(1,n/Math.max(1,aa)))}`,delay);
  window.setTimeout(()=>{ const el=document.getElementById(id); if(el) el.textContent=`${aa} / ${bb}`; },Math.max(0,delay)+duration+20);
}

function debugGameOver(){
  if(!G._debugMode||G.phase!=='reward') return;
  G._debugGameOver=true;
  G.allies=[];
  if(typeof _startWaveBattle==='function') _startWaveBattle(1);
}

function returnFromDebugGameOver(){
  if(G&&G._libraryTestBattleMode&&typeof _exitTestBattle==='function'){
    closeGameOverOverlay();
    _exitTestBattle();
    return;
  }
  closeGameOverOverlay();
  G._debugGameOver=false;
  G._battleDefeatHandled=false;
  // 確認戦闘で魔導板から生成された一時ユニットを残すと、次の戦闘で同じカードから再生成されて二重になる。
  if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
  G.allies=[];
  G.enemies=[];
  if(typeof _openWaveFormation==='function') _openWaveFormation();
  else showScreen('battle');
}

function closeGameOverOverlay(){
  document.body.classList.remove('gameover-active','game-clear-active','gameover-ui-pending','battle-victory-pending','right-card-peek');
  const video=document.getElementById('gameover-video');
  const tint=document.getElementById('gameover-video-tint');
  const rewardBgVideo=document.getElementById('reward-bg-video');
  if(video){
    if(video._gameOverFadeAnimation) video._gameOverFadeAnimation.cancel();
    video.classList.remove('is-visible');
    if(video._gameOverFadeFrame) cancelAnimationFrame(video._gameOverFadeFrame);
    video.style.removeProperty('opacity');
    video.style.removeProperty('visibility');
    if(video._gameOverRateGuard){
      video.removeEventListener('playing',video._gameOverRateGuard);
      video.removeEventListener('ratechange',video._gameOverRateGuard);
      video._gameOverRateGuard=null;
    }
    try{ video.pause(); video.currentTime=0; }catch(_e){}
  }
  if(tint){
    if(tint._gameOverTintAnimation) tint._gameOverTintAnimation.cancel();
    tint.style.removeProperty('opacity');
    tint.style.removeProperty('visibility');
  }
  if(rewardBgVideo&&document.body.classList.contains('reward-screen-active')){
    try{ void rewardBgVideo.play(); }catch(_e){}
  }
  ['battle-options-btn','battle-status-hud','battle-counters'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.removeProperty('z-index');
  });
  const fade=document.getElementById('battle-end-fade');
  if(fade){ fade.classList.remove('is-visible','is-final'); fade.style.opacity=''; fade.style.visibility=''; }
  const el=document.getElementById('scr-gameover');
  if(el) el.classList.remove('gameover-overlay-active');
}

function debugKillAll(){
  if(!G._debugMode||G.phase!=='player') return;
  const alive=G.enemies.filter(e=>e&&e.hp>0);
  if(!alive.length) return;
  alive.forEach(e=>{ e.hp=0; processEnemyDeath(e,G.enemies.indexOf(e)); });
  log('[DEBUG] 全敵を撃破','sys');
  if(G.enemies.filter(e=>e&&e.hp>0).length===0) _onAllEnemiesDefeated();
}

function gameOver(options){
  const isLibraryTestBattle=!!(G&&G._libraryTestBattleMode);
  // 敗北・踏破の結果画面へ移る前に、戦闘中の一時VFXを必ず破棄する。
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
  const opt=options||{};
  const isClear=opt.clear===true;
  const isDebugGameOver=!!G._debugGameOver;
  document.body.classList.remove('debug-mode');
  ['btn-debug-gameover','btn-test-battle'].forEach(debugId=>{
    const debugEl=document.getElementById(debugId);
    if(debugEl) debugEl.style.display='none';
  });
  let beginVideoFade=null;
  // 通常の全滅では、結果画面を組み立てる前にライフ表示を必ず0へ確定する。
  if(!isLibraryTestBattle&&!isDebugGameOver&&!isClear){
    G._waveLife=0;
    G.life=0;
    if(typeof updateHUD==='function') updateHUD();
  }
  if(!isClear&&!isLibraryTestBattle){
    try{
      if(typeof playFileSfx==='function'){ playFileSfx('assets/sfx/game_over.wav'); }
      else { const se=new Audio('assets/sfx/game_over.wav'); se.volume=sfxFallbackVolume(.9); void se.play(); }
    }catch(_e){}
  }
  document.body.classList.remove('battle-turn-active');
  // 図書館の試験戦闘は練習用で、図書館のBGMを鳴らしたまま戦闘・結果画面へ進む。
  // ここで止めると編成画面へ戻った後も無音のままになる（showScreen()は
  // G._villageBgmActive中はBGMを鳴らし直さないため、二度と復帰しない）。
  if(!isLibraryTestBattle){
    if(typeof stopBgm==='function') stopBgm(900);
    // ステージ持続環境音（雷雨など）はstopBgm()では止まらないため、ゲームオーバーでは明示的に落とす。
    if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(900);
  }
  if(typeof _showBattleEndFade==='function') _showBattleEndFade();
  // ラミアで一時的に仲間にしたキャラクターは敗北時にも持ち越さない
  if(typeof _removeLamiaCapturedUnits==='function') _removeLamiaCapturedUnits();
  const victory=document.getElementById('victory-overlay');
  if(victory) victory.style.display='none';
  ['rw-cards','reward-cards-section'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(id==='rw-cards') el.replaceChildren();
    else el.style.display='none';
  });
  _recordRunStatsSnapshot();
  G.runStats=G.runStats||{};
  G.runStats.areaName=_runStatsAreaName();
  G.runStats.playTime=_runStatsTimeText();
  G._gameOverSpecialDebug=isDebugGameOver||isLibraryTestBattle;
  G._gameOverClear=isClear;
  G._debugGameOver=false;
  if(typeof renderGameOverBoard==='function') renderGameOverBoard();
  document.getElementById('go-area').textContent=G.runStats.areaName;
  document.getElementById('go-final').textContent=G.runStats.finalBattle||'—';
  document.getElementById('go-time').textContent=G.runStats.playTime||'0 : 00';
  _animateGameOverNumber('go-allyDeaths',G.runStats.allyDeaths,600,undefined,800);
  _animateGameOverNumber('go-enemyKills',G.runStats.enemyKills,600,undefined,900);
  _animateGameOverNumber('go-damage',G.runStats.maxDamage?.amount,700,n=>`${Math.floor(n)} ダメージ${G.runStats.maxDamage?.type?`（${G.runStats.maxDamage.type}）`:''}`,1000);
  _animateGameOverPair('go-stats',G.runStats.maxAtk,G.runStats.maxHp,700,1100);
  const resultTitle=document.querySelector('#gameover-results h1');
  // オンライン対戦で相手のライフを0にした場合は「踏破」ではなく「完全勝利」と表示する。
  const _perfect=!!(G&&G._onlineMode&&G._onlinePerfectWin);
  if(resultTitle) resultTitle.textContent=isClear?(_perfect?'完全勝利':'踏破'):'旅の終焉';
  const back=document.getElementById('gameover-back-btn');
  if(back){
    back.textContent=G._gameOverSpecialDebug?'編成画面に戻る':'タイトルに戻る';
    back.onclick=()=>{
      if(typeof playSfx==='function') playSfx('uiConfirmHeavy',{group:'ui',guardKey:'ui:gameover-back'});
      if(G._gameOverSpecialDebug) returnFromDebugGameOver();
      else{ closeGameOverOverlay(); showScreen('title'); }
    };
  }
  const retry=document.getElementById('gameover-retry-btn');
  if(retry) retry.onclick=()=>{
    if(typeof playSfx==='function') playSfx('uiConfirmHeavy',{group:'ui',guardKey:'ui:gameover-retry'});
    closeGameOverOverlay();
    startGame(!!G._debugMode);
  };
  const continueBtn=document.getElementById('gameover-continue-btn');
  if(continueBtn) continueBtn.onclick=()=>{
    if(typeof playSfx==='function') playSfx('uiConfirmHeavy',{group:'ui',guardKey:'ui:gameover-continue'});
    closeGameOverOverlay();
    showScreen('title');
  };
  const go=document.getElementById('go-sub'); if(go) go.textContent=`${G.floor}階で力尽きました`;
  G.phase=isClear?'clear':'gameover';
  document.body.classList.toggle('game-clear-active',isClear);
  document.body.classList.toggle('gameover-ui-pending',isClear);
  document.body.classList.add('gameover-active','battle-victory-pending');
  ['battle-options-btn','battle-status-hud','battle-counters'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.setProperty('z-index','10001','important');
  });
  document.getElementById('scr-gameover')?.classList.add('gameover-overlay-active');
  const video=document.getElementById('gameover-video');
  const tint=document.getElementById('gameover-video-tint');
  const rewardBgVideo=document.getElementById('reward-bg-video');
  if(rewardBgVideo){ try{ rewardBgVideo.pause(); }catch(_e){} }
  if(video){
    if(video._gameOverFadeAnimation) video._gameOverFadeAnimation.cancel();
    if(video._gameOverFadeFrame) cancelAnimationFrame(video._gameOverFadeFrame);
    video.classList.remove('is-visible');
    video.style.opacity='0';
    video.style.visibility='visible';
    const desiredSrc=isClear?GAME_CLEAR_MOVIE_SRC:'assets/art/backgrounds/game_over.webm';
    if(video.getAttribute('src')!==desiredSrc){
      video.setAttribute('src',desiredSrc);
      video.load();
    }
    if(tint){
      if(tint._gameOverTintAnimation) tint._gameOverTintAnimation.cancel();
      tint.style.opacity='0';
      tint.style.visibility='visible';
    }
    try{
      video.pause();
      video.currentTime=0;
      video.muted=true;
      video.loop=true;
      const applyGameOverRate=()=>{
        if(isClear) return;
        video.defaultPlaybackRate=.7;
        if(Math.abs(video.playbackRate-.7)>.001) video.playbackRate=.7;
      };
      if(video._gameOverRateGuard){
        video.removeEventListener('playing',video._gameOverRateGuard);
        video.removeEventListener('ratechange',video._gameOverRateGuard);
      }
      video._gameOverRateGuard=isClear?null:applyGameOverRate;
      if(!isClear){
        video.addEventListener('playing',applyGameOverRate);
        video.addEventListener('ratechange',applyGameOverRate);
      }
      applyGameOverRate();
      if(!isClear&&video.readyState<1) video.addEventListener('loadedmetadata',applyGameOverRate,{once:true});
      const playResult=video.play();
      if(playResult&&typeof playResult.then==='function') void playResult.then(()=>{
        applyGameOverRate();
        if(isClear&&beginVideoFade){
          let firstFrameHandled=false;
          const afterFirstFrame=()=>{
            if(firstFrameHandled) return;
            firstFrameHandled=true;
            beginVideoFade();
          };
          // 黒幕はgame_clearの最初の映像フレームが描画可能になるまで保持する。
          if(typeof video.requestVideoFrameCallback==='function') video.requestVideoFrameCallback(afterFirstFrame);
          else requestAnimationFrame(afterFirstFrame);
          window.setTimeout(afterFirstFrame,1200);
        }
      }).catch(()=>{ if(isClear&&beginVideoFade) beginVideoFade(); });
    }catch(_e){}
    // CSSのdisplay/visibility切替と同時でも確実に0→1を描画するため、動画自身を直接アニメーションする。
    void video.getBoundingClientRect();
    let videoFadeStarted=false;
    beginVideoFade=()=>{
      if(videoFadeStarted) return;
      videoFadeStarted=true;
      video._gameOverFadeFrame=requestAnimationFrame(()=>{
        const sceneFade=isClear?document.getElementById('village-enter-fade'):null;
        if(typeof video.animate==='function'){
          video._gameOverFadeAnimation=video.animate(
            [{opacity:0},{opacity:1}],
            {duration:1200,easing:'ease-out',fill:'forwards'}
          );
          if(tint&&!isClear) tint._gameOverTintAnimation=tint.animate(
            [{opacity:0},{opacity:.78}],
            {duration:1200,easing:'ease-out',fill:'forwards'}
          );
        }else{
          video.style.removeProperty('opacity');
          video.classList.add('is-visible');
          if(tint) tint.style.opacity='.78';
        }
        // movie3終了時の完全暗転を保持したまま、game_clearと同期して黒幕を外す。
        if(sceneFade){
          sceneFade.style.transition='opacity 1.2s ease-out';
          sceneFade.style.opacity='0';
        }
        if(isClear) window.setTimeout(()=>document.body.classList.remove('gameover-ui-pending'),1250);
      });
    };
    if(!isClear) beginVideoFade();
  }
}
// onShown：オーバーレイが実際に表示された後、指定ms後に呼ばれるコールバック（省略可）。
// 呼び出し側で独立したsetTimeoutを組むと、renderAll()等の重い同期処理でメインスレッドが
// 詰まった際に「表示」と「非表示」のタイマーがほぼ同時に発火し、一瞬で消えてしまう競合が起きるため、
// 表示が確定してから逆算する形でチェーンする。
// opts.withButton=false … 「進む」ボタンを出さない（オンラインの敗北など）
// opts.autoMs           … その時間後に、ボタンを押したのと**同じ経路**で自動的に進む
//                          （フェードも尺も遷移も押した時と同一にするため、
//                            continueAfterBattleVictory() をそのまま使う）
function _armBattleContinue(cutin,onShown,opts){
  const withButton=!(opts&&opts.withButton===false);
  const autoMs=Number(opts&&opts.autoMs)||0;
  if(!cutin){ if(typeof onShown==='function') onShown(); return; }
  // 前回の勝利画面でクリック処理が残っていても、次の勝利・撤退画面では
  // 必ず新しい進行処理を受け付ける。
  G._battleProceedBusy=false;
  G._battleProceedSfxPlayed=false;
  // 画面全体のクリックSE用captureリスナーが先に動く環境でも、
  // 「進む」だけは確実に本来の遷移処理へ到達させる。
  if(!document.__battleContinueCaptureBound){
    document.__battleContinueCaptureBound=true;
    document.addEventListener('click',ev=>{
      const btn=ev.target&&ev.target.closest?ev.target.closest('#battle-continue-btn'):null;
      if(!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      continueAfterBattleVictory();
    },true);
  }
  if(!withButton){
    // ボタンを出さない場合でも、進行処理だけは同じものを仕込む。
    G._battleProceedAction=onShown;
    // 自動進行はボタンを押していないので確定音は鳴らさない。
    if(autoMs>0) window.setTimeout(()=>continueAfterBattleVictory(true),autoMs);
    return;
  }
  const panel=document.createElement('div');
  panel.id='battle-continue-panel';
  panel.innerHTML='<span class="battle-continue-back" aria-hidden="true"></span><button id="battle-continue-btn" type="button" data-sfx-silent="1"><span class="battle-continue-label">進む</span></button>';
  panel.style.pointerEvents='auto';
  panel.style.zIndex='10001';
  const btn=panel.querySelector('#battle-continue-btn');
  if(btn){
    btn.style.pointerEvents='auto';
    btn.setAttribute('onclick','continueAfterBattleVictory()');
    btn.onclick=ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      continueAfterBattleVictory();
    };
    btn.addEventListener('pointerdown',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      continueAfterBattleVictory();
    },{once:true});
    btn.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      continueAfterBattleVictory();
    });
  }
  cutin.appendChild(panel);
  G._battleProceedAction=onShown;
  if(autoMs>0) window.setTimeout(()=>continueAfterBattleVictory(true),autoMs);
}
// silent=true … ボタンを押していない自動進行。確定音を鳴らさない。
function continueAfterBattleVictory(silent){
  if(typeof G==='undefined'||!G||G._battleProceedBusy) return;
  const action=G._battleProceedAction;
  if(typeof action!=='function') return;
  G._battleProceedBusy=true;
  if(silent===true) G._battleProceedSfxPlayed=true;
  if(!G._battleProceedSfxPlayed){
    G._battleProceedSfxPlayed=true;
    if(typeof playSfx==='function') playSfx('uiConfirm',{group:'ui',guardKey:'ui:button'});
  }
  const panel=document.getElementById('battle-continue-panel');
  if(panel) panel.style.pointerEvents='none';
  const cutin=document.getElementById('battle-start-intro');
  if(cutin) cutin.remove();
  const fade=document.getElementById('battle-transition-fade');
  if(fade) fade.classList.add('is-visible');
  // 図書館の試験戦闘は図書館のBGMを鳴らしたまま編成画面へ戻す。
  if(typeof stopBgm==='function'&&!(G&&G._libraryTestBattleMode)) stopBgm(700);
  window.setTimeout(()=>{
    G._battleProceedAction=null;
    G._battleProceedBusy=false;
    action();
    // 村・祭壇の入場演出へ入った場合は、暗転をそのまま演出側へ引き継ぐ
    // （ここで外すと、演出の黒が乗るまでの間だけ盤面が見えてしまう。
    //   _playVillageEnterIntro()が村画面を組み立てた時点で外す）。
    if(typeof G!=='undefined'&&G&&G._villageIntroPlaying) return;
    // 報酬は同じ#scr-battle内で切り替わるため、showScreen()を通らない。
    // 遷移後に両方の黒オーバーレイを確実に解除する。
    const endFade=document.getElementById('battle-end-fade');
    const transitionFade=document.getElementById('battle-transition-fade');
    [endFade,transitionFade].forEach(el=>{
      if(!el) return;
      el.classList.remove('is-visible','is-final');
      el.removeAttribute('style');
    });
  },720);
}
function showVictoryOverlay(onShown,shownDuration){
  if(G._battleDefeatHandled&&!G._waveWithdraw) return;
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx({preserveDamage:true});
  ['btn-debug-gameover','btn-test-battle'].forEach(debugId=>{
    const debugEl=document.getElementById(debugId);
    if(debugEl) debugEl.style.display='none';
  });
  // 注：onBattleEnd()が_panelSummonedユニット（＝現行仕様の全味方）をG.alliesから除去済みのため、
  // ここでの味方生存チェックは常にtrueとなり誤って早期returnしてしまう。勝利可否は呼び出し元で判定済み。
  // 「You Win」表示と同時に浮遊ログのフェードを加速し、画面遷移までに確実に消しきる
  if(typeof _fastForwardLogFx==='function') _fastForwardLogFx();
  setTimeout(()=>{
    if(G._battleDefeatHandled||G.phase!=='reward') return;
    const isWithdraw=!!G._waveWithdraw;
    // ボス勝利音の判定。この時点では既に goToReward() が走っていて
    // G._bossJustDefeated はクリア済みのことがある（クリア前に控えを取っている
    // G._isBossRewardCycle も併せて見る）。片方でも立っていればボス勝利音にする。
    const _wasBossWin=!!(G._bossJustDefeated||G._isBossRewardCycle);
    // 「いつ・どのSEで・どの尺で出すか」は present_events.js が唯一の実装
    // （オンラインと同じ）。ここでは側ごとの違いだけを渡す。
    Promise.resolve(presentBattleResultCutin({
      win:!isWithdraw,
      bossWin:_wasBossWin,
      withdraw:isWithdraw,
      durationMs:Number(shownDuration)||undefined,
      // 勝利・撤退とも、結果表示を保持したまま「進む」入力を待つ（PvEのみ）。
      afterShown:overlay=>{ _armBattleContinue(overlay,onShown); },
    }));
  },120);
}
function hideVictoryOverlay(){
  document.getElementById('victory-overlay').style.display='none';
  if(typeof G!=='undefined'&&G._battleProceedAction) continueAfterBattleVictory();
  else goToReward();
}

// ── 起動時データ読み込み／ブランドロゴ → タイトル演出 ───────────
let _startupIntroTimerIds=[];
let _startupIntroSkipped=false;
function _startTitleBgm(){
  if(typeof unlockSfx==='function') unlockSfx();
  if(typeof playBgm==='function') playBgm('gameTitle',{fadeInMs:1200});
  if(!window._titleBgmRetryWired){
    window._titleBgmRetryWired=true;
    document.addEventListener('pointerdown',e=>{
      const title=document.getElementById('scr-title');
      if(e.target&&e.target.closest&&e.target.closest('#title-options-btn')) return;
      if(title&&title.classList.contains('startup-title-visible')&&!title.classList.contains('startup-menu-visible')) _startTitleBgm();
    },true);
  }
}
function _wireTitleSelectBack(){
  const menu=document.getElementById('title-menu');
  const back=document.getElementById('title-select-back');
  if(!menu||!back||back.dataset.wired==='1') return;
  back.dataset.wired='1';
  const title=document.getElementById('scr-title');
  const move=btn=>{
    if(!title||!title.classList.contains('startup-menu-hover-ready')) return;
    back.style.top=`${btn.offsetTop+12}px`;
  };
  const items=menu.querySelectorAll('.title-menu-item');
  items.forEach(btn=>btn.addEventListener('pointerenter',()=>move(btn)));
  if(items[0]) back.style.top=`${items[0].offsetTop+12}px`;
  if(title&&title.dataset.titleHoverGateWired!=='1'){
    title.dataset.titleHoverGateWired='1';
    title.addEventListener('pointermove',e=>{
      if(!title.classList.contains('startup-menu-ready')) return;
      title.classList.add('startup-menu-hover-ready');
      const hovered=document.elementFromPoint(e.clientX,e.clientY);
      const item=hovered&&hovered.closest?hovered.closest('.title-menu-item'):null;
      if(item&&menu.contains(item)) move(item);
    },{passive:true});
  }
}
function _startTitleBgVideo(){
  const video=document.getElementById('title-bg-video');
  if(!video) return;
  video.muted=true;
  video.playbackRate=.5;
  const promise=video.play();
  if(promise&&typeof promise.catch==='function') promise.catch(()=>{});
}
function _revealTitleMenu(){
  if(_startupIntroSkipped) return;
  _startupIntroSkipped=true;
  _startupIntroTimerIds.forEach(id=>clearTimeout(id));
  _startupIntroTimerIds=[];
  const loading=document.getElementById('scr-loading');
  const title=document.getElementById('scr-title');
  if(!title) return;
  title.classList.add('active','startup-title','startup-title-visible','startup-menu-visible');
  // TAPのpointerdownでメニューを表示した直後、同じ入力のpointerup/clickが
  // 表示途中のオンライン項目へ流れると、デバッグ入口を押したつもりでも
  // オンライン待機へ遷移する。CSSのpointer-eventsだけではブラウザ実機の
  // 合成入力を完全に止められないため、次のclickを時間で明示的に捨てる。
  _titleMenuClickBlockedUntil=performance.now()+900;
  // TAP TO STARTの同じ入力が、表示直後の先頭メニューへ誤って届かないよう短時間だけ入力を止める。
  title.classList.add('startup-menu-input-locked');
  window.setTimeout(()=>title.classList.remove('startup-menu-input-locked'),700);
  _startTitleBgVideo();
  _startupIntroTimerIds.push(setTimeout(()=>title.classList.add('startup-menu-ready'),1250));
  _startTitleBgm();
  if(typeof setScreenAssetBackground==='function') setScreenAssetBackground('title','title');
  if(loading) loading.classList.add('startup-brand-out');
  window.setTimeout(()=>loading&&loading.classList.remove('active'),800);
  window.removeEventListener('pointerdown',_skipStartupIntro,true);
}
document.addEventListener('click',e=>{
  if(performance.now()>=_titleMenuClickBlockedUntil) return;
  const target=e.target&&e.target.closest?e.target.closest('#title-menu'):null;
  if(!target) return;
  e.preventDefault();
  e.stopImmediatePropagation();
},true);
function returnToTapStart(){
  const title=document.getElementById('scr-title');
  if(!title) return;
  _titleCtrlHeld=false;
  _syncTitleStartLabel();
  _startupIntroTimerIds.forEach(id=>clearTimeout(id));
  _startupIntroTimerIds=[];
  _startupIntroSkipped=false;
  title.classList.remove('startup-menu-input-locked');
  title.classList.remove('startup-menu-visible','startup-menu-ready','startup-menu-hover-ready');
  title.classList.add('active','startup-title','startup-title-visible');
  window.removeEventListener('pointerdown',_skipStartupIntro,true);
  window.addEventListener('pointerdown',_skipStartupIntro,true);
}
function _skipStartupIntro(e){
  if(e&&e.button!=null&&e.button!==0) return;
  const title=document.getElementById('scr-title');
  if(e&&title){
    const rect=title.getBoundingClientRect();
    if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom) return;
  }
  if(!_startupIntroSkipped){
    if(e) e.preventDefault();
    _revealTitleMenu();
  }
}
function _beginStartupIntro(){
  const loading=document.getElementById('scr-loading');
  const title=document.getElementById('scr-title');
  if(!loading||!title) return;
  loading.classList.add('startup-splash');
  title.classList.add('startup-title');
  _wireTitleSelectBack();
  if(typeof setScreenAssetBackground==='function') setScreenAssetBackground('title','title');
  // TAP TO STARTの表示待ちではなく、タイトル導入が始まった時点で再生要求を出す。
  // 自動再生で拒否された場合はaudio.jsの保留要求が最初の操作で再試行する。
  _startTitleBgm();
  window.addEventListener('pointerdown',_skipStartupIntro,true);
  _startupIntroTimerIds.push(setTimeout(()=>{
    title.classList.add('active','startup-title-visible');
    _startTitleBgVideo();
    _startTitleBgm();
    loading.classList.add('startup-brand-out');
  },1000));
}
window.addEventListener('resize', ()=>{ if(typeof _updateLaneOffset==='function') _updateLaneOffset(); });
window.addEventListener('DOMContentLoaded', async () => {
  _beginStartupIntro();
  const msgEl = document.getElementById('load-msg');
  const ok = await loadGameData();
  if (msgEl) {
    msgEl.textContent = ok
      ? '✓ データを読み込みました'
      : '⚠ オフライン：内蔵データで起動します';
    msgEl.style.color = ok ? 'var(--teal2)' : 'var(--gold2)';
  }
});

/* 🛠️ js/engine/main.js の一番最後へ追記（古いF4コードは消去） */
window.addEventListener('keydown', async (e) => {
  // F4キーが押されたら、現在のゲーム進行状況を1ミリも崩さず、エクセルデータを完全同期
  if (e.key === 'F4') {
    e.preventDefault();
    console.log('[完全同期] エクセルのキャッシュを破棄し、再スキャンを開始します...');
    
    // 画面のログボックスに案内を挿入
    const b = document.getElementById('log-box');
    if (b) {
      const p = document.createElement('p');
      p.className = 'sys';
      p.style.fontWeight = '900';
      p.innerHTML = '🔄 エクセルデータをリアルタイム同期中...';
      b.appendChild(p);
      b.scrollTop = b.scrollHeight;
    }

    // 💡【罠1対策】ブラウザのキャッシュを無効化するため、一時的にfetch関数をハックしてタイムスタンプを強制付与
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && (url.includes('Vesselbound_data.xlsx') || url.includes('Vesselbound_data .xlsx'))) {
        url = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      }
      return originalFetch.call(this, url, options);
    };

    // 設計図マスタを再読込
    const ok = await loadGameData();
    
    // ハックしたfetchをもとに戻す
    window.fetch = originalFetch;
    
    if (ok) {
      // 💡【罠2対策】現在展開されている「配置済みカードオブジェクト」の中身を、最新の設計図から逆引きして直接上書きリフレッシュする
      const refreshCardObject = (card) => {
        if (!card) return;
        // キャラクター / 強化パネルの場合
        const def = (typeof PANEL_POOL !== 'undefined' ? PANEL_POOL : []).find(p => p.id === card.id || p.name === card.name);
        if (def) {
          card.desc = def.desc;
          card.keywords = [...(def.keywords || [])];
          card.adjacentKeywords = [...(def.adjacentKeywords || [])];
          card.adjacentAtkBonus = def.adjacentAtkBonus;
          card.adjacentHpBonus = def.adjacentHpBonus;
          card.directionCount = def.directionCount;
          if(Number(def.directionCount)===0) card.directions=[];
          if (def.power !== undefined) card.power = def.power;
          if (def.life !== undefined) card.life = def.life;
        }
      };

      const refreshUnitObject = (unit) => {
        if (!unit) return;
        // 戦闘中の敵は ENEMY_POOL から逆引き
        const def = (typeof ENEMY_POOL !== 'undefined' ? ENEMY_POOL : []).find(e => e.name === unit.name);
        if (def) {
          unit.desc = def.desc;
          unit.keywords = [...(def.keywords || [])];
        }
        // ユニットが内包している接続クローンパネルもすべて最新化
        if (Array.isArray(unit.equipment)) unit.equipment.forEach(refreshCardObject);
      };

      // 1. 魔導板（メインボード）の全カードを最新化
      if (Array.isArray(G.mainBoard)) G.mainBoard.forEach(refreshCardObject);
      
      // 2. マップインベントリの全カードを最新化
      if (Array.isArray(G.inventory)) G.inventory.forEach(refreshCardObject);
      
      // 3. 戦闘中の味方ユニットと、それに連動するパッシブバフを再計算して最新化
      if (Array.isArray(G.allies)) {
        G.allies.forEach(u => {
          refreshUnitObject(u);
          if (u && u.hp > 0 && typeof _syncUnitPanelEffectsAfterMove === 'function') {
            _syncUnitPanelEffectsAfterMove(u); // ステータスやパッシブの再同期
          }
        });
      }
      
      // 4. 戦闘中の敵ユニットを最新化
      if (Array.isArray(G.enemies)) G.enemies.forEach(refreshUnitObject);

      // すべての上書きが完了したら、各画面のDOMを安全に一斉再描画
      if (typeof renderAll === 'function') renderAll();
      if (typeof renderRewCards === 'function') renderRewCards();
      if (typeof renderHandEditor === 'function') renderHandEditor();
      if (typeof renderFieldEditor === 'function') renderFieldEditor();
      
      console.log('[完全同期] すべての配備済みオブジェクトの能力を最新エクセルの状態へ置換しました。');
      
      if (b) {
        const pSuccess = document.createElement('p');
        pSuccess.className = 'good';
        pSuccess.style.fontWeight = '900';
        pSuccess.innerHTML = '✓ 最新のエクセル能力（表記・戦闘効果）を現在の盤面に直接ドッキングしました！';
        b.appendChild(pSuccess);
        b.scrollTop = b.scrollHeight;
      }
    } else {
      console.error('[完全同期] エクセルのスキャンに失敗しました。');
    }
  }
});
