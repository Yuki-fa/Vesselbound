// ═══════════════════════════════════════
// loader.js — Google Sheets データローダー
// 起動時に CSV を fetch し RING_POOL / SPELL_POOL / FLOOR_DATA /
// BOSS_FLOORS / ENCHANT_TYPES をインプレースで上書きする。
// fetch 失敗時は内蔵データ（他の data/*.js）をそのまま使用。
// ═══════════════════════════════════════

const _EXPORT_BASE =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vRr3wWLfbyxvDQjJN80BJDgqmdow8aUWTXOwiY__3OvvlhPAID_fMkqxqTnKQLbiQ' +
  '/pub?output=csv';
function _sheetUrl(gid){ return _EXPORT_BASE + '&gid=' + gid + '&single=true&t=' + Date.now(); }
const _SHEET_GIDS = {
  'キャラクタープール': 848932419,
  '指輪プール':   426459898,
  '魔法プール':  1848829406,
  '階層データ':   920830789,
  'エンチャント':  320923773,
  '敵キーワード':  769775182,
  'effect_id':    992952088,
  'グレードアップ費用': 1903359867,
};

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
    headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
    return obj;
  // 「名前」列があれば名前ベース、なければ先頭列ベースでフィルタ
  }).filter(row => row && (row['名前'] || row[headers[0]]));
}

// ── 行 → キャラクターオブジェクト（シートデータのみ。effect/injury等はJS定義で上書き）──
function _rowToUnit(row) {
  return {
    id:     '',                                // JS定義から名前マッチで補完
    name:   row['名前'],
    race:   row['種族']  || '-',
    grade:  parseInt(row['グレード']) || 1,
    atk:    parseInt(row['パワー'] || row['ATK'])   || 0,
    hp:     parseInt(row['ライフ'] || row['HP'])    || 0,
    cost:   parseInt(row['価格']) || 0,
    unique: row['ネームド'] === 'TRUE' || row['ネームド'] === '✓' || row['ユニーク'] === 'TRUE' || row['ユニーク'] === '✓',
    desc:   row['効果']   || '',
    icon:   row['アイコン'] || '❓',
  };
}

// ── 行 → 指輪オブジェクト ──────────────────────────
function _rowToRing(row) {
  const obj = {
    id:    '',    // JS定義から補完
    name:  row['名前'],
    type:  'ring',
    grade: 1,
  };
  // ユニーク・legend
  if (row['ユニーク'] === 'TRUE' || row['ユニーク'] === '✓') obj.legend = true;
  // 価格
  const cost = parseInt(row['価格']);
  if (!isNaN(cost)) obj.cost = cost;
  // 初期装備分類
  if (row['初期装備'] === 'TRUE' || row['初期装備'] === '✓') obj.starterOnly = true;
  obj.desc = row['効果'] || row['説明文'] || '';
  return obj;
}

// ── 行 → 魔法オブジェクト ──────────────────────────
function _rowToSpell(row) {
  const obj = {
    id:    '',    // JS定義から補完
    name:  row['名前'],
    type:  row['種別'] || row['種別(wand/consumable)'],
    grade: 1,
  };
  // 基本使用回数
  const usesStr = row['基本使用回数'] || '';
  if (usesStr && !usesStr.includes('-')) obj.baseUses = parseInt(usesStr) || undefined;
  // 価格
  const cost = parseInt(row['価格']);
  if (!isNaN(cost)) obj.cost = cost;
  // 初期装備分類
  if (row['初期装備'] === 'TRUE' || row['初期装備'] === '✓') obj.starterOnly = true;
  obj.desc = row['効果'] || row['説明文'] || '';
  return obj;
}

// ── メイン読み込み ──────────────────────────────────
async function loadGameData() {
  try {
    // 階層データ・キーワード・グレードアップ費用をシートから取得
    const fetches = [
      fetch(_sheetUrl(_SHEET_GIDS['階層データ'])),
      fetch(_sheetUrl(_SHEET_GIDS['敵キーワード'])),
      fetch(_sheetUrl(_SHEET_GIDS['グレードアップ費用'])),
    ];
    const responses = await Promise.all(fetches);
    for (const r of responses) {
      if (r && !r.ok) throw new Error('HTTP ' + r.status);
    }
    const [ft, kt, gt] = await Promise.all(responses.map(r => r.text()));

    // ── 階層データ ──
    const floorRows = _parseCSV(ft);
    console.table(floorRows.slice(0, 5));
    // floors.js のフォールバック wands を事前に退避
    const _savedWands = FLOOR_DATA.map(fd => fd?.wands);
    // 旧アクション文字列 → 杖ID のマッピング
    const _actionToWandId = {'強化':'cw_buff','鼓舞':'cw_heal','召喚':'cw_summon','シールド':'cw_shield','ヘイト':'cw_hate'};
    const _validWandIds = new Set(['cw_buff','cw_heal','cw_summon','cw_shield','cw_hate']);
    FLOOR_DATA.length = 0;
    FLOOR_DATA.push(null); // index 0 は null（1始まり）
    BOSS_FLOORS.length = 0;
    floorRows.forEach(row => {
      const fl = parseInt(row['階層']);
      if (!fl || isNaN(fl)) return;
      const isBoss = row['ボス'] === '✓' || row['ボスかどうか'] === '✓' || row['ボス'] === 'TRUE';
      const actStr = (row['行動'] || row['杖'] || row['司令官行動'] || '').trim();
      let wands;
      if (!actStr) {
        // 空欄 → floors.js のフォールバックを使用
        wands = _savedWands[fl] || [];
      } else if (actStr.startsWith('なし')) {
        // 明示的スキップ → 杖なし
        wands = [];
      } else {
        // 有効な文字列 → 杖IDまたは旧アクション文字列をパース
        wands = actStr.split(/[,、;；\s]+/)
          .map(s => _actionToWandId[s.trim()] || s.trim())
          .filter(s => _validWandIds.has(s));
      }
      FLOOR_DATA[fl] = {
        power: parseInt(row['power']) || 10,
        grade: Math.max(1, parseFloat(row['グレード'] || row['grade']) || 1),
        wands: wands,
      };
      if (isBoss) {
        FLOOR_DATA[fl].boss = true;
        const bs = parseInt(row['ボスシールドの数'] || row['ボスシールド']);
        if (!isNaN(bs)) FLOOR_DATA[fl].bossShield = bs;
        // BOSS_FLOORS はボス階の「1つ前」の階番号（移動先選択でボス専用表示に使う）
        BOSS_FLOORS.push(fl - 1);
      }
    });

    // ── 敵キーワード ──
    const kwRows = _parseCSV(kt);
    if (kwRows.length > 0) {
      const kwKey = Object.keys(kwRows[0])[0]; // 先頭列名を自動取得
      ENEMY_KEYWORDS.length = 0;
      kwRows.forEach(row => { if (row[kwKey]) ENEMY_KEYWORDS.push(row[kwKey]); });
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

    console.log(
      `[Vesselbound] データ読み込み完了 — 階層:${FLOOR_DATA.length - 1} 敵KW:${ENEMY_KEYWORDS.length} グレードアップ費用:${GRADE_UP_COSTS.join(',')}`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
