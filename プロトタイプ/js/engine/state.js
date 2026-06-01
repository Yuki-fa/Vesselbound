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
    selectedAllyIdx:0,
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
  };

  // 初期キャラクター：ミラ（ハルバード）/ アドラ（フランキスカ）
  const miraDef = UNIT_POOL.find(u=>u.id==='c_mira');
  const adraDef = UNIT_POOL.find(u=>u.id==='c_adra');
  if(miraDef) G.allies[0] = makeUnitFromDef(miraDef, undefined, true);
  if(adraDef) G.allies[1] = makeUnitFromDef(adraDef, undefined, true);
  initializeUnitLoadouts();
  if(G.allies[0]) ensureUnitLoadout(G.allies[0]);
  if(G.allies[1]) ensureUnitLoadout(G.allies[1]);
  if(G.allies[0]) placeInventoryCard(G.allies[0].inventory, makeInventoryCardByName('ハルバード'));
  if(G.allies[1]) placeInventoryCard(G.allies[1].inventory, makeInventoryCardByName('フランキスカ'));
  selectAllyLoadout(0);
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
  if(!card) return 1;
  return Math.max(1,Number(card.slotSize||card.slots||card.slot||1)||1);
}

function isOccupiedSlot(card){
  return !!(card&&card._occupied);
}

function initializeUses(card){
  if(!card) return card;
  if((card.type==='wand'||card.type==='weapon')&&card.usesLeft===undefined){
    const uses=card.baseUses||(card.baseUsesRange?randi(card.baseUsesRange[0],card.baseUsesRange[1]):randUses());
    card.usesLeft=uses;
    card._maxUses=uses;
  } else if((card.type==='wand'||card.type==='weapon')&&card._maxUses===undefined){
    card._maxUses=card.usesLeft;
  }
  return card;
}

function makeInventoryCardByName(name){
  const def=(SPELL_POOL||[]).find(s=>s&&s.name===name);
  if(!def) return null;
  const card=initializeUses(clone(def));
  delete card._buyPrice;
  return card;
}

function findInventorySpace(inv,card){
  if(!Array.isArray(inv)||!card) return -1;
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
  if(!Array.isArray(inv)||!card) return false;
  const start=findInventorySpace(inv,card);
  if(start<0) return false;
  inv[start]=card;
  const size=getCardSlotSize(card);
  for(let j=1;j<size;j++) inv[start+j]={_occupied:true,_occupiedBy:card.id||card.name};
  return true;
}

function removeInventoryCardAt(inv,idx){
  if(!Array.isArray(inv)||idx<0||idx>=inv.length) return;
  const card=inv[idx];
  if(!card||card._occupied) return;
  const size=getCardSlotSize(card);
  inv[idx]=null;
  for(let j=1;j<size&&idx+j<inv.length;j++){
    if(inv[idx+j]&&inv[idx+j]._occupied) inv[idx+j]=null;
  }
}

function getUnitFixedAction(unit){
  const cfg=(typeof getRaceLoadout==='function')?getRaceLoadout(unit&&unit.race):null;
  return (cfg&&cfg.fixed)||BASIC_PUNCH_CARD;
}

function getUnitInventorySlots(unit){
  if(!unit) return Math.max(1,G.handSlots||5);
  if(unit.inventorySlots!=null) return Math.max(1,unit.inventorySlots);
  const cfg=(typeof getRaceLoadout==='function')?getRaceLoadout(unit.race):null;
  return Math.max(1,(cfg&&cfg.itemSlots)||unit.handSlots||5);
}

function getUnitItemSlots(unit){
  return Math.max(0,getUnitInventorySlots(unit)-1); // 左端のパンチを除く
}

function getUnitRingSlots(unit){
  if(!unit) return Math.max(0,G.ringSlots||2);
  if(unit.ringSlots!=null) return Math.max(0,unit.ringSlots);
  const cfg=(typeof getRaceLoadout==='function')?getRaceLoadout(unit.race):null;
  return Math.max(0,(cfg&&cfg.ringSlots)||2);
}

function ensureUnitLoadout(unit){
  if(!unit) return null;
  const itemSlots=getUnitItemSlots(unit);
  const ringSlots=getUnitRingSlots(unit);
  if(!Array.isArray(unit.inventory)){
    unit.inventory=Array(itemSlots).fill(null);
  }
  while(unit.inventory.length<itemSlots) unit.inventory.push(null);
  if(unit.inventory.length>itemSlots) unit.inventory.length=itemSlots;
  if(!Array.isArray(unit.rings)){
    unit.rings=Array(ringSlots).fill(null);
  }
  while(unit.rings.length<ringSlots) unit.rings.push(null);
  if(unit.rings.length>ringSlots) unit.rings.length=ringSlots;
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
    G._unitLoadoutInitialized=true;
  }
  if(G.selectedAllyIdx==null||!G.allies[G.selectedAllyIdx]||G.allies[G.selectedAllyIdx].hp<=0){
    G.selectedAllyIdx=firstIdx;
  }
  syncSelectedUnitLoadout();
}

function getSelectedAlly(){
  const idx=G.selectedAllyIdx;
  const u=(G.allies||[])[idx];
  if(u&&u.hp>0&&!u._isSoul) return u;
  const firstIdx=(G.allies||[]).findIndex(a=>a&&a.hp>0&&!a._isSoul);
  if(firstIdx>=0){
    G.selectedAllyIdx=firstIdx;
    return G.allies[firstIdx];
  }
  return null;
}

function syncSelectedUnitLoadout(){
  const unit=getSelectedAlly();
  if(!unit) return null;
  ensureUnitLoadout(unit);
  G.spells=unit.inventory;
  G.handSlots=getUnitItemSlots(unit);
  G.rings=unit.rings;
  G.ringSlots=getUnitRingSlots(unit);
  return unit;
}

function selectAllyLoadout(idx){
  const unit=(G.allies||[])[idx];
  if(!unit||unit.hp<=0||unit._isSoul) return null;
  ensureUnitLoadout(unit);
  G.selectedAllyIdx=idx;
  syncSelectedUnitLoadout();
  return unit;
}

function aliveActionAllies(){
  return (G.allies||[]).filter(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
}

function syncManualActionCounts(){
  if(G.phase==='battle_end'){
    G.actionsPerTurn=Infinity;
    G.actionsLeft=Infinity;
    return;
  }
  const live=aliveActionAllies();
  G.actionsPerTurn=live.length;
  G.actionsLeft=live.filter(a=>!a._actedThisTurn).length;
}

function startManualPlayerTurn(){
  initializeUnitLoadouts();
  aliveActionAllies().forEach(a=>{ a._actedThisTurn=false; });
  const firstIdx=(G.allies||[]).findIndex(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject&&!a._actedThisTurn);
  if(firstIdx>=0) selectAllyLoadout(firstIdx);
  syncManualActionCounts();
}

function finishSelectedAllyAction(){
  const unit=getSelectedAlly();
  if(G.phase==='battle_end'){
    syncManualActionCounts();
    updateHUD();
    return;
  }
  if(unit&&unit._extraManualActions>0){
    unit._extraManualActions--;
    syncManualActionCounts();
    updateHUD();
    return;
  }
  if(unit) unit._actedThisTurn=true;
  syncManualActionCounts();
  const nextIdx=(G.allies||[]).findIndex(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject&&!a._actedThisTurn);
  if(nextIdx>=0) selectAllyLoadout(nextIdx);
  if(G.actionsLeft<=0&&!G._debugMode&&G.phase==='player'){
    setHint('全員が行動しました。敵ターンへ移行します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },350);
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
