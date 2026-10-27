'use strict';
// 2026-10-27：決着を起こした効果を完了し、次の効果を開始せず終戦へ進む。
// コア・PvE・オンライン・SaveRunの実装を使う。DOMと時計の境界だけはハーネス。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const h = require('./presentation_1020b_harness');
let passed = 0, failed = 0;
async function check(name, run) {
  try { await run(); passed++; console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
const definition = name => {
  const card = PANEL_POOL.find(c => c.name === name);
  assert.ok(card, name); return h.clone(card);
};
const attach = (unit, names) => {
  const cards = names.map(definition);
  return { ...unit, boardCards: cards, _adjacentPanelEffectTexts: cards.map(c => c.desc),
    _adjacentPanelAbilities: cards.map(c => c.name) };
};
const cleanEvents = events => h.clone(events).map(e => {
  delete e.pveRewardGold;
  return e;
});
function baselineCore() {
  const source = execFileSync('git', ['show', '752a7f62f8afc3e44401bda1f5b1d74173c65d72:prototype/js/battle/core.js'],
    { encoding: 'utf8', maxBuffer: 2e6 });
  const context = { module: { exports: {} } }; vm.runInNewContext(source, context);
  return context.module.exports;
}
function coreRun(setup, stepwise = false) {
  const state = createBattleState(setup), events = [], rng = createSeededRng(setup.seed);
  // PvEも同じ上限とライフ入力で比較する。
  state.life = { p1: 3, p2: 3 }; state.maxLife = { p1: 3, p2: 3 };
  const initial = h.clone(state);
  const runner = createBattleRunner(state, rng, e => events.push(e));
  if (stepwise) {
    while (!runner.result && state.turn < 500) { runner.step({ deferCompact: true }); runner.compact(); }
  } else while (!runner.result && state.turn < 500) runner.step();
  const result = runner.finish();
  return { state, initial, events, result };
}
function contactSetup(side = 'p1') {
  const foe = side === 'p1' ? 'p2' : 'p1';
  return { seed: 1027, sides: {
    [side]: { units: [h.unit('attacker', '', { atk: 6, hp: 12, maxHp: 12,
      keywords: ['三段攻撃'], desc: '負傷：このキャラクターは+5/+5を得る。' }),
    attach(h.unit('end', '', { atk: 1, _mainBoardSlot: 1 }), ['成長'])] },
    [foe]: { units: [h.unit('last', '', { atk: 2, hp: 1, maxHp: 1,
      desc: '死亡：全ての敵に9ダメージを与える。\n死亡：7ゴールドを得る。\n死亡：「緑ウルフ」を1体召喚する。', goldOnDeath: 7 })] },
  }, resources: { p1: { gold: 250 }, p2: { gold: 250 } },
  summonDefs: [h.unit('wolf-def', '', { name: '緑ウルフ', atk: 2, hp: 3, maxHp: 3 })] };
}

// 旧コア（752a7f6）の「決着しない1手」の固定照合値。VB_VICTORY_BASELINE_COREで
// 旧ソースを明示した時だけ同じ標本を計算し、更新理由を検証できる。
function undecidedDigest(api) {
  const rows = [], seed = 1027;
  const cards = PANEL_POOL.filter(c => c.category === 'キャラクター' || c.category === 'エンチャント');
  for (const card of cards) for (const side of ['p1', 'p2']) {
    const ordinary = id => h.unit(id, '', { atk: 1, hp: 1000000, maxHp: 1000000 });
    const subject = card.category === 'キャラクター'
      ? h.unit('subject', card.no, { hp: 1000000, maxHp: 1000000 })
      : attach(ordinary('subject'), [card.name]);
    const setup = { sides: { p1: { units: [] }, p2: { units: [] } }, resources: { [side]: { mana: 3, gold: 500 } },
      summonDefs: PANEL_POOL, itemDefs: ITEM_POOL };
    setup.sides[side].units = [subject, ordinary('guard-a'), ordinary('guard-b')];
    setup.sides[side === 'p1' ? 'p2' : 'p1'].units = [ordinary('foe-a'), ordinary('foe-b'), ordinary('foe-c')];
    const state = api.createBattleState(setup), events = [];
    state._coreFirstSide = side; state._coreStateToken = 'victory-undecided';
    const runner = api.createBattleRunner(state, createSeededRng(seed), e => events.push(e), { skipOpening: true });
    runner.step({ deferCompact: true });
    // 死亡・逃走・奪取・封印のある標本は、別の決着検査で扱う。
    if (events.some(e => ['death', 'instant_death', 'curse_death', 'fled', 'seal_apply', 'unit_stolen'].includes(e.type))) continue;
    rows.push([card.no, side, events, api.battleCoreFinalState(state), state.blood]);
  }
  return { count: rows.length, hash: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
}

(async () => {
  await h.ready;
  for (const side of ['p1', 'p2']) await check(`${side}の勝利：接触と反撃は完了し、死亡・負傷・召喚・追加攻撃は開始しない`, () => {
    const { state, events, result } = coreRun(contactSetup(side));
    assert.equal(result.outcome, side);
    const attacker = state.units[side].find(u => u.id === 'attacker');
    assert.equal(attacker.hp, 10, '反撃2だけ受け、負傷バフ・死亡ダメージは受けない');
    assert.equal(events.filter(e => e.type === 'attack' && !e.effectOnly).length, 1);
    assert.equal(events.filter(e => e.type === 'damage').length, 2);
    assert.equal(events.some(e => e.type === 'summon' || e.type === 'gold_gain'), false);
    assert.equal(events.filter(e => e.reason === 'battle_end_permanent_buff').length, 1);
  });
  await check('最後の敵の撃破後は、執念の炎の永久強化と渇望の血を獲得しない', () => {
    const setup = contactSetup();
    setup.sides.p1.units[0] = attach(setup.sides.p1.units[0], ['執念の炎', '渇望']);
    const x = coreRun(setup);
    assert.equal(x.state.units.p1.find(u => u.id === 'attacker').maxHp, 12);
    assert.equal(x.events.some(e => e.reason === 'kill_permanent_buff'
      || e.type === 'blood_set' && e.sourceId === 'attacker'), false);
  });
  await check('同時全滅：一撃の相互ダメージを完了して引き分け、死亡連鎖は開始しない', () => {
    const setup = contactSetup(); setup.sides.p1.units.length = 1;
    setup.sides.p1.units[0].hp = setup.sides.p1.units[0].maxHp = 1;
    setup.rings = { p1: [RING_POOL.find(r => r.name === '神速の指輪')] };
    const x = coreRun(setup);
    assert.equal(x.result.outcome, 'draw');
    assert.equal(x.events.filter(e => e.type === 'damage').length, 2);
    assert.equal(x.events.some(e => e.type === 'summon' || e.type === 'gold_gain'), false);
  });
  await check('実行中の本文：全キャラクターへの3回のダメージは完了し、次の魔族の魂は消耗もしない', () => {
    const setup = contactSetup();
    setup.sides.p1.units[0] = attach(h.unit('attacker', '', { hp: 20, maxHp: 20,
      desc: '攻撃：このキャラクター以外の全てのキャラクターに1ダメージを3回与える。' }), ['魔族の魂']);
    const x = coreRun(setup);
    assert.equal(x.state.units.p1.find(u => u.id === 'end').hp, 99, '100HP−3回＋成長2HP');
    assert.equal(x.events.filter(e => e.type === 'damage' && e.unitId === 'end').length, 3);
    assert.equal(x.events.some(e => e.type === 'keyword_effect' && e.effect === 'effect_value'), false);
  });
  await check('実行中の魔族の魂：致死ダメージの後も、その発動自身の永久消耗を確定する', () => {
    const setup = contactSetup(); setup.sides.p1.units[0] = attach(h.unit('attacker'), ['魔族の魂']);
    const x = coreRun(setup), event = x.events.find(e => e.type === 'keyword_effect' && e.effect === 'effect_value');
    assert.ok(event, '現在の効果の後半は完了する');
    assert.equal(x.events.some(e => e.type === 'damage' && e.counter), false, '次の接触は開始しない');
  });
  await check('マナの同時波：決着した波の同時対象を完了し、残りの到達回数と別効果を処理しない', () => {
    const activation = definition('活性化');
    const setup = contactSetup(); setup.resources.p1.mana = 3;
    setup.sides.p1.units = ['a', 'b'].map((id, i) => ({ ...h.unit(id, i ? '' : definition('ワイバーン').no),
      desc: i ? '' : '常時：このキャラクターがATKを得るたび、ランダムな敵1体に2ダメージを与える。',
      name: i ? id : 'ワイバーン', manaCost: 1, manaRepeat: true,
      manaThresholdNo: activation.no, manaThresholdDesc: activation.desc.replace(/^\d+マナ毎：/, '') }));
    const x = h.setup(setup);
    coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit);
    assert.equal(x.events.filter(e => e.type === 'mana_threshold').length, 2);
    for (const unit of x.state.units.p1) assert.equal(unit.atk, x.before.p1.find(u => u.id === unit.id).atk + 1);
    assert.equal(x.events.some(e => e.type === 'summon'), false);
  });
  for (const side of ['p1', 'p2']) await check(`${side}：手番冒頭のマナで決着したら、次の毒・攻撃を開始しない`, () => {
    const setup = contactSetup(side);
    setup.sides[side].units[0] = h.unit('poisoned', '', { hp: 1, maxHp: 1, poison: 2,
      manaCost: 1, manaRepeat: false, manaThresholdDesc: 'ランダムな敵に2ダメージを与える。' });
    setup.resources[side].mana = 1;
    const x = h.setup(setup), runner = createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true });
    runner.step({ deferCompact: true });
    assert.equal(runner.result.outcome, side);
    assert.equal(x.find('poisoned').hp, 1);
    assert.equal(x.events.some(e => e.type === 'attack' || e.keywordEffect === '毒'), false);
  });
  await check('死亡効果の途中で決着したら、その効果を完了し、次の死亡効果・召喚へ進まない', () => {
    const setup = contactSetup();
    setup.sides.p1.units[0] = h.unit('dying', '', { hp: 1, maxHp: 1,
      desc: '死亡：全ての敵に2ダメージを与える。\n死亡：「緑ウルフ」を1体召喚する。' });
    const x = h.setup(setup);
    x.hit(x.find('last'), x.find('dying'), 2);
    assert.ok(x.events.some(e => e.type === 'damage' && e.sourceId === 'dying' && e.damageKind === 'death_effect'));
    assert.equal(x.events.filter(e => e.type === 'death').length, 2);
    assert.equal(x.events.some(e => e.type === 'summon' || e.type === 'gold_gain'), false);
  });
  for (const side of ['p1', 'p2']) await check(`${side}：開戦アイテムで決着したら、次の巻物・召喚を処理しない`, () => {
    const setup = contactSetup(side);
    setup.items = { [side]: [
      { itemEffectKey: 'meteor_scroll', desc: '全ての敵に、それぞれのHPの100%のダメージを与える。' },
      { itemEffectKey: 'mana_scroll' }, { itemEffectKey: 'illusion_scroll' },
    ] };
    const x = h.setup(setup);
    coreApplyOpeningItems(x.state, x.rng, x.emit, x.hit);
    assert.equal(x.find('last').hp, 0);
    assert.equal(x.events.some(e => e.type === 'mana_gain' || e.type === 'summon'), false);
  });
  await check('開戦指輪で決着したら、次のHP倍化・付与・先攻効果を処理しない', () => {
    const setup = contactSetup();
    setup.rings = {
      p2: [{ name: '自傷検査', desc: '開戦：全ての味方に+1/+1を与えた後、2ダメージを与える。' }],
      p1: [{ name: 'HP検査', desc: '開戦：全ての味方のHPを2倍にする。' },
        RING_POOL.find(r => r.name === '神速の指輪')],
    };
    const x = h.setup(setup), before = x.find('attacker').hp;
    coreApplyOpeningRings(x.state, x.rng, x.emit, x.hit);
    assert.equal(x.find('last').hp, 0);
    assert.equal(x.find('attacker').hp, before);
    assert.equal(x.events.some(e => e.reason === 'paladin_ring' || e.reason === 'speed_ring'), false);
  });
  await check('死亡観測の途中で決着したら、実行中の連続ダメージを完了し、次の観測者を開始しない', () => {
    const setup = contactSetup();
    setup.sides.p1.units = [h.unit('dying', '', { hp: 1, maxHp: 1 }),
      h.unit('observer-a', '', { hp: 20, maxHp: 20,
        desc: '常時：味方が死亡するたび、全てのキャラクターに1ダメージを2回与える。' }),
      h.unit('observer-b', '', { hp: 20, maxHp: 20,
        desc: '常時：味方が死亡するたび、全てのキャラクターに1ダメージを与える。' })];
    const x = h.setup(setup);
    x.hit(x.find('last'), x.find('dying'), 2);
    assert.equal(x.find('observer-a').hp, 18);
    assert.equal(x.find('observer-b').hp, 18);
    assert.equal(x.events.some(e => e.type === 'damage' && e.sourceId === 'observer-b'), false);
    assert.equal(x.events.filter(e => e.type === 'damage' && e.sourceId === 'observer-a').length, 5);
  });
  await check('結界消失の観測で決着したら、後続の能力強化を処理しない', () => {
    const setup = contactSetup();
    setup.sides.p1.units = [h.unit('shielded', '', { shield: 1,
      desc: '常時：味方が結界を失うたび、ランダムな敵1体に2ダメージを与える。' }),
      h.unit('observer', '', { desc: '常時：味方が結界を失うたび、このキャラクターは+5/+5を得る。' })];
    const x = h.setup(setup), before = x.find('observer').atk;
    x.hit(x.find('last'), x.find('shielded'), 1);
    assert.equal(x.find('last').hp, 0);
    assert.equal(x.find('observer').atk, before);
    assert.equal(x.events.some(e => e.reason === 'grimalkin'), false);
  });
  await check('解放効果で決着したら、後続の封印解放・解放効果を処理しない', () => {
    const setup = contactSetup(); setup.blood = { p1: 3, p2: 0 };
    setup.sides.p1.units = [h.unit('alive'),
      h.unit('release-a', '', { keywords: ['封印1'], desc: '解放：全ての敵に2ダメージを与える。' }),
      h.unit('release-b', '', { keywords: ['封印1'], desc: '解放：このキャラクターは+5/+5を得る。' })];
    const x = coreRun(setup);
    assert.equal(x.result.outcome, 'p1');
    assert.equal(x.events.filter(e => e.type === 'seal_release').length, 1);
    assert.equal(coreIsSealed(x.state.units.p1.find(u => u.id === 'release-b')), true);
  });
  await check('負傷ダメージで決着したら、後続のこのゲーム中の眷属強化を処理しない', () => {
    const setup = contactSetup();
    setup.sides.p1.units[0] = h.unit('wounded', '', {
      desc: '負傷：ランダムな敵に4ダメージを与える。\n負傷：このゲーム中、味方の眷属は+2/+3を得る。' });
    const x = h.setup(setup);
    x.hit(x.find('last'), x.find('wounded'), 1);
    assert.equal(x.find('last').hp, 0);
    assert.equal(x.events.some(e => e.type === 'summon_buff'), false);
  });
  await check('保存なしPvE：開戦から作り直したコアstateにも停止判定を渡す', () => {
    const x = h.setup(contactSetup());
    x.hit(x.find('attacker'), x.find('last'), 2);
    _keepPveSummonState(x.state);
    const next = _createPveCoreState(), events = [];
    coreApplyOpeningEffects(next.units.p1[0], next, x.rng, e => events.push(e), x.hit);
    coreApplyManaThresholdEffects(next, x.rng, e => events.push(e), x.hit);
    assert.equal(events.length, 0);
    assert.equal(next._coreBattleStopped, true);
  });
  await check('保存なしPvE：停止済みの開戦から旧封印解放の入口へ進まない', async () => {
    const x = h.setup(contactSetup());
    x.hit(x.find('attacker'), x.find('last'), 2);
    _keepPveSummonState(x.state);
    // 復帰通知が遅れても、既にコアが停止した戦闘で次の解放を始めない。
    x.find('last').hp = 1;
    const sealed = x.find('end'); sealed._sealed = true; sealed._sealValue = 1;
    G._blood = 3; G._coreDrivenBattle = false;
    try {
      assert.equal(await _resolveSeals(), false);
      assert.equal(sealed._sealed, true);
    } finally {
      _takePveSummonState({}); G._coreDrivenBattle = true;
    }
  });
  for (const keyword of ['復活', '根性']) await check(`${keyword}：復帰可能なHP0では決着せず、従来どおり効果を解決する`, () => {
    const x = h.setup(contactSetup()); const last = x.find('last');
    last.keywords = [keyword]; last._baseAtk = 2; last._baseMaxHp = 10;
    x.hit(x.find('attacker'), last, 2);
    assert.ok(x.events.some(e => e.type === 'revive'));
    assert.ok(last.hp > 0);
    assert.ok(!x.state._coreBattleStopped);
  });
  for (const keyword of ['復活', '根性']) await check(`${keyword}：相互ダメージの後半で倒れた勝者も、実行中の一撃の復帰を完了する`, () => {
    const setup = contactSetup(); setup.sides.p1.units.length = 1;
    Object.assign(setup.sides.p1.units[0], { hp: 1, maxHp: 4, keywords: [keyword] });
    setup.rings = { p1: [RING_POOL.find(r => r.name === '神速の指輪')] };
    const x = coreRun(setup);
    assert.equal(x.result.outcome, 'p1');
    assert.ok(x.events.some(e => e.type === 'revive' && e.unitId === 'attacker'));
    assert.equal(x.events.some(e => e.type === 'summon' || e.reason === 'injury_self_buff'), false);
  });
  await check('不死の指輪：復帰可能な全滅を停止判定で変えず、旧コアの進行・結果を保つ', () => {
    const setup = { sides: { p1: { units: [h.unit('a', '', { atk: 1, hp: 1, maxHp: 1 })] },
      p2: { units: [h.unit('b', '', { atk: 3, hp: 200, maxHp: 200 })] } },
      rings: { p1: [RING_POOL.find(r => r.name === '不死の指輪')] }, summonDefs: PANEL_POOL };
    const run = api => {
      const state = api.createBattleState(setup), events = [];
      state._coreFirstSide = 'p2';
      const result = api.runBattleCore(state, createSeededRng(1027), { turnLimit: 10, onEvent: e => events.push(e) });
      assert.equal(events.filter(e => e.type === 'summon').length, 3);
      return h.clone({ result, events, finalState: api.battleCoreFinalState(state) });
    };
    assert.deepEqual(run({ createBattleState, runBattleCore, battleCoreFinalState }), run(baselineCore()));
  });
  await check('終戦：ユミル・レプラコーン・成長・変化・錬成だけを一度ずつ解決する', () => {
    const setup = contactSetup();
    setup.sides.p1.units = [attach(h.unit('ymir', definition('ユミル').no, { atk: 20, _mainBoardSlot: 0 }), ['成長', '変化', '錬成']),
      h.unit('leprechaun', definition('レプラコーン').no, { _mainBoardSlot: 1 })];
    setup.itemDefs = ITEM_POOL; setup.itemFreeSlots = { p1: 1, p2: 1 };
    const x = coreRun(setup);
    assert.equal(x.events.filter(e => e.kind === 'reroll').length, 1);
    assert.equal(x.events.filter(e => e.kind === 'board_transform').length, 1);
    assert.equal(x.events.filter(e => e.reason === 'battle_end_permanent_buff').length, 3);
    assert.equal(x.events.filter(e => e.type === 'item_reward').length, 1);
    assert.equal(x.state.resources.p1.gold, 50);
  });
  await check('PvEの1手進行・オンライン・保存のイベント、資源、永久強化と再生が一致する', async () => {
    const setup = contactSetup();
    for (const side of ['p1', 'p2']) for (const unit of setup.sides[side].units) { unit.manaOrder = 0; unit.manaThresholdOrder = 0; }
    const direct = coreRun(setup), stepped = coreRun(setup, true);
    const online = simulateOnlineBattle(setup);
    const saved = SaveRun.computeBattle(direct.initial, setup.seed);
    assert.deepEqual(cleanEvents(stepped.events), cleanEvents(direct.events));
    assert.deepEqual(cleanEvents(online.events), cleanEvents(direct.events));
    assert.deepEqual(cleanEvents(saved.events), cleanEvents(direct.events));
    assert.equal(saved.outcome, online.outcome);
    assert.deepEqual(saved.finalState.resources, online.finalState.resources);
    const x = h.setup(setup);
    const runner = createBattleRunner(x.state, createSeededRng(setup.seed), x.emit);
    while (!runner.result) runner.step({ deferCompact: true }); runner.finish();
    await x.pve();
    const pveCalls = h.calls.map(c => c.name);
    await x.online();
    assert.deepEqual(h.calls.map(c => c.name), pveCalls);
    assert.equal(G.allies.find(u => u.id === 'attacker').hp, 10);
    const packed = SaveRun.packBattleEvents(saved), restored = SaveRun.unpackBattleEvents(JSON.parse(JSON.stringify(packed)));
    assert.deepEqual(restored, saved, '保存の圧縮・復元でもイベントと最終値を落とさない');
    // 保存フレームの実再生と、終戦の魔導板への書き戻しまで通す。
    h.setup(setup);
    G.mainBoard.fill(null); G.mainBoard[1] = definition('ブラウニー'); G._partyBoardUnit = null;
    G._runId = 'victory-1027'; G._runSeed = setup.seed; G._runRngState = setup.seed;
    const cardBefore = [G.mainBoard[1].power, G.mainBoard[1].life];
    const persist = global.persistBoardCharacterStats, finish = global.finishBattleAsVictory;
    global.persistBoardCharacterStats = require('../../js/battle/formation').persistBoardCharacterStats;
    global.finishBattleAsVictory = async () => { await onBattleEnd(); };
    try {
      SaveRun.installSetup(restored); G._battleCoreEvents = []; G._battleRunId = 27;
      await SaveRun.replay(restored, 27);
      assert.equal(G.allies.find(u => u.id === 'attacker').hp, 10);
      assert.equal(G.gold, saved.finalState.resources.p1.gold);
      assert.deepEqual([G.mainBoard[1].power, G.mainBoard[1].life], [cardBefore[0] + 1, cardBefore[1] + 2]);
      const after = h.clone(G.mainBoard);
      SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
      assert.deepEqual(G.mainBoard, after, '終戦の再適用で永久値を二重加算しない');

      // 実際の報酬入口と同じく、確定したカードへ配置の印を付けてから保存する。
      // 控えのない旧セーブは復元時に印を補うので、印のない戦闘直後の配列とは一致しない。
      G.phase = 'reward'; _rewPhaseId++; _rewCards = []; _rewFreePickDone = false;
      _storeRewardStartSnapshot();
      const placed = h.clone(G.mainBoard), placement = h.clone(G._placementStart), placeKeySeq = G._placeKeySeq;
      G.mainBoard[2] = G.mainBoard[1]; G.mainBoard[1] = null; G._partyBoardUnit = null;
      const moved = h.clone(G.mainBoard), lifeBeforeRing = G._waveLife;
      changeEquippedRings(() => { G.rings[0] = h.clone(RING_POOL.find(r => r.name === '生命の指輪')); });
      assert.equal(G._waveLife, lifeBeforeRing + 1, '指輪取得時だけ現在ライフを増やす');
      const rings = h.clone(G.rings), life = G._waveLife;
      const runSave = SaveRun.buildRunSave('reward');
      SaveRun.restoreRunState(runSave);
      assert.deepEqual(G.mainBoard, moved, 'ラン保存後も永久強化・移動先・配置の印を保持する');
      assert.deepEqual(G._placementStart, placement, '配置を戻す先も保存・復元する');
      assert.equal(G._placeKeySeq, placeKeySeq, '復元で配置の印を振り直さない');
      assert.equal(resetRewardPlacement(), true);
      assert.deepEqual(G.mainBoard, placed, '配置を戻しても終戦の永久強化を保持する');
      assert.deepEqual(G.rings, rings, '配置を戻しても取得した指輪を保持する');
      assert.equal(G._waveLife, life, '復元・配置を戻すで生命の指輪の回復を重ねない');

      // 配置の控えも印もない旧セーブでは、追加されるのは配置の印だけ。
      const legacy = h.clone(runSave);
      delete legacy.state.choices._placementStart; delete legacy.state.choices._placeKeySeq;
      for (const card of legacy.state.player.mainBoard) if (card) delete card._placeKey;
      const legacyBoard = h.clone(legacy.state.player.mainBoard);
      SaveRun.restoreRunState(legacy);
      assert.deepEqual(G._placementStart.slots, G.mainBoard.map(c => c ? c._placeKey : null));
      assert.ok(G.mainBoard[2]._placeKey, '旧セーブには配置の印を補う');
      const withKeys = h.clone(G.mainBoard), withoutKeys = h.clone(G.mainBoard), legacySeq = G._placeKeySeq;
      for (const card of withoutKeys) if (card) delete card._placeKey;
      assert.deepEqual(withoutKeys, legacyBoard, '旧セーブの補完でも永久強化を含むカードの値を変えない');
      SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));
      assert.deepEqual(G.mainBoard, withKeys, '補完した配置の印も次の保存で保持する');
      assert.equal(G._placeKeySeq, legacySeq);
      assert.equal(G._waveLife, life);
      assert.deepEqual(G.rings, rings);
      assert.equal(G.gold, saved.finalState.resources.p1.gold);
    } finally { global.persistBoardCharacterStats = persist; global.finishBattleAsVictory = finish; }
  });
  await check('決着後の演出を間引かず、勝利専用の加速をせず、終戦は等倍で完了を待つ', async () => {
    const x = h.setup(contactSetup());
    G._battlePhaseRunning = true;
    const option = global.optionBattleSpeedMultiplier, playing = global.isBattlePresentationPlaying, speed = global.getBattleSpeedScale;
    global.optionBattleSpeedMultiplier = () => 2; global.isBattlePresentationPlaying = () => true;
    global.getBattleSpeedScale = () => 1;
    try {
      await presentLabBeginEvent({ type: 'death', side: 'p2', unitId: 'last' }, [], 0, { findUnit: () => x.find('last'), units: () => [] });
      assert.equal(getBattlePresentationSpeedScale(), 2, '通常の速度設定を維持する');
      let done;
      const pending = new Promise(resolve => { done = resolve; }); window.__activeVfxPromises = new Set([pending]);
      let finished = false;
      const event = { type: 'run_effect', trigger: '終戦', side: 'p1', unitId: 'end', kind: 'reroll' };
      const task = presentLabBeginEvent(event, [event], 0, { findUnit: () => x.find('end'), units: () => [] }).then(() => { finished = true; });
      await Promise.resolve(); assert.equal(finished, false, '現在のVFXを待つ');
      done(); await task;
      assert.equal(getBattlePresentationSpeedScale(), 1, '終戦は倍速設定も外す');
    } finally {
      window.__activeVfxPromises = new Set(); global.optionBattleSpeedMultiplier = option;
      global.isBattlePresentationPlaying = playing; global.getBattleSpeedScale = speed;
      presentResetPlayback();
    }
    for (const file of ['js/battle/present.js', 'js/battle/present_events.js', 'js/engine/battle_events.js', 'js/engine/battle.js', 'js/online/board.js', 'js/online/playback.js']) {
      assert.doesNotMatch(fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'),
        /presentMarkBattleTail|presentIsSilentEvent|presentSkipsEvent|PRESENT_DECIDED_SPEED_SCALE/);
    }
  });
  await check('終戦の最後の汎用VFXが残る間も、完了を待ち等倍を維持する', async () => {
    h.setup(contactSetup());
    const show = global.presentLabCommittedEvents, option = global.optionBattleSpeedMultiplier;
    let done, completed = false;
    const pending = new Promise(resolve => { done = resolve; });
    global.optionBattleSpeedMultiplier = () => 3;
    global.presentLabCommittedEvents = async () => { window.__activeVfxPromises = new Set([pending]); };
    try {
      const task = onBattleEnd().then(() => { completed = true; });
      for (let i = 0; i < 10; i++) await Promise.resolve();
      assert.equal(completed, false);
      assert.equal(getBattlePresentationSpeedScale(), 1);
      done(); await task;
      assert.equal(completed, true);
    } finally {
      done(); window.__activeVfxPromises = new Set();
      global.presentLabCommittedEvents = show; global.optionBattleSpeedMultiplier = option;
      presentResetPlayback();
    }
  });
  await check('決着しない全カード・強化の1手は旧コアのイベント・最終状態と完全一致する', () => {
    let api = { createBattleState, createBattleRunner, battleCoreFinalState };
    if (process.env.VB_VICTORY_BASELINE_CORE) {
      const context = { module: { exports: {} }, MAX_ALLIES, MAX_ENEMIES };
      vm.createContext(context);
      vm.runInContext(fs.readFileSync(process.env.VB_VICTORY_BASELINE_CORE, 'utf8'), context);
      api = context.module.exports;
    }
    const actual = undecidedDigest(api);
    if (process.env.VB_VICTORY_BASELINE_CORE) console.log('旧コア照合値 ' + JSON.stringify(actual));
    // 1028：4枚の仮絵指定が外れ、boardCardsを含む照合値が変わった。
    // 現行入力で旧コアと435標本の全イベント・最終状態が一致し、旧loaderだけ戻すと旧照合値になることを確認済み。
    assert.deepEqual(actual, { count: 435, hash: '3b835857782b715ef0cec1bfeb6985cd49f7ed9cf5c5d2fb68ffffa3b3f3e3e2' });
  });
  await check('旧コアとの差分：最後の敵の死亡反撃・召喚・死亡金を止めるため、勝敗も変わる', () => {
    const setup = contactSetup(); setup.sides.p1.units.length = 1;
    setup.sides.p1.units[0].hp = setup.sides.p1.units[0].maxHp = 5;
    setup.rings = { p1: [RING_POOL.find(r => r.name === '神速の指輪')] };
    const old = baselineCore(), state = old.createBattleState(h.clone(setup)), events = [];
    const before = old.runBattleCore(state, createSeededRng(setup.seed), { onEvent: e => events.push(e) });
    const after = coreRun(setup);
    assert.equal(before.outcome, 'draw'); assert.equal(after.result.outcome, 'p1');
    assert.ok(events.some(e => e.type === 'summon' || e.type === 'gold_gain'));
    assert.equal(after.events.some(e => e.type === 'summon' || e.type === 'gold_gain'), false);
    console.log(`  旧版→新版：勝敗 ${before.outcome}→${after.result.outcome}、敵側所持金 ${state.resources.p2.gold}→${after.state.resources.p2.gold}`);
  });
  console.log(`勝利確定1027：${passed}件OK / ${failed}件NG（画面・聴感は別途確認）`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
