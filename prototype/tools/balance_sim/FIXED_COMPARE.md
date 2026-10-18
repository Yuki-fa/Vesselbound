# 固定盤面でのカード比較

周回のクリア率ではなく、同じ盤面・敵seedで1枚だけ差し替えた戦闘結果を測る。Nodeのみで動く。`js/**`、`index.html`、シート、既存周回ツールは編集しない。

## 実行

prototype/ で実行する。

```sh
node tools/balance_sim/fixed_boards.js --workers 4
node tools/balance_sim/fixed_compare.js --workers 4
node tools/balance_sim/fixed_selftest.js
node tools/balance_sim/fixed_report.js tools/balance_sim/fixed
```

保存した盤面をそのまま再利用する場合は `fixed_boards.js` を省く。進行は1ジョブごとに標準出力へ出る。`--workers` は独立したNodeプロセス数（1〜8）。同一プロセス内でGを並列操作しない。

仮変更は別の出力先へ置く。元の標準盤面は変更しない。

```json
{"change":[{"name":"ギガンテス","power":30}],"add":[{"category":"エンチャント","name":"仮・共鳴","desc":"攻撃：ランダムな敵に8ダメージを与える。","rarity":1,"grade":1,"directionCount":2}]}
```

```sh
node tools/balance_sim/fixed_compare.js --override /tmp/override.json --out /tmp/fixed-override --workers 4
# 一部だけの試行。名前指定は通常名と合体名（末尾+）を区別する。baseId指定なら両方。
node tools/balance_sim/fixed_compare.js --cards ギガンテス,ギガンテス+,活性化 --scenes st2_normal --out /tmp/fixed-small
```

効果文・数値変更は既存の `bot_override.js` と本体loaderのパーサーへ渡す。合体形の本文を変更する場合は `mergedDesc` も指定する。仮カードはCSVの `temporary=true`、Markdownの「仮」で区別する。保存済み基準盤面のカード数値は固定し、差し替える候補と召喚定義へoverrideを適用する。

## ファイル

|ファイル|役割|
|---|---|
|fixed_boards.js|元周回の盤面抽出、完全一致再実行、30例で選定、不足時の本体カード追加|
|fixed_compare.js|通常形・本体3枚合体形の全数比較、接続探索と独立評価|
|fixed_engine.js|本体読み込み、敵生成、編成、コア呼び出し、カード差し替え|
|fixed_worker.js / fixed_pool.js|独立Nodeプロセスによる並列計算|
|fixed_report.js|CSVと全体・4場面別Markdownの作成|
|fixed_selftest.js|再現性、差0、元コアとの一致、overrideなどの健全性検査|
|fixed_effects.js|保存済みの配置と戦闘結果を照合し、キャラクターの効果除去観測だけを再計算|

出力は `fixed/`。`boards_*.json` が再利用する完全状態と盤面、`boards_manifest.json` が選定方法と元周回、`selection_screen.json` / `selection_captures.json` が選定の根拠。`comparisons.jsonl` はカード×盤面の生データ、`compare_meta.json` は時間・種・本体/測定コードのhash。全体 `FIXED_REPORT.md` と各場面フォルダの同名報告を出す。

CSVは `cards.csv`（場面別カード平均・最小/最大・95%区間）、`board_comparisons.csv`（各盤面の差・配置/接続先）、`groups.csv`（価格/レア/グレード平均）、`baselines.csv`、`enchant_bodies.csv`（本体別探索値）、`near_zero_enchants.csv`（全本体でほぼ0）、`ineffective_enchants.csv`（全本体で改善なし、悪化も含む）、`inactive_effects.csv`（場面別）、`inactive_effects_all.csv`（全場面で変化なし）。UTF-8 BOM付き。

## 標準盤面

場面は `st2_normal`、`st2_elite`、`st3_normal`、`st3_elite`。ステージ番号は本体の `G._wave`、2マス目/3マス目は `G._waveStage`。floor・deepLevelは `_waveStageFloor` / `_waveDeepLevel` で求める。

`out/runs.jsonl` の非再戦・開戦直前の実盤面を集める。色比率・主力上位3枚の重複を抑え、lookaheadを優先して各場面96候補まで予備評価する。元JSONLは詳細な永続補正を省略しているため、最終候補は元の周回を同じseedで再実行し、返るJSONを元行と完全一致検査して、本体 `SaveRun.serializeRunState` の正式な保存対象を採取する。使用準備済みの開戦アイテムも保存する。

完全状態を独立30例で評価し、勝率25〜75%だけを各場面5枚選ぶ。足りない場合は勝率25%未満の近い盤面の空きマスへ、本体 `makePanel` / `_tryTripleMergeOnBoard` で作った通常・合体エンチャントを接続する。元カード・方向・資源・マスの力は変えない。追加カード・位置・前後勝率をJSONと報告に記録する。追加探索は1元盤面240候補、深さ3まで。

## 差し替えと評価

- 対象は本体の実装済み・在庫あり・報酬またはショップの通常抽選対象であるキャラクターとエンチャント。シート基準の通常形と、実際に3枚合体できる形を別行にする。固有グレードG2〜G4をG1へ書き換えない。
- キャラクターは本体 `formationDeploySlots` に出るキャラの本体ATK+HP最小と差し替える。同点はマス番号。元のマスと方向を引き継ぐ。
- エンチャントは空きマス全部と最弱の既存エンチャント1枚の場所を候補にする。最弱は隣接ATK+HP、レア度、マス番号の順。置ける場所と接続は本体の判定関数を使う。提示時の方向は固定し、回転しない。
- 全ての接続可能な配置を独立30例で実戦評価し、勝率→残HP→与ダメージの順で選ぶ。複数本体へ接続できる配置も本体の結果どおりに扱う。選んだ配置を別seedの30例で測る。基準盤面も同じ敵・戦闘seedで戦う。
- 生存HPは `coreLivingUnits` の行動可能な生存味方（封印中は除く）。与ダメージは敵へのコアdamageイベントのamount合計で、オーバーキルを含む。
- 盤面は等重み。95%区間は敵seedごとの全盤面平均勝敗差を1観測とする正規近似。共通seedの対応と盤面間の相関を保持する。多重比較の補正や、未知の盤面への一般化は行わない。
- 同価格/レア/グレード・同分類/通常または合体の他カード平均との差を出す。他カード3枚未満は外れ値順位から除く。
- 本体別の相性は接続探索用サンプルの値。全カード主表の差は独立した評価用サンプル。±3.34ptを「ほぼ0」の目安とし、未接続と分ける。
- 効果文を外した同数値カードと同seedで比べ、戦闘イベントの意味が変わったかを調べる。本体には空本文でも名前から起動する互換処理があるため、検査対照だけ名前も無効化する。本文・名前の写し、開戦・ターン開始・点灯だけでは発動と数えない。編成時の補正の変化は別記する。観測なしは実装漏れの断定ではなく、条件未成立や経済効果も含む。

## 本体と異なる受け口・測定しないもの

本体戦闘ルールを実装し直さない。実際の敵生成→魔導板→formation→コアを使う。既存 `load.js` / `stub.js` / `bot_runtime.js` のDOM・描画・音・保存の無処理化を再利用する。盤面採取時の会話・施設・売買は元の周回ボットの受け口のまま。元行との完全一致が取れなければ選定を止める。

比較専用では本体 `SaveRun.computeBattle` のソースを読み、途中の表示フレーム保存だけを省略し、不変な召喚/アイテム定義を共有する。戦闘ステップ・撃破時ゴールド・500手上限は元のコードのまま。ソースの置換箇所が変われば例外にする。元のcomputeBattleとの全イベント・最終状態一致を自己テストする。最終状態・戦闘イベントは保存するが、再生用フレームは作らない。

各試行ではG・乱数を複製し、結果を周回に持ち帰らない。敵は当該場面の標準生成を毎回行い、特定クエストによる敵置換は入れない。購入・売却・次戦・旅程全体・長期経済・未選出盤面・別の提示方向・ブラウザ表示/音はこの比較の測定外。

## 調整値

`fixed_boards.js`: `--samples 30 --count 5 --seed 3101 --candidates 96 --workers 4 --input <jsonl> --out <dir>`。

`fixed_compare.js`: `--samples 30 --search-samples 30 --seed 7411 --card-seed 1701 --workers 4 --boards <dir> --out <dir>`。`--samples` / `--search-samples` の下限は20。今回の本測定は両方30。`--card-seed` は通常/合体カードの提示方向を再現する種。

`fixed_selftest.js [結果フォルダ] [盤面フォルダ]` は本測定を参照する。追加8JSの構文検査と、既存 `run.js 5` / `selftest.js` も実行する。overrideのCLI検査・既存検査のREPORTは一時フォルダで行い、片付ける。成功記録は結果フォルダの `SELFTEST.json` へ保存する。

`node tools/balance_sim/fixed_effects.js [結果フォルダ] [workers]` は効果観測だけを再計算する。初回測定で見つけた名前由来の互換処理への対処に使用した。既存の全キャラクター行の配置・実測勝率/残HP/与ダメージを再検査し、一致した場合だけ効果観測と元コードhashの履歴を保存する。現行 `fixed_compare.js` の新規実行では最初から同じ対照処理を行う。
