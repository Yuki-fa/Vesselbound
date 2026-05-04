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
  'リスNPC':     687265448,
};

const SHEET_RACE_BY_NAME = {};

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
  'カードを売却した時': ['思い切ったわね。', 'ソウルに変えたか。'],
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

function _syncUnitEffectKeysFromSheet(unit) {
  if (!unit) return;
  const patches = {
    'ゾンビ': { effect: 'zombie_end', injury: null, desc:'終戦：ライフが10になる。' },
    'グリマルキン': { effect: 'grimalkin_summon', injury: null, desc:'使役：以後、カードの効果で召喚される仲間のライフが+1される。' },
    'ドワーフ': { effect: 'dwarf_summon', injury: null, desc:'使役：左端の杖に+3チャージする。' },
    'マミー': { effect: 'mummy_death', injury: null, desc:'死亡：3ソウルを得る。' },
    'バンシー': { effect: 'banshee_death', injury: null, desc:'死亡：以後、商談フェイズに現れるキャラクターのパワーが+2される。' },
    'ブラウニー': { effect: 'brownie_attack', injury: null, desc:'攻撃：全ての仲間のライフが+2される。' },
    'ジャック・オ・ランタン': { effect: 'jack_attack', injury: null, desc:'攻撃：以後、商談フェイズに現れるキャラクターのライフが+1される。' },
    'シルフ': { effect: 'sylph_summon', injury: null, desc:'使役：隣接するキャラクターの種族が+1/+1を得る。' },
    'インプ': { effect: 'imp_summon', injury: null, desc:'開戦：ランダムなG1のアイテムを1枚得る。' },
    'グレムリン': { effect: 'gremlin_free_item', injury: null, desc:'常時：各フェイズで、最初に使用したアイテムは1回だけ行動力を使用しない。' },
    'アラッサス': { effect: null, injury: 'arachas', desc:'負傷：「アラッサス」以外の全てのキャラクターに1ダメージを与える。' },
    'スリン': { effect: 'slin_injury_aura', injury: null, desc:'常在：負傷効果が発動すると「竜」のライフが+1される。' },
    'リザードマン': { effect: 'lizardman_attack', injury: 'lizardman', desc:'反撃　負傷：「竜」のパワーが+1される。' },
    'ドレイク': { effect: 'drake_mitigate', injury: null },
    'ドラウグ': { effect: 'draug_summon', injury: null },
    'ペガサス': { effect: 'pegasus_start', injury: null, desc:'開戦：全ての前衛の味方のライフが+4される。' },
    'ケンタウロス': { effect: 'centaur_start', injury: null, desc:'開戦：魔術レベルが+1される。' },
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
    'サイレン': { effect: 'siren_attack', injury: null, desc:'攻撃：オーナーの魔術レベルが+1される。' },
    'セルキー': { effect: 'selkie_start', injury: null, desc:'開戦：チャージ1のランダムな杖を得る。' },
    'ワーウルフ': { effect: 'werewolf_attack', injury: null, desc:'攻撃：このキャラクターと、以後、商談フェイズに現れる「亜人」のキャラクターのライフが+2される。' },
    'アルラウネ': { effect: 'alraune_attack', injury: null, desc:'攻撃：最も攻撃力が低い味方に「強化の杖」を使用する。' },
    'ファントム': { effect: 'phantom_attack', injury: null, desc:'攻撃：ランダムな味方に不死の種族を追加する。' },
    'フェクスト': { effect: 'fecht_death', injury: null, desc:'死亡：戦闘終了時に復活する。' },
    'エイドロン': { effect: 'eidolon_death', injury: null, desc:'死亡：全ての仲間の不死が+2/+1とシールドを得る。' },
    'エルヴンメイジ': { effect: 'elvenmage_wand_double', injury: null, desc:'誘発：オーナーが使用した杖の効果は2回発動する。' },
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
          // 「毒牙X」「成長X」など末尾Xを持つ名前は、数字サフィックス版（毒牙1等）でも引けるよう登録
          if (/X$/.test(name)) KW_DESC_MAP[name.slice(0,-1)] = desc;
        });
      }
    } catch (_) { /* キーワード説明文なしで続行 */ }

    // リスNPCメッセージ シート（任意）
    try {
      const sqRes = await fetch(_sheetUrl(_SHEET_GIDS['リスNPC']));
      if (sqRes.ok) {
        const sqt = await sqRes.text();
        const sqRows = _parseCSV(sqt);
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
      }
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
      const ringStr = (row['敵指輪'] || '').trim();
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
      const name = row['名前'];
      if (!name) return;
      // 同名カードが複数ある場合（例：初期装備版と報酬プール版）は全件更新
      const spells = _filterBySheetName(SPELL_POOL, name);
      if (!spells.length) return;
      // 種別・グレード・使用回数・価格・レアリティ・初期装備・説明文を各フィールドに適用
      const _typeRaw = (row['種別1'] || row['種別'] || row['種別(wand/consumable)'] || '').trim();
      const _typeMap = {'杖':'wand','短杖':'wand','wand':'wand','消耗品':'consumable','アイテム':'consumable','consumable':'consumable'};
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
    ringRows.forEach(row => {
      const name = row['名前'];
      if (!name) return;
      const ring = _findBySheetName(RING_POOL, name);
      if (!ring) return;
      // ユニーク（legend）
      const uv = row['ユニーク'];
      if (_truthySheet(uv)) ring.legend = true;
      else if (_falseySheet(uv)) delete ring.legend;
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
      if (_truthySheet(sv)) ring.starterOnly = true;
      else if (_falseySheet(sv)) delete ring.starterOnly;
      // 説明文
      const desc = row['効果'] || row['説明文'];
      ring.desc = desc || '';
    });

    // ── キャラクタープール（ネームド・グレード・パワー・ライフ・種族・価格・説明文 / 敵専用も含む）──
    const charRows = _parseCSV(ct);
    const _sheetEnemyNames = new Set(); // シートに「敵専用」として登録されている敵名
    charRows.forEach(row => {
      const name = row['名前'];
      if (!name) return;
      if (row['種族']) SHEET_RACE_BY_NAME[_normCardName(name)] = row['種族'];
      const isEnemyOnly = _truthySheet(row['敵専用']) || _truthySheet(row['相手キャラクター専用']);
      if (isEnemyOnly) {
        // 敵専用：UNIT_POOL に同名エントリがあれば報酬プールから除外
        const upUnit = _findBySheetName(UNIT_POOL, name);
        if (upUnit) {
          upUnit.rarity = -1;
          upUnit.enemyOnly = true;
          _syncUnitEffectKeysFromSheet(upUnit);
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
        // キーワード列（なければ効果列）をキーワード配列として解釈（スペース/読点区切り）
        const kwStr = (row['キーワード'] || row['効果'] || '').trim();
        if (kwStr) ep.keywords = kwStr.split(/[\s、,，]+/).filter(Boolean);
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
      const nv = row['ネームド'] || row['ユニーク'];
      if (_truthySheet(nv)) unit.unique = true;
      else if (_falseySheet(nv)) unit.unique = false;
      const grade = parseInt(row['グレード']);
      if (!isNaN(grade) && grade >= 1) unit.grade = grade;
      { const rarStr=(row['レアリティ']||'').trim();
        const rarVal=parseInt(rarStr);
        if(rarStr==='-') unit.rarity=-1;
        else if(!unit.sheetOnly&&!isNaN(rarVal)&&rarVal>=1) unit.rarity=rarVal; }
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
      // 2枚重ね効果（stack1）と3枚重ね効果（stack2）を読み込む
      // 「強化」列を廃止し「1進化」「2進化」列に移行
      if (row['1進化'] !== undefined && row['1進化'].trim()) unit.stack1Desc = row['1進化'].trim();
      else delete unit.stack1Desc;
      if (row['2進化'] !== undefined && row['2進化'].trim()) unit.stack2Desc = row['2進化'].trim();
      else delete unit.stack2Desc;
      // 後方互換：旧「強化」列も残す（移行期間中）
      if (row['強化'] !== undefined && row['強化'].trim()) unit.stackEnhDesc = row['強化'].trim();
      else delete unit.stackEnhDesc;
      // 後方互換：旧stackEffectも残す
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
      _syncUnitEffectKeysFromSheet(unit);
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
