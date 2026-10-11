'use strict';
// 2026-10-10：根性の点8粒だけを削除し、他49効果と残りの層が同一かを確かめる。
const assert = require('node:assert/strict'), fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { literalDefinition, validatedBundle } = require('../vfx_export');
const old = literalDefinition(execFileSync('git', ['show', '44bf3d5:prototype/js/vfx/defs/effects.js'], { encoding: 'utf8' }), '変更前');
const next = literalDefinition(fs.readFileSync(require.resolve('../../js/vfx/defs/effects.js'), 'utf8'), '変更後');
assert.equal(next.effects.length, 50);
assert.deepEqual(next.effects.filter(d => d.name !== 'guts-state'), old.effects.filter(d => d.name !== 'guts-state'));
const before = old.effects.find(d => d.name === 'guts-state'), after = next.effects.find(d => d.name === 'guts-state');
const dots = before.layers.filter(l => l.motion === 'corners' && l.count === 8);
assert.equal(dots.length, 1, '削除する小点の層は1層');
assert.deepEqual(after, { ...before, layers: before.layers.filter(l => l !== dots[0]) });
assert.equal(validatedBundle().counts.effects, 50);
console.log('根性状態1010: 点8粒のみ削除・残る縁/四隅/オーラ/ちらつき・他49効果同一 OK（画面は別途撮影）');
