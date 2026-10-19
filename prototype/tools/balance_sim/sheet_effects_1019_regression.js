'use strict';

// 現行シートの対象・倍率・回数・持続範囲を、実コアと両再生入口で確認する。
const assert = require('node:assert/strict');
const data = require('./sheet_data');
const h = require('./presentation_1011_harness');
const rows = [...data.sheetRows('card'), ...data.sheetRows('enchant')];
const plain = (id, extra = {}) => ({ id, name: id, color: '赤', atk: 20, hp: 100, maxHp: 100,
  lane: 'front', keywords: [], desc: '', ...extra });
function subject(no, enhanced, extra = {}) {
  const row = rows.find(r => r['No.'] === no), desc = data.effectText(no, enhanced);
  const unit = plain('subject', { name: row['名前'], no, desc,
    keywords: String((enhanced ? row['強化キーワード'] : row['キーワード']) || row['キーワード'] || '').split(/[\s　]+/).filter(Boolean) });
  if (no.startsWith('E')) Object.assign(unit, { name: '被験体', desc: '',
    effectData: { effectNames: [row['名前']], effectTexts: [desc] },
    boardCards: [{ name: row['名前'], no, category: 'エンチャント', desc }] });
  return { ...unit, ...extra };
}
function setup(units, side = 'p1', extra = {}) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = createBattleState({ sides: { [side]: { units }, [other]: { units: [plain('foe')] } },
    resources: { p1: { mana: 10, gold: 1000 }, p2: { mana: 10, gold: 1000 } },
    summonDefs: [...PANEL_POOL, ...ENEMY_POOL], itemDefs: ITEM_POOL, ...extra });
  state.life = { p1: 3, p2: 3 }; state.maxLife = { p1: 3, p2: 3 };
  const events = [], emit = e => events.push(e), rng = createSeededRng(1019);
  const hit = (a, b, n, counter, skipSourceEffects, skipTough, opt) =>
    coreResolveHit(state, a, b, n, counter, rng, emit, { skipSourceEffects, skipTough, ...opt });
  return { state, side, other, unit: state.units[side][0], events, emit, rng, hit };
}
const stats = events => events.filter(e => e.type === 'stat_change');

(async () => {
  await h.ready;
  let checked = 0;
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    const sentinel = setup([subject('C016', enhanced), subject('C016', true, { id: 'same-name' }), plain('recipient')], side);
    const m = data.effectText('C016', enhanced).match(/HP(?:の(\d+)倍)?に等しい/);
    coreApplyAttackEffects(sentinel.unit, sentinel.state, sentinel.rng, sentinel.emit, sentinel.hit);
    assert.deepEqual(stats(sentinel.events).map(e => [e.unitId, e.atk, e.hp]), [['recipient', 0, 100 * (Number(m[1]) || 1)]], '指定名の全カードを除外してHP倍率を適用');

    const recalled = setup([subject('C031', enhanced, { name: '改名された呼び戻し手' })], side);
    recalled.state.deadUnits = [plain('corpse', { name: '元の敵', side: recalled.other, hp: 0, atk: 13, maxHp: 21, _baseAtk: 8, _baseMaxHp: 16 })];
    const text = data.effectText('C031', enhanced), count = Number((text.match(/して(\d+)体/) || [])[1]) || 1;
    recalled.unit.hp = 0;
    coreApplyDeathEffects(recalled.unit, recalled.state, recalled.rng, recalled.emit, recalled.hit);
    const summoned = recalled.events.filter(e => e.type === 'summon');
    assert.equal(summoned.length, count);
    assert.ok(summoned.every(e => e.unit.atk === 8 && e.unit.hp === Number(text.match(/HPを(\d+)に/)[1])
      && e.unit.maxHp === 16 && e.unit._useEnemyVisualFrame), 'HPだけを指定値にし、元の基礎ATK・最大HP・敵枠・効果を維持');

    const arachne = setup([subject('C008', enhanced), plain('friend')], side,
      { resources: { [side]: { mana: Number(data.effectText('C008', enhanced).match(/^(\d+)/)[1]) } } });
    Object.assign(arachne.unit, { manaCost: Number(data.effectText('C008', enhanced).match(/^(\d+)/)[1]), manaRepeat: true,
      manaThresholdDesc: coreManaThresholdDescFromText(data.effectText('C008', enhanced)) });
    coreApplyManaThresholdEffects(arachne.state, arachne.rng, arachne.emit, arachne.hit);
    const pair = data.effectText('C008', enhanced).match(/\+(\d+)\/\+(\d+)/);
    const damage = arachne.events.filter(e => e.type === 'damage');
    assert.equal(damage.length, 2 * data.damageRepetitions(data.effectText('C008', enhanced)));
    assert.equal(new Set(damage.map(e => e.batch)).size, data.damageRepetitions(data.effectText('C008', enhanced)));
    assert.ok(arachne.state.units[side].every(u => u.atk === 20 + Number(pair[1])
      && u.hp === 100 + Number(pair[2]) - data.damageRepetitions(data.effectText('C008', enhanced))), '一度強化した後、本文の回数だけ同時ダメージ');
    assert.ok(arachne.events.findIndex(e => e.type === 'damage') > arachne.events.findLastIndex(e => e.type === 'stat_change'));

    const fanatic = setup([subject('C100', enhanced, { name: '改名された観測者' }), plain('released')], side);
    fanatic.state.blood = { [side]: 7 };
    coreApplyReleaseEffects(fanatic.state.units[side][1], [], fanatic.state, fanatic.rng, fanatic.emit, fanatic.hit);
    const scale = Number((data.effectText('C100', enhanced).match(/血の(\d+)倍/) || [])[1]) || 1;
    assert.deepEqual([fanatic.unit.atk, fanatic.unit.hp, fanatic.unit.shield], [20 + 7 * scale, 100 + 7 * scale, 1]);

    const steal = setup([subject('C090', enhanced)], side);
    steal.state.units[steal.other] = ['front-a', 'front-b', 'rear'].map((id, i) => createCoreUnit(plain(id, { lane: i === 2 ? 'rear' : 'front' }), steal.other, i));
    steal.unit.hp = 0;
    coreApplyDeathEffects(steal.unit, steal.state, steal.rng, steal.emit, steal.hit);
    assert.equal(steal.events.filter(e => e.type === 'unit_stolen').length, Number((data.effectText('C090', enhanced).match(/敵を(\d+)体/) || [])[1]) || 1);
    assert.ok(steal.state.units[steal.other].some(u => u.id === 'rear'), '後衛を奪わない');

    const deathExperience = setup([subject('E029', enhanced)], side);
    deathExperience.unit.effectData.effectTexts.push('死亡：1マナを得る。');
    coreApplyOpeningEffects(deathExperience.unit, deathExperience.state, deathExperience.rng, deathExperience.emit, deathExperience.hit);
    assert.equal(deathExperience.state.resources[side].mana - 10, Number((data.effectText('E029', enhanced).match(/効果を(\d+)回/) || [])[1]) || 1);
    assert.ok(!deathExperience.events.some(e => ['death', 'blood_set'].includes(e.type)), '効果を発動しても実際の死亡・血は生じない');

    const alchemyText = data.effectText('E030', enhanced), cost = Number(alchemyText.match(/(\d+)G/)[1]);
    for (const gold of [cost - 1, cost]) {
      const alchemy = setup([subject('E030', enhanced)], side, { resources: { [side]: { gold } } });
      coreApplyOpeningEffects(alchemy.unit, alchemy.state, alchemy.rng, alchemy.emit, alchemy.hit);
      assert.ok(!alchemy.events.some(e => e.type === 'item_reward'), '終戦の錬成を開戦で無料発動しない');
      coreTriggerBattleEnd(alchemy.state, alchemy.emit, alchemy.rng);
      assert.equal(alchemy.events.filter(e => e.type === 'item_reward').length, gold === cost ? 1 : 0);
      assert.equal(alchemy.state.resources[side].gold, gold === cost ? 0 : gold);
    }
    checked += 8;
  }

  // 確率の外れ・2回目だけの成功・両方の成功。反復は独立した判定。
  for (const enhanced of [false, true]) {
    const text = data.effectText('C020', enhanced), probability = Number(text.match(/(\d+)%/)[1]) / 100;
    const times = data.effectRepetitions(text), amount = Number(text.match(/確率で(\d+)マナ/)[1]);
    for (const successful of [-1, 0, times - 1, 'all']) {
      const run = setup([subject('C020', enhanced)]); let calls = 0;
      run.rng.next = () => { const n = calls++; return successful === 'all' || n === successful ? probability / 2 : probability; };
      coreApplyInjuryEffects(run.unit, 1, run.state, run.rng, run.emit, run.hit);
      assert.equal(calls, times);
      assert.equal(run.state.resources.p1.mana - 10, amount * (successful === 'all' ? times : successful < 0 ? 0 : 1)); checked++;
    }
  }

  // 反復付与が同じ相手を選んでも、後の死亡で全ての付与が発動する。
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    const grant = setup([subject('C038', enhanced), plain('receiver')], side);
    const beforeGrant = h.copy(grant.state);
    grant.rng.pick = list => list[0];
    coreApplyInjuryEffects(grant.unit, 1, grant.state, grant.rng, grant.emit, grant.hit);
    const expected = data.effectRepetitions(data.effectText('C038', enhanced));
    const grants = grant.events.filter(e => e.type === 'death_summon_grant');
    assert.equal(grants.length, expected);
    const receiver = grant.state.units[side][1]; receiver.hp = 0;
    coreApplyDeathEffects(receiver, grant.state, grant.rng, grant.emit, grant.hit);
    assert.equal(grant.events.filter(e => e.type === 'summon').length, expected, '同じ体への2回目の付与を上書きしない');
    await playOnlineBattleEvents({ events: [{ type: 'battle_start', sides: beforeGrant.units }, ...h.copy(grants)] }, {
      onEvent: (event, context) => {
        if (event.type === 'death_summon_grant') assert.equal(context.unitById('receiver').effectData.grantedDeathSummons.length, event.summons.length);
      },
    });
    checked++;
  }
  // 常時の召喚強化も通常＋強化を各カードごとに読み、先頭の文で上書きしない。
  for (const no of ['E068', 'E069', 'E070']) for (const side of ['p1', 'p2']) {
    const source = subject(no, false), enhanced = subject(no, true);
    source.effectData.effectTexts.push(...enhanced.effectData.effectTexts);
    source.boardCards.push(...enhanced.boardCards);
    const run = setup([source], side);
    const child = coreSummonUnit(run.state, side, { name: '歌の検査体', atk: 10, hp: 20 }, run.emit, run.unit.id);
    const texts = [data.effectText(no, false), data.effectText(no, true)];
    if (no === 'E068') {
      const pairs = texts.map(text => text.match(/\+(\d+)\/\+(\d+)/));
      assert.deepEqual([child.atk-child._baseAtk,child.hp-child._baseMaxHp],
        [pairs.reduce((n,m)=>n+Number(m[1]),0),pairs.reduce((n,m)=>n+Number(m[2]),0)]);
    } else if (no === 'E069') assert.equal(child.shield,texts.reduce((n,text)=>n+Number(text.match(/結界(\d+)/)[1]),0));
    else {
      child.hp=0;coreApplyDeathEffects(child,run.state,run.rng,run.emit,run.hit);
      assert.equal(run.events.filter(e=>e.type==='damage').reduce((n,e)=>n+e.amount,0),
        texts.reduce((n,text)=>{const body=text.match(/「(死亡：[^」]+)」/)[1];return n+Number(body.match(/(\d+)ダメージ/)[1])*data.damageRepetitions(body);},0));
    }
    checked++;
  }

  // 熟練は付与時の与え手から確定し、後続の召喚者から再計算しない。
  for (const no of ['C029', 'C034', 'C057']) {
    const run = setup([subject(no, true, { keywords: ['熟練2'] }), plain('summoner', { keywords: ['熟練9'] })]);
    const first = coreSummonUnit(run.state, 'p1', { name: '先の眷属', atk: 10, hp: 20 }, run.emit, 'summoner');
    if (no === 'C029') { run.unit.hp = 0; coreApplyDeathEffects(run.unit, run.state, run.rng, run.emit, run.hit); }
    if (no === 'C034') coreApplyInjuryEffects(run.unit, 1, run.state, run.rng, run.emit, run.hit);
    const text = data.effectText(no, true), pair = text.match(/\+(\d+)\/\+(\d+)/);
    const expected = { atk: pair ? Number(pair[1]) + 2 : no === 'C034' ? Number(text.match(/ATK\+(\d+)/)[1]) + 2 : 0,
      hp: pair ? Number(pair[2]) + 2 : no === 'C057' ? Number(text.match(/HP\+(\d+)/)[1]) + 2 : 0 };
    assert.deepEqual(run.state.gameSummonBuff.p1, expected);
    const second = coreSummonUnit(run.state, 'p1', { name: '後の眷属', atk: 10, hp: 20 }, run.emit, 'summoner');
    const repeats = no === 'C057' ? 2 : 1;
    assert.deepEqual([first.atk, first.hp, second.atk, second.hp],
      [10 + expected.atk * repeats, 20 + expected.hp * repeats, 10 + expected.atk * repeats, 20 + expected.hp * repeats]);
    const next = setup([plain('new-battle')], 'p1', { gameSummonBuff: h.copy(run.state.gameSummonBuff) });
    const future = coreSummonUnit(next.state, 'p1', { name: '次戦の眷属', atk: 10, hp: 20 }, next.emit);
    assert.deepEqual([future.atk, future.hp], [10 + expected.atk * repeats, 20 + expected.hp * repeats], '付与元がいない次の戦闘にも残る'); checked++;
  }

  // 同じ入力のコア・オンライン計算・JSON保存再計算と、両受け口への書き戻し。
  const prepared = setup([subject('C057', true), subject('C045', false, { id: 'mitera' }),
    subject('C034', false, { id: 'eidolon' })], 'p1', { gameSummonBuff: { p1: { atk: 3, hp: 5 }, p2: { atk: 2, hp: 4 } } }).state;
  const seed = 20261019;
  const input = SaveRun.copy({ seed, turnLimit: 8, sides: Object.fromEntries(['p1', 'p2'].map(side => [side, { units: prepared.units[side] }])),
    resources: prepared.resources, summonDefs: prepared.summonDefs, gameSummonBuff: prepared.gameSummonBuff });
  const initial = createBattleState(h.copy(input)), events = [];
  initial.life = prepared.life; initial.maxLife = prepared.maxLife;
  const before = h.copy(initial);
  runBattleCore(initial, createSeededRng(seed), { turnLimit: 8, onEvent: e => events.push(e) });
  const online = simulateOnlineBattle(h.copy(input));
  assert.deepEqual(online.events, events); assert.deepEqual(online.finalState, battleCoreFinalState(initial));
  assert.deepEqual(simulateOnlineBattle(JSON.parse(JSON.stringify(input))), online);
  for (const isOnline of [false, true]) {
    const state = isOnline ? h.copy(before) : initial;
    h.setup(state); G.gameSummonBuff = { ...before.gameSummonBuff.p1 };
    await h.replay(state, events.filter(e => e.type !== 'battle_start'), isOnline);
    assert.deepEqual(G.gameSummonBuff, initial.gameSummonBuff.p1, '両再生入口が確定した累積値をローカルのランへ戻す');
    const payload = buildOnlineSelfFormation();
    assert.deepEqual(payload.gameSummonBuff.p1, initial.gameSummonBuff.p1, '次戦のオンライン送信に累積値を含める');
  }
  const pending = SaveRun.computeBattle(before, seed), savedPending = JSON.parse(JSON.stringify(pending));
  assert.deepEqual(SaveRun.computeBattle(before, seed), pending, '同じseedから保存用の全イベント・状態を再計算');
  assert.deepEqual(savedPending.finalState.gameSummonBuff, pending.finalState.gameSummonBuff);
  SaveRun.installSetup(savedPending); G._savedBattleEnd = { pending: savedPending, applied: false };
  G._battleCoreEvents = [];
  const replayState = { units: { p1: G.allies, p2: G.enemies } };
  SaveRun.applyEnd(replayState); SaveRun.applyEnd(replayState);
  assert.deepEqual(G.gameSummonBuff, pending.finalState.gameSummonBuff.p1, '終戦の反映を繰り返しても累積値を二重加算しない');

  initState(); SaveRun.begin(); G._wave = 1; G._waveStage = 1; G._waveLife = 3; _rewCards = [];
  G.gameSummonBuff = { atk: 7, hp: 11 };
  const save = SaveRun.buildRunSave('reward');
  SaveRun.restoreRunState(h.copy(save)); assert.deepEqual(G.gameSummonBuff, { atk: 7, hp: 11 });
  delete save.state.player.gameSummonBuff;
  SaveRun.restoreRunState(h.copy(save)); assert.deepEqual(G.gameSummonBuff, { atk: 0, hp: 0 }, '旧セーブの欠落は0');
  initState(); assert.deepEqual(G.gameSummonBuff, { atk: 0, hp: 0 }, '新しいランへ持ち越さない');
  console.log(`シート効果1019: ${checked}条件＋眷属の次戦持越し・両計算/再生・保存復元/二重適用・旧セーブ OK`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
