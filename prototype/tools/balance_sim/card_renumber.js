'use strict';
// カード番号の振り直しの履歴（card_renumber_history.json。tools/renumber_cards.py が書く）。
// 検査が git show で読む「前の版」のソース・ファイル名は振り直し前の番号なので、今の番号へ読み替えてから比べる。
const fs = require('node:fs'), path = require('node:path');
const HISTORY = JSON.parse(fs.readFileSync(path.join(__dirname, 'card_renumber_history.json'), 'utf8'));
// SVG のパス命令（"C100 50"）と取り違えないよう、番号の直後が数字・空白・カンマ・ハイフン・「.数字」のものは触らない（renumber_cards.py と同じ）。
const CODE = /(?<![A-Za-z0-9])(CF?\d{3})(?![\d ,\-]|\.\d)/g;
const PATH_CODE = /(?<![A-Za-z0-9])(CF?\d{3})(?!\d)/g;
function applyAll(text, re, maps) {
  return maps.reduce((s, m) => s.replace(re, (all, code) => m[code] || all), String(text));
}
// 前の版のソースを今の番号へ。
function relabelSource(text) { return applyAll(text, CODE, HISTORY.map(h => h.map)); }
// 前の版のファイル名を今の番号へ／今のファイル名を前の版の番号へ。
function relabelPath(p) { return applyAll(p, PATH_CODE, HISTORY.map(h => h.map)); }
function unrelabelPath(p) {
  return applyAll(p, PATH_CODE, HISTORY.slice().reverse().map(h => Object.fromEntries(Object.entries(h.map).map(([a, b]) => [b, a]))));
}
module.exports = { HISTORY, relabelSource, relabelPath, unrelabelPath };
