// ═══════════════════════════════════════
// loader.js — Google Sheets データローダー
// 起動時に CSV を fetch し RING_POOL / SPELL_POOL / FLOOR_DATA /
// BOSS_FLOORS / ENCHANT_TYPES をインプレースで上書きする。
// fetch 失敗時は内蔵データ（他の data/*.js）をそのまま使用。
// ═══════════════════════════════════════

const _EXPORT_BASE =
  'https://docs.google.com/spreadsheets/d/19rqZZey6ftz_ntoxs7P4RkJt2SGxQi7B' +
  '/export?format=csv&gid=';
const _SHEET_GIDS = {
  '指輪プール':  1078274854,
  '魔法プール':  1593958181,
  '階層データ':  701286537,
  'エンチャント': 300601659,
  '敵キーワード': 1366116419,
  'effect_id':   1282840648,
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
  obj.desc = row['説明文'] || '';
  // グレードごとの上昇値（atkPerGrade / hpPerGrade）
  const atkPG = parseFloat(row['上昇ATK']);
  const hpPG  = parseFloat(row['上昇HP']);
  if (!isNaN(atkPG)) obj.atkPerGrade = atkPG;
  if (!isNaN(hpPG))  obj.hpPerGrade  = hpPG;
  // legend フラグ（ユニーク指輪・通常報酬に出ない）
  if (row['legend'] === 'TRUE' || row['legend'] === '✓') obj.legend = true;
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
  obj.desc = row['説明文'] || '';
  return obj;
}

// ── メイン読み込み ──────────────────────────────────
async function loadGameData() {
  try {
    const fetches = [
      fetch(_EXPORT_BASE + _SHEET_GIDS['指輪プール']  + '&t=' + Date.now()),
      fetch(_EXPORT_BASE + _SHEET_GIDS['魔法プール']  + '&t=' + Date.now()),
      fetch(_EXPORT_BASE + _SHEET_GIDS['階層データ']  + '&t=' + Date.now()),
      fetch(_EXPORT_BASE + _SHEET_GIDS['エンチャント'] + '&t=' + Date.now()),
      fetch(_EXPORT_BASE + _SHEET_GIDS['敵キーワード'] + '&t=' + Date.now()),
      fetch(_EXPORT_BASE + _SHEET_GIDS['effect_id']   + '&t=' + Date.now()),
    ];
    const responses = await Promise.all(fetches);
    for (const r of responses) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }
    const [rt, st, ft, et, kt, xt] = await Promise.all(responses.map(r => r.text()));

    // ── 指輪プール ──
    // JS定義（rings.js）の行動プロパティを退避（trigger/unique/onDeath/regenはコード管理）
    const _savedRings = RING_POOL.slice();
    const ringRows = _parseCSV(rt);
    RING_POOL.length = 0;
    ringRows.forEach(row => { if (row['id'] && row['名前']) RING_POOL.push(_rowToRing(row)); });
    // スプレッドシートのtrigger/unique/onDeath/regenはコードの定義で上書き
    RING_POOL.forEach(ring => {
      const js = _savedRings.find(r => r && r.id === ring.id);
      if (!js) return;
      if (js.trigger  !== undefined) ring.trigger  = js.trigger;
      if (js.unique   !== undefined) ring.unique    = js.unique;
      if (js.onDeath  !== undefined) ring.onDeath   = js.onDeath;
      if (js.regen    !== undefined) ring.regen     = js.regen;
    });

    // ── 魔法プール ──
    const spellRows = _parseCSV(st);
    SPELL_POOL.length = 0;
    spellRows.forEach(row => { if (row['id'] && row['名前']) SPELL_POOL.push(_rowToSpell(row)); });

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
      const isBoss = row['ボス'] === '✓';
      const actStr = (row['杖'] || row['司令官行動'] || '').trim();
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
        grade: parseInt(row['grade']) || 1,
        wands: wands,
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
    encRows.forEach(row => { if (row['id']) ENCHANT_TYPES.push({id:row['id'], effect:row['効果']||''}); });

    // ── 敵キーワード ──
    const kwRows = _parseCSV(kt);
    if (kwRows.length > 0) {
      const kwKey = Object.keys(kwRows[0])[0]; // 先頭列名を自動取得
      ENEMY_KEYWORDS.length = 0;
      kwRows.forEach(row => { if (row[kwKey]) ENEMY_KEYWORDS.push(row[kwKey]); });
    }

    // ── effect_id一覧 ──
    const exRows = _parseCSV(xt);
    if (exRows.length > 0) {
      const exKey = Object.keys(exRows[0])[0];
      EFFECT_IDS.length = 0;
      exRows.forEach(row => { if (row[exKey]) EFFECT_IDS.push(row[exKey]); });
    }

    console.log(
      `[Vesselbound] データ読み込み完了 — 指輪:${RING_POOL.length} 魔法:${SPELL_POOL.length}` +
      ` 階層:${FLOOR_DATA.length - 1} エンチャント:${ENCHANT_TYPES.length}` +
      ` 敵KW:${ENEMY_KEYWORDS.length} effectID:${EFFECT_IDS.length}`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
