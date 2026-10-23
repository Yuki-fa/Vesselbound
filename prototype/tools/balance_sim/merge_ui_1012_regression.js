'use strict';
// 2026-10-12 利用者指定: 実際の合体・編成・保存と、図書館／試験戦闘の入口・出口を検査する。
// 画面の見え方は library_test_battle_1012_check.js で別途確認する。
const assert=require('node:assert/strict');
const {sheetRows}=require('./sheet_data');
const {makeElement}=require('./stub');
console.table=()=>{};
require('./load');
const copy=v=>JSON.parse(JSON.stringify(v));
const def=code=>PANEL_POOL.find(c=>c.no===code);
const sheetNumber=value=>String(value)==='∞'?SHEET_INFINITY_VALUE:Number(String(value).replace(/,/g,''));
function saveAtReward(){
  SaveRun.begin();G.phase='reward';G.gold=123;G._waveLife=3;_rewCards=[];_rewPhaseId=0;
  return SaveRun.buildRunSave('reward');
}
// Nodeの境界DOMにも実際のremove/insertBeforeと兄弟関係を持たせ、復帰時の重複・位置を検査する。
function node(id){
  const el=makeElement();el.id=id;
  el.remove=()=>{const p=el.parentNode;if(p)p.children.splice(p.children.indexOf(el),1);el.parentNode=null;};
  el.insertBefore=(child,next)=>{child.remove();const at=next?el.children.indexOf(next):el.children.length;
    assert.ok(at>=0);el.children.splice(at,0,child);child.parentNode=el;return child;};
  el.appendChild=child=>el.insertBefore(child,null);
  el.closest=selector=>selector==='.screen'?(el.id.startsWith('scr-')?el:el.parentNode?.closest(selector)||null):null;
  const classes=new Set();el.classList={contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)};
  Object.defineProperty(el,'nextSibling',{get(){const p=el.parentNode;return p?.children[p.children.indexOf(el)+1]||null;}});
  return el;
}
(async()=>{
  await loadGameData();
  assert.equal(panelMergeEnabled(),false,'PvEの合体は廃止済み');
  G._onlineMode=true;assert.equal(panelMergeEnabled(),false,'オンラインの合体も廃止済み');G._onlineMode=false;
  PANEL_MERGE_TRIAL.enabled=true;assert.equal(panelMergeEnabled(),false,'旧スイッチで合体を復帰させない');PANEL_MERGE_TRIAL.enabled=false;
  initState();G.phase='reward';G.mainBoard[1]=makePanel('ノーム');G.mainBoard[3]=makePanel('ノーム');G.mainBoard[5]=makePanel('ノーム');
  const mergeBoard=clone(G.mainBoard);assert.equal(_tryTripleMergeOnBoard(_getPartyBoardUnit(),5),null);
  assert.deepEqual(G.mainBoard,mergeBoard,'3枚合体で盤面を書き換えない');
  assert.equal(_mergedPanelCard(G.mainBoard[1],G.mainBoard[3]),null,'2枚レシピを実行しない');
  assert.equal(panelMergeContentAvailable({itemEffectKey:'bond_scroll',name:'絆の巻物'}),false,'絆の巻物を新規利用させない');
  assert.equal(panelMergeContentAvailable(makePanel('魔鏡')),false,'魔鏡を新規抽選へ戻さない');
  // 旧保存の合体済みカードはそのまま。復元で新しい合体を作り直さない。
  initState();const old=makePanel(def('C006').id),base=def('C006');
  applyMergedPanelForm(old);Object.assign(old,{name:base.name+'+',_tripleMerged:true,_permBasePower:base.power*2,
    _permBaseLife:base.life*2,power:base.power*2+7,life:base.life*2+9});G.mainBoard[1]=old;
  const saved=saveAtReward();SaveRun.restoreRunState(copy(saved));
  assert.deepEqual(G.mainBoard[1],saved.state.player.mainBoard[1],'旧合体済みカードの保存値を保持');
  console.log('OK 1: PvE／オンラインの3枚・2枚合体停止、関連品の新規利用停止、旧合体済みカードの保存');

  // 貸出を番号で引く。改名しても同じカード・並び・ポート・返却先となる。
  const codes=['C050','C099','E013','E032','E014'],names=codes.map(code=>def(code).name);
  codes.forEach(code=>{def(code).name=code+'検査名';});
  const loans=_libraryLoanCards();assert.deepEqual(loans.map(c=>c.no),codes);
  loans.forEach((c,i)=>{assert.equal(c.name,codes[i]+'検査名');assert.equal(c._libraryLoanSlot,i);assert.ok(c._libraryLoan);});
  assert.deepEqual(loans[0].directions,['up','left']);assert.deepEqual(loans[2].directions,['up','left','right']);
  assert.ok(loans[4].adjacentKeywords.includes('二段攻撃'));
  codes.forEach((code,i)=>{def(code).name=names[i];});
  console.log('OK 3: E014貸出、番号による改名追従、既存の向き・返却先');

  localStorage.clear();SaveProfile.resetCache();initState();G._isLibrary=true;
  let starts=0,config;runBoardTutorial=cfg=>{starts++;config=cfg;};
  startLibraryBoardTutorial();assert.equal(starts,1);assert.equal(_libraryBoardTutorialCompleted(),false);
  // 未完走はページの再開を模擬しても未完了。最終手順の終了だけを記録する。
  SaveProfile.resetCache();initState();G._isLibrary=true;startLibraryBoardTutorial();assert.equal(starts,2);
  config.onFinish();assert.ok(SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY));
  startLibraryBoardTutorial();assert.equal(starts,2,'リセットなしで説明を再開しない');
  const tutorialSave=saveAtReward();SaveProfile.resetCache();delete window._libraryBoardTutorialPlayed;
  SaveRun.restoreRunState(copy(tutorialSave));G._isLibrary=true;
  startLibraryBoardTutorial();assert.equal(starts,2,'コンティニュー相当の復元後も説明を再開しない');
  initState();G._isLibrary=true;startLibraryBoardTutorial();assert.equal(starts,2,'タイトルから別ランへ入っても完走記録を使う');
  G._debugMode=true;delete window._libraryDebugBoardTutorialCompleted;
  startLibraryBoardTutorial();assert.equal(starts,3,'デバッグは通常プロフィールの完走を使わない');
  const profile=copy(SaveProfile.load());config.onFinish();startLibraryBoardTutorial();assert.equal(starts,3,'デバッグの同ページ完走');
  assert.deepEqual(SaveProfile.load(),profile,'デバッグの完走をプロフィールへ書かない');
  delete window._libraryDebugBoardTutorialCompleted;startLibraryBoardTutorial();assert.equal(starts,4,'デバッグのページ再読込相当では再実行できる');
  console.log('OK 4: 未完走、同ページ、保存復元、別ラン、デバッグの記録境界');

  const root=node('root'),screens=new Map(['scr-battle','scr-village'].map(id=>[id,node(id)]));
  for(const screen of screens.values())root.appendChild(screen);
  const find=(el,id)=>el.id===id?el:el.children.map(c=>find(c,id)).find(Boolean)||null;
  document.getElementById=id=>find(root,id);document.querySelector=()=>null;document.querySelectorAll=()=>[];
  renderHandEditor=renderFieldEditor=renderRewCards=updateHUD=renderVillageScreen=()=>{};
  showScreen=id=>{for(const [key,screen] of screens)screen.classList[key==='scr-'+id?'add':'remove']('active');};
  clearBattleFocus=_forceStopAllVfx=hideAttackLine=_resetManaEffectRun=stopAllSfx=()=>{};
  let started=0,returned=0;
  startBattle=()=>{assert.equal(find(root,'tavern-presentation-layer'),null,'試験戦闘中に立ち絵を出さない');started++;G.phase='player';};
  onBattleEnd=async()=>{G._isShop=G._isItemShop=G._isForge=G._isTavern=G._isPeddler=G._questCampScene=false;_rewCards=[];G.gold=0;};
  goToReward=()=>{G.phase='reward';returned++;
    // 行商人の編成再描画のように別の層が出来ても、復帰時に退避した層へ置き換える。
    screens.get('scr-battle').appendChild(node('tavern-presentation-layer'));};
  openMapLibraryFormation=()=>{G.phase='reward';G._isLibrary=true;returned++;};
  const modes=[['魔導店',{_isShop:true},'scr-battle'],['道具屋',{_isShop:true,_isItemShop:true},'scr-battle'],
    ['鍛冶屋',{_isForge:true},'scr-battle'],['行商人',{_isShop:true,_isPeddler:true},'scr-battle'],
    ['酒場',{_isTavern:true},'scr-village'],['camp',{_questCampScene:true},'scr-village'],['図書館',{_isLibrary:true},'scr-battle']];
  for(const [name,flags,screenId] of modes)for(let cycle=0;cycle<2;cycle++) {
    const prior=find(root,'tavern-presentation-layer');prior?.remove();initState();Object.assign(G,{phase:'reward',_debugMode:true,gold:123,floor:4},flags);
    _rewCards=[makePanel(def('C050').id)];const offers=copy(_rewCards),host=node('tavern-presentation-layer'),next=node('following');
    host.dataset={shopPortrait:name,face:'保持する表情'};host.style.opacity='0.7';const parent=screens.get(screenId);
    parent.appendChild(host);parent.appendChild(next);showScreen(screenId.replace('scr-',''));
    startTestBattle();startTestBattle();assert.equal(host.parentNode,null);assert.ok(G._testBattleMode);
    await _exitTestBattle();assert.equal(find(root,host.id),host,name+' 同じ層を復帰');
    assert.equal(host.parentNode,parent);assert.equal(host.nextSibling,next);assert.equal(host.style.opacity,'0.7');
    assert.ok(parent.classList.contains('active'),name+' 元の画面も復帰');
    assert.equal(host.dataset.face,'保持する表情');assert.equal(G.phase,'reward');assert.equal(G.floor,4);assert.equal(G._testBattleMode,false);
    for(const [key,value] of Object.entries(flags))assert.equal(G[key],value,name+' '+key);
    if(!flags._isLibrary){assert.deepEqual(_rewCards,offers);assert.equal(G.gold,123);}
    await _exitTestBattle();assert.equal(find(root,host.id),host,'二重終了でも同じ層');host.remove();next.remove();
  }
  assert.equal(started,modes.length*2);assert.equal(returned,started);
  initState();G.phase='reward';G._debugMode=true;startTestBattle();await _exitTestBattle();
  console.log(`OK 5: ${modes.length}画面×2回、試験戦闘中の非表示、同一DOM・表情・位置・品揃えの復帰、立ち絵なし`);
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
