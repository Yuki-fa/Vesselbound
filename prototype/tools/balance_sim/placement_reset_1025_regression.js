'use strict';
// 2026-10-25 利用者指定：魔導取引所・編成画面の「元に戻す」を「配置を戻す」へ。
// 配置だけを画面に入った時へ戻す（リロール前には戻らない・アイテムの使用済みも戻らない）。
// 最初にあったカードが盤面にも報酬・商品枠にも無い時はボタンを暗くし、押すと「初期カード不存在時」のエラー。
const assert = require('node:assert/strict'), vm = require('node:vm');
const { initialize } = require('./run_bot'), { source } = require('./bot_runtime');
// bot の実行環境は報酬画面の記録などを空の関数に差し替えている。検査する本物を reward.js から戻す。
function restore(name) { const found = source('js/engine/reward.js').match(new RegExp(`^(?:async )?function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^\\}`, 'm')); assert.ok(found, name); vm.runInThisContext(found[0]); }
let checked = 0, failed = 0;
function check(name, fn) {
  try { fn(); checked++; console.log('OK ' + name); }
  catch (e) { failed++; console.log('NG ' + name + '\n' + (e && e.stack || e)); }
}
(async () => {
  await initialize();
  restore('_storeRewardStartSnapshot');
  const errors = [];
  global.showErrorOverlay = opts => { errors.push(opts); return true; };
  const card = name => ({ ...JSON.parse(JSON.stringify(PANEL_POOL.find(c => c.category === 'キャラクター' && c.name === name))) });
  const enter = (opts = {}) => {
    errors.length = 0;
    Object.assign(G, { phase: 'reward', _isShop: !!opts.shop, _isItemShop: false, _isPeddler: false, _onlineMode: false });
    G.mainBoard = Array(MAIN_BOARD_SIZE).fill(null);
    G.mainBoard[0] = card('ノーム'); G.mainBoard[1] = card('マータ');
    _rewCards = opts.offers || [card('ゴーレム'), card('ドワーフ')].map(c => ({ ...c, _isOriginalReward: !opts.shop }));
    _rewPhaseId++; _rewFreePickDone = false;
    _storeRewardStartSnapshot();
  };
  // 報酬から取る（ゲームの取得と同じ印：取る前の控えと元の枠）。
  const take = (offerIdx, boardIdx) => {
    const c = _rewCards[offerIdx];
    const placed = { ...JSON.parse(JSON.stringify(c)), _rewardReturnCard: JSON.parse(JSON.stringify(c)), _rewardReturnIdx: offerIdx, _rewardReturnPhaseId: _rewPhaseId };
    delete placed._isOriginalReward;
    G.mainBoard[boardIdx] = placed; _rewCards.splice(offerIdx, 1); _rewFreePickDone = true;
  };

  check('編成画面：取る・動かす・報酬枠へ返す・リロール・アイテムの強化の後、配置だけ戻る', () => {
    enter();
    const gnomeAtk = Number(G.mainBoard[0].power);
    take(0, 2);                                                   // ゴーレムを取って枠2へ
    G.mainBoard[5] = G.mainBoard[0]; G.mainBoard[0] = null;       // ノームを枠5へ動かす
    assert.ok(_pushToRewardArea(G.mainBoard[1])); G.mainBoard[1] = null;   // マータを報酬枠へ
    G.mainBoard[5].power = gnomeAtk + 5;                          // アイテムの強化（戻さない）
    _rewCards = _rewCards.map(c => c && c._isOriginalReward ? { ...card('サテュロス'), _isOriginalReward: true } : c);   // リロール
    assert.equal(rewardPlacementInitialMissing(), false);
    assert.equal(resetRewardPlacement(), true);
    assert.equal(G.mainBoard[0].name, 'ノーム'); assert.equal(Number(G.mainBoard[0].power), gnomeAtk + 5, 'アイテムの強化は残る');
    assert.equal(G.mainBoard[1].name, 'マータ'); assert.equal(G.mainBoard[1]._temporaryRewardAreaCard, undefined, '報酬枠の印を外す');
    assert.equal(G.mainBoard[2], null); assert.equal(G.mainBoard[5], null);
    const names = _rewCards.filter(Boolean).map(c => c.name).sort();
    assert.deepEqual(names, ['ゴーレム', 'サテュロス'].sort(), 'リロール後の報酬は残り、取ったカードが戻る');
    const golem = _rewCards.find(c => c && c.name === 'ゴーレム');
    assert.equal(golem._isOriginalReward, true, '報酬だった印を戻す'); assert.equal(golem._rewardReturnCard, undefined);
    assert.equal(_rewFreePickDone, false, '無料の1枚も画面に入った時へ');
    assert.equal(errors.length, 0);
  });

  check('最初のカードがどこにも無い時は暗くなり、押すとエラーで何も変えない', () => {
    enter();
    assert.ok(_pushToRewardArea(G.mainBoard[1])); G.mainBoard[1] = null;
    _rewCards = _rewCards.filter(c => c && c.name !== 'マータ');    // 返したカードが報酬枠からも消えた
    take(0, 1);
    assert.equal(rewardPlacementInitialMissing(), true);
    const before = JSON.stringify([G.mainBoard, _rewCards]);
    assert.equal(resetRewardPlacement(), false);
    assert.equal(errors.length, 1); assert.match(errors[0].message, /配置を戻すことは出来ませんでした/);
    assert.equal(JSON.stringify([G.mainBoard, _rewCards]), before, '盤面・報酬は変えない');
    const btn = _placementResetButton();
    assert.ok(btn.className.includes('disabled'), 'ボタンを暗くする'); assert.equal(!!btn.disabled, false, '押せる（エラーを出す）');
  });

  check('魔導取引所：交換（写し）の後でも戻る。交換したカードが商品の引き直しで消えたらエラー', () => {
    enter({ shop: true, offers: [card('ゴーレム'), card('ドワーフ'), null] });
    if (!_isCardExchangeShop()) { console.log('  （交換店の設定ではないため省略）'); return; }
    const incoming = _rewCards[0], outgoing = G.mainBoard[0];
    G.mainBoard[0] = _exchangeShopCardCopy(incoming); _rewCards[0] = _exchangeShopCardCopy(outgoing);   // exchangeShopCard と同じ写し
    assert.equal(resetRewardPlacement(), true);
    assert.equal(G.mainBoard[0].name, 'ノーム'); assert.equal(_rewCards[0].name, 'ゴーレム', '商品は同じ枠へ');
    G.mainBoard[0] = _exchangeShopCardCopy(_rewCards[1]); _rewCards[1] = _exchangeShopCardCopy(outgoing);
    _rewCards = [card('サテュロス'), card('ギガンテス'), null];      // 引き直しで交換したノームが無くなった
    assert.equal(rewardPlacementInitialMissing(), true);
    assert.equal(resetRewardPlacement(), false); assert.equal(errors.length, 1);
  });

  check('リロール・起動の記録では戻り先を取り直さない（画面に入った時の配置のまま）', () => {
    enter();
    G.mainBoard[4] = G.mainBoard[0]; G.mainBoard[0] = null;
    _storeRewardStartSnapshot();                                  // リロール・起動の時の記録
    assert.equal(resetRewardPlacement(), true);
    assert.equal(G.mainBoard[0].name, 'ノーム'); assert.equal(G.mainBoard[4], null);
  });

  console.log(`配置を戻す1025：${checked}件成功・${failed}件失敗`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
