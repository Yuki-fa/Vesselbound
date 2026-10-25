'use strict';
// 2026-10-10 利用者指定：本人・強化・指輪・攻撃で得たマナの効果を非ダメージ→ダメージへ。
const assert = require('node:assert/strict');
const core = require('../../js/battle/core');
const sheet = require('./sheet_data');
const { createSeededRng } = require('../../js/online/protocol');
const enchants = sheet.enchantCards();
const summonDefs = sheet.characterCards();
function actor(name, enhancements = [], over = {}) {
  const c = summonDefs.find(x => x.name === name) || { name, desc: '', keywords: [] };
  return { ...c, id: 'A', no: name === 'アラッサス' ? 'C058' : '', atk: 7, hp: 100, maxHp: 100,
    effectData: { effectNames: enhancements, effectTexts: enhancements.map(n => {
      const e = enchants.find(x => x.name === n); assert.ok(e, n); return e.desc;
    }) }, ...over };
}
function run(unit, extra = {}) {
  const state = core.createBattleState({
    sides: { p1: { units: [unit] }, p2: { units: [{ id: 'E', name: '敵', atk: 2, hp: 200, maxHp: 200 }] } },
    resources: { p1: { mana: 0 }, p2: { mana: 0 } }, summonDefs, ...extra,
  });
  state._coreFirstSide = 'p1';
  const events = [], runner = core.createBattleRunner(state, createSeededRng(53), e => events.push(e), { skipOpening: true });
  runner.step({ deferCompact: true });
  assert.ok(!('_attackDamageQueue' in state), '解決待ち関数を戦闘状態へ残さない');
  return { state, events };
}
const effectHits = r => r.events.filter(e => e.type === 'damage' && e.effect && e.sourceId === 'A');

// 従来は4→12→弱体1→9。指定後は弱体1→5→13→9（竜の契約の基本8+弱体1）。
const mixed = run(actor('アラッサス', ['衝撃波', '魔族の魂', '竜の契約']));
assert.deepEqual(effectHits(mixed).map(e => [e.amount, e.effectSource]), [[5, true], [13, false], [6, false]]);
const shock = mixed.events.findIndex(e => e.type === 'keyword_effect' && e.effect === 'weaken');
assert.ok(shock >= 0 && shock < mixed.events.findIndex(e => e.type === 'sweep_vfx'));
assert.equal(mixed.state.units.p2[0].hp, 200 - 5 - 13 - 6 - 8, '接触も弱体1込み');
assert.equal(mixed.events.filter(e => e.type === 'keyword_effect' && e.effect === 'effect_value').length, 1, '永久減衰は1回');

// 非ダメージ内・ダメージ内の順序を維持する。本人の全体4→魂12→竜8。
const stable = run(actor('アラッサス', ['戦術', '剣技', '魔族の魂', '竜の契約']));
const nonDamage = stable.events.filter(e => e.type === 'stat_change' && e.sourceId === 'A');
assert.deepEqual(nonDamage.slice(0, 2).map(e => e.reason), ['tactics', 'sword_skill']);
assert.deepEqual(effectHits(stable).map(e => e.amount), [4, 12, 5]);
assert.ok(stable.events.indexOf(nonDamage.at(-1)) < stable.events.indexOf(effectHits(stable)[0]));

// 合体・狂戦士による反復でも、各非ダメージを全て先に解決する。
for (const over of [{ _effectRepeatBonus: 1 }, {}]) {
  const repeated = run(actor('アラッサス', ['衝撃波', '魔族の魂'], over),
    over._effectRepeatBonus ? {} : { rings: { p1: [{ name: '狂戦士の指輪' }], p2: [] } });
  assert.equal(repeated.events.filter(e => e.type === 'keyword_effect' && e.effect === 'weaken').length, 2);
  assert.deepEqual(effectHits(repeated).map(e => e.amount), [6, 14, 6, 13]);
}

// 攻撃のマナで到達した非ダメージ閾値も、炎の矢・本人のダメージより先に出る。
const mana = run(actor('アラッサス', ['衝撃波'], { manaOnAttack: 2,
  manaCost: 2, manaRepeat: true, _manaThresholdDesc: 'ランダムな敵に4ダメージを与える。',
  _extraManaThresholds: [{ cost: 2, repeat: true, desc: 'このキャラクターは+2/+2を得る。' }] }));
const thresholds = mana.events.filter(e => e.type === 'mana_threshold');
assert.equal(thresholds.length, 2);
assert.match(thresholds[0].desc, /\+2\/\+2/);
assert.match(thresholds[1].desc, /4ダメージ/);
assert.ok(mana.events.findIndex(e => e.type === 'stat_change' && e.unitId === 'A')
  < mana.events.findIndex(e => e.type === 'damage'));
assert.deepEqual(effectHits(mana).map(e => e.amount), [5, 5]);

// 嵐はダメージ分類内の最後。攻撃で増えたマナに対して本人の全体4→嵐50。
const storm = run(actor('アラッサス', ['衝撃波'], { manaOnAttack: 10 }),
  { rings: { p1: [{ name: '嵐の指輪', desc: require('./sheet_data').sheetRows('ring').find(r=>r['No.']==='R023')['効果'] }], p2: [] } });
assert.deepEqual(storm.events.filter(e => e.type === 'damage' && e.damageKind !== 'combat').map(e => e.amount), [5, 51]);

// 自傷から派生した負傷マナも次の手番へ遅らせない。炎の矢2回→嵐をこの一撃で解決。
const injuryMana = run(actor('アラッサス', ['懺悔'], { manaOnInjury: 5,
  manaCost: 5, manaRepeat: true, _manaThresholdDesc: 'ランダムな敵に4ダメージを与える。' }),
  { rings: { p1: [{ name: '嵐の指輪', desc: require('./sheet_data').sheetRows('ring').find(r=>r['No.']==='R023')['効果'] }], p2: [] } });
assert.deepEqual(injuryMana.events.filter(e => e.type === 'damage' && e.damageKind !== 'combat').map(e => e.amount), [1, 1, 4, 4, 4, 50]);
assert.equal(injuryMana.events.filter(e => e.type === 'mana_threshold').length, 2);

// 召喚を先に解決したので、後の「全キャラクター」ダメージには新しい召喚体も含まれる。
const summoned = run(actor('サイレン', [], { effectData: { effectNames: [],
  effectTexts: ['攻撃：「検査召喚」を召喚する。'] } }),
  { summonDefs: [{ name: '検査召喚', power: 1, life: 6, color: '赤', keywords: [], desc: '' }] });
const summonEvent = summoned.events.find(e => e.type === 'summon');
assert.ok(summonEvent, '非ダメージの召喚が発動');
const summonHit = summoned.events.find(e => e.type === 'damage' && e.unitId === summonEvent.unit.id);
assert.ok(summonHit && summonHit.amount === 1 && summonHit.hpAfter === Math.max(0, summonEvent.unit.hp - 1));
assert.ok(summoned.events.indexOf(summonEvent) < summoned.events.indexOf(summonHit));

// 先行する変身は発動済みの本人・強化のダメージを消さず、魔族の魂の減衰も1回だけ。
const soul = enchants.find(x => x.name === '魔族の魂');
const transformed = run(actor('アラッサス', [], { effectData: {
  effectNames: ['魔族の魂'], effectTexts: [soul.desc, '攻撃：「ゴブリン」に変身する。'],
} }));
assert.equal(transformed.state.units.p1[0].name, 'ゴブリン');
assert.deepEqual(effectHits(transformed).map(e => [e.amount, e.effectSource]), [[4, true], [12, false]]);
assert.ok(transformed.events.findIndex(e => e.type === 'transform') < transformed.events.indexOf(effectHits(transformed)[0]));
assert.equal(transformed.events.filter(e => e.type === 'keyword_effect' && e.effect === 'effect_value').length, 1);

// 味方が攻撃するたびのダメージも弱体の後、ダメージ分類内では本人の全体攻撃より先。
const observed = run(actor('アラッサス', ['衝撃波']), { sides: {
  p1: { units: [actor('アラッサス', ['衝撃波']), { id: 'O', name: '観測者', atk: 1, hp: 100,
    maxHp: 100, desc: '味方が攻撃するたび、全ての敵に2ダメージを与える。' }] },
  p2: { units: [{ id: 'E', name: '敵', atk: 2, hp: 200, maxHp: 200 }] },
} });
const observerHits = observed.events.filter(e => e.type === 'damage' && e.damageKind !== 'combat');
assert.deepEqual(observerHits.map(e => [e.sourceId, e.amount]), [['O', 3], ['A', 5]]);
assert.ok(observed.events.findIndex(e => e.type === 'keyword_effect' && e.effect === 'weaken')
  < observed.events.indexOf(observerHits[0]));

// ワームの毒発動を遅らせても、修正死・血・死亡効果は失わない。
const poison = run(actor('ワーム', ['衝撃波']), { sides: {
  p1: { units: [actor('ワーム', ['衝撃波'])] },
  p2: { units: [{ id: 'E', name: '毒の敵', atk: 2, hp: 3, maxHp: 3, poison: 4,
    desc: '死亡：全ての味方は+1/+1を得る。' }, { id: 'E2', name: '仲間', atk: 2, hp: 200, maxHp: 200 }] },
} });
assert.equal(poison.events.filter(e => e.type === 'death' && e.unitId === 'E' && e.statChange).length, 1);
assert.equal(poison.state.blood.p2, 1);
assert.ok(poison.events.some(e => e.type === 'stat_change' && e.unitId === 'E2' && e.reason !== 'poison'));
console.log('攻撃効果順序1010: 弱体先行・分類内順序・反復・マナ閾値/指輪/負傷マナ・召喚/変身先行・味方攻撃誘発・毒の死亡誘発 OK');
