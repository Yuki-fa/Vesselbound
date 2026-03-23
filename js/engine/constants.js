// ═══════════════════════════════════════
// constants.js — ゲーム全体で使う固定値
// ═══════════════════════════════════════

// グレード倍率（index=グレード番号、G1=×1 〜 G5=★ の線形）
const GRADE_MULT=[0,1,2,3,4,5,6,7,8,9,10];

// グレード上限（G5=★）
const MAX_GRADE=5;

// 報酬カード枚数の上限（ユニーク指輪等で将来拡張できるよう定数で管理）
const MAX_REWARD_CARDS=6;

// 手札スロット数（初期値。ランタイムは G.ringSlots / G.wandSlots / G.consumSlots を使用）
const RING_SLOTS=5;
const WAND_SLOTS=2;
const CONSUM_SLOTS=2;
