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
  const sheetRace=typeof getSheetRaceByName==='function'?getSheetRaceByName(name):'';
  return {id:uid(),name,icon,atk,hp,maxHp:hp,baseAtk:atk,grade:grade||1,
    sealed:0,instadead:false,nullified:0,poison:0,_dp:false,
    shield:shield||0,keywords:kws||[],powerBreak:false,allyTarget:false,
    race:sheetRace||race||'-', lane:'front'};
}

function _applyEnemyDefAbilities(enemy, def){
  if(!enemy||!def) return enemy;
  const sheetRace=typeof getSheetRaceByName==='function'?getSheetRaceByName(enemy.name):'';
  if(sheetRace) enemy.race=sheetRace;
  enemy.desc=def.desc||enemy.desc||'';
  enemy.effect=def.effect||null;
  enemy.injury=def.injury||null;
  enemy.counter=!!def.counter;
  enemy.regen=def.regen||0;
  return enemy;
}

function _enemyItem(name,power,uses,weight,effect){
  const noConsume=uses>=999;
  return initializeUses({id:`enemy_${name}`,name,type:'weapon',power:power||0,baseUses:noConsume?1:(uses||1),usesLeft:noConsume?Infinity:undefined,noConsume,weight:weight||0,effect:effect||'enemy_attack',needsEnemy:true,_enemyItem:true});
}
function _mkEnemyAction(name,prob,power,uses,effect){
  return {prob,item:_enemyItem(name,power,uses,0,effect)};
}
function _rollLevel(range){
  if(Array.isArray(range)) return randi(range[0],range[1]);
  return Number(range)||1;
}
function _statsFromRaceLevel(race,level,baseAtk,baseHp){
  let atk=baseAtk??10, hp=baseHp??10;
  for(let i=0;i<level;i++){
    const g=typeof rollRaceGrowth==='function'?rollRaceGrowth({race}):{atk:0,hp:0};
    atk+=g.atk||0;
    hp+=g.hp||0;
  }
  return {atk,hp};
}
function _mkFloor1Enemy(kind){
  const defs={
    goblin:     {name:'ゴブリン',icon:'👺',grade:0.5,level:[6,7],race:'亜人',exp:5,actions:[_mkEnemyAction('パンチ',1,0,999)]},
    hobgoblin: {name:'ホブゴブリン',icon:'👹',grade:1,level:[8,9],race:'亜人',exp:6,actions:[_mkEnemyAction('パンチ',1,0,999)]},
    harpy:     {name:'ハーピー',icon:'🪽',grade:1.5,level:[8,10],race:'亜人',exp:8,actions:[_mkEnemyAction('スピア',1,5,3)]},
    cait:      {name:'ケットシー',icon:'🐈',grade:2,level:[9,11],race:'精霊',exp:7,actions:[_mkEnemyAction('切り裂き',1,0,999),_mkEnemyAction('癒しの杖',0.6,5,5,'enemy_heal_wounded')]},
    manticore: {name:'マンティコア',icon:'🦂',grade:2.5,level:[10,12],race:'悪魔',exp:8,actions:[_mkEnemyAction('切り裂き',0.6,0,999),_mkEnemyAction('毒針',0.4,3,5,'enemy_poison_attack')]},
    wizard:    {name:'ウィザード',icon:'🧙',grade:3,level:7,race:'人間',exp:10,actions:[_mkEnemyAction('闇の杖',1,5,12)]},
    guardian:  {name:'ガーディアン',icon:'🛡️',grade:10,level:30,race:'異形',exp:20,keywords:['ボス'],boss:true,size:2,actions:[_mkEnemyAction('ブレイズブレイド',0.4,6,5),_mkEnemyAction('スタンプ',0.4,5,5),_mkEnemyAction('古代の力',0.2,0,1,'enemy_ancient_power')]},
  };
  const d=defs[kind]||defs.goblin;
  const level=_rollLevel(d.level);
  const st=_statsFromRaceLevel(d.race,level,d.atk,d.hp);
  const e=_mkEnemy(st.atk,st.hp,d.name,d.icon,d.grade||1,0,[...(d.keywords||[])],d.race);
  e.level=level;
  e.enemyActions=(d.actions||[]).map(a=>({prob:a.prob,item:clone(a.item)}));
  e.inventory=e.enemyActions.map(a=>a.item);
  e._size=d.size||1;
  e.exp=d.exp||Math.max(1,Math.round((e.maxHp||e.hp||1)/5));
  if(d.boss) e.boss=true;
  return e;
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
  const pool=ENEMY_POOL.filter(e=>e.grade===grade && !e.unique && !e._isNamed);
  return pool.length?randFrom(pool):(ENEMY_POOL[0]||{name:'ゴブリン',grade:1,icon:'👺',keywords:[],race:'亜人'});
}

// 「シールド」キーワードの値を返す（シールド → 1、シールド2 → 2、なければ 0）
function _kwShield(def){
  if(def.shield) return def.shield; // def に直接 shield フィールドがある場合を優先
  const k=(def.keywords||[]).find(k=>k==='シールド'||/^シールド\d+$/.test(k));
  if(!k) return 0;
  return k==='シールド'?1:parseInt(k.slice(3));
}

const _FLOOR1_KIND_BY_NAME={'ゴブリン':'goblin','ホブゴブリン':'hobgoblin','ハーピー':'harpy','ケットシー':'cait','マンティコア':'manticore'};
const _FLOOR1_GRADE_OPTIONS=[
  {kind:'goblin',gradeUnit:1},
  {kind:'hobgoblin',gradeUnit:2},
  {kind:'harpy',gradeUnit:3},
  {kind:'cait',gradeUnit:4},
  {kind:'manticore',gradeUnit:5},
  {kind:'wizard',gradeUnit:6},
];

function getFloorGrade(){
  return Math.max(1,Number(G._mapBattleCount||1)||1);
}
function _pickFloor1GradeComposition(totalGrade){
  const total=Math.max(1,Math.round(totalGrade*2));
  const res=[];
  function backtrack(rem,start){
    if(rem===0) return true;
    const pool=_FLOOR1_GRADE_OPTIONS.filter(o=>o.gradeUnit<=rem);
    for(let tries=0;tries<20;tries++){
      const o=randFrom(pool);
      res.push(o.kind);
      if(backtrack(rem-o.gradeUnit,start+1)) return true;
      res.pop();
    }
    return false;
  }
  if(backtrack(total,0)) return res;
  return Array(total).fill('goblin');
}

// 指定階層の敵グループを生成
function generateEnemies(floor){
  const fd=FLOOR_DATA[floor];
  if(!fd){ console.error('[generateEnemies] FLOOR_DATA['+floor+'] が未定義'); return [{id:uid(),name:'ゴブリン',icon:'👺',atk:3,hp:5,maxHp:5,baseAtk:3,grade:1,sealed:0,instadead:false,nullified:0,poison:0,_dp:false,shield:0,keywords:[],powerBroken:false,allyTarget:false,race:'亜人'}]; }
  const isBoss=!!fd.boss;

  if(floor===1&&isBoss){
    const enemies=Array(6).fill(null);
    const g=_mkFloor1Enemy('guardian');
    g.lane='front';
    enemies[2]=g;
    enemies[3]={id:uid(),name:'',hp:0,maxHp:0,atk:0,_occupiedEnemy:true,_occupiedBy:g.id,_isObject:true,lane:'front'};
    G._bossSlot=2;
    return enemies;
  }

  // 1-5Fはシートの「エネミー（共通／1-5F）」以外を出さない。
  if(floor<=5&&!isBoss){
    const enemies=Array(6).fill(null);
    const kinds=_pickFloor1GradeComposition(getFloorGrade());
    const slots=[0,1,2,3,4,5];
    kinds.forEach(kind=>{
      if(!slots.length) return;
      const slot=slots.splice(randi(0,slots.length-1),1)[0];
      enemies[slot]=_mkFloor1Enemy(kind);
    });
    enemies.forEach(e=>{ if(e){ e.lane='front'; e._visualShift=false; } });
    return enemies;
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
          e=_mkNamedEnemy(pickedBoss,floor,1.5,['ボス']);
        } else {
          const def=_pickEnemyDef(baseG);
          const {atk,hp}=enemyStats(def,floor,1.5);
          e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),[...(def.keywords||[]),'ボス'],def.race||'-');
          _applyEnemyDefAbilities(e, def);
        }
        e.boss=true;
        e.lane='rear'; // ボスは後衛
      } else {
        const def=_pickEnemyDef(baseG);
        const {atk,hp}=enemyStats(def,floor,1.0);
        e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),[...(def.keywords||[])],def.race||'-');
        _applyEnemyDefAbilities(e, def);
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
    _enforceLaneRules(enemies);
    // ボス位置が変わった場合はG._bossSlotを更新
    const _newBossSlot=enemies.findIndex(e=>e&&e.boss);
    if(_newBossSlot>=0) G._bossSlot=_newBossSlot;
    return enemies;
  }

  // 通常戦: S16-20は3-4体、それ以外は4-5体
  const count=floor>=16?randi(3,4):randi(4,5);

  // エリート判定（30%の確率。S1-3および各セクション初回フロアは出現しない）
  const noEliteFloors=[1,2,5,6,10,11,15,16,20];
  const forceElite=!!G._mapForceElite;
  const suppressRandomElite=G._mapNodeType==='mob';
  const hasElite=forceElite||(!suppressRandomElite&&!noEliteFloors.includes(floor)&&Math.random()<0.30);
  if(hasElite) G._isEliteFight=true;
  if(forceElite) G._mapForceElite=false;
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
        const noKwPool=ENEMY_POOL.filter(ep=>ep.grade===g&&!(ep.keywords||[]).some(k=>k!=='エリート'&&k!=='ボス'));
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
  // シャッフル後にエリートの実際の位置を更新（moveMasks生成前に必要）
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
  // オブジェクトを除いた実際の敵スロットから選ぶ
  if(FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss){
    const _preReal=G.enemies.map((e,i)=>(e&&!e._isObject&&!e._isTreasureItem?i:-1)).filter(i=>i>=0);
    const _preSlot=_preReal.length>0?_preReal[Math.floor(Math.random()*_preReal.length)]:0;
    masks[_preSlot]='boss';
    return masks;
  }

  // 通常戦：エリートのスロットは宝箱確定、候補から除外してランダム配置
  // null・オブジェクト・宝箱スロットを除き、実際の敵がいるスロットのみを候補にする
  const eliteSlot=G._eliteIdx>=0?G._eliteIdx:-1;
  if(eliteSlot>=0) masks[eliteSlot]='chest';
  // 移動マスは「前衛レーン」の敵スロットにのみ配置（前衛が死ぬまで背後に隠れる）
  const _realIdxs=G.enemies.map((e,i)=>(e&&!e._isObject&&!e._isTreasureItem?i:-1)).filter(i=>i>=0);
  const _frontIdxs=_realIdxs.filter(i=>(G.enemies[i]?.lane||'front')==='front');
  let idxs=(_frontIdxs.length?_frontIdxs:_realIdxs).filter(i=>i!==eliteSlot);
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
