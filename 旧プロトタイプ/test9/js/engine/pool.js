// ═══════════════════════════════════════
// pool.js — 報酬プール・カード抽選
// 依存: constants.js, state.js, units.js, spells.js
// ═══════════════════════════════════════

function randUses(){ return 3+Math.floor(Math.random()*4); }

function isExperimentalAppearanceMode(){
  return typeof CARD_APPEARANCE_MODE!=='undefined'
    && typeof CARD_APPEARANCE_MODES!=='undefined'
    && CARD_APPEARANCE_MODE===CARD_APPEARANCE_MODES.EXPERIMENTAL;
}

function getExperimentalGradeWeights(floor){
  const f=Math.max(1,Math.floor(floor||G.floor||1));
  if(f>=15) return [...EXPERIMENTAL_GRADE_WEIGHTS_15_PLUS];
  return [...(EXPERIMENTAL_GRADE_WEIGHTS[f]||EXPERIMENTAL_GRADE_WEIGHTS[1])];
}

function getExperimentalFloorGrade(floor){
  const f=Math.max(1,Math.floor(floor||G.floor||1));
  if(f<=4) return 1;
  if(f<=9) return 2;
  if(f<=14) return 3;
  return 4;
}

function getExperimentalRewardCharCount(floor){
  return 2+getExperimentalFloorGrade(floor);
}

function rollExperimentalAppearanceGrade(floor){
  const weights=getExperimentalGradeWeights(floor);
  const total=weights.reduce((s,w)=>s+w,0);
  let roll=Math.random()*total;
  for(let i=0;i<weights.length;i++){
    roll-=weights[i];
    if(roll<0) return i+1;
  }
  return weights.length;
}

function _drawExperimentalFromPool(source, n, makeCard){
  const eligible=source.filter(Boolean);
  const res=[];
  const used=new Set();
  let t=0;
  while(res.length<n&&eligible.length>0&&t++<600){
    const grade=rollExperimentalAppearanceGrade(G.floor);
    let pool=eligible.filter(c=>(c.grade||1)===grade);
    if(!pool.length) pool=eligible;
    const def=randFrom(pool);
    if(used.has(def.id)&&eligible.length>res.length) continue;
    used.add(def.id);
    res.push(makeCard(def));
  }
  return res;
}

function applyRaceBuffsToRewardCard(card){
  if(!card||!card._isChar||!G.raceBuffs) return;
  Object.entries(G.raceBuffs).forEach(([race,b])=>{
    if(!unitMatchesRace(card,race)) return;
    const atk=b.atk||0, hp=b.hp||0;
    if(atk>0){ const _prevAtk=card.atk||0; card.atk=_prevAtk+atk; card.baseAtk=(card.baseAtk!=null?card.baseAtk:_prevAtk)+atk; }
    if(hp>0){ const _baseMaxHp=card.maxHp||card.hp; card.hp+=hp; card.maxHp=_baseMaxHp+hp; }
  });
}

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
  if(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope) return card.cost||2;
  // 指輪
  return card.cost||4;
}

const PANEL_POOL=[
  {id:'panel_vampire',name:'吸血',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'パッシブ',unique:'panel_vampire',cost:0,desc:'自動：敵にダメージを与えた時に、与えたダメージの10%回復する。'},
  {id:'panel_stealth',name:'隠密',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'パッシブ',unique:'panel_stealth',cost:0,desc:'自動：攻撃してもヘイト状態にならない。'},
  {id:'panel_counter',name:'反撃',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'パッシブ',unique:'panel_counter',cost:0,desc:'自動：ダメージを受けると直ちに全ての敵に8ダメージを与える。'},
  {id:'panel_grudge',name:'執念',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'パッシブ',unique:'panel_grudge',cost:0,desc:'死亡：ランダムな敵に自身の最大HPに等しいダメージを与える。'},
];

function makePanel(idOrName){
  const def=PANEL_POOL.find(p=>p.id===idOrName||p.name===idOrName);
  if(!def) return null;
  const c=clone(def);
  c.equip=true;
  c.noRewardUse=true;
  c._buyPrice=calcBuyPrice(c);
  return c;
}

function drawPanel(n=1, maxGrade){
  const targetGrade=maxGrade!=null?maxGrade:(G.rewardGrade||1);
  const pool=PANEL_POOL.filter(p=>p&&p.id&&(p.grade||1)<=targetGrade);
  const res=[];
  let t=0;
  while(res.length<n&&pool.length>0&&t++<300){
    const weighted=_applyGlobalKnowledgeWeight(pool).flatMap(p=>{
      const w=Math.max(1,7-(p.rarity||1));
      return Array.from({length:w},()=>p);
    });
    const picked=randFrom(weighted);
    const card=makePanel(picked.id);
    if(card) res.push(card);
  }
  return res;
}

const GLOBAL_PANEL_POOL=[
  {id:'gp_martial_1',name:'武術の知識　Lv.1',rarity:1,grade:1,panelScope:'global',category:'全体／武術',desc:'自動：グレード2以下の武術が出現しやすくなる。'},
  {id:'gp_martial_2',name:'武術の知識　Lv.2',rarity:2,grade:2,panelScope:'global',category:'全体／武術',requires:'gp_martial_1',desc:'自動：グレード3以下の武術が出現しやすくなる。'},
  {id:'gp_martial_3',name:'武術の知識　Lv.3',rarity:3,grade:3,panelScope:'global',category:'全体／武術',requires:'gp_martial_2',desc:'自動：グレード4以下の武術が出現しやすくなる。'},
  {id:'gp_martial_4',name:'武術の知識　Lv.4',rarity:4,grade:4,panelScope:'global',category:'全体／武術',requires:'gp_martial_3',desc:'自動：グレード5以下の武術が出現しやすくなる。'},
  {id:'gp_martial_5',name:'武術の知識　Lv.5',rarity:5,grade:5,panelScope:'global',category:'全体／武術',requires:'gp_martial_4',desc:'自動：グレード6以下の武術が出現しやすくなる。'},
  {id:'gp_magic_1',name:'魔術の知識　Lv.1',rarity:1,grade:1,panelScope:'global',category:'全体／魔術',desc:'自動：グレード2以下の魔術が出現しやすくなる。'},
  {id:'gp_magic_2',name:'魔術の知識　Lv.2',rarity:2,grade:2,panelScope:'global',category:'全体／魔術',requires:'gp_magic_1',desc:'自動：グレード3以下の魔術が出現しやすくなる。'},
  {id:'gp_magic_3',name:'魔術の知識　Lv.3',rarity:3,grade:3,panelScope:'global',category:'全体／魔術',requires:'gp_magic_2',desc:'自動：グレード4以下の魔術が出現しやすくなる。'},
  {id:'gp_magic_4',name:'魔術の知識　Lv.4',rarity:4,grade:4,panelScope:'global',category:'全体／魔術',requires:'gp_magic_3',desc:'自動：グレード5以下の魔術が出現しやすくなる。'},
  {id:'gp_magic_5',name:'魔術の知識　Lv.5',rarity:5,grade:5,panelScope:'global',category:'全体／魔術',requires:'gp_magic_4',desc:'自動：グレード6以下の魔術が出現しやすくなる。'},
  {id:'gp_divine_1',name:'神術の知識　Lv.1',rarity:1,grade:1,panelScope:'global',category:'全体／神術',desc:'自動：グレード2以下の神術が出現しやすくなる。'},
  {id:'gp_divine_2',name:'神術の知識　Lv.2',rarity:2,grade:2,panelScope:'global',category:'全体／神術',requires:'gp_divine_1',desc:'自動：グレード3以下の神術が出現しやすくなる。'},
  {id:'gp_divine_3',name:'神術の知識　Lv.3',rarity:3,grade:3,panelScope:'global',category:'全体／神術',requires:'gp_divine_2',desc:'自動：グレード4以下の神術が出現しやすくなる。'},
  {id:'gp_divine_4',name:'神術の知識　Lv.4',rarity:4,grade:4,panelScope:'global',category:'全体／神術',requires:'gp_divine_3',desc:'自動：グレード5以下の神術が出現しやすくなる。'},
  {id:'gp_divine_5',name:'神術の知識　Lv.5',rarity:5,grade:5,panelScope:'global',category:'全体／神術',requires:'gp_divine_4',desc:'自動：グレード6以下の神術が出現しやすくなる。'},
  {id:'gp_master',name:'戦技マスター',rarity:4,grade:4,panelScope:'global',category:'全体／魔術、武術、神術',desc:'自動：グレード4以下の武術、魔術、神術が出現しやすくなる。'},
  {id:'gp_heal_1',name:'治療',rarity:1,grade:1,panelScope:'global',category:'全体／魔術',healPct:0.1,desc:'終戦：HPを10%回復する。'},
  {id:'gp_training_1',name:'修練　Lv.1',rarity:1,grade:1,panelScope:'global',category:'全体／成長',training:1,desc:'終戦：+1/+1を得る。'},
  {id:'gp_training_2',name:'修練　Lv.2',rarity:1,grade:2,panelScope:'global',category:'全体／成長',training:2,desc:'終戦：+2/+2を得る。'},
  {id:'gp_training_3',name:'修練　Lv.3',rarity:2,grade:3,panelScope:'global',category:'全体／成長',training:3,desc:'終戦：+3/+3を得る。'},
  {id:'gp_training_4',name:'修練　Lv.4',rarity:2,grade:4,panelScope:'global',category:'全体／成長',training:4,desc:'終戦：+4/+4を得る。'},
  {id:'gp_training_5',name:'修練　Lv.5',rarity:3,grade:5,panelScope:'global',category:'全体／成長',training:5,desc:'終戦：+5/+5を得る。'},
];

function makeGlobalPanel(idOrName){
  const def=GLOBAL_PANEL_POOL.find(p=>p.id===idOrName||p.name===idOrName);
  if(!def) return null;
  const c=clone(def);
  c.type='global-panel';
  c.kind='panel';
  c.equip=true;
  c.noRewardUse=true;
  c._buyPrice=calcBuyPrice(c);
  return c;
}

function hasGlobalPanel(id){
  return !!(G.globalPanels||[]).some(p=>p&&p.id===id);
}

function drawGlobalPanel(){
  const owned=new Set((G.globalPanels||[]).filter(Boolean).map(p=>p.id));
  const pool=GLOBAL_PANEL_POOL.filter(p=>!owned.has(p.id)&&(!p.requires||owned.has(p.requires)||Math.random()<0.18));
  if(!pool.length) return null;
  const weighted=[];
  pool.forEach(p=>{
    let w=Math.max(1,7-(p.rarity||1));
    if(p.requires&&!owned.has(p.requires)) w=1;
    for(let i=0;i<w;i++) weighted.push(p);
  });
  return makeGlobalPanel(randFrom(weighted).id);
}

function _globalKnowledgeLevel(kind){
  const panels=(G.globalPanels||[]).filter(Boolean);
  const prefix=kind==='武術'?'gp_martial_':kind==='魔術'?'gp_magic_':kind==='神術'?'gp_divine_':'';
  let lv=0;
  panels.forEach(p=>{
    if(prefix&&p.id&&p.id.startsWith(prefix)) lv=Math.max(lv,p.grade||1);
    if(p.id==='gp_master'&&(kind==='武術'||kind==='魔術'||kind==='神術')) lv=Math.max(lv,4);
  });
  return lv;
}

function _panelDiscipline(card){
  const s=String(card?.category||card?.classification||card?.discipline||card?.分類||'');
  if(s.includes('武術')) return '武術';
  if(s.includes('魔術')) return '魔術';
  if(s.includes('神術')) return '神術';
  return '';
}

function _applyGlobalKnowledgeWeight(pool){
  const out=[];
  pool.forEach(card=>{
    out.push(card);
    const kind=_panelDiscipline(card);
    const lv=kind?_globalKnowledgeLevel(kind):0;
    if(lv>0&&(card.grade||1)<=lv+1){
      for(let i=0;i<lv;i++) out.push(card);
    }
  });
  return out;
}

// 売却払い戻し
function cardRefund(card){
  if(!card) return 0;
  if(card._isChar) return 1;
  return 0; // 指輪・杖・消耗品はすべてゴールド還元なし
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

function drawEquipment(n=1, maxGrade){
  return drawPanel(n, maxGrade);
}

// ── キャラクタープールから N 体抽選 ────────────────

function drawCharacters(n){
  if(isExperimentalAppearanceMode()){
    const pool=UNIT_POOL.filter(u=>{
      if(!u.id||u.id==='c_golem') return false;
      if(u.enemyOnly) return false;
      if(u.unique) return false;
      if(u.rarity===-1) return false;
      if((u.grade||1)>5) return false;
      if(u.rarity===3&&G._seenRarity3&&G._seenRarity3.has(u.id)) return false;
      return true;
    });
    const res=_drawExperimentalFromPool(pool,n,def=>{
      const card=clone(def);
      card._isChar=true;
      card._buyPrice=calcBuyPrice(card);
      // マミー効果：不死キャラの表示ATKにボーナスを反映（makeUnitFromDef での二重加算を防ぐため _bonusApplied フラグを付ける）
      if(unitMatchesRace(card,'不死')&&G._undeadHpBonus){ card.atk+=G._undeadHpBonus; card.baseAtk=(card.baseAtk||card.atk)+G._undeadHpBonus; card._bonusApplied=true; }
      // スペクター効果：不死キャラの表示ATK/HPにボーナスを反映
      if(unitMatchesRace(card,'不死')&&G._specterBonus){ card.atk+=G._specterBonus; card.baseAtk=(card.baseAtk||card.atk)+G._specterBonus; card.hp+=G._specterBonus; card.maxHp+=G._specterBonus; card._bonusApplied=true; }
      // ジャック・オ・ランタン効果：全キャラのHP+ボーナスを反映
      if(G._futureCharAtkBonus){ const _prevAtk=card.atk||0; card.atk=_prevAtk+G._futureCharAtkBonus; card.baseAtk=(card.baseAtk!=null?card.baseAtk:_prevAtk)+G._futureCharAtkBonus; }
      if(G._jackBonus){ const _baseMaxHp=card.maxHp||card.hp; card.hp+=G._jackBonus; card.maxHp=_baseMaxHp+G._jackBonus; }
      applyRaceBuffsToRewardCard(card);
      return card;
    });
    res.forEach(c=>{ if(c.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(c.id)) G._seenRarity3.add(c.id); });
    return res;
  }
  // 報酬グレードと一致するグレードのみ出現（ネームドは除外）
  const targetGrade=G.rewardGrade||1;
  const pool=UNIT_POOL.filter(u=>{
    if(!u.id||u.id==='c_golem') return false;
    if(u.enemyOnly) return false;
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
    if(unitMatchesRace(card,'不死')&&G._undeadHpBonus){ card.atk+=G._undeadHpBonus; card.baseAtk=(card.baseAtk||card.atk)+G._undeadHpBonus; card._bonusApplied=true; }
    // スペクター効果：不死キャラの表示ATK/HPにボーナスを反映
    if(unitMatchesRace(card,'不死')&&G._specterBonus){ card.atk+=G._specterBonus; card.baseAtk=(card.baseAtk||card.atk)+G._specterBonus; card.hp+=G._specterBonus; card.maxHp+=G._specterBonus; card._bonusApplied=true; }
    // ジャック・オ・ランタン効果：全キャラのHP+ボーナスを反映
    if(G._futureCharAtkBonus){ const _prevAtk=card.atk||0; card.atk=_prevAtk+G._futureCharAtkBonus; card.baseAtk=(card.baseAtk!=null?card.baseAtk:_prevAtk)+G._futureCharAtkBonus; }
    if(G._jackBonus){ const _baseMaxHp=card.maxHp||card.hp; card.hp+=G._jackBonus; card.maxHp=_baseMaxHp+G._jackBonus; }
    applyRaceBuffsToRewardCard(card);
    res.push(card);
  }
  res.forEach(c=>{ if(c.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(c.id)) G._seenRarity3.add(c.id); });
  return res;
}

// ── アイテムプールから N 個抽選 ─────────────────

function drawItems(n, maxGrade){
  return drawPanel(n, maxGrade);
}

// ── 報酬 5 枚（キャラ3体 + 杖1 + アイテム1）──────

function _drawByType(type, n, maxGrade){
  return drawPanel(n, maxGrade);
  if(isExperimentalAppearanceMode()&&maxGrade==null){
    const pool=SPELL_POOL.filter(s=>{
      if(!s.id||s.starterOnly) return false;
      if(s.rarity===-1) return false;
      if(s.rarity===4) return false; // rarity4は洞窟ボーナス専用
      if(s.type!==type) return false;
      if((s.grade||1)>5) return false;
      if(s.unique&&G.seenWands&&G.seenWands.includes(s.id)) return false;
      if(s.rarity===3&&G._seenRarity3&&G._seenRarity3.has(s.id)) return false;
      return true;
    });
    const res=_drawExperimentalFromPool(pool,n,def=>{
      const c=clone(def);
      if(c.type==='wand'){ const uses=c.baseUses||(c.baseUsesRange?randi(c.baseUsesRange[0],c.baseUsesRange[1]):randUses()); c.usesLeft=uses; c._maxUses=uses; }
      c._buyPrice=calcBuyPrice(c);
      return c;
    });
    res.forEach(c=>{ if(c.unique&&!G.seenWands.includes(c.id)) G.seenWands.push(c.id); if(c.rarity===3&&G._seenRarity3&&!G._seenRarity3.has(c.id)) G._seenRarity3.add(c.id); });
    return res;
  }
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
  while(res.length<n&&pool.length>0){
    const weighted=_applyGlobalKnowledgeWeight(pool);
    const picked=randFrom(weighted);
    const i=pool.indexOf(picked);
    res.push(pool.splice(i>=0?i:Math.floor(Math.random()*pool.length),1)[0]);
  }
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
  const c=drawPanel(1, maxGrade||4)[0]||null;
  if(!c) return null;
  c._buyPrice=0;
  c._isTreasure=true;
  return c;
}

// 祭壇効果①：次の報酬に同種のユニークを1枚含める
function _applyUniqueSlot(res){
  const targetGrade=isExperimentalAppearanceMode()?5:(G.rewardGrade||1);
  const allyIds=G.allies.filter(Boolean).map(a=>a.id);
  const uChars=UNIT_POOL.filter(u=>u.unique&&!u.enemyOnly&&u.id!=='c_golem'&&u.rarity!==-1&&(u.grade||1)<=targetGrade&&!allyIds.includes(u.id));
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
  const appraiser=G.allies&&G.allies.some(a=>a&&a.hp>0&&typeof unitHasEquip==='function'&&unitHasEquip(a,'equip_appraiser'));
  const baseGrade=G.rewardGrade||1;
  const boostGrade=Math.min(5,baseGrade+1);
  const res=drawPanel(3, appraiser?boostGrade:undefined);
  if(G._nextRewardUniqueSlot){
    G._nextRewardUniqueSlot=false;
  }
  return res;
}

// 指定グレードのキャラを1体抽選（グレード確定枠用）
function drawCharacterOfGrade(grade){
  const pool=UNIT_POOL.filter(u=>!u.starterOnly&&!u.enemyOnly&&u.rarity!==-1&&u.id!=='c_golem'&&!u.unique&&(u.grade||1)===grade&&!(u.rarity===3&&G._seenRarity3&&G._seenRarity3.has(u.id)));
  if(!pool.length) return null;
  const def=randFrom(pool);
  const c=clone(def);
  c._isChar=true;
  c._buyPrice=calcBuyPrice(c);
  applyRaceBuffsToRewardCard(c);
  if(c.rarity===3&&G._seenRarity3) G._seenRarity3.add(c.id);
  return c;
}

// ── 消耗品のみ抽選（休息所・インプ用）──────────────

function drawConsumable(maxGrade){
  return drawPanel(1, maxGrade!=null?maxGrade:99)[0]||null;
}

// ── ユニーク指輪（エリート撃破報酬）─────────────────

function drawUniqueRing(){
  return typeof drawGlobalPanel==='function'?drawGlobalPanel():drawPanel(1,99)[0]||null;
}
