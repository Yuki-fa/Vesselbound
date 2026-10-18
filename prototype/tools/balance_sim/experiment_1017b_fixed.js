#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{performance}=require('node:perf_hooks');
const engine=require('./fixed_engine'),rules=require('./experiment_1017b_rules'),{spec}=require('./experiment_1017b_run');
const {compareJob}=require('./fixed_compare'),{csv}=require('./run_report');
let OUT=path.join(__dirname,'out_1017b');const BOARDS=path.join(__dirname,'fixed');
function banks(){
  const rows=fs.readFileSync(path.join(__dirname,'out/runs.jsonl'),'utf8').trim().split('\n').map(JSON.parse).filter(r=>r.policy==='planner'),result={};
  for(const scene of engine.SCENES){const values=[];for(const r of rows){let total=0;for(const b of r.battles){
    if(b.wave===scene.wave&&b.stage===scene.stage&&!b.retry){values.push(total);break;}total+=Number(b.manaAfter)||0;}}
    values.sort((a,b)=>a-b);result[scene.id]={n:values.length,quantiles:[.1,.3,.5,.7,.9].map(q=>values[Math.floor((values.length-1)*q)])};
  }return result;
}
function activation(points,name,category,slot){
  const units=points.map(p=>category==='キャラクター'?p.units.filter(u=>u.boardSlot===slot):p.units.filter(u=>u.seal>0));
  const nativeMana=units.map(us=>category==='キャラクター'?us.filter(u=>/^\d+マナ毎/.test(u.desc)):[]);
  return {trials:points.length,manaEligible:nativeMana.filter(us=>us.length).length,
    manaTriggered:nativeMana.filter(us=>us.some(u=>u.ownThresholds>0)).length,
    manaEvents:nativeMana.flat().reduce((s,u)=>s+u.ownThresholds,0),
    sealEligible:units.filter(us=>us.some(u=>u.seal>0)).length,
    released:units.filter(us=>us.some(u=>u.seal>0&&u.released)).length,
    allThresholdEvents:points.reduce((s,p)=>s+p.thresholds,0),allReleaseEvents:points.reduce((s,p)=>s+p.releases,0)};
}
async function work(job){
  await rules.install();const s=spec(job.id);rules.configure(s.simulation);
  let active=null;const evaluations=[],runner=createBattleRunner,evaluate=engine.evaluate;
  createBattleRunner=(state,rng,emit,opts)=>{
    const before={units:{p1:state.units.p1.filter(Boolean).map(u=>Object.fromEntries(['id','name','desc','keywords','manaRepeat','manaCost','no','artCode','_manaThresholdDesc','manaThresholdDesc','_mainBoardSlot'].map(k=>[k,u[k]])))},resources:engine.copy(state.resources),_experimentThresholdCarry:state._experimentThresholdCarry};
    const events=[],r=runner(state,rng,ev=>{events.push(ev);emit(ev);},opts),finish=r.finish.bind(r);let recorded=false;
    r.finish=()=>{const answer=finish();if(active&&!recorded){
      const observed=rules.battleObservation(before,{events,finalState:state});
      for(const u of observed.units){const source=before.units.p1.find(s=>s.id===u.id),text=source.manaThresholdDesc||source._manaThresholdDesc||coreManaThresholdDescFromText(source.desc);
        u.ownThresholds=events.filter(e=>e.type==='mana_threshold'&&e.side==='p1'&&e.unitId===u.id&&e.desc===text).length;u.boardSlot=source._mainBoardSlot;}
      active.push(observed);recorded=true;}return answer;};return r;
  };
  engine.evaluate=async(...args)=>{active=[];const answer=await evaluate(...args);evaluations.push(active);active=null;return answer;};
  const rows=await compareJob({...job,override:s.override});let index=0,board=null;
  for(const row of rows){if(board!==row.board){board=row.board;index+=2;}index+=row.connections.length;
    const points=evaluations[index++];row.activation=activation(points,row.name,row.category,row.slot);index++;}
  assert.equal(index,evaluations.length,'実測と接続探索・効果除去の対応');
  return rows;
}
async function main(argv){
  if(argv[0]==='--worker'){const job=JSON.parse(fs.readFileSync(argv[1],'utf8'));fs.writeFileSync(job.output,JSON.stringify(await work(job)));return;}
  if(argv[2])OUT=path.resolve(argv[2]);
  const ids=(argv[0]||'baseline,b_seal,c_opening,c_carry,d_nerfs,f_enchants').split(','),workers=Number(argv[1]||8);
  await engine.initialize();const baseForms=await engine.cardForms(1701),bank=banks(),jobs=[],temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-1017b-fixed-'));
  for(const id of ids){if(fs.existsSync(path.join(OUT,'fixed_'+id+'_effects','comparisons.jsonl')))throw Error('既存出力を上書きしない '+id);
    engine.resetOverride(spec(id).override);const forms=await engine.cardForms(1701),patchNames=new Set(spec(id).override.change.map(c=>c.name)),addNames=new Set(spec(id).override.add.map(c=>c.name));
    const used=forms.filter(f=>id.startsWith('c_')?f.form==='通常':id==='baseline'?(
      /封印\d+/.test((f.card.keywords||[]).join(' '))||/^\d+マナ毎/.test(f.card.desc)||['内なる大力','大いなる守護','スケルトンキング','ジャック・オ・ランタン','封印されしもの'].includes(f.card.name)):
      patchNames.has(f.card.name)||addNames.has(f.card.name));
    for(const scene of engine.SCENES){const boards=JSON.parse(fs.readFileSync(path.join(BOARDS,`boards_${scene.id}.json`),'utf8')).boards;
      if(id==='c_carry')boards.forEach((b,i)=>b.state._experimentCarryMana=bank[scene.id].quantiles[i]);
      for(let i=0;i<used.length;i+=6)jobs.push({id,kind:'compare',scene:scene.id,boards,keys:used.slice(i,i+6).map(f=>f.key),seed:7411,cardSeed:1701,samples:30,searchSamples:30,output:path.join(temp,`${jobs.length}.json`)});
    }
  }
  let next=0,done=0,failed=null;const results=[],start=performance.now();
  async function run(){while(next<jobs.length&&!failed){const job=jobs[next++],file=job.output+'.job';fs.writeFileSync(file,JSON.stringify(job));
    try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[__filename,'--worker',file],{stdio:['ignore','ignore','pipe']});let err='';child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>code?reject(Error(job.id+'/'+job.scene+': '+err)):resolve());});}
    catch(e){failed=e;throw e;}results.push({job,rows:JSON.parse(fs.readFileSync(job.output,'utf8'))});
    console.log(`${++done}/${jobs.length} 固定比較 ${job.id}/${job.scene} ${((performance.now()-start)/1000).toFixed(0)}秒`);
  }}
  try{const settled=await Promise.allSettled(Array.from({length:workers},run));
    for(const id of ids){const groups=results.filter(r=>r.job.id===id);if(groups.length!==jobs.filter(j=>j.id===id).length)continue;
      const dir=path.join(OUT,'fixed_'+id+'_effects');fs.mkdirSync(dir,{recursive:true});const rows=groups.flatMap(g=>g.rows).sort((a,b)=>a.scene.localeCompare(b.scene)||a.cardKey.localeCompare(b.cardKey)||a.board.localeCompare(b.board));
      fs.writeFileSync(path.join(dir,'comparisons.jsonl'),rows.map(JSON.stringify).join('\n')+'\n');
      const analyzed=require('./fixed_report').analyze(rows);csv(path.join(dir,'cards.csv'),analyzed.cards);csv(path.join(dir,'board_comparisons.csv'),rows.map(r=>({scene:r.scene,board:r.board,name:r.name,form:r.form,gainWinPt:r.gainWinPt,...r.activation})));
      fs.writeFileSync(path.join(dir,'meta.json'),JSON.stringify({variant:id,spec:spec(id),samples:30,searchSamples:30,seed:7411,cardSeed:1701,boards:BOARDS,carryBanks:id==='c_carry'?bank:null,sourceHashes:engine.sourceHashes(),toolHashes:engine.toolHashes(),experimentHashes:Object.fromEntries(['experiment_1017b_rules.js','experiment_1017b_fixed.js'].map(f=>[f,engine.sha(fs.readFileSync(path.join(__dirname,f)))])),elapsedMs:performance.now()-start,rows:rows.length},null,2)+'\n');
      console.log('保存 '+id+' '+rows.length+'比較');
    }
    const failure=settled.find(s=>s.status==='rejected');if(failure)throw failure.reason;
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={work,banks,activation};
