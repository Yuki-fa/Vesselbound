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
  await loadGameData();let merges=0,blocked=0;
  assert.equal(panelMergeEnabled(),false,'通常プレイの3枚合体は停止中');
  // 停止中の合体形・旧保存の契約は、検査の間だけ有効にして従来どおり全行検査する。
  PANEL_MERGE_TRIAL.enabled=true;
  for(const row of sheetRows('card')) {
    initState();const original=def(row['No.']);assert.ok(original,row['No.']);
    const atk=sheetNumber(row['パワー']),hp=sheetNumber(row['ライフ']);
    _collectionKind='character';_collectionMerged=true;
    const display=_collectionDisplayCard(original);
    // 2026-10-19：図鑑の「強化」表示は祝福の炎と同じ強化後の姿（基本ATK/HP×2）。3枚合体（×3）は停止中。
    // 強化効果・強化キーワードが両方空欄のカード（ペリカン等）は強化できないので、図鑑も元の値のまま。
    const enhanceable=!!String(row['強化効果']||'').trim()||!!String(row['強化キーワード']||'').trim();
    assert.deepEqual([display.power,display.life],enhanceable?[atk*2,hp*2]:[atk,hp],row['No.']+' 図鑑');
    const slots=[1,3,5];
    slots.forEach((idx,i)=>{
      const c=makePanel(original.id);c._permBasePower=atk;c._permBaseLife=hp;
      c.power=atk+i+1;c.life=hp+(i+1)*2;c.keywords=[...(c.keywords||[]),'隠密'];G.mainBoard[idx]=c;
    });
    const board=_getPartyBoardUnit(),info=_tryTripleMergeOnBoard(board,slots[2]);
    if(isTripleMergeBlockedCard(original)||_isLuggagePanel(original)) {assert.equal(info,null);blocked++;continue;}
    assert.ok(info,row['No.']+' 合体できない');const merged=board.boardCards[info.targetIdx];
    assert.deepEqual([merged.power,merged.life,merged._permBasePower,merged._permBaseLife],[atk*3+6,hp*3+12,atk*3,hp*3],row['No.']+' 3枚の個別補正');
    assert.deepEqual([...merged.directions].sort(),['down','left','right','up']);
    assert.equal(merged.rarity,Math.max(1,Number(original.rarity)||1)+1);
    assert.equal(merged._displayName,original.name+'+');assert.ok(merged.keywords.includes('隠密'));
    assert.equal(board.boardCards.filter(Boolean).length,1);assert.ok(merged._tripleMerged);
    G.mapPanelPowers={[info.targetIdx]:'summon'};
    const pve=buildBoardFormation(board,{persistEternal:false}).ordered.map(e=>[e.unit.atk,e.unit.hp,e.lane]);
    const online=buildOnlineSelfFormation({persistEternal:false}).units.map(u=>[u.atk,u.hp,u.lane]);
    assert.deepEqual(online,pve,row['No.']+' PvE／オンライン入力');merges++;
  }
  // 旧保存の×2＋補正はそのまま。復元で新しい×3へ作り直さない。
  initState();const old=makePanel(def('C006').id),base=def('C006');
  applyMergedPanelForm(old);Object.assign(old,{name:base.name+'+',_tripleMerged:true,_permBasePower:base.power*2,
    _permBaseLife:base.life*2,power:base.power*2+7,life:base.life*2+9});G.mainBoard[1]=old;
  const saved=saveAtReward();SaveRun.restoreRunState(copy(saved));
  assert.deepEqual(G.mainBoard[1],saved.state.player.mainBoard[1],'旧合体済みカードの保存値を保持');
  PANEL_MERGE_TRIAL.enabled=false;
  console.log(`OK 1: ${merges}合体／${blocked}制限カード、図鑑、3枚の補正、4ポート、PvE／オンライン、旧セーブ`);

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
