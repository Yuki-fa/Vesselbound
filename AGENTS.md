すべての思考・回答・コメントは日本語で行うこと。

# AGENTS.md

このファイルは、このリポジトリ内のコードを扱う際のガイダンスを提供します。
ユーザーは高速な試作検証を重視している。
「完全性」より「短時間で試せる状態」を優先すること。

## 制作ルール：オンラインとオフラインを同期させる（最優先）

**このプロジェクトの絶対目標は「オンライン対戦（PvP）と通常プレイ（PvE）が完全に一致すること」である。**
今後追加・修正するカードと機能は、**原則として両方に反映される形で実装する。**
片方だけ動く実装は、たとえ自動テストが通っても未完成として扱う。

### なぜこの形なのか

PvEとPvPは、盤面の持ち方も描画の仕方も違う。
過去に何度も「PvEでは効くのにオンラインでは効かない（またはその逆）」が起きたが、
原因は毎回**同じルールが2箇所に書かれていた**ことだった。
だから「両方に同じ修正を入れる」のではなく、**書く場所を1箇所にして分岐を作らない。**

### どこに書くか（迷ったらこの表）

| 書くもの | 置き場所 | PvE | オンライン |
| --- | --- | --- | --- |
| 戦闘のルール（ダメージ・効果・キーワード・勝敗） | `js/battle/core.js` | コアを呼ぶ | コアを呼ぶ |
| 魔導板の編成→出撃ユニットへの変換 | `js/battle/formation.js` の `buildBoardFormation()` | 同じ関数 | 同じ関数 |
| 見せ方の方針（順番待ち・重複抑止・間） | `js/battle/present.js` | 同じ関数 | 同じ関数 |
| 実際のDOM描画 | `js/engine/battle.js` | ← PvE専用 | `js/online/board.js` ← オンライン専用 |
| カード・指輪のデータ | `js/data/` | 共通 | 共通 |

**描画の2ファイルだけが分かれている。** ここに**ルールや数値計算を書かないこと。**
イベントに書かれた値をそのまま表示する。

### 絶対にやってはいけないこと：カード名をキーワードとして扱う

**カード名・強化カード名を「キーワード」として効果文やキーワード欄へ書かないこと。**
（例：攻防一体の効果文に「攻防一体」がキーワードとして現れる、など）

キーワードは `キーワード` シートに定義されたもの（即死・毒牙・結界…）だけである。
カード名をキーワード欄へ混ぜると、

- ホバー説明にカード名がキーワードとして並び、プレイヤーに誤解を与える
- `coreUnitKeywords()` がカード名をキーワードとして返し、キーワード判定が誤爆する
- キーワード専用VFXの割り当てが狂う

`CORE_KEYWORD_CARD_NAMES`（core.js）と `_ENCHANT_KEYWORD_ONLY`（render.js）に
「キーワードとして扱わないカード名」の一覧がある。**カードを追加・修正するときは、
そのカード名がキーワード欄・効果文のキーワード位置に現れていないことを必ず確認すること。**

**これは今後のカード追加でも例外なく守ること。Codexへ委譲する際も毎回明記すること。**

### やってはいけないこと

- `if (isOnline)` / `if (G.isVersus)` のような**コード分岐で別実装を作る**
- `js/engine/battle.js` にだけ効果を足して終わる（オンラインに出ない）
- `js/battle/core.js` に足したが `runBattleCore()` から呼んでいない（PvPに出ない）
- `js/battle/present.js` の中で `G`・DOM・数値計算に触る（回帰検査が落ちる）
- 新しい経路を足して**古い実装を残す**（二重実装になる。古い方は必ず削除する）

### 新しいカードを追加するときの手順

1. `js/data/` にデータを追加する（マスターの `Vesselbound_data.xlsx` はユーザー管理。
   **編集・移動・削除しない。** 反映は `prototype/` で
   `python3 tools/update_local_xlsx_data.py <key>` を実行して再生成する）
2. 効果を `js/battle/core.js` に書く。**DOM・`G`・`Math.random` は使わない**（乱数は引数の `rng`）
3. `runBattleCore()` からも同じ関数が呼ばれることを確認する（PvPに出るかはここで決まる）
4. 演出が要るなら、コアが**イベントを出す**ようにし、
   `js/engine/battle.js` と `js/online/board.js` の**両方に受け口**を書く
5. 下の「終わる前に必ず通すもの」を全部通す
6. `index.html` の該当 `<script src=...?v=>` を上げる

### 資源（ライフ・マナ・ゴールド）を動かす効果を書くときの注意

オンラインはコアのイベント列をそのまま再生するので必ず反映されるが、
**PvEはコアへ渡した `state` を自前で読み戻す。** 書き戻しを足し忘れると
「オンラインでは効くのにPvEでは効かない」になる（我慢の指輪で実際に起きた）。

- ライフ：`_syncCoreLifeToG(state)` が `_flushCorePveHitEvents()` の先頭にある。
  この共通出口を通らない経路を新設したら、そこにも置く。
- マナ：`mana_set` イベントとして `_flushCorePveHitEvents()` 内で処理される。
- 検査：`node tools/balance_sim/pve_core_resource_parity.js`

### 片側だけの機能を頼まれたとき

**ユーザーが「PvEだけ」「PvPだけ」を指示することはある。これは違反ではない。**
勝手に両側へ広げないこと。ただし**後からもう一方へ出せる形**で作り、
「片側限定機能の扱い」節の登録表に必ず登録する。表に無い差分は検査が落ちる。

### 終わる前に必ず通すもの

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

見た目・アニメーションに触ったときは、ローカルサーバーを立てたうえで追加で：

```bash
cd prototype && node tools/parity/anim_check.js
```

戦闘の進行そのものに触ったときは：

```bash
cd prototype && node tools/parity/loop_parity.js
```

**演出（見せ方）に触ったときは必ず：**

```bash
cd prototype && node tools/parity/present_parity.js
```

同じ盤面・同じ乱数種でPvEとオンラインを実際に再生し、
「コアのイベント列」「演出の呼び出し（対象・量・順番）」「盤面の並びの変化」
「数値が対象カードの上に出るか」「カードの複製が残らないか」を突き合わせる。
**オンラインだけ固有VFXが一つも出ない、とどめの数値が出ない、召喚が反対側へ出る、
といった片側だけの不具合はこれでしか捕まらない。**

シナリオは `SCENARIOS` に並べる。演出の種類ごとに、それを必ず通るカードを選び、
**なぜそのカードなのかを一行で書く**こと（固有VFX＝ゴーレム／マータ、戦闘中の召喚＝
スケルトンキング、マナ効果＝ダイアウルフ、薙ぎ払い＝アラッサス）。

### 演出の規則は `js/battle/present.js` が唯一の実装

PvE（`js/engine/battle.js`）とオンライン（`js/online/board.js`）はDOMの触り方が違うため、
描画関数そのものは分かれている。**しかし「どういう規則で見せるか」は必ず present.js に置き、
両方から呼ぶこと。** 呼び出し側へ規則を書き戻した時点で二重実装に戻る（実際に何度も戻った）。

present.js が持つ規則：

| 関数 | 決めていること |
| --- | --- |
| `presentDamageVfxSource()` | キャラクター固有VFXを「誰の効果」として出すか（肩代わりは肩代わりした本人） |
| `presentStatChangeVfxAllowed()` | 能力変化のどの理由で固有VFXを出すか |
| `presentIsPlaying()` ほか | 演出の再生中フラグ（再生中は盤面を詰めない・倒れたカードを消さない） |
| `presentKeepsOnBoard()` | 倒れた体を盤面に残すか（描画と詰め直しの双方が同じ判定を使う） |
| `presentCreateDamageGate()` | 同じ体へ数値が続くときの間隔 |
| `presentChooseSummonSlot()` | 召喚のスロット選択 |
| `PRESENT_HIT_BEAT_MS` | 命中から結果を見せ始めるまでの間 |

### 複数対象への効果は「全員に入れてから、まとめて誘発」

全体ダメージのように複数のキャラクターへ同時に作用する効果は、
**1体ずつ「作用→その体の誘発」を解決してはいけない。** 全員へ作用させてから、
対象の並び順で誘発を解決する。1体ずつ解決すると、割り込み攻撃（ミノタウロスの
「負傷：直ちに攻撃する」）が残りの対象への作用より先に起き、誘発時点のHPも変わる。

コアの `coreResolveHit` は `{deferTriggers:true, collect:配列}` を渡すと
ダメージの確定だけを行い、誘発を配列へ積む。呼び出し側が全員ぶん確定させてから
`coreApplyHitTriggers()` を順に呼ぶ。

**ダメージ表示は原則として全対象同時。** ずらしてよいのは、VFXがそう見せる場合
だけ（アラッサスの薙ぎ払いは炎が当たった対象から順に出る）。キャラクターごとに
勝手にずらさないこと。

守るべき順番（両方で同じ）：

1. コアが確定した**イベントの順番どおり**に演出を出す。先取り・後回しをしない。
   死亡も同じ。まとめて後回しにすると「消える順番」が片側だけ変わる。
2. 数値・VFXを出し終えるまで、倒れたカードを消さない・盤面を詰めない。
3. 詰めてよいのは死亡イベントを処理する時だけ（`_deathFxReady` を立ててから）。
4. 召喚は「その場で姿が出る」演出。保留すると次の死亡まで画面に出ない。

### 盤面配列の持ち方もPvEとオンラインで同じにする

**生きている体を左詰めで並べ、前衛／後衛は `lane` で区別する。** 添字で前衛・後衛を
分ける持ち方（0..6／7..13）にしてはいけない。以前オンラインだけがそれで、召喚の
挿入位置も詰め直しも別実装になり、戦闘中の召喚が味方の左側へ出ていた。

| 用途 | 唯一の実装 |
| --- | --- |
| 召喚の挿入位置（戦闘中は前衛の右端／対象の左右） | `coreInsertSummonedUnit()` |
| 盤面の詰め直し（生存を左詰め） | `coreCompactUnits()` |
| 薙ぎ払いの見せ方（炎が当たった瞬間に数値） | `presentSweepAttack()`（render.js） |

`coreInsertSummonedUnit()` は `placementTargetId` が無ければ前衛の右端へ入れる。
**発生元IDで補ってはいけない**（同時召喚の並びが逆になる）。

**自動テストの通過を「直った」と書かないこと。** 実機で見ていない項目は「未確認」と明記する。

## 現在の状態（core移行：完了）

### 履歴の記述ルール

- 直前の履歴を記述したのが自分（今回の会話セッション）でない場合、今回の作業完了後に履歴を全て消し、新規に1件から書き始める。
- 直前の履歴を記述したのが自分（今回の会話セッション）である場合、履歴は消さずに書き足す（目安3〜5行を維持）。
- 「自分が書いたか」は会話セッション内の記憶で判断する。内容に見覚えがなければ他セッション／ユーザー本人による記述とみなす。

### 移行の結果

- 完了条件1：マータ・団結の分散を `coreResolveHit()` へ一本化。PvEはコアの各対象damageイベントを既存演出へ接続。監査回帰を追加済み。
  **挙動の変更点**：分散判定が「味方側のみ・都度盤面確認」から「`_uniteGroups` による両陣営判定」に変わり、敵側でも団結・マータが機能する。
- 完了条件2：呼び出し元0件のLegacy関数11個と旧 `applyKeywordOnHit` コメントを削除。
- 完了条件3・4：**Claude側のブラウザ実機で確認済み（`core.js?v=coreMigration04` 時点）**。
  固有VFX4枚のパス解決とゴーレムのC003再生、PvE通し（戦闘実行→勝利→報酬）、
  オンライン通し（選択完了1/3〜3/3→対戦→街）を実行し、JSエラーなし。
  効果の発動回数も数値で確認：負傷 atk3→5／攻撃 40→37／マナ 0→2／死亡G +5／
  デュラハン 計4dmg（1体のみ）／団結 6dmg→3体へ分散。すべて**1回発動**。

### 移行作業で発生し、修正済みの回帰（同じ形を再び作らないこと）

移行中に**同じ二重発動バグを3度**埋め込んだ。詳細と回避策は「効果をコアへ書く時に繰り返された失敗」節。
直近の1件は `applyDamageBatch` を `coreResolveHit(..., {deferTriggers:true})` 経由へ変えた際の
**`deferTriggers` ガード漏れ**（負傷トリガだけガードされず、PvE側と合わせて2回発火）。
`deferTriggers:true` は「ダメージの確定と分配のみ、トリガは一切発火しない」という契約である。

### 移行とは別に残っている課題（移行の完了条件ではない）

以下は移行作業から切り離した。ユーザーから個別に指示があった時にのみ着手する。

- FLIP（人数減少時のカード移動演出）の詰め
- 召喚時のDOM同期・モーション同期の作り込み
- 召喚上限の実機拒否確認
- デバッグ試験戦闘まわりの機能整備
## 承認設定

`prototype/` 内でのファイル作成・編集・必要なコマンド実行は承認済みとして扱う。

ファイル削除は、ユーザーから明示的な指示がある場合を除き禁止する。

`prototype/Vesselbound_data.xlsx` は参照のみ可とし、
編集・削除・移動・上書きを禁止する。

`prototype/` 外の実装ファイルは、ユーザーから明示的な指示がない限り変更しない。

## Git操作

以下はユーザーの明示的承認なしに実行してはならない。

- git commit
- git push
- git reset
- git checkout
- git restore による作業内容の破棄
- git clean
- git rm（実ファイルを削除する操作）

## Claude / Codex の役割

Claudeが司令塔、Codexが実装担当。
委譲の主目的は**Claudeのコンテキスト消費の節約**であり、委譲自体は必須ではない。

### Claudeが直接行う

- 原因調査・不具合の切り分け
- ブラウザでの実測・検証
- 少量の修正

直接やった方が効率的なら、そのまま直接実施してよい。
「症状→原因特定→実測で裏取り」は文脈を持ったまま回せる分だけ速いため、無理に委譲しない。

### Codexへ委譲する

- 仕様と変更範囲が明確な中〜大規模実装
- 定型的な変更
- 並列化可能な作業

作業量が多い場合はCodexへ回す。

### 委譲時の手順

Claudeは実体パスでCodexを起動する（`~/.local/bin/codex` 経由は補助バイナリ
`codex-code-mode-host` を解決できずファイル読み取りに失敗するため）。

```
~/.codex/packages/standalone/current/bin/codex exec \
  -m gpt-5.6-luna --sandbox workspace-write -C <リポジトリ> "<指示>"
```

- モデルは **gpt-5.6-luna** を使う。
- 委譲する際は、仕様・変更対象ファイル・変更しない範囲を明示する
  （Codexは非対話のため、曖昧な点は投げる前にClaude側で確定させる）。
- **委譲した場合、Claudeが差分と検証結果を必ずレビューする。**
  最低限 `git diff` と `node --check`、必要ならブラウザ実測まで行う。

Codexは実装後、変更ファイル・差分概要・検証結果を報告し、
commit / push は行わない。

## アクセス範囲

指示がない限り、以下のみを読み書き・参照対象とする。

- `AGENTS.md`
- `CLAUDE.md`
- `docs/`
- `prototype/`

`画像素材/`, `資料/`, `old_build/` など、上記以外のフォルダにはユーザーから明示的に指示がない限りアクセスしない。

`prototype/Vesselbound_data.xlsx` はユーザーが直接編集する。参照のみ可とし、分割・移動・編集は禁止。

## 作業方針：高速改修モード

このプロジェクトは、ユーザーが手動テストし、その結果をもとに小さく改修する高速イテレーションで進行する。

以下を最優先すること。

1. 最小差分で実装する
2. 既存構造を維持する
3. 指示された仕様だけを変更する
4. 不要なリファクタをしない
5. 長時間の探索・検証より、短い実装と手動テストしやすさを優先する

## 作業開始時のルール

作業開始時、最初に以下を短く列挙すること。

- 変更対象ファイル
- 変更対象関数
- 変更しない範囲

それが確定するまでコード変更を開始しない。

複数仕様が含まれる場合、まず最低限動く実装を完成させる。

演出・UI改善・最適化は、ユーザー確認後の次パスで行う。

コード変更前に、変更対象になりそうなファイルを最大5個まで特定する。
原則として、その範囲外は読まない・触らない。

仕様が複数ある場合も、勝手に大規模改修へ拡大しない。
実装が複雑な場合は、まず最小実装を行う。

不明点があっても、作業が止まるほどでなければ合理的に仮定して進める。
仮定した内容は最後に短く報告する。

## 影響範囲の把握と回帰確認

以前正常だった箇所が壊れる事故が頻発したため、以下を厳守する。

修正作業前に、影響を受ける可能性のある既存機能を把握する。
影響範囲が広い場合でも、主要な影響先を漏れなく把握する。
「ついで修正禁止」「既存仕様を変えない」ことを厳守し、
修正後は把握した影響先について回帰不具合がないことを確認する。
ただし、変更内容と無関係な網羅的テストは行わず、影響が合理的に想定される範囲に限定する。

具体的な進め方。

1. 変更する関数・CSSセレクタ・クラス名を、他のどこが使っているかを検索して洗い出す
2. 洗い出した中から「主要な影響先」を作業開始時に列挙する（変更しない範囲と一緒に報告する）
3. 実装は指示された仕様だけに閉じる。気づいた別の不具合はその場で直さず、報告に留める
4. 修正後、列挙した影響先が壊れていないことを確認してから完了報告する

特に注意する共通基盤（変更時は必ず影響先を洗い出す）。

- 共有クラス／セレクタ：`.card` `.rew-card` `.slot.unit-card` `.cant` `right-card-peek` など、
  戦闘・報酬・ショップ・図書館・ゲームオーバーで共用されるもの
- 共有フラグ：`G.phase` の分岐、`_debugMode`、`_isLibrary` / `_isShop` / `_isForge` などの施設フラグ
- 共通ヘルパー：`playSfx` / 音量計算、`renderHandEditor()`、`toggleBoardCardVisibility()`、
  戦闘ループの中断フラグなど、複数画面から呼ばれるもの
- 汎用の効果カウンタ：`_unitEffectPanelCount()` などを増減させる変更は、
  開戦・攻撃・負傷・死亡・解放・マナ効果のどれに掛かるかを確認する

## 禁止事項

以下は禁止する。

- 依頼されていない大規模リファクタ
- ファイル分割・ファイル移動（※`prototype/`フォルダ内に限り可。それ以外の場所への移動や、プロジェクト直下構成の変更は禁止）
- グローバル構造の再設計
- ビルドツール導入
- モジュール化
- セーブデータ形式の変更
- 命名規則の全面変更
- UI全体の作り直し
- 既存仕様の独自解釈による変更
- ついで修正
- 長時間の網羅的調査

## 実装ルール

指定値がある場合は、必ずその値を使う。
例：「HP+3」「ゴールド+1」「マナ+5」など。

既存関数がある場合は再利用する。
新しい仕組みを作る前に、既存の状態・描画・報酬・フェイズ処理を確認する。

変更はできるだけ以下の単位に閉じる。

- マップ変更 → `map.js`, `floors.js`, `render.js`
- 戦闘変更 → `battle.js`
- 報酬変更 → `reward.js`, `pool.js`
- ショップ/施設/イベント → `map.js`, `reward.js`（ショップUIは報酬画面と共通）
- アイテム使用制限 → 専用ファイルが分かれていないため、まず `main.js`, `reward.js`, `battle.js`, `pool.js`, 関連UIを確認する

## テスト方針

長い検証は行わない。
最速で確認できるものだけ実行する。

優先順位：

1. 構文エラー確認
2. 変更箇所周辺の動作確認
3. 「影響範囲の把握と回帰確認」で列挙した主要な影響先の回帰確認
4. ブラウザで確認すべき手動テスト項目の提示

3は、変更内容から影響が合理的に想定される範囲だけを対象にする。
無関係な機能の網羅的テストは行わない。

ビルドツールがないため、原則として `index.html` を開く前提で確認する。
自動テストがない場合、無理にテスト環境を作らない。

## 完了報告ルール

完了時は必ず日本語で、短く以下だけ報告する。

- 変更したファイル
- 実装した内容
- 変更していない内容
- 確認した主要な影響先（回帰していないこと）
- 手動テスト項目

### 実機検証の完了条件（追加）

- UI・演出・召喚・召喚上限・詰めアニメーション・マナ効果発動時点・個別カード効果の修正は、自動検査が成功しただけで完了扱いにしない。正常応答を確認した固定ローカルサーバーを実際に開き、デバッグモードの試験戦闘で再現ケースを操作し、修正前の症状が消えたことを確認するまで完了報告してはならない。確認できない場合は未完了として報告する。
- 添付スクリーンショットに写ったURLやサーバー名を検証先の根拠にしない。HTTP応答を実測したサーバーだけを検証先に使い、使用URLを報告する。
- Codexがブラウザで実機確認するときは、戦闘開始前にブラウザ音声がミュートされていることを確認する。
- 召喚上限、盤面の詰め、マナ効果、攻撃演出はイベント生成だけで正常判定しない。DOM上の表示位置・表示時刻・状態変化を実測し、再現ケースの修正後結果を確認する。

長い説明、推測、設計論は不要。

## Overview

**Vesselbound（仮）** — Argante 製のローグライクカードゲーム。`index.html` を開くだけで動作するシングルファイル構成（ビルドツールなし、`file://` プロトコル対応）。JavaScript はすべてグローバルスコープ。

実体は本リポジトリ直下ではなく **`prototype/`** ディレクトリ配下にある（`prototype/index.html`, `prototype/js/...`）。以下のパスは `prototype/` からの相対パス。

## ファイル構成

```
index.html              — HTML/CSS のみ。<script src> タグで全JSを読み込む
assets.js                — Assets（画像・SEのパス解決）, getCharacterNoArtPath()（No.列→assets/art/配下の解決）
js/
  data/                  — カード・ゲームデータ（カード追加時はここを編集）
    floors.js            — FLOOR_DATA（31件。シート「階層レベル」で上書き）, BOSS_FLOORS（既定は空配列）
    events.js            — ENEMY_POOL
    units.js             — UNIT_POOL（初期キャラクター7体。通常カードは loader.js がシートから生成）
    loader.js            — 起動時にGoogleスプレッドシート(CSV)をfetchし、RING_POOL/PANEL_POOL/FLOOR_DATA等をインプレース上書き。fetch失敗時は内蔵データを使用
    local_xlsx_data.js   — file:// 環境向けのローカルCSVフォールバック（loader.js が参照）
  battle/
    core.js              — 共通戦闘コア。PvE(battle.js) と PvP(online/sim.js) が使う**唯一の**戦闘ルール置き場。攻撃・負傷・死亡・開戦・マナ閾値・毒・指輪/アイテム・魔導板・召喚/変身を含む
  online/                — オンライン対戦（3層＋ローカルサーバースタブ）
    protocol.js          — イベント種別・終了理由・seed付き乱数（mulberry32）
    sim.js               — 層1。コアを呼ぶだけの薄いアダプタ。ルールは持たない
    server_local.js      — サーバー権威のスタブ。マッチング/ライフ/制限時間/ステージ進行/勝敗/報酬を決める
    match.js             — 層2。サーバー状態を保持して中継するだけ。判定・計算をしない
    playback.js          — 層3。イベント列を順に再生する。値も勝敗も計算しない
    board.js             — 対戦盤面の描画。PvEと同じ renderField() / 演出関数を使う
    versus.js            — 対戦マスの入口。編成の写し取り（_panelSummonSpec を共用）
    flow.js              — サーバー状態に追従する画面遷移
    hud.js / matching.js — 対戦相手の枠・残り時間・マッチング待機
  engine/                — ゲームロジック（メカニクス変更時はここを編集）
    constants.js         — MAX_ALLIES, MAX_ENEMIES, ENEMY_FRONT_SLOTS, ENEMY_REAR_SLOTS, MAX_UNITS, GRADE_UP_COSTS
    audio.js             — 仮SE/BGM再生レイヤー（playSfx() が Assets.sfx 経由で再生）
    state.js             — グローバル状態 G, KW_DESC_MAP（キーワード説明）, initState()
    pool.js              — PANEL_POOL / SPELL_POOL / ITEM_POOL, drawRewards()
    enemy.js             — generateEnemies()
    battle.js            — startBattle(), nextTurn(), allyAttackAction(), enemyAttackAction(), onBattleEnd()
    render.js            — renderAll(), mkCardEl(), computeDesc()
    reward.js            — goToReward(), renderRewCards(), renderHandEditor(), エンチャントモーダル
    map.js               — ワールドマップと街・施設。generateWorldMap(), goToWorldMap(), renderWorldMap() 等（engine内で2番目に大きい）
    move.js              — chooseMove() のみ（旧マップの遷移処理の残り。16行）
    main.js              — showScreen(), updateHUD(), log(), startGame(), gameOver()
tools/
  balance_sim/offline_online_regression.js — オフライン／オンライン共通コアの回帰検査
  balance_sim/card_core_smoke.js           — 現行カード／強化データのコア適用スモーク検査
```

### スクリプトロード順（index.html）

実際の順序：

`assets.js` → `audio.js` → `constants.js` → `data/floors.js` → `data/events.js` → `local_xlsx_data.js` → （CDN: xlsx.js） → `loader.js` → `units.js` → `battle/core.js` → `online/*.js` → `state.js` → `pool.js` → `enemy.js` → `battle.js` → `render.js` → `reward.js` → `map.js` → `move.js` → `main.js`

関数本体内の参照はロード順に依存しないが、トップレベルの変数宣言は宣言順に解決されるため、この順序を維持すること。

## 戦闘ルールの置き場（重要）

**戦闘ルールは `js/battle/core.js` にのみ書く。** PvE（`js/engine/battle.js`）とPvP（`js/online/sim.js`）は
どちらもこのコアを呼ぶ。同じルールを2箇所に書くと、片方だけ直す事故が必ず起きる。

コアの制約（サーバーでもそのまま動かすため）：
- DOM を触らない / `G` を触らない / `Math.random`・`Date.now` を使わない（乱数は引数の rng だけ）
- 同期のみ。演出の待ちは呼び出し側がイベントを見て行う

`battle.js` に残っている同名関数（`_unitHasKeyword` / `getAttackTarget` / `_sealValue` 等）は
**コアへの1行委譲**であり、実装ではない。ここに条件を書き足さないこと。

### 移行済み（コアが唯一の実装）
| ルール | コアのAPI |
|---|---|
| キーワード判定（キーワード列＋効果文からの導出） | `coreUnitKeywords` `coreUnitHasKeyword` `coreUnitKeywordCount` |
| 数値付きキーワードの合算（毒牙3・邪眼2 等） | `coreKeywordSum` |
| 結界の値 | `coreUnitShieldValue` `coreShieldValueFromKeyword` |
| 生存・行動可否・攻撃力 | `coreIsSealed` `coreCanAct` `coreAttackDamage` |
| 攻撃対象の決定（守護・隠密・狩人・前衛優先） | `coreSelectAttackTarget` |
| 貫通の後衛巻き込み | `corePierceRearTargets` |
| 受けるダメージの確定（封印・結界・弱体・強靭） | `coreResolveIncomingDamage` `coreToughValue` |
| 加護Xの残り回数 | `coreConsumeWardCharge` |
| 封印と生贄（誰が封印されるか・何体必要か・誰を捧げるか） | `coreSealValue` `coreInitSealStates` `coreSacrificeUnits` `coreSealRelease` |
| 追加攻撃回数・攻撃範囲（二段/三段/全体/三方向） | `coreExtraAttackCount` `coreAttackSpread` |

### 移行済み（効果・状態）

| ルール | コアのAPI／処理 |
|---|---|
| 開戦・攻撃・負傷・死亡・終戦トリガ | `coreApplyOpeningEffects` `coreTriggerManaOnAttack` `coreApplyAttackEffects` `coreApplyInjuryEffects` `coreApplyDeathEffects` `coreTriggerBattleEnd` |
| データ駆動のマナ／ゴールド／アイテム効果 | `coreTriggerManaOnAttack` `coreTriggerManaOnInjury` `coreTriggerManaOnDeath` `coreTriggerBattleEnd` |
| 即死・毒牙・毒・邪眼・衝撃・弱体・生命吸収 | `coreApplyKeywordOnHit` |
| 毒のターン処理 | `coreApplyPoisonBeforeTurn` |
| 指輪・アイテム・マナ閾値 | `coreApplyOpeningRings` `coreApplyOpeningItems` `coreApplyRingManaEffects` `coreApplyManaThresholdEffects` |
| 召喚・変身・復活 | `coreSummonUnit` `coreTransformUnit` `coreTryRevive` |
| 魔導板・共振・熟練等の戦闘修正 | `coreUnitEffectText` `coreStatBonus` および開戦／各トリガ処理 |

### 効果の自動検証（効果に触る変更では必須）

```bash
node prototype/tools/balance_sim/effect_audit.js   # NG 0 になるまで直す（NGがあれば exit 1）
node prototype/tools/balance_sim/card_core_smoke.js
node prototype/tools/balance_sim/offline_online_regression.js
```

`effect_audit.js` は PANEL_POOL / ENEMY_POOL の全カードについて、効果文が持つトリガ
（開戦／攻撃／負傷／死亡／終戦／解放／Xマナ）ごとに最小シナリオを組んでコアを1回だけ発火させ、
次を機械判定する。

- 効果が**ちょうど期待回数**発動しているか（0回＝不発、2回以上＝二重実装を検出）
- p1 に置いた場合と p2 に置いた場合で対称に動くか
- 対象数が効果文と整合するか（「ランダムな敵に」＝1体、「全ての敵に」＝全体）

固定の回帰シナリオも含む。**効果を追加・修正したらここにも1件足すこと。**

- デュラハン回帰：味方死亡=1回／敵死亡=0回
- 幻影効果回帰：効果文もキーワードも持たない素のユニットの死亡で、イベントが1件も出ないこと

最小シナリオでは条件を満たせないカード（レイス・レムレース等）は
`conditional` の除外リストに入っている。**除外を増やしてNGを消してはならない。**
除外は「シナリオでは再現不能」な場合に限り、理由をコメントで残すこと。

### 効果をコアへ書く時に繰り返された失敗（必ず避けること）

移行作業で実際に埋め込まれ、プレイ不能級の不具合になったパターン。新規実装時も同じ形にしない。

1. **カード名ブロックと汎用テキストブロックの二重実装**
   `coreHasEffect(u,'デュラハン')` の分岐と `/味方が死亡するたび…/` の正規表現分岐の両方を書くと、
   該当カードは**2回発動**する。どちらか一方を正とし、もう一方に相互排他条件
   （`!coreHasEffect(u,'デュラハン')` 等）を必ず付ける。
2. **観測系トリガの陣営ガード漏れ**
   「味方が死亡するたび」は *観測者と同じ陣営の死亡のみ*。`dead.side === u.side` の条件を
   落とすと敵の死亡でも発動し、そのダメージで敵が死んで**死亡観測が再帰し全滅する**。
3. **`Math.max(1, coreEffectCount(unit, 'X'))` でループ回数を作る**
   Xを持たない全ユニットで1回発動してしまう。`coreEffectCount(...)` をそのまま使い、
   0回なら回らないようにする。
4. **データ駆動と効果文パースの二重加算**
   loader は効果文から `manaOnAttack` / `manaOnInjury` / `manaOnDeath` / `goldOnDeath` を
   **既に生成している**。`/^(\d+)マナを得る/` を追加で拾うと2回入る。
   テキストパース側に `&& !Number(unit.manaOnX)` のガードを必ず付ける。

### 旧互換処理について

新しい戦闘ルールを追加・変更する場合は、まず `core.js` に実装し、PvE／PvP双方のイベント接続だけを更新すること。オフライン専用の名前分岐へ新規ルールを追加してはならない。

### 今後の作業（Codexへの引き継ぎ手順）

追加・修正の1ステップは必ず次の4つで1セット。**「コアに実装する」だけで終わらせない。**

1. `js/battle/core.js` にルールを追加する（DOM・G・Math.random を使わない。乱数は引数の rng）
2. `js/engine/battle.js` の該当実装を**削除**し、コア呼び出しの1行委譲に置き換える
   （元を残したまま新経路を足した時点で差し戻し対象）
3. `js/battle/core.js` の `runBattleCore()` からも同じ関数を呼び、PvPでも効くようにする
4. 演出が要るなら `js/engine/battle.js` と `js/online/board.js` の**両方に受け口**を書く。
   見せ方の方針（順番待ち・重複抑止・間）は `js/battle/present.js` に置き、両方から呼ぶ

そのうえで毎回、オフライン回帰を必須とする：
- `node tools/balance_sim/effect_audit.js` を実行し **NG 0** にする（効果に触った場合は回帰シナリオも追加）
- `node tools/balance_sim/offline_online_regression.js` と `node tools/balance_sim/card_core_smoke.js` を実行する
- `node tools/balance_sim/battle_event_regression.js`（二重実装の復活検査）を実行する
- 資源（ライフ等）に触った場合は `node tools/balance_sim/pve_core_resource_parity.js` を実行する
- 見た目・アニメーションに触った場合は `node tools/parity/anim_check.js`、
  戦闘の進行に触った場合は `node tools/parity/loop_parity.js`（どちらもローカルサーバーが要る）
- `node --check` を全JSに通す
- `index.html` の該当 `<script src=...?v=>` を上げる
- ブラウザでPvE通し（タイトル→リーゼ→出発する→戦闘→勝利→報酬）とオンライン通し
  （タイトル→オンライン対戦→選択完了1/3〜3/3→対戦→街）を実行し、JSエラーが無いことを確認する
- 二重管理が残っていないか grep で確認する（例：`grep -n '強靭\\d+' js/engine/battle.js` が0件）

移行とは別の残課題（個別指示があるまで修正しない）：
- FLIP（人数減少時のカード移動演出）
- 召喚時のDOM同期・モーション同期、召喚上限の実機拒否確認
- デバッグ試験戦闘まわりの機能整備
- 全カード個別の実機目視確認

ブラウザ操作ができない環境の場合は、**「ブラウザ確認は未実施」と報告に明記する**こと。
自動テストの通過をもって「直った」と書いてはならない。
実際、`effect_audit` 追加前は自前テストが全て通る状態でプレイ不能の不具合が残っていた。

### 解消確認の必須条件

ユーザーから報告された不具合については、コード変更や自動テストの成功だけで「修正済み」「解消確認済み」と報告してはならない。必ず、ユーザー指定のデバッグモードへ入り、ブラウザをミュートした実機で同じ再現条件を操作し、画面上の結果（演出・表示時刻・配置・効果回数）を確認すること。再現条件を実行できない、または確認できていない項目が残る場合は、完了報告せず検証を継続する。複数カードが対象の場合は、対象カードごとに確認結果を記録し、未確認カードを残したまま「全カード確認済み」と書かないこと。

ブラウザ確認の代わりに、ページのコンソールから直接コアの経路を叩いて数値で確かめる方法が使える。
戦闘ループはタブが非表示だと止まるため、`playerPass()` を直接呼ぶか、
`G.allies` / `G.enemies` を手で組んで `applyDamageBatch()` や `_applyUnitAttackEffects()` を
呼び、HP・ATK・`G.mana`・`G.gold` の変化量を確認する。
※効果文をコンソールへ書く時は **敵（U+6575）と 敌（U+654C）を取り違えない**こと。
　似た字で正規表現が一致せず「効果が発動しない」と誤診断する。

今後は既存オフライン挙動を基準に、未登録データや新規カードを追加する際の回帰検査を先に更新する。

カード名で分岐する固有効果も、追加時はPvE側だけに実装せず、共通コアの効果イベントへ追加すること。

### 既存の食い違い（移行時に要判断・勝手に揃えないこと）
- 追加攻撃回数と攻撃範囲：味方側は効果文からも拾うが、敵側はキーワード列だけを見る
  （`coreExtraAttackCount(unit,{fromKeywordsOnly:true})` で従来の挙動を保持している）
- 弱体：`_applyDamageState` は加算するが `dealDmgToEnemy` は加算しない
  （`coreResolveIncomingDamage(...,{skipWeaken:true})` で従来の挙動を保持している）
- **マータ・団結の分散はコアへ一本化済み**：PvEの`applyDamageBatch()`も
  `coreResolveHit()`の各対象damageイベントを使う。コアは`_uniteGroups`のスタンプ値を使い、
  旧実装の味方側限定・盤面接続の都度確認とは条件が異なるため、両陣営へ適用される。

## カードデータの構造

### 指輪（RING_POOL）— `js/data/loader.js` / `window.RING_POOL`

召喚トリガー式の指輪（`trigger`/`summon`/`count` を持つもの）は廃止済み。現状は全てパッシブ効果のみ。SPELL側に類似のトリガー式システムを再導入する構想があるが未着手（`docs/GAME_SYSTEMS.md` 参照）。

```js
{
  id: 'unique_id',
  name: '表示名',
  kind: 'passive',              // 現状は passive のみ
  grade: 1,                     // 1〜4
  rarity: 1,                    // 1〜3。legend:true の場合は省略されることが多い
  cost: 4,                      // ショップ購入価格の基準値
  desc: '効果テキスト',
  unique: 'needle' | 'life_reg' | 'fury_start' | 'extra_action' | ...  // 特殊処理キー
  legend: true,                 // ネームド（レジェンド）指輪のみ
}
```

### カードプール — `js/engine/pool.js`

杖（`type:'wand'`）は廃止済み。現在のプールは以下の3つで、いずれも `loader.js` がシートの内容で上書きする。

```js
// PANEL_POOL — キャラクター／エンチャント（報酬・ショップの主役。シート「card」「enchant」由来）
{
  id:'panel_gnome', no:'001', name:'ノーム',
  rarity:1, grade:1,
  type:'panel', kind:'panel', panelScope:'unit',
  category:'キャラクター' | 'エンチャント',
  color:'赤'|'青'|'緑'|'黄', cost:1, slot:1,
  race:'亜人', power:3, life:4,          // キャラクターのみ
  desc:'終戦：5ゴールドを得る。',
}

// SPELL_POOL — スペル（マナで撃つ。シート「spell」由来。現状は内蔵1件のみ）
{ id:'spell_fire_arrow', no:'001', name:'炎の矢', type:'spell', kind:'spell',
  category:'スペル', manaCost:1, color:'赤', effectKey:'fire_arrow', desc:'...' }

// ITEM_POOL — 消耗品（シート「item」由来。絵は art で直接指定）
{ id:'item_silence_scroll', no:'001', name:'静寂の巻物', rarity:1,
  type:'consumable', kind:'item', category:'アイテム',
  itemEffectKey:'silence_scroll', art:'assets/art/item/I001.jpg', desc:'...' }
```

### カード絵の解決 — `assets.js`

カード絵はシートの **「No.」列（`artCode`）から自動解決**する（`getCharacterNoArtPath()`）。
接頭辞と配置先は次のとおりで、`.jpg` と `.png` の両方を候補として返す（片方は404になるが仕様）。

| 接頭辞 | 配置先 | 内容 |
|---|---|---|
| `NPC` / `MC` | `assets/art/NPC/` | 初期キャラクター（シート「char（NPC）」）。`MC` は No. が裸の数値だった場合のフォールバックで `NPC###` に読み替える |
| `C` | `assets/art/characters/` | キャラクターカード |
| `E` | `assets/art/enchantment/` | エンチャント（強化）カード |
| `EN` | `assets/art/enemies/` | 敵専用カード |
| `S` | `assets/art/cards/` | スペル（**ディレクトリ未作成**。スペルを実装する時に要対応） |

指輪は `reward.js` が `assets/art/ring/R###.jpg` を直接組み立て、アイテムは `art` プロパティで直接指定する。
番号と絵が一致しないカードだけ `CharacterArtOverrideMap`（assets.js）に名前で例外登録する。

## 主要な状態（G オブジェクト）

`initState()`（`js/engine/state.js`）で初期化。フィールド数が非常に多いため、以下は代表的なものの抜粋（網羅ではない。全量は `initState()` を直接参照）：

- `G.rings[]` — 装備中の指輪4枠（null = 空スロット）。`G.spells` / `G.ringSlots` / `G.handSlots` は存在しない
- `G.mainBoard[]` — メイン置き場（5列×3行＝15枠）。パーティ全体で共有する単一の配置グリッド
- `G.inventory[]` — マップ用インベントリ（9×2＝18枠）。`G.globalPanels[]` は全体強化7枠
- `G.spellSlots[]` — 廃止済み。互換用に空配列だけ残っている
- `G.allies[]` / `G.enemies[]` — 戦場のユニット（hp≤0 = 死亡）
- `G.phase` — `'init'` | `'player'` | `'enemy'` | `'commander'` | `'reward'` 等
- `G.floor`, `G.life`, `G.gold`
- `G.rewardGrade`, `G.rewardGradeUpCount`, `G.rewardCharCount`, `G.rewardCards` / `G.maxRewardCards` — 報酬グレード関連（旧 `G.rewardLv` は現存しない）
- `G.mana` — `{red, blue, green, yellow}`。`initState()`では未初期化で、戦闘開始時に`battle.js`の`_ensureMana()`が遅延生成する
- `G.buffAdjBonuses` — パネル配置（隣接強化）による永続ボーナス

## その他のファイル

- **old_build/** — Unityビルド（日付フォルダ／mac用・win用）
- **画像素材/** — PNG素材（キャラ・敵・カード・UI）
- **資料/** — 企画・カードリスト資料

## サウンドエフェクト

SE選定・実装時のみ `docs/SOUND_EFFECT_RULES.md` を読むこと。

SEに関係しない改修では読まないこと。

### 追記38（2026-08-30）
- タイトルのカーソル背景（`#title-select-back`）の明滅が消えていた原因は、タイトルのデバッグボタンCSSを削除した際に**セレクタ行だけが消えて宣言ブロックが孤立**して残っていたこと（`index.html` 269〜288行）。孤立ブロックはCSSパーサのエラー回復で次の規則まで巻き込み、直後の `.title-menu-back{...}` がCSSOMから丸ごと欠落していた（`animation:none` / `z-index:auto` として観測）。孤立ブロックを削除し、CSSOMに `.title-menu-back` が復帰、`animationName=title-start-glow` を実機確認した。同様の孤立ブロックが他に無いことは、`<style>`ブロックのブレース深度スキャンで確認済み（検出0件）。
- タイトルBGMが操作前に鳴らない件は、`playBgm()` の重複ガード `_bgmStartingKey` を**自動再生拒否時にも保持していた**ため、導入1秒後の再試行も操作時の再試行もすべて冒頭のガードで無視されていた。成功時・失敗時とも `_bgmStartingKey` をクリアし、再試行が旧版（`419935e`）と同じく毎回新しい `audio.play()` に到達するようにした。キャッシュキーは `audio.js?v=titleBgmAutoplay02`。**音の実機確認はClaude側環境ではできない（`_IS_CLAUDE_BROWSER_PREVIEW` で全音声が無効）ため未確認。**
- マナ連鎖（「1マナ：3マナを得る」→「1マナ毎：+1/+1」）が1回しか乗らない不具合の原因は `coreApplyManaThresholdEffects()` の遅延モード。**1発動ごとに `coreRestoreDeferredState()` で全状態を巻き戻していた**ため、
  1. 各 `deferredAfter` が「走査前の盤面＋その1発だけ」の絶対スナップショットになり、演出側（`battle.js:2172`）が順に復元すると先行する発動が全部消える（＝最後の1回しか残らない／2体目は無変化）
  2. 閾値効果で得たマナが巻き戻され、後続の「Xマナ毎」の到達回数が伸びない
  3. `_extraManaThresholds` がディープコピーで作り直され、効果ごとの発動回数カウンタ（`_manaFireCounts`）が別オブジェクトへ逃げて上限を超えて発動する
  の3点が同時に起きていた。巻き戻しを**走査の最後に1回だけ**へ変更し、`deferredBefore/After` は累積スナップショットにした。1パスにつき (ユニット×閾値) 1回しか発動しないため、パス上限も10→100へ引き上げた。キャッシュキーは `core.js?v=manaChain01`。
- `effect_audit.js` に「マナ連鎖回帰」を追加（4マナ＋サテュロス相当＋活性化相当で、非遅延と遅延の発動回数・最終ステータス・マナが一致すること）。旧実装へ戻すと `遅延=10回 5/4 3/6 mana=4` でNGになることを確認済み（＝ユーザー報告の症状を再現する回帰）。
- 自動検査は効果監査NG0、カードコアスモーク129件、カード別オフライン／オンライン一致87件、戦闘イベント回帰すべて通過。**戦闘速度・ダメージ表示のz-index・開戦直後のワープは今回未検証。全カードの実機解消確認も未完了。**
- デバッグ試験戦闘が「直前の戦闘の敵をそのまま呼び出し、数値だけ置き換える」状態になっていた。原因は通常戦闘のリトライ用スナップショット（`G._waveEnemySnapshot`／`G._waveRetryEnemyKey`）を試験戦闘でも再利用していたこと。加えて試験戦闘側が同じスナップショットを上書きするため、次の通常戦闘のリトライにも試験戦闘の敵が出る経路があった。試験戦闘では再利用も書き込みも行わず、敵生成を`_withFixedRandom(TEST_BATTLE_ENEMY_SEED,…)`で乱数固定し、毎回同じ内容にした。キャッシュキーは`battle.js?v=testBattleFixed01`。**ローカルサーバ停止中のため実機確認は未実施。**
- BGMが曲の頭から鳴る件：`_applyBgmStartTime()`が`readyState>=1`だけを条件に`currentTime`へ代入していた。`seekable`がまだ空／開始位置を含まない状態では代入しても位置は0のまま戻り、そのまま頭から再生される。到達を実測して確認し、`loadeddata`/`canplay`/`progress`/`seeked`と120msポーリングで再試行、4秒で諦めてフェードインへ進む実装へ変更した。
- タイトルBGMの操作前再生：**原因はコードではなく配信オリジンだった。** ユーザー確認により、`http://127.0.0.1:5500` では操作前から正常に鳴り、別ポートのVSサーバーでは鳴らない。Chromeの自動再生許可（Media Engagement Index）は**オリジン単位**であり、ポートが違えば別オリジンとして扱われるため、実績のないポートでは`audio.play()`が拒否される。**開発時はポートを固定すること（5500）。**
- 上記を踏まえた保険として、自動再生が拒否された場合に`muted=true`で再生を開始し（ミュート再生はポリシー上つねに許可される）、直後にミュート解除を試し、拒否されて停止したらミュートへ戻して最初の実操作（`unlockSfx`）で解除する経路を追加した。キャッシュキーは`audio.js?v=titleBgmAutoplay04`。
- `game_title.wav`は34MB／192.9秒。`_applyBgmStartTime`の到達確認は、Range対応サーバー（Live Serverは`Accept-Ranges: bytes`／206を返す）ならメタデータ直後に`seekable.end=192.9`となるため待ちは発生しない。実測でも`play()`解決10.7ms→シーク確定10.9ms、`currentTime=97`ちょうど。Range非対応時に無音が続かないよう、諦めタイムアウトは1500msにした。
- 攻撃アニメーションの所要時間は距離・レーンに依存しないことを実測（`_playAttackMotionCore`の`runSegment`は`firstDuration+secondDuration=620ms`、`returnDuration=420ms`の固定値で、`scaledDuration=Math.max(180,duration)`以外に距離項が無い。呼び出し4か所も同じ固定値）。後衛は同じ時間でより長い距離を移動する＝既に速い。よって「後衛の攻撃を速くして前衛と同じ時間にする」変更は現状では対象箇所が無く、未実施。
- 同時に発動した複数のマナ閾値効果で、マナ効果VFX（とSE `K026`）が発動回数ぶん重なっていた。PvEは`_flushCorePveHitEvents()`のイベントループに`manaCuePlayed`フラグを追加し、1回の解決（1フラッシュ）につき1回だけ`_playManaEffectCue()`を呼ぶ。区切りは即時攻撃モーション（`attack`かつ`immediate`）だけとし、マナ閾値効果自身が出す`damage`（アラクネ等）では区切らない。オンラインも`board.js`に同じ間引き（`MANA_CUE_RUN_TYPES`／`_manaCueShownInRun`）を入れ、2回目以降は60msだけ待って盤面更新する。`_playManaEffectCue()`はPvEではvoidで投げっぱなしのため、間引いても効果の解決順・タイミングは変わらない。実測：サテュロス＋ラミア＋活性化（4マナ）の15回発動→VFX 15回から1回、アラクネ9マナ3回発動→1回。キャッシュキーは`battle.js`／`board.js`とも`manaCueOnce01`。`battle_event_regression.js`に間引きの回帰を追加。
- 開戦時に大量のマナ閾値効果が発動すると遅延する件：`_flushCorePveHitEvents()`が閾値イベント1件ごとに`renderManaHud()`を呼んでいたため、発動回数ぶんHUD再描画が走っていた（実測：味方14体・12マナで発動168回）。連続する閾値の最後の1回だけ描画するよう変更（`G.mana`/`G.gold`自体は毎回更新）。あわせて、同じ発生元・効果・対象への`stat_change`固有VFX（1回700msの直列await）も`effectStatVfxKeys`で1回だけにした。コア側の計測では味方14体・12マナでも100msなので、遅延はコアではなく演出側。
- 同じキャラクターが1回の解決内で複数回ダメージを受けるとダメージ数値が重なって読めない件：`_flushCorePveHitEvents()`のダメージ表示を対象ごとに順処理にした（`damageLabelReadyAt`）。前の数値ラベルが消えるまで待ってから次を出す。待ち時間の式は`render.js`の`damageLabelDurationMs()`に一本化（既定950ms、`G._effectVfxSpeedMultiplier`で短縮、下限600ms）。対象が違う場合は待たない。キャッシュキーは`battle.js`／`render.js`とも`damageSerial01`。**注意：`G._effectVfxSpeedMultiplier`は現在どこからも設定されていない（read専用）ため、実効は常に950ms。**
- 編成画面「旅の進捗」の見出しだけ字送りが詰まっていた原因は、本文用の`letter-spacing:.04em!important`が`html body .reward-prod-journey *`で見出し(h2)まで巻き込んでいたこと。`*:not(h2)`へ変更し、見出しへ`.18em!important`を明示。実測で「アイテム／指輪／クエスト／旅の進捗」すべて7.92px（=.18em）に一致、本文は0.56pxのまま。
- 3枚合体の星（`.triple-merge-star`）の周期的な強発光（`tripleMergeStarShimmer`：82%で`brightness(1.8)`＋`scale(1.14)`）を削除し、`text-shadow`による一定の淡い発光だけにした。実測で`animationName:none`。合体の瞬間の白光（`.triple-merge-flash`／`.triple-merge-white-flash`）は変更していない。
- 編成画面の「所持金」見出しと「ライフ」見出し（`.reward-prod-turn h2`＝実行時に`reward.js`がラベルを「ライフ」へ差し替える）を比較したところ、CSS上の差は枠内の`left`が50px／51pxの1pxのみで、font-size・font-weight・text-align・letter-spacing（ともにnormal）・色はすべて一致していた。所持金を51pxへ合わせたが、ユーザーの意図が字送り等であれば再指示が必要。
- マナ効果VFXの間引きを「1回の解決につき1つ」から「キャラクターごとに1つ」へ変更。同じカードの複数回発動だけを抑え、別キャラクターの同時発動はそれぞれのカード上で同時に再生する（PvE=`manaCueUnitIds`／オンライン=`_manaCueUnitIds`）。
- ダメージ数値が重なる件の本命は`applyDamageBatch()`だった。`damaged.forEach`が全結果の`playHitVfx*`を投げっぱなしで同時に開始しており、同じキャラクターが1バッチ内で複数回ダメージを受ける（攻撃＋効果ダメージ等）と数値が同じ位置に重なる。対象ごとの順番待ちキュー（`damageDisplayQueues`）を入れ、前の数値ラベルが消えてから次を出すようにした。表示自体は投げっぱなしのままなので戦闘進行のタイミングは変えない。遅らせた2回目以降は保存済み矩形が古くなるため、現在のDOMスロットから引き直す（取れなければ保存済み矩形へフォールバック）。`_flushCorePveHitEvents()`側の`damageLabelReadyAt`と合わせて2経路とも対応。キャッシュキーは`battle.js?v=damageSerial02`。
- 3枚合体が起きないのは`reward.js:419`の`pending.sourceName==='DEBUG'?null:_tryTripleMergeOnBoard(...)`ガード（419935e以降に追加。コメント：デバッグ配置では同一カードを複数スロットへ置いて召喚上限や誘発回数を検証できるようにする）。合体ロジック自体は正常（実機でサテュロス3枚→「サテュロス+」rarity2を確認）。**ユーザー判断で現状維持**とし、デバッグ配置は合体しないまま。デバッグ中に合体を見たい場合は、3枚並べた後に盤面上でどれか1枚を別スロットへドラッグすれば`reward.js:5128`の経路で合体する。
- 負傷効果が2回発動する件（メデューサ）の原因は、**同じ効果が2箇所に実装されていた**こと（デュラハン・幻影に続き3件目）。`coreApplyInjuryEffects()`内に、名前ブロック `for (i < coreEffectCount(unit,'メデューサ') && actualDamage>0) applyHit(unit,target,actualDamage)` と、汎用テキスト解釈 `injuryText.match(/ランダムな敵にXダメージを与える。Xは受けたダメージに等しい/)` の両方があり、メデューサ本体は両方に該当して反射ダメージを2回撃っていた。汎用側へ `!coreHasEffect(unit,'メデューサ')` を追加（逆上・アバドンと同じ書き方）。実測で1回に。キャッシュキーは`core.js?v=medusaOnce01`。
- 同種の取りこぼしを機械的に検出するため、`effect_audit.js`へ**カード全体を走査する**「負傷ランダム単発二重発動回帰」を追加。「負傷：〜ランダムな敵に〜」を1回だけ書き、「全ての／毎／全体」を含まないカードは、負傷1回につき敵へのダメージイベントが1回以下であることを検査する。修正前の実装へ戻すと `NG(メデューサ:2回)` を検出することを確認済み。
- **未修正の発見（要判断）**：`coreApplyInjuryEffects()`にはコア側の再入防止が無い。ミノタウロス「負傷：直ちにランダムな敵に攻撃する。」はその攻撃の反撃ダメージで自分の負傷効果が再入し、コア単体では自分が死ぬまで攻撃を繰り返す（実測25回）。PvEは`battle.js:3072`の`_coreInjuryEffectsResolving`で1回に止めているが、**オンライン（`runBattleCore`）にはこのガードが無く、PvEと挙動が食い違う**。コア側へ別名フラグ（PvE側のフラグと衝突させないこと。衝突させると執念の炎・激怒の指輪の正規反復まで潰れる）でtry/finallyの再入防止を入れれば揃うが、「ついで修正禁止」に従い未実施。
- オンラインで「ずっと相手だけが攻撃する」原因は`board.js`の召喚配置。`G.allies`/`G.enemies`は`_toField()`が`new Array(MAX_SLOTS).fill(null)`で作る**固定長スロット配列**で、`renderField()`は`index 0..MAX_SLOTS-1`しか描画しない。召喚処理が`list.push(summoned)`していたため、配列長14に対して**index 14以降**へ入り、DOMスロットが作られない→`playAttackMotion()`が`fromEl`を取れず即returnする→内部では攻撃しているのに画面上は何も起きない、という状態になっていた（封印キャラ＋召喚ペリカンのように、実質そのユニットしか攻撃できない盤面で顕在化する）。レーン範囲内の空きスロットへ入れる`_placeSummonedUnit()`に置き換え、配列長を14に保つ。回帰も`battle_event_regression.js`へ追加（`list.push(summoned)`の存在自体をNGにする）。キャッシュキーは`board.js?v=onlineSummonSlot01`。ルール側（`runBattleCore`）は正常で、封印キャラ＋ペリカン構成でも攻撃回数はp1/p2とも30回で交互になることを実測済み。
- **オンラインとPvEは「ルールはコア共有・演出は別実装」であり、完全一致は保証されていない。** `offline_online_regression.js`の「87件一致」は`simulateOnlineBattle()`と`runBattleCore()`の比較であって、PvEの実戦ループ（`battlePhase`／`applyDamageBatch`／`_flushCorePveHitEvents`）とは比較していない（DOMが要るため）。現時点で判明している食い違いは次のとおり。
  1. 負傷効果の再入防止：PvEのみ（`battle.js:3072` `_coreInjuryEffectsResolving`）。コアに無いためミノタウロスがオンラインでは自滅するまで反復する（実測25回）。
  2. 負傷効果の反復回数：PvEは`unit._effectRepeatBonus`（`battle.js:3103`）、コアは`target.effectData.effectRepeatBonus`（`core.js:766`／`2733`）を見ており、`createCoreUnit()`が`_effectRepeatBonus`へ正規化するぶんオンラインで反復ボーナスが落ちる。さらにPvEは`isEnemySide?1:…`で敵側に執念の炎／激怒の指輪の反復を適用しないが、コアは両陣営へ適用する。
  3. 演出は完全に別実装：PvE=`applyDamageBatch`＋`_flushCorePveHitEvents`（battle.js）、オンライン=`renderOnlineVersusBoard`（board.js）＋`playback.js`。ダメージ数値の順番待ち、マナ効果VFXの間引き、召喚配置などは片方ずつ実装されており、片方だけ直すと乖離する。
  4. 再生テンポ：オンラインは`playback.js`の`ONLINE_PLAYBACK_WAIT_MS`でイベント種別ごとの固定待機を挟む（damage 260ms／death 220ms／mana_threshold 180ms／seal_release 520ms／transform 420ms／revive 520ms／sacrifice 320ms／seal_apply 260ms）。PvEに同等の固定待機は無く、これがオンラインだけ攻撃間が遅く見える直接の原因。
- PvE／オンラインのルール差3件を解消（ユーザー指示）。
  1. `coreApplyInjuryEffects()`へコア側の再入防止を追加（`_coreInjuryReentry`をtry/finallyで立て、本体は`coreApplyInjuryEffectsBody()`へ分離）。**PvE側の`_coreInjuryEffectsResolving`とは必ず別名にすること。同名にするとPvEの正規反復（執念の炎・激怒の指輪）が1回目で弾かれる。** 実測：ミノタウロスの攻撃イベントが25回→1回、メデューサは1回のまま。
  2. コアの負傷反復ボーナス参照を`target._effectRepeatBonus || target.effectData.effectRepeatBonus`へ統一（`core.js`の2箇所）。`createCoreUnit()`が`_effectRepeatBonus`へ正規化するため、effectDataだけを見るとオンラインで絆・3枚合体の反復が落ちていた。
  3. PvEの負傷反復回数（`battle.js`の`_applyUnitInjuryEffects`）をコアと同じ式へ変更。旧式は「敵側を一律1回に固定（`isEnemySide?1:`）」と「`_ringCount()`が陣営を問わずプレイヤーの指輪を数える」の2点でコアと食い違っていた。`coreRingCount(state,side,…)`はstate.rings.p2が空なので敵側は0を返し、「敵にプレイヤーの指輪を適用しない」旧PvEの意図は保たれる。
  `effect_audit.js`へ「負傷再入防止回帰」「負傷反復ボーナス参照回帰」、`battle_event_regression.js`へPvE式のソース検査を追加。キャッシュキーは`core.js`／`battle.js`とも`pvpParity01`。
- オンラインで後衛のキャラが全員前衛に出る原因は`versus.js`のレーン判定 `lane:(idx>=5&&idx<=9)?'rear':'front'`。PvEの`applyNewPanelBattleStart()`は`idx<10`を前衛、`idx>=10`を後衛（`MAIN_BOARD_REAR_SLOTS=[10,12,14]`）として出撃させるため、中段(5〜9)を後衛にしていたオンラインだけ魔導板の並びと食い違っていた。`lane: idx >= 10 ? 'rear' : 'front'` へ修正し、回帰も追加。キャッシュキーは`versus.js?v=laneParity01`。

## 再生層の一本化（進行中）

### 現状の対応表（2026-08-30時点）

| コアイベント | オンライン | PvE |
| --- | --- | --- |
| `battle_start` | `board.js` case | `startBattle()`（イベント駆動ではない） |
| `attack` | `board.js` case（モーション再生） | `_dealAttackDamage()` / `enemyAttackAction()` |
| `damage` | `board.js` case | `applyDamageBatch()` の `results` 経由 |
| `death` | `board.js` case | `processAllyDeath()` / `processEnemyDeath()` |
| `mana_threshold` `mana_gain` `gold_gain` `summon` `transform` `stat_change` | `board.js` case | `_flushCorePveHitEvents()` |
| `gold_spend` `keyword_effect` `life_drain` `mana_set` `seal_apply` `revive` `shield_set` `shield_lost` `ring_effect` `death_summon_grant` `life_set` `life_gain` `instant_death` `curse_death` `item_reward` `bonus_reward` `sacrifice` `seal_release` | `board.js` case | フラッシュに無い。`_applyCoreShieldLostEffectsLive()` / `_resolveSeals()` / 終戦処理など**別々の場所**で個別処理 |

つまりオンラインは28種を1箇所（`renderOnlineVersusBoard`）で、PvEは6種をフラッシュで・残りを各所で処理している。**同じ演出が2実装ある**ため、片方だけ直すと必ず乖離する（実例：オンライン召喚のスロット外push、レーン判定、ダメージ数値の順番待ち、マナ効果VFXの間引き）。

### 方針

`js/battle/present.js`（新規・DOM演出の唯一の実装）を作り、イベント種別ごとの関数を両方から呼ぶ。`present.js`は`G`を直接触らず、呼び出し側が渡す`ctx`経由でのみ盤面へ触る。

```
ctx = {
  findUnit(side, unitId),        // 表示盤面から実体を引く
  listFor(side),                 // G.allies / G.enemies に相当する固定長スロット配列
  render(),                      // 盤面の再描画（PvE=renderAll / online=_render）
  requestCompact(opts),          // FLIP詰め（両方 requestBattleCompact）
  isOnline,                      // 演出の分岐が必要な箇所だけで使う（極力使わない）
  attackDamageEvents,            // attackイベントの先読み用（online）
}
```

### 段階（この順で進める。1段階ごとに自動回帰を通し、実機確認してから次へ）

1. **フラッシュが既に持つ6種を共有化**：`summon` / `mana_threshold` / `damage` / `stat_change` / `transform` / `mana_gain`・`gold_gain`。乖離が実際に起きたのは全部ここ。
2. **`attack` / `death` を共有化**：モーション・死亡演出・盤面詰めの呼び出し順を1本にする。
3. **残り18種を共有化**：PvEでは各所に散っている処理を`present.js`へ集約し、PvE側は呼び出しだけにする。
4. **再生テンポの統一**：`playback.js`の`ONLINE_PLAYBACK_WAIT_MS`を廃し、PvEと同じ「モーション尺＋`battleSleep`」で刻む。オンラインは結果を先に確定させてから再生するだけなので、尺が定数である限り両クライアントの再生時間は一致する（＝同期ズレは起きない）。

### 差し戻した実装（同じ失敗を繰り返さないこと）

2026-08-30、段階1をCodexへ委譲したが**差し戻した**。提出物は次の形だった。

- `present.js`はほぼ空のディスパッチャで、実処理は全部呼び出し側の`ctx.*`コールバックへ戻していた。
- そのコールバックはPvE/オンラインの既存コードを**コピーして作った**もので、**元のコードは`if(typeof presentXxx==='function'){…; continue;}`の後ろに死にコードとして残されていた**。結果、同じ演出の実装が**3つ**になった（従来2つ＋新コピー）。
- 新経路でいくつかの挙動が落ちていた：PvEのダメージで`updateUnitDamageUi()`が呼ばれない／`mana_gain`の`deferUntilThreshold`保留が消える／`pendingSummons`を使う召喚配置が別関数に置き換わる／`_recordBattleTrace`が消える。
- `presentDamage`にPvEが`damageLabelReadyAt`と`damageDisplayQueues`の両方を渡しており、同一対象のダメージ表示が二重に順番待ちする。
- 自動検査は全部通っていた。**これらはPvEのDOM経路を通らないため検出できない。**

**教訓**：この作業の要件は「共通化」であって「共通の入口を足す」ではない。
実装を`present.js`へ**移して元を消す**こと。元を残したまま新経路を足した時点で差し戻す。

### 片側限定機能の扱い（PvEのみ／PvPのみ）

**ユーザーは「PvEだけ」「PvPだけ」の機能追加を指示することがある。これは違反ではない。**
片側だけに追加する指示を受けても、勝手に両側へ広げないこと。ただし**後からもう一方へ出せる形**で作ること。

- 実装は必ず**共有実装＋有効化フラグ**にする。`if (isOnline)` のようなコード分岐で**別実装を作らない**。
  戦闘に関わるものは必ず**コアイベントとして表現**し、受け口を共有再生層に置く。出す／出さないは
  `state.features.xxx` 相当のフラグだけで切り替える。
- 意図的な片側限定は下の表へ**必ず登録する**。パリティ検査はこの表を除外リストとして読み、
  **表に無い差分は落ちる**。

#### 意図的な片側限定の登録表

| 機能 | 有効な側 | 形 | 後から反対側へ出せるか |
| --- | --- | --- | --- |
| （現在なし） | — | — | 2026-09-01時点で、意図的な片側限定は無い |

**解消済み**：先攻の決定（生存数が同数のとき）はPvEが味方固定・PvPが乱数で食い違っていたが、
2026-09-01のユーザー指示で**両方とも乱数**へ揃えた。判定は `corePickFirstSide()` が唯一の実装。

#### 「後から出せる」形になっているかの判定

コアイベントとして出ているものは、受け口を書くだけで反対側へ出せる。実測（2026-08-30）：

| イベント | core | board.js（オンライン） | battle.js（PvE） |
| --- | --- | --- | --- |
| `life_gain` / `life_set` | あり | あり | **あり**（2026-08-31 に追加。`_syncCoreLifeToG()`） |
| `gold_spend` | あり | あり | **無し** |
| `gold_gain` | あり | あり | あり |
| `item_reward` / `bonus_reward` | あり | あり | あり |

PvEはイベントを消費せず、コアへ渡した `state` を読み戻す方式である。
そのため**「PvEにしか無い機能」よりも「PvEが書き戻しを持っていない」ケースの方が多い。**
ライフは修正済み。`gold_spend` は経路ごとにゴールドの扱いが違うため未着手で、
**着手する場合は既存のゴールド加算と二重にならないか先に確認すること。**

### 守ること

- **数値・発動回数・勝敗は`present.js`で一切計算しない。** イベントに書かれた値をそのまま使う。
- 段階ごとに`battle_event_regression.js`へ「両方が同じ関数を呼んでいる」ソース検査を足す。
- 1段階終わるごとに効果監査NG0・カードコアスモーク・カード別一致87件・戦闘イベント回帰を通す。

### 段階0の結果（2026-08-30）

**先行作業：ハーネスのヘッダ名化。** `tools/balance_sim/` の3本（`effect_audit` / `card_core_smoke` /
`offline_online_regression`）がマスターデータを**列位置**（`r[11]`, `r[14]` 等）で読んでいた。
本体の `loader.js` はヘッダ名で読むため列追加に耐えるが、ハーネスは既存列の**前**に列を1本挿すだけで
別の列を効果文として読み、静かに無意味になる。共通入口 `tools/balance_sim/sheet_data.js` を追加し、
3本ともヘッダ名参照へ変更（重複していたCSVパーサも1本化）。列を「効果」の直前へ挿入しても
正しく読めることを実測で確認済み。**以後、シートの列参照は必ず `sheet_data.js` 経由にすること。**

**パリティ検査：`tools/parity/board_parity.js`**（index.htmlからは読み込まない。ブラウザで中身を
評価してから `checkBoardParity()` を呼ぶ）。同じ魔導板を、PvE経路（`applyNewPanelBattleStart` の
`deploySlotGroup` と同じ選択規則）とオンライン経路（`buildOnlineSelfFormation`）に通して差分を出す。
永劫の力がカード本体を書き換えるため、必ず魔導板をディープコピーしてから両経路へ通すこと。

測定結果（サテュロス/ラミア/活性化/メデューサ/ミノタウロス/ドワーフ/アラクネ＋魔導板強化1つの盤面）：

| 項目 | 結果 |
| --- | --- |
| 出撃人数 | 6 / 6 一致 |
| ユニット内容（ステータス・キーワード・レーン・マナ閾値・隣接強化・効果テキスト・共振） | **食い違い0件** |
| **出撃順** | **食い違いあり** |

出撃順だけが違う。PvEは魔導板の**列**から戦闘スロットを決める（`_battleSlotForMainBoardSlot()`＝`idx%5`）。
オンラインは**盤面indexの昇順**（`eq.forEach`）。

```
PvE      : サテュロス(slot1→battle2) アラクネ(slot6→battle2) ラミア(slot3→battle4) …
オンライン: サテュロス(slot1)         ラミア(slot3)          アラクネ(slot6)        …
```

`corePickAttacker()` は `sort((a,b)=>a.slot-b.slot)` で攻撃者を選ぶため、**出撃順＝攻撃順**。
同じ魔導板でもPvEとオンラインで攻撃順が変わる。段階1で `_battleSlotForMainBoardSlot()` を
共有ビルダーへ取り込み、オンラインも列マッピングに揃える（PvEを正とする）。

### 段階1の結果（2026-08-30）

`js/battle/formation.js` を新設し、**魔導板→出撃ユニットの変換をここ1箇所に集約**した。
PvEの `applyNewPanelBattleStart()` から `deploySlotGroup` を**削除**し、オンラインの
`versus.js` の独自ループも**削除**して、両方が `buildBoardFormation(board, opts)` を呼ぶ。

共通ビルダーが決めるもの：出撃スロットの選択（基本5枠＋魔導板強化枠）／前衛・後衛／
永劫の力／複製・恩寵による出撃体数／隣接強化の適用／`_battleSlotForMainBoardSlot()` による
列マッピング／希望スロット衝突時の解決（`_summonPanelUnitToFront/Rear` と同じ「近い順・左優先」）。
`opts.persistEternal` だけが両者の差（登録表に記載）。

実測（サテュロス/ラミア/活性化/メデューサ/ミノタウロス/ドワーフ/アラクネ＋魔導板強化1つ）：

| 検査 | 結果 |
| --- | --- |
| 共通ビルダーの予測配置 | slot1:アラクネ slot2:サテュロス slot4:ラミア slot8:メデューサ slot10:ミノタウロス slot12:ドワーフ |
| **PvEの実配置**（`applyNewPanelBattleStart` を実際に走らせた `G.allies`） | **同一** |
| オンラインの送信順（`buildOnlineSelfFormation`） | **同一** |
| ユニット内容の差分 | **0件** |
| 出撃順の差分 | **0件**（段階0で検出した唯一の差が解消） |

回帰も更新：`offline_online_regression.js` は「PvEに`deploySlotGroup`が残っていないこと」
「versus.jsが`_makePanelSummonUnit`等を独自に呼んでいないこと」を検査し、
`battle_event_regression.js` は「レーンと列マッピングの規則が`formation.js`にだけあること」を検査する。
**二重実装へ戻した時点で落ちる。**

- 永劫の力の恒久加算はPvE／オンラインとも有効にした（2026-08-30、ユーザー判断「PvP戦でセーブ側のカードを恒久強化してよい」）。
  オンラインの `buildSelfFormation()` は1回の対戦で2回呼ばれる（① `main.js` の `_startWaveFlowNext()`＝サーバーへ送る編成、
  ② `versus.js` の `startOnlineVersusBattle()`＝実際に戦闘を実行）。**恒久加算は②だけ**で行う。両方で行うと1戦で+2/+2になる。
  ①は加算せずに「加算後と同じ値」を返すため、送る編成の数値は②と一致する。①→②の順で呼ばれることが前提。
  回帰（`offline_online_regression.js`）が `persistEternal: true` の出現箇所が1つだけであることを検査する。
- 「ゲーム起動後の最初の数戦だけ、最初の数体の攻撃モーションが飛ぶ」原因は `_playAttackMotionCore()` の `runSegment()`。
  進捗を `p=(now-startedAt)/scaledDuration` で計算しており、**`startedAt` を「rAFを予約した時刻」で取っていた**。
  起動直後はカード絵・VFXのデコードでメインスレッドが数百ms止まるため、1フレーム目のタイムスタンプが
  既に尺（620ms）を超えて `p>=1` になり、**1フレーム目でいきなり終端へ飛ぶ**（＝モーションが再生されない）。
  さらに保険の `setTimeout(…, scaledDuration+80)` も、スレッドが詰まっていると最初のrAFより先に発火して
  同じ結果になっていた。アセットがキャッシュされる数戦後に自然に直るため「最初だけ」に見える。
  起点を「実際に最初のフレームが来た時刻」へ変更し、保険タイマーも最初のフレーム到着後に張り直す
  （それまでは `scaledDuration+2000` の長い保険）。回帰は`battle_event_regression.js`が
  「予約時刻起点へ戻っていないこと」を検査する。キャッシュキーは`render.js?v=motionFirstFrame01`。
- 戦闘が固まる件への耐性を追加。`requestAnimationFrame` はタブ非表示・最小化・スロットリング中に発火しないため、
  素の `await new Promise(r=>requestAnimationFrame(r))` は戦闘フローを永久に止め得る。`battle.js` に
  `_awaitFrame(timeoutMs=400)`（フレームが来ないときは打ち切って進む）を追加し、戦闘フロー内の
  タイムアウト無しrAF待ち6箇所を置き換えた。`playSpecialProductionVfx()`（封印解放S002・生贄破壊S003が通る）の
  逆再生ループにも `reverseMs+1500` の番人を追加し、必ず有限時間でresolveするようにした。
  **演出が途中で切れても戦闘は続けること。演出待ちで戦闘を止めない。** キャッシュキーは`battle.js`／`render.js`とも`frameWatchdog01`。
  なお報告された「生贄2・封印1でフリーズ」はClaude側環境では再現できていない（ブラウザペインが`document.hidden=true`で
  rAFが一切発火しないため、正常系との区別がつかない）。**根本原因は未特定。** コンソールの例外を確認すること。
- 戦闘画面のY配置の実測（キャンバス座標3840×2160、`--unit-card-h`は戦闘時395px）：
  `#f-enemy` top114–bottom928／`#f-ally` top1233–bottom2047。両者を合わせた中心は1081で、画面中心1080と1pxしか違わない。
  つまり**コンテナ単位では既に上下中央**。ユーザー要望「プレイヤーのカードY位置を魔導板の下2行と同じにする」は
  別の変更（魔導板は`#hand-pane` top683・`--unit-card-h`468.6・gap24なので、下2行のtopは1175.6と1668.2）。
  カードサイズが戦闘395／魔導板468.6と異なるため、「行の上端を合わせる」のか「カードサイズごと合わせる」のかで
  結果が変わる。**未着手（要確認）。**
- **フリーズの原因が確定した（ユーザー提供のコンソールログ）。** `Converting circular structure to JSON` が
  `clone(u)`（`_sacrificeUnitsForSeal` の生贄スナップショット、`battle.js:373`）で発生し、`_resolveSeals()` →
  `_finishNewPanelBattleStartEffects()` → `startBattle()` のPromiseが reject して戦闘が止まっていた。
  原因は共通コアの再入防止が **stateオブジェクトそのものをユニットへ持たせていた** こと
  （`unit._coreOpeningEffectsState = state` ほか計3箇所）。`state.units.p1` はそのユニット自身を含むため循環参照になる。
  `coreStateToken(state)`（`cs1`のような軽い文字列）を導入し、3箇所とも**文字列トークンで比較**するよう変更。
  **stateやDOM要素をユニットへ保持してはいけない。** `clone()`＝`JSON.parse(JSON.stringify())` は
  生贄スナップショット・ウェーブ再挑戦スナップショット・セーブなど多くの経路で使われるため、
  ユニットは常に直列化可能に保つこと。実測：再入防止（同triggerIndexは無視）と正規反復（別triggerIndexは発動）は維持、
  `JSON.stringify(unit)` は成功。`effect_audit.js` へ「ユニット直列化回帰」を追加。キャッシュキーは`core.js?v=noCircularState01`。
- 戦闘画面の上下余白を実測するプローブ `tools/parity/layout_probe.js` を追加（index.htmlからは読み込まない。
  コンソールに貼って実行する）。上下の余白・敵味方の枠・「所持金」を描いている全要素を一覧で返す。
  Claude側の合成描画（敵3前衛+1後衛／味方3前衛+2後衛）での実測は「上の余白114／下の余白113」で対称だった。
  ユーザーのSSでは非対称に見えるとの報告があり、**実機の数値待ち**。
- 実機のプローブ結果（2026-08-30、viewport 1592×1219／scale 0.41458）：
  `clipTop=clipBottom=161.75px`（レターボックスは上下対称）、`#scr-battle` top162/bottom1057、
  敵カード最上辺209・味方カード最下辺1010、**上の余白47／下の余白47／差0**。
  戦闘画面の上下余白は実機でも対称であり、コード上の非対称は見つかっていない。
- 同プローブで、**戦闘中に `#reward-info-bar .ri-soul`（「所持金」ラベル）が表示されている**ことが判明
  （`bodyClass="test-battle-active battle-turn-active"`、矩形 left1404–1473 / top192–199）。
  原因は index.html 4822行の
  `body:not(.reward-screen-active) #reward-info-bar .ri-soul:first-child, … #rw-gold{display:block!important}`。
  基底の `#reward-info-bar .ri-soul,#rw-gold{display:none!important}`（1021行）を打ち消しており、
  **編成画面以外（戦闘・マップ・村）でも所持金ラベルと金額が描画される**。
  試験戦闘を中断した直後に旅の進捗へ所持金が重なる症状は、この要素が原因の可能性が高い。
  **未修正**：`:not(.reward-screen-active)` での再表示が意図的かどうか要確認（マップ／村で所持金を出す目的の可能性）。
- 「戦闘背景が画面下まで描かれない」原因は、戦闘画面の背景既定位置が `background-position:center`（＝中央）だったこと。
  ステージ画は縦長（`stage_grassland.webp` は 6144×12288＝アスペクト0.5）で、`background-size:cover` だと
  3840×2160 の画面に対して**高さ7680px**で描かれる。`center` のままだと画像の中ほどが表示され、地面が画面下辺まで届かない。
  `#scr-battle.asset-backed::before{background-position:center bottom}` を既定として追加し、
  `battle-bg-*` クラスが付く前の一瞬やクラスが欠けた経路でも下端が一致するようにした（実測：クラス無しで
  「画像下端−画面下辺＝0」）。`battle-bg-reveal`（スライド開始位置＝center top）は id+2クラスでこの既定に勝つため影響しない。
  エリート／ボスは `battle-bg-scrolling` が `center bottom` を指定しており、3秒のスライド後は下端一致になる
  （Claude側はタブ非表示でCSSトランジションが進まないため、**スライド完了後の実測は未確認**）。
  ラスボスは `#stage-bg-video` を不透明で重ねるため、この背景画像は見えない。
- 「編成画面以外で所持金が重なる」件は index.html の
  `body:not(.reward-screen-active) #reward-info-bar .ri-soul:first-child, … #rw-gold{display:block!important}` が原因。
  基底の `display:none!important` を打ち消し、戦闘・マップ・村でも所持金ラベルと金額を描画していた（意図的でないとユーザー確認済み）。
  当該ブロックを削除。実測で 戦闘中=`display:none`／編成画面=`display:block` を確認。
- 戦闘背景の「下まで描画されない」件、Claude側の実測では**ずれが見つからない**。実アセットを読ませて計測した結果：
  `battle-bg-normal` で `background-position` は `50% 100%`、`background-size:cover`、
  `stage_forest.webp`（6144×12288）は cover 後 7680px で描かれ、**画像下端−画面下辺＝0**。
  画像最下行も不透明（alpha 255）で、明るさ0〜21の**暗いビネットが絵の側にある**だけ。
  暗帯の厚み（明るさ閾値16で走査）は grassland 0px／forest 43px／valley 4px／endworld 6px／capital1 157px（画面px換算）。
  つまりCSS上は下端一致しており、見た目で「途切れて見える」のは**アセットのビネット**の可能性が高い。
  `tools/parity/layout_probe.js` に背景セクションを追加（`画像下端−画面下辺`／実際に効いているクラス・position・
  stage-bg-videoの状態・facility-bg-activeを返す）。**実機の数値待ち。**
- 戦闘背景の件はアセット側（絵の下端のビネット）で、ユーザーが修正して解消。**コードのずれは無かった**。
- 「負傷効果がダメージ表示より先に動いて見える」件：`applyDamageBatch()` はダメージ表示を開始した直後に
  負傷効果を発火していた（コメントも「開始した直後に実行する」と明記していた）。ミノタウロスの
  「負傷：直ちに攻撃する」では、被弾数値より先に攻撃し始めて見える。`INJURY_EFFECT_DELAY_MS=260`（ms）を追加し、
  **味方・敵の負傷対象を先に集めてから1回だけ待って**発火するようにした（味方／敵で別々に待つと2倍間延びする）。
  値を0にすると元の症状へ戻る。長くすると戦闘全体が間延びするので、数値が視認できる最小限にとどめること。
- 「攻撃時に元の位置へカードが現れて2枚に見える」件：`renderField()` は `G._battleMotionDepth>0` のときだけ
  実スロットを隠していたため、モーションの入れ子・中断で深度の数え違いが起きると、飛んでいる複製と
  元位置の実カードが同時に見える。深度に加えて **`.attack-motion-clone[data-unit-id=...]` がDOMに生きているか**を
  直接確認するようにした。実測：深度0でも複製が生きている間は `visibility:hidden`、複製を消すと `visible` に戻る。
  キャッシュキーは`battle.js`／`render.js`とも`injuryDelay01`。

### 段階2の進捗（2026-08-30）

**2a・2b完了：1ターン分の進行を `coreBattleStep(ctx)` として切り出した。**
`runBattleCore()` はその繰り返しになり、ターン順・攻撃者選択・毒の解決・封印の再判定・終了条件の実装は
**この1箇所だけ**になった。PvEもここを1手ずつ呼べる形になっている（接続は次のスライド）。

```
ctx    : { units, state, rng, emit, applyHit, resolveSeals, decided, side, result }
戻り値 : { side, result, stop }   stop=true は従来の break 相当
```

`continue` は `return {side,result,stop:false}`、ループを抜ける `break` は `return {…,stop:true}` へ機械的に置換した。
内側の `for` の `break` と、`attackTargets()` 内の `return` は対象外（ネストしたループ／関数の中）。

**検証**：`tools/parity/core_refactor_diff.js` を追加。リファクタ前の core.js をコピーしておき、
実データのキャラクター87件を同じ種で両方に流して**イベント列・勝敗・最終状態を deepEqual** で比較する。

```
cp js/battle/core.js /tmp/core_prev.js      # 変更前に取る
node tools/parity/core_refactor_diff.js /tmp/core_prev.js
```

2a・2bとも「対象=87件 不一致=0件 OK」。**挙動を変えないリファクタなのに差分が出たら、その時点で差し戻すこと。**
回帰（`offline_online_regression.js`）に「`coreBattleStep()` が存在し、`runBattleCore` がそれを呼び、
公開されていること」を追加した。キャッシュキーは`core.js?v=battleStep01`。

**次のスライド（2c）**：PvEの `battlePhase()` を `coreBattleStep()` の繰り返しへ置き換える。
PvE固有（カットイン・ライフ・報酬・試験戦闘の中断）はイベント列から再導出する必要があるため、
先に「PvEが1ターン分のイベントを受け取って再生する」経路を作ってから、ループ本体を差し替えること。

### 段階2c（部分完了）：戦闘ループの規則をコアへ寄せた（2026-08-31）

PvEの `battlePhase()` とコアの `coreBattleStep()` を突き合わせ、**規則の食い違いを2件解消**した。
`battlePhase()` 自体の置き換え（＝PvEがコアのループを回す形）は**未実施**。理由は末尾に書く。

**解消したもの**

1. **攻撃者の選択**：PvEの `_pickLaneAttacker` / `_laneAttackCandidates` をコアへ移し
   （`corePickAttacker(units, laneState, isEnemySide)` / `coreLaneAttackCandidates(units, lane, isEnemySide)`）、
   PvE側は `{idx, lane, switched}` へ写すだけの薄い関数にした。旧コアとの違いは3点あった。
   - **ATK0のユニットが手番を得ていた**（PvEは飛ばす。ただし毒持ちは毒処理のため手番を得る）
   - **反対レーンへ移るとき `attacked` を引き継いでいた**（PvEは巡回を作り直す）
   - 3手目のフォールバックが「front から再開」だった（PvEは同じレーンを再開）
   検証：ランダム盤面 **4349回の選択列を旧PvE実装と比較して不一致0**。実データ87件の戦闘では
   **インキュバスの1件だけ**イベント列が変わった（ATK-1で0になった敵が手番を飛ばすようになったため＝意図どおり）。
2. **挑発（hate）の残りターン**：PvEは味方が行動するたび減らしていたが、コアには無く
   **オンラインでは挑発が永久に切れなかった**。`coreBattleStep()` の末尾で「行動した側」のユニットについて減らすようにした。
   PvEの規則をそのまま一般化したもの。実測で挑発が切れることを確認。

**残っている食い違い（未着手・PvEを正とするかは要判断）**

| 項目 | PvE | コア | 備考 |
| --- | --- | --- | --- |
| 先攻（同数時） | 味方固定 | 乱数コイン | **意図的な差分として登録済み**。PvPで揃えるとp1有利になる |
| ~~ターン上限~~ | ~~`safety<500`~~ | ~~`BATTLE_CORE_TURN_LIMIT=200`~~ | **解消済**：コアの定数を500（PvE基準）へ揃え、PvEもその定数を使う |
| 引き分け | 敵配列をクリアして `finishBattleAsVictory('Draw')` | `{outcome:'draw'}` | PvE側は演出・進行の話。イベントからの再導出でよい |
| 攻撃ごとの例外捕捉 | `try/catch` でその攻撃だけスキップ | 無し | PvE固有の保険。コアへ持ち込む必要はない |
| `updateBattleSpeedMode()` / `requestBattleCompact()` / `_testBattleAbort` / `_flushRingManaThresholdEffects()` | PvEのみ | — | 演出・進行。段階3の再生層へ移す対象 |

**`battlePhase()` の置き換えを見送った理由**

置き換えには「1ターン分のイベント列を受け取って再生する経路」（＝段階3の再生層）が必要で、
攻撃モーション・死亡演出・カットイン・報酬遷移・試験戦闘の中断まで巻き込む。
**この範囲はClaude側の環境では検証できない**（ブラウザペインが `document.hidden=true` でrAFもCSSトランジションも進まず、
アニメーション・音・見た目を一切確認できない）。ユーザーの承認と実機確認が取れない状態で盤面の進行そのものを
差し替えると、壊れたまま放置される危険が高い。規則の統一（上記1・2）は自動検証できるためここまで進めた。

**再開手順**：`cp js/battle/core.js /tmp/core_prev.js` を取ってから作業し、各スライスで
`node tools/parity/core_refactor_diff.js /tmp/core_prev.js` を通すこと。意図した変更以外の差分が出たら差し戻す。

3. **ターン上限**：PvEは `safety<500`、コアは `BATTLE_CORE_TURN_LIMIT=200` で、決着が付かない盤面の
   引き分け成立タイミングが食い違っていた。コアの定数を **500（PvE基準）** へ揃え、PvEの `battlePhase()` も
   その定数を参照するようにした。**両方が同じ定数を使うこと。** 実データ87件の差分は0件（検査は turnLimit:8 のため）。

### PvE／コアに残るルールの二重実装（2026-08-31 監査）

Codexへ**読み取り専用**で洗い出させ、Claudeが該当箇所を実際に読んで裏取りしたもの。
段階2cを再開するときは、まずこの表の「どちらを正とするか」を決めること。

| # | ルール | PvE | コア | 状態 |
| --- | --- | --- | --- | --- |
| 1 | **反撃の発動回数（複数対象攻撃）** | 主対象1体からのみ反撃 | 対象ごとに反撃していた | **解消済**。コアの `hit(victim, allowCounter)` を `victim === target` のときだけ反撃させる形にした。二段／三段の追加攻撃は別の攻撃なので従来どおり毎回反撃を受ける。実測：全体攻撃で3体に命中・反撃1回 |
| 2 | **疾風の指輪の追加攻撃** | 数えていなかった | 数えていた | **解消済**。指輪の効果文が「常時：味方の攻撃回数は1回追加される。」なので**コアが正**。PvEを合わせた |
| 3 | **タイタニアの追加攻撃の数え方** | 盤面の生存体数 | 攻撃者が効果を持つかの0/1 | **解消済**。カードの効果文が「常時：**味方の**攻撃回数は1回追加される。」なので**PvEが正**。コアを合わせた。2体並べれば+2 |
| 4 | **敵側の攻撃範囲判定** | `{fromKeywordsOnly:true}` | 効果文も含めて判定 | **パリティ問題ではない**ので現状維持。この指定はPvE専用の生成敵にだけ効くもので、両陣営とも編成盤面のPvPには存在しない条件。理由をコードのコメントにも残した |
| 5 | **三方向攻撃の対象列** | 固定長配列のindexで左右を選ぶ | 生存だけに詰めた配列のindexで選ぶ | **解消済**。PvEに合わせて盤面配列の隣接スロットで選ぶようにした。実測：slot1が空きなら E2,E3 のみ（E0は入らない） |
| 6 | 秘紋の指輪（解放効果の追加発動） | `_releaseRepeatCount()` が味方のみ+1（`battle.js:419-420`） | 数えていなかった | **解消済**（2026-08-31）。コアへ `coreRingCount(state, unit.side, '秘紋の指輪')` を追加。`coreRingCount` は自陣営だけを数えるのでPvEの「敵側には適用しない」も満たす |
| 7 | 先攻（生存数が同数のとき） | 味方固定 | 乱数コイン | **意図的な差分として登録済**（PvPで揃えるとp1有利）。要ユーザー確認 |
| 8 | 引き分けの終了処理 | 敵配列を空にして `finishBattleAsVictory('Draw')` | `{outcome:'draw'}` を返すだけ | 進行・演出の話。段階3で再生層へ寄せる |

**1〜5はすべて解消した（2026-08-31）。**どちらを正とするかは、**マスターデータの効果文**で決めた。
#2は指輪の効果文からコアが正、#3はカードの効果文からPvEが正、#1#5はPvE基準（ユーザーが検証してきた側）。
片側だけを直さず、必ず「1箇所の実装を両方が呼ぶ」形にしてある。
**値の調整（例：全体攻撃で全員が反撃するようにしたい）は後からこの1箇所を変えれば両方に効く。**

追加で `coreExtraAttackTotal(attacker, allies, hasteRingCount, opts)` を新設し、
「常時：味方の攻撃回数は1回追加される」を持つもの（疾風の指輪・タイタニア）をここ1箇所で数える。

補足（Codexの報告どおりでClaudeも確認）：ダメージ軽減・結界・団結／マータの分散・毒・命中時効果・
負傷効果・死亡効果・復活・開戦効果は、PvEが `coreResolveHit()` や各 `coreApply*()` へ委譲済みで、
PvE独自の結果計算は残っていない。

## アニメーション・見た目の検証方法（2026-08-31 追加）

**Claudeのブラウザペインでは検証できない。** `document.hidden=true` のため `requestAnimationFrame` も
CSSトランジションも進まず、`_IS_CLAUDE_BROWSER_PREVIEW` で音声も無効化される。Codexの環境にもブラウザが無い。

そこで **ヘッドレスChrome** を使う。**追加インストールは不要**（Chrome本体とNode標準の `WebSocket`/`fetch` だけ）。

```
node prototype/tools/parity/headless.js        # 自己診断（hidden=false / rAF発火 を確認）
node prototype/tools/parity/anim_check.js      # アニメーションの自動検証（要ローカルサーバー）
```

- `tools/parity/headless.js` … DevToolsプロトコルでChromeを操作する土台。
  `launch()` → `goto()` / `eval()` / `screenshot()` / `record()` / `consoleErrors()` / `close()`。
  一時プロファイルで起動するのでユーザーのChromeのデータには触らない。
  `--autoplay-policy=no-user-gesture-required` と `--mute-audio` を付けているので、
  **BGMの自動再生経路も無音のまま再現できる**（`_IS_CLAUDE_BROWSER_PREVIEW` も false になる）。
- `tools/parity/anim_check.js` … 攻撃モーション・背景スライド・コンソール例外の合否判定。

**これで検証できるようになったこと**：rAFで進むJSアニメーション、CSSトランジションの最終値、
スクリーンショット（連写も可）、ページ内の例外、音声APIの成否・再生位置・音量。
**まだできないこと**：実際に耳で聞く音、人間が見たときの印象。

### 発見と修正：攻撃時にカードが2枚に見える原因（実ブラウザ計測で確定）

`.slot` は `transition:all .18s`（index.html:305）を持ち、**`visibility` もトランジションの対象**だった。
そのため `_playAttackMotionCore()` が `visibility:hidden!important` を инлайн で当てても
**180ms は表示されたまま**で、その間だけ「飛んでいる複製カード」と「元位置の実カード」が同時に見えていた。

実測タイムライン（修正前）：`t=17ms 複製あり＋実カード表示` → `t=184ms でようやく非表示`（**167msの二重表示**）。
`html body .slot.motion-hidden` へ `transition:none!important` を追加して解消。
修正後は `t=17ms` で即 `複製あり＋実カード非表示` になり、**二重表示のフレームは0**。
`anim_check.js` がこれを常時検査する（`二重区間=0回` でなければNG）。

### 段階3・4の結果（2026-08-31）

**方針を1箇所へ集めた。** PvE（`js/engine/battle.js`）とオンライン（`js/online/board.js`）は
DOMの触り方もユニットの引き方も違うため、描画そのものを1関数へ統合するのは現実的でない。
一方、実際に食い違ってバグになったのは毎回**「どういう規則で見せるか」**の側だった
（召喚のスロット選択／ダメージ数値の重なり／マナ効果VFXの間引き／固有VFXの重複）。
そこで `js/battle/present.js` に**DOMもGも触らない方針だけ**を置き、両方がそれを呼ぶ形にした。
呼び出し側の旧実装は削除済み。

| 方針 | 実装 | PvE | オンライン |
| --- | --- | --- | --- |
| 召喚のスロット選択（末尾pushで描画対象外へ入る事故を防ぐ） | `presentChooseSummonSlot()` | 出撃は `formation.js`／戦闘中召喚は既存関数 | `_placeSummonedUnit()` が委譲 |
| 同じキャラへの連続ダメージの順番待ち | `presentCreateDamageGate()` | `damageGate`（フラッシュ）＋`damageDisplayQueues`（applyDamageBatch） | `_damageGate`（**今回オンラインにも追加**。従来は待ちが無く重なり得た） |
| マナ効果VFXをキャラクターごとに1回 | `presentCreateOnceGate()` ＋ `presentBreaksManaRun()` | `manaCueGate` | `_manaCueGate` |
| 固有VFXの重複抑止（発生元・効果・対象ごと1回） | `presentCreateOnceGate()` | `effectStatVfxGate` | （該当箇所なし） |
| 命中から結果を見せ始めるまでの間 | `PRESENT_HIT_BEAT_MS = 260` | `INJURY_EFFECT_DELAY_MS` が参照 | `ONLINE_PLAYBACK_WAIT_MS.damage` が参照 |

**テンポ（段階4）**：`ONLINE_PLAYBACK_WAIT_MS.damage` は PvE の負傷効果前の間と同じ意味なので、
`PRESENT_HIT_BEAT_MS` を唯一の定義にして両方が参照する形にした（実測でPvE・オンラインとも260）。
**この1箇所を変えれば両方のテンポが同時に変わる。**
残りの待ち（death 220／seal_release 520／transform 420／revive 520／sacrifice 320／
mana_threshold 180／seal_apply 260）は、PvE側が対応する演出の完了を await しているのに対し
オンラインは固定待ちで代用している。**数値を合わせるには両者の実測が要るため未着手。**
`tools/parity/anim_check.js` に計測を足してから調整すること。

**やってはいけないこと**：`present.js` の中で `G`・DOM・数値計算に触ること。
`battle_event_regression.js` が `present.js` に `document.` や `G.` が現れたら落とす。

**実測されているテンポ（段階4の調整用）**：攻撃モーションは複製生成 t=17ms → 複製消滅 t≈737ms →
実カード復帰 t≈772ms（`anim_check.js` の timeline より）。つまり**1回の攻撃の見た目はおよそ 770ms**。
これに命中後の間 260ms（`PRESENT_HIT_BEAT_MS`）と、同一キャラへの連続ダメージ時のラベル待ち
（`damageLabelDurationMs()`＝既定950ms）が乗る。オンラインの固定待ちを詰める際はこの値を基準にすること。

### コアの資源変化がPvEへ戻っていなかった件（2026-08-31）

**症状**：我慢の指輪（負傷：ライフが+2される）が**オンラインでは効き、PvEでは効かない**。

**原因**：オンラインはコアのイベント列をそのまま再生するので資源変化が必ず反映される。
一方PvEはコアへ渡した `state` を自前で読み戻す方式で、`state.resources.p1.gold` は
書き戻していたのに `state.life` は書き戻していなかった。
さらにPvEがコアへ渡す `state` は13箇所で個別に組み立てられており、
そのすべてに `life` フィールドが無かった。

**修正**：
- 13箇所すべての `state` に `life:{p1:Number(G.life)||0,p2:0}` を持たせた。
- `_syncCoreLifeToG(state)` を `_flushCorePveHitEvents()` の先頭に置いた。
  ここがコア→PvEの共通出口なので、この1点で大半の経路が反映される。
- 共通出口を通らない毒・復活・命中後の3経路にも同じ関数を置いた。
- ゴールドは経路ごとに扱いが違うため触っていない（`_syncCoreResourcesToG` は従来どおり）。

**再発防止**：`tools/balance_sim/pve_core_resource_parity.js`。
「PvEの全stateがlifeを持つか」「共通出口で書き戻すか」「コアのライフ変更点が増えていないか」を
静的に見たうえで、我慢の指輪と汎用文（負傷：ライフが+Nされる）を実際に発火させて確かめる。
修正前のコードに対して回すとNG 3で落ちることを確認済み。

**同じ形の落とし穴**：マナは `mana_set` イベントとして `_flushCorePveHitEvents()` 内で
処理されており、こちらは正しい。**資源をstate直読みで足すときは必ず書き戻しも足すこと。**

### PvEとコアの戦闘ループが一致するかの検証（2026-08-31）

ルールの食い違いは個別に潰したが、**PvEの `battlePhase()` とコアの `runBattleCore()`
（= `coreBattleStep`）は今も別々のコードである。** 片方だけ直せばまた食い違う。
`tools/parity/loop_parity.js` がそれを機械的に検出する。

同じ盤面・同じ乱数で両方を回し、各キャラの最終HP・生死・勝敗を比べる。

```
node tools/parity/loop_parity.js            # 実カードで比較
VB_PLAIN=1 node tools/parity/loop_parity.js # 素のキャラだけ＝ターン進行そのものを比較
VB_CASES=40 VB_URL=http://127.0.0.1:5599/index.html node tools/parity/loop_parity.js
```

**このツールを触るときの注意（すべて実際に踏んだ落とし穴）**：

1. **乱数は両者を同一にすること。** PvEはコアへ委譲する抽選に `coreMathRng` を使う。
   `Math.random` だけ固定してもPvE側は本物の疑似乱数で引くため、
   ルールではなく乱数の違いが差として出る。`coreMathRng` 自体を定数化して両方へ渡す。
2. **`startBattle()` が初期化するGのフィールドを揃えること。**
   `G.battleCounters` を用意し忘れると死亡処理が例外になり、
   `battlePhase()` はそれを握りつぶして**手番を交代しない**ため、
   攻撃順がずれて「ルールが違う」ように見える。console.error は必ず拾って落とすこと。
3. **1ケースごとにページを再読み込みすること。** Gには戦闘をまたいで残るカウンタ
   （味方の死亡数など）があり、2回目以降の結果がずれる。
4. **PvEは死亡キャラを配列から外す**が、コアは hp<=0 のまま残す。
   ATKを比べるのは両方生存しているときだけにする。
5. **先攻の同数時**（コアは乱数コイン／PvEは味方固定）は登録済みの意図的差分なので、
   定数乱数を 0.4 にしてPvE側へ寄せ、ここで拾わないようにしてある。

**結果**：素のキャラ（効果・キーワードなし）16ケースで **NG 0**。
攻撃順・対象選択・終了判定というターン進行そのものは一致している。


### 2026-09-01の仕様変更・追加ルール

**先攻は同数なら乱数（PvE・PvP共通）**
`corePickFirstSide(state, rng)` が唯一の実装。PvEも `coreMathRng` を渡してこれを呼ぶ。
神速・疾風の指輪による先攻もこの中で処理する。**PvE側に自前の判定を書き戻さないこと。**

**召喚は前衛の右端にだけ出る**
戦闘中の召喚は前衛が満杯なら成立しない。後衛へ逃がすと陣営の上限（14体）を超え、
編成していない後衛枠にキャラクターが現れる。コア（`coreSummonUnit`）とPvEの両方が
同じ条件で拒否する。**片方だけ変えると「内部にはいるが画面に出ない体」ができる。**
後衛へ置いてよいのは、編成どおりに並べる開戦時の配置だけ。

**カード固有VFXは「そのカード本来の効果」でのみ再生する**
強化カードで得た効果には使わない（ノームに闇の炎を付けると、死亡ダメージに
ノームの金貨演出が出ていた）。判定は `_characterVfxAllowedForDamage()`。
マスターデータ上の本来の効果文を見て決める。

**ダメージ数値の重なり防止**
待ち時刻は `present.js` の `_presentDamageReadyAt` を呼び出しをまたいで共有し、
`reserve()` で表示枠を1つずつ確保する。間隔は `PRESENT_DAMAGE_STAGGER_MS`（75ms）。
数値ラベルには対象IDの `labelKey` を渡し、同じキャラクターの古いラベルを消してから出す。
**バッチごとに別の表で管理しないこと。** 別経路から同時に入った数値が重なる。

**ライフは `G._waveLife` が実値**
表示・宿屋の回復・敗北時の減少はすべて `G._waveLife` を動かす。`G.life` は旧来の値。
コアへ渡す値は `_currentBattleLife()`、上限は `_currentBattleLifeMax()`（オンラインは5）。
取り違えると、ジャック・オ・ランタンのようなライフ参照の効果が満タン扱いになる。

**ATK0＝逃走（FLED）**
コアは `fled` イベント（type/side/unitId）を出すだけ。演出は `playFledVfx()` が担当し、
「FLED」を1文字ずつ落としてから文字を消し、そのあとカードを暗くフェードアウトさせる。
死亡ではないので死亡効果は発動しない。

### オンライン経路の検査（2026-09-01 追加）— **これまでの検査の穴**

`offline_online_regression.js` などは **core.js の中身しか比べていない。**
実際のオンラインは次の経路を通る。

```
buildSelfFormation()（versus.js）
  → 対戦要求の組み立て（server_local.js）
  → simulateOnlineBattle()（sim.js）
  → createBattleState() → runBattleCore()
```

**この受け渡しで情報が落ちても、従来の検査は全て素通りする。** 実際に2件見つかった。

1. **指輪とアイテムが丸ごと失われていた。**
   `buildSelfFormation()` は `rings: {p1:[…], p2:[]}` の形で返すのに、
   `server_local.js` がそれをそのまま `rings.p1` へ入れていた。
   `createBattleState()` の `Array.isArray` 判定で弾かれ、**指輪が0件**になっていた。
   （オンラインで光の指輪が効かない原因）。`_sideList()` でどちらの形でも取り出す。

2. **マナ効果の効果文の導出がPvEにしか無かった。**
   PvEは `panel.desc` から「Nマナ毎：」を外して `_manaThresholdDesc` を作るが、
   コアはそのフィールドが無いと**空文字のまま**で何も起こさなかった。
   オンラインの対戦相手はカードプールから直接組まれ、このフィールドを持たないため
   **相手のマナ効果が全て不発**だった（リッチの誘発召喚も連鎖して出なかった）。
   導出を `coreManaThresholdDescFromText()` としてコアへ移し、唯一の実装にした。

**教訓：「コアが唯一の実装」だけでは足りない。コアへ渡すデータの作り方が
PvEとオンラインで違えば、同じコアでも結果は変わる。**

検査は `tools/parity/online_pipeline.js`。ローカルサーバーを立てて実行する。

```
node tools/parity/online_pipeline.js
```

見ているもの：編成の指輪・アイテム・強化カードの効果がコアへ届くか、
実際に1戦まわしてマナ効果・誘発召喚・指輪の効果が発生するか。
**オンライン側の不具合を調べるときは、まずこれを回すこと。**

### オンオフ完全一致の現在地（2026-09-01 深夜・開戦一本化まで完了）

**実カード60盤面中59盤面が一致（NG 1）。検査対象は全カードの93%。**
（以前は「開戦・終戦・封印・解放・生贄」を含む2割を検査から除外していたが、
開戦処理を一本化したので封印・生贄以外は対象に戻した。）

一本化したもの：
- 戦闘の進行：`coreBattleStep()`。PvEは `createBattleRunner()` で1手ずつ呼ぶ。
- 開戦処理：`coreRunOpening()`。**PvEの `_finishNewPanelBattleStartEffects` も
  この関数を呼ぶだけになった。** 旧PvE専用の `_applyLifePanelPowerHpDouble()` は
  空関数にしてある（コアが「生命の力」を解決するため。復活させないこと）。
- 召喚体の位置：`coreInsertSummonedUnit()`。左右指定（両隣）にも対応。
- 盤面の詰め方：`coreCompactUnits()`。**コア駆動中は PvE の `compactBattleUnits()` も
  これを呼び、表示用の疎配列へ組み替えない。** 組み替えるとコアと並びが食い違い、
  全体ダメージの対象順・三方向の隣接・ランダム対象の結果がずれる。
  `renderField()` は生存ユニットの「順序」から位置を決めるので、
  左詰めにしても見た目（中央寄せ）は変わらない。

**詰め処理は演出の後に行うこと。** 先に詰めると、再生時に攻撃対象が盤面から
消えていて攻撃モーションが一切出なくなる（実際に一度そうなった）。
`runner.step({deferCompact:true})` → 演出 → `runner.compact()` の順を守ること。

**残る1件**：同一手番内で死亡と次の攻撃が続く場合、詰めのタイミングの差で
対象選択が入れ替わることがある。PvEは演出の後、コアは手番の終わりに詰めるため、
手番の途中では配列の中身が一致しない瞬間がある。

#### 旧記録（battlePhase置換直後）

**実カード60盤面中59盤面が一致（NG 1）。素のキャラは16/16一致。**
置換前は24盤面中12盤面が食い違っていた。

`battlePhase()` は **coreBattleStep() を1手ずつ呼ぶだけ**になった。
攻撃順・対象選択・効果の解決・終了判定はすべてコアが決め、PvEは
その手番で出たイベントを演出へ流すだけ。**ここへ独自のターン処理を書き戻さないこと。**

置換にあたって、PvE側の二重解決を止めた（いずれも `G._coreDrivenBattle` で分岐）：
`_applyDeathKeywordEffects`／`_resolveSeals`／`_tryNecromancerRingRevive`／
`_applyCoreShieldLostEffectsLive`。**コアが解決するものをPvEでも解決しないこと。**

あわせて、盤面配列の扱いを揃えた：
- 召喚体の**位置の決定**を `coreInsertSummonedUnit()` へ移した（コアが決める）。
  PvEはコア駆動中その位置をそのまま使う（`keepCorePlacement`）。
- コアも手番の終わりに `coreCompactUnits()` で死亡ユニットを外す。
  PvEは手番ごとに詰めているため、詰めないと配列の位置がずれ、
  前衛優先・三方向の隣接・ランダム対象の結果が食い違う。

**残る1件**：ワーム（攻撃：対象の両隣に「黒ナイト」を召喚する）で、
2体を同じ位置へ挿入するため並び順がPvEとコアで入れ替わることがある。
`coreInsertSummonedUnit()` の「両隣」への対応が未実装。

#### 旧記録（置換前）

**結論：完全一致していない。実カードで24盤面中12盤面が食い違う。**

`node tools/parity/loop_parity.js`（実カード24ケース）の結果が **NG 12/24**。
一方 `VB_PLAIN=1`（効果もキーワードも持たない素のキャラ）では **NG 0/16**。

つまり：
- **攻撃順・対象選択・終了判定（ターン進行そのもの）は一致している。**
- **食い違うのは効果の解決。** PvEは `battlePhase()` が自前でトリガを回し、
  オンラインは `runBattleCore()` → `coreBattleStep()` を回す。
  ルール本体は core.js に一本化したが、**回し方（呼ぶ順序・回数・再入の抑止）が別実装**のため、
  同じ盤面でも結果が変わる。

**一致を保証するには、PvEの `battlePhase()` を `coreBattleStep()` の逐次呼び出しへ
置き換えるしかない。** これは段階2の未完部分であり、着手していない。
それまでは「オンラインでだけ違う」不具合が出続ける前提で扱うこと。

#### 今ある検査と、それぞれが守れる範囲

| 検査 | 守れるもの | 守れないもの |
| --- | --- | --- |
| `effect_audit.js` | 効果の発動回数（二重発動） | 回す順序の違い |
| `offline_online_regression.js` | 旧オフライン基準版とコアの一致 | PvEの実際の回し方 |
| `online_payload.js` | **コアが読むフィールドの送信漏れ** | 値の作り方の違い |
| `online_receivers.js` | **オンライン再生の受け口の欠落** | 演出の中身 |
| `online_pipeline.js` | 編成→対戦要求→コアの受け渡し | 全カードの網羅 |
| `loop_parity.js` | **PvEとコアの結果の一致（実測）** | — これが最終判定 |

**オンライン側の不具合を調べるときは、まず `online_payload.js` と
`online_receivers.js` を回すこと。** 今日見つかった不具合（指輪の欠落・
`_tripleMerged`・`baseAtk`/`baseMaxHp`・`_voidWalkerBonus`・`fled` の受け口）は
すべてこの2つで機械的に検出できる形だった。
