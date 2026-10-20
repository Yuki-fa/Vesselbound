'use strict';
// 全滅後の能力上昇を演出せず、計算済みの値・資源・復活・反撃は保存する。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
const silent = ev => typeof presentIsSilentEvent === 'function' && presentIsSilentEvent(ev);
let failed = 0;
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
(async () => {
  await h.ready;
  for (const side of ['p1', 'p2']) for (const mode of ['効果ダメージ', 'ATK0逃走', '範囲攻撃', '反撃', '死亡効果']) {
    await check(`${side}：${mode}による全滅の後は常時バフの演出を省く`, async () => {
      const other = side === 'p1' ? 'p2' : 'p1';
      const roar=h.card('E049');
      const x = h.setup({ sides: { [side]: { units: [h.unit('winner', 'C033', { atk: 100,boardCards:[roar],_adjacentPanelEffectTexts:[roar.desc] })] },
        [other]: { units: [h.unit('last', '', { atk: 1, hp: 1, maxHp: 1 })] } } });
      const winner = x.find('winner'), last = x.find('last');
      if (mode === 'ATK0逃走') {
        last.atk = 0; x.emit({ type: 'stat_change', side: other, unitId: last.id, atk: -1, hp: 0, reason: 'evil_eye', sourceId: winner.id });
        coreSweepAtkZeroFlee(x.state, x.emit);
        // 逃走後に残った開戦・マナ処理の実体イベントも同じ入口で省略する。
        coreApplyOpeningEffects(winner, x.state, x.rng, x.emit, x.hit);
      } else if (mode === '範囲攻撃') coreHitAll(x.state, x.rng, x.emit, x.hit, winner, [last], 2);
      else if (mode === '反撃') coreWithDamageKind(x.state, 'combat', () => x.hit(winner, last, 2, true));
      else if (mode === '死亡効果') coreWithDamageKind(x.state, 'death_effect', () => x.hit(winner, last, 2));
      else x.hit(winner, last, 2);
      const final = h.clone(x.state.units);
      await x.pve();
      assert.equal(h.calls.filter(c => ['S009', 'S005', 'mana-buff'].includes(c.name)).length, 0, '全滅後のバフVFXが残る');
      assert.equal(x.find('winner').atk, final[side][0].atk);
      assert.equal(x.find('winner').hp, final[side][0].hp);
      await x.online();
      assert.equal(h.calls.filter(c => ['S009', 'S005', 'mana-buff'].includes(c.name)).length, 0, 'オンラインの全滅後バフ');
      const shown = [...G.allies, ...G.enemies].find(u => u?.id === 'winner');
      assert.equal(shown.hp, final[side][0].hp, '省略しても最終HPを反映する');
    });
  }
  await check('活性化の途中で全滅した後の残りの閾値は、数値を保って合図を省く',async()=>{
    const a=h.card('E045');
    const x=h.setup({sides:{p1:{units:[h.unit('wyvern','C058',{boardCards:[a],_adjacentPanelEffectTexts:[a.desc],
      manaCost:1,manaRepeat:true,manaThresholdNo:'E045',manaThresholdDesc:a.desc.replace(/^1マナ毎：/,'')})]},
      p2:{units:[h.unit('last','',{hp:1,maxHp:1})]}},resources:{p1:{mana:3,gold:19}}});
    coreApplyManaThresholdEffects(x.state,x.rng,x.emit,x.hit);
    assert.equal(x.events.filter(e=>e.type==='mana_threshold').length,3,'コアの計算は途中で止めない');
    const final=h.clone(x.state.resources),atk=x.find('wyvern').atk;
    await x.pve();
    assert.equal(h.cues.length,1,'残り2回の合図を省く');
    assert.equal(x.find('wyvern').atk,atk);
    assert.deepEqual(x.state.resources,final);
    await x.online();
    assert.equal([...G.allies].find(u=>u?.id==='wyvern').atk,atk,'オンラインも省いた能力変化を反映する');
  });
  for(const protection of ['復活','根性'])await check(`${protection}で戻る全滅は戦闘終了扱いにしない`,async()=>{
    const roar=h.card('E049');
    const x=h.setup({sides:{p1:{units:[h.unit('winner','C033',{boardCards:[roar],_adjacentPanelEffectTexts:[roar.desc]})]},p2:{units:[h.unit('last','',{hp:1,maxHp:10,keywords:[protection]})]}}});
    x.hit(x.find('winner'),x.find('last'),2);
    coreApplyOpeningEffects(x.find('winner'),x.state,x.rng,x.emit,x.hit);
    const buff=x.events.find(e=>e.type==='stat_change'&&e.sourceId==='winner');
    assert.ok(buff&&x.events.some(e=>e.type==='revive'));
    await x.pve();
    assert.equal(silent(buff),false,'後続の復帰を確認してから省略を決める');
    assert.ok(h.calls.some(c=>c.name==='S009'),'復帰する戦闘では常時バフも見せる');
    await x.online();
    assert.ok(h.calls.some(c=>c.name==='S009'));
  });
  await check('全滅を起こした接触の反撃と死亡効果ダメージを省略しない',async()=>{
    const fire=h.card('E006');
    const x=h.setup({sides:{p1:{units:[h.unit('attacker','',{atk:2,hp:4,maxHp:4})]},
      p2:{units:[h.unit('last','',{atk:2,hp:1,maxHp:1,boardCards:[fire],_adjacentPanelAbilities:[fire.name],_adjacentPanelEffectTexts:[fire.desc]})]}}});
    const runner=createBattleRunner(x.state,x.rng,x.emit,{skipOpening:true});
    runner.step({deferCompact:true});
    const before=h.clone(runner.result);
    const damage=x.events.filter(e=>e.type==='damage');
    assert.ok(damage.some(e=>e.counter)&&damage.some(e=>e.damageKind==='death_effect'),'反撃と死亡効果を含む再現条件');
    await x.pve();
    assert.ok(damage.every(e=>!silent(e)));
    assert.deepEqual(runner.result,before,'再生によって戦闘結果を変えない');
    await x.online();
    assert.ok(h.calls.some(c=>c.name==='dark-fire'),'最後の体の死亡効果も残す');
  });
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
