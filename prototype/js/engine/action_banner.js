// action_banner.js — 戦闘中の行動表示のDOMと終了監視（PvE／オンライン／保存済み再生で共通）。
// コアのユニット・イベント・Gへ表示状態を載せない。戦闘の待機へPromiseも追加しない。
const ACTION_BANNER_CONFIG = {
  height: 150, width: 900, imageWidth: 445,
  // 2026-10-10 利用者指定：同じ側の帯は端から30px離す。消えた時に残りを動かさない。
  stackGap: 30, stackDirection: { p2: 1, p1: -1 },
  enemyY: 300, allyY: 1710, enemyImageY: 195, allyImageY: 1650,
  fadeInMs: 100, fadeOutMs: 400, noVfxHoldMs: 700,
  fontSize: 48, letterSpacing: '.16em', nameInset: 120,
  imageFadeStart: '55%', backgroundAlpha: .85, hideAtSpeed: 2,
  // 特殊マスの絵は外周に金の枠線がある。枠を帯の外へ出すため、画面端側へこの割合だけずらす。
  mapFrameCrop: .05,
};

let _actionBannerScope = null;
// 終戦から「進む」が出るまでは表示を消さない（2026-10-06 利用者指定）。
let _actionBannerHeld = false;
let _actionBannerObserver = null;
const _actionBannerSides = { p1: [], p2: [] };
let _actionBannerUnits = new Map();
let _actionBannerHints = new Map();
let _actionBannerMana = new Map();
let _actionBannerLoadouts = { rings: { p1: [], p2: [] }, items: { p1: [], p2: [] } };
let _actionBannerDamageGroups = new Map();
let _actionBannerEvents = null;
let _actionBannerEventIndex = -1;
let _actionBannerRingDamage = new Map();
let _actionBannerOpening = true;
let _actionBannerOpeningItemsShown = false;
let _actionBannerWaveScopes = null;
let _actionBannerImmediateHits = new Map();
let _actionBannerImmediateOrigins = new WeakMap();
let _actionBannerImmediateSummoners = new Map();
let _actionBannerSummonParents = new Map();
let _actionBannerPendingUnits = new Set();
let _actionBannerSummonBuffOwners = { p1: [], p2: [] };
let _actionBannerGroupSeen = new Set();

function _actionBannerSpeed() {
  return typeof getBattlePresentationSpeedScale === 'function' ? getBattlePresentationSpeedScale() : 1;
}
function _actionBannerTimer(fn, ms) {
  return setTimeout(fn, ms / _actionBannerSpeed());
}
function _actionBannerRoot() {
  const screen = document.getElementById('scr-battle');
  if (!screen) return null;
  let root = document.getElementById('battle-action-banners');
  if (root) return root;
  const c = ACTION_BANNER_CONFIG;
  if (!document.getElementById('battle-action-banner-style')) {
    const style = document.createElement('style');
    style.id = 'battle-action-banner-style';
    style.textContent = `
      #battle-action-banners{position:absolute;inset:0;pointer-events:none;z-index:10002}
      #battle-action-banners .action-banner{position:absolute;width:${c.width}px;height:${c.height}px;overflow:hidden;opacity:0;pointer-events:none}
      #battle-action-banners .action-banner[data-side="p2"]{left:0;top:${c.enemyY}px}
      #battle-action-banners .action-banner[data-side="p1"]{right:0;top:${c.allyY}px}
      #battle-action-banners .action-banner-base{position:absolute;inset:0}
      #battle-action-banners [data-side="p2"] .action-banner-base{background:linear-gradient(to right,rgba(0,0,0,${c.backgroundAlpha}),rgba(0,0,0,.65) 55%,transparent)}
      #battle-action-banners [data-side="p1"] .action-banner-base{background:linear-gradient(to left,rgba(0,0,0,${c.backgroundAlpha}),rgba(0,0,0,.65) 55%,transparent)}
      #battle-action-banners .action-banner-image{position:absolute;width:${c.imageWidth}px;height:auto;max-width:none;pointer-events:none}
      #battle-action-banners [data-side="p2"] .action-banner-image{left:0;top:${c.enemyImageY-c.enemyY}px;mask-image:linear-gradient(to right,#000 ${c.imageFadeStart},transparent);-webkit-mask-image:linear-gradient(to right,#000 ${c.imageFadeStart},transparent)}
      #battle-action-banners [data-side="p1"] .action-banner-image{right:0;top:${c.allyImageY-c.allyY}px;mask-image:linear-gradient(to left,#000 ${c.imageFadeStart},transparent);-webkit-mask-image:linear-gradient(to left,#000 ${c.imageFadeStart},transparent)}
      #battle-action-banners .action-banner-name{position:absolute;inset:0 ${c.nameInset}px;display:flex;align-items:center;margin:0;color:#fff;font-family:"Shippori Mincho",serif;font-size:${c.fontSize}px;font-weight:700;letter-spacing:${c.letterSpacing};white-space:nowrap;filter:drop-shadow(0 6px 7px rgba(15,5,0,.88));pointer-events:none}
      #battle-action-banners .action-banner:not([data-source-kind="character"]) .action-banner-image{top:50%;transform:translateY(-50%)}
      #battle-action-banners [data-side="p2"][data-source-kind="map"] .action-banner-image{left:${-c.imageWidth*c.mapFrameCrop}px;width:${c.imageWidth*(1+c.mapFrameCrop*2)}px}
      #battle-action-banners [data-side="p1"][data-source-kind="map"] .action-banner-image{right:${-c.imageWidth*c.mapFrameCrop}px;width:${c.imageWidth*(1+c.mapFrameCrop*2)}px}
      #battle-action-banners [data-side="p1"] .action-banner-name{justify-content:flex-end;text-align:right}
      #battle-action-banners [data-side="p2"] .action-banner-name{justify-content:flex-start;text-align:left}
    `;
    document.head.appendChild(style);
  }
  root = document.createElement('div');
  root.id = 'battle-action-banners';
  root.setAttribute('aria-hidden', 'true');
  ['p2', 'p1'].forEach(side => root.appendChild(_actionBannerElement(side)));
  // 先頭へ入れると既存の nth-of-type に当たるため、必ず画面の末尾へ追加する。
  screen.appendChild(root);
  return root;
}

function _actionBannerElement(side) {
  const banner = document.createElement('div');
  banner.className = 'action-banner';
  banner.dataset.side = side;
  const base = document.createElement('div');
  base.className = 'action-banner-base';
  const img = document.createElement('img');
  img.className = 'action-banner-image';
  img.alt = '';
  img.addEventListener('load', () => { img.style.visibility = 'visible'; });
  img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  const name = document.createElement('div');
  name.className = 'action-banner-name';
  banner.append(base, img, name);
  return banner;
}

function actionBannerImage(card, kind) {
  if (!card) return '';
  if (kind === 'map') return typeof Assets !== 'undefined' && Assets.mapBoard && Assets.mapBoard[card.id] || '';
  if (kind === 'ring' && typeof _rewardRingArtPath === 'function') return _rewardRingArtPath(card);
  return card.art || card.image || (typeof getPanelArtPath === 'function' ? getPanelArtPath(card) : '')
    || (typeof getPanelArtPath === 'function' ? getPanelArtPath(_actionBannerCard(card.name, kind)) : '')
    || (typeof _characterArtDef === 'function' && (_characterArtDef(card) || {}).path) || '';
}
function _actionBannerShow(token) {
  if (!token || token.cancelled || token.suppressed) return;
  // 2倍速以上では行動表示を出さない（2026-10-06 利用者指定）。
  // 見るのはオプションで選んだ倍速（長い戦闘の自動加速では消さない）。
  if (typeof optionBattleSpeedMultiplier === 'function' && optionBattleSpeedMultiplier() >= ACTION_BANNER_CONFIG.hideAtSpeed) return;
  const root = _actionBannerRoot();
  if (!root) return;
  let el = token.el;
  if (!el) {
    const c = ACTION_BANNER_CONFIG, side = token.source.side;
    const used = new Set(_actionBannerSides[side].filter(t => t !== token && t.el && !t.cancelled).map(t => t.stackIndex));
    let index = 0;
    while (used.has(index)) index++;
    const top = (side === 'p2' ? c.enemyY : c.allyY) + c.stackDirection[side] * index * (c.height + c.stackGap);
    // 2026-10-10：画面外へ出る新しい帯は省略する。既存の帯を動かしたり尺を短くしない。
    if (top < 0 || top + c.height > (root.clientHeight || 2160)) {
      token.suppressed = true;
      _actionBannerSides[side] = _actionBannerSides[side].filter(t => t !== token);
      return;
    }
    el = [...root.querySelectorAll(`[data-side="${side}"]`)].find(e => !e.dataset.occupied);
    if (!el) { el = _actionBannerElement(side); root.appendChild(el); }
    el.dataset.occupied = '1'; el.style.top = `${top}px`;
    token.stackIndex = index;
  }
  const name = el.querySelector('.action-banner-name');
  const img = el.querySelector('.action-banner-image');
  name.textContent = presentActionBannerName(token.source.card);
  const path = actionBannerImage(token.source.card, token.source.kind);
  if (img.getAttribute('src') !== path) {
    img.style.visibility = 'hidden';
    if (path) img.src = path;
    else img.removeAttribute('src');
  }
  if (img.complete && img.naturalWidth > 0 && path) img.style.visibility = 'visible';
  el.dataset.sourceName = token.source.card.name;
  el.dataset.sourceKind = token.source.kind;
  el.style.transition = `opacity ${ACTION_BANNER_CONFIG.fadeInMs / _actionBannerSpeed()}ms ease-out`;
  void el.offsetWidth;
  el.style.opacity = '1';
  token.started = true;
  token.pending = false;
  token.el = el;
}
function _actionBannerFade(token) {
  if (!token || token.cancelled || token.users || token.hosts.size || token.fading) return;
  if (_actionBannerHeld) return;
  if (!_actionBannerSides[token.source.side].includes(token)) return;
  token.fading = true;
  if (token.timer != null) clearTimeout(token.timer);
  const el = token.el;
  if (!el) return;
  el.style.transition = `opacity ${ACTION_BANNER_CONFIG.fadeOutMs / _actionBannerSpeed()}ms ease-out`;
  el.style.opacity = '0';
  token.timer = _actionBannerTimer(() => {
    _actionBannerSides[token.source.side] = _actionBannerSides[token.source.side].filter(t => t !== token);
    el.remove();
    token.cancelled = true;
    token.hosts.clear();
    if (!_actionBannerSides.p1.length && !_actionBannerSides.p2.length && _actionBannerObserver) {
      _actionBannerObserver.disconnect(); _actionBannerObserver = null;
    }
  }, ACTION_BANNER_CONFIG.fadeOutMs);
}
function _actionBannerCheckHosts() {
  Object.values(_actionBannerSides).flat().forEach(token => {
    if (!token || token.cancelled || token.suppressed) return;
    token.hosts.forEach(host => { if (!host.isConnected) token.hosts.delete(host); });
    if (token.hadVfx && !token.hosts.size) _actionBannerFade(token);
  });
}
// VFXの「呼び出し元へ返すPromise」は短いgateで終わることがある。
// 実際のVFXホストがDOMから消えた時点を監視するので、逆再生・ループ・着弾後の絵も含めて終端が揃う。
function actionBannerTrackVfxHost(host) {
  if (!host) return;
  const tokens = _actionBannerWaveScopes || [_actionBannerScope];
  tokens.forEach(token => {
    if (!token || token.cancelled || token.suppressed) return;
    if (!token.started || token.pending) _actionBannerShow(token);
    token.hadVfx = true;
    token.hosts.add(host);
  });
  if (!tokens.some(token => token && !token.cancelled && !token.suppressed)) return;
  if (!_actionBannerObserver && typeof MutationObserver === 'function') {
    _actionBannerObserver = new MutationObserver(_actionBannerCheckHosts);
    _actionBannerObserver.observe(document.body, { childList: true, subtree: true });
  }
}
function actionBannerStartScope() {
  (_actionBannerWaveScopes || [_actionBannerScope]).forEach(token => {
    if (token && (!token.started || token.pending)) _actionBannerShow(token);
  });
}
function _actionBannerToken(source, suppressRepeat) {
  if (!source || !['p1', 'p2'].includes(source.side)) return null;
  const key = `${source.kind}:${source.card.no || source.card.artCode || source.card.id || source.card.name}:${source.card.name}`;
  let token = _actionBannerSides[source.side].find(t => t.key === key && !t.cancelled);
  // 同じ発動の歌などが、別の付与や召喚を挟んで複数対象へ届いても、帯を再点灯しない。
  // 発動元の情報は検査・再生の対応付け用に返し、現在の左右表示には触れない。
  if (suppressRepeat && (!token || token.key !== key || token.cancelled))
    return { source, key, users: 0, suppressed: true };
  if (token && token.key === key && !token.cancelled) {
    if (token.timer != null) clearTimeout(token.timer);
    const wasFading = token.fading;
    token.fading = false;
    token.hadVfx = token.hosts.size > 0;
    // 同じ発動元の複数対象では、帯・画像・名前を描き直さず終了監視だけを延長する。
    token.pending = token.pending || !token.started || wasFading;
    return token;
  }
  token = { source, key, hosts: new Set(), users: 0, started: false, hadVfx: false, fading: false, cancelled: false, timer: null };
  _actionBannerSides[source.side].push(token);
  return token;
}
// 終戦：VFXが打ち切られても表示は残す（結果の暗転・カットインより上に出したまま）。
function actionBannerHold() { _actionBannerHeld = true; }
// 「進む」が出る（結果表示が待機に入る）時に、残っている表示をゆっくり消す。
function actionBannerReleaseHold() {
  if (!_actionBannerHeld) return;
  _actionBannerHeld = false;
  Object.values(_actionBannerSides).flat().forEach(token => {
    if (!token || token.cancelled) return;
    token.users = 0; token.hosts.clear();
    if (token.timer != null) { clearTimeout(token.timer); token.timer = null; }
    _actionBannerFade(token);
  });
}
function actionBannerClear(resetSession) {
  _actionBannerHeld = false;
  Object.values(_actionBannerSides).flat().forEach(token => {
    if (!token) return;
    token.cancelled = true;
    token.hosts.clear();
    if (token.timer != null) clearTimeout(token.timer);
    if (token.el) token.el.remove();
  });
  _actionBannerSides.p1 = []; _actionBannerSides.p2 = [];
  const root = document.getElementById('battle-action-banners');
  if (root) root.querySelectorAll('.action-banner').forEach(el => el.remove());
  _actionBannerScope = null;
  _actionBannerWaveScopes = null;
  if (_actionBannerObserver) { _actionBannerObserver.disconnect(); _actionBannerObserver = null; }
  if (resetSession) {
    _actionBannerUnits = new Map(); _actionBannerHints = new Map(); _actionBannerMana = new Map();
    _actionBannerDamageGroups = new Map();
    _actionBannerEvents = null; _actionBannerEventIndex = -1;
    _actionBannerRingDamage = new Map(); _actionBannerOpening = true;
    _actionBannerOpeningItemsShown = false;
    _actionBannerImmediateHits = new Map(); _actionBannerImmediateOrigins = new WeakMap();
    _actionBannerImmediateSummoners = new Map();
    _actionBannerSummonParents = new Map(); _actionBannerPendingUnits = new Set();
    _actionBannerSummonBuffOwners = { p1: [], p2: [] };
    _actionBannerGroupSeen = new Set();
    _actionBannerLoadouts = { rings: { p1: [], p2: [] }, items: { p1: [], p2: [] } };
  }
}
function actionBannerSetBattleData(data, beforeUnits) {
  const d = data || {};
  ['rings', 'items'].forEach(kind => {
    if (!d[kind]) return;
    ['p1', 'p2'].forEach(side => {
      if (Array.isArray(d[kind][side])) _actionBannerLoadouts[kind][side] = d[kind][side].filter(Boolean).slice();
    });
  });
  Array.from(beforeUnits || []).forEach(u => {
    if (u && !_actionBannerUnits.has(String(u.id))) _actionBannerUnits.set(String(u.id), { ...u });
  });
  ['p1', 'p2'].forEach(side => (d.units && d.units[side] || []).forEach(u => {
    if (u && !_actionBannerUnits.has(String(u.id))) _actionBannerUnits.set(String(u.id), { ...u, side });
    else if (u && !['p1', 'p2'].includes(_actionBannerUnits.get(String(u.id)).side)) _actionBannerUnits.get(String(u.id)).side = side;
  }));
}
function actionBannerSetFormations(formations, ownFormation) {
  const sides = { p1: ownFormation || formations && formations.p1 || {}, p2: formations && formations.p2 || {} };
  const data = { units: {}, rings: {}, items: {} };
  ['p1', 'p2'].forEach(side => {
    data.units[side] = sides[side].units || [];
    ['rings', 'items'].forEach(kind => {
      const list = sides[side][kind];
      data[kind][side] = Array.isArray(list) ? list : list && list[side] || [];
    });
  });
  actionBannerSetBattleData(data);
}
function _actionBannerCard(key, kind) {
  if (!key) return null;
  const pools = kind === 'ring' ? [typeof RING_POOL !== 'undefined' ? RING_POOL : []]
    : kind === 'item' ? [typeof ITEM_POOL !== 'undefined' ? ITEM_POOL : []]
      : [typeof PANEL_POOL !== 'undefined' ? PANEL_POOL : [], typeof ENEMY_POOL !== 'undefined' ? ENEMY_POOL : [],
        typeof UNIT_POOL !== 'undefined' ? UNIT_POOL : []];
  return pools.flat().find(c => c && (c.name === key || c.id === key
    || String(c.no || c.artCode || '').toUpperCase() === String(key).toUpperCase())) || null;
}
function _actionBannerEnchants(unit) {
  const names = [...(unit._resonanceEffectNames || []), ...(unit._adjacentPanelAbilities || []),
    ...(unit.effectData && unit.effectData.effectNames || []), ...(unit.keywords || [])];
  const cards = (unit.boardCards || []).filter(c => c && (c.category === 'エンチャント' || /^E\d/.test(String(c.no || c.artCode || ''))));
  names.forEach(name => {
    const c = _actionBannerCard(name, 'enchant');
    if (!c || !(c.category === 'エンチャント' || /^E\d/.test(String(c.no || c.artCode || ''))) || cards.some(x => x.name === c.name)) return;
    // オンラインのboardCards省略経路でも、シートの合体本文と実際の接続本文を突き合わせる。
    const texts = [...(unit._adjacentPanelEffectTexts || []), ...(unit.effectData && unit.effectData.effectTexts || [])];
    const desc = texts.find(t => t === c.desc || t === (c.mergedForm && c.mergedForm.desc)) || c.desc;
    cards.push({ ...c, desc });
  });
  // boardCardsを持つPvEと、名前・本文で届くオンラインで候補の順を揃える。
  return cards.sort((a, b) => String(a.no || a.artCode || a.name).localeCompare(String(b.no || b.artCode || b.name)));
}
function _actionBannerItem(key, side) {
  if (!key) return null;
  const sides = side ? [side] : ['p1', 'p2'];
  for (const owner of sides) {
    const raw = _actionBannerLoadouts.items[owner].find(c => c.id === key || c.itemEffectKey === key || c.key === key);
    if (!raw) continue;
    const def = _actionBannerCard(raw.id, 'item') || _actionBannerCard(raw.no || raw.artCode || raw.name, 'item')
      || (typeof ITEM_POOL !== 'undefined' ? ITEM_POOL : [])
      .find(c => c.itemEffectKey === raw.itemEffectKey) || raw;
    const card = { ...def, ...raw };
    return side ? card : { card, side: owner };
  }
  return null;
}
function _actionBannerMapCard(id) {
  return typeof MAP_PANEL_POWERS !== 'undefined' ? MAP_PANEL_POWERS.find(c => c.id === id) : null;
}
function _actionBannerChooseEnchant(candidates, ev, unit, trigger) {
  if (candidates.length < 2) return candidates[0] || null;
  // 番号のない旧ダメージでは、本文の固定量が表示量と一致する候補を優先する。
  // 数値はシート本文から読むだけで、軽減・倍率の戦闘計算をここへ複製しない。
  const matching = ev.type === 'damage' ? candidates.filter(c => {
    const text = presentActionBannerEffectText(c, trigger);
    const m = text.match(/(?:に|は)(\d+)ダメージ/);
    const hits = ev.batch ? (_actionBannerEvents || []).filter(e => e.type === 'damage' && e.batch === ev.batch) : [ev];
    return m && hits.some(e => Number(m[1]) === Number(e.amount));
  }) : [];
  const pool = matching.length ? matching : candidates;
  const group = ev.batch ? `${unit.id}:${ev.damageKind}:${ev.batch}` : '';
  if (group && _actionBannerDamageGroups.has(group)) return _actionBannerDamageGroups.get(group);
  const card = pool[0];
  if (group) _actionBannerDamageGroups.set(group, card);
  return card;
}
function _actionBannerEffectOwner(side, trigger, pattern) {
  const api = actionBannerPresentationApi();
  return [..._actionBannerUnits.values()].find(u => u.side === side
    && !_actionBannerPendingUnits.has(String(u.id))
    && presentActionBannerUnitEffectSource(u, api, pattern, trigger));
}
function _actionBannerSummonScalingOwner(ev, isNaga) {
  const api = actionBannerPresentationApi();
  const naga = _actionBannerCard('C072');
  const pattern = /味方の眷属(?:は|が召喚された時、その眷属は)\+\d+\/\+\d+を得る/;
  const holders = [..._actionBannerUnits.values()].filter(u => u.side === ev.side
    && !_actionBannerPendingUnits.has(String(u.id))
    && presentActionBannerUnitEffectSource(u, api, pattern));
  const isNagaHolder = u => naga && (u.name === naga.name
    || (u._resonanceEffectNames || []).includes(naga.name)
    || (u.effectData && u.effectData.effectNames || []).includes(naga.name));
  if (isNaga) return holders.find(isNagaHolder) || null;
  const others = holders.filter(u => !isNagaHolder(u));
  // コアは持ち主ごとに1件を出すが sourceId は召喚元。対象IDごとの記録順で持ち主を選ぶ。
  const at = (_actionBannerEvents || []).slice(0, _actionBannerEventIndex)
    .filter(e => e.reason === ev.reason && e.unitId === ev.unitId).length;
  return others[at % others.length] || null;
}
function _actionBannerSummonBuffSource(ev) {
  const records = _actionBannerSummonBuffOwners[ev.side] || [];
  const record = records.find(r => String(r.unitId) === String(ev.sourceId)) || records[records.length - 1];
  if (record) return record.source;
  const pattern = /この戦闘中、味方の眷属は/;
  return presentActionBannerUnitEffectSource(_actionBannerEffectOwner(ev.side, '', pattern), actionBannerPresentationApi(), pattern);
}
function _actionBannerAttackDamageSource(ev) {
  if (ev.sourceId != null) return _actionBannerUnits.get(String(ev.sourceId));
  const list = _actionBannerEvents || [];
  for (let i = _actionBannerEventIndex + 1; i < list.length; i++) {
    const e = list[i];
    if (['attack', 'turn_begin', 'battle_end', 'effect_flash'].includes(e.type)) break;
    if (e.type === 'damage' && e.damageTo === 'atk' && e.unitId === ev.unitId)
      return _actionBannerUnits.get(String(e.sourceId));
  }
  return null;
}
function actionBannerPresentationApi() {
  return {
    unit: id => id != null ? _actionBannerUnits.get(String(id)) || null : null,
    hint: id => _actionBannerHints.get(String(id)), mana: id => _actionBannerMana.get(String(id)),
    card: _actionBannerCard, enchants: _actionBannerEnchants, item: _actionBannerItem,
    mapCard: _actionBannerMapCard, chooseEnchant: _actionBannerChooseEnchant,
    ownCard: u => {
      const actual = (u.boardCards || []).find(c => c && c.category !== 'エンチャント' && c.name === u.name);
      const def = actual || _actionBannerCard(u.no || u.name);
      return def ? { ...def, ...u, keywords: def.keywords || [] } : u;
    },
    effectOwner: _actionBannerEffectOwner,
    summonScalingOwner: _actionBannerSummonScalingOwner, summonBuffSource: _actionBannerSummonBuffSource,
    attackDamageSource: _actionBannerAttackDamageSource,
    summoner: ev => _actionBannerUnits.get(String(_actionBannerSummonParents.get(String(ev.unitId)) || ev.sourceId)) || null,
    opening: () => _actionBannerOpening,
    ringDamage: ev => _actionBannerRingDamage.get(ev),
    poisonActivationSource: () => presentActionBannerPoisonActivationSource(
      _actionBannerEvents, _actionBannerEventIndex, actionBannerPresentationApi()),
    immediateDamageSource: ev => _actionBannerImmediateOrigins.get(_actionBannerImmediateHits.get(ev)),
    immediateSummonOrigin: id => _actionBannerImmediateSummoners.get(String(id)),
    triggerUnit: (side, trigger) => {
      const flashes = [..._actionBannerHints.values()].reverse();
      const flash = flashes.find(e => e.side === side && e.trigger === trigger);
      return flash && _actionBannerUnits.get(String(flash.unitId));
    },
    immediateAttackSource: ev => {
      const flashes = [..._actionBannerHints.values()].reverse();
      const flash = flashes.find(e => /直ちに攻撃/.test(
        presentActionBannerEffectText(_actionBannerUnits.get(String(e.unitId)), e.trigger)));
      return flash && _actionBannerUnits.get(String(flash.unitId));
    },
    hasTriggeredFollowup: ev => {
      const list = _actionBannerEvents || [];
      for (let i = _actionBannerEventIndex + 1; i < list.length; i++) {
        const e = list[i];
        if (['attack', 'turn_begin', 'battle_end'].includes(e.type)) return false;
        if (e.type === 'effect_flash' && e.trigger !== ev.trigger) return true;
        if (e.type === 'effect_flash' && e.unitId !== ev.unitId) return false;
      }
      return false;
    },
    mapCopy: (ev, unit) => {
      const list = _actionBannerEvents || [];
      for (let i = _actionBannerEventIndex + 1; i < list.length; i++) {
        const e = list[i];
        if (['attack', 'turn_begin', 'battle_end'].includes(e.type)
          || e.type === 'effect_flash' && e.unitId === unit.id && e.trigger === 'opening') break;
        if (e.type === 'summon' && e.sourceId === unit.id && e.unit && e.unit.name === unit.name && e.unit._openingDuplicate) return false;
      }
      return true;
    },
    ring: (key, side) => {
      const def = _actionBannerCard(key, 'ring');
      return def && _actionBannerLoadouts.rings[side].some(r => (typeof r === 'string' ? r : r.name) === def.name) ? def : null;
    },
  };
}

function actionBannerEnterEvent(ev, events, index) {
  const previous = _actionBannerScope;
  _actionBannerScope = null;
  if (events && _actionBannerEvents !== events) {
    _actionBannerGroupSeen.clear();
    _actionBannerEvents = events;
    _actionBannerRingDamage = presentActionBannerRingDamageSources(events);
    _actionBannerImmediateHits = presentActionBannerImmediateHits(events);
    // 召喚前に出る付与イベントも、発動元の絵を参照できるよう写しだけを持つ。
    _actionBannerPendingUnits = new Set();
    events.filter(e => e && e.type === 'summon' && e.unit).forEach(e => {
      _actionBannerSummonParents.set(String(e.unit.id), e.sourceId);
      _actionBannerPendingUnits.add(String(e.unit.id));
      if (!_actionBannerUnits.has(String(e.unit.id))) _actionBannerUnits.set(String(e.unit.id), { ...e.unit, side: e.side });
    });
  }
  _actionBannerEventIndex = index;
  // 効果の発動合図／手番／攻撃をまたいだものは別の発動。イベントの順序や待機は変えない。
  if (['battle_start', 'turn_begin', 'effect_flash', 'mana_threshold', 'attack'].includes(ev.type))
    _actionBannerGroupSeen.clear();
  if (ev.type === 'battle_start') {
    _actionBannerOpening = true;
    _actionBannerHints.clear(); _actionBannerMana.clear(); _actionBannerDamageGroups.clear();
    _actionBannerImmediateSummoners.clear();
    ['p1', 'p2'].forEach(side => (ev.sides && ev.sides[side] || []).forEach(u => {
      _actionBannerUnits.set(String(u.id), { ...u, side });
    }));
  }
  if (ev.type === 'turn_begin') {
    _actionBannerOpening = false;
    _actionBannerHints.clear(); _actionBannerMana.clear(); _actionBannerDamageGroups.clear();
  }
  if (ev.type === 'effect_flash') {
    _actionBannerHints.delete(String(ev.unitId));
    _actionBannerHints.set(String(ev.unitId), ev);
    const unit = _actionBannerUnits.get(String(ev.unitId));
    if (unit && ['p1', 'p2'].includes(ev.side)) unit.side = ev.side;
  }
  if (ev.type === 'mana_threshold') _actionBannerMana.set(String(ev.unitId), ev);
  const source = presentActionBannerSource(ev, actionBannerPresentationApi());
  if (ev.type === 'summon_buff' && source) {
    const records = _actionBannerSummonBuffOwners[ev.side] || [];
    _actionBannerSummonBuffOwners[ev.side] = records.filter(r => String(r.unitId) !== String(ev.sourceId));
    _actionBannerSummonBuffOwners[ev.side].push({ unitId: ev.sourceId, source });
  }
  // 召喚されたキャラがそのまま攻撃する時（スケルトンキング・鬼神の指輪など）は、召喚した側の行動として表示を続ける。
  if (ev.type === 'summon' && ev.unit && source)
    _actionBannerImmediateSummoners.set(String(ev.unit.id), source);
  if (ev.type === 'attack' && ev.immediate && source) _actionBannerImmediateOrigins.set(ev, source);
  if (ev.type === 'attack') _actionBannerImmediateSummoners.delete(String(ev.attackerId));
  let suppressRepeat = false;
  if (source && PRESENT_ACTION_BANNER_GROUP_REASONS.has(String(ev.reason || ''))) {
    const groupKey = `${source.side}:${source.kind}:${source.card.no || source.card.artCode || source.card.name}:${source.card.name}:${ev.reason}`;
    suppressRepeat = _actionBannerGroupSeen.has(groupKey);
    _actionBannerGroupSeen.add(groupKey);
  }
  const token = _actionBannerToken(source, suppressRepeat);
  if (token) {
    if (token.groupHold) { token.users--; token.groupHold = false; }
    token.users++;
  }
  _actionBannerScope = token;
  return { previous, token, ev, index };
}
function _actionBannerRelease(token, noVfxHoldMs) {
  if (!token || token.cancelled || token.suppressed) return;
  token.users = Math.max(0, token.users - 1);
  if (!token.started || token.pending) _actionBannerShow(token);
  _actionBannerCheckHosts();
  if (!token.hadVfx) {
    if (token.timer != null) clearTimeout(token.timer);
    token.timer = _actionBannerTimer(() => _actionBannerFade(token), noVfxHoldMs == null ? ACTION_BANNER_CONFIG.noVfxHoldMs : noVfxHoldMs);
  }
}
// 同じマナ効果の同時発動は、片側の最初のイベントで両側のVFXをまとめて出す。
// 両側に表示を用意してから既存のplayCueを呼び、待機の尺は変えない。
function actionBannerBeginManaWave(events) {
  const previous = _actionBannerWaveScopes;
  const tokens = new Set();
  (events || []).forEach(ev => {
    const source = presentActionBannerSource(ev, actionBannerPresentationApi());
    const token = _actionBannerToken(source);
    if (token) tokens.add(token);
  });
  tokens.forEach(token => token.users++);
  _actionBannerWaveScopes = [...tokens];
  return { previous, tokens };
}
function actionBannerEndManaWave(wave) {
  if (!wave) return;
  _actionBannerWaveScopes = wave.previous;
  wave.tokens.forEach(token => _actionBannerRelease(token));
}
function actionBannerLeaveEvent(scope) {
  if (!scope) return;
  const { token, ev } = scope;
  if (ev.type === 'summon' && ev.unit) {
    _actionBannerUnits.set(String(ev.unit.id), { ...ev.unit, side: ev.side });
    _actionBannerPendingUnits.delete(String(ev.unit.id));
  }
  if (ev.type === 'transform' && ev.unit) _actionBannerUnits.set(String(ev.unitId), { ...ev.unit, side: ev.side });
  if (ev.type === 'unit_stolen' && ev.unit) _actionBannerUnits.set(String(ev.unit.id), { ...ev.unit, side: ev.toSide });
  _actionBannerScope = scope.previous && !scope.previous.cancelled ? scope.previous : null;
  if (token && !token.cancelled && !token.suppressed
    && presentActionBannerContinuesGroup(ev, (_actionBannerEvents || [])[scope.index + 1])) {
    token.groupHold = true;
    token.users++;
  }
  _actionBannerRelease(token, ev.type === 'attack' ? 0 : undefined);
  if (ev.type === 'battle_start') actionBannerOpeningItems();
}
function actionBannerOpeningItems() {
  if (_actionBannerOpeningItemsShown) return;
  _actionBannerOpeningItemsShown = true;
  // 静寂は状態の取り外しだけでコアのイベントがない。開幕の登場を終えた境界で表示する。
  ['p1', 'p2'].forEach(side => {
    const card = _actionBannerItem('silence_scroll', side);
    if (!card) return;
    const silent = _actionBannerToken({ card, side, kind: 'item' });
    _actionBannerShow(silent);
    silent.timer = _actionBannerTimer(() => _actionBannerFade(silent), ACTION_BANNER_CONFIG.noVfxHoldMs);
  });
}
function actionBannerOpeningUnit(unit, side, host, holdMs) {
  // 召喚の力／永劫の力には発動イベントがないため、共通の登場VFXへ接続する。
  // 通常の召喚マスは表示しない（2026-10-06 利用者指定）。永劫の力だけ表示する。
  if (!unit || unit._mapPanelPower !== 'eternal') return;
  const card = _actionBannerMapCard(unit._mapPanelPower);
  if (!card) return;
  const previous = _actionBannerScope;
  const token = _actionBannerToken({ card, side, kind: 'map' });
  _actionBannerScope = token;
  if (host) actionBannerTrackVfxHost(host);
  else {
    _actionBannerShow(token);
    token.timer = _actionBannerTimer(() => _actionBannerFade(token), holdMs == null ? ACTION_BANNER_CONFIG.noVfxHoldMs : holdMs);
  }
  _actionBannerScope = previous;
}

if (typeof window !== 'undefined') window.ACTION_BANNER_CONFIG = ACTION_BANNER_CONFIG;
