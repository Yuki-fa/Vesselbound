#!/usr/bin/env node
'use strict';
// 2026-10-24 Claude：claude_1024c_cards.js の効果案を検証する。
//  1. 形式：回数制限・予約の言い回しが無い、1枚1効果、レアリティの割合
//  2. 既存との重複：同じトリガ・同じ文型（数字を伏せて同じ）・同じ色の既存カードがあれば「重複」
//  3. 発動：kind='core' の案が、そのカードの種類（キャラ／エンチャント）で今のコアで発動するか（通常・強化）
//  4. 強さ：発動した core 案を fixed_compare（--override の add）で測り、同じ種類・同じレアリティの既存の幅と比べる
//  使い方：node tools/design/claude_1024c_eval.js [--measure]
const fs = require('node:fs'), path = require('node:path');
const C = require('../../js/battle/core');
const { ALL } = require('./claude_1024c_cards');
const OUT = path.join(__dirname, 'claude_1024c');
const BAND = JSON.parse(fs.readFileSync(path.join(OUT, 'effects_band_1024.json'), 'utf8'));
const { loadLocalXlsxData, parseCsv } = require('../balance_sim/sheet_data');
fs.mkdirSync(OUT, { recursive: true });

function rows(key) { const rs = parseCsv(loadLocalXlsxData()[key]); const h = rs.shift(); return rs.map(r => Object.fromEntries(h.map((f, i) => [f, r[i] || '']))); }
const existing = [...rows('card'), ...rows('enchant')].filter(r => r['名前'] && r['効果']);
const mask = s => String(s).normalize('NFKC').replace(/\d+/g, 'N').replace(/[\s。]/g, '');
const existingMasked = new Map();
for (const r of existing) for (const line of r['効果'].split('\n')) existingMasked.set(mask(line), (existingMasked.get(mask(line)) || []).concat(r['No.'] + ' ' + r['名前']));

function probe(text, category) {
  const m = text.match(/^([^：]+)：/); if (!m) return { ok: false, why: 'トリガ無し' };
  let trigger = m[1];
  if (/^\d+マナ/.test(trigger)) trigger = trigger.replace(/\d+/, d => d);
  const side = 'p1', enemy = 'p2', mana = text.match(/^(\d+)マナ(毎)?：/);
  const body = { id: 'owner', name: '設計検証本体', color: '緑', atk: 20, hp: 100, maxHp: 100, keywords: [], desc: text, lane: 'front', ...(mana ? { manaCost: +mana[1], manaRepeat: !!mana[2] } : {}) };
  if (category === 'エンチャント') { body.name = '接続先'; body.desc = ''; body._adjacentPanelEffectTexts = [text]; body.effectData = { effectTexts: [text], effectNames: ['設計検証エンチャント'] }; }
  const friends = ['赤', '青', '緑', '黄', '紫'].map((color, i) => ({ id: 'friend' + i, name: '検査友' + i, color, atk: 20, hp: 100, maxHp: 100, keywords: i === 0 ? ['眷属'] : [], desc: '', lane: i < 3 ? 'front' : 'rear' }));
  const foes = ['赤', '青', '緑', '黄', '紫'].map((color, i) => ({ id: 'foe' + i, name: '検査敵' + i, color, atk: 100, hp: 200, maxHp: 200, poison: 3, keywords: [], desc: '', lane: i < 3 ? 'front' : 'rear' }));
  const state = C.coreInitializeBattleState({ units: { [side]: [body, ...friends].map((u, i) => C.createCoreUnit(u, side, i)), [enemy]: foes.map((u, i) => C.createCoreUnit(u, enemy, i)) }, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } }, blood: { p1: 6, p2: 0 }, summonDefs: [], itemDefs: [] });
  const unit = state.units[side][0], events = [], emit = e => events.push(e);
  const rng = { next: () => .3, int: a => a, pick: a => a[0], shuffle: a => a.slice() };
  const hit = (s, t, amount, counter, skip, skipTough, options) => C.coreResolveHit(state, s, t, amount, counter, rng, emit, { skipSourceEffects: skip, skipTough, ...options });
  try {
    if (trigger === '開戦') C.coreApplyOpeningEffects(unit, state, rng, emit, hit, 0);
    else if (trigger === '攻撃') { C.coreTriggerManaOnAttack(unit, state, emit, rng, hit); C.coreApplyAttackEffects(unit, state, rng, emit, hit, 0); }
    else if (trigger === '負傷') C.coreApplyInjuryEffects(unit, 5, state, rng, emit, hit, state.units[enemy][0], 'combat');
    else if (trigger === '死亡') { unit.hp = 0; C.coreApplyDeathEffects(unit, state, rng, emit, hit); }
    else if (/マナ/.test(trigger)) { state.resources[side].mana = +trigger.match(/\d+/)[0]; C.coreApplyManaThresholdEffects(state, rng, emit, hit); }
    else if (trigger === '解放') C.coreApplyReleaseEffects(unit, [], state, rng, emit, hit);
    else return { ok: false, why: 'この確認では扱わないトリガ（' + trigger + '）' };
  } catch (e) { return { ok: false, why: 'エラー ' + String(e.message).slice(0, 60) }; }
  const ev = events.filter(e => !['effect_flash', 'mana_threshold'].includes(e.type));
  return { ok: ev.length > 0, why: ev.length ? ev.slice(0, 2).map(e => e.type).join(',') : '不発', n: ev.length };
}

module.exports = { probe };
if (require.main !== module) return;
const issues = [], report = [];
const RAR = { キャラクター: { 1: 8, 2: 6, 3: 4, 4: 2 }, エンチャント: { 1: 15, 2: 15, 3: 12, 4: 8 } };
for (const col of ['赤', '青', '緑', '黄', '紫']) {
  const cs = ALL.filter(c => c.color === col);
  if (cs.length !== 20) issues.push(`${col}が${cs.length}枚`);
  for (const [r, n] of Object.entries(RAR['キャラクター'])) if (cs.filter(c => c.rarity === +r).length !== n) issues.push(`${col}のR${r}が${cs.filter(c => c.rarity === +r).length}枚（${n}枚の予定）`);
}
const ens = ALL.filter(c => c.category === 'エンチャント');
if (ens.length !== 50) issues.push(`エンチャントが${ens.length}枚`);
for (const [r, n] of Object.entries(RAR['エンチャント'])) if (ens.filter(c => c.rarity === +r).length !== n) issues.push(`エンチャントのR${r}が${ens.filter(c => c.rarity === +r).length}枚（${n}枚の予定）`);
for (const c of ALL) {
  const row = { ...c, flags: [] };
  for (const t of [c.text, c.up]) {
    if (/回まで|初めて|まだこの効果|1戦闘に|次の味方手番/.test(t)) row.flags.push('回数制限・予約');
    if ((t.match(/。/g) || []).length > 2 || t.split(/(?<=。)/).filter(s => /^[^：]+：/.test(s)).length > 1) row.flags.push('2効果');
  }
  const dup = existingMasked.get(mask(c.text));
  if (dup) row.flags.push('既存と同じ文型：' + dup.join('・'));
  if (c.kind === 'core') {
    const a = probe(c.text, c.category), b = probe(c.up, c.category);
    row.probe = a.ok && b.ok ? '発動' : '不発（通常 ' + a.why + ' / 強化 ' + b.why + '）';
    if (!(a.ok && b.ok)) row.flags.push('core 不発');
  }
  report.push(row);
}
const masked = new Map();
for (const c of ALL) { const k = mask(c.text); masked.set(k, (masked.get(k) || []).concat(c.id)); }
for (const [k, ids] of masked) if (ids.length > 1) issues.push('案同士で同じ文型：' + ids.join('・'));
fs.writeFileSync(path.join(OUT, 'eval.json'), JSON.stringify({ issues, report }, null, 1));
console.log('案', ALL.length, '（core', ALL.filter(c => c.kind === 'core').length, '/ new', ALL.filter(c => c.kind === 'new').length, '）');
console.log('全体の問題', issues.length); issues.forEach(i => console.log('  ' + i));
const flagged = report.filter(r => r.flags.length);
console.log('個別の問題', flagged.length);
flagged.forEach(r => console.log(`  ${r.id} ${r.name}: ${r.flags.join(' / ')}${r.probe && r.probe !== '発動' ? ' ' + r.probe : ''}`));

if (process.argv.includes('--measure')) {
  const fired = report.filter(r => r.kind === 'core' && r.probe === '発動' && !r.flags.some(f => /既存と同じ/.test(f)));
  const add = fired.map(c => ({ id: 'c1024c_' + c.id, name: c.name, category: c.category, color: c.color, rarity: c.rarity, grade: 1, power: c.atk, life: c.hp, desc: c.text, mergedDesc: c.up, directionCount: 2, keywords: [] }));
  fs.writeFileSync(path.join(OUT, 'override.json'), JSON.stringify({ add }, null, 1));
  const dir = path.join(OUT, 'measure');
  const args = ['--override', path.join(OUT, 'override.json'), '--cards', add.map(c => c.name).join(','), '--out', dir, '--workers', '6'];
  require('../balance_sim/fixed_compare').main(args).then(() => {
    const lines = fs.readFileSync(path.join(dir, 'comparisons.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.form === '通常');
    const by = {}; for (const r of lines) (by[r.name] ??= []).push(r.gainWinPt);
    const res = fired.map(c => {
      const vs = by[c.name] || [], v = vs.reduce((s, x) => s + x, 0) / Math.max(1, vs.length), b = BAND[c.category + 'R' + c.rarity];
      const verdict = !vs.length ? '未計測' : v < b.median ? '弱い' : v > b.max ? '強すぎ' : v > b.p90 ? '上位10%超' : '幅の中';
      return { id: c.id, name: c.name, category: c.category, rarity: c.rarity, value: +v.toFixed(1), median: b.median, p90: b.p90, max: b.max, verdict, n: vs.length };
    });
    fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(res, null, 1));
    const cnt = {}; res.forEach(r => cnt[r.verdict] = (cnt[r.verdict] || 0) + 1);
    console.log('\n計測', res.length, cnt);
    res.filter(r => r.verdict !== '幅の中').forEach(r => console.log(`  ${r.id} ${r.name} R${r.rarity} ${r.value}pt（中央値 ${r.median}・上位10% ${r.p90}・最大 ${r.max}）→ ${r.verdict}`));
  }).catch(e => { console.error(e.stack || e); process.exitCode = 1; });
}
