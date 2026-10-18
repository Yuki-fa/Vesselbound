#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {initialize}=require('./run_bot');
const {source}=require('./bot_runtime');
const boons=require('./bot_boons');

async function testTowerBoonVisit(api,check=(name,fn)=>{fn();console.log('OK '+name);}){
  api.resetRun();initState();SaveRun.begin();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('altar')+1;G._waveLife=3;G.life=3;G.gold=10000;
  openTowerBoonSeat();const choices=clone(_towerBoonChoices),visits=towerBoonState().visits;
  check('祝福の座：同じ塔へ入り直しても並び・訪問数・乱数を保持する',()=>{
    const rng=G._runRngState;G._isTowerBoon=false;openTowerBoonSeat();
    assert.deepEqual(_towerBoonChoices,choices);assert.equal(towerBoonState().visits,visits);assert.equal(G._runRngState,rng);
  });
  assert.equal(towerBoonChoose(choices[0]),true);
  assert.deepEqual(choices.map(towerBoonChoicePrice),[500,200,200]);
  assert.equal(towerBoonChoose(choices[1]),true);
  assert.equal(towerBoonChoose(choices[0]),true);
  const purchased=clone(towerBoonState()),gold=G.gold,prices=choices.map(towerBoonChoicePrice),save=SaveRun.buildRunSave('tower');
  assert.equal(gold,9100);assert.deepEqual(prices,[1000,500,200]);
  check('祝福の座：購入後に保存・復元・再入場しても選択肢・購入数・価格を保持する',()=>{
    G._isTowerBoon=false;openTowerBoonSeat();assert.deepEqual(_towerBoonChoices,choices);assert.deepEqual(choices.map(towerBoonChoicePrice),prices);
    assert.equal(towerBoonChoose(choices[2]),true);
    SaveRun.restoreRunState(save);openTowerBoonSeat();
    assert.deepEqual(_towerBoonChoices,choices);assert.deepEqual(towerBoonState(),purchased);assert.equal(G.gold,gold);assert.deepEqual(choices.map(towerBoonChoicePrice),prices);
  });
  check('祝福の座：次の塔は一度だけ新規抽選し、前の塔の選択肢も保持する',()=>{
    G._wave=3;openTowerBoonSeat();const next=clone(_towerBoonChoices);assert.equal(towerBoonState().visits,visits+1);
    openTowerBoonSeat();assert.deepEqual(_towerBoonChoices,next);assert.equal(towerBoonState().visits,visits+1);
    G._wave=2;openTowerBoonSeat();assert.deepEqual(_towerBoonChoices,choices);assert.deepEqual(choices.map(towerBoonChoicePrice),prices);
  });
  check('祝福の座：選択肢を持たない旧セーブでも一度だけ補い、以後の読み直しは固定する',()=>{
    const legacy=SaveRun.buildRunSave('tower');delete legacy.state.player.towerBoons.visitChoices;
    SaveRun.restoreRunState(legacy);openTowerBoonSeat();const added=clone(_towerBoonChoices),count=towerBoonState().visits;
    assert.deepEqual(choices.map(towerBoonChoicePrice),prices);
    SaveRun.restoreRunState(SaveRun.buildRunSave('tower'));openTowerBoonSeat();
    assert.deepEqual(_towerBoonChoices,added);assert.equal(towerBoonState().visits,count);
  });
  const store=_storeRewardStartSnapshot;
  try{
    vm.runInThisContext(source('js/engine/reward.js').match(/^function _storeRewardStartSnapshot\([^\n]*\)\{[\s\S]*?^\}/m)[0]);
    G._isTowerBoon=false;G._isVillageMenu=false;G.phase='reward';G._rewardOnePickMode=true;
    towerBoonState().counts.rerolls=1;towerBoonState().rerolls=2;
    _rewCards=drawRewards();_rewCards.forEach(c=>{c._isOriginalReward=true;});
    assert.equal(towerBoonRerollRewards(),true);
    const cards=clone(_rewCards),state=clone(towerBoonState());
    check('報酬再抽選：更新した並び・消費回数・購入済み祝福が保存復元と元に戻すでも残る',()=>{
      SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));assert.deepEqual(_rewCards,cards);assert.deepEqual(towerBoonState(),state);
      resetRewardToStart();assert.deepEqual(_rewCards,cards);assert.deepEqual(towerBoonState(),state);
    });
  }finally{_storeRewardStartSnapshot=store;}
  for(const policy of Object.keys(boons.SETTINGS)){
    api.resetRun();initState();SaveRun.begin();_giveInitialRandomBoardCards();
    G._wave=1;G._waveStage=_waveRouteForWave(1).indexOf('altar')+1;G._waveLife=3;G.life=3;G.gold=280;
    Object.assign(towerBoonState(),{counts:{stats:1},purchases:1,visitChoices:{1:['stats','damage','mana']}});
    const actions=[];
    await boons.visit(policy,a=>actions.push(a),{policy,color:'',plannerStage:'r1'});
    check(`祝福の購入判断（${policy}）：買えない祝福を避け、未購入の200Gと温存80Gを使う`,()=>{
      const visit=actions.find(a=>a.type==='boon_visit'),buys=actions.filter(a=>a.type==='boon_purchase');
      assert.deepEqual(visit.prices,{stats:500,damage:200,mana:200});assert.equal(visit.nextPrice,200);
      assert.equal(buys.length,1);assert.ok(['damage','mana'].includes(buys[0].id));assert.equal(buys[0].price,200);assert.equal(G.gold,80);
      assert.equal(towerBoonState().counts.stats,1);assert.equal(towerBoonState().purchases,2);
    });
  }
}
if(require.main===module)initialize().then(api=>testTowerBoonVisit(api)).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testTowerBoonVisit};
