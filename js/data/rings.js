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
   desc:'生存時：全ての味方のATK+Grade\n召喚トリガー：戦闘開始時',
   trigger:'battle_start', unique:'wolf_aura'},

  {id:'r_hyena', name:'腐臭の契約', kind:'summon',grade:1,
   atkPerGrade:1, hpPerGrade:2,
   summon:{name:'ハイエナ',atk:0,hp:0,icon:'🦴'},
   desc:'召喚トリガー：ターン開始時',
   trigger:'turn_start'},

  {id:'r_flame', name:'鬼火の契約', kind:'summon',grade:1,
   atkPerGrade:4, hpPerGrade:1,
   summon:{name:'鬼火',atk:0,hp:0,icon:'🔥'},
   desc:'召喚トリガー：プレイヤーフェイズ中に鬼火以外の味方が召喚された時',
   trigger:'on_summon'},

  {id:'r_stone', name:'石像の契約', kind:'summon',grade:1,
   atkPerGrade:4, hpPerGrade:5,
   summon:{name:'石像',atk:0,hp:0,icon:'🗿'},
   desc:'死亡時：すべての味方のHP+Grade×2\n召喚トリガー：戦闘開始時',
   trigger:'battle_start', onDeath:'stone_death'},

  {id:'r_dragon',name:'竜の契約',   kind:'summon',grade:1,
   atkPerGrade:15, hpPerGrade:20,
   summon:{name:'竜',atk:0,hp:0,icon:'🐉'},
   desc:'召喚トリガー：キャラクターが15回ダメージを受けた時',
   trigger:'on_damage_count', triggerCount:15},

  {id:'r_shadow',name:'影の契約',   kind:'summon',grade:1,
   atkPerGrade:10, hpPerGrade:10,
   summon:{name:'影',atk:0,hp:0,icon:'👻'},
   desc:'召喚トリガー：味方が10回死んだ時',
   trigger:'on_death_count', triggerCount:10, unique:'shadow_copy'},

  {id:'r_rat',   name:'鼠の契約',   kind:'summon',grade:1,
   atkPerGrade:1, hpPerGrade:1,
   summon:{name:'鼠',atk:0,hp:0,icon:'🐀'},
   desc:'召喚時：更に2体召喚する。\n召喚トリガー：戦闘開始時',
   trigger:'battle_start', count:1, unique:'rat_extra'},

  {id:'r_skel',  name:'骸骨の契約', kind:'summon',grade:1,
   atkPerGrade:1, hpPerGrade:1,
   summon:{name:'骸骨',atk:0,hp:0,icon:'💀'},
   desc:'再生\n召喚トリガー：味方が5体死んだ時',
   trigger:'on_death_count', triggerCount:5, regen:true},

  {id:'r_djinn', name:'魔神の契約', kind:'summon',grade:1,
   atkPerGrade:15, hpPerGrade:15,
   summon:{name:'魔神',atk:0,hp:0,icon:'👿'},
   desc:'召喚時：全ての味方を破壊する。\n召喚トリガー：魔神以外の味方が6体いる時',
   trigger:'on_full_board', unique:'djinn_replace'},

  {id:'r_bear',  name:'熊の契約',   kind:'summon',grade:1,
   atkPerGrade:8, hpPerGrade:10,
   summon:{name:'熊',atk:0,hp:0,icon:'🐻'},
   desc:'召喚トリガー：敵の数が味方の3倍以上のターン開始時',
   trigger:'on_outnumbered'},

  {id:'r_wall',  name:'城壁の契約', kind:'summon',grade:1,
   atkPerGrade:0, hpPerGrade:20,
   summon:{name:'城壁',atk:0,hp:0,icon:'🏰'},
   desc:'生存時：このキャラクターの攻撃力は最も高い味方の攻撃力に等しい。\n召喚トリガー：戦闘開始時',
   trigger:'battle_start', guardian:true, unique:'wall_copy_atk'},

  // ── PASSIVE RINGS ──
  {id:'r_needle',    name:'針の指輪',   kind:'passive',grade:1,
   desc:'ターン開始時、全ての敵に1ダメージを与える。',unique:'needle'},

  {id:'r_adj_cnt',   name:'隣接の契約', kind:'passive',grade:1,legend:true,
   desc:'隣接する召喚契約の召喚数+1',unique:'adj_count'},

  {id:'r_lifereg',   name:'生命の契約', kind:'passive',grade:1,
   desc:'戦闘終了時ライフ+Grade',unique:'life_reg'},

  {id:'r_fury',      name:'憤激の指輪', kind:'passive',grade:1,
   desc:'戦闘開始時、すべての仲間に+3/+3を付与する。',unique:'fury_start'},

  {id:'r_extra',     name:'行動の契約', kind:'passive',grade:1,
   desc:'プレイヤーの行動回数+Grade',unique:'extra_action'},

  {id:'r_buff_adj',  name:'増幅の契約', kind:'passive',grade:1,
   desc:'戦闘終了時、隣接する召喚契約の仲間ATK/HP+1（永続累積）',unique:'buff_adj'},

  {id:'r_shared_def',name:'共鳴の契約', kind:'passive',grade:1,
   desc:'同名仲間が複数いる場合、全員にATK+5/HP+5×Grade',unique:'shared_def'},

  {id:'r_poison',    name:'毒沼の契約', kind:'passive',grade:1,
   desc:'ダメージを受けた敵に毒付与（HP-3×Grade/ターン、重複可）',unique:'poison_aura'},

  {id:'r_catalyst',  name:'触媒の契約', kind:'passive',grade:1,
   desc:'毒ダメージ×(Grade+1)倍',unique:'catalyst'},

  // ── LEGEND PASSIVE RINGS ──
  {id:'r_farsight',     name:'遠見の契約',   kind:'passive',grade:1,legend:true,
   desc:'鍛冶屋、休息所の出現率が1.5倍になり、すべての選択肢を選べるようになる。',unique:'farsight'},

  {id:'r_mana_cycle',   name:'魔力循環の契約', kind:'passive',grade:1,legend:true,
   desc:'杖のチャージが減らなくなる。',unique:'mana_cycle'},

  {id:'r_catalyst_ring',name:'触媒環の契約', kind:'passive',grade:1,legend:true,
   desc:'消耗品の効果が2倍になる。',unique:'catalyst_ring'},

  {id:'r_solitude',     name:'孤高の契約',   kind:'passive',grade:1,legend:true,
   desc:'盤面に仲間が1体だけの時、その仲間のATKとHPを2倍にする。',unique:'solitude'},

  {id:'r_trials',       name:'試行の契約',   kind:'passive',grade:1,legend:true,
   desc:'4回リロールするたびにランダムな指輪が1グレードアップする。',unique:'trials'},

  {id:'r_patience',     name:'我慢の契約',   kind:'passive',grade:1,legend:true,
   desc:'「戦闘開始時」を「ターン開始時」に変更する。',unique:'patience'},

  // ── LEGEND SUMMON RINGS ──
  {id:'r_mirror',       name:'鏡の契約',     kind:'summon', grade:1,legend:true,
   summon:{name:'鏡像',atk:0,hp:0,icon:'🪞'},
   desc:'戦闘開始時、右の契約のコピーになる。（コピー後に戦闘開始時効果がある場合はこのあとで処理）',
   trigger:'battle_start', unique:'mirror'},
];
