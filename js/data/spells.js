// ═══════════════════════════════════════
// SPELL_POOL — 杖・消耗品カード定義
//
// type:'wand'       — 使用回数制（usesLeft は取得時に決定）
// type:'consumable' — 使い切り（使用後 null になる）
//
// effect キー一覧（applySpell の switch に対応）:
//   'fire'        — 対象の敵にダメージ
//   'hate'        — 対象の仲間にヘイト付与
//   'double_hp'   — 対象の仲間のHPを2倍
//   'swap_all'    — 全キャラのATK/HPを入れ替え
//   'nullify'     — 対象の敵のATKを0（1ターン）
//   'boost'       — 対象の仲間のATK・HP+50%
//   'rally'       — 全仲間ATK+30%
//   'heal_ally'   — 対象の仲間をHP最大値の30%回復
//   'golem'       — ヘイト持ちゴーレムを召喚
//   'spread'      — もう片方の杖を複数回発動
//   'meteor'      — ランダムなキャラに2回ダメージ
//   'instakill'   — 対象に即死付与
//   'bomb'        — 全敵にダメージ
//   'revive'      — 最後に死んだ仲間を復活
//   'big_rally'   — 全仲間ATK・HP+100%
//   'gold_8'      — 金+8
// ═══════════════════════════════════════
const SPELL_POOL=[

  // ── WANDS ──
  // starterOnly:true のカードは報酬プールに出現しない
  // starterOnly:true = 選択画面専用（通常報酬に出ない）
  {id:'w_fire',      name:'炎の杖',      type:'wand',grade:1,starterOnly:true,
   desc:'対象の敵に2×Grade係数ダメージ',effect:'fire',needsEnemy:true,baseUses:5},

  {id:'w_start_null',name:'沈黙の杖',    type:'wand',grade:1,starterOnly:true,
   desc:'対象の敵のATKを0にする（1ターン）',effect:'nullify',needsEnemy:true,baseUses:5},

  {id:'w_start_heal',name:'回復の杖',    type:'wand',grade:1,starterOnly:true,
   desc:'対象の仲間のHPを最大値の30%×Grade係数回復',effect:'heal_ally',needsAlly:true,baseUses:5},

  {id:'w_start_buff',name:'強化の杖',    type:'wand',grade:1,starterOnly:true,
   desc:'対象の仲間のATK・HP+50%×Grade係数',effect:'boost',needsAlly:true,baseUses:5},

  {id:'w_start_golem',name:'岩の杖',     type:'wand',grade:1,starterOnly:true,
   desc:'ATK10/HP10×Grade係数のヘイト持ちゴーレムを1体召喚',effect:'golem',baseUses:5},

  {id:'w_hate',   name:'ヘイトの杖', type:'wand',grade:1,
   desc:'対象の仲間にヘイト付与（戦闘終了まで）',effect:'hate',needsAlly:true},

  {id:'w_double', name:'二重化の杖', type:'wand',grade:1,
   desc:'対象の仲間のHPを2倍にする',effect:'double_hp',needsAlly:true},

  {id:'w_swap',   name:'混沌の杖',   type:'wand',grade:1,
   desc:'全キャラのATKとHPを入れ替える',effect:'swap_all'},

  {id:'w_nullify',name:'沈黙の杖',   type:'wand',grade:1,
   desc:'対象の敵のATKを0にする（1ターン）',effect:'nullify',needsEnemy:true},

  {id:'w_boost',  name:'強化の杖',   type:'wand',grade:1,
   desc:'対象の仲間のATK・HP+50%×Grade係数',effect:'boost',needsAlly:true},

  {id:'w_rally',  name:'激励の杖',   type:'wand',grade:1,
   desc:'全仲間のATK+30%×Grade係数',effect:'rally'},

  {id:'w_heal',   name:'回復の杖',   type:'wand',grade:1,
   desc:'対象の仲間のHPを最大値の30%×Grade係数回復',effect:'heal_ally',needsAlly:true},

  {id:'w_golem',  name:'岩の杖',     type:'wand',grade:1,
   desc:'ATK10/HP10×Grade係数のヘイト持ちゴーレムを1体召喚',effect:'golem'},

  {id:'w_spread', name:'拡散の杖',   type:'wand',grade:1,
   desc:'もう片方の杖がGrade+1回発動するようになる（戦闘終了まで）',effect:'spread'},

  {id:'w_meteor', name:'隕石の杖',   type:'wand',grade:1,
   desc:'ランダムなキャラに3×Grade係数ダメージ×2回',effect:'meteor'},

  // ── CONSUMABLES ──
  {id:'c_kill',   name:'即死の薬瓶', type:'consumable',
   desc:'対象のキャラに即死付与（そのキャラを攻撃したユニットが即死）',effect:'instakill',needsAny:true},

  {id:'c_bomb',   name:'全体爆弾',   type:'consumable',
   desc:'全敵にグレード×5ダメージ',effect:'bomb'},

  {id:'c_revive', name:'蘇生の石',   type:'consumable',
   desc:'最後に死んだ仲間をHP50%で復活',effect:'revive'},

  {id:'c_rally',  name:'鼓舞の旗',   type:'consumable',
   desc:'全仲間ATK・HP+100%',effect:'big_rally'},

  {id:'c_gold',   name:'ソウルの壺', type:'consumable',
   desc:'ソウル+8を得る',effect:'gold_8'},

  // ── 特殊消耗品（通常報酬プールには出ない）──
  {id:'c_soul_dregs', name:'魂の残滓', type:'consumable', starterOnly:true,
   desc:'G9以下の契約を1つ選ぶ。その契約のグレードを次の戦闘終了まで+1する',effect:'soul_dregs'},

  {id:'c_copy_scroll',  name:'複製の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んでコピーし、自分の杖として入手する',effect:'copy_scroll'},

  {id:'c_destroy_scroll',name:'破壊の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んで破壊し、ソウル+3を得る',effect:'destroy_scroll'},
];
