// ═══════════════════════════════════════
// pool.js — 報酬プール・カード抽選
// 依存: constants.js, state.js, units.js, spells.js
// ═══════════════════════════════════════

function randUses(){ return 3+Math.floor(Math.random()*4); }

// キャラクターのグレードを階層に応じて決定
function rollCharGrade(floor){
  if(floor<5)  return 1;
  if(floor<10) return 2;
  if(floor<15) return 3;
  return 4;
}

// 指輪グレード（互換）
function rollGrade(floor){ return rollCharGrade(floor); }

// 購入価格
function calcBuyPrice(card){
  if(!card) return 1;
  // キャラクター
  if(card._isChar){
    return card.cost||2;
  }
  if(card.type==='consumable') return card.cost||1;
  if(card.type==='wand') return card.cost||2;
  // 指輪
  return 3;
}

// 売却払い戻し
function cardRefund(card){
  if(!card) return 0;
  if(card._isChar) return 1;
  if(card.type==='consumable') return 0;
  if(card.type==='wand') return 0;
  return card.grade||1;
}

// 指輪プール（商店・イベント用）
function getRingPool(){
  return RING_POOL.filter(r=>{
    if(!r.id) return false;
    if(r.legend) return false;
    if(G.bannedRings&&G.bannedRings.includes(r.id)) return false;
    return true;
  }).map(r=>{ const c=clone(r); c.grade=rollGrade(G.floor); c._buyPrice=3; return c; });
}

// ── キャラクタープールから N 体抽選 ────────────────

function drawCharacters(n){
  const targetGrade=rollCharGrade(G.floor);
  // 利用可能なキャラ（G1ユニークは5%、G2以上は階層で解禁、現在G1+ワームのみ）
  const pool=UNIT_POOL.filter(u=>{
    if(!u.id||u.id==='c_golem') return false; // ゴーレムは報酬に出ない
    if(u.grade>targetGrade) return false;      // 階層不足
    if(u.unique){
      // ユニーク：5%の確率で候補に
      return Math.random()<0.05;
    }
    return true;
  });
  if(!pool.length) return [];
  const res=[];
  const used=new Set();
  let t=0;
  while(res.length<n&&t++<300){
    const def=randFrom(pool);
    if(used.has(def.id)&&pool.length>res.length) continue; // 重複を避ける（できる限り）
    used.add(def.id);
    const card=clone(def);
    card._isChar=true;
    card._buyPrice=calcBuyPrice(card);
    res.push(card);
  }
  return res;
}

// ── アイテムプールから N 個抽選 ─────────────────

function drawItems(n){
  const pool=[];
  SPELL_POOL.forEach(s=>{
    if(!s.id||s.starterOnly) return;
    if(s.unique&&G.seenWands&&G.seenWands.includes(s.id)) return;
    const c=clone(s);
    if(c.type==='wand'){ c.usesLeft=c.baseUses||randUses(); c._maxUses=c.usesLeft; }
    c._buyPrice=calcBuyPrice(c);
    pool.push(c);
  });
  const res=[];
  let t=0;
  while(res.length<n&&pool.length>0&&t++<300){
    const i=Math.floor(Math.random()*pool.length);
    res.push(pool.splice(i,1)[0]);
  }
  res.forEach(c=>{ if(c.unique&&!G.seenWands.includes(c.id)) G.seenWands.push(c.id); });
  return res;
}

// ── 報酬 6 枚（キャラ3〜4体 + アイテム2〜3個）──────

function drawRewards(n){
  if(n!=null){
    // n指定の場合はアイテムのみ
    return drawItems(n);
  }
  const numChars=3+(Math.random()<0.5?1:0); // 3 or 4
  const numItems=6-numChars;               // 2 or 3
  const chars=drawCharacters(numChars);
  const items=drawItems(numItems);
  const res=[...chars,...items];
  // シャッフル
  for(let i=res.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [res[i],res[j]]=[res[j],res[i]]; }
  return res;
}

// ── 消耗品のみ抽選（休息所・インプ用）──────────────

function drawConsumable(){
  const pool=SPELL_POOL.filter(s=>s.type==='consumable'&&!s.starterOnly);
  if(!pool.length) return null;
  const c=clone(randFrom(pool));
  c._buyPrice=calcBuyPrice(c);
  return c;
}

// ── ユニーク指輪（エリート撃破報酬）─────────────────

function drawUniqueRing(){
  const pool=RING_POOL.filter(r=>{
    if(!r.legend) return false;
    const owned=G.rings&&G.rings.find(x=>x&&x.id===r.id);
    if(owned&&(owned.grade||1)>=MAX_GRADE) return false;
    return true;
  });
  if(!pool.length) return null;
  const c=clone(randFrom(pool));
  c._buyPrice=3;
  return c;
}
