'use strict';
// 2026-10-20 利用者指摘：結界の破損演出が、攻撃したカードが元の位置へ戻ってから起きて見えた。
// shield-break は全尺の30%（234ms）までがひびの溜めで、割れるのはその後。戦闘では溜めを飛ばし（seekRatio .26）、
// 接触の直後に割れる。SEの山も同じだけ前へ寄せる。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.message); } };
check('結界消失は割れる直前から再生する', () => {
  assert.match(read('js/battle/present_events.js'), /playBattleLabFx\('shield_break',unit,\[unit\],\{side:fxSide,seekRatio:\.26\}\)/);
  const def = read('js/vfx/defs/effects.js').split('\n').find(l => l.includes('"name":"shield-break"'));
  const impact = JSON.parse(def.match(/"impact":(\{[^}]*\})/)[1]), ms = Number(def.match(/"ms":(\d+)/)[1]);
  // 割れる瞬間が溜めの後（.26より後）で、接触から60ms以内に来ること
  assert.ok(impact.atMs / ms > .26 && impact.atMs - ms * .26 <= 60, JSON.stringify({ impact, ms }));
});
check('描画は seekMs の分だけ途中から始め、SEの山も前へ寄せる', () => {
  assert.match(read('js/vfx/renderer.js'), /job\.start = now - Math\.min\(job\.ms, Math\.max\(0, Number\(job\.options\.seekMs\) \|\| 0\)\)/);
  const fx = read('js/engine/battle_fx.js');
  assert.match(fx, /seekMs,/);
  assert.match(fx, /- seekMs : undefined/);
});
if (failed) { process.exitCode = 1; console.error(`結界消失1020：${failed}件NG`); } else console.log('結界消失1020：OK');
