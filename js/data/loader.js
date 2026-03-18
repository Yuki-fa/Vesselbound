// ═══════════════════════════════════════
// loader.js — Google Sheets データローダー
// 起動時に CSV を fetch し RING_POOL / SPELL_POOL / FLOOR_DATA /
// BOSS_FLOORS / ENCHANT_TYPES をインプレースで上書きする。
// fetch 失敗時は内蔵データ（他の data/*.js）をそのまま使用。
// ═══════════════════════════════════════

const _SHEET_BASE =
  'https://docs.google.com/spreadsheets/d/19rqZZey6ftz_ntoxs7P4RkJt2SGxQi7B' +
  '/gviz/tq?tqx=out:csv&sheet=';

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
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = _csvRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const vals = _csvRow(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
    return obj;
  }).filter(row => row && row[headers[0]]);
}

// ── 行 → 指輪オブジェクト ──────────────────────────
function _rowToRing(row) {
  const isSummon = row['種別(summon/passive)'] === 'summon';
  const obj = {
    id:    row['id'],
    name:  row['名前'],
    type:  'ring',
    kind:  row['種別(summon/passive)'],
    grade: 1,
  };
  if (isSummon) {
    obj.trigger = row['トリガー'];
    obj.summon  = {
      atk:  parseInt(row['基本ATK']) || 0,
      hp:   parseInt(row['基本HP'])  || 0,
      name: row['召喚名'],
      icon: row['アイコン'],
    };
    const cnt = parseInt(row['召喚数']);
    if (cnt > 0) obj.count = cnt;
    if (row['guardian'] === 'TRUE') obj.guardian = true;
    const tc = parseInt(row['triggerCount']);
    if (tc > 0) obj.triggerCount = tc;
  }
  if (row['unique'])  obj.unique  = row['unique'];
  if (row['onDeath']) obj.onDeath = row['onDeath'];
  return obj;
}

// ── 行 → 魔法オブジェクト ──────────────────────────
function _rowToSpell(row) {
  const obj = {
    id:     row['id'],
    name:   row['名前'],
    type:   row['種別(wand/consumable)'],
    effect: row['effect'],
    grade:  1,
  };
  if (row['needsEnemy']  === 'TRUE') obj.needsEnemy  = true;
  if (row['needsAlly']   === 'TRUE') obj.needsAlly   = true;
  if (row['starterOnly'] === 'TRUE') obj.starterOnly  = true;
  // 使用回数："5" → 固定値、"3-6" → randUses() に任せる（baseUses未設定）
  const usesStr = row['基本使用回数'] || '';
  if (usesStr && !usesStr.includes('-')) obj.baseUses = parseInt(usesStr) || undefined;
  // instakill は任意ターゲット
  if (obj.effect === 'instakill') obj.needsAny = true;
  return obj;
}

// ── メイン読み込み ──────────────────────────────────
async function loadGameData() {
  const sheetName = s => _SHEET_BASE + encodeURIComponent(s);
  try {
    const fetches = [
      fetch(sheetName('指輪プール')),
      fetch(sheetName('魔法プール')),
      fetch(sheetName('階層データ')),
      fetch(sheetName('エンチャント')),
    ];
    const responses = await Promise.all(fetches);
    for (const r of responses) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }
    const [rt, st, ft, et] = await Promise.all(responses.map(r => r.text()));

    // ── 指輪プール ──
    const ringRows = _parseCSV(rt);
    RING_POOL.length = 0;
    ringRows.forEach(row => { if (row['id']) RING_POOL.push(_rowToRing(row)); });

    // ── 魔法プール ──
    const spellRows = _parseCSV(st);
    SPELL_POOL.length = 0;
    spellRows.forEach(row => { if (row['id']) SPELL_POOL.push(_rowToSpell(row)); });

    // ── 階層データ ──
    const floorRows = _parseCSV(ft);
    FLOOR_DATA.length = 0;
    FLOOR_DATA.push(null); // index 0 は null（1始まり）
    BOSS_FLOORS.length = 0;
    floorRows.forEach(row => {
      const fl = parseInt(row['階層']);
      if (!fl || isNaN(fl)) return;
      const isBoss = row['ボス'] === '✓';
      const actStr = (row['行動'] || '').trim();
      const actions = actStr ? actStr.split(/[,、]+/).map(s => s.trim()).filter(Boolean) : [];
      FLOOR_DATA[fl] = {
        power:   parseInt(row['power']) || 10,
        grade:   parseInt(row['grade']) || 1,
        actions: actions,
      };
      if (isBoss) {
        FLOOR_DATA[fl].boss = true;
        // BOSS_FLOORS はボス階の「1つ前」の階番号（移動先選択でボス専用表示に使う）
        BOSS_FLOORS.push(fl - 1);
      }
    });

    // ── エンチャント ──
    const encRows = _parseCSV(et);
    ENCHANT_TYPES.length = 0;
    encRows.forEach(row => { if (row['id']) ENCHANT_TYPES.push(row['id']); });

    console.log(
      `[Vesselbound] データ読み込み完了 — 指輪:${RING_POOL.length} 魔法:${SPELL_POOL.length}` +
      ` 階層:${FLOOR_DATA.length - 1} エンチャント:${ENCHANT_TYPES.length}`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
