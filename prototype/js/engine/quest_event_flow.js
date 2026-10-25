// quest_event_flow.js — 酒場の受託からカード消失・街／塔の到着会話までの進行と公開登録
// 2026-10-25 リファクタリング：quest.js から移した（処理は変えていない）。


function _qCustomizeTavernVillage(){
  _qEnsureStyle();
  document.body.classList.add('tavern-village-active');
  document.body.classList.remove('reward-screen-active','tavern-screen-active','tavern-tower-event-active');
  const facilities=document.getElementById('village-facilities');
  if(facilities) facilities.style.display='none';
  const plate=document.getElementById('village-name-plate');
  if(plate) plate.style.display='inline-flex';
  const sub=document.getElementById('village-name-sub');
  const main=document.getElementById('village-name-main');
  if(sub) sub.textContent='';
  if(main) main.textContent=_qText('街「酒場」ボタン','');
  const depart=document.getElementById('village-depart-btn');
  if(depart){
    depart.style.display='none';
    const currentLabel=depart.querySelector('.rew-btn-label')?.textContent||'';
    depart.innerHTML=`<span class="rew-btn-label">${_qText('「店を出る」ボタン',currentLabel)}</span>`;
    depart.onclick=()=>_qLeaveTavernToVillage();
  }
  const move=document.getElementById('village-move-btns');
  if(move) move.style.display='flex';
  const intro=document.getElementById('village-intro-title');
  if(intro) intro.style.display='none';
  if(typeof updateHUD==='function') updateHUD();
}

function _qShowTavernVillage(){
  G._isTavern=true;
  G._isVillageMenu=false;
  G._isWaveAltar=false;
  G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false;
  G._facilityLabel=_qText('街「酒場」ボタン','');
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground('tavern');
  if(typeof showScreen==='function') showScreen('village');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  _qCustomizeTavernVillage();
  _qMovePresentationHost('village');
}

function syncTavernFormationControls(){
  if(!G||!G._isTavern||G.phase!=='reward') return;
  const host=document.getElementById('reward-move-btns');
  const button=host&&host.querySelector('.rew-move-btn');
  if(!button) return;
  const context=_qFormationContext;
  const entry=context&&context.entry?_qFormationContext.entry:_qEntry();
  const accepted=_qHasRequiredOnBoard(entry);
  button.disabled=!!G._pendingPanelPlacement;
  button.classList.toggle('disabled',!!button.disabled);
  button.innerHTML=`<span class="rew-btn-label">${_qText(accepted?(_qConfig(entry).acceptButtonKey||'「受託」ボタン'):'「拒否」ボタン','')}</span>`;
  button.onclick=()=>{
    if(button.disabled||G._pendingPanelPlacement) return;
    if(typeof playSfx==='function') playSfx('uiConfirm',{group:'ui',guardKey:'ui:button'});
    if(!guardFormationLeave()) return;
    if(accepted) _qAcceptTavernQuest();
    else _qRejectTavernQuest();
  };
}

function _qOpenTavernFormation(options){
  const opts=options&&options.mode?options:{};
  const entry=opts.entry||_qEntry();
  if(!entry) return;
  _qFormationContext={mode:opts.mode||'accept',entry,shade:opts.shade||null};
  _qRemoveDialogue();
  G._isTavern=true; G._isVillageMenu=false; G._isWaveAltar=false;
  G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false;
  G._facilityLabel=_qText('街「酒場」ボタン','');
  G._mapReturnAfterReward=true;
  G._freeRewardPanelMode=true;
  G._rewardOnePickMode=true;
  G.phase='reward';
  document.body.classList.remove('village-screen-active','tavern-village-active');
  document.body.classList.add('reward-screen-active');
  if(typeof showScreen==='function') showScreen('battle');
  _qMovePresentationHost('battle');
  // 暗幕は他の施設と同じ `body.facility-bg-active #scr-battle::before`（black1.svg を乗算）を使う。
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground('tavern');
  if(typeof goToReward==='function') goToReward();
  const cfg=_qConfig(entry);
  const ringOffer=!!cfg.ringOffer;
  // 木箱は5枚すべてを任意の数だけ移す。依頼品の指輪は祭壇の提示操作を使うため、
  // どちらも通常報酬の1枚取得制限では管理しない。
  G._rewardOnePickMode=ringOffer?false:!_qIsCargoEntry(entry);
  if(ringOffer){
    const held=_qRequiredRingCount(entry)>0;
    const ring=held?null:_qMakeRequiredRing(entry);
    G._ringOffer=ring?[ring]:[];
    G._ringOfferUnlocked=!held&&!!ring;
    G._ringOfferResolved=held;
    G._ringOfferFadeOut=null;
    G._ringOfferPhase=true;
    document.body.classList.add('quest-ring-offer-active');
    document.body.style.setProperty('--quest-ring-offer-desc',JSON.stringify(_qText(cfg.ringOffer.messageKey,'')));
  }else{
    document.body.classList.remove('quest-ring-offer-active');
    document.body.style.removeProperty('--quest-ring-offer-desc');
  }
  const card=ringOffer||_qHasRequiredOnBoard(entry)?null:_qMakeRequiredCard(entry);
  // 提示中の保存から再開した場合も、元の依頼品だけを依頼枠へ戻せるようにする。
  if(_qFormationContext.mode==='accept'){
    (G.mainBoard||[]).forEach(held=>{ if(_qIsRequiredCard(held,entry)) held._questOfferCard=true; });
  }
  if(typeof _rewCards!=='undefined'){
    _rewCards=[];
    if(card){
      const count=_qRequiredOfferCount(entry);
      for(let i=0;i<count;i++){
        const offer=i===0?card:_qMakeRequiredCard(entry);
        if(!offer) continue;
        offer._isOriginalReward=true;
        offer._questOfferCard=true;
        _rewCards[i]=offer;
      }
    }
  }
  if(typeof _rewFreePickDone!=='undefined') _rewFreePickDone=false;
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  if(typeof renderMoveSlotsInEnemy==='function') renderMoveSlotsInEnemy();
  syncQuestFormationUi();
  syncTavernFormationControls();
}

function _qCloseRingOffer(entry,removeHeld){
  if(!entry||!_qConfig(entry).ringOffer) return;
  if(removeHeld) _qRemoveRequiredRing(entry);
  G._ringOffer=[];
  G._ringOfferUnlocked=false;
  G._ringOfferResolved=false;
  G._ringOfferFadeOut=null;
  G._ringOfferPhase=false;
  G._ringPhaseStartSnapshot=null;
  document.body.classList.remove('quest-ring-offer-active','ring-offer-phase','ring-offer-resolved');
  document.body.style.removeProperty('--quest-ring-offer-desc');
}

// シートの「台詞4」に含まれる「・」行だけを押せる選択肢にする。
// 括弧書きなどの説明行は note として同じ吹き出し内に残す。
function _qChoiceLine(line){
  const rows=String(line&&line.text||'').split('\n').map(row=>row.trim()).filter(Boolean);
  let choiceIndex=0;
  const choiceRows=rows.map(row=>row.startsWith('・')
    ?{choice:{text:row},index:choiceIndex++}
    :{note:row});
  const choices=choiceRows.filter(row=>row.choice).map(row=>row.choice);
  const note=rows.filter(row=>!row.startsWith('・')).join('\n');
  return {...line,choices,note,choiceRows};
}

// promptOnly：断った後の再訪では、拒否後台詞のあとに選択肢（台詞4）だけを出す（台詞1〜3は繰り返さない）。
async function _qRunDirectTavernChoice(entry,data,promptOnly){
  const lines=Array.isArray(data&&data.initial)?data.initial:[];
  if(!lines.length){ _qRejectTavernQuest(); return; }
  const prompt=lines[lines.length-1];
  const choice=await _qStartDialogue([
    ...(promptOnly?[]:lines.slice(0,-1)),
    _qChoiceLine(prompt),
  ],{screen:'village'});
  if(!choice) return;
  if(String(choice.text||'').includes('受ける')) _qAcceptTavernQuest();
  else _qRejectTavernQuest();
}

function _qAssignRewardMix(entry){
  const cfg=_qConfig(entry).rewardMix;
  if(!cfg||entry.rewardMixAssigned) return;
  const fromWave=Math.max(1,Number(G&&G._wave)||Number(entry.wave)||1);
  const fromStage=Math.max(0,Number(G&&G._waveStage)||0);
  const arrivalWave=Math.max(fromWave,Number(cfg.arrivalWave)||fromWave);
  const candidates=[];
  for(let wave=fromWave;wave<=arrivalWave;wave++){
    const route=typeof _waveRouteForWave==='function'?(_waveRouteForWave(wave)||[]):[];
    const cityStage=wave===arrivalWave?route.indexOf('city')+1:0;
    const first=wave===fromWave?fromStage+1:1;
    const last=cityStage>0?cityStage-1:route.length;
    for(let stage=first;stage<=last;stage++){
      if(['battle','elite','boss'].includes(String(route[stage-1]||''))) candidates.push({wave,stage,used:false});
    }
  }
  const choose=()=>{
    const shuffled=candidates.map(x=>({...x}));
    for(let i=shuffled.length-1;i>0;i--){
      const j=Math.floor(rand()*(i+1));
      [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
    }
    return shuffled.slice(0,Math.min(Math.max(0,Number(cfg.count)||0),shuffled.length));
  };
  entry.rewardMixTargets=typeof runWithKeyedRandom==='function'
    ?runWithKeyedRandom(`quest:${entry.questId}:reward-mix-targets:${fromWave}:${fromStage}:${arrivalWave}`,choose):choose();
  entry.rewardMixAssigned=true;
  entry.rewardMixRemaining=entry.rewardMixTargets.length;
}

// 通常報酬の生成直後に呼ぶ。選定済みの戦闘だけ、通常候補1枚を荷物カード1枚へ置き換える。
function questMixBattleRewards(cards){
  const list=Array.isArray(cards)?cards.slice():[];
  const entry=_qActiveEntry();
  const cfg=entry&&_qConfig(entry).rewardMix;
  if(!entry||entry.status!=='accepted'||!cfg) return list;
  const target=(entry.rewardMixTargets||[]).find(x=>x&&!x.used
    &&Number(x.wave)===Number(G&&G._wave)&&Number(x.stage)===Number(G&&G._waveStage));
  if(!target) return list;
  const wanted=String(cfg.cardNo||'').toUpperCase();
  const def=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(card=>_qCardNo(card)===wanted):null;
  const mixed=def&&typeof makePanel==='function'?makePanel(def.id||def.name):null;
  if(!mixed) return list;
  let slot=0;
  if(list.length){
    const pick=()=>Math.min(list.length-1,Math.floor(rand()*list.length));
    slot=typeof runWithKeyedRandom==='function'
      ?runWithKeyedRandom(`quest:${entry.questId}:reward-mix:${target.wave}:${target.stage}`,pick):pick();
    if(list[slot]&&typeof returnPanelToSalePool==='function') returnPanelToSalePool(list[slot]);
    list[slot]=mixed;
  }else list.push(mixed);
  target.used=true;
  entry.rewardMixRemaining=(entry.rewardMixTargets||[]).filter(x=>x&&!x.used).length;
  return list;
}

function _qAssignEncounter(entry){
  const cfg=_qConfig(entry);
  const targets=Array.isArray(cfg.encounterTargets)?cfg.encounterTargets:[];
  if(!targets.length||entry.encounterTarget) return;
  const chosen=typeof runKeyedPick==='function'
    ?runKeyedPick(`quest:${entry.questId}:encounter-target`,targets)
    :targets[0];
  entry.encounterTarget=chosen?{wave:Number(chosen.wave),stage:Number(chosen.stage)}:null;
  entry.encounterPhase='wolf';
  entry.encounterFled=false;
  entry.encounterDefeated=false;
}

// 残りの総数を満たせる組だけ列挙し、全ての有効な割り振りから等確率で選ぶ。
function questAllocateEnemyCounts(battles,min,max,total,rng,capacities){
  const caps=Array.from({length:battles},(_,i)=>Math.min(max,capacities?capacities[i]:max));
  const mins=caps.map(cap=>Math.min(min,cap));
  const choices=[];
  const visit=(counts,left)=>{
    const remaining=battles-counts.length;
    if(left<mins.slice(counts.length).reduce((sum,n)=>sum+n,0)
      ||left>caps.slice(counts.length).reduce((sum,n)=>sum+n,0)) return;
    if(!remaining){ choices.push(counts);return; }
    for(let count=mins[counts.length];count<=caps[counts.length];count++) visit([...counts,count],left-count);
  };
  visit([],total);
  return choices.length?choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))]:[];
}

function _qEnemyReplacementCapacity(entry,stage,targetWave){
  const wave=Number(targetWave??entry.wave),type=_waveRouteForWave(wave)[stage-1];
  const counts=_sceneEnemyCount(type,{wave,stage});
  if(!counts) return 0;
  const [total,rear]=counts,skip=Number(_qConfig(entry).enemyReplacement.frontSkip)||0;
  // 通常生成と同じ体数・前後衛を使い、エリート／ボス本体1体を保護する。
  return Math.max(0,total-rear-skip)+Math.max(0,rear-(['elite','boss'].includes(type)?1:0));
}

function _qAssignEnemyReplacements(entry){
  if(!entry||!_qConfig(entry).enemyReplacement) return;
  _qNormalizeEntry(entry);
  const cfg=_qConfig(entry).enemyReplacement;
  if(cfg.arrivalWave){
    if(entry.enemyReplacementAssigned||entry.status!=='accepted') return;
    const limits=(_qQuestData(entry.tavernVariant)||{}).enemyReplacementByScene;
    if(!limits) return;
    const fromWave=Number(entry.wave),arrivalWave=Number(cfg.arrivalWave);
    const fromStage=Number(G._wave)===fromWave?Number(G._waveStage):_waveRouteForWave(fromWave).indexOf('city')+1;
    const targets=[];
    for(let wave=fromWave;wave<=arrivalWave;wave++){
      const route=_waveRouteForWave(wave);
      const last=wave===arrivalWave?route.indexOf('city'):route.length;
      for(let stage=wave===fromWave?fromStage+1:1;stage<=last;stage++){
        const type=route[stage-1],max=Number(limits[type])||0;
        if(!max) continue;
        targets.push({wave,stage,type,count:0,capacity:Math.min(max,_qEnemyReplacementCapacity(entry,stage,wave)),applied:false});
      }
    }
    runWithKeyedRandom(`quest:${entry.questId}:enemy-replacements:${fromWave}:${fromStage}:${arrivalWave}`,()=>{
      targets.forEach(target=>{ target.count=target.capacity>0?1+Math.floor(rand()*target.capacity):0; });
    });
    entry.enemyReplacementTargets=targets;
    entry.enemyReplacementAssigned=true;
    return;
  }
  if(entry.enemyReplacementTargets.length) return;
  const rule=(_qQuestData(entry.tavernVariant)||{}).enemyReplacementCounts;
  if(!rule) return;
  const wave=Number(entry.wave);
  const route=typeof _waveRouteForWave==='function'?_waveRouteForWave(wave):[];
  const town=route.lastIndexOf('city');
  const tower=route.findIndex((type,index)=>index>town&&['altar','tower'].includes(type));
  if(town<0||tower<0) return;
  const stages=route.map((type,index)=>({type,stage:index+1}))
    .filter(({type,stage})=>stage>town+1&&stage<=tower&&['battle','elite','boss'].includes(type))
    .map(({stage})=>stage);
  // 実際の旅程を参照するので、1周目で省かれた戦闘へは割り振らない。
  const capacities=stages.map(stage=>Math.min(rule.max,_qEnemyReplacementCapacity(entry,stage)));
  const total=Math.min(rule.total,capacities.reduce((sum,n)=>sum+n,0));
  const choose=()=>questAllocateEnemyCounts(stages.length,rule.min,rule.max,total,rand,capacities);
  const counts=runWithKeyedRandom(`quest:${entry.questId}:enemy-replacements:${wave}:${stages.join(',')}`,choose);
  entry.enemyReplacementTargets=counts.map((count,index)=>({wave,stage:stages[index],count,capacity:capacities[index],applied:false}));
  entry.enemyReplacementShortfall=rule.total-total;
}

function questReplaceableEnemyIndexes(enemies,frontSkip){
  let front=0;
  return (enemies||[]).map((unit,index)=>{
    if(!unit) return -1;
    const left=String(unit.lane||'front')!=='rear'&&front++<frontSkip;
    const protectedRole=unit.boss||unit.elite||['elite','boss'].includes(unit.role)
      ||(unit.keywords||[]).some(keyword=>keyword==='ボス'||keyword==='エリート');
    return left||protectedRole?-1:index;
  }).filter(index=>index>=0);
}

function _qRebalanceEnemyReplacements(entry,target,available){
  if(available>=target.count) return;
  if(_qConfig(entry).enemyReplacement.arrivalWave){
    target.capacity=available;target.count=available;
    return;
  }
  const rule=(_qQuestData(entry.tavernVariant)||{}).enemyReplacementCounts;
  const pending=entry.enemyReplacementTargets.filter(t=>t===target||!t.applied&&t.stage>target.stage);
  const capacities=pending.map(t=>Math.min(rule.max,t===target?available:_qEnemyReplacementCapacity(entry,t.stage)));
  const wanted=pending.reduce((sum,t)=>sum+t.count,0),total=Math.min(wanted,capacities.reduce((sum,n)=>sum+n,0));
  const counts=runWithKeyedRandom(`quest:${entry.questId}:enemy-rebalance:${target.stage}:${available}`,
    ()=>questAllocateEnemyCounts(pending.length,rule.min,rule.max,total,rand,capacities));
  pending.forEach((t,index)=>{t.count=counts[index];t.capacity=capacities[index];});
  entry.enemyReplacementShortfall=(Number(entry.enemyReplacementShortfall)||0)+wanted-total;
}

// 通常生成後に内訳だけを変える。再戦・再開は置き換え済みスナップショットを使う。
function questReplaceBattleEnemies(enemies,floor){
  if(!G||G._onlineMode||G._arenaActive||G._testBattleMode||G._libraryTestBattleMode||!Array.isArray(enemies)) return enemies;
  questCheckRetainedCards();
  const entry=_qActiveEntry();
  const cfg=entry&&_qConfig(entry).enemyReplacement;
  if(!cfg) return enemies;
  _qAssignEnemyReplacements(entry);
  const target=entry.enemyReplacementTargets.find(t=>Number(t.wave)===Number(G._wave)&&Number(t.stage)===Number(G._waveStage));
  if(!target||target.invalidated||enemies.some(unit=>unit&&unit._questEnemyReplacementId===entry.questId)) return enemies;
  const def=_qQuestEnemyDef(cfg.enemyNo);
  if(!def) return enemies;
  const candidates=questReplaceableEnemyIndexes(enemies,Number(cfg.frontSkip)||0);
  _qRebalanceEnemyReplacements(entry,target,candidates.length);
  runWithKeyedRandom(`quest:${entry.questId}:replacement-enemies:${target.wave}:${target.stage}`,()=>{
    for(let i=candidates.length-1;i>0;i--){
      const j=Math.floor(rand()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];
    }
    for(let index=0;index<target.count;index++){
      const slot=candidates[index],old=enemies[slot];
      if(!old) continue;
      const stats=enemyStats(def,floor);
      const unit=_mkEnemy(stats.atk,stats.hp,def.name,def.icon,def.grade||1,_kwShield(def),[...(def.keywords||[])],def.race||'-');
      _applyEnemyDefAbilities(unit,def);
      unit.id=old.id;unit.lane=old.lane;unit._visualShift=old._visualShift;
      unit._questEnemyReplacementId=entry.questId;
      unit._questDefeatKey=`${entry.questId}:${target.wave}:${target.stage}:${index}`;
      enemies[slot]=unit;
    }
  });
  target.applied=true;
  return enemies;
}

// コアが確定したdeathだけ集計する。VFXの有無や逃走の表示は判定に使わない。
function questRecordBattleDeaths(events,enemies){
  if(!G||G._onlineMode||G._arenaActive||G._testBattleMode||G._libraryTestBattleMode) return 0;
  const entry=_qActiveEntry();
  const cfg=entry&&_qConfig(entry).enemyReplacement;
  if(!cfg||Number(entry.wave)!==Number(G._wave)) return 0;
  const units=new Map((enemies||[]).filter(Boolean).map(unit=>[unit.id,unit]));
  const seen=new Set(entry.defeatedEnemyKeys);
  let added=0;
  for(const event of events||[]){
    if(!event||event.side!=='p2') continue;
    // コアのイベント用の写しにはクエスト用の印が無い。既存の個体印を保って更新する。
    if(event.unit) units.set(event.unit.id,{...(units.get(event.unit.id)||{}),...event.unit});
    if(event.type!=='death') continue;
    const unit=units.get(event.unitId);
    if(!unit||_qCardNo(unit)!==cfg.enemyNo) continue;
    const key=String(unit._questDefeatKey||`${entry.questId}:${G._wave}:${G._waveStage}:${unit.id}`);
    if(seen.has(key)) continue;
    seen.add(key);entry.defeatedEnemyKeys.push(key);added++;
  }
  entry.defeatedCount+=added;
  return added;
}

function _qReturnToTavernResponse(){
  _qShowTavernVillage();
  _qMovePresentationHost('village');
}

function _qTavernDialogueOptions(entry,initial){
  const scene=_qConfig(entry).tavernScene;
  if(!scene) return {};
  return {
    namePlateLine:initial?scene.namePlateLine:1,namePlateX:scene.namePlateX,
    simultaneousLines:initial?scene.simultaneousLines:undefined,
    lineOptions:(index,line)=>line.speaker==='B'
      ?{anchor:initial&&index===0?scene.firstAnchor:scene.rightAnchor}:{},
    beforeLine:initial?async index=>{
      if(index===scene.guestLine-1) await _qSlidePortrait(scene.guest,'village');
      if(index===scene.transformLine-1) await _qReplacePortraitWhite(_qConfig(entry).portraitB,scene.transformed,'village');
    }:undefined,
  };
}
async function _qShowTavernResponsePortraits(entry,lines){
  const scene=_qConfig(entry).tavernScene;
  await _qShowPortraitPair('village',entry,{firstLines:lines,
    ...(scene?{portraitB:scene.transformed}:{})});
  if(scene) await showTavernPortrait(scene.guest.id,{...scene.guest,screen:'village'});
}

// 途中再開に必要なのはイベントの種類と支払済みの回数だけ。DOMや時間は保存しない。
let _qPendingEventSession=false;
let _qTowerDepartBypass=false;
function _qCheckpointEvent(){
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    SaveRun.checkpoint(G._isWaveAltar?'tower':G._waveVillage?'town':'reward');
  }
}
function _qBeginFatalLoss(entry,kind,waitItem,deferEvent){
  if(!entry||entry.pendingEvent==='loss'||_qDestroySession) return false;
  entry.status='killed';
  entry.lossKind=kind==='flee'||kind==='fled'?'flee':'death';
  entry.lossWaitItem=!!waitItem;
  entry.pendingEvent='loss';
  entry.rewardCardTaken=false;
  entry.partedPending=false;
  entry.description='';
  _qRemoveRequiredCards(entry);
  // 進行中の戦闘を世代番号で無効化する。数値や勝敗はここで再計算しない。
  if(typeof _bumpBattleRunId==='function') _bumpBattleRunId();
  G._battleDefeatHandled=true;
  G._battleVictoryPending=true;
  G._battleVictoryCheckPending=false;
  G._battlePhaseRunning=false;
  document.body.classList.remove('battle-turn-active');
  _qCheckpointEvent();
  if(!deferEvent) void _qRunPendingEvent(entry,{waitItem:!!waitItem});
  return true;
}
function questOnCardLost(card,reason){
  if(reason==='sacrifice'||!questCardLossIsFatal(card)) return false;
  const entry=_qAllEntries().find(e=>_qIsRequiredCard(card,e))||{questId:'$cardLoss'};
  if(entry.companionReleased) return false;
  if(entry.questId==='$cardLoss') _qQuestState()[entry.questId]=entry;
  return _qBeginFatalLoss(entry,reason,false);
}
function questBattleVanishedCard(unit,events){
  if(!unit||!unit._deathWithoutEvent||!questCardLossIsFatal(unit)) return false;
  const outcome=coreKiemetsuBattleOutcome(unit,unit,events||[]);
  return outcome.vanished?questOnCardLost(unit,outcome.reason):false;
}
// 通常の全滅判定が同じ手番で走っても、必要な会話を追い越させない。
function questDeferGameOver(options){
  return !(options&&options.questLoss)&&_qAllEntries().some(e=>e.pendingEvent==='loss');
}
function questResumePendingEvent(options){
  const entry=_qAllEntries().find(e=>e.pendingEvent);
  if(!entry) return false;
  if(!_qPendingEventSession){
    const opts={...(options||{})};
    if(entry.pendingEvent==='loss'&&entry.lossWaitItem) opts.waitItem=true;
    void _qRunPendingEvent(entry,opts);
  }
  return true;
}
async function _qRunPendingEvent(entry,options){
  if(_qPendingEventSession) return;
  _qPendingEventSession=true;
  const opts=options||{};
  try{
    if(opts.restore&&entry.pendingEvent!=='accepted'){
      if(entry.pendingEvent==='loss'&&!G._waveVillage){
        if(typeof showScreen==='function') showScreen('battle');
        if(typeof goToReward==='function') goToReward({restoreCheckpoint:true});
      }else if(typeof openMapVillage==='function') openMapVillage({tower:!!G._isWaveAltar,restoreCheckpoint:true});
    }
    while(entry.pendingEvent){
      const event=entry.pendingEvent;
      const cfg=_qConfig(entry);
      const data=_qQuestData(event.startsWith('tower')?entry.towerVariant:entry.tavernVariant)||{};
      if(event==='accepted'){
        _qReturnToTavernResponse();
        if(opts.restore||!document.querySelector('.tavern-portrait[data-portrait-key="companion"]')){
          await _qShowTavernResponsePortraits(entry,data.accepted||[]);
        }
        await _qStartDialogue(data.accepted,{screen:'village',..._qTavernDialogueOptions(entry,false),onLine:()=>{
          if(!cfg.acceptGold||entry.acceptGoldGiven) return;
          entry.acceptGoldGiven=true;
          if(data.rewardGold&&typeof gainEventGold==='function') gainEventGold(data.rewardGold);
          _qCheckpointEvent();
        }});
        entry.pendingEvent=cfg.acceptedExit?'afterAccept':'';
        _qCheckpointEvent();
        await _qLeaveTavernAfterLines();
        continue;
      }
      if(event==='afterAccept'){
        const exit=cfg.acceptedExit;
        const lines=_qSpecialLines(data,'A');
        document.body.classList.add('quest-town-event-active');
        await _qShowPortraitPair('village',entry,{portraitB:exit&&exit.portrait,firstLines:lines,faceB:''});
        await _qStartDialogue(lines,{screen:'village',
          persistentLines:exit.persistentLines,
          lineOptions:(index,line)=>{
            if(line.speaker!=='B') return {};
            if(index===0) return {anchor:exit.firstAnchor};
            if(index===1) return {anchor:exit.secondAnchor};
            return {};
          }});
        entry.acceptedExitDone=true;
        entry.pendingEvent='';
        await _qClearPresentation();
        document.body.classList.remove('quest-town-event-active');
        if(typeof renderVillageScreen==='function') renderVillageScreen();
        _qCheckpointEvent();
        continue;
      }
      if(event==='loss'){
        _qDestroySession=true;
        document.body.classList.add('quest-town-event-active');
        if(opts.waitItem) await _qWaitItemPresentation();
        entry.lossWaitItem=false;
        if(G._isTavern){ G._pendingPanelPlacement=null;_qFormationContext=null;_qReturnToTavernResponse(); }
        const screen=document.querySelector('#scr-battle.active')?'battle':'village';
        const host=_qMovePresentationHost(screen);
        const shade=document.createElement('div');
        shade.className='quest-event-shade is-visible';
        if(host) host.parentElement.insertBefore(shade,host);
        const fleeing=entry.lossKind==='flee';
        const lines=fleeing?[...(data.fled1||[]),...(data.fled2||[])]:[...(data.destroyed1||[]),...(data.destroyed2||[])];
        await _qShowPortraitPair(screen,entry,{portraitB:cfg.lostPortrait,withoutB:fleeing,
          firstLines:lines,...(fleeing?{}:{faceA:'MC001_C',faceB:'MC001_C'}),withoutNamePlate:true});
        await _qStartDialogue(lines,{screen,faceKeys:fleeing?{}:{B:'companion'},
          simultaneousLines:fleeing?undefined:[[1,2]]});
        await _qClearPresentation();
        shade.remove();
        document.body.classList.remove('quest-town-event-active');
        // 最後の会話からgameOverまでを同じ保存状態に保つ。中断した場合は会話を再開。
        gameOver({questLoss:true});
        entry.pendingEvent='';
        break;
      }
      if(event==='towerSacrifice'||event==='towerKeep'){
        _qTowerSession=true;
        document.body.classList.add('tavern-tower-event-active');
        const tower=cfg.towerDeparture;
        const lines=event==='towerSacrifice'?data.initial:data.specialA1;
        await _qShowPortraitPair('village',entry,{portraitB:tower.portrait,firstLines:lines,withoutNamePlate:true});
        await _qStartDialogue(lines,{screen:'village',faceKeys:{B:'companion'},
          lineOptions:(index,line)=>event==='towerSacrifice'&&index===tower.restoreLine-1&&line.speaker==='B'
            ?{anchor:tower.line2Anchor}:{},
          beforeLine:async index=>{
            if(event==='towerSacrifice'&&index===tower.restoreLine-1){
              await _qReplacePortraitWhite(tower.portrait.key,tower.restored,'village');
            }
            if(event==='towerSacrifice'&&index===tower.fadeLine-1){
              await _qFadePortraitRed(tower.restored.id);
            }
          }});
        const departAfter=event==='towerKeep'&&!!entry.towerKeepDepartAfter;
        entry.status='completed';
        entry.towerEventDone=true;
        entry.towerKeepDepartAfter=false;
        entry.description='';
        entry.pendingEvent='';
        await _qClearPresentation();
        document.body.classList.remove('tavern-tower-event-active');
        syncQuestFormationUi();
        _qTowerSession=false;
        _qCheckpointEvent();
        if(departAfter&&typeof villageDepart==='function'){
          _qTowerDepartBypass=true;
          try{ villageDepart(); }finally{ _qTowerDepartBypass=false; }
        }else if(typeof renderVillageScreen==='function') renderVillageScreen();
        continue;
      }
      break;
    }
  }finally{
    _qPendingEventSession=false;
    _qDestroySession=false;
  }
}

// 指輪を取得した瞬間、還魂が確定したカードだけを記録する。途中退出で回収したカードは対象外。
function questCommitAltarSacrifices(cards){
  const entries=_qAllEntries().filter(e=>_qConfig(e).towerDeparture&&!e.companionReleased
    &&['accepted','completed'].includes(e.status));
  entries.forEach(entry=>{
    if(!(cards||[]).some(x=>_qIsRequiredCard(x.card||x,entry))) return;
    entry.companionReleased=true;
    entry.pendingEvent='towerSacrifice';
  });
}
function questOnAltarRingTaken(){
  if(!G._isRingExchange) return;
  const pending=_qAllEntries().find(e=>e.pendingEvent==='towerSacrifice');
  const entry=_qActiveEntry();
  if(pending){
    if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
    _qCheckpointEvent();
    return;
  }
  if(!entry||!_qConfig(entry).towerDeparture||entry.companionReleased) return;
  entry.pendingEvent='towerKeep';
  entry.towerKeepDepartAfter=false;
  if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
  _qCheckpointEvent();
  // 還魂しなかった場合は取得直後に会話へ。還魂した場合は「祭壇を離れる」まで待つ。
  void fadeScreenSwitch(()=>openMapVillage({tower:true}));
}
function questBeforeTowerDepart(){
  if(!G||!G._isWaveAltar) return false;
  if(_qTowerDepartBypass) return false;
  if(_qPendingEventSession) return true;
  const entry=_qActiveEntry();
  if(!entry||!_qConfig(entry).towerDeparture) return false;
  entry.pendingEvent=entry.companionReleased?'towerSacrifice':'towerKeep';
  entry.towerKeepDepartAfter=entry.pendingEvent==='towerKeep';
  _qCheckpointEvent();
  questResumePendingEvent();
  return true;
}

function _qAcceptTavernQuest(){
  const entry=_qFormationContext&&_qFormationContext.mode==='accept'?_qFormationContext.entry:_qEntry();
  if(!entry||_qDestroySession||entry.status==='killed'||!_qHasRequiredOnBoard(entry)) return;
  // 提示中に操作窓を開いて無効化していても、受託時点では必ず有効へ戻す。
  // 以後は questRingActionsLocked() が無効化・破棄を選択肢から外す。
  if(_qRequiredRingNo(entry)&&Array.isArray(G.rings)){
    G.rings.forEach(ring=>{ if(_qIsRequiredRing(ring,entry,true)) ring._disabled=false; });
    if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  }
  if(_qIsCargoEntry(entry)) entry.transportCount=_qRequiredOnBoardCount(entry);
  const cfg=_qConfig(entry);
  _qClearCargoRewardCards(entry);
  _qClearOfferCardMarks();
  _qFormationContext=null;
  entry.status='accepted';
  entry.rewardCardTaken=true;
  entry.partedPending=false;
  entry.towerEventDone=false;
  _qAssignRewardMix(entry);
  _qAssignEncounter(entry);
  _qAssignEnemyReplacements(entry);
  _qCloseRingOffer(entry,false);
  if(cfg.acceptedExit||cfg.acceptGold) entry.pendingEvent='accepted';
  _qTavernEventUncommitted=false;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('town');
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  void _qEventFormationSwitch(_qReturnToTavernResponse);
  if(entry.pendingEvent){ questResumePendingEvent();return; }
  const data=_qQuestData(entry.tavernVariant)||{};
  _qStartDialogue(data.accepted,{screen:'village',onDone:_qLeaveTavernAfterLines});
}

function _qRejectTavernQuest(){
  const entry=_qFormationContext&&_qFormationContext.mode==='accept'?_qFormationContext.entry:_qEntry();
  if(!entry||_qDestroySession||entry.status==='killed') return;
  _qFormationContext=null;
  // 依頼カードにアイテムで永久強化を与えたまま拒否した時は特殊拒否。
  // 特殊拒否台詞A1→A2→A3と進んで酒場を出る。以後、依頼は受けられない（再訪時は特殊拒否後台詞だけ）。
  const data=_qQuestData(entry.tavernVariant)||{};
  const specialLines=_qSpecialLines(data,'A');
  const special=!_qConfig(entry).acceptedExit&&_qRequiredCardBuffed(entry)&&specialLines.length;
  if(_qIsCargoEntry(entry)){
    entry.transportCount=0;
    _qClearCargoRewardCards(entry);
  }
  if(_qConfig(entry).retainedCard) _qClearCargoRewardCards(entry);
  _qClearOfferCardMarks();
  entry.status=special?'rejectedSpecial':'rejected';
  entry.rewardCardTaken=false;
  _qCloseRingOffer(entry,true);
  _qTavernEventUncommitted=false;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('town');
    if(special&&saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  void _qEventFormationSwitch(_qReturnToTavernResponse);
  syncQuestFormationUi();
  if(special){
    // A1〜A3の表情は各台詞の「表情」列だけで切り替える。
    const goldRule=_qConfig(entry).specialRejectGold;
    const goldIndex=goldRule?[1,2,3,4,5,6,7,8].slice(0,Math.max(0,(Number(goldRule.line)||1)-1))
      .reduce((n,k)=>n+((data[`specialA${k}`]||[]).length),0):-1;
    _qStartDialogue(specialLines,{screen:'village',onLine:index=>{
      if(index!==goldIndex||entry.specialRejectGoldGiven) return;
      entry.specialRejectGoldGiven=true;
      const min=Math.floor(Number(goldRule.min)||0),max=Math.max(min,Math.floor(Number(goldRule.max)||0));
      const roll=typeof runRandom==='function'?runRandom():Math.random();
      entry.specialRejectGold=min+Math.min(max-min,Math.floor(roll*(max-min+1)));
      if(entry.specialRejectGold>0&&typeof gainEventGold==='function') gainEventGold(entry.specialRejectGold);
      if(typeof updateHUD==='function') updateHUD();
      if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
    },onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 表情列が空の旧場面だけ、従来の直書き表情を残す。列に指定がある場面は
  // _qStartDialogue() がシートの値を正として適用する。
  const lines=data.rejected||[];
  if(!_qFirstLineFace(lines,'MC001')) void showTavernPortrait('MC001',{screen:'village',face:'MC001_C'});
  _qStartDialogue(lines,{screen:'village',..._qTavernDialogueOptions(entry,false),onDone:_qLeaveTavernAfterLines});
}

// 会話を終えて酒場を出る時は、台詞枠を消してから少し間をおく（利用者指定）。
async function _qLeaveTavernAfterLines(){
  _qRemoveDialogue();
  await _qWait(TAVERN_LEAVE_DELAY_MS);
  if(!G||!G._isTavern) return;
  return _qLeaveTavernToVillage();
}

function _qLeaveTavernToVillage(){
  // 酒場を出る時は、店を出るのと同じ out の音を鳴らす（会話の後に自動で出る時も。2026-10-03 利用者指定）。
  if(typeof playSfx==='function') playSfx('shopOut',{group:'ui'});
  // 酒場を出る時も暗転を挟む（立ち絵は暗転で隠れてから消す）。
  if(typeof fadeScreenSwitch==='function') return fadeScreenSwitch(_qLeaveTavernToVillageNow);
  return _qLeaveTavernToVillageNow();
}
function _qLeaveTavernToVillageNow(){
  const formationEntry=_qFormationContext&&_qFormationContext.entry;
  if(formationEntry&&_qConfig(formationEntry).ringOffer&&formationEntry.status!=='accepted'){
    _qCloseRingOffer(formationEntry,true);
  }
  _qFormationContext=null;
  checkQ009CompanionPresence({leaving:true});
  _qRemoveDialogue();
  void _qClearPresentation({immediate:true});
  document.body.classList.remove('tavern-village-active','tavern-screen-active','reward-screen-active','facility-bg-active');
  if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
  if(typeof openMapVillage==='function') openMapVillage();
  _qTavernEventUncommitted=false;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
}

// 2026-10-19 利用者指定：酒場の依頼は、受諾・拒否・立ち去るまでは確定しない。その間は保存を書かず、
// リセットした時は入店時の保存（依頼のイベントが始まる前）から再開する。カードを受け取ってから受諾前に
// リセットすると、カードを持ったまま再開して受諾したように見えていた。
let _qTavernEventUncommitted=false;
function questSaveSuspended(){ return _qTavernEventUncommitted; }
function questResetSaveSuspension(){ _qTavernEventUncommitted=false; }
async function openTavern(){
  if(!G||!questTavernAvailable(G._wave)) return;
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
  const entry=_qEnsureSelected();
  if(!entry) return;
  // 受託後に必須カードが失われていないかの唯一の判定を通す。
  checkQ009CompanionPresence({leaving:true});
  // 入店は暗転を挟む（map.js の fadeScreenSwitch）。立ち絵は明けてから出す。
  const enter=()=>{
    _qShowTavernVillage();
    _qTavernEventUncommitted=false;
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
    _qTavernEventUncommitted=true;
    void _qClearPresentation({immediate:true});
  };
  if(typeof fadeScreenSwitch==='function') await fadeScreenSwitch(enter); else enter();
  if(!isCurrent()) return;
  const data=_qQuestData(entry.tavernVariant)||{};
  if(['completed','ended'].includes(entry.status)) return;
  // 失敗した後に入ると、失敗後台詞を出して酒場を出る。
  if(entry.status==='failed'){
    if(_qConfig(entry).noFailureRevisit) return;
    const lines=data.failedAfter||[];
    await _qShowPortraitPair('village',entry,{firstLines:lines,
      faceA:_qFirstLineFace(lines,'MC001')?'':'MC001_C'});
    if(!isCurrent()) return;
    _qStartDialogue(data.failedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 戦闘以外で破壊した後に入ると、非戦闘時死亡後台詞を出して酒場を出る。相手はもういないので A だけ出す。
  if(entry.status==='killed'){
    const lines=data.destroyedAfter||[];
    // 再訪時の表情は「非戦闘時死亡後台詞」の表情列に従う。
    await _qShowPortraitPair('village',entry,{withoutB:true,firstLines:lines});
    if(!isCurrent()) return;
    _qStartDialogue(data.destroyedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 特殊拒否の後に入ると、特殊拒否後台詞を出して酒場を出る。相手はもう出発しているので A だけ出す。
  if(entry.status==='rejectedSpecial'){
    // 表情は特殊拒否後台詞の表情列を最初から付ける（2026-10-11 利用者指摘：最初は通常の顔だった）。
    await _qShowPortraitPair('village',entry,{withoutB:true,firstLines:data.specialRejectedAfter||[]});
    if(!isCurrent()) return;
    _qStartDialogue(data.specialRejectedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // Q007 は受託後に木箱を売るなどして手持ちが減っていても、状態を accepted のまま保つ。
  // その状態での再訪は、通常の「失敗後」台詞だけを出して酒場を出る。
  if(entry.status==='accepted'&&_qIsCargoEntry(entry)
    &&_qCargoHeldCount(entry)<Math.max(0,Math.floor(Number(entry.transportCount)||0))){
    const lines=data.failedAfter||[];
    await _qShowPortraitPair('village',entry,{firstLines:lines});
    if(!isCurrent()) return;
    _qStartDialogue(lines,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  if(_qHasDirectChoice(entry)&&entry.status==='rejected'){
    await _qShowPortraitPair('village',entry);
    if(!isCurrent()) return;
    await _qStartDialogue(data.rejectedAfter,{screen:'village'});
    if(!isCurrent()) return;
    await _qRunDirectTavernChoice(entry,data,true);
    return;
  }
  if(entry.status==='accepted'||entry.status==='rejected'){
    await _qShowTavernResponsePortraits(entry,entry.status==='accepted'?data.acceptedAfter:data.rejectedAfter);
  }else await _qShowPortraitPair('village',entry,{firstLines:_qFormationInitialLines(entry,data)});
  if(!isCurrent()) return;
  if(entry.status==='accepted'){
    _qStartDialogue(data.acceptedAfter,{screen:'village',..._qTavernDialogueOptions(entry,false),onDone:_qLeaveTavernAfterLines});
  }else if(entry.status==='rejected'){
    _qStartDialogue(data.rejectedAfter,{screen:'village',..._qTavernDialogueOptions(entry,false),onDone:()=>_qEventFormationSwitch(_qOpenTavernFormation)});
  }else if(_qHasDirectChoice(entry)){
    await _qRunDirectTavernChoice(entry,data);
  }else{
    _qStartDialogue(_qFormationInitialLines(entry,data),{screen:'village',..._qTavernDialogueOptions(entry,true),onDone:()=>_qEventFormationSwitch(_qOpenTavernFormation)});
  }
}

function _qDeliveryGold(data,count,cfg){
  const sheet=data&&data.rewardGoldByCount||{};
  const fallback=cfg&&cfg.fallbackGoldByCount||{};
  return Math.max(0,Number(sheet[count]??sheet[String(count)]??fallback[count]??fallback[String(count)])||0);
}

function _qReplaceCount(lines,count){
  return (lines||[]).map(line=>({...line,text:String(line.text||'').replace(/X/g,String(count))}));
}

// 現在の正式な所持欄だけを列挙する。魔導板の表示用代理配列は同じ参照なら1回だけ数える。
// ショップ在庫・開始スナップショットは所持品ではないため含めない。
function _qOwnedCardLists(){
  const lists=[];
  const seen=new Set();
  const add=list=>{
    if(!Array.isArray(list)||seen.has(list)) return;
    seen.add(list);
    lists.push(list);
  };
  ['mainBoard','globalPanels','spellSlots','rings','inventory','hand','handSlots'].forEach(key=>add(G&&G[key]));
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  add(board&&board.boardCards);
  if(typeof _rewCards!=='undefined') add(_rewCards);
  return lists;
}

// 木箱の所持数は、到着時の回収と酒場の紛失判定で同じ範囲を使う。
function _qCountOwnedCards(cardNo){
  const wanted=String(cardNo||'').trim().toUpperCase();
  if(!wanted) return 0;
  return _qOwnedCardLists().reduce((count,list)=>count+list.filter(card=>_qCardNo(card)===wanted).length,0);
}
function _qCargoHeldCount(entry){
  return _qIsCargoEntry(entry)?_qCountOwnedCards(_qConfig(entry).requiredCardNo):0;
}

function _qTakeOwnedCards(cardNo,entry){
  if(_qIsDebugArrivalReplay(entry)) return _qCountOwnedCards(cardNo);
  const wanted=String(cardNo||'').trim().toUpperCase();
  if(!wanted) return 0;
  const lists=_qOwnedCardLists();
  let count=0;
  lists.forEach(list=>{
    for(let i=0;i<list.length;i++){
      if(_qCardNo(list[i])!==wanted) continue;
      list[i]=null;
      count++;
    }
  });
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  return count;
}

function _qGiveTownArrivalGold(entry,data,cfg,count){
  if(entry.townRewardGiven||_qIsDebugArrivalReplay(entry)) return;
  entry.townRewardGiven=true;
  const gold=_qDeliveryGold(data,count,cfg);
  if(gold&&typeof gainEventGold==='function') gainEventGold(gold);
  if(typeof updateHUD==='function') updateHUD();
}

function _qPayCargoLoss(entry,transportCount,held){
  if(!entry||entry.cargoLossPaid||_qIsDebugArrivalReplay(entry)) return 0;
  const required=Math.max(0,Math.floor(Number(transportCount)||0));
  const owned=Math.max(0,Math.floor(Number(held)||0));
  const lost=Math.max(0,required-owned);
  if(!lost) return 0;
  const due=lost*Q007_CARGO_LOSS_GOLD_PER_BOX;
  // gold_fx.js が表示（-X）・数え下げ・SEを一括して担当する。
  if(typeof spendEventGold!=='function') return 0;
  const paid=spendEventGold(due);
  entry.cargoLossPaid=true;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  return paid;
}

function _qQ002ExpectedCount(entry){
  if(Array.isArray(entry&&entry.rewardMixTargets)) return entry.rewardMixTargets.length;
  return Math.max(0,Math.floor(Number(_qConfig(entry).rewardMix&&_qConfig(entry).rewardMix.count)||0));
}

async function _qRunRecoveryTownArrival(entry,data,cfg){
  await _qStartDialogue((data.initial||[]).slice(0,2),{screen:'village'});
  const mix=_qConfig(entry).rewardMix||{};
  const held=_qTakeOwnedCards(mix.cardNo,entry);
  const expected=_qQ002ExpectedCount(entry);
  if(held===0){
    // Q002_2の到着台詞1〜2は表情指定がないため、Aの通常表情を保つ。
    // A1以降の切り替えは各台詞の表情列が担当する。
    await _qStartDialogue(_qSpecialLines(data,'A'),{screen:'village'});
    return 'completed';
  }
  if(expected>0&&held===expected){
    const lines=_qSpecialLines(data,'B');
    const rewardLine=(data.specialB2||[]).length?(data.specialB1||[]).length:-1;
    await _qStartDialogue(lines,{screen:'village',onLine:index=>{
      if(index===rewardLine) _qGiveTownArrivalGold(entry,data,cfg,held);
    }});
    return 'completed';
  }
  const line3=(data.initial||[]).slice(2,3);
  const line4=_qReplaceCount((data.initial||[]).slice(3,4),held);
  const lines=[...line3,...line4];
  const rewardLine=line4.length?line3.length:-1;
  await _qStartDialogue(lines,{screen:'village',onLine:index=>{
    if(index===rewardLine) _qGiveTownArrivalGold(entry,data,cfg,held);
  }});
  return 'completed';
}

async function _qRunCargoTownArrival(entry,data,cfg){
  await _qStartDialogue((data.initial||[]).slice(0,1),{screen:'village'});
  const held=_qTakeOwnedCards(_qConfig(entry).requiredCardNo,entry);
  const transportCount=Math.max(0,Math.floor(Number(entry.transportCount)||0));
  if(transportCount>=1&&held>=transportCount){
    const line2=_qReplaceCount((data.initial||[]).slice(1,2),transportCount);
    const line3=_qReplaceCount((data.initial||[]).slice(2,3),transportCount);
    const lines=[...line2,...line3];
    const rewardLine=line3.length?line2.length:-1;
    await _qStartDialogue(lines,{screen:'village',onLine:index=>{
      if(index===rewardLine) _qGiveTownArrivalGold(entry,data,cfg,transportCount);
    }});
    return 'completed';
  }
  if(held===0){
    const lines=_qSpecialLines(data,'A');
    await _qStartDialogue(lines,{screen:'village',onLine:index=>{
      // 全部なくした場合は特殊台詞A4を表示した時に支払う。
      if(index===lines.length-1) _qPayCargoLoss(entry,transportCount,held);
    }});
    return 'failed';
  }
  const lines=[
    ...(data.initial||[]).slice(1,2),
    ..._qSpecialLines(data,'B'),
  ];
  await _qStartDialogue(lines,{screen:'village',onLine:index=>{
    // 一部なくした場合は特殊台詞B3を表示した時に支払う。
    if(index===lines.length-1) _qPayCargoLoss(entry,transportCount,held);
  }});
  return 'failed';
}

async function _qFinishTownArrival(entry,shade,status){
  const generation=Number(G._debugEventGeneration)||0;
  entry.status=status==='failed'?'failed':'completed';
  if(entry.status==='failed'){
    entry.rewardCardTaken=false;
    entry.partedPending=false;
  }
  entry.townEventDone=true;
  entry.towerEventDone=true;
  entry.description='';
  if(_qConfig(entry).retainedCard) _qInvalidateEnemyReplacements(entry);
  _qRemoveDialogue();
  await _qClearPresentation();
  if(generation!==(Number(G._debugEventGeneration)||0)) return;
  if(shade){
    shade.classList.remove('is-visible');
    await _qWait(TAVERN_PORTRAIT_FADE_MS);
    if(generation!==(Number(G._debugEventGeneration)||0)) return;
    shade.remove();
  }
  document.body.classList.remove('quest-town-event-active','tavern-screen-active','reward-screen-active','facility-bg-active');
  document.body.classList.add('village-screen-active');
  G._isTavern=false;
  G._isVillageMenu=true;
  G._facilityLabel='';
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground(null);
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  syncQuestFormationUi();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('town');
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  _qTownSession=false;
}

function _qTownArrivalEntry(){
  questCheckRetainedCards();
  const entry=_qArrivalEntry();
  const questCfg=entry&&_qConfig(entry);
  const cfg=questCfg&&questCfg.townArrival;
  if(_qTownSession||!entry||questCfg.completeAt!=='town'||!cfg||entry.townEventDone||!G||G._isWaveAltar
    ||questCfg.offlineOnly&&G._onlineMode) return null;
  if(Number(G._wave)!==Number(questCfg.completeWave)) return null;
  // オンラインのG._waveStageはサーバーのraw step（city=5）で、PvEの旅程配列とは
  // 添字の意味が違う。オンラインだけはサーバーが配った現在ノードを正とする。
  const onlineState=G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch
    ?OnlineMatch.getState():null;
  const nodeType=onlineState&&onlineState.nodeType
    ?String(onlineState.nodeType)
    :(typeof waveStageRouteType==='function'?waveStageRouteType(G._wave,G._waveStage):null);
  if(nodeType!=='city') return null;
  return entry;
}

function questPrepareTownArrival(){
  const entry=_qTownArrivalEntry();
  if(!entry) return false;
  const cfg=_qConfig(entry);
  const portraitB=cfg.townArrival&&cfg.townArrival.portraitB||cfg.portraitB;
  ['MC001',portraitB].filter(Boolean).forEach(id=>{
    const cfg=TAVERN_PORTRAIT_CONFIG[id];
    if(!cfg) return;
    const pre=new Image();
    pre.src=_qPortraitSrc(cfg.src);
    if(typeof pre.decode==='function') pre.decode().catch(()=>{});
  });
  _qEnsureStyle();
  document.body.classList.add('quest-town-event-active');
  return true;
}

async function maybeStartQuestTownArrival(){
  const entry=_qTownArrivalEntry();
  if(!entry) return false;
  const generation=Number(G._debugEventGeneration)||0;
  _qTownSession=true;
  entry.townEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('quest-town-event-active');
  const screen=_qPresentationScreen('village');
  const shade=document.createElement('div');
  shade.className='quest-event-shade';
  if(screen) screen.appendChild(shade);
  requestAnimationFrame(()=>shade.classList.add('is-visible'));
  const questCfg=_qConfig(entry);
  const cfg=questCfg.townArrival||{};
  const portraitB=cfg.portraitB;
  const data=_qQuestData(entry.towerVariant)||{};
  const firstLines=questCfg.cargo?(data.initial||[]).slice(0,1):(data.initial||[]).slice(0,2);
  // 力の代償（Q001_2）の到着会話はBキャラを出さない（2026-10-07 利用者指定）。townArrival.withoutB で指定する。
  await _qShowPortraitPair('village',entry,{portraitB,firstLines,namePlateVariant:entry.towerVariant,forceNamePlate:!cfg.withoutB,withoutB:!!cfg.withoutB});
  if(generation!==(Number(G._debugEventGeneration)||0)) return false;
  let status='completed';
  if(cfg.dialogueOnly) await _qStartDialogue(data.initial||[],{screen:'village'});
  else status=questCfg.cargo?await _qRunCargoTownArrival(entry,data,cfg):await _qRunRecoveryTownArrival(entry,data,cfg);
  if(generation!==(Number(G._debugEventGeneration)||0)) return false;
  await _qFinishTownArrival(entry,shade,status);
  return true;
}

async function _qFinishTowerArrival(entry){
  if(!entry) return;
  const generation=Number(G._debugEventGeneration)||0;
  // クエスト完了（クエスト枠の文が消える時）に、必須カード（ファラ）とも別れる。
  // 指輪輸送は指定台詞で回収済みだが、中断経路への安全策としてここでも印付き個体だけを除く。
  if(!_qIsDebugArrivalReplay(entry)){
    _qRemoveRequiredCards(entry);
    _qRemoveRequiredRing(entry);
  }
  entry.status='completed';
  entry.towerEventDone=true;
  entry.description='';
  _qRemoveDialogue();
  await _qClearPresentation();
  if(generation!==(Number(G._debugEventGeneration)||0)) return;
  document.body.classList.remove('tavern-tower-event-active');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  syncQuestFormationUi();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('tower');
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  _qTowerSession=false;
}

// この塔で到着の会話が始まるか（クエストを受けた街の塔に、受託中で着いた時）。
function _qTowerArrivalEntry(){
  const entry=_qArrivalEntry();
  if(_qTowerSession||!entry||!G||!G._isWaveAltar||Number(G._wave)!==Number(entry.wave)) return null;
  // 塔で完了すると明示した依頼だけを拾う。町到着・戦闘完了型の「_2」を塔で始めない。
  if(_qConfig(entry).completeAt!=='tower') return null;
  if(_qConfig(entry).towerDeparture) return null;
  return entry;
}
// 塔に入る前（地名表示の前）に呼ぶ。会話が始まる塔なら、施設ボタン・出発ボタンを最初から隠す。
// 以前は地名表示の後にボタンが一瞬出てから会話で隠れていた（2026-09-25 利用者指摘）。
function questPrepareTowerArrival(){
  const entry=_qTowerArrivalEntry();
  if(!entry) return false;
  // 地名表示の間に立ち絵を読み込み・展開しておく（着いてからだと展開待ちで遅れて急に出る）。
  ['MC001',_qConfig(entry).portraitB].filter(Boolean).forEach(id=>{
    const cfg=TAVERN_PORTRAIT_CONFIG[id];
    if(!cfg) return;
    const pre=new Image();
    pre.src=_qPortraitSrc(cfg.src);
    if(typeof pre.decode==='function') pre.decode().catch(()=>{});
  });
  _qEnsureStyle();
  document.body.classList.add('tavern-tower-event-active');
  return true;
}

function _qTowerArrivalDialogue(entry,data){
  const cfg=_qConfig(entry).towerArrival||{};
  const count=Math.max(0,Math.floor(Number(entry.defeatedCount)||0));
  const formula=data.rewardGoldByDefeat;
  const zero=cfg.defeatCount&&count===0;
  const lines=zero?[...(data.initial||[]).slice(0,cfg.zeroInitialCount),..._qSpecialLines(data,cfg.zeroSpecialGroup)]
    :cfg.defeatCount?_qReplaceCount(data.initial,count):data.initial;
  const reward=cfg.defeatCount
    ?(formula?Math.pow(count,formula.power)*formula.multiplier:0)
    :Math.max(0,Number(data.rewardGold)||0);
  return {lines,reward,rewardLine:zero?-1:Math.max(0,(Number(cfg.rewardLine)||1)-1)};
}

// クエストを受けた街の塔に着いた時（地名表示の後）、「_2」の会話を始める。
async function maybeStartQ009TowerArrival(){
  const entry=_qTowerArrivalEntry();
  if(!entry) return;
  const generation=Number(G._debugEventGeneration)||0;
  _qTowerSession=true;
  entry.towerEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('tavern-tower-event-active');
  const facilities=document.getElementById('village-facilities');
  if(facilities) facilities.style.display='none';
  const moves=document.getElementById('village-move-btns');
  if(moves) moves.style.display='none';
  const data=_qQuestData(entry.towerVariant)||{};
  const dialogue=_qTowerArrivalDialogue(entry,data);
  await _qShowPortraitPair('village',entry,{firstLines:dialogue.lines||[]});
  if(generation!==(Number(G._debugEventGeneration)||0)) return;
  const towerCfg=_qConfig(entry).towerArrival||{};
  _qStartDialogue(dialogue.lines,{screen:'village',onLine:index=>{
    if(index!==dialogue.rewardLine||entry.towerRewardGiven||_qIsDebugArrivalReplay(entry)) return;
    entry.towerRewardGiven=true;
    // 指定された台詞で、クエスト由来の印を持つ指輪だけを回収する。
    if(towerCfg.collectRing) _qRemoveRequiredRing(entry);
    // 「+X」と数え上げは共通の所持金演出（gold_fx.js）、音はイベント収入の共通処理が鳴らす。
    if(dialogue.reward&&typeof gainEventGold==='function') gainEventGold(dialogue.reward);
    if(typeof updateHUD==='function') updateHUD();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('tower');
  },onDone:()=>_qFinishTowerArrival(entry)});
}

if(typeof window!=='undefined'){
  window.showTavernPortrait=showTavernPortrait;
  window.openTavern=openTavern;
  window.questTavernAvailable=questTavernAvailable;
  window.questTavernCompleted=questTavernCompleted;
  window.questDebugForceWaveQuest=questDebugForceWaveQuest;
  window.questGarmPreviewStats=questGarmPreviewStats;
  window.syncQuestFormationUi=syncQuestFormationUi;
  window.syncTavernFormationControls=syncTavernFormationControls;
  window.openFiveSaintsSeat=openFiveSaintsSeat;
  window.fiveSaintsAcceptedCount=fiveSaintsAcceptedCount;
  window.fiveSaintsShouldAdvanceToStageFive=fiveSaintsShouldAdvanceToStageFive;
  window.fiveSaintsCurrentTowerResolved=fiveSaintsCurrentTowerResolved;
  window.fiveSaintsRewardTitle=fiveSaintsRewardTitle;
  window.fiveSaintsRewardSlotTitle=fiveSaintsRewardSlotTitle;
  window.fiveSaintsCardCanUseBoardSlot=fiveSaintsCardCanUseBoardSlot;
  window.fiveSaintsSyncTargetGlow=fiveSaintsSyncTargetGlow;
  window.syncFiveSaintsFormationControls=syncFiveSaintsFormationControls;
  window.storyFlipSlidePortraitLeft=_qFlipSlidePortraitLeft;
  window.questTavernRewardTitle=questTavernRewardTitle;
  window.questRingOfferActive=questRingOfferActive;
  window.questRingOfferSlotCount=questRingOfferSlotCount;
  window.questRingOfferCanReturn=questRingOfferCanReturn;
  window.questReturnRingOffer=questReturnRingOffer;
  window.questRingActionsLocked=questRingActionsLocked;
  window.checkQ009CompanionPresence=checkQ009CompanionPresence;
  window.questForgeFavor=questForgeFavor;
  window.onTavernQuestRewardCardTaken=onTavernQuestRewardCardTaken;
  window.questMixBattleRewards=questMixBattleRewards;
  window.questRewardSlotAcceptsCard=questRewardSlotAcceptsCard;
  window.questRequestDragActive=questRequestDragActive;
  window.questCardLossIsFatal=questCardLossIsFatal;
  window.questForgeChainState=questForgeChainState;
  window.questMarkForgeChainSeen=questMarkForgeChainSeen;
  window.questCutFatalLink=questCutFatalLink;
  window.maybeStartQuestTownArrival=maybeStartQuestTownArrival;
  window.questPrepareTownArrival=questPrepareTownArrival;
  window.maybeStartQ009TowerArrival=maybeStartQ009TowerArrival;
  window.questPrepareTowerArrival=questPrepareTowerArrival;
  window.questRequiredEntryOnBoard=questRequiredEntryOnBoard;
  window.questOnRequiredCardDestroyed=questOnRequiredCardDestroyed;
  window.questRequiredCardGone=questRequiredCardGone;
  window.questRequiredCardFor=questRequiredCardFor;
  window.questCardPartable=questCardPartable;
  window.questPartWithCard=questPartWithCard;
  window.questGuardLeave=questGuardLeave;
  window.questBattleCardLine=questBattleCardLine;
  window.questOnCardLost=questOnCardLost;
  window.questBattleVanishedCard=questBattleVanishedCard;
  window.questDeferGameOver=questDeferGameOver;
  window.questResumePendingEvent=questResumePendingEvent;
  window.questCommitAltarSacrifices=questCommitAltarSacrifices;
  window.questOnAltarRingTaken=questOnAltarRingTaken;
  window.questBeforeTowerDepart=questBeforeTowerDepart;
  window.questEncounterBattlePending=questEncounterBattlePending;
  window.questEncounterEnemySpec=questEncounterEnemySpec;
  window.questIsMagicWolfBattle=questIsMagicWolfBattle;
  window.questIsGarmBattle=questIsGarmBattle;
  window.questBattleCarryActive=questBattleCarryActive;
  window.questBattleStartSpec=questBattleStartSpec;
  window.questHandleMagicWolfVictory=questHandleMagicWolfVictory;
  window.questHandleBattleVictory=questHandleBattleVictory;
  window.questBattleEnemyFled=questBattleEnemyFled;
  window.questBattleEnemyDefeated=questBattleEnemyDefeated;
  window.questPrepareBattleDefeat=questPrepareBattleDefeat;
  window.questPlayBattleDefeatDialogue=questPlayBattleDefeatDialogue;
  window.questFinishBattleDefeat=questFinishBattleDefeat;
  window.questReplaceMagicWolfEnemies=questReplaceMagicWolfEnemies;
}
