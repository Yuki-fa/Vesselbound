// 祝福の炎：各塔で一度、魔導板のキャラクターかエンチャント1枚をシートの強化後の姿へ変える。
const BLESSING_FLAME_CONFIG={
  key:'blessingFlame',name:'祝福の炎',
  position:{x:1621,y:1402},
  flashMs:760,
  // シート未収録の仮文言。施設には会話を挟まず、この説明を表示する。
  text:{description:'魔導板のキャラクターかエンチャント1枚を強化する。',
    used:'この炎の祝福は、すでに失われた。',
    instruction:'強化するカードを1枚選んでください。',
    completed:'強化しました。',
    execute:'実行',cancel:'キャンセル',leave:'祝福を離れる',preview:'強化後のカード'},
};
// 選択・演出は画面内だけの一時状態。使用済み（強化して立ち去った）だけを G に保存する。
// 祭壇と同じく、実行の有無にかかわらず何度でも入れる。使用済みの炎では選択・実行できない（2026-10-20 利用者指定）。
let _blessingFlameVisit=null;
function blessingFlameUsed(key){
  return !!((G._blessingFlameUsed||{})[key??_waveFacilityCacheKey()]);
}
function blessingFlameActive(){ return !!(G&&G._isBlessingFlame&&_blessingFlameVisit); }
function blessingFlameCardEligible(card){
  // エンチャントも強化できる（2026-10-20 利用者指定）。
  if(!card||!['キャラクター','エンチャント'].includes(String(card.category||''))||!panelHasEnhancementForm(card)
    ||card._merged||card._tripleMerged||card._mergedFormApplied
    ||card._npcCard||card._npcDeployOnly||card._questOfferCard||card._questTransportId) return false;
  return !(typeof questShopExchangeState==='function'&&questShopExchangeState(card)!=='allow');
}
function openBlessingFlame(){
  if(blessingFlameActive()||!G._isWaveAltar) return false;
  G._facilityCacheKey=_waveFacilityCacheKey();
  const spent=blessingFlameUsed(G._facilityCacheKey);
  _blessingFlameVisit={key:G._facilityCacheKey,selected:-1,preview:null,executed:spent,spent,busy:false};
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
  renderRewCards();renderHandEditor();renderMoveSlotsInEnemy();
  return true;
}
// プレビュー中の「キャンセル」：選択だけを外す（盤面は変えない）。
function blessingFlameCancel(options){
  if(!blessingFlameActive()||_blessingFlameVisit.busy||_blessingFlameVisit.selected<0) return false;
  _blessingFlameVisit.selected=-1;
  _blessingFlameVisit.preview=null;
  renderRewCards();
  // dragstart中に元カードを描き直すと、ネイティブのドラッグが中断される。
  if(!options||!options.keepBoard) renderHandEditor();
  renderMoveSlotsInEnemy();
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
    // カード合体（3枚合体の白光）と同じSE（2026-10-20 利用者指定）。
    if(typeof playFileSfx==='function') playFileSfx('assets/sfx/merge.wav');
    await new Promise(resolve=>setTimeout(resolve,BLESSING_FLAME_CONFIG.flashMs));
  }
  // ページ内のデバッグ切替などで施設が閉じられた時は古い参照を戻さない。
  if(!blessingFlameActive()||_blessingFlameVisit!==visit) return false;
  G.mainBoard[index]=upgraded;
  visit.executed=true;visit.busy=false;visit.preview=null;visit.selected=-1;
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  renderRewCards();renderHandEditor();renderMoveSlotsInEnemy();
  return true;
}
function blessingFlameReset(){
  if(!blessingFlameActive()||_blessingFlameVisit.busy) return false;
  _blessingFlameVisit.selected=-1;
  _blessingFlameVisit.preview=null;
  // 強化済み・使用済みの印は保ち、カードの配置だけを戻す。
  return resetRewardPlacement();
}
async function blessingFlameLeave(){
  if(!blessingFlameActive()||_blessingFlameVisit.busy) return false;
  if(!guardFormationLeave()) return false;
  _blessingFlameVisit.busy=true;
  // 強化して立ち去った時だけ使用済みにする（実行せずに立ち去った炎は、そのまま使える）。
  if(_blessingFlameVisit.executed&&!_blessingFlameVisit.spent){
    G._blessingFlameUsed=G._blessingFlameUsed||{};
    G._blessingFlameUsed[_blessingFlameVisit.key]=true;
  }
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
    return;  // プレビュー中は説明文を出さない（2026-10-20 利用者指定）。
  }
  // 説明文は報酬枠の中心（プレビューのカードが置かれる位置の中心）に揃える。
  const help=document.createElement('div');help.className='blessing-flame-instruction';
  help.textContent=visit&&visit.spent?text.used:visit&&visit.executed?text.completed:text.instruction;
  el.appendChild(help);
}
function blessingFlameRenderControls(el){
  const visit=_blessingFlameVisit,text=BLESSING_FLAME_CONFIG.text;
  const button=(label,cls,action,disabled)=>{
    const b=document.createElement('button');b.type='button';b.className='btn '+cls;b.disabled=disabled;
    const span=document.createElement('span');span.className='rew-btn-label';span.textContent=label;b.appendChild(span);
    b.onclick=action;el.appendChild(b);
  };
  // 右下は「祝福を離れる」「配置を戻す」。実行・キャンセルはプレビュー中だけ。
  button(_uiLabel('「祝福を離れる」ボタン',text.leave),'rew-move-btn blessing-flame-leave-btn',()=>void blessingFlameLeave(),!visit||visit.busy);
  const reset=_placementResetButton(blessingFlameReset);
  reset.disabled=!visit||visit.busy;
  el.appendChild(reset);
  if(visit&&visit.preview&&!visit.executed){
    button(_uiLabel('「実行」ボタン',text.execute),'rew-move-btn blessing-flame-execute-btn',()=>void blessingFlameExecute(),visit.busy);
    button(_uiLabel('「キャンセル」ボタン',text.cancel),'rew-reset-btn blessing-flame-cancel-btn',blessingFlameCancel,visit.busy);
  }
}
// 祝福の選択前から、通常の魔導板内の配置換えを受け付ける。
function blessingFlameMoveAllowed(){
  return blessingFlameActive()&&!_blessingFlameVisit.busy;
}
function blessingFlameWireCard(el,card,index){
  const visit=_blessingFlameVisit;
  const selecting=!G._pendingItemUse&&!_pendingCardActivation;
  el.classList.toggle('blessing-flame-unavailable',selecting&&!visit.executed&&!blessingFlameCardEligible(card));
  el.classList.toggle('blessing-flame-selected',selecting&&visit.selected===index&&!visit.executed);
  if(selecting&&visit.selected===index&&!visit.executed){
    const glow=document.createElement('span');glow.className='blessing-flame-selection-glow';
    el.appendChild(glow);
  }
  // ドラッグやアイテムの対象選択は共通の魔導板操作へ渡す。
  return false;
}
// プレビューの取得は防ぎ、魔導板の配置換えと所持アイテムの使用を受け付ける。
// ホバー説明とオプションはそのまま利用できる。
function blessingFlameBlockInput(event){
  if(!blessingFlameActive()||!event.target||!event.target.closest) return;
  const target=event.target;
  if(!target.closest('#scr-battle')||target.closest('#battle-options-btn,#options-layer')) return;
  if(_blessingFlameVisit.busy){event.preventDefault();event.stopImmediatePropagation();return;}
  if(G._pendingItemUse&&event.type==='contextmenu') return; // 共通のアイテム取り消しへ渡す。
  if(event.type==='dragstart'&&blessingFlameMoveAllowed()&&target.closest('#hand-slots')) blessingFlameCancel({keepBoard:true});
  if(['dragstart','dragover','drop'].includes(event.type)&&blessingFlameMoveAllowed()
    &&target.closest('#hand-slots')&&!target.closest('button')) return;
  if(event.type==='click'&&(target.closest('#reward-move-btns,#board-card-visibility-btn,.reward-prod-item,#kw-tooltip,.item-use-confirm,.item-use-cancel-btn')
    ||!target.closest('button')&&target.closest('#hand-slots > [data-board-idx]'))) return;
  event.preventDefault();event.stopImmediatePropagation();
}
['click','contextmenu','dragstart','dragover','drop'].forEach(type=>window.addEventListener(type,blessingFlameBlockInput,true));
