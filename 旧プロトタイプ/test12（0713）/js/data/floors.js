// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦直前の階層（シート読込失敗時のフォールバック）
const BOSS_FLOORS=[4,9,14,19];

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
// mult: 階層補正値  通常敵ATK/HP = round(rand(base)*mult)
// Vesselbound_data.xlsx の「階層データ」シートと同内容（シート読込失敗時のフォールバック）
const FLOOR_DATA=[null,
  {grade:1,mult:1.0},        // 1
  {grade:1,mult:1.0},        // 2
  {grade:1,mult:1.1},        // 3
  {grade:1,mult:1.2},        // 4
  {grade:1,mult:1.4, boss:true},  // 5★ボス
  {grade:2,mult:1.1},        // 6
  {grade:2,mult:1.2},        // 7
  {grade:2,mult:1.4},        // 8
  {grade:2,mult:1.7},        // 9
  {grade:2,mult:2.6, boss:true}, // 10★ボス
  {grade:3,mult:1.2},        // 11
  {grade:3,mult:1.4},        // 12
  {grade:3,mult:1.7},        // 13
  {grade:3,mult:2.1},        // 14
  {grade:3,mult:2.6, boss:true}, // 15★ボス
  {grade:4,mult:1.4},        // 16
  {grade:4,mult:1.7},        // 17
  {grade:4,mult:2.1},        // 18
  {grade:4,mult:2.6},        // 19
  {grade:4,mult:3.2, boss:true}, // 20★ボス（最終）
];
