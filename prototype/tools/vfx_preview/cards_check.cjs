'use strict';
// CSVの全行・演出台帳・LAB割当・検索をNodeで確認。音の聴感／画面確認とは別。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { gameGeometry, webpInfo } = require('./cards_geometry.cjs');
const { RUNTIME_SCRIPTS } = require('../vfx_export');
const root = path.resolve(__dirname, '../..');
const context = { console: { log() {} }, URL, Set, document: { currentScript: null, getElementById: () => null, baseURI: 'file://' + root + '/tools/vfx_preview.html' } };
context.window = context; context.addEventListener = () => {};
vm.createContext(context);
for (const f of ['assets.js','js/battle/present.js','js/data/local_xlsx_data.js', 'js/data/loader.js', ...RUNTIME_SCRIPTS,
  'tools/vfx_preview/catalog.js', 'tools/vfx_preview/cards_routes.js', 'tools/vfx_preview/cards_geometry.js', 'tools/vfx_preview/cards_model.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context, { filename: f });
}
const model = context.VbFxCardCatalog;
const input = context.VESSELBOUND_LOCAL_XLSX_CSV;
const before = JSON.stringify(input);
const cards = model.build(input, context._parseCSVWithHeader, context.VbFxCardRoutes, context.VbFx.effects, context.VbFxPreviewCatalog);
const newPicks=JSON.parse(fs.readFileSync(path.join(__dirname,'se/picks_1012.json'),'utf8'));
for(const [name,pick]of Object.entries(newPicks)){
  const card=cards.find(c=>c.no===pick.code);
  assert.ok(card&&card.lab.some(d=>d.name===name),pick.code+' 新21種のLAB割当');
  assert.equal(card.adopted.provisional,true,pick.code+' 仮（候補1・利用者未選択）');
  assert.ok(context.VbFxPreviewCards[pick.code],pick.code+' プレビューの絵・色・名前');
  assert.ok(context.VbFxPreviewCatalog[name],name+' 単独再生設定');
}
const expected = Object.keys(model.kinds).flatMap(key => context._parseCSVWithHeader(input[key], ['No.', '名前'])
  .filter(r => r['名前'] && /^[A-Z]+\d{3}(?:_\d+)?$/.test(r['No.'] || '')).map(r => r['No.']));
assert.deepEqual(Array.from(cards, c => c.no).sort(), expected.sort(), '全シートのカードが番号ごとに1行ある');
assert.equal(new Set(cards.map(c => c.no)).size, cards.length, '番号の重複なし');
assert.equal(JSON.stringify(input), before, '内蔵CSVを変更しない');
assert.equal(cards.length, Object.keys(context.VbFxCardRoutes.records).length, '台帳の件数が全カードと一致');
for (const c of cards) {
  assert.ok(context.VbFxCardRoutes.records[c.no], c.no + ' 台帳あり');
  assert.equal(context.VbFxCardRoutes.records[c.no].signature, model.signature(c.row), c.no + ' シートと台帳一致');
  for (const media of [...c.vfx, ...c.se]) if (media.path) {
    const name = (media.path.match(/^vfx:[^:]+:([^:]+)$/) || [])[1];
    if (name) assert.ok(context.VbFx.effects.some(d => d.name === name && (d.sourceCode === media.sourceCode || context.presentLabFx(media.sourceCode)?.[0] === name)), c.no + ' 定義と元番号（または本体の明示的なLAB対応）あり: ' + media.path);
    else assert.ok(fs.existsSync(path.join(root, media.path)), c.no + ' 素材あり: ' + media.path);
  }
  c.lab.forEach(fx => assert.ok(context.VbFx.effects.some(d => d.name === fx.name), c.no + ' LAB演出がある: ' + fx.name));
  if (c.adopted) assert.ok(fs.existsSync(path.join(root, c.adopted.path)), c.no + ' 正式採用SEあり');
  const dedicated = c.vfx.findIndex(v => model.dedicated(c.row, v, c.kind));
  // 2026-10-23：固有VFXが無いカードは「戦闘で出るこのカードのVFXを順に」（-1）。
  assert.equal(model.defaultVfxIndex(c), dedicated, c.no + ' 既定は固有素材、無ければ順に');
}
assert.equal(cards.find(c => c.no === 'C008').vfx[model.defaultVfxIndex(cards.find(c => c.no === 'C008'))].path,
  'vfx:C008:arachne-ring', '通常攻撃が先頭でもC008の固有定義を選ぶ');
const assets = new Map();
for (const c of cards) for (const vfx of c.vfx.filter(v => v.path)) {
  if (vfx.definition) {
    assert.deepEqual(JSON.parse(JSON.stringify(vfx.asset)), { renderer: 'definition', durationMs: vfx.ms, frameCount: 0 }, c.no + ' 定義の実経路の尺');
  } else {
    if (!assets.has(vfx.path)) assets.set(vfx.path, webpInfo(path.join(root, vfx.path)));
    assert.deepEqual(JSON.parse(JSON.stringify(vfx.asset)), assets.get(vfx.path), c.no + ' 素材の全フレーム・尺・縦横比');
  }
  assert.ok(vfx.geometry && vfx.geometry.widthRatio > 0, c.no + ' 本体の素材寸法がある');
  assert.equal(context.VbFxLabGeometry.visibleMs(vfx, 2.5), vfx.loop ? Math.max(1, vfx.asset && vfx.asset.durationMs || 3000) : (Number(vfx.ms) || 800), c.no + ' 再生時間は実機と同じ（ゲームの尺）');
}
const game = gameGeometry(root), lab = context.VbFxLabGeometry;
assert.deepEqual(JSON.parse(JSON.stringify(lab.game)), game, '本体CSSの最終値とLAB寸法が一致');
const render = fs.readFileSync(path.join(root, 'js/engine/render.js'), 'utf8');
const actualX = vm.runInNewContext(render.match(/const _fieldW=[^\n]+\n\s*const _unitX=[^\n]+/)[0]
  + '\n_unitX;', { frontSlots: game.frontSlots });
function cssNumber(text) {
  const expr = text.replace(/var\(--unit-card-w\)/g, game.cardWidth).replace(/var\(--unit-card-h\)/g, game.cardHeight)
    .replace(/var\(--unit-field-gap\)/g, game.gap).replace(/calc\(/g, '(');
  assert.match(expr, /^[\d.\s()+*/-]+$/); return vm.runInNewContext(expr);
}
function gamePosition(side, lane, count, index) {
  const top = vm.runInNewContext(render.match(/const _rearTop=[^\n]+/)[0] + '\n'
    + render.match(/const _frontTop=[^\n]+/)[0] + '\n' + (lane === 'front' ? '_frontTop' : '_rearTop') + ';', { isEnemy: side === 'enemy' });
  return { left: (game.width - game.fieldWidth) / 2 + cssNumber(actualX(count, index)),
    top: (side === 'enemy' ? game.enemyTop : game.allyTop) + cssNumber(top) };
}
let layoutCases = 0;
for (const side of ['ally', 'enemy']) for (const lane of ['front', 'rear']) for (let n = 1; n <= game.frontSlots; n++) for (let i = 0; i < n; i++) {
  const actual = gamePosition(side, lane, n, i), preview = lab.position(side, lane, n, i);
  assert.equal(preview.left, actual.left, '横方向の人数別中央詰め ' + [side, lane, n, i]);
  assert.equal(preview.top, actual.top, '敵味方の前衛／後衛 ' + [side, lane, n, i]); layoutCases++;
}
const css = fs.readFileSync(path.join(__dirname, 'preview.css'), 'utf8');
assert.ok(css.includes('center bottom / cover'), '背景は本体と同じ下端揃え');
assert.ok(css.includes('width:var(--lab-card-w);height:var(--lab-card-h)'), 'カード寸法は採取値を使う');
assert.ok(css.includes('.lab-card .name{display:none}'), '本体の戦闘カードと同じ名前非表示');
const nodes = ['ally', 'enemy'].map(side => { const p = lab.position(side, 'front', 3, 1);
  return { offsetLeft: p.left, offsetTop: p.top, offsetWidth: game.cardWidth, offsetHeight: game.cardHeight }; });
const c008 = cards.find(c => c.no === 'C008').vfx.find(v => v.definition === 'arachne-ring');
assert.equal(lab.mediaBox(c008, ...nodes).width, game.cardWidth, 'C008の定義の基準幅');
assert.equal(lab.mediaBox(c008, ...nodes).height, game.cardHeight, 'C008の定義の基準高さ');
const front = [0, 1, 2].map(i => { const p = lab.position('enemy', 'front', 3, i);
  return { offsetLeft: p.left, offsetTop: p.top, offsetWidth: game.cardWidth, offsetHeight: game.cardHeight }; });
const tri = cards.find(c => c.no === 'K008').vfx.find(v => v.definition === 'tri-streak');
assert.equal(lab.mediaBox(tri, ...nodes, front).width, (game.cardWidth * 3 + game.gap * 2) * tri.geometry.spanWidthRatio, '三方向の実対象幅');
const present=fs.readFileSync(path.join(root,'js/battle/present.js'),'utf8');
const labFx=vm.runInContext('PRESENT_LAB_FX',context);
assert.equal(labFx.K009[0],'all-cross','全体攻撃の採用演出はLAB案C');
assert.ok(context.VbFx.effects.some(fx=>fx.name==='all-cross'),'LABと本体に同じ全体攻撃がある');
assert.ok(render.includes("return playBattleLabFx(getKeywordAssetKey('全体攻撃'),attacker,list)"),'本体の全体攻撃は名前→素材キーの共通LABへ渡す');
for (const kind of Object.keys(model.kinds)) {
  assert.equal(model.filter(cards, { kind }).length, cards.filter(c => c.kind === kind).length, kind + ' 種別フィルタ');
}
for (const setting of ['専用', '汎用', '無し', '不明']) for (const kind of ['vfx', 'se']) {
  assert.equal(model.filter(cards, { [kind]: setting }).length, cards.filter(c => c[kind + 'Setting'] === setting).length, kind + '/' + setting + ' フィルタ');
}
assert.equal(model.filter(cards, { search: 'c037' })[0].no, 'C037', '番号検索');
assert.equal(model.filter(cards, { search: 'デュラハン' })[0].no, 'C037', '名前検索');
assert.equal(model.filter(cards, { lab: 'yes' }).length + model.filter(cards, { lab: 'no' }).length, cards.length, 'LAB有無を全部表示');
const changed = { ...input, card: input.card.replace('デュラハン', '検査用の改名') };
assert.equal(model.build(changed, context._parseCSVWithHeader, context.VbFxCardRoutes, [], {}).find(c => c.no === 'C037').vfxSetting, '不明', 'シート変更を古い台帳で確定しない');
const summary = JSON.parse(JSON.stringify(model.summary(cards)));
console.log('全カード一覧: ' + summary.total + '件 / ' + JSON.stringify(summary.kinds));
console.log('現行VFX: ' + JSON.stringify(summary.vfx) + ' / 現行SE: ' + JSON.stringify(summary.se) + ' / LAB割当: ' + summary.lab);
console.log('番号重複・欠落なし、枝番エネミー・素材・LAB割当・全フィルタ・台帳の古さ検知 OK');
console.log('固有VFX既定・素材1周・サイズ／配置 ' + layoutCases + '件・背景下端揃え OK');
if (process.argv.includes('--report')) {
  const rows = [
    ['画面', game.width + '×' + game.height, lab.game.width + '×' + lab.game.height],
    ['カード', game.cardWidth + '×' + game.cardHeight, lab.game.cardWidth + '×' + lab.game.cardHeight],
    ['カード間隔', game.gap, lab.game.gap], ['戦闘フィールド', game.fieldWidth + '×' + game.fieldHeight, lab.game.fieldWidth + '×' + lab.game.fieldHeight],
    ['背景位置', game.backgroundPosition, lab.game.backgroundPosition],
    ...[['enemy','rear',2,'敵後衛'],['enemy','front',3,'敵前衛'],['ally','front',3,'味方前衛'],['ally','rear',2,'味方後衛']]
      .map(([side, lane, count, label]) => [label + ' 上端', gamePosition(side, lane, count, 0).top, lab.position(side, lane, count, 0).top]),
    ...[[3,'前衛3枚'],[2,'後衛2枚']].map(([n,label]) => [label + ' 左端X', Array.from({length:n},(_,i)=>gamePosition('ally','front',n,i).left).join(' / '),
      Array.from({length:n},(_,i)=>lab.position('ally','front',n,i).left).join(' / ')]),
    ['ATK 左', game.statAtkLeft, lab.game.statAtkLeft], ['HP 右', game.statHpRight, lab.game.statHpRight],
    ['能力値 下', game.statBottom, lab.game.statBottom], ['能力値 幅／文字サイズ', game.statWidth + ' / ' + game.statFontSize, lab.game.statWidth + ' / ' + lab.game.statFontSize]
  ];
  fs.writeFileSync(path.join(__dirname, 'cards_layout_report.md'), [
    '# ゲームとVFX LABの配置比較', '',
    '3840×2160のゲーム内座標。幅260×高さ395、前衛最大7枠。数値は現在のindex.htmlの最終CSSとrenderFieldの計算から採取。', '',
    '| 項目 | ゲーム | LAB |', '|---|---:|---:|', ...rows.map(r => '| ' + r.join(' | ') + ' |'), '',
    '左右の計算はrender.jsの`_unitX`を実行し、前衛／後衛それぞれ1〜7枚・両陣営の計' + layoutCases + '配置で差分0。人数が少ない列は行ごとに中央へ詰める。召喚前は3枚、召喚表示の時に発生元陣営の前衛を4枚の並びへ詰める。再再生の4→3枚も、VFXの座標取得前に同期する（`cards_runtime_check.cjs --layout-only`で確認）。', '',
    '## VFXの寸法', '',
    '- 通常素材：`.damage-vfx-host .vfx-hit-video`の幅460%、高さauto。`presentCharacterVfxScale`とimgの実transformを適用。例：通常命中1196px、K003/S008は598px、C019_1は74.75px。',
    '- C008は専用の100%×100%画像へ倍率2をかけるので520×790px。復活K020は幅598px、Xはカード幅の-12%。',
    '- マナ回復は`playManaGainVfx`のmax(8, 64, カード幅×.55)から143×143px。初期Yは中心からカード高×-.18、上昇量はカード高×.35。',
    '- 貫通K007はカード幅×1.1＝286px。三方向K008は実対象列の幅×3、絵の幅×-.2だけXをずらす（前衛3枚で2484px）。全体K009はフィールド幅1964×4.6×.2875＝2597.39px。',
    '- 結界はportraitと同じ幅87.68%・高さ92.85%・top3.58%。封印解除／特殊マスは`playSpecialProductionVfx`のhostとobject-fitを採取する。',
    '- LAB演出は本体と同じカード矩形をVbFxへ渡す。大きさ1.0×が既定で、描画内部は変更しない。現行の移動・逆再生・関数だけの描画は近似の表示を維持する。', '',
    '## 再生と検査', '',
    '- 現行再生は画像のdecode完了と最初の描画後に時計を始め、ゲームの尺とAnimated WebPのANMF全フレーム合計の長い方を表示。WebP画像はCSSで早送りできないため、速さを上げても素材1周を切らない。常時素材は明示停止まで残す。',
    '- `VbFxCards.history()`に読み込み開始、描画開始、予定尺、完了時刻、経過時間、完了／停止／失敗、寸法を記録する。',
    '- `node tools/vfx_preview/cards_check.cjs`で一覧・寸法・配置、`node tools/vfx_preview/cards_runtime_check.cjs`で実JSの完了・停止・検査起動を確認する。NodeのCanvas代替は画素・聴感の確認をしない。',
    '- 実ブラウザ検査は`tools/vfx_preview.html?verify=1`のみ。通常URLに結果パネルは出ない。件数はfx_lab.jsとse_catalog.jsの現在値から計算する。', '',
    '## 停止の原因と修正', '',
    '- `fx_lab.js`で`cancelled:true`を返すのは`stopAll()`経由だけ。重い描画・rAF停止の番人は`cancelled:false`で完了し、描画例外はrejectする。',
    '- タブ切替→`VbFxCards.stop()`→`VbFxPreview.stop()`→`VbFx.stopAll()`で魔族の魂がキャンセルされる経路を、実JSで再現した。検査と通常操作が同じ再生を共有していた。報告された過去の停止の具体的な呼び出し元は、元のログに記録がないため特定できない。',
    '- 検査は全画面の初期化後に明示起動し、通常操作・タブ操作・検査の二重起動を止める。検査中のstopAllに、演出名・想定した停止かどうか・呼び出しスタックを記録する。既存のSE同期と状態重ね表示のコードは開始時と同一。',
    '- 現行素材はsrc設定直後から終了タイマーが進み、読み込み時間や素材1周が従来の指定尺を越えた分が切られていた。画像decode／最初の描画を待ち、素材1周の全尺を確保。連続比較も、SEを次の経路の開始で切らない。',
    '- 既定は自分の番号・シートのVFX/SE指定番号の専用素材、無ければ実経路の先頭。連続比較は選択した時だけ実行する。', '',
    '## 今回の変更ファイル', '',
    '- tools/vfx_preview.html',
    '- tools/vfx_preview/preview.js、preview.css、check.js、check_headless.js',
    '- tools/vfx_preview/cards.js、cards.css、cards_model.js、cards_routes.js、cards_scan.cjs、cards_check.cjs',
    '- tools/vfx_preview/cards_geometry.js、cards_geometry.cjs、cards_dom.cjs、cards_runtime_check.cjs（新規）',
    '- tools/vfx_preview/cards_layout_report.md（新規）、cards_report.md', '',
    'Nodeの全件検査：通常44演出＋常時5状態、反対陣営7、追加6、SE68（採用済み33）。構文検査12本、一覧365行、配置112例、固有既定、遅い読み込み、途中停止の再現／排他／停止元の記録、状態の継続が通過。', '',
    '画面・聴感・file/httpの実ブラウザ確認は未実行。ヘッドレスChromeへ接続できなかった（check_headless.jsの結果は/private/tmp/vb_vfx_qa_followup/headless_results.json）。', ''
  ].join('\n'));
  const report = [
    '# 全カードVFX・SE一覧の検査結果', '',
    '一覧：`tools/vfx_preview.html` の「全カード VFX・SE」タブ。内蔵CSVを既存のヘッダ名パーサーで読む。', '',
    '通常カード ' + (summary.total - summary.kinds['共通演出']) + ' 件＋共通演出 ' + summary.kinds['共通演出'] + ' 件、合計 ' + summary.total + ' 件。番号の重複・欠落なし。合体効果は同じ番号の行へ含める。', '',
    '| カード種 | 件数 |', '|---|---:|', ...Object.entries(summary.kinds).map(([k, n]) => '| ' + k + ' | ' + n + ' |'), '',
    '| 現行設定 | 専用 | 汎用 | 無し | 不明 |', '|---|---:|---:|---:|---:|',
    ...['vfx', 'se'].map(k => '| ' + k.toUpperCase() + ' | ' + ['専用', '汎用', '無し', '不明'].map(s => summary[k][s]).join(' | ') + ' |'), '',
    'LAB割当あり：' + summary.lab + '件。正式な割当はADOPTED.md。ラベル・番号が一致する採用前の試作も併記する。採用SEの列は現在ゲームで使うSEの列とは別。', '',
    '## 不明の全件と理由', '',
    ...summary.unknown.flatMap(c => ['- ' + c.no + ' ' + c.name + '：' + Array.from(new Set(c.reasons.vfx.concat(c.reasons.se))).join(' / ')]), '',
    '## 現行再生が近似になる全件', '',
    '現行再生でVFXを出す全 ' + summary.approximate.length + ' 件。素材・サイズは本体の実行経路から採取したWebP／PNGとDOM/CSSの寸法。読み込み完了後、指定尺と素材1周の長い方を表示する。常時素材は停止操作まで残す。関数のみの描画は同じ尺の簡易表示。対象選択・移動・逆再生・永続状態CSSは完全再現しない。LAB再生は既存のVbFxPreview.playを使用。配置の数値はcards_layout_report.md。', '',
    ...Object.keys(model.kinds).flatMap(k => {
      const ids = cards.filter(c => c.kind === k && c.approximate).map(c => c.no);
      return ids.length ? ['- ' + model.kinds[k] + '：' + ids.join('、')] : [];
    }), '',
    '## 自分で決めた表示規則', '',
    '- C・EN・BC・E・I・R・M・Kの名前がある全行を収録し、参照用にS共通演出11件も追加。名前が空の予約行はカードとして扱わない。未実装／プール未登録のカードも省略しない。',
    '- 1枚に複数経路がある場合、不明を優先し、確認できた経路は併記。その次に専用、汎用、無しの順で分類。',
    '- S共通素材、通常攻撃、他のキーワードの演出は汎用。そのカードまたはシートの指定番号の個別素材を専用とする。',
    '- LABの再生は採用済み割当を優先。試験用sourceだけから割当を推測しない。',
    '- 現行再生はイベント別の素材比較。入力編成・実戦の発動条件・全ての永続状態CSSを網羅した保証ではない。', '',
    '## 大盾・武器破壊の行動表示', '',
    '- 大盾は既存の反撃計算の結果を、既存のdamageイベントで通知する。`amount: 0`、`counter: true`、`blockedBy: "great_shield"`、`reason: "great_shield"`、`preventedAmount`（無効にした反撃量）、`unitId`（大盾側）、`sourceId`（反撃側）、`effect: false`、`effectSource: false`、`suppressAttackHitSfx: true`。戦闘状態や乱数は変更しない。',
    '- 通常攻撃、団結対象への先制攻撃、スケルトンキングの即時攻撃、ピクシーの操られた即時攻撃で、実際の反撃位置まで到達した時に通知する。封印、反撃量0、先制で相手が倒れた時、範囲攻撃の副対象では通知しない。',
    '- present.jsの共通表示元判定で、大盾側の本来の効果・接続エンチャントを効果文から特定する。武器破壊は既存のstat_change（attack_to_atk）に加え、damageTo: "atk"のdamageでも表示元を特定する。PvE・オンライン・保存イベントの再生が同じ判定を使う。',
    '- 新しい通知を含む保存イベントはJSON往復後も表示できる。更新前に計算・保存され、大盾の通知を持たない戦闘ログへ通知を後付けする処理は追加していない。', '',
    '## 変更ファイルと確認', '',
    '- ゲーム側：js/battle/core.js、js/battle/present.js、index.html（該当JSの版のみ）。',
    '- LAB側：tools/vfx_preview.html、preview.js（盤面のみ）、preview.css、cards.js、cards.css、cards_model.js、cards_routes.js、cards_scan.cjs、cards_check.cjs、cards_geometry.js/cjs、cards_dom.cjs、cards_runtime_check.cjs、check.js、check_headless.js、cards_report.md、cards_layout_report.md。preview.jsのSE合わせ・状態パネル、catalog.js・se_catalog.js・fx_lab.js・SEは変更していない。',
    '- Node：変更したJSの構文、balance_simの6本、online_payload.js、online_receivers.js、vb_action_banner_check.cjs、vb_action_banner_catalog_check.cjs、全カードの件数・素材・検索・フィルタ・古い台帳の検出を確認。',
    '- 大盾：300盤面で、開始時のコアとの差分が表示通知だけであり、最終状態・戦闘結果・既存イベント順・乱数消費が一致。新しい大盾通知500件を比較。両陣営の大盾／武器破壊と保存イベントのJSON往復も確認。',
    '- 画面確認・SEの聴感確認・ブラウザ演出パリティ検査は未実行。ヘッドレスChromeに接続できなかったため、Node検査の通過を実機確認とは扱わない。', '',
    '再検査：`node tools/vfx_preview/cards_scan.cjs --check`、`node tools/vfx_preview/cards_check.cjs`。本体／シート／ADOPTED.md変更後は先に`cards_scan.cjs`を実行して台帳を更新する。', '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'cards_report.md'), report);
}
