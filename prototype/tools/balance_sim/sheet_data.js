'use strict';

// マスターデータ（local_xlsx_data.js）のシートを「ヘッダ名」で読むための共通入口。
//
// 本体の js/data/loader.js はヘッダ名で読んでいるため、シートへ列を足しても壊れない。
// 一方でこのbalance_sim配下のハーネスは列位置（r[11] 等）で読んでいたため、
// 既存列の前に列を1本挿すだけで「別の列を効果文だと思って読む」壊れ方をしていた。
// 列の追加・並べ替えに耐えるよう、参照は必ずこのモジュール経由にすること。
const fs = require('node:fs');

function parseCsv(source) {
  const rows = [], row = [];
  let value = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted && c === '"' && source[i + 1] === '"') { value += '"'; i++; continue; }
    if (c === '"') { quoted = !quoted; continue; }
    if (!quoted && c === ',') { row.push(value); value = ''; continue; }
    if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(value); rows.push(row.splice(0)); value = ''; continue;
    }
    value += c;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

let _cache = null;
function loadLocalXlsxData() {
  if (_cache) return _cache;
  const source = fs.readFileSync(require.resolve('../../js/data/local_xlsx_data.js'), 'utf8');
  _cache = JSON.parse(source.match(/= (\{.*\});/s)[1]);
  return _cache;
}

// シート名（local_xlsx_data.js のキー）→ ヘッダ名で引ける行オブジェクトの配列。
// 見出し行は除外し、名前が空の行も落とす。
function sheetRows(key) {
  const data = loadLocalXlsxData();
  const rows = parseCsv(String(data[key] || ''));
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || '').trim());
  return rows.slice(1).map(cells => {
    const row = {};
    headers.forEach((h, i) => { if (h) row[h] = cells[i]; });
    // 2026-10-19：シートの列名「合体効果／合体キーワード」は「強化効果／強化キーワード」へ改名。検査は旧名でも読めるよう揃える。
    if (row['強化効果'] != null && row['合体効果'] == null) row['合体効果'] = row['強化効果'];
    if (row['強化キーワード'] != null && row['合体キーワード'] == null) row['合体キーワード'] = row['強化キーワード'];
    return row;
  }).filter(row => String(row['名前'] || '').trim());
}

// キャラクターシート → 監査用の共通カード定義。列名はここ1箇所だけで管理する。
function characterCards() {
  return sheetRows('card')
    .filter(row => String(row['実装']).toLowerCase() !== 'false')
    .map(row => ({
      name: String(row['名前'] || '').trim(),
      power: Number(row['パワー']) || 0,
      life: Number(row['ライフ']) || 0,
      color: String(row['カラー'] || '').trim(),
      keywords: String(row['キーワード'] || '').split(/[\s　]+/).filter(Boolean),
      desc: String(row['効果'] || ''),
    }));
}

// 強化（エンチャント）シート → 同上。
function enchantCards() {
  return sheetRows('enchant')
    .filter(row => String(row['実装']).toLowerCase() !== 'false' && String(row['効果'] || '').trim())
    .map(row => ({
      name: String(row['名前'] || '').trim(),
      keywords: String(row['キーワード'] || '').split(/[\s　]+/).filter(Boolean),
      desc: String(row['効果'] || ''),
    }));
}

// 検査の期待値は現行の本文から読む。コアのパーサーを呼ばず独立に回数を求める。
function effectText(no, enhanced = false) {
  const row = [...sheetRows('card'), ...sheetRows('enchant')].find(r => r['No.'] === no);
  if (!row) throw new Error(`シートにカードがない: ${no}`);
  return String((enhanced ? row['強化効果'] ?? row['合体効果'] : row['効果']) || row['効果'] || '').trim();
}
function effectRepetitions(text) {
  const repeat = String(text).match(/(?:これ|この判定)を(?:(\d+)回|もう一度)繰り返す[。.]?\s*$/);
  return repeat ? 1 + (repeat[1] == null ? 1 : Number(repeat[1])) : 1;
}
function damageRepetitions(text) {
  const hits = String(text).match(/ダメージを(\d+)回与える/);
  return (hits ? Number(hits[1]) : 1) * effectRepetitions(text);
}

module.exports = { parseCsv, loadLocalXlsxData, sheetRows, characterCards, enchantCards,
  effectText, effectRepetitions, damageRepetitions };

// 旧演出専用の差分比較は、シート改訂で効果そのものが変わった行を混ぜない。
// 改訂した効果の検証は現行本文の回帰検査へ持たせ、変わらない効果の乱数も守る。
let _sheet1021 = null;
function effectChanged1022(no) {
  if (!_sheet1021) {
    const source = require('node:child_process').execFileSync('git', ['show', 'bf94998:prototype/js/data/local_xlsx_data.js'], { encoding: 'utf8', maxBuffer: 4e6 });
    const data = JSON.parse(source.match(/= (\{.*\});/s)[1]);
    _sheet1021 = new Map();
    for (const key of ['card','enchant']) {
      const rows=parseCsv(data[key]),headers=rows.shift();
      for(const values of rows){const row=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));_sheet1021.set(row['No.'],row);}
    }
  }
  const row=[...sheetRows('card'),...sheetRows('enchant')].find(r=>r['No.']===no),old=_sheet1021.get(no);
  return !row||!old||['名前','効果','強化効果','キーワード','強化キーワード'].some(k=>String(row[k]||'')!==String(old[k]||''));
}
module.exports.effectChanged1022=effectChanged1022;
