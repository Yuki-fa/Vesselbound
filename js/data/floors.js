// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦が発生する階層
const BOSS_FLOORS=[4,9,14,19];

// ボス戦のシールド数（floor番号をキーに）
const BOSS_SHIELD={5:3,10:5,15:8,20:12};

// ── 司令官杖プール（汎用）──────────────────────────────────
// commanderEffect: 敵が使う時の効果
// playerEffect:   プレイヤーが複製した時の効果（spell.jsのeffect名）
const COMMANDER_WAND_POOL=[
  {id:'cw_buff',   name:'強化の杖',   commanderEffect:'enemy_buff',   playerEffect:'rally',     type:'wand',grade:1,baseUses:3,desc:'全敵ATK+X'},
  {id:'cw_heal',   name:'鼓舞の杖',   commanderEffect:'enemy_heal',   playerEffect:'heal_ally', type:'wand',grade:1,baseUses:3,desc:'ランダムな敵HP+X',needsAlly:true},
  {id:'cw_summon', name:'召喚の杖',   commanderEffect:'enemy_summon', playerEffect:'golem',     type:'wand',grade:1,baseUses:3,desc:'敵を1体追加'},
  {id:'cw_shield', name:'シールドの杖',commanderEffect:'enemy_shield', playerEffect:'shield_ally',type:'wand',grade:1,baseUses:3,desc:'対象の仲間にシールド+1',needsAlly:true},
  {id:'cw_hate',   name:'ヘイトの杖', commanderEffect:'enemy_hate',   playerEffect:'hate',      type:'wand',grade:1,baseUses:3,desc:'ランダムな仲間にヘイト付与',needsAlly:true},
];

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
// wands: 司令官が使う杖のID（COMMANDER_WAND_POOL参照）
const _BOSS_WANDS=['cw_buff','cw_heal','cw_shield','cw_hate','cw_summon'];

const FLOOR_DATA=[null,
  {power:18, grade:1,wands:[]},
  {power:18, grade:1,wands:['cw_shield']},
  {power:18, grade:1,wands:['cw_summon']},
  {power:23, grade:1,wands:['cw_heal']},
  {power:31, grade:1,boss:true, wands:_BOSS_WANDS},
  {power:180,grade:2,wands:['cw_hate']},
  {power:220,grade:2,wands:['cw_shield']},
  {power:270,grade:2,wands:['cw_summon']},
  {power:340,grade:2,wands:['cw_heal']},
  {power:600,grade:2,boss:true, wands:_BOSS_WANDS},
  {power:450,grade:3,wands:['cw_hate']},
  {power:450,grade:3,wands:['cw_shield']},
  {power:450,grade:3,wands:['cw_summon']},
  {power:585,grade:3,wands:['cw_heal']},
  {power:765,grade:3,boss:true, wands:_BOSS_WANDS},
  {power:4050,grade:4,wands:['cw_hate','cw_buff']},
  {power:4050,grade:4,wands:['cw_shield','cw_summon']},
  {power:4050,grade:4,wands:['cw_summon','cw_buff']},
  {power:5265,grade:4,wands:['cw_heal','cw_hate']},
  {power:6885,grade:4,boss:true, wands:_BOSS_WANDS},
];

// マップノードの種類定義
const NODE_TYPES={
  battle:{icon:'⚔️', label:'戦闘',    desc:'次の敵と戦う',                                       cls:'t-battle'},
  smithy:{icon:'⛩️', label:'祭壇',    desc:'全仲間シールド付与 / 魔術レベル+3 / ランダム指輪1つ', cls:'t-smithy'},
  rest:  {icon:'🏕️', label:'宿屋',    desc:'全仲間±0/+5 / 行動権+1 / ランダムなネームド1人',      cls:'t-rest'},
  chest: {icon:'📦', label:'宝箱',    desc:'カードを1枚獲得',                                    cls:'t-chest'},
  boss:  {icon:'💀', label:'ボス戦',  desc:'固定強敵との決戦',                                   cls:'t-boss'},
  shop:  {icon:'🏪', label:'商店',    desc:'指輪を購入できる',                                   cls:'t-shop'},
};
