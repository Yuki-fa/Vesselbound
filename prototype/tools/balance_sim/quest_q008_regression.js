'use strict';

// Q008：内蔵シート→受託時の割り振り→敵の置き換え→コア結果→保存／塔報酬。Chrome不要。
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sheet=require('./sheet_data');
const ROOT=path.resolve(__dirname,'../..');
require('./stub');
global.requestAnimationFrame=()=>0;
global.setInterval=()=>0;
console.table=()=>{};
for(const match of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)){
  if(!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT,match[1]),'utf8'),{filename:match[1]});
}
let checked=0;
const check=(name,fn)=>{fn();checked++;console.log('OK '+name);};
const copy=value=>JSON.parse(JSON.stringify(value));
function reset(first=false,seed=1){
  initState();SaveProfile.hasClearedRun=()=>!first;
  G._runId='q008-regression';G._runSeed=seed;G._runRngState=seed;
  G._wave=3;G._waveStage=_waveRouteForWave(3).indexOf('city')+1;
  G._waveVillage=true;G._waveLife=3;
  return questDebugForceWaveQuest(3,'Q008');
}
function accept(first=false,seed=1){
  const entry=reset(first,seed);
  entry.status='accepted';_qAssignEnemyReplacements(entry);
  return _qActiveEntry();
}
function assertCounts(counts,battles){
  assert.equal(counts.length,battles);
  assert.ok(counts.every(n=>Number.isInteger(n)&&n>=1&&n<=3));
  assert.equal(counts.reduce((sum,n)=>sum+n,0),8);
}
const ordinary=(front,rear)=>[
  ...Array.from({length:front},(_,i)=>({id:'front-'+i,name:'通常敵',atk:1,hp:10,lane:'front'})),
  ...Array.from({length:rear},(_,i)=>({id:'rear-'+i,name:'通常敵',atk:1,hp:10,lane:'rear'})),
];
function testEnemies(entry,count=3){
  G._waveStage=entry.enemyReplacementTargets[0].stage;
  // この生成試験だけは、上限の3体を明示する（受託時の割り振りは別に検査）。
  entry.enemyReplacementTargets[0].count=count;
  return questReplaceBattleEnemies(ordinary(4,1),_waveStageFloor(3,G._waveStage)).filter(u=>u._questEnemyReplacementId);
}
function coreResult(enemies,defense=false){
  G.allies=[{id:'killer',name:'検査用',atk:999,hp:999,maxHp:999,lane:'front',keywords:defense?['防戦']:['全体攻撃']}];
  G.enemies=copy(enemies);
  G.rings=defense?[]:[copy(RING_POOL.find(ring=>ring.name==='神速の指輪'))];
  const state=_createPveCoreState();_stampCoreSideSlots(state);
  // 本番の保存と同じ入力を使い、置き換えた敵の個体印も含めて計算へ渡す。
  return SaveRun.computeBattle(state,51);
}

(async()=>{
  await loadGameData();
  SaveRun.ready();
  check('Q008の台詞・表情・説明・割り振り・2乗×10Gはシートから読む',()=>{
    const row=sheet.sheetRows('quest').find(row=>row['No.']==='Q008_1');
    assert.equal(QUEST_DATA.Q008_1.description,row['クエスト説明文']);
    assert.equal(QUEST_DATA.Q008_1.initial.length,6);
    assert.deepEqual(QUEST_DATA.Q008_1.enemyReplacementCounts,{min:1,max:3,total:8});
    assert.deepEqual(QUEST_DATA.Q008_2.rewardGoldByDefeat,{power:2,multiplier:10});
    assert.equal(QUEST_CONFIG.Q008.portraitB,QUEST_CONFIG.Q007.portraitB);
    assert.deepEqual(_qRegionIds(3),['Q007','Q008']);
    const def=ENEMY_POOL.find(def=>_enemyDefCode(def)==='EN048');
    assert.equal(def.name,'ベイティル');assert.equal(def.spawnEnabled,false);
    assert.equal(coreFleesInsteadOfAttack({...def,desc:def.desc}),true);
  });
  check('指定の4戦／1周目3戦のどの割り振りも1〜3体・合計8体',()=>{
    for(const battles of [4,3]) for(let i=0;i<300;i++){
      assertCounts(questAllocateEnemyCounts(battles,1,3,8,createSeededRng(i).next),battles);
    }
  });
  for(const first of [false,true]){
    check((first?'1周目':'通常周回')+'：実際の街→塔の全戦闘へ合計8体を保存し、再開しても同じ',()=>{
      for(let seed=1;seed<=100;seed++){
        const entry=accept(first,seed),targets=copy(entry.enemyReplacementTargets);
        const route=_waveRouteForWave(3),town=route.indexOf('city'),tower=route.indexOf('altar');
        const expected=route.map((type,index)=>({type,stage:index+1}))
          .filter(({type,stage})=>stage>town+1&&stage<=tower&&['battle','elite','boss'].includes(type)).map(x=>x.stage);
        assertCounts(targets.map(t=>t.count),expected.length);
        assert.deepEqual(targets.map(t=>t.stage),expected);
        assert.equal(route[targets.at(-1).stage-1],'boss');
        assert.equal(_qDescription(),QUEST_DATA.Q008_1.description);
        const before=G._runRngState;
        _qAssignEnemyReplacements(entry);assert.equal(G._runRngState,before);
        const save=SaveRun.buildRunSave('town');
        entry.enemyReplacementTargets=[];entry.defeatedCount=77;
        SaveRun.restoreRunState(save);
        assert.deepEqual(G.questProgress.Q008.enemyReplacementTargets,targets);
        assert.equal(G.questProgress.Q008.defeatedCount,0);
        _qAssignEnemyReplacements(G.questProgress.Q008);
        assert.deepEqual(G.questProgress.Q008.enemyReplacementTargets,targets);
      }
    });
    check((first?'1周目':'通常周回')+'：受託前と敵の総数・前後衛数が同じで、8体の置き換え・深層補正・前衛左2体の除外を守る',()=>{
      const entry=accept(first,91);
      let added=0;
      for(const target of entry.enemyReplacementTargets){
        G._waveStage=target.stage;G._waveBattleType=_waveRouteNode(target.stage);
        const floor=_waveStageFloor(3,target.stage),type=G._waveBattleType;
        G._mapBattle={type,floor};
        const generate=()=>runWithKeyedRandom('q008:normal:'+target.stage,()=>generateEnemies(floor));
        const preview=copy(G._waveEnemyPreview||{}),bosses=copy(G._waveBosses||{});
        entry.status='offered';const before=generate();entry.status='accepted';
        G._waveEnemyPreview=preview;G._waveBosses=bosses;
        const after=generate(),extra=after.filter(u=>u._questEnemyReplacementId==='Q008');
        const view=u=>({name:u.name,atk:u.atk,hp:u.hp,lane:u.lane,keywords:u.keywords,artCode:u.artCode});
        assert.equal(after.length,before.length);
        assert.deepEqual(after.map(u=>u.lane),before.map(u=>u.lane));
        after.forEach((unit,index)=>{
          if(!unit._questEnemyReplacementId) assert.deepEqual(view(unit),view(before[index]));
          else assert.ok(!before[index].boss&&!before[index].elite);
        });
        assert.equal(extra.length,target.count);added+=extra.length;
        const fronts=after.filter(u=>u.lane==='front');
        assert.ok(fronts.slice(0,2).every(u=>!u._questEnemyReplacementId));
        assert.ok(after.length<=MAX_ENEMIES&&fronts.length<=ENEMY_FRONT_SLOTS);
        const def=ENEMY_POOL.find(def=>_enemyDefCode(def)==='EN048'),range=enemyStatRanges(def,floor);
        for(const unit of extra){
          assert.ok(unit.atk>=range.atkMin&&unit.atk<=range.atkMax);
          assert.ok(unit.hp>=range.hpMin&&unit.hp<=range.hpMax);
        }
        const ids=after.map(unit=>unit.id);questReplaceBattleEnemies(after,floor);
        assert.deepEqual(after.map(unit=>unit.id),ids);
        assert.equal(after.filter(unit=>unit._questEnemyReplacementId).length,extra.length);
      }
      assert.equal(added,8);
    });
  }
  check('前衛左2体、後衛のboss／eliteの印とキーワード、ボス本体を置き換えない',()=>{
    const entry=accept();G._waveStage=entry.enemyReplacementTargets[0].stage;entry.enemyReplacementTargets[0].count=3;
    for(const mark of [{boss:true},{elite:true},{role:'boss'},{role:'elite'},{keywords:['ボス']},{keywords:['エリート']}]){
      const board=ordinary(5,3);Object.assign(board[6],mark);const old=board.slice();
      questReplaceBattleEnemies(board,_waveStageFloor(3,G._waveStage));
      assert.equal(board.length,8);assert.equal(board[0],old[0]);assert.equal(board[1],old[1]);assert.equal(board[6],old[6]);
      assert.deepEqual(board.map(unit=>unit.id),old.map(unit=>unit.id));
      assert.equal(board.filter(u=>u._questEnemyReplacementId).length,3);
    }
  });
  check('置き換え枠の少ない戦の分を他戦へ回し、受託時に合計8体を確定する',()=>{
    assert.deepEqual(questAllocateEnemyCounts(4,1,3,8,()=>0,[1,1,3,3]),[1,1,3,3]);
    const original=ENEMY_COUNT_BY_SCENE.battle[3];
    try{
      ENEMY_COUNT_BY_SCENE.battle[3]=[4,1];
      for(const first of [false,true]){
        const entry=accept(first);assertCounts(entry.enemyReplacementTargets.map(t=>t.count),entry.enemyReplacementTargets.length);
        assert.ok(entry.enemyReplacementTargets.filter(t=>_waveRouteNode(t.stage)==='battle').every(t=>t.count<=2));
        assert.equal(entry.enemyReplacementShortfall,0);
      }
    }finally{ENEMY_COUNT_BY_SCENE.battle[3]=original;}
  });
  check('生成後に実際の空き枠が不足しても、未戦闘の割り振りへ回して8体を保つ',()=>{
    const entry=accept();entry.enemyReplacementTargets.forEach((t,i)=>{t.count=[3,1,1,3][i];});
    G._waveStage=entry.enemyReplacementTargets[0].stage;
    const board=ordinary(2,1);questReplaceBattleEnemies(board,_waveStageFloor(3,G._waveStage));
    assert.equal(board.length,3);assert.equal(board.filter(u=>u._questEnemyReplacementId).length,1);
    assert.equal(entry.enemyReplacementTargets[0].count,1);
    assertCounts(entry.enemyReplacementTargets.map(t=>t.count),entry.enemyReplacementTargets.length);assert.equal(entry.enemyReplacementShortfall,0);
  });
  check('保護対象しかいない戦は置き換えず、残りの戦を1〜3体に保って合計8体へ回す',()=>{
    const entry=accept();G._waveStage=entry.enemyReplacementTargets[0].stage;
    const board=ordinary(2,1);board[2].elite=true;const before=copy(board);
    questReplaceBattleEnemies(board,_waveStageFloor(3,G._waveStage));assert.deepEqual(board,before);
    assert.equal(entry.enemyReplacementTargets[0].count,0);
    assert.ok(entry.enemyReplacementTargets.slice(1).every(t=>t.count>=1&&t.count<=3));
    assert.equal(entry.enemyReplacementTargets.reduce((sum,t)=>sum+t.count,0),8);
    assert.equal(entry.enemyReplacementShortfall,0);
  });
  check('全戦闘を合わせても枠が足りない時は保護対象を守り、置き換え可能数と不足数を保存する',()=>{
    const original=ENEMY_COUNT_BY_SCENE.battle[3];
    try{
      ENEMY_COUNT_BY_SCENE.battle[3]=[3,1];
      const entry=accept(),counts=entry.enemyReplacementTargets.map(t=>t.count);
      const capacity=entry.enemyReplacementTargets.reduce((sum,t)=>sum+Math.min(3,_qEnemyReplacementCapacity(entry,t.stage)),0);
      assert.equal(counts.reduce((sum,n)=>sum+n,0),capacity);assert.equal(entry.enemyReplacementShortfall,8-capacity);
      assert.ok(counts.every(n=>n>=1&&n<=3));
      const save=SaveRun.buildRunSave('town');SaveRun.restoreRunState(save);assert.equal(G.questProgress.Q008.enemyReplacementShortfall,8-capacity);
    }finally{ENEMY_COUNT_BY_SCENE.battle[3]=original;}
  });

  let killed;
  check('コア結果の敵deathだけ数え、通常敵・味方death・fled・同じ個体の再送を数えない',()=>{
    const entry=accept(),units=testEnemies(entry),result=coreResult(units);
    assert.equal(result.events.filter(ev=>ev.type==='death'&&ev.side==='p2').length,3);
    assert.equal(questRecordBattleDeaths(result.events,result.setup.units.p2),3);
    assert.equal(questRecordBattleDeaths(result.events,result.setup.units.p2),0);
    assert.ok(result.setup.units.p2.every(unit=>unit._questDefeatKey));
    const first=units[0];
    assert.equal(questRecordBattleDeaths([{type:'death',side:'p1',unitId:first.id},{type:'death',side:'p2',unitId:'front-0'}],[first,...ordinary(4,1)]),0);
    assert.equal(entry.defeatedCount,3);
    const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);
    assert.equal(G.questProgress.Q008.defeatedCount,3);
    assert.equal(questRecordBattleDeaths(result.events,result.setup.units.p2),0);
    killed=copy(result);
  });
  check('攻撃の代わりの逃走もATK0の逃走も、コアのfledなので討伐数は0',()=>{
    for(const atkZero of [false,true]){
      const entry=accept(),units=testEnemies(entry);
      if(atkZero) units.forEach(unit=>{unit.atk=0;unit.baseAtk=0;unit.desc='';unit.effect=null;});
      assert.ok(units.every(unit=>coreFleesInsteadOfAttack(unit)===!atkZero));
      const result=coreResult(units,true);
      assert.equal(result.events.filter(ev=>ev.type==='fled').length,3);
      assert.equal(result.events.filter(ev=>ev.type==='death').length,0);
      assert.equal(questRecordBattleDeaths(result.events,result.setup.units.p2),0);
      assert.equal(entry.defeatedCount,0);
    }
  });
  check('受託前・拒否・完了後・オンライン・闘技場・試験戦闘では置き換え／集計しない',()=>{
    for(const status of ['offered','rejected','completed']){
      const entry=accept();entry.status=status;const board=ordinary(4,1);G._waveStage=entry.enemyReplacementTargets[0].stage;
      const before=copy(board);questReplaceBattleEnemies(board,13);assert.deepEqual(board,before);
      assert.equal(questRecordBattleDeaths(killed.events,killed.setup.units.p2),0);
    }
    for(const flag of ['_onlineMode','_arenaActive','_testBattleMode','_libraryTestBattleMode']){
      const entry=accept(),board=ordinary(4,1);G._waveStage=entry.enemyReplacementTargets[0].stage;G[flag]=true;
      const before=copy(board);questReplaceBattleEnemies(board,13);assert.deepEqual(board,before);
      assert.equal(questRecordBattleDeaths(killed.events,killed.setup.units.p2),0);assert.equal(entry.defeatedCount,0);
    }
    reset();const q7=questDebugForceWaveQuest(3,'Q007');q7.status='accepted';q7.transportCount=2;
    const before=copy(q7),board=ordinary(4,1),beforeBoard=copy(board);questReplaceBattleEnemies(board,13);
    assert.deepEqual(board,beforeBoard);assert.equal(questRecordBattleDeaths(killed.events,killed.setup.units.p2),0);
    assert.deepEqual(q7,before);
  });
  check('0〜8体はシートの2乗×10G、X置換、台詞3の支払い、0体は台詞1→A1〜A4',()=>{
    const entry=accept(),data=QUEST_DATA.Q008_2;
    for(let count=0;count<=8;count++){
      entry.defeatedCount=count;const dialogue=_qTowerArrivalDialogue(entry,data);
      assert.equal(dialogue.reward,count*count*10);
      if(count){
        assert.equal(dialogue.lines[1].text,data.initial[1].text.replace(/X/g,String(count)));
        assert.equal(dialogue.rewardLine,2);
      }else{
        assert.deepEqual(dialogue.lines,[data.initial[0],..._qSpecialLines(data,'A')]);
        assert.equal(dialogue.lines.length,5);assert.equal(dialogue.rewardLine,-1);
      }
    }
    const q5=questDebugForceWaveQuest(2,'Q005');
    assert.deepEqual(_qTowerArrivalDialogue(q5,QUEST_DATA.Q005_2),{lines:QUEST_DATA.Q005_2.initial,reward:200,rewardLine:2});
  });
  // 演出を丸ごと省いても、保存されたコアの全結果から集計されることを確認する。
  const entry=accept();G._waveStage=entry.enemyReplacementTargets[0].stage;
  const beforeBattle=SaveRun.buildRunSave('battle',killed);
  vm.runInThisContext(`_flushCorePveHitEvents=async()=>{};finishBattleAsVictory=async()=>{};
    _battleRunStale=()=>false;requestBattleCompact=()=>{};_refreshManaDisplays=()=>{};`);
  // 共通stubの即時タイマーでも、演出待ちの時計だけは確実に先へ進める。
  let presentationClock=0;global.performance.now=()=>presentationClock+=10000;
  const replay=async()=>{G._battleCoreEvents=[];SaveRun.installSetup(killed);await SaveRun.replay(killed,0);};
  await replay();
  check('保存済み戦闘の全イベントから集計でき、途中再開・結果の再読込で二重に数えない',()=>{
    assert.equal(G.questProgress.Q008.defeatedCount,3);
    assert.equal(questRecordBattleDeaths(killed.events,killed.setup.units.p2),0);
    SaveRun.restoreRunState(beforeBattle);assert.equal(G.questProgress.Q008.defeatedCount,0);
  });
  await replay();
  check('戦闘前チェックポイントからの再開は同じ3体を1回だけ計上する',()=>{
    assert.equal(G.questProgress.Q008.defeatedCount,3);
    const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);
    assert.equal(questRecordBattleDeaths(killed.events,killed.setup.units.p2),0);
  });
  check('新しい項目のない旧クエスト状態は0体・空の割り振りとして補い、デバッグ強制終了も使える',()=>{
    reset();G.questProgress.Q008={questId:'Q008',wave:3,status:'accepted',tavernVariant:'Q008_1',towerVariant:'Q008_2'};
    assert.equal(_qActiveEntry().defeatedCount,0);assert.deepEqual(_qActiveEntry().defeatedEnemyKeys,[]);
    _qAssignEnemyReplacements(_qActiveEntry());assertCounts(_qActiveEntry().enemyReplacementTargets.map(t=>t.count),_qActiveEntry().enemyReplacementTargets.length);
    _qTowerSession=true;questForceEndEventForDebug();assert.equal(_qTowerSession,false);
    assert.equal(G.questProgress.Q008.status,'accepted');
  });
  // DOMの描画だけを省き、本番の到着イベントのコールバックと共通入金経路を動かす。
  vm.runInThisContext(`_qEnsureStyle=()=>{};_qShowPortraitPair=async()=>{};
    _qStartDialogue=(lines,options)=>{globalThis.q008Dialogue={lines,options};};
    renderVillageScreen=()=>{};`);
  for(const count of [0,4,8]){
    const towerEntry=accept();towerEntry.defeatedCount=count;
    G._isWaveAltar=true;G._waveStage=_waveRouteForWave(3).indexOf('altar')+1;
    const gold=G.gold;
    await maybeStartQ009TowerArrival();
    const {lines,options}=global.q008Dialogue;
    check(count?`${count}体の塔到着：台詞3だけで${count*count*10}Gを共通処理から入金する`:'0体の塔到着：特殊台詞を進めても入金しない',()=>{
      assert.deepEqual(lines,_qTowerArrivalDialogue(towerEntry,QUEST_DATA.Q008_2).lines);
      options.onLine(0);options.onLine(1);assert.equal(G.gold,gold);
      options.onLine(2);assert.equal(G.gold,gold+count*count*10);
      options.onLine(2);assert.equal(G.gold,gold+count*count*10);
      assert.equal(!!towerEntry.towerRewardGiven,count>0);
    });
    // 入金後のチェックポイントを復元し、同じ会話を頭から読んでも再入金しない。
    const paidSave=SaveRun.buildRunSave('tower');SaveRun.restoreRunState(paidSave);
    questForceEndEventForDebug();G._isWaveAltar=true;
    await maybeStartQ009TowerArrival();
    for(let index=0;index<global.q008Dialogue.lines.length;index++) global.q008Dialogue.options.onLine(index);
    await global.q008Dialogue.options.onDone();
    check(`${count}体の塔到着：入金後の再開でも二重払いせず、会話の終わりで完了する`,()=>{
      assert.equal(G.gold,gold+count*count*10);
      assert.equal(G.questProgress.Q008.status,'completed');
      assert.equal(G.questProgress.Q008.towerEventDone,true);assert.equal(_qDescription(),'');
    });
    G._debugMode=true;questPrepareArrivalReplayForDebug(3);await maybeStartQ009TowerArrival();
    for(let index=0;index<global.q008Dialogue.lines.length;index++) global.q008Dialogue.options.onLine(index);
    await global.q008Dialogue.options.onDone();
    check(`${count}体の塔到着：デバッグ再生でも完了記録と入金額を維持する`,()=>{
      assert.equal(G.gold,gold+count*count*10);assert.equal(G.questProgress.Q008.status,'completed');
    });
  }
  delete global.q008Dialogue;
  vm.runInThisContext(`_qReturnToTavernResponse=()=>{};showTavernPortrait=async()=>{};
    _qStartDialogue=(lines,options)=>{
      globalThis.q008TavernLines.push(lines);
      return Promise.resolve(lines.at(-1)?.choices?lines.at(-1).choices[globalThis.q008ChoiceIndex]:null);
    };`);
  for(const choiceIndex of [0,1]){
    const tavernEntry=reset();global.q008ChoiceIndex=choiceIndex;global.q008TavernLines=[];
    await _qRunDirectTavernChoice(tavernEntry,QUEST_DATA.Q008_1,false);
    check(choiceIndex?'酒場の台詞6で断ると拒否台詞へ進み、割り振りは作らない':'酒場の台詞6で受託すると8体の割り振りを保存し、受託台詞へ進む',()=>{
      const [initial,response]=global.q008TavernLines;
      assert.equal(initial.length,6);
      assert.deepEqual(initial.at(-1),_qChoiceLine(QUEST_DATA.Q008_1.initial.at(-1)));
      assert.equal(tavernEntry.status,choiceIndex?'rejected':'accepted');
      assert.deepEqual(response,choiceIndex?QUEST_DATA.Q008_1.rejected:QUEST_DATA.Q008_1.accepted);
      if(choiceIndex) assert.equal(tavernEntry.enemyReplacementTargets?.length||0,0);
      else{
        assertCounts(tavernEntry.enemyReplacementTargets.map(t=>t.count),tavernEntry.enemyReplacementTargets.length);
        assert.deepEqual(SaveRun.loadRun().state.questProgress.Q008.enemyReplacementTargets,tavernEntry.enemyReplacementTargets);
      }
    });
  }
  delete global.q008ChoiceIndex;delete global.q008TavernLines;
  console.log(`Q008 回帰検査: ${checked}件 OK`);
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
