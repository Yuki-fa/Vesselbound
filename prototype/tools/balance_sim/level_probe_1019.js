#!/usr/bin/env node
'use strict';
// 全山場を勝つと仮定した固定4候補の抽選分布。実周回の生存者分布とは分ける。
const fs=require('node:fs'),path=require('node:path');
const {csv}=require('./run_report');
async function main(out=process.argv[2]||path.join(__dirname,'out_1019'),samples=Number(process.argv[3]||10000)){
  if(!Number.isInteger(samples)||samples<1)throw Error('samplesは1以上の整数');
  const api=await require('./run_bot').initialize(),rows=[],snapshots=Array.from({length:8},()=>[]);
  console.log('旧4レベルの反復重み・+1限定・下降なし比較は廃止。ATK/HPの固定4候補を計測します');
  for(let n=0;n<samples;n++){
    api.seed=100001+n;api.cycle=1;api.resetRun();initState();SaveRun.begin();
    for(let i=0;i<8;i++){
      G._wave=1+Math.floor(i/2);G._waveStage=i%2?8:3;
      const r=runLevelRollReward(G._wave,G.runLevels.values);snapshots[i].push({...r.after,id:r.id});
    }
  }
  for(let i=0;i<8;i++){
    const ss=snapshots[i],keys=Object.keys(RUN_LEVEL_CONFIG.names),avg=fn=>ss.reduce((s,r)=>s+fn(r),0)/ss.length;
    const row={variant:'current',rewards:i+1,stageAfter:1+Math.floor(i/2),n:samples,total:avg(r=>r.atk+r.hp)};
    for(const c of RUN_LEVEL_CONFIG.rewards)row[c.id+'Rate']=avg(r=>Number(r.id===c.id));
    for(const k of keys){const values=ss.map(r=>r[k]).sort((a,b)=>a-b);row[k]=avg(r=>r[k]);
      for(const p of [10,50,90])row[k+'P'+p]=values[Math.floor((samples-1)*p/100)];}
    rows.push(row);
  }
  fs.mkdirSync(out,{recursive:true});csv(path.join(out,'level_lottery.csv'),rows);
  fs.writeFileSync(path.join(out,'level_lottery_meta.json'),JSON.stringify({samples,seedStart:100001,seedEnd:100000+samples,
    method:'本体runLevelRollReward、全8山場の勝利を仮定。固定確率、反復制限・下降・再抽選なし。',config:RUN_LEVEL_CONFIG},null,2)+'\n');
  console.log('抽選分布 current '+samples+'系列×8報酬');return rows;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
