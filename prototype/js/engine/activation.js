// 起動（2026-10-23 利用者指定）：「戦闘終了ごとに1回発動可能（累積はしない）。獲得即使用はできない。」
// 戦闘が終わった時に魔導板にある起動のカードへ印（_activationReady）を立て、使うと外す。印はカード自身に保存する。
// 戦闘の後に手に入れたカードには印が無いので、次の戦闘が終わるまで使えない。使える画面は編成画面・魔導店・行商。
// 起動できるカードは枠を緑に光らせ、右上に「起動可」のラベル（還魂のボタンと同じ形）を出す。発動はカードのクリック。
let _pendingCardActivation = null;
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
    if (_pendingCardActivation.index === index) { cancelCardActivation(); return true; }
    return handleCardActivationTarget(index);
  }
  if (G._pendingItemUse || G._pendingPanelPlacement) return false;
  const card = _mainBoardCards()[index];
  if (!cardActivationCanUse(card)) return false;
  _pendingCardActivation = { card, index, key: cardActivationVisitKey() };
  // 報酬枠のカードも対象の印を付け直す（破壊の起動）。
  renderHandEditor(); renderRewCards();
  return true;
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
  if (!pending || !card || card.category !== 'キャラクター') return false;
  if (card._npcCard || card._npcDeployOnly || card._questOfferCard || card._questTransportId || card._shopSalePending) return false;
  return /対象のキャラクターを破壊し/.test(coreUnitTriggerText(pending.card, '起動'));
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
  const result = coreActivateBoardCard(source, target, PANEL_POOL, coreMathRng);
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
  // SEは巻物の使用と同じ共通音（仮。LAB で選び直せる）。
  if (typeof playSfx === 'function') playSfx('itemScroll', { group: 'magic', guardKey: `activation:${name}`, guardMs: 120, maxPlayMs: 0 });
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
