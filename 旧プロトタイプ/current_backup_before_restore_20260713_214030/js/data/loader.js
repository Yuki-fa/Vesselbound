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
  'プレイヤー':   266813898,
  '階層データ':   920830789,
  '敵':          1498560754,
  'キャラクター': 639070265,
  '強化':        269074289,
  '魔法':        741521357,
  'キーワード':  769775182,
  'グレードアップ費用': 1903359867,
};

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
  }).filter(row => row && (row['名前'] || row['カード名'] || row[headers[0]] || row['__col0']));
}

const _XLSX_PATHS = ['./Vesselbound_data.xlsx', './Vesselbound_data .xlsx'];
const _XLSX_SHEETS = {
  floor: '階層データ',
  grade: 'グレードアップ',
  char: 'プレイヤー',
  enemy: '敵',
  keyword: 'キーワード',
  card: 'キャラクター',
  enchant: '強化',
  spell: '魔法',
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
    spt: data.spell || '名前\n',
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
    ft: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.floor, true),
    gt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.grade, true),
    ct: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.char, true),
    et: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.enemy, false),
    kwt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.keyword, false),
    pt: _xlsxSheetToCSVAny(workbook, [_XLSX_SHEETS.card, 'カード'], false),
    ent: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.enchant, false),
    spt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.spell, false),
  };
}

async function _loadGameDataFromGoogleCsv() {
  const fetches = [
    fetch(_sheetUrl(_SHEET_GIDS['階層データ'])),
    fetch(_sheetUrl(_SHEET_GIDS['グレードアップ費用'])),
    fetch(_sheetUrl(_SHEET_GIDS['プレイヤー'])),
    fetch(_sheetUrl(_SHEET_GIDS['敵'])),
    fetch(_sheetUrl(_SHEET_GIDS['キャラクター'])),
    fetch(_sheetUrl(_SHEET_GIDS['強化'])),
    fetch(_sheetUrl(_SHEET_GIDS['魔法'])),
  ];
  const responses = await Promise.all(fetches);
  for (const r of responses) {
    if (r && !r.ok) throw new Error('HTTP ' + r.status);
  }
  const [ft, gt, ct, et, pt, ent, spt] = await Promise.all(responses.map(r => r.text()));
  let kwt = '名前\n';
  try {
    const kwRes = await fetch(_sheetUrl(_SHEET_GIDS['キーワード']));
    if (kwRes.ok) kwt = await kwRes.text();
  } catch (_) { /* 任意シート */ }
  return { source: 'csv', ft, gt, ct, et, kwt, pt, ent, spt };
}

// ── "1-3" または "3" 形式の文字列を {val, range:[min,max]} にパース ──
function _parseIntRange(s, fallback) {
  if (!s || !String(s).trim()) return { val: fallback, range: [fallback, fallback] };
  const raw = String(s).trim();
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
  return s === 'TRUE' || s === '✓' || s === '◯' || s === '○';
}

function _falseySheet(v) {
  const s = String(v || '').trim();
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

function _splitSheetList(s) {
  return String(s || '').split(/[、,，/／・\s]+/).map(v=>v.trim()).filter(Boolean);
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

function _sheetAbilityText(s) {
  return String(s || '').trim().replace(/^<([^>]+)>/, '$1：');
}

function _sheetNumber(v, fallback) {
  const n = parseInt(String(v || '').trim(), 10);
  return isNaN(n) ? fallback : n;
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
  };
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
    const { source, ft, gt, ct, et, kwt, pt, ent, spt } = loaded;

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
      });
    } catch (_) { /* キーワード説明文なしで続行 */ }

    // ── 階層データ ──
    const floorRows = _parseCSV(ft);
    console.table(floorRows.slice(0, 5));
    const validFloorRows = floorRows.filter(row => {
      const fl = parseInt(row['階層'] || row['戦闘回数'] || row['floor']);
      return !!fl && !isNaN(fl);
    });
    if (validFloorRows.length) {
    FLOOR_DATA.length = 0;
    FLOOR_DATA.push(null); // index 0 は null（1始まり）
    BOSS_FLOORS.length = 0;
    validFloorRows.forEach(row => {
      const fl = parseInt(row['階層'] || row['戦闘回数'] || row['floor']);
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
      if (row['キーワード'] !== undefined) {
        const kwStr = row['キーワード'].trim();
        unit.keywords = kwStr ? kwStr.split(/[\s、,，]+/).filter(Boolean) : [];
        unit.shield  = unit.keywords.includes('シールド') ? (unit.shield || 1) : 0;
        if (unit.keywords.includes('標的')) { unit.hate = true; unit.hateTurns = 99; }
        else { unit.hate = false; unit.hateTurns = 0; }
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
    // ── 「キャラクター」「強化」「魔法」シート → PANEL_POOL/SPELL_POOL 同期 ──
    // マナは色を持たない単一プールに統一されたため、カードの「色」は見た目・種族分類用のみに使う。
    // 茶は廃止し黄に統一する（紫は既存の色として扱う）。
    const _normalizeColorText = color => { const c = String(color || '').trim(); return c === '茶' ? '黄' : c; };
    const _rowImplemented = row => {
      if (!row || row['実装'] === undefined) return true;
      return !_falseySheet(row['実装']);
    };
    // 「Xマナ：効果」形式の説明文から、Xマナ貯まった時点で即座に発動するコストを読み取る
    // （キャラクター・強化パネル共通。スペルの「コスト」列とは別に、説明文自身がコストを兼ねる）
    const _setManaThresholdFromDesc = panel => {
      const desc = String(panel.desc || '');
      const m = desc.match(/^(\d+)マナ：/);
      if (m) panel.manaCost = parseInt(m[1], 10) || 0;
      else delete panel.manaCost;
    };
    const _setPanelKeywordsFromDesc = panel => {
      const desc = String(panel.desc || '');
      const kws = [];
      // 「復活を付与する」は自身ではなく他者に付与する効果のため、自身の復活キーワードとしては扱わない
      if (/復活/.test(desc) && !/復活を付与する/.test(desc)) kws.push('復活');
      if (/シールド/.test(desc)) kws.push('シールド');
      if (/根性/.test(desc)) kws.push('根性');
      if (/即死/.test(desc)) kws.push('即死');
      const poison = desc.match(/毒牙\s*(\d*)/);
      if (poison) kws.push('毒牙' + (poison[1] || '1'));
      const strengthen = desc.match(/([赤青緑黄紫茶])強化/);
      if (strengthen) kws.push(`${_normalizeColorText(strengthen[1])}強化`);
      // 「死亡：全てのA色キャラクターは+atk/+hpを得る。」→ 内部集計用キーワードとして色・数値を埋め込む
      const colorBuffAll = desc.match(/死亡：全ての([赤青緑黄紫茶])キャラクターは\+(\d+)\/\+(\d+)を得る/);
      if (colorBuffAll) kws.push(`${_normalizeColorText(colorBuffAll[1])}全体強化${colorBuffAll[2]}_${colorBuffAll[3]}`);
      panel.keywords = kws;

      delete panel.summonCount;
      delete panel.manaOnAttack;
      delete panel.manaOnInjury;
      delete panel.goldOnBattleEnd;
      delete panel.goldOnDeath;
      if (/コピーを1体召喚/.test(desc)) panel.summonCount = 2;
      if (/コピーを2体召喚/.test(desc)) panel.summonCount = 3;
      // マナは色を持たないため、直前に色文字が残っていても無視し、数字（省略時は1）だけを読み取る
      const attackMana = desc.match(/攻撃：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/);
      if (attackMana) panel.manaOnAttack = parseInt(attackMana[1], 10) || 1;
      const injuryMana = desc.match(/負傷：\s*(?:[赤青緑黄紫茶])?\s*(\d*)マナを?得る/);
      if (injuryMana) panel.manaOnInjury = parseInt(injuryMana[1], 10) || 1;
      const goldEnd = desc.match(/終戦：\s*(\d+)\s*ゴールドを?得る/);
      if (goldEnd) panel.goldOnBattleEnd = parseInt(goldEnd[1], 10) || 0;
      const goldDeath = desc.match(/死亡：\s*(\d+)\s*ゴールドを?得る/);
      if (goldDeath) panel.goldOnDeath = parseInt(goldDeath[1], 10) || 0;
      _setManaThresholdFromDesc(panel);
    };
    const _setEnchantFieldsFromDesc = panel => {
      const desc = String(panel.desc || '');
      panel.adjacentAtkBonus = 0;
      panel.adjacentHpBonus = 0;
      panel.adjacentKeywords = [];
      let m = desc.match(/常時：\s*\+(\d+)\s*\/\s*\+(\d+)/);
      if (m) {
        panel.adjacentAtkBonus = parseInt(m[1], 10) || 0;
        panel.adjacentHpBonus = parseInt(m[2], 10) || 0;
      }
      m = desc.match(/常時：\s*HP\+(\d+)/);
      if (m) panel.adjacentHpBonus = parseInt(m[1], 10) || 0;
      m = desc.match(/常時：\s*ATK\+(\d+)/);
      if (m) panel.adjacentAtkBonus = parseInt(m[1], 10) || 0;
      m = desc.match(/常時：\s*-(\d+)\s*\/\s*-(\d+)/);
      if (m) {
        panel.adjacentAtkBonus = -(parseInt(m[1], 10) || 0);
        panel.adjacentHpBonus = -(parseInt(m[2], 10) || 0);
      }
      ['逆襲','闇の儀式','闇の炎','狂気','根性','生贄','治癒能力'].forEach(k=>{
        if (desc.includes(k)) panel.adjacentKeywords.push(k);
      });
      const strengthen = desc.match(/([赤青緑黄紫茶])強化/);
      if (strengthen) panel.adjacentKeywords.push(`${_normalizeColorText(strengthen[1])}強化`);
      const poison = desc.match(/毒牙\s*(\d*)/);
      if (poison) panel.adjacentKeywords.push('毒牙' + (poison[1] || '1'));
      const colorMana = desc.match(/召喚：\s*(?:[赤青緑黄紫茶])?\s*\d*マナを?得る/);
      if (colorMana) panel.adjacentKeywords.push('マナ召喚');
      if (/三方向/.test(desc)) panel.directionCount = 3;
      else if (/四方向/.test(desc)) panel.directionCount = 4;
      else panel.directionCount = panel.directionCount || 2;
      _setManaThresholdFromDesc(panel);
    };
    const _syncPanelFromRow = (panel, row, forcedCategory) => {
      if (!panel) return;
      panel._sheetSeen = true;
      const category = forcedCategory || (row['分類'] || '').trim() || panel.category || '';
      const artFallback = category === 'スペル' ? 'S' : (category === '強化' || category === 'エンチャント') ? 'E' : 'C';
      _assignSheetArtCode(panel, row, artFallback);
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
      // 「コスト」列は強化/キャラクターシートでは実カードほぼ全行が "-" で対応するフィールドがないため
      // 同期対象外。スペルシートのみ発動に必要なマナ数として実際に使われているため manaCost に同期する。
      if (category === 'スペル') {
        const spellCostStr = (row['コスト'] || '').trim();
        if (spellCostStr && spellCostStr !== '-') {
          const spellCostVal = parseInt(spellCostStr);
          if (!isNaN(spellCostVal)) panel.manaCost = spellCostVal;
        }
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
      if (panel.category === 'キャラクター') _setPanelKeywordsFromDesc(panel);
      if (panel.category === 'エンチャント') _setEnchantFieldsFromDesc(panel);
    };
    const cardRows = _parseCSVWithHeader(pt || '名前\n', ['No.', '名前']);
    const enchantRows = _parseCSVWithHeader(ent || '名前\n', ['No.', '名前']);
    const spellRows = _parseCSVWithHeader(spt || '名前\n', ['No.', '名前']);
    const _seenPanelIds = new Set();
    const _syncPanelRows = (rows, forcedCategory, targetPool) => rows.forEach(row => {
      const name = row['名前'] || row['カード名'];
      if (!name) return;
      if (!_rowImplemented(row)) return;
      if (forcedCategory === 'キャラクター') {
        const hasStats = String(row['パワー'] || row['攻撃力'] || row['ATK'] || '').trim()
          || String(row['ライフ'] || row['HP'] || '').trim();
        if (!hasStats) return;
      }
      const pool = targetPool || PANEL_POOL;
      const candidates = _filterBySheetName(pool, name);
      if (!candidates.length) return; // PANEL_POOL/SPELL_POOLに存在しない新規カードは今回追加しない（スコープ外）
      let panel = candidates.length === 1 ? candidates[0] : (
        candidates.find(p => !_seenPanelIds.has(p.id) && String(p.category || '') === forcedCategory)
        || candidates.find(p => !_seenPanelIds.has(p.id))
        || candidates[0]
      );
      if (_seenPanelIds.has(panel.id)) return; // 既に別の行で同期済みのIDは再上書きしない（同名衝突対策）
      _seenPanelIds.add(panel.id);
      _syncPanelFromRow(panel, row, forcedCategory);
    });
    _syncPanelRows(cardRows, 'キャラクター', PANEL_POOL);
    _syncPanelRows(enchantRows, 'エンチャント', PANEL_POOL);
    _syncPanelRows(spellRows, 'スペル', typeof SPELL_POOL !== 'undefined' ? SPELL_POOL : []);
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
        ep.atk = atkP.val; ep.baseAtk = atkP.range;
        ep.hp  = hpP.val;  ep.baseHp  = hpP.range;
        ep.desc = row['効果'] || '';
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
          keywords: kws,
          desc: row['効果'] || '',
          equipmentText: row['装備'] || '',
          spawnTurn: turn,
          bossOnly: isBossEnemy,
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
      `[Vesselbound] データ読み込み完了 — 階層:${FLOOR_DATA.length - 1} グレードアップ費用:${GRADE_UP_COSTS.join(',')} キャラ上書き:${charRows.length}件 KW:${Object.keys(KW_DESC_MAP).length}件 敵:${ENEMY_POOL.length}件 カード上書き:${_seenPanelIds.size}件`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
