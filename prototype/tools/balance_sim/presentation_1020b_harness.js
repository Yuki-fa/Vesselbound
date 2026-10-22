'use strict';
// 1020bの回帰用。コア・PvE・オンラインの実装を読み、描画境界と時計だけを置き換える。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeElement } = require('./stub');
const { sheetRows } = require('./sheet_data');
const root = path.resolve(__dirname, '../..');
console.table = () => {};
global.document.head = makeElement('head');
global.MutationObserver = function () { this.observe = () => {}; this.disconnect = () => {}; };
global.setTimeout = (fn, _ms, ...args) => { queueMicrotask(() => fn(...args)); return 0; };
global.setInterval = global.requestAnimationFrame = () => 0;
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (match[1].startsWith('http')) continue;
  const source = process.env.VB_SOURCE_REF && /^(?:js\/battle\/|js\/engine\/|js\/online\/)/.test(match[1])
    ? require('node:child_process').execFileSync('git', ['show', `${process.env.VB_SOURCE_REF}:prototype/${match[1]}`], { cwd: root, encoding: 'utf8', maxBuffer: 4e6 })
    : fs.readFileSync(path.join(root, match[1]), 'utf8');
  vm.runInThisContext(source, { filename: match[1] });
}
const clone = value => JSON.parse(JSON.stringify(value));
const calls = [], sounds = [], waits = [], cues = [], slots = new Map();
const rect = { left: 100, top: 200, right: 195, bottom: 340, width: 95, height: 140 };
const screen = makeElement();
screen.isConnected = true;
screen.getBoundingClientRect = () => rect;
global.document.getElementById = id => ['scr-battle', 'battle-field'].includes(id) ? screen : null;
global.document.querySelector = () => screen;
global.getComputedStyle = () => ({ visibility: 'visible', display: 'block', opacity: '1', getPropertyValue: () => '1' });
global.getCurrentUnitSlot = (_side, unit) => slots.get(String(unit.id)) || null;
global._gameScale = () => 1;
global._battleVfxClipRect = global._battleBackgroundFrameRect = global._battleScreenRect = () => rect;
global.playSfx = (code, options) => { sounds.push({ code, options }); return true; };
VbFx.play = (name, options) => {
  calls.push({ name, options });
  return new Promise(resolve => queueMicrotask(() => {
    (options.targets || []).forEach((_, index) => options.onImpact?.(index));
    (options.cueTimesMs || []).forEach((_, index) => options.onCue?.(index));
    resolve(true);
  }));
};
VbFx.stop = VbFx.stopAll = () => {};
global._syncEffectFlashWithVfx = global.actionBannerTrackVfxHost = global._actionBannerShow = () => {};
function render() {
  for (const u of [...G.allies || [], ...G.enemies || []].filter(Boolean)) {
    if (slots.has(String(u.id))) continue;
    const el = makeElement();
    Object.assign(el, { isConnected: true, offsetWidth: 95, offsetHeight: 140 });
    el.dataset.unitId = String(u.id);
    el.getBoundingClientRect = () => ({ ...rect, element: el });
    slots.set(String(u.id), el);
  }
}
global.renderAll = global.renderField = global.requestBattleCompact = render;
global.renderControls = global.updateHUD = global.showScreen = global.updateUnitDamageUi = global.refreshUnitPreviewUi = () => {};
global._warmBattleHitSfx = () => {};
global._playBattleStartIntro = global.playBattleOpeningSequence = global._waitForBattleMotionIdle = global._awaitFrame = async () => {};
global.sleep = async ms => { waits.push(ms); };
global.battlePresentationSetTimeout = (fn, ms) => { waits.push(ms); queueMicrotask(fn); return 0; };
global.playAttackMotion = async (_a, _b, _enemy, pause, options) => { pause?.(); await options?.onContact?.(); };
global.playAttackDamageSfx = () => true;
global.playHitVfx = async (_side, u, amount, options) => { calls.push({ name: 'hit', unit: u?.id, amount, options }); };
global.playHitVfxAtRect = async (_rect, _amount, options) => { options?.onFadeStart?.(); };
global.playProjectileEffectVfx = async (_source, _side, _target, _targetSide, code, options) => {
  calls.push({name:'projectile:'+code,options}); await options?.onImpact?.(); options?.onDamageShown?.();
};
global.playEffectFlash = () => {};
global.playUnitDeathBurn = () => true;
global.playFledVfx = async () => {};
global.playReviveVfx = async (u) => { calls.push({name:'revive',unit:u.id}); };
global.playEffectVfxOnUnit = () => ({ stop: async () => {} });
global._playCardEffectVfx = async (code, targets, options) => { calls.push({ name: code, targets: targets.map(u => u.id), options }); };
global._playCardEffectSfxAtCue = (code, ms) => sounds.push({ code, ms });
global._rollEnemyGold = () => 0;
SaveRun.recordDeath = () => {};
global.persistBoardCharacterStats = global.persistBoardEffectDamage = () => true;
const playCue = global._playManaEffectCue;
global._playManaEffectCue = async (units, options) => { cues.push(options); return playCue(units, options); };
function unit(id, no, overrides = {}) {
  const row = no && sheetRows('card').find(r => r['No.'] === no);
  const def = no && PANEL_POOL.find(c => c.no === no);
  const derived = Object.fromEntries(['manaCost','manaRepeat','manaOnAttack','manaOnInjury','manaOnDeath','goldOnDeath','goldOnBattleEnd']
    .filter(key => def && def[key] != null).map(key => [key, def[key]]));
  return { id, name: row?.['名前'] || id, no: no || '', artCode: no || '', color: row?.['カラー'] || '赤',
    atk: Number(row?.['パワー']) || 4, hp: 100, maxHp: 100,
    keywords: String(row?.['キーワード'] || '').split(/\s+/).filter(Boolean), desc: row?.['効果'] || '',
    fxCode: row?.['VFX/SE'] || '', ...derived, ...overrides };
}
function card(no, kind = 'enchant') {
  const row = sheetRows(kind).find(r => r['No.'] === no);
  if (!row) throw new Error('シートにないカード: ' + no);
  return { no, name: row['名前'], desc: row['効果'], category: kind === 'enchant' ? 'エンチャント' : kind === 'ring' ? '指輪' : 'アイテム' };
}
function setup(options) {
  _forceStopAllVfx(); presentResetPlayback(); initState(); initializeBattlePresentationState();
  G.phase = 'player'; G._coreDrivenBattle = true; G._savedBattleReplaying = true; G._battleRunId = 1;
  G._battleCoreEvents = []; G._battleCounters = { damage: 0, deaths: 0 };
  const state = createBattleState(options);
  G.allies = state.units.p1; G.enemies = state.units.p2;
  const before = clone(state.units), original = new Set([...G.allies, ...G.enemies].filter(Boolean));
  const rng = createSeededRng(1020), events = [], emit = ev => events.push(ev);
  const hit = (a, b, n, counter, ss, st, extra) => coreResolveHit(state, a, b, n, counter, rng, emit,
    { skipSourceEffects: !!ss, skipTough: !!st, ...extra });
  state._coreFirstSide = 'p1';
  actionBannerSetBattleData({ units: state.units, rings: state.rings, items: state.items });
  slots.clear(); render();
  calls.length = sounds.length = waits.length = cues.length = 0;
  return { state, before, rng, events, emit, hit, original,
    find: id => [...state.units.p1, ...state.units.p2].find(u => u?.id === id),
    async pve() {
      before.p1.concat(before.p2).filter(Boolean).forEach(u => {
        const live = this.find(u.id); if (live) presentHoldShown(live, u.atk, u.hp, u.maxHp, u.shield || 0, u.weaken || 0);
      });
      await _flushCorePveHitEvents(state, events, original);
    },
    async online() {
      const result = { events: [{ type: 'battle_start', sides: before }, ...clone(events)],
        formations: { p1: { units: before.p1, rings: state.rings.p1, items: state.items.p1 }, p2: { units: before.p2, rings: state.rings.p2, items: state.items.p2 } } };
      beginOnlineVersusField(result); render(); calls.length = sounds.length = waits.length = cues.length = 0;
      await playOnlineBattleEvents(result, { onEvent: renderOnlineVersusBoard });
      hideOnlineVersusBoard();
    } };
}
function enchantUnit(id,no,extra={}){
  const e=card(no);
  return unit(id,null,{boardCards:[e],_adjacentPanelEffectTexts:[e.desc],_adjacentPanelAbilities:[e.name],
    effectData:{effectNames:[e.name],effectTexts:[e.desc]},...extra});
}
module.exports = { enchantUnit, setup, unit, card, calls, sounds, waits, cues, clone, sheetRows, ready: loadGameData() };
