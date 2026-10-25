'use strict';

// 一覧の演出経路を、本体のコア→共通presenter→描画関数を実行して採取する。
// カード名から演出を推測しない。未成立の条件・未対応の受け口は不明として残す。
// 実行: node tools/vfx_preview/cards_scan.cjs [--check]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const { gameGeometry, webpInfo } = require('./cards_geometry.cjs');
const geometry = gameGeometry(root);
const { makeElement } = require('../balance_sim/stub');
const { RUNTIME_SCRIPTS } = require('../vfx_export');
const sheet = require('../balance_sim/sheet_data');
const scripts = ['assets.js', 'js/engine/constants.js', 'js/data/floors.js', 'js/data/events.js',
  'js/data/local_xlsx_data.js', 'js/data/loader.js', 'js/data/units.js', 'js/engine/state.js',
  'js/engine/pool.js', 'js/battle/core.js', 'js/battle/formation.js', 'js/online/protocol.js', 'js/battle/present.js',
  'js/battle/present_events.js', 'js/engine/battle.js','js/engine/battle_damage.js','js/engine/battle_panel_formation.js','js/engine/battle_intro.js', 'js/engine/battle_debug.js', 'js/engine/battle_events.js', 'js/engine/render.js','js/engine/render_death_effects.js','js/engine/render_card_display.js','js/engine/render_attack_motion.js','js/engine/render_tooltip_helpers.js', 'js/engine/blessing_flame.js', 'js/engine/map.js','js/engine/quest.js','js/engine/quest_event_flow.js', 'js/engine/run_levels.js',
  'js/engine/action_banner.js', 'js/engine/reward.js','js/engine/reward_offer_cards.js','js/engine/reward_board_editor.js', 'js/engine/reward_drag.js', 'js/engine/reward_debug.js', 'js/engine/reward_items.js',
  ...RUNTIME_SCRIPTS, 'js/engine/battle_fx.js'];
global.setTimeout = () => 0;
global.requestAnimationFrame = () => 0;
for (const rel of scripts) vm.runInThisContext(fs.readFileSync(path.join(root, rel), 'utf8'), { filename: rel });
// 2026-10-20：ATK0の逃走が効果の途中に割り込むようになった。requestAnimationFrame を発火させない採取では、
// 逃走演出（描画1コマ待ち）で止まるので即時に終える（逃走の経路は採取対象外）。
global.playFledVfx = async () => {};
// 同時に逃げる複数体の時間差（setTimeout）も、止めた時計では終わらない。採取では盤面から外すだけにする。
global.presentFledBatch = async (evs, api) => {
  const list = (Array.isArray(evs) ? evs : [evs]).filter(Boolean);
  if (!list.length || !api) return false;
  let any = false;
  list.forEach(ev => {
    if (typeof api.isDone === 'function' && api.isDone(ev)) return;
    const unit = api.findUnit(ev.side, ev.unitId);
    if (!unit) return;
    if (typeof api.markDone === 'function') api.markDone(ev);
    unit._fled = true; any = true;
    if (typeof api.removeFromBoard === 'function') api.removeFromBoard(unit, ev.side);
  });
  if (any && typeof api.compact === 'function') api.compact();
  return any;
};

const sources = { card: 'キャラ', enemy: 'エネミー', char: 'NPC', enchant: 'エンチャント',
  item: 'アイテム', ring: '指輪', mapPanelPower: 'マス', keyword: 'キーワード', specialFx: '共通演出' };
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
// LAB（cards_model.js signature）と同じ照合。強化効果／合体効果の両方の呼び名を受け、VFX/SE（コードへ移った）は使わない。
const signature = row => JSON.stringify([row['No.'], row['名前'], row['効果'] || '',
  row['キーワード'] || '', row['強化効果'] || row['合体効果'] || '', row['強化キーワード'] || row['合体キーワード'] || '', row['効果音'] || '']);
let current = null, callStack = [], currentEvent = null, imageRecords = [];
const rect = { left: 100, top: 100, right: 100 + geometry.cardWidth,
  bottom: 100 + geometry.cardHeight, width: geometry.cardWidth, height: geometry.cardHeight };
const slot = makeElement(); slot.cloneNode = () => { const e = makeElement(); e.cloneNode = slot.cloneNode; return e; }; slot.getBoundingClientRect = () => rect;
slot.isConnected = true;
const portrait = makeElement();
slot.querySelector = selector => selector === '.unit-portrait' ? portrait : slot;
global.document.getElementById = id => {
  if (!['f-ally', 'f-enemy'].includes(id)) return null;
  const field = makeElement();
  field.getBoundingClientRect = () => ({ left: rect.left - (geometry.fieldWidth - rect.width) / 2,
    top: rect.top, width: geometry.fieldWidth, height: geometry.fieldHeight, bottom: rect.top + geometry.fieldHeight });
  return field;
};
const shieldCss = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .match(/\.unit-shield-layer\{[^}]*background:url\("([^"]+)"\)/);
global.getCurrentUnitSlot = () => slot;
global._battleBackgroundFrameRect = () => ({ left: 0, top: 0, width: 3840, height: 2160 });
global._battleScreenRect = global._battleBackgroundFrameRect;
global.getComputedStyle = () => ({ getPropertyValue: () => '1', color: '#fff', opacity: '1', transform: 'none' });
global.document.createElement = tag => {
  const el = makeElement(tag);
  el.isConnected = true; el.complete = true; el.naturalWidth = 1024;
  el.animate = () => ({ finished: Promise.resolve(), cancel() {}, addEventListener() {} });
  Object.defineProperty(el, 'className', { set(value) {
    this._className = value;
    if (value === 'unit-shield-layer' && shieldCss) add('vfx', { path: shieldCss[1],
      fn: 'updateUnitShieldUi / .unit-shield-layer', ms: 0, loop: true, mode: 'state', scale: 1 / 4.6,
      trigger: currentEvent && currentEvent.type || '状態', generic: true,
      geometry: { widthRatio: 1 - geometry.artLeft * 2, heightRatio: geometry.artHeight,
        offsetX: 0, offsetY: geometry.artTop + geometry.artHeight / 2 - .5, anchor: 'source', fit: 'cover', blend: geometry.shieldBlend } });
  }, get() { return this._className || ''; }, configurable: true });
  if (tag === 'img' || tag === 'video') Object.defineProperty(el, 'src', {
    set(value) {
      this._src = value;
      if (current && /^assets\/vfx\//.test(value)) {
        const url = String(value).split('?')[0];
        const frame = callStack[callStack.length - 1] || {};
        const media = add('vfx', { path: url, fn: frame.name || 'render.js', ms: frame.ms || 800, fadeMs: frame.fadeMs || 0,
          scale: frame.scale || presentCharacterVfxScale((url.match(/([^/]+)\.webp$/) || [])[1]),
          trigger: currentEvent && (currentEvent.reason || currentEvent.type) || '共通',
          mode: frame.mode || 'hit' });
        imageRecords.push({ media, image: this, frame: { ...frame } });
      }
    }, get() { return this._src || ''; }, configurable: true,
  });
  return el;
};
global.playSfx = key => {
  if (current && Assets.sfx[key]) add('se', { path: Assets.sfx[key], fn: 'playSfx', key,
    trigger: currentEvent && (currentEvent.reason || currentEvent.type) || '共通' });
  return !!Assets.sfx[key];
};
// 共通presenterがLABへ渡した実際の再生を採取する。旧素材へのフォールバックだけを採らない。
// 選択・対象・尺は本体に任せ、Canvasと実時間だけをここで置き換える。
const realLab = playBattleLabFx;
global.playBattleLabFx = (code, source, targets, options) => {
  const spec = presentLabFx(code);
  if (spec) add('vfx', {path:`vfx:${code}:${spec[0]}`,definition:spec[0],sourceCode:code,
    fn:'playBattleLabFx',ms:options?.durationMs || VbFx.duration(spec[0],presentLabSpeed(code)),
    fadeMs:0,loop:false,scale:1,trigger:currentEvent?.reason || currentEvent?.type || '共通',mode:'hit',
    geometry:{widthRatio:1,heightRatio:1,offsetX:0,offsetY:0,anchor:['self','lost','howl'].includes(spec[2])?'source':'target',fit:'contain'}});
  return realLab(code,source,targets,options);
};
VbFx.play = (name, options = {}) => new Promise(resolve => queueMicrotask(() => {
  (options.targets || []).forEach((_,i) => options.onImpact?.(i));
  (options.cueTimesMs || []).forEach((_,i) => options.onCue?.(i));
  resolve({name,cancelled:false,assetErrors:[]});
}));
VbFx.stop = () => 1;
VbFx.stopAll = () => {};
global._battleFxTimer = fn => { queueMicrotask(fn);return 0; };
global.playFileSfx = file => ({ addEventListener(event, fn) {
  if (fs.existsSync(path.join(root, file))) add('se', { path: file, fn: 'playFileSfx', trigger: currentEvent?.type || '共通' });
  else if (event === 'error') queueMicrotask(fn);
} });
global.updateUnitDamageUi = global.refreshUnitPreviewUi = () => {};
const enterEvent = actionBannerEnterEvent;
global.actionBannerEnterEvent = function (ev, ...args) { currentEvent = ev; return enterEvent(ev, ...args); };
global.renderAll = () => {};
global.SaveRun = { recordDeath() {} };
global._waitForBattleMotionIdle = () => Promise.resolve();
global.renderHandEditor = global.renderRewCards = global._syncRewardProductionUi = () => {};
global.persistBoardCharacterStats = () => true; // 保存境界は採取対象にしない。
global._mapDelay = () => Promise.resolve();
global.renderControls = global.updateHUD = global.requestBattleCompact = () => {};
global.sleep = global._awaitFrame = () => Promise.resolve();
global.battlePresentationSetTimeout = fn => { queueMicrotask(fn); return 0; };
global.playAttackMotion = async (_a, _b, _enemy, onPause, opts) => {
  if (onPause) onPause();
  if (opts?.onContact) await opts.onContact();
};
// 補間とタイマーのみ置き換える。素材の選択は本体の描画関数で実行する。
global.playCurvedMissile = async opts => {
  if (current && opts.asset) add('vfx', { path: opts.asset, fn: 'playCurvedMissile', ms: opts.flightMs,
    scale: opts.scale, trigger: currentEvent && currentEvent.type, mode: 'projectile',
    geometry: { widthRatio: opts.sourceRect.width / rect.width * _definedVfxSize(opts.code || getVfxSourceCode(opts.asset), opts.scale),
      heightRatio: null, anchor: 'target', offsetX: 0,
      offsetY: typeof presentProjectileImpactOffsetY === 'function' && opts.code
        ? presentProjectileImpactOffsetY(opts.code) : Number(opts.impactOffsetY) || 0 } });
  if (opts.onHit) await opts.onHit();
};
// 画像のsrcだけでなく、共通レンダラーに渡された定義と入れ物も実行して採取する。
global._playDefinedVfx = (host, value, durationMs, options = {}) => {
  const name = getVfxDefinitionName(value);
  if (name) {
    const frame = callStack[callStack.length - 1] || {};
    const w = parseFloat(host.style.width) || rect.width, h = parseFloat(host.style.height) || rect.height;
    const left = parseFloat(host.style.left), top = parseFloat(host.style.top);
    add('vfx', { path: value, definition: name, sourceCode: getVfxSourceCode(value),
      fn: frame.name || '_playDefinedVfx', ms: frame.ms || durationMs, fadeMs: frame.fadeMs || 0,
      loop: !!options.repeat, scale: options.size || 1, trigger: currentEvent && (currentEvent.reason || currentEvent.type) || '共通',
      mode: frame.mode || 'hit', geometry: { widthRatio: w / rect.width * (options.size || 1),
        heightRatio: h / rect.height * (options.size || 1), offsetX: Number.isFinite(left) ? (left+w/2-rect.left-rect.width/2)/rect.width : 0,
        offsetY: Number.isFinite(top) ? (top+h/2-rect.top-rect.height/2)/rect.height : 0,
        anchor: frame.anchor || 'target', fit: 'contain', contact: frame.contact || undefined,
        rise: frame.name === 'playManaGainVfx' ? PRESENT_MANA_GAIN_VFX_RISE : undefined,
        spanWidthRatio: frame.contact === 'tri' ? PRESENT_CONTACT_TRI_WIDTH : undefined,
        drawOffsetX: frame.contact === 'tri' ? PRESENT_CONTACT_TRI_OFFSET_X : undefined } });
  }
  return { stop() {}, promise: Promise.resolve() };
};
const drawNames = ['playHitVfxAtRect', '_playCardEffectVfx', 'playEffectVfxOnUnit',
  'playKeywordEffectVfxSustained', 'playAttackContactVfx', 'playSpecialProductionVfx',
  'playSealReleaseVfx', 'playSummonAppearVfx', 'playReviveVfx', 'playCharacterSweepVfx',
  'playExpandingWaveVfx', 'playEffectFlash', 'playManaGainVfx', 'playUnitStealMotion', 'playFledVfx', 'playUnitDeathBurn', 'playCardBurnAway', 'playCardWaveAway', '_playMapBoardChangeVfx'];
for (const name of drawNames) {
  const original = global[name];
  if (typeof original !== 'function') continue;
  global[name] = function (...args) {
    const opts = args.findLast(x => x && typeof x === 'object' && !Array.isArray(x)) || {};
    const mode = name === 'playAttackContactVfx' ? 'contact' : name === 'playSpecialProductionVfx' ? 'special' : 'hit';
    if (['playCardBurnAway', 'playCardWaveAway'].includes(name)) add('vfx', { path: '', fn: name, ms: name === 'playCardWaveAway' ? DEATH_WAVE_MS : DEATH_BURN_MS, mode: 'death', generic: true, trigger: currentEvent?.type });
    if (name === 'playEffectFlash') add('vfx', { path: '', fn: name, ms: EFFECT_FLASH_STEP_MS,
      mode: 'flash', trigger: args[2], generic: true });
    const ms = name === 'playManaGainVfx' ? PRESENT_MANA_GAIN_VFX_FADE_IN_MS + PRESENT_MANA_GAIN_VFX_HOLD_MS + PRESENT_MANA_GAIN_VFX_FADE_OUT_MS
      : name === 'playReviveVfx' ? PRESENT_REVIVE_VFX_FADE_IN_MS + PRESENT_REVIVE_VFX_HOLD_MS + PRESENT_REVIVE_CARD_FADE_MS + PRESENT_REVIVE_VFX_FADE_OUT_MS
        : name === 'playCharacterSweepVfx' ? opts.sweepDuration || 700
          : name === 'playExpandingWaveVfx' ? PRESENT_EXPAND_VFX_FADE_MS + PRESENT_EXPAND_VFX_GROW_MS
            : name === '_playMapBoardChangeVfx' ? 1200
              : opts.hitDuration || opts.durationMs || opts.flightMs || opts.minDurationMs
                || (name === 'playSpecialProductionVfx' ? (opts.forwardMs ?? 200) + (opts.reverseMs ?? 200) : 800);
    const fadeMs = name === 'playHitVfxAtRect' ? opts.fadeDuration || 140
      : name === 'playEffectVfxOnUnit' ? opts.fadeDuration || 220 : 0;
    const owner = args.find(x => x && x.id === 'subject');
    const anchor = owner || ['playManaGainVfx', 'playReviveVfx'].includes(name)
      || currentEvent?.unitId === 'subject' && !['damage', 'attack_contact_vfx'].includes(currentEvent.type)
      ? 'source' : callStack[callStack.length - 1]?.anchor || 'target';
    const contact = name === 'playAttackContactVfx' ? opts.mode : callStack[callStack.length - 1]?.contact;
    callStack.push({ name, ms, fadeMs, scale: opts.vfxScale, mode, anchor, contact });
    try {
      const result = original(...args);
      if (result && typeof result.catch === 'function') result.catch(err => unknown('vfx', `${name}: ${err.message}`));
    } catch (err) { unknown('vfx', `${name}: ${err.message}`); }
    finally { callStack.pop(); }
    if (typeof opts.onFadeStart === 'function') opts.onFadeStart();
    if (name === 'playManaGainVfx' && typeof opts.onDone === 'function') queueMicrotask(opts.onDone);
    if (name === 'playEffectVfxOnUnit') return { stop: () => Promise.resolve() };
    if (name === 'playKeywordEffectVfxSustained') return true;
    return Promise.resolve();
  };
}
function add(kind, value) {
  if (!current) return;
  value.path = String(value.path || '').split('?')[0];
  const key = JSON.stringify([value.path, value.fn, value.ms, value.trigger]);
  const existing = current[kind].find(x => JSON.stringify([x.path, x.fn, x.ms, x.trigger]) === key);
  if (existing) return existing;
  current[kind].push(value); return value;
}
function collectImageGeometry() {
  for (const { media, image, frame } of imageRecords) {
    const host = image.parentNode;
    if (!host || !media) continue;
    const style = (el, key) => el.style[key]
      || (String(el.style.cssText || '').match(new RegExp('(?:^|;)\\s*' + key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + '\\s*:\\s*([^;]+)')) || [])[1] || '';
    const w = parseFloat(style(host, 'width')) || rect.width, h = parseFloat(style(host, 'height')) || rect.height;
    const explicitW = style(image, 'width'), explicitH = style(image, 'height');
    const scale = Number((style(image, 'transform').match(/scale\(([\d.]+)\)/) || [])[1]) || 1;
    const ratio = explicitW.endsWith('%') ? parseFloat(explicitW) / 100 : geometry.hitWidthRatio;
    media.geometry = { widthRatio: w / rect.width * ratio * scale,
      heightRatio: explicitH.endsWith('%') ? h / rect.height * parseFloat(explicitH) / 100 * scale : null,
      offsetX: ((parseFloat(style(host, 'left')) || rect.left) + w / 2 - rect.left - rect.width / 2) / rect.width,
      offsetY: ((parseFloat(style(host, 'top')) || rect.top) + h / 2 - rect.top - rect.height / 2) / rect.height,
      anchor: frame.anchor || 'target', fit: style(image, 'objectFit') || 'contain' };
    if (frame.name === 'playManaGainVfx') media.geometry.rise = PRESENT_MANA_GAIN_VFX_RISE;
    if (frame.contact) media.geometry.contact = frame.contact;
    if (frame.contact === 'tri') Object.assign(media.geometry, {
      spanWidthRatio: PRESENT_CONTACT_TRI_WIDTH, drawOffsetX: PRESENT_CONTACT_TRI_OFFSET_X });
  }
  imageRecords = [];
}
function unknown(kind, reason) {
  if (current && !current.unknown[kind].includes(reason)) current.unknown[kind].push(reason);
}
function definition(no, name, type) {
  const pool = type === 'item' ? ITEM_POOL : type === 'ring' ? RING_POOL
    : type === 'enemy' ? ENEMY_POOL : PANEL_POOL;
  return pool.find(c => String(c.no || c.artCode || '').toUpperCase() === no)
    || pool.find(c => c.name === name);
}
function fixture(def, type, merged) {
  const c = merged && def.mergedForm ? { ...def, ...def.mergedForm } : { ...def };
  let carrier = { ...c, id: 'subject', boardCards: [c] };
  if (type === 'enchant') {
    // 閾値番号・錬成フラグ等も、本体と同じ魔導板→編成変換に作らせる。
    // 接続できる向きへ素体を置く。データを読む処理や効果値は再実装しない。
    const direction = c.directions?.[0] || 'up';
    const slotIndex = { up: 2, right: 8, down: 12, left: 6 }[direction];
    const opposite = { up: 'down', right: 'left', down: 'up', left: 'right' }[direction];
    const boardCards = Array(MAIN_BOARD_SIZE).fill(null);
    boardCards[7] = { ...c, directions: c.directions?.length ? c.directions : [direction] };
    boardCards[slotIndex] = { name: 'LAB素体', category: 'キャラクター', color: '赤',
      power: 12, life: 100, desc: '', keywords: [], directions: [opposite] };
    const previousPowers = G.mapPanelPowers;
    try {
      G.mapPanelPowers = { [slotIndex]: 'summon' };
      carrier = buildBoardFormation({ boardCards }, { stageNumber: 2 }).entries[0]?.unit;
      if (!carrier) throw new Error('検査用エンチャントの編成を作れない: ' + c.no);
    } finally { G.mapPanelPowers = previousPowers; }
    carrier.id = 'subject';
  } else if (['card', 'char'].includes(type) && c.category === 'キャラクター') {
    carrier = _makePanelSummonUnit(_panelSummonSpec(c), []);
    carrier.id = 'subject'; carrier.boardCards = [c];
  }
  if (['ring', 'item', 'mapPanelPower'].includes(type)) Object.assign(carrier,
    { no: '', name: 'LAB素体', desc: '', keywords: [], boardCards: [] });
  Object.assign(carrier, { atk: 12, hp: 60, maxHp: 100, _stageNumber: 2 });
  if (type === 'keyword') {
    carrier.desc = ''; carrier.keywords = [c.name + (/X/.test(c.desc) ? '3' : '')];
  }
  if (type === 'mapPanelPower') carrier._mapPanelPower = MAP_PANEL_POWERS.find(p => p.name === c.name)?.id || '';
  const ally = (color, i) => ({ id: 'ally' + i, name: 'LAB味方' + i, color, atk: 4, hp: 70, maxHp: 100,
    keywords: [], desc: '', lane: i > 2 ? 'rear' : 'front', _summonedInBattle: true });
  const allies = ['赤', '青', '緑', '黄', '紫'].map(ally);
  if (type === 'enchant') Object.assign(allies[0], { boardCards: [c], _resonanceEffectNames: [c.name],
    effectData: { effectNames: [c.name], effectTexts: [c.desc] } });
  if (/負傷効果を発動/.test(c.desc || '')) Object.assign(allies[1], PANEL_POOL.find(p => p.no === 'C008'),
    { id: 'ally1', atk: 4, hp: 70, maxHp: 100 });
  const enemies = ['赤', '青', '緑'].map((color, i) => ({ id: 'foe' + i, name: 'LAB敵' + i,
    color, atk: 4, hp: 80, maxHp: 100, keywords: [], desc: '', shield: 0, lane: i === 2 ? 'rear' : 'front' }));
  return createBattleState({ sides: { p1: { units: [carrier, ...allies] }, p2: { units: enemies } },
    resources: { p1: { mana: 20, gold: 200 }, p2: { mana: 10, gold: 100 } }, blood: { p1: 20, p2: 20 },
    rings: { p1: type === 'ring' ? [c] : [], p2: [] }, items: { p1: type === 'item' ? [c] : [], p2: [] },
    summonDefs: [...PANEL_POOL, ...ENEMY_POOL], itemDefs: ITEM_POOL, stageNumber: 2 });
}
async function inspect(events, state) {
  G.allies = state.units.p1; G.enemies = state.units.p2;
  G._coreDrivenBattle = true; G._savedBattleReplaying = true;
  actionBannerClear(true);
  try { await _flushCorePveHitEvents(state, events, new Set([...state.units.p1, ...state.units.p2])); }
  catch (err) { unknown('vfx', '受け口: ' + err.message); unknown('se', '受け口: ' + err.message); }
  currentEvent = null;
}
async function probe(def, type, merged) {
  let triggerCalls = {
    opening: (s, u, rng, emit, hit) => coreApplyOpeningEffects(u, s, rng, emit, hit),
    attack: (s, u, rng, emit, hit) => { coreTriggerManaOnAttack(u, s, emit); coreApplyAttackEffects(u, s, rng, emit, hit); coreApplyAttackObservers(u, s, rng, emit, hit); },
    injury: (s, u, rng, emit, hit) => { coreTriggerManaOnInjury(u, s, emit); coreApplyInjuryEffects(u, 4, s, rng, emit, hit, s.units.p2[0]); },
    death: (s, u, rng, emit, hit) => { u.hp = 0; coreTriggerDeath(u, s, emit); coreApplyDeathEffects(u, s, rng, emit, hit); },
    passive: (s, _u, rng, emit, hit) => { const dead = s.units.p1[1]; dead.hp = 0; coreApplyDeathObservers(dead, s, rng, emit, hit); coreApplyShieldLostEffects(s.units.p1[0], s, rng, emit, hit); coreTriggerAtkGainEffects(s.units.p1[0], 1, s, rng, emit, hit); },
    ally_hit: (s, _u, rng, emit) => coreResolveHit(s, s.units.p2[0], s.units.p1[1], 4, false, rng, emit),
    ally_attack: (s, _u, rng, emit, hit) => coreApplyAttackObservers(s.units.p1[1], s, rng, emit, hit),
    enemy_death: (s, _u, rng, emit, hit) => { s.units.p2[0].hp = 0; coreApplyDeathObservers(s.units.p2[0], s, rng, emit, hit); },
    ally_summon: (s, u, _rng, emit) => coreSummonUnit(s, 'p1', { name: '青スケルトン', color: '青' }, emit, u.id),
    receive: (s, u, rng, emit) => coreResolveHit(s, s.units.p2[0], u, 120, false, rng, emit),
    release: (s, u, rng, emit, hit) => coreApplyReleaseEffects(u, [s.units.p1[1]], s, rng, emit, hit),
    battle_end: (s, _u, rng, emit) => coreTriggerBattleEnd(s, emit, rng),
    mana: (s, _u, rng, emit, hit) => coreApplyManaThresholdEffects(s, rng, emit, hit),
    revive: (s, u, _rng, emit) => { if (coreUnitHasKeyword(u, '復活')) { u.hp = 0; coreTryRevive(u, s, emit); } },
  };
  if (type === 'ring') {
    triggerCalls = {
      opening: (s, _u, rng, emit, hit) => coreApplyOpeningRings(s, rng, emit, hit),
      mana: (s, _u, rng, emit, hit) => coreApplyRingManaEffects(s, rng, emit, hit),
      injury: (s, u, rng, emit) => coreResolveHit(s, s.units.p2[0], u, 4, false, rng, emit),
      death: (s, u, _rng, emit) => { u.hp = 0; coreTryRevive(u, s, emit); },
    };
  } else if (type === 'item') {
    // 現在のUIから次戦闘へ渡す消耗品はこの2種。他は魔導板上で使用する。
    triggerCalls = ['silence_scroll', 'meteor_scroll'].includes(def.itemEffectKey)
      ? { opening: (s, _u, rng, emit, hit) => coreApplyOpeningItems(s, rng, emit, hit) } : {};
    current.notes = ['魔導板上の使用はreward_items.js。静寂／隕石だけが次の戦闘のitemsへ渡る。'];
  } else if (type === 'mapPanelPower') {
    triggerCalls = { opening: (s, _u, _rng, emit) => coreApplyMapPanelOpeningEffects(s, emit) };
    unknown('vfx', '開戦の登場・生命／永劫／複製の演出は魔導板からの編成入力と登場順に依存し、この最小盤面では未採取');
    unknown('se', '開戦登場音appearance.wavの発生回数は魔導板の編成入力に依存し、未採取');
  } else if (type === 'keyword') {
    triggerCalls = {
      contact: (s, _u, rng, emit) => runBattleCore(s, rng, { onEvent: emit, skipOpening: true, turnLimit: 2 }),
      hit: (s, u, rng, emit) => { u._coreAttackContact = true; coreResolveHit(s, u, s.units.p2[0], 12, false, rng, emit); },
      receive: (s, u, rng, emit) => coreResolveHit(s, s.units.p2[0], u, 120, false, rng, emit),
      poison: (_s, u, _rng, emit) => { if (def.name === '毒') { u.poison = 3; coreApplyPoisonBeforeTurn(u, emit); } },
      release: (_s, u, _rng, emit) => { if (def.name === '封印') emit({ type: 'seal_release', side: u.side, unitId: u.id }); },
    };
  } else {
    triggerCalls.contact = (s, u, rng, emit) => runBattleCore(s, rng, { onEvent: emit, skipOpening: true, turnLimit: 1 });
  }
  for (const [trigger, invoke] of Object.entries(triggerCalls)) {
    const state = fixture(def, type, merged), u = state.units.p1[0], rng = createSeededRng(53), events = [];
    // 結界を保持している時のCSS素材も、本体のUI更新関数を実行して採取する。
    if (['card', 'enemy', 'char', 'enchant', 'keyword'].includes(type)) updateUnitShieldUi(u, 'ally');
    u._sealed = false; u._currentAttackTarget = state.units.p2[0];
    if (trigger === 'attack') state.units.p2.forEach(v => { v.poison = 3; });
    const emit = e => events.push(e);
    const hit = (a, b, amount, counter, ss, st, opt) => coreResolveHit(state, a, b, amount, counter, rng, emit,
      { skipSourceEffects: !!ss, skipTough: !!st, ...(opt || {}) });
    try { invoke(state, u, rng, emit, hit); }
    catch (err) { unknown('vfx', `${trigger}: ${err.message}`); unknown('se', `${trigger}: ${err.message}`); continue; }
    // 素の味方・敵の通常攻撃は対象カードの演出へ混ぜない。
    const relevant = events.filter(e => !(trigger === 'ally_summon' && e.type === 'summon' && e.sourceId === 'subject')
      && !(trigger === 'ally_hit' && e.unitId !== 'subject' && e.sourceId !== 'subject')
      && !(type === 'ring' && e.type === 'damage' && e.sourceId === 'foe0')
      && !['battle_start', 'battle_end', 'turn_begin'].includes(e.type)
      && (trigger !== 'contact' && trigger !== 'battle'
        || e.sourceId === 'subject' || e.attackerId === 'subject'
        || e.unitId === 'subject' && !['damage', 'stat_change'].includes(e.type)
        || e.blockedBy === 'great_shield' && e.unitId === 'subject'
        || e.keywordEffect === '毒' && e.unitId === 'subject'
        || ['ring', 'item', 'mapPanelPower'].includes(type)
          && !['damage', 'attack', 'attack_contact_vfx', 'shield_lost'].includes(e.type)
        || ['ring', 'item'].includes(type) && e.type === 'damage' && e.damageKind !== 'combat'));
    current.events.push(...relevant.map(e => [trigger, e.type, e.reason || '', e.effectNo || '']));
    if (triggerCalls[trigger] && presentActionBannerEffectText(def, trigger)
      && !relevant.length && ['opening', 'attack', 'injury', 'death', 'release', 'battle_end', 'mana'].includes(trigger)) {
      unknown('vfx', `${trigger}: 本文の発動条件が検査盤面で成立せず、演出の有無を確定できない`);
      unknown('se', `${trigger}: 本文の発動条件が検査盤面で成立せず、再生音を確定できない`);
    }
    await inspect(relevant, state);
  }
}
async function main() {
  const originalLog = console.log, originalWarn = console.warn;
  console.log = console.warn = () => {};
  await loadGameData();
  console.log = originalLog; console.warn = originalWarn;
  _applyMapPanelPowerSheetRows();
  const records = {}, counts = {};
  for (const [key, label] of Object.entries(sources)) {
    const rows = sheet.sheetRows(key).filter(r => /^[A-Z]+\d{3}(?:_\d+)?$/.test(r['No.'] || ''));
    counts[label] = rows.length;
    for (const row of rows) {
      const no = row['No.'];
      imageRecords = [];
      current = { signature: signature(row), vfx: [], se: [], unknown: { vfx: [], se: [] }, events: [] };
      records[no] = current;
      if (process.env.VB_SCAN_TRACE) console.error('採取', key, no);
      let def = definition(no, row['名前'], key);
      if (key === 'keyword' || key === 'specialFx' || key === 'mapPanelPower') def = {
        no, name: row['名前'], desc: row['効果'] || '', keywords: [] };
      if (!def) {
        unknown('vfx', 'シートには存在するが、既存ローダーのゲーム用プールに定義がない（実装／出現設定を確認）');
        unknown('se', '既存ローダーに定義がなく、実際の再生経路を検査できない');
      } else if (key === 'specialFx') {
        const p = getEffectVfxPath(no), se = getEffectSfxKey(no);
        if (p) add('vfx', { path: p, fn: 'getEffectVfxPath', ms: PRESENT_CARD_EFFECT_VFX_MS,
          scale: presentCharacterVfxScale(no), mode: 'hit', trigger: '共通', generic: true });
        if (se) playSfx(se);
      } else await probe(def, key, false);
      if (def?.mergedForm) await probe(def, key, true);
      if (def && key === 'mapPanelPower') {
        currentEvent = { type: 'map_upgrade' };
        const power = MAP_PANEL_POWERS.find(p => p.name === def.name);
        if (power) await _playMapForgeSlotRoll([0], 0, power);
        currentEvent = null;
      }
      if (def && key === 'item') {
        const a = { ...PANEL_POOL.find(c => c.no === 'C033'), keywords: [], manaCost: 3, power: 2, life: 5 };
        const b = { ...a, keywords: ['封印5'] };
        G._cardLabBoard = [a, b]; G.spellSlots = [def, null, null, null];
        G.mapPanelPowers = { 0: 'summon', 1: 'summon' };
        const partyBoard = global._getPartyBoardUnit;
        global._getPartyBoardUnit = () => ({ boardCards: G._cardLabBoard });
        currentEvent = { type: 'item_use' };
        if (def.itemEffectKey === 'portal_scroll') {
          unknown('vfx', 'ポータルの使用はmain.jsから街へ画面遷移する。街・移動履歴を持たない検査盤面では未採取');
          unknown('se', 'ポータル使用後の街への画面遷移は未採取');
        } else {
          try {
            if (!_useImmediateItem(0, def)) throw new Error('使用条件が成立しない');
            if (G._pendingItemUse) {
              _handlePendingItemBoardTarget(0);
              if (G._pendingItemUse) _handlePendingItemBoardTarget(1);
            }
            await Promise.resolve(); await Promise.resolve();
          } catch (err) { unknown('vfx', '魔導板のアイテム使用: ' + err.message); unknown('se', '魔導板のアイテム使用: ' + err.message); }
        }
        global._getPartyBoardUnit = partyBoard;
        currentEvent = null; G._pendingItemUse = null;
      }
      if (key !== 'specialFx' && row['VFX/SE']) {
        const codes = _effectPresentationCodes({ fxCode: row['VFX/SE'] });
        const paths = codes.map(code => getEffectVfxPath(code)).filter(Boolean);
        if (paths.length && !current.vfx.some(x => paths.includes(x.path)))
          unknown('vfx', 'シートのVFX/SE指定に登録素材はあるが、検査盤面で実際の描画を確認できない');
        if (codes.some(code => getEffectSfxKey(code)) && !current.se.some(x => codes.includes(x.key)))
          unknown('se', 'シートのVFX/SE指定に登録音はあるが、検査盤面で実際の再生を確認できない');
      }
      collectImageGeometry();
      for (const vfx of current.vfx) if (vfx.path) {
        const name = getVfxDefinitionName(vfx.path);
        if (name) {
          vfx.definition = name; vfx.sourceCode = getVfxSourceCode(vfx.path);
          vfx.asset = { renderer: 'definition', durationMs: vfx.ms, frameCount: 0 };
          if (!vfx.geometry) vfx.geometry = { widthRatio: 1, heightRatio: 1, offsetX: 0, offsetY: 0, anchor: 'target' };
          continue;
        }
        vfx.asset = webpInfo(path.join(root, vfx.path));
        // 共通素材の直接参照は本体の幅・素材倍率から組み立てる。
        if (!vfx.geometry) vfx.geometry = { widthRatio: geometry.hitWidthRatio * (Number(vfx.scale) || 1),
          heightRatio: null, offsetX: 0, offsetY: 0, anchor: vfx.mode === 'state' ? 'source' : 'target' };
      }
      current = null;
    }
  }
  // 正式なLAB割当はADOPTED.mdを正とする。catalog.jsのsourceは試験用素体なので使わない。
  const adopted = {};
  const adoptedText = fs.readFileSync(path.join(__dirname, 'se/ADOPTED.md'), 'utf8');
  let provisional=false;
  for (const line of adoptedText.split('\n')) {
    if(line.startsWith('## 2026-10-12追加：仮'))provisional=true;
    const cells = line.split('|').map(x => x.trim());
    if (/^[A-Z]+\d{3}$/.test(cells[1] || '')) adopted[cells[1]] = { name: cells[2], path: `assets/sfx/${cells[1]}.wav`,
      source: cells[3], seconds: parseFloat(cells[4]), peak: Number(cells[5]),...(provisional?{provisional:true}:{}) };
  }
  const fingerprints = Object.fromEntries([...scripts, 'index.html', 'tools/vfx_preview/se/ADOPTED.md'].map(rel => [rel, hash(fs.readFileSync(path.join(root, rel)))]));
  const result = { sources, counts, records, adopted, fingerprints, geometry };
  const destination = path.join(__dirname, 'cards_routes.js');
  const output = '// 本体の経路をcards_scan.cjsで採取。変更時は同スクリプトで再生成する。\nvar VbFxCardRoutes = ' + JSON.stringify(result) + ';\n';
  if (process.argv.includes('--check')) {
    assert.equal(fs.readFileSync(destination, 'utf8'), output, 'カード演出台帳が古い。node tools/vfx_preview/cards_scan.cjs で更新');
  } else fs.writeFileSync(destination, output);
  console.log(`カード演出経路: ${Object.keys(records).length}件 / ${JSON.stringify(counts)}`);
}
const watchdog = require('node:timers').setTimeout(() => { console.error('カード採取が完了しない: 待機の置換を確認'); process.exit(1); }, 120000);
main().finally(() => require('node:timers').clearTimeout(watchdog)).catch(err => { console.error(err.stack || err); process.exitCode = 1; });
