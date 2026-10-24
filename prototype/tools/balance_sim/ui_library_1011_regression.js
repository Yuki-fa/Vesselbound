'use strict';
// 2026-10-11: 売却ボタンの生成とクリック、貸出のデータ参照、プロフィール完走記録を検査する。
const assert=require('node:assert/strict');
const h=require('./presentation_1011_harness');
const slots=Array.from({length:4},()=>h.makeElement('i'));
for(const slot of slots) {
  slot.querySelector=selector=>slot.children.find(c=>c.className.split(' ').includes(selector.slice(1)))||null;
  slot.appendChild=c=>{slot.children.push(c);c.remove=()=>slot.children.splice(slot.children.indexOf(c),1);return c;};
}
const elements=new Map(['library-howto-btn'].map(id=>[id,h.makeElement('button')]));
document.querySelectorAll=selector=>selector==='.reward-prod-item .reward-prod-slots i'?slots:[];
document.getElementById=id=>elements.get(id)||null;
renderHandEditor=renderFieldEditor=renderRewCards=_syncRewardProductionUi=updateHUD=refreshRewardGoldUi=()=>{};
(async()=>{
  await h.ready;
  let checked=0;
  const modes=[['debug',{_debugMode:true}],['魔導店',{_isShop:true}],['道具屋',{_isShop:true,_isItemShop:true}],
    ['鍛冶屋',{_isForge:true}],['行商人',{_isShop:true,_isPeddler:true}]];
  for(const [name,flags] of modes) {
    initState();Object.assign(G,{phase:'reward',gold:100,rings:[]},flags);
    const item=h.copy(ITEM_POOL[0]);G.spellSlots=[item,null,null,null];
    _syncRewardProductionItems();const action=slots[0].querySelector('.item-shop-sell-action');
    // 2026-10-18：通常プレイではどの施設・デバッグでもアイテムを売れない（売却という機能が無い）。
    if(true){
      assert.equal(action,null,name+' アイテム売却UIなし');assert.equal(_sellHeldItem(0),false);
      assert.equal(G.spellSlots[0],item);assert.equal(G.gold,100);
    }else{
      assert.ok(action,name+' 手持ちアイテムの売却UI');
      const gain=goldIncomeAmount(_itemShopSellPrice(item));assert.equal(action.textContent,`+${gain}G`);
      action.onclick({stopPropagation(){}});
      assert.equal(G.spellSlots[0],null,name+' アイテムがなくなる');assert.equal(G.gold,100+gain,name+' 売価が入る');
    }
    const card=makePanel(PANEL_POOL.find(c=>c.no==='C082').id);G.mainBoard[1]=card;
    assert.equal(_boardCardSellEnabled(card),false,name+' カードの売却は廃止');
    const button=h.makeElement('button'),div=h.makeElement();div.querySelector=()=>button;
    button.classList.contains=c=>c==='shop-board-sell-action';const before=G.gold;
    _wireHeCardDiscard(div,card,G.mainBoard,'boardCards',1,false);button.onclick({stopPropagation(){}});
    assert.equal(G.mainBoard[1],card,name+' カードが残る');assert.equal(G.gold,before,name+' カードの売価が入らない');checked++;
  }
  for(const flags of [{},{_debugMode:true,_renderingGameOverBoard:true},{_debugMode:true,_isWaveAltar:true}]) {
    initState();Object.assign(G,{phase:'reward'},flags);G.spellSlots=[h.copy(ITEM_POOL[0]),null,null,null];
    _syncRewardProductionItems();assert.equal(slots[0].querySelector('.item-shop-sell-action'),null,'通常編成・ゲームオーバー・祭壇に新しい売却UIを出さない');checked++;
  }
  localStorage.clear();SaveProfile.resetCache();initState();G._isLibraryMenu=true;G._isLibrary=true;
  renderVillageScreen();assert.equal(document.getElementById('library-merge-btn'),null,'図書館のマージ入口を削除');
  assert.equal(document.getElementById('library-merge-desc'),null,'図書館のマージ説明を削除');
  let config;runBoardTutorial=cfg=>{config=cfg;};
  startLibraryBoardTutorial();assert.equal(config.id,'board');
  assert.equal(_libraryBoardTutorialCompleted(),false,'開始時には記録しない');
  SaveProfile.resetCache();initState();assert.equal(_libraryBoardTutorialCompleted(),false,'途中離脱後も未完了');
  G._isLibrary=true;startLibraryBoardTutorial();config.onFinish();
  assert.equal(SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY),true,'最終手順完了でプロフィールへ記録');
  SaveProfile.resetCache();initState();G._isLibraryMenu=true;renderVillageScreen();
  assert.equal(document.getElementById('library-merge-btn'),null,'プロフィール完走後もマージ入口を出さない');
  G._debugMode=true;delete window._libraryDebugBoardTutorialCompleted;
  assert.equal(_libraryBoardTutorialCompleted(),false,'デバッグは通常プロフィールを無視');
  localStorage.clear();SaveProfile.resetCache();G._isLibrary=true;startLibraryBoardTutorial();config.onFinish();
  assert.equal(_libraryBoardTutorialCompleted(),true,'デバッグは同じページ内で解放');
  assert.equal(SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY),false,'デバッグはプロフィールを書かない');
  G._debugMode=false;assert.equal(_libraryBoardTutorialCompleted(),false,'デバッグ完了を通常ランへ持ち込まない');checked+=7;
  assert.equal(panelMergeEnabled(),false,'図書館から合体入口を復帰させない');checked++;
  console.log(`売却廃止・図書館: ${checked}件OK（全施設・デバッグでアイテム売却不可、魔導板チュートリアルのみ）`);
})().catch(e=>{console.error(e);process.exitCode=1;});
