// ═══════════════════════════════════════
// enemy.js — 敵生成・移動マスク生成
// 依存: constants.js, state.js, floors.js, events.js
// ═══════════════════════════════════════

// セクション別グレード抽選
function rollEnemyGrade(floor){
  const r=Math.random();
  if(floor<=3)  return 1;                         // S1-3: G1 100%
  if(floor<=5)  return r<0.80?1:2;                // S4-5: G1 80%, G2 20%
  if(floor<=8)  return r<0.60?1:2;                // S6-8: G1 60%, G2 40%
  if(floor<=10) return r<0.40?1:r<0.90?2:3;       // S9-10: G1 40%, G2 50%, G3 10%
  if(floor<=13) return r<0.60?2:3;                // S11-13: G2 60%, G3 40%
  if(floor<=15) return r<0.50?2:r<0.90?3:4;       // S14-15: G2 50%, G3 40%, G4 10%
  if(floor<=18) return r<0.60?3:4;                // S16-18: G3 60%, G4 40%
  return r<0.30?3:r<0.80?4:5;                     // S19-20: G3 30%, G4 50%, G5 20%
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
// グレードに応じた敵のATK/HP
function enemyStatsByGrade(g){
  return {atk:randi(g*2,g*4), hp:randi(g*4,g*7)};
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
  const noEliteFloors=[1,2,3,6,11,16];
  const hasElite=!noEliteFloors.includes(floor)&&Math.random()<0.30;
  if(hasElite) G._isEliteFight=true;
  const eliteIdx=hasElite?randi(0,count-1):-1;
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
// 鍛冶屋・休息所はスロットごとに各4%（重複なし）
function generateMoveMasks(){
  const slots=G.enemies.length;
  const total=Math.min(3,slots);
  const isBoss=BOSS_FLOORS.includes(G.floor);
  const masks=Array(6).fill(null);
  if(isBoss){ masks[0]='boss'; return masks; }

  // ランダムにtotal個のスロットを選ぶ
  const idxs=[...Array(slots).keys()];
  for(let i=idxs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]]; }
  const chosen=idxs.slice(0,total);

  // 最初のスロットは必ず戦闘、追加スロットは確率で鍛冶屋/休息所（外れはnull=非表示）
  const usedNon=new Set();
  chosen.forEach((idx,ci)=>{
    if(ci===0){ masks[idx]='battle'; return; }
    const r=Math.random();
    if(r<0.04&&!usedNon.has('smithy')){ masks[idx]='smithy'; usedNon.add('smithy'); }
    else if(r<0.08&&!usedNon.has('rest')){ masks[idx]='rest'; usedNon.add('rest'); }
    // 外れはnull（行き先に表示されない）
  });
  return masks;
}
