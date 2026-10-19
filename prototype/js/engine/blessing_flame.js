// 祝福の炎：各塔で一度、カード1枚をシートの強化後の姿へ変える。
const BLESSING_FLAME_CONFIG={
  key:'blessingFlame',name:'祝福の炎',
  position:{x:1621,y:1402},
  flashMs:760,
  // シート未収録の仮文言。施設には会話を挟まず、この説明を表示する。
  text:{description:'魔導板のキャラクター1枚を強化する。',
    used:'この炎の祝福は、すでに失われた。',
    instruction:'強化するキャラクターを1枚選んでください。立ち去ると、この炎は使えなくなります。',
    completed:'強化しました。「元に戻す」で選び直せます。',
    execute:'実行',leave:'立ち去る',preview:'強化後のカード'},
};
// 選択・演出は画面内だけの一時状態。使用済みだけを G に保存する。
let _blessingFlameVisit=null;
function blessingFlameUsed(key){
  return !!((G._blessingFlameUsed||{})[key??_waveFacilityCacheKey()]);
}
function blessingFlameActive(){ return !!(G&&G._isBlessingFlame&&_blessingFlameVisit); }
function blessingFlameCardEligible(card){
  if(!card||String(card.category||'')!=='キャラクター'||!panelHasEnhancementForm(card)
    ||card._merged||card._tripleMerged||card._mergedFormApplied
    ||card._npcCard||card._npcDeployOnly||card._questOfferCard||card._questTransportId) return false;
  return !(typeof questShopExchangeState==='function'&&questShopExchangeState(card)!=='allow');
}
function openBlessingFlame(){
  if(blessingFlameActive()||!G._isWaveAltar||blessingFlameUsed()) return false;
  G._facilityCacheKey=_waveFacilityCacheKey();
  _blessingFlameVisit={key:G._facilityCacheKey,selected:-1,preview:null,executed:false,busy:false};
  G._isBlessingFlame=true;
  G._isShop=G._isItemShop=G._isForge=G._isTavern=G._isFiveSaints=G._isLibrary=G._isLibraryMenu=G._isRingExchange=G._isVillageMenu=false;
  G._ringOfferPhase=false;
  G._showGlobalPanels=false;
  G._mapReturnAfterReward=true;
  G._facilityLabel=BLESSING_FLAME_CONFIG.name;
  G.phase='reward';
  document.body.classList.remove('world-map-active','village-screen-active','right-card-peek');
  document.body.classList.add('blessing-flame-active');
  showScreen('battle');
  goToReward({noNewRewards:true});
  G._rewardOnePickMode=false;
  G._pendingPanelPlacement=null;
  G._pendingItemUse=null;
  _rewCards=[];
  _rewFreePickDone=false;
  _storeRewardStartSnapshot();
  // 塔の背景を維持する（祭壇や五聖の座の専用背景へは替えない）。
  _setOverrideBackground('tower');
  _applyFacilityAmbience(null);
  renderRewCards();renderHandEditor();
  return true;
}
function blessingFlameSelect(index){
  if(!blessingFlameActive()) return false;
  const visit=_blessingFlameVisit,card=(G.mainBoard||[])[index];
  if(visit.busy||visit.executed||blessingFlameUsed(visit.key)||!blessingFlameCardEligible(card)) return false;
  visit.preview=enhancedPanelCopy(card);
  if(!visit.preview) return false;
  visit.selected=index;
  renderRewCards();renderHandEditor();
  return true;
}
async function blessingFlameExecute(){
  if(!blessingFlameActive()) return false;
  const visit=_blessingFlameVisit,index=visit.selected;
  if(visit.busy||visit.executed||blessingFlameUsed(visit.key)||!blessingFlameCardEligible(G.mainBoard[index])) return false;
  const upgraded=enhancedPanelCopy(G.mainBoard[index]);
  if(!upgraded) return false;
  visit.busy=true;
  renderMoveSlotsInEnemy();
  const el=document.querySelector(`#hand-slots > [data-board-idx="${index}"]`);
  if(el){
    const flash=document.createElement('span');
    flash.className='blessing-flame-flash triple-merge-white-flash';
    el.appendChild(flash);
    await new Promise(resolve=>setTimeout(resolve,BLESSING_FLAME_CONFIG.flashMs));
  }
  // ページ内のデバッグ切替などで施設が閉じられた時は古い参照を戻さない。
  if(!blessingFlameActive()||_blessingFlameVisit!==visit) return false;
  G.mainBoard[index]=upgraded;
  visit.executed=true;visit.busy=false;visit.preview=null;
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  renderRewCards();renderHandEditor();
  return true;
}
function blessingFlameReset(){
  if(!blessingFlameActive()||_blessingFlameVisit.busy) return false;
  _blessingFlameVisit.selected=-1;
  _blessingFlameVisit.preview=null;
  _blessingFlameVisit.executed=false;
  resetRewardToStart();
  return true;
}
async function blessingFlameLeave(){
  if(!blessingFlameActive()||_blessingFlameVisit.busy) return false;
  if(!guardFormationLeave()) return false;
  _blessingFlameVisit.busy=true;
  G._blessingFlameUsed=G._blessingFlameUsed||{};
  G._blessingFlameUsed[_blessingFlameVisit.key]=true;
  if(typeof playSfx==='function') playSfx('uiConfirm',{group:'ui',guardKey:'ui:button'});
  await fadeScreenSwitch(()=>{
    openMapVillage({tower:true});
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
      const saved=SaveRun.checkpoint('tower');
      if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') SaveRun.showAutoSaveIndicator();
    }
  });
  return true;
}
function blessingFlameClear(){
  _blessingFlameVisit=null;
  G._isBlessingFlame=false;
  document.body.classList.remove('blessing-flame-active');
}
function blessingFlameRenderPreview(el,section){
  const visit=_blessingFlameVisit,text=BLESSING_FLAME_CONFIG.text;
  section.style.setProperty('--title-reward',JSON.stringify(text.preview));
  if(visit&&visit.preview){
    const card=_mkRewDiv(visit.preview,null,null);
    card.classList.add('blessing-flame-preview');card.draggable=false;
    el.appendChild(card);
  }
  const help=document.createElement('div');help.className='blessing-flame-instruction';
  help.textContent=visit&&visit.executed?text.completed:text.instruction;
  el.appendChild(help);
}
function blessingFlameRenderControls(el){
  const visit=_blessingFlameVisit,text=BLESSING_FLAME_CONFIG.text;
  const button=(label,cls,action,disabled)=>{
    const b=document.createElement('button');b.type='button';b.className='btn '+cls;b.disabled=disabled;
    const span=document.createElement('span');span.className='rew-btn-label';span.textContent=label;b.appendChild(span);
    b.onclick=action;el.appendChild(b);
  };
  button(text.leave,'rew-reset-btn',()=>void blessingFlameLeave(),!visit||visit.busy);
  button(_uiLabel('「元に戻す」ボタン','元に戻す'),'rew-reset-btn',blessingFlameReset,!visit||visit.busy);
  button(_uiLabel('「実行」ボタン',text.execute),'rew-move-btn',()=>void blessingFlameExecute(),!visit||visit.busy||visit.executed||visit.selected<0);
}
function blessingFlameWireCard(el,card,index){
  const visit=_blessingFlameVisit;
  el.draggable=false;
  el.classList.toggle('blessing-flame-unavailable',!blessingFlameCardEligible(card)||!!visit.executed);
  el.classList.toggle('blessing-flame-selected',visit.selected===index&&!visit.executed);
  if(visit.selected===index&&!visit.executed){
    const glow=document.createElement('span');glow.className='blessing-flame-selection-glow';
    el.appendChild(glow);
  }
  el.onclick=e=>{e.stopPropagation();blessingFlameSelect(index);};
}
// この施設では選択と実行だけを受け付け、プレビューの取得・配置換え・道具使用は行わない。
// ホバー説明とオプションはそのまま利用できる。
function blessingFlameBlockInput(event){
  if(!blessingFlameActive()||!event.target||!event.target.closest) return;
  const target=event.target;
  if(!target.closest('#scr-battle')||target.closest('#battle-options-btn,#options-layer')) return;
  if(event.type==='click'&&(target.closest('#reward-move-btns,#board-card-visibility-btn')
    ||!target.closest('button')&&target.closest('#hand-slots > [data-board-idx]'))) return;
  event.preventDefault();event.stopImmediatePropagation();
}
['click','contextmenu','dragstart','dragover','drop'].forEach(type=>window.addEventListener(type,blessingFlameBlockInput,true));
