'use strict';
// 2026-10-18：復活は次の自陣営手番へ割り込み、カード本体の半分から常時修正を掛け直す。
const assert = require('node:assert/strict');
const core = require(process.env.VB_CORE_BASELINE || '../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
const { sheetRows } = require('./sheet_data');
const ring = name => {
  const row = sheetRows('ring').find(r => r['名前'] === name);
  assert.ok(row, name);
  return { name, no: row['No.'], desc: row['効果'] };
};
const unit = (id, extra = {}) => ({ id, name: id, atk: 10, hp: 10, maxHp: 10, keywords: [], ...extra });
let checked = 0, failed = 0;
function check(name, fn) {
  try { fn(); checked++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + error.message); }
}
function harness(side, units, rings = []) {
  const foe = side === 'p1' ? 'p2' : 'p1';
  const state = core.createBattleState({ sides: {
    [side]: { units }, [foe]: { units: [unit('foe', { atk: 1, hp: 10000, maxHp: 10000 })] },
  }, rings: { [side]: rings } });
  state._coreFirstSide = side;
  const events = [], rng = createSeededRng(1018), emit = e => events.push(e);
  const runner = core.createBattleRunner(state, rng, emit, { skipOpening: true });
  return { state, events, emit, runner, rng, subject: state.units[side].at(-1) };
}
for (const side of ['p1', 'p2']) {
  check(`${side}：攻撃済みの後衛が復活すると、未攻撃の前衛より先に次の味方手番で攻撃`, () => {
    const h = harness(side, [unit('left'), unit('reviver', { lane: 'rear', keywords: ['復活'] })]);
    h.state.lane[side].attacked.add('reviver');
    h.subject.hp = 0;
    core.coreTryRevive(h.subject, h.state, h.emit);
    h.runner.step();
    assert.equal(h.events.find(e => e.type === 'attack' && e.side === side)?.attackerId, 'reviver');
    h.runner.step(); h.runner.step();
    assert.equal(h.events.filter(e => e.type === 'attack' && e.side === side)[1]?.attackerId, 'left', '割り込み後は元の巡回を続ける');
  });
  check(`${side}：同時復活は解決順が逆でも左→右、同列は前衛→後衛`, () => {
    const h = harness(side, [unit('front-left', { keywords: ['復活'] }),
      unit('front-right', { keywords: ['復活'] }), unit('rear-left', { lane: 'rear', keywords: ['復活'] })]);
    for (const u of h.state.units[side]) u.hp = 0;
    for (const u of [...h.state.units[side]].reverse()) core.coreTryRevive(u, h.state, h.emit);
    for (let i = 0; i < 5; i++) h.runner.step();
    assert.deepEqual(h.events.filter(e => e.type === 'attack' && e.side === side).map(e => e.attackerId),
      ['front-left', 'rear-left', 'front-right']);
  });
  check(`${side}：根性は攻撃順へ割り込まない`, () => {
    const h = harness(side, [unit('left'), unit('guts', { keywords: ['根性'] })]);
    h.subject.hp = 0; core.coreTryRevive(h.subject, h.state, h.emit); h.runner.step();
    assert.equal(h.events.find(e => e.type === 'attack' && e.side === side)?.attackerId, 'left');
  });
  check(`${side}：相手の実際の攻撃で倒れた後衛が復活し、次の味方攻撃へ割り込む`, () => {
    const h = harness(side, [unit('left'), unit('reviver', { lane: 'rear', hp: 1, maxHp: 10, guardian: true, keywords: ['復活', '守護'] })]);
    const foe = side === 'p1' ? 'p2' : 'p1';
    // 最初の手番を相手へ渡し、HP1の守護へ当てる。
    h.runner.step();
    h.events.length = 0;
    h.state.units[side].find(u => u.id === 'reviver').hp = 1;
    h.state.units[foe][0].atk = 20;
    h.state.units[foe][0].desc = '常時：このキャラクターは最もHPの低い敵を対象にする。';
    h.runner.step();
    assert.ok(h.events.some(e => e.type === 'revive' && e.unitId === 'reviver'));
    h.runner.step();
    assert.equal(h.events.find(e => e.type === 'attack' && e.side === side)?.attackerId, 'reviver');
  });
  for (const viaRing of [false, true]) {
    check(`${side}/${viaRing ? '復活の指輪' : 'キーワード復活'}：100/100の戦闘強化を捨て、本体10/10の半分＋色の指輪`, () => {
      const h = harness(side, [unit('reviver', { baseAtk: 10, baseMaxHp: 10, atk: 100, hp: 100, maxHp: 100,
        color: '赤', keywords: viaRing ? [] : ['復活'] })],
      [ring('赤い瞳の指輪'), ...(viaRing ? [ring('復活の指輪')] : [])]);
      h.subject.hp = 0;
      assert.ok(core.coreTryRevive(h.subject, h.state, h.emit));
      const revival = h.events.find(e => e.type === 'revive');
      assert.deepEqual([revival.atk, revival.hp, revival.maxHp], [5, 5, 5], '半分の値で復活を通知');
      assert.deepEqual([h.subject.atk, h.subject.hp, h.subject.maxHp], [15, 15, 15], '常時効果は半分にした後に適用');
    });
  }
  check(`${side}：奇数は切り捨て、復活のATK下限0・HP下限1を維持`, () => {
    for (const [atk, hp, a, h] of [[11, 9, 5, 4], [1, 1, 0, 1]]) {
      const t = harness(side, [unit('rounding', { atk, hp, maxHp: hp, keywords: ['復活'] })]);
      t.subject.hp = 0; core.coreTryRevive(t.subject, t.state, t.emit);
      const revived = t.events.find(e => e.type === 'revive');
      assert.deepEqual([revived.atk, revived.hp, revived.maxHp], [a, h, h]);
      // 2026-10-19：丸め・下限の計算は維持し、再構築の最終ATKが0なら直後に逃走する。
      assert.deepEqual([t.subject.atk, t.subject.hp, t.subject.maxHp], [a, a === 0 ? 0 : h, h]);
      assert.equal(t.events.some(e => e.type === 'fled' && e.unitId === t.subject.id), a === 0);
    }
  });
  check(`${side}：戦闘デバフを捨て、接続した常時+3/+2を半減後へ1回だけ適用`, () => {
    const h = harness(side, [unit('passive', { atk: 2, hp: 3, maxHp: 3, baseAtk: 10, baseMaxHp: 10,
      keywords: ['復活'], _adjacentPanelEffectTexts: ['常時：このキャラクターは+3/+2を得る。'],
      effectData: { effectTexts: ['常時：このキャラクターは+3/+2を得る。'] } })]);
    h.subject.hp = 0; core.coreTryRevive(h.subject, h.state, h.emit);
    assert.deepEqual([h.subject.atk, h.subject.hp], [8, 7]);
  });
  check(`${side}：レムレースの呼び戻しも次の攻撃へ割り込み、再復活でも元の本体を半減`, () => {
    const h = harness(side, [unit('left'), unit('lemures', { name: 'レムレース',
      desc: '死亡：「青レムレース」以外の、この戦闘で死亡したランダムなキャラクターをATKとHPを半分にして召喚する。' })]);
    const dead = core.createCoreUnit(unit('dead', { baseAtk: 11, baseMaxHp: 9, atk: 100, hp: 100, maxHp: 100, keywords: ['復活'] }), side, 3);
    dead.hp = 0; h.state.deadUnits = [core.coreUnitSnapshot(dead)];
    h.subject.hp = 0;
    core.coreApplyDeathEffects(h.subject, h.state, h.rng, h.emit, () => {});
    const summon = h.events.find(e => e.type === 'summon'); assert.ok(summon);
    const child = h.state.units[side].find(u => u.id === summon.unit.id);
    assert.deepEqual([child.atk, child.hp], [5, 4]);
    h.runner.step();
    assert.equal(h.events.find(e => e.type === 'attack' && e.side === side)?.attackerId, child.id);
    child.hp = 0; core.coreTryRevive(child, h.state, h.emit);
    assert.deepEqual([child.atk, child.hp], [5, 4], '半分の値をさらに半分にしない');
  });
  check(`${side}：敵マナ参照の常時効果は現在の値で掛け直し、戦闘強化を持ち越さない`, () => {
    const h = harness(side, [unit('mana-passive', { atk: 100, hp: 100, maxHp: 100, baseAtk: 10, baseMaxHp: 10,
      keywords: ['復活'], desc: '常時：このキャラクターは+X/+Xを得る。Xは敵が持つマナの4倍に等しい。' })]);
    const foe = side === 'p1' ? 'p2' : 'p1'; h.state.resources[foe].mana = 4;
    h.subject._genericEnemyManaBuff = 80; h.subject.hp = 0;
    core.coreTryRevive(h.subject, h.state, h.emit);
    assert.deepEqual([h.subject.atk, h.subject.hp, h.subject._genericEnemyManaBuff], [21, 21, 16]);
  });
  check(`${side}：半減後の常時HP減少でHP0になれば、再び衰弱死として死亡効果を処理`, () => {
    const h = harness(side, [unit('left', { hp: 1000, maxHp: 1000 }), unit('frail', { hp: 1, maxHp: 4, baseMaxHp: 4,
      keywords: ['復活'], manaOnDeath: 1, _adjacentPanelEffectTexts: ['常時：このキャラクターは+8/-3を得る。'] })]);
    const foe = side === 'p1' ? 'p2' : 'p1';
    h.state.units[foe][0].atk = 20;
    h.state.units[foe][0].desc = '常時：このキャラクターは最もHPの低い敵を対象にする。';
    h.runner.step(); h.runner.step();
    const deaths = h.events.filter(e => e.type === 'death' && e.unitId === 'frail');
    assert.equal(deaths.length, 2); assert.equal(deaths[1].statChange, true);
    assert.equal(h.events.filter(e => e.type === 'revive' && e.unitId === 'frail').length, 1);
    assert.equal(h.state.resources[side].mana, 2, '再死亡の効果も1回だけ発動');
  });
  check(`${side}：刻印の常時減少も、半減後に取得時ステージの値で適用`, () => {
    const h = harness(side, [unit('engraved', { atk: 100, hp: 100, maxHp: 100, baseAtk: 40, baseMaxHp: 40,
      keywords: ['復活'], _adjacentPanelAbilities: ['宿業の刻印'], _engravingStages: { '宿業の刻印': 2 },
      _adjacentPanelEffectTexts: ['常時：このキャラクターは-X/-Xを得る。'] })]);
    h.subject.hp = 0; core.coreTryRevive(h.subject, h.state, h.emit, h.rng, () => {});
    assert.deepEqual([h.subject.atk, h.subject.hp], [10, 10]);
  });
}
console.log(`復活1018：${checked}件OK / ${failed}件NG`);
if (failed) process.exitCode = 1;
