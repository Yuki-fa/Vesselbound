// オプション画面。設定値・一時停止・確認削除をここへ集約する。
const OPTION_STORAGE_KEY='vesselbound.options';
const OPTION_DEFAULTS={speed:'normal',mode:1,language:1,bgm:100,se:100};
try{
  const startupOptions=JSON.parse(localStorage.getItem(OPTION_STORAGE_KEY)||'null');
  const startupLanguage=Number(startupOptions&&startupOptions.language);
  window.VB_OPTION_LANGUAGE=startupLanguage>=1&&startupLanguage<=3?startupLanguage:1;
}catch(_e){window.VB_OPTION_LANGUAGE=1;}
let _optionSaved=null,_optionDraft=null,_optionDeleteKind=null;
const _optionText=(key,fallback)=>typeof textMessage==='function'?textMessage(key,fallback):fallback;
const _optionLabels={
  title:['「オプション」見出し','オプション'],current:['「現在設定」見出し','現在設定'],game:['「ゲーム設定」見出し','ゲーム設定'],
  'speed-label':['「演出速度」見出し','演出速度'],graphics:['「グラフィック設定」見出し','グラフィック設定'],'mode-label':['「表示モード」見出し','表示モード'],
  language:['「言語設定」見出し','言語設定'],'language-label':['「表示言語」見出し','表示言語'],sound:['「サウンド設定」見出し','サウンド設定'],
  'bgm-label':['「BGM ボリューム」見出し','BGM ボリューム'],'se-label':['「SE ボリューム」見出し','SE ボリューム'],data:['「データ管理」見出し','データ管理'],
  'run-label':['「セーブデータの削除」見出し','セーブデータの削除'],'profile-label':['「システムデータの削除」見出し','システムデータの削除'],
  runNote:['データ管理注釈','※ラン中は削除できません。'],execute:['オプションの「実行」ボタン','実行'],save:['オプションの「保存して戻る」ボタン','保存して戻る'],back:['オプションの「戻る」ボタン','戻る'],
  revert:['配置を「元に戻す」ボタン','元に戻す'],'return-title':['「タイトルに戻る」ボタン','タイトルに戻る'],delete:['オプションの「削除実行」ボタン','実行'],
  cancel:['オプションの「キャンセル」ボタン','キャンセル'],confirm:['削除確認見出し','削除確認'],runConfirm:['セーブデータ削除時','直前のランのデータを削除します。\nこの操作は取り消すことができません。\n本当に削除してよろしいですか？'],
  profileConfirm:['システムデータ削除時','コレクションと履歴のデータを削除します。\nこの操作は取り消すことができません。\n本当に削除してよろしいですか？']
};
const _optionChoices={
  speed:[['「演出速度」項目1','通常'],['「演出速度」項目2','高速']],
  mode:[['「表示モード」項目1','1920 × 1080'],['「表示モード」項目2','2560 × 1440'],['「表示モード」項目3','3840 × 2160'],['「表示モード」項目4','フルスクリーン']],
  language:[['「表示言語」項目1','日本語'],['「表示言語」項目2','English'],['「表示言語」項目3','中文']]
};
function _optionRead(){
  try{
    const raw=JSON.parse(localStorage.getItem(OPTION_STORAGE_KEY)||'null');
    const v={...OPTION_DEFAULTS,...(raw&&typeof raw==='object'?raw:{})};
    v.mode=typeof normalizeVesselboundDisplayMode==='function'?normalizeVesselboundDisplayMode(v.mode):Math.max(1,Math.min(4,Number(v.mode)||1));
    if(v.language==='ja')v.language=1;else v.language=Math.max(1,Math.min(3,Number(v.language)||1));
    v.speed=v.speed==='fast'?'fast':'normal';v.bgm=Math.round(Math.max(0,Math.min(100,Number(v.bgm)||0)));v.se=Math.round(Math.max(0,Math.min(100,Number(v.se)||0)));
    return v;
  }catch(e){return {...OPTION_DEFAULTS};}
}
function _optionWrite(v){try{localStorage.setItem(OPTION_STORAGE_KEY,JSON.stringify(v));}catch(e){console.warn('[options] 設定保存失敗',e);}}
function _optionApply(v){
  const previousLanguage=Number(typeof window!=='undefined'&&window.VB_OPTION_LANGUAGE)||1;
  const previousMode=Number(typeof window!=='undefined'&&window.VB_OPTION_DISPLAY_MODE)||1;
  _optionDraft={...OPTION_DEFAULTS,...v};
  if(typeof SFX_SETTINGS!=='undefined'){SFX_SETTINGS.bgmVolume=_optionDraft.bgm/100;SFX_SETTINGS.sfxVolume=_optionDraft.se/100;}
  if(typeof setAudioOptionVolumes==='function')setAudioOptionVolumes();
  if(typeof window!=='undefined'){
    window.VB_OPTION_SPEED=_optionDraft.speed;
    window.VB_OPTION_LANGUAGE=Math.max(1,Math.min(3,Number(_optionDraft.language)||1));
    window.VB_OPTION_DISPLAY_MODE=typeof normalizeVesselboundDisplayMode==='function'?normalizeVesselboundDisplayMode(_optionDraft.mode):Math.max(1,Math.min(4,Number(_optionDraft.mode)||1));
  }
  if(previousLanguage!==window.VB_OPTION_LANGUAGE&&typeof document!=='undefined'&&document.documentElement){
    if(typeof _optionSetText==='function')_optionSetText();
    if(typeof _optionRender==='function')_optionRender();
    if(typeof applySheetDomTitles==='function')applySheetDomTitles();
    if(typeof applySheetCssTexts==='function')applySheetCssTexts();
    if(typeof applyStatusTooltips==='function')applyStatusTooltips();
  }
  if(typeof G!=='undefined'&&G)G._optionsDisplayMode=_optionDraft.mode;
  if(_optionDraft.mode===4){const p=document.documentElement.requestFullscreen?.();p?.catch(()=>{});}else if(document.fullscreenElement){const p=document.exitFullscreen?.();p?.catch(()=>{});}
  if(previousMode!==window.VB_OPTION_DISPLAY_MODE){
    // 表示モード変更を、枠の倍率だけでなく各画面のresize再配置にも一度で伝える。
    if(typeof fitVesselboundViewport==='function')fitVesselboundViewport();
    window.dispatchEvent(new Event('resize'));
  }
}
function _optionSetText(){
  document.querySelectorAll('[data-option-text]').forEach(el=>{const item=_optionLabels[el.dataset.optionText];if(item)el.textContent=_optionText(item[0],item[1]);});
  document.querySelectorAll('.options-action').forEach(el=>el.textContent=_optionText(_optionLabels.execute[0],_optionLabels.execute[1]));
  document.getElementById('options-confirm-title').textContent=_optionText(_optionLabels.confirm[0],_optionLabels.confirm[1]);
  document.getElementById('options-confirm-delete').textContent=_optionText(_optionLabels.delete[0],_optionLabels.delete[1]);
  document.getElementById('options-confirm-cancel').textContent=_optionText(_optionLabels.cancel[0],_optionLabels.cancel[1]);
  document.querySelectorAll('[data-choice]').forEach(box=>{const kind=box.dataset.choice;const item=_optionChoices[kind];box.querySelector('span').textContent=_optionText(item[0][0],item[0][1]);});
}
function _optionIsRunLocked(){const active=document.querySelector('.screen.active');return !!(active&&active.id!=='scr-title'&&typeof G!=='undefined'&&G&&(G._runId||G._onlineMode));}
function _optionCurrent(v){
  if(v==='speed')return _optionText(_optionChoices.speed[_optionSaved.speed==='fast'?1:0][0],_optionChoices.speed[_optionSaved.speed==='fast'?1:0][1]);
  if(v==='mode')return _optionText(_optionChoices.mode[_optionSaved.mode-1][0],_optionChoices.mode[_optionSaved.mode-1][1]);
  if(v==='language')return _optionText(_optionChoices.language[_optionSaved.language-1][0],_optionChoices.language[_optionSaved.language-1][1]);
  return `${_optionSaved[v]}`;
}
function _optionSfx(key){if(typeof playSfx==='function')playSfx(key,{group:'ui',guardKey:'ui:option-confirm'});}
// 削除するデータがあるか。セーブ＝ランの保存（run）、システム＝コレクション（profile）と設定（vesselbound.options）。
function _optionHasData(kind){try{const key=g=>typeof SaveStorage!=='undefined'&&SaveStorage.key?SaveStorage.key(kind==='run'?'run':'profile',g):`vesselbound.${kind==='run'?'run':'profile'}.${g}`;if(localStorage.getItem(key('current'))!=null||localStorage.getItem(key('backup'))!=null)return true;return kind!=='run'&&localStorage.getItem(OPTION_STORAGE_KEY)!=null;}catch(e){return false;}}
function _optionIsDirty(){if(!_optionSaved||!_optionDraft)return false;return ['speed','mode','language','bgm','se'].some(k=>String(_optionDraft[k])!==String(_optionSaved[k]));}
function _optionRender(){
  document.querySelectorAll('[data-choice]').forEach(box=>{
    const kind=box.dataset.choice,choices=_optionChoices[kind],idx=kind==='speed'?(_optionDraft.speed==='fast'?1:0):_optionDraft[kind]-1;
    box.querySelector('span').textContent=_optionText(choices[idx][0],choices[idx][1]);
    box.querySelector('.prev').classList.toggle('is-disabled',idx<=0);box.querySelector('.next').classList.toggle('is-disabled',idx>=choices.length-1);
  });
  ['speed','mode','language','bgm','se'].forEach(k=>{const el=document.querySelector(`[data-current="${k}"]`);if(el)el.textContent=_optionCurrent(k);});
  document.querySelectorAll('[data-slider]').forEach(box=>{const k=box.dataset.slider,n=Number(_optionDraft[k])||0;box.querySelector('.thumb').style.left=`${n}%`;box.querySelector('.number').textContent=`${n}`;});
  // 何も変えていない（選択中＝保存済み）時は「確定して保存」の代わりに「戻る」（利用者指定：カード未取得時の「戦闘開始」と同じ青）。
  const saveBtn=document.getElementById('options-save');
  if(saveBtn){const dirty=_optionIsDirty();saveBtn.classList.toggle('is-back',!dirty);const l=dirty?_optionLabels.save:_optionLabels.back;saveBtn.textContent=_optionText(l[0],l[1]);}
  const locked=_optionIsRunLocked();document.querySelector('[data-action="run"]').disabled=locked||!_optionHasData('run');document.querySelector('[data-action="profile"]').disabled=locked||!_optionHasData('profile');document.querySelector('[data-option-text="runNote"]').style.display=locked?'block':'none';
}
function _optionOpen(){
  const layer=document.getElementById('options-layer');if(!layer)return;
  if(layer.classList.contains('is-open')){_optionClose(true);return;}
  _optionSaved=_optionRead();_optionApply(_optionSaved);_optionSetText();_optionRender();layer.classList.add('is-open');layer.setAttribute('aria-hidden','false');document.body.classList.add('options-open');
  const activeButton=[...document.querySelectorAll('#title-options-btn,#battle-options-btn,#village-options-btn,#map-options-btn')].find(b=>b.offsetParent&&getComputedStyle(b).display!=='none');
  const proxy=document.getElementById('options-close-proxy');if(proxy){proxy.classList.toggle('mirror-screen',!!(activeButton&&activeButton.classList.contains('screen-options-btn')));proxy.classList.toggle('mirror-battle',!(activeButton&&activeButton.classList.contains('screen-options-btn')));}if(activeButton&&proxy){proxy.style.left=`${activeButton.offsetLeft}px`;proxy.style.top=`${activeButton.offsetTop}px`;proxy.style.right='auto';proxy.style.width=`${activeButton.offsetWidth}px`;proxy.style.height=`${activeButton.offsetHeight}px`;}
  document.querySelectorAll('video').forEach(v=>{v.dataset.optionWasPlaying=(!v.paused&&!v.ended)?'1':'0';if(v.dataset.optionWasPlaying==='1')v.pause();});
  document.querySelectorAll('[id$="options-btn"]').forEach(b=>b.classList.add('options-open-button'));
}
function _optionClose(restore){
  const layer=document.getElementById('options-layer');if(!layer?.classList.contains('is-open'))return;
  if(restore&&_optionSaved)_optionApply(_optionSaved);document.querySelectorAll('video[data-option-was-playing="1"]').forEach(v=>v.play().catch(()=>{}));
  layer.classList.remove('is-open');layer.setAttribute('aria-hidden','true');document.body.classList.remove('options-open');document.getElementById('options-confirm-layer').classList.remove('is-open');
}
function _optionChoice(kind,dir){const choices=_optionChoices[kind],current=kind==='speed'?(_optionDraft.speed==='fast'?1:0):_optionDraft[kind]-1,next=Math.max(0,Math.min(choices.length-1,current+dir));if(next===current)return;if(kind==='speed')_optionDraft.speed=next?'fast':'normal';else _optionDraft[kind]=next+1;_optionApply(_optionDraft);playSfx?.('select',{group:'ui',guardKey:`ui:option:${kind}`});_optionRender();}
function _optionConfirm(kind){if(_optionIsRunLocked())return;_optionDeleteKind=kind;const label=_optionLabels[kind==='run'?'runConfirm':'profileConfirm'];document.getElementById('options-confirm-message').textContent=_optionText(label[0],label[1]);document.getElementById('options-confirm-layer').classList.add('is-open');}
function _optionDelete(){if(_optionDeleteKind==='run')SaveRun?.deleteRunSave();else{SaveStorage?.remove('profile');try{localStorage.removeItem(OPTION_STORAGE_KEY);}catch(e){}_optionSaved={...OPTION_DEFAULTS};_optionApply(_optionSaved);}document.getElementById('options-confirm-layer').classList.remove('is-open');_optionDeleteKind=null;_optionRender();playSfx?.('uiConfirm',{group:'ui',guardKey:'ui:option-delete'});}
function _optionSave(){_optionSaved={..._optionDraft};_optionWrite(_optionSaved);_optionSfx('uiConfirm');_optionRender();}
function _optionReturnTitle(){
  if(document.getElementById('scr-title')?.classList.contains('active')){_optionClose(true);return;}
  _optionSave();_optionClose(false);if(typeof closeGameOverOverlay==='function')closeGameOverOverlay();
  if(typeof G!=='undefined'&&G){G._villageBgmActive=false;if(typeof _applyFacilityAmbience==='function')_applyFacilityAmbience(null);}
  if(typeof stopEveryBgmLayer==='function')stopEveryBgmLayer(250);if(typeof stopBgm==='function')stopBgm(250);
  if(typeof showScreen==='function')showScreen('title');else if(typeof returnToTapStart==='function')returnToTapStart();
}
// つまみの中心は溝の幅の 0〜100% に置いている（_optionRender）。値もその幅で決める。
// **getBoundingClientRect() は縮小後の画面の単位なので、設計座標の数値（つまみ58.49px等）を混ぜない。**
// 混ぜると端の近くで値が張り付き、だいぶ動かさないと動かなかった。
function _optionSliderValue(box,e,grab){const r=box.querySelector('.track').getBoundingClientRect();if(!(r.width>0))return Number(_optionDraft[box.dataset.slider])||0;return Math.round(Math.max(0,Math.min(1,(e.clientX-(grab||0)-r.left)/r.width))*100);}
function _optionWireSlider(box){
  const hit=box.querySelector('.slider-hit');let start=0,changed=false,grab=0;
  const update=e=>{const n=_optionSliderValue(box,e,grab);if(n!==_optionDraft[box.dataset.slider]){changed=true;_optionDraft[box.dataset.slider]=n;_optionApply(_optionDraft);_optionRender();}};
  hit.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();start=Number(_optionDraft[box.dataset.slider])||0;changed=false;const t=box.querySelector('.thumb').getBoundingClientRect(),tc=t.left+t.width/2;grab=Math.abs(e.clientX-tc)<=t.width/2?e.clientX-tc:0;hit.setPointerCapture?.(e.pointerId);update(e);});
  hit.addEventListener('pointermove',e=>{if(hit.hasPointerCapture?.(e.pointerId))update(e);});
  hit.addEventListener('pointerup',e=>{if(hit.hasPointerCapture?.(e.pointerId))hit.releasePointerCapture(e.pointerId);if(changed)playSfx?.('uiConfirm',{group:'ui',guardKey:`ui:option-slider:${box.dataset.slider}`,guardMs:0});});
}
document.addEventListener('DOMContentLoaded',()=>{
  _optionSaved=_optionRead();_optionApply(_optionSaved);
  ['title-options-btn','battle-options-btn','village-options-btn','map-options-btn'].forEach(id=>document.getElementById(id)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();_optionSfx('uiConfirm');_optionOpen();}));
  document.getElementById('options-close-proxy').onclick=()=>{_optionSfx('uiConfirm');_optionClose(true);};
  document.querySelectorAll('[data-choice]').forEach(box=>{box.querySelector('.prev').onclick=()=>_optionChoice(box.dataset.choice,-1);box.querySelector('.next').onclick=()=>_optionChoice(box.dataset.choice,1);});
  document.querySelectorAll('[data-slider]').forEach(_optionWireSlider);
  document.querySelector('[data-action="run"]').onclick=()=>{_optionSfx('uiConfirm');_optionConfirm('run');};document.querySelector('[data-action="profile"]').onclick=()=>{_optionSfx('uiConfirm');_optionConfirm('profile');};document.getElementById('options-save').onclick=()=>{if(_optionIsDirty()){_optionSave();_optionClose(false);}else{_optionSfx('uiConfirm');_optionClose(true);}};document.getElementById('options-revert').onclick=()=>{if(typeof playSfx==='function')playSfx('uiReturn',{group:'ui',guardKey:'ui:option-return'});_optionApply(_optionSaved);_optionRender();};document.getElementById('options-title').onclick=()=>{_optionSfx('uiConfirm');_optionReturnTitle();};document.getElementById('options-confirm-delete').onclick=_optionDelete;document.getElementById('options-confirm-cancel').onclick=()=>{_optionSfx('uiConfirm');document.getElementById('options-confirm-layer').classList.remove('is-open');};
});
