#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {csv}=require('./run_report');
const KEYS=['stats','familiars','modifiers','damage'];
const avg=(xs,fn=x=>x)=>xs.length?xs.reduce((s,x)=>s+Number(fn(x)||0),0)/xs.length:null;
const sum=(xs,fn=x=>x)=>xs.reduce((s,x)=>s+Number(fn(x)||0),0);
const group=(xs,fn)=>{const m=new Map();for(const x of xs){const k=fn(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x);}return m;};
const quantile=(xs,p)=>{const s=xs.slice().sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];};
function read(file){return fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);}
function wilson(k,n){if(!n)return [null,null];const z=1.96,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];}
function firsts(row){return row.battles.filter(b=>!b.retry);}
function curves(rows){
  const out=[];
  for(const [policy,runs] of group(rows,r=>r.policy))for(const [key,bs] of group(runs.flatMap(firsts),b=>`${b.wave}:${b.stage}`)){
    const b=bs[0],wins=bs.filter(b=>b.outcome==='p1').length,[lo,hi]=wilson(wins,bs.length);
    const attempts=runs.flatMap(r=>r.battles).filter(a=>a.wave===b.wave&&a.stage===b.stage),retries=attempts.filter(a=>a.retry);
    const x={policy,wave:b.wave,stage:b.stage,type:b.type,floor:b.floor,n:bs.length,reach:bs.length/runs.length,wins,winRate:wins/bs.length,winLow:lo,winHigh:hi,
      attempts:attempts.length,retries:retries.length,retryWinRate:retries.length?retries.filter(a=>a.outcome==='p1').length/retries.length:null,
      totalLifeLostPerVisitor:sum(attempts,a=>a.lifeBefore-a.lifeAfter)/bs.length,
      lifeBefore:avg(bs,b=>b.lifeBefore),lifeAfter:avg(bs,b=>b.lifeAfter),lifeLost:avg(bs,b=>b.lifeBefore-b.lifeAfter),goldBefore:avg(bs,b=>b.goldBefore),
      enemyTotal:avg(bs,b=>sum(b.enemies,e=>e.atk+e.hp)),characters:avg(bs,b=>b.board.filter(c=>c?.category==='キャラクター').length),
      ownBaseTotal:avg(bs,b=>sum(b.board.filter(c=>c?.category==='キャラクター'),c=>c.power+c.life))};
    for(const k of KEYS){const values=bs.map(b=>b.runLevels[k]);x[k]=avg(values);x[k+'P10']=quantile(values,.1);x[k+'P50']=quantile(values,.5);x[k+'P90']=quantile(values,.9);}
    out.push(x);
  }
  return out.sort((a,b)=>a.policy.localeCompare(b.policy)||a.wave-b.wave||a.stage-b.stage);
}
function finances(row){
  const start=row.trajectory.find(t=>t.event==='start')?.gold||0;
  const battleIncome=sum(row.battles,b=>b.goldAfter-b.goldBefore),questIncome=sum(row.actions.filter(a=>a.type==='quest_reward'),a=>a.gold);
  const spent=type=>-sum(row.actions.filter(a=>a.type===type),a=>Math.min(0,a.gold||0));
  const rerolls=row.actions.filter(a=>['shop_reroll','boon_reroll','level_reroll'].includes(a.type));
  const categories={shop:rerolls.filter(a=>a.type==='shop_reroll'),reward:rerolls.filter(a=>a.type==='boon_reroll'),level:rerolls.filter(a=>a.type==='level_reroll')};
  const r={policy:row.policy,seed:row.seed,clear:row.clear,reachedWave:row.reachedWave,start,battleIncome,questIncome,inn:spent('inn'),forge:spent('forge'),item:spent('item_purchase'),final:row.finalGold};
  for(const [k,actions] of Object.entries(categories)){r[k+'Rerolls']=actions.length;r[k+'Spent']=sum(actions,a=>a.goldBefore-a.goldAfter);r[k+'Rights']=actions.filter(a=>a.remainingBefore>0).length;}
  r.otherNet=r.final-start-battleIncome-questIncome+r.inn+r.forge+r.item+r.shopSpent+r.rewardSpent+r.levelSpent;
  return r;
}
function summary(rows){return [...group(rows,r=>r.policy)].map(([policy,runs])=>{
  const f=runs.map(finances),clears=runs.filter(r=>r.clear).length,[low,high]=wilson(clears,runs.length);
  return {policy,n:runs.length,clear:clears,clearRate:clears/runs.length,clearLow:low,clearHigh:high,meanWave:avg(runs,r=>r.reachedWave),meanProgress:avg(runs,r=>r.progress),
    finalLife:avg(runs,r=>r.finalLife),finalGold:avg(runs,r=>r.finalGold),timeout:runs.filter(r=>r.status==='timeout').length,stalled:runs.filter(r=>r.status==='stalled').length,
    ...Object.fromEntries(['battleIncome','questIncome','inn','forge','item','shopRerolls','shopSpent','rewardRerolls','rewardSpent','levelRerolls','levelSpent','otherNet'].map(k=>[k,avg(f,r=>r[k])]))};
});}
function paired(base,other){
  const ref=new Map(base.filter(r=>r.policy===other[0]?.policy).map(r=>[r.seed,r])),pairs=other.map(r=>[ref.get(r.seed),r]).filter(([a])=>a);
  const ds=pairs.map(([a,b])=>b.reachedWave-a.reachedWave),mean=avg(ds),se=Math.sqrt(sum(ds,d=>(d-mean)**2)/Math.max(1,ds.length-1)/ds.length);
  return {pairs:pairs.length,waveDelta:mean,waveLow:mean-1.96*se,waveHigh:mean+1.96*se,
    gainedClear:pairs.filter(([a,b])=>!a.clear&&b.clear).length,lostClear:pairs.filter(([a,b])=>a.clear&&!b.clear).length};
}
function typicalLevels(rows,policy='lookahead'){
  const levels={},provenance={};
  for(const wave of [2,3])for(const stage of [2,3]){
    const scene=`st${wave}_${stage===2?'normal':'elite'}`,bs=rows.filter(r=>r.policy===policy).flatMap(firsts).filter(b=>b.wave===wave&&b.stage===stage);
    if(!bs.length)throw Error('典型レベルの到達者がいない: '+scene);
    const vectors=[...group(bs,b=>JSON.stringify(b.runLevels))].map(([key,list])=>({values:JSON.parse(key),frequency:list.length,
      distance:sum(bs,b=>sum(KEYS,k=>Math.abs(b.runLevels[k]-list[0].runLevels[k])))}));
    vectors.sort((a,b)=>a.distance-b.distance||b.frequency-a.frequency||JSON.stringify(a.values).localeCompare(JSON.stringify(b.values)));
    levels[scene]=vectors[0].values;provenance[scene]={policy,n:bs.length,method:'到達者が実際に持った4値ベクトルのL1メドイド（同点は頻度、辞書順）',...vectors[0],
      distribution:vectors.map(({distance,...x})=>x)};
  }
  return {levels,provenance};
}
function fixedAggregate(rows){
  const byScene=require('./fixed_report').analyze(rows).cards;
  return [...group(byScene,r=>r.cardKey)].map(([cardKey,rs])=>({cardKey,name:rs[0].name,category:rs[0].category,rarity:rs[0].rarity,grade:rs[0].grade,
    gain:avg(rs,r=>r.meanGainWinPt),peerDeviation:avg(rs,r=>r.peerDeviationPt),scenes:rs.length,peerCount:Math.min(...rs.map(r=>r.peerCount)),
    eventChanged:sum(rs,r=>r.eventChangedCases),...Object.fromEntries(rs.map(r=>[r.scene,r.meanGainWinPt]))})).sort((a,b)=>b.peerDeviation-a.peerDeviation);
}
function main(root=process.argv[2]||path.join(__dirname,'out_1019')){
  const base=read(path.join(root,'baseline/runs.jsonl')),curve=curves(base),funds=base.map(finances),typical=typicalLevels(base);
  csv(path.join(root,'difficulty_curve.csv'),curve);csv(path.join(root,'finances.csv'),funds);csv(path.join(root,'baseline_summary.csv'),summary(base));
  fs.writeFileSync(path.join(root,'typical_levels.json'),JSON.stringify(typical.levels,null,2)+'\n');
  fs.writeFileSync(path.join(root,'typical_level_provenance.json'),JSON.stringify(typical.provenance,null,2)+'\n');
  const levelOutcomes=base.flatMap(r=>r.actions.filter(a=>a.type==='level_reward').map(a=>({policy:r.policy,seed:r.seed,wave:a.wave,stage:a.stage,id:a.id,lowered:a.lowered,
    ...a.after,rerolled:a.rerolled,shown:a.history.length,weightedGain:a.quality.gain,negative:a.quality.gain<0})));
  csv(path.join(root,'level_rewards.csv'),levelOutcomes);
  const rerolls=base.flatMap(r=>r.actions.filter(a=>['shop_reroll','boon_reroll','level_reroll'].includes(a.type)).map(a=>({policy:r.policy,seed:r.seed,wave:a.wave,stage:a.stage,type:a.type,kind:a.kind||'level',
    spent:a.goldBefore-a.goldAfter,rights:a.remainingBefore-a.remainingAfter,reason:a.reason||'店の訪問後に余剰資金で1回',quality:JSON.stringify(a.quality||{})})));
  csv(path.join(root,'rerolls.csv'),rerolls);
  const variants=[];
  const greedyFile=path.join(root,'greedy_current/runs.jsonl'),greedyBase=fs.existsSync(greedyFile)?read(greedyFile):[];
  for(const [id,spec] of Object.entries(require('./experiment_1019').SPECS)){
    const file=path.join(root,id,'runs.jsonl');if(!fs.existsSync(file))continue;
    const rows=read(file),meta=JSON.parse(fs.readFileSync(path.join(root,id,'meta.json'),'utf8'));
    variants.push({id,label:spec.label,...summary(rows)[0],...paired(rows[0]?.policy==='greedy'?greedyBase:base,rows),attempted:meta.attempted,budget:meta.budgetSeeds?.length||0});
    csv(path.join(root,id,'difficulty_curve.csv'),curves(rows));
  }
  csv(path.join(root,'variant_summary.csv'),variants);
  const fixed={};
  for(const id of ['fixed_level1','fixed_typical']){
    const file=path.join(root,id,'comparisons.jsonl');if(!fs.existsSync(file))continue;
    const rows=read(file),aggregate=fixedAggregate(rows);fixed[id]=aggregate;csv(path.join(root,id,'aggregate.csv'),aggregate);
  }
  const result={baseline:summary(base),curve,variants,typical,fixed,levelOutcomes:base.map(r=>({policy:r.policy,seed:r.seed,rewards:r.actions.filter(a=>a.type==='level_reward').length,
    rerolls:r.actions.filter(a=>a.type==='level_reroll').length,negativeAccepted:r.actions.filter(a=>a.type==='level_reward'&&a.quality.gain<0).length})),
    ledgerResidual:funds.filter(f=>Math.abs(f.otherNet)>1e-6)};
  fs.writeFileSync(path.join(root,'analysis.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({baseline:result.baseline,variants,typical:typical.levels,ledgerResidual:result.ledgerResidual.length},null,2));return result;
}
if(require.main===module)main();
module.exports={main,read,curves,summary,paired,typicalLevels,fixedAggregate,wilson,finances};
