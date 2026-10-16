// 塔の試験施設。調整値・仮文言はこの表だけを編集する（後でシートへ移す）。
const TOWER_BOON_CONFIG = {
  key: 'towerBoon', name: '祝福の座（仮）', description: 'ゴールドを捧げ、これから出会うカードに祝福を授ける。',
  choiceCount: 3, firstPrices: [200, 500, 1000], priceStep: 1000,
  multiplier: 3, modifierStep: 1, manaStep: 1, rerollsPerStack: 1, bossSlotChance: 0.15,
  position: { x: 650, y: 1402 },
  text: {
    leave: '塔に戻る', price: '{price}G', reroll: '再抽選（残{count}）',
    familiar: '（祝福：召喚する眷属のATKとHPは{mul}倍）',
    zeroModifier: '（X=0→0）',
    dynamicModifier: '（祝福：増加量+{delta}、0は変更なし）',
  },
  blessings: [
    { id: 'stats', field: 'statMul', label: '今後のキャラクターカードのATKとHPが{multiplier}倍' },
    { id: 'modifiers', field: 'modDelta', label: '今後のカードの戦闘修正を正の値は+{modifierStep}、負の値は-{modifierStep}' },
    { id: 'damage', field: 'dmgMul', label: '今後のカードの効果ダメージが{multiplier}倍' },
    { id: 'mana', field: 'manaDelta', label: '今後のカードから得られるマナが+{manaStep}' },
    { id: 'familiars', field: 'famMul', label: '今後のカードが出す眷属のATKとHPが{multiplier}倍' },
    { id: 'bosses', label: 'このランで倒したボスが報酬とショップに出現する' },
    { id: 'rerolls', label: '報酬ごとに再抽選権を{rerollsPerStack}回得る' },
  ],
};
function towerBoonInitialState() {
  return { counts: {}, purchases: 0, rerolls: 0, rerollSeq: 0, visits: 0, defeatedBosses: [] };
}
function towerBoonState() {
  return G.towerBoons || (G.towerBoons = towerBoonInitialState());
}
function towerBoonPrice(purchases) {
  const n = Math.max(0, Math.floor(Number(purchases) || 0));
  const cfg = TOWER_BOON_CONFIG;
  return n < cfg.firstPrices.length ? cfg.firstPrices[n]
    : cfg.firstPrices[cfg.firstPrices.length - 1] + cfg.priceStep * (n - cfg.firstPrices.length + 1);
}
function towerBoonCurrentCardBonus() {
  const counts = towerBoonState().counts;
  const cfg = TOWER_BOON_CONFIG;
  return coreNormalizeBoon({
    statMul: cfg.multiplier ** (counts.stats || 0), modDelta: cfg.modifierStep * (counts.modifiers || 0),
    dmgMul: cfg.multiplier ** (counts.damage || 0), manaDelta: cfg.manaStep * (counts.mana || 0),
    famMul: cfg.multiplier ** (counts.familiars || 0),
  });
}
function towerBoonBlessGeneratedCard(card) {
  if (!card || card.boon || !['キャラクター', '強化', 'エンチャント'].includes(String(card.category || ''))) return card;
  return coreApplyCardBoon(card, towerBoonCurrentCardBonus());
}
// 報酬・店の既存抽選の最後にだけ呼ぶ。未選択時には乱数を1回も増やさない。
function towerBoonGeneratedOffers(cards) {
  const state = towerBoonState(), cfg = TOWER_BOON_CONFIG;
  let replaced=false;
  const result=(cards || []).map(card => {
    if (!card) return card;
    if (state.counts.bosses && state.defeatedBosses.length && rand() < cfg.bossSlotChance) {
      if(!card._towerBoonBoss) returnPanelToSalePool(card);
      replaced=true;
      return towerBoonMakeBossCard(randFrom(state.defeatedBosses));
    }
    return towerBoonBlessGeneratedCard(card);
  });
  return replaced?_dedupePanelDirections(result):result;
}
function towerBoonMakeBossCard(def) {
  const card = clone(def);
  card.type = 'panel'; card.kind = 'panel'; card.panelScope = 'unit'; card.category = 'キャラクター';
  card.id = 'tower_boon_boss_' + String(def.no || def.id || def.name);
  card.power = Number(def.power ?? def.atk) || 0;
  card.life = Math.max(1, Number(def.life ?? def.hp) || 1);
  delete card.atk; delete card.hp; delete card.maxHp;
  card._permBasePower = card.power; card._permBaseLife = card.life;
  card.directions = _rollPanelDirections(2, { avoidOpposite: true });
  card.boss = true; card._towerBoonBoss = true; card._useEnemyVisualFrame = true; card.noRewardUse = true;
  delete card._sheetEnemy;
  _normalizePanelRewardCost(card);
  card._buyPrice = calcBuyPrice(card);
  towerBoonBlessGeneratedCard(card);
  // ボス由来でもプレイヤーの個体として扱う。敵専用の召喚倍率へ戻さない。
  if(!card.boon) card.boon={...CORE_BOON_FIELDS};
  return card;
}
function towerBoonRecordBattleDeaths(events, enemies) {
  // 撃破した「定義」を控える。敵の階層倍率や戦闘中の一時補正をカードへ持ち込まない。
  const defs = typeof ENEMY_POOL !== 'undefined' ? ENEMY_POOL : [];
  const state = towerBoonState();
  for (const ev of events || []) {
    if (ev.type !== 'death' || ev.side !== 'p2') continue;
    const unit = (enemies || []).find(u => u && u.id === ev.unitId) || ev.unit;
    if (!unit || !unit.boss) continue;
    const def = defs.find(d => String(d.no || d.artCode || '') === String(unit.no || unit.artCode || '') && (d.no || d.artCode))
      || defs.find(d => d.name === unit.name);
    if (!def || state.defeatedBosses.some(d => d.id === def.id && d.name === def.name)) continue;
    state.defeatedBosses.push(clone(def));
  }
}
function towerBoonChoose(id) {
  if (!TOWER_BOON_CONFIG.blessings.some(b => b.id === id)) return false;
  const state = towerBoonState(), price = towerBoonPrice(state.purchases);
  if (Number(G.gold) < price) return false;
  if (spendEventGold(price) !== price) return false;
  state.counts[id] = (state.counts[id] || 0) + 1;
  state.purchases++;
  return true;
}
function towerBoonRollChoices() {
  const state = towerBoonState();
  const key = `tower-boon:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount) || 0}:${state.visits++}`;
  return runWithKeyedRandom(key, () => {
    const pool = TOWER_BOON_CONFIG.blessings.slice(), result = [];
    while (pool.length && result.length < TOWER_BOON_CONFIG.choiceCount) result.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id);
    return result;
  });
}
let _towerBoonChoices = [];
function openTowerBoonSeat() {
  _towerBoonChoices = towerBoonRollChoices();
  G._isTowerBoon = true;
  document.body.classList.remove('world-map-active', 'reward-screen-active');
  document.body.classList.add('tower-boon-active');
  _setOverrideBackground(null);
  showScreen('village');
  renderVillageScreen();
  const screen = document.getElementById('scr-village');
  const host = document.createElement('div'); host.id = 'tower-boon-choices'; screen.appendChild(host);
  renderTowerBoonChoices();
  const depart = document.getElementById('village-depart-btn');
  depart.querySelector('.rew-btn-label').textContent = TOWER_BOON_CONFIG.text.leave;
  depart.onclick = () => {
    if (_screenSwitchFading) return;
    if (typeof playSfx === 'function') playSfx('uiConfirm', { group: 'ui' });
    void fadeScreenSwitch(() => {
      host.remove(); G._isTowerBoon = false;
      document.body.classList.remove('tower-boon-active');
      openMapVillage({ tower: true });
    });
  };
}
function renderTowerBoonChoices() {
  const host = document.getElementById('tower-boon-choices');
  if (!host) return;
  host.replaceChildren();
  for (const id of _towerBoonChoices) {
    const blessing = TOWER_BOON_CONFIG.blessings.find(b => b.id === id);
    const price = towerBoonPrice(towerBoonState().purchases);
    const button = document.createElement('button'); button.className = 'tower-boon-choice'; button.type = 'button';
    const label = document.createElement('span');
    label.textContent=blessing.label.replace(/\{(\w+)\}/g,(_,key)=>TOWER_BOON_CONFIG[key]);
    const cost = document.createElement('span'); cost.className = 'tower-boon-price';
    cost.textContent = TOWER_BOON_CONFIG.text.price.replace('{price}', price);
    button.append(label, cost); button.disabled = Number(G.gold) < price;
    button.onclick = () => {
      if (!G._isTowerBoon || !towerBoonChoose(id)) return;
      renderTowerBoonChoices();
      // 塔での確定操作として保存。会話や専用UIは保存せず、再開は塔へ戻す。
      if (typeof SaveRun !== 'undefined') SaveRun.checkpoint('tower');
    };
    host.appendChild(button);
  }
}
function towerBoonGrantRewardRerolls() {
  const state = towerBoonState();
  state.rerolls += (state.counts.rerolls || 0) * TOWER_BOON_CONFIG.rerollsPerStack;
}
function towerBoonRerollVisible() {
  return G.phase === 'reward' && !!towerBoonState().counts.rerolls && !G._isShop && !G._isForge
    && !G._isVillageMenu && !G._isTavern && !G._isFiveSaints && !G._isLibrary && !G._isRingExchange;
}
function towerBoonCanReroll() { return towerBoonRerollVisible()&&!G._pendingPanelPlacement; }
function towerBoonRerollRewards() {
  const state = towerBoonState();
  if (!towerBoonCanReroll() || state.rerolls <= 0 || !_rewCards.some(c => c && c._isOriginalReward)) return false;
  const old = _rewCards.slice();
  state.rerolls--; state.rerollSeq++;
  old.filter(c => c && c._isOriginalReward&&!c._towerBoonBoss).forEach(returnPanelToSalePool);
  const fresh = runWithKeyedRandom(`reward-reroll:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount) || 0}:${state.rerollSeq}`,
    () => _arrangeRewardRarity(drawRewards().filter(Boolean).slice(0, old.filter(c => c && c._isOriginalReward).length)));
  fresh.forEach(c => { c._isOriginalReward = true; });
  _rewCards = old.map(c => c && c._isOriginalReward ? (fresh.shift() || null) : c);
  renderRewCards();
  _storeRewardStartSnapshot();
  if (typeof SaveRun !== 'undefined') SaveRun.checkpoint('reward');
  return true;
}
function towerBoonSyncRerollButton() {
  let button = document.getElementById('tower-boon-reroll-btn');
  const show = towerBoonRerollVisible();
  if (!show) { if (button) button.style.display = 'none'; return; }
  if (!button) {
    const screen=document.getElementById('scr-battle');
    if(!screen) return;
    button = document.createElement('button'); button.id = 'tower-boon-reroll-btn'; button.type = 'button';
    const label = document.createElement('span'); label.className = 'bcv-label'; button.appendChild(label);
    button.onclick = towerBoonRerollRewards;
    screen.appendChild(button);
  }
  button.style.display = 'inline-flex';
  button.querySelector('.bcv-label').textContent = TOWER_BOON_CONFIG.text.reroll.replace('{count}', towerBoonState().rerolls);
  button.disabled = !towerBoonCanReroll() || towerBoonState().rerolls <= 0 || !_rewCards.some(c => c && c._isOriginalReward);
  // X は「カード非表示」と同じ。Y は「報酬カード」の見出し（#reward-offer-section::before）の中心へ揃える
  // （「カード非表示」が「魔導板」の見出しの横にあるのと同じ形。カード列の中央だと5枚目と重なる）。
  const anchor = document.getElementById('board-card-visibility-btn'), section = document.getElementById('reward-offer-section');
  const parent = button.offsetParent;
  if (!anchor || !section || !parent || !section.offsetWidth) return;
  const a = anchor.getBoundingClientRect(), r = section.getBoundingClientRect(), p = parent.getBoundingClientRect();
  const scale = p.width / parent.offsetWidth, sectionScale = r.width / section.offsetWidth;
  if (!(scale > 0) || !(sectionScale > 0)) return;
  const title = getComputedStyle(section, '::before');
  const titleCenter = r.top + ((parseFloat(title.top) || 0) + (parseFloat(title.height) || 0) / 2) * sectionScale;
  button.style.left = `${(a.left - p.left) / scale}px`;
  button.style.right = 'auto';
  button.style.top = `${(titleCenter - p.top) / scale - button.offsetHeight / 2}px`;
}
