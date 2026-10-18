# 自動周回ボット

Node標準機能だけで動く。ブラウザ・サーバー・npm installは不要。本体、マスターxlsx、内蔵CSVは書き換えない。`out/` は今回依頼された検査成果物。

```sh
node tools/balance_sim/run_bot.js --runs 200 --policy lookahead,planner --seed 4001 --workers 4 --tower-boon on --out tools/balance_sim/out
node tools/balance_sim/run_bot.js --runs 200 --policy planner --planner-stage r1 --seed 4001 --workers 4 --out tools/balance_sim/out/r1_evaluation
node tools/balance_sim/run_bot_selftest.js --input tools/balance_sim/out --variant tools/balance_sim/out/r1_evaluation
node tools/balance_sim/run_report.js --input tools/balance_sim/out
```

第2段の集計は学習種1001〜1040とは重ならない種4001〜4200で、lookaheadとplanner各200周の計400周。同じ種の第1段200周も別フォルダに保存する。基本4方針は再実行しない。交換店・指輪必須・祝福の座あり。前回の `out/` 全32ファイルは `out_planner_r1/` にバイト一致を確認して退避した。その前の900周・28ファイルも `out_before_planner/` に残す。第1段の評価・抽出は [PLANNER.md](PLANNER.md)、山場と学習は [PLANNER_R2.md](PLANNER_R2.md)、成績は `out/RUN_REPORT.md`。

`--policy lookahead,planner` のようにカンマで複数方針を指定できる。`--runs` は方針あたりの周回数で、`all` のlookaheadだけは `--lookahead-runs`（既定100）を上限にする。敵サンプルは `--lookahead-samples 3`、独立Nodeプロセスは `--workers 4`（既定1）。各ランは直列実行と同じ結果になり、JSONLは方針・seed順で結合する。

以前のoverride例を新しいボットで取り直して比較する場合：

```sh
node tools/balance_sim/run_bot.js --runs 100 --policy greedy --seed 1 --override tools/balance_sim/overrides/numeric.json --out tools/balance_sim/out/override_numeric
node tools/balance_sim/run_bot.js --runs 100 --policy greedy --seed 1 --override tools/balance_sim/overrides/add_enchant.json --out tools/balance_sim/out/override_add
node tools/balance_sim/run_bot_selftest.js --input tools/balance_sim/out --variant tools/balance_sim/out/override_numeric --variant tools/balance_sim/out/override_add
node tools/balance_sim/run_report.js --input tools/balance_sim/out --compare tools/balance_sim/out/override_numeric --compare tools/balance_sim/out/override_add
node tools/balance_sim/run_report.js --input tools/balance_sim/out/override_numeric
node tools/balance_sim/run_report.js --input tools/balance_sim/out/override_add
```

`all` は `policies.js` の全評価関数。同じ方針・seed・override・サンプル数・ツール/データ版ならJSONLの内容が一致する。時刻と所要時間はJSONLに入れず `meta.json` に分離している。既存の出力先を指定すると `runs.jsonl` と `meta.json` は置き換える。第1段の `out/override_*` は旧ボットの記録なので、今回の通常集計・自己テストに自動では混ぜない。

`--story-cycle 1`（既定）は初回の旅程で、ステージ4の塔がゴール。`2` は2周目の通常踏破。五聖の座を選ばないため隠しステージ5には進まない。初回ホーム・酒場は本体の会話コールバックを実行するが、本体にカード・ゴールド配布は存在しない。通常クエストは本体どおり2周目の酒場から受け、カード受領・受託・塔/街での達成と回収を本体に任せる。Q003は自己テストで実際の受領と100G支払いを確認する。追撃戦と専用塔出発イベント型はAIが選ばず理由を記録する。

追撃戦は通常マスの再戦と異なる専用戦闘・敗退後の進行を必要とし、塔出発型は同行者を残す／捧げる等の分岐選択がある。これらの操作AIと旅程監査は未実装なので、受託前に除外する。効果だけを検査側で配布する代用は行わない。闘技場・五聖の座・ポータル帰還も今回の通常踏破には含めない。画面・音・セーブ復元・人間のプレイ時間は再現しない。

## ファイル

|ファイル|役割|
|---|---|
|run_bot.js|CLI、1周の進行と記録。APIは `initialize()` / `simulateRun(options)`|
|policies.js|6方針の評価関数、配置・接続・前後衛の評価、合法スワップ|
|lookahead.js|次戦をコアで試す報酬・魔導店の交換・配置・必須の指輪交換の探索|
|synergy.js|効果文・本当のキーワードから供給/需要を抽出。抽出表と未対応表のCSV|
|planner.js|9種の型、役割/接続の評価、本体の出現率と残り旅程から入手見込みを計算|
|planner_report.js|同じ種のlookahead→planner比較、型・組合せ・実際の投資の追跡|
|planner_selftest.js|主要カードの分類、未所持の相手への投資、型の更新・接続・隔離の制御検査|
|bot_sandbox.js|G・提示・乱数を隔離、別seedの敵生成と本番computeBattleでの試行|
|bot_items.js|実プレイと先読みが共用する本体アイテム使用の操作|
|bot_batch.js|独立Nodeプロセスで周回を分担し、順序を固定して結合|
|bot_runtime.js|load.jsを利用する周回専用の受け口。既存の単体検査には導入しない|
|bot_override.js|ロード後のプールの変更・追加・復元|
|bot_probe.js|効果文あり／なしを実際のコアで比較する解釈プローブ|
|run_report.js|JSONLの集計、CSVとMarkdown、同一seedの仮変更比較|
|shop_exchange_report.js|旧店→交換店の成績・資源・指輪の比較。難易度曲線はboon_reportを共用|
|shop_exchange_selftest.js|交換・換金廃止・旧セーブ移行・必須指輪・アイテム売買とオンライン維持の実行検査|
|run_bot_selftest.js|全記録の階層・敵・旅程、再現性、解釈、集計、仮変更差の検査|
|overrides/*.json|各100周に使った、数値1枚変更／仮エンチャント1枚追加の例|

## 本体を呼ぶ場所

- 開始・旅程: `startGame` → `_startWaveFlowNext`。勝利は `finishWaveBattleVictory`、敗北とライフ減少・再戦は `_finishWaveBattleDefeat`。初回クリアは本体が呼ぶ `gameOver({clear:true})` を捕捉。
- 戦闘: `startBattle` → `applyNewPanelBattleStart` → `buildBoardFormation`。表示待ち入口だけ置換し、`_createPveCoreState` → **本番セーブ用の `SaveRun.computeBattle`** → `createBattleRunner` → `runBattleCore`。攻撃順・対象・数値・勝敗・敵撃破ゴールドを検査側で計算しない。本体の500手上限を使用。
- コア結果: `_syncCoreResourcesToG` / `_syncCoreLifeToG` / `_syncCoreManaToG` / `_syncCoreBloodToG`、`_persistPermanentStatOrWarn` / `_persistPermanentEffectDamageOrWarn`、帰滅は本体の片付け。終戦を二度実行しない。
- 報酬: 本体から復元した `goToReward`（`drawRewards` / `_arrangeRewardRarity` / `runWithKeyedRandom`）、`takeRewCard` / `placePendingPanelToSelectedUnit`、本体の2枚・3枚合体。
- 施設: `openMapVillage` / `villageFacilityList` / `_villageFacilityDisabled`、`openMapShop` / `openMapItemShop` / `openMapForge` / `applyPendingMapForgePower` / `openMapRingExchange` / `_discardBoardCardForRingOffer`。
- 指輪: 空DOM上で本体の `drop` ハンドラを呼ぶ。宿: 会話選択の返答だけ自動化し `_runVillageInnDialogue` を使う。アイテム: `_useImmediateItem` / `handlePendingItemBoardTarget` を使う。
- 交換: `canExchangeShopCardAt` / `exchangeShopCard` が本体の唯一の入口。基本方針は盤面評価が正に改善する組合せを選び、lookaheadは店3枠×占有マスの全合法候補を次戦で試す。戻ったカードは新しい提示IDで記録する。カードの売却・購入・購入資金用の売却計画は持たない。道具の購入は残す。
- 行商人: `defeatPeddlerPending` / `runDefeatPeddlerEvent` / `_buildDefeatPeddlerStock`。ライフが残る敗北ごとに、魔導店と共通の `_drawExchangeShopStock` から価格なしの3枚を提示する。魔導店と同じ `exchangeCards` の判断で本体 `exchangeShopCard` を呼び、カード・道具を購入しない。提示・取得・交換の記録には `source:'peddler'` を残す。
- クエスト: `_qStartDialogue` の待ち時間を飛ばしonLine/onDoneを実行、`openTavern` / `takeRewCard` / `_qAcceptTavernQuest` / 本体の到着・死亡処理。依頼を検査側で報酬へ変換しない。

上書き・省略の一覧は `bot_runtime.js` の `BYPASSES` / `NOOPS` と、出力 `meta.json` / `RUN_REPORT.md` に列挙。`load.js` と `stub.js` 自体は変更していない。

## 方針と配置

- `greedy`: ATK+HP、レア度×2、効果文3、キーワード数×2。エンチャントは隣接能力値+5も加点。
- `color`: 同じ基本評価に、最初に配られたキャラクターと同色なら+18、異色キャラは-8。
- `enchant`: 基本評価にエンチャント+16。主力本体に接続する強化網の評価を1.8倍。
- `mana`: 基本評価にマナ効果またはマナ獲得の文言があると+18。マナ本体は後衛を加点。
- `lookahead`: 上記の基本評価で候補を絞り、実際のコアで **勝率→行動可能な味方の残HP合計→与ダメージ** の順で比較する。封印中のHPはコアの `coreLivingUnits` に従って除外する。
- `planner`: 同じ次戦試行を連続点へ変換し、既存の組合せ、将来の相手の入手見込み、9種の型、今後の祝福の価値を加える。報酬・交換・還魂・指輪・祝福・再抽選・配置で共用する。トリプル専用の収集加点はしない。

本体の接続探索を使い、実際に接続する場所を選ぶ。向きは提示されたままで、通常プレイにない回転はしない。基本4方針は前衛のHPを加点し、最大3回の合法スワップで改善。再戦では基本評価を大きく落とさない別配置を探す。全員封印となる配置を大幅減点する。報酬は1枚、店はカードを減らさない1対1交換。祭壇は交換必須で、キャラ・強化の両方から低い盤面評価損失の3枚組を選ぶ。最後の出撃キャラを残して3枚払えない場合だけ免除する。lookaheadは基本評価上位3組と各指輪の組合せを次戦で評価し、交換前より弱くなっても必ず交換する。ポータル・破壊アイテムは選ばない。

lookaheadは次の戦闘マスを本体旅程から求め、敵を別seedで3回生成する。再戦時は本体が保存した既知の敵に対し3つの戦闘seedを試す。候補間は共通の敵サンプル。全試行でG・報酬提示を複製し、Math.randomと開戦一時状態を退避・復帰する。`G._runRngState` と提示のIDも実ランへ戻す。キャッシュは1ランごとに破棄する。自己テストで元オブジェクト・内容・乱数消費が変わらないことを確認する。同一プロセスで試行を並列実行してはならない。

計算量を抑える既定値は敵3例、報酬カード上位5枚、各報酬の基本配置上位1箇所＋前衛/後衛、盤面配置替え上位5件＋分散4件、配置改善2回、必須還魂の基本評価上位3組、基本4方針の完成盤面4案。魔導店では全合法交換を試す。再戦時か見積り勝率100%未満で単一スワップに改善がなければ2スワップも6件まで試す。改善がない場合は配置を維持し、検討と実変更を別々に記録する。

今回の実測値は `out/RUN_REPORT.md`。lookaheadは次の1戦を試す。plannerの既定は第2段で、次のエリート/ボスの敵と、山場までの実抽選で近づけた盤面もコアで試す。係数は40種の学習で選んだ `planner_weights.json` を読む。`--planner-stage r1` は前段の固定係数・山場なし。手順・上限・近似の範囲は `PLANNER_R2.md`。全配置・複数交換手順の組合せ・トリプル専用の計画は行わない。

基本評価関数は `policies` に `{description, score(card, context)}` を足す。context.color は初期キャラの色。lookaheadとplannerは `lookahead.js` の探索入口を共用し、未提示の報酬・未来の在庫・実ランの将来の敵抽選を参照しない。

## override

```json
{
  "change": [{"name":"ギガンテス","power":3}],
  "add": [{"category":"エンチャント","name":"仮・共鳴","desc":"攻撃：ランダムな敵に5ダメージを与える。","rarity":1,"grade":1}]
}
```

変更できる主な属性: `power` / `life` / `desc` / `rarity` / `grade` / `keywords` / `color` / `directionCount` / `cost` / `initial`。`change` は名前（必要ならcategoryも）で1枚に限定する。追加はキャラクター／エンチャント。省略時はgrade1・rarity1・2ポート・報酬/ショップ対象・初期配布対象外。追加キャラの能力は必ず明記する。指輪・アイテムの変更も可能だが既存のeffectKey/nameに依存するため、文面変更だけでは効かない場合がある。

効果文の派生値は `loader.js` に閉じた**既存パーサーをそのまま評価**して再生成する。将来その関数群の境界が変われば検査を失敗させる。自作の効果パーサーは持たない。既存カードの合体効果は元の `mergedForm` を維持する。変える時は `mergedDesc` と `mergedKeywords`（文字列配列）を指定する。

`desc` を変えたカードは、同じ本体と敵・マナ0/50・低/高被ダメージの4条件で「効果あり／なし」を比較。反応しなければ **「コアが解釈しない、またはプローブの発動条件外」** を報告する。一部が解釈されても全文章の保証はしない。カード固有の条件・特定の味方・召喚等を全て網羅する静的検証器ではない。例の+100/+100は差の検出を確かめる極端な試験値で、調整案ではない。

## 出力と解釈

1周=1行のJSONLには、方針・seed・終了状態・初期/最終盤面・提示と採用・全戦闘の敵と勝敗・再戦・旅程・資源推移・死因の戦闘・実際につながった組合せを残す。`coreLifeAfter` はコア終了時、`lifeAfter` は敗北ペナルティも反映した値。timeout/stalled はゲームオーバーと区別する。

CSVは `policies` / `stages` / `resources` / `cards` / `characters` / `enchants` / `rings` / `items` / `combos` / `archetypes` / `never_adopted` / `noncontributing`。主評価用に `lookahead_cards` / `all_policy_cards` / `lookahead_failures` を出す。`--compare` 指定時は `override_comparison` も生成。カード・組合せには `all` と方針別の行がある。母数20未満は母数不足。未採用の成績は空欄。

採用率は提示機会を母数にし、採用ランの成績と保持率はユニークなランを母数にする。初期強制採用と直接付与は別列にも残す。後半カードの成績には生存者の偏りがあり、採用の成績差から因果的な強弱は断定できない。アイテムは使用すると最終所持率が下がる。

クリア率が低い時は強いプレイヤーを代表する評価として扱わない。クリアが無ければその事実を維持し、健全性検査の制御フィクスチャによるクリアは通常成績に混ぜない。低率の場合、頻出敗退地点・敵編成・実際の魔導板・残敵HP・不足と探索の限界を診断へ出す。

## 検査

`run_bot_selftest` は出力済みJSONLを全件監査し、lookaheadを含め各方針の代表seedを別ランを挟んで2回再実行する。記録のある方針ではクリアseedを優先。G・提示・ラン乱数の隔離、再編成の実変更、カード売買の不存在、交換・祭壇の必須化と不足例外、旧5枠セーブ移行、オンラインの従来売買、行商人の回数と品揃え、Q003の受領・100G・回収・二重払いも確認する。第2段では旧ボットのoverride記録を自動で混ぜない。追加対象は `--variant <フォルダ>` を複数指定。`SELFTEST.json` を出してから `run_report.js` を呼ぶと結果がMarkdownへ入る。

```sh
node --check tools/balance_sim/run_bot.js
VB_REPORT_PATH=/tmp/vb-existing-balance-report.md node tools/balance_sim/run.js 5
node tools/balance_sim/selftest.js
git diff --check
```

調整用定数: `MIN_SAMPLE=20`、`MAX_ACTIONS=300`、基本配置改善3回、lookaheadは `DEFAULTS`（samples=3、cardCandidates=5、placements=1、swapCandidates=5、arrangePasses=2、ringPlans=3、layoutCandidates=4）。戦闘上限は本体の `BATTLE_CORE_TURN_LIMIT`。Node専用ファイルなのでindex.htmlへの読み込みやキャッシュ版追加は不要。
