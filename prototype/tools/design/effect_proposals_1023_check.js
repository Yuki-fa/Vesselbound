'use strict';

// 提案書専用の読み取り検査。ゲーム・シート・提案書を変更しない。
// node tools/design/effect_proposals_1023_check.js [提案書パス]
// node tools/design/effect_proposals_1023_check.js --self-test
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { parseCsv, loadLocalXlsxData } = require('../balance_sim/sheet_data');
const ROOT = path.resolve(__dirname, '../..');
const CORE_PATH = path.join(ROOT, 'js/battle/core.js');
const coreSource = fs.readFileSync(CORE_PATH, 'utf8');
// 非公開の読み取り関数をVM内だけで公開。本体ファイルは変更しない。
const sandbox = { module: { exports: {} } };
vm.runInNewContext(coreSource + '\nthis.probe = { coreTriggerEffectEntries, coreTriggerTextParts, coreManaThresholdDescFromText };', sandbox, { filename: CORE_PATH });
const probe = sandbox.probe;
const SIMILARITY_THRESHOLD = 0.90;
const NUMBER_SHAPE_THRESHOLD = 0.94;

function readSheet(key) {
  // sheetRows()は名前のない行を落とすので、無名E081〜E083も含めて列名で読む。
  const all = parseCsv(loadLocalXlsxData()[key] || '');
  const headers = all.shift().map(h => h.trim());
  return all.map(cells => Object.fromEntries(headers.map((h, i) => [h, cells[i] || ''])))
    .filter(r => r['No.']);
}
const sheets = Object.fromEntries(['card', 'enchant', 'keyword'].map(k => [k, readSheet(k)]));
const existing = ['card', 'enchant'].flatMap(k => sheets[k].flatMap(r => ['効果', '強化効果'].filter(col => r[col].trim()).map(col => ({
  id: r['No.'], name: r['名前'] || '（無名）', form: col, text: r[col], implemented: r['実装'] === 'true',
}))));
function normalize(s, numbers = false) {
  let text = String(s).normalize('NFKC').replace(/[＆&]/g, '&').replace(/[\s。．、,]/g, '').replace(/[：；;]/g, ':');
  return numbers ? text.replace(/\d+(?:\.\d+)?/g, 'N') : text;
}
function distance(a, b) {
  if (a === b) return 0;
  if (a.length > b.length) [a, b] = [b, a];
  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    const cur = [j];
    for (let i = 1; i <= a.length; i++) cur[i] = Math.min(cur[i - 1] + 1, prev[i] + 1, prev[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[a.length];
}
function similarity(a, b, threshold) {
  const size = Math.max(a.length, b.length);
  if (!size) return 1;
  if (Math.min(a.length, b.length) / size < threshold) return 0;
  return 1 - distance(a, b) / size;
}
function nearMatches(text, pool = existing) {
  const plain = normalize(text), shape = normalize(text, true);
  return pool.flatMap(e => {
    if (text === e.text) return [{ ...e, kind: '完全一致', score: 1 }];
    const score = similarity(plain, normalize(e.text), SIMILARITY_THRESHOLD);
    const numeric = similarity(shape, normalize(e.text, true), NUMBER_SHAPE_THRESHOLD);
    if (score >= SIMILARITY_THRESHOLD) return [{ ...e, kind: 'ほぼ一致', score }];
    if (numeric >= NUMBER_SHAPE_THRESHOLD) return [{ ...e, kind: '数値置換でほぼ一致', score: numeric }];
    return [];
  });
}
function markdownRows(source) {
  const rows = []; let headers = null;
  // 実行結果の転記欄は再解析しない。
  const body = source.split('<!-- CHECK_OUTPUT_START -->')[0];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith('|')) { headers = null; continue; }
    const cells = line.split('|').slice(1, -1).map(s => s.trim());
    if (cells.includes('ID') && cells.includes('効果文')) { headers = cells; continue; }
    if (!headers || cells.every(s => /^[-: ]+$/.test(s))) continue;
    assert.equal(cells.length, headers.length, `表の列数が不正: ${line}`);
    const row = Object.fromEntries(headers.map((h, i) => [h, cells[i].replace(/<br\s*\/?\s*>/gi, '\n')]));
    assert.match(row.ID, /^[RBGYPE]\d{2}$/, `不正な提案ID: ${row.ID}`);
    rows.push(row);
  }
  return rows;
}
function validateRows(rows) {
  assert.equal(rows.length, 150, '提案の総数');
  assert.equal(new Set(rows.map(r => r.ID)).size, 150, 'IDの重複');
  assert.equal(new Set(rows.map(r => r['仮称'])).size, 150, '仮称の重複');
  const names = new Set([...sheets.card, ...sheets.enchant].map(r => r['名前']).filter(Boolean));
  const keywords = new Set(sheets.keyword.map(r => r['名前']).filter(Boolean));
  for (const prefix of ['R', 'B', 'G', 'Y', 'P', 'E']) {
    const count = prefix === 'E' ? 50 : 20;
    for (let i = 1; i <= count; i++) assert(rows.some(r => r.ID === prefix + String(i).padStart(2, '0')), `欠番: ${prefix}${i}`);
  }
  for (const row of rows) {
    for (const field of ['効果文', '強化効果', '寄与する編成・増える選択', '既存との重複・違い', '実装見込み']) assert(row[field], `${row.ID} ${field} 空欄`);
    assert.match(row['レアリティ'], /^[1-5]$/, row.ID + ' レアリティ');
    if (row.ID[0] !== 'E') assert.match(row['ATK/HP'], /^[1-9]\d*\/[1-9]\d*$/, row.ID + ' ATK/HP');
    else assert.match(row['ポート案'], /^[1-4]/, row.ID + ' ポート案');
    assert.notEqual(row['効果文'], row['強化効果'], row.ID + ' 強化差分なし');
    assert([...names].some(n => row['寄与する編成・増える選択'].includes(n)), row.ID + ' 既存の相方名なし');
    assert([...names].some(n => row['既存との重複・違い'].includes(n)) || /R04|E083/.test(row['既存との重複・違い']), row.ID + ' 比較先なし');
    for (const token of row['キーワード（通常・強化共通）'].split(/[\s　]+/)) {
      if (token === '—') continue;
      assert(keywords.has(token.replace(/[\d∞]+$/, '')), row.ID + ' 未定義キーワード: ' + token);
    }
    for (const fn of row['実装見込み'].match(/core[A-Za-z0-9]+/g) || []) assert(new RegExp('function ' + fn + '\\b').test(coreSource), row.ID + ' コア関数不在: ' + fn);
    for (const field of ['効果文', '強化効果']) {
      assert.match(row[field], /^(攻撃|負傷|死亡|開戦|終戦|解放|常時|起動|\d+マナ(?:毎)?)：/, row.ID + ' トリガ不正');
      assert(!/[{}]/.test(row[field]), row.ID + ' 未展開の数値');
    }
  }
}

// 小さな字句走査。コメント・文字列・テンプレート文字列を読み飛ばし、実コードの
// 正規表現リテラルだけを得る。JSの完全なAST解析ではない。new RegExpの動的式は対象外。
function regexLiterals(source) {
  const found = []; let i = 0, previous = '';
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && source[i + 1] === '/') { i = source.indexOf('\n', i + 2); if (i < 0) break; continue; }
    if (c === '/' && source[i + 1] === '*') { const end = source.indexOf('*/', i + 2); assert(end >= 0); i = end + 2; continue; }
    if ('\'"`'.includes(c)) {
      const quote = c; i++;
      while (i < source.length) { if (source[i] === '\\') { i += 2; continue; } if (source[i++] === quote) break; }
      previous = 'value'; continue;
    }
    if (c === '/' && (!previous || /^[=(:,[!&|?;{}]$/.test(previous) || /^(return|case|throw)$/.test(previous))) {
      const start = i; let j = i + 1, inClass = false, closed = false;
      for (; j < source.length && source[j] !== '\n'; j++) {
        if (source[j] === '\\') { j++; continue; }
        if (source[j] === '[') inClass = true;
        if (source[j] === ']') inClass = false;
        if (source[j] === '/' && !inClass) { closed = true; break; }
      }
      if (closed) {
        let end = j + 1; while (/[dgimsuvy]/.test(source[end] || '\0')) end++;
        const literal = source.slice(start, end);
        // 構文として本当に正規表現かも検証する。
        try { const re = vm.runInNewContext(literal); found.push({ start, end, literal, source: re.source, flags: re.flags }); i = end; previous = 'value'; continue; } catch { /* 除算なら通常トークンへ戻す */ }
      }
    }
    if (/[A-Za-z_$\d]/.test(c)) {
      const start = i++; while (/[\w$]/.test(source[i] || '\0')) i++;
      previous = source.slice(start, i); continue;
    }
    previous = c; i++;
  }
  return found;
}
function defaultTrigger(fn) {
  if (/^(coreApplyOpeningEffectsInner|coreApplyOpeningScaledGrant)$/.test(fn)) return '開戦';
  if (fn === 'coreApplyAttackEffectsInner') return '攻撃';
  if (fn === 'coreApplyInjuryEffectsBody') return '負傷';
  if (fn === 'coreApplyDeathEffectsInner') return '死亡';
  if (fn === 'coreApplyReleaseEffects') return '解放';
  if (fn === 'coreApplyManaThresholdEffectsInner') return 'マナ';
  if (fn === 'coreTriggerBattleEnd') return '終戦';
  if (/^(coreApplyDeathObserversInner|coreApplyAttackObservers|coreApplyShieldLostEffects|coreApplyKenzokuSummonEffects|coreApplySummonStatEffects|coreTriggerAtkGainEffects|coreEmitAilment|coreFormationPassiveSpec|coreApplyFormationPassives)$/.test(fn)) return '常時';
  return null;
}
function collectRules(source) {
  const functions = [...source.matchAll(/^function (\w+)\s*\(/gm)].map(m => ({ name: m[1], index: m.index }));
  let fi = 0;
  return regexLiterals(source).flatMap(r => {
    while (fi + 1 < functions.length && functions[fi + 1].index < r.start) fi++;
    const fn = functions[fi]?.name || '';
    // 文字整形やトリガ名だけの正規表現を効果認識に数えない。
    if ((r.source.match(/[一-龠ぁ-んァ-ヶ]/g) || []).length < 5) return [];
    const before = source.slice(Math.max(0, r.start - 260), r.start);
    const explicit = before.match(/(?:coreTriggerEffectEntries|coreEffectNumbers|coreUnitTriggerEntries)\([^,]+,\s*['"](開戦|攻撃|負傷|死亡|終戦|解放|常時)['"],\s*$/);
    const trigger = explicit ? explicit[1] : defaultTrigger(fn);
    if (!trigger) return [];
    return [{ ...r, fn, trigger, direct: !!explicit, line: source.slice(0, r.start).split('\n').length }];
  });
}
const rules = collectRules(coreSource);
function classify(text, ruleSet = rules) {
  const trigger = text.match(/^([^：]+)：/)?.[1];
  if (!trigger) return { status: '読めない（一致なし）', matches: [] };
  const mana = /^\d+マナ(?:毎)?$/.test(trigger);
  const body = mana ? probe.coreManaThresholdDescFromText(text) : probe.coreTriggerTextParts({ desc: text }, trigger)[0];
  if (!body) return { status: '読めない（一致なし）', matches: [] };
  const matches = [];
  for (const r of ruleSet.filter(r => r.trigger === (mana ? 'マナ' : trigger))) {
    const re = new RegExp(r.source, r.flags.replace(/[gy]/g, ''));
    let m;
    if (r.direct) m = probe.coreTriggerEffectEntries({ desc: text }, trigger, re)[0];
    else m = body.match(re);
    let fullInput = false;
    if (!m) { m = text.match(re); fullInput = !!m; }
    if (!m || !m[0] || m[0].length < 5) continue;
    const input = fullInput ? text : body;
    const index = m.index == null ? input.indexOf(m[0]) : m.index;
    const left = input.slice(0, index), tail = input.slice(index + m[0].length);
    // 「召喚」等の動詞語幹で止める実パーサーを許す。条件や上限は許さない。
    const complete = !left.trim() && /^(?:する|させる)?[。\s]*(?:(?:これ|この判定)を(?:\d+回|もう一度)繰り返す[。\s]*)?$/.test(tail);
    matches.push({ ...r, complete, matched: m[0], remaining: (left + tail).trim() });
  }
  const full = matches.filter(m => m.complete);
  return { status: full.length ? '読める' : matches.length ? '読めない（部分一致）' : '読めない（一致なし）', matches: full.length ? full : matches };
}
function selfTest() {
  assert.equal(distance('abc', 'axc'), 1);
  assert.equal(nearMatches('攻撃：1マナを得る。', [{ text: '攻撃：1マナを得る。' }])[0].kind, '完全一致');
  assert(nearMatches('攻撃：2マナを得る。', [{ text: '攻撃：1マナを得る。' }]).length);
  assert.equal(nearMatches('開戦：全ての赤の味方はHP+2を得る。', [{ text: '死亡：血を3得る。' }]).length, 0);
  assert.equal(classify('開戦：全ての赤の味方は+1/+2を得る。').status, '読める');
  assert.equal(classify('開戦：全ての赤の味方は+1/+2を得る。この効果は1戦闘に1回まで発動する。').status, '読めない（部分一致）');
  assert.notEqual(classify('開戦：味方が2体以下なら、全ての赤の味方は+1/+2を得る。').status, '読める');
  assert.equal(classify('攻撃：全ての赤の味方は+1/+2を得る。', rules.filter(r => r.trigger === '開戦')).status, '読めない（一致なし）');
  assert.equal(classify('3マナ毎：未知の処理を1回行う。').status, '読めない（一致なし）');
  assert.equal(classify('3マナ毎：このキャラクターは+1/+1を得る。').status, '読める');
  const fixture = '// /偽の効果を得る/\nconst s="/偽の効果を得る/"; const x=/真の効果を得る/; const y=12/3;';
  assert.equal(regexLiterals(fixture).length, 1);
  assert.equal(regexLiterals(fixture)[0].source, '真の効果を得る');
  assert(existing.some(e => e.id === 'E083' && e.name === '（無名）'));
  console.log('自己検査 OK：完全一致・数値近似・非類似・全文・上限残り・条件残り・異トリガ・マナ本文・コメント除外・無名行');
}
function run(file) {
  const source = fs.readFileSync(file, 'utf8');
  const rows = markdownRows(source); validateRows(rows);
  const variants = rows.flatMap(row => ['効果文', '強化効果'].map(field => ({ row, field, text: row[field], result: classify(row[field]) })));
  const count = status => variants.filter(v => v.result.status === status).length;
  const duplicates = variants.flatMap(v => nearMatches(v.text).map(e => ({ v, e })));
  const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
  console.log('効果提案1023 機械確認');
  console.log(`参照SHA256先頭16桁: core=${hash(coreSource)} / local_xlsx_data=${hash(fs.readFileSync(path.join(ROOT, 'js/data/local_xlsx_data.js')))}`);
  console.log(`提案数: 赤20 / 青20 / 緑20 / 黄20 / 紫20 / エンチャント50 = ${rows.length}`);
  console.log(`必須欄・ID・レアリティ・基礎値・既存相方名・キーワード・参照関数: OK`);
  console.log(`既存行: card=${sheets.card.length} / enchant=${sheets.enchant.length} / keyword=${sheets.keyword.length}; 比較対象効果=${existing.length}（通常・強化、無名・未実装を含む）`);
  console.log(`全文検査: ${variants.length}文 / コア正規表現候補=${rules.length}`);
  console.log(`今のコアで読める: ${count('読める')}文`);
  console.log(`今のコアで読めない: ${variants.length - count('読める')}文（部分一致=${count('読めない（部分一致）')} / 一致なし=${count('読めない（一致なし）')}）`);
  console.log('判定は正規表現による全文相当の読み取り。実戦・画面・新案の実装を検証したものではない。');
  console.log(`既存との完全一致: ${duplicates.filter(d => d.e.kind === '完全一致').length}組 / ほぼ一致: ${duplicates.filter(d => d.e.kind !== '完全一致').length}組`);
  console.log(`近似閾値: 文字列=${SIMILARITY_THRESHOLD} / 数値置換=${NUMBER_SHAPE_THRESHOLD}`);
  console.log('\n【既存効果との完全一致・ほぼ一致：全件】');
  if (!duplicates.length) console.log('該当なし');
  for (const { v, e } of duplicates) console.log(`${v.row.ID}/${v.field} → ${e.id} ${e.name}/${e.form} [${e.implemented ? '実装true' : '実装false'}] ${e.kind} ${(e.score * 100).toFixed(1)}%\n  提案: ${v.text}\n  既存: ${e.text}`);
  console.log('\n【提案ごとの読み取り分類：通常／強化】');
  for (const row of rows) {
    const texts = variants.filter(v => v.row === row);
    console.log(`${row.ID} ${row['仮称']}: ${texts.map(v => (v.field === '効果文' ? '通常' : '強化') + '=' + v.result.status).join(' / ')}`);
    for (const v of texts) {
      // 全候補を照合するが表示は最長一致1件。部分一致は残りを必ず表示。
      const match = [...v.result.matches].sort((a, b) => b.matched.length - a.matched.length || a.line - b.line)[0];
      if (match) console.log(`  ${v.field}: core.js:${match.line} ${match.fn} / 一致「${match.matched}」${match.complete ? '' : ' / 未読「' + match.remaining + '」'}`);
    }
  }
  console.log('\n【提案内部の同文：通常・強化の同じ欄同士】');
  let internal = 0;
  for (const field of ['効果文', '強化効果']) for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    if (normalize(rows[i][field]) === normalize(rows[j][field])) { console.log(`${rows[i].ID} = ${rows[j].ID} (${field})`); internal++; }
  }
  if (!internal) console.log('該当なし');
  const mismatches = rows.filter(row => row['実装見込み'].startsWith('既存構文') && variants.some(v => v.row === row && v.result.status !== '読める'));
  console.log(`実装見込み「既存構文」と読み取り分類の不一致: ${mismatches.length}案${mismatches.length ? ' ' + mismatches.map(r => r.ID).join('、') : ''}`);
  assert.equal(mismatches.length, 0, '提案書の既存構文の見込みを見直してください');
}
if (require.main === module) {
  try {
    if (process.argv.includes('--self-test')) selfTest();
    else run(path.resolve(process.argv[2] || path.join(__dirname, 'EFFECT_PROPOSALS_1023.md')));
  } catch (e) { console.error('確認失敗: ' + e.message); process.exitCode = 1; }
}
module.exports = { markdownRows, nearMatches, classify, regexLiterals, validateRows };
