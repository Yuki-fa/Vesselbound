// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・手札エディタ・エンチャントモーダル
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];

// ── 報酬フェイズ開始 ─────────────────────────────

function goToReward(){
  _rewCards=drawRewards();
  showScreen('reward');
  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-earned').textContent='+'+G.earnedGold;
  document.getElementById('rw-count').textContent=G.rewardCards;

  // ボス戦後：報酬カード枚数+1
  const bossNotice=document.getElementById('boss-reward-notice');
  if(_isBossFight){
    if(G.rewardCards<G.maxRewardCards){
      G.rewardCards++;
      _rewCards=drawRewards(); // 増えた枚数で再抽選
      if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent=`🎁 ボスクリア：報酬カード+1（現在${G.rewardCards}枚）`; }
    } else {
      if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent=`🎁 ボスクリア：報酬カードは最大（${G.rewardCards}枚）`; }
    }
    document.getElementById('rw-count').textContent=G.rewardCards;
  } else {
    if(bossNotice) bossNotice.style.display='none';
  }

  renderRewCards();
  renderHandEditor();
}

// ── リロール（1金で全カード入れ替え）──────────────

function rerollRewards(){
  if(G.gold<1){ return; }
  G.gold-=1;
  _rewCards=drawRewards();
  document.getElementById('rw-gold').textContent=G.gold;
  const rb=document.getElementById('rw-reroll'); if(rb) rb.disabled=G.gold<1;
  renderRewCards();
}

// ── 報酬カードの描画 ──────────────────────────────

function renderRewCards(){
  const el=document.getElementById('rw-cards');
  el.innerHTML='';
  const typeLabel={ring:'指輪',wand:'杖',consumable:'消耗品'};
  _rewCards.forEach((card,i)=>{
    if(!card) return;
    const div=document.createElement('div');
    const cost=card._buyPrice||1;
    const canBuy=G.gold>=cost;
    div.className='rew-card'+(canBuy?'':' cant');
    const t=card.type||'ring';
    const tColor=t==='ring'?'purple2':t==='wand'?'blue2':'red2';
    const g=card.grade||1;
    const gs=gradeStr(g);
    const rdesc=computeDesc(card);
    const refund=cardRefund(card);
    const refundTxt=refund>0?`<div class="rew-card-refund">売却+${refund}金</div>`:'';
    // 同名指輪所持時はグレード加算プレビュー
    const isRingCard=!card.type||card.type==='ring'||card.kind==='summon'||card.kind==='passive';
    let mergeHint='';
    if(isRingCard){
      const owned=G.rings.find(r=>r&&r.id===card.id);
      if(owned){
        const newG=Math.min(MAX_GRADE,(owned.grade||1)+g);
        mergeHint=`<div class="rew-merge">▲ ${gradeStr(owned.grade||1)}→${gradeStr(newG)}</div>`;
      }
    }
    div.innerHTML=`<div class="rew-card-cost">${cost}金</div><div class="rew-card-tp" style="color:var(--${tColor})">${typeLabel[t]||'指輪'}</div><div class="rew-card-name">${card.name} <span class="rew-grade">${gs}</span></div><div class="rew-card-desc">${rdesc}</div>${refundTxt}${mergeHint}`;
    if(canBuy) div.onclick=()=>takeRewCard(i);
    el.appendChild(div);
  });
  const rb=document.getElementById('rw-reroll'); if(rb) rb.disabled=G.gold<1;
}

// ── カード購入 ────────────────────────────────────

function takeRewCard(i){
  const card=_rewCards[i]; if(!card) return;
  const cost=card._buyPrice||1;
  if(G.gold<cost) return;

  const isRing=!card.type||card.type==='ring'||card.kind==='summon'||card.kind==='passive';
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined){ nc.usesLeft=nc.baseUses||randUses(); }
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;

  if(isRing){
    // 同じ指輪を所持→グレード加算
    const ownedIdx=G.rings.findIndex(r=>r&&r.id===nc.id);
    if(ownedIdx>=0){
      const owned=G.rings[ownedIdx];
      const newGrade=Math.min(MAX_GRADE,(owned.grade||1)+(nc.grade||1));
      G.gold-=cost;
      log(`${owned.name} グレード加算 ${gradeStr(owned.grade||1)}→${gradeStr(newGrade)}`,'good');
      owned.grade=newGrade;
      if(newGrade>=MAX_GRADE&&!G.bannedRings.includes(nc.id)){
        G.bannedRings.push(nc.id);
        log(`${owned.name} が${gradeStr(MAX_GRADE)}に到達。プールから除外`,'sys');
      }
      _rewCards[i]=null;
      document.getElementById('rw-gold').textContent=G.gold;
      updateHUD(); renderRewCards(); renderHandEditor();
      return;
    }
    // 空きスロットに配置
    if(G.rings.filter(r=>r).length>=G.ringSlots){
      alert(`指輪枠（${G.ringSlots}）が満杯です。下の手札から売却してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=0;j<G.ringSlots;j++){ if(!G.rings[j]){ G.rings[j]=nc; placed=true; break; } }
    if(!placed) G.rings.push(nc);
  } else if(card.type==='wand'){
    if(G.spells.slice(0,G.wandSlots).filter(s=>s).length>=G.wandSlots){
      alert(`杖枠（${G.wandSlots}）が満杯です。下の手札から売却してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=0;j<G.wandSlots;j++){ if(!G.spells[j]){ G.spells[j]=nc; placed=true; break; } }
    if(!placed) G.spells.splice(G.wandSlots,0,nc);
  } else {
    if(G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length>=G.consumSlots){
      alert(`消耗品枠（${G.consumSlots}）が満杯です。下の手札から売却してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=G.wandSlots;j<G.wandSlots+G.consumSlots;j++){ if(!G.spells[j]){ G.spells[j]=nc; placed=true; break; } }
    if(!placed) G.spells.push(nc);
  }

  log(card.name+' を'+cost+'金で取得','good');
  _rewCards[i]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderHandEditor();
}

// ── 報酬終了（金リセット）────────────────────────

function rewardDone(){
  G.gold=0;  // 報酬フェイズ終了で金をリセット
  if(G._retryFloor){
    G._retryFloor=false;
    G.floor--;
    const nodeType=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle';
    renderMoveSelect([{nodeType,idx:-1}]);
    showScreen('move');
    return;
  }
  const opts=G.visibleMoves.filter(i=>G.moveMasks[i]).map(i=>({nodeType:G.moveMasks[i],idx:i}));
  if(opts.length===0) opts.push({nodeType:'battle',idx:-1});
  renderMoveSelect(opts);
  showScreen('move');
}

// ═══════════════════════════════════════
// HAND EDITOR（ドラッグ並べ替え・売却）
// ═══════════════════════════════════════
let _dragSrc=null;

function renderHandEditor(){
  renderHeRow('he-rings', G.rings, 0, G.ringSlots, 'rings');
  renderHeRow('he-wands', G.spells, 0, G.wandSlots, 'wands');
  renderHeRow('he-consums', G.spells, G.wandSlots, G.consumSlots, 'consums');
}

function renderHeRow(elId, arr, startIdx, count, arrName){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const typeLabel={ring:'指輪',wand:'杖',consumable:'消耗品'};
  const isSpells=(arrName==='wands'||arrName==='consums');
  for(let i=startIdx;i<startIdx+count;i++){
    const card=arr[i];
    if(card){
      const div=document.createElement('div');
      const t=card.type||'ring';
      div.className=`card ${t}`;
      div.draggable=true;
      const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
      const kl=card.kind==='passive'?' <span style="font-size:.5rem;color:var(--teal2)">P</span>':'';
      const g=card.grade||1;
      const gs=gradeStr(g);
      const refund=cardRefund(card);
      const refundEl=refund>0?`<div class="card-sell">売却+${refund}金</div>`:'';
      let heStats='';
      if(card.kind==='summon'&&card.summon){const es=effectiveStats(card);if(es){const eff=es.atk+'/'+es.hp;const cs=es.count>1?' x'+es.count:'';heStats=`<div style="font-size:.58rem;color:var(--text2);margin-top:1px">${eff}${cs}</div>`;}}
      div.innerHTML=`<div class="card-tp ${t}">${typeLabel[t]||'指輪'}${kl}</div><div class="card-grade">${gs}</div><div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${enc}${heStats}${refundEl}<button class="discard-btn" title="売却">売却</button>`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); discardHeCard(arrName,i); };
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:arrName,idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); });
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty'+(isSpells?' spell':'');
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{ e.preventDefault(); ph.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(ph);
    }
  }
}

function dropOnCard(destArr, destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  _dragSrc=null;
  if(srcArr!==destArr) return;
  const arr=srcArr==='rings'?G.rings:G.spells;
  const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  renderHandEditor();
}

function discardHeCard(arrName, idx){
  const arr=(arrName==='rings')?G.rings:G.spells;
  const card=arr[idx]; if(!card) return;
  arr[idx]=null;
  const refund=cardRefund(card);
  if(refund>0){
    G.gold+=refund;
    updateHUD();
    const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
    try{ log(card.name+' を売却（+'+refund+'金）','gold'); }catch(e){}
  } else {
    try{ log(card.name+' を破棄','sys'); }catch(e){}
  }
  renderHandEditor();
  try{ renderRewCards(); }catch(e){}
}

// ═══════════════════════════════════════
// ENCHANT MODAL
// ═══════════════════════════════════════
let _encCtx={src:'reward',cost:0};
let _encTargetIdx=-1;

function openEncModal(src='reward',cost=0,presetEnchantType=null){
  _encCtx={src,cost};
  _encTargetIdx=-1;
  const rings=G.rings.map((r,i)=>({card:r,idx:i})).filter(x=>x.card);
  if(!rings.length){ alert('手持ちの指輪がありません'); return; }
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
    div.textContent=et;
    div.onclick=()=>applyEnc(et);
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
  else if(_encCtx.src==='smithy'){ showEvent('鍛冶屋',`${ring.name} に「${et}」を付与した。`,`エンチャント「${et}」付与`); }
}
function closeEncModal(){ document.getElementById('enc-modal').classList.remove('open'); }
