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
    vm.runInNewContext(execFileSync('git',['show','3e67d88:prototype/js/battle/core.js'],{encoding:'utf8'})
      ,{module:oldModule,exports:oldModule.exports,console},{filename:'baseline-core-3e67d88.js'});
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
  check('戦闘力：所持済み・後から得たカードの本体だけ×3、盤面・永続値へ焼き付けず復活の基準も×3',()=>{
    const c=card('C006'),copy=clone(c);G.runLevels.values.stats=3;
    const u=formed(c);assert.equal(u.atk,c.power*3);assert.equal(u.maxHp,c.life*3);
    assert.equal(u._baseAtk,c.power*3);assert.equal(u._baseMaxHp,c.life*3);
    assert.deepEqual(c,copy);assert.equal(_panelCharacterPreviewStats(null,null,c).atk,c.power*3);
    assert.equal(formed(card('C006')).atk,c.power*3);
  });
  fresh();
  check('戦闘修正：固定の正負・0・接続強化・ATK奪取・X・倍率による増加量を×4',()=>{
    G.runLevels.values.modifiers=4;
    const c=card('C006');c.desc='攻撃：このキャラクターは+2/+1を得る。';
    const projected=runLevelBattleCard(c);assert.equal(projected.desc,'攻撃：このキャラクターは+8/+4を得る。');
    const ev=simulate(formed(c)).events.find(e=>e.type==='stat_change'&&e.reason==='attack_self_buff');
    assert.equal(ev.atk,8);assert.equal(ev.hp,4);
    assert.equal(coreBoonText('+0/-1 ATK-2 HP+1 ATKを2奪う',projected.boon),'+0/-4 ATK-8 HP+4 ATKを8奪う');
    assert.equal(coreBoonDynamicValue(projected,projected.desc,3,'mod'),12);
    const roar=card('C006');roar.desc='開戦：このキャラクターのATKを2倍にする。';
    const change=simulate(formed(roar)).events.find(e=>e.type==='stat_change'&&e.reason==='roar');assert.equal(change.atk,roar.power*4);
    const enchant=card('E001');enchant.adjacentAtkBonus=2;enchant.adjacentHpBonus=-1;
    const e=runLevelBattleCard(enchant);assert.equal(e.adjacentAtkBonus,8);assert.equal(e.adjacentHpBonus,-4);
  });
  fresh();
  check('効果威力：固定4→12・マナX→3X、マナ量・通常攻撃・敵は据え置き',()=>{
    G.runLevels.values.damage=3;
    const u=formed(card('C043')),result=simulate(u),hit=result.events.find(e=>e.type==='damage'&&e.sourceId===u.id&&e.damageKind==='attack_effect');
    assert.equal(hit.amount,12);assert.equal(u.atk,card('C043').power);
    const caster=formed(card('C019')),dynamic=simulate(caster,{resources:{p1:{mana:4}}});
    assert.equal(dynamic.events.find(e=>e.type==='damage'&&e.sourceId===caster.id&&e.damageKind==='attack_effect').amount,12);
    const mana=formed(card('C064'));assert.equal(simulate(mana).events.find(e=>e.type==='mana_gain').amount,1);
    assert.equal(result.state.units.p2[0].atk,1);
  });
  fresh();
  check('眷属：通常出撃を変えず召喚体の基礎だけ×5、召喚された体の効果にも陣営のレベルが効く',()=>{
    const raw=card('C045'),base=simulate(formed(raw)).events.filter(e=>e.type==='summon');
    G.runLevels.values.familiars=5;
    const u=formed(raw),result=simulate(u).events.filter(e=>e.type==='summon');
    assert.equal(u.atk,raw.power);assert.equal(result.length,base.length);assert.ok(result.length);
    result.forEach((e,i)=>{assert.equal(e.unit.atk,base[i].unit.atk*5);assert.equal(e.unit.hp,base[i].unit.hp*5);});
    G.runLevels.values.damage=3;
    const state=createBattleState({sides:{p1:{units:[formed(raw)]},p2:{units:[]}},...runLevelCoreFields(),summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
    const child=coreSummonUnit(state,'p1',{name:'アラッサス'},()=>{},state.units.p1[0].id);
    assert.match(child.desc,/12ダメージ/);assert.equal(child.atk,card('C043').power*5);
    assert.equal(child.boon.dmgMul,3);
    const copy=coreSummonUnit(state,'p1',{name:'コピー検査',atk:2,hp:3,_baseAtk:2,_baseMaxHp:3},()=>{},null,false);
    assert.equal(copy._baseAtk,10);assert.equal(copy._baseMaxHp,15);
    const revived=coreSummonUnit(state,'p1',{name:'呼び戻し検査',atk:2,hp:3,_baseAtk:4,_baseMaxHp:6,
      _revivedFromDead:true,_summonBoon:{...CORE_BOON_FIELDS,famMul:5}},()=>{});
    assert.equal(revived.atk,2);assert.equal(revived.hp,3);assert.equal(revived._baseAtk,4);
  });
  fresh();
  check('旧祝福とレベル：固定値・X・眷属・本体倍率を合成し、繰り返し表示でも二重適用しない',()=>{
    const c=card('C006');c.desc='攻撃：このキャラクターは+2/+1を得る。';
    coreApplyCardBoon(c,{statMul:3,modDelta:1,dmgMul:3,manaDelta:0,famMul:3});
    c.keywords.push('復活');c.manaOnAttack=2; // 旧祝福を付けた後のアイテム等の変更。
    const original=clone(c);G.runLevels.values={stats:2,familiars:2,modifiers:2,damage:2};
    const p=runLevelBattleCard(c);assert.equal(p.power,original.power*2);assert.match(p.desc,/\+6\/\+4/);
    assert.equal(p.boon.famMul,6);assert.equal(p.boon.dmgMul,6);
    assert.equal(coreBoonDynamicValue(p,p.desc,2,'mod'),6);assert.equal(runLevelBattleCard(p),p);assert.deepEqual(c,original);
    assert.ok(p.keywords.includes('復活'));assert.equal(p.manaOnAttack,2);
  });
  fresh();
  check('永久値：E075の減衰・永久能力値は一時倍率を外して保存し、次戦で二重に掛けない',()=>{
    G.runLevels.values={stats:3,familiars:1,modifiers:1,damage:3};
    const hero=card('C006'),enchant=card('E075');hero.directions=['left'];enchant.directions=['right'];
    G.mainBoard.fill(null);G.mainBoard[1]=hero;G.mainBoard[0]=enchant;
    const u=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
    const ev=simulate(u).events.find(e=>e.type==='keyword_effect'&&e.effect==='effect_value');
    assert.ok(ev);assert.equal(ev.damage,33);assert.equal(ev.baseDamage,11);
    assert.equal(_persistPermanentEffectDamageOrWarn(_getPartyBoardUnit(),ev),true);
    assert.equal(enchant._permanentEffectDamage,11);assert.equal(corePermanentDamageValue(runLevelBattleCard(enchant)),33);
    assert.equal(_persistPermanentStatOrWarn(_getPartyBoardUnit(),{boardSlot:1,atk:3,hp:6}),true);
    const next=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
    assert.equal(next.atk,u.atk+3);assert.equal(next.maxHp,u.maxHp+6);
  });
  fresh();
  check('オンライン：ランに高レベルがあっても入力・表示・payloadのレベルはすべて1、形を増やさない',()=>{
    const c=card('C006'),base=clone(formed(c));
    G.runLevels.values={stats:9,familiars:9,modifiers:9,damage:9};G._onlineMode=true;
    assert.deepEqual(runLevelBattleValues(),ones);assert.equal(runLevelBattleCard(c),c);assert.deepEqual(runLevelCoreFields(),{});
    const u=formed(c);u.id=base.id;assert.deepEqual(clone(u),base);assert.equal('_runLevelsApplied' in u,false);
  });
  fresh();
  check('候補：St1は+1の4つ、St2から+2の4つ追加、連続を除外・重み0.4^n',()=>{
    assert.equal(runLevelCandidates(1).length,4);assert.equal(runLevelCandidates(2).length,8);
    G.runLevels.counts={'stats:1':1,'damage:1':2,'familiars:2':3};G.runLevels.previous='modifiers:1';
    const c=runLevelCandidates(2),weight=id=>c.find(x=>x.id===id).weight;
    assert.equal(c.length,7);assert.equal(c.some(x=>x.id==='modifiers:1'),false);
    assert.equal(weight('stats:1'),.4);assert.ok(Math.abs(weight('damage:1')-.16)<1e-12);assert.ok(Math.abs(weight('familiars:2')-.064)<1e-12);
  });
  check('重み付き抽選：表示用の重みだけでなく、実際の抽選境界も0.4^nで変わる',()=>{
    const saved=rand;
    try{
      for(const [count,point] of [[1,.2],[2,.1]]){
        rand=saved;fresh();G.runLevels.counts={'stats:1':count};G.runLevels.previous='modifiers:1';
        rand=()=>point;
        assert.equal(runLevelRollReward(1,ones).id,'familiars:1');
      }
    }finally{rand=saved;}
  });
  fresh();
  check('+2の−1：上昇対象を除く2以上だけから選び、候補なしは下げず、最低1',()=>{
    const saved=rand;
    try{
      for(const kind of Object.keys(ones)){
        rand=saved;fresh();const idx=4+Object.keys(ones).indexOf(kind);rand=()=> (idx+.01)/8;
        const before={stats:1,familiars:3,modifiers:2,damage:1};
        const r=runLevelRollReward(2,before);
        assert.equal(r.kind,kind);assert.equal(r.amount,2);assert.equal(r.after[kind],before[kind]+2);
        assert.notEqual(r.lowered,kind);assert.ok(before[r.lowered]>=2);assert.equal(r.after[r.lowered],before[r.lowered]-1);
        assert.ok(Object.values(r.after).every(n=>n>=1));
        rand=saved;fresh();rand=()=> (idx+.01)/8;const r2=runLevelRollReward(2,ones);assert.equal(r2.lowered,null);
      }
    }finally{rand=saved;}
  });
  fresh();
  check('報酬の提示回数・連続禁止・seed：150回、保存から次の抽選まで同一',()=>{
    let prev=null;
    for(let i=0;i<150;i++){const r=runLevelRollReward(i%2+1,G.runLevels.values);assert.notEqual(r.id,prev);prev=r.id;}
    assert.equal(Object.values(G.runLevels.counts).reduce((a,b)=>a+b,0),150);
    const save=SaveRun.buildRunSave('reward');SaveRun.validate(save);
    const expected=clone(runLevelRollReward(2,G.runLevels.values)),rng=G._runRngState;
    SaveRun.restoreRunState(save);assert.deepEqual(runLevelRollReward(2,G.runLevels.values),expected);assert.equal(G._runRngState,rng);
    const legacy=clone(save);delete legacy.state.player.runLevels;SaveRun.restoreRunState(legacy);assert.deepEqual(G.runLevels,runLevelInitialState());
  });
  fresh();
  check('レベル再抽選：権利1、元の上昇・下降を取り消して別候補、カード枠・ゴールドは変えない',()=>{
    G._wave=2;G.runLevels.values={stats:2,familiars:3,modifiers:2,damage:2};
    const before=clone(G.runLevels.values),random=rand;let r;
    try{rand=()=>.52;r=runLevelRollReward(2,before);}finally{rand=random;}
    assert.equal(r.amount,2);assert.ok(r.lowered);
    const money=G.gold;
    towerBoonState().rerolls=1;_rewCards=[card('C006')];const cards=clone(_rewCards);
    assert.equal(runLevelRerollReward(),true);assert.notEqual(G.runLevels.reward.id,r.id);
    assert.deepEqual(G.runLevels.reward.before,before);assert.equal(towerBoonState().rerolls,0);assert.equal(G.gold,money);assert.deepEqual(_rewCards,cards);
    assert.equal(G.runLevels.seq,2);assert.equal(Object.values(G.runLevels.counts).reduce((a,b)=>a+b,0),2);
    const values=clone(G.runLevels.values);assert.equal(runLevelRerollReward(),false);assert.deepEqual(G.runLevels.values,values);
    const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);assert.deepEqual(G.runLevels.values,values);assert.equal(towerBoonState().rerolls,0);
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
    fresh();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('boss')+1;G._waveBattleType='boss';G.phase=null;
    finishWaveBattleVictory(false);assert.ok(runLevelRewardActive());_startWaveFlowNext();await api.drain();
    check('勝利入口：ボス後はレベル報酬から塔へ、祝福の座は全ステージ・全周回で出ない',()=>{
      assert.equal(G._isVillageMenu,true);assert.equal(G._isWaveAltar,true);
      for(const wave of [1,2,3,4,5])for(const cycle of [1,2]){G._wave=wave;G._debugStoryCycle=cycle;assert.equal(villageFacilityList().some(f=>f.key==='towerBoon'),false);}
      const money=G.gold;assert.equal(towerBoonChoose('stats'),false);assert.equal(G.gold,money);
    });
  }finally{_storeRewardStartSnapshot=store;}
  console.log('レベル1018c：完了（ブラウザの見た目は未確認）');
}
if(require.main===module)initialize().then(testRunLevels).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testRunLevels};
