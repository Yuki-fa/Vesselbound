#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {initialize}=require('./run_bot');
const {source}=require('./bot_runtime');
const {makeElement}=require('./stub');

async function testPeddlerExchange(api,check=(title,fn)=>{fn();console.log('OK '+title);}) {
  const snapshot=_storeRewardStartSnapshot;
  // ボットでは省く表示開始スナップショットも、移行・元に戻すの検査では本体を使う。
  vm.runInThisContext(source('js/engine/reward.js').match(/^function _storeRewardStartSnapshot\([^\n]*\)\{[\s\S]*?^\}/m)[0]);
  function fresh(){
    api.resetRun();initState();SaveRun.begin();G._runSeed=812;G._runRngState=812;
    G._wave=2;G._waveStage=2;G._waveDefeatCount=1;G._waveLife=3;G.life=3;G.gold=0;
    G.mainBoard[1]=_exchangeShopCardCopy(makePanel('ノーム'));G.mainBoard[3]=_exchangeShopCardCopy(makePanel('ゴーレム'));G._defeatPeddlerShownThisRun=true;
  }
  try {
    fresh();
    const draw=drawRewards;let draws=0;
    try {
      drawRewards=n=>{draws++;assert.equal(n,3);return draw(n);};
      await runDefeatPeddlerEvent();await api.drain();
      const stock=clone(_rewCards),rng=G._runRngState;
      _ensureDefeatPeddlerStock();goToReward({restoreCheckpoint:true});
      check('行商人：報酬抽選1回の3枚・価格なし・アイテムなし、場面の再表示で固定',()=>{
        assert.equal(draws,1);assert.equal(_isCardExchangeShop(),true);assert.equal(_shopSlotCapacity(),3);
        assert.equal(stock.length,3);assert.ok(stock.every(c=>c&&!_isSpellCard(c)&&!('_buyPrice' in c)));
        assert.deepEqual(_rewCards,stock);assert.deepEqual(G._peddlerStock,stock);assert.equal(G._runRngState,rng);
      });
    }finally{drawRewards=draw;}
    const enchant=_exchangeShopCardCopy(makePanel(PANEL_POOL.find(c=>c.category==='エンチャント'&&!_cardIsEngraved(c)&&!_isSealPanel(c)).id));
    _rewCards=[enchant,makePanel('ラミア'),makePanel('ノーム')].map(_exchangeShopCardCopy);_syncWaveFacilityCache();
    const board=clone(G.mainBoard),stock=clone(_rewCards),count=G.mainBoard.filter(Boolean).length;
    check('行商人：空きマス・単独クリック・報酬枠への片道移動を拒否する',()=>{
      takeRewCard(0);takeRewCard(0,0);_dragSrc={arr:'rew',idx:0};assert.equal(_boardDropAllowedAt(0),false);dropOnCard('boardCards',0);
      const create=document.createElement;let accepted=false;
      try{
        document.createElement=tag=>{const el=makeElement(tag);el.listeners={};el.addEventListener=(kind,fn)=>{el.listeners[kind]=fn;};return el;};
        const host=makeElement();_renderHeEmptySlot(host,'boardCards',0,_boardSlotDef(0,_getPartyBoardUnit()),0,0,0);
        _dragSrc={arr:'rew',idx:0};host.children[0].listeners.dragover({preventDefault(){accepted=true;}});assert.equal(accepted,false);
      }finally{document.createElement=create;_dragSrc=null;}
      _dragSrc={arr:'boardCards',idx:1};assert.equal(_canReturnDragSrcToRewardArea(),false);_returnDragSrcToRewardArea();_dragSrc=null;
      assert.deepEqual(G.mainBoard,board);assert.deepEqual(_rewCards,stock);assert.equal(G.gold,0);assert.ok(!G._pendingPanelPlacement);
    });
    check('行商人：共通ドラッグで異種交換・取り戻しを繰り返せ、枚数とゴールドを保つ',()=>{
      for(let i=0;i<8;i++){
        _dragSrc={arr:'rew',idx:0};assert.equal(_boardDropAllowedAt(1),true);dropOnCard('boardCards',1);
        assert.equal(G.mainBoard[1].name,i%2?board[1].name:enchant.name);
        assert.equal(G.mainBoard.filter(Boolean).length,count);assert.equal(_rewCards.filter(Boolean).length,3);assert.equal(G.gold,0);
        assert.deepEqual(G._peddlerStock,_rewCards);
      }
      assert.deepEqual(G.mainBoard,board);assert.deepEqual(_rewCards,stock);
      _rewCards[0]=makePanel('ノーム');assert.equal(exchangeShopCard(0,1),true);
      assert.equal(G.mainBoard[1]._tripleMerged,undefined);assert.equal(G.mainBoard.filter(Boolean).length,count);
    });
    check('行商人：刻印と依頼カード枠の制限を共通判定で守る',()=>{
      G.mainBoard[0]=makePanel(PANEL_POOL.find(c=>c.no==='E102').id);assert.equal(canExchangeShopCardAt(0,0),false);
      _qFormationContext={mode:'accept'};
      try{assert.equal(questRewardSlotAcceptsCard(G.mainBoard[1]),false);assert.equal(canExchangeShopCardAt(0,1),false);assert.equal(exchangeShopCard(0,1),false);}
      finally{_qFormationContext=null;}
    });
    _rewCards[0]=enchant;assert.equal(exchangeShopCard(0,1),true);
    G._waveShopStock={2:[_exchangeShopCardCopy(makePanel('ラミア'))]};
    const changed=clone(_rewCards),changedBoard=clone(G.mainBoard),townStock=clone(G._waveShopStock);
    check('行商人：交換後の店枠と盤面を保存・復元し、街の在庫と混ざらない',()=>{
      const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);goToReward({restoreCheckpoint:true});
      assert.ok(G._isPeddler&&G._isShop);assert.deepEqual(_rewCards,changed);assert.deepEqual(G._peddlerStock,changed);
      assert.deepEqual(G.mainBoard,changedBoard);assert.deepEqual(G._waveShopStock,townStock);assert.equal(G.gold,0);
    });
    check('行商人：旧売買5枠・売切・旧リセット内容を移行し、再復元と元に戻すで固定',()=>{
      const save=SaveRun.buildRunSave('reward');
      const five=[...Array.from({length:3},()=>({...makePanel('ノーム'),_buyPrice:80})),null,{...clone(ITEM_POOL[0]),_buyPrice:45}];
      save.state.choices._peddlerStock=clone(five);save.state.reward.cards=clone(five);
      save.state.choices._rewardStartSnapshot.rewCards=clone(five);
      SaveRun.restoreRunState(save);const migrated=clone(_rewCards);
      assert.equal(migrated.length,3);assert.ok(migrated.every(c=>!_isSpellCard(c)&&!('_buyPrice' in c)));
      assert.equal(G._pendingPanelPlacement,null);assert.deepEqual(G.mainBoard,changedBoard);assert.equal(G.gold,0);
      resetRewardToStart();assert.deepEqual(_rewCards,migrated);assert.deepEqual(G._peddlerStock,migrated);
      SaveRun.restoreRunState(save);assert.deepEqual(_rewCards,migrated,'同じ旧セーブの再読込も同じ移行結果');
      SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));assert.deepEqual(_rewCards,migrated);
    });
    const before=clone(G._peddlerStock),drawAgain=drawRewards;let nextDraws=0;
    G._isShop=false;G._isPeddler=false;G._waveDefeatCount++;
    try{
      drawRewards=n=>{nextDraws++;return drawAgain(n);};await runDefeatPeddlerEvent();await api.drain();
      check('行商人：再戦後の再敗北で新たに1回抽選し、前の交換結果を持ち越さない',()=>{
        assert.equal(nextDraws,1);assert.notDeepEqual(G._peddlerStock,before);assert.equal(_rewCards.length,3);
      });
    }finally{drawRewards=drawAgain;}
    fresh();Object.assign(towerBoonState().counts,{stats:1,modifiers:1,damage:1,mana:1,familiars:1});
    const expected=towerBoonCurrentCardBonus();await runDefeatPeddlerEvent();await api.drain();
    check('行商人：魔導店と同じ祝福を生成時に付け、交換で渡した元の個体は祝福し直さない',()=>{
      _rewCards.forEach(c=>assert.deepEqual(c.boon,expected));const original=clone(G.mainBoard[1]);
      assert.equal(exchangeShopCard(0,1),true);assert.deepEqual(G.mainBoard[1].boon,expected);
      assert.deepEqual(_rewCards[0],_exchangeShopCardCopy(original));assert.equal(exchangeShopCard(0,1),true);assert.deepEqual(G.mainBoard[1],original);
    });
    fresh();towerBoonState().counts.bosses=1;towerBoonState().defeatedBosses=[clone(ENEMY_POOL.find(e=>e.bossOnly))];
    const chance=TOWER_BOON_CONFIG.bossSlotChance;TOWER_BOON_CONFIG.bossSlotChance=1;
    try{
      await runDefeatPeddlerEvent();await api.drain();
      check('行商人：祝福6の撃破ボスも共通抽選で提示し、価格を除いて交換できる',()=>{
        assert.equal(_rewCards.length,3);assert.ok(_rewCards.every(c=>c._towerBoonBoss&&!('_buyPrice' in c)));
        assert.equal(exchangeShopCard(0,1),true);assert.equal(G.mainBoard[1]._towerBoonBoss,true);
      });
    }finally{TOWER_BOON_CONFIG.bossSlotChance=chance;}
  }finally{_storeRewardStartSnapshot=snapshot;_dragSrc=null;_qFormationContext=null;}
}
if(require.main===module)initialize().then(api=>testPeddlerExchange(api)).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testPeddlerExchange};
