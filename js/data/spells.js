// ═══════════════════════════════════════
// SPELL_POOL — 杖・消耗品カード定義
// ═══════════════════════════════════════
const SPELL_POOL=[

  // ── WANDS（初期装備専用） ──
  {id:'w_fire',       name:'炎の杖',    type:'wand',
   desc:'対象のキャラクターにXダメージを与える。', effect:'fire', needsAny:true, baseUses:4},

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
   desc:'対象の仲間を破壊し、全ての敵にそのパワーに等しいダメージを与える。', effect:'sacrifice', needsAlly:true, baseUses:4},

  {id:'w_boost_atk',  name:'強化の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターに+X/±0を与える。', effect:'boost_atk', needsAlly:true, baseUses:3},

  {id:'w_swap_pos',   name:'転移の杖',  type:'wand', cost:2,
   desc:'対象のキャラクター2体の位置を入れ替える。（仲間と敵は不可）', effect:'swap_pos', baseUses:4},

  {id:'w_weaken',     name:'脱力の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターのパワーを1ターンだけ0にする。', effect:'weaken', needsAny:true, baseUses:3},

  {id:'w_golem_pool', name:'岩の杖',    type:'wand', cost:2,
   desc:'X/Xのゴーレムを召喚する。', effect:'golem', baseUses:4},

  {id:'w_spread',     name:'拡散の杖',  type:'wand', cost:2, unique:true,
   desc:'右隣の杖の効果を使用する。', effect:'spread', baseUses:3},

  {id:'w_meteor',     name:'隕石の杖',  type:'wand', cost:2,
   desc:'ランダムな敵にXダメージをX回与える。', effect:'meteor_multi', baseUses:4},

  {id:'w_shield_grant', name:'光輝の杖', type:'wand', cost:2,
   desc:'対象のキャラクターにシールドを与える。', effect:'shield_wand', needsAny:true, baseUses:4},

  {id:'w_growth_grant', name:'成長の杖', type:'wand', cost:2,
   desc:'対象のキャラクターに成長Xを与える。', effect:'growth_wand', needsAlly:true, baseUses:3},

  {id:'w_flash_blade', name:'閃刃の杖', type:'wand', cost:2,
   desc:'全てのキャラクターに1ダメージを与える。', effect:'flash_blade', baseUses:4},

  {id:'w_charm',      name:'魅了の杖',  type:'wand', cost:2,
   desc:'対象のパワーが魔術レベル以下の敵を仲間にする。', effect:'charm', needsEnemy:true, baseUses:3},

  {id:'w_doom',       name:'破滅の杖',  type:'wand', cost:2,
   desc:'全ての敵にXダメージを与える。', effect:'doom', baseUses:4},

  {id:'w_possess',    name:'憑依の杖',  type:'wand', cost:2,
   desc:'対象の仲間と、最もパワーの低い敵の場所を入れ替える。', effect:'possess', needsAlly:true, baseUses:4},

  {id:'w_confusion',  name:'混乱の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターのパワーとライフを入れ替える。', effect:'swap_stats', needsAny:true, baseUses:4},

  // ── CONSUMABLES ──
  {id:'c_battle_start', name:'栄光の巻物', type:'consumable', cost:2,
   desc:'全ての戦闘開始時の効果を発動する。', effect:'battle_start_book'},

  {id:'c_magic_book',   name:'叡智の巻物', type:'consumable', cost:2,
   desc:'魔術レベルが+2される。', effect:'magic_book'},

  {id:'c_sacr_doll',    name:'破壊の巻物', type:'consumable', cost:2,
   desc:'対象のボス、エリートでないキャラクターを破壊する。', effect:'sacrifice_doll', needsAny:true},

  {id:'c_counter',      name:'反逆の薬',   type:'consumable', cost:2,
   desc:'対象のキャラクターに反撃を与える。', effect:'counter_scroll', needsAlly:true},

  {id:'c_purify',       name:'浄化の薬',   type:'consumable', cost:2,
   desc:'対象のキャラクターの毒を消す。', effect:'purify_hate', needsAny:true},

  {id:'c_kill',         name:'禁呪の薬',   type:'consumable', cost:2,
   desc:'対象のキャラクターに即死を与える。', effect:'instakill', needsAny:true},

  {id:'c_rally',        name:'鼓舞の旗',   type:'consumable', cost:2,
   desc:'全ての仲間に±0/+5を与える。', effect:'big_rally'},

  // ── 特殊消耗品（通常報酬には出ない） ──
  {id:'c_soul_dregs',  name:'魂の残滓', type:'consumable', starterOnly:true,
   desc:'契約を1つ選ぶ。そのグレードを次の戦闘終了まで+1する。', effect:'soul_dregs'},
];
