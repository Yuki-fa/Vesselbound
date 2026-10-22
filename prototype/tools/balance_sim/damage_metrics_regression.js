'use strict';
const assert=require('node:assert/strict');
require('./load');

function setup(extra={}){
  initState();
  const state=createBattleState({sides:{
    p1:{units:[{id:'ally',atk:4,hp:20,maxHp:20,keywords:[],...extra}]},
    p2:{units:[{id:'enemy',atk:4,hp:10,maxHp:10,keywords:[]}]},
  }});
  G.allies=state.units.p1;G.enemies=state.units.p2;G._simMetrics={dealt:0,taken:0};
  const events=[],emit=ev=>events.push(ev);
  const ally=G.allies[0],enemy=G.enemies[0];
  const hit=(source,target,amount)=>coreApplyDamage(target,amount,emit,{sourceId:source&&source.id});
  return {state,events,emit,ally,enemy,hit};
}

(async()=>{
  await loadGameData();
  let cases=0;
  const check=(name,fn)=>{fn();cases++;};
  check('実損失・オーバーキル・反撃',()=>{
    const h=setup();h.hit(h.ally,h.enemy,4);h.hit(h.ally,h.enemy,40);h.hit(h.enemy,h.ally,3);
    assert.deepEqual(G._simMetrics,{dealt:10,taken:3});
    assert.deepEqual(h.events.filter(e=>e.type==='damage').map(e=>e.amount),[4,40,3],'コアイベントを変更しない');
  });
  check('結界・発生元なし',()=>{
    const h=setup();h.enemy.shield=1;h.hit(h.ally,h.enemy,8);h.hit(null,h.enemy,3);
    assert.deepEqual(G._simMetrics,{dealt:0,taken:0});assert.equal(h.enemy.hp,7);
  });
  check('HP増加・回復後の損失',()=>{
    const h=setup();h.hit(h.enemy,h.ally,5);h.ally.hp+=8;h.ally.maxHp+=8;
    h.hit(h.enemy,h.ally,50);
    assert.deepEqual(G._simMetrics,{dealt:0,taken:28});
  });
  check('復活後の損失',()=>{
    const h=setup({keywords:['復活']});h.hit(h.enemy,h.ally,99);
    assert.equal(coreTryRevive(h.ally,h.state,h.emit),'復活');h.hit(h.enemy,h.ally,99);
    assert.deepEqual(G._simMetrics,{dealt:0,taken:30});
  });
  check('召喚体の攻撃',()=>{
    const h=setup();const child=coreSummonUnit(h.state,'p1',{id:'child',atk:3,hp:5,keywords:[]},h.emit);
    h.hit(child,h.enemy,3);assert.equal(G._simMetrics.dealt,3);
  });
  check('奪った体の攻撃',()=>{
    const h=setup();assert.equal(coreStealUnit(h.state,h.enemy,'p1',h.emit,h.ally.id),true);
    const target=createCoreUnit({id:'new-enemy',atk:1,hp:5},'p2',0);G.enemies.push(target);
    h.hit(h.enemy,target,4);assert.deepEqual(G._simMetrics,{dealt:4,taken:0});
  });
  check('ATKへのダメージ',()=>{
    const def={desc:'攻撃：このキャラクターの攻撃はHPではなくATKにダメージを与える。'}; // 旧セーブも受ける汎用ルールの検査
    assert.ok(def,'ATK攻撃のシート定義');
    const h=setup({desc:def.desc});h.ally._coreAttackContact=true;
    coreResolveHit(h.state,h.ally,h.enemy,4,false,()=>0,h.emit);
    assert.equal(h.events.some(e=>e.type==='damage'&&e.damageTo==='atk'),true);
    assert.equal(G._simMetrics.dealt,0);
  });
  const opening=setup({desc:'開戦：このキャラクターの死亡効果を発動する。\n死亡：全ての敵に7ダメージを与える。'});
  G.phase='player';G._battleCoreEvents=[];initializeBattlePresentationState();
  await _finishNewPanelBattleStartEffects();
  assert.equal(opening.enemy.hp,3,'本番の開戦処理でダメージが入る');
  assert.deepEqual(G._simMetrics,{dealt:7,taken:0},'開戦のHP損失も集計する');cases++;
  console.log(`OK ダメージ集計：${cases}件（開戦・実損失・結界・HP増加・復活・召喚・奪取・ATK）`);
})().catch(e=>{console.error(e);process.exitCode=1;});
