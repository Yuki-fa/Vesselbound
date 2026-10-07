'use strict';

// E075のカード単位の永久値、実際の編成・受け口・SaveRunとC043の本文参照。ブラウザは使わない。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
global.requestAnimationFrame = () => 0;
global.setInterval = () => 0;
let now = 0;
global.performance = { now: () => now += 1000 };
console.table = () => {};
for (const match of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, match[1]), 'utf8'), { filename: match[1] });
}
// DOM描画を省き、受け口・保存・説明生成の実装はそのまま実行する。
renderAll = renderField = renderControls = updateHUD = showScreen = () => {};
playSfx = playFileSfx = _warmBattleHitSfx = () => {};
playBattleOpeningSequence = async () => {};
_playBattleStartIntro = async () => 'normal';
const copy = value => JSON.parse(JSON.stringify(value));
let checked = 0;
async function check(name, fn) { await fn(); checked++; console.log('OK ' + name); }
const soul = () => makePanel(PANEL_POOL.find(card => String(card.no).toUpperCase() === 'E075').id);
const plain = (id, extra = {}) => ({ id, name: id, atk: 1, hp: 10000, maxHp: 10000, lane: 'front', keywords: [], desc: '', ...extra });
function resetBoard({ twoCharacters = false, twoCards = false, damage } = {}) {
  initState(); G._runId = 'permanent-damage-regression'; G._runSeed = 23; G._runRngState = 23;
  G._wave = 1; G._waveStage = 2; G._waveLife = 3; G.phase = 'reward'; _rewCards = []; _rewFreePickDone = false;
  G.mainBoard.fill(null);
  const character = makePanel(PANEL_POOL.find(card => card.name === 'ブラウニー').id);
  character.directions = ['left', 'right']; G.mainBoard[1] = character;
  if (twoCharacters) G.mainBoard[3] = copy(character);
  const card = soul(); card.directions = twoCharacters ? ['left', 'right'] : ['right'];
  if (damage != null) card._permanentEffectDamage = damage;
  G.mainBoard[twoCharacters ? 2 : 0] = card;
  if (twoCards) { const other = soul(); other.directions = ['left']; other._permanentEffectDamage = 4; G.mainBoard[2] = other; }
  G._partyBoardUnit = null;
  return buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(entry => {
    entry.unit.boardCards = _panelSummonDisplayBoardCards(entry.panel, entry.contributingPanels);
    return entry.unit;
  });
}
function isolate(units) {
  return units.map((unit, index) => ({ ...copy(unit), id: 'subject-' + index, name: '検査体', no: 'C999',
    desc: '', effect: '', effectText: '', atk: 1, hp: 10000, maxHp: 10000, keywords: [] }));
}
function harness(units, side = 'p1') {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = createBattleState({ sides: { [side]: { units: isolate(units) },
    [other]: { units: [plain('foe0'), plain('foe1'), plain('foe2')] } } });
  const rng = { next() { throw new Error('この効果で乱数を消費した'); } }, events = [], emit = event => events.push(event);
  const hit = (source, target, amount, counter, skipSourceEffects, skipTough, options) =>
    coreResolveHit(state, source, target, amount, counter, rng, emit, { skipSourceEffects, skipTough, ...options });
  const attack = (index = 0, triggerIndex) => {
    const start = events.length;
    coreApplyAttackEffects(state.units[side].filter(Boolean)[index], state, rng, emit, hit, triggerIndex);
    return events.slice(start);
  };
  return { state, side, other, source: state.units[side][0], events, emit, hit, attack };
}
const hits = events => events.filter(event => event.type === 'damage');
const values = events => events.filter(event => event.type === 'keyword_effect' && event.effect === 'effect_value');
async function flush(h, events) {
  G.allies = h.state.units.p1; G.enemies = h.state.units.p2; G._battleCoreEvents = [];
  await _flushCorePveHitEvents(h.state, events, new Set([...G.allies, ...G.enemies]));
}

(async () => {
  await loadGameData(); SaveRun.ready();
  for (const side of ['p1', 'p2']) await check(`${side}：12から発動ごとに1減少、下限0・死亡発動なし・乱数消費なし`, () => {
    const h = harness(resetBoard(), side), subject = h.state.units[side][0];
    for (let activation = 0; activation < 14; activation++) {
      const damage = Math.max(0, 12 - activation), events = h.attack();
      assert.deepEqual(hits(events).map(event => event.amount), damage ? Array(3).fill(damage) : []);
      assert.ok(hits(events).every(event => event.effectSource === false && event.area));
      if (damage) assert.equal(new Set(hits(events).map(event => event.batch)).size, 1);
      assert.equal(values(events)[0].damage, Math.max(0, damage - 1));
      assert.equal(subject._permanentEffectCards[0].damage, Math.max(0, damage - 1));
      if (!damage) assert.ok(!events.some(event => event.type === 'sweep_vfx'));
    }
    subject.hp = 0; const start = h.events.length;
    coreApplyDeathEffects(subject, h.state, h.rng, h.emit, h.hit);
    assert.equal(hits(h.events.slice(start)).length, 0);
    assert.equal(values(h.events.slice(start)).length, 0);
  });
  await check('初期値と減少幅も本文参照、同一攻撃の再入では二重に消耗しない', () => {
    const unit = resetBoard()[0];
    unit._adjacentPanelEffectTexts = ['攻撃：全ての敵に9ダメージを与える。発動するたびにこのダメージは永久に2減少する。'];
    unit._permanentEffectCards = [];
    const h = harness([unit]);
    assert.deepEqual(hits(h.attack(0, 'same')).map(event => event.amount), [9, 9, 9]);
    assert.equal(h.attack(0, 'same').length, 0);
    assert.deepEqual(hits(h.attack(0, 'next')).map(event => event.amount), [7, 7, 7]);
  });
  await check('同じ種類の2枚は別々に消耗し、各カードと説明へ現在値を保存する', async () => {
    const h = harness(resetBoard({ twoCards: true, damage: 7 }));
    const events = h.attack();
    assert.deepEqual(hits(events).map(event => event.amount), [7, 7, 7, 4, 4, 4]);
    await flush(h, events);
    assert.deepEqual([G.mainBoard[0]._permanentEffectDamage, G.mainBoard[2]._permanentEffectDamage], [6, 3]);
    assert.match(_rawSubstitutedDesc(G.mainBoard[0]), /全ての敵に6ダメージ/);
    assert.match(_rawSubstitutedDesc(G.mainBoard[2]), /全ての敵に3ダメージ/);
    assert.ok(_unitPreviewText(h.source, '', 0).includes('全ての敵に6ダメージ'));
    assert.ok(_unitPreviewText(h.source, '', 0).includes('全ての敵に3ダメージ'));
    for (const event of values(events)) _persistPermanentEffectDamageOrWarn(_getPartyBoardUnit(), event);
    assert.deepEqual([G.mainBoard[0]._permanentEffectDamage, G.mainBoard[2]._permanentEffectDamage], [6, 3]);
    assert.equal(persistBoardEffectDamage(_getPartyBoardUnit(), { ...values(events)[0], boardSlot: 1 }), false);
    [G.mainBoard[0], G.mainBoard[2]] = [G.mainBoard[2], G.mainBoard[0]];
    G.mainBoard[0].directions = ['right']; G.mainBoard[2].directions = ['left'];
    const moved = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(entry => entry.unit);
    assert.deepEqual(hits(harness(moved).attack()).map(event => event.amount), [3, 3, 3, 6, 6, 6]);
  });
  await check('1枚を2体へ接続すると値を共有し、沈黙・解除・召喚コピーも値を引き継ぐ', () => {
    const units = resetBoard({ twoCharacters: true }); assert.equal(units.length, 2);
    const h = harness(units);
    assert.deepEqual(hits(h.attack(0)).map(event => event.amount), [12, 12, 12]);
    coreSilenceUnit(h.state.units.p1[0]);
    assert.deepEqual(hits(h.attack(1)).map(event => event.amount), [11, 11, 11]);
    assert.equal(h.state.units.p1[0]._silenceStash._permanentEffectCards[0].damage, 10);
    coreUnsilenceUnit(h.state.units.p1[0]);
    assert.deepEqual(hits(h.attack(0)).map(event => event.amount), [10, 10, 10]);
    const child = coreSummonUnit(h.state, 'p1', { ...coreUnitSnapshot(h.state.units.p1[0]), id: 'copy' }, h.emit);
    assert.ok(child); assert.equal(child._permanentEffectCards[0].damage, 9);
    const index = h.state.units.p1.indexOf(child);
    assert.deepEqual(hits(h.attack(index)).map(event => event.amount), [9, 9, 9]);
    assert.ok(h.state.units.p1.every(unit => unit._permanentEffectCards[0].damage === 8));
  });
  await check('敵味方の同じカードID・スロットは混ざらず、再戦用の敵の写しに現在値を残す', () => {
    const own = isolate(resetBoard({ damage: 7 }))[0], enemy = copy(own);
    enemy.id = 'opponent'; enemy._permanentEffectCards[0].damage = 5;
    const state = createBattleState({ sides: { p1: { units: [own] }, p2: { units: [enemy] } } });
    const events = [], emit = event => events.push(event), rng = createSeededRng(4);
    const hit = (source, target, amount, counter, _a, _b, options) => coreResolveHit(state, source, target, amount, counter, rng, emit, options);
    coreApplyAttackEffects(state.units.p1[0], state, rng, emit, hit);
    assert.equal(state.units.p2[0]._permanentEffectCards[0].damage, 5);
    coreApplyAttackEffects(state.units.p2[0], state, rng, emit, hit);
    assert.equal(state.units.p1[0]._permanentEffectCards[0].damage, 6);
    const carried = SaveRun.copy(state.units.p2, { battleCarry: true });
    assert.equal(carried[0]._permanentEffectCards[0].damage, 4);
    const retry = harness(carried, 'p2');
    assert.deepEqual(hits(retry.attack()).map(event => event.amount), [4, 4, 4]);
  });
  await check('オンライン送信に現在値を含め、コア・実際のオンライン受け口で保存とホバーの写しを更新する', async () => {
    const offline = resetBoard({ damage: 7 });
    const online = buildOnlineSelfFormation().units;
    assert.equal(online[0]._permanentEffectCards[0].damage, 7);
    const pve = harness(offline), pvp = harness(online);
    assert.deepEqual(pve.attack(), pvp.attack());
    const event = values(pvp.events)[0];
    const start = { type: 'battle_start', sides: { p1: isolate(online).map((unit, i) => coreUnitSnapshot(createCoreUnit(unit, 'p1', i))),
      p2: pvp.state.units.p2.map(coreUnitSnapshot) } };
    await playOnlineBattleEvents({ events: [start, event], outcome: 'p1', endReason: 'wiped' }, {
      onEvent: async (next, ctx) => {
        await renderOnlineVersusBoard(next, ctx);
        if(next===event) assert.equal(ctx.board.p1[0]._permanentEffectCards[0].damage, 6);
      },
    });
    assert.equal(G.mainBoard[0]._permanentEffectDamage, 6);
    assert.equal(G.allies.find(Boolean)._permanentEffectCards[0].damage, 6);
    assert.match(_unitPreviewText(G.allies.find(Boolean), '', 0), /全ての敵に6ダメージ/);
  });
  await check('PvEの演出でコアの確定値を巻き戻さず、連戦の新編成でも現在値を使う', async () => {
    const h = harness(resetBoard()); const first = h.attack(); const second = h.attack();
    await flush(h, values(first));
    assert.equal(h.source._permanentEffectCards[0].damage, 10);
    assert.equal(G.mainBoard[0]._permanentEffectDamage, 11);
    await flush(h, values(second));
    assert.equal(G.mainBoard[0]._permanentEffectDamage, 10);
    const next = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(entry => entry.unit);
    assert.deepEqual(hits(harness(next).attack()).map(event => event.amount), [10, 10, 10]);
  });
  await check('カードの現在値をSaveRunの保存・復元で保持し、古いカードの欠落値は本文の初期値になる', () => {
    resetBoard({ damage: 4 }); const save = SaveRun.buildRunSave('reward');
    SaveRun.saveRun(save); const loaded = SaveRun.loadRun(); assert.ok(loaded);
    G.mainBoard[0]._permanentEffectDamage = 1; SaveRun.restoreRunState(loaded);
    assert.equal(G.mainBoard[0]._permanentEffectDamage, 4);
    assert.equal(buildOnlineSelfFormation().units[0]._permanentEffectCards[0].damage, 4);
    delete loaded.state.player.mainBoard[0]._permanentEffectDamage; SaveRun.restoreRunState(loaded);
    assert.equal(buildOnlineSelfFormation().units[0]._permanentEffectCards[0].damage, 12);
  });
  await check('保存済み戦闘の計算・再生・再適用で一致し、未再生の確定結果もカードへ書き戻す', async () => {
    const h = harness(resetBoard({ damage: 9 }));
    h.state.units.p1[0].atk = 20; h.state.units.p2 = [createCoreUnit(plain('weak', { hp: 2, maxHp: 2 }), 'p2', 0)];
    h.state.units.p1.push(createCoreUnit(plain('initiative'), 'p1', 1));
    G.allies = h.state.units.p1; G.enemies = h.state.units.p2;
    const live = _createPveCoreState(); _stampCoreSideSlots(live);
    const initial = SaveRun.copy(Object.fromEntries(['units', 'summonDefs', 'itemDefs', 'rings', 'items', 'resources', 'life', 'maxLife', 'blood', 'mapIndex', 'maxUnits', 'frontSlots'].map(key => [key, live[key]])));
    const prepared = await SaveRun.prepareBattle();
    assert.equal(prepared.setup.units.p1[0]._permanentEffectCards[0].damage, 9);
    assert.equal(values(prepared.events).at(-1).damage, 8);
    assert.equal(SaveRun.loadRun().state.player.mainBoard[0]._permanentEffectDamage, 9, '事前計算だけでカードを消耗させた');
    const pending = SaveRun.computeBattle(initial, 8);
    assert.equal(pending.outcome, 'p1'); assert.equal(values(pending.events).at(-1).damage, 8);
    const direct = simulateOnlineBattle({ seed: 8, sides: { p1: { units: initial.units.p1 }, p2: { units: initial.units.p2 } },
      rings: initial.rings, items: initial.items, resources: initial.resources });
    const combat = events => events.filter(event => ['damage', 'keyword_effect', 'revive', 'battle_end'].includes(event.type));
    assert.deepEqual(combat(pending.events), combat(direct.events));
    const save = SaveRun.buildRunSave('battle', pending); SaveRun.validate(copy(save));
    const savedPending = copy(pending); assert.deepEqual(SaveRun.computeBattle(copy(initial), 8), savedPending);
    SaveRun.installSetup(savedPending); G._battleCoreEvents = []; G._battleRunId = 17;
    const finish = finishBattleAsVictory;
    try {
      finishBattleAsVictory = async () => { SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } }); };
      await SaveRun.replay(savedPending, 17);
      assert.equal(G.mainBoard[0]._permanentEffectDamage, 8);
      SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
      assert.equal(G.mainBoard[0]._permanentEffectDamage, 8);
      SaveRun.restoreRunState(save); SaveRun.installSetup(savedPending); G._battleCoreEvents = [];
      G._savedBattleEnd = { pending: savedPending, applied: false };
      SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
      assert.equal(G.mainBoard[0]._permanentEffectDamage, 8);
    } finally { finishBattleAsVictory = finish; }
  });
  await check('闘技場の連戦・入場時盤面の復元でもカードの消耗値を保持する', async () => {
    const h = harness(resetBoard({ damage: 3 }));
    G._arenaEntrySnapshot = _arenaCaptureEntrySnapshot(); G._arenaActive = true;
    await flush(h, h.attack());
    assert.equal(G._arenaEntrySnapshot.mainBoard[0]._permanentEffectDamage, 2);
    _arenaRestoreEntrySnapshot();
    assert.equal(G.mainBoard[0]._permanentEffectDamage, 2);
  });
  await check('0では説明も0、効果発光は維持し、命中・薙ぎ払いのイベントを生成しない', async () => {
    const h = harness(resetBoard({ damage: 0 })), events = h.attack();
    assert.equal(hits(events).length, 0); assert.ok(events.some(event => event.type === 'effect_flash'));
    assert.equal(presentActionBannerSourceUnfiltered(values(events)[0], {}), null);
    assert.equal(presentPreAttackActorId(values(events)[0]), null);
    await flush(h, events); assert.match(_rawSubstitutedDesc(G.mainBoard[0]), /全ての敵に0ダメージ/);
    assert.equal(G.mainBoard[0]._permanentEffectDamage, 0);
  });
  for (const merged of [false, true]) for (const side of ['p1', 'p2']) await check(`C043 ${side}/${merged ? '合体' : '通常'}：本文の4ダメージ・回数と薙ぎ払いを維持`, () => {
    const definition = PANEL_POOL.find(card => String(card.no).toUpperCase() === 'C043');
    const row = require('./sheet_data').sheetRows('card').find(card => card['No.'] === 'C043');
    const unit = { ...plain('arassas'), no: 'C043', name: definition.name, desc: merged ? row['合体効果'] : row['効果'] };
    const other = side === 'p1' ? 'p2' : 'p1';
    const state = createBattleState({ sides: { [side]: { units: [unit] }, [other]: { units: [plain('a'), plain('b'), plain('c')] } } });
    const events = [], rng = createSeededRng(7), emit = event => events.push(event);
    const hit = (source, target, amount, counter, _a, _b, options) => coreResolveHit(state, source, target, amount, counter, rng, emit, options);
    coreApplyAttackEffects(state.units[side][0], state, rng, emit, hit);
    assert.deepEqual(hits(events).map(event => event.amount), Array(merged ? 6 : 3).fill(4));
    assert.equal(events.filter(event => event.type === 'sweep_vfx').length, 1);
    assert.equal(new Set(hits(events).map(event => event.batch)).size, merged ? 2 : 1);
  });
  console.log(`永久ダメージ/C043 回帰検査: ${checked}件 OK`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
