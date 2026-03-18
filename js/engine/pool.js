// ═══════════════════════════════════════
// pool.js — 報酬プール・カード抽選
// 依存: constants.js, state.js, rings.js, spells.js, events.js
// ═══════════════════════════════════════

// 杖の残り使用回数をランダムに決定（3〜6回）
function randUses(){ return 3+Math.floor(Math.random()*4); }

// 報酬ランクに応じたカードプールを生成
function getPool(lv){
  const maxG=lv<=1?1:lv<=2?2:lv<=3?3:4;
  const pool=[];
  RING_POOL.forEach(r=>{ const c=clone(r); c.grade=Math.min(maxG,4); pool.push(c); });
  SPELL_POOL.forEach(r=>{
    if(r.starterOnly) return; // 炎の杖は報酬に出ない
    const c=clone(r);
    c.grade=Math.min(maxG,4);
    if(c.type==='wand') c.usesLeft=c.baseUses||randUses();
    pool.push(c);
  });
  return pool;
}

// エンチャントカードオブジェクトを生成
function makeEnchantCard(et){
  return {id:'enc_'+et, name:et+'のエンチャント', type:'enchant', isEnchant:true,
          enchantType:et, desc:`指輪に「${et}」を付与する`, kind:'enchant'};
}

// 報酬カードをn枚抽選（エンチャント1枚を必ず含む）
function drawRewards(n=6){
  const pool=getPool(G.rewardLv);
  ENCHANT_TYPES.forEach(et=>pool.push(makeEnchantCard(et)));
  const res=[]; const used=new Set();
  // 最低1枚エンチャント保証
  const fixedEnc=makeEnchantCard(randFrom(ENCHANT_TYPES));
  res.push(fixedEnc); used.add(fixedEnc.id);
  const fi=pool.findIndex(p=>p.id===fixedEnc.id); if(fi>=0) pool.splice(fi,1);
  let t=0;
  while(res.length<n&&pool.length>0&&t++<200){
    const i=Math.floor(Math.random()*pool.length);
    if(!used.has(pool[i].id)){ used.add(pool[i].id); res.push(pool[i]); }
    pool.splice(i,1);
  }
  // シャッフル
  for(let i=res.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [res[i],res[j]]=[res[j],res[i]]; }
  return res;
}
