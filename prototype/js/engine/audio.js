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
        // dataset.bgm/dataset.sfx が付いた音声＝このファイルが意図的に音量を決めているものは
        // 対象外にする。ここで1.0へ上書きすると SFX_SETTINGS.sounds の個別音量が効かなくなる。
        if (val > 0 && this.dataset?.bgm !== '1' && this.dataset?.sfx !== '1' && (src.includes('menu') || src.includes('ui') || src.includes('click') || src.includes('confirm') || src.includes('purchase') || src.includes('reroll'))) {
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
  // 音量は「音源の実測ラウドネス（最大200ms窓のRMS, dBFS）× ここの値」が揃うように決めている。
  // 目標：UI・報酬=-12dBFS／打撃の強度段階 1=-15・2=-12.5・3=-10／その他の戦闘・魔法=-11。
  // 実測より小さい目標には上げられない（音量1.0が上限）ため、-12より小さい音源は1.0のまま。
  //   例）altar_in -1.0dBFS → 0.28で-12.1／ui_confirm -19.9dBFS → 1.0でも-19.9のまま。
  //   さらに上げたい音（ui_confirm・fit・item_get・select・ui_error等）は音源側の作り直しが必要。
  sounds:{
    uiConfirm:  {group:'ui',     volume: 1.00}, // 音源 -19.9dBFS（これ以上上げられない）
    uiConfirmHeavy:{group:'ui',  volume: .58},  // -7.3
    uiError:    {group:'ui',     volume: 1.00}, // -18.7
    menuOpen:   {group:'ui',     volume: 1.00}, // -13.3
    menuClose:  {group:'ui',     volume: .70},  // -8.9
    menu:       {group:'ui',     volume: 1.00},
    select:     {group:'ui',     volume: 1.00}, // -17.6
    gameStart:  {group:'ui',     volume: 1.00},
    knock:      {group:'ui',     volume: 1.00}, // -15.0
    boom:       {group:'ui',     volume: .61},  // -7.7
    shopIn:     {group:'ui',     volume: .49},  // -5.8
    shopOut:    {group:'ui',     volume: .70},  // -8.9
    altarIn:    {group:'ui',     volume: .28},  // -1.0（突出して大きかった）
    altarOut:   {group:'ui',     volume: .39},  // -3.9
    fit:        {group:'reward', volume: 1.00, guardMs:80}, // -19.7
    'return':   {group:'ui',     volume: 1.00}, // -12.2
    reroll:     {group:'ui',     volume: .79},  // -10.0
    purchase:   {group:'reward', volume: .86},  // -10.7
    attack:     {group:'combat', volume: .46, guardMs:80},  // -4.3
    shield:     {group:'combat', volume: .63, guardMs:80},  // -7.0
    poison:     {group:'combat', volume: .48, guardMs:80},  // -4.7
    fire:       {group:'magic',  volume: .78, guardMs:90},  // -8.8
    superMagic: {group:'magic',  volume: .58, guardMs:120}, // -6.2
    // 打撃音は 1<2<3 の強度差を残したまま、武器種をまたいだばらつきだけを揃える。
    sword1:     {group:'combat', volume: 1.00, guardMs:40}, // -15.0
    sword2:     {group:'combat', volume: .94, guardMs:40},  // -12.0
    sword3:     {group:'combat', volume: .88, guardMs:40},  // -8.9
    axe1:       {group:'combat', volume: .66, guardMs:40},  // -11.4
    axe2:       {group:'combat', volume: .64, guardMs:40},  // -8.6
    axe3:       {group:'combat', volume: .68, guardMs:40},  // -6.6
    punch1:     {group:'combat', volume: .76, guardMs:40},  // -12.6
    punch2:     {group:'combat', volume: .57, guardMs:40},  // -7.6
    punch3:     {group:'combat', volume: .73, guardMs:40},  // -7.3
    kick1:      {group:'combat', volume: .68, guardMs:40},  // -11.7
    kick2:      {group:'combat', volume: .82, guardMs:40},  // -10.8
    kick3:      {group:'combat', volume: .94, guardMs:40},  // -9.5
    death:      {group:'combat', volume: .72, guardMs:300}, // -8.1
    spellCast:  {group:'magic',  volume: .65},  // 音源未配置
    spellFire:  {group:'magic',  volume: .75},  // 音源未配置
    spellHeal:  {group:'magic',  volume: .68},  // 音源未配置
    summon:     {group:'magic',  volume: .70, guardMs:300}, // 音源未配置
    victory:    {group:'ui',     volume: .82, guardMs:1200}, // -10.3
    bossVictory:{group:'ui',     volume: .80, guardMs:1200}, // -10.1
    lifeLost:   {group:'ui',     volume: 1.00}, // -20.5
    S002:       {group:'magic',  volume: .46, guardMs:80}, // 特殊演出：封印解放 -4.2
    S003:       {group:'magic',  volume: 1.00, guardMs:80}, // 特殊演出：生贄破棄 -12.8
    // キャラクター固有ボイス（グループはuiのまま＝combatのmaxPlayMs打ち切りを受けない）
    C001:       {group:'ui',     volume: .97}, // -10.7
    C002:       {group:'ui',     volume: .55}, // -5.8
    C003:       {group:'ui',     volume: .73}, // -8.3
    K026:       {group:'ui',     volume: 1.00}, // -19.2
  },
};

const _sfxCache={};
const _sfxLastPlayed={};
let _sfxUnlocked=false;
let _sfxActiveVoices=0;
let _bgmAudio=null;
let _bgmNextAudio=null;
let _bgmKey='';
let _bgmLoopTimer=null;
let _bgmTargetVolume=.32*SFX_SETTINGS.masterVolume;
// 曲ごとの音量。音源のマスター音量が曲ごとに最大8dB以上違うため、
// 「ファイル自体のRMS × ここの値」がおおよそ揃うように個別に決めている。
// （実測RMS[dBFS] → 再生時の実効値[dBFS]。目標は-16前後）
//   battle1 -10.8 / battle3 -12.2 / village_forest -12.7 / village_grassland -11.1
//   village_valley -13.0 / tower -10.8 / city_capital -17.2 / village_endworld -19.4
//   game_start -18.9 / village_start -20.6 / menu -32.3
// city_capital・village_endworld・game_start・village_start・menuは音源が小さく、1.0でも目標に届かない
// （これ以上はHTMLAudioの音量上限のため、音源側の作り直しが必要）。
const BGM_DEFAULT_VOLUMES={
  menu:1.0,
  battle1:.55,
  battle3:.65,
  villageForest:.68,
  villageGrassland:.57,
  villageValley:.71,
  villageEndworld:1.0,
  cityCapital:1.0,
  tower:.55,
  gameStart:1.0,
  villageStart:1.0, // 音源 -20.6dBFS（1.0でも目標-16に届かない＝音源側の対応が必要）
  // 街BGMに重ねる環境音（サブレイヤー）
  thunder:.5,
  rain:.5,
  bug:.5,
  blacksmith:.5,
};
// 曲ごとの既定の再生開始位置（秒）。opts.startTimeが無い場合に使う。
// 2周目以降は曲の頭から鳴る（_applyBgmStartTimeが初回のみ適用する）。
const BGM_DEFAULT_START_TIMES={
  battle3:103,   // 1:43
  tower:97,      // 1:37
};
// opts.startTimeで指定された再生開始位置（秒）。初回再生のみで、2周目以降は曲の頭から鳴らす。
let _bgmStartTime=0;
// 開始位置へシークしてからonReadyを呼ぶ。メタデータ未読込のまま尺を測ると
// ループ予約のタイミングがずれて曲の終わりで音が途切れるため。
function _applyBgmStartTime(audio,onReady){
  const done=()=>{ if(typeof onReady==='function') onReady(); };
  if(!audio){ done(); return; }
  const seek=()=>{
    if(_bgmStartTime>0){
      try{ audio.currentTime=_bgmStartTime; }catch(e){}
      _bgmStartTime=0; // 開始位置は初回のみ
    }
    done();
  };
  if(audio.readyState>=1) seek();
  else audio.addEventListener('loadedmetadata',seek,{once:true});
}

function _sfxPath(key){
  return Assets&&Assets.sfx?Assets.sfx[key]:null;
}

function _sfxAudio(key){
  const path=_sfxPath(key);
  if(!path) return null;
  if(!_sfxCache[key]){
    const a=new Audio(path);
    a.preload='auto';
    // 音量は SFX_SETTINGS で決める＝先頭の音量ハックの対象外にする印（cloneNodeにも引き継がれる）。
    a.dataset.sfx='1';
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
  
  // 音量は SFX_SETTINGS.sounds の個別値 →（無ければ）グループ既定値の順で決める。
  // ※以前はui/rewardグループを問答無用で1.0へ上書きしていたため、個別音量が一切効かず、
  //   音源のマスター音量差がそのまま出ていた（altar_in -1.0dBFS と ui_confirm -19.9dBFS で約19dB差）。
  const finalVol = opts.volume ?? soundCfg.volume ?? SFX_SETTINGS.groups[groupName]?.volume ?? .2;

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

// ── Assets.sfxに載っていないファイルを直接鳴らす（取得系SE・演出SEなど）────────
// 各所で new Audio(...) を直に使うと、音量の一元管理から漏れるだけでなく
// デバッグミュート（SFX_SETTINGS.masterVolume=0）もプレビュー無音化も効かない。
// 音量は実測ラウドネスに合わせてここで一括管理する（目標-12dBFS。1.0でも届かない音源はそのまま）。
const FILE_SFX_VOLUMES={
  'assets/sfx/buy.wav':        .55,  // 音源 -8.9dBFS
  'assets/sfx/sell.wav':       .53,  // -8.5
  'assets/sfx/ring_get.wav':  1.00,  // -16.1（これ以上上げられない）
  'assets/sfx/item_get.wav':  1.00,  // -22.1（同上）
  'assets/sfx/union.wav':      .79,  // -10.0
  'assets/sfx/ascension.wav':  .68,  // -9.2
  'assets/sfx/board_change1.wav':.79,// -10.0
  'assets/sfx/board_change2.wav':.72,// -8.7
  'assets/sfx/appearance.wav': 1.00, // -12.2
  'assets/sfx/life_lost.wav':  1.00, // -20.5（同上）
  'assets/sfx/game_over.wav':  .49,  // -5.9
};
const _fileSfxCache={};
function playFileSfx(path,volume){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  if(!path) return false;
  let base=_fileSfxCache[path];
  if(!base){
    base=new Audio(path);
    base.preload='auto';
    base.dataset.sfx='1'; // 先頭の音量ハックの対象外にする
    _fileSfxCache[path]=base;
  }
  const vol=Number(volume??FILE_SFX_VOLUMES[path]??.85)||0;
  const a=base.cloneNode();
  a.volume=Math.max(0,Math.min(1,vol*SFX_SETTINGS.masterVolume));
  try{ void Promise.resolve(a.play()).catch(()=>{}); }catch(e){}
  return a;
}

// playSfx()と同じ再生を行い、再生完了（見込み）までを待つPromiseを返す。
// ミュート中／未解錠で鳴らせなかった場合は待たずに即resolveする。
function playSfxAwait(key,opts={}){
  const played=playSfx(key,opts);
  if(!played) return Promise.resolve(false);
  const base=_sfxAudio(key);
  const dur=Number(base&&base.duration);
  const waitMs=Number.isFinite(dur)&&dur>0?Math.min(4000,Math.round(dur*1000)+40):600;
  return new Promise(resolve=>setTimeout(()=>resolve(true),waitMs));
}

// フェードは音声ごとに独立したタイマーで行う。
// ※以前はモジュール変数1本（_bgmFadeTimer）を使い回していたため、BGMと環境音のように
//   複数の音を同時にフェードすると、
//   ①後発のフェードが先発のタイマーを消す（先発の音が途中の音量で固まる／pauseされず居残る）
//   ②先発のsetIntervalは自分のidではなくモジュール変数をclearIntervalするため、
//     完了時に「現在動いている別のフェード」を消したうえで自分は永久に回り続ける
//   という二重の破壊が起きていた。②のゾンビタイマーが残ると以後すべてのフェードが
//   30ms前後で殺され、BGMが極小音量のまま固定される（＝以後の戦闘BGMが鳴らない）。
function _cancelAudioFade(audio){
  if(!audio||!audio._fadeTimer) return;
  clearInterval(audio._fadeTimer);
  audio._fadeTimer=null;
}
function _fadeAudioVolume(audio, from, to, ms, onDone){
  if(!audio) return;
  _cancelAudioFade(audio);
  const start=performance.now();
  audio.volume=Math.max(0,Math.min(1,from));
  const id=setInterval(()=>{
    const t=Math.min(1,(performance.now()-start)/Math.max(1,ms||1));
    audio.volume=Math.max(0,Math.min(1,from+(to-from)*t));
    if(t>=1){
      clearInterval(id);
      if(audio._fadeTimer===id) audio._fadeTimer=null;
      if(onDone) onDone();
    }
  },30);
  audio._fadeTimer=id;
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
  _bgmStartTime=Math.max(0,Number(opts.startTime??BGM_DEFAULT_START_TIMES[key])||0);
  const audio=_makeBgmAudio(path);
  _bgmAudio=audio;
  const baseVol=opts.volume??BGM_DEFAULT_VOLUMES[key]??.32;
  const targetVol=Math.max(0,Math.min(1,baseVol*SFX_SETTINGS.masterVolume));
  audio.dataset.fadeInMs=String(opts.fadeInMs??700);
  _bgmTargetVolume=targetVol;
  if(!_sfxUnlocked) return false;
  audio.play().then(()=>{
    // シーク完了後に尺を測ってループを予約する（曲の終わりで途切れるのを防ぐ）。
    _applyBgmStartTime(audio,()=>{
      _fadeAudioVolume(audio,0,targetVol,opts.fadeInMs??700);
      _scheduleBgmSeamlessLoop();
    });
  }).catch(()=>{});
  return true;
}

// ── サブBGM（メインBGMに重ねる環境音）──────────────────────
// チャンネルごとに独立して鳴らせる（'ambient'＝街の環境音、'facility'＝施設内の環境音）。
// いずれも常に曲の頭からループ再生する。
const _bgmLayers={};
// 環境音のループ継ぎ目対策。<audio loop>のネイティブループは終端〜先頭の切り替えで
// 無音が入る（rain.wavのように途切れて聞こえる）ため、メインBGMと同じ方式で
// 終端の少し手前に次の再生を重ね、前の音をごく短くフェードアウトさせて繋ぐ。
function _clearLayerLoopTimer(state){
  if(state&&state.loopTimer){ clearTimeout(state.loopTimer); state.loopTimer=null; }
}
function _scheduleLayerSeamlessLoop(channel){
  const state=_bgmLayers[channel];
  if(!state||!state.audio) return;
  _clearLayerLoopTimer(state);
  const audio=state.audio;
  const dur=Number(audio.duration)||0;
  if(!dur||!Number.isFinite(dur)){
    audio.addEventListener('loadedmetadata',()=>{
      if(_bgmLayers[channel]===state&&state.audio===audio) _scheduleLayerSeamlessLoop(channel);
    },{once:true});
    return;
  }
  const lead=Math.min(.18,Math.max(.04,dur*.04));
  const delay=Math.max(50,(dur-audio.currentTime-lead)*1000);
  state.loopTimer=setTimeout(()=>{
    if(_bgmLayers[channel]!==state||state.audio!==audio) return;
    const path=_sfxPath(state.key);
    if(!path) return;
    const next=_makeBgmAudio(path);
    next.volume=audio.volume;
    next.play().then(()=>{
      if(_bgmLayers[channel]!==state||state.audio!==audio){ try{ next.pause(); }catch(e){} return; }
      state.audio=next;
      _fadeAudioVolume(audio,audio.volume,0,120,()=>{ _cancelAudioFade(audio); try{ audio.pause(); audio.currentTime=0; }catch(e){} });
      _scheduleLayerSeamlessLoop(channel);
    }).catch(()=>{ if(_bgmLayers[channel]===state&&state.audio===audio) _scheduleLayerSeamlessLoop(channel); });
  },delay);
}
function playBgmLayer(channel,key,opts={}){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  const path=_sfxPath(key);
  if(!path) return false;
  const cur=_bgmLayers[channel];
  if(cur&&cur.key===key&&cur.audio&&!cur.audio.paused) return true;
  stopBgmLayer(channel,0);
  const audio=_makeBgmAudio(path);
  audio.loop=false; // ループは_scheduleLayerSeamlessLoop()で継ぎ目なく繋ぐ
  const state={key,audio,loopTimer:null};
  _bgmLayers[channel]=state;
  const baseVol=opts.volume??BGM_DEFAULT_VOLUMES[key]??.5;
  const targetVol=Math.max(0,Math.min(1,baseVol*SFX_SETTINGS.masterVolume));
  if(!_sfxUnlocked) return false;
  audio.play().then(()=>{
    if(_bgmLayers[channel]!==state||state.audio!==audio) return;
    _fadeAudioVolume(audio,0,targetVol,opts.fadeInMs??1000);
    _scheduleLayerSeamlessLoop(channel);
  }).catch(()=>{});
  return true;
}
function stopBgmLayer(channel,fadeOutMs=350){
  const cur=_bgmLayers[channel];
  if(!cur||!cur.audio) return;
  _clearLayerLoopTimer(cur);
  const audio=cur.audio;
  const finish=()=>{ _cancelAudioFade(audio); try{ audio.pause(); audio.currentTime=0; }catch(e){} };
  if(fadeOutMs>0&&!audio.paused) _fadeAudioVolume(audio,audio.volume,0,fadeOutMs,finish);
  else finish();
  delete _bgmLayers[channel];
}
// 既存呼び出し互換：街の環境音チャンネル
function playBgmSub(key,opts={}){ return playBgmLayer('ambient',key,opts); }
function stopBgmSub(fadeOutMs=350){ stopBgmLayer('ambient',fadeOutMs); }
// ステージ単位で鳴らし続ける環境音（例：ステージ4の雷雨）のチャンネル。
// 街→戦闘→街とBGMが切り替わっても止めないため、stopBgm()／stopAllBgmLayers()の
// 対象から外し、_syncStageAmbience()だけが開始／停止を管理する。
const PERSISTENT_LAYER_CHANNELS=['stage0','stage1','stage2'];
function stopAllBgmLayers(fadeOutMs=350,includePersistent=false){
  Object.keys(_bgmLayers).forEach(ch=>{
    if(!includePersistent&&PERSISTENT_LAYER_CHANNELS.includes(ch)) return;
    stopBgmLayer(ch,fadeOutMs);
  });
}
// タイトルへ戻る／ゲームオーバーなど、ステージ持続音も含めて全部止めたい場合。
function stopEveryBgmLayer(fadeOutMs=350){ stopAllBgmLayers(fadeOutMs,true); }

function stopBgm(fadeOutMs=350){
  stopAllBgmLayers(fadeOutMs);
  if(!_bgmAudio) return;
  _clearBgmLoopTimer();
  const audio=_bgmAudio;
  const next=_bgmNextAudio;
  const finish=()=>{ _cancelAudioFade(audio); try{ audio.pause(); audio.currentTime=0; }catch(e){} };
  if(next){ _cancelAudioFade(next); try{ next.pause(); next.currentTime=0; }catch(e){} }
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
  // フェード中に切り替えられると、走っているフェードが直後に音量を戻してしまう。
  // BGM・環境音（ステージ持続音を含む）・次曲の先読み分まで、フェードを止めてから音量を確定する。
  if(_bgmAudio){ _cancelAudioFade(_bgmAudio); _bgmAudio.volume=_bgmTargetVolume; }
  if(_bgmNextAudio){ _cancelAudioFade(_bgmNextAudio); _bgmNextAudio.volume=_bgmTargetVolume; }
  Object.values(_bgmLayers).forEach(l=>{
    if(!l||!l.audio) return;
    _cancelAudioFade(l.audio);
    l.audio.volume=_debugMuted?0:Math.max(0,Math.min(1,(BGM_DEFAULT_VOLUMES[l.key]??.5)*SFX_SETTINGS.masterVolume));
  });
  // 戦闘画面と街画面の両方のミュートボタンを同期する。
  ['battle-mute-btn','village-mute-btn'].forEach(id=>{
    const btn=document.getElementById(id);
    if(btn) btn.textContent=_debugMuted?'🔇':'🔊';
  });
}
function isDebugMuted(){ return _debugMuted; }

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
document.addEventListener('pointerover',ev=>{
  const btn=ev.target&&ev.target.closest?ev.target.closest('button,.btn'):null;
  if(!btn||btn.disabled||btn.dataset.sfxSilent==='1') return;
  if(ev.relatedTarget&&btn.contains(ev.relatedTarget)) return;
  playSfx('select',{guardKey:`ui:hover:${btn.id||btn.className||'button'}`,guardMs:80});
},true);
