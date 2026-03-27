// ═══════════════════════════════════════
// units.js — キャラクタープール（G1 + ワーム）
// ═══════════════════════════════════════

const UNIT_POOL = [
  // ─── ゴーレム（初期キャラ・非売品） ───
  {id:'c_golem',      name:'ゴーレム',        race:'-',   grade:1, atk:5,  hp:10, cost:0,  unique:false, icon:'🪨', desc:''},

  // ─── G1 通常 ───
  {id:'c_mermaid',    name:'マーメイド',       race:'亜人', grade:1, atk:3,  hp:12, cost:3,  unique:false, icon:'🧜', desc:'自動：戦闘開始時、魔術レベル+1。',       effect:'mermaid_start'},
  {id:'c_skeleton',   name:'スケルトン',       race:'不死', grade:1, atk:6,  hp:3,  cost:3,  unique:false, icon:'💀', desc:'再生3',                                   regen:3},
  {id:'c_zombie',     name:'ゾンビ',           race:'不死', grade:1, atk:1,  hp:12, cost:3,  unique:false, icon:'🧟', desc:'再生5',                                   regen:5},
  {id:'c_kettcat',    name:'ケットシー',       race:'獣',   grade:1, atk:3,  hp:6,  cost:3,  unique:false, icon:'🐱', desc:'負傷：2/4の「ナイトキャット」を召喚する。',injury:'kettcat'},
  {id:'c_grimalkin',  name:'グリマルキン',     race:'獣',   grade:1, atk:3,  hp:10, cost:3,  unique:false, icon:'😼', desc:'自動：戦闘開始時、右隣のキャラにヘイトを与える。', effect:'grimalkin_start'},
  {id:'c_elf',        name:'エルフ',           race:'精霊', grade:1, atk:4,  hp:9,  cost:5,  unique:false, icon:'🧝', desc:'自動：シールドを持つ味方は+2/±0を得る。', effect:'elf_shield'},
  {id:'c_brownie',    name:'ブラウニー',       race:'精霊', grade:1, atk:2,  hp:12, cost:4,  unique:false, icon:'🍄', desc:'自動：攻撃時、すべての味方が±0/+1を得る。', effect:'brownie_attack'},
  {id:'c_imp',        name:'インプ',           race:'悪魔', grade:1, atk:6,  hp:8,  cost:4,  unique:false, icon:'😈', desc:'自動：戦闘開始時、ランダムなアイテムを得る。', effect:'imp_start'},
  {id:'c_dragonet',   name:'ドラゴネット',     race:'竜',   grade:1, atk:5,  hp:6,  cost:2,  unique:false, icon:'🐲', desc:'自動：3回目の戦闘終了時、「ワーム」に変身する。', effect:'dragonet_end'},
  {id:'c_dwarf',      name:'ドワーフ',         race:'亜人', grade:1, atk:3,  hp:15, cost:5,  unique:false, icon:'⚒️', desc:'自動：杖を使うたび、全ての味方が+1/±0を得る。', effect:'dwarf_wand'},
  {id:'c_mummy',      name:'マミー',           race:'不死', grade:1, atk:2,  hp:12, cost:3,  unique:false, icon:'🤕', desc:'負傷：以後、全ての「不死」が±0/+1を得る。', injury:'mummy'},
  {id:'c_gremlin',    name:'グレムリン',       race:'悪魔', grade:1, atk:4,  hp:8,  cost:4,  unique:false, icon:'👺', desc:'自動：杖を使うたび、全ての敵に呪詛1を与える。',   effect:'gremlin_wand'},
  {id:'c_jack',       name:'ジャックランタン', race:'精霊', grade:1, atk:3,  hp:12, cost:3,  unique:false, icon:'🎃', desc:'自動：杖を使うたび、ランダムな仲間がシールド1を得る。', effect:'jack_wand'},
  {id:'c_lizardman',  name:'リザードマン',     race:'竜',   grade:1, atk:5,  hp:13, cost:4,  unique:false, icon:'🦎', desc:'反撃',                                   counter:true},
  {id:'c_lamia',      name:'ラミア',           race:'亜人', grade:1, atk:4,  hp:12, cost:4,  unique:false, icon:'🐍', desc:'自動：戦闘終了時、魔術レベル4につきソウル1を得る。', effect:'lamia_end'},

  // ─── G1 ユニーク ───
  {id:'c_einsel',     name:'導きの妖精"エインセル"',       race:'精霊', grade:1, atk:5,  hp:12, cost:8,  unique:true, icon:'🧚', desc:'シールド　自動：味方がシールドを失うと±0/+2を得る。', shield:1, effect:'einsel_shieldlost'},
  {id:'c_forniot',    name:'鉄の拳"フォルニョート"',       race:'亜人', grade:1, atk:8,  hp:18, cost:10, unique:true, icon:'👊', desc:'自動：攻撃時、+X/±0を得る（X=魔術レベル）。戦闘終了時、魔術レベル+2。', effect:'forniot'},
  {id:'c_abadon',     name:'残響の魔導師"アバドン"',       race:'悪魔', grade:1, atk:10, hp:10, cost:9,  unique:true, icon:'🔮', desc:'自動：戦闘開始時、全ての敵に呪詛2を与える。',         effect:'abadon_start'},
  {id:'c_freyr',      name:'黄金の瞳"フレイ"',             race:'獣',   grade:1, atk:7,  hp:16, cost:10, unique:true, icon:'👁️', desc:'2回攻撃　負傷：全てのキャラクターに1ダメージを与える。', effect:'freyr_double', injury:'freyr'},
  {id:'c_naglfar',    name:'虚空の渡し守"ナグルファル"',   race:'不死', grade:1, atk:4,  hp:22, cost:9,  unique:true, icon:'⚓', desc:'自動：戦闘開始時、隣接するキャラクターに再生を与える。', effect:'naglfar_start'},

  // ─── G2（ドラゴネット変身先） ───
  {id:'c_worm',       name:'ワーム',           race:'竜',   grade:2, atk:9,  hp:22, cost:7,  unique:false, icon:'🪱', desc:'反撃　負傷：すべての味方が+1/+1を得る。', counter:true, injury:'worm'},
];

// 単体のユニットを定義IDから生成する
function makeUnitFromDef(def, fieldIdx){
  const unit = {
    id:       uid(),
    defId:    def.id,
    name:     def.name,
    race:     def.race || '-',
    icon:     def.icon || '❓',
    atk:      def.atk,
    hp:       def.hp,
    maxHp:    def.hp,
    baseAtk:  def.atk,
    grade:    def.grade || 1,
    cost:     def.cost  || 0,
    unique:   def.unique || false,
    desc:     def.desc  || '',
    enchants: [],
    // 戦闘状態
    shield:   def.shield || 0,
    hate:     def.hate   || false,
    hateTurns:def.hate   ? 99 : 0,
    sealed:   0,
    poison:   0,
    curse:    0,  // 呪詛（被ダメ+X）
    _dp:      false,
    powerBroken: false,
    // 不死
    regen:      def.regen    || 0,    // 再生値（0=なし）
    _battleStartHp: def.hp,
    // 能力キー
    effect:   def.effect  || null,
    injury:   def.injury  || null,
    counter:  def.counter || false,
    keywords: [],
    // ドラゴネット変身カウンタ
    _battleCount: 0,
  };
  // マミー効果：不死HPボーナス（累積）
  if(def.race==='不死' && typeof G!=='undefined' && G._undeadHpBonus){
    unit.hp    += G._undeadHpBonus;
    unit.maxHp += G._undeadHpBonus;
  }
  return unit;
}
