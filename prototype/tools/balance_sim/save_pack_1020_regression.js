'use strict';

// 2026-10-20 利用者報告：マナ効果が何百回も重なる盤面で戦闘の保存が数百万文字になり、最終戦で「セーブに失敗しました」。保存の時だけ同じイベントの連続をまとめ、読む時に元へ戻す。
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
renderAll = renderField = renderControls = updateHUD = showScreen = () => {};
playSfx = playFileSfx = _warmBattleHitSfx = () => {};
playBattleOpeningSequence = async () => {};
_playBattleStartIntro = async () => 'normal';
const copy = value => JSON.parse(JSON.stringify(value));
let checked = 0;
async function check(name, fn) { await fn(); checked++; console.log('OK ' + name); }
(async () => {
  await loadGameData(); SaveRun.ready();
  // 活性化（1マナ毎：+1/+1）×マナの種で、同じ体への+1/+1が連続する盤面を本物のコアで計算する。
  const unit = { id: 'act', name: 'ゴーレム', atk: 1, hp: 50, maxHp: 50, keywords: [], manaCost: 1, manaRepeat: true,
    manaThresholdDesc: 'このキャラクターは+1/+1を得る。', desc: '常時：このキャラクターのマナ効果は2回追加で発動する。' };
  const setup = { units: { p1: [unit], p2: [{ id: 'foe', name: '敵', atk: 1, hp: 5, maxHp: 5, keywords: [] }] },
    resources: { p1: { mana: 40, gold: 0 }, p2: { mana: 0, gold: 0 } }, rings: { p1: [JSON.parse(JSON.stringify(RING_POOL.find(r => r.name === '賢者の指輪')))], p2: [] }, items: { p1: [], p2: [] } };
  const pending = SaveRun.computeBattle(JSON.parse(JSON.stringify(setup)), 5);
  const packed = SaveRun.packBattleEvents(pending);
  await check('まとめた形は小さく、戻すと元のイベント列・手番の区切りと完全に一致する', () => {
    assert.ok(pending.events.some((e, i) => i && JSON.stringify(e) === JSON.stringify(pending.events[i - 1])), '連続する同じイベントがある盤面');
    assert.ok(packed.events.length < pending.events.length, `${pending.events.length}→${packed.events.length}`);
    assert.equal(JSON.stringify(SaveRun.unpackBattleEvents(JSON.parse(JSON.stringify(packed)))), JSON.stringify(pending));
    assert.equal(SaveRun.packBattleEvents(packed), packed, '二重にまとめない');
  });
  await check('保存はまとめた形で書き、読むと元の形で返る（validate も通る）', () => {
    initState(); G._runId = 'pack-1020'; G._runSeed = 7; G._runRngState = 7; G._wave = 1; G._waveStage = 2; G._waveLife = 3; G.phase = 'battle';
    const save = SaveRun.buildRunSave('battle', pending);
    SaveRun.saveRun(save);
    const raw = JSON.parse(localStorage.getItem('vesselbound.run.current'));
    assert.equal(raw.pendingBattle.eventsPacked, 1);
    assert.ok(raw.pendingBattle.events.length < pending.events.length);
    const loaded = SaveRun.loadRun();
    assert.ok(loaded, '読める');
    assert.equal(loaded.pendingBattle.eventsPacked, undefined);
    assert.equal(JSON.stringify(loaded.pendingBattle.events), JSON.stringify(pending.events));
    assert.deepEqual(loaded.pendingBattle.frames, pending.frames);
  });
  await check('まとめていない古い保存もそのまま読める', () => {
    const save = SaveRun.buildRunSave('battle', pending);
    localStorage.setItem('vesselbound.run.current', JSON.stringify(save));
    const loaded = SaveRun.loadRun();
    assert.ok(loaded); assert.equal(loaded.pendingBattle.events.length, pending.events.length);
  });
  console.log(`戦闘保存の圧縮1020：${checked}項目 OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
