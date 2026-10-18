#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {initialize}=require('./run_bot');
const boons=require('./bot_boons');
async function testTowerBoonVisit(api,check=(name,fn)=>{fn();console.log('OK '+name);}){
  api.resetRun();initState();SaveRun.begin();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('altar')+1;G._waveLife=3;G.life=3;G.gold=10000;
  G.mainBoard[1]=makePanel('ノーム');G._isWaveAltar=true;
  check('塔：再訪・保存復元で祝福の座や購入を復活させず、旧祝福の個体・残権利を保持する',()=>{
    towerBoonState().counts.stats=1;towerBoonState().counts.rerolls=1;towerBoonState().rerolls=2;
    towerBoonBlessGeneratedCard(G.mainBoard[1]);
    const card=clone(G.mainBoard[1]),state=clone(towerBoonState()),save=SaveRun.buildRunSave('tower');
    openMapVillage({tower:true});openMapVillage({tower:true});
    assert.equal(villageFacilityList().some(f=>f.key==='towerBoon'),false);assert.equal(towerBoonChoose('stats'),false);
    SaveRun.restoreRunState(save);openMapVillage({tower:true});assert.deepEqual(G.mainBoard[1],card);assert.deepEqual(towerBoonState(),state);assert.equal(G.gold,10000);
  });
  for(const policy of Object.keys(boons.SETTINGS)){
    api.resetRun();initState();SaveRun.begin();G._wave=2;G._waveStage=3;G.phase='reward';
    const reward=runLevelRollReward(2,runLevelState().values);towerBoonState().rerolls=2;
    const state=clone(G.runLevels),actions=[];boons.acceptLevelReward(policy,a=>actions.push(a));
    await boons.rerollIfWeak(policy,{color:'',policy},{record:a=>actions.push(a),recordOffers:()=>{}});
    check(`レベル受領（${policy}）：無料のランダム結果を受け取り、権利を温存する`,()=>{
      assert.equal(actions.length,1);assert.equal(actions[0].type,'level_reward');assert.equal(actions[0].id,reward.id);
      assert.equal(actions[0].rerolled,false);assert.deepEqual(G.runLevels,state);assert.equal(towerBoonState().rerolls,2);
    });
  }
}
if(require.main===module)initialize().then(api=>testTowerBoonVisit(api)).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testTowerBoonVisit};
