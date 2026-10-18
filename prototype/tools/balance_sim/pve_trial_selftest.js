#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {initialize}=require('./run_bot'),{source}=require('./bot_runtime'),{makeElement}=require('./stub');
function element(tag){
  const el=makeElement(tag),classes=new Set();el.listeners={};
  el.classList={add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains:n=>classes.has(n),
    toggle(n,on){if(on===undefined)on=!classes.has(n);if(on)classes.add(n);else classes.delete(n);return on;},[Symbol.iterator]:()=>classes.values()};
  el.addEventListener=(name,fn)=>{el.listeners[name]=fn;};
  el.insertBefore=child=>el.appendChild(child);el.matches=sel=>sel.split(',').some(s=>s.startsWith('.')&&classes.has(s.slice(1)));
  return el;
}
async function testPveTrial(api,check=(name,fn)=>{fn();console.log('OK '+name);}){
  function fresh(){api.resetRun();initState();SaveRun.begin();G.phase='reward';G._wave=2;G._waveStage=1;G._waveLife=3;G.gold=800;
    G.mainBoard[1]=makePanel('ノーム');G.mainBoard[3]=makePanel('ゴーレム');_rewCards=['ラミア','ノーム','ゴーレム'].map(makePanel);}
  for(const peddler of [false,true]){
    fresh();G._isShop=true;G._isPeddler=peddler;
    const query=document.querySelectorAll,create=document.createElement;
    try{
      document.createElement=element;
      const offer=_mkRewDiv(_rewCards[0],()=>{},0),board=G.mainBoard.map(()=>element('div'));
      document.querySelectorAll=sel=>sel==='#hand-slots.board-slots > *'?board
        :sel==='#reward-offer-row > .rew-card[data-merge-rew-idx]'?[offer]
        :sel==='.shop-exchange-drop-hint'?[...board,offer].filter(el=>el.classList.contains('shop-exchange-drop-hint')):[];
      check((peddler?'行商人':'魔導店')+'：交換可能な相手だけ両方向に発光し、実dropが同じ交換を行う',()=>{
        _dragSrc={arr:'rew',idx:0};assert.equal(_syncExchangeShopDropHints(),true);
        assert.equal(board[1].classList.contains('drag-over'),true);assert.equal(board[0].classList.contains('drag-over'),false);
        _dragSrc={arr:'boardCards',idx:1};_syncExchangeShopDropHints();assert.equal(offer.classList.contains('drag-over'),true);
        const incoming=_rewCards[0].name,outgoing=G.mainBoard[1].name,gold=G.gold;let prevented=0,stopped=0;
        offer.listeners.dragover({preventDefault(){prevented++;}});
        offer.listeners.drop({preventDefault(){prevented++;},stopPropagation(){stopped++;}});
        assert.equal(prevented,2);assert.equal(stopped,1);assert.equal(G.mainBoard[1].name,incoming);assert.equal(_rewCards[0].name,outgoing);assert.equal(G.gold,gold);
        assert.equal(offer.classList.contains('drag-over'),false);
        const accepts=questRewardSlotAcceptsCard;
        try{questRewardSlotAcceptsCard=()=>false;_dragSrc={arr:'boardCards',idx:1};_syncExchangeShopDropHints();
          assert.equal(_exchangeShopOfferDropAllowedAt(0),false);assert.equal(offer.classList.contains('drag-over'),false);
          offer.listeners.drop({preventDefault(){throw Error('依頼枠の違反を受付');}});assert.equal(G.mainBoard[1].name,incoming);
        }finally{questRewardSlotAcceptsCard=accepts;}
      });
      check((peddler?'行商人':'魔導店')+'：アイテムの売却・返品・売却待ち枠へのドラッグを拒否する',()=>{
        const item=makeItem('盾の巻物');G.spellSlots[0]=item;const gold=G.gold;
        item._shopBuy={key:_shopPurchaseKey(),price:999,idx:0,card:clone(item)};
        _dragSrc={arr:'spellSlots',idx:0};assert.equal(_canReturnDragSrcToRewardArea(),false);
        assert.equal(_pushToRewardArea(item),false);assert.equal(_pushToRewardAreaAt(item,0),false);
        assert.equal(isShopReturnable(item),false);assert.equal(_sellHeldItem(0),false);assert.equal(G.spellSlots[0],item);assert.equal(G.gold,gold);
        const stock=_rewCards;
        try{
          _rewCards=[{...clone(item),_shopSalePending:true,_sellDisplayPrice:999}];
          assert.equal(_shopCardSellGain(_rewCards[0]),0);assert.equal(_sellPendingShopCard(0),false);
          const pending=_mkRewDiv(_rewCards[0],()=>{},null);
          assert.ok(!pending.children.some(el=>el.className.includes('shop-pending-sale-ui')));assert.equal(G.gold,gold);
        }finally{_rewCards=stock;}
      });
    }finally{document.querySelectorAll=query;document.createElement=create;_dragSrc=null;}
  }
  fresh();check('合体停止：3枚・魔鏡・2枚レシピ・絆の巻物を停止し、既存カードと所持アイテムを壊さない',()=>{
    assert.equal(PANEL_MERGE_TRIAL.enabled,false);
    G.mainBoard[0]=makePanel('ノーム');G.mainBoard[2]=makePanel('ノーム');const before=clone(G.mainBoard);
    assert.equal(_tryTripleMergeOnBoard(_getPartyBoardUnit(),2),null);assert.deepEqual(G.mainBoard,before);
    assert.equal(_rewardMergeCandidate(0,makePanel('ノーム')),false);assert.equal(_mergedPanelCard(G.mainBoard[0],G.mainBoard[1]),null);
    G.mainBoard[2]=makePanel('魔鏡');const mirrorBoard=clone(G.mainBoard);assert.equal(_tryTripleMergeOnBoard(_getPartyBoardUnit(),2),null);assert.deepEqual(G.mainBoard,mirrorBoard);
    const scroll=makeItem('絆の巻物');G.spellSlots[0]=scroll;assert.equal(_canUseItemNow(scroll),false);assert.equal(_useImmediateItem(0,scroll),false);assert.equal(G.spellSlots[0],scroll);assert.ok(!G._pendingItemUse);
    G.mainBoard[0]={...makePanel('ノーム'),_tripleMerged:true,_merged:true,power:81,life:99};const merged=clone(G.mainBoard[0]);
    SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));assert.deepEqual(G.mainBoard[0],merged);
    assert.equal(panelMergeContentAvailable(makePanel('魔鏡')),false);assert.equal(panelMergeContentAvailable(scroll),false);
    for(let i=0;i<30;i++){assert.ok(!drawRewards().some(c=>_isMagicMirrorPanel(c)));assert.ok(!drawItems(3).some(c=>c.itemEffectKey==='bond_scroll'));}
  });
  fresh();check('停止スイッチを戻すと合体を復帰でき、オンラインは停止スイッチに影響されない',()=>{
    const enabled=PANEL_MERGE_TRIAL.enabled;
    try{
      PANEL_MERGE_TRIAL.enabled=true;G.mainBoard[0]=makePanel('ノーム');G.mainBoard[2]=makePanel('ノーム');
      assert.ok(_tryTripleMergeOnBoard(_getPartyBoardUnit(),2));assert.equal(panelMergeContentAvailable(makeItem('絆の巻物')),true);
    }finally{PANEL_MERGE_TRIAL.enabled=enabled;}
    G._onlineMode=true;assert.equal(panelMergeEnabled(),true);assert.equal(panelMergeContentAvailable(makePanel('魔鏡')),true);
    G._isShop=true;G.spellSlots[0]=makeItem('盾の巻物');const gold=G.gold;_sellHeldItem(0);assert.ok(G.gold>gold);assert.equal(G.spellSlots[0],null);
  });
  const sync=_syncRewardProductionUi,body=document.body,journey=_syncRewardJourneyUi;
  try{
    vm.runInThisContext(source('js/engine/reward.js').match(/^function _syncRewardProductionUi\([^\n]*\)\{[\s\S]*?^\}/m)[0]);
    document.body=element('body');_syncRewardJourneyUi=()=>{};fresh();G._rewardOnePickMode=true;
    check('取得後のマナ・血暗転は、返却・元に戻す・次画面・オンラインで解除される',()=>{
      _rewFreePickDone=true;_syncRewardProductionUi();assert.equal(document.body.classList.contains('reward-pick-resources-dim'),true);
      _rewFreePickDone=false;_syncRewardProductionUi();assert.equal(document.body.classList.contains('reward-pick-resources-dim'),false);
      _rewFreePickDone=true;G.phase='battle';_syncRewardProductionUi();assert.equal(document.body.classList.contains('reward-pick-resources-dim'),false);
      G.phase='reward';G._onlineMode=true;_syncRewardProductionUi();assert.equal(document.body.classList.contains('reward-pick-resources-dim'),false);
    });
  }finally{_syncRewardProductionUi=sync;document.body=body;_syncRewardJourneyUi=journey;}
  fresh();check('再抽選VFXの対象は最高レア1枚、同値は左端（全て通常でも1枚）',()=>{
    for(const [rarities,index] of [[[1,3,2,3,1],1],[[5,4,5,1,1],0],[[1,1,1,1,1],0]])assert.equal(_rewardRerollVfxIndex(rarities.map(rarity=>({rarity}))),index);
  });
  const turnDown=cardRevealTurnDown,sequence=cardRevealPlaySequence,face=_rewardRerollFace,reset=cardRevealReset;
  try{
    const finish=[],events=[],cards=[1,4,2,4,1].map(rarity=>({rarity}));let played=null;
    cardRevealTurnDown=rig=>new Promise(resolve=>{events.push('down');finish.push(resolve);});
    cardRevealPlaySequence=async(rigs,rarities)=>{events.push('up');played=rarities;};
    _rewardRerollFace=card=>{events.push('face');return card;};cardRevealReset=()=>{};
    const reveal={token:_rewardRevealToken,layer:element('div'),rigs:cards.map((_,idx)=>({idx,rig:{style:{},_cr:{faceFront:{querySelector:()=>({replaceChildren(){}})}}}}))};
    _rewardRerollReveal=reveal;const task=_playRewardRerollReveal(reveal,cards);
    finish.slice(0,4).forEach(resolve=>resolve());await Promise.resolve();await Promise.resolve();
    check('再抽選：5枚すべてが裏返るまでは新しい表もVFXも開始しない',()=>{assert.deepEqual(events,Array(5).fill('down'));assert.equal(played,null);});
    finish[4]();await task;
    check('再抽選：裏返し完了後に新しい5枚を描き、左端の最高レア1枚だけ既存VFXを使う',()=>{
      assert.deepEqual(played,[1,4,1,1,1]);assert.equal(events.filter(e=>e==='face').length,5);assert.equal(events.at(-1),'up');assert.equal(_rewardRerollReveal,null);
    });
  }finally{cardRevealTurnDown=turnDown;cardRevealPlaySequence=sequence;_rewardRerollFace=face;cardRevealReset=reset;_rewardRerollReveal=null;}
}
if(require.main===module)initialize().then(api=>testPveTrial(api)).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testPveTrial};
