'use strict';
// 内蔵シートと本番の配置・施設・起動・説明描画を通す。可視性・実ポインター操作は別途ブラウザで確認する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {makeElement}=require('./stub');
require('./load');
let passed=0,failed=0,errors=[],boardNodes=[];
const noop=()=>{};
async function check(name,fn){
  try{await fn();passed++;console.log('OK '+name);}
  catch(error){failed++;console.error('NG '+name+'\n'+error.stack);}
}
function element(tag='div'){
  const el=makeElement(tag),classes=new Set(),attrs=new Map(),events={};
  Object.defineProperty(el,'className',{get:()=>[...classes].join(' '),set:s=>{
    classes.clear();String(s).split(/\s+/).filter(Boolean).forEach(c=>classes.add(c));
  }});
  Object.defineProperty(el,'innerHTML',{get:()=>el._html||'',set:s=>{el._html=String(s);el.children=[];}});
  el.classList={add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),contains:c=>classes.has(c),
    toggle:(c,on=!classes.has(c))=>{on?classes.add(c):classes.delete(c);return on;},[Symbol.iterator]:()=>classes.values()};
  el.setAttribute=(key,value)=>attrs.set(key,String(value));el.getAttribute=key=>attrs.get(key)||null;el.removeAttribute=key=>attrs.delete(key);
  el.addEventListener=(type,fn)=>{(events[type]||=[]).push(fn);};
  el.fire=type=>{const ev={preventDefault:noop,stopPropagation:noop,dataTransfer:{setDragImage:noop}};(events[type]||[]).forEach(fn=>fn(ev));};
  return el;
}
const moves=element(),tooltip=element(),itemSlots=Array.from({length:4},()=>element('i')),ringSlots=Array.from({length:4},()=>element('i'));
const card=(no,enhanced=false)=>{const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);const out=makePanel(def.id);return enhanced?enhancedPanelCopy(out):out;};
const item=name=>{const out=makeItem(name);assert.ok(out,name);return out;};
const ring=name=>{const out=RING_POOL.find(c=>c.name===name);assert.ok(out,name);return clone(out);};
function fresh(flags={}){
  initState();SaveRun.begin();Object.assign(G,{phase:'reward',_wave:2,_waveStage:1,_waveLife:3,life:3,gold:800,...flags});
  _rewCards=[];_rewFreePickDone=false;_rewPhaseId++;_pendingCardActivation=null;_blessingFlameVisit=null;errors=[];
  presentResetSummonPreview();document.body=element('body');tooltip.innerHTML='';tooltip.dataset={};
  G.mainBoard[1]=card('C109');G.mainBoard[3]=card('C008');G.mainBoard[5]=card('C006');G.mainBoard[6]=card('C007');
  G.mainBoard[1]._activationReady=true;
  _storeRewardStartSnapshot();
}
function enter(kind){
  fresh();
  if(kind==='祭壇')Object.assign(G,{_isRingExchange:true,_isWaveAltar:true,_ringOfferPhase:true,_ringOffer:[ring('不死の指輪')]});
  if(kind==='祝福'){G._isWaveAltar=true;assert.equal(openBlessingFlame(),true);}
  if(kind==='トレーダー')Object.assign(G,{_isShop:true,_isPeddler:true});
}
function resetButton(){moves.children=[];renderMoveSlotsInEnemy();const b=moves.children.find(c=>c.classList.contains('rew-reset-btn'));assert.ok(b);return b;}
function drawBoard(){
  boardNodes=G.mainBoard.map((c,i)=>{
    if(!c)return null;const el=element();el.draggable=true;el.dataset.boardIdx=String(i);_wireHeCardControls(el,c,'boardCards',i);return el;
  });
}
function click(el){assert.equal(typeof el.onclick,'function');el.onclick({stopPropagation:noop});}
function input(type,path){
  let prevented=false,stopped=false;
  const target={closest:selectors=>selectors.split(',').some(s=>['#scr-battle',...path].includes(s.trim()))?true:null};
  blessingFlameBlockInput({type,target,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
  return {prevented,stopped};
}
function move(from,to){drawBoard();assert.equal(boardNodes[from].draggable,true);boardNodes[from].fire('dragstart');dropOnCard('boardCards',to);}
function useTransform(){
  G.spellSlots[0]=item('変身の巻物');_useImmediateItem(0,G.spellSlots[0]);
  assert.ok(G._pendingItemUse);assert.equal(handlePendingItemBoardTarget(3),true);assert.equal(handlePendingItemBoardTarget(5),true);
  assert.equal(G.spellSlots[0],null);assert.equal(G._pendingItemUse,null);
}
(async()=>{
  console.table=noop;await loadGameData();
  document.createElement=element;
  document.getElementById=id=>id==='reward-move-btns'?moves:id==='kw-tooltip'?tooltip:null;
  document.querySelectorAll=selector=>selector==='.reward-prod-item .reward-prod-slots i'?itemSlots
    :selector==='.reward-prod-ring .reward-prod-slots i'?ringSlots:selector==='#hand-slots > [data-board-idx]'?boardNodes.filter(Boolean):[];
  renderHandEditor=drawBoard;renderFieldEditor=renderRewCards=updateHUD=noop;
  _playActivationFx=_playItemUseVfx=_playItemSlotVfx=_createDragGhost=_removeDragGhost=_clearDragZoneClass=_setDragZoneClass=noop;
  _detachBoardConnectionVisuals=_hideDragSourceParts=_flashConnectedBoardCards=noop;
  showScreen=_setOverrideBackground=_applyFacilityAmbience=noop;
  showErrorOverlay=options=>{errors.push(options);return true;};

  await check('1 祭壇：選択解除と配置だけ復元し、取得後は共通の不存在エラー。指輪・供物は巻き戻さない',()=>{
    enter('祭壇');const original=G.mainBoard[3];_discardBoardCardForRingOffer(3,original);
    move(3,4);assert.equal(G.mainBoard[4],original);assert.equal(resetRewardPlacement(),true);
    assert.equal(G.mainBoard[3],original);assert.deepEqual(G._ringOfferSelectedSlots,[]);
    for(const i of [3,5,6])_discardBoardCardForRingOffer(i,G.mainBoard[i]);
    assert.equal(_takeRingOffer(0),true);const before=clone([G.mainBoard,G.rings,G.gold,G._waveLife]);
    const button=resetButton();assert.equal(button.children[0].textContent,'配置を戻す');assert.ok(button.classList.contains('disabled'));
    assert.equal(button.disabled,false);button.onclick();assert.equal(errors.length,1);
    assert.deepEqual([G.mainBoard,G.rings,G.gold,G._waveLife],before);assert.equal(_takeRingOffer(0),false);
  });
  for(const no of ['C008','E001'])await check('1 祝福：'+no+'の強化後の実体・効果・配置印を保ち、元の位置へ戻す',async()=>{
    enter('祝福');G.mainBoard[3]=card(no);delete G._placementStart;_storeRewardStartSnapshot();
    const key=G.mainBoard[3]._placeKey;assert.equal(blessingFlameSelect(3),true);assert.equal(await blessingFlameExecute(),true);
    const upgraded=G.mainBoard[3],expected=clone(upgraded);move(3,4);
    resetButton().onclick();assert.equal(G.mainBoard[3],upgraded);assert.deepEqual(G.mainBoard[3],expected);
    assert.equal(G.mainBoard[3]._placeKey,key);assert.equal(G.mainBoard[4],null);assert.equal(errors.length,0);
    assert.equal(_blessingFlameVisit.executed,true);assert.equal(await blessingFlameExecute(),false);
  });
  for(const kind of ['編成','祭壇','祝福','トレーダー'])await check('1 '+kind+'：変身で初期カードを失うと警告。保存・復元しても復元不可',()=>{
    enter(kind);const key=G.mainBoard[3]._placeKey;useTransform();
    assert.equal(G.mainBoard[3].no,'C006');assert.notEqual(G.mainBoard[3]._placeKey,key);
    assert.equal(rewardPlacementInitialMissing(),true);_storeRewardStartSnapshot();assert.equal(rewardPlacementInitialMissing(),true);
    const before=clone([G.mainBoard,_rewCards,G.spellSlots]);resetButton().onclick();assert.equal(errors.length,1);
    assert.deepEqual([G.mainBoard,_rewCards,G.spellSlots],before);
    SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));assert.equal(rewardPlacementInitialMissing(),true);
  });
  await check('1 変身先に元カードを複製しても別個体として不存在。元カードが手持ちにあればそこから復元',()=>{
    enter('編成');const original=G.mainBoard[3];useTransform();
    G.mainBoard[3]=card('C008');assert.equal(rewardPlacementInitialMissing(),true);
    _rewCards=[_placementOfferCard(original)];assert.equal(rewardPlacementInitialMissing(),false);
    assert.equal(resetRewardPlacement(),true);assert.equal(G.mainBoard[3].no,'C008');assert.equal(G.mainBoard[3]._placeKey,original._placeKey);
  });
  await check('1 セーブ：入場時の配置・識別番号を保存し、古いセーブは復元後の配置から始める',()=>{
    enter('編成');const base=clone(G._placementStart),seq=G._placeKeySeq;move(3,4);
    const saved=SaveRun.buildRunSave('reward');assert.deepEqual(saved.state.choices._placementStart,base);assert.equal(saved.state.choices._placeKeySeq,seq);
    SaveRun.restoreRunState(saved);assert.equal(rewardPlacementInitialMissing(),false);assert.equal(resetRewardPlacement(),true);
    assert.equal(G.mainBoard[3].no,'C008');assert.equal(G.mainBoard[4],null);
    const legacy=clone(saved);delete legacy.state.choices._placementStart;delete legacy.state.choices._placeKeySeq;
    SaveRun.restoreRunState(legacy);assert.equal(rewardPlacementInitialMissing(),false);assert.equal(resetRewardPlacement(),true);
    assert.equal(G.mainBoard[3],null);assert.equal(G.mainBoard[4].no,'C008');
  });
  for(const kind of ['編成','祝福','祭壇','トレーダー'])await check('1 '+kind+'：インキュバスの色・能力変更は同じカードとして戻し、使用回数を戻さない',async()=>{
    enter(kind);
    if(kind==='祝福'){blessingFlameSelect(5);await blessingFlameExecute();}
    if(kind==='祭壇'){G.mainBoard[7]=card('C010');for(const i of [5,6,7])_discardBoardCardForRingOffer(i,G.mainBoard[i]);assert.equal(_takeRingOffer(0),true);
      // 指輪取得後に入り直した画面では、残ったカードがその画面の初期カード。
      _rewPhaseId++;_storeRewardStartSnapshot();}
    const original=G.mainBoard[3],key=original._placeKey;
    assert.equal(cardActivationClick(1),true);assert.equal(handleCardActivationTarget(3),true);
    const changed=clone(original);move(3,4);resetButton().onclick();
    assert.equal(G.mainBoard[3],original);assert.equal(original._placeKey,key);assert.deepEqual(original,changed);
    assert.equal(G.mainBoard[1]._activationReady,undefined);assert.equal(errors.length,0);
  });

  await check('2 祝福のデバッグ入力：一覧・廃棄・ボタンを許可し、通常時・白光中・プレビュー取得は制限',()=>{
    enter('祝福');G._debugMode=true;
    for(const type of ['click','dragstart','dragover','drop','contextmenu'])assert.deepEqual(input(type,['#debug-card-palette']),{prevented:false,stopped:false});
    for(const path of [['.debug-discard-btn'],['#btn-test-battle'],['[id^="btn-debug-"]']])assert.equal(input('click',path).prevented,false);
    assert.equal(input('dragstart',['#reward-offer-row']).prevented,true);assert.equal(input('drop',['#reward-offer-row']).prevented,true);
    G._debugMode=false;assert.equal(input('click',['.debug-discard-btn']).prevented,true);
    G._debugMode=true;_blessingFlameVisit.busy=true;assert.equal(input('click',['#debug-card-palette']).prevented,true);
  });
  await check('2 祝福：デバッグ一覧からクリック／ドラッグで配置し、廃棄も実行する',()=>{
    for(const drag of [false,true]){
      enter('祝福');G._debugMode=true;blessingFlameSelect(3);
      assert.equal(input(drag?'dragstart':'click',['#debug-card-palette']).prevented,false);assert.equal(_blessingFlameVisit.selected,-1);
      const id=PANEL_POOL.find(c=>c.no==='C010').id;
      if(drag){_dragSrc={arr:'debugPanel',card:_debugMakePanelCard(id)};dropOnCard('boardCards',4);}
      else{_debugTakePanelCard(id);assert.equal(blessingFlameSelect(3),false);placePendingPanelToSelectedUnit(4);}
      assert.equal(G.mainBoard[4].no,'C010');assert.equal(G._pendingPanelPlacement,null);
      const button=element('button'),host=element();button.className='shop-board-sell-action debug-discard-btn';host.querySelector=()=>button;
      _wireHeCardDiscard(host,G.mainBoard[4],G.mainBoard,'boardCards',4,false);
      assert.equal(input('click',['.debug-discard-btn']).prevented,false);click(button);assert.equal(G.mainBoard[4],null);
    }
  });
  for(const upgraded of [false,true])await check('2 祝福→試験戦闘→帰還：'+(upgraded?'強化後':'強化前')+'の操作・配置控えを維持',async()=>{
    enter('祝福');G._debugMode=true;if(upgraded){blessingFlameSelect(3);await blessingFlameExecute();}
    const visit=clone(_blessingFlameVisit),base=clone(G._placementStart),phase=_rewPhaseId;
    const old={startBattle,onBattleEnd,goToReward};
    try{
      startBattle=()=>{G.phase='enemy';};onBattleEnd=async()=>{_rewPhaseId++;G._placementStart=null;};goToReward=()=>{G.phase='reward';};
      startTestBattle();assert.equal(blessingFlameActive(),false);assert.equal(document.body.classList.contains('blessing-flame-active'),false);
      assert.equal(input('click',[]).prevented,false);await _exitTestBattle();
      assert.equal(blessingFlameActive(),true);assert.deepEqual(_blessingFlameVisit,visit);assert.deepEqual(G._placementStart,base);assert.equal(_rewPhaseId,phase);
      assert.equal(document.body.classList.contains('blessing-flame-active'),true);assert.equal(blessingFlameReset(),true);
    }finally{Object.assign(globalThis,old);}
  });

  for(const name of ['不死の指輪','召竜の巻物'])await check('3 '+name+'：所持・提示・固定説明に、召喚体のキーワード合算とゲーム中の強化を表示',()=>{
    fresh();const isRing=name==='不死の指輪',aux=isRing?ring(name):item(name),raw=aux.desc;
    const summonName=raw.match(/「([^」]+)」を/)[1],def=PANEL_POOL.find(c=>c.name===summonName||c.color+c.name===summonName);assert.ok(def);
    G.gameSummonBuff={atk:7,hp:9,shock:2};const rng=G._runRngState,before=clone(G.gameSummonBuff);
    const expected=corePreviewSummonStats({gameSummonBuff:{p1:G.gameSummonBuff},units:{p1:[],p2:[]},rings:{p1:[],p2:[]}},'p1',def,aux);
    const note=`${expected.atk}/${expected.hp}の「${summonName}」`;
    const verify=text=>{assert.ok(text.includes(note),text);assert.ok(text.includes(`衝撃${coreKeywordSum({keywords:expected.keywords},'衝撃')}`),text);};
    verify(_plainEffectTextForPreview(aux));if(!isRing)verify(mkCardEl(aux,0,'reward').getAttribute('data-preview'));
    if(isRing){
      G.rings[0]=aux;_syncRewardProductionRings();verify(ringSlots[0].getAttribute('data-preview'));
      _showRewardRingTooltip({currentTarget:ringSlots[0],clientX:0,clientY:0});verify(tooltip.innerHTML);
      const row=element();G._ringOffer=[aux];_renderRingOfferCards(row);verify(row.children[0].getAttribute('data-preview'));
    }else{G.spellSlots[0]=aux;_syncRewardProductionItems();verify(itemSlots[0].getAttribute('data-preview'));}
    const old=_openRewardActionTooltip;let desc;
    try{_openRewardActionTooltip=(_a,_n,text)=>{desc=text;};tooltip.dataset.rewardLocked='';
      if(isRing)_openRingActionConfirm(0,element());else _openItemUseConfirm(0,element());verify(desc);
    }finally{_openRewardActionTooltip=old;}
    assert.equal(aux.desc,raw);assert.equal(G._runRngState,rng);assert.deepEqual(G.gameSummonBuff,before);
  });

  for(const selected of [false,true])await check('4 祭壇：'+(selected?'選択中':'未選択')+'のカードを動かし、選択解除・指輪再ロック後も取得と配置復元が可能',()=>{
    enter('祭壇');if(selected)for(const i of [3,5,6])_discardBoardCardForRingOffer(i,G.mainBoard[i]);
    const original=G.mainBoard[3];move(3,4);
    assert.equal(G.mainBoard[4],original);assert.equal(G.mainBoard[3],null);assert.deepEqual(G._ringOfferSelectedSlots,[]);
    assert.equal(G._ringOfferUnlocked,false);assert.equal(_takeRingOffer(0),false);
    resetButton().onclick();assert.equal(G.mainBoard[3],original);assert.equal(G.mainBoard[4],null);
    for(const i of [3,5,6])_discardBoardCardForRingOffer(i,G.mainBoard[i]);assert.equal(_takeRingOffer(0),true);assert.equal(G.mainBoard[1].no,'C109');
  });
  await check('2/4 CSS：祝福でデバッグ廃棄・ボタンを隠さず、祭壇で供物に選べないカードもドラッグ可能',()=>{
    const html=fs.readFileSync(require.resolve('../../index.html'),'utf8');
    assert.match(html,/html body\.blessing-flame-active :is\(\.shop-board-sell-value:not\(\.debug-discard-btn\),\.quest-part-btn\)\{display:none!important\}/);
    assert.match(html,/html body\.ring-offer-selecting:not\(\.item-use-picking\):not\(\.activation-picking\) #scr-battle #hand-slots\.board-slots > \.card\{pointer-events:auto!important/);
  });

  for(const kind of ['祝福','祭壇'])await check('5 '+kind+'：確定前は起動不可、確定後は充填済みの1回だけ使用。配置復元・再入場では再充填しない',async()=>{
    enter(kind);assert.equal(cardActivationCanUse(G.mainBoard[1]),false);assert.equal(cardActivationClick(1),false);
    if(kind==='祝福'){blessingFlameSelect(1);await blessingFlameExecute();}
    else{for(const i of [3,5,6])_discardBoardCardForRingOffer(i,G.mainBoard[i]);assert.equal(_takeRingOffer(0),true);G.mainBoard[3]=card('C008');}
    const source=G.mainBoard[1];assert.equal(cardActivationCanUse(source),true);drawBoard();assert.ok(boardNodes[1].classList.contains('card-activation-ready'));
    assert.equal(cardActivationClick(1),true);
    if(kind==='祝福')assert.equal(input('contextmenu',[]).prevented,false,'共通の起動取り消しへ渡す');
    assert.equal(handleCardActivationTarget(3),true);assert.equal(source._activationReady,undefined);
    assert.equal(cardActivationCanUse(source),false);assert.equal(cardActivationClick(1),false);
    resetButton().onclick();assert.equal(source._activationReady,undefined);
    if(kind==='祝福'){G._blessingFlameUsed[2]=true;blessingFlameClear();openBlessingFlame();assert.equal(cardActivationCanUse(G.mainBoard[1]),false);
      G.mainBoard[1]._activationReady=true;assert.equal(cardActivationCanUse(G.mainBoard[1]),true);}
  });
  await check('5 祝福後の起動で保存：強化・使用済みの炎・起動使用印を同時に保存し、再開後に強化し直せない',async()=>{
    enter('祝福');blessingFlameSelect(3);await blessingFlameExecute();
    assert.equal(blessingFlameUsed(2),false,'訪問中の扱いは変更しない');
    cardActivationClick(1);handleCardActivationTarget(3);
    const expected=clone(G.mainBoard[3]),saved=SaveRun.buildRunSave('reward');
    assert.equal(saved.state.choices._blessingFlameUsed[2],true);assert.equal(blessingFlameUsed(2),false);
    SaveRun.restoreRunState(saved);assert.deepEqual(G.mainBoard[3],expected);assert.equal(G.mainBoard[1]._activationReady,undefined);
    assert.equal(openBlessingFlame(),true);assert.equal(blessingFlameUsed(2),true);assert.equal(blessingFlameSelect(5),false);
  });
  console.log(`fixes_1027d: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
