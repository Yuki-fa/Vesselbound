// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _placingChar=null; // フィールド配置待ちのキャラカード
let _rewFreePickDone=false; // 通常報酬フェイズで無料取得済みフラグ
let _rewPhaseId=0; // この報酬フェイズで取得したカードだけを戻せるよう識別する
const REWARD_GRID_CAPACITY=7; // 報酬置き場：最大7枚
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
  return !!card&&(card.category==='スペル'||card.type==='spell'||card.kind==='spell');
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
  if(!Array.isArray(_rewCards)) _rewCards=[];
  let empty=_rewCards.findIndex(c=>!c);
  if(empty<0&&_rewCards.length<REWARD_GRID_CAPACITY) empty=_rewCards.length;
  if(empty<0||empty>=REWARD_GRID_CAPACITY) return false;
  while(_rewCards.length<empty) _rewCards.push(null);
  _rewCards[empty]=returned;
  return true;
}
// 報酬置き場の指定スロットへピンポイントで返却する（空きスロットのみ受け付ける）
function _pushToRewardAreaAt(card,idx){
  if(!card) return true;
  if(!Array.isArray(_rewCards)) _rewCards=[];
  if(!Number.isInteger(idx)||idx<0||idx>=REWARD_GRID_CAPACITY||_rewCards[idx]) return false;
  while(_rewCards.length<idx) _rewCards.push(null); // 穴（sparse hole）を作らないよう明示的にnullで埋める
  const returned=clone(_isCurrentRewardReturnCard(card)?card._rewardReturnCard:card);
  delete returned._rewardReturnCard;
  delete returned._rewardReturnIdx;
  delete returned._rewardReturnPhaseId;
  if(!_isCurrentRewardReturnCard(card)){
    returned._isOriginalReward=false;
    returned._temporaryRewardAreaCard=true;
  }
  _rewCards[idx]=returned;
  if(_isCurrentRewardReturnCard(card)) _rewFreePickDone=false;
  return true;
}
function _clearStarterPanelMarker(unit,idx,card){
  if(!unit||idx!==0||!card) return;
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
  if(!unit||unit.hp<=0) return false;
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
  renderHandEditor();
  renderFieldEditor();
  renderMapInventorySlots();
  renderMoveSlotsInEnemy();
  return true;
}
function placePendingPanelToSelectedUnit(slotIdx){
  const pending=G._pendingPanelPlacement;
  if(!pending||!pending.card) return false;
  if(pending.card.panelScope==='global'){
    G._showGlobalPanels=true;
    renderHandEditor();
    return false;
  }
  const unit=_getPartyBoardUnit();
  if(!unit||unit.hp<=0) return false;
  const equips=_normalizeUnitEquipment(unit);
  if(slotIdx<0||slotIdx>=equips.length) return false;
  const oldCard=equips[slotIdx]||null;
  const merged=_mergedPanelCard(oldCard,pending.card);
  const nextEquips=equips.slice();
  nextEquips[slotIdx]=merged||pending.card;
  if(!_canApplyUnitEquipChange(unit,nextEquips)) return false;
  if(oldCard&&!merged){
    _clearStarterPanelMarker(unit,slotIdx,oldCard);
    // 既存のカードは（このターンの報酬由来かどうかを問わず）報酬置き場の空きスロットへ退避する。
    // 空きが無い場合は上書きで消えてしまわないよう、配置自体を中止する。
    if(!_pushToRewardArea(oldCard)) return false;
  }
  const placed=merged||clone(pending.card);
  // このターンの報酬（_isOriginalReward）から取得した場合のみ「戻す」操作を無料取得フラグの解除に結び付ける。
  // 元々持っていた（報酬エリアに一時的に戻していただけの）カードを取り直しても無料取得権には影響しない。
  if(!merged&&pending.rewardIdx>=0&&pending.card._isOriginalReward){
    placed._rewardReturnCard=clone(pending.card);
    placed._rewardReturnIdx=pending.rewardIdx;
    placed._rewardReturnPhaseId=_rewPhaseId;
  }
  equips[slotIdx]=placed;
  _syncUnitPanelEffectsAfterMove(unit);
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  const done=pending.onPlaced;
  G._pendingPanelPlacement=null;
  _syncRewardPanelPlacementOverlay();
  if(done) done();
  renderHandEditor();
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
function renderMapInventory(){
  const btn=document.getElementById('map-inventory-toggle');
  const panel=document.getElementById('map-inventory-panel');
  const map=document.getElementById('world-map-panel');
  if(!btn||!panel) return;
  const isMap=G.phase==='map';
  const isShop=!!G._isShop&&G.phase==='reward';
  const canShow=isMap||isShop;
  btn.style.display=canShow?'':'none';
  btn.textContent=G.inventoryOpen?(isShop?'隠す':'マップ'):'インベントリ';
  panel.hidden=!(canShow&&G.inventoryOpen);
  if(map) map.hidden=!isMap;
  const grid=document.getElementById('world-map-grid');
  if(grid) grid.style.display=(isMap&&G.inventoryOpen)?'none':'';
  if(!canShow||!G.inventoryOpen) return;
  renderMapInventorySlots();
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
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
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
  return card.directions.map(d=>{
    if(connectivity&&connectivity[d]==='connected') return '';
    return cls[d]?`<span class="panel-dir ${cls[d]}"></span>`:'';
  }).join('');
}

// デバッグモード中、所持金の下の枠に「リロール」を表示する（戦闘中は#btn-debug-killが同じ枠に表示される）
function renderDebugRewardRerollButton(){
  const btn=document.getElementById('rw-appearance-mode');
  if(!btn) return;
  if(!G._debugMode||G.phase!=='reward'){
    btn.style.display='none';
    return;
  }
  btn.style.display='';
  btn.textContent='リロール';
  if(typeof _positionDebugRerollButton==='function') _positionDebugRerollButton();
}

function renderRaceBuffSummary(){
  const el=document.getElementById('rw-race-buffs');
  if(!el) return;
  el.textContent='';
  el.style.display='none';
}

// ── 報酬フェイズ開始 ────────────────────────────

function goToReward(){
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
  G._bossJustDefeated=false;

  _rewCards=drawRewards();
  G._retryRewardCards=null;
  _rewCards=_rewCards.filter(c=>c&&!c._isChar);
  _rewCards.forEach(c=>{ if(c) c._isOriginalReward=true; });
  G.phase='reward';
  G._battlePhaseRunning=false;
  document.body.classList.add('reward-screen-active');
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

  document.getElementById('rw-gold').textContent=rewardGoldText();
  document.getElementById('rw-count').textContent=G.rewardCharCount||3;
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.style.display=''; rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; rb.innerHTML=`<span class="card-badge">${_circleCost(1)}</span><span>リロール</span>`; }
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

// ── 行き先ノード表示 ───────────────────────────

function renderMoveSlotsInEnemy(){
  const el=document.getElementById('reward-move-btns');
  if(!el) return;
  el.innerHTML='';
  if(G._isShop||(typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G.worldMap)){
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.textContent='店を去る';
    btn.onclick=()=>{ if(G._pendingPanelPlacement) return; if(typeof shopDone==='function') shopDone(); };
    el.appendChild(btn);
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
    const _icon=opt.nodeType==='boss'?'💀':'⚔️';
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.innerHTML=`<span style="font-size:1.1rem">${_icon}</span>`;
    btn.onclick=()=>chooseMoveInline(opt.nodeType);
    if(G._pendingPanelPlacement||G._moveInlineLocked){ btn.classList.add('disabled'); btn.disabled=true; }
    el.appendChild(btn);
  });
}

function chooseMoveInline(nt){
  if(G._pendingPanelPlacement) return;
  if(G._moveInlineLocked) return; // 連打による戦闘開始の二重発火を防止
  G._moveInlineLocked=true;
  G._isShop=false; // 行商モード解除
  setTimeout(()=>{
    G._moveInlineLocked=false;
    if(G._pendingPanelPlacement) return;
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
  if(G._pendingPanelPlacement) return;
  if(G.gold<1) return;
  G.gold-=1;
  if(typeof playSfx==='function') playSfx('reroll',{group:'ui'});
  G.rerollCount=(G.rerollCount||0)+1;
  // 非タウン：リロール時に無料取得権をリセット（新プールから1体無料）
  // 召喚済みキャラも含め全リセット
  _rewCards=drawRewards();
  _rewCards=_rewCards.filter(c=>c&&!c._isChar);
  _rewCards.forEach(c=>{ if(c) c._isOriginalReward=true; });

  document.getElementById('rw-gold').textContent=rewardGoldText();
  document.getElementById('rw-count').textContent=G.rewardCharCount||3;
  updateHUD();
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; rb.innerHTML=`<span class="card-badge">${_circleCost(1)}</span><span>リロール</span>`; }
  renderDebugRewardRerollButton();
  renderRewCards();
  renderEnemyHand();
  renderGradeUpBtn();
  renderRaceBuffSummary();
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
  return !!_dragSrc&&['unitEquip','spellSlots','inventory'].includes(_dragSrc.arr);
}
function _returnDragSrcToRewardArea(targetIdx){
  if(!_dragSrc) return;
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
  const restored=(Number.isInteger(targetIdx)&&targetIdx>=0)
    ?_pushToRewardAreaAt(card,targetIdx)
    :(_restoreRewardReturnCard(card)||_pushToRewardArea(card));
  if(!restored) return;
  _dragSrc=null;
  if(src.arr==='unitEquip'){
    _clearStarterPanelMarker(unit,src.idx,card);
    unit.equipment[src.idx]=null;
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
function renderRewCards(){
  _syncRewardPanelPlacementOverlay();
  const section=document.getElementById('battle-order-section');
  const el=document.getElementById('battle-order-row');
  if(!section||!el) return;
  if(G.phase!=='reward'){ section.style.display='none'; el.innerHTML=''; return; }
  section.style.display='';
  el.innerHTML='';
  if(!el._wiredForReturn){
    el._wiredForReturn=true;
    el.addEventListener('dragover',e=>{
      if(_canReturnDragSrcToRewardArea()){ e.preventDefault(); el.classList.add('drag-over'); }
    });
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',e=>{
      e.preventDefault(); el.classList.remove('drag-over');
      if(!_canReturnDragSrcToRewardArea()) return;
      _returnDragSrcToRewardArea();
    });
  }
  const _rewardPickUsed=!!(G._rewardOnePickMode&&_rewFreePickDone);
  const pendingRewardIdx=G._pendingPanelPlacement?G._pendingPanelPlacement.rewardIdx:-1;
  if(G._isShop){
    for(let i=0;i<7;i++){
      const card=_rewCards[i]||null;
      if(!card) continue;
      const d=_mkRewDiv(card,()=>takeRewCard(i),i);
      if(pendingRewardIdx===i) d.classList.add('pending-placement');
      el.appendChild(d);
    }
    requestAnimationFrame(fitCardDescs);
    return;
  }
  _rewCards=_rewCards.filter(card=>!card||!card._isChar);
  _rewCards.forEach((card,i)=>{
    if(!card) return;
    const d=_mkRewDiv(card,()=>takeRewCard(i),i);
    if(pendingRewardIdx===i) d.classList.add('pending-placement');
    if(_rewardPickUsed&&card._isOriginalReward){ d.onclick=null; d.style.opacity='0.5'; d.style.cursor='default'; }
    el.appendChild(d);
  });
  const rbLegacy=document.getElementById('rw-reroll'); if(rbLegacy){ const _rbDis=!!G._pendingPanelPlacement||G.gold<1||(G._rewardOnePickMode&&_rewFreePickDone); rbLegacy.disabled=_rbDis; rbLegacy.style.opacity=_rbDis?'0.4':''; }
  requestAnimationFrame(fitCardDescs);
}
function renderBattleOrderRow(show){
  // 配置順（戦闘順序）システムは廃止。この位置には報酬カードを表示する（renderRewCardsに一本化）。
  if(typeof renderRewCards==='function') renderRewCards();
}

function _mkRewDiv(card, onBuy, rewIdx){
  const cost=Math.max(0,(card._buyPrice??1));
  const canBuy=!G._isRewardTown||G._freeRewardPanelMode||cost===0||G.gold>=cost;
  const isLegend=!!card._isLegend;
  const isTreasure=!!card._isTreasure;
  const div=(typeof mkCardEl==='function'&&!card._isChar)?mkCardEl(card,rewIdx??-1,'reward'):document.createElement('div');
  div.classList.add('rew-card');
  if(card.rarity>=1&&card.rarity<=5) div.classList.add(`rarity-${card.rarity}`);
  if(!canBuy) div.classList.add('cant');
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
    div.className='rew-card character-card'+(canBuy&&!disabled?'':' cant')+(isLegend?' legend':'');
    const raceBadge=`<div style="font-size:.55rem;color:var(--text2);margin-bottom:1px">${card.race||'-'}</div>`;
    const atkStr=`<span style="color:var(--teal2)">${card.atk}</span>`;
    const statsLine=`<div style="font-size:.68rem;font-weight:700;margin-top:2px">${atkStr}<span style="color:var(--text2)">/</span><span style="color:#60d090">${card.hp}</span></div>`;
    const costLine=G._isRewardTown?`<div class="rew-card-cost">${cost}ゴールド${disabled?' （盤面満杯）':''}</div>`:disabled?`<div class="rew-card-cost">（盤面満杯）</div>`:'';
    const uniqueBadge=card.unique?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
    const gradeTag='';
    const shortBadge=!canBuy&&!isTreasure?`<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 4px;font-size:.48rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ゴールド不足</div>`:'';
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
    div.innerHTML=`${shortBadge}${costLine}<div class="rew-card-art"></div><div style="font-size:.62rem;color:var(--purple2);margin-bottom:1px">キャラクター</div>${raceBadge}<div class="rew-card-name">${card.name}${gradeTag}</div>${_rewCharDesc?`<div class="rew-card-desc">${_rewCharDesc}</div>`:''}<div style="font-size:.5rem;color:var(--text2);margin:1px 0">${[...new Set(card.keywords||[])].filter(Boolean).join('　')}</div>${statsLine}${uniqueBadge}`;
    if(canBuy&&!disabled) div.onclick=onBuy;
    return div;
  }

  _pinPanelTextPosition(div,'reward');
  // 価格バッジはショップかつ価格1以上の場合のみ。無料報酬（cost===0）ではDOM自体を作らない
  const showPriceBadge=!!G._isShop&&cost>0;
  if(showPriceBadge){
    let badge=div.querySelector('.card-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='card-badge';
      div.appendChild(badge);
    }
    badge.innerHTML=_circleCost(cost);
  } else {
    div.querySelector('.card-badge')?.remove();
  }
  if(G._isRewardTown&&!canBuy&&!isTreasure){
    const shortBadgeItem=document.createElement('div');
    shortBadgeItem.style.cssText='position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10';
    shortBadgeItem.textContent='ゴールド不足';
    div.appendChild(shortBadgeItem);
  }
  if(canBuy&&G._isShop) div.onclick=onBuy;
  if(G._pendingPanelPlacement&&G._pendingPanelPlacement.rewardIdx===rewIdx){
    const cancelBtn=document.createElement('button');
    cancelBtn.className='discard-btn reward-cancel-panel';
    cancelBtn.title='再選択';
    cancelBtn.textContent='×';
    cancelBtn.onclick=ev=>{ ev.stopPropagation(); cancelPendingPanelPlacement(); };
    div.appendChild(cancelBtn);
  }
  if(rewIdx!=null){
    const _rewardDragLocked=!!G._pendingPanelPlacement||(_rewFreePickDone&&!!card._isOriginalReward);
    div.draggable=!_rewardDragLocked;
    if(_rewardDragLocked) div.classList.add('reward-drag-locked');
    div.addEventListener('dragstart',e=>{
      if(_rewardDragLocked){
        e.preventDefault();
        return;
      }
      _dragSrc={arr:'rew',idx:rewIdx};
      _pinPanelTextPosition(div,'reward');
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setDragImage(_transparentDragImg,0,0);
      _setDragZoneClass(_isSpellCard(card)?'dragzone-reward-spell':'dragzone-reward-nonspell');
      _createDragGhost(div);
      div.classList.add('dragging');
    });
    div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; });
  }
  return div;
}

// ── カード購入処理 ──────────────────────────────

function takeRewCard(i, targetSlot){
  if(G._pendingPanelPlacement) return;
  const card=_rewCards[i]; if(!card) return;
  const isTown=G._isRewardTown;
  const cost=card._isChar?(card._buyPrice??1):Math.max(0,(card._buyPrice??1));

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
    if(isTown){ G.gold-=(card._buyPrice??1); } else if(card._isOriginalReward){ _rewFreePickDone=true; }
    const unit=makeUnitFromDef(card, undefined, true); // 購入：効果召喚ボーナスは対象外
    G.allies[emptyIdx]=unit;
    // 提示カードから購入したキャラは後衛で配置
    unit.hate=false;
    unit.hateTurns=0;
    if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
    // 召喚時効果（addAlly と同じ処理を実行）
    if(['grimalkin_summon','imp_summon','rukh_summon','medusa_summon','ogre_summon'].includes(unit.effect)&&typeof applyUnitSummonEffect==='function') applyUnitSummonEffect(unit,null);
    // 指輪の on_summon トリガーを発火（現状 fireTrigger は no-op）
    fireTrigger('on_summon', null);
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=rewardGoldText();
    updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
    return;
  }

  if(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope){
    if(G._rewardOnePickMode&&_rewFreePickDone&&card._isOriginalReward)return;
    const finish=()=>{
      if(isTown&&!G._freeRewardPanelMode){ G.gold-=cost; }
      if(card._isOriginalReward) _rewFreePickDone=true;
      if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
      _rewCards.splice(i,1);
      document.getElementById('rw-gold').textContent=rewardGoldText();
      updateHUD(); renderRewCards(); renderFieldEditor(); renderHandEditor(); renderEnemyHand(); renderGradeUpBtn();
    };
    if(!startPanelPlacement(card,finish,'報酬')) return;
    if(targetSlot!=null&&typeof placePendingPanelToSelectedUnit==='function'){
      if(!placePendingPanelToSelectedUnit(targetSlot)) cancelPendingPanelPlacement();
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
      const hasGuard=!isPlayerHero&&((unit._panelSummoned&&unit.guardian)||((unit._panelSummoned)&&(unit.keywords||[]).includes('守護')));
      div.className='slot unit-card'+(unit.hp<=0?' dead-unit inert':'')+(unit.hp>0&&!isPlayerHero&&((unit.hate&&unit.hateTurns>0)||hasGuard)?' is-defender uses-hate-frame':'')+(G._selectedEquipUnitIdx===i?' selected':'');
      if(unit.name==='石像') div.classList.add('no-unit-shadow');
      if(typeof applyUnitVisual==='function') applyUnitVisual(div,unit);
      div.draggable=true;
      const badges=[];
      const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';}; 
      // 標的バッジは非表示（is-front の視覚的シフトで代用）
      if(unit.guardian)badges.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
      if(unit.shield>0)badges.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
      if(unit.instadead)badges.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
      if(unit.poison>0)badges.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${unit.poison}</span>`);
      if(unit.regen)badges.push(`<span class="slot-badge b-regen"${_sd('再生')}>再生${unit.regen}</span>`);
      if(unit.stealth)badges.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
      if(unit.allyTarget)badges.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
      const badgeBlock=badges.length?`<div class="slot-badges">${badges.join('')}</div>`:'';
      const gradeTag='';
      const _rawDesc=unit.desc?computeDesc(unit):'';
      const _desc=_stripKeywordsFromDesc(_rawDesc,unit);
      const descTag=typeof _unitCombinedDescHtml==='function'?_unitCombinedDescHtml(unit,_desc):(_desc?`<div class="slot-desc">${_desc}</div>`:'');
      // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
      // 既にアイコン化済みの_desc（<img alt="マナ">を含む）ではなくプレーンテキストを渡す
      // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
      const _plainDesc=unit.desc&&typeof _rawSubstitutedDesc==='function'?_stripKeywordsFromDesc(_rawSubstitutedDesc(unit),unit):_desc;
      const _preview=typeof _unitPreviewText==='function'?_unitPreviewText(unit,_plainDesc):_plainDesc;
      if(_preview) div.setAttribute('data-preview',_preview);
      const raceTag='';
      const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','結束':'#80d0d0','邪眼':'#c060c0','弱体':'#c08040','シールド':'#60a0e0','標的':'#60c0c0','成長':'#60d090'};
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
const _DRAG_ZONE_CLASSES=['dragzone-battleorder','dragzone-reward-spell','dragzone-reward-nonspell','dragzone-mainequip','dragzone-spellslot'];
function _setDragZoneClass(cls){
  document.body.classList.remove(..._DRAG_ZONE_CLASSES);
  if(cls) document.body.classList.add(cls);
}
function _clearDragZoneClass(){
  document.body.classList.remove(..._DRAG_ZONE_CLASSES);
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
  // どのカードをドラッグしても常にtrueになってしまう（出撃枠のドラッグ時に誤ってcard_back_o.pngへ
  // 切り替わるバグの原因だった）。実際に戦闘中のフィールド上ユニットをドラッグしている場合のみ、
  // または報酬フェイズ以外でのドラッグの場合のみ「戦闘中のドラッグ」として扱う。
  const isBattleDrag = !!(srcEl && (srcEl.closest('#f-ally,#f-enemy') || (typeof G !== 'undefined' && G && G.phase !== 'reward')));
  if(isBattleDrag) document.body.classList.add('dragging-in-battle');
  const d=srcEl.cloneNode(true);
  d.querySelectorAll('button').forEach(b=>b.remove()); // 還魂ボタン等を除去
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
  _dragGhostDiv.style.visibility='visible';
}
function _removeDragGhost(){
  document.body.classList.remove('dragging-in-battle');
  if(_dragGhostDiv){ _dragGhostDiv.remove(); _dragGhostDiv=null; }
  setTimeout(()=>{
    try{ document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true})); }catch(e){}
  },0);
}

// ── 手札エディタ（アイテム）──────────────────────

let _dragSrc=null;
function isEquipmentCard(card){
  return !!(card&&(card.equip||card.kind==='equipment'||card.type==='ring'||card.type==='panel'||card.kind==='panel'||card.panelScope==='unit'));
}
// メイン置き場：7列×3行＝21枠。所有者（ヒーロー）の概念は廃止し、パーティ全体で共有する単一のグリッド。
// ①②③④⑤⑥⑦の位置に置いたキャラクターだけが戦闘フェイズで出撃する（①②③④→前衛、⑤⑥⑦→後衛）。
// それ以外の枠（■）にもキャラクター・強化どちらも自由に置けるが、戦闘には出撃しない（隣接強化としては機能する）。
// 最初からどの枠にも置くことができ、使用不能スロットは存在しない。
//   ①■②■③■④
//   ■■■■■■■
//   ■⑤■⑥■⑦■
const MAIN_BOARD_SIZE=21;
const MAIN_BOARD_DEPLOY_SLOTS=[0,2,4,6,15,17,19];
const MAIN_BOARD_FRONT_SLOTS=[0,2,4,6];
const MAIN_BOARD_REAR_SLOTS=[15,17,19];
const UNIT_EQUIP_SLOTS=Array.from({length:MAIN_BOARD_SIZE},()=>({label:'',kind:'any'}));
// 装備欄描画・編集ロジックを既存のまま使い回すための仮想「所有者」。
// battle系のG.alliesには入れず、.equipmentは常にG.mainBoardそのものを参照する（書き込みが直接反映される）。
function _getPartyBoardUnit(){
  if(!Array.isArray(G.mainBoard)||G.mainBoard.length!==MAIN_BOARD_SIZE){
    const next=new Array(MAIN_BOARD_SIZE).fill(null);
    (G.mainBoard||[]).forEach((c,i)=>{ if(i<MAIN_BOARD_SIZE) next[i]=c||null; });
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
  if(typeof _applyAdjacentPanelEnhancements==='function'&&typeof _collectAdjacentEnhancements==='function'){
    _applyAdjacentPanelEnhancements(unit,_collectAdjacentEnhancements(unit,0));
  }else if(typeof refreshUnitPanelEffects==='function'){
    refreshUnitPanelEffects(unit);
  }
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
  return base;
}
function _mergedPanelCard(a,b){
  if(!a||!b||typeof PANEL_POOL==='undefined'||typeof makePanel!=='function') return null;
  const names=[String(a.name||'').trim(),String(b.name||'').trim()].sort().join('\n');
  const def=PANEL_POOL.find(p=>{
    if(!Array.isArray(p.mergeFrom)||p.mergeFrom.length!==2) return false;
    return p.mergeFrom.map(v=>String(v||'').trim()).sort().join('\n')===names;
  });
  return def?makePanel(def.id):null;
}
// メイン置き場（配置順）は戦闘フェイズ（'player'＝プレイヤー操作中／'enemy'＝自動解決中）を通して変更不可。
// 報酬フェイズ（戦闘間・初回開始時）のみ編集可能。
function _isNonCombatEquipPhase(){
  return G.phase==='reward';
}
if(!window._equipSelectionClearBound){
  window._equipSelectionClearBound=true;
  document.addEventListener('contextmenu',e=>{
    if(G.phase==='reward'&&G._pendingPanelPlacement){
      e.preventDefault();
      cancelPendingPanelPlacement();
    }
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
  zone.className='spell-slot-zone';
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
    if(card._isOriginalReward) _rewFreePickDone=true;
    _rewCards.splice(idx,1);
    renderRewCards();
    renderHandEditor();
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
      const preview=[card.name,typeof _previewRarityLine==='function'?_previewRarityLine(card):'',card.desc||''].filter(Boolean).join('\n');
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
        if(card._isOriginalReward) _rewFreePickDone=true;
        _rewCards.splice(rewIdx,1);
        renderRewCards();
        renderHandEditor();
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
  {key:'library',label:'図書館',desc:'リロール可能数が増える。'},
  {key:'university',label:'大学',desc:'戦闘開始時に使える魔法が増える。'}
];

function rewardGoldText(){
  return `${G.gold||0}`;
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
  document.getElementById('rw-gold').textContent=rewardGoldText();
  updateHUD();
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
  _syncRewardPanelPlacementOverlay();
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
  if(typeof renderBattleOrderRow==='function') renderBattleOrderRow(G.phase==='reward'&&!G._isShop);
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
  requestAnimationFrame(fitCardDescs);
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
  el.style.setProperty('grid-template-columns',battleMagic?'repeat(2,var(--hand-card-w))':(rewardUnitPanels?'repeat(7,var(--hand-card-w))':`repeat(${Hcols},var(--hand-card-w,300px))`),'important');
  if(battleMagic) el.style.setProperty('grid-template-rows','repeat(3,var(--hand-card-h))','important');
  if(rewardUnitPanels) el.style.setProperty('grid-template-rows','repeat(3,var(--hand-card-h))','important');
  el.style.setProperty('justify-content',battleMagic?'start':(elId==='hand-slots'?'center':((arrName==='unitEquip'||arrName==='globalPanels')?'center':'start')),'important');
  if(elId==='hand-slots'){
    const handPane=document.getElementById('hand-pane');
    if(handPane){
      const rewardUnitPanelW='calc(var(--hand-card-w) * 7 + var(--field-gap) * 6)';
      const rewardUnitPanelH='calc(var(--hand-card-h) * 3 + var(--field-gap) * 2)';
      handPane.style.setProperty('left',battleMagic?'var(--right-stack-left)':'50%','important');
      handPane.style.setProperty('right','auto','important');
      handPane.style.setProperty('top',battleMagic?'250px':(rewardUnitPanels?'650px':'auto'),'important');
      handPane.style.setProperty('bottom',(battleMagic||rewardUnitPanels)?'auto':'62px','important');
      handPane.style.setProperty('width',battleMagic?'var(--right-stack-w)':(rewardUnitPanels?rewardUnitPanelW:'2440px'),'important');
      handPane.style.setProperty('height',battleMagic?'calc(var(--hand-card-h) * 3 + var(--field-gap) * 2)':(rewardUnitPanels?rewardUnitPanelH:'var(--hand-card-h)'),'important');
      handPane.style.setProperty('transform',battleMagic?'none':'translateX(-50%)','important');
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
      if(_slotDef) div.classList.add(`equip-slot-${_slotDef.kind}`);
      if(_deployNum>=0){ div.classList.add('deploy-slot'); }
      const _selectedEquipDead=arrName==='unitEquip'&&_getPartyBoardUnit()?.hp<=0;
      const _combatEquipView=arrName==='unitEquip'&&((G.phase==='player'||!_isNonCombatEquipPhase())||_selectedEquipDead);
      const _combatEquipInInventory=arrName==='spells'&&!_isNonCombatEquipPhase()&&isEquipmentCard(card);
      const _battleHandDisabled=arrName==='spells'&&G.phase==='player'&&!card.allowBattleUse;
      if(_combatEquipView) div.classList.add('equip-combat-view');
      if(_combatEquipInInventory) div.classList.add('equip-combat-dim');
      if(_battleHandDisabled) div.classList.add('equip-combat-dim');
      if(typeof applyCardVisual==='function') applyCardVisual(div,card);
      else if(typeof getCardAsset==='function'&&typeof assetUrl==='function') div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
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
      if(arrName==='unitEquip'&&_isPanelCharacter&&_deployNum<0) div.classList.add('invalid-battle-position');
      const _isEnchantPanelForClass=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&['強化','エンチャント'].includes(String(card.category||''));
      if(_isEnchantPanelForClass) div.classList.add('enchantment-card');
      const _gradeEl='';
      const _manaCostEl=typeof cardManaCostHtml==='function'?cardManaCostHtml(card):'';
      const _isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
      const _isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
      const _isActionPanel=card&&(card.fixedAttack||card.fixedEquip||((card.type==='panel'||card.kind==='panel'||card.panelScope)&&!_isPassivePanel&&!_isCombatPowerPanel&&card.panelScope!=='global'));
      const _isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
      const _charges=t==='wand'?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?')):(!_isPanelCard&&_isActionPanel?(card.cost>0?card.cost:1):null);
      const _chargeHtml=_charges!==null?`<div class="card-charge">${_charges}</div>`:'';
      const _spellBtn=arrName==='unitEquip'
        ?(_isCurrentRewardReturnCard(card)?`<button class="discard-btn reward-return-btn" title="報酬に戻す">×</button>`:'')
        :arrName==='globalPanels'
        ?''
        :G._isShop?`<button class="discard-btn" title="売却+1ゴールド" style="color:var(--gold2)">×</button>`:`<button class="discard-btn" title="破棄">×</button>`;
      const _slotLabel=_slotDef?`<div class="equip-slot-label">${_slotDef.label}</div>`:'';
      const _dirOwner=arrName==='unitEquip'?_getPartyBoardUnit():null;
      const _dirConnectivity=_dirOwner&&typeof _panelDirectionConnectivity==='function'?_panelDirectionConnectivity(_dirOwner,i):null;
      const _dirMarks=typeof panelDirectionMarksHtml==='function'?panelDirectionMarksHtml(card,_dirConnectivity):'';
      if(_isPanelCharacter){
        const _panelOwner=arrName==='unitEquip'?_getPartyBoardUnit():null;
        const st=_panelCharacterPreviewStats(_panelOwner,arrName==='unitEquip'?i:null,card);
        const pAtk=st.atk, pHp=st.hp;
        // シート「キーワード」列由来のcard.keywordsに、このスロットへ隣接接続している強化パネルの
        // 付与キーワードもマージした上で_unitPreviewText()に渡す（敵ユニットと同じ表示規則で
        // 「キーワード：〇〇」行として太字合成される。本文が空のカードでも説明が空にならない）。
        // equipmentは実際の盤面（_panelOwner.equipment＝G.mainBoard）を参照させることで、
        // _unitPreviewText内部の_groupedEnchantEffectTexts()が接続中の強化カード効果全文も
        // 正しく含められるようにする（キーワードのみ渡すと接続効果文が別途二重表示されてしまう）。
        const _enh=_panelOwner&&typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(_panelOwner,i):{keywords:[]};
        const _cardForPreview=_panelOwner?{...card,keywords:[...(card.keywords||[]),...(_enh.keywords||[])],equipment:_panelOwner.equipment}:card;
        const preview=typeof _unitPreviewText==='function'?_unitPreviewText(_cardForPreview,card.desc||'',i):(card.name+'\n'+(card.desc||''));
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}<div class="card-art"></div><span class="card-summon-atk">${pAtk}</span><span class="card-summon-hp">${pHp}</span>${_spellBtn}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
        if(_panelOwner&&typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(div,_panelOwner,G._selectedEquipUnitIdx,i);
      }else if(_isPanelCard&&['強化','エンチャント'].includes(String(card.category||''))){
        // data-previewはホバー時に_formatPreviewHtmlで改めてHTMLタグ除去→マナアイコン挿入を行うため、
        // ここでcomputeDesc()の結果（既にマナアイコンの<img>タグが埋め込み済み）を使うとタグごと
        // 除去されて色情報が消えてしまう。生のcard.descを渡す。
        // 本文に「効果なし」を含む場合は説明文を表示しない。シート「キーワード」列（adjacentKeywords）が
        // あれば「キーワード：〇〇」行として表示する（隣接キャラクターへ付与するキーワード）。
        const _panelDescForPreview=/効果なし/.test(String(card.desc||''))?'':(card.desc||'');
        // シート「キーワード」列に実在しないカード名自己参照マーカー（内部の効果判定専用）は
        // このカード自身のキーワード欄プレビューからも除外する
        const _adjKws=[...new Set(card.adjacentKeywords||[])].filter(k=>typeof _INTERNAL_ONLY_ENCHANT_NAMES==='undefined'||!_INTERNAL_ONLY_ENCHANT_NAMES.has(k));
        const preview=[card.name,_panelDescForPreview,_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:''].filter(Boolean).join('\n');
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}${_dirMarks}<div class="card-art"></div>${_spellBtn}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
        if(arrName==='unitEquip'&&typeof _wireEnchantSelfHover==='function') _wireEnchantSelfHover(div,_getPartyBoardUnit(),i);
      }else if(typeof _isSpellCard==='function'&&_isSpellCard(card)){
        div.classList.add('spell-card');
        const preview=[card.name,typeof _previewRarityLine==='function'?_previewRarityLine(card):'',card.desc||''].filter(Boolean).join('\n');
        if(preview) div.setAttribute('data-preview',preview);
        div.innerHTML=`${_slotLabel}${_gradeEl}${_manaCostEl}<div class="card-art"></div>${_spellBtn}`;
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
      }else{
        div.innerHTML=`${_slotLabel}${_gradeEl}${_dirMarks}<div class="card-art"></div><div class="card-tp ${t}">${arrName==='globalPanels'?'全体':arrName==='unitEquip'?'パネル':t==='ring'?'指輪':t==='wand'?'杖':'アイテム'}</div><div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${_chargeHtml}${_spellBtn}`;
        _pinPanelTextPosition(div,arrName==='unitEquip'?'unitEquip':'normal');
      }
      const discardBtn=div.querySelector('.discard-btn');
      if(discardBtn) discardBtn.onclick=ev=>{
        ev.stopPropagation();
        if(arrName==='unitEquip'){
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
          }
          return;
        }
        if(arrName==='globalPanels') return;
        if(G._isShop){ arr[i]=null; G.gold+=1; updateHUD(); const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=rewardGoldText(); log(card.name+' を売却（+1ゴールド）','gold'); renderHandEditor(); }
        else discardHeCard(arrName,i);
      };
      if(arrName==='unitEquip') div.onclick=e=>{
        e.stopPropagation();
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
          _dragSrc=arrName==='unitEquip'?{arr:arrName,idx:i,unitIdx:G._selectedEquipUnitIdx}:{arr:arrName,idx:i};
          _pinPanelTextPosition(div,arrName==='unitEquip'?'unitEquip':'normal');
          if(arrName==='unitEquip') _setDragZoneClass('dragzone-mainequip');
          e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); div.classList.add('dragging');
        });
        div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
        div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; });
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
      if(arrName==='unitEquip'||arrName==='globalPanels'){
        ph.classList.add('equip-empty',`equip-slot-${_slotDef.kind}`);
      }
      if(arrName==='unitEquip'&&_deployNum>=0){
        // ①〜⑦：戦闘フェイズで出撃する枠（card_back.pngで区別する）
        ph.classList.add('deploy-slot');
      }
      if(arrName==='spells') ph.classList.add('belt-empty');
      ph.style.setProperty('--hand-i',_handPos);
      ph.style.setProperty('--hand-mid',_handMid);
      ph.style.setProperty('--hand-arc',_handArc);
      ph.addEventListener('dragover',e=>{ if(arrName==='globalPanels') return; e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{
        e.preventDefault(); ph.classList.remove('drag-over');
        if(arrName==='globalPanels') return;
        ph._skipNextClick=true;
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
    if(typeof _renderPanelUniteMarkers==='function') _renderPanelUniteMarkers(el,_uniteOwner);
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
  const seen=new Set();
  const _DIR_DELTA={up:{dx:0,dy:-1},right:{dx:1,dy:0},down:{dx:0,dy:1},left:{dx:-1,dy:0}};
  eq.forEach((panel,idx)=>{
    if(!panel||!Array.isArray(panel.directions)||!panel.directions.length) return;
    const connectivity=_panelDirectionConnectivity(unit,idx);
    const pos=_panelGridPos(idx);
    panel.directions.forEach(d=>{
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
      marker.src=vertical?'assets/temp/cards/unite_a.png':'assets/temp/cards/unite_b.png';
      marker.className=`panel-unite-link panel-unite-${vertical?'v':'h'}`;
      marker.style.left=`${midX}px`;
      marker.style.top=`${midY}px`;
      host.appendChild(marker);
    });
  });
}

function dropOnCard(destArr,destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  const srcUnitIdx=_dragSrc.unitIdx;
  _dragSrc=null;
  // 報酬カード（パネル）のドロップ購入
  if(srcArr==='rew'){
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
    renderFieldEditor();
    renderMapInventorySlots();
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
    G.gold+=refund;
    updateHUD();
    const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=rewardGoldText();
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
