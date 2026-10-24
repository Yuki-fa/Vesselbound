'use strict';
// 2026-10-25 利用者指定「毒袋・変化・武威・復讐の炎の効果をコアに実装してください」。
// 4枚とも本文の処理がコアに無く、戦闘で何も起きていなかった。通常・強化後の本文の両方を検査する。
const assert = require('node:assert/strict');
const { initialize } = require('./run_bot');
let checked = 0, failed = 0;
function check(name, fn) {
  try { fn(); checked++; console.log('OK ' + name); }
  catch (e) { failed++; console.log('NG ' + name + '\n' + (e && e.stack || e)); }
}
const TEXT = {
  poisonBag: '死亡：ランダムな敵2体に毒2を与える。', poisonBagUp: '死亡：ランダムな敵2体に毒2を与える。これをもう一度繰り返す。',
  change: '終戦：このキャラクター以外の、生存した味方の本来の姿に永久に変身する。', changeUp: '終戦：このキャラクター以外の、生存した味方に永久に変身する。',
  might: '常時：味方の眷属が召喚されるたび、このキャラクターは+4/+4を得る。', mightUp: '常時：味方の眷属が召喚されるたび、このキャラクターは+8/+8を得る。',
  revenge: '攻撃：このキャラクターは+X/+Xを得る。Xは血に等しい。', revengeUp: '攻撃：このキャラクターは+X/+Xを得る。Xは血の2倍に等しい。',
};
(async () => {
  await initialize();
  // エンチャントを付けた体（接続した本文は _adjacentPanelEffectTexts で渡る）と、味方・敵を並べた場面。
  const scene = (text, opts = {}) => {
    const source = { id: 'source', name: '検査素体', color: '赤', atk: 10, hp: 30, maxHp: 30, desc: '', keywords: [], _adjacentPanelEffectTexts: [text], _mainBoardSlot: 7 };
    const allies = [0, 1].map(i => ({ id: 'ally' + i, name: '味方' + i, color: '青', atk: 4, hp: 20, maxHp: 20, desc: '', keywords: [], _mainBoardSlot: 3 + i * 8 }));
    const foes = [0, 1, 2].map(i => ({ id: 'foe' + i, name: '敵' + i, color: '緑', atk: 4, hp: 50, maxHp: 50, desc: '', keywords: [], poison: 0 }));
    return createBattleState({ sides: { p1: { units: [source, ...allies] }, p2: { units: foes } }, blood: { p1: opts.blood ?? 6, p2: 0 },
      resources: { p1: { mana: 0, gold: 100 }, p2: { mana: 0, gold: 100 } }, summonDefs: [...PANEL_POOL, ...ENEMY_POOL], stageNumber: 2 });
  };
  const run = (state, fn) => { const events = [], rng = createSeededRng(7), emit = e => events.push(e);
    const hit = (a, b, amount, c, ss, st, opt) => coreResolveHit(state, a, b, amount, c, rng, emit, { skipSourceEffects: !!ss, skipTough: !!st, ...(opt || {}) });
    fn(state.units.p1[0], rng, emit, hit); return events; };

  check('毒袋：死亡でランダムな敵2体に毒2（強化後は2回）', () => {
    for (const [text, total] of [[TEXT.poisonBag, 4], [TEXT.poisonBagUp, 8]]) {
      const s = scene(text);
      const events = run(s, (u, rng, emit, hit) => { u.hp = 0; emit({ type: 'death', side: u.side, unitId: u.id }); coreApplyDeathEffects(u, s, rng, emit, hit); });
      assert.equal(s.units.p2.reduce((n, f) => n + f.poison, 0), total, text);
      const poisons = events.filter(e => e.type === 'keyword_effect' && e.effect === 'poison');
      assert.equal(poisons.length, total / 2, text);
      // 1回の発動の中では同じ敵に重ねない（2体は別々）。
      const batches = new Map(); poisons.forEach(e => batches.set(e.fxBatch, [...(batches.get(e.fxBatch) || []), e.unitId]));
      for (const ids of batches.values()) assert.equal(new Set(ids).size, ids.length, '同じ発動で同じ敵に2回入れない');
    }
  });

  check('武威：味方の眷属が召喚されるたび+4/+4（強化後+8/+8）。敵の眷属では得ない', () => {
    for (const [text, gain] of [[TEXT.might, 4], [TEXT.mightUp, 8]]) {
      const s = scene(text), u = s.units.p1[0], before = [u.atk, u.maxHp];
      run(s, (unit, rng, emit, hit) => {
        const child = createCoreUnit({ id: 'kin', name: '眷属', atk: 2, hp: 2, keywords: ['眷属'] }, 'p1', 9);
        s.units.p1.push(child); coreApplyKenzokuSummonEffects(s, child, emit, 'ally0', null, rng, hit);
        const foeChild = createCoreUnit({ id: 'kinFoe', name: '敵の眷属', atk: 2, hp: 2, keywords: ['眷属'] }, 'p2', 9);
        s.units.p2.push(foeChild); coreApplyKenzokuSummonEffects(s, foeChild, emit, 'foe0', null, rng, hit);
      });
      assert.deepEqual([u.atk, u.maxHp], [before[0] + gain, before[1] + gain], text);
    }
  });

  check('復讐の炎：攻撃で+X/+X（X＝血。強化後は血の2倍）。血が0なら得ない', () => {
    for (const [text, blood, gain] of [[TEXT.revenge, 6, 6], [TEXT.revengeUp, 6, 12], [TEXT.revenge, 0, 0]]) {
      const s = scene(text, { blood }), u = s.units.p1[0], before = [u.atk, u.maxHp];
      const events = run(s, (unit, rng, emit, hit) => coreApplyAttackEffects(unit, s, rng, emit, hit));
      assert.deepEqual([u.atk, u.maxHp], [before[0] + gain, before[1] + gain], text + ' 血' + blood);
      assert.equal(events.filter(e => e.type === 'stat_change' && e.unitId === 'source' && e.reason === 'attack_self_buff').length, gain ? 1 : 0);
      if (gain) assert.equal(presentStatChangeVfxCode(events.find(e => e.reason === 'attack_self_buff'), 'S005'), 'S005', '攻撃バフの演出');
    }
  });

  check('変化：終戦で生存した味方の本来の姿（強化後は今の姿）へ魔導板のカードごと変身。矢印は元のまま', () => {
    for (const mode of ['base', 'copy']) {
      const s = scene(mode === 'base' ? TEXT.change : TEXT.changeUp);
      s.units.p1[2].hp = 0;   // 生存した味方は ally0 だけ
      const events = run(s, (u, rng, emit) => coreTriggerBattleEnd(s, emit, rng));
      const ev = events.find(e => e.type === 'run_effect' && e.kind === 'board_transform');
      assert.ok(ev, mode); assert.equal(ev.mode, mode); assert.equal(ev.boardSlot, 7); assert.equal(ev.fromSlot, 3); assert.equal(ev.fromUnitId, 'ally0');
      assert.equal(presentRunEffectVfxCode(ev), 'E016', '変身の演出');
      // 魔導板へ書き戻す（PvE の出口）。変身先は永久強化を受けた味方。
      const def = PANEL_POOL.find(c => c.category === 'キャラクター' && c.name === 'ノーム');
      const board = Array(15).fill(null);
      board[7] = { ...JSON.parse(JSON.stringify(PANEL_POOL.find(c => c.name === 'マータ'))), directions: ['up', 'left'], _activationReady: true };
      board[3] = { ...JSON.parse(JSON.stringify(def)), power: Number(def.power) + 5, life: Number(def.life) + 5, directions: ['down'] };
      const saved = G.mainBoard, savedGet = global._getPartyBoardUnit;
      try {
        G.mainBoard = board; global._getPartyBoardUnit = () => ({ boardCards: board });
        applyCoreRunEffectEvent(ev); applyCoreRunEffectEvent(ev);   // 保存からの再生で2回来ても同じ結果
        assert.equal(board[7].name, 'ノーム', mode);
        assert.deepEqual(board[7].directions, ['up', 'left'], '矢印は元のカードのもの');
        assert.equal(board[7]._activationReady, undefined, '起動の印は持ち越さない');
        assert.equal(Number(board[7].power), mode === 'base' ? Number(def.power) : Number(def.power) + 5, '本来の姿は永久強化を含まない／写しは含む');
        assert.equal(board[3].name, 'ノーム', '変身先は残る');
      } finally { G.mainBoard = saved; global._getPartyBoardUnit = savedGet; }
    }
  });

  check('変化：生存した味方がいなければ何もしない・召喚体（魔導板の枠なし）は変身先にしない', () => {
    const s = scene(TEXT.change);
    s.units.p1[1].hp = 0; s.units.p1[2]._mainBoardSlot = undefined;
    const events = run(s, (u, rng, emit) => coreTriggerBattleEnd(s, emit, rng));
    assert.equal(events.filter(e => e.kind === 'board_transform').length, 0);
  });

  console.log(`エンチャント1025：${checked}件成功・${failed}件失敗`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
