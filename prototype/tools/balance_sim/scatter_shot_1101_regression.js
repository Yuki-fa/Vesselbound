'use strict';
// 2026-11-01 利用者指定：乱れ撃ち（E047）のキャラクター用説明文は、他の効果に対象の敵（ランダムな敵）を含む時だけ出す。
// 説明文中の対象の敵の数は増やす（数が無ければ「敵」の後ろに「N体」を足す）。援護射撃（E067）は説明文を変えないが、
// 他のキャラクターとも繋がっている時だけ「対象の敵を含む効果」とみなす。
const assert = require('node:assert/strict');
let failed = 0;
const check = async (name, fn) => { try { await fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); } };
(async () => {
  const { card, initRun } = require('./rules_1026_harness');
  console.table = () => {}; await loadGameData();
  const gnome = () => ({ ...makePanel(PANEL_POOL.find(c => c.no === 'C006').id), keywords: [], directions: ['up', 'down', 'left', 'right'] });
  // 魔導板：キャラクター（マス1）の左（マス0）と右（マス2）に強化を置く。
  function setup(left, right, extra = {}) {
    initRun(); G.mainBoard.fill(null); G.mapPanelPowers = {};
    G.mainBoard[1] = gnome();
    const place = (slot, c, dirs) => { if (!c) return; c.directions = dirs; G.mainBoard[slot] = c; };
    place(0, left, ['right']); place(2, right, ['left', 'right']);
    Object.entries(extra).forEach(([slot, c]) => { G.mainBoard[slot] = c; });
    const board = _getPartyBoardUnit();
    return { ...board, _ownedBoardPreview: true };
  }
  const lines = (u, slot = 1) => { const g = _groupedEnchantEffectTexts(u, slot); return { normal: g.normalTexts, chars: g.charTexts }; };
  await check('炎の矢＋乱れ撃ち：対象の敵を1体増やし、キャラクター用説明文を出す', () => {
    const u = setup(card('E058'), card('E047'));
    const x = lines(u);
    assert.ok(x.normal.some(t => t.includes('ランダムな敵2体に4ダメージを与える')), JSON.stringify(x));
    assert.deepEqual(x.chars, ['「乱れ撃ち」の効果で対象が+1された。']);
  });
  await check('強化した乱れ撃ちは+2、「ランダムな敵2体」は4体になる', () => {
    const u = setup(card('E006'), card('E047', true));
    const x = lines(u);
    assert.ok(x.normal.some(t => t.includes('ランダムな敵4体に3ダメージ')), JSON.stringify(x));
    assert.deepEqual(x.chars, ['「乱れ撃ち」の効果で対象が+2された。']);
  });
  await check('対象の敵を含む効果が無ければ、乱れ撃ちのキャラクター用説明文を出さない', () => {
    const u = setup(card('E001'), card('E047'));
    assert.deepEqual(lines(u).chars, []);
  });
  await check('援護射撃だけ（他のキャラクターと繋がっていない）なら出さず、援護射撃の文は変えない', () => {
    const u = setup(card('E067'), card('E047'));
    const x = lines(u);
    assert.deepEqual(x.chars, []);
    assert.ok(x.normal.some(t => t.includes('全ての味方がランダムな敵に2ダメージ')), JSON.stringify(x));
  });
  await check('援護射撃が他のキャラクターとも繋がっていれば出す（援護射撃の文は変えない）', () => {
    const cover = card('E067');
    const u = setup(null, card('E047'), {});
    cover.directions = ['left', 'right']; G.mainBoard[6] = cover; G.mainBoard[1].directions = ['up', 'down', 'left', 'right'];
    G.mainBoard[5] = gnome(); G.mainBoard[7] = gnome();
    // マス6の援護射撃 → マス5・マス7のキャラクター。乱れ撃ち（マス2）はマス1のキャラクターだけ。
    const board = { ..._getPartyBoardUnit(), _ownedBoardPreview: true };
    assert.deepEqual(lines(board, 1).chars, [], 'マス1には援護射撃が無い');
    G.mainBoard[2] = null; const scatter = card('E047'); scatter.directions = ['up']; G.mainBoard[10] = null; G.mainBoard[12] = scatter; scatter.directions = ['up'];
    // マス7の下（マス12）に乱れ撃ち：マス7は援護射撃（マス5とも共有）と乱れ撃ちを持つ。
    const b2 = { ..._getPartyBoardUnit(), _ownedBoardPreview: true };
    const x = lines(b2, 7);
    assert.deepEqual(x.chars, ['「乱れ撃ち」の効果で対象が+1された。'], JSON.stringify(x));
    assert.ok(x.normal.some(t => t.includes('全ての味方がランダムな敵に2ダメージ')), JSON.stringify(x));
  });
  await check('「」の中（他の体に与える効果）は数えず、変えない', () => {
    assert.equal(_scatterShotDescription('3マナ毎：ランダムな味方に「負傷：ランダムな敵に1ダメージを与える。」を付与する。', 1),
      '3マナ毎：ランダムな味方に「負傷：ランダムな敵に1ダメージを与える。」を付与する。');
    assert.equal(_hasRandomFoeText('3マナ毎：ランダムな味方に「負傷：ランダムな敵に1ダメージを与える。」を付与する。'), false);
    assert.equal(_scatterShotDescription('死亡：ランダムな敵2体に毒2を与える。', 1), '死亡：ランダムな敵3体に毒2を与える。');
  });
  if (failed) { process.exitCode = 1; console.error(`乱れ撃ち1101：${failed}件NG`); } else console.log('乱れ撃ち1101：OK');
})();
