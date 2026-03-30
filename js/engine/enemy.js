// ═══════════════════════════════════════
// enemy.js — 敵生成・移動マスク生成
// 依存: constants.js, state.js, floors.js, events.js
// ═══════════════════════════════════════

// セクション別グレード（1-5:G1, 6-10:G2, 11-15:G3, 16-20:G4）
function rollEnemyGrade(floor){
  if(floor<=5)  return 1;
  if(floor<=10) return 2;
  if(floor<=15) return 3;
  return 4;
}
function eliteGradeForFloor(floor){
  return Math.min(6,(FLOOR_DATA[floor]?.grade||1)+1);
}
function bossGradeForFloor(floor){
  return Math.min(6,(FLOOR_DATA[floor]?.grade||1)+1.5);
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
  // 小数グレードは隣接するグレード間を線形補間（例：1.5→G1とG2の中間）
  const lo=Math.max(1,Math.floor(g));
  const hi=Math.min(6,Math.ceil(g));
  const t=g-lo; // 補間係数 0〜1
  const rLo=_ENEMY_STAT_TABLE[lo]||{a:[lo*7,lo*9],h:[lo*14,lo*18]};
  const rHi=_ENEMY_STAT_TABLE[hi]||{a:[hi*7,hi*9],h:[hi*14,hi*18]};
  const aMin=Math.ceil(rLo.a[0]+(rHi.a[0]-rLo.a[0])*t);
  const aMax=Math.ceil(rLo.a[1]+(rHi.a[1]-rLo.a[1])*t);
  const hMin=Math.ceil(rLo.h[0]+(rHi.h[0]-rLo.h[0])*t);
  const hMax=Math.ceil(rLo.h[1]+(rHi.h[1]-rLo.h[1])*t);
  return {atk:randi(aMin,aMax), hp:randi(hMin,hMax)};
}

// ボスのシールド数（階層別）
function bossShieldForFloor(floor){
  const fd=FLOOR_DATA[floor];
  if(fd&&fd.bossShield!==undefined) return fd.bossShield;
  return BOSS_SHIELD[floor]??0;
}

// 敵ユニットを1体生成するヘルパー
function _mkEnemy(atk,hp,name,icon,grade,shield,kws,race){
  return {id:uid(),name,icon,atk,hp,maxHp:hp,baseAtk:atk,grade:grade||1,
    sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
    shield:shield||0,keywords:kws||[],powerBreak:false,allyTarget:false,
    race:race||'-'};
}

// 階層からネームドキャラのグレード帯を決定（1-5:G1, 6-10:G2, 11-15:G3, 16-20:G4）
function namedGradeForFloor(floor){
  if(floor<=5) return 1;
  if(floor<=10) return 2;
  if(floor<=15) return 3;
  return 4;
}

// ネームドキャラを敵として生成（エリート/ボス共通）
function _mkNamedEnemy(def,shield,extraKws){
  const kws=[...(def.keywords||[]),...(extraKws||[])];
  const e=_mkEnemy(def.atk,def.hp,def.name,def.icon,def.grade||1,shield,kws,def.race||'-');
  e.desc=def.desc||'';
  // キャラクター効果をそのまま引き継ぐ（憑依でも維持）
  e.effect =def.effect ||null;
  e.injury =def.injury ||null;
  e.counter=def.counter||false;
  e.regen  =def.regen  ||0;
  return e;
}

// ネームド候補プールを返す（使用済み除外）
function _namedPool(grade){
  return UNIT_POOL.filter(u=>
    u.unique && (u.grade||1)===grade && u.id!=='c_golem' &&
    !G._usedNamedElite.has(u.id) && !(G._usedNamedRest&&G._usedNamedRest.has(u.id))
  );
}

const EFFECT_IDS=[];

// ENEMY_POOL からグレードに合った敵定義を抽選
function _pickEnemyDef(grade){
  const pool=ENEMY_POOL.filter(e=>e.grade===grade);
  return pool.length?randFrom(pool):(ENEMY_POOL[0]||{name:'ゴブリン',grade:1,icon:'👺',keywords:[],race:'亜人'});
}

// 「シールド」キーワードの値を返す（シールド → 1、シールド2 → 2、なければ 0）
function _kwShield(def){
  const k=(def.keywords||[]).find(k=>k==='シールド'||/^シールド\d+$/.test(k));
  if(!k) return 0;
  return k==='シールド'?1:parseInt(k.slice(3));
}

// 1階固定敵パターン（序盤バランス）
const _FLOOR1_PRESETS=[
  [{atk:3,hp:1},{atk:2,hp:2},{atk:3,hp:1}],
  [{atk:3,hp:1},{atk:2,hp:1},{atk:1,hp:2},{atk:3,hp:1}],
];
// 1階出現敵（限定）
const _FLOOR1_NAMES=new Set(['ゴブリン','グール','ジャイアントラット','ウィスプ']);

// 指定階層の敵グループを生成
function generateEnemies(floor){
  const fd=FLOOR_DATA[floor];
  if(!fd){ console.error('[generateEnemies] FLOOR_DATA['+floor+'] が未定義'); return [{id:uid(),name:'ゴブリン',icon:'👺',atk:3,hp:5,maxHp:5,baseAtk:3,grade:1,sealed:0,instadead:false,nullified:0,poison:0,_dp:false,shield:0,keywords:[],powerBroken:false,allyTarget:false,race:'亜人'}]; }
  const isBoss=!!fd.boss;

  // 1階は固定敵パターンを使用（出現敵は限定リストから）
  if(floor===1&&!isBoss){
    const preset=_FLOOR1_PRESETS[Math.random()<0.5?0:1];
    const floor1Pool=ENEMY_POOL.filter(e=>e.grade===1&&_FLOOR1_NAMES.has(e.name));
    return preset.map(p=>{
      const def=floor1Pool.length?randFrom(floor1Pool):_pickEnemyDef(1);
      return _mkEnemy(p.atk,p.hp,def.name,def.icon,1,_kwShield(def),[...(def.keywords||[])],def.race||'-');
    });
  }

  if(isBoss){
    // ボス: 5体。ボス（1体目）はネームドキャラ、側近はベースgrade乱数
    const ng=namedGradeForFloor(floor);
    const baseG=FLOOR_DATA[floor]?.grade||1;
    const pool=_namedPool(ng);
    const pickedBoss=pool.length?randFrom(pool):null;
    if(pickedBoss) G._usedNamedElite.add(pickedBoss.id);
    const count=5;
    const enemies=[];
    for(let i=0;i<count;i++){
      let e;
      if(i===0){
        const shield=bossShieldForFloor(floor);
        if(pickedBoss){
          e=_mkNamedEnemy(pickedBoss,shield,[]);
        } else {
          const {atk,hp}=enemyStatsByGrade(bossGradeForFloor(floor));
          e=_mkEnemy(atk,hp,'ボス','💀',ng,shield,[]);
        }
        e.boss=true;
      } else {
        const def=_pickEnemyDef(baseG);
        const {atk,hp}=enemyStatsByGrade(baseG);
        e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),[...(def.keywords||[])],def.race||'-');
      }
      enemies.push(e);
    }
    return enemies;
  }

  // 通常戦: S16-20は3-4体、それ以外は4-5体
  const count=floor>=16?randi(3,4):randi(4,5);

  // エリート判定（30%の確率。S1-3および各セクション初回フロアは出現しない）
  const noEliteFloors=[1,2,5,6,10,11,15,16,20];
  const hasElite=!noEliteFloors.includes(floor)&&Math.random()<0.30;
  if(hasElite) G._isEliteFight=true;
  const eliteIdx=hasElite?randi(0,count-1):-1;
  G._eliteIdx=eliteIdx;
  const ng=namedGradeForFloor(floor);

  // エリート用ネームドを事前抽選
  let pickedElite=null;
  if(hasElite){
    const pool=_namedPool(ng);
    pickedElite=pool.length?randFrom(pool):null;
    if(pickedElite) G._usedNamedElite.add(pickedElite.id);
  }

  const enemies=[];
  for(let i=0;i<count;i++){
    const isElite=(i===eliteIdx);
    let e;
    if(isElite){
      if(pickedElite){
        e=_mkNamedEnemy(pickedElite,0,['エリート']);
      } else {
        const g=eliteGradeForFloor(floor);
        const {atk,hp}=enemyStatsByGrade(g);
        e=_mkEnemy(atk,hp,'エリート','⭐',g,0,['エリート']);
      }
    } else {
      const g=rollEnemyGrade(floor);
      const {atk,hp}=enemyStatsByGrade(g);
      const def=_pickEnemyDef(g);
      e=_mkEnemy(atk,hp,def.name,def.icon,g,_kwShield(def),[...(def.keywords||[])],def.race||'-');
    }
    enemies.push(e);
  }
  // 非ボス戦：キーワード持ちの敵は最大2体（エリートは除く）
  if(!isBoss){
    let _kwCount=0;
    enemies.forEach(e=>{
      if(!e||!e.keywords) return;
      const _ownKws=e.keywords.filter(k=>k!=='エリート'&&k!=='ボス');
      if(!_ownKws.length) return;
      _kwCount++;
      if(_kwCount>2) e.keywords=e.keywords.filter(k=>k==='エリート'||k==='ボス');
    });
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

  // ボス直前フロア：ボス戦マスのみ（鍛冶屋・休息所は出現しない）
  if(FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss){ masks[0]='boss'; return masks; }

  // 通常戦：エリートのスロットを候補から除外してランダム配置
  const eliteSlot=G._eliteIdx>=0?G._eliteIdx:-1;
  let idxs=[...Array(slots).keys()].filter(i=>i!==eliteSlot);
  for(let i=idxs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]]; }
  const total=Math.min(3,idxs.length);
  const chosen=idxs.slice(0,total);

  // 最初のスロットは必ず戦闘、追加スロットは各10%で商店
  // 遠見の指輪：商店の出現率2倍
  const hasFarsight=typeof G!=='undefined'&&G.rings&&G.rings.some(r=>r&&r.unique==='farsight');
  const shopRate=hasFarsight?0.20:0.10;

  // 観察秘術：祭壇を確定で1つ出現させる
  let forceNonBattle=G.arcanaForceNode?'smithy':null;
  if(forceNonBattle) G.arcanaForceNode=false;

  const usedNon=new Set();
  chosen.forEach((idx,ci)=>{
    if(ci===0){
      masks[idx]='battle'; // 戦闘マスは必ず出現
      return;
    }
    if(forceNonBattle&&!usedNon.has(forceNonBattle)){ masks[idx]=forceNonBattle; forceNonBattle=null; usedNon.add(masks[idx]); return; }
    const r=Math.random();
    if(r<shopRate&&!usedNon.has('shop')){ masks[idx]='shop'; usedNon.add('shop'); }
  });
  return masks;
}
