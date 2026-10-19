#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const bot=require('./run_bot'),boons=require('./bot_boons');
async function test(api,check=(title,fn)=>{fn();console.log('OK '+title);}){
  const fresh=gold=>{
    api.seed=1019;api.cycle=1;api.resetRun();initState();SaveRun.begin();
    Object.assign(G,{_wave:2,_waveStage:2,_waveLife:3,life:3,gold,phase:'reward'});
    G.mainBoard.fill(null);G.mainBoard[1]=makePanel('ゴーレム');
    _rewCards=[makePanel('錬成')];_rewCards[0].directions=[];_rewCards[0]._isOriginalReward=true;
    _rewFreePickDone=false;_dragSrc=null;
  };
  const records=[];const hooks={record:a=>records.push(a),recordOffers:()=>{}};
  for(const [gold,rights,expected] of [[399,0,0],[400,0,1],[25,1,1]]){
    fresh(gold);towerBoonState().rerolls=rights;records.length=0;
    assert.equal((await boons.quality('greedy',{color:''})).weak,true);
    await boons.rerollIfWeak('greedy',{color:''},hooks);
    check(`通常報酬：${gold}G・権利${rights}、弱い候補だけ本体で再抽選`,()=>{
      assert.equal(records.length,expected);
      if(expected){const a=records[0];assert.equal(a.type,'boon_reroll');assert.ok(a.quality.weak&&a.reason);
        assert.equal(a.goldAfter,gold-(rights?0:100));assert.equal(a.remainingAfter,0);
        assert.equal(a.payment,rights?'right':'gold');assert.ok(_rewCards.every(c=>!c||c._isOriginalReward));}
      else assert.equal(G.gold,gold);
    });
  }
  fresh(1000);_rewCards=[makePanel('ゴーレム')];Object.assign(_rewCards[0],{power:999,life:999,_isOriginalReward:true});records.length=0;
  await boons.rerollIfWeak('greedy',{color:''},hooks);
  check('通常報酬：十分強い候補は1000Gあっても引き直さない',()=>{assert.equal(records.length,0);assert.equal(G.gold,1000);});
  for(const policy of Object.keys(boons.SETTINGS))for(const [gold,rights] of [[0,0],[1000,0],[25,3]]){
    fresh(gold);_rewCards=[];towerBoonState().rerolls=rights;
    const reward=runLevelRollReward(2,G.runLevels.values),state=clone(G.runLevels);records.length=0;
    boons.acceptLevelReward(policy,hooks.record);
    await boons.rerollIfWeak(policy,{color:''},hooks);
    check(`レベル報酬（${policy}）：${gold}G・権利${rights}でも受領だけ、判断・支払い・再抽選は無し`,()=>{
      assert.equal(records.length,1);assert.equal(records[0].type,'level_reward');assert.equal(records[0].id,reward.id);
      assert.equal(records[0].rerolled,false);assert.deepEqual(records[0].gains,reward.gains);
      assert.equal(records[0].history.length,1);assert.deepEqual(G.runLevels,state);
      assert.equal(G.gold,gold);assert.equal(towerBoonState().rerolls,rights);
    });
  }

}
if(require.main===module)bot.initialize().then(api=>test(api)).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={test};
