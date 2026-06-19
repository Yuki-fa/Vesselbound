// ═══════════════════════════════════════
// loader.js — Google Sheets データローダー
// 起動時に CSV を fetch し RING_POOL / SPELL_POOL / FLOOR_DATA /
// BOSS_FLOORS / ENCHANT_TYPES をインプレースで上書きする。
// fetch 失敗時は内蔵データ（他の data/*.js）をそのまま使用。
// ═══════════════════════════════════════

const _EXPORT_BASE =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vRgSPXHfTa42bU5EZN9lvtFUeeYAapxMGp2RqdE1QNl_5W2PTEtBGvFcdaZf4SGDg' +
  '/pub?output=csv';
function _sheetUrl(gid){ return _EXPORT_BASE + '&gid=' + gid + '&single=true&t=' + Date.now(); }
const _SHEET_GIDS = {
  'キャラクタープール': 848932419,
  '初期キャラクター': 266813898,
  '指輪プール':   1986592617,
  '魔法プール':  1367710240,
  '階層データ':   920830789,
  'エンチャント':  320923773,
  '敵キーワード':  769775182,
  'effect_id':    992952088,
  'グレードアップ費用': 1903359867,
  'リスNPC':     687265448,
};

const SHEET_RACE_BY_NAME = {};
const SPECIES_EQUIP_CONFIG = {};

function getSheetRaceByName(name) {
  return SHEET_RACE_BY_NAME[_normCardName(name)] || '';
}

// リスNPCメッセージ（シートから上書き）
// キー: 条件列の値、値: メッセージ文字列の配列
const SQUIRREL_MESSAGES = {
  '入店時': ['いらっしゃい！', 'ゆっくり選んでいって！', '今日は何を買う？'],
  '現在グレードのキャラを購入時': ['なかなかの眼力ね。', 'いい選択だわ！', 'そのキャラ、強いわよ。'],
  '現在グレード未満のキャラを購入時': ['なにか作戦がありそうね。', '訳アリ…？', 'うーん、その手があったか。'],
  'カードを重ねた時': ['どんどん強くなるわね！', 'パワーアップ完了！'],
  '提示カードのコントロールを得た時': ['うまくいったわね！', 'やるじゃない！'],
  '提示カードにダメージを与えた時': ['あらあら…', 'えっ、なにしてるの！'],
  '提示カードを死亡させた時': ['やりすぎよ！', 'ちょっと！？'],
  'グレードを上げた時': ['グレードアップ！さらに強くなるわよ！', 'いいね、どんどん行って！'],
  '退店時': ['またね！', 'がんばって！', 'いい戦いをしてね。'],
  'カードを売却した時': ['思い切ったわね。', 'ゴールドに変えたか。'],
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

const _XLSX_PATH = './Vesselbound_data.xlsx';
const _XLSX_SHEETS = {
  floor: '階層データ',
  grade: 'グレードアップ',
  spell: '杖、アイテム',
  ring: '指輪',
  char: 'キャラクター',
  enemy: '敵',
  starter: '職種',
  species: '種族',
  keyword: 'キーワード',
  squirrel: '商談メッセージ',
};

function _xlsxSheetToCSV(workbook, sheetName, required) {
  const sheet = workbook && workbook.Sheets && workbook.Sheets[sheetName];
  if (!sheet) {
    if (required) throw new Error('xlsx sheet missing: ' + sheetName);
    return '名前\n';
  }
  return XLSX.utils.sheet_to_csv(sheet);
}

async function _loadGameDataFromXlsx() {
  if (typeof XLSX === 'undefined') throw new Error('SheetJS XLSX is not loaded');
  const res = await fetch(_XLSX_PATH);
  if (!res.ok) throw new Error('xlsx HTTP ' + res.status);
  const buf = await res.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  return {
    source: 'xlsx',
    ft: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.floor, true),
    gt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.grade, true),
    st: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.spell, true),
    rt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.ring, true),
    ct: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.char, true),
    et: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.enemy, false),
    starterText: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.starter, true),
    speciesText: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.species, false),
    kwt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.keyword, false),
    sqt: _xlsxSheetToCSV(workbook, _XLSX_SHEETS.squirrel, false),
  };
}

async function _loadGameDataFromGoogleCsv() {
  const fetches = [
    fetch(_sheetUrl(_SHEET_GIDS['階層データ'])),
    fetch(_sheetUrl(_SHEET_GIDS['グレードアップ費用'])),
    fetch(_sheetUrl(_SHEET_GIDS['魔法プール'])),
    fetch(_sheetUrl(_SHEET_GIDS['指輪プール'])),
    fetch(_sheetUrl(_SHEET_GIDS['キャラクタープール'])),
    fetch(_sheetUrl(_SHEET_GIDS['初期キャラクター'])),
  ];
  const responses = await Promise.all(fetches);
  for (const r of responses) {
    if (r && !r.ok) throw new Error('HTTP ' + r.status);
  }
  const [ft, gt, st, rt, ct, starterText] = await Promise.all(responses.map(r => r.text()));
  let kwt = '名前\n';
  let sqt = '名前\n';
  try {
    const kwRes = await fetch(_sheetUrl(_SHEET_GIDS['敵キーワード']));
    if (kwRes.ok) kwt = await kwRes.text();
  } catch (_) { /* 任意シート */ }
  try {
    const sqRes = await fetch(_sheetUrl(_SHEET_GIDS['リスNPC']));
    if (sqRes.ok) sqt = await sqRes.text();
  } catch (_) { /* 任意シート */ }
  return { source: 'csv', ft, gt, st, rt, ct, et: 'カード名\n', starterText, speciesText: '種族\n', kwt, sqt };
}

// ── "1-3" または "3" 形式の文字列を {val, range:[min,max]} にパース ──
function _parseIntRange(s, fallback) {
  if (!s || !String(s).trim()) return { val: fallback, range: [fallback, fallback] };
  const slash = String(s).match(/(\d+)\s*\/\s*(\d+)/);
  if (slash) {
    const v = parseInt(slash[2]);
    return { val: v, range: [v, v] };
  }
  const m = String(s).match(/^(\d+)\s*[-~〜]\s*(\d+)$/);
  if (m) {
    const lo = parseInt(m[1]), hi = parseInt(m[2]);
    return { val: hi, range: [lo, hi] };
  }
  const v = parseInt(s);
  return isNaN(v) ? { val: fallback, range: [fallback, fallback] } : { val: v, range: [v, v] };
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
    'し術師':'屍術師',
    '蛮族':'蛮族',
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

function _cardNameExists(name) {
  return !!(_findBySheetName(typeof SPELL_POOL !== 'undefined' ? SPELL_POOL : [], name)
    || _findBySheetName(typeof RING_POOL !== 'undefined' ? RING_POOL : [], name));
}

function _sheetAbilityText(s) {
  return String(s || '').trim().replace(/^<([^>]+)>/, '$1：');
}

function _sheetNumber(v, fallback) {
  const n = parseInt(String(v || '').trim(), 10);
  return isNaN(n) ? fallback : n;
}

function _makeFixedEquipCard(name, desc) {
  const nm = String(name || '固定装備').replace(/[（）]/g, '').trim() || '固定装備';
  return {
    id: 'fixed_' + _normCardName(nm),
    name: nm,
    type: 'consumable',
    kind: 'equipment',
    equip: true,
    fixedEquip: true,
    fixedAttack: true,
    actionCost: 1,
    needsEnemy: true,
    grade: 1,
    rarity: -1,
    cost: 0,
    desc: '固定装備。対象にこのキャラクターの攻撃力分のダメージを与える。',
  };
}

function _syncSpeciesEquipConfig(text) {
  Object.keys(SPECIES_EQUIP_CONFIG).forEach(k => delete SPECIES_EQUIP_CONFIG[k]);
  const rows = _parseCSVWithHeader(text || '種族\n', ['種族', '固定装備']);
  rows.forEach(row => {
    const race = (row['種族'] || row['名前'] || row['__col0'] || '').trim();
    if (!race || race === '種族' || race.includes('※')) return;
    const itemSlots = _sheetNumber(row['アイテムスロット'] || row['__col5'], 3);
    const ringSlots = _sheetNumber(row['リングスロット'] || row['指輪スロット'] || row['__col6'], 1);
    const fixedName = (row['固定装備'] || row['__col7'] || '').trim();
    const fixedDesc = (row['固定装備 性能'] || row['固定装備性能'] || row['__col8'] || '').trim();
    SPECIES_EQUIP_CONFIG[_normCardName(race)] = {
      race,
      itemSlots: Math.max(0, itemSlots),
      ringSlots: Math.max(0, ringSlots),
      fixedEquip: fixedName ? _makeFixedEquipCard(fixedName, fixedDesc) : null,
    };
  });
}

function _syncUnitEffectKeysFromSheet(unit) {
  if (!unit) return;
  const patches = {
    'ゾンビ': { effect: 'zombie_end', injury: null, desc:'終戦：ライフが10になる。' },
    'グリマルキン': { effect: 'grimalkin_summon', injury: null, desc:'使役：以後、カードの効果で召喚される仲間のライフが+1される。' },
    'ドワーフ': { effect: 'dwarf_summon', injury: null, desc:'使役：左端の杖に+2チャージする。' },
    'マミー': { effect: 'mummy_death', injury: null, desc:'死亡：3ゴールドを得る。' },
    'バンシー': { effect: 'banshee_death', injury: null, desc:'死亡：以後、商談フェイズに現れるキャラクターのパワーが+2される。' },
    'ブラウニー': { effect: 'brownie_attack', injury: null, desc:'攻撃：全ての仲間のライフが+1される。' },
    'ジャック・オ・ランタン': { effect: 'jack_attack', injury: null, desc:'攻撃：以後、商談フェイズに現れるキャラクターのライフが+1される。' },
    'シルフ': { effect: 'sylph_summon', injury: null, desc:'使役：隣接する仲間が+1/+2を得る。' },
    'インプ': { effect: 'imp_summon', injury: null, desc:'使役：ランダムなG1のアイテムを1枚得る。' },
    'グレムリン': { effect: 'gremlin_free_item', injury: null, desc:'常時：各フェイズで、最初に使用したアイテムは1回だけ行動力を使用しない。' },
    'アラッサス': { effect: null, injury: 'arachas', desc:'負傷：「アラッサス」以外の全てのキャラクターに1ダメージを与える。' },
    'スリン': { effect: null, injury: 'slin', desc:'負傷：ライフが+2される。' },
    'リザードマン': { effect: 'lizardman_attack', injury: null, desc:'攻撃：パワーが+1される。' },
    'ドレイク': { effect: 'drake_mitigate', injury: null },
    'ドラウグ': { effect: 'draug_summon', injury: null },
    'ペガサス': { effect: 'pegasus_start', injury: null, desc:'開戦：全ての前衛の味方のライフが+4される。' },
    'コボルド': { effect: 'kobold_wand', injury: null, desc:'誘発：杖の効果が発動するたび、全ての仲間のライフが+2される。' },
    'ケンタウロス': { effect: 'centaur_attack', injury: null, desc:'攻撃：オーナーの魔術レベルが+1される。', keywords:['二段攻撃'] },
    'シャドウ': { effect: null, injury: 'shadow', desc:'負傷：正面にキャラクターがいる場合、そのキャラクターに変身する。（スタッツも含めて）' },
    'スペクター': { effect: 'specter_start', injury: null, desc:'開戦：ランダムな相手キャラクターに「死亡：全ての味方キャラクターに4ダメージを与える。」を与える。' },
    'ゴースト': { effect: 'ghost_death_effect', injury: null, desc:'誘発：死亡効果が発動するたび、以後、商談フェイズに現れる「不死」のキャラクターが+1/+1を得る。' },
    'ドリアード': { effect: 'dryad_attack', injury: null, desc:'攻撃：全ての仲間の精霊が+1/+1を得る。' },
    'フロスト・スプライト': { effect: 'frost_start', injury: null, desc:'開戦：隣接するキャラクターに「シールド」を与える。' },
    'ガーゴイル': { effect: 'gargoyle_bonus', injury: null, desc:'常時：全ての悪魔へのバフは+1される。' },
    'ハイドラ': { effect: null, injury: 'hydra', desc:'負傷：ランダムな相手キャラクターを1ターン行動不能にする。' },
    'シーサーペント': { effect: null, injury: 'sea_serpent', desc:'負傷：全ての相手キャラクターに2ダメージを与える。' },
    '虚飾の歌姫"リリス・ヴェノム"': { effect: null, injury: null, desc:'全体攻撃　毒牙', keywords:['全体攻撃','毒牙'] },
    '虚飾の歌姫“リリス・ヴェノム”': { effect: null, injury: null, desc:'全体攻撃　毒牙', keywords:['全体攻撃','毒牙'] },
    'クロコッタ': { effect: 'crocutta_start', injury: null, desc:'開戦：ランダムな相手キャラクターに攻撃する。' },
    'ルフ': { effect: 'rukh_summon', injury: null, desc:'使役：隣接する獣のグレードが1上がる。' },
    'バンダースナッチ': { effect: 'bandersnatch_ally_death', injury: null, desc:'誘発：仲間が死ぬたび、全ての相手キャラクターに4ダメージを与える。' },
    'ナックラヴィー': { effect: 'nuckelavee_turn', injury: null, desc:'常時：ターン開始時、3/2、獣の「ホワイトハンド」を召喚する。' },
    'シービショップ': { effect: 'sea_bishop_start', injury: null, desc:'開戦：他の全てのキャラクターからライフを2奪う。' },
    'チェシャー': { effect: 'cheshire_summon', injury: null, desc:'誘発：仲間が召喚されるたび、全ての仲間の獣が+1/+1を得る。' },
    'スキュラ': { effect: 'scylla_attack', injury: null, desc:'攻撃：最もパワーが低い味方のパワーを、このキャラクターのパワーと同じにする。' },
    'メデューサ': { effect: 'medusa_summon', injury: null, desc:'使役：対象のキャラクターに「二段攻撃」を与える。' },
    'オーガ': { effect: 'ogre_summon', injury: null, desc:'使役：魔術レベルが10以上なら三方向攻撃を得る。' },
    'フォーン': { effect: 'faun_wand', injury: null, desc:'誘発：杖を7回使用するたび、オーナーの行動回数が+1される。' },
    'サイレン': { effect: 'siren_start', injury: null, desc:'開戦：オーナーの魔術レベルが+1される。' },
    'セルキー': { effect: 'selkie_start', injury: null, desc:'開戦：チャージ1のランダムな杖を得る。' },
    'ワーウルフ': { effect: 'werewolf_attack', injury: null, desc:'攻撃：このキャラクターと、以後、商談フェイズに現れる「亜人」のキャラクターのライフが+2される。' },
    'アルラウネ': { effect: 'alraune_attack', injury: null, desc:'攻撃：最も攻撃力が低い味方に「強化の杖」を使用する。' },
    'ファントム': { effect: 'phantom_attack', injury: null, desc:'攻撃：ランダムな味方に不死の種族を追加する。' },
    'フェクスト': { effect: 'fecht_death', injury: null, desc:'死亡：戦闘終了時に復活する。' },
    'エイドロン': { effect: 'eidolon_death', injury: null, desc:'死亡：全ての仲間の不死が+2/+1とシールドを得る。' },
    'エルヴンメイジ': { effect: 'elvenmage_wand_double', injury: null, desc:'誘発：オーナーが使用した杖の効果は1回追加で発動する。' },
    'ニンフ': { effect: 'nymph_attack', injury: null, desc:'攻撃：隣接するキャラクターのライフが+6される。' },
    'シャナ': { effect: 'shana_shield_lost', injury: null, desc:'誘発：シールドを失うと後衛に下がる。' },
    'サキュバス': { effect: 'succubus_sell', injury: null },
    'メデューサ': { effect: 'medusa_summon', injury: null, desc:'使役：対象のキャラクターに「二段攻撃」を与える。' },
    'スキュラ': { effect: 'scylla_attack', injury: null, desc:'攻撃：最もパワーが低い味方のパワーを、このキャラクターのパワーと同じにする。' },
    'マナガルム': { effect: 'managarm_sell', injury: null },
    '波の娘"ラン・ドーター"': { effect: null, injury: 'ran' },
  };
  const patch = patches[_normCardName(unit.name)];
  if (!patch) return;
  if ('effect' in patch) {
    if (patch.effect) unit.effect = patch.effect;
    else delete unit.effect;
  }
  if ('injury' in patch) {
    if (patch.injury) unit.injury = patch.injury;
    else delete unit.injury;
  }
  // 説明文はシートの「効果」列を正とする。patch.desc はシート未取得/空欄時の保険だけに使う。
  if (patch.desc && !unit.desc) unit.desc = patch.desc;
  if (patch.keywords) unit.keywords = [...patch.keywords];
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
  if (_truthySheet(row['ユニーク'])) obj.legend = true;
  // 価格
  const cost = parseInt(row['価格']);
  if (!isNaN(cost)) obj.cost = cost;
  // 初期装備分類
  if (_truthySheet(row['初期装備'])) obj.starterOnly = true;
  obj.desc = row['効果'] || row['説明文'] || '';
  return obj;
}

// ── 行 → 魔法オブジェクト ──────────────────────────
function _rowToSpell(row) {
  const obj = {
    id:    '',    // JS定義から補完
    name:  row['名前'],
    type:  row['種別1'] || row['種別'] || row['種別(wand/consumable)'],
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
  if (_truthySheet(row['初期装備'])) obj.starterOnly = true;
  obj.desc = row['効果'] || row['説明文'] || '';
  return obj;
}

// ── メイン読み込み ──────────────────────────────────
async function loadGameData() {
  try {
    let loaded;
    try {
      loaded = await _loadGameDataFromXlsx();
      console.log('[Vesselbound] XLSX loaded');
    } catch (xlsxErr) {
      console.warn('[Vesselbound] XLSX 読み込み失敗。Google Sheets CSVへフォールバック:', xlsxErr);
      loaded = await _loadGameDataFromGoogleCsv();
      console.log('[Vesselbound] CSV loaded');
    }
    const { source, ft, gt, st, rt, ct, et, starterText, speciesText, kwt, sqt } = loaded;

    _syncSpeciesEquipConfig(speciesText);

    // 敵キーワード シート（任意）：失敗してもメイン読み込みには影響しない
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

    // リスNPCメッセージ シート（任意）
    try {
      const sqRows = _parseCSV(sqt || '名前\n');
      // シートのデータでハードコード済みデフォルトを上書きする
      const _sqFromSheet = {};
      sqRows.forEach(row => {
        const trigger = (row['条件'] || row['トリガー'] || row[Object.keys(row)[0]] || '').trim();
        const msg = (row['セリフ'] || row['メッセージ'] || row['テキスト'] || row[Object.keys(row)[1]] || '').trim();
        if (!trigger || !msg) return;
        if (!_sqFromSheet[trigger]) _sqFromSheet[trigger] = [];
        _sqFromSheet[trigger].push(msg);
      });
      // シートに存在するトリガーのみ上書き（シート読み込み失敗時はデフォルトを維持）
      Object.assign(SQUIRREL_MESSAGES, _sqFromSheet);
    } catch (_) { /* リスNPCデータなしで続行 */ }

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
      const fl = parseInt(row['階層'] || row['戦闘回数'] || row['floor']);
      if (!fl || isNaN(fl)) return;
      const isBoss = row['ボス'] === '✓' || row['ボスかどうか'] === '✓' || row['ボス'] === 'TRUE';
      // 「敵手札」列（旧「行動」列）：カンマ区切りの杖/アイテム名 → SPELL_POOLから検索
      const handStr = (row['敵手札'] || row['相手キャラクター手札'] || '').trim();
      const enemyHand = handStr && !handStr.startsWith('なし')
        ? handStr.split(/[,、，]+/).map(n=>n.trim()).filter(Boolean)
            .map(entry => {
              // 「名前（N）」形式でチャージ数を上書き
              const m = entry.match(/^(.+?)（(\d+)）$/);
              const name = m ? m[1].trim() : entry;
              const overrideUses = m ? parseInt(m[2]) : null;
              const def = typeof SPELL_POOL!=='undefined' ? _findBySheetName(SPELL_POOL, name) : null;
              if(!def) return null;
              const c = Object.assign({}, def);
              const uses = overrideUses!=null ? overrideUses : (c.baseUses || c.baseUsesRange ? (c.baseUsesRange?Math.round((c.baseUsesRange[0]+c.baseUsesRange[1])/2):c.baseUses) : 4);
              c.usesLeft = uses; c._maxUses = uses;
              return c;
            })
            .filter(Boolean)
        : [];
      // 「敵指輪」列：カンマ区切りの指輪名 → RING_POOLから検索
      const ringStr = (row['敵指輪'] || row['相手キャラクター指輪'] || '').trim();
      const enemyRings = ringStr && !ringStr.startsWith('なし')
        ? ringStr.split(/[,、，]+/).map(n=>n.trim()).filter(Boolean)
            .map(name => typeof RING_POOL!=='undefined' ? _findBySheetName(RING_POOL, name) : null)
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
      const name = row['名前'] || row['カード名'];
      if (!name) return;
      // 同名カードが複数ある場合（例：初期装備版と報酬プール版）は全件更新
      const spells = _filterBySheetName(SPELL_POOL, name);
      if (!spells.length) return;
      // 種別・グレード・使用回数・価格・レアリティ・初期装備・説明文を各フィールドに適用
      const _typeRaw = (row['種別1'] || row['種別'] || row['種別(wand/consumable)'] || '').trim();
      const _typeMap = {'杖':'wand','短杖':'wand','wand':'wand','消耗品':'consumable','アイテム':'consumable','consumable':'consumable'};
      const type = _typeMap[_typeRaw] || null;
      const grade = parseInt(row['グレード'] || row['レベル']);
      const usesStr = (row['基本使用回数'] || '').trim();
      const cost = parseInt(row['価格']);
      const actionCost = parseInt(row['行動力'] || row['消費行動力']);
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
        if (!isNaN(actionCost)) spell.actionCost = Math.max(0, actionCost);
        if (rarStr === '-') spell.rarity = -1;
        else if (!isNaN(rarVal) && rarVal >= 1) spell.rarity = rarVal;
        if (_truthySheet(sv)) spell.starterOnly = true;
        else if (_falseySheet(sv)) delete spell.starterOnly;
        // 報酬中使用不可
        const nrv = row['報酬中使用不可'];
        if (_truthySheet(nrv)) spell.noRewardUse = true;
        else if (_falseySheet(nrv)) delete spell.noRewardUse;
        // 種別2：短杖フラグ
        const _subtype2 = (row['種別2'] || '').trim();
        if (_subtype2 === '短杖') spell.subtype = 'wand';
        else delete spell.subtype;
        spell.desc = desc || '';
      });
    });

    // ── 指輪プール（ユニーク・グレード・価格・初期装備・説明文）──
    const ringRows = _parseCSV(rt);
    const ringNameSeen = {};
    ringRows.forEach(row => {
      const name = row['名前'];
      if (!name) return;
      const rings = _filterBySheetName(RING_POOL, name);
      if (!rings.length) return;
      const key = _normCardName(name);
      const seen = ringNameSeen[key] || 0;
      ringNameSeen[key] = seen + 1;
      const ring = rings[Math.min(seen, rings.length - 1)];
      if (!ring) return;
      // ユニーク（legend）
      const uv = row['ユニーク'];
      if (_truthySheet(uv)) ring.legend = true;
      else if (_falseySheet(uv)) delete ring.legend;
      // グレード
      const grade = parseInt(row['グレード'] || row['レベル']);
      if (!isNaN(grade) && grade >= 1) ring.grade = grade;
      // 価格
      const cost = parseInt(row['価格']);
      if (!isNaN(cost)) ring.cost = cost;
      const slot = parseInt(row['スロット']);
      if (!isNaN(slot)) ring.slot = slot;
      // レアリティ
      { const rarStr=(row['レアリティ']||'').trim();
        const rarVal=parseInt(rarStr);
        if(rarStr==='-') ring.rarity=-1;
        else if(!isNaN(rarVal)&&rarVal>=1) ring.rarity=rarVal; }
      // 初期装備
      const sv = row['初期装備'];
      if (_truthySheet(sv)) ring.starterOnly = true;
      else if (_falseySheet(sv)) delete ring.starterOnly;
      // 説明文
      const desc = row['効果'] || row['説明文'];
      ring.desc = desc || '';
    });

    // ── キャラクタープール（ネームド・グレード・パワー・ライフ・種族・価格・説明文 / 敵専用も含む）──
    const charRows = _parseCSVWithHeader(ct, ['カード名', '名前']);
    const enemyRows = _parseCSVWithHeader(et || 'カード名\n', ['カード名', 'ターン']);
    const _sheetEnemyNames = new Set(); // シートに「敵専用」の通常敵として登録されている敵名
    const _sheetUnitNames = new Set();  // シートに存在する通常/ネームドキャラクター名
    const _syncUnitFromRow = (unit, row) => {
      unit._sheetSeen = true;
      const nv = row['ネームド'] || row['ユニーク'];
      if (_truthySheet(nv)) unit.unique = true;
      else if (_falseySheet(nv)) unit.unique = false;
      const grade = parseInt(row['グレード'] || row['レベル']);
      if (!isNaN(grade) && grade >= 1) unit.grade = grade;
      { const rarStr=(row['レアリティ']||'').trim();
        const rarVal=parseInt(rarStr);
        if(rarStr==='-') unit.rarity=-1;
        else if(!unit.sheetOnly&&!isNaN(rarVal)&&rarVal>=1) unit.rarity=rarVal; }
      const atkP2 = _parseIntRange(row['パワー'] || row['攻撃力'] || row['ATK'], unit.atk || 0);
      const hpP2  = _parseIntRange(row['ライフ'] || row['HP'],  unit.hp  || 0);
      if (atkP2.val > 0) unit.atk = atkP2.val;
      if (hpP2.val  > 0) unit.hp  = hpP2.val;
      if (row['種族']) unit.race = row['種族'];
      const cost = parseInt(row['価格']);
      if (!isNaN(cost)) unit.cost = cost;
      const desc = row['効果'];
      unit.desc = desc || '';
      if (row['1進化'] !== undefined && row['1進化'].trim()) unit.stack1Desc = row['1進化'].trim();
      else delete unit.stack1Desc;
      if (row['2進化'] !== undefined && row['2進化'].trim()) unit.stack2Desc = row['2進化'].trim();
      else delete unit.stack2Desc;
      if (row['強化'] !== undefined && row['強化'].trim()) unit.stackEnhDesc = row['強化'].trim();
      else delete unit.stackEnhDesc;
      if (row['重ね効果'] !== undefined && row['重ね効果'].trim()) unit.stackEffect = row['重ね効果'].trim();
      else delete unit.stackEffect;
      const equipTypeStr = row['装備可能武器'] || row['装備可能'] || row['武器'] || '';
      const equipTypes = _splitSheetList(equipTypeStr);
      if (equipTypes.length) unit.equipTypes = equipTypes;
      const effectText = row['効果'] || '';
      const inEffectEq = [...String(effectText).matchAll(/初期装備[：:]\s*「([^」]+)」/g)].map(m => m[1]).join('、');
      const initialEqStr = row['初期装備'] || row['装備'] || inEffectEq || '';
      const initialEquipment = _splitSheetList(initialEqStr).filter(_cardNameExists);
      if (initialEquipment.length) unit.initialEquipment = initialEquipment;
      else if (initialEqStr) unit.initialEquipment = [];
      if (row['キーワード'] !== undefined) {
        const kwStr = row['キーワード'].trim();
        unit.keywords = kwStr ? kwStr.split(/[\s、,，]+/).filter(Boolean) : [];
        unit.counter = unit.keywords.includes('反撃');
        unit.shield  = unit.keywords.includes('シールド') ? (unit.shield || 1) : 0;
        if (unit.keywords.includes('標的')) { unit.hate = true; unit.hateTurns = 99; }
        else { unit.hate = false; unit.hateTurns = 0; }
      }
      _syncUnitEffectKeysFromSheet(unit);
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
          icon: '❓',
          initialEquipment: [],
        };
        UNIT_POOL.push(unit);
      }
      if (!unit) return;
      const atkP2 = _parseIntRange(row['初期ATK'] || row['パワー'] || row['ATK'], unit.atk || 0);
      const hpP2  = _parseIntRange(row['初期HP']  || row['ライフ'] || row['HP'],  unit.hp  || 0);
      if (atkP2.val > 0) unit.atk = atkP2.val;
      if (hpP2.val  > 0) unit.hp  = hpP2.val;
      unit.baseAtk = atkP2.range;
      unit.baseHp = hpP2.range;
      if (row['種族']) unit.race = row['種族'];
      unit.grade = 1;
      unit.cost = 0;
      unit.unique = false;
      unit.starterOnly = true;
      unit.enemyOnly = false;
      unit.rarity = -1;
      unit.desc = _sheetAbilityText(row['固有能力1']) || row['効果'] || unit.desc || '';
      if (row['固有能力2']) unit.stack1Desc = _sheetAbilityText(row['固有能力2']);
      if (row['固有能力3']) unit.stack2Desc = _sheetAbilityText(row['固有能力3']);
      const equipTypeStr = row['装備可能武器'] || row['装備可能'] || row['武器'] || '';
      const equipTypes = _splitSheetList(equipTypeStr);
      if (equipTypes.length) unit.equipTypes = equipTypes;
      const initialEqStr = [row['初期装備1'], row['初期装備2'], row['初期装備'], row['装備']]
        .filter(v => v && String(v).trim() && String(v).trim() !== '-')
        .join('、');
      const initialEquipment = _splitSheetList(initialEqStr).filter(_cardNameExists);
      if (initialEquipment.length) unit.initialEquipment = initialEquipment;
      else unit.initialEquipment = [];
      unit._sheetSeen = true;
    };
    charRows.forEach(row => {
      const name = row['名前'] || row['カード名'];
      if (!name) return;
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
            icon: row['アイコン'] || '❓',
            keywords: [],
            race: row['種族'] || '-',
          };
          ENEMY_POOL.push(ep);
        }
        _sheetEnemyNames.add(name); // シートに存在する敵として記録
        const grade = parseInt(row['グレード']);
        if (!isNaN(grade) && grade >= 1) ep.grade = grade;
        if (row['アイコン']) ep.icon = row['アイコン'];
        if (row['種族']) ep.race = row['種族'];
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
        const name = row['カード名'] || row['名前'];
        if (!name) return;
        const atkP = _parseIntRange(row['攻撃力'] || row['パワー'] || row['ATK'], 1);
        const hpP = _parseIntRange(row['ライフ'] || row['HP'], 2);
        const level = _parseIntRange(row['レベル'] || row['グレード'], 1).val;
        const turnRaw = String(row['ターン'] || '1').trim();
        const turn = turnRaw === '-' ? 999 : (parseInt(turnRaw) || 1);
        const kws = (row['キーワード'] || '').split(/[\s、,，]+/).filter(Boolean);
        const enemy = {
          name,
          grade: Math.max(1, Math.round(level || 1)),
          icon: row['アイコン'] || '❓',
          race: row['種族'] || '-',
          atk: atkP.val,
          hp: hpP.val,
          baseAtk: atkP.range,
          baseHp: hpP.range,
          keywords: kws,
          desc: row['備考'] || '',
          equipmentText: row['装備'] || '',
          spawnTurn: turn,
          _sheetEnemy: true,
        };
        ENEMY_POOL.push(enemy);
        _sheetEnemyNames.add(name);
      });
    }

    const starterRows = _parseCSV(starterText);
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

    // シートに「敵専用」行が存在する場合、ENEMY_POOL をシート登録済みの敵のみに限定する
    // （シートにない敵定義が events.js から漏れ出すのを防ぐ）
    if (_sheetEnemyNames.size > 0) {
      for (let _ei = ENEMY_POOL.length - 1; _ei >= 0; _ei--) {
        if (![..._sheetEnemyNames].some(n => _normCardName(n) === _normCardName(ENEMY_POOL[_ei].name))) ENEMY_POOL.splice(_ei, 1);
      }
    }

    console.log(
      `[Vesselbound] データ読み込み完了 — 階層:${FLOOR_DATA.length - 1} グレードアップ費用:${GRADE_UP_COSTS.join(',')} キャラ上書き:${charRows.length}件 KW:${Object.keys(KW_DESC_MAP).length}件 敵:${ENEMY_POOL.length}件`
    );
    return true;

  } catch (e) {
    console.warn('[Vesselbound] Google Sheets 読み込み失敗。内蔵データを使用:', e);
    return false;
  }
}
