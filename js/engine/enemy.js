// ═══════════════════════════════════════
// enemy.js — 敵生成・移動マスク生成
// 依存: constants.js, state.js, floors.js, events.js
// ═══════════════════════════════════════

// セクション別グレード抽選（細分化なし・FLOOR_DATAの基本グレードをそのまま使用）
function rollEnemyGrade(floor){
  return FLOOR_DATA[floor]?.grade||1;
}
function eliteGradeForFloor(floor){
  if(floor<=5)  return 2;
  if(floor<=10) return 3;
  if(floor<=15) return 4;
  return 5;
}
function bossGradeForFloor(floor){
  if(floor<=5)  return 3;
  if(floor<=10) return 4;
  if(floor<=15) return 5;
  return 6;
}
// グレードに応じた敵のATK/HP（G1合計4〜5、G2以降は急増）
const _ENEMY_STAT_TABLE=[
  null,
  {a:[1,2],  h:[2,4]},   // G1: 合計 3〜 6
  {a:[5,7],  h:[10,14]}, // G2: 合計15〜21
  {a:[10,14],h:[20,28]}, // G3: 合計30〜42
  {a:[18,24],h:[36,48]}, // G4: 合計54〜72
  {a:[28,36],h:[56,72]}, // G5: 合計84〜108
  {a:[40,50],h:[80,100]},// G6: 合計120〜150
];
function enemyStatsByGrade(g){
  const row=_ENEMY_STAT_TABLE[g]||{a:[g*7,g*9],h:[g*14,g*18]};
  return {atk:randi(row.a[0],row.a[1]), hp:randi(row.h[0],row.h[1])};
}

// ボスのシールド数（階層別）
function bossShieldForFloor(floor){
  return BOSS_SHIELD[floor]||3;
}

// 敵ユニットを1体生成するヘルパー
function _mkEnemy(atk,hp,name,icon,grade,shield,kws){
  return {id:uid(),name,icon,atk,hp,maxHp:hp,baseAtk:atk,grade:grade||1,
    sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
    shield:shield||0,keywords:kws||[],powerBreak:false};
}

// 敵のキーワード能力を抽選（階層が高いほど付与確率が上がる）
const ENEMY_KEYWORDS=['即死','毒','パワーブレイク','範囲攻撃','加護','リーダー'];
const EFFECT_IDS=[];
function rollKeywords(floor, isBoss, isLeader){
  const kws=[];
  if(floor<3) return kws;
  const base=floor/20;
  if(Math.random()<base*0.30) kws.push('毒');
  if(Math.random()<base*0.25) kws.push('パワーブレイク');
  if(Math.random()<base*0.20) kws.push('範囲攻撃');
  if(Math.random()<base*0.15) kws.push('加護');
  if(Math.random()<base*0.10&&!isBoss) kws.push('即死');
  if(isLeader) kws.push('リーダー');
  return [...new Set(kws)];
}

// 1階固定敵パターン（序盤バランス）
const _FLOOR1_PRESETS=[
  [{atk:3,hp:1},{atk:2,hp:2},{atk:3,hp:1}],
  [{atk:2,hp:2},{atk:3,hp:1},{atk:3,hp:1},{atk:2,hp:2}],
];

// 指定階層の敵グループを生成
function generateEnemies(floor){
  const fd=FLOOR_DATA[floor];
  const isBoss=!!fd.boss;

  // 1階は固定敵パターンを使用
  if(floor===1&&!isBoss){
    const preset=_FLOOR1_PRESETS[Math.random()<0.5?0:1];
    return preset.map(p=>{
      const ni=randi(0,ENEMY_NAMES.length-1);
      return _mkEnemy(p.atk,p.hp,ENEMY_NAMES[ni],ENEMY_ICONS[ni],1,0,[]);
    });
  }

  if(isBoss){
    // ボス: 5体。ボス（1体目）はボスグレード、側近は1グレード下
    const bg=bossGradeForFloor(floor);
    const count=5;
    const enemies=[];
    for(let i=0;i<count;i++){
      const g=i===0?bg:Math.max(1,bg-1);
      const {atk,hp}=enemyStatsByGrade(g);
      const name=i===0?'ボス':'側近';
      const icon=i===0?'💀':'👹';
      const shield=i===0?bossShieldForFloor(floor):0;
      const kws=rollKeywords(floor,true,false);
      enemies.push(_mkEnemy(atk,hp,name,icon,g,shield,kws));
    }
    return enemies;
  }

  // 通常戦: S16-20は3-4体、それ以外は4-5体
  const count=floor>=16?randi(3,4):randi(4,5);

  // エリート判定（30%の確率。S1-3および各セクション初回フロアは出現しない）
  const noEliteFloors=[1,2,5,6,10,11,15,16,20]; // S1-2・ボス階はエリート不出現
  const hasElite=!noEliteFloors.includes(floor)&&Math.random()<0.30;
  if(hasElite) G._isEliteFight=true;
  const eliteIdx=hasElite?randi(0,count-1):-1;
  G._eliteIdx=eliteIdx; // generateMoveMasks で移動マス除外に使用
  const eg=eliteGradeForFloor(floor);

  const enemies=[];
  for(let i=0;i<count;i++){
    const isElite=(i===eliteIdx);
    const g=isElite?eg:rollEnemyGrade(floor);
    const {atk,hp}=enemyStatsByGrade(g);
    const ni=randi(0,ENEMY_NAMES.length-1);
    const name=isElite?'エリート':ENEMY_NAMES[ni];
    const icon=isElite?'⭐':ENEMY_ICONS[ni];
    const kws=rollKeywords(floor,false,false);
    if(isElite) kws.unshift('エリート');
    enemies.push(_mkEnemy(atk,hp,name,icon,g,0,kws));
  }
  return enemies;
}

// 敵スロットにマップノード（戦闘/鍛冶屋/休息所）を割り当て
// ボス戦はスロット0のみ、最終ボス戦はなし、通常戦はエリートのスロットを除外して配置
function generateMoveMasks(){
  const slots=G.enemies.length;
  const isBoss=!!(FLOOR_DATA[G.floor]?.boss);
  const masks=Array(6).fill(null);

  // 最終ボス戦（floor 20）：移動マスを置かない
  if(FLOOR_DATA[G.floor]?.boss && G.floor===FLOOR_DATA.length-1) return masks;

  // ボス戦：スロット0（ボス）に戦闘マスのみ。他は出現しない
  if(isBoss){ masks[0]='battle'; return masks; }

  // 通常戦：エリートのスロットを候補から除外してランダム配置
  const eliteSlot=G._eliteIdx>=0?G._eliteIdx:-1;
  let idxs=[...Array(slots).keys()].filter(i=>i!==eliteSlot);
  for(let i=idxs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]]; }
  const total=Math.min(3,idxs.length);
  const chosen=idxs.slice(0,total);

  // 最初のスロットは必ず戦闘、追加スロットは各5%で鍛冶屋/休息所
  // 遠見の契約：鍛冶屋・休息所の出現率+50%
  const hasFarsight=typeof G!=='undefined'&&G.rings&&G.rings.some(r=>r&&r.unique==='farsight');
  const smithyRate=hasFarsight?0.075:0.05;
  const restRate  =hasFarsight?0.15 :0.10;

  // 観察秘術：祭壇か休息所を確定で1つ出現させる
  let forceNonBattle=G.arcanaForceNode?randFrom(['smithy','rest']):null;
  if(forceNonBattle) G.arcanaForceNode=false;

  const usedNon=new Set();
  chosen.forEach((idx,ci)=>{
    if(ci===0){
      // 観察が発動した場合、最初のスロットを強制ノードにして以降のスロットは戦闘
      if(forceNonBattle){ masks[idx]=forceNonBattle; forceNonBattle=null; usedNon.add(masks[idx]); }
      else masks[idx]='battle';
      return;
    }
    if(forceNonBattle&&!usedNon.has(forceNonBattle)){ masks[idx]=forceNonBattle; forceNonBattle=null; usedNon.add(masks[idx]); return; }
    const r=Math.random();
    if(r<smithyRate&&!usedNon.has('smithy')){ masks[idx]='smithy'; usedNon.add('smithy'); }
    else if(r<restRate&&!usedNon.has('rest')){ masks[idx]='rest'; usedNon.add('rest'); }
  });
  return masks;
}
