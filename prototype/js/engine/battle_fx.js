// LABと同じVbFxを戦闘DOMへ接続する。ルール・ユニット・セーブへ表示状態を保存しない。
const _battleFxStates = new Map();
const _battleFxForms = new Map();
const _battleFxLastRects = new Map();
const _battleFxTimers = new Set();
const _battleFxVoices = new Set();
let _battleFxFrame = 0, _battleFxGeneration = 0, _battleFxSequence = 0;
function _battleFxKey(unit) { return String(unit && unit.id || ''); }
function _battleFxSide(unit) { return unit && unit.side === 'p2' || (G.enemies || []).includes(unit) ? 'enemy' : 'ally'; }
function battleFxSpeed(code) { return (typeof presentLabSpeed === 'function' ? presentLabSpeed(code) : PRESENT_LAB_SPEED) * (typeof getBattlePresentationSpeedScale === 'function' ? getBattlePresentationSpeedScale() : 1); }
function battleFxGeneration() { return _battleFxGeneration; }
// 脈動の合図は共有定義の開始・終了・濃さ曲線から求める。回数だけをコアから受け取る。
function battleFxPulseTimes(name,count){
  return VbFx.pulseTimes(name,count);
}
// 2026-10-12: 血滴へほどけたカードは通常の焼失を重ねず、その位置で消し切る。
function battleFxHideConsumedCard(unit){
  if(!unit)return;const r=battleFxRect(unit),el=r&&r.element;
  if(el){el.style.setProperty('transition','none','important');el.style.setProperty('visibility','hidden','important');}
  unit._deathFxDone=true;unit._deathFxReady=true;
}
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
function _battleFxSound(code, speed, duration, howl, cueMs) {
  const spec = presentLabFx(code);
  if (!spec || spec[1] == null || typeof playSfx !== 'function') return;
  const baseMs=VbFx.duration(spec[0],speed);
  const hit = cueMs==null?VbFx.impactMs(spec[0],speed)*(duration===baseMs?1:duration/baseMs):cueMs, lead = hit - spec[1] * 1000;
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
  // 2026-10-12: ニンフの各色はコアが選んだ代表IDにだけ付ける。描画側で色数を計算しない。
  const colors=PRESENT_LAB_CARD_COLORS;
  if(opt.colors)located.forEach((entry,i)=>{const color=opt.colors.find(c=>c.unitId===(targets[entry.index]||{}).id);if(color)rects[i]={...entry.rect,color:colors[color.color]||'#b5d8eb'};});
  if (!from && !rects.length) return Promise.resolve(false);
  VbFx.settings.layer = _battleFxLayer;
  const speed = battleFxSpeed(code), ms = opt.durationMs || VbFx.duration(spec[0],speed);
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
    speed,durationMs:opt.durationMs,value:opt.value,impactTimesMs:opt.impactTimes?opt.impactTimes.map(t=>t*ms):undefined,
    cueTimesMs:opt.cueTimes?opt.cueTimes.map(t=>t*ms):undefined,onCue:opt.onCue,
    dir:random[0]%2?1:-1,resolveElement:_battleFxResolveElement,
    onImpact:i=>{ if(typeof opt.onImpact==='function') opt.onImpact(located[i]?located[i].index:i); }});
  if(!opt.silent)_battleFxSound(code,speed,ms,spec[2] === 'howl',opt.cueTimes&&opt.cueTimes.length?opt.cueTimes[0]*ms:undefined);
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
  if (!entry) return;
  Object.assign(entry.values,values);
  // 結界消失などは次のrAFを待たず、そのイベントの命中時刻に止める。
  Object.keys(values).forEach(state=>{
    const name = `${state}-state`, old = entry.loops.get(name);
    if (old && !(Number(values[state])>0)) {
      VbFx.stop({name,key,element:old.element}); entry.loops.delete(name);
    }
  });
}
function battleFxStopUnitStates(unit) {
  const key = _battleFxKey(unit), entry = _battleFxStates.get(key);
  if (!entry) return;
  if (typeof VbFx !== 'undefined') entry.loops.forEach((old,name)=>VbFx.stop({name,key,element:old.element}));
  entry.loops.clear(); _battleFxStates.delete(key);
}
function battleFxStoredStateValues(unit) { const entry = _battleFxStates.get(_battleFxKey(unit)); return entry ? entry.values : null; }
function battleFxStateValues(unit) { return battleFxStoredStateValues(unit)||_battleFxValues(unit); }
function battleFxSyncUnit(unit, side, slot) {
  if (!unit || !slot || typeof VbFx === 'undefined') return;
  if (unit._deathFxReady || unit._deathFxStarted || unit._deathFxDone) { battleFxStopUnitStates(unit); return; }
  const key = _battleFxKey(unit);
  let entry = _battleFxStates.get(key);
  if (!entry) { entry = {unit,side,values:_battleFxValues(unit),loops:new Map()}; _battleFxStates.set(key,entry); }
  entry.unit = unit; entry.side = side;
  // 初期値だけ体から読み、以後は表示したコアイベントで進める。
  // PvEの最終状態の先読み、オンラインの再生用写しによる巻き戻しを避ける。
  if (!_battleFxFrame) _battleFxFrame = requestAnimationFrame(_battleFxFollowStates);
}
// カードが画面に出ているか（開戦演出で登場する前・登場の隠し中は状態VFXを出さない。2026-10-07 利用者指摘）。
function _battleFxCardShown(element) {
  const card = element.matches && element.matches('.unit-card') ? element : (element.querySelector && element.querySelector('.unit-card')) || element;
  const cs = getComputedStyle(card);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && (parseFloat(cs.opacity) || 0) > .05;
}
function _battleFxFollowStates() {
  _battleFxFrame = 0;
  const screen = document.getElementById('scr-battle');
  if (!screen || !screen.classList.contains('active')) { stopBattleLabFx(); return; }
  void 0;
  // 終戦後も、残っている状態の表示は消さない（2026-10-07 利用者指定）。戦闘画面を離れる・次の戦闘の頭で片付ける。
  const ended=!['player','enemy','battle'].includes(G.phase)||G._battleVictoryPending;
  VbFx.settings.layer = _battleFxLayer;
  _battleFxStates.forEach((entry,key) => {
    const r = battleFxRect(entry.unit,entry.side), visible = r && r.element && r.element.style.visibility!=='hidden' &&
      _battleFxCardShown(r.element) &&
      !entry.unit._deathFxReady && !entry.unit._deathFxStarted && !entry.unit._deathFxDone && !entry.unit._reviveHidden &&
      ((typeof presentShownHp==='function'?presentShownHp(entry.unit):entry.unit.hp)>0 ||
        (typeof presentKeepsOnBoard==='function'&&presentKeepsOnBoard(entry.unit)));
    for (const state of ['shield','poison','weaken','guts','revive']) {
      const name = `${state}-state`, old = entry.loops.get(name), value = visible ? Number(entry.values[state])||0 : 0;
      // カードの要素が作り直されただけなら、止めずに付け替える（出し直すと明滅する）。
      if (old && value && old.element !== r.element && VbFx.retarget && VbFx.retarget({name,key,element:old.element},r)) old.element = r.element;
      if (old && (!value || old.element !== r.element)) { VbFx.stop({name,key,element:old.element}); entry.loops.delete(name); }
      const cur = entry.loops.get(name);
      if (value > 0 && (!cur || cur.element !== r.element || cur.value !== value)) {
        VbFx.play(name,{key,source:r,targets:[r],side:entry.side,value,dir:1,resolveElement:_battleFxResolveElement}).catch(err=>console.error('[battle state VFX]',err));
        entry.loops.set(name,{element:r.element,value});
      }
    }
    if ((!r || !r.element) && !entry.loops.size) _battleFxStates.delete(key);
  });
  if (_battleFxStates.size) _battleFxFrame = requestAnimationFrame(_battleFxFollowStates);
}
function stopBattleLabFx(options) {
  // keepStates：終戦で単発の演出だけ止め、状態のループ表示は残す。
  const keepStates = !!(options && options.keepStates);
  _battleFxGeneration++;
  if (!keepStates && _battleFxFrame) { cancelAnimationFrame(_battleFxFrame); _battleFxFrame = 0; }
  if (typeof VbFx !== 'undefined') VbFx.stopAll(keepStates ? {keepLoops:true} : undefined);
  _battleFxTimers.forEach(clearTimeout); _battleFxTimers.clear();
  _battleFxVoices.forEach(voice=>voice.stop()); _battleFxVoices.clear();
  if (!keepStates) _battleFxStates.clear();
  _battleFxForms.clear(); _battleFxLastRects.clear();
  document.querySelectorAll('[data-battle-lab-fx]').forEach(el=>el.remove());
}
window.addEventListener('pagehide',()=>stopBattleLabFx());
