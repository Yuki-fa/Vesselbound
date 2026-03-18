// ═══════════════════════════════════════
// shop.js — ショップ・グレードアップ・ショップ手札エディタ
// 依存: constants.js, state.js, pool.js, render.js, reward.js
// ═══════════════════════════════════════

let _shopItems=[];

function doShop(){
  const pool=getPool(G.rewardLv);
  _shopItems=[];
  for(let i=0;i<3;i++){ if(!pool.length) break; const idx=Math.floor(Math.random()*pool.length); _shopItems.push({type:'card',card:clone(pool[idx]),price:randFrom([3,4,5,6])}); pool.splice(idx,1); }
  _shopItems.push({type:'grade_up_ring',label:'指輪グレードアップ',desc:'指輪を1段階強化（G4まで）',price:4});
  _shopItems.push({type:'grade_up_spell',label:'杖グレードアップ',desc:'杖の攻撃・回復効果を1段階強化',price:3});
  _shopItems.push({type:'enchant', label:'エンチャント付与',  desc:'対象の指輪にエンチャントを1つ付与',price:3});
  _shopItems.push({type:'life',    label:'回復薬',           desc:'ライフ+3',price:5});
  _shopItems.push({type:'ring_slot',     label:'指輪スロット+1',  desc:`指輪枠を追加（現在${G.ringSlots}枠、上限7）`,price:5});
  _shopItems.push({type:'wand_slot',     label:'杖スロット+1',    desc:`杖枠を追加（現在${G.wandSlots}枠、杖+消耗品合計上限7）`,price:5});
  _shopItems.push({type:'consumable_slot',label:'消耗品スロット+1',desc:`消耗品枠を追加（現在${G.consumSlots}枠、杖+消耗品合計上限7）`,price:5});
  _takenCardIds=new Set();
  renderShop();
  renderShopHandEditor();
  showScreen('shop');
}

function renderShop(){
  document.getElementById('sh-gold').textContent=G.gold;
  const el=document.getElementById('sh-grid');
  el.innerHTML='';
  const typeLabel={ring:'指輪',wand:'杖',consumable:'消耗品'};
  _shopItems.forEach((item,i)=>{
    if(!item) return;
    const can=G.gold>=item.price;
    const div=document.createElement('div');
    div.className='sh-item'+(can?'':' cant');
    if(item.type==='card'){
      const t=item.card.type||'ring';
      div.innerHTML=`<div class="si-price">${item.price}金</div><div class="si-name">${item.card.name}${item.card.grade?' G'+item.card.grade:''}</div><div class="si-desc">${typeLabel[t]} ${item.card.desc}</div>`;
    } else { div.innerHTML=`<div class="si-price">${item.price}金</div><div class="si-name">${item.label}</div><div class="si-desc">${item.desc}</div>`; }
    if(can) div.onclick=()=>buyItem(i);
    el.appendChild(div);
  });
}

function buyItem(i){
  const item=_shopItems[i]; if(!item||G.gold<item.price) return;
  const itemId=item.type==='card'?item.card.id:(item.type+'_service');
  if(_takenCardIds.has(itemId)){ alert('このアイテムはすでに購入済みです'); return; }
  if(item.type==='card'){
    const isRing=item.card.kind==='summon'||item.card.kind==='passive'||!item.card.type;
    if(isRing){
      if(G.rings.filter(r=>r).length>=G.ringSlots){ alert('指輪枠が満杯です。先に破棄してください。'); return; }
    } else if(item.card.type==='wand'){
      if(G.spells.slice(0,G.wandSlots).filter(s=>s).length>=G.wandSlots){ alert('杖枠が満杯です。先に破棄してください。'); return; }
    } else {
      if(G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length>=G.consumSlots){ alert('消耗品枠が満杯です。先に破棄してください。'); return; }
    }
    G.gold-=item.price; takeCardToHand(item.card); log(item.card.name+'を購入','good');
    _takenCardIds.add(item.card.id);
  } else if(item.type==='grade_up_ring'){
    openGradeUpModal('ring', item.price, i); return;
  } else if(item.type==='grade_up_spell'){
    openGradeUpModal('spell', item.price, i); return;
  } else if(item.type==='enchant'){
    _encCtx={src:'shop',cost:item.price,shopIdx:i};
    openEncModal('shop',0); return;
  } else if(item.type==='life'){
    G.gold-=item.price; G.life=Math.min(20,G.life+3); log('ライフ+3','good');
  } else if(item.type==='ring_slot'){
    if(G.ringSlots>=7){ alert('指輪スロットは上限（7枠）です'); return; }
    G.gold-=item.price; G.ringSlots++; log(`指輪スロット+1（${G.ringSlots}枠）`,'good');
  } else if(item.type==='wand_slot'){
    if(G.wandSlots>=7||G.wandSlots+G.consumSlots>=7){ alert('杖スロットは上限です（杖+消耗品合計7枠）'); return; }
    G.gold-=item.price; G.spells.splice(G.wandSlots,0,null); G.wandSlots++; log(`杖スロット+1（${G.wandSlots}枠）`,'good');
  } else if(item.type==='consumable_slot'){
    if(G.consumSlots>=7||G.wandSlots+G.consumSlots>=7){ alert('消耗品スロットは上限です（杖+消耗品合計7枠）'); return; }
    G.gold-=item.price; G.consumSlots++; log(`消耗品スロット+1（${G.consumSlots}枠）`,'good');
  }
  _shopItems[i]=null;
  updateHUD(); renderShop(); renderShopHandEditor();
}

function shopDone(){ renderMoveSelect([{nodeType:'battle',idx:-1}]); showScreen('move'); }

// グレードアップ対象選択モーダル（指輪 or 杖）
let _gradeUpCtx={target:'ring', price:0, shopIdx:-1};
function openGradeUpModal(target, price, shopIdx){
  _gradeUpCtx={target,price,shopIdx};
  const arr=target==='ring'?G.rings:G.spells;
  const eligible=arr.map((c,i)=>({c,i})).filter(({c})=>c&&(c.grade||1)<4);
  if(!eligible.length){ alert('強化できる'+(target==='ring'?'指輪':'杖')+'がありません'); return; }
  const enc=document.getElementById('enc-modal');
  const s1=document.getElementById('enc-s1');
  const s2=document.getElementById('enc-s2');
  s2.style.display='none';
  s1.style.display='';
  document.querySelector('.enc-box h3').textContent='グレードアップ対象を選択';
  const el=document.getElementById('enc-rings');
  el.innerHTML='';
  eligible.forEach(({c,i})=>{
    const div=document.createElement('div');
    div.className='enc-item';
    div.textContent=`${c.name} G${c.grade||1} → G${(c.grade||1)+1}`;
    div.onclick=()=>{
      if(G.gold<_gradeUpCtx.price){
        alert(`金が足りません（必要:${_gradeUpCtx.price}金、所持:${G.gold}金）`);
        closeEncModal();
        document.querySelector('.enc-box h3').textContent='エンチャント付与';
        return;
      }
      c.grade=(c.grade||1)+1;
      G.gold-=_gradeUpCtx.price;
      _shopItems[_gradeUpCtx.shopIdx]=null;
      log(`${c.name} → G${c.grade} にグレードアップ`,'good');
      closeEncModal();
      document.querySelector('.enc-box h3').textContent='エンチャント付与';
      updateHUD(); renderShop(); renderShopHandEditor();
    };
    el.appendChild(div);
  });
  enc.classList.add('open');
}

// ショップ専用手札エディタ（報酬画面と同じドラッグ機能）
function renderShopHandEditor(){
  renderHeRowIn('sh-he-rings',  G.rings,  0,          G.ringSlots,  'rings',  'shop');
  renderHeRowIn('sh-he-wands',  G.spells, 0,          G.wandSlots,  'wands',  'shop');
  renderHeRowIn('sh-he-consums',G.spells, G.wandSlots, G.consumSlots,'consums','shop');
}
function renderHeRowIn(elId, arr, startIdx, count, arrName, ctx){
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
      div.dataset.arr=arrName; div.dataset.idx=i; div.dataset.ctx=ctx;
      const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
      const kl=card.kind==='passive'?' <span style="font-size:.5rem;color:var(--teal2)">P</span>':'';
      let shStats='';
      if(card.kind==='summon'&&card.summon){const es=effectiveStats(card);if(es){const base=card.summon.atk+'/'+card.summon.hp;const eff=es.atk+'/'+es.hp;const cs=es.count>1?' x'+es.count:'';shStats=eff!==base||es.count>1?`<div class="card-buf">${eff}${cs}<span style="color:var(--text2);font-size:.52rem"> (基:${base})</span></div>`:`<div style="font-size:.58rem;color:var(--text2);margin-top:1px">${eff}${cs}</div>`;}}
      div.innerHTML=`<button class="discard-btn">×</button><div class="card-tp ${t}">${typeLabel[t]||'指輪'}${kl}</div>${card.grade?`<div class="card-grade">G${card.grade}</div>`:''}<div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${enc}${shStats}`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); discardHeCard(arrName,i); if(ctx==='shop') renderShopHandEditor(); else renderHandEditor(); };
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:arrName,idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      div.addEventListener('dragend',()=>div.classList.remove('dragging'));
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCardCtx(arrName,i,ctx); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty'+(isSpells?' spell':'');
      ph.dataset.arr=arrName; ph.dataset.idx=i;
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{ e.preventDefault(); ph.classList.remove('drag-over'); dropOnCardCtx(arrName,i,ctx); });
      el.appendChild(ph);
    }
  }
}
function dropOnCardCtx(destArr,destIdx,ctx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  _dragSrc=null;
  if(srcArr!==destArr) return;
  const arr=srcArr==='rings'?G.rings:G.spells; // wands/consums は G.spells
  const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  if(ctx==='shop'){ renderShopHandEditor(); }
  else { renderHandEditor(); }
}
