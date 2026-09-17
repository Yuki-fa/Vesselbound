# 検査・検証

変更箇所に応じた必須検査、ヘッドレスChrome、各検査ツールの目的と落とし穴を記録する。作業終了前に読むこと。

## 2. 終わる前に必ず通すもの

### 何をどこまで回すか（触った場所で決める）

**全部を毎回回さない。** 下の行を上から見て、当てはまるものだけ回す。

| 触ったもの | 回すもの | 目安 |
| --- | --- | --- |
| 何を触っても | `node --check`（変更した全JS）＋ `index.html` の `?v=` を上げる | 数秒 |
| 効果・キーワード・カードデータ | balance_sim 5本 | 約30秒 |
| 演出・VFX・SE・数値表示 | ＋ `anim_check.js` / `present_parity.js` | 各2〜5分 |
| オンラインの編成・送信・受け口 | ＋ `online_payload.js` / `online_receivers.js` | 各数秒 |
| 戦闘の進行そのもの（ターン・対象選択・終了判定） | ＋ `loop_parity.js` | 数分 |
| 見た目だけ（CSS・レイアウト） | `anim_check.js` のみ | 2分 |
| セーブ・進行の保存／復元 | `tools/save_{contract,browser,summon_replay}_test.js` | 各30秒 |

**セーブ検査の3本はヘッドレスブラウザを立てるので、続けて回すと落ちる。**
1本ずつ、数秒あけて回すこと（内容ではなく起動の競合で落ちる）。

balance_sim の5本は**効果に触ったら必ず**。ソース検査（`battle_event_regression.js`）は
二重実装の復活を見ているので、共通実装のシグネチャを変えたら必ず一緒に直す。

```bash
cd prototype/tools/balance_sim
for f in effect_audit.js card_core_smoke.js offline_online_regression.js \
         battle_event_regression.js pve_core_resource_parity.js; do node "$f"; done
```

| 検査 | 見ているもの |
| --- | --- |
| `effect_audit.js` | 効果の発動回数（二重発動を捕まえる） |
| `card_core_smoke.js` | 全カードがコアで例外なく動くか |
| `offline_online_regression.js` | オフライン基準版とコア／オンライン再生の一致 |
| `battle_event_regression.js` | 二重実装が復活していないか（ソース検査を含む） |
| `pve_core_resource_parity.js` | 資源変化がPvEへ戻っているか |

ローカルサーバー（**ポートは5500に固定する**。後述）が要る検査：

```bash
cd prototype
node tools/parity/present_parity.js   # 演出（見え方）の一致。演出に触ったら必須
node tools/parity/anim_check.js       # アニメーション・VFXが実際に見えているか
node tools/parity/online_payload.js   # コアが読むフィールドの送信漏れ（サーバー不要）
node tools/parity/online_receivers.js # オンライン再生の受け口の欠落（サーバー不要）
node tools/parity/online_pipeline.js  # 編成→対戦要求→コアの受け渡し
node tools/parity/loop_parity.js      # PvEとコアの結果の一致（最終判定）
```

**オンライン側の不具合を調べるときは、まず `online_payload.js` と `online_receivers.js` を回すこと。**
過去に見つかった不具合（指輪の欠落・`_tripleMerged`・`baseAtk`／`baseMaxHp`・`fled` の受け口）は
すべてこの2つで機械的に検出できる形だった。

その他のツール（必要な時だけ）：
`board_parity.js`（魔導板→出撃の突き合わせ。**node では動かない**：ブラウザのコンソールでファイルの中身を評価してから `window.checkBoardParity()` を呼ぶ）／
`pointer_drag_check.js`（マウス操作だけでドラッグが成立するか）／`core_refactor_diff.js`（コアのリファクタ前後の差分）／
`layout_probe.js`（画面レイアウトの実測）／`headless.js`（ヘッドレスChromeの土台）／
`current_issues_check.js`（サイレン＋邪眼3枚＋大いなる守護＋三段攻撃など、既知の戦闘回帰）／
`c019_visual_check.js`（C019の可視弾頭の着弾位置と大きさ）／
`shop_ui_visual_check.js`（商店の固定ホバー・ボタン・価格・キャンセル操作の実測）。
`style_effect_audit.js`（CSSの宣言を画面状態ごとに1つずつ差し替え、効いていない宣言を洗い出す）。
**「効いていない」判定をそのまま削除の根拠にしないこと。** 監査が作っていない画面状態（戦闘開始・勝利・撤退のカットイン、
ゲームオーバー／クリアの魔導板など）でだけ効く宣言も「効いていない」に入る。2026-09-14 に `.battle-start-title{color:transparent}` と
ゲームオーバー魔導板見出しの文字サイズ・色を誤って消し、利用者報告で戻した。削除前に、その宣言のセレクタが表す画面を実際に出して見比べること。
`style_state_diff.js`（**CSSを消した後の確認用**。削除前の版を別ポートで配信し、同じ画面状態を両方で出して全要素の計算済みスタイルを比べる。
`VB_BASE_URL=http://127.0.0.1:5510/index.html VB_URL=http://127.0.0.1:5500/index.html`、`VB_ONLY=状態名`。
削除前の版は `git worktree add <dir> <commit>` で作り、`python3 -m http.server 5510` で配信する。
画面状態は style_effect_audit.js の一覧を共有し、カットイン・クリア画面・キーワード説明・商店価格・攻撃複製・ドラッグゴーストを足してある。
既知の意図的な差（色の統合の対応表・px整数化・equip→board の名前変更・カーソルの絵・アニメーション途中の光）はツール先頭の除外表にまとめる）。
`decl_effect_check.js`（**CSS宣言を消す前の確認用**。対象の要素が出る画面を作り、その宣言1つだけを CSSOM で外して計算値が変わるかを見る。
対象ごとに値（と @media 条件）を指定し、同じセレクタの別の規則は外さない。前の状態に依存する画面は `chain:true` で監査の状態を順に積み上げる。
判定は「効いている／効いていない（削除候補）／状態が作れていない／規則なし」。**「状態が作れていない」は残す**）。

`present_parity.js` は `VB_ONLY=シナリオ名` で1件だけ回せる（`|` 区切りで複数）。

### 検査を回す時の落とし穴

- **node側の検査とブラウザ側の検査ではデータ源が違う。**
  `tools/balance_sim/*` は `js/data/local_xlsx_data.js`（内蔵CSV）を読む。
  `tools/parity/*`（ヘッドレス）は **xlsxを直接**読む。
  xlsxを更新しても node 側の監査には反映されないので、
  「監査は通るのに実機で違う」時はまずこれを疑う。
  **`file://` で開いた実機も内蔵CSVを読む。** シートに列を足した（VFX/SE・マナ順位）のに
  内蔵CSVが古いままだと、その列の機能だけが実機で丸ごと効かない。
  シートを触ったら必ず `python3 tools/update_local_xlsx_data.py card enchant`（該当キー）を回し、
  `index.html` の `local_xlsx_data.js?v=` も上げること。
- **シートの列参照は必ず `tools/balance_sim/sheet_data.js` 経由**（ヘッダ名で引く）。
  列位置で読むと、既存列の前に1本挿しただけで別の列を効果文として読み、静かに無意味になる。
- **前のセッションのテストプロセスが残っていることがある。**
  ハングした `loop_parity` と残留Chrome（`vb-chrome-*`）がポートを掴んでいると、
  `present_parity` が実際とは関係のない失敗を出す。
  検査の前に `pgrep -f "loop_parity|vb-chrome-"` を見て、0でなければ落としてから測ること。
- `loop_parity` は `PANEL_POOL` からランダムに盤面を作る。
  **カードデータが変われば比較する盤面も変わる。** 昨日の件数と今日の件数は比較できない。
- `loop_parity` を触るときは、乱数（`coreMathRng` 自体を定数化して両方へ渡す）・
  `G.battleCounters` の初期化・1ケースごとのページ再読み込みを必ず守ること。守らないと
  「ルールが違う」ように見える差が出る。

### ヘッドレスChromeでの実測は、指示された時だけ行う

**既定は「推測で直して、すぐ報告する」。** 実測は時間がかかるため、
ユーザーが実測を指示した時、または原因が推測で絞れない時だけにする。
見た目・大きさ・尺の調整はユーザーが実機で見て判断するので、
こちらは変更点と**調整用のつまみ（定数名と現在値）**を報告すること。

以下は、実測を指示された場合の手順。

### アニメーション・見た目の検証方法

**Claudeのブラウザペインでは検証できない。** `document.hidden=true` のため `requestAnimationFrame` も
CSSトランジションも進まず、`_IS_CLAUDE_BROWSER_PREVIEW` で音声も無効化される。

**ヘッドレスChrome** を使う（追加インストール不要。Chrome本体とNode標準の `WebSocket`/`fetch` だけ）。
`tools/parity/headless.js` の `launch()` → `goto()` / `eval()` / `screenshot()` / `consoleErrors()` / `close()`。
一時プロファイルで起動するのでユーザーのChromeのデータには触らない。
`--autoplay-policy=no-user-gesture-required` と `--mute-audio` 付きなので自動再生経路も再現できる。

**できないこと**：実際に耳で聞く音、人間が見たときの印象。

**開発時のローカルサーバーはポート5500に固定すること。** Chromeの自動再生許可（Media Engagement Index）は
**オリジン単位**で、ポートが違えば別オリジンとして扱われ、実績のないポートでは `audio.play()` が拒否される。

### 自動テストの通過を「直った」と書かないこと

実機で見ていない項目は「未確認」と明記する。

---
