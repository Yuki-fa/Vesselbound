'use strict';

// 2026-10-26 利用者報告。内蔵シートは参照だけにし、変更予定の本文は個体のコピーで検査する。
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const H = require('./rules_1026_harness');
const { assert, sheet, copy, plain, harness, initRun, pipelines } = H;
const { makeElement } = require('./stub');
// 作業開始時のmain（以後mainが進んでも基準を動かさない）。
const BASELINE = 'd764b01fa5bc87347b4162f638cc6ca01dd0aaeb';
const REVISED = new Set('C014 C049 C052 C080 C100 E037'.split(' '));
let passed = 0, failed = 0;
async function check(label, run) {
  if (process.env.VB_ONLY && !new RegExp(process.env.VB_ONLY).test(label)) return;
  try { await run(); passed++; console.log('OK ' + label); }
  catch (error) { failed++; console.error('NG ' + label + '\n' + error.stack); }
}
function card(no, enhanced = false, desc) {
  const def = PANEL_POOL.find(c => c.no === no); assert.ok(def, no);
  let c = makePanel(def.id);
  if (enhanced) c = enhancedPanelCopy(c);
  if (desc != null) c.desc = desc;
  return c;
}
function unit(no, enhanced = false, extra = {}, desc) {
  const c = card(no, enhanced, desc);
  return { ..._makePanelSummonUnit(_panelSummonSpec(c), []), id: no,
    effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 }, ...extra };
}
function mana(h, amount = 2) {
  h.state.resources[h.side].mana = amount;
  coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit);
}
function child(h, extra = {}) {
  return coreSummonUnit(h.state, h.side, { name: '青スケルトン', ...extra },
    h.emit, h.u.id, false, h.rng, h.hit);
}
function board(entries) {
  initRun(); G.mainBoard.fill(null); G.mapPanelPowers = {}; G.allies = []; G.enemies = [];
  _pveOpeningSummonState = null; _pveLiveCoreState = null;
  for (const [index, c] of entries) G.mainBoard[index] = c;
}
// 本番のPvE出撃入口を通す。オンラインの送信値も同じ魔導板から組み立てて比較する。
async function boardInitial(entries, extra = {}) {
  board(entries); Object.assign(G, extra);
  const payload = buildOnlineSelfFormation();
  await applyNewPanelBattleStart({ deferOpeningEffects: true, persistEternal: false });
  G.allies = G.allies.filter(Boolean);
  for (const u of G.allies) {
    const sent = payload.units.find(p => p._mainBoardSlot === u._mainBoardSlot);
    assert.ok(sent, '全出撃体がpayloadに存在する');
    assert.deepEqual([u.color, u.desc, u.atk, u.hp, u.keywords], [sent.color, sent.desc, sent.atk, sent.hp, sent.keywords]);
    u.id = sent.id;
  }
  G.enemies = [createCoreUnit(plain('foe', { atk: 1, hp: 90, maxHp: 90 }), 'p2', 0)];
  G.mana = 0; G.activeBattleItems = [];
  const state = _createPveCoreState(); _stampCoreSideSlots(state);
  // オンライン入口と同じ正規化を施し、未指定のfalse/0とeffectDataの既定値も揃えて全イベントを比べる。
  for (const side of ['p1', 'p2']) state.units[side] = state.units[side].map((u, i) => createCoreUnit({ ...u,
    effectData: { releaseAtkBonus: 0, releaseHpBonus: 0, ...u.effectData } }, side, i));
  return { initial: SaveRun.copy(state), payload };
}
function fiveColors(enhanced = false) {
  return [[1, card('C100', enhanced)], [3, card('C006')], [10, card('C026')], [12, card('C051')], [14, card('C101')]];
}

// ブラウザを使わず、実際のrenderRewCards/_mkRewDivが作るクラス・クリック・dragstartを検査する。
function element(tag = 'div') {
  const el = makeElement(tag), classes = new Set(), listeners = {};
  Object.defineProperty(el, 'className', { get: () => [...classes].join(' '), set: s => { classes.clear(); String(s).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); } });
  el.classList = { add: (...cs) => cs.forEach(c => classes.add(c)), remove: (...cs) => cs.forEach(c => classes.delete(c)),
    contains: c => classes.has(c), toggle: (c, on) => { const yes = on == null ? !classes.has(c) : on; yes ? classes.add(c) : classes.delete(c); return yes; } };
  el.addEventListener = (kind, fn) => { (listeners[kind] ||= []).push(fn); };
  el.fire = kind => { const event = { prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() {} }; listeners[kind]?.forEach(fn => fn(event)); return event; };
  el.matches = selector => selector.split(',').some(s => s.trim().startsWith('.') && classes.has(s.trim().slice(1)));
  Object.defineProperty(el, 'innerHTML', { get: () => '', set: () => { el.children.length = 0; } });
  return el;
}
async function rewardExchange() {
  const original = { create: document.createElement, get: document.getElementById,
    mkCardEl, renderHandEditor, renderRewCards, _playActivationFx, applyCardVisual };
  const section = element(), row = element();
  try {
    document.createElement = element;
    document.getElementById = id => id === 'reward-offer-section' ? section : id === 'reward-offer-row' ? row : null;
    mkCardEl = () => element(); renderHandEditor = () => {}; _playActivationFx = () => {}; applyCardVisual = () => {};
    for (const enhanced of [false, true]) for (const picked of [false, true]) {
      board([[1, card('C080', enhanced)], [3, card('C006')]]);
      G._rewardOnePickMode = true; G._freeRewardPanelMode = true;
      _rewCards = [card('C008'), card('C009')].map(c => ({ ...c, _isOriginalReward: true, _buyPrice: 0 }));
      _rewFreePickDone = false; _pendingCardActivation = null;
      if (picked) { takeRewCard(0, 10); assert.equal(_rewFreePickDone, true); }
      const count = G.mainBoard.filter(Boolean).length, gold = G.gold, source = G.mainBoard[1], outgoing = G.mainBoard[3];
      source._activationReady = true;
      cardActivationClick(1); handleCardActivationTarget(3);
      const rewIdx = _rewCards.findIndex(Boolean), incoming = _rewCards[rewIdx];
      assert.ok(cardActivationRewardTargetable(incoming));
      renderRewCards(); const target = row.children.find(el => el.dataset.mergeRewIdx === String(rewIdx));
      assert.ok(target && target.classList.contains('card-activation-target'));
      assert.ok(!target.classList.contains('reward-used-dim'));
      assert.ok(!target.classList.contains('activation-target-disabled'));
      assert.equal(typeof target.onclick, 'function');
      if (picked) { assert.equal(target.draggable, false); assert.ok(target.fire('dragstart').prevented, '取得済み報酬はドラッグ取得できない'); }
      target.onclick({ stopPropagation() {} });
      assert.equal(G.mainBoard[3].no, incoming.no); assert.equal(_rewCards[rewIdx].no, outgoing.no);
      assert.equal(_rewCards[rewIdx]._isOriginalReward, true); assert.equal(_rewFreePickDone, picked);
      assert.equal(G.mainBoard.filter(Boolean).length, count); assert.equal(G.gold, gold);
      if (picked) {
        renderRewCards(); const locked = row.children.find(el => el.dataset.mergeRewIdx === String(rewIdx));
        assert.ok(locked.classList.contains('reward-used-dim')); assert.equal(locked.onclick, null);
        takeRewCard(rewIdx, 12); assert.equal(G.mainBoard[12], null); assert.equal(G.mainBoard.filter(Boolean).length, count);
      }
      // 戦闘へ渡る編成と保存ランにも、交換後の同じ個体・枚数が残る。
      const saved = SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(copy(saved));
      assert.equal(G.mainBoard.filter(Boolean).length, count); assert.equal(G.mainBoard[3].no, incoming.no);
      assert.ok(buildOnlineSelfFormation().units.some(u => u._mainBoardSlot === 3 && u.no === incoming.no));
      const next = await boardInitial(G.mainBoard.flatMap((c, i) => c ? [[i, c]] : []));
      await pipelines(next.initial);
    }
  } finally {
    document.createElement = original.create; document.getElementById = original.get;
    mkCardEl = original.mkCardEl; renderHandEditor = original.renderHandEditor; renderRewCards = original.renderRewCards;
    _playActivationFx = original._playActivationFx; _pendingCardActivation = null; _rewCards = []; _rewFreePickDone = false;
    applyCardVisual = original.applyCardVisual;
  }
}

async function unchangedMain() {
  const source = execFileSync('git', ['show', `${BASELINE}:prototype/js/battle/core.js`], { encoding: 'utf8', maxBuffer: 2e6 });
  const sandbox = { module: { exports: {} } }; vm.runInNewContext(source, sandbox);
  const baseline = sandbox.module.exports, current = require('../../js/battle/core'); let compared = 0;
  function run(api, input, seed) {
    const state = api.createBattleState(copy(input)), events = [], rng = createSeededRng(seed);
    const result = api.runBattleCore(state, rng, { turnLimit: 6, onEvent: e => events.push(e) });
    return copy({ result, events, finalState: api.battleCoreFinalState(state), nextRandom: rng.next() });
  }
  for (const row of [...sheet.sheetRows('card'), ...sheet.sheetRows('enchant')]) {
    if (REVISED.has(row['No.'])) continue;
    const def = PANEL_POOL.find(c => c.no === row['No.']); if (!def) continue;
    for (const enhanced of [false, true]) for (const side of ['p1', 'p2']) for (const seed of [1, 1026, 261026]) {
      const c = { ...copy(def), desc: enhanced && row['強化効果'] || row['効果'] || '' };
      const own = def.category === 'キャラクター'
        ? { ..._makePanelSummonUnit(_panelSummonSpec(c), []), id: 'subject', atk: 10, hp: 70, maxHp: 70 }
        : plain('subject', { _adjacentPanelEffectTexts: [c.desc], boardCards: [c] });
      const other = side === 'p1' ? 'p2' : 'p1';
      const input = { sides: { [side]: { units: [own, plain('ally')] }, [other]: { units: [plain('foe', { hp: 5, maxHp: 5 }), plain('foe2')] } },
        resources: { p1: { mana: 8, gold: 800 }, p2: { mana: 8, gold: 800 } }, summonDefs: PANEL_POOL };
      assert.deepEqual(run(current, input, seed), run(baseline, input, seed), `${row['No.']}/${enhanced}/${side}/${seed}`); compared++;
    }
  }
  for (const ring of RING_POOL.filter(r => r._implemented !== false)) {
    const input = { sides: { p1: { units: [plain('one'), plain('two')] }, p2: { units: [plain('foe'), plain('foe2')] } },
      rings: { p1: [ring] }, resources: { p1: { mana: 15, gold: 800 } }, summonDefs: PANEL_POOL };
    assert.deepEqual(run(current, input, 1026), run(baseline, input, 1026), ring.no); compared++;
  }
  assert.ok(compared > 2400); console.log(`  非対象${compared}戦闘：main ${BASELINE.slice(0, 7)} と結果・全イベント・最終状態・次の乱数が完全一致`);
}

(async () => {
  console.table = () => {}; await loadGameData();
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    await check(`${side}/${enhanced}: 懺悔の各1回→追加攻撃→次の1回、本来の攻撃、再入なし`, async () => {
      const penance = card('E037', enhanced), count = Number(penance.desc.match(/(\d+)回/)[1]);
      const u = unit('C014', false, { atk: 2, hp: 100, maxHp: 100, boardCards: [penance], _adjacentPanelEffectTexts: [penance.desc] });
      const h = harness(side, [u], { foes: [plain('foe', { atk: 1, hp: 90, maxHp: 90 })] });
      h.state._coreFirstSide = side;
      createBattleRunner(h.state, h.rng, h.emit, { skipOpening: true }).step();
      const order = h.events.flatMap(e => e.type === 'damage' && e.unitId === u.id && e.damageKind === 'attack_effect'
        ? ['自傷'] : e.type === 'attack' && e.attackerId === u.id ? [e.immediate ? '追加攻撃' : '本来の攻撃'] : []);
      assert.deepEqual(order, [...Array.from({ length: count }, () => ['自傷', '追加攻撃']).flat(), '本来の攻撃']);
      assert.equal(h.u.hp, 100 - count - (count + 1)); assert.equal(h.u._coreSelfDamageResolving, undefined);
      const attacks = h.events.filter(e => e.type === 'attack');
      assert.equal(presentPreAttackPlan(h.events, 0).event, attacks.at(-1));
      presentResetLabEvents();
      const api = { findUnit:(s,id) => h.state.units[s].find(u => u.id === id) };
      for (let i = 0; i < h.events.length; i++) if (h.events[i].type === 'effect_flash' && h.events[i].trigger === 'injury'
        && h.events.slice(i + 1).some(e => e.type === 'attack' && e.immediate)) {
        const plan = _presentLab1012Plan('C014',h.events[i],h.events,i,api,{card:u});
        assert.ok(plan && plan.members.some(e => e.type === 'attack' && e.immediate), '追加攻撃前の発光を越えてミノタウロスの共通演出へ接続する');
      }
      presentResetLabEvents();
      for (let i = 0; i < h.events.length; i++) if (h.events[i].type === 'damage' && h.events[i].damageKind === 'attack_effect') {
        assert.equal(presentDamageSfxBatch(h.events, i).length, 1, '追加攻撃をまたいで自傷を1波へまとめない');
      }
      const full = harness(side, [u], { foes: [plain('foe', { atk: 1, hp: 90, maxHp: 90 })] });
      await pipelines(full.initial);
    });
    await check(`${side}/${enhanced}: 味方の死亡効果の追加・本人・複数・旧本文・資源`, async () => {
      const amount = enhanced ? 2 : 1, text = `常時：味方の死亡効果は${amount}回追加で発動する。`;
      for (const self of [false, true]) for (const copies of [1, 2]) {
        const providers = Array.from({ length: copies }, (_, i) => unit('C049', enhanced, { id: 'lich' + i }, text));
        const actor = self ? providers[0] : plain('actor');
        actor._adjacentPanelEffectTexts = ['死亡：7ゴールドを得る。', '死亡：「青スケルトン」を召喚する。'];
        const own = self ? providers : [actor, ...providers];
        const h = harness(side, own, { resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
        h.hit(h.foes[0], h.u, 10000, false, true);
        assert.equal(h.state.resources[side].gold, 7 * (1 + copies * amount));
        assert.equal(h.events.filter(e => e.type === 'summon').length, 1 + copies * amount);
      }
      const old = unit('C049', enhanced, { _adjacentPanelEffectTexts: ['死亡：7ゴールドを得る。'] }, `常時：このキャラクターの死亡効果は${amount}回追加で発動する。`);
      const h = harness(side, [old, plain('other', { desc: '死亡：7ゴールドを得る。' })]);
      const before = h.state.resources[side].gold;
      h.hit(h.foes[0], h.own[1], 10000, false, true); assert.equal(h.state.resources[side].gold - before, 7);
      h.hit(h.foes[0], h.u, 10000, false, true); assert.equal(h.state.resources[side].gold - before, 7 * (2 + amount));
      const full = harness(side, [unit('C049', enhanced, {}, text), plain('dying', { hp: 1, maxHp: 1, desc: '死亡：7ゴールドを得る。' })]);
      await pipelines(full.initial);
      for (const unavailable of ['封印','死亡済み','沈黙']) {
        const h = harness(side,[plain('dying',{desc:'死亡：7ゴールドを得る。'}),unit('C049',enhanced,{},text)]);
        if(unavailable==='封印')h.own[1]._sealed=true;
        if(unavailable==='死亡済み')h.own[1].hp=0;
        if(unavailable==='沈黙')coreSilenceUnit(h.own[1]);
        const gold=h.state.resources[side].gold;h.hit(h.foes[0],h.u,10000,false,true);
        assert.equal(h.state.resources[side].gold-gold,7,unavailable+'の付与元は数えない');
      }
    });
    await check(`${side}/${enhanced}: サンダーバード後のCF001は本来＋付与の衝撃、復活・次戦闘でも同じ`, async () => {
      const h = harness(side, [unit('C052', enhanced)]), existing = child(h);
      const base = coreKeywordSum(PANEL_POOL.find(c => c.no === 'CF001'), '衝撃'), gain = enhanced ? 2 : 1;
      assert.equal(coreKeywordSum(existing, '衝撃'), base);
      mana(h); const after = child(h);
      for (const c of [existing, after]) {
        assert.equal(coreKeywordSum(c, '衝撃'), base + gain);
        const target = h.foes[0], before = target.weaken;
        h.hit(c, target, 1); assert.equal(target.weaken - before, base + gain, '実際の命中で与える弱体も合計');
      }
      mana(h, 20); assert.equal(h.events.filter(e => e.type === 'summon_buff').length, 1);
      after.keywords.push('復活'); h.hit(h.foes[0], after, 10000, false, true);
      assert.ok(after.hp > 0); assert.equal(coreKeywordSum(after, '衝撃'), base + gain);
      const next = harness(side, [plain('summoner')], coreGameSummonBuffFields(h.state.gameSummonBuff));
      assert.equal(coreKeywordSum(child(next), '衝撃'), base + gain);
      const full = harness(side, [unit('C052', enhanced, { manaOnAttack: 2 }), unit('C036', false, { id: 'summoner' })],
        { resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
      await pipelines(full.initial);
    });
  }
  await check('チェンジリング：無料取得の前後とも実際の報酬DOMから交換でき、再取得で枚数は増えない', rewardExchange);
  await check('サンダーバード：図書館・デバッグの試験戦闘中だけ累積し、終了時はランの記録を戻す', async () => {
    const old = { startBattle, onBattleEnd, openMapLibraryFormation, showScreen };
    try {
      // 計算は実コアを呼ぶ。画面遷移から戦闘ループの自動開始だけを止める。
      startBattle = () => { G.phase = 'enemy'; }; onBattleEnd = async () => {}; openMapLibraryFormation = () => {}; showScreen = () => {};
      for (const library of [false, true]) {
        await boardInitial([[1, card('C052')], [3, card('C036')]]);
        G.phase = 'reward'; G._debugMode = !library; G._isLibrary = library;
        G.gameSummonBuff = { atk: 0, hp: 0, shock: 2 };
        const original = copy(G.gameSummonBuff);
        startTestBattle(); assert.equal(G._testBattleMode, true);
        assert.equal(G._libraryTestBattleMode, library);
        const state = _createPveCoreState(); _stampCoreSideSlots(state);
        const events = [], rng = createSeededRng(1026), emit = e => events.push(e);
        const hit = (s,t,n,c,ss,st,o) => coreResolveHit(state,s,t,n,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...o});
        state.resources.p1.mana = 2; coreApplyManaThresholdEffects(state,rng,emit,hit);
        const summoned = coreSummonUnit(state,'p1',{name:'青スケルトン'},emit,'self-3',false,rng,hit);
        assert.equal(coreKeywordSum(summoned,'衝撃'),4);
        _syncCoreResourcesToG(state); assert.equal(G.gameSummonBuff.shock,3);
        presentResetSummonPreview();
        assert.ok(_plainEffectTextForPreview(G.mainBoard[3]).includes('衝撃4を持つ'));
        await _exitTestBattle();
        assert.equal(G._testBattleMode,false); assert.deepEqual(G.gameSummonBuff,original);
        assert.deepEqual(SaveRun.buildRunSave('reward').state.player.gameSummonBuff,original);
      }
    } finally { Object.assign(globalThis,old); presentResetSummonPreview(); }
  });
  await check('眷属の説明：魔導板・報酬・戦闘ツールチップで全キーワードを合算し、発動した時点で進める', () => {
    board([[1, card('C036')]]); const owner = G.mainBoard[1];
    const def = PANEL_POOL.find(c => c.no === 'CF001'), original = copy(def.keywords);
    const before = JSON.stringify(G.gameSummonBuff);
    try {
      for (const [native, shock, text] of [[[], 1, '衝撃1を持つ'], [['衝撃1'], 2, '衝撃3を持つ'],
        [['復活', '結界1', '結界2'], 2, '復活と結界と衝撃2を持つ'], [['毒牙1', '毒牙2', '先制'], 1, '毒牙3と先制と衝撃1を持つ']]) {
        def.keywords = native; G.gameSummonBuff = { atk: 0, hp: 0, shock }; G.phase = 'reward';
        const rewardCard = card('C036'), live = unit('C036', false, { side: 'p1' }), rng = G._runRngState;
        assert.ok(_plainEffectTextForPreview(owner, _getPartyBoardUnit()).includes(text));
        assert.ok(_plainEffectTextForPreview(rewardCard).includes(text), '報酬カード');
        G.allies = [live]; G.phase = 'enemy'; presentResetSummonPreview();
        assert.ok(_unitPreviewText(live, _plainEffectTextForPreview(live), 0).includes(text));
        assert.equal(G._runRngState, rng, '説明文は乱数を使わない');
      }
      def.keywords = ['衝撃1'];
      const state = { gameSummonBuff: { p1: { atk: 0, hp: 0, shock: 3 } } };
      const events = [{ type: 'summon_buff', side: 'p1', atk: 0, hp: 0, totalAtk: 0, totalHp: 0, shock: 1, gameTotalShock: 1 },
        { type: 'summon_buff', side: 'p1', atk: 0, hp: 0, totalAtk: 0, totalHp: 0, shock: 2, gameTotalShock: 3 }];
      presentSetSummonPreviewState(state, events);
      const preview = () => _plainEffectTextForPreview(owner);
      assert.ok(preview().includes('衝撃1を持つ')); presentAdvanceSummonPreview(events[0]);
      assert.ok(preview().includes('衝撃2を持つ')); presentAdvanceSummonPreview(events[1]);
      assert.ok(preview().includes('衝撃4を持つ')); presentAdvanceSummonPreview(events[1]);
      assert.ok(preview().includes('衝撃4を持つ'), '同じイベントを二重加算しない');
    } finally { def.keywords = original; G.gameSummonBuff = JSON.parse(before); presentResetSummonPreview(); }
  });
  for (const enhanced of [false, true]) {
    await check(`エレメンタル/${enhanced}: 実際の魔導板→PvE出撃・オンラインpayload・保存再生、色変更・封印`, async () => {
      const formed = await boardInitial(fiveColors(enhanced));
      assert.equal(new Set(formed.payload.units.map(u => u.color)).size, 5);
      const run = await pipelines(formed.initial), amount = enhanced ? 6 : 3;
      assert.ok(run.events.some(e => e.effect === 'weaken' && e.sourceId === 'self-1' && e.amount === amount));
      // 色の付いたエンチャントは味方の体として数えない。起動等で変わったキャラの現在色は数える。
      const entries = fiveColors(enhanced); entries[4][1].color = '赤'; entries.push([0, { ...card('E001'), color: '紫' }]);
      const four = await boardInitial(entries), missing = harness('p1', four.initial.units.p1, { foes: [plain('foe')], resources: { p1: { mana: 0 } } });
      createBattleRunner(missing.state, missing.rng, missing.emit);
      assert.ok(!missing.events.some(e => e.effect === 'weaken' && e.sourceId === 'self-1'));
      const changed = fiveColors(enhanced); changed[4][1].color = '緑'; changed[3][1].color = '紫';
      const recolored = await boardInitial(changed), h = harness('p1', recolored.initial.units.p1);
      createBattleRunner(h.state, h.rng, h.emit); assert.ok(h.events.some(e => e.effect === 'weaken' && e.sourceId === 'self-1'));
      const sealedEntries = fiveColors(enhanced); sealedEntries[4][1].keywords = ['封印2'];
      const sealed = await boardInitial(sealedEntries), locked = harness('p1', sealed.initial.units.p1, { blood: { p1: 0 } });
      createBattleRunner(locked.state, locked.rng, locked.emit); assert.ok(!locked.events.some(e => e.effect === 'weaken' && e.sourceId === 'self-1'));
      // 実際のPvE開戦の受け口でも、全出撃後の5色を読める。
      await boardInitial(fiveColors(enhanced)); G._battleCoreEvents = [];
      await _finishNewPanelBattleStartEffects();
      assert.ok(G._battleCoreEvents.some(e => e.effect === 'weaken' && e.sourceId === 'self-1' && e.amount === amount));
    });
  }
  await check('エレメンタル：同じ開戦中の奪取で5色になった直後も、古い味方配列を数えない', async () => {
    const extra = ['開戦：このキャラクターの死亡効果を発動する。', '死亡：ランダムな前衛の敵を奪う。'];
    const entries = fiveColors().filter(([i]) => i !== 10);
    // 検査個体だけへ付与本文を載せ、本番の魔導板変換にも落とさず渡す。
    entries[0][1].desc += '\n' + extra.join('\n');
    const formed = await boardInitial(entries);
    formed.initial.units.p2.unshift(createCoreUnit(plain('blue', { color: '青', atk: 1, hp: 30, maxHp: 30 }), 'p2', 0));
    const h = harness('p1', formed.initial.units.p1, { foes: formed.initial.units.p2 });
    h.rng.pick = list => list[0]; createBattleRunner(h.state, h.rng, h.emit);
    assert.ok(h.events.some(e => e.type === 'unit_stolen'));
    assert.equal(new Set(h.state.units.p1.filter(u => u.hp > 0).map(u => u.color)).size, 5);
    assert.ok(h.events.some(e => e.effect === 'weaken' && e.sourceId === 'self-1'));
    assert.ok(h.events.filter(e => e.effect === 'weaken' && e.sourceId === 'self-1').every(e => e.side === 'p2'), '奪った体は敵の対象からも外す');
    await pipelines(formed.initial);
  });
  await check('非対象カード・指輪は開始時mainのコアと完全一致', unchangedMain);
  console.log(`fixes_1026b: OK ${passed} / NG ${failed}`); process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

module.exports = { REVISED };
