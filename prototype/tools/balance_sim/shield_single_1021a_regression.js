'use strict';
// 2026-10-21：結界は有無だけ。旧シート表記も実際の付与・表示・両戦闘入口で検査する。
const assert = require('node:assert/strict');
const { sheetRows } = require('./sheet_data');
require('./load');
global.Image = function () { return require('./stub').makeElement('img'); };
console.table = () => {};
const copy = value => JSON.parse(JSON.stringify(value));
const plain = (id, extra = {}) => ({ id, name: id, atk: 10, hp: 100, maxHp: 100,
  color: '赤', keywords: [], desc: '', ...extra });
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + error.message); }
}
function fixture(raw = {}, side = 'p1', options = {}) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = createBattleState({ sides: {
    [side]: { units: [plain('発動者', raw), plain('結界あり', { shield: 1 }), plain('結界なしA'), plain('結界なしB')] },
    [other]: { units: [plain('相手')] },
  }, summonDefs: PANEL_POOL, ...options });
  const events = [], emit = event => events.push(event);
  // 空配列でpickを呼んだ場合も検出する（乱数実装の空配列ガードに依存しない）。
  const rng = { draws: 0, picks: [], next() { this.draws++; return 0; },
    int(lo, hi) { return lo + Math.floor(this.next() * (hi - lo + 1)); },
    pick(pool) { this.picks.push(pool.map(x => x.id)); return pool.length ? pool[this.int(0, pool.length - 1)] : null; } };
  const hit = (source, target, amount, counter, _s, _t, opt) =>
    coreResolveHit(state, source, target, amount, counter, rng, emit, opt);
  return { state, unit: state.units[side][0], allies: state.units[side], foe: state.units[other][0],
    side, other, events, emit, rng, hit };
}
const gains = events => events.filter(e => e.type === 'shield_set'
  || e.type === 'keyword_effect' && (e.effect === 'shield' || /^結界\s*\d*$/.test(e.keyword || '')));
function mana(f, text, amount = 4) {
  Object.assign(f.unit, { manaCost: 4, manaRepeat: true, manaThresholdDesc: text, desc: '4マナ毎：' + text });
  f.state.resources[f.side].mana = amount;
  coreApplyManaThresholdEffects(f.state, f.rng, f.emit, f.hit);
}

(async () => {
  await loadGameData(); initState();
  check('結界N・重複キーワード・本文・既存の結界値は最大1', () => {
    for (const keyword of ['結界', '結界1', '結界2', '結界99', '結界 3']) {
      assert.equal(coreShieldValueFromKeyword(keyword), 1, keyword);
      const u = createCoreUnit(plain('入力', { keywords: [keyword, '結界5'] }), 'p1', 0);
      assert.equal(u.shield, 1, keyword);
      assert.deepEqual(coreUnitKeywords(u), ['結界']);
      assert.equal(coreUnitShieldValue(u), 1);
      assert.equal(coreKeywordSum(u, '結界'), 1);
    }
    assert.equal(createCoreUnit(plain('本文', { desc: '結界7' }), 'p1', 0).shield, 1);
    assert.equal(createCoreUnit(plain('旧状態', { shield: 8 }), 'p1', 0).shield, 1);
  });
  check('実シートの通常・強化・敵の結界Nと接続エンチャントは1', () => {
    for (const key of ['card', 'enemy']) for (const row of sheetRows(key)) {
      for (const field of ['キーワード', '強化キーワード']) {
        if (!/結界\d*/.test(row[field] || '')) continue;
        assert.equal(createCoreUnit(plain(row['名前'], { keywords: row[field].split(/[\s　]+/) }), 'p1', 0).shield, 1);
      }
    }
    const p = _makePanelSummonUnit({ name: '出撃', atk: 5, hp: 20, keywords: ['結界2'] }, ['結界3']);
    assert.equal(p.shield, 1, '魔導板からの出撃');
  });
  for (const side of ['p1', 'p2']) {
    check(side + ' 開戦・指輪・巻物の重複付与で獲得イベントを増やさない', () => {
      const f = fixture({ desc: '開戦：全ての味方は結界7を得る。' }, side, {
        rings: { [side]: [{ name: '検査指輪', desc: '開戦：全ての敵は結界9を得る。' }] },
        items: { [side]: [{ id: '巻物', itemEffectKey: 'shield_scroll' }] },
      });
      coreApplyOpeningEffects(f.unit, f.state, f.rng, f.emit, f.hit);
      assert.ok(f.allies.every(u => u.shield === 1));
      assert.equal(gains(f.events).length, 3);
      f.events.length = 0;
      coreApplyOpeningEffects(f.unit, f.state, f.rng, f.emit, f.hit, 1);
      coreApplyOpeningItems(f.state, f.rng, f.emit, f.hit);
      assert.equal(gains(f.events).length, 0);
      coreApplyOpeningRings(f.state, f.rng, f.emit, f.hit);
      assert.equal(f.foe.shield, 1);
      f.events.length = 0;
      coreApplyOpeningRings(f.state, f.rng, f.emit, f.hit);
      assert.equal(gains(f.events).length, 0, '指輪の付け直し');
      f.unit.keywords = ['結界9'];
      coreRunOpening(f.state, f.rng, f.emit, f.hit, () => {});
      // 開戦の shield_set は「今の値に揃える」通知なので、持っていても1件・量1で出す（PvE とオンラインの一致のため）。
      const opening = f.events.filter(e => e.type === 'shield_set');
      assert.ok(opening.some(e => e.unitId === f.unit.id), '結界を持つ体の状態通知');
      assert.equal(new Set(opening.map(e => e.unitId)).size, opening.length, '1体につき1件');
      assert.ok(opening.every(e => e.amount === 1), '量は常に1');
      assert.equal(f.unit.shield, 1);
      assert.equal(f.events.filter(e => e.type === 'keyword_effect' && e.effect === 'shield').length, 0, '初期結界を獲得として通知しない');
    });
    check(side + ' 召喚・栄光の歌・光の指輪・復活・変身でも1', () => {
      const f = fixture({ desc: '常時：このキャラクターが召喚したキャラクターは結界9を得る。' }, side, {
        rings: { [side]: [{ name: '光の指輪', desc: '常時：味方の眷属は結界4を得る。' }] },
      });
      const child = coreSummonUnit(f.state, side, { name: '検査眷属', atk: 10, hp: 40, keywords: ['結界3', '復活'] }, f.emit, f.unit.id, undefined, f.rng, f.hit);
      assert.equal(child.shield, 1);
      assert.equal(gains(f.events).length, 0, '結界を持つ召喚体へ歌と指輪の獲得通知を出さない');
      child.shield = 0; child.hp = 0; f.events.length = 0;
      assert.ok(coreTryRevive(child, f.state, f.emit, f.rng, f.hit));
      assert.equal(child.shield, 1);
      assert.equal(gains(f.events).length, 1);
      f.state.summonDefs.push({ name: '変身先', power: 10, life: 50, keywords: ['結界8'], desc: '' });
      coreTransformUnit(f.state, child, '変身先', f.emit);
      assert.equal(child.shield, 1);
      const bare = coreSummonUnit(f.state, side, { name: '無結界の眷属', atk: 10, hp: 40 }, f.emit, f.unit.id, undefined, f.rng, f.hit);
      assert.equal(bare.shield, 1);
      assert.equal(gains(f.events).filter(e => e.unitId === bare.id).length, 1, '歌と指輪は合わせて1回');
    });
    check(side + ' 負傷・解放の結界Nは1、既所持なら獲得通知なし', () => {
      const f = fixture({ name: 'エルフ', desc: '負傷：結界8を得る。' }, side);
      coreApplyInjuryEffects(f.unit, 1, f.state, f.rng, f.emit, f.hit, f.foe);
      assert.equal(f.unit.shield, 1);
      f.events.length = 0;
      coreApplyInjuryEffects(f.unit, 1, f.state, f.rng, f.emit, f.hit, f.foe, 1);
      assert.equal(gains(f.events).length, 0);
      f.unit.desc = '常時：味方が解放された時、このキャラクターは+X/+Xと結界8を得る。Xは血に等しい。';
      coreApplyReleaseEffects(f.allies[2], [], f.state, f.rng, f.emit, f.hit);
      assert.equal(f.unit.shield, 1);
      assert.equal(gains(f.events).length, 0);
      f.unit.shield = 0;
      coreApplyReleaseEffects(f.allies[2], [], f.state, f.rng, f.emit, f.hit);
      assert.equal(f.unit.shield, 1);
      assert.equal(gains(f.events).length, 1);
    });
    check(side + ' 自己マナ効果も実効結界を1つだけ付与する', () => {
      for (const text of ['結界8を得る。', 'このキャラクターは結界を得る。']) {
        const f = fixture({}, side);
        mana(f, text, 12);
        assert.equal(f.unit.shield, 1);
        assert.equal(gains(f.events).length, 1);
      }
    });
    for (const text of ['ランダムな味方は結界8を得る。', 'ランダムな味方に結界を付与する。', 'ランダムな味方3体は結界2を得る。']) {
      check(side + ' マナ：' + text + ' 未所持だけ・全員所持なら乱数なし', () => {
        const f = fixture({ shield: 1 }, side);
        mana(f, text);
        const n = /3体/.test(text) ? 2 : 1;
        assert.equal(gains(f.events).length, n);
        assert.ok(gains(f.events).every(e => ['結界なしA', '結界なしB'].includes(e.unitId) && e.amount === 1));
        assert.equal(f.allies[1].shield, 1);
        f.allies.forEach(u => { u.shield = 1; }); f.events.length = 0;
        const before = f.rng.draws, picks = f.rng.picks.length;
        f.state.resources[side].mana = 8;
        coreApplyManaThresholdEffects(f.state, f.rng, f.emit, f.hit);
        assert.equal(gains(f.events).length, 0);
        assert.equal(f.rng.draws, before);
        assert.equal(f.rng.picks.length, picks);
      });
    }
    for (const trigger of ['死亡', '開戦', '負傷']) {
      check(side + ' ' + trigger + '：複数ランダム付与・反復・候補なしの乱数', () => {
        const f = fixture({ desc: trigger + '：ランダムな味方3体は結界9を得る。これをもう一度繰り返す。', shield: 1 }, side);
        const fire = () => {
          if (trigger === '死亡') { f.unit.hp = 0; delete f.unit._coreDeathEffectsTriggered; coreApplyDeathEffects(f.unit, f.state, f.rng, f.emit, f.hit); }
          if (trigger === '開戦') coreApplyOpeningEffects(f.unit, f.state, f.rng, f.emit, f.hit, String(f.events.length));
          if (trigger === '負傷') coreApplyInjuryEffects(f.unit, 1, f.state, f.rng, f.emit, f.hit, f.foe);
        };
        fire();
        assert.equal(gains(f.events).length, 2);
        assert.deepEqual(gains(f.events).map(e => e.unitId).sort(), ['結界なしA', '結界なしB']);
        assert.ok(f.allies.every(u => u.shield === 1));
        f.events.length = 0; const before = f.rng.draws;
        fire(); assert.equal(gains(f.events).length, 0); assert.equal(f.rng.draws, before);
      });
    }
    check(side + ' ATK比例の開戦付与は未所持から選び、埋まった後は乱数なし', () => {
      const f = fixture({ atk: 20, shield: 1,
        desc: '開戦：ランダムな味方に結界6を付与する。この効果は、このキャラクターのATK1につき1回発生する。' }, side);
      coreApplyOpeningEffects(f.unit, f.state, f.rng, f.emit, f.hit);
      assert.equal(gains(f.events).length, 2); assert.equal(f.rng.draws, 2);
      assert.ok(f.allies.every(u => u.shield === 1));
    });
    check(side + ' 死亡済み・封印中の未所持者は結界の候補にしない', () => {
      const f = fixture({ shield: 1 }, side);
      f.allies[2].hp = 0; f.allies[3]._sealed = true;
      mana(f, 'ランダムな味方3体は結界を得る。');
      assert.equal(gains(f.events).length, 0);
      assert.equal(f.rng.draws, 0); assert.equal(f.rng.picks.length, 0);
    });
  }
  check('1回の被弾で結界が消え、次の被弾はHPに入る', () => {
    const f = fixture({ keywords: ['結界9'] });
    f.hit(f.foe, f.unit, 3); assert.equal(f.unit.hp, 100); assert.equal(f.unit.shield, 0);
    assert.equal(f.events.filter(e => e.type === 'shield_lost').length, 1);
    assert.equal(f.events.find(e => e.type === 'shield_lost').shield, 0);
    f.hit(f.foe, f.unit, 3); assert.equal(f.unit.hp, 97);
  });
  check('表示：カード本文・ホバー・キーワード一覧・指輪・アイテムは結界', () => {
    const c = plain('表示', { keywords: ['結界3', '結界2'], shield: 8,
      desc: '開戦：ランダムな味方に結界2を付与する。' });
    assert.deepEqual(_mergeCountedKeywords(c.keywords), ['結界']);
    assert.deepEqual(_unitDisplayKeywords(c, c.desc, 0), ['結界']);
    assert.deepEqual(_enchantPreviewKeywords({ name: '付与', adjacentKeywords: c.keywords }), ['結界']);
    assert.equal(_rawSubstitutedDesc(c), '開戦：ランダムな味方に結界を付与する。');
    G.phase = 'player';
    for (const html of [computeDesc(c), _formatPreviewHtml(_unitPreviewText(c, c.desc, 0)),
      _formatKeywordOnlyHtml(_keywordOnlyPreviewText(c, c.desc, 0)),
      _unitCombinedDescHtml(c, c.desc, 0), _formatPreviewHtml('盾の巻物\n対象に結界9を永久付与する。'),
      _formatJourneyEnemyHtml('敵', JSON.stringify({ name: '敵', keywords: ['結界3'], desc: c.desc }))]) {
      assert.ok(html.includes('結界')); assert.doesNotMatch(html, /結界\s*(?:\d+|X)/);
    }
    assert.equal(_keywordDescLine('結界'), '結界：このキャラクターはダメージを1回無効化する。');
    assert.doesNotMatch(_itemUsePromptText({ key: 'shield_scroll', card: { name: '盾の巻物' } }), /結界\d/);
    G.phase = 'reward';
  });
  check('盾の巻物の永久付与も保存するキーワードを1つにまとめる', () => {
    initState(); G.mainBoard.fill(null);
    const card = makePanel(PANEL_POOL.find(c => c.no === 'C062').id);
    card.keywords = ['先制', '結界3', '結界2']; G.mainBoard[1] = card;
    for (let i = 0; i < 2; i++) {
      G._pendingItemUse = { key: 'shield_scroll', slotIdx: 0 };
      assert.equal(_handlePendingItemBoardTarget(1), true);
      assert.deepEqual(card.keywords, ['先制', '結界']);
    }
  });
  check('状態表示：旧い結界値でもshield-stateへ渡す重ね数は常に1', () => {
    assert.equal(_battleFxValues(plain('表示', { shield: 9 })).shield, 1);
  });
  check('結界以外のランダムな強化は、結界所持者も選び従来の回数だけ乱数を使う', () => {
    const f = fixture({ atk: 20, shield: 1,
      desc: '開戦：ランダムな味方に+5/+5を付与する。この効果は、このキャラクターのATK10につき1回発生する。' });
    f.allies.forEach(u => { u.shield = 1; });
    coreApplyOpeningEffects(f.unit, f.state, f.rng, f.emit, f.hit);
    assert.equal(f.rng.draws, 2);
    assert.equal(f.unit.atk, 30);
    assert.deepEqual(f.rng.picks, [f.allies.map(u => u.id), f.allies.map(u => u.id)]);
  });
  check('PvEの共有参照入口とsimulateOnlineBattleのイベント・最終結果が一致', () => {
    for (const seed of [1, 7, 1021, 98765]) {
      const setup = { seed, turnLimit: 30, resources: { p1: { mana: 12, gold: 0 }, p2: { mana: 0, gold: 0 } },
        summonDefs: [...PANEL_POOL, ...ENEMY_POOL], itemDefs: ITEM_POOL,
        rings: { p1: [{ name: '光の指輪', desc: '常時：味方の眷属は結界4を得る。' }] },
        sides: { p1: { units: [plain('先頭', { keywords: ['結界9', '復活'] }),
          plain('マナ付与', { manaCost: 4, manaRepeat: true, manaThresholdDesc: 'ランダムな味方は結界6を得る。' }),
          plain('死亡付与', { hp: 8, maxHp: 8, desc: '死亡：ランダムな味方3体は結界2を得る。' })] },
        p2: { units: [plain('敵先頭', { keywords: ['結界3'] }), plain('敵付与', {
          manaCost: 4, manaRepeat: true, manaThresholdDesc: 'ランダムな味方2体は結界を得る。' })] } } };
      // 実際のPvEの受け渡しを通す。Gの盤面と同じ参照を共有し、1手ずつ進める。
      initState(); G._wave = 1; G.rings = copy(setup.rings.p1); G.activeBattleItems = [];
      G.allies = setup.sides.p1.units.map((u, i) => createCoreUnit(copy(u), 'p1', i));
      G.enemies = setup.sides.p2.units.map((u, i) => createCoreUnit(copy(u), 'p2', i));
      G.mana = 12; G.gold = 0; G._blood = 0; G._enemyBlood = 0; _keepPveSummonState({});
      const state = _createPveCoreState(); _stampCoreSideSlots(state);
      assert.equal(state.units.p1, G.allies); assert.equal(state.units.p2, G.enemies);
      const events = [], runner = createBattleRunner(state, createSeededRng(seed), e => events.push(e), { turnLimit: 30 });
      while (!runner.result && state.turn < 30) { if (runner.step()) break; }
      const result = runner.finish();
      const online = simulateOnlineBattle(copy(setup));
      assert.deepEqual(events, online.events);
      assert.deepEqual(battleCoreFinalState(state), online.finalState);
      assert.deepEqual([result.outcome, result.endReason, result.turns], [online.outcome, online.endReason, online.turns]);
      assert.ok(gains(events).length > 0);
      assert.ok(gains(events).every(e => e.amount === 1));
      assert.ok(events.filter(e => e.type === 'shield_lost').every(e => e.shield === 0));
      assert.ok([...state.units.p1, ...state.units.p2].every(u => u.shield === 0 || u.shield === 1));
    }
  });
  console.log(`結界単一1021a：${passed}件成功・${failed}件失敗`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
