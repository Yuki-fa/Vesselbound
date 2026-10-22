'use strict';

// 2026-10-20 利用者報告：レプラコーン（終戦：全ての味方は永久に+1/+1）が、セーブ有効の通常プレイで
// 演出は出るのに魔導板のカードへ反映されなかった。保存済み戦闘の終戦（SaveRun.applyEnd）は再生を通らないため、
// そこで「永久に+X/+Y」をカードへ書き込む。ブラウザは使わない。
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
const card = name => makePanel(PANEL_POOL.find(p => p.name === name).id);

(async () => {
  await loadGameData(); SaveRun.ready();
  for (const [label, plus, gain] of [['通常', false, 2], ['強化', true, 4]]) {
    await check(`保存済み戦闘の終戦で、レプラコーン（${label}）の永久+${gain}/+${gain}が魔導板のカードへ書き込まれる`, async () => {
      initState(); G._runId = 'leprechaun-1020'; G._runSeed = 31; G._runRngState = 31;
      G._wave = 1; G._waveStage = 2; G._waveLife = 3; G.phase = 'reward'; _rewCards = []; _rewFreePickDone = false;
      G.mainBoard.fill(null);
      const lep = plus ? enhancedPanelCopy(card('レプラコーン')) : card('レプラコーン');
      const other = card('ブラウニー');
      G.mainBoard[1] = lep; G.mainBoard[3] = other; G._partyBoardUnit = null;
      const before = [G.mainBoard[1], G.mainBoard[3]].map(c => [Number(c.power), Number(c.life)]);
      const units = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered.map(entry => {
        entry.unit.boardCards = _panelSummonDisplayBoardCards(entry.panel, entry.contributingPanels);
        return entry.unit;
      });
      units.forEach(u => { u.atk = 50; u.hp = u.maxHp = 1000; });
      const state = createBattleState({ sides: { p1: { units }, p2: { units: [{ id: 'weak', name: '弱い敵', atk: 1, hp: 1, maxHp: 1, keywords: [], desc: '' }] } } });
      G.allies = state.units.p1; G.enemies = state.units.p2;
      const live = _createPveCoreState(); _stampCoreSideSlots(live);
      const initial = SaveRun.copy(Object.fromEntries(['units', 'summonDefs', 'itemDefs', 'rings', 'items', 'resources', 'life', 'maxLife', 'blood', 'mapIndex', 'maxUnits', 'frontSlots'].map(key => [key, live[key]])));
      const pending = SaveRun.computeBattle(initial, 9);
      assert.equal(pending.outcome, 'p1');
      const endEvents = pending.events.slice(pending.frames.at(-1).from, pending.frames.at(-1).to);
      assert.ok(endEvents.some(e => e.type === 'stat_change' && e.persistent && e.side === 'p1'), '終戦の永久バフが事前計算に含まれる');
      SaveRun.installSetup(copy(pending)); G._battleCoreEvents = []; G._battleRunId = 21;
      const finish = finishBattleAsVictory;
      try {
        finishBattleAsVictory = async () => { SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } }); };
        await SaveRun.replay(copy(pending), 21);
      } finally { finishBattleAsVictory = finish; }
      const after = [G.mainBoard[1], G.mainBoard[3]].map(c => [Number(c.power), Number(c.life)]);
      assert.deepEqual(after, before.map(([a, h]) => [a + gain, h + gain]), JSON.stringify({ before, after }));
      // 二度呼んでも重ねない（applied）。
      SaveRun.applyEnd({ units: { p1: G.allies, p2: G.enemies } });
      assert.deepEqual([G.mainBoard[1], G.mainBoard[3]].map(c => [Number(c.power), Number(c.life)]), after);
    });
  }
  console.log(`レプラコーン保存1020：${checked}項目 OK`);
})().catch(error => { console.error(error); process.exitCode = 1; });
