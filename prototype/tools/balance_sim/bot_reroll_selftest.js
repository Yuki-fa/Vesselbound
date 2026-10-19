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
  const badLevel=()=>{
    G.runLevels.values={stats:2,familiars:1,modifiers:1,damage:1};
    const random=rand;
    try{rand=()=>5.01/8;runLevelRollReward(2,G.runLevels.values);}finally{rand=random;}
    assert.equal(G.runLevels.reward.id,'familiars:2');assert.equal(G.runLevels.reward.lowered,'stats');
    assert.ok(boons.levelQuality(G.runLevels.reward).weak);
  };
  for(const [gold,rights,expected] of [[399,0,0],[400,0,1],[25,1,1]]){
    fresh(gold);_rewCards=[];towerBoonState().rerolls=rights;badLevel();records.length=0;
    const before=clone(G.runLevels.reward.before);boons.acceptLevelReward('greedy',hooks.record);
    check(`レベル報酬：${gold}G・権利${rights}、重要な戦闘力の低下を本体で取り消す`,()=>{
      const rerolls=records.filter(a=>a.type==='level_reroll'),accepted=records.at(-1);
      assert.equal(rerolls.length,expected);assert.equal(accepted.rerolled,!!expected);
      assert.equal(accepted.history.length,expected+1);assert.equal(G.runLevels.seq,expected+1);
      assert.deepEqual(accepted.before,before);assert.deepEqual(G.runLevels.values,accepted.after);
      if(expected){assert.equal(rerolls[0].goldAfter,gold-(rights?0:100));assert.equal(rerolls[0].remainingAfter,0);
        assert.ok(rerolls[0].quality.gain<boons.LIMITS.levelLoss&&rerolls[0].reason);}
    });
  }
  fresh(1000);G.runLevels.values={stats:1,familiars:1,modifiers:1,damage:1};
  runLevelRollReward(1,G.runLevels.values);records.length=0;boons.acceptLevelReward('greedy',hooks.record);
  check('レベル報酬：+1のみの改善は引き直さない',()=>{assert.equal(records.length,1);assert.equal(records[0].rerolled,false);assert.equal(G.gold,1000);});
}
if(require.main===module)bot.initialize().then(api=>test(api)).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={test};
