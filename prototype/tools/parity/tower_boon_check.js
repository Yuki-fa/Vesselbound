'use strict';
// nodeだけで実行する。内蔵データ・実際の生成／表示／編成／保存／コアを使う。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('../balance_sim/stub');
const { initialize } = require('../balance_sim/run_bot');
let checked = 0;
function check(name, fn) { fn(); checked++; console.log('OK ' + name); }
const bonus = { statMul: 3, modDelta: 1, dmgMul: 3, manaDelta: 1, famMul: 3 };
const def = no => PANEL_POOL.find(c => String(c.no).toUpperCase() === no);
function fresh() {
  initState(); G._runId = 'tower-boon-check'; G._runSeed = 1016; G._runRngState = 1016;
  G._wave = 1; G._waveStage = 1; G._waveLife = 3; G._debugMode = true;
  _rewCards = []; _rewFreePickDone = false; _rewPhaseId = 1;
}
function card(no, boon = bonus) {
  const result = makePanel(def(no).id);
  return coreApplyCardBoon(result, boon);
}
function unitFromCard(c, id = 'subject') {
  const spec = _panelSummonSpec(c);
  assert.ok(spec, 'キャラクターの出撃定義');
  return { ...spec, id, maxHp: spec.hp, ...(c.boon ? { boon: { ...c.boon } } : {}) };
}
function simulate(c, options = {}) {
  const subject = unitFromCard(c);
  const setup = {
    stageNumber: 2, frontSlots: 7, summonDefs: [...PANEL_POOL, ...ENEMY_POOL],
    resources: { p1: { mana: options.mana || 0, gold: 0 } }, blood: { p1: options.blood || 0 },
    sides: { p1: { units: [subject, ...(options.allies || [])] },
      p2: { units: [{ id: 'dummy', name: '検査相手', atk: 1, hp: 100000, maxHp: 100000 }] } },
  };
  const state = createBattleState(setup), events = [];
  const rng = createSeededRng(1016);
  runBattleCore(state, rng, { turnLimit: options.turnLimit || 2, onEvent: event => events.push(event) });
  return { state, events, setup };
}

(async () => {
  const api=await initialize();
  check('祝福なし：個体の形・本文・コア結果・乱数が同一', () => {
    fresh();
    const raw = makePanel(def('C006').id), copy = clone(raw);
    assert.equal(towerBoonBlessGeneratedCard(raw), raw);
    assert.deepEqual(raw, copy); assert.equal('boon' in raw, false);
    const rng = G._runRngState;
    assert.deepEqual(towerBoonGeneratedOffers([raw]), [copy]);
    assert.equal(G._runRngState, rng);
    assert.deepEqual(simulate(raw).events, simulate(copy).events);
  });
  check('祝福1：表示のATK/HPと編成・コア入力が3倍、既存個体は据え置き', () => {
    fresh();
    const owned = card('C006', null), blessed = card('C006');
    assert.equal(blessed.power, owned.power * 3); assert.equal(blessed.life, owned.life * 3);
    G.mainBoard[1] = blessed; G._partyBoardUnit = null;
    const formed = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered[0].unit;
    assert.equal(formed.atk, blessed.power); assert.equal(formed.maxHp, blessed.life);
    assert.deepEqual(formed.boon, bonus);
    const state = createBattleState({ sides: { p1: { units: [formed] }, p2: { units: [] } } });
    assert.equal(state.units.p1[0].atk, blessed.power); assert.equal(state.units.p1[0].hp, blessed.life);
  });
  check('祝福2：+2/+1→+3/+2、負数・0・単独ATK/HPも表示と実値が一致', () => {
    fresh();
    const c = card('C006', null); c.desc = '攻撃：このキャラクターは+2/+1を得る。';
    coreApplyCardBoon(c, bonus); const text = _rawSubstitutedDesc(c);
    assert.match(text, /\+3\/\+2/);
    const stat = simulate(c).events.find(e => e.type === 'stat_change' && e.reason === 'attack_self_buff');
    assert.ok(stat); assert.equal(stat.atk, 3); assert.equal(stat.hp, 2);
    assert.equal(coreBoonText('+0/-1 ATK-2 HP+1', bonus), '+0/-2 ATK-3 HP+2');
    assert.equal(coreBoonText('ATK+2/+1 HPが+0 +2+2', bonus), 'ATK+3/+2 HPが+0 +3+3');
    const debuff = { ...card('C006', null), desc: '開戦：全ての敵は-1/-1を得る。この効果は、このキャラクターのHP10につき1回発生する。' };
    coreApplyCardBoon(debuff, bonus);
    const ev = simulate(debuff).events.find(e => e.type === 'stat_change' && e.side === 'p2');
    assert.ok(ev); assert.equal(ev.atk, -2); assert.equal(ev.hp, -2);
  });
  check('祝福3：固定値の表示と効果ダメージが3倍', () => {
    fresh();
    const c = card('C043'); assert.match(_rawSubstitutedDesc(c), /12ダメージ/);
    const ev = simulate(c).events.find(e => e.type === 'damage' && e.sourceId === 'subject' && e.damageKind === 'attack_effect');
    assert.ok(ev); assert.equal(ev.amount, 12);
  });
  check('祝福4：マナの効果文・loader派生値・コアの増加が一致', () => {
    fresh();
    const c = card('C064'); assert.match(_rawSubstitutedDesc(c), /2マナを得る/);
    assert.equal(c.manaOnAttack, 2);
    const ev = simulate(c).events.find(e => e.type === 'mana_gain' && e.unitId === 'subject');
    assert.ok(ev); assert.equal(ev.amount, 2);
  });
  check('祝福5：眷属の注釈と召喚イベントのATK/HPが3倍', () => {
    fresh();
    const c = card('C045');
    const pelican = PANEL_POOL.find(p => p.name === 'ペリカン') || ENEMY_POOL.find(p => p.name === 'ペリカン');
    const a = Number(pelican.power ?? pelican.atk) * 3, h = Number(pelican.life ?? pelican.hp) * 3;
    assert.ok(_rawSubstitutedDesc(c).includes(`${a}/${h}の「緑ペリカン」`));
    const summons = simulate(c).events.filter(e => e.type === 'summon' && e.sourceId === 'subject');
    assert.equal(summons.length, 2);
    for (const e of summons) { assert.equal(e.unit.atk, a); assert.equal(e.unit.hp, h); }
  });
  check('Xの効果：表示した演算とコアのマナ・修正・ダメージが一致', () => {
    fresh();
    const centaur = card('C019'); assert.match(_rawSubstitutedDesc(centaur), /\(X×3\)ダメージ/);
    const ev = simulate(centaur, { mana: 4 }).events.find(e => e.type === 'damage' && e.sourceId === 'subject' && e.damageKind === 'attack_effect');
    assert.ok(ev); assert.equal(ev.amount, 12);
    const ymir = card('C047'); assert.match(_rawSubstitutedDesc(ymir), /\+\(X\+1\)\/\+\(X\+1\)/);
    const stat = simulate(ymir, { mana: 4 }).events.find(e => e.type === 'stat_change' && e.reason === 'ymir');
    assert.ok(stat); assert.equal(stat.atk, 5); assert.equal(stat.hp, 5);
    const nymph = card('C071'); assert.match(_rawSubstitutedDesc(nymph), /\(X\+1\)マナ/);
    const mana = simulate(nymph).events.find(e => e.type === 'mana_gain' && e.reason === 'nymph_colors');
    assert.ok(mana); assert.equal(mana.amount, 2);
  });
  check('合体：素材の項目ごとの最大値を保持し、祝福の基礎値を個別補正へ二重加算しない', () => {
    fresh();
    const enabled=PANEL_MERGE_TRIAL.enabled;PANEL_MERGE_TRIAL.enabled=true;
    try{
    const a = card('C006', { ...bonus, dmgMul: 9 }), b = card('C006', { ...bonus, statMul: 9, manaDelta: 2 }), c = card('C006', null);
    const expected = { ...bonus, dmgMul: 9, statMul: 9, manaDelta: 2 };
    assert.deepEqual(coreMergeBoons([a, b, c]), expected);
    const board = { boardCards: Array(15).fill(null) };
    board.boardCards[0] = a; board.boardCards[1] = b; board.boardCards[2] = c;
    const merged = _tryTripleMergeOnBoard(board, 2);
    assert.ok(merged);
    const result = board.boardCards[merged.targetIdx];
    assert.deepEqual(result.boon, expected);
    assert.equal(result.power, def('C006').power * 3 * 9);
    assert.equal(result.life, def('C006').life * 3 * 9);
    const raw = clone(result); delete raw.boon; delete raw._boonBase;
    applyMergedPanelForm(raw);
    assert.equal(result.desc, coreBoonText(raw.desc, expected));
    }finally{PANEL_MERGE_TRIAL.enabled=enabled;}
  });
  check('絆の巻物：2枚合体でも項目ごとの最大祝福と個別補正を保持する', () => {
    fresh();
    const enabled=PANEL_MERGE_TRIAL.enabled;PANEL_MERGE_TRIAL.enabled=true;
    try{
    const a = card('C006'), b = card('C006', { ...bonus, statMul: 9, modDelta: 2 });
    a.power += 5; b.power += 7;
    G.mainBoard[0] = a; G.mainBoard[1] = b; G._partyBoardUnit = null;
    G._pendingItemUse = { key: 'bond_scroll', firstIdx: 0, firstName: a.name, slotIdx: 0 };
    const consume = _consumeItemSlot, sync = _syncItemUsePickingUi;
    _consumeItemSlot = () => {}; _syncItemUsePickingUi = () => {};
    try { assert.equal(_handlePendingItemBoardTarget(1), true); }
    finally { _consumeItemSlot = consume; _syncItemUsePickingUi = sync; }
    assert.equal(G.mainBoard[1], null); assert.equal(a.boon.statMul, 9); assert.equal(a.boon.modDelta, 2);
    assert.equal(a.power, def('C006').power * 18 + 12);
    }finally{PANEL_MERGE_TRIAL.enabled=enabled;}
  });
  check('強化カード：本体と異なる祝福のX修正・召喚量を個別に保持する', () => {
    fresh();
    const subject = card('C001', null), enchant = card('E036', { ...bonus, modDelta: 2 });
    const plain = unitFromCard(subject);
    plain.boardCards = [subject, enchant]; plain._adjacentPanelEffectTexts = [enchant.desc];
    plain._resonanceEffectNames = [enchant.name];
    assert.match(_enchantEffectTextForPanel(enchant), /ATK\+\(X\+2\)/);
    const state = createBattleState({ sides: { p1: { units: [plain, { id: 'friend', name: '検査仲間', atk: 2, hp: 200, maxHp: 200 }] },
      p2: { units: [{ id: 'enemy', name: '検査相手', atk: 1, hp: 10000 }] } } });
    const events = []; runBattleCore(state, createSeededRng(7), { turnLimit: 1, onEvent: e => events.push(e) });
    const event = events.find(e => e.type === 'stat_change' && e.reason === 'incite');
    assert.ok(event); assert.equal(event.atk, plain.hp + 2);
    const copyCard = card('E028');
    assert.match(_rawSubstitutedDesc(copyCard), /3\/3のコピー/);
    const copySource = unitFromCard(card('C001', null));
    copySource.boardCards = [copyCard]; copySource._adjacentPanelEffectTexts = [copyCard.desc];
    const copyState = createBattleState({ summonDefs: [...PANEL_POOL], sides: { p1: { units: [copySource] }, p2: { units: [{ id: 'enemy', name: '敵', atk: 1, hp: 10000 }] } } });
    const copied = []; runBattleCore(copyState, createSeededRng(7), { turnLimit: 1, onEvent: e => copied.push(e) });
    const summoned = copied.find(e => e.type === 'summon');
    assert.ok(summoned); assert.equal(summoned.unit.atk, 3); assert.equal(summoned.unit.hp, 3);
  });
  check('オンライン：祝福付きの編成payload・受信・両陣営の眷属能力値が一致する', () => {
    fresh(); G.mainBoard[1] = card('C045'); G._partyBoardUnit = null;
    const payload = JSON.parse(JSON.stringify(buildOnlineSelfFormation()));
    assert.deepEqual(payload.units[0].boon, bonus);
    const summonsFor = side => {
      const enemySide = side === 'p1' ? 'p2' : 'p1';
      const state = createBattleState({ summonDefs: [...PANEL_POOL, ...ENEMY_POOL], sides: {
        [side]: { units: payload.units }, [enemySide]: { units: [{ id: 'dummy', name: '敵', atk: 1, hp: 100000 }] },
      } });
      assert.deepEqual(state.units[side][0].boon, bonus);
      assert.deepEqual(coreUnitSnapshot(state.units[side][0]).boon, bonus);
      const events = []; runBattleCore(state, createSeededRng(4), { turnLimit: 1, onEvent: e => events.push(e) });
      return events.filter(e => e.type === 'summon' && e.side === side).map(e => [e.unit.atk, e.unit.hp]);
    };
    assert.deepEqual(summonsFor('p1'), summonsFor('p2'));
    assert.equal(summonsFor('p1').length, 2);
    const setup = { seed: 4, turnLimit: 1, summonDefs: [...PANEL_POOL, ...ENEMY_POOL], sides: {
      p1: { units: payload.units }, p2: { units: [{ id: 'dummy', name: '敵', atk: 1, hp: 100000 }] },
    } };
    const online = simulateOnlineBattle(setup), state = createBattleState(setup), direct = [];
    runBattleCore(state, createSeededRng(setup.seed), { turnLimit: setup.turnLimit, onEvent: e => direct.push(e) });
    assert.deepEqual(online.events, direct);
    // DOMを作らず、実際のオンライン描画受け口のデータ変換を呼ぶ。
    const source = fs.readFileSync(path.join(ROOT, 'js/online/board.js'), 'utf8');
    const start = source.indexOf('  function _fieldUnit('), end = source.indexOf('\n  // 前衛・後衛', start);
    const receiver = vm.runInNewContext(`(${source.slice(start, end).trim()})`, { _cardInfo: { p1: new Map(), p2: new Map() } });
    const received = receiver(coreUnitSnapshot(state.units.p1[0]), 'p1');
    assert.deepEqual(JSON.parse(JSON.stringify(received.boon)), bonus);
  });
  check('再抽選：持ち越し、未取得枠だけを抽選、権利0は100G、再抽選後も現在の祝福', () => {
    fresh(); G.phase = 'reward'; G.towerBoons.counts = { stats: 1, damage: 1, rerolls: 2 };
    assert.equal(towerBoonRerollVisible(), true);
    towerBoonGrantRewardRerolls(); towerBoonGrantRewardRerolls();
    assert.equal(G.towerBoons.rerolls, 4);
    _rewCards = runWithKeyedRandom('reroll-before', () => drawRewards());
    _rewCards.forEach(c => { c._isOriginalReward = true; });
    const acquired = _rewCards[0]; G.mainBoard[1] = acquired; _rewCards[0] = null;
    const owned = card('C001', null); owned._temporaryRewardAreaCard = true; _rewCards[1] = owned;
    const render = renderRewCards; renderRewCards = () => {};
    try {
      for (let i = 0; i < 4; i++) {
        assert.equal(towerBoonRerollRewards(), true);
        assert.equal(G.towerBoons.rerolls, 3 - i);
        assert.equal(G.mainBoard[1], acquired); assert.equal(_rewCards[0], null); assert.equal(_rewCards[1], owned);
        _rewCards.filter(c => c && c._isOriginalReward).forEach(c => {
          assert.equal(c.boon.statMul, 3); assert.equal(c.boon.dmgMul, 3);
        });
      }
      G.gold = 99; const last = clone(_rewCards); assert.equal(towerBoonRerollRewards(), false); assert.deepEqual(_rewCards, last);
      // 2026-10-19：権利が無ければ100Gで引き直せる（通常の戦闘報酬もPvEでは常にボタンを出す）。
      G.towerBoons.counts.rerolls = 0; assert.equal(towerBoonRerollVisible(), true);
      assert.deepEqual(towerBoonRerollButtonState(), { visible: true, label: '再抽選（100G）', disabled: true });
      G.gold = 150; assert.equal(towerBoonRerollButtonState().disabled, false);
      assert.equal(towerBoonRerollRewards(), true); assert.equal(G.gold, 50); assert.equal(G.towerBoons.rerolls, 0);
      assert.equal(_rewCards[1], owned, '取得済み・持ち込みの枠は変えない');
    } finally { renderRewCards = render; }
    _rewCards = []; assert.equal(towerBoonRerollVisible(), false, '報酬カードが無ければ出さない');
  });
  check('祝福の座の廃止：通常プレイでは購入できず、ゴールド・状態を変えない',()=>{
    fresh();G.gold=10000;const state=clone(towerBoonState());
    assert.equal(towerBoonChoose('stats'),false);assert.deepEqual(towerBoonState(),state);assert.equal(G.gold,10000);
  });
  check('オンラインの祝福は従来の合計購入回数の価格・支払いを維持する', () => {
    fresh(); G._onlineMode = true; G.gold = 10000;
    for (const [id, price] of [['stats', 200], ['mana', 500], ['stats', 1000], ['damage', 2000]]) {
      assert.ok(TOWER_BOON_CONFIG.blessings.every(b => towerBoonChoicePrice(b.id) === price));
      const gold = G.gold; assert.equal(towerBoonChoose(id), true); assert.equal(gold - G.gold, price);
    }
  });
  check('可変の増加量：倍率による修正と、ボスの敵マナ参照も表示と一致', () => {
    fresh();
    const c = card('C001', null); c.desc = '開戦：このキャラクターのATKを2倍にする。';
    coreApplyCardBoon(c, bonus);
    assert.match(_rawSubstitutedDesc(c), /増加量\+1/);
    const e = simulate(c).events.find(e => e.type === 'stat_change' && e.reason === 'roar');
    assert.ok(e); assert.equal(e.atk, c.power + 1);
    const source = ENEMY_POOL.find(p => p.no === 'EN061'), boss = towerBoonMakeBossCard(source);
    coreApplyCardBoon(boss, bonus);
    const state = createBattleState({ resources: { p2: { mana: 3 } }, sides: {
      p1: { units: [unitFromCard(boss)] }, p2: { units: [{ id: 'dummy', name: '相手', atk: 1, hp: 100000 }] },
    } });
    runBattleCore(state, createSeededRng(1), { turnLimit: 1 });
    assert.equal(state.units.p1[0].atk, boss.power + 13);
    const gains = [];
    coreGainResource(state, 'p2', 'mana', 1, state.units.p2[0], e => gains.push(e), 'boon-check');
    const gained = gains.filter(e => e.type === 'stat_change' && e.reason === 'enemy_mana_passive');
    assert.equal(gained.length, 1); assert.equal(gained[0].atk, 4);
  });
  check('全キャラクター・ボス：祝福付き個体をrunBattleCoreで実行できる', () => {
    fresh();
    const characters = PANEL_POOL.filter(c => c.category === 'キャラクター' && c._implemented !== false && c._sheetSeen);
    const bosses = ENEMY_POOL.filter(c => c.bossOnly);
    for (const source of characters) {
      const c = coreApplyCardBoon(clone(source), bonus), result = simulate(c, { mana: 4, blood: 6, turnLimit: 1 });
      assert.doesNotThrow(() => JSON.stringify(result.events), source.name);
      assert.equal(result.events.some(e => e.type === 'damage' && !Number.isFinite(e.amount)), false, source.name);
    }
    for (const source of bosses) {
      const c = towerBoonMakeBossCard(source); coreApplyCardBoon(c, bonus);
      const result = simulate(c, { mana: 4, blood: 6, turnLimit: 1 });
      assert.doesNotThrow(() => JSON.stringify(result.events), source.name);
    }
    assert.ok(characters.length > 90); assert.ok(bosses.length > 20);
  });
  check('セーブ→復元：祝福・購入回数・再抽選残数と個体を保持、旧セーブも復元できる', () => {
    fresh(); G._debugMode = false;
    G.gold = 50000;
    G.towerBoons.counts=Object.fromEntries(TOWER_BOON_CONFIG.blessings.map(b=>[b.id,1]));
    G.towerBoons.counts.stats=2;G.towerBoons.purchases=8;
    towerBoonGrantRewardRerolls(); towerBoonGrantRewardRerolls();
    G.mainBoard[1] = towerBoonBlessGeneratedCard(makePanel(def('C006').id));
    const expected = clone(G.towerBoons), individual = clone(G.mainBoard[1]);
    const prices = TOWER_BOON_CONFIG.blessings.map(b => towerBoonChoicePrice(b.id)), gold = G.gold;
    assert.deepEqual(prices, [1000, 500, 500, 500, 500, 500, 500]);
    const save = SaveRun.buildRunSave('reward');
    assert.ok(save); SaveRun.validate(save); SaveRun.restoreRunState(clone(save));
    assert.deepEqual(G.towerBoons, expected); assert.equal(G.towerBoons.rerolls, 2);
    assert.deepEqual(TOWER_BOON_CONFIG.blessings.map(b => towerBoonChoicePrice(b.id)), prices); assert.equal(G.gold, gold);
    assert.deepEqual(G.mainBoard[1], individual);
    const old = clone(save); delete old.state.player.towerBoons;
    SaveRun.restoreRunState(old); assert.deepEqual(G.towerBoons, towerBoonInitialState());
  });
  check('報酬とショップ：生成時だけ祝福、撃破したボスだけが混入する', () => {
    fresh();
    G.towerBoons.counts = Object.fromEntries(TOWER_BOON_CONFIG.blessings.map(b => [b.id, 1]));
    const boss = ENEMY_POOL.find(p => p.bossOnly || p.boss || p.isBoss);
    assert.ok(boss);
    towerBoonRecordBattleDeaths([{ type: 'death', side: 'p2', unitId: 'dead-boss' }], [{ ...boss, id: 'dead-boss', boss: true }]);
    assert.equal(G.towerBoons.defeatedBosses.length, 1);
    const generated = runWithKeyedRandom('boon-offers', () => drawRewards());
    assert.ok(generated.length); generated.forEach(c => assert.deepEqual(c.boon, bonus));
    const stock = _ensureWaveShopStock(); stock.filter(Boolean).forEach(c => assert.deepEqual(c.boon, bonus));
    let seenBoss = false;
    for (let i = 0; i < 100; i++) {
      const c = runWithKeyedRandom('boss-slot:' + i, () => towerBoonGeneratedOffers([makePanel(def('C006').id)]))[0];
      if (c.boss) { seenBoss = true; assert.equal(c.name, boss.name); assert.equal(c.category, 'キャラクター'); assert.deepEqual(c.boon, bonus); }
    }
    assert.ok(seenBoss);
    G.mainBoard[1] = towerBoonMakeBossCard(boss); G._debugMode = false;
    const save = SaveRun.buildRunSave('reward'); SaveRun.validate(save); SaveRun.restoreRunState(save);
    assert.equal(G.mainBoard[1].name, boss.name); assert.deepEqual(G.mainBoard[1].boon, bonus);
  });
  check('施設：祝福の座は出さず、五聖の座のロックと他施設の位置は維持する', () => {
    fresh(); G._isWaveAltar = true; G._debugStoryCycle = 1;
    const list = villageFacilityList();
    assert.equal(list.some(f=>f.key===TOWER_BOON_CONFIG.key),false);
    assert.equal(list.some(f => f.key === 'landing'), false);
    const positions = _villageFacilityPositions(list);
    assert.equal(new Set(positions.map(p => JSON.stringify(p))).size, positions.length);
  });
  await require('../balance_sim/debug_cards_1018c_regression').testDebugCards(api);
  await require('../balance_sim/shop_reroll_1018c_regression').testShopReroll(api,check);
  await require('../balance_sim/run_levels_1018c_regression').testRunLevels(api,check);
  console.log(`\n旧祝福互換・店・レベル検査: ${checked}項目 OK（ブラウザ表示は未確認）`);
})().catch(error => { console.error(error); process.exitCode = 1; });
