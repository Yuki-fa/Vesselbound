'use strict';

// 2026-10-26：魔導回路（E010）は強化でき、強化すると効果文（-2/-2）が消える。
// 精霊の魂（E041）は還魂した瞬間に、通常はライフを回復し、強化は最大ライフと今のライフを増やす。回収・「元に戻す」で戻る。
const assert = require('node:assert/strict');
require('./load');
let passed = 0, failed = 0;
function check(label, fn) {
  try { fn(); passed++; console.log('OK ' + label); }
  catch (error) { failed++; console.error('NG ' + label + '\n' + error.stack); }
}
const def = no => { const d = PANEL_POOL.find(p => p.no === no); assert.ok(d, no); return d; };
const noop = () => {};
const stubs = { renderHandEditor, renderFieldEditor, renderRewCards, renderMoveSlotsInEnemy, updateHUD, _playRewardAcquireSfx };

(async () => {
console.table = () => {}; const log = console.log; console.log = () => {}; await loadGameData(); console.log = log;
check('魔導回路：強化後の姿があり、強化すると本文と -2/-2 が消える', () => {
  const card = makePanel(def('E010').id);
  assert.match(card.desc, /-2\/-2/);
  assert.ok(panelHasEnhancementForm(card));
  const enhanced = enhancedPanelCopy(card);
  assert.ok(enhanced && enhanced._merged);
  assert.equal(String(enhanced.desc || ''), '');
  const unit = { id: 'u', side: 'p1', atk: 5, hp: 5, maxHp: 5, desc: '', keywords: [] };
  const withText = { ...unit, _adjacentPanelEffectTexts: [card.desc] }, cleared = { ...unit, _adjacentPanelEffectTexts: [String(enhanced.desc || '')] };
  assert.notEqual(coreUnitEffectText(withText), coreUnitEffectText(cleared));
  assert.doesNotMatch(coreUnitEffectText(cleared), /-2\/-2/);
});

function altar(life, max) {
  initState();
  Object.assign(G, { phase: 'reward', _ringOfferPhase: true, _ringOffer: [{ name: 'test' }], _ringOfferUnlocked: false, _ringOfferResolved: false,
    _boardDiscardCount: 0, _ringSacrificedCards: [], ascensionLifeBonus: Math.max(0, max - 3), _waveLife: life, life });
}
check('精霊の魂（通常）：還魂した瞬間にライフが1回復し、回収で戻る。満タンなら変わらない', () => {
  Object.assign(globalThis, { renderHandEditor: noop, renderFieldEditor: noop, renderRewCards: noop, renderMoveSlotsInEnemy: noop, updateHUD: noop, _playRewardAcquireSfx: noop });
  try {
    altar(2, 3); G.mainBoard[0] = makePanel(def('E041').id);
    assert.match(G.mainBoard[0].desc, /ライフが1回復する/);
    _discardBoardCardForRingOffer(0, G.mainBoard[0]);
    assert.equal(G._waveLife, 3); assert.equal(waveLifeMax(), 3);
    _reclaimSacrificedRingCards();
    assert.equal(G._waveLife, 2); assert.ok(G.mainBoard[0]);
    altar(3, 3); G.mainBoard[0] = makePanel(def('E041').id);
    _discardBoardCardForRingOffer(0, G.mainBoard[0]); assert.equal(G._waveLife, 3);
    _reclaimSacrificedRingCards(); assert.equal(G._waveLife, 3);
  } finally { Object.assign(globalThis, stubs); }
});
check('精霊の魂（強化）：還魂した瞬間に最大ライフと今のライフが2増え（6未満まで）、回収で戻る。指輪の確定で重ねない', () => {
  Object.assign(globalThis, { renderHandEditor: noop, renderFieldEditor: noop, renderRewCards: noop, renderMoveSlotsInEnemy: noop, updateHUD: noop, _playRewardAcquireSfx: noop });
  try {
    altar(2, 3); G.mainBoard[0] = enhancedPanelCopy(makePanel(def('E041').id));
    assert.match(G.mainBoard[0].desc, /最大ライフが2増える/);
    _discardBoardCardForRingOffer(0, G.mainBoard[0]);
    assert.equal(waveLifeMax(), 5); assert.equal(G._waveLife, 4);
    _reclaimSacrificedRingCards();
    assert.equal(waveLifeMax(), 3); assert.equal(G._waveLife, 2);
    altar(2, 3); G.mainBoard[0] = enhancedPanelCopy(makePanel(def('E041').id));
    _discardBoardCardForRingOffer(0, G.mainBoard[0]);
    applyAscensionCardEffects(G._ringSacrificedCards);
    assert.equal(waveLifeMax(), 5); assert.equal(G._waveLife, 4);
  } finally { Object.assign(globalThis, stubs); }
});
console.log(`魔導回路・精霊の魂1026：${passed}件成功・${failed}件失敗`);
process.exitCode = failed ? 1 : 0;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
