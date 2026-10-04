'use strict';

// コードへ直書きされた敵／NPC番号が、現在の内蔵シートに存在し、用途上の名前とも一致するかを監査する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sheetData = require('./sheet_data');

const ROOT = path.resolve(__dirname, '../..');
const SKIP = new Set([
  path.join(ROOT, 'js/data/local_xlsx_data.js'),
  path.join(ROOT, 'tools/_data_before_tmp.js'),
  __filename,
]);
const expectedNamePart = {
  BC002: 'ファラ',
  BC003: 'シーリーン',
  BC004: 'ディナ',
  EN020: 'ダイアウルフ',
  EN027: 'ガルム',
  EN038: 'ワイルドハント',
  EN025: 'グレーターデーモン',
  EN040: 'ブラッドロード',
  EN041: 'サンダーバード',
  EN042: 'グレイプニル',
  EN043: 'シンドリ',
  EN044: 'グンダ',
  EN045: 'エギル',
  EN046: 'ヘイズ',
  EN047: 'アレス',
  EN048: 'ベイティル',
  EN049: 'マウンテンジャイアント',
  EN050: 'ストーンジャイアント',
  EN051: 'グリムリーパー',
  EN052: 'イモータル',
  EN053: 'エンシェントドラゴン',
  EN054: 'カオスドラゴン',
  EN055: 'サージェント・デビル',
  EN056: 'アビス・バロン',
  EN057: 'アークデーモン',
  EN058: 'メフィスト',
  EN059: 'エイトヴォルム',
  EN060: 'スコル・ハティ',
  EN061: 'フォルセティ',
  EN062: 'ティアマリス',
  EN063: 'ゲルミール',
  EN064: 'バイコーン',
  EN065: 'スレイプニル',
  EN066: 'ヘカトンケイル',
  EN067: 'センチネル',
  EN074: 'エピトメ',
  EN075_1: 'ウルズ・ラグナ',
  EN075_2: 'ルミア',
  EN075_3: 'ウムブラ',
};

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(file));
    else if (entry.name.endsWith('.js') && !SKIP.has(file)) out.push(file);
  }
  return out;
}

const definitions = new Map();
for (const row of [...sheetData.sheetRows('char'), ...sheetData.sheetRows('enemy')]) {
  const code = String(row['No.'] || '').trim().toUpperCase();
  if (code) definitions.set(code, String(row['名前'] || '').trim());
}

const references = new Map();
for (const file of [path.join(ROOT, 'assets.js'), ...sourceFiles(path.join(ROOT, 'js')), ...sourceFiles(path.join(ROOT, 'tools'))]) {
  const rel = path.relative(ROOT, file);
  const source = fs.readFileSync(file, 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(/\b(?:EN\d{3}(?:_\d+)?|BC\d{3}|NPC\d{3})\b/g)) {
      const code = match[0].toUpperCase();
      if (!references.has(code)) references.set(code, []);
      references.get(code).push(`${rel}:${index + 1}`);
    }
  });
}

const legacyAllowed = new Set(['js/save/migrations.js']);
for (const [code, locations] of references) {
  if (/^NPC\d{3}$/.test(code)) {
    const invalid = locations.filter(loc => !legacyAllowed.has(loc.split(':')[0]));
    assert.deepEqual(invalid, [], `旧NPC番号 ${code} が移行処理以外に残っています`);
    continue;
  }
  assert.ok(definitions.has(code), `${code} が現在の内蔵シートに存在しません: ${locations.join(', ')}`);
}
for (const [code, part] of Object.entries(expectedNamePart)) {
  assert.ok(definitions.has(code), `${code} が現在の内蔵シートに存在しません`);
  assert.ok(definitions.get(code).includes(part), `${code} の名前が想定と違います: ${definitions.get(code)}`);
}

const used = [...references.keys()].filter(code => !/^NPC/.test(code)).sort();
console.log('ID参照監査 OK');
used.forEach(code => console.log(`${code}\t${definitions.get(code)}\t${references.get(code).length}箇所`));
