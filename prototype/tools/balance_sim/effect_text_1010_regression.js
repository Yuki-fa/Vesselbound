'use strict';

// 2026-10-10 のシート変更（効果文）がコアで本文どおりに動くかを確かめる。ブラウザは使わない。
// 邪眼・結界・狂気（強化）／ミノタウロス・エルフ（キャラクター）／ラン・ドーター・ヴィーザル・リムスルス（敵）。
const assert = require('node:assert/strict');
const { sheetRows, effectText, effectRepetitions } = require('./sheet_data');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
global.requestAnimationFrame = () => 0;
global.setInterval = () => 0;
let now = 0;
global.performance = { now: () => now += 1000 };
console.table = () => {};
for (const match of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, match[1]), 'utf8'), { filename: match[1] });
}
let checked = 0;
async function check(name, fn) { await fn(); checked++; console.log('OK ' + name); }
const card = name => PANEL_POOL.find(c => c.name === name);
const enemy = name => ENEMY_POOL.find(e => String(e.name).includes(name));
const plain = (id, extra = {}) => ({ id, name: id, atk: 5, hp: 50, maxHp: 50, lane: 'front', keywords: [], desc: '', ...extra });
function harness(p1, p2, seed = 7) {
  const state = createBattleState({ sides: { p1: { units: p1 }, p2: { units: p2 } } });
  const rng = createSeededRng(seed), events = [], emit = event => events.push(event);
  const hit = (source, target, amount, counter, skipSourceEffects, skipTough, options) =>
    coreResolveHit(state, source, target, amount, counter, rng, emit, { skipSourceEffects, skipTough, ...options });
  return { state, rng, events, emit, hit, p1: state.units.p1.filter(Boolean), p2: state.units.p2.filter(Boolean) };
}
const statChanges = (events, reason) => events.filter(e => e.type === 'stat_change' && e.reason === reason);

(async () => {
  await loadGameData();
  await check('シートの本文：邪眼・結界・狂気（通常／合体）、エルフ、ミノタウロス、敵3体', () => {
    for(const no of ['E018','E021','E009','C014']) assert.equal(PANEL_POOL.find(c=>c.no===no).desc,effectText(no));
    assert.deepEqual(card('エルフ').keywords, sheetRows('card').find(r=>r['No.']==='C082')['キーワード'].split(/[\s　]+/));
    assert.match(card('ミノタウロス').desc, /効果ダメージを受けた場合、ランダムな敵に攻撃する/);
    assert.match(enemy('ラン・ドーター').desc, /「黒ケルピー」を1体召喚する/);
    assert.match(enemy('ヴィーザル').desc, /全ての味方は\+12\/\+12を得る/);
    assert.match(enemy('リムスルス').desc, /このキャラクターにダメージを与えた敵に8ダメージを与える/);
    assert.ok(!(enemy('リムスルス').keywords || []).includes('呪詛'), 'リムスルスは呪詛を持たない');
  });
  await check('強化「死者の守護」（旧「結界」）は効果文の強化で、接続先へ結界1のキーワードを付けない', () => {
    assert.deepEqual(card('死者の守護').adjacentKeywords.filter(k => /^結界/.test(k)), []);
  });
  for (const enhanced of [false,true]) {
    const text=effectText('E018',enhanced),label=enhanced?'強化':'通常',per=Number((text.match(/敵(\d+)体/)||[])[1])||1;
    const repeat=effectRepetitions(text),count=per*repeat,amount=Number(text.match(/ATK-(\d+)/)[1]);
    await check(`邪眼（${label}）：ランダムな敵${per}体へATK-${amount}を${repeat}回（同時対象は別々）`, () => {
      const h = harness([plain('eye', { desc: text })], [plain('e0'), plain('e1'), plain('e2')]);
      coreApplyInjuryEffects(h.p1[0], 1, h.state, h.rng, h.emit, h.hit, h.p2[0], undefined, 'combat');
      const changes = statChanges(h.events, 'injury_random_enemy_atk_down');
      assert.equal(changes.length, count);
      for(let i=0;i<repeat;i++) assert.equal(new Set(changes.slice(i*per,(i+1)*per).map(e=>e.unitId)).size,per,'1回の同時対象は別々');
      assert.ok(changes.every(e => e.atk === -amount && e.side === 'p2'));
    });
  }
  for (const enhanced of [false,true]) {
    const text=effectText('E021',enhanced),label=enhanced?'強化':'通常',per=Number((text.match(/味方(\d+)体/)||[])[1])||1;
    const repeat=effectRepetitions(text),count=per*repeat,amount=Number((text.match(/結界(\d*)/)||['',1])[1]||1);
    await check(`結界（${label}）：自分以外の味方${per}体へ結界${amount}を${repeat}回（同時対象は別々）`, () => {
      const h = harness([plain('ward', { desc: text }), plain('a1'), plain('a2'), plain('a3')], [plain('e0')]);
      h.p1[0].hp = 0;
      coreApplyDeathEffects(h.p1[0], h.state, h.rng, h.emit, h.hit);
      const got = h.events.filter(e => e.type === 'keyword_effect' && e.effect === 'shield');
      assert.equal(got.length, count);
      for(let i=0;i<repeat;i++) assert.equal(new Set(got.slice(i*per,(i+1)*per).map(e=>e.unitId)).size,per);
      assert.ok(got.every(e => e.unitId !== 'ward' && e.side === 'p1'));
      assert.equal(h.p1.reduce((sum,u)=>sum+(u.shield||0),0),count*amount);
    });
  }
  for (const enhanced of [false,true]) {
    const text=effectText('C046',enhanced),label=enhanced?'強化':'通常',amount=Number(text.match(/ATK\+(\d+)/)[1]),repeat=effectRepetitions(text);
    await check(`狂気（${label}）：本文の対象へATK+${amount}を${repeat}回`, () => {
      const h = harness([plain('mad', { desc: text }), plain('a1')], [plain('e0'), plain('e1')]);
      h.p1[0].hp = 0;
      coreApplyDeathEffects(h.p1[0], h.state, h.rng, h.emit, h.hit);
      assert.deepEqual(statChanges(h.events, 'death_all_atk').map(e => [e.unitId, e.atk]).sort(),
        Array.from({length:repeat},()=>/全ての味方/.test(text)?[['a1',amount]]:[['a1',amount],['e0',amount],['e1',amount]]).flat().sort());
      if(/全ての味方/.test(text)) assert.ok(h.p2.every(u=>u.atk===5),'敵には加算しない');
    });
  }
  for (const enhanced of [false,true]) {
    const text=effectText('C014',enhanced),label=enhanced?'強化':'通常',times=effectRepetitions(text);
    await check(`ミノタウロス（${label}）：効果ダメージで結界1を得てから攻撃、を${times}回`, () => {
      const h = harness([plain('ミノタウロス', { desc: text, atk: 1, hp: 500, maxHp: 500 })], [plain('e0', { atk: 0, hp: 500, maxHp: 500 })]);
      coreApplyInjuryEffects(h.p1[0], 1, h.state, h.rng, h.emit, h.hit, h.p2[0], undefined, 'effect');
      const order = h.events.filter(e => (e.type === 'keyword_effect' && e.effect === 'shield') || e.type === 'attack').map(e => e.type);
      // 結界は重ならない（2026-10-21 利用者指定）：反撃0で結界が残る2回目以降は獲得を出さない。
      assert.deepEqual(order, Array(times).fill('attack'));
      const h2 = harness([plain('ミノタウロス', { desc: text })], [plain('e0')]);
      coreApplyInjuryEffects(h2.p1[0], 1, h2.state, h2.rng, h2.emit, h2.hit, h2.p2[0], undefined, 'combat');
      assert.ok(!h2.events.some(e => e.type === 'attack'), '戦闘ダメージでは発動しない');
    });
  }
  await check('エルフ：キーワード（先制・結界1）だけになり、負傷で結界を得ない', () => {
    const h = harness([plain('エルフ', { keywords: ['先制', '結界1'] })], [plain('e0')]);
    coreApplyInjuryEffects(h.p1[0], 1, h.state, h.rng, h.emit, h.hit, h.p2[0], undefined, 'combat');
    assert.ok(!h.events.some(e => e.type === 'keyword_effect' && e.effect === 'shield'));
  });
  await check('ラン・ドーター：負傷で「黒ケルピー」を1体だけ召喚', () => {
    const def = enemy('ラン・ドーター');
    const h = harness([plain('a0')], [plain(def.name, { name: def.name, desc: def.desc })]);
    coreApplyInjuryEffects(h.p2[0], 1, h.state, h.rng, h.emit, h.hit, h.p1[0], undefined, 'combat');
    assert.equal(h.events.filter(e => e.type === 'summon').length, 1);
  });
  await check('ヴィーザル：開戦で全ての味方が+12/+12（本文の値）', () => {
    const def = enemy('ヴィーザル');
    const h = harness([plain('a0')], [plain(def.name, { name: def.name, desc: def.desc }), plain('e1')]);
    createBattleRunner(h.state, h.rng, h.emit);
    const buffs = h.events.filter(e => e.type === 'stat_change' && e.side === 'p2' && /team_buff|green_hermit/.test(e.reason));
    assert.equal(buffs.length, 2);
    assert.ok(buffs.every(e => e.atk === 12 && e.hp === 12));
  });
  await check('リムスルス：ダメージを与えた敵に8ダメージ（呪詛の即死はしない）', () => {
    const def = enemy('リムスルス');
    const h = harness([plain('attacker', { hp: 100, maxHp: 100 })], [plain(def.name, { name: def.name, desc: def.desc, hp: 100, maxHp: 100 })]);
    h.hit(h.p1[0], h.p2[0], 3);
    const back = h.events.filter(e => e.type === 'damage' && e.unitId === 'attacker' && e.side === 'p1');
    assert.deepEqual(back.map(e => e.amount), [8]);
    assert.equal(h.p1[0].hp, 92);
  });
  await check('毒（手番開始時にHP-X）：防戦の体も毒があれば手番が回り、毒を受けて攻撃しない', () => {
    const h = harness([plain('guard', { keywords: ['防戦'], poison: 3, hp: 10, maxHp: 10, atk: 9 }), plain('hitter', { atk: 1, hp: 500, maxHp: 500 })],
      [plain('e0', { atk: 1, hp: 500, maxHp: 500 })]);
    const runner = createBattleRunner(h.state, h.rng, h.emit);
    for (let i = 0; i < 12 && !runner.result; i++) runner.step();
    const ticks = h.events.filter(e => e.type === 'keyword_effect' && e.effect === 'poison_tick' && e.unitId === 'guard');
    assert.ok(ticks.length >= 1, '防戦でも毒を受ける');
    assert.ok(!h.events.some(e => e.type === 'attack' && e.attackerId === 'guard'), '防戦は攻撃しない');
  });
  await check('ディナ：（状態異常：毒N）で開始、手番は毒を受けてから毒を2倍にし攻撃しない', () => {
    const dina = PANEL_POOL.find(c => /ディナ/.test(c.name));
    const unit = plain('dina', { name: dina.name, desc: dina.desc, keywords: dina.keywords.slice(), atk: dina.power, hp: dina.life, maxHp: dina.life });
    assert.equal(coreStartingPoison(unit), Number((dina.desc.match(/（状態異常：毒(\d+)）/) || [])[1]));
    assert.ok(corePoisonPersists(unit));
    assert.equal(corePoisonMultiplierInsteadOfAttack(unit), 2);
    unit.poison = 4;
    const h = harness([unit, plain('guard2', { atk: 1, hp: 500, maxHp: 500 })], [plain('e0', { atk: 1, hp: 500, maxHp: 500 })]);
    const runner = createBattleRunner(h.state, h.rng, h.emit);
    for (let i = 0; i < 12 && !runner.result; i++) runner.step();
    const ticks = h.events.filter(e => e.type === 'keyword_effect' && e.effect === 'poison_tick' && e.unitId === 'dina').map(e => e.amount);
    const doubles = h.events.filter(e => e.type === 'keyword_effect' && e.effect === 'poison' && e.unitId === 'dina' && e.reason === 'poison_multiply').map(e => e.amount);
    assert.deepEqual(ticks.slice(0, 2), [4, 8], '手番の始めに毒を受け、その後で2倍');
    assert.deepEqual(doubles.slice(0, 2), [4, 8]);
    assert.ok(!h.events.some(e => e.type === 'attack' && e.attackerId === 'dina'), '攻撃しない');
  });
  console.log(`2026-10-10 効果文の回帰: ${checked}件OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
