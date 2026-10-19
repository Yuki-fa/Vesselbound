#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const engine=require('./fixed_engine'),{csv}=require('./run_report');
async function sceneJob(root,id){
  await engine.initialize();const scene=engine.sceneById(id),levels=require('./fixed_compare').normalizeLevels(JSON.parse(fs.readFileSync(path.join(root,'typical_levels.json'),'utf8'))[id],id);
  const boards=JSON.parse(fs.readFileSync(path.join(__dirname,'fixed',`boards_${id}.json`),'utf8')).boards;
  const samples=await engine.enemySamples(scene,30,7411),rows=[];
  const changes=Object.keys(levels).flatMap(kind=>[1,-1].filter(delta=>levels[kind]+delta>=1).map(delta=>({id:kind+(delta>0?'+1':'-1'),kind,delta})));
  if(scene.type==='elite')changes.push({id:'enemy085',enemy:.85});
  for(const board of boards){
    const state=engine.copy(board.state);state.runLevels={...runLevelInitialState(),values:{...levels}};
    const options={preparedItems:board.preparedItems,setupSeed:engine.hash(`fixed-formation:${board.id}`)},base=await engine.evaluate(state,scene,samples,options);
    for(const change of changes){
      const target=engine.copy(state),enemies=engine.copy(samples);
      if(change.kind)target.runLevels.values[change.kind]+=change.delta;
      if(change.enemy)for(const sample of enemies)for(const e of sample.enemies.filter(Boolean))for(const k of ['atk','hp','maxHp','baseAtk','baseMaxHp'])
        if(Number.isFinite(e[k]))e[k]=Math.max(/hp/i.test(k)?1:0,Math.round(e[k]*change.enemy));
      const result=await engine.evaluate(target,scene,enemies,options);
      rows.push({scene:id,board:board.id,change:change.id,levels,n:30,baseline:base.winRate,winRate:result.winRate,
        deltas:result.points.map((p,i)=>p.win-base.points[i].win),gain:100*(result.winRate-base.winRate)});
    }
  }
  return rows;
}
async function main(args=process.argv.slice(2)){
  if(args[0]==='--scene'){const rows=await sceneJob(args[1],args[2]);fs.writeFileSync(args[3],JSON.stringify(rows));return;}
  const root=path.resolve(args[0]||path.join(__dirname,'out_1019')),files=engine.SCENES.map(s=>({id:s.id,file:path.join(root,'sensitivity_'+s.id+'.json')}));
  await Promise.all(files.map(({id,file})=>new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[__filename,'--scene',root,id,file],{stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',b=>error+=b);child.on('error',reject);child.on('close',code=>code?reject(Error(error)):resolve());
  })));
  const rows=files.flatMap(({file})=>JSON.parse(fs.readFileSync(file,'utf8'))),summaries=[];
  for(const key of [...new Set(rows.map(r=>r.scene+':'+r.change))]){
    const list=rows.filter(r=>r.scene+':'+r.change===key),gain=list.reduce((s,r)=>s+r.gain,0)/list.length;
    const paired=Array.from({length:30},(_,i)=>list.reduce((s,r)=>s+r.deltas[i],0)/list.length);
    const se=100*Math.sqrt(paired.reduce((s,d)=>s+(d-gain/100)**2,0)/29/30);
    summaries.push({scene:list[0].scene,change:list[0].change,boards:list.length,n:30,baseline:list.reduce((s,r)=>s+r.baseline,0)/list.length,
      winRate:list.reduce((s,r)=>s+r.winRate,0)/list.length,gain,low:gain-1.96*se,high:gain+1.96*se});
  }
  csv(path.join(root,'level_enemy_sensitivity.csv'),summaries);console.log(JSON.stringify(summaries,null,2));return summaries;
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main,sceneJob};
