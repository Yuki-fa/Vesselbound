'use strict';
// 1027：決着後の間引き・加速を廃止。停止はコアが行い、確定した列は両再生で全部見せる。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
let failed = 0, passed = 0;
async function check(name, run) {
  try { await run(); passed++; console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
(async () => {
  await h.ready;
  for (const side of ['p1', 'p2']) for (const mode of ['効果ダメージ', 'ATK0逃走', '範囲攻撃', '反撃', '死亡効果']) {
    await check(`${side}：${mode}の決着後は次の開戦・常時バフを計算も再生もしない`, async () => {
      const other = side === 'p1' ? 'p2' : 'p1', roar = h.card('E049');
      const x = h.setup({ sides: { [side]: { units: [h.unit('winner', '', { atk: 100, boardCards: [roar], _adjacentPanelEffectTexts: [roar.desc] })] },
        [other]: { units: [h.unit('last', '', { atk: 1, hp: 1, maxHp: 1 })] } } });
      const winner = x.find('winner'), last = x.find('last'), atk = winner.atk;
      const runner = createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true });
      if (mode === 'ATK0逃走') { last.atk = 0; coreSweepAtkZeroFlee(x.state, x.emit); }
      else if (mode === '範囲攻撃') coreHitAll(x.state, x.rng, x.emit, x.hit, winner, [last], 2);
      else if (mode === '反撃') coreWithDamageKind(x.state, 'combat', () => x.hit(winner, last, 2, true));
      else if (mode === '死亡効果') coreWithDamageKind(x.state, 'death_effect', () => x.hit(winner, last, 2));
      else x.hit(winner, last, 2);
      coreApplyOpeningEffects(winner, x.state, x.rng, x.emit, x.hit);
      assert.equal(winner.atk, atk);
      assert.equal(x.events.some(e => e.type === 'stat_change'), false);
      const final = h.clone(x.state.units);
      await x.pve(); assert.equal(x.find('winner').hp, final[side][0].hp);
      const calls = h.calls.map(c => c.name);
      await x.online(); assert.deepEqual(h.calls.map(c => c.name), calls);
      assert.equal([...G.allies, ...G.enemies].find(u => u?.id === 'winner').hp, final[side][0].hp);
      assert.ok(runner); // 実戦と同じ開始境界を使用する。
    });
  }
  await check('保存済みの旧イベント列も表示だけを間引かず、決着後の専用倍率を持たない', async () => {
    const x = h.setup({ sides: { p1: { units: [h.unit('ally')] }, p2: { units: [h.unit('last', '', { hp: 1, maxHp: 1 })] } } });
    x.events.push({ type: 'death', side: 'p2', unitId: 'last' },
      { type: 'stat_change', side: 'p1', unitId: 'ally', sourceId: 'ally', atk: 1, hp: 1, reason: 'ally_death_buff' });
    await x.pve(); await x.online();
    assert.equal(x.events.filter(e => e.type === 'stat_change').length, 1);
    assert.equal(typeof global.presentSkipsEvent, 'undefined');
    assert.equal(typeof global.presentDecidedSpeedScale, 'undefined');
  });
  console.log(`決着後1027：${passed}件OK / ${failed}件NG`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
