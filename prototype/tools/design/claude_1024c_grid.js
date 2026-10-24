#!/usr/bin/env node
'use strict';
// 2026-10-24 Claude：効果案の設計の前に、「トリガ×効果の本体」のどの組み合わせを今のコアが実際に処理するかを総当たりで確かめる。
// 発動の確かめ方は proposal_1024_probe.js（Codex 作）の run() と同じ：本体1体＋5色の味方＋5色の敵（毒3）で、そのトリガの入口を呼び、
// effect_flash・mana_threshold 以外のイベントが出たら「発動」。値まで合っているかは数の一致で見る。
// 出力：tools/design/claude_1024c/grid.json と標準出力の表。
const fs = require('node:fs'), path = require('node:path');
const C = require('../../js/battle/core');
const OUT = path.join(__dirname, 'claude_1024c');
function run(text, trigger, category) {
  const side = 'p1', enemy = 'p2';
  const mana = text.match(/^(\d+)マナ(毎)?：/);
  const body = { id: 'owner', name: '設計検証本体', color: '緑', atk: 20, hp: 100, maxHp: 100, keywords: [], desc: text, lane: 'front',
    ...(mana ? { manaCost: +mana[1], manaRepeat: !!mana[2] } : {}) };
  if (category === 'エンチャント') { body.name = '接続先'; body.desc = ''; body._adjacentPanelEffectTexts = [text]; body.effectData = { effectTexts: [text], effectNames: ['設計検証エンチャント'] }; }
  const friends = ['赤', '青', '緑', '黄', '紫'].map((color, i) => ({ id: 'friend' + i, name: '検査友' + i, color, atk: 20, hp: 100, maxHp: 100, keywords: i === 0 ? ['眷属'] : [], desc: '', lane: i < 3 ? 'front' : 'rear' }));
  const foes = ['赤', '青', '緑', '黄', '紫'].map((color, i) => ({ id: 'foe' + i, name: '検査敵' + i, color, atk: 100, hp: 200, maxHp: 200, poison: 3, keywords: [], desc: '', lane: i < 3 ? 'front' : 'rear' }));
  const state = C.coreInitializeBattleState({ units: { [side]: [body, ...friends].map((u, i) => C.createCoreUnit(u, side, i)), [enemy]: foes.map((u, i) => C.createCoreUnit(u, enemy, i)) },
    resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, blood: { p1: 6, p2: 0 }, summonDefs: [], itemDefs: [] });
  const unit = state.units[side][0], events = [], emit = e => events.push(e);
  const rng = { next: () => .3, int: a => a, pick: a => a[0], shuffle: a => a.slice() };
  const hit = (s, t, amount, counter, skip, skipTough, options) => C.coreResolveHit(state, s, t, amount, counter, rng, emit, { skipSourceEffects: skip, skipTough, ...options });
  try {
    if (trigger === '開戦') C.coreApplyOpeningEffects(unit, state, rng, emit, hit, 0);
    if (trigger === '攻撃') { C.coreTriggerManaOnAttack(unit, state, emit, rng, hit); C.coreApplyAttackEffects(unit, state, rng, emit, hit, 0); }
    if (trigger === '負傷') C.coreApplyInjuryEffects(unit, 5, state, rng, emit, hit, state.units[enemy][0], 'combat');
    if (trigger === '死亡') { unit.hp = 0; C.coreApplyDeathEffects(unit, state, rng, emit, hit); }
    if (/マナ/.test(trigger)) { state.resources[side].mana = +trigger.match(/\d+/)[0]; C.coreApplyManaThresholdEffects(state, rng, emit, hit); }
    if (trigger === '解放') { if (C.coreApplyReleaseEffects) C.coreApplyReleaseEffects(unit, [], state, rng, emit, hit); }
  } catch (e) { return { error: String(e.message || e).slice(0, 80), events: [] }; }
  return { events: events.filter(e => !['effect_flash', 'mana_threshold'].includes(e.type)) };
}
const TRIGGERS = ['開戦', '攻撃', '負傷', '死亡', '3マナ毎', '解放'];
const BODIES = [
  'このキャラクターは+3/+3を得る。', 'このキャラクターはATK+4を得る。', 'このキャラクターはHP+6を得る。',
  '全ての味方は+1/+1を得る。', '全ての味方はHP+2を得る。', '全ての味方はATK+2を得る。',
  '全ての赤の味方は+2/+2を得る。', '全ての青の味方はATK+2を得る。',
  'ランダムな味方は+3/+2を得る。', 'ランダムな赤の味方は+3/+3を得る。', 'ランダムな赤の味方2体は+3/+2を得る。',
  'ランダムな赤、青、緑の味方1体ずつは+2/+2を得る。', 'ランダムな異なる色の味方1体ずつは+2/+2を得る。',
  'このキャラクター以外のランダムな味方は+3/+3を得る。', 'ランダムな前衛の味方は+3/+3を得る。', 'ランダムな後衛の味方はATK+4を得る。',
  'ランダムな敵に4ダメージを与える。', 'ランダムな敵2体に3ダメージを与える。', 'ランダムな敵3体に1ダメージを与える。',
  '全ての敵に2ダメージを与える。', '全てのキャラクターに1ダメージを与える。', 'ランダムな前衛の敵に5ダメージを与える。', 'ランダムな後衛の敵に5ダメージを与える。',
  '全ての敵に毒2を与える。', 'ランダムな敵に毒3を与える。', '全ての敵に弱体1を与える。', 'ランダムな敵に弱体2を与える。',
  '全ての敵はATK-1を得る。', 'ランダムな敵はATK-2を得る。', '全ての敵は-1/-1を得る。',
  'ランダムな味方は結界を得る。', 'このキャラクターは結界を得る。', 'ランダムな味方は復活を得る。', 'ランダムな味方は根性を得る。',
  'ランダムな味方は加護1を得る。', '全ての味方は熟練1を得る。', 'このキャラクターは毒牙1を得る。', 'このキャラクターは邪眼1を得る。',
  '1マナを得る。', '2マナを得る。', '血を2得る。', '2血を得る。',
  '「緑ウルフ」を召喚する。', '「青スケルトン」を召喚する。', '「黄ナイトキャット」を召喚する。',
  '全ての敵の毒を発動させる。', '全ての敵の毒を2倍にする。',
  'ランダムな味方のマナ効果を発動する。', 'ランダムな味方の負傷効果を発動する。', 'ランダムな味方の開戦効果を発動する。', 'ランダムな味方の死亡効果を発動する。',
  'このキャラクターのATKを2倍にする。', 'このキャラクターのHPを2倍にする。',
  'ランダムな味方はHP+Xを得る。Xは血に等しい。', '全ての味方はATK+Xを得る。Xは血に等しい。',
  'ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい。', 'ランダムな敵にXダメージを与える。XはこのキャラクターのHPに等しい。',
  'このキャラクターのATKをランダムな味方に与える。', 'ランダムな敵の毒を発動させる。',
  '全ての眷属は+2/+2を得る。', '全ての味方の眷属は+2/+2を得る。', 'この戦闘中、味方の眷属は+1/+1を得る。',
];
fs.mkdirSync(OUT, { recursive: true });
const grid = {};
for (const body of BODIES) {
  grid[body] = {};
  for (const t of TRIGGERS) {
    const text = t + '：' + body, r = run(text, t, 'キャラクター');
    grid[body][t] = r.error ? 'ERR' : r.events.length ? r.events.map(e => e.type + (e.effect ? ':' + e.effect : '') + (e.atk != null || e.hp != null ? `(${e.atk || 0}/${e.hp || 0})` : e.amount != null ? `(${e.amount})` : '')).slice(0, 3).join(',') : '';
  }
}
fs.writeFileSync(path.join(OUT, 'grid.json'), JSON.stringify(grid, null, 1));
const mark = v => v === 'ERR' ? '!' : v ? '○' : '・';
console.log('本体'.padEnd(36) + TRIGGERS.map(t => t.padStart(4)).join(' '));
for (const body of BODIES) console.log(body.slice(0, 34).padEnd(36) + TRIGGERS.map(t => mark(grid[body][t]).padStart(4)).join(' '));
