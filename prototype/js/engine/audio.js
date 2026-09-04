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
        if (val > 0 && this.dataset?.bgm !== '1' && this.dataset?.sfx !== '1' && (src.includes('menu') || src.includes('ui') || src.includes('click') || src.includes('confirm') || src.includes('purchase'))) {
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
  // 長い攻撃音・死亡音が多数重なっても、魔法／毒／カード効果音を拒否しない。
  maxVoices:24,
  // **同じ音を同時に鳴らす上限。** 同じ波形が重なると振幅が足し算になり音が割れる。
  maxSameSound:2,
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
    bookOpening:{group:'ui',     volume: 1.00},
    bookClosing:{group:'ui',     volume: 1.00},
    altarIn:    {group:'ui',     volume: .28},  // -1.0（突出して大きかった）
    altarOut:   {group:'ui',     volume: .39},  // -3.9
    fit:        {group:'reward', volume: 1.00, guardMs:80}, // -19.7
    'return':   {group:'ui',     volume: 1.00}, // -12.2
    buy1:       {group:'reward', volume: .86},  // 魔導店購入
    buy2:       {group:'reward', volume: .86},  // 道具屋購入
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
    victory:    {group:'ui',     volume: .82, guardMs:1200}, // -10.3
    bossVictory:{group:'ui',     volume: .80, guardMs:1200}, // -10.1
    lifeLost:   {group:'ui',     volume: 1.00}, // -20.5
    K019:       {group:'magic',  volume: 0.40}, // 封印解放（旧S002）（実測-3.0dBFS）
    S001:       {group:'magic',  volume: 0.92}, // 特殊演出：戦闘中の召喚（実測-10.3dBFS）
    S005:       {group:'magic',  volume: 1.00}, // 特殊演出：攻撃時のバフ効果（実測-11.2dBFS）
    S007:       {group:'magic',  volume: 0.63}, // 特殊演出（シート指定）（実測-7.0dBFS）
    C008:       {group:'magic',  volume: 0.42}, // アラクネ（実測-3.5dBFS）
    C011:       {group:'magic',  volume: 0.67}, // サイレン（実測-7.9dBFS）
    C017:       {group:'magic',  volume: 0.56}, // メデューサ（実測-6.0dBFS）
    C019:       {group:'magic',  volume: 1.00}, // ケンタウロス発射（実測-12.0dBFS）
    C019_HIT:   {group:'magic',  volume: 0.43}, // ケンタウロス着弾（実測-3.7dBFS）
    K020:       {group:'magic',  volume: 0.39}, // 復活（実測-2.9dBFS）
    S004:       {group:'magic',  volume: 1.00}, // 特殊演出：マナ増加（実測-20.9dBFS）
    // シートの「VFX/SE」列に書ける番号は、ここにも必ず登録すること。
    // 登録が無いと playSfx() が鳴らず、絵だけ出て音が出ない。
    S003:       {group:'magic',  volume: 0.83}, // 特殊演出：金貨（旧C001）（実測-9.5dBFS）
    S006:       {group:'magic',  volume: 0.53}, // 特殊演出：負傷効果（旧C003）（実測-5.4dBFS）
    S008:       {group:'magic',  volume: 0.89}, // 特殊演出：活性化（旧E045）（実測-10.0dBFS）
    S009:       {group:'magic',  volume: 0.77}, // 特殊演出：バフ（常時）（実測-8.8dBFS）
    K007:       {group:'combat',  volume: 0.50}, // 貫通（実測-4.9dBFS）
    K008:       {group:'combat',  volume: 0.53}, // 三方向攻撃（実測-5.4dBFS）
    K009:       {group:'combat',  volume: 0.40}, // 全体攻撃（実測-2.9dBFS）
    // キャラクター固有ボイス（グループはuiのまま＝combatのmaxPlayMs打ち切りを受けない）
    C001:       {group:'ui',     volume: .97}, // -10.7
    C002:       {group:'ui',     volume: .55}, // -5.8
    C003:       {group:'ui',     volume: .73}, // -8.3
    K023:       {group:'magic',  volume: 1.00}, // マナ効果（旧K026）（実測-17.3dBFS）
    // 強化カードの効果SE（カードNo.で引く）
    E045:       {group:'ui',     volume: 1.00},
    E058:       {group:'magic',  volume: 0.89}, // 炎の矢（発生元）（実測-10.0dBFS）
    E058_HIT:   {group:'magic',  volume: 0.42}, // 炎の矢（着弾）（実測-3.5dBFS）
    K003:       {group:'combat',  volume: 0.47}, // 毒牙（毒のデバフを受けた瞬間）（実測-4.5dBFS）
    K017:       {group:'combat',  volume: 1.00}, // 毒（毒でダメージを受けた瞬間）（実測-19.5dBFS）
  },
};

const _sfxCache={};
const _sfxLastPlayed={};
let _sfxUnlocked=false;
let _sfxActiveVoices=0;
// 鳴っている本数を音ごとに数える（同じ波形の重ねすぎ＝音割れを防ぐ）。
const _sfxPlayingByKey=Object.create(null);
let _bgmAudio=null;
let _bgmNextAudio=null;
let _bgmKey='';
let _bgmStartToken=0;
let _bgmStartingKey='';
// 自動再生ポリシーで拒否されても、最初の実ユーザー操作で同じ要求を再試行する。
let _bgmPendingRequest=null;
let _bgmLoopTimer=null;
let _bgmTargetVolume=.32*SFX_SETTINGS.masterVolume;
// 曲ごとの音量。音源のマスター音量が曲ごとに最大8dB以上違うため、
// 「ファイル自体のRMS × ここの値」がおおよそ揃うように個別に決めている。
// （実測RMS[dBFS] → 再生時の実効値[dBFS]。目標は-16前後）
//   battle1 -10.8 / battle3 -12.2 / village_forest -12.7 / village_grassland -11.1
//   village_valley -13.0 / tower -10.8 / city_capital -17.2 / village_endworld -19.4
//   village_start -20.6 / menu -32.3
// city_capital・village_endworld・village_start・menuは音源が小さく、1.0でも目標に届かない
// （これ以上はHTMLAudioの音量上限のため、音源側の作り直しが必要）。
const BGM_DEFAULT_VOLUMES={
  menu:1.0,
  battle1:.55,
  battle3:.65,
  battle4:.65,
  gameClear:.65,
  villageForest:.68,
  villageGrassland:.57,
  villageValley:.71,
  villageEndworld:1.0,
  cityCapital:1.0,
  tower:.55,
  gameTitle:1.0,
  villageStart:1.0, // 音源 -20.6dBFS（1.0でも目標-16に届かない＝音源側の対応が必要）
  // 街BGMに重ねる環境音（サブレイヤー）
  thunder:.8,
  rain:.5,
  bug:.5,
  blacksmith:.5,
};
// 曲ごとの既定の再生開始位置（秒）。opts.startTimeが無い場合に使う。
// 2周目以降は曲の頭から鳴る（_applyBgmStartTimeが初回のみ適用する）。
const BGM_DEFAULT_START_TIMES={
  battle3:103,   // 1:43
  battle4:79,    // 1:19（ラスボス戦）
  tower:97,      // 1:37
  gameTitle:97, // 1:37
  villageStart:92, // 1:32
};
// 開始位置へシークしてからonReadyを呼ぶ。メタデータ未読込のまま尺を測ると
// ループ予約のタイミングがずれて曲の終わりで音が途切れるため。
function _applyBgmStartTime(audio,onReady){
  const done=()=>{ if(typeof onReady==='function') onReady(); };
  if(!audio){ done(); return; }
  const startTime=Math.max(0,Number(audio.dataset.startTime)||0);
  if(startTime<=0){ done(); return; }
  // readyState>=1（メタデータのみ）でも seekable がまだ空／開始位置を含まないことがあり、
  // その状態で currentTime へ代入しても位置は 0 のまま戻る＝曲の頭から鳴ってしまう。
  // 実際に到達できたことを確認してから onReady（フェードイン）へ進める。
  let settled=false;
  let pollTimer=null;
  let giveUpTimer=null;
  const EVENTS=['loadedmetadata','loadeddata','canplay','canplaythrough','progress','seeked'];
  const finish=()=>{
    if(settled) return;
    settled=true;
    EVENTS.forEach(t=>audio.removeEventListener(t,attempt));
    if(pollTimer) clearInterval(pollTimer);
    if(giveUpTimer) clearTimeout(giveUpTimer);
    done();
  };
  const attempt=()=>{
    if(settled) return;
    try{
      const ranges=audio.seekable;
      const covered=!!(ranges&&ranges.length&&startTime<=ranges.end(ranges.length-1));
      if(!covered&&audio.readyState<3) return;
      audio.currentTime=startTime;
    }catch(e){ return; }
    if(Math.abs((Number(audio.currentTime)||0)-startTime)<=1) finish();
  };
  EVENTS.forEach(t=>audio.addEventListener(t,attempt));
  pollTimer=setInterval(attempt,120);
  // 到達できないまま無音が続くより、頭から鳴らしてフェードインへ進める方がまし。
  // Rangeに対応したサーバーならメタデータ取得直後にseekableが全体を覆うため、
  // 通常はここへ来ない。来る場合（Range非対応など）は待たせすぎない。
  giveUpTimer=setTimeout(finish,1500);
  attempt();
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

// ── 再生用の複製プール ────────────────────────────────
// 鍵ごとに読み込み済みの複製を持ち回る。毎回 cloneNode() すると複製は
// 読み込みからやり直しになり、鳴り始めるまでの時間が1回ごとにばらつく。
// （同じ瞬間に鳴らした攻撃と反撃の音がずれて聞こえる原因）
const _sfxVoicePool={};
const SFX_VOICE_POOL_MAX=4;
function _makeSfxVoice(base){
  const a=base.cloneNode();
  a.preload='auto';
  // 鳴っている効果音をまとめて止められるようにする目印（stopAllSfx）。
  a.dataset.sfxVoice='1';
  // iOS/Safari等では、DOMから外れたAudio複製が再生開始前に回収されることがある。
  // 再生中だけ非表示要素として保持する。
  a.setAttribute('aria-hidden','true');
  a.style.display='none';
  (document.body||document.documentElement).appendChild(a);
  try{ a.load(); }catch(e){ /* 読み込みは再生時に行われる */ }
  return a;
}
function _takeSfxVoice(key,base){
  const pool=_sfxVoicePool[key]||(_sfxVoicePool[key]=[]);
  const a=pool.pop()||_makeSfxVoice(base);
  try{ a.pause(); a.currentTime=0; }catch(e){ /* 巻き戻せない状態でも再生は試みる */ }
  return a;
}
function _freeSfxVoice(key,a){
  if(!a) return;
  try{ a.pause(); a.currentTime=0; }catch(e){}
  const pool=_sfxVoicePool[key]||(_sfxVoicePool[key]=[]);
  if(pool.length<SFX_VOICE_POOL_MAX&&a.isConnected){ pool.push(a); return; }
  if(a.parentNode) a.parentNode.removeChild(a);
}

// ── 鳴っている効果音を全部止める ────────────────────────────
// 戦闘そのものが中断された時（試験戦闘の終了など）に使う。
// 効果のSEには長いものがあり、止めないと画面を移った後も鳴り続ける。
// BGMは対象外（別経路で管理している）。
function stopAllSfx(){
  if(typeof document==='undefined') return;
  document.querySelectorAll('audio[data-sfx-voice]').forEach(a=>{
    try{ a.pause(); a.currentTime=0; }catch(e){}
  });
  _sfxActiveVoices=0;
  Object.keys(_sfxPlayingByKey).forEach(k=>{ _sfxPlayingByKey[k]=0; });
}

// 使う音を先に鳴らせる状態にしておく。戦闘の最初の一撃だけ鳴り始めが遅れるのを防ぐ。
// **プールの上限まで暖めること。** 暖機が2本だと、前のターンの音がまだ鳴り終わって
// いない間に次のターンの同じ音が来た時点で、読み込み前の複製を作ることになり、
// その1回だけ鳴り始めが遅れる（「たまにヒット音がずれる」原因）。
function warmSfxVoices(keys){
  (keys||[]).forEach(key=>{
    const base=_sfxAudio(key);
    if(!base) return;
    const pool=_sfxVoicePool[key]||(_sfxVoicePool[key]=[]);
    while(pool.length<SFX_VOICE_POOL_MAX) pool.push(_makeSfxVoice(base));
  });
}

function preloadSfx(){
  if(!Assets||!Assets.sfx) return;
  Object.keys(Assets.sfx).forEach(k=>_sfxAudio(k));
}

function unlockSfx(){
  _sfxUnlocked=true;
  preloadSfx();
  // 既存のaudioが自動再生拒否で捨てられている場合は、保留要求から作り直す。
  // audioが残っていないと下の再開ブロックが働かず、BGMが永久に鳴らない。
  if(!_bgmAudio&&_bgmPendingRequest){
    const req=_bgmPendingRequest;
    _bgmPendingRequest=null;
    playBgm(req.key,{startTime:req.startTime,fadeInMs:req.fadeInMs});
    return;
  }
  // ミュート起動でここまで無音だったBGMは、実操作の時点で解除するだけで鳴り始める。
  if(_bgmAudio&&_bgmAudio.muted){
    _bgmAudio.muted=false;
    if(!_bgmAudio.paused) return;
  }
  if(_bgmAudio&&_bgmAudio.paused){
    const audio=_bgmAudio;
    const key=_bgmKey;
    const fadeInMs=Number(audio.dataset.fadeInMs)||700;
    // ここも play() を先に呼ぶ。実操作直後の許可を逃さないため。
    audio.play().then(()=>{
      if(_bgmAudio!==audio||_bgmKey!==key) return;
      _applyBgmStartTime(audio,()=>{
        if(_bgmAudio!==audio||_bgmKey!==key) return;
        audio.dataset.startTime='0';
        _fadeAudioVolume(audio,0,_bgmTargetVolume,fadeInMs);
        _scheduleBgmSeamlessLoop();
      });
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
  // **同じ音を同時に何本も重ねない。** 同じ波形が重なると振幅がそのまま足し算に
  // なり、1本では割れない音でも簡単に振り切れる（矢を4本同時に撃つ等）。
  // guardMs=0 で意図的に連射している呼び出しがあるので、ここは本数で止める。
  if((_sfxPlayingByKey[key]||0)>=SFX_SETTINGS.maxSameSound) return false;
  _sfxLastPlayed[guardKey]=now;

  // **複製を使い回す。** cloneNode()で毎回作り直すと、その複製は読み込みからやり直しになり、
  // play()が実際に鳴り始めるまでの時間が1回ごとにばらつく。攻撃と反撃のように同じ瞬間に
  // 2つ鳴らすと、この差がそのまま「音がずれて聞こえる」原因になる。
  // 一度読み込んだ複製を鍵ごとに持ち回り、currentTime=0 で鳴らし直す。
  const a=_takeSfxVoice(key,base);
  if(!a) return false;
  const speed=(typeof getBattleSpeedScale==='function'&&typeof G!=='undefined'&&(G.phase==='enemy'||G._battlePhaseRunning))?getBattleSpeedScale():1;
  a.playbackRate=Math.max(.5,Math.min(2,speed));
  a.volume=Math.max(0,Math.min(1, finalVol * SFX_SETTINGS.masterVolume));
  _sfxActiveVoices++;
  _sfxPlayingByKey[key]=(_sfxPlayingByKey[key]||0)+1;
  let released=false;
  const release=()=>{
    if(released) return;
    released=true;
    _sfxActiveVoices=Math.max(0,_sfxActiveVoices-1);
    _sfxPlayingByKey[key]=Math.max(0,(_sfxPlayingByKey[key]||0)-1);
    _freeSfxVoice(key,a);
  };
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
  'assets/sfx/buy1.wav':       .55,
  'assets/sfx/buy2.wav':       .86,
  'assets/sfx/sell.wav':       .53,  // -8.5
  'assets/sfx/ring_get.wav':  1.00,  // -16.1（これ以上上げられない）
  'assets/sfx/item_get.wav':  1.00,  // -22.1（同上）
  'assets/sfx/union.wav':      .79,  // -10.0
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

let _bgmLoopPrepTimer=null;
function _clearBgmLoopTimer(){
  if(_bgmLoopTimer) clearTimeout(_bgmLoopTimer);
  _bgmLoopTimer=null;
  if(_bgmLoopPrepTimer) clearTimeout(_bgmLoopPrepTimer);
  _bgmLoopPrepTimer=null;
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
  // 切り替えの瞬間に新しいAudioを作ると、大きいWAV（battle4は約25MB）では
  // デコードが間に合わず一瞬音が途切れる。8秒前に用意して読み込ませておく。
  const prepAhead=8000;
  const prepDelay=Math.max(0,delay-prepAhead);
  _bgmLoopPrepTimer=setTimeout(()=>{
    if(_bgmAudio!==audio||_bgmKey!==key) return;
    const path=_sfxPath(key);
    if(!path) return;
    const prepared=_makeBgmAudio(path);
    prepared.dataset.bgmLoopKey=key;
    _bgmNextAudio=prepared;
    try{ prepared.load(); }catch(e){}
  },prepDelay);
  _bgmLoopTimer=setTimeout(()=>{
    if(_bgmAudio!==audio||_bgmKey!==key) return;
    const path=_sfxPath(key);
    if(!path) return;
    // 事前に用意したものがあればそれを使う（読み込み済みなので途切れない）。
    const prepared=(_bgmNextAudio&&_bgmNextAudio.dataset&&_bgmNextAudio.dataset.bgmLoopKey===key)?_bgmNextAudio:null;
    const next=prepared||_makeBgmAudio(path);
    _bgmNextAudio=next;
    next.volume=_bgmTargetVolume;
    next.play().then(()=>{
      if(_bgmAudio!==audio||_bgmKey!==key){ next.pause(); return; }
      const old=audio;
      _bgmAudio=next;
      _bgmNextAudio=null;
      _fadeAudioVolume(old,old.volume,0,120,()=>{
        try{
          old.pause();
          old.currentTime=0;
          // 大きいWAV（30MB前後）のデコード済みバッファを抱えたままだと、
          // 次のループやSFXの再生で音が途切れやすい。参照を切って解放させる。
          old.removeAttribute('src');
          old.load();
        }catch(e){}
      });
      _scheduleBgmSeamlessLoop();
    }).catch(()=>{ _scheduleBgmSeamlessLoop(); });
  },delay);
}

function playBgm(key,opts={}){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  const path=_sfxPath(key);
  if(!path) return false;
  if(_bgmKey===key&&(_bgmStartingKey===key||(_bgmAudio&&!_bgmAudio.paused))) return true;
  stopBgm(0);
  const startToken=++_bgmStartToken;
  _bgmStartingKey=key;
  _bgmKey=key;
  const audio=_makeBgmAudio(path);
  _bgmAudio=audio;
  const baseVol=opts.volume??BGM_DEFAULT_VOLUMES[key]??.32;
  const targetVol=Math.max(0,Math.min(1,baseVol*SFX_SETTINGS.masterVolume));
  audio.dataset.fadeInMs=String(opts.fadeInMs??700);
  audio.dataset.startTime=String(Math.max(0,Number(opts.startTime??BGM_DEFAULT_START_TIMES[key])||0));
  _bgmTargetVolume=targetVol;
  _bgmPendingRequest={
    key,
    startTime:Number(audio.dataset.startTime)||0,
    fadeInMs:Number(audio.dataset.fadeInMs)||0,
    volume:targetVol,
  };
  if(!_sfxUnlocked) return false;
  // play() は「その場で」呼ぶこと。メタデータ待ちで遅らせると自動再生の許可判定を
  // 逃し、操作するまで鳴らなくなる（オンライン化前は同期呼び出しで鳴っていた）。
  // 曲の頭は聞こえない：audioのvolumeは0で作られ、シーク完了後にフェードインする。
  const stillCurrent=()=>startToken===_bgmStartToken&&_bgmAudio===audio&&_bgmKey===key;
  const onStarted=()=>{
    if(!stillCurrent()){
      try{ audio.pause(); audio.currentTime=0; audio.removeAttribute('src'); audio.load(); }catch(e){}
      return;
    }
    if(_bgmPendingRequest&&_bgmPendingRequest.key===key) _bgmPendingRequest=null;
    if(_bgmStartingKey===key) _bgmStartingKey=''; // 開始完了。以後の再要求は下の重複ガードで弾く
    _applyBgmStartTime(audio,()=>{
      if(!stillCurrent()) return;
      audio.dataset.startTime='0'; // 実際に再生が始まった後だけ消費する
      _fadeAudioVolume(audio,0,targetVol,opts.fadeInMs??700);
      _scheduleBgmSeamlessLoop();
    });
  };
  audio.play().then(onStarted).catch(()=>{
    // 自動再生拒否は失敗扱いにせず、実ユーザー操作から同じ要求を再試行する。
    // ここで_bgmStartingKeyを残すと playBgm() 冒頭の重複ガードに永久に引っかかり、
    // タイトル導入1秒後の再試行も「操作時の再試行」も全て無視される（BGMが鳴らない）。
    if(!stillCurrent()) return;
    _bgmStartingKey='';
    // ミュート再生は自動再生ポリシーで常に許可される。無音でも曲を進めておけば、
    // 最初の操作でミュートを外すだけで「頭から」ではなく正しい位置から聞こえる。
    // ミュート解除が操作前でも許可されるブラウザでは、この時点から実際に鳴る。
    audio.muted=true;
    audio.play().then(()=>{
      if(!stillCurrent()){ audio.muted=false; return; }
      onStarted();
      _tryUnmuteBgm(audio);
    }).catch(()=>{ audio.muted=false; });
  });
  return true;
}

// ミュート起動したBGMのミュートを外す。解除が拒否されて停止するブラウザでは
// 元のミュート再生へ戻し、最初のユーザー操作（unlockSfx）での解除に委ねる。
function _tryUnmuteBgm(audio){
  if(!audio||!audio.muted) return;
  audio.muted=false;
  setTimeout(()=>{
    if(_bgmAudio!==audio) return;
    if(audio.paused){
      audio.muted=true;
      audio.play().catch(()=>{});
    }
  },250);
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
  _bgmStartToken++;
  _bgmStartingKey='';
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
  _bgmPendingRequest=null;
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
// playSfx()を経由せず new Audio() で直接鳴らすフォールバック用の音量。
// 素の音量をそのまま入れるとデバッグミュート（masterVolume=0）を素通りしてしまうため、
// 必ずこれを通して masterVolume を掛ける。
function sfxFallbackVolume(base){
  const master=Number(SFX_SETTINGS&&SFX_SETTINGS.masterVolume);
  const m=Number.isFinite(master)?master:1;
  return Math.max(0,Math.min(1,(Number(base)||0)*m));
}
function isDebugMuted(){ return _debugMuted; }

function _handleFirstUserGesture(){
  unlockSfx();
  // 1回で解除してはいけない。最初の操作の play() が自動再生ポリシーで拒否されると
  // 再試行の機会が二度と来ず、BGMが鳴らないままになる。
  // 実際に鳴り始めた（BGM要求が無く、再生中）ことを確認してから解除する。
  const started=!_bgmPendingRequest&&_bgmAudio&&!_bgmAudio.paused;
  if(!started) return;
  document.removeEventListener('pointerdown',_handleFirstUserGesture,true);
  document.removeEventListener('keydown',_handleFirstUserGesture,true);
  document.removeEventListener('click',_handleFirstUserGesture,true);
}
// BGMの再開条件をタイトル画面のクラス状態に依存させず、最初の実操作で解禁する。
document.addEventListener('pointerdown',_handleFirstUserGesture,true);
document.addEventListener('keydown',_handleFirstUserGesture,true);
document.addEventListener('click',_handleFirstUserGesture,true);
window.addEventListener('DOMContentLoaded',preloadSfx);
document.addEventListener('click',ev=>{
  const btn=ev.target&&ev.target.closest?ev.target.closest('button,.btn'):null;
  if(!btn||btn.disabled||btn.dataset.sfxSilent==='1') return;
  playSfx('uiConfirm',{guardKey:'ui:button'});
},true);
document.addEventListener('pointerover',ev=>{
  const title=document.getElementById('scr-title');
  if(title&&title.classList.contains('active')&&title.classList.contains('startup-title')&&!title.classList.contains('startup-menu-visible')) return;
  const btn=ev.target&&ev.target.closest?ev.target.closest('button,.btn'):null;
  if(!btn||btn.disabled) return;
  // デバッグカードは一覧上をなぞるだけで選択音を鳴らさない。
  if(btn.closest('#debug-card-palette .debug-palette-item')) return;
  if(ev.relatedTarget&&btn.contains(ev.relatedTarget)) return;
  playSfx('select',{guardKey:'ui:hover',guardMs:80});
},true);
