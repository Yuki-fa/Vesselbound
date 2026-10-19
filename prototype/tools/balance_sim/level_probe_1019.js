#!/usr/bin/env node
'use strict';
// 全山場を勝つと仮定した抽選分布。生存者の偏りがある実周回の分布とは分ける。
const fs=require('node:fs'),path=require('node:path');
const {csv}=require('./run_report');
async function main(out=process.argv[2]||path.join(__dirname,'out_1019'),samples=Number(process.argv[3]||10000)){
  const api=await require('./run_bot').initialize(),rows=[];
  const variants=[['current',.4,false,false],['repeat070',.7,false,false],['repeat100',1,false,false],['plus1',.4,true,false],['no_down',.4,false,true]];
  for(const [id,weight,plus1,noDown] of variants){
    RUN_LEVEL_CONFIG.repeatWeight=weight;RUN_LEVEL_CONFIG.tradeoffStage=plus1?99:2;
    if(noDown)await require('./experiment_1019').install({noDown:true});
    const snapshots=Array.from({length:8},()=>[]);
    for(let n=0;n<samples;n++){
      api.seed=100001+n;api.cycle=1;api.resetRun();initState();SaveRun.begin();
      for(let i=0;i<8;i++){
        G._wave=1+Math.floor(i/2);G._waveStage=i%2?8:3;
        const r=runLevelRollReward(G._wave,G.runLevels.values);snapshots[i].push({...r.after,id:r.id,lowered:r.lowered});
      }
    }
    for(let i=0;i<8;i++){
      const ss=snapshots[i],keys=Object.keys(RUN_LEVEL_CONFIG.names),avg=fn=>ss.reduce((s,r)=>s+fn(r),0)/ss.length;
      const row={variant:id,rewards:i+1,stageAfter:1+Math.floor(i/2),n:samples,statsAt1:avg(r=>Number(r.stats===1)),
        tradeoff:avg(r=>Number(r.id.endsWith(':2'))),loweredStats:avg(r=>Number(r.lowered==='stats')),total:avg(r=>keys.reduce((s,k)=>s+r[k],0))};
      for(const k of keys){const values=ss.map(r=>r[k]).sort((a,b)=>a-b);row[k]=avg(r=>r[k]);row[k+'P10']=values[Math.floor((samples-1)*.1)];row[k+'P50']=values[Math.floor((samples-1)*.5)];row[k+'P90']=values[Math.floor((samples-1)*.9)];}
      rows.push(row);
    }
    console.log('抽選分布 '+id+' '+samples+'系列×8報酬');
  }
  fs.mkdirSync(out,{recursive:true});csv(path.join(out,'level_lottery.csv'),rows);
  fs.writeFileSync(path.join(out,'level_lottery_meta.json'),JSON.stringify({samples,seedStart:100001,seedEnd:100000+samples,method:'本体runLevelRollReward、全8山場の勝利を仮定、再抽選なし。現在の抽選・重み・取り消し規則を使い、仮設定だけをプロセス内で変更。',variants},null,2)+'\n');
  return rows;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
