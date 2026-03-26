// ═══════════════════════════════════════
// event.js — 祭壇・休息所・イベント画面
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

// ── 祭壇（smithy）────────────────────────────────

let _smithyEncs=[];      // 現在の祭壇エンチャント選択肢
let _smithyChosen=new Set(); // 遠見モード：選択済みキー

function doSmithy(regen=true){
  const hasFarsight=G.rings.some(r=>r&&r.unique==='farsight');
  if(regen){
    const encA=randFrom(ENCHANT_TYPES);
    const poolB=ENCHANT_TYPES.filter(e=>e.id!==encA.id);
    const encB=poolB.length?randFrom(poolB):encA;
    _smithyEncs=[encA,encB];
    _smithyChosen=new Set();
  }
  const [encA,encB]=_smithyEncs;
  const el=document.getElementById('smithy-opts');
  el.innerHTML='';

  // 選択肢1：契約グレードアップ
  const doneGrade=_smithyChosen.has('grade');
  const o1=document.createElement('div');
  o1.className='choice-opt'+(doneGrade?' done':'');
  o1.innerHTML='<div class="choice-icon">⬆️</div><div class="choice-label">契約グレードアップ</div><div class="choice-desc">所持している契約を1つ選んでグレードを+1する（無料）</div>';
  if(!doneGrade) o1.onclick=()=>smithyGradeUp(hasFarsight?()=>{ _smithyChosen.add('grade'); doSmithy(false); }:null);
  el.appendChild(o1);

  // 選択肢2：エンチャントA
  const doneEncA=_smithyChosen.has('enc0');
  const o2=document.createElement('div');
  o2.className='choice-opt'+(doneEncA?' done':'');
  o2.innerHTML=`<div class="choice-icon">✨</div><div class="choice-label">エンチャント：${encA.id}</div><div class="choice-desc">「${encA.id}」を付与する — ${encA.effect}（無料）</div>`;
  if(!doneEncA) o2.onclick=()=>{ if(hasFarsight) _encCtx={src:'smithy',cost:0,farsight:true,smithyKey:'enc0'}; openEncModal('smithy',0,encA.id); };
  el.appendChild(o2);

  // 選択肢3：エンチャントB
  const doneEncB=_smithyChosen.has('enc1');
  const o3=document.createElement('div');
  o3.className='choice-opt'+(doneEncB?' done':'');
  o3.innerHTML=`<div class="choice-icon">✨</div><div class="choice-label">エンチャント：${encB.id}</div><div class="choice-desc">「${encB.id}」を付与する — ${encB.effect}（無料）</div>`;
  if(!doneEncB) o3.onclick=()=>{ if(hasFarsight) _encCtx={src:'smithy',cost:0,farsight:true,smithyKey:'enc1'}; openEncModal('smithy',0,encB.id); };
  el.appendChild(o3);

  // 遠見モード：全選択後または完了ボタンで帰還
  if(hasFarsight){
    const btn=document.createElement('button');
    btn.className='btn small'; btn.style.marginTop='10px';
    btn.textContent='完了（立ち去る）';
    btn.onclick=()=>{ renderMoveSelect([{nodeType:'battle',idx:-1}]); showScreen('move'); };
    el.appendChild(btn);
  }

  showScreen('smithy');
}

function smithyGradeUp(onDone){
  const rings=G.rings.map((r,i)=>({r,i})).filter(x=>x.r&&!x.r.legend&&(x.r.grade||1)<MAX_GRADE);
  if(!rings.length){
    if(onDone){ log('グレードアップできる契約がない（全て★か空）','sys'); onDone(); }
    else alert('グレードアップできる指輪がありません（全て★か空）');
    return;
  }
  const el=document.getElementById('smithy-opts');
  el.innerHTML='<div style="font-size:.8rem;color:var(--text2);margin-bottom:8px">グレードアップする契約を選んでください</div>';
  rings.forEach(({r,i})=>{
    const div=document.createElement('div');
    div.className='choice-opt';
    const newG=Math.min(MAX_GRADE,(r.grade||1)+1);
    div.innerHTML=`<div class="choice-label">${r.name} ${gradeStr(r.grade||1)} → ${gradeStr(newG)}</div>`;
    div.onclick=()=>{
      r.grade=newG;
      if(onDone){ log(`${r.name} を ${gradeStr(newG)} に強化`,'good'); onDone(); }
      else showEvent('祭壇',`${r.name} を強化した。`,`${r.name} ${gradeStr(r.grade)}に強化`);
    };
    el.appendChild(div);
  });
}

// ── 休息所（rest）────────────────────────────────

let _restConsumable=null;
let _restChosen=new Set();

function doRest(regen=true){
  const hasFarsight=G.rings.some(r=>r&&r.unique==='farsight');
  if(regen){ _restConsumable=drawConsumable(); _restChosen=new Set(); }
  const freeConsumable=_restConsumable;
  const el=document.getElementById('rest-opts');
  el.innerHTML='';

  // 選択肢1：杖リチャージ
  const wands=G.spells.slice(0,G.wandSlots).filter(s=>s);
  const doneWand=_restChosen.has('wand');
  const o1=document.createElement('div');
  o1.className='choice-opt'+(wands.length&&!doneWand?'':' disabled');
  o1.innerHTML='<div class="choice-icon">🪄</div><div class="choice-label">杖リチャージ+5</div><div class="choice-desc">杖を1本選んで残り使用回数+5（無料）</div>';
  if(wands.length&&!doneWand) o1.onclick=()=>restWandRecharge(hasFarsight?()=>{ _restChosen.add('wand'); doRest(false); }:null);
  el.appendChild(o1);

  // 選択肢2：アイテム入手
  const doneItem=_restChosen.has('item');
  const o2=document.createElement('div');
  o2.className='choice-opt'+(freeConsumable&&!doneItem?'':' disabled');
  const cName=freeConsumable?freeConsumable.name:'アイテムなし';
  o2.innerHTML=`<div class="choice-icon">🎒</div><div class="choice-label">アイテム入手：${cName}</div><div class="choice-desc">${freeConsumable?computeDesc(freeConsumable):''}（無料）</div>`;
  if(freeConsumable&&!doneItem) o2.onclick=()=>{
    const slot=G.spells.slice(G.wandSlots,G.wandSlots+G.consumSlots).findIndex(s=>!s);
    if(slot<0){
      if(hasFarsight){ log('アイテム枠が満杯','sys'); _restChosen.add('item'); doRest(false); }
      else showEvent('休息所','消耗品を受け取ろうとしたが…','アイテム枠が満杯のため受け取れなかった');
      return;
    }
    G.spells[G.wandSlots+slot]=freeConsumable;
    if(hasFarsight){ log(`${freeConsumable.name} を入手`,'good'); _restChosen.add('item'); doRest(false); }
    else showEvent('休息所','旅人から消耗品を受け取った。',`${freeConsumable.name} を入手`);
  };
  el.appendChild(o2);

  // 選択肢3：ライフ+5
  const doneHeal=_restChosen.has('heal');
  const o3=document.createElement('div');
  o3.className='choice-opt'+(doneHeal?' done':'');
  o3.innerHTML='<div class="choice-icon">💊</div><div class="choice-label">ライフ+5</div><div class="choice-desc">ライフを5回復する（上限20）（無料）</div>';
  if(!doneHeal) o3.onclick=()=>{
    G.life=Math.min(20,G.life+5); updateHUD();
    if(hasFarsight){ log('ライフ+5','good'); _restChosen.add('heal'); doRest(false); }
    else showEvent('休息所','焚き火で体を休めた。','ライフ+5');
  };
  el.appendChild(o3);

  // 遠見モード：完了ボタン
  if(hasFarsight){
    const btn=document.createElement('button');
    btn.className='btn small'; btn.style.marginTop='10px';
    btn.textContent='完了（立ち去る）';
    btn.onclick=()=>{ renderMoveSelect([{nodeType:'battle',idx:-1}]); showScreen('move'); };
    el.appendChild(btn);
  }

  showScreen('rest');
}

function restWandRecharge(onDone){
  const wands=G.spells.slice(0,G.wandSlots).map((s,i)=>({s,i})).filter(x=>x.s);
  if(wands.length===1){
    const {s}=wands[0];
    s.usesLeft=(s.usesLeft||0)+5;
    s._maxUses=Math.max(s._maxUses||0,s.usesLeft);
    if(onDone){ log(`${s.name} 残り使用回数+5（${s.usesLeft}回）`,'good'); onDone(); }
    else showEvent('休息所','杖に魔力を注ぎ込んだ。',`${s.name} 残り使用回数+5（${s.usesLeft}回）`);
    return;
  }
  const el=document.getElementById('rest-opts');
  el.innerHTML='<div style="font-size:.8rem;color:var(--text2);margin-bottom:8px">リチャージする杖を選んでください</div>';
  wands.forEach(({s})=>{
    const div=document.createElement('div');
    div.className='choice-opt';
    div.innerHTML=`<div class="choice-label">${s.name}（残${s.usesLeft||0}回）</div>`;
    div.onclick=()=>{
      s.usesLeft=(s.usesLeft||0)+5;
      s._maxUses=Math.max(s._maxUses||0,s.usesLeft);
      if(onDone){ log(`${s.name} 残り使用回数+5（${s.usesLeft}回）`,'good'); onDone(); }
      else showEvent('休息所','杖に魔力を注ぎ込んだ。',`${s.name} 残り使用回数+5（${s.usesLeft}回）`);
    };
    el.appendChild(div);
  });
}
