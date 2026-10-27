// LABと同じVbFxを戦闘DOMへ接続する。ルール・ユニット・セーブへ表示状態を保存しない。
const _battleFxStates = new Map();
const _battleFxForms = new Map();
const _battleFxLastRects = new Map();
const _battleFxTimers = new Set();
const _battleFxVoices = new Set();
const BATTLE_LAB_VFX_WAIT_GRACE_MS = 1000;
let _battleFxFrame = 0, _battleFxGeneration = 0, _battleFxSequence = 0;
let _battleFxStatesSuspended = false;
function resumeBattleLabStates() { _battleFxStatesSuspended = false; }
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
  // IDを持つカードが盤面から外れたら、まだ接続中の旧DOMも再利用しない。
  return r && r.element ? (element.dataset.battleStateHost ? _battleFxStateRect(element.dataset.battleStateHost,r).element : r.element) : null;
}
// 隠密の微小な揺れはイラストの層だけで行う。カード本体のtransformは
// 詰め（FLIP）と攻撃モーションが使うため、状態ループに原値として保持させない。
// 矩形はカード全体のまま渡し、枠の光・寸法・揺れの量は従来の定義を使う。
function _battleFxStateRect(name,rect) {
  if(name!=='stealth-state'||!rect||!rect.element) return rect;
  const card=rect.element,portrait=card.querySelector('.unit-portrait');
  if(!portrait) return {...rect,element:null};
  let host=card.querySelector('.battle-state-motion-layer');
  if(!host){
    host=document.createElement('div');host.className='battle-state-motion-layer';
    host.dataset.unitId=card.dataset.unitId;host.dataset.battleStateHost=name;
    host.style.cssText='position:absolute;inset:0;pointer-events:none';
    portrait.parentNode.insertBefore(host,portrait);host.appendChild(portrait);
  }
  return {...rect,element:host};
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
  // 音を最後まで鳴らす演出（PRESENT_LAB_SOUND_NO_FADE）はフェードしない。LAB（preview.js）も同じ表。
  const noFade = !howl && typeof PRESENT_LAB_SOUND_NO_FADE !== 'undefined' && PRESENT_LAB_SOUND_NO_FADE.has(spec[0]);
  const fadeEndMs = noFade ? 0 : howl ? Math.max(1,end-startAt) : fadeAtMs + PRESENT_LAB_SOUND_FADE_MS;
  const token = _battleFxGeneration;
  _battleFxTimer(() => {
    if (token !== _battleFxGeneration) return;
    playSfx(presentLabSoundCode(code),{group:'magic',guardKey:`lab:${++_battleFxSequence}`,guardMs:0,maxPlayMs:0,playbackRate:1,
      offsetMs,fadeInMs:offsetMs>0?(typeof PRESENT_LAB_SOUND_FADE_IN_MS!=='undefined'&&PRESENT_LAB_SOUND_FADE_IN_MS[spec[0]]||60):0,fadeAtMs:noFade?0:fadeAtMs,fadeEndMs,
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
  const endRatio = presentLabPlaybackEndRatio(code,VbFx.effects.find(d=>d.name===spec[0]),rects.length>0);
  // 反復の150msは、空白を除いた可視区間全体へ割り当てる。
  const durationMs = opt.durationMs ? opt.durationMs / endRatio : undefined;
  const speed = battleFxSpeed(code), ms = durationMs || VbFx.duration(spec[0],speed);
  // seekRatio：演出の途中（全尺に対する割合）から始める。SEの山も同じだけ前へ寄せる。
  const seekMs = Math.max(0, Math.min(.95, Number(opt.seekRatio) || 0)) * ms;
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
    speed,durationMs,endRatio,value:opt.value,seekMs,...(opt.targetsBox?{targetsBox:opt.targetsBox}:{}),impactTimesMs:opt.impactTimes?opt.impactTimes.map(t=>t*ms):undefined,
    cueTimesMs:opt.cueTimes?opt.cueTimes.map(t=>t*ms):undefined,onCue:opt.onCue,
    dir:random[0]%2?1:-1,resolveElement:_battleFxResolveElement,
    // 召喚の登場など、出した後にカードの詰め直しで位置が動く演出は、カードの位置を毎コマ追いかける。
    ...(opt.follow?{followGeometry:true}:{}),
    onImpact:i=>{ if(typeof opt.onImpact==='function') opt.onImpact(located[i]?located[i].index:i); }});
  const cueMs = opt.cueTimes&&opt.cueTimes.length ? opt.cueTimes[0]*ms
    : seekMs || endRatio!==1 ? VbFx.impactMs(spec[0],speed)*ms/VbFx.duration(spec[0],speed) - seekMs : undefined;
  if(!opt.silent)_battleFxSound(code,speed,ms * endRatio - seekMs,spec[2] === 'howl',cueMs);
  // 効果は直列。再描画で発生元DOMが替わっても遠吠えの区間で確実に閉じる。
  if (spec[2] === 'howl') _battleFxTimer(() => VbFx.stop({name:spec[0]}),ms*.46);
  // 非表示タブや中断でrendererの完了通知が来なくても、召喚・次のイベントの待ちを残さない。
  // 通常は本来の完了通知が先に来る。尺そのものは変えず、全尺の後に安全弁を置く。
  let timeout;
  const deadline = new Promise(resolve=>{ timeout=setTimeout(()=>{
    VbFx.stop({name:spec[0]});resolve(false);
  },Math.max(0,ms-seekMs)+BATTLE_LAB_VFX_WAIT_GRACE_MS); });
  const done = Promise.race([Promise.resolve(promise),deadline])
    .catch(err=>{ console.error('[battle LAB VFX]',code,err); return false; })
    .finally(()=>{clearTimeout(timeout);marker.remove();});
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
  return {shield:Number(typeof presentShownShield==='function'?presentShownShield(unit):unit.shield)>0?1:0,
    poison:unit.poison||0,weaken:typeof presentShownWeaken==='function'?presentShownWeaken(unit):unit.weaken||0,
    guts:hasRoot('根性') ? 1:0,revive:hasRoot('復活') ? 1:0,
    // 隠密・防戦（2026-10-25 利用者指定）：持っている間ずっと出す。
    stealth:unit.stealth||keywords.includes('隠密') ? 1:0,guard:keywords.includes('防戦') ? 1:0};
}
function battleFxAdvanceStates(unit, values) {
  const key = _battleFxKey(unit), entry = _battleFxStates.get(key);
  if (!entry) return;
  if(Object.prototype.hasOwnProperty.call(values,'shield')) values={...values,shield:Number(values.shield)>0?1:0};
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
  if (_battleFxStatesSuspended || !unit || !slot || typeof VbFx === 'undefined') return;
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
  if (_battleFxStatesSuspended) return;
  const screen = document.getElementById('scr-battle');
  if (!screen || !screen.classList.contains('active')) { stopBattleLabFx(); return; }
  void 0;
  // 終戦後も、残っている状態の表示は消さない（2026-10-07 利用者指定）。戦闘画面を離れる・次の戦闘の頭で片付ける。
  VbFx.settings.layer = _battleFxLayer;
  // 2026-10-14 処理落ち対策：先に全部の位置・見た目を読み、その後でまとめて再生・停止する（読む→書く→読むの繰り返しでレイアウトを何度も計算させない）。
  const reads = [];
  _battleFxStates.forEach((entry,key) => {
    const r = battleFxRect(entry.unit,entry.side), visible = r && r.element && r.element.style.visibility!=='hidden' &&
      _battleFxCardShown(r.element) &&
      !entry.unit._deathFxReady && !entry.unit._deathFxStarted && !entry.unit._deathFxDone && !entry.unit._reviveHidden &&
      ((typeof presentShownHp==='function'?presentShownHp(entry.unit):entry.unit.hp)>0 ||
        (typeof presentKeepsOnBoard==='function'&&presentKeepsOnBoard(entry.unit)));
    reads.push({entry,key,r,visible});
  });
  reads.forEach(({entry,key,r,visible}) => {
    for (const state of ['shield','poison','weaken','guts','revive','stealth','guard']) {
      const name = `${state}-state`, old = entry.loops.get(name), value = visible ? Number(entry.values[state])||0 : 0;
      const target=value?_battleFxStateRect(name,r):r;
      // カードの要素が作り直されただけなら、止めずに付け替える（出し直すと明滅する）。
      if (old && value && old.element !== target.element && VbFx.retarget && VbFx.retarget({name,key,element:old.element},target)) old.element = target.element;
      if (old && (!value || old.element !== target.element)) { VbFx.stop({name,key,element:old.element}); entry.loops.delete(name); }
      const cur = entry.loops.get(name);
      if (value > 0 && target.element && (!cur || cur.element !== target.element || cur.value !== value)) {
        VbFx.play(name,{key,source:target,targets:[target],side:entry.side,value,dir:1,resolveElement:_battleFxResolveElement}).catch(err=>console.error('[battle state VFX]',err));
        entry.loops.set(name,{element:target.element,value});
      }
    }
    if ((!r || !r.element) && !entry.loops.size) _battleFxStates.delete(key);
  });
  if (_battleFxStates.size) _battleFxFrame = requestAnimationFrame(_battleFxFollowStates);
}
function stopBattleLabFx(options) {
  // keepStates：終戦で単発の演出だけ止め、状態のループ表示は残す。
  const keepStates = !!(options && options.keepStates);
  // 結果／次画面への暗転後は、同じ戦闘画面の再描画でループを作り直さない。
  if (options && options.suspendStates) _battleFxStatesSuspended = true;
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
