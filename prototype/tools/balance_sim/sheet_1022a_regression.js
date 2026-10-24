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
   const u=unit('C008','source',enhanced),h=setup(side,[u]);
   const m=u.desc.match(/\+(\d+)\/\+(\d+)/);
   coreApplyInjuryEffects(h.u,3,h.state,h.rng,h.emit,h.hit);
   assert.deepEqual(h.state.runEffects[side].rewardBuff,{atk:Number(m[1]),hp:Number(m[2])});
   assert.equal(h.u.atk,u.atk,'旧自己バフを発動しない');
   const f=unit('C114','source',enhanced),cost=Number(f.desc.match(/血を(\d+)消費/)[1]);
   const x=setup(side,[f],{blood:{[side]:cost}});coreApplyAttackEffects(x.u,x.state,x.rng,x.emit,x.hit);
   assert.equal(x.state.blood[side],0);assert.equal(x.events.filter(e=>e.type==='run_effect').length,1);
   const y=setup(side,[f]);coreApplyAttackEffects(y.u,y.state,y.rng,y.emit,y.hit);
   assert.equal(y.events.filter(e=>e.type==='run_effect').length,0);
  });
  check(`${side}/${enhanced}：味方の負傷・マナ・解放・攻撃の追加発動を共通コアで解決`,()=>{
   const effect=card('E001'),subject=plain('subject',{_adjacentPanelEffectTexts:[effect.desc]});
   const h=setup(side,[subject,unit('C025','observer',enhanced)]);
   h.hit(h.state.units[h.other][0],h.u,1);
   const extra=Number(h.state.units[side][1].desc.match(/(\d+)回追加/)[1]);
   assert.equal(h.events.filter(e=>e.reason==='injury_self_buff').length,1+extra);
   for(const [no,kind]of [['C072','マナ'],['C090','攻撃'],['C125','解放']]){
    const x=setup(side,[unit(no,'observer',enhanced)]);
    assert.equal(coreAllyExtraTriggerTimes(x.u,x.state,kind),Number(x.u.desc.match(/(\d+)回追加/)[1]));
    x.u._sealed=true;assert.equal(coreAllyExtraTriggerTimes(x.u,x.state,kind),0);
   }
   const mana=setup(side,[unit('C113','mana'),unit('C072','support',enhanced)],{resources:{[side]:{mana:1}}});
   coreApplyManaThresholdEffects(mana.state,mana.rng,mana.emit,mana.hit);
   assert.equal(mana.events.filter(e=>e.reason==='mana_threshold_random_purple').length,1+Number(mana.state.units[side][1].desc.match(/(\d+)回追加/)[1]));
  });
  check(`${side}/${enhanced}：状態異常の獲得ごとに全味方HPを加算、血はマナへ変換`,()=>{
   const h=setup(side,[unit('C070','hydra',enhanced),plain('ally')]);
   const attacker=plain('poison',{side,keywords:['毒牙2','衝撃1']});
   coreApplyKeywordOnHit(attacker,h.state.units[h.other][0],1,100,h.state,h.emit);
   const amount=Number(h.u.desc.match(/HP\+(\d+)/)[1]);
   assert.equal(h.events.filter(e=>e.reason==='enemy_ailment_hp'&&e.unitId==='hydra').length,2);
   assert.equal(h.u.hp,100===h.u.maxHp?100:h.u.maxHp);
   assert.equal(h.events.filter(e=>e.reason==='enemy_ailment_hp').reduce((n,e)=>n+e.hp,0),amount*2*2);
   const b=setup(side,[unit('C074','basilisk',enhanced),plain('dead')]);
   b.state.units[side][1].hp=0;coreTriggerDeath(b.state.units[side][1],b.state,b.emit,b.rng,b.hit);
   assert.equal(b.state.blood[side],0);assert.equal(b.state.resources[side].mana,enhanced?2:1);
   assert.equal(b.events.find(e=>e.reason==='blood_to_mana').unitId,'basilisk','変換後のマナの発生元はバジリスク');
  });
  check(`${side}/${enhanced}：全色HP倍率・割合ダメージ・色別死亡強化`,()=>{
   const own=[unit('C100','elemental',enhanced),...['赤','青','緑','黄','紫'].map(c=>plain(c,{color:c}))];
   const h=setup(side,own),before=h.state.units[side].map(u=>[u.atk,u.maxHp]);
   coreApplyOpeningEffects(h.u,h.state,h.rng,h.emit,h.hit);
   const multiplier=Number(h.u.desc.match(/HPを(\d+)倍/)[1]);
   h.state.units[side].forEach((u,i)=>assert.deepEqual([u.atk,u.maxHp],[before[i][0],before[i][1]*multiplier]));
   const t=setup(side,[unit('C019','titan',enhanced)]);coreApplyOpeningEffects(t.u,t.state,t.rng,t.emit,t.hit);
   const percent=Number(t.u.desc.match(/HPの(\d+)%/)[1]);
   assert.deepEqual(t.events.filter(e=>e.type==='damage').map(e=>e.amount),[percent,percent]);
   assert.equal(new Set(t.events.filter(e=>e.type==='damage').map(e=>e.batch)).size,1);
   const z=setup(side,[unit('C031','zombie',enhanced),...['青','緑','紫'].map(c=>plain(c,{color:c}))]);z.u.hp=0;
   coreApplyDeathEffects(z.u,z.state,z.rng,z.emit,z.hit);
   const pair=z.u.desc.match(/\+(\d+)\/\+(\d+)/);
   assert.deepEqual(z.events.filter(e=>e.reason==='death_random_color_buff').map(e=>[e.atk,e.hp]),Array(3).fill([Number(pair[1]),Number(pair[2])]));
  });
  check(`${side}/${enhanced}：起動3種の対象・量を本文から読む`,()=>{
   const target={...card('C006'),power:7,life:11},rng=createSeededRng(101);
   const sylph=coreActivateBoardCard(card('C084',enhanced),target,PANEL_POOL,rng);
   assert.ok(sylph);assert.equal(sylph.definition.rarity,target.rarity);assert.notEqual(sylph.definition.name,target.name);
   const incubus=card('C109',enhanced),result=coreActivateBoardCard(incubus,target,PANEL_POOL,rng),pair=incubus.desc.match(/\+(\d+)\/\+(\d+)/);
   assert.deepEqual([result.atk,result.hp],[Number(pair[1]),Number(pair[2])]);assert.ok(['赤','青','緑','黄','紫'].includes(result.color));
   const knight=card('C116',enhanced),mul=Number((knight.desc.match(/の(\d+)倍/)||[])[1])||1;
   assert.deepEqual(coreActivateBoardCard(knight,target,PANEL_POOL,rng),{kind:'destroy',atk:7*mul,hp:11*mul});
   assert.equal(coreActivateBoardCard(knight,knight,PANEL_POOL,rng),null);
   assert.equal(coreActivateBoardCard(card('C084'),card('E001'),PANEL_POOL,rng),null,'通常のシルフはキャラクターだけを対象にする');
  });
  check(`${side}/${enhanced}：ミノタウロスの割り込み攻撃も攻撃効果を発動、改名・両陣営で共通`,()=>{
   const mino=unit('C014','mino',enhanced,{name:'改名した負傷攻撃者',atk:2,hp:100,maxHp:100}),attack=card('E008');
   mino._adjacentPanelEffectTexts=[attack.desc];
   const h=setup(side,[mino]),times=coreTextRepeatCount(mino.desc),damage=Number(attack.desc.match(/(\d+)ダメージ/)[1]);
   h.hit(h.state.units[h.other][0],h.u,1);
   assert.equal(h.events.filter(e=>e.type==='attack'&&e.reactionSourceId==='mino').length,times);
   assert.equal(h.events.filter(e=>e.type==='damage'&&e.sourceId==='mino'&&e.damageKind!=='combat'&&e.amount===damage).length,times);
   assert.equal(h.events.filter(e=>e.type==='keyword_effect'&&e.effect==='shield').length,0);
  });
 }
 check('M002/M004：実編成・コア・オンラインの封印/マナ、旧効果の消去、カード原本は不変',()=>{
  initState();G.mainBoard.fill(null);G.mainBoard[1]=card('C124');G.mainBoard[3]=card('C023');G.mapPanelPowers={1:'life',3:'resonance'};
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
 check('起動の回数：戦闘終了ごとに1回（累積しない）・獲得即使用は不可・保存再開・戦闘中の禁止（2026-10-23 利用者指定）',()=>{
  initState();G.phase='reward';G.activationFormationSeq=1;G._wave=1;G._waveStage=2;G._waveLife=3;G.gold=800;G._runId='sheet1022a';G._runSeed=1022;G._runRngState=1022;G.mainBoard.fill(null);const source=G.mainBoard[1]=card('C109');G.mainBoard[3]=card('C006');
  const renderers=[renderHandEditor,renderRewCards,updateHUD];renderHandEditor=renderRewCards=updateHUD=()=>{};
  try{
   const use=()=>{assert.equal(cardActivationClick(1),true,'カードのクリックで対象選びを始める');assert.equal(cardActivationClick(3),true);};
   assert.equal(cardActivationCanUse(source),false,'獲得したばかりのカードは使えない');assert.equal(cardActivationClick(1),false);
   chargeBoardCardActivations();chargeBoardCardActivations();
   assert.ok(cardActivationCanUse(source));use();assert.equal(cardActivationCanUse(source),false,'累積しない');
   G._isShop=true;G._facilityCacheKey='town1';assert.equal(cardActivationCanUse(source),false,'店へ入り直しても戻らない');
   chargeBoardCardActivations();assert.ok(cardActivationCanUse(source),'魔導店でも使える');
   const saved=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(saved);
   assert.ok(cardActivationCanUse(G.mainBoard[1]),'保存再開で印を保つ');
   G.mainBoard[1]._activationReady=false;const used=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(used);
   assert.equal(cardActivationCanUse(G.mainBoard[1]),false,'再開で使用を戻さない');
   G._isShop=false;G._isForge=true;G.mainBoard[1]._activationReady=true;assert.equal(cardActivationCanUse(G.mainBoard[1]),false,'鍛冶屋では使えない');
   G._isForge=false;G.phase='player';assert.equal(cardActivationCanUse(G.mainBoard[1]),false,'戦闘中は使えない');
   assert.match(fs.readFileSync('js/engine/battle.js','utf8'),/_libraryTestBattleMode&&typeof chargeBoardCardActivations==='function'\) chargeBoardCardActivations\(\)/,'戦闘ごとに印を立てる（試験戦闘を除く）');
  }finally{[renderHandEditor,renderRewCards,updateHUD]=renderers;_pendingCardActivation=null;}
 });
 check('起動できるカード：枠の緑の発光と「起動可」ラベル、ボタンは無い（2026-10-23）',()=>{
  initState();G.phase='reward';G.mainBoard.fill(null);G.mainBoard[1]=card('C109');
  // 検査用のDOMの代用は classList を持たないので、付けたクラスを数える要素を作る。
  const el=()=>{const set=new Set(),n=document.createElement('div');n.children=[];n.appendChild=c=>{n.children.push(c);return c;};
   n.classList={add:c=>set.add(c),remove:c=>set.delete(c),toggle:(c,f)=>{if(f??!set.has(c))set.add(c);else set.delete(c);},contains:c=>set.has(c)};return n;};
  const node=el();wireCardActivation(node,G.mainBoard[1],1);
  assert.equal(node.children.length,0,'使えない時は何も付けない');
  G.mainBoard[1]._activationReady=true;const ready=el();wireCardActivation(ready,G.mainBoard[1],1);
  assert.equal(ready.classList.contains('card-activation-ready'),true);
  assert.equal(ready.children.length,1);assert.equal(ready.children[0].className,'card-activation-ready-label');assert.equal(ready.children[0].textContent,'起動可');
  assert.equal(ready.children[0].tagName==='BUTTON'||ready.children[0].onclick!=null,false,'ラベルは押す物ではない');
 });
 check('ラン効果の出口：報酬/行商・再抽選権・セーブで絶対値を保つ',()=>{
  initState();const event={type:'run_effect',side:'p1',kind:'reward_buff',effects:{rewardBuff:{atk:2,hp:3},rerolls:2}};
  applyCoreRunEffectEvent(event);applyCoreRunEffectEvent(event);assert.equal(towerBoonState().rerolls,2);
  const raw=card('C006'),offers=applyRewardCharacterEffects([copy(raw)],false);assert.deepEqual([offers[0].power,offers[0].life],[raw.power+2,raw.life+3]);
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
 check('対象選択：アイテム使用中のクリックはアイテムへ、起動中にアイテムを始めると起動を外す',()=>{
  initState();G.phase='reward';G.mainBoard.fill(null);G.mainBoard[1]=card('C109');G.mainBoard[3]=card('C006');G.mainBoard[1]._activationReady=true;
  const names=['renderHandEditor','renderRewCards','updateHUD','_syncRewardProductionUi','_syncItemUsePickingUi'];
  const old=Object.fromEntries(names.map(n=>[n,globalThis[n]]));names.forEach(n=>globalThis[n]=()=>{});
  try{
   const item=makeItem('巨大化の巻物');_beginBoardItemUse(0,item);
   assert.equal(cardActivationClick(1),false,'アイテムの対象選び中は起動を始めない');assert.equal(_pendingCardActivation,null);
   G._pendingItemUse=null;
   assert.equal(cardActivationClick(1),true);assert.equal(_pendingCardActivation.card,G.mainBoard[1]);
   assert.equal(cardActivationClick(1),true,'同じカードをもう一度押すと取り消す');assert.equal(_pendingCardActivation,null);
   assert.ok(cardActivationClick(1));assert.ok(cardActivationClick(3));assert.equal(cardActivationCanUse(G.mainBoard[1]),false);
   G.mainBoard[1]._activationReady=true;assert.ok(cardActivationClick(1));_beginBoardItemUse(0,item);
   assert.equal(_pendingCardActivation,null);assert.ok(G._pendingItemUse);
  }finally{Object.assign(globalThis,old);G._pendingItemUse=null;_pendingCardActivation=null;}
 });
 check('ヘルナイトの起動は報酬枠のキャラクターも対象にできる（2026-10-23 利用者指定）',()=>{
  initState();G.phase='reward';G.activationFormationSeq=2;G.mainBoard.fill(null);
  const names=['renderHandEditor','renderRewCards','updateHUD','_persistCurrentShopStock'];
  const old=Object.fromEntries(names.map(n=>[n,globalThis[n]]));names.forEach(n=>globalThis[n]=()=>{});
  try{
   const hk=G.mainBoard[1]=card('C116'),base=[hk.power,hk.life],offer=card('C006');hk._activationReady=true;
   _rewCards=[card('E001'),offer,{...card('C008'),_questOfferCard:true}];
   assert.equal(cardActivationRewardTargetable(offer),false,'起動を選ぶ前は対象でない');
   _pendingCardActivation={card:hk,index:1,key:cardActivationVisitKey()};
   assert.equal(cardActivationRewardTargetable(offer),true);
   assert.equal(cardActivationRewardTargetable(_rewCards[0]),false,'エンチャントは対象でない');
   assert.equal(cardActivationRewardTargetable(_rewCards[2]),false,'依頼のカードは対象でない');
   assert.ok(handleCardActivationRewardTarget(1));
   assert.deepEqual([hk.power,hk.life],[base[0]+offer.power,base[1]+offer.life]);
   assert.equal(_rewCards.length,2,'戦闘報酬は詰める');assert.equal(_rewCards.includes(offer),false);
   assert.equal(cardActivationCanUse(hk),false);assert.equal(_pendingCardActivation,null);
   G._isShop=true;G._facilityCacheKey='town-hk';const ware=card('C006');_rewCards=[ware,card('C008')];
   hk._activationReady=true;_pendingCardActivation={card:hk,index:1,key:cardActivationVisitKey()};assert.ok(handleCardActivationRewardTarget(0));
   assert.equal(_rewCards[0],null,'店の品は空き枠にする');
   const sylph=G.mainBoard[2]=card('C109');_rewCards=[card('C006')];G._facilityCacheKey='town-sylph';
   _pendingCardActivation={card:sylph,index:2,key:cardActivationVisitKey()};
   assert.equal(cardActivationRewardTargetable(_rewCards[0]),false,'破壊以外の起動は報酬枠を選ばない');
  }finally{Object.assign(globalThis,old);G._isShop=false;_pendingCardActivation=null;_rewCards=[];}
 });
 check('終戦：接続エンチャント強化・回数保存・錬成の空き欄と支払い',()=>{
  for(const side of ['p1','p2'])for(const enhanced of [false,true]){
   const source=unit('C095','cat',enhanced,{_mainBoardSlot:1,_battleEndCount:3}),connected=card('E001');
   source.boardCards=[{...connected,_mainBoardSlot:2},{...card('E003'),_mainBoardSlot:4}];
   const h=setup(side,[source]);coreTriggerBattleEnd(h.state,h.emit,h.rng);
   const ev=h.events.find(e=>e.kind==='enchant_upgrade');
   assert.equal(ev.count,4);assert.equal(ev.targetSlots.length,enhanced?2:1);
   if(side==='p1'){
    initState();G.mainBoard.fill(null);G.mainBoard[1]=card('C095');G.mainBoard[2]=card('E001');G.mainBoard[4]=card('E003');
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
  const vase=card('E041',true),mirror=card('E064'),sheep=card('C057');
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
   const prepare=no=>{initState();G.phase='reward';G.mainBoard.fill(null);G.mainBoard[1]={...card('C006'),power:7,life:9};G.mainBoard[3]={...card('C007'),power:13,life:17};G.spellSlots[0]=item(no);return G.spellSlots[0];};
   let i=prepare('I005');_beginBoardItemUse(0,i);_handlePendingItemBoardTarget(1);
   assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life],[11,14]);assert.equal(G.spellSlots[0],null);
   i=prepare('I008');_beginBoardItemUse(0,i);_handlePendingItemBoardTarget(1);assert.ok(G.spellSlots[0]);_handlePendingItemBoardTarget(3);
   assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life,G.mainBoard[3].power,G.mainBoard[3].life],[13,17,7,9]);
   i=prepare('I002');G.mainBoard[1]=card('E001');_beginBoardItemUse(0,i);_handlePendingItemBoardTarget(1);_handlePendingItemBoardTarget(3);
   assert.equal(G.mainBoard[1].name,G.mainBoard[3].name);assert.equal(G.mainBoard[1].power,card('C007').power,'変身先の素の定義を使う');
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
