#!/usr/bin/env node
'use strict';
// 旧データ入力の扱いと、新ATK/HPで比較・抽選分布・感度分析が動くことを確かめる。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
async function main(){
  const engine=require('./fixed_engine');await engine.initialize();
  const {normalizeLevels,main:compare}=require('./fixed_compare'),experiment=require('./experiment_1019');
  assert.deepEqual(normalizeLevels({atk:2,hp:5},'new'),{atk:2,hp:5});
  assert.deepEqual(normalizeLevels({stats:3,familiars:9,modifiers:8,damage:7},'old'),{atk:3,hp:3});
  for(const raw of [null,{atk:0,hp:1},{atk:2.5,hp:3},{atk:2},{stats:0}])assert.throws(()=>normalizeLevels(raw,'invalid'),/不正な固定比較レベル/);
  for(const id of ['level_plus1','level_no_down','level50'])assert.equal(id in experiment.SPECS,false);
  for(const spec of [{plus1Only:true},{noDown:true},{prices:{level:50}}])await assert.rejects(experiment.install(spec),/旧4レベル.*廃止/);
  const analyze=require('./analyze_1019');
  assert.throws(()=>analyze.curves([{policy:'greedy',battles:[{runLevels:{stats:2,familiars:3,modifiers:4,damage:5}}]}]),/現行仕様で周回を再生成/);
  const typical=analyze.typicalLevels([{policy:'lookahead',battles:engine.SCENES.map(scene=>({...scene,runLevels:{atk:2,hp:5}}))}]);
  assert.deepEqual(Object.values(typical.levels),engine.SCENES.map(()=>({atk:2,hp:5})));
  console.log('OK 比較道具：旧4レベルの入力移行・不正値拒否・廃止実験の理由・旧成績の再計測要求');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vb-level-tools-'));
  try{
    const rows=await require('./level_probe_1019').main(root,200);
    assert.equal(rows.length,8);
    for(const row of rows){assert.equal(row.total,2+3*row.rewards);assert.ok(Number.isFinite(row.atk)&&Number.isFinite(row.hp));}
    const scene=engine.SCENES[0],source=JSON.parse(fs.readFileSync(path.join(__dirname,'fixed',`boards_${scene.id}.json`),'utf8'));
    source.boards=source.boards.slice(0,1);fs.writeFileSync(path.join(root,`boards_${scene.id}.json`),JSON.stringify(source));
    const levelsFile=path.join(root,'typical_levels.json');
    fs.writeFileSync(levelsFile,JSON.stringify(Object.fromEntries(engine.SCENES.map(s=>[s.id,{stats:3,familiars:9,modifiers:8,damage:7}]))));
    const output=path.join(root,'compare');
    const result=await compare(['--boards',root,'--out',output,'--samples','20','--search-samples','20','--workers','1','--cards','アラッサス','--scenes',scene.id,'--levels-file',levelsFile]);
    assert.ok(result.rows.length);assert.deepEqual(result.meta.runLevels[scene.id],{atk:3,hp:3});
    assert.ok(result.rows.every(r=>r.runLevels.atk===3&&r.runLevels.hp===3));
    // 新形式でも同じ入口を通す。感度はATK/HPだけの±1とエリート倍率を計測する。
    fs.writeFileSync(levelsFile,JSON.stringify(Object.fromEntries(engine.SCENES.map(s=>[s.id,{atk:3,hp:5}]))));
    const sensitivity=await require('./sensitivity_1019').main([root]);
    assert.ok(sensitivity.length);assert.ok(sensitivity.every(r=>/^(atk|hp)[+-]1$|^enemy085$/.test(r.change)));
    console.log('OK 比較道具：固定比較CLI --levels-file・抽選分布・全4場面のATK/HP感度分析');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
