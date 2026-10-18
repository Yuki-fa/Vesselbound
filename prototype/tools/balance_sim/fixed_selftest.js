#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const engine=require('./fixed_engine'),{compareJob}=require('./fixed_compare');
const check=(ok,message)=>assert.ok(ok,message);
async function main(args=process.argv.slice(2)){
  // 第2回は旧比較を保存したまま、現ブランチで再計測した基準を検査する。
  const current=path.join(__dirname,'out_1017b/fixed_baseline');
  const out=args[0]||(fs.existsSync(path.join(current,'compare_meta.json'))?current:path.join(__dirname,'fixed')),
    boardsDir=args[1]||(out===current?path.join(__dirname,'fixed'):out),start=Date.now(),checks=[];
  await engine.initialize();engine.resetOverride();
  const meta=JSON.parse(fs.readFileSync(path.join(out,'compare_meta.json'),'utf8'));
  const rows=fs.readFileSync(path.join(out,'comparisons.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const manifest=JSON.parse(fs.readFileSync(path.join(boardsDir,'boards_manifest.json'),'utf8'));
  const sourceFile=[manifest.options.input,path.join(__dirname,'out_no_boon/runs.jsonl')].find(file=>fs.existsSync(file)&&engine.sha(fs.readFileSync(file,'utf8'))===manifest.inputHash);
  check(sourceFile,'選定に使用した元周回またはout_no_boonの退避に同じJSONLがある');
  const inputs=fs.readFileSync(sourceFile,'utf8'),runs=inputs.trim().split('\n').map(JSON.parse);
  assert.deepEqual(engine.sourceHashes(),meta.sourceHashes,'本体の読み込み元が比較時と異なる');
  assert.deepEqual(engine.toolHashes(),meta.toolHashes,'測定コードが比較時と異なる');
  if(meta.effectProbe)assert.equal(engine.sha(fs.readFileSync(path.join(__dirname,'fixed_effects.js'),'utf8')),meta.effectProbe.scriptHash,'効果再観測のコードが異なる');
  if(meta.boardProvenance){assert.equal(engine.sha(fs.readFileSync(path.join(boardsDir,'boards_manifest.json'),'utf8')),meta.boardProvenance.manifestHash);assert.deepEqual(manifest.sourceHashes,meta.boardProvenance.selectionSourceHashes);}
  else assert.deepEqual(engine.sourceHashes(),manifest.sourceHashes,'旧版の盤面選定記録。本体更新後にfixed_compare.jsを再実行する');
  const boards=new Map();
  for(const scene of engine.SCENES){
    const file=path.join(boardsDir,`boards_${scene.id}.json`),text=fs.readFileSync(file,'utf8'),saved=JSON.parse(text);
    assert.equal(engine.sha(text),meta.boardFiles.find(f=>f.file===path.basename(file)).hash);
    check(saved.boards.length>=5&&saved.boards.length<=8,`${scene.id}: 盤面は5〜8枚`);
    check(saved.samples>=30,`${scene.id}: 選定は30例以上`);
    assert.equal(saved.scene.floor,scene.floor);assert.equal(saved.scene.deepLevel,scene.deepLevel);
    for(const board of saved.boards){
      check(board.baseline.winRate>=.25&&board.baseline.winRate<=.75,`${board.id}: 選定時勝率`);
      const run=runs.find(r=>r.policy===board.source.policy&&r.seed===board.source.seed);
      const battle=run?.battles.find(b=>b.wave===scene.wave&&b.stage===scene.stage&&!b.retry);
      check(battle,`${board.id}: 元周回に初回開戦盤面がある`);
      const added=new Set((board.additions||[]).map(a=>a.slot));
      for(let slot=0;slot<battle.board.length;slot++){
        if(added.has(slot)){assert.equal(battle.board[slot],null,'追加は元の空きマスだけ');continue;}
        assert.deepEqual(board.board[slot],battle.board[slot],`${board.id}: 元カードを改変しない`);
      }
      assert.equal(board.state.gold,battle.goldBefore);assert.equal(board.state._waveLife,battle.lifeBefore);
      const used=rows.filter(r=>r.board===board.id);
      assert.equal(used.length,meta.forms.length,`${board.id}: 全形態がある`);
      for(const row of used){assert.equal(row.n,meta.options.samples);assert.deepEqual(row.baseline,used[0].baseline);}
    }
    boards.set(scene.id,saved.boards);
  }
  checks.push('4場面×5〜8盤面、選定30例以上・勝率25〜75%、元JSONLの盤面・資源、追加は元の空きマスのみ、全カード測定とファイルhashを確認');
  console.log(checks.at(-1));

  const stateBefore=engine.copy(G),randomBefore=Math.random,poolsBefore=engine.overrides.snapshot(),samplesByScene=new Map();
  for(const scene of engine.SCENES){
    const generator=scene.type==='elite'?generateEliteEnemies:generateEnemies;let called=0;
    const wrapper=floor=>{called++;assert.equal(floor,scene.floor);assert.equal(G._wave,scene.wave);assert.equal(G._waveStage,scene.stage);assert.equal(_waveDeepLevel(scene.stage,scene.wave,scene.type),scene.deepLevel);return generator(floor);};
    let samples;
    try{if(scene.type==='elite')generateEliteEnemies=wrapper;else generateEnemies=wrapper;samples=await engine.enemySamples(scene,30,meta.options.seed,'evaluation');}
    finally{if(scene.type==='elite')generateEliteEnemies=generator;else generateEnemies=generator;}
    assert.equal(called,30,'敵は本体生成関数を通る');
    assert.deepEqual(samples,await engine.enemySamples(scene,30,meta.options.seed,'evaluation'),'敵seed再現性');
    const training=await engine.enemySamples(scene,30,meta.options.seed,'connection');
    check(samples.every((s,i)=>s.enemySeed!==training[i].enemySeed&&s.battleSeed!==training[i].battleSeed),'接続選択と評価のseedを分ける');
    const expected=await engine.isolated(()=>{initState();G._wave=scene.wave;G._waveStage=scene.stage;return _sceneEnemyCount(scene.type);});
    for(const sample of samples){
      assert.equal(sample.enemies.filter(Boolean).length,expected[0],`${scene.id}: 敵総数`);
      assert.equal(sample.enemies.filter(u=>u?.lane==='rear').length,expected[1],`${scene.id}: 後衛数`);
    }
    samplesByScene.set(scene.id,samples);
  }
  assert.deepEqual(G,stateBefore,'敵生成が呼び出し元のGを変えない');assert.equal(Math.random,randomBefore);
  checks.push('4場面の本体floor/deepLevel・敵生成関数・敵数/後衛数、敵30例の再現性、接続選択と評価の独立seed、G/乱数の非汚染を確認');console.log(checks.at(-1));

  let parityBattles=0;
  for(const scene of engine.SCENES){
    const board=boards.get(scene.id)[0],samples=samplesByScene.get(scene.id),setupSeed=engine.hash(`fixed-formation:${board.id}`),options={preparedItems:board.preparedItems,setupSeed};
    const before=engine.copy(board.state),one=await engine.evaluate(board.state,scene,samples,options);
    await engine.evaluate(boards.get(scene.id)[1].state,scene,samples.slice(0,2),options);
    const two=await engine.evaluate(board.state,scene,samples,options);
    assert.deepEqual(one,two,'他盤面を挟んでも同一seed・同一結果');assert.deepEqual(board.state,before,'盤面状態は不変');
    for(let i=0;i<3;i++){
      const initial=await engine.setup(board.state,scene,samples[i],{preparedItems:board.preparedItems,seed:setupSeed}),initialCopy=engine.copy(initial);
      const original=engine.compute(initial,samples[i].battleSeed,{original:true}),fast=engine.compute(initial,samples[i].battleSeed);
      assert.deepEqual(fast.events,original.events,'省略前後で全イベント一致');assert.deepEqual(fast.finalState,original.finalState,'省略前後で最終状態一致');
      assert.equal(fast.outcome,original.outcome);assert.equal(fast.endReason,original.endReason);assert.deepEqual(initial,initialCopy,'コア入力を変えない');
      assert.deepEqual(one.points[i],engine.measure(original),'敵編成だけの差し替えが完全な本体編成経路と一致');parityBattles++;
    }
    for(let i=0;i<samples.length;i++){
      assert.equal(one.points[i].win-two.points[i].win,0);assert.equal(one.points[i].hp-two.points[i].hp,0);assert.equal(one.points[i].damage-two.points[i].damage,0);
    }
  }
  assert.deepEqual(engine.overrides.snapshot(),poolsBefore,'定義共有がプールを変えない');assert.deepEqual(G,stateBefore);assert.equal(Math.random,randomBefore);
  checks.push(`同一盤面比較は4場面×30例すべて差0、再現性一致、本体computeBattleと${parityBattles}戦の全イベント/最終状態一致、入力/定義/G/乱数は不変`);console.log(checks.at(-1));

  const boonFile=path.join(out,'boon_values.json');
  if(fs.existsSync(boonFile)){
    const boon=JSON.parse(fs.readFileSync(boonFile,'utf8')),raw=fs.readFileSync(path.join(out,'boon_comparisons.jsonl'),'utf8').trim().split('\n').map(JSON.parse),helper=require('./fixed_boons');
    assert.deepEqual(boon.sourceHashes,engine.sourceHashes());assert.equal(boon.scriptHash,engine.sha(fs.readFileSync(path.join(__dirname,'fixed_boons.js'),'utf8')));
    assert.equal(raw.length,[...boards.values()].reduce((s,bs)=>s+bs.length,0)*5);
    assert.deepEqual(helper.aggregate(raw),boon.summaries);
    for(const file of boon.boardFiles)assert.equal(file.hash,engine.sha(fs.readFileSync(path.join(boardsDir,file.file),'utf8')));
    for(const scene of engine.SCENES){
      const board=boards.get(scene.id)[0],beforeBoard=engine.copy(board.state),samples=await engine.enemySamples(scene,boon.options.samples,boon.options.seed,'evaluation'),options={preparedItems:board.preparedItems,setupSeed:engine.hash(`fixed-formation:${board.id}`)},base=await engine.evaluate(board.state,scene,samples,options);
      for(const definition of TOWER_BOON_CONFIG.blessings.filter(b=>b.field)){
        const state=await helper.blessBoard(board,definition.id),again=await helper.blessBoard(board,definition.id);
        assert.deepEqual(state,again);assert.deepEqual(board.state,beforeBoard);assert.equal(state.gold,board.state.gold);
        const result=await engine.evaluate(state,scene,samples,options),row=raw.find(r=>r.board===board.id&&r.id===definition.id);
        assert.equal(row.gainWinPt,100*(result.winRate-base.winRate));assert.deepEqual(row.wins,result.points.map(p=>p.win));assert.equal(row.gainHp,result.meanHp-base.meanHp);assert.equal(row.gainDamage,result.meanDamage-base.meanDamage);
        const initial=await engine.setup(state,scene,samples[0],{preparedItems:board.preparedItems,seed:options.setupSeed}),original=engine.compute(initial,samples[0].battleSeed,{original:true}),fast=engine.compute(initial,samples[0].battleSeed);
        assert.deepEqual(fast.events,original.events);assert.deepEqual(fast.finalState,original.finalState);
        await engine.isolated(()=>{const before=engine.copy(G.mainBoard);for(const c of G.mainBoard)if(c)towerBoonBlessGeneratedCard(c);assert.deepEqual(G.mainBoard,before,'祝福を二重付与しない');},{state});
      }
    }
    checks.push('祝福1〜5×4場面を各30例で再測定し保存結果と一致、本体の付与関数・同一seed再現・所持金/盤面の非汚染・二重付与防止・祝福ありの本体computeとの一致を確認');console.log(checks.at(-1));
  }

  const forms=await engine.cardForms(meta.options.cardSeed),character=forms.find(f=>f.name==='ギガンテス'),enchant=forms.find(f=>f.name==='活性化+');
  assert.deepEqual(forms.map(({card,...f})=>f),meta.forms,'通常抽選対象と本体合体形の全数が保存されている');
  const probeScene=engine.sceneById('st2_normal'),probeBoard=boards.get(probeScene.id).find(b=>b.state._waveLife<3),probeSamples=samplesByScene.get(probeScene.id).slice(0,3);
  for(const name of ['ハーピー','タイタニア','ジャック・オ・ランタン']){
    const form=forms.find(f=>f.name===name),place=(await engine.placements(probeBoard.state,form))[0],options={preparedItems:probeBoard.preparedItems,setupSeed:engine.hash(`fixed-formation:${probeBoard.id}`)};
    const actual=await engine.evaluate(probeBoard.state,probeScene,probeSamples,{...options,mutate:()=>{G.mainBoard[place.slot]=engine.copy(place.card);}});
    const blank=await engine.evaluate(probeBoard.state,probeScene,probeSamples,{...options,mutate:()=>{G.mainBoard[place.slot]=engine.ablated(place.card);}});
    if(name==='ハーピー')assert.deepEqual(actual.points,blank.points,'名前の写しだけでは効果発動と誤判定しない');
    else check(actual.points.some((p,i)=>p.digest!==blank.points[i].digest),`${name}: 名前による互換効果も対照側で除去し発動を検出する`);
  }
  checks.push('本文なしのハーピーは対照と差0、タイタニア/ジャック・オ・ランタンの名前由来の互換効果は対照側だけ除去して発動を検出');console.log(checks.at(-1));
  check(character&&enchant,'再測定対象の通常キャラと合体エンチャント');
  for(const scene of engine.SCENES){
    const job={scene:scene.id,boards:boards.get(scene.id).slice(0,2),keys:[character.key,enchant.key],seed:meta.options.seed,cardSeed:meta.options.cardSeed,samples:meta.options.samples,searchSamples:meta.options.searchSamples,override:meta.override};
    const replay=await compareJob(job);
    for(const row of replay)assert.deepEqual(row,rows.find(r=>r.scene===row.scene&&r.cardKey===row.cardKey&&r.board===row.board),'接続選択を含む保存結果の再測定一致');
  }
  checks.push('通常キャラ/合体エンチャントを4場面×2盤面で再測定し、接続先・配置・戦闘差・効果観測を含むJSON全項目が一致');console.log(checks.at(-1));

  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-fixed-selftest-'));let overrideResult;
  try{
    const override={change:[{name:'ギガンテス',power:999,life:999}],add:[{name:'仮・検査の巨人',category:'キャラクター',power:999,life:999,rarity:1,grade:1,desc:''},{name:'仮・検査の大力',category:'エンチャント',rarity:1,grade:1,directionCount:4,desc:'常時：このキャラクターは+99/+99を得る。'}]};
    const file=path.join(temp,'override.json'),resultDir=path.join(temp,'result');fs.writeFileSync(file,JSON.stringify(override));
    const result=spawnSync(process.execPath,[path.join(__dirname,'fixed_compare.js'),'--boards',path.resolve(boardsDir),'--out',resultDir,'--workers','1','--scenes','st2_normal','--cards','ギガンテス,仮・検査の巨人,仮・検査の大力','--override',file,'--seed',String(meta.options.seed),'--card-seed',String(meta.options.cardSeed)],{encoding:'utf8',maxBuffer:4*1024*1024});
    assert.equal(result.status,0,result.stderr||result.stdout);
    const changed=fs.readFileSync(path.join(resultDir,'comparisons.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
    overrideResult=[];
    for(const name of ['ギガンテス','仮・検査の巨人','仮・検査の大力']){
      const selected=changed.filter(r=>r.name===name),gain=selected.reduce((s,r)=>s+r.gainWinPt,0)/selected.length;
      assert.equal(selected.length,boards.get('st2_normal').length);check(gain>10,`${name}: 大きな数値で勝率が上がる（${gain}pt）`);
      assert.equal(selected.every(r=>r.temporary),name.startsWith('仮'));
      overrideResult.push({name,meanGainWinPt:gain,temporary:name.startsWith('仮')});
    }
    check(changed.filter(r=>r.name==='仮・検査の大力').some(r=>r.formationChanged||r.eventChangedCases>0),'仮エンチャントの本文が実際に解釈される');
    check(fs.readFileSync(path.join(resultDir,'FIXED_REPORT.md'),'utf8').includes('仮・検査の大力'),'仮カードを同じ報告表へ出す');
    const ordinary=rows.filter(r=>r.scene==='st2_normal'&&r.name==='ギガンテス'),altered=changed.filter(r=>r.name==='ギガンテス');
    check(altered.reduce((s,r)=>s+r.actual.winRate,0)>ordinary.reduce((s,r)=>s+r.actual.winRate,0),'数値変更で元カードより勝率が上がる');
  }finally{fs.rmSync(temp,{recursive:true,force:true});engine.resetOverride();}
  checks.push('CLIのoverrideで既存カードの999/999化・仮999/999キャラ・仮+99/+99エンチャントを実測し、すべて基準より平均勝率+10pt超、仮表記と本文解釈を確認');console.log(checks.at(-1));
  const jsFiles=['fixed_boards.js','fixed_compare.js','fixed_engine.js','fixed_pool.js','fixed_report.js','fixed_worker.js','fixed_selftest.js','fixed_effects.js','fixed_boons.js','bot_boons.js','boon_report.js','boon_shop_probe.js','run_bot.js','bot_runtime.js','bot_sandbox.js','bot_batch.js','run_report.js','run_bot_selftest.js'];
  for(const file of jsFiles){
    const result=spawnSync(process.execPath,['--check',path.join(__dirname,file)],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  }
  const legacyTemp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-fixed-legacy-'));
  try{
    for(const [file,args] of [['run.js',['5']],['selftest.js',[]]]){
      const result=spawnSync(process.execPath,[path.join(__dirname,file),...args],{encoding:'utf8',env:{...process.env,VB_REPORT_PATH:path.join(legacyTemp,'REPORT.md')},maxBuffer:4*1024*1024});
      assert.equal(result.status,0,result.stderr||result.stdout);
    }
  }finally{fs.rmSync(legacyTemp,{recursive:true,force:true});}
  checks.push(`対象の全${jsFiles.length}JSのnode --check、既存run.js 5・selftest.jsが通過（既存REPORT.mdは変更しない）`);console.log(checks.at(-1));
  const result={passed:true,elapsedMs:Date.now()-start,checks,overrideResult,parityBattles,samples:30,sourceHashes:engine.sourceHashes(),toolHashes:engine.toolHashes()};
  fs.writeFileSync(path.join(out,'SELFTEST.json'),JSON.stringify(result,null,2)+'\n');
  require('./fixed_report').writeReport(out,boardsDir);console.log(`fixed_selftest PASS ${(result.elapsedMs/1000).toFixed(2)}秒`);return result;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={main};
