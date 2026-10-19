#!/usr/bin/env node
'use strict';
// 提案専用。数値は独立Nodeプロセス内の本体関数・入力だけへ適用し、ゲームファイルを書かない。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),Module=require('node:module');
const {spawn}=require('node:child_process'),{performance}=require('node:perf_hooks');
const SPECS={
  greedy_current:{label:'基本評価方針での現行仕様（感度比較の基準）'},
  bot_previous:{label:'報酬の有料再抽選を追加する前の判断',previousBot:true},
  no_levels:{label:'レベルの戦闘への適用なし（他の現仕様は維持）',noLevels:true},
  level_plus1:{label:'全ステージで+1だけ',plus1Only:true},
  level_no_down:{label:'現行の+1/+2候補、+2の−1をなくす',noDown:true},
  shop50:{label:'店の再抽選だけ50G',prices:{shop:50}},
  reward50:{label:'通常報酬の再抽選だけ50G',prices:{reward:50}},
  level50:{label:'レベル報酬の再抽選だけ50G',prices:{level:50}},
  elite085:{label:'エリート初期能力値×0.85',eliteMultiplier:0.85},
  boss085:{label:'ボス戦の初期敵全体の能力値×0.85',bossMultiplier:0.85},
};
function replaceOnce(text,from,to){if(text.split(from).length!==2)throw Error('実験の本体境界が変わった: '+from);return text.replace(from,to);}
async function install(spec={}){
  const engine=require('./fixed_engine');await engine.initialize();
  const boons=require('./bot_boons');
  if(spec.previousBot){for(const s of Object.values(boons.SETTINGS))s.rerollLevels=false;boons.LIMITS.maxPaidRerollsPerReward=0;}
  if(spec.noLevels){
    runLevelBattleValues=()=>coreNormalizeRunLevels();
    for(const s of Object.values(boons.SETTINGS))s.rerollLevels=false;
  }
  if(spec.plus1Only)RUN_LEVEL_CONFIG.tradeoffStage=Number.MAX_SAFE_INTEGER;
  if(spec.noDown){
    const original=runLevelRollReward.toString();
    const changed=replaceOnce(original,'const lowered=lower.length?randFrom(lower):null;','const lowered=null;');
    vm.runInThisContext('runLevelRollReward = ('+changed+');',{filename:'experiment_1019_no_down.js'});
  }
  if(spec.prices){
    globalThis.__balance1019Prices={shop:100,reward:100,level:100,...spec.prices};
    for(const [kind,names] of Object.entries({shop:['shopCanReroll','shopRerollOffers'],reward:['towerBoonRerollRewards'],level:['runLevelCanReroll','runLevelRerollReward']})){
      for(const name of names){
        const original=globalThis[name].toString();if(!original.includes('SHOP_REROLL_COST'))throw Error('再抽選価格の本体境界が変わった: '+name);
        vm.runInThisContext(`${name} = (${original.replaceAll('SHOP_REROLL_COST',`globalThis.__balance1019Prices.${kind}`)});`,{filename:'experiment_1019_price.js'});
      }
    }
    // 判断時にも同じ仮価格を使う。支払いや抽選の処理は上の本体関数に任せる。
    const file=path.join(__dirname,'bot_boons.js');let code=fs.readFileSync(file,'utf8');
    code=replaceOnce(code,'function canFund(policy){',"function canFund(policy,kind='reward'){");
    code=replaceOnce(code,'G.gold>=SHOP_REROLL_COST+SETTINGS[policy].reserve','G.gold>=globalThis.__balance1019Prices[kind]+SETTINGS[policy].reserve');
    code=replaceOnce(code,'runLevelCanReroll()||!canFund(policy)',"runLevelCanReroll()||!canFund(policy,'level')");
    code=replaceOnce(code,'SHOP_REROLL_COST+setting.reserve','globalThis.__balance1019Prices.shop+setting.reserve');
    const replacement=new Module(file,module);replacement.filename=file;replacement.paths=module.paths;replacement._compile(code,file);
    Object.assign(boons,replacement.exports);
  }
  const scale=(enemies,mul)=>{
    for(const e of enemies.filter(Boolean))for(const k of ['atk','hp','maxHp','baseAtk','baseMaxHp'])
      if(Number.isFinite(e[k]))e[k]=Math.max(/hp/i.test(k)?1:0,Math.round(e[k]*mul));
    return enemies;
  };
  if(spec.eliteMultiplier){const generate=generateEliteEnemies;generateEliteEnemies=(...args)=>scale(generate(...args),spec.eliteMultiplier);}
  if(spec.bossMultiplier){const generate=generateEnemies;generateEnemies=(...args)=>{const enemies=generate(...args);return G._waveBattleType==='boss'?scale(enemies,spec.bossMultiplier):enemies;};}
  // 戦闘規則はそのまま、表示フレームだけ省略する既存compute。別の自己検査で原版と照合する。
  SaveRun.computeBattle=engine.fastCompute;
  return engine;
}
async function worker(job){
  await install(SPECS[job.id]);const bot=require('./run_bot'),rows=[],start=performance.now();
  for(let seed=job.seed;seed<job.seed+job.runs;seed++){
    const row=await bot.simulateRun({seed,policy:job.policy||'greedy'});row.experiment1019=job.id;rows.push(row);
  }
  fs.writeFileSync(job.output,JSON.stringify({rows,elapsedMs:performance.now()-start}));
}
async function main(argv=process.argv.slice(2)){
  const o={out:path.join(__dirname,'out_1019'),workers:6,runs:200,seed:4001,policy:'greedy',timeoutMs:180000,variants:Object.keys(SPECS).join(',')};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--worker')return worker(JSON.parse(fs.readFileSync(argv[++i],'utf8')));
    const key={'--out':'out','--workers':'workers','--runs':'runs','--seed':'seed','--variants':'variants','--policy':'policy','--timeout-ms':'timeoutMs'}[argv[i]];
    if(!key||argv[i+1]===undefined)throw Error('不正な引数: '+argv[i]);o[key]=argv[++i];
  }
  for(const k of ['workers','runs','seed','timeoutMs'])o[k]=Number(o[k]);
  if(!Number.isInteger(o.workers)||o.workers<1||o.workers>16||!Number.isInteger(o.runs)||o.runs<1||!Number.isInteger(o.seed)||o.seed<0||!Number.isInteger(o.timeoutMs)||o.timeoutMs<1000)throw Error('不正な計測規模');
  if(!['greedy','lookahead','planner'].includes(o.policy))throw Error('不正な方針');
  const ids=o.variants.split(','),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-1019-experiment-')),jobs=[],results=[];
  for(const id of ids){if(!SPECS[id])throw Error('不明な実験: '+id);if(fs.existsSync(path.join(o.out,id,'runs.jsonl')))throw Error('既存出力を上書きしない: '+id);
    const size=o.policy==='greedy'?5:1;
    for(let offset=0;offset<o.runs;offset+=size)jobs.push({id,policy:o.policy,seed:o.seed+offset,runs:Math.min(size,o.runs-offset),output:path.join(tmp,`${id}-${offset}.json`)});}
  let next=0,done=0,failed=false;const start=performance.now();
  async function work(){while(next<jobs.length&&!failed){const job=jobs[next++],file=job.output+'.job';fs.writeFileSync(file,JSON.stringify(job));
    let timedOut=false;
    await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[__filename,'--worker',file],{stdio:['ignore','ignore','pipe']});let errors='';
      const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},o.timeoutMs);
      child.stderr.on('data',b=>errors+=b);child.on('error',reject);child.on('close',code=>{clearTimeout(timer);return timedOut||code===0?resolve():reject(Error(job.id+': '+errors));});
    }).catch(e=>{failed=true;throw e;});
    results.push({...job,...(timedOut?{rows:[],elapsedMs:o.timeoutMs,timedOut:true}:JSON.parse(fs.readFileSync(job.output,'utf8')))});
    console.log(`${++done}/${jobs.length} ${job.id}/${job.seed}${timedOut?' 外部時間上限（成績未確定）':''} 経過${((performance.now()-start)/1000).toFixed(0)}秒`);
  }}
  try{
    const settled=await Promise.allSettled(Array.from({length:o.workers},work));
    const engine=require('./fixed_engine');await engine.initialize();
    for(const id of ids){const chunks=results.filter(r=>r.id===id);if(chunks.length!==jobs.filter(j=>j.id===id).length)continue;
      const out=path.join(o.out,id),rows=chunks.flatMap(c=>c.rows).sort((a,b)=>a.seed-b.seed);fs.mkdirSync(out,{recursive:true});
      fs.writeFileSync(path.join(out,'runs.jsonl'),rows.map(JSON.stringify).join('\n')+'\n');
      fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({experiment:'1019',variant:id,spec:SPECS[id],options:o,attempted:chunks.reduce((s,c)=>s+c.runs,0),completed:rows.length,budgetSeeds:chunks.filter(c=>c.timedOut).flatMap(c=>Array.from({length:c.runs},(_,i)=>c.seed+i)),sourceHashes:engine.sourceHashes(),toolHashes:engine.toolHashes(),experimentHash:engine.sha(fs.readFileSync(__filename,'utf8')),elapsedMs:chunks.reduce((s,c)=>s+c.elapsedMs,0),timingNote:'elapsedMsはジョブの壁時計の合計。全体の所要時間ではない。budgetSeedsは外部時間上限で未確定となった周回であり、コアの500手timeoutと区別する。'},null,2)+'\n');
    }
    const bad=settled.find(x=>x.status==='rejected');if(bad)throw bad.reason;
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={SPECS,install,main};
