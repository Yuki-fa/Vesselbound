'use strict';
// コアのリファクタ前後で、イベント列・勝敗・最終状態が完全に一致するかを確かめる。
// 段階2（PvEを共通の戦闘ループへ）の各スライスは、必ずこれを通してから次へ進むこと。
//
//   1. 変更前の core.js をコピーしておく:  cp js/battle/core.js /tmp/core_prev.js
//   2. 変更後に実行:                        node tools/parity/core_refactor_diff.js /tmp/core_prev.js
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
  const result = core.runBattleCore(state, createSeededRng(setup.seed), { onEvent: e => events.push(e), turnLimit: setup.turnLimit });
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

console.log(`コアリファクタ差分検査\t対象=${cards.length}件\t不一致=${mismatches.length}件${mismatches.length ? '（' + mismatches.slice(0, 8).join(',') + '）' : ''}\t${mismatches.length ? 'NG' : 'OK'}`);
process.exitCode = mismatches.length ? 1 : 0;
