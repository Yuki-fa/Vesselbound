// ═══════════════════════════════════════
// units.js — キャラクタープール（全グレード）
// ═══════════════════════════════════════

const UNIT_POOL = [
  // ─── 初期キャラクター ───
  {id:'c_starter_warrior', name:'戦士', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'守護', initialPanelDesc:'<自動>敵はこのキャラクターを優先して狙う。', initialEquipment:[], desc:''},
  {id:'c_starter_mage', name:'魔術師', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'三方向攻撃', initialPanelDesc:'<自動>対象と、隣接するキャラクターにもダメージを与える。', initialEquipment:[], desc:''},
  {id:'c_starter_priest', name:'神官', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'A・シールド', initialPanelDesc:'<自動>一度だけダメージを無効化する。', initialEquipment:[], desc:''},
  {id:'c_starter_thief', name:'盗賊', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'二段攻撃', initialPanelDesc:'<自動>二回攻撃する。', initialEquipment:[], desc:''},
  {id:'c_starter_knight', name:'騎士', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'貫通', initialPanelDesc:'<自動>後衛の敵にもダメージを与える。', initialEquipment:[], desc:''},
  {id:'c_starter_necromancer', name:'屍術師', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'再生', initialPanelDesc:'<自動>一度だけ復活する。', initialEquipment:[], desc:''},
  {id:'c_starter_hunter', name:'狩人', race:'亜人', grade:1, atk:3, hp:3, cost:0, unique:false, starterOnly:true, initialPanelName:'狙撃', initialPanelDesc:'<自動>攻撃時に与えるダメージが1.5倍になる。', initialEquipment:[], desc:''},
];

function _unitSheetNameKey(name){
  if(typeof _normCardName==='function') return _normCardName(name||'');
  return String(name||'').replace(/[“”]/g,'"').replace(/[’‘]/g,"'").replace(/\s+/g,'').trim();
}

function _buildUnitEquipSlots(def) {
  return Array.from({ length: 11 }, (_, i) => ({ label: `パネル${i + 1}`, kind: 'panel' }));
}

function makeStarterInitialPanel(name, desc) {
  if (!name) return null;
  return {
    id: 'starter_panel_' + _unitSheetNameKey(name),
    name,
    type: 'panel',
    kind: 'panel',
    panelScope: 'unit',
    category: 'パッシブ',
    equip: true,
    fixedEquip: true,
    starterPanel: true,
    grade: 1,
    rarity: -1,
    cost: 0,
    keywords: [name],
    desc: String(desc || '').replace(/^<自動>/, '自動：'),
  };
}

function _buildUnitInitialEquipment(def, slots) {
  const equips = new Array(slots.length).fill(null);
  const starterPanel = makeStarterInitialPanel(def.initialPanelName, def.initialPanelDesc);
  if (starterPanel) equips[0] = starterPanel;
  return equips;
}

function makeUnitFromDef(def, fieldIdx, skipSummonBonus){
  const equipSlots = _buildUnitEquipSlots(def);
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
    equipTypes: def.equipTypes ? [...def.equipTypes] : [],
    initialEquipment: def.initialEquipment ? [...def.initialEquipment] : [],
    initialPanelName: def.initialPanelName || '',
    initialPanelDesc: def.initialPanelDesc || '',
    equipmentSlots: equipSlots.map(s => ({ ...s })),
    equipment: _buildUnitInitialEquipment(def, equipSlots),
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
