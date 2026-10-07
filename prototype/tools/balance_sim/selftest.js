'use strict';

const {simulateCard} = require('./sim');

async function runSelfTest(cards) {
  if (!Array.isArray(cards) || !cards.length) throw new Error('状態リーク検査の対象カードがない');
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

// 直接実行でも、全カードの読み込みと状態リーク検査を実際に行う。
if (require.main === module) {
  (async()=>{
    await loadGameData();
    const cards=PANEL_POOL.filter(c=>c&&c.category==='キャラクター'&&!c._rewardExcluded&&Number(c.rarity)>=0);
    const result=await runSelfTest(cards);
    console.log(`OK 状態リーク自己テスト：${result.card}（先行${result.preceding}枚・同一seedの11項目が一致）`);
  })().catch(error=>{console.error(error);process.exitCode=1;});
}
