'use strict';

// 内蔵シートの現行本文で、眷属の出自・復活保持と両陣営・保存再生を検査する。
// ブラウザは起動せず、表示については本体の説明生成関数だけをNodeで呼ぶ。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
const sheetData = require('./sheet_data');
const ROOT = path.resolve(__dirname, '../..');
// 分類を保持する内部処理も本体のソースから呼ぶ。テストのために公開APIを増やさない。
const internal = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/battle/core.js'), 'utf8')
  + '\n({ coreAddSummonBuff, coreSilenceUnit, coreUnsilenceUnit });', {});
const rows = sheetData.sheetRows('card');
const ringRows = sheetData.sheetRows('ring');
const words = text => String(text || '').split(/[\s　、,]+/).filter(Boolean);
const copy = value => JSON.parse(JSON.stringify(value));

function card(name, id, overrides = {}, merged = false) {
  const row = rows.find(r => r['名前'] === name);
  assert.ok(row, `シートにキャラクターがない: ${name}`);
  const desc = String(merged ? row['合体効果'] || row['効果'] : row['効果'] || '');
  const mana = desc.match(/^(\d+)マナ(毎)?[：:]\s*(.+)$/);
  return {
    id, name, no: row['No.'], color: row['カラー'], race: row['種族'],
    atk: Number(row['パワー']), hp: Number(row['ライフ']), maxHp: Number(row['ライフ']),
    keywords: words(merged ? row['合体キーワード'] || row['キーワード'] : row['キーワード']), desc,
    manaCost: mana ? Number(mana[1]) : 0, manaRepeat: !!(mana && mana[2]),
    manaThresholdDesc: mana ? mana[3] : '', ...overrides,
  };
}
function ring(name) {
  const row = ringRows.find(r => r['名前'] === name);
  assert.ok(row, `シートに指輪がない: ${name}`);
  return { name, no: row['No.'], desc: row['効果'] };
}
// 2026-10-12: 眷属強化・合体反復は現行のシート本文から期待値を求める。
function buffSpec(name, merged) {
  const text = card(name, 'expected', {}, merged).desc;
  const pair = text.match(/\+(\d+)\/\+(\d+)/), atk = text.match(/ATK\+(\d+)/), hp = text.match(/HP\+(\d+)/);
  const scale = text.match(/眷属の(?:数の)?(\d+)倍繰り返す/);
  const times = sheetData.effectRepetitions(text);
  return { atk: (pair ? Number(pair[1]) : Number(atk && atk[1]) || 0) * times,
    hp: (pair ? Number(pair[2]) : Number(hp && hp[1]) || 0) * times, scale: Number(scale && scale[1]) || 1 };
}
function ringBuff() {
  const match = ring('召喚師の指輪').desc.match(/\+(\d+)\/\+(\d+)/);
  return [Number(match[1]), Number(match[2])];
}
const summonDefs = rows.map(row => card(row['名前'], row['No.']));
const plain = (id, extra = {}) => ({ id, name: '検査用キャラクター', atk: 40, hp: 100,
  maxHp: 100, keywords: [], desc: '', ...extra });
function harness(side, allies, extra = {}) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = core.createBattleState({
    sides: { [side]: { units: allies }, [other]: { units: [plain(`${other}-target`, { atk: 1, hp: 1000, maxHp: 1000 })] } },
    summonDefs, ...extra,
  });
  const events = [], rng = createSeededRng(1007);
  state.units[side][0]._currentAttackTarget = state.units[other][0];
  const emit = event => events.push(event);
  const hit = (source, target, amount, counter, skipSourceEffects, skipTough, options) =>
    core.coreResolveHit(state, source, target, amount, counter, rng, emit,
      { skipSourceEffects, skipTough, ...(options || {}) });
  return { state, events, rng, emit, hit, source: state.units[side][0], other };
}
const isKenzoku = unit => core.coreUnitHasKeyword(unit, '眷属');

function runCoreChecks() {
  let cases = 0;
  const check = (label, fn) => { fn(); cases++; };
  for (const side of ['p1', 'p2']) {
    const route = (label, raw, invoke, extra = {}) => check(`${side}/${label}`, () => {
      const h = harness(side, [raw], extra);
      assert.equal(isKenzoku(h.source), false, `${label}: 召喚元への誤付与`);
      invoke(h);
      const summoned = h.events.filter(e => e.type === 'summon');
      assert.ok(summoned.length, `${label}: 召喚が発動していない`);
      summoned.forEach(e => assert.equal(e.unit.keywords.filter(k => k === '眷属').length, 1,
        `${side}/${label}: 召喚スナップショットの眷属が欠落／重複`));
      assert.equal(isKenzoku(h.source), false, `${label}: 召喚元が眷属になった`);
    });
    route('開戦効果', card('ミテーラ', 'opening'), h =>
      core.coreApplyOpeningEffects(h.source, h.state, h.rng, h.emit, h.hit));
    route('コピー召喚', card('ツインデビル', 'copy'), h =>
      core.coreApplyOpeningEffects(h.source, h.state, h.rng, h.emit, h.hit));
    route('攻撃効果', card('スケルトンキング', 'attack', { atk: 40, hp: 100, maxHp: 100 }), h =>
      core.coreApplyAttackEffects(h.source, h.state, h.rng, h.emit, h.hit));
    route('負傷効果', card('ケットシー', 'injury'), h =>
      core.coreApplyInjuryEffects(h.source, 1, h.state, h.rng, h.emit, h.hit));
    route('死亡効果', card('デスナイト', 'death'), h => {
      h.source.hp = 0;
      core.coreApplyDeathEffects(h.source, h.state, h.rng, h.emit, h.hit);
    });
    route('マナ効果', card('ダイアウルフ', 'mana'), h =>
      core.coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit),
    { resources: { [side]: { mana: 3 } } });
    const enchant = {'効果':card('ツインデビル','copy-effect').desc};
    assert.ok(enchant && enchant['効果'], '複製のシート本文がない');
    route('強化カード', plain('enchanted', { effectData: { effectTexts: [enchant['効果']] } }), h =>
      core.coreApplyOpeningEffects(h.source, h.state, h.rng, h.emit, h.hit));
    route('複製の力', plain('map-copy', { _mapPanelPower: 'duplicate' }), h =>
      core.coreApplyOpeningEffects(h.source, h.state, h.rng, h.emit, h.hit));
    route('鬼神の指輪', plain('ring-source'), h => {
      for (let i = 0; i < 12; i++) core.coreApplyAttackRing(h.state, side, h.rng, h.emit, h.hit);
    }, { rings: { [side]: [ring('鬼神の指輪')] } });
    route('召喚系アイテム', plain('item-source'), h =>
      core.coreApplyOpeningItems(h.state, h.rng, h.emit, h.hit),
    { items: { [side]: [{ id: 'illusion-item', itemEffectKey: 'illusion_scroll' }] } });

    check(`${side}/開戦配置・封印解放`, () => {
      const h = harness(side, [plain('deployed', { _panelSummoned: true, _mapPanelPower: 'summon' }),
        plain('sealed', { _panelSummoned: true, keywords: ['封印1'], _sealed: true })]);
      const sealed = h.state.units[side][1];
      assert.equal(core.coreSealRelease(sealed, h.state.units[side], { [side]: 1 }).ready, true);
      sealed._sealed = false;
      core.coreApplyReleaseEffects(sealed, [], h.state, h.rng, h.emit, h.hit);
      core.coreRunOpening(h.state, h.rng, h.emit, h.hit, () => {});
      assert.equal(h.events.filter(e => e.type === 'summon').length, 0);
      h.state.units[side].forEach(u => assert.equal(isKenzoku(u), false, '初期配置／解放に眷属が付いた'));
    });
    check(`${side}/死亡記録からの召喚・付与された死亡効果`, () => {
      const h = harness(side, [card('レムレース', 'lemures'), plain('archived')]);
      const dead = h.state.units[side][1]; dead.hp = 0;
      core.coreTriggerDeath(dead, h.state, h.emit);
      h.source.hp = 0;
      core.coreApplyDeathEffects(h.source, h.state, h.rng, h.emit, h.hit);
      assert.ok(h.events.some(e => e.type === 'summon' && isKenzoku(e.unit)), 'レムレースの召喚が眷属でない');
      const granted = harness(side, [card('ボーンチャリオット', 'grant'), plain('recipient')]);
      core.coreApplyInjuryEffects(granted.source, 1, granted.state, granted.rng, granted.emit, granted.hit);
      const recipient = granted.state.units[side][1]; recipient.hp = 0;
      core.coreApplyDeathEffects(recipient, granted.state, granted.rng, granted.emit, granted.hit);
      assert.ok(granted.events.some(e => e.type === 'summon' && isKenzoku(e.unit)), '付与された死亡効果が眷属でない');
    });
    check(`${side}/エイドロンの旧死亡観測を除外`, () => {
      const h = harness(side, [card('エイドロン', 'new-eidolon')]);
      for (let n = 0; n < 3; n++) {
        const dead = core.createCoreUnit(plain(`observed-${n}`, { hp: 0 }), side, n + 1);
        core.coreApplyDeathObservers(dead, h.state, h.rng, h.emit, h.hit);
      }
      assert.equal(h.state.resources[side].mana, 0, '現行エイドロンに旧死亡観測の1マナが残る');
      assert.equal(h.source._coreObservedAllyDeaths, undefined);
    });

    for (const merged of [false, true]) check(`${side}/5効果${merged ? '・合体' : ''}`, () => {
      const h = harness(side, [card('ファントム', 'phantom', {}, merged), card('エイドロン', 'eidolon', {}, merged),
        card('ナーガ', 'naga', {}, merged), plain('initial-reviver', { atk: 12, hp: 20, maxHp: 20, keywords: ['復活'] })],
      { rings: { [side]: [ring('光の指輪'), ring('召喚師の指輪')] } });
      const naga = buffSpec('ナーガ', merged), phantom = buffSpec('ファントム', merged), eidolonBuff = buffSpec('エイドロン', merged);
      const ringStats = ringBuff(), shield = Number(ring('光の指輪').desc.match(/結界(\d+)/)[1]);
      const summonExpected = (n, buff = { atk: 0, hp: 0 }) => [10 + ringStats[0] + naga.atk * naga.scale * n + buff.atk,
        20 + ringStats[1] + naga.hp * naga.scale * n + buff.hp, shield];
      const specimen = { name: '検査用の召喚体', atk: 10, hp: 20, maxHp: 20, keywords: ['復活'] };
      const live = core.coreSummonUnit(h.state, side, specimen, h.emit);
      const revived = core.coreSummonUnit(h.state, side, specimen, h.emit);
      assert.deepEqual([live.atk, live.hp, live.shield], summonExpected(2), '後続の召喚時に既存の眷属にもナーガの修正が乗る');
      assert.deepEqual([revived.atk, revived.hp], summonExpected(2).slice(0, 2), 'ナーガの召喚累計');
      const initial = h.state.units[side].find(u => u.id === 'initial-reviver');
      const revivalStart = h.events.length;
      [revived, initial].forEach(u => {
        u.hp = 0;
        assert.equal(core.coreTryRevive(u, h.state, h.emit), '復活');
        assert.equal(isKenzoku(u), u === revived, '復活で元の眷属分類が変わった');
      });
      assert.deepEqual([revived.atk, revived.hp, revived.shield], [5 + ringStats[0] + naga.atk * naga.scale * 2, 10 + ringStats[1] + naga.hp * naga.scale * 2, shield],
        '眷属の復活へナーガ／指輪の修正が付かない／復活を召喚数へ加えた');
      assert.deepEqual([initial.atk, initial.hp, initial.shield], [6, 10, 0], '初期配置の復活へ強化が付いた');
      assert.deepEqual(h.events.slice(revivalStart).filter(e => e.type === 'stat_change').map(e => e.reason),
        [...(naga.atk||naga.hp?['summon_buff']:[]), 'summoner_ring'], '元眷属の復活へ累積修正を1回だけ掛け、初期配置へは掛けない');
      const beforeLive = [live.atk, live.hp];
      const beforeRevived = [revived.atk, revived.hp, initial.atk, initial.hp];
      h.source.hp = 0;
      core.coreApplyDeathEffects(h.source, h.state, h.rng, h.emit, h.hit);
      const eidolon = h.state.units[side].find(u => u.id === 'eidolon');
      core.coreApplyInjuryEffects(eidolon, 1, h.state, h.rng, h.emit, h.hit);
      assert.deepEqual([live.atk, live.hp], [beforeLive[0] + (phantom.atk + eidolonBuff.atk), beforeLive[1] + (phantom.hp + eidolonBuff.hp)],
        'ファントム／エイドロンが既存の眷属へ作用しない');
      assert.deepEqual([revived.atk, revived.hp, initial.atk, initial.hp],
        [beforeRevived[0] + (phantom.atk + eidolonBuff.atk), beforeRevived[1] + (phantom.hp + eidolonBuff.hp), beforeRevived[2], beforeRevived[3]],
        '復活した眷属がファントム／エイドロンの対象外／初期配置の復活が対象になった');
      assert.equal(h.events.filter(e => e.type === 'summon').length, 2, 'ファントムの旧召喚効果が発動した');
      const future = core.coreSummonUnit(h.state, side, specimen, h.emit);
      assert.deepEqual([future.atk, future.hp, future.shield], summonExpected(3, { atk: phantom.atk + eidolonBuff.atk, hp: phantom.hp + eidolonBuff.hp }),
        '後続の眷属が累積強化を受けない／復活をナーガの召喚数へ加えた');
      assert.equal(h.state._summonCount[side], 3, '復活が召喚累計へ入った');
      h.events.filter(e => e.type === 'revive').forEach(e => assert.equal(isKenzoku(e), e.unitId === revived.id, '復活イベントで出自が変わる'));
    });
    for (const merged of [false, true]) check(`${side}/ナーガの戦闘内召喚履歴${merged ? '・合体' : ''}`, () => {
      const h = harness(side, [card('ナーガ', 'history-naga', {}, merged),
        plain('initial-revival', { atk: 12, hp: 20, maxHp: 20, keywords: ['復活'] })]);
      const naga = buffSpec('ナーガ', merged);
      const expected = n => [10 + naga.atk * naga.scale * n, 20 + naga.hp * naga.scale * n];
      const revivedExpected = [5 + naga.atk * naga.scale * 2, 10 + naga.hp * naga.scale * 2];
      const specimen = { name: '履歴検査体', atk: 10, hp: 20, maxHp: 20, keywords: [] };
      const first = core.coreSummonUnit(h.state, side, specimen, h.emit);
      assert.deepEqual([first.atk, first.hp], expected(1), '今回の召喚自身を1体目として数えない');
      const foe = h.state.units[h.other][0];
      h.hit(foe, first, first.hp, false, true);
      assert.equal(first.hp, 0, '履歴検査の1体目が死亡していない');
      assert.equal(h.state._summonCount[side], 1, '眷属の死亡で召喚履歴が減った');
      core.coreCompactUnits(h.state);
      assert.equal(isKenzoku(first), false, '完全死亡して盤面から消えた体に眷属が残る');
      // 相手側の召喚は味方の履歴へ入れない。
      core.coreSummonUnit(h.state, h.other, specimen, h.emit);
      const second = core.coreSummonUnit(h.state, side, { ...specimen, keywords: ['復活'] }, h.emit);
      assert.deepEqual([second.atk, second.hp], expected(2), '死亡済みを含む2体分にならない／敵の召喚を数えた');
      h.hit(foe, second, second.hp, false, true);
      const initial = h.state.units[side].find(u => u.id === 'initial-revival');
      h.hit(foe, initial, initial.hp, false, true);
      assert.deepEqual([second.atk, second.hp], revivedExpected,
        '復活した眷属へナーガが累計2体分の強化を付けない');
      assert.deepEqual([initial.atk, initial.hp], [6, 10], '初期配置の復活へナーガの強化が付いた');
      assert.equal(isKenzoku(second), true);
      assert.equal(isKenzoku(initial), false);
      assert.equal(h.state._summonCount[side], 2, '復活自体を数えた／復活前の召喚履歴を失った');
      const third = core.coreSummonUnit(h.state, side, specimen, h.emit);
      assert.deepEqual([third.atk, third.hp], expected(3), '後続の召喚が累計3体分にならない');
      assert.deepEqual([second.atk, second.hp, initial.atk, initial.hp],
        [revivedExpected[0]+naga.atk,revivedExpected[1]+naga.hp,6,10],
        '後続召喚時は復活した眷属も強化し、初期配置の復活は対象外');
      assert.equal(h.state._summonCount[side], 3);
      assert.deepEqual(h.events.filter(e => e.type === 'stat_change' && e.reason === 'summon_buff').map(e => e.unitId),
        naga.atk||naga.hp ? [first.id, second.id, second.id, second.id, third.id, second.id, third.id] : [], '累積修正の再適用と新規召喚の追加分を各1回だけ反映');
    });
    check(`${side}/眷属判定・変身・沈黙・根性`, () => {
      const h = harness(side, [plain('marker-only', { _summonedInBattle: true }), plain('keyword-only', { keywords: ['眷属'] })]);
      internal.coreAddSummonBuff(h.state, side, 1, 2, h.emit);
      assert.equal(h.source.atk, 40, '古い召喚フラグで対象を選んでいる');
      assert.equal(h.state.units[side][1].atk, 41, '眷属キーワードで対象を選んでいない');
      const child = core.coreSummonUnit(h.state, side, { name: '検査体', atk: 10, hp: 20, keywords: ['眷属', '根性'] }, h.emit);
      child.hp = 0;
      assert.equal(core.coreTryRevive(child, h.state, h.emit), '根性');
      assert.equal(isKenzoku(child), true, '根性で眷属が消えた');
      core.coreTransformUnit(h.state, child, '緑ペリカン', h.emit);
      assert.equal(isKenzoku(child), true, '変身で眷属が消えた');
      core.coreTransformUnit(h.state, h.source, '緑ペリカン', h.emit);
      assert.equal(isKenzoku(h.source), false, '変身だけで眷属が付いた');
      internal.coreSilenceUnit(child);
      assert.equal(isKenzoku(child), true, '沈黙で分類が消えた');
      internal.coreUnsilenceUnit(child);
      assert.equal(child.keywords.filter(k => k === '眷属').length, 1, '沈黙解除で分類が重複した');
      const revived = core.coreSummonUnit(h.state, side, { name: '累積修正の復活検査', atk: 10, hp: 20, maxHp: 20, keywords: ['復活'] }, h.emit);
      revived.hp = 0;
      assert.equal(core.coreTryRevive(revived, h.state, h.emit), '復活');
      assert.deepEqual([revived.atk, revived.hp], [6, 12], '眷属の復活で既存の累積修正を失った／二重に足した');
      assert.equal(h.state._summonCount[side], 2, '累積修正を再適用した復活を召喚履歴へ入れた');
      h.state.summonDefs.push({ name: '変身先の分類検査', keywords: ['眷属'], power: 5, life: 5 });
      core.coreTransformUnit(h.state, h.source, '変身先の分類検査', h.emit);
      assert.equal(isKenzoku(h.source), false, '変身先のキーワードで出自が変わった');
      internal.coreSilenceUnit(child);
      core.coreTriggerBattleEnd(h.state, h.emit, h.rng);
      internal.coreUnsilenceUnit(child);
      assert.equal(isKenzoku(child), false, '終戦後にも眷属が残る');
    });
  }
  check('復活の指輪・奪取・上限拒否', () => {
    const h = harness('p1', [plain('ring-reviver')], { rings: { p1: [ring('復活の指輪'), ring('光の指輪'), ring('召喚師の指輪')] } });
    const child = core.coreSummonUnit(h.state, 'p1', { name: '検査体', atk: 10, hp: 20 }, h.emit);
    internal.coreAddSummonBuff(h.state, 'p1', 1, 2, h.emit);
    const expected = [Math.floor(child._baseAtk / 2) + 1 + ringBuff()[0],
      Math.max(1, Math.floor(child._baseMaxHp / 2)) + 2 + ringBuff()[1]];
    internal.coreSilenceUnit(child); child.hp = 0;
    assert.equal(core.coreTryRevive(child, h.state, h.emit), 'revival_ring');
    assert.deepEqual([child.atk, child.hp, child.shield], [...expected, 1], '指輪復活は本体の半分＋常時修正1回／光の結界');
    assert.equal(isKenzoku(child), true, '復活の指輪で眷属が消える');
    internal.coreUnsilenceUnit(child);
    assert.equal(isKenzoku(child), true, '沈黙解除で眷属が消える');
    const before = child.atk;
    internal.coreAddSummonBuff(h.state, 'p1', 1, 2, h.emit);
    assert.equal(child.atk, before + 1, '復活の指輪で戻った眷属が強化の対象外');
    const target = h.state.units.p2[0];
    assert.equal(core.coreStealUnit(h.state, target, 'p1', h.emit), true);
    assert.equal(isKenzoku(target), false, '奪取だけで眷属が付いた');
    h.state.frontSlots = 3;
    assert.equal(core.coreSummonUnit(h.state, 'p1', { name: '拒否' }, h.emit), null);
    assert.equal(h.state._summonCount.p1, 1, '拒否された召喚を数えた');
  });
  for (const merged of [false, true]) check(`復活の指輪・ナーガ${merged ? '・合体' : ''}`, () => {
    const h = harness('p1', [card('ナーガ', 'ring-naga', {}, merged),
      plain('initial-ring-revival', { atk: 12, hp: 20, maxHp: 20, keywords: ['復活'] })],
    { rings: { p1: [ring('復活の指輪'), ring('光の指輪'), ring('召喚師の指輪')] } });
    const child = core.coreSummonUnit(h.state, 'p1', { name: '指輪の復活検査体', atk: 10, hp: 20, maxHp: 20 }, h.emit);
    const base = [Math.floor(child._baseAtk / 2), Math.max(1, Math.floor(child._baseMaxHp / 2))];
    child.hp = 0;
    assert.equal(core.coreTryRevive(child, h.state, h.emit), 'revival_ring');
    const spec = buffSpec('ナーガ', merged);
    assert.deepEqual([child.atk, child.hp, child.shield], [base[0] + spec.atk + ringBuff()[0], base[1] + spec.hp + ringBuff()[1], 1],
      '指輪復活の半減後にナーガ・召喚師を1回ずつ適用し、光の結界も戻す');
    assert.equal(isKenzoku(child), true);
    const initial = h.state.units.p1.find(unit => unit.id === 'initial-ring-revival');
    initial.hp = 0;
    assert.equal(core.coreTryRevive(initial, h.state, h.emit), '復活');
    assert.deepEqual([initial.atk, initial.hp, initial.shield], [6, 10, 0], '初期配置の復活が眷属の強化を受けた');
    assert.equal(h.state._summonCount.p1, 1, '指輪／キーワード復活をナーガの累計に足した');
  });
  check('不死の指輪', () => {
    const h = harness('p1', [plain('undying')], { rings: { p1: [ring('不死の指輪')] } });
    h.source.hp = 0; h.state._undyingRingPending = true;
    assert.equal(core.coreCheckUndyingRing(h.state, h.emit), true);
    const summoned = h.events.filter(e => e.type === 'summon');
    assert.equal(summoned.length, 3);
    summoned.forEach(e => assert.equal(isKenzoku(e.unit), true));
  });
  return cases;
}

async function runReplayChecks() {
  Object.assign(global, { createSeededRng, createBattleState: core.createBattleState,
    runBattleCore: core.runBattleCore, battleCoreFinalState: core.battleCoreFinalState,
    coreClearKenzoku: core.coreClearKenzoku, ONLINE_EVENT: require('../../js/online/protocol').ONLINE_EVENT,
    ONLINE_PROTOCOL_VERSION: 1 });
  const { simulateOnlineBattle } = require('../../js/online/sim');
  const { presentReviveEvent } = require('../../js/battle/present_events');
  const army = side => [card('ナーガ', `${side}-naga`), card('エイドロン', `${side}-eidolon`),
    card('ファントム', `${side}-phantom`), card('スケルトンキング', `${side}-king`), card('ミテーラ', `${side}-mitera`)];
  const setup = { seed: 1007, turnLimit: 80, sides: { p1: { units: army('p1') }, p2: { units: army('p2') } }, summonDefs,
    rings: { p1: [ring('光の指輪'), ring('召喚師の指輪')], p2: [ring('光の指輪'), ring('召喚師の指輪')] } };
  const run = input => {
    const state = core.createBattleState(input), events = [];
    const result = core.runBattleCore(state, createSeededRng(input.seed), { turnLimit: input.turnLimit, onEvent: e => events.push(e) });
    return { events, finalState: core.battleCoreFinalState(state), outcome: result.outcome, turns: result.turns };
  };
  const direct = run(setup), online = simulateOnlineBattle(copy(setup)), recomputed = run(copy(setup));
  assert.deepEqual(online.events, direct.events, 'オンラインとのイベント不一致');
  assert.deepEqual(online.finalState, direct.finalState, 'オンラインとの最終状態不一致');
  assert.deepEqual(recomputed, direct, '保存した初期配置・乱数種からの再計算が不一致');
  const savedEvents = copy(direct.events), units = new Map();
  assert.equal(savedEvents.at(-1).kenzokuEnded, true, '終戦の分類解除がイベントにない');
  const { playOnlineBattleEvents } = require('../../js/online/playback');
  const timer = global.setTimeout;
  try {
    global.setTimeout = fn => { fn(); return 0; };
    await playOnlineBattleEvents({ events: copy(savedEvents), outcome: direct.outcome }, {
      onEvent: (event, context) => {
        if (event.type === 'battle_end') Object.values(context.board).flat().forEach(unit =>
          assert.equal(isKenzoku(unit), false, 'オンライン再生で終戦後にも眷属が残る'));
      },
    });
  } finally { global.setTimeout = timer; }
  const key = (side, id) => `${side}:${id}`;
  for (const event of savedEvents) {
    if (event.type === 'battle_start') for (const side of ['p1', 'p2']) event.sides[side].forEach(u => units.set(key(side, u.id), copy(u)));
    if (event.type === 'summon') {
      assert.equal(isKenzoku(event.unit), true, '保存された召喚イベントに眷属がない');
      units.set(key(event.side, event.unit.id), copy(event.unit));
    }
    if (event.type === 'transform') units.set(key(event.side, event.unitId), copy(event.unit));
    if (event.type === 'revive') {
      const unit = units.get(key(event.side, event.unitId));
      assert.ok(unit, '保存再生の復活対象がない');
      const wasKenzoku = isKenzoku(unit);
      await presentReviveEvent(event, { findUnit: (side, id) => units.get(key(side, id)),
        applyKeywords: (u, keywords) => { u.keywords = keywords.slice(); },
        applyStats: (u, e) => { u.atk = e.atk; u.hp = e.hp; u.maxHp = e.maxHp; } });
      assert.deepEqual(unit.keywords, event.keywords, '共通の復活受け口でキーワードが反映されない');
      assert.equal(isKenzoku(unit), wasKenzoku, '保存再生の復活で眷属の出自が変わった');
    }
  }
  for (const side of ['p1', 'p2']) {
    assert.ok(savedEvents.some(e => e.type === 'summon' && e.side === side), `${side}の召喚を比較できていない`);
    assert.ok(savedEvents.some(e => e.type === 'revive' && e.side === side && e.reason === '復活'), `${side}の復活を比較できていない`);
  }
  const finalUnit = plain('core-final', { keywords: ['眷属', '根性', '貫通'] });
  await presentReviveEvent({ type: 'revive', side: 'p1', unitId: finalUnit.id,
    reason: '根性', keywords: ['眷属'] }, { findUnit: () => finalUnit });
  assert.deepEqual(finalUnit.keywords, ['眷属', '根性', '貫通'], 'PvEの共通演出がコアの最終キーワードを巻き戻した');
}

async function runDisplayChecks() {
  // 通常のNodeハーネスを使い、rAFは進めない（見た目・アニメーションの検査ではない）。
  require('./stub'); global.requestAnimationFrame = () => 0;
  require('./load');
  const originalLog = console.log, originalTable = console.table;
  try { console.log = () => {}; console.table = () => {}; await loadGameData(); }
  finally { console.log = originalLog; console.table = originalTable; }
  // 2026-10-12: シート番号の並べ替えに依存せず、意味を名前で引く。
  const keywords = sheetData.sheetRows('keyword').filter(r => ['眷属','マナ効果','荷物','刻印'].includes(r['名前']));
  assert.equal(keywords.length,4);
  keywords.forEach(row => {
    assert.equal(KW_NO_MAP[row['名前']], row['No.']);
    assert.equal(KW_DESC_MAP[row['名前']], row['効果']);
  });
  const body = '常時：味方の眷属は+1/+1を得る。';
  const unit = plain('display', { keywords: ['眷属'], desc: body, boardCards: [] });
  assert.ok(_unitDisplayKeywords(unit, body, -1).includes('眷属'), '自身の本文に眷属があると所持欄から消える');
  assert.match(_unitPreviewText(unit, body, -1), /キーワード：眷属/);
  assert.ok(_keywordOnlyPreviewText(unit, body, -1).includes('眷属：' + keywords.find(row => row['名前'] === '眷属')['効果']));
  for (const name of ['ファントム', 'エイドロン', 'ナーガ']) {
    const definition = PANEL_POOL.find(p => p.name === name);
    assert.ok(definition);
    assert.equal((definition.keywords || []).includes('眷属'), false, `${name}の本文から所持を推測している`);
    assert.equal(definition.desc, rows.find(r => r['名前'] === name)['効果'], 'コードの予備本文とシートの本文が不一致');
  }
  assert.equal(getVfxDefinitionName(getKeywordEffectVfxPath('マナ効果')), 'mana-cue');
  assert.equal(getVfxSourceCode(getKeywordEffectVfxPath('マナ効果')), 'K024');
  assert.equal(getKeywordEffectSfxKey('マナ効果'), 'K024');
  assert.equal(getKeywordEffectVfxPath('眷属'), '');
  assert.equal(getKeywordEffectSfxKey('眷属'), '');
  const exported=require('../vfx_export').validatedBundle().bundle;
  assert.ok(exported.effects.some(d=>d.name==='mana-cue'&&d.sourceCode==='K024'),'マナ効果の定義が書き出せる');
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/sfx/K024.wav')));
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/vfx/K023.webp')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/sfx/K023.wav')), false);
  await runPveHandoffChecks();
  await runPveLegacyChecks();
}

async function runPveHandoffChecks() {
  // セーブ無しPvEの本体入口を通す。演出だけ止め、開戦の数値処理は本体を使う。
  vm.runInThisContext(`
    _flushCorePveHitEvents=async function(){};
    _resolveSeals=async function(){};
    requestBattleCompact=function(){};
    _recomputeDynamicPanelStats=function(){};
    _recordBattleTrace=function(){};
    _effectiveRings=function(){return [];};
  `, { filename: 'kenzoku-pve-presentation-stubs.js' });
  const initial = core.createBattleState({ sides: {
    p1: { units: [card('ミテーラ', 'handoff-mitera'), card('ナーガ', 'handoff-naga'), card('ファントム', 'handoff-phantom')] },
    p2: { units: [plain('handoff-enemy')] },
  } });
  G.allies = initial.units.p1; G.enemies = initial.units.p2;
  G.activeBattleItems = [{ id: 'underworld', itemEffectKey: 'underworld_scroll' }];
  G._battleCoreEvents = []; G._blood = 0; G._enemyBlood = 0;
  G.mana = 0; G.gold = 0; G._waveLife = 20; G._wave = 1;
  await _finishNewPanelBattleStartEffects();
  const afterOpening = _createPveCoreState();
  assert.equal(afterOpening._summonCount.p1, 2, 'PvEで開戦の眷属召喚累計が消えた');
  const phantom=buffSpec('ファントム',false),naga=buffSpec('ナーガ',false);
  const accumulated={atk:phantom.atk+2*naga.atk,hp:phantom.hp+2*naga.hp};
  assert.deepEqual(afterOpening.gameSummonBuff.p1, accumulated, 'PvEでゲーム中の累積強化が消えた');
  const child = core.coreSummonUnit(afterOpening, 'p1', { name: '引継ぎ検査体', atk: 10, hp: 20, maxHp: 20 }, () => {});
  assert.deepEqual([child.atk, child.hp], [10+accumulated.atk+naga.atk,20+accumulated.hp+naga.hp], 'PvEの開戦後の召喚が同じ累計・強化を受けない');
  assert.equal(_createPveCoreState()._summonCount, undefined, '開戦状態の受け渡しが消費後も残る');
}

async function runPveLegacyChecks() {
  // 呼応の指輪などの旧直接生成入口も、分類・5効果・累計を本体で確認する。
  vm.runInThisContext(`
    _getPartyBoardUnit=function(){return globalThis.kenzokuCheckBoard||null;};
    _effectiveRings=function(){return globalThis.kenzokuCheckRings||[];};
  `, { filename: 'kenzoku-legacy-input-stubs.js' });
  const state = core.createBattleState({ sides: {
    p1: { units: [card('ナーガ', 'legacy-naga1'), plain('legacy-source1')] },
    p2: { units: [card('ナーガ', 'legacy-naga2'), plain('legacy-source2')] },
  } });
  state._summonCount = { p1: 2, p2: 3 };
  state._summonBuff = { p1: { atk: 1, hp: 2 }, p2: { atk: 2, hp: 0 } };
  G.gameSummonBuff={atk:0,hp:0};
  G.allies = state.units.p1; G.enemies = state.units.p2;
  G.activeBattleItems = []; G.panelColorPermanentBuffs = {}; G._coreDrivenBattle = false;
  global.kenzokuCheckRings = [ring('光の指輪'), ring('召喚師の指輪')];
  _keepPveSummonState(state);
  const base = card('スケルトン', 'legacy-base');
  for (const side of ['p1', 'p2']) {
    const child = await _spawnAdhocAllyUnit('青スケルトン', 1, 1, side === 'p2');
    assert.ok(child && isKenzoku(child), `${side}: 旧召喚入口で眷属が欠落`);
    assert.deepEqual([child.atk, child.hp, child.shield], side === 'p1'
      ? [base.atk+1+ringBuff()[0],base.hp+2+buffSpec('ナーガ',false).hp+ringBuff()[1],1]
      : [base.atk+2,base.hp+buffSpec('ナーガ',false).hp,0], '旧入口で共通の眷属強化が不一致');
  }
  // 魔導板に同名カードがある分岐も、実際の生成・配置入口を通す。
  const panel = PANEL_POOL.find(p => p.name === 'スケルトン');
  global.kenzokuCheckBoard = { boardCards: Array.from({ length: 25 }, (_, i) => i === 1 ? { ...panel } : null) };
  const owned = await _spawnAdhocAllyUnit('青スケルトン', 1, 1, false);
  assert.ok(owned && isKenzoku(owned), '所持カード由来の旧召喚で眷属が欠落');
  assert.deepEqual([owned.atk, owned.hp, owned.shield], [base.atk+1+ringBuff()[0],base.hp+2+2*buffSpec('ナーガ',false).hp+ringBuff()[1],1]);
  const afterLegacy = _createPveCoreState();
  assert.deepEqual(afterLegacy._summonCount, { p1: 4, p2: 4 }, '旧入口の召喚累計が通常手番へ渡らない');
  assert.deepEqual(afterLegacy._summonBuff, state._summonBuff);
  delete global.kenzokuCheckBoard;
  global.kenzokuCheckRings = [];

  // 旧解放入口からカオス・インプが開戦召喚を呼んだ時も、開戦の累計と強化を渡す。
  const release = core.createBattleState({ sides: {
    p1: { units: [card('ミテーラ', 'release-mitera'), card('ナーガ', 'release-naga'), card('カオス・インプ', 'release-chaos')] },
    p2: { units: [plain('release-enemy')] },
  } });
  release._summonCount = { p1: 1, p2: 0 };
  release._summonBuff = { p1: { atk: 1, hp: 2 }, p2: { atk: 0, hp: 0 } };
  G.allies = release.units.p1; G.enemies = release.units.p2;
  _keepPveSummonState(release);
  const oldPick = coreMathRng.pick;
  try {
    coreMathRng.pick = list => list.find(u => u.id === 'release-mitera') || list[0];
    await _applyReleaseEffect(release.units.p1[0], false, []);
  } finally { coreMathRng.pick = oldPick; }
  const afterRelease = _createPveCoreState();
  assert.equal(afterRelease._summonCount.p1, 3, '旧解放入口で召喚累計が途切れた');
  assert.deepEqual(afterRelease._summonBuff.p1, { atk: 1, hp: 2 });
  const summoned = G.allies.filter(u => u && isKenzoku(u));
  assert.equal(summoned.length, 2, '解放誘発の召喚へ眷属が付かない');
  assert.equal(isKenzoku(release.units.p1[0]), false, '解放された本人に眷属が付いた');
  delete global.kenzokuCheckRings;
}

module.exports = { runCoreChecks };
if (require.main === module) (async () => {
  const cases = runCoreChecks();
  await runReplayChecks();
  await runDisplayChecks();
  console.log(`眷属回帰: OK（コア${cases}条件・PvE開戦引継ぎ/旧召喚入口/オンライン・保存再計算/イベント再生・説明生成/素材対応）`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
