'use strict';

const {simulateCard} = require('./sim');

async function runSelfTest(cards) {
  const target = cards[0];
  const seed = 0x5eed1234;
  const direct = await simulateCard(target, {seed, floor:5});
  for (let i = 0; i < Math.min(80, cards.length - 1); i++) {
    await simulateCard(cards[i + 1], {seed: seed + i + 1, floor:5});
  }
  const after = await simulateCard(target, {seed, floor:5});
  const keys = ['won','lost','timeout','decided','turns','dealt','taken','survivalRate','living','started','enemyCount'];
  const equal = keys.every(key => direct[key] === after[key]);
  if (!equal) throw new Error(`状態リーク自己テスト失敗: direct=${JSON.stringify(direct)} after=${JSON.stringify(after)}`);
  return {card: target.name, preceding: Math.min(80, cards.length - 1), equal, direct, after};
}

module.exports = {runSelfTest};
