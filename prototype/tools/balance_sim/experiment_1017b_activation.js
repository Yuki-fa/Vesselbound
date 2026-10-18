#!/usr/bin/env node
'use strict';
// 保存した勝敗・配置・接続は維持し、候補のマスから固有マナの発動だけを再観測する。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),e=require('./fixed_engine'),rules=require('./experiment_1017b_rules'),{spec}=require('./experiment_1017b_run');
const {load}=require('./experiment_1017b_analyze'),{csv}=require('./run_report');
let OUT=path.join(__dirname,'out_1017b');
async function work(job){
  await rules.install();rules.configure(spec(job.id).simulation);e.resetOverride(spec(job.id).override);
  const scene=e.sceneById(job.scene),forms=await e.cardForms(1701),samples=await e.enemySamples(scene,30,7411,'evaluation'),result=[];
  for(const row of job.rows){const board=job.boards.find(b=>b.id===row.board),state=e.copy(board.state),form=forms.find(f=>f.key===row.cardKey);
    if(job.id==='c_carry')state._experimentCarryMana=job.banks[job.boards.indexOf(board)];
    const place=(await e.placements(state,form)).find(p=>p.slot===row.slot);assert.ok(place);
    const initial=await e.setup(state,scene,samples[0],{preparedItems:board.preparedItems,seed:e.hash('fixed-formation:'+board.id),mutate:()=>{G.mainBoard[place.slot]=e.copy(place.card);}});
    const subject=initial.units.p1.find(u=>u&&u._mainBoardSlot===row.slot);assert.ok(subject,'候補のマスから個体IDを特定');
    const ownText=coreManaThresholdDescFromText(form.card.desc),counts={...row.activation,manaEligible:30,manaTriggered:0,manaEvents:0};
    let hp=0,damage=0,allThresholdEvents=0;
    for(const [i,sample] of samples.entries()){
      const foe=coreInitializeBattleState({units:{p1:[],p2:e.copy(sample.enemies)},stageNumber:scene.wave,mapIndex:scene.floor}).units.p2;
      _stampCoreSideSlots({units:{p1:[],p2:foe},stageNumber:scene.wave});
      const actual=e.compute({...initial,units:{p1:initial.units.p1,p2:foe}},sample.battleSeed),point=e.measure(actual);
      assert.equal(point.win,row.wins[i],'発動再観測でも保存した勝敗を変えない');hp+=point.hp/30;damage+=point.damage/30;
      const n=actual.events.filter(ev=>ev.type==='mana_threshold'&&ev.side==='p1'&&ev.unitId===subject.id&&ev.desc===ownText).length;
      counts.manaTriggered+=+(n>0);counts.manaEvents+=n;allThresholdEvents+=actual.events.filter(ev=>ev.type==='mana_threshold'&&ev.side==='p1').length;
    }
    assert.ok(Math.abs(hp-row.actual.meanHp)<1e-7);assert.ok(Math.abs(damage-row.actual.meanDamage)<1e-7);assert.equal(allThresholdEvents,row.activation.allThresholdEvents);
    result.push({scene:row.scene,board:row.board,cardKey:row.cardKey,activation:counts});
  }return result;
}
async function main(argv){if(argv[0]==='--worker'){const job=JSON.parse(fs.readFileSync(argv[1]));fs.writeFileSync(job.output,JSON.stringify(await work(job)));return;}
  if(argv[0])OUT=path.resolve(argv[0]);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-1017b-activation-')),jobs=[],datasets={};
  for(const id of ['baseline','b_seal','c_opening','c_carry','d_nerfs','f_enchants']){
    const dir=path.join(OUT,`fixed_${id}_effects`),rows=load(path.join(dir,'comparisons.jsonl'));datasets[id]={dir,rows,meta:JSON.parse(fs.readFileSync(path.join(dir,'meta.json')))};
    for(const scene of ['st2_normal','st2_elite','st3_normal','st3_elite']){
      const wanted=rows.filter(r=>r.scene===scene&&r.category==='キャラクター'&&/^\d+マナ毎/.test(r.desc));
      const boards=JSON.parse(fs.readFileSync(path.join(__dirname,'fixed',`boards_${scene}.json`))).boards;
      for(let i=0;i<wanted.length;i+=25)jobs.push({id,scene,rows:wanted.slice(i,i+25),boards,banks:datasets[id].meta.carryBanks?.[scene]?.quantiles,output:path.join(temp,`${jobs.length}.json`)});
    }
  }
  let cursor=0,done=0;const results=[];
  async function run(){while(cursor<jobs.length){const job=jobs[cursor++],file=job.output+'.job';fs.writeFileSync(file,JSON.stringify(job));
    await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[__filename,'--worker',file],{stdio:['ignore','ignore','pipe']});let error='';p.stderr.on('data',b=>error+=b);p.on('error',reject);p.on('close',code=>code?reject(Error(job.id+'/'+job.scene+': '+error)):resolve());});
    results.push({id:job.id,rows:JSON.parse(fs.readFileSync(job.output))});console.log(`${++done}/${jobs.length} 発動再観測 ${job.id}/${job.scene}`);
  }}
  try{const settled=await Promise.allSettled(Array.from({length:8},run));const bad=settled.find(r=>r.status==='rejected');if(bad)throw bad.reason;
    const stats=[];
    for(const [id,data] of Object.entries(datasets)){
      const changed=new Map(results.filter(r=>r.id===id).flatMap(r=>r.rows).map(r=>[`${r.scene}:${r.cardKey}:${r.board}`,r.activation]));
      for(const row of data.rows){const current=changed.get(`${row.scene}:${row.cardKey}:${row.board}`);if(current)row.activation=current;
        else if(row.category!=='キャラクター'||!/^\d+マナ毎/.test(row.desc))Object.assign(row.activation,{manaEligible:0,manaTriggered:0,manaEvents:0});}
      fs.writeFileSync(path.join(data.dir,'comparisons.jsonl'),data.rows.map(JSON.stringify).join('\n')+'\n');
      csv(path.join(data.dir,'board_comparisons.csv'),data.rows.map(r=>({scene:r.scene,board:r.board,name:r.name,form:r.form,gainWinPt:r.gainWinPt,...r.activation})));
      data.meta.activationSchema='候補の_mainBoardSlot→個体IDと固有効果本文を照合。mana欄はキャラクター固有のNマナ毎だけ（強化カードは対象外）。';
      data.meta.activationReobservedRows=changed.size;fs.writeFileSync(path.join(data.dir,'meta.json'),JSON.stringify(data.meta,null,2)+'\n');stats.push({variant:id,reobserved:changed.size,unchangedWins:true,unchangedHp:true,unchangedDamage:true});
    }
    fs.mkdirSync(path.join(OUT,'validation'),{recursive:true});
    fs.writeFileSync(path.join(OUT,'validation/activation_reobservation.json'),JSON.stringify({candidates:stats,rows:results.flatMap(r=>r.rows).length,enemySamples:30,seed:7411},null,2)+'\n');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.stack);process.exitCode=1;});
