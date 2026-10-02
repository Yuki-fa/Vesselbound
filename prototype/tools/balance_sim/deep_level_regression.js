'use strict';

// 深層シート→敵生成→プレビュー／保存の回帰。Chrome・サーバーは不要。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const sheet=require('./sheet_data');
const ROOT=path.resolve(__dirname,'../..');
require('./stub');
global.requestAnimationFrame=()=>0;
global.setInterval=()=>0;
console.table=()=>{};
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
for(const match of html.matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)){
  if(!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT,match[1]),'utf8'),{filename:match[1]});
}
let checked=0;
function check(name,fn){ fn(); checked++; console.log('OK '+name); }
const copy=value=>JSON.parse(JSON.stringify(value));
const codeOf=value=>String(value&&(value.artCode||value._artCode||value.No||value.no||value['No.']||value.code)||'').toUpperCase();
const modes=[
  {name:'1周目',first:true,cleared:false},
  {name:'2周目',first:false,cleared:true},
  {name:'デバッグ2周目',first:false,cleared:false,debug:true,cycle:2},
  {name:'オンライン',first:false,cleared:false,online:true},
  {name:'デバッグ1周目',first:true,cleared:true,debug:true,cycle:1},
];
function reset(mode){
  initState();
  G._debugMode=!!mode.debug;G._onlineMode=!!mode.online;
  G._debugStoryCycle=mode.cycle||2;
  G._waveLife=3;
  SaveProfile.hasClearedRun=()=>!!mode.cleared;
}
function assertUnitRange(unit,floor){
  const def=ENEMY_POOL.find(def=>codeOf(def)===codeOf(unit))||ENEMY_POOL.find(def=>def.name===unit.name);
  assert.ok(def,'敵の定義: '+unit.name);
  const mult=FLOOR_DATA[floor].mult;
  const [atkMin,atkMax]=def.baseAtk.map(value=>Math.max(1,Math.round(value*mult)));
  const [hpMin,hpMax]=def.baseHp.map(value=>Math.max(1,Math.round(value*mult)));
  assert.ok(unit.atk>=atkMin&&unit.atk<=atkMax,`${unit.name} ATK=${unit.atk} ${atkMin}〜${atkMax}`);
  assert.ok(unit.hp>=hpMin&&unit.hp<=hpMax,`${unit.name} HP=${unit.hp} ${hpMin}〜${hpMax}`);
}

(async()=>{
  await loadGameData();
  const rows=sheet.parseCsv(sheet.loadLocalXlsxData().deepLevel);
  const headers=rows.shift();
  const expected={};
  let map='';
  for(const cells of rows){
    const row=Object.fromEntries(headers.map((header,index)=>[header,cells[index]]));
    map=row['マップ']||map;
    const deep=Number(row['深層レベル']);
    if(deep) (expected[map]||={})[deep]={mult:Number(row['補正']),grade:Number(row['グレード'])};
  }
  const assertSheet=()=>{
    for(const [map,levels] of Object.entries(expected)){
      assert.equal(_mapDeepLevelsPerMap(map),Object.keys(levels).length);
      for(const [deep,data] of Object.entries(levels)){
        const fd=FLOOR_DATA[floorForMapDeep(map,deep)];
        assert.deepEqual({mult:fd.mult,grade:fd.grade},data);
        assert.equal(String(fd.map),map);assert.equal(fd.deepLevel,Number(deep));
      }
    }
    // 段数・行数はシートに従う（ステージ5は2026-10-02に4段へ変更）。
    assert.equal(Object.keys(FLOOR_DATA._floorIdsByMap['5']).length,Object.keys(expected['5']).length);
    assert.equal(FLOOR_DATA.filter(Boolean).length,Object.values(expected).reduce((n,levels)=>n+Object.keys(levels).length,0));
  };
  check('全40行をマップ・深層で参照し、闘技場の行がステージ5を上書きしない',assertSheet);
  check('既存のG.floor 1〜30を維持し、深層7と闘技場を追加番号で参照',()=>{
    for(let floor=1;floor<=30;floor++){
      if(!FLOOR_DATA[floor]) continue; // ステージ5の段数がシートで6未満なら、その分の番号は空き
      assert.equal(FLOOR_DATA[floor].map,Math.ceil(floor/6));
      assert.equal(FLOOR_DATA[floor].deepLevel,(floor-1)%6+1);
    }
    assert.deepEqual([1,2,3,4].map(map=>floorForMapDeep(map,7)),[31,32,33,34]);
    assert.deepEqual([1,2,3,4,5,6].map(deep=>floorForMapDeep('闘技場',deep)),[35,36,37,38,39,40]);
  });
  const originalCsv=window.VESSELBOUND_LOCAL_XLSX_CSV.deepLevel;
  const reorderedHeaders=['グレード','補正','深層レベル','マップ'];
  window.VESSELBOUND_LOCAL_XLSX_CSV.deepLevel=[reorderedHeaders.join(','),...rows.map(cells=>reorderedHeaders.map(header=>cells[headers.indexOf(header)]||'').join(','))].join('\n');
  try{await loadGameData();check('深層シートの列の並べ替えでもヘッダ名で読む',assertSheet);}
  finally{window.VESSELBOUND_LOCAL_XLSX_CSV.deepLevel=originalCsv;}
  const originalFloorCsv=window.VESSELBOUND_LOCAL_XLSX_CSV.floor;
  window.VESSELBOUND_LOCAL_XLSX_CSV.deepLevel='名前\n';
  window.VESSELBOUND_LOCAL_XLSX_CSV.floor='階層,グレード,補正,ボス\n1,1,1,\n2,1,1.1,\n3,1,1.2,\n4,1,1.3,\n5,1,1.4,✓\n6,2,1.5,\n7,2,1.6,\n8,2,1.7,\n9,2,1.8,\n10,2,1.9,✓\n';
  try{
    await loadGameData();
    check('深層表の無い旧階層CSVも従来の番号で参照できる',()=>{
      assert.equal(floorForMapDeep(2,1),6);
      assert.equal(_mapDeepLevelsPerMap(2),5);
      assert.equal(FLOOR_DATA[6].mult,1.5);
      assert.deepEqual(BOSS_FLOORS,[4,9]);
    });
  }finally{
    window.VESSELBOUND_LOCAL_XLSX_CSV.deepLevel=originalCsv;
    window.VESSELBOUND_LOCAL_XLSX_CSV.floor=originalFloorCsv;
    await loadGameData();
  }

  for(const mode of modes){
    reset(mode);
    check(mode.name+'：通常戦の深層割り当てとエリート3・ボス6/7',()=>{
      for(let wave=1;wave<=4;wave++){
        G._wave=wave;
        const normal=[];
        for(const [index,type] of _waveRouteForWave(wave).entries()){
          const stage=index+1;
          const deep=_waveDeepLevel(stage,wave);
          if(type==='battle') normal.push(deep);
          if(type==='elite') assert.equal(deep,3);
          if(type==='boss') assert.equal(deep,mode.first?6:7);
          if(!['elite','boss'].includes(type)) continue;
          G._waveStage=stage;G._mapBattle={type,floor:_waveStageFloor(wave,stage)};
          G._extraBattleMult=99;G._forceBossMult=99;
          const preview=_ensureWaveEnemyPreview(wave,type);
          assert.equal(preview.floor,G._mapBattle.floor);
          const enemies=type==='elite'?generateEliteEnemies(preview.floor):generateEnemies(preview.floor);
          const leader=enemies.find(unit=>unit[type]);
          assert.equal(leader.name,preview.def.name);
          assert.deepEqual({atk:leader.atk,hp:leader.hp},{atk:preview.atk,hp:preview.hp});
          enemies.forEach(unit=>assertUnitRange(unit,preview.floor));
          const count=ENEMY_COUNT_BY_SCENE[type][wave];
          assert.equal(enemies.length,count[0]);
          assert.equal(enemies.filter(unit=>unit.lane==='rear').length,count[1]);
        }
        const repeat=!mode.online&&(mode.debug?mode.cycle===2:mode.cleared);
        const expectedNormal=wave===1?(repeat?[1,2,3,4,5]:mode.first?[1,2,4,5]:[1,2,4,5,6])
          :mode.first?[1,2,4,5,6]:[1,2,3,4,5,6];
        assert.deepEqual(normal,expectedNormal);
      }
    });
  }
  reset(modes[1]);
  check('ステージ5は通常戦2・通常ボス1・伏せられたラスボス3、固定編成を維持',()=>{
    G._wave=5;
    for(const stage of [2,3,4,5]){
      G._waveStage=stage;
      const type=stage>=4?'boss':'battle';
      G._waveBattleType=type;
      const floor=_waveStageFloor(5,stage);
      G._mapBattle={type,floor};
      // ステージ5：通常戦1回目＝深層1、2回目＝深層2、ボス＝深層3、伏せられたラスボス＝深層4（2026-10-02）。
      assert.equal(FLOOR_DATA[floor].deepLevel,{2:1,3:2,4:3,5:4}[stage]);
      const enemies=generateEnemies(floor);
      assert.equal(enemies.length,stage===5?10:stage===4?9:6);
      enemies.forEach(unit=>assertUnitRange(unit,floor));
      if(stage===4) assert.equal(codeOf(enemies.find(unit=>unit.boss)),SCENE5_BOSS_ENEMY_NO);
      if(stage===5) assert.deepEqual(enemies.filter(unit=>unit.lane==='rear').map(codeOf),[FINAL_BOSS_LEFT_ENEMY_NO,FINAL_BOSS_ENEMY_NO,FINAL_BOSS_RIGHT_ENEMY_NO]);
    }
  });
  check('デバッグの個体切替も深層7で再計算する',()=>{
    reset(modes[2]);G._wave=2;
    _ensureWaveEnemyPreview(2,'elite');_ensureWaveEnemyPreview(2,'boss');
    debugAdvanceEliteBoss();
    for(const type of ['elite','boss']){
      const preview=G._waveEnemyPreview[`2:${type}`];
      assert.equal(FLOOR_DATA[preview.floor].deepLevel,type==='elite'?3:7);
      assertUnitRange({...preview.def,atk:preview.atk,hp:preview.hp},preview.floor);
    }
  });

  check('闘技場6戦は専用深層1〜6・グレード1、編成と後衛役だけの2倍を維持',()=>{
    reset(modes[1]);G._wave=3;
    for(let round=1;round<=6;round++){
      const floor=_arenaRoundStatFloor(round);
      assert.deepEqual(FLOOR_DATA[floor],{map:'闘技場',deepLevel:round,grade:1,mult:round});
      const enemies=runWithKeyedRandom('deep-arena:'+round,()=>generateArenaEnemies(round));
      assert.equal(enemies.length,[0,5,7,6,8,7,1][round]);
      assert.equal(enemies.filter(unit=>unit.lane==='rear').length,[0,1,3,1,3,1,1][round]);
      assert.ok(enemies.every(unit=>unit.grade===1&&unit.goldRange.join(',')==='0,0'));
      const ordinary=enemies.filter(unit=>!unit.elite&&!unit.boss);
      ordinary.forEach(unit=>assertUnitRange(unit,floor));
      const leader=enemies.find(unit=>unit.elite||unit.boss);
      assert.equal(leader.lane,'rear');
      if(round===6){assert.equal(leader.name,ARENA_CHAMPION_ENEMY_NAME);assertUnitRange(leader,floor);continue;}
      const neighbors=enemies.filter(unit=>unit.lane==='rear'&&!unit.elite&&!unit.boss);
      const basis=neighbors.length===2?neighbors:ordinary.filter(unit=>unit.lane==='front');
      assert.equal(leader.atk,Math.round(basis.reduce((sum,unit)=>sum+unit.atk,0)/basis.length*2));
      assert.equal(leader.hp,Math.round(basis.reduce((sum,unit)=>sum+unit.hp,0)/basis.length*2));
      if(round===2||round===4){
        assert.equal(neighbors[0].name,neighbors[1].name);
        assert.equal(ENEMY_POOL.find(def=>def.name===neighbors[0].name).grade,round===2?1:2);
        assert.notEqual(leader.name,G._waveBosses[round===2?1:2]);
      }
    }
  });
  let pursuitStats;
  for(const online of [false,true]){
    reset({...modes[1],online});G._wave=2;G._waveStage=6;
    G.questProgress.Q004={questId:'Q004',wave:2,status:'accepted',encounterPhase:'garm',encounterTarget:{wave:2,stage:6}};
    check((online?'オンライン':'オフライン')+'：魔狼追撃は深層3、保存プレビューと実戦が一致',()=>{
      const preview=runWithKeyedRandom('deep-garm',()=>questGarmPreviewStats());
      assert.ok(preview);
      const enemies=generateQuestGarmEnemies();
      const leader=enemies.find(unit=>unit._questGarm);
      assert.deepEqual({atk:leader.atk,hp:leader.hp},{atk:preview.atk,hp:preview.hp});
      enemies.forEach(unit=>assertUnitRange(unit,questGarmStatFloor()));
      assert.equal(questBattleStartSpec(6).floor,questGarmStatFloor());
      if(pursuitStats) assert.deepEqual({atk:preview.atk,hp:preview.hp},pursuitStats);
      pursuitStats={atk:preview.atk,hp:preview.hp};
    });
  }
  check('コレクションは実際の深層で表示し、固定敵・追撃・闘技場を混同しない',()=>{
    // ステージ5のボス＝深層3、伏せられたラスボス（と左右）＝深層4。倍率はシートの値を読む（2026-10-02）。
    const s5=deep=>FLOOR_DATA[floorForMapDeep(5,deep)].mult;
    for(const [code,mult] of [[SCENE5_BOSS_ENEMY_NO,s5(3)],[FINAL_BOSS_ENEMY_NO,s5(4)],[FINAL_BOSS_LEFT_ENEMY_NO,s5(4)],[FINAL_BOSS_RIGHT_ENEMY_NO,s5(4)],['EN027',2.5],['EN048',6]]){
      const def=ENEMY_POOL.find(def=>codeOf(def)===code);
      const range=_collectionEnemyStats(def);
      assert.deepEqual(range,{atkMin:Math.round(def.baseAtk[0]*mult),atkMax:Math.round(def.baseAtk[1]*mult),hpMin:Math.round(def.baseHp[0]*mult),hpMax:Math.round(def.baseHp[1]*mult)});
    }
  });
  check('コレクションのカードの写しでも闘技場の後衛2倍を表示範囲へ含める',()=>{
    for(let seed=0;seed<16;seed++){
      reset(modes[1]);G._wave=3;G._runSeed=seed;
      for(let round=1;round<=6;round++){
        const enemies=runWithKeyedRandom(`collection-arena:${seed}:${round}`,()=>generateArenaEnemies(round));
        for(const unit of enemies){
          const def=ENEMY_POOL.find(def=>codeOf(def)===codeOf(unit));
          const range=_collectionEnemyStats(copy(def));
          assert.ok(unit.atk>=range.atkMin&&unit.atk<=range.atkMax,`${unit.name} ATK=${unit.atk} ${range.atkMin}〜${range.atkMax}`);
          assert.ok(unit.hp>=range.hpMin&&unit.hp<=range.hpMax,`${unit.name} HP=${unit.hp} ${range.hpMin}〜${range.hpMax}`);
        }
      }
    }
  });
  check('旧倍率の保存値を受け入れ、floor・敵スナップショット・闘技場入口を復元',()=>{
    reset(modes[1]);SaveRun.begin();
    G._wave=2;G._waveStage=2;G.floor=8;G._waveLife=3;
    G._mapBattle={type:'battle',floor:8};G._battleBossMult=2;
    G._waveEnemySnapshot=generateEnemies(8);
    G._arenaEntrySnapshot=_arenaCaptureEntrySnapshot();
    const saved=SaveRun.buildRunSave('reward');
    SaveRun.restoreRunState(copy(saved));
    assert.equal(G.floor,8);assert.equal(FLOOR_DATA[G.floor].map,2);
    assert.deepEqual(G._waveEnemySnapshot,saved.state.progress._waveEnemySnapshot);
    assert.deepEqual(G._arenaEntrySnapshot,saved.state.choices._arenaEntrySnapshot);
    assert.equal(G._battleBossMult,2);
    G.floor=_arenaRoundStatFloor(1);_arenaRestoreEntrySnapshot();assert.equal(G.floor,8);
    G.floor=floorForMapDeep(2,7);G._mapBattle.floor=G.floor;
    G._waveStage=_waveRouteForWave(2).indexOf('boss')+1;
    const deepSeven=SaveRun.buildRunSave('reward');
    SaveRun.restoreRunState(copy(deepSeven));
    assert.equal(FLOOR_DATA[G.floor].deepLevel,7);assert.equal(FLOOR_DATA[G.floor].map,2);
  });
  console.log(`深層レベル回帰: ${checked}項目 OK`);
})().catch(error=>{console.error(error);process.exitCode=1;});
