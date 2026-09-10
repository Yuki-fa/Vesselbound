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
    K018:       {group:'combat', volume: .63, guardMs:80},  // 結界（旧 shield.wav）-7.0
    K001:       {group:'combat', volume: .63, guardMs:80},  // 即死
    poison:     {group:'combat', volume: .48, guardMs:80},  // -4.7
    effectDamage:{group:'magic', volume: .78, guardMs:90},  // 効果ダメージ（旧 fire.wav）-8.8
    C043:       {group:'magic',  volume: .58, guardMs:120}, // アラッサス（旧 super_magic.wav）-6.2
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
// BGMはWeb Audio API（decodeAudioData + AudioBufferSourceNode）で鳴らす。
// 状態は「いま鳴っている1本（_bgmVoice）」と「その鍵」だけ。
let _bgmVoice=null;
let _bgmKey='';
let _bgmStartToken=0;
let _bgmStartingKey='';
// 自動再生ポリシーで拒否されても、最初の実ユーザー操作で同じ要求を再試行する。
let _bgmPendingRequest=null;
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
// 2周目以降は曲の頭から鳴る（start(when,offset)のoffsetにだけ使い、loopStartは0のまま）。
const BGM_DEFAULT_START_TIMES={
  battle3:65,    // 1:05
  battle4:79,    // 1:19（ラスボス戦）
  tower:97,      // 1:37
  gameTitle:97, // 1:37
  villageStart:92, // 1:32
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
  // **BGMはここで読み込まない。** BGMはWeb Audio（fetch + decodeAudioData）で
  // 鳴らすので、<audio preload="auto"> を作ると同じWAVを二重に落とすことになる
  // （BGMは合計340MB近くあり、起動時に全部取りにいってしまう）。
  Object.keys(Assets.sfx).forEach(k=>{ if(!_isBgmKey(k)) _sfxAudio(k); });
}

function unlockSfx(){
  _sfxUnlocked=true;
  preloadSfx();
  // AudioContextは自動再生ポリシーで suspended から始まる。実操作のこの瞬間に解く。
  _resumeBgmContext();
  // Web Audioは波形を全部読んでから鳴らすため、初回だけ読み込み分（0.2〜0.5秒）待つ。
  // 一番よく使う menu.wav（7MB＝最小）だけは先に用意しておく。
  warmBgm('menu');
  // 解禁前の再生要求は鳴らせずに保留してある。ここで鳴らし直す。
  if(_bgmPendingRequest){
    const req=_bgmPendingRequest;
    _bgmPendingRequest=null;
    // playBgm() 冒頭の「同じ曲は鳴らし直さない」ガードに引っかからないよう、
    // 要求前の状態へ戻してから呼ぶ（保留中は _bgmKey/_bgmStartingKey が立っている）。
    _bgmKey=''; _bgmStartingKey='';
    playBgm(req.key,{startTime:req.startTime,fadeInMs:req.fadeInMs,volume:req.volume});
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
  let safetyTimer=null;
  const release=()=>{
    if(released) return;
    released=true;
    if(safetyTimer!=null){ clearTimeout(safetyTimer); safetyTimer=null; }
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
  // 永久に埋まったままになりmaxVoices到達後すべてのSEが鳴らなくなるため、
  // maxPlayMs未設定の音でも一定時間後には強制的に解放する。
  // **解放は音を止める（_freeSfxVoice が pause する）ので、尺より先に来ないこと。**
  // 固定4秒にしていた頃は、4秒より長いSE（boss_victory.wav など）が途中で切れていた。
  const scheduleSafety=()=>{
    if(released) return;
    if(safetyTimer!=null) clearTimeout(safetyTimer);
    const dur=Number(a.duration);
    const ms=(Number.isFinite(dur)&&dur>0)?Math.max(4000,dur*1000+800):4000;
    safetyTimer=setTimeout(()=>{ if(released) return; release(); },ms);
  };
  scheduleSafety();
  if(!(Number.isFinite(Number(a.duration))&&a.duration>0)){
    a.addEventListener('loadedmetadata',scheduleSafety,{once:true});
    a.addEventListener('durationchange',scheduleSafety,{once:true});
  }
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

/* ══════════════════════════════════════════════════════════
   BGM（Web Audio API）
   ──────────────────────────────────────────────────────────
   **BGMとサブBGM（環境音）はここだけで鳴らす。HTMLAudioは使わない。**

   <audio> では、どうやってもループの継ぎ目に違和感が残った。
     ・`loop` 属性（ネイティブループ）    → 終端〜先頭の切り替えで無音が入る
     ・終端の少し手前から次を重ねる       → その分だけ終端が二重に鳴る
     ・終端の直前で次へ差し替える         → 差し替えの瞬間に段差が出る
   波形をまるごと持って `AudioBufferSourceNode.loop` に任せると、継ぎ目は
   **サンプル単位で正確**につながる。ずれる要素がそもそも無くなる。

   ・波形は fetch → decodeAudioData で1度だけ用意し、_bgmBufferCache に持つ。
     WAVは大きい（最大32MB＝デコード後は約2倍）ので、合計が予算を超えたら
     鳴っていない曲から捨てる。
   ・音量・フェードは GainNode のオートメーション（linearRampToValueAtTime）。
     setInterval で volume を書き換える必要はもう無い。
   ・開始位置（battle3の1:05など）は `start(when, offset)` の offset。
     `loopStart` は 0 のままなので、**2周目以降は曲の頭から**鳴る（従来と同じ）。
   ・AudioContext は自動再生ポリシーで suspended から始まる。最初の実操作
     （unlockSfx）で resume する。それまでの要求は _bgmPendingRequest に残す。
   ══════════════════════════════════════════════════════════ */
let _audioCtx=null;
let _bgmMasterGain=null;
// 鍵 → AudioBuffer。使った順に並べ替え、あふれたら古い方から捨てる。
const _bgmBufferCache=new Map();
const _bgmDecoding=new Map();
let _bgmBufferBytes=0;
// デコード後の合計サイズの上限。WAVは最大32MBで、デコードすると
// Float32×チャンネル数＝約2倍（60MB前後）になる。BGMは全部で340MB近くあるので、
// 全曲を持つことはできない。街・戦闘・メニュー・環境音の4〜5本が残る量にする。
const BGM_BUFFER_BUDGET_BYTES=256*1024*1024;

function _isBgmKey(key){
  return /assets\/bgm\//.test(String(_sfxPath(key)||''));
}
function _bgmContext(){
  if(_audioCtx) return _audioCtx;
  const Ctx=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
  if(!Ctx) return null;
  try{ _audioCtx=new Ctx(); }catch(e){ return null; }
  _bgmMasterGain=_audioCtx.createGain();
  _bgmMasterGain.gain.value=1;
  _bgmMasterGain.connect(_audioCtx.destination);
  return _audioCtx;
}
// 実操作の直後に呼ぶこと。suspended のままだと音は出ない。
function _resumeBgmContext(){
  const ctx=_bgmContext();
  if(ctx&&ctx.state==='suspended'){ try{ ctx.resume(); }catch(e){} }
  return ctx;
}
function _bgmBufferBytesOf(buf){
  return buf?Math.max(0,buf.length*buf.numberOfChannels*4):0;
}
// 鳴っていない曲から順に捨てる。Mapは挿入順なので、使うたびに入れ直して
// 「最後に使ったものほど後ろ」にしてある（＝先頭から捨てれば最も古い）。
function _pruneBgmBuffers(alsoKeep){
  if(_bgmBufferBytes<=BGM_BUFFER_BUDGET_BYTES) return;
  const keep=new Set([_bgmKey,alsoKeep,...Object.values(_bgmLayers).map(l=>l&&l.key)].filter(Boolean));
  for(const key of [..._bgmBufferCache.keys()]){
    if(_bgmBufferBytes<=BGM_BUFFER_BUDGET_BYTES) break;
    if(keep.has(key)) continue;
    _bgmBufferBytes-=_bgmBufferBytesOf(_bgmBufferCache.get(key));
    _bgmBufferCache.delete(key);
  }
}
// 波形を用意する。同じ鍵への同時要求は1つのデコードにまとめる。
function _loadBgmBuffer(key){
  const cached=_bgmBufferCache.get(key);
  if(cached){
    _bgmBufferCache.delete(key); _bgmBufferCache.set(key,cached); // 使った印（LRU）
    return Promise.resolve(cached);
  }
  const pending=_bgmDecoding.get(key);
  if(pending) return pending;
  const ctx=_bgmContext();
  const path=_sfxPath(key);
  if(!ctx||!path) return Promise.resolve(null);
  const job=fetch(path).then(res=>{
    if(!res.ok) throw new Error(`${res.status} ${path}`);
    return res.arrayBuffer();
  }).then(bytes=>new Promise((resolve,reject)=>{
    // decodeAudioData はPromiseを返さない実装（古いSafari）もあるため両対応。
    let ret;
    try{ ret=ctx.decodeAudioData(bytes,resolve,reject); }catch(e){ reject(e); return; }
    if(ret&&typeof ret.then==='function') ret.then(resolve,reject);
  })).then(buffer=>{
    _bgmBufferCache.set(key,buffer);
    _bgmBufferBytes+=_bgmBufferBytesOf(buffer);
    _bgmDecoding.delete(key);
    _pruneBgmBuffers(key); // いま読んだものは残す
    return buffer;
  }).catch(e=>{
    _bgmDecoding.delete(key);
    console.warn('[bgm] 読み込みに失敗しました',key,e);
    return null;
  });
  _bgmDecoding.set(key,job);
  return job;
}
// 使う曲を先にデコードしておく（鳴らし始めの待ちを無くしたい場面用）。
function warmBgm(keys){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return;
  (Array.isArray(keys)?keys:[keys]).filter(Boolean).forEach(k=>{ void _loadBgmBuffer(k); });
}

// ── 鳴っている1本（source + gain）─────────────────────────
const BGM_GAIN_FLOOR=0.0001; // 0はlinearRampの終端に使えない（指数系と揃えて最小値を使う）
function _startBgmVoice(buffer,{volume,fadeInMs,offset}){
  const ctx=_bgmContext();
  if(!ctx||!buffer) return null;
  const gain=ctx.createGain();
  const src=ctx.createBufferSource();
  src.buffer=buffer;
  // **継ぎ目はここだけで決まる。** loopStart/loopEndを触らない＝波形の端から端。
  src.loop=true;
  src.connect(gain);
  gain.connect(_bgmMasterGain);
  const now=ctx.currentTime;
  const target=Math.max(0,Math.min(1,Number(volume)||0));
  const fade=Math.max(0,Number(fadeInMs)||0)/1000;
  gain.gain.cancelScheduledValues(now);
  if(fade>0){
    gain.gain.setValueAtTime(BGM_GAIN_FLOOR,now);
    gain.gain.linearRampToValueAtTime(Math.max(BGM_GAIN_FLOOR,target),now+fade);
  }else{
    gain.gain.setValueAtTime(target,now);
  }
  const dur=Number(buffer.duration)||0;
  const from=Math.max(0,Math.min(Number(offset)||0,Math.max(0,dur-0.05)));
  try{ src.start(0,from); }catch(e){ return null; }
  return {src,gain,target};
}
function _setBgmVoiceVolume(voice,value,ms){
  const ctx=_audioCtx;
  if(!voice||!ctx) return;
  const target=Math.max(0,Math.min(1,Number(value)||0));
  const now=ctx.currentTime;
  const sec=Math.max(0,Number(ms)||0)/1000;
  voice.target=target;
  try{
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(BGM_GAIN_FLOOR,voice.gain.gain.value),now);
    if(sec>0) voice.gain.gain.linearRampToValueAtTime(Math.max(BGM_GAIN_FLOOR,target),now+sec);
    else voice.gain.gain.setValueAtTime(target,now);
  }catch(e){}
}
function _stopBgmVoice(voice,fadeOutMs){
  if(!voice) return;
  const ctx=_audioCtx;
  const ms=Math.max(0,Number(fadeOutMs)||0);
  const release=()=>{ try{ voice.src.disconnect(); voice.gain.disconnect(); }catch(e){} };
  if(!ctx||ms<=0){
    try{ voice.src.stop(); }catch(e){}
    release();
    return;
  }
  const now=ctx.currentTime;
  const sec=ms/1000;
  try{
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(BGM_GAIN_FLOOR,voice.gain.gain.value),now);
    voice.gain.gain.linearRampToValueAtTime(BGM_GAIN_FLOOR,now+sec);
    voice.src.stop(now+sec+0.02);
  }catch(e){ try{ voice.src.stop(); }catch(e2){} }
  setTimeout(release,ms+120);
}

function playBgm(key,opts={}){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  const path=_sfxPath(key);
  if(!path) return false;
  // 同じ曲を鳴らし直さない（鳴っている／鳴らし始めている）。
  if(_bgmKey===key&&(_bgmStartingKey===key||_bgmVoice)) return true;
  stopBgm(0);
  const startToken=++_bgmStartToken;
  _bgmStartingKey=key;
  _bgmKey=key;
  const baseVol=opts.volume??BGM_DEFAULT_VOLUMES[key]??.32;
  const targetVol=Math.max(0,Math.min(1,baseVol*SFX_SETTINGS.masterVolume));
  const startTime=Math.max(0,Number(opts.startTime??BGM_DEFAULT_START_TIMES[key])||0);
  const fadeInMs=opts.fadeInMs??700;
  _bgmTargetVolume=targetVol;
  // 保留する音量は**マスター音量を掛ける前**の値。掛けた後を持つと、
  // 鳴らし直す時に masterVolume が二重に掛かる（デバッグミュート中は0除算にもなる）。
  _bgmPendingRequest={key,startTime,fadeInMs,volume:baseVol};
  // 最初の実操作より前は AudioContext を resume できない。要求だけ残して
  // unlockSfx() から鳴らし直す（HTMLAudioのミュート起動は使わない）。
  if(!_sfxUnlocked) return false;
  _resumeBgmContext();
  const stillCurrent=()=>startToken===_bgmStartToken&&_bgmKey===key;
  const startWith=buffer=>{
    if(!stillCurrent()) return;
    // **読めなかった時は「鳴らし始めた」印を残さない。**
    // 残すと playBgm() 冒頭の重複ガードに永久に引っかかり、以後この曲は
    // 何度要求しても鳴らなくなる（画面を移るまで無音のまま）。
    if(!buffer){ _bgmStartingKey=''; _bgmKey=''; return; }
    const voice=_startBgmVoice(buffer,{volume:_bgmTargetVolume,fadeInMs,offset:startTime});
    if(!voice){ _bgmStartingKey=''; _bgmKey=''; return; }
    if(!stillCurrent()){ _stopBgmVoice(voice,0); return; }
    _bgmVoice=voice;
    if(_bgmPendingRequest&&_bgmPendingRequest.key===key) _bgmPendingRequest=null;
    if(_bgmStartingKey===key) _bgmStartingKey='';
    _pruneBgmBuffers();
  };
  // **読み込み済みなら、待たずにその場で鳴らし始める。**
  // Promiseの解決（マイクロタスク）を待つと、戦闘開始のような重い同期処理の
  // 後ろへ回されて、先読みしてあっても曲の頭が数百ms無音になる。
  const ready=_bgmBufferCache.get(key);
  if(ready){
    _bgmBufferCache.delete(key); _bgmBufferCache.set(key,ready); // 使った印（LRU）
    startWith(ready);
    return true;
  }
  _loadBgmBuffer(key).then(startWith);
  return true;
}

// ── サブBGM（メインBGMに重ねる環境音）──────────────────────
// チャンネルごとに独立して鳴らせる（'ambient'＝街の環境音、'facility'＝施設内の環境音）。
// いずれも常に曲の頭からループ再生する。継ぎ目の扱いはメインBGMと同じ。
const _bgmLayers={};
function playBgmLayer(channel,key,opts={}){
  if(_IS_CLAUDE_BROWSER_PREVIEW) return false;
  const path=_sfxPath(key);
  if(!path) return false;
  const cur=_bgmLayers[channel];
  if(cur&&cur.key===key&&(cur.starting||cur.voice)) return true;
  stopBgmLayer(channel,0);
  const baseVol=opts.volume??BGM_DEFAULT_VOLUMES[key]??.5;
  const targetVol=Math.max(0,Math.min(1,baseVol*SFX_SETTINGS.masterVolume));
  const state={key,voice:null,starting:true};
  _bgmLayers[channel]=state;
  if(!_sfxUnlocked){ state.starting=false; delete _bgmLayers[channel]; return false; }
  _resumeBgmContext();
  _loadBgmBuffer(key).then(buffer=>{
    if(!buffer||_bgmLayers[channel]!==state){ state.starting=false; return; }
    const voice=_startBgmVoice(buffer,{volume:targetVol,fadeInMs:opts.fadeInMs??1000,offset:0});
    state.starting=false;
    if(!voice) return;
    if(_bgmLayers[channel]!==state){ _stopBgmVoice(voice,0); return; }
    state.voice=voice;
    _pruneBgmBuffers();
  });
  return true;
}
function stopBgmLayer(channel,fadeOutMs=350){
  const cur=_bgmLayers[channel];
  if(!cur) return;
  delete _bgmLayers[channel];
  if(cur.voice) _stopBgmVoice(cur.voice,fadeOutMs);
  cur.voice=null;
}
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
  const voice=_bgmVoice;
  _bgmVoice=null;
  _bgmKey='';
  _bgmPendingRequest=null;
  if(voice) _stopBgmVoice(voice,fadeOutMs);
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
  // フェード中に切り替えられても、予約済みのフェードごと上書きして音量を確定する
  // （_setBgmVoiceVolume が cancelScheduledValues してから書き直す）。
  // BGM・環境音（ステージ持続音を含む）まで対象にする。
  if(_bgmVoice) _setBgmVoiceVolume(_bgmVoice,_bgmTargetVolume,0);
  Object.values(_bgmLayers).forEach(l=>{
    if(!l||!l.voice) return;
    _setBgmVoiceVolume(l.voice,_debugMuted?0:Math.max(0,Math.min(1,(BGM_DEFAULT_VOLUMES[l.key]??.5)*SFX_SETTINGS.masterVolume)),0);
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
  const started=!_bgmPendingRequest&&!!_bgmVoice;
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
