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
    race:race||'-', lane:'front'};
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
  const e=_mkEnemy(atk,hp,def.name,def.icon,def.grade||1,_kwShield(def),kws,def.race||'-');
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
  if(def.shield) return def.shield; // def に直接 shield フィールドがある場合を優先
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
      const e=_mkEnemy(p.atk,p.hp,def.name,def.icon,1,_kwShield(def),[...(def.keywords||[])],def.race||'-');
      e._visualShift=Math.random()<0.5;
      e.lane=Math.random()<0.6?'front':'rear';
      return e;
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
        e.lane='rear'; // ボスは後衛
      } else {
        const def=_pickEnemyDef(baseG);
        const {atk,hp}=enemyStats(def,floor,1.0);
        e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),[...(def.keywords||[])],def.race||'-');
        e.lane=Math.random()<0.6?'front':'rear'; // 側近はランダム
        e._visualShift=Math.random()<0.5; // 側近はランダムで下にずらす
      }
      enemies.push(e);
    }
    // ボスをスロット0〜2のランダムな位置に配置
    const _bossSlot=randi(0,2);
    if(_bossSlot!==0){ const tmp=enemies[0]; enemies[0]=enemies[_bossSlot]; enemies[_bossSlot]=tmp; }
    G._bossSlot=_bossSlot;
    // 側近が全員同じ配置にならないよう保証
    const _bossShiftable=enemies.filter(e=>!e.boss);
    if(_bossShiftable.length>=2){
      if(_bossShiftable.every(e=>e._visualShift)) randFrom(_bossShiftable)._visualShift=false;
      else if(_bossShiftable.every(e=>!e._visualShift)) randFrom(_bossShiftable)._visualShift=true;
    }
    return enemies;
  }

  // 通常戦: S16-20は3-4体、それ以外は4-5体
  const count=floor>=16?randi(3,4):randi(4,5);

  // エリート判定（30%の確率。S1-3および各セクション初回フロアは出現しない）
  const noEliteFloors=[1,2,5,6,10,11,15,16,20];
  const hasElite=!noEliteFloors.includes(floor)&&Math.random()<0.30;
  if(hasElite) G._isEliteFight=true;
  const eliteIdx=hasElite?randi(0,Math.min(2,count-1)):-1;
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
      e.lane='rear'; // エリートは後衛
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
      const _xm=(G._extraBattleMult||1.0);
      const {atk,hp}=enemyStats(def,floor,_xm);
      const kws=[...(def.keywords||[])];
      e=_mkEnemy(atk,hp,def.name,def.icon,g,_kwShield(def),kws,def.race||'-');
      e.lane=Math.random()<0.6?'front':'rear'; // 通常敵はランダム（60%前衛）
      e._visualShift=Math.random()<0.5; // ボス・エリート以外はランダムで下にずらす
      if(!isBoss&&kws.some(k=>k!=='エリート'&&k!=='ボス')) kwCount++;
    }
    enemies.push(e);
  }
  G._extraBattleMult=1.0; // 使い捨てリセット
  // 前衛が0体の場合は最初の非エリート・非ボスを前衛にする
  const hasFront=enemies.some(e=>e&&(e.lane||'front')==='front');
  if(!hasFront&&enemies.length>0){
    const first=enemies.find(e=>e&&!e.boss&&!(e.keywords||[]).includes('エリート'));
    if(first) first.lane='front';
  }
  // 全員が同じ前衛/後衛（_visualShift）にならないよう保証
  const shiftable=enemies.filter(e=>!e.boss&&!(e.keywords||[]).includes('エリート'));
  if(shiftable.length>=2){
    const allShifted=shiftable.every(e=>e._visualShift);
    const noneShifted=shiftable.every(e=>!e._visualShift);
    if(allShifted) randFrom(shiftable)._visualShift=false;
    else if(noneShifted) randFrom(shiftable)._visualShift=true;
  }
  // Fisher-Yatesシャッフル＋偏り防止（最大10回再試行）
  for(let _retry=0;_retry<10;_retry++){
    // シャッフル
    for(let _si=enemies.length-1;_si>0;_si--){
      const _sj=Math.floor(Math.random()*(_si+1));
      const _st=enemies[_si]; enemies[_si]=enemies[_sj]; enemies[_sj]=_st;
    }
    // 偏り判定：左端2体または右端2体が全員前衛でないかチェック
    const _lanes=enemies.map(e=>e?(e.lane||'front'):'rear');
    const _leftBiased =_lanes.length>=2&&_lanes[0]==='front'&&_lanes[1]==='front';
    const _rightBiased=_lanes.length>=2&&_lanes[_lanes.length-1]==='front'&&_lanes[_lanes.length-2]==='front';
    if(!_leftBiased&&!_rightBiased) break; // 偏りなし → 確定
    // 偏りあり → 再シャッフル（最終試行はそのまま使う）
  }
  // シャッフル後にエリートの実際の位置を更新（moveMasks生成前に必要）
  if(hasElite){
    G._eliteIdx=enemies.findIndex(e=>e&&e.keywords&&e.keywords.includes('エリート'));
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

  // ボス戦：ボスのスロット（0〜2のランダム）に戦闘マスのみ。他は出現しない
  if(isBoss){ masks[G._bossSlot||0]='battle'; return masks; }

  // ボス直前フロア：ボス戦マスのみ（鍛冶屋・休息所は出現しない）
  if(FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss){ masks[randi(0,2)]='boss'; return masks; }

  // 通常戦：エリートのスロットは宝箱確定、候補から除外してランダム配置
  const eliteSlot=G._eliteIdx>=0?G._eliteIdx:-1;
  if(eliteSlot>=0) masks[eliteSlot]='chest';
  let idxs=[...Array(slots).keys()].filter(i=>i!==eliteSlot);
  for(let i=idxs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1));[idxs[i],idxs[j]]=[idxs[j],idxs[i]]; }
  const total=Math.min(3,idxs.length);
  const chosen=idxs.slice(0,total);

  // 最初のスロットは必ず戦闘、追加スロットは洞窟/池
  // 直前に選んだノードと同じ種類は今回は出現しない
  const _noSmithy=G._prevWasSmithy>0; G._prevWasSmithy=Math.max(0,(G._prevWasSmithy||0)-1);
  const _noRest=G._prevWasRest>0;     G._prevWasRest=Math.max(0,(G._prevWasRest||0)-1);
  // 洞窟（smithy）・池（rest）：追加スロットで各15%
  const specialRate=0.15;

  // 観察秘術：洞窟を確定で1つ出現させる
  let forceNonBattle=G.arcanaForceNode?'smithy':null;
  if(forceNonBattle) G.arcanaForceNode=false;

  const usedNon=new Set();
  chosen.forEach((idx,ci)=>{
    if(ci===0){
      masks[idx]='battle'; // 戦闘マスは必ず出現
      return;
    }
    if(forceNonBattle&&!usedNon.has(forceNonBattle)&&!_noSmithy){ masks[idx]=forceNonBattle; forceNonBattle=null; usedNon.add(masks[idx]); return; }
    const r=Math.random();
    if(r<specialRate&&!usedNon.has('smithy')&&!_noSmithy){ masks[idx]='smithy'; usedNon.add('smithy'); }
    else if(r<specialRate*2&&!usedNon.has('rest')&&!_noRest){ masks[idx]='rest'; usedNon.add('rest'); }
  });
  return masks;
}
