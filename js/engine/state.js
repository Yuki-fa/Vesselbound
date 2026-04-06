// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, units.js, spells.js
// ═══════════════════════════════════════

let G={};

// キーワード説明文マップ（loader.js で effect_id シートから上書き可）
// シート未読み込み時のフォールバック説明文
// シート「敵キーワード」の説明文をフォールバックとして保持（loader.js で上書き）
const KW_DESC_MAP={
  '反撃':     'このキャラクターが攻撃を受けて生き残った場合、相手にこのキャラクターのパワーに等しいダメージを与える。',
  '二段攻撃': '攻撃後、再攻撃する。一回目で対象が死んだ場合、他の敵に攻撃する。',
  '三段攻撃': '攻撃後、2回再攻撃する。',
  '全体攻撃': 'このキャラクターはすべての相手を対象に攻撃する。',
  '加護':     'このキャラクターはいかなる敵の杖の効果も受けない。',
  'シールド': 'ダメージを一度だけ無効化する。重複しない。',
  '狩人':     'このキャラクターは最後尾ではなく、常に最もライフの低いキャラクターを優先的に攻撃する。',
  '即死':     'このキャラクターからダメージを受けたキャラクターは即死する。',
  '標的':     'このキャラクターは最後尾のキャラクターよりも優先して攻撃目標になる。',
  '隠密':     '敵に狙われない。ただし加護持ちには無効。',
  '成長':     '戦闘開始時、+X/+Xを得る。',
  '結束':     '戦闘開始時、全ての仲間が+X/+Xを得る。',
  '侵食':     'このキャラクターからダメージを受けたキャラクターに毒Xを付与する。既に毒状態なら加算される。（ライフ-X/T）',
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
    floor:1, life:20, gold:0,
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
    _prevWasShop:false,
    _pendingTreasure:false,
    _pendingEliteChest:false,
    _retreated:false,
    _retreatTargetNodeType:null,
    _bonusAction:0,
    _minotaurBonus:0,
    // ── 敵オーナーシステム ──
    bossRings:[],         // 敵オーナーが装備している指輪
    bossHand:[],          // 敵オーナーの手札（杖・アイテム）
    enemyMagicLevel:0,       // 敵オーナーの魔術レベル（FLOOR_DATA.magicLevel から設定）
    _enemyHandDynamic:false, // true = 戦闘中に動的取得した手札（手札3・指輪非表示）
    _enemySpreadActive:false,// 敵の spread 効果が有効中
    masterHand:[],  // 報酬フェイズのマスター手札
    hasGoldenDrop:false,
    baseIncome:1,
    _nextRewardUniqueSlot:false,
    // ── 報酬グレード ──
    rewardGrade:1,
    rewardGradeUpCount:0,
    rewardCharCount:3,
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
  };

  // 初期キャラクター：ゴーレム
  const golemDef = UNIT_POOL.find(u=>u.id==='c_golem');
  if(golemDef) G.allies[0] = makeUnitFromDef(golemDef, undefined, true);

  // 初期杖：炎の杖
  const fireWand = SPELL_POOL.find(s=>s.id==='s_fire')||clone(SPELL_POOL[0]);
  if(fireWand){
    const fw = clone(fireWand);
    fw.usesLeft = 5; fw._maxUses = 5;
    G.spells[0] = fw;
  }
}
