// ═══════════════════════════════════════
// loadouts.js — 種族別インベントリ設定
// ═══════════════════════════════════════

const RACE_LOADOUTS={
  '人間': {totalSlots:6,itemSlots:5,ringSlots:2,fixed:{name:'パンチ',power:0,melee:true}},
  '亜人': {totalSlots:7,itemSlots:6,ringSlots:1,fixed:{name:'パンチ',power:0,melee:true}},
  '不死': {totalSlots:8,itemSlots:7,ringSlots:3,fixed:{name:'噛みつき',power:0,melee:true}},
  '獣':   {totalSlots:7,itemSlots:4,ringSlots:1,fixed:{name:'噛みつき',power:0,melee:true}},
  '竜':   {totalSlots:6,itemSlots:6,ringSlots:2,fixed:{name:'ブレス',power:0,melee:false}},
  '精霊': {totalSlots:5,itemSlots:5,ringSlots:1,fixed:{name:'切り裂き',power:0,melee:true}},
  '悪魔': {totalSlots:6,itemSlots:5,ringSlots:1,fixed:{name:'切り裂き',power:0,melee:true}},
};

const DEFAULT_RACE_LOADOUT=RACE_LOADOUTS['人間'];

function getRaceLoadout(race){
  return RACE_LOADOUTS[race]||DEFAULT_RACE_LOADOUT;
}
