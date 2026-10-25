// reward_board_editor.js — フィールド・手札・魔導板カードの描画とドラッグ配置の編集
// 2026-10-25 リファクタリング：reward.js から移した（処理は変えていない）。

// ── フィールドエディタ（報酬フェイズ中の配置変更・売却）──

function renderFieldEditor(){
  const fAlly=document.getElementById('f-ally');
  if(fAlly) _renderFieldRow(fAlly);
  renderHandEditor();
}

function _renderFieldRow(el){
  el.innerHTML='';
  const maxAllies=MAX_ALLIES||5;
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  const live=Array.from({length:maxAllies},(_,i)=>({u:G.allies[i],i})).filter(x=>x.u&&x.u.hp>0);
  const isRearUnit=x=>x.u&&(x.u.lane||'front')==='rear';
  const rearIndexes=live.filter(isRearUnit).map(x=>x.i);
  const frontIndexes=live.filter(x=>!isRearUnit(x)).map(x=>x.i);
  const fieldW=`calc(var(--unit-card-w) * ${frontSlots} + var(--unit-field-gap) * ${frontSlots-1})`;
  const unitX=(count,pos)=>`calc((${fieldW} - var(--unit-card-w)) / 2 + (${pos} - (${count} - 1) / 2) * (var(--unit-card-w) + var(--unit-field-gap)))`;
  const rearLeft=new Map(rearIndexes.map((idx,pos)=>[idx,unitX(rearIndexes.length,pos)]));
  const frontLeft=new Map(frontIndexes.map((idx,pos)=>[idx,unitX(frontIndexes.length,pos)]));
  for(let i=0;i<maxAllies;i++){
    const unit=G.allies[i];
    const div=document.createElement('div');
    const lane=unit?(unit.lane||'front'):(i>=frontSlots?'rear':'front');
    div.style.gridRow=lane==='rear'?'1':'2';
    div.style.gridColumn=String((i%frontSlots)+1);
    if(unit){
      div.style.setProperty('position','absolute','important');
      div.style.setProperty('left',(lane==='rear'?rearLeft.get(i):frontLeft.get(i))||`calc((var(--unit-card-w) + var(--unit-field-gap)) * ${(i%frontSlots)})`,'important');
      // 前衛（敵に近い側）＝画面上側、後衛＝画面下側。戦闘画面のrenderField()と揃える。
      div.style.setProperty('top',lane==='rear'?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0','important');
      div.style.setProperty('transform','none','important');
      const isPlayerHero=!unit._panelSummoned;
      const hasGuard=!isPlayerHero&&(unit._panelSummoned&&unit.guardian);
      div.className='slot unit-card'+(unit.hp<=0?' dead-unit inert':'')+(unit.hp>0&&!isPlayerHero&&((unit.hate&&unit.hateTurns>0)||hasGuard)?' is-defender uses-hate-frame':'')+(G._selectedBoardUnitIdx===i?' selected':'');
      if(unit.name==='石像') div.classList.add('no-unit-shadow');
      if(typeof applyUnitVisual==='function') applyUnitVisual(div,unit);
      div.draggable=true;
      const gradeTag='';
      const _rawDesc=unit.desc&&typeof _rawSubstitutedDesc==='function'?_rawSubstitutedDesc(unit):(unit.desc||'');
      const _desc=_stripKeywordsFromDesc(_rawDesc,unit);
      const descTag=typeof _unitCombinedDescHtml==='function'?_unitCombinedDescHtml(unit,_desc):(_desc?`<div class="slot-desc">${_desc}</div>`:'');
      // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
      // 既にアイコン化済みの_desc（<img alt="マナ">を含む）ではなくプレーンテキストを渡す
      // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
      const _plainDesc=unit.desc&&typeof _rawSubstitutedDesc==='function'?_stripKeywordsFromDesc(_rawSubstitutedDesc(unit),unit):_desc;
      const _preview=typeof _unitPreviewText==='function'?_unitPreviewText(unit,_plainDesc):_plainDesc;
      if(_preview) div.setAttribute('data-preview',_preview);
      const raceTag='';
      const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
      const _btmStyle='position:absolute;bottom:22px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0';
      div.style.borderTop=unit.hate&&unit.hateTurns>0?'':'2px solid var(--teal2)';
      const hpClass=(unit.maxHp!=null&&unit.hp<unit.maxHp)?'h hp-damaged':'h';
      const _hpMax=Math.max(1,unit.maxHp||unit.hp||1);
      const _hpPct=Math.max(0,Math.min(100,Math.round((Math.max(0,unit.hp||0)/_hpMax)*100)));
      const hpBar=`<div class="slot-life-bar" title="${_escapePreviewHtml(typeof _lifeLabelText==='function'?_lifeLabelText():'ライフ')} ${Math.max(0,unit.hp||0)}/${_hpMax}"><div class="slot-life-fill" style="width:${_hpPct}%"></div></div>`;
      // 報酬フェイズ中のシールド発光は配置順エリアだけに限定する。
      const _showShield=false;
      if(_showShield) div.classList.add('shield-active'); else div.classList.remove('shield-active');
      const shieldLayer=_showShield?'<div class="unit-shield-layer"></div>':'';
      div.innerHTML=`<div class="unit-frame-layer"></div><div class="unit-stat-overlay-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}"><div class="slot-name">${unit.name}</div>${raceTag}<div class="slot-stats"><span class="a">${unit.atk}</span><span class="s">/</span><span class="${hpClass}">${unit.hp}</span></div></div><div style="${_btmStyle}">${descTag}</div><div class="unit-hit-layer"></div>`;
      // クリックは装備内容表示のみ。守護はカード効果でのみ付与する。
      div.onclick=e=>{
        e.stopPropagation();
        if(e.detail===0) return; // プログラム的クリックは無視
        const u=G.allies[i]; if(!u) return;
        if(G._selectedBoardUnitIdx!==i) G._selectedBoardCardIdx=null;
        G._selectedBoardUnitIdx=i;
        G._showGlobalPanels=false;
        G._showFacilities=false;
        renderHandEditor();
        renderFieldEditor();
      };
      const hitLayer=div.querySelector('.unit-hit-layer');
      if(hitLayer){
        if(_preview) hitLayer.setAttribute('data-preview',_preview);
        hitLayer.onclick=ev=>div.onclick(ev);
        if(typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(hitLayer,unit,i);
      }
      div.addEventListener('dragstart',e=>{
        _fieldDragSrc=i; _fieldDragSrcEl=div; _fieldDragStartY=e.clientY;
        div.classList.add('dragging'); e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _updateFieldDropHighlights(unit.name,0,true,i);
        _createDragGhost(div);
      });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',e=>{
        div.classList.remove('dragging'); _clearFieldDropHighlights();
        _removeDragGhost(); _fieldDragSrcEl=null;
        _fieldDragSrc=-1;
      });
      div.addEventListener('dragover',e=>{
        const _dragArr=_dragSrc&&(_dragSrc.arr==='boardCards'?(_getPartyBoardUnit().boardCards||[]):G.spells);
        if(unit.hp>0&&_dragSrc&&(_dragSrc.arr==='spells'||_dragSrc.arr==='boardCards')&&_dragArr[_dragSrc.idx]&&_isNonCombatBoardPhase()){
          e.preventDefault();
          div.classList.add('drag-over');
        } else if(_fieldDragSrc>=0&&_fieldDragSrc!==i){
          e.preventDefault();
          div.classList.add('drag-over');
        }
      });
      div.addEventListener('dragleave',e=>{
        if(div.contains(e.relatedTarget)) return;
        div.classList.remove('drag-over');
      });
      div.addEventListener('drop',e=>{
        e.preventDefault();
        div.classList.remove('drag-over','merge-ready');
        const _dropArr=_dragSrc&&(_dragSrc.arr==='boardCards'?(_getPartyBoardUnit().boardCards||[]):G.spells);
        if(unit.hp>0&&_dragSrc&&(_dragSrc.arr==='spells'||_dragSrc.arr==='boardCards')&&_dropArr[_dragSrc.idx]&&_isNonCombatBoardPhase()){
          if(_dragSrc.arr==='boardCards') moveBoardCardToUnit(_dragSrc.idx,_dragSrc.unitIdx,i);
          else dropOnCard('boardCards',i);
          _dragSrc=null;
        } else if(_fieldDragSrc>=0){
          _clearFieldDropHighlights();
          _dropFieldUnit(i);
        }
      });
    } else {
      div.className='slot empty';
      div.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0){
          const rc=_rewCards[_rewDragSrc];
          if(rc){ e.preventDefault(); div.classList.add('drag-over'); }
        } else if(_fieldDragSrc>=0){ e.preventDefault(); div.classList.add('drag-over'); }
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{
        e.preventDefault(); div.classList.remove('drag-over');
        if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc){
            if(!G._isRewardTown||G.gold>=(rc._buyPrice??2)){
              takeRewCard(src,i);
            } else {
              renderRewCards();
            }
          }
        } else if(_fieldDragSrc>=0){ _dropFieldUnit(i); }
      });
    }
    el.appendChild(div);
  }
}



let _fieldDragSrc=-1;
let _fieldDragSrcEl=null; // 盤面ドラッグ中のソース要素
let _rewDragSrc=-1;       // 報酬欄からドラッグ中のインデックス
let _fieldDragStartY=0;   // dragstart時のY座標（前衛後衛切り替え判定用）

function _dropFieldUnit(destIdx){
  if(_fieldDragSrc<0) return;
  const src=_fieldDragSrc; _fieldDragSrc=-1;
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  if((src>=frontSlots)!==(destIdx>=frontSlots)){
    renderFieldEditor();
    return;
  }
  const tmp=G.allies[src]; G.allies[src]=G.allies[destIdx]; G.allies[destIdx]=tmp;
  renderFieldEditor();
}

// フィールドスロットをドラッグ中にハイライト
function _updateFieldDropHighlights(cardName, cost, isFieldDrag, excludeIdx){
  const canAfford=isFieldDrag||G.gold>=cost;
  _getAllyDomSlots().forEach((slotEl,i)=>{
    if(!slotEl||i===excludeIdx) return;
    const unit=G.allies[i];
    if(!unit||unit.hp<=0){
      if(canAfford) slotEl.classList.add('drag-over');
    }
  });
}
function _clearFieldDropHighlights(){
  _getAllyDomSlots().forEach(s=>{ if(s){ s.classList.remove('drag-over'); s.style.boxShadow=''; s.style.outline=''; s.style.opacity=''; } });
}

// ── スペル置き場（1×3・戦闘をまたいで保持。スペルカードのみ⇔報酬エリアの間で移動可）──

function rewardGoldText(){
  const shown=typeof goldDisplayValue==='function'?goldDisplayValue():(G.gold||0);
  return `${shown||0}`.replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
function refreshRewardGoldUi(){
  const shown=typeof goldDisplayValue==='function'?goldDisplayValue():(Number(G.gold)||0);
  const text=rewardGoldText();
  const rwg=document.getElementById('rw-gold');
  if(rwg) rwg.textContent=text;
  document.querySelectorAll('.reward-prod-money-value').forEach(el=>{
    el.textContent=Number(shown||0).toLocaleString('ja-JP');
  });
  if(typeof updateHUD==='function') updateHUD();
}

function renderHandEditor(){
  if(typeof syncCardActivationPicking==='function') syncCardActivationPicking();
  if(typeof questCheckRetainedCards==='function') questCheckRetainedCards();
  if(typeof SaveProfile!=='undefined') SaveProfile.owned();
  if(G.phase!=='reward'&&G._tripleMergeHiddenIdx!=null) _clearTripleMergeHidden();
  _syncBoardCardVisibilityToggle();
  _syncRewardPanelPlacementOverlay();
  // ゲームオーバー画面・クリア画面でも魔導板のカード表示／非表示を切り替えられるので、
  // その2フェイズでは解除しない（解除すると切り替えた直後の再描画で元に戻ってしまう）。
  if(G.phase!=='reward'&&G.phase!=='gameover'&&G.phase!=='clear'&&document.body){
    document.body.classList.remove('right-card-peek');
  }
  const handPaneRoot=document.getElementById('hand-pane');
  if(G.phase!=='player'&&G.phase!=='reward'){
    if(handPaneRoot) handPaneRoot.style.display='none';
    const slots=document.getElementById('hand-slots');
    if(slots) slots.innerHTML='';
    if(typeof renderRewardOfferRow==='function') renderRewardOfferRow(false);
    return;
  }
  if(handPaneRoot) handPaneRoot.style.display='';
  if(G.phase!=='player') G._selectedBoardCardIdx=null;
  if(G.phase==='reward') G._showGlobalPanels=false;
  _ensureSelectedBoardUnitIdx();
  const selected=_getPartyBoardUnit();
  // 戦闘順序行の閉包が最新のunit.boardCards配列を参照するよう、正規化してからrenderRewardOfferRowを呼ぶ
  // （_normalizeUnitBoardCardsはboardCards配列を新しいオブジェクトに差し替えるため、順序を逆にすると
  // 　並べ替え操作が古い配列に対して行われ、実際の戦闘に反映されなくなる）
  if(selected) _normalizeUnitBoardCards(selected);
  if(typeof renderRewardOfferRow==='function'&&!G._isForge&&!G._isTavern) renderRewardOfferRow(G.phase==='reward'&&!G._isShop);
  const handMax=document.getElementById('hand-max');
  if(G._showGlobalPanels){
    G._selectedBoardCardIdx=null;
    const panels=G.globalPanels=G.globalPanels||new Array(7).fill(null);
    renderHeRow('hand-slots', panels, 0, 7, 'globalPanels');
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=panels.filter(Boolean).length;
    if(handMax) handMax.textContent=7;
  } else if(selected){
    const limit=getBoardCardLimit(selected);
    renderHeRow('hand-slots', selected.boardCards, 0, limit, 'boardCards');
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=selected.boardCards.filter(Boolean).length;
    if(handMax) handMax.textContent=limit;
  } else {
    const el=document.getElementById('hand-slots');
    if(el) el.innerHTML='';
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=0;
    if(handMax) handMax.textContent=0;
    if(handLabel) handLabel.childNodes[0].nodeValue='パネル ';
  }
  renderDebugCardPalette();
  _refreshMergeReadyMarks();
  // 特殊マスの出入りで「戦闘開始」等の可否が変わるので、盤面を描いたら毎回ボタンも作り直す。
  if(typeof renderMoveSlotsInEnemy==='function') renderMoveSlotsInEnemy();
}
// **「取ると合体」の光は描画時にしか計算していない。**
// 魔導板へ同じカードを2枚置いても、提示カード（報酬・商品）を作り直すまで
// 光らなかった。盤面を描き直すたびに、既に出ている提示カードの印を付け直す。
function _refreshMergeReadyMarks(){
  if(typeof document==='undefined') return;
  const cards=Array.isArray(_rewCards)?_rewCards:[];
  document.querySelectorAll('.rew-card[data-merge-rew-idx]').forEach(el=>{
    const i=Number(el.dataset.mergeRewIdx);
    const card=Number.isFinite(i)?cards[i]:null;
    if(!card) return;
    el.classList.toggle('merge-ready',!!_rewardMergeCandidate(i,card));
  });
}

function _wireHeCardDiscard(div,card,arr,arrName,i,_ringOfferDiscardable){
  const discardBtn=div.querySelector('.discard-btn,.shop-board-sell-action');
  if(discardBtn) {
    discardBtn.draggable=false;
    discardBtn.onmousedown=ev=>{ ev.stopPropagation(); };
    discardBtn.onclick=ev=>{
    ev.stopPropagation();
    if(_libraryTutorialIsMoveStep()) return;
    if(!_cardTradingRules().sellCards&&discardBtn.classList.contains('shop-board-sell-action')
      &&!['library-loan-return-btn','shop-return-btn','quest-part-btn','ring-offer-discard-btn','debug-discard-btn'].some(c=>discardBtn.classList.contains(c))) return;
    if(typeof questTryBlockedCardSale==='function'&&questTryBlockedCardSale(card)) return;
    if(discardBtn.classList.contains('library-loan-return-btn')){
      _returnLibraryLoanCard(i,card);
      return;
    }
    // SEはボタン種別で最初に決める。デバッグモード等の分岐が先にreturnしても
    // 「還魂＝ascension / 売却＝sell」が確実に鳴るようにする。
    if(!discardBtn.classList.contains('ring-offer-discard-btn')&&_boardCardSellEnabled(card)) _playRewardAcquireSfx('sell.wav');
    // 「返品」：買値と同額を返し、商品枠へ戻す。
    if(discardBtn.classList.contains('shop-return-btn')){
      const unit=_getPartyBoardUnit();
      returnShopPurchase(card,()=>{
        if(!unit) return;
        const boardList=_normalizeUnitBoardCards(unit);
        boardList[i]=null;
        unit.boardCards=boardList;
        _syncUnitPanelEffectsAfterMove(unit);
      });
      return;
    }
    // 「別れる」：カードを消す（お金は入らない）。失敗にするのは店を出る時（クエスト失敗警告）。
    if(discardBtn.classList.contains('quest-part-btn')){
      if(typeof playSfx==='function') playSfx('return',{group:'ui'});
      const unit=_getPartyBoardUnit();
      if(unit&&typeof questPartWithCard==='function'&&questPartWithCard(card)){
        const boardList=_normalizeUnitBoardCards(unit);
        boardList[i]=null;
        unit.boardCards=boardList;
        _syncUnitPanelEffectsAfterMove(unit);
        if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
      }
      renderHandEditor(); renderFieldEditor(); renderRewCards();
      return;
    }
    if(arrName==='boardCards'){
      // 指輪提示（還魂）中は最優先で廃棄カウントへ回す。デバッグモード分岐やショップ分岐が
      // 先にreturnすると_boardDiscardCountが増えず、3枚還魂しても指輪が解放されない。
      if(_ringOfferDiscardable){
        _discardBoardCardForRingOffer(i,card);
        return;
      }
      if(_boardCardSellEnabled(card)){
        const unit=_getPartyBoardUnit();
        if(unit){
          const boardList=_normalizeUnitBoardCards(unit);
          boardList[i]=null;
          unit.boardCards=boardList;
          _syncUnitPanelEffectsAfterMove(unit);
          const baseGain=_shopCardSellGain(card);
          const gain=typeof onGoldGained==='function'?onGoldGained(baseGain):baseGain;
          if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
          if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
        }
        refreshRewardGoldUi();
        renderHandEditor(); renderFieldEditor(); renderRewCards();
        if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
        return;
      }
      if(G&&G._debugMode){
        const unit=_getPartyBoardUnit();
        if(unit){
          const boardList=_normalizeUnitBoardCards(unit);
          boardList[i]=null;
          unit.boardCards=boardList;
          _syncUnitPanelEffectsAfterMove(unit);
          if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
        }
        renderHandEditor();
        renderFieldEditor();
        if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
        return;
      }
      if(_isCurrentRewardReturnCard(card)){
        const unit=_getPartyBoardUnit();
        if(unit){
          const boardList=_normalizeUnitBoardCards(unit);
          boardList[i]=null;
          unit.boardCards=boardList;
          _syncUnitPanelEffectsAfterMove(unit);
        }
        arr[i]=null;
        _restoreRewardReturnCard(card);
        _rewFreePickDone=false;
        renderRewCards(); renderHandEditor(); renderFieldEditor();
        if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
        return;
      }
      return;
    }
    if(arrName==='globalPanels') return;
    discardHeCard(arrName,i);
  };
  }
}

function _wireHeCardControls(div,card,arrName,i){
  if(arrName==='boardCards'&&typeof wireCardActivation==='function') wireCardActivation(div,card,i);
  // 起動の対象選び中は、選べないカードをアイテム使用中と同じ見た目で暗くして押せなくする（2026-10-26）。
  if(arrName==='boardCards'&&typeof cardActivationBoardDimmed==='function'&&cardActivationBoardDimmed(card,i)) div.classList.add('item-target-disabled');
  if(arrName==='boardCards'&&blessingFlameActive()&&blessingFlameWireCard(div,card,i)) return;
  // アイテム使用中は、対象になり得ないカードを暗くして選択不能にする。
  if(arrName==='boardCards'&&G._pendingItemUse&&typeof _isItemUseTargetSlot==='function'){
    if(_isItemUseTargetSlot(i)) div.classList.add('item-target-ok');
    else div.classList.add('item-target-disabled');
  }
  if(arrName==='boardCards') div.onclick=e=>{
    e.stopPropagation();
    // 起動（対象選び中の対象・起動できるカードのクリックで開始）。2026-10-23 からボタンではなくカードのクリック。
    if(typeof cardActivationClick==='function'&&cardActivationClick(i)) return;
    // 対象外スロットは何も起こさない（アイテムを無駄に消費させない）。
    if(G._pendingItemUse&&typeof _isItemUseTargetSlot==='function'&&!_isItemUseTargetSlot(i)) return;
    if(typeof handlePendingItemBoardTarget==='function'&&handlePendingItemBoardTarget(i)) return;
    if(G._isForge&&typeof _isMapForgeBlockedSlot==='function'&&_isMapForgeBlockedSlot(i)) return;
    if(G._isForge&&typeof applyPendingMapForgePower==='function'&&applyPendingMapForgePower(i)) return;
    if(G._pendingPanelPlacement){ placePendingPanelToSelectedUnit(i); return; }
    // 還魂も右上のボタンではなくカードのクリック（2026-10-23 利用者指定）。
    if(_ringOfferDiscardableCard(card)){ _discardBoardCardForRingOffer(i,card); return; }
    if(G.phase==='player') return;
  };
  if(arrName==='globalPanels') div.onclick=e=>{
    e.stopPropagation();
    if(G._pendingPanelPlacement){ placePendingPanelToGlobal(i); return; }
  };
  if(G.phase==='reward'&&arrName==='spells'&&!card.noRewardUse&&card.allowRewardUse){
  div.onclick=()=>useSpell(i);
  }
  if(G.phase==='player'&&arrName==='spells'&&card.allowBattleUse){
    div.onclick=()=>useSpell(i);
  }
  if(arrName!=='globalPanels'){
    div.addEventListener('dragstart',e=>{
      if(arrName==='boardCards'&&_cardIsSuppressionEngraving(card)) { e.preventDefault(); return; }
      if(arrName==='boardCards'&&_libraryTutorialIsMoveStep()) { e.preventDefault(); return; }
      _dragSrc=arrName==='boardCards'?{arr:arrName,idx:i,unitIdx:G._selectedBoardUnitIdx}:{arr:arrName,idx:i};
      if(arrName==='boardCards'){
        _detachBoardConnectionVisuals(i,div,card);
        _setDragZoneClass('dragzone-board');
      }
      e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); div.classList.add('dragging'); _hideDragSourceParts(div);
    });
    div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    div.addEventListener('dragend',()=>{ _restoreDragSourceParts(div); div.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; if(arrName==='boardCards') renderHandEditor(); });
  }
  div.addEventListener('dragover',e=>{
    // 置けないマス（ファラなど「特殊マス専用」のカード、入れ替えで相手が特殊マス外へ出る場合）は光らせない。
    if(arrName==='boardCards'&&!_boardDropAllowedAt(i)) return;
    e.preventDefault(); div.classList.add('drag-over');
  });
  div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
  div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); if(arrName!=='globalPanels') dropOnCard(arrName,i); });
}

function _renderHeEmptySlot(el,arrName,i,_slotDef,_handPos,_handMid,_handArc){
  const ph=document.createElement('div');
  ph.className='card-empty spell';
  if(arrName==='boardCards'&&G&&G._mapForgeAnimating&&!_dragSrc){
    ph.classList.add('map-forge-roll-card-fade');
    if(Array.isArray(G._mapForgeCandidateSlots)&&G._mapForgeCandidateSlots.includes(i)) ph.classList.add('map-forge-roll-candidate');
    if(G._mapForgeHighlightSlot===i) ph.classList.add('map-forge-roll-highlight');
  }
  if(arrName==='boardCards'||arrName==='globalPanels'){
    ph.classList.add('board-empty',`board-slot-${_slotDef.kind}`);
  }
  if(arrName==='boardCards'&&G._pendingPanelPlacement&&G._pendingPanelPlacement.card
    &&_cardRequiresDeployableSlot(G._pendingPanelPlacement.card)
    &&typeof _canCardUseBoardSlot==='function'
    &&!_canCardUseBoardSlot(G._pendingPanelPlacement.card,i,_getPartyBoardUnit())){
    ph.classList.add('invalid-battle-position');
  }
  const _emptyMapPowerId=arrName==='boardCards'&&typeof mapPanelPowerIdAt==='function'?mapPanelPowerIdAt(i):'';
  const _emptyPowerId=_emptyMapPowerId;
  if(arrName==='boardCards'&&_emptyMapPowerId) ph.dataset.mapBoard=_emptyMapPowerId;
  if(arrName==='boardCards'&&_emptyMapPowerId&&Assets.mapBoard&&Assets.mapBoard[_emptyMapPowerId]){
    const _boardWidth={eternal:'109.6%',resonance:'112.7%',duplicate:'105.5%'}[_emptyMapPowerId]||'100%';
    ph.style.setProperty('background',`url("${Assets.mapBoard[_emptyMapPowerId]}") center/${_boardWidth} 100% no-repeat`,'important');
    // 占有時のmap-boundary-layerと同じ、カード箱内の5px線に統一する。
    // outline／外向きshadowを使うと、カード移動時だけマス線の外寸が変わる。
    ph.style.setProperty('box-sizing','border-box','important');
    // `background` shorthand は background-origin も padding-box に戻す。
    // 5px枠を追加した特殊マスでは、それによりSVG自身の2px外周が5px内側へ
    // もう一本見えるため、背景の基準を明示的に外枠へ揃える。
    ph.style.setProperty('background-origin','border-box','important');
    ph.style.setProperty('background-clip','border-box','important');
    // 5px枠・outline:0・box-shadow:none は CSS（`#hand-slots.board-slots > .card-empty[data-map-board]`）が持つ。
    // **ここで要素へ直接 !important で書かない。** 直接指定はCSSのどの規則にも勝つため、
    // カードを持って重ねた時の発光（.drag-over）が空の特殊マスだけ出なかった（利用者報告）。
  }
  if(arrName==='boardCards'&&_emptyMapPowerId){
    // ①〜⑦：戦闘フェイズで出撃する枠（magic_board1.svgで区別する）
    ph.classList.add('deploy-slot');
  }
  if(arrName==='spells') ph.classList.add('belt-empty');
  ph.style.setProperty('--hand-i',_handPos);
  ph.style.setProperty('--hand-mid',_handMid);
  ph.style.setProperty('--hand-arc',_handArc);
  if(arrName==='boardCards'&&_slotDef){
    const _emptyPowerDef=_emptyPowerId&&typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.find(p=>p.id===_emptyPowerId):null;
    if(_emptyPowerDef){
      ph.setAttribute('data-panel-power-preview',[
        _emptyPowerDef.name,
        _emptyPowerDef.desc||''
      ].filter(Boolean).join('\n'));
    }
    ph.innerHTML=`<div class="board-slot-label">${_slotDef.label}${_emptyPowerDef?`<small>${_emptyPowerDef.name}</small>`:''}</div>`;
  }
  ph.addEventListener('dragover',e=>{
    if(arrName==='globalPanels') return;
    if(arrName==='boardCards'&&!_boardDropAllowedAt(i)) return;
    if(arrName==='boardCards'&&_dragSrc&&_dragSrc.arr==='rew'&&_isItemCard(_rewCards[_dragSrc.idx])) return;
    if(arrName==='boardCards'&&_dragSrc){
      const c=_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:_dragSrc.arr==='boardCards'?(_getPartyBoardUnit()?.boardCards||[])[_dragSrc.idx]:_dragSrc.card;
      if(!_libraryTutorialAllowsMove(c,i)) return;
      if(c&&(!_canCardUseBoardSlot(c,i,_getPartyBoardUnit()))) return;
    }
    e.preventDefault(); ph.classList.add('drag-over');
  });
  ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
  ph.addEventListener('drop',e=>{
    e.preventDefault(); ph.classList.remove('drag-over');
    if(arrName==='globalPanels') return;
    ph._skipNextClick=true;
    if(arrName==='boardCards'&&_dragSrc){
      const c=_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:_dragSrc.arr==='boardCards'?(_getPartyBoardUnit()?.boardCards||[])[_dragSrc.idx]:_dragSrc.card;
      if(!_libraryTutorialAllowsMove(c,i)){ _dragSrc=null; return; }
    }
    if(arrName==='boardCards'&&_dragSrc){
      if(_dragSrc.arr==='spellSlots'){
        _dragSrc=null;
        return;
      }
      const srcCard=_dragSrc.arr==='boardCards'?(_getPartyBoardUnit().boardCards||[])[_dragSrc.idx]
        :_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]
        :null;
      if(srcCard&&!_canCardUseBoardSlot(srcCard,i,_getPartyBoardUnit())){
        _dragSrc=null;
        return;
      }
    }
    dropOnCard(arrName,i);
  });
  if(arrName==='boardCards') ph.onclick=e=>{
    e.stopPropagation();
    if(ph._skipNextClick){ ph._skipNextClick=false; return; }
    if(G._isForge&&typeof _isMapForgeBlockedSlot==='function'&&_isMapForgeBlockedSlot(i)) return;
    if(G._isForge&&typeof applyPendingMapForgePower==='function'&&applyPendingMapForgePower(i)) return;
    if(G._pendingPanelPlacement){ placePendingPanelToSelectedUnit(i); return; }
  };
  if(arrName==='globalPanels') ph.onclick=e=>{
    e.stopPropagation();
    if(ph._skipNextClick){ ph._skipNextClick=false; return; }
    if(G._pendingPanelPlacement){ placePendingPanelToGlobal(i); return; }
  };
  el.appendChild(ph);
}

function renderHeRow(elId, arr, startIdx, count, arrName){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const Hcols=count;
  const battleMagic=elId==='hand-slots'&&G.phase==='player'&&arrName==='globalPanels';
  const rewardUnitPanels=elId==='hand-slots'&&arrName==='boardCards';
  el.classList.toggle('board-slots',elId==='hand-slots'&&arrName==='boardCards');
  el.classList.toggle('battle-magic-slots',battleMagic);
  el.style.setProperty('grid-template-columns',battleMagic?'repeat(2,var(--hand-card-w))':(rewardUnitPanels?'repeat(5,var(--hand-card-w))':`repeat(${Hcols},var(--hand-card-w,300px))`),'important');
  if(battleMagic) el.style.setProperty('grid-template-rows','repeat(3,var(--hand-card-h))','important');
  if(rewardUnitPanels) el.style.setProperty('grid-template-rows','repeat(3,var(--hand-card-h))','important');
  el.style.setProperty('justify-content',battleMagic?'start':(elId==='hand-slots'?'center':((arrName==='boardCards'||arrName==='globalPanels')?'center':'start')),'important');
  if(elId==='hand-slots'){
    const handPane=document.getElementById('hand-pane');
    if(handPane){
      const rewardUnitPanelW='calc(var(--hand-card-w) * 5 + var(--field-gap) * 4)';
      const rewardUnitPanelH='calc(var(--hand-card-h) * 3 + var(--field-gap) * 2)';
      const prodRewardBoard=rewardUnitPanels&&document.body&&document.body.classList.contains('reward-screen-active');
      // 報酬カード枠（#reward-offer-section、left:1125px）と魔導板枠（#hand-pane-board-bg、left:1125px/top:683px）
      // に合わせる。魔導板のグリッド(#hand-pane)は枠より20px左から始まるため left:1105px。
      handPane.style.setProperty('left',battleMagic?'var(--right-stack-left)':(prodRewardBoard?'1105px':'50%'),'important');
      handPane.style.setProperty('right','auto','important');
      handPane.style.setProperty('top',battleMagic?'250px':(rewardUnitPanels?(prodRewardBoard?'683px':'650px'):'auto'),'important');
      handPane.style.setProperty('bottom',(battleMagic||rewardUnitPanels)?'auto':'62px','important');
      handPane.style.setProperty('width',battleMagic?'var(--right-stack-w)':(rewardUnitPanels?(prodRewardBoard?'1632px':rewardUnitPanelW):'2440px'),'important');
      handPane.style.setProperty('height',battleMagic?'calc(var(--hand-card-h) * 3 + var(--field-gap) * 2)':(rewardUnitPanels?(prodRewardBoard?'1407px':rewardUnitPanelH):'var(--hand-card-h)'),'important');
      handPane.style.setProperty('transform',(battleMagic||prodRewardBoard)?'none':'translateX(-50%)','important');
      handPane.style.setProperty('flex','none','important');
    }
  }
  for(let i=startIdx;i<startIdx+Hcols;i++){
    const _handPos=i-startIdx;
    const _handMid=(Math.min(count,Hcols)-1)/2;
    const _handArc=Math.abs(_handPos-_handMid);
      const _slotUnit=arrName==='boardCards'?_getPartyBoardUnit():null;
      const _slotDef=arrName==='boardCards'?_boardSlotDef(i,_slotUnit):arrName==='globalPanels'?{label:`全体${i+1}`,kind:'global'}:null;
      const _deployNum=arrName==='boardCards'?MAIN_BOARD_DEPLOY_SLOTS.indexOf(i):-1;
      if(i>=startIdx+count){
      // 未解放スロット
      const ph=document.createElement('div'); ph.className='card-empty spell'; ph.style.opacity='0.1';
      ph.style.setProperty('--hand-i',_handPos);
      ph.style.setProperty('--hand-mid',_handMid);
      ph.style.setProperty('--hand-arc',_handArc);
      el.appendChild(ph); continue;
    }
    // **トリプル合体の演出中は、合体先のマスを空きマスとして描く。**
    // カード要素は自分の背景に枠（--card-frame）を描くため、中身だけ隠しても
    // 合体後の枠（*_m.svg）だけが先に見えていた（利用者報告）。
    const card=(arrName==='boardCards'&&G._tripleMergeHiddenIdx===i)?null:arr[i];
    if(card){
      const div=document.createElement('div');
      const _isRingInHand=card.type==='ring'||!card.type||card.kind==='summon'||card.kind==='passive';
      const t=_isRingInHand?'ring':(card.type||'');
      div.className=`card ${t}`;
      if(card.rarity>=1&&card.rarity<=5) div.classList.add(`rarity-${card.rarity}`);
      if(arrName==='boardCards') div.dataset.boardIdx=String(i);
      // ロール演出中に別カードをドラッグ操作すると、その途中の再描画で候補/当選演出だけが
      // 残ってドラッグ中もずっと発光して見えてしまうため、ドラッグ中は演出クラスを付けない。
      if(arrName==='boardCards'&&G&&G._mapForgeAnimating&&!_dragSrc){
        div.classList.add('map-forge-roll-card-fade');
        if(Array.isArray(G._mapForgeCandidateSlots)&&G._mapForgeCandidateSlots.includes(i)) div.classList.add('map-forge-roll-candidate');
        if(G._mapForgeHighlightSlot===i) div.classList.add('map-forge-roll-highlight');
      }
      if(_slotDef) div.classList.add(`board-slot-${_slotDef.kind}`);
      const _mapPowerId=arrName==='boardCards'&&typeof mapPanelPowerIdAt==='function'?mapPanelPowerIdAt(i):'';
      const _powerId=_mapPowerId;
      const _powerDef=_powerId&&typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.find(p=>p.id===_powerId):null;
      const _displayCard=_powerDef&&typeof coreMapPanelPowerDisplayCard==='function'
        ?coreMapPanelPowerDisplayCard(card,_powerDef.desc):card;
      const _hasMapDeployPower=!!_mapPowerId;
      if(arrName==='boardCards'&&_mapPowerId) div.dataset.mapBoard=_mapPowerId;
      if(arrName==='boardCards'&&_mapPowerId&&Assets.mapBoard&&Assets.mapBoard[_mapPowerId]){
        div.style.setProperty('background-image',`url("${Assets.mapBoard[_mapPowerId]}")`,'important');
      }
      if(_deployNum>=0||_hasMapDeployPower){ div.classList.add('deploy-slot'); }
      const _selectedBoardDead=arrName==='boardCards'&&_getPartyBoardUnit()?.hp<=0;
      if(typeof applyCardVisual==='function') applyCardVisual(div,_displayCard);
      else if(typeof getCardAsset==='function'&&typeof assetUrl==='function') div.style.setProperty('--card-art',assetUrl(getCardAsset(_displayCard)));
      if(arrName==='boardCards'&&_mapPowerId&&Assets.mapBoard&&Assets.mapBoard[_mapPowerId]){
        const _boardWidth={eternal:'109.6%',resonance:'112.7%',duplicate:'105.5%'}[_mapPowerId]||'100%';
        div.style.setProperty('background',`url("${Assets.mapBoard[_mapPowerId]}") center/${_boardWidth} 100% no-repeat`,'important');
      }
      div.style.paddingBottom='22px'; // 破棄ボタン分の余白確保
      const _boardMovementLocked=arrName==='boardCards'&&_cardIsSuppressionEngraving(card);
      div.draggable=arrName!=='globalPanels'&&!_boardMovementLocked;
      if(_boardMovementLocked) div.classList.add('suppression-engraving-locked');
      const _rewPhaseInv=!G._isShop&&G.phase==='reward';
      if(_isRingInHand&&_rewPhaseInv) div.style.cssText=(div.style.cssText||'')+';opacity:0.45;filter:grayscale(0.45)';
      div.style.setProperty('--hand-i',_handPos);
      div.style.setProperty('--hand-mid',_handMid);
      div.style.setProperty('--hand-arc',_handArc);
      const _isPanelCharacter=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'')==='キャラクター';
      if(_isPanelCharacter) div.classList.add('character-card','panel-character-card');
      if(_isPanelCharacter&&card.color) div.setAttribute('data-preview-title-color',String(card.color));
      if(arrName==='boardCards'&&_isPanelCharacter&&_deployNum<0&&!_hasMapDeployPower) div.classList.add('invalid-battle-position');
      const _isEnchantPanelForClass=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&['強化','エンチャント'].includes(String(card.category||''));
      if(_isEnchantPanelForClass) div.classList.add('enchantment-card');
      const _gradeEl='';
      const _costOwner=arrName==='boardCards'?_getPartyBoardUnit():null;
      const _costEnh=_costOwner&&typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(_costOwner,i):null;
      const _costCard=_costEnh
        ?{..._displayCard,
          keywords:[...(_displayCard.keywords||[]),...(_costEnh.keywords||[])],
          _extraManaCosts:Array.isArray(_costEnh.manaThresholds)
            ?_costEnh.manaThresholds.map(t=>Number(t&&t.cost)||0).filter(Boolean):[]}
        :_displayCard;
      const _manaCostEl=typeof cardManaCostHtml==='function'?cardManaCostHtml(_costCard):'';
      const _sealCostEl=typeof cardSealCostHtml==='function'?cardSealCostHtml(_costCard):'';
      const _isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
      const _isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
      const _isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
      // 祭壇の指輪提示中は、そのターンに取得したばかりのカード（＝「報酬に戻す」対象）も含め、
      // 魔導板上の全カード（キャラクター・強化とも）を廃棄カウントの対象にする。
      // 以前は_isCurrentRewardReturnCardを除外していたため、そのカードの×が「報酬に戻す」として
      // 処理されて_boardDiscardCountが増えず、3枚のはずが4枚廃棄しないと解放されない不具合があった。
      const _ringOfferDiscardable=arrName==='boardCards'&&_ringOfferDiscardableCard(card);
      const _boardSellable=_boardCardSellEnabled(card);
      const _shopSellBaseGain=_boardSellable?_shopCardSellGain(card):0;
      const _shopSellGain=_boardSellable?(typeof goldIncomeAmount==='function'?goldIncomeAmount(_shopSellBaseGain):_shopSellBaseGain):0;
      // クエストに必須のカード（ファラなど）は、ショップでは値段の代わりに「別れる」を出す（quest.js）。
      const _questPartable=arrName==='boardCards'&&!_cardIsEngraved(card)
        &&typeof questCardPartable==='function'&&questCardPartable(card);
      const _shopReturnable=arrName==='boardCards'&&isShopReturnable(card);
      const _libraryReturnable=arrName==='boardCards'&&G&&G._isLibrary&&card._libraryLoan;
      const _spellBtn=arrName==='boardCards'
        ?(_libraryReturnable
          ?`<button type="button" class="discard-btn shop-board-sell-value shop-board-sell-action library-loan-return-btn" data-sfx-silent="1">${_uiLabel('「返却」ボタン','返却')}</button>`
          :_shopReturnable
          ?`<button type="button" class="discard-btn shop-board-sell-value shop-board-sell-action shop-return-btn" data-sfx-silent="1">${_shopReturnLabel()}</button>`
          :_questPartable
          ?`<button type="button" class="discard-btn shop-board-sell-value shop-board-sell-action quest-part-btn" data-sfx-silent="1">${_uiLabel('「別れる」ボタン','別れる')}</button>`
          :_boardSellable
          ?`<button type="button" class="discard-btn shop-board-sell-value shop-board-sell-action" data-sfx-silent="1">+${_shopSellGain}G</button>`
          // デバッグモードでは右上に「廃棄」を出す（お金は入らない。2026-10-26 利用者指定）。
          :G&&G._debugMode&&!_ringOfferDiscardable
          ?`<button type="button" class="discard-btn shop-board-sell-value shop-board-sell-action debug-discard-btn" data-sfx-silent="1">${_uiLabel('「廃棄」ボタン','廃棄')}</button>`
          // 還魂は右上のボタンを出さず、カードのクリックで行う（2026-10-23 利用者指定。_wireHeCardControls）。
          :'')
        :'';
      if(_powerDef){
        div.setAttribute('data-panel-power-preview',[
          _powerDef.name,
          _powerDef.desc||''
        ].filter(Boolean).join('\n'));
      }
      const _slotLabel=_slotDef?`<div class="board-slot-label">${_slotDef.label}${_powerDef?`<small>${_powerDef.name}</small>`:''}</div>`:'';
      if(_powerDef) div.setAttribute('data-map-power-preview',[
        _powerDef.name,
        _powerDef.desc||''
      ].filter(Boolean).join('\n'));
      const _dirOwner=arrName==='boardCards'?_getPartyBoardUnit():null;
      const _dirConnectivity=_dirOwner&&typeof _panelDirectionConnectivity==='function'?_panelDirectionConnectivity(_dirOwner,i):null;
      const _dirMarks=typeof panelDirectionMarksHtml==='function'?panelDirectionMarksHtml(card,_dirConnectivity):'';
      if(_isPanelCharacter){
        const _panelOwner=arrName==='boardCards'?_getPartyBoardUnit():null;
        const st=_panelCharacterPreviewStats(_panelOwner,arrName==='boardCards'?i:null,_displayCard);
        const shown=arrName==='boardCards'&&typeof cardActivationShownStats==='function'?cardActivationShownStats(card,st):st;
        const pAtk=shown.atk, pHp=shown.hp;
        // HPを減少させる強化でHPが0になったキャラクターは、出撃不可のキャラと同じ見た目で暗くする。
        // 「特殊マス以外に置かれて出撃できない」場合は魔導板の枠を明るく残す仕様なので、
        // HP0だけは別クラス（board-hp-zero）も付け、枠画像とマナ／生贄アイコンまで暗くする。
        if(arrName==='boardCards'&&pHp<=0) div.classList.add('invalid-battle-position','board-hp-zero');
        // シート「キーワード」列由来のcard.keywordsに、このスロットへ隣接接続している強化パネルの
        // 付与キーワードもマージした上で_unitPreviewText()に渡す（敵ユニットと同じ表示規則で
        // 「キーワード：〇〇」行として太字合成される。本文が空のカードでも説明が空にならない）。
        // boardCardsは実際の盤面（_panelOwner.boardCards＝G.mainBoard）を参照させることで、
        // _unitPreviewText内部の_groupedEnchantEffectTexts()が接続中の強化カード効果全文も
        // 正しく含められるようにする（キーワードのみ渡すと接続効果文が別途二重表示されてしまう）。
        const _enh=_panelOwner&&typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(_panelOwner,i):{keywords:[]};
        const _cardForPreview=_panelOwner?{..._displayCard,keywords:[...(_displayCard.keywords||[]),...(_enh.keywords||[])],boardCards:_panelOwner.boardCards,_ownedBoardPreview:true}:_displayCard;
        // 「結界X」は_unitDisplayKeywords内でunit.shield（数値）から合成表示するため、戦闘中の
        // _applyAdjacentPanelEnhancementsと同じ計算（複数の結界付与元をXに合算）をここでも行っておく。
        // これがないと、接続した結界がいくつあっても編成画面のキーワード欄に「結界X」が出ない。
        if(typeof _unitShieldValue==='function') _cardForPreview.shield=_unitShieldValue(_cardForPreview);
        // **商店と同じ効果文を渡すこと。** 生の card.desc を渡すと
        // 「〜を持つX/Xの」（召喚体の注釈）やGrade置換が抜け、魔導板に置いた途端に
        // 説明が商品と食い違う（ケットシー等。利用者報告 2026-09-22）。
        const _charDescForPreview=typeof _rawSubstitutedDesc==='function'
          ?_rawSubstitutedDesc(_displayCard):String(_displayCard.desc||'');
        const _keywordPreview=typeof _keywordOnlyPreviewText==='function'?_keywordOnlyPreviewText(_cardForPreview,_charDescForPreview,i):'';
        if(_keywordPreview) div.setAttribute('data-keyword-preview',_keywordPreview);
        const preview=typeof _unitPreviewText==='function'?_unitPreviewText(_cardForPreview,_charDescForPreview,i):(card.name+'\n'+_charDescForPreview);
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}${_dirMarks}<div class="card-art"></div><span class="card-summon-atk${_cardStatPairDigitClass(pAtk,pHp)}">${pAtk}</span><span class="card-summon-hp${_cardStatPairDigitClass(pAtk,pHp)}">${pHp}</span>${_spellBtn}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,_displayCard);
        if(_panelOwner&&typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(div,_panelOwner,G._selectedBoardUnitIdx,i);
      }else if(_isPanelCard&&['強化','エンチャント'].includes(String(card.category||''))){
        // data-previewはホバー時に_formatPreviewHtmlで改めてHTMLタグ除去→マナアイコン挿入を行うため、
        // ここでcomputeDesc()の結果（既にマナアイコンの<img>タグが埋め込み済み）を使うとタグごと
        // 除去されて色情報が消えてしまう。生のcard.descを渡す。
        // 本文に「効果なし」を含む場合は説明文を表示しない。シート「キーワード」列（adjacentKeywords）が
        // あれば「キーワード：〇〇」行として表示する（隣接キャラクターへ付与するキーワード）。
        const _panelDescRaw=/効果なし/.test(String(_displayCard.desc||''))?'':(typeof _plainEffectTextForPreview==='function'?_plainEffectTextForPreview(_displayCard):(_displayCard.desc||''));
        const _panelDescForPreview=card.name==='封印されしもの'
          ?String(_panelDescRaw||'').replace(/^封印\d+\s*/,'').trim():_panelDescRaw;
        // キーワード欄の中身は render.js の _enchantPreviewKeywords() が唯一の実装。
        const _adjKws=typeof _enchantPreviewKeywords==='function'?_enchantPreviewKeywords(_displayCard):[];
        const preview=[typeof _cardUiName==='function'?_cardUiName(card):card.name,_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:'',_panelDescForPreview].filter(Boolean).join('\n');
        if(preview) div.setAttribute('data-preview',preview);
        const _keywordPreview=typeof _keywordOnlyPreviewText==='function'
          ?_keywordOnlyPreviewText({..._displayCard,keywords:_adjKws}):'';
        if(_keywordPreview) div.setAttribute('data-keyword-preview',_keywordPreview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}${_dirMarks}<div class="card-art"></div>${_spellBtn}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,_displayCard);
        if(arrName==='boardCards'&&typeof _wireEnchantSelfHover==='function') _wireEnchantSelfHover(div,_getPartyBoardUnit(),i);
      }else if(typeof _isSpellCard==='function'&&_isSpellCard(card)){
        div.classList.add('spell-card');
        const preview=[typeof _cardUiName==='function'?_cardUiName(card):card.name,typeof _previewRarityLine==='function'?_previewRarityLine(card):'',card.desc||''].filter(Boolean).join('\n');
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}<div class="card-art"></div>${_spellBtn}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
      }else{
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}${_dirMarks}<div class="card-art"></div>${_spellBtn}`;
      }
      if(arrName==='boardCards') _ensureCardBackLayer(div);
      // 魔導板枠はカード固有の::after（キャラ枠）と競合しない独立レイヤーとして常設する。
      if(arrName==='boardCards'){
        const characterFrame=document.createElement('span');
        characterFrame.className='character-frame-layer';
        characterFrame.setAttribute('aria-hidden','true');
        if(_isPanelCharacter||_isEnchantPanelForClass){
          // キャラクターとエンチャントのカード枠を同じ実要素で描く。
          // 疑似要素に残すと、body直下のゴーストで線幅を補正できない。
          // カード枠は置かれたマスに関係なく常に2px。特殊マスの5px線は
          // map-boundary-layerだけが担当する。
          characterFrame.style.setProperty('border','2px solid #c49a6c','important');
          characterFrame.style.setProperty('border-width','2px','important');
          characterFrame.style.setProperty('background-origin','border-box','important');
          if(_isEnchantPanelForClass) characterFrame.style.setProperty('background','var(--card-frame) center/100% 100% no-repeat');
          div.appendChild(characterFrame);
        }
        if(_isPanelCharacter){
          const statOverlay=document.createElement('span');
          statOverlay.className='unit-stat-overlay-layer';
          statOverlay.setAttribute('aria-hidden','true');
          div.appendChild(statOverlay);
        }
        const cardGlow=document.createElement('span');
        cardGlow.className='card-glow-layer';
        cardGlow.setAttribute('aria-hidden','true');
        div.appendChild(cardGlow);
        // 右クリック透明化時にも通常マスの外周を復元できるよう、
        // 全カードに独立フレームを持たせる（通常時の表示可否はCSS側で制御）。
        const boardFrame=document.createElement('span');
        boardFrame.className='board-frame-layer';
        boardFrame.setAttribute('aria-hidden','true');
        // 出撃不可の暗転はカード画像とcharacter-frame-layerだけに適用する。
        // プログラム生成の通常マス2px線は常に明るく保つため、過去の高詳細度な
        // dragzone暗転CSSにも負けないよう実レイヤー側で固定する。
        if(div.classList.contains('invalid-battle-position')&&!div.dataset.mapBoard){
          boardFrame.style.setProperty('filter','none','important');
          boardFrame.style.setProperty('opacity','1','important');
        }
        div.appendChild(boardFrame);
        if(div.dataset.mapBoard){
          const mapBoundary=document.createElement('span');
          mapBoundary.className='map-boundary-layer';
          mapBoundary.setAttribute('aria-hidden','true');
          div.appendChild(mapBoundary);
        }
      }
      _wireHeCardDiscard(div,card,arr,arrName,i,_ringOfferDiscardable);
      _wireHeCardControls(div,card,arrName,i);
      el.appendChild(div);
    } else {
      _renderHeEmptySlot(el,arrName,i,_slotDef,_handPos,_handMid,_handArc);
    }
  }
  if(arrName==='boardCards'){
    const _uniteOwner=_getPartyBoardUnit();
    if(G&&G._mapForgeAnimating){
      try{ el.querySelectorAll('.panel-unite-link').forEach(n=>n.remove()); }catch(e){}
      return;
    }
    // ここで例外が発生すると、呼び出し元のrenderHandEditor()がこの後に行う
    // hand-count/hand-max更新や、さらにその呼び出し元（配置・破棄処理）の後続処理まで
    // 中断されてしまい、「破棄ボタンが押せない」「新しいカードを配置できない」といった
    // 一見無関係な不具合として現れる。接続線の描画失敗がボード全体の操作不能に
    // 連鎖しないよう、ここで確実に食い止める。
    try{
      if(typeof _renderPanelUniteMarkers==='function') _renderPanelUniteMarkers(el,_uniteOwner);
    }catch(e){
      console.error('[_renderPanelUniteMarkers]',e);
    }
  }
}

// 強化カード同士（または本体・召喚キャラクター）がつながっている箇所に、矢印の代わりに
// 2枚のカードのちょうど中間へunite画像（縦=unite_a／横=unite_b）を1つだけ描画する
function _renderPanelUniteMarkers(host, unit){
  if(!host) return;
  host.querySelectorAll('.panel-unite-link').forEach(n=>n.remove());
  if(!unit||typeof _panelDirectionConnectivity!=='function'||typeof _panelGridPos!=='function') return;
  if(getComputedStyle(host).position==='static') host.style.position='relative';
  const eq=Array.isArray(unit.boardCards)?unit.boardCards:[];
  // HP0のキャラクターパネルも接続表示の対象に含める（unite画像を描かずにいると
  // arrow画像が出て接続が途切れて見えるため）。操作の妨げにならないよう、
  // .panel-unite-linkはpointer-events:none、廃棄ボタンはより上のz-indexで維持する。
  const seen=new Set();
  const _DIR_DELTA={up:{dx:0,dy:-1},right:{dx:1,dy:0},down:{dx:0,dy:1},left:{dx:-1,dy:0}};
  const _OPPOSITE_DIR={up:'down',right:'left',down:'up',left:'right'};
  eq.forEach((panel,idx)=>{
    if(!panel||!Array.isArray(panel.directions)||!panel.directions.length) return;
    const connectivity=_panelDirectionConnectivity(unit,idx);
    const pos=_panelGridPos(idx);
    panel.directions.forEach(d=>{try{
      if(connectivity[d]!=='connected') return;
      const delta=_DIR_DELTA[d];
      if(!delta) return;
      const targetPos={x:pos.x+delta.dx,y:pos.y+delta.dy};
      let targetIdx=-1;
      for(let i=0;i<eq.length;i++){ const p=_panelGridPos(i); if(p.x===targetPos.x&&p.y===targetPos.y){ targetIdx=i; break; } }
      if(targetIdx<0) return;
      const targetPanel=eq[targetIdx];
      if(!targetPanel) return;
      const isCharTarget=targetPanel&&String(targetPanel.category||'')==='キャラクター';
      // 強化カード同士の相互接続は両側から検出されるため、正準方向（down/right）からのみ描画して重複を防ぐ
      if(!isCharTarget&&d!=='down'&&d!=='right') return;
      const pairKey=[idx,targetIdx].sort((a,b)=>a-b).join('-');
      if(seen.has(pairKey)) return;
      seen.add(pairKey);
      const srcEl=host.querySelector(`[data-board-idx="${idx}"]`);
      const dstEl=host.querySelector(`[data-board-idx="${targetIdx}"]`);
      if(!srcEl||!dstEl) return;
      const vertical=(d==='up'||d==='down');
      // ページ全体が--game-scale（3840x2160基準レイアウトを実ビューポートに合わせて縮小するCSS transform）で
      // 縮小表示されているため、getBoundingClientRect()はビューポート座標（縮小後）を返す。
      // position:absoluteのleft/topはホスト要素のローカル座標（縮小前＝基準レイアウト座標）で解釈されるため、
      // ここで--game-scaleで割って座標系を変換しないと、マーカーが実際の中間点からずれて表示される。
      const _gameScale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
      const hr=host.getBoundingClientRect();
      // **縮小率はホスト自身から実測する。** ゲームオーバー魔導板は画面全体の
      // --game-scale に加えて盤面ごと縮小されているため、--game-scale だけで割ると
      // 中点がカードからずれる（結合アイコンが中心から外れていた）。
      const _hostScale=(host.offsetWidth>0&&hr.width>0)?(hr.width/host.offsetWidth):_gameScale;
      const scale=_hostScale>0?_hostScale:1;
      const sr=srcEl.getBoundingClientRect();
      const dr=dstEl.getBoundingClientRect();
      const sx=(sr.left-hr.left)/scale+host.scrollLeft, sy=(sr.top-hr.top)/scale+host.scrollTop, sw=sr.width/scale, sh=sr.height/scale;
      const dx=(dr.left-hr.left)/scale+host.scrollLeft, dy=(dr.top-hr.top)/scale+host.scrollTop, dw=dr.width/scale, dh=dr.height/scale;
      let midX,midY;
      if(vertical){
        midX=(sx+sw/2+dx+dw/2)/2;
        midY=sy<dy?(sy+sh+dy)/2:(dy+dh+sy)/2;
      } else {
        midY=(sy+sh/2+dy+dh/2)/2;
        midX=sx<dx?(sx+sw+dx)/2:(dx+dw+sx)/2;
      }
      const marker=document.createElement('img');
      marker.src=vertical?'assets/cards/arrow_unite_a.png':'assets/cards/arrow_unite_b.png';
      marker.className=`panel-unite-link panel-unite-${vertical?'v':'h'}`;
      marker.dataset.srcIdx=String(idx);
      marker.dataset.dstIdx=String(targetIdx);
      marker.dataset.srcDir=d;
      marker.dataset.dstDir=_OPPOSITE_DIR[d]||'';
      marker.style.left=`${midX}px`;
      marker.style.top=`${midY}px`;
      // CSS側のpointer-events:noneが何らかの理由で効かない場合でも、接続線が
      // 破棄ボタン等のクリックを妨げないようインラインでも明示しておく（保険）。
      marker.style.pointerEvents='none';
      host.appendChild(marker);
    }catch(e){
      console.error('[_renderPanelUniteMarkers:connection]',idx,d,e);
    }});
  });
}

// ── 「帰滅」持ちのカードを持っている間は、置けるマスを全部光らせる ──
// 重ねたマスだけ光る .drag-over とは別に、ドラッグしている間ずっと .npc-drop-hint を付ける（2026-09-25 利用者指定）。
// 盤面はドラッグ中にも描き直されるので、ドラッグが終わるまで毎フレーム付け直す。
function _dragSrcCard(){
  if(!_dragSrc) return null;
  const unit=_getPartyBoardUnit();
  if(_dragSrc.arr==='rew') return _rewCards[_dragSrc.idx]||null;
  if(_dragSrc.arr==='boardCards') return ((unit&&unit.boardCards)||[])[_dragSrc.idx]||null;
  return _dragSrc.card||null;
}
function _syncNpcDropHints(){
  const exchanging=_syncExchangeShopDropHints();
  const card=_dragSrcCard();
  const on=!_isCardExchangeShop()&&_cardRequiresDeployableSlot(card);
  const srcIdx=on&&_dragSrc.arr==='boardCards'?_dragSrc.idx:-1;
  const questDrag=on&&typeof questRequestDragActive==='function'&&questRequestDragActive(card);
  const board=(_getPartyBoardUnit()||{}).boardCards||[];
  document.querySelectorAll('#hand-slots.board-slots > *').forEach((el,i)=>{
    // 依頼枠へ別カードを戻せない場合も、召喚可能な特殊マスの占有状態は知らせる。
    const allowed=on&&i!==srcIdx&&_canCardUseBoardSlot(card,i,_getPartyBoardUnit());
    const danger=allowed&&questDrag&&board[i]&&String(board[i].category||'')==='キャラクター';
    el.classList.toggle('npc-drop-hint',allowed&&(_boardDropAllowedAt(i)||danger));
    el.classList.toggle('npc-drop-danger',!!danger);
  });
  return on||exchanging;
}
let _npcDropHintFrame=0;
function _clearNpcDropHints(){
  _clearExchangeShopDropHints();
  if(_npcDropHintFrame) cancelAnimationFrame(_npcDropHintFrame);
  _npcDropHintFrame=0;
  document.querySelectorAll('.npc-drop-hint,.npc-drop-danger').forEach(el=>el.classList.remove('npc-drop-hint','npc-drop-danger'));
}
if(typeof window!=='undefined'){
  window.addEventListener('dragstart',()=>{
    const tick=()=>{ _npcDropHintFrame=0; if(_syncNpcDropHints()) _npcDropHintFrame=requestAnimationFrame(tick); };
    if(_npcDropHintFrame) cancelAnimationFrame(_npcDropHintFrame);
    _npcDropHintFrame=requestAnimationFrame(tick);
  });
  window.addEventListener('dragend',_clearNpcDropHints,true);
  window.addEventListener('drop',()=>setTimeout(_clearNpcDropHints,0),true);
}

// 魔導板のカードがあるマスへ、いまドラッグしているカードを落とせるか（発光の判定）。
// dropOnCard() と同じ条件：持っているカードがそのマスを使えること、入れ替えなら相手が元のマスを使えること。
function _boardDropAllowedAt(destIdx){
  if(!_dragSrc) return true;
  if(_dragSrc.arr==='rew'&&_isCardExchangeShop()) return canExchangeShopCardAt(_dragSrc.idx,destIdx);
  const unit=_getPartyBoardUnit();
  const board=(unit&&unit.boardCards)||[];
  const src=_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]
    :_dragSrc.arr==='boardCards'?board[_dragSrc.idx]
    :_dragSrc.card||null;
  if(!src) return true;
  if(_dragSrc.arr==='boardCards'&&_cardIsSuppressionEngraving(src)) return false;
  if(!_libraryTutorialAllowsMove(src,destIdx)) return false;
  if(!_canCardUseBoardSlot(src,destIdx,unit)) return false;
  const dest=board[destIdx];
  const merged=dest?_mergedPanelCard(dest,src):null;
  if(_dragSrc.arr==='rew'&&_shopOfferBoardSwapBlocked(src,dest,merged,true)) return false;
  // 依頼枠のカードを既存カードへ落とす時、押し出されるカードを依頼枠へ置けないなら発光させない。
  if(_dragSrc.arr==='rew'&&dest&&!merged&&!_rewardAreaAcceptsCard(dest)) return false;
  if(_dragSrc.arr==='boardCards'&&dest&&!merged&&!_canCardUseBoardSlot(dest,_dragSrc.idx,unit)) return false;
  return true;
}
function dropOnCard(destArr,destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  if(srcArr==='rew'&&_isCardExchangeShop()){
    _dragSrc=null;
    if(destArr==='boardCards') exchangeShopCard(srcIdx,destIdx);
    return;
  }
  const srcUnitIdx=_dragSrc.unitIdx;
  const debugCard=_dragSrc.card||null;
  const srcCard=srcArr==='debugPanel'?debugCard
    :srcArr==='rew'?_rewCards[srcIdx]
    :srcArr==='boardCards'?(_getPartyBoardUnit()?.boardCards||[])[srcIdx]
    :null;
  if(srcArr==='boardCards'&&_cardIsSuppressionEngraving(srcCard)) return;
  if(destArr==='boardCards'&&!_libraryTutorialAllowsMove(srcCard,destIdx)){
    _dragSrc=null;
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    return;
  }
  if(srcArr==='rew'&&destArr==='boardCards'){
    const destUnit=_getPartyBoardUnit();
    const dest=(destUnit&&destUnit.boardCards||[])[destIdx]||null;
    const merged=dest?_mergedPanelCard(dest,srcCard):null;
    if(_shopOfferBoardSwapBlocked(srcCard,dest,merged,true)){
      _dragSrc=null;
      if(typeof _removeDragGhost==='function') _removeDragGhost();
      if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
      return;
    }
  }
  _dragSrc=null;
  if(srcArr==='debugPanel'){
    if(destArr!=='boardCards'||!debugCard) return;
    G._pendingPanelPlacement={card:_preparePanelCard(debugCard),onPlaced:null,sourceName:'DEBUG',rewardIdx:-1};
    placePendingPanelToSelectedUnit(destIdx);
    return;
  }
  // 報酬カード（パネル）のドロップ購入
  if(srcArr==='rew'){
    const card=_rewCards[srcIdx];
    if(_isItemCard(card)) return;
    takeRewCard(srcIdx,destArr==='boardCards'?destIdx:undefined);
    return;
  }
  const _arrOf=name=>name==='rings'?G.rings:G.spells;
  if(destArr==='boardCards'){
    const destUnit=_getPartyBoardUnit();
    if(!destUnit||!_isNonCombatBoardPhase()) return;
    const destBoardList=_normalizeUnitBoardCards(destUnit);
    // メイン置き場は所有者を持たない単一の共有ボードのため、boardCards同士の移動は常に同じボード内の操作になる
    const srcUnit=srcArr==='boardCards'?destUnit:null;
    const srcBoardList=srcArr==='boardCards'?destBoardList:null;
    const src=_arrOf(srcArr);
    const card=srcArr==='boardCards'?(srcBoardList&&srcBoardList[srcIdx]):src[srcIdx];
    if(srcArr==='boardCards'&&srcIdx===destIdx) return;
    if(!card||!_canCardUseBoardSlot(card,destIdx,destUnit)) return;
    const destCard=destBoardList[destIdx]||null;
    const merged=_mergedPanelCard(destCard,card);
    if(merged){
      const nextBoardList=destBoardList.slice();
      nextBoardList[destIdx]=merged;
      if(!_canApplyBoardChange(destUnit,nextBoardList)) return;
      if(srcArr==='boardCards'){
        if(!srcBoardList) return;
        srcBoardList[srcIdx]=null;
      } else {
        src[srcIdx]=null;
      }
      destBoardList[destIdx]=merged;
      _syncUnitPanelEffectsAfterMove(destUnit);
      if(srcUnit) _syncUnitPanelEffectsAfterMove(srcUnit);
      if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
      renderHandEditor();
      if(srcArr==='boardCards'&&typeof playSfx==='function') playSfx('fit',{group:'reward'});
      _flashConnectedBoardCards(destIdx);
      renderFieldEditor();
      if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
      return;
    }
    if(srcArr==='boardCards'){
      if(!srcBoardList) return;
      const srcUnitForSlot=destUnit;
      if(destCard&&!_canCardUseBoardSlot(destCard,srcIdx,srcUnitForSlot)) return;
      const nextBoardList=srcBoardList.slice();
      nextBoardList[srcIdx]=destCard;
      nextBoardList[destIdx]=card;
      if(!_canApplyBoardChange(srcUnitForSlot,nextBoardList)) return;
      srcBoardList[srcIdx]=destCard;
    } else {
      const nextBoardList=destBoardList.slice();
      nextBoardList[destIdx]=card;
      if(!_canApplyBoardChange(destUnit,nextBoardList)) return;
      src[srcIdx]=destCard;
    }
    destBoardList[destIdx]=card;
    _syncUnitPanelEffectsAfterMove(destUnit);
    if(srcUnit) _syncUnitPanelEffectsAfterMove(srcUnit);
    if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
    renderHandEditor();
    const tripleMerge=_tryTripleMergeOnBoard(destUnit,destIdx);
    if(tripleMerge){
      _syncUnitPanelEffectsAfterMove(destUnit);
      if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
    }
    if(tripleMerge) _beginTripleMergeHidden(tripleMerge.targetIdx);
    else _clearTripleMergeHidden();
    if(!tripleMerge&&srcArr==='boardCards'&&typeof playSfx==='function') playSfx('fit',{group:'reward'});
    if(!tripleMerge) _flashConnectedBoardCards(destIdx);
    renderFieldEditor();
    if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
    if(tripleMerge) _playTripleMergeAnimation(tripleMerge);
    return;
  }
  if(srcArr===destArr){
    // 同一配列内の入れ替え
    const arr=_arrOf(srcArr);
    const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  } else if(srcArr==='spells'&&destArr==='spells'&&_isNonCombatBoardPhase()){
    const src=_arrOf(srcArr);
    const dst=_arrOf(destArr);
    const tmp=src[srcIdx]; src[srcIdx]=dst[destIdx]||null; dst[destIdx]=tmp||null;
  } else {
    return;
  }
  renderHandEditor();
}

function discardHeCard(arrName, idx){
  const arr=arrName==='rings'?G.rings:G.spells;
  const card=arr[idx]; if(!card) return;
  if(typeof questCardRemovalLocked==='function'&&questCardRemovalLocked(card)) return;
  if(arrName==='rings'&&typeof questRingActionsLocked==='function'&&questRingActionsLocked(card)) return;
  arr[idx]=null;
  if(typeof questCheckRetainedCards==='function') questCheckRetainedCards();
  if(card&&card.type==='panel'&&typeof returnPanelToSalePool==='function') returnPanelToSalePool(card);
  const refund=cardRefund(card);
  if(refund>0){
    if(typeof onGoldGained==='function') onGoldGained(refund);
    else G.gold=(G.gold||0)+refund;
    refreshRewardGoldUi();
  }
  renderHandEditor();
}
