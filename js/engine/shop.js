// ═══════════════════════════════════════
// shop.js — ショップ・グレードアップ・ショップ手札エディタ
// 依存: constants.js, state.js, pool.js, render.js, reward.js
// ═══════════════════════════════════════

let _shopRings=[];

function doShop(){
  const pool=getRingPool();
  _rewCards=[];
  for(let i=0;i<Math.min(5,pool.length);i++){
    const idx=Math.floor(Math.random()*pool.length);
    const ring=clone(pool[idx]);
    ring._buyPrice=ring.cost||3;
    _rewCards.push(ring);
    pool.splice(idx,1);
  }
  _rewCards.forEach(r=>{ if(r.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(r.id)) G._seenRarity3.add(r.id); });

  G._isShop=true;
  G.phase='reward';

  document.getElementById('f-ally').innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='none';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  document.getElementById('btn-retreat').style.display='none';
  document.getElementById('ph-badge').innerHTML='<span style="font-size:.75em;opacity:.75">行商</span>';
  document.getElementById('ph-badge').className='ph-badge';
  const bossNotice=document.getElementById('boss-reward-notice');
  if(bossNotice) bossNotice.style.display='none';
  document.getElementById('rw-gold').textContent=G.gold;
  const rb=document.getElementById('rw-reroll'); if(rb) rb.style.display='none';

  renderAll();
  renderRewCards();
  renderGradeUpBtn();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  setHint('行商でアイテムを購入してください。購入後は戦闘へ進んでください。');
  updateHUD();
}

function renderShop(){
  document.getElementById('sh-gold').textContent=G.gold;
  const el=document.getElementById('sh-grid');
  el.innerHTML='';
  _shopRings.forEach((ring,i)=>{
    if(!ring) return;
    el.appendChild(_mkRewDiv(ring, ()=>{
      if(G.gold<ring._buyPrice){ return; }
      if(G.rings.filter(r=>r).length>=G.ringSlots){ alert('指輪枠が満杯です。先に還魂してください。'); return; }
      G.gold-=ring._buyPrice;
      takeCardToHand(ring);
      log(ring.name+'を購入','good');
      _shopRings[i]=null;
      updateHUD(); renderShop(); renderShopHandEditor();
    }));
  });
  requestAnimationFrame(fitCardDescs);
}

function buyItem(){ /* legacy stub — shop now uses ring-only via renderShop */ }

function shopDone(){ renderMoveSelect([{nodeType:'battle',idx:-1}]); showScreen('move'); }

// ショップ専用手札エディタ（報酬画面と同じドラッグ機能）
function renderShopHandEditor(){
  renderHeRowIn('sh-he-rings',  G.rings,  0, G.ringSlots,      'rings',  'shop');
  renderHeRowIn('sh-he-wands',  G.spells, 0, G.handSlots||5,   'spells', 'shop');
}
function renderHeRowIn(elId, arr, startIdx, count, arrName, ctx){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const typeLabel={ring:'契約',wand:'杖',consumable:'アイテム'};
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
      const isRingCard=t==='ring'||card.kind==='summon'||card.kind==='passive';
      const shBtnCls=isRingCard?'return-btn':'discard-btn';
      const shBtnTxt=isRingCard?'還魂':'破棄';
      div.innerHTML=`<button class="${shBtnCls}">${shBtnTxt}</button><div class="card-tp ${t}">${typeLabel[t]||'契約'}${kl}</div>${card.grade?`<div class="card-grade">G${card.grade}</div>`:''}<div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${enc}${shStats}`;
      div.querySelector('.'+shBtnCls).onclick=ev=>{ ev.stopPropagation(); discardHeCard(arrName,i); if(ctx==='shop') renderShopHandEditor(); else renderHandEditor(); };
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
