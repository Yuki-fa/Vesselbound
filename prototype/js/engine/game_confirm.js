// game_confirm.js — ゲーム中の確認窓（OK／キャンセル）。
// **見た目はセーブデータ削除時の確認窓（オプション画面の #options-confirm-…）と同じ。**
// CSS は index.html の「ゲーム共通の確認窓」で、#options-confirm-… の規則を写してある。
// 使う場面：祭壇の途中離脱、クエスト失敗警告（quest.js）。
//
//   showGameConfirm({title, message, okLabel, cancelLabel, onOk, onCancel, okTone, allowOptions})
//   okTone:'blue' … OK を青いボタン（戦闘開始と同じ button_blue1.svg）にする（闘技場の「続ける」）。
//   allowOptions … 確認窓の上にオプションボタンを出し、押せるようにする（闘技場継戦確認・クエスト失敗警告）。
//   message の改行はそのまま改行になる。

function _ensureGameConfirm(){
  let root=document.getElementById('game-confirm-root');
  if(root) return root;
  root=document.createElement('div');
  root.id='game-confirm-root';
  root.setAttribute('aria-hidden','true');
  root.innerHTML='<div id="game-confirm-layer"><div id="game-confirm-shade"></div>'
    +'<div id="game-confirm-box"><div id="game-confirm-title"></div><div id="game-confirm-message"></div>'
    +'<div id="game-confirm-actions"><button data-sfx-silent="1" id="game-confirm-ok" type="button"></button>'
    +'<button data-sfx-silent="1" id="game-confirm-cancel" type="button"></button></div></div></div>'
    // オプションボタンの代わり（画面のオプションボタンと同じ位置・見た目）。allowOptions の時だけ見せる。
    +'<button data-sfx-silent="1" id="game-confirm-options" type="button" aria-label="オプション"></button>';
  root.querySelector('#game-confirm-options').onclick=e=>{
    e.preventDefault();e.stopPropagation();
    if(typeof playSfx==='function') playSfx('uiConfirm',{group:'ui',guardKey:'ui:button'});
    if(typeof _optionOpen==='function') _optionOpen();
  };
  document.body.appendChild(root);
  return root;
}

function showGameConfirm(options){
  const opts=options||{};
  const label=(key,fallback)=>typeof textMessage==='function'?textMessage(key,fallback):fallback;
  const root=_ensureGameConfirm();
  const layer=root.querySelector('#game-confirm-layer');
  root.querySelector('#game-confirm-title').textContent=String(opts.title||'');
  root.querySelector('#game-confirm-message').textContent=String(opts.message||'');
  root.classList.toggle('game-confirm-ok-blue',opts.okTone==='blue');
  root.classList.toggle('game-confirm-allow-options',!!opts.allowOptions);
  const ok=root.querySelector('#game-confirm-ok');
  const cancel=root.querySelector('#game-confirm-cancel');
  ok.textContent=String(opts.okLabel||label('「OK」ボタン','OK'));
  cancel.textContent=String(opts.cancelLabel||label('「キャンセル」ボタン','キャンセル'));
  const close=()=>{
    root.classList.remove('is-open');
    layer.classList.remove('is-open');
    root.setAttribute('aria-hidden','true');
    ok.onclick=null; cancel.onclick=null;
  };
  ok.onclick=()=>{
    if(typeof playSfx==='function') playSfx('menuOpen',{group:'ui'});
    close();
    if(typeof opts.onOk==='function') opts.onOk();
  };
  cancel.onclick=()=>{
    if(typeof playSfx==='function') playSfx('return',{group:'ui'});
    close();
    if(typeof opts.onCancel==='function') opts.onCancel();
  };
  root.classList.add('is-open');
  layer.classList.add('is-open');
  root.setAttribute('aria-hidden','false');
}

if(typeof window!=='undefined') window.showGameConfirm=showGameConfirm;
