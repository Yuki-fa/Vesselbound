// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, units.js, spells.js
// ═══════════════════════════════════════

let G={};

// キーワード説明文マップ（loader.js で effect_id シートから上書き可）
// シート未読み込み時のフォールバック説明文
// シート「敵キーワード」の説明文をフォールバックとして保持（loader.js で上書き）
const KW_DESC_MAP={
  '守護':     'このキャラクターが生存している間、仲間全員が加護状態になる。',
  '封印':     '行動不能。このキャラクターはターンをスキップする。',
  '再生':     'ターン終了時にライフをX回復する。',
  '狩われ':   '敵が優先的にこのキャラクターを攻撃する。',
  '侵食':     'このキャラクターからダメージを受けたキャラクターのHPを永続的に減少させる。',
  '反撃':     'このキャラクターが攻撃を受けて生き残った場合、相手にこのキャラクターのパワーに等しいダメージを与える。',
  '二段攻撃': '攻撃後、再攻撃する。一回目で対象が死んだ場合、他の敵に攻撃する。',
  '三段攻撃': '攻撃後、2回再攻撃する。',
  '三方向攻撃': 'このキャラクターは隣接する3体を対象に攻撃する。それぞれの反撃を受ける。',
  '全体攻撃': 'このキャラクターはすべての相手を対象に攻撃する。',
  '加護':     'このキャラクターはいかなる敵の杖の効果も受けない。',
  'シールド': 'ダメージを一度だけ無効化する。重複しない。',
  'A・シールド': '戦闘開始時、ダメージを一度だけ無効化するシールドを得る。重複しない。',
  '狩人':     'このキャラクターは最後尾ではなく、常に最もライフの低いキャラクターを優先的に攻撃する。',
  '即死':     'このキャラクターからダメージを受けたキャラクターは即死する。',
  '標的':     'このキャラクターは最後尾のキャラクターよりも優先して攻撃目標になる。',
  '隠密':     '敵に狙われない。ただし加護持ちには無効。',
  '成長':     '戦闘開始時、+X/+Xを得る。',
  '結束':     '戦闘開始時、全ての仲間が+X/+Xを得る。',
  '毒牙':     'このキャラクターからダメージを受けたキャラクターに毒Xを付与する。既に毒状態なら加算される。（ライフ-X/T）',
  '邪眼':     'このキャラクターからダメージを受けたキャラクターのパワーはX減少する。',
  '呪詛':     'このキャラクターからダメージを受けたキャラクターに破滅Xを付与する。既に破滅状態なら加算される。破滅10になると即死する。',
  '魂喰':     '攻撃時、プレイヤーのソウルをX消費する。消費した場合、以後の全ての仲間が+X/+Xを得る。',
  '魂喰らい': '攻撃時、Xソウルを消費して自身がATK/HP+Xを得る。',
  'エリート': 'エリート敵。撃破時に追加報酬が得られる。',
  'ボス':     'ボス敵。',
  'アーティファクト': 'このキャラクターはソウルを持たない。',
  'リーダー': '存在する間、他の仲間全員のATKとHPを強化する。',
  'パワーブレイク':'命中した相手のATKを大幅に下げる（1度のみ）。',
};

const uid      = ()    => '_'+Math.random().toString(36).slice(2,8);
const randFrom = a     => a[Math.floor(Math.random()*a.length)];
const randi    = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const clone    = o     => JSON.parse(JSON.stringify(o));

function rand(){ return Math.random(); }

const SHEET_ITEM_CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vT_HpUfZzaJVGlJQVCfNYBxSB0_iGURFhWk-3-aCASz5ug5vGkI3-YisUrUAKqxvw/pub?gid=301126265&single=true&output=csv';
const SHEET_RACE_CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vT_HpUfZzaJVGlJQVCfNYBxSB0_iGURFhWk-3-aCASz5ug5vGkI3-YisUrUAKqxvw/pub?gid=905675155&single=true&output=csv';

const RACE_DEFS_BY_NAME={
  '人間':{race:'人間',totalSlots:6,itemSlots:3,ringSlots:2,weight:3,fixedName:'パンチ',fixedPower:0,growth:[{hp:3,atk:2,w:40},{hp:1,atk:3,w:40},{hp:5,atk:1,w:20}]},
  '亜人':{race:'亜人',totalSlots:7,itemSlots:5,ringSlots:1,weight:3,fixedName:'パンチ',fixedPower:0,growth:[{hp:2,atk:1,w:40},{hp:0,atk:2,w:40},{hp:4,atk:0,w:20}]},
  '機械':{race:'機械',totalSlots:8,itemSlots:7,ringSlots:0,weight:3,fixedName:'パンチ',fixedPower:0,growth:[{hp:3,atk:0,w:40},{hp:1,atk:1,w:40},{hp:0,atk:2,w:20}]},
  '不死人':{race:'不死人',totalSlots:7,itemSlots:3,ringSlots:3,weight:3,fixedName:'噛みつき',fixedPower:0,growth:[{hp:2,atk:0,w:40},{hp:0,atk:1,w:40},{hp:1,atk:1,w:20}]},
  '不死':{race:'不死',totalSlots:7,itemSlots:3,ringSlots:3,weight:3,fixedName:'噛みつき',fixedPower:0,growth:[{hp:2,atk:0,w:40},{hp:0,atk:1,w:40},{hp:1,atk:1,w:20}]},
  '蟲':{race:'蟲',totalSlots:5,itemSlots:3,ringSlots:1,weight:3,fixedName:'噛みつき',fixedPower:0,growth:[{hp:4,atk:2,w:40},{hp:2,atk:3,w:40},{hp:0,atk:4,w:20}]},
  '悪魔':{race:'悪魔',totalSlots:6,itemSlots:4,ringSlots:1,weight:5,fixedName:'噛みつき',fixedPower:0,growth:[{hp:4,atk:1,w:40},{hp:2,atk:2,w:40},{hp:0,atk:3,w:20}]},
  '精霊':{race:'精霊',totalSlots:6,itemSlots:4,ringSlots:1,weight:4,fixedName:'切り裂き',fixedPower:0,growth:[{hp:4,atk:1,w:40},{hp:2,atk:2,w:40},{hp:6,atk:0,w:20}]},
  '異形':{race:'異形',totalSlots:8,itemSlots:5,ringSlots:1,weight:4,fixedName:'切り裂き',fixedPower:0,growth:[{hp:1,atk:0,w:40},{hp:0,atk:1,w:40},{hp:1,atk:1,w:20}]},
  '竜':{race:'竜',totalSlots:6,itemSlots:3,ringSlots:2,weight:12,fixedName:'切り裂き',fixedPower:0,growth:[{hp:5,atk:1,w:40},{hp:3,atk:2,w:40},{hp:4,atk:2,w:20}]},
};
const ITEM_DEFS_BY_NAME={};

function parseCsvRows(text){
  const rows=[]; let row=[], cell='', q=false;
  for(let i=0;i<String(text||'').length;i++){
    const ch=text[i], nx=text[i+1];
    if(q){
      if(ch==='"'&&nx==='"'){ cell+='"'; i++; }
      else if(ch==='"') q=false;
      else cell+=ch;
    } else if(ch==='"') q=true;
    else if(ch===','){ row.push(cell); cell=''; }
    else if(ch==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; }
    else if(ch!=='\r') cell+=ch;
  }
  row.push(cell); rows.push(row);
  return rows;
}
function sheetNum(v,fallback=0){
  const s=String(v??'').trim();
  if(!s||s==='-'||s==='X') return fallback;
  const n=Number(s.replace(/[^\d.-]/g,''));
  return Number.isFinite(n)?n:fallback;
}
function sheetSlug(s){
  const raw=String(s||'item').trim().toLowerCase().replace(/\s+/g,'_');
  const ascii=raw.replace(/[^\w-]/g,'');
  return ascii||encodeURIComponent(raw).replace(/%/g,'').toLowerCase();
}
function sheetRarityToGrade(r){
  const s=String(r||'').trim();
  if(/Legendary|SR|L/i.test(s)) return 4;
  if(/Epic|Rare|R/i.test(s)) return 3;
  if(/Uncommon|UC/i.test(s)) return 2;
  return 1;
}
function normalizeSheetItem(row){
  const name=String(row['カード名']||'').trim();
  if(!name) return null;
  const major=String(row['大分類']||'').trim();
  const effect=String(row['効果']||'').trim();
  const atkRaw=String(row['攻撃力']||'').trim();
  const durRaw=String(row['耐久度']||'').trim();
  const isWeapon=major==='武器'||major==='杖';
  const isRing=major==='指輪'||major==='リング';
  const type=isRing?'ring':isWeapon?'weapon':major==='消耗品'?'consumable':major==='盾'?'shield':major==='防具'?'armor':'item';
  const def={
    id:`sheet_${sheetSlug(name)}`,
    name,
    type,
    sheetType:major,
    subtype:String(row['小分類']||'').trim(),
    rarity:sheetRarityToGrade(row['レアリティ']),
    grade:sheetRarityToGrade(row['レアリティ']),
    power:atkRaw==='X'?'durability':sheetNum(atkRaw,0),
    baseUses:sheetNum(durRaw, type==='weapon'?1:0),
    weight:sheetNum(row['重量'],0),
    slotSize:Math.max(1,sheetNum(row['合成枠'],1)),
    desc:effect||String(row['備考']||'').trim(),
    needsEnemy:type==='weapon',
    _sheetBacked:true,
  };
  if(type==='ring') def.kind='passive';
  if(!def.baseUses&&type==='weapon') def.baseUses=1;
  if(type==='weapon'){
    if(/ツイン/.test(effect)) def.weaponMode='twin';
    if(/オール/.test(effect)) def.weaponMode='all';
    if(/トリプル/.test(effect)) def.weaponMode='triple';
    if(/二段攻撃/.test(effect)){ def.repeat=2; def.weaponKeyword='double'; }
    if(/三段攻撃/.test(effect)){ def.repeat=3; def.weaponKeyword='triple_hit'; }
    if(/装甲8/.test(effect)) def.weaponKeyword='armor8';
    if(/毒/.test(effect)) def.weaponKeyword='poison20';
    if(/生命吸収/.test(effect)) def.weaponKeyword='lifesteal';
    if(/即死/.test(effect)) def.weaponKeyword='instant';
    if(/ソウルを1得る/.test(effect)) def.lethalEffect='soul1';
    if(/耐久度が減らない/.test(effect)) def.lethalEffect='no_durability_loss';
    if(/攻撃力も同じだけ下げる/.test(effect)) def.weaponKeyword='lower_atk_dealt';
    if(/対象がランダム/.test(effect)) def.weaponMode='random_any';
    if(/仲間全体のパワー/.test(effect)) def.weaponKeyword='party_atk1';
  }
  return def;
}
function applySheetItemDefinitions(csv){
  const rows=parseCsvRows(csv);
  let headers=null;
  rows.forEach(cols=>{
    if(cols.includes('カード名')&&cols.includes('大分類')){ headers=cols; return; }
    if(!headers) return;
    const row={};
    headers.forEach((h,i)=>{ row[h]=cols[i]; });
    const def=normalizeSheetItem(row);
    if(!def) return;
    if(ITEM_DEFS_BY_NAME[def.name]) return;
    ITEM_DEFS_BY_NAME[def.name]=def;
    if(typeof SPELL_POOL==='undefined') return;
    const existing=SPELL_POOL.find(s=>s.name===def.name);
    if(existing) Object.assign(existing,def,{id:existing.id||def.id,effect:existing.effect||def.effect});
    else SPELL_POOL.push(def);
  });
}
function applySheetRaceDefinitions(csv){
  const rows=parseCsvRows(csv);
  const headerIdx=rows.findIndex(r=>r.includes('種族')&&r.some(c=>String(c).includes('合計スロット')));
  const headers=headerIdx>=0?rows[headerIdx]:rows.shift()||[];
  const dataRows=headerIdx>=0?rows.slice(headerIdx+1):rows;
  const hFind=key=>headers.find(h=>String(h).includes(key))||key;
  const parseGrowth=s=>{
    const [hp,atk]=String(s||'').split('/').map(v=>sheetNum(v,0));
    return {hp,atk,w:0};
  };
  dataRows.forEach(cols=>{
    const row={};
    headers.forEach((h,i)=>{ row[h]=cols[i]; });
    const race=String(row[hFind('種族')]||'').trim();
    if(!race) return;
    const g1=parseGrowth(row[hFind('パターン1')]); g1.w=40;
    const g2=parseGrowth(row[hFind('パターン2')]); g2.w=40;
    const g3=parseGrowth(row[hFind('パターン3')]); g3.w=20;
    RACE_DEFS_BY_NAME[race]={
      race,
      totalSlots:sheetNum(row[hFind('合計スロット')],6),
      itemSlots:sheetNum(row[hFind('アイテムスロット')],4),
      ringSlots:sheetNum(row[hFind('リングスロット')],1),
      weight:sheetNum(row[hFind('重量')],RACE_DEFS_BY_NAME[race]?.weight||3),
      fixedName:String(row[hFind('固定装備')]||'パンチ').replace(/[（）()]/g,'').trim()||'パンチ',
      fixedPower:sheetNum(row[hFind('固定装備 性能')]||row[hFind('固定装備 威力')],0),
      fixedEffect:String(row[hFind('固定装備 効果')]||'').trim(),
      growth:[g1,g2,g3],
    };
  });
}
function loadSheetDefinitions(){
  if(typeof fetch!=='function'||loadSheetDefinitions._started) return;
  loadSheetDefinitions._started=true;
  fetch(SHEET_RACE_CSV_URL).then(r=>r.text()).then(applySheetRaceDefinitions).catch(()=>{});
  fetch(SHEET_ITEM_CSV_URL).then(r=>r.text()).then(applySheetItemDefinitions).catch(()=>{});
}
function getRaceLoadout(race){
  const races=String(race||'人間').split(/[／/、,，\s]+/).filter(Boolean);
  const cfg=races.map(r=>RACE_DEFS_BY_NAME[r]).find(Boolean)||RACE_DEFS_BY_NAME['人間'];
  return {
    itemSlots:cfg.itemSlots,
    ringSlots:cfg.ringSlots,
    weight:cfg.weight,
    fixed:{name:cfg.fixedName||'パンチ',power:cfg.fixedPower||0,desc:cfg.fixedEffect||''},
  };
}
function expToNextLevel(unit){
  return 10;
}
function getRaceGrowthPatterns(race){
  const races=String(race||'人間').split(/[／/、,，\s]+/).filter(Boolean);
  const cfg=races.map(r=>RACE_DEFS_BY_NAME[r]).find(Boolean)||RACE_DEFS_BY_NAME['人間'];
  return cfg.growth||RACE_DEFS_BY_NAME['人間'].growth;
}
function rollRaceGrowth(unit){
  const patterns=getRaceGrowthPatterns(unit&&unit.race);
  const total=patterns.reduce((s,p)=>s+(p.w||1),0)||1;
  let roll=Math.random()*total;
  for(const p of patterns){ roll-=p.w||1; if(roll<=0) return p; }
  return patterns[0]||{hp:0,atk:0};
}
function grantExpToSurvivingAllies(exp){
  if(!exp||exp<=0) return;
  log(`戦闘経験値 ${exp} を生存中の味方全員が獲得`,'gold');
  (G.allies||[]).forEach(unit=>{
    if(!unit||unit.hp<=0||unit._isSoul||unit._isObject) return;
    unit.exp=(unit.exp||0)+exp;
    let leveled=0;
    while(unit.exp>=expToNextLevel(unit)){
      unit.exp-=expToNextLevel(unit);
      unit.level=(unit.level||1)+1;
      const g=rollRaceGrowth(unit);
      const atk=g.atk||0, hp=g.hp||0;
      if(atk){ unit.atk+=atk; unit.baseAtk=(unit.baseAtk||0)+atk; }
      if(hp){ unit.hp+=hp; unit.maxHp=(unit.maxHp||unit.hp)+hp; }
      leveled++;
      log(`${unit.name} Lv${unit.level}：+${atk}/+${hp}`,'good');
    }
    if(!leveled) log(`${unit.name}：経験値+${exp}`,'sys');
  });
}
function getUnitOwnedItems(unit){
  if(!unit) return [];
  const inv=Array.isArray(unit.inventory)?unit.inventory:[];
  const rings=Array.isArray(unit.rings)?unit.rings:[];
  const eq=Array.isArray(unit.equipment)?unit.equipment:[];
  return [...inv,...rings,...eq].filter(c=>c&&!isOccupiedSlot(c));
}
function getCharacterActionWeight(unit){
  const cfg=getRaceLoadout(unit&&unit.race);
  return (cfg.weight||0)+getUnitOwnedItems(unit).reduce((sum,item)=>sum+(Number(item.weight)||0),0);
}
function getUnitDisplayAtk(unit){
  if(!unit) return 0;
  const base=unit.atk||0;
  if(G._previewWeaponPower&&G._previewWeaponPower.unitId===unit.id) return base+(G._previewWeaponPower.power||0);
  const actions=Array.isArray(unit.enemyActions)?unit.enemyActions:[];
  const attackBonuses=actions
    .map(a=>a&&a.item)
    .filter(item=>item&&item.effect!=='enemy_heal_wounded'&&item.effect!=='enemy_ancient_power'&&(item.usesLeft===undefined||item.usesLeft>0))
    .map(item=>Number(item.power)||0);
  return base+(attackBonuses.length?Math.max(...attackBonuses):0);
}
function getManualAllyActionOrder(){
  return (G.allies||[])
    .map((unit,idx)=>({unit,idx,weight:getCharacterActionWeight(unit)}))
    .filter(ref=>ref.unit&&ref.unit.hp>0&&!ref.unit._isSoul&&!ref.unit._isObject)
    .sort((a,b)=>a.weight-b.weight||a.idx-b.idx);
}
function getManualBattleActionOrder(){
  const allies=(G.allies||[])
    .map((unit,idx)=>({side:'ally',unit,idx,weight:getCharacterActionWeight(unit)}))
    .filter(ref=>ref.unit&&ref.unit.hp>0&&!ref.unit._isSoul&&!ref.unit._isObject);
  const enemies=(G.enemies||[])
    .map((unit,idx)=>({side:'enemy',unit,idx,weight:getCharacterActionWeight(unit)}))
    .filter(ref=>ref.unit&&ref.unit.hp>0&&!ref.unit._isObject);
  return [...allies,...enemies].sort((a,b)=>a.weight-b.weight||a.idx-b.idx||(a.side==='enemy'?-1:1));
}
function isManualActiveUnit(unit){
  const active=G._manualTurnActive;
  if(!active||!unit) return false;
  return active.unitId===unit.id;
}
if(typeof window!=='undefined') loadSheetDefinitions();

function gradeStr(g){
  const n=Math.min(Math.max(g||1,1),MAX_GRADE);
  return '★'.repeat(n);
}

function initState(){
  G={
    floor:1, gold:0,
    // ── 盤面（6スロット固定・HP持続）──
    allies: Array(6).fill(null),
    enemies:[],
    // ── プレイヤー装備 ──
    rings:   Array(4).fill(null), // 指輪スロット（初期2枠・最大4枠）
    ringSlots: 2,
    // ── 手札（杖＋消耗品混合・最大7枠）──
    spells:  Array(5).fill(null),
    handSlots: 5,
    // ── 状態 ──
    phase:'init',
    selectedAllyIdx:-1,
    _unitLoadoutInitialized:false,
    actionsPerTurn:1, actionsLeft:0,
    turn:0, earnedGold:0,
    moveMasks:[], moveMaskLanes:[], visibleMoves:[],
    fogNext:false, prevNodeType:'battle',
    spreadActive:false, spreadMult:0,
    _isEliteFight:false, _eliteIdx:-1, _eliteKilled:false, _bossSlot:0,
    _usedNamedElite:new Set(), _usedNamedRest:new Set(),
    _seenLegendRings:new Set(),
    _retryFloor:false,
    battleCounters:{damage:0,deaths:0},
    _pendingBattleExp:0,
    // ── 魔術レベル（亜人キャラ効果用）──
    magicLevel:1,
    // ── マミー効果：不死ATK補正（累積） ──
    _undeadHpBonus:0,
    // ── ペリュトン効果：キャラ効果召喚ユニットATK補正（累積） ──
    _grimalkinBonus:0,  // 旧: グリマルキン / 現: ペリュトン 還魂トリガー
    // ── スペクター効果：今後の不死キャラATK+HP補正（累積） ──
    _specterBonus:0,
    // ── ジャック・オ・ランタン効果：今後のキャラHP補正（累積） ──
    _jackBonus:0,
    // ── バンシー効果：今後の全キャラATK補正（累積） ──
    _futureCharAtkBonus:0,
    // ── グレムリン効果：フェイズごとの無料アイテム使用 ──
    _freeItemPhase:null,
    _freeItemUsed:false,
    _pendingFechtRevives:[],
    // ── 種族別の今後商談キャラ補正（{種族:{atk,hp}}） ──
    raceBuffs:{},
    // ── ミノタウロス効果：グレードアップコスト削減（累積） ──
    _gradeUpCostBonus:0,
    // ── ファミリア効果：今回の行商で最初の購入済みフラグ ──
    _familiarUsed:false,
    // ── 宝箱・撤退・特殊マス連続抑制 ──
    _prevWasRest:0,     // 直前が湖の畔→次の2戦闘で湖の畔を非表示（カウントダウン）
    _prevWasSmithy:0,   // 直前が洞窟→次の2戦闘で洞窟を非表示（カウントダウン）
    _pendingTreasure:false,
    _pendingTreasureBySlot:{},
    _pendingEliteChest:false,
    _retreated:false,
    _retreatTargetNodeType:null,
    _bonusAction:0,
    _minotaurBonus:0,
    // ── 特殊マスボーナス ──
    _extraBattleMult:1.0,  // 洞窟/池ノードで 1.2x
    _battleAutoMode:false,
    _openingIntervention:false,
    _manualTurnQueue:[],
    _manualTurnPos:0,
    _manualTurnActive:null,
    _pendingCaveBonus:false,  // 洞窟：rarity4アイテム1つ追加
    _pendingPondBonus:false,  // 池：rarity≤2指輪2つ追加
    _isTreasurePhase:false,   // 宝箱回収中フラグ（UI操作ロック用）
    _soulIncomeBonus:0,    // 魔神の秘薬：戦闘終了時ソウル追加
    // ── 敵オーナーシステム ──
    bossRings:[],         // 敵オーナーが装備している指輪
    bossHand:[],          // 敵オーナーの手札（杖・アイテム）
    enemyMagicLevel:0,       // 敵オーナーの魔術レベル（FLOOR_DATA.magicLevel から設定）
    _enemyHandDynamic:false, // true = 戦闘中に動的取得した手札（手札3・指輪非表示）
    _enemySpreadActive:false,// 敵の spread 効果が有効中
    masterHand:[],  // 報酬フェイズのマスター手札
    masterRings:[],  // 報酬フェイズの購入可能指輪
    hasGoldenDrop:false,
    baseIncome:1,
    _nextRewardUniqueSlot:false,
    // ── 報酬グレード ──
    rewardGrade:1,
    rewardGradeUpCount:0,
    rewardCharCount:3,
    _bossJustDefeated:false,
    // ── 報酬 ──
    rerollCount:0,
    // ── 秘術（互換性のため残す）──
    arcana:null, arcanaUsed:false,
    arcanaCarryGold:0, arcanaForceNode:false, arcanaTrustCount:0,
    seenWands:[],
    _seenRarity3:new Set(),
    bannedRings:[],
    buffAdjBonuses:{},
    rewardCards:6,
    maxRewardCards:6,
    // ── 敵永続強化（魂喰X・マミー敵）──
    enemyPermanentBonus:{atk:0,hp:0},
    enemyUndeadAtkBonus:0,
    _lesserDemonDiscount:0,
    // ── ワールドマップ進行 ──
    worldMap:null,
    mapIndex:1,
    mapTurn:1,
    mapTurnLimit:30,
    mapPosition:null,
    mapSeen:{},
    _mapBattleCount:0,
    _mapNodeType:null,
    _mapForceElite:false,
    _mapForceBoss:false,
    _fromWorldMapShop:false,
    _shopGradeWeights:[90,7,2.5,0.5],
    _altarUsedCount:0,
    mapInventory:[],
    _mapInventoryOpen:false,
    _hoverWeaponCard:null,
    _selectedWeaponSlot:null,
  };

  // 初期キャラクター：ミラ / アドラ（手動戦闘用）
  const miraDef = {...(UNIT_POOL.find(u=>u.id==='c_mira')||{}),id:'c_mira',name:'ミラ',race:'人間',grade:1,atk:6,hp:34,cost:0,unique:false,starterOnly:true,icon:'🛡️',desc:''};
  const adraDef = {...(UNIT_POOL.find(u=>u.id==='c_adra')||{}),id:'c_adra',name:'アドラ',race:'悪魔',grade:1,atk:8,hp:40,cost:0,unique:false,starterOnly:true,icon:'🪓',desc:''};
  G.allies[0] = makeUnitFromDef(miraDef, undefined, true);
  G.allies[1] = makeUnitFromDef(adraDef, undefined, true);
  Object.assign(G.allies[0],{level:6,exp:0,atk:6,baseAtk:6,hp:34,maxHp:34,race:'人間'});
  Object.assign(G.allies[1],{level:8,exp:0,atk:8,baseAtk:8,hp:40,maxHp:40,race:'悪魔'});

  initializeUnitLoadouts();
  ensureUnitLoadout(G.allies[0]);
  ensureUnitLoadout(G.allies[1]);
  placeInventoryCard(G.allies[0].inventory, makeInventoryCardByName('ハルバード'));
  placeInventoryCard(G.allies[1].inventory, makeInventoryCardByName('フランキスカ'));
}

const BASIC_PUNCH_CARD={
  id:'basic_punch',
  name:'パンチ',
  type:'basic',
  effect:'punch',
  grade:1,
  needsEnemy:true,
  melee:true,
  noConsume:true,
  desc:'対象のキャラクター1体に、このキャラクターのパワーに等しいダメージを与える。'
};

function getCardSlotSize(card){
  return Math.max(1, Number(card?.slotSize||card?.slots||1)||1);
}
function isOccupiedSlot(card){ return !!(card&&card._occupied); }
function initializeUses(card){
  if(!card) return card;
  if((card.type==='wand'||card.type==='weapon')&&card.usesLeft===undefined){
    card.usesLeft=card.baseUses||1;
    card._maxUses=card.baseUses||card.usesLeft;
  }
  return card;
}
function makeInventoryCardByName(name){
  const def=ITEM_DEFS_BY_NAME[name]||SPELL_POOL.find(s=>s.name===name);
  return def?initializeUses(clone(def)):null;
}
function findInventorySpace(inv,card){
  if(!inv||!card) return -1;
  const size=getCardSlotSize(card);
  for(let i=0;i<=inv.length-size;i++){
    let ok=true;
    for(let j=0;j<size;j++){
      if(inv[i+j]){ ok=false; break; }
    }
    if(ok) return i;
  }
  return -1;
}
function placeInventoryCard(inv,card){
  if(!inv||!card) return false;
  const idx=findInventorySpace(inv,card);
  if(idx<0) return false;
  inv[idx]=initializeUses(card);
  const size=getCardSlotSize(card);
  for(let j=1;j<size;j++) inv[idx+j]={_occupied:true,parent:idx};
  return true;
}
function removeInventoryCardAt(inv,idx){
  if(!inv||!inv[idx]) return null;
  if(isOccupiedSlot(inv[idx])) idx=inv[idx].parent;
  const card=inv[idx];
  const size=getCardSlotSize(card);
  inv[idx]=null;
  for(let j=1;j<size;j++){
    if(inv[idx+j]&&inv[idx+j]._occupied&&inv[idx+j].parent===idx) inv[idx+j]=null;
  }
  return card;
}
const HUMAN_EQUIP_SLOTS=[
  {id:'rightArm',label:'右腕',accept:['weapon']},
  {id:'leftArm',label:'左腕',accept:['shield']},
  {id:'body',label:'胴体',accept:['armor']},
  {id:'ring1',label:'指輪1',accept:['ring']},
  {id:'ring2',label:'指輪2',accept:['ring']},
  {id:'amulet',label:'アミュレット',accept:['amulet']},
  {id:'free',label:'フリー',accept:['weapon','item']},
];
function isHumanUnit(unit){
  return !!unit&&String(unit.race||'').includes('人間');
}
function isHumanEquipmentMode(unit){
  return false;
}
function getHumanEquipSlotDefs(){
  return HUMAN_EQUIP_SLOTS;
}
function getHumanSlotDef(slot){
  if(typeof slot==='number') return HUMAN_EQUIP_SLOTS[slot]||null;
  return HUMAN_EQUIP_SLOTS.find(s=>s.id===slot)||null;
}
function getCardEquipCategory(card){
  if(!card) return null;
  if(card.equipCategory) return card.equipCategory;
  if(card.slotType) return card.slotType;
  if(card.type==='weapon'||card.type==='wand') return 'weapon';
  if(card.type==='shield'||card.kind==='shield') return 'shield';
  if(card.type==='armor'||card.kind==='armor') return 'armor';
  if(card.type==='amulet'||card.kind==='amulet') return 'amulet';
  if(card.type==='ring'||card.kind==='summon'||card.kind==='passive') return 'ring';
  if(card.type==='consumable'||card.type==='item') return 'item';
  return null;
}
function isTwoHandedWeapon(card){
  if(!card) return false;
  const text=[card.weaponClass,card.weaponType,card.subtype,card.category,card.equipType,card.name].filter(Boolean).join(' ');
  return !!(card.twoHanded||card.hands===2||card.type==='wand'||/大剣|杖|弓/.test(text));
}
function canEquipToHumanSlot(unit,slotIdx,card,ignoreIdx){
  if(!isHumanEquipmentMode(unit)||!card) return true;
  const def=getHumanSlotDef(slotIdx);
  if(!def) return false;
  const cat=getCardEquipCategory(card);
  if(!cat||!def.accept.includes(cat)) return false;
  const eq=unit.equipment||unit.inventory||[];
  const right=ignoreIdx===0?null:eq[0];
  const left=ignoreIdx===1?null:eq[1];
  if(def.id==='rightArm'&&isTwoHandedWeapon(card)&&left) return false;
  if(def.id==='leftArm'&&right&&isTwoHandedWeapon(right)) return false;
  if(def.id==='free'&&cat==='weapon'&&isTwoHandedWeapon(card)) return false;
  return true;
}
function getHumanEquippedRings(unit){
  if(!isHumanEquipmentMode(unit)) return [];
  const eq=unit.equipment||unit.inventory||[];
  return [eq[3],eq[4]].filter(Boolean);
}
function equipRingToSelectedHuman(card){
  const unit=typeof getSelectedAlly==='function'?getSelectedAlly():null;
  if(!isHumanEquipmentMode(unit)||!card) return -1;
  ensureHumanEquipment(unit);
  for(const idx of [3,4]){
    if(!unit.equipment[idx]&&canEquipToHumanSlot(unit,idx,card)){
      unit.equipment[idx]=initializeUses(card);
      if(typeof syncSelectedUnitLoadout==='function') syncSelectedUnitLoadout();
      return idx;
    }
  }
  return -1;
}
function ensureHumanEquipment(unit){
  if(!unit) return null;
  if(!Array.isArray(unit.equipment)){
    const oldItems=Array.isArray(unit.inventory)?unit.inventory.filter(c=>c&&!isOccupiedSlot(c)):[];
    const oldRings=Array.isArray(unit.rings)?unit.rings.filter(Boolean):[];
    unit.equipment=Array(HUMAN_EQUIP_SLOTS.length).fill(null);
    [...oldItems,...oldRings].forEach(card=>{
      const start=(getCardEquipCategory(card)==='ring')?3:0;
      for(let i=0;i<unit.equipment.length;i++){
        const idx=(start+i)%unit.equipment.length;
        if(!unit.equipment[idx]&&canEquipToHumanSlot(unit,idx,card)){
          unit.equipment[idx]=initializeUses(card);
          break;
        }
      }
    });
  }
  while(unit.equipment.length<HUMAN_EQUIP_SLOTS.length) unit.equipment.push(null);
  if(unit.equipment.length>HUMAN_EQUIP_SLOTS.length) unit.equipment.length=HUMAN_EQUIP_SLOTS.length;
  unit.equipment.forEach(c=>initializeUses(c));
  unit.inventory=unit.equipment;
  unit.inventorySlots=HUMAN_EQUIP_SLOTS.length;
  unit.rings=[];
  unit.ringSlots=0;
  return unit;
}
function getUnitFixedAction(unit){
  if(isHumanEquipmentMode(unit)) return null;
  const cfg=(typeof getRaceLoadout==='function')?getRaceLoadout(unit&&unit.race):null;
  return (cfg&&cfg.fixed)||BASIC_PUNCH_CARD;
}
function getUnitInventorySlots(unit){
  if(isHumanEquipmentMode(unit)) return HUMAN_EQUIP_SLOTS.length;
  if(!unit) return Math.max(1,G.handSlots||5);
  if(unit.inventorySlots!=null) return Math.max(1,unit.inventorySlots);
  const cfg=(typeof getRaceLoadout==='function')?getRaceLoadout(unit.race):null;
  return Math.max(1,(cfg&&cfg.itemSlots)||unit.handSlots||5);
}
function getUnitItemSlots(unit){
  if(isHumanEquipmentMode(unit)) return HUMAN_EQUIP_SLOTS.length;
  return Math.max(0,getUnitInventorySlots(unit)-1); // 左端のパンチを除く
}
function getUnitRingSlots(unit){
  if(isHumanEquipmentMode(unit)) return 0;
  if(!unit) return Math.max(0,G.ringSlots||2);
  if(unit.ringSlots!=null) return Math.max(0,unit.ringSlots);
  const cfg=(typeof getRaceLoadout==='function')?getRaceLoadout(unit.race):null;
  return Math.max(0,(cfg&&cfg.ringSlots)||2);
}
function ensureUnitLoadout(unit){
  if(!unit) return null;
  if(isHumanEquipmentMode(unit)) return ensureHumanEquipment(unit);
  const itemSlots=getUnitItemSlots(unit);
  if(!Array.isArray(unit.inventory)) unit.inventory=Array(itemSlots).fill(null);
  while(unit.inventory.length<itemSlots) unit.inventory.push(null);
  if(unit.inventory.length>itemSlots) unit.inventory.length=itemSlots;
  const ringSlots=getUnitRingSlots(unit);
  if(!Array.isArray(unit.rings)) unit.rings=Array(ringSlots).fill(null);
  while(unit.rings.length<ringSlots) unit.rings.push(null);
  if(unit.rings.length>ringSlots) unit.rings.length=ringSlots;
  unit.inventory.forEach(c=>initializeUses(c));
  unit.rings.forEach(c=>initializeUses(c));
  return unit;
}
function initializeUnitLoadouts(){
  const firstIdx=(G.allies||[]).findIndex(a=>a&&a.hp>0&&!a._isSoul);
  if(firstIdx<0) return;
  const first=G.allies[firstIdx];
  ensureUnitLoadout(first);
  if(!G._unitLoadoutInitialized){
    const items=(G.spells||[]).slice(0,getUnitItemSlots(first));
    const rings=(G.rings||[]).slice(0,getUnitRingSlots(first));
    first.inventory=Array(getUnitItemSlots(first)).fill(null);
    first.rings=Array(getUnitRingSlots(first)).fill(null);
    items.forEach((c,i)=>{ first.inventory[i]=c||null; });
    rings.forEach((c,i)=>{ first.rings[i]=c||null; });
    if(isHumanEquipmentMode(first)){
      first.equipment=first.inventory;
      first.rings=[];
      first.ringSlots=0;
    }
    G._unitLoadoutInitialized=true;
  }
  if(G.selectedAllyIdx==null||(G.selectedAllyIdx>=0&&(!G.allies[G.selectedAllyIdx]||G.allies[G.selectedAllyIdx].hp<=0))){
    G.selectedAllyIdx=firstIdx;
  }
  syncSelectedUnitLoadout();
}
function getSelectedAlly(){
  const idx=G.selectedAllyIdx;
  if(idx==null||idx<0) return null;
  if(G.allies[idx]&&G.allies[idx].hp>0&&!G.allies[idx]._isSoul) return G.allies[idx];
  const next=G.allies.findIndex(a=>a&&a.hp>0&&!a._isSoul);
  if(next>=0){
    G.selectedAllyIdx=next;
    return G.allies[next];
  }
  return null;
}
function syncSelectedUnitLoadout(){
  const u=getSelectedAlly();
  if(!u) return null;
  ensureUnitLoadout(u);
  if(isHumanEquipmentMode(u)){
    G.rings=[];
    G.ringSlots=0;
    G.spells=u.equipment;
    G.handSlots=HUMAN_EQUIP_SLOTS.length;
    return u;
  }
  G.rings=u.rings;
  G.ringSlots=u.rings.length;
  G.spells=u.inventory;
  G.handSlots=getUnitItemSlots(u);
  return u;
}
function selectAllyLoadout(idx){
  if(!G.allies[idx]||G.allies[idx].hp<=0||G.allies[idx]._isSoul) return null;
  G.selectedAllyIdx=idx;
  return syncSelectedUnitLoadout();
}
function aliveActionAllies(){
  return G.allies.filter(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
}
function syncManualActionCounts(){
  if(G.phase==='battle_end'){
    G.actionsPerTurn=Infinity;
    G.actionsLeft=Infinity;
    return;
  }
  const alive=aliveActionAllies();
  G.actionsPerTurn=alive.length;
  G.actionsLeft=alive.filter(a=>!a._actedThisTurn).length;
}
function startManualPlayerTurn(){
  initializeUnitLoadouts();
  aliveActionAllies().forEach(a=>{ a._actedThisTurn=false; });
  (G.enemies||[]).forEach(e=>{ if(e) e._actedThisTurn=false; });
  G._manualTurnQueue=typeof getManualBattleActionOrder==='function'?getManualBattleActionOrder():[];
  G._manualTurnPos=0;
  G._manualTurnActive=null;
  syncManualActionCounts();
}
function finishSelectedAllyAction(){
  const u=getSelectedAlly();
  if(G.phase==='battle_end'){
    syncManualActionCounts();
    updateHUD();
    return;
  }
  if(u&&u._extraManualActions>0){
    u._extraManualActions--;
    syncManualActionCounts();
    updateHUD();
    return;
  }
  if(u) u._actedThisTurn=true;
  syncManualActionCounts();
  G._manualTurnActive=null;
  if(typeof advanceManualTurn==='function'){
    setTimeout(()=>{ if(G.phase==='player') advanceManualTurn(); },120);
    return;
  }
}
function makePunchCard(unit){
  const fixed=getUnitFixedAction(unit);
  const p=Object.assign(clone(BASIC_PUNCH_CARD),clone(fixed));
  const base=Math.max(0,(unit&&unit.atk)||0);
  const bonus=Math.max(0,Number(fixed.power||0)||0);
  const dmg=base+bonus;
  p.id=`fixed_${p.name||'action'}`;
  p.type='basic';
  p.effect='punch';
  p.grade=1;
  p.needsEnemy=true;
  p.noConsume=true;
  p.desc=`対象のキャラクター1体に${dmg}ダメージを与える。`;
  return p;
}
