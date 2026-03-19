// ═══════════════════════════════════════
// event.js — 鍛冶屋・休息所・イベント画面
// 依存: state.js, events.js, pool.js, move.js, reward.js
// ═══════════════════════════════════════

// ── 汎用イベント画面 ─────────────────────────────

function showEvent(name,desc,result){
  document.getElementById('ev-name').textContent=name;
  document.getElementById('ev-desc').textContent=desc;
  document.getElementById('ev-result').textContent=result;
  showScreen('event');
}
function eventDone(){ renderMoveSelect([{nodeType:'battle',idx:-1}]); showScreen('move'); }

// ── 鍛冶屋（smithy）────────────────────────────────

function doSmithy(){
  const encA=randFrom(ENCHANT_TYPES);
  const poolB=ENCHANT_TYPES.filter(e=>e!==encA);
  const encB=poolB.length?randFrom(poolB):encA;

  const el=document.getElementById('smithy-opts');
  el.innerHTML='';

  // 選択肢1：指輪グレードアップ
  const o1=document.createElement('div');
  o1.className='choice-opt';
  o1.innerHTML='<div class="choice-icon">⬆️</div><div class="choice-label">指輪グレードアップ</div><div class="choice-desc">所持している指輪を1つ選んでグレードを+1する（無料）</div>';
  o1.onclick=()=>smithyGradeUp();
  el.appendChild(o1);

  // 選択肢2：エンチャントA
  const o2=document.createElement('div');
  o2.className='choice-opt';
  o2.innerHTML=`<div class="choice-icon">✨</div><div class="choice-label">エンチャント付与：${encA}</div><div class="choice-desc">指輪を1つ選んで「${encA}」を付与する（無料）</div>`;
  o2.onclick=()=>{ openEncModal('reward',0,encA); };
  el.appendChild(o2);

  // 選択肢3：エンチャントB
  const o3=document.createElement('div');
  o3.className='choice-opt';
  o3.innerHTML=`<div class="choice-icon">✨</div><div class="choice-label">エンチャント付与：${encB}</div><div class="choice-desc">指輪を1つ選んで「${encB}」を付与する（無料）</div>`;
  o3.onclick=()=>{ openEncModal('reward',0,encB); };
  el.appendChild(o3);

  showScreen('smithy');
}

function smithyGradeUp(){
  const rings=G.rings.map((r,i)=>({r,i})).filter(x=>x.r&&(x.r.grade||1)<MAX_GRADE);
  if(!rings.length){ alert('グレードアップできる指輪がありません（全て★か空）'); return; }
  const el=document.getElementById('smithy-opts');
  el.innerHTML='<div style="font-size:.8rem;color:var(--text2);margin-bottom:8px">グレードアップする指輪を選んでください</div>';
  rings.forEach(({r,i})=>{
    const div=document.createElement('div');
    div.className='choice-opt';
    const newG=Math.min(MAX_GRADE,(r.grade||1)+1);
    div.innerHTML=`<div class="choice-label">${r.name} ${gradeStr(r.grade||1)} → ${gradeStr(newG)}</div>`;
    div.onclick=()=>{
      r.grade=newG;
      if(newG>=MAX_GRADE&&!G.bannedRings.includes(r.id)) G.bannedRings.push(r.id);
      showEvent('鍛冶屋',`${r.name} を強化した。`,`${r.name} ${gradeStr(r.grade)}に強化`);
    };
    el.appendChild(div);
  });
}

// ── 休息所（rest）────────────────────────────────

function doRest(){
  const freeConsumable=drawConsumable();
  const el=document.getElementById('rest-opts');
  el.innerHTML='';

  // 選択肢1：杖リチャージ
  const wands=G.spells.slice(0,G.wandSlots).filter(s=>s);
  const o1=document.createElement('div');
  o1.className='choice-opt'+(wands.length?'':' disabled');
  o1.innerHTML='<div class="choice-icon">🪄</div><div class="choice-label">杖リチャージ+5</div><div class="choice-desc">杖を1本選んで残り使用回数+5（無料）</div>';
  if(wands.length) o1.onclick=()=>restWandRecharge();
  el.appendChild(o1);

  // 選択肢2：消耗品入手
  const o2=document.createElement('div');
  o2.className='choice-opt'+(freeConsumable?'':' disabled');
  const cName=freeConsumable?freeConsumable.name:'消耗品なし';
  o2.innerHTML=`<div class="choice-icon">🎒</div><div class="choice-label">消耗品入手：${cName}</div><div class="choice-desc">${freeConsumable?computeDesc(freeConsumable):''}（無料）</div>`;
  if(freeConsumable) o2.onclick=()=>{
    const slot=G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).findIndex(s=>!s);
    if(slot<0){ showEvent('休息所','消耗品を受け取ろうとしたが…','消耗品枠が満杯のため受け取れなかった'); return; }
    G.spells[G.wandSlots+slot]=freeConsumable;
    showEvent('休息所','旅人から消耗品を受け取った。',`${freeConsumable.name} を入手`);
  };
  el.appendChild(o2);

  // 選択肢3：ライフ+5
  const o3=document.createElement('div');
  o3.className='choice-opt';
  o3.innerHTML='<div class="choice-icon">💊</div><div class="choice-label">ライフ+5</div><div class="choice-desc">ライフを5回復する（上限20）（無料）</div>';
  o3.onclick=()=>{
    G.life=Math.min(20,G.life+5);
    updateHUD();
    showEvent('休息所','焚き火で体を休めた。','ライフ+5');
  };
  el.appendChild(o3);

  showScreen('rest');
}

function restWandRecharge(){
  const wands=G.spells.slice(0,G.wandSlots).map((s,i)=>({s,i})).filter(x=>x.s);
  if(wands.length===1){
    // 1本しかなければ自動選択
    const {s}=wands[0];
    s.usesLeft=(s.usesLeft||0)+5;
    s._maxUses=Math.max(s._maxUses||0,s.usesLeft);
    showEvent('休息所','杖に魔力を注ぎ込んだ。',`${s.name} 残り使用回数+5（${s.usesLeft}回）`);
    return;
  }
  // 複数ある場合は選択
  const el=document.getElementById('rest-opts');
  el.innerHTML='<div style="font-size:.8rem;color:var(--text2);margin-bottom:8px">リチャージする杖を選んでください</div>';
  wands.forEach(({s})=>{
    const div=document.createElement('div');
    div.className='choice-opt';
    div.innerHTML=`<div class="choice-label">${s.name}（残${s.usesLeft||0}回）</div>`;
    div.onclick=()=>{
      s.usesLeft=(s.usesLeft||0)+5;
      s._maxUses=Math.max(s._maxUses||0,s.usesLeft);
      showEvent('休息所','杖に魔力を注ぎ込んだ。',`${s.name} 残り使用回数+5（${s.usesLeft}回）`);
    };
    el.appendChild(div);
  });
}
