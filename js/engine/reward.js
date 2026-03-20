// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・手札エディタ・エンチャントモーダル
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _eliteRing=null;  // エリート撃破時の別枠ユニーク指輪（リロールで消える）

// ── 報酬フェイズ開始（戦闘画面のまま表示）─────────────

function goToReward(){
  arcanaPhaseStart();
  _rewCards=drawRewards();
  _eliteRing=null;
  G.phase='reward';

  // 味方フィールドをクリア・隠す
  document.getElementById('f-ally').innerHTML='';
  document.getElementById('ally-section').style.display='none';

  // 敵フィールドラベルを隠す（行き先ノードに使用）
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='none';

  // 報酬セクション表示
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';

  // ソウル表示
  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent=G.rewardCards;

  // 戦闘ボタン非表示
  document.getElementById('btn-pass').style.display='none';
  document.getElementById('btn-retreat').style.display='none';
  document.getElementById('ph-badge').textContent='報酬フェイズ';
  document.getElementById('ph-badge').className='ph-badge';

  // ボス戦後：報酬カード枚数+1、契約スロット+1
  const bossNotice=document.getElementById('boss-reward-notice');
  if(_isBossFight){
    G.ringSlots++;
    let bonusMsg=`🎁 ボスクリア：契約スロット+1（現在${G.ringSlots}枠）`;
    if(G.rewardCards<G.maxRewardCards){
      G.rewardCards++;
      _rewCards=drawRewards();
      bonusMsg+=`　報酬カード+1（現在${G.rewardCards}枚）`;
    } else {
      bonusMsg+=`　報酬カードは最大（${G.rewardCards}枚）`;
    }
    if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent=bonusMsg; }
    document.getElementById('rw-count').textContent=G.rewardCards;
  } else {
    if(bossNotice) bossNotice.style.display='none';
  }

  // エリート撃破ボーナス：ユニーク指輪を別枠で表示（リロールで消える・3ソウルで購入）
  if(G._isEliteFight&&!_isBossFight){
    _eliteRing=drawUniqueRing();
    if(_eliteRing){
      _eliteRing._isLegend=true;
      const en=document.getElementById('boss-reward-notice');
      if(en){ en.style.display=''; en.textContent='⭐ エリート撃破：ユニーク指輪が出現しました（3ソウル・リロールで消えます）'; }
    }
  }

  renderRewCards();
  renderArcanaInfo();
  // 行き先ノードを敵フィールドに表示
  renderMoveSlotsInEnemy();
  // 手札を売却・並べ替え可能モードで再描画
  renderHandEditor();
  updateHUD();
}

// ── 行き先ノードを敵フィールドにスロットとして表示 ──────

function renderMoveSlotsInEnemy(){
  let opts;
  if(G._retryFloor){
    const nodeType=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle';
    opts=[{nodeType,idx:-1}];
  } else {
    opts=G.visibleMoves.filter(i=>G.moveMasks[i]).map(i=>({nodeType:G.moveMasks[i],idx:i}));
    if(opts.length===0) opts.push({nodeType:'battle',idx:-1});
  }
  const el=document.getElementById('f-enemy');
  el.innerHTML='';
  // 6スロット分表示（ノードを先頭に、残りは空）
  for(let i=0;i<6;i++){
    const opt=opts[i];
    const div=document.createElement('div');
    if(opt){
      const nt=NODE_TYPES[opt.nodeType];
      div.className='slot has-move';
      div.style.flexDirection='column';
      div.innerHTML=`<div class="move-icon" style="font-size:1.4rem">${nt.icon}</div><div class="move-lbl" style="font-size:.64rem;font-weight:600">${nt.label}</div><div style="font-size:.54rem;color:var(--text2);margin-top:2px;text-align:center;padding:0 4px">${nt.desc}</div>`;
      div.onclick=()=>chooseMoveInline(opt.nodeType);
    } else {
      div.className='slot empty';
    }
    el.appendChild(div);
  }
}

function chooseMoveInline(nt){
  // 報酬セクション非表示
  document.getElementById('reward-info-bar').style.display='none';
  document.getElementById('reward-cards-section').style.display='none';
  // 敵フィールドラベルを復元
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='';
  // 味方ゾーン復元
  document.getElementById('ally-section').style.display='';
  // 戦闘ボタン復元
  document.getElementById('btn-pass').style.display='';

  // retryFloor 処理
  if(G._retryFloor){
    G._retryFloor=false;
    G.floor--;
  }

  chooseMove(nt);
}

// ── リロール（1ソウルで全カード入れ替え）──────────────

function rerollRewards(){
  if(G.gold<1){ return; }
  G.gold-=1;
  G.rerollCount=(G.rerollCount||0)+1;
  _rewCards=drawRewards();
  _eliteRing=null; // リロールでユニーク指輪は消える

  // 試行の契約：4回リロールごとにランダムな契約を1グレードアップ
  const trialsRing=G.rings.find(r=>r&&r.unique==='trials');
  if(trialsRing&&G.rerollCount%4===0){
    const eligible=G.rings.filter(r=>r&&(r.grade||1)<MAX_GRADE);
    if(eligible.length){
      const picked=randFrom(eligible);
      const newG=Math.min(MAX_GRADE,(picked.grade||1)+1);
      picked.grade=newG;
      if(newG>=MAX_GRADE&&!G.bannedRings.includes(picked.id)) G.bannedRings.push(picked.id);
      log(`🎯 試行の契約：${picked.name} → ${gradeStr(newG)}`,'gold');
    }
  }

  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  const rb=document.getElementById('rw-reroll'); if(rb) rb.disabled=G.gold<1;
  renderRewCards();
}

// ── 報酬カードの描画 ──────────────────────────────

// カード要素を生成するヘルパー（通常・ユニーク共用）
function _mkRewDiv(card, onBuy){
  const typeLabel={ring:'契約',wand:'杖',consumable:'アイテム'};
  const div=document.createElement('div');
  const cost=card._buyPrice||1;
  const canBuy=G.gold>=cost;
  const isLegend=!!card._isLegend;
  div.className='rew-card'+(canBuy?'':' cant')+(isLegend?' legend':'');
  const t=card.type||'ring';
  const tColor=t==='ring'?'purple2':t==='wand'?'blue2':'red2';
  const g=card.grade||1;
  const gs=card.legend?'★':gradeStr(g);
  const rdesc=computeDesc(card);
  const refund=cardRefund(card);
  const refundTxt=refund>0?`<div class="rew-card-refund">還魂+${refund}ソウル</div>`:'';
  const tpLabel=card.kind==='summon'?'契約（召喚）':card.kind==='passive'?'契約（補助）':(typeLabel[t]||'契約');
  const isRingCard=!card.type||card.type==='ring'||card.kind==='summon'||card.kind==='passive';
  let mergeHint='';
  if(isRingCard){
    const owned=G.rings.find(r=>r&&r.id===card.id);
    if(owned){
      const newG=Math.min(MAX_GRADE,(owned.grade||1)+g);
      mergeHint=`<div class="rew-merge">▲ ${gradeStr(owned.grade||1)}→${gradeStr(newG)}</div>`;
    }
  }
  const legendBadge=isLegend?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
  div.innerHTML=`<div class="rew-card-cost">${cost}ソウル</div><div class="rew-card-tp" style="color:var(--${tColor})">${tpLabel}</div><div class="rew-card-name">${card.name} <span class="rew-grade">${gs}</span></div><div class="rew-card-desc">${rdesc}</div>${refundTxt}${mergeHint}${legendBadge}`;
  if(canBuy) div.onclick=onBuy;
  return div;
}

function renderRewCards(){
  const el=document.getElementById('rw-cards');
  el.innerHTML='';
  _rewCards.forEach((card,i)=>{
    if(!card) return;
    el.appendChild(_mkRewDiv(card, ()=>takeRewCard(i)));
  });
  // エリート指輪は別枠で末尾に表示（リロールで消える）
  if(_eliteRing){
    el.appendChild(_mkRewDiv(_eliteRing, ()=>takeEliteRing()));
  }
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
      alert(`契約枠（${G.ringSlots}）が満杯です。下の手札から還魂してください。`); return;
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
  } else {
    if(G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length>=G.consumSlots){
      alert(`アイテム枠（${G.consumSlots}）が満杯です。下の手札から破棄してください。`); return;
    }
    G.gold-=cost;
    let placed=false;
    for(let j=G.wandSlots;j<G.wandSlots+G.consumSlots;j++){ if(!G.spells[j]){ G.spells[j]=nc; placed=true; break; } }
    if(!placed) G.spells.push(nc);
  }

  log(card.name+' を'+cost+'ソウルで取得','good');
  _rewCards[i]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderHandEditor();
}

// ── エリート指輪購入 ──────────────────────────────────
function takeEliteRing(){
  const card=_eliteRing; if(!card) return;
  const cost=card._buyPrice||3;
  if(G.gold<cost) return;
  const nc=clone(card);
  // 同じ指輪を所持→グレード加算
  const ownedIdx=G.rings.findIndex(r=>r&&r.id===nc.id);
  if(ownedIdx>=0){
    const owned=G.rings[ownedIdx];
    const newGrade=Math.min(MAX_GRADE,(owned.grade||1)+(nc.grade||1));
    G.gold-=cost;
    log(`${owned.name} グレード加算 ${gradeStr(owned.grade||1)}→${gradeStr(newGrade)}`,'good');
    owned.grade=newGrade;
    _eliteRing=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards(); renderHandEditor();
    return;
  }
  if(G.rings.filter(r=>r).length>=G.ringSlots){
    alert(`契約枠（${G.ringSlots}）が満杯です。下の手札から還魂してください。`); return;
  }
  G.gold-=cost;
  let placed=false;
  for(let j=0;j<G.ringSlots;j++){ if(!G.rings[j]){ G.rings[j]=nc; placed=true; break; } }
  if(!placed) G.rings.push(nc);
  log(nc.name+' を'+cost+'ソウルで取得（ユニーク）','good');
  _eliteRing=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderHandEditor();
}

// ═══════════════════════════════════════
// HAND EDITOR（ドラッグ並べ替え・売却）
// ═══════════════════════════════════════
let _dragSrc=null;

function renderHandEditor(){
  // 報酬フェイズ中は戦闘用手札スロットに売却・並べ替え機能付きで上書きレンダリング
  renderHeRow('ring-slots', G.rings, 0, G.ringSlots, 'rings');
  renderHeRow('wand-slots', G.spells, 0, G.wandSlots, 'wands');
  renderHeRow('consum-slots', G.spells, G.wandSlots, G.consumSlots, 'consums');
  // カウント表示も更新
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=G.rings.filter(r=>r).length;
  const rmEl=document.getElementById('ring-max'); if(rmEl) rmEl.textContent=G.ringSlots;
  const wc=document.getElementById('wand-count'); if(wc) wc.textContent=G.spells.slice(0,G.wandSlots).filter(s=>s).length;
  const cc=document.getElementById('consum-count'); if(cc) cc.textContent=G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length;
  renderArcanaBar();
}

function renderHeRow(elId, arr, startIdx, count, arrName){
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
      div.className=`card ${t}${card.legend?' legend-card':''}`;
      div.draggable=true;
      const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
      const kl=card.kind==='passive'?' <span style="font-size:.5rem;color:var(--teal2)">P</span>':'';
      const g=card.grade||1;
      const gs=card.legend?'★':gradeStr(g);
      const refund=cardRefund(card);
      const isRing=t==='ring'||card.kind==='summon'||card.kind==='passive';
      const refundEl=refund>0?`<div class="card-sell">還魂+${refund}ソウル</div>`:'';
      const tpLabel=card.kind==='summon'?'契約（召喚）':card.kind==='passive'?'契約（補助）':(typeLabel[t]||'契約');
      const btnCls=isRing?'return-btn':'discard-btn';
      const btnTxt=isRing?'還魂':'破棄';
      let heStats='';
      if(card.kind==='summon'&&card.summon){const es=effectiveStats(card);if(es){const eff=es.atk+'/'+es.hp;const cs=es.count>1?' x'+es.count:'';heStats=`<div style="font-size:.58rem;color:var(--text2);margin-top:1px">${eff}${cs}</div>`;}}
      div.innerHTML=`<div class="card-tp ${t}">${tpLabel}${kl}</div><div class="card-grade">${gs}</div><div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${enc}${heStats}${refundEl}<button class="${btnCls}" title="${btnTxt}">${btnTxt}</button>`;
      div.querySelector('.'+btnCls).onclick=ev=>{ ev.stopPropagation(); discardHeCard(arrName,i); };
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
    try{ log(card.name+' を還魂（+'+refund+'ソウル）','gold'); }catch(e){}
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
  // エンチャントは召喚指輪のみ対象
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
      _smithyChosen.add(_encCtx.smithyKey||'enc0');
      doSmithy(false);
    } else {
      showEvent('祭壇',`${ring.name} に「${et}」を付与した。`,`エンチャント「${et}」付与`);
    }
  }
}
function closeEncModal(){ document.getElementById('enc-modal').classList.remove('open'); }
