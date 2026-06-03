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
];
