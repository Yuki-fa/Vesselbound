// ═══════════════════════════════════════
// enemy.js — 敵生成・移動マスク生成
// 依存: constants.js, state.js, floors.js, events.js
// ═══════════════════════════════════════

// セクション別グレード（1-5:G1, 6-10:G2, 11-15:G3, 16-20:G4）
function rollEnemyGrade(floor){
  const sheetGrade=FLOOR_DATA[floor]?.grade;
  if(sheetGrade) return sheetGrade;
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
  const sheetRace=typeof getSheetRaceByName==='function'?getSheetRaceByName(name):'';
  return {id:uid(),name,icon,atk,hp,maxHp:hp,baseAtk:atk,grade:grade||1,
    sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
    shield:shield||0,keywords:kws||[],powerBreak:false,allyTarget:false,
    race:sheetRace||race||'-', color:'', lane:'front'};
}

function _applyEnemyDefAbilities(enemy, def){
  if(!enemy||!def) return enemy;
  const sheetRace=typeof getSheetRaceByName==='function'?getSheetRaceByName(enemy.name):'';
  if(sheetRace) enemy.race=sheetRace;
  ['No','no','NO','code','artCode','imageNo','画像No','画像番号','art','image'].forEach(k=>{
    if(def[k]!==undefined&&def[k]!==null&&def[k]!=='') enemy[k]=def[k];
  });
  const artCode=def.artCode||def._artCode||def.code||def._code||def['No.']||def.No||def.no||def.imageNo||def.画像No||def.画像番号||'';
  if(artCode){
    enemy.artCode=artCode;
    enemy._artCode=artCode;
    enemy._sheetEnemy=true;
  }
  enemy.desc=def.desc||enemy.desc||'';
  enemy.color=def.color||enemy.color||'';
  enemy.effect=def.effect||null;
  enemy.injury=def.injury||null;
  enemy.regen=def.regen||0;
  return enemy;
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
  _applyEnemyDefAbilities(e, def);
  e._isNamed=true;
  return e;
}

// ネームド候補プールを返す（使用済み除外）
function _namedPool(grade){
  return UNIT_POOL.filter(u=>
    u.unique && (u.grade||1)===grade && u.id!=='c_golem' &&
    !u._excludeFromNamedEnemy &&
    !G._usedNamedElite.has(u.id) && !(G._usedNamedRest&&G._usedNamedRest.has(u.id))
  );
}

const EFFECT_IDS=[];

// ENEMY_POOL からグレードに合った敵定義を抽選
function _pickEnemyDef(grade){
  const pool=ENEMY_POOL.filter(e=>e.grade===grade && !e.unique && !e._isNamed && !e.bossOnly);
  const fallback=ENEMY_POOL.find(e=>!e.bossOnly)||ENEMY_POOL[0];
  return pool.length?randFrom(pool):(fallback||{name:'ゴブリン',grade:1,keywords:[],race:'亜人'});
}

function _pickBossEnemyDef(grade){
  const pool=ENEMY_POOL.filter(e=>e.grade===grade && e.bossOnly);
  return pool.length?randFrom(pool):null;
}

function _sideBossDef(def, grade){
  const same=ENEMY_POOL.find(e=>e!==def && !e.bossOnly && !e.unique && !e._isNamed && e.grade===grade && e.name===def.name);
  if(same) return same;
  const pool=ENEMY_POOL.filter(e=>!e.bossOnly && !e.unique && !e._isNamed && e.grade===grade);
  return pool.length?randFrom(pool):_pickEnemyDef(grade);
}

function _bossFightNumber(floor){
  return (FLOOR_DATA||[]).slice(0,(floor||0)+1).filter(f=>f&&f.boss).length||1;
}

function _pickNonBossEnemyDefDifferent(grade, bossName){
  const pool=ENEMY_POOL.filter(e=>e.grade===grade&&!e.bossOnly&&!e.unique&&!e._isNamed&&e.name!==bossName);
  if(pool.length) return randFrom(pool);
  return _pickEnemyDef(grade);
}

// 「シールド」キーワードの値を返す（シールド → 1、シールド2 → 2、なければ 0）
function _kwShield(def){
  if(def.shield) return def.shield; // def に直接 shield フィールドがある場合を優先
  const k=(def.keywords||[]).find(k=>k==='シールド'||/^シールド\d+$/.test(k));
  if(!k) return 0;
  return k==='シールド'?1:parseInt(k.slice(3));
}

// 指定階層の敵グループを生成
function generateEnemies(floor){
  const fd=FLOOR_DATA[floor];
  if(!fd){
    console.error('[generateEnemies] FLOOR_DATA['+floor+'] が未定義');
    const def=_pickEnemyDef(1);
    const st=enemyStats(def,1,1.0);
    const e=_mkEnemy(st.atk,st.hp,def.name,def.icon,def.grade||1,_kwShield(def),[...(def.keywords||[])],def.race||'-');
    _applyEnemyDefAbilities(e,def);
    e._sheetEnemy=!!def._sheetEnemy;
    e._artCode=def.artCode||def.No||def.no||def.imageNo||'';
    return [e];
  }
  const isBoss=!!fd.boss;

  if(isBoss){
    const baseG=FLOOR_DATA[floor]?.grade||rollEnemyGrade(floor);
    const bossDef=_pickBossEnemyDef(baseG)||_pickEnemyDef(baseG);
    const make=(def,isCenter)=>{
      const {atk,hp}=enemyStats(def,floor,1.5);
      const kws=[...(def.keywords||[])];
      if(isCenter&&!kws.includes('ボス')) kws.push('ボス');
      const e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),kws,def.race||'-');
      _applyEnemyDefAbilities(e,def);
      e.lane='rear';
      e._visualShift=false;
      if(isCenter) e.boss=true;
      return e;
    };
    const frontCount=Math.min(ENEMY_FRONT_SLOTS||7,4+Math.max(0,_bossFightNumber(floor)-1));
    const enemies=[];
    for(let i=0;i<frontCount;i++){
      const def=_pickNonBossEnemyDefDifferent(baseG,bossDef.name);
      const e=make(def,false);
      e.lane='front';
      enemies.push(e);
    }
    const sideDef=_sideBossDef(bossDef,baseG);
    const left=make(sideDef,false);
    const boss=make(bossDef,true);
    const right=make(sideDef,false);
    left.boss=right.boss=false;
    left.keywords=(left.keywords||[]).filter(k=>k!=='ボス');
    right.keywords=(right.keywords||[]).filter(k=>k!=='ボス');
    left.lane=boss.lane=right.lane='rear';
    enemies.push(left,boss,right);
    G._bossSlot=frontCount+1;
    return enemies;
  }

  // 通常戦: S16-20は3-4体、それ以外は4-5体
  const count=floor>=16?randi(3,4):randi(4,5);

  // エリートは現行仕様では出現させない。
  const hasElite=false;
  G._isEliteFight=false;
  const eliteIdx=hasElite?randi(0,Math.min(2,count-1)):-1;
  G._eliteIdx=eliteIdx;
  const ng=FLOOR_DATA[floor]?.grade||namedGradeForFloor(floor);

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
        e=_mkNamedEnemy(pickedElite,floor,1.2,['エリート']);
      } else {
        const g=rollEnemyGrade(floor);
        const def=_pickEnemyDef(g);
        const {atk,hp}=enemyStats(def,floor,1.2);
        const eg=Math.min(6,(FLOOR_DATA[floor]?.grade||1)+1);
        e=_mkEnemy(atk,hp,def.name,def.icon,eg,_kwShield(def),[...(def.keywords||[]),'エリート'],def.race||'-');
        _applyEnemyDefAbilities(e, def);
      }
      e.lane='rear'; // エリートは後衛
    } else {
      const g=rollEnemyGrade(floor);
      let def;
      if(!isBoss&&kwCount>=2){
        // キーワード持ちが既に2体いる場合はキーワードなしの敵を優先
        const noKwPool=ENEMY_POOL.filter(ep=>ep.grade===g&&!ep.bossOnly&&!(ep.keywords||[]).some(k=>k!=='エリート'&&k!=='ボス'));
        def=noKwPool.length?randFrom(noKwPool):_pickEnemyDef(g);
      } else {
        def=_pickEnemyDef(g);
      }
      const _xm=(G._extraBattleMult||1.0);
      const {atk,hp}=enemyStats(def,floor,_xm);
      const kws=[...(def.keywords||[])];
      e=_mkEnemy(atk,hp,def.name,def.icon,g,_kwShield(def),kws,def.race||'-');
      _applyEnemyDefAbilities(e, def);
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
    const _slot0Front=_lanes[0]==='front';
    if(!_leftBiased&&!_rightBiased&&!_slot0Front) break; // 偏りなし → 確定
  }
  _enforceLaneRules(enemies);
  // シャッフル後にエリートの実際の位置を更新
  if(hasElite){
    G._eliteIdx=enemies.findIndex(e=>e&&e.keywords&&e.keywords.includes('エリート'));
  }
  return enemies;
}

// 配置ルール強制：
// ・前衛・後衛が必ず混在する
// ・左端（スロット0）は必ず後衛
// ・ネームド（unique/boss/エリート）は必ず後衛
function _enforceLaneRules(enemies){
  if(!enemies||!enemies.length) return;
  // ネームドは必ず後衛
  enemies.forEach(e=>{
    if(!e) return;
    const isNamed=e.unique||e.boss||(e.keywords||[]).includes('エリート')||(e.keywords||[]).includes('ボス');
    if(isNamed) e.lane='rear';
  });
  // 混在保証：全員同じレーンなら1体だけ反対に変える
  const nonNamed=enemies.filter(e=>e&&!e.unique&&!e.boss&&!(e.keywords||[]).includes('エリート')&&!(e.keywords||[]).includes('ボス'));
  const hasFront=enemies.some(e=>e&&(e.lane||'front')==='front');
  const hasRear=enemies.some(e=>e&&(e.lane||'front')==='rear');
  if(!hasFront&&nonNamed.length) randFrom(nonNamed).lane='front';
  if(!hasRear&&nonNamed.length) randFrom(nonNamed).lane='rear';
  // 左端（スロット0）は必ず後衛：前衛なら後衛キャラとスワップ
  if(enemies[0]&&(enemies[0].lane||'front')==='front'){
    const rearIdx=enemies.findIndex((e,i)=>i>0&&e&&(e.lane||'front')==='rear');
    if(rearIdx>0){
      const tmp=enemies[0]; enemies[0]=enemies[rearIdx]; enemies[rearIdx]=tmp;
    } else {
      enemies[0].lane='rear'; // fallback：強制後衛
    }
  }
}
