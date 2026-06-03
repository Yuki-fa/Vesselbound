// ═══════════════════════════════════════
// audio.js — 仮SE再生レイヤー
// すべてのSE参照は Assets.sfx に集約する。
// ═══════════════════════════════════════

const SFX_SETTINGS={
  masterVolume:.72,
  maxVoices:8,
  groups:{
    ui:{guardMs:120,volume:.18},
    combat:{guardMs:250,volume:.28},
    magic:{guardMs:180,volume:.26},
    reward:{guardMs:160,volume:.24},
  },
  sounds:{
    uiConfirm:{group:'ui',volume:.12},
    uiError:{group:'ui',volume:.20},
    reroll:{group:'ui',volume:.18},
    purchase:{group:'reward',volume:.24},
    goldGain:{group:'reward',volume:.20},
    attackLight:{group:'combat',volume:.18},
    hitLight:{group:'combat',volume:.24},
    death:{group:'combat',volume:.28,guardMs:300},
    spellCast:{group:'magic',volume:.22},
    spellFire:{group:'magic',volume:.24},
    spellPoison:{group:'magic',volume:.23},
    spellHeal:{group:'magic',volume:.22},
    summon:{group:'magic',volume:.23,guardMs:300},
    victory:{group:'ui',volume:.34,guardMs:1200},
  },
};

const _sfxCache={};
const _sfxLastPlayed={};
let _sfxUnlocked=false;
let _sfxActiveVoices=0;

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
}

function playSfx(key,opts={}){
  if(!_sfxUnlocked) return false;
  const base=_sfxAudio(key);
  if(!base) return false;
  const soundCfg=SFX_SETTINGS.sounds[key]||{};
  const groupName=opts.group||soundCfg.group||'ui';
  const groupCfg=SFX_SETTINGS.groups[groupName]||SFX_SETTINGS.groups.ui;
  const guardMs=opts.guardMs??soundCfg.guardMs??groupCfg.guardMs??120;
  const guardKey=opts.guardKey||`${groupName}:${key}`;
  const now=performance.now();
  if(now-(_sfxLastPlayed[guardKey]||0)<guardMs) return false;
  if(_sfxActiveVoices>=SFX_SETTINGS.maxVoices) return false;
  _sfxLastPlayed[guardKey]=now;

  const a=base.cloneNode();
  a.volume=Math.max(0,Math.min(1,(opts.volume??soundCfg.volume??groupCfg.volume??.2)*SFX_SETTINGS.masterVolume));
  _sfxActiveVoices++;
  const release=()=>{ _sfxActiveVoices=Math.max(0,_sfxActiveVoices-1); };
  a.addEventListener('ended',release,{once:true});
  a.addEventListener('error',release,{once:true});
  a.play().catch(release);
  return true;
}

function playSpellSfx(sp,opts={}){
  const effect=sp&&sp.effect;
  if(['fire','meteor','bomb'].includes(effect)) return playSfx('spellFire',opts);
  if(['poison','seal','instakill'].includes(effect)) return playSfx('spellPoison',opts);
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
