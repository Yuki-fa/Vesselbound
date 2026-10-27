'use strict';
// 1027改訂のルール・差分一致は effects_1027_regression.js が開始時mainと検証する。
const {REVISED: revised1027} = require('./effects_1027_regression');

// 内蔵シートを正に、+3/+3の再現・陣営・永久保存・保存戦闘の実再生を検査する。
// ブラウザ／xlsxは使わず、非対象は作業開始時28e8577と全イベント・次の乱数まで比較する。
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const H = require('./rules_1026_harness');
const { assert, sheet, copy, plain, harness, initRun, pipelines } = H;
const BASELINE = '28e8577bad691a09cbc147cf8f14db1de92dfc8f';
const rows = ['card', 'enchant', 'ring'].flatMap(kind => sheet.sheetRows(kind).map(row => ({ kind, ...row })));
const familiarNos = ['C039', 'C044', 'C047', 'C052', 'C077', 'E023', 'E068', 'E069', 'E070', 'R022', 'R034'];
let passed = 0, failed = 0;
async function check(label, fn) {
  try { await fn(); passed++; console.log('OK ' + label); }
  catch (error) { failed++; console.error('NG ' + label + '\n' + error.stack); }
}
function definition(no, enhanced = false) {
  const row = rows.find(r => r['No.'] === no);
  const loaded = PANEL_POOL.find(c => c.no === no) || RING_POOL.find(r => r.no === no);
  assert.ok(loaded || row?.kind === 'ring', no);
  const base = copy(loaded || { no, name: row['名前'], desc: row['効果'] || '' });
  return enhanced ? enhancedPanelCopy(base) || base : base;
}
function subject(no, enhanced = false, extra = {}) {
  const card = definition(no, enhanced);
  const unit = no.startsWith('C')
    ? { ..._makePanelSummonUnit(_panelSummonSpec(card), []), id: no, ...extra }
    : plain(no, { boardCards: [card], _adjacentPanelEffectTexts: [card.desc], ...extra });
  return { ...unit, effectData: { releaseAtkBonus: 0, releaseHpBonus: 0, ...unit.effectData } };
}
const pair = text => text.match(/\+(\d+)\/\+(\d+)/).slice(1).map(Number);
const values = unit => [unit.atk, unit.hp, unit.maxHp];
const buffs = (state, side) => state.gameSummonBuff?.[side] || { atk: 0, hp: 0 };
function summon(h, side = h.side, sourceId = h.u.id, extra = {}) {
  return coreSummonUnit(h.state, side, { name: '検査眷属', atk: 2, hp: 3, _fixedSummonStats: true, ...extra },
    h.emit, sourceId, false, h.rng, h.hit);
}
function injury(h, unit = h.u) { coreApplyInjuryEffects(unit, 1, h.state, h.rng, h.emit, h.hit); }
function death(h, unit = h.u) { unit.hp = 0; coreApplyDeathEffects(unit, h.state, h.rng, h.emit, h.hit); }
function fullInput(own, foes, extra = {}) {
  return harness('p1', own, { foes, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, ...extra }).initial;
}

(async () => {
  console.table = () => {}; await loadGameData();
  await check('眷属の本文を全キャラクター・強化・指輪から列挙（通常と強化、11種）', () => {
    const found = rows.filter(row => /眷属/.test((row['効果'] || '') + (row['強化効果'] || '')));
    assert.deepEqual(found.map(r => r['No.']).sort(), familiarNos.slice().sort());
    for (const row of found) console.log('  ' + row['No.'] + ' ' + row['名前'] + '：'
      + row['効果'] + (row['強化効果'] ? ' ／ 強化：' + row['強化効果'] : ''));
    for (const kind of ['enemy', 'item']) assert.deepEqual(sheet.sheetRows(kind).filter(r =>
      /眷属/.test((r['効果'] || '') + (r['強化効果'] || ''))), []);
  });
  for (const side of ['p1', 'p2']) {
    await check(side + ': ファントム死亡＋エイドロン負傷＋ティアマト1召喚で+3/+3、2・3戦目も1回だけ', () => {
      const h = harness(side, [subject('C039'), subject('C044'), subject('C077'), plain('summoner')]);
      const child = summon(h, side, 'summoner');
      injury(h, h.own.find(u => u.id === 'C044'));
      death(h);
      assert.deepEqual(buffs(h.state, side), { atk: 3, hp: 3 });
      assert.deepEqual(values(child), [5, 6, 6]);
      const persistent = copy(h.state.gameSummonBuff);
      h.own.find(u => u.id === 'C077').hp = 0;
      assert.deepEqual(values(summon(h, side, 'summoner')), [5, 6, 6], '同じ戦闘の後続も合計を1回');
      assert.deepEqual(buffs(h.state, side), { atk: 3, hp: 3 });
      for (const battle of [2, 3]) {
        const next = harness(side, [plain('summoner')], { gameSummonBuff: copy(persistent) });
        assert.deepEqual(values(summon(next)), [5, 6, 6], battle + '戦目は付与元不在でも保持');
        assert.deepEqual(buffs(next.state, side), { atk: 3, hp: 3 }, '戦闘開始で加算し直さない');
        assert.deepEqual(values(summon(next, next.other, 'foe')), [2, 3, 3], '相手陣営へ移らない');
      }
    });
    for (const enhanced of [false, true]) {
      for (const no of ['C039', 'C044', 'C052', 'C077']) await check(side + '/' + no + '/' + enhanced + ': 既存・後続の味方だけ、敵の召喚で累積しない', () => {
        const h = harness(side, [subject(no, enhanced), plain('summoner')]);
        const sourceBefore = values(h.u);
        const enemy = summon(h, h.other, 'foe');
        assert.deepEqual(buffs(h.state, side), { atk: 0, hp: 0 });
        const child = summon(h, side, 'summoner');
        const text = sheet.effectText(no, enhanced);
        let expected = { atk: 0, hp: 0 };
        if (no === 'C039') { death(h); expected = Object.fromEntries(['atk', 'hp'].map((key, i) => [key, pair(text)[i]])); }
        if (no === 'C044') { injury(h); expected.atk = Number(text.match(/ATK\+(\d+)/)[1]); }
        if (no === 'C077') expected.hp = Number(text.match(/HP\+(\d+)/)[1]);
        if (no === 'C052') {
          h.state.resources[side].mana = Number(text.match(/^\d+/)[0]);
          coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit);
          expected.shock = Number(text.match(/衝撃(\d+)/)[1]);
        }
        assert.deepEqual(buffs(h.state, side), expected);
        assert.deepEqual(values(child), [2 + expected.atk, 3 + expected.hp, 3 + expected.hp]);
        assert.deepEqual(values(enemy), [2, 3, 3]);
        if (no === 'C052') assert.equal(coreKeywordSum(child, '衝撃'), expected.shock);
        const before = copy(buffs(h.state, side));
        summon(h, h.other, 'foe');
        assert.deepEqual(buffs(h.state, side), before, '敵の召喚でラン修正を増やさない');
        const future = summon(h, side, 'summoner');
        const mul = no === 'C077' ? 2 : 1;
        assert.deepEqual(values(future), [2 + expected.atk * mul, 3 + expected.hp * mul, 3 + expected.hp * mul]);
        if (no === 'C052') assert.equal(coreKeywordSum(future, '衝撃'), expected.shock);
        if (no !== 'C039') assert.deepEqual(values(h.u), sourceBefore, '初期配置へ眷属修正を足さない');
      });
      for (const no of ['C047', 'E023']) await check(side + '/' + no + '/' + enhanced + ': 味方召喚のみ観測、永久の印も本文どおり', () => {
        const h = harness(side, [subject(no, enhanced, { _mainBoardSlot: 7 }), plain('summoner')]);
        const start = values(h.u), [atk, hp] = pair(sheet.effectText(no, enhanced));
        summon(h, h.other, 'foe');
        assert.deepEqual(values(h.u), start);
        assert.equal(h.events.filter(e => e.reason === 'summon_observer_stats').length, 0);
        summon(h, side, 'summoner'); summon(h, side, 'summoner');
        assert.deepEqual(values(h.u), [start[0] + atk * 2, start[1] + hp * 2, start[2] + hp * 2]);
        const events = h.events.filter(e => e.reason === 'summon_observer_stats');
        assert.equal(events.length, 2); assert.ok(events.every(e => e.side === side));
        assert.ok(events.every(e => !!e.persistent === (no === 'C047')));
        const count = events.length; h.state.frontSlots = h.own.filter(u => u.hp > 0).length;
        assert.equal(summon(h), null);
        assert.equal(h.events.filter(e => e.reason === 'summon_observer_stats').length, count, '拒否は観測しない');
      });
      await check(side + '/' + enhanced + ': 同じ本体・effectDataを重複させず、接続した武威2枚は各1回', () => {
        const own = subject('C047', enhanced, { _mainBoardSlot: 7 });
        const text = sheet.effectText('E023', enhanced);
        own.effectText = own.desc; own.effectData.effectTexts = [own.desc, text, text];
        const h = harness(side, [own]), before = values(h.u);
        summon(h, h.other, 'foe'); assert.deepEqual(values(h.u), before);
        summon(h);
        const a = pair(own.desc), b = pair(text);
        assert.deepEqual(values(h.u), [before[0] + a[0] + b[0] * 2, before[1] + a[1] + b[1] * 2, before[2] + a[1] + b[1] * 2]);
        assert.equal(h.events.filter(e => e.persistent).length, 1);
      });
      for (const no of ['E068', 'E069', 'E070']) await check(side + '/' + no + '/' + enhanced + ': 歌は召喚元だけを参照', () => {
        const h = harness(side, [subject(no, enhanced, { keywords: ['先制', '毒牙2', '貫通'] }), plain('summoner')]);
        const own = summon(h), others = [summon(h, side, 'summoner'), summon(h, h.other, 'foe')];
        const text = definition(no, enhanced).desc;
        if (no === 'E068') {
          const [atk, hp] = pair(text); assert.deepEqual(values(own), [2 + atk, 3 + hp, 3 + hp]);
        } else if (no === 'E069') {
          assert.equal(own.keywords.filter(k => k !== '眷属').length, Number(text.match(/(\d+)つ/)[1]));
        } else assert.ok((own.effectData.effectTexts || []).includes(text.match(/「([^」]+)」/)[1]));
        for (const unit of others) {
          assert.deepEqual(values(unit), [2, 3, 3]); assert.deepEqual(unit.keywords, ['眷属']);
          assert.equal((unit.effectData.effectTexts || []).length, 0);
        }
      });
    }
    await check(side + ': 光・召喚師・鏡の指輪は所有する側だけ、繰返し召喚で二重加算しない', () => {
      for (const mirror of [false, true]) {
        const rings = mirror
          ? [RING_POOL.find(r => r.name === '鏡の指輪'), definition('R034'), definition('R022')]
          : [definition('R022'), definition('R034')];
        const h = harness(side, [plain('summoner')], { rings: { [side]: rings } });
        const [atk, hp] = pair(definition('R034').desc), mul = mirror ? 2 : 1;
        for (let n = 0; n < 2; n++) {
          const child = summon(h);
          assert.deepEqual(values(child), [2 + atk * mul, 3 + hp * mul, 3 + hp * mul]);
          assert.ok(coreUnitHasKeyword(child, '貫通'));
        }
        const enemy = summon(h, h.other, 'foe');
        assert.deepEqual(values(enemy), [2, 3, 3]); assert.equal(coreUnitHasKeyword(enemy, '貫通'), false);
      }
    });
    await check(side + ': 虹の瞳は1色で+3/+3、2色で+6/+6（1戦目から。ラン修正には保存しない）', () => {
      for (const colors of [['赤'], ['赤', '青']]) {
        const h = harness(side, colors.map((color, i) => plain('color' + i, { color })),
          { rings: { [side]: [definition('R032')] } });
        for (let n = 0; n < 2; n++) assert.deepEqual(values(summon(h, side, 'color0', { color: '赤' })),
          [2 + 3 * colors.length, 3 + 3 * colors.length, 3 + 3 * colors.length]);
        assert.deepEqual(buffs(h.state, side), { atk: 0, hp: 0 });
      }
    });
    await check(side + ': 味方全体への+3/+3は眷属にも本文どおり（フォルモール・アンタイオス）', () => {
      for (const no of ['C018', 'C101']) {
        const h = harness(side, [subject(no), plain('summoner', { color: '黄' })]);
        h.u.color = '黄';
        const child = summon(h, side, 'summoner', { color: '赤' });
        injury(h);
        assert.deepEqual(values(child), [5, 6, 6]);
        assert.deepEqual(buffs(h.state, side), { atk: 0, hp: 0 }, '戦闘限りでランへ残らない');
      }
    });
    await check(side + ': ランレベル・報酬成長は新規の眷属を強化せず、旧祝福は倍率だけ', () => {
      const h = harness(side, [plain('summoner')], { runLevels: { [side]: { atk: 7, hp: 9 } },
        runEffects: { [side]: { rewardBuff: { atk: 3, hp: 3 } } } });
      assert.deepEqual(values(summon(h)), [2, 3, 3]);
      const blessed = summon(h, side, h.u.id, { _summonBoon: { famMul: 3 } });
      assert.deepEqual(values(blessed), [6, 9, 9]);
      assert.deepEqual(buffs(h.state, side), { atk: 0, hp: 0 });
    });
    await check(side + ': 熟練による増加は付与時に1回確定し、後の召喚者の熟練で取り直さない', () => {
      const h = harness(side, [subject('C039', false, { keywords: ['熟練2'] }), plain('summoner', { keywords: ['熟練9'] })]);
      const first = summon(h, side, 'summoner'); death(h);
      assert.deepEqual(buffs(h.state, side), { atk: 3, hp: 4 });
      assert.deepEqual(values(first), [5, 7, 7]);
      assert.deepEqual(values(summon(h, side, 'summoner')), [5, 7, 7]);
    });
    await check(side + ': 説明の眷属プレビューは実召喚と一致し、累積値・盤面・乱数を変えない', () => {
      const h = harness(side, [plain('summoner')], { gameSummonBuff: { [side]: { atk: 3, hp: 3 } } });
      const def = { name: '検査眷属', atk: 2, hp: 3, color: '赤' }, before = copy(h.state);
      const preview = corePreviewSummonStats(h.state, side, def, h.u, null);
      assert.deepEqual(copy(h.state), before);
      assert.equal(h.rng.next(), createSeededRng(1026).next(), '説明だけで乱数を使わない');
      const child = coreSummonUnit(h.state, side, def, h.emit, h.u.id, false, h.rng, h.hit);
      assert.deepEqual(preview, { atk: child.atk, hp: child.hp, keywords: coreUnitKeywords(child).filter(k => k !== '眷属') });
    });
    for (const scope of ['味方の', '敵の', '']) for (const dynamic of [false, true]) {
      await check(side + ': 「' + scope + '眷属」の固定／X観測を所有者基準で判定 (' + dynamic + ')', () => {
        const desc = '常時：' + scope + '眷属が召喚されるたび、このキャラクターは'
          + (dynamic ? '+X/+Xを得る。Xは召喚された眷属のATKとHPに等しい。' : '永久に+1/+1を得る。');
        const h = harness(side, [plain('observer', { desc, _mainBoardSlot: 7 })]);
        const start = values(h.u);
        summon(h, h.other, 'foe'); summon(h);
        const times = scope ? 1 : 2;
        assert.deepEqual(values(h.u), [start[0] + times * (dynamic ? 2 : 1),
          start[1] + times * (dynamic ? 3 : 1), start[2] + times * (dynamic ? 3 : 1)]);
      });
    }
    await check(side + ': サイレン通常／強化は本人を対象にしない（動作は変更しない）', () => {
      for (const enhanced of [false, true]) {
        const h = harness(side, [subject('C016', enhanced), plain('ally')]);
        const before = values(h.u);
        coreApplyAttackEffects(h.u, h.state, h.rng, h.emit, h.hit);
        const damage = h.events.filter(e => e.type === 'damage');
        assert.deepEqual(values(h.u), before);
        assert.ok(damage.length > 0 && damage.every(e => e.unitId !== h.u.id));
        assert.deepEqual([...new Set(damage.map(e => e.unitId))].sort(), ['ally', 'foe', 'foe2', 'foe3']);
        if (enhanced) console.log('  既存の範囲外の不一致：強化本文は2回だが現在は各対象1回。本人除外のみ検査し、変更しない。');
      }
    });
  }
  await check('敵の80%は召喚元の現在ATK/最大HP。深層補正を召喚体へ二度掛けず、固定値・旧祝福は除外', () => {
    const def = ENEMY_POOL.find(d => d.baseAtk && d.baseHp);
    for (const floor of [1, 6, 31]) {
      const stats = enemyStats(def, floor);
      const h = harness('p2', [plain('summoner', { ...stats, maxHp: stats.hp })]);
      const child = coreSummonUnit(h.state, 'p2', { name: '検査眷属', atk: 2, hp: 3 }, h.emit, h.u.id, false, h.rng, h.hit);
      assert.deepEqual(values(child), [Math.round(stats.atk * 0.8), Math.max(1, Math.round(stats.hp * 0.8)), Math.max(1, Math.round(stats.hp * 0.8))]);
      assert.deepEqual(values(summon(h)), [2, 3, 3]);
    }
  });
  await check('敵ミテーラ5/5のペリカンは1戦目から4/4（シート1/1との差が+3/+3）。永久加算ではない', () => {
    const base = definition('CF003');
    assert.deepEqual([base.power, base.life], [1, 1]);
    for (const side of ['p1', 'p2']) for (const battle of [1, 2]) {
      const h = harness(side, [subject('C060', false, { atk: 5, hp: 5, maxHp: 5 })]);
      coreApplyOpeningEffects(h.u, h.state, h.rng, h.emit, h.hit);
      const children = h.events.filter(e => e.type === 'summon').map(e => e.unit);
      assert.equal(children.length, 2);
      for (const child of children) assert.deepEqual(values(child), side === 'p2' ? [4, 4, 4] : [1, 1, 1], battle + '戦目');
      assert.deepEqual(buffs(h.state, side), { atk: 0, hp: 0 });
    }
  });
  await check('PvEのG→コア→G・ラン保存を2回復元しても+3/+3のまま。古い保存／新規ランは0', () => {
    initRun(); G.gameSummonBuff = { atk: 3, hp: 3 };
    G.runEffects = { rewardBuff: { atk: 17, hp: 19 } };
    G.towerBoons.counts.familiars = 1;
    const save = SaveRun.buildRunSave('reward');
    for (let n = 0; n < 2; n++) {
      SaveRun.restoreRunState(copy(save));
      G.allies = [createCoreUnit(plain('summoner'), 'p1', 0)]; G.enemies = [createCoreUnit(plain('foe'), 'p2', 0)]; G.mana = 0;
      const state = _createPveCoreState(); _stampCoreSideSlots(state);
      const child = coreSummonUnit(state, 'p1', { name: '検査眷属', atk: 2, hp: 3 }, () => {}, 'summoner');
      assert.deepEqual(values(child), [5, 6, 6], '塔のcounts・報酬成長を直接召喚へ足さない');
      _syncCoreResourcesToG(state); _syncCoreResourcesToG(state);
      assert.deepEqual(G.gameSummonBuff, { atk: 3, hp: 3 });
      assert.deepEqual(buildOnlineSelfFormation().gameSummonBuff.p1, { atk: 3, hp: 3 });
    }
    delete save.state.player.gameSummonBuff; SaveRun.restoreRunState(save);
    assert.deepEqual(G.gameSummonBuff, { atk: 0, hp: 0 });
    G.gameSummonBuff = { atk: 3, hp: 3 }; initState();
    assert.deepEqual(G.gameSummonBuff, { atk: 0, hp: 0 });
    assert.deepEqual(G.runEffects, {}); assert.deepEqual(G.towerBoons.counts, {});
  });
  await check('全眷属効果と+3/+3をPvE・オンライン・SaveRun再計算／圧縮往復／保存フレーム実再生で照合', async () => {
    const army = prefix => ['C047', 'C077', 'C039', 'C044', 'C052', 'C060'].map((no, i) =>
      subject(no, false, { id: prefix + no, atk: 3, hp: 25, maxHp: 25, _mainBoardSlot: i, lane: i < 2 ? 'rear' : 'front' }));
    for (const side of ['p1', 'p2']) {
      const own = army('own'), foes = army('foe');
      own[5]._adjacentPanelEffectTexts = ['E023', 'E068', 'E069', 'E070'].map(no => definition(no).desc);
      const result = await pipelines(fullInput(own, foes, { gameSummonBuff: { [side]: { atk: 3, hp: 3 } },
        rings: { p1: [definition('R022'), definition('R034')], p2: [definition('R022'), definition('R034')] } }));
      assert.deepEqual(G.gameSummonBuff, result.saved.finalState.gameSummonBuff?.p1 || { atk: 0, hp: 0 });
    }
  });
  await check('保存済みの戦闘をチェックポイントから2回再生しても、味方召喚分だけ魔導板へ書き戻す', async () => {
    const initial = fullInput([
      subject('C047', false, { id: 'dullahan', atk: 50, hp: 100, maxHp: 100, _mainBoardSlot: 7, lane: 'rear' }),
      subject('C060', false, { id: 'summoner', atk: 20, hp: 100, maxHp: 100, _mainBoardSlot: 8 }),
    ], [subject('C060', false, { id: 'enemy-summoner', atk: 1, hp: 6, maxHp: 6, _mainBoardSlot: 0 })]);
    const pending = SaveRun.computeBattle(copy(initial), 10261026);
    assert.ok(pending.events.some(e => e.type === 'summon' && e.side === 'p1'));
    assert.ok(pending.events.some(e => e.type === 'summon' && e.side === 'p2'));
    const stats = pending.events.filter(e => e.type === 'stat_change' && e.persistent && e.side === 'p1');
    assert.equal(stats.length, pending.events.filter(e => e.type === 'summon' && e.side === 'p1').length);
    initRun(); G.mainBoard[7] = definition('C047'); G.mainBoard[8] = definition('C060');
    const before = [G.mainBoard[7].power, G.mainBoard[7].life], checkpoint = SaveRun.buildRunSave('battle', pending);
    const flush = _flushCorePveHitEvents, finish = finishBattleAsVictory, compact = requestBattleCompact;
    const present = presentStatChangeEvent, lab = presentLabBeginEvent;
    presentStatChangeEvent = async () => {}; presentLabBeginEvent = async () => {};
    requestBattleCompact = () => {};
    _flushCorePveHitEvents = (state, events, units) => flush(state,
      events.filter(e => e.type === 'stat_change' || e.type === 'summon_buff'), units);
    finishBattleAsVictory = async () => SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
    try {
      for (let n = 0; n < 2; n++) {
        SaveRun.restoreRunState(copy(checkpoint)); SaveRun.installSetup(pending);
        G._battleRunId = 1026; G._battleCoreEvents = [];
        await SaveRun.replay(pending, 1026);
        SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
        assert.deepEqual([G.mainBoard[7].power, G.mainBoard[7].life],
          [before[0] + stats.reduce((sum, e) => sum + e.atk, 0), before[1] + stats.reduce((sum, e) => sum + e.hp, 0)]);
      }
    } finally {
      _flushCorePveHitEvents = flush; finishBattleAsVictory = finish; requestBattleCompact = compact;
      presentStatChangeEvent = present; presentLabBeginEvent = lab;
    }
  });
  await check('デュラハンの永久加算は敵召喚0件・味方召喚だけ実際のPvE／オンライン受け口から魔導板へ保存', async () => {
    const present = presentStatChangeEvent, lab = presentLabBeginEvent, show = showScreen, render = renderField;
    presentStatChangeEvent = async () => {}; presentLabBeginEvent = async () => {}; showScreen = renderField = () => {};
    try {
      for (const enhanced of [false, true]) for (const online of [false, true]) {
        const h = harness('p1', [subject('C047', enhanced, { _mainBoardSlot: 7 }), plain('summoner')]);
        const initial = copy(h.initial), boardCard = definition('C047', enhanced), start = [boardCard.power, boardCard.life];
        initRun(); G.mainBoard[7] = boardCard; G.allies = h.state.units.p1; G.enemies = h.state.units.p2;
        summon(h, 'p2', 'foe');
        assert.equal(h.events.filter(e => e.persistent).length, 0);
        summon(h);
        const events = h.events.filter(e => e.type === 'stat_change');
        if (online) {
          const result = { formations: Object.fromEntries(['p1','p2'].map(side => [side, { units: initial.units[side], rings: [], items: [] }])),
            events: [{ type: 'battle_start', sides: initial.units }, ...copy(events)] };
          beginOnlineVersusField(result);
          try { await playOnlineBattleEvents(result, { onEvent: (ev, ctx) => renderOnlineVersusBoard(ev, ctx) }); }
          finally { hideOnlineVersusBoard(); }
        } else await _flushCorePveHitEvents(h.state, events, new Set(h.own));
        const gain = pair(sheet.effectText('C047', enhanced));
        assert.deepEqual([G.mainBoard[7].power, G.mainBoard[7].life], [start[0] + gain[0], start[1] + gain[1]]);
        const save = SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(copy(save));
        assert.deepEqual([G.mainBoard[7].power, G.mainBoard[7].life], [start[0] + gain[0], start[1] + gain[1]]);
      }
    } finally { presentStatChangeEvent = present; presentLabBeginEvent = lab; showScreen = show; renderField = render; }
  });
  await check('作業開始時28e8577と全シートの通常／強化・両陣営が結果／全イベント／最終状態／次の乱数まで完全一致', () => {
    const source = execFileSync('git', ['show', BASELINE + ':prototype/js/battle/core.js'], { encoding: 'utf8', maxBuffer: 2e6 });
    const sandbox = { module: { exports: {} } }; vm.runInNewContext(source, sandbox);
    const baseline = sandbox.module.exports, current = require('../../js/battle/core');
    const run = (api, input) => {
      const state = api.createBattleState(copy(input)), events = [], rng = createSeededRng(261026);
      const result = api.runBattleCore(state, rng, { turnLimit: 6, onEvent: e => events.push(e) });
      return copy({ result, events, finalState: api.battleCoreFinalState(state), nextRandom: rng.next() });
    };
    let compared = 0;
    // 現行カードは対象も含めて維持できる。新たに扱う「敵の眷属」本文は現行シートに無い。
    // 新実装の指輪はitems_1026_regressionで検証し、旧版との一致は非対象だけに適用する。
    for (const row of rows.filter(row=>!['R017','R019','R024','R030','R037'].includes(row['No.'])&&!revised1027.has(row['No.']))) for (const enhanced of row.kind === 'ring' ? [false] : [false, true]) for (const side of ['p1', 'p2']) {
      if(row['No.']==='C016'&&enhanced) continue; // effects-1026c: 強化サイレンは2波
      const other = side === 'p1' ? 'p2' : 'p1';
      const own = row.kind === 'ring' ? plain('subject') : subject(row['No.'], enhanced, { id: 'subject', atk: 10, hp: 70, maxHp: 70 });
      const input = { sides: { [side]: { units: [own, plain('ally')] }, [other]: { units: [plain('foe', { hp: 5, maxHp: 5 }), plain('foe2')] } },
        resources: { p1: { mana: 8, gold: 800 }, p2: { mana: 8, gold: 800 } }, summonDefs: [...PANEL_POOL, ...ENEMY_POOL],
        ...(row.kind === 'ring' ? { rings: { [side]: [definition(row['No.'])] } } : {}) };
      assert.deepEqual(run(current, input), run(baseline, input), row['No.'] + '/' + enhanced + '/' + side); compared++;
    }
    assert.equal(compared,rows.filter(row=>!['R017','R019','R024','R030','R037'].includes(row['No.'])&&!revised1027.has(row['No.'])).reduce((n,row)=>n+(row.kind==='ring'?2:row['No.']==='C016'?2:4),0)); console.log('  ' + compared + 'ケース完全一致（新実装の指輪と1026c・1027改訂分を除く）');
  });
  console.log('眷属1026: OK ' + passed + ' / NG ' + failed); process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
