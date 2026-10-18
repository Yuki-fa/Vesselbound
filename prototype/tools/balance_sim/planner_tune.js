#!/usr/bin/env node
'use strict';

// 決定的な successive halving。探索種を固定し、最終比較の種を一切読まない。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const {R2_DEFAULTS}=require('./planner');
const {csv}=require('./run_report');
const START=1001,RUNGS=[10,20,40],SURVIVORS=[3,2,1];
const CANDIDATES=[
  {id:'balanced',next:1,wall:180,wallHp:20,fit:.6,option:1.2,focus:.5,prior:.3,distanceDecay:.5},
  {id:'wall_heavy',next:.7,wall:300,wallHp:24,fit:.6,option:1.2,focus:.5,prior:.3,distanceDecay:.5},
  {id:'combat',next:.7,wall:420,wallHp:24,fit:0,option:0,focus:0,prior:.3,distanceDecay:.5},
  {id:'roles',next:1,wall:220,wallHp:20,fit:4,option:5,focus:4,prior:1,distanceDecay:.5},
  {id:'near',next:1,wall:180,wallHp:20,fit:.6,option:1.2,focus:.5,prior:.3,distanceDecay:1},
  {id:'patient',next:.8,wall:280,wallHp:24,fit:.6,option:1.2,focus:.5,prior:.3,distanceDecay:.15},
  {id:'survival',next:1.5,wall:160,wallHp:20,fit:.3,option:.6,focus:.2,prior:.3,distanceDecay:.5},
  {id:'growth',next:.6,wall:320,wallHp:36,fit:2,option:3,focus:2,prior:.6,distanceDecay:.3},
];
function metrics(rows){
  const n=rows.length,meanWave=rows.reduce((s,r)=>s+r.reachedWave,0)/n,meanProgress=rows.reduce((s,r)=>s+r.progress,0)/n;
  const clears=rows.filter(r=>r.clear).length;
  // クリアを未クリアの同じ到達地点より2ステージ分優先する。
  return {runs:n,clears,clearRate:clears/n,meanWave,meanProgress,objective:meanProgress+2*clears/n};
}
async function run({seed,runs,weights,out,workers,stage='r2'}){
  fs.mkdirSync(out,{recursive:true});
  const config=path.join(out,'weights.json');fs.writeFileSync(config,JSON.stringify({weights}));
  const args=[path.join(__dirname,'run_bot.js'),'--policy','planner','--runs',String(runs),'--seed',String(seed),
    '--workers',String(workers),'--planner-stage',stage,'--planner-weights',config,'--out',out];
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let error='';
    child.stdout.on('data',()=>{});child.stderr.on('data',b=>{error+=b;});
    child.on('error',reject);child.on('close',c=>c===0?resolve():reject(Error(error||`終了${c}`)));
  });
  const rows=fs.readFileSync(path.join(out,'runs.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const meta=JSON.parse(fs.readFileSync(path.join(out,'meta.json'),'utf8'));
  return {rows,elapsedMs:meta.elapsedMs,policyElapsedMs:meta.policyElapsedMs.planner};
}
async function main(args=process.argv.slice(2)){
  let out=path.join(__dirname,'out/training'),workers=4;
  for(let i=0;i<args.length;i++){const key=args[i],v=args[++i];if(key==='--out')out=path.resolve(v);else if(key==='--workers')workers=Number(v);else throw Error(`不明な引数${key}`);}
  if(!Number.isInteger(workers)||workers<1||workers>8)throw Error('workersは1〜8');
  fs.mkdirSync(out,{recursive:true});
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vb-planner-tune-')),history=[],cache=new Map();
  const started=performance.now();let active=CANDIDATES;
  try{
    for(const [rung,n] of RUNGS.entries()){
      const results=[];
      for(const candidate of active){
        const {id,...base}=candidate,patch={...base,wallProgress:{balanced:16,wall_heavy:24,combat:32,roles:16,near:16,patient:24,survival:16,growth:48}[id]},weights={...R2_DEFAULTS,...patch},previous=cache.get(id)||{rows:[],elapsedMs:0,policyElapsedMs:0};
        const result=await run({seed:START+previous.rows.length,runs:n-previous.rows.length,weights,workers,out:path.join(temporary,`${id}-${n}`)});
        const combined={rows:[...previous.rows,...result.rows],elapsedMs:previous.elapsedMs+result.elapsedMs,
          policyElapsedMs:previous.policyElapsedMs+result.policyElapsedMs};cache.set(id,combined);
        const record={id,rung:rung+1,seedStart:START,seedEnd:START+n-1,...metrics(combined.rows),...patch,
          elapsedMs:combined.elapsedMs,secondsPerRun:combined.policyElapsedMs/n/1000};history.push(record);results.push(record);
        csv(path.join(out,'weight_search.csv'),history);
        fs.writeFileSync(path.join(out,`${id}_training.json`),JSON.stringify({weights,metrics:record,seeds:combined.rows.map(r=>({seed:r.seed,clear:r.clear,reachedWave:r.reachedWave,reachedStage:r.reachedStage,progress:r.progress}))},null,2)+'\n');
        console.log(`探索 ${id} n=${n} 到達${record.meanWave.toFixed(3)} クリア${record.clears} 目的${record.objective.toFixed(5)} ${record.secondsPerRun.toFixed(2)}秒/周`);
      }
      results.sort((a,b)=>b.objective-a.objective||b.meanWave-a.meanWave||a.id.localeCompare(b.id));
      active=results.slice(0,SURVIVORS[rung]).map(r=>CANDIDATES.find(c=>c.id===r.id));
    }
    const selected=active[0],{id,...base}=selected,winner=history.filter(h=>h.id===id).at(-1),patch={...base,wallProgress:winner.wallProgress};
    const config={version:2,status:'trained',selected:id,training:{seedStart:START,seedEnd:START+39,runs:40,rungs:RUNGS,survivors:SURVIVORS,
      objective:'mean(reachedWave + reachedStage/100) + 2 * clearRate',candidateCount:CANDIDATES.length,selectedMetrics:winner},weights:{...R2_DEFAULTS,...patch}};
    fs.writeFileSync(path.join(__dirname,'planner_weights.json'),JSON.stringify(config,null,2)+'\n');
    fs.writeFileSync(path.join(out,'selected_weights.json'),JSON.stringify(config,null,2)+'\n');
    const finalist=cache.get(id);fs.writeFileSync(path.join(out,'selected_runs.jsonl'),finalist.rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
    const totalRuns=[...cache.values()].reduce((s,v)=>s+v.rows.length,0);
    fs.writeFileSync(path.join(out,'search_summary.json'),JSON.stringify({trainingSeedStart:START,trainingSeedEnd:START+39,
      evaluationSeedStart:4001,evaluationSeedEnd:4200,selected:id,totalRuns,elapsedMs:performance.now()-started,history},null,2)+'\n');
    console.log(`決定 ${id}。${totalRuns}周を探索、学習種${START}〜${START+39}。`);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={metrics,CANDIDATES,START,RUNGS,SURVIVORS};
