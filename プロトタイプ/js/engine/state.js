// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, units.js
// ═══════════════════════════════════════

let G={};

// キーワード説明文マップ（loader.js で effect_id シートから上書き可）
// シート未読み込み時のフォールバック説明文
// シート「敵キーワード」の説明文をフォールバックとして保持（loader.js で上書き）
const KW_DESC_MAP={
  // 以下17件はExcel「キーワード」シートと一致（シートが正）
  '守護':     'このキャラクターは優先的に攻撃される。',
  '即死':     'このキャラクターからダメージを受けたキャラクターは即死する。（備考：シールドで防がれた場合は不発。）',
  '復活':     '死亡時、一度だけHP1で復活する。',
  '根性':     '死亡ダメージを受ける時、一度だけHP1で生き残る。',
  '毒牙':     'このキャラクターからダメージを受けたキャラクターに、その値に等しい毒を付与する。既に毒状態なら加算される。（ライフ-X/T）（備考：シールドで防がれた場合は不発。）',
  '狩人':     'このキャラクターは最後尾ではなく、常に最もライフの低いキャラクターを優先的に攻撃する。（備考：対象が複数いる場合は最もライフの低いキャラクターからランダム。）',
  '成長':     '編成フェイズ開始時に起こる効果。',
  'シールド': 'ダメージを一度だけ無効化する。',
  '二段攻撃': '攻撃後、再攻撃する。（備考：一回目で対象が死んだ場合、他の相手キャラクターに攻撃する。）',
  '三段攻撃': '攻撃後、2回再攻撃する。',
  '全体攻撃': '攻撃対象だけでなく、前衛・後衛を問わず他の全ての相手キャラに同値のダメージを与える。',
  '三方向攻撃': '攻撃対象の他、隣接する2キャラにも同値のダメージを与える。',
  '邪眼':     'このキャラクターからダメージを受けたキャラクターのパワーはX減少する。（備考：相手キャラクター専用。）',
  '弱体化':   '対象に弱体Xを付与する。',
  '弱体':     'このキャラクターが受ける1以上のダメージはX増加する。',
  '先制':     '敵に先にダメージを与える。（備考：先に相手を倒した場合、反撃ダメージを受けない。）',
  'エリート': '戦闘開始時、ATK/HPに1.2倍の補正が入る。',
  'ボス':     '戦闘開始時、ATK/HPに1.5倍の補正が入る。',
  // 以下はシートには存在しないが、処理ロジックが現役のため説明文を維持
  '再生':     'ターン終了時にライフをX回復する。',
  '加護':     'このキャラクターはいかなる敵の杖の効果も受けない。',
  '標的':     'このキャラクターは最後尾のキャラクターよりも優先して攻撃目標になる。',
  '隠密':     '敵に狙われない。ただし加護持ちには無効。',
};

const uid      = ()    => '_'+Math.random().toString(36).slice(2,8);
const randFrom = a     => a[Math.floor(Math.random()*a.length)];
const randi    = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const clone    = o     => JSON.parse(JSON.stringify(o));

function rand(){ return Math.random(); }

function initState(){
  G={
    floor:0, gold:0, life:3,
    // ── 盤面（MAX_ALLIES/MAX_ENEMIES件・HP持続）──
    allies: Array(MAX_ALLIES||5).fill(null),
    enemies:[],
    // ── マップ用インベントリ（9×2）──
    inventory: Array(18).fill(null),
    inventoryOpen:false,
    globalPanels:Array(7).fill(null),
    _showGlobalPanels:true,
    // ── スペル置き場（1×3・戦闘をまたいで保持）──
    // ゲーム開始時から「炎の矢」を1枚所持する
    spellSlots:(()=>{
      const slots=Array(3).fill(null);
      const fireArrow=typeof SPELL_POOL!=='undefined'?SPELL_POOL.find(s=>s&&s.name==='炎の矢'):null;
      if(fireArrow) slots[0]=clone(fireArrow);
      return slots;
    })(),
    // ── メイン置き場（7列×3行＝21枠。パーティ全体で共有する単一の配置グリッド）──
    mainBoard:Array(21).fill(null),
    // ── 状態 ──
    phase:'init',
    actionsPerTurn:1, actionsLeft:0,
    turn:0, earnedGold:0,
    moveMaskLanes:[],
    spreadActive:false, spreadMult:0,
    _isEliteFight:false, _eliteIdx:-1, _eliteKilled:false, _bossSlot:0,
    _usedNamedElite:new Set(), _usedNamedRest:new Set(),
    _retryFloor:false,
    battleCounters:{damage:0,deaths:0},
    // ── 魔術レベル（大学施設の魔法パネル効果で参照。現在レベルアップ手段なし）──
    magicLevel:1,
    hasGoldenDrop:false,
    baseIncome:0,
    facilities:{altar:1,lab:1,city:1,vault:1,library:1,university:1},
    facilityDiscounts:{},
    _nextRewardUniqueSlot:false,
    // ── 報酬グレード ──
    rewardGrade:1,
    rewardGradeUpCount:0,
    rewardCharCount:3,
    _bossJustDefeated:false,
    // ── 報酬 ──
    rerollCount:0,
    _seenRarity3:new Set(),
    buffAdjBonuses:{},
    rewardCards:6,
    maxRewardCards:6,
  };
}
