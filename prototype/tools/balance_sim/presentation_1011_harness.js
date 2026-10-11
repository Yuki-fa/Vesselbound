'use strict';
// 2026-10-11: 実際のコア・PvE/オンライン受け口を使い、描画境界と時計だけを記録する。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
global.requestAnimationFrame = () => 0;
global.setInterval = () => 0;
global.setTimeout = (fn, ms = 0, ...args) => { queueMicrotask(() => fn(...args)); return 0; };
global.MutationObserver = function () { this.observe = this.disconnect = () => {}; };
console.table = () => {};
for (const m of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!m[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), { filename: m[1] });
}
const calls = [], trace = [], slots = new Map();
let now = 0;
global.performance = { now: () => now += 1000 };
const advance = ms => { now += ms; };
const screen = makeElement();
screen.classList.contains = c => c === 'active';
document.getElementById = id => id === 'scr-battle' || id === 'battle-field' ? screen : null;
global.innerWidth = 1280; global.innerHeight = 800;
getComputedStyle = () => ({ display: 'block', visibility: 'visible', opacity: '1', getPropertyValue: () => '1' });
getCurrentUnitSlot = (_side, u) => slots.get(String(u.id)) || null;
renderAll = renderField = renderControls = updateHUD = showScreen = refreshUnitPreviewUi = () => {};
requestBattleCompact = () => {};
updateUnitDamageUi = () => {};
global.sleep = async ms => advance(ms);
_awaitFrame = _waitForBattleMotionIdle = _waitForPendingVfx = async () => {};
playBattleOpeningSequence = _playBattleStartIntro = async () => {};
playAttackMotion = async (a, _b, _enemy, pause, opt) => {
  if (pause) await pause();
  advance(300 / optionBattleSpeedMultiplier());
  trace.push({ type: 'contact', time: now, id: a.id });
  opt?.onHit?.(); await opt?.onContact?.();
  advance((opt?.returnDuration || 480) / optionBattleSpeedMultiplier());
  trace.push({ type: 'return', time: now, id: a.id });
};
_warmBattleHitSfx = playSfx = playFileSfx = playEffectFlash = _syncEffectFlashWithVfx = () => {};
_actionBannerShow = actionBannerTrackVfxHost = () => {};
playUnitDeathBurn = () => true;
playAttackDamageSfx = _playCardEffectSfx = () => {};
_playCardEffectVfx = async () => {};
playEffectVfxOnUnit = () => null;
playHitVfxAtRect = async (_rect, amount, opt) => {
  if(amount>0)trace.push({type:'hit',time:now,amount,opt});
  opt?.onFadeStart?.();
};
playHitVfx = (side, u, amount, opt) => { trace.push({ type: 'hit', time: now, side, id: u.id, amount, opt }); return Promise.resolve(); };
triggerBattleScreenShake = opt => {
  if (_battleScreenShakeTier(opt.damage)) trace.push({ type: 'shake', time: now, amount: opt.damage });
  return Promise.resolve();
};
playBattleLabFx = (code, owner, targets, opt = {}) => {
  calls.push({ code, owner: owner?.id, targets: targets.map(u => u.id) });
  targets.forEach((_u, i) => opt.onImpact?.(i));
  return Promise.resolve(true);
};
battlePresentationSetTimeout = fn => { queueMicrotask(fn); return 0; };
SaveRun.recordDeath = () => {};
persistBoardCharacterStats = persistBoardEffectDamage = () => true;
const copy = v => structuredClone(v);
function setup(state, speed = 1) {
  // 2026-10-11: PvEの通常攻撃はコア駆動中に再生する。実際の戦闘と同じ設定でモーションを検査する。
  initState(); G._debugMode = true; G.phase = 'battle'; G._coreDrivenBattle = true; G._savedBattleReplaying = true;
  G.allies = state.units.p1; G.enemies = state.units.p2;
  window.VB_OPTION_SPEED = speed === 1 ? 'normal' : speed === 2 ? 'x2' : 'x3';
  initializeBattlePresentationState();
  calls.length = trace.length = 0; slots.clear(); now = 0;
  for (const side of ['p1', 'p2']) state.units[side].filter(Boolean).forEach((u, i) => {
    const e = makeElement(); e.dataset.unitId = String(u.id); e.isConnected = true;
    e.getBoundingClientRect = () => ({ left: 100 + i * 110, top: side === 'p1' ? 550 : 100, width: 95, height: 140 });
    slots.set(String(u.id), e);
  });
  actionBannerSetBattleData({ units: state.units, rings: state.rings, items: state.items });
}
async function replay(state, events, online = false) {
  if (!online) return _flushCorePveHitEvents(state, events, new Set([...state.units.p1, ...state.units.p2].filter(Boolean)));
  const start = { type: 'battle_start', sides: copy(state.units) };
  const result = { events: [start, ...copy(events)], formations: Object.fromEntries(['p1', 'p2'].map(side =>
    [side, { units: copy(state.units[side]), rings: state.rings[side], items: state.items[side] }])) };
  beginOnlineVersusField(result);
  await playOnlineBattleEvents(result, { onEvent: (ev, ctx) => renderOnlineVersusBoard(ev, ctx) });
  hideOnlineVersusBoard();
}
module.exports = { ready: loadGameData(), ROOT, copy, makeElement, calls, trace, setup, replay, advance };
