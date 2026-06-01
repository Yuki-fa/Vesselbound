// ═══════════════════════════════════════
// move.js — 移動先選択・ノード遷移
// 依存: constants.js, state.js, events.js, pool.js, battle.js
// ═══════════════════════════════════════

function renderMoveSelect(opts){
  document.getElementById('mv-title').textContent=`行き先を選んでください`;
  document.getElementById('mv-hint').textContent=opts.length===1&&opts[0].nodeType==='battle'?'この道しかない…':'';
  const el=document.getElementById('mv-opts');
  el.innerHTML='';
  opts.forEach(opt=>{
    const nt=NODE_TYPES[opt.nodeType];
    const div=document.createElement('div');
    div.className=`mv-opt ${nt.cls}`;
    div.innerHTML=`<div class="mo-icon">${nt.icon}</div><div class="mo-name">${nt.label}</div><div class="mo-desc">${nt.desc}</div>`;
    div.onclick=()=>chooseMove(opt.nodeType);
    el.appendChild(div);
  });
}

function chooseMove(nt){
  G.prevNodeType=nt;
  G.floor++;
  if(G.floor>20){ showScreen('clear'); return; }
  if(nt==='battle'||nt==='boss'){
    // 強欲秘術：報酬フェイズで残ったソウルを最大3まで持ち越す
    if(G.arcana&&G.arcana.id==='強欲') G.arcanaCarryGold=Math.min(G.gold,3);
    showScreen('battle'); startBattle();
  }
  else if(nt==='smithy'){
    // 洞窟の奥へ：戦力1.2倍の戦闘 + 報酬フェイズで1グレード高いキャラが提示される
    if(G.arcana&&G.arcana.id==='強欲') G.arcanaCarryGold=Math.min(G.gold,3);
    G._extraBattleMult=1.2;
    G._pendingCaveBonus=true;
    G._prevWasSmithy=2;
    showScreen('battle'); startBattle();
  }
  else if(nt==='rest'){
    // 湖の畔へ：戦力1.2倍の戦闘 + 敵が指輪を確定ドロップする
    if(G.arcana&&G.arcana.id==='強欲') G.arcanaCarryGold=Math.min(G.gold,3);
    G._extraBattleMult=1.2;
    G._pendingPondBonus=true;
    G._prevWasRest=2;
    showScreen('battle'); startBattle();
  }
  else if(nt==='shop') doShop();
  // chest は goToReward() 内で処理されるため、ここには到達しない
}

function takeCardToHand(card){
  if(!card) return;
  if(typeof syncSelectedUnitLoadout==='function') syncSelectedUnitLoadout();
  const isRing=card.kind==='summon'||card.kind==='passive'||!card.type;
  const nc=clone(card);
  if(typeof initializeUses==='function') initializeUses(nc);
  if(isRing){
    delete nc._buyPrice;
    for(let i=0;i<G.ringSlots;i++){
      if(!G.rings[i]){
        G.rings[i]=nc;
        if(nc.unique==='great_mother'){
          G.allies.forEach(a=>{ if(a&&a.effect==='dragonet_end') a._dragonetBonus=(a._dragonetBonus||0)+1; });
        }
        return;
      }
    }
  } else {
    if(typeof placeInventoryCard==='function'){
      placeInventoryCard(G.spells,nc);
    } else {
      const hi=G.spells.indexOf(null);
      if(hi>=0) G.spells[hi]=nc;
    }
  }
}
