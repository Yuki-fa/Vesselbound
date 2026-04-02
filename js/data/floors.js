// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦が発生する階層
const BOSS_FLOORS=[4,9,14,19];

// ── 司令官杖プール（汎用）──────────────────────────────────
// commanderEffect: 敵が使う時の効果
// playerEffect:   プレイヤーが複製した時の効果（spell.jsのeffect名）
const COMMANDER_WAND_POOL=[
  {id:'cw_buff',   name:'強化の杖',   commanderEffect:'enemy_buff',   playerEffect:'rally',     type:'wand',grade:1,baseUses:3,desc:'全敵ATK+X'},
  {id:'cw_heal',   name:'鼓舞の杖',   commanderEffect:'enemy_heal',   playerEffect:'heal_ally', type:'wand',grade:1,baseUses:3,desc:'ランダムな敵HP+X',needsAlly:true},
  {id:'cw_summon', name:'召喚の杖',   commanderEffect:'enemy_summon', playerEffect:'golem',     type:'wand',grade:1,baseUses:3,desc:'敵を1体追加'},
  {id:'cw_shield', name:'シールドの杖',commanderEffect:'enemy_shield', playerEffect:'shield_ally',type:'wand',grade:1,baseUses:3,desc:'対象の仲間にシールド+1',needsAlly:true},
  {id:'cw_hate',   name:'標的の杖', commanderEffect:'enemy_hate',   playerEffect:'hate',      type:'wand',grade:1,baseUses:3,desc:'ランダムな仲間に標的付与',needsAlly:true},
];

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
// wands: 司令官が使う杖のID（COMMANDER_WAND_POOL参照）
const _BOSS_WANDS=['cw_buff','cw_heal','cw_shield','cw_hate','cw_summon'];

// mult: 階層補正値  通常敵ATK = round(rand(def.baseAtk)*mult)  エリート×1.5  ボス×2.0
const FLOOR_DATA=[null,
  {grade:1,mult:1.0, wands:[]},
  {grade:1,mult:1.0, wands:['cw_shield']},
  {grade:1,mult:1.1, wands:['cw_summon']},
  {grade:1,mult:1.2, wands:['cw_heal']},
  {grade:1,mult:1.3, boss:true, wands:_BOSS_WANDS},
  {grade:2,mult:2.0, wands:['cw_hate']},
  {grade:2,mult:2.0, wands:['cw_shield']},
  {grade:2,mult:2.2, wands:['cw_summon']},
  {grade:2,mult:2.4, wands:['cw_heal']},
  {grade:2,mult:2.8, boss:true, wands:_BOSS_WANDS},
  {grade:3,mult:4.0, wands:['cw_hate']},
  {grade:3,mult:4.0, wands:['cw_shield']},
  {grade:3,mult:4.3, wands:['cw_summon']},
  {grade:3,mult:4.6, wands:['cw_heal']},
  {grade:3,mult:5.0, boss:true, wands:_BOSS_WANDS},
  {grade:4,mult:8.0, wands:['cw_hate','cw_buff']},
  {grade:4,mult:8.5, wands:['cw_shield','cw_summon']},
  {grade:4,mult:9.0, wands:['cw_summon','cw_buff']},
  {grade:4,mult:9.5, wands:['cw_heal','cw_hate']},
  {grade:4,mult:10.0,boss:true, wands:_BOSS_WANDS},
];

// マップノードの種類定義
const NODE_TYPES={
  battle:{icon:'⚔️', label:'戦闘',   desc:'次の敵と戦う',                          cls:'t-battle'},
  smithy:{icon:'⛩️', label:'祭壇',   desc:'魔術レベル+3 / 行動権+1 / 全仲間±0/+5', cls:'t-smithy'},
  chest: {icon:'📦', label:'宝箱',   desc:'カードを1枚獲得',                       cls:'t-chest'},
  boss:  {icon:'💀', label:'ボス戦', desc:'固定強敵との決戦',                      cls:'t-boss'},
  shop:  {icon:'🛒', label:'行商',   desc:'指輪を購入できる',                      cls:'t-shop'},
};
