// ═══════════════════════════════════════
// shop.js — ショップ・グレードアップ・ショップ手札エディタ
// 依存: constants.js, state.js, pool.js, render.js, reward.js
// ═══════════════════════════════════════

let _shopRings=[];

const SHOP_ALLOWED_WEAPON_NAMES=[
  'ハチェット','ロングソード','スピア','フランキスカ','バスタードソード','ハルバード',
  'バトルアクス','クレイモア','パルチザン','フューリーアクス','アヴェンジャー',
  'ルーンスピア','ミョルニール','フォルセティ','ストームブリンガー','ミストルティン',
  'グングニル','トライデント'
];
const SHOP_ALLOWED_CONSUMABLE_NAMES=[
  '活力の水','神速の水','生命の水','エリクサー','力の水','怪力の薬',
  '英雄の薬','魔女の秘薬','霧化の薬','火炎瓶','硫酸瓶'
];
const SHOP_ALLOWED_RING_NAMES=[
  '屍術師の指輪','加護の指輪','苦行の指輪','治癒の指輪','黄金の指輪',
  '強靭の指輪','狂戦士の指輪','反撃の指輪','激怒の指輪','秘紋の指輪',
  '不死の指輪','狂気の指輪','鬼神の指輪','嵐の指輪'
];

function doShop(){
  if(typeof setBattleShopBackground==='function') setBattleShopBackground();
  const isWorldMapShop=typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G._fromWorldMapShop;
  document.body.classList.toggle('world-map-shop',!!isWorldMapShop);
  _rewCards=_drawWorldMapShopCards();
  _rewCards.forEach(r=>{ if(r&&r.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(r.id)) G._seenRarity3.add(r.id); });

  G._isShop=true;
  G._isRewardTown=true;
  G._familiarUsed=false; // ファミリア：行商フェイズ開始時にリセット
  G._prevWasShop=true; // 行商直後の戦闘では商店マスを抑制
  G._retreated=false;  // 撤退フラグをクリア（撤退先が行商の場合、次の行き先判定が繰り返し行商を選ぶのを防ぐ）
  G._retreatTargetNodeType=null;
  G.phase='reward';

  const _fafS=document.getElementById('f-ally'); if(_fafS) _fafS.innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eAreaS=document.getElementById('enemy-area');
  if(eAreaS) eAreaS.style.display='none';
  const rMBS=document.getElementById('reward-move-btns');
  if(rMBS) rMBS.style.display='';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display=G._fromWorldMapShop?'none':'';
  document.getElementById('ph-badge').innerHTML='<span style="font-size:.75em;opacity:.75">行商</span>';
  document.getElementById('ph-badge').className='ph-badge';
  const bossNotice=document.getElementById('boss-reward-notice');
  if(bossNotice) bossNotice.style.display='none';
  document.getElementById('rw-gold').textContent=G.gold;
  const rb=document.getElementById('rw-reroll');
  if(rb){
    rb.style.display='none';
    rb.disabled=true;
    rb.style.opacity='0.4';
  }
  if(typeof renderCardAppearanceModeDebugButton==='function') renderCardAppearanceModeDebugButton();
  if(typeof renderRaceBuffSummary==='function') renderRaceBuffSummary();

  renderAll();
  _updateLaneOffset(); // スロット描画後に同期計測してオフセットを確定
  renderRewCards();
  renderGradeUpBtn();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  setHint(isWorldMapShop?'行商で買い物できます。店を出るとマップに戻ります。':'行商でアイテムを購入してください。購入後は戦闘へ進んでください。');
  updateHUD();
}

function _worldMapShopWeightsForShop(){
  const w=Array.isArray(G._shopGradeWeights)?G._shopGradeWeights:[90,7,2.5,0.5];
  return [w[0]??90,w[1]??7,w[2]??2.5,w[3]??0.5];
}

function _rollWorldMapShopGrade(){
  const weights=_worldMapShopWeightsForShop();
  const total=weights.reduce((s,w)=>s+Math.max(0,w||0),0)||1;
  let roll=Math.random()*total;
  for(let i=0;i<weights.length;i++){
    roll-=Math.max(0,weights[i]||0);
    if(roll<0) return i+1;
  }
  return 1;
}

function _applyWorldMapShopCardBonuses(card){
  if(!card||!card._isChar) return card;
  if(unitMatchesRace(card,'不死')&&G._undeadHpBonus){ card.atk+=G._undeadHpBonus; card.baseAtk=(card.baseAtk||card.atk)+G._undeadHpBonus; card._bonusApplied=true; }
  if(unitMatchesRace(card,'不死')&&G._specterBonus){ card.atk+=G._specterBonus; card.baseAtk=(card.baseAtk||card.atk)+G._specterBonus; card.hp+=G._specterBonus; card.maxHp+=G._specterBonus; card._bonusApplied=true; }
  if(G._futureCharAtkBonus){ const prevAtk=card.atk||0; card.atk=prevAtk+G._futureCharAtkBonus; card.baseAtk=(card.baseAtk!=null?card.baseAtk:prevAtk)+G._futureCharAtkBonus; }
  if(G._jackBonus){ const baseMax=card.maxHp||card.hp; card.hp+=G._jackBonus; card.maxHp=baseMax+G._jackBonus; }
  if(typeof applyRaceBuffsToRewardCard==='function') applyRaceBuffsToRewardCard(card);
  return card;
}

function _drawWorldMapShopCard(source, makeCard, usedIds){
  const all=source.filter(Boolean);
  if(!all.length) return null;
  let pool=[];
  let grade=1;
  for(let i=0;i<8;i++){
    grade=_rollWorldMapShopGrade();
    pool=all.filter(c=>(c.grade||1)===grade&&!usedIds.has(c.id));
    if(pool.length) break;
  }
  if(!pool.length) pool=all.filter(c=>!usedIds.has(c.id));
  if(!pool.length) pool=all;
  const src=randFrom(pool);
  if(!src) return null;
  usedIds.add(src.id);
  return makeCard(src);
}

function _isAllowedWorldMapShopCard(card){
  if(!card||!card.id||card.starterOnly||card.rarity===-1||card.rarity===4) return false;
  if((card.grade||1)>4) return false;
  if(card.type==='weapon') return SHOP_ALLOWED_WEAPON_NAMES.includes(card.name);
  if(card.type==='consumable') return SHOP_ALLOWED_CONSUMABLE_NAMES.includes(card.name);
  if(card.type==='wand') return true;
  if(card.type==='ring'||card.kind==='passive'||card.kind==='summon') return SHOP_ALLOWED_RING_NAMES.includes(card.name);
  return false;
}

function _prepareWorldMapShopCard(def){
  const c=clone(def);
  c._buyPrice=calcBuyPrice(c);
  if((c.type==='wand'||c.type==='weapon')&&c.usesLeft===undefined){
    const uses=c.baseUses||(c.baseUsesRange?randi(c.baseUsesRange[0],c.baseUsesRange[1]):randUses());
    c.usesLeft=uses;
    c._maxUses=uses;
  }
  return c;
}

function _generateWorldMapShopStock(){
  const used=new Set();
  const source=[
    ...SPELL_POOL.filter(_isAllowedWorldMapShopCard),
    ...RING_POOL.filter(_isAllowedWorldMapShopCard)
  ];
  const stock=[];
  while(stock.length<6&&source.length){
    const pool=source.filter(c=>!used.has(c.id));
    if(!pool.length) break;
    const def=randFrom(pool);
    used.add(def.id);
    stock.push(_prepareWorldMapShopCard(def));
  }
  return stock;
}

function _currentWorldMapShopNode(){
  if(typeof WORLD_MAP_ENABLED==='undefined'||!WORLD_MAP_ENABLED||!G.worldMap||!G.mapPosition) return null;
  return G.worldMap.nodes&&G.worldMap.nodes[G.mapPosition]||null;
}

function _drawWorldMapShopCards(){
  const node=_currentWorldMapShopNode();
  if(node){
    if(!Array.isArray(node.shopStock)) node.shopStock=_generateWorldMapShopStock();
    return node.shopStock;
  }
  if(!Array.isArray(G._fallbackShopStock)) G._fallbackShopStock=_generateWorldMapShopStock();
  return G._fallbackShopStock;
}

function _drawWorldMapShopCards_legacy(){
  const used=new Set();
  const charSource=UNIT_POOL.filter(u=>{
    if(!u.id||u.id==='c_golem'||u.starterOnly) return false;
    if(u.enemyOnly||u.unique||u.rarity===-1) return false;
    if((u.grade||1)>4) return false;
    if(u.rarity===3&&G._seenRarity3&&G._seenRarity3.has(u.id)) return false;
    return true;
  });
  const spellSource=SPELL_POOL.filter(s=>{
    if(!s.id||s.starterOnly||s.rarity===-1||s.rarity===4) return false;
    if((s.grade||1)>4) return false;
    if(s.unique&&G.seenWands&&G.seenWands.includes(s.id)) return false;
    if(s.rarity===3&&G._seenRarity3&&G._seenRarity3.has(s.id)) return false;
    return true;
  });
  const ringSource=RING_POOL.filter(r=>{
    if(!r.id||r.rarity===-1||r.legend) return false;
    if((r.grade||1)>4) return false;
    if(G.bannedRings&&G.bannedRings.includes(r.id)) return false;
    if(r.rarity===3&&G._seenRarity3&&G._seenRarity3.has(r.id)) return false;
    return true;
  });
  const chars=[];
  for(let i=0;i<3;i++){
    const card=_drawWorldMapShopCard(charSource,def=>{
      const c=clone(def);
      c._isChar=true;
      c._buyPrice=calcBuyPrice(c);
      return _applyWorldMapShopCardBonuses(c);
    },used);
    if(card) chars.push(card);
  }
  const items=[];
  ['wand','consumable'].forEach(type=>{
    const card=_drawWorldMapShopCard(spellSource.filter(s=>s.type===type),def=>{
      const c=clone(def);
      c._buyPrice=calcBuyPrice(c);
      if(c.type==='wand'){
        const uses=c.baseUses||(c.baseUsesRange?randi(c.baseUsesRange[0],c.baseUsesRange[1]):randUses());
        c.usesLeft=uses;
        c._maxUses=uses;
      }
      return c;
    },used);
    if(card) items.push(card);
  });
  const ring=_drawWorldMapShopCard(ringSource,def=>{
    const c=clone(def);
    c._buyPrice=calcBuyPrice(c);
    return c;
  },used);
  if(ring) items.push(ring);
  const slots=[null,null,null,null,null,null];
  chars.slice(0,3).forEach((card,i)=>{ slots[i]=card; });
  return [...slots,...items];
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
      if(typeof playSfx==='function') playSfx('purchase',{group:'reward'});
      _shopRings[i]=null;
      updateHUD(); renderShop(); renderShopHandEditor();
    }));
  });
  requestAnimationFrame(fitCardDescs);
}

function buyItem(){ /* legacy stub — shop now uses ring-only via renderShop */ }

function shopDone(){
  G._isShop=false;
  document.body.classList.remove('world-map-shop');
  if(typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G._fromWorldMapShop&&typeof showWorldMap==='function'){
    G._fromWorldMapShop=false;
    showScreen('battle');
    showWorldMap();
    return;
  }
  renderMoveSelect([{nodeType:'battle',idx:-1}]);
  showScreen('move');
}

// ショップ専用手札エディタ（報酬画面と同じドラッグ機能）
function renderShopHandEditor(){
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():null;
  const humanEquip=typeof isHumanEquipmentMode==='function'&&isHumanEquipmentMode(owner);
  const ringEl=document.getElementById('sh-he-rings');
  if(ringEl) ringEl.style.display=humanEquip?'none':'';
  renderHeRowIn('sh-he-rings',  humanEquip?[]:G.rings,  0, humanEquip?0:G.ringSlots,      'rings',  'shop');
  renderHeRowIn('sh-he-wands',  G.spells, 0, G.handSlots||5,   'spells', 'shop');
}
function renderHeRowIn(elId, arr, startIdx, count, arrName, ctx){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():null;
  const humanEquip=arrName==='spells'&&typeof isHumanEquipmentMode==='function'&&isHumanEquipmentMode(owner);
  const slotDefs=humanEquip&&typeof getHumanEquipSlotDefs==='function'?getHumanEquipSlotDefs():null;
  const typeLabel={ring:'契約',wand:'杖',consumable:'アイテム'};
  const isSpells=(arrName==='spells'||arrName==='wands'||arrName==='consums');
  for(let i=startIdx;i<startIdx+count;i++){
    const card=arr[i];
    if(card){
      const div=document.createElement('div');
      const isRingCard=card.type==='ring'||!card.type||card.kind==='summon'||card.kind==='passive';
      const t=isRingCard?'ring':(card.type||'wand');
      div.className=`card ${t}`;
      if(typeof applyCardVisual==='function') applyCardVisual(div,card);
      else if(typeof getCardAsset==='function'&&typeof assetUrl==='function') div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
      div.draggable=true;
      div.dataset.arr=arrName; div.dataset.idx=i; div.dataset.ctx=ctx;
      const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
      const kl=card.kind==='passive'?' <span style="font-size:.5rem;color:var(--teal2)">P</span>':'';
      let shStats='';
      if(card.kind==='summon'&&card.summon){const es=effectiveStats(card);if(es){const base=card.summon.atk+'/'+card.summon.hp;const eff=es.atk+'/'+es.hp;const cs=es.count>1?' x'+es.count:'';shStats=eff!==base||es.count>1?`<div class="card-buf">${eff}${cs}<span style="color:var(--text2);font-size:.52rem"> (基:${base})</span></div>`:`<div style="font-size:.58rem;color:var(--text2);margin-top:1px">${eff}${cs}</div>`;}}
      const shBtnCls=isRingCard?'return-btn':'discard-btn';
      const shBtnTxt=isRingCard?'還魂':'破棄';
      const slotLabel=slotDefs&&slotDefs[i]?`<div style="position:absolute;top:2px;left:3px;right:3px;text-align:center;font-size:0.55rem;line-height:1;color:rgba(236,214,156,.9);font-weight:700;text-shadow:0 1px 2px #000;z-index:8;pointer-events:none;">${slotDefs[i].label}</div>`:'';
      if(slotLabel) div.style.position='relative';
      div.innerHTML=`${slotLabel}<button class="${shBtnCls}">${shBtnTxt}</button><div class="card-art"></div><div class="card-tp ${t}">${typeLabel[t]||'契約'}${kl}</div>${card.grade?`<div class="card-grade">${typeof gradeIconHtml==='function'?gradeIconHtml(card.grade):`G${card.grade}`}</div>`:''}<div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${enc}${shStats}`;
      div.querySelector('.'+shBtnCls).onclick=ev=>{ ev.stopPropagation(); discardHeCard(arrName,i); if(ctx==='shop') renderShopHandEditor(); else renderHandEditor(); };
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:arrName,idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; if(typeof _transparentDragImg!=='undefined') e.dataTransfer.setDragImage(_transparentDragImg,0,0); });
      div.addEventListener('dragend',()=>div.classList.remove('dragging'));
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCardCtx(arrName,i,ctx); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty'+(isSpells?' spell':'');
      if(slotDefs&&slotDefs[i]){
        ph.style.display='grid';
        ph.style.placeItems='center';
        ph.style.color='rgba(236,214,156,.78)';
        ph.style.fontWeight='700';
        ph.style.fontSize='0.72rem';
        ph.textContent=slotDefs[i].label;
      }
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
  const owner=typeof getSelectedAlly==='function'?getSelectedAlly():null;
  const humanEquip=srcArr==='spells'&&typeof isHumanEquipmentMode==='function'&&isHumanEquipmentMode(owner);
  if(humanEquip){
    const srcCard=arr[srcIdx];
    const destCard=arr[destIdx];
    if(srcCard&&typeof canEquipToHumanSlot==='function'&&!canEquipToHumanSlot(owner,destIdx,srcCard,srcIdx)) return;
    if(destCard&&typeof canEquipToHumanSlot==='function'&&!canEquipToHumanSlot(owner,srcIdx,destCard,destIdx)) return;
  }
  const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  if(ctx==='shop'){ renderShopHandEditor(); }
  else { renderHandEditor(); }
}
