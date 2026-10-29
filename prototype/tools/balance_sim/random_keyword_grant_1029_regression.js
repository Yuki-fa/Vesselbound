'use strict';
// 2026-10-29 利用者指定：「戦闘中にランダムな対象に結界など重複しないキーワードを与える場合、
// すでにそのキーワードを持つキャラは抽選から除外してください」。
// 結界は以前から除外済み（coreGrantRandomShields）。復活・防戦・生贄も同じにする。
const assert = require('node:assert/strict');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); } };
const unit = (id, extra = {}) => ({ id, name: id, atk: 3, hp: 30, maxHp: 30, keywords: [], ...extra });
function grants(events, keyword) {
  return events.filter(e => e.type === 'keyword_effect' && e.effect === 'keyword_gain' && e.keyword === keyword).map(e => e.unitId);
}
check('死亡：ランダムな味方に復活を与える（ジャンシー）は、復活を持つ味方を選ばない', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const state = core.createBattleState({ sides: {
      p1: { units: [unit('jiangshi', { hp: 1, maxHp: 1, desc: '死亡：ランダムな味方に復活を与える。' }),
        unit('has', { keywords: ['復活'] }), unit('none')] },
      p2: { units: [unit('foe', { atk: 10 })] } } });
    const events = [], rng = createSeededRng(seed), emit = e => events.push(e);
    core.coreResolveHit(state, state.units.p2[0], state.units.p1[0], 10, false, rng, emit, {});
    assert.deepEqual(grants(events, '復活'), ['none'], 'seed ' + seed);
  }
});
check('全員が既に持っていれば、誰にも与えない（乱数も使わず重ねない）', () => {
  const state = core.createBattleState({ sides: {
    p1: { units: [unit('jiangshi', { hp: 1, maxHp: 1, desc: '死亡：ランダムな味方に復活を与える。' }), unit('has', { keywords: ['復活'] })] },
    p2: { units: [unit('foe', { atk: 10 })] } } });
  const events = [], rng = createSeededRng(3), emit = e => events.push(e);
  core.coreResolveHit(state, state.units.p2[0], state.units.p1[0], 10, false, rng, emit, {});
  assert.deepEqual(grants(events, '復活'), []);
  assert.equal(state.units.p1.find(u => u.id === 'has').keywords.filter(k => k === '復活').length, 1);
});
check('マナ効果：ランダムな味方が復活を得る（ヴリコラカス）も既に持つ体を外す', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const state = core.createBattleState({ sides: {
      p1: { units: [unit('vry', { manaCost: 1, manaThresholdDesc: 'ランダムな味方が復活を得る。' }), unit('has', { keywords: ['復活'] }), unit('none')] },
      p2: { units: [unit('f0', { keywords: ['防戦'] }), unit('f1')] } } });
    state.resources.p1.mana = 1;
    const events = [], rng = createSeededRng(seed), emit = e => events.push(e);
    const hit = (s, t, n, c, ss, st, o) => core.coreResolveHit(state, s, t, n, c, rng, emit, { skipSourceEffects: !!ss, skipTough: !!st, ...(o || {}) });
    core.coreApplyManaThresholdEffects(state, rng, emit, hit);
    assert.ok(!grants(events, '復活').includes('has'), 'seed ' + seed + ' ' + grants(events, '復活'));
    assert.equal(grants(events, '復活').length, 1);
  }
});
if (failed) { process.exitCode = 1; console.error(`重ならないキーワードのランダム付与1029：${failed}件NG`); } else console.log('重ならないキーワードのランダム付与1029：OK');
