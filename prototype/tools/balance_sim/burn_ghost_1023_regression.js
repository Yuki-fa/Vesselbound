'use strict';
// 2026-10-23 利用者報告（画像つき）：「残像が出るのが直っていません」
// 原因：VFX の入れ物（#vfx-frame-clip）を、攻撃の動く複製が出る・消えるたびに戦闘画面の中⇔body 直下へ付け替えていた。
// 付け替えると中の CSS アニメーションが全て最初からやり直しになり、焼失中のカードが元の姿へ戻って焼け直す＝残像。
// 検査：攻撃の複製の出入りで、作り済みの演出の親（入れ物）が DOM から外れないこと・VbFx の描画面だけが移ること。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const src = fs.readFileSync(path.join(__dirname, '../../js/engine/render.js'), 'utf8');
const pick = name => {
  const i = src.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name);
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
  }
  throw new Error(name);
};
// 付け外しを数えるだけの最小の DOM。
let detaches = 0;
const byId = new Map();
function el(tag) {
  return {
    tag, id: '', children: [], parentNode: null, dataset: {}, style: {}, classList: { set: new Set(), contains(c) { return this.set.has(c); }, add(c) { this.set.add(c); } },
    appendChild(c) {
      if (c.parentNode) { detaches++; const a = c.parentNode.children; a.splice(a.indexOf(c), 1); }
      this.children.push(c); c.parentNode = this; if (c.id) byId.set(c.id, c); return c;
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1920, height: 1080 }; },
  };
}
const body = el('body'), screen = el('div');
screen.id = 'scr-battle'; screen.classList.add('active'); body.appendChild(screen);
let motion = false;
const fxRoot = el('div'); fxRoot.dataset.vbFxLayer = '1';
const document = {
  body, documentElement: body,
  createElement: el,
  getElementById: id => { const n = byId.get(id); return n && isConnected(n) ? n : null; },
  querySelector: sel => sel === '.attack-motion-clone' ? (motion ? {} : null) : sel === '[data-vb-fx-layer]' ? (fxRoot.parentNode ? fxRoot : null) : null,
};
function isConnected(n) { for (; n; n = n.parentNode) if (n === body) return true; return false; }
const ctx = { document, window: { innerWidth: 1920, innerHeight: 1080 }, _gameScale: () => 1, _battleVfxClipRect: () => ({ left: 0, top: 0, width: 1920, height: 1080 }) };
vm.createContext(ctx);
vm.runInContext(pick('_vfxClipLayerEl') + '\n' + pick('_vfxClipLayer') + '\nthis._vfxClipLayer=_vfxClipLayer;', ctx);

const base = ctx._vfxClipLayer();
assert.equal(base.parentNode, screen, '普段は戦闘画面の中');
base.appendChild(fxRoot);
const burn = el('div'); burn.className = 'death-burn-clone'; base.appendChild(burn);
detaches = 0;
motion = true;
const over = ctx._vfxClipLayer();
assert.notEqual(over, base, '攻撃の複製がある間は上の入れ物');
assert.equal(over.parentNode, body);
assert.equal(over.style.zIndex, '10001');
assert.equal(fxRoot.parentNode, over, 'VbFx の描画面は上の入れ物へ移る');
const label = el('div'); over.appendChild(label);
motion = false;
const back = ctx._vfxClipLayer();
assert.equal(back, base);
assert.equal(fxRoot.parentNode, base, '複製が消えれば描画面は戦闘画面の中へ戻る');
assert.equal(base.parentNode, screen, '入れ物そのものは付け替えない');
assert.equal(burn.parentNode, base, '焼失中のカードは作った入れ物のまま');
assert.equal(label.parentNode, over, '攻撃中に作った演出も作った入れ物のまま');
assert.equal(detaches, 2, '付け替わったのは VbFx の描画面（往復2回）だけ＝焼失・数値の CSS アニメーションはやり直しにならない');
console.log('残像1023：成功');
