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
  return 0; // 指輪・杖・消耗品はすべてソウル還元なし
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
  // 報酬グレードと一致するグレードのみ出現（ネームドは除外）
  const targetGrade=G.rewardGrade||1;
  const pool=UNIT_POOL.filter(u=>{
    if(!u.id||u.id==='c_golem') return false;
    if(u.unique) return false;
    if((u.grade||1)>targetGrade) return false;
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

function drawItems(n, maxGrade){
  const pool=[];
  SPELL_POOL.forEach(s=>{
    if(!s.id||s.starterOnly) return;
    if(maxGrade!=null&&(s.grade||1)>maxGrade) return; // グレード上限フィルタ
    if(s.unique&&G.seenWands&&G.seenWands.includes(s.id)) return;
    const c=clone(s);
    if(c.type==='wand'){
      const uses=c.baseUses||(c.baseUsesRange?randi(c.baseUsesRange[0],c.baseUsesRange[1]):randUses());
      c.usesLeft=uses; c._maxUses=uses;
    }
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
    // 宝箱：現在の階層セクショングレード以下のアイテムのみ
    const fd=FLOOR_DATA[G.floor];
    const maxGrade=fd?(fd.sectionGrade||Math.min(4,Math.ceil(fd.grade))||1):1;
    return drawItems(n, maxGrade);
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
  const seen=G._seenLegendRings||new Set();
  const pool=RING_POOL.filter(r=>r.legend&&!seen.has(r.id));
  if(!pool.length){
    // ユニーク指輪が残っていない場合は5ソウル付与
    G.gold+=5; updateHUD();
    log('ユニーク指輪が残っていません。ソウル+5','gold');
    return null;
  }
  const c=clone(randFrom(pool));
  c._buyPrice=0;
  return c;
}
