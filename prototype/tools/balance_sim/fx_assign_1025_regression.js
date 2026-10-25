'use strict';
// 既存定義への割り当てだけを検査。コアの実体イベント→共通presenter→描画境界を通す。
const assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const h=require('./presentation_1020b_harness');
let failed=0,passed=0;
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
const kw=global.playKeywordEffectVfxSustained;
global.playKeywordEffectVfxSustained=(unit,side,keyword)=>{
  h.calls.push({name:'keyword:'+keyword,unit:unit.id,key:getKeywordAssetKey(keyword),side});return true;
};
const cases=[
  {no:'C011',label:'負傷',fx:'scylla',targets:2,fire:x=>coreApplyInjuryEffects(x.find('owner'),1,x.state,x.rng,x.emit,x.hit,x.find('foe0'))},
  {no:'C011',label:'死亡',fx:'scylla',targets:2,fire:x=>{x.find('owner').hp=0;coreApplyDeathEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);}},
  {no:'EN060',fx:'scylla',targets:2,fire:x=>coreApplyOpeningEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit)},
  // 2026-10-25 利用者指摘：毒緑と紫の波（旧 echidna-wave）はバンシーの死亡（全ての敵に毒と弱体）。
  {no:'C034',label:'死亡',fx:'banshee-miasma',targets:2,fire:x=>{x.find('owner').hp=0;coreApplyDeathEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);}},
  {no:'C020',fx:'S009',targets:1,support:'C017',fire:x=>coreApplyInjuryEffects(x.find('support'),1,x.state,x.rng,x.emit,x.hit,x.find('foe0'))},
  {no:'C047',fx:'S009',targets:1,fire:summon},
  {no:'C070',fx:'S009',targets:1,fire:x=>coreEmitAilment(x.state,x.emit,{type:'keyword_effect',side:x.find('foe0').side,unitId:'foe0',sourceId:'owner',effect:'poison',amount:1})},
  {no:'E005',fx:'S009',targets:1,fire:x=>{const dead=x.find('foe0');dead.hp=0;dead._lastDamageSource=x.find('owner');coreApplyDeathEffects(dead,x.state,x.rng,x.emit,x.hit);}},
  {no:'C092',fx:'S009',targets:1,support:'C104',fire:x=>coreApplyAttackEffects(x.find('support'),x.state,x.rng,x.emit,x.hit)},
  {no:'E027',fx:'keyword:即死',targets:1,fire:x=>{x.rng.next=()=>0;x.hit(x.find('owner'),x.find('foe0'),1);}},
  {no:'E028',fx:'leprechaun',targets:1,fire:x=>coreTriggerBattleEnd(x.state,x.emit,x.rng,x.hit)},
  // 現行コアが実体を出さない4種も、将来の実体イベントで選ぶ割り当てを契約として検査する。
  {no:'E023',fx:'S009',targets:1,contract:true,fire:x=>x.emit({type:'stat_change',side:x.find('owner').side,unitId:'owner',sourceId:'owner',atk:4,hp:4,reason:'summon_observer_stats'})},
  {no:'E044',fx:'S005',targets:1,contract:true,fire:x=>x.emit({type:'stat_change',side:x.find('owner').side,unitId:'owner',sourceId:'owner',atk:2,hp:2,reason:'hell_knight_blood'})},
  {no:'E015',fx:'keyword:毒牙',targets:2,count:2,contract:true,fire:x=>{
    x.emit({type:'effect_flash',side:x.find('owner').side,unitId:'owner',trigger:'death'});
    for(const id of ['foe0','foe1'])x.emit({type:'keyword_effect',side:x.find(id).side,unitId:id,sourceId:'owner',effect:'poison',amount:2});
  }},
  {no:'E016',fx:'dragonnet',targets:1,contract:true,fire:x=>{
    x.emit({type:'transform',side:x.find('owner').side,unitId:'owner',sourceId:'owner',from:'owner',unit:h.clone(x.find('owner'))});
  }},
];
function summon(x){coreSummonUnit(x.state,x.find('owner').side,{name:'child',atk:1,hp:2,maxHp:2},x.emit,'owner',undefined,x.rng,x.hit);}
function setup(c,side){
  let owner=/^E\d/.test(c.no)?h.enchantUnit('owner',c.no):h.unit('owner',c.no);
  if(c.no.startsWith('EN')){const row=h.sheetRows('enemy').find(r=>r['No.']===c.no);owner=h.unit('owner',null,{no:c.no,artCode:c.no,name:row['名前'],desc:row['効果']});}
  return h.setup({sides:{[side]:{units:[owner,...c.support?[h.unit('support',c.support)]:[]]},
    [side==='p1'?'p2':'p1']:{units:[h.unit('foe0'),h.unit('foe1')]}}});
}
async function play(x,mode){
  if(mode==='online')await x.online();
  else{if(mode==='saved'){
    const pending={events:h.clone(x.events),frames:[{from:0,to:x.events.length}]};
    const restored=SaveRun.unpackBattleEvents(h.clone(SaveRun.packBattleEvents(pending)));
    assert.deepEqual(restored.events,h.clone(x.events));x.events.splice(0,x.events.length,...restored.events);
  }await x.pve();}
}
(async()=>{
  await h.ready;
  for(const c of cases)for(const side of ['p1','p2'])for(const mode of ['pve','online','saved'])await check(`${c.no}${c.label||''} ${side}/${mode}${c.contract?'（実体イベント契約）':''}`,async()=>{
    const x=setup(c,side);c.fire(x);assert.ok(x.events.some(e=>e.type!=='effect_flash'),'効果の実体が必要');await play(x,mode);
    const selected=h.calls.filter(v=>v.name===c.fx);assert.equal(selected.length,c.count||1,'1回の効果を重複して選ばない');
    if(c.fx==='S009'||c.fx==='S005')assert.equal(selected[0].targets.length,c.targets);
    else if(c.fx.startsWith('keyword:')){
      assert.equal(new Set(selected.map(v=>v.unit)).size,c.targets);
      assert.ok(selected.every(v=>v.key===getKeywordAssetKey(c.no==='E027'?'即死':'毒牙')));
    }else assert.equal(selected[0].options.targets.length,c.targets);
    if(c.no==='E028')assert.equal(selected[0].options.targets[0].element.dataset.unitId,'owner','成長は本人だけ');
  });
  for(const c of cases)await check(`${c.no}：発光だけでは固有演出を選ばない`,async()=>{
    const x=setup(c,'p1');x.emit({type:'effect_flash',side:'p1',unitId:'owner',trigger:c.label==='死亡'?'death':c.no==='C011'?'injury':'passive'});
    await x.pve();assert.equal(h.calls.filter(v=>v.name===c.fx).length,0);
  });
  await check('マナの種：確率の外れでは即死演出なし',async()=>{const x=setup({no:'E027'},'p1');x.rng.next=()=>.99;x.hit(x.find('owner'),x.find('foe0'),1);await x.pve();assert.ok(!h.calls.some(v=>v.name==='keyword:即死'));});
  await check('ラミア・エイトヴォルム：対象不在では固有演出なし',async()=>{
    for(const no of ['C011','EN060']){const x=setup({no},'p1');x.state.units.p2=[];G.enemies=[];
      if(no==='C011')coreApplyInjuryEffects(x.find('owner'),1,x.state,x.rng,x.emit,x.hit);
      else coreApplyOpeningEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);
      await x.pve();assert.ok(!h.calls.some(v=>v.name==='scylla'));
    }
  });
  await check('シャナ：眷属召喚では発動せず、味方の攻撃効果で本人へ常時強化を1回',async()=>{
    for(const mode of ['pve','online','saved']){const x=h.setup({sides:{p1:{units:[h.unit('owner','C092'),h.unit('old',null,{keywords:['眷属']})]},p2:{units:[h.unit('foe0')]}}});
      summon(x);assert.equal(x.events.filter(e=>e.type==='summon_buff').length,0);
      coreApplyAttackEffects(x.find('old'),x.state,x.rng,x.emit,x.hit);assert.equal(x.events.filter(e=>e.reason==='ally_attack_permanent_buff').length,0,'攻撃効果なしでは観測しない');
      x.find('old').desc='攻撃：血を得る。';coreApplyAttackEffects(x.find('old'),x.state,x.rng,x.emit,x.hit);await play(x,mode);
      const effects=h.calls.filter(v=>v.name==='S009');assert.equal(effects.length,1);assert.equal(effects[0].targets.length,1);
    }
  });
  await check('シャナが複数いても、同じ味方の攻撃効果への各永久強化を落とさない',async()=>{
    for(const mode of ['pve','online','saved']){const x=h.setup({sides:{p1:{units:[h.unit('owner','C092'),h.unit('second','C092')]},p2:{units:[h.unit('foe0')]}}});
      x.find('owner').desc+='\n攻撃：血を得る。';coreApplyAttackEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);await play(x,mode);assert.equal(h.calls.filter(v=>v.name==='S009').length,2);
    }
  });
  await check('ラミアの毒がハイドラを誘発しても、全体へのscyllaは1回',async()=>{
    for(const mode of ['pve','online','saved']){const x=h.setup({sides:{p1:{units:[h.unit('owner','C011'),h.unit('hydra','C070')]},p2:{units:[h.unit('foe0'),h.unit('foe1')]}}});
      coreApplyInjuryEffects(x.find('owner'),1,x.state,x.rng,x.emit,x.hit,x.find('foe0'));await play(x,mode);
      const effects=h.calls.filter(v=>v.name==='scylla');assert.equal(effects.length,1);assert.equal(effects[0].options.targets.length,2);
      assert.equal(h.calls.filter(v=>v.name==='keyword:毒牙').length,2);
    }
  });
  await check('ラミアに付与した毒牙の通常命中にはscyllaを流用しない',async()=>{
    const x=h.setup({sides:{p1:{units:[h.unit('owner','C011',{keywords:['毒牙2']})]},p2:{units:[h.unit('foe0')]}}});
    x.hit(x.find('owner'),x.find('foe0'),1);assert.ok(x.events.some(e=>e.effect==='poison'));await x.pve();
    assert.equal(h.calls.filter(v=>v.name==='scylla').length,0);assert.equal(h.calls.filter(v=>v.name==='keyword:毒牙').length,1);
  });
  await check('成長＋レプラコーン：自己強化と全体強化を混ぜない',async()=>{
    const e=h.card('E028'),x=h.setup({sides:{p1:{units:[h.unit('owner','C088',{boardCards:[e],_adjacentPanelEffectTexts:[e.desc],_adjacentPanelAbilities:[e.name]}),h.unit('other')]},p2:{units:[h.unit('foe0')]}}});
    coreTriggerBattleEnd(x.state,x.emit,x.rng,x.hit);await x.pve();const effects=h.calls.filter(v=>v.name==='leprechaun');
    assert.equal(effects.length,2);assert.deepEqual(effects.map(v=>v.options.targets.length),[1,2]);
  });
  await check('絶魔の指輪：各対象の既存演出にS009の音を1回ずつ',async()=>{
    const x=h.setup({sides:{p1:{units:[h.unit('owner'),h.unit('ally')]},p2:{units:[h.unit('foe0')]}},rings:{p1:[h.card('R035','ring')],p2:[]}});
    coreApplyShieldLostEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);await x.pve();
    assert.equal(h.calls.filter(v=>v.name==='aura-buff').length,2);assert.equal(h.sounds.filter(v=>v.code==='S009').length,2);assert.ok(!h.sounds.some(v=>v.code==='R035'));
    await x.online();assert.equal(h.calls.filter(v=>v.name==='aura-buff').length,2);assert.equal(h.sounds.filter(v=>v.code==='S009').length,2);
  });
  await check('起動：シルフと変身の巻物の割り当てを区別し、剣戟未登録なら従来へ戻す',()=>{
    assert.equal(PRESENT_ACTIVATION_FX.C084,'dragonnet');assert.equal(PRESENT_ITEM_USE_FX.I002,'activation-transform');
    assert.equal(presentActivationFx('C116',['activation-devour']),'activation-devour');
    assert.equal(presentActivationFx('C116',['activation-devour','hellknight-slash']),'hellknight-slash');
    for(const [no,fx]of [['C020','aura-buff'],['C047','aura-buff'],['C070','aura-buff'],['E005','aura-buff'],['E023','aura-buff'],['E044','attack-buff']])assert.equal(presentLabFx(no)[0],fx,'LABと共通の表');
  });
  await check('作業前のコアと全キャラクターの戦闘結果・数値・乱数進行が同じ',()=>{
    const context={module:{exports:{}}};vm.createContext(context);
    vm.runInContext(cp.execFileSync('git',['show','a92ba51f:prototype/js/battle/core.js'],{encoding:'utf8',maxBuffer:2e6}),context);const base=context.module.exports;
    const clean=value=>JSON.parse(JSON.stringify(value,(key,v)=>key==='_coreOpeningEffectsState'?'<state>'
      :['effectTrigger','fxBatch','_presentationBatchSeq'].includes(key)?undefined:key==='effectText'&&typeof v==='string'&&/永久に/.test(v)?undefined:v));
    let count=0;
    // 本文・ルールを改訂したカードはsheet_1025b_regression.jsで通常／強化の数値を検査する。
    const changed=new Set('C001 C002 C003 C004 C005 C007 C010 C017 C018 C020 C021 C026 C027 C028 C029 C030 C031 C034 C046 C047 C051 C052 C053 C054 C055 C058 C067 C070 C076 C077 C078 C079 C080 C092 C099 C101 C102 C103 C104 C105 C116 C121'.split(' '));
    const unchanged=h.sheetRows('card').filter(row=>!changed.has(row['No.']));
    for(const row of unchanged)for(const side of ['p1','p2']){
      const options={sides:{[side]:{units:[h.unit('owner',row['No.'])]},[side==='p1'?'p2':'p1']:{units:[h.unit('foe0'),h.unit('foe1')]}},resources:{[side]:{mana:5,gold:20}}};
      const outputs=[base,global].map(api=>{const state=api.createBattleState(h.clone(options)),rng=createSeededRng(1025),events=[];
        const result=api.runBattleCore(state,rng,{turnLimit:5,onEvent:e=>events.push(e)});
        return clean({result,events,final:api.battleCoreFinalState(state),next:rng.next()});});
      assert.deepEqual(outputs[1],outputs[0],row['No.']+'/'+side);count++;
    }
    assert.equal(count,unchanged.length*2);assert.ok(count>0);console.log('  比較 '+count+'ケース（改訂カードは新本文の回帰検査へ）');
  });
  // 2026-10-25 利用者指定で4枚の効果をコアへ実装した（enchant_1025_regression.js）。以前は未発火を固定していたが、今は実戦の元イベントが出ることを確かめる。
  await check('4種（武威・復讐の炎・毒袋・変化）の実戦の元イベントがコアから出る',()=>{
    for(const no of ['E023','E044','E015','E016']){const x=setup({no},'p1');
      if(no==='E023')summon(x);
      if(no==='E044'){x.state.blood={p1:2,p2:2};coreApplyAttackEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);}
      if(no==='E015'){x.find('owner').hp=0;coreApplyDeathEffects(x.find('owner'),x.state,x.rng,x.emit,x.hit);}
      if(no==='E016')coreTriggerBattleEnd(x.state,x.emit,x.rng,x.hit);
      if(no==='E016')continue; // 変化は魔導板の枠を持つ味方が要る。enchant_1025_regression.js で検査する。
      assert.ok(x.events.some(e=>no==='E023'?e.reason==='summon_observer_stats':no==='E044'?e.reason==='attack_self_buff':e.effect==='poison'),no);
    }
  });
  global.playKeywordEffectVfxSustained=kw;
  console.log(`fx_assign_1025: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
