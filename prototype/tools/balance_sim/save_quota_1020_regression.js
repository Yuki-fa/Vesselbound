'use strict';
// 2026-10-20 利用者報告：最終戦の1戦目の後、ラスボス戦の保存で「セーブに失敗しました。空き容量〜」になり、2戦目が始まらなかった。
// 保存は current と backup の2世代を書くので、大きな戦闘では上限に当たる。上限に当たった時はバックアップを諦め、現在の保存を優先する。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = { globalThis: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js/save/storage.js'), 'utf8') + '\nthis.SaveStorage=SaveStorage;', ctx);
const { SaveStorage } = ctx;
function media(limit) {
  const m = new Map();
  const used = () => [...m.values()].reduce((s, v) => s + v.length, 0);
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), removeItem: k => m.delete(k),
    setItem(k, v) { const before = m.get(k) || ''; if (used() - before.length + v.length > limit) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, v); } };
}
const ok = x => x;
let checked = 0;
const check = (name, fn) => { fn(); checked++; console.log('OK ' + name); };
check('上限内なら current と backup の2世代を残す（従来どおり）', () => {
  const m = media(10000); SaveStorage.setAdapter(m);
  SaveStorage.write('run', { n: 1, pad: 'a'.repeat(100) }, ok);
  SaveStorage.write('run', { n: 2, pad: 'a'.repeat(100) }, ok);
  assert.equal(JSON.parse(m.getItem('vesselbound.run.current')).n, 2);
  assert.equal(JSON.parse(m.getItem('vesselbound.run.backup')).n, 1);
});
check('2世代分が上限を超える時は、バックアップを外して現在の保存を書く', () => {
  const m = media(2400); SaveStorage.setAdapter(m);
  SaveStorage.write('run', { n: 1, pad: 'a'.repeat(1000) }, ok);
  SaveStorage.write('run', { n: 2, pad: 'b'.repeat(1500) }, ok);
  assert.equal(JSON.parse(m.getItem('vesselbound.run.current')).n, 2);
  assert.equal(m.getItem('vesselbound.run.backup'), null);
});
check('1件だけでも上限を超える時は従来どおりエラー（呼び出し側がエラー画面を出す）', () => {
  const m = media(500); SaveStorage.setAdapter(m);
  assert.throws(() => SaveStorage.write('run', { n: 3, pad: 'c'.repeat(1000) }, ok), /quota/);
});
console.log(`保存上限1020：${checked}項目 OK`);
