'use strict';
// 内蔵CSV→本番の対象選択・編成→共通コア→オンライン・保存フレーム・ラン保存を検査する。
// ブラウザの見た目と聴感は検査しない。
const {assert,sheet,copy,plain,harness,initRun,pipelines}=require('./rules_1026_harness');
const vm=require('node:vm'),{execFileSync}=require('node:child_process');
const {makeElement}=require('./stub');
const BASELINE='1c2373079e7c006ed420d391b39633c16763e487'; // effects-1026c 作業開始時の main
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
const card=(no,enhanced=false)=>{const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);const c=makePanel(def.id);return enhanced?enhancedPanelCopy(c):c;};
const ring=no=>copy(RING_POOL.find(c=>c.no===no));
const item=no=>makeItem(ITEM_POOL.find(c=>'I'+String(c.no).padStart(3,'0')===no).id);
function fresh(){initRun();G.mainBoard.fill(null);G.spellSlots.fill(null);_rewCards=[];_pendingCardActivation=null;_blessingFlameVisit=null;}
function ready(no,enhanced=false){fresh();const c=G.mainBoard[1]=card(no,enhanced);c._activationReady=true;return c;}
function openActivation(){assert.equal(cardActivationClick(1),true);assert.ok(_pendingCardActivation);}
function roundtrip(){const before=copy(G.mainBoard),save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(copy(save));assert.deepEqual(G.mainBoard,before);}
const opening=h=>coreRunOpening(h.state,h.rng,h.emit,h.hit,()=>{});
(async()=>{
 console.table=()=>{};await loadGameData();
 renderHandEditor=()=>{};renderRewCards=()=>{};updateHUD=()=>{};_syncRewardProductionUi=()=>{};_syncRewardProductionItems=()=>{};
 _storeRewardStartSnapshot=()=>{};_playActivationFx=()=>{};_playItemUseVfx=()=>{};requestBattleCompact=()=>{};
 await check('1 I002：2枚ともキャラクターだけ。ATK/HP・進行印を保持、2枚目の無強化定義へ変身、キャンセル・保存',()=>{
  fresh();const before=G.mainBoard[1]=card('C016',true),donor=G.mainBoard[3]=card('C084',true);
  before.power=47;before.life=61;before._activationReady=true;before._battleEndCount=2;before._placeKey='original';
  G.mainBoard[2]=card('E001');const donorBefore=copy(donor),scroll=G.spellSlots[0]=item('I002');
  assert.equal(_canUseItemNow(scroll),true);_useImmediateItem(0,scroll);assert.equal(_isItemUseTargetSlot(2),false);
  handlePendingItemBoardTarget(2);assert.equal(G._pendingItemUse.firstIdx,undefined);
  handlePendingItemBoardTarget(1);assert.equal(_isItemUseTargetSlot(1),true,'1枚目を押して選択だけ解除できる');_cancelPendingItemUse();assert.ok(G.spellSlots[0]);
  _useImmediateItem(0,G.spellSlots[0]);handlePendingItemBoardTarget(1);handlePendingItemBoardTarget(3);
  const next=G.mainBoard[1],definition=PANEL_POOL.find(c=>c.no==='C084');
  assert.deepEqual([next.power,next.life],[47,61]);for(const key of ['name','no','art','desc'])assert.equal(next[key],definition[key],key);
  assert.deepEqual(next.keywords,definition.keywords);for(const key of ['_merged','_tripleMerged','_mergedFormApplied'])assert.ok(!next[key],key);
  assert.deepEqual(G.mainBoard[3],donorBefore);assert.equal(next._placeKey,'original');assert.ok(next._activationReady);assert.equal(next._battleEndCount,2);
  assert.equal(G.spellSlots[0],null);roundtrip();
  fresh();G.mainBoard[1]=card('C006');G.mainBoard[2]=card('E001');assert.equal(_canUseItemNow(item('I002')),false);
 });
 for(const side of ['p1','p2'])await check(`2 R019/${side}：開戦のHP倍率・R024の追加発動・既存VFX識別子、召喚へ常時付与しない`,async()=>{
  for(const extra of [false,true]){
   const h=harness(side,[plain('source'),plain('ally')],{rings:{[side]:[ring('R019'),...(extra?[ring('R024')]:[])]}});
   assert.equal(h.u.hp,100);opening(h);assert.equal(h.u.hp,extra?400:200);
   const events=h.events.filter(e=>e.reason==='paladin_ring');assert.equal(events.length,extra?4:2);
   assert.equal(new Set(events.map(e=>e.fxBatch)).size,extra?2:1);
   assert.equal(presentActionBannerSource(events[0],{card:no=>ring(no),unit:()=>h.u,hint:()=>null,immediateDamageSource:()=>null,ringDamage:()=>null})?.card.no,'R019');
   assert.equal(presentLabEffectEvents(events,0,'R019','').length,2);
   const child=coreSummonUnit(h.state,side,{name:'later',atk:2,hp:7,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);assert.equal(child.hp,7);
   await pipelines(h.initial);
  }
 });
 for(const side of ['p1','p2'])await check(`3 C016/${side}：本人以外へ通常1波・強化2波、各波で全員確定後に誘発`,async()=>{
  for(const enhanced of [false,true]){
   const c=card('C016',enhanced),u={...plain('source'),name:c.name,no:c.no,desc:c.desc};
   const h=harness(side,[u,plain('ally')]);coreApplyAttackEffects(h.u,h.state,h.rng,h.emit,h.hit);
   const hits=h.events.filter(e=>e.type==='damage');assert.equal(hits.length,(enhanced?2:1)*4);
   assert.ok(hits.every(e=>e.unitId!=='source'&&e.amount===1));assert.equal(new Set(hits.map(e=>e.batch)).size,enhanced?2:1);
   await pipelines(h.initial);
  }
 });
 await check('4 C084：通常は本人と1枚、強化は任意の2枚。魔導板・報酬・商品へ同じ規則、能力だけ交換して保存',()=>{
  for(const enhanced of [false,true])for(const zone of ['board','reward','shop']){
   const source=ready('C084',enhanced);source.power=4;source.life=9;
   const first=G.mainBoard[3]=card('C006');first.power=17;first.life=23;
   const second=card('C007');second.power=31;second.life=43;
   if(zone==='board')G.mainBoard[8]=second;else{_rewCards=[second];if(zone==='shop')G._isShop=true;}
   openActivation();
   if(enhanced){handleCardActivationTarget(3);assert.ok(source._activationReady);assert.equal(_pendingCardActivation.firstTarget.card,first);}
   if(zone==='board')handleCardActivationTarget(8);else{assert.ok(cardActivationRewardTargetable(second));handleCardActivationRewardTarget(0);}
   const other=enhanced?first:source;assert.deepEqual([other.power,other.life],[31,43]);assert.deepEqual([second.power,second.life],enhanced?[17,23]:[4,9]);
   assert.equal(source.no,'C084');assert.equal(second.no,'C007');assert.ok(!source._activationReady);assert.equal(_pendingCardActivation,null);roundtrip();
  }
 });
 await check('5 C080：通常はキャラ限定・強化はエンチャントも可、全区域を両順序で交換。枚数・使用印・配置規則・報酬枠を保持',()=>{
  for(const enhanced of [false,true])for(const zones of [['board','board'],['board','reward'],['reward','board'],['reward','reward']])for(const shop of [false,true]){
   const source=ready('C080',enhanced),a=card('C006'),b=card(enhanced?'E001':'C007');
   a._placeKey='a';b._placeKey='b';G._isShop=shop;G._rewardOnePickMode=!shop;
   const places=zones.map((zone,i)=>({zone,index:zone==='board'?3+i:i}));
   places.forEach((p,i)=>{(p.zone==='board'?G.mainBoard:_rewCards)[p.index]=i?b:a;});
   const before=G.mainBoard.filter(Boolean).length+_rewCards.filter(Boolean).length;
   openActivation();for(const p of places)(p.zone==='board'?handleCardActivationTarget:handleCardActivationRewardTarget)(p.index);
   assert.equal((places[0].zone==='board'?G.mainBoard:_rewCards)[places[0].index].no,b.no);
   assert.equal((places[1].zone==='board'?G.mainBoard:_rewCards)[places[1].index].no,a.no);
   assert.equal(G.mainBoard.filter(Boolean).length+_rewCards.filter(Boolean).length,before);assert.ok(!source._activationReady);
   if(!shop&&zones.includes('board')&&zones.includes('reward'))assert.ok(_rewCards.find(c=>c?._isOriginalReward));
   roundtrip();
  }
  const source=ready('C080');G.mainBoard[3]=card('E001');_rewCards=[card('E002')];openActivation();
  assert.equal(cardActivationBoardTargetable(G.mainBoard[3],3),false);assert.equal(cardActivationRewardTargetable(_rewCards[0]),false);cancelCardActivation();
  // 発生元の再クリックは、1枚目を選んだ後でも使用全体の取り消し。
  const origin=ready('C080');_rewCards=[card('C006')];G._rewardOnePickMode=true;openActivation();handleCardActivationRewardTarget(0);handleCardActivationTarget(1);
  assert.equal(G.mainBoard[1],origin);assert.ok(origin._activationReady);assert.equal(_rewCards[0].no,'C006');assert.equal(_pendingCardActivation,null);
  _rewFreePickDone=true;_rewCards[0]._isOriginalReward=true;const owned=G.mainBoard.filter(Boolean).length;takeRewCard(0,3);assert.equal(G.mainBoard.filter(Boolean).length,owned);assert.equal(_rewCards[0].no,'C006');
 });
 await check('6 全起動：魔導店・行商人・道具屋・鍛冶屋で使用可。獲得直後・未充填・非編成中は不可',()=>{
  for(const def of PANEL_POOL.filter(c=>c.category==='キャラクター'&&coreUnitTriggerText(c,'起動'))){
   for(const flag of ['_isShop','_isPeddler','_isItemShop','_isForge']){
    const source=ready(def.no);G[flag]=true;assert.ok(cardActivationCanUse(source),def.no+'/'+flag);
    delete source._activationReady;assert.equal(cardActivationCanUse(source),false);chargeBoardCardActivations();assert.ok(cardActivationCanUse(source));
    G.phase='player';assert.equal(cardActivationCanUse(source),false);
   }
  }
 });
 await check('7 塔の祝福の炎：選択前から移動・アイテム操作可、対象選びと祝福選択が競合しない',()=>{
  fresh();G._isBlessingFlame=true;_blessingFlameVisit={key:'test',selected:-1,preview:null,executed:false,busy:false};
  G.mainBoard[1]=card('C006');assert.equal(blessingFlameMoveAllowed(),true);
  const blocked=selector=>{let count=0;const target={closest:s=>s==='#scr-battle'||s.split(',').includes(selector)?{}:null};
   blessingFlameBlockInput({type:'click',target,preventDefault(){count++;},stopImmediatePropagation(){count++;}});return count;};
  assert.equal(blocked('.reward-prod-item'),0);assert.equal(blocked('#kw-tooltip'),0);
  assert.equal(blocked('#reward-offer-row'),2,'祝福プレビューは取得できない');
  const scroll=G.spellSlots[0]=item('I013');_useImmediateItem(0,scroll);
  blessingFlameBlockInput({type:'contextmenu',target:{closest:s=>s==='#scr-battle'?{}:null},
   preventDefault(){assert.fail('共通のアイテム取り消しを妨げない');},stopImmediatePropagation(){}});
  const el=makeElement('div');el.draggable=true;_wireHeCardControls(el,G.mainBoard[1],'boardCards',1);
  assert.equal(el.draggable,false,'アイテムの対象選び中は祝福の炎でもドラッグを止める');el.onclick({stopPropagation(){}});assert.equal(G.spellSlots[0],null);assert.equal(_blessingFlameVisit.selected,-1);
  assert.equal(blessingFlameSelect(1),true);assert.ok(_blessingFlameVisit.preview);assert.equal(blessingFlameMoveAllowed(),true);
  const render=renderHandEditor;let redrawn=0;renderHandEditor=()=>{redrawn++;};
  try{blessingFlameBlockInput({type:'dragstart',target:{closest:s=>s==='#scr-battle'||s==='#hand-slots'?{}:null},
    preventDefault(){assert.fail('祝福前の移動を阻止しない');},stopImmediatePropagation(){}});
    assert.equal(redrawn,0,'ドラッグ元のDOMを描き直さない');assert.equal(_blessingFlameVisit.preview,null);
  }finally{renderHandEditor=render;}

  _blessingFlameVisit.busy=true;assert.equal(blessingFlameMoveAllowed(),false);
 });
 await check('8 即死：通常PvEのイベント受け口と保存frameが敵の配分額を一度だけ支払い、ラン保存・再生でも一致',async()=>{
  fresh();const enemies=[plain('enemy',{goldRange:[43,43],_goldPlanned:true,hp:0}),plain('alive')];
  G.allies=[plain('source')];G.enemies=enemies;G.gold=100;
  const state=createBattleState({sides:{p1:{units:G.allies},p2:{units:enemies}},resources:{p1:{gold:100,mana:0}}});
  G.allies=state.units.p1;G.enemies=state.units.p2;G.enemies[0].hp=0;G.enemies[0].goldRange=[43,43];G.enemies[0]._goldPlanned=true;
  const ev={type:'instant_death',side:'p2',unitId:'enemy',sourceId:'source'};
  await _flushCorePveHitEvents(state,[ev]);assert.equal(G.gold,143);assert.equal(state.resources.p1.gold,143);
  await _flushCorePveHitEvents(state,[ev]);assert.equal(G.gold,143);
  roundtrip();assert.equal(G.gold,143);
  fresh();const cock=card('C066');cock.desc=cock.desc.replace(/\d+%/,'100%');
  const h=harness('p1',[{..._makePanelSummonUnit(_panelSummonSpec(cock),[]),id:'source',atk:5,hp:100,maxHp:100}],{foes:[plain('enemy',{goldRange:[43,43],_goldPlanned:true})],resources:{p1:{gold:100,mana:4}}});
  const stage=_enemyGoldSegments(1).flat()[0].stage;
  assert.ok(applyEnemyGoldPlan(h.initial.units.p2,1,stage));
  const planned=h.initial.units.p2[0].goldRange[0];assert.ok(planned>0);
  const saved=SaveRun.computeBattle(copy(h.initial),1026),instant=saved.events.find(e=>e.type==='instant_death');
  assert.ok(instant);assert.equal(instant.pveRewardGold,planned);assert.equal(saved.finalState.resources.p1.gold,100+planned);
  assert.equal(saved.events.filter(e=>e.pveRewardGold>0).length,1);assert.deepEqual(SaveRun.computeBattle(copy(saved.setup),1026),saved);
  assert.deepEqual(SaveRun.unpackBattleEvents(copy(SaveRun.packBattleEvents(saved))),saved);
  // 保存フレームの実再生でも同じ支払い入口を通す。
  fresh();SaveRun.installSetup(saved);G._savedBattleReplaying=true;
  const dead=G.enemies.find(u=>u.id==='enemy');dead.hp=0;
  const replayState={...copy(saved.setup),units:{p1:G.allies,p2:G.enemies}};
  await _flushCorePveHitEvents(replayState,[instant]);assert.equal(G.gold,100+planned);
  SaveRun.recordDeath(dead,'p2',{type:'death',pveRewardGold:planned});assert.equal(G.gold,100+planned);G._savedBattleReplaying=false;
  fresh();SaveRun.installSetup(saved);G._battleRunId=1026;G._battleCoreEvents=[];
  const finish=finishBattleAsVictory;
  finishBattleAsVictory=async()=>SaveRun.applyEnd({units:{p1:G.allies,p2:G.enemies}});
  try{await SaveRun.replay(saved,1026);assert.equal(G.gold,100+planned);}finally{finishBattleAsVictory=finish;}

 });
 await check('9 I013：4ポートのdirectionsまたはdirectionCountは選択不可・暗転対象、消費・乱数なし',()=>{
  fresh();G.mainBoard[1]=card('C006');G.mainBoard[3]=card('C007');G.mainBoard[1].directions=['up','right','down','left'];G.mainBoard[1].directionCount=4;
  G.spellSlots[0]=item('I013');_useImmediateItem(0,G.spellSlots[0]);
  assert.equal(_isItemUseTargetSlot(1),false);const before=copy(G.mainBoard),rng=G._runRngState;
  handlePendingItemBoardTarget(1);assert.deepEqual(G.mainBoard,before);assert.equal(G._runRngState,rng);assert.ok(G.spellSlots[0]);
  G.mainBoard[1].directions=['up'];assert.equal(_isItemUseTargetSlot(1),false);_cancelPendingItemUse();
 });
 await check('10 説明列だけを表示、E011は効果ダメージのあるキャラだけ。懺悔4×2・正負の熟練補正が表示と計算で一致',async()=>{
  for(const side of ['p1','p2'])for(const enhanced of [false,true]){
   fresh();G.mainBoard[1]=card('C006');G.mainBoard[1].desc='';G.mainBoard[1].keywords=['熟練2'];G.mainBoard[1].directions=['up','right','down','left'];
   G.mainBoard[0]=card('E011',enhanced);G.mainBoard[0].directions=['right'];
   G.mainBoard[2]=card('E037');G.mainBoard[2].directions=['left'];
   const board=_getPartyBoardUnit(),enh=_collectAdjacentEnhancements(board,1);
   let preview={...G.mainBoard[1],boardCards:G.mainBoard,_ownedBoardPreview:true};
   let text=_unitPreviewText(preview,'',1);const power=coreEffectDamagePowerBonus({...preview,_adjacentPanelEffectTexts:enh.effectTexts});
   assert.match(text,new RegExp(`このキャラクターは${1+power}ダメージを2回受ける`));assert.ok(text.includes(`効果ダメージの威力が+${power}された。`));
   assert.ok(!text.includes('このキャラクターが与える効果ダメージの威力は'));
   const formed=buildBoardFormation(board,{persistEternal:false}).entries.find(e=>e.slotIdx===1).unit;
   formed.effectData={releaseAtkBonus:0,releaseHpBonus:0,...formed.effectData};
   const h=harness(side,[{...formed,id:'source',hp:100,maxHp:100}]);coreApplyAttackEffects(h.u,h.state,h.rng,h.emit,h.hit);
   assert.deepEqual(h.events.filter(e=>e.type==='damage'&&e.unitId==='source').map(e=>e.amount),[1+power,1+power]);
   h.u.desc='開戦：全ての味方は+2/+3を得る。';h.u._adjacentPanelEffectTexts.push(sheet.effectText('E052',enhanced));
   const skill=2+Number(sheet.effectText('E052',enhanced).match(/値は(\d+)/)[1]);
   assert.ok(_unitPreviewText(h.u,h.u.desc,1).includes(`+${2+skill}/+${3+skill}`));
   assert.equal(coreStatBonus(h.u,-2,h.u),-2-skill);
   assert.ok(_unitCombinedDescHtml(h.u,'負傷：ランダムな敵はATK-2を得る。',1).includes(`ATK-${2+skill}`));
   // 接続キャラクターがダメージ効果を失えばE011の説明も消える。
   G.mainBoard[2]=null;preview={...G.mainBoard[1],boardCards:G.mainBoard,_ownedBoardPreview:true};
   assert.ok(!_unitPreviewText(preview,'',1).includes('魔術の知識'));
   G.mainBoard[2]=card('E070');G.mainBoard[2].directions=['left'];assert.ok(!_unitPreviewText(preview,'',1).includes('魔術の知識'));
   await pipelines(h.initial);
  }
  fresh();G.mainBoard[1]=card('C006');G.mainBoard[1].desc='';G.mainBoard[1].directions=['up','right','down','left'];
  for(const no of sheet.sheetRows('enchant').filter(r=>r['キャラクター用説明文']&&r['No.']!=='E011').map(r=>r['No.'])){
   const p=G.mainBoard[0]=card(no);p.directions=['right'];
   const preview={...G.mainBoard[1],boardCards:G.mainBoard,_ownedBoardPreview:true};
   const grouped=_groupedEnchantEffectTexts(preview,1);assert.equal(grouped.normalTexts.length,0,no+' は効果文を重ねない');assert.ok(grouped.charTexts.length>0,no);
   delete p.characterDesc;assert.ok(_groupedEnchantEffectTexts(preview,1).charTexts.length>0,no+' オンラインの説明列補完');
  }
 });
 await check('非対象：開始時mainのコアと全通常・強化本文、指輪、戦闘アイテムの結果・全イベント・最終状態・次の乱数が完全一致',()=>{
  const source=execFileSync('git',['show',`${BASELINE}:prototype/js/battle/core.js`],{encoding:'utf8',maxBuffer:2e6}),sandbox={module:{exports:{}}};vm.runInNewContext(source,sandbox);
  const baseline=sandbox.module.exports,current=require('../../js/battle/core');let compared=0;
  const run=(api,input,seed)=>{const state=api.createBattleState(copy(input)),events=[],rng=createSeededRng(seed);const result=api.runBattleCore(state,rng,{turnLimit:6,onEvent:e=>events.push(e)});return copy({result,events,finalState:api.battleCoreFinalState(state),nextRandom:rng.next()});};
  const base=own=>({sides:{p1:{units:[own,plain('ally')]},p2:{units:[plain('foe',{hp:5,maxHp:5}),plain('foe2')]}},resources:{p1:{gold:800,mana:8}},summonDefs:PANEL_POOL});
  for(const row of [...sheet.sheetRows('card'),...sheet.sheetRows('enchant')])for(const enhanced of [false,true])for(const seed of [1,1026]){
   if(row['No.']==='C016'&&enhanced)continue;
   const def=PANEL_POOL.find(c=>c.no===row['No.']);if(!def)continue;
   const c={...copy(def),desc:(enhanced?row['強化効果']:'')||row['効果']||''};
   const own=def.category==='キャラクター'?{..._makePanelSummonUnit(_panelSummonSpec(c),[]),id:'source',atk:10,hp:70,maxHp:70}:plain('source',{_adjacentPanelEffectTexts:[c.desc],boardCards:[c]});
   assert.deepEqual(run(current,base(own),seed),run(baseline,base(own),seed),`${row['No.']}/${enhanced}/${seed}`);compared++;
  }
  for(const r of RING_POOL.filter(r=>r.no!=='R019')){const input={...base(plain('source')),rings:{p1:[r]}};assert.deepEqual(run(current,input,1026),run(baseline,input,1026),r.no);compared++;}
  for(const i of ITEM_POOL){const input={...base(plain('source')),items:{p1:[i]}};assert.deepEqual(run(current,input,1026),run(baseline,input,1026),i.no);compared++;}
  assert.ok(compared>800);console.log(`  ${compared}ケース完全一致（main ${BASELINE.slice(0,7)}）`);
 });
 console.log(`effects_1026c: OK ${passed} / NG ${failed}`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
