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

let _smithyRing=null;    // 現在の祭壇で出現したランダム指輪
let _smithyChosen=new Set(); // 遠見モード：選択済みキー

function doSmithy(regen=true){
  const hasFarsight=G.rings.some(r=>r&&r.unique==='farsight');
  if(regen) _smithyChosen=new Set();
  const el=document.getElementById('smithy-opts');
  el.innerHTML='';

  // 選択肢1：魔術レベル+3
  const doneMagic=_smithyChosen.has('magic');
  const o1=document.createElement('div');
  o1.className='choice-opt'+(doneMagic?' done':'');
  o1.innerHTML='<div class="choice-icon">📖</div><div class="choice-label">秘術の伝授</div><div class="choice-desc">魔術レベルが+3される（無料）</div>';
  if(!doneMagic) o1.onclick=()=>{
    G.magicLevel=(G.magicLevel||0)+3; updateHUD();
    if(hasFarsight){ log(`魔術レベル+3（現在${G.magicLevel}）`,'good'); _smithyChosen.add('magic'); doSmithy(false); }
    else showEvent('祭壇','古の魔法書を読み解いた。',`魔術レベル+3（現在${G.magicLevel}）`);
  };
  el.appendChild(o1);

  // 選択肢2：行動権永続+1
  const doneAction=_smithyChosen.has('action');
  const o2=document.createElement('div');
  o2.className='choice-opt'+(doneAction?' done':'');
  o2.innerHTML='<div class="choice-icon">⚡</div><div class="choice-label">旅の準備</div><div class="choice-desc">行動回数が永続で+1される（無料）</div>';
  if(!doneAction) o2.onclick=()=>{
    G._bonusAction=(G._bonusAction||0)+1; updateHUD();
    if(hasFarsight){ log('行動権+1（永続）','good'); _smithyChosen.add('action'); doSmithy(false); }
    else showEvent('祭壇','行軍の備えを整えた。','行動回数+1（永続）');
  };
  el.appendChild(o2);

  // 選択肢3：全仲間±0/+5
  const doneHeal=_smithyChosen.has('heal');
  const o3=document.createElement('div');
  o3.className='choice-opt'+(doneHeal?' done':'');
  o3.innerHTML='<div class="choice-icon">💚</div><div class="choice-label">祭壇の癒し</div><div class="choice-desc">全ての仲間のライフが+5される（無料）</div>';
  if(!doneHeal) o3.onclick=()=>{
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=5; a.maxHp+=5; }}); updateHUD();
    if(hasFarsight){ log('全仲間ライフ+5','good'); _smithyChosen.add('heal'); doSmithy(false); }
    else showEvent('祭壇','祭壇の祝福を受けた。','全仲間ライフ+5');
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

  showScreen('smithy');
}

// ── 宿屋（rest）────────────────────────────────

let _restNamedUnit=null; // 現在の宿屋で出現したネームドキャラ
let _restChosen=new Set();

function doRest(regen=true){
  const hasFarsight=G.rings.some(r=>r&&r.unique==='farsight');
  if(regen){
    const targetGrade=G.rewardGrade||1;
    const namedPool=UNIT_POOL.filter(u=>
      u.unique && u.id!=='c_golem' && (u.grade||1)<=targetGrade &&
      !G._usedNamedElite.has(u.id) && !G._usedNamedRest.has(u.id)
    );
    const picked=namedPool.length?randFrom(namedPool):null;
    _restNamedUnit=picked?clone(picked):null;
    // 登場した時点で宿屋使用済みとしてマーク（得なくても除外）
    if(picked) G._usedNamedRest.add(picked.id);
    _restChosen=new Set();
  }
  const namedUnit=_restNamedUnit;
  const el=document.getElementById('rest-opts');
  el.innerHTML='';

  // 選択肢1：全仲間±0/+5
  const doneHeal=_restChosen.has('heal');
  const o1=document.createElement('div');
  o1.className='choice-opt'+(doneHeal?' done':'');
  o1.innerHTML='<div class="choice-icon">🍺</div><div class="choice-label">宿屋の宴</div><div class="choice-desc">全ての仲間のライフが+5される（無料）</div>';
  if(!doneHeal) o1.onclick=()=>{
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=5; a.maxHp+=5; }}); updateHUD();
    if(hasFarsight){ log('全仲間ライフ+5','good'); _restChosen.add('heal'); doRest(false); }
    else showEvent('宿屋','宴で体力を回復した。','全仲間ライフ+5');
  };
  el.appendChild(o1);

  // 選択肢2：行動権+1
  const doneAction=_restChosen.has('action');
  const o2=document.createElement('div');
  o2.className='choice-opt'+(doneAction?' done':'');
  o2.innerHTML='<div class="choice-icon">⚡</div><div class="choice-label">旅の準備</div><div class="choice-desc">行動回数が永続で+1される（無料）</div>';
  if(!doneAction) o2.onclick=()=>{
    G._bonusAction=(G._bonusAction||0)+1; updateHUD();
    if(hasFarsight){ log('行動権+1（永続）','good'); _restChosen.add('action'); doRest(false); }
    else showEvent('宿屋','旅の準備を整えた。','行動回数+1（永続）');
  };
  el.appendChild(o2);

  // 選択肢3：ランダムなネームド1人（無料）
  const doneNamed=_restChosen.has('named');
  const o3=document.createElement('div');
  o3.className='choice-opt'+(namedUnit&&!doneNamed?'':' disabled');
  const nName=namedUnit?namedUnit.name:'なし';
  const nDesc=namedUnit?computeDesc(namedUnit):'';
  o3.innerHTML=`<div class="choice-icon">⭐</div><div class="choice-label">旅の仲間：${nName}</div><div class="choice-desc">${nDesc}（無料）</div>`;
  if(namedUnit&&!doneNamed) o3.onclick=()=>{
    const charCard=clone(namedUnit);
    charCard._isChar=true; charCard._buyPrice=0;
    showEventItemPickup(charCard, ()=>{
      _restChosen.add('named');
      if(hasFarsight) doRest(false);
    });
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
