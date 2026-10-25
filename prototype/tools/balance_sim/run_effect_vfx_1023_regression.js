'use strict';
// 2026-10-23 利用者指摘：「LABと合わせてVFXの再検証を行ってください。ゴーレムなど、出なくなったものがあります。」
// 全カードの照合（tools/parity/lab_vfx_sweep.js、改訂前の版と比較）で見つかった抜け：
//  - シート改訂で能力変化から run_effect（報酬とトレーダーの強化・リロール・接続エンチャントの強化）へ変わった効果に演出が無かった
//    （ゴーレム・ファミリア・ユミル・グリマルキン）。トリガを載せ、トリガのバフ演出（S005〜S009）を出す。
//  - ラミア「負傷&死亡：全ての敵に毒2を与える。」の死亡で毒が入っていなかった（コア）。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initialize } = require('./run_bot');
let checked = 0, failed = 0;
function check(name, fn) {
  try { fn(); checked++; console.log('OK ' + name); }
  catch (e) { failed++; console.log('NG ' + name + '\n' + (e && e.stack || e)); }
}
(async () => {
  await initialize();
  // 検査用の場面（LAB の実戦検査と同じ作り方）。間接 eval で大域に置く。
  (0, eval)(fs.readFileSync(path.join(__dirname, '../parity/lab_vfx_fixtures.js'), 'utf8'));
  const fire = (no, trigger) => {
    const s = vbLabVfxFixture(no), events = [], rng = createSeededRng(53), emit = e => events.push(e);
    const hit = (a, b, amount, c, ss, st, opt) => coreResolveHit(s, a, b, amount, c, rng, emit, { skipSourceEffects: !!ss, skipTough: !!st, ...(opt || {}) });
    vbLabVfxTriggers[trigger](s, s.units.p1[0], rng, emit, hit);
    return { s, events };
  };
  check('ラミアは負傷でも死亡でも全ての敵に毒2を与える', () => {
    for (const trigger of ['injury', 'death']) {
      const { s, events } = fire('C011', trigger);
      assert.deepEqual(s.units.p2.map(u => u.poison), [5, 5, 5], trigger);
      assert.equal(events.filter(e => e.type === 'keyword_effect' && e.effect === 'poison').length, 3, trigger);
    }
  });
  // 2026-10-25 利用者指定：効果の種類ごとの専用演出へ（報酬への祝福・神秘のオーラ・煌めき／光の柱）。
  check('run_effect はトリガを載せ、効果の種類ごとの専用演出を出す', () => {
    const golem = fire('C008', 'injury').events.find(e => e.type === 'run_effect');
    assert.equal(golem.kind, 'reward_buff'); assert.equal(golem.trigger, '負傷');
    assert.equal(presentRunEffectVfxCode(golem), 'C114', 'ゴーレム（負傷）＝報酬への祝福');
    const familiar = fire('C114', 'attack').events.find(e => e.type === 'run_effect');
    assert.equal(familiar && familiar.trigger, '攻撃'); assert.equal(presentRunEffectVfxCode(familiar), 'C114', 'ファミリア（攻撃）＝報酬への祝福');
    const ymir = fire('C062', 'battleEnd').events.find(e => e.type === 'run_effect' && e.kind === 'reroll');
    assert.equal(ymir && ymir.trigger, '終戦'); assert.equal(presentRunEffectVfxCode(ymir), 'C062', 'ユミル（終戦）＝神秘のオーラ');
    assert.equal(presentRunEffectVfxCode({ type: 'run_effect', kind: 'enchant_upgrade', trigger: '終戦', targetSlots: [] }), 'C095_1', '強化しなかった回（あとX戦）は小さな煌めき');
    assert.equal(presentRunEffectVfxCode({ type: 'run_effect', kind: 'enchant_upgrade', trigger: '終戦', targetSlots: [2] }), 'C095', 'グリマルキン（4回目の終戦）＝光の柱');
    for (const [code, name] of [['C114', 'reward-blessing'], ['C062', 'ymir-aura'], ['C095', 'grimalkin-pillar'], ['C095_1', 'grimalkin-glint'], ['R018', 'revival-ring']])
      assert.equal(getVfxDefinitionName(getCharacterEffectVfxPath({ fxCode: code })), name, code + ' の演出');
    // 2026-10-25 利用者指定：ゴーレム（負傷）は負傷のバフ演出 S006 を祝福と同時に出す。ファミリア（攻撃）は祝福だけ。
    assert.equal(presentRunEffectCompanionVfxCode(golem), 'S006', 'ゴーレム＝負傷のバフ演出を重ねる');
    assert.equal(presentRunEffectCompanionVfxCode(familiar), '', 'ファミリア＝重ねない');
    assert.equal(getEffectSfxKey('C095_1'), 'C095_1', '枝番の SE も引ける');
  });
  check('PvE とオンラインの受け口が同じ処理を呼ぶ', () => {
    for (const f of ['js/engine/battle_events.js', 'js/online/board.js'])
      assert.match(fs.readFileSync(path.join(__dirname, '../..', f), 'utf8'), /presentRunEffectEvent\(/, f);
  });
  console.log(`ラン効果VFX1023：${checked}件成功・${failed}件失敗`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
