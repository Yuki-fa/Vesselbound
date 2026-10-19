#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {initialize}=require('./run_bot'),{source}=require('./bot_runtime');

async function testRunLevels(api,check=(name,fn)=>{fn();console.log('OK '+name);}){
  const ones=coreNormalizeRunLevels();
  const fresh=()=>{
    api.resetRun();initState();SaveRun.begin();
    Object.assign(G,{_wave:1,_waveStage:4,_waveLife:3,life:3,gold:800,phase:'reward'});
    _dragSrc=null;_rewCards=[];_rewFreePickDone=false;
    G.mainBoard[1]=makePanel(PANEL_POOL.find(c=>c.no==='C006').id);
  };
  const card=no=>makePanel(PANEL_POOL.find(c=>c.no===no).id);
  const formed=c=>{G.mainBoard.fill(null);G.mainBoard[1]=c;return buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;};
  const simulate=(unit,extra={})=>{
    const state=createBattleState({frontSlots:7,summonDefs:[...PANEL_POOL,...ENEMY_POOL],stageNumber:2,
      ...runLevelCoreFields(),sides:{p1:{units:[unit]},p2:{units:[{id:'dummy',name:'検査相手',atk:1,hp:100000,maxHp:100000}]}},...extra});
    const events=[];runBattleCore(state,createSeededRng(1018),{turnLimit:2,onEvent:e=>events.push(e)});
    return {events,state};
  };
  fresh();
  check('レベル1：参照・本文・カードの形・乱数を変えず、旧コアの80編成と全イベント・結果が一致',()=>{
    const oldModule={exports:{}};
    vm.runInNewContext(execFileSync('git',['show','647d175:prototype/js/battle/core.js'],{encoding:'utf8'})
      ,{module:oldModule,exports:oldModule.exports,console},{filename:'baseline-core-647d175.js'});
    const old=oldModule.exports,defs=PANEL_POOL.filter(c=>c.category==='キャラクター'&&c._implemented!==false);
    const rng=G._runRngState;
    for(let i=0;i<80;i++){
      const c=clone(defs[i%defs.length]);assert.equal(coreApplyCardRunLevels(c,ones),c);
      const u=formed(c),setup={sides:{p1:{units:[u]},p2:{units:[{id:'enemy',name:'相手',atk:7,hp:150,desc:i%2?'攻撃：このキャラクターは+2/+1を得る。':''}]}},summonDefs:[...PANEL_POOL,...ENEMY_POOL],stageNumber:2};
      const play=core=>{const state=core.createBattleState(clone(setup)),events=[];state._coreStateToken="level-1-regression";const result=core.runBattleCore(state,createSeededRng(i+1),{turnLimit:12,onEvent:e=>events.push(e)});return JSON.stringify({result,events,state},(key,value)=>key==='_lastDamageSource'?undefined:value);};
      assert.ok(play({createBattleState,runBattleCore,createSeededRng})===play(old),c.name);
    }
    assert.equal(G._runRngState,rng);
  });
  fresh();
  check('ATK・HP：別々の倍率をカード本体と復活の基礎へ適用し、強化前に確定・保存値は不変',()=>{
    for(const values of [{atk:3,hp:5},{atk:5,hp:2}]){
      G.runLevels.values=values;
      const c=card('C006'),raw=clone(c),u=formed(c);
      assert.equal(u.atk,c.power*values.atk);assert.equal(u.maxHp,c.life*values.hp);
      assert.equal(u._baseAtk,u.atk);assert.equal(u._baseMaxHp,u.maxHp);
      assert.deepEqual(c,raw);assert.equal(_panelCharacterPreviewStats(null,null,c).atk,u.atk);
      assert.equal(formed(card('C006')).atk,u.atk);
      assert.equal(coreApplyUnitRunLevels(u,values),u);
    }
    assert.deepEqual(Object.keys(runLevelInitialState().values),['atk','hp']);
    assert.deepEqual(coreNormalizeRunLevels({stats:7,familiars:9,modifiers:8,damage:6}),{atk:7,hp:7});
  });
  fresh();
  check('本文：固定の正負・0・接続強化・ATK奪取・X・倍率・効果ダメージ・マナ・回数は変わらない',()=>{
    G.runLevels.values={atk:3,hp:5};
    const c=card('C006');c.desc='攻撃：このキャラクターは+2/+1を得る。';
    const projected=runLevelBattleCard(c);assert.equal(projected.desc,c.desc);assert.equal(projected.boon,undefined);
    const ev=simulate(formed(c)).events.find(e=>e.type==='stat_change'&&e.reason==='attack_self_buff');
    assert.equal(ev.atk,2);assert.equal(ev.hp,1);
    assert.equal(coreBoonDynamicValue(projected,projected.desc,3,'mod'),3);
    assert.equal(coreBoonText('+0/-1 ATK-2 HP+1 ATKを2奪う',projected.boon),'+0/-1 ATK-2 HP+1 ATKを2奪う');
    const roar=card('C006');roar.desc='開戦：このキャラクターのATKを2倍にする。';
    const doubled=simulate(formed(roar)).events.find(e=>e.type==='stat_change'&&e.reason==='roar');
    assert.equal(doubled.atk,roar.power*3,'効果の2倍は維持し、増加量へ別のレベルを掛けない');
    const enchant=card('E001');enchant.adjacentAtkBonus=2;enchant.adjacentHpBonus=-1;
    assert.equal(runLevelBattleCard(enchant),enchant);
    const u=formed(card('C043')),result=simulate(u);
    assert.equal(result.events.find(e=>e.type==='damage'&&e.sourceId===u.id&&e.damageKind==='attack_effect').amount,4);
    const caster=formed(card('C019')),dynamic=simulate(caster,{resources:{p1:{mana:4}}});
    assert.equal(dynamic.events.find(e=>e.type==='damage'&&e.sourceId===caster.id&&e.damageKind==='attack_effect').amount,4);
    const mana=formed(card('C064'));assert.equal(simulate(mana).events.find(e=>e.type==='mana_gain').amount,1);
    assert.equal(result.state.units.p2[0].atk,1);
  });
  fresh();
  check('眷属：通常出撃だけを強化、召喚の基礎・効果・固定コピー・呼び戻しは不変',()=>{
    const raw=card('C045'),base=simulate(formed(raw)).events.filter(e=>e.type==='summon');
    G.runLevels.values={atk:3,hp:5};
    const u=formed(raw),result=simulate(u).events.filter(e=>e.type==='summon');
    assert.equal(u.atk,raw.power*3);assert.equal(result.length,base.length);assert.ok(result.length);
    result.forEach((e,i)=>{assert.equal(e.unit.atk,base[i].unit.atk);assert.equal(e.unit.hp,base[i].unit.hp);assert.equal(e.unit.desc,base[i].unit.desc);});
    const state=createBattleState({sides:{p1:{units:[u]},p2:{units:[]}},...runLevelCoreFields(),summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
    const child=coreSummonUnit(state,'p1',{name:'アラッサス'},()=>{},u.id);
    assert.match(child.desc,/4ダメージ/);assert.equal(child.atk,card('C043').power);assert.equal(child.boon,undefined);
    assert.equal(coreApplyUnitRunLevels(child,G.runLevels.values),child);
    const copy=coreSummonUnit(state,'p1',{name:'コピー検査',atk:2,hp:3,_baseAtk:2,_baseMaxHp:3},()=>{},null,false);
    assert.equal(copy.atk,2);assert.equal(copy.hp,3);assert.equal(copy._baseAtk,2);assert.equal(copy._baseMaxHp,3);
    const revived=coreSummonUnit(state,'p1',{name:'呼び戻し検査',atk:2,hp:3,_baseAtk:4,_baseMaxHp:6,_revivedFromDead:true},()=>{},null,false);
    assert.equal(revived.atk,2);assert.equal(revived.hp,3);assert.equal(revived._baseAtk,4);
  });
  fresh();
  check('旧祝福：本体へATK・HPだけを追加適用し、旧本文・動的値・眷属祝福・後からの変更を保持',()=>{
    const c=card('C006');c.desc='攻撃：このキャラクターは+2/+1を得る。';
    coreApplyCardBoon(c,{statMul:3,modDelta:1,dmgMul:3,manaDelta:0,famMul:3});
    c.keywords.push('復活');c.manaOnAttack=2;
    const original=clone(c);G.runLevels.values={atk:2,hp:5};
    const p=runLevelBattleCard(c);assert.equal(p.power,original.power*2);assert.equal(p.life,original.life*5);
    assert.equal(p.desc,original.desc);assert.deepEqual(p.boon,original.boon);
    assert.equal(coreBoonDynamicValue(p,p.desc,2,'mod'),3);assert.equal(runLevelBattleCard(p),p);assert.deepEqual(c,original);
    assert.ok(p.keywords.includes('復活'));assert.equal(p.manaOnAttack,2);
    assert.deepEqual(coreApplySummonBoon({atk:2,hp:3},p.boon),{atk:6,hp:9,maxHp:9});
  });
  fresh();
  check('永久値：E075の減衰はそのまま保存、永久能力値はATK・HPの別倍率を外して保存',()=>{
    G.runLevels.values={atk:3,hp:5};
    const hero=card('C006'),enchant=card('E075');hero.directions=['left'];enchant.directions=['right'];
    G.mainBoard.fill(null);G.mainBoard[1]=hero;G.mainBoard[0]=enchant;
    const u=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
    const ev=simulate(u).events.find(e=>e.type==='keyword_effect'&&e.effect==='effect_value');
    assert.ok(ev);assert.equal(ev.damage,11);assert.equal(ev.baseDamage,undefined);
    assert.equal(_persistPermanentEffectDamageOrWarn(_getPartyBoardUnit(),ev),true);
    assert.equal(enchant._permanentEffectDamage,11);assert.equal(corePermanentDamageValue(runLevelBattleCard(enchant)),11);
    assert.equal(_persistPermanentStatOrWarn(_getPartyBoardUnit(),{boardSlot:1,atk:3,hp:10}),true);
    const next=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
    assert.equal(next.atk,u.atk+3);assert.equal(next.maxHp,u.maxHp+10);
  });
  fresh();
  check('オンライン：ランに高レベルがあっても入力・表示・payloadはレベル1、形を増やさない',()=>{
    const c=card('C006'),base=clone(formed(c));
    G.runLevels.values={atk:9,hp:7};G._onlineMode=true;
    assert.deepEqual(runLevelBattleValues(),ones);assert.equal(runLevelBattleCard(c),c);assert.deepEqual(runLevelCoreFields(),{});
    const u=formed(c);u.id=base.id;assert.deepEqual(clone(u),base);assert.equal('_runLevelsApplied' in u,false);
    assert.equal('runLevels' in buildOnlineSelfFormation(),false);
  });
  fresh();
  check('固定4候補：確率の全境界・全ステージ・連続同結果・過去回数で変わらない',()=>{
    const random=rand;
    try{
      for(const stage of [1,2,5])for(const [point,id] of [[0,'atk3'],[.14999,'atk3'],[.15,'hp3'],[.39999,'hp3'],[.4,'atk2-hp1'],[.74999,'atk2-hp1'],[.75,'atk1-hp2'],[.99999,'atk1-hp2']]){
        rand=()=>point;
        for(let n=0;n<3;n++){
          const r=runLevelRollReward(stage,ones),spec=RUN_LEVEL_CONFIG.rewards.find(c=>c.id===id);
          assert.equal(r.id,id);assert.deepEqual(r.gains,spec.gains);
          assert.deepEqual(r.after,{atk:1+spec.gains.atk,hp:1+spec.gains.hp});
          assert.equal('lowered' in r,false);
        }
      }
    }finally{rand=random;}
  });
  fresh();
  check('固定確率：本体ラン乱数で50000回、15/25/35/25%へ収束・各回の合計増分は3',()=>{
    const counts=Object.fromEntries(RUN_LEVEL_CONFIG.rewards.map(c=>[c.id,0])),samples=50000;
    for(let i=0;i<samples;i++){
      const r=runLevelRollReward(i%5+1,G.runLevels.values);counts[r.id]++;
      assert.equal(r.after.atk+r.after.hp-r.before.atk-r.before.hp,3);
    }
    for(const c of RUN_LEVEL_CONFIG.rewards)assert.ok(Math.abs(counts[c.id]/samples-c.probability)<.007,JSON.stringify(counts));
    console.log('実測確率 '+JSON.stringify(Object.fromEntries(Object.entries(counts).map(([k,n])=>[k,n/samples]))));
  });
  fresh();
  check('保存復元：表示中の結果・次回抽選・乱数は同じ、未収録セーブは初期値、旧4レベルは戦闘力だけ移行',()=>{
    runLevelRollReward(1,G.runLevels.values);
    const current=clone(G.runLevels),save=SaveRun.buildRunSave('reward');SaveRun.validate(save);
    const expected=clone(runLevelRollReward(2,G.runLevels.values)),rng=G._runRngState;
    SaveRun.restoreRunState(save);assert.deepEqual(G.runLevels,current);
    assert.deepEqual(runLevelRollReward(2,G.runLevels.values),expected);assert.equal(G._runRngState,rng);
    const missing=clone(save);delete missing.state.player.runLevels;SaveRun.restoreRunState(missing);assert.deepEqual(G.runLevels,runLevelInitialState());
    for(const stats of [1,7]){
      const legacy=clone(save);legacy.state.player.runLevels={values:{stats,familiars:99,modifiers:55,damage:33},counts:{'stats:1':4},previous:'stats:1',seq:5,lastBattleKey:'1:4:0:elite',
        reward:{kind:'stats',amount:1,before:{stats:stats-1},after:{stats},active:true}};
      SaveRun.restoreRunState(legacy);assert.deepEqual(G.runLevels.values,{atk:stats,hp:stats});
      assert.equal('counts' in G.runLevels,false);assert.equal('previous' in G.runLevels,false);
      assert.equal(G.runLevels.reward.received,true);assert.equal(runLevelRewardActive(),true);
      const migrated=clone(G.runLevels);SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));assert.deepEqual(G.runLevels,migrated);
    }
  });
  fresh();
  check('レベル報酬：権利・所持金があってもボタン非表示、再抽選不能・資源不変',()=>{
    runLevelRollReward(2,G.runLevels.values);towerBoonState().rerolls=3;
    const levels=clone(G.runLevels),money=G.gold;
    assert.equal(typeof runLevelRerollReward,'undefined');assert.equal(typeof runLevelCanReroll,'undefined');
    assert.equal(towerBoonRerollButtonState().visible,false);assert.equal(towerBoonCanReroll(),false);
    assert.equal(towerBoonRerollCurrent(),false);assert.equal(towerBoonRerollRewards(),false);
    assert.equal(towerBoonState().rerolls,3);assert.equal(G.gold,money);assert.deepEqual(G.runLevels,levels);
  });
  const store=_storeRewardStartSnapshot;
  try{
    vm.runInThisContext(source('js/engine/reward.js').match(/^function _storeRewardStartSnapshot\([^\n]*\)\{[\s\S]*?^\}/m)[0]);
    fresh();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('elite')+1;G._waveBattleType='elite';G.phase=null;
    const cleanup=_cleanupBattleEndTransientUnits;let cleanupLevels;
    try{
      _cleanupBattleEndTransientUnits=()=>{cleanupLevels=clone(runLevelBattleValues());return cleanup();};
      assert.equal(finishWaveBattleVictory(false),true);
    }finally{_cleanupBattleEndTransientUnits=cleanup;}
    assert.deepEqual(cleanupLevels,ones,'戦闘の書き戻し後に今回のレベル報酬を適用する');
    check('勝利入口：エリート後は報酬表示・多重付与なし、保存復元して街へ進む',()=>{
      assert.equal(runLevelRewardActive(),true);assert.equal(G.phase,'reward');assert.equal(G.runLevels.seq,1);
      assert.equal(finishWaveBattleVictory(false),true);assert.equal(G.runLevels.seq,1);
      const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);assert.equal(runLevelRewardActive(),true);
      assert.equal(_startWaveFlowNext(),true);
    });
    await api.drain();assert.equal(G._isVillageMenu,true);assert.equal(G._isWaveAltar,false);assert.equal(runLevelRewardActive(),false);
    fresh();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('elite')+1;G._waveBattleType='elite';G.phase=null;
    finishWaveBattleVictory(false);
    const legacy=SaveRun.buildRunSave('reward'),battleKey=G.runLevels.lastBattleKey;
    legacy.state.player.runLevels={values:{stats:4,familiars:9,modifiers:8,damage:7},counts:{},previous:'stats:1',seq:6,
      lastBattleKey:battleKey,reward:{kind:'stats',amount:1,before:{stats:3},after:{stats:4},active:true}};
    SaveRun.restoreRunState(legacy);
    const migrated=clone(G.runLevels.values),seq=G.runLevels.seq;
    _startWaveFlowNext();await api.drain();
    check('旧表示中報酬：受け取り済みとして街へ進み、移行値へ再加算しない・勝利後処理を飛ばさない',()=>{
      assert.deepEqual(G.runLevels.values,migrated);assert.deepEqual(migrated,{atk:4,hp:4});
      assert.equal(G.runLevels.seq,seq);assert.equal(runLevelRewardActive(),false);assert.equal(G._isVillageMenu,true);
    });
    fresh();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('boss')+1;G._waveBattleType='boss';G.phase=null;
    finishWaveBattleVictory(false);assert.ok(runLevelRewardActive());_startWaveFlowNext();await api.drain();
    check('勝利入口：ボス後はレベル報酬から塔へ、祝福の座は全ステージ・全周回で出ない',()=>{
      assert.equal(G._isVillageMenu,true);assert.equal(G._isWaveAltar,true);
      for(const wave of [1,2,3,4,5])for(const cycle of [1,2]){G._wave=wave;G._debugStoryCycle=cycle;assert.equal(villageFacilityList().some(f=>f.key==='towerBoon'),false);}
      const money=G.gold;assert.equal(towerBoonChoose('stats'),false);assert.equal(G.gold,money);
    });
  }finally{_storeRewardStartSnapshot=store;}
  check('最終決戦の2連戦（エピトメ戦・ラスボス戦）ではレベル報酬を出さない（2026-10-19）',()=>{
    for(const stage of [4,5]){
      fresh();G._wave=5;G._waveStage=stage;G._waveBattleType='boss';G.phase=null;
      const before=clone(G.runLevels);
      assert.equal(runLevelOpenVictoryReward('boss',false),false,'stage'+stage);
      assert.deepEqual(G.runLevels,before);
    }
  });
  console.log('レベル1018c：完了（ブラウザの見た目は未確認）');
}
if(require.main===module)initialize().then(testRunLevels).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testRunLevels};
