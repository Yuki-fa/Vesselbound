'use strict';
// 2026-10-19：ATK0逃走は効果1回の直後に割り込む。両陣営・手番進行・再生用イベントを検査する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require(process.env.VB_CORE_BASELINE || '../../js/battle/core');
const protocol = require('../../js/online/protocol');
const present = require('../../js/battle/present');
const { sheetRows } = require('./sheet_data');
const clone = value => JSON.parse(JSON.stringify(value));
const other = side => side === 'p1' ? 'p2' : 'p1';
const unit = (id, extra = {}) => ({ id, name: id, atk: 4, hp: 50, maxHp: 50, keywords: [], ...extra });
let checked = 0, failed = 0;
function check(name, run) {
  try { run(); checked++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + error.message); }
}
function harness(side, allies, enemies, rings = {}) {
  const state = core.createBattleState({ sides: { [side]: { units: allies }, [other(side)]: { units: enemies } }, rings });
  state._coreFirstSide = side;
  const events = [], rng = protocol.createSeededRng(1019), emit = e => events.push(e);
  const runner = core.createBattleRunner(state, rng, emit, { skipOpening: true });
  return { state, events, emit, rng, runner, find: id => [...state.units.p1, ...state.units.p2].find(u => u && u.id === id) };
}
function fleeIndex(events, id) {
  const i = events.findIndex(e => e.type === 'fled' && e.unitId === id);
  assert.ok(i >= 0, id + 'が効果直後に逃走していない');
  assert.equal(events.filter(e => e.type === 'fled' && e.unitId === id).length, 1);
  return i;
}
function noUseAfterFlee(events, id) {
  const i = fleeIndex(events, id);
  assert.equal(events.slice(i + 1).some(e => e.type === 'attack' && (e.attackerId === id || e.targetId === id)), false,
    id + 'が逃走後も攻撃するか攻撃の対象になっている');
  assert.equal(events.slice(i + 1).some(e => ['damage', 'stat_change', 'keyword_effect'].includes(e.type) && e.unitId === id), false,
    id + 'が逃走後も効果の対象になっている');
}
const ring = name => {
  const row = sheetRows('ring').find(r => r['名前'] === name);
  assert.ok(row, name);
  return { name, no: row['No.'], desc: row['効果'] };
};
for (const side of ['p1', 'p2']) {
  check(`${side}：同じ負傷連鎖のATK低下→反射ダメージでは、低下直後に逃走し反射対象から外れる`, () => {
    const h = harness(side, [unit('reactor', { desc: '負傷：ランダムな敵はATK-2を得る。\n負傷：このキャラクターにダメージを与えた敵に3ダメージを与える。' })],
      [unit('victim', { atk: 2 }), unit('reserve')]);
    h.runner.applyHit(h.find('victim'), h.find('reactor'), 1);
    const i = fleeIndex(h.events, 'victim');
    assert.equal(h.events[i - 1].reason, 'injury_random_enemy_atk_down');
    noUseAfterFlee(h.events, 'victim');
    assert.equal(h.find('victim').hp, 0);
  });
  for (const protection of ['復活', '根性']) check(`${side}/${protection}：邪眼でATK0になった体は負傷・死亡・死亡観測・復活を発動しない`, () => {
    const h = harness(side, [unit('eye', { keywords: ['邪眼2'] })], [unit('victim', { atk: 2, keywords: [protection],
      manaOnDeath: 7, desc: '負傷：このキャラクターは+2/+2を得る。\n死亡：7マナを得る。' }),
    unit('observer', { desc: '常時：キャラクターが死亡するたび、このキャラクターは+3/+1を得る。' })],
    { [other(side)]: [ring('復活の指輪')] });
    h.runner.applyHit(h.find('eye'), h.find('victim'), 1);
    fleeIndex(h.events, 'victim');
    noUseAfterFlee(h.events, 'victim');
    assert.equal(h.events.some(e => ['death', 'revive', 'blood_set', 'mana_gain'].includes(e.type)), false);
    assert.equal(h.events.some(e => e.type === 'stat_change' && e.unitId === 'observer'), false);
    assert.equal(h.find('victim').hp, 0);
    assert.equal(h.state.resources[other(side)].mana, 0);
  });
  check(`${side}：邪眼後は衝撃など別の命中効果の対象にもならない（攻防一体でもATK0は逃走）`, () => {
    const h = harness(side, [unit('eye', { keywords: ['邪眼2', '衝撃1'] })],
      [unit('victim', { atk: 2, keywords: ['攻防一体'] }), unit('reserve')]);
    h.runner.applyHit(h.find('eye'), h.find('victim'), 1);
    noUseAfterFlee(h.events, 'victim');
    assert.equal(h.find('victim').weaken, 0);
  });
  check(`${side}：同時命中の確定後、先の負傷効果で逃走した後続対象は負傷・死亡を誘発しない`, () => {
    const h = harness(side, [unit('source')], [unit('reactor', { atk: 3, manaOnInjury: 2,
      desc: '負傷：全ての敵はATK-4を得る。' }), unit('reserve', { atk: 3 })]);
    // 同じ陣営の全体ダメージでも、先の対象の負傷効果から発生したATK0を取りこぼさない。
    h.find('source').desc = '負傷：ランダムな敵はATK-4を得る。';
    const pending = [];
    h.runner.applyHit(h.find('reactor'), h.find('source'), 1, false, false, false, { deferTriggers: true, collect: pending });
    h.runner.applyHit(h.find('source'), h.find('reactor'), 1, false, false, false, { deferTriggers: true, collect: pending });
    for (const hit of pending) core.coreApplyHitTriggers(h.state, hit.source, hit.target, hit.result, hit.before,
      hit.counter, h.rng, h.emit, h.runner.applyHit, hit.opt);
    noUseAfterFlee(h.events, 'reactor');
    assert.equal(h.events.some(e => e.type === 'stat_change' && e.reason === 'injury_enemy_atk_down'), false);
    assert.equal(h.events.some(e => e.type === 'death'), false);
    assert.equal(h.state.resources[other(side)].mana, 0);
  });
  check(`${side}：開戦デバフは全員への修正直後に逃走し、次の開戦ダメージから外れる`, () => {
    const h = harness(side, [unit('opener', { hp: 10, maxHp: 10,
      desc: '開戦：全ての敵は-1/-1を得る。この効果は、このキャラクターのHP10につき1回発生する。',
      _adjacentPanelEffectTexts: ['開戦：このキャラクターの死亡効果を発動する。', '死亡：全ての敵に2ダメージを与える。'] })],
      [unit('first', { atk: 1 }), unit('second', { atk: 1 }), unit('reserve', { atk: 5 })]);
    core.coreApplyOpeningEffects(h.find('opener'), h.state, h.rng, h.emit, h.runner.applyHit);
    noUseAfterFlee(h.events, 'first'); noUseAfterFlee(h.events, 'second');
    const first = fleeIndex(h.events, 'first'), second = fleeIndex(h.events, 'second');
    assert.equal(second, first + 1);
    assert.ok(h.events.some(e => e.type === 'damage' && e.unitId === 'reserve'));
  });
  check(`${side}：ATKとHPが同時に0なら従来どおり死亡し、死亡効果を1回発動`, () => {
    const h = harness(side, [unit('opener', { hp: 10, maxHp: 10,
      desc: '開戦：全ての敵は-1/-1を得る。この効果は、このキャラクターのHP10につき1回発生する。' })],
      [unit('victim', { atk: 1, hp: 1, maxHp: 1, manaOnDeath: 2 }), unit('reserve', { atk: 20, hp: 500, maxHp: 500 })]);
    core.coreApplyOpeningEffects(h.find('opener'), h.state, h.rng, h.emit, h.runner.applyHit);
    assert.equal(h.events.some(e => e.type === 'fled'), false);
    assert.equal(h.events.filter(e => e.type === 'death' && e.unitId === 'victim').length, 1);
    assert.equal(h.state.resources[other(side)].mana, 2);
  });
  check(`${side}：全体ATK奪取は獲得まで終えて同時逃走し、後続ダメージ・接触・追加攻撃から外れる`, () => {
    const h = harness(side, [unit('imp', { name: 'インプ', desc: '攻撃：全てのキャラクターからATKを1奪う。',
      keywords: ['二段攻撃'], _adjacentPanelEffectTexts: ['攻撃：ランダムな敵に3ダメージを与える。'] }), unit('ally', { atk: 1 })],
    [unit('victim', { atk: 1 }), unit('reserve', { atk: 20, hp: 500, maxHp: 500 })]);
    h.runner.step({ deferCompact: true });
    const i = fleeIndex(h.events, 'ally');
    assert.equal(h.events[i - 1].reason, 'imp_gain', '奪ったATKの獲得前に逃走している');
    assert.equal(h.events[i + 1].type, 'fled', '同時対象の逃走が連続していない');
    noUseAfterFlee(h.events, 'ally'); noUseAfterFlee(h.events, 'victim');
    assert.ok(h.events.some(e => e.type === 'damage' && e.unitId === 'reserve'));
  });
  check(`${side}：奪ったATKの獲得による観測効果が割り込む前にも逃走する`, () => {
    const h = harness(side, [unit('imp', { name: 'インプ', desc: '攻撃：全てのキャラクターからATKを1奪う。',
      _resonanceEffectNames: ['ワイバーン'],
      _adjacentPanelEffectTexts: ['常時：このキャラクターはATKを得るたび、ランダムな敵に2ダメージを与える。'] })],
      [unit('victim', { atk: 1 }), unit('reserve', { atk: 20 })]);
    core.coreApplyAttackEffects(h.find('imp'), h.state, h.rng, h.emit, h.runner.applyHit);
    const i = fleeIndex(h.events, 'victim');
    assert.equal(h.events[i - 1].reason, 'imp_gain');
    noUseAfterFlee(h.events, 'victim');
    assert.ok(h.events.findIndex(e => e.type === 'damage') > i, 'ATK獲得観測が逃走より先に発動している');
    assert.ok(h.events.some(e => e.type === 'damage' && e.unitId === 'reserve'));
  });
  for (const manaText of ['全ての赤の味方は+1/+1を得る。', '全ての味方に+1/+1を与えた後、1ダメージを与える。',
    'ランダムな赤の味方2体は+1/+1を得る。']) check(`${side}：観測中の逃走を確定済み対象一覧から除外（${manaText}）`, () => {
    const h = harness(side, [unit('caster', { manaCost: 1, manaThresholdDesc: manaText }),
      unit('wyvern', { name: 'ワイバーン', color: '赤',
        desc: '常時：このキャラクターはATKを得るたび、ランダムな敵に2ダメージを与える。' }),
      unit('victim', { color: '赤', atk: 1 })],
      [unit('reactor', { desc: '負傷：全ての敵はATK-1を得る。' })]);
    h.state.resources[side].mana = 1;
    core.coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.runner.applyHit);
    noUseAfterFlee(h.events, 'victim');
    assert.equal(h.find('victim').hp, 0, '逃走後に古い対象一覧からバフされて盤面へ戻っている');
  });
  check(`${side}：修道の刻印で攻撃者自身がATK0になると、後続の自己バフ・接触・追加攻撃をしない`, () => {
    const h = harness(side, [unit('self', { atk: 5, keywords: ['修道の刻印', '二段攻撃'],
      _adjacentPanelEffectTexts: ['攻撃：このキャラクターは+1/+1を得る。'] }), unit('ally', { atk: 20 })], [unit('victim')]);
    h.runner.step({ deferCompact: true });
    noUseAfterFlee(h.events, 'self');
    assert.equal(h.events.some(e => e.type === 'death' && e.unitId === 'self'), false);
    assert.equal(h.events.some(e => e.type === 'attack' && e.attackerId === 'self'), false);
  });
  check(`${side}：ATKへのダメージで逃走した体は反撃しない`, () => {
    const h = harness(side, [unit('breaker', { atk: 2, desc: '攻撃：攻撃はHPではなくATKにダメージを与える。' })], [unit('victim', { atk: 1 })]);
    h.runner.step({ deferCompact: true });
    noUseAfterFlee(h.events, 'victim');
    assert.equal(h.events.some(e => e.type === 'damage' && e.sourceId === 'victim'), false);
    assert.deepEqual(h.events.filter(e => ['stat_change', 'damage', 'fled'].includes(e.type)).map(e => e.type),
      ['stat_change', 'damage', 'fled']);
  });
  check(`${side}：ATKへのダメージでも封印中は逃走判定を行わない`, () => {
    const h = harness(side, [unit('breaker', { desc: '攻撃：攻撃はHPではなくATKにダメージを与える。' })],
      [unit('sealed', { atk: 1, keywords: ['封印1'] })]);
    h.find('sealed')._sealed = true;
    h.runner.applyHit(h.find('breaker'), h.find('sealed'), 2, true);
    assert.equal(h.events.some(e => e.type === 'fled'), false);
    assert.ok(h.find('sealed').hp > 0);
  });
  check(`${side}：HPとATKの入れ替えでは両者の確定値を使い、途中の減算で逃走しない`, () => {
    const h = harness(side, [unit('swapper', { hp: 7, maxHp: 7, desc: '攻撃：このキャラクターのHPと対象のATKを入れ替える。' })], [unit('victim', { atk: 2 })]);
    core.coreApplyAttackEffects(h.find('swapper'), h.state, h.rng, h.emit, h.runner.applyHit);
    assert.deepEqual([h.find('swapper').hp, h.find('victim').atk], [2, 7]);
    assert.equal(h.events.some(e => e.type === 'fled'), false);
  });
  for (const withRing of [false, true]) check(`${side}：復活で一時ATK0→常時指輪の適用${withRing ? 'あり' : 'なし'}は再構築の完了後に判定`, () => {
    const h = harness(side, [unit('reviver', { atk: 1, baseAtk: 1, color: '赤', keywords: ['復活'] })], [unit('victim')],
      { [side]: withRing ? [ring('赤い瞳の指輪')] : [] });
    h.find('reviver').hp = 0;
    core.coreTryRevive(h.find('reviver'), h.state, h.emit, h.rng, h.runner.applyHit);
    assert.equal(h.events.find(e => e.type === 'revive').atk, 0, '再構築途中の0を通っていない');
    if (withRing) {
      assert.equal(h.find('reviver').atk, 10);
      assert.ok(h.find('reviver').hp > 0);
      assert.equal(h.events.some(e => e.type === 'fled'), false);
    } else fleeIndex(h.events, 'reviver');
  });
  check(`${side}：封印中はATK0でも残り、解放直後に逃走し解放効果を発動しない`, () => {
    const h = harness(side, [unit('sealed', { keywords: ['封印1'], desc: '解放：このキャラクターは+2/+2を得る。' }), unit('ally')], [unit('victim')]);
    const subject = h.find('sealed');
    subject._sealed = true; subject._sealValue = 1; subject.atk = 0;
    core.coreSweepAtkZeroFlee(h.state, h.emit);
    assert.ok(subject.hp > 0); assert.equal(h.events.length, 0);
    h.state.blood[side] = 1;
    h.runner.resolveSeals();
    assert.equal(h.events[0].type, 'seal_release');
    assert.equal(fleeIndex(h.events, 'sealed'), 1);
    noUseAfterFlee(h.events, 'sealed');
  });
  check(`${side}：ATK0への変身は変身完了直後に逃走`, () => {
    const h = harness(side, [unit('source')], [unit('victim')]);
    h.state.summonDefs = [{ name: '変身先', power: 0, life: 20, desc: '' }];
    core.coreTransformUnit(h.state, h.find('victim'), '変身先', h.emit);
    assert.equal(h.events[0].type, 'transform');
    assert.equal(fleeIndex(h.events, 'victim'), 1);
    noUseAfterFlee(h.events, 'victim');
  });
  check(`${side}：自己変身で逃走した後は入れ替えなど後続の自己効果で盤面へ戻らない`, () => {
    const h = harness(side, [unit('source', { desc: '攻撃：「変身先」に変身する。',
      _adjacentPanelEffectTexts: ['攻撃：このキャラクターのHPと対象のATKを入れ替える。'] })], [unit('victim')]);
    h.state.summonDefs = [{ name: '変身先', power: 0, life: 20, desc: '' }];
    core.coreApplyAttackEffects(h.find('source'), h.state, h.rng, h.emit, h.runner.applyHit);
    noUseAfterFlee(h.events, 'source');
    assert.equal(h.find('source').hp, 0);
    assert.equal(h.events.some(e => e.reason === 'attack_swap'), false);
  });
  check(`${side}：ATK0での呼び戻しも召喚・常時補正の完了直後に逃走`, () => {
    const h = harness(side, [unit('source')], [unit('victim')]);
    const child = core.coreSummonUnit(h.state, side, { name: '呼び戻し', atk: 0, hp: 5,
      _revivedFromDead: true }, h.emit, 'source');
    assert.ok(child);
    const i = fleeIndex(h.events, child.id);
    assert.equal(h.events[i - 1].type, 'summon');
    noUseAfterFlee(h.events, child.id);
  });
  check(`${side}：最後の敵が攻撃効果の途中で逃走したら、接触せず既存の全滅判定で終了`, () => {
    const h = harness(side, [unit('imp', { name: 'インプ', desc: '攻撃：全てのキャラクターからATKを1奪う。',
      keywords: ['三段攻撃'], _adjacentPanelEffectTexts: ['攻撃：ランダムな敵に3ダメージを与える。'] })], [unit('victim', { atk: 1 })]);
    h.runner.step({ deferCompact: true });
    const result = h.runner.finish();
    assert.equal(result.outcome, side); assert.equal(result.endReason, 'wiped'); assert.equal(result.turns, 1);
    noUseAfterFlee(h.events, 'victim');
    assert.equal(h.events.some(e => e.type === 'damage'), false);
    assert.equal(h.events.at(-1).type, 'battle_end');
  });
  check(`${side}：手番ごとのPvE入口とオンライン全計算は同じイベント列・最終状態`, () => {
    const setup = { seed: 1019, sides: { [side]: { units: [unit('imp', { name: 'インプ',
      desc: '攻撃：全てのキャラクターからATKを1奪う。', keywords: ['二段攻撃'],
      _adjacentPanelEffectTexts: ['攻撃：ランダムな敵に3ダメージを与える。'] }), unit('ally')] },
    [other(side)]: { units: [unit('victim', { atk: 1 }), unit('reserve')] } }, turnLimit: 20 };
    const state = core.createBattleState(clone(setup)), events = [];
    const runner = core.createBattleRunner(state, protocol.createSeededRng(setup.seed), e => events.push(e), { turnLimit: setup.turnLimit });
    while (!runner.result && state.turn < setup.turnLimit) { if (runner.step()) break; }
    const result = runner.finish();
    const ctx = vm.createContext({ ...core, ...protocol, module: { exports: {} } });
    vm.runInContext(fs.readFileSync(require.resolve('../../js/online/sim'), 'utf8'), ctx);
    const online = ctx.module.exports.simulateOnlineBattle(clone(setup));
    assert.deepEqual(clone(online.events), clone(events));
    assert.deepEqual(clone(online.finalState), clone(core.battleCoreFinalState(state)));
    assert.deepEqual([online.outcome, online.endReason, online.turns], [result.outcome, result.endReason, result.turns]);
    noUseAfterFlee(events, 'victim');
  });
  check(`${side}：共通再生は対象の逃走前に踏み込みを戻し、逃走後へ攻撃演出を残さない`, () => {
    const events = [{ type: 'turn_begin' }, { type: 'effect_flash', side, unitId: 'imp', trigger: 'attack', targetId: 'victim' },
      { type: 'stat_change', side: other(side), unitId: 'victim', sourceId: 'imp', atk: -1, hp: 0, reason: 'imp_steal' },
      { type: 'fled', side: other(side), unitId: 'victim', reason: 'atk_zero' },
      { type: 'attack', side, attackerId: 'imp', targetId: 'victim', damage: 0, counterDamage: 0, effectOnly: true }];
    const prepared = present.presentReorderDeathsAfterDamageBatch(events);
    const attacks = prepared.filter(e => e.type === 'attack');
    assert.equal(attacks.length, 1);
    assert.equal(attacks[0].effectOnly, true);
    assert.ok(prepared.indexOf(attacks[0]) < prepared.findIndex(e => e.type === 'fled'), '対象の逃走後に踏み込みを再生している');
  });
  check(`${side}：踏み込みの中断で同時逃走の束を分断せず、次の接触は新しい相手へ向かう`, () => {
    const events = [{ type: 'effect_flash', side, unitId: 'imp', trigger: 'attack', targetId: 'victim' },
      { type: 'stat_change', side, unitId: 'ally', sourceId: 'imp', atk: -1, hp: 0 },
      { type: 'stat_change', side: other(side), unitId: 'victim', sourceId: 'imp', atk: -1, hp: 0 },
      { type: 'fled', side, unitId: 'ally' }, { type: 'fled', side: other(side), unitId: 'victim' },
      { type: 'attack', side, attackerId: 'imp', targetId: 'reserve', damage: 5, counterDamage: 1 }];
    const prepared = present.presentReorderDeathsAfterDamageBatch(events);
    const i = prepared.findIndex(e => e.type === 'fled');
    assert.equal(present.presentFledBatchEvents(prepared, i).length, 2);
    assert.equal(prepared[i - 1].type, 'attack'); assert.equal(prepared[i - 1].effectOnly, true);
    assert.deepEqual(prepared.filter(e => e.type === 'attack' && !e.effectOnly).map(e => e.targetId), ['reserve']);
  });
}
if (failed) { process.exitCode = 1; console.error(`ATK0逃走1019：${checked}件OK／${failed}件NG`); }
else console.log(`ATK0逃走1019：${checked}件OK`);
