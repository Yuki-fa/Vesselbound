'use strict';
// 旧仕様との比較は、決着前の全イベントと、全滅しなかった戦闘の全結果を守る。
// 全滅後は1027で意図して変更した区間なので、旧版の最終値を期待値にしない。
const assert = require('node:assert/strict');
const counts = { full: 0, decided: 0, changed: 0, outcomes: 0, removed: new Set() };
function firstWipe(events) {
  const units = new Map();
  let started = false;
  const alive = side => [...units.values()].some(u => u.side === side && u.hp > 0 && !u.sealed && !u.object);
  const enter = (side, u) => units.set(String(u.id), { side, hp: Number(u.hp), sealed: !!u._sealed, object: !!(u._isObject || u._isSoul) });
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.type === 'battle_start') for (const side of ['p1', 'p2']) for (const u of e.sides[side] || []) enter(side, u);
    const unit = units.get(String(e.unitId));
    if (e.type === 'summon' && e.unit) enter(e.side, e.unit);
    if (unit) {
      if (e.type === 'damage' && e.hpAfter != null) unit.hp = Number(e.hpAfter);
      if (e.type === 'stat_change') unit.hp += Number(e.hp) || 0;
      if (['death', 'fled', 'instant_death', 'curse_death', 'sacrifice'].includes(e.type)) unit.hp = 0;
      if (e.type === 'seal_apply') unit.sealed = true;
      if (e.type === 'revive') unit.hp = Number(e.hp);
      if (e.type === 'seal_release') unit.sealed = false;
      if (e.type === 'unit_stolen') unit.side = e.toSide || (e.side === 'p1' ? 'p2' : 'p1');
    }
    if (alive('p1') && alive('p2')) started = true;
    else if (started) return i;
  }
  return -1;
}
function compareBeforeDecision(actual, expected, label) {
  const at = firstWipe(actual.events), before = firstWipe(expected.events);
  assert.equal(at, before, label + '：決着するまでの進行位置');
  if (at < 0) { assert.deepEqual(actual, expected, label); counts.full++; return; }
  assert.deepEqual(actual.events.slice(0, at + 1), expected.events.slice(0, before + 1), label + '：決着前の全イベント');
  counts.decided++;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    counts.changed++;
    if (JSON.stringify(actual.result) !== JSON.stringify(expected.result)) counts.outcomes++;
    const keys = new Set(actual.events.slice(at + 1).map(e => JSON.stringify(e)));
    for (const e of expected.events.slice(before + 1)) if (!keys.has(JSON.stringify(e))) {
      if (!['battle_end', 'turn_begin', 'blood_set', 'effect_flash'].includes(e.type)) counts.removed.add(e.type + ':' + (e.reason || e.effect || e.kind || ''));
    }
  }
}
function reportDecisionComparison() {
  console.log(`  1027照合：全結果一致${counts.full}、全滅まで一致${counts.decided}、決着後の変更${counts.changed}、結果変更${counts.outcomes}`);
  if (counts.removed.size) console.log('  決着後に変わる事象：' + [...counts.removed].sort().join(' / '));
}
module.exports = { compareBeforeDecision, reportDecisionComparison };
