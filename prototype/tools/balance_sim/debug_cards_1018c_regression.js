#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const {initialize}=require('./run_bot');

async function testDebugCards(api){
  for(const peddler of [false,true]){
    api.resetRun();initState();SaveRun.begin();
    Object.assign(G,{_debugMode:true,_debugPaletteKind:'character',phase:'reward',_wave:2,
      _isShop:true,_isItemShop:false,_isPeddler:peddler});
    G.mainBoard[1]=makePanel('ノーム');G.mainBoard[3]=makePanel('ゴーレム');
    _rewCards=['ラミア','ノーム','ゴーレム'].map(n=>_exchangeShopCardCopy(makePanel(n)));
    const id=PANEL_POOL.find(c=>c.no==='C006').id,stock=clone(_rewCards),gold=G.gold;
    _debugTakePanelCard(id);
    assert.ok(G._pendingPanelPlacement);
    assert.equal(placePendingPanelToSelectedUnit(0),true,'店でもデバッグカードをクリック取得できる');
    assert.equal(G._pendingPanelPlacement,null);assert.deepEqual(_rewCards,stock);
    assert.equal(G.gold,gold);assert.equal(exchangeShopCard(0,1),true);
    _dragSrc={arr:'debugPanel',id,card:_debugMakePanelCard(id)};
    dropOnCard('boardCards',5);
    assert.equal(G.mainBoard[5].id,id);assert.equal(G._pendingPanelPlacement,null);assert.equal(_dragSrc,null);
    _dragSrc={arr:'debugPanel',id,card:_debugMakePanelCard(id)};
    dropOnCard('boardCards',-1);
    assert.equal(G._pendingPanelPlacement,null,'ドラッグ取得に失敗しても配置待ちを残さない');
    assert.equal(_dragSrc,null);assert.equal(exchangeShopCard(0,1),true);
    _debugTakePanelCard(id);
    assert.equal(placePendingPanelToSelectedUnit(-1),false);
    assert.equal(G._pendingPanelPlacement,null,'クリック取得の失敗も交換を止めない');
    assert.equal(exchangeShopCard(0,1),true);
    console.log('OK デバッグカード：'+(peddler?'行商人':'魔導店')+'の取得・失敗後の交換');
  }
}
if(require.main===module)initialize().then(testDebugCards).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={testDebugCards};
