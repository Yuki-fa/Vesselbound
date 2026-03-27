// ═══════════════════════════════════════
// SPELL_POOL — 杖・消耗品カード定義
// ═══════════════════════════════════════
const SPELL_POOL=[

  // ── WANDS（初期装備専用） ──
  {id:'w_fire',      name:'炎の杖',    type:'wand', starterOnly:true,
   desc:'初期装備専用。対象の敵にXダメージを与える。', effect:'fire', needsEnemy:true, baseUses:5},

  {id:'w_start_null',name:'沈黙の杖', type:'wand', starterOnly:true,
   desc:'対象の敵のATKを0にする（1ターン）。', effect:'nullify', needsEnemy:true, baseUses:5},

  {id:'w_start_heal',name:'回復の杖', type:'wand', starterOnly:true,
   desc:'全ての仲間のHPを全回復する。', effect:'heal_ally', baseUses:5},

  {id:'w_start_buff',name:'強化の杖', type:'wand', starterOnly:true,
   desc:'対象の仲間のATK・HPを1.5倍にする。', effect:'boost', needsAlly:true, baseUses:5},

  {id:'w_golem',     name:'岩の杖',   type:'wand', starterOnly:true,
   desc:'初期装備専用。2/2ゴーレムを召喚。', effect:'golem', baseUses:5},

  // ── WANDS（通常報酬プール） ──
  {id:'w_hate',     name:'ヘイトの杖',  type:'wand', starterOnly:true, cost:2,
   desc:'味方に使うと敵が優先的に狙う。敵に使うと味方が優先的に狙う。', effect:'hate', needsAny:true, baseUses:3},

  {id:'w_stealth',  name:'隠密の杖',   type:'wand', cost:2,
   desc:'対象の仲間に隠密を与える。敵から狙われなくなる。', effect:'stealth', needsAlly:true, baseUses:3},

  {id:'w_poison',   name:'毒の杖',     type:'wand', cost:2,
   desc:'対象の敵に毒3を与える（毎ターン開始時HP-3、重複可）。', effect:'poison_wand', needsEnemy:true, baseUses:4},

  {id:'w_sacrifice',name:'犠牲の杖',  type:'wand', cost:2,
   desc:'対象の仲間を破壊し、全ての敵にその仲間のATKに等しいダメージを与える。', effect:'sacrifice', needsAlly:true, baseUses:3},

  {id:'w_boost_atk',name:'強化の杖',  type:'wand', cost:2,
   desc:'対象の仲間に+3/±0を与える。', effect:'boost_atk', needsAlly:true, baseUses:4},

  {id:'w_swap_pos', name:'転移の杖',  type:'wand', cost:3,
   desc:'同じチームのキャラクター2体の位置を入れ替える。', effect:'swap_pos', baseUses:3},

  {id:'w_weaken',   name:'脱力の杖',  type:'wand', cost:2,
   desc:'対象のATKを0にする（1ターン）。', effect:'weaken', needsAny:true, baseUses:4},

  {id:'w_golem_pool',name:'岩の杖',   type:'wand', cost:3,
   desc:'X/Xのゴーレムを召喚する。', effect:'golem', baseUses:4},

  {id:'w_spread',   name:'拡散の杖',  type:'wand', cost:3, unique:true,
   desc:'右隣の杖の効果を使用する。', effect:'spread', baseUses:4},

  {id:'w_meteor',   name:'隕石の杖',  type:'wand', cost:3,
   desc:'ランダムなキャラクターに3ダメージを3回与える。', effect:'meteor_multi', baseUses:3},

  {id:'w_doom',     name:'破滅の杖',  type:'wand', cost:3,
   desc:'全ての敵に5ダメージを与える。', effect:'doom', baseUses:4},

  {id:'w_possess',  name:'憑依の杖',  type:'wand', cost:3,
   desc:'対象の仲間と、最もATKの低い敵の位置を入れ替える。', effect:'possess', needsAlly:true, baseUses:3},

  {id:'w_nullify',  name:'沈黙の杖',  type:'wand', cost:2,
   desc:'対象の敵のATKを0にする（1ターン）。', effect:'nullify', needsEnemy:true, baseUses:4},

  {id:'w_heal',     name:'回復の杖',  type:'wand', cost:3,
   desc:'全ての仲間のHPを全回復する。', effect:'heal_ally', baseUses:3},

  {id:'w_rally',    name:'激励の杖',  type:'wand', cost:2,
   desc:'全ての仲間のATKを1.2倍にする。', effect:'rally', baseUses:4},

  // ── CONSUMABLES ──
  {id:'c_battle_start',name:'開幕の書',     type:'consumable', cost:2,
   desc:'全ての戦闘開始時の効果を発動する。', effect:'battle_start_book'},

  {id:'c_magic_book',  name:'魔術の書',     type:'consumable', cost:3,
   desc:'魔術レベルが+2される。', effect:'magic_book'},

  {id:'c_sacr_doll',   name:'生贄人形',     type:'consumable', cost:2,
   desc:'ボスでないキャラクターを破壊する。', effect:'sacrifice_doll', needsAny:true},

  {id:'c_swap_stats',  name:'黒い薬瓶',     type:'consumable', cost:2,
   desc:'対象のキャラクターのATKとHPを入れ替える。', effect:'swap_stats', needsAny:true},

  {id:'c_counter',     name:'無力化の巻物', type:'consumable', cost:2,
   desc:'対象の仲間に反撃を与える。攻撃を受けた時、攻撃者に自身のATK分のダメージを与える。', effect:'counter_scroll', needsAlly:true},

  {id:'c_regen',       name:'アンデッドの秘宝',type:'consumable', cost:2,
   desc:'対象の仲間に再生を与える。', effect:'regen_grant', needsAlly:true},

  {id:'c_purify',      name:'浄化の炎',     type:'consumable', cost:1,
   desc:'対象のキャラクターのヘイトを外す。', effect:'purify_hate', needsAny:true},

  {id:'c_kill',        name:'即死の薬瓶',   type:'consumable', cost:3,
   desc:'対象のキャラクターに即死を与える。', effect:'instakill', needsAny:true},

  {id:'c_rally',       name:'鼓舞の旗',     type:'consumable', cost:3,
   desc:'全ての仲間に±0/+5を与える。', effect:'big_rally'},

  {id:'c_bomb',        name:'全体爆弾',     type:'consumable', cost:2,
   desc:'全敵にグレード×5ダメージ。', effect:'bomb'},

  {id:'c_gold',        name:'ソウルの壺',   type:'consumable', cost:1,
   desc:'ソウル+8を得る。', effect:'gold_8'},

  // ── 特殊消耗品（通常報酬には出ない） ──
  {id:'c_copy_scroll',   name:'複製の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んでコピーし、自分の杖として入手する。', effect:'copy_scroll'},

  {id:'c_destroy_scroll',name:'破壊の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んで破壊し、ソウル+3を得る。', effect:'destroy_scroll'},
];
