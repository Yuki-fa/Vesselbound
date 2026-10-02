// ═══════════════════════════════════════
// floors.js — 階層・マップノード定義
// ═══════════════════════════════════════

const BOSS_FLOORS=[];
// G.floor は保存済みの番号を保つ。既存の深層1〜6は1〜30、追加の行は31以降。
// 補正の参照には番号の算術を使わず、(マップ, 深層レベル) の索引を使う。
const FLOOR_DATA=[null];
const FLOOR_LEGACY_MAP_IDS={
  1:[1,2,3,4,5,6],2:[7,8,9,10,11,12],3:[13,14,15,16,17,18],
  4:[19,20,21,22,23,24],5:[25,26,27,28,29,30],
};
function setMapDeepLevelData(mapDeep){
  FLOOR_DATA.length=0;
  FLOOR_DATA.push(null);
  BOSS_FLOORS.length=0;
  FLOOR_DATA._floorIdsByMap={};
  FLOOR_DATA._deepLevelsPerMap={};
  let nextFloor=31;
  Object.entries(mapDeep).forEach(([map,levels])=>{
    const ids=FLOOR_DATA._floorIdsByMap[map]={};
    const depths=Object.keys(levels).map(Number).filter(n=>Number.isInteger(n)&&n>0).sort((a,b)=>a-b);
    FLOOR_DATA._deepLevelsPerMap[map]=Math.max(0,...depths);
    depths.forEach(deep=>{
      const floor=FLOOR_LEGACY_MAP_IDS[map]?.[deep-1]||nextFloor++;
      ids[deep]=floor;
      FLOOR_DATA[floor]={...levels[deep],map:map==='闘技場'?map:Number(map),deepLevel:deep};
    });
  });
  if(typeof window!=='undefined') window.MAP_DEEP_LEVEL_DATA=mapDeep;
}
function mapDeepLevelCount(map){
  return Number(FLOOR_DATA._deepLevelsPerMap?.[String(map)])||6;
}
function floorForMapDeep(map,deep){
  const level=Math.max(1,Math.min(mapDeepLevelCount(map),Number(deep)||1));
  return FLOOR_DATA._floorIdsByMap?.[String(map)]?.[level]||1;
}

// 深層レベルシートと同内容。シート読込失敗時だけ使うフォールバック。
setMapDeepLevelData({
  1:{1:{grade:1,mult:1},2:{grade:1,mult:1.2},3:{grade:1,mult:2},4:{grade:1,mult:1.7},5:{grade:1,mult:2.1},6:{grade:1,mult:2.6},7:{grade:1,mult:3.2}},
  2:{1:{grade:2,mult:1.2},2:{grade:2,mult:1.4},3:{grade:2,mult:2.5},4:{grade:2,mult:2.1},5:{grade:2,mult:2.6},6:{grade:2,mult:3.2},7:{grade:2,mult:4}},
  3:{1:{grade:3,mult:1.4},2:{grade:3,mult:1.7},3:{grade:3,mult:3},4:{grade:3,mult:2.6},5:{grade:3,mult:3.2},6:{grade:3,mult:4},7:{grade:3,mult:5}},
  4:{1:{grade:4,mult:1.7},2:{grade:4,mult:2.1},3:{grade:4,mult:3.5},4:{grade:4,mult:3.2},5:{grade:4,mult:4},6:{grade:4,mult:5},7:{grade:4,mult:7}},
  5:{1:{grade:5,mult:4},2:{grade:5,mult:5},3:{grade:5,mult:8},4:{grade:5,mult:9},5:{grade:5,mult:10},6:{grade:5,mult:12}},
  '闘技場':{1:{grade:1,mult:1},2:{grade:1,mult:2},3:{grade:1,mult:3},4:{grade:1,mult:4},5:{grade:1,mult:5},6:{grade:1,mult:6}},
});
