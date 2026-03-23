// ═══════════════════════════════════════
// pool.js — 報酬プール・カード抽選
// 依存: constants.js, state.js, rings.js, spells.js, events.js
// ═══════════════════════════════════════

// 杖の残り使用回数をランダムに決定（3〜6回）
function randUses(){ return 3+Math.floor(Math.random()*4); }

// 階層に応じたグレード（固定）S1-5→G1、S6-10→G2、S11-15→G3、S16-20→G4
function rollGrade(floor){
  if(floor<=5)  return 1;
  if(floor<=10) return 2;
  if(floor<=15) return 3;
  return 4;
}

// カードの購入金額を生成時に確定
// 指輪G1=3金、杖G1=2金、消耗品=1金。G2以上は+2金(75%)か+1金(25%)を積み上げ
function calcBuyPrice(card){
  if(card.type==='consumable') return 1;
  const grade=card.grade||1;
  let price=card.type==='wand'?2:3;
  for(let i=1;i<grade;i++) price+=Math.random()<0.75?2:1;
  return price;
}

// 売却時の払い戻し金額（G1=1金、G2=2金…G5=5金。杖・消耗品=0金。還魂促進秘術は杖・消耗品も1金）
function cardRefund(card){
  if(!card) return 0;
  if(card.type==='consumable') return (G.arcana&&G.arcana.id==='還魂促進')?1:0;
  if(card.type==='wand') return (G.arcana&&G.arcana.id==='還魂促進')?1:0;
  return card.grade||1;
}

// 報酬用カードプールを生成（ユニーク・抹消済み指輪を除外）
function getPool(){
  const pool=[];
  RING_POOL.forEach(r=>{
    if(!r.id) return;                         // idなしは除外
    if(r.legend) return;                      // legend指輪は通常報酬に出ない
    if(G.bannedRings&&G.bannedRings.includes(r.id)) return; // 抹消済みも除外
    const c=clone(r);
    c.grade=rollGrade(G.floor);              // 契約のみグレードあり
    c._buyPrice=calcBuyPrice(c);
    pool.push(c);
  });
  SPELL_POOL.forEach(r=>{
    if(!r.id) return;                         // idなしは除外
    if(r.starterOnly) return;
    if(r.unique&&G.seenWands&&G.seenWands.includes(r.id)) return; // ユニーク杖の重複除外
    const c=clone(r);
    // 杖・消耗品にはグレードなし（delete して undefined ではなく未設定にする）
    if(c.type==='wand'){ c.usesLeft=c.baseUses||randUses(); c._maxUses=c.usesLeft; }
    c._buyPrice=calcBuyPrice(c);
    pool.push(c);
  });
  return pool;
}

// 報酬カードを n 枚抽選（同IDは重複可）
function drawRewards(n){
  const count=(n!=null)?n:(G.rewardCards||3);
  const pool=getPool();
  const res=[];
  let t=0;
  while(res.length<count&&pool.length>0&&t++<500){
    const i=Math.floor(Math.random()*pool.length);
    res.push(pool.splice(i,1)[0]);
  }
  for(let i=res.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [res[i],res[j]]=[res[j],res[i]]; }
  // ユニーク杖を出現済みとしてマーク（取得有無に関係なく）
  res.forEach(c=>{ if(c.unique&&!G.seenWands.includes(c.id)) G.seenWands.push(c.id); });
  return res;
}

// エリート撃破報酬用のユニーク指輪を抽選（bannedRings無視。既にMAX_GRADE所持済みは除外）
function drawUniqueRing(){
  const pool=RING_POOL.filter(r=>{
    if(!r.legend) return false;
    const owned=G.rings&&G.rings.find(x=>x&&x.id===r.id);
    if(owned&&(owned.grade||1)>=MAX_GRADE) return false; // 既にMAX所持→スキップ
    return true;
  });
  if(!pool.length) return null;
  const c=clone(randFrom(pool));
  c._buyPrice=3;
  return c;
}

// 消耗品のみのプールからランダムに1枚取得（休息所用）
function drawConsumable(){
  const pool=SPELL_POOL.filter(s=>s.type==='consumable');
  if(!pool.length) return null;
  const c=clone(randFrom(pool));
  c._buyPrice=1;
  return c;
}
