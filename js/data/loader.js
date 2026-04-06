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

// ── "1-3" または "3" 形式の文字列を {val, range:[min,max]} にパース ──
function _parseIntRange(s, fallback) {
  if (!s || !String(s).trim()) return { val: fallback, range: [fallback, fallback] };
  const m = String(s).match(/^(\d+)\s*[-~〜]\s*(\d+)$/);
  if (m) {
    const lo = parseInt(m[1]), hi = parseInt(m[2]);
    return { val: hi, range: [lo, hi] };
  }
  const v = parseInt(s);
  return isNaN(v) ? { val: fallback, range: [fallback, fallback] } : { val: v, range: [v, v] };
}

// ── 行 → キャラクターオブジェクト（シートデータのみ。effect/injury等はJS定義で上書き）──
function _rowToUnit(row) {
  const atkP = _parseIntRange(row['パワー'] || row['ATK'], 0);
  const hpP  = _parseIntRange(row['ライフ'] || row['HP'],  0);
  return {
    id:      '',                               // JS定義から名前マッチで補完
    name:    row['名前'],
    race:    row['種族']  || '-',
    grade:   parseInt(row['グレード']) || 1,
    atk:     atkP.val,
    hp:      hpP.val,
    baseAtk: atkP.range,
    baseHp:  hpP.range,
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
  // 基本使用回数（固定値 or "3-5" 形式のレンジ）
  const usesStr = row['基本使用回数'] || '';
  if (usesStr) {
    const rng = usesStr.match(/^(\d+)-(\d+)$/);
    if (rng) obj.baseUsesRange = [parseInt(rng[1]), parseInt(rng[2])];
    else if (!usesStr.includes('-')) obj.baseUses = parseInt(usesStr) || undefined;
  }
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
    // 全シートを並列取得（effect_id は任意）
    const fetches = [
      fetch(_sheetUrl(_SHEET_GIDS['階層データ'])),
      fetch(_sheetUrl(_SHEET_GIDS['グレードアップ費用'])),
      fetch(_sheetUrl(_SHEET_GIDS['魔法プール'])),
      fetch(_sheetUrl(_SHEET_GIDS['指輪プール'])),
      fetch(_sheetUrl(_SHEET_GIDS['キャラクタープール'])),
    ];
    const responses = await Promise.all(fetches);
    for (const r of responses) {
      if (r && !r.ok) throw new Error('HTTP ' + r.status);
    }
    const [ft, gt, st, rt, ct] = await Promise.all(responses.map(r => r.text()));

    // 敵キーワード シート（任意）：失敗してもメイン読み込みには影響しない
    try {
      const kwRes = await fetch(_sheetUrl(_SHEET_GIDS['敵キーワード']));
      if (kwRes.ok) {
        const kwt = await kwRes.text();
        const kwRows = _parseCSV(kwt);
        kwRows.forEach(row => {
          const name = (row['名前'] || row['キーワード'] || row[Object.keys(row)[0]] || '').trim();
          const desc = (row['効果']||row['説明']||row['説明文']||'').trim();
          if (!name || !desc) return;
          KW_DESC_MAP[name] = desc;
          // 「侵食X」「成長X」など末尾Xを持つ名前は、数字サフィックス版（侵食1等）でも引けるよう登録
          if (/X$/.test(name)) KW_DESC_MAP[name.slice(0,-1)] = desc;
        });
      }
    } catch (_) { /* キーワード説明文なしで続行 */ }

    // ── 階層データ ──
    const floorRows = _parseCSV(ft);
    console.table(floorRows.slice(0, 5));
    // floors.js のフォールバック wands を事前に退避
    const _savedWands = FLOOR_DATA.map(fd => fd?.wands);
    // 旧アクション文字列 → 杖ID のマッピング
    const _actionToWandId = {'強化':'cw_buff','鼓舞':'cw_heal','召喚':'cw_summon','シールド':'cw_shield','標的':'cw_hate'};
    const _validWandIds = new Set(['cw_buff','cw_heal','cw_summon','cw_shield','cw_hate']);
    FLOOR_DATA.length = 0;
    FLOOR_DATA.push(null); // index 0 は null（1始まり）
    BOSS_FLOORS.length = 0;
    floorRows.forEach(row => {
      const fl = parseInt(row['階層']);
      if (!fl || isNaN(fl)) return;
      const isBoss = row['ボス'] === '✓' || row['ボスかどうか'] === '✓' || row['ボス'] === 'TRUE';
      // 「敵手札」列（旧「行動」列）：カンマ区切りの杖/アイテム名 → SPELL_POOLから検索
      const handStr = (row['敵手札'] || '').trim();
      const enemyHand = handStr && !handStr.startsWith('なし')
        ? handStr.split(/[,、，]+/).map(n=>n.trim()).filter(Boolean)
            .map(entry => {
              // 「名前（N）」形式でチャージ数を上書き
              const m = entry.match(/^(.+?)（(\d+)）$/);
              const name = m ? m[1].trim() : entry;
              const overrideUses = m ? parseInt(m[2]) : null;
              const def = typeof SPELL_POOL!=='undefined' ? SPELL_POOL.find(s=>s.name===name) : null;
              if(!def) return null;
              const c = Object.assign({}, def);
              const uses = overrideUses!=null ? overrideUses : (c.baseUses || c.baseUsesRange ? (c.baseUsesRange?Math.round((c.baseUsesRange[0]+c.baseUsesRange[1])/2):c.baseUses) : 4);
              c.usesLeft = uses; c._maxUses = uses;
              return c;
            })
            .filter(Boolean)
        : [];
      // 「敵指輪」列：カンマ区切りの指輪名 → RING_POOLから検索
      const ringStr = (row['敵指輪'] || '').trim();
      const enemyRings = ringStr && !ringStr.startsWith('なし')
        ? ringStr.split(/[,、，]+/).map(n=>n.trim()).filter(Boolean)
            .map(name => typeof RING_POOL!=='undefined' ? RING_POOL.find(r=>r.name===name) : null)
            .filter(Boolean)
        : [];
      // 旧「行動」列（後方互換：commanderWands用）
      const actStr = (row['行動'] || row['杖'] || row['司令官行動'] || '').trim();
      let wands;
      if (!actStr) {
        wands = _savedWands[fl] || [];
      } else if (actStr.startsWith('なし')) {
        wands = [];
      } else {
        wands = actStr.split(/[,、;；\s]+/)
          .map(s => _actionToWandId[s.trim()] || s.trim())
          .filter(s => _validWandIds.has(s));
      }
      const _mlVal = parseInt(row['魔術レベル'] || row['magicLevel']);
      const _personalityMap = {'攻撃':'aggressive','防衛':'defensive','策士':'tactical','道化':'chaotic'};
      const _persRaw = (row['パーソナリティ'] || row['personality'] || '').trim();
      const _acVal = parseInt(row['行動数'] || row['actionCount']);
      FLOOR_DATA[fl] = {
        grade: Math.max(1, parseInt(row['グレード'] || row['grade']) || 1),
        mult:  parseFloat(row['補正'] || row['mult']) || 1.0,
        wands: wands,
        enemyHand: enemyHand,
        enemyRings: enemyRings,
        magicLevel: isNaN(_mlVal) ? 0 : _mlVal,
        personality: _personalityMap[_persRaw] ?? 'chaotic',
        actionCount: isNaN(_acVal) ? 1 : Math.max(1, _acVal),
      };
      if (isBoss) {
        FLOOR_DATA[fl].boss = true;
        // BOSS_FLOORS はボス階の「1つ前」の階番号（移動先選択でボス専用表示に使う）
        BOSS_FLOORS.push(fl - 1);
      }
    });

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

    // ── 魔法プール（種別・グレード・使用回数・価格・初期装備・説明文）──
    const spellRows = _parseCSV(st);
    spellRows.forEach(row => {
      const name = row['名前'];
      if (!name) return;
      // 同名カードが複数ある場合（例：初期装備版と報酬プール版）は全件更新
      const spells = SPELL_POOL.filter(s => s.name === name);
      if (!spells.length) return;
      // 種別・グレード・使用回数・価格・レアリティ・初期装備・説明文を各フィールドに適用
      const _typeRaw = (row['種別'] || row['種別(wand/consumable)'] || '').trim();
      const _typeMap = {'杖':'wand','wand':'wand','消耗品':'consumable','アイテム':'consumable','consumable':'consumable'};
      const type = _typeMap[_typeRaw] || null;
      const grade = parseInt(row['グレード']);
      const usesStr = (row['基本使用回数'] || '').trim();
      const cost = parseInt(row['価格']);
      const rarStr = (row['レアリティ'] || '').trim();
      const rarVal = parseInt(rarStr);
      const sv = row['初期装備'];
      const desc = row['効果'] || row['説明文'];
      spells.forEach(spell => {
        if (type && spell.id !== 'w_fire') spell.type = type;
        if (!isNaN(grade) && grade >= 1) spell.grade = grade;
        if (usesStr) {
          const rng = usesStr.match(/^(\d+)-(\d+)$/);
          if (rng) { spell.baseUsesRange = [parseInt(rng[1]), parseInt(rng[2])]; delete spell.baseUses; }
          else if (!usesStr.includes('-')) { spell.baseUses = parseInt(usesStr) || undefined; delete spell.baseUsesRange; }
        }
        if (!isNaN(cost)) spell.cost = cost;
        if (rarStr === '-') spell.rarity = -1;
        else if (!isNaN(rarVal) && rarVal >= 1) spell.rarity = rarVal;
        if (sv === 'TRUE' || sv === '✓') spell.starterOnly = true;
        else if (sv === 'FALSE') delete spell.starterOnly;
        // 報酬中使用不可
        const nrv = row['報酬中使用不可'];
        if (nrv === 'TRUE' || nrv === '✓') spell.noRewardUse = true;
        else if (nrv === 'FALSE') delete spell.noRewardUse;
        spell.desc = desc || '';
      });
    });

    // ── 指輪プール（ユニーク・グレード・価格・初期装備・説明文）──
    const ringRows = _parseCSV(rt);
    ringRows.forEach(row => {
      const name = row['名前'];
      if (!name) return;
      const ring = RING_POOL.find(r => r.name === name);
      if (!ring) return;
      // ユニーク（legend）
      const uv = row['ユニーク'];
      if (uv === 'TRUE' || uv === '✓') ring.legend = true;
      else if (uv === 'FALSE') delete ring.legend;
      // グレード
      const grade = parseInt(row['グレード']);
      if (!isNaN(grade) && grade >= 1) ring.grade = grade;
      // 価格
      const cost = parseInt(row['価格']);
      if (!isNaN(cost)) ring.cost = cost;
      // レアリティ
      { const rarStr=(row['レアリティ']||'').trim();
        const rarVal=parseInt(rarStr);
        if(rarStr==='-') ring.rarity=-1;
        else if(!isNaN(rarVal)&&rarVal>=1) ring.rarity=rarVal; }
      // 初期装備
      const sv = row['初期装備'];
      if (sv === 'TRUE' || sv === '✓') ring.starterOnly = true;
      else if (sv === 'FALSE') delete ring.starterOnly;
      // 説明文
      const desc = row['効果'] || row['説明文'];
      ring.desc = desc || '';
    });

    // ── キャラクタープール（ネームド・グレード・パワー・ライフ・種族・価格・説明文 / 敵専用も含む）──
    const charRows = _parseCSV(ct);
    charRows.forEach(row => {
      const name = row['名前'];
      if (!name) return;
      const isEnemyOnly = row['敵専用'] === 'TRUE' || row['敵専用'] === '✓' || row['敵専用'] === '◯';
      if (isEnemyOnly) {
        // 敵専用：UNIT_POOL に同名エントリがあれば報酬プールから除外
        const upUnit = UNIT_POOL.find(u => u.name === name);
        if (upUnit) upUnit.rarity = -1;
        // ENEMY_POOL を更新（ATK/HPもシートから基礎レンジとして読み込み）
        const ep = ENEMY_POOL.find(e => e.name === name);
        if (!ep) return;
        const grade = parseInt(row['グレード']);
        if (!isNaN(grade) && grade >= 1) ep.grade = grade;
        if (row['アイコン']) ep.icon = row['アイコン'];
        if (row['種族']) ep.race = row['種族'];
        const atkP = _parseIntRange(row['パワー'] || row['ATK'], ep.atk || 1);
        const hpP  = _parseIntRange(row['ライフ'] || row['HP'],  ep.hp  || 2);
        ep.atk = atkP.val; ep.baseAtk = atkP.range;
        ep.hp  = hpP.val;  ep.baseHp  = hpP.range;
        // キーワード列（なければ効果列）をキーワード配列として解釈（スペース/読点区切り）
        const kwStr = (row['キーワード'] || row['効果'] || '').trim();
        if (kwStr) ep.keywords = kwStr.split(/[\s、,，]+/).filter(Boolean);
        return;
      }
      // 通常キャラクター：UNIT_POOL を更新
      const unit = UNIT_POOL.find(u => u.name === name);
      if (!unit) return;
      const nv = row['ネームド'] || row['ユニーク'];
      if (nv === 'TRUE' || nv === '✓') unit.unique = true;
      else if (nv === 'FALSE') unit.unique = false;
      const grade = parseInt(row['グレード']);
      if (!isNaN(grade) && grade >= 1) unit.grade = grade;
      { const rarStr=(row['レアリティ']||'').trim();
        const rarVal=parseInt(rarStr);
        if(rarStr==='-') unit.rarity=-1;
        else if(!isNaN(rarVal)&&rarVal>=1) unit.rarity=rarVal; }
      const atkP2 = _parseIntRange(row['パワー'] || row['ATK'], unit.atk || 0);
      const hpP2  = _parseIntRange(row['ライフ'] || row['HP'],  unit.hp  || 0);
      // atk/hp は味方スタッツとして更新のみ（baseAtk/baseHpは設定しない）
      // 敵として出現時の基礎レンジは enemy.js のグレード別デフォルトを使用
      if (atkP2.val > 0) unit.atk = atkP2.val;
      if (hpP2.val  > 0) unit.hp  = hpP2.val;
      if (row['種族']) unit.race = row['種族'];
      const cost = parseInt(row['価格']);
      if (!isNaN(cost)) unit.cost = cost;
      const desc = row['効果'];
      unit.desc = desc || '';
      if (row['重ね効果'] !== undefined && row['重ね効果'].trim()) unit.stackEffect = row['重ね効果'].trim();
      else delete unit.stackEffect;
      // キーワード列が存在する場合、unit.keywords を上書きし効果フラグも同期
      // row['キーワード'] が undefined = 列なし（JS定義をそのまま使用）
      if (row['キーワード'] !== undefined) {
        const kwStr = row['キーワード'].trim();
        unit.keywords = kwStr ? kwStr.split(/[\s、,，]+/).filter(Boolean) : [];
        // キーワードから効果フラグを自動同期（シートが信源）
        unit.counter = unit.keywords.includes('反撃');
        unit.shield  = unit.keywords.includes('シールド') ? (unit.shield || 1) : 0;
        if (unit.keywords.includes('標的')) { unit.hate = true; unit.hateTurns = 99; }
        else { unit.hate = false; unit.hateTurns = 0; }
      }
    });

    console.log(
      `[Vesselbound] データ読み込み完了 — 階層:${FLOOR_DATA.length - 1} グレードアップ費用:${GRADE_UP_COSTS.join(',')} キャラ上書き:${charRows.length}件 KW:${Object.keys(KW_DESC_MAP).length}件`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
