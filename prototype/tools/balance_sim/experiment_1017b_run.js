#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawn}=require('node:child_process'),{performance}=require('node:perf_hooks');
const ROOT=path.resolve(__dirname,'../..');let OUT=path.join(__dirname,'out_1017b');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function args(argv){const o={workers:16,out:OUT,variants:'baseline,a_elite,b_seal,c_opening,c_carry,d_nerfs,e_boon,f_enchants'};
  for(let i=0;i<argv.length;i++){if(argv[i]==='--worker'){o.worker=JSON.parse(fs.readFileSync(argv[++i]));continue;}
    const k={'--workers':'workers','--variants':'variants','--out':'out'}[argv[i]];if(!k)throw Error('不明な引数 '+argv[i]);o[k]=argv[++i];}return o;}
function spec(id){return JSON.parse(fs.readFileSync(path.join(__dirname,'overrides',`r2_${id}.json`),'utf8'));}
function metadata(id,s,rows,elapsedMs,workers=16){
  const old=JSON.parse(fs.readFileSync(path.join(__dirname,'out/meta.json'),'utf8'));
  const files=['experiment_1017b_run.js','experiment_1017b_rules.js','experiment_1017b_cache.js'];
  const names=[...new Set(rows.map(r=>r.policy))];
  return {...old,experiment:'1017b',variant:id,override:s.override||{change:[],add:[]},simulation:s.simulation||{},
    options:{...old.options,runs:id==='baseline'?200:100,workers,seed:4001,policy:id==='baseline'?'lookahead,planner':'planner',out:path.join(OUT,id)},
    completed:rows.length,policyCounts:Object.fromEntries([...new Set(rows.map(r=>r.policy))].map(p=>[p,rows.filter(r=>r.policy===p).length])),
    elapsedMs,msPerRun:elapsedMs/rows.length,policyElapsedMs:{},overrideNotes:[],workers,
    policies:Object.fromEntries(names.map(n=>[n,old.policies[n]])),
    experimentToolHashes:Object.fromEntries(files.map(f=>[f,hash(path.join(__dirname,f))])),
    inputSpecHash:hash(path.join(__dirname,'overrides',`r2_${id}.json`)),
    timingNote:'elapsedMsは最初の担当ジョブ開始から最後の担当ジョブ終了まで。他案との並列実行・待ち時間を含む。各ランの時間はtimings.csv。'};
}
async function worker(job){
  const bot=require('./run_bot'),rules=require('./experiment_1017b_rules');await rules.install();
  const s=spec(job.id),rows=[],timings=[],start=performance.now();
  for(let seed=job.seed;seed<job.seed+job.runs;seed++){
    const t=performance.now();rules.begin(s.simulation);
    const row=await bot.simulateRun({seed,policy:job.policy,override:s.override,storyCycle:1,towerBoon:'on',plannerStage:'r2'});
    row.experiment=rules.end();rows.push(row);timings.push({seed,policy:job.policy,ms:performance.now()-t});
    console.log(`${job.id} ${job.policy} ${seed} ${row.status} St${row.reachedWave}:${row.reachedStage}`);
  }
  fs.writeFileSync(job.output,JSON.stringify({rows,timings,elapsedMs:performance.now()-start}));
}
async function main(o){
  if(o.worker)return worker(o.worker);
  OUT=path.resolve(o.out);
  const ids=o.variants.split(','),jobs=[],temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vb-1017b-'));
  for(const id of ids){spec(id);if(fs.existsSync(path.join(OUT,id,'runs.jsonl')))throw Error('既存出力を上書きしない: '+id);
    for(const policy of id==='baseline'?['lookahead','planner']:['planner'])for(let seed=4001;seed<(id==='baseline'?4201:4101);seed+=10)
      jobs.push({id,policy,seed,runs:10,output:path.join(temporary,`${id}-${policy}-${seed}.json`)});}
  const start=performance.now(),results=[],started={},finished={};let next=0,done=0,failure=null;
  async function run(){while(next<jobs.length&&!failure){const job=jobs[next++],file=job.output+'.job';fs.writeFileSync(file,JSON.stringify(job));
    started[job.id]??=performance.now();
    try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[__filename,'--worker',file],{cwd:ROOT,stdio:['ignore','pipe','pipe']});let error='';
      child.stdout.on('data',()=>{});child.stderr.on('data',b=>error+=b);child.on('error',reject);child.on('close',code=>code?reject(Error(`${job.id}/${job.seed}: ${error}`)):resolve());});}
    catch(e){failure=e;throw e;}
    results.push({...job,...JSON.parse(fs.readFileSync(job.output,'utf8'))});finished[job.id]=performance.now();
    console.log(`${++done}/${jobs.length} ジョブ完了 ${job.id}/${job.policy}/${job.seed} 経過${((performance.now()-start)/1000).toFixed(0)}秒`);
  }}
  try{
    const settled=await Promise.allSettled(Array.from({length:Number(o.workers)},run));
    for(const id of ids){const chunks=results.filter(x=>x.id===id),expected=jobs.filter(x=>x.id===id).length;if(chunks.length!==expected)continue;
      const dir=path.join(OUT,id);fs.mkdirSync(dir,{recursive:true});const rows=chunks.flatMap(c=>c.rows).sort((a,b)=>a.policy.localeCompare(b.policy)||a.seed-b.seed);
      fs.writeFileSync(path.join(dir,'runs.jsonl'),rows.map(JSON.stringify).join('\n')+'\n');
      fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify(metadata(id,spec(id),rows,finished[id]-started[id],Number(o.workers)),null,2)+'\n');
      require('./run_report').csv(path.join(dir,'timings.csv'),chunks.flatMap(c=>c.timings));
      console.log(`保存 ${id} ${rows.length}周`);
    }
    const rejected=settled.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;
    console.log(`全体完了 ${((performance.now()-start)/1000).toFixed(1)}秒`);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
}
if(require.main===module)main(args(process.argv.slice(2))).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={spec,metadata};
