# 祝福の座を含む検査

本体 `js/engine/tower_boon.js` と `TOWER_BOON_CONFIG` をそのまま利用する。価格・支払・効果の規則はボット側へ複製しない。2026-10-18の追加依頼で本体を祝福別価格へ変更し、ボットも同じ入口へ追随した。シートは変更していない。

## 実行

```sh
# 標準盤面は第3段の20枚をそのまま使用する
node tools/balance_sim/fixed_boons.js --workers 4
node tools/balance_sim/run_bot.js --runs 200 --lookahead-runs 100 --policy all --seed 1 --workers 4 --tower-boon on --out tools/balance_sim/out
node tools/balance_sim/run_bot_selftest.js --input tools/balance_sim/out
node tools/balance_sim/run_report.js --input tools/balance_sim/out --no-boon tools/balance_sim/out_no_boon

# 取り込み後の本体でカード比較も更新する場合
node tools/balance_sim/fixed_compare.js --workers 4
node tools/balance_sim/fixed_selftest.js

# 現在の本体で施設を使わない対照。退避した旧記録は上書きしない
node tools/balance_sim/run_bot.js --runs 200 --policy all --workers 4 --tower-boon off --out /tmp/balance-no-boon
```

既定は `--tower-boon on`。今回は旧 `out/` の全ファイルをバイト一致確認のうえ `out_no_boon/` へコピーし、新しい `out/` を作った。旧1000周・報告・旧override記録を残している。標準盤面の元JSONLは、自己テストが元hashと一致する退避データから解決する。

## 追加・変更

- `bot_boons.js`: 祝福の選択・購入回数・資金温存・弱い報酬の再抽選というAI判断。
- `run_bot.js`: 塔の施設末尾で訪問、祝福・ボス由来カードの記録、撃破ボス記録の本体呼び出し、on/off。
- `bot_runtime.js`: 本物の入口を呼ぶための空DOMと描画の無処理化。
- `bot_sandbox.js`: lookaheadの予測用に固定比較と同じ表示フレーム省略computeを使用。
- `bot_batch.js`: on/offを子プロセスへ渡す。
- `fixed_boons.js` / `fixed_worker.js`: 祝福1〜5の固定盤面比較。
- `boon_report.js` / `run_report.js`: なし→あり、難易度曲線、購入・購入順・再抽選・ボス提示の集計。
- `boon_shop_probe.js`: 祝福6の魔導店生成から最終提示までを固定seedで照合する制御検査。
- `fixed_compare.js` / `fixed_engine.js`: 本体hashに祝福施設を加え、旧標準盤面の選定元と今回の計算元を区別して保存。
- `run_bot_selftest.js` / `fixed_selftest.js`: 祝福の本体経路・価格・再現性・off・付与・コア一致を追加。
- `fixed_report.js`: 全体・4場面別報告に「祝福の価値」を追加。

## AIの規則

番号は `TOWER_BOON_CONFIG.blessings` の順。1=stats、2=modifiers、3=damage、4=mana、5=familiars、6=bosses、7=rerolls。

|方針|優先順位|残す額|1訪問の購入上限|
|---|---|---|---|
|greedy|1→3→7→2→5→6→4|80G|2|
|color|1→2→6→3→5→7→4|80G|2|
|enchant|3→2→7→5→1→4→6|80G|2|
|mana|4→5→6→1→2→3→7|80G|2|
|lookahead|固定盤面の値を利用（下記）|80G|2|
|planner|次戦・祝福の将来価値・第2段では山場の予測で比較|80G|2|

基本方針の点数は優先順位の先頭から7〜1点を与え、`その祝福の既購入数+1` で割る。現在の3択だけから選ぶ。施設は他の既存施設の訪問後で、購入後にも次の街の買い物用80Gを残す。次戦がない終点では買わない。同じ訪問の選択肢は購入後も同じで、本体どおり重ね買いを許す。価格は毎回 `towerBoonChoicePrice(id)` から読み、支払と更新は `towerBoonChoose` に任せる。greedy・color・enchant・mana・lookahead・plannerの全方針で、候補ごとに価格を確認して80Gを残せる候補だけを評価する。高い祝福が買えなくても、別の200Gの祝福を選べる。

PvEの価格は **祝福ごとに200G→500G→1000G→以後+1000G**。`towerBoons.counts[id]` を使い、未購入の祝福は他の購入で値上がりしない。`towerBoons.purchases` は全購入回数の記録として残し、価格には使わない。例：statsを2回・manaを1回購入した後は、stats=1000G、mana=500G、他は200G。オンラインにも共通の祝福画面があるが、従来の合計購入回数による価格を維持する。

購入回数と塔別の3択は既存の `towerBoons` 保存対象に含まれるため、新しい保存フィールドや移行処理は不要。同じ塔の再入場・保存復元では並びも各価格も保持する。旧セーブも既にある `counts` を使う。既に支払ったゴールドの返金・再計算はしない。

ボットの訪問記録には `prices`（3択それぞれの価格）を保存し、`nextPrice` はその最安値を表す。購入記録の `price` は購入した祝福の実価格、`purchaseNumber` は全購入順、`counts` は購入後の祝福別回数。メタデータの `towerBoon.priceBasis = 'perBlessing'` で従来の合計価格記録と区別する。

lookaheadは将来の提示を仮生成する方式を採らず、`fixed/boon_values.json` にある祝福1〜5の4場面平均勝率差を使う。負の値は0にし、既購入数+1で割る。6は撃破済みボスがある時だけ最大値×0.25、7は最大値×0.5というAI上の推定値を使う。6・7の係数は固定戦闘で測った値ではない。これらの設定は `bot_boons.js` の `SETTINGS` / `LIMITS`。

再抽選は本体 `towerBoonCanReroll` が許す報酬だけ。基本方針では最良の配置改善点が12未満、lookaheadでは最良の取得でも次戦の勝率→残HP→与ダメージが現状を改善しない場合に使う。本体 `towerBoonRerollRewards` を呼び、1報酬の使用上限は3回。破棄前の提示も提示回数に数える。権利の付与・持越し・消費・再抽選seed・元在庫への返却は本体が処理する。

## 本体の受け口

入口は本物の `openTowerBoonSeat`。最初の訪問だけ `towerBoonRollChoices` で抽選し、以後は `towerBoons.visitChoices[wave]` を使う。`scr-village` と戻るボタンの空DOMを供給し、`renderTowerBoonChoices` / `towerBoonSyncRerollButton` の描画だけを省く。購入は `towerBoonChoose`、価格は `towerBoonChoicePrice(id)`。`towerBoonPrice(n)` は価格曲線だけを決める。効果量・本文の書換え・ボス混入確率・再抽選は検査側で実装しない。

本番の保存再生経路が呼ぶ `towerBoonRecordBattleDeaths` は、周回のコア結果と開戦/最終敵の記録へ呼ぶ。報酬・店・行商人は元の抽選が `towerBoonGeneratedOffers` / `towerBoonBlessGeneratedCard` を呼ぶので、そのまま出現・付与する。ボスはエンチャント枠も置き換え得るため、行商人の検査ではその置換を許す。

lookaheadの予測戦闘では、固定比較の `fixed_engine.fastCompute` を再利用し、中間の表示フレーム保存を省く。戦闘ステップ・対象・数値・資源処理は本体のソースのまま。実戦の `SaveRun.computeBattle` は元の関数を使う。試走2周で省略前後の全JSONが一致し、自己テストでも本体のイベント・最終状態と照合する。

## 固定盤面の祝福比較

保存済み20盤面を複製し、本体で1回購入した状態を作ってから各カードへ `towerBoonBlessGeneratedCard` を呼ぶ。元盤面、所持金、指輪、開戦アイテムを固定する。価格を含まないカード効果の比較であり、購入後に生成されるカードを順次集める実周回とは分ける。

各祝福×各盤面を30敵サンプル（seed7411、評価用）で測る。基準と同じ敵/戦闘seedを使い、勝率差・生存HP差・与ダメージ差を計算する。盤面は等重み、95%区間は共通seedの対応と盤面間相関を保持した正規近似。既存の合体・永久強化後のカードに付与するので、取得前からの合体や強化の履歴を再演した結果ではない。6・7は固定戦闘では測らない。

新しい出力は `fixed/boon_values.json`、`boon_comparisons.jsonl`、`boons.csv`、`boon_boards.csv` と、全体・各場面の `FIXED_REPORT.md` 内の節。元の `boards_*.json` は変更していない。

## 周回の比較出力と限界

`out/RUN_REPORT.md` に、全記録と共通seedの比較を分けて記載する。新規CSVは `boon_before_after.csv`、`difficulty_curve.csv`、`boon_purchases.csv`、`boon_orders.csv`、`boon_sequences.csv`、`boon_usage.csv`。

難易度曲線は各マスの初戦だけ。旧記録との共通定義として、敵の開始時ATK/HPと魔導板キャラ本体のATK/HP（予備を含む）を使う。指輪・接続・開戦効果後の戦闘値ではない。後半は脱落により比較対象のランが異なる。購入ランの成績には生存者・他の祝福の偏りもある。

自然周回の購入価格・祝福別の回数は `out/` と `out/r1_evaluation/` のJSONLに記録する。価格上昇後の追加購入が少ない場合、その成績の解釈には限界がある。購入上限2回、別祝福の価格独立、資金不足時の候補選択、保存復元・再訪問はNodeの制御検査でも確認する。先読みは祝福の値を同じ盤面群で測った平均の規則であり、将来の入手枚数や全提示を最適化する計画ではない。画面・音・ブラウザ実機は未確認。

## 本体側の未解決点

祝福6の魔導店のボスは、`_ensureWaveShopStock` / `towerBoonMakeBossCard` で生成されても `openMapShop` の `shopAllowed` にある `_isImplementedPoolCard` で除外される。ENEMY_POOLから作ったボスに `_sheetSeen` がないため。本体のフィルタは上書きしていない。報酬・行商人では自然周回で出現している。

`node tools/balance_sim/boon_shop_probe.js` で30店舗を固定seedで検査し、`out/boon_shop_probe.json` に生成数・提示数・各カードの実装済み判定を保存する。本体に追従して結果を記録し、提示0を正常な仕様として固定するテストにはしていない。本体の修正は今回の編集禁止範囲のため未実施。
