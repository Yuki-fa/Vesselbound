// 起動：戦闘ごとの使用印はカード自身へ保存し、画面・選択状態は保存しない。
let _pendingCardActivation = null;
const ACTIVATION_COLOR_FADE_MS = 400;
const HELLKNIGHT_SLICE_MS = 260;
const HELLKNIGHT_SLICE_FADE_MS = 500;
const HELLKNIGHT_SLICE_SHIFT_PX = 40;
const HELLKNIGHT_GAIN_MS = 900;
const _activationStatHolds = new WeakMap();
function cardActivationShownStats(card, stats) { return _activationStatHolds.get(card)?.stats || stats; }
function cardActivationVisitKey() {
  if (G.phase !== 'reward') return '';
  if (G._isPeddler) return `peddler:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}`;
  if (G._isForge) return `forge:${G._facilityCacheKey ?? G._wave}`;
  if (G._isItemShop) return `items:${G._facilityCacheKey ?? G._wave}`;
  if (G._isShop) return `shop:${G._facilityCacheKey ?? G._wave}`;
  if (G._isLibrary || G._isTavern || G._isRingExchange || G._isVillageMenu || G._isWaveAltar || G._isFiveSaints) return '';
  return `formation:${Number(G.activationFormationSeq)||0}`;
}
function cardActivationCanUse(card) {
  return !!(card && card._activationReady && cardActivationVisitKey() && coreUnitTriggerText(card, '起動'));
}
function chargeBoardCardActivations() {
  (typeof _mainBoardCards === 'function' ? _mainBoardCards() : (G.mainBoard || [])).forEach(card => {
    if (card && coreUnitTriggerText(card, '起動')) card._activationReady = true;
  });
}
function cancelCardActivation() {
  _pendingCardActivation = null;
  _refreshTargetPicking();
}
function _cardActivationTargetsItem() {
  return !!_pendingCardActivation && /対象のアイテム/.test(coreUnitTriggerText(_pendingCardActivation.card, '起動'));
}
function _activationLocation(zone, index) {
  return _pickingLocation(zone, index);
}
function _activationLocationCurrent(at) {
  return _pickingLocationCurrent(at);
}
function _activationRewardCardAllowed(card) {
  return _pickingOfferCardAllowed(card);
}
// 入れ替え後の配置も通常のドラッグと同じ規則で検証する。対象の順番では制限を変えない。
function _activationSwapAllowed(first, second) {
  if (!first || !second || first.card === second.card) return false;
  const board = _getPartyBoardUnit(), next = _mainBoardCards().slice();
  for (const [to, from] of [[first, second], [second, first]]) {
    if (to.zone === 'board') {
      if (typeof _canCardUseBoardSlot === 'function' && !_canCardUseBoardSlot(from.card, to.index, board)) return false;
      next[to.index] = from.card;
    }
    if (to.zone === 'reward' && from.zone === 'board') {
      if (typeof questRewardSlotAcceptsCard === 'function' && !questRewardSlotAcceptsCard(from.card)) return false;
      if (typeof questShopExchangeState === 'function' && (questShopExchangeState(from.card) === 'blocked'
        || questShopExchangeState(to.card) !== 'allow')) return false;
    }
  }
  return typeof _canApplyBoardChange !== 'function' || _canApplyBoardChange(board, next);
}
function _cardActivationTargetable(at) {
  const pending = _pendingCardActivation, card = at && at.card;
  if (!pending || !card || _cardActivationTargetsItem()) return false;
  if (card === pending.card) return false; // 発生元の再クリックは取り消し。
  if (at.zone === 'reward' && !_activationRewardCardAllowed(card)) return false;
  const pair = coreActivationPairSpec(pending.card);
  if (pair) {
    if (pair.characterOnly ? card.category !== 'キャラクター' : !/^(?:キャラクター|エンチャント|強化)$/.test(card.category || '')) return false;
    const first = pair.self ? { zone:'board', index:pending.index, card:pending.card } : pending.firstTarget;
    if (first && !_activationLocationCurrent(first)) return false;
    if (first && first.card === card) return !pair.self; // 1枚目の再クリックを許す。
    if (pair.kind === 'swap_cards') {
      if (typeof _cardIsEngraved === 'function' && _cardIsEngraved(card)) return false;
      if (typeof questCardRemovalLocked === 'function' && questCardRemovalLocked(card)) return false;
      if (first && !_activationSwapAllowed(first, at)) return false;
    }
    return true;
  }
  const text = coreUnitTriggerText(pending.card, '起動');
  if (at.zone === 'reward' && !/対象の/.test(text)) return false;
  const probe = { pick:list=>list[0], int:lo=>lo, next:()=>0 };
  return !!coreActivateBoardCard(pending.card, card, PANEL_POOL, probe, { targetZone:at.zone });
}
function cardActivationBoardTargetable(card, index) {
  return _cardActivationTargetable({ zone:'board', index, card });
}
function cardActivationRewardTargetable(card) {
  return _cardActivationTargetable({ zone:'reward', index:Array.isArray(_rewCards)?_rewCards.indexOf(card):-1, card });
}
function cardActivationBoardDimmed(card, index) {
  if (!_pendingCardActivation || !card || card === _pendingCardActivation.card && index === _pendingCardActivation.index) return false;
  return !cardActivationBoardTargetable(card, index);
}
function cardActivationRewardDimmed(card) {
  return !!_pendingCardActivation && !!card && !cardActivationRewardTargetable(card);
}
function cardActivationItemSlotDimmed(item) {
  return !!_pendingCardActivation && !!item && !_cardActivationTargetsItem();
}
function wireCardActivation(element, card, index) {
  if (!cardActivationCanUse(card)) return;
  element.classList.add('card-activation-ready');
  element.classList.toggle('card-activation-source', !!(_pendingCardActivation && _pendingCardActivation.card === card));
  const label = document.createElement('div');
  label.className = 'card-activation-ready-label';
  label.textContent = typeof textMessage === 'function' ? textMessage('「起動可」表示', '起動可') : '起動可';
  element.appendChild(label);
}
function cardActivationClick(index) {
  if (_pendingCardActivation) {
    if (_pendingCardActivation.index === index) { cancelCardActivation(); return true; }
    return handleCardActivationTarget(index);
  }
  if (G._pendingItemUse || G._pendingPanelPlacement) return false;
  const card = _mainBoardCards()[index];
  if (!cardActivationCanUse(card)) return false;
  _pendingCardActivation = { card, index, key:cardActivationVisitKey() };
  if (typeof blessingFlameCancel === 'function') blessingFlameCancel();
  _refreshTargetPicking();
  return true;
}
function _activationPendingValid(pending) {
  return pending && pending.key === cardActivationVisitKey() && cardActivationCanUse(pending.card)
    && _mainBoardCards()[pending.index] === pending.card;
}
function _activationTargetElement(at) {
  return _pickingTargetElement(at);
}
function _handleCardActivationAt(at) {
  const pending = _pendingCardActivation;
  if (!pending) return false;
  if (!_activationPendingValid(pending)) { cancelCardActivation(); return true; }
  if (at.zone === 'board' && at.index === pending.index) { cancelCardActivation(); return true; }
  if (pending.firstTarget && pending.firstTarget.card === at.card && _activationLocationCurrent(at)) {
    delete pending.firstTarget; _refreshTargetPicking(); return true;
  }
  if (!_activationLocationCurrent(at)) return true;
  if (!_cardActivationTargetable(at)) return true;
  const source = pending.card, pair = coreActivationPairSpec(source), cards = _mainBoardCards();
  if (pair && !pair.self && !pending.firstTarget) {
    pending.firstTarget = at;
    _refreshTargetPicking(); return true;
  }
  const first = pair && (pair.self ? { zone:'board', index:pending.index, card:source } : pending.firstTarget);
  const run = () => coreActivateBoardCard(source, at.card, PANEL_POOL, coreMathRng,
    { targetZone:at.zone, otherTarget:first && first.card });
  const result = typeof runWithKeyedRandom === 'function'
    ? runWithKeyedRandom(`activation:${pending.key}:${pending.index}:${first?.zone}:${first?.index}:${at.zone}:${at.index}`, run) : run();
  if (!result) return true;
  const quest = typeof questRequiredEntryOnBoard === 'function' ? questRequiredEntryOnBoard() : null;
  const el = _activationTargetElement(at);
  const visual = result.kind === 'destroy' ? _activationCaptureVisual(el) : null;
  const frame = result.kind === 'buff_color' ? _activationCaptureFrame(el) : null;
  const cover = result.kind === 'transform' ? _activationCaptureVisual(el) : null;
  const hold = result.kind === 'destroy' ? _activationHoldStats(source, pending.index) : null;
  const rewardRect = at.zone === 'reward' ? el?.getBoundingClientRect() : null;
  delete source._activationReady;
  if (result.kind === 'swap_stats') {
    Object.assign(at.card, result.first); Object.assign(first.card, result.second);
  } else if (result.kind === 'swap_cards') {
    if (first.zone === at.zone) {
      const list = first.zone === 'board' ? cards : _rewCards;
      [list[first.index], list[at.index]] = [list[at.index], list[first.index]];
    } else {
      const owned = first.zone === 'board' ? first : at, offered = first.zone === 'reward' ? first : at;
      const incoming = _exchangeShopCardCopy(offered.card), outgoing = _exchangeShopCardCopy(owned.card);
      cards[owned.index] = incoming; _rewCards[offered.index] = outgoing;
      // 交換を無料取得枠の追加にしない。報酬を1枚取得済みなら、交換後も1枚取得済み。
      if (!G._isShop && G._rewardOnePickMode) outgoing._isOriginalReward = true;
      if (typeof markCardAcquired === 'function') markCardAcquired(incoming);
    }
    _syncUnitPanelEffectsAfterMove(_getPartyBoardUnit());
  } else if (result.kind === 'transform') {
    const make = () => makePanel(result.definition.id);
    const next = typeof runWithKeyedRandom === 'function' ? runWithKeyedRandom(`activation-card:${pending.key}:${pending.index}:${at.index}`, make) : make();
    _replacePickingCard(at, next);
  } else if (result.kind === 'buff_color') {
    at.card.power = (Number(at.card.power)||0) + result.atk;
    at.card.life = (Number(at.card.life)||0) + result.hp; at.card.color = result.color;
  } else if (result.kind === 'destroy') {
    if (at.zone === 'board') cards[at.index] = null;
    else if (G._isShop) _rewCards[at.index] = null;
    else _rewCards.splice(at.index, 1);
    source.power = (Number(source.power)||0) + result.atk; source.life = (Number(source.life)||0) + result.hp;
  }
  if (G._isShop && typeof _persistCurrentShopStock === 'function') _persistCurrentShopStock();
  _finishCardActivation(pending, quest);
  _playActivationFx(source, result.kind === 'destroy' ? { rect:visual?.rect, visual, hold }
    : { index:at.index, zone:at.zone, frame, cover, rewardRect, kind:result.kind, result }, pending.index);
  return true;
}
function handleCardActivationTarget(index) { return _handleCardActivationAt(_activationLocation('board', index)); }
function handleCardActivationRewardTarget(index) { return _handleCardActivationAt(_activationLocation('reward', index)); }
// マモンは所持アイテムだけを対象にする。
function handleCardActivationItemTarget(index) {
  const pending = _pendingCardActivation;
  if (!pending) return false;
  if (!_activationPendingValid(pending)) { cancelCardActivation(); return true; }
  const target = (G.spellSlots || [])[index];
  const result = coreActivateBoardCard(pending.card, target, PANEL_POOL, coreMathRng, { targetZone:'item' });
  if (!result || result.kind !== 'destroy_item_gold') return true;
  const quest = typeof questRequiredEntryOnBoard === 'function' ? questRequiredEntryOnBoard() : null;
  G.spellSlots[index] = null; delete pending.card._activationReady;
  gainEventGold(result.gold);
  if (typeof _syncRewardProductionItems === 'function') _syncRewardProductionItems();
  _finishCardActivation(pending, quest);
  _playActivationFx(pending.card, { index:pending.index, kind:result.kind, result }, pending.index);
  return true;
}
// ── 起動の演出（2026-10-23 VFX の全検査で新しく作った。利用者の確認待ち）──────────────
// 番号ごとの演出は present.js PRESENT_ACTIVATION_FX（LAB も同じ表を読む）。変身・強化は対象のカードの上、
// 破壊（ヘルナイト）は破壊したカードの位置からヘルナイトへ吸い込む。効果の適用・保存には関わらない。
function _activationSlotEl(index) {
  if (typeof document === 'undefined') return null;
  return typeof getBoardSlotElement === 'function' ? getBoardSlotElement(index)
    : document.querySelector(`#hand-slots [data-board-idx="${index}"]`);
}
function _activationHoldStats(card,index) {
  const stats=typeof _panelCharacterPreviewStats==='function'
    ?_panelCharacterPreviewStats(_getPartyBoardUnit(),index,card):{atk:card.power,hp:card.life};
  const hold={stats:{...stats}};_activationStatHolds.set(card,hold);return hold;
}
function _activationFreezeStyle(from,to) {
  const style=getComputedStyle(from);
  for(const key of style) to.style.setProperty(key,style.getPropertyValue(key),'important');
  to.style.setProperty('animation','none','important');to.style.setProperty('transition','none','important');
  to.style.setProperty('pointer-events','none','important');
}
function _activationCaptureFrame(el) {
  if(!el||typeof getComputedStyle!=='function') return null;
  const frame=el.querySelector('.character-frame-layer');
  const copy=document.createElement('span');copy.className='activation-old-frame';
  if(frame) _activationFreezeStyle(frame,copy);
  else Object.assign(copy.style,{position:'absolute',inset:'0',background:`${getComputedStyle(el).getPropertyValue('--card-frame')} center/100% 100% no-repeat`});
  copy.style.setProperty('z-index','91','important');
  copy.style.setProperty('pointer-events','none','important');
  copy.style.removeProperty('opacity'); // Web Animationsのフェードを!importantで遮らない。
  return copy;
}
function _activationCaptureVisual(el) {
  if(!el||typeof getComputedStyle!=='function') return null;
  const rect=el.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return null;
  const node=el.cloneNode(true),originals=[el,...el.querySelectorAll('*')],copies=[node,...node.querySelectorAll('*')];
  originals.forEach((from,i)=>{if(copies[i])_activationFreezeStyle(from,copies[i]);});
  [node,...node.querySelectorAll('[id]')].forEach(n=>n.removeAttribute('id'));
  node.querySelectorAll('button,.card-activation-ready-label,.shop-buy-price,.shop-board-sell-value').forEach(n=>n.remove());
  const width=el.offsetWidth||rect.width,height=el.offsetHeight||rect.height;
  for(const [key,value]of Object.entries({position:'absolute',left:'0px',top:'0px',right:'auto',bottom:'auto',margin:'0',
    width:width+'px',height:height+'px',transform:`scale(${rect.width/width},${rect.height/height})`,transformOrigin:'0 0',opacity:'1'}))
    node.style.setProperty(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),value,'important');
  return {node,rect,width,height};
}
function _playActivationSlice(visual) {
  if(!visual)return;
  const r=visual.rect,scale=r.width/visual.width,shift=HELLKNIGHT_SLICE_SHIFT_PX*scale;
  const halves=['polygon(0 0,100% 0,100% 100%)','polygon(0 0,100% 100%,0 100%)'].map((clip,i)=>{
    const half=document.createElement('div');half.className='activation-cut-half';
    Object.assign(half.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',clipPath:clip});
    half.appendChild(i?visual.node.cloneNode(true):visual.node);document.body.appendChild(half);return half;
  });
  setTimeout(()=>halves.forEach((half,i)=>{
    const dir=i?-1:1;
    const anim=half.animate?.([{transform:'translate(0,0)',opacity:1},{transform:`translate(${dir*shift}px,${-dir*shift}px)`,opacity:0}],
      {duration:HELLKNIGHT_SLICE_FADE_MS,easing:'ease-out',fill:'forwards'});
    if(anim) anim.finished.catch(()=>{}).finally(()=>half.remove());else half.remove();
  }),HELLKNIGHT_SLICE_MS);
}
function _playActivationFx(source, at, sourceIndex) {
  const code = String(source && (source.no || source.artCode) || '');
  const names=typeof VbFx!=='undefined'?VbFx.effects.map(d=>d.name):[];
  const name=presentActivationFx(code,names);
  if(at?.visual)_playActivationSlice(at.visual);
  if(at?.hold) setTimeout(()=>{
    if(_activationStatHolds.get(source)!==at.hold)return;
    _activationStatHolds.delete(source);
    if(G.phase==='reward')renderHandEditor();
  },HELLKNIGHT_GAIN_MS);
  const owner = _activationSlotEl(sourceIndex);
  let from = Number.isInteger(at && at.index) ? _pickingTargetElement({zone:at.zone||'board',index:at.index}) : null, anchor = null;
  if(from&&at.frame){
    const old=at.frame;from.appendChild(old);
    const peak=names.includes(name)&&VbFx.impactMs?VbFx.impactMs(name,1):470;
    setTimeout(()=>{
      const fade=old.animate?.([{opacity:1},{opacity:0}],{duration:ACTIVATION_COLOR_FADE_MS,easing:'ease-in-out',fill:'forwards'});
      if(fade)fade.finished.catch(()=>{}).finally(()=>old.remove());else old.remove();
    },peak);
  }
  if(from&&at.cover){
    const old=at.cover.node;old.style.setProperty('z-index','92','important');from.appendChild(old);
    const peak=names.includes(name)&&VbFx.impactMs?VbFx.impactMs(name,1):470;
    setTimeout(()=>{
      const fade=old.animate?.([{opacity:1},{opacity:0}],{duration:ACTIVATION_COLOR_FADE_MS,easing:'ease-in-out',fill:'forwards'});
      if(fade)fade.finished.catch(()=>{}).finally(()=>old.remove());else old.remove();
    },peak);
  }
  if(!name||!names.includes(name))return;
  if (!from && at && at.rect && at.rect.width > 0) {
    // 破壊したカードは描き直しで消えているので、元の位置に見えない目印を置いて発生元にする。
    anchor = document.createElement('div');
    Object.assign(anchor.style, { position: 'fixed', left: at.rect.left + 'px', top: at.rect.top + 'px', width: at.rect.width + 'px',
      height: at.rect.height + 'px', pointerEvents: 'none', opacity: '0' });
    document.body.appendChild(anchor); from = anchor;
  }
  if (!from || !from.isConnected) return;
  const target = anchor ? owner : from;
  if (!target || !target.isConnected) { if (anchor) anchor.remove(); return; }
  if (typeof _vfxClipLayer === 'function') VbFx.settings.layer = _vfxClipLayer;
  VbFx.play(name, { source: from, targets: [target], speed: 1, seed: 53, dir: 1 }).catch(() => {})
    .finally(() => { if (anchor) anchor.remove(); });
  // SEは LAB で採用したカード固有の音（2026-10-25：チェンジリング・インキュバス・ヘルナイト）。山場（present.js の実測ピーク）を演出の山場へ合わせる。
  // 固有の音が無いカードは同じ演出の音（マモン＝ノームの金貨。present.js presentActivationSfxKey）、それも無ければ巻物の使用と同じ共通音。
  const sfxKey = typeof presentActivationSfxKey === 'function' ? presentActivationSfxKey(code) : '';
  if (sfxKey && sfxKey !== 'itemScroll' && typeof _playSfxAtVfxCue === 'function' && VbFx.impactMs) {
    _playSfxAtVfxCue(sfxKey, VbFx.impactMs(name, 1), { group: 'magic', guardKey: `activation:${name}`, guardMs: 120, maxPlayMs: 0 });
  } else if (typeof playSfx === 'function') playSfx('itemScroll', { group: 'magic', guardKey: `activation:${name}`, guardMs: 120, maxPlayMs: 0 });
}
function _finishCardActivation(pending, quest) {
  _pendingCardActivation = null;
  _refreshTargetPicking(); updateHUD();
  if (quest && typeof questRequiredCardGone === 'function' && questRequiredCardGone(quest) && typeof questOnRequiredCardDestroyed === 'function') questOnRequiredCardDestroyed(quest);
  if (typeof _storeRewardStartSnapshot === 'function') _storeRewardStartSnapshot();
  // 回数と盤面を同じチェックポイントに確定し、再開による使い直しを防ぐ。
  if (typeof SaveRun !== 'undefined' && SaveRun.enabled()) SaveRun.checkpoint('reward');
}
// 取り消し操作とbodyの状態はアイテムと共用する。
function syncCardActivationPicking() {
  _syncItemUsePickingUi();
}
