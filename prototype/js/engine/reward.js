// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _placingChar=null; // フィールド配置待ちのキャラカード
let _rewFreePickDone=false; // 通常報酬フェイズで無料取得済みフラグ
let _rewPhaseId=0; // この報酬フェイズで取得したカードだけを戻せるよう識別する
const REWARD_GRID_CAPACITY=5; // 報酬置き場：最大5枚
function _libraryTutorialMoveContext(){
  if(!G||!G._libraryTutorialActive) return null;
  if(G._libraryTutorialStep===4) return {name:'リザードマン',index:12};
  if(G._libraryTutorialStep===6) return {name:'野生の力',index:11};
  return null;
}
function _libraryTutorialIsMoveStep(){ return !!_libraryTutorialMoveContext(); }
function _libraryTutorialAllowsMove(card,destIdx){
  const ctx=_libraryTutorialMoveContext();
  if(!ctx) return true;
  if(destIdx==null) return !!(card&&card.name===ctx.name);
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
    label.textContent=active?'カード表示':'カード非表示';
    b.setAttribute('aria-pressed',active?'true':'false');
  });
  const align=()=>{
    const pane=document.getElementById('hand-pane');
    const slots=document.querySelector('#hand-slots.unit-equip-slots');
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
function toggleBoardCardVisibility(){
  // 右クリック（contextmenuハンドラ）とまったく同じ動作にする。
  // 別クラスで独自に隠すと、右クリックで見える状態と食い違ってしまう。
  // ゲームオーバー画面／ゲームクリア画面の魔導板でも同じボタンを出すため、
  // それぞれの位相（'gameover' / 'clear'）も許可する。
  if(!G||(G.phase!=='reward'&&G.phase!=='gameover'&&G.phase!=='clear')) return;
  const enabled=document.body.classList.toggle('right-card-peek');
  if(enabled){
    _dragSrc=null;
    window._allySlotDragSrc=null;
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
    document.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over'));
  }
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

function _restoreRewardReturnCard(card){
  if(!_isCurrentRewardReturnCard(card)) return false;
  const returned=clone(card._rewardReturnCard);
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
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
// 提示枠の数。道具屋は3枠、それ以外（ショップ／通常報酬）は5枠。
function _shopSlotCapacity(){
  return G._isItemShop?3:REWARD_GRID_CAPACITY;
}
function _pushToRewardArea(card){
  if(!card) return true;
  if(_isCurrentRewardReturnCard(card)) return _restoreRewardReturnCard(card);
  const returned=clone(card);
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
  returned._isOriginalReward=false;
  returned._temporaryRewardAreaCard=true;
  if(G._isShop){
    returned._shopSalePending=true;
    returned._sellDisplayPrice=_shopCardSellGain(returned);
  }
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
  if(!card) return allowSwap?{ok:true,displaced:null}:true;
  if(!Array.isArray(_rewCards)) _rewCards=[];
  if(!Number.isInteger(idx)||idx<0||idx>=REWARD_GRID_CAPACITY||(_rewCards[idx]&&!allowSwap)){
    return allowSwap?{ok:false,displaced:null}:false;
  }
  while(_rewCards.length<idx) _rewCards.push(null); // 穴（sparse hole）を作らないよう明示的にnullで埋める
  const displaced=_rewCards[idx]||null;
  const returned=clone(_isCurrentRewardReturnCard(card)?card._rewardReturnCard:card);
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
  if(!_isCurrentRewardReturnCard(card)){
    returned._isOriginalReward=false;
    returned._temporaryRewardAreaCard=true;
    if(G._isShop){
      returned._shopSalePending=true;
      returned._sellDisplayPrice=_shopCardSellGain(returned);
    }
  }
  _rewCards[idx]=returned;
  if(_isCurrentRewardReturnCard(card)) _rewFreePickDone=false;
  return allowSwap?{ok:true,displaced}:true;
}

function _persistCurrentShopStock(){
  if(!G._isShop) return;
  const node=typeof _mapCurrentVillageNode==='function'?_mapCurrentVillageNode():null;
  if(node) node.shopStock=clone(_rewCards||[]);
  if(G._waveLoopEnabled&&typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
}

function _sellPendingShopCard(idx){
  const card=Array.isArray(_rewCards)?_rewCards[idx]:null;
  if(!card||!card._shopSalePending) return false;
  if(typeof _playRewardAcquireSfx==='function') _playRewardAcquireSfx('sell.wav');
  const base=Math.max(0,Number(card._sellDisplayPrice??_shopCardSellGain(card))||0);
  const gain=typeof onGoldGained==='function'?onGoldGained(base):base;
  if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
  _rewCards[idx]=null;
  log(`${card.name}を売却（+${gain}ゴールド）`,'gold');
  _persistCurrentShopStock();
  renderRewCards();
  refreshRewardGoldUi();
  return true;
}

function _confirmShopReturnWithPendingSales(onYes){
  const pending=Array.isArray(_rewCards)&&_rewCards.some(c=>c&&c._shopSalePending);
  if(!pending){ onYes(); return; }
  const old=document.getElementById('shop-return-confirm');
  if(old) old.remove();
  const dialog=document.createElement('div');
  dialog.id='shop-return-confirm';
  dialog.innerHTML='<div class="shop-return-confirm-box"><div class="shop-return-confirm-msg">店に残したカードは売却されます。</div><div class="shop-return-confirm-btns"><button type="button" class="btn shop-return-confirm-ok">OK</button><button type="button" class="btn shop-return-confirm-cancel">キャンセル</button></div></div>';
  document.body.appendChild(dialog);
  const close=()=>dialog.remove();
  dialog.querySelector('.shop-return-confirm-cancel').onclick=close;
  dialog.querySelector('.shop-return-confirm-ok').onclick=()=>{
    const cards=(_rewCards||[]).filter(c=>c&&c._shopSalePending);
    cards.forEach(card=>{
      const base=Math.max(0,Number(card._sellDisplayPrice??_shopCardSellGain(card))||0);
      const gain=typeof onGoldGained==='function'?onGoldGained(base):base;
      if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
      log(`${card.name}を売却（+${gain}ゴールド）`,'gold');
    });
    _rewCards=(_rewCards||[]).map(c=>c&&c._shopSalePending?null:c);
    _persistCurrentShopStock();
    close();
    refreshRewardGoldUi();
    onYes();
  };
}

function _confirmRingExchangeReturn(onYes){
  const discarded=Number(G._boardDiscardCount)||0;
  const needsConfirm=!!(G._ringOfferPhase&&!G._ringOfferResolved&&discarded>=1&&discarded<=2);
  if(!needsConfirm){ onYes(); return; }
  const old=document.getElementById('shop-return-confirm');
  if(old) old.remove();
  const dialog=document.createElement('div');
  dialog.id='shop-return-confirm';
  dialog.innerHTML='<div class="shop-return-confirm-box"><div class="shop-return-confirm-msg">このまま立ち去るとカードを失いますがよろしいですか？</div><div class="shop-return-confirm-btns"><button type="button" class="btn ring-exchange-return-ok">OK</button><button type="button" class="btn ring-exchange-return-cancel">キャンセル</button></div></div>';
  document.body.appendChild(dialog);
  const close=()=>dialog.remove();
  dialog.querySelector('.ring-exchange-return-cancel').onclick=close;
  dialog.querySelector('.ring-exchange-return-ok').onclick=()=>{ close(); onYes(); };
}
function _clearStarterPanelMarker(unit,idx,card){
  if(!unit||!card) return;
  if(card.fixedEquip||card.starterPanel||card.name===unit.initialPanelName){
    unit.initialPanelName='';
    delete card.fixedEquip;
    delete card.starterPanel;
  }
}
function _panelTextOffsets(place){
  return {
    name:'62px',
    desc:place==='reward' ? '-12px' : (place==='unitEquip'||place==='detached' ? '-34px' : '0px')
  };
}
function _pinPanelTextPosition(el,place){
  if(!el) return;
  const pos=_panelTextOffsets(place);
  el.querySelectorAll('.card-name,.rew-card-name').forEach(n=>n.style.setProperty('transform',`translateY(${pos.name})`,'important'));
  el.querySelectorAll('.card-desc,.rew-card-desc').forEach(n=>n.style.setProperty('transform',`translateY(${pos.desc})`,'important'));
}

function _ensureSelectedEquipUnitIdx(){
  const cur=_getPartyBoardUnit();
  if(cur&&cur.hp>0) return G._selectedEquipUnitIdx;
  const idx=(G.allies||[]).findIndex(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
  G._selectedEquipUnitIdx=idx;
  return idx;
}
function _preparePanelCard(card){
  if(!card) return false;
  const nc=clone(card);
  delete nc._buyPrice;
  // 旧「左上固定パネル」時代の印が残ったカードは、共有魔導板では通常カードとして扱う。
  delete nc.fixedEquip;
  delete nc.starterPanel;
  if(nc.type==='wand'&&nc.usesLeft===undefined) nc.usesLeft=nc.baseUses||randUses();
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
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
  renderMapInventorySlots();
  renderMoveSlotsInEnemy();
  return true;
}
function placePendingPanelToSelectedUnit(slotIdx){
  const pending=G._pendingPanelPlacement;
  if(!pending||!pending.card) return false;
  if(!_libraryTutorialAllowsMove(pending.card,slotIdx)) return false;
  if(pending.card.panelScope==='global'){
    G._showGlobalPanels=true;
    renderHandEditor();
    return false;
  }
  const unit=_getPartyBoardUnit();
  if(!unit) return false;
  const equips=_normalizeUnitEquipment(unit);
  if(slotIdx<0||slotIdx>=equips.length) return false;
  const oldCard=equips[slotIdx]||null;
  const merged=_mergedPanelCard(oldCard,pending.card);
  const nextEquips=equips.slice();
  nextEquips[slotIdx]=merged||pending.card;
  if(!_canApplyUnitEquipChange(unit,nextEquips)) return false;
  if(oldCard&&!merged){
    _clearStarterPanelMarker(unit,slotIdx,oldCard);
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
  // 売切れ枠へ一時退避した手持ちパネルを魔導板へ戻す場合は、
  // 商品枠専用の売却待ち状態を持ち込まない（再度売却扱いになるのを防ぐ）。
  if(isPendingSale){
    delete placed._shopSalePending;
    delete placed._sellDisplayPrice;
    delete placed._temporaryRewardAreaCard;
  }
  // このターンの報酬（_isOriginalReward）から取得した場合のみ「戻す」操作を無料取得フラグの解除に結び付ける。
  // 元々持っていた（報酬エリアに一時的に戻していただけの）カードを取り直しても無料取得権には影響しない。
  if(!merged&&pending.rewardIdx>=0&&pending.card._isOriginalReward){
    placed._rewardReturnCard=clone(pending.card);
    placed._rewardReturnIdx=pending.rewardIdx;
    placed._rewardReturnPhaseId=_rewPhaseId;
  }
  equips[slotIdx]=placed;
  // 合体前の3枚をDOM上に残した状態でスナップショットを取れるよう、先に一度描画する。
  renderHandEditor();
  const tripleMerge=_tryTripleMergeOnBoard(unit,slotIdx);
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  const done=pending.onPlaced;
  G._pendingPanelPlacement=null;
  _syncRewardPanelPlacementOverlay();
  if(done) done();
  // 3枚合体時は通常配置音を鳴らさず、1.5秒の吸い込み完了時にunion.wavだけを鳴らす。
  // 魔導店での配置＝購入なので、通常の配置音ではなくbuy1.wavを鳴らす。
  if(!tripleMerge){
    if(G._isShop&&typeof _playRewardAcquireSfx==='function'&&!isPendingSale) _playRewardAcquireSfx('buy1.wav');
    else if(typeof playSfx==='function') playSfx('fit',{group:'reward'});
  }
  renderHandEditor();
  if(tripleMerge) _playTripleMergeAnimation(tripleMerge);
  else _flashConnectedBoardCards(slotIdx);
  renderFieldEditor();
  renderMapInventorySlots();
  renderMoveSlotsInEnemy();
  if(oldCard&&!merged) renderRewCards();
  return true;
}
function toggleMapInventory(){
  G.inventoryOpen=!G.inventoryOpen;
  renderMapInventory();
}

function _connectedBoardFlashIndices(unit,startIdx){
  if(!unit||startIdx<0||typeof _panelGridPos!=='function') return [];
  const eq=Array.isArray(unit.equipment)?unit.equipment:[];
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
      const el=host.querySelector(`[data-equip-idx="${idx}"]`);
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
function renderMapInventory(){
  const btn=document.getElementById('map-inventory-toggle');
  const panel=document.getElementById('map-inventory-panel');
  const map=document.getElementById('world-map-panel');
  if(!btn||!panel) return;
  btn.style.display='none';
  panel.hidden=true;
  if(map) map.hidden=G.phase!=='map';
  const grid=document.getElementById('world-map-grid');
  if(grid) grid.style.display='';
}
function renderMapInventorySlots(){
  const el=document.getElementById('map-inventory-slots');
  if(!el) return;
  G.inventory=G.inventory||new Array(18).fill(null);
  el.innerHTML='';
  for(let i=0;i<18;i++){
    const card=G.inventory[i];
    if(card){
      const div=mkCardEl(card,i,'map-inventory');
      div.draggable=true;
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:'inventory',idx:i}; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); div.classList.add('dragging'); });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); });
      div.addEventListener('dragover',e=>{
        if(arrName==='unitEquip'&&_dragSrc&&_dragSrc.arr==='rew'&&_isItemCard(_rewCards[_dragSrc.idx])) return;
        e.preventDefault(); div.classList.add('drag-over');
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard('inventory',i); });
      const selected=_getPartyBoardUnit();
      if(selected&&selected.hp>0&&isEquipmentCard(card)){
        div.onclick=e=>{ e.stopPropagation(); equipInventoryCardToUnit(i,G._selectedEquipUnitIdx,'inventory'); };
        div.style.cursor='pointer';
      }
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{ e.preventDefault(); ph.classList.remove('drag-over'); dropOnCard('inventory',i); });
      el.appendChild(ph);
    }
  }
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

function _detachUnitEquipConnectionVisuals(srcIdx, srcEl, srcCard){
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
    const otherCard=unit&&Array.isArray(unit.equipment)?unit.equipment[otherIdx]:null;
    const otherEl=host.querySelector(`[data-equip-idx="${otherIdx}"]`);
    _restorePanelDirectionDomForDir(otherEl,otherCard,otherDir);
  });
  _restorePanelDirectionDom(srcEl,srcCard);
}

// デバッグモード中、所持金の下の枠に「リロール」を表示する（戦闘中は#btn-debug-killが同じ枠に表示される）
function renderDebugRewardRerollButton(){
  const btn=document.getElementById('rw-appearance-mode');
  if(!btn) return;
  btn.style.display='none';
  btn.disabled=true;
}

// 魔導板上のカードを売却できる施設か。魔導店（_isShop）に加え、鍛冶屋（_isForge）でも売却できる。
function _boardCardSellEnabled(){
  return !!(G&&(G._isShop||G._isForge));
}

function _shopCardSellGain(card){
  if(!card) return 0;
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

function goToReward(){
  const _isFacilityEntry=!!(G._isShop||G._isForge||G._isRingExchange||G._isVillageMenu||G._isWaveAltar||G._isTavern||G._isTreasureMapReward||G._isLibrary);
  document.body.classList.remove('battle-victory-pending');
  G._freeItemPhase='reward';
  G._freeItemUsed=false;
  // 戦闘フェイズ中に呼ばれた場合は何もしない（stale timer・hideVictoryOverlay 等から保護）
  if(G.phase==='player'||G.phase==='enemy') return;
  G._isTreasurePhase=false;
  G._isRewardTown=true; // 既存UIは街モードを維持
  G._freeRewardPanelMode=true; // 一時仕様：パネルは無料。_baseCostは保持する
  G._rewardOnePickMode=true;
  _rewFreePickDone=false;
  _rewPhaseId++;
  G.facilities=G.facilities||{altar:1,lab:1,city:1,vault:1,library:1,university:1};
  G.rewardGrade=Math.max(1,G.facilities.lab||1);
  // 明示的リセット（前回の残留データを防ぐ）
  G._pendingTreasureItems=G._pendingTreasureItems||[];

  // メイン置き場は最初から全枠使用可能なため、ボス撃破によるパネル枠解放は不要
  // ボス報酬フェイズかどうかはG._bossJustDefeatedがリセットされる前に確定させておく
  // （指輪提示の要否判定と、報酬フェイズ内で参照する_boardDiscardCount等のリセットに使う）
  G._isBossRewardCycle=!!G._bossJustDefeated;
  G._boardDiscardCount=0;
  G._ringOfferUnlocked=false;
  G._ringOfferResolved=false;
  G._ringOffer=G._isBossRewardCycle?_pickRingOffer():[];
  // 指輪の提示は通常の報酬カード取得後（編成完了ボタン押下後）に切り替わる別画面で行う。
  G._ringOfferPhase=false;
  G._bossJustDefeated=false;

  const _waveRewardCount=G._waveLoopEnabled&&Number.isInteger(G._waveRewardCount)?Math.max(0,Math.min(REWARD_GRID_CAPACITY,G._waveRewardCount)):REWARD_GRID_CAPACITY;
  _rewCards=drawRewards().filter(c=>c&&!c._isChar).slice(0,_waveRewardCount);
  G._retryRewardCards=null;
  _rewCards=_rewCards.filter(c=>c&&!c._isChar);
  _rewCards.forEach(c=>{ if(c) c._isOriginalReward=true; });
  _storeRewardStartSnapshot();
  G.phase='reward';
  G._battlePhaseRunning=false;
  document.body.classList.add('reward-screen-active');
  // 街・施設で画面が隠れている間にブラウザが停止させた背景動画（back1.webm）を再開する。
  if(typeof _resumeRewardBgVideo==='function') _resumeRewardBgVideo();
  if(!_isFacilityEntry&&typeof playSfx==='function') playSfx('menuOpen',{group:'ui'});
  // 街のBGMが鳴っている間（＝街の施設に入っている間）はmenu.wavへ切り替えない。
  if(!G._villageBgmActive&&typeof playBgm==='function') playBgm('menu',{fadeInMs:700});
  if(typeof _clearAllLogFx==='function') _clearAllLogFx();
  const goldLabel=document.querySelector('#reward-info-bar .ri-soul');
  if(goldLabel) goldLabel.textContent='所持金';
  G._showGlobalPanels=false;
  G._showFacilities=false;
  G._selectedEquipUnitIdx=G.allies.findIndex(a=>a&&a.hp>0);
  if(G._selectedEquipUnitIdx<0) G._selectedEquipUnitIdx=0;
  // 報酬フェイズ突入時に行動権を戦闘フェイズと同値にリセット
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G._familiarUsed=false; // ファミリア：報酬フェイズ開始時にリセット

  // 報酬フェイズUI
  const _faf=document.getElementById('f-ally'); if(_faf) _faf.innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eArea=document.getElementById('enemy-area');
  if(eArea) eArea.style.display=G.enemies.some(e=>e&&e._isTreasureItem)?'':'none';
  // 報酬フェイズでenemy-hand-areaを表示（renderEnemyHandが内容を制御）
  const eHandArea=document.getElementById('enemy-hand-area');
  if(eHandArea) eHandArea.style.display='';
  const rMoveBtns=document.getElementById('reward-move-btns');
  if(rMoveBtns) rMoveBtns.style.display='';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display='';

  const bossNotice=document.getElementById('boss-reward-notice');
  if(bossNotice) bossNotice.style.display='none';

  refreshRewardGoldUi();
  const rewardCount=document.getElementById('rw-count');
  if(rewardCount) rewardCount.textContent=G._isLibrary?5:(G.rewardCharCount||3);
  const rewardLabel=Array.from(document.querySelectorAll('#reward-info-bar .ri-soul')).find(el=>el.querySelector('#rw-count'));
  if(rewardLabel&&rewardLabel.firstChild) rewardLabel.firstChild.nodeValue=`${G._isLibrary?'貸出カード':'報酬'} `;
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.style.display='none'; rb.disabled=true; }
  renderDebugRewardRerollButton();

  renderAll(); // フィールド（仲間エリア）も再描画
  _updateLaneOffset(); // スロット描画後に同期計測してオフセットを確定
  // renderAll→renderControls が textContent を上書きするので必ず後で設定する
  document.getElementById('ph-badge').textContent='商談フェイズ';
  document.getElementById('ph-badge').className='ph-badge';
  document.getElementById('h-floor').textContent=G.floor+1;
  const _nl=document.getElementById('h-next-label'); if(_nl) _nl.style.display='';
  G._masterHandReady=true; // ここから敵インベントリエリアを報酬UIとして使用

  renderRewCards();
  renderGradeUpBtn();
  renderRaceBuffSummary();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  renderEnemyHand();
  setHint('ゴールドを支払ってキャラクターやアイテムを購入しましょう');
  updateHUD();
  // ボス報酬はG._bossJustDefeatedで処理済み
}

function _storeRewardStartSnapshot(){
  G._rewardStartSnapshot={
    rewCards:clone(_rewCards||[]),
    mainBoard:clone(G.mainBoard||[]),
    spellSlots:clone(G.spellSlots||[]),
    inventory:clone(G.inventory||[]),
    gold:G.gold,
    freePickDone:!!_rewFreePickDone,
    selectedEquipUnitIdx:G._selectedEquipUnitIdx,
    rings:clone(G.rings||[]),
    ringOffer:clone(G._ringOffer||[]),
    ringOfferUnlocked:!!G._ringOfferUnlocked,
    ringOfferResolved:!!G._ringOfferResolved,
    boardDiscardCount:G._boardDiscardCount||0,
    ringOfferPhase:!!G._ringOfferPhase,
    mapPanelPowers:clone(G.mapPanelPowers||{}),
    mapForgeOffers:clone(G._mapForgeOffers||[]),
    pendingMapForgePower:G._pendingMapForgePower?clone(G._pendingMapForgePower):null
  };
}

function resetRewardToStart(options){
  if(G.phase!=='reward'||!G._rewardStartSnapshot) return;
  const s=G._rewardStartSnapshot;
  const _forgePlacementOnly=!!(options&&options.forgePlacementOnly);
  const _forgePowers=_forgePlacementOnly?clone(G.mapPanelPowers||{}):null;
  const _forgeOffers=_forgePlacementOnly?clone(G._mapForgeOffers||[]):null;
  const _forgeGold=_forgePlacementOnly?G.gold:null;
  _rewCards=clone(s.rewCards||[]);
  G.mainBoard=clone(s.mainBoard||[]);
  G.spellSlots=clone(s.spellSlots||[]);
  G.inventory=clone(s.inventory||[]);
  G.gold=_forgePlacementOnly?Number(_forgeGold)||0:Number(s.gold)||0;
  _rewFreePickDone=!!s.freePickDone;
  G._selectedEquipUnitIdx=Number.isInteger(s.selectedEquipUnitIdx)?s.selectedEquipUnitIdx:0;
  G.rings=clone(s.rings||[null,null,null,null]);
  G._ringOffer=clone(s.ringOffer||[]);
  G._ringOfferUnlocked=!!s.ringOfferUnlocked;
  G._ringOfferResolved=!!s.ringOfferResolved;
  G._boardDiscardCount=s.boardDiscardCount||0;
  G._ringOfferPhase=!!s.ringOfferPhase;
  G.mapPanelPowers=_forgePlacementOnly?_forgePowers:clone(s.mapPanelPowers||{});
  G._mapForgeOffers=_forgePlacementOnly?_forgeOffers:clone(s.mapForgeOffers||[]);
  G._pendingMapForgePower=_forgePlacementOnly?G._pendingMapForgePower:(s.pendingMapForgePower?clone(s.pendingMapForgePower):null);
  G._pendingPanelPlacement=null;
  // アイテムの対象選択中（生贄人形などの1枚目を選んだ状態）に「元に戻す」を押すと、
  // G._pendingItemUse がリセット前の盤面スナップショットを抱えたまま残る。
  // その後に右クリック等で選択が中断されると、そのスナップショットが盤面へ書き戻され、
  // 報酬カードが「盤面」と「報酬枠」の両方に存在してしまう（同じカードを何度でも入手できる）。
  // リセット時点で選択そのものを破棄する（スナップショットの復元は行わない）。
  G._pendingItemUse=null;
  if(typeof _closeItemUseConfirm==='function') _closeItemUseConfirm();
  G._showGlobalPanels=false;
  _dragSrc=null;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  const gold=document.getElementById('rw-gold');
  if(gold) gold.textContent=rewardGoldText();
  updateHUD();
  if(G._isForge&&typeof renderMapForgeOffers==='function') renderMapForgeOffers();
  else renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderEnemyHand();
  renderMapInventorySlots();
  renderMoveSlotsInEnemy();
  if(typeof syncCurrentVillageFacilityStateFromReward==='function') syncCurrentVillageFacilityStateFromReward();
  if(G._isRingExchange&&typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
}

// ── 行き先ノード表示 ───────────────────────────

function renderMoveSlotsInEnemy(){
  const el=document.getElementById('reward-move-btns');
  if(!el) return;
  el.innerHTML='';
  // デバッグモード：演出確認用の試験戦闘ボタン（報酬/編成フェイズ中のみ表示）
  const testBtn=document.getElementById('btn-test-battle');
  if(testBtn) testBtn.style.display=(G._debugMode&&G.phase==='reward')?'':'none';
  if(G._isLibrary){
    const test=document.createElement('button');
    test.className='btn rew-move-btn library-test-btn';
    test.dataset.sfxSilent='1';
    test.innerHTML='<span class="rew-btn-label">試験戦闘</span>';
    test.onclick=()=>{ if(typeof playSfx==='function') playSfx('menuClose',{group:'ui'}); startTestBattle(); };
    const restore=document.createElement('button');
    restore.className='btn rew-reset-btn';
    restore.dataset.sfxSilent='1';
    restore.innerHTML='<span class="rew-btn-label">元に戻す</span>';
    restore.onclick=()=>{
      if(typeof playSfx==='function') playSfx('return',{group:'ui'});
      if(typeof resetLibraryLoanFormation==='function') resetLibraryLoanFormation();
    };
    const quit=document.createElement('button');
    quit.className='btn rew-reset-btn library-quit-btn';
    quit.dataset.sfxSilent='1';
    quit.innerHTML='<span class="rew-btn-label">読書をやめる</span>';
    quit.onclick=()=>{
      if(typeof closeMapLibraryFormation==='function') closeMapLibraryFormation();
    };
    el.appendChild(quit);
    el.appendChild(restore);
    el.appendChild(test);
    return;
  }
  const villageExtraBtn=document.getElementById('map-village-extra-btn');
  if(villageExtraBtn){
    villageExtraBtn.style.setProperty('display','none','important');
    villageExtraBtn.onclick=null;
    if(G.phase==='reward'&&G._isTavern){
      villageExtraBtn.style.setProperty('display','block','important');
      villageExtraBtn.innerHTML='<span class="rew-btn-label">村へ戻る</span>';
      villageExtraBtn.onclick=()=>{
        if(typeof playSfx==='function') playSfx('return',{group:'ui'});
        if(typeof returnToMapVillage==='function') returnToMapVillage();
      };
    }
  }
  const _hasPendingRingOffer=G._isBossRewardCycle&&Array.isArray(G._ringOffer)&&G._ringOffer.length>0;
  const _isMapBossRewardPending=!!G._mapBossRewardPendingAdvance;
  if(G._isShop||G._isForge||G._isTavern||G._isVillageMenu||G._isTreasureMapReward||G._isRingExchange||G._isLibrary||((typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G.worldMap)&&!_hasPendingRingOffer&&!_isMapBossRewardPending&&!G._ringOfferPhase)){
    // Wave進行中のショップ/鍛冶屋/指輪交換は、村/祭壇の施設なのでボタンを押しても次stageへは進めず、
    // 項目選択（村/祭壇メニュー）へ戻るだけにする。
    const _waveFacilityReturn=G._isLibrary||G._waveLoopEnabled&&(G._isShop||G._isForge||G._isRingExchange);
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.dataset.sfxSilent='1';
    const label=_waveFacilityReturn?(G._isLibrary?'図書館を出る':(G._isRingExchange?'祭壇を離れる':'店を出る')):(G._isTreasureMapReward?'戦闘開始':(G._isShop||G._isForge)?'戦闘開始':G._isWaveAltar?'出発する':(G._isTavern||G._isVillageMenu)?'村を出る':'戦闘開始');
    btn.innerHTML=`<span class="rew-btn-label">${label}</span>`;
    btn.onclick=()=>{
      if(G._pendingPanelPlacement) return;
      if(!_waveFacilityReturn&&G._moveInlineLocked) return;
      if(!_waveFacilityReturn&&typeof playSfx==='function') playSfx('menuClose',{group:'ui'});
      if(_waveFacilityReturn){
        const goBack=()=>{
          if(G._isRingExchange){
            if(typeof playSfx==='function') playSfx('altarOut',{group:'ui'});
            if(typeof _openWaveAltarMenu==='function') _openWaveAltarMenu();
          }else if(G._isLibrary){
            if(typeof playSfx==='function') playSfx('return',{group:'ui'});
            if(typeof openMapVillage==='function') openMapVillage();
          }else{
            if(typeof playSfx==='function') playSfx('shopOut',{group:'ui'});
            if(typeof openMapVillage==='function') openMapVillage();
          }
        };
        if(G._isShop) _confirmShopReturnWithPendingSales(goBack);
        else if(G._isRingExchange) _confirmRingExchangeReturn(goBack);
        else goBack();
        return;
      }
      // 塔（祭壇）の「出発する」も、街と同じくワールドマップ画面を挟んでから次へ進む。
      if(G._isWaveAltar&&typeof departWithWorldMap==='function'){ departWithWorldMap(); return; }
      if(G._isTreasureMapReward&&typeof returnToMapAfterTreasure==='function') returnToMapAfterTreasure(); else if(typeof shopDone==='function') shopDone();
    };
    el.appendChild(btn);
    // 鍛冶屋には「元に戻す」を置かない（ショップ・指輪交換とは異なり、鍛冶屋は仕様として置かない）。
    // ただしデバッグモードでは検証用に鍛冶屋でも表示し、押すと入店時点まで巻き戻す。
    const canResetMapReward=!G._isLibrary&&!G._isVillageMenu&&!G._isTavern&&!G._isTreasureMapReward
      &&(!G._isForge||!!G._debugMode);
    if(canResetMapReward){
      const reset=document.createElement('button');
      reset.className='btn rew-reset-btn';
      reset.dataset.sfxSilent='1';
      reset.innerHTML='<span class="rew-btn-label">元に戻す</span>';
      reset.onclick=()=>{
        if(typeof playSfx==='function') playSfx('return',{group:'ui'});
        // 鍛冶屋（デバッグ時のみ表示）は入店時点まで完全に巻き戻す。forgePlacementOnlyは
        // 購入済みのパネル力・所持金・提示内容を保持してしまうため使わない。
        resetRewardToStart(null);
        if(G._isForge&&typeof renderMapForgeOffers==='function') renderMapForgeOffers();
      };
      el.appendChild(reset);
    }
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
    // 通常の報酬カード取得後（編成完了）→ ボス報酬の指輪提示があれば「栄光の力」画面へ切り替え。
    // 栄光の力画面では、指輪未取得中は「指輪を取らない」、取得後は「決定」とラベルを変える。
    const label=G._ringOfferPhase?(G._ringOfferResolved?'決定':'指輪を取らない'):'戦闘開始';
    btn.innerHTML=`<span class="rew-btn-label">${label}</span>`;
    btn.onclick=()=>{
      if(btn.disabled||G._moveInlineLocked) return;
      btn.disabled=true;
      if(typeof playSfx==='function') playSfx('menuClose',{group:'ui'});
      if(!G._ringOfferPhase&&_hasPendingRingOffer){ _enterRingOfferPhase(); return; }
      if(G._mapBossRewardPendingAdvance&&typeof advanceWorldMapAfterBoss==='function'){ advanceWorldMapAfterBoss(); return; }
      chooseMoveInline(opt.nodeType);
    };
    if(G._pendingPanelPlacement||G._moveInlineLocked){ btn.classList.add('disabled'); btn.disabled=true; }
    el.appendChild(btn);
  });
  const reset=document.createElement('button');
  reset.className='btn rew-reset-btn';
  reset.dataset.sfxSilent='1';
  reset.innerHTML='<span class="rew-btn-label">元に戻す</span>';
  reset.onclick=()=>{
    if(typeof playSfx==='function') playSfx('return',{group:'ui'});
    // 栄光の力（指輪提示）画面中の「元に戻す」は、通常の報酬カード取得画面までは戻さず、
    // この画面に入った時点の状態にだけ戻す。
    if(G._ringOfferPhase) _resetRingPhaseToStart();
    else resetRewardToStart();
  };
  el.appendChild(reset);
}

function chooseMoveInline(nt){
  if(G._pendingPanelPlacement) return;
  if(G._moveInlineLocked) return; // 連打による戦闘開始の二重発火を防止
  G._moveInlineLocked=true;
  G._isShop=false; // 行商モード解除
  setTimeout(()=>{
    G._moveInlineLocked=false;
    if(G._pendingPanelPlacement) return;
    if(G._waveLoopEnabled&&typeof _startWaveFlowNext==='function'){
      document.getElementById('reward-info-bar').style.display='none';
      document.getElementById('reward-cards-section').style.display='none';
      const _rmb=document.getElementById('reward-move-btns'); if(_rmb) _rmb.style.display='none';
      _startWaveFlowNext();
      return;
    }
    document.getElementById('reward-info-bar').style.display='none';
    document.getElementById('reward-cards-section').style.display='none';
    const rMoveBtns=document.getElementById('reward-move-btns');
    if(rMoveBtns) rMoveBtns.style.display='none';
    const eArea=document.getElementById('enemy-area');
    if(eArea) eArea.style.display='';
    const eLabel=document.getElementById('enemy-field-label');
    if(eLabel) eLabel.style.display='';
    const passBtn=document.getElementById('btn-pass');
    if(passBtn){ passBtn.disabled=false; passBtn.style.display=''; }
    if(G._retryFloor){ G._retryFloor=false; G.floor--; }
    chooseMove(nt);
  }, 900);
}

// ── リロール ──────────────────────────────────

function rerollRewards(){
  return false;
}

// ── 報酬カード描画 ─────────────────────────────

function _dragSrcCard(){
  if(!_dragSrc) return null;
  if(_dragSrc.arr==='unitEquip') return (_getPartyBoardUnit().equipment||[])[_dragSrc.idx]||null;
  if(_dragSrc.arr==='spellSlots') return (G.spellSlots||[])[_dragSrc.idx]||null;
  if(_dragSrc.arr==='inventory') return (G.inventory||[])[_dragSrc.idx]||null;
  return null;
}
function _canReturnDragSrcToRewardArea(){
  // #battle-order-row（＝#battle-order-section内）は栄光の力（指輪提示）画面中は指輪提示専用の
  // 表示に切り替わっているため、通常報酬フェイズ用の「カードを報酬置き場へ戻す」動作の対象外にする
  // （この関数のリスナー自体は#battle-order-rowに一度だけ登録され、フェイズが変わっても残り続けるため
  // ここで都度チェックする必要がある）。
  if(G._ringOfferPhase) return false;
  if(G._isForge) return false;
  if(!_dragSrc||!['unitEquip','spellSlots','inventory'].includes(_dragSrc.arr)) return false;
  // 図書館の貸出カード枠には、貸出カード（_libraryLoan）しか戻せない。
  // 自前の所持カードを置けてしまうと、図書館を出た時点でそのカードを失う。
  if(G._isLibrary){ const c=_dragSrcCard(); if(!c||!c._libraryLoan) return false; }
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
  if(src.arr==='unitEquip'){
    unit=_getPartyBoardUnit();
    if(!unit||!unit.equipment) return;
    const nextEquips=(unit.equipment||[]).slice();
    nextEquips[src.idx]=null;
    if(!_canApplyUnitEquipChange(unit,nextEquips)) return;
  }
  // 魔導板のカードを、既に埋まっている報酬スロットへドロップした場合は、その場で入れ替える
  // （押し出された報酬カードを、ドラッグ元の魔導板スロットへそのまま戻す）
  let displacedToEquip=null;
  let restored;
  if(Number.isInteger(targetIdx)&&targetIdx>=0){
    if(src.arr==='unitEquip'){
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
  if(src.arr==='unitEquip'){
    _clearStarterPanelMarker(unit,src.idx,card);
    unit.equipment[src.idx]=displacedToEquip||null;
    _syncUnitPanelEffectsAfterMove(unit);
    if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  } else if(src.arr==='spellSlots'){
    G.spellSlots[src.idx]=null;
  } else if(src.arr==='inventory'){
    G.inventory[src.idx]=null;
  }
  renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderMapInventorySlots();
}
// 報酬カード置き場：配置順（戦闘順序）置き場を廃止し、同じ画面位置（#battle-order-section）にそのまま
// 報酬カードを横スクロール行として並べる。データ(_rewCards)自体は従来通り。
// Wave進行モード用：現在のwaveStageから「次の実戦闘」のstage番号を求める（村・祭壇の
// stage（5・10）は、直後に控えている通常戦闘のstageと同じ扱いにする。祭壇の次は次waveの
// stage1相当＝エリートまでの表示に戻す）。
function _waveEffectiveBattleStage(stage){
  if(stage===4) return 5;
  if(stage===10) return 1;
  return stage;
}
// ステージ1だけ先頭が村（リーゼ＝ゲーム開始地点）。その分、**エルムの後**の通常戦闘を1つ減らす
// （通常の 5〜8＝4戦 → 6〜8＝3戦）。マス数は他ステージと同じ10で、ボス9・祭壇10も据え置き。
// エリートと街の位置が1つ後ろへずれるため、_waveBattleType()等はこのルートから引く。
const SCENE1_ROUTE=['city','battle','battle','elite','city','battle','battle','battle','boss','altar'];
function _journeyRouteForScene(scene){
  const data=typeof SCENE_FLOW_DATA!=='undefined'?SCENE_FLOW_DATA:null;
  if(scene===5) return data&&data.final||['city','battle','battle','boss'];
  if(scene===1) return (data&&data.scene1)||SCENE1_ROUTE;
  return data&&data.standard||['battle','battle','elite','city','battle','battle','battle','battle','boss','altar'];
}
function _journeyIconForNode(type){
  return {elite:'elite.svg',city:'city.svg',boss:'boss.svg',altar:'altar.svg',finalBoss:'boss.svg'}[type]||'';
}
function _journeyNodeClass(type){
  if(type==='city'||type==='altar') return 'large';
  if(type==='elite'||type==='boss'||type==='finalBoss') return 'special';
  return '';
}
// 村／祭壇は「地域情報」シートの街の名前・塔の名前を表示する（sceneはステージ番号＝G._wave）。
// ステージ1の先頭の村だけはリーゼ＝シートのステージ0を参照する（idx=マスの並び順）。
function _journeyNodeLabel(type,scene,idx){
  const useRiese=type==='city'&&Number(scene)===1&&Number(idx)===0;
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(useRiese?0:(scene??(G&&G._wave))):null;
  if(type==='city') return String((info&&info.townName)||'村').trim()||'村';
  if(type==='altar') return String((info&&info.towerName)||'祭壇').trim()||'祭壇';
  return {battle:'一般戦闘',elite:'エリート',boss:'ボス',finalBoss:'ラスボス'}[type]||'';
}
// 旅の進捗のSceneマーク（上段のアイコン列）のホバー表示。そのステージの塔の名前を出す。
// ステージ5のマークはそこへ到達するまで表示自体を出さないため、名前も伏せない。
function _journeySceneTowerName(scene){
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(scene):null;
  return String((info&&info.towerName)||'???').trim()||'???';
}
function _journeyDisplayPosition(route,stage,scene){
  const actual=Math.max(0,Math.min(route.length-1,stage-1));
  // ステージ1のstage1は「リーゼ滞在中」なので、先頭の村マスを点灯させる
  // （以前はゲーム開始前扱いで-1＝どこも点灯させていなかった）。
  if(actual===0) return 0;
  const special=type=>['elite','boss','finalBoss'].includes(type);
  // 次の戦闘が特殊戦の場合は、その一歩前を表示する。
  if(special(route[actual])){
    let idx=actual-1;
    while(idx>0&&special(route[idx])) idx--;
    return idx;
  }
  // 特殊戦を終えて直ちに村／祭壇へ移った場合は、特殊戦ではなく到達先を表示する。
  if(special(route[actual-1])) return actual;
  return actual-1;
}
function _syncRewardJourneyUi(){
  const root=document.getElementById('journey-progress-ui');
  if(!root||!G) return;
  const scene=Math.max(1,Math.min(5,Number(G._wave)||1));
  const route=_journeyRouteForScene(scene);
  const stage=Math.max(1,Math.min(route.length,Number(G._waveStage)||1));
  const actual=stage-1;
  const current=_journeyDisplayPosition(route,stage,scene);
  const currentType=route[actual];
  const isFinalScene=scene===5;
  const reached=isFinalScene?currentType==='boss':currentType==='altar';
  const remaining=route.slice(actual).filter(type=>['battle','elite','boss','finalBoss'].includes(type)).length;
  // 現在位置の次に進むノードを強調する。ゲーム開始前は先頭ノードを対象にし、
  // 祭壇（または最終決戦）へ到達済みのときは次ノードを発光させない。
  const next=(reached||current>=route.length-1)?-1:(current<0?0:current+1);

  // ステージ4まではScene1〜4だけを並べ、ステージ5へ到達した時点で末尾にScene5を足す。
  // （最終ステージの存在自体を、到達するまで伏せておくため）
  // ただしデバッグモードでは、どのステージにいてもScene5マークを出す
  // （Sceneマークを押してステージ移動できるようにするため）。
  const sceneCount=(scene>=5||(G&&G._debugMode))?5:4;
  const sceneMarks=Array.from({length:sceneCount},(_,idx)=>{
    const n=idx+1;
    const state=n<scene?'passed':(n===scene?'current':'');
    const connector=idx<sceneCount-1?`<span class="journey-track-line ${n<scene?'passed':''}"></span>`:'';
    // デバッグモードでは各Sceneマークを押してそのステージ（=G._wave）へ移動できるようにする。
    const jumpAttr=(G&&G._debugMode)?` data-journey-scene="${n}"`:'';
    // ホバー表示はブラウザ標準のtitleではなくカードと同じ枠（#kw-tooltip）で塔の名前を出す。
    // 名前だけの1行表示なので、data-preview-norule で見出し下の直線を消す。
    return `<span class="journey-scene-mark ${state}" data-preview="${_escapePreviewHtml(_journeySceneTowerName(n))}" data-preview-norule="1"${jumpAttr}></span>${connector}`;
  }).join('');
  const nodeMarks=route.map((type,idx)=>{
    const state=idx<current?'passed':(idx===current?'current':'');
    const nextClass=idx===next?'next':'';
    const icon=_journeyIconForNode(type);
    const iconHtml=icon?`<img src="assets/ui/${icon}" alt="${_journeyNodeLabel(type,scene,idx)}">`:'';
    const connector=idx<route.length-1?`<span class="journey-track-line ${idx<current?'passed':''}"></span>`:'';
    const iconClass=icon?'has-icon':'';
    const iconStyle=icon?` style="--journey-icon:url('assets/ui/${icon}')"`:'';
    // エリート/ボスは、実際に出現する個体を先読み確定した上で「エリート／カード名」＋効果＋
    // カード画像＋ATK/HPをホバー表示する（data-journey-enemyに詰めてrender.js側で描画）。
    let previewText=_journeyNodeLabel(type,scene,idx);
    let enemyAttr='';
    if((type==='elite'||type==='boss'||type==='finalBoss')&&typeof _ensureWaveEnemyPreview==='function'){
      const previewType=type==='elite'?'elite':'boss';
      const enemyPreview=_ensureWaveEnemyPreview(scene,previewType);
      if(enemyPreview&&enemyPreview.def){
        const def=enemyPreview.def;
        const label=previewType==='elite'?'エリート':'ボス';
        previewText=`${label}\n${def.name}`;
        const artPaths=typeof getCharacterNoArtPath==='function'?getCharacterNoArtPath(def):'';
        const payload={
          name:def.name,desc:String(def.desc||'').trim(),atk:enemyPreview.atk,hp:enemyPreview.hp,art:artPaths||null,
          // 通常カードと同じく、効果テキストの一番上にキーワードを並べて表示する。
          keywords:[...new Set((def.keywords||[]).map(k=>String(k||'').trim()).filter(Boolean))],
          // 他のカードと同じ見た目（フレーム＋絵柄＋ATK/HP）でmkCardEl()に渡すための情報。
          artCode:def.artCode||def._artCode||def.No||def['No.']||def.no||def.imageNo||'',
          color:def.color||'',
          _sheetEnemy:!!def._sheetEnemy,
          // 旅の進捗のホバー表示でも、エリート／ボスは character_frame.png を使う。
          _isEliteOrBoss:true,
        };
        enemyAttr=` data-journey-enemy="${_escapePreviewHtml(JSON.stringify(payload))}"`;
      }
    }
    // デバッグモードでは各マスをクリックしてそのstageへ直接ジャンプできるようにする。
    const jumpAttr=(G&&G._debugMode)?` data-journey-jump="${idx+1}" data-journey-type="${type}"`:'';
    // エリート／ボス（カード付き）以外は名前だけの1行表示なので、Sceneマークと同じ枠にする
    // （見出し下の直線なし・幅は文字なり）。
    const noRuleAttr=enemyAttr?'':' data-preview-norule="1"';
    return `<span class="journey-node ${_journeyNodeClass(type)} ${iconClass} ${state} ${nextClass}"${iconStyle} data-preview="${_escapePreviewHtml(previewText)}"${enemyAttr}${noRuleAttr}${jumpAttr}>${iconHtml}</span>${connector}`;
  }).join('');
  // 「祭壇」は地域情報シートの「塔の名前」に置き換える（例：碧翠の塔まであと3戦／碧翠の塔に到達）。
  const _regionInfo=typeof regionInfoForWave==='function'?regionInfoForWave(scene):null;
  const towerName=String((_regionInfo&&_regionInfo.towerName)||'祭壇').trim()||'祭壇';
  const targetText=reached
    ?(isFinalScene?'最終決戦':`${towerName}に到達`)
    :(isFinalScene?'最終決戦まであと':`${towerName}まであと`);
  const countdown=reached?targetText:`${targetText} <strong>${remaining}</strong> 戦`;
  root.innerHTML=`<div class="journey-scene-track">${sceneMarks}</div><div class="journey-countdown ${reached?'reached':''}">${countdown}</div><div class="journey-node-track">${nodeMarks}</div>`;
  if(G&&G._debugMode) _bindDebugJourneyJump(root);
}
// デバッグ専用：旅の進捗のSceneマーク（countdownの上のアイコン列）をクリックして
// そのステージ（=G._wave）へ移動する。移動後も編成画面のままにする。
function _bindDebugSceneJump(root){
  root.querySelectorAll('[data-journey-scene]').forEach(mark=>{
    mark.classList.add('journey-scene-mark-debug-jump');
    mark.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const wave=Math.max(1,Math.min(5,Number(mark.dataset.journeyScene)||1));
      // ステージ1の先頭マスは村（リーゼ＝シートのステージ0）なので、G._waveは0で表す。
      // 旅の進捗のscene計算はMath.max(1,G._wave)なので、0でもステージ1として表示される。
      G._wave=wave===1?0:wave;
      G._waveStage=1;
      G._waveBattleType=null;
      G._mapBattle=null;
      G._waveEliteWon=false;
      G.floor=typeof _waveStageFloor==='function'?_waveStageFloor(wave,1):G.floor;
      log(`[DEBUG] ステージ${wave}へ移動した。`,'sys');
      // 編成画面のまま留まる（戦闘・村へは遷移しない）。
      if(typeof _openWaveFormation==='function') _openWaveFormation();
      else _syncRewardJourneyUi();
    };
  });
}
// デバッグ専用：旅の進捗のマスをクリックしてそのstageへ即移動する。
function _bindDebugJourneyJump(root){
  _bindDebugSceneJump(root);
  root.querySelectorAll('[data-journey-jump]').forEach(node=>{
    node.classList.add('journey-node-debug-jump');
    node.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const stage=Number(node.dataset.journeyJump)||1;
      const type=String(node.dataset.journeyType||'');
      // マスは「いま表示しているステージ（scene）」のもの。G._waveをsceneへ合わせてから飛ぶ。
      // これをしないと、リーゼ滞在中（G._wave=0）にエルムのマスを押した時に
      // waveが0のまま=地域情報のステージ0＝リーゼが開いてしまう。
      const scene=Math.max(1,Math.min(5,Number(G&&G._wave)||1));
      // ステージ1の先頭マスだけはリーゼ（シートのステージ0）。
      G._wave=(scene===1&&type==='city'&&stage===1)?0:scene;
      // 施設系は専用の開き方、戦闘系（通常/エリート/ボス/ラスボス）は_startWaveBattleで即開始。
      if(type==='city'){ if(typeof _openWaveVillage==='function') _openWaveVillage(stage,false); return; }
      if(type==='altar'){ if(typeof _openWaveAltar==='function') _openWaveAltar(stage); return; }
      if(typeof _startWaveBattle==='function') _startWaveBattle(stage);
    };
  });
}
// 所持金・ターン枠（#reward-production-ui .reward-prod-bottom）の表示更新。
// 編成画面専用ではなく、マップ・戦闘画面でも同じ枠を常時表示するため、
// 報酬フェイズ外からも（updateHUD経由で）呼べるよう独立させてある。
function _syncMoneyTurnTile(){
  const gold=document.querySelector('.reward-prod-money-value');
  if(gold) gold.textContent=Number(G.gold||0).toLocaleString('ja-JP');
  const tile=document.querySelector('.reward-prod-turn');
  const turn=document.querySelector('.reward-prod-turn-value');
  const turnLabel=document.querySelector('.reward-prod-turn-label');
  if(turn){
    if(G._waveLoopEnabled){
      // 元々ターン枠だった場所は「ライフ」表示に変更する（♥=残りライフ、♡=失ったライフ）。
      if(tile) tile.classList.remove('is-alert');
      if(turnLabel) turnLabel.textContent='ライフ';
      const life=Math.max(0,Math.min(3,G._waveLife==null?3:Number(G._waveLife)));
      turn.innerHTML=`<span class="life-empty">${'♡'.repeat(3-life)}</span><span class="life-full">${'♥'.repeat(life)}</span>`;
    }else{
      if(turnLabel) turnLabel.textContent='ターン';
      const map=G.worldMap||null;
      const cur=map?Math.max(0,Number(map.turn)||0):Math.max(0,Number(G.floor)||0);
      const limit=map?Math.max(1,Number(map.turnLimit)||15):100;
      turn.textContent=`${cur} / ${limit}`;
      if(tile) tile.classList.remove('is-alert');
    }
  }
  // エリート/ボス襲撃までの残ターンは「戦闘開始」ボタンの上に白文字で表示する。
  const cd=document.querySelector('.reward-prod-wave-countdown');
  const cdLabel=document.querySelector('.reward-prod-wave-countdown-label');
  const cdValue=document.querySelector('.reward-prod-wave-countdown-value');
  const cdAlert=document.querySelector('.reward-prod-wave-countdown-alert');
  if(cd&&G._waveLoopEnabled){
    const eff=_waveEffectiveBattleStage(Number(G._waveStage)||1);
    const toElite=eff<=4;
    const remaining=Math.max(0,(toElite?4:9)-eff);
    if(cdLabel) cdLabel.textContent=toElite?'エリート襲撃まで':'ボス襲撃まで';
    if(cdValue) cdValue.innerHTML=`${remaining} <span class="reward-prod-wave-countdown-unit">ターン</span>`;
    if(cdAlert) cdAlert.textContent=toElite?'エリート襲撃':'ボス襲撃';
    cd.classList.toggle('is-alert',remaining===0);
  }
}
// 編成画面の左上ラベル。施設から入った場合は「編成」ではなく施設名を出す。
function _syncRewardTitleLabel(){
  const el=document.querySelector('#reward-production-ui .reward-prod-title span');
  if(!el) return;
  // 街から入った施設は、シートに書かれた施設名そのまま（G._facilityLabel）を優先する。
  const fromVillage=(G._isItemShop||G._isForge||G._isShop||G._isLibrary)?String(G._facilityLabel||'').trim():'';
  el.textContent=fromVillage
    ||(G._isItemShop?'道具屋'
    :G._isForge?'鍛治屋'
    :G._isShop?'魔導店'
    :G._isRingExchange?'祭壇'
    :'編成');
  const rewardLabel=Array.from(document.querySelectorAll('#reward-info-bar .ri-soul')).find(node=>node.querySelector('#rw-count'));
  if(rewardLabel&&rewardLabel.firstChild) rewardLabel.firstChild.nodeValue=`${G._isLibrary?'貸出カード':'報酬'} `;
}
function _syncRewardProductionUi(){
  const body=document.body;
  if(!body) return;
  _syncRewardJourneyUi();
  if(!G||G.phase!=='reward'){
    body.classList.remove('reward-pick-finished','reward-return-open','reward-pick-taken','forge-screen-active','shop-screen-active');
    body.classList.remove('map-forge-roll-hide-cards');
    _syncMoneyTurnTile();
    return;
  }
  body.classList.toggle('forge-screen-active',!!G._isForge);
  body.classList.toggle('shop-screen-active',!!G._isShop);
  body.classList.toggle('item-shop-active',!!G._isItemShop);
  _syncRewardTitleLabel();
  const dragging=Array.from(body.classList).some(c=>c.indexOf('dragzone-')===0);
  const returned=Array.isArray(_rewCards)&&_rewCards.some(c=>c&&c._temporaryRewardAreaCard);
  const returnDragging=dragging&&(G._isForge?_canReturnDragSrcToRewardArea():true);
  const finished=!!(G._rewardOnePickMode&&_rewFreePickDone&&!G._pendingPanelPlacement&&!returned&&!returnDragging);
  body.classList.toggle('reward-pick-finished',finished);
  body.classList.toggle('reward-return-open',returned||returnDragging);
  // 編成完了ボタンのfix.png表示切り替え用：元々持っていたカードを報酬置き場に残していても
  // （＝returnedがtrueでも）、無料ピックを取得済みならfix.png表示とする。
  // 栄光の力（指輪提示）画面中は「指輪を取らない」ラベルの間はfix.png/fix_backを出さず、
  // 「決定」（指輪を取得済み＝G._ringOfferResolved）になって初めてfix表示にする。
  const pickTaken=G._ringOfferPhase
    ?!!G._ringOfferResolved
    :!!(G._rewardOnePickMode&&_rewFreePickDone&&!G._pendingPanelPlacement&&!returnDragging);
  body.classList.toggle('reward-pick-taken',pickTaken);
  _syncMoneyTurnTile();
  _syncRewardProductionItems();
  _syncRewardProductionRings();
}
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
          if(card._isTreasure) _rewFreePickDone=true;
          items[idx]=placed;
          if(G._isItemShop||G._isLibrary) _rewCards[rewIdx]=null;
          else _rewCards.splice(rewIdx,1);
          if(typeof syncCurrentVillageFacilityStateFromReward==='function') syncCurrentVillageFacilityStateFromReward();
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
  log(`${card.name}を売却（+${gain}ゴールド）`,'gold');
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
}
if(!window._itemRingMenuDismissBound){
  window._itemRingMenuDismissBound=true;
  document.addEventListener('pointerdown',e=>{
    const pop=document.getElementById('item-use-confirm');
    if(!pop) return;
    if(e.target&&e.target.closest&&e.target.closest('#item-use-confirm,.reward-prod-item .reward-prod-slots i,.reward-prod-ring .reward-prod-slots i')) return;
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
function _cardHasSeal(card){ return _cardSealKeywordIndex(card)>=0; }
// 生贄人形で実際に1減らせる封印かどうか。封印∞は_reduceCardSeal()がfalseを返すため、
// 対象に選べてしまうと「破壊だけ実行され、アイテムは消費されない」状態で止まる。
function _cardSealReducible(card){
  const idx=_cardSealKeywordIndex(card);
  if(idx<0) return false;
  return !/∞/.test(String(card.keywords[idx]||''));
}
function _reduceCardSeal(card){
  const idx=_cardSealKeywordIndex(card);
  if(idx<0) return false;
  const kw=String(card.keywords[idx]||'');
  if(/∞/.test(kw)) return false;
  const n=Math.max(0,(parseInt(kw.replace('封印',''),10)||0)-1);
  if(n<=0) card.keywords.splice(idx,1);
  else card.keywords[idx]=`封印${n}`;
  if(card.desc) card.desc=String(card.desc).replace(/(?:^|\s)封印\d+(?:\s|$)/g,' ').trim();
  return true;
}
function _convertReleaseEffectToOpening(card){
  if(!card) return false;
  let changed=false;
  ['desc','effect','effectText'].forEach(key=>{
    if(typeof card[key]!=='string') return;
    const next=card[key].replace(/(^|[\n\s])解放\s*[:：]/g,'$1開戦：');
    if(next!==card[key]){ card[key]=next; changed=true; }
  });
  if(changed) card._releaseConvertedToOpening=true;
  return changed;
}
function _confirmSealReleaseConversion(onYes){
  const old=document.getElementById('map-confirm-dialog');
  if(old) old.remove();
  const dialog=document.createElement('div');
  dialog.id='map-confirm-dialog';
  dialog.innerHTML='<div class="map-confirm-box"><div class="map-confirm-msg">封印が失われた場合、解放効果は開戦効果に変更されます。</div><div class="map-confirm-btns"><button type="button" class="btn map-confirm-yes">OK</button><button type="button" class="btn map-confirm-no">キャンセル</button></div></div>';
  document.body.appendChild(dialog);
  const close=()=>dialog.remove();
  dialog.querySelector('.map-confirm-yes').onclick=()=>{ close(); if(typeof onYes==='function') onYes(); };
  dialog.querySelector('.map-confirm-no').onclick=close;
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
  if(G._isShop||G._isItemShop||G._isForge||G._isTavern||G._isRingExchange||G._isVillageMenu||G._isWaveAltar||G._isLibrary) return true;
  // ワールドマップ上の現在地が村マスなら街の中とみなす。
  // ※#scr-village の .active は街を出た後（報酬フェイズ等）も残ることがあるため判定に使わない。
  return !!(typeof _mapCurrentVillageNode==='function'&&_mapCurrentVillageNode());
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
  if(key==='meteor_scroll') return true;
  // ポータルの巻物は「直前の村へワープする」アイテムなので、街（村・その施設）にいる間は使えない。
  if(key==='portal_scroll') return !!G.worldMap && !_isInVillageScene();
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
function _isItemUseTargetSlot(slotIdx){
  const pending=G._pendingItemUse;
  if(!pending) return true;
  const equips=typeof _mainBoardEquips==='function'?_mainBoardEquips():[];
  const card=equips[slotIdx];
  if(!_isBoardCharacterCard(card)) return false;
  const key=pending.key;
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
  if(pending.sealConversionConfirming) return false;   // 確認ダイアログ表示中は触らない
  if(Array.isArray(pending.boardSnapshot)){
    const equips=typeof _mainBoardEquips==='function'?_mainBoardEquips():null;
    if(equips) pending.boardSnapshot.forEach((c,i)=>{ equips[i]=c?clone(c):null; });
  }
  G._pendingItemUse=null;
  if(!silent) log(`${pending.card&&pending.card.name||'アイテム'}の使用をやめた。`,'sys');
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
    _cancelPendingItemUse();
  },true);
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||!G||!G._pendingItemUse) return;
    e.preventDefault();
    _cancelPendingItemUse();
  },true);
}

function _beginBoardItemUse(idx,card){
  const key=_itemEffectKey(card);
  const equipsNow=typeof _mainBoardEquips==='function'?_mainBoardEquips():[];
  G._pendingItemUse={slotIdx:idx,key,card:clone(card),step:0,
    boardSnapshot:(equipsNow||[]).map(c=>c?clone(c):null)};
  const msg={
    bond_scroll:'合体する1枚目の同名キャラクターを選んでください。',
    shield_scroll:'結界1を永久付与するキャラクターを選んでください。',
    giant_scroll:'+5/+5を永久付与するキャラクターを選んでください。',
    sacrifice_doll:'破壊するキャラクターを選んでください。',
    weakening_scroll:'破壊するキャラクターを選んでください。',
    inspire_flag:'根性を永久付与するキャラクターを選んでください。',
    vision_scroll:'復活を永久付与するキャラクターを選んでください。',
    mana_scroll:'マナ効果を1減らすキャラクターを選んでください。',
  }[key]||'対象を選んでください。';
  log(msg,'gold');
  // 対象外カードの暗転を反映するため描き直す。
  if(typeof renderHandEditor==='function') renderHandEditor();
}
function _useImmediateItem(idx,card){
  const key=_itemEffectKey(card);
  if(!_canUseItemNow(card)){ log(`${card.name}は使用条件を満たしていません。`,'bad'); return false; }
  if(key==='silence_scroll'){
    G.pendingBattleItems=Array.isArray(G.pendingBattleItems)?G.pendingBattleItems:[];
    G.nextBattleItems=Array.isArray(G.nextBattleItems)?G.nextBattleItems:[];
    const useCard=clone(card);
    useCard.itemEffectKey='silence_scroll';
    useCard._itemUseInstanceId=`item-use-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    G.pendingBattleItems.push(clone(useCard));
    G.nextBattleItems.push(clone(useCard));
    _consumeItemSlot(idx);
    log(`${card.name}を使用した。次の戦闘で効果が発動する。`,'gold');
    return true;
  }
  if(key==='golden_scroll'){
    G.gold=Math.floor((G.gold||0)*2);
    _consumeItemSlot(idx);
    log('黄金の巻物の効果で所持金が2倍になった。','gold');
    return true;
  }
  if(key==='jade_vase'){
    const gain=typeof onGoldGained==='function'?onGoldGained(200):200;
    if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
    _consumeItemSlot(idx);
    log(`翡翠の壺を売り、${gain}ゴールドを得た。`,'gold');
    return true;
  }
  if(key==='golden_vase'){
    const gain=typeof onGoldGained==='function'?onGoldGained(300):300;
    if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
    _consumeItemSlot(idx);
    log(`黄金の壺を売り、${gain}ゴールドを得た。`,'gold');
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
    log(`${card.name}を使用した。次の戦闘開始時に隕石が落ちる。`,'gold');
    return true;
  }
  if(key==='portal_scroll'){
    G._pendingMapItemUse={slotIdx:idx,key,card:clone(card)};
    if(typeof warpToNearestVillage==='function'&&warpToNearestVillage()) return true;
    G._pendingMapItemUse=null;
    log('直前の村へワープできる村がありません。','bad');
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
  if(!_isBoardCharacterCard(card)){ log('キャラクターを選んでください。','bad'); return true; }
  const key=pending.key;
  if(key==='shield_scroll'){
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    card.keywords.push('結界1');
    G._pendingItemUse=null; _consumeItemSlot(pending.slotIdx); log(`${card.name}に結界1を永久付与した。`,'gold'); return true;
  }
  if(key==='giant_scroll'){
    card.power=(Number(card.power)||0)+5; card.life=(Number(card.life)||0)+5;
    G._pendingItemUse=null; _consumeItemSlot(pending.slotIdx); log(`${card.name}は永久に+5/+5を得た。`,'gold'); return true;
  }
  if(key==='inspire_flag'){
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    if(!card.keywords.includes('根性')) card.keywords.push('根性');
    G._pendingItemUse=null; _consumeItemSlot(pending.slotIdx); log(`${card.name}に根性を永久付与した。`,'gold'); return true;
  }
  if(key==='vision_scroll'){
    card.keywords=Array.isArray(card.keywords)?card.keywords:[];
    if(!card.keywords.includes('復活')) card.keywords.push('復活');
    G._pendingItemUse=null; _consumeItemSlot(pending.slotIdx); log(`${card.name}に復活を永久付与した。`,'gold'); return true;
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
    if(!changed){ log(`${card.name}は減らせるマナ効果がありません。`,'bad'); return true; }
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
    G._pendingItemUse=null; _consumeItemSlot(pending.slotIdx); log(`${card.name}のマナ効果を永久に1減らした。`,'gold'); return true;
  }
  if(key==='bond_scroll'){
    if(!pending.firstIdx&&pending.firstIdx!==0){
      if(card._merged){ log('合体済みカードは選べません。','bad'); return true; }
      pending.firstIdx=slotIdx;
      pending.firstName=card.name;
      log('合体する2枚目の同名キャラクターを選んでください。','gold');
      renderHandEditor();
      return true;
    }
    const first=equips[pending.firstIdx];
    if(!first||first===card||card.name!==pending.firstName||card._merged||first._merged){
      log('同名かつ未合体の別キャラクターを選んでください。','bad'); return true;
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
    first.keywords=_mergeCardKeywordsForBond(first.keywords,card.keywords);
    first.rarity=Math.min(5,(Number(first.rarity)||1)+1);
    first.grade=Math.max(Number(first.grade)||1,first.rarity);
    first.directionCount=4;
    first._merged=true;
    // 自身が持っていた効果（開戦・負傷・死亡等のトリガー効果）だけを2回分発動させる。
    // 召喚枚数とは別の状態として保存する。
    first._effectRepeatBonus=(Number(first._effectRepeatBonus||first.effectRepeatBonus)||0)+1;
    delete first.effectRepeatBonus;
    equips[slotIdx]=null;
    G._pendingItemUse=null; _consumeItemSlot(pending.slotIdx); log(`${first.name}を合体した。`,'gold'); return true;
  }
  if(key==='sacrifice_doll'){
    if(!pending.destroyIdx&&pending.destroyIdx!==0){
      pending.destroyIdx=slotIdx;
      pending.destroyName=card.name;
      equips[slotIdx]=null;
      renderHandEditor();
      log('封印を減らす別のキャラクターを選んでください。','gold');
      return true;
    }
    if(slotIdx===pending.destroyIdx||!_cardSealReducible(card)){ log('封印を1減らせる別のキャラクターを選んでください。','bad'); return true; }
    const sealIdx=_cardSealKeywordIndex(card);
    const isSealOne=sealIdx>=0&&String(card.keywords[sealIdx])==='封印1';
    const apply=()=>{
      if(!_reduceCardSeal(card)) return;
      if(isSealOne) _convertReleaseEffectToOpening(card);
      G._pendingItemUse=null;
      _consumeItemSlot(pending.slotIdx);
      log(`${pending.destroyName}を破壊し、${card.name}の封印を1減らした。`,'gold');
    };
    if(isSealOne&&!pending.sealConversionConfirmed){
      pending.sealConversionConfirming=true;
      _confirmSealReleaseConversion(()=>{
        if(G._pendingItemUse!==pending) return;
        pending.sealConversionConfirming=false;
        pending.sealConversionConfirmed=true;
        apply();
      });
      return true;
    }
    apply();
    return true;
  }
  if(key==='weakening_scroll'){
    equips[slotIdx]=null;
    G.mapPanelPowers=G.mapPanelPowers||{};
    const summonSlots=Array.from({length:MAIN_BOARD_SIZE},(_,i)=>i)
      .filter(i=>typeof mapPanelPowerIdAt==='function'&&mapPanelPowerIdAt(i)==='summon');
    const target=summonSlots.length?randFrom(summonSlots):null;
    if(target==null){ log('召喚の力マスがありません。','bad'); return true; }
    G._pendingItemUse=null;
    _consumeItemSlot(pending.slotIdx);
    const finish=()=>{ renderHandEditor(); renderRewCards(); updateHUD(); log(`${card.name}を破壊し、召喚の力マスを永劫の力に変えた。`,'gold'); };
    if(typeof _playMapForgeSlotRoll==='function'){
      G._mapForgeAnimating=true;
      _playMapForgeSlotRoll([target],target,{id:'eternal'}).then(()=>{
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
  _closeItemUseConfirm();
  const pop=document.createElement('div');
  pop.id='item-use-confirm';
  pop.innerHTML=`<div class="item-use-title">${card.name||'アイテム'}</div><button type="button" class="btn item-use-do">使う</button><button type="button" class="btn item-use-discard">捨てる</button><button type="button" class="btn item-use-cancel">キャンセル</button>`;
  document.body.appendChild(pop);
  const rect=anchor&&anchor.getBoundingClientRect?anchor.getBoundingClientRect():null;
  const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
  if(rect){
    pop.style.left=`${rect.right+14*scale}px`;
    pop.style.top=`${rect.top+18*scale}px`;
  }
  const useBtn=pop.querySelector('.item-use-do');
  // 使用条件を満たさないアイテムは「使う」を押せなくする
  // （例：ポータルの巻物は街にいる間は使えない）。
  if(!_canUseItemNow(card)){
    useBtn.disabled=true;
    useBtn.classList.add('item-use-unavailable');
    useBtn.title='ここでは使用できません';
  }
  useBtn.onclick=e=>{
    e.stopPropagation();
    if(useBtn.disabled) return;
    _useImmediateItem(idx,card);
  };
  pop.querySelector('.item-use-discard').onclick=e=>{
    e.stopPropagation();
    const current=_ensureItemSlots()[idx];
    if(current){ _ensureItemSlots()[idx]=null; log(`${current.name||'アイテム'}を捨てた。`,'gold'); }
    _closeItemUseConfirm();
    renderHandEditor(); updateHUD();
  };
  pop.querySelector('.item-use-cancel').onclick=e=>{
    e.stopPropagation();
    _closeItemUseConfirm();
    // 対象選択中に開いた場合は、選択そのものを取りやめる。
    _cancelPendingItemUse();
  };
}
function _rewardRingArtPath(ring){
  if(!ring) return '';
  let code=String(ring.artCode||ring.imageNo||ring.No||ring.no||ring['No.']||ring.code||'').trim();
  if(!code) return '';
  const m=code.match(/^R?\s*0*(\d+)$/i);
  if(m) code='R'+String(parseInt(m[1],10)).padStart(3,'0');
  return `assets/art/ring/${code}.jpg`;
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
    const desc=String(ring&&(ring.desc||ring.description||ring.effectText||ring.effect)||'').trim();
    slot.classList.remove('rarity-1','rarity-2','rarity-3','rarity-4','rarity-5');
    if(ring&&(title||desc)){
      slot.setAttribute('data-preview',[title||'指輪',desc].filter(Boolean).join('\n'));
      slot.classList.add(_rewardRingRarityClass(ring));
    } else {
      slot.removeAttribute('data-preview');
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
    // 提示された指輪（栄光の力・#battle-order-row側）を空き枠へドラッグして装備する操作を受け付ける。
    slot.draggable=!!ring;
    if(!slot._ringDragWired){
      slot._ringDragWired=true;
      slot.addEventListener('dragstart',e=>{
        if(!slot._rewardRing){ e.preventDefault(); return; }
        _dragSrc={arr:'rings',idx};
        if(e.dataTransfer){ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); }
        _setDragZoneClass('dragzone-ring-slot');
        _createDragGhost(slot);
        // _createDragGhost()はクローン後にstyle.cssTextを丸ごと上書きするため、
        // --ring-art（CSS変数）がゴースト側に残らず指輪の絵が表示されない。元要素から再設定する。
        if(_dragGhostDiv) _dragGhostDiv.style.setProperty('--ring-art',slot.style.getPropertyValue('--ring-art'));
        slot.classList.add('dragging');
      });
      slot.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      slot.addEventListener('dragend',()=>{ slot.classList.remove('dragging'); _dragSrc=null; });
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
          return;
        }
        if(_dragSrc&&_dragSrc.arr==='ringOffer'&&G._ringOfferUnlocked&&!slot._rewardRing){
          e.preventDefault();
          const offerIdx=_dragSrc.idx; _dragSrc=null;
          const offerRing=(G._ringOffer||[])[offerIdx];
          if(!offerRing) return;
          G.rings=Array.isArray(G.rings)?G.rings:[null,null,null,null];
          G.rings[idx]=clone(offerRing);
          // 栄光の力から指輪枠へ配置できた瞬間に取得SEを鳴らす。
          _playRewardAcquireSfx('ring_get.wav');
          // 指輪は1つだけ取得可能。選んだ指輪を提示から取り除き、残りはフェードアウトで
          // 消して空の枠3つだけを残す（_renderRingOfferCards()）。フェードアウトは取得直後の
          // 1回だけなので、消える指輪と取得した位置を_ringOfferFadeOutに退避しておく。
          G._ringOfferFadeOut={taken:offerIdx,offer:clone(G._ringOffer||[])};
          G._ringOffer.splice(offerIdx,1);
          G._ringOfferUnlocked=false;
          G._ringOfferResolved=true;
          log(`${offerRing.name}を手に入れた。`,'gold');
          // 別の枠へドラッグした場合は自然発火するdragendでゴーストが消えるが、この枠の
          // ようにドロップ成功でrenderRewCards()がこの要素自体を作り直す（＝ドラッグ元の要素が
          // DOMから消える）場合はdragendが発火しないことがあるため、ここで明示的に片付ける。
          if(typeof _removeDragGhost==='function') _removeDragGhost();
          if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
          updateHUD();
          renderRewCards();
          renderMoveSlotsInEnemy();
        }
      });
    }
  });
}

function _openRingActionConfirm(idx,anchor){
  const ring=Array.isArray(G.rings)?G.rings[idx]:null;
  if(!ring) return;
  _closeItemUseConfirm();
  const pop=document.createElement('div');
  pop.id='item-use-confirm';
  pop.innerHTML=`<div class="item-use-title">${ring.name||'指輪'}</div><button type="button" class="btn ring-toggle-do">${ring._disabled?'有効化':'無効化'}</button><button type="button" class="btn ring-discard-do">捨てる</button><button type="button" class="btn ring-action-cancel">キャンセル</button>`;
  document.body.appendChild(pop);
  const rect=anchor&&anchor.getBoundingClientRect?anchor.getBoundingClientRect():null;
  const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
  if(rect){ pop.style.left=`${rect.right+14*scale}px`; pop.style.top=`${rect.top+18*scale}px`; }
  pop.querySelector('.ring-toggle-do').onclick=e=>{
    e.stopPropagation(); ring._disabled=!ring._disabled; _closeItemUseConfirm();
    if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
    _syncRewardProductionUi(); updateHUD();
  };
  pop.querySelector('.ring-discard-do').onclick=e=>{
    e.stopPropagation(); G.rings[idx]=null; _closeItemUseConfirm();
    if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
    _syncRewardProductionUi(); updateHUD();
  };
  pop.querySelector('.ring-action-cancel').onclick=e=>{ e.stopPropagation(); _closeItemUseConfirm(); };
}
function _rewardRingRarityClass(ring){
  const n=Math.max(1,Math.min(5,parseInt(ring&&ring.rarity,10)||1));
  return `rarity-${n}`;
}
function _showRewardRingTooltip(e){
  const ring=e.currentTarget&&e.currentTarget._rewardRing;
  const tip=document.getElementById('kw-tooltip');
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
  tip.innerHTML=`<div class="preview-title">${esc(title||'指輪')}</div>${esc(desc)}`;
  tip.style.display='block';
  _moveRewardRingTooltip(e);
}
function _moveRewardRingTooltip(e){
  const tip=document.getElementById('kw-tooltip');
  if(!tip||tip.style.display==='none') return;
  tip.style.left=`${e.clientX+18}px`;
  tip.style.top=`${e.clientY+18}px`;
}
function _hideRewardRingTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(tip) tip.style.display='none';
}
function renderRewCards(){
  _syncRewardPanelPlacementOverlay();
  _syncRewardProductionUi();
  document.body.classList.toggle('ring-offer-phase',!!(G&&G.phase==='reward'&&G._ringOfferPhase));
  // 指輪取得後の祭壇：見出し下の説明文を「代償の対価たる力は与えられた」に差し替える。
  document.body.classList.toggle('ring-offer-resolved',!!(G&&G.phase==='reward'&&G._ringOfferPhase&&G._ringOfferResolved));
  document.body.classList.toggle('treasure-offer-phase',!!(G&&G.phase==='reward'&&G._isTreasureMapReward));
  const section=document.getElementById('battle-order-section');
  const el=document.getElementById('battle-order-row');
  if(!section||!el) return;
  const rewardSectionLabel=document.querySelector('#reward-cards-section .field-label');
  if(rewardSectionLabel) rewardSectionLabel.textContent=G._isLibrary?'貸出カード':'提示カード';
  if(G.phase!=='reward'){ section.style.display='none'; el.innerHTML=''; _syncRewardProductionUi(); return; }
  // 村/祭壇メニューと鍛冶屋は同じ行を独自の選択肢で使用するため、
  // カード移動後の再描画で提示内容を消さない。
  if((G._isVillageMenu&&!G._isShop&&!G._isForge&&!G._isRingExchange&&!G._isTreasureMapReward)||G._isForge){
    section.style.display='';
    return;
  }
  section.style.display='';
  el.innerHTML='';
  if(G._ringOfferPhase){
    _renderRingOfferCards(el);
    requestAnimationFrame(fitCardDescs);
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
    requestAnimationFrame(fitCardDescs);
    return;
  }
  if(G._isTreasureMapReward){
    _rewCards.slice(0,1).forEach((card,i)=>{
      if(!card) return;
      const d=_mkRewDiv(card,()=>takeRewCard(i),i);
      d.classList.add('treasure-offer-card','item-visual');
      d.classList.remove('treasure');
      d.style.setProperty('--item-art',`url("${_rewardItemArtPath(card)}")`);
      d.classList.add('item-visual-filled');
      el.appendChild(d);
    });
    requestAnimationFrame(fitCardDescs);
    return;
  }
  // 道具屋：指輪交換と同じくitem_slot画像の枠でアイテムを3つ並べる（価格バッジは通常のショップと同形式）。
  if(G._isItemShop){
    Array.from({length:3},(_,i)=>_rewCards[i]||null).forEach((card,i)=>{
      if(!card){ el.appendChild(_mkShopSoldOutDiv(i)); return; }
      const d=_mkRewDiv(card,()=>takeRewCard(i),i);
      d.classList.add('item-shop-card','treasure-offer-card','item-visual');
      // 下・上・下と互い違いに置き、行の上下に余白を作らない。
      d.classList.add(i%2===1?'item-shop-card-up':'item-shop-card-down');
      // 商品枠に置いた自分のアイテム（売却待ち）は必ずドラッグで手持ちへ戻せるようにする。
      if(card._shopSalePending){ d.draggable=true; d.classList.remove('reward-drag-locked'); }
      d.classList.remove('treasure');
      d.style.setProperty('--item-art',`url("${_rewardItemArtPath(card)}")`);
      d.classList.add('item-visual-filled');
      el.appendChild(d);
    });
    requestAnimationFrame(fitCardDescs);
    return;
  }
  if(G._isShop){
    for(let i=0;i<REWARD_GRID_CAPACITY;i++){
      const card=_rewCards[i]||null;
      // 購入済みの枠は詰めずに残し、中心に「売切」と表示する。
      if(!card){ el.appendChild(_mkShopSoldOutDiv()); continue; }
      const d=_mkRewDiv(card,()=>takeRewCard(i),i);
      if(pendingRewardIdx===i) d.classList.add('pending-placement');
      el.appendChild(d);
    }
    requestAnimationFrame(fitCardDescs);
    return;
  }
  _rewCards=_rewCards.filter(card=>!card||!card._isChar);
  _rewCards.slice(0,REWARD_GRID_CAPACITY).forEach((card,i)=>{
    if(!card) return;
    const d=_mkRewDiv(card,()=>takeRewCard(i),i);
    if(pendingRewardIdx===i) d.classList.add('pending-placement');
    if(_rewardPickUsed&&card._isOriginalReward){ d.onclick=null; d.style.opacity='0.5'; d.style.cursor='default'; }
    el.appendChild(d);
  });
  const rbLegacy=document.getElementById('rw-reroll'); if(rbLegacy){ rbLegacy.style.display='none'; rbLegacy.disabled=true; }
  requestAnimationFrame(fitCardDescs);
}
function renderBattleOrderRow(show){
  // 配置順（戦闘順序）システムは廃止。この位置には報酬カードを表示する（renderRewCardsに一本化）。
  if(typeof renderRewCards==='function') renderRewCards();
}

// ── 指輪の提示（栄光の力）：通常の報酬カードと同じ場所（#battle-order-row）に表示する ──
// 暗い（未解放）間はホバーで説明のみ表示、明るくなったらドラッグで指輪置き場へ持っていく。
// 祭壇の提示枠の数（＝提示される指輪の数）。取得後に残す空枠の数もこれに合わせる。
const RING_OFFER_SLOT_COUNT=3;
// 指輪取得後の祭壇：他の指輪は消えて空の枠だけが残る。取得直後の1回だけ、
// 残っていた指輪をその場でフェードアウトさせる（再入場時は最初から枠だけ）。
function _renderRingOfferResolvedFrames(el){
  const fade=G._ringOfferFadeOut;
  G._ringOfferFadeOut=null;
  for(let i=0;i<RING_OFFER_SLOT_COUNT;i++){
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
    el.appendChild(div);
  }
}
function _renderRingOfferCards(el){
  const unlocked=!!G._ringOfferUnlocked;
  if(G._ringOfferResolved){ _renderRingOfferResolvedFrames(el); return; }
  (G._ringOffer||[]).forEach((ring,idx)=>{
    if(!ring) return;
    // 指輪置き場（.ring-visual）と同じ見た目（ring_slot.pngの枠＋指輪アート）で表示する。
    // mkCardEl()の汎用カード絵柄解決はassets/art/ring/のパス規則を知らないため使わない。
    const div=document.createElement('div');
    div.classList.add('rew-card','ring-offer-card','ring-visual');
    if(ring.rarity>=1&&ring.rarity<=5) div.classList.add(`rarity-${ring.rarity}`);
    const path=_rewardRingArtPath(ring);
    if(path){
      div.classList.add('ring-visual-filled');
      div.style.setProperty('--ring-art',`url("${path}")`);
    }
    const preview=[ring.name||'指輪',ring.desc||''].filter(Boolean).join('\n');
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
    div.classList.add(itemIdx%2===1?'shop-sold-out-item-down':'shop-sold-out-item-up');
  }
  const label=document.createElement('span');
  label.className='shop-sold-out-label';
  label.textContent='売切';
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
  label.textContent='貸出中';
  div.appendChild(label);
  return div;
}

function _mkRewDiv(card, onBuy, rewIdx){
  const isPendingSale=!!card._shopSalePending;
  const cost=Math.max(0,(card._buyPrice??1));
  const canBuy=!isPendingSale&&(!G._isRewardTown||G._freeRewardPanelMode||cost===0||G.gold>=cost);
  const isLegend=!!card._isLegend;
  const isTreasure=!!card._isTreasure;
  const div=(typeof mkCardEl==='function'&&!card._isChar)?mkCardEl(card,rewIdx??-1,'reward'):document.createElement('div');
  div.classList.add('rew-card');
  if(_rewardMergeCandidate(rewIdx,card)) div.classList.add('merge-ready');
  if(card.rarity>=1&&card.rarity<=5) div.classList.add(`rarity-${card.rarity}`);
  if(!canBuy&&!isPendingSale) div.classList.add('cant');
  if(isLegend) div.classList.add('legend');
  if(isTreasure) div.classList.add('treasure');
  if(typeof applyCardVisual==='function'){
    applyCardVisual(div,card);
  } else if(typeof getCardAsset==='function'&&typeof assetUrl==='function'){
    div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
  }

  if(card._isChar){
    // キャラクターカード
    const hasSlot=G.allies.includes(null);
    const disabled=!hasSlot;
    div.className='rew-card character-card'+((isPendingSale||canBuy&&!disabled)?'':' cant')+(isLegend?' legend':'');
    const raceBadge=`<div style="font-size:.55rem;color:var(--text2);margin-bottom:1px">${card.race||'-'}</div>`;
    const atkStr=`<span style="color:var(--teal2)">${card.atk}</span>`;
    const statsLine=`<div style="font-size:.68rem;font-weight:700;margin-top:2px">${atkStr}<span style="color:var(--text2)">/</span><span style="color:#60d090">${card.hp}</span></div>`;
    const costLine=G._isRewardTown?`<div class="rew-card-cost">${cost}ゴールド${disabled?' （盤面満杯）':''}</div>`:disabled?`<div class="rew-card-cost">（盤面満杯）</div>`:'';
    const uniqueBadge=card.unique?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
    const gradeTag='';
    const shortBadge=!isPendingSale&&!canBuy&&!isTreasure?`<div class="shop-insufficient-badge" style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 4px;font-size:.48rem;color:#fff;font-weight:700;white-space:nowrap;z-index:999">ゴールド不足</div>`:'';
    const _rewCharDesc=_stripKeywordsFromDesc(card.desc?computeDesc(card):'',card);
    // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
    // 既にアイコン化済みの_rewCharDescではなくプレーンテキストを渡す
    // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
    const _rewCharDescPlain=card.desc?_stripKeywordsFromDesc(_rawSubstitutedDesc(card),card):'';
    const _charPreview=typeof _unitPreviewText==='function'?_unitPreviewText(card,_rewCharDescPlain):_rewCharDescPlain;
    if(_charPreview) div.setAttribute('data-preview',_charPreview);
    const _sumBonusCardAtk=(G.hasGoldenDrop?1:0);
    const _sumBonusCardHp=(G.hasGoldenDrop?1:0);
    const _hasSumDescCard=(_sumBonusCardAtk>0||_sumBonusCardHp>0)&&/\d+\/\d+、/.test(card.desc||'');
    if(_hasSumDescCard){
      const _modDescCard=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_sumBonusCardAtk}/${parseInt(h)+_sumBonusCardHp}、`);
      div.setAttribute('data-preview',typeof _unitPreviewText==='function'?_unitPreviewText(card,_modDescCard):_modDescCard);
    }
    const _dirMarks=typeof panelDirectionMarksHtml==='function'?panelDirectionMarksHtml(card):'';
    div.innerHTML=`${shortBadge}${costLine}${_dirMarks}<div class="rew-card-art"></div><div style="font-size:.62rem;color:var(--purple2);margin-bottom:1px">キャラクター</div>${raceBadge}<div class="rew-card-name">${typeof _cardUiName==='function'?_cardUiName(card):card.name}${gradeTag}</div>${_rewCharDesc?`<div class="rew-card-desc">${_rewCharDesc}</div>`:''}<div style="font-size:.5rem;color:var(--text2);margin:1px 0">${[...new Set(card.keywords||[])].filter(Boolean).join('　')}</div>${statsLine}${uniqueBadge}`;
    if(isPendingSale){
      const sale=document.createElement('div');
      sale.className='shop-pending-sale-ui';
      sale.innerHTML=`<div class="shop-board-sell-value">+${Number(card._sellDisplayPrice??_shopCardSellGain(card))}G</div><button type="button" class="shop-pending-sell-btn" data-sfx-silent="1">売却</button>`;
      sale.querySelector('button').onclick=ev=>{ ev.stopPropagation(); _sellPendingShopCard(rewIdx); };
      div.appendChild(sale);
      div.draggable=true;
      div.addEventListener('dragstart',e=>{
        _dragSrc={arr:'rew',idx:rewIdx};
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _setDragZoneClass(_rewardDragZoneForCard(card));
        _createDragGhost(div);
        div.classList.add('dragging');
      });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); _clearDragZoneClass(); _dragSrc=null; });
    }else if(canBuy&&!disabled) div.onclick=onBuy;
    _appendLibraryLoanBadge(div);
    return div;
  }

  _pinPanelTextPosition(div,'reward');
  // 価格バッジはショップかつ価格1以上の場合のみ。無料報酬（cost===0）ではDOM自体を作らない
  const showPriceBadge=!!G._isShop&&cost>0&&!isPendingSale;
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
  if(G._isRewardTown&&!isPendingSale&&!canBuy&&!isTreasure){
    const shortBadgeItem=document.createElement('div');
    shortBadgeItem.className='shop-insufficient-badge';
    shortBadgeItem.style.cssText='position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:999';
    shortBadgeItem.textContent='ゴールド不足';
    div.appendChild(shortBadgeItem);
  }
  if(isPendingSale){
    const sale=document.createElement('div');
    sale.className='shop-pending-sale-ui';
    sale.innerHTML=`<div class="shop-board-sell-value">+${Number(card._sellDisplayPrice??_shopCardSellGain(card))}G</div><button type="button" class="shop-pending-sell-btn" data-sfx-silent="1">売却</button>`;
    sale.querySelector('button').onclick=ev=>{ ev.stopPropagation(); _sellPendingShopCard(rewIdx); };
    div.appendChild(sale);
    // 売却待ちカードはクリックでも魔導板へ戻せるようにする（売却ボタン以外の領域）。
    if(typeof onBuy==='function') div.onclick=onBuy;
  }else if(canBuy&&G._isShop) div.onclick=onBuy;
  _appendLibraryLoanBadge(div);
  if(rewIdx!=null){
    // 売却待ち（魔導板から販売枠へ戻した手持ちカード）は購入対象ではないので canBuy=false になるが、
    // 自分のカードなので魔導板へ戻せる必要がある。ショップの購入不可ロックから除外する。
    const _rewardDragLocked=!!G._pendingPanelPlacement||(_rewFreePickDone&&!!card._isOriginalReward)||(G._isShop&&!canBuy&&!isPendingSale);
    div.draggable=!_rewardDragLocked;
    if(_rewardDragLocked) div.classList.add('reward-drag-locked');
    div.addEventListener('dragstart',e=>{
      if(_rewardDragLocked){
        e.preventDefault();
        return;
      }
      if(_libraryTutorialIsMoveStep()&&!_libraryTutorialAllowsMove(card,null)){ e.preventDefault(); return; }
      _dragSrc={arr:'rew',idx:rewIdx};
      _pinPanelTextPosition(div,'reward');
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
  return div;
}

function _appendLibraryLoanBadge(div){
  if(!div||!G||!G._isLibrary) return;
  div.querySelectorAll('.shop-board-sell-value,.shop-pending-sell-btn,.shop-pending-sale-ui').forEach(el=>el.remove());
  const badge=document.createElement('div');
  badge.className='shop-board-sell-value library-loan-badge';
  badge.textContent='貸出';
  div.appendChild(badge);
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
  _playRewardAcquireSfx('ring_get.wav');
  return true;
}

// ── ボス報酬後の指輪提示 ──────────────────────
// 現在保持するカード（魔導板上のカード）から、色タグ／効果カテゴリタグの出現数を数える。
function _countHeldCardTags(){
  const counts={};
  const bump=t=>{ if(!t) return; counts[t]=(counts[t]||0)+1; };
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
  const boardCharacterSlots=new Set();
  (G.mainBoard||[]).forEach((card,idx)=>{
    if(!card) return;
    if(_isBoardCharacterCard(card)){
      boardCharacterSlots.add(idx);
      const color=cardColor(card);
      if(color) bump(color);
    }else if(card.color){
      // 色タグはキャラクター色を対象にする。強化カードの色は効果タグに混ぜない。
    }
    const text=String(card.desc||card.effect||'');
    if(/攻撃[:：]/.test(text)) bump('攻撃');
    if(/死亡[:：]/.test(text)) bump('死亡');
    if(/負傷[:：]/.test(text)) bump('負傷');
    if(/解放/.test(text)) bump('解放');
    if(/マナ/.test(text)) bump('マナ');
    if(/毒/.test(text)) bump('毒');
    if(/召喚/.test(text)) bump('召喚');
  });
  // 戦闘後にG.mainBoard側のキャラクター色が欠落している場合でも、
  // 実際の味方ユニットが保持しているカラーをタグ判定へ反映する。
  // 既に魔導板の同じスロットを数えている場合は二重計上しない。
  (G.allies||[]).forEach(unit=>{
    if(!unit||unit._isObject||unit._isSoul) return;
    const slot=Number.isInteger(unit._mainBoardSlot)?unit._mainBoardSlot:-1;
    if(slot>=0&&boardCharacterSlots.has(slot)) return;
    const color=normalizeColor(unit.color||String(unit.name||'').match(/^([赤青緑黄紫])/)?.[1]||'');
    if(color) bump(color);
  });
  return counts;
}
function _topHeldCardTag(){
  const counts=_countHeldCardTags();
  let best='',bestN=0;
  Object.keys(counts).forEach(t=>{ if(counts[t]>bestN){ best=t; bestN=counts[t]; } });
  return best;
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
// ボス撃破後、現在保持するカードに含まれる文字が多いタグを参照し、2枚は一致するタグ、
// 1枚はタグなしの指輪を提示する。
function _pickRingOffer(){
  const pool=(typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL))?RING_POOL:[];
  if(!pool.length) return [];
  G._bossRingOfferSeen=Array.isArray(G._bossRingOfferSeen)?G._bossRingOfferSeen:[];
  const seen=new Set(G._bossRingOfferSeen.filter(Boolean));
  const available=pool.filter(r=>r&&!seen.has(r.id||r.name));
  const pickRandom=(arr,n,exclude)=>{
    const src=arr.filter(r=>!exclude.has(r));
    const picked=[];
    while(picked.length<n&&src.length){
      const idx=Math.floor(Math.random()*src.length);
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
// 「編成完了」ボタンから呼ばれる：通常の報酬カード取得後、ボス報酬の指輪提示があれば
// 「栄光の力」画面（同じ#battle-order-row領域を指輪提示に切り替えた画面）へ遷移する。
function _enterRingOfferPhase(){
  G._ringOfferPhase=true;
  _storeRingPhaseStartSnapshot();
  renderRewCards();
  renderMoveSlotsInEnemy();
  renderHandEditor();
  renderFieldEditor();
}
// 栄光の力（指輪提示）画面に入った時点のスナップショット。この画面での「元に戻す」は
// 通常の報酬カード取得画面まで戻さず、この画面の最初の状態にだけ戻す。
function _storeRingPhaseStartSnapshot(){
  G._ringPhaseStartSnapshot={
    mainBoard:clone(G.mainBoard||[]),
    rings:clone(G.rings||[]),
    ringOffer:clone(G._ringOffer||[]),
    ringOfferUnlocked:!!G._ringOfferUnlocked,
    ringOfferResolved:!!G._ringOfferResolved,
    boardDiscardCount:G._boardDiscardCount||0
  };
}
function _resetRingPhaseToStart(){
  if(!G._ringPhaseStartSnapshot) return;
  const s=G._ringPhaseStartSnapshot;
  G.mainBoard=clone(s.mainBoard||[]);
  G.rings=clone(s.rings||[null,null,null,null]);
  G._ringOffer=clone(s.ringOffer||[]);
  G._ringOfferUnlocked=!!s.ringOfferUnlocked;
  G._ringOfferResolved=!!s.ringOfferResolved;
  G._boardDiscardCount=s.boardDiscardCount||0;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  updateHUD();
  renderRewCards();
  renderHandEditor();
  renderFieldEditor();
  renderEnemyHand();
  renderMapInventorySlots();
  renderMoveSlotsInEnemy();
}
// 廃棄ボタンから呼ばれる：魔導板のカードを1枚廃棄し、3枚に達したら指輪提示を解放する。
function _discardBoardCardForRingOffer(idx,card){
  if(!Array.isArray(G._ringOffer)||!G._ringOffer.length||G._ringOfferUnlocked) return;
  const unit=_getPartyBoardUnit();
  if(!unit) return;
  const equips=_normalizeUnitEquipment(unit);
  // 何らかの理由で同一クリックに対しこの関数が二重に呼ばれても、既に廃棄済み（枠が空）なら
  // カウントを二重加算しない（3枚廃棄したはずが4枚必要になる不具合の再発防止）。
  if(!equips[idx]) return;
  _clearStarterPanelMarker(unit,idx,card);
  equips[idx]=null;
  unit.equipment=equips;
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  G._boardDiscardCount=(G._boardDiscardCount||0)+1;
  const ringGetCount=Math.max(1,Math.min(3,G._boardDiscardCount-Number(G._ringPhaseStartSnapshot?.boardDiscardCount||0)));
  _playRewardAcquireSfx(`ring_get${ringGetCount}.wav`);
  log(`${card.name}を廃棄した。（${Math.min(3,G._boardDiscardCount)}/3）`,'sys');
  // 3枚廃棄すると指輪を1つだけ得られるようになる（6枚廃棄しても2つにはならない：1度解放したら再度解放しない）
  if(G._boardDiscardCount>=3&&!G._ringOfferUnlocked){
    G._ringOfferUnlocked=true;
    log('指輪が解放された！ドラッグして指輪置き場へ移してください。','gold');
  }
  renderHandEditor();
  renderFieldEditor();
  renderMapInventorySlots();
  renderRewCards();
  renderMoveSlotsInEnemy();
}

function takeRewCard(i, targetSlot){
  if(G._pendingPanelPlacement) return;
  const card=_rewCards[i]; if(!card) return;
  if(!_libraryTutorialAllowsMove(card,targetSlot)) return;
  // 売却待ち（魔導板から販売枠へ戻した自分のカード）は購入ではなく「戻す」操作なので、
  // 街扱いのゴールド徴収・購入可否判定の対象外にする。
  const isPendingSale=!!card._shopSalePending;
  const isTown=G._isRewardTown&&!isPendingSale;
  const cost=isPendingSale?0:(card._isChar?(card._buyPrice??1):Math.max(0,(card._buyPrice??1)));

  if(card._isChar){
    // 通常報酬フェイズ：キャラ1枚のみ無料取得、以降はロック（ターン開始時の報酬カードのみ対象）
    if(!isTown){
      if(_rewFreePickDone&&card._isOriginalReward)return;
    } else {
      // 街：通常購入
      if(G.gold<cost)return;
    }
  } else {
    // パネル：通常購入（パネル無料モード中はゴールド不足でも取得できる）
    if(!G._freeRewardPanelMode&&G.gold<cost) return;
  }

  if(card._isChar){
    // キャラクター：指定スロット or 最初の空きへ配置
    let emptyIdx;
    if(targetSlot!=null){
      if(G.allies[targetSlot]!=null)return;
      emptyIdx=targetSlot;
    } else {
      emptyIdx=G.allies.indexOf(null);
    }
    if(emptyIdx<0)return;
    // 通常報酬は無料取得、街は通常購入（ターン開始時の報酬カードのみ無料取得権を消費する）
    if(isTown){ G.gold-=(card._buyPrice??1); refreshRewardGoldUi(); } else if(card._isOriginalReward){ _rewFreePickDone=true; }
    const unit=makeUnitFromDef(card, undefined, true); // 購入：効果召喚ボーナスは対象外
    G.allies[emptyIdx]=unit;
    // 提示カードから購入したキャラは後衛で配置
    unit.hate=false;
    unit.hateTurns=0;
    // 戦闘報酬の無料取得では購入音を鳴らさず、街・ショップ購入時だけ再生する。
    if((isTown||G._isShop)&&typeof playSfx==='function') playSfx('buy1',{group:'reward'});
    // 召喚時効果（addAlly と同じ処理を実行）
    if(['grimalkin_summon','imp_summon','rukh_summon','medusa_summon','ogre_summon'].includes(unit.effect)&&typeof applyUnitSummonEffect==='function') applyUnitSummonEffect(unit,null);
    // 指輪の on_summon トリガーを発火（現状 fireTrigger は no-op）
    fireTrigger('on_summon', null);
    _rewCards[i]=null;
    if(typeof syncCurrentVillageFacilityStateFromReward==='function') syncCurrentVillageFacilityStateFromReward();
    refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
    return;
  }

  if(card.type==='ring'){
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    if(!_takeRingCard(card)) return;
    if(isTown&&!G._freeRewardPanelMode){ G.gold-=cost; refreshRewardGoldUi(); }
    if(card._isOriginalReward) _rewFreePickDone=true;
    _rewCards[i]=null;
    if(typeof syncCurrentVillageFacilityStateFromReward==='function') syncCurrentVillageFacilityStateFromReward();
    refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderHandEditor(); renderEnemyHand(); renderGradeUpBtn(); renderMoveSlotsInEnemy();
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
    slots[emptyIdx]=placed;
    if(card._isOriginalReward) _rewFreePickDone=true;
    if(card._isTreasure) _rewFreePickDone=true;
    if(isTown&&!G._freeRewardPanelMode&&!card._isTreasure){ G.gold-=cost; refreshRewardGoldUi(); }
    if(G._isShop) _rewCards[i]=null;
    else _rewCards.splice(i,1);
    if(typeof syncCurrentVillageFacilityStateFromReward==='function') syncCurrentVillageFacilityStateFromReward();
    _playRewardAcquireSfx('item_get.wav');
    refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderHandEditor(); renderEnemyHand(); renderGradeUpBtn();
    return;
  }

  if(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope){
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    const finish=()=>{
      if(isTown&&!G._freeRewardPanelMode){ G.gold-=cost; refreshRewardGoldUi(); }
      if(card._isOriginalReward) _rewFreePickDone=true;
      // ドラッグで魔導板の埋まっているスロットへ直接入れ替えた場合、押し出されたカードが
      // 既にこのスロット（_rewCards[i]）へ入っているため、その場合はここで消してしまわない
      if(_rewCards[i]===card){
        if(G._isShop||G._isLibrary) _rewCards[i]=null;
        else _rewCards.splice(i,1);
      }
      if(typeof syncCurrentVillageFacilityStateFromReward==='function') syncCurrentVillageFacilityStateFromReward();
      refreshRewardGoldUi(); renderRewCards(); renderFieldEditor(); renderHandEditor(); renderEnemyHand(); renderGradeUpBtn();
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
      div.className='slot unit-card'+(unit.hp<=0?' dead-unit inert':'')+(unit.hp>0&&!isPlayerHero&&((unit.hate&&unit.hateTurns>0)||hasGuard)?' is-defender uses-hate-frame':'')+(G._selectedEquipUnitIdx===i?' selected':'');
      if(unit.name==='石像') div.classList.add('no-unit-shadow');
      if(typeof applyUnitVisual==='function') applyUnitVisual(div,unit);
      div.draggable=true;
      const badges=[];
      const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';}; 
      // 標的バッジは非表示（is-front の視覚的シフトで代用）
      if(unit.guardian)badges.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
      if(unit.shield>0)badges.push(`<span class="slot-badge b-shield"${_sd('結界')}>🛡</span>`);
      if(unit.instadead)badges.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
      if(unit.poison>0)badges.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${unit.poison}</span>`);
      if(unit.stealth)badges.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
      if(unit.allyTarget)badges.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
      const badgeBlock=badges.length?`<div class="slot-badges">${badges.join('')}</div>`:'';
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
      const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','毒':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','三方向攻撃':'#e04040','貫通':'#e08040','狩人':'#d08040','狙撃':'#d08040','結束':'#80d0d0','邪眼':'#c060c0','弱体':'#c08040','衝撃':'#c08040','強靭':'#60c090','結界':'#60a0e0','隠密':'#8080c0'};
      const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
      // 弱体X（弱体化Xにより付与された状態）はunit.weaken（数値、加算式）で管理しているため、
      // バッジ表示用の擬似キーワードとして合成する
      const _allKws=[...(unit.weaken>0?[`弱体${unit.weaken}`]:[]),...(typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords(unit.keywords||[]):[...new Set(unit.keywords||[])])].filter(k=>typeof _INTERNAL_ONLY_ENCHANT_NAMES==='undefined'||!_INTERNAL_ONLY_ENCHANT_NAMES.has(k));
      const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
      const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
      const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:2px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
      const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
      let kwBlock='';
      if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
      const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
      const _btmStyle='position:absolute;bottom:22px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0';
      div.style.borderTop=unit.hate&&unit.hateTurns>0?'':'2px solid var(--teal2)';
      const hpClass=(unit.maxHp!=null&&unit.hp<unit.maxHp)?'h hp-damaged':'h';
      const _hpMax=Math.max(1,unit.maxHp||unit.hp||1);
      const _hpPct=Math.max(0,Math.min(100,Math.round((Math.max(0,unit.hp||0)/_hpMax)*100)));
      const hpBar=`<div class="slot-life-bar" title="ライフ ${Math.max(0,unit.hp||0)}/${_hpMax}"><div class="slot-life-fill" style="width:${_hpPct}%"></div></div>`;
      // 報酬フェイズ中のシールド発光は配置順エリアだけに限定する。
      const _showShield=false;
      if(_showShield) div.classList.add('shield-active'); else div.classList.remove('shield-active');
      const shieldLayer=_showShield?'<div class="unit-shield-layer"></div>':'';
      div.innerHTML=`${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}"><div class="slot-name">${unit.name}</div>${raceTag}<div class="slot-stats"><span class="a">${unit.atk}</span><span class="s">/</span><span class="${hpClass}">${unit.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div><div class="unit-hit-layer"></div>`;
      // クリックは装備内容表示のみ。守護はカード効果でのみ付与する。
      div.onclick=e=>{
        e.stopPropagation();
        if(e.detail===0) return; // プログラム的クリックは無視
        const u=G.allies[i]; if(!u) return;
        if(G._selectedEquipUnitIdx!==i) G._selectedEquipCardIdx=null;
        G._selectedEquipUnitIdx=i;
        G._showGlobalPanels=false;
        G._showFacilities=false;
        if(typeof renderMapInventory==='function') renderMapInventory();
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
        const _dragArr=_dragSrc&&(_dragSrc.arr==='inventory'?G.inventory:_dragSrc.arr==='unitEquip'?(_getPartyBoardUnit().equipment||[]):G.spells);
        if(unit.hp>0&&_dragSrc&&(_dragSrc.arr==='spells'||_dragSrc.arr==='inventory'||_dragSrc.arr==='unitEquip')&&_dragArr[_dragSrc.idx]&&_isNonCombatEquipPhase()){
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
        const _dropArr=_dragSrc&&(_dragSrc.arr==='inventory'?G.inventory:_dragSrc.arr==='unitEquip'?(_getPartyBoardUnit().equipment||[]):G.spells);
        if(unit.hp>0&&_dragSrc&&(_dragSrc.arr==='spells'||_dragSrc.arr==='inventory'||_dragSrc.arr==='unitEquip')&&_dropArr[_dragSrc.idx]&&_isNonCombatEquipPhase()){
          if(_dragSrc.arr==='unitEquip') moveEquippedCardToUnit(_dragSrc.idx,_dragSrc.unitIdx,i);
          else equipInventoryCardToUnit(_dragSrc.idx,i,_dragSrc.arr);
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
          if(rc?._isChar){ e.preventDefault(); div.classList.add('drag-over'); }
        } else if(_fieldDragSrc>=0){ e.preventDefault(); div.classList.add('drag-over'); }
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{
        e.preventDefault(); div.classList.remove('drag-over');
        if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc&&rc._isChar){
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

// ── カスタムドラッグゴースト＋合成プレビュー ─────────
// ブラウザネイティブのドラッグゴーストはCSSのz-indexより上のコンポジタレイヤーに描画される。
// setDragImageで透明画像に差し替え、自前のゴーストdivを使うことでプレビューを上に出す。

// setDragImage 用の透明画像（DOMに追加済みのimg要素が最も確実に動作する）
const _transparentDragImg=(()=>{
  const img=document.createElement('img');
  img.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  img.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(img));
  return img;
})();

// ドラッグ中、配置できない置き場を暗くするためのbodyクラス制御
const _DRAG_ZONE_CLASSES=['dragzone-battleorder','dragzone-reward-spell','dragzone-reward-nonspell','dragzone-reward-item','dragzone-mainequip','dragzone-spellslot','dragzone-itemslot','dragzone-ring-slot','dragzone-ring-offer'];
// dragzone-ring-slot/dragzone-ring-offer/dragzone-mainequip中、暗転オーバーレイより上に出したい
// 要素をゾーンごとに列挙する。index.html側には「html body.reward-screen-active #hand-pane:has(...)」
// のようにid2つ分の詳細度を持つ既存ルールが後方に存在し、クラスを重ねる程度のCSS詳細度上げでは
// 勝てない場合があるため、確実に勝つインラインstyle（priority:important）で直接引き上げる。
// 魔導板の枠画像（board.png＝#hand-pane-board-bg）はカードグリッド（#hand-pane）とは別要素なので
// 両方を上げる。ドラッグ中はカード・文字を含む#hand-paneをboard-bgより上にして、
// 枠画像がカードや「魔導板」見出しを覆って暗く見える状態を避ける。
const _DRAG_ZONE_RAISE_TARGETS={
  'dragzone-ring-slot':[['#reward-production-ui',9001]],
  'dragzone-ring-offer':[['#reward-production-ui',9001]],
  // 魔導板・報酬カードのドラッグ中の暗転オーバーレイは廃止したため、
  // それより上へ出すためのz-index引き上げも行わない。
  // 引き上げると魔導板のカードが#hand-paneの装飾レイヤーより前面に出て、
  // 枠線が明るく浮き上がる（＝所持カードが光って見える）。
  'dragzone-mainequip':[],
  'dragzone-reward-spell':[],
  'dragzone-reward-nonspell':[],
  'dragzone-reward-item':[['#reward-production-ui',9001],['#battle-order-section',9001]],
  'dragzone-itemslot':[['#reward-production-ui',9001],['#battle-order-section',9001]],
};
function _applyDragZoneRaise(cls){
  (_DRAG_ZONE_RAISE_TARGETS[cls]||[]).forEach(([sel,z])=>{
    if(G&&G._isForge&&cls==='dragzone-mainequip'&&sel==='#battle-order-section') return;
    const el=document.querySelector(sel);
    if(el) el.style.setProperty('z-index',String(z),'important');
  });
}
function _clearDragZoneRaise(){
  Object.values(_DRAG_ZONE_RAISE_TARGETS).flat().forEach(([sel])=>{
    const el=document.querySelector(sel);
    if(el) el.style.removeProperty('z-index');
  });
}
function _setDragZoneClass(cls){
  document.body.classList.remove(..._DRAG_ZONE_CLASSES);
  _clearDragZoneRaise();
  // dragzone-* はドラッグ中の明暗演出だけでなく、
  //  ・ドラッグ元カードを透明にする（.rew-card.dragging{opacity:0}）
  //  ・魔導板/報酬枠をオーバーレイより上へ出す z-index 引き上げ
  // も担っている。付与をやめるとドラッグ元のカード枠と発光が残るため、必ず付与する。
  if(cls){ document.body.classList.add(cls); _applyDragZoneRaise(cls); }
  _syncRewardProductionUi();
}
function _clearDragZoneClass(){
  document.body.classList.remove(..._DRAG_ZONE_CLASSES);
  _clearDragZoneRaise();
  _syncRewardProductionUi();
}

let _dragGhostDiv=null;
// ドロップ後にDOMが再構築されると dragend が発火しない場合があるため、グローバルで確実に除去
document.addEventListener('dragend', ()=>{ _removeDragGhost(); _clearDragZoneClass(); }, true);
// drop成功時、ドラッグ元要素が再描画で消滅していると dragend が発火しないことがあるため、
// drop側（消滅しない側）でも確実にクリアする
document.addEventListener('drop', ()=>{ _clearDragZoneClass(); }, true);
function _createDragGhost(srcEl){
  _removeDragGhost();
  // #scr-battleはゲーム画面全体を包む唯一のscreen divのため、これをclosest()判定に含めると
  // どのカードをドラッグしても常にtrueになってしまう（出撃枠のドラッグ時に誤ってm_board6.svgへ
  // 切り替わるバグの原因だった）。実際に戦闘中のフィールド上ユニットをドラッグしている場合のみ、
  // または報酬フェイズ以外でのドラッグの場合のみ「戦闘中のドラッグ」として扱う。
  const isBattleDrag = !!(srcEl && (srcEl.closest('#f-ally,#f-enemy') || (typeof G !== 'undefined' && G && G.phase !== 'reward')));
  if(isBattleDrag) document.body.classList.add('dragging-in-battle');
  const d=srcEl.cloneNode(true);
  d.querySelectorAll('button').forEach(b=>b.remove()); // 還魂ボタン等を除去
  // 価格・売却UIは実カード上だけに表示し、ドラッグゴーストには複製しない。
  // ゴーストへ固定pxの価格枠を持ち込むと、ショップカードと魔導板カードで位置・サイズが崩れる。
  d.querySelectorAll('.shop-buy-price,.shop-board-sell-value,.shop-pending-sell-btn').forEach(el=>el.remove());
  d.classList.remove('dragging','drag-over','selectable');
  d.classList.add('drag-ghost');
  const scale=1;
  const rect=srcEl.getBoundingClientRect();
  const W=rect.width||srcEl.offsetWidth||80, H=rect.height||srcEl.offsetHeight||80;
  const visualW=W*scale, visualH=H*scale;
  d.style.cssText=`position:fixed;pointer-events:none;z-index:9998;opacity:1;visibility:hidden;`+
    `width:${W}px;height:${H}px;`+
    `transform:scale(${scale});transform-origin:top left;transition:none;left:0;top:0;`+
    `border-radius:6px;overflow:visible;box-shadow:0 4px 16px rgba(0,0,0,.6)`;
  d.style.setProperty('--hand-card-w',`${W}px`);
  d.style.setProperty('--hand-card-h',`${H}px`);
  d.style.setProperty('--unit-card-w',`${W}px`);
  d.style.setProperty('--unit-card-h',`${H}px`);
  d.style.setProperty('--unit-frame-w',`${W}px`);
  d.style.setProperty('--unit-hate-frame-w',`${W}px`);
  d.style.setProperty('--drag-card-w',`${W}px`);
  d.style.setProperty('--drag-card-h',`${H}px`);
  const frameLayer=srcEl.querySelector('.unit-frame-layer');
  const frameRect=frameLayer?.getBoundingClientRect?.();
  if(frameRect&&frameRect.width&&frameRect.height){
    d.style.setProperty('--unit-frame-w',`${frameRect.width}px`);
    d.style.setProperty('--unit-hate-frame-w',`${frameRect.width}px`);
    const ghostFrame=d.querySelector('.unit-frame-layer');
    if(ghostFrame){
      ghostFrame.style.setProperty('width',`${frameRect.width}px`,'important');
      ghostFrame.style.setProperty('height',`${frameRect.height}px`,'important');
      ghostFrame.style.setProperty('max-width',`${frameRect.width}px`,'important');
      ghostFrame.style.setProperty('max-height',`${frameRect.height}px`,'important');
      ghostFrame.style.setProperty('transform','translate(-50%,-50%)','important');
    }
  }
  const atkEl=srcEl.querySelector('.card-summon-atk');
  const hpEl=srcEl.querySelector('.card-summon-hp');
  const slotAtkEl=srcEl.querySelector('.slot-stats .a');
  const slotHpEl=srcEl.querySelector('.slot-stats .h');
  if(atkEl){
    const r=atkEl.getBoundingClientRect();
    d.style.setProperty('--drag-atk-left',`${r.left-rect.left}px`);
    d.style.setProperty('--drag-atk-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-atk-w',`${r.width}px`);
  }
  if(hpEl){
    const r=hpEl.getBoundingClientRect();
    d.style.setProperty('--drag-hp-right',`${rect.right-r.right}px`);
    d.style.setProperty('--drag-hp-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-hp-w',`${r.width}px`);
  }
  if(slotAtkEl){
    const r=slotAtkEl.getBoundingClientRect();
    d.style.setProperty('--drag-slot-atk-left',`${r.left-rect.left}px`);
    d.style.setProperty('--drag-slot-atk-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-slot-atk-w',`${r.width}px`);
  }
  if(slotHpEl){
    const r=slotHpEl.getBoundingClientRect();
    d.style.setProperty('--drag-slot-hp-right',`${rect.right-r.right}px`);
    d.style.setProperty('--drag-slot-hp-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-slot-hp-w',`${r.width}px`);
  }
  const gameScale=typeof _gameScale==='function'?_gameScale():1;
  const copyStatStyle=(srcSel,dstSel,refSel)=>{
    const src=srcEl.querySelector(srcSel);
    const dst=d.querySelector(dstSel);
    if(!src||!dst) return;
    // refSel未指定時はsrcEl基準。実際のCSS containing blockが別要素（position指定のある
    // .slot-stats等）の場合はrefSelで明示しないと、containing blockの実寸と食い違い
    // bottom指定がtop+heightに上書きされて位置がズレる。
    const refSrc=refSel?src.closest(refSel):srcEl;
    const refDst=refSel?dst.closest(refSel):d;
    if(!refSrc||!refDst) return;
    const s=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const rr=refSrc.getBoundingClientRect();
    const fs=(parseFloat(s.fontSize)||Math.max(24,Math.min(W,H)*0.16))*gameScale;
    dst.style.setProperty('font-size',`${fs}px`,'important');
    dst.style.setProperty('line-height','1','important');
    dst.style.setProperty('left',`${sr.left-rr.left}px`,'important');
    dst.style.setProperty('right','auto','important');
    dst.style.setProperty('top','auto','important');
    dst.style.setProperty('bottom',`${rr.bottom-sr.bottom}px`,'important');
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
    dst.style.setProperty('display','flex','important');
    dst.style.setProperty('align-items','center','important');
    dst.style.setProperty('justify-content','center','important');
    dst.style.setProperty('text-align',s.textAlign||'center','important');
    dst.style.setProperty('transform','none','important');
  };
  copyStatStyle('.card-summon-atk','.card-summon-atk');
  copyStatStyle('.card-summon-hp','.card-summon-hp');
  copyStatStyle('.slot-stats .a','.slot-stats .a','.slot-stats');
  copyStatStyle('.slot-stats .h','.slot-stats .h','.slot-stats');

  // ショップ価格・売却ボタンは、元カードがゲーム全体のscale配下にあるのに対し、
  // ドラッグゴーストはbody直下（scale外）へ移動する。固定pxのCSSをそのまま
  // 引き継ぐと、販売カードでは大きく、魔導板カードでは小さく見えるため、
  // 元カードの実表示矩形をゴースト側へコピーして見た目を統一する。
  const copyShopOverlayStyle=(selector)=>{
    const srcEls=srcEl.querySelectorAll(selector);
    const dstEls=d.querySelectorAll(selector);
    srcEls.forEach((src,i)=>{
      const dst=dstEls[i];
      if(!dst) return;
      const sr=src.getBoundingClientRect();
      const ss=getComputedStyle(src);
      const fs=parseFloat(ss.fontSize)||0;
      const bw=parseFloat(ss.borderTopWidth)||0;
      const br=parseFloat(ss.borderTopLeftRadius)||0;
      const px=parseFloat(ss.paddingLeft)||0;
      const py=parseFloat(ss.paddingTop)||0;
      dst.style.setProperty('left',`${sr.left-rect.left}px`,'important');
      dst.style.setProperty('top',`${sr.top-rect.top}px`,'important');
      dst.style.setProperty('right','auto','important');
      dst.style.setProperty('bottom','auto','important');
      dst.style.setProperty('width',`${sr.width}px`,'important');
      dst.style.setProperty('height',`${sr.height}px`,'important');
      dst.style.setProperty('box-sizing','border-box','important');
      if(fs) dst.style.setProperty('font-size',`${fs*gameScale}px`,'important');
      if(bw) dst.style.setProperty('border-width',`${bw*gameScale}px`,'important');
      if(br) dst.style.setProperty('border-radius',`${br*gameScale}px`,'important');
      if(px||py){
        dst.style.setProperty('padding-left',`${px*gameScale}px`,'important');
        dst.style.setProperty('padding-right',`${(parseFloat(ss.paddingRight)||px)*gameScale}px`,'important');
        dst.style.setProperty('padding-top',`${py*gameScale}px`,'important');
        dst.style.setProperty('padding-bottom',`${(parseFloat(ss.paddingBottom)||py)*gameScale}px`,'important');
      }
      dst.style.setProperty('transform','none','important');
    });
  };
  copyShopOverlayStyle('.shop-board-sell-value');
  copyShopOverlayStyle('.shop-buy-price');
  copyShopOverlayStyle('.shop-pending-sell-btn');
  const statSrc=srcEl.querySelector('.slot-stats .a,.card-summon-atk,.card-summon-hp,.slot-stats');
  const statSize=(parseFloat(getComputedStyle(statSrc||srcEl).fontSize)||0)*gameScale;
  const dragStatSize=statSize||Math.max(28,Math.min(W,H)*0.18);
  d.style.setProperty('--drag-stat-size',`${dragStatSize}px`,'important');
  d.querySelectorAll('.slot-stats,.slot-stats .a,.slot-stats .h,.card-summon-atk,.card-summon-hp')
    .forEach(el=>{
      if(!el.style.getPropertyValue('font-size')) el.style.setProperty('font-size',`${dragStatSize}px`,'important');
      el.style.setProperty('line-height','1','important');
      el.style.setProperty('transform','none','important');
    });
  const cs=getComputedStyle(srcEl);
  ['--card-frame','--card-art','--card-art-size','--card-art-position','--unit-frame','--unit-art','--unit-art-size','--unit-art-position'].forEach(k=>{
    const v=cs.getPropertyValue(k);
    if(v) d.style.setProperty(k,v);
  });
  // マナオーブ（固定px画像）・方向矢印（固定pxフォント）もスケール外に置かれるため個別に補正する
  const srcOrbImgs=srcEl.querySelectorAll('.mana-cost-orbs img');
  const dstOrbImgs=d.querySelectorAll('.mana-cost-orbs img');
  srcOrbImgs.forEach((src,i)=>{
    const dstImg=dstOrbImgs[i];
    if(!dstImg) return;
    const sr=src.getBoundingClientRect();
    dstImg.style.setProperty('width',`${sr.width}px`,'important');
    dstImg.style.setProperty('height',`${sr.height}px`,'important');
  });
  // scale配下の元カードとbody直下のゴーストで、アイコン群と数字の実表示矩形を一致させる。
  const srcCostWrap=srcEl.querySelector('.card-activation-costs');
  const dstCostWrap=d.querySelector('.card-activation-costs');
  if(srcCostWrap&&dstCostWrap){
    const wr=srcCostWrap.getBoundingClientRect();
    dstCostWrap.style.setProperty('left',`${wr.left-rect.left}px`,'important');
    dstCostWrap.style.setProperty('top',`${wr.top-rect.top}px`,'important');
    dstCostWrap.style.setProperty('right','auto','important');
    dstCostWrap.style.setProperty('bottom','auto','important');
    dstCostWrap.style.setProperty('width',`${wr.width}px`,'important');
    dstCostWrap.style.setProperty('height',`${wr.height}px`,'important');
    dstCostWrap.style.setProperty('display','block','important');
    dstCostWrap.style.setProperty('grid-template','none','important');
    dstCostWrap.style.setProperty('grid-auto-flow','unset','important');
    dstCostWrap.style.setProperty('gap','0','important');
    dstCostWrap.style.setProperty('transform','none','important');
    const srcEntries=srcCostWrap.querySelectorAll('.activation-cost-entry');
    const dstEntries=dstCostWrap.querySelectorAll('.activation-cost-entry');
    srcEntries.forEach((src,i)=>{
      const dst=dstEntries[i]; if(!dst) return;
      const er=src.getBoundingClientRect();
      dst.style.setProperty('position','absolute','important');
      dst.style.setProperty('left',`${er.left-wr.left}px`,'important');
      dst.style.setProperty('top',`${er.top-wr.top}px`,'important');
      dst.style.setProperty('width',`${er.width}px`,'important');
      dst.style.setProperty('height',`${er.height}px`,'important');
      dst.style.setProperty('display','block','important');
      dst.style.setProperty('transform','none','important');
      const srcImg=src.querySelector('img'),dstImg=dst.querySelector('img');
      if(srcImg&&dstImg){
        const ir=srcImg.getBoundingClientRect();
        dstImg.style.setProperty('width',`${ir.width}px`,'important');
        dstImg.style.setProperty('height',`${ir.height}px`,'important');
      }
      const sb=src.querySelector('b'), db=dst.querySelector('b');
      if(sb&&db){
        db.style.setProperty('font-size',`${Math.max(9,er.height*.48)}px`,'important');
        db.style.setProperty('line-height','1','important');
        db.style.setProperty('inset','0','important');
        db.style.setProperty('display','flex','important');
        db.style.setProperty('align-items','center','important');
        db.style.setProperty('justify-content','center','important');
        db.style.setProperty('transform','none','important');
      }
    });
  }
  // body直下へ複製すると、合体★の固定px指定だけがゲームscaleから外れて巨大化する。
  const srcMergeStar=srcEl.querySelector('.triple-merge-star');
  const dstMergeStar=d.querySelector('.triple-merge-star');
  if(srcMergeStar&&dstMergeStar){
    const sr=srcMergeStar.getBoundingClientRect();
    const ss=getComputedStyle(srcMergeStar);
    dstMergeStar.style.setProperty('left',`${sr.left-rect.left}px`,'important');
    dstMergeStar.style.setProperty('top',`${sr.top-rect.top}px`,'important');
    dstMergeStar.style.setProperty('right','auto','important');
    dstMergeStar.style.setProperty('bottom','auto','important');
    dstMergeStar.style.setProperty('width',`${sr.width}px`,'important');
    dstMergeStar.style.setProperty('height',`${sr.height}px`,'important');
    dstMergeStar.style.setProperty('font-size',`${(parseFloat(ss.fontSize)||0)*gameScale}px`,'important');
    dstMergeStar.style.setProperty('line-height','1','important');
    dstMergeStar.style.setProperty('animation','none','important');
    dstMergeStar.style.setProperty('transform','none','important');
  }
  const srcSeal=srcEl.querySelector('.seal-cost-badge');
  const dstSeal=d.querySelector('.seal-cost-badge');
  if(srcSeal&&dstSeal){
    const sr=srcSeal.getBoundingClientRect();
    const rr=srcEl.getBoundingClientRect();
    const ss=getComputedStyle(srcSeal);
    dstSeal.style.setProperty('left',`${sr.left-rr.left}px`,'important');
    dstSeal.style.setProperty('top',`${sr.top-rr.top}px`,'important');
    dstSeal.style.setProperty('right','auto','important');
    dstSeal.style.setProperty('bottom','auto','important');
    dstSeal.style.setProperty('width',`${sr.width}px`,'important');
    dstSeal.style.setProperty('height',`${sr.height}px`,'important');
    dstSeal.style.setProperty('font-size',ss.fontSize,'important');
    dstSeal.style.setProperty('transform','none','important');
    const srcSealImgs=srcSeal.querySelectorAll('img');
    const dstSealImgs=dstSeal.querySelectorAll('img');
    srcSealImgs.forEach((srcImg,i)=>{
      const dstImg=dstSealImgs[i];
      if(!dstImg) return;
      const ir=srcImg.getBoundingClientRect();
      dstImg.style.setProperty('width',`${ir.width}px`,'important');
      dstImg.style.setProperty('height',`${ir.height}px`,'important');
    });
  }
  // 矢印は方向ごとに向きの異なる専用画像を使うため、ゴースト側では回転をかけず位置・サイズのみ合わせる
  const srcDirs=srcEl.querySelectorAll('.panel-dir');
  const dstDirs=d.querySelectorAll('.panel-dir');
  srcDirs.forEach((src,i)=>{
    const dstDir=dstDirs[i];
    if(!dstDir) return;
    const ds=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const fs=(parseFloat(ds.fontSize)||0)*gameScale;
    dstDir.style.setProperty('font-size',`${fs}px`,'important');
    dstDir.style.setProperty('line-height','1','important');
    dstDir.style.setProperty('left',`${sr.left-rect.left}px`,'important');
    dstDir.style.setProperty('top',`${sr.top-rect.top}px`,'important');
    dstDir.style.setProperty('right','auto','important');
    dstDir.style.setProperty('bottom','auto','important');
    dstDir.style.setProperty('width',`${sr.width}px`,'important');
    dstDir.style.setProperty('height',`${sr.height}px`,'important');
    dstDir.style.setProperty('transform','none','important');
  });
  _pinPanelTextPosition(d,srcEl.closest('#reward-cards-section,#rw-cards')?'reward':(srcEl.closest('#hand-slots.unit-equip-slots')?'unitEquip':'normal'));
  d._ghostW=visualW; d._ghostH=visualH;
  document.body.appendChild(d);
  _dragGhostDiv=d;
}
function _moveDragGhost(clientX,clientY){
  if(!_dragGhostDiv) return;
  const W=_dragGhostDiv._ghostW||_dragGhostDiv.offsetWidth||80;
  const H=_dragGhostDiv._ghostH||_dragGhostDiv.offsetHeight||80;
  _dragGhostDiv.style.left=(clientX-W/2)+'px';
  _dragGhostDiv.style.top=(clientY-H/2)+'px';
  _dragGhostDiv.style.setProperty('visibility','visible','important');
}
function _removeDragGhost(){
  document.body.classList.remove('dragging-in-battle');
  if(_dragGhostDiv){ _dragGhostDiv.remove(); _dragGhostDiv=null; }
  setTimeout(()=>{
    try{ document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true})); }catch(e){}
  },0);
}
function _hideDragSourceParts(el){
  if(!el) return;
  el.classList.add('drag-source-parts-hidden');
  Array.from(el.children||[]).forEach(ch=>{
    ch.dataset.dragSrcPrevOpacity=ch.style.getPropertyValue('opacity')||'';
    ch.dataset.dragSrcPrevOpacityPriority=ch.style.getPropertyPriority('opacity')||'';
    ch.style.setProperty('opacity','0','important');
  });
}
function _restoreDragSourceParts(el){
  if(!el) return;
  el.classList.remove('drag-source-parts-hidden');
  Array.from(el.children||[]).forEach(ch=>{
    const prev=ch.dataset.dragSrcPrevOpacity||'';
    const prio=ch.dataset.dragSrcPrevOpacityPriority||'';
    if(prev) ch.style.setProperty('opacity',prev,prio);
    else ch.style.removeProperty('opacity');
    delete ch.dataset.dragSrcPrevOpacity;
    delete ch.dataset.dragSrcPrevOpacityPriority;
  });
}

// ── 手札エディタ（アイテム）──────────────────────

let _dragSrc=null;
function isEquipmentCard(card){
  return !!(card&&(card.equip||card.kind==='equipment'||card.type==='ring'||card.type==='panel'||card.kind==='panel'||card.panelScope==='unit'));
}
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
// battle系のG.alliesには入れず、.equipmentは常にG.mainBoardそのものを参照する（書き込みが直接反映される）。
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
  G._partyBoardUnit.equipment=G.mainBoard;
  return G._partyBoardUnit;
}
function _normalizeUnitEquipment(unit){
  const board=_getPartyBoardUnit();
  _syncUnitPanelEffectsAfterMove(board);
  return board.equipment;
}
function _getUnitEquipSlots(unit){
  return UNIT_EQUIP_SLOTS;
}
function _equipSlotDef(idx,unit){
  return UNIT_EQUIP_SLOTS[idx]||{label:'',kind:'any'};
}
function _canCardUseEquipSlot(card,idx,unit){
  return !!card&&idx>=0&&idx<MAIN_BOARD_SIZE;
}
function _findEquipSlotForCard(unit,card,arr){
  const equips=arr||_getPartyBoardUnit().equipment||[];
  for(let i=0;i<MAIN_BOARD_SIZE;i++){
    if(!equips[i]&&_canCardUseEquipSlot(card,i,unit)) return i;
  }
  return -1;
}
function getUnitEquipLimit(unit){
  return MAIN_BOARD_SIZE;
}
function _panelStatBonus(card){
  if(!card) return {atk:0,hp:0};
  return {atk:Number(card.atkBonus||0),hp:Number(card.hpBonus||0)};
}
function _unitHpBonusTotalForEquips(unit,equips){
  const staticHp=(equips||[]).reduce((sum,c)=>sum+_panelStatBonus(c).hp,0);
  let adjacentHp=0;
  if(typeof _collectAdjacentEnhancements==='function'){
    adjacentHp=Number((_collectAdjacentEnhancements(Object.assign({},unit,{equipment:equips}),0)||{}).hp||0);
  }else{
    adjacentHp=Number((unit&&unit._adjacentPanelEnhancements&&unit._adjacentPanelEnhancements.hp)||0);
  }
  return staticHp+adjacentHp;
}
// 旧「所有者ユニット」モデル時代、強化パネルのHP減少ボーナスでオーナー本体のHPが0以下に
// なる配置を防いでいたガード。現行仕様ではメイン置き場は単一の共有ボード（_getPartyBoardUnit()、
// hp:1の仮の値）であり、このHPは実際のゲームプレイと無関係なため、判定基準として意味を持たない。
// このガードが残っていると「魔導回路β」等の-1/-1パネルを配置しようとするだけで
// （unit.hp=1 + (-1)=0 <= 0 と誤判定され）常に拒否されてしまうため無効化する。
function _canApplyUnitEquipChange(unit,nextEquips){
  return true;
}
function syncUnitPanelStatBonuses(unit){
  if(!unit) return;
  const prev=unit._panelStatBonusApplied||{atk:0,hp:0};
  const total=(unit.equipment||[]).reduce((s,c)=>{
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
function _panelCharacterPreviewStats(unit,idx,card){
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
  // HPを減少させる強化の合計がベースを上回っても、表示上のHPが負にならないようにする
  base.hp=Math.max(0,base.hp);
  return base;
}
function _panelIdxAtGridPos(pos){
  if(!pos||typeof _panelGridPos!=='function') return -1;
  for(let i=0;i<MAIN_BOARD_SIZE;i++){
    const p=_panelGridPos(i);
    if(p&&p.x===pos.x&&p.y===pos.y) return i;
  }
  return -1;
}
function _mergedPanelCard(a,b){
  if(!a||!b||typeof PANEL_POOL==='undefined'||typeof makePanel!=='function') return null;
  // 荷物は通常の2枚合体不可。魔鏡も3枚目の代替素材としてのみ扱う。
  if(_isLuggagePanel(a)||_isLuggagePanel(b)) return null;
  const names=[String(a.name||'').trim(),String(b.name||'').trim()].sort().join('\n');
  const def=PANEL_POOL.find(p=>{
    if(!Array.isArray(p.mergeFrom)||p.mergeFrom.length!==2) return false;
    return p.mergeFrom.map(v=>String(v||'').trim()).sort().join('\n')===names;
  });
  return def?makePanel(def.id):null;
}
function _isMagicMirrorPanel(card){ return String(card&&card.name||'').trim()==='魔鏡'; }
function _isLuggagePanel(card){
  return !!card&&Array.isArray(card.keywords)&&card.keywords.some(k=>String(k||'').trim()==='荷物');
}
function _panelMergeKey(card){ return String(card&&(card.name||card.id)||'').trim(); }
function _ownedMergeCards(){
  const out=[];
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  if(board&&Array.isArray(board.equipment)) out.push(...board.equipment.filter(Boolean));
  if(G&&Array.isArray(G.allies)) out.push(...G.allies.filter(c=>c&&!c._isSoul&&!c._isObject));
  return out;
}
function _rewardMergeCandidate(rewIdx,card){
  if(!card||!G) return false;
  if(_isLuggagePanel(card)&&!_isMagicMirrorPanel(card)) return false;
  // ショップでは、魔導板上のカード／所持キャラクターも合体素材として数える。
  if(G._isShop||G._isRewardTown){
    const owned=_ownedMergeCards();
    const key=_panelMergeKey(card);
    if(!key) return false;
    if(card._isChar){
      return owned.filter(c=>c._isChar&&_panelMergeKey(c)===key).length>=2;
    }
    const same=owned.filter(c=>!_isMagicMirrorPanel(c)&&!_isLuggagePanel(c)&&_panelMergeKey(c)===key).length;
    const mirrors=owned.filter(c=>_isMagicMirrorPanel(c)).length;
    return _isMagicMirrorPanel(card)?same>=2:(same>=2||same>=1&&mirrors>0);
  }
  if(G.phase!=='reward') return false;
  const cards=Array.isArray(_rewCards)?_rewCards.filter(Boolean):[];
  const usable=cards.filter(c=>!c._tripleMerged&&!_isLuggagePanel(c));
  const mirrors=cards.filter(c=>!c._tripleMerged&&_isMagicMirrorPanel(c));
  if(_isMagicMirrorPanel(card)){
    return usable.some(base=>{
      const key=_panelMergeKey(base);
      return key&&usable.filter(c=>!_isMagicMirrorPanel(c)&&_panelMergeKey(c)===key).length>=2;
    });
  }
  const key=_panelMergeKey(card);
  if(!key) return false;
  const same=usable.filter(c=>!_isMagicMirrorPanel(c)&&_panelMergeKey(c)===key).length;
  return same>=3||(same>=2&&mirrors.length>0);
}
function _doubleTripleKeywordValue(value){
  return String(value||'').replace(/(\d+)$/,(m)=>String(Number(m)*2));
}
function _doubleTripleStoredEffects(card){
  if(!card) return;
  [
    'manaOnAttack','manaOnInjury','manaOnDeath','goldOnBattleEnd','goldOnDeath',
    'weakenOnHit','poisonOnHit','adjacentAtkBonus','adjacentHpBonus'
  ].forEach(key=>{
    if(card[key]!=null&&Number.isFinite(Number(card[key]))) card[key]=Number(card[key])*2;
  });
  if(card.desc&&typeof _doubleTripleMergedDesc==='function'){
    card.desc=_doubleTripleMergedDesc(card.desc);
    card._tripleDescApplied=true;
  }
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
  pin('.triple-merge-star');
  pin('.card-activation-costs');
  pin('.card-activation-costs .activation-cost-entry','.card-activation-costs');
}
function _tryTripleMergeOnBoard(unit,placedIdx){
  if(!unit||!Array.isArray(unit.equipment)) return null;
  const placed=unit.equipment[placedIdx];
  if(!placed||placed._tripleMerged) return null;
  const available=unit.equipment.map((card,idx)=>({card,idx}))
    .filter(x=>x.card&&!x.card._tripleMerged);
  const baseCards=available.filter(x=>!_isLuggagePanel(x.card));
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
  const picked=candidates[Math.floor(Math.random()*candidates.length)];
  const targetCandidates=picked.filter(idx=>!_isMagicMirrorPanel(unit.equipment[idx]));
  const targetIdx=targetCandidates[Math.floor(Math.random()*targetCandidates.length)];
  const sources=picked.map(idx=>{
    const el=document.querySelector(`#hand-slots.unit-equip-slots > :nth-child(${idx+1})`);
    if(!el) return null;
    const rect=el.getBoundingClientRect();
    const cloneEl=el.cloneNode(true);
    cloneEl.querySelectorAll('button').forEach(btn=>btn.remove());
    // 盤面上のカードは「つながっている方向の矢印」を消し、代わりに#hand-slots側へ
    // .panel-unite-linkを描いている（_renderPanelUniteMarkers）。ゴーストはカード要素だけを
    // body直下へ複製するためunite画像が付いてこず、矢印が欠けたカードに見えてしまう。
    // 単独のカードとして本来の向きを全て表示し直す。
    _restorePanelDirectionDom(cloneEl,unit.equipment[idx]);
    const baseWidth=el.offsetWidth||260, baseHeight=el.offsetHeight||395;
    _freezeTripleCloneOverlayGeometry(el,cloneEl,rect,baseWidth,baseHeight);
    return {idx,rect,cloneEl,baseWidth,baseHeight};
  }).filter(Boolean);
  const target=unit.equipment[targetIdx];
  const def=(typeof PANEL_POOL!=='undefined'&&PANEL_POOL.find(p=>(target.id&&p.id===target.id)||p.name===target.name))||target;
  const baseName=String(target.name||'').replace(/\+$/,'');
  // アイテム等で個別に付与されたキーワードも、3枚すべてから合体後へ引き継ぐ。
  // （従来はtarget自身のキーワードだけを数値倍しており、他2枚分が消えていた。）
  let mergedKeywords=[];
  picked.forEach(idx=>{
    const source=unit.equipment[idx];
    const sourceKeywords=_isMagicMirrorPanel(source)?(source.keywords||[]).filter(k=>String(k||'').trim()!=='荷物'):(source&&source.keywords);
    mergedKeywords=typeof _mergeCardKeywordsForBond==='function'
      ?_mergeCardKeywordsForBond(mergedKeywords,sourceKeywords)
      :mergedKeywords.concat(Array.isArray(sourceKeywords)?sourceKeywords:[]);
  });
  target.keywords=mergedKeywords;
  target._tripleMerged=true;
  target._tripleBaseName=baseName;
  target._displayName=`${baseName}+`;
  target.rarity=Math.max(1,Number(target.rarity)||1)+1;
  target.directions=['up','right','down','left'];
  target.directionCount=4;
  // 3枚合体は「同じ効果を2回」ではなく「1回の効果量を2倍」にする。
  // 絆の巻物が使う_effectRepeatBonusとは別仕様なので共有しない。
  _doubleTripleStoredEffects(target);
  if(target.characterDesc){
    let mergedCharacterDesc=typeof _doubleTripleMergedDesc==='function'
      ?_doubleTripleMergedDesc(target.characterDesc)
      :String(target.characterDesc).replace(/\d+/g,n=>String(Number(n)*2));
    mergedCharacterDesc=mergedCharacterDesc.replaceAll(`「${baseName}」`,`「${baseName}+」`);
    target.characterDesc=mergedCharacterDesc;
  }
  if(String(target.category||'')==='キャラクター'){
    const baseAtk=Number(def.power??def.atk??0)||0;
    const baseHp=Number(def.life??def.hp??1)||1;
    const atkBuff=(Number(target.power??target.atk??baseAtk)||0)-baseAtk;
    const hpBuff=(Number(target.life??target.hp??baseHp)||0)-baseHp;
    target._permBasePower=baseAtk*2;
    target._permBaseLife=baseHp*2;
    target.power=baseAtk*2+atkBuff;
    target.life=Math.max(1,baseHp*2+hpBuff);
    if(target.atk!=null) target.atk=target.power;
    if(target.hp!=null) target.hp=target.life;
  }
  const isCharacter=String(target.category||'')==='キャラクター';
  if(Array.isArray(target.keywords)) target.keywords=target.keywords.map(_doubleTripleKeywordValue);
  if(Array.isArray(target.adjacentKeywords)) target.adjacentKeywords=target.adjacentKeywords.map(_doubleTripleKeywordValue);
  picked.forEach(idx=>{
    if(idx===targetIdx) return;
    _clearStarterPanelMarker(unit,idx,unit.equipment[idx]);
    unit.equipment[idx]=null;
  });
  return {targetIdx,picked,sources};
}
function _playTripleMergeAnimation(info){
  if(!info) return;
  requestAnimationFrame(()=>{
    const target=document.querySelector(`#hand-slots.unit-equip-slots > :nth-child(${info.targetIdx+1})`);
    if(!target) return;
    const tr=target.getBoundingClientRect();
    target.classList.add('triple-merge-result-hidden');
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
        if(!unionPlayed){ if(typeof playFileSfx==='function') playFileSfx('assets/sfx/union.wav');
          else try{ const se=new Audio('assets/sfx/union.wav'); se.volume=sfxFallbackVolume(.8); void se.play(); }catch(_e){} }
        ordered.filter(g=>g!==center).forEach(g=>g.ghost.remove());
        if(center) center.ghost.classList.add('triple-merge-white-flash');
        _flashConnectedBoardCards(info.targetIdx);
        setTimeout(()=>{
          target.classList.remove('triple-merge-result-hidden');
          dim.classList.remove('visible');
          ghosts.forEach(g=>g.ghost.remove());
          setTimeout(()=>dim.remove(),450);
          // 演出完了時点で盤面を再描画し、合体後の4方向矢印・接続線を確実に反映する
          // （念のための保険。配置直後の描画で既に反映済みのはずだが、演出中に挟まる
          // 他の再描画処理と競合して古い表示が残るケースへの対策）。
          if(typeof renderHandEditor==='function') renderHandEditor();
          if(typeof renderFieldEditor==='function') renderFieldEditor();
        },760);
      }
    },340);
  });
}
// メイン置き場（配置順）は戦闘フェイズ（'player'＝プレイヤー操作中／'enemy'＝自動解決中）を通して変更不可。
// 報酬フェイズ（戦闘間・初回開始時）のみ編集可能。
function _isNonCombatEquipPhase(){
  return G.phase==='reward';
}
if(!window._equipSelectionClearBound){
  window._equipSelectionClearBound=true;
  document.addEventListener('contextmenu',e=>{
    // ゲームオーバー画面とゲームクリア画面は同じ#gameover-board-gridを使う。
    const gameoverBoard=!!(e.target&&e.target.closest&&e.target.closest('#gameover-board-grid'));
    // 図書館の「魔導板の使い方」中は、右クリックによるカード非表示も無効にする。
    if(G&&G._libraryTutorialActive){ e.preventDefault(); return; }
    if(G.phase==='reward'||((G.phase==='gameover'||G.phase==='clear')&&gameoverBoard)){
      e.preventDefault();
      const enabled=document.body.classList.toggle('right-card-peek');
      if(enabled){
        _dragSrc=null;
        window._allySlotDragSrc=null;
        if(typeof _removeDragGhost==='function') _removeDragGhost();
        if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
        document.querySelectorAll('.dragging,.drag-over').forEach(el=>el.classList.remove('dragging','drag-over'));
      }
      // 右クリックで切り替えたときもボタンのラベルを合わせる（同じ機能なので表示がずれてはいけない）
      if(typeof _syncBoardCardVisibilityToggle==='function') _syncBoardCardVisibilityToggle();
    }
    if(G.phase==='reward'&&G._pendingPanelPlacement){
      cancelPendingPanelPlacement();
    }
  });
  // ゲームオーバー画面・クリア画面では、どこを左クリックしてもカードの表示／非表示を切り替える。
  // ボタンやリンクの上は本来の操作を優先する（「カード非表示」ボタン自身の二重切り替えも防ぐ）。
  document.addEventListener('click',e=>{
    if(!G||(G.phase!=='gameover'&&G.phase!=='clear')) return;
    if(e.button!==undefined&&e.button!==0) return;
    if(e.target&&e.target.closest&&e.target.closest('button,a,input,select,textarea,label,[role="button"]')) return;
    toggleBoardCardVisibility();
  });
  document.addEventListener('click',e=>{
    if(G.phase==='enemy') return;
    if(G.phase==='reward'&&G._pendingPanelPlacement) return;
    const t=e.target;
    if(!document.body.contains(t)) return;
    if(t&&t.closest&&t.closest('#hand-slots .card,#hand-slots .card-empty,#map-inventory-panel,.unit-card,.card,.card-empty')) return;
    if(t&&t.closest&&t.closest('button,.map-node,#world-map-panel,#rw-cards,#reward-move-btns')) return;
    if(G.phase==='reward'){
      G._selectedEquipCardIdx=null;
      return;
    }
    G._showGlobalPanels=true;
    G._selectedEquipUnitIdx=-1;
    G._selectedEquipCardIdx=null;
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
    const slots=clonePane.querySelector('.unit-equip-slots');
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
  try{
    renderHeRow('hand-slots',G.mainBoard,0,G.mainBoard.length,'unitEquip');
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
      const cloneSlots=clonePane.querySelector('.unit-equip-slots');
      if(!cloneSlots||!document.body.classList.contains('gameover-active')) return;
      try{
        if(typeof _renderPanelUniteMarkers==='function') _renderPanelUniteMarkers(cloneSlots,_getPartyBoardUnit());
      }catch(e){ console.error('[renderGameOverBoard:unite]',e); }
      _alignGameOverVisibilityBtn(clonePane);
    });
  }finally{
    G.phase=oldPhase;
  }
}
function equipInventoryCardToUnit(srcIdx, unitIdx, srcArrName='inventory'){
  if(!_isNonCombatEquipPhase()) return false;
  const srcArr=G.inventory;
  const card=srcArr[srcIdx];
  const unit=_getPartyBoardUnit();
  if(!card||!unit||unit.hp<=0) return false;
  const equips=_normalizeUnitEquipment(unit);
  const slotIdx=_findEquipSlotForCard(unit,card,equips);
  if(slotIdx<0) return false;
  equips[slotIdx]=card;
  _syncUnitPanelEffectsAfterMove(unit);
  srcArr[srcIdx]=null;
  G._selectedEquipUnitIdx=unitIdx;
  if(srcArrName==='inventory') G.inventoryOpen=true;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  renderHandEditor();
  renderFieldEditor();
  renderMapInventorySlots();
  return true;
}
function moveEquippedCardToUnit(equipIdx, srcUnitIdx, destUnitIdx){
  if(!_isNonCombatEquipPhase()) return false;
  if(srcUnitIdx===destUnitIdx) return false;
  const srcUnit=G.allies[srcUnitIdx];
  const destUnit=G.allies[destUnitIdx];
  if(!srcUnit||!destUnit||!srcUnit.equipment||!srcUnit.equipment[equipIdx]||destUnit.hp<=0) return false;
  const card=srcUnit.equipment[equipIdx];
  const destEquips=_normalizeUnitEquipment(destUnit);
  const slotIdx=_findEquipSlotForCard(destUnit,card,destEquips);
  if(slotIdx<0) return false;
  srcUnit.equipment[equipIdx]=null;
  destEquips[slotIdx]=card;
  _syncUnitPanelEffectsAfterMove(srcUnit);
  _syncUnitPanelEffectsAfterMove(destUnit);
  G._selectedEquipUnitIdx=srcUnitIdx;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  renderHandEditor();
  renderFieldEditor();
  return true;
}
// ── スペル置き場（1×3・戦闘をまたいで保持。スペルカードのみ⇔報酬エリアの間で移動可）──
function renderSpellSlotZone(el){
  if(!el) return;
  const zone=document.createElement('div');
  zone.className=`spell-slot-zone${G._isTreasureMapReward?' item-slot-zone':''}`;
  zone.addEventListener('dragover',e=>{
    const card=_dragSrc&&_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:null;
    if(card&&_isSpellCard(card)){ e.preventDefault(); zone.classList.add('drag-over'); }
  });
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',e=>{
    e.preventDefault(); zone.classList.remove('drag-over');
    if(!_dragSrc||_dragSrc.arr!=='rew') return;
    const idx=_dragSrc.idx; _dragSrc=null;
    const card=_rewCards[idx];
    if(!card||!_isSpellCard(card)) return;
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    G.spellSlots=G.spellSlots||new Array(3).fill(null);
    const emptyIdx=G.spellSlots.findIndex(c=>!c);
    if(emptyIdx<0) return;
    const placed=clone(card);
    if(card._isOriginalReward){
      placed._rewardReturnCard=clone(card);
      placed._rewardReturnIdx=idx;
      placed._rewardReturnPhaseId=_rewPhaseId;
    }
    G.spellSlots[emptyIdx]=placed;
    _playRewardAcquireSfx('item_get.wav');
    if(card._isOriginalReward) _rewFreePickDone=true;
    _rewCards.splice(idx,1);
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
    renderRewCards();
    renderHandEditor();
    renderMoveSlotsInEnemy();
    updateHUD();
  });
  G.spellSlots=G.spellSlots||new Array(3).fill(null);
  for(let idx=0;idx<3;idx++){
    const card=G.spellSlots[idx];
    if(card){
      const div=document.createElement('div');
      div.className='card spell spell-slot-card';
      if(typeof applyCardVisual==='function') applyCardVisual(div,card);
      const manaHtml=typeof cardManaCostHtml==='function'?cardManaCostHtml(card):'';
      div.innerHTML=`${manaHtml}<div class="card-art"></div>`;
      const preview=[typeof _cardUiName==='function'?_cardUiName(card):card.name,typeof _previewRarityLine==='function'?_previewRarityLine(card):'',card.desc||''].filter(Boolean).join('\n');
      if(preview) div.setAttribute('data-preview',preview);
      if(card._firedThisBattle&&(G.phase==='player'||G.phase==='enemy')){
        div.classList.add('spell-fired');
      }
      if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
      div.draggable=true;
      div.addEventListener('dragstart',e=>{
        _dragSrc={arr:'spellSlots',idx};
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _setDragZoneClass('dragzone-spellslot');
        _createDragGhost(div);
        div.classList.add('dragging');
      });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; });
      // スペル置き場内の入れ替え（他のスペルとのスワップのみ。空欄への移動は対象外）
      div.addEventListener('dragover',e=>{
        if(_dragSrc&&_dragSrc.arr==='spellSlots'&&_dragSrc.idx!==idx){ e.preventDefault(); div.classList.add('drag-over'); }
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{
        e.preventDefault(); div.classList.remove('drag-over');
        if(!_dragSrc||_dragSrc.arr!=='spellSlots'||_dragSrc.idx===idx) return;
        const srcIdx=_dragSrc.idx; _dragSrc=null;
        const tmp=G.spellSlots[idx];
        G.spellSlots[idx]=G.spellSlots[srcIdx];
        G.spellSlots[srcIdx]=tmp;
        _playRewardAcquireSfx('item_get.wav');
        renderHandEditor();
      });
      zone.appendChild(div);
    }else{
      const ph=document.createElement('div');
      ph.className='card-empty spell spell-slot-empty';
      ph.addEventListener('dragover',e=>{
        if(_dragSrc&&_dragSrc.arr==='spellSlots'&&_dragSrc.idx!==idx){ e.preventDefault(); e.stopPropagation(); ph.classList.add('drag-over'); return; }
        const card=_dragSrc&&_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:null;
        if(card&&_isSpellCard(card)){ e.preventDefault(); e.stopPropagation(); ph.classList.add('drag-over'); }
      });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{
        ph.classList.remove('drag-over');
        zone.classList.remove('drag-over');
        // スペル置き場内の入れ替え：ドラッグ元スロットをこの空欄へ移動する
        if(_dragSrc&&_dragSrc.arr==='spellSlots'&&_dragSrc.idx!==idx){
          e.preventDefault(); e.stopPropagation();
          const srcIdx=_dragSrc.idx; _dragSrc=null;
          G.spellSlots[idx]=G.spellSlots[srcIdx];
          G.spellSlots[srcIdx]=null;
          _playRewardAcquireSfx('item_get.wav');
          renderHandEditor();
          return;
        }
        // 報酬エリアからスペルカードをこの空欄へ配置する
        if(!_dragSrc||_dragSrc.arr!=='rew') return;
        const rewIdx=_dragSrc.idx; _dragSrc=null;
        const card=_rewCards[rewIdx];
        if(!card||!_isSpellCard(card)) return;
        e.preventDefault(); e.stopPropagation();
        if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward) return;
        G.spellSlots=G.spellSlots||new Array(3).fill(null);
        if(G.spellSlots[idx]) return;
        const placed=clone(card);
        if(card._isOriginalReward){
          placed._rewardReturnCard=clone(card);
          placed._rewardReturnIdx=rewIdx;
          placed._rewardReturnPhaseId=_rewPhaseId;
        }
        G.spellSlots[idx]=placed;
        _playRewardAcquireSfx('item_get.wav');
        if(card._isOriginalReward) _rewFreePickDone=true;
        if(card._isTreasure) _rewFreePickDone=true;
        _rewCards.splice(rewIdx,1);
        if(typeof _removeDragGhost==='function') _removeDragGhost();
        if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
        renderRewCards();
        renderHandEditor();
        renderMoveSlotsInEnemy();
        updateHUD();
      });
      zone.appendChild(ph);
    }
  }
  el.appendChild(zone);
}

const FACILITY_DEFS=[
  {key:'altar',label:'祭壇',desc:'ランダムな初期キャラクターを獲得する。'},
  {key:'lab',label:'研究所',desc:'販売パネルの最大グレードが上がる。'},
  {key:'city',label:'市街',desc:'報酬フェイズ開始時の収入が増える。'},
  {key:'vault',label:'金庫',desc:'次ラウンドへ繰り越せるゴールド上限が増える。'},
  {key:'library',label:'図書館',desc:'報酬の知識を蓄える。'},
  {key:'university',label:'大学',desc:'戦闘開始時に使える魔法が増える。'}
];

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

function _facilityCost(key){
  const lv=Math.max(1,(G.facilities&&G.facilities[key])||1);
  const sheetCosts=window.FACILITY_UPGRADE_COSTS&&window.FACILITY_UPGRADE_COSTS[key];
  const sheetBase=Array.isArray(sheetCosts)&&sheetCosts[lv-1]!=null?sheetCosts[lv-1]:null;
  const fallbackCosts={
    altar:[3,6,9,12,15,18],
    lab:[2,4,7,11,16,22],
    city:[2,4,9,10,11,12],
    vault:[1,3,5,7,9,11],
    library:[1,2,4,6,8,10],
    university:[3,5,8,12,15,18],
  };
  const facilityBase=fallbackCosts[key]&&fallbackCosts[key][lv-1];
  const base=sheetBase!=null?sheetBase:(facilityBase!=null?facilityBase:(GRADE_UP_COSTS[Math.max(0,lv-1)]||99));
  const idx=Math.max(0,FACILITY_DEFS.findIndex(def=>def.key===key));
  const raw=(sheetBase!=null||facilityBase!=null)?base:base+idx;
  const discount=(G.facilityDiscounts&&G.facilityDiscounts[key])||0;
  return Math.max(0,raw-discount);
}

function _facilityCostDiscounted(key){
  return !!(G.facilityDiscounts&&G.facilityDiscounts[key]>0);
}

function _panelByName(name){
  if(typeof makeUnitPanel==='function') return makeUnitPanel(name);
  const pool=typeof PANEL_POOL!=='undefined'?PANEL_POOL:[];
  const found=pool.find(p=>p&&p.name===name);
  return found?clone(found):null;
}

// 旧「所有者ユニット」モデル時代の祭壇強化ボーナス（starterOnly＝固定初期キャラ枠から
// ランダムに1体をG.alliesへ永続追加していた）。メイン置き場が単一共有ボードになった現行仕様では
// G.alliesへの直接追加は毎戦闘のapplyNewPanelBattleStart()と衝突するため、ボーナス付与を無効化する。
// （祭壇のレベル・コストなど他の効果はupgradeFacility()側でそのまま維持される）
function _applyAltarUpgrade(level){
}

function upgradeFacility(key){
  G.facilities=G.facilities||{altar:1,lab:1,city:1,vault:1,library:1,university:1};
  const lv=G.facilities[key]||1;
  if(lv>=7) return;
  const cost=_facilityCost(key);
  if(G.gold<cost)return;
  G.gold-=cost;
  G.facilities[key]=lv+1;
  if(G.facilityDiscounts) G.facilityDiscounts[key]=0;
  if(key==='lab') G.rewardGrade=Math.max(G.rewardGrade||1,G.facilities[key]);
  if(key==='altar') _applyAltarUpgrade(G.facilities[key]);
  refreshRewardGoldUi();
  renderHandEditor();
  renderFieldEditor();
  if(typeof renderEnemyHand==='function') renderEnemyHand();
  renderRewCards();
}

function renderFacilitiesRow(){
  const el=document.getElementById('enemy-hand-slots');
  if(!el) return;
  G.facilities=G.facilities||{altar:1,lab:1,city:1,vault:1,library:1,university:1};
  el.innerHTML='';
  el.classList.add('facility-slots');
  el.style.setProperty('grid-template-columns','repeat(2,var(--hand-card-w))','important');
  el.style.setProperty('justify-content','end','important');
  FACILITY_DEFS.forEach(def=>{
    const lv=G.facilities[def.key]||1;
    const cost=lv>=7?'-':_facilityCost(def.key);
    const div=document.createElement('div');
    div.className='facility-card'+(_facilityCostDiscounted(def.key)?' cost-down':'');
    div.innerHTML=`<div class="card-badge">${_circleCost(cost)}</div><div class="facility-name">${def.label}</div><div class="facility-lv">Lv.${lv}</div><div class="facility-desc">${def.desc}</div><button class="facility-up">${lv>=7?'MAX':`強化`}</button>`;
    const btn=div.querySelector('.facility-up');
    btn.disabled=lv>=7||G.gold<cost;
    btn.onclick=e=>{ e.stopPropagation(); upgradeFacility(def.key); };
    el.appendChild(div);
  });
}

function renderHandEditor(){
  _syncBoardCardVisibilityToggle();
  _syncRewardPanelPlacementOverlay();
  // ゲームオーバー画面・クリア画面でも魔導板のカード表示／非表示を切り替えられるので、
  // その2フェイズでは解除しない（解除すると切り替えた直後の再描画で元に戻ってしまう）。
  if(G.phase!=='reward'&&G.phase!=='gameover'&&G.phase!=='clear'&&document.body){
    document.body.classList.remove('right-card-peek');
  }
  const handPaneRoot=document.getElementById('hand-pane');
  const spellPane=document.getElementById('spell-slot-pane');
  if(spellPane){ spellPane.innerHTML=''; spellPane.style.setProperty('display','none','important'); }
  if(G.phase!=='player'&&G.phase!=='reward'){
    if(handPaneRoot) handPaneRoot.style.display='none';
    const slots=document.getElementById('hand-slots');
    if(slots) slots.innerHTML='';
    if(typeof renderBattleOrderRow==='function') renderBattleOrderRow(false);
    return;
  }
  if(handPaneRoot) handPaneRoot.style.display='';
  if(G.phase!=='player') G._selectedEquipCardIdx=null;
  if(G.phase==='reward') G._showGlobalPanels=false;
  _ensureSelectedEquipUnitIdx();
  const selected=_getPartyBoardUnit();
  // 戦闘順序行の閉包が最新のunit.equipment配列を参照するよう、正規化してからrenderBattleOrderRowを呼ぶ
  // （_normalizeUnitEquipmentはequipment配列を新しいオブジェクトに差し替えるため、順序を逆にすると
  // 　並べ替え操作が古い配列に対して行われ、実際の戦闘に反映されなくなる）
  if(selected) _normalizeUnitEquipment(selected);
  if(typeof renderBattleOrderRow==='function'&&!G._isForge&&!G._isTavern) renderBattleOrderRow(G.phase==='reward'&&!G._isShop);
  const handMax=document.getElementById('hand-max');
  const handLabel=document.querySelector('#hand-pane .spell-label');
  if(G._showGlobalPanels){
    G._selectedEquipCardIdx=null;
    const panels=G.globalPanels=G.globalPanels||new Array(7).fill(null);
    renderHeRow('hand-slots', panels, 0, 7, 'globalPanels');
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=panels.filter(Boolean).length;
    if(handMax) handMax.textContent=7;
    if(handLabel) handLabel.childNodes[0].nodeValue=G.phase==='player'?'魔法 ':'全体パネル ';
  } else if(selected){
    const limit=getUnitEquipLimit(selected);
    renderHeRow('hand-slots', selected.equipment, 0, limit, 'unitEquip');
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=selected.equipment.filter(Boolean).length;
    if(handMax) handMax.textContent=limit;
    if(handLabel) handLabel.childNodes[0].nodeValue=`${selected.name}のパネル `;
  } else {
    const el=document.getElementById('hand-slots');
    if(el) el.innerHTML='';
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=0;
    if(handMax) handMax.textContent=0;
    if(handLabel) handLabel.childNodes[0].nodeValue='パネル ';
  }
  renderDebugCardPalette();
  requestAnimationFrame(fitCardDescs);
}

function _debugPanelSortValue(card){
  const raw=String(card&&(
    card.no??card.No??card['No.']??card.imageNo??card.artCode??''
  )||'').trim();
  const n=parseInt(raw.replace(/^\D+/,''),10);
  return Number.isFinite(n)?n:99999;
}

function _debugImplementedPanelCards(){
  const kind=String(G&&G._debugPaletteKind||'character');
  if(kind==='item'){
    if(typeof ITEM_POOL==='undefined'||!Array.isArray(ITEM_POOL)) return [];
    return ITEM_POOL.filter(p=>p&&p.id&&p.name&&String(p.name)!=='false'&&p._implemented!==false&&p.implemented!==false)
      .sort((a,b)=>_debugPanelSortValue(a)-_debugPanelSortValue(b)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
  }
  if(kind==='ring'){
    if(typeof RING_POOL==='undefined'||!Array.isArray(RING_POOL)) return [];
    return RING_POOL.filter(p=>p&&p.id&&p.name&&String(p.name)!=='false'&&p._implemented!==false&&p.implemented!==false)
      .sort((a,b)=>_debugPanelSortValue(a)-_debugPanelSortValue(b)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
  }
  if(typeof PANEL_POOL==='undefined'||!Array.isArray(PANEL_POOL)) return [];
  return PANEL_POOL.filter(p=>{
    if(!p||!p.id||p.removed||p._implemented===false||p.rarity===-1) return false;
    const cat=String(p.category||'');
    if(kind==='character') return cat==='キャラクター';
    return cat==='強化'||cat==='エンチャント';
  }).sort((a,b)=>_debugPanelSortValue(a)-_debugPanelSortValue(b)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
}

function _debugPanelDirectionCount(def){
  const raw=Number(def&&def.directionCount);
  if(Number.isFinite(raw)&&raw>=0) return Math.min(4,Math.max(0,Math.floor(raw)));
  const cat=String(def&&def.category||'');
  if(cat==='キャラクター') return 2;
  return 2;
}
function _debugRotatedDirections(def){
  const dirs=['up','right','down','left'];
  const cat=String(def&&def.category||'');
  const count=_debugPanelDirectionCount(def);
  if(count===0) return [];
  if(count===2&&cat!=='キャラクター'){
    const patterns=[['up','right'],['right','down'],['down','left'],['left','up'],['up','down'],['left','right']];
    return patterns[((G&&G._debugDirRotation)||0)%patterns.length].slice();
  }
  const start=((G&&G._debugDirRotation)||0)%dirs.length;
  const out=[];
  for(let i=0;i<count;i++) out.push(dirs[(start+i)%dirs.length]);
  return out;
}
function _debugMakePanelCard(id){
  const kind=String(G&&G._debugPaletteKind||'character');
  if(kind==='item'){
    const card=typeof makeItem==='function'?makeItem(id):null;
    if(card){
      card._debugInfiniteCard=true; card._buyPrice=0;
      if(!card.artCode&&!card.imageNo) card.artCode=String(card.no||card.No||card['No.']||'');
    }
    return card;
  }
  if(kind==='ring'){
    const def=typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL)?RING_POOL.find(p=>p&&p.id===id):null;
    const card=def?clone(def):null;
    if(card){ card._debugInfiniteCard=true; card._buyPrice=0; }
    return card;
  }
  const def=typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL.find(p=>p&&p.id===id):null;
  const card=typeof makePanel==='function'?makePanel(id):(def?clone(def):null);
  if(card&&def) card.directions=_debugRotatedDirections(def);
  if(card) card._debugInfiniteCard=true;
  return card;
}
function _debugPanelCode(def,kind,index){
  const raw=String(def&&(
    def.no??def.No??def['No.']??def.imageNo??def.artCode??''
  )||'').trim();
  if(raw) return raw.match(/^[A-Za-z]+\d+$/)?raw:`${kind==='enchant'?'E':kind==='character'?'C':''}${raw.padStart(3,'0')}`;
  const prefix=kind==='enchant'?'E':kind==='character'?'C':'';
  return prefix?`${prefix}${String(index+1).padStart(3,'0')}`:'';
}
function _debugPanelDisplayNo(code){
  const m=String(code||'').match(/(\d+)$/);
  return m?m[1]:String(code||'');
}
function _debugTakePanelCard(id){
  if(!G||!G._debugMode||G.phase!=='reward') return;
  const kind=String(G._debugPaletteKind||'character');
  if(kind==='item'){
    const card=_debugMakePanelCard(id);
    G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:Array(4).fill(null);
    while(G.spellSlots.length<4) G.spellSlots.push(null);
    const idx=G.spellSlots.findIndex(v=>!v);
    if(!card||idx<0){ log('アイテム枠が満杯です。','bad'); return; }
    G.spellSlots[idx]=card;
    _playRewardAcquireSfx('item_get.wav');
    // アイテム枠・指輪枠の絵は_syncRewardProductionUi()が描くので、
    // renderHandEditor()だけでは反映されない（カード配置等で他の経路が走るまで出ない）。
    renderHandEditor(); _syncRewardProductionUi(); updateHUD();
    return;
  }
  if(kind==='ring'){
    const card=_debugMakePanelCard(id);
    if(!card||!_takeRingCard(card)){ log('指輪枠が満杯です。','bad'); return; }
    if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
    renderHandEditor(); _syncRewardProductionUi(); updateHUD();
    return;
  }
  if(typeof makePanel!=='function') return;
  if(G._pendingPanelPlacement) G._pendingPanelPlacement=null;
  const card=_debugMakePanelCard(id);
  if(!card) return;
  startPanelPlacement(card,()=>{},'DEBUG');
}

function renderDebugCardPalette(){
  const host=document.getElementById('debug-card-palette');
  if(!host) return;
  document.body.classList.toggle('debug-mode',!!(G&&G._debugMode));
  if(!G||!G._debugMode||G.phase!=='reward'){
    host.innerHTML='';
    return;
  }
  if(!['character','enchant','item','ring'].includes(G._debugPaletteKind)) G._debugPaletteKind='character';
  const prevList=host.querySelector('.debug-palette-list');
  const prevScrollTop=prevList?prevList.scrollTop:(G._debugPaletteScrollTop||0);
  const pendingId=G._pendingPanelPlacement&&G._pendingPanelPlacement.card&&G._pendingPanelPlacement.card.id;
  const kind=G._debugPaletteKind;
  const tab=(key,label)=>`<button type="button" class="debug-palette-kind${kind===key?' active':''}" data-kind="${key}">${label}</button>`;
  const title={character:'DEBUG CARD',enchant:'DEBUG ENCHANT',item:'DEBUG ITEM',ring:'DEBUG RING'}[kind];
  host.innerHTML=`<div class="debug-palette-head"><div class="debug-palette-tabs">${tab('character','キャラ')}${tab('enchant','強化')}${tab('item','アイテム')}${tab('ring','指輪')}</div><div class="debug-palette-title">${title}</div><button type="button" class="debug-palette-rotate"${kind==='item'||kind==='ring'?' disabled':''}>回転</button></div><div class="debug-palette-list"></div>`;
  host.querySelectorAll('.debug-palette-kind').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      G._debugPaletteKind=['character','enchant','item','ring'].includes(btn.dataset.kind)?btn.dataset.kind:'character';
      renderDebugCardPalette();
    };
  });
  const rot=host.querySelector('.debug-palette-rotate');
  if(rot) rot.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    G._debugDirRotation=((G._debugDirRotation||0)+1)%6;
    renderDebugCardPalette();
  };
  const list=host.querySelector('.debug-palette-list');
  _debugImplementedPanelCards().forEach((def,debugIdx)=>{
    const card=_debugMakePanelCard(def.id);
    if(!card) return;
    const debugCode=_debugPanelCode(def,kind,debugIdx);
    if(debugCode){
      if(!card.no&&!card.No&&!card['No.']&&!card.imageNo&&!card.artCode) card.no=debugCode;
      if(!card.imageNo&&!card.artCode) card.artCode=debugCode;
    }
    let suppressClick=false;
    const item=document.createElement('button');
    item.type='button';
    item.className='debug-palette-item'+(pendingId===def.id?' pending':'');
    const panelKind=kind==='character'||kind==='enchant';
    item.draggable=panelKind;
    const no=_debugPanelDisplayNo(debugCode);
    const cardWrap=document.createElement('div');
    cardWrap.className='debug-palette-card';
    let cardEl;
    if(kind==='ring'){
      cardEl=document.createElement('div');
      const ringPath=_rewardRingArtPath(card);
      cardEl.className=`ring-visual${ringPath?' ring-visual-filled':''}`;
      if(ringPath){
        cardEl.style.setProperty('--ring-art',`url("${ringPath}")`);
        const art=document.createElement('img');
        art.className='debug-ring-art';
        art.src=ringPath;
        art.alt=card.name||'指輪';
        cardEl.appendChild(art);
      }
      cardEl.setAttribute('data-preview',[typeof _cardUiName==='function'?_cardUiName(card):card.name,card.desc||''].filter(Boolean).join('\n'));
    }else{
      cardEl=panelKind&&typeof mkCardEl==='function'
        ?mkCardEl(card,-1,'debug-palette')
        :(typeof _mkRewDiv==='function'?_mkRewDiv(card,null,-1):document.createElement('div'));
    }
    cardEl.draggable=false;
    const preview=cardEl.getAttribute('data-preview');
    if(preview) item.setAttribute('data-preview',preview);
    cardWrap.appendChild(cardEl);
    const label=document.createElement('div');
    label.className='debug-palette-label';
    label.innerHTML=`${no?`<span class="debug-palette-no">No.${no}</span>`:''}${_escapePreviewHtml(card.name||def.name||'')}`;
    item.appendChild(cardWrap);
    item.appendChild(label);
    item.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(suppressClick) return;
      _debugTakePanelCard(def.id);
    };
    item.addEventListener('dragstart',e=>{
      if(!panelKind){ e.preventDefault(); return; }
      suppressClick=true;
      if(G._pendingPanelPlacement) G._pendingPanelPlacement=null;
      const dragCard=_debugMakePanelCard(def.id);
      if(!dragCard){ e.preventDefault(); return; }
      _dragSrc={arr:'debugPanel',id:def.id,card:dragCard};
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed='copy';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
      }
      // 他の全ドラッグ元と同じく`.card`要素自体を渡す（ラッパーの`.debug-palette-card`を
      // 渡すと、#debug-card-paletteスコープ限定CSS（アイコン位置補正等）がbody直下の
      // ゴーストには効かなくなり、アイコン位置がずれる）。
      _createDragGhost(cardEl);
      item.classList.add('dragging');
    });
    item.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    item.addEventListener('dragend',()=>{ item.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; setTimeout(()=>{ suppressClick=false; },0); });
    list.appendChild(item);
  });
  list.scrollTop=prevScrollTop||0;
  list.addEventListener('scroll',()=>{ G._debugPaletteScrollTop=list.scrollTop; },{passive:true});
}

function renderHeRow(elId, arr, startIdx, count, arrName){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const Hcols=count;
  const battleMagic=elId==='hand-slots'&&G.phase==='player'&&arrName==='globalPanels';
  const rewardUnitPanels=elId==='hand-slots'&&arrName==='unitEquip';
  el.classList.toggle('unit-equip-slots',elId==='hand-slots'&&arrName==='unitEquip');
  el.classList.toggle('battle-magic-slots',battleMagic);
  el.style.setProperty('grid-template-columns',battleMagic?'repeat(2,var(--hand-card-w))':(rewardUnitPanels?'repeat(5,var(--hand-card-w))':`repeat(${Hcols},var(--hand-card-w,300px))`),'important');
  if(battleMagic) el.style.setProperty('grid-template-rows','repeat(3,var(--hand-card-h))','important');
  if(rewardUnitPanels) el.style.setProperty('grid-template-rows','repeat(3,var(--hand-card-h))','important');
  el.style.setProperty('justify-content',battleMagic?'start':(elId==='hand-slots'?'center':((arrName==='unitEquip'||arrName==='globalPanels')?'center':'start')),'important');
  if(elId==='hand-slots'){
    const handPane=document.getElementById('hand-pane');
    if(handPane){
      const rewardUnitPanelW='calc(var(--hand-card-w) * 5 + var(--field-gap) * 4)';
      const rewardUnitPanelH='calc(var(--hand-card-h) * 3 + var(--field-gap) * 2)';
      const prodRewardBoard=rewardUnitPanels&&document.body&&document.body.classList.contains('reward-screen-active');
      // 報酬カード枠（#battle-order-section、left:1125px）と魔導板枠（#hand-pane-board-bg、left:1125px/top:683px）
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
      const _slotUnit=arrName==='unitEquip'?_getPartyBoardUnit():null;
      const _slotDef=arrName==='unitEquip'?_equipSlotDef(i,_slotUnit):arrName==='globalPanels'?{label:`全体${i+1}`,kind:'global'}:null;
      const _deployNum=arrName==='unitEquip'?MAIN_BOARD_DEPLOY_SLOTS.indexOf(i):-1;
    if(i>=startIdx+count){
      // 未解放スロット
      const ph=document.createElement('div'); ph.className='card-empty spell'; ph.style.opacity='0.1';
      ph.style.setProperty('--hand-i',_handPos);
      ph.style.setProperty('--hand-mid',_handMid);
      ph.style.setProperty('--hand-arc',_handArc);
      el.appendChild(ph); continue;
    }
    const card=arr[i];
    if(card){
      const div=document.createElement('div');
      const _isRingInHand=card.type==='ring'||!card.type||card.kind==='summon'||card.kind==='passive';
      const t=_isRingInHand?'ring':(card.type||'wand');
      div.className=`card ${t}`;
      if(card.rarity>=1&&card.rarity<=5) div.classList.add(`rarity-${card.rarity}`);
      if(arrName==='unitEquip') div.dataset.equipIdx=String(i);
      // ロール演出中に別カードをドラッグ操作すると、その途中の再描画で候補/当選演出だけが
      // 残ってドラッグ中もずっと発光して見えてしまうため、ドラッグ中は演出クラスを付けない。
      if(arrName==='unitEquip'&&G&&G._mapForgeAnimating&&!_dragSrc){
        div.classList.add('map-forge-roll-card-fade');
        if(Array.isArray(G._mapForgeCandidateSlots)&&G._mapForgeCandidateSlots.includes(i)) div.classList.add('map-forge-roll-candidate');
        if(G._mapForgeHighlightSlot===i) div.classList.add('map-forge-roll-highlight');
      }
      if(_slotDef) div.classList.add(`equip-slot-${_slotDef.kind}`);
      const _mapPowerId=arrName==='unitEquip'&&typeof mapPanelPowerIdAt==='function'?mapPanelPowerIdAt(i):'';
      const _hasMapDeployPower=!!_mapPowerId;
      if(arrName==='unitEquip'&&_mapPowerId) div.dataset.mapBoard=_mapPowerId;
      if(arrName==='unitEquip'&&_mapPowerId&&Assets.mapBoard&&Assets.mapBoard[_mapPowerId]){
        div.style.setProperty('background-image',`url("${Assets.mapBoard[_mapPowerId]}")`,'important');
      }
      if(_deployNum>=0||_hasMapDeployPower){ div.classList.add('deploy-slot'); }
      const _selectedEquipDead=arrName==='unitEquip'&&_getPartyBoardUnit()?.hp<=0;
      const _combatEquipView=arrName==='unitEquip'&&((G.phase==='player'||!_isNonCombatEquipPhase())||_selectedEquipDead);
      const _combatEquipInInventory=arrName==='spells'&&!_isNonCombatEquipPhase()&&isEquipmentCard(card);
      const _battleHandDisabled=arrName==='spells'&&G.phase==='player'&&!card.allowBattleUse;
      if(_combatEquipView) div.classList.add('equip-combat-view');
      if(_combatEquipInInventory) div.classList.add('equip-combat-dim');
      if(_battleHandDisabled) div.classList.add('equip-combat-dim');
      if(typeof applyCardVisual==='function') applyCardVisual(div,card);
      else if(typeof getCardAsset==='function'&&typeof assetUrl==='function') div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
      if(arrName==='unitEquip'&&_mapPowerId&&Assets.mapBoard&&Assets.mapBoard[_mapPowerId]){
        const _boardWidth={eternal:'109.6%',resonance:'112.7%',duplicate:'105.5%'}[_mapPowerId]||'100%';
        div.style.setProperty('background',`url("${Assets.mapBoard[_mapPowerId]}") center/${_boardWidth} 100% no-repeat`,'important');
      }
      div.style.paddingBottom='22px'; // 破棄ボタン分の余白確保
      const _canFixedAttackDrag=false;
      div.draggable=arrName!=='globalPanels';
      const _rewPhaseInv=!G._isShop&&G.phase==='reward';
      if(_isRingInHand&&_rewPhaseInv) div.style.cssText=(div.style.cssText||'')+';opacity:0.45;filter:grayscale(0.45)';
      div.style.setProperty('--hand-i',_handPos);
      div.style.setProperty('--hand-mid',_handMid);
      div.style.setProperty('--hand-arc',_handArc);
      const _isPanelCharacter=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'')==='キャラクター';
      if(_isPanelCharacter) div.classList.add('character-card','panel-character-card');
      if(arrName==='unitEquip'&&_isPanelCharacter&&_deployNum<0&&!_hasMapDeployPower) div.classList.add('invalid-battle-position');
      const _isEnchantPanelForClass=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&['強化','エンチャント'].includes(String(card.category||''));
      if(_isEnchantPanelForClass) div.classList.add('enchantment-card');
      const _gradeEl='';
      const _costOwner=arrName==='unitEquip'?_getPartyBoardUnit():null;
      const _costEnh=_costOwner&&typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(_costOwner,i):null;
      const _costCard=_costEnh
        ?{...card,
          keywords:[...(card.keywords||[]),...(_costEnh.keywords||[])],
          _extraManaCosts:Array.isArray(_costEnh.manaThresholds)
            ?_costEnh.manaThresholds.map(t=>Number(t&&t.cost)||0).filter(Boolean):[]}
        :card;
      const _manaCostEl=typeof cardManaCostHtml==='function'?cardManaCostHtml(_costCard):'';
      const _sealCostEl=typeof cardSealCostHtml==='function'?cardSealCostHtml(_costCard):'';
      const _isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
      const _isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
      const _isActionPanel=card&&(card.fixedAttack||card.fixedEquip||((card.type==='panel'||card.kind==='panel'||card.panelScope)&&!_isPassivePanel&&!_isCombatPowerPanel&&card.panelScope!=='global'));
      const _isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
      const _charges=t==='wand'?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?')):(!_isPanelCard&&_isActionPanel?(card.cost>0?card.cost:1):null);
      const _chargeHtml=_charges!==null?`<div class="card-charge">${_charges}</div>`:'';
      const _mergeStarHtml=card._tripleMerged?'<span class="triple-merge-star" aria-label="3枚合体">★</span>':'';
      // 指輪提示（栄光の力）中は、そのターンに取得したばかりのカード（＝「報酬に戻す」対象）も含め、
      // 魔導板上の全カード（キャラクター・強化とも）を廃棄カウントの対象にする。
      // 以前は_isCurrentRewardReturnCardを除外していたため、そのカードの×が「報酬に戻す」として
      // 処理されて_boardDiscardCountが増えず、3枚のはずが4枚廃棄しないと解放されない不具合があった。
      const _ringOfferDiscardable=arrName==='unitEquip'&&G&&G._ringOfferPhase&&Array.isArray(G._ringOffer)&&G._ringOffer.length>0&&!G._ringOfferUnlocked&&!G._ringOfferResolved;
      const _boardSellable=_boardCardSellEnabled();
      const _shopSellBaseGain=_boardSellable?_shopCardSellGain(card):0;
      const _shopSellGain=_boardSellable?(typeof goldIncomeAmount==='function'?goldIncomeAmount(_shopSellBaseGain):_shopSellBaseGain):0;
      const _spellBtn=arrName==='unitEquip'
        ?(_boardSellable?`<span class="shop-board-sell-value">+${_shopSellGain}G</span><button class="discard-btn shop-board-sell-btn" data-sfx-silent="1">売却</button>`:(_ringOfferDiscardable?`<button class="discard-btn shop-board-sell-btn ring-offer-discard-btn" data-sfx-silent="1">還魂</button>`:''))
        :'';
      const _libraryLoanBadge=arrName==='unitEquip'&&card._libraryLoan
        ?'<span class="shop-board-sell-value library-loan-badge">貸出</span>':'';
      const _powerId=_mapPowerId;
      const _powerDef=_powerId&&typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.find(p=>p.id===_powerId):null;
      if(_powerDef){
        div.setAttribute('data-panel-power-preview',[
          _powerDef.name,
          _powerDef.desc||''
        ].filter(Boolean).join('\n'));
      }
      const _slotLabel=_slotDef?`<div class="equip-slot-label">${_slotDef.label}${_powerDef?`<small>${_powerDef.name}</small>`:''}</div>`:'';
      const _dirOwner=arrName==='unitEquip'?_getPartyBoardUnit():null;
      const _dirConnectivity=_dirOwner&&typeof _panelDirectionConnectivity==='function'?_panelDirectionConnectivity(_dirOwner,i):null;
      const _dirMarks=typeof panelDirectionMarksHtml==='function'?panelDirectionMarksHtml(card,_dirConnectivity):'';
      if(_isPanelCharacter){
        const _panelOwner=arrName==='unitEquip'?_getPartyBoardUnit():null;
        const st=_panelCharacterPreviewStats(_panelOwner,arrName==='unitEquip'?i:null,card);
        const pAtk=st.atk, pHp=st.hp;
        // HPを減少させる強化でHPが0になったキャラクターは、出撃不可のキャラと同じ見た目で暗くする
        if(arrName==='unitEquip'&&pHp<=0) div.classList.add('invalid-battle-position');
        // シート「キーワード」列由来のcard.keywordsに、このスロットへ隣接接続している強化パネルの
        // 付与キーワードもマージした上で_unitPreviewText()に渡す（敵ユニットと同じ表示規則で
        // 「キーワード：〇〇」行として太字合成される。本文が空のカードでも説明が空にならない）。
        // equipmentは実際の盤面（_panelOwner.equipment＝G.mainBoard）を参照させることで、
        // _unitPreviewText内部の_groupedEnchantEffectTexts()が接続中の強化カード効果全文も
        // 正しく含められるようにする（キーワードのみ渡すと接続効果文が別途二重表示されてしまう）。
        const _enh=_panelOwner&&typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(_panelOwner,i):{keywords:[]};
        const _cardForPreview=_panelOwner?{...card,keywords:[...(card.keywords||[]),...(_enh.keywords||[])],equipment:_panelOwner.equipment,_ownedBoardPreview:true}:card;
        // 「結界X」は_unitDisplayKeywords内でunit.shield（数値）から合成表示するため、戦闘中の
        // _applyAdjacentPanelEnhancementsと同じ計算（複数の結界付与元をXに合算）をここでも行っておく。
        // これがないと、接続した結界がいくつあっても編成画面のキーワード欄に「結界X」が出ない。
        if(typeof _unitShieldValue==='function') _cardForPreview.shield=_unitShieldValue(_cardForPreview);
        const _keywordPreview=typeof _keywordOnlyPreviewText==='function'?_keywordOnlyPreviewText(_cardForPreview,card.desc||'',i):'';
        if(_keywordPreview) div.setAttribute('data-keyword-preview',_keywordPreview);
        if(_powerDef) div.setAttribute('data-map-power-preview',[
          _powerDef.name,
          _powerDef.desc||''
        ].filter(Boolean).join('\n'));
        const preview=typeof _unitPreviewText==='function'?_unitPreviewText(_cardForPreview,card.desc||'',i):(card.name+'\n'+(card.desc||''));
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}${_mergeStarHtml}${_dirMarks}<div class="card-art"></div><span class="card-summon-atk${_cardStatDigitClass(pAtk)}">${pAtk}</span><span class="card-summon-hp${_cardStatDigitClass(pHp)}">${pHp}</span>${_spellBtn}${_libraryLoanBadge}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
        if(_panelOwner&&typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(div,_panelOwner,G._selectedEquipUnitIdx,i);
      }else if(_isPanelCard&&['強化','エンチャント'].includes(String(card.category||''))){
        // data-previewはホバー時に_formatPreviewHtmlで改めてHTMLタグ除去→マナアイコン挿入を行うため、
        // ここでcomputeDesc()の結果（既にマナアイコンの<img>タグが埋め込み済み）を使うとタグごと
        // 除去されて色情報が消えてしまう。生のcard.descを渡す。
        // 本文に「効果なし」を含む場合は説明文を表示しない。シート「キーワード」列（adjacentKeywords）が
        // あれば「キーワード：〇〇」行として表示する（隣接キャラクターへ付与するキーワード）。
        const _panelDescRaw=/効果なし/.test(String(card.desc||''))?'':(typeof _plainEffectTextForPreview==='function'?_plainEffectTextForPreview(card):(card.desc||'')).replace(/^荷物\s*/,'');
        const _panelDescForPreview=card.name==='封印されしもの'
          ?String(_panelDescRaw||'').replace(/^封印\d+\s*/,'').trim():_panelDescRaw;
        // シート「キーワード」列に実在しないカード名自己参照マーカー（内部の効果判定専用）は
        // このカード自身のキーワード欄プレビューからも除外する
        const _adjKws=[...new Set([...(card.keywords||[]).filter(k=>String(k||'').trim()==='荷物'),...(card.adjacentKeywords||[])])].filter(k=>{
          const s=String(k||'').trim();
          if(typeof _INTERNAL_ONLY_ENCHANT_NAMES!=='undefined'&&_INTERNAL_ONLY_ENCHANT_NAMES.has(s)) return false;
          const isDisplayKeyword=(typeof _ENCHANT_KEYWORD_ONLY!=='undefined'&&_ENCHANT_KEYWORD_ONLY.has(s))||/^結界\d+$/.test(s)||/^封印\d+$/.test(s)||/^毒牙?\d*$/.test(s)||/^邪眼\d*$/.test(s)||/^衝撃\d*$/.test(s)||/^強靭\d*$/.test(s);
          if(s===String(card.name||'')&&!isDisplayKeyword) return false;
          return true;
        });
        const preview=[typeof _cardUiName==='function'?_cardUiName(card):card.name,_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:'',_panelDescForPreview].filter(Boolean).join('\n');
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}${_mergeStarHtml}${_dirMarks}<div class="card-art"></div>${_spellBtn}${_libraryLoanBadge}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
        if(arrName==='unitEquip'&&typeof _wireEnchantSelfHover==='function') _wireEnchantSelfHover(div,_getPartyBoardUnit(),i);
      }else if(typeof _isSpellCard==='function'&&_isSpellCard(card)){
        div.classList.add('spell-card');
        const preview=[typeof _cardUiName==='function'?_cardUiName(card):card.name,typeof _previewRarityLine==='function'?_previewRarityLine(card):'',card.desc||''].filter(Boolean).join('\n');
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_sealCostEl}<div class="card-art"></div>${_spellBtn}${_libraryLoanBadge}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
      }else{
        div.innerHTML=`${_slotLabel}${_gradeEl}${_sealCostEl}${_dirMarks}<div class="card-art"></div><div class="card-tp ${t}">${arrName==='globalPanels'?'全体':arrName==='unitEquip'?'パネル':t==='ring'?'指輪':t==='wand'?'杖':'アイテム'}</div><div class="card-name">${typeof _cardUiName==='function'?_cardUiName(card):card.name}</div><div class="card-desc">${computeDesc(card)}</div>${_chargeHtml}${_spellBtn}${_libraryLoanBadge}`;
        _pinPanelTextPosition(div,arrName==='unitEquip'?'unitEquip':'normal');
      }
      // 魔導板枠はカード固有の::after（キャラ枠）と競合しない独立レイヤーとして常設する。
      if(arrName==='unitEquip'){
        const characterFrame=document.createElement('span');
        characterFrame.className='character-frame-layer';
        characterFrame.setAttribute('aria-hidden','true');
        if(_isPanelCharacter) div.appendChild(characterFrame);
        const cardGlow=document.createElement('span');
        cardGlow.className='card-glow-layer';
        cardGlow.setAttribute('aria-hidden','true');
        div.appendChild(cardGlow);
        // 右クリック透明化時にも通常マスの外周を復元できるよう、
        // 全カードに独立フレームを持たせる（通常時の表示可否はCSS側で制御）。
        const boardFrame=document.createElement('span');
        boardFrame.className='board-frame-layer';
        boardFrame.setAttribute('aria-hidden','true');
        div.appendChild(boardFrame);
        if(div.dataset.mapBoard){
          const mapBoundary=document.createElement('span');
          mapBoundary.className='map-boundary-layer';
          mapBoundary.setAttribute('aria-hidden','true');
          div.appendChild(mapBoundary);
        }
      }
      const discardBtn=div.querySelector('.discard-btn');
      if(discardBtn) {
        discardBtn.draggable=false;
        discardBtn.onmousedown=ev=>{ ev.stopPropagation(); };
        discardBtn.onclick=ev=>{
        ev.stopPropagation();
        if(_libraryTutorialIsMoveStep()) return;
        // SEはボタン種別で最初に決める。デバッグモード等の分岐が先にreturnしても
        // 「還魂＝ascension / 売却＝sell」が確実に鳴るようにする。
        if(!discardBtn.classList.contains('ring-offer-discard-btn')&&_boardCardSellEnabled()) _playRewardAcquireSfx('sell.wav');
        if(arrName==='unitEquip'){
          // 指輪提示（還魂）中は最優先で廃棄カウントへ回す。デバッグモード分岐やショップ分岐が
          // 先にreturnすると_boardDiscardCountが増えず、3枚還魂しても指輪が解放されない。
          if(_ringOfferDiscardable){
            _discardBoardCardForRingOffer(i,card);
            return;
          }
          if(_boardCardSellEnabled()){
            const unit=_getPartyBoardUnit();
            if(unit){
              const equips=_normalizeUnitEquipment(unit);
              _clearStarterPanelMarker(unit,i,card);
              equips[i]=null;
              unit.equipment=equips;
              _syncUnitPanelEffectsAfterMove(unit);
              const baseGain=_shopCardSellGain(card);
              const gain=typeof onGoldGained==='function'?onGoldGained(baseGain):baseGain;
              if(typeof onGoldGained!=='function') G.gold=(G.gold||0)+gain;
              log(`${card.name}を売却（+${gain}ゴールド）`,'gold');
              if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
            }
            refreshRewardGoldUi();
            renderHandEditor(); renderFieldEditor(); renderMapInventorySlots(); renderRewCards();
            return;
          }
          if(G&&G._debugMode){
            const unit=_getPartyBoardUnit();
            if(unit){
              const equips=_normalizeUnitEquipment(unit);
              _clearStarterPanelMarker(unit,i,card);
              equips[i]=null;
              unit.equipment=equips;
              _syncUnitPanelEffectsAfterMove(unit);
              if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
            }
            renderHandEditor();
            renderFieldEditor();
            renderMapInventorySlots();
            return;
          }
          if(_isCurrentRewardReturnCard(card)){
            const unit=_getPartyBoardUnit();
            if(unit){
              const equips=_normalizeUnitEquipment(unit);
              equips[i]=null;
              unit.equipment=equips;
              _syncUnitPanelEffectsAfterMove(unit);
            }
            arr[i]=null;
            _restoreRewardReturnCard(card);
            _rewFreePickDone=false;
            renderRewCards(); renderHandEditor(); renderFieldEditor();
            return;
          }
          return;
        }
        if(arrName==='globalPanels') return;
        discardHeCard(arrName,i);
      };
      }
      // アイテム使用中は、対象になり得ないカードを暗くして選択不能にする。
      if(arrName==='unitEquip'&&G._pendingItemUse&&typeof _isItemUseTargetSlot==='function'){
        if(_isItemUseTargetSlot(i)) div.classList.add('item-target-ok');
        else div.classList.add('item-target-disabled');
      }
      if(arrName==='unitEquip') div.onclick=e=>{
        e.stopPropagation();
        // 対象外スロットは何も起こさない（アイテムを無駄に消費させない）。
        if(G._pendingItemUse&&typeof _isItemUseTargetSlot==='function'&&!_isItemUseTargetSlot(i)) return;
        if(typeof handlePendingItemBoardTarget==='function'&&handlePendingItemBoardTarget(i)) return;
        if(G._isForge&&typeof _isMapForgeBlockedSlot==='function'&&_isMapForgeBlockedSlot(i)) return;
        if(G._isForge&&typeof applyPendingMapForgePower==='function'&&applyPendingMapForgePower(i)) return;
        if(G._pendingPanelPlacement){ placePendingPanelToSelectedUnit(i); return; }
        if(G.phase==='player') return;
      };
      if(arrName==='globalPanels') div.onclick=e=>{
        e.stopPropagation();
        if(G._pendingPanelPlacement){ placePendingPanelToGlobal(i); return; }
      };
      if(G.phase==='reward'&&arrName==='spells'&&!card.noRewardUse&&!isEquipmentCard(card)&&card.allowRewardUse){
        const _isWand=t==='wand';
        const _hasCharge=!_isWand||(card.usesLeft===undefined||card.usesLeft>0);
        if(_hasCharge){ div.onclick=()=>useSpell(i); div.style.cursor='pointer'; }
      }
      if(G.phase==='player'&&arrName==='spells'&&card.allowBattleUse){
        div.onclick=()=>useSpell(i);
        div.style.cursor='pointer';
      }
      if(arrName!=='globalPanels'){
        div.addEventListener('dragstart',e=>{
          if(arrName==='unitEquip'&&_libraryTutorialIsMoveStep()) { e.preventDefault(); return; }
          _dragSrc=arrName==='unitEquip'?{arr:arrName,idx:i,unitIdx:G._selectedEquipUnitIdx}:{arr:arrName,idx:i};
          _pinPanelTextPosition(div,arrName==='unitEquip'?'unitEquip':'normal');
          if(arrName==='unitEquip'){
            _detachUnitEquipConnectionVisuals(i,div,card);
            _setDragZoneClass('dragzone-mainequip');
          }
          e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); div.classList.add('dragging'); _hideDragSourceParts(div);
        });
        div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
        div.addEventListener('dragend',()=>{ _restoreDragSourceParts(div); div.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; if(arrName==='unitEquip') renderHandEditor(); });
      }
      if(_canFixedAttackDrag){
        div.addEventListener('dragstart',e=>{
          window._fixedEquipDrag={unitIdx:G._selectedEquipUnitIdx,equipIdx:i};
          div.classList.add('dragging');
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setDragImage(_transparentDragImg,0,0);
          _createDragGhost(div);
        });
        div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
        div.addEventListener('dragend',()=>{ window._fixedEquipDrag=null; div.classList.remove('dragging'); _removeDragGhost(); });
      }
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); if(arrName!=='globalPanels') dropOnCard(arrName,i); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      if(arrName==='unitEquip'&&G&&G._mapForgeAnimating&&!_dragSrc){
        ph.classList.add('map-forge-roll-card-fade');
        if(Array.isArray(G._mapForgeCandidateSlots)&&G._mapForgeCandidateSlots.includes(i)) ph.classList.add('map-forge-roll-candidate');
        if(G._mapForgeHighlightSlot===i) ph.classList.add('map-forge-roll-highlight');
      }
      if(arrName==='unitEquip'||arrName==='globalPanels'){
        ph.classList.add('equip-empty',`equip-slot-${_slotDef.kind}`);
      }
      const _emptyMapPowerId=arrName==='unitEquip'&&typeof mapPanelPowerIdAt==='function'?mapPanelPowerIdAt(i):'';
      const _emptyPowerId=_emptyMapPowerId;
      if(arrName==='unitEquip'&&_emptyMapPowerId) ph.dataset.mapBoard=_emptyMapPowerId;
      if(arrName==='unitEquip'&&_emptyMapPowerId&&Assets.mapBoard&&Assets.mapBoard[_emptyMapPowerId]){
        const _boardWidth={eternal:'109.6%',resonance:'112.7%',duplicate:'105.5%'}[_emptyMapPowerId]||'100%';
        ph.style.setProperty('background',`url("${Assets.mapBoard[_emptyMapPowerId]}") center/${_boardWidth} 100% no-repeat`,'important');
        ph.style.setProperty('outline','5px solid #c49a6c','important');
        ph.style.setProperty('outline-offset','-5px','important');
        ph.style.setProperty('box-shadow','inset 0 0 0 5px #c49a6c','important');
      }
      if(arrName==='unitEquip'&&_emptyMapPowerId){
        // ①〜⑦：戦闘フェイズで出撃する枠（m_board1.svgで区別する）
        ph.classList.add('deploy-slot');
      }
      if(arrName==='spells') ph.classList.add('belt-empty');
      ph.style.setProperty('--hand-i',_handPos);
      ph.style.setProperty('--hand-mid',_handMid);
      ph.style.setProperty('--hand-arc',_handArc);
      if(arrName==='unitEquip'&&_slotDef){
        const _emptyPowerDef=_emptyPowerId&&typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.find(p=>p.id===_emptyPowerId):null;
        if(_emptyPowerDef){
          ph.setAttribute('data-panel-power-preview',[
            _emptyPowerDef.name,
            _emptyPowerDef.desc||''
          ].filter(Boolean).join('\n'));
        }
        ph.innerHTML=`<div class="equip-slot-label">${_slotDef.label}${_emptyPowerDef?`<small>${_emptyPowerDef.name}</small>`:''}</div>`;
      }
      ph.addEventListener('dragover',e=>{
        if(arrName==='globalPanels') return;
        if(arrName==='unitEquip'&&_dragSrc&&_dragSrc.arr==='rew'&&_isItemCard(_rewCards[_dragSrc.idx])) return;
        if(arrName==='unitEquip'&&_dragSrc){
          const c=_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:_dragSrc.arr==='inventory'?G.inventory[_dragSrc.idx]:_dragSrc.arr==='unitEquip'?(_getPartyBoardUnit()?.equipment||[])[_dragSrc.idx]:_dragSrc.card;
          if(!_libraryTutorialAllowsMove(c,i)) return;
        }
        e.preventDefault(); ph.classList.add('drag-over');
      });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{
        e.preventDefault(); ph.classList.remove('drag-over');
        if(arrName==='globalPanels') return;
        ph._skipNextClick=true;
        if(arrName==='unitEquip'&&_dragSrc){
          const c=_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]:_dragSrc.arr==='inventory'?G.inventory[_dragSrc.idx]:_dragSrc.arr==='unitEquip'?(_getPartyBoardUnit()?.equipment||[])[_dragSrc.idx]:_dragSrc.card;
          if(!_libraryTutorialAllowsMove(c,i)){ _dragSrc=null; return; }
        }
        if(arrName==='unitEquip'&&_dragSrc){
          if(_dragSrc.arr==='spellSlots'){
            _dragSrc=null;
            return;
          }
          const srcCard=_dragSrc.arr==='inventory'?G.inventory[_dragSrc.idx]
            :_dragSrc.arr==='unitEquip'?(_getPartyBoardUnit().equipment||[])[_dragSrc.idx]
            :_dragSrc.arr==='rew'?_rewCards[_dragSrc.idx]
            :null;
          if(srcCard&&!_canCardUseEquipSlot(srcCard,i,_getPartyBoardUnit())){
            _dragSrc=null;
            return;
          }
        }
        dropOnCard(arrName,i);
      });
      if(arrName==='unitEquip') ph.onclick=e=>{
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
  }
  if(arrName==='unitEquip'){
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
  const eq=Array.isArray(unit.equipment)?unit.equipment:[];
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
      const srcEl=host.querySelector(`[data-equip-idx="${idx}"]`);
      const dstEl=host.querySelector(`[data-equip-idx="${targetIdx}"]`);
      if(!srcEl||!dstEl) return;
      const vertical=(d==='up'||d==='down');
      // ページ全体が--game-scale（3840x2160基準レイアウトを実ビューポートに合わせて縮小するCSS transform）で
      // 縮小表示されているため、getBoundingClientRect()はビューポート座標（縮小後）を返す。
      // position:absoluteのleft/topはホスト要素のローカル座標（縮小前＝基準レイアウト座標）で解釈されるため、
      // ここで--game-scaleで割って座標系を変換しないと、マーカーが実際の中間点からずれて表示される。
      const _gameScale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
      const hr=host.getBoundingClientRect();
      const sr=srcEl.getBoundingClientRect();
      const dr=dstEl.getBoundingClientRect();
      const sx=(sr.left-hr.left)/_gameScale+host.scrollLeft, sy=(sr.top-hr.top)/_gameScale+host.scrollTop, sw=sr.width/_gameScale, sh=sr.height/_gameScale;
      const dx=(dr.left-hr.left)/_gameScale+host.scrollLeft, dy=(dr.top-hr.top)/_gameScale+host.scrollTop, dw=dr.width/_gameScale, dh=dr.height/_gameScale;
      let midX,midY;
      if(vertical){
        midX=(sx+sw/2+dx+dw/2)/2;
        midY=sy<dy?(sy+sh+dy)/2:(dy+dh+sy)/2;
      } else {
        midY=(sy+sh/2+dy+dh/2)/2;
        midX=sx<dx?(sx+sw+dx)/2:(dx+dw+sx)/2;
      }
      const marker=document.createElement('img');
      marker.src=vertical?'assets/cards/unite_a.png':'assets/cards/unite_b.png';
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

function dropOnCard(destArr,destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  const srcUnitIdx=_dragSrc.unitIdx;
  const debugCard=_dragSrc.card||null;
  const srcCard=srcArr==='debugPanel'?debugCard
    :srcArr==='rew'?_rewCards[srcIdx]
    :srcArr==='inventory'?G.inventory[srcIdx]
    :srcArr==='unitEquip'?(_getPartyBoardUnit()?.equipment||[])[srcIdx]
    :null;
  if(destArr==='unitEquip'&&!_libraryTutorialAllowsMove(srcCard,destIdx)){
    _dragSrc=null;
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    return;
  }
  _dragSrc=null;
  if(srcArr==='debugPanel'){
    if(destArr!=='unitEquip'||!debugCard) return;
    G._pendingPanelPlacement={card:_preparePanelCard(debugCard),onPlaced:null,sourceName:'DEBUG',rewardIdx:-1};
    placePendingPanelToSelectedUnit(destIdx);
    return;
  }
  // 報酬カード（パネル）のドロップ購入
  if(srcArr==='rew'){
    const card=_rewCards[srcIdx];
    if(_isItemCard(card)) return;
    takeRewCard(srcIdx,destArr==='unitEquip'?destIdx:undefined);
    return;
  }
  const _arrOf=name=>name==='rings'?G.rings:name==='inventory'?G.inventory:G.spells;
  if(destArr==='unitEquip'){
    const destUnit=_getPartyBoardUnit();
    if(!destUnit||!_isNonCombatEquipPhase()) return;
    const destEquips=_normalizeUnitEquipment(destUnit);
    // メイン置き場は所有者を持たない単一の共有ボードのため、unitEquip同士の移動は常に同じボード内の操作になる
    const srcUnit=srcArr==='unitEquip'?destUnit:null;
    const srcEquips=srcArr==='unitEquip'?destEquips:null;
    const src=_arrOf(srcArr);
    const card=srcArr==='unitEquip'?(srcEquips&&srcEquips[srcIdx]):src[srcIdx];
    if(srcArr==='unitEquip'&&srcIdx===destIdx) return;
    if(!card||!_canCardUseEquipSlot(card,destIdx,destUnit)) return;
    const destCard=destEquips[destIdx]||null;
    const merged=_mergedPanelCard(destCard,card);
    if(merged){
      const nextEquips=destEquips.slice();
      nextEquips[destIdx]=merged;
      if(!_canApplyUnitEquipChange(destUnit,nextEquips)) return;
      if(srcArr==='unitEquip'){
        if(!srcEquips) return;
        _clearStarterPanelMarker(srcUnit,srcIdx,card);
        srcEquips[srcIdx]=null;
      } else {
        src[srcIdx]=null;
      }
      destEquips[destIdx]=merged;
      _syncUnitPanelEffectsAfterMove(destUnit);
      if(srcUnit) _syncUnitPanelEffectsAfterMove(srcUnit);
      if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
      renderHandEditor();
      if(srcArr==='unitEquip'&&typeof playSfx==='function') playSfx('fit',{group:'reward'});
      _flashConnectedBoardCards(destIdx);
      renderFieldEditor();
      renderMapInventorySlots();
      return;
    }
    if(srcArr==='unitEquip'){
      if(!srcEquips) return;
      const srcUnitForSlot=destUnit;
      if(destCard&&!_canCardUseEquipSlot(destCard,srcIdx,srcUnitForSlot)) return;
      const nextEquips=srcEquips.slice();
      nextEquips[srcIdx]=destCard;
      nextEquips[destIdx]=card;
      if(!_canApplyUnitEquipChange(srcUnitForSlot,nextEquips)) return;
      _clearStarterPanelMarker(srcUnitForSlot,srcIdx,card);
      _clearStarterPanelMarker(destUnit,destIdx,destCard);
      srcEquips[srcIdx]=destCard;
    } else {
      const nextEquips=destEquips.slice();
      nextEquips[destIdx]=card;
      if(!_canApplyUnitEquipChange(destUnit,nextEquips)) return;
      _clearStarterPanelMarker(destUnit,destIdx,destCard);
      src[srcIdx]=destCard;
    }
    destEquips[destIdx]=card;
    _syncUnitPanelEffectsAfterMove(destUnit);
    if(srcUnit) _syncUnitPanelEffectsAfterMove(srcUnit);
    if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
    renderHandEditor();
    const tripleMerge=_tryTripleMergeOnBoard(destUnit,destIdx);
    if(tripleMerge){
      _syncUnitPanelEffectsAfterMove(destUnit);
      if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
    }
    if(!tripleMerge&&srcArr==='unitEquip'&&typeof playSfx==='function') playSfx('fit',{group:'reward'});
    _flashConnectedBoardCards(destIdx);
    renderFieldEditor();
    renderMapInventorySlots();
    if(tripleMerge) _playTripleMergeAnimation(tripleMerge);
    return;
  }
  if(srcArr===destArr){
    // 同一配列内の入れ替え
    const arr=_arrOf(srcArr);
    const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  } else if((srcArr==='spells'||srcArr==='inventory')&&(destArr==='spells'||destArr==='inventory')&&_isNonCombatEquipPhase()){
    const src=_arrOf(srcArr);
    const dst=_arrOf(destArr);
    const tmp=src[srcIdx]; src[srcIdx]=dst[destIdx]||null; dst[destIdx]=tmp||null;
  } else {
    return;
  }
  renderHandEditor();
  renderMapInventorySlots();
}

function discardHeCard(arrName, idx){
  const arr=arrName==='rings'?G.rings:G.spells;
  const card=arr[idx]; if(!card) return;
  arr[idx]=null;
  if(card&&card.type==='panel'&&typeof returnPanelToSalePool==='function') returnPanelToSalePool(card);
  const refund=cardRefund(card);
  if(refund>0){
    if(typeof onGoldGained==='function') onGoldGained(refund);
    else G.gold=(G.gold||0)+refund;
    refreshRewardGoldUi();
    try{ log(card.name+' を還魂（+'+refund+'ゴールド）','gold'); }catch(e){}
  } else {
    try{ log(card.name+' を破棄','sys'); }catch(e){}
  }
  renderHandEditor();
  try{ renderEnemyHand(); }catch(e){}
  try{ renderGradeUpBtn(); }catch(e){}
}

// ── 報酬グレードアップUI（ボタンは常時非表示・到達不能） ────

function renderGradeUpBtn(){
  const el=document.getElementById('rw-grade-up-btn');
  if(!el) return;
  el.style.display='none';
}

// ── イベント（祭壇・宿屋）単品アイテム受け取り画面 ─────
// onDone は受け取り後または「戻る」を押したときに呼ばれるコールバック
