// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・手札エディタ・エンチャントモーダル
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _takenCardIds=new Set(); // 購入済みカードID（1フェイズ内）

// カードの購入コスト（報酬フェイズ用）
function cardCost(card){
  if(!card) return 0;
  if(card.isEnchant) return 3;
  if(card.type==='consumable') return 1;
  if(card.type==='wand') return 2;
  return 3; // ring
}
// 売却時の払い戻し（杖・指輪のみ1金）
function cardRefund(card){
  if(!card) return 0;
  if(card.type==='ring'||card.kind==='summon'||card.kind==='passive') return 1;
  if(card.type==='wand') return 1;
  return 0;
}

function goToReward(){
  _rewCards=drawRewards(6);
  _takenCardIds=new Set(); // リセット
  showScreen('reward');
  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-earned').textContent='+'+G.earnedGold;
  document.getElementById('rw-rlv').textContent=G.rewardLv;

  // ボス戦後スロット拡張報酬
  const bossNotice=document.getElementById('boss-reward-notice');
  if(_isBossFight){
    const msg=giveBossSlotReward();
    if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent=msg; }
  } else {
    if(bossNotice) bossNotice.style.display='none';
  }

  renderRankUp();
  renderRewCards();
  renderHandEditor();
}

// ボス戦後ランダムスロット拡張（無償）
function giveBossSlotReward(){
  const opts=[];
  if(G.ringSlots<7) opts.push('ring');
  if(G.wandSlots<7&&G.wandSlots+G.consumSlots<7) opts.push('wand');
  if(G.consumSlots<7&&G.wandSlots+G.consumSlots<7) opts.push('consumable');
  if(!opts.length) return '🎁 ボスクリア報酬：全スロットが上限に達しています';
  const chosen=randFrom(opts);
  if(chosen==='ring'){
    G.ringSlots++;
    return `🎁 ボスクリア報酬：指輪スロット+1（現在${G.ringSlots}枠）`;
  } else if(chosen==='wand'){
    G.spells.splice(G.wandSlots,0,null);
    G.wandSlots++;
    return `🎁 ボスクリア報酬：杖スロット+1（現在${G.wandSlots}枠）`;
  } else {
    G.consumSlots++;
    return `🎁 ボスクリア報酬：消耗品スロット+1（現在${G.consumSlots}枠）`;
  }
}

function renderRewCards(){
  const el=document.getElementById('rw-cards');
  el.innerHTML='';
  const typeLabel={ring:'指輪（指）',wand:'杖（魔）',consumable:'消耗品（魔）',enchant:'エンチャント'};
  _rewCards.forEach((card,i)=>{
    if(!card) return;
    const div=document.createElement('div');
    const cost=cardCost(card);
    const alreadyTaken=_takenCardIds.has(card.id);
    const canBuy=G.gold>=cost&&!alreadyTaken;
    div.className='rew-card'+((!canBuy)?' taken':'');
    const t=card.type||'ring';
    const tColor=t==='ring'?'purple2':t==='wand'?'blue2':t==='enchant'?'teal2':'red2';
    const enc=card.enchants&&card.enchants.length?`<div style="font-size:.56rem;color:var(--teal2);margin-top:2px">${card.enchants.join('・')}</div>`:'';
    const kl=card.kind==='passive'?' <span style="font-size:.5rem;color:var(--teal2)">P</span>':'';
    const rdesc=computeDesc(card);
    div.innerHTML=`<div style="font-size:.6rem;color:var(--gold);font-weight:700;margin-bottom:2px">${cost}金</div><div class="rew-card-tp" style="color:var(--${tColor})">${typeLabel[t]||'指輪'}${kl}</div><div class="rew-card-name">${card.name}${card.grade?' G'+card.grade:''}</div><div class="rew-card-desc">${rdesc}</div>${enc}`;
    if(canBuy) div.onclick=()=>takeRewCard(i);
    el.appendChild(div);
  });
}

function takeRewCard(i){
  const card=_rewCards[i]; if(!card) return;
  const cost=cardCost(card);
  if(G.gold<cost){ alert(`金が足りません（必要:${cost}金、所持:${G.gold}金）`); return; }

  // エンチャントカードの場合はモーダルで指輪選択
  if(card.isEnchant){
    _rewCards[i]=null;
    G.gold-=cost;
    document.getElementById('rw-gold').textContent=G.gold;
    openEncModal('reward',0,card.enchantType);
    renderRewCards();
    return;
  }

  const isRing=card.kind==='summon'||card.kind==='passive'||card.type==='ring'||(!card.type);
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined) nc.usesLeft=nc.baseUses||randUses();
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;

  if(isRing){
    if(G.rings.filter(r=>r).length>=G.ringSlots){
      alert(`指輪枠（${G.ringSlots}）が満杯です。下の手札から破棄してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=0;j<G.ringSlots;j++){ if(!G.rings[j]){ G.rings[j]=nc; placed=true; break; } }
    if(!placed) G.rings.push(nc);
  } else if(card.type==='wand'){
    if(G.spells.slice(0,G.wandSlots).filter(s=>s).length>=G.wandSlots){
      alert(`杖枠（${G.wandSlots}）が満杯です。下の手札から破棄してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=0;j<G.wandSlots;j++){ if(!G.spells[j]){ G.spells[j]=nc; placed=true; break; } }
    if(!placed) G.spells.splice(G.wandSlots,0,nc);
  } else { // consumable
    if(G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length>=G.consumSlots){
      alert(`消耗品枠（${G.consumSlots}）が満杯です。下の手札から破棄してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=G.wandSlots;j<G.wandSlots+G.consumSlots;j++){ if(!G.spells[j]){ G.spells[j]=nc; placed=true; break; } }
    if(!placed) G.spells.push(nc);
  }

  _takenCardIds.add(card.id);
  document.getElementById('rw-gold').textContent=G.gold;
  log(card.name+' を'+cost+'金で取得','good');
  updateHUD();
  renderRewCards();
  renderHandEditor();
}

function renderRankUp(){
  const el=document.getElementById('rw-rankups');
  el.innerHTML='';
  document.getElementById('rw-rlv').textContent=G.rewardLv;
  if(G.rewardLv>=5){ el.innerHTML='<span style="color:var(--teal2);font-size:.7rem">最大ランクです</span>'; return; }
  const cost=RANK_UP_COSTS[G.rewardLv];
  const needed=cost-G.rewardLvInvested;
  const can=G.gold>=needed&&needed>0;
  const div=document.createElement('div');
  div.className='ru-opt'+(can?'':' dis');
  div.textContent=`Lv${G.rewardLv}→Lv${G.rewardLv+1}　必要:${needed}金（累計${cost}金）`;
  div.onclick=()=>{
    if(!can) return;
    G.gold-=needed; G.rewardLvInvested=cost; G.rewardLv++;
    document.getElementById('rw-gold').textContent=G.gold;
    log(`報酬ランク→Lv${G.rewardLv}`,'sys');
    _rewCards=drawRewards(6);
    G.rewardTaken=false;
    renderRankUp();
    renderRewCards();
  };
  el.appendChild(div);
}

// ═══════════════════════════════════════
// HAND EDITOR (reward phase, with drag)
// ═══════════════════════════════════════
let _dragSrc=null; // {arr:'rings'|'spells', idx}

function renderHandEditor(){
  renderHeRow('he-rings', G.rings, 0, G.ringSlots, 'rings');
  renderHeRow('he-wands', G.spells, 0, G.wandSlots, 'wands');
  renderHeRow('he-consums', G.spells, G.wandSlots, G.consumSlots, 'consums');
}

// startIdx から count 枠分 arr を描画。arrName は 'rings'|'wands'|'consums'
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
      div.dataset.arr=arrName;
      div.dataset.idx=i;
      const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
      const kl=card.kind==='passive'?' <span style="font-size:.5rem;color:var(--teal2)">P</span>':'';
      let heStats='';
      if(card.kind==='summon'&&card.summon){const es=effectiveStats(card);if(es){const base=card.summon.atk+'/'+card.summon.hp;const eff=es.atk+'/'+es.hp;const cs=es.count>1?' x'+es.count:'';heStats=eff!==base||es.count>1?`<div class="card-buf">${eff}${cs}<span style="color:var(--text2);font-size:.52rem"> (基:${base})</span></div>`:`<div style="font-size:.58rem;color:var(--text2);margin-top:1px">${eff}${cs}</div>`;}}
      div.innerHTML=`<button class="discard-btn" title="破棄">×</button><div class="card-tp ${t}">${typeLabel[t]||'指輪'}${kl}</div>${card.grade?`<div class="card-grade">G${card.grade}</div>`:''}<div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${enc}${heStats}`;
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
      ph.dataset.arr=arrName;
      ph.dataset.idx=i;
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
  if(srcArr!==destArr) return; // 異なるペイン間のドラッグは不可
  const arr=srcArr==='rings'?G.rings:G.spells; // wands/consums は両方 G.spells
  const tmp=arr[srcIdx];
  arr[srcIdx]=arr[destIdx];
  arr[destIdx]=tmp;
  renderHandEditor();
}

function discardHeCard(arrName, idx){
  const arr=(arrName==='rings')?G.rings:G.spells; // wands/consums は G.spells
  const card=arr[idx];
  if(!card) return;
  arr[idx]=null;
  const refund=cardRefund(card);
  if(refund>0){
    G.gold+=refund;
    updateHUD();
    const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
    const shg=document.getElementById('sh-gold'); if(shg) shg.textContent=G.gold;
    try{ log(card.name+' を破棄（+'+refund+'金）','gold'); }catch(e){}
    // ランクアップボタンを再評価
    try{ renderRankUp(); }catch(e){}
  } else {
    try{ log(card.name+' を破棄した','sys'); }catch(e){}
  }
  renderHandEditor();
  renderShopHandEditor();
  try{ renderShop(); }catch(e){}
  try{ renderRewCards(); }catch(e){}
}

function rewardDone(){
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
    div.textContent=`${card.name} G${card.grade||1}${card.enchants?.length?' ['+card.enchants.join('・')+']':''}`;
    div.onclick=()=>{
      _encTargetIdx=idx;
      if(presetEnchantType){ applyEnc(presetEnchantType); }
      else showEncStep2();
    };
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
  if(_encCtx.shopIdx>=0){ _shopItems[_encCtx.shopIdx]=null; _encCtx.shopIdx=-1; }
  if(_encCtx.src==='reward'){ renderHandEditor(); renderRewCards(); }
  if(_encCtx.src==='shop'){ updateHUD(); renderShop(); renderShopHandEditor(); }
}
function closeEncModal(){ document.getElementById('enc-modal').classList.remove('open'); }
