// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦直前の階層（シート読込失敗時のフォールバック）
const BOSS_FLOORS=[];

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
// mult: 階層補正値  通常敵ATK/HP = round(rand(base)*mult)
// 「階層レベル」シートと同内容（シート読込失敗時のフォールバック）
const FLOOR_DATA=[null,
  {grade:1,mult:1.0,map:1,deepLevel:1},
  {grade:1,mult:1.0,map:1,deepLevel:2},
  {grade:1,mult:1.1,map:1,deepLevel:3},
  {grade:1,mult:1.2,map:1,deepLevel:4},
  {grade:1,mult:1.4,map:1,deepLevel:5},
  {grade:1,mult:1.7,map:1,deepLevel:6},
  {grade:2,mult:1.2,map:2,deepLevel:1},
  {grade:2,mult:1.4,map:2,deepLevel:2},
  {grade:2,mult:1.7,map:2,deepLevel:3},
  {grade:2,mult:2.1,map:2,deepLevel:4},
  {grade:2,mult:2.6,map:2,deepLevel:5},
  {grade:2,mult:3.2,map:2,deepLevel:6},
  {grade:3,mult:1.4,map:3,deepLevel:1},
  {grade:3,mult:1.7,map:3,deepLevel:2},
  {grade:3,mult:2.1,map:3,deepLevel:3},
  {grade:3,mult:2.6,map:3,deepLevel:4},
  {grade:3,mult:3.2,map:3,deepLevel:5},
  {grade:3,mult:4.0,map:3,deepLevel:6},
  {grade:4,mult:1.7,map:4,deepLevel:1},
  {grade:4,mult:2.1,map:4,deepLevel:2},
  {grade:4,mult:2.6,map:4,deepLevel:3},
  {grade:4,mult:3.2,map:4,deepLevel:4},
  {grade:4,mult:4.0,map:4,deepLevel:5},
  {grade:4,mult:5.0,map:4,deepLevel:6},
];
FLOOR_DATA._deepLevelsPerMap=6;
if(typeof window!=='undefined'){
  window.MAP_DEEP_LEVEL_DATA={
    1:{1:{grade:1,mult:1.0},2:{grade:1,mult:1.0},3:{grade:1,mult:1.1},4:{grade:1,mult:1.2},5:{grade:1,mult:1.4},6:{grade:1,mult:1.7}},
    2:{1:{grade:2,mult:1.2},2:{grade:2,mult:1.4},3:{grade:2,mult:1.7},4:{grade:2,mult:2.1},5:{grade:2,mult:2.6},6:{grade:2,mult:3.2}},
    3:{1:{grade:3,mult:1.4},2:{grade:3,mult:1.7},3:{grade:3,mult:2.1},4:{grade:3,mult:2.6},5:{grade:3,mult:3.2},6:{grade:3,mult:4.0}},
    4:{1:{grade:4,mult:1.7},2:{grade:4,mult:2.1},3:{grade:4,mult:2.6},4:{grade:4,mult:3.2},5:{grade:4,mult:4.0},6:{grade:4,mult:5.0}},
  };
}
