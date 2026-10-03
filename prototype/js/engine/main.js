// ═══════════════════════════════════════
// main.js — UIヘルパー・ゲームフロー
// 依存: state.js, battle.js
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function showScreen(id){
  // **画面が変わったらアイテム関連のUIを畳む。**
  // ポータルの巻物のように「使うとその場で画面が切り替わる」アイテムがあり、
  // 使用確認ウインドウと対象選択の暗転が次の画面へそのまま残っていた。
  if(typeof _closeItemUseConfirm==='function') _closeItemUseConfirm();
  if(typeof _cancelPendingItemUse==='function'&&typeof G!=='undefined'&&G&&G._pendingItemUse){
    _cancelPendingItemUse(true);
  }
  if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground(id);
  // 戦闘画面から離れたら、中心へ寄せた拡大（フォーカス）を必ず外す。
  // 残すと次に戦闘画面へ戻った時に拡大されたまま始まる。
  if(id!=='battle'&&typeof clearBattleFocus==='function') clearBattleFocus();
  if(id==='title') _startTitleBgVideo();
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('scr-'+id).classList.add('active');
  // 街（村）専用画面のCSSスコープ。編成画面のボタン等の複製ルールがこのクラスに依存する。
  document.body.classList.toggle('village-screen-active',id==='village');
  document.body.classList.toggle('library-screen-active',id==='village'&&!!(G&&G._isLibraryMenu));
  // マップ確認の「終了」ボタンは、マップ画面を離れたら必ず消す。
  if(id!=='map'&&typeof _setDebugMapButtonVisible==='function') _setDebugMapButtonVisible(false);
  if(id!=='reward'){
    document.body.classList.remove('debug-mode');
    ['btn-debug-kill','btn-debug-gameover','btn-debug-quest','btn-test-battle','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'].forEach(debugId=>{
      const debugEl=document.getElementById(debugId);
      if(debugEl) debugEl.style.display='none';
    });
  }
  const battleCutin=document.getElementById('battle-start-intro');
  const hideDebugCutin=!!(battleCutin||document.body.classList.contains('battle-victory-pending'));
  ['btn-debug-kill','btn-debug-gameover','btn-debug-quest','btn-test-battle','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'].forEach(debugId=>{
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
    if(typeof SaveRun!=='undefined') SaveRun.refreshContinue();
    const titleEl=document.getElementById('scr-title');
    // 戦闘・村で付いた一時クラスを持ち越すと、タイトルの上に暗転が残る。
    document.body.classList.remove('battle-victory-pending','village-departing',
      'gameover-active','game-clear-active','game-clear-first-run','gameover-ui-pending','second-run-intro-active');
    // **タイトルを出す時は必ず「ゲームスタート」の表示へ戻す。**
    // デバッグモードで始めた時、ラベルは「デバッグモード」のまま残す作り
    // （消える瞬間に文字が戻って見えないようにするため）なので、
    // ここで戻さないと、ゲームオーバー／エラーからタイトルへ戻った時に
    // 「デバッグモード」と出たまま普通のゲームが始まる。
    if(typeof _syncTitleStartLabel==='function'){ _titleCtrlHeld=false; _syncTitleStartLabel(); }
    // **オンライン対戦はタイトルへ戻った時点で終わり。** 後片付けは
    // exitOnlineMode()（online/flow.js）が唯一の実装。ここを通さないと
    // 他プレイヤーの名前枠・残り時間がタイトルに残り、
    // body.online-versus-active が残って次のゲームの編成画面が操作できなくなる。
    if(typeof exitOnlineMode==='function') exitOnlineMode();
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
  // 魔獣撃退依頼の討伐後（camp と続く編成画面）は BGM を流さない（環境音だけ）。
  // それ以外の画面（マップ・戦闘・次の街）へ移ったら解除する。
  const _questNoBgmHere=typeof G!=='undefined'&&G&&G._questNoBgm
    &&(id==='village'||(id==='battle'&&G.phase==='reward'));
  if(typeof G!=='undefined'&&G&&G._questNoBgm&&!_questNoBgmHere) G._questNoBgm=false;
  // 街のBGMが鳴っている間（街画面／街の施設）はBGMを切り替えない。
  if(!_questNoBgmHere&&typeof playBgm==='function'&&!(typeof G!=='undefined'&&G&&G._villageBgmActive)){
    // 街（村）専用画面と、商談（報酬/編成）フェイズ中の戦闘画面はメニュー曲を使う。
    const isMenuLike=typeof G!=='undefined'&&G&&G.phase==='reward';
    const isBossBattle=typeof G!=='undefined'&&G&&G._waveBattleType==='boss';
    const isArenaBattle=typeof G!=='undefined'&&G&&G._arenaActive;
    // ラスボス戦だけは専用BGM（battle4.wav、1:17から）を使う。
    const isFinalBoss=typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow();
    // 音量は曲ごとにBGM_DEFAULT_VOLUMES（audio.js）で決める。ここで.32を渡すと
    // 戦闘BGMだけが他より小さくなるため、指定せず既定値に任せる。
    if(id==='title') _startTitleBgm();
    else if(id==='battle') playBgm(isArenaBattle?'battle2':(isMenuLike?'menu':(isFinalBoss?'battle4':(isBossBattle?'battle3':'battle1'))),
      isArenaBattle?{fadeInMs:700,startTime:57,fadeOutMs:700}:{fadeInMs:700});
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
// ── 所持金・ライフ・マナ・血の説明（ホバー）────────────────────
// **文言はテキストメッセージシートが唯一の出どころ**（`window.TEXT_MESSAGES`）。
// 見せ方はキャラクターのホバー説明と同じ仕組み（`data-preview`）で、見出し下の直線も同じに出す。
// titleKey＝見出しの行。**説明文とセットで同じ枠の見出しを引く。**
// 例：「所持金枠」見出し（ゴールド）＋ 全画面「所持金枠」説明文。
// シートに見出しの行が無い間は title の値をそのまま使う。
const STATUS_TOOLTIPS=[
  {title:'所持金',titleKey:'「所持金枠」見出し',key:'全画面「所持金枠」説明文',fallback:'街で買い物や鍛冶に利用できる。',
    values:['battle-gold-value','village-gold','map-gold'],
    selectors:['.reward-prod-money']},
  {title:'ライフ',titleKey:'「ライフ枠」見出し',key:'全画面「ライフ枠」説明文',fallback:'ライフが0になるとゲームオーバーになる。',
    values:['battle-life-value','village-life','map-life'],
    selectors:['.reward-prod-turn']},
  {title:'マナ',titleKey:'「マナ枠」見出し',key:'戦闘画面「マナ枠」説明文',fallback:'マナ効果の発動に必要。',
    values:['battle-mana-value'],selectors:[]},
  {title:'血',titleKey:'「血枠」見出し',key:'戦闘画面「血枠」説明文',
    fallback:'味方が死ぬと増加する。封印されたキャラクターの解放や、一部のカード効果の発動に必要。',
    values:['battle-sacrifice-value'],selectors:[]},
];
// ── CSSの content で出す文言をシートから流し込む ─────────────────
// **文言はテキストメッセージシートが唯一の出どころ。** CSSからはシートを読めないので、
// カスタムプロパティ（--altar-desc-text 等）へ入れて `content:var(...)` に使わせる。
// 予備の文字列はCSS側の var() の第2引数が持つ（ここでは値が取れた時だけ設定する）。
const SHEET_CSS_TEXTS=[
  {prop:'--altar-desc-text',key:'「祭壇」説明文1'},
  {prop:'--title-board',key:'「魔導板枠」見出し'},
  {prop:'--title-reward',key:'「編成画面の報酬枠」見出し'},
  {prop:'--title-gold',key:'「所持金枠」見出し'},
  {prop:'--title-shop',key:'「魔導店の報酬枠」見出し'},
  {prop:'--title-item-shop',key:'「道具屋の報酬枠」見出し'},
  {prop:'--title-forge',key:'「鍛冶屋の報酬枠」見出し'},
  {prop:'--title-altar',key:'「祭壇の報酬枠」見出し'},
  {prop:'--title-library',key:'「図書館の報酬枠」見出し'},
  // 祭壇の説明文は2種類。1＝まだ捧げ切っていない時、2＝指輪を取った後。
  {prop:'--altar-desc-resolved-text',key:'「祭壇」説明文2'},
];
// ── DOMに直接書く見出し ────────────────────────────────
// **文言はテキストメッセージシートが唯一の出どころ。** セレクタで引ける固定の見出しは
// ここへ足すだけでよい（画面によって変わる見出しは各画面側で textMessage() を呼ぶ）。
const SHEET_DOM_TITLES=[
  {sel:'#scr-title .tap-to-start',key:'TAP TO START',fallback:'TAP TO START'},
  {sel:'#scr-title .title-copyright',key:'著作権表示',fallback:'©2027 Argante Inc. All Rights Reserved.'},
  {sel:'#run-resume-overlay .run-resume-journey h2',key:'「旅程枠」見出し',fallback:'旅の進捗'},
  {sel:'#library-title span',key:'街「図書館」ボタン',fallback:'図書館'},
  {sel:'#library-exit-btn .rew-btn-label',key:'「図書館を出る」ボタン',fallback:'図書館から出る'},
  {sel:'#reward-production-ui .reward-prod-item h2',key:'「アイテム枠」見出し',fallback:'アイテム'},
  {sel:'#reward-production-ui .reward-prod-ring h2',key:'「指輪枠」見出し',fallback:'指輪'},
  {sel:'#reward-production-ui .reward-prod-quest h2',key:'「クエスト枠」見出し',fallback:'クエスト'},
  {sel:'#reward-production-ui .reward-prod-journey h2',key:'「旅程枠」見出し',fallback:'旅の進捗'},
  {sel:'#reward-production-ui .reward-prod-money h2',key:'「所持金枠」見出し',fallback:'所持金'},
  // **画面下のHUDにも同じ見出しが出る。**（戦闘・村・マップの3か所）
  // 以前は報酬枠の h2 しか指しておらず、シートを変えても画面の表示が変わらなかった。
  {sel:'.status-label-gold',key:'「所持金枠」見出し',fallback:'所持金'},
  {sel:'.status-label-life',key:'「ライフ枠」見出し',fallback:'ライフ'},
  // タイトルメニュー。**「ゲームスタート」はCtrlで「デバッグモード」へ差し替わる**ので、
  // 差し替えを戻す側（_syncTitleStartLabel）も同じシートの値を使うこと。
  {sel:'#title-menu .title-menu-item.game-start .title-menu-label',key:'ゲームスタート',fallback:'ゲームスタート'},
  {sel:'#title-continue-btn .title-menu-label',key:'コンティニュー',fallback:'コンティニュー'},
  {sel:'#title-menu .title-menu-item.online-battle .title-menu-label',key:'オンライン対戦',fallback:'オンライン対戦'},
  {sel:'#title-menu .title-menu-item.collection .title-menu-label',key:'コレクション',fallback:'コレクション'},
  {sel:'#title-menu .title-menu-item.title-quit .title-menu-label',key:'終了',fallback:'終了'},
  {sel:'#fatal-error-title',key:'「エラー発生時」見出し',fallback:'エラー'},
  {sel:'#fatal-error-back-btn',key:'「タイトルに戻る」ボタン',fallback:'タイトルに戻る'},
  {sel:'#title-options-btn,#battle-options-btn,#village-options-btn,#map-options-btn',attr:'title',key:'「オプション」見出し',fallback:'オプション'},
];
function applySheetDomTitles(){
  if(typeof document==='undefined'||typeof textMessage!=='function') return;
  SHEET_DOM_TITLES.forEach(def=>{
    let text=textMessage(def.key,'').trim();
    // シートの行名が変わる途中でも拾えるよう、旧い行名も順に見る（CSS側と同じ扱い）。
    (def.altKeys||[]).forEach(k=>{ if(!text) text=textMessage(k,'').trim(); });
    if(!text) text=String(def.fallback||'').trim();
    if(!text) return;
    document.querySelectorAll(def.sel).forEach(el=>{
      if(def.attr) el.setAttribute(def.attr,text);
      else el.textContent=text;
    });
  });
}
function applySheetCssTexts(){
  if(typeof document==='undefined'||typeof textMessage!=='function') return;
  SHEET_CSS_TEXTS.forEach(def=>{
    let text=textMessage(def.key,'').trim();
    // シートの行名が変わる途中でも拾えるよう、旧い行名も順に見る。
    (def.altKeys||[]).forEach(k=>{ if(!text) text=textMessage(k,'').trim(); });
    if(!text) return;
    // content は文字列リテラルなので、引用符とバックスラッシュを閉じないようにする。
    document.documentElement.style.setProperty(def.prop,
      `"${text.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`);
  });
}
function applyStatusTooltips(){
  if(typeof document==='undefined') return;
  STATUS_TOOLTIPS.forEach(def=>{
    const text=(typeof textMessage==='function'?textMessage(def.key,def.fallback)
      :String(def.fallback||'')).trim();
    if(!text) return;
    const title=(typeof textMessage==='function'&&def.titleKey
      ?textMessage(def.titleKey,def.title):String(def.title||'')).trim()||String(def.title||'');
    const targets=[];
    (def.values||[]).forEach(id=>{
      const el=document.getElementById(id);
      // 数字だけでなく「枠」全体をホバーの対象にする。
      const host=el&&el.closest?(el.closest('.battle-status-counter,.battle-counter,.reward-prod-tile')||el):null;
      if(host) targets.push(host);
    });
    (def.selectors||[]).forEach(sel=>{
      document.querySelectorAll(sel).forEach(el=>targets.push(el));
    });
    targets.forEach(el=>{
      el.setAttribute('data-preview',`${title}\n${text}`);
      el.removeAttribute('data-preview-norule');
      // 勝利・撤退の結果表示中もこの4つだけは出す（印は render.js が見る）。
      el.setAttribute('data-preview-status','1');
    });
  });
}

// ライフのハート1つぶんのHTML。絵は assets/ui/life.svg（index.html の symbol）。
// **輪郭は常に出し、減った枠は中身（life1）だけを隠す。** 枠の数は減らさない。
function lifeHeartHtml(filled){
  return `<span class="battle-life-heart ${filled?'battle-life-heart-filled':'battle-life-heart-empty'}">`
    +'<svg class="life-heart-icon life-heart-outline" aria-hidden="true"><use href="#sym-life-outline"></use></svg>'
    +'<svg class="life-heart-icon life-heart-fill" aria-hidden="true"><use href="#sym-life-fill"></use></svg>'
    +'</span>';
}
function updateHUD(){
  if(typeof SaveProfile!=='undefined') SaveProfile.owned();
  const _lifeMax=typeof waveLifeMax==='function'?waveLifeMax():3;
  const displayLife=Math.max(0,Math.min(_lifeMax,
    G._waveLife!=null ? Number(G._waveLife) : (G.life==null?3:Number(G.life))
  ));
  // 所持金はカウントアップ演出中の表示値を使い、3桁区切りで表示する。
  const _goldShown=typeof goldDisplayValue==='function'?goldDisplayValue():(Number(G.gold)||0);
  const battleGold=document.getElementById('battle-gold-value');
  if(battleGold) battleGold.textContent=Number(_goldShown).toLocaleString('ja-JP');
  const battleLife=document.getElementById('battle-life-value');
  if(battleLife){
    const life=displayLife;
    // 枠数（通常3／オンライン対戦5）を常に保持し、減少分だけ輪郭（♡）にする。
    // 枠自体を減らすと残数に応じて文字位置が詰まり、編成画面と異なる位置に見えるため。
    battleLife.innerHTML=Array.from({length:_lifeMax},(_,i)=>lifeHeartHtml(i>=_lifeMax-life)).join('');
  }
  // 所持金・ターン枠（編成画面と同じ#reward-production-ui .reward-prod-bottom）は
  // マップ・戦闘画面でも常時表示するため、reward.js側の描画を待たずここでも更新する。
  if(typeof _syncMoneyTurnTile==='function') _syncMoneyTurnTile();
  if(typeof renderBattleCounters==='function') renderBattleCounters();
  // 説明のホバーは枠を作り直すたびに貼り直す（描画で属性が消えることがある）。
  applyStatusTooltips();
  if(G._debugMode){
    // 画面切り替え直後はCSS適用前でoffsetが確定していないため、次フレームで位置を測る。
    // ここで即時計測すると、編成画面へ入った直後にデバッグボタンが一度上へ跳ねる。
    requestAnimationFrame(()=>{
      if(typeof G==='undefined'||!G||!G._debugMode) return;
      _positionDebugKillButton();
      _positionDebugMuteButton();
      _positionDebugFormationButton();
    });
  }
}
// 演出・戦闘の待ちをオプション画面の一時停止ゲートへ通す唯一の入口。
// setTimeoutを一発で予約せず、停止中は残り時間を進めない。
const sleep=(ms,options)=>new Promise(resolve=>{
  const skipSpeed=!!(options&&options.skipBattlePresentationSpeed);
  const speed=(!skipSpeed&&typeof getBattlePresentationSpeedScale==='function')
    ?getBattlePresentationSpeedScale():1;
  let remain=Math.max(0,Number(ms)||0)/speed,last=performance.now();
  const tick=()=>{
    const now=performance.now(),paused=document.body.classList.contains('options-open');
    if(!paused) remain-=now-last;
    last=now;
    if(remain<=0){resolve();return;}
    setTimeout(tick,Math.min(50,Math.max(1,remain)));
  };
  tick();
});

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
// ミュートボタンはオプションと編成の間へ固定配置する。
function _positionDebugMuteButton(){
  const btn=document.getElementById('battle-mute-btn');
  if(!btn||btn.style.display==='none') return;
  if(typeof isDebugMuted==='function'){
    btn.textContent=isDebugMuted()?'ミュート解除':'ミュート';
  }
}
// 編成画面ボタン（デバッグモード中のみ表示・オプションボタンの左に追従）
function _positionDebugFormationButton(){
  const btn=document.getElementById('battle-formation-btn');
  const opt=document.getElementById('battle-options-btn');
  if(!btn||!opt||btn.style.display==='none') return;
  if(opt.offsetWidth===0&&opt.offsetHeight===0) return;
  btn.style.left=(opt.offsetLeft-20-262)+'px';
  btn.style.top=(opt.offsetTop+(opt.offsetHeight-62)/2)+'px';
  btn.style.width='262px';
  btn.style.height='62px';
}
// デバッグ用ライフ変更（報酬／編成画面のみ表示）。3の次は1へ戻す。
function debugCycleLife(){
  if(!G||!G._debugMode) return;
  const key=G._waveLife==null?'life':'_waveLife';
  const current=Number(G[key]);
  const life=Number.isFinite(current)?current:3;
  G[key]=life>=3?1:life+1;
  if(typeof updateHUD==='function') updateHUD();
}
// マップ確認の入口は編成画面の「マップ確認」ボタン（#btn-debug-map）だけ。
// マップ表示中の「終了」ボタン（#map-debug-map-btn）で元の画面へ戻る。
function _setDebugMapButtonVisible(visible){
  const btn=document.getElementById('map-debug-map-btn');
  if(!btn) return;
  // **クラスで絞ること。** このボタンのCSSは display:block!important を持つので、
  // インラインの display:none では消えない（通常プレイのマップにも「終了」が出ていた）。
  // body.debug-mode は編成画面以外で外れるため、マップ画面では判定に使えない。
  btn.classList.toggle('is-debug-map-open',!!visible);
  btn.style.display=visible?'':'none';
}
function debugToggleMapLoop(){
  if(typeof G==='undefined'||!G||!G._debugMode) return;
  if(G._debugMapLoopActive){
    G._debugMapLoopActive=false;
    document.body.classList.remove('world-map-active');
    const mapScreen=document.getElementById('scr-map');
    if(mapScreen) mapScreen.classList.remove('active');
    showScreen(G._debugMapLoopReturnScreen||'battle');
    _setDebugMapButtonVisible(false);
    // **showScreen() は編成画面以外へ移るとデバッグUIを隠す。**
    // マップ確認から戻った時は、元の画面のデバッグUIを出し直す
    // （戻ると編成画面のデバッグボタンが全部消えていた）。
    if(typeof renderDebugCardPalette==='function') renderDebugCardPalette();
    if(typeof renderControls==='function') renderControls();
    return;
  }
  G._debugMapLoopActive=true;
  G._debugMapLoopReturnScreen=document.querySelector('.screen.active')?.id.replace(/^scr-/,'')||'battle';
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
  if(['battle','player','enemy'].includes(G.phase)){
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
  // イベント中（立ち絵・台詞が出ている間）なら、イベントを強制終了してから編成へ移る（背景も setup.webp）。
  if(typeof questForceEndEventForDebug==='function') questForceEndEventForDebug();
  document.body.classList.remove('village-screen-active','world-map-active');
  if(typeof _openWaveFormation==='function') _openWaveFormation();
}
window.addEventListener('resize',()=>{
  if(typeof G==='undefined'||!G._debugMode) return;
  _positionDebugKillButton();
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
  // デバッグでは黄金の壺を上段・中段の両端に1個ずつ、計4個持たせる（売却やショップの確認用。2026-09-25 利用者指定）。
  const cols=typeof MAIN_BOARD_COLS==='number'?MAIN_BOARD_COLS:5;
  [0,cols-1,cols,cols*2-1].forEach(i=>{
    if(i<0||i>=G.mainBoard.length||G.mainBoard[i]) return;
    const pot=makePanel('黄金の壺')||makePanel('panel_golden_vase');
    if(pot) G.mainBoard[i]=pot;
  });
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
// ── ポータルの巻物：ウェーブ進行での「直前の村」 ────────────────
// 村は旅の進捗の街（city）マス。**ワールドマップではなくこの進行が正**なので、
// 現在地より前の city マスを後ろから探す（同じSceneに無ければ前のSceneの最後の村）。
// 見つからない＝まだ村を1つも通っていない（＝出発直後）。
function _wavePreviousVillage(){
  const wave=Math.max(1,Number(G&&G._wave)||1);
  const stage=Math.max(1,Number(G&&G._waveStage)||1);
  for(let w=wave;w>=1;w--){
    const route=_waveRouteForWave(w)||[];
    // 現在のSceneでは「現在地より前」だけを見る。前のSceneは最後まで見る。
    const from=w===wave?stage-1:route.length;
    for(let i=Math.min(from,route.length);i>=1;i--){
      if(route[i-1]==='city') return {wave:w,stage:i};
    }
  }
  return null;
}
// 直前の村へ戻る。**進行は巻き戻さない**（「再出発時は現在位置の次の場所に移動する」）ので、
// 使った時点の位置を控えておき、村を出る時に戻す。
function warpToPreviousWaveVillage(){
  const target=_wavePreviousVillage();
  if(!target) return false;
  G._waveResumeStage={wave:Math.max(1,Number(G._wave)||1),stage:Math.max(1,Number(G._waveStage)||1)};
  if(typeof _consumePendingMapItemUse==='function') _consumePendingMapItemUse();
  G._wave=target.wave;
  _openWaveVillage(target.stage,false);
  return true;
}

// ステージ1は先頭が村でエリート・街が1つ後ろにずれるため、stage番号の決め打ちではなく
// ルート（_journeyRouteForScene）から種別を引く。
function _waveBattleType(stage){
  // Scene 5のstage5はルートに載せていない伏せられたラスボス戦。
  if(Number(G&&G._wave)===5&&Number(stage)===5) return 'boss';
  const node=_waveRouteNode(stage);
  if(node==='elite') return 'elite';
  if(node==='boss') return 'boss';
  return 'battle';
}
// ── BGMの先読み ────────────────────────────────────────
// BGMはWeb Audio（波形を全部読んでから鳴らす）ため、鳴らす瞬間に読み込むと
// 頭が無音になる。**「次に鳴る曲」が決まった時点で先に読ませる。**
// 先読みの置き場所はここだけにする（audio.js は warmBgm() を提供するだけ）。
function _battleBgmKeyForStage(stage){
  // 伏せられたラスボス戦（Scene5 stage5）は専用曲。
  if(Number(G&&G._wave)===5&&Number(stage)===5) return 'battle4';
  const type=typeof _waveBattleType==='function'?_waveBattleType(stage):'battle';
  return type==='boss'?'battle3':'battle1';
}
// 村・塔にいる間に、次の戦闘曲を読み込んでおく。
function warmNextBattleBgm(){
  if(typeof warmBgm!=='function') return;
  const stage=Number(G&&G._waveStage)||1;
  const node=typeof _waveRouteNode==='function'?_waveRouteNode(stage):'battle';
  // 村（city）のマスからは次のマスが戦闘。それ以外は今のマスがそのまま次の戦闘。
  warmBgm(_battleBgmKeyForStage(node==='city'?stage+1:stage));
}
// 同じ戦闘への再挑戦か。敗北時に控えた敵（_waveEnemySnapshot）をそのまま使える時が再挑戦。
// **ボタンの文言（「再戦」）と、開幕の背景移動を止める判定の両方でこれを使う。**
function _waveRetryPending(stage){
  if(typeof G==='undefined'||!G||G._testBattleMode) return false;
  if(!Array.isArray(G._waveEnemySnapshot)) return false;
  const st=Math.max(1,Number(stage!=null?stage:G._waveStage)||1);
  // **種別（elite/boss）までは比べない。** デバッグのステージ移動で戦った戦闘は、
  // ルートから引ける種別と実際の戦闘種別が食い違うことがあり、
  // 一致条件に入れると再挑戦と判定できなかった。
  const prefix=`${Math.max(1,Number(G._wave)||1)}:${st}:`;
  return String(G._waveRetryEnemyKey||'').startsWith(prefix);
}
// 通常戦の既存の割り当ては保ち、ステージ1〜4のエリート／ボスだけを読み替える。
function _waveDeepLevelForStory(stage,wave,type,first,repeat){
  if(wave>=1&&wave<=4){
    if(type==='elite') return 3;
    if(type==='boss') return first?6:7;
  }
  // ステージ5は深層4段（シート）。村→通常戦（深層1）→通常戦（深層2）→ボス（深層3）→伏せられたラスボス（深層4）。
  if(wave===5) return ({2:1,3:2,4:3,5:4})[stage]||1;
  // ステージ1は先頭のリーゼの分だけ各マスが1つ後ろにずれる。
  if(wave===1){
    const t1=repeat
      ?{2:1,3:2,4:2,6:3,7:4,8:5,9:6,10:6}
      :{2:1,3:2,4:2,6:4,7:5,8:6,9:6};
    return t1[stage]||1;
  }
  // Scene 2～4も1周目は街後の深層3の戦闘を省き、深層4～6とボスを保つ。
  const table=first?{1:1,2:2,3:2,5:4,6:5,7:6,8:6}:{1:1,2:2,3:2,5:3,6:4,7:5,8:6,9:6};
  return table[stage]||1;
}
function _waveDeepLevel(stage,waveOverride,typeOverride){
  const wave=Number(waveOverride==null?(G&&G._wave):waveOverride)||0;
  const type=typeOverride||_waveRouteNode(stage,wave);
  return _waveDeepLevelForStory(stage,wave,type,
    typeof isFirstStoryRun==='function'&&isFirstStoryRun(),
    typeof isRepeatStoryRun==='function'&&isRepeatStoryRun());
}
function _waveStageFloor(wave,stage,typeOverride){
  return floorForMapDeep(Math.max(1,Number(wave)||1),_waveDeepLevel(stage,wave,typeOverride));
}
// コレクション用。通常の出現経路にある深層だけを周回別に列挙する。
function _waveEnemyStatFloors(wave,types){
  const base=wave===1?SCENE1_REPEAT_ROUTE:(wave===5?SCENE_FLOW_DATA.final:SCENE_FLOW_DATA.standard);
  const modes=wave===5?[{first:false,repeat:true},{first:false,repeat:false}]
    :[{first:true,repeat:false},{first:false,repeat:true},{first:false,repeat:false}];
  const floors=new Set();
  modes.forEach(({first,repeat})=>{
    const route=first?_journeyFirstRunRoute(base):base;
    route.forEach((type,index)=>{
      if(types.includes(type)) floors.add(floorForMapDeep(wave,_waveDeepLevelForStory(index+1,wave,type,first,repeat)));
    });
    if(wave===5&&types.includes('boss')) floors.add(floorForMapDeep(wave,_waveDeepLevelForStory(5,wave,'boss',first,repeat)));
  });
  return [...floors];
}
// 編成・報酬画面の背景動画（setup.webm）を再開する。
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
  // 指輪提示のままになる。
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
  // 「元に戻す」の戻り先も、報酬枠を空にした状態で取り直す。goToReward() が報酬を引いた時点の
  // スナップショットのままだと、デバッグの編成で「元に戻す」を押した時に報酬カードが出てきた。
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
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
}
// ルート上のcity：村（ショップ・クエスト受託）
function _openWaveVillage(stage,eliteWon,options){
  // ここでshowScreen('battle')を呼ぶとG.phaseがまだ戦闘中の値のためbattle1.wavが再生されてしまう。
  // 画面切り替えはopenMapVillage()（入場演出）側に任せる。
  G._waveStage=stage;
  G._waveVillage=true;
  G._waveEliteWon=!!eliteWon;
  G._isWaveAltar=false;
  G.phase=null;
  if(typeof openMapVillage==='function') return openMapVillage({intro:true,...(options||{})});
}
// ルート上のaltar：祭壇（鍛冶・指輪交換）
function _openWaveAltar(stage,options){
  // 塔も村と全く同じ形式（#scr-village＋入場演出）。showScreen('battle')は呼ばない
  // （呼ぶとG.phaseがまだ戦闘中の値のためbattle1/battle3が一瞬鳴ってしまう）。
  G._waveStage=stage;
  G._waveVillage=true;
  G._isWaveAltar=true;
  G.phase=null;
  if(typeof openMapVillage==='function') return openMapVillage({intro:true,tower:true,...(options||{})});
}
function _startWaveBattle(stage){
  // 店の人（ショップのBキャラ）を戦闘画面へ持ち込まない。
  if(typeof _clearShopPortrait==='function') _clearShopPortrait();
  // 試験戦闘の終了操作と通常の戦闘開始が近接しても、試験用の敵・終了処理を
  // 次の通常戦闘へ持ち越さない。通常開始側を最終的なフラグ境界にする。
  G._testBattleMode=false;
  G._testBattleAbort=false;
  G._testBattleSavedFloor=null;
  G._libraryTestBattleMode=false;
  document.body.classList.remove('test-battle-active');
  const questSpec=typeof questBattleStartSpec==='function'?questBattleStartSpec(stage):null;
  const type=questSpec&&questSpec.type||_waveBattleType(stage);
  const wave=Math.max(1,Number(G._wave)||1);
  // showScreen('battle') が描画される前に背景位置を確定する。
  // 通常戦闘では、開幕演出側のクラス付与を待つと一瞬だけ既定位置（上寄り）が見える。
  // **再戦では背景移動をしない**（通常戦闘と同じ入り方にする）。同じ演出を
  // 繰り返し見せられるのを避けるため。判定は _waveRetryPending() が唯一の実装。
  G._waveIsRetry=_waveRetryPending(stage);
  const battleHost=document.getElementById('scr-battle');
  if(battleHost){
    battleHost.classList.remove('battle-bg-normal','battle-bg-reveal','battle-bg-scroll-ready','battle-bg-scrolling');
    battleHost.classList.add((type==='elite'||type==='boss')&&!G._waveIsRetry?'battle-bg-reveal':'battle-bg-normal');
    // **画面が出る前に寄せておく**（エリート／ボス）。出てから寄せると動きが見える。
    // **種別は必ず渡す。** ここは G._waveBattleType を書き込む前なので、
    // 省略すると前の戦闘の種別で判定してしまう。
    // クエストの続きの戦闘（魔狼に挑む）は今の画面のまま続けるので、寄せ・暗転の準備をしない。
    // 通常戦闘の準備は画面を黒で覆ってから開幕演出で明けるが、続きの戦闘は開幕演出を出さないため
    // 黒いまま残っていた（2026-09-25 利用者指摘）。
    if(!questSpec&&typeof prepareBattleIntroFocus==='function') prepareBattleIntroFocus(type);
  }
  // 保存表示のために暗転を足したり延ばしたりしない（2026-09-27 利用者指定）。
  // 強敵戦など、もともと暗転しない入口では、表示は暗転なしで高速に出て消える。
  G._waveVillage=false;
  G._isWaveAltar=false;
  // **次に鳴る曲を戦闘中に読み込んでおく。**（_isWaveAltarを倒した後で判定すること）
  // ボス戦（Scene1〜4）に勝つと必ず塔（祭壇）へ直行するので、塔の曲を先に読む
  // （tower.wavは31MBあり、勝ってから読むと塔の入場に間に合わない）。
  // それ以外の次は報酬画面のmenu、その先はこのSceneの街。
  if(typeof warmBgm==='function'){
    if(type==='boss'&&wave<5) warmBgm('tower');
    else{
      warmBgm('menu');
      const nextVillage=typeof _villageBgmSetting==='function'?_villageBgmSetting():null;
      if(nextVillage&&nextVillage.key) warmBgm(nextVillage.key);
    }
  }
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
  G._mapBattle={mapIndex:wave,nodeId:questSpec&&questSpec.nodeId||null,type,
    floor:questSpec&&questSpec.floor!=null?questSpec.floor:_waveStageFloor(wave,stage),
    forcedBoss:!!(questSpec&&questSpec.forcedBoss),normalBattleNo:stage===1?1:stage===2?2:0,turn:0};
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
  // オンラインの編成マスで敗れたクエスト戦は、サーバーへ準備完了を送る前に
  // 同じ対象戦を再開する。送信してしまうとraw stageが進み、受託済みQ004の
  // 対象を二度と踏めなくなる。
  if(G._onlineMode&&typeof questEncounterBattlePending==='function'
    &&questEncounterBattlePending(Number(G._waveStage)||1)){
    if(typeof setOnlineFlowPaused==='function') setOnlineFlowPaused(true);
    _startWaveBattle(Number(G._waveStage)||1);
    return true;
  }
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
  // ポータルの巻物で戻ってきた場合は、使った時点の位置から再開する
  // （「再出発時は現在位置の次の場所に移動する」）。村へ戻った分だけ進行を
  // 巻き戻さないよう、ここで控えを戻してから通常の進行判定に入る。
  if(G._waveResumeStage){
    const resume=G._waveResumeStage;
    G._waveResumeStage=null;
    G._wave=Math.max(1,Number(resume.wave)||1);
    G._waveStage=Math.max(1,Number(resume.stage)||1);
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
      // 1周目は五聖の座／Scene 5へ進まず、蝕界の塔で帰宅エンドにする。
      // 通常は塔到着会話がこの前に開始するが、データ欠落時の保険もここで保つ。
      if(typeof isFirstStoryRun==='function'&&isFirstStoryRun()){
        gameOver({clear:true,firstRunClear:true});
        return true;
      }
      // 蝕界の塔の後は、五聖の座で過半数（2回）の承認を得たランだけ
      // 伏せられた Scene 5 へ進む。それ以外はここで通常の踏破とする。
      if(typeof fiveSaintsShouldAdvanceToStageFive==='function'&&fiveSaintsShouldAdvanceToStageFive()){
        G._wave=5;
        _openWaveVillage(1,false);
      }else gameOver({clear:true});
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
      _openWaveVillage(cityStage,true,{autosaveMode:'battleProgress'});
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
    // ラスボス撃破：通常はfinishBattleAsVictory()側で先にエンディング（movie4→結果画面）へ入るため、ここは保険。
    // 旧「DUNGEON CLEAR」画面（#scr-clear）は廃止済み。
    void startFinalBossClearSequence();
    return true;
  }
  if(type==='boss'){
    // Scene 1～4の地域ボス勝利：報酬なしで次のaltarへ直行。
    runTransition(()=>{
      G._mapBattle=null; G._waveBattleType=null;
      if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
      G.enemies=[]; G.phase=null;
      const route=_waveRouteForWave(wave);
      const altarStage=Math.max(stage+1,route.indexOf('altar')+1);
      _openWaveAltar(altarStage,{autosaveMode:'battleProgress'});
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
  // 台詞待ちの間に敗北判定が再入しても、二重に決着を始めない。
  if(G._battleDefeatHandled) return true;
  G._battleDefeatHandled=true;
  const questDefeat=typeof questPrepareBattleDefeat==='function'?questPrepareBattleDefeat():null;
  void _finishWaveBattleDefeat(questDefeat);
  return true;
}

async function _finishWaveBattleDefeat(questDefeat){
  const battleKey=`${Number(G._wave)||1}:${Number(G._waveStage)||1}:${String(G._waveBattleType||'')}`;
  // 追撃戦はこのマスで決着する。通常戦だけ同じ敵への再戦鍵を残す。
  if(questDefeat&&questDefeat.noRetry){
    G._waveRetryEnemyKey=null;
    G._waveIsRetry=false;
  }else{
    G._waveRetryEnemyKey=battleKey;
  }
  G._waveLife=Math.max(0,(G._waveLife==null?(typeof waveLifeMax==='function'?waveLifeMax():3):Number(G._waveLife))-1);
  // **敗北のたびに報酬の抽選鍵を進める。**
  // 報酬は`reward:<場面>:<段>`の鍵付き乱数で引くので（開き直しても同じ5枚にするため）、
  // 敗北して同じ場面・段のまま報酬画面へ入ると、直前と全く同じ5枚が出てしまう。
  // ランに保存される回数を鍵へ足して、敗北後は別の5枚にする。
  G._waveDefeatCount=(Number(G._waveDefeatCount)||0)+1;
  // **敗北しても持ち物は巻き戻さない。**（ペナルティはライフ1つだけ）
  // 以前はここで所持金・アイテム・指輪・魔導板強化を「直前の画面の開始時点」へ
  // 戻していたが、**戻る先の画面そのものが無くなっている**（下の returnTo は
  // 常に 'reward'）。進行だけ先へ進んで持ち物が戻るため、
  // 「永劫の巻物を使って戦ったのに、戦闘後に巻物が復活してマスが元へ戻る」
  // といった辻褄の合わない状態になっていた。
  // 盤面に残る敵の敗北台詞 → クエストの追加台詞の順。
  // 敵やスロットを消す前に待つことで、吹き出しの尻尾も話者の位置に合う。
  try{
    if(typeof playBattlePlayerDefeatLines==='function') await playBattlePlayerDefeatLines();
    if(questDefeat&&typeof questPlayBattleDefeatDialogue==='function'){
      await questPlayBattleDefeatDialogue(questDefeat);
    }
  }catch(error){
    console.error('[battle defeat dialogue]',error);
  }
  if(G._waveLife<=0){
    G._battleDefeatHandled=true;
    // オンライン対戦：CPU戦でのゲームオーバーもサーバーへ通知する（相手には通知されない仕様）。
    if(G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch&&OnlineMatch.isActive()){
      G._onlinePerfectWin=false;
      void OnlineMatch.reportGameOver();
    }
    gameOver();
    return;
  }
  if(typeof _removeAbsentKiemetsuCards==='function') _removeAbsentKiemetsuCards();
  if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
  G.enemies=[];
  // 通常敗北は同じステージの再戦。追撃戦は「進む」後にクエスト側が
  // finishWaveBattleVictory() へ渡すため、それまで現在ステージ情報を保持する。
  if(!questDefeat){ G._mapBattle=null; G._waveBattleType=null; }
  G._battleDefeatHandled=false;
  G._waveWithdraw=true;
  // showVictoryOverlay()はG.phase==='reward'を要求するためここで先に立てるが、
  // 実際の画面構築（村/祭壇/新規報酬5枚）は「Withdraw」が消えた後のコールバックで行う。
  G.phase='reward';
  if(typeof updateHUD==='function') updateHUD();
  // 敗北後は必ず報酬付き編成画面へ進む（村・祭壇へは戻さない）。
  showVictoryOverlay(()=>{
    G._battleDefeatHandled=true;
    G._waveWithdraw=false;
    G._waveRewardCount=null;
    G.phase=null;
    if(questDefeat&&typeof questFinishBattleDefeat==='function'){
      return questFinishBattleDefeat(questDefeat);
    }
    if(typeof goToReward==='function') return goToReward({checkpoint:true});
  });
}
// ── オープニングムービー ─────────────────────────────────────
// タイトルで「初めて」ゲームスタートを押した時だけ流す。
// ゲームオーバー等で一度タイトルへ戻った後は、再度押しても流さない。
// G は startGame() の initState() で作り直されるため、再生済みフラグはシステムセーブから読む。
let _openingMovieShown = typeof SaveProfile!=='undefined'&&typeof SaveProfile.openingMovieShown==='function'
  ? SaveProfile.openingMovieShown() : false;
const OPENING_MOVIE_SRC = 'assets/movies/movie1.webm';
const OPENING_MOVIE_FADE_START = 7;    // 秒。ここからフェードアウトを開始する
const OPENING_MOVIE_TAIL_MARGIN = 400; // ms。動画が終わる何ms前までに真っ黒にするか
const FINAL_BOSS_MOVIE_SRC = 'assets/movies/movie3.webm';
const GAME_CLEAR_MOVIE_SRC = 'assets/vfx/game_clear.webm';
const FINAL_CLEAR_MOVIE_SRC = 'assets/movies/movie4.webm'; // ラスボス撃破後のエンディング動画
const SECOND_RUN_INTRO_PROFILE_KEY='story:second-run-intro';
const SECOND_RUN_INTRO_HOLD_MS=3000;
const SECOND_RUN_INTRO_FADE_MS=800;

function _ensureSecondRunIntroEl(){
  let el=document.getElementById('second-run-intro');
  if(el) return el;
  el=document.createElement('div');
  el.id='second-run-intro';
  el.setAttribute('aria-hidden','true');
  const text=document.createElement('div');
  text.className='second-run-intro-text';
  el.appendChild(text);
  document.body.appendChild(el);
  return el;
}

// 初クリア後の最初のゲーム開始だけ、黒地の文章を出してから
// それを消しつつ通常のオープニング再生へ渡す。
async function _playSecondRunOpeningSequence(){
  const el=_ensureSecondRunIntroEl();
  const label=el.querySelector('.second-run-intro-text');
  if(label) label.textContent=typeof textMessage==='function'?textMessage('二周目開始演出',''):'';
  el.setAttribute('aria-hidden','false');
  el.classList.remove('is-visible','is-leaving');
  document.body.classList.add('second-run-intro-active');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  el.classList.add('is-visible');
  await sleep(SECOND_RUN_INTRO_HOLD_MS);
  el.classList.add('is-leaving');
  const movie=_playOpeningMovie();
  await sleep(SECOND_RUN_INTRO_FADE_MS);
  el.classList.remove('is-visible','is-leaving');
  el.setAttribute('aria-hidden','true');
  document.body.classList.remove('second-run-intro-active');
  await movie;
}

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
  document.body.classList.add('cutscene-video-active');
  const wait = ms => sleep(ms);
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
    document.body.classList.remove('cutscene-video-active');
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
  document.body.classList.add('cutscene-video-active');
  const wait=ms=>sleep(ms);
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
    document.body.classList.remove('cutscene-video-active');
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
// **シートの「ゲームスタート」を唯一の出どころにする。**
// 固定文字列に戻すと、Ctrlを離した瞬間だけシートの文言から外れる。
const TITLE_START_LABEL_FALLBACK='ゲームスタート';
const _titleStartLabel=()=>(typeof textMessage==='function'
  ?textMessage('ゲームスタート',TITLE_START_LABEL_FALLBACK)
  :TITLE_START_LABEL_FALLBACK).trim()||TITLE_START_LABEL_FALLBACK;
const TITLE_DEBUG_LABEL='デバッグモード';
// この2件はデバッグ専用で、テキストメッセージシートに行を持たない。
const TITLE_ONLINE_DEBUG_LABEL_FALLBACK='デバッグオンライン';
const _titleDebugLabel=()=>TITLE_DEBUG_LABEL;
const _titleOnlineDebugLabel=()=>TITLE_ONLINE_DEBUG_LABEL_FALLBACK;
function _syncTitleStartLabel(){
  const title=document.getElementById('scr-title');
  if(title) title.classList.toggle('title-debug-ready',_titleCtrlHeld);
  const label=document.querySelector('#title-menu .title-menu-item.game-start .title-menu-label');
  if(label) label.textContent=_titleCtrlHeld?_titleDebugLabel():_titleStartLabel();
  const onlineLabel=document.querySelector('#title-menu .title-menu-item.online-battle .title-menu-label');
  if(onlineLabel) onlineLabel.textContent=_titleCtrlHeld?_titleOnlineDebugLabel():
    (typeof textMessage==='function'?textMessage('オンライン対戦','オンライン対戦'):'オンライン対戦').trim()||'オンライン対戦';
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
  const debugOnline=!!_titleCtrlHeld;
  _titleCtrlHeld = false;
  _syncTitleStartLabel();
  if(typeof playSfx === 'function') playSfx('gameStart', { guardKey:'ui:title-online' });
  startGame(debugOnline, true);
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
  const hasCleared=typeof SaveProfile!=='undefined'&&SaveProfile
    &&typeof SaveProfile.hasClearedRun==='function'&&SaveProfile.hasClearedRun();
  // 1周目はオープニングを再生せず、そのままリーゼから始める。
  if(!hasCleared){ startGame(); _startingFromTitle=false; return; }
  // オプションからシステムデータを削除した直後も、保存媒体の状態を反映する。
  if(typeof SaveProfile!=='undefined'&&typeof SaveProfile.openingMovieShown==='function'){
    _openingMovieShown=SaveProfile.openingMovieShown();
  }
  const secondRunIntroShown=typeof SaveProfile!=='undefined'&&SaveProfile
    &&typeof SaveProfile.tutorialShown==='function'&&SaveProfile.tutorialShown(SECOND_RUN_INTRO_PROFILE_KEY);
  if(!secondRunIntroShown){
    _openingMovieShown=true;
    // 演出開始時点で両方を記録し、スキップや動画エラーでも二重に出さない。
    if(typeof SaveProfile!=='undefined'){
      if(typeof SaveProfile.markTutorialShown==='function') SaveProfile.markTutorialShown(SECOND_RUN_INTRO_PROFILE_KEY);
      if(typeof SaveProfile.markOpeningMovieShown==='function') SaveProfile.markOpeningMovieShown();
    }
    void _playSecondRunOpeningSequence().then(()=>{
      if(startToken!==_titleStartToken) return;
      startGame(); _startingFromTitle=false;
    });
    return;
  }
  if(_openingMovieShown){ startGame(); _startingFromTitle = false; return; }
  _openingMovieShown = true;
  // 再生開始時点で保存する。スキップ・動画エラーでも再生済みとして扱う。
  if(typeof SaveProfile!=='undefined'&&typeof SaveProfile.markOpeningMovieShown==='function'){
    SaveProfile.markOpeningMovieShown();
  }
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
  G._debugMode=!!debugMode;
  G._onlineMode=!!onlineMode;
  G._debugOnline=!!(debugMode&&onlineMode);
  if(typeof SaveRun!=='undefined') SaveRun.begin();
  G.runStats={
    startedAt:performance.now(), playedMs:0, areaName:'', finalBattle:'', allyDeaths:0, enemyKills:0,
    maxDamage:{amount:0,type:''}, maxAtk:0, maxHp:0
  };
  // デバッグモードでは初期カードを配らず、9999のゴーレムだけを置く。
  if(!debugMode) _giveInitialRandomBoardCards();
  window.__vesselboundRetryRewards=null;
  G._debugMode=!!debugMode;
  if(G._debugMode){
    // デバッグ試験戦闘の実機計測専用。通常モードでは公開しない。
    window.__vesselboundDebugState=G;
    _giveDebugGolem();
    const dbg=document.getElementById('btn-debug-kill');
    if(dbg) dbg.style.display='';
    const muteBtn=document.getElementById('battle-mute-btn');
    if(muteBtn) muteBtn.style.display='';
    const formBtn=document.getElementById('battle-formation-btn');
    if(formBtn) formBtn.style.display='';
    _setDebugMapButtonVisible(true);
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
  // 前回のオンライン対戦を必ず畳んでから始める（後片付けは exitOnlineMode が唯一の実装）。
  if(typeof exitOnlineMode==='function') exitOnlineMode();
  else if(typeof OnlineMatch!=='undefined'&&OnlineMatch&&typeof OnlineMatch.reset==='function') OnlineMatch.reset();
  G._onlineMode=!!onlineMode;
  // **exitOnlineMode() がデバッグオンラインの印も消すので、ここで立て直す。**
  // 立て直さないと OnlineMatch.start() に unlimitedTime:false が渡り、編成から制限時間が付く。
  G._debugOnline=!!(debugMode&&onlineMode);
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
  G._waveDefeatCount=0; // 報酬の抽選鍵に足す敗北回数（handleWaveBattleDefeat()で進める）
  if(G._onlineMode){
    // 仕様：マッチングが成立するまではタイトル画面のまま待つ（画面を切り替えない）。
    // 4人揃った後の進行（編成画面へ）は flow.js がサーバー状態を見て行うので、
    // ここで primeOnlineFlow() は呼ばない（呼ぶと成立後の遷移が飛ぶ）。
    G._wave=1; G._waveStage=1;
    if(typeof OnlineMatch!=='undefined'&&OnlineMatch){
      // 表示キーではなく、未設定時の内部プレイヤーID。
      const defaultSelfId='あなた';
      void OnlineMatch.start({seedSource:`vb-${Date.now()}`,selfId:(G._onlineSelfId||defaultSelfId),
        unlimitedTime:G._debugOnline});
    }
    if(typeof showOnlineMatching==='function') showOnlineMatching();
    return;
  }
  // デバッグの初回開始だけは従来どおり到着会話を省く。旅程から選び直した時は再生する。
  _openWaveVillage(1,false,{autosaveMode:'runStart',skipStoryArrival:!!debugMode});
}

function _runStatsAreaName(){
  // 到達地点は「地域情報」シートの道の名前。街より前なら「街までの名前」、
  // 街を出た後（塔へ向かう区間）なら「塔までの名前」を使う（戦闘カットインの副題と同じ）。
  const routeName=typeof _waveBattleRouteName==='function'?String(_waveBattleRouteName()||'').trim():'';
  if(routeName) return routeName;
  return String(G.areaName||G.mapAreaName||G.floorName||`${G.floor||1}階`);
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
// **プレイ時間は「積算（playedMs）＋今回の起動からの経過」で数える。**
// performance.now()はページを読み込み直すと0へ戻るため、startedAtだけで数えると
// コンティニューのたびにプレイ時間が0へ戻る。保存の直前に今回分をplayedMsへ畳み、
// 復元後はplayedMsから続きを数える。
function _runStatsElapsedMs(){
  if(!G.runStats) return 0;
  const base=Math.max(0,Number(G.runStats.playedMs)||0);
  const started=Number(G.runStats.startedAt);
  const session=Number.isFinite(started)?Math.max(0,performance.now()-started):0;
  return base+session;
}
// セーブへ書き出す前に、今回の起動分をplayedMsへ畳んで時計を打ち直す。
function _flushRunStatsPlayTime(){
  if(!G.runStats) return;
  G.runStats.playedMs=_runStatsElapsedMs();
  G.runStats.startedAt=performance.now();
}
function _runStatsTimeText(){
  const sec=Math.max(0,Math.floor(_runStatsElapsedMs()/1000));
  return `${Math.floor(sec/60)} : ${String(sec%60).padStart(2,'0')}`;
}
function _animateGameOverNumber(id,target,duration=650,formatter=n=>String(Math.floor(n)),delay=0){
  const el=document.getElementById(id); if(!el) return;
  const end=Math.max(0,Number(target)||0);
  el.textContent=formatter(0);
  window.setTimeout(()=>{
    // **数え上げ中に文字幅が変わると、項目の列幅（max-content）と中央寄せの位置が毎フレーム変わり、
    // 「難易度」など全ての行が左右に震える。** 最終値の幅を先に確保してから数え始める。
    // 前回の結果画面で確保した幅が残らないよう、毎回外してから測り直す。
    el.style.minWidth='';
    el.textContent=formatter(end);
    const cs=getComputedStyle(el);
    const extra=cs.boxSizing==='border-box'?0
      :(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0)+(parseFloat(cs.borderLeftWidth)||0)+(parseFloat(cs.borderRightWidth)||0);
    const finalWidth=el.offsetWidth-extra;
    if(finalWidth>0) el.style.minWidth=`${Math.ceil(finalWidth)}px`;
    el.textContent=formatter(0);
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
// デバッグ：進行不能エラーの画面をそのまま出す（本番と同じ経路を通す）。
function debugShowError(){
  if(typeof G==='undefined'||!G||!G._debugMode) return;
  showFatalError('MN-X0',new Error('デバッグ：エラー画面の確認'));
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
  document.body.classList.remove('gameover-active','game-clear-active','game-clear-first-run','gameover-ui-pending','battle-victory-pending','right-card-peek');
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
  if(G.enemies.filter(e=>e&&e.hp>0).length===0) _onAllEnemiesDefeated();
}

function gameOver(options){
  if(typeof questDeferGameOver==='function'&&questDeferGameOver(options)) return;
  // game_over.webm と戦闘終了の暗転は #scr-battle 内にある。
  // 街・店での非戦闘死亡も、結果枠を組み立てる前に同じ画面へ移す。
  if(!document.querySelector('#scr-battle.active')&&typeof showScreen==='function') showScreen('battle');
  const isLibraryTestBattle=!!(G&&G._libraryTestBattleMode);
  // 敗北・踏破の結果画面へ移る前に、戦闘中の一時VFXを必ず破棄する。
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
  const opt=options||{};
  const isClear=opt.clear===true;
  const firstRunClear=isClear&&opt.firstRunClear===true&&!(G&&G._onlineMode);
  if(!isLibraryTestBattle&&!G._debugGameOver&&typeof SaveRun!=='undefined') SaveRun.finish(isClear?'clear':'gameover');
  const isDebugGameOver=!!G._debugGameOver;
  document.body.classList.remove('debug-mode');
  ['btn-debug-kill','btn-debug-gameover','btn-debug-quest','btn-test-battle','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'].forEach(debugId=>{
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
  // **表示文はテキストメッセージシート（クリア、ゲームオーバー）が唯一の出どころ。**
  const _msg=(key,fallback)=>typeof textMessage==='function'?textMessage(key,fallback):fallback;
  [['go-difficulty','「難易度」見出し','難易度'],['go-area','「到達地点」見出し','到達地点'],
    ['go-final','「最終戦闘」見出し','最終戦闘'],['go-allyDeaths','「味方死亡回数」見出し','味方死亡回数'],
    ['go-damage','「最大ダメージ」見出し','最大ダメージ'],['go-stats','「最大ステータス」見出し','最大ステータス'],
    ['go-time','「プレイ時間」見出し','プレイ時間']].forEach(([id,key,fallback])=>{
    const label=document.getElementById(id)?.previousElementSibling;
    if(label&&label.tagName==='B') label.textContent=_msg(key,fallback);
  });
  // 到達地点は地域情報シートの道の名前（_runStatsAreaName）。
  document.getElementById('go-area').textContent=G.runStats.areaName;
  document.getElementById('go-final').textContent=G.runStats.finalBattle||'—';
  document.getElementById('go-difficulty').textContent=_msg('難易度ノーマル','ノーマル');
  document.getElementById('go-time').textContent=G.runStats.playTime||'0 : 00';
  _animateGameOverNumber('go-allyDeaths',G.runStats.allyDeaths,600,undefined,800);
  _animateGameOverNumber('go-damage',G.runStats.maxDamage?.amount,700,n=>`${Math.floor(n)} ダメージ${G.runStats.maxDamage?.type?`（${G.runStats.maxDamage.type}）`:''}`,1000);
  _animateGameOverPair('go-stats',G.runStats.maxAtk,G.runStats.maxHp,700,1100);
  const resultTitle=document.querySelector('#gameover-results h1');
  // オンライン対戦で相手のライフを0にした場合は「踏破」ではなく「完全勝利」と表示する。
  const _perfect=!!(G&&G._onlineMode&&G._onlinePerfectWin);
  if(resultTitle) resultTitle.textContent=isClear
    ?(_perfect?_msg('オンライン対戦「完全勝利」見出し','完全勝利')
      :firstRunClear?_msg('「クリア」見出し（一周目）',''):_msg('「クリア」見出し','踏破'))
    :_msg('「ゲームオーバー」見出し','旅の終焉');
  const back=document.getElementById('gameover-back-btn');
  if(back){
    back.textContent=G._gameOverSpecialDebug
      ?'編成画面に戻る'
      :_msg('「タイトルに戻る」ボタン','タイトルに戻る');
    back.onclick=()=>{
      if(typeof playSfx==='function') playSfx('uiConfirmHeavy',{group:'ui',guardKey:'ui:gameover-back'});
      if(G._gameOverSpecialDebug) returnFromDebugGameOver();
      else{ closeGameOverOverlay(); _returnToTitleMenu(); }
    };
  }
  const retry=document.getElementById('gameover-retry-btn');
  if(retry) retry.textContent=_msg('「再挑戦」ボタン','再挑戦');
  if(retry) retry.onclick=()=>{
    if(typeof playSfx==='function') playSfx('uiConfirmHeavy',{group:'ui',guardKey:'ui:gameover-retry'});
    closeGameOverOverlay();
    startGame(!!G._debugMode);
  };
  const continueBtn=document.getElementById('gameover-continue-btn');
  if(continueBtn) continueBtn.textContent=_msg('「続ける」ボタン','続ける');
  if(continueBtn) continueBtn.onclick=()=>{
    if(typeof playSfx==='function') playSfx('uiConfirmHeavy',{group:'ui',guardKey:'ui:gameover-continue'});
    closeGameOverOverlay();
    _returnToTitleMenu();
  };
  G.phase=isClear?'clear':'gameover';
  document.body.classList.toggle('game-clear-active',isClear);
  document.body.classList.toggle('game-clear-first-run',firstRunClear);
  document.body.classList.toggle('gameover-ui-pending',isClear&&!firstRunClear);
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
  if(video&&firstRunClear){
    if(video._gameOverFadeAnimation) video._gameOverFadeAnimation.cancel();
    if(video._gameOverFadeFrame) cancelAnimationFrame(video._gameOverFadeFrame);
    video.classList.remove('is-visible');
    try{ video.pause(); video.currentTime=0; }catch(_e){}
    video.style.opacity='0';
    video.style.visibility='hidden';
    if(tint){ tint.style.opacity='0'; tint.style.visibility='hidden'; }
  }else if(video){
    if(video._gameOverFadeAnimation) video._gameOverFadeAnimation.cancel();
    if(video._gameOverFadeFrame) cancelAnimationFrame(video._gameOverFadeFrame);
    video.classList.remove('is-visible');
    video.style.opacity='0';
    video.style.visibility='visible';
    const desiredSrc=isClear?GAME_CLEAR_MOVIE_SRC:'assets/vfx/game_over.webm';
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
  panel.innerHTML='<span class="battle-continue-back" aria-hidden="true"></span><button id="battle-continue-btn" type="button" data-sfx-silent="1"><span class="battle-continue-label"></span></button>';
  const label=panel.querySelector('.battle-continue-label');
  // 戦闘結果の「進む」ボタン（テキストメッセージ「「進む」ボタン」）。
  if(label) label.textContent=typeof textMessage==='function'?textMessage('「進む」ボタン','進む'):'進む';
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
  window.setTimeout(async()=>{
    G._battleProceedAction=null;
    G._battleProceedBusy=false;
    // **背景の寄りを戻すのはここ**（完全に暗転し、勝利／撤退の文字も消えた後）。
    // 明るいうちに戻すと画面が引くのが見える。報酬は同じ #scr-battle 内で
    // 切り替わるため showScreen() を通らず、ここが唯一の確実な契機になる。
    if(typeof clearBattleFocus==='function') clearBattleFocus();
    // 編成画面へ進む経路は、高速オートセーブ表示が終わるPromiseを返す。
    // それを待ってから黒幕を外し、表示が明転後へ残らないようにする。
    try{ await Promise.resolve(action()); }
    catch(error){
      if(typeof showFatalError==='function') showFatalError('',{error,source:'js/engine/main.js',kind:'P'});
      else window.setTimeout(()=>{ throw error; },0);
    }
    // 村・祭壇の入場演出へ入った場合は、暗転をそのまま演出側へ引き継ぐ
    // （ここで外すと、演出の黒が乗るまでの間だけ盤面が見えてしまう。
    //   _playVillageEnterIntro()が村画面を組み立てた時点で外す）。
    if(typeof G!=='undefined'&&G&&G._villageIntroPlaying) return;
    // 呼び出し側が画面を切り替えるまで暗転を保つ場合も同じ（オンライン対戦の決着）。
    // ここで外すと、切り替わる前に盤面が一瞬明るく見えてしまう。
    if(typeof G!=='undefined'&&G&&G._battleFadeHeldByCaller) return;
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
  ['btn-debug-kill','btn-debug-gameover','btn-debug-quest','btn-test-battle','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'].forEach(debugId=>{
    const debugEl=document.getElementById(debugId);
    if(debugEl) debugEl.style.display='none';
  });
  // 注：onBattleEnd()が_panelSummonedユニット（＝現行仕様の全味方）をG.alliesから除去済みのため、
  // ここでの味方生存チェックは常にtrueとなり誤って早期returnしてしまう。勝利可否は呼び出し元で判定済み。
  // 結果表示と同時に浮遊ログのフェードを加速し、画面遷移までに確実に消しきる
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
// ラン中の画面からタイトルへ戻る時の共通経路。
// 起動時の導入演出（returnToTapStart()）とは異なり、既に導入済みとして
// メニューを最終状態まで表示し、タイトルの入力とBGMを直ちに有効にする。
function _returnToTitleMenu(){
  _titleStartToken++;
  _startingFromTitle=false;
  _startupIntroSkipped=true;
  _startupIntroTimerIds.forEach(id=>clearTimeout(id));
  _startupIntroTimerIds=[];
  const title=document.getElementById('scr-title');
  if(title){
    title.classList.remove('startup-menu-input-locked');
    title.classList.add('active','startup-title','startup-title-visible','startup-menu-visible',
      'startup-menu-ready','startup-menu-hover-ready');
    _wireTitleSelectBack();
  }
  window.removeEventListener('pointerdown',_skipStartupIntro,true);
  _syncTitleStartLabel();
  _startTitleBgVideo();
  _startTitleBgm();
  if(typeof showScreen==='function') showScreen('title');
  else if(typeof returnToTapStart==='function') returnToTapStart();
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
// ── 右クリックはゲームの操作にだけ使う ───────────────────────
// **ブラウザのメニュー（再読み込み・印刷など）は全画面で出さない。**
// 右クリックはカードの表示切り替えなどゲーム側の操作に割り当てているため、
// メニューが被ると操作にならない。個別の contextmenu ハンドラより後で
// 呼ばれても効くよう、capture 段階で止める（preventDefault は
// 他のリスナーの実行を妨げないので、既存の切り替え処理はそのまま動く）。
document.addEventListener('contextmenu', e => { e.preventDefault(); }, true);

// ── 進行不能なエラーの表示 ─────────────────────────────────
// 画面全体を暗くし、指輪枠と同じ枠でエラーを出す。文言は**テキストメッセージシート**
// （`window.TEXT_MESSAGES` の「エラー発生時」）が唯一の出どころ。
//
// **エラーコードは原因を特定するためのもの。** 形は `<ファイル>-<種別><行>`。
//   ファイル：BT=battle.js／RD=render.js／RW=reward.js／MP=map.js／MN=main.js／
//             CR=core.js／PR=present.js／PE=present_events.js／LD=loader.js／PL=pool.js／
//             ST=state.js／AU=audio.js／OL=online／IX=index.html／GN=不明
//   種別　　：T=TypeError／R=ReferenceError／G=RangeError／S=SyntaxError／
//             P=Promiseの未処理／D=データ読み込み／X=その他
//   行　　　：発生行（取れなければ0）
// 例）BT-T3020 ＝ battle.js の3020行目で TypeError。
const FATAL_ERROR_TEXT_KEYS=['エラー発生時'];
const FATAL_ERROR_FALLBACK='予期しないエラーが発生しました。\n続行できないため、タイトル画面へ戻ります。\n\nエラーコード：';
const FATAL_ERROR_FILE_TAGS=[
  [/js\/engine\/battle\.js/,'BT'],[/js\/engine\/render\.js/,'RD'],[/js\/engine\/reward\.js/,'RW'],
  [/js\/engine\/map\.js/,'MP'],[/js\/engine\/main\.js/,'MN'],[/js\/engine\/pool\.js/,'PL'],
  [/js\/engine\/state\.js/,'ST'],[/js\/engine\/audio\.js/,'AU'],[/js\/engine\/move\.js/,'MV'],
  [/js\/battle\/core\.js/,'CR'],[/js\/battle\/present_events\.js/,'PE'],[/js\/battle\/present\.js/,'PR'],
  [/js\/battle\/formation\.js/,'FM'],[/js\/data\/loader\.js/,'LD'],[/js\/data\//,'DT'],
  [/js\/online\//,'OL'],[/index\.html/,'IX'],
];
const FATAL_ERROR_KIND_TAGS=[
  ['TypeError','T'],['ReferenceError','R'],['RangeError','G'],['SyntaxError','S'],['URIError','U'],['EvalError','E'],
];
function _fatalErrorFileTag(src){
  const url=String(src||'');
  const hit=FATAL_ERROR_FILE_TAGS.find(([re])=>re.test(url));
  return hit?hit[1]:'GN';
}
function _fatalErrorKindTag(err,fallback){
  const name=String((err&&err.name)||'');
  const hit=FATAL_ERROR_KIND_TAGS.find(([n])=>n===name);
  return hit?hit[1]:(fallback||'X');
}
function _fatalErrorCode(info){
  const i=info||{};
  const file=_fatalErrorFileTag(i.source||(i.error&&i.error.fileName)||'');
  const kind=_fatalErrorKindTag(i.error,i.kind);
  const line=Math.max(0,Math.floor(Number(i.line)||0));
  return `${file}-${kind}${line}`;
}
function _fatalErrorMessage(){
  return textMessage(FATAL_ERROR_TEXT_KEYS[0],FATAL_ERROR_FALLBACK).trim()||FATAL_ERROR_FALLBACK;
}
function showErrorOverlay(options){
  if(typeof document==='undefined') return false;
  const opt=options&&typeof options==='object'?options:{};
  if(document.body&&document.body.classList.contains('fatal-error-active')) return false;
  const getText=(key,fallback)=>typeof textMessage==='function'?textMessage(key,fallback):fallback;
  const titleEl=document.getElementById('fatal-error-title');
  const msgEl=document.getElementById('fatal-error-message');
  const codeWrap=document.getElementById('fatal-error-code');
  const codeEl=document.getElementById('fatal-error-code-value');
  const overlay=document.getElementById('fatal-error-overlay');
  const back=document.getElementById('fatal-error-back-btn');
  if(titleEl) titleEl.textContent=String(opt.title||getText('「エラー発生時」見出し','エラー'));
  if(msgEl) msgEl.textContent=String(opt.message||'');
  const code=String(opt.code||'').trim();
  if(codeWrap) codeWrap.style.display=code?'inline':'none';
  if(codeEl) codeEl.textContent=code;
  if(back){
    back.textContent=String(opt.buttonText||getText(opt.buttonKey||'「OK」ボタン',opt.buttonFallback||'OK'));
    back.onclick=()=>{
      // ボタンの音は呼び出し側で変えられる（戦闘キャラ不在の「戻る」はオプション画面の「戻る」と同じ uiConfirm）。
      try{ if(typeof playSfx==='function') playSfx(opt.buttonSfx||'uiConfirmHeavy',{group:'ui',guardKey:'ui:error-overlay-back'}); }catch(_e){}
      if(document.body) document.body.classList.remove('fatal-error-active');
      if(overlay) overlay.setAttribute('aria-hidden','true');
      if(typeof opt.onClose==='function') opt.onClose();
    };
  }
  if(document.body) document.body.classList.add('fatal-error-active');
  if(overlay) overlay.setAttribute('aria-hidden','false');
  try{ if(typeof playSfx==='function') playSfx('uiError',{group:'ui',guardKey:'ui:error-overlay'}); }catch(_e){}
  return true;
}
// code：省略すると info から作る。detail：原因のオブジェクト（コンソールへ出す）。
function showFatalError(code,detail){
  if(typeof document==='undefined') return '';
  const info=detail&&typeof detail==='object'?detail:{};
  const shown=String(code||_fatalErrorCode(info));
  // **最初の1件だけ出す。** 続けて出すと、原因の最初のエラーが読めなくなる。
  if(document.body&&document.body.classList.contains('fatal-error-active')) return shown;
  try{ console.error('[Vesselbound] fatal',shown,detail||''); }catch(_e){}
  if(typeof G!=='undefined'&&G) G._lastFatalError={code:shown,detail:String((info&&info.message)||(detail&&detail.message)||detail||'')};
  // 進行中の音は全部止めてから鳴らす（何が起きたか分かるように）。
  try{ if(typeof stopAllSfx==='function') stopAllSfx(); }catch(_e){}
  try{ if(typeof stopBgm==='function') stopBgm(200); }catch(_e){}
  showErrorOverlay({
    message:_fatalErrorMessage(),
    code:shown,
    buttonKey:'「タイトルに戻る」ボタン',
    buttonFallback:'タイトルに戻る',
    onClose:()=>{
      // **状態が壊れている可能性があるので、タイトルへ戻れなければ読み込み直す。**
      try{
      if(typeof closeGameOverOverlay==='function') closeGameOverOverlay();
      if(typeof _returnToTitleMenu==='function') _returnToTitleMenu();
      else if(typeof showScreen==='function') showScreen('title');
      else location.reload();
      }catch(_e){ location.reload(); }
    },
  });
  return shown;
}
if(typeof window!=='undefined'){
  window.showErrorOverlay=showErrorOverlay;
  window.showFatalError=showFatalError;
  window.addEventListener('error',e=>{
    if(!e) return;
    // 画像・音声の読み込み失敗（要素のerror）は進行不能ではないので出さない。
    if(e.target&&e.target!==window&&e.target.tagName) return;
    showFatalError('',{source:e.filename,line:e.lineno,error:e.error,message:e.message});
  },true);
  window.addEventListener('unhandledrejection',e=>{
    const reason=e&&e.reason;
    const stackLine=String((reason&&reason.stack)||'').split('\n')[1]||'';
    const m=stackLine.match(/([^\s()]+\.js):(\d+):\d+/);
    showFatalError('',{source:m?m[1]:'',line:m?m[2]:0,error:reason,kind:'P',
      message:String((reason&&reason.message)||reason||'')});
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  _beginStartupIntro();
  const msgEl = document.getElementById('load-msg');
  let ok = false;
  try{
    ok = await loadGameData();
  }catch(err){
    // データが無ければ何も始められない。**ここは進行不能**なのでエラー表示を出す。
    showFatalError('LD-D001', err);
    return;
  }
  // 内蔵データすら空（カードが1枚も無い）ならゲームを始められない。
  if (!(typeof PANEL_POOL !== 'undefined' && Array.isArray(PANEL_POOL) && PANEL_POOL.length)) {
    showFatalError('LD-D002', new Error('PANEL_POOL is empty'));
    return;
  }
  if (msgEl) {
    msgEl.textContent = ok
      ? '✓ データを読み込みました'
      : '⚠ オフライン：内蔵データで起動します';
    msgEl.style.color = ok ? 'var(--teal2)' : 'var(--gold2)';
  }
  // 所持金・ライフ・マナ・血の説明（テキストメッセージシート）を貼る。
  if (typeof applyStatusTooltips === 'function') applyStatusTooltips();
  // CSSの content で出す文言（見出し・祭壇の説明文）もシートから流し込む。
  if (typeof applySheetCssTexts === 'function') applySheetCssTexts();
  if (typeof applySheetDomTitles === 'function') applySheetDomTitles();
  if(typeof SaveRun!=='undefined') SaveRun.ready();
});

/* 🛠️ js/engine/main.js の一番最後へ追記（古いF4コードは消去） */
window.addEventListener('keydown', async (e) => {
  // F4キーが押されたら、現在のゲーム進行状況を1ミリも崩さず、エクセルデータを完全同期
  if (e.key === 'F4') {
    e.preventDefault();
    console.log('[完全同期] エクセルのキャッシュを破棄し、再スキャンを開始します...');

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
          // 合体済みのカードは、最新の「合体効果」でもう一度作り直す
          // （素の姿へ戻すと、シート再読込のたびに合体が無かったことになる）。
          card.mergedForm = def.mergedForm;
          if ((card._merged || card._tripleMerged) && typeof applyMergedPanelForm === 'function') {
            applyMergedPanelForm(card);
          }
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
        if (Array.isArray(unit.boardCards)) unit.boardCards.forEach(refreshCardObject);
      };

      // 1. 魔導板（メインボード）の全カードを最新化
      if (Array.isArray(G.mainBoard)) G.mainBoard.forEach(refreshCardObject);
      
      // 2. 戦闘中の味方ユニットと、それに連動するパッシブバフを再計算して最新化
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
