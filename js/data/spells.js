// ═══════════════════════════════════════
// SPELL_POOL — 杖・消耗品カード定義
// ═══════════════════════════════════════
const SPELL_POOL=[

  // ── WANDS（初期装備専用） ──
  {id:'w_fire',       name:'炎の杖',    type:'wand', starterOnly:true,
   desc:'対象の敵にXダメージを与える。', effect:'fire', needsEnemy:true, baseUses:5},

  {id:'w_start_null', name:'沈黙の杖',  type:'wand', starterOnly:true,
   desc:'対象の敵のATKを0にする（1ターン）。', effect:'nullify', needsEnemy:true, baseUses:5},

  {id:'w_start_heal', name:'回復の杖',  type:'wand', starterOnly:true,
   desc:'全ての仲間のHPを全回復する。', effect:'heal_ally', baseUses:5},

  {id:'w_start_buff', name:'強化の杖',  type:'wand', starterOnly:true,
   desc:'対象のキャラクターに+X/±0を与える。', effect:'boost', needsAlly:true, baseUses:5},

  {id:'w_golem',      name:'岩の杖',    type:'wand', starterOnly:true,
   desc:'X/Xのゴーレムを召喚する。', effect:'golem', baseUses:5},

  // ── WANDS（通常報酬プール） ──
  {id:'w_hate',       name:'ヘイトの杖', type:'wand', cost:2,
   desc:'対象のキャラクターにヘイトを与える。', effect:'hate', needsAny:true, baseUses:4},

  {id:'w_poison',     name:'毒の杖',    type:'wand', cost:2,
   desc:'対象のキャラクターに毒Xを与える。', effect:'poison_wand', needsEnemy:true, baseUses:4},

  {id:'w_sacrifice',  name:'犠牲の杖',  type:'wand', cost:2,
   desc:'対象の味方を破壊し、全ての敵にそのパワーに等しいダメージを与える。', effect:'sacrifice', needsAlly:true, baseUses:4},

  {id:'w_boost_atk',  name:'強化の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターに+X/±0を与える。', effect:'boost_atk', needsAlly:true, baseUses:3},

  {id:'w_swap_pos',   name:'転移の杖',  type:'wand', cost:3,
   desc:'対象のキャラクター2体の位置を入れ替える。（味方と敵は不可）', effect:'swap_pos', baseUses:4},

  {id:'w_weaken',     name:'脱力の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターを1ターン攻撃不能にする。', effect:'weaken', needsAny:true, baseUses:3},

  {id:'w_golem_pool', name:'岩の杖',    type:'wand', cost:3,
   desc:'X/Xのゴーレムを召喚する。', effect:'golem', baseUses:4},

  {id:'w_spread',     name:'拡散の杖',  type:'wand', cost:3, unique:true,
   desc:'右隣の杖の効果を使用する。', effect:'spread', baseUses:3},

  {id:'w_meteor',     name:'隕石の杖',  type:'wand', cost:3,
   desc:'ランダムな敵に3ダメージをX回与える。', effect:'meteor_multi', baseUses:4},

  {id:'w_doom',       name:'破滅の杖',  type:'wand', cost:3,
   desc:'全ての敵にXダメージを与える。', effect:'doom', baseUses:4},

  {id:'w_possess',    name:'憑依の杖',  type:'wand', cost:3,
   desc:'対象の味方と、最もパワーの低い敵の場所を入れ替える。', effect:'possess', needsAlly:true, baseUses:4},

  {id:'w_confusion',  name:'混乱の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターのパワーとライフを入れ替える。', effect:'swap_stats', needsAny:true, baseUses:4},

  // ── CONSUMABLES ──
  {id:'c_battle_start',name:'開幕の書',      type:'consumable', cost:2,
   desc:'全ての戦闘開始時の効果を発動する。', effect:'battle_start_book'},

  {id:'c_magic_book',  name:'魔術の書',      type:'consumable', cost:3,
   desc:'魔術レベルが+2される。', effect:'magic_book'},

  {id:'c_sacr_doll',   name:'生贄人形',      type:'consumable', cost:2,
   desc:'ボスでないキャラクターを破壊する。', effect:'sacrifice_doll', needsAny:true},

  {id:'c_counter',     name:'反逆の巻物',    type:'consumable', cost:2,
   desc:'対象のキャラクターに反撃を与える。', effect:'counter_scroll', needsAlly:true},

  {id:'c_regen',       name:'アンデッドの秘宝',type:'consumable', cost:2,
   desc:'対象のキャラクターに再生3を与える。', effect:'regen_grant', needsAlly:true},

  {id:'c_purify',      name:'浄化の炎',      type:'consumable', cost:1,
   desc:'対象のキャラクターのヘイトを外す。', effect:'purify_hate', needsAny:true},

  {id:'c_kill',        name:'即死の薬瓶',    type:'consumable', cost:3,
   desc:'対象のキャラクターに即死を与える。', effect:'instakill', needsAny:true},

  {id:'c_rally',       name:'鼓舞の旗',      type:'consumable', cost:3,
   desc:'全ての仲間に±0/+5を与える。', effect:'big_rally'},

  // ── 特殊消耗品（通常報酬には出ない） ──
  {id:'c_copy_scroll',    name:'複製の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んでコピーし、自分の杖として入手する。', effect:'copy_scroll'},

  {id:'c_destroy_scroll', name:'破壊の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んで破壊し、ソウル+3を得る。', effect:'destroy_scroll'},
];
