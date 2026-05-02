// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦直前の階層（シート読込失敗時のフォールバック）
const BOSS_FLOORS=[4,9,14,19];

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
// enemyRings:  敵オーナーが所持する指輪（オブジェクト配列）
// enemyHand:   敵オーナーが所持する杖・アイテム（オブジェクト配列）
// magicLevel:  敵オーナーの魔術レベル（instakill等で参照）
// mult: 階層補正値  通常敵ATK/HP = round(rand(base)*mult)  エリート×1.2  ボス本体×1.5
const FLOOR_DATA=[null,
  {grade:1,mult:1.0, magicLevel:1},        // 1
  {grade:1,mult:1.0, magicLevel:2},        // 2
  {grade:1,mult:1.2, magicLevel:4},        // 3
  {grade:1,mult:1.3, magicLevel:4},        // 4
  {grade:1,mult:1.5, boss:true, magicLevel:5},  // 5★ボス
  {grade:2,mult:1.0, magicLevel:6},        // 6
  {grade:2,mult:1.2, magicLevel:7},        // 7
  {grade:2,mult:1.3, magicLevel:8},        // 8
  {grade:2,mult:1.5, magicLevel:9},        // 9
  {grade:2,mult:1.8, boss:true, magicLevel:10}, // 10★ボス
  {grade:3,mult:1.2, magicLevel:11},       // 11
  {grade:3,mult:1.3, magicLevel:12},       // 12
  {grade:3,mult:1.5, magicLevel:13},       // 13
  {grade:3,mult:1.8, magicLevel:14},       // 14
  {grade:3,mult:2.0, boss:true, magicLevel:15}, // 15★ボス
  {grade:4,mult:1.3, magicLevel:16},       // 16
  {grade:4,mult:1.5, magicLevel:17},       // 17
  {grade:4,mult:1.8, magicLevel:18},       // 18
  {grade:4,mult:2.0, magicLevel:19},       // 19
  {grade:4,mult:2.2, boss:true, magicLevel:20}, // 20★ボス（最終）
];

// マップノードの種類定義
const NODE_TYPES={
  battle:{icon:'⚔️', label:'森の奥へ',   desc:'先へ進もう',                                          cls:'t-battle'},
  smithy:{icon:'⛩️', label:'洞窟の奥へ', desc:'敵が強化されるが、1グレード高いキャラが提示される',   cls:'t-smithy'},
  rest:  {icon:'💧', label:'湖の畔へ',   desc:'敵が強化されるが、敵が指輪を確定ドロップする',        cls:'t-rest'},
  chest:        {icon:'📦', label:'宝箱',     desc:'?', cls:'t-chest'}, // 後方互換
  chest_wand:   {icon:'🪄', label:'杖',       desc:'?', cls:'t-chest'},
  chest_ring:   {icon:'💍', label:'指輪',     desc:'?', cls:'t-chest'},
  chest_item:   {icon:'🧪', label:'アイテム', desc:'?', cls:'t-chest'},
  boss:  {icon:'💀', label:'ボス戦',     desc:'固定強敵との決戦',                                    cls:'t-boss'},
  shop:  {icon:'🛒', label:'行商',       desc:'指輪を購入できる',                                    cls:'t-shop'},
};
