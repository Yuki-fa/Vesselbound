'use strict';
// 活性化の中で本人へ戻る誘発も、元のマナ効果ではなく常時効果として見せる。
const assert = require('node:assert/strict');
const h = require('./presentation_1020b_harness');
let failed = 0;
async function check(name, run) {
  try { await run(); console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
(async () => {
  await h.ready;
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    await check(`${side}：活性化→ワイバーン${enhanced ? '（強化）' : ''}の固有VFX・SE`, async () => {
      const activation = h.card('E045');
      const row = h.sheetRows('card').find(r => r['No.'] === 'C058');
      const w = h.unit('wyvern', 'C058', { desc: enhanced ? row['強化効果'] : row['効果'],
        manaCost: 1, manaRepeat: true, manaThresholdNo: 'E045',
        manaThresholdDesc: activation.desc.replace(/^\d+マナ毎：/, ''),
        boardCards: [activation], _adjacentPanelAbilities: [activation.name], _adjacentPanelEffectTexts: [activation.desc] });
      const x = h.setup({ sides: { [side]: { units: [w] }, [side === 'p1' ? 'p2' : 'p1']: {
        units: [h.unit('foe0'), h.unit('foe1'), h.unit('foe2')] } }, resources: { [side]: { mana: 2 } } });
      const before = h.clone(x.state.resources);
      coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit);
      const hits = x.events.filter(e => e.type === 'damage' && e.sourceId === 'wyvern');
      // 1020c：別の効果を接続しても、強化本文の「もう一度」を独立して読む。
      const repeats = require('./sheet_data').effectRepetitions(enhanced ? row['強化効果'] : row['効果']);
      assert.equal(hits.length, 4 * repeats, 'ATK獲得2回×敵2体×本文の反復回数');
      const activations = new Set(hits.map(e => e.batch)).size;
      assert.ok(hits.every(e => e.effectNo !== 'E045'), '誘発ダメージが活性化の番号を継承している');
      assert.deepEqual(x.state.resources, before, '演出修正で資源を変えない');
      await x.pve();
      const pve = h.calls.filter(c => c.name === 'wyvern');
      assert.equal(pve.length, activations, '同時対象は1つのVFX、発動回数は間引かない');
      assert.equal(h.sounds.filter(s => s.code === 'C058').length, pve.length, '固有SEも発動回数ぶん');
      await x.online();
      assert.equal(h.calls.filter(c => c.name === 'wyvern').length, pve.length, 'オンラインも同じ発動単位');
      assert.equal(h.sounds.filter(s => s.code === 'C058').length, pve.length, 'オンラインの固有SE');
    });
  }
  for(const mode of ['攻撃バフ（共振）','開戦（咆哮）','色バフ（リザードマン）','解放（封印されしもの）','負傷バフ（ギガンテス）'])
    for(const side of ['p1','p2'])await check(`${side}：${mode}からのATK獲得も固有VFX・SEへつなぐ`,async()=>{
      const extra=mode.startsWith('攻撃')?h.card('E054'):mode.startsWith('開戦')?h.card('E049'):mode.startsWith('解放')?h.card('E057'):null;
      const w=h.unit('wyvern','C058',extra?{boardCards:[extra],_adjacentPanelAbilities:[extra.name],_adjacentPanelEffectTexts:[extra.desc]}:{});
      const support=mode.startsWith('色')?h.unit('support','C050'):mode.startsWith('負傷')?h.unit('support','C012'):null;
      const x=h.setup({sides:{[side]:{units:[w,...support?[support]:[]]},[side==='p1'?'p2':'p1']:{units:[h.unit('foe0'),h.unit('foe1')]}},
        resources:{[side]:{mana:2}}});
      if(mode.startsWith('攻撃'))coreApplyAttackEffects(x.find('wyvern'),x.state,x.rng,x.emit,x.hit);
      else if(mode.startsWith('開戦'))coreApplyOpeningEffects(x.find('wyvern'),x.state,x.rng,x.emit,x.hit);
      else if(mode.startsWith('解放'))coreApplyReleaseEffects(x.find('wyvern'),[],x.state,x.rng,x.emit,x.hit);
      else if(mode.startsWith('負傷'))coreApplyInjuryEffects(x.find('support'),2,x.state,x.rng,x.emit,x.hit,x.find('foe0'));
      else coreApplyManaThresholdEffects(x.state,x.rng,x.emit,x.hit);
      const batches=new Set(x.events.filter(e=>e.type==='damage'&&e.sourceId==='wyvern').map(e=>e.batch));
      assert.ok(batches.size>0,'実際のATK獲得誘発を再現する');
      await x.pve();
      assert.equal(h.calls.filter(c=>c.name==='wyvern').length,batches.size);
      assert.equal(h.sounds.filter(c=>c.code==='C058').length,batches.size);
      await x.online();
      assert.equal(h.calls.filter(c=>c.name==='wyvern').length,batches.size);
      assert.equal(h.sounds.filter(c=>c.code==='C058').length,batches.size);
    });
  await check('シートの同種誘発を全件列挙する', () => {
    const same = ['card', 'enchant', 'enemy'].flatMap(key => h.sheetRows(key))
      .filter(r => /(?:ATK|HP|能力).*(?:得るたび|増えた時|増加した時)/.test(r['効果'] || ''));
    assert.deepEqual(same.map(r => r['No.']), ['C058']);
  });
  await check('作業前コアと214ケースの戦闘結果・数値イベント・最終状態・乱数進行が一致する',()=>{
    const vm=require('node:vm'),cp=require('node:child_process');
    const context={module:{exports:{}}};vm.createContext(context);
    vm.runInContext(cp.execFileSync('git',['show','c5880af:prototype/js/battle/core.js'],{encoding:'utf8',maxBuffer:2e6}),context);
    const baseline=context.module.exports;
    const defs=h.sheetRows('card').map(r=>{
      const m=String(r['効果']).match(/^(\d+)マナ(毎)?：/);
      return {id:r['No.'],no:r['No.'],name:r['名前'],desc:r['効果'],atk:Number(r['パワー'])||2,hp:50,maxHp:50,
        color:r['カラー'],keywords:String(r['キーワード']||'').split(/\s+/).filter(Boolean),manaCost:m?Number(m[1]):0,manaRepeat:!!m?.[2]};
    });
    let count=0;
    const clean=value=>JSON.parse(JSON.stringify(value,(key,v)=>key==='_coreOpeningEffectsState'?'<state>':v));
    for(const def of defs)for(const side of ['p1','p2']){
      const u=h.clone(def);
      if(def.no==='C058')Object.assign(u,{manaCost:1,manaRepeat:true,manaThresholdNo:'E045',manaThresholdDesc:h.card('E045').desc.replace(/^1マナ毎：/,'')});
      const options={sides:{[side]:{units:[u]},[side==='p1'?'p2':'p1']:{units:[h.unit('foe0'),h.unit('foe1')]}},
        resources:{[side]:{mana:6,gold:20}},summonDefs:defs};
      const results=[baseline,global].map(api=>{
        const state=api.createBattleState(h.clone(options)),rng=createSeededRng(1020),events=[];
        const result=api.runBattleCore(state,rng,{turnLimit:4,onEvent:e=>{
          // 今回直す演出番号1項目だけを正規化する。他のダメージ・番号は全て比較する。
          events.push(e.type==='damage'&&e.sourceId==='C058'&&e.effectNo==='E045'?{...e,effectNo:null}:e);
        }});
        // _copyFrame はコピーの枠を決める見た目だけの印（2026-10-20 に後から追加）。比較から外す。
        return clean(JSON.parse(JSON.stringify({result,events,final:api.battleCoreFinalState(state),rngNext:rng.next()},(k,v)=>k==='_copyFrame'?undefined:v)));
      });
      assert.deepEqual(results[1],results[0],`${def.no}/${side}`);count++;
    }
    assert.equal(count,defs.length*2);
  });
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
