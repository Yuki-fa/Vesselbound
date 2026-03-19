// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

// ボス戦が発生する階層
const BOSS_FLOORS=[4,9,14,19];

// ボス戦のシールド数（floor番号をキーに）
const BOSS_SHIELD={5:3,10:5,15:8,20:12};

// 各階層の敵パワー・グレード設定（index=階層番号、0はnull）
const _BOSS_ACTIONS=['強化','鼓舞','シールド','ヘイト','召喚'];

const FLOOR_DATA=[null,
  {power:18, grade:1,actions:['ヘイト']},
  {power:18, grade:1,actions:['シールド']},
  {power:18, grade:1,actions:['召喚']},
  {power:23, grade:1,actions:['鼓舞']},
  {power:31, grade:1,boss:true, actions:_BOSS_ACTIONS},
  {power:180,grade:2,actions:['ヘイト']},
  {power:220,grade:2,actions:['シールド']},
  {power:270,grade:2,actions:['召喚']},
  {power:340,grade:2,actions:['鼓舞']},
  {power:600,grade:2,boss:true, actions:_BOSS_ACTIONS},
  {power:450,grade:3,actions:['ヘイト']},
  {power:450,grade:3,actions:['シールド']},
  {power:450,grade:3,actions:['召喚']},
  {power:585,grade:3,actions:['鼓舞']},
  {power:765,grade:3,boss:true, actions:_BOSS_ACTIONS},
  {power:4050,grade:4,actions:['ヘイト']},
  {power:4050,grade:4,actions:['シールド']},
  {power:4050,grade:4,actions:['召喚']},
  {power:5265,grade:4,actions:['鼓舞']},
  {power:6885,grade:4,boss:true, actions:_BOSS_ACTIONS},
];

// マップノードの種類定義
const NODE_TYPES={
  battle:{icon:'⚔️', label:'戦闘',    desc:'次の敵と戦う',                          cls:'t-battle'},
  smithy:{icon:'⚒️', label:'鍛冶屋',  desc:'指輪強化かエンチャント付与（1つ選択）', cls:'t-smithy'},
  rest:  {icon:'🏕️', label:'休息所',  desc:'回復か消耗品か杖リチャージ（1つ選択）', cls:'t-rest'},
  chest: {icon:'📦', label:'宝箱',    desc:'カードを1枚獲得',                       cls:'t-chest'},
  boss:  {icon:'💀', label:'ボス戦',  desc:'固定強敵との決戦',                      cls:'t-boss'},
};
