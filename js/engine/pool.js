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
  return card.cost||4;
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
    if(r.rarity===-1) return false;
    if(r.legend) return false;
    if(r.rarity===3&&G._seenRarity3&&G._seenRarity3.has(r.id)) return false;
    if(G.bannedRings&&G.bannedRings.includes(r.id)) return false;
    return true;
  }).map(r=>{ const c=clone(r); c._buyPrice=c.cost||4; return c; });
}

// ── キャラクタープールから N 体抽選 ────────────────

function drawCharacters(n){
  // 報酬グレードと一致するグレードのみ出現（ネームドは除外）
  const targetGrade=G.rewardGrade||1;
  const pool=UNIT_POOL.filter(u=>{
    if(!u.id||u.id==='c_golem') return false;
    if(u.unique) return false;
    if(u.rarity===-1) return false;
    if((u.grade||1)>targetGrade) return false;
    if(u.rarity===3&&G._seenRarity3&&G._seenRarity3.has(u.id)) return false;
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
    // マミー効果：不死キャラの表示ATKにボーナスを反映（makeUnitFromDef での二重加算を防ぐため _bonusApplied フラグを付ける）
    if((card.race==='不死'||card.race==='全て')&&G._undeadHpBonus){ card.atk+=G._undeadHpBonus; card.baseAtk=(card.baseAtk||card.atk)+G._undeadHpBonus; card._bonusApplied=true; }
    // スペクター効果：不死キャラの表示ATK/HPにボーナスを反映
    if((card.race==='不死'||card.race==='全て')&&G._specterBonus){ card.atk+=G._specterBonus; card.baseAtk=(card.baseAtk||card.atk)+G._specterBonus; card.hp+=G._specterBonus; card.maxHp+=G._specterBonus; card._bonusApplied=true; }
    res.push(card);
  }
  res.forEach(c=>{ if(c.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(c.id)) G._seenRarity3.add(c.id); });
  return res;
}

// ── アイテムプールから N 個抽選 ─────────────────

function drawItems(n, maxGrade){
  const effectiveMax=maxGrade!=null?maxGrade:(G.rewardGrade||1);
  const pool=[];
  SPELL_POOL.forEach(s=>{
    if(!s.id||s.starterOnly) return;
    if(s.rarity===-1) return;
    if(s.rarity===4) return; // rarity4は洞窟ボーナス専用
    if((s.grade||1)>effectiveMax) return; // グレード上限フィルタ
    if(s.unique&&G.seenWands&&G.seenWands.includes(s.id)) return;
    if(s.rarity===3&&G._seenRarity3&&G._seenRarity3.has(s.id)) return;
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
  res.forEach(c=>{ if(c.unique&&!G.seenWands.includes(c.id)) G.seenWands.push(c.id); if(c.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(c.id)) G._seenRarity3.add(c.id); });
  return res;
}

// ── 報酬 5 枚（キャラ3体 + 杖1 + アイテム1）──────

function _drawByType(type, n, maxGrade){
  const targetGrade=maxGrade!=null?maxGrade:(G.rewardGrade||1);
  const pool=[];
  SPELL_POOL.forEach(s=>{
    if(!s.id||s.starterOnly) return;
    if(s.rarity===-1) return;
    if(s.rarity===4) return; // rarity4は洞窟ボーナス専用
    if(s.type!==type) return;
    if((s.grade||1)>targetGrade) return;
    if(s.unique&&G.seenWands&&G.seenWands.includes(s.id)) return;
    if(s.rarity===3&&G._seenRarity3&&G._seenRarity3.has(s.id)) return;
    const c=clone(s);
    if(c.type==='wand'){ const uses=c.baseUses||(c.baseUsesRange?randi(c.baseUsesRange[0],c.baseUsesRange[1]):randUses()); c.usesLeft=uses; c._maxUses=uses; }
    c._buyPrice=calcBuyPrice(c);
    pool.push(c);
  });
  const res=[];
  while(res.length<n&&pool.length>0){ const i=Math.floor(Math.random()*pool.length); res.push(pool.splice(i,1)[0]); }
  res.forEach(c=>{ if(c.unique&&!G.seenWands.includes(c.id)) G.seenWands.push(c.id); if(c.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(c.id)) G._seenRarity3.add(c.id); });
  return res;
}

// ── 宝箱ドロップ抽選 ────────────────────────────
function _rollRarity(weights){
  let roll=Math.random()*100, cum=0;
  for(const [r,w] of Object.entries(weights)){ cum+=parseFloat(w); if(roll<cum) return parseInt(r); }
  return parseInt(Object.keys(weights).pop());
}

// rarityWeights: e.g. {1:60,2:30,3:10} / typeWeights: e.g. {wand:40,consumable:40,ring:20}
function drawTreasure(rarityWeights, typeWeights, maxGrade){
  const rarity=Math.min(_rollRarity(rarityWeights), maxGrade||4);
  const wv=typeWeights.wand||0, cv=typeWeights.consumable||0;
  const roll=Math.random()*100;
  const type=roll<wv?'wand':roll<wv+cv?'consumable':'ring';

  const _seen3=G._seenRarity3||new Set();
  let pool, c;
  if(type==='ring'){
    const _mgr=maxGrade||4;
    pool=RING_POOL.filter(r=>!r.starterOnly&&r.rarity!==-1&&(r.grade||1)<=_mgr&&(r.rarity||1)===rarity&&!(r.rarity===3&&_seen3.has(r.id)));
    if(!pool.length) pool=RING_POOL.filter(r=>!r.starterOnly&&r.rarity!==-1&&(r.grade||1)<=_mgr&&!(r.rarity===3&&_seen3.has(r.id)));
    if(!pool.length) return null;
    c=clone(randFrom(pool));
    c.grade=maxGrade;
  } else {
    const _mg=maxGrade||4;
    pool=SPELL_POOL.filter(s=>!s.starterOnly&&s.rarity!==-1&&s.type===type&&(s.grade||1)<=_mg&&(s.rarity||1)===rarity&&!(s.rarity===3&&_seen3.has(s.id)));
    if(!pool.length) pool=SPELL_POOL.filter(s=>!s.starterOnly&&s.rarity!==-1&&s.type===type&&(s.grade||1)<=_mg&&!(s.rarity===3&&_seen3.has(s.id)));
    if(!pool.length) return null;
    c=clone(randFrom(pool));
    if(c.type==='wand'){ const uses=c.baseUses||4; c.usesLeft=uses; c._maxUses=uses; }
  }
  c._rarity=rarity;
  c._buyPrice=0; // 宝箱の中身は全て無料（指輪含む）
  c._isTreasure=true;
  if(rarity===3&&G._seenRarity3) G._seenRarity3.add(c.id);
  return c;
}

// 祭壇効果①：次の報酬に同種のユニークを1枚含める
function _applyUniqueSlot(res){
  const targetGrade=G.rewardGrade||1;
  const allyIds=G.allies.filter(Boolean).map(a=>a.id);
  const uChars=UNIT_POOL.filter(u=>u.unique&&u.id!=='c_golem'&&u.rarity!==-1&&(u.grade||1)<=targetGrade&&!allyIds.includes(u.id));
  const uWands=SPELL_POOL.filter(s=>s.type==='wand'&&s.unique&&!s.starterOnly&&s.rarity!==-1&&!(G.seenWands&&G.seenWands.includes(s.id)));
  const uCons=SPELL_POOL.filter(s=>s.type==='consumable'&&s.unique&&!s.starterOnly&&s.rarity!==-1);

  const charSlots=res.map((c,i)=>({c,i})).filter(({c})=>c&&c._isChar);
  const wandSlot=res.findIndex(c=>c&&c.type==='wand');
  const conSlot=res.findIndex(c=>c&&c.type==='consumable');

  const candidates=[];
  if(uChars.length&&charSlots.length) candidates.push('char');
  if(uWands.length&&wandSlot>=0) candidates.push('wand');
  if(uCons.length&&conSlot>=0) candidates.push('consumable');
  if(!candidates.length) return;

  const pick=randFrom(candidates);
  if(pick==='char'){
    const {i}=randFrom(charSlots);
    const card=clone(randFrom(uChars));
    card._isChar=true; card._buyPrice=calcBuyPrice(card);
    res[i]=card;
  } else if(pick==='wand'){
    const def=randFrom(uWands);
    const card=clone(def);
    const uses=card.baseUses||4; card.usesLeft=uses; card._maxUses=uses;
    card._buyPrice=calcBuyPrice(card);
    if(!G.seenWands.includes(card.id)) G.seenWands.push(card.id);
    res[wandSlot]=card;
  } else {
    const card=clone(randFrom(uCons));
    card._buyPrice=calcBuyPrice(card);
    res[conSlot]=card;
  }
}

function drawRewards(n){
  if(n!=null){
    // 宝箱：現在の階層セクショングレード以下のアイテムのみ
    const fd=FLOOR_DATA[G.floor];
    const maxGrade=fd?(fd.sectionGrade||Math.min(4,Math.ceil(fd.grade))||1):1;
    return drawItems(n, maxGrade);
  }
  // キャラクター（初期3体、報酬グレードアップで増加）、杖、消耗品
  const chars=drawCharacters(G.rewardCharCount||3);
  const wand=_drawByType('wand',1)[0]||null;
  const item=_drawByType('consumable',1)[0]||null;
  const res=[...chars];
  if(wand) res.push(wand);
  if(item) res.push(item);
  // 祭壇効果①：ユニークスロット
  if(G._nextRewardUniqueSlot){
    G._nextRewardUniqueSlot=false;
    _applyUniqueSlot(res);
  }
  return res;
}

// ── 消耗品のみ抽選（休息所・インプ用）──────────────

function drawConsumable(maxGrade){
  const _mg=maxGrade!=null?maxGrade:99;
  const pool=SPELL_POOL.filter(s=>s.type==='consumable'&&!s.starterOnly&&s.rarity!==-1&&s.rarity!==4&&(s.grade||1)<=_mg);
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
