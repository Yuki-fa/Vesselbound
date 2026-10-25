// battle_intro.js — 戦闘導入・カットイン・台詞・開戦前の画面準備
// 2026-10-25 リファクタリング：battle.js から移した（処理は変えていない）。

// ── 戦闘開始 ──────────────────────────────────

// 戦闘カットインのタイトル（固有名）。「地域情報」シートの
// 「街までの名前」（街より前のstage1〜4）／「塔までの名前」（街より後のstage5〜）を使う。
// シートに名前が無い場合は従来の「戦 闘 開 始」にフォールバックする。
function _waveBattleRouteName(){
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(G._wave):null;
  if(!info) return '';
  const stage=Number(G._waveStage)||1;
  // 街を過ぎていれば「塔までの名前」、それ以前は「街までの名前」。
  // 街のstage番号はwaveごとに違う（wave1は5、wave2〜4は4、wave5は1が街）ため、
  // stage番号の決め打ちではなくルートから街の位置を引いて判定する。
  // ※以前は stage>=5 固定で、街が先頭にあるwave5だけ判定が反転していた
  //   （フォルセティ出発後に「塔までの名前」ではなく「街までの名前」を拾っていた）。
  const afterCity=typeof waveStageIsAfterCity==='function'
    ?waveStageIsAfterCity(G._wave,stage)
    :stage>=5;
  const primary=afterCity?info.toTowerName:info.toTownName;
  const fallback=afterCity?info.toTownName:info.toTowerName;
  return String(primary||fallback||'').trim();
}
function _battleIntroText(key,fallback){
  return typeof textMessage==='function'?textMessage(key,fallback):fallback;
}
// カットインの大見出し（戦闘開始・再戦）は一文字ずつ空けて見せる（「戦 闘 開 始」）。
// 文言はシートのまま（空白なし）で、表示の時だけ字間を空ける。既に空白を含む文言はそのまま。
function _battleIntroTitle(key,fallback){
  const text=String(_battleIntroText(key,fallback)||'');
  return /\s/.test(text)?text:Array.from(text).join(' ');
}
function _battleStartIntroText(){
  if(G&&G._libraryTestBattleMode) return {
    title:_battleIntroTitle('「戦闘開始」ボタン','戦 闘 開 始'),
    subtitle:_battleIntroText('「試験戦闘」ボタン','試験戦闘'),
    kind:'normal'
  };
  if(G&&G._arenaActive){
    const round=Math.max(1,Math.min(6,Number(G._arenaRound)||1));
    const kind=typeof arenaRoundKind==='function'?arenaRoundKind(round):(round===6?'boss':'elite');
    const subtitle=typeof textMessage==='function'?textMessage('街「闘技場」ボタン','闘技場'):'闘技場';
    const title=G._waveIsRetry
      ?_battleIntroTitle('「再戦」ボタン','再 戦')
      :_battleIntroTitle('「戦闘開始」ボタン','戦 闘 開 始');
    return {title,subtitle:String(subtitle||'闘技場').trim()||'闘技場',kind};
  }
  const mapBattle=G._mapBattle||null;
  const kind=String(G._waveBattleType||mapBattle?.type||'');
  const isBoss=kind==='boss'||_isBossFight||!!mapBattle?.forcedBoss;
  const isElite=kind==='elite'||!!G._isEliteFight;
  // 大きい文字（タイトル）は戦闘種別に関わらず「戦 闘 開 始」で統一し、
  // 小さい文字（サブタイトル）に道中の固有名を出す。
  const routeName=_waveBattleRouteName();
  // 同じ戦闘への再挑戦は「再 戦」と出す（判定は main.js の _waveRetryPending()）。
  const title=G&&G._waveIsRetry
    ?_battleIntroTitle('「再戦」ボタン','再 戦')
    :_battleIntroTitle('「戦闘開始」ボタン','戦 闘 開 始');
  if(isBoss) return {title,subtitle:routeName,kind:'boss'};
  if(isElite) return {title,subtitle:routeName,kind:'elite'};
  return {title,subtitle:routeName,kind:'normal'};
}

function _battleCutinHost(){
  return document.getElementById('scr-battle');
}

function _showBattleEndFade(){
  if(typeof stopBattleLabFx==='function') stopBattleLabFx({suspendStates:true});
  if(typeof stopAllKeywordEffectVfx==='function') stopAllKeywordEffectVfx();
  const el=document.getElementById('battle-end-fade');
  if(!el) return;
  el.style.display='block';
  el.style.visibility='visible';
  el.classList.remove('is-visible');
  void el.offsetWidth;
  el.classList.add('is-visible');
}

function _fadeBattleLife(){
  // 試験戦闘は練習用でライフを失わないため、演出もSEも出さない。
  if(G&&G._testBattleMode) return;
  // **対象は「いま失われた枠」＝一番右の空き枠。**
  // ライフは先に減算されて描き直されるため、「最初の点灯している枠」を掴むと
  // 1つ右へずれ、空いた左端と合わせて2つ消えたように見える。
  const _lostHeart=host=>{
    const empties=host?host.querySelectorAll('.battle-life-heart-empty'):null;
    if(empties&&empties.length) return empties[empties.length-1];
    // まだ減算されていない場合は、これから失う枠（左端の点灯）を使う。
    return host?host.querySelector('.battle-life-heart-filled'):null;
  };
  const life=_lostHeart(document.getElementById('battle-life-value'));
  if(life) life.classList.add('life-lost-cutin');
  try{
    const src=(typeof Assets!=='undefined'&&Assets.sfx&&Assets.sfx.lifeLost)||'assets/sfx/life_lost.wav';
    if(typeof playFileSfx==='function') playFileSfx(src);
    else { const audio=new Audio(src); audio.volume=sfxFallbackVolume(.8); audio.play().catch(()=>{}); }
  }catch(e){}
}

// ── 戦闘背景のフォーカス（寄り）────────────────────────────
// **寄せるのは背景だけ。** UI・キャラクターの大きさは変えない
// （背景レイヤー #scr-battle::before の transform だけを動かす）。
// 画面振動で縁に画面外が出ないようにするのは別の仕組み
// （振動している間だけ画面をわずかに広げる：triggerBattleScreenShake）。
const BATTLE_FOCUS_SCALE=1.06;    // 背景の寄せ。1で無効
// 寄せ切るまでの時間。**通常戦闘と同じ速さにする**（短くすると急に寄って見える）。
const BATTLE_FOCUS_MS=2500;
// エリート／ボスの背景の下移動。**最初から非常にゆっくり動いていて、
// 「戦闘開始」の前後から加速する。** 初速は0にしない（止まって見えるため）。
const BATTLE_DESCENT_EASING='cubic-bezier(.6,.03,.5,1)';
let _battleIntroDescent=null;
function stopBattleIntroDescent(){
  if(_battleIntroDescent){ try{ _battleIntroDescent.cancel(); }catch(e){} _battleIntroDescent=null; }
}
// 背景を上端から下端まで、ひと続きで下ろす。**開始と同時に動き出す。**
function playBattleIntroDescent(totalMs){
  const host=document.getElementById('scr-battle');
  if(!host||typeof host.animate!=='function') return null;
  stopBattleIntroDescent();
  try{
    _battleIntroDescent=host.animate(
      [{backgroundPosition:'50% 0%'},{backgroundPosition:'50% 100%'}],
      {duration:Math.max(1,Number(totalMs)||0),pseudoElement:'::before',
       fill:'forwards',easing:BATTLE_DESCENT_EASING});
  }catch(e){ _battleIntroDescent=null; }
  return _battleIntroDescent;
}

// フォーカスを外す（戦闘開始前・戦闘終了後）。**残すと次の画面まで寄ったままになる。**
function clearBattleFocus(){
  const root=document.documentElement;
  root.style.removeProperty('--battle-bg-focus');
  root.style.removeProperty('--battle-bg-focus-ms');
  if(typeof stopBattleIntroDescent==='function') stopBattleIntroDescent();
}
// 背景を寄せる。durationMs=0 なら即座に（アニメーションなし）。
// 待たずに戻るので、寄せ切るのを待ちたい場合は呼び出し側で sleep する。
// 戻り値は寄せ切るまでのms。
function focusBattleBackground(scale,durationMs){
  const root=document.documentElement;
  const f=Math.max(1,Number(scale==null?BATTLE_FOCUS_SCALE:scale)||1);
  const ms=Math.max(0,Number(durationMs)||0);
  root.style.setProperty('--battle-bg-focus-ms',`${ms}ms`);
  // 変数を変えるだけでは transition の起点が確定しないことがあるので、
  // 背景レイヤーを一度読み直してから値を入れる。
  const host=document.getElementById('scr-battle');
  if(host) void host.offsetWidth;
  root.style.setProperty('--battle-bg-focus',String(f));
  return ms;
}

// **画面を出す前の下準備。** showScreen('battle') より前に呼ぶこと。
// kindHint：これから始める戦闘の種別（'normal'/'elite'/'boss'）。
// **必ず渡すこと。** 呼ばれるのは G._waveBattleType を書き込む前なので、
// 省略すると**前の戦闘の種別**で判定してしまう。
//   通常戦闘：画面が出る前に暗転しておく（出てから黒を被せると一瞬前の画面が見える）。
//   エリート／ボス：**寄せない**（寄せるのは背景が下端まで移動し切ってから）。
function prepareBattleIntroFocus(kindHint){
  const host=document.getElementById('scr-battle');
  if(!host) return;
  clearBattleFocus();
  if(typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()){
    // ラスボスは movie3 からの流れを切らないため、寄りだけ即座に当てる。
    focusBattleBackground(BATTLE_FOCUS_SCALE,0);
    return;
  }
  const info=typeof _battleStartIntroText==='function'?_battleStartIntroText():null;
  const kind=kindHint||(info&&info.kind);
  if((kind!=='elite'&&kind!=='boss')||(G&&G._waveIsRetry)){
    const fade=document.getElementById('battle-transition-fade');
    if(fade){ fade.style.transition='none'; fade.classList.add('is-visible'); void fade.offsetWidth; }
    return;
  }
  host.classList.remove('battle-bg-normal','battle-bg-scroll-ready','battle-bg-scrolling');
  host.classList.add('battle-bg-reveal');
}

// ── 通常戦闘の入り：画面全体をフェードイン ────────────────────
// 黒幕（#battle-transition-fade）を不透明で置いてから外す。
// **effect.webp は使わない**（利用者指定）。
const BATTLE_START_FADE_IN_MS=700;   // CSSの transition と合わせる
function _fadeInBattleScreen(){
  const fade=document.getElementById('battle-transition-fade');
  if(!fade) return Promise.resolve();
  fade.style.transition='none';
  fade.classList.add('is-visible');
  void fade.offsetWidth;
  fade.style.transition='';
  fade.classList.remove('is-visible');
  return sleep(BATTLE_START_FADE_IN_MS);
}

// ── 大ダメージの衝撃（hit_impact.webm）──────────────────────
// 画面振動と同時に短くフェードイン／フェードアウトする。**尺はここで調整する。**
const BATTLE_HIT_IMPACT_SRC='assets/vfx/hit_impact.webm';
const BATTLE_HIT_IMPACT_IN_MS=90;     // フェードイン
const BATTLE_HIT_IMPACT_HOLD_MS=140;  // 出したままにする時間
const BATTLE_HIT_IMPACT_OUT_MS=260;   // フェードアウト
let _battleHitImpactTimer=null;
function playBattleHitImpact(){
  const host=document.getElementById('scr-battle');
  if(!host||!host.classList.contains('active')) return;
  // **毎回作り直す。** 使い回すと、再生し終えた video の巻き戻しに失敗して
  // 2回目以降だけ絵が出なくなる。
  const old=document.getElementById('battle-hit-impact');
  if(old) old.remove();
  if(_battleHitImpactTimer!=null){ clearTimeout(_battleHitImpactTimer); _battleHitImpactTimer=null; }
  const box=document.createElement('div');
  box.id='battle-hit-impact';
  box.setAttribute('aria-hidden','true');
  box.style.transition=`opacity ${BATTLE_HIT_IMPACT_IN_MS}ms ease-out`;
  const video=document.createElement('video');
  video.src=BATTLE_HIT_IMPACT_SRC;
  video.muted=true; video.playsInline=true; video.autoplay=true; video.preload='auto';
  video.setAttribute('muted',''); video.setAttribute('playsinline',''); video.setAttribute('autoplay','');
  video.playbackRate=Math.max(.25,Math.min(16,
    typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1));
  box.appendChild(video);
  host.appendChild(box);
  void box.offsetWidth;
  box.classList.add('is-visible');
  try{ const played=video.play(); if(played&&played.catch) played.catch(()=>{}); }catch(e){}
  _battleHitImpactTimer=battlePresentationSetTimeout(()=>{
    box.style.transition=`opacity ${BATTLE_HIT_IMPACT_OUT_MS}ms ease-in`;
    box.classList.remove('is-visible');
    _battleHitImpactTimer=battlePresentationSetTimeout(()=>{
      _battleHitImpactTimer=null;
      box.remove();
    },BATTLE_HIT_IMPACT_OUT_MS);
  },BATTLE_HIT_IMPACT_IN_MS+BATTLE_HIT_IMPACT_HOLD_MS);
}

// 開始・結果カットイン（#battle-start-intro）の有無と種類を body のクラスへ映す。
// CSS で body:has(#battle-start-intro…) と書くと、演出用の要素を出し入れするたびに Chrome が body 以下を丸ごと
// スタイル再計算し、マナ効果が続く盤面で処理落ちした（2026-10-20 利用者報告・トレースで確認）。消し方が各所にあるので、DOMの変化を見て揃える。
function _syncBattleCutinBodyClasses(){
  const body=document.body;if(!body) return;
  const intro=document.getElementById('battle-start-intro');
  const set=(name,on)=>{ if(body.classList.contains(name)!==on) body.classList.toggle(name,on); };
  set('battle-intro-present',!!intro);
  set('battle-intro-victory',!!(intro&&intro.classList.contains('cutin-victory')));
  set('battle-intro-retreat',!!(intro&&intro.classList.contains('cutin-retreat')));
}
if(typeof MutationObserver==='function'&&typeof document!=='undefined'&&document.body){
  new MutationObserver(_syncBattleCutinBodyClasses).observe(document.body,{childList:true,subtree:true});
}
// start は _playBattleStartIntro が背景スクロールと退場タイミングを管理する。
function showBattleCutin(type='start',options={}){
  const host=_battleCutinHost();
  if(!host) return Promise.resolve(null);
  // defeat：オンラインの敗北。見せ方は撤退と同じで、文字だけ「敗 北」にする。
  const mode=['start','victory','retreat','defeat'].includes(type)?type:'start';
  // 結果表示（勝利・撤退・敗北）は同じ扱い。分岐を書き足す時はここを1箇所で見ること。
  const isResult=mode==='victory'||mode==='retreat'||mode==='defeat';
  const old=document.getElementById('battle-start-intro');
  if(old) old.remove();
  const info=options.info||_battleStartIntroText();
  const resultText=(key,fallback)=>{
    const raw=typeof textMessage==='function'?textMessage(key,fallback):fallback;
    return Array.from(String(raw||fallback).replace(/\s+/g,'')).join(' ');
  };
  const title=mode==='victory'?resultText('戦闘結果「勝利」','勝利')
    :mode==='retreat'?resultText('戦闘結果「撤退」','撤退')
    :mode==='defeat'?resultText(options.resultKey||'戦闘結果「敗北」','敗北')
    :(String(options.title||info.title||'').trim()||_battleIntroTitle('「戦闘開始」ボタン','戦 闘 開 始'));
  // 結果画面でも開始画面と同じ高さを確保する。空文字だけでは行ボックスが
  // 縮み、タイトルとラインが上へ再配置されるため、不可視の空白を残す。
  const subtitle=isResult?'\u00a0':(String(info.subtitle||'').trim()||'\u00a0');
  const overlay=document.createElement('div');
  overlay.id='battle-start-intro';
  // 敗北は撤退と同じ装いにする（文字だけ違う）。
  overlay.className=`battle-start-intro cutin-${mode==='defeat'?'retreat':mode} battle-start-${info.kind||'normal'}`;
  overlay.innerHTML=`<div class="battle-start-aura"></div><div class="battle-cut-in-particles" aria-hidden="true"></div><img class="battle-start-line" src="assets/ui/main_line.svg" alt=""><span class="battle-start-icon-wrap"><img class="battle-start-icon" src="assets/ui/main_icon.svg" alt=""></span><div class="battle-start-title">${_escapePreviewHtml(title)}</div><div class="battle-start-subtitle">${_escapePreviewHtml(options.subtitle||((mode==='start')?(String(info.subtitle||'').trim()||'\u00a0'):subtitle))}</div>`;
  host.appendChild(overlay);
  if(mode==='start') return overlay;
  // 勝利・撤退の結果表示中は、戦場カードを操作・ホバーできないようにする。
  // 勝利時はfinishBattleAsVictory()で既に付与済みだが、撤退時も同じロックを使う。
  document.body.classList.add('battle-victory-pending');
  // 行動表示は終戦ですぐには消さず、結果表示の間にゆっくり消して「進む」が出る時には消え終わっている
  // （2026-10-07 利用者指定）。オンラインの結果表示も同じ。フェード（400ms）と余裕100msぶん前に消し始める。
  if(typeof actionBannerHold==='function') actionBannerHold();
  if(isResult&&typeof actionBannerReleaseHold==='function'){
    const fadeMs=(typeof ACTION_BANNER_CONFIG!=='undefined'&&ACTION_BANNER_CONFIG.fadeOutMs)||400;
    battlePresentationSetTimeout(actionBannerReleaseHold,Math.max(0,Math.max(1500,Number(options.durationMs)||2200)+240-fadeMs-100));
  }
  // **寄りはここでは戻さない。** 戻すのは完全に暗転して文字も消えた後
  // （main.js の戦闘後遷移）。明るいうちに戻すと画面が引くのが見える。
  _showBattleEndFade();
  if(typeof stopBgm==='function'&&!(G&&G._libraryTestBattleMode)) stopBgm(700);
  // 敗北（オンライン）も撤退と同じくライフを失う演出・SEを出す。
  if((mode==='retreat'||mode==='defeat')&&!options.skipLifeFx) battlePresentationSetTimeout(_fadeBattleLife,520);
  return new Promise(resolve=>{
    // 勝利は表示位置を保持したまま待機する。退場アニメーションを挟むと
    // 「勝利」が一度消え、flex再配置によってラインと本文も移動してしまう。
    if(!isResult){
      battlePresentationSetTimeout(()=>overlay.classList.add('battle-start-closing'),Math.max(900,Number(options.holdMs)||1200));
    }
    battlePresentationSetTimeout(()=>{
      const fade=document.getElementById('battle-end-fade');
      if(fade && isResult){
        // 結果表示後は背景を保持した暗転状態で停止する。進むボタン押下時だけ
        // battle-transition-fade を使って完全に暗転し、次画面へ遷移する。
        battlePresentationSetTimeout(()=>{
          overlay.classList.remove('battle-start-closing');
          overlay.classList.add('awaiting-continue');
          if(typeof actionBannerReleaseHold==='function') actionBannerReleaseHold();
          resolve(overlay);
        },240);
      }else if(fade){
        fade.classList.add('is-final');
        battlePresentationSetTimeout(()=>{
          fade.classList.remove('is-visible','is-final');
          fade.removeAttribute('style');
          overlay.remove();
          if(typeof actionBannerReleaseHold==='function') actionBannerReleaseHold();
          resolve(null);
        },360);
      } else if(isResult){
        overlay.classList.remove('battle-start-closing');
        overlay.classList.add('awaiting-continue');
        if(typeof actionBannerReleaseHold==='function') actionBannerReleaseHold();
        resolve(overlay);
      } else { overlay.remove(); if(typeof actionBannerReleaseHold==='function') actionBannerReleaseHold(); resolve(null); }
    },Math.max(1500,Number(options.durationMs)||2200));
  });
}

// infoOverride：カットインの文言を呼び出し側で指定する（省略時は従来どおり戦闘種別から作る）。
// 続きの戦闘（闘技場の2戦目以降・魔獣撃退依頼で魔狼に挑む）か。
// 味方は場に居たままで、開幕の文字・背景の動き・暗転・味方の登場を行わず、敵の登場だけを見せる。
function _battleCarryOpening(){
  return !!(G&&G._arenaActive&&Number(G._arenaRound)>1)
    ||!!(typeof questBattleCarryActive==='function'&&questBattleCarryActive());
}
const ARENA_WAVE_INTRO_FADE_IN_MS=400;
const ARENA_WAVE_INTRO_HOLD_MS=900;
const ARENA_WAVE_INTRO_FADE_OUT_MS=500;
async function _showArenaWaveIntro(){
  if(!G||!G._arenaActive) return;
  const host=document.getElementById('scr-battle');
  if(!host) return;
  const old=document.getElementById('arena-wave-intro');
  if(old) old.remove();
  const total=typeof ARENA_ROUND_COUNT==='number'?ARENA_ROUND_COUNT:6;
  const round=Math.max(1,Math.min(total,Number(G._arenaRound)||1));
  const overlay=document.createElement('div');
  overlay.id='arena-wave-intro';
  overlay.setAttribute('aria-hidden','true');
  const title=document.createElement('div');
  title.className='battle-start-title';
  title.textContent=`WAVE ${round}/${total}`;
  overlay.appendChild(title);
  host.appendChild(overlay);
  const animateOpacity=(from,to,duration,easing)=>{
    if(typeof overlay.animate==='function'){
      try{
        return overlay.animate([{opacity:from},{opacity:to}],
          {duration,easing,fill:'forwards'});
      }catch(_e){}
    }
    const speed=typeof getBattlePresentationSpeedScale==='function'
      ?getBattlePresentationSpeedScale():1;
    overlay.style.transition=`opacity ${Math.max(1,duration/speed)}ms ${easing}`;
    overlay.style.opacity=String(to);
    return null;
  };
  animateOpacity(0,1,ARENA_WAVE_INTRO_FADE_IN_MS,'ease-out');
  await sleep(ARENA_WAVE_INTRO_FADE_IN_MS);
  if(!overlay.isConnected) return;
  await sleep(ARENA_WAVE_INTRO_HOLD_MS);
  if(!overlay.isConnected) return;
  animateOpacity(1,0,ARENA_WAVE_INTRO_FADE_OUT_MS,'ease-in');
  await sleep(ARENA_WAVE_INTRO_FADE_OUT_MS);
  if(overlay.isConnected) overlay.remove();
}
function _playBattleStartIntro(infoOverride){
  const host=document.getElementById('scr-battle');
  if(!host) return Promise.resolve();
  const info=infoOverride||_battleStartIntroText();
  // 闘技場の2戦目以降は、現在の背景・カメラ位置を保ったまま、敵の出現だけを行う。
  // battle-opening-pending はカードを隠すために使うが、背景クラスとフォーカスは触らない。
  // 魔獣撃退依頼（Q004）で魔狼に挑んだ続きの戦闘も同じ（戦闘開始の文字を出さない）。
  const arenaCarryIntro=_battleCarryOpening();
  if(arenaCarryIntro){
    // 味方は前の戦闘から場に居たまま。開幕の「全員隠す」から味方だけ外す（index.html の battle-carry-allies）。
    host.classList.add('battle-carry-allies');
    // 続きの戦闘は暗転しない。前の準備で黒幕が残っていたら外す（残ると画面が真っ暗のまま）。
    const carryFade=document.getElementById('battle-transition-fade');
    if(carryFade&&carryFade.classList.contains('is-visible')){ carryFade.style.transition=''; carryFade.classList.remove('is-visible'); }
    host.classList.remove('battle-start-units-collapsed','battle-start-units-revealing','battle-opening-active');
    host.classList.add('battle-opening-pending');
    void host.offsetWidth;
    const oldCarry=document.getElementById('battle-start-intro');
    if(oldCarry) oldCarry.remove();
    return Promise.resolve(info.kind);
  }
  const endFade=document.getElementById('battle-end-fade');
  if(endFade){ endFade.classList.remove('is-visible','is-final'); endFade.removeAttribute('style'); }
  host.classList.remove('battle-bg-normal','battle-bg-reveal','battle-bg-scroll-ready','battle-bg-scrolling','battle-start-units-collapsed','battle-start-units-revealing','battle-opening-active');
  // 前の戦闘の寄せは必ず外してから始める。
  clearBattleFocus();
  host.classList.add('battle-opening-pending');
  void host.offsetWidth;
  const old=document.getElementById('battle-start-intro');
  if(old) old.remove();
  // ラスボス戦は戦闘開始演出（カットイン・背景スクロール）を行わない。
  // movie3 → last_battle.webm のフェードインから途切れずに戦闘へ入るため。
  if(typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()){
    host.classList.add('battle-bg-reveal');
    // ラスボスは movie3 からの流れを切らないため、寄りだけ即座に当てる。
    focusBattleBackground(BATTLE_FOCUS_SCALE,0);
    return Promise.resolve('boss');
  }
  // 再戦では背景移動をしない（通常戦闘と同じ入り方）。判定は main.js の _waveRetryPending()。
  const needsScroll=(info.kind==='elite'||info.kind==='boss')&&!(G&&G._waveIsRetry);
  host.classList.add(needsScroll?'battle-bg-reveal':'battle-bg-normal');
  // ── 入り方（利用者指定の順番）─────────────────────────────
  //   通常戦闘：暗転から画面全体を明るくしながら少しずつ寄せる → 戦闘開始表示 → キャラ登場
  //   エリート／ボス：**寄りなし**で、最初から非常にゆっくり下へ動き続ける
  //                   →「戦闘開始」の前後から加速 → 下端に着いたらそのまま寄せる
  //                   → キャラ登場（寄せは続いたまま）
  // **effect.webp は使わない。**
  const CUTIN_HOLD_MS=1800;   // 戦闘開始表示を見せる時間
  const BG_SCROLL_MS=3000;    // 「戦闘開始」の後、下端に着くまで
  const CUTIN_CLOSE_MS=360;
  return (async()=>{
    if(needsScroll){
      // 通常戦闘用の暗転が残っていたら必ず外す（残ると画面が黒いままになる）。
      const preFade=document.getElementById('battle-transition-fade');
      if(preFade){ preFade.style.transition='none'; preFade.classList.remove('is-visible'); void preFade.offsetWidth; preFade.style.transition=''; }
      // **画面が出た瞬間から下へ動き始める。** 緩急は BATTLE_DESCENT_EASING が持つ。
      playBattleIntroDescent(CUTIN_HOLD_MS+BG_SCROLL_MS);
    }else{
      // 通常戦闘は暗転から画面全体を明るくしながら、**最初から少しずつ**寄せていく。
      focusBattleBackground(BATTLE_FOCUS_SCALE,BATTLE_START_FADE_IN_MS+CUTIN_HOLD_MS);
      await _fadeInBattleScreen();
    }
    const overlay=showBattleCutin('start',{info});
    await sleep(CUTIN_HOLD_MS);
    if(needsScroll){
      await sleep(BG_SCROLL_MS);
      // **下端まで着いたら、そのまま寄せる。** 通常戦闘と同じ速さで寄せる。
      // ここで寄せ切るのを待たない（待つとキャラの登場が遅れて間が空く）。
      host.classList.add('battle-bg-scrolling');   // 到達後の静止位置を確定させる
      focusBattleBackground(BATTLE_FOCUS_SCALE,BATTLE_FOCUS_MS);
    }
    overlay.classList.add('battle-start-closing');
    await sleep(CUTIN_CLOSE_MS);
    overlay.remove();
    return info.kind;
  })();
}

// 開戦演出中は編成画面の右クリック覗き見を受け付けない。
// ここでright-card-peekが切り替わると、演出中のカードにも透明化CSSが適用され、
// 演出終了時の再描画までカードが消えたように見える。
if(!window._battleOpeningContextMenuGuardBound){
  window._battleOpeningContextMenuGuardBound=true;
  const isOpening=()=>{
    const host=document.getElementById('scr-battle');
    return !!(host&&(
      host.classList.contains('battle-opening-pending')||
      host.classList.contains('battle-opening-active')||
      document.getElementById('battle-start-intro')
    ));
  };
  // 開戦演出中もオプション（およびデバッグ時のミュート）は操作可能にする。
  // **オプション画面の中（#options-layer）と閉じるボタン（#options-close-proxy）も除外すること。**
  // オプションボタンだけ除外していた頃は、開いたオプション画面のクリックがすべて握りつぶされ、閉じられなくなっていた。
  const passThrough='#battle-options-btn,#battle-mute-btn,#options-layer,#options-close-proxy';
  document.addEventListener('contextmenu',e=>{
    if(e.target&&e.target.closest&&e.target.closest(passThrough)) return;
    if(!isOpening()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
  document.addEventListener('click',e=>{
    // 場面外クリックでreward.jsの再描画処理が走ると、開戦演出中のカードが消えるため止める。
    if(e.target&&e.target.closest&&e.target.closest(passThrough)) return;
    if(!isOpening()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
}

// マナの数字を出しているのは**戦闘中は #battle-mana-value（renderBattleCounters）**で、
// renderManaHud() は戦闘画面では非表示にして即 return する。
// マナが動いたら必ずこちらも呼ぶこと。片方だけだと戦闘中の数字が止まったままになる。
// 画面に出ているマナの値。**増えた時だけ**SEを鳴らすために覚えておく。
let _shownManaForSfx=null;
function _refreshManaDisplays(){
  const cur=Math.max(0,Number(typeof G!=='undefined'&&G?G.mana:0)||0);
  // マナ増加のSE（特殊演出シート S004）は鳴らさない（2026-10-15 利用者指定「マナ獲得時にSEを鳴らすのをやめます」）。
  // VFX（マナの結晶）は従来どおり出す。PvE・オンライン共通の唯一の入口なのでここで止める。
  _shownManaForSfx=cur;
  if(typeof renderManaHud==='function') renderManaHud();
  if(typeof renderBattleCounters==='function') renderBattleCounters();
}

function renderBattleCounters(){
  const root=document.getElementById('battle-counters');
  if(!root) return;
  const active=!!(G&&(G.phase==='battle'||G.phase==='player'||G.phase==='enemy'||G._battleVictoryPending||G._waveWithdraw));
  root.style.display=active?'flex':'none';
  const status=document.getElementById('battle-status-hud');
  if(status) status.style.display=active?'flex':'none';
  if(!active) return;
  const mana=typeof _ensureMana==='function'?Number(_ensureMana()) : 0;
  const manaEl=document.getElementById('battle-mana-value');
  if(manaEl) manaEl.textContent=String(Math.max(0,mana));
  const sacrifice=typeof _sacrificeCount==='function'?Number(_sacrificeCount()):0;
  const sacEl=document.getElementById('battle-sacrifice-value');
  if(sacEl) sacEl.textContent=String(Math.max(0,sacrifice));
}

function _playBattleOpeningAppearanceSfx(){
  try{
    if(typeof playFileSfx==='function'){ playFileSfx('assets/sfx/appearance.wav'); return; }
    const audio=new Audio('assets/sfx/appearance.wav');
    audio.preload='auto';
    audio.volume=sfxFallbackVolume(.8);
    audio.play().catch(()=>{});
  }catch(e){}
}

function _battleOpeningSlotList(selector,isEnemy,isRear){
  const root=document.querySelector(selector);
  if(!root) return [];
  return [...root.querySelectorAll('.unit-card')]
    .filter(slot=>{
      const idx=Number(slot.dataset.unitIdx);
      const unit=(isEnemy?G.enemies:G.allies)?.[idx];
      if(!unit||unit.hp<=0) return false;
      if(_battleOpeningIsSealed(unit)) return false;
      return isEnemy ? (isRear?slot.classList.contains('is-rear'):slot.classList.contains('is-front'))
        : (!!(unit.lane==='rear')===isRear);
    })
    .sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
}

function _battleOpeningIsSealed(unit){
  if(!unit) return false;
  if(_isSealed(unit)||Number(unit._sealValue)>0) return true;
  return typeof _sealValue==='function'&&_sealValue(unit)>0;
}

function _battleOpeningSealedSlotList(selector,isEnemy){
  const root=document.querySelector(selector);
  if(!root) return [];
  return [...root.querySelectorAll('.unit-card')].filter(slot=>{
    const idx=Number(slot.dataset.unitIdx);
    const unit=(isEnemy?G.enemies:G.allies)?.[idx];
    return !!(unit&&unit.hp>0&&_battleOpeningIsSealed(unit));
  }).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
}

function _battleOpeningLandingVfx(slot){
  const fx=document.createElement('div');
  fx.className='battle-opening-appearance-vfx';
  slot.classList.add('battle-opening-appearance-active');
  slot.insertBefore(fx,slot.firstChild);
  if(typeof actionBannerOpeningUnit==='function'){
    const enemy=!!slot.closest('#f-enemy');
    const unit=(enemy?G.enemies:G.allies||[])[Number(slot.dataset.unitIdx)];
    actionBannerOpeningUnit(unit,enemy?'p2':'p1',fx);
  }
  // 2026-10-21 利用者指摘：VFXとSEのタイミングが合っていない。砂煙は再生の40%（定義の impact）から出るので、
  // SEの一番大きい所をそこへ合わせる（以前は滑り込み始めに鳴らしていた）。LABも同じ impact と PRESENT_SFX_PEAK_SEC で鳴らす。
  const OPENING_DUST_MS=980;
  const dustDef=typeof VbFx!=='undefined'&&VbFx.effects?VbFx.effects.find(d=>d.name==='opening-sigil'):null;
  const dustAt=dustDef&&dustDef.impact&&dustDef.ms?OPENING_DUST_MS*dustDef.impact.atMs/dustDef.ms:OPENING_DUST_MS*.4;
  const sfxPeak=typeof presentSfxPeakSec==='function'?presentSfxPeakSec('appearance')*1000:0;
  battlePresentationSetTimeout(_playBattleOpeningAppearanceSfx,Math.max(0,dustAt-sfxPeak));
  const playing=_playDefinedVfx(fx,'vfx:appearance_sheet:opening-sigil',OPENING_DUST_MS,{presentationSpeed:true});
  // 永劫の力（M003）のマスから出たキャラクターは、着地に合わせて生命の力の演出を出す（2026-10-23 VFX の全検査で割り当て。PvE・オンライン共通）。
  {
    const enemySide=!!slot.closest('#f-enemy');
    const landed=(enemySide?G.enemies:G.allies||[])[Number(slot.dataset.unitIdx)];
    if(landed&&landed._mapPanelPower==='eternal'&&typeof playBattleLabFx==='function'&&typeof presentLabFx==='function'&&presentLabFx('map:eternal')){
      battlePresentationSetTimeout(()=>{ playBattleLabFx('map:eternal',landed,[landed],{side:enemySide?'enemy':'ally'}); },dustAt);
    }
  }
  // 2026-10-21 利用者指定：砂煙は登場元（左）へ流れる。流れていく様子が見えるよう、薄れ始めを700ms、消すのを1200msにした
  // （以前の560ms／980msは、大きく広がる輪を見せないための値。今の定義に輪は無い）。
  battlePresentationSetTimeout(()=>fx.classList.add('is-fading'),700);
  battlePresentationSetTimeout(()=>{
    playing.stop(); fx.remove();
    slot.classList.remove('battle-opening-appearance-active');
  },1200);
}

function _animateBattleOpeningSlot(slot,delayMs){
  slot.classList.add('battle-opening-card');
  slot.style.setProperty('z-index','80','important');
  slot.style.visibility='visible';
  slot.style.setProperty('opacity','0','important');
  slot.style.setProperty('transform','translateX(-110vw) scale(.96)','important');
  slot.style.setProperty('transition','none','important');
  return new Promise(resolve=>{
    battlePresentationSetTimeout(()=>{
      slot.style.setProperty('transition','transform 420ms cubic-bezier(.2,.8,.25,1), opacity 420ms cubic-bezier(.2,.8,.25,1)','important');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        slot.style.setProperty('transform','translateX(0) scale(1.12)','important');
        slot.style.setProperty('opacity','1','important');
      }));
      battlePresentationSetTimeout(()=>slot.style.setProperty('transform','translateX(0) scale(1)','important'),270);
    },delayMs);
    battlePresentationSetTimeout(()=>{
      slot.style.removeProperty('z-index');
      slot.style.removeProperty('visibility');
      slot.style.removeProperty('opacity');
      slot.style.removeProperty('transform');
      slot.style.removeProperty('transition');
      slot.classList.remove('battle-opening-card');
      slot.classList.add('battle-opening-done');
      resolve();
    },delayMs+420);
    battlePresentationSetTimeout(()=>_battleOpeningLandingVfx(slot),delayMs);
  });
}

async function _playBattleOpeningLaneStep(groups){
  const totalSpan=360;
  const jobs=[];
  groups.forEach(slots=>{
    const count=slots.length;
    const interval=count>1?totalSpan/(count-1):0;
    slots.forEach((slot,index)=>jobs.push(_animateBattleOpeningSlot(slot,index*interval)));
  });
  await Promise.all(jobs);
  await sleep(80);
}

// 封印キャラの登場（フェードイン）。
// opts.durationMs：尺。opts.fromDark：暗い状態から明るくする（エリート／ボス用）。
const BATTLE_OPENING_BOSS_FADE_MS=1100;   // エリート／ボスは少し長く
async function _fadeInBattleOpeningSealedSlots(slots,opts){
  if(!slots.length) return;
  const ms=Math.max(1,Number(opts&&opts.durationMs)||520);
  const fromDark=!!(opts&&opts.fromDark);
  slots.forEach(slot=>{
    slot.classList.add('battle-opening-sealed-card');
    slot.style.setProperty('z-index','70','important');
    slot.style.setProperty('visibility','visible','important');
    slot.style.setProperty('opacity','0','important');
    slot.style.setProperty('transform','scale(.98)','important');
    // **暗い状態から明るくする。** 透明度だけだと背景に溶けるだけで、
    // 「暗がりから現れる」感じにならない。
    if(fromDark) slot.style.setProperty('filter','brightness(.18)','important');
    slot.style.setProperty('transition','none','important');
  });
  await _awaitFrame(); await _awaitFrame();
  slots.forEach(slot=>{
    slot.style.setProperty('transition',
      `opacity ${ms}ms ease, transform ${ms}ms ease, filter ${ms}ms ease`,'important');
    if(typeof actionBannerOpeningUnit==='function'){
      const enemy=!!slot.closest('#f-enemy');
      const unit=((enemy?G.enemies:G.allies)||[])[Number(slot.dataset.unitIdx)];
      actionBannerOpeningUnit(unit,enemy?'p2':'p1',null,ms);
    }
    slot.style.setProperty('opacity','1','important');
    slot.style.setProperty('transform','scale(1)','important');
    if(fromDark) slot.style.setProperty('filter','brightness(1)','important');
  });
  await sleep(ms+20);
  slots.forEach(slot=>{
    slot.style.removeProperty('z-index');
    slot.style.removeProperty('visibility');
    slot.style.removeProperty('opacity');
    slot.style.removeProperty('transform');
    slot.style.removeProperty('filter');
    slot.style.removeProperty('transition');
    slot.classList.remove('battle-opening-sealed-card');
    slot.classList.add('battle-opening-done');
  });
}
// その戦闘の「エリート／ボス本人」のスロット。開幕で1体だけ別扱いにする。
function _battleOpeningBossSlots(){
  const root=document.querySelector('#f-enemy');
  if(!root) return [];
  return [...root.querySelectorAll('.unit-card')].filter(slot=>{
    const idx=Number(slot.dataset.unitIdx);
    const unit=(G.enemies||[])[idx];
    if(!unit||unit.hp<=0) return false;
    if(_battleOpeningIsSealed(unit)) return false;   // 封印はもともとフェードイン
    if(unit.boss||unit._isBoss) return true;
    return !!(G._isEliteFight&&Number(G._eliteIdx)>=0&&idx===Number(G._eliteIdx));
  });
}

// ── 戦闘開始時の台詞（敵シートの「台詞1〜3」列）───────────────
// 全員が場に出撃した後、台詞を持つキャラクターの分だけ順に吹き出しを出す。
// 尻尾の先端をそのキャラクターの中心X・下記のYへ合わせ、敵は上向き／味方は下向き。
// 味方は敵の位置を上下に折り返した高さ（カードの上端から約72px下）。以前の 1542／1969 は
// カードの下寄りで低すぎた（2026-09-24 利用者指摘。味方の台詞＝クエストの死亡時・逃走時台詞）。
const BATTLE_LINE_TAIL_Y={enemyRear:435,enemyFront:854,allyFront:1303,allyRear:1725};
// 枠と尻尾はSVGをそのまま貼る。淡色＝speechbubble1/2、暗色＝speechbubble3/4。
// 枠は元SVG（speechbubble1/3.svg、1091.39x194.88）と同じ六角形をJS側で組み立てる。
// 元の頂点：(1033.69,2.62)(57.7,2.62)(2.89,97.56)(57.7,192.5)(1033.69,192.5)(1088.51,97.56)
// ・線の内側オフセット：上下2.62 / 左右2.89（stroke-width 5 の半分ぶん）
// ・斜辺の傾き：横54.81 ÷ 縦94.94 → 高さの半分あたり 0.57731 だけ横へ寄る
// これらを保ったまま幅と高さだけ変えるので、斜辺の角度は常に元SVGと同一になる。
// 線の太さは viewBox を実寸（1ユニット＝設計座標1px）にすることで常に5pxで一定。
const BATTLE_LINE_FRAME_INSET_Y=2.62;
const BATTLE_LINE_FRAME_INSET_X=2.89;
const BATTLE_LINE_FRAME_SLOPE=54.81/94.94;  // ≒0.57731
const BATTLE_LINE_FRAME_STROKE=5;
const BATTLE_LINE_FRAME_FILL_DARK='#1b130b';
const BATTLE_LINE_FRAME_FILL_LIGHT='#e2cdba';
const BATTLE_LINE_FRAME_STROKE_COLOR='#8c5c2d';
// 高さから斜辺の横オフセット（左右の「キャップ幅」）を求める。
function _battleLineCapW(h){
  return BATTLE_LINE_FRAME_INSET_X+Math.max(0,h/2-BATTLE_LINE_FRAME_INSET_Y)*BATTLE_LINE_FRAME_SLOPE;
}
// 尻尾(viewBox 237x170)は尖端が左下(0,170)、付け根が上辺 x100.1〜237。
// 敵は180度回転（尖端＝右上／付け根＝下辺 0〜57.76%）、味方は左右反転（尖端＝右下／付け根＝上辺）。
const BATTLE_LINE_TAIL_W=180;
const BATTLE_LINE_TAIL_H=129;
const BATTLE_LINE_TAIL_BASE_X=0.5776;
// 尻尾の茶色い線（cls-2）の付け根は y=25.16 で、そこから先（暗色のcls-1）は枠の内側へ潜り込む
// はみ出し分。枠の線と尻尾の線をきれいに繋ぐには、枠の辺をこの位置に合わせる必要がある。
const BATTLE_LINE_TAIL_BASE_INSET=BATTLE_LINE_TAIL_H*(25.16/170);
// 枠SVGの上下の線は画像の端から2.62px内側にある（9スライスで等倍描画するのでこの値のまま）。
// 尻尾の線と枠の線をぴったり合わせるには、枠の要素をこの分だけ外側へずらす必要がある。
const BATTLE_LINE_FRAME_EDGE=2.62;
const BATTLE_LINE_BUBBLE_MARGIN=24;   // 付け根から枠の斜辺までの余白
// 枠の寸法。高さは行数から決め打ちにする（実測だとフォント読み込みの前後で
// 同じ行数でも高さが変わってしまうため）。
const BATTLE_LINE_FONT=60;
const BATTLE_LINE_LINE_H=1.45;
const BATTLE_LINE_PAD_X=96;
const BATTLE_LINE_PAD_Y=44;
const BATTLE_LINE_MIN_W=520;
function _battleLineLayer(){
  let layer=document.getElementById('battle-line-layer');
  if(!layer){
    layer=document.createElement('div');
    layer.id='battle-line-layer';
    layer.innerHTML='<div id="battle-line-stage">'
      +'<div id="battle-line-bubble">'
      +'<svg id="battle-line-bubble-shape" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">'
      +'<polygon id="battle-line-bubble-poly"></polygon></svg>'
      +'<div id="battle-line-text"></div></div>'
      +'<div id="battle-line-tail"></div>'
      +'</div>';
    document.body.appendChild(layer);
  }
  _syncBattleLineStage();
  // 会話中はカードのホバー説明（#kw-tooltip）が台詞枠より前面に出るようにする。
  document.body.classList.add('battle-line-active');
  return layer;
}
// 設計座標(3840x2160)のまま子要素を置けるよう、画面の拡大率・オフセットを反映する。
// 台詞表示中にウィンドウサイズが変わると倍率とオフセットがずれ、枠と尻尾だけが
// キャラクターから離れてしまうため、リサイズのたびに貼り直す。
function _syncBattleLineStage(){
  const stage=document.getElementById('battle-line-stage');
  if(!stage) return;
  const rootStyle=getComputedStyle(document.documentElement);
  const scale=parseFloat(rootStyle.getPropertyValue('--game-scale'))||1;
  const offX=parseFloat(rootStyle.getPropertyValue('--game-offset-x'))||0;
  const offY=parseFloat(rootStyle.getPropertyValue('--game-offset-y'))||0;
  stage.style.left=`${offX}px`;
  stage.style.top=`${offY}px`;
  stage.style.transform=`scale(${scale})`;
}
window.addEventListener('resize',()=>{
  // fitVesselboundViewport()が--game-scale等を更新した後に反映されるよう次フレームで実行する。
  requestAnimationFrame(_syncBattleLineStage);
});
function _removeBattleLineLayer(){
  const layer=document.getElementById('battle-line-layer');
  if(layer) layer.remove();
  document.body.classList.remove('battle-line-active');
}
// ユニットのスロット要素から、設計座標での中心Xを求める。
function _battleLineUnitCenterX(unit,isEnemySide){
  const root=document.querySelector(isEnemySide?'#f-enemy':'#f-ally');
  const list=isEnemySide?G.enemies:G.allies;
  const idx=(list||[]).indexOf(unit);
  const slot=root&&idx>=0?root.querySelector(`.unit-card[data-unit-idx="${idx}"]`):null;
  // 攻撃者自身が反撃・呪詛で倒れる時は、接触中の本体スロットが非表示。
  // その場合だけ飛行中の複製を話者の位置にし、空の元位置へ尻尾を出さない。
  const moving=[...document.querySelectorAll('.attack-motion-clone[data-unit-id]')]
    .find(el=>String(el.dataset.unitId||'')===String(unit&&unit.id||''));
  const anchor=moving||slot;
  const rootStyle=getComputedStyle(document.documentElement);
  const scale=parseFloat(rootStyle.getPropertyValue('--game-scale'))||1;
  const offX=parseFloat(rootStyle.getPropertyValue('--game-offset-x'))||0;
  if(!anchor) return 1920;
  const r=anchor.getBoundingClientRect();
  return ((r.left+r.width/2)-offX)/(scale||1);
}
function _battleLineTailY(isEnemySide,isRear,unit){
  const moving=unit&&[...document.querySelectorAll('.attack-motion-clone[data-unit-id]')]
    .find(el=>String(el.dataset.unitId||'')===String(unit.id||''));
  if(moving){
    const rootStyle=getComputedStyle(document.documentElement);
    const scale=parseFloat(rootStyle.getPropertyValue('--game-scale'))||1;
    const offY=parseFloat(rootStyle.getPropertyValue('--game-offset-y'))||0;
    const r=moving.getBoundingClientRect();
    return ((r.top+r.height/2)-offY)/(scale||1);
  }
  if(isEnemySide) return isRear?BATTLE_LINE_TAIL_Y.enemyRear:BATTLE_LINE_TAIL_Y.enemyFront;
  return isRear?BATTLE_LINE_TAIL_Y.allyRear:BATTLE_LINE_TAIL_Y.allyFront;
}
// 枠（六角形）を実寸で組み立てる。viewBoxを 0 0 w h にすることで
// 1ユニット＝設計座標1pxとなり、stroke-widthが枠の大小に影響されない。
function _drawBattleLineFrame(layer,w,h,dark){
  const svg=layer.querySelector('#battle-line-bubble-shape');
  const poly=layer.querySelector('#battle-line-bubble-poly');
  if(!svg||!poly) return;
  const insetY=BATTLE_LINE_FRAME_INSET_Y;
  const insetX=BATTLE_LINE_FRAME_INSET_X;
  const cap=_battleLineCapW(h);
  const midY=h/2;
  const r=n=>Math.round(n*100)/100;
  const pts=[
    [w-cap,insetY],[cap,insetY],[insetX,midY],
    [cap,h-insetY],[w-cap,h-insetY],[w-insetX,midY],
  ].map(([x,y])=>`${r(x)},${r(y)}`).join(' ');
  svg.setAttribute('viewBox',`0 0 ${r(w)} ${r(h)}`);
  svg.setAttribute('width',`${r(w)}`);
  svg.setAttribute('height',`${r(h)}`);
  poly.setAttribute('points',pts);
  poly.setAttribute('fill',dark?BATTLE_LINE_FRAME_FILL_DARK:BATTLE_LINE_FRAME_FILL_LIGHT);
  poly.setAttribute('stroke',BATTLE_LINE_FRAME_STROKE_COLOR);
  poly.setAttribute('stroke-width',String(BATTLE_LINE_FRAME_STROKE));
  poly.setAttribute('stroke-miterlimit','10');
}
// 1つの台詞を表示し、左クリックされるまで待つ。
function _showBattleLine(text,centerX,tailY,isEnemySide){
  const layer=_battleLineLayer();
  const tail=layer.querySelector('#battle-line-tail');
  const bubble=layer.querySelector('#battle-line-bubble');
  const textEl=layer.querySelector('#battle-line-text');
  const raw=String(text||'');
  textEl.textContent=raw;
  // 高さは行数から決め打ちにする（offsetHeightを使うと、Webフォントの読み込み前後で
  // 同じ行数でも高さが変わってしまう）。幅は一番長い行をcanvasで測って決める。
  const rows=raw.split('\n');
  const h=BATTLE_LINE_PAD_Y*2+rows.length*Math.round(BATTLE_LINE_FONT*BATTLE_LINE_LINE_H);
  const cs=getComputedStyle(textEl);
  const ctx=(_showBattleLine._ctx||(_showBattleLine._ctx=document.createElement('canvas').getContext('2d')));
  ctx.font=`${cs.fontWeight} ${BATTLE_LINE_FONT}px ${cs.fontFamily}`;
  const letter=parseFloat(cs.letterSpacing)||0;
  const textW=Math.max.apply(null,rows.map(t=>ctx.measureText(t).width+letter*t.length));
  // 斜辺の横オフセットは高さから決まる。テキスト幅＋左右パディングに、その分を足す。
  const cap=_battleLineCapW(h);
  const w=Math.max(BATTLE_LINE_MIN_W,Math.ceil(textW)+BATTLE_LINE_PAD_X*2+Math.ceil(cap*2));
  bubble.style.width=`${w}px`;
  bubble.style.height=`${h}px`;
  // 敵の台詞は暗色（speechbubble3/4）、味方の台詞は淡色（speechbubble1/2）。
  const dark=isEnemySide;
  layer.classList.toggle('is-dark',dark);
  _drawBattleLineFrame(layer,w,h,dark);
  tail.style.setProperty('background-image',`url("assets/ui/speechbubble${dark?4:2}.svg")`,'important');
  // 敵は話し手の右側、味方は左側に出す。
  // 元SVGは尖端が左下(0,170)・付け根が上辺 x100.1〜237。
  //   敵（右側）  ：上下反転（尖端＝左上／付け根＝下辺 x100.1〜237＝42.24%〜100%）
  //   味方（左側）：左右反転（尖端＝右下／付け根＝上辺 x0〜136.9＝0%〜57.76%）
  tail.style.width=`${BATTLE_LINE_TAIL_W}px`;
  tail.style.height=`${BATTLE_LINE_TAIL_H}px`;
  tail.style.transform=isEnemySide?'scaleY(-1)':'scaleX(-1)';
  // 尖端のXは、敵＝箱の左端／味方＝箱の右端。どちらも話し手の中心に合わせる。
  const tailLeft=isEnemySide?centerX:(centerX-BATTLE_LINE_TAIL_W);
  const tailTop=isEnemySide?tailY:(tailY-BATTLE_LINE_TAIL_H);
  tail.style.left=`${tailLeft}px`;
  tail.style.top=`${tailTop}px`;
  // 枠は、尻尾の付け根が「キャップより内側の平らな辺」に載るように寄せる。
  if(isEnemySide){
    // 付け根の左端＝tailLeft+(1-0.5776)×180。そこからマージンとキャップ分だけ外側へ。
    const baseLeft=tailLeft+(1-BATTLE_LINE_TAIL_BASE_X)*BATTLE_LINE_TAIL_W;
    const bubbleLeft=baseLeft-BATTLE_LINE_BUBBLE_MARGIN-cap;
    bubble.style.left=`${Math.max(20,Math.min(bubbleLeft,3840-20-w))}px`;
  }else{
    const bubbleRight=tailLeft+BATTLE_LINE_TAIL_BASE_X*BATTLE_LINE_TAIL_W+BATTLE_LINE_BUBBLE_MARGIN+cap;
    bubble.style.left=`${Math.max(20,bubbleRight-w)}px`;
  }
  // 枠の線が尻尾の茶色い線の付け根と重なるように置く（敵＝尻尾の下側、味方＝尻尾の上側）。
  const tailLineY=isEnemySide
    ?tailTop+BATTLE_LINE_TAIL_H-BATTLE_LINE_TAIL_BASE_INSET
    :tailTop+BATTLE_LINE_TAIL_BASE_INSET;
  bubble.style.top=isEnemySide
    ?`${Math.round(tailLineY-BATTLE_LINE_FRAME_EDGE)}px`
    :`${Math.round(tailLineY+BATTLE_LINE_FRAME_EDGE-h)}px`;
  layer.classList.add('is-visible');
  return new Promise(resolve=>{
    // 会話中もカードのホバー説明を見られるよう、レイヤー自体はpointer-events:noneにし、
    // クリックだけをdocumentのキャプチャ段階で拾う（カード側のクリック処理には渡さない）。
    const onClick=e=>{
      if(e.button!==undefined&&e.button!==0) return;
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('pointerdown',onClick,true);
      resolve();
    };
    document.addEventListener('pointerdown',onClick,true);
  });
}

// 死亡・逃走・プレイヤー敗北で使う、開幕台詞と同じ吹き出し。
// 「いつ出すか」は present_events.js が決め、ここは DOM の表示だけを行う。
async function showBattleUnitOutcomeLines(unit,side,lines){
  const spoken=(Array.isArray(lines)?lines:[]).map(line=>String(line||'').trim()).filter(Boolean);
  if(!unit||!spoken.length) return false;
  const isEnemySide=side==='p2'||(G.enemies||[]).includes(unit);
  const isRear=String(unit.lane||'front')==='rear';
  try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(_e){}
  try{
    const centerX=_battleLineUnitCenterX(unit,isEnemySide);
    const tailY=_battleLineTailY(isEnemySide,isRear,unit);
    for(const line of spoken) await _showBattleLine(line,centerX,tailY,isEnemySide);
  }finally{
    _removeBattleLineLayer();
  }
  return true;
}

// プレイヤー敗北時の話者は、盤面に残った敵を「前衛左→右、後衛左→右」で並べる。
// 複数いる時も1体ずつ順に話し、全員が終わるまで決着表示へ進まない。
async function playBattlePlayerDefeatLines(){
  if(typeof presentPlayerDefeatLines!=='function') return false;
  const ordered=typeof _orderedBattleCharacters==='function'
    ?_orderedBattleCharacters():(G.enemies||[]).filter(unit=>unit&&unit.hp>0);
  const speakers=ordered.filter(unit=>unit&&unit.hp>0&&(G.enemies||[]).includes(unit))
    .map(unit=>({unit,side:'p2'}));
  return presentPlayerDefeatLines(speakers,{showLines:showBattleUnitOutcomeLines});
}
// 台詞を持つキャラクターを、盤面の並び順で集める。
function _battleStartLineSpeakers(){
  const out=[];
  (typeof _orderedBattleCharacters==='function'?_orderedBattleCharacters():[]).forEach(unit=>{
    if(!unit||unit.hp<=0) return;
    const useArenaLines=!!(G&&G._arenaActive&&(unit.elite||unit.boss));
    const sourceLines=useArenaLines
      ?(Array.isArray(unit.arenaBattleLines)?unit.arenaBattleLines:[])
      :(Array.isArray(unit.battleLines)?unit.battleLines:[]);
    const lines=sourceLines.filter(t=>String(t||'').trim());
    if(!lines.length) return;
    const isEnemySide=(G.enemies||[]).includes(unit);
    out.push({unit,isEnemySide,isRear:String(unit.lane||'front')==='rear',lines});
  });
  return out;
}
// 開幕演出（全員の出撃）後に呼ぶ。台詞が無ければ何もしない。
async function playBattleStartLines(){
  // 再挑戦（同じエリート・ボスへ挑み直した）時は会話を出さない。
  if(G&&G._skipBattleStartLines){ G._skipBattleStartLines=false; return; }
  const speakers=_battleStartLineSpeakers();
  if(!speakers.length) return;
  // Webフォントの読み込み前に幅を測ると、台詞ごとに枠の長さがばらつく。
  try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(_e){}
  try{
    for(const sp of speakers){
      const centerX=_battleLineUnitCenterX(sp.unit,sp.isEnemySide);
      const tailY=_battleLineTailY(sp.isEnemySide,sp.isRear);
      for(const line of sp.lines){
        await _showBattleLine(line,centerX,tailY,sp.isEnemySide);
      }
    }
  }finally{
    _removeBattleLineLayer();
  }
  // 全ての台詞を終えたら1秒待ってから通常通り戦闘を開始する。
  await sleep(1000);
}

// introKind：'elite'/'boss' の時は**味方を先に通常どおり全員出し、そのあと
// 敵を全員フェードインで出す**（封印キャラと同じ出し方）。
async function playBattleOpeningSequence(introKind){
  const host=document.getElementById('scr-battle');
  if(!host) return;
  host.classList.remove('battle-opening-pending');
  host.classList.add('battle-opening-active');
  // 続きの戦闘では味方を出し直さない（敵だけが登場する）。
  const carry=_battleCarryOpening();
  const enemyRear=_battleOpeningSlotList('#f-enemy',true,true);
  const allyRear=carry?[]:_battleOpeningSlotList('#f-ally',false,true);
  const enemyFront=_battleOpeningSlotList('#f-enemy',true,false);
  const allyFront=carry?[]:_battleOpeningSlotList('#f-ally',false,false);
  const sealed=[
    ..._battleOpeningSealedSlotList('#f-enemy',true),
    ...(carry?[]:_battleOpeningSealedSlotList('#f-ally',false))
  ];
  // ラスボス戦は通常の登場演出（落下＋着地VFX）を使わず、
  // 封印キャラも含めて全員を同時にフェードインで出す。
  if(typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()){
    await _fadeInBattleOpeningSealedSlots([...enemyFront,...allyFront,...enemyRear,...allyRear,...sealed]);
    host.classList.remove('battle-opening-active');
    if(!carry&&typeof actionBannerOpeningItems==='function') actionBannerOpeningItems();
    return;
  }
  // **エリート／ボス本人だけ**は通常の登場から外し、後で暗がりから現れさせる。
  // 他の敵・味方はこれまでどおり同時に落ちてくる。
  const kind=String(introKind||(typeof _battleStartIntroText==='function'?(_battleStartIntroText()||{}).kind:'')||'');
  const bossSlots=(kind==='elite'||kind==='boss')?_battleOpeningBossSlots():[];
  const notBoss=list=>list.filter(slot=>!bossSlots.includes(slot));
  await _playBattleOpeningLaneStep([notBoss(enemyFront),allyFront]);
  await _playBattleOpeningLaneStep([notBoss(enemyRear),allyRear]);
  await _fadeInBattleOpeningSealedSlots(sealed);
  // エリート／ボスは封印キャラと同じフェードイン。少し長く、暗い状態から明るくする。
  if(bossSlots.length){
    await _fadeInBattleOpeningSealedSlots(bossSlots,
      {durationMs:BATTLE_OPENING_BOSS_FADE_MS,fromDark:true});
  }
  host.classList.remove('battle-opening-active','battle-carry-allies');
  if(!carry&&typeof actionBannerOpeningItems==='function') actionBannerOpeningItems();
}

// 開幕カードのtransform解除直後は、複数体時の絶対left/top再配置がまだ
// ブラウザのレイアウトへ反映されていないことがある。最初の攻撃前に同期的に
// レイアウトを確定させ、攻撃モーションが演出中の矩形を拾わないようにする。
function _settleBattleOpeningLayout(){
  const host=document.getElementById('scr-battle');
  if(!host) return;
  void host.offsetWidth;
  const slots=host.querySelectorAll('#f-enemy .unit-card,#f-ally .unit-card');
  let visible=0;
  slots.forEach(slot=>{
    const rect=slot.getBoundingClientRect();
    if(rect.width>0&&rect.height>0) visible++;
  });
  G._battleOpeningLayoutSettledAt=performance.now();
  _recordBattleTrace('battle_opening_layout_settled',{visibleSlots:visible,totalSlots:slots.length});
}

// デバッグモードで戦闘中に編成画面を開いたとき、走っている非同期の戦闘処理を
// その場で無効化するための世代番号。_debugFormationAbortだけだと、次の戦闘の
// startBattle()でフラグが落ちた瞬間に前の戦闘のループが再開し、二重に進行してしまう
// （＝「編成画面にしても戦闘が続く」「次の移動先で前の戦闘が続く」の原因）。
function _bumpBattleRunId(){
  G._battleRunId=(Number(G._battleRunId)||0)+1;
  return G._battleRunId;
}
function _battleRunStale(runId){
  return !!G._debugFormationAbort||Number(G._battleRunId)!==Number(runId);
}
// デバッグ用：走っている戦闘を即座に打ち切り、持ち越すと次の戦闘を壊す状態を落とす。
function abortBattleForDebug(){
  G._debugFormationAbort=true;
  _bumpBattleRunId();
  G._battlePhaseRunning=false;
  G._battleVictoryPending=false;
  G._battleDraw=false;
  G._checkingManaUnitEffects=false;
  delete G._manaUnitEffectsPromise;
  document.body.classList.remove('battle-turn-active','battle-victory-pending','right-card-peek');
}

// 命中音は「同じ瞬間に複数鳴る」ことが多い（攻撃と反撃、全体攻撃）。
// 音源の読み込みが済んでいないと鳴り始めが1回ごとにばらつき、ずれて聞こえる。
// 戦闘の頭で、使う可能性のある命中音を鳴らせる状態にしておく。
function _warmBattleHitSfx(){
  if(typeof warmFileSfx==='function') warmFileSfx('assets/sfx/appearance.wav');
  if(typeof warmSfxVoices!=='function') return;
  const keys=[];
  ['sword','axe','punch','kick'].forEach(t=>{ for(let lv=1;lv<=3;lv++) keys.push(`${t}${lv}`); });
  keys.push('attack','hit','death',getKeywordEffectSfxKey('結界'));
  if(typeof PRESENT_LAB_FX!=='undefined') keys.push(...Object.keys(PRESENT_LAB_FX).filter(key=>PRESENT_LAB_FX[key][1]!=null));
  warmSfxVoices(keys);
}

function _prepareStartingBattleItems(carryBattle){
  if(!carryBattle){
    const pendingItems=[
      ...(Array.isArray(G.pendingBattleItems)?G.pendingBattleItems:[]),
      ...(Array.isArray(G.nextBattleItems)?G.nextBattleItems:[])
    ];
    const seenItemKeys=new Set();
    G.activeBattleItems=pendingItems.map(c=>clone(c)).filter(c=>{
      if(!c) return false;
      if(!['silence_scroll','meteor_scroll'].includes(String(c.itemEffectKey||''))) return false;
      const key=String(c.itemEffectKey||'')==='meteor_scroll'
        ?'meteor_scroll'
        :(c._itemUseInstanceId||('__legacy__'+String(c.id||c.name||'')+'|'+String(c.itemEffectKey||'')));
      if(seenItemKeys.has(key)) return false;
      seenItemKeys.add(key);
      return true;
    });
    G.pendingBattleItems=[];
    G.nextBattleItems=[];
    (G.activeBattleItems||[]).forEach(c=>{ if(c){ delete c._firedThisBattle; delete c._manaFireCount; } });
  }
  (G.allies||[]).forEach(u=>{
    (u?.boardCards||[]).forEach(p=>{
      if(p){
        delete p._rewardReturnCard;
        delete p._rewardReturnIdx;
        delete p._rewardReturnPhaseId;
      }
    });
  });
}

function _hideRewardUiForBattle(){
  // 報酬フェイズUI非表示
  const rInfo=document.getElementById('reward-info-bar');
  const rCards=document.getElementById('reward-cards-section');
  const rHand=document.getElementById('inline-hand-editor');
  const rMove=document.getElementById('move-inline');
  const allySection=document.getElementById('ally-section');
  if(rInfo)  rInfo.style.display='none';
  if(rCards) rCards.style.display='none';
  if(rHand)  rHand.style.display='none';
  if(rMove)  rMove.style.display='none';
  if(allySection) allySection.style.display='';
  const eArea=document.getElementById('enemy-area');
  if(eArea) eArea.style.display='';
  const rMoveBtns=document.getElementById('reward-move-btns');
  if(rMoveBtns) rMoveBtns.style.display='none';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='';
  // 報酬フェイズから素早く次戦へ移行した際、報酬カード置き場（旧配置順置き場）とメイン置き場が
  // 直前のレンダリング内容のまま画面に残ってしまう（renderAll()はこれらを更新しないため）のを防ぐ
  const rewardOfferSection=document.getElementById('reward-offer-section');
  if(rewardOfferSection) rewardOfferSection.style.display='none';
  const rewardOfferRow=document.getElementById('reward-offer-row');
  if(rewardOfferRow) rewardOfferRow.innerHTML='';
  if(typeof renderHandEditor==='function') renderHandEditor();

}

function _layoutStartingBattleEnemies(savedBattle,reuseWaveEnemies,arenaBattle,questBattle,fixedTestBattle,mapBattle,battleFloor,carryBattle){
  // 敵は前衛5体・後衛3体の最大8枠へ整列。オブジェクトは出現させない。
  {
    // ステージごとの明示指定（_sceneEnemyCount）で数と前後衛が確定している場合は、
    // 序盤の間引き・水増し・自動レーン配置をすべて行わない。
    // **既に確定した敵をそのまま使う経路（再戦のスナップショット／セーブからの復帰）では、
    // 間引き・水増し・レーン再配置を一切行わない。**
    // 数と前後衛の抑止は generateEnemies() が立てる G._enemyLaneFixed に依存しているが、
    // この2経路は generateEnemies() を通らないため旗が立たず、下の水増しが働いていた。
    // 実例：ステージ1の2戦目（2体）で敗北して再戦すると、同じ敵が4体へ増えていた。
    const _enemiesAlreadyFixed=!!savedBattle||reuseWaveEnemies||arenaBattle||questBattle;
    const _laneFixed=fixedTestBattle?false:(!!G._enemyLaneFixed||_enemiesAlreadyFixed);
    G._enemyLaneFixed=false;
    const _scriptedOpening=!mapBattle&&typeof usesOpeningBattleEnemyFormation==='function'&&usesOpeningBattleEnemyFormation(G.floor);
    if(!savedBattle&&!reuseWaveEnemies){
      const _actualEnemies=G.enemies.filter(e=>e&&!e._isObject);
      const _mapNormalBattleNo=mapBattle&&mapBattle.type==='battle'&&Number(mapBattle.mapIndex)===1&&Number(mapBattle.turn)<=4?Number(mapBattle.normalBattleNo)||0:0;
      const _earlyBattleCount=(!_isBossFight&&!_laneFixed)?(_mapNormalBattleNo===1?1:(_mapNormalBattleNo===2?2:(!mapBattle&&battleFloor===1?1:(!mapBattle&&battleFloor===2?2:0)))):0;
      if(_earlyBattleCount>0&&_actualEnemies.length>_earlyBattleCount){
        _actualEnemies.splice(_earlyBattleCount);
      }
      while(!_laneFixed&&!_scriptedOpening&&!_earlyBattleCount&&_actualEnemies.length<4&&_actualEnemies.length>0){
        const base=_actualEnemies[_actualEnemies.length%_actualEnemies.length]||_actualEnemies[0];
        const extra=JSON.parse(JSON.stringify(base));
        extra.id=uid();
        extra.lane='front';
        _actualEnemies.push(extra);
      }
      const _newEnemies=new Array(MAX_ENEMIES||8).fill(null);
      if(!_isBossFight&&!_scriptedOpening&&!_laneFixed) _layoutEnemyLanes(_actualEnemies);
      _actualEnemies.forEach((e,idx)=>{ if(idx<_newEnemies.length) _newEnemies[idx]=e; });
      G.enemies=_newEnemies;
      compactBattleUnits({keepAllyOrder:carryBattle});
    }
    if(_isBossFight) G._bossSlot=G.enemies.findIndex(e=>e&&(e.boss||(e.keywords||[]).includes('ボス')));
    // エリートの位置を再特定（撃破ボーナス判定で参照するため）
    if(G._isEliteFight) G._eliteIdx=G.enemies.findIndex(e=>e&&e.keywords&&e.keywords.includes('エリート'));
  }
}

function _resetStartingBattleAllies(carryBattle){
  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    delete a._deathFxStarted;
    if(!carryBattle){
      a._dp=false; a.powerBroken=false;
      a.nullified=0; a.instadead=false;
    }
    a._battleStartHp=a.hp;
    if(!carryBattle){
      const hasBattleHate=(a._panelSummoned&&a.guardian);
      if(hasBattleHate){ a.hate=true; a.hateTurns=99; }
      else { a.hate=false; a.hateTurns=0; }
      delete a._weakenedSavedAtk; delete a._weakenPhaseApplied;
    }
  });
  snapshotAlliesAtBattleStart();
  if(_isBossFight){
    const _bossUnit=G.enemies[G._bossSlot];
  }

}

