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
    return row;
  }).filter(row => String(row['名前'] || '').trim());
}

// キャラクターシート → 監査用の共通カード定義。列名はここ1箇所だけで管理する。
function characterCards() {
  return sheetRows('card')
    .filter(row => String(row['効果'] || '').trim())
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
    .filter(row => String(row['効果'] || '').trim())
    .map(row => ({
      name: String(row['名前'] || '').trim(),
      keywords: String(row['キーワード'] || '').split(/[\s　]+/).filter(Boolean),
      desc: String(row['効果'] || ''),
    }));
}

module.exports = { parseCsv, loadLocalXlsxData, sheetRows, characterCards, enchantCards };
