'use strict';
// コアのリファクタ前後で、イベント列・勝敗・最終状態が完全に一致するかを確かめる。
// 段階2（PvEを共通の戦闘ループへ）の各スライスは、必ずこれを通してから次へ進むこと。
//
//   1. 変更前の core.js をコピーしておく:  cp js/battle/core.js /tmp/core_prev.js
//   2. 変更後に実行:                        node tools/parity/core_refactor_diff.js /tmp/core_prev.js
//   2026-10-10の仕様差も検査: 同じコマンドへ --attack-order-1010 を付ける。
//
// 「挙動を変えない」リファクタなのに差分が出たら、その時点で差し戻すこと。
const assert = require('node:assert/strict');
const path = require('node:path');
const sheet = require('../balance_sim/sheet_data');
const { createSeededRng } = require('../../js/online/protocol');

const prevPath = process.argv[2] || '/tmp/core_prev.js';
const before = require(path.resolve(prevPath));
const after = require('../../js/battle/core.js');
const cards = sheet.characterCards();
const summonDefs = cards.map(x => ({ name: x.name, power: x.power, life: x.life, color: x.color, keywords: x.keywords, desc: x.desc }));

const setupFor = (c, i) => ({
  seed: 0x9000 + i,
  sides: {
    p1: { units: [{ id: 'u' + i, name: c.name, color: c.color, keywords: c.keywords.slice(), desc: c.desc, atk: c.power || 2, hp: c.life || 6, maxHp: c.life || 6, slot: 0, lane: 'front' }] },
    p2: { units: [{ id: 'e' + i, name: '敵', atk: 2, hp: 30, maxHp: 30, color: '青', keywords: [], desc: '', slot: 0, lane: 'front' }] },
  },
  resources: { p1: { mana: 20, gold: 200 }, p2: { mana: 20, gold: 0 } },
  summonDefs, turnLimit: 8,
});

const run = (core, setup) => {
  const state = core.createBattleState(setup);
  const events = [];
  const result = core.runBattleCore(state, createSeededRng(setup.seed), { onEvent: e => {
    // 2026-10-10：死亡で通常attackが無い時の踏み込み用の対象ヒントは表示専用。
    // 戦闘結果の検査からこの1フィールドだけ除く。他の事象・最終値は引き続き完全一致。
    const event = { ...e };
    if (event.type === 'effect_flash') delete event.targetId;
    // 2026-10-14：キャラ固有VFX21種の演出用に足した因果の項目（発生元・対象のヒント）。戦闘結果ではないので新旧両方から除く。
    ['colorSources', 'reactionSourceId', 'retriggerSourceId', 'retriggerTargetId', 'retriggerKey', 'victimId', 'victimSide'].forEach(k => delete event[k]);
    if (['mana_set', 'blood_set', 'keyword_effect'].includes(event.type)) { delete event.sourceId; delete event.gained; }
    events.push(event);
  }, turnLimit: setup.turnLimit });
  return { events, result, final: core.battleCoreFinalState ? core.battleCoreFinalState(state) : null };
};

const mismatches = [];
cards.forEach((c, i) => {
  const setup = setupFor(c, i);
  const a = run(before, setup);
  const b = run(after, setup);
  try {
    assert.deepEqual(b.events, a.events);
    assert.deepEqual(b.result, a.result);
    assert.deepEqual(b.final, a.final);
  } catch (_) { mismatches.push(c.name); }
});

if (process.argv.includes('--attack-order-1010')) {
  // 2026-10-10：許可する仕様差を「弱体1の移動・それに伴う2点」へ限定する。
  // この複合盤面でも、それ以外の全イベントフィールド・勝敗・最終状態は完全一致。
  const names = ['衝撃波', '魔族の魂', '竜の契約'];
  const setup = {
    seed: 53, turnLimit: 1,
    sides: {
      p1: { units: [{ id: 'order1010', name: 'アラッサス', no: 'C058', atk: 7, hp: 100, maxHp: 100,
        desc: cards.find(c => c.name === 'アラッサス').desc,
        effectData: { effectNames: names, effectTexts: names.map(n => sheet.enchantCards().find(e => e.name === n).desc) } },
        { id: 'support1010', name: '仲間', atk: 1, hp: 100, maxHp: 100 }] },
      p2: { units: [{ id: 'target1010', name: '敵', atk: 2, hp: 200, maxHp: 200 }] },
    }, resources: { p1: { mana: 0 }, p2: { mana: 0 } },
  };
  try {
    const a = run(before, setup), b = run(after, setup);
    const expected = JSON.parse(JSON.stringify(a));
    const at = expected.events.findIndex(e => e.type === 'keyword_effect' && e.effect === 'weaken');
    assert.ok(at >= 0);
    assert.deepEqual(expected.events.filter(e => e.type === 'damage' && e.effect).map(e => e.amount), [4, 12, 9]);
    let extra = 0;
    expected.events.forEach((e, i) => {
      if (e.type !== 'damage' || e.unitId !== 'target1010') return;
      if (i < at && e.effect) { e.amount += 1; extra++; }
      e.hpAfter -= extra;
    });
    const weaken = expected.events.splice(at, 1)[0];
    expected.events.splice(expected.events.findIndex(e => e.type === 'sweep_vfx'), 0, weaken);
    expected.final.p2.units[0].hp -= 2;
    assert.deepEqual(JSON.parse(JSON.stringify(b)), expected);
    console.log('攻撃順序1010仕様差\t弱体1を先行・全体4→5／魂12→13・他は完全一致\tOK');
  } catch (e) { mismatches.push('攻撃順序1010仕様差'); console.error(e.message); }
}

console.log(`コアリファクタ差分検査\t対象=${cards.length}件\t不一致=${mismatches.length}件${mismatches.length ? '（' + mismatches.slice(0, 8).join(',') + '）' : ''}\t${mismatches.length ? 'NG' : 'OK'}`);
process.exitCode = mismatches.length ? 1 : 0;
