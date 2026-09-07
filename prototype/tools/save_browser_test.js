'use strict';
const assert=require('node:assert/strict');
const {launch}=require('./parity/headless');
const URL='http://127.0.0.1:5500/index.html';
(async()=>{
  const b=await launch();
  const ok=(name,value)=>{assert.ok(value,name);console.log('OK '+name);};
  async function load(){
    await b.goto(URL);await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20',20000);
    await b.eval('window.__alerts=[];window.alert=msg=>window.__alerts.push(msg);');
  }
  async function errors(){return b.events.filter(e=>e.method==='Runtime.consoleAPICalled'&&e.params.type==='error').map(e=>e.params.args.map(a=>a.description||a.value));}
  try{
    await load();
    ok('HTTP 5500が正常応答',await b.eval('return (await fetch(location.href)).ok'));
    ok('セーブなしはコンティニュー無効',await b.eval('return document.getElementById("title-continue-btn").disabled'));
    const initial=await b.eval('startGame(false);return {checkpoint:loadRun()?.checkpoint,profile:SaveProfile.load(),id:G._runId}');
    ok('通常ラン開始・街到着セーブ',initial.checkpoint?.type==='town');
    ok('初期カードを取得済みで記録',Object.values(initial.profile.cards).filter(x=>x.acquired&&x.seen).length>=2);
    // 戦闘前の保存と、途中終了を確認するため、開幕だけを保留する。
    await b.eval('window.__intro=0;_playBattleStartIntro=async()=>{window.__intro++;return new Promise(()=>{})};G._villageIntroPlaying=false;_startWaveFlowNext();');
    await b.waitFor('window.__intro>0||window.__alerts.length>0',20000);
    const first=await b.eval('return loadRun()');
    ok('開幕より先に戦闘全体を保存',first.checkpoint?.type==='battle'&&!!first.pendingBattle.finalState&&first.pendingBattle.events.at(-1).type==='battle_end');
    console.log('保存サイズ '+JSON.stringify(first).length+' bytes / '+first.pendingBattle.frames.length+' frames');
    const deterministic=await b.eval('const p=loadRun().pendingBattle;const q=SaveRun.computeBattle(p.setup,p.seed);return {same:JSON.stringify(p.events)===JSON.stringify(q.events)&&JSON.stringify(p.finalState)===JSON.stringify(q.finalState),p:{events:p.events,final:p.finalState},q:{events:q.events,final:q.finalState}}');
    if(!deterministic.same) console.log('差分',JSON.stringify(deterministic));
    ok('同じseedでイベント・攻撃対象・最終結果が一致',deterministic.same);
    await load();
    ok('再起動でコンティニュー有効',await b.eval('SaveRun.refreshContinue();return !document.getElementById("title-continue-btn").disabled'));
    await b.eval('window.__savedBattleBeforeNewRun=loadRun();void SaveRun.continueRun();');
    await b.waitFor('document.body.classList.contains("run-resume-active")',5000);
    await b.eval('startGame(false);');
    await new Promise(r=>setTimeout(r,4300));
    ok('ゲームスタートは古い再開UIとタイマーを破棄',await b.eval('return !document.body.classList.contains("run-resume-active")&&loadRun()?.checkpoint?.type==="town"&&G._wave===0&&G._waveStage===1'));
    await b.eval('SaveRun.saveRun(window.__savedBattleBeforeNewRun);');
    await load();
    // コア再計算が呼ばれたら失敗。実際のVFX・攻撃・結果画面を通す。
    await b.eval('window.__originalCore=runBattleCore;runBattleCore=()=>{throw new Error("ロード後に再計算しました")};window.__resumeStartedAt=performance.now();window.__resumeIntro=0;window.__resumeIntroAt=0;const intro=_playBattleStartIntro;_playBattleStartIntro=async(...args)=>{window.__resumeIntro++;window.__resumeIntroAt=performance.now();return intro(...args)};window.__replayed=[];const flush=_flushCorePveHitEvents;_flushCorePveHitEvents=async(s,ev,before)=>{window.__replayed.push(...ev);return flush(s,ev,before)};void SaveRun.continueRun();');
    await b.waitFor('document.body.classList.contains("run-resume-active")',5000);
    const resumeUi=await b.eval('window.__resumeRng=G._runRngState;const nodes=[...document.querySelectorAll("#run-resume-journey-ui .journey-node")];return {black:getComputedStyle(document.getElementById("run-resume-overlay")).backgroundColor,current:nodes.findIndex(n=>n.classList.contains("run-resume-current")),expected:loadRun().checkpoint.stage-1,options:getComputedStyle(document.getElementById("battle-options-btn")).display,intro:window.__resumeIntro}');
    ok('戦闘だけ黒背景の再開UIを表示',resumeUi.black==='rgb(0, 0, 0)'&&resumeUi.options==='none');
    ok('再開対象の戦闘マスだけを強調',resumeUi.current===resumeUi.expected&&resumeUi.current>=0);
    await new Promise(r=>setTimeout(r,3000));
    ok('4秒前には戦闘も乱数消費も始めない',await b.eval('return window.__resumeIntro===0&&G._runRngState===window.__resumeRng&&document.body.classList.contains("run-resume-active")'));
    await b.waitFor('G._battleProceedAction||G.phase==="gameover"||window.__alerts.length>0',90000);
    const played=await b.eval('return {events:window.__replayed,phase:G.phase,gold:G.gold,life:G._waveLife,alerts:window.__alerts,pending:loadRun()?.pendingBattle,profile:SaveProfile.load(),proceed:!!G._battleProceedAction,won:G._battleVictoryPending,intro:window.__resumeIntro,delay:window.__resumeIntroAt-window.__resumeStartedAt}');
    ok('ロードで保存済み戦闘を冒頭から実再生',played.events[0]?.type==='battle_start'&&played.alerts.length===0);
    ok('4秒後に戦闘を一度だけ開始',played.intro===1&&played.delay>=3900);
    ok('再生後もseed・イベント・結果が不変',JSON.stringify(played.pending)===JSON.stringify(first.pendingBattle));
    console.log('再生結果',JSON.stringify({phase:played.phase,gold:played.gold,life:played.life,outcome:first.pendingBattle.outcome}));
    if(first.pendingBattle.outcome!=='p2') ok('終戦効果を含めた所持金が保存結果と一致',played.gold===first.pendingBattle.finalState.resources.p1.gold);
    const enemyIds=first.pendingBattle.setup.units.p2.filter(Boolean).map(x=>x._artCode||x.no||x.artCode);
    ok('敵専用カードを発見・未取得で記録',enemyIds.some(id=>played.profile.cards[id]?.seen&&!played.profile.cards[id]?.acquired));
    // 同じ保存からもう一度最後まで再生して、資源と結果も比較する。
    await load();
    await b.eval('window.__originalCore=runBattleCore;runBattleCore=()=>{throw new Error("再計算は禁止")};void SaveRun.continueRun();');
    await b.waitFor('G._battleProceedAction||G.phase==="gameover"||window.__alerts.length>0',90000);
    const replayed=await b.eval('return {gold:G.gold,life:G._waveLife,alerts:window.__alerts}');
    ok('戦闘途中終了→再起動でも所持金とライフが一致',played.gold===replayed.gold&&played.life===replayed.life&&replayed.alerts.length===0);
    await b.eval('continueAfterBattleVictory(true);');
    await b.waitFor('G.phase==="reward"&&!G._battleProceedAction',15000);
    await b.eval('runBattleCore=window.__originalCore;_playBattleStartIntro=async()=>new Promise(()=>{});chooseMoveInline("battle");');
    await b.waitFor('loadRun()?.checkpoint?.type==="battle"&&loadRun()?.pendingBattle?.seed!=='+first.pendingBattle.seed,20000);
    ok('次戦開始でrun saveを更新',await b.eval('return loadRun()?.checkpoint?.type==="battle"'));
    console.log('ブラウザエラー',await errors());
  }catch(e){console.error('ブラウザ詳細',await errors());throw e;}
  finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
