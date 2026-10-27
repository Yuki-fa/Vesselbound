'use strict';
// 内蔵データと本番のカード操作を通す。CSSの実効値・可視性は fixes_1027e_visual_check.js で確認する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {makeElement}=require('./stub');
require('./load');
let passed=0,failed=0,boardNodes=[];
const noop=()=>{};
async function check(name,fn){
  try{await fn();passed++;console.log('OK '+name);}
  catch(error){failed++;console.error('NG '+name+'\n'+error.stack);}
}
function element(tag='div'){
  const el=makeElement(tag),classes=new Set();
  Object.defineProperty(el,'className',{get:()=>[...classes].join(' '),set:value=>{
    classes.clear();String(value).split(/\s+/).filter(Boolean).forEach(c=>classes.add(c));
  }});
  el.classList={add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),contains:c=>classes.has(c),
    toggle:(c,on=!classes.has(c))=>{on?classes.add(c):classes.delete(c);return on;}};
  return el;
}
function panel(no){const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);return makePanel(def.id);}
function draw(){
  boardNodes=G.mainBoard.map((card,i)=>{
    if(!card)return null;
    const el=element();el.className='card';el.dataset.boardIdx=String(i);
    _wireHeCardControls(el,card,'boardCards',i);return el;
  });
}
function fresh(kind){
  initState();SaveRun.begin();
  Object.assign(G,{phase:'reward',_wave:2,_waveStage:1,_waveLife:3,gold:800});
  _pendingCardActivation=null;_blessingFlameVisit=null;_rewCards=[];_rewPhaseId++;
  document.body=element('body');G.mainBoard.fill(null);
  for(const [i,no]of [[1,'C109'],[3,'C008'],[5,'C006'],[6,'C007'],[7,'C010'],[9,'C109']])G.mainBoard[i]=panel(no);
  G.mainBoard[1]._activationReady=G.mainBoard[9]._activationReady=true;
  if(kind==='祝福'){G._isWaveAltar=true;assert.equal(openBlessingFlame(),true);}
  if(kind==='祭壇'){
    const ring=RING_POOL.find(c=>c.name==='不死の指輪');assert.ok(ring);
    Object.assign(G,{_isRingExchange:true,_isWaveAltar:true,_ringOfferPhase:true,_ringOffer:[clone(ring)]});
  }
  if(kind==='魔導店')G._isShop=true;
  if(kind==='行商人')G._isShop=G._isPeddler=true;
  _storeRewardStartSnapshot();draw();
}
function appearance(index,mode){
  const el=boardNodes[index];assert.ok(el);
  const labels=el.children.filter(c=>c.classList.contains('card-activation-ready-label'));
  assert.equal(labels.length,mode==='なし'?0:1,'ラベルの有無');
  assert.equal(el.classList.contains('card-activation-ready'),mode==='明','緑の発光');
  if(labels.length){
    assert.equal(labels[0].textContent,textMessage('「起動可」表示','起動可'));
    assert.equal(labels[0].classList.contains('card-activation-locked'),mode==='暗','ラベルの明暗');
  }
}
(async()=>{
  console.table=noop;await loadGameData();
  document.createElement=element;
  document.querySelector=selector=>{
    const match=selector.match(/^#hand-slots > \[data-board-idx="(\d+)"\]$/);
    return match?boardNodes[Number(match[1])]||null:null;
  };
  document.querySelectorAll=selector=>selector==='#hand-slots > [data-board-idx]'?boardNodes.filter(Boolean):[];
  renderHandEditor=draw;renderFieldEditor=renderRewCards=renderMoveSlotsInEnemy=updateHUD=noop;
  _playActivationFx=_removeDragGhost=_clearDragZoneClass=noop;
  showScreen=_setOverrideBackground=_applyFacilityAmbience=noop;

  for(const kind of ['祝福','祭壇'])await check(kind+'：完了前・選択中は暗いラベルのみ。完了後に全ての充填済みカードが明るくなり起動できる',async()=>{
    fresh(kind);const source=G.mainBoard[1],before=clone(G.mainBoard);
    for(const i of [1,9]){appearance(i,'暗');assert.equal(cardActivationCanUse(G.mainBoard[i]),false);}
    assert.equal(cardActivationClick(1),false);assert.equal(_pendingCardActivation,null);
    assert.deepEqual(G.mainBoard,before,'起動の試行でカードを変えない');
    boardNodes[1].onclick({stopPropagation:noop});assert.equal(_pendingCardActivation,null);
    appearance(1,'暗');appearance(9,'暗');
    if(kind==='祝福'){
      assert.equal(_blessingFlameVisit.selected,1);
      const executing=blessingFlameExecute();
      assert.equal(_blessingFlameVisit.busy,true);draw();appearance(1,'暗');appearance(9,'暗');
      assert.equal(cardActivationClick(1),false);assert.equal(await executing,true);
      assert.equal(G.mainBoard[1]._activationReady,true,'強化で充填を失わない');
    }else{
      _clearRingOfferSelection();
      for(const i of [5,6,7])_discardBoardCardForRingOffer(i,G.mainBoard[i]);
      assert.equal(G._ringOfferUnlocked,true);appearance(1,'暗');appearance(9,'暗');
      assert.equal(cardActivationClick(1),false);assert.equal(_takeRingOffer(0),true);
      assert.equal(G.mainBoard[1],source,'交換は充填を作り直さない');
    }
    for(const i of [1,9]){appearance(i,'明');assert.equal(cardActivationCanUse(G.mainBoard[i]),true);}
    boardNodes[1].onclick({stopPropagation:noop});assert.equal(_pendingCardActivation.card,G.mainBoard[1]);
    assert.equal(boardNodes[1].classList.contains('card-activation-source'),true);
    assert.equal(handleCardActivationTarget(3),true);
    assert.equal(G.mainBoard[1]._activationReady,undefined);appearance(1,'なし');appearance(9,'明');
    assert.equal(cardActivationClick(1),false,'使用済みは再起動不可');
  });
  for(const kind of ['編成','魔導店','行商人'])await check(kind+'：従来どおり明るいラベル・発光・起動を維持',()=>{
    fresh(kind);appearance(1,'明');appearance(9,'明');
    boardNodes[1].onclick({stopPropagation:noop});assert.equal(_pendingCardActivation.card,G.mainBoard[1]);
    assert.equal(handleCardActivationTarget(3),true);appearance(1,'なし');appearance(9,'明');
  });
  for(const kind of ['祝福','祭壇'])await check(kind+'：未充填・起動効果なしにはラベルを出さず、完了だけで充填しない',async()=>{
    fresh(kind);delete G.mainBoard[1]._activationReady;G.mainBoard[3]._activationReady=true;
    draw();appearance(1,'なし');appearance(3,'なし');
    if(kind==='祝福'){blessingFlameSelect(3);await blessingFlameExecute();}
    else{for(const i of [5,6,7])_discardBoardCardForRingOffer(i,G.mainBoard[i]);assert.equal(_takeRingOffer(0),true);}
    draw();appearance(1,'なし');appearance(3,'なし');appearance(9,'明');
    assert.equal(cardActivationClick(1),false);
  });
  await check('使用済みの祝福・交換済みの祭壇への再入場でも、充填済みだけ明るく表示',()=>{
    fresh('祝福');blessingFlameClear();G._blessingFlameUsed[2]=true;
    assert.equal(openBlessingFlame(),true);appearance(1,'明');
    delete G.mainBoard[1]._activationReady;draw();appearance(1,'なし');
    fresh('祭壇');G._ringOfferResolved=true;draw();appearance(1,'明');
    delete G.mainBoard[1]._activationReady;draw();appearance(1,'なし');
  });
  await check('施設外の起動不可画面にはラベルを増やさない',()=>{
    for(const flag of ['_isLibrary','_isTavern','_isVillageMenu','_isWaveAltar','_isFiveSaints']){
      fresh('編成');G[flag]=true;draw();appearance(1,'なし');
    }
    for(const kind of ['祝福','祭壇']){fresh(kind);G.phase='player';draw();appearance(1,'なし');}
  });
  await check('CSS：待機ラベルは明るさ40%、ドラッグ中の一括リセットからも除外',()=>{
    const html=fs.readFileSync(require.resolve('../../index.html'),'utf8');
    assert.match(html,/html body\.reward-screen-active \.card-activation-ready-label\.card-activation-locked\s*\{\s*opacity:\.4!important;/,
      'body直下のドラッグゴーストにも同じ暗転を適用する');
    const dragResets=html.match(/^html body\.dragzone-[^\n]+#main-hand-area #hand-pane \*[^\n]+/gm);
    assert.equal(dragResets.length,3);
    dragResets.forEach(selector=>assert.ok(selector.includes(':not(.card-activation-locked)')));
  });
  console.log(`fixes_1027e: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
