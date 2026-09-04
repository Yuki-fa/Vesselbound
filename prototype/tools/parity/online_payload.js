'use strict';
// ═══════════════════════════════════════
// tools/parity/online_payload.js — オンラインへ渡すデータの欠落を機械的に検出する。
//
// これまで見つかったオンライン専用の不具合は、ほぼ全て同じ形だった：
//   **コアが読むフィールドを、オンラインの編成データが送っていない。**
//     ・指輪／アイテム（形が違って丸ごと欠落）
//     ・_tripleMerged（合体カードの強化分が落ちる＝ファントムが3体しか召喚しない）
//     ・manaCost / _manaThresholdDesc（相手のマナ効果が全て不発）
//
// カードを1枚ずつ実機で確かめるのは現実的ではない。ここでは
//   「createCoreUnit() が raw から読むフィールド」と
//   「buildSelfFormation()（versus.js）が送るフィールド」を突き合わせ、
// 送っていないものを一覧で落とす。ブラウザ不要・数秒で終わる。
//
//   node tools/parity/online_payload.js
//
// **新しいフィールドをコアが読むようにしたら、versus.js にも足すこと。**
// 意図的に送らないものは下の ALLOW_MISSING に理由付きで登録する。
// ═══════════════════════════════════════
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const core = read('js/battle/core.js');
const versus = read('js/online/versus.js');

// コアが「盤面へ入ってくる生データ」から読むフィールド。
// createCoreUnit() の中の raw.xxx / raw && raw.xxx を全て拾う。
const createFn = core.slice(core.indexOf('function createCoreUnit'),
  core.indexOf('\nfunction ', core.indexOf('function createCoreUnit') + 10));
const readFields = new Set();
for (const m of createFn.matchAll(/raw(?:\s*&&\s*raw)?\.([A-Za-z_][\w$]*)/g)) readFields.add(m[1]);
// 効果状態の引き継ぎ一覧（召喚・変身の両経路で共有される）も対象にする。
const listBlock = core.slice(core.indexOf('const CORE_UNIT_EFFECT_STATE_FIELDS'),
  core.indexOf('];', core.indexOf('const CORE_UNIT_EFFECT_STATE_FIELDS')));
for (const m of listBlock.matchAll(/'([^']+)'/g)) readFields.add(m[1]);

// versus.js の buildSelfFormation() が送るフィールド。
// buildSelfFormation() の本文全体（次のトップレベル関数の直前まで）を対象にする。
const buildStart = versus.indexOf('function buildSelfFormation');
const buildEndRaw = versus.indexOf('\nfunction ', buildStart + 10);
const buildFn = versus.slice(buildStart, buildEndRaw > 0 ? buildEndRaw : versus.length);
const sentFields = new Set();
// `名前:` の形で書かれているキーを全て拾う（入れ子の effectData も含む）。
for (const m of buildFn.matchAll(/([A-Za-z_][\w$]*)\s*:/g)) sentFields.add(m[1]);

// 送らなくてよいもの。**理由を必ず書くこと。**
const ALLOW_MISSING = {
  side: '陣営は sides.p1 / sides.p2 の位置で決まる',
  slot: '配置は units の並び順で決まる',
  hp: '別途 hp/maxHp として送っている',
  maxHp: '別途送っている',
  atk: '別途送っている',
  id: '別途送っている',
  name: '別途送っている',
  _sealed: '封印状態は戦闘開始時に coreInitSealStates() が決める',
  hate: '戦闘中に付く一時状態',
  hateTurns: '戦闘中に付く一時状態',
  guardian: '戦闘中に付く一時状態（守護パネルは effectData 経由）',
  stealth: 'キーワードから導出される',
  shield: 'キーワードから導出される',
  weaken: '戦闘中に付く一時状態',
  effectData: '中身を個別に送っている',
  keywords: '送信済み（別名で検出できないだけ）',
  boss: 'オンラインにボスはいない',
  _terrainMapNo: '地形はオンラインでは使わない',
  _useEnemyVisualFrame: '敵枠の見た目。再生側が決める',
  _sealInfinity: '封印∞は戦闘中に付く',
  _summonedBySuccubus: '戦闘中に付く',
  _lichShadowSummon: '戦闘中に付く',
  _isObject: '戦闘中に付く',
  _isSoul: '戦闘中に付く',
  _fled: '戦闘中に付く',
  art: '絵の解決は再生側が行う',
  no: 'artCode として送っている',
  artCode: '送信済み',
  imageNo: '絵の解決は再生側が行う',
  effectRepeatBonus: 'effectData.effectRepeatBonus として送っている',
  manaRepeat: 'effectData.manaRepeat として送っている',
  manaThresholdDesc: 'effectData.manaThresholdDesc として送っている',
  extraManaThresholds: 'effectData.extraManaThresholds として送っている',
  _extraManaThresholds: 'effectData.extraManaThresholds として送っている',
  _manaThresholdDesc: 'effectData.manaThresholdDesc として送っている',
  manaThresholdNo: 'effectData.manaThresholdNo として送っている',
  _manaThresholdNo: 'effectData.manaThresholdNo として送っている',
  manaThresholdOrder: 'effectData.manaThresholdOrder として送っている',
  _manaThresholdOrder: 'effectData.manaThresholdOrder として送っている',
  manaOrder: 'effectData.manaOrder として送っている',
  fxCode: 'effectData.fxCode として送っている',
  _effectRepeatBonus: 'effectData.effectRepeatBonus として送っている',
  _releaseAtkBonus: 'effectData.releaseAtkBonus として送っている',
  _releaseHpBonus: 'effectData.releaseHpBonus として送っている',
};

const missing = [...readFields].filter(f => !sentFields.has(f) && !ALLOW_MISSING[f]).sort();

// ── 開戦時の資源 ───────────────────────────
// マナは戦闘ごとの資源で、開戦時は必ず0。オフラインは startBattle() が G.mana=0 に
// 戻してから戦闘へ入るため、オンラインが G.mana（マップで持ち越した分）を初期値として
// 送ると、オンラインだけ開幕から大量のマナを持った状態になる
// （活性化などの「Nマナ毎」が開戦した瞬間に何度も発動して、バフが数倍になった）。
const resourceBlock = (buildFn.match(/resources:\s*\{[\s\S]*?\n      \},/) || [''])[0]
  .replace(/\/\/[^\n]*/g, '');  // コメント文は判定対象にしない
const resourceIssues = [];
if (!resourceBlock) resourceIssues.push('buildSelfFormation() に resources ブロックが見つからない');
else {
  [...resourceBlock.matchAll(/\bmana:\s*([^,\n]+)/g)].forEach(m => {
    if (m[1].trim() !== '0') resourceIssues.push(`開戦時マナが0以外（持ち越しマナを送っている）: mana: ${m[1].trim()}`);
  });
  if (/_ensureMana|G\.mana/.test(resourceBlock)) resourceIssues.push('resources で G.mana / _ensureMana() を読んでいる');
  if (!/p2:/.test(resourceBlock)) resourceIssues.push('resources に p2 がない（相手側の初期資源が未指定）');
}
if (resourceIssues.length) {
  console.log('\n★ 開戦時の資源がオフラインと違う:');
  resourceIssues.forEach(x => console.log(`   ${x}`));
}

console.log(`コアが読むフィールド: ${readFields.size}件 ／ オンラインが送るフィールド: ${sentFields.size}件`);
if (missing.length) {
  console.log('\n★ オンラインへ送っていないフィールド（これがオンライン専用の不具合になる）:');
  missing.forEach(f => console.log(`   ${f}`));
  console.log('\n  versus.js の buildSelfFormation() へ足すか、');
  console.log('  意図的に送らないなら tools/parity/online_payload.js の ALLOW_MISSING へ理由付きで登録すること。');
}
const ng = missing.length + resourceIssues.length;
console.log(`\nオンライン送信データ検証: NG ${ng}`);
process.exitCode = ng ? 1 : 0;
