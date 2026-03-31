// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, units.js, spells.js
// ═══════════════════════════════════════

let G={};

// キーワード説明文マップ（loader.js で effect_id シートから上書き）
const KW_DESC_MAP={};

const uid      = ()    => '_'+Math.random().toString(36).slice(2,8);
const randFrom = a     => a[Math.floor(Math.random()*a.length)];
const randi    = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const clone    = o     => JSON.parse(JSON.stringify(o));

function rand(){ return Math.random(); }

function gradeStr(g){
  const s=['','G1','G2','G3','G4','★'];
  return s[Math.min(g||1, s.length-1)];
}

function initState(){
  G={
    floor:1, life:20, gold:0,
    // ── 盤面（6スロット固定・HP持続）──
    allies: Array(6).fill(null),
    enemies:[],
    // ── プレイヤー装備 ──
    rings:   [null, null],       // 指輪スロット（初期2枠・最大4枠）
    ringSlots: 2,
    // ── 手札（杖＋消耗品混合・最大7枠）──
    spells:  Array(5).fill(null),
    handSlots: 5,
    // ── 状態 ──
    phase:'init',
    actionsPerTurn:1, actionsLeft:0,
    turn:0, earnedGold:0,
    moveMasks:[], visibleMoves:[],
    fogNext:false, prevNodeType:'battle',
    spreadActive:false, spreadMult:0,
    _isEliteFight:false, _eliteIdx:-1, _eliteKilled:false,
    _usedNamedElite:new Set(), _usedNamedRest:new Set(),
    _seenLegendRings:new Set(),
    _retryFloor:false,
    battleCounters:{damage:0,deaths:0},
    // ── 魔術レベル（亜人キャラ効果用）──
    magicLevel:1,
    // ── マミー効果：不死ATK補正（累積） ──
    _undeadHpBonus:0,
    // ── グリマルキン効果：召喚ユニット補正（累積） ──
    _grimalkinBonus:0,
    // ── 宝箱・撤退・宿屋ボーナス ──
    _pendingTreasure:false,
    _retreated:false,
    _bonusAction:0,
    hasGoldenDrop:false,
    // ── 報酬グレード ──
    rewardGrade:1,
    rewardGradeUpCount:0,
    // ── 報酬 ──
    rerollCount:0,
    // ── 秘術（互換性のため残す）──
    arcana:null, arcanaUsed:false,
    arcanaCarryGold:0, arcanaForceNode:false, arcanaTrustCount:0,
    commanderWands:[],
    seenWands:[],
    _seenRarity3:new Set(),
    bannedRings:[],
    buffAdjBonuses:{},
    rewardCards:6,
    maxRewardCards:6,
    // ── 敵永続強化（魂喰X・マミー敵）──
    enemyPermanentBonus:{atk:0,hp:0},
    enemyUndeadAtkBonus:0,
  };

  // 初期キャラクター：ゴーレム
  const golemDef = UNIT_POOL.find(u=>u.id==='c_golem');
  if(golemDef) G.allies[0] = makeUnitFromDef(golemDef);

  // 初期杖：炎の杖
  const fireWand = SPELL_POOL.find(s=>s.id==='s_fire')||clone(SPELL_POOL[0]);
  if(fireWand){
    const fw = clone(fireWand);
    fw.usesLeft = 5; fw._maxUses = 5;
    G.spells[0] = fw;
  }
}
