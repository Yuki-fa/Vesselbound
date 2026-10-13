# 第2段 検査結果 2026-10-09

STATUS：CONTINUE。コード・接続の検査は成功。撮影画像による品質確認と、保留した内部sprite 2層の置換が残る。

## 成功した検査

| 項目 | 結果 |
|---|---|
| 変更したJS/CJS | 29本すべてnode --check成功 |
| 定義の書き出し | 82効果・792層・24図形・12部品型。許可リスト・JSONリテラル・式/構文木なし・JSON往復成功。759113 bytes |
| 新しい32種 | 全件分類・参考8コマ・尺/合図・9時刻・有限値・決定性・追従・個別rotate/scale・祖先のフェード・描画時のalpha・2周目・後片付け・不正入力の拒否 |
| 第1段の50種 | 尺・命中・9時刻・5速度・状態値8段階の回帰検査成功 |
| 旧版とのCanvas照合 | 5d9e1d2と50種×8時刻でCanvas命令・生成画像ハッシュ・仮DOM適用値が一致。TRACE_OK 50/50 |
| 戦闘への接続 | 既存41演出＋第2段11シナリオ。コア→共通presenter→共通描画入口をPvE・保存再生・オンラインで検査 |
| オンライン | payload：コア73フィールド／送信78フィールド、NG 0。receivers：NG 0 |
| LAB・全カード | 367カード、112配置。台帳更新・古さ検出・検索/分類・定義と元番号の対応成功 |
| LAB実JSのNode実行 | 77有限演出＋5状態、反対陣営7、追加6、SE資源59（採用39）。完走・停止・再描画・読み込みへの非依存・verify起動条件成功 |
| 撮影/比較道具 | 時計・seed・CSS・load待機・静止コマ・file://・一覧txt・32件の参考比較・不正時刻の拒否成功 |
| Python | extract_refs.py / ref_compare.pyの構文成功 |
| キャッシュ | index.htmlとtools/vfx_preview.htmlの変更JSに対応する20参照をvfx-webp1009-2へ更新 |
| 差分 | git diff --check成功。core.js・既存50種の定義/図形/手続き素材・内蔵CSV・docs/・AGENTS.md・元素材に差分なし |

## balance_simの全Node検査（23本）

| 検査 | 結果 |
|---|---|
| attack_summon_regression.js | 成功 |
| battle_carry_order_regression.js | 成功 |
| battle_event_regression.js | 成功 |
| battle_state_init_regression.js | 成功 |
| battle_state_vfx_regression.js | 成功 |
| card_core_smoke.js | 成功 |
| damage_metrics_regression.js | 成功 |
| deep_level_regression.js | 成功 |
| defeat_retry_regression.js | 成功 |
| effect_audit.js | 成功 |
| effect_value_audit.js | 成功 |
| id_reference_audit.js | 成功 |
| kenzoku_regression.js | 成功 |
| offline_online_regression.js | 成功 |
| permanent_damage_regression.js | 成功 |
| quest_q001_regression.js | 成功 |
| quest_q008_regression.js | 成功 |
| silence_scroll_check.js | 成功 |
| selftest.js | 成功 |
| pve_core_resource_parity.js | 成功 |
| lab_vfx_regression.js | 成功 |
| vfx_data_regression.js | 成功 |
| vfx_webp_regression.js | 成功 |

run.jsもN=1の短いシミュレーションで全カードとselftestを確認した。ai/load/sheet_data/sim/stubは検査ではなく、検査・run.jsから読む共有モジュール。

## 構文検査した変更ファイル

- assets.js
- js/battle/present.js
- js/engine/battle.js
- js/engine/map.js
- js/engine/render.js
- js/vfx/defs/webp.js
- js/vfx/defs/webp_geometry.js
- js/vfx/renderer.js
- js/vfx/schema.js
- tools/balance_sim/kenzoku_regression.js
- tools/balance_sim/lab_vfx_regression.js
- tools/balance_sim/vfx_data_regression.js
- tools/balance_sim/vfx_webp_regression.js
- tools/parity/anim_check.js
- tools/parity/c019_visual_check.js
- tools/parity/lab_vfx_fixtures.js
- tools/vfx_capture/capture.js
- tools/vfx_capture/check.js
- tools/vfx_capture/trace_compare.js
- tools/vfx_export.js
- tools/vfx_preview/cards.js
- tools/vfx_preview/cards_check.cjs
- tools/vfx_preview/cards_dom.cjs
- tools/vfx_preview/cards_model.js
- tools/vfx_preview/cards_routes.js
- tools/vfx_preview/cards_runtime_check.cjs
- tools/vfx_preview/cards_scan.cjs
- tools/vfx_preview/catalog.js
- tools/vfx_preview/preview.js

## 未実行・未確認

- Chromeの撮影起動は「Chromeへ接続できない」で失敗。capture.jsonはstatus=unexecuted、撮影画像0件。Chromeによる本体/LABの検査は未実行。
- 新しい32効果の品質・白飛び・カード視認性・動き・SEの聴感は実画面未確認。
- 旧50種のRGB比較・CSS・sprite・全比較画像の目視は未確認。TRACE_OKは画素一致を証明しない。
- textures.js:107にappearance_sheet.webpとK009.webpの2参照が残る。direwolf／meteor-scrollの既存の絵を変えないため内部2層を保持した。全WebP除去は未完了。

対象と保留理由はWEBP_TARGETS.md、効果ごとの目視判定はREVIEW_WEBP_20261009_01.mdを参照。素材の削除・コミットは行っていない。
