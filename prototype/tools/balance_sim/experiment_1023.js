#!/usr/bin/env node
'use strict';

// 2026-10-23 のバランス計測専用。
// 本体・シートは変更せず、各ワーカーのNodeプロセス内だけで深層補正と
// 敵撃破報酬を差し替える。周回の進行・戦闘結果・施設処理はrun_botへ任せる。
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const {performance}=require('node:perf_hooks');

const CURRENT_DEEP={
  1:[1,1.3,2.5,2.2,2.8,3.7,4.7],
  2:[1.3,1.7,3,2.8,3.7,4.7,5.8],
  3:[1.7,2.2,4,3.7,4.7,5.8,7],
  4:[2.2,2.8,5,4.7,5.8,7,8.3],
  5:[7,9,15,25],
  '闘技場':[1,2,3,4,5,6],
};

// 現行シートの深層3だけが直前・直後より高くなる谷を直し、
// 到達可能な通常戦・エリート・ボスの曲線も同時に比較する。
// マップ5と闘技場は自動周回の通常経路外だが、シートへ転記できる全行を持つ。
const DEEP_TABLES={
  deep_easy:{
    label:'やや易しい（中盤以降の通常戦・ボスを目標帯へ寄せる）',
    rows:{1:[1,1.1,1.7,1.8,2.2,2.8,3.5],2:[1.1,1.3,2,2.2,2.7,3.1,4.2],3:[1,1.1,1.3,1.7,2,2.4,3],4:[1.2,1.5,2,2.4,3,3.5,4.2],5:[3,4,5.5,7],'闘技場':[1,1.2,1.7,2.3,3,3.8]},
  },
  deep_standard:{
    label:'標準（推奨候補。深層3を含む全段を目標帯へ接続）',
    rows:{1:[1,1.2,1.8,1.9,2.4,3.1,4],2:[1.2,1.5,2.4,2.4,3.1,3.4,4.2],3:[1,1.2,1.5,1.9,2.3,2.7,3.3],4:[1.4,1.8,2.4,2.8,3.4,4,4.8],5:[4,5,7,10],'闘技場':[1,1.4,2,2.7,3.5,4.5]},
  },
  deep_hard:{
    label:'やや難しい（標準より高めだが後半の極端な谷を避ける）',
    rows:{1:[1,1.25,2,2.1,2.6,3.4,4.4],2:[1.25,1.6,2.6,2.6,3.3,3.6,4.8],3:[1,1.3,1.8,2.2,2.6,3.1,3.8],4:[1.6,2,2.8,3.3,4,4.7,5.8],5:[5,6.5,9,14],'闘技場':[1,1.6,2.3,3.1,4,5.1]},
  },
};

const SPECS={
  deep_easy:{type:'deep',deep:'deep_easy',label:DEEP_TABLES.deep_easy.label},
  deep_standard:{type:'deep',deep:'deep_standard',label:DEEP_TABLES.deep_standard.label},
  deep_hard:{type:'deep',deep:'deep_hard',label:DEEP_TABLES.deep_hard.label},
  gold40:{type:'gold',fixedGold:40,label:'敵撃破報酬を勝利1戦あたり40Gに固定'},
  gold50:{type:'gold',fixedGold:50,label:'敵撃破報酬を勝利1戦あたり50Gに固定'},
  gold60:{type:'gold',fixedGold:60,label:'敵撃破報酬を勝利1戦あたり60Gに固定'},
  combo:{type:'combo',deep:'deep_standard',fixedGold:50,label:'推奨深層候補＋勝利1戦あたり50G'},
};

function clone(value){return structuredClone(value);}
function deepRows(name){
  const table=DEEP_TABLES[name];
  if(!table)throw new Error('不明な深層候補: '+name);
  return clone(table.rows);
}

function applyDeep(name){
  const rows=deepRows(name);
  for(const [map,values] of Object.entries(rows)){
    for(let i=0;i<values.length;i++){
      const floor=floorForMapDeep(map,i+1),data=FLOOR_DATA[floor];
      if(!data)throw new Error(`深層の実体がない: ${map}/${i+1} floor=${floor}`);
      data.mult=values[i];
      // Nodeの本体では通常windowがないため、存在する場合だけ表示用索引も合わせる。
      if(typeof MAP_DEEP_LEVEL_DATA!=='undefined'&&MAP_DEEP_LEVEL_DATA[map]?.[i+1])
        MAP_DEEP_LEVEL_DATA[map][i+1].mult=values[i];
    }
  }
  return rows;
}

function enemyRewardValue(event){
  const raw=Number(event?.pveRewardGold)||0;
  return typeof goldIncomeAmount==='function'?Number(goldIncomeAmount(raw))||0:raw;
}

function installFixedGold(engine,fixedGold){
  const base=engine.fastCompute;
  if(!Number.isFinite(fixedGold))return base;
  const compute=(initial,seed,options)=>{
    const result=base(initial,seed,options);
    const currentEnemyGold=result.events.reduce((sum,event)=>sum+enemyRewardValue(event),0);
    const start=Number(initial.resources?.p1?.gold)||0;
    const final=Number(result.finalState.resources?.p1?.gold)||0;
    const nonEnemyNet=final-start-currentEnemyGold;
    const fixed=result.outcome==='p1'?fixedGold:0;
    result.finalState.resources.p1.gold=Math.max(0,Math.round(start+nonEnemyNet+fixed));
    result._balance1023={fixedGold:fixed,enemyGoldReplaced:currentEnemyGold,nonEnemyGoldNet:nonEnemyNet};
    return result;
  };
  return compute;
}

async function install(spec={}){
  const engine=require('./fixed_engine');
  await engine.initialize();
  const selected=spec.deep||((spec.type==='combo')?'deep_standard':null);
  if(selected)applyDeep(selected);
  const compute=installFixedGold(engine,spec.fixedGold);
  // run_botの先読みも、固定収入案の資源結果を見て判断する。
  if(spec.fixedGold!=null){
    const sandbox=require('./bot_sandbox');
    if(!sandbox.__balance1023OriginalConfigure){
      sandbox.__balance1023OriginalConfigure=sandbox.configure;
      sandbox.configure=options=>{
        const configured=options?.compute;
        return sandbox.__balance1023OriginalConfigure({compute:configured===engine.fastCompute?compute:configured});
      };
    }
  }
  // 実戦と先読みの共通入口。deepだけの候補では高速computeをそのまま使う。
  SaveRun.computeBattle=compute;
  return {engine,compute,deepRows:selected?deepRows(selected):null};
}

async function worker(job){
  const spec=SPECS[job.id];
  if(!spec)throw new Error('不明な実験: '+job.id);
  await install(spec);
  const bot=require('./run_bot');
  const rows=[];
  const started=performance.now();
  for(let seed=job.seed;seed<job.seed+job.runs;seed++){
    const row=await bot.simulateRun({seed,policy:job.policy,towerBoon:job.towerBoon,plannerStage:job.plannerStage});
    row.experiment1023=job.id;rows.push(row);
  }
  fs.writeFileSync(job.output,JSON.stringify({rows,elapsedMs:performance.now()-started}));
}

function parseArgs(argv){
  const opts={out:path.join(__dirname,'out_1023'),workers:8,runs:200,seed:4001,policy:'planner',towerBoon:'on',plannerStage:'r2',variants:Object.keys(SPECS).join(',')};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--worker'){opts.worker=argv[++i];continue;}
    const key={'--out':'out','--workers':'workers','--runs':'runs','--seed':'seed','--policy':'policy','--tower-boon':'towerBoon','--planner-stage':'plannerStage','--variants':'variants'}[argv[i]];
    if(!key||argv[i+1]===undefined)throw new Error('不正な引数: '+argv[i]);
    opts[key]=argv[++i];
  }
  for(const key of ['workers','runs','seed'])opts[key]=Number(opts[key]);
  if(!Number.isInteger(opts.workers)||opts.workers<1||opts.workers>16)throw new Error('--workersは1〜16');
  if(!Number.isInteger(opts.runs)||opts.runs<1)throw new Error('--runsは正の整数');
  if(!Number.isInteger(opts.seed)||opts.seed<0||opts.seed+opts.runs-1>0xffffffff)throw new Error('--seedが不正');
  if(!['greedy','lookahead','planner'].includes(opts.policy))throw new Error('--policyが不正');
  if(!['on','off'].includes(opts.towerBoon))throw new Error('--tower-boonが不正');
  if(!['r1','r2'].includes(opts.plannerStage))throw new Error('--planner-stageが不正');
  opts.out=path.resolve(opts.out);
  return opts;
}

async function main(argv=process.argv.slice(2)){
  const opts=parseArgs(argv);
  if(opts.worker)return worker(JSON.parse(fs.readFileSync(opts.worker,'utf8')));
  const ids=String(opts.variants).split(',').filter(Boolean);
  for(const id of ids)if(!SPECS[id])throw new Error('不明な実験: '+id);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-1023-experiment-'));
  const jobs=[],results=[];
  for(const id of ids){
    if(fs.existsSync(path.join(opts.out,id,'runs.jsonl')))throw new Error('既存出力を上書きしない: '+id);
    // 1プロセス1周にすると初期化コストが支配的になるため、既存bot_batchと同じく
    // 種を連続区間に分ける。予測は各周回内で直列なので再現性は保たれる。
    const size=Math.ceil(opts.runs/opts.workers);
    for(let offset=0;offset<opts.runs;offset+=size){
      const job={id,policy:opts.policy,towerBoon:opts.towerBoon,plannerStage:opts.plannerStage,seed:opts.seed+offset,runs:Math.min(size,opts.runs-offset),output:path.join(temp,`${id}-${offset}.json`)};
      jobs.push(job);
    }
  }
  let next=0,done=0,failed=false;
  const started=performance.now();
  async function work(){
    while(next<jobs.length&&!failed){
      const job=jobs[next++],jobFile=job.output+'.job';
      fs.writeFileSync(jobFile,JSON.stringify(job));
      await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,[__filename,'--worker',jobFile],{stdio:['ignore','ignore','pipe']});
        let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
        child.on('error',reject);
        child.on('close',code=>code===0?resolve():reject(new Error(`${job.id}/${job.seed}: ${stderr}`)));
      }).catch(error=>{failed=true;throw error;});
      const chunk=JSON.parse(fs.readFileSync(job.output,'utf8'));results.push({...job,...chunk});
      console.log(`${++done}/${jobs.length} ${job.id} seed=${job.seed} (${job.runs}周) 経過${((performance.now()-started)/1000).toFixed(0)}秒`);
    }
  }
  try{
    const settled=await Promise.allSettled(Array.from({length:Math.min(opts.workers,jobs.length)},()=>work()));
    const failure=settled.find(item=>item.status==='rejected');
    if(failure)throw failure.reason;
    const engine=require('./fixed_engine');await engine.initialize();
    for(const id of ids){
      const rows=results.filter(x=>x.id===id).flatMap(x=>x.rows).sort((a,b)=>a.seed-b.seed);
      const out=path.join(opts.out,id);fs.mkdirSync(out,{recursive:true});
      fs.writeFileSync(path.join(out,'runs.jsonl'),rows.map(JSON.stringify).join('\n')+'\n');
      fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({experiment:'1023',variant:id,spec:SPECS[id],options:opts,seedFirst:opts.seed,seedLast:opts.seed+opts.runs-1,attempted:opts.runs,completed:rows.length,sourceHashes:engine.sourceHashes(),toolHashes:engine.toolHashes(),experimentHash:engine.sha(fs.readFileSync(__filename,'utf8')),elapsedMs:results.filter(x=>x.id===id).reduce((sum,x)=>sum+x.elapsedMs,0),timingNote:'elapsedMsはワーカーの周回時間合計。実験全体の壁時計ではない。固定収入は勝利(outcome=p1)時だけ付与し、カード効果・施設・クエスト・闘技場報酬は変更しない。'},null,2)+'\n');
    }
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}

if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
module.exports={CURRENT_DEEP,DEEP_TABLES,SPECS,applyDeep,install,parseArgs,main};
