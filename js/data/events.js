// ═══════════════════════════════════════
// events.js — 敵・エンチャント・祠イベント定義
// ═══════════════════════════════════════

// 通常敵プール（シートの「敵専用」列でも管理）
// パワー/ライフは stat table で算出するためここでは定義しない
const ENEMY_POOL=[
  // ── G1（1-5階）──
  {name:'ゴブリン',          grade:1, icon:'👺', keywords:[],             race:'亜人'},
  {name:'オーク',            grade:1, icon:'👹', keywords:['反撃'],       race:'亜人'},
  {name:'グール',            grade:1, icon:'🧟', keywords:[],             race:'不死'},
  {name:'バンシー',          grade:1, icon:'👻', keywords:['呪詛1'],      race:'不死'},
  {name:'ジャイアントラット',grade:1, icon:'🐀', keywords:[],             race:'獣'},
  {name:'マッドキャット',    grade:1, icon:'🐱', keywords:['狩人'],       race:'獣'},
  {name:'ウィスプ',          grade:1, icon:'🔮', keywords:[],             race:'精霊'},
  {name:'ピクシー',          grade:1, icon:'🧚', keywords:[],             race:'精霊'},
  // ── G2（6-10階）──
  {name:'ファイアブレス',    grade:2, icon:'🔥', keywords:[],             race:'竜'},
  {name:'ポイズンミスト',    grade:2, icon:'☁️', keywords:['浸食3'],      race:'精霊'},
  {name:'サテュロス',        grade:2, icon:'🐐', keywords:[],             race:'亜人'},
  {name:'ダークエルフ',      grade:2, icon:'🧝', keywords:['狩人'],       race:'亜人'},
  {name:'カースドアーマー',  grade:2, icon:'🪖', keywords:['呪詛2'],      race:'不死'},
  {name:'ボーンナイト',      grade:2, icon:'💀', keywords:[],             race:'不死'},
  {name:'ダイアウルフ',      grade:2, icon:'🐺', keywords:['二段攻撃'],   race:'獣'},
  {name:'ヒポグリフ',        grade:2, icon:'🦅', keywords:[],             race:'竜'},
  // ── G3（11-15階）──
  {name:'ケルピー',          grade:3, icon:'🐴', keywords:[],             race:'獣'},
  {name:'スプリガン',        grade:3, icon:'🧌', keywords:['シールド'],   race:'精霊'},
  {name:'シーサーペント',    grade:3, icon:'🐍', keywords:[],             race:'竜'},
  {name:'ブラッドロード',    grade:3, icon:'🩸', keywords:['邪眼5'],      race:'悪魔'},
  {name:'グラディエーター',  grade:3, icon:'⚔️', keywords:['反撃'],       race:'亜人'},
  {name:'ベルセルク',        grade:3, icon:'💢', keywords:[],             race:'亜人'},
  {name:'デスナイト',        grade:3, icon:'🪖', keywords:[],             race:'不死'},
  {name:'スケルトンキング',  grade:3, icon:'👑', keywords:['結束3'],      race:'不死'},
  // ── G4（16-20階）──
  {name:'マンティコア',      grade:4, icon:'🦁', keywords:[],             race:'獣'},
  {name:'カトブレパス',      grade:4, icon:'🐂', keywords:['邪眼8'],      race:'獣'},
  {name:'イフリート',        grade:4, icon:'🔥', keywords:[],             race:'悪魔'},
  {name:'ニンフ',            grade:4, icon:'🌸', keywords:['加護'],       race:'精霊'},
  {name:'ティアマト',        grade:4, icon:'🐉', keywords:['全体攻撃'],   race:'竜'},
  {name:'グレーターデーモン',grade:4, icon:'😈', keywords:['魂喰らい3'],  race:'悪魔'},
  {name:'サイクロプス',      grade:4, icon:'👁️', keywords:[],             race:'亜人'},
  {name:'ヘカトンケイル',    grade:4, icon:'💪', keywords:['シールド'],   race:'亜人'},
  {name:'アポリオン',        grade:4, icon:'⚫', keywords:[],             race:'悪魔'},
  {name:'グリムリーパー',    grade:4, icon:'💀', keywords:['三段攻撃'],   race:'不死'},
  {name:'サンダーバード',    grade:4, icon:'⚡', keywords:['反撃'],       race:'竜'},
  {name:'アークエンジェル',  grade:4, icon:'😇', keywords:['加護'],       race:'精霊'},
  {name:'エンシェントドラゴン',grade:4,icon:'🐲',keywords:[],             race:'竜'},
  {name:'カオスドラゴン',    grade:4, icon:'🌀', keywords:['全体攻撃'],   race:'竜'},
  {name:'アークデーモン',    grade:4, icon:'👿', keywords:[],             race:'悪魔'},
  {name:'メフィスト',        grade:4, icon:'🔮', keywords:['魂喰らい4'],  race:'悪魔'},
];

// エンチャントの種類（指輪に付与できる）— {id, effect} 形式
const ENCHANT_TYPES=[
  {id:'強壮',   effect:'HP+5×Grade'},
  {id:'凶暴',   effect:'ATK+5×Grade'},
  {id:'増殖',   effect:'召喚数+Grade'},
  {id:'再生',   effect:'死亡時1度HP50%で復活'},
  {id:'猛毒',   effect:'与ダメ時に敵へ毒+3/T'},
  {id:'憎悪',   effect:'召喚時にヘイト付与'},
];

// 秘術（ヒーローパワー）定義 — ゲーム開始時に1つ選択
// type:'active'  = 報酬フェイズに1回使用可能
// type:'passive' = 常時効果
const ARCANA_POOL=[
  {id:'寵愛',     cost:1, type:'active',  icon:'💫', desc:'一番左の報酬カードを無料で獲得する（その種類の枠に空きが必要）'},
  {id:'祈祷',     cost:1, type:'active',  icon:'🙏', desc:'報酬に並ぶランダムな契約1枚のグレードを1上げる（金額はそのまま）'},
  {id:'集中',     cost:1, type:'active',  icon:'🎯', desc:'報酬の契約カード1枚を選ぶ。自分の所持する契約と同種（ランダム）に変化させる'},
  {id:'煉獄',     cost:1, type:'active',  icon:'🔥', desc:'報酬のカード1枚をプールから抹消し「魂の残滓」消耗品に置き換える'},
  {id:'信頼',     cost:2, type:'active',  icon:'🤝', desc:'召喚契約を1つ選ぶ。その仲間の基本ATK/HPを+1する（永続累積・使用ごとに効果+1）'},
  {id:'観察',     cost:1, type:'active',  icon:'👁️', desc:'次の戦闘に祭壇か休息所が確定で出現する'},
  {id:'血盟',     cost:0, type:'active',  icon:'🩸', desc:'1ダメージを受けて1ソウルを得る'},
  {id:'熟練',     cost:0, type:'passive', icon:'📚', desc:'報酬枠が1つ追加される（消耗品のみ）'},
  {id:'強欲',     cost:0, type:'passive', icon:'💰', desc:'報酬フェイズ終了時に残ったソウルを最大3まで次の戦闘開始時に持ち越す'},
  {id:'還魂促進', cost:0, type:'passive', icon:'♻️', desc:'杖と消耗品も1ソウルで還魂できるようになる'},
];

// 祠イベント定義
// eff キー一覧（doShrine で処理）:
//   'gold_5'      — 金+5
//   'gold_10'     — 金+10
//   'heal_5'      — ライフ+5
//   'ring_up'     — ライフ-2で指輪をグレードアップ
//   'fog'         — 次の戦闘で移動マスが霧になる
//   'random_card' — ランダムなカードを1枚入手
const SHRINE_EVENTS=[
  {name:'幸運のコイン', desc:'足元に金貨が転がっていた。',                          eff:'gold_5',      res:'ソウル+5を獲得した'},
  {name:'癒しの泉',     desc:'澄んだ泉が傷を癒してくれる。',                        eff:'heal_5',      res:'ライフ+5'},
  {name:'血の契約',     desc:'「血を捧げれば力を与えよう」ライフ-2で指輪を1段階強化。', eff:'ring_up',     res:''},
  {name:'謎の霧',       desc:'次の戦闘では移動マスが霧に覆われ最初は見えない。',      eff:'fog',         res:'次の戦闘に霧が発生する'},
  {name:'賢者の贈り物', desc:'棚に見知らぬカードが一枚。',                          eff:'random_card', res:''},
  {name:'古い祭壇',     desc:'誰かの形見が置かれていた。',                          eff:'gold_10',     res:'ソウル+10を獲得した'},
];
