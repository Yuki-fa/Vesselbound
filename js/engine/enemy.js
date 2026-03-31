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
// グレード別の基礎レンジデフォルト（シートで明示されていない場合に使用）
// ENEMY_POOLキャラはシート値を使い、UNIT_POOLキャラ（味方兼敵）はこれを使用
const _GRADE_BASE_ATK=[[1,2],[1,2],[2,4],[4,7],[7,12]]; // index=grade(0-4)
const _GRADE_BASE_HP =[[2,4],[2,4],[4,8],[8,14],[14,24]];

// 敵スタッツを計算: rand(def.baseAtk or グレードデフォルト) × floor.mult × extraMult
function enemyStats(def, floor, extraMult){
  const fd=FLOOR_DATA[floor];
  const m=(fd?.mult||1.0)*(extraMult||1.0);
  const g=Math.min(4,Math.max(0,def.grade||1));
  const atkRange=def.baseAtk||_GRADE_BASE_ATK[g];
  const hpRange =def.baseHp ||_GRADE_BASE_HP[g];
  return {
    atk:Math.max(1,Math.round(randi(atkRange[0],atkRange[1])*m)),
    hp: Math.max(1,Math.round(randi(hpRange[0], hpRange[1]) *m))
  };
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

// ネームドキャラを敵として生成（通常/エリート/ボス共通）
// floor と extraMult を渡すと def.baseAtk × floor.mult × extraMult でスタッツ計算
function _mkNamedEnemy(def,floor,extraMult,extraKws){
  const {atk,hp}=enemyStats(def,floor,extraMult||1.0);
  const kws=[...(def.keywords||[]),...(extraKws||[])];
  const e=_mkEnemy(atk,hp,def.name,def.icon,def.grade||1,0,kws,def.race||'-');
  e.desc=def.desc||'';
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
        if(pickedBoss){
          e=_mkNamedEnemy(pickedBoss,floor,2.0,[]);
        } else {
          const def=_pickEnemyDef(baseG);
          const {atk,hp}=enemyStats(def,floor,2.0);
          e=_mkEnemy(atk,hp,def.name,def.icon,baseG,0,[...(def.keywords||[])],def.race||'-');
        }
        e.boss=true;
      } else {
        const def=_pickEnemyDef(baseG);
        const {atk,hp}=enemyStats(def,floor,1.0);
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
  let kwCount=0; // キーワード持ち通常敵の数（最大2体）
  for(let i=0;i<count;i++){
    const isElite=(i===eliteIdx);
    let e;
    if(isElite){
      if(pickedElite){
        e=_mkNamedEnemy(pickedElite,floor,1.5,['エリート']);
      } else {
        const g=rollEnemyGrade(floor);
        const def=_pickEnemyDef(g);
        const {atk,hp}=enemyStats(def,floor,1.5);
        const eg=Math.min(6,(FLOOR_DATA[floor]?.grade||1)+1);
        e=_mkEnemy(atk,hp,def.name,def.icon,eg,0,['エリート'],def.race||'-');
      }
    } else {
      const g=rollEnemyGrade(floor);
      let def;
      if(!isBoss&&kwCount>=2){
        // キーワード持ちが既に2体いる場合はキーワードなしの敵を優先
        const noKwPool=ENEMY_POOL.filter(ep=>ep.grade===g&&!(ep.keywords||[]).some(k=>k!=='エリート'&&k!=='ボス'));
        def=noKwPool.length?randFrom(noKwPool):_pickEnemyDef(g);
      } else {
        def=_pickEnemyDef(g);
      }
      const {atk,hp}=enemyStats(def,floor,1.0);
      const kws=[...(def.keywords||[])];
      e=_mkEnemy(atk,hp,def.name,def.icon,g,_kwShield(def),kws,def.race||'-');
      if(!isBoss&&kws.some(k=>k!=='エリート'&&k!=='ボス')) kwCount++;
    }
    enemies.push(e);
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
