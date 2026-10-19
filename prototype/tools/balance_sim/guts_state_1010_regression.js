'use strict';
// 根性の点8粒の削除と残りの層を確認する。他効果の後日の改訂は固定しない。
const assert = require('node:assert/strict'), fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { literalDefinition, validatedBundle } = require('../vfx_export');
const old = literalDefinition(execFileSync('git', ['show', '44bf3d5:prototype/js/vfx/defs/effects.js'], { encoding: 'utf8' }), '変更前');
const next = literalDefinition(fs.readFileSync(require.resolve('../../js/vfx/defs/effects.js'), 'utf8'), '変更後');
assert.equal(next.effects.length, 50);
assert.deepEqual(next.effects.map(d => d.name).sort(), old.effects.map(d => d.name).sort(), '既存50効果の登録を保持');
const before = old.effects.find(d => d.name === 'guts-state'), after = next.effects.find(d => d.name === 'guts-state');
const dots = before.layers.filter(l => l.motion === 'corners' && l.count === 8);
assert.equal(dots.length, 1, '削除する小点の層は1層');
assert.deepEqual(after, { ...before, layers: before.layers.filter(l => l !== dots[0]) });
// 2026-10-13: webp をコード描画へ置き換えた32種（js/vfx/defs/webp.js）が書き出しに加わったので、既存50種を含むことだけを確かめる。
assert.ok(validatedBundle().counts.effects >= 50);
console.log('根性状態1010: 点8粒のみ削除・残る縁/四隅/オーラ/ちらつき・既存50効果の登録と現行スキーマ OK（画面は未確認）');
