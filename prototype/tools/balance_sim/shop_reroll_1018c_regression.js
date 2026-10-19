#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {initialize}=require('./run_bot'),{source}=require('./bot_runtime');
const boons=require('./bot_boons');

async function testShopReroll(api,check=(name,fn)=>{fn();console.log('OK '+name);}){
  const store=_storeRewardStartSnapshot;
  try{
    vm.runInThisContext(source('js/engine/reward.js').match(/^function _storeRewardStartSnapshot\([^\n]*\)\{[\s\S]*?^\}/m)[0]);
    for(const kind of ['shop','item','forge']){
      const open=()=>kind==='shop'?openMapShop():kind==='item'?openMapItemShop():openMapForge();
      const stock=()=>clone(kind==='forge'?G._mapForgeOffers:_rewCards);
      const cached=()=>clone((kind==='shop'?G._waveShopStock:kind==='item'?G._waveItemShopStock:G._waveForgeOffers)[2]);
      api.resetRun();initState();SaveRun.begin();_dragSrc=null;_rewCards=[];
      Object.assign(G,{_wave:2,_waveStage:4,phase:'reward',gold:99,_waveLife:3,life:3});
      G.mainBoard[1]=makePanel('ノーム');open();
      check(`${kind}：権利なし99Gは押せず、100Gは1回だけ使え、商品を街別キャッシュへ保存`,()=>{
        assert.equal(shopRerollKind(),kind);assert.equal(towerBoonRerollVisible(),true);assert.equal(shopCanReroll(),false);
        assert.deepEqual(towerBoonRerollButtonState(),{visible:true,label:'再抽選（100G）',disabled:true});
        const before=stock(),seq=G._shopRerollSeq;assert.equal(shopRerollOffers(),false);assert.deepEqual(stock(),before);assert.equal(G._shopRerollSeq,seq);
        G.gold=100;assert.equal(shopCanReroll(),true);assert.equal(shopRerollOffers(),true);
        assert.equal(G.gold,0);assert.equal(G._shopRerollSeq,seq+1);assert.deepEqual(stock(),cached());
        assert.equal(shopCanReroll(),false);assert.equal(shopRerollOffers(),false);assert.equal(_facilityCommitStateChanged(),true);
      });
      check(`${kind}：権利はゴールドより優先、0Gでも使え、配置・ドラッグ・演出中は拒否`,()=>{
        towerBoonState().rerolls=2;G.gold=100;const seq=G._shopRerollSeq;
        assert.deepEqual(towerBoonRerollButtonState(),{visible:true,label:'再抽選（残2）',disabled:false});
        G._pendingPanelPlacement={card:makePanel('ノーム')};assert.equal(shopCanReroll(),false);G._pendingPanelPlacement=null;
        _dragSrc={arr:'boardCards',idx:1};assert.equal(shopRerollOffers(),false);_dragSrc=null;
        G._mapForgeAnimating=true;assert.equal(shopCanReroll(),false);G._mapForgeAnimating=false;
        assert.equal(G._shopRerollSeq,seq);assert.equal(shopRerollOffers(),true);assert.equal(G.gold,100);assert.equal(towerBoonState().rerolls,1);
        G.gold=0;assert.equal(shopRerollOffers(),true);assert.equal(G.gold,0);assert.equal(towerBoonState().rerolls,0);
      });
      check(`${kind}：元に戻す・再訪・保存復元で結果と消費を保ち、別の街の在庫を汚さない`,()=>{
        const expected=stock(),seq=G._shopRerollSeq;resetRewardToStart();assert.deepEqual(stock(),expected);assert.equal(G.gold,0);assert.equal(towerBoonState().rerolls,0);
        openMapVillage();open();assert.deepEqual(stock(),expected);assert.equal(G._shopRerollSeq,seq);
        const save=SaveRun.buildRunSave('reward');SaveRun.validate(save);SaveRun.restoreRunState(save);open();
        assert.deepEqual(stock(),expected);assert.equal(G._shopRerollSeq,seq);
        G._wave=3;G._facilityCacheKey=3;open();G.gold=100;assert.equal(shopRerollOffers(),true);
        G._wave=2;open();assert.deepEqual(stock(),expected);
      });
      check(`${kind}：保存直後からの100G再抽選は、ロード後も同じ並び・乱数・消費になる`,()=>{
        G.gold=100;const save=SaveRun.buildRunSave('reward');assert.equal(shopRerollOffers(),true);
        const after=stock(),seq=G._shopRerollSeq,rng=G._runRngState;
        SaveRun.restoreRunState(save);assert.equal(shopRerollOffers(),true);
        assert.deepEqual(stock(),after);assert.equal(G.gold,0);assert.equal(G._shopRerollSeq,seq);assert.equal(G._runRngState,rng);
      });
      check(`${kind}：ボットは400G以上で1回・支払い後300G確保、権利は資金に関係なく使う`,()=>{
        const actions=[];G.gold=399;assert.equal(boons.rerollShop('greedy',a=>actions.push(a)),false);
        G.gold=400;assert.equal(boons.rerollShop('greedy',a=>actions.push(a)),true);assert.equal(G.gold,300);
        towerBoonState().rerolls=1;G.gold=0;assert.equal(boons.rerollShop('greedy',a=>actions.push(a)),true);assert.equal(G.gold,0);
        assert.equal(actions[0].goldBefore-actions[0].goldAfter,100);assert.equal(actions[1].remainingAfter,0);
      });
      if(kind==='item')check('道具屋：再抽選前に買った品も返品でき、見えない4枠目へ落とさない',()=>{
        G.gold=1000;openMapItemShop();const original=clone(_rewCards[0]);takeRewCard(0);
        const slot=G.spellSlots.findIndex(c=>c&&c._shopBuy);assert.ok(slot>=0);
        const bought=G.spellSlots[slot];assert.equal(_rewCards[0],null);assert.equal(shopRerollOffers(),true);
        assert.equal(returnShopPurchase(bought,()=>{G.spellSlots[slot]=null;}),true);
        assert.equal(_rewCards.length,3);assert.equal(_rewCards[0].id,original.id);assert.equal(G.gold,900);assert.deepEqual(_rewCards,cached());
      });
    }
    check('行商人：100G再抽選で品揃えを引き直し、行商人の在庫として保存・再表示で同じ（2026-10-19）',()=>{
      api.resetRun();initState();SaveRun.begin();_dragSrc=null;_rewCards=[];
      Object.assign(G,{_wave:2,_waveStage:3,phase:null,gold:150,_waveLife:3,life:3,_waveDefeatCount:1});
      G.mainBoard[1]=makePanel('ノーム');G._isVillageMenu=false;G._waveVillage=false;
      G._peddlerStock=_buildDefeatPeddlerStock();goToReward({noNewRewards:true,peddler:true});
      assert.equal(G._isPeddler,true);assert.equal(shopRerollKind(),'peddler');assert.equal(towerBoonRerollVisible(),true);
      assert.deepEqual(towerBoonRerollButtonState(),{visible:true,label:'再抽選（100G）',disabled:false});
      const before=clone(_rewCards);assert.equal(shopRerollOffers(),true);assert.equal(G.gold,50);
      assert.equal(_rewCards.length,before.length);assert.notDeepEqual(_rewCards.map(c=>c&&c.id),before.map(c=>c&&c.id));
      assert.deepEqual(G._peddlerStock,clone(_rewCards));assert.deepEqual(_ensureDefeatPeddlerStock(),clone(_rewCards));
      assert.equal(shopCanReroll(),false,'50Gでは2回目は押せない');
    });
    check('オンラインには100G再抽選を出さない',()=>{
      G._isPeddler=false;G._onlineMode=true;assert.equal(shopRerollKind(),'');assert.equal(shopRerollOffers(),false);G._onlineMode=false;
    });
  }finally{_storeRewardStartSnapshot=store;}
}
if(require.main===module)initialize().then(testShopReroll).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testShopReroll};
