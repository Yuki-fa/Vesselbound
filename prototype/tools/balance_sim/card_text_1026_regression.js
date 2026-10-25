'use strict';
// 1026本文監査で見つけた不発・旧本文の残存の回帰。マスターは読取専用。
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const A = require('./card_text_audit_1026');
const { pipelines } = require('./rules_1026_harness');
const BASELINE = 'de191a0c8ad21080fa7de184db15c94c3203a63b';
const REVISED = new Set(['C034', 'C100', 'C115', 'E046']);
let passed = 0;
const check = async (label, fn) => { await fn(); passed++; console.log('OK ' + label); };
const entry = no => A.catalog().find(c => c.no === no);
function fixture(no, enhanced, text, side = 'p1') {
  const e = entry(no), form = e.forms[enhanced ? 1 : 0], h = A.context(e, form, text ?? form.text);
  if (side === 'p2') {
    [h.state.units.p1, h.state.units.p2] = [h.state.units.p2, h.state.units.p1];
    for (const s of ['p1', 'p2']) h.state.units[s].forEach(u => { u.side = s; });
  }
  return { ...h, side, other: side === 'p1' ? 'p2' : 'p1' };
}
function opening(h) { coreApplyOpeningEffects(h.u, h.state, h.rng, h.emit, h.hit); }
function dying(h) { h.hit(h.foes[0], h.u, 10000, false, true); }
const ailment = (h, effect) => h.events.filter(e => e.type === 'keyword_effect' && e.effect === effect && e.sourceId === h.u.id);
const resultOf = (api, input, seed) => {
  const state = api.createBattleState(A.copy(input)), events = [], rng = createSeededRng(seed);
  const result = api.runBattleCore(state, rng, { turnLimit: 8, onEvent: e => events.push(e) });
  return A.copy({ result, events, finalState: api.battleCoreFinalState(state), nextRandom: rng.next() });
};
async function unchanged() {
  const source = execFileSync('git', ['show', BASELINE + ':prototype/js/battle/core.js'], { encoding: 'utf8', maxBuffer: 2e6 });
  const sandbox = { module: { exports: {} } }; vm.runInNewContext(source, sandbox);
  const baseline = sandbox.module.exports, current = require('../../js/battle/core'); let compared = 0;
  for (const e of A.catalog().filter(e => e.implemented && !REVISED.has(e.no))) for (const f of e.forms) {
    const h = A.context(e, f, f.text), input = h.input;
    input.resources.p1.mana = input.resources.p2.mana = 8;
    // 実際のキーワードも持つ体で比較する。監査の一文隔離とは別の検査。
    if (e.kind === 'card') input.sides.p1.units[0].keywords = f.card.keywords || [];
    else input.sides.p1.units[0].keywords = f.card.adjacentKeywords || [];
    for (const seed of [1, 1026, 261026]) for (const side of ['p1', 'p2']) {
      const sample = A.copy(input);
      if (side === 'p2') [sample.sides.p1, sample.sides.p2] = [sample.sides.p2, sample.sides.p1];
      assert.deepEqual(resultOf(current, sample, seed), resultOf(baseline, sample, seed), `${e.no}/${f.enhanced}/${side}/${seed}`);
      compared++;
    }
  }
  assert.ok(compared > 2400); console.log(`  非対象 ${compared} 戦闘：${BASELINE.slice(0, 7)} と結果・全イベント・最終状態・次の乱数が完全一致`);
}

(async () => {
  await A.initialize();
  await check('監査は全214行・通常/強化全文を列挙し、未登録の戦闘本文・不発が0件', async () => {
    const report = await A.audit(); assert.equal(report.summary.cards, 214); assert.equal(report.summary.broken, 0);
    for (const c of report.cards) for (const f of c.forms) for (const s of f.sentences) for (const ch of s.checks)
      if (ch.status === '判定できない') assert.ok(!/未登録/.test(ch.reason), c.no + ': ' + ch.reason);
    // 複合トリガ・引用内のトリガ・Xの定義は落とさない。
    assert.deepEqual(A.sentences('負傷&死亡：全ての敵に毒2を与える。'), ['負傷&死亡：全ての敵に毒2を与える。']);
    assert.equal(A.sentences('3マナ毎：味方に「負傷：敵に1ダメージ。」を付与する。').length, 1);
    const elemental=entry('C100'),bad=A.copy(elemental.forms[0]);bad.text='';
    assert.ok(A.auditSentence(elemental,bad,bad.expectedText).every(c=>c.status==='動かない'),'loaderが本文を落とした場合も監査を通さない');
  });
  for (const enhanced of [false, true]) for (const side of ['p1', 'p2']) {
    const form = entry('C100').forms[enhanced ? 1 : 0];
    for (const modified of [false, true]) await check(`エレメンタル/${enhanced ? '強化' : '通常'}/${side}/${modified ? '本文差替' : 'シート'}`, async () => {
      const text = modified ? form.text.replace('5色', '3色').replace(/弱体\d+/, '弱体9') + 'これをもう一度繰り返す。' : form.text;
      const amount = Number(text.match(/弱体(\d+)/)[1]), runs = modified ? 2 : 1;
      const h = fixture('C100', enhanced, text, side); h.foes[1]._sealed = true; h.foes[2].hp = 0;
      opening(h); assert.deepEqual(ailment(h, 'weaken').map(e => [e.unitId, e.amount]), Array.from({ length: runs }, () => ['foe0', amount]));
      assert.equal(h.foes[0].weaken, amount * runs); assert.equal(h.foes[1].weaken, 0); assert.equal(h.foes[2].weaken, 0);
      assert.equal(h.own.some(u => coreUnitHasKeyword(u, '生命吸収')), false);
      assert.ok(!h.events.some(e => e.type === 'stat_change'), '旧HP倍率を発動しない');
      const insufficient = fixture('C100', enhanced, text, side), need = Number(text.match(/(\d+)色/)[1]);
      insufficient.own.forEach((u, i) => { u.color = ['赤', '青', '緑', '黄', '紫'][i % (need - 1)]; });
      opening(insufficient); assert.equal(ailment(insufficient, 'weaken').length, 0, '色数が足りない');
      const sealed = fixture('C100', enhanced, text, side);
      sealed.own.forEach(u => { u.color = '赤'; }); sealed.own.slice(1, need).forEach((u, i) => { u.color = ['青', '緑', '黄', '紫'][i]; });
      sealed.own[need - 1]._sealed = true; opening(sealed); assert.equal(ailment(sealed, 'weaken').length, 0, '封印中の色を数えない');
      const full = fixture('C100', enhanced, text, side); const run = await pipelines(SaveRun.copy(full.state));
      assert.ok(run.events.some(e => e.effect === 'weaken' && e.sourceId === 'subject' && e.amount === amount));
    });
    for (const modified of [false, true]) await check(`バンシー/${enhanced ? '強化' : '通常'}/${side}/${modified ? '本文差替' : 'シート'}`, async () => {
      const base = entry('C034').forms[enhanced ? 1 : 0].text;
      const text = modified ? base.replace(/毒\d+/, '毒7').replace(/弱体\d+/, '弱体9') : base;
      const h = fixture('C034', enhanced, text, side); dying(h);
      h.foes.forEach(u => assert.deepEqual([u.poison, u.weaken, u.hp], [Number(text.match(/毒(\d+)/)[1]), Number(text.match(/弱体(\d+)/)[1]), 80]));
      assert.equal(h.events.filter(e => e.type === 'damage' && e.sourceId === 'subject').length, 0, 'ATK相当の旧ダメージを出さない');
      const full = fixture('C034', enhanced, text, side); full.u.hp = full.u.maxHp = 1;
      const run = await pipelines(SaveRun.copy(full.state));
      assert.ok(run.events.some(e => e.type === 'death' && e.unitId === 'subject'));
      assert.ok(run.events.some(e => e.effect === 'poison' && e.sourceId === 'subject'));
    });
    for (const modified of [false, true]) await check(`サキュバス/${enhanced ? '強化' : '通常'}/${side}/${modified ? '本文差替' : 'シート'}`, async () => {
      const base = entry('C115').forms[enhanced ? 1 : 0].text, text = modified ? base.replace(/敵を(?:\d+体)?奪う/, '敵を3体奪う') : base;
      const count = Number((text.match(/敵を(\d+)体/) || [])[1]) || 1;
      const h = fixture('C115', enhanced, text, side); dying(h);
      assert.equal(h.events.filter(e => e.type === 'unit_stolen').length, count);
      const attack = fixture('C115', enhanced, text, side); attack.u._coreAttackContact = true;
      attack.hit(attack.u, attack.foes[0], 10000); delete attack.u._coreAttackContact;
      assert.equal(attack.events.filter(e => e.type === 'unit_stolen').length, 0, '攻撃撃破の旧捕獲は発生しない');
      const full = fixture('C115', enhanced, text, side); full.u.hp = full.u.maxHp = 1; full.foes[0].hp = 1;
      const run = await pipelines(SaveRun.copy(full.state));
      const death = run.events.findIndex(e => e.type === 'death' && e.unitId === 'subject');
      assert.ok(death >= 0); assert.ok(!run.events.slice(0, death).some(e => e.type === 'unit_stolen' && e.sourceId === 'subject'));
    });
    for (const modified of [false, true]) await check(`血盟/${enhanced ? '強化' : '通常'}/${side}/${modified ? '本文差替' : 'シート'}`, async () => {
      const form = A.copy(entry('E046').forms[enhanced ? 1 : 0]);
      if (modified) form.card.desc = form.text = form.text.replace(/数の\d+倍/, '数の9倍');
      const n = Number(form.text.match(/数の(\d+)倍/)[1]);
      const built = A.formedEnchant(form, { allies: true }); assert.deepEqual([built.u.atk, built.u.maxHp], [60 + n, 80 + n]);
      assert.deepEqual(_panelCharacterPreviewStats(_getPartyBoardUnit(), 1, G.mainBoard[1]), { atk: 60 + n, hp: 80 + n }, '魔導板プレビューと編成が同じ値');
      const noAlly = A.formedEnchant(form); assert.deepEqual([noAlly.u.atk, noAlly.u.maxHp], [60, 80]);
      const mixed = A.formedEnchant(form, { allies: true, mixed: true }); assert.deepEqual([mixed.u.atk, mixed.u.maxHp], [60, 80]);
      A.formedEnchant(form, { allies: true });
      G.mainBoard[2].directions.push('down');G.mainBoard[7]={...A.copy(G.mainBoard[1]),directions:['up']};G.mapPanelPowers[7]='summon';
      const three=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered.map(e=>e.unit);
      assert.equal(three.length,3);for(const u of three){assert.deepEqual([u.atk,u.maxHp],[60+2*n,80+2*n]);assert.ok(!coreUnitKeywords(u).includes('血盟'));}
      const h = fixture('E046', enhanced, form.text, side);
      h.state.units[side] = three.map((u, i) => createCoreUnit({ ...u, id: 'linked' + i,
        effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 } }, side, i));
      await pipelines(SaveRun.copy(h.state));
    });
  }
  await check('変更対象を含まない全カードの通常・強化は開始時点de191a0と完全一致', unchanged);
  console.log(`本文1026回帰: OK ${passed}`);
})().catch(error => { console.error(error.stack); process.exitCode = 1; });

module.exports = { REVISED };
