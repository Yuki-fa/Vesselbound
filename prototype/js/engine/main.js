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
  // 街（村）専用画面のCSSスコープ。編成画面のボタン等の複製ルールがこのクラスに依存する。
  document.body.classList.toggle('village-screen-active',id==='village');
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
    // 音量は曲ごとにBGM_DEFAULT_VOLUMES（audio.js）で決める。ここで.32を渡すと
    // 戦闘BGMだけが他より小さくなるため、指定せず既定値に任せる。
    if(id==='title') _startTitleBgm();
    else if(id==='battle') playBgm(isMenuLike?'menu':(isBossBattle?'battle3':'battle1'),{fadeInMs:700});
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
  const displayLife=Math.max(0,Math.min(3,
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
    lifeEl.innerHTML=`<span class="life-empty">${'♡'.repeat(3-life)}</span><span class="life-full">${Array.from({length:life},()=>'<span class="life-heart">♥</span>').join('')}</span>`;
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
    // 3枠を常に保持し、減少分だけ輪郭（♡）にする。枠自体を減らすと残数に応じて
    // 文字位置が詰まり、編成画面と異なる位置に見えるため。
    battleLife.innerHTML=Array.from({length:3},(_,i)=>{
      const filled=i>=3-life;
      return `<span class="battle-life-heart ${filled?'battle-life-heart-filled':'battle-life-heart-empty'}">${filled?'♥':'♡'}</span>`;
    }).join('');
  }
  // 所持金・ターン枠（編成画面と同じ#reward-production-ui .reward-prod-bottom）は
  // マップ・戦闘画面でも常時表示するため、reward.js側の描画を待たずここでも更新する。
  if(typeof _syncMoneyTurnTile==='function') _syncMoneyTurnTile();
  if(typeof renderBattleCounters==='function') renderBattleCounters();
  if(G._debugMode){
    _positionDebugKillButton();
    _positionDebugMuteButton();
    _positionDebugFormationButton();
    if(typeof renderDebugRewardRerollButton==='function') renderDebugRewardRerollButton();
  }
}
// 味方キャラ名は水色、敵キャラ名はピンクで表示する（ログ本文中の名前を包む用）
function _lc(name,isEnemy){
  return name?`<span class="${isEnemy?'log-nm-enemy':'log-nm-ally'}">${name}</span>`:'';
}
// ログ履歴に場面の区切り（空行）を1本入れる
function logSceneBreak(){
  return;
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
  return;
  if(typeof G!=='undefined'&&(G._battlePhaseRunning||G.phase==='player'||G.phase==='enemy')) return;
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
  return;
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
// デバッグ用：どの画面からでも編成画面を開く。
function debugOpenFormation(){
  if(typeof G==='undefined'||!G||!G._debugMode) return;
  if(G._villageIntroPlaying||G._pendingPanelPlacement) return;
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
  const deploySlots=(typeof MAIN_BOARD_DEPLOY_SLOTS!=='undefined'?MAIN_BOARD_DEPLOY_SLOTS:[1,3,10,12,14])
    .filter(i=>i>=0&&i<G.mainBoard.length);
  const deploySlotSet=new Set(deploySlots);
  // 初期キャラクターは出撃パネル（MAIN_BOARD_DEPLOY_SLOTS）のいずれかにランダム配置する。
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
  golem.power=999; golem.life=999;
  golem.atk=999; golem.hp=999; golem.maxHp=999;
  golem._permBasePower=999; golem._permBaseLife=999;
  const deploySlots=(typeof MAIN_BOARD_DEPLOY_SLOTS!=='undefined'?MAIN_BOARD_DEPLOY_SLOTS:[1,3,10,12,14]);
  const slot=deploySlots.find(i=>i>=0&&i<G.mainBoard.length&&!G.mainBoard[i]);
  const fallback=G.mainBoard.findIndex(c=>!c);
  const idx=slot==null?fallback:slot;
  if(idx>=0) G.mainBoard[idx]=golem;
}

// Sceneごとの進行構成。表示側もこの定義を参照して進捗を生成する。
const SCENE_FLOW_DATA={
  standard:['battle','battle','elite','city','battle','battle','battle','battle','boss','altar'],
  final:['city','battle','elite','finalBoss'],
};

// Scene 1～4：通常戦×2→エリート→村→通常戦×4→ボス→祭壇。
// Scene 5：村→通常戦→エリート→ラスボス。
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
  G._waveDefeatReturnTo=G._isWaveAltar?'altar':(G._waveVillage?'village':'reward');
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
  if(!G._waveLoopEnabled) return false;
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
  if(!G._waveLoopEnabled||!G._waveBattleType) return false;
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
    // Scene 5のエリート勝利後は村を挟まずラスボスへ直行。
    if(wave===5){
      runTransition(()=>{
        G._mapBattle=null;
        G._waveBattleType=null;
        if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
        G.enemies=[]; G.phase=null;
        _startWaveBattle(4);
      });
      return true;
    }
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
  if(!G._waveLoopEnabled||!G._waveBattleType) return false;
  G._waveRetryEnemyKey=`${Number(G._wave)||1}:${Number(G._waveStage)||1}:${String(G._waveBattleType||'')}`;
  G._mapBattle=null; G._waveBattleType=null;
  G._waveLife=Math.max(0,(G._waveLife==null?3:Number(G._waveLife))-1);
  if(G._waveLife<=0){
    G._battleDefeatHandled=true;
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
function startGame(debugMode){
  // 前回のランのステージ持続環境音（雷雨など）を持ち越さない。
  if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(0);
  initState();
  G.runStats={
    startedAt:performance.now(), areaName:'', finalBattle:'', allyDeaths:0, enemyKills:0,
    maxDamage:{amount:0,type:''}, maxAtk:0, maxHp:0
  };
  _giveInitialRandomBoardCards();
  window.__vesselboundRetryRewards=null;
  clearLog();
  G._debugMode=!!debugMode;
  if(G._debugMode){
    _giveDebugGolem();
    G.gold=100000;
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='';
    const muteBtn=document.getElementById('battle-mute-btn');
    if(muteBtn) muteBtn.style.display='';
    const formBtn=document.getElementById('battle-formation-btn');
    if(formBtn) formBtn.style.display='';
    log('[DEBUG] デバッグモード：ソウル100000','sys');
    requestAnimationFrame(_positionDebugKillButton);
    requestAnimationFrame(()=>{ _positionDebugMuteButton(); _positionDebugFormationButton(); });
  } else {
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='none';
    const muteBtn=document.getElementById('battle-mute-btn');
    if(muteBtn) muteBtn.style.display='none';
    const formBtn=document.getElementById('battle-formation-btn');
    if(formBtn) formBtn.style.display='none';
  }
  G._waveLoopEnabled=true;
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
  G._waveLife=3;
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
  document.body.classList.remove('gameover-active','battle-victory-pending','right-card-peek');
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
  const isDebugGameOver=!!G._debugGameOver;
  // 通常の全滅では、結果画面を組み立てる前にライフ表示を必ず0へ確定する。
  if(!isDebugGameOver){
    G._waveLife=0;
    G.life=0;
    if(typeof updateHUD==='function') updateHUD();
  }
  try{
    if(typeof playFileSfx==='function'){ playFileSfx('assets/sfx/game_over.wav'); }
    else { const se=new Audio('assets/sfx/game_over.wav'); se.volume=.9; void se.play(); }
  }catch(_e){}
  document.body.classList.remove('battle-turn-active');
  if(typeof stopBgm==='function') stopBgm(900);
  // ステージ持続環境音（雷雨など）はstopBgm()では止まらないため、ゲームオーバーでは明示的に落とす。
  if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(900);
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
  G._gameOverSpecialDebug=isDebugGameOver;
  G._debugGameOver=false;
  if(typeof renderGameOverBoard==='function') renderGameOverBoard();
  document.getElementById('go-area').textContent=G.runStats.areaName;
  document.getElementById('go-final').textContent=G.runStats.finalBattle||'—';
  document.getElementById('go-time').textContent=G.runStats.playTime||'0 : 00';
  _animateGameOverNumber('go-allyDeaths',G.runStats.allyDeaths,600,undefined,800);
  _animateGameOverNumber('go-enemyKills',G.runStats.enemyKills,600,undefined,900);
  _animateGameOverNumber('go-damage',G.runStats.maxDamage?.amount,700,n=>`${Math.floor(n)} ダメージ${G.runStats.maxDamage?.type?`（${G.runStats.maxDamage.type}）`:''}`,1000);
  _animateGameOverPair('go-stats',G.runStats.maxAtk,G.runStats.maxHp,700,1100);
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
  const go=document.getElementById('go-sub'); if(go) go.textContent=`${G.floor}階で力尽きました`;
  G.phase='gameover';
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
        video.defaultPlaybackRate=.7;
        if(Math.abs(video.playbackRate-.7)>.001) video.playbackRate=.7;
      };
      if(video._gameOverRateGuard){
        video.removeEventListener('playing',video._gameOverRateGuard);
        video.removeEventListener('ratechange',video._gameOverRateGuard);
      }
      video._gameOverRateGuard=applyGameOverRate;
      video.addEventListener('playing',applyGameOverRate);
      video.addEventListener('ratechange',applyGameOverRate);
      applyGameOverRate();
      if(video.readyState<1) video.addEventListener('loadedmetadata',applyGameOverRate,{once:true});
      const playResult=video.play();
      if(playResult&&typeof playResult.then==='function') void playResult.then(applyGameOverRate).catch(()=>{});
    }catch(_e){}
    // CSSのdisplay/visibility切替と同時でも確実に0→1を描画するため、動画自身を直接アニメーションする。
    void video.getBoundingClientRect();
    video._gameOverFadeFrame=requestAnimationFrame(()=>{
      if(typeof video.animate==='function'){
        video._gameOverFadeAnimation=video.animate(
          [{opacity:0},{opacity:1}],
          {duration:1200,easing:'ease-out',fill:'forwards'}
        );
        if(tint) tint._gameOverTintAnimation=tint.animate(
          [{opacity:0},{opacity:.78}],
          {duration:1200,easing:'ease-out',fill:'forwards'}
        );
      }else{
        video.style.removeProperty('opacity');
        video.classList.add('is-visible');
        if(tint) tint.style.opacity='.78';
      }
    });
  }
}
// onShown：オーバーレイが実際に表示された後、指定ms後に呼ばれるコールバック（省略可）。
// 呼び出し側で独立したsetTimeoutを組むと、renderAll()等の重い同期処理でメインスレッドが
// 詰まった際に「表示」と「非表示」のタイマーがほぼ同時に発火し、一瞬で消えてしまう競合が起きるため、
// 表示が確定してから逆算する形でチェーンする。
function _armBattleContinue(cutin,onShown){
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
}
function continueAfterBattleVictory(){
  if(typeof G==='undefined'||!G||G._battleProceedBusy) return;
  const action=G._battleProceedAction;
  if(typeof action!=='function') return;
  G._battleProceedBusy=true;
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
  if(typeof stopBgm==='function') stopBgm(700);
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
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
  // 注：onBattleEnd()が_panelSummonedユニット（＝現行仕様の全味方）をG.alliesから除去済みのため、
  // ここでの味方生存チェックは常にtrueとなり誤って早期returnしてしまう。勝利可否は呼び出し元で判定済み。
  // 「You Win」表示と同時に浮遊ログのフェードを加速し、画面遷移までに確実に消しきる
  if(typeof _fastForwardLogFx==='function') _fastForwardLogFx();
  setTimeout(()=>{
    if(G._battleDefeatHandled||G.phase!=='reward') return;
    const isWithdraw=!!G._waveWithdraw;
    if(!isWithdraw&&typeof playSfx==='function') playSfx(G._bossJustDefeated?'bossVictory':'victory',{group:'ui'});
    const cutin=(typeof showBattleCutin==='function')
      ? showBattleCutin(isWithdraw?'retreat':'victory',{durationMs:Math.max(1500,Number(shownDuration)||1800)})
      : Promise.resolve();
    Promise.resolve(cutin).then(overlay=>{
      // 勝利・撤退とも、結果表示を保持したまま「進む」入力を待つ。
      _armBattleContinue(overlay,onShown);
    });
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
  const move=btn=>{ back.style.top=`${btn.offsetTop+12}px`; };
  const items=menu.querySelectorAll('.title-menu-item,#title-debug-button');
  items.forEach(btn=>btn.addEventListener('pointerenter',()=>move(btn)));
  if(items[0]) move(items[0]);
}
function _finishStartupIntro(){
  if(_startupIntroSkipped) return;
  _startupIntroSkipped=true;
  _startupIntroTimerIds.forEach(id=>clearTimeout(id));
  _startupIntroTimerIds=[];
  const loading=document.getElementById('scr-loading');
  const title=document.getElementById('scr-title');
  if(!title) return;
  title.classList.add('active','startup-title','startup-title-visible');
  _startTitleBgm();
  if(typeof setScreenAssetBackground==='function') setScreenAssetBackground('title','title');
  if(loading) loading.classList.add('startup-brand-out');
  window.setTimeout(()=>loading&&loading.classList.remove('active'),800);
  window.removeEventListener('pointerdown',_skipStartupIntro,true);
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
  _startupIntroTimerIds.push(setTimeout(()=>title.classList.add('startup-menu-ready'),1250));
  _startTitleBgm();
  if(typeof setScreenAssetBackground==='function') setScreenAssetBackground('title','title');
  if(loading) loading.classList.add('startup-brand-out');
  window.setTimeout(()=>loading&&loading.classList.remove('active'),800);
  window.removeEventListener('pointerdown',_skipStartupIntro,true);
}
function returnToTapStart(){
  const title=document.getElementById('scr-title');
  if(!title) return;
  _startupIntroTimerIds.forEach(id=>clearTimeout(id));
  _startupIntroTimerIds=[];
  _startupIntroSkipped=false;
  title.classList.remove('startup-menu-visible','startup-menu-ready');
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
  window.addEventListener('pointerdown',_skipStartupIntro,true);
  _startupIntroTimerIds.push(setTimeout(()=>{
    title.classList.add('active','startup-title-visible');
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
        // スペルカードの場合
        if (card.category === 'スペル' || card.type === 'spell' || card.kind === 'spell') {
          const def = (typeof SPELL_POOL !== 'undefined' ? SPELL_POOL : []).find(p => p.id === card.id || p.name === card.name);
          if (def) { card.desc = def.desc; card.manaCost = def.manaCost; }
          return;
        }
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
