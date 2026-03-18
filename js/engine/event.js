// ═══════════════════════════════════════
// event.js — 祠・イベント画面
// 依存: state.js, events.js, pool.js, move.js, reward.js
// ═══════════════════════════════════════

function doShrine(){
  const ev=randFrom(SHRINE_EVENTS);
  let res=ev.res;
  if(ev.eff==='gold_5'){ G.gold+=5; updateHUD(); }
  else if(ev.eff==='gold_10'){ G.gold+=10; updateHUD(); }
  else if(ev.eff==='heal_5'){ G.life=Math.min(20,G.life+5); updateHUD(); }
  else if(ev.eff==='fog'){ G.fogNext=true; }
  else if(ev.eff==='ring_up'){
    const rs=G.rings.filter((r,i)=>r&&(r.grade||1)<4).map((r,i)=>({r,i:G.rings.indexOf(r)}));
    if(rs.length){ const {r}=randFrom(rs); r.grade=(r.grade||1)+1; G.life=Math.max(0,G.life-2); updateHUD(); res=`ライフ-2。${r.name}→G${r.grade}`; }
    else res='強化できる指輪がなかった';
  }
  else if(ev.eff==='random_card'){
    const c=drawRewards(1)[0];
    if(c&&c.isEnchant){
      showEvent(ev.name,ev.desc,c.name+' を入手（指輪を選んで付与）');
      setTimeout(()=>openEncModal('reward',0,c.enchantType),400);
      return;
    } else if(c){ takeCardToHand(c); res=c.name+' を入手した'; }
    else res='カードがなかった';
  }
  showEvent(ev.name,ev.desc,res||ev.res);
}

function showEvent(name,desc,result){ document.getElementById('ev-name').textContent=name; document.getElementById('ev-desc').textContent=desc; document.getElementById('ev-result').textContent=result; showScreen('event'); }
function eventDone(){ renderMoveSelect([{nodeType:'battle',idx:-1}]); showScreen('move'); }
