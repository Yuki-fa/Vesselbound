'use strict';
// 1027改訂のルール・差分一致は effects_1027_regression.js が開始時mainと検証する。
const {REVISED: revised1027} = require('./effects_1027_regression');

// xlsx・内蔵CSVは更新しない。C004のコピーの本文だけを差し替えて本番の入口を検査する。
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sheet = require('./sheet_data');
// 1026に本文との不一致を直した効果は専用の新しい回帰検査で検証する。
const revised1026 = new Set('E011 E020 E022 E047 E055 E060 E062'.split(' '));
require('./load');
const copy = value => JSON.parse(JSON.stringify(value));
const TEXT = '4マナ：このゲーム中に倒したことがあるランダムな敵を、このキャラクターと同じATKとHPにして召喚する。';
// 作業開始時のmain。mainが進んでも同じ基準をgit showで読む。
const BASELINE = '303df78b04eb31768f9b4ee9f2d8c0f3ba107209';
let passed = 0, failed = 0;
async function check(label, fn) {
  try { await fn(); passed++; console.log('OK ' + label); }
  catch (error) { failed++; console.error('NG ' + label + '\n' + error.stack); }
}
function plain(id, extra = {}) {
  return { id, name: id, atk: 3, hp: 60, maxHp: 60, color: '青', race: '魔獣', keywords: [], desc: '', effectData: {}, ...extra };
}
function echidna(extra = {}, text = TEXT) {
  const definition = PANEL_POOL.find(card => card.no === 'C004');
  assert.ok(definition && sheet.sheetRows('card').some(row => row['No.'] === 'C004'));
  const card = { ...copy(definition), desc: text };
  return { ..._makePanelSummonUnit(_panelSummonSpec(card), []), id: 'echidna', atk: 11, hp: 17, maxHp: 45, effectData: {}, ...extra };
}
const history = (p1 = [], p2 = []) => coreDefeatedEnemyFields({ p1, p2 }).defeatedEnemies;
function harness(side = 'p1', options = {}) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const { own = [echidna()], foes = [plain('foe')], ...extra } = options;
  const state = createBattleState({ sides: { [side]: { units: own }, [other]: { units: foes } }, summonDefs: [...PANEL_POOL, ...ENEMY_POOL], ...extra });
  const events = [], rng = createSeededRng(1026), emit = event => events.push(event);
  const hit = (s, t, n, c, ss, st, o) => coreResolveHit(state, s, t, n, c, rng, emit, { skipSourceEffects: ss, skipTough: st, ...o });
  return { state, events, rng, emit, hit, side, other, source: state.units[side][0] };
}
function fire(h, mana = 4) {
  h.state.resources[h.side].mana = mana;
  coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit);
}
const summons = events => events.filter(e => e.type === 'summon');
function defeat(h, target) { h.hit(h.source, target, 10000, false, true); }
function initRun(defeatedEnemies = history()) {
  initState();
  G._runId = 'echidna-1026'; G._runSeed = 1026; G._runRngState = 1026;
  G._wave = 1; G._waveStage = 1; G.floor = 1; G._waveLife = 3;
  G.defeatedEnemies = copy(defeatedEnemies);
}
function pveInitial(defeatedEnemies) {
  initRun(defeatedEnemies);
  // 最初の敵を倒す→攻撃マナが4になる→同じ戦闘で倒した敵も抽選できる。
  G.allies = [createCoreUnit(echidna({ manaOnAttack: 2, atk: 15, hp: 90, maxHp: 90 }), 'p1', 0)];
  G.enemies = [createCoreUnit(plain('current', { hp: 2, maxHp: 2, atk: 1 }), 'p2', 0),
    createCoreUnit(plain('wall', { hp: 70, maxHp: 70, atk: 1, lane: 'rear' }), 'p2', 1)];
  G.mana = 0; G.activeBattleItems = [];
  const state = _createPveCoreState(); _stampCoreSideSlots(state);
  return SaveRun.copy(state);
}
function runPve(initial, seed) {
  const state = copy(initial), events = [];
  coreInitializeBattleState(state);
  const runner = createBattleRunner(state, createSeededRng(seed), e => events.push(SaveRun.copy(e)));
  while (!runner.result && state.turn < BATTLE_CORE_TURN_LIMIT) { runner.step({ deferCompact: true }); runner.compact(); }
  const result = runner.finish();
  return { state, events, result };
}
// PvE保存でだけ付く撃破報酬と、未指定順位のNaNを保存する既存規則を揃えて比較する。
function coreEvents(events) { return events.map(event => { const { pveRewardGold, ...rest } = event; return SaveRun.copy(rest); }); }

(async () => {
  console.table = () => {}; await loadGameData();
  const definition = plain('old', { name: '既撃破', no: 'EN_TEST', art: 'test.jpg', keywords: ['結界1'], desc: '攻撃：1マナを得る。', manaOnAttack: 1 });
  for (const side of ['p1', 'p2']) {
    await check(`${side}: 候補なしは召喚・乱数消費なし、閾値は発動済み`, () => {
      const h = harness(side), next = createSeededRng(1026).next();
      fire(h); assert.equal(summons(h.events).length, 0); assert.equal(h.rng.next(), next);
      assert.equal(h.events.filter(e => e.type === 'mana_threshold').length, 1);
      h.state.defeatedEnemies[side] = history([definition]).p1;
      fire(h, 100); assert.equal(summons(h.events).length, 0);
    });
    await check(`${side}: 定義・敵枠・現在ATK/HP/最大HP、前衛右端、眷属・召喚時効果`, () => {
      const h = harness(side, { own: [echidna(), plain('rear', { lane: 'rear' })], defeatedEnemies: history(side === 'p1' ? [definition] : [], side === 'p2' ? [definition] : []) });
      fire(h); const event = summons(h.events)[0], child = h.state.units[side].find(u => u.id === event.unit.id);
      assert.equal(summons(h.events).length, 1);
      for (const key of ['name', 'no', 'art', 'desc', 'color', 'race']) assert.equal(child[key], definition[key], key);
      assert.deepEqual([child.atk, child.hp, child.maxHp], [11, 17, 17]);
      assert.equal(child._useEnemyVisualFrame, true); assert.equal(child.lane, 'front');
      assert.ok(child.keywords.includes('眷属') && coreUnitHasKeyword(child, '結界'));
      assert.equal(child.shield, 1); assert.equal(child.manaOnAttack, 1);
      assert.deepEqual(h.state.units[side].map(u => u.name), [h.source.name, definition.name, 'rear']);
    });
    await check(`${side}: 当戦闘・過去の戦闘・敵の召喚体、重複は1定義で抽選の重みも同じ`, () => {
      const h = harness(side, { foes: [plain('dead-a', { name: '同種', no: 'EN_A' }), plain('dead-b', { name: '同種', no: 'EN_A', atk: 9, hp: 99, maxHp: 99 }), plain('alive')],
        defeatedEnemies: history(side === 'p1' ? [definition] : [], side === 'p2' ? [definition] : []) });
      const a = h.state.units[h.other][0], b = h.state.units[h.other][1]; defeat(h, a); defeat(h, b);
      const child = coreSummonUnit(h.state, h.other, { name: '召喚された敵', no: 'CF_TEST', atk: 1, hp: 2 }, h.emit, 'alive', false, h.rng, h.hit);
      defeat(h, child);
      const candidates = h.state.defeatedEnemies[side];
      assert.deepEqual(candidates.map(d => d.name), ['既撃破', '同種', '召喚された敵']);
      assert.equal(h.state.defeatedEnemies[h.other].length, 0);
      assert.equal(candidates.filter(d => d.no === 'EN_A').length, 1);
      for (const d of candidates) for (const key of ['id', 'side', 'atk', 'hp', 'maxHp', '_lastDamageSource', 'goldRange', '_goldPlanned']) assert.equal(d[key], undefined, key);
      a.name = '変更'; a.keywords.push('即死'); assert.equal(candidates[1].name, '同種'); assert.ok(!candidates[1].keywords.includes('即死'));
      const picked = new Set();
      for (const value of [0.01, 0.34, 0.67]) {
        const sample = harness(side, { defeatedEnemies: h.state.defeatedEnemies });
        sample.rng.pick = list => list[Math.floor(value * list.length)]; fire(sample); picked.add(summons(sample.events)[0].unit.name);
      }
      assert.equal(picked.size, 3);
    });
    await check(`${side}: 逃走・奪取は撃破に数えず、復活した敵の死亡は記録する`, () => {
      const h = harness(side, { foes: [plain('flee'), plain('steal'), plain('revive', { keywords: ['復活'] })] });
      const [flee, steal, revive] = h.state.units[h.other];
      flee.atk = 0; coreSweepAtkZeroFlee(h.state, h.emit, [flee]);
      assert.ok(flee._fled); coreTriggerDeath(flee, h.state, h.emit, h.rng, h.hit);
      assert.equal(coreStealUnit(h.state, steal, side, h.emit, h.source.id, undefined, h.rng, h.hit), true);
      assert.ok(h.events.some(e => e.type === 'unit_stolen')); assert.equal(h.state.defeatedEnemies[side].length, 0);
      defeat(h, revive); assert.ok(revive.hp > 0); assert.deepEqual(h.state.defeatedEnemies[side].map(d => d.name), ['revive']);
      defeat(h, revive); assert.equal(h.state.defeatedEnemies[side].length, 1);
    });
    await check(`${side}: ボス・エリートは候補に入り、印・報酬額を召喚体に持ち込まない`, () => {
      for (const marker of ['ボス', 'エリート']) {
        const boss = plain('boss', { no: 'EN_BOSS', name: '強敵', boss: true, elite: true, keywords: [marker], goldRange: [500, 500], _goldPlanned: true });
        const h = harness(side, { foes: [boss, plain('alive')], summonDefs: [copy(boss)] });
        defeat(h, h.state.units[h.other][0]);
        assert.equal(h.state.defeatedEnemies[side].length, 1); fire(h);
        const child = summons(h.events)[0].unit;
        assert.equal(child.boss, false); assert.ok(!child.elite);
        assert.ok(!child.keywords.includes('ボス') && !child.keywords.includes('エリート'));
        assert.equal(child.goldRange, undefined); assert.equal(child._goldPlanned, undefined);
        assert.equal(_rollEnemyGold(child, createSeededRng(1)), 0);
      }
    });
    await check(`${side}: N体・N回・本文反復・マナ追加発動を共通の回数で読む`, () => {
      for (const [text, count] of [[TEXT, 1], [TEXT.replace('敵を', '敵2体を'), 2], [TEXT.replace('召喚する', '2体召喚する'), 2],
        [TEXT.replace('召喚する', '2回召喚する'), 2], [TEXT + 'これをもう一度繰り返す。', 2], [TEXT + 'これを2回繰り返す。', 3],
        [TEXT.replace('敵を', '敵2体を') + 'これをもう一度繰り返す。', 4]]) {
        const h = harness(side, { own: [echidna({}, text)], defeatedEnemies: history([definition], [definition]) });
        fire(h); assert.equal(summons(h.events).length, count, text);
      }
      const h = harness(side, { own: [echidna({ _effectRepeatBonus: 1, desc: TEXT + '\n常時：このキャラクターのマナ効果は1回追加で発動する。' })], defeatedEnemies: history([definition], [definition]), rings: { [side]: [{ name: '賢者の指輪' }] } });
      fire(h); assert.equal(summons(h.events).length, 3);
    });
    await check(`${side}: 前衛上限・陣営上限で召喚を拒否し、通常の召喚時修正を使う`, () => {
      for (const limit of [{ frontSlots: 1 }, { maxUnits: { [side]: 1 } }]) {
        const h = harness(side, { defeatedEnemies: history([definition], [definition]) }); Object.assign(h.state, limit);
        fire(h); assert.equal(summons(h.events).length, 0); assert.ok(h.events.some(e => e.type === 'summon_rejected'));
      }
      const h = harness(side, { defeatedEnemies: history([definition], [definition]), gameSummonBuff: { [side]: { atk: 2, hp: 3 } } });
      fire(h); const child = summons(h.events)[0].unit; assert.deepEqual([child.atk, child.hp, child.maxHp], [13, 20, 20]);
    });
    await check(`${side}: 召喚観測で本人が強化されても、本文反復は発動時点のATK/HPを使う`, () => {
      const h = harness(side, { own: [echidna({ _adjacentPanelEffectTexts: ['常時：味方の眷属が召喚されるたび、このキャラクターは+4/+4を得る。'] }, TEXT + 'これをもう一度繰り返す。')], defeatedEnemies: history([definition], [definition]) });
      fire(h); assert.ok(h.source.atk > 11);
      assert.deepEqual(summons(h.events).map(e => [e.unit.atk, e.unit.hp, e.unit.maxHp]), [[11, 17, 17], [11, 17, 17]]);
    });
  }
  await check('定義表から一時状態を除外し、同じ敵の階層・能力値・戦闘中付与の差を重複させない', () => {
    const def = plain('def', { name: '原型', no: 'EN_ORIGINAL', keywords: ['毒牙2'], desc: '攻撃：1マナを得る。', manaOnAttack: 1 });
    const h = harness('p1', { foes: [plain('one', { ...def, id: 'one', keywords: ['毒牙2', '弱体5'] }), plain('two', { ...def, id: 'two', atk: 30, hp: 800 })], summonDefs: [def] });
    h.state.units.p2[0].effectData.effectTexts = ['死亡：3ゴールドを得る。'];
    h.state.units.p2.forEach(u => defeat(h, u));
    assert.equal(h.state.defeatedEnemies.p1.length, 1); const d = h.state.defeatedEnemies.p1[0];
    assert.deepEqual(d.keywords, ['毒牙2']); assert.equal(d.desc, def.desc); assert.equal(d.effectData, undefined);
  });
  await check('強化済みの敵は強化後の定義、キーワードの解決順も保存・召喚で保つ', () => {
    const base = PANEL_POOL.find(card => card.category === 'キャラクター' && card.no !== 'C004' && card.mergedForm && card.mergedForm.desc && card.mergedForm.desc !== card.desc);
    const enhanced = enhancedPanelCopy(copy(base)); assert.ok(enhanced);
    const h = harness('p1', { foes: [{ ..._makePanelSummonUnit(_panelSummonSpec(enhanced), []), id: 'enhanced' }, plain('alive')] });
    defeat(h, h.state.units.p2[0]); assert.equal(h.state.defeatedEnemies.p1[0].desc, enhanced.desc);
    fire(h); assert.equal(summons(h.events)[0].unit.desc, enhanced.desc);
    const ordered = harness('p1', { defeatedEnemies: history([plain('ordered', { keywords: ['根性', '復活'] })]) });
    fire(ordered); const child = ordered.state.units.p1.find(u => u.id === summons(ordered.events)[0].unit.id);
    assert.deepEqual(child.keywords.filter(k => k !== '眷属'), ['根性', '復活']);
    ordered.hit(ordered.state.units.p2[0], child, 9999, false, true);
    assert.equal(child.hp, 1); assert.ok(ordered.events.some(e => e.type === 'revive' && e.reason === '根性'));
  });
  await check('PvEの通常計算・SaveRun.computeBattle・オンライン入口で候補・召喚・全イベントが一致', () => {
    for (const seed of [1, 1026, 251026]) {
      const initial = pveInitial(history([definition])), regular = runPve(initial, seed);
      const saved = SaveRun.computeBattle(copy(initial), seed);
      assert.ok(summons(regular.events).length > 0);
      assert.ok(regular.state.defeatedEnemies.p1.some(d => d.name === 'current'));
      assert.ok(regular.state.defeatedEnemies.p1.some(d => d.name === definition.name));
      assert.deepEqual(coreEvents(saved.events), regular.events);
      assert.deepEqual(saved.finalState.defeatedEnemies, regular.state.defeatedEnemies);
      for (const side of ['p1', 'p2']) assert.deepEqual(SaveRun.copy(saved.finalState.units[side].map(coreUnitSnapshot)), SaveRun.copy(regular.state.units[side].map(coreUnitSnapshot)));
      assert.deepEqual(SaveRun.computeBattle(copy(initial), seed), saved);
      assert.deepEqual(SaveRun.computeBattle(copy(saved.setup), seed), saved);
      assert.deepEqual(SaveRun.unpackBattleEvents(copy(SaveRun.packBattleEvents(saved))), saved);
      const online = simulateOnlineBattle({ seed, sides: { p1: { units: initial.units.p1 }, p2: { units: initial.units.p2 } },
        defeatedEnemies: initial.defeatedEnemies, summonDefs: initial.summonDefs, resources: initial.resources, stageNumber: initial.stageNumber, mapIndex: initial.mapIndex });
      assert.deepEqual(coreEvents(online.events), regular.events); assert.deepEqual(online.defeatedEnemies, regular.state.defeatedEnemies);
      assert.deepEqual(SaveRun.copy(summons(online.events)), summons(saved.events));
      // 次戦闘へ通常PvEの出口を通し、保存再生のsetupでも発動前の候補へ戻る。
      _syncCoreResourcesToG(regular.state); assert.deepEqual(G.defeatedEnemies, regular.state.defeatedEnemies);
      assert.deepEqual(_createPveCoreState().defeatedEnemies, G.defeatedEnemies);
      SaveRun.installSetup(saved); assert.deepEqual(G.defeatedEnemies, initial.defeatedEnemies);
      G._battleCoreEvents = []; G._savedBattleEnd = { pending: saved, applied: false };
      SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
      assert.deepEqual(G.defeatedEnemies, regular.state.defeatedEnemies);
    }
  });
  await check('ランの保存→読み込み・古い保存の既定値・新しいランでの初期化', () => {
    initRun(history([definition], [plain('other')]));
    const before = copy(G.defeatedEnemies), save = SaveRun.buildRunSave('reward');
    assert.deepEqual(SaveRun.serializeRunState().player.defeatedEnemies, before);
    G.defeatedEnemies = history(); SaveRun.restoreRunState(copy(save)); assert.deepEqual(G.defeatedEnemies, before);
    const h = harness('p1', { defeatedEnemies: G.defeatedEnemies }); fire(h); assert.equal(summons(h.events)[0].unit.name, definition.name);
    delete save.state.player.defeatedEnemies; SaveRun.restoreRunState(save); assert.deepEqual(G.defeatedEnemies, history());
    G.defeatedEnemies = before; initState(); assert.deepEqual(G.defeatedEnemies, history());
  });
  await check('実際の保存準備→ラン読み込み→保存フレーム再生で、候補を手番順に復元し終戦から次戦へ渡す', async () => {
    pveInitial(history([definition]));
    const pending = await SaveRun.prepareBattle();
    assert.deepEqual(pending.setup.defeatedEnemies, history([definition]));
    assert.ok(pending.frames.some(frame => !frame.state.defeatedEnemies), '未変更の一覧を毎手番へ重複保存しない');
    const save = SaveRun.buildRunSave('battle', pending);
    SaveRun.restoreRunState(copy(save)); SaveRun.installSetup(pending);
    const flush = _flushCorePveHitEvents, finish = finishBattleAsVictory, compact = requestBattleCompact;
    let frameIndex = 0, expected = pending.setup.defeatedEnemies;
    G._battleRunId = 1026; G._battleCoreEvents = [];
    _flushCorePveHitEvents = async state => {
      const frame = pending.frames[frameIndex++];
      if (frame.state.defeatedEnemies) expected = frame.state.defeatedEnemies;
      assert.deepEqual(state.defeatedEnemies, expected);
    };
    requestBattleCompact = () => {};
    finishBattleAsVictory = async () => SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
    try {
      await SaveRun.replay(pending, 1026);
      assert.equal(frameIndex, pending.frames.length - 1);
      assert.deepEqual(G.defeatedEnemies, pending.finalState.defeatedEnemies);
      assert.deepEqual(_createPveCoreState().defeatedEnemies, pending.finalState.defeatedEnemies);
    } finally { _flushCorePveHitEvents = flush; finishBattleAsVictory = finish; requestBattleCompact = compact; }
  });
  await check('オンラインのサーバーが参加者IDごとに保持し、対戦相手の交代・新規対戦を跨いで混ぜない', async () => {
    const oldPool = PANEL_POOL.slice(), originalSim = simulateOnlineBattle, now = Date.now;
    let time = 10000, input;
    const strong = echidna({ atk: 200, hp: 2000, maxHp: 2000, manaOnAttack: 4 });
    Date.now = () => time;
    simulateOnlineBattle = setup => { input = copy(setup); return originalSim(setup); };
    try {
      PANEL_POOL.splice(0, PANEL_POOL.length, { id: 'cpu-fixture', no: 'C900', category: 'キャラクター', name: '対戦用', power: 1, life: 3, color: '黄', race: '亜人', rarity: 1, keywords: [], desc: '' });
      let publicState = await OnlineServer.requestMatch({ seedSource: 'echidna-server', selfId: 'self', unlimitedTime: true });
      time += 10000; publicState = await OnlineServer.getState(publicState.matchId);
      const matchId = publicState.matchId, expected = new Map(), opponents = new Set();
      for (let round = 0; round < 8 && !publicState.finished; round++) {
        while (publicState.nodeType !== 'versus' && !publicState.finished) publicState = await OnlineServer.setReady(matchId);
        if (publicState.finished) break;
        const opponentId = publicState.nextOpponentId; opponents.add(opponentId);
        const own = round === 0 ? plain('weak', { hp: 1, maxHp: 1, atk: 1 }) : copy(strong);
        const battle = await OnlineServer.resolveVersusBattle(matchId, { units: [own], defeatedEnemies: history([plain('forged')], [plain('forged')]) });
        assert.deepEqual(input.defeatedEnemies.p1, expected.get('self') || []);
        assert.deepEqual(input.defeatedEnemies.p2, expected.get(opponentId) || []);
        assert.ok(!battle.defeatedEnemies.p1.some(d => d.name === 'forged'));
        if (round > 1) assert.ok(summons(battle.events).length > 0, '前の対戦で倒した体を召喚');
        expected.set('self', copy(battle.defeatedEnemies.p1)); expected.set(opponentId, copy(battle.defeatedEnemies.p2));
        battle.defeatedEnemies.p1.push(plain('client-mutation'));
        publicState = await OnlineServer.reportVersusPlaybackDone(matchId);
      }
      assert.ok(opponents.size > 1, '複数の対戦相手へ交代');
      assert.ok([...expected.values()].some(list => list.some(d => d.name === 'weak')), 'p2陣営の撃破も保持');
      let fresh = await OnlineServer.requestMatch({ seedSource: 'echidna-new-match', selfId: 'self', unlimitedTime: true });
      time += 10000; fresh = await OnlineServer.getState(fresh.matchId);
      while (fresh.nodeType !== 'versus') fresh = await OnlineServer.setReady(fresh.matchId);
      await OnlineServer.resolveVersusBattle(fresh.matchId, { units: [plain('new', { atk: 200, hp: 2000 })] });
      assert.deepEqual(input.defeatedEnemies, history());
    } finally { PANEL_POOL.splice(0, PANEL_POOL.length, ...oldPool); simulateOnlineBattle = originalSim; Date.now = now; }
  });
  await check('エキドナを含まない全カードの通常／強化本文が開始時mainと結果・全イベント・次の乱数まで完全一致', () => {
    const source = execFileSync('git', ['show', `${BASELINE}:prototype/js/battle/core.js`], { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', maxBuffer: 2e6 });
    const sandbox = { module: { exports: {} } }; vm.runInNewContext(source, sandbox); const baseline = sandbox.module.exports;
    const current = require('../../js/battle/core'); let compared = 0;
    const rows = [...sheet.sheetRows('card'), ...sheet.sheetRows('enchant')];
    for (const row of rows.filter(r => r['No.'] !== 'C004' && !revised1026.has(r['No.']) && !revised1027.has(r['No.']))) for (const enhanced of [false, true]) {
      const def = PANEL_POOL.find(c => c.no === row['No.']); if (!def) continue;
      const card = { ...copy(def), desc: (enhanced ? row['強化効果'] : '') || row['効果'] || '' };
      const own = def.category === 'キャラクター'
        ? { ..._makePanelSummonUnit(_panelSummonSpec(card), []), id: 'subject', atk: 10, hp: 70, maxHp: 70 }
        : plain('subject', { _adjacentPanelEffectTexts: [card.desc], boardCards: [card] });
      const input = { sides: { p1: { units: [own, plain('ally')] }, p2: { units: [plain('foe', { hp: 5, maxHp: 5 }), plain('foe2')] } },
        resources: { p1: { mana: 8, gold: 800 } }, summonDefs: PANEL_POOL };
      const run = api => { const state = api.createBattleState(copy(input)), events = [], rng = createSeededRng(261026);
        const result = api.runBattleCore(state, rng, { turnLimit: 6, onEvent: e => events.push(e) });
        return copy({ result, events, finalState: api.battleCoreFinalState(state), nextRandom: rng.next() }); };
      assert.deepEqual(run(current), run(baseline), `${row['No.']}/${enhanced}`); compared++;
    }
    assert.ok(compared > 350); console.log(`  ${compared}本文で完全一致（基準main ${BASELINE.slice(0, 7)}）`);
  });
  console.log(`エキドナ1026: OK ${passed} / NG ${failed}`); process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
