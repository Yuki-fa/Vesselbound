'use strict';
const {compareBeforeDecision,reportDecisionComparison}=require('./victory_1027_compare');
// 1027改訂のルール・差分一致は effects_1027_regression.js が開始時mainと検証する。
const {REVISED: revised1027} = require('./effects_1027_regression');

// 本番の内蔵CSV→loader→使用／編成→共通コア→保存・再生を通す。ブラウザの見た目は検査しない。
const { assert, sheet, copy, plain, harness, initRun, pipelines } = require('./rules_1026_harness');
const fs = require('node:fs'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { makeElement } = require('./stub');
// 作業開始時のitems-1026（mainとの差は、既存fixes1026bの修正を含む）。
const BASELINE = '7c3e3f095364578507ffe483c6fb4dd433edaa63';
let passed = 0, failed = 0;
async function check(label, fn) {
  try { await fn(); passed++; console.log('OK ' + label); }
  catch (e) { failed++; console.error('NG ' + label + '\n' + e.stack); }
}
const ring = no => copy(RING_POOL.find(r => r.no === no));
const itemDef = no => ITEM_POOL.find(i => 'I' + String(i.no).padStart(3, '0') === no);
const item = (no, x = 2) => makeItem(itemDef(no).id, x);
function board() {
  initRun(); G.mainBoard.fill(null); G.spellSlots.fill(null);
  G.mainBoard[1] = { ...makePanel('ノーム'), desc: '', keywords: [], power: 5, life: 20, directions: ['up'], directionCount: 1 };
  G.mainBoard[2] = makePanel('剣技');
  return G.mainBoard[1];
}
function use(no, x) {
  const scroll = item(no, x); G.spellSlots[0] = scroll;
  assert.equal(_canUseItemNow(scroll), true, no + ' を使える');
  assert.equal(_useImmediateItem(0, scroll), true);
  return scroll;
}
function select(no, x) {
  use(no, x); assert.ok(G._pendingItemUse); assert.equal(_isItemUseTargetSlot(2), false, '強化カードは対象外');
  handlePendingItemBoardTarget(2); assert.ok(G.spellSlots[0]);
  handlePendingItemBoardTarget(1); assert.equal(G._pendingItemUse, null); assert.equal(G.spellSlots[0], null);
  return G.mainBoard[1];
}
function opening(h) { coreRunOpening(h.state, h.rng, h.emit, h.hit, () => {}); }
function formed(side = 'p1') {
  const entry = buildBoardFormation(_getPartyBoardUnit()).ordered.find(e => e.slotIdx === 1);
  assert.ok(entry, '付与した魔導板カードが出撃する');
  return createCoreUnit({ ...entry.unit, id: 'source' }, side, 0);
}
function element(tag) {
  const el = makeElement(tag), classes = new Set(), props = new Map();
  el.classList = { add(...xs) { xs.forEach(x => classes.add(x)); }, remove(...xs) { xs.forEach(x => classes.delete(x)); },
    contains: x => classes.has(x), toggle(x, on = !classes.has(x)) { if (on) classes.add(x); else classes.delete(x); return on; } };
  el.style.setProperty = (k, v) => props.set(k, v); el.style.removeProperty = k => props.delete(k); el.style.getPropertyValue = k => props.get(k) || '';
  el.remove = () => { const p = el.parentNode; if (p) p.children.splice(p.children.indexOf(el), 1); el.parentNode = null; };
  el.querySelector = selector => el.children.find(c => selector === '.item-use-cancel-btn' && c.className.includes('item-use-cancel-btn')) || null;
  return el;
}

(async () => {
  console.table = () => {};
  const warnings = [], warn = console.warn;
  console.warn = (...args) => warnings.push(args.join(' '));
  try { await loadGameData(); } finally { console.warn = warn; }
  renderHandEditor = () => {}; renderRewCards = () => {}; _syncRewardProductionUi = () => {}; updateHUD = () => {}; _playItemUseVfx = () => {};
  await check('実装trueの全24アイテム：番号の重複なし、本文・名称・グレード・実装キー・警告', () => {
    const rows = sheet.sheetRows('item').filter(r => r['実装'] === 'true'); assert.equal(rows.length, 24);
    assert.equal(ITEM_POOL.length, rows.length);
    for (const row of rows) {
      const d = itemDef(row['No.']); assert.ok(d, row['No.']);
      assert.equal(d.name, row['名前']); assert.equal(d.desc, row['効果']); assert.equal(d.grade, Number(row['グレード']));
      assert.ok(d.itemEffectKey && !d._noItemEffectImpl && d._implemented !== false, row['No.']);
    }
    assert.ok(!warnings.some(w => /itemEffectKey.*実装が無い/.test(w)), warnings.join('\n'));
    for (const no of ['R024','R030','R037']) assert.equal(ring(no).desc, sheet.sheetRows('ring').find(r => r['No.'] === no)['効果']);
  });
  await check('全アイテムが報酬・道具屋のシート指定どおり抽選に入る（行商人列は廃止、Xは引いたレアリティ）', () => {
    initRun(); G._wave = 5;
    const pick = _rewardWeightedPick;
    try {
      for (const row of sheet.sheetRows('item')) for (const [column, opts] of [['報酬',{}],['ショップ',{forShop:true}]]) {
        const definition = itemDef(row['No.']); let candidate;
        _rewardWeightedPick = pool => { candidate = pool.find(p => p.id === definition.id && (!p._xPick || p._xPick === 4)); return candidate || null; };
        const drawn = drawItems(1, 5, opts);
        assert.equal(drawn.length, row[column] === 'true' ? 1 : 0, row['No.'] + '/' + column);
        if (row['レアリティ'] === 'X' && drawn.length) {
          assert.equal(drawn[0].rarity, 4); assert.equal(drawn[0]._xValue, 4); assert.equal(drawn[0].desc, row['効果'].replace(/X/g, '4'));
        }
      }
    } finally { _rewardWeightedPick = pick; }
  });
  await check('I013 絆：1枚を選び、空いている方向だけランダムに追加。4方向・強化カードは不可', () => {
    for (const directions of [[],['up'],['up','right'],['up','right','down']]) {
      const c = board(); c.directions = directions.slice(); c.directionCount = directions.length;
      const before = copy(c), next = select('I013');
      assert.equal(next.directions.length, directions.length + 1); assert.equal(new Set(next.directions).size, next.directions.length);
      assert.ok(directions.every(d => next.directions.includes(d))); assert.equal(next.directionCount, next.directions.length);
      const { directions: d, directionCount: n, _itemBuffed: b, ...rest } = next;
      const { directions: oldD, directionCount: oldN, ...oldRest } = before;
      assert.deepEqual(rest, oldRest, '能力・効果・レアリティを変えず、合体しない');
    }
    const c = board(); c.directions = ['up','right','down','left']; G.spellSlots[0] = item('I013');
    const before = G._runRngState; assert.equal(_canUseItemNow(G.spellSlots[0]), false); assert.equal(_useImmediateItem(0, G.spellSlots[0]), false); assert.equal(G._runRngState, before);
    const seen = new Set();
    for (let seed = 1; seed <= 50; seed++) { board(); G._runRngState = seed; seen.add(select('I013').directions[1]); }
    assert.equal(seen.size, 3, '既存up以外の3方向が出る');
  });
  for (const no of ['I015','I016','I017','I024']) await check(`${no} 数値キーワード：既所持の値に加算し、同種を1項目で保存・出撃`, () => {
    const c = board(), keyword = item(no, 3).desc.match(/に(.+?)を与える/)[1], kind = keyword.replace(/\d+$/, ''), amount = Number(keyword.match(/\d+$/)[0]);
    c.keywords = [kind + '2', kind + '1']; select(no, 3); select(no, 3);
    assert.deepEqual(c.keywords, [kind + (3 + 2 * amount)]); assert.equal(coreKeywordSum(formed(), kind), 3 + 2 * amount);
    const saved = SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(copy(saved));
    assert.equal(coreKeywordSum(formed(), kind), 3 + 2 * amount); assert.deepEqual(G.mainBoard[1].keywords, c.keywords);
  });
  for (const no of ['I003','I004','I012','I018','I019','I020','I021','I022','I023']) await check(`${no} キーワード付与：魔導板・セーブ・出撃に残り、重複しない`, () => {
    board(); const keyword = item(no).desc.match(/に(.+?)を与える/)[1]; select(no);
    const c = G.mainBoard[1]; assert.ok(c._itemBuffed); assert.equal(c.keywords.filter(k => k === keyword).length, 1);
    assert.ok(coreUnitHasKeyword(formed(), keyword));
    const scroll = item(no); G.spellSlots[0] = scroll;
    if (no === 'I003') { _useImmediateItem(0, scroll); handlePendingItemBoardTarget(1); }
    else if (_canUseItemNow(scroll)) { _useImmediateItem(0, scroll); assert.equal(_isItemUseTargetSlot(1), false); if (no !== 'I004' && no !== 'I012') handlePendingItemBoardTarget(1); assert.ok(G.spellSlots[0]); _cancelPendingItemUse(); }
    assert.equal(G.mainBoard[1].keywords.filter(k => k === keyword).length, 1);
    SaveRun.restoreRunState(copy(SaveRun.buildRunSave('reward'))); assert.ok(coreUnitHasKeyword(formed(), keyword));
  });
  await check('数値キーワードは本来の値と同じ量を付与しても、祝福の炎で付与分だけを永久に保持する', () => {
    board(); G.mainBoard[1]=makePanel(PANEL_POOL.find(c=>c.no==='C059').id);
    const original=copy(G.mainBoard[1]); select('I015',3); select('I016',3);
    const saved=SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(copy(saved));
    const enhanced=enhancedPanelCopy(G.mainBoard[1]); assert.ok(enhanced);
    for(const kind of ['毒牙','邪眼']){
      const base=(original.mergedForm.keywords||[]).reduce((n,k)=>n+(k.startsWith(kind)?Number(k.slice(kind.length)):0),0);
      assert.equal(coreKeywordSum(enhanced,kind),base+3);
    }
  });
  await check('対象選択は説明を置かず、右クリック・Escで解除、外側クリック・ドラッグは抑止', () => {
    const old = { body: document.body, root: document.documentElement, get: document.getElementById, create: document.createElement, add: document.addEventListener };
    const body = element('body'), root = element('html'), section = element('section'), handlers = {};
    document.body = body; document.documentElement = root; document.createElement = element;
    document.getElementById = id => id === 'reward-offer-section' ? section : null;
    document.addEventListener = (name, fn) => { handlers[name] = fn; };
    const source = fs.readFileSync(require.resolve('../../js/engine/reward_items.js'), 'utf8');
    window._itemUseCancelBound = false;
    vm.runInThisContext(source.slice(source.indexOf('if(!window._itemUseCancelBound)'), source.indexOf('// ── 対象を選ぶアイテム')));
    try {
      for (const no of ['I013','I015','I024']) for (const cancel of ['contextmenu','keydown']) {
        board(); const before = copy(G.mainBoard); use(no); assert.ok(body.classList.contains('item-use-picking'));
        assert.equal(root.style.getPropertyValue('--item-use-desc'), ''); assert.equal(section.querySelector('.item-use-cancel-btn'), null);
        let stopped = 0; const event = { button: 2, key: 'Escape', target: { closest: () => null }, preventDefault() { stopped++; }, stopImmediatePropagation() { stopped++; } };
        handlers.dragstart(event); assert.ok(G._pendingItemUse); assert.equal(stopped, 2);
        handlers.pointerdown({ ...event, button: 0 }); assert.ok(G._pendingItemUse, '外側を押しても対象選択を維持');
        handlers.pointerdown(event); assert.ok(G._pendingItemUse, '右クリックの解除はcontextmenuで一度だけ');
        handlers[cancel](event);
        assert.equal(G._pendingItemUse, null); assert.ok(!body.classList.contains('item-use-picking')); assert.equal(root.style.getPropertyValue('--item-use-desc'), '');
        assert.deepEqual(G.mainBoard, before); assert.ok(G.spellSlots[0], 'キャンセルでは消費しない');
      }
    } finally { document.body = old.body; document.documentElement = old.root; document.getElementById = old.get; document.createElement = old.create; document.addEventListener = old.add; }
  });
  for (const side of ['p1','p2']) await check(`${side} 巻物の毒牙・邪眼・衝撃・熟練・二段・先制・隠密・範囲・生命吸収が戦闘で効く`, () => {
    board(); for (const no of ['I015','I016','I017','I024','I018','I020','I023']) select(no, 3);
    const h = harness(side, [formed(side)]); h.u.hp = 8;
    h.hit(h.u, h.foes[0], 2);
    assert.equal(h.foes[0].poison, 3); assert.equal(h.foes[0].weaken, 3); assert.equal(h.foes[0].atk, 1, '邪眼3+熟練1');
    assert.equal(coreExtraAttackCount(h.u), 1); assert.ok(coreUnitHasKeyword(h.u, '先制')); assert.ok(coreUnitHasKeyword(h.u, '貫通'));
    board(); select('I019'); assert.ok(formed(side).stealth);
    select('I021'); assert.equal(coreAttackSpread(formed(side)), 'tri');
    select('I022'); const drain = harness(side, [formed(side)]); drain.u.hp = 3; drain.hit(drain.u, drain.foes[0], 2); assert.equal(drain.u.hp, 5);
  });
  for (const no of ['I001','I006','I007','I014']) await check(`${no} 次戦使用：二重登録せず、保存→読み込み→開戦→次戦消費まで反映`, async () => {
    board(); use(no); use(no);
    const saved = SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(copy(saved));
    const preview = buildOnlineSelfFormation(); assert.ok(G.pendingBattleItems.length, '編成送信では消費しない');
    _prepareStartingBattleItems(false);
    const count = no === 'I006' ? 1 : 2; assert.equal(G.activeBattleItems.length, count); assert.deepEqual(G.pendingBattleItems, []); assert.deepEqual(G.nextBattleItems, []);
    const payload = buildOnlineSelfFormation({battleItems:G.activeBattleItems}); assert.equal(payload.items.p1.length, count); assert.equal(payload.items.p1[0].desc, itemDef(no).desc);
    assert.deepEqual(payload.items,preview.items,'編成送信と実戦のアイテムが一致');
    const h = harness('p1', [plain('source')], { items: { p1: G.activeBattleItems }, resources: { p1: { mana: 0 } }, blood: { p1: 0 } }); opening(h);
    if (no === 'I001') assert.ok(h.foes.every(coreUnitIsSilenced));
    if (no === 'I006') assert.ok(h.foes.every(u => u.hp === 65));
    if (no === 'I007') { assert.equal(h.state.resources.p1.mana, 8); assert.equal(h.state.blood.p1, 8); }
    if (no === 'I014') { const summons = h.events.filter(e => e.type === 'summon'); assert.equal(summons.length, 2); const def = PANEL_POOL.find(p => p.color === '緑' && p.name === 'ドラゴン'); assert.ok(def); assert.deepEqual(summons.map(e => [e.unit.no,e.unit.atk,e.unit.hp]), Array(2).fill([def.no,def.power,def.life])); assert.ok(summons.every(e => e.unit.keywords.includes('眷属'))); }
    await pipelines(h.initial);
    _prepareStartingBattleItems(false); assert.deepEqual(G.activeBattleItems, []);
  });
  await check('I002変身・I005巨大化・I008魂交換・I010黄金・I011見通し：既存効果が現行本文へ接続する', () => {
    board(); G.mainBoard[3] = makePanel('ゴーレム'); const target = G.mainBoard[3]; use('I002'); handlePendingItemBoardTarget(2); assert.equal(G._pendingItemUse.firstIdx,undefined); handlePendingItemBoardTarget(1); handlePendingItemBoardTarget(3); assert.equal(G.mainBoard[1].id, target.id); assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life],[5,20]);
    board(); select('I005'); assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life], [8,30]);
    board(); G.mainBoard[3] = { ...makePanel('ゴーレム'), power: 7, life: 11 }; use('I008'); handlePendingItemBoardTarget(1); handlePendingItemBoardTarget(3); assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life,G.mainBoard[3].power,G.mainBoard[3].life], [7,11,5,20]);
    board(); G.gold = 123; use('I010'); assert.equal(G.gold, 246);
    board(); const before = towerBoonState().rerolls; use('I011'); assert.equal(towerBoonState().rerolls, before + 3);
  });
  await check('I009ポータル：街では使えず、既存ワープ入口へ使用を渡す', () => {
    board(); const warp = warpToPreviousWaveVillage, previous = _wavePreviousVillage; let calls = 0;
    try { _wavePreviousVillage = () => ({ wave: 1, stage: 1 }); warpToPreviousWaveVillage = () => { calls++; return true; }; G._isVillageMenu = true; assert.equal(_canUseItemNow(item('I009')), false); G._isVillageMenu = false; use('I009'); assert.equal(calls, 1); assert.equal(G._pendingMapItemUse.key, 'portal_scroll'); }
    finally { warpToPreviousWaveVillage = warp; _wavePreviousVillage = previous; }
  });
  await check('I013の方向と次の乱数は保存前後で同じ。付与キーワードはオンラインpayloadにも残る', () => {
    board(); select('I024'); select('I018'); const saved = SaveRun.buildRunSave('reward');
    const first = copy(select('I013')), random = rand(); SaveRun.restoreRunState(copy(saved));
    assert.deepEqual(select('I013'), first); assert.equal(rand(), random);
    const payload = buildOnlineSelfFormation(), u = payload.units.find(u => u._mainBoardSlot === 1);
    assert.ok(u && u.keywords.includes('熟練1') && u.keywords.includes('二段攻撃'));
    SaveRun.restoreRunState(copy(SaveRun.buildRunSave('reward'))); assert.deepEqual(G.mainBoard[1].directions, first.directions);
  });
  for (const side of ['p1','p2']) for (const count of [1,2,3]) await check(`${side} R024軍神${count}個：開戦を加算、恩寵と合算、敵・指輪の開戦を増やさない`, async () => {
    const subject = plain('source', { desc: '開戦：全ての味方は+1/+2を得る。',
      _adjacentPanelEffectTexts: ['常時：このキャラクターの開戦効果は2回追加で発動する。'] });
    const h = harness(side, [subject,plain('ally')], { rings: { [side]: Array.from({length:count}, () => ring('R024')) },
      foes: [plain('foe', { desc: subject.desc })] });
    opening(h); assert.equal(h.u.atk, 5 + 3 + count); assert.equal(h.u.hp, 100 + 2 * (3 + count));
    assert.equal(h.foes[0].atk, 6); assert.equal(h.events.filter(e => e.type === 'effect_flash' && e.unitId === h.u.id && e.trigger === 'opening').length, 3 + count);
    await pipelines(h.initial);
  });
  for (const side of ['p1','p2']) await check(`${side} R024：鏡・改名・本文数値・カオスインプの再発火にも反映`, () => {
    const r = ring('R024'); r.name = '改名テスト'; r.desc = r.desc.replace('1回','3回');
    const h = harness(side, [plain('source', { desc: '開戦：全ての味方は+1/+1を得る。' }),
      plain('observer', { desc: '常時：味方が解放された時、ランダムな味方の開戦効果を発動する。' })],
    { rings: { [side]: [ring('R026'),r] } });
    opening(h); assert.equal(h.u.atk, 12); h.events.length = 0;
    coreApplyReleaseEffects(h.u,0,h.state,h.rng,h.emit,h.hit);
    assert.equal(h.events.filter(e => e.type === 'effect_flash' && e.trigger === 'opening').length, 7);
    assert.equal(h.u.atk, 19);
  });
  await check('R024：召喚時にも発動する野生の力の開戦効果を、所持数ぶん追加する', () => {
    const h=harness('p1',[plain('source')],{rings:{p1:[ring('R024'),ring('R024')]}});
    const child=coreSummonUnit(h.state,'p1',{name:'new',atk:2,hp:20,_fixedSummonStats:true,
      _adjacentPanelAbilities:['野生の力'],_adjacentPanelEffectTexts:['開戦：2マナを得る。']},h.emit,h.u.id,false,h.rng,h.hit);
    assert.ok(child); const events=h.events.filter(e=>e.reason==='wild_power_summon'); assert.equal(events.length,3); assert.ok(events.every(e=>e.amount===2));
  });
  for (const side of ['p1','p2']) await check(`${side} R030老将軍：複数・鏡・永久熟練に加算し、封印・召喚・コピー・復活・変身・奪取でも二重付与しない`, async () => {
    const r = ring('R030'); r.name = '本文で判定'; r.desc = r.desc.replace('熟練1','熟練2');
    const h = harness(side, [plain('source', { keywords: ['熟練3','復活'] }),plain('sealed', { keywords: ['封印999'] })],
      { rings: { [side]: [r,ring('R026'),r] } });
    opening(h); assert.equal(coreKeywordSum(h.u,'熟練'), 9); assert.equal(coreKeywordSum(h.own[1],'熟練'), 6); assert.equal(coreKeywordSum(h.foes[0],'熟練'), 0);
    assert.equal(coreStatBonus(h.u,2,h.u), 11); assert.equal(coreStatBonus(h.u,-2,h.u), -11); assert.equal(coreStatBonus(h.u,0,h.u), 0);
    const child = coreSummonUnit(h.state,side,{name:'new',atk:4,hp:20,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);
    assert.equal(coreKeywordSum(child,'熟練'), 6);
    const twin = coreSummonUnit(h.state,side,{...coreUnitSnapshot(h.u),name:'copy',_inheritsStats:true,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);
    assert.equal(coreKeywordSum(twin,'熟練'), 9);
    h.u.hp = 0; assert.equal(coreTryRevive(h.u,h.state,h.emit,h.rng,h.hit), '復活'); assert.equal(coreKeywordSum(h.u,'熟練'), 9);
    const snapshot = coreUnitSnapshot(h.u), restored = createCoreUnit(snapshot,side,0); assert.equal(restored._skilledRingBonus, 6);
    h.state.summonDefs.push({name:'変身検査',power:3,life:20,keywords:['熟練4'],desc:''});
    coreTransformUnit(h.state,child,'変身検査',h.emit); assert.equal(coreKeywordSum(child,'熟練'), 10);
    assert.ok(coreStealUnit(h.state,child,h.other,h.emit,h.u.id,undefined,h.rng,h.hit)); assert.equal(coreKeywordSum(child,'熟練'), 4);
    assert.ok(coreStealUnit(h.state,child,side,h.emit,h.u.id,undefined,h.rng,h.hit)); assert.equal(coreKeywordSum(child,'熟練'), 10);
    await pipelines(h.initial);
  });
  await check('R030：実際の効果の正負の戦闘修正を増やし、毒・ダメージの量は増やさない', () => {
    const h = harness('p1',[plain('source',{desc:'開戦：全ての味方は+1/+2を得る。',keywords:['毒牙2','邪眼3']})],{rings:{p1:[ring('R030'),ring('R030')]},foes:[plain('foe',{atk:20})]});
    opening(h); assert.deepEqual([h.u.atk,h.u.hp],[8,104]); const hp = h.foes[0].hp;
    h.hit(h.u,h.foes[0],2); assert.equal(h.foes[0].hp,hp-2); assert.equal(h.foes[0].poison,2); assert.equal(h.foes[0].atk,15);
    assert.equal(h.events.find(e=>e.effect==='evil_eye').amount,5);
  });
  await check('R030：沈黙中の変身・奪取でも熟練を退避し、沈黙が解けると正しい陣営の値に戻る', () => {
    const h=harness('p1',[plain('source')],{rings:{p1:[ring('R030'),ring('R030')]}}); opening(h);
    coreSilenceUnit(h.u); h.state.summonDefs.push({name:'沈黙変身',power:4,life:20,keywords:['熟練3'],desc:''});
    coreTransformUnit(h.state,h.u,'沈黙変身',h.emit); assert.equal(coreKeywordSum(h.u,'熟練'),0);
    assert.equal(coreKeywordSum(coreUnitSnapshot(h.u),'熟練'),5);
    assert.ok(coreStealUnit(h.state,h.u,'p2',h.emit,null,undefined,h.rng,h.hit));
    assert.equal(coreKeywordSum(h.u,'熟練'),0); coreUnsilenceUnit(h.u); assert.equal(coreKeywordSum(h.u,'熟練'),3);
  });
  await check('R037目利き：魔導店・トレーダーで所持数ぶん増え、道具屋は3個・定価。増えた枠も交換できる', () => {
    for (const online of [false,true]) for (const count of [0,1,2,4]) {
      board(); G._wave = 2; G._waveStage = 4; G._onlineMode = online;
      G.rings = Array.from({length:count},()=>ring('R037'));
      const stock = _ensureWaveShopStock(), expected = (online?5:3)+count;
      assert.equal(stock.length,expected); G._isShop = true; _rewCards = stock; assert.equal(_shopSlotCapacity(),expected);
      assert.equal(_ensureWaveShopStock().length,expected);
      if (!online) {
        const last = stock.length-1; _rewCards[last] = makePanel('ノーム'); G.mainBoard[1] = makePanel('ゴーレム'); const gold = G.gold;
        assert.ok(exchangeShopCard(last,1)); assert.equal(G.mainBoard[1].name,'ノーム'); assert.equal(G.gold,gold);
        const trader = _buildDefeatPeddlerStock(); assert.equal(trader.length,3+count); G._peddlerStock = copy(trader);
        assert.deepEqual(_ensureDefeatPeddlerStock(),trader);
      }
      const tools = _drawItemShopStock(); assert.equal(tools.length,3); assert.ok(tools.every(i=>i._buyPrice===_itemShopBuyPrice(i)));
    }
    G._onlineMode = false;
    assert.equal(VILLAGE_FACILITY_DEFS['魔導取引所'].key,'shop'); assert.equal(defeatPeddlerTitle(),'トレーダー');
  });
  await check('R037：鏡・無効化・本文の枚数、保存済み在庫の差分追加、再抽選・再訪・ラン読み込み', () => {
    board(); G._wave = 2; G._waveStage = 4; G._isShop = true;
    const before = _ensureWaveShopStock(); G._peddlerStock = _buildDefeatPeddlerStock(); const trader = copy(G._peddlerStock);
    const r = ring('R037'); r.name = '本文で判定'; r.desc = r.desc.replace('1枚','2枚'); G.rings = [ring('R026'),r];
    assert.equal(_shopExtraCardCount(),4); assert.equal(_ensureWaveShopStock().length,7); assert.deepEqual(_ensureWaveShopStock().slice(0,3),before);
    assert.equal(_ensureDefeatPeddlerStock().length,7); assert.deepEqual(G._peddlerStock.slice(0,3),trader);
    // 旧保存の本文はロード時に現行シートへ更新される。保存の往復は現行本文で確かめる。
    G.rings = [ring('R026'),ring('R037')]; _ensureWaveShopStock(); _ensureDefeatPeddlerStock();
    const snapshot = SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(copy(snapshot));
    const stock = _ensureWaveShopStock(); assert.equal(stock.length,5); assert.deepEqual(stock,snapshot.state.choices._waveShopStock[2]);
    _rewCards = stock; G._isShop = true; G._isItemShop = false; G._isPeddler = false; G.gold = 800; towerBoonState().rerolls = 1;
    assert.equal(shopRerollOffers(),true); assert.equal(_rewCards.length,5); assert.deepEqual(_ensureWaveShopStock(),_rewCards);
    G.rings[1]._disabled = true; assert.equal(_shopExtraCardCount(),0); assert.equal(_ensureWaveShopStock().length,3);
  });
  await check('新指輪・永久キーワード・召竜を同じ編成に載せ、PvE・オンライン・保存戦闘再生で一致', async () => {
    board(); for (const no of ['I015','I016','I017','I018','I020','I023','I024']) select(no,3);
    G.rings = [ring('R024'),ring('R030'),ring('R037')]; use('I014'); _prepareStartingBattleItems(false);
    const formation = buildOnlineSelfFormation({battleItems:G.activeBattleItems}); assert.equal(formation.rings.p1.length,3);
    const h = harness('p1',[{...formation.units[0],desc:'開戦：全ての味方は+1/+1を得る。'}],{rings:formation.rings,items:formation.items});
    await pipelines(h.initial);
  });
  await check('オンライン実開始：待機の編成送信で消費せず、開戦でだけ消費し、次の対戦へ持ち越さない', async () => {
    board(); G._onlineMode=true; use('I014'); use('I007');
    const initial=buildOnlineSelfFormation(); assert.equal(initial.items.p1.length,2);
    assert.deepEqual(buildOnlineSelfFormation().items,initial.items); assert.equal(G.pendingBattleItems.length,2);
    const old={active:OnlineMatch.isActive,resolve:OnlineMatch.resolveVersus,pause:setOnlineFlowPaused,resume:resumeOnlineFlow};
    let payload;
    try{
      OnlineMatch.isActive=()=>true; OnlineMatch.resolveVersus=async formation=>{payload=copy(formation);return null;};
      setOnlineFlowPaused=()=>{}; resumeOnlineFlow=()=>{};
      await startOnlineVersusBattle(); assert.deepEqual(payload.items,initial.items); assert.deepEqual(G.pendingBattleItems,[]); assert.deepEqual(G.nextBattleItems,[]);
      assert.deepEqual(buildOnlineSelfFormation().items.p1,[],'直前のactiveBattleItemsを再送しない');
      await startOnlineVersusBattle(); assert.deepEqual(payload.items.p1,[]);
    }finally{OnlineMatch.isActive=old.active;OnlineMatch.resolveVersus=old.resolve;setOnlineFlowPaused=old.pause;resumeOnlineFlow=old.resume;G._onlineMode=false;}
  });
  await check('非対象の全カード通常・強化、旧指輪・戦闘アイテムは開始時版と結果・イベント・最終状態・次の乱数が完全一致', () => {
    const source = execFileSync('git',['show',`${BASELINE}:prototype/js/battle/core.js`],{encoding:'utf8',maxBuffer:2e6});
    const sandbox = {module:{exports:{}}}; vm.runInNewContext(source,sandbox); const baseline = sandbox.module.exports, current = require('../../js/battle/core');
    let compared = 0;
    const run = (api,input,seed) => { const state = api.createBattleState(copy(input)),events = [],rng = createSeededRng(seed);
      const result = api.runBattleCore(state,rng,{turnLimit:6,onEvent:e=>events.push(e)});
      return copy({result,events,finalState:api.battleCoreFinalState(state),nextRandom:rng.next()}); };
    const base = own => ({sides:{p1:{units:[own,plain('ally')]},p2:{units:[plain('foe',{hp:5,maxHp:5}),plain('foe2')]}},resources:{p1:{mana:8,gold:800}},summonDefs:PANEL_POOL});
    for (const row of [...sheet.sheetRows('card'),...sheet.sheetRows('enchant')]) for (const enhanced of [false,true]) for (const seed of [1,1026]) {
      if (row['No.']==='C016'&&enhanced) continue; // effects-1026c: 強化は本文どおり2波
      const def = PANEL_POOL.find(c=>c.no===row['No.']); if (!def || revised1027.has(row['No.'])) continue;
      const c = {...copy(def),desc:(enhanced?row['強化効果']:'')||row['効果']||''};
      const own = def.category==='キャラクター'?{..._makePanelSummonUnit(_panelSummonSpec(c),[]),id:'source',atk:10,hp:70,maxHp:70}
        :plain('source',{_adjacentPanelEffectTexts:[c.desc],boardCards:[c]});
      compareBeforeDecision(run(current,base(own),seed),run(baseline,base(own),seed),`${row['No.']}/${enhanced}/${seed}`); compared++;
    }
    for (const r of RING_POOL.filter(r=>!['R017','R019','R024','R030','R037'].includes(r.no))) {
      const input={...base(plain('source')),rings:{p1:[r]}}; compareBeforeDecision(run(current,input,1026),run(baseline,input,1026),r.no); compared++;
    }
    for (const d of ITEM_POOL.filter(d=>Number(d.no)<=12)) {
      const input={...base(plain('source')),items:{p1:[d]}}; compareBeforeDecision(run(current,input,1026),run(baseline,input,1026),d.no); compared++;
    }
    assert.ok(compared>750); console.log(`  ${compared}ケース決着前一致（非決着は全結果一致）（開始時 ${BASELINE.slice(0,7)}）`);
    reportDecisionComparison();
  });
  console.log(`アイテム・指輪1026: OK ${passed} / NG ${failed}`); process.exitCode = failed ? 1 : 0;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
