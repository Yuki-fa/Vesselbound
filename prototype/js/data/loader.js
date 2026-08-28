// ═══════════════════════════════════════
// loader.js — Google Sheets データローダー
// 起動時に CSV を fetch し UNIT_POOL / FLOOR_DATA /
// BOSS_FLOORS / ENEMY_POOL をインプレースで上書きする。
// fetch 失敗時は内蔵データ（他の data/*.js）をそのまま使用。
// ═══════════════════════════════════════

const _EXPORT_BASE =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vRgSPXHfTa42bU5EZN9lvtFUeeYAapxMGp2RqdE1QNl_5W2PTEtBGvFcdaZf4SGDg' +
  '/pub?output=csv';
function _sheetUrl(gid){ return _EXPORT_BASE + '&gid=' + gid + '&single=true&t=' + Date.now(); }
const _SHEET_GIDS = {
  '階層データ':   393537970,
  '階層レベル':   708322601,
  '深層レベル':   708322601,
  '敵':          724099278,
  'キャラクター': 220248720,
  '強化':        1557039430,
  '指輪':        1483863334,
  '魔導板強化':  496120185,
  'キーワード':  371460212,
  'NPC':         1775007224,
};
var RING_POOL = window.RING_POOL || [];
window.RING_POOL = RING_POOL;

const SHEET_RACE_BY_NAME = {};

function getSheetRaceByName(name) {
  return SHEET_RACE_BY_NAME[_normCardName(name)] || '';
}

// ── CSV パーサー ────────────────────────────────────
function _csvRow(line) {
  const res = [];
  let inQ = false, cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { res.push(cur); cur = ''; }
    else cur += c;
  }
  res.push(cur);
  return res;
}

function _parseCSV(text) {
  // クォート内の改行を保持しながら行に分割
  const rows = [];
  let row = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i + 1] === '"') { row += '""'; i++; }
      else { inQ = !inQ; row += c; }
    } else if (c === '\r') {
      // CR は無視
    } else if (c === '\n' && !inQ) {
      rows.push(row); row = '';
    } else {
      row += c;
    }
  }
  if (row.trim()) rows.push(row);

  if (rows.length < 2) return [];
  const headers = _csvRow(rows[0]).map(h => h.trim());
  return rows.slice(1).map(line => {
    if (!line.trim()) return null;
    const vals = _csvRow(line);
    const obj = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || '').trim();
      obj[`__col${i}`] = v;
      if (h) obj[h] = v;
    });
    return obj;
  // 「名前」列があれば名前ベース、なければ先頭列ベースでフィルタ
  }).filter(row => row && (row['名前'] || row[headers[0]]));
}

function _parseCSVWithHeader(text, headerNames) {
  const rows = [];
  let row = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQ && text[i + 1] === '"') { row += '""'; i++; }
      else { inQ = !inQ; row += c; }
    } else if (c === '\r') {
    } else if (c === '\n' && !inQ) {
      rows.push(row); row = '';
    } else row += c;
  }
  if (row.trim()) rows.push(row);
  const wanted = headerNames || [];
  let headerIdx = rows.findIndex(line => {
    const cols = _csvRow(line).map(h => h.trim());
    return wanted.some(h => cols.includes(h));
  });
  if (headerIdx < 0) return _parseCSV(text);
  const headers = _csvRow(rows[headerIdx]).map(h => h.trim());
  return rows.slice(headerIdx + 1).map(line => {
    if (!line.trim()) return null;
    const vals = _csvRow(line);
    const obj = {};
    headers.forEach((h, i) => {
      const v = (vals[i] || '').trim();
      obj[`__col${i}`] = v;
      if (h) obj[h] = v;
    });
    return obj;
  }).filter(row => row && (row['名前'] || row['カード名'] || row[headers[0]] || row['__col0'] || Object.keys(row).some(k=>/^__col\d+$/.test(k)&&row[k])));
}

// ブラウザで再ダウンロードすると「Vesselbound_data (1).xlsx」のように連番が付くことがある。
// 見つからないと内蔵CSV（local_xlsx_data.js）へ落ちてシートの編集が反映されないため、
// よくある別名も候補に入れる（正規の名前が最優先）。
const _XLSX_PATHS = ['./Vesselbound_data.xlsx', './Vesselbound_data .xlsx', './Vesselbound_data (1).xlsx'];
const _XLSX_SHEETS = {
  floor: '階層データ',
  grade: 'グレードアップ',
  char: 'NPC',
  enemy: '敵',
  keyword: 'キーワード',
  card: 'キャラクター',
  enchant: 'エンチャント',
  item: 'アイテム',
  ring: '指輪',
  mapPanelPower: '魔導板強化',
  deepLevel: '深層レベル',
  region: '地域情報',
  textMessage: 'テキストメッセージ',
};

function _xlsxSheetToCSV(workbook, sheetName, required) {
  const sheet = workbook && workbook.Sheets && workbook.Sheets[sheetName];
  if (!sheet) {
    if (required) throw new Error('xlsx sheet missing: ' + sheetName);
    return '名前\n';
  }
  return XLSX.utils.sheet_to_csv(sheet);
}

function _xlsxSheetToCSVAny(workbook, sheetNames, required) {
  const names = Array.isArray(sheetNames) ? sheetNames : [sheetNames];
  for (const name of names) {
    if (workbook && workbook.Sheets && workbook.Sheets[name]) {
      return XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    }
  }
  if (required) throw new Error('xlsx sheet missing: ' + names.join(' / '));
  return '名前\n';
}

async function _loadGameDataFromEmbeddedXlsx() {
  const data = window.VESSELBOUND_LOCAL_XLSX_CSV;
  if (!data) throw new Error('embedded xlsx data missing');
  console.log('[Vesselbound] embedded XLSX data loaded');
  return {
    source: 'embedded-xlsx',
    ft: data.floor || '名前\n',
    gt: data.grade || '名前\n',
    ct: data.char || '名前\n',
    et: data.enemy || '名前\n',
    kwt: data.keyword || '名前\n',
    pt: data.card || data.panel || '名前\n',
    ent: data.enchant || '名前\n',
    it: data.item || data.items || '名前\n',
    rt: data.ring || data.rings || '名前\n',
    mpt: data.mapPanelPower || data.mapPanel || '名前\n',
    dlt: data.deepLevel || data.floorLevel || '名前\n',
    rgt: data.region || '名前\n',
    tmt: data.textMessage || '名前\n',
  };
}

async function _loadGameDataFromXlsx() {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS XLSX is not loaded');
  let res = null;
  let loadedPath = '';
  for (const path of _XLSX_PATHS) {
    try {
      const trial = await fetch(path);
      if (trial.ok) {
        res = trial;
        loadedPath = path;
        break;
      }
    } catch (_) { /* 次の候補へ */ }
  }
  if (!res) throw new Error('xlsx not found: ' + _XLSX_PATHS.join(', '));
  const buf = await res.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  console.log('[Vesselbound] XLSX path:', loadedPath);
  return {
    source: 'xlsx',
    ft: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.floor, '計算式'], false),
    gt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.grade, false),
    ct: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.char, 'プレイヤー'], false),
    et: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.enemy, false),
    kwt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.keyword, false),
    pt: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.card, 'カード'], false),
    ent: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.enchant, '強化'], false),
    it: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.item, 'アイテム', 'Item'], false),
    rt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.ring, false),
    mpt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.mapPanelPower, false),
    dlt: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.deepLevel, '深層レベル', '階層グレード'], false),
    rgt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.region, false),
    tmt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.textMessage, false),
  };
}

async function _loadGameDataFromGoogleCsv() {
  // 必須シート：階層データ・敵・キャラクター・強化
  const fetches = [
    fetch(_sheetUrl(_SHEET_GIDS['階層データ'])),
    fetch(_sheetUrl(_SHEET_GIDS['敵'])),
    fetch(_sheetUrl(_SHEET_GIDS['キャラクター'])),
    fetch(_sheetUrl(_SHEET_GIDS['強化'])),
  ];
  const responses = await Promise.all(fetches);
  for (const r of responses) {
    if (r && !r.ok) throw new Error('HTTP ' + r.status);
  }
  const [ft, et, pt, ent] = await Promise.all(responses.map(r => r.text()));
  // 任意シート：グレードアップ・NPC・キーワード・指輪（未使用/欠落時は内蔵デフォルトを維持）
  let gt = '名前\n';
  let kwt = '名前\n';
  let ct = '名前\n';
  let rt = '名前\n';
  let mpt = '名前\n';
  let dlt = '名前\n';
  try {
    const kwRes = await fetch(_sheetUrl(_SHEET_GIDS['キーワード']));
    if (kwRes.ok) kwt = await kwRes.text();
  } catch (_) { /* 任意シート */ }
  try {
    const ringRes = await fetch(_sheetUrl(_SHEET_GIDS['指輪']));
    if (ringRes.ok) rt = await ringRes.text();
  } catch (_) { /* 任意シート */ }
  try {
    const mapPowerRes = await fetch(_sheetUrl(_SHEET_GIDS['魔導板強化']));
    if (mapPowerRes.ok) mpt = await mapPowerRes.text();
  } catch (_) { /* 任意シート */ }
  try {
    const deepRes = await fetch(_sheetUrl(_SHEET_GIDS['階層レベル']));
    if (deepRes.ok) dlt = await deepRes.text();
  } catch (_) { /* 任意シート */ }
  try {
    const npcRes = await fetch(_sheetUrl(_SHEET_GIDS['NPC']));
    if (npcRes.ok) ct = await npcRes.text();
  } catch (_) { /* 任意シート */ }
  return { source: 'csv', ft, gt, ct, et, kwt, pt, ent, it: '名前\n', rt, mpt, dlt, rgt: '名前\n', tmt: '名前\n' };
}

async function _ensureMapPanelPowerCsv(mpt) {
  const rows = _parseCSVWithHeader(mpt || '名前\n', ['No.', '名前', '価格', '効果']);
  if (rows.length) return mpt;
  try {
    const res = await fetch(_sheetUrl(_SHEET_GIDS['魔導板強化']));
    if (res && res.ok) return await res.text();
  } catch (_) { /* 任意シート */ }
  return mpt || '名前\n';
}

async function _ensureDeepLevelCsv(dlt) {
  const rows = _parseCSVWithHeader(dlt || '名前\n', ['マップ', '深層レベル', '補正', 'グレード']);
  if (rows.length) return dlt;
  try {
    const res = await fetch(_sheetUrl(_SHEET_GIDS['階層レベル']));
    if (res && res.ok) return await res.text();
  } catch (_) { /* 任意シート */ }
  return dlt || '名前\n';
}

// ── "1-3" または "3" 形式の文字列を {val, range:[min,max]} にパース ──
// シートで「∞」「♾️」と書かれたパワー／ライフは、実質無限として扱う大きな数に読み替える。
const SHEET_INFINITY_VALUE = 99999;
function _parseIntRange(s, fallback) {
  if (!s || !String(s).trim()) return { val: fallback, range: [fallback, fallback] };
  const raw = String(s).trim();
  if (/^(?:∞|♾️?|inf(?:inity)?)$/i.test(raw)) {
    return { val: SHEET_INFINITY_VALUE, range: [SHEET_INFINITY_VALUE, SHEET_INFINITY_VALUE] };
  }
  const dateLike = raw.match(/^20\d{2}[-\/](\d{1,2})[-\/](\d{1,2})(?:\s|$)/);
  if (dateLike) {
    const a = parseInt(dateLike[1], 10);
    const b = parseInt(dateLike[2], 10);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return { val: hi, range: [lo, hi] };
    }
  }
  const slash = raw.match(/(\d+)\s*\/\s*(\d+)/);
  if (slash) {
    const v = parseInt(slash[2]);
    return { val: v, range: [v, v] };
  }
  const m = raw.match(/^(\d+)\s*[-~〜]\s*(\d+)$/);
  if (m) {
    const lo = parseInt(m[1]), hi = parseInt(m[2]);
    return { val: hi, range: [lo, hi] };
  }
  const v = parseInt(raw);
  return isNaN(v) ? { val: fallback, range: [fallback, fallback] } : { val: v, range: [v, v] };
}

function _sheetArtCode(row, fallbackPrefix) {
  if (!row) return '';
  const raw = String(row['No.'] || row['No'] || row['NO'] || row['コード'] || row['画像No'] || row['画像番号'] || row['__col0'] || '').trim();
  if (!raw) return '';
  const prefixed = raw.match(/^(MC|EN|P|[ECS])\s*0*(\d+)$/i);
  if (prefixed) {
    let p = prefixed[1].toUpperCase();
    if (p === 'P') p = 'MC';
    return p + String(parseInt(prefixed[2], 10)).padStart(3, '0');
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return raw;
  return String(fallbackPrefix || '').toUpperCase() + String(n).padStart(3, '0');
}

function _assignSheetArtCode(obj, row, fallbackPrefix, isEnemy) {
  let code = _sheetArtCode(row, fallbackPrefix);
  if (!obj || !code) return;
  // 敵専用行はシート側のNo.が旧「E」表記のままでも、実ファイルが「EN」表記に改名されているため変換する。
  if (isEnemy) {
    const m = code.match(/^E(\d+)$/i);
    if (m) code = 'EN' + m[1].padStart(3, '0');
  }
  obj['No.'] = code;
  obj.No = code;
  obj.no = code;
  obj.imageNo = code;
  obj.artCode = code;
}

function _truthySheet(v) {
  const s = String(v || '').trim();
  const l = s.toLowerCase();
  if (l === 'true') return true;
  return s === 'TRUE' || s === '✓' || s === '◯' || s === '○';
}

function _falseySheet(v) {
  const s = String(v || '').trim();
  const l = s.toLowerCase();
  if (l === 'false') return true;
  return s === 'FALSE' || s === '×' || s === '✕';
}

function _normCardName(s) {
  return String(s || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/小杖/g, '短杖')
    .replace(/\s+/g, '')
    .trim();
}

function _findBySheetName(list, name) {
  const n = _normCardName(name);
  return (list || []).find(item => _normCardName(item && item.name) === n) || null;
}

function _filterBySheetName(list, name) {
  const n = _normCardName(name);
  return (list || []).filter(item => _normCardName(item && item.name) === n);
}

// ExcelのNo.（C043/E028/Sxxx）を、コード側のno/artCode（043/C043）に照合する。
// 同名カードが存在する場合でも、シートの番号を優先して正しいカードへ同期する。
function _filterBySheetCode(list, code, category) {
  const c = String(code || '').trim().toUpperCase();
  if (!c) return [];
  const m = c.match(/^[A-Z]+(\d+)$/);
  const num = m ? String(parseInt(m[1], 10)).padStart(3, '0') : '';
  const prefix = m ? m[0].slice(0, -m[1].length) : '';
  return (list || []).filter(item => {
    if (category && String(item && item.category || '') !== String(category)) return false;
    const values = [item && item.no, item && item.No, item && item['No.'], item && item.artCode, item && item.imageNo]
      .map(v => String(v || '').trim().toUpperCase()).filter(Boolean);
    return values.some(v => v === c || v === num || (prefix && v === prefix + num));
  });
}


function _starterNameFromSheet(s) {
  const n = _normCardName(s);
  const map = {
    '戦士':'戦士',
    '魔術師':'魔術師',
    '神官':'神官',
    '盗賊':'盗賊',
    '騎士':'騎士',
    '屍術師':'屍術師',
    '狩人':'狩人',
  };
  return map[n] || '';
}

function _findStarterUnitBySheetName(name) {
  const n = _starterNameFromSheet(name);
  if (!n) return null;
  return (UNIT_POOL || []).find(u => u && u.starterOnly && _normCardName(u.name) === _normCardName(n))
    || _findBySheetName(typeof UNIT_POOL !== 'undefined' ? UNIT_POOL : [], n)
    || null;
}


// ── 行 → キャラクターオブジェクト（シートデータのみ。effect/injury等はJS定義で上書き）──
function _rowToUnit(row) {
  const atkP = _parseIntRange(row['パワー'] || row['攻撃力'] || row['ATK'], 0);
  const hpP  = _parseIntRange(row['ライフ'] || row['HP'],  0);
  const name = row['名前'] || row['カード名'];
  return {
    id:      '',                               // JS定義から名前マッチで補完
    name:    name,
    race:    row['種族']  || '-',
    grade:   parseInt(row['グレード'] || row['レベル']) || 1,
    atk:     atkP.val,
    hp:      hpP.val,
    baseAtk: atkP.range,
    baseHp:  hpP.range,
    cost:   parseInt(row['価格']) || 0,
    unique: _truthySheet(row['ネームド']) || _truthySheet(row['ユニーク']),
    desc:   row['効果']   || '',
    sfxType: String(row['効果音'] || row['SE'] || row['SFX'] || '').trim(),
  };
}

function _ringEffectKeyFromRow(row, name) {
  const key = String(row['効果キー'] || row['effectKey'] || row['ringEffectKey'] || '').trim();
  if (key) return key;
  // 「屍術師の指輪」という名前だけでは判定しない：現行シートでは「屍術師の指輪」は
  // 別効果（死亡効果+1回）に転用されており、名前が同じでも別物のため、
  // 青ゴースト召喚テキストそのものが含まれる場合だけを対象にする。
  const text = `${row['効果'] || ''} ${row['説明'] || ''}`;
  if (/青ゴースト/.test(text)) return 'necromancer_ghosts';
  return '';
}

function _rowToRing(row) {
  const name = String(row['名前'] || row['カード名'] || row['指輪名'] || '').trim();
  if (!name) return null;
  const rarity = parseInt(String(row['レアリティ'] || row['rarity'] || row['Rarity'] || '').trim(), 10);
  const grade = parseInt(String(row['グレード'] || '').trim(), 10);
  const ring = {
    id: 'ring_' + _normCardName(name),
    name,
    kind: 'passive',
    type: 'ring',
    desc: String(row['効果'] || row['説明'] || '').trim(),
    tag: String(row['タグ'] || '').trim(),
    characterDesc: String(row['キャラクター用説明文'] || '').trim(),
  };
  if (!isNaN(rarity) && rarity >= 1) ring.rarity = Math.min(5, rarity);
  if (!isNaN(grade) && grade >= 1) ring.grade = grade;
  _assignSheetArtCode(ring, row, 'R');
  ring.ringEffectKey = _ringEffectKeyFromRow(row, name);
  return ring;
}

function _ensureNecromancerRingDef() {
  // 「屍術師の指輪」は現行シートで別効果（死亡効果+1回）に転用されたため、
  // 青ゴースト召喚効果は「不死の指輪」（R017）側で保証する。
  if (!Array.isArray(window.RING_POOL)) window.RING_POOL = [];
  RING_POOL = window.RING_POOL;
  let ring = RING_POOL.find(r => r && r.ringEffectKey === 'necromancer_ghosts');
  if (!ring) ring = RING_POOL.find(r => _normCardName(r && r.name) === _normCardName('不死の指輪'));
  if (!ring) {
    ring = {
      id: 'ring_undying',
      name: '不死の指輪',
      kind: 'passive',
      type: 'ring',
      desc: '味方が全滅した時、「青ゴースト」を3体召喚する。',
      no: 'R017',
      No: 'R017',
      artCode: 'R017',
      ringEffectKey: 'necromancer_ghosts',
    };
    RING_POOL.push(ring);
  }
  if (!ring.ringEffectKey) ring.ringEffectKey = 'necromancer_ghosts';
  return ring;
}

function _applySheetUnitFields(unit, row) {
  if (!unit || !row) return;
  const grade = parseInt(row['グレード'] || row['レベル']);
  if (!isNaN(grade) && grade >= 1) unit.grade = grade;

  const rarityRaw = String(row['レアリティ'] || '').trim();
  const rarity = parseInt(rarityRaw);
  if (rarityRaw === '-') unit.rarity = -1;
  else if (!isNaN(rarity) && rarity >= 1) unit.rarity = rarity;

  const costRaw = String(row['コスト'] || row['価格'] || '').trim();
  const cost = parseInt(costRaw);
  if (costRaw && costRaw !== '-' && !isNaN(cost)) unit.cost = cost;

  const priceRaw = String(row['価格'] || '').trim();
  const price = parseInt(priceRaw);
  if (priceRaw && priceRaw !== '-' && !isNaN(price)) unit.price = price;

  const color = String(row['カラー'] || '').trim();
  if (color) unit.color = color;
  if (row['種族'] !== undefined) unit.race = row['種族'] || '-';
  const sfxType = String(row['効果音'] || row['SE'] || row['SFX'] || '').trim();
  if (sfxType) unit.sfxType = sfxType;

  const atkRaw = String(row['パワー'] || row['攻撃力'] || row['ATK'] || row['初期ATK'] || '').trim();
  if (atkRaw && atkRaw !== '-') {
    const atkP = _parseIntRange(atkRaw, unit.atk || 0);
    unit.atk = atkP.val;
    unit.baseAtk = atkP.range;
  }

  const hpRaw = String(row['ライフ'] || row['HP'] || row['初期HP'] || '').trim();
  if (hpRaw && hpRaw !== '-') {
    const hpP = _parseIntRange(hpRaw, unit.hp || 0);
    unit.hp = hpP.val;
    unit.baseHp = hpP.range;
  }
}


// ── メイン読み込み ──────────────────────────────────
async function loadGameData() {
  try {
    let loaded;
    try {
      loaded = await _loadGameDataFromXlsx();
      console.log('[Vesselbound] XLSX loaded');
    } catch (xlsxErr) {
      try {
        loaded = await _loadGameDataFromEmbeddedXlsx();
      } catch (embeddedErr) {
        console.warn('[Vesselbound] XLSX 読み込み失敗。Google Sheets CSVへフォールバック:', xlsxErr);
        loaded = await _loadGameDataFromGoogleCsv();
        console.log('[Vesselbound] CSV loaded');
      }
    }
    let { source, ft, gt, ct, et, kwt, pt, ent, it, rt, mpt, dlt, rgt, tmt } = loaded;
    mpt = await _ensureMapPanelPowerCsv(mpt);
    dlt = await _ensureDeepLevelCsv(dlt);

    // キーワード シート（任意、キャラクター・敵共通のキーワード説明文）：失敗してもメイン読み込みには影響しない
    try {
      const kwRows = _parseCSV(kwt || '名前\n');
      kwRows.forEach(row => {
        const name = (row['名前'] || row['キーワード'] || row[Object.keys(row)[0]] || '').trim();
        const desc = (row['効果']||row['説明']||row['説明文']||'').trim();
        if (!name || !desc) return;
        KW_DESC_MAP[name] = desc;
        // 「毒牙X」「成長X」など末尾Xを持つ名前は、数字サフィックス版（毒牙1等）でも引けるよう登録
        if (/X$/.test(name)) KW_DESC_MAP[name.slice(0,-1)] = desc;
        // キーワード発動時の専用VFX（KXXX.mp4）解決用のナンバー（No.列）
        const code = _sheetArtCode(row, 'K');
        if (code) {
          KW_NO_MAP[name] = code;
          if (/X$/.test(name)) KW_NO_MAP[name.slice(0,-1)] = code;
        }
      });
    } catch (_) { /* キーワード説明文なしで続行 */ }
    if(!KW_DESC_MAP['荷物']) KW_DESC_MAP['荷物']='合体できない。';

    // 地域情報シート（任意）：街の名前・街の施設・戦闘（道中）の固有名をシート駆動にする。
    // 「ステージ」列の値がG._wave（1〜5。0は開始地点）に対応する。
    try {
      const rgRows = _parseCSVWithHeader(rgt || '名前\n', ['ステージ', '街の名前', '街の施設', '街までの名前', '塔までの名前']);
      const regionMap = {};
      rgRows.forEach(row => {
        const stage = parseInt(row['ステージ'] ?? row['__col0'], 10);
        if (!Number.isFinite(stage)) return;
        const pick = (...keys) => {
          for (const k of keys) {
            const v = String(row[k] ?? '').trim();
            if (v && v !== '-') return v;
          }
          return '';
        };
        regionMap[stage] = {
          stage,
          toTownName:       pick('街までの名前'),
          townName:         pick('街の名前'),
          townFacilities:   pick('街の施設'),
          quest:            pick('クエスト'),
          toTowerName:      pick('塔までの名前'),
          towerName:        pick('塔の名前'),
          towerFacilities:  pick('塔の施設'),
        };
      });
      window.REGION_INFO = regionMap;
    } catch (_) {
      window.REGION_INFO = window.REGION_INFO || {};
    }

    // テキストメッセージシート（任意）：「場面」→「テキスト」の対応表。
    // 街の施設ボタン直下の説明文などUIの固定文言に使う。
    try {
      const tmRows = _parseCSVWithHeader(tmt || '名前\n', ['場面', 'テキスト']);
      const messages = {};
      tmRows.forEach(row => {
        const scene = String(row['場面'] ?? row['__col0'] ?? '').trim();
        const text = String(row['テキスト'] ?? row['__col1'] ?? '').trim();
        if (!scene || !text) return;
        messages[scene] = text;
      });
      window.TEXT_MESSAGES = messages;
    } catch (_) {
      window.TEXT_MESSAGES = window.TEXT_MESSAGES || {};
    }

    // 魔導板強化シート（任意）：鍛冶屋の魔導板パネル価格・説明文をシート駆動にする
    try {
      window.MAP_PANEL_POWER_SHEET_ROWS = _parseCSVWithHeader(mpt || '名前\n', ['No.', '名前', '価格', '効果', '鍛冶屋説明文']);
    } catch (_) {
      window.MAP_PANEL_POWER_SHEET_ROWS = [];
    }
    // map.js の _applyMapPanelPowerSheetRows() は読み込み時に一度走るだけで、
    // その時点ではまだこの行データが無い。データが揃ったここで必ず適用し直す。
    try { if (typeof _applyMapPanelPowerSheetRows === 'function') _applyMapPanelPowerSheetRows(); } catch (_) {}

    // ── 階層レベル/深層レベルデータ ──
    // 新形式は「マップ」列（結合セルで空欄になる行あり）＋「深層レベル」列で管理する。
    const deepRows = _parseCSVWithHeader(dlt || '名前\n', ['マップ', '深層レベル', '補正', 'グレード']);
    const mapDeep = {};
    let currentMapNo = 0;
    deepRows.forEach(row => {
      const mapRaw = String(row['マップ'] || row['map'] || row['Map'] || row['__col0'] || '').trim();
      const parsedMap = parseInt(mapRaw, 10);
      if (Number.isFinite(parsedMap) && parsedMap > 0) currentMapNo = parsedMap;
      const deep = parseInt(row['深層レベル'] || row['戦闘回数'] || row['階層'] || row['level'] || row['__col1'], 10);
      if (!currentMapNo || !Number.isFinite(deep) || deep <= 0) return;
      const mult = parseFloat(row['補正'] || row['mult'] || row['倍率'] || row['__col2']);
      const grade = parseInt(row['グレード'] || row['grade'] || row['__col3'], 10);
      mapDeep[currentMapNo] = mapDeep[currentMapNo] || {};
      mapDeep[currentMapNo][deep] = {
        map: currentMapNo,
        deepLevel: deep,
        grade: Math.max(1, Number.isFinite(grade) ? grade : currentMapNo),
        mult: Number.isFinite(mult) && mult > 0 ? mult : 1,
      };
    });
    if (typeof window !== 'undefined') window.MAP_DEEP_LEVEL_DATA = mapDeep;

    // ── 階層データ ──
    const floorRows = _parseCSV(ft);
    console.table(floorRows.slice(0, 5));
    const validFloorRows = floorRows.filter(row => {
      const fl = parseInt(row['階層'] || row['戦闘回数'] || row['深層レベル'] || row['floor']);
      return !!fl && !isNaN(fl);
    });
    if (Object.keys(mapDeep).length) {
      FLOOR_DATA.length = 0;
      FLOOR_DATA.push(null);
      BOSS_FLOORS.length = 0;
      const maxMap = Math.max(...Object.keys(mapDeep).map(n=>parseInt(n,10)).filter(Number.isFinite), 1);
      const maxDeep = Math.max(1, ...Object.values(mapDeep).flatMap(levels=>Object.keys(levels).map(n=>parseInt(n,10)).filter(Number.isFinite)));
      for (let mapNo = 1; mapNo <= maxMap; mapNo++) {
        for (let deep = 1; deep <= maxDeep; deep++) {
          const flat = (mapNo - 1) * maxDeep + deep;
          const data = (mapDeep[mapNo] && mapDeep[mapNo][deep]) || (mapDeep[mapNo] && mapDeep[mapNo][maxDeep]) || null;
          FLOOR_DATA[flat] = data ? { grade: data.grade, mult: data.mult, map: mapNo, deepLevel: deep } : { grade: mapNo, mult: 1, map: mapNo, deepLevel: deep };
        }
      }
      FLOOR_DATA._deepLevelsPerMap = maxDeep;
    } else if (validFloorRows.length) {
    FLOOR_DATA.length = 0;
    FLOOR_DATA.push(null); // index 0 は null（1始まり）
    BOSS_FLOORS.length = 0;
    FLOOR_DATA._deepLevelsPerMap = 5;
    validFloorRows.forEach(row => {
      const fl = parseInt(row['階層'] || row['戦闘回数'] || row['深層レベル'] || row['floor']);
      if (!fl || isNaN(fl)) return;
      const isBoss = row['ボス'] === '✓' || row['ボスかどうか'] === '✓' || row['ボス'] === 'TRUE';
      FLOOR_DATA[fl] = {
        grade: Math.max(1, parseInt(row['グレード'] || row['grade']) || 1),
        mult:  parseFloat(row['補正'] || row['mult']) || 1.0,
      };
      if (isBoss) {
        FLOOR_DATA[fl].boss = true;
        // BOSS_FLOORS はボス階の「1つ前」の階番号（移動先選択でボス専用表示に使う）
        BOSS_FLOORS.push(fl - 1);
      }
    });
    } else {
      console.warn('[Vesselbound] 階層データが空のため、既存のFLOOR_DATAを維持します');
    }

    // ── グレードアップ費用 ──
    // シート列：グレード, 費用（グレード2以上の費用 = G1→G2, G2→G3, ...）
    const gradeRows = _parseCSV(gt);
    const newCosts = gradeRows
      .map(row => parseInt(row['費用']))
      .filter(v => !isNaN(v) && v > 0);
    if (newCosts.length > 0) {
      GRADE_UP_COSTS.length = 0;
      newCosts.forEach(c => GRADE_UP_COSTS.push(c));
    }
    const facilityKeyByName = {
      '祭壇': 'altar',
      '研究所': 'lab',
      '市街': 'city',
      '金庫': 'vault',
      '図書館': 'library',
      '大学': 'university',
    };
    window.FACILITY_UPGRADE_COSTS = window.FACILITY_UPGRADE_COSTS || {};
    gradeRows.forEach(row => {
      const rowGrade = parseInt(row['グレード'] || row['レベル'] || row['Lv'] || row['段階']);
      if (!isNaN(rowGrade) && rowGrade >= 2 && rowGrade <= 7) {
        Object.entries(facilityKeyByName).forEach(([label, key]) => {
          const cost = parseInt(row[label]);
          if (!isNaN(cost) && cost > 0) {
            window.FACILITY_UPGRADE_COSTS[key] = window.FACILITY_UPGRADE_COSTS[key] || [];
            window.FACILITY_UPGRADE_COSTS[key][rowGrade - 2] = cost;
          }
        });
      }
      const name = (row['設備'] || row['施設'] || row['項目'] || row['名前'] || '').trim();
      const key = facilityKeyByName[name] || Object.values(facilityKeyByName).find(v => v === name);
      if (!key) return;
      const verticalLevel = parseInt(row['レベル'] || row['Lv'] || row['グレード'] || row['段階']);
      const verticalCost = parseInt(row['費用'] || row['コスト'] || row['必要ゴールド'] || row['価格']);
      if (!isNaN(verticalLevel) && verticalLevel >= 2 && verticalLevel <= 7 && !isNaN(verticalCost) && verticalCost > 0) {
        window.FACILITY_UPGRADE_COSTS[key] = window.FACILITY_UPGRADE_COSTS[key] || [];
        window.FACILITY_UPGRADE_COSTS[key][verticalLevel - 2] = verticalCost;
        return;
      }
      const costs = [];
      for (let level = 2; level <= 7; level++) {
        const raw = row[`Lv${level}`] || row[`Lv.${level}`] || row[String(level)] || row[`費用${level}`];
        const cost = parseInt(raw);
        if (!isNaN(cost) && cost > 0) costs[level - 2] = cost;
      }
      if (costs.length) window.FACILITY_UPGRADE_COSTS[key] = costs;
    });


    // ── キャラクタープール（ネームド・グレード・パワー・ライフ・種族・価格・説明文 / 敵専用も含む）──
    const charRows = _parseCSVWithHeader(ct, ['カード名', '名前']);
    const enemyRows = _parseCSVWithHeader(et || 'カード名\n', ['カード名', 'ターン']);
    const _sheetUnitNames = new Set();  // シートに存在する通常/ネームドキャラクター名
    const _syncUnitFromRow = (unit, row) => {
      unit._sheetSeen = true;
      _assignSheetArtCode(unit, row, unit.enemyOnly ? 'EN' : 'MC', unit.enemyOnly);
      const nv = row['ネームド'] || row['ユニーク'];
      if (_truthySheet(nv)) unit.unique = true;
      else if (_falseySheet(nv)) unit.unique = false;
      _applySheetUnitFields(unit, row);
      const desc = row['効果'];
      unit.desc = desc || '';
      const sfxType = String(row['効果音'] || row['SE'] || row['SFX'] || '').trim();
      if (sfxType) unit.sfxType = sfxType;
      if (row['キーワード'] !== undefined) {
        const kwStr = row['キーワード'].trim();
        unit.keywords = kwStr ? kwStr.split(/[\s、,，]+/).filter(Boolean) : [];
        unit.shield = unit.keywords.reduce((sum, k) => {
          if (!/^結界\s*\d*$/.test(k)) return sum;
          return sum + Math.max(1, parseInt(String(k).replace('結界', '') || '1', 10) || 1);
        }, 0);
        unit.hate = false; unit.hateTurns = 0;
      }
    };
    const _syncStarterFromRow = (unit, row) => {
      const starterName = _starterNameFromSheet(row['名前']);
      if (!unit && starterName) {
        unit = {
          id: 'c_starter_sheet_' + _normCardName(starterName),
          name: starterName,
          race: '亜人',
          grade: 1,
          atk: 1,
          hp: 1,
          cost: 0,
          unique: false,
          starterOnly: true,
          initialEquipment: [],
        };
        UNIT_POOL.push(unit);
      }
      if (!unit) return;
      _assignSheetArtCode(unit, row, 'MC');
      unit.unique = false;
      unit.starterOnly = true;
      unit.enemyOnly = false;
      unit.desc = '';
      _applySheetUnitFields(unit, row);
      if (unit.rarity === undefined) unit.rarity = -1;
      unit.initialPanelName = String(row['初期パネル'] || unit.initialPanelName || '').trim();
      unit.initialPanelDesc = String(row['初期パネルの効果'] || row['効果'] || unit.initialPanelDesc || '').trim();
      delete unit.effect;
      delete unit.injury;
      unit.keywords = [];
      unit.initialEquipment = [];
      unit._sheetSeen = true;
    };
    // ── 「キャラクター」「強化」シート → PANEL_POOL 同期 ──
    // マナは色を持たない単一プールに統一されたため、カードの「色」は見た目・種族分類用のみに使う。
    // 茶は廃止し黄に統一する（紫は既存の色として扱う）。
    const _normalizeColorText = color => { const c = String(color || '').trim(); return c === '茶' ? '黄' : c; };
    const _rowImplemented = row => {
      if (!row || row['実装'] === undefined) return true;
      return !_falseySheet(row['実装']);
    };
    const _summonOnlyPanelNames = new Set(['シャドウ', 'ウルフ', 'ペリカン', 'ドラゴン', 'ナイトキャット', 'イフリート'].map(_normCardName));
    const _forcedPanelSyncNames = new Set([..._summonOnlyPanelNames, _normCardName('剣技')]);
    // 「Xマナ：効果」形式の説明文から、Xマナ貯まった時点で即座に発動するコストを読み取る
    // （キャラクター・強化パネル共通。スペルの「コスト」列とは別に、説明文自身がコストを兼ねる）
    // 「Xマナ毎：効果」の場合はmanaRepeat=trueとし、Xマナ貯まるたびに繰り返し発動する
    const _setManaThresholdFromDesc = panel => {
      const desc = String(panel.desc || '');
      const every = desc.match(/^(\d+)マナ毎[:：]/);
      const once = !every && desc.match(/^(\d+)マナ[:：]/);
      if (every) { panel.manaCost = parseInt(every[1], 10) || 0; panel.manaRepeat = true; }
      else if (once) { panel.manaCost = parseInt(once[1], 10) || 0; panel.manaRepeat = false; }
      else { delete panel.manaCost; delete panel.manaRepeat; }
    };
    const _splitSheetKeywords = value => String(value || '')
      .split(/[\s、,，\n]+/)
      .map(v => v.trim())
      .filter(Boolean);
    const _stripOwnNameFromDesc = (desc, name) => {
      let out = String(desc || '').trim();
      const n = String(name || '').trim();
      if (!out || !n) return out;
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (let i = 0; i < 4; i++) {
        const next = out
          .replace(new RegExp(`(?:[\\s　、,，。:：\\-]|<br\\s*/?>)*(?:「|『|【)?${esc}(?:」|』|】)?(?:[\\s　、,，。:：\\-]|<br\\s*/?>)*$`, 'i'), '')
          .trim();
        if (next === out) break;
        out = next;
      }
      return out;
    };
    const _mergeUniqueKeywords = (base, add) => {
      const out = Array.isArray(base) ? base.slice() : [];
      (add || []).forEach(k => { if (k && !out.includes(k)) out.push(k); });
      return out;
    };
    const _setPanelKeywordsFromDesc = panel => {
      const desc = String(panel.desc || '');
      const passiveDesc = desc.replace(/(^|\n)\s*\d+マナ(?:毎)?[:：][^\n。]*(?:。|$)/g, ' ');
      const ownPassiveDesc = passiveDesc.replace(/(?:ランダムな)?(?:味方|敵|キャラクター|.+?キャラクター)(?:に|が)[^。]*(?:結界|生贄|復活|封印\d*)を(?:付与する|得る)。?/g, ' ');
      const kws = [];
      // 「復活を付与する」は自身ではなく他者に付与する効果のため、自身の復活キーワードとしては扱わない
      if (/復活/.test(ownPassiveDesc)) kws.push('復活');
      const shield = ownPassiveDesc.match(/(?:^|\n)\s*結界\s*(\d*)/);
      if (shield) kws.push('結界' + (shield[1] || '1'));
      if (/根性/.test(ownPassiveDesc)) kws.push('根性');
      if (/強靭\s*\d*/.test(ownPassiveDesc)) kws.push('強靭' + ((ownPassiveDesc.match(/強靭\s*(\d*)/)||[])[1] || '1'));
      if (/狙撃/.test(ownPassiveDesc)) kws.push('狙撃');
      if (/即死/.test(ownPassiveDesc)) kws.push('即死');
      if (/(?:^|\n|\s)生贄(?:\s|。|\n|$)/.test(ownPassiveDesc)) kws.push('生贄');
      const seal = ownPassiveDesc.match(/封印\s*(\d+)/);
      if (seal) kws.push('封印' + (seal[1] || '1'));
      const poison = passiveDesc.match(/毒牙\s*(\d*)/);
      if (poison) kws.push('毒牙' + (poison[1] || '1'));
      const strengthen = passiveDesc.match(/([赤青緑黄紫茶])強化/);
      if (strengthen) kws.push(`${_normalizeColorText(strengthen[1])}強化`);
      // 「死亡：全てのA色キャラクターは+atk/+hpを得る。」→ 内部集計用キーワードとして色・数値を埋め込む
      const colorBuffAll = passiveDesc.match(/死亡：全ての([赤青緑黄紫茶])キャラクターは\+(\d+)\/\+(\d+)を得る/);
      if (colorBuffAll) kws.push(`${_normalizeColorText(colorBuffAll[1])}全体強化${colorBuffAll[2]}_${colorBuffAll[3]}`);
      panel.keywords = kws;

      delete panel.summonCount;
      delete panel.manaOnAttack;
      delete panel.manaOnInjury;
      delete panel.goldOnBattleEnd;
      delete panel.goldOnDeath;
      delete panel.randomItemOnBattleEnd;
      if (/コピーを1体召喚/.test(desc)) panel.summonCount = 2;
      if (/コピーを2体召喚/.test(desc)) panel.summonCount = 3;
      if (panel.name === 'スリープシープ') {
        delete panel.summonCount;
        panel.directionCount = 4;
      }
      if (panel.name === 'ツインデビル') {
        panel.summonCount = 2;
        panel.directionCount = 2;
      }
      // マナは色を持たないため、直前に色文字が残っていても無視し、数字（省略時は1）だけを読み取る
      const attackMana = desc.match(/攻撃：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/);
      if (attackMana) panel.manaOnAttack = parseInt(attackMana[1], 10) || 1;
      const injuryMana = desc.match(/負傷：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/);
      if (injuryMana) panel.manaOnInjury = parseInt(injuryMana[1], 10) || 1;
      const deathMana = desc.match(/死亡：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/);
      if (deathMana) {
        panel.manaOnDeath = parseInt(deathMana[1], 10) || 1;
        if (!kws.includes('狂気')) kws.push('狂気');
      } else {
        delete panel.manaOnDeath;
      }
      const goldEnd = desc.match(/終戦：\s*(\d+)\s*ゴールドを?得る/);
      if (goldEnd) panel.goldOnBattleEnd = parseInt(goldEnd[1], 10) || 0;
      const goldDeath = desc.match(/死亡：\s*(\d+)\s*ゴールドを?得る/);
      if (goldDeath) panel.goldOnDeath = parseInt(goldDeath[1], 10) || 0;
      if (/終戦：\s*ランダムなアイテムを得る/.test(desc)) panel.randomItemOnBattleEnd = true;
      _setManaThresholdFromDesc(panel);
    };
    const _setEnchantFieldsFromDesc = panel => {
      const desc = String(panel.desc || '');
      panel.adjacentAtkBonus = 0;
      panel.adjacentHpBonus = 0;
      panel.adjacentKeywords = [];
      const selfTarget = '(?:このキャラクターは\\s*)?';
      let m = desc.match(new RegExp(`常時：\\s*${selfTarget}\\+(\\d+)\\s*\\/\\s*\\+(\\d+)`));
      if (m) {
        panel.adjacentAtkBonus = parseInt(m[1], 10) || 0;
        panel.adjacentHpBonus = parseInt(m[2], 10) || 0;
      }
      m = desc.match(new RegExp(`常時：\\s*${selfTarget}\\+(\\d+)\\s*\\/\\s*-(\\d+)`));
      if (m) {
        panel.adjacentAtkBonus = parseInt(m[1], 10) || 0;
        panel.adjacentHpBonus = -(parseInt(m[2], 10) || 0);
      }
      m = desc.match(/常時：\s*(?:このキャラクターは\s*)?HP\+(\d+)/);
      if (m) panel.adjacentHpBonus = parseInt(m[1], 10) || 0;
      m = desc.match(/常時：\s*(?:このキャラクターは\s*)?ATK\+(\d+)/);
      if (m) panel.adjacentAtkBonus = parseInt(m[1], 10) || 0;
      m = desc.match(new RegExp(`常時：\\s*${selfTarget}-(\\d+)\\s*\\/\\s*-(\\d+)`));
      if (m) {
        panel.adjacentAtkBonus = -(parseInt(m[1], 10) || 0);
        panel.adjacentHpBonus = -(parseInt(m[2], 10) || 0);
      }
      [
        '逆襲','闇の儀式','執念の炎','闇の炎','狂気','野生の力','根性','生贄','治癒能力','マナ生成',
        '二段攻撃','三段攻撃','即死','三方向攻撃','先制','全体攻撃','生命吸収',
        '逆上','剣技','怨念','錬成','マナの種','恩寵','狙撃','防戦','帰滅','隠密','加護','貫通',
        '復活','根性','強靭','熟練','遺志','共振','団結','封印されしもの','禁断の力','武器破壊','戦術','大盾','策士'
      ].forEach(k=>{
        // カード名そのものはキーワードではない。説明文またはシートのキーワード欄に
        // 明記された場合だけ採用し、末尾に残ったカード名を誤ってキーワード化しない。
        if (desc.includes(k)) panel.adjacentKeywords.push(k);
      });
      // 新エンチャントの固有処理用フィールド（説明文が未同期でも名前で認識する）。
      if(panel.name==='封印されしもの'){
        // カード名は表示名であり、接続先へ付与するキーワードではない。
        if(!panel.adjacentKeywords.some(k=>/^封印\d+$/.test(k))) panel.adjacentKeywords.push('封印1');
        panel.releaseAtkBonus=20; panel.releaseHpBonus=20;
      }
      if(panel.name==='炎の矢'){
        panel.manaCost=1; panel.manaRepeat=true;
        panel._manaThresholdDesc='ランダムな敵に4ダメージを与える。';
      }
      const releaseBuff=desc.match(/解放[:：]\s*\+(\d+)\s*\/\s*\+(\d+)/);
      if(releaseBuff){ panel.releaseAtkBonus=parseInt(releaseBuff[1],10)||0; panel.releaseHpBonus=parseInt(releaseBuff[2],10)||0; }
      const attackMana = desc.match(/攻撃：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/);
      if (attackMana) panel.manaOnAttack = parseInt(attackMana[1], 10) || 1;
      const shield = `${desc} ${panel.name || ''}`.match(/結界\s*(\d*)/);
      if (shield) panel.adjacentKeywords.push('結界' + (shield[1] || '1'));
      const seal = desc.match(/封印\s*(\d+)/);
      if (seal) panel.adjacentKeywords.push('封印' + (seal[1] || '1'));
      if (/死亡：\s*(?:[赤青緑黄紫茶])?\s*\d*マナを?得る/.test(desc) && !panel.adjacentKeywords.includes('狂気')) {
        panel.adjacentKeywords.push('狂気');
      }
      if (/開戦：\s*(?:[赤青緑黄紫茶])?\s*\d*マナを?得る/.test(desc) && !panel.adjacentKeywords.includes('野生の力')) {
        panel.adjacentKeywords.push('野生の力');
      }
      const evilEye = desc.match(/邪眼\s*(\d*)/);
      if (evilEye) panel.adjacentKeywords.push('邪眼' + (evilEye[1] || '1'));
      const weaken = desc.match(/衝撃\s*(\d*)/);
      if (weaken) panel.adjacentKeywords.push('衝撃' + (weaken[1] || '1'));
      const tough = desc.match(/強靭\s*(\d*)/);
      if (tough) panel.adjacentKeywords.push('強靭' + (tough[1] || '1'));
      const poison = desc.match(/毒牙\s*(\d*)/);
      if (poison) panel.adjacentKeywords.push('毒牙' + (poison[1] || '1'));
      const colorMana = desc.match(/召喚：\s*(?:[赤青緑黄紫茶])?\s*\d*マナを?得る/);
      if (colorMana) panel.adjacentKeywords.push('マナ召喚');
      if (/三方向/.test(desc)) panel.directionCount = 3;
      else if (/四方向/.test(desc)) panel.directionCount = 4;
      else if (panel.directionCount == null) panel.directionCount = 2;
      _setManaThresholdFromDesc(panel);
      if(panel.name==='炎の矢'){
        panel.manaCost=1; panel.manaRepeat=true;
        panel._manaThresholdDesc='ランダムな敵に4ダメージを与える。';
      }
    };
    const _syncPanelFromRow = (panel, row, forcedCategory) => {
      if (!panel) return;
      panel._sheetSeen = true;
      panel._sheetDescLoaded = Object.prototype.hasOwnProperty.call(row, '効果');
      panel._sheetKeywordsLoaded = Object.prototype.hasOwnProperty.call(row, 'キーワード');
      const hasRewardColumn=Object.prototype.hasOwnProperty.call(row,'報酬');
      const hasShopColumn=Object.prototype.hasOwnProperty.call(row,'ショップ');
      panel._rewardAvailable=hasRewardColumn?_truthySheet(row['報酬']):true;
      panel._shopAvailable=hasShopColumn?_truthySheet(row['ショップ']):true;
      // キャラクター／エンチャントシートの「初期」列を初期編成候補へ反映する。
      if (Object.prototype.hasOwnProperty.call(row, '初期')) {
        panel.initial = _truthySheet(row['初期']);
      }
      delete panel.removed;
      const category = forcedCategory || (row['分類'] || '').trim() || panel.category || '';
      const artFallback = (category === '強化' || category === 'エンチャント') ? 'E' : 'C';
      _assignSheetArtCode(panel, row, artFallback);
      delete panel._rewardExcluded;
      delete panel._shopExcluded;
      panel.category = category === '強化' ? 'エンチャント' : category;
      delete panel.subCategory;
      delete panel.manaCost;
      delete panel.costMana;
      const rarStr = (row['レアリティ'] || '').trim();
      const rarVal = parseInt(rarStr);
      if (rarStr === '-') panel.rarity = -1;
      else if (!isNaN(rarVal) && rarVal >= 1) panel.rarity = rarVal;
      const grade = parseInt(row['グレード']);
      if (!isNaN(grade) && grade >= 1) panel.grade = grade;
      // 「価格」列 = 購入価格。PANEL_POOL の cost フィールド（calcBuyPrice/makePanel が参照する購入コスト）に対応。
      const priceStr = (row['価格'] || '').trim();
      if (priceStr && priceStr !== '-') {
        const priceVal = parseInt(priceStr);
        if (!isNaN(priceVal)) panel.cost = priceVal;
      }
      const color = (row['カラー'] || '').trim();
      if (color) {
        panel.color = _normalizeColorText(color);
      }
      delete panel.manaColor;
      // 種族列はキャラクター種以外（エンチャント等）では空欄が正常なため、値がある場合のみ上書き。
      if (row['種族']) panel.race = row['種族'];
      else if (panel.race === undefined) panel.race = '-';
      // パワー/ライフはセルが空欄（非キャラクターカード等）の場合は上書きしない。
      const powerStr = String(row['パワー'] || row['攻撃力'] || row['ATK'] || '').trim();
      if (powerStr) {
        const atkP = _parseIntRange(powerStr, panel.power != null ? panel.power : (panel.atk || 0));
        panel.power = atkP.val;
      }
      const lifeStr = String(row['ライフ'] || row['HP'] || '').trim();
      if (lifeStr) {
        const hpP = _parseIntRange(lifeStr, panel.life != null ? panel.life : (panel.hp || 0));
        panel.life = hpP.val;
      }
      if (row['効果'] !== undefined) panel.desc = String(row['効果'] || '').trim();
      // Excelの効果欄末尾にカード名が付くことがあるが、表示・キーワード解析から除去する。
      if (panel.category === 'エンチャント') panel.desc = _stripOwnNameFromDesc(panel.desc, panel.name);
      if (!panel._sheetDescLoaded && panel.name === 'スリープシープ') panel.desc = '常時：このキャラクターは4つのポートを持つ。';
      if (!panel._sheetDescLoaded && panel.name === 'ツインデビル') panel.desc = '開戦：コピーを1体召喚する。';
      const sfxType = String(row['効果音'] || row['SE'] || row['SFX'] || '').trim();
      if (sfxType) panel.sfxType = sfxType;
      panel.characterDesc = String(row['キャラクター用説明文'] || '').trim();
      const sheetKeywords = _splitSheetKeywords(row['キーワード']).map(k=>{
        const s=String(k||'').trim();
        return s==='強靭'?'強靭1':s;
      });
      if (panel.category === 'キャラクター') {
        _setPanelKeywordsFromDesc(panel);
        panel.keywords = _mergeUniqueKeywords(panel.keywords, sheetKeywords);
        if (panel.name !== 'スリープシープ' && panel.name !== 'ツインデビル') panel.directionCount = panel.directionCount || 2;
        if (!panel._sheetDescLoaded && panel.name === 'スリープシープ') panel.directionCount = 4;
        if (!panel._sheetDescLoaded && panel.name === 'ツインデビル') panel.directionCount = 2;
      }
      if (panel.category === 'エンチャント') {
        _setEnchantFieldsFromDesc(panel);
        panel.adjacentKeywords = _mergeUniqueKeywords(panel.adjacentKeywords, sheetKeywords);
        // 強化カード名は表示名であり、接続先へ付与するキーワードではない。
        // シート側に誤って残っている場合もここで除去し、データ追加時の再発を防ぐ。
        const enchantCardNames=new Set(['封印されしもの','禁断の力','武器破壊','団結','共振','遺志','熟練','戦術','大盾','策士']);
        panel.adjacentKeywords=panel.adjacentKeywords.filter(k=>!enchantCardNames.has(String(k||'').trim()));
        // 「ポート」列＝各強化カードの接続ポイントの数（旧「ハブ」列も互換で許容）
        const portStr = String(row['ポート'] ?? row['ハブ'] ?? '').trim();
        const portVal = parseInt(portStr, 10);
        if (!isNaN(portVal) && portVal >= 1) panel.directionCount = portVal;
      }
    };
    const cardRows = _parseCSVWithHeader(pt || '名前\n', ['No.', '名前']);
    const enchantRows = _parseCSVWithHeader(ent || '名前\n', ['No.', '名前']);
    const itemRows = _parseCSVWithHeader(it || '名前\n', ['No.', '名前']);
    const ringRows = _parseCSVWithHeader(rt || '名前\n', ['No.', '名前']);
    if(itemRows.length){
      itemRows.forEach(row=>{
        const name=String(row['名前']||'').trim();
        const no=String(row['No.']||row['No']||'').trim();
        if(!name&&!no) return;
        (ITEM_POOL||[]).filter(item=>(name&&String(item.name||'').trim()===name)||(no&&String(item.no||'').trim()===no))
          .forEach(item=>{
            if(Object.prototype.hasOwnProperty.call(row,'実装')) item._implemented=_truthySheet(row['実装']);
            if(Object.prototype.hasOwnProperty.call(row,'ショップ')) {
              item._shopAvailable=_truthySheet(row['ショップ']);
              if(item._shopAvailable) delete item._shopExcluded;
            }
            if(Object.prototype.hasOwnProperty.call(row,'効果')) item.desc=String(row['効果']||'').trim();
            if(Object.prototype.hasOwnProperty.call(row,'ショップ')&&!_truthySheet(row['ショップ'])) item._shopExcluded=true;
          });
      });
      // ゲーム仕様では黄金の巻物は所持金を2倍にする（シート側の旧1.5倍表記を補正）。
      const goldenScroll=(ITEM_POOL||[]).find(item=>item&&item.name==='黄金の巻物');
      if(goldenScroll) goldenScroll.desc='所持金を2倍にする。';
    }
    // 指輪シートは「実装」列が明示的にTRUE/✓等の場合のみ採用する（空欄のドラフト行を
    // 「未指定＝実装済み」として拾ってしまう_rowImplementedの既定動作とは別扱いにする）。
    // 実装済みとして扱う指輪は、シート側の実装フラグが古い場合でも読み込む。
    // R014/R025はコード側で実装するため、xlsx/local fallbackのfalseを許容する。
    const _forcedRingNames = new Set(['黄金の指輪', '強欲の指輪', '虹の瞳の指輪']);
    const parsedRings = ringRows
      .filter(row => _truthySheet(row['実装']) || _forcedRingNames.has(String(row['名前'] || '').trim()))
      .map(_rowToRing)
      .filter(Boolean);
    if (parsedRings.length) {
      RING_POOL.length = 0;
      parsedRings.forEach(r => RING_POOL.push(r));
    }
    _ensureNecromancerRingDef();
    const _seenPanelIds = new Set();
    const _syncPanelRows = (rows, forcedCategory, targetPool) => rows.forEach(row => {
      let name = row['名前'] || row['カード名'];
      if (!name) return;
      const code = _sheetArtCode(row, forcedCategory === 'スペル' ? 'S' : (forcedCategory === 'エンチャント' ? 'E' : 'C'));
      if (forcedCategory === 'キャラクター') {
        if (code === 'C047') name = 'ユミル';
        if (code === 'C048') name = 'マーメイド';
      }
      const forceSync = _forcedPanelSyncNames.has(_normCardName(name));
      const implemented = _rowImplemented(row);
      const pool = targetPool || PANEL_POOL;
      if (!implemented && !forceSync) {
        const excluded = _filterBySheetCode(pool, code, forcedCategory);
        const exactExcluded = excluded.filter(panel => [panel && panel.no, panel && panel.No, panel && panel['No.'], panel && panel.artCode]
          .some(v => String(v || '').trim().toUpperCase() === String(code || '').trim().toUpperCase()));
        ((exactExcluded.length || excluded.length === 1) ? (exactExcluded.length ? exactExcluded : excluded) : _filterBySheetName(pool, name)).forEach(panel => {
          if (panel) { panel._rewardExcluded = true; panel._shopExcluded = true; }
        });
        return;
      }
      if (forcedCategory === 'キャラクター') {
        const hasStats = String(row['パワー'] || row['攻撃力'] || row['ATK'] || '').trim()
          || String(row['ライフ'] || row['HP'] || '').trim();
        if (!hasStats) return;
      }
      // 既存名とNo.の両方を照合し、名前一致を優先して旧番号のずれを吸収する。
      const candidatesByCode = _filterBySheetCode(pool, code, forcedCategory);
      const candidatesByName = _filterBySheetName(pool, name);
      const exactCodeCandidates = candidatesByCode.filter(panel => [panel && panel.no, panel && panel.No, panel && panel['No.'], panel && panel.artCode]
        .some(v => String(v || '').trim().toUpperCase() === String(code || '').trim().toUpperCase()));
      // 既存カード名が一致する場合は名前を優先する。旧コード側の裸No.が別カードに
      // 残っていても、Excelの名前と画像No.を正しいカードへ同期できる。
      let candidates = candidatesByName.length ? candidatesByName
        : (exactCodeCandidates.length ? exactCodeCandidates : candidatesByCode.length === 1 ? candidatesByCode : []);
      // Excelで実装TRUEになっているカードがコード側に未登録でも、
      // シート行から最小限のカード定義を生成して報酬・ショップへ反映する。
      // キャラクターも対象にする（パワー／ライフが無い行は上の hasStats チェックで既に弾いている）。
      // 生成後に _syncPanelFromRow() が色・種族・パワー・ライフ・キーワード・方向数まで埋める。
      if (!candidates.length && implemented
          && (forcedCategory === 'エンチャント' || forcedCategory === 'スペル' || forcedCategory === 'キャラクター')) {
        const safeCode = String(code || '').replace(/[^A-Z0-9_-]/gi, '_');
        const generated = {
          id: `panel_sheet_${safeCode || _normCardName(name)}`,
          no: code || '', name: String(name).trim(), rarity: 1, grade: 1,
          type: forcedCategory === 'スペル' ? 'spell' : 'panel',
          kind: forcedCategory === 'スペル' ? 'spell' : 'panel',
          panelScope: 'unit', category: forcedCategory, cost: 1, slot: 1,
          desc: String(row['効果'] || '').trim()
        };
        pool.push(generated);
        candidates = [generated];
      }
      if (!candidates.length) return;
      let panel = candidates.length === 1 ? candidates[0] : (
        candidates.find(p => !_seenPanelIds.has(p.id) && String(p.category || '') === forcedCategory)
        || candidates.find(p => !_seenPanelIds.has(p.id))
        || candidates[0]
      );
      if (_seenPanelIds.has(panel.id)) return; // 既に別の行で同期済みのIDは再上書きしない（同名衝突対策）
      _seenPanelIds.add(panel.id);
      _syncPanelFromRow(panel, row, forcedCategory);
      if (!implemented) { panel._rewardExcluded = true; panel._shopExcluded = true; }
      if (Object.prototype.hasOwnProperty.call(row,'報酬') && !_truthySheet(row['報酬'])) panel._rewardExcluded=true;
      if (Object.prototype.hasOwnProperty.call(row,'ショップ') && !_truthySheet(row['ショップ'])) panel._shopExcluded=true;
      if (_summonOnlyPanelNames.has(_normCardName(name))) panel.rarity = -1;
    });
    _syncPanelRows(cardRows, 'キャラクター', PANEL_POOL);
    _syncPanelRows(enchantRows, 'エンチャント', PANEL_POOL);
    // 荷物はカード自身が持つキーワードで、接続先へは付与しない。
    // シート側の更新前でも壺・魔鏡の合体不可ルールを一貫して適用する。
    const _luggagePanelNames=new Set(['翡翠の壺','黄金の壺','魔鏡']);
    (PANEL_POOL||[]).forEach(panel=>{
      if(!_luggagePanelNames.has(String(panel&&panel.name||'').trim())) return;
      panel.keywords=_mergeUniqueKeywords(panel.keywords,['荷物']);
      panel.adjacentKeywords=(panel.adjacentKeywords||[]).filter(k=>String(k||'').trim()!=='荷物');
    });
    // 旧試作版の内部カード「複製」は現行シートに存在しないため、報酬・デバッグ一覧から除外する。
    for(let i=PANEL_POOL.length-1;i>=0;i--) if(PANEL_POOL[i]&&PANEL_POOL[i].name==='複製') PANEL_POOL.splice(i,1);
    const _requestedEffectOverrides = {
      'ノーム': {desc:'終戦：5ゴールドを得る。'},
      'ゴーレム': {desc:'負傷：このキャラクターは+2/+2を得る。'},
      'ドワーフ': {desc:'2マナ毎：ランダムな赤キャラクターは+3/+2を得る。'},
      'ラミア': {desc:'攻撃：このキャラクターは+2/+1を得る。対象が負傷している場合、もう一度繰り返す。'},
      'アラクネ': {desc:'3マナ毎：全ての味方に+2/+2を与えた後、1ダメージを与える。'},
      'ギガンテス': {desc:'負傷：全ての味方はATK+Xを得る。Xは受けたダメージに等しい。'},
      'フォルモール': {desc:'負傷：このキャラクターは強靭1を得る。'},
      'タイタン': {desc:'開戦：全ての敵に弱体1を与える。'},
      'センチネル': {desc:'攻撃：「赤センチネル」以外のランダムな味方はHP+Xを得る。XはこのキャラクターのHPに等しい。'},
      'スケルトン': {desc:'（他の効果で召喚される「青スケルトン」も同じ強化を得る）'},
      'バンシー': {desc:'死亡：ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい。'},
      'レイス': {desc:'死亡：ランダムな味方の負傷効果を発動する。'},
      'ノスフェラトゥ': {desc:'隠密', keywords:['隠密']},
      'スケルトンキング': {desc:'攻撃：「青スケルトン」を召喚し、代わりに攻撃させる。'},
      'ゴースト': {desc:'死亡：ランダムな青キャラクターは+2/+1を得る。'},
      'ファントム': {desc:'死亡：「青シャドウ」を3体召喚する。'},
      'レムレース': {desc:'死亡：このキャラクターを倒したキャラクターが報酬に出現する。'},
      'デスナイト': {desc:'死亡：「青スケルトン」を召喚する。'},
      'ボーンチャリオット': {desc:'死亡：ランダムな味方に「死亡：「青スケルトン」を召喚する。」を付与する。'},
      'リッチ': {desc:'常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
      'ダイアウルフ': {desc:'3マナ毎：「緑ウルフ」を召喚する。'},
      'スリン': {desc:'攻撃：1マナを得る。'},
      'ミテーラ': {desc:'開戦：「緑ペリカン」を3体召喚する。'},
      'ユミル': {desc:'攻撃：+X/+Xを得る。Xはマナに等しい。'},
      'マーメイド': {desc:'常時：緑のキャラクターから得るマナは+1される。'},
      'グリムリーパー': {desc:'封印5　即死', keywords:['封印5','即死']},
      'ハイドラ': {desc:'終戦：このキャラクター以外の、生存したキャラクターが報酬に出現する。'},
      'コカトリス': {desc:'4マナ毎：ランダムな敵に防戦を与える。'},
      'スキュラ': {desc:'2マナ毎：全ての敵に毒1を与える。'},
      'レプラコーン': {desc:'終戦：ランダムなアイテムを得る。'},
      'ナーガ': {desc:'常時：戦闘中に召喚される味方は+1/+1を得る。戦闘中に召喚された味方の数だけ繰り返す。'},
      'ブラウニー': {desc:'攻撃＆負傷：全ての仲間のHPが+2される。'},
      'エルヴンメイジ': {desc:'攻撃：全ての黄キャラクターは+1/+1を得る。'},
      'タイタニア': {desc:'常時：味方の攻撃回数は1回追加される。'},
      'ケットシー': {desc:'負傷：「黄ナイトキャット」を召喚する。'},
      'カーバンクル': {desc:'常時：味方が結界を失うたび、全ての敵に1ダメージを与える。'},
      'エレメンタル': {desc:'開戦：全ての色の味方がいる場合、生命吸収を得る。'},
      'インプ': {desc:'攻撃：全ての生贄を持つキャラクターからATKを1奪う。'},
      'ベヒーモス': {desc:'解放：マナを2倍にする。', keywords:['封印3']},
      'エルフ': {desc:'結界1\n負傷：結界1を得る。', keywords:['結界1']},
      'カオス・インプ': {desc:'負傷：全ての生贄を持つキャラクターはHP+1を得る。'},
      'ナイトメア': {desc:'5マナ毎：ランダムな敵に生贄を付与する。'},
      'ファナティック': {desc:'生贄', keywords:['生贄']},
    };
    Object.entries(_requestedEffectOverrides).forEach(([name, cfg]) => {
      (PANEL_POOL || []).filter(p => p && p.name === name && String(p.category || '') === 'キャラクター').forEach(panel => {
        const forceEffectOverride = ['コカトリス','スキュラ','レプラコーン'].includes(name);
        if (panel._sheetDescLoaded && !forceEffectOverride) return;
        panel.desc = _stripOwnNameFromDesc(cfg.desc, panel.name);
        panel._sheetSeen = true;
        panel._implemented = true;
        _setPanelKeywordsFromDesc(panel);
        if (cfg.keywords) panel.keywords = _mergeUniqueKeywords(panel.keywords, cfg.keywords);
      });
    });
    const _summonOnlyOverrides = {
      'シャドウ': {desc:'（他の効果で召喚される「青シャドウ」も同じ強化を得る）', keywords:[]},
      'ウルフ': {desc:'（他の効果で召喚される「緑ウルフ」も同じ強化を得る）', keywords:[]},
      'ペリカン': {desc:'（他の効果で召喚される「緑ペリカン」も同じ強化を得る）', keywords:[]},
      'ドラゴン': {desc:'全体攻撃\n（他の効果で召喚される「緑ドラゴン」も同じ強化を得る）', keywords:['全体攻撃']},
      'ナイトキャット': {desc:'結界1\n（他の効果で召喚される「黄ナイトキャット」も同じ強化を得る）', keywords:['結界1']},
      'イフリート': {desc:'（他の効果で召喚される「赤イフリート」も同じ強化を得る）', keywords:[]},
    };
    Object.entries(_summonOnlyOverrides).forEach(([name, cfg]) => {
      (PANEL_POOL || []).filter(p => p && p.name === name && String(p.category || '') === 'キャラクター').forEach(panel => {
        if (!panel._sheetDescLoaded) panel.desc = cfg.desc;
        panel.rarity = -1;
        panel._sheetSeen = true;
        panel._implemented = true;
        if (!panel._sheetDescLoaded) _setPanelKeywordsFromDesc(panel);
        if (!panel._sheetKeywordsLoaded) panel.keywords = _mergeUniqueKeywords(panel.keywords, cfg.keywords);
      });
    });
    (PANEL_POOL || []).filter(p => p && p.name === '剣技' && ['エンチャント', '強化'].includes(String(p.category || ''))).forEach(panel => {
      if (!panel._sheetDescLoaded) panel.desc = '攻撃：ATK+3を得る。';
      panel._sheetSeen = true;
      panel._implemented = true;
      if (!panel._sheetDescLoaded) _setEnchantFieldsFromDesc(panel);
      if (!panel._sheetKeywordsLoaded) panel.adjacentKeywords = _mergeUniqueKeywords(panel.adjacentKeywords, ['剣技']);
    });
    (PANEL_POOL || []).filter(p => p && p.name === '恩寵' && ['エンチャント', '強化'].includes(String(p.category || ''))).forEach(panel => {
      if (!panel._sheetDescLoaded) panel.desc = '常時：このキャラクターの開戦効果は1回追加で発動する。';
      panel._sheetSeen = true;
      panel._implemented = true;
      if (!panel._sheetDescLoaded) _setEnchantFieldsFromDesc(panel);
      if (!panel._sheetKeywordsLoaded) panel.adjacentKeywords = _mergeUniqueKeywords(panel.adjacentKeywords, ['恩寵']);
    });
    (PANEL_POOL || []).filter(p => p && p.name === '竜の契約' && ['エンチャント', '強化'].includes(String(p.category || ''))).forEach(panel => {
      panel.no = '008';
      if (!panel._sheetDescLoaded) panel.desc = _stripOwnNameFromDesc(panel.desc || '常時：5回負傷した時、25/40、竜の「ドラコニアン」に変身する。（自身が「ドラコニアン」の場合は無効）', panel.name);
      panel._sheetSeen = true;
      panel._implemented = true;
      if (!panel._sheetDescLoaded) _setEnchantFieldsFromDesc(panel);
    });
    (PANEL_POOL || []).forEach(panel => {
      if(panel&&panel.name&&panel.desc&&!panel._sheetDescLoaded) panel.desc = _stripOwnNameFromDesc(panel.desc, panel.name);
    });
    charRows.forEach(row => {
      const name = row['名前'] || row['カード名'];
      if (!name) return;
      if (!_rowImplemented(row)) return;
      if (row['種族']) SHEET_RACE_BY_NAME[_normCardName(name)] = row['種族'];
      const isEnemyOnly = _truthySheet(row['敵専用']) || _truthySheet(row['相手キャラクター専用']);
      const isNamed = _truthySheet(row['ネームド']) || _truthySheet(row['ユニーク']);
      if (isEnemyOnly) {
        // 相手専用ネームドは通常敵プールには入れず、ボス/エリート候補としてのみ扱う。
        const upUnit = _findBySheetName(UNIT_POOL, name);
        if (isNamed) {
          let namedUnit = upUnit;
          if (!namedUnit) {
            namedUnit = _rowToUnit(row);
            namedUnit.id = 'sheet_named_' + _normCardName(name);
            namedUnit.sheetOnly = true;
            UNIT_POOL.push(namedUnit);
          }
          _sheetUnitNames.add(_normCardName(name));
          namedUnit.enemyOnly = true;
          namedUnit.rarity = -1;
          namedUnit.unique = true;
          _syncUnitFromRow(namedUnit, row);
          return;
        }
        if (upUnit) {
          upUnit.rarity = -1;
          upUnit.enemyOnly = true;
          upUnit._excludeFromNamedEnemy = true;
        }
        // ENEMY_POOL を更新（ATK/HPもシートから基礎レンジとして読み込み）
        let ep = _findBySheetName(ENEMY_POOL, name);
        if (!ep) {
          ep = {
            name,
            grade: parseInt(row['グレード']) || 1,
            keywords: [],
            race: row['種族'] || '-',
          };
          ENEMY_POOL.push(ep);
        }
        _assignSheetArtCode(ep, row, 'EN', true);
        const grade = parseInt(row['グレード']);
        if (!isNaN(grade) && grade >= 1) ep.grade = grade;
        ep.race = row['種族'] || '-';
        const atkP = _parseIntRange(row['パワー'] || row['ATK'], ep.atk || 1);
        const hpP  = _parseIntRange(row['ライフ'] || row['HP'],  ep.hp  || 2);
        const goldP = _parseIntRange(row['所持金'] || row['ゴールド'] || row['Gold'] || row['gold'], 1);
        ep.atk = atkP.val; ep.baseAtk = atkP.range;
        ep.hp  = hpP.val;  ep.baseHp  = hpP.range;
        ep.goldRange = goldP.range;
        ep.desc = row['効果'] || '';
        ep.lines = ['台詞1','台詞2','台詞3'].map(k=>String(row[k]||'').trim()).filter(Boolean);
        const epSfxType = String(row['効果音'] || row['SE'] || row['SFX'] || '').trim();
        if (epSfxType) ep.sfxType = epSfxType;
        const kwStr = (row['キーワード'] || '').trim();
        ep.keywords = kwStr ? kwStr.split(/[\s、,，]+/).filter(Boolean) : [];
        return;
      }
      // 通常キャラクター：UNIT_POOL を更新
      let unit = _findBySheetName(UNIT_POOL, name);
      if (!unit) {
        unit = _rowToUnit(row);
        unit.id = 'sheet_' + _normCardName(name);
        unit.rarity = -1;
        unit.sheetOnly = true;
        UNIT_POOL.push(unit);
      }
      delete unit.enemyOnly;
      _sheetUnitNames.add(_normCardName(name));
      _syncUnitFromRow(unit, row);
      if (_normCardName(name) === _normCardName('ミラ') || _normCardName(name) === _normCardName('アドラ')) {
        unit.starterOnly = true;
        unit.initialParty = true;
        unit.rarity = -1;
      }
    });

    if (enemyRows.length) {
      ENEMY_POOL.length = 0;
      enemyRows.forEach(row => {
        const name = row['カード名'] || row['名前'] || row['敵名'] || row['キャラクター名'];
        if (!name) return;
        if (!_rowImplemented(row)) return;
        const atkP = _parseIntRange(row['攻撃力'] || row['パワー'] || row['Power'] || row['ATK'] || row['初期ATK'] || row['atk'], 1);
        const hpP = _parseIntRange(row['ライフ'] || row['Life'] || row['HP'] || row['初期HP'] || row['hp'], 2);
        const goldP = _parseIntRange(row['所持金'] || row['ゴールド'] || row['Gold'] || row['gold'], 1);
        const level = _parseIntRange(row['レベル'] || row['グレード'] || row['grade'] || row['Grade'], 1).val;
        const turnRaw = String(row['ターン'] || '1').trim();
        const turn = turnRaw === '-' ? 999 : (parseInt(turnRaw) || 1);
        const kws = (row['キーワード'] || '').split(/[\s、,，]+/).filter(Boolean);
        const isBossEnemy = _truthySheet(row['ボス']) || _truthySheet(row['Boss']) || _truthySheet(row['ボスかどうか']);
        const enemy = {
          name,
          grade: Math.max(1, Math.round(level || 1)),
          color: row['カラー'] || '',
          race: row['種族'] || '-',
          atk: atkP.val,
          hp: hpP.val,
          baseAtk: atkP.range,
          baseHp: hpP.range,
          goldRange: goldP.range,
          keywords: kws,
          desc: row['効果'] || '',
          sfxType: String(row['効果音'] || row['SE'] || row['SFX'] || '').trim(),
          equipmentText: row['装備'] || '',
          spawnTurn: turn,
          bossOnly: isBossEnemy,
          // 「台詞1〜3」列：戦闘開始時に吹き出しで順に表示する台詞。
          lines: ['台詞1','台詞2','台詞3'].map(k=>String(row[k]||'').trim()).filter(Boolean),
          _sheetEnemy: true,
        };
        _assignSheetArtCode(enemy, row, 'EN', true);
        ENEMY_POOL.push(enemy);
      });
    }

    const starterRows = _parseCSV(ct);
    starterRows.forEach(row => {
      const starterName = _starterNameFromSheet(row['名前']);
      if (!starterName) return;
      _sheetUnitNames.add(_normCardName(starterName));
      _syncStarterFromRow(_findStarterUnitBySheetName(starterName), row);
    });

    // シートに存在しない内蔵キャラクターは出現候補から外す。
    // 旧データ（例：ヴァンパイア等）が報酬/ネームド敵に漏れるのを防ぐ。
    UNIT_POOL.forEach(unit => {
      if (!unit || unit.id === 'c_golem') return;
      if (!_sheetUnitNames.has(_normCardName(unit.name))) {
        unit.rarity = -1;
        unit._excludeFromNamedEnemy = true;
      }
    });

    console.log(
      `[Vesselbound] データ読み込み完了 — 階層:${FLOOR_DATA.length - 1} グレードアップ費用:${GRADE_UP_COSTS.join(',')} キャラ上書き:${charRows.length}件 KW:${Object.keys(KW_DESC_MAP).length}件 敵:${ENEMY_POOL.length}件 カード上書き:${_seenPanelIds.size}件 指輪:${RING_POOL.length}件`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
