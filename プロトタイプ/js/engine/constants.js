// ═══════════════════════════════════════
// constants.js — ゲーム全体で使う固定値
// ═══════════════════════════════════════

// グレード倍率（index=グレード番号、G1=×1 〜 G5=★ の線形）
const GRADE_MULT=[0,1,2,3,4,5,6,7,8,9,10];

// 召喚契約スタッツ用グレード係数（G1=1, G2=3, G3=6, G4=14, G5=30, G6=60）
// 計算式: 基本ATK + 上昇ATK × GRADE_COEFF[grade]
const GRADE_COEFF=[0,1,3,6,14,30,60];

// グレード上限（G6=★★★★★★）
const MAX_GRADE=6;

// 戦場スロット上限
const MAX_ALLIES=14;
const MAX_ENEMIES=14;
const ENEMY_FRONT_SLOTS=7;
const ENEMY_REAR_SLOTS=7;
const MAX_UNITS=MAX_ENEMIES;

// 報酬カード枚数の上限（ユニーク指輪等で将来拡張できるよう定数で管理）
const MAX_REWARD_CARDS=6;

// カード出現率モード
// NORMAL: 既存の報酬グレード上限を使用
// EXPERIMENTAL: 階層別テーブルでG1〜G5を抽選
const CARD_APPEARANCE_MODES={
  NORMAL:'NORMAL',
  EXPERIMENTAL:'EXPERIMENTAL',
};
let CARD_APPEARANCE_MODE=CARD_APPEARANCE_MODES.NORMAL;

const EXPERIMENTAL_GRADE_WEIGHTS=[
  null,
  [97.45,0,2,0.5,0.05],
  [97.45,0,2,0.5,0.05],
  [50,47.4,2,0.5,0.1],
  [50,47.35,2,0.5,0.15],
  [48,49.3,2,0.5,0.2],
  [45,52.25,2,0.5,0.25],
  [32,32,35.4,0.5,0.1],
  [32,32,35.3,0.5,0.2],
  [30,30,38.75,1,0.25],
  [28,29,41.65,1,0.35],
  [24,24,24,27.5,0.5],
  [23,23,23,30.25,0.75],
  [22,22,22,32.75,1.25],
  [21,21,21,34.5,2.5],
];
const EXPERIMENTAL_GRADE_WEIGHTS_15_PLUS=[23.75,23.75,23.75,23.75,5];

// 報酬グレードアップ費用（loader.js でシートから上書き）
const GRADE_UP_COSTS=[8,18,30,45,62];

// 手札スロット数（初期値。ランタイムは G.ringSlots / G.wandSlots / G.consumSlots を使用）
const RING_SLOTS=5;
const WAND_SLOTS=2;
const CONSUM_SLOTS=2;
