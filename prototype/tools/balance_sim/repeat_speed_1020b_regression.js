'use strict';
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
let failed = 0;
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
(async () => {
  await h.ready;
  await check('活性化のATK獲得誘発を挟んでもrepeatが途切れない', async () => {
    const a = h.card('E045');
    const x = h.setup({ sides: { p1: { units: [h.unit('wyvern', 'C073', {
      boardCards: [a], _adjacentPanelEffectTexts: [a.desc], manaCost: 1, manaRepeat: true,
      manaThresholdNo: 'E045', manaThresholdDesc: a.desc.replace(/^\d+マナ毎：/, '') })] },
    p2: { units: [h.unit('foe')] } }, resources: { p1: { mana: 3 } } });
    coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit);
    await x.pve();
    assert.deepEqual(h.cues.map(c => c.repeat), [false, true, true]);
  });
  for (const extra of ['激怒の指輪', 'ヘカトンケイル']) await check(`${extra}：負傷バフを間引かず2回目から既存repeatの尺にする`, async () => {
    const e = h.card('E001');
    const x = h.setup({ sides: { p1: { units: [h.enchantUnit('golem','E001'),...(extra==='ヘカトンケイル'?[h.unit('support','C025')]:[])] }, p2: { units: [h.unit('foe')] } },
      rings: extra === '激怒の指輪' ? { p1: [h.card('R008', 'ring')] } : {} });
    x.hit(x.find('foe'), x.find('golem'), 1);
    const expected = x.events.filter(ev => ev.type === 'stat_change' && ev.reason === 'injury_self_buff').length;
    assert.ok(expected >= 2);
    await x.pve();
    const buffs = h.calls.filter(c => c.name === 'S006');
    assert.equal(buffs.length, expected, '重複抑止で発動回数を落とさない');
    assert.ok(buffs[0].options.hitDuration > PRESENT_MANA_RUN_GAP_MS);
    assert.ok(buffs.slice(1).every(c => c.options.hitDuration === PRESENT_MANA_RUN_GAP_MS), '2回目以降は既存の繰り返し間隔');
    await x.online();
    assert.deepEqual(h.calls.filter(c => c.name === 'S006').map(c => c.options.hitDuration), buffs.map(c => c.options.hitDuration));
  });
  for(const [keyword,count]of [['二段攻撃',2],['三段攻撃',3]])await check(`${keyword}の攻撃効果を全回高速反復する`,async()=>{
    const x=h.setup({sides:{p1:{units:[h.enchantUnit('sylph','E031',{keywords:[keyword]})]},p2:{units:[h.unit('foe','',{atk:1})]}}});
    createBattleRunner(x.state,x.rng,x.emit,{skipOpening:true}).step({deferCompact:true});
    await x.pve();
    const fx=h.calls.filter(c=>c.name==='sylph');
    assert.equal(fx.length,count);
    assert.equal(fx[0].options.durationMs,undefined);
    assert.ok(fx.slice(1).every(c=>c.options.durationMs===PRESENT_MANA_RUN_GAP_MS));
    await x.online();
    assert.deepEqual(h.calls.filter(c=>c.name==='sylph').map(c=>c.options.durationMs),fx.map(c=>c.options.durationMs));
  });
  await check('懺悔2枚の4回の自傷誘発を、間引かず高速反復する',async()=>{
    const penance=h.card('E037');
    const x=h.setup({sides:{p1:{units:[h.enchantUnit('golem','E001',{boardCards:[h.card('E001'),penance,penance],
      _adjacentPanelAbilities:['逆襲',penance.name,penance.name],_adjacentPanelEffectTexts:[h.card('E001').desc,penance.desc,penance.desc]})]},p2:{units:[h.unit('foe','',{atk:1})]}}});
    createBattleRunner(x.state,x.rng,x.emit,{skipOpening:true}).step({deferCompact:true});
    const n=x.events.filter(e=>e.type==='stat_change'&&e.reason==='injury_self_buff').length;
    assert.ok(n>=4);
    await x.pve();
    const fx=h.calls.filter(c=>c.name==='S006');
    assert.equal(fx.length,n);
    assert.ok(fx.slice(1).every(c=>c.options.hitDuration===PRESENT_MANA_RUN_GAP_MS));
    await x.online();
    assert.deepEqual(h.calls.filter(c=>c.name==='S006').map(c=>c.options.hitDuration),fx.map(c=>c.options.hitDuration));
  });
  for(const [no,trigger,name]of [['C071','mana','scylla'],['C107','release','fiend']])await check(`${no}：${trigger==='mana'?'マナ閾値':'解放'}の固有VFXにもrepeatを渡す`,async()=>{
    const x=h.setup({sides:{p1:{units:[h.unit('source',no,{keywords:[],boardCards:[h.card('E005'),h.card('E005'),h.card('E005')]})]},
      p2:{units:[h.unit('foe')]}},resources:{p1:{mana:6}}});
    if(trigger==='mana')coreApplyManaThresholdEffects(x.state,x.rng,x.emit,x.hit);
    else coreApplyReleaseEffects(x.find('source'),[],x.state,x.rng,x.emit,x.hit);
    await x.pve();
    const fx=h.calls.filter(c=>c.name===name);
    assert.equal(fx.length,3);
    assert.equal(fx[0].options.durationMs,undefined);
    assert.ok(fx.slice(1).every(c=>c.options.durationMs===PRESENT_MANA_RUN_GAP_MS));
    await x.online();
    assert.deepEqual(h.calls.filter(c=>c.name===name).map(c=>c.options.durationMs),fx.map(c=>c.options.durationMs));
  });
  for(const no of ['E058','E042'])await check(`${no}：マナ閾値・三段攻撃の飛び道具も高速反復する`,async()=>{
    const fire=h.card('E058');
    const u=no==='E058'?h.unit('source','',{boardCards:[fire],_adjacentPanelEffectTexts:[fire.desc],
      manaCost:1,manaRepeat:true,manaThresholdNo:'E058',manaThresholdDesc:fire.desc.replace(/^\d+マナ毎：/,'')})
      :h.enchantUnit('source','E042',{keywords:['三段攻撃']});
    const x=h.setup({sides:{p1:{units:[u]},p2:{units:[h.unit('foe')]}},resources:{p1:{mana:3}}});
    if(no==='E058')coreApplyManaThresholdEffects(x.state,x.rng,x.emit,x.hit);
    else createBattleRunner(x.state,x.rng,x.emit,{skipOpening:true}).step({deferCompact:true});
    await x.pve();
    const fx=h.calls.filter(c=>c.name==='projectile:'+no);
    assert.equal(fx.length,3);
    assert.equal(fx[0].options.flightMs,undefined);
    assert.ok(fx.slice(1).every(c=>c.options.flightMs===PRESENT_MANA_RUN_GAP_MS));
    await x.online();
    assert.deepEqual(h.calls.filter(c=>c.name==='projectile:'+no).map(c=>c.options.flightMs),fx.map(c=>c.options.flightMs));
  });
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
