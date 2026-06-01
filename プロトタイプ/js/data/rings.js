// ═══════════════════════════════════════
// RING_POOL — 指輪カード定義
// ※ 効果はスプレッドシートの「効果」列で上書き可能
// ═══════════════════════════════════════
const RING_POOL=[

  // ── 通常指輪 ──
  {id:'r_needle',       name:'針の指輪',       kind:'passive', grade:1, rarity:1, cost:4,
   desc:'ターン開始時、全ての敵に現在のターン数分のダメージを与える。', unique:'needle'},

  {id:'r_lifereg',      name:'生命の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'戦闘終了時、全ての味方に±0/+1を与える。', unique:'life_reg'},

  {id:'r_fury',         name:'憤激の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'装備中のみ、すべての味方に+3/±0を与える。', unique:'fury_start'},

  {id:'r_extra',        name:'行動の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'プレイヤーの行動回数が+1される。', unique:'extra_action'},

  {id:'r_bond',         name:'絆の指輪',       kind:'passive', grade:4, rarity:3, cost:4,
   desc:'装備中のみ、全ての味方に「絆」を与える。', unique:'bond'},

  {id:'r_poison',       name:'毒沼の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'ダメージを受けた敵が毒を受けるようになる。', unique:'poison_aura'},

  {id:'r_farsight',     name:'遠見の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'祭壇、商店、宿屋の出現率が2倍になる。', unique:'farsight'},

  {id:'r_mana',         name:'魔導の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'各戦闘中、最初に使用した杖は1回だけチャージが減らない。', unique:'mana_cycle'},

  {id:'r_catalyst',     name:'触媒の指輪',     kind:'passive', grade:4, rarity:3, cost:4,
   desc:'杖の効果が2倍になる。', unique:'catalyst_ring'},

  {id:'r_solitude',     name:'孤高の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'盤面に味方が1体だけの時、その味方のATKとHPを2倍にする。', unique:'solitude'},

  {id:'r_greed',        name:'強欲の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'宝箱の出現率が2倍になる。', unique:'greed'},

  {id:'r_mirror',       name:'鏡の指輪',       kind:'passive', grade:1, rarity:1, cost:4,
   desc:'右隣の指輪と同じ効果を持つ。', unique:'mirror'},

  {id:'r_patience',     name:'我慢の指輪',     kind:'passive', grade:1, rarity:1, cost:4,
   desc:'「戦闘開始時」を「ターン開始時」に変更する。', unique:'patience'},

  // ── ネームド（legend）──
  {id:'r_great_mother', name:'黄金の雫', kind:'passive', grade:1, rarity:3, legend:true,
   desc:'味方のカード効果中の数値が全て+1される。', unique:'great_mother'},

  {id:'r_necromancer', name:'屍術師の指輪', kind:'passive', grade:1, rarity:1, cost:4,
   desc:'戦闘開始時に隣接するマスに4/1のスケルトンを召喚する。', unique:'ring_necromancer'},
  {id:'r_guardian', name:'加護の指輪', kind:'passive', grade:1, rarity:1, cost:3,
   desc:'装甲3', unique:'ring_guardian'},
  {id:'r_ascetic', name:'苦行の指輪', kind:'passive', grade:1, rarity:1, cost:3,
   desc:'ヘイト', unique:'ring_ascetic'},
  {id:'r_healing', name:'治癒の指輪', kind:'passive', grade:1, rarity:1, cost:4,
   desc:'戦闘終了時にライフが5回復する。', unique:'ring_healing'},
  {id:'r_gold', name:'黄金の指輪', kind:'passive', grade:2, rarity:2, cost:5,
   desc:'良いアイテムが出やすくなる。', unique:'ring_gold'},
  {id:'r_toughness', name:'強靭の指輪', kind:'passive', grade:2, rarity:2, cost:5,
   desc:'攻撃で与えたダメージ分、装甲を得る。', unique:'ring_toughness'},
  {id:'r_berserker', name:'狂戦士の指輪', kind:'passive', grade:2, rarity:2, cost:5,
   desc:'両隣の仲間の攻撃力が+4される。', unique:'ring_berserker'},
  {id:'r_counter', name:'反撃の指輪', kind:'passive', grade:2, rarity:2, cost:5,
   desc:'反撃', unique:'ring_counter'},
  {id:'r_rage', name:'激怒の指輪', kind:'passive', grade:2, rarity:2, cost:5,
   desc:'二段攻撃', unique:'ring_rage'},
  {id:'r_secret', name:'秘紋の指輪', kind:'passive', grade:3, rarity:2, cost:6,
   desc:'致命：ソウルを1得る。', unique:'ring_secret'},
  {id:'r_undead', name:'不死の指輪', kind:'passive', grade:3, rarity:2, cost:6,
   desc:'死亡するとターン開始時にライフ1で復活し、この指輪は破壊される。', unique:'ring_undead'},
  {id:'r_madness', name:'狂気の指輪', kind:'passive', grade:3, rarity:3, cost:7,
   desc:'攻撃の対象が敵全体になるが、ターン開始ごとに5ダメージを受ける。', unique:'ring_madness'},
  {id:'r_kishin', name:'鬼神の指輪', kind:'passive', grade:4, rarity:3, cost:8,
   desc:'攻撃後、戦闘終了まで仲間の攻撃力が+8される。', unique:'ring_kishin'},
  {id:'r_storm', name:'嵐の指輪', kind:'passive', grade:4, rarity:3, cost:8,
   desc:'攻撃の対象を敵全体にする。', unique:'ring_storm'},
];
