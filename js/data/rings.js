// ═══════════════════════════════════════
// RING_POOL — 指輪カード定義
//
// kind:'summon'  = 自動発動、仲間を召喚する
// kind:'passive' = 戦闘中の状態を常時変化させる
//
// trigger（召喚系のみ）:
//   'battle_start'         — 戦闘開始時
//   'turn_start'           — 毎ターン開始時
//   'on_summon'            — 仲間が召喚されるたび
//   'on_spell'             — 杖を使用するたび
//   'on_damage_count'      — 累計ダメージ数が triggerCount に達するたび
//   'on_death_count'       — 仲間の累計死亡数が triggerCount に達するたび
//   'on_full_board'        — 盤面が6体になった瞬間
//   'on_ally_death_notskel'— 骸骨以外の仲間が死ぬたび
//   'on_outnumbered'       — ターン開始時に敵が自分の3倍以上
// ═══════════════════════════════════════
const RING_POOL=[

  // ── SUMMON RINGS ──
  {id:'r_wolf',  name:'狼の指輪',   kind:'summon',grade:1,
   desc:'戦闘開始時、3/3の狼を召喚。狼が生存中、全仲間ATK+2',
   trigger:'battle_start', summon:{name:'狼',atk:3,hp:3,icon:'🐺'}, unique:'wolf_aura'},

  {id:'r_hyena', name:'腐臭の指輪', kind:'summon',grade:1,
   desc:'ターン開始時、1/2のハイエナを1体召喚する',
   trigger:'turn_start',   summon:{name:'ハイエナ',atk:1,hp:2,icon:'🦴'}},

  {id:'r_flame', name:'鬼火の指輪', kind:'summon',grade:1,
   desc:'仲間が召喚されるたびに4/1の鬼火を1体召喚する',
   trigger:'on_summon',    summon:{name:'鬼火',atk:4,hp:1,icon:'🔥'}},

  {id:'r_stone', name:'石像の指輪', kind:'summon',grade:1,
   desc:'杖を使用するたびに4/5の石像を1体召喚する',
   trigger:'on_spell',     summon:{name:'石像',atk:4,hp:5,icon:'🗿'}, onDeath:'stone_death'},

  {id:'r_dragon',name:'竜の指輪',   kind:'summon',grade:1,
   desc:'キャラクターが累計12回ダメージを受けるたびに15/20の竜を1体召喚する',
   trigger:'on_damage_count', triggerCount:12, summon:{name:'竜',atk:15,hp:20,icon:'🐉'}},

  {id:'r_shadow',name:'影の指輪',   kind:'summon',grade:1,
   desc:'仲間が累計10回死ぬたびに、現在最高ATKの仲間のコピーを1体召喚する',
   trigger:'on_death_count', triggerCount:10, unique:'shadow_copy'},

  {id:'r_rat',   name:'鼠の指輪',   kind:'summon',grade:1,
   desc:'戦闘開始時、1/1の鼠を5体召喚する',
   trigger:'battle_start', summon:{name:'鼠',atk:1,hp:1,icon:'🐀'}, count:5},

  {id:'r_skel',  name:'骸骨の指輪', kind:'summon',grade:1,
   desc:'骸骨以外の仲間が死ぬたびに1/1の骸骨を1体召喚する',
   trigger:'on_ally_death_notskel', summon:{name:'骸骨',atk:1,hp:1,icon:'💀'}},

  {id:'r_djinn', name:'魔神の指輪', kind:'summon',grade:1,
   desc:'仲間が召喚された時に盤面が6体なら、魔神以外の全仲間を破壊し15/15の魔神を召喚する',
   trigger:'on_full_board', unique:'djinn_replace', summon:{name:'魔神',atk:15,hp:15,icon:'👿'}},

  {id:'r_bear',  name:'熊の指輪',   kind:'summon',grade:1,
   desc:'ターン開始時、敵の数が自分の場の3倍以上なら8/10の熊を1体召喚する',
   trigger:'on_outnumbered', summon:{name:'熊',atk:8,hp:10,icon:'🐻'}, unique:'bear_grow'},

  {id:'r_wall',  name:'城壁の指輪', kind:'summon',grade:1,
   desc:'戦闘開始時、0/20の城壁を1体召喚。守護：攻撃を受けた時、守護を持たない仲間が反撃する',
   trigger:'battle_start', summon:{name:'城壁',atk:0,hp:20,icon:'🏰'}, guardian:true},

  // ── PASSIVE RINGS ──
  {id:'r_needle',    name:'針の指輪',   kind:'passive',grade:1,
   desc:'ターン開始時にランダムな敵に1ダメ×(Grade×2)',unique:'needle'},

  {id:'r_adj_cnt',   name:'隣接の指輪', kind:'passive',grade:1,
   desc:'隣接する召喚指輪の battle_start 召喚数+1',unique:'adj_count'},

  {id:'r_lifereg',   name:'生命の指輪', kind:'passive',grade:1,
   desc:'戦闘終了時ライフ+Grade',unique:'life_reg'},

  {id:'r_fury',      name:'憤激の指輪', kind:'passive',grade:1,
   desc:'キャラがダメージを受けるたび全仲間ATK+Grade',unique:'fury_passive'},

  {id:'r_extra',     name:'行動の指輪', kind:'passive',grade:1,
   desc:'プレイヤーの行動回数+Grade',unique:'extra_action'},

  {id:'r_buff_adj',  name:'増幅の指輪', kind:'passive',grade:1,
   desc:'戦闘終了時、隣接する召喚指輪の仲間ATK/HP+1（永続累積）',unique:'buff_adj'},

  {id:'r_shared_def',name:'共鳴の指輪', kind:'passive',grade:1,
   desc:'同名仲間が複数いる場合、それら全員にATK+5/HP+5×Grade',unique:'shared_def'},

  {id:'r_poison',    name:'毒沼の指輪', kind:'passive',grade:1,
   desc:'ダメージを受けた敵に毒付与（HP-3/T、重複可）',unique:'poison_aura'},

  {id:'r_catalyst',  name:'触媒の指輪', kind:'passive',grade:1,
   desc:'毒のダメージが(Grade+1)倍になる',unique:'catalyst'},
];
