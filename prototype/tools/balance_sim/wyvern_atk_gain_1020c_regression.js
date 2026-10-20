'use strict';

// ATK獲得の入口を実コアで発火し、既存の両再生口までNodeで通す。シートは読み取り専用。
const assert = require('node:assert/strict');
const vm = require('node:vm');
const cp = require('node:child_process');
const h = require('./presentation_1020b_harness');
const BASE_REF = '3f67e0bdb9f9561fc04ce41d6e6b863c8ad9dc7b';
let failed = 0, checked = 0;
async function check(name, run) {
  try { await run(); checked++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + error.stack); }
}
const other = side => side === 'p1' ? 'p2' : 'p1';
const effects = (no, kind = 'card') => {
  const c = h.card(no, kind);
  return { _adjacentPanelAbilities: [c.name], _adjacentPanelEffectTexts: [c.desc], boardCards: [c] };
};
function setup(side, extra = {}, options = {}, support = []) {
  return h.setup({ sides: { [side]: { units: [h.unit('wyvern', 'C058', { color: '赤', ...extra }), ...support] },
    [other(side)]: { units: [h.unit('foe0'), h.unit('foe1'), h.unit('foe2')] } }, ...options });
}
const items = (side, key) => ({ items: { [side]: [{ id: key, itemEffectKey: key }] } });
const rings = (side, ...nos) => ({ rings: { [side]: nos.map(no => h.card(no, 'ring')) } });
const scenarios = [
  ...['赤', '青', '緑', '黄', '紫'].map((color, index) => ({ name: color + 'の瞳',
    extra: { color }, options: side => rings(side, 'R00' + (index + 1)),
    run: x => coreApplyOpeningRings(x.state, x.rng, x.emit, x.hit), reasons: ['color_ring'] })),
  { name: '虹の瞳＋鏡', only: 'p1', options: side => rings(side, 'R026', 'R032'), gainAmount: 6,
    run: x => coreApplyOpeningRings(x.state, x.rng, x.emit, x.hit), reasons: ['rainbow_ring'] },
  { name: '神速', only: 'p1', options: side => rings(side, 'R031'),
    run: x => coreApplyOpeningRings(x.state, x.rng, x.emit, x.hit), reasons: ['speed_ring'] },
  { name: '敵からの呪いの指輪', options: side => rings(other(side), 'R042'),
    run: x => coreApplyOpeningRings(x.state, x.rng, x.emit, x.hit), reasons: ['opening_ring_enemy_buff'] },
  ...['bond_scroll', 'giant_scroll'].map(key => ({ name: key, options: side => items(side, key),
    run: x => coreApplyOpeningItems(x.state, x.rng, x.emit, x.hit), reasons: [key] })),
  { name: '魔導板の共鳴', extra: { _mapPanelPower: 'resonance' },
    run: x => coreApplyMapPanelOpeningEffects(x.state, x.emit, x.rng, x.hit), reasons: ['resonance_panel'] },
  { name: '咆哮エンチャント', extra: () => effects('E049', 'enchant'),
    run: x => coreApplyOpeningEffects(x.find('wyvern'), x.state, x.rng, x.emit, x.hit), reasons: ['roar'] },
  { name: '全色条件で倍化', extra: () => effects('C080'),
    support: () => ['青', '緑', '黄', '紫'].map((color, i) => h.unit('color' + i, null, { color })),
    run: x => coreApplyOpeningEffects(x.find('wyvern'), x.state, x.rng, x.emit, x.hit), reasons: ['opening_all_color_double'] },
  { name: 'マナ獲得による常時補正', extra: () => effects('EN061', 'enemy'),
    options: side => ({ resources: { [other(side)]: { mana: 2 } } }),
    run: x => coreGainResource(x.state, x.find('wyvern').side, 'mana', 1, null, x.emit, '検査', null, x.rng, x.hit),
    reasons: ['enemy_mana_passive'] },
  { name: '旧スコル・ハティのマナ補正', extra: () => ({ _adjacentPanelAbilities: ['蝕の翼"スコル・ハティ"'] }),
    run: x => coreGainResource(x.state, x.find('wyvern').side, 'mana', 1, null, x.emit, '検査', null, x.rng, x.hit),
    reasons: ['skoll_hati'] },
  { name: '被ダメージの常時観測と再入防止', activations: 1, vfxPerActivation: 2,
    extra: { effectData: { effectTexts: ['常時：キャラクターがダメージを受けるたび、このキャラクターは+1/+1を得る。'] } },
    run: x => x.hit(null, x.find('foe0'), 1), reasons: ['shana_damage'] },
  { name: 'マップ進行の味方補正', support: () => [h.unit('support', null, {
    desc: '常時：全ての味方は+X/+Xを得る。Xは現在のマップの2倍に等しい。', _terrainMapNo: 2 })],
    run: x => coreApplyOpeningEffects(x.find('support'), x.state, x.rng, x.emit, x.hit), reasons: ['map_passive_team_buff'] },
  { name: '活性化', extra: () => ({ manaCost: 1, manaRepeat: true, manaThresholdNo: 'E045',
    manaThresholdDesc: h.card('E045').desc.replace(/^1マナ毎：/, '') }),
    options: side => ({ resources: { [side]: { mana: 2 } } }),
    run: x => coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit), reasons: ['mana_threshold'] },
  { name: 'マナ効果の色補正', extra: { color: '緑' }, support: () => [h.unit('support', 'C050')],
    options: side => ({ resources: { [side]: { mana: 2 } } }),
    run: x => coreApplyManaThresholdEffects(x.state, x.rng, x.emit, x.hit), reasons: ['mana_threshold_color_all'] },
  { name: 'キーワード種類数が増える策士', extra: () => effects('E063', 'enchant'),
    run: x => coreGrantOpeningKeyword(x.find('wyvern'), '貫通', x.find('wyvern'), x.emit, x.state, x.rng, x.hit),
    reasons: ['opening_keyword_count_buff'] },
  { name: 'ATK奪取で得る値', extra: () => effects('C081'),
    run: x => coreApplyAttackEffects(x.find('wyvern'), x.state, x.rng, x.emit, x.hit), reasons: ['imp_gain'] },
  { name: '攻撃エンチャント共振', extra: () => effects('E054', 'enchant'),
    run: x => coreApplyAttackEffects(x.find('wyvern'), x.state, x.rng, x.emit, x.hit), reasons: ['resonance'] },
  { name: '味方攻撃の常時観測', extra: () => effects('C072'),
    run: x => coreApplyAttackObservers(x.find('wyvern'), x.state, x.rng, x.emit, x.hit), reasons: ['attack_observer_self_buff'] },
  { name: '味方攻撃の全体観測', support: () => [h.unit('support', null, h.card('EN032', 'enemy'))],
    run: x => coreApplyAttackObservers(x.find('support'), x.state, x.rng, x.emit, x.hit), reasons: ['attack_observer_team_buff'] },
  { name: 'ATKとHPの交換による増加',
    run: x => { x.find('foe0').desc = '攻撃：このキャラクターのHPと対象のATKを入れ替える。';
      coreApplyAttackEffects(x.find('foe0'), x.state, x.rng, x.emit, x.hit); }, reasons: ['attack_swap'] },
  { name: '負傷バフ', support: () => [h.unit('support', 'C012')],
    run: x => coreApplyInjuryEffects(x.find('support'), 1, x.state, x.rng, x.emit, x.hit), reasons: ['gigantes'] },
  { name: '解放バフ', extra: () => effects('E057', 'enchant'),
    run: x => coreApplyReleaseEffects(x.find('wyvern'), [], x.state, x.rng, x.emit, x.hit), reasons: ['release_bonus'] },
  { name: '解放の血観測', extra: () => effects('C100'),
    run: x => { x.state.blood[x.find('wyvern').side] = 2;
      coreApplyReleaseEffects(x.find('wyvern'), [], x.state, x.rng, x.emit, x.hit); }, reasons: ['fanatic_blood'] },
  { name: 'アークデーモンの解放補正', extra: { color: '紫' },
    support: () => [h.unit('support', 'C082', { boardCards: [h.card('E057')] })],
    run: x => coreApplyReleaseEffects(x.find('support'), [], x.state, x.rng, x.emit, x.hit), reasons: ['arch_demon_purple_buff'] },
  { name: '死亡エンチャントからの獲得', support: () => [h.unit('support', null, effects('E009', 'enchant'))],
    run: x => { x.find('support').hp = 0;
      coreApplyDeathEffects(x.find('support'), x.state, x.rng, x.emit, x.hit); }, reasons: ['death_all_atk'] },
  { name: '死亡の常時観測', extra: { effectData: { effectTexts: ['常時：味方が死亡するたび、このキャラクターは+1/+1を得る。'] } },
    support: () => [h.unit('support')],
    run: x => { x.find('support').hp = 0;
      coreApplyDeathObservers(x.find('support'), x.state, x.rng, x.emit, x.hit); }, reasons: ['ally_death_self_buff'] },
  { name: 'ウォーグの召喚バッチ末尾', support: () => [h.unit('support', 'C052'),
    ...Array.from({ length: 6 }, (_, i) => h.unit('ally' + i, null, { lane: 'rear' }))],
    run: x => { coreBeginSummonBatch(x.state);
      coreApplyWargThreshold(x.state, x.find('wyvern').side, x.emit, x.rng, x.hit);
      assert.equal(x.events.length, 0, 'バッチ中は誘発を保留する');
      coreEndSummonBatch(x.state, x.emit, x.rng, x.hit); }, reasons: ['warg_count_buff'] },
  { name: '結界喪失の指輪', only: 'p1', options: side => rings(side, 'R035'),
    run: x => coreApplyShieldLostEffects(x.find('wyvern'), x.state, x.rng, x.emit, x.hit), reasons: ['seal_breaker_ring'] },
  { name: '既存眷属への強化', extra: { keywords: ['眷属'] }, support: () => [h.unit('support', 'C034')],
    run: x => coreApplyInjuryEffects(x.find('support'), 1, x.state, x.rng, x.emit, x.hit), reasons: ['summon_buff'] },
  { name: '復活後の瞳と眷属補正', extra: { keywords: ['復活', '眷属'] },
    options: side => rings(side, 'R001', 'R034'),
    run: x => { x.find('wyvern').hp = 0; coreTryRevive(x.find('wyvern'), x.state, x.emit, x.rng, x.hit); },
    reasons: ['color_ring_summon', 'summoner_ring'] },
  { name: '復活後の常時自己補正', extra: { keywords: ['復活'],
    effectData: { effectTexts: ['常時：このキャラクターは+2/+3を得る。'] } },
    run: x => { x.find('wyvern').hp = 0; coreTryRevive(x.find('wyvern'), x.state, x.emit, x.rng, x.hit); },
    reasons: ['revive_passive'] },
  { name: '新規召喚の瞳・巻物・眷属補正', target: 'summon', extra: { name: '召喚元', desc: '', no: '' },
    options: side => ({ ...rings(side, 'R001', 'R034'), ...items(side, 'bond_scroll') }),
    run: (x, enhanced) => { const w = h.unit('new-wyvern', 'C058');
      w.color = '赤';
      if (enhanced) w.desc = h.sheetRows('card').find(r => r['No.'] === 'C058')['強化効果'];
      coreSummonUnit(x.state, x.find('wyvern').side, w, x.emit, 'wyvern', null, x.rng, x.hit); },
    reasons: ['color_ring_summon', 'bond_scroll_summon', 'summoner_ring'] },
  { name: '開戦中の新規召喚補正', target: 'summon', extra: { name: '召喚元', desc: '', no: '' },
    options: side => ({ ...rings(side, 'R001', 'R032'), ...items(side, 'bond_scroll') }),
    run: (x, enhanced) => { x.state._openingPhase = x.state._openingRingsApplied = x.state._openingItemsApplied = true;
      const w = h.unit('new-wyvern', 'C058', { color: '赤' });
      if (enhanced) w.desc = h.sheetRows('card').find(r => r['No.'] === 'C058')['強化効果'];
      coreSummonUnit(x.state, x.find('wyvern').side, w, x.emit, 'wyvern', null, x.rng, x.hit); },
    reasons: ['color_ring', 'bond_scroll_summon'] },
  { name: '召喚累計の補正と進軍の歌', target: 'summon', extra: { name: '召喚元', no: '',
    desc: '常時：このキャラクターが召喚したキャラクターは+1/+1を得る。' },
    support: () => [h.unit('support', null, { desc: '常時：味方の眷属は+1/+1を得る。この戦闘で召喚された味方の眷属の数だけ繰り返す。' })],
    run: (x, enhanced) => { const w = h.unit('new-wyvern', 'C058');
      if (enhanced) w.desc = h.sheetRows('card').find(r => r['No.'] === 'C058')['強化効果'];
      coreSummonUnit(x.state, x.find('wyvern').side, w, x.emit, 'wyvern', null, x.rng, x.hit); },
    reasons: ['summon_scaling_buff', 'march_song'] },
];

function clean(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => key === '_coreOpeningEffectsState' ? '<state>' : item));
}
function battle(api, options, stepped = false) {
  const state = api.createBattleState(h.clone(options)), rng = createSeededRng(1020), events = [];
  let result;
  if (stepped) {
    const runner = api.createBattleRunner(state, rng, ev => events.push(ev), { turnLimit: 6 });
    for (let i = 0; i < 6 && !runner.result; i++) runner.step();
    result = runner.finish();
  } else result = api.runBattleCore(state, rng, { turnLimit: 6, onEvent: ev => events.push(ev) });
  return clean({ events, finalState: api.battleCoreFinalState(state), result, rngNext: rng.next() });
}

(async () => {
  await h.ready;
  for (const scenario of scenarios) for (const side of ['p1', 'p2']) {
    if (scenario.only && scenario.only !== side) continue;
    for (const enhanced of [false, true]) await check(`${side}/${scenario.name}/${enhanced ? '強化' : '通常'}`, async () => {
      const extra = h.clone(typeof scenario.extra === 'function' ? scenario.extra() : scenario.extra || {});
      if (enhanced && scenario.target !== 'summon') extra.desc = h.sheetRows('card').find(r => r['No.'] === 'C058')['強化効果'];
      const x = setup(side, extra, scenario.options?.(side), scenario.support?.() || []);
      scenario.run(x, enhanced);
      const id = scenario.target === 'summon' ? x.events.find(e => e.type === 'summon').unit.id : 'wyvern';
      const gains = x.events.filter(e => e.type === 'stat_change' && e.unitId === id && e.atk > 0);
      for (const reason of scenario.reasons) assert.ok(gains.some(e => e.reason === reason), '経路未到達: ' + reason);
      if (scenario.gainAmount != null) assert.equal(gains[0].atk, scenario.gainAmount, '鏡も含めた実際の増加量');
      const hits = x.events.filter(e => e.type === 'damage' && e.sourceId === id && e.effectSource !== false);
      const count = (scenario.activations || gains.length) * (enhanced ? 2 : 1);
      assert.equal(new Set(hits.map(e => e.batch)).size, count, 'ATK獲得1回ごとに本文どおり誘発する');
      assert.equal(hits.length, count * 2, '重複しない敵2体へのダメージ');
      assert.ok(hits.every(e => e.effect && !e.effectNo), '外側の演出番号を引き継がない');
      if (scenario.target === 'summon') {
        assert.ok(x.events.indexOf(hits[0]) > x.events.findIndex(e => e.type === 'summon'), '登場後に誘発する');
        assert.equal(x.find(id)._corePendingAtkGains, undefined, '保留中の誘発を戦闘状態に残さない');
      }
      // 複合効果を付けた検査体では補正自体の演出も出る。コアの命中束に対応する対象を数える。
      const hitBatches = [...new Set(hits.map(event => event.batch))].map(batch =>
        new Set(hits.filter(event => event.batch === batch).map(event => event.unitId)));
      const damageFx = () => h.calls.filter(c => c.name === 'wyvern' && c.options.targets.length
        && hitBatches.some(batch => c.options.targets.every(target => batch.has(target.element?.dataset.unitId))));
      const allFx = () => h.calls.filter(c => c.name === 'wyvern');
      await x.pve();
      assert.equal(damageFx().length, count * (scenario.vfxPerActivation || 1), 'PvEの固有VFX');
      assert.equal(damageFx().reduce((n, c) => n + c.options.targets.length, 0), hits.length, '命中対象ごとにVFXが1回だけ出る');
      assert.equal(h.sounds.filter(s => s.code === 'C058').length, allFx().length, 'PvEの全固有VFXにSEが付く');
      assert.equal(h.calls.filter(c => c.name === 'hit' && c.amount === 2).length, hits.length, 'PvEのダメージ数値');
      await x.online();
      assert.equal(damageFx().length, count * (scenario.vfxPerActivation || 1), 'オンラインの固有VFX');
      assert.equal(damageFx().reduce((n, c) => n + c.options.targets.length, 0), hits.length, 'オンラインも命中対象のVFXを重複しない');
      assert.equal(h.sounds.filter(s => s.code === 'C058').length, allFx().length, 'オンラインの全固有VFXにSEが付く');
      assert.equal(h.calls.filter(c => c.name === 'hit' && c.amount === 2).length, hits.length, 'オンラインのダメージ数値');
    });
  }
  await check('0増加・減少・封印・沈黙では誘発せず乱数も消費しない', () => {
    for (const amount of [0, -1]) {
      const x = setup('p1'), expected = createSeededRng(1020);
      coreTriggerAtkGainEffects(x.find('wyvern'), amount, x.state, x.rng, x.emit, x.hit);
      assert.deepEqual(x.events, []); assert.equal(x.rng.next(), expected.next());
    }
    for (const extra of [{ _sealed: true, keywords: ['封印1'] }, {}]) {
      const x = setup('p1', extra), expected = createSeededRng(1020);
      if (!extra._sealed) coreSilenceUnit(x.find('wyvern'));
      coreApplyOpeningItems(x.state, x.rng, x.emit, x.hit);
      coreTriggerAtkGainEffects(x.find('wyvern'), 5, x.state, x.rng, x.emit, x.hit);
      assert.ok(!x.events.some(e => e.type === 'damage')); assert.equal(x.rng.next(), expected.next());
    }
    for (const key of ['giant_scroll', 'speed_ring']) {
      const x = setup('p1', { atk: 0 }, key === 'giant_scroll' ? items('p1', key) : rings('p1', 'R031'));
      if (key === 'giant_scroll') coreApplyOpeningItems(x.state, x.rng, x.emit, x.hit);
      else coreApplyOpeningRings(x.state, x.rng, x.emit, x.hit);
      assert.ok(!x.events.some(e => e.type === 'damage'), '0の倍化では誘発しない');
    }
  });
  await check('誘発中のATK獲得は既存の深さガードで止まり、次の独立した獲得は発動する', () => {
    const x = setup('p1'), w = x.find('wyvern');
    let hits = 0;
    const hit = () => { hits++; w.atk++;
      coreTriggerAtkGainEffects(w, 1, x.state, x.rng, x.emit, hit); };
    for (let i = 0; i < 2; i++) coreTriggerAtkGainEffects(w, 1, x.state, x.rng, x.emit, hit);
    assert.equal(hits, 4); assert.equal(w._coreAtkGainEffectDepth, undefined);
  });
  await check('常時補正の再計算で増分0なら誘発しない', () => {
    const x = setup('p1', { effectData: { effectTexts: [h.card('EN061', 'enemy').desc] } },
      { resources: { p2: { mana: 1 } } });
    x.find('wyvern')._genericEnemyManaBuff = 4;
    coreGainResource(x.state, 'p1', 'mana', 1, null, x.emit, '検査', null, x.rng, x.hit);
    assert.equal(x.events.filter(e => e.type === 'stat_change').length, 0);
    assert.equal(x.events.filter(e => e.type === 'damage').length, 0);
    assert.equal(x.rng.next(), createSeededRng(1020).next());
  });
  await check('新しい体の基礎値・現在値を写すコピーだけでは誘発しない', () => {
    for (const inherits of [false, true]) {
      const x = setup('p1', {}, inherits ? rings('p1', 'R001') : {});
      coreSummonUnit(x.state, 'p1', h.unit('new-wyvern', 'C058', { atk: 50, color: '赤', _inheritsStats: inherits }),
        x.emit, 'wyvern', null, x.rng, x.hit);
      assert.equal(x.events.filter(e => e.type === 'damage').length, 0);
      assert.equal(x.rng.next(), createSeededRng(1020).next());
    }
  });
  await check('編成で確定する基礎値・永続値・同名補正は獲得イベントにしない', () => {
    const x = setup('p1', { atk: 50, _baseAtk: 40, ...effects('E026', 'enchant') });
    coreApplyFormationPassives(x.state.units.p1);
    assert.deepEqual(x.events, []);
  });
  await check('PvEの逐次runner・一括コア・simulateOnlineBattleのイベント列と最終状態が一致', () => {
    for (const scenario of scenarios) for (const side of ['p1', 'p2']) {
      if (scenario.only && scenario.only !== side) continue;
      const extra = typeof scenario.extra === 'function' ? scenario.extra() : scenario.extra || {};
      const options = { seed: 1020, turnLimit: 6, sides: { [side]: { units: [h.unit('wyvern', 'C058', extra), ...(scenario.support?.() || [])] },
        [other(side)]: { units: [h.unit('foe0'), h.unit('foe1'), h.unit('foe2')] } }, ...scenario.options?.(side) };
      const direct = battle(global, options), stepped = battle(global, options, true), online = simulateOnlineBattle(options);
      assert.deepEqual(stepped, direct, scenario.name + '/PvE');
      assert.deepEqual(clean(online.events), direct.events, scenario.name + '/イベント列');
      assert.deepEqual(clean(online.finalState), direct.finalState, scenario.name + '/最終状態');
      assert.equal(online.outcome, direct.result.outcome);
    }
  });
  await check('ワイバーン不在の全キャラ×両陣営で結果・全イベント・状態・次の乱数が修正前と一致', () => {
    const context = { module: { exports: {} } }; vm.createContext(context);
    vm.runInContext(cp.execFileSync('git', ['show', BASE_REF + ':prototype/js/battle/core.js'], { encoding: 'utf8', maxBuffer: 2e6 }), context);
    const baseline = context.module.exports;
    for (const row of h.sheetRows('card').filter(r => r['No.'] !== 'C058')) for (const side of ['p1', 'p2']) {
      const u = h.unit(row['No.'], row['No.']);
      const options = { sides: { [side]: { units: [u] }, [other(side)]: { units: [h.unit('foe0'), h.unit('foe1')] } },
        resources: { [side]: { mana: 6, gold: 20 } }, ...rings(side, 'R001', 'R032', 'R034'),
        ...items(side, 'bond_scroll'), summonDefs: h.sheetRows('card').filter(r => r['No.'] !== 'C058').map(r => h.unit(r['No.'], r['No.'])) };
      assert.deepEqual(battle(global, options), battle(baseline, options), row['No.'] + '/' + side);
    }
  });
  console.log(`ワイバーンATK獲得: ${checked}件成功、${failed}件失敗`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
