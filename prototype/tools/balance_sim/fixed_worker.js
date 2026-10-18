'use strict';
const fs=require('node:fs');
const engine=require('./fixed_engine');
async function run(job){
  await engine.initialize();
  if(job.kind==='screen'){
    const scene=engine.sceneById(job.scene),samples=await engine.enemySamples(scene,job.samples,job.seed,'selection');const rows=[];
    for(const record of job.records){const state=await engine.reconstruct(record),result=await engine.evaluate(state,scene,samples,{setupSeed:engine.hash(record.key)});
      rows.push({...record,screen:{wins:result.points.reduce((s,p)=>s+p.win,0),n:samples.length,winRate:result.winRate}});}
    return rows;
  }
  if(job.kind==='capture'){
    const {simulateRun}=engine.bot,seen=new Set(),snapshots=[];
    const layout=_layoutStartingBattleEnemies;
    _layoutStartingBattleEnemies=(...args)=>{
      layout(...args);if(G._botProbe||G._waveIsRetry)return;
      const scene=engine.SCENES.find(s=>s.wave===G._wave&&s.stage===G._waveStage);if(!scene||seen.has(scene.id))return;
      seen.add(scene.id);
      const saved=SaveRun.serializeRunState(),state={};
      for(const group of ['player','progress','choices','place'])Object.assign(state,saved[group]);
      state.questProgress=saved.questProgress;state._runSeed=saved.rng.seed;state._runRngState=saved.rng.state;
      state.allies=[];state.enemies=[];state._battleCoreEvents=[];
      // SetをJSONへ保存した後、比較時は戦闘入力だけを使う。
      snapshots.push({scene:scene.id,state,board:engine.boardView(),source:{policy:job.record.policy,seed:job.record.seed,storyCycle:job.record.storyCycle,battleIndex:job.record.battles.findIndex(b=>b.wave===scene.wave&&b.stage===scene.stage&&!b.retry)},preparedItems:true});
    };
    const compute=SaveRun.computeBattle;SaveRun.computeBattle=engine.fastCompute;
    try{
      const replay=await simulateRun({seed:job.record.seed,policy:job.record.policy,storyCycle:job.record.storyCycle});
      require('node:assert/strict').deepEqual(replay,job.record,'完全状態を採取した周回が元JSONLと一致しない');
      return snapshots;
    }finally{_layoutStartingBattleEnemies=layout;SaveRun.computeBattle=compute;}
  }
  if(job.kind==='validate'){
    const scene=engine.sceneById(job.scene),samples=await engine.enemySamples(scene,job.samples,job.seed,'selection');
    const rows=[];for(const board of job.boards){const r=await engine.evaluate(board.state,scene,samples,{preparedItems:board.preparedItems,setupSeed:engine.hash(board.key)});rows.push({...board,baseline:{wins:r.points.reduce((s,p)=>s+p.win,0),n:samples.length,winRate:r.winRate,meanHp:r.meanHp,meanDamage:r.meanDamage}});}return rows;
  }
  if(job.kind==='augment'){
    const scene=engine.sceneById(job.scene),samples=await engine.enemySamples(scene,job.samples,job.seed,'selection'),forms=await engine.cardForms(8923);
    const ordered=forms.filter(f=>f.category==='エンチャント').sort((a,b)=>
      ((Number(b.card.adjacentHpBonus)||0)+(Number(b.card.adjacentAtkBonus)||0)+b.rarity*2)-((Number(a.card.adjacentHpBonus)||0)+(Number(a.card.adjacentAtkBonus)||0)+a.rarity*2)||a.key.localeCompare(b.key));
    let current=job.board;const found=[];let tested=0;
    for(let depth=0;depth<3&&found.length<5;depth++){
      let best=null;
      for(const form of ordered){const places=(await engine.placements(current.state,form)).filter(p=>p.replaced===null&&p.targets.length);
        for(const place of places){
          if(++tested>240)return found;
          const state=engine.copy(current.state);state.mainBoard[place.slot]=engine.copy(place.card);
          const result=await engine.evaluate(state,scene,samples,{preparedItems:current.preparedItems,setupSeed:engine.hash(current.key)});
          const baseline={wins:result.points.reduce((s,p)=>s+p.win,0),n:samples.length,winRate:result.winRate,meanHp:result.meanHp,meanDamage:result.meanDamage};
          const addition={name:form.name,slot:place.slot,form:form.form,directions:place.card.directions,beforeWinRate:current.baseline.winRate,afterWinRate:result.winRate};
          const board=current.board.slice();board[place.slot]={...engine.view(place.card,place.slot),powerId:current.state.mapPanelPowers?.[place.slot]||''};
          const candidate={...current,key:current.key+`+${form.key}@${place.slot}`,state,board,features:engine.features(board),baseline,additions:[...(current.additions||[]),addition]};
          if(result.winRate>=.25&&result.winRate<=.75){found.push(candidate);if(found.length>=5)return found;}
          if(result.winRate<.25&&(!best||result.winRate>best.baseline.winRate||result.winRate===best.baseline.winRate&&result.meanHp>best.baseline.meanHp||result.winRate===best.baseline.winRate&&result.meanHp===best.baseline.meanHp&&result.meanDamage>best.baseline.meanDamage))best=candidate;
        }
      }
      if(!best)break;current=best;
    }
    return found;
  }
  if(job.kind==='compare')return require('./fixed_compare').compareJob(job);
  if(job.kind==='effects')return require('./fixed_effects').probeJob(job);
  if(job.kind==='boons')return require('./fixed_boons').compareScene(job);
  throw new Error(`不明な仕事: ${job.kind}`);
}
if(require.main===module)run(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))).then(result=>fs.writeFileSync(process.argv[3],JSON.stringify(result))).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={run};
