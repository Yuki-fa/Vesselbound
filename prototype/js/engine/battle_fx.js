// LABと同じVbFxを戦闘DOMへ接続する。ルール・ユニット・セーブへ表示状態を保存しない。
const _battleFxStates = new Map();
const _battleFxForms = new Map();
const _battleFxLastRects = new Map();
const _battleFxTimers = new Set();
const _battleFxVoices = new Set();
let _battleFxFrame = 0, _battleFxGeneration = 0, _battleFxSequence = 0;
function _battleFxKey(unit) { return String(unit && unit.id || ''); }
function _battleFxSide(unit) { return unit && unit.side === 'p2' || (G.enemies || []).includes(unit) ? 'enemy' : 'ally'; }
function battleFxSpeed() { return PRESENT_LAB_SPEED * (typeof getBattlePresentationSpeedScale === 'function' ? getBattlePresentationSpeedScale() : 1); }
function battleFxGeneration() { return _battleFxGeneration; }
function _battleFxLayer() {
  return _vfxClipLayer();
}
function battleFxRect(unit, side, last) {
  if (!unit) return null;
  const id = _battleFxKey(unit);
  const clone = Array.from(document.querySelectorAll('.attack-motion-clone[data-unit-id]')).find(el => el.dataset.unitId === id);
  const el = clone || (typeof getCurrentUnitSlot === 'function' ? getCurrentUnitSlot(side || _battleFxSide(unit), unit) : null);
  if (el && el.isConnected) {
    const r = VbFx.rect(el);
    if (r.width > 0 && r.height > 0) { _battleFxLastRects.set(id,r); return r; }
  }
  const r = last || unit._lastVisualRect || _battleFxLastRects.get(id);
  return r && r.width > 0 && r.height > 0 ? {...r,element:null} : null;
}
function _battleFxResolveElement(element) {
  const id = element && element.dataset.unitId;
  if (!id) return element;
  const unit = [...(G.allies||[]),...(G.enemies||[])].find(u=>u && _battleFxKey(u)===String(id));
  const r = unit && battleFxRect(unit);
  return r && r.element || (element.isConnected ? element : null);
}
function _battleFxTimer(fn, ms) {
  const id = setTimeout(() => { _battleFxTimers.delete(id); fn(); }, Math.max(0,ms));
  _battleFxTimers.add(id); return id;
}
function _battleFxSound(code, speed, duration, howl) {
  const spec = presentLabFx(code);
  if (!spec || spec[1] == null || typeof playSfx !== 'function') return;
  const hit = VbFx.impactMs(spec[0],speed), lead = hit - spec[1] * 1000;
  const startAt = Math.max(0,lead), offsetMs = Math.max(0,-lead);
  const end = howl ? duration * .44 : duration;
  // 遠吠えは登場SEの前に閉じる。通常はLABと同じcos²の1.1秒フェード。
  const fadeAtMs = howl ? Math.max(0,end-startAt-120) : Math.max(0,Math.max(hit+250,end*.95)-startAt);
  const fadeEndMs = howl ? Math.max(1,end-startAt) : fadeAtMs + PRESENT_LAB_SOUND_FADE_MS;
  const token = _battleFxGeneration;
  _battleFxTimer(() => {
    if (token !== _battleFxGeneration) return;
    playSfx(code,{group:'magic',guardKey:`lab:${++_battleFxSequence}`,guardMs:0,maxPlayMs:0,playbackRate:1,
      offsetMs,fadeInMs:offsetMs>0?60:0,fadeAtMs,fadeEndMs,
      onVoice:voice=>{ _battleFxVoices.add(voice); voice.finished.then(()=>_battleFxVoices.delete(voice)); }});
  },startAt);
}
function playBattleLabFx(code, source, targets, options) {
  const spec = presentLabFx(code), opt = options || {};
  if (!spec || typeof VbFx === 'undefined') return Promise.resolve(false);
  const from = opt.sourceRect || battleFxRect(source,opt.side);
  const located = (targets || []).map((unit,index)=>({rect:battleFxRect(unit),index})).filter(x=>x.rect);
  const rects = located.map(x=>x.rect);
  if (!from && !rects.length) return Promise.resolve(false);
  VbFx.settings.layer = _battleFxLayer;
  const speed = battleFxSpeed(), ms = VbFx.duration(spec[0],speed);
  const side = opt.side || _battleFxSide(source || targets[0]);
  // 戦闘用の乱数を消費しない。旋回だけの独立した乱数。
  const random = new Uint32Array(1);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(random);
  else random[0] = ++_battleFxSequence;
  const marker = document.createElement('span'); marker.dataset.battleLabFx = spec[0];
  _battleFxLayer().appendChild(marker);
  if (typeof actionBannerTrackVfxHost === 'function') actionBannerTrackVfxHost(marker);
  if (typeof _syncEffectFlashWithVfx === 'function') _syncEffectFlashWithVfx();
  // direwolfの後半はLAB専用の登場。戦闘では遠吠えだけにして既存の登場へ渡す。
  const fxTargets = spec[2] === 'howl' ? [{...(from || rects[0]),element:null}] : rects;
  const promise = VbFx.play(spec[0],{source:from || rects[0],targets:fxTargets,side,
    allies:(G.allies||[]).filter(Boolean).map(u=>battleFxRect(u,'ally')).filter(Boolean),
    enemies:(G.enemies||[]).filter(Boolean).map(u=>battleFxRect(u,'enemy')).filter(Boolean),
    board:document.getElementById('battle-field')||document.querySelector('#scr-battle .battle-area'),
    speed,dir:random[0]%2?1:-1,resolveElement:_battleFxResolveElement,
    onImpact:i=>{ if(typeof opt.onImpact==='function') opt.onImpact(located[i]?located[i].index:i); }});
  _battleFxSound(code,speed,ms,spec[2] === 'howl');
  // 効果は直列。再描画で発生元DOMが替わっても遠吠えの区間で確実に閉じる。
  if (spec[2] === 'howl') _battleFxTimer(() => VbFx.stop({name:spec[0]}),ms*.46);
  const done = Promise.resolve(promise).catch(err=>{ console.error('[battle LAB VFX]',code,err); return false; }).finally(()=>marker.remove());
  const active = window.__activeVfxPromises || (window.__activeVfxPromises = new Set());
  active.add(done); done.finally(()=>active.delete(done));
  return done;
}
function battleFxHoldForm(unit, form) { if (unit && form) _battleFxForms.set(_battleFxKey(unit),form); }
function battleFxReleaseForm(unit) { _battleFxForms.delete(_battleFxKey(unit)); }
function battleFxShownForm(unit) { return _battleFxForms.get(_battleFxKey(unit)) || unit; }
function _battleFxValues(unit) {
  const keywords = typeof coreUnitKeywords === 'function' ? coreUnitKeywords(unit) : unit.keywords || [];
  // 本文由来の根性・復活は消費後に再び拾わない。後から明示的に付与された分は表示する。
  const hasRoot = keyword => (unit.keywords||[]).includes(keyword) || (!unit._starterRegenUsed && keywords.includes(keyword));
  return {shield:typeof presentShownShield==='function'?presentShownShield(unit):unit.shield||0,
    poison:unit.poison||0,weaken:typeof presentShownWeaken==='function'?presentShownWeaken(unit):unit.weaken||0,
    guts:hasRoot('根性') ? 1:0,revive:hasRoot('復活') ? 1:0};
}
function battleFxAdvanceStates(unit, values) {
  const key = _battleFxKey(unit), entry = _battleFxStates.get(key);
  if (entry) Object.assign(entry.values,values);
}
function battleFxStoredStateValues(unit) { const entry = _battleFxStates.get(_battleFxKey(unit)); return entry ? entry.values : null; }
function battleFxStateValues(unit) { return battleFxStoredStateValues(unit)||_battleFxValues(unit); }
function battleFxSyncUnit(unit, side, slot) {
  if (!unit || !slot || typeof VbFx === 'undefined') return;
  const key = _battleFxKey(unit);
  let entry = _battleFxStates.get(key);
  if (!entry) { entry = {unit,side,values:_battleFxValues(unit),loops:new Map()}; _battleFxStates.set(key,entry); }
  entry.unit = unit; entry.side = side;
  // 初期値だけ体から読み、以後は表示したコアイベントで進める。
  // PvEの最終状態の先読み、オンラインの再生用写しによる巻き戻しを避ける。
  if (!_battleFxFrame) _battleFxFrame = requestAnimationFrame(_battleFxFollowStates);
}
function _battleFxFollowStates() {
  _battleFxFrame = 0;
  const screen = document.getElementById('scr-battle');
  if (!screen || !screen.classList.contains('active')) { stopBattleLabFx(); return; }
  if(!['player','enemy','battle'].includes(G.phase)||G._battleVictoryPending) {
    // 状態は終戦で止める。確定済み終戦効果（レプラコーン等）の単発VFX・SEは最後まで見せる。
    _battleFxStates.forEach(entry=>entry.loops.forEach((old,name)=>VbFx.stop({name,element:old.element})));
    _battleFxStates.clear();return;
  }
  VbFx.settings.layer = _battleFxLayer;
  _battleFxStates.forEach((entry,key) => {
    const r = battleFxRect(entry.unit,entry.side), visible = r && r.element && r.element.style.visibility!=='hidden' &&
      !entry.unit._deathFxReady && !entry.unit._deathFxStarted && !entry.unit._reviveHidden &&
      (typeof presentShownHp==='function'?presentShownHp(entry.unit):entry.unit.hp)>0;
    for (const state of ['shield','poison','weaken','guts','revive']) {
      const name = `${state}-state`, old = entry.loops.get(name), value = visible ? Number(entry.values[state])||0 : 0;
      if (old && (!value || old.element !== r.element)) { VbFx.stop({name,element:old.element}); entry.loops.delete(name); }
      if (value > 0 && (!old || old.element !== r.element || old.value !== value)) {
        VbFx.play(name,{source:r,targets:[r],side:entry.side,value,dir:1}).catch(err=>console.error('[battle state VFX]',err));
        entry.loops.set(name,{element:r.element,value});
      }
    }
    if ((!r || !r.element) && !entry.loops.size) _battleFxStates.delete(key);
  });
  if (_battleFxStates.size) _battleFxFrame = requestAnimationFrame(_battleFxFollowStates);
}
function stopBattleLabFx() {
  _battleFxGeneration++;
  if (_battleFxFrame) cancelAnimationFrame(_battleFxFrame); _battleFxFrame = 0;
  if (typeof VbFx !== 'undefined') VbFx.stopAll();
  _battleFxTimers.forEach(clearTimeout); _battleFxTimers.clear();
  _battleFxVoices.forEach(voice=>voice.stop()); _battleFxVoices.clear();
  _battleFxStates.clear(); _battleFxForms.clear(); _battleFxLastRects.clear();
  document.querySelectorAll('[data-battle-lab-fx]').forEach(el=>el.remove());
}
window.addEventListener('pagehide',stopBattleLabFx);
