'use strict';

// 独立したNodeプロセスで種の範囲を分担する。各ランの結果・乱数系列は直列版と同一。
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {performance}=require('node:perf_hooks');
const {policies}=require('./policies');

async function batch(opts) {
  const names=opts.policy==='all'?Object.keys(policies):opts.policy.split(',');
  const counts=Object.fromEntries(names.map(n=>[n,n==='lookahead'&&opts.policy==='all'?Math.min(opts.runs,opts.lookaheadRuns):opts.runs]));
  const total=Object.values(counts).reduce((a,b)=>a+b,0),jobs=[];
  for(const policy of names) {
    const size=Math.ceil(counts[policy]/opts.workers);
    for(let offset=0;offset<counts[policy];offset+=size)jobs.push({policy,seed:opts.seed+offset,runs:Math.min(size,counts[policy]-offset)});
  }
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vb-bot-batch-'));
  const start=performance.now();let next=0,completed=0,failed=false;
  const results=new Array(jobs.length);
  async function worker() {
    while(next<jobs.length&&!failed) {
      const index=next++,job=jobs[index],out=path.join(temporary,String(index));
      const args=[path.join(__dirname,'run_bot.js'),'--runs',String(job.runs),'--policy',job.policy,'--seed',String(job.seed),
        '--story-cycle',String(opts.storyCycle),'--lookahead-samples',String(opts.lookaheadSamples),'--tower-boon',opts.towerBoon,'--out',out];
      if(opts.overrideFile)args.push('--override',path.resolve(opts.overrideFile));
      args.push('--planner-stage',opts.plannerStage||'r2');
      if(opts.plannerWeightsFile)args.push('--planner-weights',path.resolve(opts.plannerWeightsFile));
      await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});let buffer='',error='';
        child.stdout.on('data',chunk=>{
          buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop();
          for(const line of lines)if(/^\d+\/\d+ /.test(line)){completed++;console.log(`${completed}/${total} ${line.replace(/^\d+\/\d+ /,'')}`);}
        });
        child.stderr.on('data',chunk=>{error+=chunk;});
        child.on('error',reject);
        child.on('close',code=>code===0?resolve():reject(new Error(`${job.policy} seed=${job.seed}: ${error||`終了コード${code}`}`)));
      }).catch(error=>{failed=true;throw error;});
      results[index]={rows:fs.readFileSync(path.join(out,'runs.jsonl'),'utf8'),meta:JSON.parse(fs.readFileSync(path.join(out,'meta.json'),'utf8'))};
    }
  }
  try {
    const settled=await Promise.allSettled(Array.from({length:opts.workers},worker));
    const failure=settled.find(r=>r.status==='rejected');if(failure)throw failure.reason;
    fs.mkdirSync(opts.out,{recursive:true});
    fs.writeFileSync(path.join(opts.out,'runs.jsonl'),results.map(r=>r.rows).join(''));
    const elapsedMs=performance.now()-start,policyElapsedMs={};
    for(const result of results)for(const [key,value] of Object.entries(result.meta.policyElapsedMs))policyElapsedMs[key]=(policyElapsedMs[key]||0)+value;
    const meta={...results[0].meta,options:{...opts,overrideFile:opts.overrideFile?path.basename(opts.overrideFile):null},
      policyCounts:counts,policyElapsedMs,policies:Object.fromEntries(names.map(n=>[n,policies[n].description])),
      completed,elapsedMs,msPerRun:elapsedMs/completed,workers:opts.workers,
      timingNote:'elapsedMsは全体の壁時計。policyElapsedMsは各ランの壁時計所要時間の合計（並列実行の競合を含む）。'};
    fs.writeFileSync(path.join(opts.out,'meta.json'),JSON.stringify(meta,null,2)+'\n');
    console.log(`完了 ${completed}周、${(elapsedMs/1000).toFixed(2)}秒、${opts.workers}プロセス: ${opts.out}`);
  } finally {fs.rmSync(temporary,{recursive:true,force:true});}
}
module.exports={batch};
