// reward_items.js — 報酬・施設画面のアイテム表示と使用
function _rewardItemArtPath(card){
  if(!card) return '';
  if(card.art) return String(card.art);
  if(typeof getCardAsset==='function') return getCardAsset(card)||'';
  return '';
}
function _ensureItemSlots(){
  G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:[];
  while(G.spellSlots.length<4) G.spellSlots.push(null);
  return G.spellSlots;
}
function _syncRewardProductionItems(){
  const slots=document.querySelectorAll('.reward-prod-item .reward-prod-slots i');
  if(!slots.length||!G||G.phase!=='reward') return;
  const items=_ensureItemSlots();
  slots.forEach((slot,idx)=>{
    const item=items[idx]||null;
    const path=_rewardItemArtPath(item);
    slot.classList.add('item-visual');
    slot.classList.toggle('item-visual-filled',!!path);
    if(path) slot.style.setProperty('--item-art',`url("${path}")`);
    else slot.style.removeProperty('--item-art');
    slot._rewardItem=item;
    const picking=_targetPickingActive();
    const source=!!(G._pendingItemUse&&G._pendingItemUse.slotIdx===idx);
    // クリックの共通ガードにも、マモンの対象であることを渡す。
    // 見た目のpointer-eventsだけを有効にしてもdocumentのcaptureで止まる。
    slot.classList.toggle('item-target-ok',!!item&&picking
      &&typeof _cardActivationTargetsItem==='function'&&_cardActivationTargetsItem());
    slot.classList.toggle('picking-source',source);
    slot.classList.toggle('activation-target-disabled',!!item&&picking&&!source
      &&!(typeof _cardActivationTargetsItem==='function'&&_cardActivationTargetsItem()));
    slot.classList.remove('rarity-1','rarity-2','rarity-3','rarity-4','rarity-5');
    const desc=item?_plainEffectTextForPreview(item):'';
    const preview=item?[item.name,_previewRarityLine(item),desc].filter(Boolean).join('\n'):'';
    if(preview){
      slot.setAttribute('data-preview',preview);
      const keywordPreview=typeof _auxiliaryKeywordPreviewText==='function'?_auxiliaryKeywordPreviewText(item,desc):'';
      if(keywordPreview) slot.setAttribute('data-keyword-preview',keywordPreview);
      else slot.removeAttribute('data-keyword-preview');
      const rarity=Math.max(1,Math.min(5,parseInt(item.rarity,10)||1));
      slot.classList.add(`rarity-${rarity}`);
    }else{
      slot.removeAttribute('data-preview');
      slot.removeAttribute('data-keyword-preview');
    }
    slot.draggable=!!item&&!picking;
    if(!slot._itemDragWired){
      slot._itemDragWired=true;
      slot.addEventListener('dragstart',e=>{
        if(!slot._rewardItem){ e.preventDefault(); return; }
        _dragSrc={arr:'spellSlots',idx};
        if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); }
        _setDragZoneClass('dragzone-itemslot');
        _createDragGhost(slot);
        if(_dragGhostDiv) _dragGhostDiv.style.setProperty('--item-art',slot.style.getPropertyValue('--item-art'));
        slot.classList.add('dragging');
        _hideDragSourceParts(slot);
      });
      slot.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      slot.addEventListener('dragend',()=>{ _restoreDragSourceParts(slot); slot.classList.remove('dragging'); _removeDragGhost(); _clearDragZoneClass(); _dragSrc=null; });
      slot.addEventListener('dragover',e=>{
        if(_dragSrc&&_dragSrc.arr==='spellSlots'&&_dragSrc.idx!==idx){ e.preventDefault(); slot.classList.add('drag-over'); return; }
        const rewCard=_dragSrc&&_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:null;
        if(rewCard&&_isItemCard(rewCard)&&!slot._rewardItem){ e.preventDefault(); slot.classList.add('drag-over'); }
      });
      slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
      slot.addEventListener('drop',e=>{
        slot.classList.remove('drag-over');
        const items=_ensureItemSlots();
        if(_dragSrc&&_dragSrc.arr==='spellSlots'&&_dragSrc.idx!==idx){
          e.preventDefault();
          const srcIdx=_dragSrc.idx; _dragSrc=null;
          const tmp=items[idx];
          items[idx]=items[srcIdx]||null;
          items[srcIdx]=tmp||null;
          _playRewardAcquireSfx('item_get.wav');
          _syncRewardProductionUi();
          updateHUD();
          return;
        }
        if(_dragSrc&&_dragSrc.arr==='rew'){
          const rewIdx=_dragSrc.idx;
          const card=_rewCards[rewIdx];
          if(!card||!_isItemCard(card)||slot._rewardItem) return;
          // 道具屋の提示アイテムはドラッグで入れても購入扱い（クリック購入と同じくゴールドを徴収する）。
          // ただし自分の手持ちを商品枠へ置いたもの（売却待ち）を戻す場合は徴収しない。
          const buyCost=(G._isItemShop&&!card._shopSalePending)?Math.max(0,Number(card._buyPrice)||0):0;
          if(buyCost>0&&(G.gold||0)<buyCost) return;
          e.preventDefault();
          _dragSrc=null;
          if(buyCost>0){
            G.gold-=buyCost;
            if(typeof refreshRewardGoldUi==='function') refreshRewardGoldUi();
            // クリック購入と同じ鳴らし方（ファイル指定・FILE_SFX_VOLUMES の音量）にそろえる。
            if(typeof _playRewardAcquireSfx==='function') _playRewardAcquireSfx('buy2.wav');
          }
          const placed=clone(card);
          if(buyCost>0&&typeof markShopPurchase==='function') markShopPurchase(placed,card,rewIdx,buyCost);
          // 商品枠に置いていた自分のアイテムを戻す場合、売却待ちの印を消してから手持ちへ返す。
          _clearShopSalePending(placed);
          if(card._isOriginalReward){
            placed._rewardReturnCard=clone(card);
            placed._rewardReturnIdx=rewIdx;
            placed._rewardReturnPhaseId=_rewPhaseId;
            _rewFreePickDone=true;
          }
          items[idx]=placed;
          if(G._isItemShop||G._isLibrary) _rewCards[rewIdx]=null;
          else _rewCards.splice(rewIdx,1);
          if(typeof _removeDragGhost==='function') _removeDragGhost();
          if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
          renderRewCards();
          renderHandEditor();
          renderMoveSlotsInEnemy();
          updateHUD();
        }
      });
    }
    // 店（道具屋・魔導店・鍛冶屋）では、手持ちアイテムの売却価格そのものをボタンにする。
    // 価格はアイテムなので全店共通で道具屋準拠（レアリティ×45）。
    slot.querySelector('.shop-board-sell-value')?.remove();
    // 2026-10-11: デバッグ編成もカードと同じ売却場所にする。通常の店の条件・売価は維持する。
    // 売却は無い（2026-10-18）。この来店で買ったアイテムの「返品」（買値で戻す取り消し）だけは残す。
    const returnableHere=!!item&&typeof isShopReturnable==='function'&&isShopReturnable(item);
    if(item&&(_cardSellable(item)||returnableHere)&&!_isCardExchangeShop()&&(G._isShop||G._isForge||(G._debugMode&&_boardCardSellEnabled(item)))){
      const price=typeof _itemShopSellPrice==='function'?_itemShopSellPrice(item):0;
      const action=document.createElement('button');
      action.type='button';
      action.className='shop-board-sell-value shop-board-sell-action item-shop-sell-action';
      action.dataset.sfxSilent='1';
      // この来店で買ったアイテムは売価ではなく「返品」（買値と同額で戻す。reward.js）。
      const returnable=typeof isShopReturnable==='function'&&isShopReturnable(item);
      // 表示も実際の入金（onGoldGained＝強欲の指輪などの倍率込み）と同じ額にする（2026-09-27 利用者指摘）。
      const shownPrice=typeof goldIncomeAmount==='function'?goldIncomeAmount(price):price;
      action.textContent=returnable?_shopReturnLabel():`+${shownPrice}G`;
      if(returnable) action.classList.add('shop-return-btn');
      action.onclick=ev=>{
        ev.stopPropagation();
        if(returnable){ returnShopPurchase(item,()=>{ items[idx]=null; }); return; }
        _sellHeldItem(idx);
      };
      slot.appendChild(action);
    }
    slot.onclick=e=>{
      e.stopPropagation();
      if (typeof handleCardActivationItemTarget === 'function' && handleCardActivationItemTarget(idx)) return;
      // 対象選択中に、選択中のアイテム自身を押したら中断する。
      if(G._pendingItemUse&&G._pendingItemUse.slotIdx===idx){ _cancelPendingItemUse(); return; }
      if(_targetPickingActive()) return;
      if(slot._rewardItem) _openItemUseConfirm(idx,slot);
    };
  });
}
// 道具屋：手持ちアイテムを売却する（レアリティ×45ゴールド）。
function _sellHeldItem(idx){
  if(_isCardExchangeShop()) return false;
  const items=_ensureItemSlots();
  const card=items[idx];
  if(!card||!_cardSellable(card)) return false;
  const base=typeof _itemShopSellPrice==='function'?_itemShopSellPrice(card):0;
  items[idx]=null;
  const gain=typeof onGoldGained==='function'?onGoldGained(base):(G.gold=(G.gold||0)+base,base);
  if(typeof playFileSfx==='function') playFileSfx('assets/sfx/sell.wav');
  else try{ const se=new Audio('assets/sfx/sell.wav'); se.volume=sfxFallbackVolume(.85); void se.play(); }catch(_e){}
  if(typeof refreshRewardGoldUi==='function') refreshRewardGoldUi();
  _syncRewardProductionUi();
  renderRewCards();
  updateHUD();
}
function _closeItemUseConfirm(){
  const old=document.getElementById('item-use-confirm');
  if(old) old.remove();
  const tip=document.getElementById('kw-tooltip');
  if(tip){
    tip.dataset.rewardLocked='';
    tip.dataset.rewardSlotIdx='';
    tip.classList.remove('reward-action-tooltip');
    tip.dataset.rewardAnchorKind='';
    tip.innerHTML='';
    tip.style.display='none';
    tip.style.removeProperty('width');
    tip.style.removeProperty('max-width');
  }
  // 固定したアイテム／指輪説明に付随するキーワード説明も同時に閉じる。
  // #kw-tooltip だけを閉じると、rewardLocked中は通常のmousemove側が
  // #keyword-tooltipを片付けないため、キーワード枠だけが画面に残る。
  const keywordTip=document.getElementById('keyword-tooltip');
  if(keywordTip){
    keywordTip.innerHTML='';
    keywordTip.style.display='none';
  }
}
function _openRewardActionTooltip(anchor,title,desc,actions){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  const shownStyle=getComputedStyle(tip);
  const measured=tip.getBoundingClientRect();
  const isHoverTip=shownStyle.display!=='none'&&measured.width>0&&measured.height>0
    &&tip.dataset.rewardLocked!=='1';
  // クリック前に表示中のホバー説明を作り直さない。
  // HTML・レアリティ色・左上座標・幅をそのまま使い、下にボタンだけ追加する。
  const hoverHtml=isHoverTip?tip.innerHTML:'';
  const hoverClass=isHoverTip?tip.className:'';
  const hoverLeft=isHoverTip?tip.style.left:'';
  const hoverTop=isHoverTip?tip.style.top:'';
  const hoverWidth=isHoverTip?measured.width:0;
  const esc=s=>String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  tip.querySelector('.reward-action-buttons')?.remove();
  tip.classList.remove('reward-action-tooltip');
  if(isHoverTip){
    tip.className=hoverClass;
    tip.innerHTML=hoverHtml;
    tip.style.left=hoverLeft;
    tip.style.top=hoverTop;
    tip.style.width=`${hoverWidth}px`;
    tip.style.maxWidth=`${hoverWidth}px`;
  }else{
    tip.className='';
    tip.style.removeProperty('width');
    tip.style.removeProperty('max-width');
    tip.innerHTML=typeof _formatPreviewHtml==='function'
      ?_formatPreviewHtml([title,desc].filter(Boolean).join('\n'),{plainTitle:true})
      :`<div class="preview-title">${esc(title)}</div>${esc(desc)}`;
  }
  tip.dataset.rewardLocked='1';
  tip.dataset.rewardAnchorKind='item';
  tip.classList.add('reward-action-tooltip');
  const rule=document.createElement('div');
  rule.className='reward-action-rule';
  tip.appendChild(rule);
  const box=document.createElement('div');
  box.className='reward-action-buttons';
  tip.appendChild(box);
  (actions||[]).forEach(action=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='reward-action-btn';
    button.textContent=action.label||'';
    if(action.disabled){ button.disabled=true; button.classList.add('is-disabled'); }
    button.onclick=event=>{
      event.stopPropagation();
      if(button.disabled) return;
      action.onClick?.();
    };
    box.appendChild(button);
  });
  tip.style.display='block';
  const rect=anchor?.getBoundingClientRect?.();
  // クリック前から表示されていたキーワード説明は、固定説明枠の高さが
  // ボタン分だけ増えたあとも旧位置に残るため、説明枠の直下へ再配置する。
  const keywordTip=document.getElementById('keyword-tooltip');
  // 既にホバー説明が出ていた場合は、その左上座標を固定する。
  // ボタン追加後の高さでカード中心へ揃え直すと、クリックした瞬間に
  // ウインドウ全体が上下へ動くため、キーワード説明だけを直下へ送る。
  if(isHoverTip){
    if(keywordTip&&keywordTip.style.display==='block') _posTipRelative(keywordTip,tip,'below',false);
  }else if(rect&&typeof _positionTooltipGroup==='function'){
    _positionTooltipGroup([tip,keywordTip],anchor,'side');
  }else if(keywordTip&&keywordTip.style.display==='block'){
    _posTipRelative(keywordTip,tip,'below',false);
    _fitTooltipStack([tip,keywordTip]);
  }
}
if(!window._itemRingMenuDismissBound){
  window._itemRingMenuDismissBound=true;
  document.addEventListener('contextmenu',e=>{
    const tip=document.getElementById('kw-tooltip');
    if(tip?.dataset.rewardLocked==='1'){
      // 右クリックは reward.js の共通処理にも渡す。ここで止めると
      // ポップアップ上だけ「閉じる」になり、他の場所の右クリックと
      // 「カード表示非表示切り替え」が一致しなくなる。
      e.preventDefault();
      _closeItemUseConfirm();
    }
  },true);
  document.addEventListener('pointerdown',e=>{
    const pop=document.getElementById('item-use-confirm');
    const tip=document.getElementById('kw-tooltip');
    if(!pop&&tip?.dataset.rewardLocked!=='1') return;
    // 中身のある別スロットは次のclickでその説明へ切り替えるため残す。
    // 空欄は操作対象ではないので、外側クリックと同じく現在の説明を閉じる。
    if(e.target&&e.target.closest&&e.target.closest('#item-use-confirm,#kw-tooltip.reward-action-tooltip,.reward-prod-item .reward-prod-slots i.item-visual-filled,.reward-prod-ring .reward-prod-slots i.ring-visual-filled')) return;
    _closeItemUseConfirm();
    if(G&&G._pendingItemUse) _cancelPendingItemUse();
  },true);
  document.addEventListener('dragstart',e=>{
    _closeItemUseConfirm();
    if(document.body.classList.contains('right-card-peek')){
      e.preventDefault();
      e.stopImmediatePropagation();
      _dragSrc=null;
      window._allySlotDragSrc=null;
      if(typeof _removeDragGhost==='function') _removeDragGhost();
      if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
    }
  },true);
  ['dragover','drop'].forEach(type=>document.addEventListener(type,e=>{
    if(!document.body.classList.contains('right-card-peek')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true));
  // カード透明化中は、dragstart前のpointerdownで行われる選択・クラス更新も止める。
  // 右クリックによる透明化解除は残すため、左ボタンだけを対象にする。
  document.addEventListener('pointerdown',e=>{
    if(!document.body.classList.contains('right-card-peek')||e.button!==0) return;
    if(e.target&&e.target.closest&&e.target.closest('#journey-progress-ui')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    _dragSrc=null;
    window._allySlotDragSrc=null;
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
  },true);
}
function _itemEffectKey(card){
  const key=String(card&&card.itemEffectKey||'');
  if(key==='underworld_scroll'||card&&card.name==='幻視の巻物') return 'vision_scroll';
  if(card&&card.name==='ポータルの巻物') return 'portal_scroll';
  return key;
}
function _mainBoardCards(){
  const unit=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  return unit&&Array.isArray(unit.boardCards)?unit.boardCards:[];
}
function _isBoardCharacterCard(card){
  return !!card&&String(card.category||'')==='キャラクター';
}
function _boardCharacterSlots(){
  return _mainBoardCards().map((card,idx)=>({card,idx})).filter(x=>_isBoardCharacterCard(x.card));
}
function _consumeItemSlot(idx){
  const slots=_ensureItemSlots();
  if(Number.isInteger(idx)) slots[idx]=null;
  _closeItemUseConfirm();
  _syncRewardProductionUi();
  renderHandEditor();
  renderRewCards();
  updateHUD();
}
// 永久キーワードの合算（巻物・強化後の引き継ぎで共用）。「毒3」「封印2」等、末尾が数値のキーワードは数値同士を
// 加算する。数値の無い単純なキーワード（先制・即死等）は重複させず1つのまま残す。
function _mergeCardKeywordsForBond(baseKeywords,addKeywords){
  const result=[...(Array.isArray(baseKeywords)?baseKeywords:[])];
  (Array.isArray(addKeywords)?addKeywords:[]).forEach(k=>{
    const raw=String(k||'').trim();
    if(!raw) return;
    const m=/^(.*?)(\d+)$/.exec(raw);
    if(m){
      const prefix=m[1],num=parseInt(m[2],10)||0;
      const idx=result.findIndex(rk=>{
        const rm=/^(.*?)(\d+)$/.exec(String(rk||''));
        return rm&&rm[1]===prefix;
      });
      if(idx>=0){
        const rm=/^(.*?)(\d+)$/.exec(String(result[idx]||''));
        result[idx]=`${prefix}${(parseInt(rm[2],10)||0)+num}`;
      }else{
        result.push(raw);
      }
    }else if(!result.includes(raw)){
      result.push(raw);
    }
  });
  return result;
}
// 街（村本体・その施設・祭壇）にいるか。ポータルの巻物の使用可否判定に使う。
function _isInVillageScene(){
  return !!(G._isShop||G._isItemShop||G._isForge||G._isTavern||G._isRingExchange||G._isVillageMenu||G._isWaveAltar||G._isLibrary);
}

function _canUseItemNow(card){
  if(!card||card._implemented===false||card._noItemEffectImpl||!panelMergeContentAvailable(card)) return false;
  const key=_itemEffectKey(card);
  if(['keyword_scroll','bond_scroll','shield_scroll','giant_scroll','inspire_flag','vision_scroll','transform_scroll','weakening_scroll'].includes(key)){
    const targets=_pickingCardLocations().filter(at=>_isItemUseTarget(at,{key,card}));
    return targets.length>=(['transform_scroll','weakening_scroll'].includes(key)?2:1);
  }
  if(key==='sacrifice_doll'||key==='mana_scroll') return true;

  if(key==='meteor_scroll') return true;
  // ポータルの巻物は「直前の村へワープする」アイテムなので、街（村・その施設）にいる間は使えない。
  // **行き先はウェーブ進行（旅の進捗）の街マス。** 以前は G.worldMap があることを
  // 条件にしていたが、ワールドマップは開かないと作られないため、通常の進行では
  // ずっと押せないままだった。
  if(key==='portal_scroll') return !_isInVillageScene()
    && !!(typeof _wavePreviousVillage==='function'&&_wavePreviousVillage());
  return true;
}
// アイテム使用中、そのスロットが対象になり得るか。
// アイテム未使用時は常にtrue（通常操作を妨げない）。
// カードが既にそのキーワードを持っているか（付与系アイテムの対象外判定に使う）。
function _cardHasKeyword(card,kw){
  return [
    ...(Array.isArray(card&&card.keywords)?card.keywords:[]),
    ...(Array.isArray(card&&card.adjacentKeywords)?card.adjacentKeywords:[]),
  ].some(k=>String(k||'').trim()===kw);
}
// 所持キーワードは戦闘と同じ接続入力・本文をコアへ渡して調べる。カード本体へは書き戻さない。
function _itemTargetHasKeyword(at,keyword){
  if(coreShieldValueFromKeyword(keyword)) keyword='結界';
  const card=at.card,owner=at.zone==='board'?_getPartyBoardUnit():null;
  const enh=owner?_collectAdjacentEnhancements(owner,at.index):null;
  const unit={...card,keywords:[...(card.keywords||[]),...(card.adjacentKeywords||[]),...(enh?.keywords||[])],
    _adjacentPanelAbilities:[...(card._adjacentPanelAbilities||[]),...(enh?.abilities||[])],
    _adjacentPanelEffectTexts:[...(card._adjacentPanelEffectTexts||[]),...(enh?.effectTexts||[])]};
  if(coreUnitHasKeyword(unit,keyword)) return true;
  // 上位の三段攻撃／全体攻撃により無効になる付与も、コアの正規化で判定する。
  if(!coreUnitKeywords({...unit,keywords:[...unit.keywords,keyword]}).includes(keyword)) return true;
  // コアの本文推定に含まれない語も、自身が持つと明記されたもの・単独のキーワード行は所持扱い。
  const escaped=keyword.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(?:このキャラクターは|(?:^|[\\n：:])\\s*)${escaped}(?:を(?:持つ|得る)|[。\\s]|$)`)
    .test(coreUnitEffectText(unit));
}
// 対象として選べるスロットか。**選べないカードは暗くして押しても何も起きない。**
// エンチャントは「キャラクターを選ぶアイテム」の対象にならないので、
// _isBoardCharacterCard() で一律に落とす（個別のアイテムごとに書かない）。
function _itemGrantedKeyword(card){
  const match=/^対象のキャラクターに(.+?)を与える。?$/.exec(String(card&&card.desc||'').trim());
  return match?match[1].trim():'';
}
// 魔導板・報酬・店の商品は同じ場所情報で扱う。カードの実体も覚え、描き直しで別の品を選ばない。
function _pickingLocation(zone,index){
  return {zone,index,card:(zone==='board'?_mainBoardCards():typeof _rewCards!=='undefined'?_rewCards:[])[index]};
}
function _pickingLocationCurrent(at){ return !!at&&_pickingLocation(at.zone,at.index).card===at.card; }
function _pickingCardLocations(){
  return ['board','reward'].flatMap(zone=>(zone==='board'?_mainBoardCards():typeof _rewCards!=='undefined'?_rewCards:[])
    .map((card,index)=>({zone,index,card})).filter(at=>at.card));
}
function _pickingOfferCardAllowed(card){
  return !!card&&!card._npcCard&&!card._npcDeployOnly&&!card._questOfferCard
    &&!card._questTransportId&&!card._shopSalePending;
}
function _targetPickingActive(){
  return !!(G&&(G._pendingItemUse||(typeof _pendingCardActivation!=='undefined'&&_pendingCardActivation)));
}
function _pickingTargetElement(at){
  if(typeof document==='undefined'||!at) return null;
  return at.zone==='board'?(typeof getBoardSlotElement==='function'?getBoardSlotElement(at.index)
    :document.querySelector(`#hand-slots [data-board-idx="${at.index}"]`))
    :document.querySelector(`#reward-offer-row [data-merge-rew-idx="${at.index}"]`);
}
function _replacePickingCard(at,next){
  // 品の値段・無料取得の印は変身前から引き継ぐ。別のカードへの変身では配置の同一性を失う。
  delete next._placeKey;
  for(const key of ['_activationReady','_battleEndCount','_buyPrice','_shopBuy','_isOriginalReward',
    '_rewardReturnCard','_rewardReturnIdx','_rewardReturnPhaseId','_temporaryRewardAreaCard','_itemBuffed',
    '_rewardGrowthApplied','_goldenRingViewed']){
    if(Object.prototype.hasOwnProperty.call(at.card,key)) next[key]=at.card[key];
    else delete next[key];
  }
  (at.zone==='board'?_mainBoardCards():_rewCards)[at.index]=next;
  return {...at,card:next};
}
// 描画する場所によらず、発生元・1枚目・対象外の印とクリックを1か所で決める。
function _wireTargetPickingCard(element,zone,index,card){
  if(!_targetPickingActive()) return false;
  const at={zone,index,card}, item=G._pendingItemUse;
  const activation=typeof _pendingCardActivation!=='undefined'?_pendingCardActivation:null;
  const source=!!(activation&&zone==='board'&&activation.index===index&&activation.card===card);
  const first=(item||activation)?.firstTarget;
  const selected=!!(first&&first.zone===zone&&first.index===index&&first.card===card);
  const allowed=source||selected||(item?_isItemUseTarget(at):_cardActivationTargetable(at));
  element.classList.toggle('picking-source',source);
  _setPickingCardState(element,allowed,selected);
  element.classList.toggle('card-activation-target',!!activation&&allowed&&!source);
  element.draggable=false;
  element.onclick=e=>{
    e.stopPropagation();
    if(!allowed) return;
    if(item) _handlePendingItemAt(at);
    else if(source) cancelCardActivation();
    else _handleCardActivationAt(at);
  };
  return true;
}
function _setPickingCardState(element,allowed,selected){
  element.classList.toggle('picking-first',selected);
  element.classList.toggle('item-target-ok',allowed);
  element.classList.toggle('item-target-disabled',!allowed);
  // 出撃可否による暗転は対象選びには使わない。HP0・通常マス上・刻印付きでも効果の対象にはできる。
  if(allowed) element.classList.remove('invalid-battle-position','board-hp-zero');
}
function _isItemUseTarget(at,pending=G._pendingItemUse){
  if(!pending) return true;
  const card=at&&at.card;
  if(!card||at.zone==='reward'&&(!/対象の/.test(pending.card?.desc||'')||!_pickingOfferCardAllowed(card))) return false;
  if(pending.firstTarget&&!_pickingLocationCurrent(pending.firstTarget)) return false;
  const key=pending.key;
  if(!_isBoardCharacterCard(card)) return false;
  // 付与系は**既に同じキーワードを持つキャラクターを対象にできない**（無駄になるため）。
  if(['inspire_flag','vision_scroll','shield_scroll','keyword_scroll'].includes(key)){
    const keyword=_itemGrantedKeyword(pending.card)||({inspire_flag:'根性',vision_scroll:'復活',shield_scroll:'結界'})[key];
    if(!keyword) return false;
    const counted=/^(\D+?)(\d+)$/.exec(keyword);
    const additive=counted&&!coreShieldValueFromKeyword(keyword)
      &&coreKeywordSum({keywords:[keyword]},counted[1],true)>0;
    return !!additive||!_itemTargetHasKeyword(at,keyword);
  }
  if(key==='bond_scroll'){
    return (Number(card.directionCount)||0)<4 && ['up','right','down','left'].some(direction=>!(card.directions||[]).includes(direction));
  }
  return true;
}
function _isItemUseTargetSlot(slotIdx,pending=G._pendingItemUse){
  return _isItemUseTarget(_pickingLocation('board',slotIdx),pending);
}

function _refreshTargetPicking(){
  _syncItemUsePickingUi();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof _syncRewardProductionItems==='function') _syncRewardProductionItems();
}
// 1枚目では効果を適用しないので、キャンセル時にカードの実体を置き直す必要はない。
function _cancelPendingItemUse(silent){
  const pending=G._pendingItemUse;
  if(!pending) return false;
  G._pendingItemUse=null; _refreshTargetPicking();
  if(typeof updateHUD==='function') updateHUD();
  return true;
}
function _cancelTargetPicking(){
  if(G&&G._pendingItemUse) _cancelPendingItemUse();
  else if(typeof cancelCardActivation==='function') cancelCardActivation();
}
function _targetPickingInputAllowed(target){
  if(!target?.closest) return false;
  // 説明枠そのものは許可しても、その中の「使う」「捨てる」等は別操作にしない。
  const button=target.closest('button,[role="button"],input[type="button"],input[type="submit"],.reward-action-btn');
  if(button&&!button.matches('.item-target-ok,.picking-source,.picking-first')) return false;
  return !!target.closest('.item-target-ok,.picking-source,.picking-first,#kw-tooltip,#keyword-tooltip');
}

// 右クリック／Escでも対象選択を中断できるようにする（1度だけ登録）。
if(!window._itemUseCancelBound){
  window._itemUseCancelBound=true;
  document.addEventListener('contextmenu',e=>{
    if(!_targetPickingActive()) return;
    e.preventDefault();
    // **ここで他の右クリック処理へ渡さない。** 渡すと reward.js 側の
    // 「カード非表示」の切り替えまで走ってしまう（対象選択中は切り替えさせない）。
    e.stopImmediatePropagation();
    _cancelTargetPicking();
  },true);
  document.addEventListener('pointerdown',e=>{
    if(!_targetPickingActive()) return;
    // 解除はcontextmenuで1回だけ行う。先に解除すると通常の右クリックへ漏れてカードが隠れる。
    if(e.button===2){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if(e.button!==0) return;
    if(_targetPickingInputAllowed(e.target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
  },true);
  document.addEventListener('click',e=>{
    if(!_targetPickingActive()||_targetPickingInputAllowed(e.target)) return;
    e.preventDefault(); e.stopImmediatePropagation();
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!_targetPickingActive()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    _cancelTargetPicking();
  },true);
  // **対象選択中はドラッグを一切させない。**
  // カードを掴んだまま対象を選ぶと、移動と使用が同時に走って盤面が壊れる。
  // dragstart は各カードへ個別に登録されているため、documentのキャプチャで
  // 手前から止める（stopImmediatePropagationで後続の登録にも渡さない）。
  document.addEventListener('dragstart',e=>{
    if(!_targetPickingActive()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
}

// ── 対象を選ぶアイテム・起動の共通表示 ───────────────────────────
function _syncItemUsePickingUi(){
  if(typeof document==='undefined'||!document.body) return;
  const body=document.body, item=!!(G&&G._pendingItemUse);
  const activation=!!(G&&G.phase==='reward'&&typeof _pendingCardActivation!=='undefined'&&_pendingCardActivation);
  body.classList.toggle('item-use-picking',item);
  body.classList.toggle('activation-picking',activation);
  body.classList.toggle('activation-picking-item',activation&&_cardActivationTargetsItem());
  // 対象が見える状態に戻し、キャンセル後も表示を維持する。
  if((item||activation)&&body.classList.contains('right-card-peek')){
    body.classList.remove('right-card-peek');
    if(typeof _syncBoardCardVisibilityToggle==='function') _syncBoardCardVisibilityToggle();
  }
}
function _beginBoardItemUse(idx,card){
  if(!card||card._implemented===false||card._noItemEffectImpl||!panelMergeContentAvailable(card)) return false;
  if(typeof _pendingCardActivation!=='undefined') _pendingCardActivation=null;
  if(typeof blessingFlameCancel==='function') blessingFlameCancel();
  if(_ringOfferSelectionActive()) _clearRingOfferSelection();
  G._pendingItemUse={slotIdx:idx,key:_itemEffectKey(card),card:clone(card)};
  _refreshTargetPicking();
}
function _useImmediateItem(idx,card){
  const key=_itemEffectKey(card);
  if(!_canUseItemNow(card)){ ; return false; }
  if(key==='silence_scroll'){
    G.pendingBattleItems=Array.isArray(G.pendingBattleItems)?G.pendingBattleItems:[];
    G.nextBattleItems=Array.isArray(G.nextBattleItems)?G.nextBattleItems:[];
    const useCard=clone(card);
    useCard.itemEffectKey='silence_scroll';
    useCard._itemUseInstanceId=`item-use-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    G.pendingBattleItems.push(clone(useCard));
    G.nextBattleItems.push(clone(useCard));
    _consumeItemSlot(idx);
    return true;
  }
  if(key==='golden_scroll'){
    G.gold=Math.floor((G.gold||0)*2);
    _consumeItemSlot(idx);
    return true;
  }
  if(key==='jade_vase'){
    const gain=typeof onGoldGained==='function'?onGoldGained(200):200;
    if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
    _consumeItemSlot(idx);
    return true;
  }
  if(key==='golden_vase'){
    const gain=typeof onGoldGained==='function'?onGoldGained(300):300;
    if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
    _consumeItemSlot(idx);
    return true;
  }
  if(key==='mana_scroll'){
    const count=String(card.desc||'').match(/再抽選が(\d+)回/);
    if(!count) return false;
    towerBoonState().rerolls+=Number(count[1]);
    _consumeItemSlot(idx); return true;
  }
  if(key==='sacrifice_doll'||key==='dragon_scroll'){
    G.pendingBattleItems=G.pendingBattleItems||[]; G.nextBattleItems=G.nextBattleItems||[];
    const item=clone(card); item._itemUseInstanceId=uid();
    G.pendingBattleItems.push(clone(item)); G.nextBattleItems.push(clone(item));
    _consumeItemSlot(idx); return true;
  }
  if(key==='vision_scroll'){
    _beginBoardItemUse(idx,card);
    _closeItemUseConfirm();
    return true;
  }
  if(key==='meteor_scroll'){
    G.pendingBattleItems=Array.isArray(G.pendingBattleItems)?G.pendingBattleItems:[];
    G.nextBattleItems=Array.isArray(G.nextBattleItems)?G.nextBattleItems:[];
    const useCard=clone(card);
    useCard.itemEffectKey='meteor_scroll';
    useCard._itemUseInstanceId=`item-use-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    G.pendingBattleItems.push(clone(useCard));
    G.nextBattleItems.push(clone(useCard));
    _consumeItemSlot(idx);
    return true;
  }
  if(key==='portal_scroll'){
    G._pendingMapItemUse={slotIdx:idx,key,card:clone(card)};
    // ウェーブ進行の街マスへ戻る（実装は main.js が唯一の置き場）。
    if(typeof warpToPreviousWaveVillage==='function'&&warpToPreviousWaveVillage()) return true;
    G._pendingMapItemUse=null;
    return false;
  }
  _beginBoardItemUse(idx,card);
  _closeItemUseConfirm();
  return true;
}
function handlePendingItemBoardTarget(slotIdx){
  return _handlePendingItemAt(_pickingLocation('board',slotIdx));
}
function handlePendingItemRewardTarget(index){
  return _handlePendingItemAt(_pickingLocation('reward',index));
}
// 完了時に変更した品を確定する。無料取得の印・価格・在庫位置には触れない。
function _finishPendingItemUse(pending,targets,vfxAt=targets,options){
  targets.forEach(at=>{if(_pickingLocationCurrent(at)) at.card._itemBuffed=true;});
  if(targets.some(at=>at.zone==='reward')&&typeof _persistCurrentShopStock==='function') _persistCurrentShopStock();
  G._pendingItemUse=null; _syncItemUsePickingUi();
  _consumeItemSlot(pending.slotIdx);
  const vfxTargets=Array.isArray(vfxAt)?vfxAt:[vfxAt];
  vfxTargets.forEach(at=>{if(at) _playItemUseVfx(pending.key,at.index,pending.card,{...options,zone:at.zone});});
  return true;
}
// 巻物などを魔導板のキャラクターに使った時の演出（2026-10-17 新規。見た目は js/vfx/defs/additions_1017.js）。
// 効果の適用・保存には関わらない。素材が無い時・描画できない時は何もしない。
// 2026-10-18 利用者指定：盾の巻物と幻視の巻物の演出を入れ替える（盾＝光輪と光の柱、幻視＝結晶片の結界）。
// 対応表は present.js の PRESENT_ITEM_USE_FX（アイテムの番号で引く。LABも同じ表を読む）。
// itemCard：使ったアイテム（番号で演出を引く。キーワードの巻物は同じ itemEffectKey が9種あり、key だけでは毒牙の巻物になっていた。2026-10-26）。
// options.revealDirs：演出が終わってから出す魔導板のポート（絆の巻物。演出の後にフェードで出す。2026-10-26 利用者指定）。
// options.zone：対象の場所（board／reward。店の商品もreward）。
function _playItemUseVfx(key,slotIdx,itemCard,options){
  const def=itemCard&&itemCard.no!=null?itemCard:typeof ITEM_POOL!=='undefined'?ITEM_POOL.find(i=>i.itemEffectKey===key):null;
  const name=def&&typeof PRESENT_ITEM_USE_FX!=='undefined'?PRESENT_ITEM_USE_FX['I'+String(def.no).padStart(3,'0')]:'';
  if(!name||typeof VbFx==='undefined'||!VbFx.effects.some(d=>d.name===name)) return;
  const el=_pickingTargetElement({zone:options&&options.zone||'board',index:slotIdx});
  if(!el||!el.isConnected) return;
  if(typeof _vfxClipLayer==='function') VbFx.settings.layer=_vfxClipLayer;
  const ports=((options&&options.revealDirs)||[]).map(d=>el.querySelector('.panel-dir-'+d)).filter(Boolean);
  ports.forEach(port=>{port.style.opacity='0';});
  VbFx.play(name,{source:el,targets:[el],speed:1,seed:53,dir:1}).catch(()=>{}).finally(()=>{
    // 新しいポートは演出の後に0.4秒で出す（その間に描き直されていれば、新しい要素はそのまま見えている）。
    ports.forEach(port=>{if(!port.isConnected)return;const a=port.animate?.([{opacity:0},{opacity:1}],{duration:400,easing:'ease-out'});
      if(a)a.finished.catch(()=>{}).finally(()=>{port.style.opacity='';});else port.style.opacity='';});
  });
  // SEは巻物ごと（2026-10-26 利用者指定「アイテムにもSEを」。以前は5種で共通）。山場を演出の山場へ合わせる。無い巻物は共通音。
  const sfxKey=typeof presentItemUseSfxKey==='function'?presentItemUseSfxKey('I'+String(def.no).padStart(3,'0')):'itemScroll';
  if(sfxKey!=='itemScroll'&&typeof _playSfxAtVfxCue==='function'&&VbFx.impactMs) _playSfxAtVfxCue(sfxKey,VbFx.impactMs(name,1),{group:'magic',guardKey:`item-use:${name}`,guardMs:120,maxPlayMs:0});
  else if(typeof playSfx==='function') playSfx('itemScroll',{group:'magic',guardKey:`item-use:${name}`,guardMs:120,maxPlayMs:0});
}
// 対象を選ばないアイテム（黄金の巻物・次の戦闘で効く巻物）は使った瞬間にアイテムの枠から、ポータルは画面全体に演出を出す（2026-10-26 利用者指定）。
// 対象を選ぶアイテムは、対象を選んだ時に _playItemUseVfx が出す。
function _useImmediateItemWithFx(idx,card,confirmed=false){
  if(!confirmed&&_itemEffectKey(card)==='portal_scroll'&&_hasUnclaimedBattleReward()){
    _confirmUnclaimedBattleReward(()=>{
      if(_ensureItemSlots()[idx]===card) _useImmediateItemWithFx(idx,card,true);
    });
    return false;
  }
  const def=typeof ITEM_POOL!=='undefined'?ITEM_POOL.find(i=>i.itemEffectKey===_itemEffectKey(card)):null;
  const no=def&&def.no!=null?'I'+String(def.no).padStart(3,'0'):'';
  const slot=document.querySelectorAll('.reward-prod-item .reward-prod-slots i')[idx];
  const rect=slot&&slot.getBoundingClientRect();
  const used=_useImmediateItem(idx,card);
  if(used&&!G._pendingItemUse) _playItemSlotVfx(no,rect);
  return used;
}
function _playItemSlotVfx(no,rect){
  const screenFx=typeof PRESENT_ITEM_SCREEN_FX!=='undefined'&&PRESENT_ITEM_SCREEN_FX.has(no);
  if(!screenFx&&!(typeof PRESENT_ITEM_SLOT_FX!=='undefined'&&PRESENT_ITEM_SLOT_FX.has(no))) return;
  const name=typeof PRESENT_ITEM_USE_FX!=='undefined'?PRESENT_ITEM_USE_FX[no]:'';
  if(!name||typeof VbFx==='undefined'||!VbFx.effects.some(d=>d.name===name)) return;
  const r=screenFx?{left:0,top:0,width:window.innerWidth,height:window.innerHeight}:rect;
  if(!r||!(r.width>0)) return;
  // 使ったアイテムは枠から消えているので、元の位置（ポータルは画面全体）に見えない目印を置いて発生元にする。
  const anchor=document.createElement('div');
  Object.assign(anchor.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',pointerEvents:'none',opacity:'0'});
  document.body.appendChild(anchor);
  if(!screenFx&&typeof _vfxClipLayer==='function') VbFx.settings.layer=_vfxClipLayer;
  VbFx.play(name,{source:anchor,targets:[anchor],speed:1,seed:53,dir:1}).catch(()=>{}).finally(()=>anchor.remove());
  const sfxKey=typeof presentItemUseSfxKey==='function'?presentItemUseSfxKey(no):'itemScroll';
  if(sfxKey!=='itemScroll'&&typeof _playSfxAtVfxCue==='function'&&VbFx.impactMs) _playSfxAtVfxCue(sfxKey,VbFx.impactMs(name,1),{group:'magic',guardKey:`item-use:${name}`,guardMs:120,maxPlayMs:0});
  else if(typeof playSfx==='function') playSfx('itemScroll',{group:'magic',guardKey:`item-use:${name}`,guardMs:120,maxPlayMs:0});
}
function _handlePendingItemBoardTarget(slotIdx){ return handlePendingItemBoardTarget(slotIdx); }
function _handlePendingItemAt(at){
  const pending=G._pendingItemUse;
  const quest=pending&&typeof questRequiredEntryOnBoard==='function'?questRequiredEntryOnBoard():null;
  const handled=_applyPendingItemAt(at);
  // 変身で必須カードが失われる場合も、従来のクエストの出口へ返す。
  if(pending&&!G._pendingItemUse&&quest&&typeof questRequiredCardGone==='function'&&questRequiredCardGone(quest)
    &&typeof questOnRequiredCardDestroyed==='function') questOnRequiredCardDestroyed(quest);
  return handled;
}
function _applyPendingItemAt(at){
  const pending=G._pendingItemUse;
  if(!pending) return false;
  const key=pending.key;
  // 旧セーブに対象選択が残っていても、改訂前の破壊・値減少は実行しない。
  if(key==='sacrifice_doll'||key==='mana_scroll'){_cancelPendingItemUse(true);return true;}
  if(!_pickingLocationCurrent(at)||!_isItemUseTarget(at,pending)) return true;
  const card=at.card, pair=['transform_scroll','weakening_scroll'].includes(key);
  if(pair){
    if(pending.firstTarget?.card===card){
      delete pending.firstTarget; delete pending.firstIdx; _refreshTargetPicking(); return true;
    }
    if(!pending.firstTarget){
      pending.firstTarget=at;
      if(at.zone==='board') pending.firstIdx=at.index;
      _refreshTargetPicking(); return true;
    }
  }
  const first=pending.firstTarget;
  if(key==='transform_scroll'){
    const previous=first.card, next=makePanel(card.id);
    if(!next) return true;
    next.power=previous.power; next.life=previous.life;
    const replaced=_replacePickingCard(first,next);
    return _finishPendingItemUse(pending,[replaced],replaced);
  }
  if(key==='weakening_scroll'){
    [first.card.power,card.power]=[card.power,first.card.power];
    [first.card.life,card.life]=[card.life,first.card.life];
    // 魂交換は、魔導板・報酬・商品をまたいでも入れ替えた2枚の両方に演出を出す。
    return _finishPendingItemUse(pending,[first,at]);
  }
  const vfxOptions={};
  if(key==='keyword_scroll'){
    const keyword=_itemGrantedKeyword(pending.card);
    card.keywords=_mergeCardKeywordsForBond([], [...(card.keywords||[]),keyword]);
    const counted=/^(.*?)(\d+)$/.exec(keyword);
    if(counted) card._itemKeywordBonuses={...(card._itemKeywordBonuses||{}),
      [counted[1]]:(Number(card._itemKeywordBonuses&&card._itemKeywordBonuses[counted[1]])||0)+Number(counted[2])};
  }else if(key==='shield_scroll'){
    card.keywords=[...(card.keywords||[]).filter(k=>!coreShieldValueFromKeyword(k)),'結界'];
  }else if(key==='giant_scroll'){
    const match=String(pending.card.desc||'').match(/ATKとHPを([0-9.]+)倍/);
    if(!match) return true;
    card.power=Math.ceil((Number(card.power)||0)*Number(match[1])); card.life=Math.ceil((Number(card.life)||0)*Number(match[1]));
  }else if(key==='inspire_flag'||key==='vision_scroll'){
    const keyword=key==='inspire_flag'?'根性':'復活';
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    if(!card.keywords.includes(keyword)) card.keywords.push(keyword);
  }else if(key==='bond_scroll'){
    const available=['up','right','down','left'].filter(direction=>!(card.directions||[]).includes(direction));
    const count=String(pending.card&&pending.card.desc||'').match(/ポートを(\d+)つ追加/);
    if(!count) return true;
    card.directions=Array.isArray(card.directions)?card.directions.slice():[];
    const added=[];
    for(let i=0;i<Number(count[1])&&available.length;i++){
      const index=Math.floor(rand()*available.length);
      added.push(available.splice(index,1)[0]);card.directions.push(added[added.length-1]);
    }
    card.directionCount=card.directions.length;
    vfxOptions.revealDirs=added;
  }else return false;
  return _finishPendingItemUse(pending,[at],at,vfxOptions);
}
function _openItemUseConfirm(idx,anchor){
  const slots=_ensureItemSlots();
  const card=slots[idx];
  if(!card||G.phase!=='reward') return;
  // **同じアイテムの吹き出しが既に出ていれば作り直さない。**
  // 押すたびに remove→append していたため、連打するとボタンが消えては出て
  // 明滅して見えた（使えないアイテムでは「使う」が一瞬明るく見える）。
  const tip=document.getElementById('kw-tooltip');
  if(tip?.dataset.rewardLocked==='1'
    &&tip.dataset.rewardAnchorKind==='item'
    &&String(tip.dataset.rewardSlotIdx)===String(idx)) return;
  const useUnavailable=!_canUseItemNow(card);
  _openRewardActionTooltip(anchor,card.name||'アイテム',_plainEffectTextForPreview(card),[
    {label:_uiLabel('「使う」ボタン','使う'),disabled:useUnavailable,onClick:()=>_useImmediateItemWithFx(idx,card)},
    {label:_uiLabel('「捨てる」ボタン','捨てる'),onClick:()=>{
      const current=_ensureItemSlots()[idx];
      if(current) _ensureItemSlots()[idx]=null;
      _closeItemUseConfirm();
      renderHandEditor(); updateHUD();
    }},
    {label:_uiLabel('「やめる」ボタン','やめる'),onClick:()=>{ _closeItemUseConfirm(); _cancelPendingItemUse(); }}
  ]);
  const lockedTip=document.getElementById('kw-tooltip');
  if(lockedTip) lockedTip.dataset.rewardSlotIdx=String(idx);
}
