'use strict';

// コアが戦闘中に変える「資源」（ライフ・マナ・ゴールド）が、
// PvE側のGへ確実に戻っているかを検証する。
//
// なぜ要るか：オンラインはコアのイベント列をそのまま再生するので資源変化が必ず反映される。
// 一方PvEはコアへ渡したstateを自前で読み戻すため、書き戻しを1箇所忘れると
// 「オンラインでは効くのにPvEでは効かない効果」が生まれる。
// 実際に我慢の指輪（負傷：ライフが+2される）がこの形で無効になっていた。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../../js/battle/core');

const ROOT = path.resolve(__dirname, '../..');
const battleSrc = fs.readFileSync(path.join(ROOT, 'js/engine/battle.js'), 'utf8');
const coreSrc = fs.readFileSync(path.join(ROOT, 'js/battle/core.js'), 'utf8');

const ng = [];
function check(name, fn) {
  try { fn(); console.log(`OK   ${name}`); }
  catch (e) { ng.push(name); console.log(`NG   ${name}\n     ${e.message.split('\n')[0]}`); }
}

// --- 静的：PvEがコアへ渡すstateは必ずlifeを持つ ---
check('PvEの全state定義がlifeを持つ', () => {
  const states = battleSrc.match(/resources:\{p1:\{mana:Number\(_ensureMana\(\)\)\|\|0,gold:Number\(G\.gold\)\|\|0\},p2:\{mana:0,gold:0\}\}[,}]/g) || [];
  assert.ok(states.length >= 12, `state定義が想定より少ない: ${states.length}`);
  // ライフの実値は G._waveLife（表示に使われている方）。_currentBattleLife() が唯一の入口。
  const lifeCount = (battleSrc.match(/life:\{p1:_currentBattleLife\(\),p2:0\}/g) || []).length;
  assert.equal(lifeCount, states.length,
    `state定義${states.length}件に対しlife付きは${lifeCount}件。lifeの無いstateはコアのライフ変化を捨てる`);
});

// --- 静的：コア→PvEの共通出口でライフが書き戻される ---
check('_flushCorePveHitEvents がライフを書き戻す', () => {
  const m = battleSrc.match(/async function _flushCorePveHitEvents\([^)]*\)\s*\{([\s\S]{0,400})/);
  assert.ok(m, '_flushCorePveHitEvents が見つからない');
  assert.match(m[1], /_syncCoreLifeToG\(state\)/,
    '共通出口でライフを書き戻していない');
});

// --- 静的：フラッシュを通らない経路にも書き戻しがある ---
check('毒・復活・命中後の経路にも書き戻しがある', () => {
  const n = (battleSrc.match(/_syncCoreLifeToG\(state\)/g) || []).length;
  assert.ok(n >= 4, `書き戻しが${n}箇所しかない（共通出口＋毒＋復活＋命中後で4箇所以上必要）`);
});

// --- 静的：コアがlifeを書く箇所を数え、増えたら気づけるようにする ---
check('コアのライフ変更点が把握済みの数のまま', () => {
  const n = (coreSrc.match(/state\.life(\.p1|\[unit\.side\])\s*=/g) || []).length;
  assert.ok(n > 0, 'コアにライフ変更が無い（検出条件が壊れている可能性）');
  assert.ok(n <= 6, `コアのライフ変更点が${n}箇所に増えた。PvE側の書き戻しが届くか確認すること`);
});

// --- 動的：我慢の指輪が実際にライフを増やす ---
check('我慢の指輪：味方の負傷でライフ+2（コア）', () => {
  const state = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    rings: {p1: [{name: '我慢の指輪'}], p2: []},
    sides: {
      p1: {units: [{id: 'a', name: 'テスト味方', atk: 1, hp: 10, maxHp: 10, color: '赤'}]},
      p2: {units: [{id: 'b', name: 'テスト敵', atk: 3, hp: 10, maxHp: 10, color: '黒'}]},
    },
  });
  state.life = {p1: 20, p2: 20};
  const events = [];
  const emit = ev => events.push(ev);
  const rng = () => 0.5;
  const applyHit = (s, t, amt, c) => core.coreResolveHit(state, s, t, amt, c, rng, emit);
  const ally = state.units.p1[0];
  const foe = state.units.p2[0];
  applyHit(foe, ally, 3, false);

  const gains = events.filter(e => e && e.type === 'life_gain' && e.reason === 'patience_ring');
  assert.equal(gains.length, 1, `life_gainが${gains.length}件（1件であるべき）`);
  assert.equal(state.life.p1, 22, `ライフが${state.life.p1}（22であるべき）`);
});

// --- 動的：負傷:ライフが+Nされる の汎用文もライフを増やす ---
check('負傷：ライフが+Nされる（汎用文）', () => {
  const state = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    sides: {
      p1: {units: [{id: 'a', name: 'テスト味方', atk: 1, hp: 10, maxHp: 10, color: '赤',
        desc: '負傷：ライフが+3される。'}]},
      p2: {units: [{id: 'b', name: 'テスト敵', atk: 3, hp: 10, maxHp: 10, color: '黒'}]},
    },
  });
  state.life = {p1: 20, p2: 20};
  const events = [];
  const emit = ev => events.push(ev);
  const rng = () => 0.5;
  const applyHit = (s, t, amt, c) => core.coreResolveHit(state, s, t, amt, c, rng, emit);
  applyHit(state.units.p2[0], state.units.p1[0], 3, false);
  assert.equal(state.life.p1, 23, `ライフが${state.life.p1}（23であるべき）`);
});


// --- 動的：マナ効果の巻き戻しで「表示済みの召喚体」を未表示へ戻さない ---
check('マナ効果の巻き戻しが表示済みの召喚体を消さない', () => {
  const state = core.createBattleState({
    resources: {p1: {mana: 0, gold: 0}, p2: {mana: 0, gold: 0}},
    rings: {p1: [], p2: []}, items: {p1: [], p2: []},
    sides: {p1: {units: [{id: 'A', name: '味方', atk: 3, hp: 9, maxHp: 9, color: '赤', keywords: [], desc: ''}]}, p2: {units: []}},
  });
  const unit = state.units.p1[0];
  // まだ画面に出していない状態でスナップショットを取る
  unit._corePendingSummon = true;
  const snapshot = core.coreSnapshotDeferredState(state);
  // 表示して、そのあと戦闘で数値も変わった
  delete unit._corePendingSummon;
  unit.atk = 99;
  core.coreRestoreDeferredState(state, snapshot);
  assert.equal(unit.atk, 3, `ATKが巻き戻っていない（${unit.atk}）`);
  assert.equal(unit._corePendingSummon, undefined,
    '未表示フラグが復活している（表示済みの召喚体が盤面から消える）');
  assert.ok(state.units.p1.includes(unit), '巻き戻しでユニットが配列から消えた');
});


// --- 静的：ライフは表示に使われている値（G._waveLife）を読む ---
check('コアへ渡すライフが表示と同じ値である', () => {
  assert.match(battleSrc, /function _currentBattleLife\(\)\{[\s\S]{0,200}G\._waveLife!=null/,
    '_currentBattleLife() が G._waveLife を見ていない');
  assert.match(battleSrc, /if\(G\._waveLife!=null\) G\._waveLife=next;/,
    'ライフの書き戻しが G._waveLife を更新していない（画面と食い違う）');
  // 上限も渡す。オンライン対戦は3ではなく5。
  assert.ok((battleSrc.match(/maxLife:\{p1:_currentBattleLifeMax\(\)/g) || []).length >= 13,
    'コアへライフ上限を渡していない');
});

console.log(`\n資源パリティ検証: NG ${ng.length}`);
if (ng.length) { ng.forEach(n => console.log(` - ${n}`)); process.exit(1); }
