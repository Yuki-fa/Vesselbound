# ui-1027b 作業結果（2026-10-27）

1〜6を実装し、7の抽出道具と一覧を作成した。指定のNode検査95本は94本成功、利用者指定の既知の同時接続検査1本だけ失敗。画面を使った確認とコミットの制約は末尾に記載する。

## 変更内容

| 項目 | 結果 |
| --- | --- |
| 1 マモン | アイテムのある枠を共通の有効対象として登録。documentのcaptureがクリックを遮っていた原因を修正した。区画の見出し・枠・空き枠も暗くしない。破壊、入金、起動の使用印の消費は既存の共通経路を通す。 |
| 2 使用中のボタン | アイテム・起動の共通状態で、再抽選・戦闘開始・配置を戻す・カード非表示・退出・デバッグ等のボタンを暗くし、クリックを遮断。説明枠に残った別操作のボタンも遮断。対象・使用元・1枚目・Esc・右クリックの取消は維持。設定は従来のアイテム使用中と同じ扱い。 |
| 3 廃棄 | 古い丸ボタン用の `.discard-btn` を外し、`.shop-board-sell-value.shop-board-sell-action` の共通位置・外観・クリック処理を使用する。古い影とホバーfilterが廃棄に当たらなくなる。 |
| 4 呪いの印 | 現行シートの報酬trueをそのまま使用。実際の抽選・報酬取得から、通常／強化の枠、残戦数、保存復元、4回目だけ英雄の印／英雄の印+へ変わる経路を検査。既存の変化ルールは維持した。 |
| 5 殉教 | 共通コアに、封印中の味方への能力移譲を追加。通常はATK・最大HPの半分を切り捨て、強化は全量。既存の青の味方への移譲と同じ計算を使い、本文から対象条件を読む。通常・強化の同時接続も各本文を適用する。 |
| 5 一時の眠り | 既存の死亡からの再封印を接続本文にも適用。死亡で増えた後の血×本文の倍率（通常3・強化2）を使う。複数接続の封印は合計。元の封印値を誤って優先せず、解放後の次の死亡でも血・死亡観測を発動する。 |
| 5 再生の一致 | `seal_apply` にコア確定済みのHP等を渡し、共通の演出入口を両受け口から使用。PvEの最終状態を解放演出で巻き戻さず、封印→解放→再封印を表示用の印で順番に見せる。描画関数の状態変更は受け口のコールバックへ戻した。 |
| 6 行商人列 | loaderの `_peddlerAvailable` と drawItemsの `forPeddler` を削除。列が無い／有る（全falseでも同じ）CSVをメモリ上で読み直し、同じアイテム定義・抽選になることを検査した。 |
| 7 直書き文言 | `hardcoded_text_audit_1027.js` と `HARDCODED_TEXT_1027.md` を作成。62ファイルをAST・HTML・CSSで監査し、主一覧254箇所。シートを読む予備／初期表示264箇所、各シートで上書きする初期定義270箇所も参考欄へ収録。ファイル・行・文・表示先・対応キーを記載。文言の置換はしていない。 |

## 判断した点

- 死亡時の「HP」の移譲は、既存の青の味方への移譲と同じ最大HPを使った。死亡後の現在HPは0になるため、通常の半分は `Math.floor` で計算する。
- E066・E073・E076・E077の番号のjpgは未配置だった。素材を変更せず、loaderで既存の `assets/art/enchantments/E0XX.jpg` を仮画像として使う。番号・効果・通常／強化の枠は維持する。各jpgが追加されたら、loaderの `_assignSheetArtCode` にある4番号の一覧から該当番号を外す。
- 廃棄のCSS基準は既存の価格ラベルの値を使用した。`top:34px`、`right:0`、`width/min-width:101px`、`height:46px`、`z-index:105`、背景の不透明度 `.8`。ボタン遮断時は `brightness(.45)`。新しい調整用定数は追加していない。
- シート、取り込み済みデータ、assets、VFX定義、docs、AGENTS.mdは変更していない。保護対象のxlsxと内蔵データはHEADとのバイト一致も確認した。
- 変更した実行用JS11本の `index.html` の `?v=` を `-ui1027b` へ更新した。ビルド・ES Modules・ローカルサーバーへの依存は追加していない。

## 検査結果

- `ui_1027b_regression.js`: 23件成功、0件失敗。マモンのcapture、共通入力制御、報酬取得、両陣営・通常／強化、保存・オンラインの全イベント、複数接続で封印された本人への殉教、再封印の再生、行商人列の有無を検査した。
- `card_text_audit_1026.js`: 217枚、実装true 215枚、434判定。動く410、動かない0、判定できない24。殉教・一時の眠りの通常／強化は「動く」。残る24は起動・還魂・報酬生成・クエスト説明など既存の別検査対象で、マモンの操作は今回の回帰でも検査した。
- 指定のbalance_sim 6本、すべての `*_regression.js`、online_payload、online_receivers、本文監査を実行。全数実行後、変更に関係する検査を再実行した。重い `vfx_data_regression.js` は初回の180秒打切り後、打切りなしで完走して成功した。
- 変更・新規JS23本の `node --check` と `git diff --check` は成功。
- 既知の失敗は `merge_effects_1012_regression.js` の通常＋強化の同時接続だけ。E022の加算20/20に対して期待30/30、E056の血6に対して期待9（各p1・p2）。今回追加したE077の同時接続は解消し、既知の4ケース以外の不一致はない。

## 画面確認の制約

ヘッドレスChromeは起動・接続に失敗した。`ui_1027b_visual_check.js` はその結果を明示して、利用者指定のCSS値の代替確認へ切り替えた。廃棄の共通セレクタ・値・旧クラスの不適用・疑似要素の非表示を検査している。**撮影・実画面のクリック・演出・聴感は未確認**。

`anim_check.js` と `present_parity.js` もChromeへ接続できず未実施。殉教・一時の眠りの演出パリティ用シナリオを追加したが、画面での一致確認は残る。仮DOM・共通コア・保存再生の成功を実画面確認とは扱っていない。

再試行コマンド:

```sh
node tools/parity/ui_1027b_visual_check.js
VB_ONLY='一時の眠りの解放と再封印|殉教から封印中の味方への能力移譲' node tools/parity/present_parity.js
node tools/parity/anim_check.js
```

## 確認した文書との食い違い

文書は変更せず、最新の作業指示と現行コードに従った。

1. `docs/PROJECT_MAP.md` は開始時の対象を最大5ファイルとし、Codexのコミットを禁止している。今回は利用者が指定した全7項目の範囲と明示的なコミット指示を優先した。
2. `docs/DATA_TEXT.md` は巻物の指示文の入口を `_itemUsePromptText()` としている。現行コードでは1026の選択UI変更で廃止済み。古い2段階キーの説明も残っているが、今回その旧UI・旧キーを復活させていない。
3. `docs/BATTLE.md` の冒頭・封印API表には生贄を前提とする説明が残る。現行の `coreSealRelease` は陣営の血を参照し、解放時に血を消費しない。
4. `docs/ONLINE.md` の担当表はDOM描画の置き場を `battle.js` としている。共通描画は `render.js`、イベント1件の見せ方は `present_events.js` という現行の構成を使用した。
5. `docs/PRESENTATION.md` の表はマナ効果にキャラクターごとの間引きと記載する。現行の `presentManaThresholdEvent` は発動回数ぶん見せる実装であり、変更していない。
6. `AGENTS.md` はエリート・ボス後のレベル報酬を記載しているが、現行 `RUN_LEVEL_CONFIG.rewardEnabled` は `false`。今回の依頼外なので停止状態を維持した。文言監査には停止中・旧セーブ向けの文言も含めている。

## Git

ブランチは `ui-1027b`。`git add` はGit管理領域の `index.lock` 作成が `Operation not permitted` で失敗した。コミットは作成できず、利用者指定の代替条件どおり、変更は作業ツリーに残している。未コミット変更の破棄・リセットはしていない。

## 指定Node検査95本の一覧

下表は各検査の最終実行結果。ログは一時ディレクトリへ置き、プロジェクトには残していない。

| 検査 | 最終結果 |
| --- | --- |
| `tools/balance_sim/effect_audit.js` | 成功 |
| `tools/balance_sim/card_core_smoke.js` | 成功 |
| `tools/balance_sim/offline_online_regression.js` | 成功 |
| `tools/balance_sim/battle_event_regression.js` | 成功 |
| `tools/balance_sim/pve_core_resource_parity.js` | 成功 |
| `tools/balance_sim/silence_scroll_check.js` | 成功 |
| `tools/balance_sim/activation_1025_regression.js` | 成功 |
| `tools/balance_sim/altar_1027_regression.js` | 成功 |
| `tools/balance_sim/arena_carry_mana_1020_regression.js` | 成功 |
| `tools/balance_sim/atk_gain_vfx_1020b_regression.js` | 成功 |
| `tools/balance_sim/atk_zero_flee_1019_regression.js` | 成功 |
| `tools/balance_sim/attack_lifecycle_1010_regression.js` | 成功 |
| `tools/balance_sim/attack_modes_1020_regression.js` | 成功 |
| `tools/balance_sim/attack_order_1010_regression.js` | 成功 |
| `tools/balance_sim/attack_summon_regression.js` | 成功 |
| `tools/balance_sim/battle_carry_order_regression.js` | 成功 |
| `tools/balance_sim/battle_end_fx_1021b_regression.js` | 成功 |
| `tools/balance_sim/battle_fx_1022b_regression.js` | 成功 |
| `tools/balance_sim/battle_state_init_regression.js` | 成功 |
| `tools/balance_sim/battle_state_vfx_regression.js` | 成功 |
| `tools/balance_sim/blessing_flame_1019_regression.js` | 成功 |
| `tools/balance_sim/burn_ghost_1023_regression.js` | 成功 |
| `tools/balance_sim/card_text_1026_regression.js` | 成功 |
| `tools/balance_sim/chaos_imp_retrigger_1014_regression.js` | 成功 |
| `tools/balance_sim/copy_frame_1020_regression.js` | 成功 |
| `tools/balance_sim/damage_metrics_regression.js` | 成功 |
| `tools/balance_sim/damage_shake_1011_regression.js` | 成功 |
| `tools/balance_sim/damage_shake_observer_1011_regression.js` | 成功 |
| `tools/balance_sim/death_1011_regression.js` | 成功 |
| `tools/balance_sim/debug_cards_1018c_regression.js` | 成功 |
| `tools/balance_sim/deep_level_regression.js` | 成功 |
| `tools/balance_sim/defeat_retry_regression.js` | 成功 |
| `tools/balance_sim/dina_rescue_regression.js` | 成功 |
| `tools/balance_sim/echidna_1026_regression.js` | 成功 |
| `tools/balance_sim/effect_text_1010_regression.js` | 成功 |
| `tools/balance_sim/effects_1026c_regression.js` | 成功 |
| `tools/balance_sim/effects_1027_regression.js` | 成功 |
| `tools/balance_sim/enchant_1025_regression.js` | 成功 |
| `tools/balance_sim/enchants_1026_regression.js` | 成功 |
| `tools/balance_sim/fate_engraving_1020e_regression.js` | 成功 |
| `tools/balance_sim/fixes_1018b_regression.js` | 成功 |
| `tools/balance_sim/fixes_1026b_regression.js` | 成功 |
| `tools/balance_sim/fx_assign_1025_regression.js` | 成功 |
| `tools/balance_sim/grimalkin_countdown_1023_regression.js` | 成功 |
| `tools/balance_sim/guts_state_1010_regression.js` | 成功 |
| `tools/balance_sim/item_x_1022_regression.js` | 成功 |
| `tools/balance_sim/items_1026_regression.js` | 成功 |
| `tools/balance_sim/kenzoku_1026_regression.js` | 成功 |
| `tools/balance_sim/kenzoku_regression.js` | 成功 |
| `tools/balance_sim/keyword_bold_cardname_1020_regression.js` | 成功 |
| `tools/balance_sim/keyword_refs_1012_regression.js` | 成功 |
| `tools/balance_sim/lab_vfx_regression.js` | 成功 |
| `tools/balance_sim/leprechaun_save_1020_regression.js` | 成功 |
| `tools/balance_sim/merge_effects_1012_regression.js` | 既知の同時接続のみ失敗 |
| `tools/balance_sim/merge_ui_1012_regression.js` | 成功 |
| `tools/balance_sim/minotaur_reaction_1019_regression.js` | 成功 |
| `tools/balance_sim/multi_unit_mana_speed_1020f_regression.js` | 成功 |
| `tools/balance_sim/operation_1018_regression.js` | 成功 |
| `tools/balance_sim/permanent_damage_regression.js` | 成功 |
| `tools/balance_sim/picking_1026_regression.js` | 成功 |
| `tools/balance_sim/placement_reset_1025_regression.js` | 成功 |
| `tools/balance_sim/quest_q001_regression.js` | 成功 |
| `tools/balance_sim/quest_q008_regression.js` | 成功 |
| `tools/balance_sim/repeat_speed_1020b_regression.js` | 成功 |
| `tools/balance_sim/resonance_1026_regression.js` | 成功 |
| `tools/balance_sim/revival_1018_regression.js` | 成功 |
| `tools/balance_sim/revive_extra_attack_1012_regression.js` | 成功 |
| `tools/balance_sim/reward_1025_regression.js` | 成功 |
| `tools/balance_sim/rings_1026_regression.js` | 成功 |
| `tools/balance_sim/run_effect_vfx_1023_regression.js` | 成功 |
| `tools/balance_sim/run_levels_1018c_regression.js` | 成功 |
| `tools/balance_sim/run_levels_display_1019_regression.js` | 成功 |
| `tools/balance_sim/run_levels_tools_1019_regression.js` | 成功 |
| `tools/balance_sim/save_pack_1020_regression.js` | 成功 |
| `tools/balance_sim/save_quota_1020_regression.js` | 成功 |
| `tools/balance_sim/sheet_1022a_regression.js` | 成功 |
| `tools/balance_sim/sheet_1023_regression.js` | 成功 |
| `tools/balance_sim/sheet_1025b_regression.js` | 成功 |
| `tools/balance_sim/sheet_1027_regression.js` | 成功 |
| `tools/balance_sim/sheet_effects_1019_regression.js` | 成功 |
| `tools/balance_sim/shield_break_1020_regression.js` | 成功 |
| `tools/balance_sim/shield_single_1021a_regression.js` | 成功 |
| `tools/balance_sim/shop_reroll_1018c_regression.js` | 成功 |
| `tools/balance_sim/skilled_1012_regression.js` | 成功 |
| `tools/balance_sim/spirit_circuit_1026_regression.js` | 成功 |
| `tools/balance_sim/ui_1027b_regression.js` | 成功 |
| `tools/balance_sim/ui_library_1011_regression.js` | 成功 |
| `tools/balance_sim/vfx_1012_regression.js` | 成功 |
| `tools/balance_sim/vfx_data_regression.js` | 成功 |
| `tools/balance_sim/vfx_webp_regression.js` | 成功 |
| `tools/balance_sim/wipe_tail_1020b_regression.js` | 成功 |
| `tools/balance_sim/wyvern_atk_gain_1020c_regression.js` | 成功 |
| `tools/parity/online_payload.js` | 成功 |
| `tools/parity/online_receivers.js` | 成功 |
| `tools/balance_sim/card_text_audit_1026.js` | 成功 |
