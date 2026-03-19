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

  const usedNon=new Set();
  chosen.forEach(idx=>{
    let type='battle';
    const r=Math.random();
    if(r<0.04&&!usedNon.has('smithy')){ type='smithy'; usedNon.add('smithy'); }
    else if(r<0.08&&!usedNon.has('rest')){ type='rest'; usedNon.add('rest'); }
    masks[idx]=type;
  });
  return masks;
}
