// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _placingChar=null; // フィールド配置待ちのキャラカード

// ── 報酬フェイズ開始 ────────────────────────────

function goToReward(){
  G.rings.forEach(r=>{ if(r) r._count=0; });
  arcanaPhaseStart();
  _rewCards=drawRewards();
  G.phase='reward';

  // エリート撃破ボーナス：確定でユニーク指輪を無料で報酬欄に追加（通常宝箱処理より先に実行）
  if(G._eliteKilled){
    G._pendingTreasure=false; // 通常宝箱処理をスキップ
    const eliteRing=drawUniqueRing();
    if(eliteRing){
      eliteRing._isLegend=true; eliteRing._isTreasure=true; eliteRing._buyPrice=0;
      _rewCards.push(eliteRing);
    }
  }

  // 宝箱：moveMasksからchestを除去し、中身を報酬欄に無料で追加
  if(G._pendingTreasure){
    G.moveMasks=G.moveMasks.map(m=>m==='chest'?null:m);
    G.visibleMoves=G.visibleMoves.filter(i=>G.moveMasks[i]);
    const treasureItem=drawRewards(1)[0];
    if(treasureItem){ treasureItem._buyPrice=0; treasureItem._isTreasure=true; _rewCards.push(treasureItem); }
    log('📦 宝箱の中身が報酬欄に追加された！','gold');
    G._pendingTreasure=false;
  }

  // 報酬フェイズUI
  document.getElementById('f-ally').innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='none';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  document.getElementById('btn-retreat').style.display='none';
  document.getElementById('ph-badge').textContent='報酬フェイズ';
  document.getElementById('ph-badge').className='ph-badge';

  const bossNotice=document.getElementById('boss-reward-notice');
  if(_isBossFight){
    G.ringSlots=Math.min(4,G.ringSlots+1);
    let bonusMsg=`🎁 ボスクリア：指輪スロット+1（現在${G.ringSlots}枠）`;
    if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent=bonusMsg; }
  } else if(G._eliteKilled){
    if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent='⭐ エリート撃破：ユニーク指輪が宝箱から出現！（無料）'; }
    log('⭐ エリート撃破：ユニーク指輪を獲得！','gold');
  } else {
    if(bossNotice) bossNotice.style.display='none';
  }

  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent=6;
  const rb=document.getElementById('rw-reroll'); if(rb) rb.style.display='';

  renderAll(); // フィールド（仲間エリア）も再描画
  renderRewCards();
  renderGradeUpBtn();
  renderArcanaInfo();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  setHint('報酬を獲得してください');
  updateHUD();
}

// ── 行き先ノード表示 ───────────────────────────

function renderMoveSlotsInEnemy(){
  const el=document.getElementById('f-enemy');
  el.innerHTML='';
  let opts;
  if(G._retryFloor){
    const nodeType=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle';
    opts=[{nodeType,idx:-1}];
  } else {
    opts=G.visibleMoves.filter(i=>G.moveMasks[i]).map(i=>({nodeType:G.moveMasks[i],idx:i}));
    // イベントアイテム受け取り中（宿屋・祭壇から遷移）は戦闘/ボス戦のみ表示
    if(_eventItemDone) opts=opts.filter(o=>o.nodeType==='battle'||o.nodeType==='boss');
    if(opts.length===0) opts.push({nodeType:FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle',idx:-1});
  }
  for(let i=0;i<6;i++){
    const opt=opts[i];
    const div=document.createElement('div');
    if(opt){
      const nt=NODE_TYPES[opt.nodeType];
      div.className='slot has-move';
      div.style.flexDirection='column';
      div.innerHTML=`<div class="move-icon" style="font-size:1.4rem">${nt.icon}</div><div class="move-lbl" style="font-size:.64rem;font-weight:600">${nt.label}</div><div style="font-size:.54rem;color:var(--text2);margin-top:2px;text-align:center;padding:0 4px">${nt.desc||''}</div>`;
      div.onclick=()=>chooseMoveInline(opt.nodeType);
    } else {
      div.className='slot empty';
    }
    el.appendChild(div);
  }
}

function chooseMoveInline(nt){
  // イベントアイテム受け取り中なら状態更新コールバックを先に実行
  if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); }
  document.getElementById('reward-info-bar').style.display='none';
  document.getElementById('reward-cards-section').style.display='none';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='';
  document.getElementById('btn-pass').style.display='';
  if(G._retryFloor){ G._retryFloor=false; G.floor--; }
  chooseMove(nt);
}

// ── リロール ──────────────────────────────────

function rerollRewards(){
  if(G.gold<1) return;
  G.gold-=1;
  G.rerollCount=(G.rerollCount||0)+1;
  _rewCards=drawRewards();

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
  updateHUD();
  const rb=document.getElementById('rw-reroll'); if(rb) rb.disabled=G.gold<1;
  renderRewCards();
}

// ── 報酬カード描画 ─────────────────────────────

function renderRewCards(){
  const el=document.getElementById('rw-cards');
  el.innerHTML='';
  _rewCards.forEach((card,i)=>{
    if(!card) return;
    el.appendChild(_mkRewDiv(card, ()=>takeRewCard(i)));
  });
  const rb=document.getElementById('rw-reroll'); if(rb) rb.disabled=G.gold<1;
  requestAnimationFrame(fitCardDescs);
}

function _mkRewDiv(card, onBuy){
  const div=document.createElement('div');
  const cost=card._buyPrice??1;
  const canBuy=cost===0||G.gold>=cost;
  const isLegend=!!card._isLegend;
  const isTreasure=!!card._isTreasure;
  div.className='rew-card'+(canBuy?'':' cant')+(isLegend?' legend':'')+(isTreasure?' treasure':'');

  if(card._isChar){
    // キャラクターカード
    const hasSlot=G.allies.includes(null);
    const disabled=!hasSlot;
    div.className='rew-card'+(canBuy&&!disabled?'':' cant')+(isLegend?' legend':'');
    const raceBadge=`<div style="font-size:.55rem;color:var(--text2);margin-bottom:1px">${card.race||'-'}</div>`;
    // 不死ATKボーナス表示（マミー負傷効果）
    const atkBonus=card.race==='不死'&&G._undeadHpBonus?G._undeadHpBonus:0;
    const displayAtk=card.atk+atkBonus;
    const atkStr=atkBonus>0
      ?`<span style="color:var(--teal2)">${displayAtk}</span><span style="font-size:.5rem;color:var(--teal2);margin-left:1px">(+${atkBonus})</span>`
      :`<span style="color:var(--teal2)">${card.atk}</span>`;
    const statsLine=`<div style="font-size:.68rem;font-weight:700;margin-top:2px">${atkStr}<span style="color:var(--text2)">/</span><span style="color:#60d090">${card.hp}</span></div>`;
    const costLine=`<div class="rew-card-cost">${isTreasure?'📦 宝箱（無料）':cost+'ソウル'}${disabled?' （盤面満杯）':''}</div>`;
    const uniqueBadge=card.unique?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
    const gradeTag=card.grade?` <span class="rew-grade">${gradeStr(card.grade)}</span>`:'';
    div.innerHTML=`${costLine}<div style="font-size:.62rem;color:var(--purple2);margin-bottom:1px">キャラクター</div>${raceBadge}<div class="rew-card-name">${card.name}${gradeTag}</div><div class="rew-card-desc">${computeDesc(card)}</div>${statsLine}${uniqueBadge}`;
    if(canBuy&&!disabled) div.onclick=onBuy;
    return div;
  }

  // アイテムカード（杖・消耗品）
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム'};
  const t=card.type||'ring';
  const tColor=t==='ring'?'purple2':t==='wand'?'blue2':'red2';
  const g=card.grade||1;
  const gs=card.legend?'★':gradeStr(g);
  const rdesc=computeDesc(card);
  const refund=cardRefund(card);
  const isRingCard=!card.type||card.type==='ring'||card.kind==='summon'||card.kind==='passive';
  const refundTxt=isRingCard
    ?`<div class="rew-card-refund" style="color:var(--red2)">破棄（ソウルなし）</div>`
    :refund>0?`<div class="rew-card-refund">還魂+${refund}ソウル</div>`:'';
  const tpLabel=card.kind==='summon'?'指輪（召喚）':card.kind==='passive'?'指輪（補助）':(typeLabel[t]||'指輪');
  const legendBadge=isLegend?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
  div.innerHTML=`<div class="rew-card-cost">${isTreasure?'📦 宝箱（無料）':cost+'ソウル'}</div><div class="rew-card-tp" style="color:var(--${tColor})">${tpLabel}</div><div class="rew-card-name">${card.name} <span class="rew-grade">${gs}</span></div><div class="rew-card-desc">${rdesc}</div>${refundTxt}${legendBadge}`;
  if(canBuy) div.onclick=onBuy;
  return div;
}

// ── カード購入処理 ──────────────────────────────

function takeRewCard(i){
  const card=_rewCards[i]; if(!card) return;
  const cost=card._buyPrice??1;
  if(G.gold<cost) return;

  if(card._isChar){
    // キャラクター：フィールドへ配置
    const emptyIdx=G.allies.indexOf(null);
    if(emptyIdx<0){ log('盤面が満杯です。フィールドのキャラクターを還魂してください。','bad'); return; }
    G.gold-=cost;
    const unit=makeUnitFromDef(card);
    G.allies[emptyIdx]=unit;
    log(`${card.name} を獲得（盤面[${emptyIdx}]へ配置）`,'good');
    // ジャック・オ・ランタン：召喚時、全ての味方にシールド付与
    if(unit.effect==='jack_summon'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.shield=(a.shield||0)+1; }});
      log(`${unit.name}：全ての味方にシールドを付与`,'good');
    }
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards(); renderFieldEditor();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // 指輪
  if(card.kind==='passive'||card.kind==='summon'||card.type==='ring'){
    const ringIdx=G.rings.indexOf(null);
    if(ringIdx<0){ log(`指輪スロット（${G.ringSlots}枠）が満杯です。フィールドの指輪を破棄してください。`,'bad'); return; }
    G.gold-=cost;
    const rc=clone(card);
    G.rings[ringIdx]=rc;
    // ユニーク指輪取得時に再出現しないよう記録
    if(card.legend||card._isLegend) G._seenLegendRings.add(card.id);
    log(card.name+' を取得（指輪スロット['+ringIdx+']）','good');
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards(); renderFieldEditor();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // アイテム（杖・消耗品）
  const handIdx=G.spells.indexOf(null);
  if(handIdx<0){ log(`手札が満杯（${G.handSlots}枠）です。アイテムを捨ててください。`,'bad'); return; }

  G.gold-=cost;
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined){ nc.usesLeft=nc.baseUses||randUses(); }
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  G.spells[handIdx]=nc;

  log(card.name+' を'+cost+'ソウルで取得','good');
  _rewCards[i]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderRewCards();
  renderFieldEditor();
}


// ── フィールドエディタ（報酬フェイズ中の配置変更・売却）──

function renderFieldEditor(){
  // フィールド（キャラクター）: f-allyに直接描画
  const fAlly=document.getElementById('f-ally');
  if(fAlly) _renderFieldRow(fAlly);

  // 手札（アイテム）
  renderHandEditor();
}

function _renderFieldRow(el){
  el.innerHTML='';
  for(let i=0;i<6;i++){
    const unit=G.allies[i];
    const div=document.createElement('div');
    if(unit){
      div.className='slot';
      div.style.justifyContent='flex-start';
      div.style.padding='3px 2px 30px';
      div.draggable=true;
      const badges=[];
      if(unit.hate)    badges.push('<span class="slot-badge b-hate">ヘイト</span>');
      if(unit.shield>0)badges.push(`<span class="slot-badge b-shield">🛡${unit.shield}</span>`);
      if(unit.regen)   badges.push(`<span class="slot-badge b-regen">再生${unit.regen}</span>`);
      if(unit.counter) badges.push('<span class="slot-badge b-counter">反撃</span>');
      const badgeBlock=badges.length?`<div class="slot-badges">${badges.join('')}</div>`:'';
      const gradeTag=unit.grade?`<div style="position:absolute;top:2px;left:2px;font-size:.48rem;color:var(--gold);font-weight:700">G${unit.grade}</div>`:'';
      const descTag=unit.desc?`<div class="slot-desc">${unit.desc}</div>`:'';
      const dragonetSub=unit.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${3-(unit._battleCount||0)}戦</div>`:'';
      div.innerHTML=`${badgeBlock}${gradeTag}
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          <div style="font-size:1.1rem">${unit.icon||'❓'}</div>
          ${dragonetSub}
          <div class="slot-name">${unit.name}</div>
          <div class="slot-stats"><span class="a">${unit.atk}</span><span class="s">/</span><span class="h">${unit.hp}</span></div>
        </div>
        <div class="slot-hpbar"><div class="slot-hpfill" style="width:${Math.max(0,unit.hp/unit.maxHp*100)}%"></div></div>
        ${descTag}
        <button class="return-btn" style="bottom:8px">還魂 +1ソウル</button>`;
      div.querySelector('.return-btn').onclick=ev=>{ ev.stopPropagation(); sellFieldUnit(i); };
      div.addEventListener('dragstart',e=>{ _fieldDragSrc=i; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      div.addEventListener('dragend',()=>div.classList.remove('dragging'));
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); _dropFieldUnit(i); });
    } else {
      div.className='slot empty';
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); _dropFieldUnit(i); });
    }
    el.appendChild(div);
  }
}

let _fieldDragSrc=-1;
function _dropFieldUnit(destIdx){
  if(_fieldDragSrc<0) return;
  const src=_fieldDragSrc; _fieldDragSrc=-1;
  const tmp=G.allies[src]; G.allies[src]=G.allies[destIdx]; G.allies[destIdx]=tmp;
  renderFieldEditor();
}

function sellFieldUnit(idx){
  const unit=G.allies[idx]; if(!unit) return;
  G.allies[idx]=null;
  G.gold+=1; G.earnedGold+=1;
  log(`${unit.name} を還魂（+1ソウル）`,'gold');
  // グリマルキン：フィールドに残っているときに別の仲間が還魂されたらボーナス発動
  const grimalkin=G.allies.find(a=>a&&a.effect==='grimalkin_sell');
  if(grimalkin){
    G._grimalkinBonus=(G._grimalkinBonus||0)+1;
    log(`${grimalkin.name}：以後の召喚ユニットが+1/+1（計${G._grimalkinBonus}回）`,'good');
  }
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderRewCards();
  renderFieldEditor();
  renderGradeUpBtn();
}

// ── 手札エディタ（アイテム）──────────────────────

let _dragSrc=null;
function renderHandEditor(){
  renderHeRow('hand-slots', G.spells, 0, G.handSlots, 'spells');
  const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s).length;
  // 指輪スロット
  renderHeRingSlots();
  requestAnimationFrame(fitCardDescs);
}

function renderHeRingSlots(){
  const el=document.getElementById('ring-slots');
  if(!el) return;
  el.innerHTML='';
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=G.rings.filter(r=>r).length;
  const rm=document.getElementById('ring-max');   if(rm) rm.textContent=G.ringSlots;
  for(let i=0;i<G.ringSlots;i++){
    const ring=G.rings[i];
    if(ring){
      const div=document.createElement('div');
      div.className='card ring';
      div.innerHTML=`<div class="card-tp ring">指輪</div><div class="card-grade">${gradeStr(ring.grade||1)}</div><div class="card-name">${ring.name}</div><div class="card-desc">${computeDesc(ring)}</div><button class="discard-btn" title="破棄">破棄</button>`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); discardRing(i); };
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty';
      el.appendChild(ph);
    }
  }
}

function renderHeRow(elId, arr, startIdx, count, arrName){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  for(let i=startIdx;i<startIdx+count;i++){
    const card=arr[i];
    if(card){
      const div=document.createElement('div');
      const t=card.type||'wand';
      div.className=`card ${t}`;
      div.draggable=true;
      const uses=t==='wand'?` (残${card.usesLeft||0})`:''
      div.innerHTML=`<div class="card-tp ${t}">${t==='wand'?'杖':'アイテム'}</div><div class="card-name">${card.name}${uses}</div><div class="card-desc">${computeDesc(card)}</div><button class="discard-btn" title="破棄">破棄</button>`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); discardHeCard(arrName,i); };
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:arrName,idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      div.addEventListener('dragend',()=>div.classList.remove('dragging'));
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{ e.preventDefault(); ph.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(ph);
    }
  }
}

function dropOnCard(destArr,destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  _dragSrc=null;
  if(srcArr!==destArr) return;
  const arr=srcArr==='rings'?G.rings:G.spells;
  const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  renderHandEditor();
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
    try{ log(card.name+' を還魂（+'+refund+'ソウル）','gold'); }catch(e){}
  } else {
    try{ log(card.name+' を破棄','sys'); }catch(e){}
  }
  renderHandEditor();
  try{ renderRewCards(); }catch(e){}
  try{ renderGradeUpBtn(); }catch(e){}
}

function discardRing(idx){
  const ring=G.rings[idx]; if(!ring) return;
  G.rings[idx]=null;
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
  // reward-info-bar 内に grade-up ボタンを動的挿入
  let el=document.getElementById('rw-grade-up-btn');
  if(!el){
    el=document.createElement('button');
    el.id='rw-grade-up-btn';
    el.className='btn tiny';
    el.style='border-color:var(--gold);color:var(--gold2);margin-left:6px';
    document.getElementById('reward-info-bar').appendChild(el);
  }
  const count=G.rewardGradeUpCount||0;
  const maxGrade=4; // 最大G4まで
  if(count>=GRADE_UP_COSTS.length||(G.rewardGrade||1)>=maxGrade){
    el.style.display='none'; return;
  }
  const cost=GRADE_UP_COSTS[count];
  const canAfford=G.gold>=cost;
  el.style.display='';
  el.textContent=`報酬G${(G.rewardGrade||1)}→G${(G.rewardGrade||1)+1}（${cost}ソウル）`;
  el.disabled=!canAfford;
  el.onclick=()=>{
    if(G.gold<cost) return;
    G.gold-=cost;
    G.rewardGrade=(G.rewardGrade||1)+1;
    G.rewardGradeUpCount=(G.rewardGradeUpCount||0)+1;
    log(`📈 報酬グレードアップ：G${G.rewardGrade}（次のリロールから適用）`,'gold');
    // 直後は引き直さない。次のリロール・次の戦闘から適用
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD();
    renderGradeUpBtn();
    renderRewCards();
  };
}

// ── イベント（祭壇・宿屋）単品アイテム受け取り画面 ─────
// onDone は受け取り後または「戻る」を押したときに呼ばれるコールバック

let _eventItemDone=null;

function showEventItemPickup(item, onDone){
  const itemCopy=clone(item);
  itemCopy._buyPrice=0;
  _rewCards=[itemCopy];
  _eventItemDone=onDone||null;

  document.getElementById('f-ally').innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='none';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  document.getElementById('btn-retreat').style.display='none';
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
