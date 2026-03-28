// ═══════════════════════════════════════
// units.js — キャラクタープール
// ═══════════════════════════════════════

const UNIT_POOL = [
  // ─── ゴーレム（初期キャラ・非売品） ───
  {id:'c_golem',      name:'ゴーレム',        race:'-',   grade:1, atk:5,  hp:10, cost:0,  unique:false, icon:'🪨', desc:''},

  // ─── G1 通常 ───
  {id:'c_skeleton',   name:'スケルトン',       race:'不死', grade:1, atk:6,  hp:3,  cost:3,  unique:false, icon:'💀', desc:'戦闘終了時、ライフ1で復活する。',              effect:'skeleton_revive'},
  {id:'c_zombie',     name:'ゾンビ',           race:'不死', grade:1, atk:1,  hp:12, cost:3,  unique:false, icon:'🧟', desc:'再生3',                                       regen:3},
  {id:'c_grimalkin',  name:'グリマルキン',     race:'獣',   grade:1, atk:3,  hp:10, cost:3,  unique:false, icon:'😼', desc:'自動：戦闘開始時、正面の敵にヘイトを与える。',   effect:'grimalkin_start'},
  {id:'c_elf',        name:'エルフ',           race:'精霊', grade:1, atk:4,  hp:9,  cost:5,  unique:false, icon:'🧝', desc:'自動：攻撃時、+1/±0を得る。',                  effect:'elf_attack'},
  {id:'c_brownie',    name:'ブラウニー',       race:'精霊', grade:1, atk:2,  hp:12, cost:4,  unique:false, icon:'🍄', desc:'自動：攻撃時、全ての味方が±0/+1を得る。',       effect:'brownie_attack'},
  {id:'c_dwarf',      name:'ドワーフ',         race:'亜人', grade:1, atk:3,  hp:15, cost:5,  unique:false, icon:'⚒️', desc:'自動：杖を使うたび、全ての味方が+1/+1を得る。', effect:'dwarf_wand'},
  {id:'c_mummy',      name:'マミー',           race:'不死', grade:1, atk:2,  hp:12, cost:3,  unique:false, icon:'🤕', desc:'負傷：以後、全ての「不死」が+1/±0を得る。',     injury:'mummy'},

  // ─── G1 ネームド（報酬に出ない。エリート/ボスとして出現） ───
  {id:'c_einsel',     name:'導きの妖精"エインセル"',       race:'精霊', grade:1, atk:5,  hp:12, cost:8,  unique:true, icon:'🧚', desc:'シールド　自動：ターン開始時、一番右の仲間にシールド+1。シールドを失うと+1/+2を得る。', shield:1, effect:'einsel'},
  {id:'c_forniot',    name:'鉄の拳"フォルニョート"',       race:'亜人', grade:1, atk:8,  hp:18, cost:10, unique:true, icon:'👊', desc:'二段攻撃　自動：攻撃時、全ての味方が+1/±0を得る。', effect:'forniot', keywords:['二段攻撃']},
  {id:'c_abadon',     name:'残響の魔導師"アバドン"',       race:'悪魔', grade:1, atk:10, hp:10, cost:9,  unique:true, icon:'🔮', desc:'全体攻撃', keywords:['全体攻撃']},
  {id:'c_freyr',      name:'黄金の瞳"フレイ"',             race:'獣',   grade:1, atk:7,  hp:16, cost:10, unique:true, icon:'👁️', desc:'負傷：最右の空きスロットに「ロイヤルガード(4/6・反撃)」を召喚する。', injury:'freyr'},
  {id:'c_naglfar',    name:'虚空の渡し守"ナグルファル"',   race:'不死', grade:1, atk:4,  hp:22, cost:9,  unique:true, icon:'⚓', desc:'自動：キャラクターが死亡するたびに+2/+1を得る。', effect:'naglfar_ondeath'},
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
    curse:    0,
    _dp:      false,
    powerBroken: false,
    // 不死
    regen:      def.regen    || 0,
    _battleStartHp: def.hp,
    // 能力キー
    effect:   def.effect  || null,
    injury:   def.injury  || null,
    counter:  def.counter || false,
    keywords: def.keywords ? [...def.keywords] : [],
  };
  // マミー効果：不死HPボーナス（累積）
  if(def.race==='不死' && typeof G!=='undefined' && G._undeadHpBonus){
    unit.hp    += G._undeadHpBonus;
    unit.maxHp += G._undeadHpBonus;
  }
  return unit;
}
