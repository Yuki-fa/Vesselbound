'use strict';
// 1027改訂のルール・差分一致は effects_1027_regression.js が開始時mainと検証する。
const {REVISED: revised1027} = require('./effects_1027_regression');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const sheet = require('./sheet_data');
require('./load');
const copy = value => JSON.parse(JSON.stringify(value));
const plain = (id, extra = {}) => ({ id, name: id, atk: 5, hp: 100, maxHp: 100, lane: 'front', color: '赤', race: '魔獣', keywords: [], desc: '', effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 }, ...extra });
function card(no, enhanced = false, text) {
  const row = sheet.sheetRows('enchant').find(r => r['No.'] === no);
  const def = PANEL_POOL.find(c => c.no === no);
  const base = def ? makePanel(def.id) || copy(def) : { no, name: row['名前'], category: 'エンチャント', keywords: [] };
  const result = enhanced ? enhancedPanelCopy(base) || base : base;
  result.desc = text ?? sheet.effectText(no, enhanced);
  return result;
}
function enchanted(no, enhanced, text, extra = {}) {
  const c = card(no, enhanced, text);
  return plain('source', { boardCards: [c], _adjacentPanelEffectTexts: [c.desc], _mainBoardSlot: 7, ...extra });
}
function harness(side = 'p1', own = [plain('source')], extra = {}) {
  const { foes = [plain('foe'), plain('foe2'), plain('foe3')], ...options } = extra;
  const other = side === 'p1' ? 'p2' : 'p1';
  const input = { sides: { [side]: { units: own }, [other]: { units: foes } }, summonDefs: [...PANEL_POOL, ...ENEMY_POOL],
    resources: { p1: { mana: 7, gold: 800 }, p2: { mana: 7, gold: 800 } }, blood: { p1: 5, p2: 5 }, ...options };
  const state = createBattleState(input); state.life = { p1: 3, p2: 3 }; state.maxLife = { p1: 3, p2: 3 };
  const initial = SaveRun.copy(state), events = [], rng = createSeededRng(1026);
  const emit = e => events.push(e);
  const hit = (s,t,n,c,ss,st,o) => coreResolveHit(state,s,t,n,c,rng,emit,{ skipSourceEffects:ss,skipTough:st,...o });
  return { state, initial, events, rng, emit, hit, side, other, u: state.units[side][0], own: state.units[side], foes: state.units[other] };
}
function initRun() {
  initState(); G._runId = 'rings-enchants-1026'; G._runSeed = 1026; G._runRngState = 1026;
  G._wave = 1; G._waveStage = 1; G.floor = 1; G._waveLife = 3; G.phase = 'reward';
}
const eventCopy = events => SaveRun.copy(events.map(({pveRewardGold,...event}) => event));
async function pipelines(initial) {
  const seed = 10261026, state = SaveRun.copy(initial), events = [], rng = createSeededRng(seed);
  coreInitializeBattleState(state);
  const runner = createBattleRunner(state, rng, event => events.push(SaveRun.copy(event)));
  while (!runner.result && state.turn < BATTLE_CORE_TURN_LIMIT) { runner.step({ deferCompact: true }); runner.compact(); }
  const result = runner.finish(), nextRandom = rng.next();
  const originalRng = createSeededRng; let capturedRng;
  createSeededRng = value => { const out = originalRng(value); if (value === seed) capturedRng = out; return out; };
  let saved;
  try { saved = SaveRun.computeBattle(SaveRun.copy(initial), seed); } finally { createSeededRng = originalRng; }
  assert.equal(capturedRng.next(), nextRandom, '保存計算後の次の乱数');
  assert.deepEqual(eventCopy(saved.events), eventCopy(events), 'PvE runner と保存計算の全イベント');
  assert.deepEqual(SaveRun.computeBattle(SaveRun.copy(saved.setup), seed), saved, '保存setupからの再計算');
  assert.deepEqual(SaveRun.unpackBattleEvents(SaveRun.copy(SaveRun.packBattleEvents(saved))), saved, '保存形式の往復');
  createSeededRng = value => { const out = originalRng(value); if (value === seed) capturedRng = out; return out; };
  let online;
  try { online = simulateOnlineBattle({ ...copy(initial), seed,
    sides: { p1: { units: initial.units.p1 }, p2: { units: initial.units.p2 } } }); } finally { createSeededRng = originalRng; }
  assert.equal(capturedRng.next(), nextRandom, 'オンライン計算後の次の乱数');
  assert.deepEqual(eventCopy(online.events), eventCopy(events), 'オンライン入口とPvEの全イベント');
  assert.equal(online.outcome, result.outcome);
  const stats = list => SaveRun.copy(list.map(u => coreUnitSnapshot({ ...u, boardCards: u.boardCards || [...initial.units.p1,...initial.units.p2].find(x => x.id === u.id)?.boardCards || [] })));
  for (const side of ['p1','p2']) assert.deepEqual(stats(saved.finalState.units[side]), stats(state.units[side]), '保存された最終状態');
  initRun(); const checkpoint = SaveRun.buildRunSave('battle', saved);
  SaveRun.restoreRunState(SaveRun.copy(checkpoint)); SaveRun.installSetup(saved); G._battleRunId = 1026; G._battleCoreEvents = [];
  const flush = _flushCorePveHitEvents, finish = finishBattleAsVictory, lose = onBattleEnd, compact = requestBattleCompact;
  let frame = 0;
  _flushCorePveHitEvents = async replayed => {
    const expected = saved.frames[frame++].state;
    for (const side of ['p1','p2']) assert.deepEqual(stats(replayed.units[side]), stats(expected.units[side].map(u => ({ ...u, boardCards: u.boardCards || initial.units[side].find(x => x.id === u.id)?.boardCards || [] }))), '保存フレームの実再生');
  };
  requestBattleCompact = () => {};
  finishBattleAsVictory = async () => SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
  onBattleEnd = async () => SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
  try { await SaveRun.replay(saved, 1026); assert.equal(frame, saved.frames.length - 1); }
  finally { _flushCorePveHitEvents = flush; finishBattleAsVictory = finish; onBattleEnd = lose; requestBattleCompact = compact; }
  return { saved, events, state, nextRandom };
}
// 作業開始時の main（エキドナ C004 は直前コミットの別改訂なので既存検査に任せる）。
const BASELINE = 'f9d991eca578c97a68e1d04aee449fa9cc0394e0';
const REVISED_ENCHANTS = new Set('E011 E015 E016 E019 E020 E022 E023 E024 E040 E042 E044 E047 E055 E056 E059 E060 E062 E063 E064 E069 E074'.split(' '));
function unchangedMain() {
  const source = execFileSync('git',['show',`${BASELINE}:prototype/js/battle/core.js`],{encoding:'utf8',maxBuffer:2e6});
  const sandbox = { module: { exports: {} } }; vm.runInNewContext(source,sandbox);
  const baseline = sandbox.module.exports, current = require('../../js/battle/core'); let compared = 0;
  const run = (api,input) => { const state = api.createBattleState(copy(input)), events = [], rng = createSeededRng(261026);
    const result = api.runBattleCore(state,rng,{ turnLimit:6,onEvent:e=>events.push(e) });
    return copy({result,events,finalState:api.battleCoreFinalState(state),nextRandom:rng.next()}); };
  for (const row of [...sheet.sheetRows('card'),...sheet.sheetRows('enchant')]) {
    // 1027：献身のATK付与と呪いの印はsheet_1027／本文監査で現行の効果を検査する。
    if (['C004','E065','E066','E076','E077'].includes(row['No.']) || REVISED_ENCHANTS.has(row['No.']) || revised1027.has(row['No.'])) continue;
    const def = PANEL_POOL.find(c=>c.no===row['No.']); if (!def) continue;
    for (const enhanced of [false,true]) {
      if (row['No.'] === 'C016' && enhanced) continue; // effects-1026c: 本文どおり2波へ改訂
      const c = {...copy(def),desc:(enhanced?row['強化効果']:'')||row['効果']||''};
      const own = def.category === 'キャラクター' ? {..._makePanelSummonUnit(_panelSummonSpec(c),[]),id:'source',atk:10,hp:70,maxHp:70}
        : plain('source',{_adjacentPanelEffectTexts:[c.desc],boardCards:[c]});
      const input={sides:{p1:{units:[own,plain('ally')]},p2:{units:[plain('foe',{hp:5,maxHp:5}),plain('foe2')]}},resources:{p1:{mana:8,gold:800}},summonDefs:PANEL_POOL};
      assert.deepEqual(run(current,input),run(baseline,input),`${row['No.']}/${enhanced}`); compared++;
    }
  }
  const excluded = new Set('R012 R014 R015 R019 R021 R022 R023 R024 R030 R031 R034 R035 R037'.split(' '));
  for (const ring of RING_POOL.filter(r=>!excluded.has(r.no)&&r.no!=='R017'&&r._implemented!==false)) {
    const input={sides:{p1:{units:[plain('source'),plain('ally')]},p2:{units:[plain('foe'),plain('foe2')]}},rings:{p1:[ring]},resources:{p1:{mana:15,gold:800}},summonDefs:PANEL_POOL};
    assert.deepEqual(run(current,input),run(baseline,input),ring.no); compared++;
  }
  assert.ok(compared>300); console.log(`  非対象 ${compared} ケース：main ${BASELINE.slice(0,7)} と結果・イベント・次の乱数が完全一致`);
}
module.exports={assert,sheet,copy,plain,card,enchanted,harness,initRun,pipelines,unchangedMain,REVISED_ENCHANTS};
