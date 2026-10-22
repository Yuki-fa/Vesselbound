// 起動の使用済みはカード自身へ保存する。店の鍵は再入店でも変えない。
let _pendingCardActivation = null;
function cardActivationVisitKey() {
  if (G.phase !== 'reward') return '';
  if (G._isPeddler) return `peddler:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}`;
  if (G._isShop && !G._isItemShop) return `shop:${G._facilityCacheKey ?? G._wave}`;
  if (G._isForge || G._isItemShop || G._isLibrary || G._isTavern || G._isRingExchange || G._isVillageMenu || G._isWaveAltar || G._isFiveSaints) return '';
  return `formation:${Number(G.activationFormationSeq)||0}`;
}
function cardActivationCanUse(card) {
  const key = cardActivationVisitKey();
  return !!(key && coreUnitTriggerText(card, '起動') && !(card._activationUses && card._activationUses[key]));
}
function cancelCardActivation() {
  _pendingCardActivation = null;
  if (typeof renderHandEditor === 'function') renderHandEditor();
}
function wireCardActivation(element, card, index) {
  if (!coreUnitTriggerText(card, '起動') || !cardActivationVisitKey()) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'card-activation-button';
  button.textContent = typeof textMessage === 'function' ? textMessage('「使う」ボタン', '使う') : '使う';
  button.disabled = !cardActivationCanUse(card);
  button.title = coreUnitTriggerText(card, '起動');
  button.addEventListener('pointerdown', e => e.stopPropagation());
  button.addEventListener('dragstart', e => e.preventDefault());
  button.onclick = e => {
    e.stopPropagation();
    if (!cardActivationCanUse(card)) return;
    if (G._pendingItemUse && typeof _cancelPendingItemUse === 'function') _cancelPendingItemUse(true);
    // アイテムの中断は盤面を復元するので、復元後のカードを参照する。
    const current=_mainBoardCards()[index];
    if(!current||!cardActivationCanUse(current)) return;
    if (_pendingCardActivation && _pendingCardActivation.card === current) { cancelCardActivation(); return; }
    _pendingCardActivation = { card: current, index, key: cardActivationVisitKey() };
    renderHandEditor();
  };
  element.appendChild(button);
  if (_pendingCardActivation) element.classList.toggle('card-activation-source', _pendingCardActivation.card === card);
}
function handleCardActivationTarget(index) {
  const pending = _pendingCardActivation;
  if (!pending) return false;
  if (pending.key !== cardActivationVisitKey() || !cardActivationCanUse(pending.card)) { cancelCardActivation(); return true; }
  const cards = _mainBoardCards(), source = pending.card, target = cards[index];
  if (cards[pending.index] !== source) { cancelCardActivation(); return true; }
  if (!target) return true;
  const quest = typeof questRequiredEntryOnBoard === 'function' ? questRequiredEntryOnBoard() : null;
  const run = () => coreActivateBoardCard(source, target, PANEL_POOL, coreMathRng);
  const result = typeof runWithKeyedRandom === 'function' ? runWithKeyedRandom(`activation:${pending.key}:${pending.index}:${index}`, run) : run();
  if (!result) return true;
  source._activationUses = { ...(source._activationUses || {}), [pending.key]: true };
  if (result.kind === 'transform') {
    const make = () => makePanel(result.definition.id);
    const next = typeof runWithKeyedRandom === 'function' ? runWithKeyedRandom(`activation-card:${pending.key}:${pending.index}:${index}`, make) : make();
    // 対象の使用済みと進行上の印を変身後も保持する。
    if (target._activationUses) next._activationUses = { ...target._activationUses };
    if (target._battleEndCount) next._battleEndCount = target._battleEndCount;
    cards[index] = next;
  } else if (result.kind === 'buff_color') {
    target.power = (Number(target.power)||0) + result.atk; target.life = (Number(target.life)||0) + result.hp;
    target.color = result.color;
  } else if (result.kind === 'destroy') {
    cards[index] = null;
    source.power = (Number(source.power)||0) + result.atk; source.life = (Number(source.life)||0) + result.hp;
  }
  _pendingCardActivation = null;
  renderHandEditor(); renderRewCards(); updateHUD();
  if (quest && typeof questRequiredCardGone === 'function' && questRequiredCardGone(quest) && typeof questOnRequiredCardDestroyed === 'function') questOnRequiredCardDestroyed(quest);
  if (typeof _storeRewardStartSnapshot === 'function') _storeRewardStartSnapshot();
  // 回数と盤面を同じチェックポイントに確定し、再開による使い直しを防ぐ。
  if (typeof SaveRun !== 'undefined' && SaveRun.enabled()) SaveRun.checkpoint('reward');
  return true;
}
if (typeof document !== 'undefined') document.addEventListener('keydown', e => { if (e.key === 'Escape' && _pendingCardActivation) cancelCardActivation(); });
