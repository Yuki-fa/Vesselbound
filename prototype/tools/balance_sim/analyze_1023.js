#!/usr/bin/env node
'use strict';

// experiment_1023.js と run_bot のJSONLを、報告書へ転記しやすい集計へ変換する。
// 比率はWilsonの95%区間、平均値は標本標準偏差による正規近似95%区間を使う。
const fs=require('node:fs');
const path=require('node:path');

function readRows(input){
  const file=fs.statSync(input).isDirectory()?path.join(input,'runs.jsonl'):input;
  return fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
function round(value,digits=1){return Number.isFinite(value)?Number(value.toFixed(digits)):null;}
function interval(value){return `[${round(value[0]*100,1)}%, ${round(value[1]*100,1)}%]`;}
function wilson(success,total){
  if(!total)return [0,0];
  const z=1.959963984540054,p=success/total,den=1+z*z/total;
  const center=(p+z*z/(2*total))/den,half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den;
  return [Math.max(0,center-half),Math.min(1,center+half)];
}
function rate(values,predicate){
  const total=values.length,success=values.filter(predicate).length,ci=wilson(success,total);
  return {success,total,rate:total?success/total:0,ci,ciText:interval(ci)};
}
function mean(values){
  const finite=values.filter(Number.isFinite),n=finite.length;
  if(!n)return {n,mean:null,ci:[null,null],ciText:'—'};
  const average=finite.reduce((s,x)=>s+x,0)/n;
  const variance=n>1?finite.reduce((s,x)=>s+(x-average)**2,0)/(n-1):0;
  const half=1.959963984540054*Math.sqrt(variance/n);
  return {n,mean:average,sd:Math.sqrt(variance),ci:[average-half,average+half],ciText:`[${round(average-half,1)}, ${round(average+half,1)}]`};
}
function keyOf(b){return `${b.wave}-${b.stage}-${b.type}`;}
function firstBattles(rows){
  const groups=new Map();
  for(const row of rows){
    for(const battle of row.battles||[]){
      if(battle.retry)continue;
      const key=keyOf(battle),group=groups.get(key)||{key,wave:battle.wave,stage:battle.stage,type:battle.type,values:[],gold:[],life:[]};
      group.values.push(battle);group.gold.push(Number(battle.goldAfter)-Number(battle.goldBefore));group.life.push(Number(battle.lifeBefore));groups.set(key,group);
    }
  }
  return [...groups.values()].sort((a,b)=>a.wave-b.wave||a.stage-b.stage||a.type.localeCompare(b.type)).map(group=>{
    const wins=rate(group.values,b=>b.outcome==='p1');
    return {...group,win:wins,goldMean:mean(group.gold),lifeMean:mean(group.life),n:group.values.length};
  });
}
function allBattleGold(rows){
  const groups=new Map();
  for(const row of rows)for(const battle of row.battles||[]){
    const key=keyOf(battle),group=groups.get(key)||{key,wave:battle.wave,stage:battle.stage,type:battle.type,gold:[],winGold:[],attempts:0,wins:0};
    const delta=Number(battle.goldAfter)-Number(battle.goldBefore);group.gold.push(delta);group.attempts++;if(battle.outcome==='p1'){group.wins++;group.winGold.push(delta);}groups.set(key,group);
  }
  return [...groups.values()].sort((a,b)=>a.wave-b.wave||a.stage-b.stage||a.type.localeCompare(b.type)).map(group=>({...group,mean:mean(group.gold),winMean:mean(group.winGold)}));
}
function actions(rows){
  const count={};
  for(const row of rows)for(const action of row.actions||[]){
    const key=action.type==='facility'?`facility:${action.key}`:action.type;
    count[key]=(count[key]||0)+1;
  }
  const n=rows.length||1;
  const value=key=>({count:count[key]||0,per100:(count[key]||0)*100/n});
  return {
    facility:{shop:value('facility:shop'),item:value('facility:item'),forge:value('facility:forge'),inn:value('facility:inn'),arena:{count:0,per100:0}},
    reroll:{shop:value('shop_reroll'),reward:value('boon_reroll'),total:{count:(count.shop_reroll||0)+(count.boon_reroll||0),per100:((count.shop_reroll||0)+(count.boon_reroll||0))*100/n}},
    all:count,
  };
}
function summarize(rows,label){
  const byPolicy={};
  for(const policy of [...new Set(rows.map(row=>row.policy))].sort()){
    const subset=rows.filter(row=>row.policy===policy),finalGold=subset.map(row=>Number(row.finalGold));
    byPolicy[policy]={label,n:subset.length,clear:rate(subset,row=>row.clear===true),reachWave2:rate(subset,row=>(row.reachedWave||0)>=2),reachWave3:rate(subset,row=>(row.reachedWave||0)>=3),reachWave4:rate(subset,row=>(row.reachedWave||0)>=4),reach33:rate(subset,row=>(row.battles||[]).some(b=>b.wave===3&&!b.retry&&b.stage===3)),finalGold:mean(finalGold),reachedWave:mean(subset.map(row=>Number(row.reachedWave))),reachedStage:mean(subset.map(row=>Number(row.reachedStage))),battles:mean(subset.map(row=>(row.battles||[]).length)),firstBattles:firstBattles(subset),battleGold:allBattleGold(subset),actions:actions(subset)};
  }
  return {label,n:rows.length,byPolicy};
}
function percent(rateValue){return `${round(rateValue.rate*100,1)}% ${rateValue.ciText}`;}
function markdown(summary){
  const lines=[`## ${summary.label}`,`周回数: ${summary.n}`,''];
  for(const [policy,data] of Object.entries(summary.byPolicy)){
    lines.push(`### 方針: ${policy}`,'','|指標|結果|95%区間|','|---|---:|---:|');
    for(const [label,key] of [['クリア率','clear'],['2層以上到達率','reachWave2'],['3層以上到達率','reachWave3'],['4層以上到達率','reachWave4'],['3-3初戦到達率','reach33']])lines.push(`|${label}|${round(data[key].rate*100,1)}%|${data[key].ciText}|`);
    lines.push(`|最終所持金平均|${round(data.finalGold.mean,1)}G|${data.finalGold.ciText}|`,`|到達wave平均|${round(data.reachedWave.mean,2)}|${data.reachedWave.ciText}|`,`|戦闘回数平均|${round(data.battles.mean,2)}|${data.battles.ciText}|`,'');
    lines.push('|初戦ノード|n|勝率|ゴールド差平均|','|---|---:|---:|---:|');
    for(const b of data.firstBattles)lines.push(`|${b.key}|${b.n}|${percent(b.win)}|${round(b.goldMean.mean,1)}G ${b.goldMean.ciText}|`);
    lines.push('','施設・再抽選（100周あたり）','', '|項目|回数|100周あたり|','|---|---:|---:|');
    for(const [label,key] of [['魔導取引所','shop'],['道具屋','item'],['鍛冶屋','forge'],['宿屋','inn'],['闘技場（未対応）','arena']]){const x=data.actions.facility[key];lines.push(`|${label}|${x.count}|${round(x.per100,1)}|`);}
    for(const [label,key] of [['店再抽選','shop'],['報酬再抽選','reward'],['再抽選合計','total']]){const x=data.actions.reroll[key];lines.push(`|${label}|${x.count}|${round(x.per100,1)}|`);}
    lines.push('');
  }
  return lines.join('\n');
}
function parseArgs(argv){
  const inputs=[],opts={out:null};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==='--input'){const value=argv[++i],eq=value.indexOf('=');if(eq<1)throw Error('--inputは名前=パス');inputs.push([value.slice(0,eq),value.slice(eq+1)]);}
    else if(argv[i]==='--out')opts.out=argv[++i];else throw Error('不正な引数: '+argv[i]);
  }
  if(!inputs.length)throw Error('--inputが必要');
  return {inputs,out:opts.out?path.resolve(opts.out):null};
}
function main(argv=process.argv.slice(2)){
  const opts=parseArgs(argv),result={};
  for(const [label,input] of opts.inputs)result[label]=summarize(readRows(input),label);
  const json=JSON.stringify(result,null,2)+'\n',md=Object.values(result).map(markdown).join('\n');
  if(opts.out){fs.mkdirSync(path.dirname(opts.out),{recursive:true});fs.writeFileSync(opts.out,json);fs.writeFileSync(opts.out.replace(/\.json$/,'')+'.md',md+'\n');}
  else{process.stdout.write(md+'\n');}
  return result;
}
if(require.main===module)try{main();}catch(error){console.error(error.stack||error);process.exitCode=1;}
module.exports={readRows,wilson,mean,rate,firstBattles,allBattleGold,actions,summarize,main};
