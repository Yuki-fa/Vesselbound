// ═══════════════════════════════════════
// units.js — キャラクタープール（全グレード）
// ═══════════════════════════════════════

const UNIT_POOL = [];

function makeUnitFromDef(def, fieldIdx, skipSummonBonus){
  const unit = {
    id:       uid(),
    defId:    def.id,
    name:     def.name,
    race:     def.race || '-',
    color:    def.color || '',
    atk:      def.atk,
    hp:       def.hp,
    maxHp:    def.hp,
    baseAtk:  def.atk,
    grade:    def.grade || 1,
    rarity:   def.rarity,
    cost:     def.cost  || 0,
    price:    def.price,
    unique:   def.unique || false,
    desc:     def.desc  || '',
    sfxType:  def.sfxType || '',
    enchants: [],
    lane:     def.lane || null, // 'front' | 'rear' | null（味方はhateで制御）
    // 戦闘状態
    shield:   def.shield || 0,
    hate:     def.hate   || false,
    hateTurns:def.hate   ? 99 : 0,
    poison:   0,
    _dp:      false,
    powerBroken: false,
    // 能力キー
    regen:      0,
    _battleStartHp: def.hp,
    effect:   def.effect  || null,
    injury:   def.injury  || null,
    keywords: def.keywords ? [...def.keywords] : [],
    boardCards: new Array(11).fill(null),
    No: def.No || def.no || def.code || def.artCode || def.imageNo || '',
    no: def.no || def.No || def.code || def.artCode || def.imageNo || '',
    code: def.code || def.artCode || def.No || def.no || def.imageNo || '',
    artCode: def.artCode || def.code || def.No || def.no || def.imageNo || '',
    imageNo: def.imageNo || def.artCode || def.code || def.No || def.no || '',
    art: def.art || '',
    image: def.image || '',
  };
  return unit;
}
