// ═══════════════════════════════════════
// RING_POOL — 契約カード定義
//
// ATK = summon.atk + atkPerGrade * grade（G1なら×1、G2なら×2）
// HP  = summon.hp  + hpPerGrade  * grade
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
//   'on_outnumbered'       — ターン開始時に敵が自分の3倍以上
// ═══════════════════════════════════════
const RING_POOL=[

  // ── SUMMON RINGS ──
  // summon.atk/hp=0、grade×perGrade が実効値
  {id:'r_wolf',  name:'狼の契約',   kind:'summon',grade:1,
   atkPerGrade:3, hpPerGrade:3,
   summon:{name:'狼',atk:0,hp:0,icon:'🐺'},
   desc:'戦闘開始時、狼を召喚。狼が生存中、全仲間ATK+Grade',
   trigger:'battle_start', unique:'wolf_aura'},

  {id:'r_hyena', name:'腐臭の契約', kind:'summon',grade:1,
   atkPerGrade:1, hpPerGrade:2,
   summon:{name:'ハイエナ',atk:0,hp:0,icon:'🦴'},
   desc:'ターン開始時、ハイエナを召喚',
   trigger:'turn_start'},

  {id:'r_flame', name:'鬼火の契約', kind:'summon',grade:1,
   atkPerGrade:4, hpPerGrade:1,
   summon:{name:'鬼火',atk:0,hp:0,icon:'🔥'},
   desc:'仲間が召喚されるたびに鬼火を召喚（プレイヤーターン中・自身の召喚では発動しない）',
   trigger:'on_summon'},

  {id:'r_stone', name:'石像の契約', kind:'summon',grade:1,
   atkPerGrade:4, hpPerGrade:5,
   summon:{name:'石像',atk:0,hp:0,icon:'🗿'},
   desc:'戦闘開始時、石像を召喚。死亡時、他の仲間全員にHP+Grade×2',
   trigger:'battle_start', onDeath:'stone_death'},

  {id:'r_dragon',name:'竜の契約',   kind:'summon',grade:1,
   atkPerGrade:15, hpPerGrade:20,
   summon:{name:'竜',atk:0,hp:0,icon:'🐉'},
   desc:'キャラクターが累計15回ダメージを受けるたびに竜を召喚',
   trigger:'on_damage_count', triggerCount:15},

  {id:'r_shadow',name:'影の契約',   kind:'summon',grade:1,
   summon:{name:'影',atk:0,hp:0,icon:'👻'},
   desc:'仲間が累計10回死ぬたびに、現在最高ATKの仲間のコピーを召喚',
   trigger:'on_death_count', triggerCount:10, unique:'shadow_copy'},

  {id:'r_rat',   name:'鼠の契約',   kind:'summon',grade:1,
   atkPerGrade:1, hpPerGrade:1,
   summon:{name:'鼠',atk:0,hp:0,icon:'🐀'},
   desc:'戦闘開始時、鼠を1体召喚。仲間が召喚されるたびに鼠を2体追加召喚（自身は除く）',
   trigger:'battle_start', count:1, unique:'rat_extra'},

  {id:'r_skel',  name:'骸骨の契約', kind:'summon',grade:1,
   atkPerGrade:1, hpPerGrade:1,
   summon:{name:'骸骨',atk:0,hp:0,icon:'💀'},
   desc:'仲間が累計5回死ぬたびに骸骨を召喚（再生付き）',
   trigger:'on_death_count', triggerCount:5, regen:true},

  {id:'r_djinn', name:'魔神の契約', kind:'summon',grade:1,
   atkPerGrade:15, hpPerGrade:15,
   summon:{name:'魔神',atk:0,hp:0,icon:'👿'},
   desc:'仲間が召喚された時に盤面が6体なら、魔神以外の全仲間を破壊し魔神を召喚',
   trigger:'on_full_board', unique:'djinn_replace'},

  {id:'r_bear',  name:'熊の契約',   kind:'summon',grade:1,
   atkPerGrade:8, hpPerGrade:10,
   summon:{name:'熊',atk:0,hp:0,icon:'🐻'},
   desc:'ターン開始時、敵の数が自分の場の3倍以上なら熊を召喚',
   trigger:'on_outnumbered'},

  {id:'r_wall',  name:'城壁の契約', kind:'summon',grade:1,
   atkPerGrade:0, hpPerGrade:20,
   summon:{name:'城壁',atk:0,hp:0,icon:'🏰'},
   desc:'戦闘開始時、城壁を召喚（ATK=最高味方ATK）。守護：攻撃を受けた時、他の仲間が反撃',
   trigger:'battle_start', guardian:true, unique:'wall_copy_atk'},

  // ── PASSIVE RINGS ──
  {id:'r_needle',    name:'針の契約',   kind:'passive',grade:1,
   desc:'ターン開始時、ランダムな敵に1ダメを与える。これをGrade回繰り返す（複数の敵に当たる）',unique:'needle'},

  {id:'r_adj_cnt',   name:'隣接の契約', kind:'passive',grade:1,legend:true,
   desc:'隣接する召喚契約の召喚数+1（★固定）',unique:'adj_count'},

  {id:'r_lifereg',   name:'生命の契約', kind:'passive',grade:1,
   desc:'戦闘終了時ライフ+Grade',unique:'life_reg'},

  {id:'r_fury',      name:'憤激の契約', kind:'passive',grade:1,
   desc:'キャラがダメージを受けるたび全仲間ATK+Grade',unique:'fury_passive'},

  {id:'r_extra',     name:'行動の契約', kind:'passive',grade:1,
   desc:'プレイヤーの行動回数+Grade',unique:'extra_action'},

  {id:'r_buff_adj',  name:'増幅の契約', kind:'passive',grade:1,
   desc:'戦闘終了時、隣接する召喚契約の仲間ATK/HP+1（永続累積）',unique:'buff_adj'},

  {id:'r_shared_def',name:'共鳴の契約', kind:'passive',grade:1,
   desc:'同名仲間が複数いる場合、それら全員にATK+5/HP+5×Grade',unique:'shared_def'},

  {id:'r_poison',    name:'毒沼の契約', kind:'passive',grade:1,
   desc:'ダメージを受けた敵に毒付与（HP-3/T、重複可）',unique:'poison_aura'},

  {id:'r_catalyst',  name:'触媒の契約', kind:'passive',grade:1,
   desc:'毒のダメージが(Grade+1)倍になる',unique:'catalyst'},

  // ── LEGEND PASSIVE RINGS ──
  {id:'r_farsight',     name:'遠見の契約',   kind:'passive',grade:1,legend:true,
   desc:'鍛冶屋・休息所の出現率+50%。鍛冶屋と休息所ですべての選択肢を選べる',unique:'farsight'},

  {id:'r_mana_cycle',   name:'魔力循環の契約', kind:'passive',grade:1,legend:true,
   desc:'装備中の杖のチャージが減らなくなる',unique:'mana_cycle'},

  {id:'r_catalyst_ring',name:'触媒環の契約', kind:'passive',grade:1,legend:true,
   desc:'消耗品の効果が2倍になる',unique:'catalyst_ring'},

  {id:'r_solitude',     name:'孤高の契約',   kind:'passive',grade:1,legend:true,
   desc:'盤面に仲間が1体だけの時、その仲間のATKとHPを2倍にする',unique:'solitude'},

  {id:'r_trials',       name:'試行の契約',   kind:'passive',grade:1,legend:true,
   desc:'4回リロールするたびにランダムな契約を1グレードアップする',unique:'trials'},

  {id:'r_patience',     name:'我慢の契約',   kind:'passive',grade:1,legend:true,
   desc:'「戦闘開始時」の契約効果をターン開始時にも発動する',unique:'patience'},

  // ── LEGEND SUMMON RINGS ──
  {id:'r_mirror',       name:'鏡の契約',     kind:'summon', grade:1,legend:true,
   summon:{name:'鏡像',atk:0,hp:0,icon:'🪞'},
   desc:'戦闘開始時、右の契約のコピーになる（右の契約の後に処理）',
   trigger:'battle_start', unique:'mirror'},
];
