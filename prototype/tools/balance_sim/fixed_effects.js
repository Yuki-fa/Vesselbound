#!/usr/bin/env node
'use strict';
// 配置と戦闘結果を固定したまま、効果除去の観測だけを再計算する。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const engine=require('./fixed_engine'),{runJobs}=require('./fixed_pool'),{metric}=require('./fixed_compare');
const startStats=initial=>JSON.stringify(initial.units.p1.map(u=>u?{atk:u.atk,hp:u.hp,maxHp:u.maxHp,shield:u.shield,poison:u.poison,lane:u.lane,keywords:u.keywords}:null));
async function probeJob(job){
  await engine.initialize();engine.resetOverride(job.override);
  const forms=await engine.cardForms(job.cardSeed),scene=engine.sceneById(job.scene),samples=await engine.enemySamples(scene,job.samples,job.seed,'evaluation'),updated=[];
  for(const row of job.rows){
    const board=job.boards.find(b=>b.id===row.board),form=forms.find(f=>f.key===row.cardKey),place=(await engine.placements(board.state,form)).find(p=>p.slot===row.slot);
    assert.ok(place,`${row.board}/${row.name}: 保存した配置が再現する`);assert.deepEqual(place.card.directions,row.directions);
    const options={preparedItems:board.preparedItems,setupSeed:engine.hash(`fixed-formation:${board.id}`)};
    const actual=await engine.evaluate(board.state,scene,samples,{...options,mutate:()=>{G.mainBoard[place.slot]=engine.copy(place.card);}});
    assert.deepEqual(metric(actual),row.actual,'効果観測の更新で保存済みの戦闘結果を変えない');
    const blank=await engine.evaluate(board.state,scene,samples,{...options,mutate:()=>{G.mainBoard[place.slot]=engine.ablated(place.card);}});
    updated.push({...row,eventChangedCases:actual.points.filter((p,i)=>p.digest!==blank.points[i].digest).length,formationChanged:startStats(actual.initial)!==startStats(blank.initial),blankWins:blank.points.map(p=>p.win)});
  }
  return updated;
}
async function main(args=process.argv.slice(2)){
  const out=args[0]||path.join(__dirname,'fixed'),workers=Number(args[1]||4),start=performance.now();
  if(!Number.isInteger(workers)||workers<1||workers>8)throw new Error('workersは1〜8');
  await engine.initialize();const meta=JSON.parse(fs.readFileSync(path.join(out,'compare_meta.json'),'utf8')),boardDir=meta.options.boards;
  assert.deepEqual(engine.sourceHashes(),meta.sourceHashes,'本体を変えずに効果観測を更新する');
  const rows=fs.readFileSync(path.join(out,'comparisons.jsonl'),'utf8').trim().split('\n').map(JSON.parse),jobs=[];
  for(const scene of engine.SCENES){const selected=rows.filter(r=>r.scene===scene.id&&r.category==='キャラクター');if(!selected.length)continue;
    const boards=JSON.parse(fs.readFileSync(path.join(boardDir,`boards_${scene.id}.json`),'utf8')).boards;
    for(let i=0;i<selected.length;i+=50)jobs.push({kind:'effects',scene:scene.id,boards,rows:selected.slice(i,i+50),seed:meta.options.seed,cardSeed:meta.options.cardSeed,samples:meta.options.samples,override:meta.override});
  }
  const replacements=(await runJobs(jobs,{workers,label:'名前による互換効果も除去して再観測'})).flat(),key=r=>`${r.scene}:${r.board}:${r.cardKey}`,map=new Map(replacements.map(r=>[key(r),r]));
  const updated=rows.map(r=>map.get(key(r))||r);
  meta.effectProbe={reason:'対照キャラクターの空本文にカード名由来の互換効果が残ることを防ぐため、検査対照だけ名前も無効化。保存済みの配置と実測勝率/HP/与ダメージは各行で完全一致を確認。',rows:replacements.length,workers,elapsedMs:performance.now()-start,previousToolHashes:meta.toolHashes,scriptHash:engine.sha(fs.readFileSync(__filename,'utf8'))};
  meta.toolHashes=engine.toolHashes();
  fs.writeFileSync(path.join(out,'comparisons.jsonl'),updated.map(r=>JSON.stringify(r)).join('\n')+'\n');
  fs.writeFileSync(path.join(out,'compare_meta.json'),JSON.stringify(meta,null,2)+'\n');
  // 変更前の成功記録を新しい測定に流用しない。
  fs.rmSync(path.join(out,'SELFTEST.json'),{force:true});
  require('./fixed_report').writeReport(out,boardDir);console.log(`効果再観測完了 ${(meta.effectProbe.elapsedMs/1000).toFixed(2)}秒`);return meta.effectProbe;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={probeJob,main};
