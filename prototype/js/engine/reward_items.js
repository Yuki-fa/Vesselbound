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
    slot.classList.remove('rarity-1','rarity-2','rarity-3','rarity-4','rarity-5');
    const preview=item?[item.name,_previewRarityLine(item),item.desc||''].filter(Boolean).join('\n'):'';
    if(preview){
      slot.setAttribute('data-preview',preview);
      const rarity=Math.max(1,Math.min(5,parseInt(item.rarity,10)||1));
      slot.classList.add(`rarity-${rarity}`);
    }else{
      slot.removeAttribute('data-preview');
    }
    slot.draggable=!!item;
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
      });
      slot.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      slot.addEventListener('dragend',()=>{ slot.classList.remove('dragging'); _removeDragGhost(); _clearDragZoneClass(); _dragSrc=null; });
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
            if(typeof playSfx==='function') playSfx('buy2',{group:'reward'});
          }
          const placed=clone(card);
          // 商品枠に置いていた自分のアイテムを戻す場合、売却待ちの印を消してから手持ちへ返す。
          delete placed._shopSalePending;
          delete placed._sellDisplayPrice;
          delete placed._temporaryRewardAreaCard;
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
    // 店（道具屋・魔導店・鍛冶屋）では手持ちアイテムに売却価格と売却ボタンを重ねる。
    // 価格はアイテムなので全店共通で道具屋準拠（レアリティ×45）。
    slot.querySelector('.shop-board-sell-value')?.remove();
    slot.querySelector('.shop-board-sell-btn')?.remove();
    if((G._isShop||G._isForge)&&item){
      const price=typeof _itemShopSellPrice==='function'?_itemShopSellPrice(item):0;
      const val=document.createElement('div');
      val.className='shop-board-sell-value';
      val.textContent=`+${price}G`;
      slot.appendChild(val);
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='shop-board-sell-btn';
      btn.dataset.sfxSilent='1';
      btn.textContent='売却';
      btn.onclick=ev=>{ ev.stopPropagation(); _sellHeldItem(idx); };
      slot.appendChild(btn);
    }
    slot.onclick=e=>{
      e.stopPropagation();
      // 対象選択中に、選択中のアイテム自身を押したら中断する。
      if(G._pendingItemUse&&G._pendingItemUse.slotIdx===idx){ _cancelPendingItemUse(); return; }
      if(slot._rewardItem) _openItemUseConfirm(idx,slot);
    };
  });
}
// 道具屋：手持ちアイテムを売却する（レアリティ×45ゴールド）。
function _sellHeldItem(idx){
  const items=_ensureItemSlots();
  const card=items[idx];
  if(!card) return;
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
    tip.classList.remove('reward-action-tooltip');
    tip.innerHTML='';
    tip.style.display='none';
  }
}
function _openRewardActionTooltip(anchor,title,desc,actions){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  const oldRect=tip.style.display==='block'?tip.getBoundingClientRect():null;
  const esc=s=>String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  tip.dataset.rewardLocked='1';
  tip.className='reward-action-tooltip';
  tip.innerHTML=`<div class="preview-title">${esc(title)}</div><div class="reward-action-desc">${esc(desc)}</div><div class="reward-action-buttons"></div>`;
  const box=tip.querySelector('.reward-action-buttons');
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
  if(oldRect){
    tip.style.left=`${oldRect.left}px`;
    tip.style.top=`${oldRect.top}px`;
  }else if(rect){
    const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
    tip.style.left=`${Math.max(8,rect.left)}px`;
    tip.style.top=`${rect.bottom+8*scale}px`;
  }
}
if(!window._itemRingMenuDismissBound){
  window._itemRingMenuDismissBound=true;
  document.addEventListener('pointerdown',e=>{
    const pop=document.getElementById('item-use-confirm');
    const tip=document.getElementById('kw-tooltip');
    if(!pop&&tip?.dataset.rewardLocked!=='1') return;
    if(e.target&&e.target.closest&&e.target.closest('#item-use-confirm,#kw-tooltip.reward-action-tooltip,.reward-prod-item .reward-prod-slots i,.reward-prod-ring .reward-prod-slots i')) return;
    _closeItemUseConfirm();
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
function _mainBoardEquips(){
  const unit=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  return unit&&Array.isArray(unit.equipment)?unit.equipment:[];
}
function _isBoardCharacterCard(card){
  return !!card&&String(card.category||'')==='キャラクター';
}
function _boardCharacterSlots(){
  return _mainBoardEquips().map((card,idx)=>({card,idx})).filter(x=>_isBoardCharacterCard(x.card));
}
function _cardSealKeywordIndex(card){
  const kws=Array.isArray(card&&card.keywords)?card.keywords:[];
  return kws.findIndex(k=>/^封印(?:\d+|∞)$/.test(String(k||'')));
}
// 生贄人形は封印の値を3減らす。**最低値は1で、0にはならない**（封印は失われない）。
// 値はここが唯一の置き場（シートの効果文と合わせること）。
const SACRIFICE_DOLL_SEAL_REDUCE=3;
const SACRIFICE_DOLL_SEAL_MIN=1;
// 生贄人形で実際に減らせる封印かどうか。
// ・封印∞は減らせない
// ・既に最低値（封印1）なら減らせない
// 減らせない相手を選べてしまうと「破壊だけ実行され、アイテムは消費されない」状態で止まる。
function _cardSealReducible(card){
  const idx=_cardSealKeywordIndex(card);
  if(idx<0) return false;
  const kw=String(card.keywords[idx]||'');
  if(/∞/.test(kw)) return false;
  return (parseInt(kw.replace('封印',''),10)||0)>SACRIFICE_DOLL_SEAL_MIN;
}
function _reduceCardSeal(card){
  const idx=_cardSealKeywordIndex(card);
  if(idx<0) return false;
  const kw=String(card.keywords[idx]||'');
  if(/∞/.test(kw)) return false;
  const cur=parseInt(kw.replace('封印',''),10)||0;
  const n=Math.max(SACRIFICE_DOLL_SEAL_MIN,cur-SACRIFICE_DOLL_SEAL_REDUCE);
  if(n===cur) return false;
  card.keywords[idx]=`封印${n}`;
  // 説明文にも封印の数が書かれている場合は同じ値へ揃える（消さない）。
  if(card.desc) card.desc=String(card.desc).replace(/封印\d+/g,`封印${n}`);
  return true;
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
// 絆の巻物：キーワードの合体ルール。「毒3」「封印2」等、末尾が数値のキーワードは数値同士を
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
  const key=_itemEffectKey(card);
  const chars=_boardCharacterSlots();
  if(['shield_scroll','giant_scroll','inspire_flag'].includes(key)) return chars.length>0;
  if(key==='bond_scroll'){
    const counts={};
    chars.forEach(({card})=>{ if(!card._merged) counts[card.name]=(counts[card.name]||0)+1; });
    return Object.values(counts).some(n=>n>=2);
  }
  if(key==='sacrifice_doll') return chars.length>=2&&chars.some(x=>_cardSealReducible(x.card));
  if(key==='weakening_scroll') return chars.length>0;
  // 魔力の巻物は減らせるマナ効果を持つキャラクターが1体も居なければ使えない（生贄人形と同じ扱い）。
  if(key==='mana_scroll') return chars.some(x=>_manaScrollReducible(x.card));
  if(key==='meteor_scroll') return true;
  // ポータルの巻物は「直前の村へワープする」アイテムなので、街（村・その施設）にいる間は使えない。
  // **行き先はウェーブ進行（旅の進捗）の街マス。** 以前は G.worldMap があることを
  // 条件にしていたが、ワールドマップは開かないと作られないため、通常の進行では
  // ずっと押せないままだった。
  if(key==='portal_scroll') return !_isInVillageScene()
    && !!(typeof _wavePreviousVillage==='function'&&_wavePreviousVillage());
  if(key==='vision_scroll') return chars.length>0;
  return true;
}
// 魔力の巻物が減らせるマナ効果の項目。
const _MANA_SCROLL_FIELDS=['manaCost','manaOnAttack','manaOnInjury','manaOnDeath'];
// 最低値1のため、2以上の項目が1つでもあれば減らせる。
function _manaScrollReducible(card){
  return _MANA_SCROLL_FIELDS.some(f=>Object.prototype.hasOwnProperty.call(card||{},f)&&(Number(card[f])||0)>1);
}
// アイテム使用中、そのスロットが対象になり得るか。
// アイテム未使用時は常にtrue（通常操作を妨げない）。
// カードが既にそのキーワードを持っているか（付与系アイテムの対象外判定に使う）。
function _cardHasKeyword(card,kw){
  return (Array.isArray(card&&card.keywords)?card.keywords:[]).some(k=>String(k||'').trim()===kw);
}
// 対象として選べるスロットか。**選べないカードは暗くして押しても何も起きない。**
// エンチャントは「キャラクターを選ぶアイテム」の対象にならないので、
// _isBoardCharacterCard() で一律に落とす（個別のアイテムごとに書かない）。
function _isItemUseTargetSlot(slotIdx){
  const pending=G._pendingItemUse;
  if(!pending) return true;
  const equips=typeof _mainBoardEquips==='function'?_mainBoardEquips():[];
  const card=equips[slotIdx];
  if(!_isBoardCharacterCard(card)) return false;
  const key=pending.key;
  // 付与系は**既に同じキーワードを持つキャラクターを対象にできない**（無駄になるため）。
  if(key==='inspire_flag'&&_cardHasKeyword(card,'根性')) return false;
  if(key==='vision_scroll'&&_cardHasKeyword(card,'復活')) return false;
  if(key==='bond_scroll'){
    if(card._merged) return false;
    if(!Number.isInteger(pending.firstIdx)){
      // 1枚目：同名かつ未合体の相方が別スロットに要る
      return equips.some((c,i)=>i!==slotIdx&&_isBoardCharacterCard(c)&&!c._merged&&c.name===card.name);
    }
    // 2枚目：1枚目と同名の別スロット
    return slotIdx!==pending.firstIdx&&card.name===pending.firstName;
  }
  if(key==='mana_scroll') return _manaScrollReducible(card);
  if(key==='sacrifice_doll'){
    // 1枚目（破壊）は封印持ちが別に居る場合のみ。2枚目は封印を持つ別キャラ。
    if(!Number.isInteger(pending.destroyIdx)){
      return equips.some((c,i)=>i!==slotIdx&&_isBoardCharacterCard(c)&&_cardSealReducible(c));
    }
    return slotIdx!==pending.destroyIdx&&_cardSealReducible(card);
  }
  return true;
}

// アイテムの対象選択を中断する。生贄人形のように途中で盤面を書き換える
// アイテムがあるため、開始時のスナップショットへ戻してから解除する。
function _cancelPendingItemUse(silent){
  const pending=G._pendingItemUse;
  if(!pending) return false;
  if(Array.isArray(pending.boardSnapshot)){
    const equips=typeof _mainBoardEquips==='function'?_mainBoardEquips():null;
    if(equips) pending.boardSnapshot.forEach((c,i)=>{ equips[i]=c?clone(c):null; });
  }
  G._pendingItemUse=null; _syncItemUsePickingUi();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof updateHUD==='function') updateHUD();
  return true;
}

// 右クリック／Escでも対象選択を中断できるようにする（1度だけ登録）。
if(!window._itemUseCancelBound){
  window._itemUseCancelBound=true;
  document.addEventListener('contextmenu',e=>{
    if(!G||!G._pendingItemUse) return;
    e.preventDefault();
    // **ここで他の右クリック処理へ渡さない。** 渡すと reward.js 側の
    // 「カード非表示」の切り替えまで走ってしまう（対象選択中は切り替えさせない）。
    e.stopImmediatePropagation();
    _cancelPendingItemUse();
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!G||!G._pendingItemUse) return;
    e.preventDefault();
    _cancelPendingItemUse();
  },true);
  // **対象選択中はドラッグを一切させない。**
  // カードを掴んだまま対象を選ぶと、移動と使用が同時に走って盤面が壊れる。
  // dragstart は各カードへ個別に登録されているため、documentのキャプチャで
  // 手前から止める（stopImmediatePropagationで後続の登録にも渡さない）。
  document.addEventListener('dragstart',e=>{
    if(!G||!G._pendingItemUse) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
}

// ── 対象を選ぶアイテムの使用中の表示 ───────────────────────────
// **指示文はテキストメッセージシートが唯一の出どころ**（「「◯◯」使用時」）。
// 2段階選ぶアイテム（生贄人形・絆の巻物）は「使用時1」「使用時2」を使う。
// 予備の文字列はシートを読めない時のためだけに持つ。
const _ITEM_USE_PROMPT_FALLBACK={
  bond_scroll:['合体する1枚目の同名キャラクターを選んでください。','合体する2枚目の同名キャラクターを選んでください。'],
  shield_scroll:['結界1を付与するキャラクターを選んでください。'],
  giant_scroll:['+5/+5を付与するキャラクターを選んでください。'],
  sacrifice_doll:['破壊するキャラクターを選んでください。','封印の値を3減らすキャラクターを選んでください。'],
  weakening_scroll:['破壊するキャラクターを選んでください。'],
  inspire_flag:['根性を付与するキャラクターを選んでください。'],
  vision_scroll:['復活を付与するキャラクターを選んでください。'],
  mana_scroll:['マナ効果の値1減らすキャラクターを選んでください。'],
};
// いま何段階目か（1始まり）。1段階だけのアイテムは常に1。
function _itemUseStep(pending){
  if(!pending) return 1;
  if(pending.key==='sacrifice_doll') return (pending.destroyIdx==null)?1:2;
  if(pending.key==='bond_scroll') return (pending.firstIdx==null)?1:2;
  return 1;
}
function _itemUsePromptText(pending){
  if(!pending) return '';
  const name=String(pending.card&&pending.card.name||'').trim();
  const step=_itemUseStep(pending);
  const list=_ITEM_USE_PROMPT_FALLBACK[pending.key]||[];
  const fallback=list[step-1]||list[0]||'対象を選んでください。';
  if(typeof textMessage!=='function') return fallback;
  // 2段階のものは「使用時1」「使用時2」、1段階のものは「使用時」。
  const keys=(list.length>1)?[`「${name}」使用時${step}`,`「${name}」使用時`]:[`「${name}」使用時`];
  for(const k of keys){ const v=textMessage(k,'').trim(); if(v) return v; }
  return fallback;
}
// CSSの content へ入れる文字列リテラル。引用符とバックスラッシュを閉じないようにする。
function _cssStringLiteral(text){
  return `"${String(text||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`;
}
// 対象選択中の画面（暗転・報酬枠の見出しと説明文・キャンセルボタン）を今の状態へ合わせる。
// **開始・段階の進行・終了のすべてでここを呼ぶこと**（呼び忘れると暗転や説明が残る）。
function _syncItemUsePickingUi(){
  if(typeof document==='undefined') return;
  const body=document.body;
  if(!body) return;
  const pending=G&&G._pendingItemUse;
  const sec=document.getElementById('battle-order-section');
  const root=document.documentElement;
  const on=!!pending;
  // **対象選択の間は「カード非表示」を解除する。** 非表示のままだと対象が見えないうえ、
  // 非表示用のCSS（body.right-card-peek）が結合アイコン（.panel-unite-link）を
  // display:none にするため、盤面のつながりが分からなくなる。
  // **解除したままにする**（キャンセルしてもカード表示のまま。利用者指定）。
  if(on&&body.classList.contains('right-card-peek')){
    body.classList.remove('right-card-peek');
    if(typeof _syncBoardCardVisibilityToggle==='function') _syncBoardCardVisibilityToggle();
    if(typeof renderHandEditor==='function') renderHandEditor();
  }
  body.classList.toggle('item-use-picking',on);
  const oldBtn=sec&&sec.querySelector('.item-use-cancel-btn');
  if(!on){
    root.style.removeProperty('--item-use-title');
    root.style.removeProperty('--item-use-desc');
    if(oldBtn) oldBtn.remove();
    return;
  }
  root.style.setProperty('--item-use-title',_cssStringLiteral(String(pending.card&&pending.card.name||'')));
  root.style.setProperty('--item-use-desc',_cssStringLiteral(_itemUsePromptText(pending)));
  if(!sec) return;
  if(!oldBtn){
    // 「元に戻す」と同じ見た目・同じ効果音の扱い（CSSは .rew-reset-btn のルールを共用する）。
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='btn rew-reset-btn item-use-cancel-btn';
    btn.dataset.sfxSilent='1';
    btn.innerHTML=`<span class="rew-btn-label">${_uiLabel('アイテム使用キャンセルボタン','キャンセル')}</span>`;
    btn.onclick=()=>{
      if(typeof playSfx==='function') playSfx('return',{group:'ui'});
      _cancelPendingItemUse();
    };
    sec.appendChild(btn);
  }
}
function _beginBoardItemUse(idx,card){
  const key=_itemEffectKey(card);
  const equipsNow=typeof _mainBoardEquips==='function'?_mainBoardEquips():[];
  G._pendingItemUse={slotIdx:idx,key,card:clone(card),step:0,
    boardSnapshot:(equipsNow||[]).map(c=>c?clone(c):null)};
  _syncItemUsePickingUi();
  // 対象外カードの暗転を反映するため描き直す。
  if(typeof renderHandEditor==='function') renderHandEditor();
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
    _beginBoardItemUse(idx,card);
    _closeItemUseConfirm();
    return true;
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
  const pending=G._pendingItemUse;
  if(!pending||!Number.isInteger(slotIdx)) return false;
  const equips=_mainBoardEquips();
  const card=equips[slotIdx];
  if(!_isBoardCharacterCard(card)){ ; return true; }
  const key=pending.key;
  if(key==='shield_scroll'){
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    card.keywords.push('結界1');
    G._pendingItemUse=null; _syncItemUsePickingUi(); _consumeItemSlot(pending.slotIdx); ; return true;
  }
  if(key==='giant_scroll'){
    card.power=(Number(card.power)||0)+5; card.life=(Number(card.life)||0)+5;
    G._pendingItemUse=null; _syncItemUsePickingUi(); _consumeItemSlot(pending.slotIdx); ; return true;
  }
  if(key==='inspire_flag'){
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    if(!card.keywords.includes('根性')) card.keywords.push('根性');
    G._pendingItemUse=null; _syncItemUsePickingUi(); _consumeItemSlot(pending.slotIdx); ; return true;
  }
  if(key==='vision_scroll'){
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    if(!card.keywords.includes('復活')) card.keywords.push('復活');
    G._pendingItemUse=null; _syncItemUsePickingUi(); _consumeItemSlot(pending.slotIdx); ; return true;
  }
  if(key==='mana_scroll'){
    const fields=_MANA_SCROLL_FIELDS;
    let changed=false;
    fields.forEach(field=>{
      if(!Object.prototype.hasOwnProperty.call(card,field)) return;
      const cur=Number(card[field])||0;
      // 最低値は1。1以下（＝効果を持たない／既に最小）は減らさない。
      if(cur<=1) return;
      card[field]=cur-1;
      changed=true;
    });
    if(!changed){ ; return true; }
    // 永久減少後の内部値と、カードに表示する効果文の数値を同期する。
    if(typeof card.desc==='string'){
      if(Object.prototype.hasOwnProperty.call(card,'manaCost')){
        const cost=Math.max(0,Number(card.manaCost)||0);
        card.desc=card.desc.replace(/(^|\n)\s*\d+マナ(毎)?([：:])/g,(_,prefix,every,sep)=>`${prefix}${cost}マナ${every||''}${sep}`);
      }
      const manaTriggers=[['manaOnAttack','攻撃'],['manaOnInjury','負傷'],['manaOnDeath','死亡']];
      manaTriggers.forEach(([field,trigger])=>{
        if(!Object.prototype.hasOwnProperty.call(card,field)) return;
        const value=Math.max(0,Number(card[field])||0);
        const re=new RegExp(`(${trigger}：\\s*(?:[赤青緑黄紫茶]\\s*)?)\\d*マナ(?=を?得る)`,'g');
        card.desc=card.desc.replace(re,`$1${value}マナ`);
      });
    }
    G._pendingItemUse=null; _syncItemUsePickingUi(); _consumeItemSlot(pending.slotIdx); ; return true;
  }
  if(key==='bond_scroll'){
    if(!pending.firstIdx&&pending.firstIdx!==0){
      if(card._merged){ ; return true; }
      pending.firstIdx=slotIdx;
      pending.firstName=card.name;
      _syncItemUsePickingUi();   // 2段階目の指示文へ差し替える
      renderHandEditor();
      return true;
    }
    const first=equips[pending.firstIdx];
    if(!first||first===card||card.name!==pending.firstName||card._merged||first._merged){
      ; return true;
    }
    first.power=(Number(first.power)||0)+(Number(card.power)||0);
    first.life=(Number(first.life)||0)+(Number(card.life)||0);
    first.manaOnAttack=(Number(first.manaOnAttack)||0)+(Number(card.manaOnAttack)||0);
    first.manaOnInjury=(Number(first.manaOnInjury)||0)+(Number(card.manaOnInjury)||0);
    first.manaOnDeath=(Number(first.manaOnDeath)||0)+(Number(card.manaOnDeath)||0);
    first.goldOnBattleEnd=(Number(first.goldOnBattleEnd)||0)+(Number(card.goldOnBattleEnd)||0);
    first.goldOnDeath=(Number(first.goldOnDeath)||0)+(Number(card.goldOnDeath)||0);
    // 絆の巻物は同名キャラクターを1枚に合体する。召喚枚数を加算すると、
    // 合体後の1枚が戦闘開始時に2体として出撃してしまう。
    // アイテム等で個別に付いたキーワードは、シート由来の姿へ作り直しても残す。
    const bondExtraKeywords=typeof extraPanelKeywords==='function'
      ?_mergeCardKeywordsForBond(extraPanelKeywords(first),extraPanelKeywords(card)):[];
    first.keywords=_mergeCardKeywordsForBond(first.keywords,card.keywords);
    first.rarity=Math.min(5,(Number(first.rarity)||1)+1);
    first.grade=Math.max(Number(first.grade)||1,first.rarity);
    // **矢印は directions（配列）で描く。** directionCount だけ4にしても
    // 見た目は元の2方向のままになる（3枚合体は両方を設定している）。
    first.directions=['up','right','down','left'];
    first.directionCount=4;
    first._merged=true;
    // **合体後の効果はシートの「合体効果」列がそのまま入る**（pool.js／loader.js）。
    // 以前はここで「効果を2回発動」（_effectRepeatBonus）にしていたが、シートの
    // 合体効果は既に合体後の値で書かれているため、重ねて増やしてはいけない。
    // 列が空欄のカードは効果もキーワードも変わらない。
    if(typeof applyMergedPanelForm==='function'&&applyMergedPanelForm(first)){
      if(bondExtraKeywords.length) first.keywords=_mergeCardKeywordsForBond(first.keywords,bondExtraKeywords);
    }
    delete first.effectRepeatBonus;
    equips[slotIdx]=null;
    G._pendingItemUse=null; _syncItemUsePickingUi(); _consumeItemSlot(pending.slotIdx); ; return true;
  }
  if(key==='sacrifice_doll'){
    if(!pending.destroyIdx&&pending.destroyIdx!==0){
      pending.destroyIdx=slotIdx;
      pending.destroyName=card.name;
      equips[slotIdx]=null;
      _syncItemUsePickingUi();   // 2段階目の指示文へ差し替える
      renderHandEditor();
      return true;
    }
    if(slotIdx===pending.destroyIdx||!_cardSealReducible(card)){ ; return true; }
    // 封印は最低でも1残るので、解放効果が開戦効果へ変わることはない。
    // （そのための確認ダイアログも不要になったため廃止した）
    if(!_reduceCardSeal(card)) return true;
    G._pendingItemUse=null; _syncItemUsePickingUi();
    _consumeItemSlot(pending.slotIdx);
    return true;
  }
  if(key==='weakening_scroll'){
    equips[slotIdx]=null;
    G.mapPanelPowers=G.mapPanelPowers||{};
    const summonSlots=Array.from({length:MAIN_BOARD_SIZE},(_,i)=>i)
      .filter(i=>typeof mapPanelPowerIdAt==='function'&&mapPanelPowerIdAt(i)==='summon');
    // **順番に依存させない。**（同じ村で先に鍛冶屋へ寄っても結果を変えない）
    // 鍵はラン・現在地・使ったアイテム枠。コンティニューしても同じマスが選ばれる。
    const target=summonSlots.length
      ?(typeof runKeyedPick==='function'
        ?runKeyedPick(`eternal:${G._wave}:${G._waveStage}:${pending.slotIdx}`,summonSlots)
        :randFrom(summonSlots))
      :null;
    if(target==null){ ; return true; }
    G._pendingItemUse=null; _syncItemUsePickingUi();
    _consumeItemSlot(pending.slotIdx);
    const finish=()=>{ renderHandEditor(); renderRewCards(); updateHUD(); ; };
    if(typeof _playMapForgeSlotRoll==='function'){
      G._mapForgeAnimating=true;
      // **演出が失敗しても必ず旗を降ろす。**
      // `_mapForgeAnimating` が立っている間、`_renderPanelUniteMarkers()` は
      // 結合アイコンを消して何も描かない（マス変化の演出中に線が残らないようにする仕組み）。
      // 以前は .then() だけだったため、途中で例外が出ると旗が立ったままになり、
      // **以後どの画面でも結合アイコンが出なくなっていた。**
      Promise.resolve(_playMapForgeSlotRoll([target],target,{id:'eternal'}))
        .catch(e=>{ console.error('[eternal scroll]',e); })
        .finally(()=>{
          G._mapForgeAnimating=false;
          G.mapPanelPowers[target]='eternal';
          finish();
        });
    }else{
      G.mapPanelPowers[target]='eternal';
      finish();
    }
    return true;
  }
  return false;
}
function _openItemUseConfirm(idx,anchor){
  const slots=_ensureItemSlots();
  const card=slots[idx];
  if(!card||G.phase!=='reward') return;
  // **同じアイテムの吹き出しが既に出ていれば作り直さない。**
  // 押すたびに remove→append していたため、連打するとボタンが消えては出て
  // 明滅して見えた（使えないアイテムでは「使う」が一瞬明るく見える）。
  const tip=document.getElementById('kw-tooltip');
  if(tip?.dataset.rewardLocked==='1'&&String(tip.dataset.rewardSlotIdx)===String(idx)) return;
  _closeItemUseConfirm();
  const useUnavailable=!_canUseItemNow(card);
  _openRewardActionTooltip(anchor,card.name||'アイテム',card.desc||'',[
    {label:'使う',disabled:useUnavailable,onClick:()=>_useImmediateItem(idx,card)},
    {label:'捨てる',onClick:()=>{
      const current=_ensureItemSlots()[idx];
      if(current) _ensureItemSlots()[idx]=null;
      _closeItemUseConfirm();
      renderHandEditor(); updateHUD();
    }},
    {label:'やめる',onClick:()=>{ _closeItemUseConfirm(); _cancelPendingItemUse(); }}
  ]);
  const lockedTip=document.getElementById('kw-tooltip');
  if(lockedTip) lockedTip.dataset.rewardSlotIdx=String(idx);
}
