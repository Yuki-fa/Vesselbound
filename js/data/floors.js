// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦が発生する階層
const BOSS_FLOORS=[4,9,14,19];

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
// enemyRings:  敵オーナーが所持する指輪（オブジェクト配列）
// enemyHand:   敵オーナーが所持する杖・アイテム（オブジェクト配列）
// magicLevel:  敵オーナーの魔術レベル（instakill等で参照）
// mult: 階層補正値  通常敵ATK = round(rand(def.baseAtk)*mult)  エリート×1.5  ボス×2.0
const FLOOR_DATA=[null,
  {grade:1,mult:1.0, magicLevel:3},
  {grade:1,mult:1.0, magicLevel:3},
  {grade:1,mult:1.1, magicLevel:4},
  {grade:1,mult:1.2, magicLevel:4},
  {grade:1,mult:1.3, boss:true,  magicLevel:5},
  {grade:2,mult:2.0, magicLevel:6},
  {grade:2,mult:2.0, magicLevel:6},
  {grade:2,mult:2.2, magicLevel:7},
  {grade:2,mult:2.4, magicLevel:7},
  {grade:2,mult:2.8, boss:true,  magicLevel:8},
  {grade:3,mult:4.0, magicLevel:9},
  {grade:3,mult:4.0, magicLevel:9},
  {grade:3,mult:4.3, magicLevel:10},
  {grade:3,mult:4.6, magicLevel:11},
  {grade:3,mult:5.0, boss:true,  magicLevel:12},
  {grade:4,mult:8.0, magicLevel:13},
  {grade:4,mult:8.5, magicLevel:14},
  {grade:4,mult:9.0, magicLevel:15},
  {grade:4,mult:9.5, magicLevel:16},
  {grade:4,mult:10.0,boss:true,  magicLevel:18},
];

// マップノードの種類定義
const NODE_TYPES={
  battle:{icon:'⚔️', label:'森の奥へ',   desc:'先へ進もう',                              cls:'t-battle'},
  smithy:{icon:'⛩️', label:'洞窟の奥へ', desc:'貴重なアイテムがありそうだ',               cls:'t-smithy'},
  rest:  {icon:'💧', label:'湖の畔へ',   desc:'指輪がありそうだ',                         cls:'t-rest'},
  chest: {icon:'📦', label:'宝箱',       desc:'カードを1枚獲得',                          cls:'t-chest'},
  boss:  {icon:'💀', label:'ボス戦',     desc:'固定強敵との決戦',                         cls:'t-boss'},
  shop:  {icon:'🛒', label:'行商',       desc:'指輪を購入できる',                         cls:'t-shop'},
};
