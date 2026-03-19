// ═══════════════════════════════════════
// enemy.js — 敵生成・移動マスク生成
// 依存: constants.js, state.js, floors.js, events.js
// ═══════════════════════════════════════

// ボスのシールド数（グレード別）
function bossShield(grade){ return [0,3,3,5,8][grade]||3; }

// 敵のキーワード能力を抽選（階層が高いほど付与確率が上がる）
const ENEMY_KEYWORDS=['即死','毒','パワーブレイク','範囲攻撃','加護','リーダー'];
const EFFECT_IDS=[];
function rollKeywords(floor, isBoss, isLeader){
  const kws=[];
  if(floor<3) return kws; // 1〜2階はキーワードなし
  const base=floor/20;   // 0.15〜1.0
  if(Math.random()<base*0.30) kws.push('毒');
  if(Math.random()<base*0.25) kws.push('パワーブレイク');
  if(Math.random()<base*0.20) kws.push('範囲攻撃');
  if(Math.random()<base*0.15) kws.push('加護');
  if(Math.random()<base*0.10&&!isBoss) kws.push('即死');
  if(isLeader) kws.push('リーダー'); // リーダーは呼び出し側で1体のみ制御
  return [...new Set(kws)];
}

// 敵ユニットを1体生成するヘルパー
function _mkEnemy(atk,hp,name,icon,grade,shield,kws){
  return {id:uid(),name,icon,atk,hp,maxHp:hp,baseAtk:atk,grade:grade||1,
    sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
    shield:shield||0,keywords:kws||[],powerBreak:false};
}

// 1階固定敵パターン（序盤バランス）
const _FLOOR1_PRESETS=[
  // 3体パターン: 3/1、2/2、3/1
  [{atk:3,hp:1},{atk:2,hp:2},{atk:3,hp:1}],
  // 4体パターン: 2/2、3/1、3/1、2/2
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
      return _mkEnemy(p.atk,p.hp,ENEMY_NAMES[ni],ENEMY_ICONS[ni],fd.grade,0,[]);
    });
  }

  const count=isBoss?5:randi(2,6);
  const enemies=[];
  let rem=fd.power;
  for(let i=0;i<count;i++){
    const isLast=i===count-1;
    const budget=isLast?rem:Math.floor(rem/(count-i)*randi(7,13)/10);
    const hp =Math.max(1,Math.round(Math.sqrt(Math.max(1,budget)*0.7)));
    const atk=Math.max(1,Math.round(Math.max(1,budget)/hp));
    const ni=randi(0,ENEMY_NAMES.length-1);
    const shield=isBoss?bossShield(fd.grade):0;
    const name=isBoss?(i===0?'ボス':'側近'):ENEMY_NAMES[ni];
    const icon=isBoss?(i===0?'💀':'👹'):ENEMY_ICONS[ni];
    const isLeader=!isBoss&&i===0&&Math.random()<floor/25;
    const kws=rollKeywords(floor,isBoss,isLeader);
    enemies.push(_mkEnemy(atk,hp,name,icon,fd.grade,shield,kws));
    rem=Math.max(0,rem-atk*hp);
  }
  return enemies;
}

// 敵スロットにマップノード（戦闘/祠/商人など）を割り当て
function generateMoveMasks(){
  const slots=G.enemies.length;
  const total=Math.min(3,slots);
  const isBoss=BOSS_FLOORS.includes(G.floor);
  let types;
  if(isBoss){
    types=['boss'];
  } else {
    types=['battle'];
    const canNon=G.prevNodeType==='battle';
    const nonTypes=['smithy','rest','chest'];
    if(canNon&&total>=2) types.push(randFrom(nonTypes));
    if(canNon&&total>=3){ let t; do{t=randFrom(nonTypes);}while(t===types[1]); types.push(t); }
  }
  const masks=Array(6).fill(null);
  if(isBoss){
    masks[0]='boss';
  } else {
    const idxs=[...Array(slots).keys()];
    const chosen=[];
    while(chosen.length<types.length&&idxs.length){
      const ri=Math.floor(Math.random()*idxs.length);
      chosen.push(idxs.splice(ri,1)[0]);
    }
    chosen.forEach((idx,i)=>{ masks[idx]=types[i]; });
  }
  return masks;
}
