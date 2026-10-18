'use strict';
// 本体の生成・ドラッグ・音声入口・編成をNodeで動かす。描画と聴感の確認ではない。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
const timers = new Map(); let timerId = 0;
global.setTimeout = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
global.clearTimeout = id => timers.delete(id);
global.requestAnimationFrame = global.setInterval = () => 0;
console.table = () => {};
for (const m of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!m[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT, m[1]), 'utf8'), { filename: m[1] });
}
let checked = 0, failed = 0;
function check(name, fn) {
  try { fn(); checked++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + (error.stack || error)); }
}
const def = no => PANEL_POOL.find(p => p.no === no);
(async () => {
  await loadGameData();
  check('初期配置200種：1キャラ＋2強化、別の向き、3枚とも元の向きを保ち直接接続', () => {
    const originalMake = makePanel, directions = new WeakMap(), oldRandom = Math.random;
    global.makePanel = (...args) => { const c = originalMake(...args); if (c) directions.set(c, [...c.directions]); return c; };
    try {
      for (let seed = 1; seed <= 200; seed++) {
        const rng = createSeededRng(seed); Math.random = () => rng.next();
        initState(); _giveInitialRandomBoardCards();
        const cards = G.mainBoard.map((c, i) => c && { c, i }).filter(Boolean);
        assert.equal(cards.length, 3);
        const chars = cards.filter(({ c }) => c.category === 'キャラクター');
        assert.equal(chars.length, 1);
        const { c: character, i } = chars[0];
        assert.ok(MAIN_BOARD_FRONT_SLOTS.includes(i));
        assert.equal(mapPanelPowerIdAt(i), 'summon');
        assert.ok(character.power >= 1); assert.ok(!coreSealValue(character));
        const enchants = cards.filter(({ c }) => c !== character);
        assert.notDeepEqual([...enchants[0].c.directions].sort(), [...enchants[1].c.directions].sort());
        for (const { c, i: slot } of cards) {
          assert.equal(c.rarity, 1); assert.equal(c.initial, true);
          assert.deepEqual(c.directions, directions.get(c), '生成後の矢印を書き換えない');
          if (slot === i) continue;
          const dir = slot === i - 1 ? 'left' : slot === i + 1 ? 'right' : slot === i - 5 ? 'up' : slot === i + 5 ? 'down' : '';
          assert.ok(dir); assert.ok(character.directions.includes(dir));
          assert.ok(c.directions.includes({ left: 'right', right: 'left', up: 'down', down: 'up' }[dir]));
        }
      }
    } finally { Math.random = oldRandom; global.makePanel = originalMake; }
    initState(); G._debugMode = true; _giveDebugGolem();
    assert.equal(G.mainBoard.filter(Boolean).length, 5);
    assert.equal(G.mainBoard[1].power, 9999);
    assert.equal(G.mainBoard.filter(c => c && c.name === '黄金の壺').length, 4);
  });
  check('祝福を含むカード本体を復活基準としてPvE編成・オンラインpayloadへ渡す', () => {
    initState();
    const c = makePanel(def('C006').id); c.power = 10; c.life = 10;
    coreApplyCardBoon(c, { statMul: 3 }); c.directions = ['left', 'right'];
    const enchant = makePanel(def('E003').id); enchant.directions = ['right'];
    G.mainBoard[1] = c; G.mainBoard[0] = enchant;
    const u = buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered[0].unit;
    assert.ok(u.atk > 30 && u.hp > 30, '接続の常時効果が出撃時に掛かる');
    assert.deepEqual([u._baseAtk, u._baseMaxHp], [30, 30]);
    coreStampUnitBaseStats(u); assert.deepEqual([u._baseAtk, u._baseMaxHp], [30, 30]);
    const sent = buildOnlineSelfFormation().units[0];
    assert.deepEqual([sent.baseAtk, sent.baseMaxHp], [30, 30]);
    for (const raw of [u, sent]) {
      const state = createBattleState({ sides: { p1: { units: [raw] }, p2: { units: [] } } });
      const subject = state.units.p1[0]; subject.keywords.push('復活'); subject.atk = 1000; subject.maxHp = 1000; subject.hp = 0;
      const events = []; coreTryRevive(subject, state, e => events.push(e));
      assert.deepEqual([events[0].atk, events[0].hp], [15, 15]);
      assert.deepEqual([subject.atk, subject.hp], [15 + enchant.adjacentAtkBonus, 15 + enchant.adjacentHpBonus]);
    }
  });
  check('商品ドラッグ：特殊マスだけの追加発光なし、空きマスの暗転は終了時に解除', () => {
    const select = document.querySelectorAll;
    const tile = (card, power) => {
      const e = makeElement(); const classes = new Set(card ? ['card'] : ['board-empty']);
      if (power) e.dataset.mapBoard = power;
      e.classList = { add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
        contains: x => classes.has(x), toggle: (x, on) => { if (on) classes.add(x); else classes.delete(x); } };
      return e;
    };
    try {
      for (const peddler of [false, true]) {
        initState(); G.phase='reward'; G._isShop = true; G._isPeddler = peddler;
        G.mainBoard[0] = makePanel(def('E003').id); G.mainBoard[1] = makePanel(def('C006').id);
        G.mainBoard[3] = {...makePanel(def('E003').id),_questOfferCard:true};
        const tiles = G.mainBoard.map((c, i) => tile(c, mapPanelPowerIdAt(i)));
        document.querySelectorAll = selector => selector === '#hand-slots.board-slots > *' ? tiles
          : selector === '#hand-slots.board-slots > .card' ? tiles.filter(e => e.classList.contains('card'))
          : selector.startsWith('.') ? tiles.filter(e => e.classList.contains(selector.slice(1))) : [];
        _rewCards = [makePanel(def('C001').id)]; _dragSrc = { arr: 'rew', idx: 0 };
        _setDragZoneClass('dragzone-reward-nonspell');
        assert.equal(tiles[0].classList.contains('reward-special-drop-hint'), false);
        assert.equal(tiles[1].classList.contains('reward-special-drop-hint'), false);
        assert.equal(tiles[0].classList.contains('shop-exchange-drop-hint'), true);
        assert.equal(tiles[1].classList.contains('shop-exchange-drop-hint'), true);
        assert.equal(tiles[1].classList.contains('shop-exchange-empty-dim'), false);
        assert.equal(tiles[2].classList.contains('shop-exchange-empty-dim'), true);
        assert.equal(tiles[3].classList.contains('shop-exchange-empty-dim'), true);
        assert.equal(tiles[3].classList.contains('shop-exchange-drop-hint'), false);
        _clearDragZoneClass(); _dragSrc = null;
        assert.ok(tiles.every(e => !e.classList.contains('reward-special-drop-hint') && !e.classList.contains('shop-exchange-empty-dim')));
        G._isShop=false;_dragSrc={arr:'rew',idx:0};_setDragZoneClass('dragzone-reward-nonspell');
        assert.ok(tiles.every(e=>!e.classList.contains('reward-special-drop-hint')&&!e.classList.contains('shop-exchange-drop-hint')));
        _clearDragZoneClass();_dragSrc=null;
      }
    } finally { document.querySelectorAll = select; }
  });
  check('闇の炎：他の音が24本鳴っていてもゲームのLAB経路からE006を再生する', () => {
    initState(); _sfxUnlocked = true; timers.clear();
    const keys = Object.keys(Assets.sfx).filter(key => key !== 'E006' && !_isBgmKey(key));
    for (const key of keys.slice(0, SFX_SETTINGS.maxVoices)) assert.equal(playSfx(key, { guardMs: 0, maxPlayMs: 0 }), true);
    assert.equal(_sfxActiveVoices, 24);
    _battleFxSound('E006', 1.5, VbFx.duration('dark-fire', 1.5), false);
    const due = [...timers.entries()].filter(([, t]) => t.ms === 0);
    due.forEach(([id, t]) => { timers.delete(id); t.fn(); });
    assert.equal(_sfxPlayingByKey.E006, 1, 'グローバルの同時発音数上限でE006を捨てない');
    assert.equal(_sfxActiveVoices, 24, '総発音数は増やさない');
    assert.equal(SFX_SETTINGS.sounds.E006.volume, .70);
  });
  console.log(`操作・編成1018：${checked}件OK / ${failed}件NG（画面・聴感は未確認）`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
