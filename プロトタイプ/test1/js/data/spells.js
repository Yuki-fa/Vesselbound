// ═══════════════════════════════════════
// SPELL_POOL — 杖・消耗品カード定義
//
// type:'wand'       — 使用回数制（usesLeft は取得時に決定）
// type:'consumable' — 使い切り（使用後 null になる）
// starterOnly:true  — 初期選択専用（通常報酬プールに出ない）
//
// 杖にはグレードなし。効果は固定値。
// ═══════════════════════════════════════
const SPELL_POOL=[

  // ── WANDS（初期装備専用）──
  {id:'w_fire',      name:'炎の杖',      type:'wand',starterOnly:true,
   desc:'初期装備専用。対象の敵に2ダメージ',effect:'fire',needsEnemy:true,baseUses:5},

  {id:'w_start_null',name:'沈黙の杖',    type:'wand',starterOnly:true,
   desc:'対象のATKを0にする（1ターン）',effect:'nullify',needsEnemy:true,baseUses:5},

  {id:'w_start_heal',name:'回復の杖',    type:'wand',starterOnly:true,
   desc:'全ての仲間のHPを全回復する',effect:'heal_ally',baseUses:5},

  {id:'w_start_buff',name:'強化の杖',    type:'wand',starterOnly:true,
   desc:'対象のATK・HPを1.5倍にする',effect:'boost',needsAlly:true,baseUses:5},

  {id:'w_golem',     name:'岩の杖',      type:'wand',starterOnly:true,
   desc:'初期装備専用。ヘイト持ちの2/2ゴーレムを召喚',effect:'golem',baseUses:5},

  // ── WANDS（通常報酬プール）──
  {id:'w_hate',   name:'ヘイトの杖', type:'wand',
   desc:'対象の仲間にヘイト付与（戦闘終了まで）',effect:'hate',needsAlly:true,baseUses:3},

  {id:'w_double', name:'二重化の杖', type:'wand',unique:true,
   desc:'対象の仲間のHPを2倍にする',effect:'double_hp',needsAlly:true,baseUses:2},

  {id:'w_swap',   name:'混沌の杖',   type:'wand',unique:true,
   desc:'全キャラのATKとHPを入れ替える',effect:'swap_all',baseUses:3},

  {id:'w_nullify',name:'沈黙の杖',   type:'wand',
   desc:'対象のATKを0にする（1ターン）',effect:'nullify',needsEnemy:true,baseUses:4},

  {id:'w_boost',  name:'強化の杖',   type:'wand',
   desc:'対象のATK・HPを1.5倍にする',effect:'boost',needsAlly:true,baseUses:3},

  {id:'w_rally',  name:'激励の杖',   type:'wand',
   desc:'全ての仲間のATKを1.2倍にする。',effect:'rally',baseUses:4},

  {id:'w_heal',   name:'回復の杖',   type:'wand',
   desc:'全ての仲間のHPを全回復',effect:'heal_ally',baseUses:3},

  {id:'w_spread', name:'拡散の杖',   type:'wand',unique:true,
   desc:'右隣の杖の効果を使用する。',effect:'spread',baseUses:4},

  {id:'w_meteor', name:'隕石の杖',   type:'wand',unique:true,
   desc:'全キャラに1ダメージ',effect:'meteor',baseUses:5},

  // ── CONSUMABLES ──
  {id:'c_kill',   name:'即死の薬瓶', type:'consumable',
   desc:'対象に即死付与（攻撃したユニットが即死）',effect:'instakill',needsAny:true},

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
   desc:'G4以下の契約を1つ選ぶ。その契約のグレードを次の戦闘終了まで+1する',effect:'soul_dregs'},

  {id:'c_copy_scroll',  name:'複製の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んでコピーし、自分の杖として入手する',effect:'copy_scroll'},

  {id:'c_destroy_scroll',name:'破壊の巻物', type:'consumable', starterOnly:true,
   desc:'敵の杖を1本選んで破壊し、ソウル+3を得る',effect:'destroy_scroll'},
];
