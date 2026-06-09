// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _placingChar=null; // フィールド配置待ちのキャラカード
let _rewFreePickDone=false; // 通常報酬フェイズで無料取得済みフラグ

// 指輪を空き指輪スロットに直接装備する（成功→スロットindex、失敗→false）
function _autoEquipRingInner(ring){
  const rIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
  if(rIdx<0) return false;
  const rc=clone(ring); delete rc._buyPrice;
  G.rings[rIdx]=rc;
  if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
  if(rc.unique==='great_mother'){
    G.allies.forEach(a=>{ if(a&&a.effect==='dragonet_end') a._dragonetBonus=(a._dragonetBonus||0)+1; });
  }
  updateGoldenDrop();
  if(rc.unique==='fury_start'){
    const _fb=3*(rc.grade||1);
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_fb; a.baseAtk=(a.baseAtk||0)+_fb; a._furyAtk=(a._furyAtk||0)+_fb; } });
    log(`憤激の指輪：全仲間パワー+${_fb}/±0`,'good');
  }
  if(rc.unique==='extra_action'){
    const _oldPT=G.actionsPerTurn;
    G.actionsPerTurn=calcActions();
    G.actionsLeft=G.actionsLeft+(G.actionsPerTurn-_oldPT);
  }
  return rIdx;
}
const _isRingCard=c=>c&&(c.kind==='summon'||c.kind==='passive'||c.type==='ring');

function _findInventoryEmptySlot(){
  const cap=G.handSlots||7;
  for(let i=0;i<cap;i++){
    if(!G.spells[i]) return i;
  }
  return -1;
}
function _findMapInventoryEmptySlot(){
  G.inventory=G.inventory||new Array(18).fill(null);
  for(let i=0;i<18;i++){
    if(!G.inventory[i]) return i;
  }
  return -1;
}
function _canUseNonCombatCard(card){
  return !!(card&&!isEquipmentCard(card)&&(G.phase==='map'||G.phase==='reward'));
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
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:'inventory',idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); });
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard('inventory',i); });
      const selected=G.allies?.[G._selectedEquipUnitIdx];
      if(selected&&selected.hp>0&&isEquipmentCard(card)){
        div.onclick=e=>{ e.stopPropagation(); equipInventoryCardToUnit(i,G._selectedEquipUnitIdx,'inventory'); };
        div.style.cursor='pointer';
      } else if(_canUseNonCombatCard(card)){
        div.onclick=e=>{ e.stopPropagation(); useInventoryCard(i); };
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
function useInventoryCard(idx){
  const card=G.inventory?.[idx];
  if(!_canUseNonCombatCard(card)) return;
  const prev=G.spells;
  G.spells=G.inventory;
  useSpell(idx);
  if(card.needsEnemy||card.needsAlly||card.needsAny||card.effect==='charm'||card.effect==='swap_pos'){
    G._inventorySpellRestore=prev;
  } else {
    G.spells=prev;
    renderMapInventorySlots();
    renderHandEditor();
  }
}

function _markFreeShopTreasure(item){
  if(!item) return item;
  item._buyPrice=0;
  item._freeTreasure=true;
  return item;
}

function _isLesserDemonDiscountTarget(card){
  return !!(card && card.type === 'consumable');
}

function _lesserDemonDiscountFor(card){
  return (_isLesserDemonDiscountTarget(card) && G._lesserDemonDiscount > 0) ? G._lesserDemonDiscount : 0;
}

function _consumeLesserDemonDiscount(discount){
  if(discount > 0){
    log(`レッサーデーモン：購入-${discount}ゴールド`,'good');
    G._lesserDemonDiscount=0;
  }
}

function renderCardAppearanceModeDebugButton(){
  const btn=document.getElementById('rw-appearance-mode');
  if(!btn) return;
  if(!G._debugMode){
    btn.style.display='none';
    return;
  }
  const mode=typeof CARD_APPEARANCE_MODE!=='undefined'?CARD_APPEARANCE_MODE:'NORMAL';
  btn.style.display='';
  btn.textContent=`出現率: ${mode}`;
  const experimental=typeof CARD_APPEARANCE_MODES!=='undefined'&&mode===CARD_APPEARANCE_MODES.EXPERIMENTAL;
  btn.style.borderColor=experimental?'var(--red)':'var(--purple)';
  btn.style.color=experimental?'var(--red2)':'var(--purple2)';
}

function toggleCardAppearanceModeDebug(){
  if(!G._debugMode) return;
  if(typeof CARD_APPEARANCE_MODES==='undefined'||typeof CARD_APPEARANCE_MODE==='undefined') return;
  CARD_APPEARANCE_MODE = CARD_APPEARANCE_MODE===CARD_APPEARANCE_MODES.EXPERIMENTAL
    ? CARD_APPEARANCE_MODES.NORMAL
    : CARD_APPEARANCE_MODES.EXPERIMENTAL;
  log(`[DEBUG] カード出現率: ${CARD_APPEARANCE_MODE}`,'sys');
  renderCardAppearanceModeDebugButton();
  if(G.phase==='reward'&&!G._isShop){
    const keepMaster=(G.masterHand||[]).filter(c=>c&&(c._freeTreasure||c._isTreasure||c._buyPrice===0));
    _rewCards=drawRewards();
    _padRewCharSlots();
    _generateMasterHand();
    if(keepMaster.length) G.masterHand=[...G.masterHand,...keepMaster];
    const rwCount=document.getElementById('rw-count');
    if(rwCount) rwCount.textContent=isExperimentalAppearanceMode()?getExperimentalRewardCharCount(G.floor):(G.rewardCharCount||3);
    renderRewCards();
    renderEnemyHand();
    renderGradeUpBtn();
  }
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
  if(G.phase==='player'||G.phase==='enemy'||G.phase==='commander') return;
  G._isTreasurePhase=false;
  G._isRewardTown=true; // 常に購入制モード（無料取得なし）
  // 明示的リセット（前回の残留データを防ぐ）
  G.masterHand=[];
  G._pendingTreasureItems=G._pendingTreasureItems||[];
  G.rings.forEach(r=>{ if(r) r._count=0; });
  arcanaPhaseStart();

  // ボス撃破フラグのリセット（グレードアップは手動）
  if(G._bossJustDefeated){
    G._bossJustDefeated=false;
  }

  _rewCards=drawRewards();
  _padRewCharSlots(); // キャラ0-5・アイテム6+に整列
  G.phase='reward';
  // 報酬フェイズ突入時に行動権を戦闘フェイズと同値にリセット
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G._familiarUsed=false; // ファミリア：報酬フェイズ開始時にリセット

  // エリート撃破ボーナスはbattle.jsの_pendingTreasureItemsで処理済み
  if(G._pendingEliteChest){
    G._pendingEliteChest=false;
    G._pendingTreasure=false;
  }

  // 洞窟ボーナス：1グレード高いキャラを報酬欄に追加
  if(G._pendingCaveBonus){
    G._pendingCaveBonus=false;
    const _caveGrade=Math.min(5,(G.rewardGrade||1)+1);
    const _caveEquip=(typeof drawEquipment==='function'?drawEquipment(1,_caveGrade)[0]:null);
    if(_caveEquip){
      _caveEquip._buyPrice=calcBuyPrice(_caveEquip);
      _caveEquip._caveBonus=true;
      _rewCards.push(_caveEquip);
      log(`⛩️ 洞窟：G${_caveGrade}までの装備が提示に追加された`,'gold');
    }
  }

  // 湖ボーナス：敵全滅時に設定されたG._pondRingDropを報酬欄に追加
  if(G._pendingPondBonus){
    G._pendingPondBonus=false;
    if(G._pondRingDrop){
      const _pr=G._pondRingDrop;
      G._pondRingDrop=null;
      _pr._buyPrice=_pr.cost||4;
      _rewCards.push(_pr);
      log(`💧 湖：${_pr.name}をドロップ`,'gold');
    }
  }

  // 宝箱：撤退でない場合のみ、未回収の宝マスを商談インベントリへ無料追加
  const _hasPendingTreasureSlots=G._pendingTreasureBySlot&&Object.keys(G._pendingTreasureBySlot).length>0;
  if((G._pendingTreasure||_hasPendingTreasureSlots)&&!G._retreated){
    // 未回収かつ戦闘中に表示済みの chest 系マスを集計
    const _visibleSet=new Set(G.visibleMoves||[]);
    const _chestMasks=G.moveMasks.map((m,i)=>String(m||'').startsWith('chest')&&_visibleSet.has(i)?{type:m,i}:null).filter(Boolean);
    const _fixedBySlot=G._pendingTreasureBySlot||{};
    G.moveMasks=G.moveMasks.map(m=>String(m||'').startsWith('chest')?null:m);
    G.visibleMoves=G.visibleMoves.filter(i=>G.moveMasks[i]);
    // スロットごとの確定中身があれば採用し、未確定マスだけ種別に応じて新規抽選
    const fd2=FLOOR_DATA[G.floor];
    const maxGrade2=fd2?(fd2.grade||1):1;
    const _handledTreasureSlots=new Set();
    _chestMasks.forEach(({type,i})=>{
      _handledTreasureSlots.add(String(i));
      const fixed=_fixedBySlot[i];
      if(fixed){
        _rewCards.push(_markFreeShopTreasure(fixed));
        log(`📦 ${fixed.name} が商談インベントリに追加された！（無料）`,'gold');
        return;
      }
      const typeMap={'chest_wand':'wand','chest_ring':'ring','chest_item':'consumable'};
      const forced=typeMap[type]||null;
      const tw=forced?{wand:forced==='wand'?100:0,ring:forced==='ring'?100:0,consumable:forced==='consumable'?100:0}:{wand:40,consumable:40,ring:20};
      const ti=drawTreasure({1:70,2:30},tw,maxGrade2);
      if(ti){
        _rewCards.push(_markFreeShopTreasure(ti));
        log(`📦 ${ti.name} が商談インベントリに追加された！（無料）`,'gold');
      }
    });
    Object.entries(_fixedBySlot).forEach(([slot,item])=>{
      if(_handledTreasureSlots.has(String(slot))||!item||!_visibleSet.has(Number(slot))) return;
      _rewCards.push(_markFreeShopTreasure(item));
      log(`📦 ${item.name} が商談インベントリに追加された！（無料）`,'gold');
    });
    G._pendingTreasure=false;
    G._pendingTreasureBySlot={};
    G._pendingEliteTreasureItem=null;
    G._barrelTreasure=null;
  } else if((G._pendingTreasure||_hasPendingTreasureSlots)&&G._retreated){
    // 撤退時：未回収の宝は消失
    G.moveMasks=G.moveMasks.map(m=>String(m||'').startsWith('chest')?null:m);
    G._pendingTreasure=false;
    G._pendingEliteTreasureItem=null;
    G._barrelTreasure=null;
    G._pendingTreasureBySlot={};
  }

  // 保留中の宝箱アイテム（エリート・樽・湖ボーナス等）を商談インベントリに無料追加
  if(G._pendingTreasureItems&&G._pendingTreasureItems.length>0){
    G._pendingTreasureItems.forEach(item=>{
      _rewCards.push(_markFreeShopTreasure(item));
      log(`📦 ${item.name} が商談インベントリに追加された！（無料）`,'gold');
    });
    G._pendingTreasureItems=[];
  }

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

  // リスNPCを明示的に表示（squirrelSayが空メッセージの場合でも表示する）
  const _sqEl=document.getElementById('squirrel-npc');
  if(_sqEl) _sqEl.classList.add('visible');
  squirrelSay('入店時');

  const bossNotice=document.getElementById('boss-reward-notice');
  if(G._eliteKilled){
    if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent='⭐ エリート撃破：高レアリティ宝箱が出現！'; }
  } else {
    if(bossNotice) bossNotice.style.display='none';
  }

  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent=isExperimentalAppearanceMode()?getExperimentalRewardCharCount(G.floor):(G.rewardCharCount||3);
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.style.display=''; rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; }
  renderCardAppearanceModeDebugButton();

  renderAll(); // フィールド（仲間エリア）も再描画
  _updateLaneOffset(); // スロット描画後に同期計測してオフセットを確定
  // renderAll→renderControls が textContent を上書きするので必ず後で設定する
  document.getElementById('ph-badge').textContent='商談フェイズ';
  document.getElementById('ph-badge').className='ph-badge';
  document.getElementById('h-floor').textContent=G.floor+1;
  const _nl=document.getElementById('h-next-label'); if(_nl) _nl.style.display='';
  G._masterHandReady=true; // ここから敵インベントリエリアを報酬UIとして使用
  _generateMasterHand(); // renderRewCards前に杖・アイテムを抽出してmasterHandへ

  renderRewCards();
  renderGradeUpBtn();
  renderArcanaInfo();
  renderRaceBuffSummary();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  renderEnemyHand();
  setHint('ゴールドを支払ってキャラクターやアイテムを購入しましょう');
  updateHUD();
  _previewNextEnemies();
  _renderPowerRating();
  if(_isBossFight) _showBossRewardOverlay();
}

// 次戦の敵を副作用なくプレビュー生成（戦力評価用）
function _previewNextEnemies(){
  const _nextFloor=(G.floor||1)+1;
  if(_nextFloor>(FLOOR_DATA.length-1)||typeof generateEnemies!=='function'){
    G._previewEnemies=null;
    return;
  }
  const _savedFloor=G.floor;
  const _savedIsEliteFight=G._isEliteFight;
  const _savedEliteIdx=G._eliteIdx;
  const _savedBossSlot=G._bossSlot;
  const _savedUsedNamed=new Set(G._usedNamedElite);
  const _savedExtraMult=G._extraBattleMult;
  try{
    G.floor=_nextFloor;
    G._previewEnemies=generateEnemies(_nextFloor);
  } catch(e){
    G._previewEnemies=null;
  } finally {
    G.floor=_savedFloor;
    G._isEliteFight=_savedIsEliteFight;
    G._eliteIdx=_savedEliteIdx;
    G._bossSlot=_savedBossSlot;
    G._usedNamedElite=_savedUsedNamed;
    G._extraBattleMult=_savedExtraMult;
  }
}

// 戦力評価表示（自軍 vs 次戦の敵軍）
function _renderPowerRating(){
  const el=document.getElementById('rw-power-rating');
  if(!el) return;
  if(typeof calcPartyScore!=='function'){ el.style.display='none'; return; }
  const enemyUnits=G._previewEnemies||[];
  const allyScore=calcPartyScore(G.allies, enemyUnits);
  const enemyScore=calcPartyScore(enemyUnits, G.allies);
  if(enemyScore<=0){ el.style.display='none'; el.innerHTML=''; return; }
  el.style.display='';
  const allyRank=scoreToRank(allyScore);
  const enemyRank=scoreToRank(enemyScore);
  const label=getMatchupLabel(allyScore,enemyScore);
  const labelColor=label==='圧勝'?'var(--teal2)':
    label==='有利'?'var(--green,#6d9)':
    label==='互角'?'var(--gold2)':
    label==='不利'?'var(--orange,#f90)':'var(--red2)';
  el.innerHTML=`<span style="color:var(--fg2)">自軍</span> <strong style="color:var(--gold2)">${allyRank}</strong><span style="margin:0 8px;color:var(--fg3)">▶</span><span style="color:var(--fg2)">次戦</span> <strong style="color:var(--red2)">${enemyRank}</strong> <span style="color:${labelColor};font-weight:700;margin-left:6px">[${label}]</span>`;
}

// ── ボス報酬選択オーバーレイ ─────────────────────

const _BOSS_REWARD_OPTIONS=[
  {id:'ring_slot',   label:'指輪スロット拡張',     desc:'指輪を装備できるスロットが+1される。',     apply:()=>{ G.ringSlots++; log(`ボス報酬：指輪スロット+1（現在${G.ringSlots}枠）`,'gold'); }},
  {id:'wand_slot',   label:'杖・アイテムスロット拡張',desc:'杖・アイテムを持てるスロットが+1される。', apply:()=>{ G.handSlots=(G.handSlots||5)+1; G.spells.push(null); log(`ボス報酬：杖・アイテムスロット+1（現在${G.handSlots}枠）`,'gold'); }},
  {id:'magic',       label:'魔術レベル+3',          desc:'魔術レベルが3上昇する。',                  apply:()=>{ G.magicLevel=(G.magicLevel||1)+3; if(typeof syncEquipmentPassives==='function') syncEquipmentPassives(); if(typeof syncHarpyAtk==='function') syncHarpyAtk(); log(`ボス報酬：魔術レベル+3（現在${G.magicLevel}）`,'gold'); }},
  {id:'action',      label:'行動権永続+1',           desc:'永続的に行動回数が+1される。',             apply:()=>{ G._bonusAction=(G._bonusAction||0)+1; G.actionsPerTurn=calcActions(); G.actionsLeft=G.actionsPerTurn; updateHUD(); log(`ボス報酬：行動権永続+1（現在${G.actionsPerTurn}行動/ターン）`,'gold'); }},
  {id:'soul',        label:'ゴールド+5',               desc:'ゴールドを5獲得する。',                      apply:()=>{ G.gold+=5; updateHUD(); log(`ボス報酬：ゴールド+5`,'gold'); }},
];

function _showBossRewardOverlay(){
  // 3つランダムに選ぶ
  const shuffled=[..._BOSS_REWARD_OPTIONS].sort(()=>Math.random()-0.5);
  const choices=shuffled.slice(0,3);

  // オーバーレイ生成
  const ov=document.createElement('div');
  ov.id='boss-reward-overlay';
  ov.style=`position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px`;
  const title=document.createElement('div');
  title.style='font-size:1.3rem;font-weight:700;color:var(--gold2);margin-bottom:8px';
  title.textContent='🏆 ボスクリア報酬 — 1つ選択してください';
  ov.appendChild(title);
  const row=document.createElement('div');
  row.style='display:flex;gap:12px;flex-wrap:wrap;justify-content:center';
  choices.forEach(opt=>{
    const card=document.createElement('div');
    card.style=`background:var(--card);border:2px solid var(--gold);border-radius:10px;padding:16px 20px;min-width:160px;max-width:210px;cursor:pointer;text-align:center;transition:transform .15s`;
    card.onmouseenter=()=>card.style.transform='scale(1.04)';
    card.onmouseleave=()=>card.style.transform='';
    const labelEl=document.createElement('div');
    labelEl.style='font-weight:700;font-size:.95rem;color:var(--gold2);margin-bottom:6px';
    labelEl.textContent=opt.label;
    const descEl=document.createElement('div');
    descEl.style='font-size:.75rem;color:var(--text2);line-height:1.4';
    descEl.textContent=opt.desc;
    card.appendChild(labelEl);
    card.appendChild(descEl);
    card.onclick=()=>{
      ov.remove();
      opt.apply();
      // ボス確定宝箱（R3）を報酬欄に追加
      const fd=FLOOR_DATA[G.floor];
      const maxGrade=fd?(fd.grade||1):1;
      const bossTreasure=drawTreasure({3:100},{wand:30,consumable:20,ring:50},maxGrade);
      if(bossTreasure){
        G.masterHand.push(bossTreasure);
        log('🏆 ボス宝箱（R3）が出現！','gold');
      }
      document.getElementById('rw-gold').textContent=G.gold;
      updateHUD();
      renderRewCards();
      renderGradeUpBtn();
      renderHandEditor();
      renderEnemyHand();
    };
    row.appendChild(card);
  });
  ov.appendChild(row);
  document.body.appendChild(ov);
}

// ── 行き先ノード表示 ───────────────────────────

function renderMoveSlotsInEnemy(){
  const el=document.getElementById('reward-move-btns');
  if(!el) return;
  el.innerHTML='';
  if(G.phase==='reward'&&!G._isShop){
    const skip=document.createElement('button');
    skip.className='btn rew-move-btn';
    skip.textContent='報酬スキップ';
    skip.onclick=()=>{
      _rewFreePickDone=true;
      log('報酬をスキップしました','sys');
      renderRewCards();
    };
    el.appendChild(skip);
  }
  if(G._isShop||(typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G.worldMap)){
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.textContent='店を去る';
    btn.onclick=()=>{ if(typeof shopDone==='function') shopDone(); };
    el.appendChild(btn);
    return;
  }
  let opts;
  if(G._retreated&&G._retreatTargetNodeType){
    opts=[{nodeType:G._retreatTargetNodeType,idx:-1}];
  } else if(G._isShop){
    const _nextIsBoss=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss;
    opts=[{nodeType:_nextIsBoss?'boss':'battle',idx:-1}];
  } else if(G._retryFloor){
    const nodeType=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle';
    opts=[{nodeType,idx:-1}];
  } else {
    opts=G.visibleMoves.filter(i=>G.moveMasks[i]&&G.moveMasks[i]!=='chest').map(i=>({nodeType:G.moveMasks[i],idx:i}));
    // イベントアイテム受け取り中（宿屋・祭壇から遷移）は戦闘/ボス戦のみ表示
    if(_eventItemDone) opts=opts.filter(o=>o.nodeType==='battle'||o.nodeType==='boss');
    // 表示順を固定：forest（battle）→ 湖（rest）→ 洞窟（smithy）→ その他
    const _moveOrder={battle:0,rest:1,smithy:2,boss:3,shop:4,chest:5};
    opts.sort((a,b)=>(_moveOrder[a.nodeType]??9)-(_moveOrder[b.nodeType]??9));
    if(opts.length===0) opts.push({nodeType:FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle',idx:-1});
  }
  opts.slice(0,3).forEach(opt=>{
    const nt=NODE_TYPES[opt.nodeType];
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.innerHTML=`<span style="font-size:1.1rem">${nt.icon}</span><span>${nt.label}</span>${nt.desc?`<span class="rew-move-btn-desc">${nt.desc}</span>`:''}`;
    btn.onclick=()=>chooseMoveInline(opt.nodeType);
    el.appendChild(btn);
  });
}

function chooseMoveInline(nt){
  squirrelSay('退店時');
  G._isShop=false; // 行商モード解除
  // イベントアイテム受け取り中なら状態更新コールバックを先に実行
  if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); }
  // 退店メッセージを読ませるため少し遅らせてから画面遷移
  setTimeout(()=>{
    squirrelHide();
    document.getElementById('reward-info-bar').style.display='none';
    document.getElementById('reward-cards-section').style.display='none';
    const rMoveBtns=document.getElementById('reward-move-btns');
    if(rMoveBtns) rMoveBtns.style.display='none';
    const eArea=document.getElementById('enemy-area');
    if(eArea) eArea.style.display='';
    const eLabel=document.getElementById('enemy-field-label');
    if(eLabel) eLabel.style.display='';
    document.getElementById('btn-pass').style.display='';
    if(G._retryFloor){ G._retryFloor=false; G.floor--; }
    chooseMove(nt);
  }, 900);
}

// ── リロール ──────────────────────────────────

function rerollRewards(){
  if(G.gold<1) return;
  G.gold-=1;
  if(typeof playSfx==='function') playSfx('reroll',{group:'ui'});
  G.rerollCount=(G.rerollCount||0)+1;
  // 非タウン：リロール時に無料取得権をリセット（新プールから1体無料）
  // 召喚済みキャラも含め全リセット
  _rewCards=drawRewards();
  _padRewCharSlots();

  // 試行の指輪
  const trialsRing=G.rings.find(r=>r&&r.unique==='trials');
  if(trialsRing){
    trialsRing._rerollProgress=(trialsRing._rerollProgress||0)+1;
    if(trialsRing._rerollProgress>=4){
      trialsRing._rerollProgress=0;
      const eligible=G.rings.filter(r=>r&&(r.grade||1)<MAX_GRADE);
      if(eligible.length){
        const picked=randFrom(eligible);
        const newG=Math.min(MAX_GRADE,(picked.grade||1)+1);
        picked.grade=newG;
        log(`🎯 試行の指輪：${picked.name} → ${gradeStr(newG)}`,'gold');
      }
    }
  }

  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent=isExperimentalAppearanceMode()?getExperimentalRewardCharCount(G.floor):(G.rewardCharCount||3);
  updateHUD();
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; }
  renderCardAppearanceModeDebugButton();
  _generateMasterHand(); // renderRewCards前に再生成
  renderRewCards();
  renderEnemyHand();
  renderGradeUpBtn();
  renderRaceBuffSummary();
}

// ── 報酬キャラクター：ダメージ・召喚・負傷トリガー ─────────

// 報酬枠のキャラクターにダメージを与える
function dealDmgToRewChar(rewIdx, dmg){
  const c=_rewCards[rewIdx];
  if(!c||!c._isChar||c.hp<=0) return;
  if(c.shield>0){ c.shield--; log(`${c.name}：シールドがダメージを防いだ`,'sys'); renderRewCards(); return; }
  // ガーゴイル：報酬キャラにガーゴイルがいる場合、受けるダメージを-1
  const _grReduction=0; // gargoyle_shield廃止
  const actualRewDmg=Math.max(0,dmg-_grReduction);
  c.hp=Math.max(0,c.hp-actualRewDmg);
  if(c.hp<=0){
    if(c.effect==='mummy_death'){
      const mv=3+(G.hasGoldenDrop?1:0);
      onGoldGained(mv);
      log(`${c.name}：死亡→ゴールド+${mv}`,'gold');
      if(typeof triggerDeathEffectTriggered==='function') triggerDeathEffectTriggered(c);
    }
    if(c.effect==='banshee_death'){
      const v=2+(G.hasGoldenDrop?1:0);
      G._futureCharAtkBonus=(G._futureCharAtkBonus||0)+v;
      log(`${c.name}：死亡→以後の商談キャラATK+${v}`,'good');
      if(typeof triggerDeathEffectTriggered==='function') triggerDeathEffectTriggered(c);
    }
    if(c.effect==='fecht_death'){
      G._pendingFechtRevives=G._pendingFechtRevives||[];
      G._pendingFechtRevives.push(clone(c));
      log(`${c.name}：死亡→戦闘終了時に復活予約`,'good');
      if(typeof triggerDeathEffectTriggered==='function') triggerDeathEffectTriggered(c);
    }
    // スケルトン：死亡時に同スロットへ「骨」を残す
    if(c.effect==='skeleton_bone'){
      const _boneG=c.grade||1;
      const _boneHp=4*_boneG;
      const _deadAtk=c.atk||0;
      const _deadHp=c.maxHp!=null?c.maxHp:(7*_boneG);
      const _deadKws=[...(c.keywords||[])];
      const _boneDef=makeSheetBackedUnitDef({id:'c_bone',name:'骨',race:'不死',grade:_boneG,atk:0,hp:_boneHp,maxHp:_boneHp,cost:0,unique:false,icon:'🦴',desc:`誘発：ターン開始時、${_deadAtk}/${_deadHp}、不死の「スケルトン」に変身する。`,effect:'bone_transform'});
      const _boneCard=Object.assign({},makeUnitFromDef(_boneDef));
      _boneCard._skelAtk=_deadAtk; _boneCard._skelHp=_deadHp; _boneCard._skelKws=[..._deadKws];
      _boneCard._isChar=true; _boneCard._buyPrice=2; _boneCard._rewSummoned=true;
      _rewCards[rewIdx]=_boneCard;
      log(`${c.name}：死亡→骨(0/${_boneHp})を残した`,'good');
      if(typeof triggerDeathEffectTriggered==='function') triggerDeathEffectTriggered(c);
      renderRewCards();
      return;
    }
    log(`${c.name}：報酬枠から消滅`,'bad');
    squirrelSay('提示カードを死亡させた時');
    _rewCards[rewIdx]=null;
    renderRewCards();
    return;
  }
  squirrelSay('提示カードにダメージを与えた時');
  // 負傷トリガー（常在・誘発・負傷のみ）
  if(c.injury) _triggerRewCharInjury(c, dmg);
  renderRewCards();
}

// 商談フェイズ：リンドヴルムの「仲間の負傷発動時、全仲間の竜+1/+1」トリガー
function _triggerLindwormRew(){
  const _lv=1+(G.hasGoldenDrop?1:0);
  // 提示カードのリンドヴルム
  _rewCards.forEach(lw=>{
    if(!lw||!lw._isChar||lw.hp<=0||lw.effect!=='lindworm_injury') return;
    _rewCards.forEach(d=>{ if(d&&d._isChar&&d.hp>0&&unitMatchesRace(d,'竜')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    G.allies.forEach(d=>{ if(d&&d.hp>0&&unitMatchesRace(d,'竜')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    log(`${lw.name}：仲間負傷→全竜+${_lv}/+${_lv}`,'good');
  });
  // 盤面のリンドヴルム
  G.allies.forEach(lw=>{
    if(!lw||lw.hp<=0||lw.effect!=='lindworm_injury') return;
    _rewCards.forEach(d=>{ if(d&&d._isChar&&d.hp>0&&unitMatchesRace(d,'竜')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    G.allies.forEach(d=>{ if(d&&d.hp>0&&unitMatchesRace(d,'竜')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    log(`${lw.name}：仲間負傷→全竜+${_lv}/+${_lv}`,'good');
  });
}

// 報酬フェイズ中の負傷トリガー（開戦・終戦・攻撃・召喚は除く）
function _triggerRewCharInjury(unit, dmg=0){
  if(!unit||!unit.injury) return;
  switch(unit.injury){
    case 'slin':{
      // 新仕様では常在効果（slin_injury_aura）に移行
      _triggerLindwormRew();
      break;
    }
    case 'worm':{
      const _wv=((unit._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
      _rewCards.forEach(c=>{ if(c&&c._isChar&&c.hp>0&&c!==unit){ c.atk+=_wv; c.baseAtk=(c.baseAtk||0)+_wv; }});
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_wv; a.baseAtk=(a.baseAtk||0)+_wv; }});
      log(`${unit.name}：負傷→全仲間+${_wv}/±0`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'hydra':{
      const cands=[...G.allies.filter(a=>a&&a.hp>0),..._rewCards.filter(c=>c&&c._isChar&&c.hp>0&&c!==unit)];
      if(cands.length){ const t=randFrom(cands); t.sealed=(t.sealed||0)+1; log(`${unit.name}：負傷→${t.name}を1ターン行動不能にする`,'good'); }
      _triggerLindwormRew();
      break;
    }
    case 'sea_serpent':{
      const dmg2=2+(G.hasGoldenDrop?1:0);
      _rewCards.forEach((c,i)=>{ if(c&&c._isChar&&c.hp>0&&c!==unit) dealDmgToRewChar(i,dmg2); });
      log(`${unit.name}：負傷→報酬キャラ全体に${dmg2}ダメ`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'limslus':{
      // 商談フェイズでは敵がいないため効果なし
      log(`${unit.name}：負傷→敵不在のため効果なし`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'mummy':{
      const mv=3+(G.hasGoldenDrop?1:0);
      onGoldGained(mv);
      log(`${unit.name}：死亡→ゴールド+${mv}`,'gold');
      _triggerLindwormRew();
      break;
    }
    case 'freyr':{
      const scDef2=makeSheetBackedUnitDef({id:'c_stone_cat',name:'ストーンキャット',race:'-',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'🗿',desc:'反撃　アーティファクト',counter:true,keywords:['アーティファクト']});
      addRewChar(makeUnitFromDef(scDef2));
      log(`${unit.name}：負傷→ストーンキャットを報酬枠に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'kettcat':{
      const _ncRG=unit.grade||1, _ncRA=_ncRG, _ncRH=2*_ncRG;
      const _ncDef=makeSheetBackedUnitDef({id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:_ncRG,atk:_ncRA,hp:_ncRH,cost:0,unique:false,icon:'🐈‍⬛',desc:''});
      const _nc=makeUnitFromDef(_ncDef, undefined, true); // skipSummonBonus=true
      addRewChar(_nc);
      log(`${unit.name}：負傷→ナイトキャット(${_ncRA}/${_ncRH})を報酬枠に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'ran':{
      const ranHp=Math.max(1,dmg);
      const ranDef=makeSheetBackedUnitDef({id:'c_ran_spawn',name:'海の眷属',race:'亜人',grade:unit.grade||1,atk:10,hp:ranHp,cost:0,unique:false,icon:'🐚',desc:''});
      addRewChar(makeUnitFromDef(ranDef));
      log(`${unit.name}：負傷→海の眷属(10/${ranHp})を報酬枠に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'banshee':{
      // 新仕様では死亡効果誘発（banshee_death_trigger）に移行
      _triggerLindwormRew();
      break;
    }
    case 'warg':{
      const _wgnums=[...(unit.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
      const _wgv=(_wgnums[0]||1)+(G.hasGoldenDrop?1:0);
      _rewCards.forEach(c=>{ if(c&&c._isChar&&c.hp>0&&c!==unit&&unitMatchesRace(c,'獣')){ c.atk+=_wgv; c.baseAtk=(c.baseAtk||0)+_wgv; c.hp+=_wgv; c.maxHp+=_wgv; }});
      G.allies.forEach(a=>{ if(a&&a.hp>0&&unitMatchesRace(a,'獣')){ a.atk+=_wgv; a.baseAtk=(a.baseAtk||0)+_wgv; a.hp+=_wgv; a.maxHp+=_wgv; }});
      log(`${unit.name}：負傷→全仲間の獣+${_wgv}/+${_wgv}`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'alp':{
      // 提示カード側の反対（仲間の場）にゴールドボムを召喚
      const _alpG=unit.grade||1;
      const _sbG=Math.max(1,_alpG-1);
      const _sbHp=_sbG;
      const _sbDmg=5*_sbG;
      const _alpDef=makeSheetBackedUnitDef({id:'c_soul_bomb',name:'ゴールドボム',race:'精霊',grade:_sbG,atk:0,hp:_sbHp,cost:0,unique:false,icon:'💣',desc:`誘発：死亡した場合、すべての仲間に${_sbDmg}ダメージを与える。`,effect:'soul_bomb_death'});
      const _alpSlot=G.allies.findIndex(a=>!a||a.hp<=0);
      const _alpSbUnit=_alpSlot>=0?makeUnitFromDef(_alpDef):null;
      if(_alpSbUnit) G.allies[_alpSlot]=_alpSbUnit;
      log(`${unit.name}：負傷→ゴールドボム(0/${_sbHp})を仲間の場に召喚`,'good');
      if(_alpSbUnit&&typeof triggerCocatrice==='function') triggerCocatrice(_alpSbUnit);
      _triggerLindwormRew();
      break;
    }
  }
  if(typeof triggerInjuryEffectTriggered==='function') triggerInjuryEffectTriggered(unit);
}

// 現仕様では戦闘報酬にキャラクターを出さないため、整列処理は行わない。
function _padRewCharSlots(){
}

// 報酬枠にユニットを追加（召喚時：2ゴールドで購入可・リロール時消滅）
function addRewChar(unit){
  const card=Object.assign({},unit);
  card._isChar=true;
  card._buyPrice=2;
  card._rewSummoned=true; // リロール時消滅フラグ
  // 0-5のcharスロットの空きを探す
  let slot=-1;
  for(let i=0;i<6;i++){ if(!_rewCards[i]||!_rewCards[i]._isChar||_rewCards[i].hp<=0){ slot=i; break; } }
  if(slot>=0) _rewCards[slot]=card;
  else _rewCards.push(card); // 全スロット埋まっている場合はoverflow
  renderRewCards();
}

// ── 報酬カード描画 ─────────────────────────────

function renderRewCards(){
  const el=document.getElementById('rw-cards');
  el.innerHTML='';
  const isRewardLocked=!G._isRewardTown&&_rewFreePickDone;
  if(G._isShop){
    const shopRow=document.createElement('div');
    shopRow.className='shop-equipment-row';
    for(let i=0;i<7;i++){
      const card=_rewCards[i]||null;
      if(card){
        shopRow.appendChild(_mkRewDiv(card,()=>takeRewCard(i),i));
      } else {
        const ph=document.createElement('div');
        ph.className='card-empty spell';
        shopRow.appendChild(ph);
      }
    }
    el.appendChild(shopRow);
    requestAnimationFrame(fitCardDescs);
    return;
  }

  // ①常に6枠のキャラクタースロットを描画（_rewCards[0-5]）
  const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','A・シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090'};
  const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
  const hasRewardChars=_rewCards.some(c=>c&&c._isChar);
  const charRow=document.createElement('div');
  charRow.className='field';
  charRow.style='margin-top:20px;margin-bottom:0px;width:100%;position:relative';  // 後衛上シフト分の上余白
  for(let i=0;i<6;i++){
    const card=(_rewCards[i]&&_rewCards[i]._isChar)?_rewCards[i]:null;
    const slot=document.createElement('div');
    if(!card){
      slot.className='slot empty is-rear';
      // 空の報酬スロット：他のキャラカードをドラッグして移動できる
      slot.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0&&_rewDragSrc!==i){ e.preventDefault(); slot.classList.add('drag-over'); }
      });
      slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
      slot.addEventListener('drop',e=>{
        e.preventDefault(); slot.classList.remove('drag-over');
        if(_rewDragSrc>=0&&_rewDragSrc!==i){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const tmp=_rewCards[src]; _rewCards[src]=_rewCards[i]; _rewCards[i]=tmp;
          renderRewCards();
        }
      });
    } else {
      slot.className='slot is-rear unit-card';
      if(typeof applyUnitVisual==='function') applyUnitVisual(slot,card);
      slot.dataset.rewIdx=String(i);
      const cost=card._buyPrice??2;
      const canBuy=!G._isRewardTown||G.gold>=cost;
      const hasSlot=G.allies.some(a=>!a||a.hp<=0)||G.allies.length<6;
      // マミーボーナスは drawCharacters で card.atk に反映済み（_bonusApplied フラグ）
      const dispAtk=card.atk;
      const dispHp=card.hp;
      const hpClass=(card.maxHp!=null&&card.hp<card.maxHp)?'h hp-damaged':'h';
      // 仲間加入プレビュー（ペリュトン：キャラ効果召喚のスタッツ変動のみ表示）
      const _sumBonusAtk=(G.hasGoldenDrop?1:0);
      const _sumBonusHp=(G._grimalkinBonus||0)+(G.hasGoldenDrop?1:0);
      const _hasSummonDesc=(_sumBonusAtk>0||_sumBonusHp>0)&&/\d+\/\d+、/.test(card.desc||'');
      let _previewStr='';
      if(_hasSummonDesc){
        const _modDesc=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_sumBonusAtk}/${parseInt(h)+_sumBonusHp}、`);
        _previewStr=`ペリュトン：${_modDesc}`;
      };
      const _allKws=[...new Set([...(card.keywords||[]),...(card.counter?['反撃']:[])])];
      const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
      const kwBlock=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin-top:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
      const _rawDesc=card.desc?computeDesc(card):'';
      const _strippedDesc=_stripKeywordsFromDesc(_rawDesc,card);
      const descTag=_strippedDesc?`<div class="slot-desc">${_strippedDesc}</div>`:'';
      const _previewText=typeof _unitPreviewText==='function'?_unitPreviewText(card,_strippedDesc):_strippedDesc;
      if(_previewText) slot.setAttribute('data-preview',_previewText);
      const gradeTag=card.grade?`<div class="slot-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(card.grade):gradeStr(card.grade)}</div>`:'';
      const costTag=G._isRewardTown?`<div style="position:absolute;top:3px;right:5px;font-size:1.05rem;color:var(--gold2);font-weight:700;z-index:4;pointer-events:none;line-height:1">${_circleCost(cost)}</div>`:'';

      // 通常報酬で無料取得済みの場合はキャラスロットをロック
      const shortBadge=isRewardLocked?`<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(80,80,80,.9);border:1px solid #888;border-radius:3px;padding:0 3px;font-size:.44rem;color:#ddd;font-weight:700;white-space:nowrap;z-index:10">取得済み</div>`:!canBuy?`<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ゴールド不足</div>`:'';
      const _stBadges=[];
      if(card.shield>0) _stBadges.push(`<span class="slot-badge b-shield">🛡${card.shield>1?'×'+card.shield:''}</span>`);
      if(card.poison>0) _stBadges.push(`<span class="slot-badge b-psn">毒${card.poison}</span>`);
      if(card.doomed>0) _stBadges.push(`<span class="slot-badge b-dead">破滅${card.doomed}</span>`);
      const statusBlock=_stBadges.length?`<div style="position:absolute;top:20px;left:0;right:0;display:flex;justify-content:center;flex-wrap:wrap;gap:2px;z-index:3">${_stBadges.join('')}</div>`:'';
      slot.style.borderTop='2px solid var(--teal2)';
      if(!canBuy) slot.style.background='var(--bg)';
      if(_previewStr) slot.setAttribute('data-preview',typeof _unitPreviewText==='function'?_unitPreviewText(card,_previewStr):_previewStr);
      slot.innerHTML=`${gradeTag}${costTag}${shortBadge}${statusBlock}<div class="unit-portrait"></div><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none"><div class="slot-name">${card.name}</div><div class="slot-race">${card.race||'-'}</div><div class="slot-stats"><span class="a">${dispAtk}</span><span class="s">/</span><span class="${hpClass}">${dispHp}</span></div></div><div style="position:absolute;bottom:6px;left:0;right:0;display:flex;flex-direction:column;align-items:stretch;padding:0 2px">${kwBlock}${descTag}</div>`;
      // クリックで購入（ロック中は不可）
      if(!isRewardLocked && canBuy && hasSlot){
        slot.style.cursor='pointer';
        slot.onclick=()=>takeRewCard(i);
      } else {
        slot.style.cursor='default';
        if(isRewardLocked) slot.style.opacity='0.5';
      }
      // ドラッグで移動・重ね・盤面配置
      slot.draggable=true;
      slot.addEventListener('dragstart',e=>{
        _rewDragSrc=i; slot.classList.add('dragging');
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _updateFieldDropHighlights(card.name,G._isRewardTown?card._buyPrice||1:0,false,-1);
        _createDragGhost(slot);
      });
      slot.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      slot.addEventListener('dragend',()=>{
        slot.classList.remove('dragging'); _removeDragGhost(); _clearFieldDropHighlights();
        if(_rewDragSrc===i) _rewDragSrc=-1;
        renderRewCards();
      });
      slot.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0&&_rewDragSrc!==i){ e.preventDefault(); slot.classList.add('drag-over'); }
      });
      slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
      slot.addEventListener('drop',e=>{
        e.preventDefault(); slot.classList.remove('drag-over');
        if(_rewDragSrc>=0&&_rewDragSrc!==i){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const tmp=_rewCards[src]; _rewCards[src]=_rewCards[i]; _rewCards[i]=tmp;
          renderRewCards();
        }
      });
    }
    charRow.appendChild(slot);
  }
  if(hasRewardChars) el.appendChild(charRow);
  // 前衛ガイドライン（前衛位置の赤いライン）
  const _frontGuide=document.createElement('div');
  _frontGuide.style='width:100%;height:1px;margin-top:4px;margin-bottom:4px;flex-shrink:0;background:rgba(224,80,80,.28);pointer-events:none';
  if(hasRewardChars) el.appendChild(_frontGuide);

  // ②アイテム・指輪は従来の小カードで描画（index 6以降）
  _rewCards.forEach((card,i)=>{
    if((hasRewardChars&&i<6)||!card||card._isChar) return;
    const d=_mkRewDiv(card, ()=>takeRewCard(i), i);
    if(isRewardLocked){ d.onclick=null; d.style.opacity='0.5'; d.style.cursor='default'; }
    el.appendChild(d);
  });

  const rb=document.getElementById('rw-reroll'); if(rb){ const _rbDis=G.gold<1||(!G._isRewardTown&&_rewFreePickDone); rb.disabled=_rbDis; rb.style.opacity=_rbDis?'0.4':''; }
  requestAnimationFrame(fitCardDescs);
}

function _mkRewDiv(card, onBuy, rewIdx){
  // レッサーデーモンディスカウント（次に購入する消耗品アイテム）を考慮した価格
  const _ldDiscMR=_lesserDemonDiscountFor(card);
  const cost=Math.max(0,(card._buyPrice??1)-_ldDiscMR);
  const canBuy=!G._isRewardTown||cost===0||G.gold>=cost;
  const isLegend=!!card._isLegend;
  const _isRingCard=card.kind==='summon'||card.kind==='passive'||card.type==='ring';
  const isTreasure=!!card._isTreasure;
  const div=(typeof mkCardEl==='function'&&!card._isChar)?mkCardEl(card,rewIdx??-1,'reward'):document.createElement('div');
  div.classList.add('rew-card');
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
    // マミーボーナスは drawCharacters で card.atk に反映済み
    const atkStr=`<span style="color:var(--teal2)">${card.atk}</span>`;
    const statsLine=`<div style="font-size:.68rem;font-weight:700;margin-top:2px">${atkStr}<span style="color:var(--text2)">/</span><span style="color:#60d090">${card.hp}</span></div>`;
    const costLine=G._isRewardTown?`<div class="rew-card-cost">${cost}ゴールド${disabled?' （盤面満杯）':''}</div>`:disabled?`<div class="rew-card-cost">（盤面満杯）</div>`:'';
    const uniqueBadge=card.unique?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
    const gradeTag=card.grade?` <span class="rew-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(card.grade):gradeStr(card.grade)}</span>`:'';
    const shortBadge=!canBuy&&!isTreasure?`<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 4px;font-size:.48rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ゴールド不足</div>`:'';
    const _rewCharDesc=_stripKeywordsFromDesc(card.desc?computeDesc(card):'',card);
    const _charPreview=typeof _unitPreviewText==='function'?_unitPreviewText(card,_rewCharDesc):_rewCharDesc;
    if(_charPreview) div.setAttribute('data-preview',_charPreview);
    const _sumBonusCardAtk=(G.hasGoldenDrop?1:0);
    const _sumBonusCardHp=(G._grimalkinBonus||0)+(G.hasGoldenDrop?1:0);
    const _hasSumDescCard=(_sumBonusCardAtk>0||_sumBonusCardHp>0)&&/\d+\/\d+、/.test(card.desc||'');
    if(_hasSumDescCard){
      const _modDescCard=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_sumBonusCardAtk}/${parseInt(h)+_sumBonusCardHp}、`);
      div.setAttribute('data-preview',typeof _unitPreviewText==='function'?_unitPreviewText(card,`ペリュトン：${_modDescCard}`):`ペリュトン：${_modDescCard}`);
    }
    div.innerHTML=`${shortBadge}${costLine}<div class="rew-card-art"></div><div style="font-size:.62rem;color:var(--purple2);margin-bottom:1px">キャラクター</div>${raceBadge}<div class="rew-card-name">${card.name}${gradeTag}</div>${_rewCharDesc?`<div class="rew-card-desc">${_rewCharDesc}</div>`:''}<div style="font-size:.5rem;color:var(--text2);margin:1px 0">${[...new Set([...(card.keywords||[]),...(card.counter?['反撃']:[])])].filter(Boolean).join('　')}</div>${statsLine}${uniqueBadge}`;
    if(canBuy&&!disabled) div.onclick=onBuy;
    return div;
  }

  if(G._isRewardTown){
    let badge=div.querySelector('.card-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='card-badge';
      div.appendChild(badge);
    }
    badge.innerHTML=_circleCost(cost);
  }
  if(G._isRewardTown&&!canBuy&&!isTreasure){
    const shortBadgeItem=document.createElement('div');
    shortBadgeItem.style.cssText='position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10';
    shortBadgeItem.textContent='ゴールド不足';
    div.appendChild(shortBadgeItem);
  }
  if(canBuy) div.onclick=onBuy;
  if(rewIdx!=null){
    div.draggable=true;
    div.addEventListener('dragstart',e=>{ _dragSrc={arr:'rew',idx:rewIdx}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); });
    div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; });
  }
  return div;
}

// ── カード購入処理 ──────────────────────────────

function takeRewCard(i, targetSlot){
  const card=_rewCards[i]; if(!card) return;
  const isTown=G._isRewardTown;
  // レッサーデーモンディスカウント（次に購入する消耗品アイテム・累積分を一括消費）
  const _ldDisc=_lesserDemonDiscountFor(card);
  const cost=card._isChar?(card._buyPrice??1):Math.max(0,(card._buyPrice??1)-_ldDisc);

  if(card._isChar){
    // 通常報酬フェイズ：キャラ1枚のみ無料取得、以降はロック
    if(!isTown){
      if(_rewFreePickDone){ log('無料取得は1枚のみです','bad'); return; }
    } else {
      // 街：通常購入
      if(G.gold<cost){ log('ゴールドが足りません','bad'); return; }
    }
  } else {
    // アイテム・指輪：通常購入
    if(G.gold<cost) return;
  }

  if(card._isChar){
    // キャラクター：指定スロット or 最初の空きへ配置
    let emptyIdx;
    if(targetSlot!=null){
      if(G.allies[targetSlot]!=null){ log('盤面が満杯です。','bad'); return; }
      emptyIdx=targetSlot;
    } else {
      emptyIdx=G.allies.indexOf(null);
    }
    if(emptyIdx<0){ log('盤面が満杯です。フィールドのキャラクターを還魂してください。','bad'); return; }
    // 購入前の盤面平均グレードを記録（リスNPC判定用）
    const _preAllyG=G.allies.filter(a=>a&&a.hp>0);
    const _preBuyAvgG=_preAllyG.length?_preAllyG.reduce((s,a)=>s+(a.grade||1),0)/_preAllyG.length:0;
    // 通常報酬は無料取得、街は通常購入
    if(isTown){ G.gold-=(card._buyPrice??1); } else { _rewFreePickDone=true; }
    const unit=makeUnitFromDef(card, undefined, true); // 購入：効果召喚ボーナスは対象外
    G.allies[emptyIdx]=unit;
    // 提示カードから購入したキャラは後衛で配置
    unit.hate=false;
    unit.hateTurns=0;
    log(`${card.name} を獲得（盤面[${emptyIdx}]へ配置）`,'good');
    if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
    // 召喚時効果（addAlly と同じ処理を実行）
    if(unit.effect==='chimera_summon'){
      const _pool=['即死','毒牙5','狩人','標的','成長5','加護','反撃','二段攻撃'];
      const _avail=[..._pool];
      const _chosen=[];
      for(let _ci=0;_ci<3&&_avail.length>0;_ci++){
        const _idx=Math.floor(Math.random()*_avail.length);
        _chosen.push(_avail.splice(_idx,1)[0]);
      }
      if(!unit.keywords) unit.keywords=[];
      _chosen.forEach(k=>{ if(!unit.keywords.includes(k)) unit.keywords.push(k); });
      if(_chosen.includes('反撃')) unit.counter=true;
      if(_chosen.includes('標的')){ unit.hate=true; unit.hateTurns=99; }
      log(`${unit.name}：召喚→キーワード${_chosen.join('、')}を獲得`,'good');
    }
    // ミテーラ：自分の場（G.allies）にペリカンを直接配置（グレードスケール）
    if(unit.effect==='mitera_summon'){
      const _pelG=unit.grade||1;
      const _pelDef=makeSheetBackedUnitDef({id:'c_pelican',name:'ペリカン',race:'獣',grade:_pelG,atk:_pelG,hp:3*_pelG,cost:0,unique:false,icon:'🦤',desc:''});
      const _pelUnit=makeUnitFromDef(_pelDef);
      const _pei=G.allies.findIndex(a=>!a||a.hp<=0);
      if(_pei>=0){
        G.allies[_pei]=_pelUnit;
        log(`${unit.name}：ペリカン(${_pelG}/${3*_pelG})を盤面に召喚`,'good');
        // グリマルキン・コカトリス：カード効果召喚バフ
        if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_pelUnit,G.allies);
        if(typeof triggerCocatrice==='function') triggerCocatrice(_pelUnit);
      }
    }
    // ドワーフ：使役時、最も左の杖にシート記載値分チャージ
    if(unit.effect==='dwarf_summon'){
      const _wi=G.spells.findIndex(s=>s&&s.type==='wand');
      const _nums=[...((unit.desc||'').matchAll(/\d+/g))].map(m=>parseInt(m[0]));
      const _dc=(_nums[0]||2)*((unit._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
      if(_wi>=0){ G.spells[_wi].usesLeft=(G.spells[_wi].usesLeft||0)+_dc; log(`${unit.name}：${G.spells[_wi].name}に充填+${_dc}`,'good'); }
    }
    // シルフ：使役時、隣接する仲間が+1/+2を得る
    if(unit.effect==='sylph_summon'){
      const _sli=G.allies.indexOf(unit); const _slv=(unit._stackCount||0)+1+(G.hasGoldenDrop?1:0);
      [G.allies[_sli-1],G.allies[_sli+1]].forEach(b=>{ if(b&&b.hp>0) applyUnitBuff(b,_slv,2*_slv,'ally'); });
      log(`${unit.name}：使役→隣接する仲間+${_slv}/+${2*_slv}`,'good');
    }
    if(unit.effect==='draug_summon'&&typeof triggerDraugSummonChoice==='function') triggerDraugSummonChoice(unit);
    if(['grimalkin_summon','imp_summon','rukh_summon','medusa_summon','ogre_summon'].includes(unit.effect)&&typeof applyUnitSummonEffect==='function') applyUnitSummonEffect(unit,null);
    // 指輪の on_summon トリガーを発火（報酬フェーズ中は addAlly → addRewChar へ誘導される）
    fireTrigger('on_summon', null);
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    // リスNPC：キャラ購入時（購入前の盤面平均グレードと比較）
    squirrelSay((unit.grade||1)>=_preBuyAvgG?'現在グレードのキャラを購入時':'現在グレード未満のキャラを購入時');
    updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // 装備
  if(isEquipmentCard(card)||card.kind==='passive'||card.kind==='summon'||card.type==='ring'){
    if(!isTown&&_rewFreePickDone){ log('無料取得は1枚のみです','bad'); return; }
    const handIdx=_findMapInventoryEmptySlot();
    if(handIdx<0){ log('インベントリが満杯です。装備を整理してください。','bad'); return; }
    if(isTown){ G.gold-=cost; }
    const rc=clone(card);
    delete rc._buyPrice;
    rc.noRewardUse=true;
    G.inventory[handIdx]=rc;
    // ユニーク指輪取得時に再出現しないよう記録
    if(card.legend||card._isLegend) G._seenLegendRings.add(card.id);
    if(!isTown) _rewFreePickDone=true;
    log(card.name+' を取得（インベントリ['+handIdx+']）','good');
    if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards(); renderFieldEditor(); renderHandEditor(); renderEnemyHand(); renderGradeUpBtn();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // アイテム（杖・消耗品）
  if(!isTown&&_rewFreePickDone){ log('無料取得は1枚のみです','bad'); return; }
  const handIdx=_findInventoryEmptySlot();
  if(handIdx<0){ log(`インベントリが満杯（${G.handSlots}枠）です。アイテムを捨ててください。`,'bad'); return; }

  if(isTown){ G.gold-=cost; _consumeLesserDemonDiscount(_ldDisc); }
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined){ nc.usesLeft=nc.baseUses||randUses(); }
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  G.spells[handIdx]=nc;

  // ファミリア：商談フェイズで最初に購入した消耗品のコピーを得る（杖は対象外）
  if(nc.type==='consumable'&&G.phase==='reward'&&!G._familiarUsed&&G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='familiar_shop')){
    G._familiarUsed=true;
    const _famHandIdx=_findInventoryEmptySlot();
    if(_famHandIdx>=0){
      const _famCopy=clone(nc);
      G.spells[_famHandIdx]=_famCopy;
      log(`ファミリア：${nc.name}のコピーを獲得`,'good');
    }
  }

  if(!isTown) _rewFreePickDone=true;
  log(card.name+(isTown?' を'+cost+'ゴールドで':' を')+'取得','good');
  if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
  _rewCards[i]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderRewCards();
  renderFieldEditor();
  renderEnemyHand();
  renderGradeUpBtn();
}

// ── フィールドエディタ（報酬フェイズ中の配置変更・売却）──

function renderFieldEditor(){
  const fAlly=document.getElementById('f-ally');
  if(fAlly) _renderFieldRow(fAlly);
  renderHandEditor();
  // 盤面変更のたびに戦力評価を更新
  if(typeof _renderPowerRating==='function') _renderPowerRating();
}

function _renderFieldRow(el){
  el.innerHTML='';
  for(let i=0;i<6;i++){
    const unit=G.allies[i];
    const div=document.createElement('div');
    if(unit){
      div.className='slot unit-card'+(unit.hp<=0?' dead-unit inert':'')+(unit.hp>0&&unit.hate&&unit.hateTurns>0?' is-defender':'')+(G._selectedEquipUnitIdx===i?' selected':'');
      if(typeof applyUnitVisual==='function') applyUnitVisual(div,unit);
      div.draggable=unit.hp>0;
      const badges=[];
      const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';}; 
      // 標的バッジは非表示（is-front の視覚的シフトで代用）
      if(unit.guardian)badges.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
      if(unit.shield>0)badges.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
      if(unit.sealed>0)badges.push(`<span class="slot-badge b-seal"${_sd('封印')}>封印</span>`);
      if(unit.instadead)badges.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
      if(unit.poison>0)badges.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${unit.poison}</span>`);
      if(unit.doomed>0)badges.push(`<span class="slot-badge b-dead" data-kwdesc="破滅が10になると死亡する。">破滅${unit.doomed}</span>`);
      if(unit.regen)badges.push(`<span class="slot-badge b-regen"${_sd('再生')}>再生${unit.regen}</span>`);
      if(unit.stealth)badges.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
      if(unit.allyTarget)badges.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
      const badgeBlock=badges.length?`<div class="slot-badges">${badges.join('')}</div>`:'';
      const gradeTag=unit.grade?`<div class="slot-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(unit.grade):gradeStr(unit.grade)}</div>`:'';
      const _rawDesc=unit.desc?computeDesc(unit):'';
      const _desc=_stripKeywordsFromDesc(_rawDesc,unit);
      const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
      const _preview=typeof _unitPreviewText==='function'?_unitPreviewText(unit,_desc):_desc;
      if(_preview) div.setAttribute('data-preview',_preview);
      const dragonetSub=unit.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(unit._dragonetBonus||0))-(unit._dragonetCount||0)}戦</div>`:'';
      const raceTag=unit.race&&unit.race!=='-'?`<div class="slot-race">${unit.race}</div>`:'';
      const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','A・シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090'};
      const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
      const _allKws=[...new Set([...(unit.keywords||[]),...(unit.counter?['反撃']:[])])];
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
      div.innerHTML=`${badgeBlock}${gradeTag}<div class="unit-portrait"></div>${hpBar}<div style="${_infoStyle}"><div class="slot-name">${unit.name}</div>${raceTag}<div class="slot-stats"><span class="a">${unit.atk}</span><span class="s">/</span><span class="${hpClass}">${unit.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div><button class="return-btn" title="除名">×</button>`;
      const removeBtn=div.querySelector('.return-btn');
      if((G.allies||[]).filter(a=>a).length<=1) removeBtn.style.display='none';
      removeBtn.onclick=ev=>{ ev.stopPropagation(); sellFieldUnit(i); };
      // 進化バッジ（重ね段階に応じて表示）
      if(unit._stackCount>=1){
        const evoBadge=document.createElement('div');
        evoBadge.style.cssText='position:absolute;top:14px;left:4px;font-size:.5rem;color:var(--gold2);font-weight:700;line-height:1;pointer-events:none';
        evoBadge.textContent=unit._stackCount>=2?'2段進化':'1段進化';
        div.appendChild(evoBadge);
      }
      // クリックは装備内容表示のみ。ヘイトはカード効果でのみ付与する。
      div.onclick=e=>{
        e.stopPropagation();
        if(e.detail===0) return; // プログラム的クリックは無視
        const u=G.allies[i]; if(!u) return;
        G._selectedEquipUnitIdx=i;
        if(_isNonCombatEquipPhase()) G.inventoryOpen=true;
        if(typeof renderMapInventory==='function') renderMapInventory();
        renderHandEditor();
        renderFieldEditor();
      };
      div.addEventListener('dragstart',e=>{
        _fieldDragSrc=i; _fieldDragSrcEl=div; _fieldDragStartY=e.clientY;
        div.classList.add('dragging'); e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _updateFieldDropHighlights(unit.name,0,true,i);
        _createDragGhost(div);
      });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',e=>{
        div.classList.remove('dragging'); _clearFieldMergeTimer(); _clearFieldDropHighlights();
        _removeDragGhost(); _removeStackPreviewOverlay(); _fieldDragSrcEl=null;
        _fieldDragSrc=-1;
      });
      div.addEventListener('dragover',e=>{
        const _dragArr=_dragSrc&&(_dragSrc.arr==='inventory'?G.inventory:_dragSrc.arr==='unitEquip'?(G.allies[_dragSrc.unitIdx]?.equipment||[]):G.spells);
        if(unit.hp>0&&_dragSrc&&(_dragSrc.arr==='spells'||_dragSrc.arr==='inventory'||_dragSrc.arr==='unitEquip')&&isEquipmentCard(_dragArr[_dragSrc.idx])&&_isNonCombatEquipPhase()){
          e.preventDefault();
          div.classList.add('drag-over');
        } else if(_rewDragSrc>=0){
          const rc=_rewCards[_rewDragSrc];
          if(!rc?._isChar) return;
          if(unit.name===rc.name&&unit.grade===rc.grade&&(unit.grade||1)<6&&!unit.unique&&(!G._isRewardTown||G.gold>=(rc._buyPrice??2))){
            e.preventDefault();
            _showStackPreviewOverlay(null,unit,rc,e.clientX,e.clientY);
          }
        } else if(_fieldDragSrc>=0&&_fieldDragSrc!==i){
          e.preventDefault();
          _lastDragX=e.clientX; _lastDragY=e.clientY;
          _moveStackPreview(e.clientX,e.clientY);
          const srcUnit=G.allies[_fieldDragSrc];
          if(srcUnit&&unit.name===srcUnit.name&&unit.grade===srcUnit.grade&&(unit.grade||1)<6&&!unit.unique){
            if(_fieldMergeTarget!==i){
              _clearFieldMergeTimer();
              _fieldMergeTarget=i;
              _fieldMergeTimer=setTimeout(()=>{
                _fieldMergeReady=true;
                const fAlly=document.getElementById('f-ally');
                if(fAlly&&fAlly.children[i]) fAlly.children[i].classList.add('merge-ready');
                _showStackPreviewOverlay(null,unit,srcUnit,_lastDragX||0,_lastDragY||0);
              },500);
            }
          } else {
            if(_fieldMergeTarget===i) _clearFieldMergeTimer();
            div.classList.add('drag-over');
          }
        }
      });
      div.addEventListener('dragleave',e=>{
        if(div.contains(e.relatedTarget)) return;
        if(_fieldMergeTarget===i){ _clearFieldMergeTimer(); div.classList.remove('merge-ready'); }
        _removeStackPreviewOverlay(div); div.classList.remove('drag-over');
      });
      div.addEventListener('drop',e=>{
        e.preventDefault();
        const wasMergeReady=_fieldMergeReady&&_fieldMergeTarget===i;
        _clearFieldMergeTimer(); _removeStackPreviewOverlay(div);
        div.classList.remove('drag-over','merge-ready');
        const _dropArr=_dragSrc&&(_dragSrc.arr==='inventory'?G.inventory:_dragSrc.arr==='unitEquip'?(G.allies[_dragSrc.unitIdx]?.equipment||[]):G.spells);
        if(unit.hp>0&&_dragSrc&&(_dragSrc.arr==='spells'||_dragSrc.arr==='inventory'||_dragSrc.arr==='unitEquip')&&isEquipmentCard(_dropArr[_dragSrc.idx])&&_isNonCombatEquipPhase()){
          if(_dragSrc.arr==='unitEquip') moveEquippedCardToUnit(_dragSrc.idx,_dragSrc.unitIdx,i);
          else equipInventoryCardToUnit(_dragSrc.idx,i,_dragSrc.arr);
          _dragSrc=null;
        } else if(_rewDragSrc<=-100){
          // 相手手札からのドラッグ購入（既存ユニット上でも発動）
          const handIdx=-(_rewDragSrc+100); _rewDragSrc=-1;
          buyMasterHandItem(handIdx);
        } else if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc?._isChar&&unit.name===rc.name&&unit.grade===rc.grade&&(unit.grade||1)<6&&!unit.unique) _applyStack(i,src);
        } else if(_fieldDragSrc>=0){
          _clearFieldDropHighlights();
          if(wasMergeReady){ _applyFieldMerge(_fieldDragSrc,i); }
          else { _dropFieldUnit(i); }
        }
      });
    } else {
      div.className='slot empty';
      div.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0){
          const rc=_rewCards[_rewDragSrc];
          if(rc?._isChar){ e.preventDefault(); div.classList.add('drag-over'); }
        } else if(_rewDragSrc<=-100){ e.preventDefault(); div.classList.add('drag-over'); }
        else if(_fieldDragSrc>=0){ e.preventDefault(); div.classList.add('drag-over'); }
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{
        e.preventDefault(); div.classList.remove('drag-over');
        if(_rewDragSrc<=-100){
          // 相手手札からのドラッグ購入
          const handIdx=-(_rewDragSrc+100); _rewDragSrc=-1;
          buyMasterHandItem(handIdx);
        } else if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc&&rc._isChar){
            if(!G._isRewardTown||G.gold>=(rc._buyPrice??2)){
              takeRewCard(src,i);
            } else {
              log('ゴールドが不足しています','bad');
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
let _fieldMergeTimer=null;// 盤面内重ねの0.5秒タイマー
let _fieldMergeTarget=-1; // タイマー対象のスロットインデックス
let _fieldMergeReady=false;// タイマー発火済みフラグ
let _lastDragX=0, _lastDragY=0; // dragover座標キャッシュ
let _fieldDragStartY=0;   // dragstart時のY座標（前衛後衛切り替え判定用）

function _clearFieldMergeTimer(){
  clearTimeout(_fieldMergeTimer);
  _fieldMergeTimer=null; _fieldMergeTarget=-1; _fieldMergeReady=false;
}

function _dropFieldUnit(destIdx){
  if(_fieldDragSrc<0) return;
  const src=_fieldDragSrc; _fieldDragSrc=-1;
  const tmp=G.allies[src]; G.allies[src]=G.allies[destIdx]; G.allies[destIdx]=tmp;
  renderFieldEditor();
}

// 盤面内重ね（使役効果なし）
function _applyFieldMerge(srcIdx, dstIdx){
  const src=G.allies[srcIdx]; const dst=G.allies[dstIdx];
  if(!src||!dst) return;
  if((dst.grade||1)>=6){ log(`${dst.name} はG6のため重ねられません`,'bad'); return; }
  if(dst.unique){ log(`${dst.name} はユニークキャラのため重ねられません`,'bad'); return; }
  if(src.grade!==dst.grade){ log(`グレードが異なるため重ねられません（G${dst.grade}≠G${src.grade}）`,'bad'); return; }
  const result=_computeStackResult(dst,src);
  dst.atk=result.atk; dst.baseAtk=result.atk;
  dst.hp=result.hp; dst.maxHp=result.hp;
  dst.grade=result.grade;
  dst.desc=result.desc;
  dst.keywords=result.keywords;
  dst._stackCount=result.stackCount;
  dst._baseGrade=result.baseGrade;
  dst._baseDesc=result.baseDesc;
  if(result.keywords.includes('反撃')) dst.counter=true;
  G.allies[srcIdx]=null;
  _fieldDragSrc=-1;
  const _evoLabel=(dst._stackCount||0)>=2?'2段進化':'1段進化';
  log(`${dst.name}：${_evoLabel}！ → ${result.atk}/${result.hp} G${result.grade}`,'gold');
  updateHUD(); renderRewCards(); renderFieldEditor(); renderGradeUpBtn();
}

// ── 重ねシステム ヘルパー ──────────────────────────

// ベースdesc の各数値に n 回分の加算を適用（結果 = baseNum * (n+1)）
function _applyDescStack(baseDesc, newStackCount){
  // 後方互換用（直接呼び出し時）：×(stackCount+1)倍
  if(!baseDesc||newStackCount<=0) return baseDesc||'';
  const baseNums=[...baseDesc.matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  if(!baseNums.length) return baseDesc;
  let idx=0;
  return baseDesc.replace(/\d+/g,()=>{
    const bNum=idx<baseNums.length?baseNums[idx++]:0;
    return String(bNum*(newStackCount+1));
  });
}

// 2枚のdescの対応する数値を加算して新しいdescを生成
function _mergeDescNums(descA, descB){
  if(!descA) return descB||'';
  const numsB=[...( descB||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  let idx=0;
  return descA.replace(/\d+/g,m=>{
    const na=parseInt(m);
    const nb=idx<numsB.length?numsB[idx++]:0;
    return String(na+nb);
  });
}

// キーワード配列をマージ（数値付きキーワードは数値を加算）
function _mergeKeywords(baseKws, addKws){
  const result=[...baseKws];
  (addKws||[]).forEach(kw=>{
    const base=kw.replace(/\d+$/,'');
    const num=parseInt(kw.match(/\d+$/)?.[0]);
    const existIdx=result.findIndex(k=>k.replace(/\d+$/,'')===base);
    if(existIdx>=0){
      if(!isNaN(num)){
        const existNum=parseInt(result[existIdx].match(/\d+$/)?.[0])||0;
        result[existIdx]=base+(existNum+num);
      }
    } else { result.push(kw); }
  });
  return result;
}

// 重ね後のスタッツ・テキストを計算（プレビュー・実行共用）
function _computeStackResult(fieldUnit, srcUnit){
  const newAtk=fieldUnit.atk+srcUnit.atk;
  const newHp=fieldUnit.hp+srcUnit.hp;
  const fSC=fieldUnit._stackCount||0;
  const sSC=srcUnit._stackCount||0;
  const newStackCount=fSC+sSC+1;
  const baseGrade=fieldUnit._baseGrade||fieldUnit.grade||1;
  // 重ねるごとにグレード+1（最大G6）
  const newGrade=Math.min(6,(fieldUnit.grade||1)+1);
  const baseDesc=fieldUnit._baseDesc!=null?fieldUnit._baseDesc:(fieldUnit.desc||'');
  const srcDesc=srcUnit._baseDesc!=null?srcUnit._baseDesc:(srcUnit.desc||'');
  // 重ね後のdesc：1進化・2進化列が優先、なければ2枚のdescの数値を加算
  const def=UNIT_POOL.find(u=>u.id===(fieldUnit.defId||fieldUnit.id)||u.name===fieldUnit.name);
  let newDesc=baseDesc;
  if(newStackCount>=2&&def?.stack2Desc) newDesc=def.stack2Desc;
  else if(newStackCount>=1&&def?.stack1Desc) newDesc=def.stack1Desc;
  else if(def?.stackEnhDesc) newDesc=def.stackEnhDesc; // 後方互換
  else if(def?.stackEffect) newDesc=def.stackEffect;   // 後方互換（旧重ね効果列）
  else newDesc=_mergeDescNums(fieldUnit.desc||'', srcUnit.desc||''); // 現在のdescの数値を加算
  const newKws=_mergeKeywords(fieldUnit.keywords||[],srcUnit.keywords||[]);
  return {atk:newAtk,hp:newHp,grade:newGrade,desc:newDesc,keywords:newKws,
    stackCount:newStackCount,baseGrade,baseDesc};
}

// 重ねを実行する
function _applyStack(fieldIdx, rewIdx){
  const rewCard=_rewCards[rewIdx];
  const fieldUnit=G.allies[fieldIdx];
  if(!rewCard||!fieldUnit) return;
  if((fieldUnit.grade||1)>=6){ log(`${fieldUnit.name} はG6のため重ねられません`,'bad'); return; }
  if(fieldUnit.unique){ log(`${fieldUnit.name} はユニークキャラのため重ねられません`,'bad'); return; }
  if(rewCard.grade!==fieldUnit.grade){ log(`グレードが異なるため重ねられません（G${fieldUnit.grade}≠G${rewCard.grade}）`,'bad'); return; }
  if(!G._isRewardTown){
    if(_rewFreePickDone){ log('無料取得は1枚のみです','bad'); return; }
    _rewFreePickDone=true;
  } else {
    const cost=rewCard._buyPrice??2;
    if(G.gold<cost){ log('ゴールドが不足しています','bad'); return; }
    G.gold-=cost;
  }
  const result=_computeStackResult(fieldUnit,rewCard);
  fieldUnit.atk=result.atk; fieldUnit.baseAtk=result.atk;
  fieldUnit.hp=result.hp; fieldUnit.maxHp=result.hp;
  fieldUnit.grade=result.grade;
  fieldUnit.desc=result.desc;
  fieldUnit.keywords=result.keywords;
  fieldUnit._stackCount=result.stackCount;
  fieldUnit._baseGrade=result.baseGrade;
  fieldUnit._baseDesc=result.baseDesc;
  if(result.keywords.includes('反撃')) fieldUnit.counter=true;
  const _evoLabel=(fieldUnit._stackCount||0)>=2?'2段進化':'1段進化';
  log(`${fieldUnit.name}：${_evoLabel}！ → ${result.atk}/${result.hp} G${result.grade}`,'gold');
  squirrelSay('カードを重ねた時');
  // 使役効果（重ね後も発動）
  if(fieldUnit.effect==='chimera_summon'){
    const _pool=['即死','毒牙5','狩人','標的','成長5','加護','反撃','二段攻撃'];
    const _avail=[..._pool.filter(k=>!(fieldUnit.keywords||[]).includes(k))];
    const _chosen=[];
    for(let _ci=0;_ci<3&&_avail.length>0;_ci++){
      const _idx=Math.floor(Math.random()*_avail.length);
      _chosen.push(_avail.splice(_idx,1)[0]);
    }
    if(!fieldUnit.keywords) fieldUnit.keywords=[];
    _chosen.forEach(k=>{ if(!fieldUnit.keywords.includes(k)) fieldUnit.keywords.push(k); });
    if(_chosen.includes('反撃')) fieldUnit.counter=true;
    if(_chosen.includes('標的')){ fieldUnit.hate=true; fieldUnit.hateTurns=99; }
    log(`${fieldUnit.name}：キーワード${_chosen.join('、')}を追加獲得`,'good');
  }
  if(fieldUnit.effect==='mitera_summon'){
    const _pelG=fieldUnit.grade||1;
    const _pelDef=makeSheetBackedUnitDef({id:'c_pelican',name:'ペリカン',race:'獣',grade:_pelG,atk:_pelG,hp:3*_pelG,cost:0,unique:false,icon:'🦤',desc:''});
    const _pelUnit=makeUnitFromDef(_pelDef);
    const _pei=G.allies.findIndex(a=>!a||a.hp<=0);
    if(_pei>=0){
      G.allies[_pei]=_pelUnit;
      log(`${fieldUnit.name}：ペリカン(${_pelG}/${3*_pelG})を盤面に召喚`,'good');
      // グリマルキン（passive）・コカトリス：カード効果召喚バフ
      if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_pelUnit,G.allies);
      if(typeof triggerCocatrice==='function') triggerCocatrice(_pelUnit);
    }
  }
  if(fieldUnit.effect==='dwarf_summon'){
    const _wi=G.spells.findIndex(s=>s&&s.type==='wand');
    const _dcs=3*(fieldUnit._stackCount||0); // 重ね増分（スタック1枚追加分×3）
    if(_dcs>0&&_wi>=0){ G.spells[_wi].usesLeft=(G.spells[_wi].usesLeft||0)+_dcs; log(`${fieldUnit.name}：${G.spells[_wi].name}に充填+${_dcs}`,'good'); }
  }
  if(fieldUnit.effect==='draug_summon'&&typeof triggerDraugSummonChoice==='function') triggerDraugSummonChoice(fieldUnit);
  // slin_summon は削除済み（スリンの新効果は負傷）
  fireTrigger('on_summon', null);
  _rewCards[rewIdx]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
}

// フィールドスロットをドラッグ中にハイライト
function _updateFieldDropHighlights(cardName, cost, isFieldDrag, excludeIdx){
  const canAfford=isFieldDrag||G.gold>=cost;
  _getAllyDomSlots().forEach((slotEl,i)=>{
    if(!slotEl||i===excludeIdx) return;
    const unit=G.allies[i];
    if(!unit||unit.hp<=0){
      if(canAfford) slotEl.classList.add('drag-over');
    } else if(unit.name===cardName){
      if((unit._stackCount||0)>=2){ slotEl.style.opacity='0.35'; slotEl.style.outline='2px solid #555'; }
      else if(canAfford) slotEl.classList.add('drag-over');
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

let _dragGhostDiv=null;
// ドロップ後にDOMが再構築されると dragend が発火しない場合があるため、グローバルで確実に除去
document.addEventListener('dragend', ()=>{ _removeDragGhost(); _removeStackPreviewOverlay(); }, true);
function _createDragGhost(srcEl){
  _removeDragGhost();
  const d=srcEl.cloneNode(true);
  d.querySelectorAll('button').forEach(b=>b.remove()); // 還魂ボタン等を除去
  d.classList.remove('dragging','drag-over','selectable');
  d.classList.add('drag-ghost');
  const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
  const W=srcEl.offsetWidth||80, H=srcEl.offsetHeight||80;
  const visualW=W*scale, visualH=H*scale;
  d.style.cssText=`position:fixed;pointer-events:none;z-index:9998;opacity:1;visibility:hidden;`+
    `width:${W}px;height:${H}px;`+
    `transform:scale(${scale});transform-origin:top left;transition:none;left:0;top:0;`+
    `border-radius:6px;overflow:visible;box-shadow:0 4px 16px rgba(0,0,0,.6)`;
  const cs=getComputedStyle(srcEl);
  ['--card-frame','--card-art','--card-art-size','--card-art-position','--unit-frame','--unit-art','--unit-art-size','--unit-art-position'].forEach(k=>{
    const v=cs.getPropertyValue(k);
    if(v) d.style.setProperty(k,v);
  });
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
  if(_dragGhostDiv){ _dragGhostDiv.remove(); _dragGhostDiv=null; }
}

let _stackPreviewEl=null;

function _buildStackPreviewEl(fieldUnit, srcUnit){
  const result=_computeStackResult(fieldUnit,srcUnit);
  const el=document.getElementById('stack-preview-float')||document.createElement('div');
  el.id='stack-preview-float';
  el.className='stack-preview-ov';
  el.style=`position:fixed;width:90px;z-index:9999;pointer-events:none;display:flex;flex-direction:column;
    background:var(--card,#1e1e2e);border:2px solid var(--gold2);border-radius:6px;overflow:hidden;
    box-shadow:0 4px 24px rgba(0,0,0,.7)`;
  const gradeColors=['','#aaa','#7cf','#fa0','#f60','#f0f','#fff'];  // G6=白金
  const gc=gradeColors[result.grade]||'#fff';
  const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','A・シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090','アーティファクト':'#b0a080'};
  const _mkKw=k=>{const kb=k.replace(/\d+$/,'');const c=_kColorMap[k]||_kColorMap[kb]||'#888';return `<span style="font-size:.38rem;background:rgba(0,0,0,.4);color:${c};border:1px solid ${c};border-radius:2px;padding:0 2px">${k}</span>`;};
  const kwHtml=result.keywords.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;padding:0 2px">${result.keywords.map(_mkKw).join('')}</div>`:'';

  // ── DESC: 現在の実効値（補正込み）＋ src の基礎値 ──
  // computeDesc(fieldUnit) は fieldUnit が G.allies にある実オブジェクトなので
  // グリマルキン・黄金の雫ボーナスが正しく適用される
  const _currDescHtml = fieldUnit.desc ? computeDesc(fieldUnit) : '';
  const _currDescPlain = _currDescHtml.replace(/<[^>]+>/g,'');
  const _currNums = [..._currDescPlain.matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  const _srcBaseDesc = srcUnit._baseDesc!=null ? srcUnit._baseDesc : (srcUnit.desc||'');
  const _srcNums = [..._srcBaseDesc.matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  let _ni=0;
  const _previewDescHtml = _currDescPlain.replace(/\d+/g,()=>{
    const curr=_currNums[_ni]??0;
    const add=_srcNums[_ni]??0;
    _ni++;
    const sum=curr+add;
    return add>0
      ? `<span style="color:var(--gold2);font-weight:700">${sum}</span>`
      : String(curr);
  });
  const _fakeForStrip={keywords:result.keywords,counter:result.keywords.includes('反撃')};
  const _stripped = _stripKeywordsFromDesc(_previewDescHtml, _fakeForStrip);
  const descHtml = _stripped ? `<div class="slot-desc" style="font-size:.42rem;padding:0 3px 3px">${_stripped}</div>` : '';

  // ── ATK/HP: 変化があれば金色で表示 ──
  const _atkChanged = result.atk !== fieldUnit.atk;
  const _hpChanged  = result.hp  !== fieldUnit.hp;
  const atkHtml = _atkChanged
    ? `<span class="a" style="color:var(--gold2);font-weight:700">${result.atk}</span>`
    : `<span class="a">${result.atk}</span>`;
  const hpHtml = _hpChanged
    ? `<span class="h" style="color:var(--gold2);font-weight:700">${result.hp}</span>`
    : `<span class="h">${result.hp}</span>`;

  el.innerHTML=`
    <div style="text-align:center;border-bottom:1px solid var(--gold2);padding:2px 4px;font-size:.42rem;color:var(--gold2);font-weight:700">合成プレビュー</div>
    <div class="slot-grade" style="color:${gc}">${gradeStr(result.grade)}</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 2px 4px">
      <div style="font-size:1.0rem">${fieldUnit.icon||'❓'}</div>
      <div class="slot-name">${fieldUnit.name}</div>
      <div class="slot-race">${fieldUnit.race||'-'}</div>
      <div class="slot-stats">${atkHtml}<span class="s">/</span>${hpHtml}</div>
    </div>
    ${kwHtml}${descHtml}`;
  if(!el.parentNode) document.body.appendChild(el);
  _stackPreviewEl=el;
}

function _moveStackPreview(clientX, clientY){
  if(!_stackPreviewEl) return;
  const W=_stackPreviewEl.offsetWidth||90;
  const H=_stackPreviewEl.offsetHeight||120;
  const vw=window.innerWidth, vh=window.innerHeight;
  let x=clientX+16, y=clientY+16;
  if(x+W>vw) x=clientX-W-8;
  if(y+H>vh) y=clientY-H-8;
  _stackPreviewEl.style.left=x+'px';
  _stackPreviewEl.style.top=y+'px';
}

function _showStackPreviewOverlay(_ignored, fieldUnit, srcUnit, clientX, clientY){
  _buildStackPreviewEl(fieldUnit, srcUnit);
  _moveStackPreview(clientX||0, clientY||0);
}
function _removeStackPreviewOverlay(){
  if(_stackPreviewEl){ _stackPreviewEl.remove(); _stackPreviewEl=null; }
  document.querySelectorAll('.stack-preview-ov').forEach(p=>p.remove());
}

function sellFieldUnit(idx){
  const unit=G.allies[idx]; if(!unit) return;
  if((G.allies||[]).filter(a=>a).length<=1) return;
  if(!window.confirm(`本当に${unit.name}を除名しますか？`)) return;
  (unit.equipment||[]).filter(Boolean).forEach(eq=>{
    const slot=_findMapInventoryEmptySlot();
    if(slot>=0) G.inventory[slot]=eq;
  });
  G.allies[idx]=null;
  if(G._selectedEquipUnitIdx===idx) G._selectedEquipUnitIdx=-1;
  log(`${unit.name} を除名した`,'sys');
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderEnemyHand();
  renderFieldEditor();
  renderGradeUpBtn();
}

// ── 手札エディタ（アイテム）──────────────────────

let _dragSrc=null;
function isEquipmentCard(card){
  return !!(card&&(card.equip||card.kind==='equipment'||card.type==='ring'));
}
const UNIT_EQUIP_SLOTS=[
  {label:'右手', kind:'hand'},
  {label:'左手', kind:'hand'},
  {label:'指輪1', kind:'ring'},
  {label:'指輪2', kind:'ring'},
];
function _normalizeUnitEquipment(unit){
  if(!unit) return [];
  const old=Array.isArray(unit.equipment)?unit.equipment:[];
  const next=new Array(getUnitEquipLimit(unit)).fill(null);
  old.filter(Boolean).forEach(card=>{
    const idx=_findEquipSlotForCard(unit,card,next);
    if(idx>=0) next[idx]=card;
  });
  unit.equipment=next;
  return unit.equipment;
}
function _ensureUnitEquipmentSlots(unit){
  if(!unit) return [];
  const limit=getUnitEquipLimit(unit);
  const arr=Array.isArray(unit.equipment)?unit.equipment:[];
  while(arr.length<limit) arr.push(null);
  if(arr.length>limit) arr.length=limit;
  unit.equipment=arr;
  return unit.equipment;
}
function _equipSlotDef(idx){ return UNIT_EQUIP_SLOTS[idx]||{label:`装備${idx+1}`,kind:'hand'}; }
function _isRingEquip(card){ return !!(card&&card.type==='ring'); }
function _canCardUseEquipSlot(card,idx){
  const slot=_equipSlotDef(idx);
  if(_isRingEquip(card)) return slot.kind==='ring';
  return slot.kind==='hand';
}
function _findEquipSlotForCard(unit,card,arr){
  const equips=arr||unit.equipment||[];
  const limit=getUnitEquipLimit(unit);
  for(let i=0;i<limit;i++){
    if(!equips[i]&&_canCardUseEquipSlot(card,i)) return i;
  }
  return -1;
}
function getUnitEquipLimit(unit){
  return 4;
}
function _isNonCombatEquipPhase(){
  return !(G.phase==='player'||G.phase==='enemy'||G.phase==='commander');
}
function _clearEquipSelection(){
  if(G._selectedEquipUnitIdx==null||G._selectedEquipUnitIdx<0) return;
  G._selectedEquipUnitIdx=-1;
  if(G.phase==='player'||G.phase==='enemy'){
    if(typeof renderAll==='function') renderAll();
    else renderHandEditor();
    return;
  }
  if(G.phase==='map'){
    G.inventoryOpen=false;
    if(typeof renderMapInventory==='function') renderMapInventory();
  }
  renderHandEditor();
  renderFieldEditor();
}
if(!window._equipSelectionClearBound){
  window._equipSelectionClearBound=true;
  document.addEventListener('click',e=>{
    if(G.phase==='enemy'||G.phase==='commander') return;
    if(G._selectedEquipUnitIdx==null||G._selectedEquipUnitIdx<0) return;
    const t=e.target;
    if(t&&t.closest&&t.closest('#hand-slots .card,#map-inventory-panel,.unit-card')) return;
    _clearEquipSelection();
  });
}
function equipInventoryCardToUnit(srcIdx, unitIdx, srcArrName='spells'){
  if(!_isNonCombatEquipPhase()){ log('戦闘中は装備できません','bad'); return false; }
  const srcArr=srcArrName==='inventory'?G.inventory:G.spells;
  const card=srcArr[srcIdx];
  const unit=G.allies[unitIdx];
  if(!card||!isEquipmentCard(card)||!unit||unit.hp<=0) return false;
  const equips=_normalizeUnitEquipment(unit);
  const slotIdx=_findEquipSlotForCard(unit,card,equips);
  if(slotIdx<0){ log(`${unit.name} に装備できる空き枠がありません`,'bad'); return false; }
  equips[slotIdx]=card;
  srcArr[srcIdx]=null;
  G._selectedEquipUnitIdx=unitIdx;
  if(srcArrName==='inventory') G.inventoryOpen=true;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  log(`${unit.name} の${_equipSlotDef(slotIdx).label}に ${card.name} を装備`,'good');
  renderHandEditor();
  renderFieldEditor();
  renderMapInventorySlots();
  return true;
}
function moveEquippedCardToUnit(equipIdx, srcUnitIdx, destUnitIdx){
  if(!_isNonCombatEquipPhase()){ log('戦闘中は装備を移動できません','bad'); return false; }
  if(srcUnitIdx===destUnitIdx) return false;
  const srcUnit=G.allies[srcUnitIdx];
  const destUnit=G.allies[destUnitIdx];
  if(!srcUnit||!destUnit||!srcUnit.equipment||!srcUnit.equipment[equipIdx]||destUnit.hp<=0) return false;
  const card=srcUnit.equipment[equipIdx];
  const destEquips=_normalizeUnitEquipment(destUnit);
  const slotIdx=_findEquipSlotForCard(destUnit,card,destEquips);
  if(slotIdx<0){ log(`${destUnit.name} に装備できる空き枠がありません`,'bad'); return false; }
  srcUnit.equipment[equipIdx]=null;
  destEquips[slotIdx]=card;
  G._selectedEquipUnitIdx=srcUnitIdx;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  log(`${card.name} を ${destUnit.name} の${_equipSlotDef(slotIdx).label}に移した`,'good');
  renderHandEditor();
  renderFieldEditor();
  return true;
}
function unequipFromSelectedUnit(equipIdx){
  const unit=G.allies[G._selectedEquipUnitIdx];
  if(!unit||!unit.equipment||!unit.equipment[equipIdx]) return;
  if(unit.hp<=0){ log('死亡中は装備を外せません','bad'); return; }
  const handIdx=_findMapInventoryEmptySlot();
  if(handIdx<0){ log('インベントリが満杯で外せません','bad'); return; }
  const card=unit.equipment[equipIdx];
  unit.equipment[equipIdx]=null;
  G.inventory[handIdx]=card;
  if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
  log(`${unit.name} から ${card.name} を外した`,'sys');
  renderHandEditor();
  if(G._selectedEquipUnitIdx>=0) renderFieldEditor();
  renderMapInventorySlots();
}
function renderHandEditor(){
  const selected=G.allies[G._selectedEquipUnitIdx];
  const ringPane=document.getElementById('ring-pane');
  if(ringPane) ringPane.style.display='none';
  const handMax=document.getElementById('hand-max');
  const handLabel=document.querySelector('#hand-pane .spell-label');
  if(selected){
    _normalizeUnitEquipment(selected);
    const limit=getUnitEquipLimit(selected);
    renderHeRow('hand-slots', selected.equipment, 0, limit, 'unitEquip');
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=selected.equipment.filter(Boolean).length;
    if(handMax) handMax.textContent=limit;
    if(handLabel) handLabel.childNodes[0].nodeValue=`${selected.name}の装備 `;
  } else {
    G._selectedEquipUnitIdx=-1;
    renderHeRow('hand-slots', G.spells, 0, G.handSlots, 'spells');
    const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s).length;
    if(handMax) handMax.textContent=G.handSlots||7;
    if(handLabel) handLabel.childNodes[0].nodeValue='インベントリ ';
  }
  requestAnimationFrame(fitCardDescs);
}

function renderHeRingSlots(){
  const el=document.getElementById('ring-slots');
  if(!el) return;
  el.innerHTML='';
  const unit=G.allies[G._selectedEquipUnitIdx];
  const R=unit?getUnitEquipLimit(unit):2;
  const equips=unit?(unit.equipment=unit.equipment||[]):[];
  el.style.gridTemplateColumns=`repeat(${R},1fr)`;
  const ringPane=document.getElementById('ring-pane');
  if(ringPane) ringPane.style.flex=R;
  const handPaneRe=document.getElementById('hand-pane');
  if(handPaneRe) handPaneRe.style.flex=10-R;
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=equips.filter(r=>r).length;
  const rm=document.getElementById('ring-max');   if(rm) rm.textContent=R;
  for(let i=0;i<R;i++){
    const ring=equips[i];
    if(ring){
      const div=document.createElement('div');
      div.className='card ring';
      if(typeof applyCardVisual==='function') applyCardVisual(div,ring);
      else if(typeof getCardAsset==='function'&&typeof assetUrl==='function') div.style.setProperty('--card-art',assetUrl(getCardAsset(ring)));
      div.innerHTML=`<div class="card-art"></div><div class="card-tp ring">装備</div><div class="card-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(ring.grade||1):gradeStr(ring.grade||1)}</div><div class="card-name">${ring.name}</div><div class="card-desc">${computeDesc(ring)}</div><button class="discard-btn" title="外す">外す</button>`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); unequipFromSelectedUnit(i); };
      div.onclick=()=>unequipFromSelectedUnit(i);
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty';
      if(!unit) ph.textContent='キャラ選択';
      ph.addEventListener('dragover',e=>{ if(_dragSrc&&_dragSrc.arr==='spells'&&isEquipmentCard(G.spells[_dragSrc.idx])){ e.preventDefault(); ph.classList.add('drag-over'); } });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{
        e.preventDefault(); ph.classList.remove('drag-over');
        if(unit&&_dragSrc&&_dragSrc.arr==='spells') equipInventoryCardToUnit(_dragSrc.idx,G._selectedEquipUnitIdx);
        _dragSrc=null;
      });
      el.appendChild(ph);
    }
  }
}

function renderHeRow(elId, arr, startIdx, count, arrName){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const Hcols=count;
  el.style.setProperty('grid-template-columns',`repeat(${Hcols},var(--hand-card-w,300px))`,'important');
  el.style.setProperty('justify-content','start','important');
  if(elId==='hand-slots'){
    const handPane=document.getElementById('hand-pane');
    if(handPane) handPane.style.flex=Hcols;
  }
  for(let i=startIdx;i<startIdx+Hcols;i++){
    const _handPos=i-startIdx;
    const _handMid=(Math.min(count,Hcols)-1)/2;
    const _handArc=Math.abs(_handPos-_handMid);
    const _slotDef=arrName==='unitEquip'?_equipSlotDef(i):null;
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
      const _isRingInHand=!card.type||(card.kind==='summon'||card.kind==='passive'||isEquipmentCard(card));
      const t=_isRingInHand?'ring':(card.type||'wand');
      div.className=`card ${t}`;
      if(_slotDef) div.classList.add(`equip-slot-${_slotDef.kind}`);
      const _selectedEquipDead=arrName==='unitEquip'&&G.allies?.[G._selectedEquipUnitIdx]?.hp<=0;
      const _combatEquipView=arrName==='unitEquip'&&(!_isNonCombatEquipPhase()||_selectedEquipDead);
      const _combatEquipInInventory=arrName==='spells'&&!_isNonCombatEquipPhase()&&isEquipmentCard(card);
      if(_combatEquipView) div.classList.add('equip-combat-view');
      if(_combatEquipView||_combatEquipInInventory) div.classList.add('equip-combat-dim');
      if(typeof applyCardVisual==='function') applyCardVisual(div,card);
      else if(typeof getCardAsset==='function'&&typeof assetUrl==='function') div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
      div.style.paddingBottom='22px'; // 破棄ボタン分の余白確保
      div.draggable=arrName!=='unitEquip'||_isNonCombatEquipPhase();
      const _rewPhaseInv=!G._isShop&&G.phase==='reward';
      if(_isRingInHand&&_rewPhaseInv) div.style.cssText=(div.style.cssText||'')+';opacity:0.45;filter:grayscale(0.45)';
      div.style.setProperty('--hand-i',_handPos);
      div.style.setProperty('--hand-mid',_handMid);
      div.style.setProperty('--hand-arc',_handArc);
      const _gradeEl=`<span class="card-grade${card.legend?' legend-grade':''}">${typeof gradeIconHtml==='function'?gradeIconHtml(card.grade||1):gradeStr(card.grade||1)}</span>`;
      const _charges=t==='wand'?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?')):null;
      const _chargeHtml=_charges!==null?`<div class="card-charge">${_charges}</div>`:'';
      const _spellBtn=arrName==='unitEquip'
        ?`<button class="discard-btn" title="${_combatEquipView?'戦闘中は外せません':'外す'}"${_combatEquipView?' disabled':''}>×</button>`
        :G._isShop?`<button class="discard-btn" title="売却+1ゴールド" style="color:var(--gold2)">×</button>`:`<button class="discard-btn" title="破棄">×</button>`;
      const _slotLabel=_slotDef?`<div class="equip-slot-label">${_slotDef.label}</div>`:'';
      div.innerHTML=`${_slotLabel}${_gradeEl}<div class="card-art"></div><div class="card-tp ${t}">${t==='ring'?'指輪':t==='wand'?'杖':'アイテム'}</div><div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${_chargeHtml}${_spellBtn}`;
      div.querySelector('.discard-btn').onclick=ev=>{
        ev.stopPropagation();
        if(_combatEquipView) return;
        if(arrName==='unitEquip'){ unequipFromSelectedUnit(i); return; }
        if(G._isShop){ arr[i]=null; G.gold+=1; updateHUD(); const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold; log(card.name+' を売却（+1ゴールド）','gold'); squirrelSay('カードを売却した時'); renderHandEditor(); }
        else discardHeCard(arrName,i);
      };
      if(arrName==='unitEquip') div.onclick=e=>{ e.stopPropagation(); unequipFromSelectedUnit(i); };
      if((G.phase==='reward'||G.phase==='map')&&arrName==='spells'&&!card.noRewardUse&&!isEquipmentCard(card)){
        const _isWand=t==='wand';
        const _hasCharge=!_isWand||(card.usesLeft===undefined||card.usesLeft>0);
        if(_hasCharge){ div.onclick=()=>useSpell(i); div.style.cursor='pointer'; }
      }
      if(arrName!=='unitEquip'||_isNonCombatEquipPhase()){
        div.addEventListener('dragstart',e=>{
          if(arrName==='unitEquip'&&!_isNonCombatEquipPhase()){ e.preventDefault(); return; }
          _dragSrc=arrName==='unitEquip'?{arr:arrName,idx:i,unitIdx:G._selectedEquipUnitIdx}:{arr:arrName,idx:i};
          div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div);
        });
        div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
        div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); });
      }
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      if(arrName==='unitEquip'){
        ph.classList.add('equip-empty',`equip-slot-${_slotDef.kind}`);
        ph.textContent=_slotDef.label;
      }
      if(arrName==='spells') ph.classList.add('belt-empty');
      ph.style.setProperty('--hand-i',_handPos);
      ph.style.setProperty('--hand-mid',_handMid);
      ph.style.setProperty('--hand-arc',_handArc);
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{
        e.preventDefault(); ph.classList.remove('drag-over');
        ph._skipNextClick=true;
        if(arrName==='unitEquip'&&_dragSrc){
          const srcCard=_dragSrc.arr==='inventory'?G.inventory[_dragSrc.idx]:_dragSrc.arr==='unitEquip'?(G.allies[_dragSrc.unitIdx]?.equipment||[])[_dragSrc.idx]:G.spells[_dragSrc.idx];
          if(srcCard&&isEquipmentCard(srcCard)&&!_canCardUseEquipSlot(srcCard,i)){
            log(`${srcCard.name} は${_slotDef.label}に装備できません`,'bad');
            _dragSrc=null;
            return;
          }
        }
        dropOnCard(arrName,i);
      });
      if(arrName==='unitEquip') ph.onclick=e=>{
        e.stopPropagation();
        if(ph._skipNextClick){ ph._skipNextClick=false; return; }
        _clearEquipSelection();
      };
      el.appendChild(ph);
    }
  }
}

function dropOnCard(destArr,destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  const srcUnitIdx=_dragSrc.unitIdx;
  _dragSrc=null;
  // 宝箱ドラッグ：インベントリ/指輪スロットへドロップで取得
  if(srcArr==='treasure'){
    if(typeof _takeFieldTreasure==='function') _takeFieldTreasure(srcIdx);
    return;
  }
  // 報酬カード（杖・消耗品・指輪）のドロップ購入
  if(srcArr==='rew'){
    takeRewCard(srcIdx);
    return;
  }
  const _arrOf=name=>name==='rings'?G.rings:name==='inventory'?G.inventory:G.spells;
  if(destArr==='unitEquip'){
    const destUnit=G.allies[G._selectedEquipUnitIdx];
    if(!destUnit||!_isNonCombatEquipPhase()) return;
    const destEquips=_ensureUnitEquipmentSlots(destUnit);
    const srcUnit=srcArr==='unitEquip'?G.allies[srcUnitIdx]:null;
    const srcEquips=srcUnit?_ensureUnitEquipmentSlots(srcUnit):null;
    const src=_arrOf(srcArr);
    const card=srcArr==='unitEquip'?(srcEquips&&srcEquips[srcIdx]):src[srcIdx];
    if(!card||!isEquipmentCard(card)||!_canCardUseEquipSlot(card,destIdx)){
      if(card) log(`${card.name} は${_equipSlotDef(destIdx).label}に装備できません`,'bad');
      return;
    }
    const destCard=destEquips[destIdx]||null;
    if(srcArr==='unitEquip'){
      if(!srcEquips) return;
      if(destCard&&!_canCardUseEquipSlot(destCard,srcIdx)){
        log(`${destCard.name} は${_equipSlotDef(srcIdx).label}に装備できません`,'bad');
        return;
      }
      srcEquips[srcIdx]=destCard;
    } else {
      src[srcIdx]=destCard;
    }
    destEquips[destIdx]=card;
    if(typeof syncEquipmentPassives==='function') syncEquipmentPassives();
    renderHandEditor();
    renderFieldEditor();
    renderMapInventorySlots();
    return;
  }
  const _isRingCard=c=>isEquipmentCard(c)||(c&&(c.kind==='summon'||c.kind==='passive'||c.type==='ring'));
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
  const refund=cardRefund(card);
  if(refund>0){
    G.gold+=refund;
    updateHUD();
    const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
    try{ log(card.name+' を還魂（+'+refund+'ゴールド）','gold'); }catch(e){}
  } else {
    try{ log(card.name+' を破棄','sys'); }catch(e){}
  }
  renderHandEditor();
  try{ renderEnemyHand(); }catch(e){}
  try{ renderGradeUpBtn(); }catch(e){}
}

function discardRing(idx){
  const ring=G.rings[idx]; if(!ring) return;
  G.rings[idx]=null;
  // 憤激の指輪：破棄時に全仲間のfuryボーナスを解除
  if(ring.unique==='fury_start'){
    G.allies.forEach(a=>{ if(a&&a._furyAtk){ a.atk-=a._furyAtk; a.baseAtk-=a._furyAtk; delete a._furyAtk; }});
    log(`憤激の指輪：パワーボーナスを解除`,'sys');
  }
  updateGoldenDrop();
  // ユニーク指輪は破棄時に再出現しないよう記録
  if(ring.legend||ring._isLegend) G._seenLegendRings.add(ring.id);
  updateHUD();
  const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
  log(ring.name+' を破棄','sys');
  renderHandEditor();
  renderGradeUpBtn();
}

// ── 報酬グレードアップUI ────────────────────────

function renderGradeUpBtn(){
  const el=document.getElementById('rw-grade-up-btn');
  if(!el) return;
  el.style.display='none';
  return;
  if(isExperimentalAppearanceMode()){
    el.style.display='none';
    return;
  }
  const count=G.rewardGradeUpCount||0;
  const cost=Math.max(0,(GRADE_UP_COSTS[count]||99)-(G._gradeUpCostBonus||0));
  const maxGrade=4; // 報酬グレードの上限
  if((G.rewardGrade||1)>=maxGrade){
    el.style.display='none';
    return;
  }
  el.style.display='';
  el.textContent=`グレードアップ（${cost}ゴールド）`;
  el.disabled=G.gold<cost;
  el.style.opacity=G.gold<cost?'0.4':'';
}

function doGradeUp(){
  if(isExperimentalAppearanceMode()){
    log('EXPERIMENTALモードではグレードアップできません','sys');
    renderGradeUpBtn();
    return;
  }
  const count=G.rewardGradeUpCount||0;
  const cost=Math.max(0,(GRADE_UP_COSTS[count]||99)-(G._gradeUpCostBonus||0));
  const maxGrade=4;
  if((G.rewardGrade||1)>=maxGrade){ log('これ以上グレードアップできません','bad'); return; }
  if(G.gold<cost){ log('ゴールドが足りません','bad'); return; }
  G.gold-=cost;
  G.rewardGradeUpCount=(G.rewardGradeUpCount||0)+1;
  G.rewardGrade=(G.rewardGrade||1)+1;
  // 次の商談フェイズから提示キャラ+1（自動リロールはしない）
  G.rewardCharCount=(G.rewardCharCount||3)+1;
  log(`グレードが${G.rewardGrade}に上昇！（-${cost}ゴールド）次回から提示キャラが${G.rewardCharCount}枚に`,'gold');
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderEnemyHand(); renderGradeUpBtn();
}

// ── イベント（祭壇・宿屋）単品アイテム受け取り画面 ─────
// onDone は受け取り後または「戻る」を押したときに呼ばれるコールバック

let _eventItemDone=null;

function showEventItemPickup(item, onDone){
  const itemCopy=clone(item);
  itemCopy._buyPrice=0;
  _rewCards=[itemCopy];
  _eventItemDone=onDone||null;

  const _faf2=document.getElementById('f-ally'); if(_faf2) _faf2.innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eArea2=document.getElementById('enemy-area');
  if(eArea2) eArea2.style.display='none';
  const rMB2=document.getElementById('reward-move-btns');
  if(rMB2) rMB2.style.display='';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  document.getElementById('ph-badge').textContent='アイテム受け取り';
  document.getElementById('ph-badge').className='ph-badge';
  const bossNotice=document.getElementById('boss-reward-notice');
  if(bossNotice) bossNotice.style.display='none';
  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent='';
  const gradeBtn=document.getElementById('rw-grade-up-btn');
  if(gradeBtn) gradeBtn.style.display='none';
  const rerollBtn=document.getElementById('rw-reroll');
  if(rerollBtn) rerollBtn.style.display='none';

  showScreen('battle');
  renderAll(); renderRewCards(); renderMoveSlotsInEnemy(); renderFieldEditor(); updateHUD();
}

function _eventItemBack(){
  if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); }
}

// ── エンチャントモーダル（互換）──────────────────

let _encCtx={src:'reward',cost:0};
let _encTargetIdx=-1;

function openEncModal(src='reward',cost=0,presetEnchantType=null){
  _encCtx={src,cost};
  _encTargetIdx=-1;
  const rings=G.rings.map((r,i)=>({card:r,idx:i})).filter(x=>x.card&&x.card.kind==='summon');
  if(!rings.length){ alert('手持ちの召喚指輪がありません'); return; }
  const el=document.getElementById('enc-rings');
  el.innerHTML='';
  rings.forEach(({card,idx})=>{
    const div=document.createElement('div');
    div.className='enc-item';
    div.textContent=`${card.name} ${gradeStr(card.grade||1)}${card.enchants?.length?' ['+card.enchants.join('・')+']':''}`;
    div.onclick=()=>{ _encTargetIdx=idx; if(presetEnchantType){ applyEnc(presetEnchantType); } else showEncStep2(); };
    el.appendChild(div);
  });
  document.getElementById('enc-s1').style.display='';
  document.getElementById('enc-s2').style.display='none';
  document.getElementById('enc-modal').classList.add('open');
}
function showEncStep2(){
  document.getElementById('enc-s1').style.display='none';
  document.getElementById('enc-s2').style.display='';
  const el=document.getElementById('enc-types');
  el.innerHTML='';
  ENCHANT_TYPES.forEach(et=>{
    const div=document.createElement('div');
    div.className='enc-type';
    div.innerHTML=`<strong>${et.id}</strong><div style="font-size:.65rem;color:var(--text2);margin-top:2px">${et.effect}</div>`;
    div.onclick=()=>applyEnc(et.id);
    el.appendChild(div);
  });
}
function encBack(){ document.getElementById('enc-s1').style.display=''; document.getElementById('enc-s2').style.display='none'; }
function applyEnc(et){
  if(_encTargetIdx<0) return;
  const ring=G.rings[_encTargetIdx]; if(!ring) return;
  if(!ring.enchants) ring.enchants=[];
  ring.enchants.push(et);
  if(_encCtx.cost>0){ G.gold-=_encCtx.cost; updateHUD(); }
  log(ring.name+' に「'+et+'」付与','good');
  closeEncModal();
  if(_encCtx.src==='reward'){ renderHandEditor(); renderRewCards(); }
  else if(_encCtx.src==='smithy'){
    if(_encCtx.farsight){
      log(`${ring.name} に「${et}」を付与`,'good');
      _smithyChosen&&_smithyChosen.add(_encCtx.smithyKey||'enc0');
      doSmithy&&doSmithy(false);
    } else {
      showEvent&&showEvent('祭壇',`${ring.name} に「${et}」を付与した。`,`エンチャント「${et}」付与`);
    }
  }
}
function closeEncModal(){ document.getElementById('enc-modal').classList.remove('open'); }

// ── マスターオーナーシステム ─────────────────────────

// マスターの手札を生成（報酬グレード以下の杖・アイテムからランダム5枚）
// _rewCards から杖・アイテムをmasterHandに移動（キャラクターのみ報酬エリアに残す）
function _generateMasterHand(){
  G.masterHand=[];
  G.masterRings=[];
}

// マスター手札アイテムを購入（杖・消耗品・指輪）
function buyMasterHandItem(idx){
  const sp=G.masterHand[idx]; if(!sp) return;
  // レッサーデーモン：次に購入する消耗品アイテムで累積分一括消費
  const _ldDisc=_lesserDemonDiscountFor(sp);
  const cost=Math.max(0,(sp._buyPrice??2)-_ldDisc);
  if(G.gold<cost){ log('ゴールドが足りません','bad'); return; }
  const _isRingCard=sp.kind==='summon'||sp.kind==='passive'||sp.type==='ring';
  if(_isRingCard){
    const invIdx=_findMapInventoryEmptySlot();
    if(invIdx<0){ log('インベントリが満杯です。装備を整理してください。','bad'); return; }
    G.gold-=cost;
    _consumeLesserDemonDiscount(_ldDisc);
    const rc=clone(sp); delete rc._buyPrice; rc.noRewardUse=true;
    G.inventory[invIdx]=rc;
    if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
    log(`${rc.name} を取得（インベントリへ、-${cost}ゴールド）`,'good');
    if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
    G.masterHand[idx]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD();
    renderFieldEditor();
    renderMapInventorySlots();
    renderEnemyHand();
    renderRewCards();
    renderGradeUpBtn();
    return;
  }
  const handIdx=_findInventoryEmptySlot();
  if(handIdx<0){ log(`インベントリ（${G.handSlots||5}枠）が満杯です`,'bad'); return; }
  G.gold-=cost;
  _consumeLesserDemonDiscount(_ldDisc);
  delete sp._buyPrice;
  G.spells[handIdx]=sp;
  // ファミリア：商談フェイズで最初に購入した消耗品のコピーを得る（杖は対象外）
  if(sp.type==='consumable'&&G.phase==='reward'&&!G._familiarUsed&&G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='familiar_shop')){
    G._familiarUsed=true;
    const _famHandIdx=_findInventoryEmptySlot();
    if(_famHandIdx>=0){
      const _famCopy=clone(sp);
      G.spells[_famHandIdx]=_famCopy;
      log(`ファミリア：${sp.name}のコピーを獲得`,'good');
    }
  }
  G.masterHand[idx]=null;
  log(`${sp.name} を取得（-${cost}ゴールド）`,'good');
  if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderFieldEditor();
  renderEnemyHand();
  renderRewCards();
  renderGradeUpBtn();
}

// マスター指輪を購入
function buyMasterRingItem(idx){
  const ring=G.masterRings&&G.masterRings[idx]; if(!ring) return;
  // 杖・指輪はレッサーデーモン割引の対象外。割引も消費しない。
  const cost=ring._buyPrice??4;
  if(G.gold<cost){ log('ゴールドが足りません','bad'); return; }
  const ringIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
  if(ringIdx<0){ log(`指輪スロット（${G.ringSlots}枠）が満杯です。破棄してください。`,'bad'); return; }
  G.gold-=cost;
  const rc=clone(ring); delete rc._buyPrice;
  G.rings[ringIdx]=rc;
  if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
  updateGoldenDrop();
  if(rc.unique==='fury_start'){
    const _fb=3*(rc.grade||1);
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_fb; a.baseAtk=(a.baseAtk||0)+_fb; a._furyAtk=(a._furyAtk||0)+_fb; }});
    log(`憤激の指輪：全仲間パワー+${_fb}/±0`,'good');
  }
  if(rc.unique==='extra_action'){
    const _oldPT=G.actionsPerTurn;
    G.actionsPerTurn=calcActions();
    G.actionsLeft=G.actionsLeft+(G.actionsPerTurn-_oldPT);
  }
  G.masterRings[idx]=null;
  log(`${rc.name} を装備（-${cost}ゴールド）`,'good');
  if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderEnemyHand();
  renderRewCards();
  renderGradeUpBtn();
}

// 誘発「オーナーが〜」のオーナー判定：将来マスターが行動した時に呼ぶ
// 現時点ではマスターは行動しないため発動なし
function _checkMasterTrigger(_triggerType){
  // TODO: マスターがアクションを起こした時に実装
}
