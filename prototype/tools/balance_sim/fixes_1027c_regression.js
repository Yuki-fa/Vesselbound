'use strict';
// 内蔵CSVと本番の起動・配置復元・指輪操作・保存を通す。画面の可視性はブラウザで別途確認する。
const assert=require('node:assert/strict');
const {makeElement}=require('./stub');
const sheet=require('./sheet_data');
require('./load');
let passed=0,failed=0,errors=[],actions=[];
const noop=()=>{};
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
function element(tag='div'){
  const el=makeElement(tag),classes=new Set(),events={};
  Object.defineProperty(el,'className',{get:()=>[...classes].join(' '),set:value=>{
    classes.clear();String(value).split(/\s+/).filter(Boolean).forEach(c=>classes.add(c));
  }});
  Object.defineProperty(el,'innerHTML',{get:()=>'',set:()=>{el.children=[];}});
  el.classList={add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),contains:c=>classes.has(c),
    toggle:(c,on=!classes.has(c))=>{on?classes.add(c):classes.delete(c);return on;}};
  el.addEventListener=(type,fn)=>{(events[type]||=[]).push(fn);};
  el.fire=(type)=>{for(const fn of events[type]||[])fn({preventDefault:noop,stopPropagation:noop});};
  return el;
}
const moves=element(),ringSlots=Array.from({length:4},()=>element('i'));
const card=(no,enhanced=false)=>{
  const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);
  const out=makePanel(def.id);return enhanced?enhancedPanelCopy(out):out;
};
const ring=no=>clone(RING_POOL.find(r=>r.no===no));
const item=name=>{const out=makeItem(name);assert.ok(out,name);return out;};
function fresh(flags={}){
  initState();SaveRun.begin();Object.assign(G,{phase:'reward',_wave:2,_waveStage:1,_waveLife:2,life:2,gold:800,...flags});
  _rewCards=[];_rewFreePickDone=false;_rewPhaseId++;_pendingCardActivation=null;_blessingFlameVisit=null;errors=[];
}
function enter(flags={}){
  fresh(flags);G.mainBoard[0]=card('C006');G.mainBoard[1]=card('C008');
  _storeRewardStartSnapshot();
}
function resetButton(){renderMoveSlotsInEnemy();const b=moves.children.find(c=>c.classList.contains('rew-reset-btn'));assert.ok(b);return b;}
function altar(){
  fresh({_isRingExchange:true,_isWaveAltar:true,_ringOfferPhase:true,_ringOffer:[ring('R033')]});
  for(const [i,no]of ['E001','E002','C008','C006'].entries())G.mainBoard[i]=card(no);
  _storeRewardStartSnapshot();
}
(async()=>{
  console.table=noop;await loadGameData();
  document.createElement=element;
  document.getElementById=id=>id==='reward-move-btns'?moves:null;
  document.querySelectorAll=s=>s==='.reward-prod-ring .reward-prod-slots i'?ringSlots:[];
  renderHandEditor=renderFieldEditor=renderRewCards=updateHUD=_playActivationFx=_playItemUseVfx=_playItemSlotVfx=noop;
  _syncRewardProductionUi=_syncRewardProductionItems=_removeDragGhost=_clearDragZoneClass=noop;
  showScreen=_setOverrideBackground=_applyFacilityAmbience=noop;
  fadeScreenSwitch=async next=>next();
  openMapVillage=()=>{blessingFlameClear();G._isVillageMenu=true;};
  showErrorOverlay=options=>{errors.push(options);return true;};
  _openRewardActionTooltip=(_anchor,_name,_desc,list)=>{actions=list;};
  const clickRingAction=(index,label)=>{
    _openRingActionConfirm(index,element());const a=actions.find(a=>a.label===label);assert.ok(a,label);a.onClick();
  };

  // 現行の起動はカードを作り直さず、能力値と色だけを書き換える。任意の追加印も丸ごと保持する。
  for(const enhancedSource of [false,true])for(const form of ['通常','強化','旧合体'])await check(`1 インキュバス${enhancedSource?'強化':''}→${form}：全5色で本文・キーワード・名前+・永久強化・配置印を保持`,()=>{
    for(const color of ['赤','青','緑','黄','紫']){
      fresh();const source=G.mainBoard[0]=card('C109',enhancedSource);
      const definition=PANEL_POOL.find(c=>c.no==='C008');
      G.panelPermanentBuffs={[definition.name]:{atk:5,hp:7}};
      G.panelColorPermanentBuffs={[_panelColorBuffKey(definition.color)]:{atk:3,hp:4}};
      const target=G.mainBoard[1]=card('C008',form==='強化');
      assert.equal(target._permBuffAtkApplied,5);assert.equal(target._permBuffHpApplied,7);
      assert.equal(target._permColorBuffAtkApplied,3);assert.equal(target._permColorBuffHpApplied,4);
      if(form==='旧合体')Object.assign(target,{_merged:true,_tripleMerged:true,_displayName:target.name+'+',_tripleBaseName:target.name});
      Object.assign(target,{_placeKey:'original',_activationReady:true,_battleEndCount:3,_extraMark:{value:'keep'}});
      target.power+=7;target.life+=9;target.keywords.push('毒牙7');target._itemKeywordBonuses={毒牙:7};
      source._activationReady=true;const before=clone(target),make=makePanel,pick=coreMathRng.pick;
      const amount=sheet.effectText('C109',enhancedSource).match(/\+(\d+)\/\+(\d+)/);let makes=0;
      try{
        makePanel=(...args)=>{makes++;return make(...args);};coreMathRng.pick=()=>color;
        assert.equal(cardActivationClick(0),true);assert.equal(handleCardActivationTarget(1),true);
      }finally{makePanel=make;coreMathRng.pick=pick;}
      assert.equal(makes,0,'色変更でカードを作り直さない');assert.equal(G.mainBoard[1],target);
      assert.deepEqual(target,{...before,power:before.power+Number(amount[1]),life:before.life+Number(amount[2]),color});
      const expected=clone(target),save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);
      assert.deepEqual(G.mainBoard[1],expected,'保存後も強化状態を保持');
      const formed=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
      const online=buildOnlineSelfFormation().units[0];
      for(const u of [formed,online]){
        assert.equal(u.color,color);assert.equal(u.desc,expected.desc);assert.equal(!!u._tripleMerged,!!expected._tripleMerged);
        assert.ok(u.keywords.includes('毒牙7'));assert.equal(u.atk,expected.power);assert.equal(u.hp,expected.life);
      }
      if(form!=='通常')assert.match(getCardFrameAsset(G.mainBoard[1]),/_m\.svg/,'変更後の色でも強化枠');
    }
  });

  await check('2 トレーダー：共通ボタンから配置だけ戻し、再抽選・消費済みアイテム・強化・支払いを保持',()=>{
    enter({_isShop:true,_isPeddler:true});_rewCards=[card('C007'),card('C009'),null];
    const original=G.mainBoard[0];G.mainBoard[0]=_exchangeShopCardCopy(_rewCards[0]);_rewCards[0]=_exchangeShopCardCopy(original);
    G.mainBoard[4]=G.mainBoard[1];G.mainBoard[1]=null;
    G.spellSlots[0]=item('巨大化の巻物');_useImmediateItem(0,G.spellSlots[0]);handlePendingItemBoardTarget(4);
    assert.equal(G.spellSlots[0],null);const strengthened=clone(G.mainBoard[4]);
    _rewCards[1]=card('C010');G.gold-=100;_storeRewardStartSnapshot();
    const reset=resetButton();assert.equal(reset.children[0].textContent,textMessage('「配置を戻す」ボタン','配置を戻す'));reset.onclick();
    assert.equal(G.mainBoard[0].no,'C006');assert.deepEqual(G.mainBoard[1],strengthened);assert.equal(G.mainBoard[4],null);
    assert.equal(_rewCards[0].no,'C007');assert.equal(_rewCards[1].no,'C010');assert.equal(G.gold,700);assert.equal(G.spellSlots[0],null);
  });
  await check('2 トレーダー：最初のカードが再抽選で失われた時は暗いボタンと既存エラー',()=>{
    enter({_isShop:true,_isPeddler:true});G.mainBoard[0]=card('C007');_rewCards=[card('C009')];
    const before=clone([G.mainBoard,_rewCards]);const b=resetButton();assert.ok(b.classList.contains('disabled'));assert.equal(b.disabled,false);
    b.onclick();assert.equal(errors.length,1);assert.deepEqual([G.mainBoard,_rewCards],before);
  });
  await check('2 祭壇：配置を戻し、1枚ずつの選択を外す。アイテムによる強化は保持',()=>{
    altar();G.mainBoard[4]=G.mainBoard[3];G.mainBoard[3]=null;G.mainBoard[4].power+=11;
    _discardBoardCardForRingOffer(0,G.mainBoard[0]);_discardBoardCardForRingOffer(2,G.mainBoard[2]);
    assert.deepEqual(G._ringOfferSelectedSlots,[0,2]);const b=resetButton();assert.equal(b.children[0].textContent,'配置を戻す');b.onclick();
    assert.equal(G.mainBoard[4],null);assert.equal(G.mainBoard[3].power,Number(PANEL_POOL.find(c=>c.no==='C006').power)+11);
    assert.deepEqual(G._ringOfferSelectedSlots,[]);assert.equal(G._ringOfferUnlocked,false);assert.equal(G._boardDiscardCount,0);
  });
  await check('2/3 祭壇：指輪取得後の消滅カードは復元せず、初期カード不存在時のエラー。生命の指輪は1度だけ回復',()=>{
    altar();for(const i of [0,1,2])_discardBoardCardForRingOffer(i,G.mainBoard[i]);
    assert.equal(_takeRingOffer(0),true);assert.equal(waveLifeMax(),4);assert.equal(G._waveLife,3);assert.equal(G.life,3);
    const before=clone([G.mainBoard,G.rings,G._waveLife]);assert.equal(rewardPlacementInitialMissing(),true);
    resetButton().onclick();assert.equal(errors.length,1);assert.deepEqual([G.mainBoard,G.rings,G._waveLife],before);
    assert.equal(_takeRingOffer(0),false);assert.equal(G._waveLife,3);
    const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);assert.equal(G._waveLife,3);assert.equal(waveLifeMax(),4);
  });
  await check('2 祝福の炎：選択解除と配置だけの復元。祝福・アイテム消費は残り、再実行できない',async()=>{
    enter({_isWaveAltar:true});assert.equal(openBlessingFlame(),true);
    assert.equal(blessingFlameSelect(1),true);assert.equal(blessingFlameReset(),true);assert.equal(_blessingFlameVisit.selected,-1);
    assert.equal(blessingFlameSelect(1),true);assert.equal(await blessingFlameExecute(),true);const strengthened=clone(G.mainBoard[1]);
    G.mainBoard[4]=G.mainBoard[1];G.mainBoard[1]=null;G.spellSlots[0]=item('巨大化の巻物');_useImmediateItem(0,G.spellSlots[0]);handlePendingItemBoardTarget(4);
    const afterItem=clone(G.mainBoard[4]);assert.ok(afterItem.power>strengthened.power);
    const b=resetButton();assert.equal(b.children[0].textContent,'配置を戻す');b.onclick();
    assert.deepEqual(G.mainBoard[1],afterItem);assert.equal(G.mainBoard[4],null);assert.equal(G.spellSlots[0],null);
    assert.equal(_blessingFlameVisit.executed,true);assert.equal(blessingFlameSelect(0),false);assert.equal(await blessingFlameExecute(),false);
    assert.equal(await blessingFlameLeave(),true);assert.equal(blessingFlameUsed(2),true);
    assert.equal(openBlessingFlame(),true);assert.equal(blessingFlameReset(),true);assert.equal(blessingFlameSelect(0),false);
  });
  await check('3 生命の指輪：取得で現在ライフ+1、上限減少は上限を超える時だけ切り下げ。満枠の取得失敗は回復なし',()=>{
    for(const online of [false,true]){
      fresh({_onlineMode:online});const base=waveLifeMax();assert.equal(_takeRingCard(ring('R033')),true);
      assert.equal(waveLifeMax(),base+1);assert.equal(G._waveLife,3);assert.equal(G.life,3);
      G._waveLife=G.life=base+1;clickRingAction(0,'捨てる');assert.equal(G._waveLife,base);assert.equal(G.life,base);
      G._waveLife=G.life=1;_takeRingCard(ring('R033'));clickRingAction(0,'捨てる');assert.equal(G._waveLife,2,'減少後の上限を下回る時はそのまま');
      G.rings=Array(4).fill(null).map(()=>ring('R001'));assert.equal(_takeRingCard(ring('R033')),false);assert.equal(G._waveLife,2);
    }
    fresh();delete G._waveLife;G.life=2;_takeRingCard(ring('R033'));assert.equal(G.life,3);assert.equal(G._waveLife,undefined);
  });
  await check('3 有効化・無効化・鏡の指輪の並べ替えも実効上限の差だけ反映',()=>{
    fresh();G.rings=[clone(RING_POOL.find(r=>r.name==='鏡の指輪')),ring('R033'),null,null];assert.ok(G.rings[0]);
    G._waveLife=G.life=waveLifeMax();const high=waveLifeMax();clickRingAction(1,'無効化');
    assert.equal(G._waveLife,high-2);clickRingAction(1,'有効化');assert.equal(G._waveLife,high);
    _syncRewardProductionRings();_dragSrc={arr:'rings',idx:0};ringSlots[2].fire('drop');
    assert.equal(waveLifeMax(),high-1);assert.equal(G._waveLife,high-1);assert.equal(G.life,high-1);
    _syncRewardProductionRings();_dragSrc={arr:'rings',idx:2};ringSlots[0].fire('drop');
    assert.equal(waveLifeMax(),high);assert.equal(G._waveLife,high);assert.equal(G.life,high);
  });
  await check('3 元に戻す・配置を戻す・繰り返しのセーブ復元で二重回復しない（旧控えも含む）',()=>{
    enter();const empty=SaveRun.buildRunSave('reward');_takeRingCard(ring('R033'));assert.equal(G._waveLife,3);
    resetRewardPlacement();resetRewardPlacement();assert.equal(G._waveLife,3);assert.equal(G.rings[0].no,'R033');
    _storeRewardStartSnapshot();const withRing=SaveRun.buildRunSave('reward');
    clickRingAction(0,'捨てる');resetRewardToStart();resetRewardToStart();assert.equal(G._waveLife,3);assert.equal(waveLifeMax(),4);
    for(let i=0;i<3;i++){SaveRun.restoreRunState(clone(withRing));resetRewardToStart();assert.equal(G._waveLife,3);assert.equal(waveLifeMax(),4);}
    SaveRun.restoreRunState(clone(empty));assert.equal(G._waveLife,2);assert.equal(waveLifeMax(),3);
    const legacy=clone(withRing);delete legacy.state.choices._rewardStartSnapshot.ascensionLifeBonus;
    SaveRun.restoreRunState(legacy);resetRewardToStart();assert.equal(G._waveLife,3);assert.equal(waveLifeMax(),4);
  });
  console.log(`fixes_1027c: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
