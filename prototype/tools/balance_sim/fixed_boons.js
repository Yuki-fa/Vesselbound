#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const engine=require('./fixed_engine'),{runJobs}=require('./fixed_pool'),{csv}=require('./run_report');
const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
async function blessBoard(board,id){
  return engine.isolated(()=>{
    G.towerBoons=towerBoonInitialState();
    // 旧祝福の互換性を測る固定実験。廃止した購入経路は呼ばない。
    G.towerBoons.counts[id]=1;
    for(const card of G.mainBoard)if(card)towerBoonBlessGeneratedCard(card);
    return engine.copy(G);
  },{state:board.state,seed:engine.hash(`fixed-boon:${board.id}:${id}`)});
}
async function compareScene(job){
  await engine.initialize();const scene=engine.sceneById(job.scene),samples=await engine.enemySamples(scene,job.samples,job.seed,'evaluation'),rows=[];
  for(const board of job.boards){
    const options={preparedItems:board.preparedItems,setupSeed:engine.hash(`fixed-formation:${board.id}`)},base=await engine.evaluate(board.state,scene,samples,options);
    for(const id of TOWER_BOON_CONFIG.blessings.filter(b=>b.field).map(b=>b.id)){
      const state=await blessBoard(board,id),result=await engine.evaluate(state,scene,samples,options);
      rows.push({scene:scene.id,board:board.id,id,n:samples.length,baselineWinRate:base.winRate,winRate:result.winRate,gainWinPt:100*(result.winRate-base.winRate),gainHp:result.meanHp-base.meanHp,gainDamage:result.meanDamage-base.meanDamage,
        baseWins:base.points.map(p=>p.win),wins:result.points.map(p=>p.win),hpDeltas:result.points.map((p,i)=>p.hp-base.points[i].hp),damageDeltas:result.points.map((p,i)=>p.damage-base.points[i].damage),
        affectedCards:state.mainBoard.filter(c=>c?.boon).length,bonus:towerBonus(state),cards:state.mainBoard.map(c=>c?{name:c.name,power:c.power,life:c.life,desc:c.desc,boon:c.boon}:null)});
    }
  }
  return rows;
}
function towerBonus(state){return state.mainBoard.find(c=>c?.boon)?.boon||null;}
function aggregate(rows){
  const summaries=[];for(const scene of [...new Set(rows.map(r=>r.scene))])for(const id of [...new Set(rows.map(r=>r.id))]){
    const list=rows.filter(r=>r.scene===scene&&r.id===id),delta=mean(list.map(r=>r.gainWinPt)),N=list[0].n;
    const paired=Array.from({length:N},(_,i)=>mean(list.map(r=>r.wins[i]-r.baseWins[i]))),se=100*Math.sqrt(paired.reduce((s,v)=>s+(v-delta/100)**2,0)/(N-1)/N);
    summaries.push({scene,id,boards:list.length,samples:N,baselineWinRate:mean(list.map(r=>r.baselineWinRate)),winRate:mean(list.map(r=>r.winRate)),meanGainWinPt:delta,minGainWinPt:Math.min(...list.map(r=>r.gainWinPt)),maxGainWinPt:Math.max(...list.map(r=>r.gainWinPt)),ciLowPt:delta-1.96*se,ciHighPt:delta+1.96*se,meanGainHp:mean(list.map(r=>r.gainHp)),meanGainDamage:mean(list.map(r=>r.gainDamage))});
  }return summaries;
}
async function main(args=process.argv.slice(2)){
  const o={boards:path.join(__dirname,'fixed'),out:path.join(__dirname,'fixed'),samples:30,seed:7411,workers:4};
  for(let i=0;i<args.length;i++){const k={'--boards':'boards','--out':'out','--samples':'samples','--seed':'seed','--workers':'workers'}[args[i]];if(!k||args[i+1]===undefined)throw Error(`不正な引数 ${args[i]}`);o[k]=args[++i];}
  for(const k of ['samples','seed','workers'])o[k]=Number(o[k]);if(!Number.isInteger(o.samples)||o.samples<30||!Number.isInteger(o.workers)||o.workers<1||o.workers>8)throw Error('samples>=30、workers=1〜8');
  await engine.initialize();const start=performance.now(),jobs=[],boardFiles=[];
  for(const scene of engine.SCENES){const file=path.join(o.boards,`boards_${scene.id}.json`),text=fs.readFileSync(file,'utf8');boardFiles.push({file:path.basename(file),hash:engine.sha(text)});jobs.push({kind:'boons',scene:scene.id,boards:JSON.parse(text).boards,samples:o.samples,seed:o.seed});}
  const rows=(await runJobs(jobs,{workers:o.workers,label:'固定盤面の祝福比較'})).flat(),summaries=aggregate(rows),ids=TOWER_BOON_CONFIG.blessings.filter(b=>b.field).map(b=>b.id);
  const values=Object.fromEntries(ids.map(id=>[id,mean(summaries.filter(r=>r.id===id).map(r=>r.meanGainWinPt))]));
  const result={schemaVersion:1,options:o,elapsedMs:performance.now()-start,config:engine.copy(TOWER_BOON_CONFIG),sourceHashes:engine.sourceHashes(),boardFiles,scriptHash:engine.sha(fs.readFileSync(__filename,'utf8')),summaries,values,
    method:'標準盤面の全キャラクター・エンチャントへ1回分。複製Gで旧祝福の個体をtowerBoonBlessGeneratedCardで作成。購入経路は廃止済み。盤面・所持金・アイテム・指輪は固定し購入費は差し引かない。既存の合体・永久強化後の個体へ付与し、取得からの履歴は再実行しない。敵/戦闘seedは基準と共通。6・7は周回で測る。'};
  fs.mkdirSync(o.out,{recursive:true});fs.writeFileSync(path.join(o.out,'boon_comparisons.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync(path.join(o.out,'boon_values.json'),JSON.stringify(result,null,2)+'\n');
  csv(path.join(o.out,'boons.csv'),summaries);csv(path.join(o.out,'boon_boards.csv'),rows.map(({cards,...r})=>({...r,baseWins:r.baseWins.join('|'),wins:r.wins.join('|'),hpDeltas:r.hpDeltas.join('|'),damageDeltas:r.damageDeltas.join('|'),bonus:JSON.stringify(r.bonus)})));
  console.log(`祝福比較完了 ${(result.elapsedMs/1000).toFixed(2)}秒 ${JSON.stringify(values)}`);return result;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={main,blessBoard,compareScene,aggregate};
