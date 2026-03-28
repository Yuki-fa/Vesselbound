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
    const unitGid = _SHEET_GIDS['キャラクタープール'];
    const hasUnitSheet = unitGid && unitGid !== 0;
    const fetches = [
      hasUnitSheet ? fetch(_sheetUrl(unitGid)) : Promise.resolve(null),
      fetch(_sheetUrl(_SHEET_GIDS['指輪プール'])),
      fetch(_sheetUrl(_SHEET_GIDS['魔法プール'])),
      fetch(_sheetUrl(_SHEET_GIDS['階層データ'])),
      fetch(_sheetUrl(_SHEET_GIDS['エンチャント'])),
      fetch(_sheetUrl(_SHEET_GIDS['敵キーワード'])),
      fetch(_sheetUrl(_SHEET_GIDS['effect_id'])),
    ];
    const responses = await Promise.all(fetches);
    for (const r of responses) {
      if (r && !r.ok) throw new Error('HTTP ' + r.status);
    }
    const texts = await Promise.all(responses.map(r => r ? r.text() : Promise.resolve('')));
    const [ut, rt, st, ft, et, kt, xt] = texts;

    // ── キャラクタープール（GIDが設定されている場合のみ）──
    if (hasUnitSheet && ut) {
      const unitRows = _parseCSV(ut);
      // JS定義を退避（effect/injury/icon等コード管理プロパティ用）
      const _savedUnits = UNIT_POOL.slice();
      UNIT_POOL.length = 0;
      unitRows.forEach(row => {
        if (!row['名前']) return;
        const su = _rowToUnit(row);
        // JS定義から名前マッチでid・コード管理プロパティを補完
        const js = _savedUnits.find(u => u && u.name === su.name);
        if (js) {
          su.id     = js.id;
          su.icon   = js.icon || su.icon;
          su.effect = js.effect || null;
          su.injury = js.injury || null;
          su.counter= js.counter || false;
          su.hate   = js.hate   || false;
          su.regen  = js.regen  || 0;
          su.shield = js.shield || 0;
        } else {
          su.id = 'u_' + su.name;
        }
        UNIT_POOL.push(su);
      });
    }

    // ── 指輪プール（名前ベースマッチング）──
    const _savedRings = RING_POOL.slice();
    const ringRows = _parseCSV(rt);
    RING_POOL.length = 0;
    ringRows.forEach(row => { if (row['名前']) RING_POOL.push(_rowToRing(row)); });
    // trigger/unique/onDeath/regen/count はコード定義で上書き（名前ベース）
    RING_POOL.forEach(ring => {
      const js = _savedRings.find(r => r && r.name === ring.name);
      if (!js) return;
      // JS定義のすべてのコードプロパティを上書き（シートは説明文・価格・starterOnlyのみ）
      ring.id       = js.id;
      ring.kind     = js.kind;
      if (js.trigger     !== undefined) ring.trigger     = js.trigger;
      if (js.unique      !== undefined) ring.unique      = js.unique;
      if (js.onDeath     !== undefined) ring.onDeath     = js.onDeath;
      if (js.regen       !== undefined) ring.regen       = js.regen;
      if (js.legend      !== undefined) ring.legend      = js.legend;
      if (js.count       !== undefined) ring.count       = js.count;
      if (js.summon      !== undefined) ring.summon      = js.summon;
      if (js.atkPerGrade !== undefined) ring.atkPerGrade = js.atkPerGrade;
      if (js.hpPerGrade  !== undefined) ring.hpPerGrade  = js.hpPerGrade;
      if (js.guardian    !== undefined) ring.guardian    = js.guardian;
      if (js.triggerCount!== undefined) ring.triggerCount= js.triggerCount;
      // starterOnly はシート優先（JS定義でも上書き可）
      if (!ring.starterOnly && js.starterOnly) ring.starterOnly = js.starterOnly;
    });

    // ── 魔法プール（名前ベースマッチング、シートにないものは出さない）──
    const _savedSpells = SPELL_POOL.slice();
    const spellRows = _parseCSV(st);
    SPELL_POOL.length = 0;
    spellRows.forEach(row => {
      if (!row['名前']) return;
      const ss = _rowToSpell(row);
      // JS定義から名前マッチでid・コード管理プロパティを補完
      const js = _savedSpells.find(s => s && s.name === ss.name);
      if (js) {
        ss.id         = js.id;
        if (js.needsEnemy !== undefined) ss.needsEnemy = js.needsEnemy;
        if (js.needsAlly  !== undefined) ss.needsAlly  = js.needsAlly;
        if (js.needsAny   !== undefined) ss.needsAny   = js.needsAny;
        if (js.effect     !== undefined) ss.effect     = js.effect;
        if (js.baseUses   !== undefined) ss.baseUses   = js.baseUses;
        if (js.starterOnly!== undefined) ss.starterOnly= js.starterOnly;
        if (js.unique     !== undefined) ss.unique     = js.unique;
        if (js.type       !== undefined) ss.type       = js.type;
      } else {
        ss.id = 'sp_' + ss.name;
      }
      // 価格はシートのものを優先（JS定義で上書きしない）
      if (!ss.cost && row['価格']) ss.cost = parseInt(row['価格']) || 0;
      SPELL_POOL.push(ss);
    });
    // ※ シートにないJS定義スペルは補完しない（シートが正とする）

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
