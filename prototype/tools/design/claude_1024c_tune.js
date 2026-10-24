#!/usr/bin/env node
'use strict';
// 2026-10-24 Claude：今のコアで動く案を fixed_compare で測り、同じ種類・同じレアリティの既存の幅（中央値〜上位10%）に入るよう
// 効果の数値を1段ずつ上げ下げする（最大3回）。結果は claude_1024c/tuned.json（id → 調整後の文・ATK/HP・計測値）。
// 1段：効果文と強化効果の中の数（回数・マナの閾値・召喚の数は除く）を通常は±1、強化は±2。数が無い効果は HP を±1。
const fs = require('node:fs'), path = require('node:path');
const OUT = path.join(__dirname, 'claude_1024c');
const BAND = JSON.parse(fs.readFileSync(path.join(OUT, 'effects_band_1024.json'), 'utf8'));
process.env.VB_DESIGN_RAW = '1';
const { ALL } = require('./claude_1024c_cards');
const tunedPath = path.join(OUT, 'tuned.json');
const tuned = fs.existsSync(tunedPath) ? JSON.parse(fs.readFileSync(tunedPath, 'utf8')) : {};
function step(text, dir, mult) {
  // 「Nマナ毎：」「Nマナ：」の閾値、「N体」は変えない。+X/+Y・ATK+N・HP+N・毒N・弱体N・Nダメージ・N血・Nマナを得る を動かす。
  return text.replace(/(\+|毒|弱体|ATK\+|HP\+)(\d+)|(\d+)(ダメージ|血を得る|マナを得る)/g, (m, pre, n1, n2, post) => {
    const n = +(n1 || n2), v = Math.max(1, n + dir * mult);
    return pre ? pre + v : v + post;
  });
}
function current(c) { return tuned[c.id] ? { ...c, ...tuned[c.id] } : c; }
async function measure(cards, tag) {
  const add = cards.map(c => ({ id: 'c1024c_' + c.id, name: c.name, category: c.category, color: c.color, rarity: c.rarity, grade: 1, power: c.atk, life: c.hp, desc: c.text, mergedDesc: c.up, directionCount: 2, keywords: [] }));
  const ov = path.join(OUT, 'override_' + tag + '.json'), dir = path.join(OUT, 'measure_' + tag);
  fs.writeFileSync(ov, JSON.stringify({ add }, null, 1));
  await require('../balance_sim/fixed_compare').main(['--override', ov, '--cards', add.map(c => c.name).join(','), '--out', dir, '--workers', '6']);
  const lines = fs.readFileSync(path.join(dir, 'comparisons.jsonl'), 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.form === '通常');
  const by = {}; for (const r of lines) (by[r.name] ??= []).push(r.gainWinPt);
  return Object.fromEntries(cards.map(c => [c.id, (by[c.name] || []).reduce((s, x) => s + x, 0) / Math.max(1, (by[c.name] || []).length)]));
}
const verdict = (c, v) => { const b = BAND[c.category + 'R' + c.rarity]; return v < b.median ? -1 : v > b.p90 ? 1 : 0; };
(async () => {
  const first = JSON.parse(fs.readFileSync(path.join(OUT, 'measure.json'), 'utf8'));
  let todo = first.filter(r => r.verdict !== '幅の中').map(r => ALL.find(c => c.id === r.id)).map(current);
  const values = Object.fromEntries(first.map(r => [r.id, r.value]));
  for (let round = 1; round <= 3 && todo.length; round++) {
    const next = todo.map(c => {
      const d = -verdict(c, tuned[c.id] ? tuned[c.id].value : values[c.id]);
      const text = step(c.text, d, 1), up = step(c.up, d, 2);
      const changed = text !== c.text;
      return { ...c, text, up, hp: changed ? c.hp : Math.max(1, c.hp + d) };
    });
    const got = await measure(next, 'r' + round);
    for (const c of next) tuned[c.id] = { text: c.text, up: c.up, atk: c.atk, hp: c.hp, value: +got[c.id].toFixed(1), round };
    fs.writeFileSync(tunedPath, JSON.stringify(tuned, null, 1));
    todo = next.filter(c => verdict(c, got[c.id]) !== 0);
    console.log(`第${round}回：${next.length}案を調整し、幅の外が ${todo.length} 案`);
    todo.forEach(c => { const b = BAND[c.category + 'R' + c.rarity]; console.log(`  ${c.id} ${c.name} ${got[c.id].toFixed(1)}pt（中央値 ${b.median}・上位10% ${b.p90}） ${c.text}`); });
  }
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
