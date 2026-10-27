// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _rewFreePickDone=false; // 通常報酬フェイズで無料取得済みフラグ
let _rewPhaseId=0; // この報酬フェイズで取得したカードだけを戻せるよう識別する
// 試験実装の設定・追加文言はここだけで管理する（シート参照は増やさない）。
const SHOP_EXCHANGE_TRIAL={
  stockCount:3, ringCardCost:3,
  text:{
    shopIntro:'魔導取引所：カード交換',
    shopSteps:[
      '店のカードを、魔導板上のカードへドラッグすると交換できます。',
      '空きマスには置けません。交換の回数・カードの種類に制限はなく、ゴールドも使いません。',
      '店へ渡したカードも再び交換できます。品揃えと交換結果は、この街へ再訪しても残ります。',
    ],
    ringTitle:'指輪の交換が必要です',
    ringRequired:'出発する前に、塔の祭壇でカードを捧げて指輪を取得してください。',
  },
};
const REWARD_GRID_CAPACITY=5; // 報酬置き場：最大5枚
// チュートリアルの移動の手順（map.js の runBoardTutorial が G._libraryTutorialMove に入れる）。
// index が null なら魔導板のどのマスへ置いてもよい（「マージとは」）。
function _libraryTutorialMoveContext(){
  if(!G||!G._libraryTutorialActive) return null;
  return G._libraryTutorialMove||null;
}
function _libraryTutorialIsMoveStep(){ return !!_libraryTutorialMoveContext(); }
function _libraryTutorialAllowsMove(card,destIdx){
  const ctx=_libraryTutorialMoveContext();
  if(!ctx) return true;
  if(destIdx==null||ctx.index==null) return !!(card&&card.name===ctx.name);
  return !!(card&&card.name===ctx.name&&Number(destIdx)===ctx.index);
}
function _syncBoardCardVisibilityToggle(){
  const active=document.body.classList.contains('right-card-peek');
  const btn=document.getElementById('board-card-visibility-btn');
  // ゲームオーバー魔導板には同じボタンの複製（id重複を避けてクラス版）が置かれる。
  // 表示状態は共通なのでラベルも必ず両方そろえる。
  document.querySelectorAll('#board-card-visibility-btn,.board-card-visibility-btn').forEach(b=>{
    // ラベルはspanで包む（ホバー発光の::beforeが文字を覆わないようにするため）。
    const label=b.querySelector('.bcv-label')||b;
    label.textContent=active
      ?_uiLabel('「カード表示」ボタン','カード表示')
      :_uiLabel('「カード非表示」ボタン','カード非表示');
    b.setAttribute('aria-pressed',active?'true':'false');
  });
  const align=()=>{
    const pane=document.getElementById('hand-pane');
    const slots=document.querySelector('#hand-slots.board-slots');
    if(!btn||!pane||!slots||!slots.children.length) return;
    // 行によってマスの並びが異なるため、lastElementChild が右端列とは限らない。
    // 全マスから「最も右」と「最も下」を実測して基準にする。
    const cells=Array.from(slots.children).map(c=>c.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
    if(!cells.length) return;
    const paneRect=pane.getBoundingClientRect();
    const cardRect={right:Math.max.apply(null,cells.map(r=>r.right)),
                    bottom:Math.max.apply(null,cells.map(r=>r.bottom))};
    const scaleX=pane.offsetWidth?paneRect.width/pane.offsetWidth:1;
    const scaleY=pane.offsetHeight?paneRect.height/pane.offsetHeight:1;
    // ボタンの右端を最右カードの右端へ合わせ、最下段カードの直下へ置く。
    // getBoundingClientRect()は画面上の実寸、style値は親要素内の座標なので拡大率で戻す。
    btn.style.right=`${Math.max(0,(paneRect.right-cardRect.right)/scaleX)}px`;
    // 縦位置は設計座標(3840x2160)のY=752に固定する。
    // 親(#hand-pane)基準のstyle値へ直すため、親の設計座標上の位置を引く。
    const rootStyle=getComputedStyle(document.documentElement);
    const gScale=parseFloat(rootStyle.getPropertyValue('--game-scale'))||1;
    const offY=parseFloat(rootStyle.getPropertyValue('--game-offset-y'))||0;
    const paneTopDesign=(paneRect.top-offY)/gScale;
    btn.style.top=`${Math.round(722-paneTopDesign)}px`;
  };
  align();
  requestAnimationFrame(align);
}
function _clearBoardDragVisuals(){
  _dragSrc=null;
  window._allySlotDragSrc=null;
  if(typeof _removeDragGhost==='function') _removeDragGhost();
  if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
  document.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over'));
}

function toggleBoardCardVisibility(){
  // 右クリック（contextmenuハンドラ）とまったく同じ動作にする。
  // 別クラスで独自に隠すと、右クリックで見える状態と食い違ってしまう。
  // ゲームオーバー画面／ゲームクリア画面の魔導板でも同じボタンを出すため、
  // それぞれの位相（'gameover' / 'clear'）も許可する。
  if(!G||(G.phase!=='reward'&&G.phase!=='gameover'&&G.phase!=='clear')) return;
  // **アイテムの対象選択中は切り替えない。** カードを隠すと対象が選べなくなる。
  // CSSでもボタンを押せなくしているが、ゲームオーバー画面の複製ボタンや
  // 詳細度の取り合いに左右されないよう、動作そのものをここで止める。
  if(G._pendingItemUse) return;
  const enabled=document.body.classList.toggle('right-card-peek');
  if(enabled) _clearBoardDragVisuals();
  _syncBoardCardVisibilityToggle();
}
function _findEmptyRewardSlot(){
  for(let i=0;i<REWARD_GRID_CAPACITY;i++){ if(!_rewCards[i]) return i; }
  return -1;
}

function _syncRewardPanelPlacementOverlay(){
  const active=!!(G&&G.phase==='reward'&&G._pendingPanelPlacement);
  document.body.classList.toggle('reward-panel-placement',active);
  let ov=document.getElementById('reward-placement-overlay');
  if(active){
    if(!ov){
      ov=document.createElement('div');
      ov.id='reward-placement-overlay';
      const scr=document.getElementById('scr-battle')||document.body;
      scr.appendChild(ov);
    }
  } else if(ov){
    ov.remove();
  }
}

function cancelPendingPanelPlacement(){
  if(!G._pendingPanelPlacement) return false;
  G._pendingPanelPlacement=null;
  _syncRewardPanelPlacementOverlay();
  renderRewCards();
  renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  return true;
}

function _isCurrentRewardReturnCard(card){
  return !!(card&&card._rewardReturnCard&&card._rewardReturnPhaseId===_rewPhaseId);
}

function _cardIsEngraved(card){
  if(!card) return false;
  if(typeof _cardHasKeyword==='function') return _cardHasKeyword(card,'刻印');
  return [...(card.keywords||[]),...(card.adjacentKeywords||[])]
    .some(k=>String(k||'').trim()==='刻印');
}
function _cardIsSuppressionEngraving(card){
  return !!(card&&(String(card.no||'').toUpperCase()==='E101'
    ||String(card.name||'').trim()==='抑圧の刻印'));
}

function _rewardAreaAcceptsCard(card){
  if(_cardIsEngraved(card)) return false;
  if(typeof questCardRemovalLocked==='function'&&questCardRemovalLocked(card)
    &&!(typeof questCanReturnOfferCard==='function'&&questCanReturnOfferCard(card))) return false;
  return typeof questRewardSlotAcceptsCard!=='function'||questRewardSlotAcceptsCard(card);
}

function _restoreRewardReturnCard(card){
  if(!_isCurrentRewardReturnCard(card)||!_rewardAreaAcceptsCard(card)) return false;
  const returned=clone(card._rewardReturnCard);
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
  // 取る前の姿へ戻しても、アイテムを使った事実は残す（酒場の依頼カードの特殊拒否。quest.js）。
  if(card._itemBuffed) returned._itemBuffed=true;
  if(!Array.isArray(_rewCards)) _rewCards=[];
  const idx=Number.isInteger(card._rewardReturnIdx)?card._rewardReturnIdx:-1;
  if(idx>=0&&idx<REWARD_GRID_CAPACITY&&!_rewCards[idx]){
    while(_rewCards.length<idx) _rewCards.push(null); // 穴（sparse hole）を作らないよう明示的にnullで埋める
    _rewCards[idx]=returned;
  }else{
    const empty=_findEmptyRewardSlot();
    if(empty<0) return false;
    while(_rewCards.length<empty) _rewCards.push(null);
    _rewCards[empty]=returned;
  }
  // このターンに取得したカードを戻したので、無料取得済みフラグを解除し再取得可能にする
  _rewFreePickDone=false;
  return true;
}

function _isSpellCard(card){
  return !!card&&(card.category==='スペル'||card.category==='アイテム'||card.type==='spell'||card.kind==='spell'||card.type==='consumable'||card.kind==='item');
}
function _isItemCard(card){
  return !!card&&(card.category==='アイテム'||card.type==='consumable'||card.kind==='item');
}
function _rewardDragZoneForCard(card){
  if(_isItemCard(card)) return 'dragzone-reward-item';
  return _isSpellCard(card)?'dragzone-reward-spell':'dragzone-reward-nonspell';
}
// 今回の試験はPvEだけ。オンラインは従来の売買規則を同じ入口で使う。
// 2026-10-18 利用者指定：通常プレイではカードもアイテムも売却できない（売却という機能そのものを無くす）。オンライン対戦は従来どおり。
const CARD_TRADING_RULES={exchange:{sellCards:false,sellItems:false,exchangeShop:true},legacy:{sellCards:true,sellItems:true,exchangeShop:false}};
function _cardSellable(card){const r=_cardTradingRules();return _isItemCard(card)?!!r.sellItems:!!r.sellCards;}
function _cardTradingRules(){ return G&&G._onlineMode?CARD_TRADING_RULES.legacy:CARD_TRADING_RULES.exchange; }
function _isCardExchangeShop(){
  return !!(G&&G._isShop&&!G._isItemShop&&_cardTradingRules().exchangeShop);
}
function _shopSlotCapacity(){
  return G._isItemShop?3:(_isCardExchangeShop()?_exchangeShopStockCount():REWARD_GRID_CAPACITY+_shopExtraCardCount());
}
// オンラインの従来の購入では押し出しを許さない。交換店は専用の共通入口へ渡す。
function _shopOfferBoardSwapBlocked(card,destCard,merged,isOfferSource){
  return !!(isOfferSource&&G&&G._isShop&&!_isCardExchangeShop()&&card&&destCard
    &&!card._shopSalePending&&!_isItemCard(card)&&!merged);
}
function _exchangeShopCardCopy(card){
  const copy=clone(card);
  for(const key of ['_buyPrice','_shopBuy','_shopSalePending','_sellDisplayPrice','_temporaryRewardAreaCard',
    '_isOriginalReward','_rewardReturnCard','_rewardReturnIdx','_rewardReturnPhaseId']) delete copy[key];
  return copy;
}
function canExchangeShopCardAt(offerIdx,boardIdx){
  if(!_isCardExchangeShop()||G.phase!=='reward'||G._pendingPanelPlacement) return false;
  if(!Number.isInteger(offerIdx)||offerIdx<0||offerIdx>=_shopSlotCapacity()) return false;
  const unit=_getPartyBoardUnit(),board=unit&&unit.boardCards;
  if(!board||!Number.isInteger(boardIdx)||boardIdx<0||boardIdx>=board.length) return false;
  const incoming=_rewCards[offerIdx],outgoing=board[boardIdx];
  if(!incoming||!outgoing||_isSpellCard(incoming)||_isSpellCard(outgoing)) return false;
  const exchangeState=typeof questShopExchangeState==='function'?questShopExchangeState(outgoing):'allow';
  if(exchangeState==='blocked'||typeof questShopExchangeState==='function'&&questShopExchangeState(incoming)!=='allow') return false;
  // 町での依頼品の持ち出し制限は上の交換専用判定へ集約。依頼枠・刻印の制限は保つ。
  if(!_libraryTutorialAllowsMove(incoming,boardIdx)||_cardIsEngraved(outgoing)
    ||typeof questRewardSlotAcceptsCard==='function'&&!questRewardSlotAcceptsCard(outgoing)) return false;
  if(!_canCardUseBoardSlot(incoming,boardIdx,unit)) return false;
  const next=board.slice();next[boardIdx]=incoming;
  return _canApplyBoardChange(unit,next);
}
function _exchangeShopOfferDropAllowedAt(offerIdx){
  return !!(_dragSrc&&_dragSrc.arr==='boardCards'&&canExchangeShopCardAt(offerIdx,_dragSrc.idx));
}
function _clearExchangeShopDropHints(){
  document.querySelectorAll('.shop-exchange-drop-hint').forEach(el=>el.classList.remove('shop-exchange-drop-hint','drag-over'));
  document.querySelectorAll('.shop-exchange-empty-dim').forEach(el=>el.classList.remove('shop-exchange-empty-dim'));
  document.querySelectorAll('.shop-exchange-offer-dim').forEach(el=>el.classList.remove('shop-exchange-offer-dim'));
}
function _syncExchangeShopDropHints(){
  _clearExchangeShopDropHints();
  if(!_isCardExchangeShop()||!_dragSrc) return false;
  const hint=(el,allowed)=>{if(allowed) el.classList.add('shop-exchange-drop-hint','drag-over');};
  if(_dragSrc.arr==='rew'){
    // unite画像（.panel-unite-link）も魔導板の直下に置かれるため除く。含めると空きマス扱いで暗くなっていた（2026-10-19 利用者指摘）。
    document.querySelectorAll('#hand-slots.board-slots > :not(.panel-unite-link)').forEach((el,idx)=>{
      const allowed=canExchangeShopCardAt(_dragSrc.idx,idx);
      hint(el,allowed);
      el.classList.toggle('shop-exchange-empty-dim',!allowed);
    });
  }else if(_dragSrc.arr==='boardCards'){
    // 交換できない依頼カード（拒否済みの魔族の魂など）を持った時は、商品を暗くして交換できないことを示す（2026-10-19 利用者指定）。
    const held=_getPartyBoardUnit()?.boardCards?.[_dragSrc.idx];
    const blocked=typeof questShopExchangeState==='function'&&questShopExchangeState(held)==='blocked';
    document.querySelectorAll('#reward-offer-row > .rew-card[data-merge-rew-idx]').forEach(el=>{
      const allowed=_exchangeShopOfferDropAllowedAt(Number(el.dataset.mergeRewIdx));
      hint(el,allowed);
      el.classList.toggle('shop-exchange-offer-dim',blocked&&!allowed);
    });
  }else return false;
  return true;
}
// ドラッグ・クリック指定・周回ボットで共用する、ゴールドを動かさない1対1の交換。
function exchangeShopCard(offerIdx,boardIdx){
  if(!canExchangeShopCardAt(offerIdx,boardIdx)) return false;
  const unit=_getPartyBoardUnit(),incoming=_rewCards[offerIdx],outgoing=unit.boardCards[boardIdx];
  if(typeof questTryBlockedCardExchange==='function'&&questTryBlockedCardExchange(outgoing)) return false;
  unit.boardCards[boardIdx]=_exchangeShopCardCopy(incoming);
  _rewCards[offerIdx]=_exchangeShopCardCopy(outgoing);
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(typeof markCardAcquired==='function') markCardAcquired(incoming);
  _persistCurrentShopStock();
  if(typeof questCheckRetainedCards==='function') questCheckRetainedCards();
  if(typeof playSfx==='function') playSfx('fit',{group:'reward'});
  renderRewCards();renderHandEditor();renderFieldEditor();renderMoveSlotsInEnemy();
  return true;
}
function _prepareRewardAreaCard(card,isCurrentReturn,restoreItemBuff){
  const returned=clone(isCurrentReturn?card._rewardReturnCard:card);
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
  if(restoreItemBuff&&card._itemBuffed) returned._itemBuffed=true;
  if(!isCurrentReturn){
    returned._isOriginalReward=false;
    returned._temporaryRewardAreaCard=true;
    if(G._isShop&&_cardSellable(returned)){
      returned._shopSalePending=true;
      returned._sellDisplayPrice=_shopCardSellGain(returned);
    }
  }
  return returned;
}
function _clearShopSalePending(card){
  delete card._shopSalePending;
  delete card._sellDisplayPrice;
  delete card._temporaryRewardAreaCard;
}
function _pushToRewardArea(card){
  if(!card) return true;
  if(_isCardExchangeShop()) return false;
  if(G._isShop&&!_isItemCard(card)&&!_cardTradingRules().sellCards) return false;
  if(!_rewardAreaAcceptsCard(card)) return false;
  if(_isCurrentRewardReturnCard(card)) return _restoreRewardReturnCard(card);
  const returned=_prepareRewardAreaCard(card,false);
  if(!Array.isArray(_rewCards)) _rewCards=[];
  if(G._isShop){
    // ショップ／道具屋では枠を詰めない。「売切」になっている枠がある場合だけ、
    // そのいちばん手前の枠へ置く（空きが無ければ受け付けない）。
    const cap=_shopSlotCapacity();
    while(_rewCards.length<cap) _rewCards.push(null);
    const slot=_rewCards.findIndex((c,i)=>i<cap&&!c);
    if(slot<0) return false;
    _rewCards[slot]=returned;
    return true;
  }
  let empty=_rewCards.findIndex(c=>!c);
  if(empty<0&&_rewCards.length<REWARD_GRID_CAPACITY) empty=_rewCards.length;
  if(empty<0||empty>=REWARD_GRID_CAPACITY) return false;
  while(_rewCards.length<empty) _rewCards.push(null);
  _rewCards[empty]=returned;
  return true;
}
// 報酬置き場の指定スロットへピンポイントで返却する。
// allowSwap=trueの場合、指定スロットが埋まっていても入れ替え、押し出されたカードを返す
// （戻り値は{ok, displaced}。allowSwap未指定時は従来通りboolean互換のtrue/falseを返す）
function _pushToRewardAreaAt(card,idx,allowSwap){
  if(_isCardExchangeShop()) return allowSwap?{ok:false,displaced:null}:false;
  if(!card) return allowSwap?{ok:true,displaced:null}:true;
  if(G._isShop&&!_isItemCard(card)&&!_cardTradingRules().sellCards) return allowSwap?{ok:false,displaced:null}:false;
  if(!_rewardAreaAcceptsCard(card)) return allowSwap?{ok:false,displaced:null}:false;
  if(!Array.isArray(_rewCards)) _rewCards=[];
  if(!Number.isInteger(idx)||idx<0||idx>=REWARD_GRID_CAPACITY||(_rewCards[idx]&&!allowSwap)){
    return allowSwap?{ok:false,displaced:null}:false;
  }
  while(_rewCards.length<idx) _rewCards.push(null); // 穴（sparse hole）を作らないよう明示的にnullで埋める
  const displaced=_rewCards[idx]||null;
  const returned=_prepareRewardAreaCard(card,_isCurrentRewardReturnCard(card),true);
  _rewCards[idx]=returned;
  if(_isCurrentRewardReturnCard(card)) _rewFreePickDone=false;
  return allowSwap?{ok:true,displaced}:true;
}

function _persistCurrentShopStock(){
  if(!G._isShop) return;
  if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
}

function _sellPendingShopCard(idx){
  if(_isCardExchangeShop()) return false;
  const card=Array.isArray(_rewCards)?_rewCards[idx]:null;
  if(!card||!_cardSellable(card)||!card._shopSalePending||_cardIsEngraved(card)) return false;
  if(typeof questTryBlockedCardSale==='function'&&questTryBlockedCardSale(card)) return false;
  if(typeof _playRewardAcquireSfx==='function') _playRewardAcquireSfx('sell.wav');
  const base=Math.max(0,Number(card._sellDisplayPrice??_shopCardSellGain(card))||0);
  const gain=typeof onGoldGained==='function'?onGoldGained(base):base;
  if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
  _rewCards[idx]=null;
  _persistCurrentShopStock();
  renderRewCards();
  refreshRewardGoldUi();
  return true;
}

// 旧セーブだけの移行。以前は選択時に消していたカードを戻し、先払いのライフも戻す。
// 新しい選択ではこの控えを作らず、通常の取り消しは選択解除だけを行う。
function _restoreLegacyRingSacrifices(){
  const list=Array.isArray(G._ringSacrificedCards)?G._ringSacrificedCards:[];
  if(!list.length) return 0;
  const unit=_getPartyBoardUnit();
  if(!unit) return 0;
  const boardList=_normalizeUnitBoardCards(unit);
  let restored=0;
  const pending=[];
  list.forEach(entry=>{
    if(!entry||!entry.card) return;
    const idx=Number(entry.idx);
    let slot=(Number.isInteger(idx)&&idx>=0&&idx<boardList.length&&!boardList[idx])?idx:-1;
    if(slot<0){
      const free=boardList.map((c,i)=>c?-1:i).filter(i=>i>=0);
      if(!free.length){ pending.push(entry); return; }
      slot=free[0];
    }
    boardList[slot]=clone(entry.card);
    const heal=Math.max(0,Number(entry.healGain)||0),gain=Math.max(0,Number(entry.lifeGain)||0);
    if(heal) _shiftCurrentLife(-heal);
    if(gain){ G.ascensionLifeBonus=Math.max(0,(Number(G.ascensionLifeBonus)||0)-gain); _shiftCurrentLife(-gain); }
    restored++;
  });
  if(!restored) return 0;
  unit.boardCards=boardList;
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  // 戻した分は「捧げていない」ことにする。減らさないと、次に入り直した時に
  // カードが手元にあるまま指輪だけ解放された状態になる。
  G._ringSacrificedCards=pending;
  _clearRingOfferSelection();
  return restored;
}
function _reclaimSacrificedRingCards(){ return _clearRingOfferSelection(); }
// 祭壇（指輪交換）を、指輪を取らずに離れる時の確認。
// **文言はテキストメッセージシートが唯一の出どころ**（「「祭壇」途中離脱時」）。
// 1〜2枚の選択中も、3枚そろえて指輪を取っていない時も確認する。
function _confirmRingExchangeReturn(onYes){
  const discarded=Number(G._boardDiscardCount)||0;
  const needsConfirm=!!(G._ringOfferPhase&&!G._ringOfferResolved&&discarded>=1);
  if(!needsConfirm){ onYes(); return; }
  const msg=typeof textMessage==='function'
    ?textMessage('「祭壇」途中離脱時','捧げたカードを回収して祭壇を離れますか？')
    :'捧げたカードを回収して祭壇を離れますか？';
  const reclaimAndLeave=()=>{
    // カードは盤面に残っているので、選択だけを外して離れる。
    _reclaimSacrificedRingCards();
    if(typeof renderHandEditor==='function') renderHandEditor();
    if(typeof renderRewCards==='function') renderRewCards();
    onYes();
  };
  // セーブデータ削除時と同じ見た目の確認窓で出す（game_confirm.js。2026-09-24 利用者指定）。
  if(typeof showGameConfirm==='function'){
    showGameConfirm({title:_uiLabel('「祭壇」見出し','祭壇'),message:msg,okLabel:_uiLabel('「OK」ボタン','OK'),
      cancelLabel:_uiLabel('「キャンセル」ボタン','キャンセル'),onOk:reclaimAndLeave});
    return;
  }
  reclaimAndLeave();
}
function _ensureSelectedBoardUnitIdx(){
  const cur=_getPartyBoardUnit();
  if(cur&&cur.hp>0) return G._selectedBoardUnitIdx;
  const idx=(G.allies||[]).findIndex(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
  G._selectedBoardUnitIdx=idx;
  return idx;
}
function _preparePanelCard(card){
  if(!card) return false;
  const nc=clone(card);
  delete nc._buyPrice;
  nc.noRewardUse=true;
  return nc;
}
function startPanelPlacement(card, onPlaced, sourceName){
  if(!card) return false;
  const rewardIdx=G.phase==='reward'&&Array.isArray(_rewCards)?_rewCards.indexOf(card):-1;
  if(card.panelScope==='global'){
    G._pendingPanelPlacement={card:_preparePanelCard(card),onPlaced:onPlaced||null,sourceName:sourceName||'取得',rewardIdx};
    G._showGlobalPanels=true;
    _syncRewardPanelPlacementOverlay();
    renderRewCards();
    renderHandEditor();
    renderMoveSlotsInEnemy();
    return true;
  }
  const unit=_getPartyBoardUnit();
  if(!unit) return false;
  G._pendingPanelPlacement={card:_preparePanelCard(card),onPlaced:onPlaced||null,sourceName:sourceName||'取得',rewardIdx};
  G._showGlobalPanels=false;
  _syncRewardPanelPlacementOverlay();
  renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderMoveSlotsInEnemy();
  return true;
}
function placePendingPanelToGlobal(slotIdx){
  const pending=G._pendingPanelPlacement;
  if(!pending||!pending.card||pending.card.panelScope!=='global') return false;
  G.globalPanels=G.globalPanels||new Array(7).fill(null);
  if(slotIdx<0||slotIdx>=7) return false;
  G.globalPanels[slotIdx]=clone(pending.card);
  const done=pending.onPlaced;
  G._pendingPanelPlacement=null;
  G._showGlobalPanels=true;
  _syncRewardPanelPlacementOverlay();
  if(done) done();
  if(!tripleMerge&&typeof playSfx==='function') playSfx('fit',{group:'reward'});
  renderHandEditor();
  renderFieldEditor();
  renderMoveSlotsInEnemy();
  return true;
}
function placePendingPanelToSelectedUnit(slotIdx){
  const debug=!!(G._debugMode&&G._pendingPanelPlacement&&G._pendingPanelPlacement.sourceName==='DEBUG');
  try{return _placePendingPanelToSelectedUnit(slotIdx);}
  finally{
    // 商品以外の取得失敗で、交換を禁止する配置待ちを取り残さない。
    if(debug&&G._pendingPanelPlacement){
      G._pendingPanelPlacement=null;
      _syncRewardPanelPlacementOverlay();
      renderRewCards();renderHandEditor();renderMoveSlotsInEnemy();
    }
  }
}
function _placePendingPanelToSelectedUnit(slotIdx){
  const pending=G._pendingPanelPlacement;
  if(!pending||!pending.card) return false;
  if(!_libraryTutorialAllowsMove(pending.card,slotIdx)) return false;
  if(pending.card.panelScope==='global'){
    G._showGlobalPanels=true;
    renderHandEditor();
    return false;
  }
  if(_isCardExchangeShop()&&!(G._debugMode&&pending.sourceName==='DEBUG')) return false;
  const unit=_getPartyBoardUnit();
  if(!unit) return false;
  const boardList=_normalizeUnitBoardCards(unit);
  if(slotIdx<0||slotIdx>=boardList.length) return false;
  if(!_canCardUseBoardSlot(pending.card,slotIdx,unit)) return false;
  const oldCard=boardList[slotIdx]||null;
  const merged=_mergedPanelCard(oldCard,pending.card);
  // 依頼カードをクリックで既存カードと入れ替える場合も、押し出すカードが依頼枠へ戻せる時だけ許可する。
  if(oldCard&&!merged&&!_rewardAreaAcceptsCard(oldCard)) return false;
  // 行商人の購入では、既存カードの押し出しを許可しない。
  const isShopOfferPlacement=pending.rewardIdx>=0||pending.sourceName==='報酬';
  if(_shopOfferBoardSwapBlocked(pending.card,oldCard,merged,isShopOfferPlacement)) return false;
  const nextBoardList=boardList.slice();
  nextBoardList[slotIdx]=merged||pending.card;
  if(!_canApplyBoardChange(unit,nextBoardList)) return false;
  if(oldCard&&!merged){
    if(G._isShop){
      // ショップでは押し出されたカードを売却しない。買ったカードが抜けた枠（無ければ売切枠）へ
      // 移して「入れ替え」にする。商品側は通常どおり購入扱い（ゴールドを支払う）。
      const swapIdx=(pending.rewardIdx>=0&&pending.rewardIdx<_shopSlotCapacity()&&!_rewCards[pending.rewardIdx])
        ?pending.rewardIdx:-1;
      const pushed=swapIdx>=0?_pushToRewardAreaAt(oldCard,swapIdx,true):null;
      if(swapIdx<0||!pushed||!pushed.ok){
        if(!_pushToRewardArea(oldCard)) return false;
      }
    }else if(pending.rewardIdx>=0&&pending.rewardIdx<REWARD_GRID_CAPACITY&&!_rewCards[pending.rewardIdx]){
      // 報酬カードを既存スロットへドラッグした場合は、元の報酬スロットを先に空けている。
      // ここへ押し出されたカードを戻すことで、提示カードが満杯でも確実に入れ替えとして成立させる。
      const pushed=_pushToRewardAreaAt(oldCard,pending.rewardIdx,true);
      if(!pushed||!pushed.ok) return false;
    }else{
      // クリック取得など元スロットがまだ空いていない場合は、従来通り空きスロットへ退避する。
      if(!_pushToRewardArea(oldCard)) return false;
    }
  }
  const isPendingSale=!!pending.card._shopSalePending;
  const placed=merged||clone(pending.card);
  if(_cardIsSuppressionEngraving(placed)) placed._fixedBoardSlot=slotIdx;
  // デバッグ配置では、パレットで選択した回転方向を配置後も保持する。
  // makePanel()／同期処理が通常カード用の方向を再生成しても、検証用カードの
  // 接続条件が初期方向へ戻らないよう、DEBUGカードだけ明示的に復元する。
  if(pending.sourceName==='DEBUG'&&Array.isArray(pending.card._debugDirections)){
    placed.directions=pending.card._debugDirections.slice();
    placed._debugDirections=pending.card._debugDirections.slice();
  }
  // 売切れ枠へ一時退避した手持ちパネルを魔導板へ戻す場合は、
  // 商品枠専用の売却待ち状態を持ち込まない（再度売却扱いになるのを防ぐ）。
  if(isPendingSale){
    _clearShopSalePending(placed);
  }
  // このターンの報酬（_isOriginalReward）から取得した場合のみ「戻す」操作を無料取得フラグの解除に結び付ける。
  // 元々持っていた（報酬エリアに一時的に戻していただけの）カードを取り直しても無料取得権には影響しない。
  if(!merged&&pending.rewardIdx>=0&&pending.card._isOriginalReward){
    placed._rewardReturnCard=clone(pending.card);
    placed._rewardReturnIdx=pending.rewardIdx;
    placed._rewardReturnPhaseId=_rewPhaseId;
  }
  boardList[slotIdx]=placed;
  // 合体前の3枚をDOM上に残した状態でスナップショットを取れるよう、先に一度描画する。
  renderHandEditor();
  // デバッグ配置では同一カードを複数スロットへ置いて、召喚上限や誘発回数を
  // 検証できるようにする。通常の取得・配置では従来どおり3枚合体を行う。
  const tripleMerge=pending.sourceName==='DEBUG'?null:_tryTripleMergeOnBoard(unit,slotIdx);
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  const done=pending.onPlaced;
  G._pendingPanelPlacement=null;
  _syncRewardPanelPlacementOverlay();
  if(done) done();
  // 3枚合体時は通常配置音を鳴らさず、1.5秒の吸い込み完了時にmerge.wavだけを鳴らす。
  // 行商人で代金を支払う配置は購入音を鳴らす。
  if(!tripleMerge){
    _clearTripleMergeHidden();
    if(G._isShop&&typeof _playRewardAcquireSfx==='function'&&!isPendingSale) _playRewardAcquireSfx('buy1.wav');
    else if(typeof playSfx==='function') playSfx('fit',{group:'reward'});
  }
  if(tripleMerge) _beginTripleMergeHidden(tripleMerge.targetIdx);
  renderHandEditor();
  if(tripleMerge) _playTripleMergeAnimation(tripleMerge);
  else _flashConnectedBoardCards(slotIdx);
  renderFieldEditor();
  renderMoveSlotsInEnemy();
  if(oldCard&&!merged) renderRewCards();
  return true;
}
function _connectedBoardFlashIndices(unit,startIdx){
  if(!unit||startIdx<0||typeof _panelGridPos!=='function') return [];
  const eq=Array.isArray(unit.boardCards)?unit.boardCards:[];
  if(!eq[startIdx]) return [];
  const edges=new Map();
  const addEdge=(a,b)=>{
    if(a<0||b<0||!eq[a]||!eq[b]) return;
    if(!edges.has(a)) edges.set(a,new Set());
    if(!edges.has(b)) edges.set(b,new Set());
    edges.get(a).add(b);
    edges.get(b).add(a);
  };
  const dirDelta={up:{dx:0,dy:-1},right:{dx:1,dy:0},down:{dx:0,dy:1},left:{dx:-1,dy:0}};
  eq.forEach((panel,idx)=>{
    if(!panel||!Array.isArray(panel.directions)||!panel.directions.length) return;
    const connectivity=typeof _panelDirectionConnectivity==='function'?_panelDirectionConnectivity(unit,idx):{};
    const pos=_panelGridPos(idx);
    panel.directions.forEach(d=>{
      if(connectivity[d]!=='connected') return;
      const delta=dirDelta[d];
      if(!delta) return;
      const targetPos={x:pos.x+delta.dx,y:pos.y+delta.dy};
      for(let i=0;i<eq.length;i++){
        const p=_panelGridPos(i);
        if(p.x===targetPos.x&&p.y===targetPos.y){ addEdge(idx,i); break; }
      }
    });
  });
  const seen=new Set([startIdx]);
  const queue=[startIdx];
  while(queue.length){
    const idx=queue.shift();
    if(idx!==startIdx&&String(eq[idx]?.category||'')==='キャラクター') continue;
    (edges.get(idx)||[]).forEach(n=>{
      if(seen.has(n)) return;
      seen.add(n);
      queue.push(n);
    });
  }
  return [...seen];
}

function _flashConnectedBoardCards(startIdx){
  const targets=_connectedBoardFlashIndices(_getPartyBoardUnit(),startIdx);
  let tries=0;
  const run=()=>{
    const host=document.getElementById('hand-slots');
    const unit=_getPartyBoardUnit();
    if((!host||!unit)&&tries++<6){ requestAnimationFrame(run); return; }
    if(!host||!unit) return;
    let hit=0;
    targets.forEach(idx=>{
      const el=host.querySelector(`[data-board-idx="${idx}"]`);
      if(!el) return;
      hit++;
      // 走査光は「静止したクリップ枠 + その中を走るbeam」の2枚構成。
      // 1枚でclip-path+transformを併用すると、切り抜いた形ごとカード外へ出る（はみ出しの原因）。
      el.classList.remove('panel-connect-flash');
      el.querySelectorAll(':scope > .panel-connect-flash-clip').forEach(n=>n.remove());
      void el.offsetWidth;
      const clip=document.createElement('div');
      clip.className='panel-connect-flash-clip';
      const beam=document.createElement('div');
      beam.className='panel-connect-flash-beam';
      clip.appendChild(beam);
      el.appendChild(clip);
      el.classList.add('panel-connect-flash');
      setTimeout(()=>{ el.classList.remove('panel-connect-flash'); clip.remove(); },760);
    });
    if(!hit&&tries++<6) requestAnimationFrame(run);
  };
  requestAnimationFrame(()=>requestAnimationFrame(run));
}
function panelDirectionMarksHtml(card, connectivity){
  if(!card||!Array.isArray(card.directions)||!card.directions.length) return '';
  const cls={up:'panel-dir-up',right:'panel-dir-right',down:'panel-dir-down',left:'panel-dir-left'};
  // 接続済み（unite線が描画される）方向は矢印を出さない。合体カードを強制的に
  // 4方向表示していた分岐は、接続済み方向でも矢印がunite画像の下に残って見える
  // 不具合の原因だったため撤去（4方向データ自体は_tryTripleMergeOnBoardで
  // セット済みなので、未接続の方向には引き続き矢印が出る）。
  return card.directions.map(d=>{
    if(connectivity&&connectivity[d]==='connected') return '';
    return cls[d]?`<span class="panel-dir ${cls[d]}"></span>`:'';
  }).join('');
}

function _panelDirectionMarkHtml(dir){
  const cls={up:'panel-dir-up',right:'panel-dir-right',down:'panel-dir-down',left:'panel-dir-left'};
  return cls[dir]?`<span class="panel-dir ${cls[dir]}"></span>`:'';
}

function _restorePanelDirectionDom(cardEl, card){
  if(!cardEl||!card) return;
  cardEl.querySelectorAll('.panel-dir').forEach(n=>n.remove());
  const html=panelDirectionMarksHtml(card,null);
  if(!html) return;
  const art=cardEl.querySelector('.card-art');
  if(art) art.insertAdjacentHTML('beforebegin',html);
  else cardEl.insertAdjacentHTML('afterbegin',html);
}

function _restorePanelDirectionDomForDir(cardEl, card, dir){
  if(!cardEl||!card||!dir) return;
  if(!Array.isArray(card.directions)||!card.directions.includes(dir)) return;
  const cls={up:'panel-dir-up',right:'panel-dir-right',down:'panel-dir-down',left:'panel-dir-left'}[dir];
  if(!cls||cardEl.querySelector(`.${cls}`)) return;
  const html=_panelDirectionMarkHtml(dir);
  const art=cardEl.querySelector('.card-art');
  if(art) art.insertAdjacentHTML('beforebegin',html);
  else cardEl.insertAdjacentHTML('afterbegin',html);
}

function _detachBoardConnectionVisuals(srcIdx, srcEl, srcCard){
  const host=document.getElementById('hand-slots');
  const unit=_getPartyBoardUnit();
  if(!host) return;
  host.querySelectorAll('.panel-unite-link').forEach(n=>{
    const isSrc=String(n.dataset.srcIdx)===String(srcIdx);
    const isDst=String(n.dataset.dstIdx)===String(srcIdx);
    if(!isSrc&&!isDst) return;
    const otherIdx=Number(isSrc?n.dataset.dstIdx:n.dataset.srcIdx);
    const otherDir=isSrc?n.dataset.dstDir:n.dataset.srcDir;
    n.remove();
    const otherCard=unit&&Array.isArray(unit.boardCards)?unit.boardCards[otherIdx]:null;
    const otherEl=host.querySelector(`[data-board-idx="${otherIdx}"]`);
    _restorePanelDirectionDomForDir(otherEl,otherCard,otherDir);
  });
  _restorePanelDirectionDom(srcEl,srcCard);
}

// デバッグモード中、所持金の下の枠に「リロール」を表示する（戦闘中は#btn-debug-killが同じ枠に表示される）
// PvEのカード換金は廃止。アイテムとオンラインの既存の売買は従来どおり。
function _boardCardSellEnabled(card){
  if(!_cardSellable(card)) return false;
  if(card&&card._npcCard) return false;
  if(_cardIsEngraved(card)) return false;
  if(typeof questCardSellHidden==='function'&&questCardSellHidden(card)) return false;
  // ゲームオーバー魔導板は編成画面の描画をそのまま流用する（G.phaseを一時的に
  // 'reward'にする）ため、ここで除外しないとデバッグモードで売却UIが付いてくる。
  if(G&&G._renderingGameOverBoard) return false;
  // **祭壇では出さない。** デバッグモードの編成画面と同じ描画を使うため、
  // 除外しないと祭壇にも売却ボタンと売却価格が出て通常プレイと見た目が変わる。
  if(G&&G._isWaveAltar) return false;
  return !!(G&&(G._isShop||G._isForge||(G._debugMode&&G.phase==='reward')));
}

function _shopCardSellGain(card){
  if(_isCardExchangeShop()) return 0;
  if(!card||!_isItemCard(card)&&!_cardTradingRules().sellCards) return 0;
  // 売値は「どの店にいるか」ではなく「何を売るか」で決める（全店共通）。
  //   アイテム   → 道具屋準拠（レアリティ×45）
  //   その他カード → 魔導店準拠（_mapSalePrice の4分の1）
  // 以前は道具屋にいる限り全カードがアイテム価格になり、キャラクター／強化カードが
  // 魔導店より高く売れていた。
  if(_isItemCard(card)&&typeof _itemShopSellPrice==='function') return _itemShopSellPrice(card);
  if(card.sellPrice!=null) return Math.max(0,Number(card.sellPrice)||0);
  if(card.sellValue!=null) return Math.max(0,Number(card.sellValue)||0);
  const base=typeof _mapSalePrice==='function'?_mapSalePrice(card):calcBuyPrice(card);
  return Math.floor(base/4);
}

function renderRaceBuffSummary(){
  const el=document.getElementById('rw-race-buffs');
  if(!el) return;
  el.textContent='';
  el.style.display='none';
}

// ── 報酬フェイズ開始 ────────────────────────────

function goToReward(options){
  if(typeof _pendingCardActivation!=='undefined') _pendingCardActivation=null;
  const _restoreCheckpoint=!!(options&&options.restoreCheckpoint);
  const _saveCheckpoint=!!(options&&options.checkpoint);
  const _noNewRewards=!!(options&&options.noNewRewards);
  // 行商人（peddler.js）：敗北後の編成画面を、魔導店と同じ交換の画面として開く。
  // 施設として入るのではないので、敗北後の reward チェックポイントはそのまま作る（品揃えと店の旗も保存される）。
  const _peddler=!!(options&&options.peddler);
  // 前回のめくりが途中で残っていれば片付ける（報酬欄が隠れたままにならないように）。
  _finishRewardReveal(true);
  G._savePresentation=false;
  const _isFacilityEntry=!!(G._isShop||G._isForge||G._isRingExchange||G._isVillageMenu||G._isWaveAltar||G._isTavern||G._isLibrary||G._isFiveSaints);
  document.body.classList.remove('battle-victory-pending');
  // 戦闘フェイズ中に呼ばれた場合は何もしない（stale timer 等から保護）
  if(G.phase==='player'||G.phase==='enemy') return;
  if(!_restoreCheckpoint){
    G._freeItemPhase='reward';
    G._freeItemUsed=false;
    G._isRewardTown=true; // 既存UIは街モードを維持
    G._freeRewardPanelMode=true; // 一時仕様：パネルは無料。_baseCostは保持する
    G._rewardOnePickMode=true;
    _rewFreePickDone=_noNewRewards;
    _rewPhaseId++;
    if(!_isFacilityEntry&&!G._isItemShop&&!_peddler) G.activationFormationSeq=(Number(G.activationFormationSeq)||0)+1;
    G._isBossRewardCycle=!!G._bossJustDefeated;
    G._boardDiscardCount=0;
    G._ringOfferSelectedSlots=[];
    G._ringOfferUnlocked=false;
    G._ringOfferResolved=false;
    // ボス撃破後の指輪報酬は廃止済み。指輪提示は祭壇・クエスト側だけが用意する。
    G._ringOffer=[];
    G._ringOfferPhase=false;
    G._bossJustDefeated=false;
    const _waveRewardCount=Number.isInteger(G._waveRewardCount)?Math.max(0,Math.min(REWARD_GRID_CAPACITY,G._waveRewardCount)):REWARD_GRID_CAPACITY;
    // **順番に依存させない。**（報酬の中身は現在地とランで決まる）
    // 報酬画面を開き直しても、途中で他の抽選を挟んでも同じ5枚になる。
    // 既存の勝利報酬の鍵（敗北回数を含む）は維持する。敗北後の編成では抽選しない。
    // レア度4以上の枚数と並び（隣り合わせない）は _arrangeRewardRarity() が唯一の実装。枚数を切り詰めた後に通す。
    _rewCards=(_noNewRewards||G._isTavern||G._isFiveSaints)?[]:runWithKeyedRandom(`reward:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}`,
      ()=>_arrangeRewardRarity(drawRewards(undefined,{bonus:true}).filter(c=>c).slice(0,_waveRewardCount)));
    if(!_noNewRewards&&!G._isTavern&&!G._isFiveSaints&&typeof questMixBattleRewards==='function') _rewCards=questMixBattleRewards(_rewCards);
    G._retryRewardCards=null;
    _rewCards.forEach(c=>{ if(c){ towerBoonBlessGeneratedCard(c); c._isOriginalReward=true; } });
    if(!_isFacilityEntry&&!_noNewRewards&&!_peddler) _markRewardAppearancePending(_rewCards);
    if(_saveCheckpoint&&!_isFacilityEntry&&!_noNewRewards) towerBoonGrantRewardRerolls();
    if(_peddler){
      // 商品は報酬ではない（1枚だけ取れる制限を掛けない）。交換は魔導店と共通。
      _rewFreePickDone=false;
      G._freeRewardPanelMode=false;
      G._isShop=true;
      G._isPeddler=true;
      G._isItemShop=false;
      // 行商人の画面は村のメニューではない。印が残ると再抽選ボタンが隠れる（2026-10-19）。
      G._isVillageMenu=false;
      G._mapReturnAfterReward=false;
      _rewCards=_ensureDefeatPeddlerStock();
      G._facilityLabel=typeof defeatPeddlerTitle==='function'?defeatPeddlerTitle():'';
    }
    _storeRewardStartSnapshot();
  }
  G.phase='reward';
  G._battlePhaseRunning=false;
  document.body.classList.add('reward-screen-active');
  // 街・施設で画面が隠れている間にブラウザが停止させた背景動画（setup.webm）を再開する。
  if(typeof _resumeRewardBgVideo==='function') _resumeRewardBgVideo();
  if(!_isFacilityEntry&&typeof playSfx==='function') playSfx('menuOpen',{group:'ui'});
  // 街のBGMが鳴っている間（＝街の施設に入っている間）はmenu.wavへ切り替えない。
  // 行商人の交換の編成画面は camp の背景と行商人の立ち絵のまま、BGM を流さない（peddler.js。再開時もここで戻す）。
  if(G._isPeddler&&typeof defeatPeddlerApplySaleScene==='function') defeatPeddlerApplySaleScene();
  // 魔獣撃退依頼の討伐後の編成画面は BGM を流さない（環境音だけ。quest.js _qShowGarmCamp の G._questNoBgm）。
  if(!G._villageBgmActive&&!G._questNoBgm&&typeof playBgm==='function') playBgm('menu',{fadeInMs:700});
  // **報酬・編成画面にいる間に、次の戦闘曲を読み込んでおく。**（先読みの規則は main.js）
  // 戦闘と戦闘の間には街が無い（例：Scene1のstage6〜9）ので、ここで読まないと
  // ボス戦（battle3＝17.8MB）の頭が無音になる。
  if(typeof warmNextBattleBgm==='function') warmNextBattleBgm();
  const goldLabel=document.querySelector('#reward-info-bar .ri-soul');
  if(goldLabel) goldLabel.textContent=_uiLabel('「所持金枠」見出し','所持金');
  G._showGlobalPanels=false;
  G._showFacilities=false;
  if(!_restoreCheckpoint){
    G._selectedBoardUnitIdx=G.allies.findIndex(a=>a&&a.hp>0);
    if(G._selectedBoardUnitIdx<0) G._selectedBoardUnitIdx=0;
    G._familiarUsed=false;
  }

  // 報酬フェイズUI
  const _faf=document.getElementById('f-ally'); if(_faf) _faf.innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eArea=document.getElementById('enemy-area');
  // 敵エリアは報酬フェイズでは常に隠す（宝箱の機能は廃止済み）。
  if(eArea) eArea.style.display='none';
  const rMoveBtns=document.getElementById('reward-move-btns');
  if(rMoveBtns) rMoveBtns.style.display='';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';

  refreshRewardGoldUi();
  const rewardCount=document.getElementById('rw-count');
  if(rewardCount) rewardCount.textContent=G._isLibrary?5:(G.rewardCharCount||3);
  const rewardLabel=Array.from(document.querySelectorAll('#reward-info-bar .ri-soul')).find(el=>el.querySelector('#rw-count'));
  if(rewardLabel&&rewardLabel.firstChild) rewardLabel.firstChild.nodeValue=`${G._isFiveSaints&&typeof fiveSaintsRewardSlotTitle==='function'
    ?fiveSaintsRewardSlotTitle()
    :G._isLibrary?_uiLabel('「図書館の報酬枠」見出し','貸出カード')
    :_uiLabel('「編成画面の報酬枠」見出し','報酬')} `;

  renderAll(); // フィールド（仲間エリア）も再描画
  _updateLaneOffset(); // スロット描画後に同期計測してオフセットを確定
  renderRewCards();
  renderRaceBuffSummary();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  updateHUD();
  let autosaveDisplay=null;
  if(_saveCheckpoint&&!_isFacilityEntry&&typeof SaveRun!=='undefined'){
    const saved=SaveRun.checkpoint('reward');
    // 戦闘結果の「進む」で編成画面を開く時だけ、高速表示を暗転内へ収める。
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function'){
      autosaveDisplay=SaveRun.showAutoSaveIndicator({fast:true});
    }
  }
  // **戦闘を終えて報酬画面へ入った時だけ**、報酬カードをめくって見せる。
  // checkpoint付きで呼ばれるのは勝利・敗北後の2か所だけ（battle.js／main.js）。
  // 施設・再開（restoreCheckpoint）・オンラインの編成ではめくらない。
  if(_saveCheckpoint&&!_isFacilityEntry&&!_restoreCheckpoint&&!_noNewRewards) _playRewardReveal();
  else _completeRewardAppearance(_rewCards);
  return autosaveDisplay;
}

// ── 戦闘後の報酬めくり ─────────────────────────────
// 黒80%の上に裏向きの報酬カードを横一列に並べ、レア度の低い段から表にする
// （演出は js/engine/card_reveal.js が唯一の実装。プレビューと同じもの）。
// 報酬欄のカードは goToReward() で既に描いてあり、めくりの間は隠しているだけ。
// 最後に手前のカードと黒を消し、報酬欄の同じカードをフェードで出す。
// 消える間は大きな縦長の光の帯を1本、左から右へ流す（2026-09-30 利用者指定。数本は多すぎて不自然）。
const REWARD_RARITY_REVEAL_ENABLED=false; // trueで大きなカードのレア度順めくり・再抽選の最高レアVFXを戻す。
const REWARD_REVEAL_CARD_W=480;  // 手前に並べるカードの幅（利用者指定）
const REWARD_REVEAL_GAP=150;     // カードの間隔（利用者指定）
const REWARD_REVEAL_START_MS=800;// 暗転が明けてからめくり始めるまで（暗転の戻りは0.7秒）
const REWARD_REVEAL_FADE_MS=520; // 手前のカードと黒が消える時間（CSSと揃える）
const REWARD_REVEAL_SWEEP_MS=640; // 光の帯が流れ切るまで（CSSのアニメーションの長さと揃える）
let _rewardRevealToken=0;        // 画面を離れる・出し直す時に、走っている演出を無効にする
let _rewardRerollReveal=null;    // DOMと演出の参照はセーブへ入れない
function _rewardAppearanceAllowed(){
  return !G._onlineMode&&_battleCardRewardAllowed();
}
function _battleCardRewardAllowed(){
  return !G._isShop&&!G._isPeddler&&!G._isForge&&!G._isItemShop&&!G._isLibrary
    &&!G._isTavern&&!G._isFiveSaints&&!G._isRingExchange&&!G._isVillageMenu&&!G._isWaveAltar;
}
function _markRewardAppearancePending(cards){
  if(!_battleCardRewardAllowed()) return;
  applyGoldenRingReward(cards);
  if(!_rewardAppearanceAllowed()) return;
  (cards||[]).forEach(c=>{if(c&&c._isOriginalReward)c._rewardAppearancePending=true;});
}
function _completeRewardAppearance(cards){
  if(G.phase!=='reward'||!_rewardAppearanceAllowed()||!(cards||[]).some(c=>c&&c._rewardAppearancePending)) return;
  const waves=applyRewardAppearanceEffects(cards);
  renderHandEditor();
  // 表示と加算の済んだ報酬・盤面を一緒に確定する。再開／元に戻すで同じ出現を数え直さない。
  _storeRewardStartSnapshot();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('reward');
  void _playRewardAppearanceBuffs(waves,_rewardRevealToken);
}
async function _playRewardAppearanceBuffs(waves,token){
  for(const indices of waves){
    if(token!==_rewardRevealToken||G.phase!=='reward') return;
    const targets=indices.map(i=>_activationSlotEl(i)).filter(el=>el&&el.isConnected);
    if(!targets.length||typeof VbFx==='undefined') continue;
    const duration=PRESENT_CARD_EFFECT_VFX_MS;
    if(typeof _vfxClipLayer==='function') VbFx.settings.layer=_vfxClipLayer;
    _playCardEffectSfxAtCue('S009',duration);
    await Promise.all(targets.map(el=>VbFx.play(presentLabFx('C040')[0],{source:el,targets:[el],durationMs:duration,speed:1,seed:53,dir:1}).catch(()=>{})));
  }
}
function _rewardRevealRarity(card){ return Math.max(1,Math.min(5,Number(card&&card.rarity)||1)); }
function _rewardRerollVfxIndex(cards){
  let best=-1;
  (cards||[]).forEach((card,i)=>{if(card&&(best<0||_rewardRevealRarity(card)>_rewardRevealRarity(cards[best]))) best=i;});
  return best;
}
function _rewardRerollFace(card){
  const front=mkCardEl(card,-1,'reveal');
  front.classList.add('reward-reveal-face');
  if(typeof applyCardVisual==='function') applyCardVisual(front,card);
  return front;
}
function _prepareRewardRerollReveal(cards,options){
  const host=document.getElementById('scr-battle'),row=document.getElementById('reward-offer-row');
  if(!host||!row||typeof cardRevealCreateRig!=='function') return null;
  const bounds=host.getBoundingClientRect(),scale=host.offsetWidth?bounds.width/host.offsetWidth:0;
  if(!(scale>0)) return null; // Node検査・非表示画面では描画だけ省く。
  _finishRewardReveal(true);
  const layer=document.createElement('div');layer.id='reward-reroll-layer';
  const rigs=[];
  Array.from(row.children).forEach(el=>{
    const idx=Number(el.dataset.mergeRewIdx),card=cards[idx],rect=el.getBoundingClientRect();
    if(!card||!(rect.width>0)) return;
    const rig=cardRevealCreateRig(_rewardRerollFace(card),rect.width/scale);
    rig.style.left=`${(rect.left-bounds.left)/scale}px`;rig.style.top=`${(rect.top-bounds.top)/scale}px`;
    if(!(options&&options.faceDown)) cardRevealShowFace(rig);
    layer.appendChild(rig);rigs.push({idx,rig});
  });
  if(!rigs.length) return null;
  host.appendChild(layer);
  document.body.classList.add('reward-reroll-active');
  _rewardRerollReveal={layer,rigs,token:_rewardRevealToken};
  return _rewardRerollReveal;
}
async function _playRewardRerollReveal(reveal,cards,options){
  try{
    if(options&&options.initial){
      await new Promise(resolve=>setTimeout(resolve,REWARD_REVEAL_START_MS));
      if(_rewardRerollReveal!==reveal||reveal.token!==_rewardRevealToken||G.phase!=='reward') return;
      _playRewardRevealSweep(reveal.layer.parentElement);
      await new Promise(resolve=>setTimeout(resolve,REWARD_REVEAL_SWEEP_MS));
    }else await Promise.all(reveal.rigs.map(({rig})=>cardRevealTurnDown(rig)));
    if(_rewardRerollReveal!==reveal||reveal.token!==_rewardRevealToken||G.phase!=='reward') return;
    // 表を向いた時の演出は、最もレアリティの高い1枚だけに出す（戦闘後・再抽選とも。2026-10-26 利用者指定）。
    const best=_rewardRerollVfxIndex(cards);
    reveal.rigs=reveal.rigs.filter(({rig,idx})=>{if(cards[idx]) return true;rig.remove();return false;});
    reveal.rigs.forEach(({rig,idx})=>{
      rig._cr.faceFront.querySelector('.cr-front-content').replaceChildren(_rewardRerollFace(cards[idx]));
      rig.style.zIndex=idx===best?'2':'1';
    });
    // 全部が裏になった後、その場で通常めくり。最高レアの1枚だけ、そのレアリティの演出でめくる。
    await cardRevealPlaySequence(reveal.rigs.map(x=>x.rig),reveal.rigs.map(x=>x.idx===best?_rewardRevealRarity(cards[x.idx]):1));
  }catch(e){console.error('[reward reroll]',e);}
  finally{
    if(_rewardRerollReveal===reveal){
      reveal.rigs.forEach(({rig})=>cardRevealReset(rig));reveal.layer.remove();
      _rewardRerollReveal=null;document.body.classList.remove('reward-reroll-active');
      _completeRewardAppearance(cards);
      towerBoonSyncRerollButton();
    }
  }
}
function _playRewardReveal(){
  if(!REWARD_RARITY_REVEAL_ENABLED){
    const cards=(_rewCards||[]).slice(),reveal=_prepareRewardRerollReveal(cards,{faceDown:true});
    if(reveal) return _playRewardRerollReveal(reveal,cards,{initial:true});
    _completeRewardAppearance(cards);return;
  }
  const host=document.getElementById('scr-battle');
  const cards=(_rewCards||[]).filter(Boolean);
  if(!host||!cards.length||typeof cardRevealCreateRig!=='function'||typeof mkCardEl!=='function') return;
  const token=++_rewardRevealToken;
  document.body.classList.add('reward-reveal-active');
  const layer=document.createElement('div');
  layer.id='reward-reveal-layer';
  layer.innerHTML='<div class="reward-reveal-shade"></div>';
  const W=REWARD_REVEAL_CARD_W, H=W*(typeof CARD_REVEAL_ASPECT==='number'?CARD_REVEAL_ASPECT:1.5157);
  const total=cards.length*W+(cards.length-1)*REWARD_REVEAL_GAP;
  // 表の面は報酬欄と同じ寸法で描いて拡大する（CSSの .reward-reveal-face）。
  const nativeW=parseFloat(getComputedStyle(host).getPropertyValue('--hand-card-w'))||W;
  // 画面（3840×2160）の中央へ、横一列・上下中央で並べる。
  const rigs=cards.map((card,i)=>{
    const front=mkCardEl(card,-1,'reveal');
    front.classList.add('reward-reveal-face');
    front.style.setProperty('--rr-scale',String(W/nativeW));
    if(typeof applyCardVisual==='function') applyCardVisual(front,card);
    const rig=cardRevealCreateRig(front,W);
    rig.style.left=`${1920-total/2+i*(W+REWARD_REVEAL_GAP)}px`;
    rig.style.top=`${1080-H/2}px`;
    // **高レア度ほど手前に重ねる**（光・輪・火花の上に他のカードが来ないように。利用者指定）。
    rig.style.zIndex=String(_rewardRevealRarity(card));
    layer.appendChild(rig);
    return rig;
  });
  host.appendChild(layer);
  const rarities=cards.map(_rewardRevealRarity);
  window.setTimeout(async()=>{
    if(token!==_rewardRevealToken) return;
    try{ await cardRevealPlaySequence(rigs,rarities,{shakeTarget:layer}); }
    catch(e){ console.error('[reward reveal]',e); }
    if(token!==_rewardRevealToken) return;
    _finishRewardReveal(false);
    _completeRewardAppearance(cards);
  },REWARD_REVEAL_START_MS);
}
// immediate=true：演出なしで即座に片付ける（画面を離れた時・次の報酬画面に入る時）。
function _finishRewardReveal(immediate){
  const layer=document.getElementById('reward-reveal-layer');
  if(immediate) _rewardRevealToken++;
  if(immediate&&_rewardRerollReveal){
    _rewardRerollReveal.rigs.forEach(({rig})=>cardRevealReset(rig));_rewardRerollReveal.layer.remove();
    _rewardRerollReveal=null;document.body.classList.remove('reward-reroll-active');
  }
  // 報酬欄のカードはCSSのトランジションでフェードインする。
  document.body.classList.remove('reward-reveal-active');
  if(immediate){ document.getElementById('reward-reveal-sweep')?.remove(); }
  if(!layer) return;
  if(immediate){ layer.remove(); return; }
  layer.classList.add('is-leaving');
  window.setTimeout(()=>layer.remove(),REWARD_REVEAL_FADE_MS+60);
  // 流れる光。手前の層と一緒に薄くならないよう、層の外（同じ画面の直下）に置く。
  _playRewardRevealSweep(layer.parentElement);
}
function _playRewardRevealSweep(host){
  if(host){
    document.getElementById('reward-reveal-sweep')?.remove();
    const sweep=document.createElement('div');
    sweep.id='reward-reveal-sweep';
    sweep.innerHTML='<i></i>';
    host.appendChild(sweep);
    window.setTimeout(()=>sweep.remove(),REWARD_REVEAL_SWEEP_MS+60);
  }
}

// ── 配置を戻す（2026-10-25 利用者指定。魔導取引所・編成画面）─────────────────────
// 「元に戻す」（resetRewardToStart：画面に入った時／リロール・起動の時の状態へ全部巻き戻す）と違い、
// **配置だけ**を画面に入った時へ戻す。リロール後の報酬・商品、アイテムの使用、カードに付いた強化は戻さない。
// 戻り先は画面に入った時（_rewPhaseId が変わった最初の記録）だけ取り、リロール・起動の記録では取り直さない。
// 盤面のカードに印（_placeKey）を付けて見分ける（魔導取引所はカードを写しで動かすので、物そのものでは追えない）。
function _capturePlacementStart(){
  if(G._placementStart&&G._placementStart.phaseId===_rewPhaseId) return;
  // 印はカードごとに一度だけ付け、付いていれば変えない（画面をまたいで盤面の中身が変わって見えないように）。
  // 盤面の中で印が重なった時（写しが並んだ等）だけ付け直す。
  const seen=new Set();
  const slots=(G.mainBoard||[]).map(c=>{
    if(!c) return null;
    if(!c._placeKey||seen.has(c._placeKey)){
      G._placeKeySeq=(Number(G._placeKeySeq)||0)+1;
      c._placeKey='p'+G._placeKeySeq;
    }
    seen.add(c._placeKey);
    return c._placeKey;
  });
  G._placementStart={phaseId:_rewPhaseId,slots,freePickDone:!!_rewFreePickDone};
}
// 画面に入った時に盤面にあったカードのうち、盤面にも報酬・商品枠にも無くなったものがあるか。
function rewardPlacementInitialMissing(){
  const base=G._placementStart;
  if(!base||base.phaseId!==_rewPhaseId) return true;
  const present=new Set([...(G.mainBoard||[]),...(_rewCards||[])].filter(Boolean).map(c=>c._placeKey).filter(Boolean));
  return base.slots.some(key=>key&&!present.has(key));
}
function _showInitialCardMissingError(){
  if(typeof showErrorOverlay!=='function') return false;
  return showErrorOverlay({
    title:_uiLabel('「初期カード不存在時」見出し','配置を戻せません'),
    message:_uiLabel('初期カード不存在時','この画面になった時のカードがどこにも存在しません。\n配置を戻すことは出来ませんでした。'),
    buttonKey:'「戻る」ボタン',
    buttonFallback:'戻る',
    buttonSfx:'uiConfirm'
  });
}
// 報酬・商品枠から盤面へ戻すカード：枠に置いた時の印（売却待ち・一時置き・取り戻し用の控え）を外す。
function _placementBoardCard(card){
  const out=clone(card);
  for(const key of ['_shopSalePending','_sellDisplayPrice','_temporaryRewardAreaCard','_isOriginalReward',
    '_rewardReturnCard','_rewardReturnIdx','_rewardReturnPhaseId']) delete out[key];
  return out;
}
// 盤面から報酬・商品枠へ返すカード。この画面で報酬から取ったカードは、報酬だった時の印（_isOriginalReward）を戻す。
// 取った後のアイテムの強化などは残す（取る前の控え _rewardReturnCard の姿へは戻さない）。
function _placementOfferCard(card){
  if(_isCardExchangeShop()) return _exchangeShopCardCopy(card);
  const out=clone(card);
  const original=card._rewardReturnCard&&card._rewardReturnPhaseId===_rewPhaseId?card._rewardReturnCard:null;
  for(const key of ['_rewardReturnCard','_rewardReturnIdx','_rewardReturnPhaseId']) delete out[key];
  if(original) out._isOriginalReward=!!original._isOriginalReward;
  return out;
}
function resetRewardPlacement(){
  if(G.phase!=='reward') return false;
  if(_ringOfferSelectionActive()){
    _clearRingOfferSelection(); renderHandEditor(); renderRewCards(); renderMoveSlotsInEnemy(); return true;
  }
  if(rewardPlacementInitialMissing()){ _showInitialCardMissingError(); return false; }
  _finishRewardReveal(true);
  const base=G._placementStart,keys=new Set(base.slots.filter(Boolean));
  const board=(G.mainBoard||[]).slice(),offers=Array.isArray(_rewCards)?_rewCards.slice():[];
  const find=key=>board.find(c=>c&&c._placeKey===key)||offers.find(c=>c&&c._placeKey===key);
  const nextBoard=base.slots.map(key=>{
    if(!key) return null;
    const card=find(key);
    return offers.includes(card)?_placementBoardCard(card):card;
  });
  // 画面に入った後に盤面へ来たカード（報酬・商品から取った分）は、報酬・商品枠へ返す。
  const outgoing=board.filter(c=>c&&!keys.has(c._placeKey));
  const shop=!!G._isShop,cap=shop?_shopSlotCapacity():REWARD_GRID_CAPACITY;
  const nextOffers=offers.map(c=>c&&keys.has(c._placeKey)?null:c);
  while(nextOffers.length<cap) nextOffers.push(null);
  for(const card of outgoing){
    if(!_rewardAreaAcceptsCard(card)){ _showInitialCardMissingError(); return false; }
    const want=Number.isInteger(card._rewardReturnIdx)&&card._rewardReturnPhaseId===_rewPhaseId?card._rewardReturnIdx:-1;
    const slot=want>=0&&want<cap&&!nextOffers[want]?want:nextOffers.findIndex((c,i)=>i<cap&&!c);
    if(slot<0){ _showInitialCardMissingError(); return false; }
    nextOffers[slot]=_placementOfferCard(card);
  }
  // 戦闘後の報酬枠は詰めて並べる（店の枠は位置を保つ）。
  _rewCards=shop?nextOffers.slice(0,cap):nextOffers.filter(Boolean);
  G.mainBoard=nextBoard;
  // 報酬から取った分を全部返すので、無料で取れる1枚も画面に入った時に戻る。
  if(!shop) _rewFreePickDone=!!base.freePickDone;
  G._pendingPanelPlacement=null;
  G._pendingItemUse=null; _syncItemUsePickingUi();
  if(typeof _closeItemUseConfirm==='function') _closeItemUseConfirm();
  _dragSrc=null;
  const unit=_getPartyBoardUnit();
  if(unit&&typeof _syncUnitPanelEffectsAfterMove==='function') _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(shop) _persistCurrentShopStock();
  if(typeof questCheckRetainedCards==='function') questCheckRetainedCards();
  updateHUD();
  renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderMoveSlotsInEnemy();
  return true;
}
// 「配置を戻す」ボタン。初期カードが無くなっていたら暗くし、押すとエラーを出す。
function _placementResetButton(){
  const reset=document.createElement('button');
  const missing=rewardPlacementInitialMissing();
  reset.className='btn rew-reset-btn'+(missing?' disabled':'');
  reset.dataset.sfxSilent='1';
  reset.innerHTML=`<span class="rew-btn-label">${_uiLabel('「配置を戻す」ボタン','配置を戻す')}</span>`;
  reset.onclick=()=>{
    if(rewardPlacementInitialMissing()){ _showInitialCardMissingError(); return; }
    if(typeof playSfx==='function') playSfx('return',{group:'ui'});
    resetRewardPlacement();
  };
  return reset;
}

function _storeRewardStartSnapshot(){
  _capturePlacementStart();
  G._rewardStartSnapshot={
    retainedQuests:typeof questRetainedProgressSnapshot==='function'?questRetainedProgressSnapshot():{},
    rewCards:clone(_rewCards||[]),
    mainBoard:clone(G.mainBoard||[]),
    globalPanels:clone(G.globalPanels||[]),
    spellSlots:clone(G.spellSlots||[]),
    gold:G.gold,
    rerolls:towerBoonState().rerolls,
    facilityRerollSeq:Number(G._shopRerollSeq)||0,
    freePickDone:!!_rewFreePickDone,
    selectedBoardUnitIdx:G._selectedBoardUnitIdx,
    rings:clone(G.rings||[]),
    ringOffer:clone(G._ringOffer||[]),
    ringOfferUnlocked:!!G._ringOfferUnlocked,
    ringOfferResolved:!!G._ringOfferResolved,
    boardDiscardCount:G._boardDiscardCount||0,
    // 旧セーブの還魂控え。新しい祭壇の選択はリセット時に解除する。
    ringSacrificedCards:clone(G._ringSacrificedCards||[]),
    // 指輪取得を含む確定済み操作を戻す時は、ライフも同じ時点へ戻す。
    ascensionLifeBonus:Number(G.ascensionLifeBonus)||0,
    waveLife:G._waveLife,
    life:G.life,
    ringOfferPhase:!!G._ringOfferPhase,
    mapPanelPowers:clone(G.mapPanelPowers||{}),
    mapForgeOffers:clone(G._mapForgeOffers||[]),
    pendingMapForgePower:G._pendingMapForgePower?clone(G._pendingMapForgePower):null
  };
}

// 店を出る時に確定対象となる状態だけを、入店時スナップショットと比較する。
// 商品の並びや画面の選択状態は対象外。カードの並べ替えだけでも mainBoard が変われば保存する。
function _facilityCommitStateChanged(){
  const s=G&&G._rewardStartSnapshot;
  if(!s) return false;
  const stable=value=>{
    try{
      return JSON.stringify(typeof SaveRun!=='undefined'&&typeof SaveRun.copy==='function'
        ?SaveRun.copy(value):value);
    }catch(_e){ return ''; }
  };
  return !!s.facilityRerolled||stable(G.mainBoard||[])!==stable(s.mainBoard||[])
    ||stable(G.globalPanels||[])!==stable(s.globalPanels||[])
    ||stable(G.mapPanelPowers||{})!==stable(s.mapPanelPowers||{})
    ||stable(G.spellSlots||[])!==stable(s.spellSlots||[])
    ||stable(G.rings||[])!==stable(s.rings||[])
    ||Number(G.gold||0)!==Number(s.gold||0)
    ||(s.rerolls!=null&&towerBoonState().rerolls!==s.rerolls)
    ||(Number(G._shopRerollSeq)||0)!==(Number(s.facilityRerollSeq)||0);
}

function resetRewardToStart(options){
  if(G.phase!=='reward') return;
  if(_ringOfferSelectionActive()){
    _clearRingOfferSelection(); renderHandEditor(); renderRewCards(); renderMoveSlotsInEnemy(); return;
  }
  if(!G._rewardStartSnapshot) return;
  _finishRewardReveal(true);
  const s=G._rewardStartSnapshot;
  if(s.retainedQuests&&typeof questRestoreRetainedProgress==='function') questRestoreRetainedProgress(s.retainedQuests);
  const _forgePlacementOnly=!!(options&&options.forgePlacementOnly);
  const _forgePowers=_forgePlacementOnly?clone(G.mapPanelPowers||{}):null;
  const _forgeOffers=_forgePlacementOnly?clone(G._mapForgeOffers||[]):null;
  const _forgeGold=_forgePlacementOnly?G.gold:null;
  _rewCards=clone(s.rewCards||[]);
  G.mainBoard=clone(s.mainBoard||[]);
  // 旧いランセーブ内のスナップショットにはこの項目が無い。
  // 欠落時は現在値を消さず、新しいスナップショットだけ正確に巻き戻す。
  if(Array.isArray(s.globalPanels)) G.globalPanels=clone(s.globalPanels);
  G.spellSlots=clone(s.spellSlots||[]);
  G.gold=_forgePlacementOnly?Number(_forgeGold)||0:Number(s.gold)||0;
  _rewFreePickDone=!!s.freePickDone;
  G._selectedBoardUnitIdx=Number.isInteger(s.selectedBoardUnitIdx)?s.selectedBoardUnitIdx:0;
  G.rings=clone(s.rings||[null,null,null,null]);
  G._ringOffer=clone(s.ringOffer||[]);
  G._ringOfferUnlocked=!!s.ringOfferUnlocked;
  G._ringOfferResolved=!!s.ringOfferResolved;
  G._boardDiscardCount=s.boardDiscardCount||0;
  // 「元に戻す」で還魂の音の段階も最初へ戻す（3枚捧げて戻すと、次の1枚目で ring_get3 が鳴っていた。2026-09-28 利用者指摘）。
  G._ringSacrificedCards=clone(s.ringSacrificedCards||[]);
  if(s.ascensionLifeBonus!=null){ G.ascensionLifeBonus=s.ascensionLifeBonus; G._waveLife=s.waveLife; G.life=s.life; }
  G._ringOfferPhase=!!s.ringOfferPhase;
  _restoreLegacyRingSacrifices();
  _clearRingOfferSelection();
  G.mapPanelPowers=_forgePlacementOnly?_forgePowers:clone(s.mapPanelPowers||{});
  G._mapForgeOffers=_forgePlacementOnly?_forgeOffers:clone(s.mapForgeOffers||[]);
  G._pendingMapForgePower=_forgePlacementOnly?G._pendingMapForgePower:(s.pendingMapForgePower?clone(s.pendingMapForgePower):null);
  G._pendingPanelPlacement=null;
  // アイテムの対象選択中（生贄人形などの1枚目を選んだ状態）に「元に戻す」を押すと、
  // G._pendingItemUse がリセット前の盤面スナップショットを抱えたまま残る。
  // その後に右クリック等で選択が中断されると、そのスナップショットが盤面へ書き戻され、
  // 報酬カードが「盤面」と「報酬枠」の両方に存在してしまう（同じカードを何度でも入手できる）。
  // リセット時点で選択そのものを破棄する（スナップショットの復元は行わない）。
  G._pendingItemUse=null; _syncItemUsePickingUi();
  if(typeof _closeItemUseConfirm==='function') _closeItemUseConfirm();
  G._showGlobalPanels=false;
  _dragSrc=null;
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  const gold=document.getElementById('rw-gold');
  if(gold) gold.textContent=rewardGoldText();
  updateHUD();
  if(G._isForge&&typeof renderMapForgeOffers==='function') renderMapForgeOffers();
  else renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderMoveSlotsInEnemy();
  if((G._isRingExchange||_isCardExchangeShop())&&typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
}

// ── 行き先ノード表示 ───────────────────────────

// 出撃可否の判定は formation.js の出撃規則をそのまま使う。
function _noDeployableBoardCharacter(){
  if(typeof boardHasDeployableCharacter!=='function') return false;
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  if(!board) return false;
  return !boardHasDeployableCharacter(board);
}
function _showNoDeployableCharacterError(){
  if(typeof showErrorOverlay!=='function') return false;
  return showErrorOverlay({
    title:_uiLabel('「戦闘キャラ不在時」見出し','戦闘不可'),
    message:_uiLabel('戦闘キャラ不在時','戦闘可能なキャラクターがいません。\n封印の効果を持たないキャラクターを1枚以上、召喚可能なマスに置いてください。'),
    buttonKey:'「戻る」ボタン',
    buttonFallback:'戻る',
    // 押した時の音は、オプション画面の「戻る」と同じ（2026-09-28 利用者指定）。
    buttonSfx:'uiConfirm'
  });
}
// 編成を閉じる／出撃する操作は、施設・イベント・図書館とも同じ判定と窓を使う。
function guardFormationLeave(){
  if(!_noDeployableBoardCharacter()) return true;
  _showNoDeployableCharacterError();
  return false;
}
function _hasUnclaimedBattleReward(){
  return !!(G&&G.phase==='reward'&&!G._onlineMode&&G._rewardOnePickMode&&!_rewFreePickDone
    &&!_isInVillageScene()&&!G._isPeddler&&!G._isFiveSaints&&!G._ringOfferPhase
    &&!runLevelRewardActive()&&!blessingFlameActive()
    &&(_rewCards||[]).some(card=>card&&card._isOriginalReward&&!card._shopSalePending
      &&!card._temporaryRewardAreaCard));
}
function _confirmUnclaimedBattleReward(onOk){
  if(!_hasUnclaimedBattleReward()){ onOk(); return; }
  showGameConfirm({
    title:_uiLabel('「編成画面の報酬枠」見出し','報酬'),
    message:_uiLabel('報酬未入手時','報酬カードをまだ取得していません。\nこのまま進みますか？'),
    onOk
  });
}
function renderMoveSlotsInEnemy(){
  const el=document.getElementById('reward-move-btns');
  if(!el) return;
  el.innerHTML='';
  // デバッグモード：演出確認用の試験戦闘ボタン（報酬/編成フェイズ中のみ表示）
  // デバッグボタンはデバッグモード＋編成画面の間だけ出す。
  ['btn-debug-kill','btn-test-battle','btn-debug-gameover','btn-debug-quest','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'].forEach(id=>{
    const el=document.getElementById(id);
    // 闘技場の継戦確認の間は出さない（勝利後に phase が reward になるため、確認窓の後ろに出ていた）。
    if(el) el.style.display=(G._debugMode&&G.phase==='reward'&&!(typeof debugButtonsSuppressed==='function'&&debugButtonsSuppressed()))?'':'none';
  });
  if(blessingFlameActive()){ blessingFlameRenderControls(el);return; }
  if(runLevelRewardActive()){
    const next=document.createElement('button');next.className='btn rew-move-btn';
    next.innerHTML=`<span class="rew-btn-label">${_uiLabel('「進む」ボタン','進む')}</span>`;
    next.onclick=()=>{ if(!G._pendingPanelPlacement&&guardFormationLeave()) _startWaveFlowNext(); };
    el.appendChild(next);return;
  }
  if(G._isLibrary){
    const test=document.createElement('button');
    test.className='btn rew-move-btn library-test-btn';
    test.dataset.sfxSilent='1';
    test.innerHTML=`<span class="rew-btn-label">${_uiLabel('「試験戦闘」ボタン','試験戦闘')}</span>`;
    test.onclick=()=>{
      if(test.disabled) return;
      if(!guardFormationLeave()) return;
      if(typeof playSfx==='function') playSfx('menuClose',{group:'ui'});
      startTestBattle();
    };
    const restore=document.createElement('button');
    restore.className='btn rew-reset-btn';
    restore.dataset.sfxSilent='1';
    restore.innerHTML=`<span class="rew-btn-label">${_uiLabel('「元に戻す」ボタン','元に戻す')}</span>`;
    restore.onclick=()=>{
      if(typeof playSfx==='function') playSfx('return',{group:'ui'});
      if(typeof resetLibraryLoanFormation==='function') resetLibraryLoanFormation();
    };
    const quit=document.createElement('button');
    quit.className='btn rew-reset-btn library-quit-btn';
    quit.dataset.sfxSilent='1';
    // **ボタンの文言はテキストメッセージシートが唯一の出どころ。**
    quit.innerHTML=`<span class="rew-btn-label">${_uiLabel('「読書をやめる」ボタン','読書をやめる')}</span>`;
    quit.onclick=()=>{
      if(quit.disabled) return;
      if(typeof closeMapLibraryFormation==='function') closeMapLibraryFormation();
    };
    // 現在の編成の出撃可否は closeMapLibraryFormation の共通ガードで確認する。
    el.appendChild(quit);
    el.appendChild(restore);
    el.appendChild(test);
    return;
  }
  if(G._isShop||G._isForge||G._isTavern||G._isRingExchange||G._isLibrary||G._isFiveSaints){
    // Wave進行中のショップ/鍛冶屋/指輪交換は、村/祭壇の施設なのでボタンを押しても次stageへは進めず、
    // 項目選択（村/祭壇メニュー）へ戻るだけにする。
    // 行商人（敗北後の編成画面を兼ねる）は店を出るのではなく、そのまま再戦へ進む。
    const _waveFacilityReturn=G._isLibrary||((G._isShop&&!G._isPeddler)||G._isForge||G._isRingExchange);
    const ringDepartureControl=!_waveFacilityReturn&&!G._isTavern&&!G._isFiveSaints;
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.dataset.sfxSilent='1';
    // オンライン対戦：次が編成画面なら「編成完了 1/3」のように残り回数を出す（値はサーバー由来）。
    const _onlineLabel=(()=>{
      if(!(G&&G._onlineMode)||typeof OnlineMatch==='undefined'||!OnlineMatch) return '';
      const st=OnlineMatch.getState();
      if(!st) return '';
      // 編成マス以外（対戦マスなど）では通常戦闘を行わないので「戦闘開始」は出さない。
      if(st.nodeType!=='formation') return _uiLabel('オンライン対戦「戦闘開始」ボタン（待機時）','戦闘待機中');
      const i=Math.max(1,Number(st.formationIndex)||1), n=Math.max(1,Number(st.formationTotal)||3);
      // シートの本文は「選択完了 n/3」の形。**数字はサーバーの値で置き換える。**
      // n（またはX）＝今の回数、その後ろの「/数字」＝必要な回数。
      return _uiLabel('オンライン対戦「戦闘開始」ボタン','選択完了 n/3')
        .replace(/[nX]/,String(i)).replace(/\/\s*\d+/,`/${n}`);
    })();
    // 同じ戦闘への再挑戦は「再戦」と出す（判定は main.js の _waveRetryPending()）。
    const _startLabel=(typeof _waveRetryPending==='function'&&_waveRetryPending())
      ?_uiLabel('「再戦」ボタン','再戦'):_uiLabel('「戦闘開始」ボタン','戦闘開始');
    const label=_waveFacilityReturn
      ?(G._isLibrary?_uiLabel('「図書館を出る」ボタン','図書館を出る')
        :(G._isRingExchange?_uiLabel('「祭壇を離れる」ボタン','祭壇を離れる'):_uiLabel('「店を出る」ボタン','店を出る')))
      :(_onlineLabel||((G._isShop||G._isForge)?_startLabel
        :G._isWaveAltar?_uiLabel('「出発する」ボタン','出発する')
        :(G._isTavern||G._isFiveSaints)?_uiLabel('「拒否」ボタン','拒否'):_startLabel));
    btn.innerHTML=`<span class="rew-btn-label">${label}</span>`;
    btn.onclick=()=>{
      if(G._pendingPanelPlacement) return;
      if(ringDepartureControl&&!guardRingExchangeDeparture()) return;
      if(!_waveFacilityReturn&&G._moveInlineLocked) return;
      if(_waveFacilityReturn&&!guardFormationLeave()) return;
      if(!_waveFacilityReturn&&typeof playSfx==='function') playSfx('menuClose',{group:'ui'});
      if(_waveFacilityReturn){
        // 出る時も、出る音（out）とは別に ui_confirm を鳴らす（このボタンは data-sfx-silent。2026-10-03 利用者指定）。
        // **押した瞬間に鳴らす。** 暗転の後（goBack の中）で鳴らすと遅れて聞こえた。
        if(typeof playSfx==='function') playSfx('uiConfirm',{group:'ui',guardKey:'ui:button'});
        const goBack=()=>{
          if(G._isRingExchange){
            if(typeof _openWaveAltarMenu==='function') _openWaveAltarMenu();
          }else if(G._isLibrary){
            if(typeof playSfx==='function') playSfx('return',{group:'ui'});
            if(typeof openMapVillage==='function') openMapVillage();
          }else{
            if(typeof openMapVillage==='function') openMapVillage();
          }
        };
        // 魔導店の交換はその場で完了し、未決済のカードを残さない。
        // 途中離脱の確認が要るのは祭壇（カードを捧げ切る前に離れる時）だけ。
        // 施設を出る時は暗転を挟む（map.js の fadeScreenSwitch。2026-09-24 利用者指定）。
        const goBackFaded=()=>{
          // 出る音（祭壇＝altarOut、店など＝shopOut）は暗転の後ではなく、ui_confirm の直後に鳴らす（2026-10-04 利用者指定）。
          // 祭壇の途中離脱の確認を挟む時は、確認して離れる時点から。図書館は return.wav を goBack で鳴らす（従来どおり）。
          if(!G._isLibrary&&typeof playSfxAfterConfirm==='function') playSfxAfterConfirm(G._isRingExchange?'altarOut':'shopOut',{group:'ui'});
          // 指輪交換の途中離脱では、この関数へ来る前に捧げたカードを回収している。
          // 回収後の正式状態で差分を判定する。
          const changed=_facilityCommitStateChanged();
          const leave=async()=>{
            goBack();
            if(!changed||typeof SaveRun==='undefined'||!SaveRun.enabled()) return;
            const saved=SaveRun.checkpoint(G._isWaveAltar?'tower':'town');
            if(saved&&typeof SaveRun.showAutoSaveIndicator==='function'){
              void SaveRun.showAutoSaveIndicator();
            }
          };
          if(typeof fadeScreenSwitch==='function') void fadeScreenSwitch(leave);
          else void leave();
        };
        if(G._isRingExchange) _confirmRingExchangeReturn(goBackFaded);
        else goBackFaded();
        return;
      }
      // 塔（祭壇）の「出発する」も、街と同じくワールドマップ画面を挟んでから次へ進む。
      if(G._isWaveAltar&&typeof departWithWorldMap==='function'){ departWithWorldMap({save:true}); return; }
      if(typeof shopDone==='function') shopDone();
    };
    if(ringDepartureControl) syncRingExchangeDepartureButton(btn);
    el.appendChild(btn);
    // 鍛冶屋には「元に戻す」を置かない（ショップ・指輪交換とは異なり、鍛冶屋は仕様として置かない）。
    // ただしデバッグモードでは検証用に鍛冶屋でも表示し、押すと入店時点まで巻き戻す。
    // 酒場（依頼カードを受け取る画面）にも置く（2026-09-24 利用者指定）。戻り先は依頼カードを
    // 報酬枠へ置いた直後のスナップショット（quest.js の _qOpenTavernFormation）。
    // 鍛冶屋には置かない（デバッグモードでも出さない。2026-09-24 利用者指定）。
    // 五聖の座にも置く。刻印は手放せないが、この場面でだけ「元に戻す」で報酬枠へ戻せる（2026-10-01 利用者指定）。
    const canResetMapReward=!G._isLibrary&&!G._isVillageMenu&&!G._isForge;
    // 魔導取引所（トレーダー・道具屋を除く）は「配置を戻す」（2026-10-25 利用者指定）。
    if(canResetMapReward&&G._isShop&&!G._isPeddler&&!G._isItemShop){
      el.appendChild(_placementResetButton());
    }else if(canResetMapReward){
      const reset=document.createElement('button');
      reset.className='btn rew-reset-btn';
      reset.dataset.sfxSilent='1';
      reset.innerHTML=`<span class="rew-btn-label">${_uiLabel('「元に戻す」ボタン','元に戻す')}</span>`;
      reset.onclick=()=>{
        if(typeof playSfx==='function'){
          if(G._isTavern||G._isFiveSaints) playSfx('uiConfirm',{group:'ui',guardKey:'ui:button'});
          else playSfx('return',{group:'ui'});
        }
        // 鍛冶屋（デバッグ時のみ表示）は入店時点まで完全に巻き戻す。forgePlacementOnlyは
        // 購入済みのパネル力・所持金・提示内容を保持してしまうため使わない。
        resetRewardToStart(null);
        if(G._isForge&&typeof renderMapForgeOffers==='function') renderMapForgeOffers();
      };
      el.appendChild(reset);
    }
    if(G._isTavern&&typeof syncTavernFormationControls==='function') syncTavernFormationControls();
    if(G._isFiveSaints&&typeof syncFiveSaintsFormationControls==='function') syncFiveSaintsFormationControls();
    return;
  }
  let opts;
  if(G._isShop){
    const _nextIsBoss=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss;
    opts=[{nodeType:_nextIsBoss?'boss':'battle',idx:-1}];
  } else if(G._retryFloor){
    const nodeType=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle';
    opts=[{nodeType,idx:-1}];
  } else {
    // 戦闘終了後の進行先は次階層のボス有無だけで決まる（分岐は発生しない）
    const _nextIsBoss=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss;
    opts=[{nodeType:_nextIsBoss?'boss':'battle',idx:-1}];
  }
  opts.slice(0,3).forEach(opt=>{
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.dataset.sfxSilent='1';
    // オンライン対戦：次が編成画面なら「編成完了 1/3」のように残り回数を出す（値はサーバー由来）。
    const _onlineFormLabel=(()=>{
      if(!(G&&G._onlineMode)||typeof OnlineMatch==='undefined'||!OnlineMatch) return '';
      if(G._onlineWaiting) return _uiLabel('オンライン対戦「戦闘開始」ボタン（待機時）','戦闘待機中');
      const st=OnlineMatch.getState();
      if(!st) return '';
      // 編成マス以外（対戦マスなど）では通常戦闘を行わないので「戦闘開始」は出さない。
      if(st.nodeType!=='formation') return _uiLabel('オンライン対戦「戦闘開始」ボタン（待機時）','戦闘待機中');
      const i=Math.max(1,Number(st.formationIndex)||1), n=Math.max(1,Number(st.formationTotal)||3);
      // シートの本文は「選択完了 n/3」の形。**数字はサーバーの値で置き換える。**
      // n（またはX）＝今の回数、その後ろの「/数字」＝必要な回数。
      return _uiLabel('オンライン対戦「戦闘開始」ボタン','選択完了 n/3')
        .replace(/[nX]/,String(i)).replace(/\/\s*\d+/,`/${n}`);
    })();
    // 同じ戦闘への再挑戦は「再戦」と出す（判定は main.js の _waveRetryPending()）。
    const _startLabel2=(typeof _waveRetryPending==='function'&&_waveRetryPending())
      ?_uiLabel('「再戦」ボタン','再戦'):_uiLabel('「戦闘開始」ボタン','戦闘開始');
    const label=_onlineFormLabel||_startLabel2;
    btn.innerHTML=`<span class="rew-btn-label">${label}</span>`;
    btn.onclick=()=>{
      if(!guardRingExchangeDeparture()) return;
      if(btn.disabled||G._moveInlineLocked) return;
      if(!_onlineFormLabel&&!guardFormationLeave()) return;
      _confirmUnclaimedBattleReward(()=>{
        if(btn.disabled||G._moveInlineLocked||G._pendingPanelPlacement) return;
        btn.disabled=true;
        if(typeof playSfx==='function') playSfx('menuClose',{group:'ui'});
        chooseMoveInline(opt.nodeType);
      });
    };
    if(G._pendingPanelPlacement||G._moveInlineLocked){ btn.classList.add('disabled'); btn.disabled=true; }
    syncRingExchangeDepartureButton(btn);
    el.appendChild(btn);
  });
  // 編成画面は「配置を戻す」（2026-10-25 利用者指定。以前の「元に戻す」は resetRewardToStart）。
  el.appendChild(_placementResetButton());
}

function chooseMoveInline(nt){
  if(!guardRingExchangeDeparture()) return;
  if(G._pendingPanelPlacement) return;
  if(G._moveInlineLocked) return; // 連打による戦闘開始の二重発火を防止
  G._moveInlineLocked=true;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    SaveRun.lockInput(true);
    // 実際に「戦闘開始／再戦」を押した経路だけ、prepareBattleの保存後に高速表示する。
    G._battleStartAutosaveRequested=true;
    // 報酬取得・編成変更はこの確定操作を押すまで開始チェックポイントへ書かない。
    // 押した時点の正式状態を保存し、戦闘準備完了時にbattleチェックポイントで上書きする。
    if(!SaveRun.checkpoint('reward')){
      delete G._battleStartAutosaveRequested;
      SaveRun.lockInput(false);
      G._moveInlineLocked=false;
    return;
    }
  }
  G._isShop=false; // 行商モード解除
  setTimeout(()=>{
    G._moveInlineLocked=false;
    if(G._pendingPanelPlacement) return;
    document.getElementById('reward-info-bar').style.display='none';
    document.getElementById('reward-cards-section').style.display='none';
    const moveBtns=document.getElementById('reward-move-btns');
    if(moveBtns) moveBtns.style.display='none';
    _startWaveFlowNext();
  }, 900);
}

// ── 報酬カード描画 ─────────────────────────────

function _dragSrcCard(){
  if(!_dragSrc) return null;
  if(_dragSrc.arr==='boardCards') return (_getPartyBoardUnit().boardCards||[])[_dragSrc.idx]||null;
  if(_dragSrc.arr==='spellSlots') return (G.spellSlots||[])[_dragSrc.idx]||null;
  return null;
}
function _canReturnDragSrcToRewardArea(){
  // #reward-offer-row（＝#reward-offer-section内）は祭壇・指輪依頼の提示中は指輪専用の
  // 表示に切り替わっているため、通常報酬フェイズ用の「カードを報酬置き場へ戻す」動作の対象外にする
  // （この関数のリスナー自体は#reward-offer-rowに一度だけ登録され、フェイズが変わっても残り続けるため
  // ここで都度チェックする必要がある）。
  if(G._ringOfferPhase) return false;
  if(_isCardExchangeShop()) return false;
  if(G._isShop&&!_isItemCard(_dragSrcCard())&&!_cardTradingRules().sellCards) return false;
  if(G._isForge) return false;
  // 五聖の座は提示された刻印を盤面へ置く一方向の編成。盤面カードとの報酬枠交換を許すと、
  // 抑圧の刻印が指定マス判定を通らずドラッグ元マスへ入る。戻す操作は全体リセットだけに限定する。
  if(G._isFiveSaints) return false;
  if(!_dragSrc||!['boardCards','spellSlots'].includes(_dragSrc.arr)) return false;
  // 図書館の貸出カード枠には、貸出カード（_libraryLoan）しか戻せない。
  // 自前の所持カードを置けてしまうと、図書館を出た時点でそのカードを失う。
  if(G._isLibrary){ const c=_dragSrcCard(); if(!c||!c._libraryLoan) return false; }
  if(!_rewardAreaAcceptsCard(_dragSrcCard())) return false;
  return true;
}
function _isShopSoldOutDropBlocked(target){
  const hasDragSource=!!_dragSrc||(_fieldDragSrc>=0)||(_rewDragSrc>=0);
  return !!(G&&G._isShop&&hasDragSource
    &&target&&target.closest&&target.closest('.shop-sold-out'));
}
// 売切れ枠は表示専用。子要素や親コンテナのdrop処理へイベントが伝播しても、
// 魔導板を含む全てのドラッグ元から絶対に受け付けない。
if(!window._shopSoldOutDropGuardBound){
  window._shopSoldOutDropGuardBound=true;
  ['dragover','drop'].forEach(type=>document.addEventListener(type,e=>{
    if(!_isShopSoldOutDropBlocked(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(e.target&&e.target.closest){
      const slot=e.target.closest('.shop-sold-out');
      slot.classList.remove('drag-over');
    }
  },true));
}
function _returnDragSrcToRewardArea(targetIdx){
  if(!_dragSrc) return;
  if(!_canReturnDragSrcToRewardArea()) return;
  const src=_dragSrc;
  const card=_dragSrcCard();
  if(!card) return;
  let unit=null;
  if(src.arr==='boardCards'){
    unit=_getPartyBoardUnit();
    if(!unit||!unit.boardCards) return;
    const nextBoardList=(unit.boardCards||[]).slice();
    nextBoardList[src.idx]=null;
    if(!_canApplyBoardChange(unit,nextBoardList)) return;
  }
  // 魔導板のカードを、既に埋まっている報酬スロットへドロップした場合は、その場で入れ替える
  // （押し出された報酬カードを、ドラッグ元の魔導板スロットへそのまま戻す）
  let displacedToEquip=null;
  let restored;
  if(Number.isInteger(targetIdx)&&targetIdx>=0){
    if(src.arr==='boardCards'){
      const swapResult=_pushToRewardAreaAt(card,targetIdx,true);
      restored=swapResult.ok;
      displacedToEquip=swapResult.displaced;
    } else {
      restored=_pushToRewardAreaAt(card,targetIdx);
    }
  } else {
    restored=_restoreRewardReturnCard(card)||_pushToRewardArea(card);
  }
  if(!restored) return;
  _dragSrc=null;
  if(src.arr==='boardCards'){
    unit.boardCards[src.idx]=displacedToEquip||null;
    _syncUnitPanelEffectsAfterMove(unit);
    if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  } else if(src.arr==='spellSlots'){
    G.spellSlots[src.idx]=null;
  }
  renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
  if(G._isTavern&&typeof syncTavernFormationControls==='function') syncTavernFormationControls();
}
// 報酬カード置き場：配置順（戦闘順序）置き場を廃止し、同じ画面位置（#reward-offer-section）にそのまま
// 報酬カードを横スクロール行として並べる。データ(_rewCards)自体は従来通り。
// 所持金・ターン枠（#reward-production-ui .reward-prod-bottom）の表示更新。
// 編成画面専用ではなく、マップ・戦闘画面でも同じ枠を常時表示するため、
// 報酬フェイズ外からも（updateHUD経由で）呼べるよう独立させてある。
// ボタン・見出しの文言をテキストメッセージシートから引く（予備はコード側の文字列）。
function _uiLabel(key,fallback){
  return typeof textMessage==='function'?textMessage(key,fallback):String(fallback||'');
}
function _syncMoneyTurnTile(){
  const gold=document.querySelector('.reward-prod-money-value');
  if(gold) gold.textContent=Number(G.gold||0).toLocaleString('ja-JP');
  const tile=document.querySelector('.reward-prod-turn');
  const turn=document.querySelector('.reward-prod-turn-value');
  const turnLabel=document.querySelector('.reward-prod-turn-label');
  if(turn){
    {
      // 元々ターン枠だった場所は「ライフ」表示に変更する（♥=残りライフ、♡=失ったライフ）。
      if(tile) tile.classList.remove('is-alert');
      // **見出しはテキストメッセージシートが唯一の出どころ**（「ライフ枠見出し」）。
      if(turnLabel) turnLabel.textContent=typeof textMessage==='function'?textMessage('「ライフ枠」見出し','ライフ'):'ライフ';
      const _lifeMax=typeof waveLifeMax==='function'?waveLifeMax():3;
      const life=Math.max(0,Math.min(_lifeMax,G._waveLife==null?_lifeMax:Number(G._waveLife)));
      // ハートの絵は main.js の lifeHeartHtml() が唯一の実装（life.svg）。
      turn.innerHTML=Array.from({length:_lifeMax},(_,i)=>lifeHeartHtml(i>=_lifeMax-life)).join('');
    }
  }
  // 「エリート／ボス襲撃まであとNターン」の表示は廃止済み。
  // 残り戦闘数は「旅の進捗」枠が出す（reward_journey.js の _journeyCountdownHtml）。
}
// 編成画面の左上ラベル。施設から入った場合は「編成」ではなく施設名を出す。
function _syncRewardTitleLabel(){
  const el=document.querySelector('#reward-production-ui .reward-prod-title span');
  if(!el) return;
  // 街から入った施設は、シートに書かれた施設名そのまま（G._facilityLabel）を優先する。
  const fromVillage=(G._isItemShop||G._isForge||G._isShop||G._isLibrary||G._isTavern||G._isFiveSaints||G._isBlessingFlame)?String(G._facilityLabel||'').trim():'';
  const visibleFromVillage=G._isPeddler
    ?fromVillage.replace(/^行商人?(?=[ 　]|$)/,'トレーダー')
    :G._isShop?fromVillage.replace(/魔道店|魔導店/g,'魔導取引所'):fromVillage;
  // **見出しはテキストメッセージシートが唯一の出どころ**（「◯◯見出し」）。
  const t=(key,fallback)=>(typeof textMessage==='function'?textMessage(key,fallback):fallback);
  const shopTitle=typeof textMessage==='function'
    ?(textMessage('「魔導取引所」見出し','')||textMessage('「魔導店」見出し','魔導取引所'))
    :'魔導取引所';
  el.textContent=visibleFromVillage
    ||(G._isItemShop?t('「道具屋」見出し','道具屋')
    :G._isForge?t('「鍛冶屋」見出し','鍛治屋')
    :G._isShop?String(shopTitle).replace(/魔道店|魔導店/g,'魔導取引所')
    :G._isRingExchange?t('「祭壇」見出し','祭壇')
    :t('「編成画面」見出し','編成'));
  const rewardLabel=Array.from(document.querySelectorAll('#reward-info-bar .ri-soul')).find(node=>node.querySelector('#rw-count'));
  if(rewardLabel&&rewardLabel.firstChild) rewardLabel.firstChild.nodeValue=`${G._isFiveSaints&&typeof fiveSaintsRewardSlotTitle==='function'
    ?fiveSaintsRewardSlotTitle()
    :G._isLibrary?_uiLabel('「図書館の報酬枠」見出し','貸出カード')
    :_uiLabel('「編成画面の報酬枠」見出し','報酬')} `;
}
function _syncRewardProductionUi(){
  const body=document.body;
  if(!body) return;
  _syncRewardJourneyUi();
  if(!G||G.phase!=='reward'){
    body.classList.remove('reward-pick-finished','reward-return-open','reward-pick-taken','reward-pick-resources-dim','forge-screen-active','shop-screen-active','tavern-screen-active','five-saints-formation-active');
    body.classList.remove('map-forge-roll-hide-cards');
    _syncMoneyTurnTile();
    return;
  }
  body.classList.toggle('forge-screen-active',!!G._isForge);
  body.classList.toggle('shop-screen-active',!!G._isShop);
  body.classList.toggle('item-shop-active',!!G._isItemShop);
  body.classList.toggle('tavern-screen-active',!!G._isTavern);
  _syncRewardTitleLabel();
  const dragging=Array.from(body.classList).some(c=>c.indexOf('dragzone-')===0);
  const returned=Array.isArray(_rewCards)&&_rewCards.some(c=>c&&c._temporaryRewardAreaCard);
  const returnDragging=dragging&&(G._isForge?_canReturnDragSrcToRewardArea():true);
  const finished=!!(G._rewardOnePickMode&&_rewFreePickDone&&!G._pendingPanelPlacement&&!returned&&!returnDragging);
  body.classList.toggle('reward-pick-finished',finished);
  body.classList.toggle('reward-return-open',returned||returnDragging);
  // 編成完了ボタンのfix.png表示切り替え用：元々持っていたカードを報酬置き場に残していても
  // （＝returnedがtrueでも）、無料ピックを取得済みならfix.png表示とする。
  // 祭壇・指輪依頼の提示中は、指輪を取得済みになった時だけfix表示にする。
  const pickTaken=G._ringOfferPhase
    ?!!G._ringOfferResolved
    :!!(G._rewardOnePickMode&&_rewFreePickDone&&!G._pendingPanelPlacement&&!returnDragging);
  body.classList.toggle('reward-pick-taken',pickTaken);
  body.classList.toggle('reward-pick-resources-dim',!G._onlineMode&&!!(G._rewardOnePickMode&&_rewFreePickDone));
  _syncMoneyTurnTile();
  _syncRewardProductionItems();
  _syncRewardProductionRings();
  if(typeof syncQuestFormationUi==='function') syncQuestFormationUi();
}
function _rewardRingArtPath(ring){
  if(!ring) return '';
  let code=String(ring.artCode||ring.imageNo||ring.No||ring.no||ring['No.']||ring.code||'').trim();
  if(!code) return '';
  const m=code.match(/^R?\s*0*(\d+)$/i);
  if(m) code='R'+String(parseInt(m[1],10)).padStart(3,'0');
  return `assets/art/rings/${code}.jpg`;
}
function _syncRewardProductionRings(){
  const slots=document.querySelectorAll('.reward-prod-ring .reward-prod-slots i');
  if(!slots.length) return;
  const rings=Array.isArray(G.rings)?G.rings:[];
  slots.forEach((slot,idx)=>{
    const ring=rings[idx]||null;
    const path=_rewardRingArtPath(rings[idx]);
    slot.classList.add('ring-visual');
    slot.classList.toggle('ring-visual-filled',!!path);
    if(path) slot.style.setProperty('--ring-art',`url("${path}")`);
    else slot.style.removeProperty('--ring-art');
    slot._rewardRing=ring;
    slot.classList.toggle('ring-disabled',!!(ring&&ring._disabled));
    const title=String(ring&&ring.name||'').trim();
    const desc=typeof ringDisplayDesc==='function'?ringDisplayDesc(ring):String(ring&&(ring.desc||ring.description||ring.effectText||ring.effect)||'').trim();
    slot.classList.remove('rarity-1','rarity-2','rarity-3','rarity-4','rarity-5');
    if(ring&&(title||desc)){
      slot.setAttribute('data-preview',[title||'指輪',desc].filter(Boolean).join('\n'));
      const keywordPreview=typeof _auxiliaryKeywordPreviewText==='function'?_auxiliaryKeywordPreviewText(ring,desc):'';
      if(keywordPreview) slot.setAttribute('data-keyword-preview',keywordPreview);
      else slot.removeAttribute('data-keyword-preview');
      slot.classList.add(_rewardRingRarityClass(ring));
    } else {
      slot.removeAttribute('data-preview');
      slot.removeAttribute('data-keyword-preview');
    }
    if(!slot._ringTooltipWired){
      slot._ringTooltipWired=true;
      slot.addEventListener('mouseenter',_showRewardRingTooltip);
      slot.addEventListener('mousemove',_moveRewardRingTooltip);
      slot.addEventListener('mouseleave',_hideRewardRingTooltip);
    }
    if(!slot._ringActionWired){
      slot._ringActionWired=true;
      slot.addEventListener('click',e=>{
        if(!slot._rewardRing||G.phase!=='reward') return;
        e.stopPropagation();
        _openRingActionConfirm(idx,slot);
      });
    }
    // 指輪置き場内の入れ替え（ドラッグ&ドロップで並べ替え。鏡の指輪は右隣の指輪を参照するため順序が意味を持つ）と、
    // 提示された指輪（#reward-offer-row側）を空き枠へドラッグして装備する操作を受け付ける。
    slot.draggable=!!ring;
    if(!slot._ringDragWired){
      slot._ringDragWired=true;
      slot.addEventListener('dragstart',e=>{
        if(!slot._rewardRing){ e.preventDefault(); return; }
        _dragSrc={arr:'rings',idx};
        if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); }
        const canReturn=typeof questRingOfferCanReturn==='function'&&questRingOfferCanReturn(slot._rewardRing);
        _setDragZoneClass(canReturn?'dragzone-ring-offer':'dragzone-ring-slot');
        _createDragGhost(slot);
        // _createDragGhost()はクローン後にstyle.cssTextを丸ごと上書きするため、
        // --ring-art（CSS変数）がゴースト側に残らず指輪の絵が表示されない。元要素から再設定する。
        if(_dragGhostDiv) _dragGhostDiv.style.setProperty('--ring-art',slot.style.getPropertyValue('--ring-art'));
        slot.classList.add('dragging');
      });
      slot.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      slot.addEventListener('dragend',()=>{
        slot.classList.remove('dragging');
        _dragSrc=null;
        _removeDragGhost();
        _clearDragZoneClass();
      });
      slot.addEventListener('dragover',e=>{
        if(_dragSrc&&_dragSrc.arr==='rings'&&_dragSrc.idx!==idx){ e.preventDefault(); slot.classList.add('drag-over'); return; }
        if(_dragSrc&&_dragSrc.arr==='ringOffer'&&G._ringOfferUnlocked&&!slot._rewardRing){ e.preventDefault(); slot.classList.add('drag-over'); }
      });
      slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
      slot.addEventListener('drop',e=>{
        slot.classList.remove('drag-over');
        if(_dragSrc&&_dragSrc.arr==='rings'&&_dragSrc.idx!==idx){
          e.preventDefault();
          const srcIdx=_dragSrc.idx; _dragSrc=null;
          G.rings=Array.isArray(G.rings)?G.rings:[null,null,null,null];
          const tmp=G.rings[idx];
          G.rings[idx]=G.rings[srcIdx];
          G.rings[srcIdx]=tmp;
          _playRewardAcquireSfx('ring_get.wav');
          _syncRewardProductionUi();
          if(typeof renderHandEditor==='function') renderHandEditor();
          return;
        }
        if(_dragSrc&&_dragSrc.arr==='ringOffer'&&G._ringOfferUnlocked&&!slot._rewardRing){
          e.preventDefault();
          const offerIdx=_dragSrc.idx; _dragSrc=null;
          _takeRingOffer(offerIdx,idx);
        }
      });
    }
  });
}

function _openRingActionConfirm(idx,anchor){
  const ring=Array.isArray(G.rings)?G.rings[idx]:null;
  if(!ring) return;
  const tip=document.getElementById('kw-tooltip');
  if(tip?.dataset.rewardLocked==='1'
    &&tip.dataset.rewardAnchorKind==='ring'
    &&String(tip.dataset.rewardSlotIdx)===String(idx)) return;
  const ringDesc=typeof ringDisplayDesc==='function'?ringDisplayDesc(ring):(ring.desc||ring.description||ring.effectText||ring.effect||'');
  const cancel={label:_uiLabel('「やめる」ボタン','やめる'),onClick:()=>_closeItemUseConfirm()};
  const locked=typeof questRingActionsLocked==='function'&&questRingActionsLocked(ring);
  // 依頼品の指輪は、無効化・捨てるを消さずに暗くして押せなくする（2026-09-27 利用者指定）。
  const actions=[
    {label:ring._disabled?_uiLabel('「有効化」ボタン','有効化'):_uiLabel('「無効化」ボタン','無効化'),disabled:locked,onClick:()=>{
      ring._disabled=!ring._disabled; _closeItemUseConfirm();
      if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
      _syncRewardProductionUi(); updateHUD();
      if(typeof renderHandEditor==='function') renderHandEditor();
    }},
    {label:_uiLabel('「捨てる」ボタン','捨てる'),disabled:locked,onClick:()=>{
      G.rings[idx]=null; _closeItemUseConfirm();
      if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
      _syncRewardProductionUi(); updateHUD();
      if(typeof renderHandEditor==='function') renderHandEditor();
    }},
    cancel
  ];
  _openRewardActionTooltip(anchor,ring.name||_uiLabel('「指輪枠」見出し','指輪'),ringDesc,actions);
  const lockedTip=document.getElementById('kw-tooltip');
  if(lockedTip){ lockedTip.dataset.rewardSlotIdx=String(idx); lockedTip.dataset.rewardAnchorKind='ring'; }
}
function _rewardRingRarityClass(ring){
  const n=Math.max(1,Math.min(5,parseInt(ring&&ring.rarity,10)||1));
  return `rarity-${n}`;
}
function _showRewardRingTooltip(e){
  const ring=e.currentTarget&&e.currentTarget._rewardRing;
  const tip=document.getElementById('kw-tooltip');
  if(tip?.dataset.rewardLocked==='1') return;
  if(!ring||!tip){
    _hideRewardRingTooltip();
    return;
  }
  const title=String(ring.name||'').trim();
  const desc=String(ring.desc||ring.description||ring.effectText||ring.effect||'').trim();
  if(!title&&!desc){
    _hideRewardRingTooltip();
    return;
  }
  const esc=s=>String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  tip.className=_rewardRingRarityClass(ring);
  tip.innerHTML=`<div class="preview-title">${esc(title||_uiLabel('「指輪枠」見出し','指輪'))}</div>${esc(desc)}`;
  tip.style.display='block';
  _moveRewardRingTooltip(e);
}
function _moveRewardRingTooltip(e){
  const tip=document.getElementById('kw-tooltip');
  if(!tip||tip.style.display==='none'||tip.dataset.rewardLocked==='1') return;
  tip.style.left=`${e.clientX+18}px`;
  tip.style.top=`${e.clientY+18}px`;
}
function _hideRewardRingTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(tip&&tip.dataset.rewardLocked!=='1') tip.style.display='none';
}
function renderRewCards(){
  towerBoonSyncRerollButton();
  requestAnimationFrame(towerBoonSyncRerollButton);
  _syncRewardPanelPlacementOverlay();
  _syncRewardProductionUi();
  document.body.classList.toggle('ring-offer-phase',!!(G&&G.phase==='reward'&&G._ringOfferPhase));
  document.body.classList.toggle('ring-offer-selecting',_ringOfferSelectionActive());
  // 指輪取得後の祭壇：見出し下の説明文を「代償の対価たる力は与えられた」に差し替える。
  document.body.classList.toggle('ring-offer-resolved',!!(G&&G.phase==='reward'&&G._ringOfferPhase&&G._ringOfferResolved));
  const section=document.getElementById('reward-offer-section');
  const el=document.getElementById('reward-offer-row');
  if(!section||!el) return;
  const rewardSectionLabel=document.querySelector('#reward-cards-section .field-label');
  if(rewardSectionLabel) rewardSectionLabel.textContent=G._isLibrary
    ?_uiLabel('「図書館の報酬枠」見出し','貸出カード')
    :(G._isTavern
      ?(typeof questTavernRewardTitle==='function'?questTavernRewardTitle():_uiLabel('「酒場の報酬枠」見出し1','依頼人'))
      :_uiLabel('「編成画面の報酬枠」見出し','報酬'));
  section.style.removeProperty('--title-reward');
  if(G.phase!=='reward'){ section.style.display='none'; el.innerHTML=''; _syncRewardProductionUi(); return; }
  // 村/祭壇メニューと鍛冶屋は同じ行を独自の選択肢で使用するため、
  // カード移動後の再描画で提示内容を消さない。
  if((G._isVillageMenu&&!G._isShop&&!G._isForge&&!G._isRingExchange)||G._isForge){
    section.style.display='';
    // 鍛冶屋は提示行を独自の選択肢で使う。**所持金が変わったら出し直す。**
    // 出し直さないと、売却して足りるようになっても「ゴールド不足」のまま買えない。
    if(G._isForge&&typeof renderMapForgeOffers==='function'&&!G._renderingForgeOffers){
      G._renderingForgeOffers=true;
      try{ renderMapForgeOffers(); } finally { G._renderingForgeOffers=false; }
    }
    return;
  }
  section.style.display='';
  el.innerHTML='';
  if(blessingFlameActive()){ blessingFlameRenderPreview(el,section);return; }
  if(runLevelRewardActive()){
    section.style.setProperty('--title-reward',JSON.stringify(RUN_LEVEL_CONFIG.title));
    runLevelRenderReward(el);return;
  }
  if(G._ringOfferPhase){
    _renderRingOfferCards(el);
    return;
  }
  if(!el._wiredForReturn){
    el._wiredForReturn=true;
    el.addEventListener('dragover',e=>{
      if(_isShopSoldOutDropBlocked(e.target)) return;
      if(_canReturnDragSrcToRewardArea()){ e.preventDefault(); el.classList.add('drag-over'); }
    });
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{
      if(_isShopSoldOutDropBlocked(e.target)) return;
      e.preventDefault(); el.classList.remove('drag-over');
      if(!_canReturnDragSrcToRewardArea()) return;
      // 図書館の貸出枠は「落とした枠」へそのまま戻す（左詰めにしない）。
      let dropIdx=-1;
      if(G._isLibrary&&e.target&&e.target.closest){
        const slot=e.target.closest('[data-rew-idx],[data-card-idx]');
        if(slot){
          const raw=slot.dataset.rewIdx!=null?slot.dataset.rewIdx:slot.dataset.cardIdx;
          const n=Number(raw);
          if(Number.isInteger(n)&&n>=0) dropIdx=n;
        }
      }
      _returnDragSrcToRewardArea(dropIdx>=0?dropIdx:undefined);
    });
  }
  const _rewardPickUsed=!!(G._rewardOnePickMode&&_rewFreePickDone);
  const pendingRewardIdx=G._pendingPanelPlacement?G._pendingPanelPlacement.rewardIdx:-1;
  if(G._isLibrary){
    for(let i=0;i<REWARD_GRID_CAPACITY;i++){
      const card=_rewCards[i]||null;
      if(card){
        const d=_mkRewDiv(card,()=>takeRewCard(i),i);
        if(pendingRewardIdx===i) d.classList.add('pending-placement');
        el.appendChild(d);
      }else{
        el.appendChild(_mkLibraryLoanedOutDiv(i));
      }
    }
    return;
  }
  // 道具屋：指輪交換と同じくitem_slot画像の枠でアイテムを3つ並べる（価格バッジは通常のショップと同形式）。
  if(G._isItemShop){
    Array.from({length:3},(_,i)=>_rewCards[i]||null).forEach((card,i)=>{
      if(!card){ el.appendChild(_mkShopSoldOutDiv(i)); return; }
      const d=_mkRewDiv(card,()=>takeRewCard(i),i);
      d.classList.add('item-shop-card','item-offer-card','item-visual');
      // 下・上・下と互い違いに置き、行の上下に余白を作らない。
      d.classList.add(i%2===1?'item-shop-card-up':'item-shop-card-down');
      // 商品枠に置いた自分のアイテム（売却待ち）は必ずドラッグで手持ちへ戻せるようにする。
      if(card._shopSalePending){ d.draggable=true; d.classList.remove('reward-drag-locked'); }
      d.style.setProperty('--item-art',`url("${_rewardItemArtPath(card)}")`);
      d.classList.add('item-visual-filled');
      el.appendChild(d);
    });
    return;
  }
  if(G._isShop){
    for(let i=0;i<_shopSlotCapacity();i++){
      const card=_rewCards[i]||null;
      // 購入済みの枠は詰めずに残し、中心に「売切」と表示する。
      if(!card){ el.appendChild(_mkShopSoldOutDiv()); continue; }
      const d=_mkRewDiv(card,()=>takeRewCard(i),i);
      // 行商人のアイテムは道具屋と同じ正方形の枠で、行の下側に揃える（2026-10-10 利用者指定）。
      if(_isItemCard(card)){
        d.classList.add('item-shop-card','item-offer-card','item-visual','item-shop-card-down','item-visual-filled');
        if(card._shopSalePending){ d.draggable=true; d.classList.remove('reward-drag-locked'); }
        d.style.setProperty('--item-art',`url("${_rewardItemArtPath(card)}")`);
      }
      if(pendingRewardIdx===i) d.classList.add('pending-placement');
      el.appendChild(d);
    }
      return;
  }
  _rewCards.slice(0,REWARD_GRID_CAPACITY).forEach((card,i)=>{
    if(!card) return;
    const d=_mkRewDiv(card,()=>takeRewCard(i),i);
    if(pendingRewardIdx===i) d.classList.add('pending-placement');
    if(_rewardPickUsed&&card._isOriginalReward
      &&!d.classList.contains('item-target-ok')){
      d.onclick=null;
      d.classList.add('reward-used-dim');
      d.classList.remove('reward-rarity-glow'); // 取得済みの報酬は光らせない
      // カード本体のopacityを下げると、常時不透明であるべき黒いm_board6背面まで
      // 半透明になる。購入不可カードと同じ専用暗転層で内容だけを暗くする。
      _ensureRewardCardDimLayer(d);
    }
    el.appendChild(d);
  });
}
function renderRewardOfferRow(show){
  // 配置順（戦闘順序）システムは廃止。この位置には報酬カードを表示する（renderRewCardsに一本化）。
  if(typeof renderRewCards==='function') renderRewCards();
}

// ── 返品（PvEはアイテムのみ。オンラインは従来の商品も対象）─────────────────
// 買った商品には _shopBuy（来店の番号・商品枠・買値・商品の写し）を付ける。
// この来店の間は、右上に売価の代わりに「返品」（テキストメッセージ「「返品」ボタン」）を出し、
// 押すと買値と同額を返して商品枠へ戻す（強欲の指輪などの倍率は掛けない）。
function _shopPurchaseKey(){
  return `${Number(G&&G._shopVisitSeq)||0}:${G&&G._isItemShop?'item':'shop'}`;
}
function markShopPurchase(target,offerCard,rewIdx,price){
  if(!target||!_isItemCard(target)&&!_cardTradingRules().sellCards||!G||!G._isShop||!(Number(price)>0)) return;
  const copy=clone(offerCard);
  delete copy._shopBuy;
  target._shopBuy={key:_shopPurchaseKey(),idx:Number(rewIdx),price:Number(price),card:copy,
    ...(!G._onlineMode?{rerollSeq:Number(G._shopRerollSeq)||0}:{})};
}
function isShopReturnable(card){
  if(_isCardExchangeShop()) return false;
  return !!(card&&(_isItemCard(card)||_cardTradingRules().sellCards)&&!_cardIsEngraved(card)&&card._shopBuy&&G&&G._isShop&&card._shopBuy.key===_shopPurchaseKey());
}
function returnShopPurchase(card,removeFromOwner){
  if(_cardIsEngraved(card)||!isShopReturnable(card)) return false;
  const buy=card._shopBuy;
  if(typeof removeFromOwner==='function') removeFromOwner();
  G.gold=Math.max(0,Number(G.gold)||0)+Math.max(0,Number(buy.price)||0);
  const offer=clone(buy.card);
  delete offer._shopBuy;
  const cap=typeof _shopSlotCapacity==='function'?_shopSlotCapacity():REWARD_GRID_CAPACITY;
  while(_rewCards.length<cap) _rewCards.push(null);
  let slot=Number.isInteger(buy.idx)&&buy.idx>=0&&buy.idx<cap&&!_rewCards[buy.idx]?buy.idx:_rewCards.findIndex((c,k)=>k<cap&&!c);
  // 再抽選で空き枠が補充された後の返品は元の枠へ戻す。見えない4枠目へ送らない。
  if(slot<0&&!G._onlineMode&&G._isItemShop&&(Number(buy.rerollSeq)||0)<(Number(G._shopRerollSeq)||0)
    &&Number.isInteger(buy.idx)&&buy.idx>=0&&buy.idx<cap) slot=buy.idx;
  if(slot<0) slot=_rewCards.length;
  _rewCards[slot]=offer;
  if(typeof playFileSfx==='function') playFileSfx('assets/sfx/sell.wav');
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
  refreshRewardGoldUi();
  if(typeof _syncRewardProductionUi==='function') _syncRewardProductionUi();
  renderHandEditor(); renderFieldEditor(); renderRewCards(); updateHUD();
  return true;
}
function _shopReturnLabel(){ return _uiLabel('「返品」ボタン','返品'); }

function takeRewCard(i, targetSlot){
  if(G._pendingPanelPlacement) return;
  if(_isCardExchangeShop()) return exchangeShopCard(i,targetSlot);
  const card=_rewCards[i]; if(!card) return;
  if(!_libraryTutorialAllowsMove(card,targetSlot)) return;
  // 売却待ち（魔導板から販売枠へ戻した自分のカード）は購入ではなく「戻す」操作なので、
  // 街扱いのゴールド徴収・購入可否判定の対象外にする。
  const isPendingSale=!!card._shopSalePending;
  const isTown=G._isRewardTown&&!isPendingSale;
  const cost=isPendingSale?0:Math.max(0,(card._buyPrice??1));
  // パネル：通常購入（パネル無料モード中はゴールド不足でも取得できる）
  if(!G._freeRewardPanelMode&&G.gold<cost) return;

  if(card.type==='ring'){
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    if(!_takeRingCard(card)) return;
    if(typeof markCardAcquired==='function') markCardAcquired(card);
    if(isTown&&!G._freeRewardPanelMode){ G.gold-=cost; refreshRewardGoldUi(); }
    if(card._isOriginalReward&&G._rewardOnePickMode) _rewFreePickDone=true;
    _rewCards[i]=null;
    refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderHandEditor(); renderMoveSlotsInEnemy();
    return;
  }

  if(_isSpellCard(card)){
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    const slots=_ensureItemSlots();
    const emptyIdx=slots.findIndex(c=>!c);
    if(emptyIdx<0) return;
    const placed=clone(card);
    if(card._isOriginalReward){
      placed._rewardReturnCard=clone(card);
      placed._rewardReturnIdx=i;
      placed._rewardReturnPhaseId=_rewPhaseId;
    }
    if(isTown&&!G._freeRewardPanelMode) markShopPurchase(placed,card,i,cost);
    slots[emptyIdx]=placed;
    if(typeof markCardAcquired==='function') markCardAcquired(card);
    if(card._isOriginalReward&&G._rewardOnePickMode) _rewFreePickDone=true;
    if(isTown&&!G._freeRewardPanelMode){ G.gold-=cost; refreshRewardGoldUi(); }
    if(G._isShop) _rewCards[i]=null;
    else _rewCards.splice(i,1);
    // 道具屋で代金を払って買った時は購入音（buy2.wav）。それ以外の入手は通常の入手音（2026-09-27 利用者指摘：購入音が鳴らなかった）。
    _playRewardAcquireSfx(isTown&&!G._freeRewardPanelMode&&cost>0?'buy2.wav':'item_get.wav');
    refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderHandEditor();
    if(G._isTavern&&typeof syncTavernFormationControls==='function') syncTavernFormationControls();
    return;
  }

  if(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope){
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    // 返品用の印は置く前に付ける（置かれるのはこのカード自身）。
    if(isTown&&!G._freeRewardPanelMode) markShopPurchase(card,card,i,cost);
    const finish=()=>{
      if(typeof markCardAcquired==='function') markCardAcquired(card);
      if(isTown&&!G._freeRewardPanelMode){ G.gold-=cost; refreshRewardGoldUi(); }
      if(card._isOriginalReward&&G._rewardOnePickMode) _rewFreePickDone=true;
      // ドラッグで魔導板の埋まっているスロットへ直接入れ替えた場合、押し出されたカードが
      // 既にこのスロット（_rewCards[i]）へ入っているため、その場合はここで消してしまわない
      if(_rewCards[i]===card){
        if(G._isShop||G._isLibrary) _rewCards[i]=null;
        else _rewCards.splice(i,1);
      }
      refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderHandEditor();
      if(card._npcCard&&typeof onTavernQuestRewardCardTaken==='function') onTavernQuestRewardCardTaken(card);
      if(G._isTavern&&typeof syncTavernFormationControls==='function') syncTavernFormationControls();
    };
    if(!startPanelPlacement(card,finish,'報酬')) return;
    if(targetSlot!=null&&typeof placePendingPanelToSelectedUnit==='function'){
      // 出撃/接続先スロットが埋まっている場合、押し出されたカードをこの報酬カードが
      // 元々あったスロットへ直接戻せるよう、先にこのスロットを空けておく（＝真の入れ替え）
      _rewCards[i]=null;
      if(!placePendingPanelToSelectedUnit(targetSlot)){
        _rewCards[i]=card;
        cancelPendingPanelPlacement();
      }
    }
    return;
  }
}

// ── 手札エディタ（アイテム）──────────────────────

let _dragSrc=null;
// メイン置き場：5列×3行＝15枠。所有者（ヒーロー）の概念は廃止し、パーティ全体で共有する単一のグリッド。
// □の位置に置いたキャラクターだけが戦闘フェイズで出撃する（上段→前衛、下段→後衛）。
// それ以外の枠（■）にもキャラクター・強化どちらも自由に置けるが、戦闘には出撃しない（隣接強化としては機能する）。
// 最初からどの枠にも置くことができ、使用不能スロットは存在しない。
//   ■□■□■
//   ■■■■■
//   □■□■□
const MAIN_BOARD_SIZE=15;
const MAIN_BOARD_COLS=5;
const MAIN_BOARD_ROWS=3;
const MAIN_BOARD_DEPLOY_SLOTS=[1,3,10,12,14];
const MAIN_BOARD_FRONT_SLOTS=[1,3];
const MAIN_BOARD_REAR_SLOTS=[10,12,14];
const UNIT_EQUIP_SLOTS=Array.from({length:MAIN_BOARD_SIZE},()=>({label:'',kind:'any'}));
function defaultMapPanelPowerId(slotIdx){
  return MAIN_BOARD_DEPLOY_SLOTS.includes(slotIdx)?'summon':'';
}
function mapPanelPowerIdAt(slotIdx){
  const explicit=G&&G.mapPanelPowers?String(G.mapPanelPowers[slotIdx]||''):'';
  return explicit||defaultMapPanelPowerId(slotIdx);
}
// 装備欄描画・編集ロジックを既存のまま使い回すための仮想「所有者」。
// battle系のG.alliesには入れず、.boardCardsは常にG.mainBoardそのものを参照する（書き込みが直接反映される）。
function _getPartyBoardUnit(){
  if(!Array.isArray(G.mainBoard)||G.mainBoard.length!==MAIN_BOARD_SIZE){
    const next=new Array(MAIN_BOARD_SIZE).fill(null);
    if(Array.isArray(G.mainBoard)&&G.mainBoard.length===21&&MAIN_BOARD_SIZE===15){
      // 旧7列×3行から右2列を切り落とし、各行の左5列だけを新5列×3行へ移す。
      [0,1,2].forEach(row=>{
        for(let col=0;col<5;col++){
          next[row*5+col]=G.mainBoard[row*7+col]||null;
        }
      });
    }else{
      (G.mainBoard||[]).forEach((c,i)=>{ if(i<MAIN_BOARD_SIZE) next[i]=c||null; });
    }
    G.mainBoard=next;
  }
  if(!G._partyBoardUnit) G._partyBoardUnit={name:'',hp:1,maxHp:1};
  G._partyBoardUnit.boardCards=G.mainBoard;
  return G._partyBoardUnit;
}
function _normalizeUnitBoardCards(unit){
  const board=_getPartyBoardUnit();
  _syncUnitPanelEffectsAfterMove(board);
  return board.boardCards;
}
function _boardSlotDef(idx,unit){
  return UNIT_EQUIP_SLOTS[idx]||{label:'',kind:'any'};
}
// 特殊マス限定はNPCフラグやカード名ではなく、キーワード「帰滅」のルールとして判定する。
function _cardRequiresDeployableSlot(card){
  if(!card) return false;
  if(typeof coreUnitHasKeyword==='function') return coreUnitHasKeyword(card,'帰滅');
  return (Array.isArray(card.keywords)?card.keywords:[])
    .some(keyword=>String(keyword||'').replace(/[0-9０-９]+$/,'')==='帰滅');
}
function _canCardUseBoardSlot(card,idx,unit){
  if(!card||idx<0||idx>=MAIN_BOARD_SIZE) return false;
  if(_cardIsSuppressionEngraving(card)&&Number.isInteger(Number(card._fixedBoardSlot))
    &&Number(card._fixedBoardSlot)!==Number(idx)) return false;
  if(typeof fiveSaintsCardCanUseBoardSlot==='function'&&!fiveSaintsCardCanUseBoardSlot(card,idx)) return false;
  if(_cardRequiresDeployableSlot(card)&&typeof boardSlotIsDeployable==='function'
    &&!boardSlotIsDeployable(unit,idx)) return false;
  return true;
}
function _findBoardSlotForCard(unit,card,arr){
  const boardList=arr||_getPartyBoardUnit().boardCards||[];
  for(let i=0;i<MAIN_BOARD_SIZE;i++){
    if(!boardList[i]&&_canCardUseBoardSlot(card,i,unit)) return i;
  }
  return -1;
}
function getBoardCardLimit(unit){
  return MAIN_BOARD_SIZE;
}
function _panelStatBonus(card){
  if(!card) return {atk:0,hp:0};
  return {atk:Number(card.atkBonus||0),hp:Number(card.hpBonus||0)};
}
// 旧「所有者ユニット」モデル時代、強化パネルのHP減少ボーナスでオーナー本体のHPが0以下に
// なる配置を防いでいたガード。現行仕様ではメイン置き場は単一の共有ボード（_getPartyBoardUnit()、
// hp:1の仮の値）であり、このHPは実際のゲームプレイと無関係なため、判定基準として意味を持たない。
// このガードが残っていると「魔導回路β」等の-1/-1パネルを配置しようとするだけで
// （unit.hp=1 + (-1)=0 <= 0 と誤判定され）常に拒否されてしまうため無効化する。
function _canApplyBoardChange(unit,nextBoardList){
  const current=unit&&Array.isArray(unit.boardCards)?unit.boardCards:[];
  const next=Array.isArray(nextBoardList)?nextBoardList:[];
  for(let i=0;i<current.length;i++){
    const card=current[i];
    if(!_cardIsSuppressionEngraving(card)) continue;
    if(!Number.isInteger(Number(card._fixedBoardSlot))) card._fixedBoardSlot=i;
    const fixed=Number(card._fixedBoardSlot);
    if(next[fixed]!==card) return false;
  }
  for(let i=0;i<next.length;i++){
    const card=next[i];
    if(_cardIsSuppressionEngraving(card)&&Number.isInteger(Number(card._fixedBoardSlot))
      &&Number(card._fixedBoardSlot)!==i) return false;
  }
  return true;
}
function syncUnitPanelStatBonuses(unit){
  if(!unit) return;
  const prev=unit._panelStatBonusApplied||{atk:0,hp:0};
  const total=(unit.boardCards||[]).reduce((s,c)=>{
    const b=_panelStatBonus(c);
    s.atk+=b.atk; s.hp+=b.hp;
    return s;
  },{atk:0,hp:0});
  const da=total.atk-prev.atk;
  const dh=total.hp-prev.hp;
  if(da){
    unit.atk=(unit.atk||0)+da;
    unit.baseAtk=(unit.baseAtk||0)+da;
  }
  if(dh){
    unit.maxHp=Math.max(0,(unit.maxHp??unit.hp??0)+dh);
    unit.hp=Math.max(0,Math.min(unit.maxHp,(unit.hp??0)+dh));
  }
  if(typeof clampUnitStats==='function') clampUnitStats(unit);
  else{
    unit.atk=Math.max(0,Number(unit.atk)||0);
    unit.baseAtk=Math.max(0,Number(unit.baseAtk??unit.atk)||0);
    unit.maxHp=Math.max(0,Number(unit.maxHp??unit.hp)||0);
    unit.hp=Math.max(0,Math.min(unit.maxHp,Number(unit.hp)||0));
  }
  unit._panelStatBonusApplied=total;
}
function _syncUnitPanelEffectsAfterMove(unit){
  if(!unit) return;
  syncUnitPanelStatBonuses(unit);
  if(typeof syncUnitPanelFlags==='function') syncUnitPanelFlags(unit);
}
function _panelEyeRingPreviewBonus(card,unit,idx){
  if(!card||typeof G==='undefined'||!G) return 0;
  const rings=typeof _effectiveRings==='function'?_effectiveRings():(G.rings||[]);
  if(!Array.isArray(rings)||!rings.some(Boolean)) return 0;
  // 封印中のキャラにも掛かる（戦闘のコアと同じ。2026-10-05 利用者指摘）。
  const eye={'赤い瞳の指輪':'赤','青い瞳の指輪':'青','緑の瞳の指輪':'緑','黄の瞳の指輪':'黄','紫の瞳の指輪':'紫'};
  const colorMap={red:'赤',blue:'青',green:'緑',yellow:'黄',brown:'黄',purple:'紫',茶:'黄'};
  const raw=String(card.color||'').trim();
  const color=colorMap[raw.toLowerCase()]||raw;
  let bonus=rings.filter(r=>r&&eye[r.name]&&eye[r.name]===color).length*10;
  // 虹の瞳の指輪は個数分（鏡の指輪の写しを含む。戦闘のコアと同じ）。
  const rainbowCount=rings.filter(r=>r&&r.name==='虹の瞳の指輪').length;
  if(rainbowCount&&typeof _currentRainbowRingBonusForUnit==='function'){
    bonus+=(Number(_currentRainbowRingBonusForUnit({...card,_ownedBoardPreview:true}))||0)*rainbowCount;
  }
  return bonus;
}
function _panelCharacterPreviewStats(unit,idx,card){
  card=runLevelDisplayCard(card,unit);
  const base={
    atk:Number(card?.power??card?.atk??0),
    hp:Number(card?.life??card?.hp??1)
  };
  if(!unit||idx==null||!card||String(card.category||'')!=='キャラクター') return base;
  if(typeof _collectAdjacentEnhancements==='function'){
    const enh=_collectAdjacentEnhancements(unit,idx)||{};
    base.atk+=Number(enh.atk||0);
    base.hp+=Number(enh.hp||0);
  }
  // 編成全体で決まる常時修正は、戦闘と同じ共通編成から表示分だけを受け取る。
  // entry.unit の総能力値へ置き換えると永劫の力など表示対象外の値まで混ざるため、
  // core.js が記録した常時修正量だけを足す。
  if(typeof buildBoardFormation==='function'){
    try{
      const formation=buildBoardFormation(unit,{persistEternal:false});
      const entry=(formation.entries||[]).find(e=>e&&e.slotIdx===idx&&e.copyIndex===0);
      const bonus=entry&&entry.unit&&entry.unit._formationPassiveStatBonus;
      if(bonus){
        base.atk+=Number(bonus.atk)||0;
        base.hp+=Number(bonus.hp)||0;
      }
    }catch(_e){ /* 読み込み途中は通常の隣接値だけを表示する。 */ }
  }
  // 色の瞳の指輪（+10/+10）・虹の瞳の指輪（+X/+X）も魔導板の数値に含める（2026-10-02 利用者指摘）。
  // 戦闘ではコアの開戦処理（coreApplyOpeningRingsToUnitEarly）が同じ量を足す。鏡の指輪の写しも数える。
  // 封印されたキャラにも戦闘で掛かるので足す。
  const ringBonus=_panelEyeRingPreviewBonus(card,unit,idx);
  // 戦闘では、強化で0未満になったATK/HPを0で止めてから開戦の指輪を足す。表示も同じ順にする。
  if(ringBonus){ base.atk=Math.max(0,base.atk); base.hp=Math.max(0,base.hp); }
  base.atk+=ringBonus; base.hp+=ringBonus;
  // ATK・HPを減少させる強化（呪われた壺の -5/-5 など）の合計がベースを上回っても、
  // **表示は0が下限**。戦闘中の値（_addBattleStats／コアのaddStats）と同じ規則にする。
  base.atk=Math.max(0,base.atk);
  base.hp=Math.max(0,base.hp);
  // 「攻防一体」はATKが常にHPに等しい。戦闘中の表示（presentShownAtk）と同じにする。
  if(typeof _collectAdjacentEnhancements==='function'){
    const enh=_collectAdjacentEnhancements(unit,idx)||{};
    if((enh.abilities||[]).includes('攻防一体')) base.atk=base.hp;
  }
  return base;
}
function _mergedPanelCard(a,b){
  if(!panelMergeEnabled()) return null;
  if(!a||!b||typeof PANEL_POOL==='undefined'||typeof makePanel!=='function') return null;
  if(typeof questCardRemovalLocked==='function'&&(questCardRemovalLocked(a)||questCardRemovalLocked(b))) return null;
  // 抑圧の刻印は合体で元マスから消える経路を作らない。
  if(_cardIsSuppressionEngraving(a)||_cardIsSuppressionEngraving(b)) return null;
  const names=[String(a.name||'').trim(),String(b.name||'').trim()].sort().join('\n');
  const def=PANEL_POOL.find(p=>{
    if(!Array.isArray(p.mergeFrom)||p.mergeFrom.length!==2) return false;
    return p.mergeFrom.map(v=>String(v||'').trim()).sort().join('\n')===names;
  });
  return def?makePanel(def.id):null;
}
function _isMagicMirrorPanel(card){ return String(card&&card.name||'').trim()==='魔鏡'; }
function _panelMergeKey(card){ return String(card&&(card.name||card.id)||'').trim(); }
function _ownedMergeCards(){
  const out=[];
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  if(board&&Array.isArray(board.boardCards)) out.push(...board.boardCards.filter(Boolean));
  if(G&&Array.isArray(G.allies)) out.push(...G.allies.filter(c=>c&&!c._isSoul&&!c._isObject));
  return out.filter(card=>typeof questCardRemovalLocked!=='function'||!questCardRemovalLocked(card));
}
function _rewardMergeCandidate(rewIdx,card){
  if(!panelMergeEnabled()) return false;
  if(_isCardExchangeShop()) return false;
  if(!card||!G) return false;
  if(typeof questCardRemovalLocked==='function'&&questCardRemovalLocked(card)) return false;
  if(typeof isTripleMergeBlockedCard==='function'&&isTripleMergeBlockedCard(card)) return false;
  // ショップでは、魔導板上のカード／所持キャラクターも合体素材として数える。
  if(G._isShop||G._isRewardTown){
    const owned=_ownedMergeCards().filter(c=>!(typeof isTripleMergeBlockedCard==='function'&&isTripleMergeBlockedCard(c)));
    const key=_panelMergeKey(card);
    if(!key) return false;
    const same=owned.filter(c=>!_isMagicMirrorPanel(c)&&_panelMergeKey(c)===key).length;
    const mirrors=owned.filter(c=>_isMagicMirrorPanel(c)).length;
    return _isMagicMirrorPanel(card)?same>=2:(same>=2||same>=1&&mirrors>0);
  }
  if(G.phase!=='reward') return false;
  const cards=Array.isArray(_rewCards)?_rewCards.filter(Boolean):[];
  const usable=cards.filter(c=>!c._tripleMerged&&!(typeof isTripleMergeBlockedCard==='function'&&isTripleMergeBlockedCard(c)));
  // **魔導板・場のカードも合体素材に数える。**（ショップ側と同じ扱い）
  // 以前は提示カード同士しか見ておらず、「同じカードが盤面に2枚あって
  // 報酬の1枚を取れば3枚そろう」場面で光らなかった。
  const owned=_ownedMergeCards().filter(c=>c&&!(typeof isTripleMergeBlockedCard==='function'&&isTripleMergeBlockedCard(c)));
  const ownedSame=key=>owned.filter(c=>!_isMagicMirrorPanel(c)&&_panelMergeKey(c)===key).length;
  const mirrors=cards.filter(c=>!c._tripleMerged&&_isMagicMirrorPanel(c))
    .concat(owned.filter(_isMagicMirrorPanel));
  if(_isMagicMirrorPanel(card)){
    const bases=usable.concat(owned);
    return bases.some(base=>{
      const key=_panelMergeKey(base);
      if(!key) return false;
      const n=usable.filter(c=>!_isMagicMirrorPanel(c)&&_panelMergeKey(c)===key).length+ownedSame(key);
      return n>=2;
    });
  }
  const key=_panelMergeKey(card);
  if(!key) return false;
  const same=usable.filter(c=>!_isMagicMirrorPanel(c)&&_panelMergeKey(c)===key).length+ownedSame(key);
  return same>=3||(same>=2&&mirrors.length>0);
}
function _freezeTripleCloneOverlayGeometry(srcEl,cloneEl,rect,baseWidth,baseHeight){
  if(!srcEl||!cloneEl||!rect||!rect.width||!rect.height) return;
  const sx=baseWidth/rect.width;
  const sy=baseHeight/rect.height;
  const pin=(selector,refSelector)=>{
    const srcEls=srcEl.querySelectorAll(selector);
    const dstEls=cloneEl.querySelectorAll(selector);
    srcEls.forEach((src,i)=>{
      const dst=dstEls[i];
      if(!dst) return;
      const srcRef=refSelector?src.closest(refSelector):srcEl;
      const dstRef=refSelector?dst.closest(refSelector):cloneEl;
      if(!srcRef||!dstRef) return;
      const sr=src.getBoundingClientRect();
      const rr=srcRef.getBoundingClientRect();
      const cs=getComputedStyle(src);
      dst.style.setProperty('position','absolute','important');
      dst.style.setProperty('left',`${(sr.left-rr.left)*sx}px`,'important');
      dst.style.setProperty('top',`${(sr.top-rr.top)*sy}px`,'important');
      dst.style.setProperty('right','auto','important');
      dst.style.setProperty('bottom','auto','important');
      dst.style.setProperty('width',`${sr.width*sx}px`,'important');
      dst.style.setProperty('height',`${sr.height*sy}px`,'important');
      // ゴースト自体を最後にscaleするため、文字サイズは元の設計pxを維持する。
      // ここでも逆scaleするとATK/HPだけが巨大化し、上方へずれて見える。
      dst.style.setProperty('font-size',cs.fontSize,'important');
      dst.style.setProperty('line-height',cs.lineHeight,'important');
      dst.style.setProperty('transform','none','important');
      dst.style.setProperty('transition','none','important');
      dst.style.setProperty('animation','none','important');
      dst.style.setProperty('display',cs.display,'important');
      dst.style.setProperty('text-align',cs.textAlign,'important');
      // ATK/HPはdisplay:flexで中央揃えされているため、display単体のコピーだけでは
      // justify-content/align-itemsが既定値(flex-start)に戻り左に寄って見える。
      dst.style.setProperty('justify-content',cs.justifyContent,'important');
      dst.style.setProperty('align-items',cs.alignItems,'important');
    });
  };
  // body直下の合体ゴーストで通常カード用のleft/rightが再適用されないよう、
  // ATK/HPも元カード内の実測位置へ固定する。
  pin('.card-summon-atk');
  pin('.card-summon-hp');
  pin('.slot-stats .a','.slot-stats');
  pin('.slot-stats .h','.slot-stats');
  pin('.card-activation-costs');
  pin('.card-activation-costs .activation-cost-entry','.card-activation-costs');
}
function _beginTripleMergeHidden(idx){
  if(!G) return;
  _setTripleMergeHiddenIndex(idx);
  if(G._tripleMergeHiddenTimer) clearTimeout(G._tripleMergeHiddenTimer);
  G._tripleMergeHiddenTimer=setTimeout(()=>{
    _clearTripleMergeHidden();
    if(G.phase==='reward'&&typeof renderHandEditor==='function') renderHandEditor();
  },6000);
}
function _setTripleMergeHiddenIndex(idx){
  if(G) G._tripleMergeHiddenIdx=Number.isInteger(idx)?idx:null;
}
function _clearTripleMergeHidden(){
  if(!G) return;
  if(G._tripleMergeHiddenTimer) clearTimeout(G._tripleMergeHiddenTimer);
  G._tripleMergeHiddenTimer=null;
  G._tripleMergeHiddenIdx=null;
}
function _tryTripleMergeOnBoard(unit,placedIdx){
  if(!panelMergeEnabled()) return null;
  if(!unit||!Array.isArray(unit.boardCards)) return null;
  const placed=unit.boardCards[placedIdx];
  if(!placed||placed._tripleMerged) return null;
  const available=unit.boardCards.map((card,idx)=>({card,idx}))
    .filter(x=>x.card&&!x.card._tripleMerged&&!_cardIsSuppressionEngraving(x.card)
      &&!(typeof questCardRemovalLocked==='function'&&questCardRemovalLocked(x.card))
      &&!(typeof isTripleMergeBlockedCard==='function'&&isTripleMergeBlockedCard(x.card)));
  const baseCards=available;
  const mirrors=available.filter(x=>_isMagicMirrorPanel(x.card));
  const candidates=[];
  const seen=new Set();
  baseCards.forEach(anchor=>{
    const key=_panelMergeKey(anchor.card);
    if(!key||_isMagicMirrorPanel(anchor.card)) return;
    const same=baseCards.filter(x=>!_isMagicMirrorPanel(x.card)&&_panelMergeKey(x.card)===key);
    if(same.length>=3){
      same.slice(0,3).forEach(x=>{
        const picked=same.slice(0,3).map(y=>y.idx).sort((a,b)=>a-b);
        const sig=picked.join(',');
        if(!seen.has(sig)&&picked.includes(placedIdx)) { seen.add(sig); candidates.push(picked); }
      });
    }else if(same.length>=2&&mirrors.length){
      mirrors.forEach(mirror=>{
        const picked=[same[0].idx,same[1].idx,mirror.idx].sort((a,b)=>a-b);
        const sig=picked.join(',');
        if(!seen.has(sig)&&picked.includes(placedIdx)){ seen.add(sig); candidates.push(picked); }
      });
    }
  });
  // 魔鏡を置いた場合は、同時に成立する同名組の中からランダムに1組を選ぶ。
  if(!candidates.length) return null;
  const picked=candidates[Math.floor(rand()*candidates.length)];
  const targetCandidates=picked.filter(idx=>!_isMagicMirrorPanel(unit.boardCards[idx]));
  const targetIdx=targetCandidates[Math.floor(rand()*targetCandidates.length)];
  const sources=picked.map(idx=>{
    const el=document.querySelector(`#hand-slots.board-slots > :nth-child(${idx+1})`);
    if(!el) return null;
    const rect=el.getBoundingClientRect();
    const cloneEl=el.cloneNode(true);
    // ドロップ成立時点の元カードにはドラッグ元を隠すinline指定が残っている。
    // それをcloneNodeすると、合体演出側でも枠画像が透明なままになるため、
    // 複製側だけ保存済みの通常表示へ戻してから演出用DOMへ移す。
    cloneEl.classList.remove('dragging','drag-over','drag-source-parts-hidden');
    _restoreDragSourceParts(cloneEl);
    cloneEl.querySelectorAll('button,.shop-board-sell-value,.shop-buy-price,.shop-pending-sale-ui').forEach(node=>node.remove());
    // 盤面上のカードは「つながっている方向の矢印」を消し、代わりに#hand-slots側へ
    // .panel-unite-linkを描いている（_renderPanelUniteMarkers）。ゴーストはカード要素だけを
    // body直下へ複製するためunite画像が付いてこず、矢印が欠けたカードに見えてしまう。
    // 単独のカードとして本来の向きを全て表示し直す。
    _restorePanelDirectionDom(cloneEl,unit.boardCards[idx]);
    const baseWidth=el.offsetWidth||260, baseHeight=el.offsetHeight||395;
    _freezeTripleCloneOverlayGeometry(el,cloneEl,rect,baseWidth,baseHeight);
    return {idx,rect,cloneEl,baseWidth,baseHeight};
  }).filter(Boolean);
  const target=unit.boardCards[targetIdx];
  const sourceBoonMuls=new Map(picked.map(idx=>[idx,unit.boardCards[idx]?.boon?.statMul||1]));
  const def=(typeof PANEL_POOL!=='undefined'&&PANEL_POOL.find(p=>(target.id&&p.id===target.id)||p.name===target.name))||target;
  const baseName=String(target.name||'').replace(/\+$/,'');
  // アイテム等で個別に付与されたキーワードも、3枚すべてから合体後へ引き継ぐ。
  // （従来はtarget自身のキーワードだけを数値倍しており、他2枚分が消えていた。）
  let mergedKeywords=[];
  // アイテム等で個別に付いたキーワード（カード定義に無いもの）だけを控えておく。
  // シート由来の姿へ作り直した後に戻すため、**合算する前**に拾うこと。
  let tripleExtraKeywords=[];
  picked.forEach(idx=>{
    const source=unit.boardCards[idx];
    const sourceKeywords=source&&source.keywords;
    mergedKeywords=typeof _mergeCardKeywordsForBond==='function'
      ?_mergeCardKeywordsForBond(mergedKeywords,sourceKeywords)
      :mergedKeywords.concat(Array.isArray(sourceKeywords)?sourceKeywords:[]);
    if(typeof extraPanelKeywords==='function'&&typeof _mergeCardKeywordsForBond==='function'){
      tripleExtraKeywords=_mergeCardKeywordsForBond(tripleExtraKeywords,extraPanelKeywords(source));
    }
  });
  const mergedBoon=coreMergeBoons(picked.map(idx=>unit.boardCards[idx]));
  if(mergedBoon) coreApplyCardBoon(target,mergedBoon,{effectsOnly:true});
  target.keywords=mergedKeywords;
  target._tripleMerged=true;
  target._tripleBaseName=baseName;
  target._displayName=`${baseName}+`;
  target.rarity=Math.max(1,Number(target.rarity)||1)+1;
  target.directions=['up','right','down','left'];
  target.directionCount=4;
  // 合体後フォームを適用するとシート由来の manaCost／封印へ戻るため、
  // 魔力の巻物・生贄人形で各素材に積んだ恒久減少分を先に控える。
  const reducedManaCost=Math.min(...picked.map(idx=>{
    const src=unit.boardCards[idx];
    const value=Number(src&&src.manaCost)||0;
    return value>0?value:Infinity;
  }));
  const sealValueOf=card=>{
    const kw=(card&&card.keywords||[]).find(k=>/^封印\d+$/.test(String(k||'')));
    return kw?Math.max(0,Number(String(kw).replace('封印',''))||0):null;
  };
  const sealReduction=Math.max(0,...picked.map(idx=>{
    const src=unit.boardCards[idx];
    const srcDef=(typeof PANEL_POOL!=='undefined'&&PANEL_POOL.find(p=>(src&&src.id&&p.id===src.id)||p.name===src.name))||src;
    const base=sealValueOf(srcDef), current=sealValueOf(src);
    return base!=null&&current!=null?Math.max(0,base-current):0;
  }));
  // **合体後の効果はシートの「合体効果」列がそのまま入る**（pool.js／loader.js）。
  // テキストの数字を一律2倍にしてはいけない（シートには倍にしない値がある）。
  // 列が空欄のカードは効果もキーワードも変わらない。
  const tripleFormApplied=typeof applyMergedPanelForm==='function'&&applyMergedPanelForm(target);
  if(tripleFormApplied&&Number.isFinite(reducedManaCost)&&reducedManaCost>0
    &&Object.prototype.hasOwnProperty.call(target,'manaCost')){
    target.manaCost=Math.min(Number(target.manaCost)||reducedManaCost,reducedManaCost);
  }
  if(tripleFormApplied&&sealReduction>0){
    const mergedSeal=sealValueOf(target);
    if(mergedSeal!=null){
      const idx=target.keywords.findIndex(k=>/^封印\d+$/.test(String(k||'')));
      if(idx>=0) target.keywords[idx]=`封印${Math.max(1,mergedSeal-sealReduction)}`;
      if(typeof target.desc==='string') target.desc=target.desc.replace(/封印\d+/g,`封印${Math.max(1,mergedSeal-sealReduction)}`);
    }
  }
  if(tripleFormApplied&&tripleExtraKeywords.length&&typeof _mergeCardKeywordsForBond==='function'){
    target.keywords=_mergeCardKeywordsForBond(target.keywords,tripleExtraKeywords);
  }
  if(target.characterDesc){
    target.characterDesc=String(target.characterDesc).replaceAll(`「${baseName}」`,`「${baseName}+」`);
  }
  if(String(target.category||'')==='キャラクター'){
    const tripleBase=tripleCharacterBaseStats(def);
    // **アイテム等で個別に付いたステータスは、3枚すべてから合体後へ引き継ぐ。**
    // キーワード（mergedKeywords）と同じ扱い。targetの分だけを見ていたため、
    // 素材にした2枚に掛けた「巨大化の巻物」（+5/+5を永久付与）が消えていた。
    // 素材はどれが残るか（targetIdx）が抽選なので、掛けた本人が消えることもあった。
    let atkBuff=0, hpBuff=0;
    picked.forEach(idx=>{
      const src=unit.boardCards[idx];
      if(!src) return;
      const sdef=(typeof PANEL_POOL!=='undefined'&&PANEL_POOL.find(p=>(src.id&&p.id===src.id)||p.name===src.name))||src;
      const sAtk=Number(sdef.power??sdef.atk??0)||0;
      const sHp=Number(sdef.life??sdef.hp??1)||1;
      const statMul=sourceBoonMuls.get(idx)||1;
      atkBuff+=(Number(src.power??src.atk??sAtk)||0)-sAtk*statMul;
      hpBuff+=(Number(src.life??src.hp??sHp)||0)-sHp*statMul;
    });
    // 2026-10-12 利用者指定: 基本能力3倍＋3枚の個別補正。ポート等は従来どおり。
    const statMul=mergedBoon?mergedBoon.statMul:1;
    target._permBasePower=tripleBase.power*statMul;
    target._permBaseLife=tripleBase.life*statMul;
    target.power=target._permBasePower+atkBuff;
    target.life=Math.max(1,target._permBaseLife+hpBuff);
    if(target.atk!=null) target.atk=target.power;
    if(target.hp!=null) target.hp=target.life;
  }
  picked.forEach(idx=>{
    if(idx===targetIdx) return;
    unit.boardCards[idx]=null;
  });
  return {targetIdx,picked,sources};
}
function _playTripleMergeAnimation(info){
  if(!info) return;
  window._tripleMergeAnimationActive=true;
  requestAnimationFrame(()=>{
    // 合体先を空きマスとして描き直してから位置を取る（盤面の移動経路は合体後に描き直していない）。
    if(typeof renderHandEditor==='function') renderHandEditor();
    const target=document.querySelector(`#hand-slots.board-slots > :nth-child(${info.targetIdx+1})`);
    if(!target){ _clearTripleMergeHidden(); window._tripleMergeAnimationActive=false; return; }
    const tr=target.getBoundingClientRect();
    const dim=document.createElement('div');
    dim.className='triple-merge-dim';
    document.body.appendChild(dim);
    const ghosts=(info.sources||[]).map(source=>{
      const {idx,rect:sr,cloneEl,baseWidth,baseHeight}=source;
      const ghost=document.createElement('div');
      ghost.className='triple-merge-ghost triple-merge-focus';
      // ゴースト全体を設計寸法のまま拡縮する。
      // 外枠だけをリサイズすると、固定px指定のATK/HP・コスト類だけが巨大化する。
      const initialTransform=`translate3d(${sr.left}px,${sr.top}px,0) scale(${sr.width/baseWidth},${sr.height/baseHeight})`;
      Object.assign(ghost.style,{
        left:'0',top:'0',width:`${baseWidth}px`,height:`${baseHeight}px`,
        transformOrigin:'0 0',transform:initialTransform
      });
      cloneEl.classList.add('triple-merge-ghost-card');
      Object.assign(cloneEl.style,{
        position:'absolute',left:'0',top:'0',width:`${baseWidth}px`,height:`${baseHeight}px`,
        transformOrigin:'0 0',transform:'none'
      });
      ghost.appendChild(cloneEl);
      document.body.appendChild(ghost);
      return {ghost,idx,sr,baseWidth,baseHeight,initialTransform};
    }).filter(Boolean);
    const ordered=ghosts.slice().sort((a,b)=>a.idx-b.idx);
    const cardW=Math.max(72,(tr.width||120)*.82);
    const gap=cardW*.28;
    const total=cardW*3+gap*2;
    const lineLeft=(window.innerWidth-total)/2;
    const lineH=(tr.height||180)*.82;
    const lineTop=(window.innerHeight-lineH)/2;
    requestAnimationFrame(()=>dim.classList.add('visible'));
    setTimeout(async()=>{
      await Promise.all(ordered.map(({ghost,baseWidth,baseHeight,initialTransform},i)=>ghost.animate([
        {transform:initialTransform},
        {transform:`translate3d(${lineLeft+i*(cardW+gap)}px,${lineTop}px,0) scale(${cardW/baseWidth},${lineH/baseHeight})`}
      ],{duration:520,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'}).finished.catch(()=>{})));
      await new Promise(r=>setTimeout(r,260));
      const center=ordered[1]||ordered[0];
      const centerX=lineLeft+(cardW+gap);
      const centerY=lineTop;
      await Promise.all(ordered.map(({ghost,baseWidth,baseHeight},i)=>ghost.animate([
        {transform:`translate3d(${lineLeft+i*(cardW+gap)}px,${lineTop}px,0) scale(${cardW/baseWidth},${lineH/baseHeight})`,opacity:1},
        {transform:`translate3d(${centerX}px,${centerY}px,0) scale(${cardW/baseWidth},${lineH/baseHeight})`,opacity:i===1?1:.86}
      ],{duration:900,easing:'cubic-bezier(.55,.02,.2,1)',fill:'forwards'}).finished.catch(()=>{})));
      {
        const unionPlayed=typeof playSfx==='function'&&playSfx('union',{group:'magic',guardKey:`triple-union:${Date.now()}`,guardMs:0});
        if(!unionPlayed){ if(typeof playFileSfx==='function') playFileSfx('assets/sfx/merge.wav');
          else try{ const se=new Audio('assets/sfx/merge.wav'); se.volume=sfxFallbackVolume(.8); void se.play(); }catch(_e){} }
        ordered.filter(g=>g!==center).forEach(g=>g.ghost.remove());
        if(center) center.ghost.classList.add('triple-merge-white-flash');
        // 合体結果の配置先は3枚からランダムに選ばれるため、通常配置と同じ
        // 接続フラッシュは出さない。接続線そのものは最後の再描画で更新する。
        setTimeout(()=>{
          _clearTripleMergeHidden();
          dim.classList.remove('visible');
          ghosts.forEach(g=>g.ghost.remove());
          setTimeout(()=>dim.remove(),450);
          // 演出完了時点で盤面を再描画し、合体後の4方向矢印・接続線を確実に反映する
          // （念のための保険。配置直後の描画で既に反映済みのはずだが、演出中に挟まる
          // 他の再描画処理と競合して古い表示が残るケースへの対策）。
          if(typeof renderHandEditor==='function') renderHandEditor();
          if(typeof renderFieldEditor==='function') renderFieldEditor();
          window._tripleMergeAnimationActive=false;
        },760);
      }
    },340);
  });
}
// メイン置き場（配置順）は戦闘フェイズ（'player'＝プレイヤー操作中／'enemy'＝自動解決中）を通して変更不可。
// 報酬フェイズ（戦闘間・初回開始時）のみ編集可能。
function _isNonCombatBoardPhase(){
  return G.phase==='reward';
}
if(!window._boardSelectionClearBound){
  window._boardSelectionClearBound=true;
  document.addEventListener('contextmenu',e=>{
    // 図書館の「魔導板の使い方」中は、右クリックによるカード非表示も無効にする。
    if(G&&G._libraryTutorialActive){ e.preventDefault(); return; }
    // アイテムの対象選択中も同じ（カード非表示にすると対象が見えなくなる）。
    if(G&&G._pendingItemUse){ e.preventDefault(); return; }
    // **ゲームオーバー・クリア画面でも、魔導板の外を右クリックして切り替えられる**
    // （編成画面と同じ扱い）。以前は #gameover-board-grid の上だけだった。
    // 2026-10-26：右クリックでのカード非表示はやめた（利用者指定）。切り替えは「カード非表示」ボタンだけ。
    if(G.phase==='reward'||G.phase==='gameover'||G.phase==='clear') e.preventDefault();
    if(G.phase==='reward'&&G._pendingPanelPlacement){
      cancelPendingPanelPlacement();
    }
  });
  // **カードの表示／非表示は右クリックと「カード非表示」ボタンだけ**（編成画面と同じ）。
  // 以前はゲームオーバー・クリア画面で左クリックでも切り替わるようにしていたが、
  // 画面のどこを押しても切り替わってしまうため取りやめた。
  document.addEventListener('click',e=>{
    if(G.phase==='enemy') return;
    if(G.phase==='reward'&&G._pendingPanelPlacement) return;
    const t=e.target;
    if(!document.body.contains(t)) return;
    if(t&&t.closest&&t.closest('#hand-slots .card,#hand-slots .card-empty,.unit-card,.card,.card-empty')) return;
    if(t&&t.closest&&t.closest('button,#rw-cards,#reward-move-btns,#journey-progress-ui')) return;
    if(G.phase==='reward'){
      G._selectedBoardCardIdx=null;
      return;
    }
    G._showGlobalPanels=true;
    G._selectedBoardUnitIdx=-1;
    G._selectedBoardCardIdx=null;
    renderHandEditor();
    if(G.phase==='reward') renderFieldEditor();
    else if(typeof renderAll==='function'&&G.phase==='player') renderAll();
    return;
  });
}

// ゲームオーバー魔導板のカード非表示ボタンの右端を、一番右のカード枠の右端へ合わせる。
// 複製元（編成画面）の right 値をそのまま使うと、ゲームオーバー側は #hand-pane の
// 実寸が異なるためわずかに左へずれる。複製側の実寸で計算し直す。
function _alignGameOverVisibilityBtn(clonePane){
  if(!clonePane) return;
  try{
    const btn=clonePane.querySelector('#board-card-visibility-btn');
    const slots=clonePane.querySelector('.board-slots');
    if(!btn||!slots) return;
    const cells=Array.from(slots.children).map(c=>c.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
    if(!cells.length) return;
    const paneRect=clonePane.getBoundingClientRect();
    if(!(paneRect.width>0)) return;
    const scaleX=clonePane.offsetWidth?paneRect.width/clonePane.offsetWidth:1;
    const cardRight=Math.max.apply(null,cells.map(r=>r.right));
    btn.style.right=`${Math.max(0,(paneRect.right-cardRight)/(scaleX||1))}px`;
  }catch(e){ console.error('[gameover:visibilityBtn]',e); }
}
// 敗北時の魔導板表示。通常の編成描画を再利用して見た目・特殊マス・説明属性を揃え、
// クローン側はイベントを持たないため配置変更だけを自然に無効化する。
function renderGameOverBoard(){
  const dst=document.getElementById('gameover-board-grid');
  const src=document.getElementById('hand-slots');
  const pane=document.getElementById('hand-pane');
  const boardBg=document.getElementById('hand-pane-board-bg');
  if(!dst||!src||!pane||!boardBg||!Array.isArray(G.mainBoard)) return;
  const oldPhase=G.phase;
  G.phase='reward';
  G._renderingGameOverBoard=true;
  try{
    renderHeRow('hand-slots',G.mainBoard,0,G.mainBoard.length,'boardCards');
    const cloneBg=boardBg.cloneNode(true);
    const clonePane=pane.cloneNode(true);
    cloneBg.removeAttribute('style');
    clonePane.removeAttribute('style');
    // カード非表示ボタンは#hand-pane内にあるため複製にも含まれる。id重複を避けてクラス版にし、
    // 位置（right/top のインラインstyle）は複製元のまま＝編成画面と全く同じ位置に置く。
    clonePane.querySelectorAll('#board-card-visibility-btn').forEach(b=>{
      // idはそのまま残す（id指定の見た目・位置のCSSをまるごと共有するため）。
      // 重複idになるがquerySelectorAllは両方を拾うので、ラベル同期も両方に効く。
      b.classList.add('board-card-visibility-btn');
      b.setAttribute('draggable','false');
      b.onclick=()=>{ if(typeof toggleBoardCardVisibility==='function') toggleBoardCardVisibility(); };
    });
    dst.replaceChildren(cloneBg,clonePane);
    // 位置合わせはレイアウト確定後にも必要だが、rAFが走らない状況（非表示タブ等）でも
    // 最低限合うよう、貼り付け直後にも一度実行する。
    _alignGameOverVisibilityBtn(clonePane);
    clonePane.querySelectorAll('.card,.card *,[draggable],img,a').forEach(el=>{
      // img等のブラウザ標準ドラッグも含め、ゲームオーバー魔導板では完全に無効化する。
      el.setAttribute('draggable','false');
      el.removeAttribute('ondragstart');
      if(el.classList.contains('card')) el.removeAttribute('onclick');
    });
    clonePane.addEventListener('dragstart',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      clonePane.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over'));
      if(typeof _removeDragGhost==='function') _removeDragGhost();
    },true);
    // 元の戦闘画面側で算出されたunite座標は、ゲームオーバー魔導板の座標系とは一致しない。
    // gameover-active適用後の実寸で再計算し、カード間の正確な中央へ置き直す。
    requestAnimationFrame(()=>{
      const cloneSlots=clonePane.querySelector('.board-slots');
      if(!cloneSlots||!document.body.classList.contains('gameover-active')) return;
      try{
        if(typeof _renderPanelUniteMarkers==='function') _renderPanelUniteMarkers(cloneSlots,_getPartyBoardUnit());
      }catch(e){ console.error('[renderGameOverBoard:unite]',e); }
      _alignGameOverVisibilityBtn(clonePane);
    });
  }finally{
    G.phase=oldPhase;
    G._renderingGameOverBoard=false;
  }
}
function moveBoardCardToUnit(boardIdx, srcUnitIdx, destUnitIdx){
  if(!_isNonCombatBoardPhase()) return false;
  if(srcUnitIdx===destUnitIdx) return false;
  const srcUnit=G.allies[srcUnitIdx];
  const destUnit=G.allies[destUnitIdx];
  if(!srcUnit||!destUnit||!srcUnit.boardCards||!srcUnit.boardCards[boardIdx]||destUnit.hp<=0) return false;
  const card=srcUnit.boardCards[boardIdx];
  if(_cardIsSuppressionEngraving(card)) return false;
  const destBoardList=_normalizeUnitBoardCards(destUnit);
  const slotIdx=_findBoardSlotForCard(destUnit,card,destBoardList);
  if(slotIdx<0) return false;
  srcUnit.boardCards[boardIdx]=null;
  destBoardList[slotIdx]=card;
  _syncUnitPanelEffectsAfterMove(srcUnit);
  _syncUnitPanelEffectsAfterMove(destUnit);
  G._selectedBoardUnitIdx=srcUnitIdx;
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  renderHandEditor();
  renderFieldEditor();
  if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
  return true;
}
// ── イベント（祭壇・宿屋）単品アイテム受け取り画面 ─────
// onDone は受け取り後または「戻る」を押したときに呼ばれるコールバック

// 戦闘外の今のライフ（G._waveLife。無ければ G.life）を増減する。最大ライフを超えず、1を下回らない。実際に変わった量を返す。
function _shiftCurrentLife(delta){
  const max=typeof waveLifeMax==='function'?waveLifeMax():3;
  const cur=G._waveLife!=null?Number(G._waveLife)||0:(G.life==null?max:Number(G.life)||0);
  const next=Math.max(1,Math.min(max,cur+delta));
  if(G._waveLife!=null) G._waveLife=next;
  G.life=next;
  if(typeof updateHUD==='function') updateHUD();
  return Math.abs(next-cur);
}
// 指輪を取得して供物が確定した時だけ、ライフ・ゴールド・アイテムを解決する。
function applyAscensionCardEffects(entries){
  for(const entry of entries){
    const card=entry.card;
    const spec=coreAscensionSpec(card);
    const gain=spec.life?Math.max(0,Math.min(spec.life,spec.lifeCap-waveLifeMax())):0;
    if(gain){ G.ascensionLifeBonus=(Number(G.ascensionLifeBonus)||0)+gain; _shiftCurrentLife(gain); }
    if(spec.heal) _shiftCurrentLife(spec.heal);
    if(spec.gold) gainEventGold(spec.gold);
    if(spec.items){
      const generate=()=>drawItems(spec.items);
      const items=typeof runWithKeyedRandom==='function'?runWithKeyedRandom(`ascension:${G._wave}:${card.id}:${entry.idx}:${entries.length}`,generate):generate();
      for(const item of items){const slot=_ensureItemSlots().findIndex(x=>!x);if(slot>=0) G.spellSlots[slot]=item;}
    }
  }
}
