// ═══════════════════════════════════════
// constants.js — ゲーム全体で使う固定値
// ═══════════════════════════════════════

// グレード倍率（index=グレード番号）
// G1:×1  G2:×2  G3:×5  G4:×15
const GRADE_MULT=[0,1,2,5,15];

// 杖のグレード倍率
// G1:×1  G2:×1.5  G3:×2.5  G4:×4
const SPELL_GRADE=[0,1,1.5,2.5,4];

// 報酬ランクアップのコスト（累計金額）
const RANK_UP_COSTS=[0,5,15,30,55];

// 手札スロット数（初期値。ランタイムはG.ringSlots / G.wandSlots / G.consumSlotsを使用）
const RING_SLOTS=5;
const WAND_SLOTS=2;
const CONSUM_SLOTS=2;
