'use strict';
// 2026-10-20 利用者指定：敵が1体しかいない時は、全体攻撃・三方向攻撃・貫通を無効にする（接触演出・SEを出さない）。
// 敵が前衛だけ・後衛だけの時の全体攻撃は「白い芯の横一閃」（K009_SWEEP。音は全体攻撃と同じ）を使う。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../../js/battle/core');
const { createSeededRng } = require('../../js/online/protocol');
let failed = 0;
const check = (name, fn) => { try { fn(); console.log('OK ' + name); } catch (e) { failed++; console.error('NG ' + name + '\n' + e.message); } };
function contactModes(keyword, foes, side = 'p1') {
  const other = side === 'p1' ? 'p2' : 'p1';
  const attacker = { id: 'a', name: '攻撃者', atk: 3, hp: 50, maxHp: 50, keywords: [keyword] };
  const state = core.createBattleState({ sides: { [side]: { units: [attacker] }, [other]: { units: foes } } });
  state._coreFirstSide = side;
  const events = [];
  core.createBattleRunner(state, createSeededRng(7), e => events.push(e), { skipOpening: true }).step();
  return events.filter(e => e.type === 'attack_contact_vfx').map(e => e.modes.join('+'));
}
const foe = (id, lane = 'front') => ({ id, name: id, atk: 1, hp: 30, maxHp: 30, keywords: [], lane });
for (const side of ['p1', 'p2']) {
  for (const kw of ['全体攻撃', '三方向攻撃', '貫通']) {
    check(`${side}：${kw}は敵1体なら接触演出なし`, () => assert.deepEqual(contactModes(kw, [foe('f0')], side), []));
  }
  check(`${side}：全体攻撃は敵2体以上なら接触演出あり`, () => assert.deepEqual(contactModes('全体攻撃', [foe('f0'), foe('f1')], side), ['all']));
}
check('再生：全体攻撃は敵が1列だけなら白い芯の横一閃（K009_SWEEP）、同じ音で登録', () => {
  const render = fs.readFileSync(path.join(__dirname, '../../js/engine/render.js'), 'utf8');
  assert.match(render, /sweep\?'K009_SWEEP':getKeywordAssetKey\('全体攻撃'\)/);
  const assets = fs.readFileSync(path.join(__dirname, '../../assets.js'), 'utf8');
  assert.match(assets, /K009_SWEEP: 'assets\/sfx\/K009\.wav'/);
  const present = fs.readFileSync(path.join(__dirname, '../../js/battle/present.js'), 'utf8');
  assert.match(present, /K009_SWEEP:\['all-sweep',\.04,'foes'\]/);
});
if (failed) { process.exitCode = 1; console.error(`範囲攻撃1020：${failed}件NG`); } else console.log('範囲攻撃1020：OK');
