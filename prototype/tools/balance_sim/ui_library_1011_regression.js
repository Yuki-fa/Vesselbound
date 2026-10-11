'use strict';
// 2026-10-11: 売却ボタンの生成とクリック、貸出のデータ参照、プロフィール完走記録を検査する。
const assert=require('node:assert/strict');
const h=require('./presentation_1011_harness');
const slots=Array.from({length:4},()=>h.makeElement('i'));
for(const slot of slots) {
  slot.querySelector=selector=>slot.children.find(c=>c.className.split(' ').includes(selector.slice(1)))||null;
  slot.appendChild=c=>{slot.children.push(c);c.remove=()=>slot.children.splice(slot.children.indexOf(c),1);return c;};
}
const elements=new Map(['library-merge-btn','library-merge-desc','library-howto-btn'].map(id=>[id,h.makeElement('button')]));
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
    assert.ok(action,name+' 手持ちアイテムの売却UI');
    const gain=goldIncomeAmount(_itemShopSellPrice(item));assert.equal(action.textContent,`+${gain}G`);
    action.onclick({stopPropagation(){}});
    assert.equal(G.spellSlots[0],null,name+' アイテムがなくなる');assert.equal(G.gold,100+gain,name+' 売価が入る');
    const card=makePanel(PANEL_POOL.find(c=>c.no==='C062').id);G.mainBoard[1]=card;
    assert.ok(_boardCardSellEnabled(card),name+' カードも売却可能');
    const button=h.makeElement('button'),div=h.makeElement();div.querySelector=()=>button;
    const cardGain=goldIncomeAmount(_shopCardSellGain(card)),before=G.gold;
    _wireHeCardDiscard(div,card,G.mainBoard,'boardCards',1,false);button.onclick({stopPropagation(){}});
    assert.equal(G.mainBoard[1],null,name+' カードがなくなる');assert.equal(G.gold,before+cardGain,name+' カードの売価が入る');checked++;
  }
  for(const flags of [{},{_debugMode:true,_renderingGameOverBoard:true},{_debugMode:true,_isWaveAltar:true}]) {
    initState();Object.assign(G,{phase:'reward'},flags);G.spellSlots=[h.copy(ITEM_POOL[0]),null,null,null];
    _syncRewardProductionItems();assert.equal(slots[0].querySelector('.item-shop-sell-action'),null,'通常編成・ゲームオーバー・祭壇に新しい売却UIを出さない');checked++;
  }
  localStorage.clear();SaveProfile.resetCache();initState();G._isLibraryMenu=true;G._isLibrary=true;
  renderVillageScreen();assert.equal(elements.get('library-merge-btn').style.display,'none');
  assert.equal(elements.get('library-merge-desc').style.display,'none');
  let config;runBoardTutorial=cfg=>{config=cfg;};
  startLibraryBoardTutorial();assert.equal(config.id,'board');
  assert.equal(_libraryBoardTutorialCompleted(),false,'開始時には記録しない');
  SaveProfile.resetCache();initState();assert.equal(_libraryBoardTutorialCompleted(),false,'途中離脱後も未完了');
  G._isLibrary=true;startLibraryBoardTutorial();config.onFinish();
  assert.equal(SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY),true,'最終手順完了でプロフィールへ記録');
  SaveProfile.resetCache();initState();G._isLibraryMenu=true;renderVillageScreen();
  assert.equal(elements.get('library-merge-btn').style.display,'','ラン再初期化・プロフィール再読込後に解放');
  G._debugMode=true;delete window._libraryDebugBoardTutorialCompleted;
  assert.equal(_libraryBoardTutorialCompleted(),false,'デバッグは通常プロフィールを無視');
  localStorage.clear();SaveProfile.resetCache();G._isLibrary=true;startLibraryBoardTutorial();config.onFinish();
  assert.equal(_libraryBoardTutorialCompleted(),true,'デバッグは同じページ内で解放');
  assert.equal(SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY),false,'デバッグはプロフィールを書かない');
  G._debugMode=false;assert.equal(_libraryBoardTutorialCompleted(),false,'デバッグ完了を通常ランへ持ち込まない');checked+=7;
  // 改名してもC062を借り、移動対象・説明文・合体判定まで同じカードになる。
  const def=PANEL_POOL.find(c=>c.no==='C062'),old=def.name;def.name='C062検査名';
  const loans=_libraryMergeLoanCards();assert.equal(loans.length,5);
  assert.ok(loans.every(c=>c.no==='C062'&&c.name===def.name&&c._libraryLoan));
  G._debugMode=true;openMapLibraryFormation=()=>{G._isLibrary=true;};_waitLibraryUIReady=fn=>fn();
  openLibraryMergeTutorial();assert.equal(config.id,'merge');
  assert.equal(config.buildSteps()[1][3],def.name,'移動対象もC062の改名に追従');
  assert.ok(config.text('2','').includes(def.name),'シートの説明文の貸出名も追従');
  G.mainBoard[1]={...loans[0],_tripleMerged:true,name:def.name+'+'};assert.ok(_libraryBoardHasMergedTutorialCard());
  G.mainBoard[1].no='C063';assert.equal(_libraryBoardHasMergedTutorialCard(),false);def.name=old;checked++;
  console.log(`2026-10-11 売却・図書館: ${checked}件OK（5売却経路、途中離脱、プロフィール・デバッグ、C062×5）`);
})().catch(e=>{console.error(e);process.exitCode=1;});
