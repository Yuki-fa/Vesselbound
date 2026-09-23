'use strict';

// 静寂の巻物「次の戦闘中、全ての敵は一度攻撃するまで全ての効果が無効化される。」の検査。
//
// 1) 沈黙した敵は、最初の攻撃の手番を終えるまで「効果を何も持たない同じ数値の体」と
//    **イベント列が完全に一致する**こと。全キャラクターと全強化カードで確かめる。
//    以前はコアが攻撃効果と死亡効果しか止めておらず、開戦・負傷・根性・復活・結界・
//    攻防一体・マナ効果などが素通りしていた（2026-09-23）。
//    場面は2つ：生き残って攻撃する（live）／攻撃する前に倒される（death）。
// 2) 最初の攻撃を終えたら効果が戻ること（ゴーレムの負傷効果・エルフの結界キーワード）。
//
// VB_ONLY=カード名（部分一致）で絞れる。
const assert = require('node:assert/strict');
const core = require('../../js/battle/core');
const sheet = require('./sheet_data');
const {createSeededRng} = require('../../js/online/protocol');

const cards = sheet.characterCards();
const enchantments = sheet.enchantCards();
const summonDefs = cards.map(c => ({
  name: c.name, power: c.power || 1, life: c.life || 3, color: c.color, keywords: c.keywords, desc: c.desc,
}));
const ONLY = process.env.VB_ONLY || '';
const SCROLL = {id: 'item_silence_scroll', name: '静寂の巻物', itemEffectKey: 'silence_scroll'};

function makeState(target, scenario, withScroll) {
  const hp = scenario === 'death' ? 1 : 40;
  // 味方を多くして味方が先攻になるようにする（敵は攻撃される→攻撃する、の順になる）。
  const p1 = [0, 1, 2].map(i => ({id: 'a' + i, name: '味方' + i, atk: 1, hp: 60, maxHp: 60, color: '赤'}));
  const p2 = [{...target, id: 'T', atk: 3, hp, maxHp: hp},
    {id: 'b', name: '素体', atk: 1, hp: 60, maxHp: 60, color: '青'}];
  return core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 20, gold: 0}},
    sides: {p1: {units: p1}, p2: {units: p2}}, summonDefs, itemDefs: [],
    items: {p1: withScroll ? [SCROLL] : [], p2: []},
  });
}
function runEvents(target, scenario, withScroll) {
  const state = makeState(target, scenario, withScroll);
  const events = [];
  core.runBattleCore(state, createSeededRng(7), {turnLimit: 6, onEvent: e => events.push(e)});
  return {events, state};
}
const KEYS = ['type', 'side', 'unitId', 'attackerId', 'targetId', 'amount', 'atk', 'hp', 'damage',
  'effect', 'keyword', 'reason', 'gained'];
const norm = e => JSON.stringify(Object.fromEntries(KEYS.filter(k => e[k] !== undefined).map(k => [k, e[k]])));
// 対象の最初の攻撃の手番が終わるまで（次に別の体が攻撃するまで）で切る。
function untilFirstAttackDone(events) {
  const first = events.findIndex(e => e.type === 'attack' && e.attackerId === 'T');
  if (first < 0) return events;
  const next = events.findIndex((e, i) => i > first && e.type === 'attack' && e.attackerId !== 'T');
  return next < 0 ? events : events.slice(0, next);
}

const rows = [
  ...cards.map(c => ({kind: 'card', name: c.name,
    unit: {name: c.name, color: c.color || '赤', desc: c.desc || '', keywords: (c.keywords || []).slice()}})),
  ...enchantments.map(r => ({kind: 'enchant', name: r.name,
    unit: {name: '素体T', color: '赤', desc: '', keywords: [],
      effectData: {effectNames: [r.name], effectTexts: [r.desc || '']}}})),
];
const failures = [];
let checked = 0;
for (const row of rows) {
  if (ONLY && !row.name.includes(ONLY)) continue;
  // 封印は効果ではなく状態（戦闘開始時に封印されている体は巻物の対象外）。
  if (/封印/.test((row.unit.keywords || []).join(' ') + row.unit.desc)) continue;
  for (const scenario of ['live', 'death']) {
    checked++;
    try {
      const silenced = untilFirstAttackDone(runEvents(row.unit, scenario, true).events).map(norm);
      const blank = untilFirstAttackDone(runEvents({name: '素体T', color: row.unit.color, desc: '', keywords: []},
        scenario, true).events).map(norm);
      const n = Math.max(silenced.length, blank.length);
      let i = 0;
      while (i < n && silenced[i] === blank[i]) i++;
      if (i < n) failures.push(`${row.kind}:${row.name}[${scenario}] ${i}件目: 沈黙=${silenced[i] || '(なし)'} / 効果なし=${blank[i] || '(なし)'}`);
    } catch (error) {
      failures.push(`${row.kind}:${row.name}[${scenario}] 例外 ${error.stack}`);
    }
  }
}

// 2) 最初の攻撃の後は効果が戻る。
if (!ONLY) {
  const golem = cards.find(c => c.name === 'ゴーレム');
  const {events} = runEvents({name: golem.name, color: golem.color, desc: golem.desc, keywords: golem.keywords.slice()}, 'live', true);
  const firstDone = untilFirstAttackDone(events).length;
  const before = events.slice(0, firstDone).filter(e => e.reason === 'golem').length;
  const after = events.slice(firstDone).filter(e => e.reason === 'golem').length;
  if (before !== 0 || after === 0) failures.push(`ゴーレムの負傷効果：最初の攻撃まで${before}回（0のはず）・その後${after}回（1回以上のはず）`);

  const elf = cards.find(c => c.name === 'エルフ');
  const elfState = runEvents({name: elf.name, color: elf.color, desc: elf.desc, keywords: elf.keywords.slice()}, 'live', true).state;
  const elfUnit = elfState.units.p2.find(u => u.id === 'T');
  if (elfUnit && elfUnit.hp > 0 && core.coreUnitShieldValue(elfUnit) <= 0) failures.push('エルフ：最初の攻撃の後も結界のキーワードが戻っていない');
  if (elfUnit && (elfUnit._silenced || elfUnit._silenceStash)) failures.push('エルフ：最初の攻撃の後も沈黙が解けていない');
}

assert.equal(failures.length, 0, failures.slice(0, 10).join('\n'));
console.log(`silence scroll ok: ${checked} cases`);
