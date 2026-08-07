// ═══════════════════════════════════════
// audio.js — 仮SE再生レイヤー（外部絞り完全破壊・絶対最大化版）
// すべてのSE参照は Assets.sfx に集約する。
// ═══════════════════════════════════════

// 📦 【最前面ハック】すべての音声要素（Audioオブジェクト）の音量制限を根こそぎ解除
(function _boostGlobalUiSounds() {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    if (!descriptor) return;
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      get: function() { return descriptor.get.call(this); },
      set: function(val) {
        const src = String(this.src || '').toLowerCase();
        // 💡 menu.wav や UI関連の音声ファイルが指定されている場合、
        // 外部の別スクリプトが 0.1 などに絞ろうとしても、ブラウザ限界の1.0(最大)に強制上書きする。
        // ただしval>0（絞ろうとした場合）のみが対象で、val===0（ミュート指示）はそのまま通す
        // ようにする。そうしないとデバッグミュート（masterVolume=0）がこれらの音声だけ貫通してしまう。
        if (val > 0 && this.dataset?.bgm !== '1' && (src.includes('menu') || src.includes('ui') || src.includes('click') || src.includes('confirm') || src.includes('purchase') || src.includes('reroll'))) {
          descriptor.set.call(this, 1.0);
        } else {
          descriptor.set.call(this, val);
        }
      },
      configurable: true,
      enumerable: true
    });
  } catch(e) { console.error('[AudioHack Error]', e); }
})();

// Claude Code のBrowserプレビュー（Claude/Electronアプリ内蔵ブラウザ）で開いている間は、
// 検証中に音が鳴ると邪魔なため、BGM/SEを一切再生しない（ミュート）。
// UAに含まれる"Claude/"はこの内蔵ブラウザ特有の表記で、通常のブラウザでは付与されない。
const _IS_CLAUDE_BROWSER_PREVIEW=/\bClaude\//.test(navigator.userAgent||'');

const SFX_SETTINGS={
  masterVolume: 1.0, 
  maxVoices:8,
  groups:{
    ui:    {guardMs:120, volume: 1.0}, 
    // maxPlayMs：戦闘中は短時間に大量の攻撃音が重なるため、原音が長い（attack.wavは3秒超）
    // 場合でも一定時間で強制的に切り上げてボイス枠を解放する（試験戦闘のように高速で
    // 大量に攻撃が続く状況で、ボイス上限に達して以後の音が鳴らなくなるのを防ぐ）。
    combat:{guardMs:250, volume: .75, maxPlayMs:600},
    magic: {guardMs:180, volume: .70}, 
    reward:{guardMs:160, volume: 1.0}, 
  },
  sounds:{
    uiConfirm:  {group:'ui',     volume: 1.0}, 
    uiError:    {group:'ui',     volume: 1.0},
    menuOpen:   {group:'ui',     volume: 1.0},
    menuClose:  {group:'ui',     volume: 1.0},
    menu:       {group:'ui',     volume: 1.0}, // 💡 menu という名前で直接叩かれた場合も1.0固定
    select:     {group:'ui',     volume: 1.0}, 
    fit:        {group:'reward', volume: 1.0, guardMs:80}, 
    'return':   {group:'ui',     volume: 1.0}, 
    reroll:     {group:'ui',     volume: 1.0}, 
    purchase:   {group:'reward', volume: 1.0}, 
    attack:     {group:'combat', volume: .75, guardMs:80},
    shield:     {group:'combat', volume: .85, guardMs:80},
    poison:     {group:'combat', volume: .70, guardMs:80},
    fire:       {group:'magic',  volume: .75, guardMs:90},
    superMagic: {group:'magic',  volume: .82, guardMs:120},
    sword1:     {group:'combat', volume: .68, guardMs:40},
    sword2:     {group:'combat', volume: .75, guardMs:40},
    sword3:     {group:'combat', volume: .82, guardMs:40},
    axe1:       {group:'combat', volume: .70, guardMs:40},
    axe2:       {group:'combat', volume: .78, guardMs:40},
    axe3:       {group:'combat', volume: .86, guardMs:40},
    punch1:     {group:'combat', volume: .64, guardMs:40},
    punch2:     {group:'combat', volume: .72, guardMs:40},
    punch3:     {group:'combat', volume: .80, guardMs:40},
    kick1:      {group:'combat', volume: .66, guardMs:40},
    kick2:      {group:'combat', volume: .74, guardMs:40},
    kick3:      {group:'combat', volume: .82, guardMs:40},
    death:      {group:'combat', volume: .85, guardMs:300}, 
    spellCast:  {group:'magic',  volume: .65},
    spellFire:  {group:'magic',  volume: .75},
    spellHeal:  {group:'magic',  volume: .68},
    summon:     {group:'magic',  volume: .70, guardMs:300},
    victory:    {group:'ui',     volume: 1.0, guardMs:1200},
    bossVictory:{group:'ui',     volume: 1.0, guardMs:1200},
    S002:       {group:'magic',  volume: .80, guardMs:80}, // 特殊演出：封印解放
    S003:       {group:'magic',  volume: .80, guardMs:80}, // 特殊演出：生贄破棄
  },
};

const _sfxCache={};
const _sfxLastPlayed={};
let _sfxUnlocked=false;
let _sfxActiveVoices=0;
let _bgmAudio=null;
let _bgmNextAudio=null;
let _bgmKey='';
let _bgmFadeTimer=null;
let _bgmLoopTimer=null;
let _bgmTargetVolume=.32*SFX_SETTINGS.masterVolume;
const BGM_DEFAULT_VOLUMES={
  menu:.62,
  battle1:.32,
  battle3:.32,
};

function _sfxPath(key){
  return Assets&&Assets.sfx?Assets.sfx[key]:null;
}

function _sfxAudio(key){
  const path=_sfxPath(key);
  if(!path) return null;
  if(!_sfxCache[key]){
    const a=new Audio(path);
    a.preload='auto';
    _sfxCache[key]=a;
  }
  return _sfxCache[key];
}

function preloadSfx(){
  if(!Assets||!Assets.sfx) return;
  Object.keys(Assets.sfx).forEach(k=>_sfxAudio(k));
}

function unlockSfx(){
  if(_sfxUnlocked) return;
  _sfxUnlocked=true;
  preloadSfx();
  if(_bgmAudio&&_bgmAudio.paused){
    const audio=_bgmAudio;
    const key=_bgmKey;
    const fadeInMs=Number(audio.dataset.fadeInMs)||700;
    audio.play().then(()=>{
      if(_bgmAudio===audio&&_bgmKey===key){
        _fadeAudioVolume(audio,0,_bgmTargetVolume,fadeInMs);
        _scheduleBgmSeamlessLoop();
      }
    }).catch(()=>{});
  }
}

function playSfx(key,opts={}){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  if(!_sfxUnlocked) return false;
  const base=_sfxAudio(key);
  if(!base) return false;
  const soundCfg=SFX_SETTINGS.sounds[key]||{};
  const groupName=opts.group||soundCfg.group||'ui';
  
  // 💡 UI画面、編成画面、または名前に "menu" が入る効果音は強制的に1.0（最大値）に指定
  let finalVol = opts.volume ?? soundCfg.volume ?? SFX_SETTINGS.groups[groupName]?.volume ?? .2;
  const currentSrc = String(base.src || '').toLowerCase();
  if (groupName === 'ui' || groupName === 'reward' || key === 'menu' || currentSrc.includes('menu')) {
    finalVol = 1.0;
  }

  const groupCfg=SFX_SETTINGS.groups[groupName]||SFX_SETTINGS.groups.ui;
  const guardMs=opts.guardMs??soundCfg.guardMs??groupCfg.guardMs??120;
  const guardKey=opts.guardKey||`${groupName}:${key}`;
  const now=performance.now();
  if(now-(_sfxLastPlayed[guardKey]||0)<guardMs) return false;
  if(_sfxActiveVoices>=SFX_SETTINGS.maxVoices) return false;
  _sfxLastPlayed[guardKey]=now;

  const a=base.cloneNode();
  const speed=(typeof getBattleSpeedScale==='function'&&typeof G!=='undefined'&&(G.phase==='enemy'||G._battlePhaseRunning))?getBattleSpeedScale():1;
  a.playbackRate=Math.max(.5,Math.min(2,speed));
  a.volume=Math.max(0,Math.min(1, finalVol * SFX_SETTINGS.masterVolume));
  _sfxActiveVoices++;
  let released=false;
  const release=()=>{ if(released) return; released=true; _sfxActiveVoices=Math.max(0,_sfxActiveVoices-1); };
  a.addEventListener('ended',release,{once:true});
  a.addEventListener('error',release,{once:true});
  const maxPlayMs=opts.maxPlayMs??soundCfg.maxPlayMs??groupCfg.maxPlayMs;
  if(maxPlayMs>0){
    setTimeout(()=>{ if(released) return; try{ a.pause(); }catch(e){} release(); },maxPlayMs);
  }
  // 安全弁：'ended'/'error'が何らかの理由で発火しなかった場合、ボイス枠（_sfxActiveVoices）が
  // 永久に埋まったままになりmaxVoices到達後すべてのSEが鳴らなくなるため、maxPlayMs未設定の
  // 音でも一定時間後には強制的に解放する。
  setTimeout(()=>{ if(released) return; release(); },4000);
  a.play().catch(release);
  return true;
}

function _fadeAudioVolume(audio, from, to, ms, onDone){
  if(!audio) return;
  if(_bgmFadeTimer) clearInterval(_bgmFadeTimer);
  const start=performance.now();
  audio.volume=Math.max(0,Math.min(1,from));
  _bgmFadeTimer=setInterval(()=>{
    const t=Math.min(1,(performance.now()-start)/Math.max(1,ms||1));
    audio.volume=from+(to-from)*t;
    if(t>=1){
      clearInterval(_bgmFadeTimer);
      _bgmFadeTimer=null;
      if(onDone) onDone();
    }
  },30);
}

function _makeBgmAudio(path){
  const audio=new Audio(path);
  audio.dataset.bgm='1';
  audio.loop=false;
  audio.preload='auto';
  audio.volume=0;
  return audio;
}

function _clearBgmLoopTimer(){
  if(_bgmLoopTimer) clearTimeout(_bgmLoopTimer);
  _bgmLoopTimer=null;
}

function _scheduleBgmSeamlessLoop(){
  _clearBgmLoopTimer();
  const audio=_bgmAudio;
  const key=_bgmKey;
  if(!audio||!key) return;
  const dur=Number(audio.duration)||0;
  if(!dur||!Number.isFinite(dur)){
    audio.addEventListener('loadedmetadata',_scheduleBgmSeamlessLoop,{once:true});
    return;
  }
  const lead=Math.min(.18,Math.max(.04,dur*.04));
  const delay=Math.max(50,(dur-audio.currentTime-lead)*1000);
  _bgmLoopTimer=setTimeout(()=>{
    if(_bgmAudio!==audio||_bgmKey!==key) return;
    const path=_sfxPath(key);
    if(!path) return;
    const next=_makeBgmAudio(path);
    _bgmNextAudio=next;
    next.volume=_bgmTargetVolume;
    next.play().then(()=>{
      if(_bgmAudio!==audio||_bgmKey!==key){ next.pause(); return; }
      const old=audio;
      _bgmAudio=next;
      _bgmNextAudio=null;
      _fadeAudioVolume(old,old.volume,0,120,()=>{ try{ old.pause(); old.currentTime=0; }catch(e){} });
      _scheduleBgmSeamlessLoop();
    }).catch(()=>{ _scheduleBgmSeamlessLoop(); });
  },delay);
}

function playBgm(key,opts={}){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  const path=_sfxPath(key);
  if(!path) return false;
  if(_bgmKey===key&&_bgmAudio&&!_bgmAudio.paused) return true;
  stopBgm(0);
  _bgmKey=key;
  const audio=_makeBgmAudio(path);
  _bgmAudio=audio;
  const baseVol=opts.volume??BGM_DEFAULT_VOLUMES[key]??.32;
  const targetVol=Math.max(0,Math.min(1,baseVol*SFX_SETTINGS.masterVolume));
  audio.dataset.fadeInMs=String(opts.fadeInMs??700);
  _bgmTargetVolume=targetVol;
  if(!_sfxUnlocked) return false;
  audio.play().then(()=>{
    _fadeAudioVolume(audio,0,targetVol,opts.fadeInMs??700);
    _scheduleBgmSeamlessLoop();
  }).catch(()=>{});
  return true;
}

function stopBgm(fadeOutMs=350){
  if(!_bgmAudio) return;
  _clearBgmLoopTimer();
  const audio=_bgmAudio;
  const next=_bgmNextAudio;
  const finish=()=>{ try{ audio.pause(); audio.currentTime=0; }catch(e){} };
  if(next){ try{ next.pause(); next.currentTime=0; }catch(e){} }
  if(fadeOutMs>0&&!audio.paused){
    _fadeAudioVolume(audio,audio.volume,0,fadeOutMs,finish);
  }else{
    finish();
  }
  _bgmAudio=null;
  _bgmNextAudio=null;
  _bgmKey='';
}

// デバッグモード：ミュートボタンで全音声（BGM/SE）をON/OFFする
let _debugMuted=false;
let _bgmVolumeBeforeMute=null;
function toggleDebugMute(){
  _debugMuted=!_debugMuted;
  SFX_SETTINGS.masterVolume=_debugMuted?0:1;
  if(_debugMuted){
    _bgmVolumeBeforeMute=_bgmTargetVolume;
    _bgmTargetVolume=0;
  }else if(_bgmVolumeBeforeMute!=null){
    _bgmTargetVolume=_bgmVolumeBeforeMute;
  }
  if(_bgmAudio) _bgmAudio.volume=_bgmTargetVolume;
  const btn=document.getElementById('battle-mute-btn');
  if(btn) btn.textContent=_debugMuted?'🔇':'🔊';
}

function playSpellSfx(sp,opts={}){
  const effect=sp&&sp.effect;
  if(['fire','meteor','bomb'].includes(effect)) return playSfx('fire',opts);
  if(['poison','seal','instakill'].includes(effect)) return playSfx('poison',opts);
  if(['heal_ally','rally','boost','big_rally','revive','double_hp'].includes(effect)) return playSfx('spellHeal',opts);
  return playSfx('spellCast',opts);
}

window.addEventListener('pointerdown',unlockSfx,{once:true,capture:true});
window.addEventListener('keydown',unlockSfx,{once:true,capture:true});
window.addEventListener('DOMContentLoaded',preloadSfx);
document.addEventListener('click',ev=>{
  const btn=ev.target&&ev.target.closest?ev.target.closest('button,.btn'):null;
  if(!btn||btn.disabled||btn.dataset.sfxSilent==='1') return;
  playSfx('uiConfirm',{guardKey:'ui:button'});
},true);
