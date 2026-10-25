// 起動（2026-10-23 利用者指定）：「戦闘終了ごとに1回発動可能（累積はしない）。獲得即使用はできない。」
// 戦闘が終わった時に魔導板にある起動のカードへ印（_activationReady）を立て、使うと外す。印はカード自身に保存する。
// 戦闘の後に手に入れたカードには印が無いので、次の戦闘が終わるまで使えない。使える画面は編成画面・魔導店・行商。
// 起動できるカードは枠を緑に光らせ、右上に「起動可」のラベル（還魂のボタンと同じ形）を出す。発動はカードのクリック。
let _pendingCardActivation = null;
// チェンジリング（入れ替えの起動）の本文。2026-10-26 に「対象の魔導板のカードと、対象の報酬のカードを入れ替える。」へ変更（旧本文も受ける）。
const CARD_ACTIVATION_EXCHANGE_RE = /対象の魔導板のカードと、(?:対象の)?報酬のカード/;
const ACTIVATION_COLOR_FADE_MS = 400;
const HELLKNIGHT_SLICE_MS = 260;
const HELLKNIGHT_SLICE_FADE_MS = 500;
const HELLKNIGHT_SLICE_SHIFT_PX = 40;
const HELLKNIGHT_GAIN_MS = 900;
const _activationStatHolds = new WeakMap(); // 表示だけ。効果適用・保存値には触れない。
function cardActivationShownStats(card, stats) { return _activationStatHolds.get(card)?.stats || stats; }
// 画面の鍵。使える画面の判定と、発動の乱数の鍵に使う（回数は数えない）。
function cardActivationVisitKey() {
  if (G.phase !== 'reward') return '';
  if (G._isPeddler) return `peddler:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}`;
  if (G._isShop && !G._isItemShop) return `shop:${G._facilityCacheKey ?? G._wave}`;
  if (G._isForge || G._isItemShop || G._isLibrary || G._isTavern || G._isRingExchange || G._isVillageMenu || G._isWaveAltar || G._isFiveSaints) return '';
  return `formation:${Number(G.activationFormationSeq)||0}`;
}
function cardActivationCanUse(card) {
  return !!(card && card._activationReady && cardActivationVisitKey() && coreUnitTriggerText(card, '起動'));
}
// 戦闘終了時（battle.js onBattleEnd）：魔導板の起動のカードを使える状態にする。何度呼んでも1回分（累積しない）。
function chargeBoardCardActivations() {
  (typeof _mainBoardCards === 'function' ? _mainBoardCards() : (G.mainBoard || [])).forEach(card => {
    if (card && coreUnitTriggerText(card, '起動')) card._activationReady = true;
  });
}
function cancelCardActivation() {
  _pendingCardActivation = null;
  if (typeof renderHandEditor === 'function') renderHandEditor();
  if (typeof renderRewCards === 'function') renderRewCards();
  if (typeof _syncRewardProductionItems === 'function') _syncRewardProductionItems();
}
// ── 対象選び中の暗転（2026-10-26 利用者指定）────────────────────────────
// カードを選ぶ起動では選べるカード以外を、アイテムを選ぶ起動（マモン）ではアイテム枠以外を暗くする。
function _cardActivationTargetsItem() {
  const pending = _pendingCardActivation;
  return !!pending && /対象のアイテム/.test(coreUnitTriggerText(pending.card, '起動'));
}
function cardActivationBoardTargetable(card, index) {
  const pending = _pendingCardActivation;
  if (!pending || !card || _cardActivationTargetsItem()) return false;
  const text = coreUnitTriggerText(pending.card, '起動');
  if (CARD_ACTIVATION_EXCHANGE_RE.test(text)) {
    return /キャラクター|エンチャント|強化/.test(card.category || '') && !(typeof _cardIsEngraved === 'function' && _cardIsEngraved(card));
  }
  // 判定だけなので乱数は進めない（変身先の抽選は候補の有無だけ見る）。
  const probe = { pick: list => list[0], int: lo => lo, next: () => 0 };
  return !!coreActivateBoardCard(pending.card, card, PANEL_POOL, probe, { targetZone: 'board' });
}
// 魔導板のカードを暗くするか。起動元のカードは押すと取り消せるので暗くしない。
function cardActivationBoardDimmed(card, index) {
  const pending = _pendingCardActivation;
  if (!pending || !card) return false;
  if (card === pending.card && index === pending.index) return false;
  return !cardActivationBoardTargetable(card, index);
}
function cardActivationRewardDimmed(card) {
  return !!_pendingCardActivation && !!card && !cardActivationRewardTargetable(card);
}
// アイテム枠を暗くするか。アイテムを選ぶ起動では、アイテムの入った枠だけ明るくする。
function cardActivationItemSlotDimmed(item) {
  if (!_pendingCardActivation) return false;
  return !(_cardActivationTargetsItem() && item);
}
function wireCardActivation(element, card, index) {
  if (!cardActivationCanUse(card)) return;
  const pending = !!(_pendingCardActivation && _pendingCardActivation.card === card);
  element.classList.add('card-activation-ready');
  element.classList.toggle('card-activation-source', pending);
  const label = document.createElement('div');
  label.className = 'card-activation-ready-label';
  label.textContent = typeof textMessage === 'function' ? textMessage('「起動可」表示', '起動可') : '起動可';
  element.appendChild(label);
}
// 魔導板のカードのクリック。起動の対象選び中なら対象として扱い、そうでなければ起動できるカードで対象選びを始める。
// 戻り値 true：起動の操作として受け取った（他のクリック処理へ渡さない）。
function cardActivationClick(index) {
  if (_pendingCardActivation) {
    if (_pendingCardActivation.index === index && !CARD_ACTIVATION_EXCHANGE_RE.test(coreUnitTriggerText(_pendingCardActivation.card, '起動'))) { cancelCardActivation(); return true; }
    return handleCardActivationTarget(index);
  }
  if (G._pendingItemUse || G._pendingPanelPlacement) return false;
  const card = _mainBoardCards()[index];
  if (!cardActivationCanUse(card)) return false;
  _pendingCardActivation = { card, index, key: cardActivationVisitKey() };
  // 報酬枠のカードも対象の印を付け直す（破壊の起動）。アイテム枠も暗転を付け直す。
  renderHandEditor(); renderRewCards();
  if (typeof _syncRewardProductionItems === 'function') _syncRewardProductionItems();
  return true;
}
function handleCardActivationTarget(index) {
  const pending = _pendingCardActivation;
  if (!pending) return false;
  if (pending.key !== cardActivationVisitKey() || !cardActivationCanUse(pending.card)) { cancelCardActivation(); return true; }
  const cards = _mainBoardCards(), source = pending.card, target = cards[index];
  if (cards[pending.index] !== source) { cancelCardActivation(); return true; }
  if (!target) return true;
  if (CARD_ACTIVATION_EXCHANGE_RE.test(coreUnitTriggerText(source, '起動'))) {
    if (typeof _cardIsEngraved === 'function' && _cardIsEngraved(target)) return true;
    pending.targetIndex = index; pending.targetCard = target;
    renderHandEditor(); renderRewCards();
    return true;
  }
  const quest = typeof questRequiredEntryOnBoard === 'function' ? questRequiredEntryOnBoard() : null;
  const run = () => coreActivateBoardCard(source, target, PANEL_POOL, coreMathRng, { targetZone: 'board' });
  const result = typeof runWithKeyedRandom === 'function' ? runWithKeyedRandom(`activation:${pending.key}:${pending.index}:${index}`, run) : run();
  if (!result) return true;
  delete source._activationReady;
  // 消す前の実際の見た目を控える。結果の適用・チェックポイントは従来の順番のまま。
  const visual = result.kind === 'destroy' ? _activationCaptureVisual(_activationSlotEl(index)) : null;
  const frame = result.kind === 'buff_color' ? _activationCaptureFrame(_activationSlotEl(index)) : null;
  const hold = result.kind === 'destroy' ? _activationHoldStats(source,pending.index) : null;
  if (result.kind === 'transform') {
    const make = () => makePanel(result.definition.id);
    const next = typeof runWithKeyedRandom === 'function' ? runWithKeyedRandom(`activation-card:${pending.key}:${pending.index}:${index}`, make) : make();
    // 対象の起動の印と進行上の印を変身後も保持する。
    if (target._activationReady) next._activationReady = true;
    if (target._battleEndCount) next._battleEndCount = target._battleEndCount;
    // 変身しても同じ枠のカードとして「配置を戻す」で追う（2026-10-25）。
    if (target._placeKey) next._placeKey = target._placeKey;
    cards[index] = next;
  } else if (result.kind === 'buff_color') {
    target.power = (Number(target.power)||0) + result.atk; target.life = (Number(target.life)||0) + result.hp;
    target.color = result.color;
  } else if (result.kind === 'destroy') {
    cards[index] = null;
    source.power = (Number(source.power)||0) + result.atk; source.life = (Number(source.life)||0) + result.hp;
  }
  _finishCardActivation(pending, quest);
  _playActivationFx(source, result.kind === 'destroy' ? { rect: visual?.rect, visual, hold } : { index, frame }, pending.index);
  return true;
}
// 破壊の起動（ヘルナイト）は報酬枠のキャラクターも対象にできる（2026-10-23 利用者指定）。
// 魔導店・行商の品も報酬枠に並ぶので同じく選べる（代金は掛からない）。依頼・NPCのカードと売却待ちの自分のカードは選ばない。
function cardActivationRewardTargetable(card) {
  const pending = _pendingCardActivation;
  if (!pending || !card) return false;
  if (card._npcCard || card._npcDeployOnly || card._questOfferCard || card._questTransportId || card._shopSalePending) return false;
  const text = coreUnitTriggerText(pending.card, '起動');
  if (CARD_ACTIVATION_EXCHANGE_RE.test(text)) {
    if (!Number.isInteger(pending.targetIndex) || !/キャラクター|エンチャント|強化/.test(card.category || '')) return false;
    const board = _getPartyBoardUnit(), cards = _mainBoardCards();
    if (cards[pending.targetIndex] !== pending.targetCard) return false;
    if (typeof questRewardSlotAcceptsCard === 'function' && !questRewardSlotAcceptsCard(pending.targetCard)) return false;
    if (typeof questShopExchangeState === 'function' && (questShopExchangeState(pending.targetCard) === 'blocked' || questShopExchangeState(card) !== 'allow')) return false;
    if (typeof _canCardUseBoardSlot === 'function' && !_canCardUseBoardSlot(card, pending.targetIndex, board)) return false;
    const next = cards.slice(); next[pending.targetIndex] = card;
    return typeof _canApplyBoardChange !== 'function' || _canApplyBoardChange(board, next);
  }
  return card.category === 'キャラクター' && /対象の(?:報酬の)?キャラクターを破壊し/.test(text);
}
// マモン：報酬欄のアイテムではなく、所持しているアイテム枠だけを選ぶ。
function handleCardActivationItemTarget(index) {
  const pending = _pendingCardActivation;
  if (!pending) return false;
  if (pending.key !== cardActivationVisitKey() || !cardActivationCanUse(pending.card)
    || _mainBoardCards()[pending.index] !== pending.card) { cancelCardActivation(); return true; }
  const target = (G.spellSlots || [])[index];
  const result = coreActivateBoardCard(pending.card, target, PANEL_POOL, coreMathRng, { targetZone: 'item' });
  if (!result || result.kind !== 'destroy_item_gold') return true;
  const rect = document.querySelectorAll('.reward-prod-item .reward-prod-slots i')[index]?.getBoundingClientRect();
  const quest = typeof questRequiredEntryOnBoard === 'function' ? questRequiredEntryOnBoard() : null;
  G.spellSlots[index] = null;
  delete pending.card._activationReady;
  gainEventGold(result.gold);
  if (typeof _syncRewardProductionItems === 'function') _syncRewardProductionItems();
  _finishCardActivation(pending, quest);
  _playActivationFx(pending.card, { rect, kind: result.kind, result }, pending.index);
  return true;
}
function handleCardActivationRewardTarget(rewIdx) {
  const pending = _pendingCardActivation;
  if (!pending) return false;
  if (pending.key !== cardActivationVisitKey() || !cardActivationCanUse(pending.card)) { cancelCardActivation(); return true; }
  const cards = _mainBoardCards(), source = pending.card, target = Array.isArray(_rewCards) ? _rewCards[rewIdx] : null;
  if (cards[pending.index] !== source) { cancelCardActivation(); return true; }
  if (!cardActivationRewardTargetable(target)) return true;
  const rewEl = typeof document !== 'undefined' ? document.querySelector(`#reward-offer-row [data-merge-rew-idx="${rewIdx}"]`) : null;
  const quest = typeof questRequiredEntryOnBoard === 'function' ? questRequiredEntryOnBoard() : null;
  if (CARD_ACTIVATION_EXCHANGE_RE.test(coreUnitTriggerText(source, '起動'))) {
    const result = coreActivateBoardCard(source, pending.targetCard, PANEL_POOL, coreMathRng,
      { targetZone: 'board', rewardTarget: target });
    if (!result || result.kind !== 'exchange_reward') return true;
    const rewardRect = rewEl?.getBoundingClientRect();
    delete source._activationReady;
    // カードの個体を交換する。配置を戻す印 _placeKey も個体と一緒に移す。
    const incoming = _exchangeShopCardCopy(target), outgoing = pending.targetCard;
    cards[pending.targetIndex] = incoming;
    _rewCards[rewIdx] = _exchangeShopCardCopy(outgoing);
    // 戦闘報酬では、報酬欄へ移したカードも報酬の1枚として扱う（2026-10-26 利用者指定）。
    // 印が無いと無料の1枚とは別に取り戻せ、入れ替えと合わせて所持枚数が増えていた。
    // 先に取った報酬を戻せば、その1枚の代わりに取り戻せる。
    if (!G._isShop && G._rewardOnePickMode) _rewCards[rewIdx]._isOriginalReward = true;
    // 本人が交換された場合も、報酬欄へ移った同じ個体に永久の減少を残す（旧本文のみ。新本文は能力値が変わらない）。
    const holder = outgoing === source ? _rewCards[rewIdx] : source;
    if (result.atk || result.hp) persistBoardCharacterStats({ boardCards: [holder] }, 0, result.atk, result.hp);
    _syncUnitPanelEffectsAfterMove(_getPartyBoardUnit());
    if (typeof markCardAcquired === 'function') markCardAcquired(incoming);
    if (G._isShop && typeof _persistCurrentShopStock === 'function') _persistCurrentShopStock();
    _finishCardActivation(pending, quest);
    _playActivationFx(source, { index: pending.targetIndex, rewardRect, kind: result.kind, result }, pending.index);
    return true;
  }
  const result = coreActivateBoardCard(source, target, PANEL_POOL, coreMathRng, { targetZone: 'reward' });
  if (!result || result.kind !== 'destroy') return true;
  const visual = _activationCaptureVisual(rewEl), hold = _activationHoldStats(source,pending.index);
  delete source._activationReady;
  // 報酬枠から消す（取得と同じく、店の品は空き枠にし、戦闘報酬は詰める）。
  if (G._isShop) _rewCards[rewIdx] = null; else _rewCards.splice(rewIdx, 1);
  if (G._isShop && typeof _persistCurrentShopStock === 'function') _persistCurrentShopStock();
  source.power = (Number(source.power)||0) + result.atk; source.life = (Number(source.life)||0) + result.hp;
  _finishCardActivation(pending, quest);
  _playActivationFx(source, { rect: visual?.rect, visual, hold }, pending.index);
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
  let from = Number.isInteger(at && at.index) ? _activationSlotEl(at.index) : null, anchor = null;
  if(from&&at.frame){
    const old=at.frame;from.appendChild(old);
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
  renderHandEditor(); renderRewCards(); updateHUD();
  if (quest && typeof questRequiredCardGone === 'function' && questRequiredCardGone(quest) && typeof questOnRequiredCardDestroyed === 'function') questOnRequiredCardDestroyed(quest);
  if (typeof _storeRewardStartSnapshot === 'function') _storeRewardStartSnapshot();
  // 回数と盤面を同じチェックポイントに確定し、再開による使い直しを防ぐ。
  if (typeof SaveRun !== 'undefined' && SaveRun.enabled()) SaveRun.checkpoint('reward');
}
if (typeof document !== 'undefined') document.addEventListener('keydown', e => { if (e.key === 'Escape' && _pendingCardActivation) cancelCardActivation(); });
