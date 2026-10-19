#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{load}=require('./experiment_1017b_analyze');
const OUT=path.join(__dirname,'out_1017b');
// 周回側は付与分を含むマナ発動数を観測する。固有効果の区別は固定比較で行う。
function canonical(row){const r=structuredClone(row);for(const b of r.experiment?.battles||[])for(const u of b.units)delete u.ownThresholds;return r;}
async function replay(file){const job=JSON.parse(fs.readFileSync(file,'utf8')),rules=require('./experiment_1017b_rules'),bot=require('./run_bot');await rules.install();rules.begin(job.spec.simulation);
  const row=await bot.simulateRun({seed:job.row.seed,policy:job.row.policy,override:job.spec.override,storyCycle:1,towerBoon:'on',plannerStage:'r2'});row.experiment=rules.end();
  assert.deepEqual(canonical(row),canonical(job.row),'同じ種・仮設定で再計測が一致');
}
async function main(argv){if(argv[0]==='--replay')return replay(argv[1]);const checks=[],check=(name,fn)=>{fn();checks.push(name);console.log('OK '+name);};
  const dirs=fs.existsSync(OUT)?fs.readdirSync(OUT).filter(d=>fs.existsSync(path.join(OUT,d,'runs.jsonl'))):[];
  const previous=path.join(__dirname,'out/runs.jsonl');
  const old=new Map(fs.existsSync(previous)?load(previous).map(r=>[r.policy+':'+r.seed,r]):[]);
  if(!dirs.length)console.log('SKIP 周回出力の比較・再現: git管理外の '+OUT+' に runs.jsonl が無い（独立したルール検査は続行）');
  const jobs=[];for(const id of dirs){const rows=load(path.join(OUT,id,'runs.jsonl')),meta=JSON.parse(fs.readFileSync(path.join(OUT,id,'meta.json')));
    check(id+': 件数・種・交換・祭壇・資源・マナ入力',()=>{
      assert.equal(rows.length,id==='baseline'?400:100);
      for(const policy of [...new Set(rows.map(r=>r.policy))])assert.deepEqual(rows.filter(r=>r.policy===policy).map(r=>r.seed),Array.from({length:id==='baseline'?200:100},(_,i)=>4001+i));
      for(const r of rows){assert.ok(!r.actions.some(a=>a.type==='sell'||a.type==='purchase'));assert.ok(r.finalGold>=0);assert.equal(r.experiment.battles.length,r.battles.length);
        for(const a of r.actions.filter(a=>a.type==='exchange'))assert.equal(a.gold,0);
        for(const a of r.actions.filter(a=>a.type==='ring_exchange'))assert.equal(a.sacrifice.length,3);
        for(const [w,end] of Object.entries(r.experiment.stageEnds)){const ring=r.actions.find(a=>a.type==='ring_exchange'&&a.wave===Number(w)),shortage=r.actions.find(a=>a.type==='ring_shortage'&&a.wave===Number(w));assert.ok(ring||shortage,'指輪取得か不足の記録');assert.ok(end.cards>=1);}
        let carry=0;for(const b of r.experiment.battles){if(meta.simulation.openingMana)assert.ok(b.openingMana>=meta.simulation.openingMana);if(meta.simulation.thresholdCarry){assert.equal(b.thresholdCarry,carry);carry+=Math.max(0,b.finalMana);}else assert.equal(b.thresholdCarry,0);}
      }
    });
    if(id==='baseline'){
      if(fs.existsSync(previous))check('基準400周は既存の新ルール400周と全JSONが一致',()=>{for(const row of rows){const r=structuredClone(row);delete r.experiment;assert.deepEqual(r,old.get(r.policy+':'+r.seed));}});
      else console.log('SKIP 旧周回との全JSON比較: '+previous+' が無い');
    }
    const row=meta.simulation.thresholdCarry?rows.find(r=>r.experiment.battles.some(b=>b.thresholdCarry>0))||rows[0]:rows.find(r=>r.clear)||rows[0];jobs.push({id,row,spec:{simulation:meta.simulation,override:meta.override}});
  }
  const rules=require('./experiment_1017b_rules'),e=require('./fixed_engine');await rules.install();
  const fixedBaseFile=path.join(OUT,'fixed_baseline/comparisons.jsonl'),fixedEffectsFile=path.join(OUT,'fixed_baseline_effects/comparisons.jsonl');
  if(fs.existsSync(fixedBaseFile)&&fs.existsSync(fixedEffectsFile)){
  const fixedBase=load(fixedBaseFile),fixedMap=new Map(fixedBase.map(r=>[`${r.scene}:${r.cardKey}:${r.board}`,r]));
  check('固定基準の発動観測960件も全カード基準と実測JSONが一致',()=>{
    const records=load(path.join(OUT,'fixed_baseline_effects/comparisons.jsonl'));assert.equal(records.length,960);
    for(const record of records){const row={...record};delete row.activation;assert.deepEqual(row,fixedMap.get(`${row.scene}:${row.cardKey}:${row.board}`));}
  });
  }else console.log('SKIP 固定基準960件の比較: '+fixedBaseFile+' または '+fixedEffectsFile+' が無い');
  const additional=[['b_seal',280],['c_opening',3080],['c_carry',3080],['d_nerfs',160],['f_enchants',120]];
  if(additional.some(([id])=>fs.existsSync(path.join(OUT,`fixed_${id}_effects/comparisons.jsonl`))))check('追加固定比較の件数・発動率の分母とF通常形の本文解釈',()=>{
    for(const [id,n] of additional){
      const file=path.join(OUT,`fixed_${id}_effects/comparisons.jsonl`);
      if(!fs.existsSync(file)){console.log('SKIP 追加固定比較 '+id+': git管理外の '+file+' が無い');continue;}
      const records=load(file);assert.equal(records.length,n);
      for(const row of records){assert.equal(row.n,30);assert.ok(row.activation.manaTriggered<=row.activation.manaEligible);assert.ok(row.activation.released<=row.activation.sealEligible);}
      if(id==='f_enchants')for(const name of new Set(records.filter(r=>r.form==='通常').map(r=>r.name)))assert.ok(records.filter(r=>r.name===name).some(r=>r.eventChangedCases>0),'新効果が本文除去対照と変化する');
    }
  });else console.log('SKIP 追加固定比較5条件: git管理外の '+OUT+'/fixed_*_effects/comparisons.jsonl が無い');
  check('祝福100Gは初回だけ。2回目500G・3回目1000Gを維持',()=>{rules.configure({firstBoonPrice:100});assert.deepEqual([0,1,2].map(towerBoonPrice),[100,500,1000]);rules.configure();});
  check('持ち越しはNマナ毎だけに加算。消費マナ・召喚後の閾値は元のまま',()=>{
    const state={resources:{p1:{mana:1}},_experimentThresholdCarry:5},repeat={cost:2,repeat:true},once={cost:2,repeat:false};rules.configure({thresholdCarry:true});
    assert.equal(coreManaThresholdProgress(state,'p1',repeat,{}),3);assert.equal(coreManaThresholdProgress(state,'p1',once,{}),0);
    assert.equal(coreManaThresholdProgress(state,'p1',repeat,{_manaThresholdBaseline:1}),0);assert.equal(state.resources.p1.mana,1);rules.configure();
  });
  const scene=e.sceneById('st2_elite');rules.configure();const baseEnemies=await e.enemySamples(scene,3,7411);rules.configure({eliteStatMultiplier:.72});const smaller=await e.enemySamples(scene,3,7411);
  check('エリート倍率は本体が生成した全敵に1回だけ適用。敵数・名前・並びは同じ',()=>{for(let i=0;i<3;i++){assert.equal(smaller[i].enemies.length,baseEnemies[i].enemies.length);for(let j=0;j<baseEnemies[i].enemies.length;j++){const a=baseEnemies[i].enemies[j],b=smaller[i].enemies[j];if(!a){assert.equal(b,a);continue;}assert.ok(b);assert.equal(a.name,b.name);assert.equal(a.lane,b.lane);assert.equal(b.atk,Math.max(0,Math.round(a.atk*.72)));assert.equal(b.hp,Math.max(1,Math.round(a.hp*.72)));}}});rules.configure();
  const bspec=require('./experiment_1017b_run').spec('b_seal');e.resetOverride(bspec.override);
  check('半減した封印されしものにパーサーの封印1を重複させない',()=>{const c=PANEL_POOL.find(c=>c.name==='封印されしもの');assert.deepEqual(c.adjacentKeywords.filter(k=>/^封印\d+$/.test(k)),['封印5']);});e.resetOverride();
  const fspec=require('./experiment_1017b_run').spec('f_enchants');rules.configure(fspec.simulation);e.resetOverride(fspec.override);
  check('仮エンチャントは本文中の熟練を無条件付与キーワードへ混ぜず、指定レア・報酬対象を維持',()=>{for(const add of fspec.override.add){const c=PANEL_POOL.find(c=>c.name===add.name);assert.deepEqual(c.adjacentKeywords,[]);assert.equal(c.rarity,add.rarity);assert.notEqual(c._rewardAvailable,false);}});e.resetOverride();rules.configure();
  const boards=JSON.parse(fs.readFileSync(path.join(__dirname,'fixed/boards_st2_normal.json'))).boards[0],normal=e.sceneById('st2_normal'),samples=await e.enemySamples(normal,2,7411);
  const lookahead=require('./lookahead');rules.configure({thresholdCarry:true});
  await e.isolated(async()=>{
    _rewCards=[];G._experimentCarryMana=0;lookahead.resetStats();
    const evaluate=()=>lookahead.decision({policy:'lookahead',color:''},async trial=>{await trial({});});
    await evaluate();const firstTrials=lookahead.stats.trials;await evaluate();assert.equal(lookahead.stats.trials,firstTrials,'同じマナの試行はキャッシュする');
    G._experimentCarryMana=4;await evaluate();assert.equal(lookahead.stats.trials,firstTrials+lookahead.DEFAULTS.samples,'マナだけ変わった時は試行をやり直す');
    G.gameSummonBuff={atk:1,hp:2};await evaluate();assert.equal(lookahead.stats.trials,firstTrials+2*lookahead.DEFAULTS.samples,'眷属のゲーム中修正だけ変わった時も試行をやり直す');
  },{state:boards.state,seed:1234});rules.configure();
  checks.push('同じ盤面・金・ライフでも持ち越しマナだけ変われば先読みを再計算する');console.log('OK '+checks.at(-1));
  for(const cfg of [{},{openingMana:2},{thresholdCarry:true}]){rules.configure(cfg);for(const sample of samples){const state=await e.setup({...boards.state,_experimentCarryMana:4},normal,sample,{preparedItems:boards.preparedItems,seed:1234});
    const slow=e.compute(state,sample.battleSeed,{original:true}),fast=e.compute(state,sample.battleSeed);assert.deepEqual(fast.events,slow.events);assert.deepEqual(fast.finalState,slow.finalState);}}
  checks.push('基準・開戦+2・持ち越しの3条件×2戦で本体computeと高速computeの全イベント・最終状態が一致');console.log('OK '+checks.at(-1));rules.configure();
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-1017b-replay-'));let cursor=0;
  try{async function worker(){while(cursor<jobs.length){const job=jobs[cursor++],file=path.join(temp,job.id+'.json');fs.writeFileSync(file,JSON.stringify(job));await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[__filename,'--replay',file],{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',b=>err+=b);p.on('error',reject);p.on('close',code=>code?reject(Error(job.id+': '+err)):resolve());});console.log('OK '+job.id+': 代表種の全JSON再現');}}
    const settled=await Promise.allSettled(Array.from({length:4},worker));const bad=settled.find(r=>r.status==='rejected');if(bad)throw bad.reason;
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  if(jobs.length)checks.push(`${jobs.length}条件の代表種（クリア種・マナ持ち越し成立種を優先）の全JSON再現`);
  else console.log('SKIP 代表種の全JSON再現: 元になる周回出力が無い');
  const result={checks,datasets:dirs,replaySeeds:jobs.map(j=>({variant:j.id,seed:j.row.seed,policy:j.row.policy}))};
  if(fs.existsSync(OUT)){fs.mkdirSync(path.join(OUT,'validation'),{recursive:true});fs.writeFileSync(path.join(OUT,'validation/experiment_selftest.json'),JSON.stringify(result,null,2)+'\n');}
  console.log('合格 '+checks.length+'項目');
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={canonical};
