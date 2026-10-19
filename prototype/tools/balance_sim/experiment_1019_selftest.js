#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
async function main(args=process.argv.slice(2)){
  if(args[0]==='--price'){
    const kind=args[1],experiment=require('./experiment_1019');await experiment.install(experiment.SPECS[kind+'50']);
    const boons=require('./bot_boons'),api=await require('./run_bot').initialize();
    api.seed=1019;api.cycle=1;api.resetRun();initState();SaveRun.begin();
    Object.assign(G,{_wave:2,_waveStage:2,_waveLife:3,gold:350,phase:'reward'});G.mainBoard[1]=makePanel('ゴーレム');
    _dragSrc=null;_rewCards=[makePanel('錬成')];Object.assign(_rewCards[0],{directions:[],_isOriginalReward:true});
    const actions=[];
    if(kind==='shop'){openMapShop();assert.ok(boons.rerollShop('greedy',a=>actions.push(a)));}
    else if(kind==='reward')await boons.rerollIfWeak('greedy',{color:''},{record:a=>actions.push(a),recordOffers:()=>{}});
    else{
      G.runLevels.values={stats:2,familiars:1,modifiers:1,damage:1};const random=rand;
      try{rand=()=>5.01/8;runLevelRollReward(2,G.runLevels.values);}finally{rand=random;}
      boons.acceptLevelReward('greedy',a=>actions.push(a));
    }
    assert.equal(G.gold,300);assert.equal(actions.filter(a=>/reroll/.test(a.type)).length,1);console.log('OK '+kind+'50：判断と本体の支払いがともに50G');return;
  }
  const engine=require('./fixed_engine');await engine.initialize();
  const patches=JSON.parse(fs.readFileSync(path.join(__dirname,'overrides/proposal_1019.json'),'utf8')).change;
  for(const patch of patches.filter(p=>p.keywords)){
    const original=PANEL_POOL.find(c=>c.name===patch.name);assert.ok(original);
    for(const keyword of original.keywords.filter(k=>!/^封印/.test(k)))assert.ok(patch.keywords.includes(keyword),patch.name+'：封印以外のキーワードを保つ');
  }
  console.log('OK 封印軽減案：即死など調整対象外のキーワードを保持');
  assert.ok(require('./load').scripts.includes('js/engine/run_levels.js'),'固定比較はindex.htmlからレベル機能を読む');
  const bot=require('./run_bot'),options={seed:4003,policy:'planner'};
  const before=await bot.simulateRun(options);await require('./experiment_1019').install();const after=await bot.simulateRun(options);
  assert.deepEqual(after,before,'空の仮設定とフレーム省略computeで全周回のJSONが一致');console.log('OK 空の実験設定：実周回・全選択・資源が完全一致');
  for(const scene of engine.SCENES){
    const board=JSON.parse(fs.readFileSync(path.join(__dirname,'fixed',`boards_${scene.id}.json`),'utf8')).boards[0];
    const state=engine.copy(board.state);state.runLevels={...runLevelInitialState(),values:{stats:3,familiars:2,modifiers:2,damage:2}};
    const samples=await engine.enemySamples(scene,3,7411),options={preparedItems:board.preparedItems,setupSeed:engine.hash('1019-parity:'+scene.id)};
    const fast=await engine.evaluate(state,scene,samples,options),original=await engine.evaluate(state,scene,samples,{...options,original:true});
    assert.deepEqual(fast,original);assert.deepEqual(state.runLevels.values,{stats:3,familiars:2,modifiers:2,damage:2});
    assert.deepEqual(fast.initial.runLevels.p1,state.runLevels.values);console.log('OK '+scene.id+'：高レベルでも本番computeと固定比較が一致');
  }
  for(const kind of ['shop','reward','level']){
    const child=spawnSync(process.execPath,[__filename,'--price',kind],{encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);process.stdout.write(child.stdout);
  }
  console.log('実験1019の健全性検査：合格');
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
