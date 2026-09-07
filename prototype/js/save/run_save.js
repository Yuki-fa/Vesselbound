// 正式なRunStateとチェックポイントの寿命。G全体・DOM・演出の進捗は保存しない。
const SaveRun=(()=>{
  const fields={
    player:['gold','life','_waveLife','mainBoard','inventory','globalPanels','spellSlots','rings','mapPanelPowers','panelPermanentBuffs','panelColorPermanentBuffs','magicLevel','facilities','facilityDiscounts','baseIncome'],
    progress:['floor','_wave','_waveStage','_waveBattleType','_waveBattleWon','_waveEliteWon','_waveFinalVillage','_waveWithdraw','_waveResumeStage','_waveDefeatReturnTo','_waveIsRetry','_waveRetryEnemyKey','_waveEnemySnapshot','_mapBattle','worldMap','_retryFloor','rewardGrade','rewardGradeUpCount','rewardCharCount','rewardCards','maxRewardCards','_waveRewardCount','_bossJustDefeated','_isBossRewardCycle','_battleBossMult','_isEliteFight','_eliteIdx','_bossSlot','runStats'],
    choices:['panelSaleStock','_waveShopStock','_waveItemShopStock','_waveForgeOffers','_waveRingExchange','_waveInnUsed','_mapForgeOffers','_ringOffer','_ringOfferUnlocked','_ringOfferResolved','_boardDiscardCount','_bossRingOfferSeen','_bonusRewardPanels','_pendingTreasureItems','_eliteTreasureRewardPending','pendingBattleItems','nextBattleItems','activeBattleItems','_nextRewardUniqueSlot','_libraryLoanCardsState','_libraryLoanInitialCards','_libraryLoanSnapshot','_rewardStartSnapshot','_ringPhaseStartSnapshot','_retryRewardCards'],
    place:['_waveVillage','_isWaveAltar','_mapReturnAfterReward','_facilityCacheKey','_facilityLabel','_isShop','_isItemShop','_isForge','_isTavern','_isVillageMenu','_isLibrary','_isLibraryMenu','_isRingExchange','_ringOfferPhase','_isTreasureMapReward','_isRewardTown','_freeRewardPanelMode','_rewardOnePickMode','_freeItemPhase','_freeItemUsed']
  };
  const setFields=['_usedNamedElite','_usedNamedRest','_seenRarity3'];
  let resume=null,busy=false,restoring=false,retryBattle=null,catalogReady=false;
  let resumeTimer=null,resumeResolve=null,resumeStarting=false,resumeGeneration=0;
  function lockInput(on){document.body.inert=!!on;}
  const omitted=new Set(['_lastDamageSource','_coreRunner','_lastVisualRect','_battleEntryRect','_shownAtk','_shownHp','_shownMaxHp','_shownShield','_deathFxStarted','_deathFxDone','_deathFxReady','_rewardReturnCard','_rewardReturnIdx','_rewardReturnPhaseId']);
  function copy(value){
    // カード／コアイベント内の一時表示情報だけを除外する。非有限数は拒否する。
    const raw=JSON.stringify(value,(key,v)=>{
      if(omitted.has(key)||v===undefined) return undefined;
      if(key==='_sealValue'&&v===Infinity) return undefined; // _sealInfinityが正式な表現
      // コアのスナップショットは未指定の任意順位をNumber(undefined)で返す。
      // 未指定は保存上も欠落で表す（数値0へ変換して優先順位を変えない）。
      if(['manaOrder','manaThresholdOrder'].includes(key)&&Number.isNaN(v)) return undefined;
      if(typeof v==='number'&&!Number.isFinite(v)) throw new Error(`不正な数値: ${key}`);
      if(typeof v==='function') throw new Error(`関数を保存できません: ${key}`);
      if(v instanceof Set) return [...v];
      if(v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null) throw new Error(`保存できないオブジェクト: ${key}`);
      return v;
    });
    return raw===undefined?null:JSON.parse(raw);
  }
  function enabled(){return typeof G!=='undefined'&&!!G._runId&&!G._debugMode&&!G._onlineMode&&!G._testBattleMode&&!G._libraryTestBattleMode&&!G._libraryTutorialActive&&!G._isSimulating;}
  function begin(){
    cancelResume();
    const seed=globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296);
    G._runSeed=seed;G._runRngState=seed;G._runId=`${Date.now()}-${seed}`;G._runEnded=false;
    G.questProgress={};G.difficulty='normal';retryBattle=null;resume=null;
  }
  function cancelResume(){
    resumeGeneration++;
    if(resumeTimer!==null){clearTimeout(resumeTimer);resumeTimer=null;}
    const resolve=resumeResolve;resumeResolve=null;
    resumeStarting=false;resume=null;restoring=false;
    if(typeof document!=='undefined'&&document.body){
      document.body.classList.remove('run-resume-active');
      const overlay=document.getElementById('run-resume-overlay');
      if(overlay) overlay.setAttribute('aria-hidden','true');
    }
    if(resolve) resolve();
  }
  function random(){
    // 演出用uidの発行回数で、次の報酬候補・施設在庫の乱数を進めない。
    if(typeof G!=='undefined'&&(G._savedBattleReplaying||G._savePresentation)) return Math.random();
    if(!enabled()) return Math.random();
    let t=G._runRngState=(G._runRngState+0x6D2B79F5)>>>0;
    t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  }
  function serializeRunState(){
    const state={};
    for(const [group,names] of Object.entries(fields)){
      state[group]={};
      for(const name of names) if(G[name]!==undefined) state[group][name]=copy(G[name]);
    }
    state.sets=Object.fromEntries(setFields.map(name=>[name,[...(G[name]||[])]]));
    state.rng={seed:G._runSeed,state:G._runRngState};
    state.questProgress=copy(G.questProgress||{});state.difficulty=G.difficulty||'normal';
    state.reward={cards:copy(_rewCards),freePickDone:!!_rewFreePickDone,phaseId:_rewPhaseId};
    state.location={scene:G._wave,stage:G._waveStage,node:G.worldMap?.currentNodeId||null,screen:G._waveVillage?'village':'battle'};
    return state;
  }
  function validate(raw){
    const save=SaveMigrations.migrate('run',raw),a=SaveMigrations.assert,s=save.state;
    a(typeof save.runId==='string'&&s,'ラン状態がありません');
    a(save.checkpoint&&['reward','town','tower','battle'].includes(save.checkpoint.type),'保存地点が不正です');
    a(save.checkpoint.scene===s.location.scene&&save.checkpoint.stage===s.location.stage,'チェックポイントの現在地が一致しません');
    for(const group of Object.keys(fields)){
      a(s[group]&&typeof s[group]==='object'&&!Array.isArray(s[group]),`状態がありません: ${group}`);
      for(const name of Object.keys(s[group])) a(fields[group].includes(name),`未定義の状態です: ${name}`);
    }
    a(Number.isInteger(s.location?.scene)&&s.location.scene>=0&&s.location.scene<=5,'Sceneが不正です');
    const route=s.location.scene===0?['city']:_journeyRouteForScene(s.location.scene);
    a(Number.isInteger(s.location.stage)&&s.location.stage>0&&(s.location.stage<=route.length||(s.location.scene===5&&s.location.stage===5)),'現在地が存在しません');
    a(s.progress._wave===s.location.scene&&s.progress._waveStage===s.location.stage,'現在地が一致しません');
    a(Number.isFinite(s.player.gold)&&s.player.gold>=0&&Number.isFinite(s.player._waveLife)&&s.player._waveLife>=0,'資源が不正です');
    a(Array.isArray(s.player.mainBoard)&&s.player.mainBoard.length===MAIN_BOARD_SIZE,'魔導板が不正です');
    for(const key of ['inventory','globalPanels','spellSlots','rings']) a(Array.isArray(s.player[key]),`所持欄がありません: ${key}`);
    const pools=[...(typeof PANEL_POOL!=='undefined'?PANEL_POOL:[]),...(typeof ITEM_POOL!=='undefined'?ITEM_POOL:[]),...(typeof RING_POOL!=='undefined'?RING_POOL:[])];
    function cards(list){for(const c of list){if(!c)continue;const ref=SaveProfile.identity(c);a(typeof c==='object'&&pools.some(def=>c.id===def.id||(ref&&SaveProfile.identity(def)?.id===ref.id)),`未登録の所持カードIDです: ${c.id||c.no||c.No||c.name||'?'}`);}}
    for(const key of ['mainBoard','inventory','globalPanels','spellSlots','rings']) cards(s.player[key]);
    a(s.reward&&Array.isArray(s.reward.cards)&&typeof s.reward.freePickDone==='boolean'&&Number.isInteger(s.reward.phaseId),'報酬状態が不正です');cards(s.reward.cards);
    a(s.rng&&[s.rng.seed,s.rng.state].every(n=>Number.isInteger(n)&&n>=0&&n<=0xffffffff),'乱数状態が不正です');
    a(s.sets&&setFields.every(k=>Array.isArray(s.sets[k])),'集合の状態が不正です');
    if(save.checkpoint.type==='battle') validateBattle(save.pendingBattle);
    else a(save.pendingBattle===null,'非戦闘セーブに戦闘が混在しています');
    return save;
  }
  function validateBattle(p){
    const a=SaveMigrations.assert;
    a(p&&Number.isInteger(p.seed)&&p.seed>=0&&p.seed<=0xffffffff,'戦闘seedが不正です');
    a(p.setup?.units&&Array.isArray(p.setup.units.p1)&&Array.isArray(p.setup.units.p2),'戦闘編成がありません');
    a(Array.isArray(p.events)&&p.events.length>0&&p.events.every(e=>e&&typeof e.type==='string'),'イベント列が不正です');
    a(['p1','p2','draw'].includes(p.outcome)&&['wiped','both_wiped','turn_limit','both_defense'].includes(p.endReason),'戦闘結果が不正です');
    a(Array.isArray(p.frames)&&p.frames.length>=2&&p.finalState?.units,'戦闘の状態列がありません');
    let at=0;
    for(const f of p.frames){a(f.from===at&&Number.isInteger(f.to)&&f.to>=at&&f.to<=p.events.length&&f.state?.units,'状態列が不正です');at=f.to;}
    a(at===p.events.length&&p.events.at(-1).type==='battle_end'&&p.events.at(-1).outcome===p.outcome,'イベント列と結果が一致しません');
  }
  function buildRunSave(type,pendingBattle=null){
    const checkpoint={type,scene:G._wave,stage:G._waveStage,node:G._mapBattle?.nodeId||G.worldMap?.currentNodeId||null,battleType:G._waveBattleType||null};
    return {saveVersion:2,gameVersion:SaveMigrations.gameVersion,runId:G._runId,savedAt:Date.now(),checkpoint,state:serializeRunState(),pendingBattle};
  }
  function saveRun(save){return SaveStorage.write('run',save,validate);}
  function loadRun(){
    if(!catalogReady) return null;
    try{
      const found=SaveStorage.read('run',validate)?.data||null;
      // profileだけ成功して削除時に停止したランは再開しない。
      if(found&&SaveProfile.load().completedRuns[found.runId]) return null;
      return found;
    }catch(error){console.error('[run] 続きからを無効にしました',error);return null;}
  }
  function deleteRunSave(){SaveStorage.remove('run');refreshContinue();}
  function restoreRunState(save){
    save=validate(save);
    const s=copy(save.state);
    initState();
    for(const group of Object.keys(fields)) Object.assign(G,s[group]);
    for(const name of setFields) G[name]=new Set(s.sets[name]);
    G._runId=save.runId;G._runSeed=s.rng.seed;G._runRngState=s.rng.state;
    G.questProgress=s.questProgress;G.difficulty=s.difficulty;G._runEnded=false;
    _rewCards=s.reward.cards;_rewFreePickDone=s.reward.freePickDone;_rewPhaseId=s.reward.phaseId;
    G._partyBoardUnit=null;G.phase=save.checkpoint.type==='battle'?'player':'reward';
    if(G.runStats){G.runStats.startedAt=performance.now();}
    return G;
  }
  function error(error){
    console.error('[run] セーブに失敗しました',error);
    window.alert('セーブに失敗しました。空き容量やブラウザの保存設定を確認してください。');
  }
  function checkpoint(type){
    if(!enabled()||restoring||busy||G._runEnded) return;
    try{
      SaveProfile.owned();
      const save=buildRunSave(type);
      saveRun(save);refreshContinue();
      return save;
    }catch(e){error(e);return null;}
  }
  function finish(result){
    if(!enabled()||G._runEnded) return;
    if(SaveProfile.finish(result)){
      try{deleteRunSave();G._runEnded=true;}catch(e){console.error('[run] 終了したランの削除失敗',e);}
    }else console.error('[run] profile未保存のためrun saveを保持しました');
  }
  function refreshContinue(){
    const btn=document.getElementById('title-continue-btn');
    if(btn){btn.disabled=!loadRun();btn.setAttribute('aria-disabled',String(btn.disabled));}
  }
  async function continueRun(){
    if(busy||restoring) return;
    const save=loadRun();if(!save){refreshContinue();return;}
    restoring=true;
    try{
      if(typeof exitOnlineMode==='function') exitOnlineMode();
      if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
      restoreRunState(save);
      document.body.classList.remove('gameover-active','game-clear-active','battle-victory-pending');
      const type=save.checkpoint.type;
      if(type==='reward'){showScreen('battle');goToReward({restoreCheckpoint:true});}
      else if(type==='town'||type==='tower') openMapVillage({tower:type==='tower',restoreCheckpoint:true});
      else await showBattleResume(save);
    }catch(e){console.error('[run] 再開失敗',e);window.alert('セーブデータを再開できませんでした。');showScreen('title');}
    finally{restoring=false;}
  }
  async function showBattleResume(save){
    if(resumeStarting) return;
    resumeStarting=true;
    const generation=++resumeGeneration;
    resume=copy(save.pendingBattle);
    const overlay=document.getElementById('run-resume-overlay');
    document.body.classList.add('run-resume-active');
    if(overlay) overlay.setAttribute('aria-hidden','false');
    if(typeof _syncRewardJourneyUi==='function') _syncRewardJourneyUi({root:document.getElementById('run-resume-journey-ui'),exactCurrent:true,resume:true});
    await new Promise(resolve=>{
      resumeResolve=resolve;
      resumeTimer=setTimeout(()=>{resumeTimer=null;resumeResolve=null;resolve();},4000);
    });
    if(!resumeStarting||generation!==resumeGeneration) return;
    document.body.classList.remove('run-resume-active');
    if(overlay) overlay.setAttribute('aria-hidden','true');
    showScreen('battle');
    // ここからは通常進行。戦闘終了後に作られる次のチェックポイントを抑止しない。
    restoring=false;
    try{await startBattle();}
    finally{if(generation===resumeGeneration) resumeStarting=false;}
  }
  function snapshotCore(state){return copy({units:state.units,resources:state.resources,life:state.life,maxLife:state.maxLife,blood:state.blood,turn:state.turn||0});}
  function computeBattle(initial,seed){
    const state=copy(initial);
    state.turn=0;state._coreStateToken=`saved-${seed}`;
    state.lane={p1:{lane:'front',attacked:new Set()},p2:{lane:'front',attacked:new Set()}};
    state.deadUnits=[];
    const events=[],frames=[];
    let from=0;
    const emit=ev=>events.push(copy(ev));
    const rewardRng=createSeededRng(seed^0x47a21b),paid=new Set();
    const frame=()=>{
      let reward=0;
      // 撃破報酬は既存のPvE後始末と同じ入口で確定する。戦闘ルールはコアに置く。
      for(const ev of events.slice(from)){
        if(ev.side!=='p2'||!['death','fled'].includes(ev.type)||paid.has(ev.unitId)) continue;
        const unit=state.units.p2.find(u=>u&&u.id===ev.unitId);
        if(!unit||unit.hp>0) continue;
        paid.add(ev.unitId);ev.pveRewardGold=_rollEnemyGold(unit,rewardRng);
        reward+=goldIncomeAmount(ev.pveRewardGold);
      }
      frames.push({from,to:events.length,state:snapshotCore(state)});from=events.length;
      state.resources.p1.gold+=reward;
    };
    const runner=createBattleRunner(state,createSeededRng(seed),emit);
    frame();
    while(!runner.result&&state.turn<BATTLE_CORE_TURN_LIMIT){
      const stop=runner.step({deferCompact:true});frame();runner.compact();if(stop) break;
    }
    const result=runner.finish();frame();
    return {seed,setup:copy(initial),events,outcome:result.outcome,endReason:result.endReason,frames,finalState:snapshotCore(state)};
  }
  function installSetup(p){
    const s=copy(p.setup);
    G.allies=s.units.p1;G.enemies=s.units.p2;G.activeBattleItems=s.items.p1;
    G.gold=s.resources.p1.gold;G.mana=s.resources.p1.mana;G._blood=s.blood.p1;G._enemyBlood=s.blood.p2;
    G._waveLife=s.life.p1;G.life=s.life.p1;
    _isBossFight=G._waveBattleType==='boss';
    _stampCoreSideSlots({units:{p1:G.allies,p2:G.enemies}});
  }
  async function prepareBattle(saved){
    if(saved){installSetup(saved);lockInput(false);return saved;}
    busy=true;
    try{
      const state=_createPveCoreState();_stampCoreSideSlots(state);
      // プールは純データ。runner等の実行状態はsetupへ持ち込まない。
      const initial=copy({units:state.units,summonDefs:state.summonDefs,itemDefs:state.itemDefs,rings:state.rings,items:state.items,resources:state.resources,life:state.life,maxLife:state.maxLife,blood:state.blood,mapIndex:state.mapIndex,maxUnits:state.maxUnits,frontSlots:state.frontSlots});
      const seed=Math.floor(random()*4294967296);
      const p=computeBattle(initial,seed);
      const save=buildRunSave('battle',p);
      retryBattle=save;saveRun(save);retryBattle=null;
      return p;
    }finally{busy=false;G._savePreparing=false;lockInput(false);}
  }
  // 通常のPvE演出が期待する「1手計算後」のデータを、保存済み状態から反映する。
  function applyFrame(frame,state){
    const snap=copy(frame.state);
    for(const side of ['p1','p2']){
      const old=new Map(state.units[side].filter(Boolean).map(u=>[u.id,u]));
      const next=snap.units[side].map(data=>{
        if(!data) return null;
        const existing=old.get(data.id);
        // _corePendingSummon はCore計算中の全スナップショットに残る表示専用フラグ。
        // 一度召喚イベントを見せて外した後まで復元すると、次の手番から描画対象外に
        // 戻り、姿だけ消えたまま攻撃を続ける。表示済みの状態は巻き戻さない。
        if(existing&&!existing._corePendingSummon) delete data._corePendingSummon;
        const u=existing||{};
        for(const key of Object.keys(u)) if(!omitted.has(key)&&!Object.hasOwn(data,key)&&!key.startsWith('_shown')) delete u[key];
        return Object.assign(u,data);
      });
      state.units[side].splice(0,state.units[side].length,...next);
    }
    for(const key of ['resources','life','maxLife','blood','turn']) state[key]=snap[key];
    G.turn=state.turn;
  }
  async function replay(p,runId){
    const state={units:{p1:G.allies,p2:G.enemies}};
    const before=new Set([...G.allies,...G.enemies].filter(Boolean));
    G._coreDrivenBattle=true;G._savedBattleReplaying=true;G._savedBattleEnd={pending:p,applied:false};
    G.phase='enemy';document.body.classList.add('battle-turn-active');
    try{
      // 最後のframeは終戦効果。既存onBattleEndの共通出口で反映する。
      for(const f of p.frames.slice(0,-1)){
        if(_battleRunStale(runId)) return;
        const held=[...G.allies,...G.enemies].filter(Boolean).map(u=>[u,u.atk,u.hp,u.maxHp,u.shield||0]);
        presentBeginPlayback();
        try{
          applyFrame(f,state);held.forEach(([u,...values])=>presentHoldShown(u,...values));
          const events=copy(p.events.slice(f.from,f.to));G._battleCoreEvents.push(...events);
          await _flushCorePveHitEvents(state,events,before);
        }finally{held.forEach(([u])=>presentReleaseShown(u));presentEndPlayback();}
        _syncCoreLifeToG(state);_syncCoreResourcesToG(state);_syncCoreManaToG(state);_refreshManaDisplays();
        coreCompactUnits(state);requestBattleCompact();
        if(f.to>f.from) await sleep(PRESENT_TURN_GAP_MS);
      }
    }finally{G._coreDrivenBattle=false;G._savedBattleReplaying=false;G._battleVictoryCheckPending=false;}
    if(_battleRunStale(runId)) return;
    G._deferManaThresholdEffects=false;
    if(p.outcome==='p2'){
      applyEnd(state);SaveProfile.owned();handleBattleDefeat();
    }else{
      G._battleDraw=p.outcome==='draw';
      if(_isBossFight&&p.outcome==='p1') G._bossJustDefeated=true;
      await finishBattleAsVictory(p.outcome==='draw'?'Draw':'敵を全滅させた！');
    }
  }
  function applyEnd(state){
    const end=G._savedBattleEnd;if(!end) return false;
    if(!end.applied){
      const f=end.pending.frames.at(-1);applyFrame(f,state);
      G._battleCoreEvents.push(...copy(end.pending.events.slice(f.from,f.to)));
      _syncCoreLifeToG(state);_syncCoreResourcesToG(state);_syncCoreManaToG(state);
      end.applied=true;
    }
    G._coreBattleEndTriggered=true;return true;
  }
  function recordDeath(unit,side,event){
    if(side==='p1'){
      G.battleCounters.deaths++;
      if(G.runStats) G.runStats.allyDeaths++;
    }else{
      G._enemyDeathsThisBattle=(G._enemyDeathsThisBattle||0)+1;
      if(G.runStats) G.runStats.enemyKills++;
      if(event.pveRewardGold>0) onGoldGained(event.pveRewardGold);
    }
    // HP・復活・死亡効果は保存済み。ここでは既存の死亡描画と統計だけを処理。
    if(typeof playSfx==='function') playSfx('death',{group:'combat'});
    _playDeathBurnOnce(unit,side==='p2');
  }
  function failedBattle(e){
    lockInput(false);G._savePreparing=false;error(e);
    // 同じ確定結果で保存を再試行できる。失敗のたびに再抽選しない。
    showScreen('title');
    const btn=document.getElementById('title-continue-btn');
    if(retryBattle&&btn){btn.disabled=false;btn.onclick=async()=>{
      try{saveRun(retryBattle);retryBattle=null;btn.onclick=continueRun;await continueRun();}catch(failure){error(failure);}
    };}
  }
  return {enabled,begin,cancelResume,random,lockInput,copy,validate,validateBattle,serializeRunState,restoreRunState,buildRunSave,saveRun,loadRun,deleteRunSave,checkpoint,finish,refreshContinue,continueRun,showBattleResume,computeBattle,prepareBattle,installSetup,replay,applyEnd,recordDeath,failedBattle,ready(){catalogReady=true;refreshContinue();},takeResume(){const p=resume;resume=null;return p;}};
})();
function runRandom(){return typeof SaveRun==='undefined'?Math.random():SaveRun.random();}
function serializeRunState(){return SaveRun.serializeRunState();}
function restoreRunState(save){return SaveRun.restoreRunState(save);}
function buildRunSave(kind,pending){return SaveRun.buildRunSave(kind,pending);}
function saveRun(save){return SaveRun.saveRun(save);}
function loadRun(){return SaveRun.loadRun();}
function deleteRunSave(){return SaveRun.deleteRunSave();}
window.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('title-continue-btn');if(btn) btn.onclick=()=>SaveRun.continueRun();
  SaveRun.refreshContinue();
});
