// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, units.js
// ═══════════════════════════════════════

let G={};

// キーワード説明文マップ（loader.js で effect_id シートから上書き可）
// シート未読み込み時のフォールバック説明文
// シート「敵キーワード」の説明文をフォールバックとして保持（loader.js で上書き）
const KW_DESC_MAP={
  '即死':     'このキャラクターからダメージを受けたキャラクターは即死する。（備考：結界で防がれた場合は不発。）',
  '呪詛':     'このキャラクターにダメージを与えたキャラクターは即死する。（備考：攻撃者が「加護」を持つ場合は不発。）',
  '邪眼':     'このキャラクターからダメージを受けたキャラクターのATKはX減少する。（備考：結界で防がれた場合は不発。）',
  '毒牙':     'このキャラクターからダメージを受けたキャラクターに「毒X」を付与する。（備考：結界で防がれた場合は不発。）',
  '衝撃':     'このキャラクターからダメージを受けたキャラクターに「弱体X」を付与する。',
  '強靭':     'このキャラクターが受けるダメージはX減少する。',
  '弱体':     'このキャラクターが受ける1以上のダメージはX増加する。',
  '毒':       'このキャラクターは攻撃を行う前にXダメージを受ける。',
  '結界':     'このキャラクターはダメージをX回無効化する。',
  '封印':     'このキャラクターは攻撃できず、いかなる効果も受けない。「生贄」を持つキャラクターがX体以上いる時、それらを全て破壊して解放される。',
  '生贄':     'このキャラクターは供物となる準備ができている。',
  '復活':     'このキャラクターは死亡した時、一度だけATKとHPを半分にして召喚する。',
  '根性':     'このキャラクターは死亡ダメージを受ける時、一度だけHP1で生き残る。',
  '生命吸収': 'このキャラクターはダメージを与えた時、その分のHPを得る。',
  '先制':     'このキャラクターは「先制」を持たない敵よりも先にダメージを与える。（備考：先に相手を倒した場合、反撃ダメージを受けない。）',
  '狩人':     'このキャラクターは前衛ではなく、常に最もライフの低いキャラクターを優先的に攻撃する。（備考：対象が複数いる場合は最もライフの低いキャラクターからランダム。）',
  '狙撃':     'このキャラクターから生じる、ランダムな敵を選ぶ効果が1人の敵だけを狙うようになる。',
  '防戦':     'このキャラクターは攻撃しない。',
  '熟練':     'このキャラクターが戦闘中にATKまたはHPを得る場合、その値は+1される。',
  '遺志':     '死亡：ランダムな味方に+3/+2を与える。',
  '共振':     '攻撃：全ての同じ色の味方に+1/+1を与える。',
  '団結':     'このキャラクターが受けたダメージは、同じ強化に接続したキャラクターへ分散される。',
  '武器破壊': 'このキャラクターはHPではなくATKにダメージを与える。',
  '戦術':     '攻撃：+1/+2を得る。',
  '大盾':     '自分よりATKが低いキャラクターからの反撃ダメージを受けない。',
  '策士':     '常時：所持するキーワード数の2倍の+X/+Xを得る。',
  '帰滅':     'このキャラクターは戦闘終了時に場にいない場合、消滅する。',
  '隠密':     'このキャラクターは攻撃するまでは攻撃対象に選ばれない。',
  '加護':     'このキャラクターはダメージ以外の効果を受けない。',
  '二段攻撃': 'このキャラクターは攻撃後、再攻撃する。（備考：一回目で対象が死んだ場合、他の相手キャラクターに攻撃する。）',
  '三段攻撃': 'このキャラクターは攻撃後、2回再攻撃する。',
  '全体攻撃': 'このキャラクターの攻撃は、全ての敵にダメージを与える。',
  '三方向攻撃': 'このキャラクターの攻撃は、対象に隣接する2体にもダメージを与える。',
  '貫通':     'このキャラクターの前衛のキャラクターへの攻撃は、後衛のキャラクターにもダメージを与える。（備考：対象と接する後衛キャラクターにダメージを与える。最大3人。）',
  'エリート': '戦闘開始時、ATK/HPに1.2倍の補正が入る。',
  'ボス':     '戦闘開始時、ATK/HPに1.5倍の補正が入る。',
};

// キーワードナンバーマップ（loader.js で「キーワード」シートのNo.列から上書き可）
// シート未読み込み時のフォールバック。発動時の専用VFX（KXXX.mp4）の解決に使う。
const KW_NO_MAP={
  '毒': 'K007',
};

// 「邪眼X」「毒牙X」「成長X」等、末尾に数値を持つキーワードを同種でまとめてXを合算する。
// （変数を持たないキーワードは重複所持しても1つにまとめるだけで、値は変化しない）
function _mergeCountedKeywords(list){
  const order=[];
  const sums=new Map();
  const isNum=new Map();
  (list||[]).forEach(raw=>{
    const s=String(raw||'').trim();
    if(!s) return;
    const m=/^(\D+?)(\d+)$/.exec(s);
    if(m){
      const base=m[1], num=parseInt(m[2],10)||0;
      if(!sums.has(base)){ sums.set(base,0); isNum.set(base,true); order.push(base); }
      sums.set(base,sums.get(base)+num);
    } else if(!sums.has(s)){
      sums.set(s,null); isNum.set(s,false); order.push(s);
    }
  });
  const merged=order.map(k=>isNum.get(k)?`${k}${sums.get(k)}`:k);
  // 三段攻撃を持つ場合は二段攻撃を、全体攻撃を持つ場合は三方向攻撃を、
  // 表示上も無効（非表示）にする（機能側はbattle.jsの_unitPanelKeywords()で既に排他）
  return merged.filter(k=>{
    if(k==='二段攻撃'&&merged.includes('三段攻撃')) return false;
    if(k==='三方向攻撃'&&merged.includes('全体攻撃')) return false;
    return true;
  });
}
const uid      = ()    => '_'+Math.random().toString(36).slice(2,8);
const randFrom = a     => a[Math.floor(Math.random()*a.length)];
const randi    = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const clone    = o     => JSON.parse(JSON.stringify(o));

function rand(){ return Math.random(); }

function initState(){
  G={
    floor:0, gold:100, life:3,
    // ── 盤面（MAX_ALLIES/MAX_ENEMIES件・HP持続）──
    allies: Array(MAX_ALLIES||5).fill(null),
    enemies:[],
    // ── マップ用インベントリ（9×2）──
    inventory: Array(18).fill(null),
    inventoryOpen:false,
    globalPanels:Array(7).fill(null),
    _showGlobalPanels:true,
    // ── スペル置き場（廃止。互換用に空配列だけ残す）──
    spellSlots:Array(3).fill(null),
    rings:[null,null,null,null],
    // ── メイン置き場（5列×3行＝15枠。パーティ全体で共有する単一の配置グリッド）──
    mainBoard:Array(15).fill(null),
    // ── 状態 ──
    phase:'init',
    actionsPerTurn:1, actionsLeft:0,
    turn:0, earnedGold:0,
    moveMaskLanes:[],
    spreadActive:false, spreadMult:0,
    _isEliteFight:false, _eliteIdx:-1, _eliteKilled:false, _bossSlot:0,
    _usedNamedElite:new Set(), _usedNamedRest:new Set(),
    _retryFloor:false,
    _waveLoopEnabled:false,
    _wave:1,
    _waveStage:1,
    _waveBattleType:null,
    _waveBattleWon:null,
    _waveEliteWon:false,
    _waveFinalVillage:false,
    _waveRewardCount:null,
    _waveWithdraw:false,
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
    // ── ボス報酬後の指輪提示 ──
    _isBossRewardCycle:false,
    _ringOffer:[],
    _ringOfferUnlocked:false,
    _ringOfferResolved:false,
    _boardDiscardCount:0,
    _bossRingOfferSeen:[],
  };
}
