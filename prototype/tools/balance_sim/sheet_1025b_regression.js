'use strict';

// 2026-10-25 本文改訂。期待値はヘッダ名で読んだ通常／強化本文から独立に求める。
// 入手を止めている、名前の無い E084/E085 も同じ内蔵CSVから読む。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const sheet = require('./sheet_data');
// 1026に本文との不一致を直した効果は専用の新しい回帰検査で検証する。
const revised1026 = new Set('E011 E020 E022 E047 E055 E060 E062'.split(' '));
require('./load');
const copy = value => JSON.parse(JSON.stringify(value));
const rows = new Map();
for (const key of ['card', 'enchant']) {
  const data = sheet.parseCsv(sheet.loadLocalXlsxData()[key]), headers = data.shift();
  for (const cells of data) {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    if (row['No.']) rows.set(row['No.'], row);
  }
}
const required = ('C001 C002 C003 C004 C005 C026 C027 C028 C029 C030 C051 C052 C053 C054 C055 C076 C077 C078 C079 C080 '
  + 'C101 C102 C103 C104 C105 C007 C010 C018 C021 C031 C058 C067 C099 C017 C020 C034 C046 C047 C070 C092 C116 C121 E006 E084 E085').split(' ');
let passed = 0, failed = 0;
const covered = new Set();
function check(label, fn) {
  try { fn(); passed++; console.log('OK ' + label); }
  catch (error) { failed++; console.error('NG ' + label + '\n' + error.stack); }
}
function text(no, enhanced) { const row = rows.get(no); assert.ok(row, no); return row[enhanced ? '強化効果' : '効果'] || row['効果']; }
function pair(value) { const m = value.match(/\+(\d+)\/\+(\d+)/); assert.ok(m, value); return [Number(m[1]), Number(m[2])]; }
const repeats = value => sheet.effectRepetitions(value);
function card(no, enhanced) {
  const row = rows.get(no), definition = PANEL_POOL.find(c => c.no === no);
  const base = definition ? makePanel(definition.id) || copy(definition) : { no, name: row['名前'] || no, category: 'エンチャント', keywords: [], desc: row['効果'] };
  const result = enhanced && definition ? enhancedPanelCopy(base) || base : base;
  result.desc = text(no, enhanced);
  return result;
}
function plain(id, extra = {}) { return { id, name: id, atk: 5, hp: 100, maxHp: 100, color: '赤', keywords: [], desc: '', ...extra }; }
function unit(no, enhanced, extra = {}) {
  const c = card(no, enhanced);
  if (no.startsWith('E')) return plain('source', { _adjacentPanelEffectTexts: [c.desc], boardCards: [c], _mainBoardSlot: 1, ...extra });
  return { ..._makePanelSummonUnit(_panelSummonSpec(c), []), id: 'source', atk: 10, hp: 100, maxHp: 100, _mainBoardSlot: 1, ...extra };
}
function setup(side, own, options = {}) {
  const other = side === 'p1' ? 'p2' : 'p1', rng = createSeededRng(1025), events = [];
  const enemies = options.enemies || [plain('foe'), plain('foe2'), plain('foe3')];
  const { enemies: ignored, ...extra } = options;
  const state = createBattleState({ sides: { [side]: { units: own }, [other]: { units: enemies } }, summonDefs: PANEL_POOL, ...extra });
  const emit = e => events.push(e);
  const hit = (s, t, n, c, ss, st, o) => coreResolveHit(state, s, t, n, c, rng, emit, { skipSourceEffects: ss, skipTough: st, ...o });
  return { state, rng, events, emit, hit, side, other, u: state.units[side][0], own: state.units[side], foes: state.units[other] };
}
const stats = (h, reason) => h.events.filter(e => e.type === 'stat_change' && (!reason || e.reason === reason));
const damage = (h, source = 'source') => h.events.filter(e => e.type === 'damage' && e.sourceId === source && e.amount > 0);
function fire(h, trigger) {
  if (trigger === '死亡') { h.u.hp = 0; coreApplyDeathEffects(h.u, h.state, h.rng, h.emit, h.hit); }
  else if (trigger === '開戦') coreApplyOpeningEffects(h.u, h.state, h.rng, h.emit, h.hit);
  else if (trigger === '攻撃') coreApplyAttackEffects(h.u, h.state, h.rng, h.emit, h.hit);
  else if (trigger === '負傷') coreApplyInjuryEffects(h.u, 7, h.state, h.rng, h.emit, h.hit);
  else if (trigger === 'マナ') {
    h.state.resources[h.side].mana = Number(text(h.u.no, h.u._tripleMerged).match(/^(\d+)マナ/)[1]);
    coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit);
  }
}
function mana(h, amount) { h.state.resources[h.side].mana = amount; coreApplyManaThresholdEffects(h.state, h.rng, h.emit, h.hit); }
function summon(h, side = h.side) { return coreSummonUnit(h.state, side, { name: '青スケルトン', color: '青' }, h.emit, 'source', undefined, h.rng, h.hit); }

(async () => {
  console.table = () => {}; await loadGameData();
  for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) {
    const test = (no, description, fn) => check(`${no}/${side}/${enhanced ? '強化' : '通常'} ${description}`, () => { fn(text(no, enhanced)); covered.add(`${no}:${side}:${enhanced}`); });

    test('C001', '戦闘限定の負傷付与は同じ体へ重なり、各本文の回数で撃つ', value => {
      const h = setup(side, [unit('C001', enhanced)]), cost = Number(value.match(/^(\d+)マナ/)[1]);
      mana(h, cost * 2);
      const grants = h.events.filter(e => e.effect === 'trigger_grant');
      assert.equal(grants.length, 2); assert.equal(grants[1].grantedInjuryEffects.length, 2);
      h.events.length = 0; fire(h, '負傷');
      const hits = Number((value.match(/ダメージを(\d+)回/) || [])[1]) || 1;
      assert.equal(damage(h).length, 2 * hits); assert.ok(damage(h).every(e => e.amount === Number(value.match(/に(\d+)ダメージ/)[1]) && e.effectSource === false));
      const snapshot = coreUnitSnapshot(h.u); assert.deepEqual(snapshot.effectData.grantedInjuryEffects, grants[1].grantedInjuryEffects);
      const fresh = setup(side, [unit('C001', enhanced)]); fire(fresh, '負傷'); assert.equal(damage(fresh).length, 0);
    });
    test('C002', '赤の負傷だけを観測し、本人・負傷効果なしの味方も対象', value => {
      const h = setup(side, [unit('C002', enhanced), plain('ally'), plain('blue', { color: '青' })]);
      h.hit(h.foes[0], h.own[1], 1);
      assert.deepEqual(damage(h).map(e => e.amount), Array(repeats(value)).fill(Number(value.match(/(\d+)ダメージ/)[1])));
      h.events.length = 0; h.hit(h.foes[0], h.own[2], 1); assert.equal(damage(h).length, 0);
      h.events.length = 0; h.hit(h.foes[0], h.u, 1); assert.equal(damage(h).length, repeats(value));
    });
    test('C004', '味方死亡で敵味方へ同時ダメージ、死体は除外、敵死亡では発動しない', value => {
      const h = setup(side, [unit('C004', enhanced), plain('dead'), plain('ally')]);
      h.own[1].hp = 0; coreApplyDeathObservers(h.own[1], h.state, h.rng, h.emit, h.hit);
      const hits = Number((value.match(/ダメージを(\d+)回/) || [])[1]) || 1;
      assert.equal(damage(h).length, 5 * hits); assert.ok(damage(h).every(e => e.unitId !== 'dead' && e.amount === Number(value.match(/(\d+)ダメージ/)[1])));
      assert.equal(new Set(damage(h).map(e => e.batch)).size, hits);
      h.events.length = 0; h.foes[0].hp = 0; coreApplyDeathObservers(h.foes[0], h.state, h.rng, h.emit, h.hit); assert.equal(damage(h).length, 0);
    });
    test('C005', '半分切捨て／全量を均等分配、余りは別々、味方不在・結界・友軍ダメージ', value => {
      for (const amount of [1, 5, 13]) {
        const h = setup(side, [unit('C005', enhanced), plain('a'), plain('b'), plain('c')]);
        h.hit(h.foes[0], h.u, amount);
        const shared = value.includes('半分') ? Math.floor(amount / 2) : amount;
        assert.equal(h.u.hp, 100 - (amount - shared));
        const distributed = h.own.slice(1).map(x => 100 - x.hp);
        assert.equal(distributed.reduce((a, b) => a + b, 0), shared);
        assert.ok(distributed.every(n => n === Math.floor(shared / 3) || n === Math.ceil(shared / 3)));
        assert.equal(new Set(h.events.filter(e => e.type === 'damage').map(e => e.batch)).size, 1);
      }
      const alone = setup(side, [unit('C005', enhanced)]); alone.hit(alone.foes[0], alone.u, 13); assert.equal(alone.u.hp, 87);
      const shield = setup(side, [unit('C005', enhanced, { shield: 1 }), plain('ally')]); shield.hit(shield.foes[0], shield.u, 13); assert.equal(shield.own[1].hp, 100);
      const friendly = setup(side, [unit('C005', enhanced), plain('ally')]); friendly.hit(friendly.own[1], friendly.u, 13); assert.equal(friendly.u.hp, 87); assert.equal(friendly.own[1].hp, 100);
      const weak = setup(side, [unit('C005', enhanced, { weaken: 3 }), plain('a'), plain('b')]); weak.hit(weak.foes[0], weak.u, 7);
      assert.equal(weak.own.reduce((n, x) => n + 100 - x.hp, 0), 10, '本人の弱体は分配前に1回だけ加算');
      const fragile = setup(side, [unit('C005', enhanced), plain('fragile', { hp: 1 })]); const result = fragile.hit(fragile.foes[0], fragile.u, 5);
      assert.equal(fragile.own[1].hp, 0); assert.equal(result.died, false, '分配先の死亡を本人の死亡として返さない');
    });
    for (const no of ['C026', 'C051']) test(no, '全敵の毒の量', value => {
      const h = setup(side, [unit(no, enhanced)]); fire(h, no === 'C026' ? '死亡' : '負傷');
      assert.deepEqual(h.foes.map(x => x.poison), Array(3).fill(Number(value.match(/毒(\d+)/)[1])));
    });
    for (const no of ['C027', 'C058']) test(no, '全敵ダメージの量・回数・同時の束', value => {
      const h = setup(side, [unit(no, enhanced)]); fire(h, no === 'C027' ? '死亡' : '攻撃');
      const times = sheet.damageRepetitions(value), amount = Number(value.match(/(\d+)ダメージ/)[1]);
      assert.deepEqual(damage(h).map(e => e.amount), Array(3 * times).fill(amount)); assert.equal(new Set(damage(h).map(e => e.batch)).size, times);
    });
    test('C028', '色がちょうど本文の種類数の時だけ全味方へ毒牙', value => {
      const count = Number(value.match(/色が(\d+)種類/)[1]), amount = Number(value.match(/毒牙(\d+)/)[1]);
      for (const colors of [count - 1, count, count + 1]) {
        const h = setup(side, [unit('C028', enhanced, { color: '赤' }), ...['青', '緑', '黄'].slice(0, colors - 1).map((c, i) => plain('a' + i, { color: c }))]); fire(h, '開戦');
        assert.ok(h.own.every(x => coreKeywordSum(x, '毒牙') === (colors === count ? amount : 0)));
      }
    });
    test('C029', '別々の生きた味方へ復活、本人の復活にはしない', value => {
      const h = setup(side, [unit('C029', enhanced), plain('a'), plain('b'), plain('c')]);
      assert.equal(coreUnitHasKeyword(h.u, '復活'), false); fire(h, '死亡');
      const ev = h.events.filter(e => e.effect === 'keyword_gain');
      assert.equal(ev.length, Number((value.match(/味方(\d+)体/) || [])[1]) || 1); assert.equal(new Set(ev.map(e => e.unitId)).size, ev.length); assert.ok(ev.every(e => e.unitId !== 'source'));
    });
    test('C030', '血の必要量ちょうどで消費・全体強化、不足では何もしない', value => {
      const cost = Number(value.match(/血を(\d+)消費/)[1]), p = pair(value);
      for (const blood of [cost - 1, cost, cost + 2]) {
        const h = setup(side, [unit('C030', enhanced), plain('ally')], { blood: { [side]: blood } }); fire(h, '攻撃');
        assert.equal(h.state.blood[side], blood < cost ? blood : blood - cost);
        assert.deepEqual(stats(h).map(e => [e.atk, e.hp]), blood < cost ? [] : [p, p]);
      }
    });
    test('C052', '毎なしのマナ効果は1回、現存・後続・次戦闘の眷属へ衝撃を保存', value => {
      const h = setup(side, [unit('C052', enhanced), plain('existing', { keywords: ['眷属', '衝撃3'] })]);
      const cost = Number(value.match(/^(\d+)マナ/)[1]), amount = Number(value.match(/衝撃(\d+)/)[1]);
      mana(h, cost * 3); mana(h, cost * 4);
      assert.equal(h.events.filter(e => e.type === 'summon_buff').length, 1); assert.equal(h.state.gameSummonBuff[side].shock, amount);
      assert.equal(coreKeywordSum(h.own[1], '衝撃'), 3 + amount); assert.equal(coreKeywordSum(h.u, '衝撃'), 0);
      const child = summon(h); assert.equal(coreKeywordSum(child, '衝撃'), amount);
      const next = setup(side, [plain('summoner')], coreGameSummonBuffFields(h.state.gameSummonBuff)); assert.equal(coreKeywordSum(summon(next), '衝撃'), amount);
      const event = h.events.find(e => e.type === 'summon_buff'); assert.equal(coreSummonBuffEventValues(event).shock, amount);
    });
    test('C053', '毒持ちだけを選び毒の値で攻撃、繰り返すたびに再抽選', value => {
      const h = setup(side, [unit('C053', enhanced)], { enemies: [plain('clean'), plain('poison1', { poison: 7 }), plain('poison2', { poison: 11 })] });
      let selected = 0; h.rng.pick = list => list.length ? list[(selected++) % list.length] : null; fire(h, '攻撃');
      assert.equal(damage(h).length, repeats(value)); assert.ok(damage(h).every(e => e.unitId !== 'clean' && e.amount === (e.unitId === 'poison1' ? 7 : 11)));
      if (enhanced) assert.equal(new Set(damage(h).map(e => e.unitId)).size, 2);
    });
    test('C054', '色の数×本文の倍率だけ再抽選して開戦強化', value => {
      const h = setup(side, [unit('C054', enhanced, { color: '赤' }), plain('a', { color: '青' }), plain('b', { color: '緑' })]);
      let selected = 0; h.rng.pick = list => list[(selected++) % list.length]; fire(h, '開戦');
      const count = 3 * (Number((value.match(/色の数の(\d+)倍/) || [])[1]) || 1);
      assert.deepEqual(stats(h).map(e => [e.atk, e.hp]), Array(count).fill(pair(value))); assert.equal(new Set(stats(h).map(e => e.unitId)).size, 3);
    });
    test('C055', '2マナ毎の報酬HP強化を既存run_effectへ累積', value => {
      const h = setup(side, [unit('C055', enhanced)]), cost = Number(value.match(/^(\d+)マナ/)[1]), hp = Number(value.match(/HP\+(\d+)/)[1]);
      mana(h, cost * 3);
      assert.deepEqual(h.state.runEffects[side].rewardBuff, { atk: 0, hp: hp * 3 });
      const ev = h.events.filter(e => e.type === 'run_effect'); assert.equal(ev.length, 3); assert.ok(ev.every(e => e.kind === 'reward_buff' && e.trigger === 'マナ' && e.hp === hp));
      if (side === 'p1') {
        initState(); applyCoreRunEffectEvent(ev.at(-1)); const c = card('C006'), reward = applyRewardCharacterEffects([copy(c)], false)[0]; assert.equal(reward.life, c.life + hp * 3);
      }
    });
    for (const no of ['C076', 'C099']) test(no, '未所持の別々の味方へ本文の体数の結界', value => {
      const h = setup(side, [unit(no, enhanced), plain('a'), plain('b'), plain('c')]);
      if (no === 'C076') fire(h, '開戦'); else mana(h, Number(value.match(/^(\d+)マナ/)[1]));
      const ev = h.events.filter(e => e.effect === 'shield'); assert.equal(ev.length, Number((value.match(/味方(\d+)体/) || [])[1]) || 1);
      assert.equal(new Set(ev.map(e => e.unitId)).size, ev.length);
    });
    test('C077', '味方眷属の召喚ごとにHPを累積、既存・後続に同量、敵側には乗らない', value => {
      const h = setup(side, [unit('C077', enhanced)]), hp = Number(value.match(/HP\+(\d+)/)[1]);
      const first = summon(h), initial = first.maxHp; const second = summon(h);
      assert.equal(h.state.gameSummonBuff[side].hp, hp * 2); assert.equal(first.maxHp, initial + hp); assert.equal(second.maxHp, first.maxHp);
      summon(h, h.other); assert.equal(h.state.gameSummonBuff[side].hp, hp * 2);
    });
    test('C078', '同じ抽選対象に能力と結界を付与、反復は再抽選', value => {
      const h = setup(side, [unit('C078', enhanced), plain('a'), plain('b')]);
      let selected = 0; h.rng.pick = list => list[(selected++) % list.length]; fire(h, '死亡');
      const ev = stats(h); assert.deepEqual(ev.map(e => [e.atk, e.hp]), Array(repeats(value)).fill(pair(value)));
      assert.deepEqual(h.events.filter(e => e.effect === 'shield').map(e => e.unitId), ev.map(e => e.unitId));
    });
    for (const no of ['C010', 'C018', 'C031', 'C067', 'C079']) test(no, '色・対象数・能力・繰り返しの量', value => {
      const colors = value.match(/ランダムな([赤青緑黄紫])、([赤青緑黄紫])、([赤青緑黄紫])/);
      const own = [unit(no, enhanced, { color: '黒' }), ...['赤', '青', '緑', '黄', '紫'].flatMap(c => [plain(c + '1', { color: c }), plain(c + '2', { color: c })])];
      const h = setup(side, own);
      if (no === 'C018') fire(h, '負傷'); else if (no === 'C031') fire(h, '死亡'); else mana(h, Number(value.match(/^(\d+)マナ/)[1]));
      const ev = stats(h), per = colors ? 3 : Number(value.match(/味方(\d+)体/)[1]);
      assert.deepEqual(ev.map(e => [e.atk, e.hp]), Array(per * repeats(value)).fill(pair(value)));
      if (colors) assert.ok(ev.every(e => colors.slice(1).includes(h.own.find(x => x.id === e.unitId).color)));
      else for (let i = 0; i < repeats(value); i++) assert.equal(new Set(ev.slice(i * per, (i + 1) * per).map(e => e.unitId)).size, per);
    });
    test('C007', '負傷で敵全員に弱体、旧肩代わりも防戦もない', value => {
      const h = setup(side, [unit('C007', enhanced), plain('ally')]); fire(h, '負傷');
      assert.deepEqual(h.foes.map(x => x.weaken), Array(3).fill(Number(value.match(/弱体(\d+)/)[1]))); assert.equal(coreUnitHasKeyword(h.u, '防戦'), false);
      h.hit(h.foes[0], h.own[1], 9); assert.equal(h.own[1].hp, 91); assert.equal(h.u.hp, 100);
    });
    test('C017', '受けたダメージ量を使わず、赤の生存味方数×倍率で全味方ATK', value => {
      const h = setup(side, [unit('C017', enhanced, { color: '赤' }), plain('red'), plain('blue', { color: '青' })]); fire(h, '負傷');
      const amount = 2 * (Number((value.match(/数の(\d+)倍/) || [])[1]) || 1);
      assert.deepEqual(stats(h).map(e => [e.atk, e.hp]), Array(3).fill([amount, 0]));
    });
    for (const [no, trigger, reason] of [['C020', '負傷', 'ettin'], ['C092', '攻撃', 'ally_attack_permanent_buff'], ['C121', '解放', 'ally_release_permanent_buff']]) test(no, '効果の発動を観測して永久強化・boardSlot、効果なしでは発動しない', value => {
      const subject = plain('subject', { desc: `${trigger}：1マナを得る。` }), h = setup(side, [unit(no, enhanced), subject]);
      const fireSubject = () => trigger === '攻撃' ? coreApplyAttackEffects(h.own[1], h.state, h.rng, h.emit, h.hit)
        : trigger === '負傷' ? coreApplyInjuryEffects(h.own[1], 1, h.state, h.rng, h.emit, h.hit)
          : coreApplyReleaseEffects(h.own[1], [], h.state, h.rng, h.emit, h.hit);
      fireSubject(); const ev = stats(h, reason); assert.equal(ev.length, 1); assert.deepEqual([ev[0].atk, ev[0].hp], pair(value)); assert.equal(ev[0].persistent, true); assert.equal(ev[0].boardSlot, 1);
      h.own[1].desc = ''; h.events.length = 0; fireSubject(); assert.equal(stats(h, reason).length, 0);
      if (no === 'C092') { summon(h); assert.equal(h.events.filter(e => e.type === 'summon_buff').length, 0, '旧眷属強化は出ない'); }
      if (side === 'p1') { initState(); G.mainBoard[1] = card(no, enhanced); const before = [G.mainBoard[1].power, G.mainBoard[1].life]; assert.ok(persistBoardCharacterStats(_getPartyBoardUnit(), 1, ev[0].atk, ev[0].hp)); assert.deepEqual([G.mainBoard[1].power, G.mainBoard[1].life], before.map((n, i) => n + pair(value)[i])); }
    });
    test('C034', '全敵へ毒と弱体の両方', value => {
      const h = setup(side, [unit('C034', enhanced)]); fire(h, '死亡');
      assert.deepEqual(h.foes.map(x => [x.poison, x.weaken]), Array(3).fill([Number(value.match(/毒(\d+)/)[1]), Number(value.match(/弱体(\d+)/)[1])]));
    });
    test('C046', '生きた味方だけが本文のATKを得る', value => {
      const h = setup(side, [unit('C046', enhanced), plain('a'), plain('b')]); fire(h, '死亡');
      assert.deepEqual(stats(h).map(e => [e.unitId, e.atk, e.hp]), ['a', 'b'].map(id => [id, Number(value.match(/ATK\+(\d+)/)[1]), 0]));
    });
    test('C047', '敵味方の眷属召喚を観測して本文の永久強化', value => {
      const h = setup(side, [unit('C047', enhanced)]); summon(h); summon(h, h.other);
      const ev = stats(h, 'summon_observer_stats'); assert.deepEqual(ev.map(e => [e.atk, e.hp]), [pair(value), pair(value)]); assert.ok(ev.every(e => e.persistent && e.boardSlot === 1));
    });
    test('C070', '状態異常を得た1体ごとに全味方HPを加算', value => {
      const h = setup(side, [unit('C070', enhanced), plain('ally')]), amount = Number(value.match(/HP\+(\d+)/)[1]);
      coreEmitAilment(h.state, h.emit, { type: 'keyword_effect', effect: 'poison', side: h.other, unitId: 'foe', amount: 2 });
      assert.deepEqual(stats(h).map(e => [e.atk, e.hp]), [[0, amount], [0, amount]]);
    });
    test('C021', 'センチネル以外への現在HP付与を反復', value => {
      const h = setup(side, [unit('C021', enhanced, { hp: 17, maxHp: 30 }), plain('a'), plain('b')]); fire(h, '攻撃');
      assert.equal(stats(h, 'sentinel').length, repeats(value)); assert.ok(stats(h, 'sentinel').every(e => e.hp === 17 && e.atk === 0 && e.unitId !== 'source'));
    });
    test('C101', '効果のないキーワード専用エンチャントでも接続中なら不発', value => {
      const h = setup(side, [unit('C101', enhanced), plain('ally')]); fire(h, '負傷'); assert.deepEqual(stats(h).map(e => [e.atk, e.hp]), [pair(value), pair(value)]);
      const x = setup(side, [unit('C101', enhanced, { boardCards: [{ category: 'エンチャント', desc: '', keywords: ['貫通'] }] }), plain('ally')]); fire(x, '負傷'); assert.equal(stats(x).length, 0);
    });
    test('C102', '獲得の度に人数分を加算、0獲得と血消費は増やさない', value => {
      const h = setup(side, [unit('C102', enhanced), { ...unit('C102', enhanced), id: 'second' }]);
      const bonus = Number(value.match(/血は\+(\d+)/)[1]); coreGainBlood(h.state, side, 1, h.u, h.emit, h.rng, h.hit); coreGainBlood(h.state, side, 4, h.u, h.emit, h.rng, h.hit);
      assert.equal(h.state.blood[side], 5 + bonus * 4); const before = h.events.length; coreGainBlood(h.state, side, 0, h.u, h.emit, h.rng, h.hit); assert.equal(h.events.length, before);
      h.u._sealed = true; const blood = h.state.blood[side]; coreGainBlood(h.state, side, 1, h.own[1], h.emit, h.rng, h.hit); assert.equal(h.state.blood[side] - blood, 1 + bonus);
      const cost = Number(text('C030').match(/血を(\d+)消費/)[1]);
      const spend = setup(side, [unit('C030'), { ...unit('C102', enhanced), id: 'strigoi' }], { blood: { [side]: cost } }); fire(spend, '攻撃'); assert.equal(spend.state.blood[side], 0);
    });
    test('C103', '死んだ本人以外の全キャラクターへ弱体', value => {
      const h = setup(side, [unit('C103', enhanced), plain('ally')]); fire(h, '死亡'); assert.ok([...h.own.slice(1), ...h.foes].every(x => x.weaken === Number(value.match(/弱体(\d+)/)[1])));
    });
    test('C104', '紫の味方だけが本文のATKを得る', value => {
      const h = setup(side, [unit('C104', enhanced), plain('purple', { color: '紫' }), plain('red')], { enemies: [plain('enemy-purple', { color: '紫' })] }); fire(h, '攻撃');
      const amount = Number(value.match(/ATK\+(\d+)/)[1]); assert.deepEqual(stats(h).map(e => [e.unitId, e.atk, e.hp]), [['source', amount, 0], ['purple', amount, 0]]);
    });
    test('C105', '正の血の倍数で全敵ダメージ、直接死亡時に反復し再入を止める', value => {
      const divisor = Number(value.match(/血が(\d+)の倍数/)[1]), amount = Number(value.match(/(\d+)ダメージ/)[1]);
      const h = setup(side, [unit('C105', enhanced)], { blood: { [side]: divisor - 1 }, enemies: [plain('fragile', { hp: amount, maxHp: amount }), plain('tough')] });
      coreGainBlood(h.state, side, 1, h.u, h.emit, h.rng, h.hit); assert.deepEqual(damage(h).map(e => [e.unitId, e.amount]), [['fragile', amount], ['tough', amount], ['tough', amount]]);
      for (const [blood, gain] of [[0, 0], [0, 1], [1, 1], [divisor, 1], [2, 5]]) { const x = setup(side, [unit('C105', enhanced)], { blood: { [side]: blood } }); coreGainBlood(x.state, side, gain, x.u, x.emit, x.rng, x.hit); assert.equal(damage(x).length, 0); }
      const jump = setup(side, [unit('C105', enhanced)], { blood: { [side]: 2 } }); coreGainBlood(jump.state, side, divisor * 2 - 2, jump.u, jump.emit, jump.rng, jump.hit); assert.equal(damage(jump).length, 3, '一度の獲得は到達した倍数で1回だけ判定');
      const revive = setup(side, [unit('C105', enhanced)], { blood: { [side]: divisor - 1 }, enemies: [plain('reviver', { hp: amount, maxHp: amount, keywords: ['復活'] }), plain('tough')] }); coreGainBlood(revive.state, side, 1, revive.u, revive.emit, revive.rng, revive.hit); assert.ok(damage(revive).length >= 4, '復活しても死亡なら繰り返す');
    });
    test('E006', '2体は重複なし、強化は2波、付与元の固有ダメージ扱いにしない', value => {
      const h = setup(side, [unit('E006', enhanced)]); fire(h, '死亡'); const hits = damage(h); const count = Number(value.match(/敵(\d+)体/)[1]);
      assert.equal(hits.length, count * repeats(value)); assert.ok(hits.every(e => e.amount === Number(value.match(/(\d+)ダメージ/)[1]) && e.effectSource === false));
      for (let i = 0; i < repeats(value); i++) { const wave = hits.slice(i * count, (i + 1) * count); assert.equal(new Set(wave.map(e => e.unitId)).size, count); assert.equal(new Set(wave.map(e => e.batch)).size, 1); }
      const x = setup(side, [unit('E006', enhanced)], { enemies: [plain('only')] }); fire(x, '死亡'); assert.equal(damage(x).length, repeats(value));
    });
    test('E084', '死体のATK・最大HPを青の生存味方へ移す、半分はそれぞれ切捨て', value => {
      const h = setup(side, [unit('E084', enhanced, { atk: 9, hp: 0, maxHp: 13 }), plain('blue', { color: '青' }), plain('red')]); fire(h, '死亡'); const divisor = value.includes('半分') ? 2 : 1;
      assert.deepEqual(stats(h).map(e => [e.unitId, e.atk, e.hp]), [['blue', Math.floor(9 / divisor), Math.floor(13 / divisor)]]);
    });
    test('E085', '本文の血獲得にストリゴイの補正が1回乗る', value => {
      const h = setup(side, [unit('E085', enhanced), { ...unit('C102', false), id: 'strigoi' }]); fire(h, '攻撃');
      const amount = Number((value.match(/血を(\d+)/) || [])[1]) || 1, bonus = Number(text('C102', false).match(/血は\+(\d+)/)[1]); assert.equal(h.state.blood[side], amount + bonus); assert.equal(h.events.filter(e => e.type === 'blood_set').length, 1);
    });
    // 起動のコアの対象区域・量も通常／強化、両側から同じAPIへ渡す。
    test('C003', 'アイテム枠に限り破壊と本文のゴールド', value => {
      const source = card('C003', enhanced), target = { category: 'アイテム' }, rng = createSeededRng(2);
      assert.deepEqual(coreActivateBoardCard(source, target, PANEL_POOL, rng, { targetZone: 'item' }), { kind: 'destroy_item_gold', gold: Number(value.match(/(\d+)G/)[1]) });
      assert.equal(coreActivateBoardCard(source, target, PANEL_POOL, rng, { targetZone: 'reward' }), null);
    });
    // 2026-10-26：本文が「対象の魔導板のカードと、対象の報酬のカードを入れ替える。」に変わり、能力値は下がらない。
    test('C080', '2つの区域を選んで交換、能力値は変わらない', value => {
      const source = { ...card('C080', enhanced), power: 7, life: 11 }, target = card('C006'), rewardTarget = card('E001'), rng = createSeededRng(1);
      assert.match(value, /対象の魔導板のカードと、対象の報酬のカードを入れ替える/);
      assert.equal(coreActivateBoardCard(source, target, PANEL_POOL, rng, { targetZone: 'board' }), null);
      assert.deepEqual(coreActivateBoardCard(source, target, PANEL_POOL, rng, { targetZone: 'board', rewardTarget }), { kind: 'exchange_reward', atk: 0, hp: 0 });
    });
    test('C116', '強化後は報酬区域だけ、通常は魔導板も、吸収量は本文の倍率', value => {
      const source = card('C116', enhanced), target = { ...card('C006'), power: 7, life: 11 }, rng = createSeededRng(1), mul = Number((value.match(/の(\d+)倍/) || [])[1]) || 1;
      const expected = { kind: 'destroy', atk: 7 * mul, hp: 11 * mul };
      assert.deepEqual(coreActivateBoardCard(source, target, PANEL_POOL, rng, { targetZone: 'reward' }), expected);
      assert.deepEqual(coreActivateBoardCard(source, target, PANEL_POOL, rng, { targetZone: 'board' }), enhanced ? null : expected);
    });
  }

  check('全指定カードの通常／強化・p1／p2の網羅', () => { for (const no of required) for (const side of ['p1', 'p2']) for (const enhanced of [false, true]) assert.ok(covered.has(`${no}:${side}:${enhanced}`), `${no}/${side}/${enhanced}`); });

  check('アンタイオスの実編成：本文が空の貫通接続もPvE・送信payloadで同じ接続枚数', () => {
    for (const enhanced of [false, true]) {
      initState(); G.mainBoard.fill(null); G.mainBoard[1] = card('C101', enhanced); G.mainBoard[1].directions = ['left'];
      G.mainBoard[0] = card('E009'); G.mainBoard[0].directions = ['right'];
      assert.equal(String(G.mainBoard[0].desc || ''), '');
      const deployed = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.find(e => e.slotIdx === 1).unit;
      const payload = buildOnlineSelfFormation().units.find(u => u._mainBoardSlot === 1);
      assert.equal(coreConnectedEnhancementCount(deployed), 1); assert.equal(coreConnectedEnhancementCount(payload), 1);
      for (const input of [deployed, payload]) { const h = setup('p1', [input]); fire(h, '負傷'); assert.equal(stats(h, 'injury_unenchanted_team_buff').length, 0); }
    }
  });
  check('アラストル通常＋強化の付与は別々に累積し、逆上を持つ体でも全て発動する', () => {
    const rage = card('E032'), h = setup('p1', [unit('C001', false, { _adjacentPanelEffectTexts: [rage.desc], boardCards: [rage], _resonanceEffectNames: [rage.name] }), { ...unit('C001', true), id: 'enhanced' }]);
    h.rng.pick = list => list[0]; mana(h, 3); h.events.length = 0; fire(h, '負傷');
    assert.equal(damage(h).filter(e => e.reason === 'granted_injury_damage').length, 3); assert.equal(damage(h).filter(e => e.fxEffect === '逆上').length, 1);
  });
  check('永久強化の召喚コピーには魔導板の書き戻し先を作らない', () => {
    const h = setup('p1', [unit('C047')]); const copyUnit = coreSummonUnit(h.state, 'p1', { ...unit('C047'), name: 'デュラハン', id: 'copy' }, h.emit, 'source', undefined, h.rng, h.hit);
    assert.ok(copyUnit); h.events.length = 0; summon(h);
    const event = stats(h, 'summon_observer_stats').find(e => e.unitId === copyUnit.id); assert.ok(event); assert.equal(event.persistent, false);
  });
  check('死の体感などで生存中に死亡効果を発動した場合は、本文の味方・全キャラクターに本人も含める', () => {
    for (const no of ['C029', 'C046', 'C078', 'C103', 'E084']) for (const enhanced of [false, true]) {
      const h = setup('p1', [unit(no, enhanced, { color: '青' })]);
      coreApplyDeathEffects(h.u, h.state, h.rng, h.emit, h.hit);
      const ownEvents = h.events.filter(e => e.unitId === h.u.id);
      assert.ok(ownEvents.some(e => no === 'C029' ? e.keyword === '復活' : no === 'C103' ? e.effect === 'weaken' : e.type === 'stat_change'), no);
    }
  });

  check('マモン・チェンジリング・強化ヘルナイト：クリックの対象選択、1回性、保存、配置の印', () => {
    const old = { renderHandEditor, renderRewCards, updateHUD, _storeRewardStartSnapshot, _playActivationFx, _syncRewardProductionItems, _persistCurrentShopStock };
    try {
      renderHandEditor = renderRewCards = updateHUD = _storeRewardStartSnapshot = _playActivationFx = _syncRewardProductionItems = _persistCurrentShopStock = () => {};
      for (const enhanced of [false, true]) {
        initState(); SaveRun.begin(); Object.assign(G, { phase: 'reward', _wave: 1, _waveStage: 1, _waveLife: 3 }); G.mainBoard.fill(null); G.mainBoard[1] = card('C003', enhanced); G.spellSlots = [{ category: 'アイテム', name: 'test' }];
        const m = G.mainBoard[1], gold = G.gold; assert.equal(cardActivationClick(1), false); chargeBoardCardActivations(); cardActivationClick(1); assert.ok(handleCardActivationItemTarget(0)); assert.equal(G.spellSlots[0], null); assert.equal(G.gold - gold, Number(m.desc.match(/(\d+)G/)[1])); assert.equal(cardActivationCanUse(m), false);
        const saved = SaveRun.buildRunSave('reward'); SaveRun.restoreRunState(saved); assert.equal(G.mainBoard[1]._activationReady, undefined);
      }
      for (const enhanced of [false, true]) for (const self of [false, true]) {
        initState(); G.phase = 'reward'; G.mainBoard.fill(null); G.mainBoard[1] = card('C080', enhanced); G.mainBoard[3] = card('C006');
        const source = G.mainBoard[1], outgoing = G.mainBoard[self ? 1 : 3]; source.power = 9; source.life = 13; source._permBasePower = 9; source._permBaseLife = 13; source._placeKey = 'source-key'; outgoing._placeKey = self ? 'source-key' : 'out-key';
        _rewCards = [{ ...card('C008'), _placeKey: 'reward-key' }]; chargeBoardCardActivations(); cardActivationClick(1); assert.equal(cardActivationRewardTargetable(_rewCards[0]), false); handleCardActivationTarget(self ? 1 : 3); assert.equal(cardActivationRewardTargetable(_rewCards[0]), true); handleCardActivationRewardTarget(0);
        assert.equal(G.mainBoard[self ? 1 : 3]._placeKey, 'reward-key'); assert.equal(_rewCards[0]._placeKey, self ? 'source-key' : 'out-key');
        const holder = self ? _rewCards[0] : G.mainBoard[1]; assert.deepEqual([holder.power, holder.life], [9, 13]); assert.deepEqual([holder._permBasePower, holder._permBaseLife], [holder.power, holder.life]); assert.equal(holder._activationReady, undefined); assert.equal(_pendingCardActivation, null);
      }
      initState(); G.phase = 'reward'; G.mainBoard.fill(null); const knight = G.mainBoard[1] = card('C116', true); G.mainBoard[3] = card('C006'); _rewCards = [card('C006')]; chargeBoardCardActivations(); cardActivationClick(1); handleCardActivationTarget(3); assert.ok(G.mainBoard[3]); assert.ok(knight._activationReady); handleCardActivationRewardTarget(0); assert.equal(_rewCards.length, 0); assert.equal(knight._activationReady, undefined);
    } finally { Object.assign(globalThis, old); _pendingCardActivation = null; _rewCards = []; }
  });

  check('ラン眷属衝撃・報酬HP・永久強化は既存ラン保存で復元する', () => {
    initState(); SaveRun.begin(); Object.assign(G, { phase: 'reward', _wave: 1, _waveStage: 1, _waveLife: 3 }); G.gameSummonBuff = { atk: 2, hp: 3, shock: 4 }; G.runEffects = { rewardBuff: { atk: 0, hp: 5 } }; G.mainBoard[1] = card('C020'); G.mainBoard[1].power += 7;
    const saved = SaveRun.buildRunSave('reward'); G.gameSummonBuff = {}; G.runEffects = {}; SaveRun.restoreRunState(saved);
    assert.deepEqual(G.gameSummonBuff, { atk: 2, hp: 3, shock: 4 }); assert.deepEqual(G.runEffects.rewardBuff, { atk: 0, hp: 5 });
    assert.equal(G.mainBoard[1].power, saved.state.player.mainBoard[1].power);
    const payload = buildOnlineSelfFormation(); assert.equal(payload.gameSummonBuff.p1.shock, 4); assert.deepEqual(payload.runEffects.p1.rewardBuff, { atk: 0, hp: 5 });
  });
  check('眷属の衝撃：複数の付与・HP強化との併用・復活・JSONからの復元で二重加算しない', () => {
    const h = setup('p1', [unit('C052', false), { ...unit('C052', true), id: 'second' }, plain('child', { keywords: ['眷属', '衝撃3', '復活'] })]);
    const amount = Number(text('C052').match(/衝撃(\d+)/)[1]) + Number(text('C052', true).match(/衝撃(\d+)/)[1]);
    mana(h, 2); assert.equal(coreKeywordSum(h.own[2], '衝撃'), 3 + amount);
    h.own[2].hp = 0; coreTryRevive(h.own[2], h.state, h.emit, h.rng, h.hit); assert.equal(coreKeywordSum(h.own[2], '衝撃'), 3 + amount);
    coreAddSummonBuff(h.state, 'p1', 0, 2, h.emit, 'source', true, undefined, h.rng, h.hit);
    assert.equal(coreSummonBuffEventValues(h.events.filter(e => e.type === 'summon_buff').at(-1)).shock, amount);
    const restored = createCoreUnit(copy(coreUnitSnapshot(h.own[2])), 'p1', 0);
    h.state.units.p1[2] = restored; restored.hp = 0; delete restored._starterRegenUsed; restored.keywords.push('復活'); coreTryRevive(restored, h.state, h.emit, h.rng, h.hit);
    assert.equal(coreKeywordSum(restored, '衝撃'), 3 + amount);
  });
  check('ケール：消費で正の倍数になっても発動、根性は反復条件外、死亡召喚連鎖は20波で止まる', () => {
    const amount = Number(text('C105').match(/(\d+)ダメージ/)[1]), cost = Number(text('C030').match(/血を(\d+)/)[1]);
    const h = setup('p1', [unit('C030'), { ...unit('C105'), id: 'kael' }], { blood: { p1: cost + 3 } }); fire(h, '攻撃');
    assert.equal(damage(h, 'kael').length, 3);
    const guts = setup('p1', [unit('C105')], { blood: { p1: 2 }, enemies: [plain('guts', { hp: amount, maxHp: amount, keywords: ['根性'] })] });
    coreGainBlood(guts.state, 'p1', 1, guts.u, guts.emit, guts.rng, guts.hit); assert.equal(damage(guts).length, 1);
    const endless = setup('p1', [unit('C105')], { blood: { p1: 2 }, enemies: [plain('chain', { hp: 1, maxHp: 1, desc: '死亡：「連鎖」を召喚する。' })],
      summonDefs: [{ name: '連鎖', power: 1, life: 1, color: '青', desc: '死亡：「連鎖」を召喚する。' }] });
    // 敵召喚の80%基礎補正を避け、眷属の死亡を常に1ダメージで確定させる。
    endless.u.boon = { statMul: 1, modDelta: 0, dmgMul: 1, manaDelta: 0, famMul: 1 };
    coreGainBlood(endless.state, 'p1', 1, endless.u, endless.emit, endless.rng, endless.hit);
    assert.equal(new Set(damage(endless).map(e => e.batch)).size, 20); assert.equal(endless.state._bloodMultipleContext, undefined);
  });
  check('未改訂カードは作業開始時のコアと戦闘結果・イベント・次の乱数が完全一致', () => {
    const source = execFileSync('git', ['show', '62fe8751c3cefbe67c844ce70490a1ef52d0b8c4:prototype/js/battle/core.js'], { encoding: 'utf8', maxBuffer: 2e6 });
    const sandbox = { module: { exports: {} } }; vm.runInNewContext(source, sandbox); const baseline = sandbox.module.exports;
    const current = require('../../js/battle/core'); let compared = 0;
    for (const no of [...rows.keys()].filter(no => /^[CE]\d+$/.test(no) && !required.includes(no) && !revised1026.has(no) && PANEL_POOL.some(c => c.no === no))) for (const enhanced of [false, true]) {
      const input = { sides: { p1: { units: [unit(no, enhanced), plain('ally', { color: '青' })] }, p2: { units: [plain('foe'), plain('foe2')] } }, summonDefs: PANEL_POOL, resources: { p1: { mana: 8, gold: 800 } } };
      const run = api => { const state = api.createBattleState(copy(input)), events = [], rng = createSeededRng(251025); api.runBattleCore(state, rng, { turnLimit: 5, onEvent: e => events.push(e) }); return copy({ events, finalState: api.battleCoreFinalState(state), nextRandom: rng.next() }); };
      assert.deepEqual(run(current), run(baseline), `${no}/${enhanced}`); compared++;
    }
    assert.ok(compared > 200); console.log(`  未改訂 ${compared}本文が完全一致`);
  });
  check('全指定カードの実戦コア・オンライン計算・保存入力JSONの再計算が同じイベントと最終状態', () => {
    for (const no of required.filter(no => !['C003', 'C080', 'C116'].includes(no))) for (const enhanced of [false, true]) {
      const input = { seed: 1025, turnLimit: 8, resources: { p1: { mana: 8 }, p2: { mana: 0 } }, summonDefs: PANEL_POOL,
        sides: { p1: { units: [unit(no, enhanced), plain('red'), plain('blue', { color: '青' })] }, p2: { units: [plain('foe', { poison: 3 }), plain('foe2')] } } };
      const run = () => { const state = createBattleState(copy(input)), events = []; const result = runBattleCore(state, createSeededRng(input.seed), { turnLimit: 8, onEvent: e => events.push(e) }); return { events, finalState: battleCoreFinalState(state), outcome: result.outcome }; };
      const direct = run(), online = simulateOnlineBattle(copy(input)); assert.deepEqual(online.events, direct.events, no); assert.deepEqual(online.finalState, direct.finalState, no);
      assert.deepEqual(run(), direct, `${no} 同じ保存入力の再計算`);
    }
  });
  check('SaveRun.computeBattleの実際の保存フレームでも付与・衝撃・報酬HP・永久強化を保ち、圧縮復元と再計算が一致', () => {
    for (const enhanced of [false, true]) {
      const own = ['C001', 'C052', 'C055', 'C092', 'C104', 'C007'].map((no, i) => unit(no, enhanced, { id: no, _mainBoardSlot: i }));
      own.push(plain('familiar', { keywords: ['眷属'] }));
      const h = setup('p1', own, { resources: { p1: { mana: 8 } }, enemies: [plain('foe', { atk: 4, hp: 1000, maxHp: 1000, keywords: ['全体攻撃'] })] });
      const initial = copy(h.state), first = SaveRun.computeBattle(initial, 251025), second = SaveRun.computeBattle(copy(initial), 251025);
      assert.deepEqual(first, second); assert.deepEqual(SaveRun.unpackBattleEvents(copy(SaveRun.packBattleEvents(first))), first);
      assert.equal(first.events.filter(e => e.effect === 'trigger_grant').length, 2);
      assert.equal(first.finalState.gameSummonBuff.p1.shock, Number(text('C052', enhanced).match(/衝撃(\d+)/)[1]));
      assert.equal(first.finalState.runEffects.p1.rewardBuff.hp, 4 * Number(text('C055', enhanced).match(/HP\+(\d+)/)[1]));
      assert.ok(first.events.some(e => e.reason === 'ally_attack_permanent_buff' && e.persistent));
      assert.ok(first.frames.some(f => f.state.units.p1.some(u => (u.effectData.grantedInjuryEffects || []).length)));
    }
  });
  try {
    const h = setup('p1', [unit('C001'), plain('familiar', { keywords: ['眷属', '衝撃3'] })]), initial = copy(h.state.units);
    mana(h, 6); coreAddSummonShock(h.state, 'p1', 1, h.u, h.emit); coreAddSummonShock(h.state, 'p1', 2, h.u, h.emit);
    let grants = 0, keywords = 0;
    await playOnlineBattleEvents({ events: [{ type: 'battle_start', sides: initial }, ...copy(h.events)] }, { onEvent: (event, context) => {
      if (event.effect === 'trigger_grant') { assert.deepEqual(context.unitById(event.unitId).effectData.grantedInjuryEffects, event.grantedInjuryEffects); grants++; }
      if (event.reason === 'summon_keyword_buff') { assert.deepEqual(context.unitById(event.unitId).keywords, event.keywords); keywords++; }
    } });
    assert.equal(grants, 2); assert.equal(keywords, 2); passed++; console.log('OK 新しい付与・眷属衝撃をオンライン再生の盤面へ絶対値で反映');
  } catch (error) { failed++; console.error('NG 新しい出来事のオンライン再生\n' + error.stack); }
  console.log(`sheet_1025b_regression: ${passed}件成功・${failed}件失敗、カード本文 ${covered.size}/${required.length * 4}`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
