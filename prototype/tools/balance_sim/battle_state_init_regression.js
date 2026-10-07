'use strict';
const assert=require('node:assert/strict');
require('./load');

(async()=>{
  await loadGameData();
  const walker=PANEL_POOL.find(c=>c.name==='ヴォイド・ウォーカー');
  assert.ok(walker,'紫修正のシート定義');
  for(const stage of [1,3,5]){
    initState();G._wave=stage;G._waveLife=17;G.gold=81;G.mana=13;
    const make=(id,slot,def={})=>createCoreUnit({...def,id,atk:3,hp:19,maxHp:19,
      color:'紫',keywords:[...(def.keywords||[])]},'p1',slot);
    G.allies=[null,make('walker',1,walker),null,make('purple',3)];
    G.enemies=[createCoreUnit({id:'foe',atk:2,hp:23},'p2',0)];
    G.activeBattleItems=[{name:'入力参照の確認'}];
    const allies=G.allies,enemies=G.enemies,ids=allies.filter(Boolean).map(u=>u.id);
    const live=_createPveCoreState();
    assert.equal(live.units.p1,allies,'PvEの味方配列を複製しない');
    assert.equal(live.units.p2,enemies,'PvEの敵配列を複製しない');
    assert.equal(live.units.p1[3],allies[3],'ユニットの参照共有');
    assert.equal(live.items.p1,G.activeBattleItems,'アイテムの参照共有');
    assert.deepEqual(live.resources.p1,{mana:13,gold:81});
    assert.equal(live.life.p1,17);assert.equal(live.stageNumber,stage);
    assert.equal(live.units.p1[3]._voidWalkerBonus,1,'紫修正の初期化');
    assert.deepEqual(allies.filter(Boolean).map(u=>u.id),ids,'並び・IDを維持');
    const online=createBattleState({stageNumber:stage,sides:{p1:{units:allies},p2:{units:enemies}},
      resources:live.resources,items:live.items});
    assert.notEqual(online.units.p1,allies,'オンラインでは入力を複製');
    assert.notEqual(online.units.p1[1],allies[3],'オンラインのユニットを複製');
    assert.deepEqual(online.units.p1.map(u=>[u.id,u.slot]),[['walker',1],['purple',3]],'空欄を除いても元スロットを維持');
    assert.equal(online.units.p1[1]._voidWalkerBonus,1,'オンラインも紫修正を初期化');
    for(const state of [live,online]){
      assert.equal(state.turn,0);assert.deepEqual(state.deadUnits,[]);
      for(const side of ['p1','p2']){
        assert.equal(state.lane[side].lane,'front');assert.ok(state.lane[side].attacked instanceof Set);
        assert.equal(state.lane[side].attacked.size,0);
      }
    }
    assert.notEqual(live.lane.p1.attacked,online.lane.p1.attacked,'戦闘間でSetを共有しない');
    const count={p1:2,p2:1},buff={p1:{atk:3,hp:4}};
    _keepPveSummonState({_summonCount:count,_summonBuff:buff});
    const continued=_createPveCoreState();
    assert.equal(continued._summonCount,count);assert.equal(continued._summonBuff,buff);
    assert.equal(_createPveCoreState()._summonCount,undefined,'開戦の眷属累計は一度だけ渡す');
  }
  console.log('OK 共通状態初期化：3ステージ（参照・並び・ID・資源・紫修正・眷属引き継ぎ）');
})().catch(e=>{console.error(e);process.exitCode=1;});
