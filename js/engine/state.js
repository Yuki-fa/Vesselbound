// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, rings.js, spells.js
// ═══════════════════════════════════════

// ゲームのグローバル状態
let G={};

// ユーティリティ
const uid      = ()    => '_'+Math.random().toString(36).slice(2,8);
const randFrom = a     => a[Math.floor(Math.random()*a.length)];
const randi    = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const clone    = o     => JSON.parse(JSON.stringify(o));

function initState(){
  G={
    floor:1, life:20, gold:0,
    rings:[], spells:[],
    allies:[], enemies:[],
    moveMasks:[], visibleMoves:[],
    turn:0, phase:'init',
    actionsPerTurn:1, actionsLeft:0,
    ringSlots:5, wandSlots:2, consumSlots:2,
    lastDead:null, fogNext:false,
    prevNodeType:'battle', earnedGold:0,
    spreadActive:false, spreadMult:0,
    battleCounters:{damage:0,deaths:0,summons:0,deathTriggerNext:10,damageTriggerNext:12},
    buffAdjBonuses:{},   // ringId→{atk,hp} 永続累積ボーナス
    rewardTaken:false,
    rewardCards:3,       // 現在の報酬カード枚数（ボス撃破ごとに+1）
    maxRewardCards:MAX_REWARD_CARDS,
    bannedRings:['r_adj_cnt'],  // G10到達 or isUnique でプールから抹消された指輪ID
    _isEliteFight:false,         // 現在の戦闘にエリートが出現したか
    rerollCount:0,               // 累計リロール回数（試行の契約用）
    _djinnActive:false,          // 魔神降臨処理中フラグ（再帰防止）
    // ── 秘術（ヒーローパワー）──
    arcana:null,          // 選択した秘術オブジェクト
    arcanaUsed:false,     // この報酬フェイズで使用済みか
    arcanaTrustCount:0,   // 信頼の使用回数（次回ボーナス算出用）
    arcanaCarryGold:0,    // 強欲：次の戦闘開始時に引き継ぐソウル
    arcanaForceNode:false,// 観察：次の戦闘で祭壇/休息所が確定
    // ── 司令官杖 ──
    commanderWands:[],    // 現在の戦闘で司令官が使う杖オブジェクト
  };
  // 初期装備（ヘイトの杖なし）
  G.rings=[clone(RING_POOL[0])];
  const fireWand=clone(SPELL_POOL[0]); fireWand.usesLeft=5; fireWand._maxUses=5;
  G.spells=[fireWand];
}
