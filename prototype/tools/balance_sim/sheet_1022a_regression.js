'use strict';
// 現行シートの通常・強化本文、両陣営、保存とオンラインの入口を検証する。
const assert=require('node:assert/strict'),fs=require('node:fs');
require('./load');
const sheet=require('./sheet_data');
let checks=0;
const copy=v=>JSON.parse(JSON.stringify(v));
function card(no,enhanced=false){const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);return enhanced?enhancedPanelCopy(makePanel(def.id)):makePanel(def.id);}
function plain(id,extra={}){return {id,name:id,atk:4,hp:100,maxHp:100,color:'赤',keywords:[],desc:'',...extra};}
function unit(no,id,enhanced=false,extra={}){const c=card(no,enhanced);return {..._makePanelSummonUnit(_panelSummonSpec(c),[]),id,...extra};}
function setup(side,own,extra={}){
 const other=side==='p1'?'p2':'p1',rng=createSeededRng(1022),events=[];
 const state=createBattleState({sides:{[side]:{units:own},[other]:{units:[plain('foe'),plain('foe2')]}},summonDefs:PANEL_POOL,itemDefs:ITEM_POOL,...extra});
 const emit=e=>events.push(e),hit=(s,t,n,c,ss,st,o)=>coreResolveHit(state,s,t,n,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...o});
 return {state,rng,events,emit,hit,u:state.units[side][0],other};
}
function check(name,fn){fn();checks++;console.log('OK '+name);}
(async()=>{
 console.table=()=>{};await loadGameData();
 for(const side of ['p1','p2'])for(const enhanced of [false,true]){
  check(`${side}/${enhanced}：報酬強化と血消費は本文の量、血不足では発動しない`,()=>{
   const u=unit('C003','source',enhanced),h=setup(side,[u]);
   const m=u.desc.match(/\+(\d+)\/\+(\d+)/);
   coreApplyInjuryEffects(h.u,3,h.state,h.rng,h.emit,h.hit);
   assert.deepEqual(h.state.runEffects[side].rewardBuff,{atk:Number(m[1]),hp:Number(m[2])});
   assert.equal(h.u.atk,u.atk,'旧自己バフを発動しない');
   const f=unit('C089','source',enhanced),cost=Number(f.desc.match(/血を(\d+)消費/)[1]);
   const x=setup(side,[f],{blood:{[side]:cost}});coreApplyAttackEffects(x.u,x.state,x.rng,x.emit,x.hit);
   assert.equal(x.state.blood[side],0);assert.equal(x.events.filter(e=>e.type==='run_effect').length,1);
   const y=setup(side,[f]);coreApplyAttackEffects(y.u,y.state,y.rng,y.emit,y.hit);
   assert.equal(y.events.filter(e=>e.type==='run_effect').length,0);
  });
  check(`${side}/${enhanced}：味方の負傷・マナ・解放・攻撃の追加発動を共通コアで解決`,()=>{
   const effect=card('E001'),subject=plain('subject',{_adjacentPanelEffectTexts:[effect.desc]});
   const h=setup(side,[subject,unit('C020','observer',enhanced)]);
   h.hit(h.state.units[h.other][0],h.u,1);
   const extra=Number(h.state.units[side][1].desc.match(/(\d+)回追加/)[1]);
   assert.equal(h.events.filter(e=>e.reason==='injury_self_buff').length,1+extra);
   for(const [no,kind]of [['C057','マナ'],['C070','攻撃'],['C100','解放']]){
    const x=setup(side,[unit(no,'observer',enhanced)]);
    assert.equal(coreAllyExtraTriggerTimes(x.u,x.state,kind),Number(x.u.desc.match(/(\d+)回追加/)[1]));
    x.u._sealed=true;assert.equal(coreAllyExtraTriggerTimes(x.u,x.state,kind),0);
   }
   const mana=setup(side,[unit('C088','mana'),unit('C057','support',enhanced)],{resources:{[side]:{mana:1}}});
   coreApplyManaThresholdEffects(mana.state,mana.rng,mana.emit,mana.hit);
   assert.equal(mana.events.filter(e=>e.reason==='mana_threshold_random_purple').length,1+Number(mana.state.units[side][1].desc.match(/(\d+)回追加/)[1]));
  });
  check(`${side}/${enhanced}：状態異常の獲得ごとに全味方HPを加算、血はマナへ変換`,()=>{
   const h=setup(side,[unit('C055','hydra',enhanced),plain('ally')]);
   const attacker=plain('poison',{side,keywords:['毒牙2','衝撃1']});
   coreApplyKeywordOnHit(attacker,h.state.units[h.other][0],1,100,h.state,h.emit);
   const amount=Number(h.u.desc.match(/HP\+(\d+)/)[1]);
   assert.equal(h.events.filter(e=>e.reason==='enemy_ailment_hp'&&e.unitId==='hydra').length,2);
   assert.equal(h.u.hp,100===h.u.maxHp?100:h.u.maxHp);
   assert.equal(h.events.filter(e=>e.reason==='enemy_ailment_hp').reduce((n,e)=>n+e.hp,0),amount*2*2);
   const b=setup(side,[unit('C059','basilisk',enhanced),plain('dead')]);
   b.state.units[side][1].hp=0;coreTriggerDeath(b.state.units[side][1],b.state,b.emit,b.rng,b.hit);
   assert.equal(b.state.blood[side],0);assert.equal(b.state.resources[side].mana,enhanced?2:1);
   assert.equal(b.events.find(e=>e.reason==='blood_to_mana').unitId,'basilisk','変換後のマナの発生元はバジリスク');
  });
  check(`${side}/${enhanced}：全色HP倍率・割合ダメージ・色別死亡強化`,()=>{
   const own=[unit('C080','elemental',enhanced),...['赤','青','緑','黄','紫'].map(c=>plain(c,{color:c}))];
   const h=setup(side,own),before=h.state.units[side].map(u=>[u.atk,u.maxHp]);
   coreApplyOpeningEffects(h.u,h.state,h.rng,h.emit,h.hit);
   const multiplier=Number(h.u.desc.match(/HPを(\d+)倍/)[1]);
   h.state.units[side].forEach((u,i)=>assert.deepEqual([u.atk,u.maxHp],[before[i][0],before[i][1]*multiplier]));
   const t=setup(side,[unit('C014','titan',enhanced)]);coreApplyOpeningEffects(t.u,t.state,t.rng,t.emit,t.hit);
   const percent=Number(t.u.desc.match(/HPの(\d+)%/)[1]);
   assert.deepEqual(t.events.filter(e=>e.type==='damage').map(e=>e.amount),[percent,percent]);
   assert.equal(new Set(t.events.filter(e=>e.type==='damage').map(e=>e.batch)).size,1);
   const z=setup(side,[unit('C021','zombie',enhanced),...['青','緑','紫'].map(c=>plain(c,{color:c}))]);z.u.hp=0;
   coreApplyDeathEffects(z.u,z.state,z.rng,z.emit,z.hit);
   const pair=z.u.desc.match(/\+(\d+)\/\+(\d+)/);
   assert.deepEqual(z.events.filter(e=>e.reason==='death_random_color_buff').map(e=>[e.atk,e.hp]),Array(3).fill([Number(pair[1]),Number(pair[2])]));
  });
  check(`${side}/${enhanced}：起動3種の対象・量を本文から読む`,()=>{
   const target={...card('C001'),power:7,life:11},rng=createSeededRng(101);
   const sylph=coreActivateBoardCard(card('C064',enhanced),target,PANEL_POOL,rng);
   assert.ok(sylph);assert.equal(sylph.definition.rarity,target.rarity);assert.notEqual(sylph.definition.name,target.name);
   const incubus=card('C084',enhanced),result=coreActivateBoardCard(incubus,target,PANEL_POOL,rng),pair=incubus.desc.match(/\+(\d+)\/\+(\d+)/);
   assert.deepEqual([result.atk,result.hp],[Number(pair[1]),Number(pair[2])]);assert.ok(['赤','青','緑','黄','紫'].includes(result.color));
   const knight=card('C091',enhanced),mul=Number((knight.desc.match(/の(\d+)倍/)||[])[1])||1;
   assert.deepEqual(coreActivateBoardCard(knight,target,PANEL_POOL,rng),{kind:'destroy',atk:7*mul,hp:11*mul});
   assert.equal(coreActivateBoardCard(knight,knight,PANEL_POOL,rng),null);
   assert.equal(coreActivateBoardCard(card('C064'),card('E001'),PANEL_POOL,rng),null,'通常のシルフはキャラクターだけを対象にする');
  });
  check(`${side}/${enhanced}：ミノタウロスの割り込み攻撃も攻撃効果を発動、改名・両陣営で共通`,()=>{
   const mino=unit('C009','mino',enhanced,{name:'改名した負傷攻撃者',atk:2,hp:100,maxHp:100}),attack=card('E008');
   mino._adjacentPanelEffectTexts=[attack.desc];
   const h=setup(side,[mino]),times=coreTextRepeatCount(mino.desc),damage=Number(attack.desc.match(/(\d+)ダメージ/)[1]);
   h.hit(h.state.units[h.other][0],h.u,1);
   assert.equal(h.events.filter(e=>e.type==='attack'&&e.reactionSourceId==='mino').length,times);
   assert.equal(h.events.filter(e=>e.type==='damage'&&e.sourceId==='mino'&&e.damageKind!=='combat'&&e.amount===damage).length,times);
   assert.equal(h.events.filter(e=>e.type==='keyword_effect'&&e.effect==='shield').length,0);
  });
 }
 check('M002/M004：実編成・コア・オンラインの封印/マナ、旧効果の消去、カード原本は不変',()=>{
  initState();G.mainBoard.fill(null);G.mainBoard[1]=card('C099');G.mainBoard[3]=card('C018');G.mapPanelPowers={1:'life',3:'resonance'};
  const raw=copy(G.mainBoard),units=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered.map(e=>e.unit);
  const sealed=units.find(u=>u._mainBoardSlot===1),mage=units.find(u=>u._mainBoardSlot===3);
  const reduction=Number(MAP_PANEL_POWERS.find(p=>p.id==='life').desc.match(/封印の値を(\d+)/)[1]);
  assert.equal(coreSealValue(sealed),Math.max(0,Number(raw[1].keywords.find(k=>/^封印/.test(k)).replace('封印',''))-reduction));
  const state=createBattleState({sides:{p1:{units},p2:{units:[plain('foe')]}},resources:{p1:{mana:3}}}),events=[],rng=createSeededRng(7);
  const emit=e=>events.push(e),hit=(s,t,a,c,ss,st,o)=>coreResolveHit(state,s,t,a,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...o});
  coreApplyManaThresholdEffects(state,rng,emit,hit);assert.ok(events.some(e=>e.type==='mana_threshold'&&e.unitId===mage.id&&e.cost===3));
  assert.match(cardManaCostHtml(mage),/data-mana-cost="3"/);assert.equal(_sealCostValue(sealed),coreSealValue(sealed));
  assert.equal(coreManaThresholdCost(mage,1),1);assert.equal(coreManaThresholdCost(mage,0),0);
  coreApplyMapPanelOpeningEffects(state,emit,rng,hit);assert.ok(!events.some(e=>/resonance_panel|life_panel_double/.test(e.reason||'')));
  assert.ok(!presentLabFx('map:life'));assert.ok(!presentLabFx('map:resonance'));assert.deepEqual(G.mainBoard,raw);
  const payload=buildOnlineSelfFormation();
  for(const u of payload.units){
   const expected=units.find(x=>x._mainBoardSlot===u._mainBoardSlot);assert.equal(u._mapPanelPowerText,expected._mapPanelPowerText);
  }
 });
 check('起動の回数：カード別・編成/魔導店/行商、再入店・保存再開・戦闘中の禁止',()=>{
  initState();G.phase='reward';G.activationFormationSeq=1;G._wave=1;G._waveStage=2;G._waveLife=3;G.gold=800;G._runId='sheet1022a';G._runSeed=1022;G._runRngState=1022;G.mainBoard.fill(null);const source=G.mainBoard[1]=card('C084');G.mainBoard[3]=card('C001');
  const renderers=[renderHandEditor,renderRewCards,updateHUD];renderHandEditor=renderRewCards=updateHUD=()=>{};
  try{
   const use=()=>{_pendingCardActivation={card:source,index:1,key:cardActivationVisitKey()};assert.equal(handleCardActivationTarget(3),true);};
   assert.ok(cardActivationCanUse(source));use();assert.equal(cardActivationCanUse(source),false);
   G._isShop=true;G._facilityCacheKey='town1';assert.ok(cardActivationCanUse(source));use();assert.equal(cardActivationCanUse(source),false);
   G._isShop=false;G._isShop=true;assert.equal(cardActivationCanUse(source),false,'同じ店の再入店');
   const saved=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(saved);
   assert.equal(cardActivationCanUse(G.mainBoard[1]),false,'再開で使用回数を戻さない');
   G._isShop=false;G._isPeddler=true;G._waveDefeatCount=1;assert.ok(cardActivationCanUse(G.mainBoard[1]));
   G.phase='player';assert.equal(cardActivationCanUse(G.mainBoard[1]),false);
  }finally{[renderHandEditor,renderRewCards,updateHUD]=renderers;_pendingCardActivation=null;}
 });
 check('ラン効果の出口：報酬/行商・再抽選権・セーブで絶対値を保つ',()=>{
  initState();const event={type:'run_effect',side:'p1',kind:'reward_buff',effects:{rewardBuff:{atk:2,hp:3},rerolls:2}};
  applyCoreRunEffectEvent(event);applyCoreRunEffectEvent(event);assert.equal(towerBoonState().rerolls,2);
  const raw=card('C001'),offers=applyRewardCharacterEffects([copy(raw)],false);assert.deepEqual([offers[0].power,offers[0].life],[raw.power+2,raw.life+3]);
  applyRewardCharacterEffects(offers,false);assert.deepEqual([offers[0].power,offers[0].life],[raw.power+2,raw.life+3],'在庫の再読込で二重加算しない');
  G.runEffects.rewardBuff={atk:3,hp:5};applyRewardCharacterEffects(offers,false);assert.deepEqual([offers[0].power,offers[0].life],[raw.power+3,raw.life+5],'在庫には増えた累積量だけ加える');
  G.runEffects=copy(event.effects);
  const data=SaveRun.serializeRunState();assert.deepEqual(data.player.runEffects,event.effects);
  const receivers=['js/engine/battle_events.js','js/online/board.js','js/online/playback.js'].map(f=>fs.readFileSync(f,'utf8'));
  receivers.forEach(s=>assert.match(s,/run_effect/));
  const h=setup('p1',[plain('source')],{runEffects:{p1:event.effects},itemFreeSlots:{p1:1,p2:2}}),snapshot=coreSnapshotDeferredState(h.state);
  h.state.runEffects.p1.rewardBuff.atk=99;h.state.itemFreeSlots.p1=0;coreRestoreDeferredState(h.state,snapshot);
  assert.deepEqual(h.state.runEffects.p1,event.effects);assert.deepEqual(h.state.itemFreeSlots,{p1:1,p2:2});
 });
 check('対象選択：アイテムから起動/起動からアイテムへ切り替え、復元後のカードを参照',()=>{
  initState();G.phase='reward';G.mainBoard.fill(null);G.mainBoard[1]=card('C084');G.mainBoard[3]=card('C001');
  const names=['renderHandEditor','renderRewCards','updateHUD','_syncRewardProductionUi','_syncItemUsePickingUi'];
  const old=Object.fromEntries(names.map(n=>[n,globalThis[n]]));names.forEach(n=>globalThis[n]=()=>{});
  try{
   const item=makeItem('巨大化の巻物');_beginBoardItemUse(0,item);
   const node=document.createElement('div');wireCardActivation(node,G.mainBoard[1],1);node.children.at(-1).onclick({stopPropagation(){}});
   assert.equal(G._pendingItemUse,null);assert.equal(_pendingCardActivation.card,G.mainBoard[1]);
   assert.ok(handleCardActivationTarget(3));assert.equal(cardActivationCanUse(G.mainBoard[1]),false);
   _pendingCardActivation={card:G.mainBoard[1],index:1,key:cardActivationVisitKey()};_beginBoardItemUse(0,item);
   assert.equal(_pendingCardActivation,null);assert.ok(G._pendingItemUse);
  }finally{Object.assign(globalThis,old);G._pendingItemUse=null;_pendingCardActivation=null;}
 });
 check('終戦：接続エンチャント強化・回数保存・錬成の空き欄と支払い',()=>{
  for(const side of ['p1','p2'])for(const enhanced of [false,true]){
   const source=unit('C075','cat',enhanced,{_mainBoardSlot:1,_battleEndCount:3}),connected=card('E001');
   source.boardCards=[{...connected,_mainBoardSlot:2},{...card('E003'),_mainBoardSlot:4}];
   const h=setup(side,[source]);coreTriggerBattleEnd(h.state,h.emit,h.rng);
   const ev=h.events.find(e=>e.kind==='enchant_upgrade');
   assert.equal(ev.count,4);assert.equal(ev.targetSlots.length,enhanced?2:1);
   if(side==='p1'){
    initState();G.mainBoard.fill(null);G.mainBoard[1]=card('C075');G.mainBoard[2]=card('E001');G.mainBoard[4]=card('E003');
    applyCoreRunEffectEvent(ev);assert.equal(G.mainBoard[1]._battleEndCount,4);ev.targetSlots.forEach(i=>assert.ok(G.mainBoard[i]._tripleMerged));
    const saved=SaveRun.serializeRunState();assert.equal(saved.player.mainBoard[1]._battleEndCount,4);
   }
   const text=card('E030',enhanced).desc,cost=Number(text.match(/(\d+)G/)[1]);
   for(const slots of [0,1]){
    const a=plain('alchemy',{_adjacentPanelEffectTexts:[text]}),x=setup(side,[a],{resources:{[side]:{gold:cost}},itemFreeSlots:{[side]:slots}});
    coreTriggerBattleEnd(x.state,x.emit,x.rng);
    assert.equal(x.events.filter(e=>e.type==='item_reward').length,slots);assert.equal(x.state.resources[side].gold,slots?0:cost);
   }
  }
 });
 check('還魂：本文のアイテム/ゴールド/上限付きライフを、確定時に受け取る',()=>{
  initState();G._wave=1;G._waveLife=3;G.gold=100;G._ringSacrificedCards=[];
  const vase=card('E041',true),mirror=card('E064'),sheep=card('C042');
  assert.deepEqual(coreAscensionSpec(vase),{life:2,lifeCap:5});
  const oldGold=gainEventGold;gainEventGold=n=>{G.gold+=n;};
  try{applyAscensionCardEffects([{card:vase},{card:vase},{card:mirror},{card:sheep}]);}
  finally{gainEventGold=oldGold;}
  assert.equal(waveLifeMax(),5);assert.equal(G.gold,100+Number(mirror.desc.match(/(\d+)G/)[1]));assert.equal(G.spellSlots.filter(Boolean).length,1);
 });
 check('アイテム改訂：2段階の変身/戦闘力交換、1.5倍、再抽選、次戦のマナと血',()=>{
  const names=['renderHandEditor','renderRewCards','updateHUD','_syncRewardProductionUi','_syncItemUsePickingUi','_closeItemUseConfirm','_playItemUseVfx'];
  const old=Object.fromEntries(names.map(n=>[n,globalThis[n]]));names.forEach(n=>globalThis[n]=()=>{});
  const item=no=>{const i=ITEM_POOL.find(x=>x.artCode===no||x.no===no||'I'+String(x.no).padStart(3,'0')===no);assert.ok(i,no);return copy(i);};
  try{
   const prepare=no=>{initState();G.phase='reward';G.mainBoard.fill(null);G.mainBoard[1]={...card('C001'),power:7,life:9};G.mainBoard[3]={...card('C002'),power:13,life:17};G.spellSlots[0]=item(no);return G.spellSlots[0];};
   let i=prepare('I005');_beginBoardItemUse(0,i);_handlePendingItemBoardTarget(1);
   assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life],[11,14]);assert.equal(G.spellSlots[0],null);
   i=prepare('I008');_beginBoardItemUse(0,i);_handlePendingItemBoardTarget(1);assert.ok(G.spellSlots[0]);_handlePendingItemBoardTarget(3);
   assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life,G.mainBoard[3].power,G.mainBoard[3].life],[13,17,7,9]);
   i=prepare('I002');G.mainBoard[1]=card('E001');_beginBoardItemUse(0,i);_handlePendingItemBoardTarget(1);_handlePendingItemBoardTarget(3);
   assert.equal(G.mainBoard[1].name,G.mainBoard[3].name);assert.equal(G.mainBoard[1].power,card('C002').power,'変身先の素の定義を使う');
   i=prepare('I011');assert.ok(_useImmediateItem(0,i));assert.equal(towerBoonState().rerolls,Number(i.desc.match(/(\d+)回/)[1]));
   i=prepare('I007');const before=copy(G.mainBoard);assert.ok(_useImmediateItem(0,i));assert.deepEqual(G.mainBoard,before);
   for(const side of ['p1','p2']){
    const x=setup(side,[plain('source')],{items:{[side]:[i]}});coreApplyOpeningItems(x.state,x.rng,x.emit,x.hit);
    const amount=Number(i.desc.match(/(\d+)ずつ/)[1]);assert.equal(x.state.resources[side].mana,amount);assert.equal(x.state.blood[side],amount);
   }
  }finally{Object.assign(globalThis,old);}
 });
 check('策士：参照するだけの毒牙を付与せず、既存の邪眼/毒牙/衝撃を命中時にも補正',()=>{
  for(const side of ['p1','p2'])for(const enhanced of [false,true]){
   const e=card('E063',enhanced),extra=Number(e.desc.match(/値は\+(\d+)/)[1]);assert.ok(!(e.adjacentKeywords||[]).some(k=>/^毒牙/.test(k)));
   const x=setup(side,[plain('source',{keywords:['邪眼2','毒牙2','衝撃2'],_adjacentPanelEffectTexts:[e.desc]})]);
   const foe=x.state.units[x.other][0];foe.atk=100;coreApplyKeywordOnHit(x.u,foe,1,foe.hp,x.state,x.emit);
   assert.equal(foe.poison,2+extra);assert.equal(foe.weaken,2+extra);assert.equal(foe.atk,100-(2+extra));
   const empty=setup(side,[plain('source',{_adjacentPanelEffectTexts:[e.desc]})]);coreApplyKeywordOnHit(empty.u,empty.state.units[empty.other][0],1,100,empty.state,empty.emit);
   assert.ok(!empty.events.some(ev=>ev.type==='keyword_effect'));
  }
 });
 console.log(`シート1022a回帰：${checks}件 OK`);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
