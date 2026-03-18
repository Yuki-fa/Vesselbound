// ═══════════════════════════════════════
// move.js — 移動先選択・ノード遷移
// 依存: constants.js, state.js, events.js, pool.js, battle.js, shop.js
// ═══════════════════════════════════════

function renderMoveSelect(opts){
  document.getElementById('mv-title').textContent=`行き先を選んでください（ライフ:${G.life}）`;
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
  if(nt==='battle'||nt==='boss'){ showScreen('battle'); startBattle(); }
  else if(nt==='shrine') doShrine();
  else if(nt==='shop') doShop();
  else if(nt==='heal'){ G.life=Math.min(20,G.life+3); updateHUD(); showEvent('回復','温かい光に包まれた。','ライフ+3'); }
  else if(nt==='chest'){
    const c=drawRewards(1)[0];
    const isRing=c&&(c.kind==='summon'||c.kind==='passive'||!c.type);
    const hasSpace=!c||(isRing
      ? G.rings.filter(r=>r).length<G.ringSlots
      : c.type==='wand'
        ? G.spells.slice(0,G.wandSlots).filter(s=>s).length<G.wandSlots
        : G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).filter(s=>s).length<G.consumSlots);
    if(hasSpace) takeCardToHand(c);
    showEvent('宝箱',`埋もれた箱に「${c?.name||'？'}」があった。`,hasSpace&&c?`${c.name} を入手`:'手札が満杯で受け取れなかった');
  }
}

function takeCardToHand(card){
  if(!card) return;
  const isRing=card.kind==='summon'||card.kind==='passive'||!card.type;
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined) nc.usesLeft=nc.baseUses||randUses();
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  if(isRing){
    for(let i=0;i<G.ringSlots;i++){ if(!G.rings[i]){ G.rings[i]=nc; return; } }
  } else if(card.type==='wand'){
    for(let i=0;i<G.wandSlots;i++){ if(!G.spells[i]){ G.spells[i]=nc; return; } }
  } else {
    for(let i=G.wandSlots;i<G.wandSlots+G.consumSlots;i++){ if(!G.spells[i]){ G.spells[i]=nc; return; } }
  }
}
