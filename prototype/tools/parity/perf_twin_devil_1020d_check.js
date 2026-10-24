'use strict';
// 自前サーバーの例: python3 -m http.server 5527 --bind 127.0.0.1
// 初回: VB_URL=http://127.0.0.1:5527/index.html VB_PERF_OUT=/tmp/vb-before.json node tools/parity/perf_twin_devil_1020d_check.js
// 比較: VB_URL=http://127.0.0.1:5527/index.html VB_PERF_BASELINE=/tmp/vb-before.json VB_PERF_OUT=/tmp/vb-after.json node tools/parity/perf_twin_devil_1020d_check.js
// VB_PERF_PROFILE=/tmp/vb.cpuprofile でChromeのCPUプロファイルも保存する。
// 初回でも閾値超過は終了コード1。失敗時も計測JSONは保存する。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {launch} = require('./headless');
const ROOT = path.resolve(__dirname, '../..');
const SEED = 0x1020d;
const VIEWPORT = {width:1860, height:1180, deviceScaleFactor:1, mobile:false};
// ヘッドレス（ソフトウェア描画）での目安。2026-10-20 の修正前は p95 267ms・最大1100ms（body:has() による全体の再計算）、
// 修正後は p95 67ms・最大367ms。修正前へ戻ったら落ちる線にしている。
const LIMITS = {frameP95Ms:100, frameMaxMs:600, longTaskTotalMs:1000, longTaskMaxMs:450};

// 位置と接続方向は報告に無いため、全強化6枚が3体すべてへ届く合法な接続を固定する。
// 根性・復活・結界1は、報告の「既に所持している状態」を初期条件として与える。
// 本文、強化後の本文、能力値、指輪は本物の内蔵シートと共通編成関数から作る。
function createFixture() {
  const copy = value => JSON.parse(JSON.stringify(value));
  const pick = name => {
    const def = PANEL_POOL.find(card => card.name === name);
    if (!def || !def._sheetDescLoaded) throw new Error('シートのカードが無い: ' + name);
    return copy(def);
  };
  const boardCards = Array(MAIN_BOARD_SIZE).fill(null);
  const placements = [
    [1,'ツインデビル',['down','left'],true], [3,'ツインデビル',['down','left']],
    [12,'スプリガン',['up','left']], [5,'野生の力',['right','down','up']],
    [6,'野生の力',['left','right','up']], [7,'活性化',['left','right','down']],
    [8,'活性化',['left','right','up']], [9,'マナの生成',['left','down','up']],
    [10,'恩寵',['up','right']],
  ];
  for (const [at,name,directions,enhanced] of placements) {
    let card = pick(name);
    if (enhanced) card = enhancedPanelCopy(card);
    if (!card) throw new Error('強化後のカードを作れない: ' + name);
    if (directions.length !== Number(card.directionCount)) throw new Error('接続方向の数が不正: ' + name);
    boardCards[at] = {...card, id:'perf-panel-' + at, directions};
  }
  G.mapPanelPowers = {};
  const formation = buildBoardFormation({boardCards}, {stageNumber:2, levels:{atk:1,hp:1}});
  if (formation.entries.length !== 3 || formation.entries.some(e => e.contributingPanels.length !== 6)) {
    throw new Error('3体すべてへ強化6枚を接続できていない');
  }
  const allies = Array(MAX_ALLIES).fill(null);
  formation.entries.forEach(entry => {
    const u = entry.unit;
    u.id = 'perf-ally-' + entry.slotIdx;
    u.keywords = [...(u.keywords || []),'根性','復活']; u.shield = 1;
    u.boardCards = _panelSummonDisplayBoardCards(entry.panel, entry.contributingPanels);
    allies[entry.assignedSlot] = u;
  });
  // 敵の報告が無いため通常敵を固定。深層の最大値を共通式で求め、シート外のHPを作らない。
  const floor = Math.max(...Object.keys(FLOOR_DATA).map(Number).filter(Number.isFinite));
  const def = ENEMY_POOL.find(e => e.no === 'EN068' && !e.bossOnly && _enemySpawnAllowed(e));
  if (!def) throw new Error('検査用の通常敵EN068が無い');
  const ranges = enemyStatRanges(def, floor);
  const enemies = Array.from({length:4}, (_,i) => {
    const u = _mkEnemy(ranges.atkMax, ranges.hpMax, def.name, def.icon, def.grade, _kwShield(def), copy(def.keywords || []), def.race);
    _applyEnemyDefAbilities(u, def);
    return {...u, id:'perf-enemy-' + i, lane:i === 3 ? 'rear' : 'front'};
  });
  const rings = ['嵐の指輪','黄の瞳の指輪'].map(name => {
    const ring = RING_POOL.find(r => r.name === name);
    if (!ring) throw new Error('シートの指輪が無い: ' + name);
    return copy(ring);
  });
  return {allies, enemies, rings, boardCards, enemyFloor:floor};
}

// 同期rAFコールバックの実行時間を、同じフレームの時刻ごとに合計する。
// 予約時刻との差（待ち時間）と、コールバック自身の処理時間を混同しない。
function installMeasurement() {
  const nativeRaf = window.requestAnimationFrame.bind(window);
  const m = window.__twinPerf = {running:false, phase:'準備', frames:[], callbacks:[], reads:{rect:0,style:0},
    renders:{}, jobsMax:0, domMax:0, fxDomMax:0, stateJobsMax:0, maxMana:0, samples:[], longTasks:[]};
  window.requestAnimationFrame = callback => nativeRaf(time => {
    if (!m.running) return callback(time);
    const start = performance.now();
    try { return callback(time); }
    finally { m.callbacks.push({time, ms:performance.now()-start, name:callback.name || '無名', phase:m.phase}); }
  });
  const rect = Element.prototype.getBoundingClientRect, style = window.getComputedStyle;
  Element.prototype.getBoundingClientRect = function(...args) { if (m.running) m.reads.rect++; return rect.apply(this,args); };
  window.getComputedStyle = function(...args) { if (m.running) m.reads.style++; return style.apply(this,args); };
  for (const name of ['renderAll','renderField','updateUnitDamageUi','refreshUnitPreviewUi']) {
    const fn = window[name];
    if (typeof fn === 'function') window[name] = function(...args) {
      if (m.running) m.renders[name] = (m.renders[name] || 0) + 1;
      return fn.apply(this,args);
    };
  }
  if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) throw new Error('Long Tasks APIが使えない');
  const observer = new PerformanceObserver(list => m.longTasks.push(...list.getEntries().map(e => ({start:e.startTime, ms:e.duration}))));
  observer.observe({type:'longtask', buffered:true});
  let lastTime = null, lastSample = -Infinity;
  function perfSample(time) {
    if (!m.running) return;
    if (lastTime != null) m.frames.push({time, ms:time-lastTime, phase:m.phase});
    lastTime = time;
    m.maxMana = Math.max(m.maxMana,Number(G.mana)||0);
    m.jobsMax = Math.max(m.jobsMax,VbFx.activeCount());
    if (time-lastSample >= 500) {
      lastSample = time;
      const jobs = VbFx.snapshot(), names = {};
      jobs.forEach(j => { names[j.name] = (names[j.name] || 0) + 1; });
      const states = jobs.filter(j => j.name.endsWith('-state')).length;
      const dom = document.querySelectorAll('*').length;
      const fxDom = document.querySelectorAll('[data-vb-fx-layer], [data-vb-fx-layer] *, [data-vb-fx-local], [data-battle-lab-fx]').length;
      m.stateJobsMax = Math.max(m.stateJobsMax,states); m.domMax = Math.max(m.domMax,dom); m.fxDomMax = Math.max(m.fxDomMax,fxDom);
      m.samples.push({at:time-m.started, phase:m.phase, jobs:names, dom, fxDom, mana:G.mana || 0});
    }
    nativeRaf(perfSample);
  }
  m.begin = () => { m.started = performance.now(); m.running = true; nativeRaf(perfSample); };
  m.end = () => { m.ended = performance.now(); m.running = false; m.longTasks.push(...observer.takeRecords().map(e => ({start:e.startTime, ms:e.duration}))); observer.disconnect(); };
}

function stats(values) {
  const sorted = values.slice().sort((a,b) => a-b);
  return {count:sorted.length, totalMs:values.reduce((a,b) => a+b,0),
    p95Ms:sorted.length ? sorted[Math.ceil(sorted.length*.95)-1] : 0, maxMs:sorted.at(-1) || 0};
}
function profileHotspots(profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id,node])), parents = new Map(), times = new Map();
  profile.nodes.forEach(node => (node.children||[]).forEach(id=>parents.set(id,node.id)));
  (profile.samples || []).forEach((id,i) => {
    const ms = (profile.timeDeltas[i] || 0)/1000, seen = new Set();
    let current = id;
    while (current != null) {
      const fn = nodes.get(current).callFrame, key = JSON.stringify(fn);
      if (!seen.has(key)) {
        seen.add(key);
        if (!times.has(key)) times.set(key,{function:fn.functionName || '無名',
          file:fn.url.replace(/^.*\/(js\/)/,'$1'),line:fn.lineNumber+1,selfMs:0,totalMs:0});
        const entry = times.get(key); entry.totalMs+=ms; if (current===id) entry.selfMs+=ms;
      }
      current = parents.get(current);
    }
  });
  return [...times.values()].filter(e=>!['(idle)','(root)','(program)'].includes(e.function))
    .sort((a,b)=>b.selfMs-a.selfMs).slice(0,20);
}

async function main() {
  const url = process.env.VB_URL;
  if (!url) throw new Error('このworktreeの自前ポートをVB_URLで指定してください');
  const baseline = process.env.VB_PERF_BASELINE ? JSON.parse(fs.readFileSync(process.env.VB_PERF_BASELINE,'utf8')) : null;
  if (baseline && (!(baseline.frameInterval?.p95Ms>0) || !(baseline.frameInterval?.count>=30)))
    throw new Error('比較元に有効なフレーム計測が無い');
  const b = await launch({width:VIEWPORT.width,height:VIEWPORT.height});
  try {
    await b.call('Network.enable');
    // file://と同じ内蔵CSVを必ず使う。xlsxの有無による比較データの混在を防ぐ。
    await b.call('Page.addScriptToEvaluateOnNewDocument', {source:`
      window.__twinNativeFetch=window.fetch;
      window.fetch=function(input,...rest){
        const url=new URL(typeof input==='string'?input:input.url,document.baseURI);
        if(decodeURIComponent(url.pathname).split('/').pop().startsWith('Vesselbound_data') && url.pathname.endsWith('.xlsx'))
          return Promise.reject(new Error('性能計測では内蔵CSVを使用する'));
        return window.__twinNativeFetch.call(this,input,...rest);
      };
    `});
    await b.call('Emulation.setDeviceMetricsOverride',VIEWPORT);
    await b.goto(url,1800);
    await b.waitFor("typeof PANEL_POOL!=='undefined' && PANEL_POOL.some(c=>c.no==='C099' && c._sheetDescLoaded) && typeof VbFx!=='undefined'");
    await b.eval(`
      _forceStopAllVfx(); presentResetPlayback(); initState(); initializeBattlePresentationState();
      Object.assign(G,{phase:'battle',life:5,_waveLife:5,gold:0,mana:0,_enemyMana:0,_wave:2,_waveStage:1,
        _mapBattle:{type:'normal'},_coreDrivenBattle:true,_battleRunId:1,_battleCoreSeed:${SEED},
        _battleCounters:{damage:0,deaths:0},battleCounters:{damage:0,deaths:0},_battleCoreEvents:[],activeBattleItems:[]});
      window.fetch=window.__twinNativeFetch; delete window.__twinNativeFetch;
      window.VB_OPTION_SPEED='normal';
      coreMathRng.seed(${SEED});
      window.__twinFixture = (${createFixture.toString()})();
      Object.assign(G,{allies:__twinFixture.allies,enemies:__twinFixture.enemies,rings:__twinFixture.rings});
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      document.getElementById('scr-battle').classList.add('active'); document.body.className='';
      setScreenAssetBackground('battle','stage1'); renderAll(); unlockSfx();
      await document.fonts.ready;
      await new Promise(r=>setTimeout(r,1200));
      (${installMeasurement.toString()})();
    `);
    const fingerprint = await b.eval(`return JSON.stringify({seed:${SEED},viewport:${JSON.stringify(VIEWPORT)},
      fixture:__twinFixture,data:VESSELBOUND_LOCAL_XLSX_CSV});`);
    const coreHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'js/battle/core.js'))).digest('hex');
    const signature = crypto.createHash('sha256').update(fingerprint+coreHash).digest('hex');
    if (baseline && baseline.signature !== signature) throw new Error('比較元と盤面・データ・コア・画面条件が一致しない');
    await b.call('Performance.enable');
    const before = await b.call('Performance.getMetrics');
    await b.call('Profiler.enable');
    await b.call('Profiler.setSamplingInterval', {interval:1000});
    await b.call('Profiler.start');
    // VB_PERF_TRACE=ファイル：スタイル再計算の原因（無効化の記録）をトレースで保存する（調査用）。
    if (process.env.VB_PERF_TRACE) await b.call('Tracing.start', { transferMode: 'ReportEvents',
      traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.invalidationTracking', 'blink.debug'] } });
    // 通常PvEと同じ開戦処理とbattlePhase。VFX・render・待ち時間を置き換えない。
    await b.eval(`
      __twinPerf.begin(); __twinPerf.phase='開戦';
      window.__twinPlayback = (async()=>{
        try {
          await _finishNewPanelBattleStartEffects();
          __twinPerf.phase='戦闘'; G._battlePhaseRunning=true; await battlePhase();
          __twinPerf.phase='終了'; await new Promise(r=>setTimeout(r,1200));
        } catch(error) { __twinPerf.error=String(error.stack||error); }
        finally { G._battlePhaseRunning=false; __twinPerf.end(); }
      })();
      return true;
    `);
    let timeoutError = '';
    try { await b.waitFor('!!__twinPerf.ended',180000,500); }
    catch (error) {
      timeoutError = '戦闘再生が時間内に完了しない: '+String(error.message||error);
      await b.eval('__twinPerf.end();');
    }
    const {profile} = await b.call('Profiler.stop');
    if (process.env.VB_PERF_TRACE) {
      const start = b.events.length;
      await b.call('Tracing.end');
      for (let i = 0; i < 200 && !b.events.slice(start).some(e => e.method === 'Tracing.tracingComplete'); i++) await new Promise(r => setTimeout(r, 250));
      const trace = b.events.filter(e => e.method === 'Tracing.dataCollected').flatMap(e => e.params.value);
      fs.writeFileSync(process.env.VB_PERF_TRACE, JSON.stringify(trace));
    }
    const after = await b.call('Performance.getMetrics');
    const raw = await b.eval(`
      const counts={};
      for(const ev of G._battleCoreEvents) {
        counts[ev.type]=(counts[ev.type]||0)+1;
      }
      return {...__twinPerf,begin:undefined,end:undefined,events:counts,
        manaReached:__twinPerf.samples.some(s=>s.mana>=20),hidden:document.hidden,
        fixture:{cards:__twinFixture.boardCards.map(c=>c&&({name:c._displayName||c.name,directions:c.directions})),
          enemyFloor:__twinFixture.enemyFloor,enemies:__twinFixture.enemies.filter(Boolean).map(u=>({name:u.name,atk:u.baseAtk,maxHp:u.maxHp})),
          rings:__twinFixture.rings.map(r=>r.name)}};
    `);
    const perFrame = new Map(), perFunction = {};
    raw.callbacks.forEach(c => {
      perFrame.set(c.time,(perFrame.get(c.time)||0)+c.ms);
      const f = perFunction[c.name] || (perFunction[c.name] = {calls:0,totalMs:0,maxMs:0});
      f.calls++; f.totalMs+=c.ms; f.maxMs=Math.max(f.maxMs,c.ms);
    });
    const metrics = Object.fromEntries(after.metrics.map(m => [m.name,m.value]));
    before.metrics.forEach(m => { if (m.name in metrics) metrics[m.name]-=m.value; });
    const report = {signature, coreHash, url, seed:SEED, viewport:VIEWPORT, limits:LIMITS,
      durationMs:raw.ended-raw.started, frameInterval:stats(raw.frames.map(f=>f.ms)),
      rafWork:stats([...perFrame.values()]), rafFunctions:perFunction,
      phases:Object.fromEntries(['開戦','戦闘','終了'].map(phase => [phase,stats(raw.frames.filter(f=>f.phase===phase).map(f=>f.ms))])),
      // begin()と同じタスク内で行う開戦計算も含め、計測区間との重なりを数える。
      longTasks:stats(raw.longTasks.filter(t=>t.start+t.ms>raw.started&&t.start<raw.ended)
        .map(t=>Math.min(t.start+t.ms,raw.ended)-Math.max(t.start,raw.started))),
      hotspots:profileHotspots(profile), metrics, reads:raw.reads, renders:raw.renders,
      jobsMax:raw.jobsMax, stateJobsMax:raw.stateJobsMax, domMax:raw.domMax, fxDomMax:raw.fxDomMax,
      events:raw.events, maxMana:raw.maxMana, fixture:raw.fixture, samples:raw.samples,
      errors:[...(timeoutError?[timeoutError]:[]),...(raw.error?[raw.error]:[]),...b.consoleErrors(),...b.events.filter(e=>e.method==='Runtime.exceptionThrown')
        .map(e=>e.params.exceptionDetails.exception?.description||e.params.exceptionDetails.text)],
      comparison:baseline?{baselineP95Ms:baseline.frameInterval.p95Ms,ratio:stats(raw.frames.map(f=>f.ms)).p95Ms/baseline.frameInterval.p95Ms}:null};
    const failures = [];
    if (raw.hidden || raw.frames.length<30) failures.push('可視状態で十分なフレームを再生できていない');
    if (!raw.manaReached || report.maxMana<20 || !(raw.events.stat_change>0) || !(raw.events.mana_threshold>0) || !(raw.events.summon>0)) failures.push('コピー召喚・マナ20以上・能力変化の再現条件が不足');
    if (!raw.samples.some(s=>['shield-state','guts-state','revive-state'].every(name=>s.jobs[name]>=2)))
      failures.push('複数の体の結界・根性・復活が同時に動いていない');
    if (report.frameInterval.p95Ms>LIMITS.frameP95Ms) failures.push('フレーム間隔p95が閾値超過');
    if (report.frameInterval.maxMs>LIMITS.frameMaxMs) failures.push('フレーム間隔の最大が閾値超過');
    if (report.longTasks.totalMs>LIMITS.longTaskTotalMs || report.longTasks.maxMs>LIMITS.longTaskMaxMs) failures.push('Long Taskが閾値超過');
    if (baseline && report.comparison.ratio>.5) failures.push('フレーム間隔p95が修正前の半分を超える');
    failures.push(...report.errors);
    report.failures = failures;
    if (process.env.VB_PERF_OUT) fs.writeFileSync(process.env.VB_PERF_OUT,JSON.stringify(report,null,2)+'\n');
    if (process.env.VB_PERF_PROFILE) fs.writeFileSync(process.env.VB_PERF_PROFILE,JSON.stringify(profile));
    console.table({
      'Long Task':{合計ms:report.longTasks.totalMs,最大ms:report.longTasks.maxMs},
      'フレーム間隔':{p95ms:report.frameInterval.p95Ms,最大ms:report.frameInterval.maxMs},
      '1フレームのrAF処理':{p95ms:report.rafWork.p95Ms,最大ms:report.rafWork.maxMs},
    });
    console.log(JSON.stringify(report,null,2));
    console.log((failures.length?'NG ':'OK ')+'ツインデビル盤面の再生・性能検査 '+(failures.length?failures.join(' / '):''));
    if (failures.length) process.exitCode = 1;
  } finally { await b.close(); }
}

module.exports = {createFixture, installMeasurement, stats, profileHotspots};
if (require.main === module) main().catch(error => { console.error(error.stack||error); process.exitCode=1; });
