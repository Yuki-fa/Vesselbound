# 交換店の試験実装（2026-10-17）

対象は通常プレイ（PvE）。シート、内蔵CSV、AGENTS.md、docs/、戦闘コア、編成規則、オンラインの送受信ファイルは変更していない。

## 変更ファイル

|場所|内容|
|---|---|
|`js/engine/reward.js`|試験用設定と追加文言を1か所に集約。交換の共通入口、ドラッグ可否、PvEカード換金・返品の遮断、交換店の価格非表示、出発ボタンの連携|
|`js/engine/map.js`|報酬抽選を使う街別3枚在庫、旧在庫の移行、指輪の取得条件・例外・理由表示、施設からの出発ガード、説明の修正。オンラインの従来の価格付き抽選も保持|
|`js/engine/pool.js`|`drawRewards(count=5)` を共用し、魔導店は3枚を指定。通常報酬の抽選式を複製しない。3枚提示で余った追加報酬は次へ残す|
|`js/engine/reward_items.js`|道具の売買を維持し、PvEではアイテム枠に紛れたカードを換金しない|
|`js/engine/main.js` / `battle.js`|次マスへの進行・直接の戦闘開始にも同じ指輪条件を適用。戦闘の計算処理は変更なし|
|`js/save/run_save.js`|旧ショップの途中セーブも復元時に新在庫へ移行|
|`index.html`|変更した本体7JSのキャッシュ版、指輪未取得ボタンのカーソル。既存の無効表示を使用|
|`tools/balance_sim/run_bot.js` / `policies.js` / `lookahead.js` / `bot_runtime.js`|カード売買計画を撤去し、交換と必須の還魂・指輪取得を実行。道具は購入・使用する|
|`tools/balance_sim/run_report.js` / `boon_report.js` / `shop_exchange_report.js`|変更前→変更後の成績、資源、指輪、各マス初戦の難易度曲線を出力|
|`tools/balance_sim/RUN_BOT.md`|新しい操作と再実行手順|
|検査ファイル|下記の一覧を参照|
|`tools/balance_sim/out/`|最終版900周のJSONL、メタデータ、自己検査、CSV、RUN_REPORT.md|
|`tools/balance_sim/out_before_shop_exchange/`|変更前の全26ファイル。退避後もgitの変更前データとバイト単位で一致することを確認|

## PvEで閉じた売却・購入経路

- 魔導店・道具屋・鍛冶屋・行商人・デバッグ編成のカード売価／売却ボタンは `_boardCardSellEnabled` で無効になる。通常報酬にもカード換金を加えていない。
- `_wireHeCardDiscard` のカード換金、`_sellPendingShopCard` の旧カード売却待ち、`_shopCardSellGain` のカード売価をPvEから利用できない。
- `_canReturnDragSrcToRewardArea`、`_pushToRewardArea`、`_pushToRewardAreaAt` は、店の売却待ち枠へPvEの盤面カードだけを預ける操作を拒否する。
- `markShopPurchase` / `isShopReturnable` / `returnShopPurchase` はPvEでは道具だけが対象。古いカードの購入印を持ち込んでも換金・返品できない。
- 魔導店の `takeRewCard` と `dropOnCard` は交換へ渡す。空きマスの取得、クリックだけの取得、従来のパネル購入配置は通らない。価格バッジ・ゴールド不足札・合体取得の予告も出さない。
- `_sellHeldItem` はPvEでは本当のアイテムだけを換金する。道具の購入、返品の全額返金、通常売却の入金を実行検査した。
- 道具屋・鍛冶屋の初回説明から、カードも売れるという案内だけを取り除いた。
- **行商人のカード購入はゲーム本体に残す。** 購入廃止の指定は魔導店なので、行商人の販売内容・価格は維持した。周回ボットは行商人のカードを買わず、道具だけを買う。

## 交換の操作

`canExchangeShopCardAt(offerIdx, boardIdx)` が可否、`exchangeShopCard(offerIdx, boardIdx)` が交換の唯一の実装。

既存のポインタードラッグ → DragEvent → `_wireHeCardControls` / `_renderHeEmptySlot` → `_boardDropAllowedAt` → `dropOnCard` を使う。店3枠から占有マスへ落とすと、店のカードと盤面カードを同じ2枠の間で交換する。空きマスはドラッグ受付も実行も拒否する。ボットも同じ関数を呼ぶ。

ゴールドは増減せず、交換回数に制限はない。キャラと強化の相互交換・渡したカードの取り戻しも可能。交換自体は常に1対1で、交換時に同名を合体させない。通常の盤面操作による合体は従来どおり。

配置制限、刻印、クエストによる所持保護、`questRewardSlotAcceptsCard` は維持する。祝福・個体の強化情報はカードと一緒に移動する。

## 指輪取得の条件

`ringExchangeDepartureBlocked()` が唯一の判定。現在の塔の `_waveRingExchange[wave]`、祭壇を開いている間はライブの取得・還魂状態を見る。

指輪を未取得で、支払えるカードと既に捧げたカードが合計3枚以上なら、出発・戦闘開始を実行できない。3枚を捧げただけでは解除せず、指輪を取得して解除する。ボタンは既存の無効表示と `aria-disabled` を付け、押す試みでは `showErrorOverlay` が理由を表示する。理由を出すため、クリックそのものは受け取る。

例外は支払えるカード不足。刻印と依頼カードの保護に加え、最後の出撃可能キャラを残して3枚を捧げられない場合も不足とする。出撃判定は `boardHasDeployableCharacter` を使う。必要枚数は3枚のまま。次の塔では改めて取得が必要。

祭壇を途中で出る時のカード回収・確認、祝福の座・五聖の座などの出入りは従来の入口を維持する。施設を出るボタンには指輪の出発ガードを掛けない。

ボットは損得による見送りをしない。基本方針は盤面評価の損失が小さい合法な3枚組、lookaheadはその上位3組×各指輪を次戦で試す。指輪枠が満員なら、本体の「捨てる」操作で交換先を空ける。

## 保存形式と旧セーブ

新しい永続フィールドは追加していない。既存の `_waveShopStock[wave]` は「価格付き5枚」から「価格のない3枚」へ変わる。交換直後に `_syncWaveFacilityCache()` へ反映し、既存の施設確定・セーブ経路で盤面と在庫を一緒に保存する。

旧形式（5枠または価格付き）を見つけた街だけ、共通の報酬抽選で3枚へ作り直す。店の途中セーブも復元時に移行し、以後の再訪・再復元は固定された在庫を使う。指輪の取得済み状態も既存の塔別キャッシュに保存する。

## オンラインに残した店・売却

オンラインにも店がある。`js/online/flow.js: _navigate` の `city` / `tower` から `_openWaveVillage` / `_openWaveAltar`、`map.js: villageFacilityList` / `_onVillageFacility` へ入る。

共通の `_cardTradingRules()` がPvEの交換規則とオンラインの従来の売買規則を選ぶ。オンラインでは `map.js: _drawPricedShopStock` / `openMapShop` の価格付き5枠、`openMapItemShop`、`openMapForge`、`reward.js` のカード売却・売却待ち・購入・返品を維持する。オンラインのソースファイル、payload、receiver、戦闘コアは変更していない。

変更前のオンライン魔導店の関数と、在庫・在庫残数・乱数消費を30seedで比較して完全一致した。Nodeでは購入・売却・返品・ドラッグ先も検査済み。オンライン画面の実表示は未確認。

## 更新した検査

|検査|更新内容|
|---|---|
|`run_bot_selftest.js`|全900周のカード売買不存在、交換あり、全塔の必須指輪、枚数不足の例外、既存の再現性・旅程・資源の検査|
|`shop_exchange_selftest.js`（追加）|3枠、空きマスの実dragoverと取得拒否、入れ替え・取り戻し、異種交換、売却旧経路、道具売買、オンライン従来売買、保存・旧形式、先読み隔離、指輪必須・不足・満員枠|
|`boon_shop_probe.js`|新しい鍵付き在庫抽選に合わせてseedを変え、祝福6の生成数と提示数が一致することを要求|
|`ui_library_1011_regression.js`|5施設でアイテム売却を保ち、カードを換金できないことを検査。図書館の既存検査も維持|
|`quest_q001_regression.js`|廃止した売却の代わりに、保護カードの交換拒否と、保護終了後の交換による所持喪失を検査|
|`tools/parity/quest_tavern_check.js`|ショップ節を3枠・交換・取り戻し・空きマス拒否・価格と換金UIの不存在へ変更。Q001の保護も交換経路で検査|
|`tools/parity/sale_library_price_1011_check.js`|道具売却を維持し、カード売却UIと交換店の価格がないことを検査。行商人の価格・マナ・血の層順は維持|
|`tools/parity/board_drag_visual_check.js`|カード価格の不存在と、既存の枠・ゴースト・マスの層順を検査|
|`tools/parity/triple_merge_frame_visual_check.js`|合体元にもゴーストにもカードの売価が残らないことを検査。他の合体・枠の検査は維持|
|`tools/parity/shop_ui_visual_check.js`|カード売却UIの不存在を確認し、残す道具の価格・操作ボタン・ホバー・キャンセルの検査を維持|

変更した全24JSの `node --check` と `git diff --check` は合格。最終版で `tower_boon_check.js` は18項目、`run.js 5` は100カード×5試行、`run_bot_selftest.js` は50項目が合格。資源パリティ、オンラインpayload／receiverはすべてNG 0。図書館・売却回帰16件とQ001回帰18件も合格。周回の全件監査・再現性の記録は `out/SELFTEST.json`、集計は `out/RUN_REPORT.md` に保存している。

`save_contract_test.js` はChromeへ接続できず開始できなかった。`save_browser_test.js`、`save_summon_replay_test.js` と更新したブラウザ検査5本は、同じ環境制約のため実行していない。ブラウザの見た目・実マウス操作・音は未確認。保存と復元のデータ処理はNodeの本体関数で検査している。

## 設定値

`SHOP_EXCHANGE_TRIAL.stockCount = 3`、`ringCardCost = 3`。追加文言は `SHOP_EXCHANGE_TRIAL.text` だけに集約。

lookaheadは敵3例、報酬候補5枚、還魂候補3組、配置改善2回。店では全合法交換候補を試す。ゲームの交換回数は無制限。ボットだけは既存の `MAX_ACTIONS = 300` と同一状態の再訪検出で循環を止める。

## 敗北時の行商人も交換店へ（2026-10-17 追加依頼）

上記の「行商人の購入を残す」は初回依頼時の記録。追加依頼により、行商人も魔導店と同じ価格なし3枚の交換店に変更した。シート・内蔵CSV・AGENTS.md・docs/・戦闘コア・オンライン送受信・素材は変更していない。

- `peddler.js`：キャラ2・強化2・道具1の専用抽選、価格設定、道具の売切枠判定を撤去。`_buildDefeatPeddlerStock()` は `map.js` の新しい共通入口 `_drawExchangeShopStock(key)` を呼ぶ。魔導店も同じ入口へ移し、従来の鍵・抽選・乱数消費を保持する。中身の唯一の抽選は `drawRewards(SHOP_EXCHANGE_TRIAL.stockCount)`、枚数は既存の `stockCount = 3`。
- `reward.js`：`_isCardExchangeShop()` の行商人除外を取り除いた。`takeRewCard`・`_boardDropAllowedAt`・`dropOnCard` はそのまま `canExchangeShopCardAt` / `exchangeShopCard` を使う。空きマス、刻印、依頼枠、所持保護、同名での1対1、異種交換・取り戻しの判定を共有し、交換ロジックに行商人分岐を足していない。価格・不足札・購入配置・合体取得予告も魔導店と同じ扱いになる。
- `reward_items.js`：行商人の商品アイテムをドラッグ購入する徴収・売切経路から `_isPeddler` を除去。手持ち道具の使用・売却は魔導店と同じ従来の共通仕様を維持する。カード売却・カード返品は既に共通で禁止されており、その禁止を維持する。
- `run_save.js`：交換店復元時の在庫の選択だけを分岐し、行商人は `_ensureDefeatPeddlerStock()`、街は `_ensureWaveShopStock()` を使う。新しい保存フィールドはない。既存の `choices._peddlerStock` と `reward.cards` に交換後の3枠、`player.mainBoard` に盤面を保存する。交換の都度、既存の `_persistCurrentShopStock()` → `_syncWaveFacilityCache()` で店の枠を同期する。
- 旧セーブ：5枠・価格あり・道具ありの在庫は一度だけ共通抽選の3枚へ移行する。旧枠の未購入通常カードだけ抽選在庫へ返し、盤面・所持金・所持道具は保持する。復元時に開始スナップショットも更新し、「元に戻す」で旧5枠が復活するのを防ぐ。同じ旧セーブを再読込しても同じ移行結果になる。
- 再戦→再敗北：従来どおり、ライフが残る敗北のたびに新在庫を作る。前の行商人の交換後在庫は持ち越さない。鍵は `exchange-peddler:<wave>:<stage>:<敗北回数>`（ランの種は `runWithKeyedRandom` が含める）。同じ場面の再表示・保存復元では再抽選しない。
- 祝福：共通の `drawRewards` → `towerBoonGeneratedOffers` を通すため、生成時の祝福・撃破済みボスの出現は魔導店と同じ。交換で渡した既存個体に祝福を付け直さず、個体の強化情報と一緒に移動する。店での祝福7の再抽選は魔導店と同じく対象外。
- 会話の初回記録、camp、MC025、BGMなし、行商人見出し、同じ戦闘への再戦は既存の経路を維持。`index.html` は変更した本体5JSの `?v=` だけを更新し、CSSは変更していない。
- ボット：行商人も `exchangeCards(source)` → `exchangeChoices` / `lookahead.chooseExchange` → `exchangeShopCard` を使う。行商人の道具購入を撤去し、提示・取得・交換・返した提示を `peddler` / `peddler_return` として記録する。`run_bot.js` の本体ハッシュ対象に `peddler.js` も追加。`run_report.js` / `shop_exchange_report.js` / `RUN_BOT.md` の旧案内も更新し、過去の5枠記録を集計する場合は当時の案内を残す。

更新した検査は `run_bot_selftest.js`（行商人3枚、購入なし、交換記録と取得記録の一致）、`tools/parity/defeat_peddler_check.js`（3枚、価格/道具枠なし、交換と取り戻し、保存復元、再敗北。会話・背景・再戦の検査を維持）、`tools/parity/sale_library_price_1011_check.js`（行商人も価格・不足札なし、マナ/血の表示と道具屋/鍛冶屋の検査を維持）。追加した `peddler_exchange_selftest.js` は本体のイベント・ドラッグ受け口・保存復元・旧セーブ・再敗北・祝福をNodeで検査し、周回自己検査からも実行する。

ブラウザのセーブ契約検査は `Chromeへ接続できない` で開始できなかった。追加/更新したブラウザ検査と画面・実ポインター操作・音は未確認。保存データと操作の判定はNodeの本体関数で確認している。

最終検証：変更した全12JSの `node --check` と `git diff --check` は合格。`tower_boon_check.js` は18項目、`VB_REPORT_PATH=/tmp/vb-balance-report.md node tools/balance_sim/run.js 5` は100カード×5試行、指定の `run_bot_selftest.js --input tools/balance_sim/out --variant tools/balance_sim/out/r1_evaluation` は78項目が合格した。自己検査のハッシュ・保存JSONLとの完全一致を維持するため、同じ条件の400周＋比較用200周を再生成し、集計も更新した。計600周の行商人1,193回来訪・交換1,242回はすべてゴールド差分0。結果は `out/SELFTEST.json`、記録は両フォルダの `runs.jsonl` / `meta.json`。

追加確認：魔導店を変更前の関数とPvE・オンライン各30seedで比較し、在庫・抽選消費・G全体が一致。`shop_exchange_selftest.js` 18項目、`peddler_exchange_selftest.js` 9項目、図書館/売却回帰16項目、Q001回帰18項目、敗北/再戦/保存回帰21項目も合格。基本4方針もseed 4001で行商人3枚とカード売買なしを確認した。`REPORT.md` は変更せず、単体戦闘レポートは指定の `/tmp/vb-balance-report.md` に出力した。

## 祝福・報酬・交換操作・獰猛・合体停止（2026-10-18）

対象はPvE。`core.js`、オンラインのソース、送受信、シート、素材、docs/は変更していない。

|項目|変更ファイルと要点|
|---|---|
|祝福の再入場|`tower_boon.js`：`towerBoons.visitChoices[wave]` に3択を保存。最初に開いた時だけ訪問数を進め、塔チェックポイントへ保存する。購入後・再入場・読み直しでも同じ並び。旧セーブは最初の入場で補う。購入数・再抽選数は既存の `towerBoons` 保存を使用。|
|報酬の再抽選|`reward.js` / `card_reveal.js` / `index.html`：現在のカード位置・寸法で既存めくり台を作り、全札の裏返し完了後に新しい表へ差し替える。最高レアの左端1枚だけ既存のレアリティ演出。他は通常めくり。大きな中央表示・画面の揺れは使わない。抽選と保存は同期し、DOM・演出待ちは保存しない。|
|取得後のマナ・血|`reward.js` / `index.html`：取得済みの報酬カード左上のマナ・血バッジを既存の50%暗転層の下へ置く。返却・リセット・次画面で解除。|
|双方向交換・発光|`reward.js`：商品→魔導板と魔導板→商品を `canExchangeShopCardAt` / `exchangeShopCard` へ統一。可否判定が通る相手だけ既存の `.drag-over` で発光。依頼枠・刻印・空きマス拒否も共有し、ドラッグ終了で片付ける。|
|アイテム売却|`reward_items.js` / `reward.js`：魔導店・行商人の手持ち道具の売価/売却ボタン、旧購入印による返品、商品枠への売却待ち移動を禁止。道具屋・鍛冶屋・デバッグの従来売却は維持。|
|獰猛|`render.js` / `formation.js`：編成の虹の瞳がHP正の体しか数えず、`_deployedAtZeroHp` を落として色数を減らしていた。表示用の写しでこの体も色数に含め、枠溢れは数えない。出発可否は共通編成の写しへコアの `coreApplyOpeningRingsToUnitEarly` を適用してHP正・封印なしを確認。`buildBoardFormation` 本体・コア入力はそのまま。色瞳単独・虹・鏡の写しも回帰検査する。|
|合体停止|`pool.js` の **`PANEL_MERGE_TRIAL.enabled = false`** が唯一の停止設定。`reward.js` で3枚合体・2枚レシピ・取得予告、`reward_items.js` で絆の巻物の使用、`map.js` で図書館の合体案内、`collection.js` で合体プレビューを止める。trueで復帰。既存合体済みの数値・本文・枠は保持する。|

合体関連品の判断：魔鏡と絆の巻物は通常の報酬・店の新規抽選から除外した。既存所持・既存在庫は削除せず、魔鏡は通常カードとして移動/交換でき、絆の巻物は消費しない。戦闘結果を変えないため、錬成・終戦などコアが与える絆の巻物の抽選は維持し、受け取っても使用不可とする。道具屋では、関連品の新規抽選除外以外の売買処理は従来どおり。

オンラインにも `online/flow.js` → `map.js` の店・塔と、共通 `reward.js` の報酬/編成画面がある。オンラインでは従来の5枠売買・アイテム売却・合体・表示・祝福再入場/再抽選を維持する。PvEだけの切替は共通の入口で行い、送受信へ分岐を追加していない。

ボットは `policies.js` の同名素材加点を停止設定に従わせ、メタデータに試験設定を記録。`run_bot.js` の本体ハッシュへ表示側 `render.js` も追加した。`out/` 400周と `out/r1_evaluation/` 200周を同じseed 4001〜4200で再生成し、旧記録は `/tmp/vb-trial-previous-output/` に保持。集計・CSV・自己検査も更新した。固定祝福比較は再計算し、5種の評価値は変更前と一致した。

追加検査：`tower_boon_visit_selftest.js`（5項目）、`formation_eye_preview_selftest.js`（4項目）、`pve_trial_selftest.js`（10項目）。最初の2本は現在の検査へgit HEADの旧関数だけを差し戻す方法でも失敗を確認した。

更新した既存検査：`run_bot_selftest.js`、`ui_library_1011_regression.js`、`quest_q001_regression.js`、および parity の `tower_boon_check.js` / `sale_library_price_1011_check.js` / `shop_ui_visual_check.js` / `triple_merge_frame_visual_check.js` / `library_test_battle_1012_check.js` / `skilled_keywords_1012_check.js`。停止時の拒否を検査し、復帰スイッチを明示的に戻した場合の既存合体・祝福継承・案内・枠の検査も残している。出撃生成は変更前の関数本体ハッシュを固定し、出発可否の更新と区別した。旧seedで自然発生しなくなった上限到達は、倒し切れない体を本体の開戦入口へ渡す制御例に置き換え、コア上限→周回終了→資源記録の検査を維持した。

指定検査は全て合格。`tower_boon_check.js` 18項目、単体比較100カード×5試行、オフライン/オンライン95カード一致、card core smoke 161件、周回自己検査98項目、行商人9項目。追加で効果監査・イベント回帰・資源パリティ・静寂308条件・オンラインpayload/receiver・交換店18項目・図書館16項目・Q001 18項目も合格した。

ブラウザ：`save_contract_test.js` は「Chromeへ接続できない」で開始できなかった。以後は無理に起動していない。更新したブラウザ検査、実表示、実ポインター操作、VFX/SEの見た目と音は未確認。`skilled_keywords_1012_check.js --syntax-only` は生成するブラウザ内スクリプトも含めて合格。

最終確認：旧形式の売却待ちアイテムを直接渡す経路（`_sellPendingShopCard` / `_shopCardSellGain` / `_mkRewDiv`）も交換店では拒否する。追加ガード後に600周を再生成し、追加前のJSONLと全件バイト一致、最終ソースのハッシュ一致、周回自己検査98項目を確認した。変更した全26JSの `node --check`、本体9JSの `?v=` 更新、`git diff --check` も合格。

## 祝福ごとの購入回数で値上げ（2026-10-18 追加依頼）

- 原因：`tower_boon.js` の表示と支払いが、いずれも合計の `towerBoons.purchases` を価格曲線へ渡していた。
- 本体：`towerBoonChoicePrice(id)` を共通入口とし、PvEは既存の `towerBoons.counts[id]` から価格を決める。`towerBoonChoose` と `renderTowerBoonChoices` がこれを共用する。価格曲線は `TOWER_BOON_CONFIG.firstPrices = [200, 500, 1000]`、`priceStep = 1000` のまま。未購入の別祝福は200Gで、買った祝福だけ次の価格へ進む。`index.html` の該当 `?v=` も更新した。
- 保存：既存の `towerBoons` に祝福別回数と塔別の並びが一緒に保存されるため、保存形式・新規フィールド・移行処理は追加していない。合計購入回数は記録用として残す。旧セーブも既存の祝福別回数を使用し、過去の支払額は変更しない。
- オンライン：同じ `openTowerBoonSeat` / `renderTowerBoonChoices` の画面がある。共通価格入口で従来の合計購入回数を使い、価格・支払いを維持する。オンラインのソース、送受信、戦闘コアは変更していない。
- ボット：`bot_boons.js` が毎回、各候補の本体価格を確認し、80Gを残せる候補だけ評価する。高い祝福が買えなくても安い別祝福を選べる。plannerもこの候補群を本物の購入処理で評価する。`fixed_boons.js` の1回購入も同じ価格入口を使う。`run_bot.js` のメタデータは `botVersion: 9`、`towerBoon.priceBasis: 'perBlessing'`。訪問の `prices` は候補別価格、`nextPrice` は最安値、購入の `price` は実際の支払額。
- 集計・手順：`boon_report.js` / `planner_report.js` / `planner_r2_report.js` / `TOWER_BOON_SIM.md` を新価格へ更新。旧形式の報告を生成する時は当時の価格説明を維持する。
- 検査：`tools/parity/tower_boon_check.js` に「ある祝福を買っても、別の祝福の値段は上がらない」、候補別の表示・購入不可、オンライン従来価格を追加。保存復元でも各価格とゴールドを照合する。追加した価格独立の検査は修正前に `mana: 500 !== 200` で失敗し、修正後に合格した。
- `tower_boon_visit_selftest.js` は購入後・再入場・復元・旧セーブで1000G/500G/200Gの並びを照合し、6方針の資金280Gの例で未購入の200Gだけを買い、80Gを残すことを検査する。`run_bot_selftest.js` は主比較・第1段比較の全記録を購入順に再構成し、各候補価格・各支払・祝福別回数・最低価格の記録を照合する。既存のハッシュ検査と保存JSONLの完全一致は維持した。

変更前の主比較400周と第1段200周の `runs.jsonl` / `meta.json` は `/tmp/vb-before-boon-price-1018/` に保持している。

最終検証：変更した10JSの `node --check`、塔の祝福21項目、単体比較100カード×5試行、オフライン/オンライン95カード一致、card core smoke 161件、指定の周回自己検査104項目、行商人9項目が合格。主比較400周＋第1段200周の計600周・9,048戦で、現行ソース/ツールのハッシュ一致と3ケースの保存JSONLとの完全一致も確認した。6方針の購入判断を含む訪問検査11項目とオンラインpayload/receiver（NG 0）も合格。固定祝福評価は5種とも変更前と一致した。

自然周回の祝福購入は663回。他の祝福を購入済みでも未購入の祝福を200Gで買った例は276回、同じ祝福の追加購入500Gは6回。1000G以上の自然周回は未観測だが、価格曲線・候補別表示・保存復元は制御検査で確認した。集計と検査記録は `out/RUN_REPORT.md` / `out/VALIDATION.md` / `out/SELFTEST.json`。ブラウザの実表示・操作・ブラウザでの保存復元は未確認。
