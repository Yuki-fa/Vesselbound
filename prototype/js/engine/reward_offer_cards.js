// reward_offer_cards.js — 提示カード・指輪依頼の表示と祭壇の指輪提示・取得
// 2026-10-25 リファクタリング：reward.js から移した（処理は変えていない）。

// ── 祭壇・指輪依頼の提示：通常の報酬カードと同じ場所（#reward-offer-row）に表示する ──
// 暗い（未解放）間はホバーで説明のみ表示、明るくなったらドラッグで指輪置き場へ持っていく。
// 祭壇の提示枠の数（＝提示される指輪の数）。取得後に残す空枠の数もこれに合わせる。
const RING_OFFER_SLOT_COUNT=3;
function _ringOfferSlotCount(){
  const count=typeof questRingOfferSlotCount==='function'?Number(questRingOfferSlotCount()):RING_OFFER_SLOT_COUNT;
  return Math.max(1,Math.min(RING_OFFER_SLOT_COUNT,Number.isFinite(count)?Math.floor(count):RING_OFFER_SLOT_COUNT));
}
function _wireQuestRingReturnTarget(div){
  if(!(typeof questRingOfferActive==='function'&&questRingOfferActive())) return;
  div.classList.add('quest-ring-return-target');
  // 通常の取得済み枠は操作不能だが、クエスト中だけ提示位置へ戻すドロップ先として使う。
  div.style.setProperty('pointer-events','auto','important');
  div.addEventListener('dragover',event=>{
    const ring=_dragSrc&&_dragSrc.arr==='rings'&&Array.isArray(G.rings)?G.rings[_dragSrc.idx]:null;
    if(!(ring&&typeof questRingOfferCanReturn==='function'&&questRingOfferCanReturn(ring))) return;
    event.preventDefault();
    div.classList.add('drag-over');
  });
  div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
  div.addEventListener('drop',event=>{
    div.classList.remove('drag-over');
    const srcIdx=_dragSrc&&_dragSrc.arr==='rings'?_dragSrc.idx:-1;
    if(srcIdx<0||typeof questReturnRingOffer!=='function'||!questReturnRingOffer(srcIdx)) return;
    event.preventDefault();
    _dragSrc=null;
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
    updateHUD();
    renderRewCards();
    renderMoveSlotsInEnemy();
  });
}
// 指輪取得後の祭壇：他の指輪は消えて空の枠だけが残る。取得直後の1回だけ、
// 残っていた指輪をその場でフェードアウトさせる（再入場時は最初から枠だけ）。
function _renderRingOfferResolvedFrames(el){
  const fade=G._ringOfferFadeOut;
  G._ringOfferFadeOut=null;
  for(let i=0;i<_ringOfferSlotCount();i++){
    const div=document.createElement('div');
    div.classList.add('rew-card','ring-offer-card','ring-visual','ring-offer-spent');
    const fadingRing=fade&&i!==fade.taken?(fade.offer||[])[i]:null;
    if(fadingRing){
      const path=_rewardRingArtPath(fadingRing);
      if(path){
        div.classList.add('ring-visual-filled','ring-offer-fading');
        div.style.setProperty('--ring-art',`url("${path}")`);
      }
    }
    _wireQuestRingReturnTarget(div);
    el.appendChild(div);
  }
}
function _renderRingOfferCards(el){
  const unlocked=!!G._ringOfferUnlocked;
  if(G._ringOfferResolved){ _renderRingOfferResolvedFrames(el); return; }
  (G._ringOffer||[]).forEach((ring,idx)=>{
    if(!ring) return;
    // 指輪置き場（.ring-visual）と同じ見た目（ring_slot.pngの枠＋指輪アート）で表示する。
    // mkCardEl()の汎用カード絵柄解決はassets/art/rings/のパス規則を知らないため使わない。
    const div=document.createElement('div');
    div.classList.add('rew-card','ring-offer-card','ring-visual');
    if(typeof SaveProfile!=='undefined') SaveProfile.observe(div,ring);
    if(ring.rarity>=1&&ring.rarity<=5) div.classList.add(`rarity-${ring.rarity}`);
    const path=_rewardRingArtPath(ring);
    if(path){
      div.classList.add('ring-visual-filled');
      div.style.setProperty('--ring-art',`url("${path}")`);
    }
    const preview=[ring.name||'指輪',typeof ringDisplayDesc==='function'?ringDisplayDesc(ring):(ring.desc||'')].filter(Boolean).join('\n');
    div.setAttribute('data-preview',preview);
    if(!unlocked){
      div.classList.add('ring-offer-locked');
      div.style.cssText=(div.style.cssText||'')+';opacity:0.42;filter:grayscale(0.6) brightness(0.65);';
    }
    div.draggable=unlocked;
    if(unlocked){
      div.addEventListener('dragstart',e=>{
        _dragSrc={arr:'ringOffer',idx};
        if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); }
        _setDragZoneClass('dragzone-ring-offer');
        _createDragGhost(div);
        // _createDragGhost()はクローン後にstyle.cssTextを丸ごと上書きするため、
        // --ring-art（CSS変数）がゴースト側に残らず指輪の絵が表示されない。元要素から再設定する。
        if(_dragGhostDiv) _dragGhostDiv.style.setProperty('--ring-art',div.style.getPropertyValue('--ring-art'));
        div.classList.add('dragging');
      });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _dragSrc=null; });
    }
    el.appendChild(div);
  });
}

// ショップ／道具屋で購入済みになった枠。詰めずに同じ位置へ残し、中心に「売切」と出す。
// itemIdxを渡した場合は道具屋用（item_slot.svgの正方形＋上下互い違い配置）になる。
function _mkShopSoldOutDiv(itemIdx){
  const div=document.createElement('div');
  div.className='shop-sold-out';
  // 売切れ枠は見た目だけのプレースホルダーで、カードのドロップ先にはしない。
  ['dragover','drop'].forEach(type=>div.addEventListener(type,e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    div.classList.remove('drag-over');
  },true));
  if(itemIdx!=null){
    div.classList.add('shop-sold-out-item');
    // 上下の互い違いは生きたカード（item-shop-card-up/down・forge-card）と同じ対応にする。
    // 逆にすると、両端（下寄せ）の商品を買った時だけ枠が上へ動いて見える。
    div.classList.add(itemIdx%2===1?'shop-sold-out-item-up':'shop-sold-out-item-down');
  }
  const label=document.createElement('span');
  label.className='shop-sold-out-label';
  label.textContent=_uiLabel('ショップ「売切」表示','売切');
  div.appendChild(label);
  return div;
}

function _mkLibraryLoanedOutDiv(itemIdx){
  const div=document.createElement('div');
  div.className='shop-sold-out library-loaned-out';
  // ドロップ先の枠番号。貸出カードは掴んだ場所ではなく「落とした枠」へ戻す。
  if(Number.isInteger(itemIdx)) div.dataset.rewIdx=String(itemIdx);
  const label=document.createElement('span');
  label.className='shop-sold-out-label';
  label.textContent=_uiLabel('図書館「貸出中」表示','貸出中');
  div.appendChild(label);
  return div;
}

// 報酬カードと魔導板カードで、暗転時に透けて見える最背面を共通化する。
// カード枠・stat_overlay・絵とは別レイヤーにして、それぞれの積層規則へ干渉させない。
function _ensureCardBackLayer(cardEl){
  if(!cardEl||cardEl.querySelector(':scope > .card-back-layer')) return;
  const back=document.createElement('span');
  back.className='card-back-layer';
  back.setAttribute('aria-hidden','true');
  cardEl.insertBefore(back,cardEl.firstChild);
}

// 報酬カードの枠画像とプログラム枠線を分離する。
// 購入不可時は枠画像だけを暗くし、この線は通常の明るさを維持する。
function _ensureRewardCardLineLayer(cardEl){
  if(!cardEl||cardEl.matches('.item-visual,.ring-visual,.forge-card')||
    cardEl.querySelector(':scope > .reward-card-line-layer')) return;
  const line=document.createElement('span');
  line.className='reward-card-line-layer';
  line.setAttribute('aria-hidden','true');
  cardEl.appendChild(line);
}
function _ensureRewardCardDimLayer(cardEl){
  if(!cardEl||!cardEl.matches('.cant,.reward-used-dim')||
    cardEl.querySelector(':scope > .reward-card-dim-layer')) return;
  const dim=document.createElement('span');
  dim.className='reward-card-dim-layer';
  dim.setAttribute('aria-hidden','true');
  cardEl.appendChild(dim);
}

function _mkRewDiv(card, onBuy, rewIdx){
  const exchange=_isCardExchangeShop();
  const isPendingSale=!exchange&&!!card._shopSalePending&&(_isItemCard(card)||_cardTradingRules().sellCards);
  const cost=Math.max(0,(card._buyPrice??1));
  const canBuy=exchange||!isPendingSale&&(!G._isRewardTown||G._freeRewardPanelMode||cost===0||G.gold>=cost);
  const isLegend=!!card._isLegend;
  const div=typeof mkCardEl==='function'?mkCardEl(card,rewIdx??-1,'reward'):document.createElement('div');
  div.classList.add('rew-card');
  if(typeof SaveProfile!=='undefined') SaveProfile.observe(div,card);
  // 盤面が変わった後に「取ると合体」を付け直せるよう、対応する提示カードの位置を残す。
  if(Number.isInteger(rewIdx)&&rewIdx>=0) div.dataset.mergeRewIdx=String(rewIdx);
  if(exchange&&Number.isInteger(rewIdx)&&rewIdx>=0){
    div.addEventListener('dragover',e=>{
      if(!_exchangeShopOfferDropAllowedAt(rewIdx)) return;
      e.preventDefault();div.classList.add('drag-over');
    });
    div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
    div.addEventListener('drop',e=>{
      if(!_exchangeShopOfferDropAllowedAt(rewIdx)) return;
      e.preventDefault();e.stopPropagation();
      const boardIdx=_dragSrc.idx;_dragSrc=null;
      _clearExchangeShopDropHints();_removeDragGhost();_clearDragZoneClass();
      exchangeShopCard(rewIdx,boardIdx);
    });
  }
  if(_rewardMergeCandidate(rewIdx,card)) div.classList.add('merge-ready');
  if(card.rarity>=1&&card.rarity<=5) div.classList.add(`rarity-${card.rarity}`);
  // 戦闘報酬で最初から置かれていたカード（レア度2以上）は、取得するまで枠をめくり演出と同じ色で光らせる。
  // 色はCSS（.reward-rarity-glow）。ホバー中はホバーの光を優先する。
  if(card._isOriginalReward&&!G._isShop&&!G._isItemShop&&_rewardRevealRarity(card)>=2) div.classList.add('reward-rarity-glow');
  if(!canBuy&&!isPendingSale) div.classList.add('cant');
  if(isLegend) div.classList.add('legend');
  if(typeof applyCardVisual==='function'){
    applyCardVisual(div,card);
  } else if(typeof getCardAsset==='function'&&typeof assetUrl==='function'){
    div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
  }
  if((card.type==='ring'||_isItemCard(card))&&typeof _auxiliaryKeywordPreviewText==='function'){
    const keywordPreview=_auxiliaryKeywordPreviewText(card,card.desc||'');
    if(keywordPreview) div.setAttribute('data-keyword-preview',keywordPreview);
  }

  // 価格バッジはショップかつ価格1以上の場合のみ。無料報酬（cost===0）ではDOM自体を作らない
  const showPriceBadge=!!G._isShop&&!exchange&&cost>0&&!isPendingSale;
  if(showPriceBadge){
    // ショップ価格は丸囲み数字／括弧表示を使わず、売却価格と同じ価格枠で表示する。
    div.querySelector('.card-badge')?.remove();
    let badge=div.querySelector('.shop-buy-price');
    if(!badge){
      badge=document.createElement('span');
      badge.className='shop-buy-price';
      div.appendChild(badge);
    }
    badge.textContent=`${cost}G`;
  } else {
    div.querySelector('.card-badge')?.remove();
    div.querySelector('.shop-buy-price')?.remove();
  }
  if(G._isRewardTown&&!exchange&&!isPendingSale&&!canBuy){
    const shortBadgeItem=document.createElement('div');
    shortBadgeItem.className='shop-insufficient-badge';
    shortBadgeItem.textContent=_uiLabel('ショップ「ゴールド不足」表示','ゴールド不足');
    div.appendChild(shortBadgeItem);
  }
  if(isPendingSale){
    const sale=document.createElement('div');
    sale.className='shop-pending-sale-ui';
    // 表示は実際の入金（onGoldGained＝指輪の倍率込み）と同じ額にする。
    const pendingBase=Number(card._sellDisplayPrice??_shopCardSellGain(card))||0;
    const pendingShown=typeof goldIncomeAmount==='function'?goldIncomeAmount(pendingBase):pendingBase;
    sale.innerHTML=`<button type="button" class="shop-board-sell-value shop-board-sell-action" data-sfx-silent="1">+${pendingShown}G</button>`;
    _bindPendingShopCardSale(sale,rewIdx);
    div.appendChild(sale);
    // 売却待ちカードはクリックでも魔導板へ戻せるようにする（売却ボタン以外の領域）。
    if(typeof onBuy==='function') div.onclick=onBuy;
  }else if(canBuy&&!exchange&&(G._isShop||G._isTavern)) div.onclick=onBuy;
  // 破壊の起動（ヘルナイト）を選んでいる間は、報酬枠のキャラクターも対象にできる（2026-10-23 利用者指定）。
  if(rewIdx!=null&&typeof cardActivationRewardTargetable==='function'&&cardActivationRewardTargetable(card)){
    div.classList.add('card-activation-target');
    div.onclick=e=>{ e.stopPropagation(); handleCardActivationRewardTarget(rewIdx); };
  }
  _appendLibraryLoanBadge(div);
  if(rewIdx!=null){
    // 売却待ち（魔導板から販売枠へ戻した手持ちカード）は購入対象ではないので canBuy=false になるが、
    // 自分のカードなので魔導板へ戻せる必要がある。ショップの購入不可ロックから除外する。
    const _rewardDragLocked=!!G._pendingPanelPlacement||(_rewFreePickDone&&!!card._isOriginalReward&&G._rewardOnePickMode)||(G._isShop&&!canBuy&&!isPendingSale);
    div.draggable=!_rewardDragLocked;
    if(_rewardDragLocked) div.classList.add('reward-drag-locked');
    div.addEventListener('dragstart',e=>{
      if(_rewardDragLocked){
        e.preventDefault();
        return;
      }
      if(_libraryTutorialIsMoveStep()&&!_libraryTutorialAllowsMove(card,null)){ e.preventDefault(); return; }
      _dragSrc={arr:'rew',idx:rewIdx};
          e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setDragImage(_transparentDragImg,0,0);
      _setDragZoneClass(_rewardDragZoneForCard(card));
      _createDragGhost(div);
      if(_dragGhostDiv){
        const ringArt=div.style.getPropertyValue('--ring-art');
        if(ringArt) _dragGhostDiv.style.setProperty('--ring-art',ringArt);
        const cardArt=div.style.getPropertyValue('--card-art');
        if(cardArt) _dragGhostDiv.style.setProperty('--card-art',cardArt);
        const itemArt=div.style.getPropertyValue('--item-art');
        if(itemArt) _dragGhostDiv.style.setProperty('--item-art',itemArt);
      }
      div.classList.add('dragging');
      _hideDragSourceParts(div);
    });
    div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    div.addEventListener('dragend',()=>{ _restoreDragSourceParts(div); div.classList.remove('dragging'); _removeDragGhost(); _clearDragZoneClass(); _dragSrc=null; });
  }
  _ensureCardBackLayer(div);
  _ensureRewardCardLineLayer(div);
  _ensureRewardCardDimLayer(div);
  return div;
}

function _appendLibraryLoanBadge(div){
  if(!div||!G||!G._isLibrary) return;
  div.querySelectorAll('.shop-board-sell-value,.shop-pending-sale-ui').forEach(el=>el.remove());
  const badge=document.createElement('div');
  badge.className='shop-board-sell-value library-loan-badge';
  badge.textContent=_uiLabel('図書館「貸出」表示','貸出');
  div.appendChild(badge);
}

function _libraryLoanOriginalSlot(card){
  const marked=Number(card&&card._libraryLoanSlot);
  if(Number.isInteger(marked)&&marked>=0&&marked<REWARD_GRID_CAPACITY) return marked;
  // 位置情報を持たない旧セーブは、入館時の貸出一覧から同じカードの空き枠を補う。
  const initial=Array.isArray(G&&G._libraryLoanInitialCards)?G._libraryLoanInitialCards:[];
  const same=(a,b)=>!!a&&!!b&&(
    (a.id&&b.id&&String(a.id)===String(b.id))
    ||String(a.name||'')===String(b.name||'')
  );
  return initial.findIndex((entry,index)=>same(entry,card)&&!(_rewCards&&_rewCards[index]));
}
function _returnLibraryLoanCard(boardIdx,card){
  if(!G||!G._isLibrary||!card||!card._libraryLoan) return false;
  const slotIdx=_libraryLoanOriginalSlot(card);
  if(slotIdx<0||(_rewCards&&_rewCards[slotIdx])) return false;
  const unit=_getPartyBoardUnit();
  if(!unit) return false;
  const boardList=_normalizeUnitBoardCards(unit);
  if(!boardList[boardIdx]) return false;
  const returned=clone(card);
  returned._libraryLoan=true;
  returned._libraryLoanSlot=slotIdx;
  returned._isOriginalReward=false;
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
  boardList[boardIdx]=null;
  unit.boardCards=boardList;
  _rewCards[slotIdx]=returned;
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(typeof playSfx==='function') playSfx('return',{group:'ui'});
  renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderMoveSlotsInEnemy();
  if(typeof updateHUD==='function') updateHUD();
  return true;
}

function _bindPendingShopCardSale(sale,rewIdx){
  const action=sale?.querySelector('.shop-board-sell-action');
  if(action) action.onclick=ev=>{ ev.stopPropagation(); _sellPendingShopCard(rewIdx); };
}

// ── カード購入処理 ──────────────────────────────

function _playRewardAcquireSfx(file){
  // 音量はaudio.jsのFILE_SFX_VOLUMESで一元管理する（デバッグミュートにも従う）。
  if(typeof playFileSfx==='function'){ playFileSfx(`assets/sfx/${file}`); return; }
  try{
    const se=new Audio(`assets/sfx/${file}`);
    se.volume=sfxFallbackVolume(.85);
    void se.play();
  }catch(_e){}
}

function _takeRingCard(card){
  if(!card) return false;
  G.rings=Array.isArray(G.rings)?G.rings:Array(4).fill(null);
  const idx=G.rings.findIndex(r=>!r);
  if(idx<0) return false;
  G.rings[idx]=clone(card);
  if(typeof markCardAcquired==='function') markCardAcquired(card);
  _playRewardAcquireSfx('ring_get.wav');
  return true;
}

// ── 祭壇の指輪提示 ──────────────────────────
// 現在保持するカード（魔導板上のカード）から、色タグ／効果カテゴリタグの出現数を数える。
function _countHeldCardTags(){
  const counts={};
  const normalizeColor=color=>{
    const c=String(color||'').trim();
    return c==='茶'?'黄':c;
  };
  const cardColor=card=>{
    if(!card) return '';
    const explicit=normalizeColor(card.color||card.カラー||'');
    if(explicit) return explicit;
    const m=String(card.name||'').trim().match(/^([赤青緑黄紫])/);
    return m?m[1]:'';
  };
  const characters=[];
  const boardCharacterSlots=new Set();
  const effectiveText=card=>[card?.desc,card?.effect,card?.effectText,card?.characterDesc,
    ...(card?._adjacentPanelEffectTexts||[]),...(card?._adjacentPanelEffects||[])].filter(Boolean)
    .map(x=>typeof x==='string'?x:(x.desc||x.effectText||'')).join(' ');
  (G.mainBoard||[]).forEach((card,idx)=>{
    if(!card) return;
    if(_isBoardCharacterCard(card)){
      boardCharacterSlots.add(idx);
      characters.push({card,color:cardColor(card),text:effectiveText(card),idx});
    }
  });
  // 戦闘後にG.mainBoard側のキャラクター色が欠落している場合でも、
  // 実際の味方ユニットが保持しているカラーをタグ判定へ反映する。
  // 既に魔導板の同じスロットを数えている場合は二重計上しない。
  (G.allies||[]).forEach(unit=>{
    if(!unit||unit._isObject||unit._isSoul) return;
    const slot=Number.isInteger(unit._mainBoardSlot)?unit._mainBoardSlot:-1;
    if(slot>=0&&boardCharacterSlots.has(slot)) return;
    const color=normalizeColor(unit.color||String(unit.name||'').match(/^([赤青緑黄紫])/)?.[1]||'');
    if(color) characters.push({card:unit,color,text:effectiveText(unit)});
  });
  // **「所持カード内に最も多く含まれるタグ」を数えるだけ。**（計算式シートの定義）
  // 以前はタグごとに「3枚以上」「2枚以上」という独自の下限を置いていたため、
  // 魔導板のキャラクターが3枚しかいない編成では**どのタグも成立せず**、
  // 提示が丸ごとランダムへ落ちていた（紫だけの編成なのに他色の瞳の指輪が出る）。
  const eligible=(tag,n)=>{ if(n>0) counts[tag]=n; };
  ['赤','青','緑','黄','紫'].forEach(color=>eligible(color,characters.filter(x=>x.color===color).length));
  const distinctColors=new Set(characters.map(x=>x.color).filter(Boolean)).size;
  // 多色は「色が3種類以上あるとき」だけ意味を持つタグなので、ここだけ下限を残す。
  eligible('多色',distinctColors>=3?distinctColors:0);
  ['攻撃','死亡','負傷'].forEach(trigger=>eligible(trigger,
    characters.filter(x=>new RegExp(`${trigger}\\s*[：:]`).test(x.text)).length));
  eligible('解放',characters.filter(x=>/解放/.test(x.text)).length);
  eligible('マナ',characters.filter(x=>/マナ(?:\s*[：:]|毎|を得る)/.test(x.text)).length);
  // ── タグの定義（利用者指定）─────────────────────────────
  // 判定に使う値は、カード本来の値（PANEL_POOLの定義）と、接続している強化の合計。
  const boardHolder=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const enhOf=x=>{
    if(!boardHolder||!Number.isInteger(x&&x.idx)||typeof _collectAdjacentEnhancements!=='function') return null;
    try{ return _collectAdjacentEnhancements(boardHolder,x.idx)||null; }catch(_e){ return null; }
  };
  const baseStatsOf=card=>{
    const def=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
      ?PANEL_POOL.find(p=>p&&(p.id===card?.id||p.name===card?.name)):null;
    return {atk:Number(def?.power??def?.atk??card?.power??card?.atk??0)||0,
      hp:Number(def?.life??def?.hp??card?.life??card?.hp??0)||0};
  };
  const keywordsOf=x=>{
    const enh=enhOf(x);
    return [...(x.card?.keywords||[]),...(enh?.keywords||[])].map(k=>String(k||'').trim());
  };
  // 大型：本来の値よりATKかHPが10以上高いキャラクターがいる。または咆哮・威光を持つ。
  eligible('大型',characters.filter(x=>{
    if(/咆哮|威光/.test(`${x.text} ${keywordsOf(x).join(' ')}`)) return true;
    const enh=enhOf(x);
    const base=baseStatsOf(x.card);
    const atk=(Number(x.card?.power??x.card?.atk??0)||0)+(Number(enh?.atk)||0);
    const hp=(Number(x.card?.life??x.card?.hp??0)||0)+(Number(enh?.hp)||0);
    return (atk-base.atk)>=10||(hp-base.hp)>=10;
  }).length);
  // 結界：結界を持つキャラクターが3人以上。
  const shieldChars=characters.filter(x=>keywordsOf(x).some(k=>/^結界\s*\d*$/.test(k))).length;
  eligible('結界',shieldChars>=3?shieldChars:0);
  // 血：封印キャラクターがいる、または本文に「血」を含むキャラクターが2体以上いる。
  const sealChars=characters.filter(x=>keywordsOf(x).some(k=>/^封印\s*\d*$/.test(k))).length;
  const bloodTextChars=characters.filter(x=>/血/.test(x.text)).length;
  eligible('血',sealChars>0?Math.max(sealChars,bloodTextChars):(bloodTextChars>=2?bloodTextChars:0));
  eligible('毒',characters.filter(x=>/毒牙|毒/.test(`${x.text} ${String(x.card?.keywords||'')}`)).length);
  eligible('召喚',characters.filter(x=>/召喚/.test(x.text)).length);
  return counts;
}
function _ringHasTag(ring,tag){
  if(!ring||!tag) return false;
  const normalize=t=>String(t||'').trim()==='茶'?'黄':String(t||'').trim();
  const expected=normalize(tag);
  return String(ring.tag||ring.tags||ring.color||'')
    .split(/[&,、\s]+/).map(normalize).filter(Boolean).includes(expected);
}
function _ringTagText(ring){ return String(ring&&ring.tag||'').trim(); }
function _ringHasNoTag(ring){
  const tag=_ringTagText(ring);
  return !tag||tag==='-'||tag==='ー';
}
// 祭壇で提示する指輪を、現在保持するカードのタグから選ぶ。
function _pickAltarRingOffer(){
  const pool=((typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL))?RING_POOL:[])
    .filter(r=>r&&!r._rewardExcluded&&r._rewardAvailable!==false);
  if(!pool.length) return [];
  G._bossRingOfferSeen=Array.isArray(G._bossRingOfferSeen)?G._bossRingOfferSeen:[];
  const seen=new Set(G._bossRingOfferSeen.filter(Boolean));
  const available=pool.filter(r=>r&&!seen.has(r.id||r.name));
  const pickRandom=(arr,n,exclude)=>{
    const src=arr.filter(r=>!exclude.has(r));
    const picked=[];
    while(picked.length<n&&src.length){
      const idx=Math.floor(rand()*src.length);
      picked.push(src.splice(idx,1)[0]);
    }
    return picked;
  };
  const used=new Set();
  // 色タグ（赤/青/緑/黄/紫）の指輪は各色1枚しか存在しないため、最多タグだけでは
  // 2枚に届かないのが通常。足りない分は「次に多いタグ」で補う。
  // 以前はここを完全ランダムで埋めていたため、味方が黄一色でも赤い瞳や屍術師が出ていた。
  const tagRanking=Object.entries(_countHeldCardTags())
    .filter(([,n])=>n>0)
    .sort((a,b)=>b[1]-a[1])
    .map(([t])=>t);
  const taggedPicks=[];
  tagRanking.forEach(tag=>{
    if(taggedPicks.length>=2) return;
    const matches=available.filter(r=>_ringHasTag(r,tag));
    pickRandom(matches,2-taggedPicks.length,used).forEach(r=>{ used.add(r); taggedPicks.push(r); });
  });
  // 所持カードに対応するタグ付き指輪が尽きた場合だけ、提示枚数を保つためランダムで補う。
  if(taggedPicks.length<2){
    pickRandom(available,2-taggedPicks.length,used).forEach(r=>{ used.add(r); taggedPicks.push(r); });
  }
  const noTagPool=available.filter(r=>_ringHasNoTag(r));
  let noTagPick=pickRandom(noTagPool,1,used);
  if(!noTagPick.length) noTagPick=pickRandom(available,1,used);
  const result=[...taggedPicks,...noTagPick].filter(Boolean);
  result.slice(0,3).forEach(r=>{
    const key=r&& (r.id||r.name);
    if(key&&!seen.has(key)){
      seen.add(key);
      G._bossRingOfferSeen.push(key);
    }
  });
  return result.slice(0,3).map(r=>clone(r));
}
// 廃棄ボタンから呼ばれる：魔導板のカードを1枚廃棄し、3枚に達したら指輪提示を解放する。
// 祭壇の指輪提示中に還魂できるカード（刻印は手放せない）。
function _ringOfferDiscardableCard(card){
  return !!(card&&!_cardIsEngraved(card)&&G&&G._ringOfferPhase&&Array.isArray(G._ringOffer)&&G._ringOffer.length>0&&!G._ringOfferUnlocked&&!G._ringOfferResolved);
}
function _discardBoardCardForRingOffer(idx,card){
  if(!Array.isArray(G._ringOffer)||!G._ringOffer.length||G._ringOfferUnlocked) return;
  if(typeof questCardRemovalLocked==='function'&&questCardRemovalLocked(card)) return;
  if(_cardIsEngraved(card)) return;
  const unit=_getPartyBoardUnit();
  if(!unit) return;
  const boardList=_normalizeUnitBoardCards(unit);
  // 何らかの理由で同一クリックに対しこの関数が二重に呼ばれても、既に廃棄済み（枠が空）なら
  // カウントを二重加算しない（3枚廃棄したはずが4枚必要になる不具合の再発防止）。
  if(!boardList[idx]) return;
  boardList[idx]=null;
  unit.boardCards=boardList;
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  // 途中で祭壇を離れる時に**元の場所へ回収する**ため、捧げたカードと元のスロットを控える。
  G._ringSacrificedCards=Array.isArray(G._ringSacrificedCards)?G._ringSacrificedCards:[];
  G._ringSacrificedCards.push({idx,card:clone(card)});
  G._boardDiscardCount=(G._boardDiscardCount||0)+1;
  const ringGetCount=Math.max(1,Math.min(3,G._ringSacrificedCards.length));
  _playRewardAcquireSfx(`ring_get${ringGetCount}.wav`);
  // 3枚廃棄すると指輪を1つだけ得られるようになる（6枚廃棄しても2つにはならない：1度解放したら再度解放しない）
  if(G._boardDiscardCount>=SHOP_EXCHANGE_TRIAL.ringCardCost&&!G._ringOfferUnlocked){
    G._ringOfferUnlocked=true;
  }
  renderHandEditor();
  renderFieldEditor();
  renderRewCards();
  renderMoveSlotsInEnemy();
}
