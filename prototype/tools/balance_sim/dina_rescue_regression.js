'use strict';

// 人命救助（Q009、2026-10-11）と預言者"ディナ"の毒：魔導板からの開始の毒・戦闘後の永続化・説明表示・クエスト設定。
// ブラウザは使わない。
const assert = require('node:assert/strict');
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
const dinaDef = () => PANEL_POOL.find(c => String(c.no).toUpperCase() === 'BC004');
function boardWithDina(extra = {}) {
  initState(); G._runId = 'dina-rescue'; G._runSeed = 5; G._runRngState = 5;
  G.mainBoard.fill(null);
  const card = Object.assign(makePanel(dinaDef().id), extra);
  card.directions = [];
  const slot = formationDeploySlots({ boardCards: G.mainBoard.map((c, i) => i === 0 ? card : c) })[0];
  const idx = slot ? slot.idx : 0;
  G.mainBoard[idx] = card;
  G._partyBoardUnit = null;
  const units = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(entry => entry.unit);
  return { card, idx, unit: units.find(u => /ディナ/.test(u.name)) };
}

(async () => {
  await loadGameData();
  await check('シート：ディナは実装・隠密と帰滅・（状態異常：毒N）と2つの常時効果', () => {
    const def = dinaDef();
    assert.equal(def._implemented, true);
    assert.deepEqual(def.keywords, ['隠密', '帰滅']);
    assert.match(def.desc, /（状態異常：毒\d+）/);
    assert.match(def.desc, /このキャラクターの毒は永続化する/);
    assert.match(def.desc, /攻撃する代わりに自身の毒を2倍にする/);
  });
  await check('魔導板から出撃すると（状態異常：毒N）の毒で始まり、永続化した毒があればそちらを使う', () => {
    const sheetPoison = Number(dinaDef().desc.match(/（状態異常：毒(\d+)）/)[1]);
    assert.equal(boardWithDina().unit.poison, sheetPoison);
    assert.equal(boardWithDina({ _persistentPoison: 20 }).unit.poison, 20);
    assert.equal(boardWithDina({ _persistentPoison: 0 }).unit.poison || 0, 0, '0も永続化した値として使う');
  });
  await check('戦闘で生き残ると、その時の毒をカードへ書き戻し、説明の（状態異常：毒N）も今の値になる', () => {
    const { card, idx, unit } = boardWithDina();
    unit.id = 'dina-live'; unit._mainBoardSlot = idx;
    const start = coreUnitSnapshot({ ...unit });
    G._battleCoreEvents = [{ type: 'battle_start', sides: { p1: [start], p2: [] } }];
    G._kiemetsuAppliedEvents = null;
    G.allies = [Object.assign(unit, { poison: 32, hp: Math.max(1, unit.hp - 12) })];
    _removeAbsentKiemetsuCards();
    assert.equal(G.mainBoard[idx], card, '生き残ったのでカードは残る');
    assert.equal(card._persistentPoison, 32);
    assert.match(_rawSubstitutedDesc(card), /（状態異常：毒32）/);
    G._partyBoardUnit = null;
    const next = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(e => e.unit).find(u => /ディナ/.test(u.name));
    assert.equal(next.poison, 32, '次の戦闘はその毒から');
  });
  await check('人命救助：必須カードはディナ（BC004）・塔で完了・「_2」の台詞3で概要の300Gを得る', () => {
    const cfg = QUEST_CONFIG.Q009;
    assert.equal(cfg.requiredCardNo, 'BC004');
    assert.equal(cfg.completeAt, 'tower');
    const data = QUEST_DATA.Q009_2;
    assert.equal(Number(data.rewardGold), 300);
    const dialogue = _qTowerArrivalDialogue({ questId: 'Q009' }, data);
    assert.equal(dialogue.rewardLine, 2, '台詞3（0始まりで2）');
    assert.equal(dialogue.reward, 300);
    const q1 = QUEST_DATA.Q009_1;
    assert.ok(Array.isArray(q1.specialA1) ? q1.specialA1.length : (q1.specialA || []).length, '特殊台詞A（バフを与えてから拒否）がある');
  });
  await check('人命救助の特殊拒否：特殊台詞A2で25〜65G（シートの特殊台詞はA1から順に全部出す）', () => {
    const cfg = QUEST_CONFIG.Q009.specialRejectGold;
    assert.deepEqual({ line: cfg.line, min: cfg.min, max: cfg.max }, { line: 2, min: 25, max: 65 });
    const q1 = QUEST_DATA.Q009_1;
    const all = _qSpecialLines(q1, 'A');
    const expected = [1, 2, 3, 4, 5, 6, 7, 8].reduce((n, k) => n + ((q1[`specialA${k}`] || []).length), 0);
    assert.equal(all.length, expected);
    assert.ok((q1.specialA2 || []).length, '特殊台詞A2がある');
  });
  await check('護衛依頼を特殊拒否すると、ヴォルザークの鍛冶屋は2割引（他の街・他の状態では割り引かない）', () => {
    initState();
    const volzag = [1, 2, 3, 4, 5].find(w => /ヴォルザーク/.test((regionInfoForWave(w) || {}).townName || ''));
    assert.ok(volzag, 'ヴォルザークの街がある');
    G.questProgress = { 1: { questId: 'Q003', status: 'rejectedSpecial', wave: 1 } };
    G._wave = volzag;
    assert.deepEqual(questForgeFavor(), { discount: 0.2 });
    assert.equal(mapForgePrice({ price: 400 }), 320);
    G._wave = volzag - 1;
    assert.equal(questForgeFavor(), null);
    assert.equal(mapForgePrice({ price: 400 }), 400);
    G._wave = volzag; G.questProgress[1].status = 'rejected';
    assert.equal(questForgeFavor(), null);
    const talk = villageTalkEntry('「鍛冶屋」入店時');
    assert.ok(talk && talk['特殊台詞A1'], 'ヴォルザークの鍛冶屋に特殊台詞A1がある');
    assert.ok(!talk['特殊台詞B1'], '命の鎖（B1まで揃った鍛冶屋）とは別');
  });
  console.log(`人命救助・ディナの毒の回帰: ${checked}件OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
