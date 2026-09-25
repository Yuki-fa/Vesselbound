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

// 「出現」列がない旧データは出現可能。明示的に false の定義だけを通常抽選から外す。
function _enemySpawnAllowed(def){
  if(!def) return false;
  if(def.spawnEnabled===false||def._spawnEnabled===false||def.spawn===false) return false;
  const raw=def['出現'];
  if(raw!==undefined&&raw!==null){
    const value=String(raw).trim().toLowerCase();
    if(['false','0','×','✕'].includes(value)) return false;
  }
  return true;
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
  // 「台詞1〜3」列。戦闘開始時に吹き出しで順に出す。
  if(Array.isArray(def.lines)&&def.lines.length) enemy.battleLines=def.lines.slice();
  // 「闘技場台詞」列。空配列も保持し、闘技場のエリート／ボスが通常台詞へ
  // フォールバックしないようにする。
  if(Array.isArray(def.arenaLines)) enemy.arenaBattleLines=def.arenaLines.slice();
  const sheetRace=typeof getSheetRaceByName==='function'?getSheetRaceByName(enemy.name):'';
  if(sheetRace) enemy.race=sheetRace;
  ['No','no','NO','code','artCode','imageNo','画像No','画像番号','art','image'].forEach(k=>{
    if(def[k]!==undefined&&def[k]!==null&&def[k]!=='') enemy[k]=def[k];
  });
  if(def.sfxType) enemy.sfxType=def.sfxType;
  if(Array.isArray(def.goldRange)) enemy.goldRange=def.goldRange.slice();
  else if(def.goldReward!==undefined) enemy.goldRange=[Number(def.goldReward)||0,Number(def.goldReward)||0];
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
  const pool=ENEMY_POOL.filter(e=>_enemySpawnAllowed(e)&&e.grade===grade && !e.unique && !e._isNamed && !e.bossOnly);
  const fallback=ENEMY_POOL.find(e=>_enemySpawnAllowed(e)&&!e.bossOnly);
  return pool.length?randFrom(pool):(fallback||{name:'ゴブリン',grade:1,keywords:[],race:'亜人'});
}

// 最終ステージ（Scene 5）の固定敵。
// stage4＝ルート上のボス（エピトメ）、stage5＝ルートに載せない伏せられたラスボス。
const SCENE5_BOSS_ENEMY_NO='EN074';         // 万象の揺り籠“エピトメ”（stage4のボス）
// ラスボス戦の後衛3体は固定編成にする（左・中央・右）。
const FINAL_BOSS_ENEMY_NO='EN075_1';        // 刻を織る者“ウルズ・ラグナ”（後衛中央＝ボス）
const FINAL_BOSS_LEFT_ENEMY_NO='EN075_2';   // 日刻の巫女“ルミア”（後衛左）
const FINAL_BOSS_RIGHT_ENEMY_NO='EN075_3';  // 夜刻の巫女“ウムブラ”（後衛右）
// ── 敵の数（ステージ＝Scene番号ごとに明示指定）────────────────
// [総数, 後衛の数]。前衛＝総数−後衛。
const ENEMY_COUNT_BY_SCENE={
  battle:{1:[4,1],2:[4,1],3:[5,1],4:[5,1],5:[6,1]},
  elite: {1:[5,1],2:[5,1],3:[7,3],4:[7,3]},
  boss:  {1:[7,3],2:[7,3],3:[8,3],4:[8,3],5:[9,3]},
};
const FINAL_BOSS_ENEMY_COUNT=[10,3]; // 伏せられたラスボス戦
function _sceneEnemyCount(type){
  // **Scene 1の導入戦はここで数を確定させる**（1戦目＝1体、2戦目＝2体。どちらも後衛）。
  // 以前は null を返して「開幕編成」（_openingBattleEnemyLanes）へ委ねていたが、
  // あちらは **floor で引く**ため、`mapBattle.floor` が `G.floor` とずれると
  // 表に当たらず、間引きも効かないまま4体へ水増しされていた
  // （実測：wave1 / stage3 / G.floor=2 で敵4体）。
  // 仕様は「ステージ1の1戦目は1体、2戦目は2体」なので、floorではなくstageで決める。
  if(type==='battle'&&Number(G._wave)===1){
    if(Number(G._waveStage)===2) return [1,1];
    if(Number(G._waveStage)===3) return [2,2];
  }
  if(type==='boss'&&typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()){
    return FINAL_BOSS_ENEMY_COUNT.slice();
  }
  const table=ENEMY_COUNT_BY_SCENE[type];
  const v=table&&table[Math.max(1,Number(G._wave)||1)];
  return v?v.slice():null;
}
function _fixedFinalEnemyDef(no){
  const key=String(no||'').toUpperCase();
  return ENEMY_POOL.find(e=>String(e.artCode||e._artCode||e.No||e.no||e['No.']||e.code||'').toUpperCase()===key)||null;
}

function _pickBossEnemyDef(grade){
  const pool=ENEMY_POOL.filter(e=>_enemySpawnAllowed(e)&&e.grade===grade && e.bossOnly);
  return pool.length?randFrom(pool):null;
}

// 通常のボス戦で確定した個体を、闘技場の「このランで出たボス」判定へ渡す。
// プレビューが先に作られた場合も同じ個体が実戦闘へ使われるため、そこで記録してよい。
function _recordWaveBossDef(wave,def){
  const w=Math.max(1,Number(wave)||1);
  if(w>4||!def||!def.name) return;
  G._waveBosses=G._waveBosses||{};
  G._waveBosses[w]=String(def.name);
}

// 「旅の進捗」パネルでエリート/ボスの名前・効果・ステータスをホバー表示するため、
// 実際の戦闘開始（generateEnemies/generateEliteEnemies）より前に個体・ATK/HPを1回だけ
// 確定してG._waveEnemyPreviewへキャッシュする（先読み確定）。以降、そのwaveの実戦闘でも
// このキャッシュをそのまま使うことで、表示内容と実際の戦闘結果を一致させる。
function _ensureWaveEnemyPreview(wave,type){
  const w=Math.max(1,Number(wave)||1);
  const key=`${w}:${type}`;
  G._waveEnemyPreview=G._waveEnemyPreview||{};
  if(G._waveEnemyPreview[key]) return G._waveEnemyPreview[key];
  const stage=type==='boss'?(w===5?4:9):3;
  const floor=typeof _waveStageFloor==='function'?_waveStageFloor(w,stage):1;
  const baseG=(typeof FLOOR_DATA!=='undefined'&&FLOOR_DATA[floor]?.grade)||rollEnemyGrade(floor);
  // Scene 5のルート上のボスはエピトメ。伏せられたラスボスは進捗パネルに出さない。
  const fixedDef=w===5&&type==='boss'?_fixedFinalEnemyDef(SCENE5_BOSS_ENEMY_NO):null;
  const recordedName=type==='boss'&&G._waveBosses?String(G._waveBosses[w]||'').trim():'';
  const recordedDef=recordedName
    ?ENEMY_POOL.find(e=>e&&e.bossOnly&&e.name===recordedName)
    :null;
  // 同一wave内でエリートとボスに同じ個体が重複して選ばれないよう、既に確定済みの
  // 反対側（elite⇔boss）の名前は候補から除外する。
  const otherType=type==='boss'?'elite':'boss';
  const otherPreview=G._waveEnemyPreview[`${w}:${otherType}`];
  const excludeName=otherPreview&&otherPreview.def?otherPreview.def.name:null;
  let def=fixedDef||recordedDef;
  if(!def&&excludeName){
    const pool=ENEMY_POOL.filter(e=>_enemySpawnAllowed(e)&&e.grade===baseG&&e.bossOnly&&e.name!==excludeName);
    def=pool.length?randFrom(pool):null;
  }
  def=def||_pickBossEnemyDef(baseG)||_pickEnemyDef(baseG);
  if(!def) return null;
  // _startWaveBattle()のG._extraBattleMult計算（main.js）と同じ倍率を使う。
  const mult=type==='boss'?2:1.5;
  const {atk,hp}=enemyStats(def,floor,mult);
  const preview={def,atk,hp,floor,grade:baseG,wave:w,type};
  G._waveEnemyPreview[key]=preview;
  if(type==='boss') _recordWaveBossDef(w,def);
  return preview;
}

// デバッグ専用：現在ステージのエリート／ボスを、同じグレード帯の次の番号へ進める。
// プレビューを更新することで、旅の進捗表示と次回の実戦闘の両方を同じ個体にする。
function debugAdvanceEliteBoss(){
  if(typeof G==='undefined'||!G||!G._debugMode) return;
  const wave=Math.max(1,Number(G._wave)||1);
  G._waveEnemyPreview=G._waveEnemyPreview||{};
  const chosen=[];
  const advance=type=>{
    const preview=_ensureWaveEnemyPreview(wave,type);
    if(!preview||!preview.def) return;
    const pool=ENEMY_POOL.filter(e=>_enemySpawnAllowed(e)&&e&&e.bossOnly&&e.grade===preview.def.grade);
    if(!pool.length) return;
    const currentIndex=Math.max(0,pool.findIndex(e=>e===preview.def||e.name===preview.def.name));
    let next=pool[(currentIndex+1)%pool.length];
    // エリートとボスの同一個体回避は通常のプレビュー選定と同じ規則にする。
    if(chosen.some(e=>e.name===next.name)&&pool.length>1){
      next=pool[(pool.indexOf(next)+1)%pool.length];
    }
    chosen.push(next);
    preview.def=next;
    const mult=type==='boss'?2:1.5;
    const stats=enemyStats(next,preview.floor,mult);
    preview.atk=stats.atk;
    preview.hp=stats.hp;
  };
  advance('elite');
  advance('boss');
  if(typeof _syncRewardJourneyUi==='function') _syncRewardJourneyUi();
}

function _sideBossDef(def, grade){
  const same=ENEMY_POOL.find(e=>_enemySpawnAllowed(e)&&e!==def && !e.bossOnly && !e.unique && !e._isNamed && e.grade===grade && e.name===def.name);
  if(same) return same;
  const pool=ENEMY_POOL.filter(e=>_enemySpawnAllowed(e)&&!e.bossOnly && !e.unique && !e._isNamed && e.grade===grade);
  return pool.length?randFrom(pool):_pickEnemyDef(grade);
}

function _bossFightNumber(floor){
  return (FLOOR_DATA||[]).slice(0,(floor||0)+1).filter(f=>f&&f.boss).length||1;
}

function _pickNonBossEnemyDefDifferent(grade, bossName){
  const pool=ENEMY_POOL.filter(e=>_enemySpawnAllowed(e)&&e.grade===grade&&!e.bossOnly&&!e.unique&&!e._isNamed&&e.name!==bossName);
  if(pool.length) return randFrom(pool);
  return _pickEnemyDef(grade);
}

// ── 闘技場の敵編成 ──────────────────────────────────────
// 敵の名前・能力は ENEMY_POOL、数値は通常の enemyStats() へ委譲する。
// ここはPvE専用の編成入口だが、戦闘の効果・対象選択・終了判定は通常どおりコアを通る。
function _arenaStatFloor(wave,kind){
  const w=Math.max(1,Number(wave)||1);
  // 各ステージのエリートは、そのルート上のエリート位置の深層レベルを使う。
  // 最終ステージだけは伏せられたstage5のボス級としてstage5を使う。
  const stage=kind==='boss'?(w===5?5:9):(w===1?4:3);
  return typeof _waveStageFloor==='function'?_waveStageFloor(w,stage):Math.max(1,(w-1)*6+2);
}

// 闘技場のラウンドと、強さを参照する通常ステージを分けて定義する。
// 2戦目／4戦目は、それぞれステージ1／2のボス級である点に注意する。
const ARENA_ROUND_SPECS=Object.freeze([
  null,
  {kind:'elite',statWave:1},
  {kind:'boss',statWave:1},
  {kind:'elite',statWave:2},
  {kind:'boss',statWave:2},
  {kind:'elite',statWave:3},
  {kind:'boss',statWave:5},
]);
function arenaRoundSpec(round){
  const r=Math.max(1,Math.min(6,Number(round)||1));
  return ARENA_ROUND_SPECS[r]||ARENA_ROUND_SPECS[1];
}
function arenaRoundKind(round){ return arenaRoundSpec(round).kind; }
function _arenaRoundStatFloor(round){
  const spec=arenaRoundSpec(round);
  return _arenaStatFloor(spec.statWave,spec.kind);
}

function _arenaEnemyDef(name,grade){
  const exact=(ENEMY_POOL||[]).find(e=>e&&String(e.name||'')===String(name||''));
  if(exact) return exact;
  return _pickEnemyDef(grade||1);
}
function _arenaMakeEnemy(def,floor,mult,lane,role){
  const baseGrade=FLOOR_DATA[floor]?.grade||def?.grade||rollEnemyGrade(floor);
  const source=def||_arenaEnemyDef('',baseGrade);
  const stats=enemyStats(source,floor,mult);
  const kws=[...(source.keywords||[])].filter(k=>k!=='ボス'&&k!=='エリート');
  if(role==='boss') kws.push('ボス');
  if(role==='elite') kws.push('エリート');
  const unit=_mkEnemy(stats.atk,stats.hp,source.name,source.icon,baseGrade,_kwShield(source),kws,source.race||'-');
  _applyEnemyDefAbilities(unit,source);
  unit.lane=lane;
  unit._visualShift=false;
  unit._arenaEnemy=true;
  // 闘技場は撃破・逃走のどちらも報酬なし。
  unit.goldRange=[0,0];
  unit.goldReward=0;
  if(role==='boss') unit.boss=true;
  if(role==='elite') unit.elite=true;
  return unit;
}
function _arenaApplyAdjacentStats(enemies){
  const list=(enemies||[]).filter(Boolean);
  const isOrdinary=unit=>!!unit&&!unit.elite&&!unit.boss;
  list.forEach((unit,index)=>{
    if(!unit||( !unit.elite&&!unit.boss)) return;
    const rearNeighbors=String(unit.lane||'front')==='rear'
      ?[list[index-1],list[index+1]].filter(candidate=>isOrdinary(candidate)&&String(candidate.lane||'front')==='rear')
      :[];
    // 後衛の両隣が通常敵で揃う時だけ後衛平均を使う。それ以外は前衛全体の平均へ戻す。
    const neighbors=rearNeighbors.length===2
      ?rearNeighbors
      :list.filter(candidate=>isOrdinary(candidate)&&String(candidate.lane||'front')==='front');
    // アレスのように通常敵がいない場合は、ボス級の enemyStats() をそのまま使う。
    if(!neighbors.length) return;
    const average=key=>neighbors.reduce((sum,candidate)=>sum+(Number(candidate[key])||0),0)/neighbors.length;
    unit.atk=Math.max(1,Math.round(average('atk')*2));
    unit.baseAtk=unit.atk;
    unit.hp=Math.max(1,Math.round(average('hp')*2));
    unit.maxHp=unit.hp;
  });
}
function _arenaEnsureUsedBoss(wave){
  const w=Math.max(1,Number(wave)||1);
  G._waveBosses=G._waveBosses||{};
  const recorded=String(G._waveBosses[w]||'').trim();
  if(recorded){
    const recordedDef=ENEMY_POOL.find(e=>e&&e.bossOnly&&e.name===recorded);
    if(recordedDef) return recordedDef;
  }
  const preview=typeof _ensureWaveEnemyPreview==='function'
    ?_ensureWaveEnemyPreview(w,'boss')
    :(G._waveEnemyPreview&&G._waveEnemyPreview[`${w}:boss`]);
  if(preview&&preview.def&&preview.def.bossOnly){
    _recordWaveBossDef(w,preview.def);
    return preview.def;
  }
  // 過去セーブに記録がない場合も、候補を一度確定して以後同じランで使う。
  const floor=_arenaStatFloor(w,'boss');
  const grade=FLOOR_DATA[floor]?.grade||rollEnemyGrade(floor);
  const pool=(ENEMY_POOL||[]).filter(e=>_enemySpawnAllowed(e)&&e&&e.bossOnly&&e.grade===grade);
  const fallback=pool[0]||_pickBossEnemyDef(grade)||_pickEnemyDef(grade);
  const chosen=runKeyedPick(`arena:used-boss:${w}`,pool.length?pool:[fallback])||fallback;
  _recordWaveBossDef(w,chosen);
  return chosen;
}
function _arenaUnusedBoss(wave){
  const w=Math.max(1,Number(wave)||1);
  const used=_arenaEnsureUsedBoss(w);
  const floor=_arenaStatFloor(w,'boss');
  const grade=FLOOR_DATA[floor]?.grade||rollEnemyGrade(floor);
  const pool=(ENEMY_POOL||[]).filter(e=>_enemySpawnAllowed(e)&&e&&e.bossOnly&&e.grade===grade&&e.name!==used?.name);
  return runKeyedPick(`arena:unused-boss:${w}`,pool)||used||_pickBossEnemyDef(grade)||_pickEnemyDef(grade);
}
function generateArenaEnemies(round){
  const r=Math.max(1,Math.min(6,Number(round)||1));
  const eliteMult=1.5,bossMult=2;
  const makeFixed=(name,floor,mult,lane,role)=>_arenaMakeEnemy(_arenaEnemyDef(name,FLOOR_DATA[floor]?.grade),floor,mult,lane,role||'');
  const finish=enemies=>{
    const kind=arenaRoundKind(r);
    G._isEliteFight=kind==='elite';
    G._isBossFight=kind==='boss';
    G._eliteIdx=G._isEliteFight?enemies.findIndex(e=>e&&e.elite):-1;
    G._bossSlot=G._isBossFight?enemies.findIndex(e=>e&&e.boss):-1;
    G._enemyLaneFixed=true;
    _arenaApplyAdjacentStats(enemies);
    return enemies;
  };
  if(r===1){
    const floor=_arenaRoundStatFloor(r);
    const enemies=Array.from({length:4},()=>makeFixed('ゴブリン',floor,eliteMult,'front',''));
    enemies.push(makeFixed('オーク',floor,eliteMult,'rear','elite'));
    return finish(enemies);
  }
  if(r===2){
    const floor=_arenaRoundStatFloor(r);
    const central=_arenaUnusedBoss(1);
    const side=_sideBossDef(central,FLOOR_DATA[floor]?.grade||central.grade||1);
    const enemies=Array.from({length:4},()=>makeFixed('ポルターガイスト',floor,bossMult,'front',''));
    enemies.push(_arenaMakeEnemy(side,floor,bossMult,'rear',''));
    enemies.push(_arenaMakeEnemy(central,floor,bossMult,'rear','boss'));
    enemies.push(_arenaMakeEnemy(side,floor,bossMult,'rear',''));
    return finish(enemies);
  }
  if(r===3){
    const floor=_arenaRoundStatFloor(r);
    const enemies=Array.from({length:5},()=>makeFixed('カースドアーマー',floor,eliteMult,'front',''));
    enemies.push(makeFixed('グレーターデーモン',floor,eliteMult,'rear','elite'));
    return finish(enemies);
  }
  if(r===4){
    const floor=_arenaRoundStatFloor(r);
    const central=_arenaUnusedBoss(2);
    const side=_sideBossDef(central,FLOOR_DATA[floor]?.grade||central.grade||1);
    const enemies=Array.from({length:5},()=>makeFixed('ダークエルフ',floor,bossMult,'front',''));
    enemies.push(_arenaMakeEnemy(side,floor,bossMult,'rear',''));
    enemies.push(_arenaMakeEnemy(central,floor,bossMult,'rear','boss'));
    enemies.push(_arenaMakeEnemy(side,floor,bossMult,'rear',''));
    return finish(enemies);
  }
  if(r===5){
    const floor=_arenaRoundStatFloor(r);
    const enemies=Array.from({length:6},()=>makeFixed('カトブレパス',floor,eliteMult,'front',''));
    enemies.push(makeFixed('レッドキャップ',floor,eliteMult,'rear','elite'));
    return finish(enemies);
  }
  const floor=_arenaRoundStatFloor(6);
  const ares=_arenaEnemyDef('闘技場の覇者 “アレス”',FLOOR_DATA[floor]?.grade||5);
  const enemy=_arenaMakeEnemy(ares,floor,bossMult,'rear','boss');
  return finish([enemy]);
}

// 「結界」キーワードの値を返す（結界 → 1、結界2 → 2、なければ 0）
function _kwShield(def){
  if(def.shield) return def.shield; // def に直接 shield フィールドがある場合を優先
  const k=(def.keywords||[]).find(k=>k==='結界'||/^結界\d+$/.test(k));
  if(!k) return 0;
  return k==='結界'?1:parseInt(k.slice(2));
}

// 指定階層の敵グループを生成
function _openingBattleEnemyLanes(floor){
  const n=Math.max(1,Number(floor)||1);
  if(n===1) return ['rear'];
  if(n===2) return ['rear','rear'];
  if(n===3) return ['front','front','rear'];
  return null;
}
function usesOpeningBattleEnemyFormation(floor){
  return !!_openingBattleEnemyLanes(floor);
}
function _applyOpeningBattleEnemyFormation(enemies,floor){
  const lanes=_openingBattleEnemyLanes(floor);
  if(!lanes) return enemies;
  const pool=(enemies||[]).filter(Boolean);
  if(!pool.length) return enemies;
  const picked=[];
  for(let i=0;i<lanes.length;i++){
    const base=pool[i]||pool[0];
    const e=i<pool.length?base:JSON.parse(JSON.stringify(base));
    if(i>=pool.length) e.id=uid();
    e.lane=lanes[i];
    e._visualShift=false;
    picked.push(e);
  }
  return picked;
}

// Q004の魔狼戦。敵の強さはステージ2エリート戦と同じ floor／1.5倍を使うが、
// 戦闘種別は通常戦のままにして、開戦演出・報酬の入口を通常戦と共有する。
function generateQuestGarmEnemies(){
  const floor=typeof _waveStageFloor==='function'?_waveStageFloor(2,3):Math.max(1,Number(G&&G.floor)||1);
  const mult=1.5;
  const findCode=code=>{
    const key=String(code||'').toUpperCase();
    return (typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])
      .find(def=>String(def&&(def.artCode||def._artCode||def.No||def.no||def['No.']||def.code||'')).toUpperCase()===key);
  };
  const wolf=findCode('EN020');
  const garm=findCode('EN027');
  if(!wolf||!garm) return generateEnemies(floor);
  // ガルムの強さはクエスト枠のホバー表示で先に決めた値を使う（quest.js questGarmPreviewStats）。
  const garmPreview=typeof questGarmPreviewStats==='function'?questGarmPreviewStats():null;
  const make=(def,lane)=>{
    const stats=(def===garm&&garmPreview)?{atk:garmPreview.atk,hp:garmPreview.hp}:enemyStats(def,floor,mult);
    const unit=_mkEnemy(stats.atk,stats.hp,def.name,def.icon,def.grade||1,_kwShield(def),[...(def.keywords||[])],def.race||'-');
    _applyEnemyDefAbilities(unit,def);
    unit.lane=lane;
    unit._visualShift=false;
    unit._questGarm=def===garm;
    unit._questEnemyCode=String(def.artCode||def._artCode||'').toUpperCase();
    return unit;
  };
  const countSpec=typeof _sceneEnemyCount==='function'?_sceneEnemyCount('elite'):[5,1];
  const count=Math.max(1,Number(countSpec&&countSpec[0])||5);
  const rear=Math.max(1,Math.min(count,Number(countSpec&&countSpec[1])||1));
  const enemies=Array.from({length:Math.max(0,count-rear)},()=>make(wolf,'front'));
  // 後衛1体は名前指定のガルム・グリーム。EN027の「出現=false」は通常抽選にだけ効く。
  enemies.push(make(garm,'rear'));
  while(enemies.length<count) enemies.push(make(wolf,'rear'));
  G._isEliteFight=false;
  G._eliteIdx=-1;
  G._enemyLaneFixed=true;
  G._extraBattleMult=1.0;
  return enemies;
}

function generateEnemies(floor){
  const fd=FLOOR_DATA[floor];
  if(!fd){
    // floor=0（初回報酬フェイズより前、まだ戦闘未開始の状態）でここに来るのは異常ではないため、
    // 本来データが存在するはずの1階層目以降でのみエラーとして記録する
    if(floor!==0) console.error('[generateEnemies] FLOOR_DATA['+floor+'] が未定義');
    const def=_pickEnemyDef(1);
    const st=enemyStats(def,1,1.0);
    const e=_mkEnemy(st.atk,st.hp,def.name,def.icon,def.grade||1,_kwShield(def),[...(def.keywords||[])],def.race||'-');
    _applyEnemyDefAbilities(e,def);
    e._sheetEnemy=!!def._sheetEnemy;
    e._artCode=def.artCode||def.No||def.no||def.imageNo||'';
    return [e];
  }
  const isBoss=G._mapBattle?!!(G._mapBattle.type==='boss'||G._mapBattle.forcedBoss):!!fd.boss;

  if(isBoss){
    const baseG=FLOOR_DATA[floor]?.grade||rollEnemyGrade(floor);
    // 「旅の進捗」パネルで先読み済みなら、その個体・ATK/HPをそのまま使い表示と一致させる。
    const preview=typeof _ensureWaveEnemyPreview==='function'
      ?_ensureWaveEnemyPreview(G._wave,'boss'):null;
    // Scene 5：stage4＝エピトメ（ルート上のボス）、stage5＝ウルズ・ラグナ（伏せられたラスボス）。
    const isScene5=Number(G._wave)===5;
    const isFinalBossFight=!!(isScene5&&Number(G._waveStage)===5);
    const isScene5BossFight=!!(isScene5&&Number(G._waveStage)===4);
    const fixedFinalBoss=isFinalBossFight?_fixedFinalEnemyDef(FINAL_BOSS_ENEMY_NO)
      :(isScene5BossFight?_fixedFinalEnemyDef(SCENE5_BOSS_ENEMY_NO):null);
    // Scene 5の固定敵は先読みプレビューより優先する。プレビューは "5:boss" の1件しか
    // 持たないため、これを先に見るとstage5（ウルズ・ラグナ）でもstage4のエピトメが選ばれてしまう。
    const bossDef=fixedFinalBoss||(preview&&preview.def)||_pickBossEnemyDef(baseG)||_pickEnemyDef(baseG);
    _recordWaveBossDef(G._wave,bossDef);
    const make=(def,isCenter)=>{
      const {atk,hp}=(isCenter&&preview&&preview.def===def)
        ?{atk:preview.atk,hp:preview.hp}
        :enemyStats(def,floor,G._forceBossMult||G._extraBattleMult||1.5);
      const kws=[...(def.keywords||[])];
      if(isCenter&&!kws.includes('ボス')) kws.push('ボス');
      const e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),kws,def.race||'-');
      _applyEnemyDefAbilities(e,def);
      e.lane='rear';
      e._visualShift=false;
      if(isCenter) e.boss=true;
      return e;
    };
    // ボス戦は後衛3体（側近・ボス・側近）固定。前衛＝総数−3。
    const _fixedBoss=_sceneEnemyCount('boss');
    const frontCount=Math.min(ENEMY_FRONT_SLOTS||7,
      _fixedBoss?Math.max(0,_fixedBoss[0]-3):(4+Math.max(0,_bossFightNumber(floor)-1)));
    const enemies=[];
    for(let i=0;i<frontCount;i++){
      const def=_pickNonBossEnemyDefDifferent(baseG,bossDef.name);
      const e=make(def,false);
      e.lane='front';
      enemies.push(e);
    }
    const sideDef=_sideBossDef(bossDef,baseG);
    // ラスボス戦の後衛だけは、左＝日刻の巫女“ルミア”／右＝夜刻の巫女“ウムブラ”で固定する。
    const leftDef=(isFinalBossFight&&_fixedFinalEnemyDef(FINAL_BOSS_LEFT_ENEMY_NO))||sideDef;
    const rightDef=(isFinalBossFight&&_fixedFinalEnemyDef(FINAL_BOSS_RIGHT_ENEMY_NO))||sideDef;
    const left=make(leftDef,false);
    const boss=make(bossDef,true);
    const right=make(rightDef,false);
    left.boss=right.boss=false;
    left.keywords=(left.keywords||[]).filter(k=>k!=='ボス');
    right.keywords=(right.keywords||[]).filter(k=>k!=='ボス');
    left.lane=boss.lane=right.lane='rear';
    enemies.push(left,boss,right);
    G._bossSlot=frontCount+1;
    G._enemyLaneFixed=true;
    return enemies;
  }

  // 通常戦の数。ステージ（Scene）ごとの明示指定があればそれに従う。
  const _fixedCount=_sceneEnemyCount('battle');
  // 明示指定が無い場合の従来ルール: S16-20は3-4体、それ以外は4-5体
  const count=_fixedCount?_fixedCount[0]:(floor>=16?randi(3,4):randi(4,5));

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
        const noKwPool=ENEMY_POOL.filter(ep=>_enemySpawnAllowed(ep)&&ep.grade===g&&!ep.bossOnly&&!(ep.keywords||[]).some(k=>k!=='エリート'&&k!=='ボス'));
        def=noKwPool.length?randFrom(noKwPool):_pickEnemyDef(g);
      } else {
        def=_pickEnemyDef(g);
      }
      const _xm=(G._extraBattleMult||1.0);
      const {atk,hp}=enemyStats(def,floor,_xm);
      const kws=[...(def.keywords||[])];
      e=_mkEnemy(atk,hp,def.name,def.icon,g,_kwShield(def),kws,def.race||'-');
      _applyEnemyDefAbilities(e, def);
      e.lane=rand()<0.6?'front':'rear'; // 通常敵はランダム（60%前衛）
      e._visualShift=rand()<0.5; // ボス・エリート以外はランダムで下にずらす
      if(!isBoss&&kws.some(k=>k!=='エリート'&&k!=='ボス')) kwCount++;
    }
    enemies.push(e);
  }
  G._extraBattleMult=1.0; // 使い捨てリセット
  // 明示指定がある場合は、開幕戦の固定編成よりそちらを優先する。
  if(!_fixedCount&&usesOpeningBattleEnemyFormation(floor)){
    return _applyOpeningBattleEnemyFormation(enemies,floor);
  }
  // 明示指定がある場合は前衛・後衛の数もそのとおりに割り振り、以降の自動配置を行わない。
  if(_fixedCount){
    const rearN=Math.max(0,Math.min(enemies.length,_fixedCount[1]));
    enemies.forEach((e,i)=>{ if(e) e.lane=(i>=enemies.length-rearN)?'rear':'front'; });
    G._enemyLaneFixed=true;
    if(typeof questReplaceMagicWolfEnemies==='function') questReplaceMagicWolfEnemies(enemies);
    return enemies;
  }
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
      const _sj=Math.floor(rand()*(_si+1));
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
  if(typeof questReplaceMagicWolfEnemies==='function') questReplaceMagicWolfEnemies(enemies);
  return enemies;
}

function generateEliteEnemies(floor){
  const baseG=FLOOR_DATA[floor]?.grade||rollEnemyGrade(floor);
  // 「旅の進捗」パネルで先読み済みなら、その個体・ATK/HPをそのまま使い表示と一致させる。
  const preview=typeof _ensureWaveEnemyPreview==='function'
    ?_ensureWaveEnemyPreview(G._wave,'elite'):null;
  const bossDef=(preview&&preview.def)||_pickBossEnemyDef(baseG)||_pickEnemyDef(baseG);
  const make=(def,isCenter)=>{
    const {atk,hp}=(isCenter&&preview&&preview.def===def)
      ?{atk:preview.atk,hp:preview.hp}
      :enemyStats(def,floor,(G._extraBattleMult||1.0));
    const kws=[...(def.keywords||[])];
    if(isCenter&&!kws.includes('エリート')) kws.push('エリート');
    const e=_mkEnemy(atk,hp,def.name,def.icon,baseG,_kwShield(def),kws.filter(k=>k!=='ボス'),def.race||'-');
    _applyEnemyDefAbilities(e,def);
    e.keywords=(e.keywords||[]).filter(k=>k!=='ボス');
    e.lane=isCenter?'rear':'front';
    e._visualShift=false;
    if(isCenter) e.elite=true;
    delete e.boss;
    return e;
  };
  // エリート戦の数。後衛は1（エリート単独）か3（側近・エリート・側近）。
  const _fixedElite=_sceneEnemyCount('elite');
  const rearN=_fixedElite?Math.max(1,Math.min(3,_fixedElite[1])):3;
  const frontCount=Math.min(ENEMY_FRONT_SLOTS||7,
    _fixedElite?Math.max(0,_fixedElite[0]-rearN):3);
  const enemies=[];
  for(let i=0;i<frontCount;i++){
    enemies.push(make(_pickNonBossEnemyDefDifferent(baseG,bossDef.name),false));
  }
  const sideDef=_sideBossDef(bossDef,baseG);
  if(rearN>=3){
    // make()は中央以外をfrontにするため、側近2体は明示的に後衛へ置き直す。
    const left=make(sideDef,false),center=make(bossDef,true),right=make(sideDef,false);
    left.lane=center.lane=right.lane='rear';
    enemies.push(left,center,right);
  }else{
    enemies.push(make(bossDef,true));
  }
  G._isEliteFight=true;
  G._eliteIdx=frontCount+(rearN>=3?1:0);
  G._enemyLaneFixed=true;
  G._extraBattleMult=1.0;
  // 明示指定がある場合は前衛・後衛の数をそのまま保つ（_enforceLaneRulesは混在を強制する）。
  if(!_fixedElite) _enforceLaneRules(enemies);
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
