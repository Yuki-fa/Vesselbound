# Node検査結果 / VFX21 / 2026-10-12指定

Chrome検査第1回のpresent_parity・LAB1012の21件NGを、計測区間の非対称と特定して検査道具を修正。Chrome用の同じスクリプトで修正前の失敗をNode再現し、修正後21種の一致と余分なVFX／SEの検出を確認した。最終的にtools/balance_sim全38本、online_payload／online_receivers、初回からの変更JS/CJS30本の構文検査、git diff --checkが成功。修正後Chrome本体の検査は接続不可で未完了。最新は末尾の「Chrome検査第1回」。画像判定と過去の検査は各回当時の記録。

| 検査 | 結果 |
|---|---|
| `tools/balance_sim/attack_lifecycle_1010_regression.js` | PASS |
| `tools/balance_sim/attack_order_1010_regression.js` | PASS |
| `tools/balance_sim/attack_summon_regression.js` | PASS |
| `tools/balance_sim/battle_carry_order_regression.js` | PASS |
| `tools/balance_sim/battle_event_regression.js` | PASS |
| `tools/balance_sim/battle_state_init_regression.js` | PASS |
| `tools/balance_sim/battle_state_vfx_regression.js` | PASS |
| `tools/balance_sim/card_core_smoke.js` | PASS |
| `tools/balance_sim/damage_metrics_regression.js` | PASS |
| `tools/balance_sim/damage_shake_1011_regression.js` | PASS |
| `tools/balance_sim/damage_shake_observer_1011_regression.js` | PASS |
| `tools/balance_sim/death_1011_regression.js` | PASS |
| `tools/balance_sim/deep_level_regression.js` | PASS |
| `tools/balance_sim/defeat_retry_regression.js` | PASS |
| `tools/balance_sim/dina_rescue_regression.js` | PASS |
| `tools/balance_sim/effect_audit.js` | PASS |
| `tools/balance_sim/effect_text_1010_regression.js` | PASS |
| `tools/balance_sim/effect_value_audit.js` | PASS |
| `tools/balance_sim/guts_state_1010_regression.js` | PASS |
| `tools/balance_sim/id_reference_audit.js` | PASS |
| `tools/balance_sim/kenzoku_regression.js` | PASS |
| `tools/balance_sim/keyword_refs_1012_regression.js` | PASS |
| `tools/balance_sim/lab_vfx_regression.js` | PASS |
| `tools/balance_sim/merge_effects_1012_regression.js` | PASS |
| `tools/balance_sim/merge_ui_1012_regression.js` | PASS |
| `tools/balance_sim/offline_online_regression.js` | PASS |
| `tools/balance_sim/permanent_damage_regression.js` | PASS |
| `tools/balance_sim/quest_q001_regression.js` | PASS |
| `tools/balance_sim/quest_q008_regression.js` | PASS |
| `tools/balance_sim/revive_extra_attack_1012_regression.js` | PASS |
| `tools/balance_sim/selftest.js` | PASS |
| `tools/balance_sim/silence_scroll_check.js` | PASS |
| `tools/balance_sim/skilled_1012_regression.js` | PASS |
| `tools/balance_sim/ui_library_1011_regression.js` | PASS |
| `tools/balance_sim/vfx_1012_regression.js` | PASS |
| `tools/balance_sim/vfx_data_regression.js` | PASS |
| `tools/balance_sim/vfx_webp_regression.js` | PASS |
| `tools/balance_sim/pve_core_resource_parity.js` | PASS |

追加確認：online_payload / online_receivers / vfx_export / vfx_capture/check / cards_scan --check / cards_check / 変更JS/CJS29本の node --check / git diff --check：PASS。

既存82種の定義・3速さ×8時刻の描画命令一致、新21種の3速さ×16時刻と脈動の実フレーム通知・復元・SE63個のPCM形式/尺/peak/末尾フェード：PASS。

通常PvE・保存再生・オンラインの実体イベントによる呼び出し一致：PASS。C094は開戦済みの体への再発火が既存コアで抑止される経路を別に再現。詳細は IMPLEMENTATION_1012.md。

第1回の新13種全104コマと旧82種の差のある全7コマを拡大目視済み。5種の修正後・未撮影8種・旧82種の厳密画素一致は未確認。Chrome検査：未実行。STATUSはCONTINUE。

## 第1回撮影修正後の検査 / 2026-10-13

- 上記38本を全て再実行して38/38成功。vfx_data_regression は時間制限を設けず243.99秒で完走、vfx_1012_regression は129.36秒で完走。
- 既存82種の定義4ファイル完全一致、3速さ（1.5/3/4.5）×8時刻のCanvas命令完全一致：PASS。
- 新21種の3速さ×16時刻・有限数・描画・残像の除去・復元・実フレーム通知・SE契約：PASS。
- 追加した第1回の回帰検査（対象の2色がニンフの光線に届く、花弁の外形が描画倍率へ追従する、亡霊波が最初の撮影間隔で近隣カードに残る）：PASS。
- lab_vfx_regression の実体イベントによる通常PvE・保存再生・オンラインの発生元・対象・回数・順序・条件外の一致：PASS。
- online_payload：コア73／送信78フィールド、NG 0。online_receivers：NG 0。
- vfx_export：102定義・884層・38図形・12部品型、567670 bytes、許可リスト・JSON往復：PASS。
- 撮影道具のNode検査：PASS。静止JPEG/PNGだけの層、WebPとの混在と画像indexの保持、読み込み・デコード待機、未知WebPの拒否、既存の固定コマ更新を確認。一時参照PNGを /private/tmp へ抽出して供給し、プロジェクトの一時リンクは全て除去。
- cards_scan --check は本体index.htmlの指紋が古いため初回失敗。台帳を再生成して再実行しPASS。再生成前後の全369件の経路・SE・配置・件数は同じで、差はindex.htmlの指紋だけ。cards_check：PASS。
- 今回変更JS/CJS 6本の node --check、git diff --check、禁止対象・旧82定義・既存assetsの差分なし、一時リンクなし：PASS。
- Chrome検査・修正後撮影・SE聴感は未実行／未確認。新規の同じ21行の一覧で再撮影できる状態。STATUSはCONTINUE、コミットなし。

## 第2回撮影修正後の検査 / 2026-10-14

- 上表のtools/balance_sim全38本を再実行、38/38成功。vfx_1012_regressionは134.32秒、vfx_data_regressionは253.04秒で完走（時間制限による打切り無し）。
- 旧82種の定義4ファイル、3速さ×8時刻のCanvas命令と尺が作業前に完全一致：PASS。画素比較の成功とは分ける。
- 新21種の3速さ×16時刻・有限数・描画・復元・残像除去、追加した実個数1/2/3/5・全脈動の谷と発光・突進の命中時の位置と復帰（3速さ）：PASS。
- lab_vfx_regression：21種の実体イベントで通常PvE／保存再生／オンラインの発生元・対象・回数・順序が一致。発光だけの抑止、13不発条件、実対象・重複・反復・色数・血滴・直列接続・接触同期：PASS。作業前コアとの21ケースの結果は演出用メタデータを除いて完全一致。
- online_payload：コア73／送信78フィールド、NG 0。online_receivers：NG 0。
- vfx_export：102定義・884層・39図形・12部品型、569730 bytes。許可リスト・リテラル・JSON往復・1MB上限：PASS。
- SE63件の既存登録保持・元素材重複なし・ボイス名除外・PCM48kHz/16bit・最長1.95秒・-1dBFS・peak・末尾30msフェード・仮コピー21件：PASS。元素材63件の実在とREADME21行・各理由・ADOPTED仮21件も確認。
- 全カード台帳を再生成してcards_scan --check / cards_check：PASS。369件・LAB85割当。再生成前後の差はindex.htmlの指紋だけで、全経路・SE・配置は完全一致。
- vfx_capture/check.js：PASS（Chrome撮影は未実行）。静止JPEG/PNGとWebPの混在・読み込み待機・時計・seed・file://・比較入力を確認。一時参照リンク256個はfinallyで全て除去。
- 初回制作からの変更JS/CJS30本のnode --check、git diff --check：PASS。今回変更したJS7本も対象に含む。docs/・AGENTS.md・シート・local_xlsx_data.js・既存assets・旧82定義の今回差分なし。
- 第2回の新21種全168コマと、旧82種の前後全656コマをカード周囲で切り出し2倍で目視。旧10種の全11差分コマも前後・差分強調・静止画素8倍で目視。数値目安82/82、RGB完全一致72/82種・645/656コマ、厳密一致は未達。
- 修正後9種の写真・実戦の後続演出・SE聴感は未確認。Chromeのlab_vfx_check / present_parity / anim_check / online_pipeline / current_issues_checkは未実行。STATUSはCONTINUE、コミットなし。

## 第3回撮影修正後の検査 / 2026-10-14

- 上表のtools/balance_sim全38本を再実行、38/38成功。vfx_1012_regressionは136.60秒、vfx_data_regressionは246.79秒で完走。打切り無し。
- 旧82種の定義4ファイル、3速さ（1.5/3/4.5）×8時刻のCanvas命令と尺は作業前に完全一致：PASS。画素一致の判定とは区別する。
- 新21種の3速さ×16時刻、実個数1/2/3/5、全脈動の谷と発光、実フレーム通知、突進の命中位置、残像・styleの除去と復元、SE契約：PASS。
- 第3回追加の回帰：ミノタウロスが同じ親の敵カードより前へ出る表示順と終了後復元、羊・インキュバスの開始時の縦長マスク全48×48セルとmask-image／mask-size復元（3速さ）：PASS。
- lab_vfx_regression：21発動、発光だけの抑止、13不発条件、実対象・重複・反復・色数・血滴、既存状態への直列接続・接触同期、通常PvE／保存再生／オンライン同一呼出し：PASS。作業前コアとの21ケースの結果は演出用メタデータ以外完全一致。今回コア・受け口の変更は無し。
- online_payload：コア73／送信78フィールド、NG 0。online_receivers：NG 0。
- vfx_export：102定義・888層・39図形・12部品型、573400 bytes。許可リスト・リテラル・JSON往復・1MB上限：PASS。公開項目103。
- SE63候補：元ファイル63件の実在、相互・既存候補・採用素材とのファイル名重複無し、READMEの全元素材・理由と21行、ADOPTEDの仮節の21行、候補1とゲーム用コピー21件の全バイト一致：PASS。48kHz/PCM16・最長1.95秒・実測-1.000152dBFS・登録peakの誤差0.00000050秒以下・末尾30msフェード・最終サンプル0：PASS。聴感は未確認。
- cards_scan --check / cards_check.cjs：PASS。369件・LAB85割当。再生成前後の差はindex.htmlの指紋だけで、全経路・SE・配置は完全一致。
- vfx_capture/check.js：PASS（Chrome撮影は未実行）。参照PNGを/private/tmpから一時リンク256個で供給し、finallyで全て除去。静止JPEG/PNGとWebP混在・読み込み待機・時計・seed・file://・比較入力を確認。
- 初回からの変更JS/CJS30本のnode --check、今回変更のJS6本も包含：PASS。git diff --check：PASS。
- 新規の変更は6種とrobed-silhouetteだけ、他の新15種と全尺は同じ：PASS。旧82定義は初回作業前とバイト一致。既存assetsの変更無し（初回からの差分は新規WAV21個のみ）。docs/・AGENTS.md・シート・local_xlsx_data.jsに今回の差分無し。
- index.htmlの?v=変更はschema／characters_1012／rendererのみ。LABはその3本＋catalog／cards_routesのみ。変更理由は2026-10-12指定付きのコメントに記載。new_targets_1012.txtは21行のまま。
- 第3回の新21種全168コマと旧82種の前後全656コマをカード周囲で切り出し2倍へ拡大して目視。全15差分コマも前後・24倍差分・最大点8倍で追加目視。数値目安82/82、RGB完全一致69/82種・641/656コマ。厳密画素一致は未達。
- 修正後6種のChrome撮影をfile://で試行したが「Chromeへ接続できない」で終了。修正後の写真0。lab_vfx_check / present_parity / anim_check / online_pipeline / current_issues_checkは未実行。
- 修正後6種・旧82の再比較・実戦の後続／高速描画・SE聴感は未確認。STATUS.txtはCONTINUE。コミット無し。

## 第4回撮影確認後の検査 / 2026-10-14

- 以下38本を全て実行して38/38成功。中断前に37本が完了しており、残るvfx_data_regressionだけを再開後に最後まで実行した。検査成功を画素一致やChrome確認とは扱わない。

| Node検査 | 終了コード | 秒 |
|---|---|---|
| `tools/balance_sim/attack_lifecycle_1010_regression.js` | 0（PASS） | 0.24 |
| `tools/balance_sim/attack_order_1010_regression.js` | 0（PASS） | 0.07 |
| `tools/balance_sim/attack_summon_regression.js` | 0（PASS） | 2.11 |
| `tools/balance_sim/battle_carry_order_regression.js` | 0（PASS） | 0.32 |
| `tools/balance_sim/battle_event_regression.js` | 0（PASS） | 0.15 |
| `tools/balance_sim/battle_state_init_regression.js` | 0（PASS） | 0.20 |
| `tools/balance_sim/battle_state_vfx_regression.js` | 0（PASS） | 2.59 |
| `tools/balance_sim/card_core_smoke.js` | 0（PASS） | 0.22 |
| `tools/balance_sim/damage_metrics_regression.js` | 0（PASS） | 0.23 |
| `tools/balance_sim/damage_shake_1011_regression.js` | 0（PASS） | 0.25 |
| `tools/balance_sim/damage_shake_observer_1011_regression.js` | 0（PASS） | 0.03 |
| `tools/balance_sim/death_1011_regression.js` | 0（PASS） | 0.40 |
| `tools/balance_sim/deep_level_regression.js` | 0（PASS） | 0.32 |
| `tools/balance_sim/defeat_retry_regression.js` | 0（PASS） | 0.38 |
| `tools/balance_sim/dina_rescue_regression.js` | 0（PASS） | 0.21 |
| `tools/balance_sim/effect_audit.js` | 0（PASS） | 0.17 |
| `tools/balance_sim/effect_text_1010_regression.js` | 0（PASS） | 0.23 |
| `tools/balance_sim/effect_value_audit.js` | 0（PASS） | 0.12 |
| `tools/balance_sim/guts_state_1010_regression.js` | 0（PASS） | 0.34 |
| `tools/balance_sim/id_reference_audit.js` | 0（PASS） | 0.08 |
| `tools/balance_sim/kenzoku_regression.js` | 0（PASS） | 0.54 |
| `tools/balance_sim/keyword_refs_1012_regression.js` | 0（PASS） | 0.25 |
| `tools/balance_sim/lab_vfx_regression.js` | 0（PASS） | 12.19 |
| `tools/balance_sim/merge_effects_1012_regression.js` | 0（PASS） | 0.84 |
| `tools/balance_sim/merge_ui_1012_regression.js` | 0（PASS） | 0.24 |
| `tools/balance_sim/offline_online_regression.js` | 0（PASS） | 0.20 |
| `tools/balance_sim/permanent_damage_regression.js` | 0（PASS） | 0.30 |
| `tools/balance_sim/pve_core_resource_parity.js` | 0（PASS） | 0.04 |
| `tools/balance_sim/quest_q001_regression.js` | 0（PASS） | 0.32 |
| `tools/balance_sim/quest_q008_regression.js` | 0（PASS） | 0.28 |
| `tools/balance_sim/revive_extra_attack_1012_regression.js` | 0（PASS） | 0.22 |
| `tools/balance_sim/selftest.js` | 0（PASS） | 0.34 |
| `tools/balance_sim/silence_scroll_check.js` | 0（PASS） | 0.69 |
| `tools/balance_sim/skilled_1012_regression.js` | 0（PASS） | 0.25 |
| `tools/balance_sim/ui_library_1011_regression.js` | 0（PASS） | 0.20 |
| `tools/balance_sim/vfx_1012_regression.js` | 0（PASS） | 135.26 |
| `tools/balance_sim/vfx_data_regression.js` | 0（PASS） | 238.36 |
| `tools/balance_sim/vfx_webp_regression.js` | 0（PASS） | 14.74 |

- lab_vfx_regression：新21種の実体イベントによる通常PvE・保存再生・オンラインの発生元・対象・回数・順序・SE一致。発光だけの抑止、13不発条件、実対象・重複・反復・色数・血滴、ミノタウロス直列・接触同期：PASS。作業前コアとの21ケースは追加した演出メタデータ以外完全一致。C094の既存の抑止経路は制作報告に分けて記録。
- vfx_1012_regression：20定義＋共有派生1、新21種の3速さ×16時刻、実個数1/2/3/5、脈動・命中・復元・残像除去、ミノタウロスの接触時の表示順と復帰、羊／撃破体の開始マスク全48×48セルと終了後復元：PASS。
- 旧82種の定義4ファイルは初回作業前097927f8332c7a55701eaa82aebc7b2177d17016と全バイト一致。3速さ×8時刻のCanvas命令と尺も完全一致：PASS。写真のRGB判定は別。
- vfx_data_regression：50効果の9時刻・5速さ、5状態の値8段階、許可リスト拒否、新しい宣言的表現、JSONの往復と1MB上限：PASS。公開103項目、JSON102定義・888層・39図形・12部品型、573400 bytes。JSON出力は再生成していない。

| 追加検査 | 結果 | 秒 |
|---|---|---|
| `tools/parity/online_payload.js` | PASS | 0.03 |
| `tools/parity/online_receivers.js` | PASS | 0.03 |
| `tools/vfx_preview/cards_scan.cjs --check` | PASS | 2.84 |
| `tools/vfx_preview/cards_check.cjs` | PASS | 0.34 |
| `tools/vfx_capture/check.js` | PASS（Chrome未実行） | 11.55 |

- online_payload：コア73フィールド／送信78フィールド、NG 0。online_receivers：NG 0。
- cards_scan --check / cards_check：369件、LAB85割当、番号・経路・素材・台帳の古さ・全フィルタ：PASS。台帳とHTMLは変更していない。
- vfx_capture/check：時計・seed・RAF・CSS・静止JPEG/PNGとWebPの混在・load待機・未配信の静止コマ・元WebP抽出・別ポート・file://・PNG数値・一覧txt・参考32効果・時刻誤りの拒否：PASS。既存の一時参照PNGを/private/tmpから供給するリンク256個はfinallyで全て除去。Chromeを起動する検査ではない。
- SE：63件の原音実在／重複無し／ボイス名除外／README21行と理由／ADOPTED仮21行、manifestとse_catalog一致、登録hash、PCM48kHz/16bit、最長1.95秒、実測-1.000152dBFS、登録peak誤差最大0.00000050秒、最後のサンプル0、候補1のゲーム用21コピー全バイト一致：PASS。頭の連続した0は最大1.521ms。30ms末尾フェードとゲームpeak同期はvfx_1012_regressionでPASS。聴感は未確認。
- 初回制作からの変更JS/CJS30本のnode --check：30/30 PASS。git diff --check：PASS。今回新たなJS変更は無し。
- docs/・AGENTS.md・Vesselbound_data.xlsx・local_xlsx_data.jsと旧82定義の変更無し、初回からのassets差分は新規SE21個だけ、既存assets変更無し：PASS。作業ブランチvfx-1012、HEAD 623cb31の既存変更を保持。コミット無し。
- 写真：第4回の新21種全168コマ・旧82種前後全656コマをカード周囲で切り出し2倍に拡大して目視。7種の差分8コマも24倍差分・最大点8倍で追加目視。新21種の固有部分の追加修正不要、前回6種の改善を確認。旧の数値目安82/82、RGB完全一致75/82種・648/656コマ、厳密一致は未達。
- 静止基準画像の追加切り分け：79/82枚がRGB完全一致。3枚の前後・差分と最大点も拡大目視。未発射時の静止画素や能力値丸枠にも差があるため撮影／DOMの揺れが疑われるが、Chrome再現は未実行。比較入力や基準を変更していない。
- Chromeのlab_vfx_check / present_parity / anim_check / online_pipeline / current_issues_check：未実行。実戦の後続演出・高速描画・SE聴感は未確認。STATUSはCONTINUE。

## 第5回撮影確認後の検査 / 2026-10-14

以下の全38本を実行し38/38成功。既存コードを変更せず、新規の描画・個数・命中・復元と旧82種の描画命令を再確認した。検査成功をChrome確認や画素一致に置き換えない。

| Node検査（tools/balance_sim/） | 結果 | 秒 |
|---|---|---:|
| `attack_order_1010_regression.js` | PASS | 0.06 |
| `attack_lifecycle_1010_regression.js` | PASS | 0.24 |
| `battle_carry_order_regression.js` | PASS | 0.31 |
| `battle_event_regression.js` | PASS | 0.14 |
| `battle_state_init_regression.js` | PASS | 0.20 |
| `attack_summon_regression.js` | PASS | 2.13 |
| `card_core_smoke.js` | PASS | 0.20 |
| `damage_metrics_regression.js` | PASS | 0.21 |
| `damage_shake_1011_regression.js` | PASS | 0.24 |
| `damage_shake_observer_1011_regression.js` | PASS | 0.03 |
| `death_1011_regression.js` | PASS | 0.39 |
| `battle_state_vfx_regression.js` | PASS | 2.54 |
| `deep_level_regression.js` | PASS | 0.31 |
| `dina_rescue_regression.js` | PASS | 0.20 |
| `defeat_retry_regression.js` | PASS | 0.36 |
| `effect_audit.js` | PASS | 0.16 |
| `effect_text_1010_regression.js` | PASS | 0.22 |
| `effect_value_audit.js` | PASS | 0.12 |
| `id_reference_audit.js` | PASS | 0.08 |
| `guts_state_1010_regression.js` | PASS | 0.34 |
| `keyword_refs_1012_regression.js` | PASS | 0.24 |
| `kenzoku_regression.js` | PASS | 0.54 |
| `merge_effects_1012_regression.js` | PASS | 0.82 |
| `merge_ui_1012_regression.js` | PASS | 0.24 |
| `offline_online_regression.js` | PASS | 0.20 |
| `permanent_damage_regression.js` | PASS | 0.29 |
| `quest_q001_regression.js` | PASS | 0.30 |
| `quest_q008_regression.js` | PASS | 0.27 |
| `revive_extra_attack_1012_regression.js` | PASS | 0.21 |
| `selftest.js` | PASS | 0.33 |
| `silence_scroll_check.js` | PASS | 0.68 |
| `skilled_1012_regression.js` | PASS | 0.25 |
| `ui_library_1011_regression.js` | PASS | 0.20 |
| `lab_vfx_regression.js` | PASS | 12.15 |
| `vfx_1012_regression.js` | PASS | 133.59 |
| `vfx_webp_regression.js` | PASS | 14.43 |
| `pve_core_resource_parity.js` | PASS | 0.04 |
| `vfx_data_regression.js` | PASS | 239.16 |

- lab_vfx_regression：新21種の実体イベントで通常PvE／保存再生／オンラインの発生元・対象・回数・順序・SEが一致。発光だけの抑止、13不発条件、実対象・重複・反復・色数・血滴、ミノタウロスの直列と接触同期：PASS。作業前コアとの21ケースは演出用メタデータ以外完全一致。C094の通常開戦後の既存抑止経路は未修正。
- vfx_1012_regression：新21種の3速さ×16時刻・有限数・描画・復元・残像除去、光球／花弁／血滴の実個数1/2/3/5、脈動の谷と発光、実フレーム通知、突進の命中位置・表示順と終了後復元、縦長の溶解マスク全セルと復元、SE契約：PASS。旧82定義4ファイルと3速さ×8時刻のCanvas命令・尺の作業前一致：PASS。
- vfx_data_regression：50効果の9時刻・5速さ、5状態の値8段階、許可リスト拒否、宣言的部品・JSON往復・1MB上限：PASS。公開103項目、JSON102定義・888層・39図形・12部品型、573400 bytes。再生成不要でJSONは保持。

| 追加検査 | 結果 |
|---|---|
| `node tools/parity/online_payload.js` | PASS（コア73／送信78フィールド・NG 0） |
| `node tools/parity/online_receivers.js` | PASS（NG 0） |
| `node tools/vfx_preview/cards_scan.cjs --check` | PASS（369経路） |
| `node tools/vfx_preview/cards_check.cjs` | PASS（369件・LAB85割当・サイズ／配置112件） |
| `node tools/vfx_capture/check.js` | PASS（11.46秒・Chrome未実行） |
| 初回制作からの変更JS/CJSへ `node --check` | PASS（30/30本） |
| `git diff --check` | PASS |

- cards_scanの永久ダメージ書き戻し警告2件（panel_sheet_E075・slot 7・damage 11）は既存fixture由来。コマンドはexit 0。最初に台帳検査のパスをtools直下へ誤指定してMODULE_NOT_FOUNDになった2件は、上記の実在するtools/vfx_preview内へ直して成功。検査本体の失敗としては数えない。
- vfx_capture/checkの一時参照PNGリンク256個はfinallyで全て除去し、残り0。時計・seed・RAF・CSS・静止JPEG/PNGとWebP混在・load待機・未配信静止コマ・元WebP抽出・別ポート・file://・PNG比較・一覧txt・参考32効果・時刻誤り拒否を検査。Chromeを起動する検査ではない。
- SE63候補：全原音実在・指定素材フォルダ内・相互／既存候補／採用素材との名前重複無し・ボイス名除外・README21行と各理由・ADOPTED仮21行・manifest／se_catalog一致・登録hash一致：PASS。48kHz/PCM16・最長1.95秒・実測-1.000152dBFS・登録peak誤差最大0.00000050秒・末尾30msフェード・最終サンプル0・ゲームpeak同期：PASS。先頭の連続した0は最大1.521ms。仮コピー21件は候補1と全バイト一致。聴感は未確認。
- 保護対象と旧82定義4ファイルの差分無し。初回作業前からのassets差分は新規WAV21個だけで既存assetsの変更無し。new_targetsは21行・一意で、SEの21効果一覧と一致。ブランチvfx-1012、作業開始時HEAD 6d2649bは保持。今回コミット無し。
- 第5回写真：新21種全168コマ、旧82種前後全656コマをカード周囲で切出し・2倍に拡大して目視。差分9コマも前後・差分24倍・最大点8倍で全て追加目視。新21種は追加修正不要、旧は演出の形の変化無し。数値目安82/82、RGB完全一致74/82種・647/656コマで厳密一致は未達。
- 再生前基準PNGも全82枚数値比較し80/82枚RGB完全一致。差の2枚を同様に追加目視。撮影geometry・時刻・発生元・対象・尺・命中は全82種で作業前一致。第4→5回でコードは変わらずRGB差の出るコマが入れ替わるため撮影／DOM側の揺れが疑われるが、原因は未確定。比較基準・画像・閾値を変更していない。
- 今回は報告3ファイルだけ更新しSTATUSへCONTINUEを記入。JS／HTML変更が無いため?v=更新無し。Chromeのlab_vfx_check / present_parity / anim_check / online_pipeline / current_issues_checkは未実行。実戦の後続・高速描画・SE聴感は未確認。STATUSはCONTINUE。

## 第6回撮影確認後の検査 / 2026-10-14

以下の全38本を実行し38/38成功。実装コードは保持し、新21種の描画・個数・命中・復元、旧82種の描画命令を再確認した。検査成功をChrome確認や画素一致に置き換えない。

| Node検査（tools/balance_sim/） | 結果 | 秒 |
|---|---|---:|
| `attack_order_1010_regression.js` | PASS | 0.07 |
| `attack_lifecycle_1010_regression.js` | PASS | 0.24 |
| `battle_carry_order_regression.js` | PASS | 0.31 |
| `battle_event_regression.js` | PASS | 0.15 |
| `battle_state_init_regression.js` | PASS | 0.20 |
| `attack_summon_regression.js` | PASS | 2.12 |
| `card_core_smoke.js` | PASS | 0.21 |
| `damage_metrics_regression.js` | PASS | 0.21 |
| `damage_shake_1011_regression.js` | PASS | 0.24 |
| `damage_shake_observer_1011_regression.js` | PASS | 0.03 |
| `death_1011_regression.js` | PASS | 0.39 |
| `battle_state_vfx_regression.js` | PASS | 2.59 |
| `deep_level_regression.js` | PASS | 0.31 |
| `dina_rescue_regression.js` | PASS | 0.20 |
| `defeat_retry_regression.js` | PASS | 0.36 |
| `effect_audit.js` | PASS | 0.16 |
| `effect_value_audit.js` | PASS | 0.12 |
| `effect_text_1010_regression.js` | PASS | 0.22 |
| `id_reference_audit.js` | PASS | 0.08 |
| `guts_state_1010_regression.js` | PASS | 0.34 |
| `keyword_refs_1012_regression.js` | PASS | 0.24 |
| `kenzoku_regression.js` | PASS | 0.52 |
| `merge_effects_1012_regression.js` | PASS | 0.80 |
| `merge_ui_1012_regression.js` | PASS | 0.23 |
| `offline_online_regression.js` | PASS | 0.20 |
| `permanent_damage_regression.js` | PASS | 0.29 |
| `quest_q001_regression.js` | PASS | 0.30 |
| `quest_q008_regression.js` | PASS | 0.27 |
| `revive_extra_attack_1012_regression.js` | PASS | 0.21 |
| `selftest.js` | PASS | 0.32 |
| `silence_scroll_check.js` | PASS | 0.67 |
| `skilled_1012_regression.js` | PASS | 0.25 |
| `ui_library_1011_regression.js` | PASS | 0.20 |
| `lab_vfx_regression.js` | PASS | 12.15 |
| `vfx_1012_regression.js` | PASS | 128.80 |
| `vfx_webp_regression.js` | PASS | 14.27 |
| `pve_core_resource_parity.js` | PASS | 0.04 |
| `vfx_data_regression.js` | PASS | 245.48 |

- lab_vfx_regression：21種の実体イベントfixtureを通常PvEの受け口／保存再生／オンラインへ流し、発生元・実対象・回数・順序・SEが一致。発光だけの抑止、13不発条件、重複・反復・色数・血滴、ミノタウロスの直列と接触同期もPASS。作業前コアとの21ケースは演出用メタデータ以外一致。ただしC094のfixtureは通常開戦前に再発火を呼ぶため、通常開戦後の既存コア抑止の解消を意味しない。
- vfx_1012_regression：新21種の3速さ×16時刻・有限数・描画・復元・残像除去、実個数1/2/3/5、脈動の谷と発光、実フレーム通知、突進の命中位置と表示順、縦長溶解マスクと終了後復元、SE63件の契約：PASS。旧82定義4ファイルと3速さ×8時刻のCanvas命令・尺の作業前一致：PASS。
- vfx_data_regression：50効果の9時刻・5速さ、5状態の値8段階、許可リスト拒否、汎用部品の宣言とJSON往復：PASS。VFX定義は公開103項目、JSON102定義・888層・39図形・12部品型、573400 bytesで保持。

| 追加検査 | 結果 |
|---|---|
| `node tools/parity/online_payload.js` | PASS（コア73／送信78フィールド・NG 0） |
| `node tools/parity/online_receivers.js` | PASS（NG 0） |
| `node tools/vfx_preview/cards_scan.cjs --check` | PASS（369経路） |
| `node tools/vfx_preview/cards_check.cjs` | PASS（369件・LAB85割当・サイズ／配置112件） |
| `node tools/vfx_capture/check.js` | PASS（12.04秒・Chrome未実行） |
| 初回制作からの変更JS/CJSへ `node --check` | PASS（30/30本） |
| `git diff --check` | PASS |

- cards_scanの永久ダメージ書き戻し警告2件（panel_sheet_E075・slot 7・damage 11）は既存fixture由来。終了コード0。
- vfx_capture/checkの一時参照PNGリンク256個はfinallyで全て除去、残り0。時計・seed・RAF・CSS・静止JPEG/PNGとWebP混在・load待機・未配信静止コマ・元WebP抽出・別ポート・file://・PNG比較・一覧txt・参考32効果・時刻誤り拒否を検査。Chromeを起動する検査ではない。
- SE63候補：全原音実在・指定素材フォルダ内・相互／既存候補／採用素材との名前重複無し・ボイス名除外・README21行と各理由・ADOPTED仮21行・manifest／se_catalogと登録hash一致：PASS。48kHz/PCM16・最長1.95秒・実測-1.000152dBFS・peak誤差最大0.00000050秒・末尾30msフェード・最終サンプル0・ゲームpeak同期：PASS。先頭の連続した0は最大1.521ms。仮コピー21件は候補1と全バイト一致。聴感は未確認。
- 保護対象と旧82定義4ファイルの差分無し。初回作業前からのassets差分は新規WAV21個だけ。new_targetsは21行・一意で、今回の新21撮影・SE一覧と一致。ブランチvfx-1012、開始時HEAD 6e8345eは保持。コミット無し。
- 第6回写真：新21種全168コマ、旧82種前後全656コマをカード周囲で切り出し・2倍に拡大して目視。12種の差分14コマも前後・差分24倍・最大点8倍で全部追加目視。新21種は追加修正不要、旧の演出の形の変化は認められない。数値目安82/82、RGB完全一致70/82種・642/656コマ。厳密差は残す。
- 全82種のgeometry・発生元・対象・撮影時刻・尺・命中は作業前一致。追加cueTimesMsは全件空。第5→6回のコードは同じで差の出るコマが入れ替わり、撮影／DOM側の揺れが疑われるが原因は未確定。比較基準・画像・閾値の変更無し。
- 今回は報告3ファイルのみ更新しSTATUSへCONTINUEを記入。JS／HTML変更が無いため?v=更新無し。Chromeの5検査は指定どおり未実行。実戦連続描画・SE聴感は未確認。C094の通常開戦後の再発火抑止は戦闘結果を変えずには直せないため未解消。21種が通常戦闘で全て発動する完了条件を満たしたとはしない。

## 第7回撮影確認後の検査 / 2026-10-14

以下の全38本を実行して38/38成功。実装コードは保持し、描画・個数・命中・復元と旧82種の命令を再確認。検査成功をChrome確認や画素一致に置き換えない。

| Node検査（tools/balance_sim/） | 結果 | 秒 |
|---|---|---:|
| `attack_lifecycle_1010_regression.js` | PASS | 0.25 |
| `attack_order_1010_regression.js` | PASS | 0.06 |
| `attack_summon_regression.js` | PASS | 2.13 |
| `battle_carry_order_regression.js` | PASS | 0.31 |
| `battle_event_regression.js` | PASS | 0.15 |
| `battle_state_init_regression.js` | PASS | 0.20 |
| `battle_state_vfx_regression.js` | PASS | 2.58 |
| `card_core_smoke.js` | PASS | 0.20 |
| `damage_metrics_regression.js` | PASS | 0.21 |
| `damage_shake_1011_regression.js` | PASS | 0.25 |
| `damage_shake_observer_1011_regression.js` | PASS | 0.03 |
| `death_1011_regression.js` | PASS | 0.39 |
| `deep_level_regression.js` | PASS | 0.32 |
| `defeat_retry_regression.js` | PASS | 0.58 |
| `dina_rescue_regression.js` | PASS | 0.34 |
| `effect_audit.js` | PASS | 0.16 |
| `effect_text_1010_regression.js` | PASS | 0.22 |
| `effect_value_audit.js` | PASS | 0.12 |
| `guts_state_1010_regression.js` | PASS | 0.34 |
| `id_reference_audit.js` | PASS | 0.08 |
| `kenzoku_regression.js` | PASS | 0.53 |
| `keyword_refs_1012_regression.js` | PASS | 0.24 |
| `lab_vfx_regression.js` | PASS | 12.15 |
| `merge_effects_1012_regression.js` | PASS | 0.81 |
| `merge_ui_1012_regression.js` | PASS | 0.23 |
| `offline_online_regression.js` | PASS | 0.20 |
| `permanent_damage_regression.js` | PASS | 0.29 |
| `pve_core_resource_parity.js` | PASS | 0.04 |
| `quest_q001_regression.js` | PASS | 0.30 |
| `quest_q008_regression.js` | PASS | 0.27 |
| `revive_extra_attack_1012_regression.js` | PASS | 0.21 |
| `selftest.js` | PASS | 0.32 |
| `silence_scroll_check.js` | PASS | 0.67 |
| `skilled_1012_regression.js` | PASS | 0.25 |
| `ui_library_1011_regression.js` | PASS | 0.20 |
| `vfx_1012_regression.js` | PASS | 132.96 |
| `vfx_data_regression.js` | PASS | 247.26 |
| `vfx_webp_regression.js` | PASS | 14.49 |

- lab_vfx_regression：新21種の実体イベントfixture、発光だけの抑止、13不発条件、実対象・重複・反復・色数・血滴・直列接続・接触同期、通常PvE受け口／保存再生／オンラインの同一呼出し：PASS。作業前コアとの21ケースの結果は演出用メタデータ以外一致。C094は通常開戦前のfixtureと通常開戦後の抑止経路を区別し、通常戦闘で全21種が発動する完了条件の達成とはしない。
- vfx_1012_regression：新21種の3速さ×16時刻、実個数1/2/3/5、脈動の谷と発光、実フレーム通知、突進の命中位置と表示順、縦長溶解マスク、終了後のstyle復元・残像除去、SE63契約：PASS。旧82定義4ファイル・3速さ×8時刻のCanvas命令と尺の作業前一致：PASS。
- vfx_data_regression：既存効果の描画、状態・値・速度、許可リスト拒否、汎用部品とJSON往復：PASS。公開103項目、JSON102定義・888層・39図形・12部品型・573400 bytesを保持。

| 追加検査 | 結果 |
|---|---|
| `node tools/parity/online_payload.js` | PASS（コア73／送信78フィールド・NG 0） |
| `node tools/parity/online_receivers.js` | PASS（NG 0） |
| `node tools/vfx_preview/cards_scan.cjs --check` | PASS（369経路） |
| `node tools/vfx_preview/cards_check.cjs` | PASS（369件・LAB85割当・サイズ／配置112件） |
| `node tools/vfx_capture/check.js` | PASS（11.82秒・Chrome未実行） |
| 初回制作からの変更JS/CJSへ `node --check` | PASS（30/30本） |
| `git diff --check` | PASS |

- cards_scanの永久ダメージ書き戻し警告2件（panel_sheet_E075・slot 7・damage 11）は既存fixture由来。終了コード0。
- vfx_capture/checkの一時参照PNGリンク256個はfinallyで全て除去、残り0。時計・seed・RAF・CSS、静止JPEG/PNGとWebPの混在、load待機、未配信静止コマの拒否、抽出・別ポート・file://・PNG比較・一覧txt・参考32効果・時刻誤り拒否を確認。Chrome起動を伴う検査ではない。
- SE63候補：全元素材実在・指定フォルダ内・相互／既存候補／採用素材との名前重複無し・ボイス名除外・README21行と各理由・ADOPTED仮21行・manifest／se_catalogとhash一致：PASS。48kHz/PCM16・最長1.95秒・実測-1.000152dBFS・peak誤差最大0.00000050秒・末尾30msフェード・最終サンプル0・ゲームpeak同期：PASS。先頭の連続した0は最大1.521ms。候補1と仮コピー21件は全バイト一致。聴感は未確認。
- 全82種の撮影メタデータは作業前一致、追加cueTimesMsは全件空。新21種のメタデータは第6回と一致。new_targets21行・一意・撮影と一致。保護対象と旧82定義4ファイルの変更無し。初回作業前からのassets差分は新規WAV21個だけ。ブランチvfx-1012、開始時HEAD 9c84c3fを保持。
- 第7回の新21種全168コマ・旧82種前後全656コマをカード周囲切出し・2倍で目視。差16コマも前後・24倍差分・最大点8倍で全部目視。新規追加修正は不要。旧演出の形の変化は認められない。数値目安82/82、RGB完全一致70/82種・640/656コマ、12種16コマの厳密差は未解消。
- 今回更新は報告3ファイルとSTATUSの記入のみ。JS／HTML変更無しで?v=更新無し、コミット無し。Chromeの5検査は指定どおり未実行。実戦連続描画とSE聴感は未確認。C094の通常開戦後の再発火抑止は、戦闘結果を変えない指定のため未解消。STATUSはCONTINUE。

## 第8回撮影確認後の検査 / 2026-10-14

以下の全38本を実行して38/38成功。実装コードは保持し、描画・個数・命中・復元と旧82種の命令を再確認。検査成功をChrome確認や画素一致に置き換えない。

| Node検査（tools/balance_sim/） | 結果 | 秒 |
|---|---|---:|
| `attack_lifecycle_1010_regression.js` | PASS | 0.24 |
| `attack_order_1010_regression.js` | PASS | 0.06 |
| `attack_summon_regression.js` | PASS | 2.12 |
| `battle_carry_order_regression.js` | PASS | 0.32 |
| `battle_event_regression.js` | PASS | 0.15 |
| `battle_state_init_regression.js` | PASS | 0.20 |
| `battle_state_vfx_regression.js` | PASS | 2.53 |
| `card_core_smoke.js` | PASS | 0.21 |
| `damage_metrics_regression.js` | PASS | 0.21 |
| `damage_shake_1011_regression.js` | PASS | 0.25 |
| `damage_shake_observer_1011_regression.js` | PASS | 0.03 |
| `death_1011_regression.js` | PASS | 0.40 |
| `deep_level_regression.js` | PASS | 0.32 |
| `defeat_retry_regression.js` | PASS | 0.37 |
| `dina_rescue_regression.js` | PASS | 0.21 |
| `effect_audit.js` | PASS | 0.16 |
| `effect_text_1010_regression.js` | PASS | 0.22 |
| `effect_value_audit.js` | PASS | 0.12 |
| `guts_state_1010_regression.js` | PASS | 0.34 |
| `id_reference_audit.js` | PASS | 0.08 |
| `kenzoku_regression.js` | PASS | 0.54 |
| `keyword_refs_1012_regression.js` | PASS | 0.24 |
| `lab_vfx_regression.js` | PASS | 12.17 |
| `merge_effects_1012_regression.js` | PASS | 0.83 |
| `merge_ui_1012_regression.js` | PASS | 0.24 |
| `offline_online_regression.js` | PASS | 0.20 |
| `permanent_damage_regression.js` | PASS | 0.30 |
| `pve_core_resource_parity.js` | PASS | 0.04 |
| `quest_q001_regression.js` | PASS | 0.31 |
| `quest_q008_regression.js` | PASS | 0.28 |
| `revive_extra_attack_1012_regression.js` | PASS | 0.22 |
| `selftest.js` | PASS | 0.33 |
| `silence_scroll_check.js` | PASS | 0.68 |
| `skilled_1012_regression.js` | PASS | 0.26 |
| `ui_library_1011_regression.js` | PASS | 0.20 |
| `vfx_1012_regression.js` | PASS | 134.07 |
| `vfx_data_regression.js` | PASS | 242.26 |
| `vfx_webp_regression.js` | PASS | 14.56 |

- lab_vfx_regression：新21種の実体イベントfixture、発光だけの抑止、13不発条件、実対象・重複・反復・色数・血滴・直列接続・接触同期、通常PvE受け口／保存再生／オンラインの同一呼出し：PASS。作業前コアとの21ケースの結果は演出用メタデータ以外一致。C094は通常開戦前のfixtureと通常開戦後の抑止経路を区別し、通常戦闘で全21種が発動する完了条件の達成とはしない。
- vfx_1012_regression：新21種の3速さ×16時刻、実個数1/2/3/5、脈動の谷と発光、実フレーム通知、突進の命中位置と表示順、縦長溶解マスク、終了後のstyle復元・残像除去、SE63契約：PASS。旧82定義4ファイル・3速さ×8時刻のCanvas命令と尺の作業前一致：PASS。
- vfx_data_regression：既存効果の描画、状態・値・速度、許可リスト拒否、汎用部品とJSON往復：PASS。公開103項目、JSON102定義・888層・39図形・12部品型・573400 bytesを保持。

| 追加検査 | 結果 |
|---|---|
| `node tools/parity/online_payload.js` | PASS（コア73／送信78フィールド・NG 0） |
| `node tools/parity/online_receivers.js` | PASS（NG 0） |
| `node tools/vfx_preview/cards_scan.cjs --check` | PASS（369経路） |
| `node tools/vfx_preview/cards_check.cjs` | PASS（369件・LAB85割当・サイズ／配置112件） |
| `node tools/vfx_capture/check.js` | PASS（12.26秒・Chrome未実行） |
| 初回制作からの変更JS/CJSへ `node --check` | PASS（30/30本） |
| `git diff --check` | PASS |

- cards_scanの永久ダメージ書き戻し警告2件（panel_sheet_E075・slot 7・damage 11）は既存fixture由来。終了コード0。
- vfx_capture/checkの一時参照PNGリンク256個はfinallyで全て除去、残り0。時計・seed・RAF・CSS、静止JPEG/PNGとWebPの混在、load待機、未配信静止コマの拒否、抽出・別ポート・file://・PNG比較・一覧txt・参考32効果・時刻誤り拒否を確認。Chrome起動を伴う検査ではない。
- SE63候補：全元素材実在・指定フォルダ内・相互／既存候補／採用素材との名前重複無し・ボイス名除外・README21行と各理由・ADOPTED仮21行・manifest／se_catalogとhash一致：PASS。48kHz/PCM16・最長1.95秒・実測-1.000152dBFS・peak誤差最大0.00000050秒・末尾30msフェード・最終サンプル0・ゲームpeak同期：PASS。先頭の連続した0は最大1.521ms。候補1と仮コピー21件は全バイト一致。聴感は未確認。
- 全82種の撮影メタデータは作業前一致、追加cueTimesMsは全件空。新21種のメタデータは第7回と一致。new_targets21行・一意・撮影と一致。保護対象と旧82定義4ファイルの変更無し。初回作業前からのassets差分は新規WAV21個だけ。ブランチvfx-1012、開始時HEAD 0586014を保持。
- 第8回の新21種全168コマ・旧82種前後全656コマをカード周囲切出し・2倍で目視。差7コマも前後・24倍差分・最大点8倍で全部目視。新規追加修正は不要。旧演出の形の変化は認められない。数値目安82/82、RGB完全一致76/82種・649/656コマ、6種7コマの厳密差は未解消。
- 今回更新は報告3ファイルとSTATUSの記入のみ。JS／HTML変更無しで?v=更新無し、コミット無し。Chromeの5検査は指定どおり未実行。実戦連続描画とSE聴感は未確認。C094の通常開戦後の再発火抑止は、戦闘結果を変えない指定のため未解消。STATUSはCONTINUE。

## Chrome検査第1回・present_parity修正後 / 2026-10-14

- 利用者のChrome実測：LAB1012の「発生元・対象・回数・入力・尺・SEの一致」21件NG。オンライン側だけbattle_startのopening-sigilが記録へ混入した。通常SCENARIOSが行っている「最初の実体イベント直前から記録する」処理が、この節だけ欠けていた。
- 修正前：Chromeへ渡すlab1012ParityScriptをNodeの同じfixture・コア・実受け口で実行し、C004でオンラインだけ登場VFX9件が混入するAssertionErrorを再現。従来のNode検査はplayBattleOpeningSequenceを省略しており、この差を検出していなかった。
- 修正後：battle_startは再生し、最初の実体イベントを描く直前でcalls／soundsを初期化する。21種の実発動必須・全呼出し配列・SE順序の厳密比較は保持。VFX名での除外や期待値の緩和はない。
- 追加回帰：Chrome用の同じ生成スクリプトで21種の両受け口が一致。実体イベント中へ同名opening-sigilと余分なC071のSEを注入すると、両方の差が記録されて不一致になる。後続演出を削って通す修正を拒否する。`VB_ONLY=browser1012 node tools/balance_sim/lab_vfx_regression.js`でこの節だけ実行できる。
- 検査中、Nodeから生成スクリプトを参照するためのexportsを追加した際に、既存attack_summon_regressionのソース切出し検査がmodule未定義で失敗した。exportsを末尾へ置き、直接実行の判定を既存IIFE内に置いて切出しとの互換を保った。同検査は再実行で27項目・NG 0。lab_vfx_regressionの全節も最終変更後に再実行して成功。

全38本の最終結果（再実行した2本は最新ログで判定）：

| Node検査（tools/balance_sim/） | 最終結果 | 秒 |
|---|---|---:|
| `attack_lifecycle_1010_regression.js` | PASS | 0.25 |
| `attack_order_1010_regression.js` | PASS | 0.06 |
| `attack_summon_regression.js` | PASS | 再実行PASS |
| `battle_carry_order_regression.js` | PASS | 0.33 |
| `battle_event_regression.js` | PASS | 0.16 |
| `battle_state_init_regression.js` | PASS | 0.22 |
| `battle_state_vfx_regression.js` | PASS | 2.59 |
| `card_core_smoke.js` | PASS | 0.23 |
| `damage_metrics_regression.js` | PASS | 0.23 |
| `damage_shake_1011_regression.js` | PASS | 0.27 |
| `damage_shake_observer_1011_regression.js` | PASS | 0.04 |
| `death_1011_regression.js` | PASS | 0.43 |
| `deep_level_regression.js` | PASS | 0.34 |
| `defeat_retry_regression.js` | PASS | 0.40 |
| `dina_rescue_regression.js` | PASS | 0.22 |
| `effect_audit.js` | PASS | 0.18 |
| `effect_text_1010_regression.js` | PASS | 0.24 |
| `effect_value_audit.js` | PASS | 0.13 |
| `guts_state_1010_regression.js` | PASS | 0.36 |
| `id_reference_audit.js` | PASS | 0.09 |
| `kenzoku_regression.js` | PASS | 0.58 |
| `keyword_refs_1012_regression.js` | PASS | 0.26 |
| `lab_vfx_regression.js` | PASS | 再実行PASS |
| `merge_effects_1012_regression.js` | PASS | 0.88 |
| `merge_ui_1012_regression.js` | PASS | 0.26 |
| `offline_online_regression.js` | PASS | 0.22 |
| `permanent_damage_regression.js` | PASS | 0.32 |
| `pve_core_resource_parity.js` | PASS | 0.04 |
| `quest_q001_regression.js` | PASS | 0.33 |
| `quest_q008_regression.js` | PASS | 0.29 |
| `revive_extra_attack_1012_regression.js` | PASS | 0.23 |
| `selftest.js` | PASS | 0.36 |
| `silence_scroll_check.js` | PASS | 0.75 |
| `skilled_1012_regression.js` | PASS | 0.27 |
| `ui_library_1011_regression.js` | PASS | 0.22 |
| `vfx_1012_regression.js` | PASS | 137.99 |
| `vfx_data_regression.js` | PASS | 247.67 |
| `vfx_webp_regression.js` | PASS | 15.18 |

- vfx_1012_regressionは137.99秒、vfx_data_regressionは247.67秒で完走。旧82定義4ファイル・3速さ×8時刻の描画命令一致、新21種の描画・復元・SE63契約も成功。
- online_payload：コア73／送信78フィールド・NG 0。online_receivers：NG 0。変更JS/CJS30本のnode --check、git diff --check：成功。
- Chrome再実行：`VB_ONLY=LAB1012 VB_URL=http://127.0.0.1:5560/index.html node tools/parity/present_parity.js`を試行したが、headless.jsの起動段階で「Chromeへ接続できない」（終了コード1）。ページ評価前に終了しているため、修正後ChromeのNG 0とは報告しない。他のChrome検査は今回未実行。
- 今回はNode実行用検査2本と報告3ファイルだけを変更。ゲーム本体・コア判定・VFX定義・renderer・SE・HTML・保護対象の変更無し。検査JSはHTMLのscript src対象外なので?v=更新は不要。コミット無し。STATUSはCONTINUE。第8回の画像判定・6種7コマの厳密差・C094の既存コア制限は保持。
