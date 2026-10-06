# ゲームとVFX LABの配置比較

3840×2160のゲーム内座標。幅260×高さ395、前衛最大7枠。数値は現在のindex.htmlの最終CSSとrenderFieldの計算から採取。

| 項目 | ゲーム | LAB |
|---|---:|---:|
| 画面 | 3840×2160 | 3840×2160 |
| カード | 260×395 | 260×395 |
| カード間隔 | 24 | 24 |
| 戦闘フィールド | 1964×814 | 1964×814 |
| 背景位置 | center bottom | center bottom |
| 敵後衛 上端 | 114 | 114 |
| 敵前衛 上端 | 533 | 533 |
| 味方前衛 上端 | 1233 | 1233 |
| 味方後衛 上端 | 1652 | 1652 |
| 前衛3枚 左端X | 1506 / 1790 / 2074 | 1506 / 1790 / 2074 |
| 後衛2枚 左端X | 1648 / 1932 | 1648 / 1932 |
| ATK 左 | 5% | 5% |
| HP 右 | 6% | 6% |
| 能力値 下 | 3.95% | 3.95% |
| 能力値 幅／文字サイズ | 72 / 66 | 72 / 66 |

左右の計算はrender.jsの`_unitX`を実行し、前衛／後衛それぞれ1〜7枚・両陣営の計112配置で差分0。人数が少ない列は行ごとに中央へ詰める。召喚前は3枚、召喚表示の時に発生元陣営の前衛を4枚の並びへ詰める。再再生の4→3枚も、VFXの座標取得前に同期する（`cards_runtime_check.cjs --layout-only`で確認）。

## VFXの寸法

- 通常素材：`.damage-vfx-host .vfx-hit-video`の幅460%、高さauto。`presentCharacterVfxScale`とimgの実transformを適用。例：通常命中1196px、K003/S008は598px、C019_1は74.75px。
- C008は専用の100%×100%画像へ倍率2をかけるので520×790px。復活K020は幅598px、Xはカード幅の-12%。
- マナ回復は`playManaGainVfx`のmax(8, 64, カード幅×.55)から143×143px。初期Yは中心からカード高×-.18、上昇量はカード高×.35。
- 貫通K007はカード幅×1.1＝286px。三方向K008は実対象列の幅×3、絵の幅×-.2だけXをずらす（前衛3枚で2484px）。全体K009はフィールド幅1964×4.6×.2875＝2597.39px。
- 結界はportraitと同じ幅87.68%・高さ92.85%・top3.58%。封印解除／特殊マスは`playSpecialProductionVfx`のhostとobject-fitを採取する。
- LAB演出は本体と同じカード矩形をVbFxへ渡す。大きさ1.0×が既定で、描画内部は変更しない。現行の移動・逆再生・関数だけの描画は近似の表示を維持する。

## 再生と検査

- 現行再生は画像のdecode完了と最初の描画後に時計を始め、ゲームの尺とAnimated WebPのANMF全フレーム合計の長い方を表示。WebP画像はCSSで早送りできないため、速さを上げても素材1周を切らない。常時素材は明示停止まで残す。
- `VbFxCards.history()`に読み込み開始、描画開始、予定尺、完了時刻、経過時間、完了／停止／失敗、寸法を記録する。
- `node tools/vfx_preview/cards_check.cjs`で一覧・寸法・配置、`node tools/vfx_preview/cards_runtime_check.cjs`で実JSの完了・停止・検査起動を確認する。NodeのCanvas代替は画素・聴感の確認をしない。
- 実ブラウザ検査は`tools/vfx_preview.html?verify=1`のみ。通常URLに結果パネルは出ない。件数はfx_lab.jsとse_catalog.jsの現在値から計算する。

## 停止の原因と修正

- `fx_lab.js`で`cancelled:true`を返すのは`stopAll()`経由だけ。重い描画・rAF停止の番人は`cancelled:false`で完了し、描画例外はrejectする。
- タブ切替→`VbFxCards.stop()`→`VbFxPreview.stop()`→`VbFx.stopAll()`で魔族の魂がキャンセルされる経路を、実JSで再現した。検査と通常操作が同じ再生を共有していた。報告された過去の停止の具体的な呼び出し元は、元のログに記録がないため特定できない。
- 検査は全画面の初期化後に明示起動し、通常操作・タブ操作・検査の二重起動を止める。検査中のstopAllに、演出名・想定した停止かどうか・呼び出しスタックを記録する。既存のSE同期と状態重ね表示のコードは開始時と同一。
- 現行素材はsrc設定直後から終了タイマーが進み、読み込み時間や素材1周が従来の指定尺を越えた分が切られていた。画像decode／最初の描画を待ち、素材1周の全尺を確保。連続比較も、SEを次の経路の開始で切らない。
- 既定は自分の番号・シートのVFX/SE指定番号の専用素材、無ければ実経路の先頭。連続比較は選択した時だけ実行する。

## 今回の変更ファイル

- tools/vfx_preview.html
- tools/vfx_preview/preview.js、preview.css、check.js、check_headless.js
- tools/vfx_preview/cards.js、cards.css、cards_model.js、cards_routes.js、cards_scan.cjs、cards_check.cjs
- tools/vfx_preview/cards_geometry.js、cards_geometry.cjs、cards_dom.cjs、cards_runtime_check.cjs（新規）
- tools/vfx_preview/cards_layout_report.md（新規）、cards_report.md

Nodeの全件検査：通常44演出＋常時5状態、反対陣営7、追加6、SE68（採用済み33）。構文検査12本、一覧365行、配置112例、固有既定、遅い読み込み、途中停止の再現／排他／停止元の記録、状態の継続が通過。

画面・聴感・file/httpの実ブラウザ確認は未実行。ヘッドレスChromeへ接続できなかった（check_headless.jsの結果は/private/tmp/vb_vfx_qa_followup/headless_results.json）。
