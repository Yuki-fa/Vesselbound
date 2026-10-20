#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {initialize}=require('./run_bot');
const {makeElement}=require('./stub');
const lookahead=require('./lookahead');
const {exchangeChoices,sacrificePlans}=require('./policies');

async function testShopExchange(api,check=(title,fn)=>{fn();console.log('OK '+title);}) {
  function fresh(){api.resetRun();initState();SaveRun.begin();G._wave=2;G._waveStage=1;G.phase='reward';G.gold=777;G._isShop=true;G._waveLife=3;G.life=3;G.mainBoard[1]=makePanel('ノーム');G.mainBoard[3]=makePanel('ゴーレム');}
  fresh();
  let calls=0;const draw=drawRewards;
  try {
    drawRewards=count=>{calls++;assert.equal(count,3);return draw(count);};
    openMapShop();const stock=clone(_rewCards);openMapVillage();openMapShop();
    check('交換店：戦闘報酬の抽選で3枚・価格なし、再訪で再抽選しない',()=>{
      assert.equal(calls,1);assert.equal(_rewCards.length,3);assert.ok(_rewCards.every(c=>c&&!('_buyPrice'in c)));assert.deepEqual(_rewCards,stock);
    });
  } finally {drawRewards=draw;}
  // 2026-10-20 利用者報告：ハイドラの「報酬に出現」がエリート・ボス戦の後の店に並んだ。店の抽選では取り出さない。
  check('店の抽選：追加報酬（ハイドラ）は取り出さず、戦闘報酬の抽選だけが取り出す（余りは失わない）',()=>{
    G._bonusRewardPanels=Array.from({length:5},()=>makePanel('ノーム'));
    const shop=drawRewards(3);assert.equal(shop.length,3);assert.equal(G._bonusRewardPanels.length,5,'店では取り出さない');
    const reward=drawRewards(3,{bonus:true});assert.equal(reward.length,3);assert.equal(G._bonusRewardPanels.length,2,'報酬は3枚取り出し、余りを残す');
    G._bonusRewardPanels=[];
    // 報酬の無い戦闘（エリート・ボス）の残りは、次の戦闘の開始時に捨てる。
    assert.match(require('fs').readFileSync(require('path').join(__dirname,'../../js/engine/battle.js'),'utf8'),/if\(!carryBattle\) G\._bonusRewardPanels=\[\];/);
  });
  const first=makePanel('ラミア'),out=G.mainBoard[1];_rewCards=[first,makePanel('ノーム'),makePanel('ゴーレム')];
  const money=G.gold,count=G.mainBoard.filter(Boolean).length;
  check('交換店：空きマス・クリック単独でカードを取得しない',()=>{
    assert.equal(canExchangeShopCardAt(0,0),false);takeRewCard(0,0);takeRewCard(0);
    const create=document.createElement;let accepted=false;
    try {
      document.createElement=tag=>{const el=makeElement(tag);el.listeners={};el.addEventListener=(kind,fn)=>{el.listeners[kind]=fn;};return el;};
      const host=makeElement();_renderHeEmptySlot(host,'boardCards',0,_boardSlotDef(0,_getPartyBoardUnit()),0,0,0);_dragSrc={arr:'rew',idx:0};
      host.children[0].listeners.dragover({preventDefault(){accepted=true;}});assert.equal(accepted,false,'空きマスの実リスナーも受け付けない');
    }finally{document.createElement=create;_dragSrc=null;}

    assert.equal(G.mainBoard.filter(Boolean).length,count);assert.equal(_rewCards[0],first);assert.ok(!G._pendingPanelPlacement);assert.equal(G.gold,money);
  });
  check('交換店：既存ドラッグ判定とドロップで入れ替え、同じ枠から取り戻せる',()=>{
    _dragSrc={arr:'rew',idx:0};assert.equal(_boardDropAllowedAt(1),true);dropOnCard('boardCards',1);
    assert.equal(G.mainBoard[1].name,first.name);assert.equal(_rewCards[0].name,out.name);assert.equal(G.gold,money);
    _dragSrc={arr:'rew',idx:0};dropOnCard('boardCards',1);
    assert.equal(G.mainBoard[1].name,out.name);assert.equal(_rewCards[0].name,first.name);assert.equal(G.mainBoard.filter(Boolean).length,count);
  });
  const enchant=makePanel(PANEL_POOL.find(c=>['エンチャント','強化'].includes(c.category)&&!_cardIsEngraved(c)&&!_isSealPanel(c)).id);
  _rewCards[0]=enchant;
  check('交換店：キャラと強化の相互交換、同名でも1対1を維持する',()=>{
    assert.equal(exchangeShopCard(0,1),true);assert.equal(G.mainBoard[1].category,enchant.category);
    assert.equal(exchangeShopCard(0,1),true);assert.equal(G.mainBoard[1].name,out.name);
    _rewCards[0]=makePanel('ノーム');assert.equal(exchangeShopCard(0,1),true);assert.equal(_rewCards[0].name,'ノーム');assert.equal(G.mainBoard.filter(Boolean).length,count);
  });
  check('交換店：刻印・依頼枠の制限を保ち、売却ドラッグ先を受け付けない',()=>{
    G.mainBoard[0]=makePanel(PANEL_POOL.find(c=>c.no==='E066').id);
    assert.equal(canExchangeShopCardAt(0,0),false);
    _dragSrc={arr:'boardCards',idx:1};assert.equal(_canReturnDragSrcToRewardArea(),false);
    const board=clone(G.mainBoard),stock=clone(_rewCards);_returnDragSrcToRewardArea();assert.deepEqual(G.mainBoard,board);assert.deepEqual(_rewCards,stock);_dragSrc=null;
    const accept=questRewardSlotAcceptsCard;try{questRewardSlotAcceptsCard=()=>false;assert.equal(canExchangeShopCardAt(0,1),false);}finally{questRewardSlotAcceptsCard=accept;}
  });
  check('カード換金：全施設・通常報酬・旧返品印・旧売却待ちからゴールドを得られない',()=>{
    for(const flags of [{},{_isShop:true},{_isShop:true,_isItemShop:true},{_isShop:true,_isPeddler:true},{_isForge:true},{_debugMode:true}]){
      initState();Object.assign(G,{phase:'reward',gold:123},flags);const card=makePanel('ノーム');G.mainBoard[1]=card;
      card._shopBuy={key:_shopPurchaseKey(),price:500,idx:0,card:clone(card)};
      assert.equal(_boardCardSellEnabled(card),false);assert.equal(_shopCardSellGain(card),0);assert.equal(isShopReturnable(card),false);assert.equal(returnShopPurchase(card,()=>{G.mainBoard[1]=null;}),false);
      _rewCards=[{...card,_shopSalePending:true,_sellDisplayPrice:999}];assert.equal(_sellPendingShopCard(0),false);G.spellSlots=[clone(card),null,null,null];assert.equal(_sellHeldItem(0),false);assert.equal(G.gold,123);assert.equal(G.mainBoard[1],card);
      const button=makeElement('button'),host=makeElement();button.classList.contains=c=>c==='shop-board-sell-action';host.querySelector=()=>button;
      _wireHeCardDiscard(host,card,G.mainBoard,'boardCards',1,false);button.onclick({stopPropagation(){}});assert.equal(G.mainBoard[1],card);assert.equal(G.gold,123);
    }
  });
  fresh();openMapItemShop();G.gold=10000;
  check('道具の購入：購入代金・返品の全額返金を維持し、売却はできない（2026-10-18）',()=>{
    const price=_rewCards[0]._buyPrice,gold=G.gold;takeRewCard(0);
    const slot=G.spellSlots.findIndex(Boolean),held=G.spellSlots[slot];
    assert.ok(held);assert.equal(G.gold,gold-price);assert.equal(isShopReturnable(held),true);
    assert.equal(returnShopPurchase(held,()=>{G.spellSlots[slot]=null;}),true);assert.equal(G.gold,gold);
    const item=clone(ITEM_POOL.find(c=>c.type==='consumable'));G.spellSlots[0]=item;
    assert.equal(_sellHeldItem(0),false);assert.equal(G.gold,gold);assert.equal(G.spellSlots[0],item);
  });
  fresh();G._onlineMode=true;openMapShop();
  check('オンラインの店：従来の価格付き5枠・カード売却・空きマス購入・返品を維持する',()=>{
    assert.equal(_isCardExchangeShop(),false);assert.equal(_rewCards.length,5);assert.ok(_rewCards.filter(Boolean).every(c=>c._buyPrice>0));
    const card=makePanel('ラミア');card._buyPrice=80;_rewCards=[card,null,null,null,null];const gold=G.gold;
    _dragSrc={arr:'rew',idx:0};assert.equal(_boardDropAllowedAt(1),false);_dragSrc=null;
    takeRewCard(0,4);const purchased=G.mainBoard[4];assert.equal(purchased.name,card.name);assert.equal(G.gold,gold-80);assert.equal(isShopReturnable(purchased),true);
    assert.equal(returnShopPurchase(purchased,()=>{G.mainBoard[4]=null;}),true);assert.equal(G.gold,gold);assert.equal(_rewCards[0].name,card.name);
    const sold=G.mainBoard[1],gain=goldIncomeAmount(_shopCardSellGain(sold));assert.equal(_boardCardSellEnabled(sold),true);
    const button=makeElement('button'),host=makeElement();button.classList.contains=c=>c==='shop-board-sell-action';host.querySelector=()=>button;
    _wireHeCardDiscard(host,sold,G.mainBoard,'boardCards',1,false);button.onclick({stopPropagation(){}});assert.equal(G.mainBoard[1],null);assert.equal(G.gold,gold+gain);
    _dragSrc={arr:'boardCards',idx:3};assert.equal(_canReturnDragSrcToRewardArea(),true);_dragSrc=null;
    const pending=makePanel('ノーム');pending._shopSalePending=true;_rewCards[0]=pending;const current=G.gold;
    const pendingGain=goldIncomeAmount(_shopCardSellGain(pending));assert.equal(_sellPendingShopCard(0),true);assert.equal(G.gold,current+pendingGain);
    assert.equal(ringExchangeDepartureBlocked(),false);
  });
  fresh();openMapShop();_rewCards[0]=makePanel('ラミア');exchangeShopCard(0,1);const changed=clone(_rewCards),board=clone(G.mainBoard),gold=G.gold;
  check('セーブ：交換した枠・盤面・ゴールドを保存して復元し、再訪でも維持する',()=>{
    const save=SaveRun.buildRunSave('town');SaveRun.restoreRunState(save);assert.deepEqual(_rewCards,changed);assert.deepEqual(G.mainBoard,board);assert.equal(G.gold,gold);
    openMapVillage();openMapShop();assert.deepEqual(_rewCards,changed);assert.deepEqual(G.mainBoard,board);
  });
  check('セーブ：旧価格付き5枠を3枠へ移行し、再復元・再訪で固定する',()=>{
    const legacy=SaveRun.buildRunSave('town'),five=Array.from({length:5},()=>({...makePanel('ノーム'),_buyPrice:80}));
    legacy.state.choices._waveShopStock[2]=clone(five);legacy.state.reward.cards=clone(five);
    SaveRun.restoreRunState(legacy);assert.equal(_rewCards.length,3);assert.ok(_rewCards.every(c=>!('_buyPrice'in c)));
    const stock=clone(_rewCards),newSave=SaveRun.buildRunSave('town');SaveRun.restoreRunState(newSave);openMapShop();assert.deepEqual(_rewCards,stock);assert.equal(G.gold,gold);
  });
  check('交換の評価候補：資金なし・満員でも売却せず既存カードへ交換する',()=>{
    G.gold=0;G.mainBoard.fill(null);for(const slot of [1,3,10,12,14])G.mainBoard[slot]=makePanel('ノーム');
    _rewCards=[makePanel('ラミア'),enchant,makePanel('ゴーレム')];
    assert.ok(exchangeChoices('greedy',{color:''}).some(c=>[1,3,10,12,14].includes(c.slot)&&c.gain>0));
  });
  const before=structuredClone(G),offers=clone(_rewCards),original=G;
  await lookahead.chooseExchange({color:''});
  check('先読み：全交換候補の試し打ち後にG・提示・ゴールド・乱数を復元する',()=>{assert.equal(G,original);assert.deepEqual(G,before);assert.deepEqual(_rewCards,offers);});
  fresh();G._isShop=false;G._isWaveAltar=true;G._waveStage=_waveRouteForWave(2).indexOf('altar')+1;G.mainBoard[0]=clone(enchant);G.mainBoard[2]=clone(enchant);
  check('祭壇：未取得では出発・直接進行が止まり、理由を渡す',()=>{
    assert.equal(ringExchangeDepartureBlocked(),true);const show=showErrorOverlay,messages=[];
    try{showErrorOverlay=options=>messages.push(options);const state=structuredClone(G);assert.equal(villageDepart(),false);assert.equal(departWithWorldMap(),false);assert.equal(shopDone(),false);assert.equal(_startWaveFlowNext(),false);assert.deepEqual(G,state);assert.ok(messages.every(m=>m.message===SHOP_EXCHANGE_TRIAL.text.ringRequired));}finally{showErrorOverlay=show;}
  });
  openMapRingExchange();const plan=sacrificePlans('greedy',{color:''})[0];assert.ok(plan);
  for(const slot of plan.sacrifice)_discardBoardCardForRingOffer(slot,G.mainBoard[slot]);
  check('祭壇：3枚捧げただけでは進めず、指輪の取得で解除して保存する',()=>{
    assert.equal(G._boardDiscardCount,3);assert.equal(ringExchangeDepartureBlocked(),true);assert.equal(api.takeRing(0),true);assert.equal(ringExchangeDepartureBlocked(),false);
    _syncWaveFacilityCache();const save=SaveRun.buildRunSave('tower');SaveRun.restoreRunState(save);assert.equal(ringExchangeDepartureBlocked(),false);openMapVillage({tower:true});assert.equal(ringExchangeDepartureBlocked(),false);
  });
  check('祭壇：枚数不足・出撃キャラを残せない時だけ進め、別の塔では再度必須になる',()=>{
    G._wave=3;G._isWaveAltar=true;G._isRingExchange=false;G.mainBoard.fill(null);G.mainBoard[1]=makePanel('ノーム');G.mainBoard[0]=clone(enchant);
    assert.equal(ringExchangeDepartureBlocked(),false);G.mainBoard[2]=clone(enchant);assert.equal(ringExchangeDepartureBlocked(),false);
    G.mainBoard[4]=clone(enchant);assert.equal(ringExchangeDepartureBlocked(),true);
    G._onlineMode=true;assert.equal(ringExchangeDepartureBlocked(),false);G._onlineMode=false;
    G._isWaveAltar=false;assert.equal(ringExchangeDepartureBlocked(),false);
  });
  fresh();G._isShop=false;G._isWaveAltar=true;G.mainBoard[0]=clone(enchant);G.mainBoard[2]=clone(enchant);openMapRingExchange();
  const chosen=await lookahead.chooseRing({color:''});
  check('先読みの祭壇：戦力との損得で見送らず還魂・指輪取得の実行案を返す',()=>{
    assert.ok(chosen?.action);assert.equal(chosen.action.sacrifice.length,3);assert.equal(lookahead.apply(chosen.action),true);assert.equal(G._ringOfferResolved,true);assert.equal(ringExchangeDepartureBlocked(),false);
  });
  fresh();G._isShop=false;G._isWaveAltar=true;G.mainBoard[0]=clone(enchant);G.mainBoard[2]=clone(enchant);openMapRingExchange();
  G.rings=RING_POOL.slice(0,4).map(clone);
  const full=await lookahead.chooseRing({color:''});
  check('指輪枠が満員：本体の捨てる操作で空け、必須の交換を完了する',()=>{
    assert.ok(full?.action&&Number.isInteger(full.action.replaceRing));assert.equal(lookahead.apply(full.action),true);
    assert.equal(G._ringOfferResolved,true);assert.equal(G.rings.filter(Boolean).length,4);assert.equal(ringExchangeDepartureBlocked(),false);
  });

}
if(require.main===module)initialize().then(api=>testShopExchange(api)).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testShopExchange};
