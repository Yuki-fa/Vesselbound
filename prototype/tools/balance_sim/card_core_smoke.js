'use strict';

// 通常モードのカード／強化カードを共通コアの各トリガ入口へ投入するスモーク検証。
// 数値結果の仕様テストは offline_online_regression.js が担当し、ここでは全データが
// 開戦・攻撃・負傷・死亡・マナ閾値・終戦の流れで例外なく処理できることを確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../../js/battle/core');
const sheetData = require('./sheet_data');
const {createSeededRng} = require('../../js/online/protocol');

// 列は必ずヘッダ名で引く（sheet_data.js）。位置で引くとシートへ列を1本足しただけで
// 別の列を効果文として読み、スモークが静かに無意味になる。
const cards = sheetData.characterCards();
const enchantments = sheetData.enchantCards();
const summonDefs = cards.map(c => ({
  name: c.name, power: c.power || 1, life: c.life || 3,
  color: c.color, keywords: c.keywords, desc: c.desc,
}));
const failures = [];

for (const [kind, rows] of [['card', cards], ['enchant', enchantments]]) {
  for (const row of rows) {
    const isCard = kind === 'card';
    const desc = isCard ? row.desc || '' : '';
    const mana = desc.match(/^(\d+)マナ(毎)?[:：]\s*(.+)$/);
    const unit = {
      id: 'smoke-unit', name: isCard ? row.name : 'スモーク対象',
      atk: isCard ? row.power || 1 : 2, hp: isCard ? row.life || 3 : 3,
      maxHp: isCard ? row.life || 3 : 3, color: isCard ? row.color || '赤' : '赤',
      desc,
      keywords: isCard ? row.keywords.slice() : [],
      effectData: isCard ? {} : {effectNames: [row.name], effectTexts: [row.desc || '']},
      // これまでのスモークはマナ閾値フィールドを作っていなかったため、
      // 「全カードを通った」だけでマナ効果の実行経路を検査できていなかった。
      manaCost: mana ? Number(mana[1]) : 0,
      manaRepeat: !!(mana && mana[2]),
      manaThresholdDesc: mana ? mana[3] : '',
    };
    try {
      const state = core.createBattleState({
        resources: {p1: {mana: 20, gold: 200}, p2: {mana: 20, gold: 0}},
        sides: {p1: {units: [unit]}, p2: {units: [{id: 'enemy', name: '敵', atk: 3, hp: 30, maxHp: 30, color: '青'}]}},
        summonDefs, itemDefs: [],
      });
      core.runBattleCore(state, createSeededRng(123), {turnLimit: 8});
    } catch (error) {
      failures.push(`${kind}:${row.name} => ${error.stack}`);
    }
  }
}

assert.equal(failures.length, 0, failures.slice(0, 3).join('\n'));
console.log(`card core smoke ok: ${cards.length + enchantments.length} entries`);
