すべての思考・回答・コメントは日本語で行うこと。

# AGENTS.md

**Vesselbound（仮）** — Argante 製のローグライクカードゲーム。
`prototype/index.html` を開くだけで動く（ビルドツール無し・`file://` 対応・JSは全てグローバル）。
ユーザーは高速な試作検証を重視している。「完全性」より「短時間で試せる状態」を優先すること。

**この文書の読み方**：作業開始時は「1. 最優先ルール」「2. 終わる前に必ず通すもの」「7. 現在の状態」を読む。
残りは触る場所に応じて引くこと（演出→3／戦闘ルール→4／進め方→5／コードの地図→6）。

---

## 1. 最優先ルール：オンラインとオフラインを一致させる

**このプロジェクトの絶対目標は「オンライン対戦（PvP）と通常プレイ（PvE）が完全に一致すること」である。**
今後追加・修正するカードと機能は、**原則として両方に反映される形で実装する。**
片方だけ動く実装は、たとえ自動テストが通っても未完成として扱う。

### なぜこの形なのか

PvEとPvPは盤面の持ち方も描画の仕方も違う。過去に何度も
「PvEでは効くのにオンラインでは効かない（またはその逆）」が起きたが、
原因は毎回**同じルールが2箇所に書かれていた**ことだった。
だから「両方に同じ修正を入れる」のではなく、**書く場所を1箇所にして分岐を作らない。**

**「コアが唯一の実装」だけでは足りない。** コアへ渡すデータの作り方がPvEとオンラインで違えば、
同じコアでも結果は変わる（指輪が丸ごと落ちていた／相手のマナ効果が全て不発だった、が実例）。
`online_payload.js` がこの受け渡しを検査する。

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

**判定基準（これで機械的に決まる）**：
**効果文（シートの「効果」列）を持つ強化カードの名前は、効果の識別子であってキーワードではない。**
効果文が空の強化カード（即死・貫通・先制・毒の刃・防戦など）は本物のキーワード。

**一覧は core.js が1箇所で持つ。**

| 一覧 | 中身 | 使う場所 |
| --- | --- | --- |
| `CORE_KEYWORD_CARD_NAMES` | `unit.keywords` から**取り除いてよい**カード名 | `coreUnitKeywords()` / `_applyAdjacentPanelEnhancements()` |
| `CORE_EFFECT_CARD_NAMES` | 効果文を持つ強化カード名すべて（上の一覧を含む） | 策士のキーワード数カウント、キーワード表示 |

**2つに分けている理由**：逆襲・恩寵・錬成・野生の力などは `keywords` の個数で発動回数を数えている。
`unit.keywords` から消すと効果自体が消えるため、**数えない（`CORE_EFFECT_CARD_NAMES`）だけで、消さない。**
（描画側は `_ENCHANT_KEYWORD_ONLY`（render.js）も見る。）

**新しい強化カードを足したら `CORE_EFFECT_CARD_NAMES` にも足すこと。**
追随漏れは `effect_audit.js` の「強化カード名の非キーワード化」が落とす。
**カードを追加・修正するときは、そのカード名がキーワード欄・効果文のキーワード位置に
現れていないことを必ず確認すること。Codexへ委譲する際も毎回明記すること。**

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

#### 意図して片側だけにしているもの（登録表）

**この表に無い片側実装を見つけたら、直すか、理由を書いて登録すること。**
パリティ検査はこの表を除外リストとして読む。

| 内容 | どちら | 理由 |
| --- | --- | --- |
| ボス勝利音（`bossVictory`） | PvEのみ | オンラインにボスの概念が無い |
| 決着後の「進む」入力待ち | PvEのみ | 次のマスへ移る時刻をオンラインはサーバーが持つ |
| 撤退 | PvEのみ | オンラインに撤退が無い（負けは「敗北」と出す） |
| 敗北表示・自動で進む | オンラインのみ | 次のマスへ移る時刻をサーバーが持つため、進むボタンを出さず1秒後に自動で進む（進行処理はボタン押下と同じ `continueAfterBattleVictory()` を通す） |
| 対戦相手名の副題 | オンラインのみ | PvEは進行状況を出す |
| 陣営ごとの死亡後始末（報酬・撃破数） | PvEのみ | オンラインはサーバーが確定済み |
| 永劫の力の恒久加算（`opts.persistEternal`） | PvE=true／オンライン=false | PvEは次戦闘以降も残す。オンラインはその戦闘だけ |

---

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
`board_parity.js`（魔導板→出撃の突き合わせ）／`core_refactor_diff.js`（コアのリファクタ前後の差分）／
`layout_probe.js`（画面レイアウトの実測）／`headless.js`（ヘッドレスChromeの土台）。

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

## 3. 演出（見せ方）の規則

### 演出の層と、それぞれの唯一の実装

| 層 | 唯一の実装 | 片方を直すと |
| --- | --- | --- |
| ルール（戦闘の結果） | `js/battle/core.js` | 両方に効く |
| 見せ方の規則 | `js/battle/present.js` | 両方に効く |
| 描画そのもの | `js/engine/render.js` | 両方に効く |
| イベント1件の見せ方 | `js/battle/present_events.js` | 両方に効く |
| イベントの受け口（switch） | 呼び出しだけ。中身は present_events.js | 両方に効く |

**新しい演出を足す時は、まず `present_events.js` に「1件のイベントをどう見せるか」を
書き、両方の受け口からそこを呼ぶ。** 違い（ユニットの引き方・HPの反映・先読みする
イベント列・陣営ごとの後始末）はアダプタ（api）で吸収する。

現在 `present_events.js` にあるもの：

| 関数 | 対象 |
| --- | --- |
| `presentDamageEvent` | 被弾（順番待ち・命中音のまとめ鳴らし・固有VFX/SEの発生元・表示HPの前進） |
| `presentDeathEvent` | 死亡（数値が読める間・焼き落としの開始印・詰め直し） |
| `presentStatChangeEvent` | 能力変化（固有VFX/SEの重複単位・表示ATK/HPの前進） |
| `presentSummonPlacement` | 召喚（上限・後衛送り・位置指定・描画の契機） |
| `presentManaThresholdEvent` | マナ効果（キャラクターごとの間引き） |
| `presentSealReleaseEvent` | 封印の解放 |
| `presentShieldLostEvent` | 結界喪失（SE・ログ・結界表示） |
| `presentTransformEvent` | 変身 |
| `presentFledEvent` | 逃走 |
| `presentSweepAttack`（render.js） | 薙ぎ払い |

尺・間合いの数値は `present.js`（`PRESENT_ATTACK_MOTION` / `PRESENT_TURN_GAP_MS` /
`PRESENT_HIT_BEAT_MS` / `PRESENT_DAMAGE_STAGGER_MS`）が唯一の定義。

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

### カード個別のVFXを足す時（アラッサスの薙ぎ払いのようなもの）

**既存のイベント種別で表せるなら、受け口を足す必要は無い。** 「+2/+2する」
「Nダメージ与える」といった効果は `stat_change` / `damage` で足りる。
足りないのは「その効果**専用の見せ方**」が要る時だけ（薙ぎ払いは、炎が対象を
順になぎ払うという指示が既存の種別で表せなかったので `sweep_vfx` を足した）。

手順は3つ。**この順で足せば両方に同じ形で入る。**

1. **コアに演出指示のイベントを足す**（`js/battle/core.js`）。
   DOMには触れず、再生側が同じ対象・同じ順で表示できる情報だけを出す。
   例：`emit({ type:'sweep_vfx', side, unitId, targetIds:[...] })`
2. **見せ方を1回だけ書く**。DOMを触る本体は `render.js`（例 `presentSweepAttack`）、
   イベント1件の扱いは `present_events.js`。**どちらも実装は1つだけ。**
3. **両方の受け口から2を呼ぶ**（`battle.js` と `board.js`）。違いはアダプタで渡す。

足し忘れは機械的に落ちる：

| 検査 | 落ちる条件 |
| --- | --- |
| `online_receivers.js` | コアが出しているのに受け口が無い種別がある |
| `present_parity.js` | 同じ盤面で演出の呼び出し・盤面・数値・HPが食い違う |
| `battle_event_regression.js` | 規則を呼び出し側へ書き戻した |

**新しいカードのVFXを足したら、`present_parity.js` の `SCENARIOS` へそのカードを
使うシナリオを1つ足すこと。** 追加したVFXが両方で同じに出ることを、以後ずっと
機械的に確認できるようになる（`requires` にその効果のイベント種別を書いておくと、
盤面の組み方を間違えて空振りした時も検出できる）。

### 片側だけの演出を作りたい時（オンライン専用の特別演出など）

**共通部分を書き換えて分岐させてはいけない。** 分岐させた瞬間、そのあと共通部分を
調整しても片側にしか効かなくなる。次の順で足すこと。

1. 共通実装（`present_events.js`）に**既定の見せ方**を1回だけ書く。
2. 側ごとの違いは**引数**で渡す（例：`bossWin` はPvEにしかない概念、
   `afterShown` はPvEが入力待ち／オンラインが自動で閉じる）。
3. **その側だけの追加演出は `extra()` フックへ足す。** 共通部分の置き換えには使わない。
4. **1章の登録表へ理由付きで登録する。** 登録の無い片側実装は事故とみなす。

決着カットイン（`presentBattleResultCutin`）がこの形。カットインの描画
（`showBattleCutin`）も、いつ・どのSEで・どの尺で出すかも共通で、違いは引数だけ。

登録表は「1. 最優先ルール」の**意図して片側だけにしているもの**にまとめてある。

### ダメージの種別と束

**規則：ダメージは種類ごとに1束ずつ片付ける。他の束が出ている間は別の束を出さない。**

処理順（コアがこの順に解決する）：

| 順 | 種別（`damageKind`） | 例 |
| --- | --- | --- |
| 1 | `attack_effect` | 攻撃効果で発生するダメージ（アラッサス） |
| 2 | `attack_effect_triggered` | 攻撃効果で誘発するダメージ（ペガサス／マナ生成からの炎の矢） |
| 3 | `combat` | 戦闘ダメージ（攻撃と反撃。相互） |
| 4 | `injury_effect` | 負傷効果で発生するダメージ（メデューサ） |
| 5 | `death_effect` | 死亡効果で発生するダメージ（闇の炎） |
| — | `other` | 毒・開戦・解放・指輪・アイテム等 |

- 種別は `coreWithDamageKind()` で切り替える。**内側が勝つ**（戦闘ダメージの誘発で起きた
  死亡効果は `death_effect`）。damage イベントに `damageKind` として載る。
- **同じ瞬間に入るダメージ＝同じ `batch`。** `coreBeginDamageBatch()` は種別が変わったら
  必ず別の束を開く（入れ子は積んで戻す）。多対象ダメージは `coreHitAll()` を通すこと
  ——「全員に入れてからまとめて誘発」と束の印がここで同時に付く。
  1体ずつ `forEach(x => applyHit(...))` と書くと、束が付かず誘発順もずれる。
- 再生側は `presentDamageGroupKey(ev)`（= `damageKind` + `batch`）で束を判別する。
  **present 側でイベントの並びから推測しない。** 並びで判定していた頃は、全体攻撃のように
  命中ごとに `attack` イベントが挟まる場合に束が途中で切れていた。

表示：

- **束の中の数値は全員同時。** ずらしてよいのはVFXがそう見せる時だけ。
- 束が変わる時は `PRESENT_DAMAGE_GROUP_GAP_MS`（260ms）空ける。
- **同じ種別の束が続く時は `PRESENT_DAMAGE_RUN_GAP_MS`（170ms）で畳みかける**
  （闇の炎が4回続く等。ダメージ量が違っても同種なら高速連続再生）。
- **連続再生では数値の表示時間を間隔より短くする。**（`presentDamageRunLabelMs()` が
  唯一の実装。間隔の60%＝最低80ms。`playHitVfx` の `labelDuration` に渡し、
  `labelDurationMin:0` で既定の下限600msを外す。）
  次の数値が出るまでに「出て、**完全に消えて、少し空く**」が入るので、回数が見える。
  **間隔いっぱい（＝100%）にしてはいけない。** 数値のアニメーションは
  15%〜65%が不透明で最後にだけ薄れるため、尺＝間隔だと消え際と次の出始めが重なり、
  同じ「-1」が出続けているように見える（闇の炎6回が2回に見えていた原因）。
  束の1つ目は予約時点では連続になると分からないため、`presentDamageRunAheadMs()`
  でイベント列を1つ先まで見る（次の束が同じ種別なら同じ長さにする）。
- **数値の入れ物は、数値のアニメーションが終わったらすぐ外す**（`animationend`）。
  VFX本体（hitDuration）より数値が短いことがあり、残すと「見えていない数値」が
  DOMに居座る。盤面が詰まるとその位置がカードの無い場所になる。
  ※前の数値を薄れさせながら次を重ねる方式は**不可**。同じ「-1」が途切れず出ている
  ように見えるうえ、薄れている間の入れ物が盤面の詰めとぶつかって数値がカード外に出た。

### 効果の演出は1つずつ直列に見せる

**異なる効果を同時に処理しない。直前の効果のVFXが消え切ってから次を始める。**
以前はPvEだけがマナ効果VFXを投げっぱなし（`void`）で再生していたため、
サテュロスのマナ発生とマータの活性化が同じ画面に重なって出ていた。

| 決めていること | 唯一の実装 |
| --- | --- |
| マナ効果を1件ずつ待って見せる | `presentManaThresholdEvent()`（`await api.playCue(...)`） |
| 繰り返し発動の間隔 | `PRESENT_MANA_RUN_GAP_MS`（150ms・present.js） |
| マナ効果VFXの尺 | `MANA_CUE_VFX_MS`（900ms・battle.js。オンラインも同じ値を読む） |
| ひと続きの終わり | `_endManaEffectRun()`（battle.js／board.js に同じ形で1つずつ） |
| 効果1回ぶんの合図（SE） | `_playManaEffectPulse()`（battle.js／board.js） |
| 効果そのもののVFX | `playEffectVfxOnUnit()`（render.js） |
| 素材の登録 | VFX＝`Assets.vfx.enchantEffect` ＋ `getEffectVfxPath()`／SE＝`Assets.sfx` ＋ `getEffectSfxKey()`（assets.js） |
| 同じ効果／同じ瞬間の判定 | `presentManaEffectKey()` / `presentManaWaveKey()` / `presentManaWaveEvents()`（present.js） |
| マナの数字の更新 | `_refreshManaDisplays()`（battle.js） |

**区切りはキャラクターではなく「効果」。**
`gate`（マナ効果VFXを出す回）は `presentManaEffectKey`、
`waveGate`（同時に見せる1回）は `presentManaWaveKey` で数える。
キャラクター単位（`side:unitId`）で区切っていた頃は、
**自前のマナ効果を持つキャラクターの2つ目の効果**（サテュロス＋活性化）が
「繰り返し」と誤判定され、固有VFXが一度も出なかった。

**同じ効果は、全発動ぶんを片付けてから次の効果へ移る。**
1パスで全効果を1回ずつ撃つと、活性化と炎の矢が交互に発動して演出も交互に出る。
`coreApplyManaThresholdEffectsInner()` は**1パスで「一番上の順位の効果」だけ**を撃ち、
撃ち切った効果は列（`fireQueue`）から外す。外し忘れると、撃ち切った効果が
一番上に居座って `changed` が立たず、次の効果へ進めないまま走査が終わる。

**発動順はシートの「マナ順位」列で決まる（キャラクター／エンチャント両シート）。**
数が小さいものから処理し、同率なら**前衛の左から右、続いて後衛の左から右**（＝盤面配列の並び）。
空欄は順位なしで最後に回す（`CORE_MANA_ORDER_LAST`）。陣営はp1→p2の順に見る
（マナは陣営ごとの資源なので跨いで混ぜない）。並べ替えは
`coreApplyManaThresholdEffectsInner()` の `fireQueue` が唯一の実装。
データの経路は `panel.manaOrder`（loader）→ `enh.manaThresholds[].order` /
`unit._manaThresholdOrder` → コアの `manaThresholdOrder` / `manaOrder`。
オンラインへは `effectData.manaThresholdOrder` / `effectData.manaOrder` として送る。

**全く同じ効果が複数のキャラクターへ同時に乗るときは、順位に関係なくまとめて1回で見せる。**
1体ずつ順に演出すると「片方が先に強くなる」ように見える（活性化を2体が持つ場合）。
そのためコアは**効果ごとに「一番小さい順位」を代表値にして並べ、同じ効果を必ず隣り合わせる**
（`orderByEffect`）。再生側は `wave`（発動回の通し番号）が同じ間は拾い続ける
（最初に違う効果へ当たった時点で打ち切ると、順位で間に別効果が挟まった時に
2体目が拾えず、片方だけVFXが出てもう片方が素通りする）。
**効果が違えば従来どおり順に見せる**（発動順＝優先順位）。
まとめて見せる時も、SEは1本・VFXは全員の上に同時に出す。

見せ方（**ひと続きのマナ効果につき1組だけ**）：

1. **マナ効果VFX（K023）とSE（K026）は、その効果につき最初の1回だけ。**
   同時に発動する全員の上へ同時に出す（SEは1本）。
2. K023の**逆再生開始（`onFadeStart`）から先は、その効果自身の演出**
   （`ev.effectNo` → 活性化なら `E045.webp` / `E045.wav`）へ引き継ぐ。
   効果の処理もこの時点から進める（旧来の演出境界）。
   - **VFXは、ひと続きの処理が終わるまで出し続ける**（素材はループ再生＝webpの loop=0）。
     最初の1回でだけ始め、止めるのは `_endManaEffectRun()`。
     **1回ずつ出し直さないこと**（連続再生に見え、出し直しの継ぎ目も見える）。
     発動が1回だけの時に一瞬で消えないよう、`PRESENT_EFFECT_VFX_MIN_MS`（900ms＝
     カード固有VFXの既定の尺）を最低再生時間として `minDurationMs` へ渡す。
   - **SEは発動回数ぶん鳴らす。** 1回ぶんの合図＝`_playManaEffectPulse()`。
3. **「Xマナ毎」の2回目以降は間引かない。** 到達回数ぶん見せる。
   間隔は `PRESENT_MANA_RUN_GAP_MS`（活性化×5なら E045.wav が5回・ATK/HPは+1/+1ずつ）。
   1回目の合図のあとにも間隔を1つ取ること（取らないと2回目が同じ瞬間に重なる）。
   **間隔は「1回目を出した時刻」から測ること。** マナ効果VFXの逆再生開始を待つ間に
   時間が経っているので、そこから改めて待つと1回目と2回目の間だけ不自然に空く。
4. **固有の素材が無い効果**（サテュロスの「1マナ：3マナを得る」等）は、
   繰り返しで**SEもVFXも出さない**。K026で代用すると発動のたびにマナ効果SEが鳴り、
   「マナ効果VFX・SEはひと続きにつき1回だけ」という1.の規則が壊れる。
5. **別の効果の演出が出ている間は、VFXもSEも始めない。**
   `_manaEffectCurrentCode` が今出している効果の番号で、違う効果が来たら
   **どの経路でも**（繰り返しの経路も含めて）`_endManaEffectRun()` を通す。
   繰り返しの経路だけ通していなかった頃は、活性化の演出の最中に炎の矢の演出が重なった。
6. **次の効果は `_endManaEffectRun()` を通ってから始める。** ここで固有VFXを止め、
   K023の完了を待つ。これをしないと別々の効果が同じ画面に重なる。
7. マナ解決のひと続きが途切れたら（`presentBreaksManaRun`）必ず止める。
   止め忘れると次の手番・報酬画面まで固有VFXがループし続ける。

- マナ効果SEは**両方で鳴らす**。以前はPvEだけで鳴り、オンラインは無音だった。

**マナが増えた時のSE（特殊演出 S004）も `_refreshManaDisplays()` が鳴らす。**
「増えた時だけ」で、減った時・据え置き・戦闘開始の0リセットでは鳴らさない。
オンラインもこの共通出口を通すこと（`renderManaHud()` を直に呼ぶと鳴らない）。

**戦闘中のマナの数字は `renderManaHud()` では更新されない。**
`renderManaHud()` は戦闘画面では非表示にして即 return する。
実際に数字を出しているのは `#battle-mana-value`＝`renderBattleCounters()`。
マナが動いたら **`_refreshManaDisplays()`（両方を呼ぶ）** を使うこと。
片方だけを呼んでいたため、効果でマナが増えてもカウントが止まったままだった。
また「次も閾値なら描かない」という間引きも入れないこと（同じ理由で止まる）。

**どの効果が発動したかはコアが載せる。** `mana_threshold` イベントの `effectNo` が
その効果のカードNo.。データの経路は
`enh.manaThresholds[].no` →（`unit._manaThresholdNo` ／ `unit._extraManaThresholds[].no`）
→ コアの `manaThresholdNo` → イベントの `effectNo`。
オンラインへは `effectData.manaThresholdNo` として送る（`online_payload.js` が検査する）。
**演出側でカード名から推測しないこと。**

### 攻撃範囲の接触演出（貫通・三方向攻撃・全体攻撃）

| 決めていること | 唯一の実装 |
| --- | --- |
| どのモードを出すか（配列） | `presentAttackContactModes()`（present.js。コアの `modes` を読む） |
| 1件の見せ方（SE・対象の選び方） | `presentAttackContactVfxEvent()`（present_events.js） |
| 実際の描画（位置・大きさ・飛び方） | `playAttackContactVfx()`（render.js） |
| 位置・大きさ・速さのつまみ | `PRESENT_CONTACT_*`（present.js） |
| 素材 | `Assets.vfx.attackContact`（K007貫通／K008三方向／K009全体）＋ `Assets.sfx.K007-K009` |

**出すのは「攻撃者が対象へ接触した瞬間」。** そのためコアは `attack_contact_vfx` を
**attack イベントより前に**出し、受け口はそれを**保留して**攻撃モーションの
`onContact` で鳴らす（PvE＝`_firePendingContactVfx()`／オンライン＝同名の関数）。
attack より後ろに置いていた頃は、攻撃モーションを再生し終えた
＝**キャラクターが元の位置へ戻ってから**VFXとSEが出ていた。
接触フックまで届かなかった時の保険（攻撃者・対象が盤面に無い等）も必ず置くこと。

**ダメージの表示をこの演出に依存させないこと。** 貫通・三方向攻撃・全体攻撃は
どれも複数の敵へ同時に当たる。VFXの完了を待つと、対象ごとに数値の出る時刻がずれる。
受け口は**待たずに投げる**（`presentAttackContactVfxEvent` は await しない）。

**貫通は範囲攻撃と併用できる。** 効果（後衛への巻き込み）もVFXも両方出す。
コアの `withPierce()` が、三方向攻撃・全体攻撃で当たった**前衛それぞれの真後ろ**を足す。
`spread ? spread : pierce` のように片方だけを選ぶと、三方向攻撃を持つキャラクターの
貫通が効果ごと消える。演出側も `mode` 1つではなく `modes`（配列）で受ける。

- 貫通：対象カードの**真上**（攻撃者と反対側）から出し、攻撃者の角度に依存せず
  まっすぐ画面外まで抜ける。向きは攻撃者が上にいれば下・いなければ上の2通りだけ
  （`fixedAngle` 0／180）。攻撃者の座標から角度を出すと斜めになる。
- 三方向攻撃：対象の矩形をまとめた範囲に置き、素材の絵が右寄りなぶん
  `PRESENT_CONTACT_TRI_OFFSET_X`（カード幅の比。マイナスで左）だけ左へずらす。
- 全体攻撃：敵の前衛と後衛の矩形をまとめた範囲。画面全体・盤面全体を基準にすると
  味方陣営まで覆う。

**全体攻撃・三方向攻撃は対象ごとに attack イベントが出る。**
モーションを出すのは `attackVisual!==false` の1件だけ。効果の先出しモーション
（`_preAttackEvent` / `_preAttack`）が**最初の attack を掴む**と、主対象ぶんの
モーションがもう一度再生され、**2回攻撃したように見える**。必ず
`attackVisual!==false` で絞ること（PvE・オンラインの両方）。

### 発生源から広がる範囲効果（薙ぎ払い・広がる波）

| 決めていること | 唯一の実装 |
| --- | --- |
| どの絵で見せるか（薙ぎ払い／広がる波） | `presentAreaVfxStyle()`（present.js。鍵はカードの演出番号） |
| 1件の見せ方（対象の陣営・数値の出し方） | `presentSweepAttack()`（render.js） |
| 広がる波の描画 | `playExpandingWaveVfx()`（render.js） |
| 尺・大きさ | `PRESENT_EXPAND_VFX_*`（present.js） |

**コアは「誰に・どの順で当たるか」だけを出す**（`sweep_vfx` イベント）。絵の選び方は演出側。
**対象は敵とは限らない。** サイレンは自分以外の全キャラクターに当たるので、受け口は
`targetIds` を敵・味方の両方から引き、数値とVFXをその体の陣営側へ出すこと
（`sideOf`）。敵側だけを見ていると味方への分が丸ごと出ない。

**見た目上当たった相手から数値を出す**のは薙ぎ払いと同じ規則。
広がる波は「絵の半径が対象までの距離を超えた瞬間」に出す
（`PRESENT_EXPAND_VFX_HIT_RATIO` で素材の透明な余白ぶんを内側に詰める）。

### キーワードの演出（毒・結界など）

**絵と音は同じ引き方にする。** キーワードのVFXは `getKeywordEffectVfxPath()`、
SEは `getKeywordEffectSfxKey()` が、どちらも `KW_NO_MAP`（キーワードシートのNo.）で引く。
**片方だけ番号がずれると音と絵が食い違う。** カード名や番号を演出側へ直接書かないこと。

| 場面 | キーワード | 素材 | 出す場所 |
| --- | --- | --- | --- |
| 毒のデバフを受けた瞬間 | 毒牙（K003） | `K003.webp` / `K003.wav` | `presentKeywordEffectEvent()` |
| 毒でダメージを受けた瞬間 | 毒（K017） | `K017.webp` / `K017.wav` | `presentDamageEvent()`（`keywordEffect:'毒'`） |
| 結界がダメージを防いだ瞬間 | 結界（K018） | `K018.webp`（SEは `shield`） | `presentShieldLostEvent()` |
| マナ効果 | マナ効果（K023） | `K023.webp`（SEは `K026`） | マナ効果の合図 |

SEを鳴らすのは `playHitVfxAtRect()`（絵を決めるのと同じ場所）。
**SEを別で鳴らす呼び出しは `keywordSfx:false` を渡す**（マナ効果の合図がこれ。渡さないと二重に鳴る）。

**専用素材を登録したらファイルを必ず置くこと。** 登録だけしてファイルが無いと、
以前は何も出ないまま「効果が消えた」ように見えた。今は `playHitVfxAtRect()` が
読み込み失敗を拾って通常の被弾VFXへ戻し、コンソールに警告を出す。

**発生元から対象へ曲線で飛ぶ演出（ミサイル）** は `playCurvedMissile()`（render.js）が唯一の実装。
`playProjectileEffectVfx()` は「ユニットと陣営」から呼ぶための入口。
どの効果を飛ばすかは `PRESENT_PROJECTILE_EFFECTS`（present.js）に登録する。

- **素材そのものは加工しない。** `<img>` の**位置と回転**だけをJSで動かす。
  `scaleX` / `skew` で曲げない（縦横比を崩さない）。`pointer-events:none`。
- 始点・終点はDOMの左上ではなく**中央付近**。座標は既存の演出と同じ画面座標（fixed）を使い、
  新しい座標系を作らない。
- 三次ベジェで飛ばす。制御点は**始点と終点の距離・方向から自動計算**する
  （`presentMissileControlPoints`。座標の直書きをしない）。膨らむ向きは始点→終点の
  **垂線で画面の上側**（下へ膨らむと盤面へ潜って見える）。毎回完全ランダムにはせず、
  `PRESENT_MISSILE_BULGE_JITTER` の範囲でわずかに変える。
- 尺は距離で少し変えるが `PRESENT_MISSILE_FLIGHT_MIN_MS`〜`MAX_MS` で挟む。
  時間を t にそのまま入れず `presentMissileEase()` を通す
  （発射直後はやや緩やか → 中盤で加速 → 最後に素早く吸い込まれる）。
- 向きは**少し先と少し手前のベジェ点の差**から `Math.atan2()` で出す。
  片側だけだと終端で差が0になり、最後の1フレームだけ先端が明後日を向く。
  素材の先端が上向きなので `PRESENT_MISSILE_NOSE_OFFSET_DEG`（90度）を足す。
- 起点は**実際に最初のフレームが来た時刻**（攻撃モーションと同じ規則）。
- **飛行中の再ターゲットはしない。** 着弾点は発射時に決める。
- **着弾した瞬間に、着弾VFX・着弾SE・ダメージ数値を出す**（`onHit` は1回だけ）。
  数値は発射順ではなく**その矢の着弾時刻**に出るので、通常のダメージ演出には出させない
  （`markShown` で薙ぎ払いと同じ印を付ける。付け忘れると数値が二重に出る）。
- 同時に撃つ時は `PRESENT_PROJECTILE_STAGGER_MS` ずつ発射をずらす。
- 着弾VFXの高さは `PRESENT_EFFECT_HIT_OFFSET_Y`（マイナスで上へ）。**ずらすのはVFXだけ**で、
  数値のラベルは対象カードの上に残す。
- 終わったら生成したDOMを必ず消す（rAFが止まっても消えるよう保険のタイマーを置く）。
- 対象は `presentEffectDamageEvents()` が、そのマナ効果が起こした damage イベントから拾う
  （コアが載せた `effectNo` で判定する。**並びから推測しない**）。

**効果が対象に当たった瞬間の専用演出**（炎の矢＝`E058_2`）は、
コアが damage イベントへ載せる `effectNo` で引く（`getEffectHitVfxPath()` /
`getEffectHitSfxKey()`＝`Assets.vfx.enchantEffectHit` と `Assets.sfx.<No.>_HIT`）。
発生元へ出す演出（`enchantEffect`＝`E058_1`）とは**別素材**である。

### 固有VFXの素材が無いカードで効果を演出しないこと

`playHitVfxAtRect()` は固有VFXを引けないと**通常の被弾VFX（hit.webp）へ落ちる。**
素材の無いカード（`Assets.vfx.characterEffect` は C001/C002/C003/C043 だけ）で
効果を演出すると、強化された味方が「殴られた」ように見える
（ギガンテスの負傷効果で味方全員にヒットエフェクトが出ていた）。

`_playCardEffectVfx()` の先頭で `getCharacterEffectVfxPath()` が空なら何も再生しない。
`playEffectVfxOnUnit()` も `getEffectVfxPath()` が空なら `null` を返す。

**状態異常を付けた時のVFX（毒牙＝K003 等）は、連続付与でも出し直さない。**
同じキャラクターへ続けて付与される間は1つの再生を延ばして出し続ける
（`playKeywordEffectVfxSustained()`＝render.js が唯一の実装）。SEは出し始めの1回だけ。

**ウォーグの「7体以上になるたび」は効果1回につき1回。**
召喚を伴う効果の入口は `coreBeginSummonBatch()` / `coreEndSummonBatch()` で囲むこと。

**戦闘中に召喚された体のマナ効果は、召喚されてから得たマナだけで発動する。**
「Xマナ毎」の到達回数は `coreManaThresholdProgress()` が唯一の実装で、
召喚時に付けた `_manaThresholdBaseline`（その瞬間のマナ）を引いてから数える。

**攻撃モーションの先出しは「これから攻撃する本人が起こした効果」だけを合図にする。**
受けたダメージ（毒・カード効果）を数えてはいけない。判定は present.js の
`presentPreAttackEffectOwnerId()` / `presentPreAttackActorId()` が唯一の実装。

**効果発動時の発光（`effect_flash`）は、VFXが出る瞬間に合わせて再生する。**
コアは効果を解決した順にイベントを出すので、発光のイベントは対応するVFXより**前に**届く。
届いた瞬間に光らせると、光ってから遅れて絵が出る（マナ効果は前の効果の演出の
終わりを待つぶんまるごと先行する）。`presentQueueEffectFlash()` で保留し、
render.js の各VFXの入口に置いた `_syncEffectFlashWithVfx()`＝`presentFlushEffectFlashes()`
で始める。**VFXの入口を増やしたらこの呼び出しも置くこと。**
VFXを出さない効果のために `PRESENT_EFFECT_FLASH_MAX_WAIT_MS`（700ms）の安全弁がある。

**新しい固有の素材を足す時は `assets.js` へ登録すること。**
VFXはキャラクター＝`characterEffect`／強化カード＝`enchantEffect`、SEは `Assets.sfx` にカードNo.で。
登録が無いカードは（SEがあればSEだけ鳴り）VFXは出ない。

**「VFX/SE」列はキャラクター・エンチャントの両シートにある。**
- キャラクター：そのカードの効果演出（`unit.fxCode` →`_effectPresentationCode()`）。
  **複数書ける**（改行・カンマ区切り）。ブラウニーのように攻撃と負傷で別の演出を持つ
  カードは、`presentStatChangeVfxCode()` が**そのトリガ**で選ぶ
  （S005=攻撃／S006=負傷／S007=死亡／S008=マナ／S009=常時＝特殊演出シートの並び）。
  **攻撃時のバフは一律S005、開戦・常時の誘発でのバフは一律S009、マナ効果でのバフは一律S008**
  （いずれもカードの指定より優先）。
  **列にバフの番号（S005〜S009）が書いてあれば、その番号をそのまま出す。**
  コード側でトリガの番号へ固定しないこと（シートを直しても変わらなくなる）。
  複数書かれているカード（ブラウニー＝S005/S006）だけ、そのトリガで選ぶ。
  列にバフの番号が無い時は、攻撃S005・マナS008・開戦/常時S009は一律で出し、
  負傷・死亡はカード固有の絵をそのまま使う（`PRESENT_BUFF_VFX_ALWAYS_TRIGGERS`）。
  **バフVFXは「能力変化を受けた対象全員の上」に出す。** 発生元だけではない。
  `stat_change` は対象ごとに来るので、受け口は1件ずつそのまま通せばよい。
  **そのためコアは能力変化に必ず `sourceId` を載せること**（無いと演出の可否で弾かれる）。
  **`reason` は `attack_` / `injury_` / `death_` で始める**（接頭辞だけでトリガが決まるので、
  一覧への追記を忘れても演出が出る）。
  逆に、**バフの番号を発生元へ出してはいけない**（`presentIsBuffVfxCode()` で
  マナ効果の固有VFXから弾いている）。
  マナ効果のバフをS008へ寄せているのは、発生元に出るマナ効果の合図
  （`_playManaEffectCue`＝カード自身の番号）と同じ絵が2重にならないようにするため。
  「死亡」はあくまで**倒れた本人の死亡効果**。「味方が死亡するたび」のような**観測**は
  観測者の常時効果なので `passive`（S009）に入れる。
  「常時：緑のキャラクターから得るマナは+1される」のような**受動的な補正**は
  イベントを出さないので何も出ない。
- エンチャント：その強化カードの効果演出。**発生元キャラクターの番号ではなく、
  効果を持つ強化カードの番号を使う**（剣技＝S005 等）。
  どの `reason` がどの強化カードかは `PRESENT_STAT_CHANGE_ENCHANT_BY_REASON`（present.js）。
- マナ効果の素材も同じ列で引く（`_effectFxCodeByNo()`）。
  **`effectNo` は効果の識別子なので置き換えない。** 素材を引く時だけ番号を差し替える。

**シートの「VFX/SE」列に書ける番号は、VFX・SEの両方を必ず登録すること。**
この列にはカードのNo.ではなく**素材の番号**（`S006` 等）が書かれる。
`_effectPresentationCode()` はその番号をそのまま鍵にするので、
`Assets.vfx.specialProduction` と `Assets.sfx`（＋`SFX_SETTINGS.sounds`）に
その番号が無いと、絵も音も出ない＝**その効果が「機能していない」ように見える。**
（ゴーレム＝C003 のVFX/SE列が `S006` になった時、負傷効果が実際にそう見えた。）

**カード固有の効果VFXの尺は `PRESENT_CARD_EFFECT_VFX_MS`（present.js・700ms）。**
ゴーレムの負傷エフェクトと同じ長さ。シートの「VFX/SE」列で指定した演出も同じ尺で出す。

**画面に固定して大きく出す効果**は `PRESENT_SCREEN_BOTTOM_VFX`（present.js）へ登録し、
`playScreenBottomEffectVfx()`（render.js）が出す。対象カードの上ではなく画面を使い、
**画面の中心が絵の頂点、画面の底辺が絵の中心**になる大きさ（＝絵の高さ＝画面の高さ）。
アラクネ（C008）がこれ。対象ごとではなく**画面へ1回だけ**出す。

**大きさは `PRESENT_VFX_SCALE`（present.js）が唯一の実装。**
素材ごとに絵がフレームの中で占める割合が違うため、同じ倍率で出すと
余白の多い素材だけ小さく見え、フレームいっぱいの素材だけ巨大に見える。
既定は1（CSSの `width:460%` がそのまま効く）。現在の登録は
**鍵は素材の番号。命中VFXの経路は「ファイル名」から番号を取り出す**ので、
素材名を変えたら（`C003.webp`→`S006.webp`、`E045.webp`→`S008.webp`）
**効果の番号と素材の番号の両方を登録する**こと。
現在：`C001/C002 = .5`、`C003 / S006 = .5`（ゴーレム）、`E045 / S008 = .5`（活性化）、
`E058 = .25`（炎の矢。切り詰めた縦長素材）。既定は1。
**素材の切り抜き方（余白の量）が変われば倍率も変わる。** 差し替えたら見て調整すること。
**効果としての再生と被弾演出としての再生で別々に持たないこと**（片方だけ巨大に出る）。

---

## 4. 戦闘ルールの規則

### 戦闘ルールの置き場（重要）

**戦闘ルールは `js/battle/core.js` にのみ書く。** PvE（`js/engine/battle.js`）とPvP（`js/online/sim.js`）は
どちらもこのコアを呼ぶ。同じルールを2箇所に書くと、片方だけ直す事故が必ず起きる。

コアの制約（サーバーでもそのまま動かすため）：
- DOM を触らない / `G` を触らない / `Math.random`・`Date.now` を使わない（乱数は引数の rng だけ）
- 同期のみ。演出の待ちは呼び出し側がイベントを見て行う

`battle.js` に残っている同名関数（`_unitHasKeyword` / `getAttackTarget` / `_sealValue` 等）は
**コアへの1行委譲**であり、実装ではない。ここに条件を書き足さないこと。

#### コアが唯一の実装：判定・数値

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
| 「常時：味方の攻撃回数は1回追加される」の合計（疾風の指輪・タイタニア） | `coreExtraAttackTotal` |

#### コアが唯一の実装：効果・状態

| ルール | コアのAPI／処理 |
|---|---|
| 開戦・攻撃・負傷・死亡・終戦トリガ | `coreApplyOpeningEffects` `coreTriggerManaOnAttack` `coreApplyAttackEffects` `coreApplyInjuryEffects` `coreApplyDeathEffects` `coreTriggerBattleEnd` |
| データ駆動のマナ／ゴールド／アイテム効果 | `coreTriggerManaOnAttack` `coreTriggerManaOnInjury` `coreTriggerManaOnDeath` `coreTriggerBattleEnd` |
| 即死・毒牙・毒・邪眼・衝撃・弱体・生命吸収 | `coreApplyKeywordOnHit` |
| 毒のターン処理 | `coreApplyPoisonBeforeTurn` |
| 指輪・アイテム・マナ閾値 | `coreApplyOpeningRings` `coreApplyOpeningItems` `coreApplyRingManaEffects` `coreApplyManaThresholdEffects` |
| 召喚・変身・復活 | `coreSummonUnit` `coreTransformUnit` `coreTryRevive` |
| 魔導板・共振・熟練等の戦闘修正 | `coreUnitEffectText` `coreStatBonus` および開戦／各トリガ処理 |

### 複数対象への効果は「全員に入れてから、まとめて誘発」

全体ダメージのように複数のキャラクターへ同時に作用する効果は、
**1体ずつ「作用→その体の誘発」を解決してはいけない。** 全員へ作用させてから、
対象の並び順で誘発を解決する。1体ずつ解決すると、割り込み攻撃（ミノタウロスの
「負傷：直ちに攻撃する」）が残りの対象への作用より先に起き、誘発時点のHPも変わる。

コアの `coreResolveHit` は `{deferTriggers:true, collect:配列}` を渡すと
ダメージの確定だけを行い、誘発を配列へ積む。呼び出し側が全員ぶん確定させてから
`coreApplyHitTriggers()` を順に呼ぶ。

**攻撃と反撃も同じ扱い。** ひと続きの打ち合いなので、両方のダメージを確定させて
から誘発する。1発ずつ誘発まで解決すると、倒れた側の死亡効果（闇の炎の1ダメージ等）
が反撃より先に起きる。

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

### 既存の食い違い（勝手に揃えないこと）
- 追加攻撃回数と攻撃範囲：味方側は効果文からも拾うが、敵側はキーワード列だけを見る
  （`coreExtraAttackCount(unit,{fromKeywordsOnly:true})` で従来の挙動を保持している）
- 弱体：`_applyDamageState` は加算するが `dealDmgToEnemy` は加算しない
  （`coreResolveIncomingDamage(...,{skipWeaken:true})` で従来の挙動を保持している）
- **マータ・団結の分散はコアへ一本化済み**：PvEの`applyDamageBatch()`も
  `coreResolveHit()`の各対象damageイベントを使う。コアは`_uniteGroups`のスタンプ値を使い、
  旧実装の味方側限定・盤面接続の都度確認とは条件が異なるため、両陣営へ適用される。

### 旧互換処理について

新しい戦闘ルールを追加・変更する場合は、まず `core.js` に実装し、PvE／PvP双方のイベント接続だけを更新すること。
オフライン専用の名前分岐へ新規ルールを追加してはならない。
**元を残したまま新経路を足した時点で差し戻し対象**（＝実装を移して元を消すこと）。

### そのほか守ること（過去に事故になった形）

- **stateやDOM要素をユニットへ保持しない。** `state.units` はそのユニット自身を含むため循環参照になり、
  `clone()`＝`JSON.parse(JSON.stringify())` を使う経路（生贄スナップショット・再挑戦・セーブ）が
  例外で止まる。再入防止は `coreStateToken(state)` の**文字列トークン**で比較する。
  ユニットは常に直列化可能に保つこと（`effect_audit.js` の「ユニット直列化回帰」が見る）。
- **演出待ちで戦闘を止めない。** `requestAnimationFrame` はタブ非表示・最小化中に発火しない。
  戦闘フロー内のrAF待ちは `_awaitFrame(timeoutMs)` を使い、逆再生ループにも番人を置く。
  演出が途中で切れても戦闘は続けること。
- **先攻は同数なら乱数（PvE・PvP共通）。** `corePickFirstSide(state, rng)` が唯一の実装。
  PvEも `coreMathRng` を渡してこれを呼ぶ。神速・疾風の指輪による先攻もこの中で処理する。
- **戦闘中の召喚は前衛の右端にだけ出る。** 前衛が満杯なら成立しない。後衛へ逃がすと陣営の上限（14体）を
  超え、編成していない後衛枠にキャラクターが現れる。後衛へ置いてよいのは開戦時の配置だけ。
- **ライフは `G._waveLife` が実値。** 表示・宿屋の回復・敗北時の減少はすべてこれを動かす。`G.life` は旧来の値。
  コアへ渡す値は `_currentBattleLife()`、上限は `_currentBattleLifeMax()`（オンラインは5）。
- **ATK0＝逃走（FLED）。** コアは `fled` イベントを出すだけ。死亡ではないので死亡効果は発動しない。
- **開戦時のマナは必ず0。** マナは戦闘ごとの資源で、`startBattle()` が開戦時に `G.mana=0` へ戻す。
  **オンラインの編成送信で `G.mana` / `_ensureMana()` を読まない。両陣営とも `mana: 0`。**
  一般則：**戦闘開始時にオフラインがリセットしている状態は、オンラインの編成送信でも同じ値から始める。**
- **PvE の `applyHit` ラッパーはオプションをコアへそのまま渡すこと。**
  引数は `(source, target, amount, counter, skipSourceEffects, skipTough, options)`。
  4引数で受けて捨てると、`coreHitAll()` が指示する `deferTriggers` / `collect` が PvE だけ無効になり、
  1体ずつ即誘発になってオンラインと結果が食い違う。**引数を削らないこと。**
- **ミノタウロス**（`負傷：効果ダメージを受けた場合、ランダムな敵に攻撃する。`）は
  戦闘ダメージ（攻撃・反撃）では発動しない。判定は誘発時に控えた `damageKind`
  （`coreResolveHit` が `collect` へ積む時の種別）で行う。誘発をまとめて解決する時点では
  既に別の種別へ切り替わっているため、**その場で控えないと判定できない。**
- **同じ瞬間（同じダメージバッチ）に鳴る命中音は、同じ鍵につき1本だけ鳴らす。**
  鍵は `_attackDamageSfxKey()`（武器種別＋威力段階）。判定は `presentDamageEvent()` の中＝両陣営共通の1実装。
  `playSfx()` は `<audio>` 複製の `play()` で鳴らすため1本ごとに鳴り始めがばらつき、
  同じ音を重ねると「ズレ」として聞こえる。音を足す時は必ず `playSfx()` を通すこと
  （`new Audio()` を直に使うと音量一元管理・ミュート・暖機のどれも効かない）。
  **暖機はプール上限（`SFX_VOICE_POOL_MAX`）まで行う。** 2本だと、前のターンの音が鳴り終わる前に
  同じ音が来た時点で冷えた複製を作ることになる。
- **ターン上限はPvEとコアで同じ定数（`BATTLE_CORE_TURN_LIMIT`＝500）を使う。**
  片方だけ変えると、決着が付かない盤面の引き分け成立タイミングが食い違う。
- **攻撃モーションまわりは2つの回帰で守られている**（`battle_event_regression.js`）。
  ① 進捗の起点は「実際に最初のフレームが来た時刻」。予約時刻を起点にすると、起動直後の
  デコードでメインスレッドが尺以上止まった時に1フレーム目で終端へ飛ぶ（＝モーションが再生されない）。
  ② `.slot.motion-hidden` は `transition:none!important`。`.slot` の `transition:all .18s` は
  `visibility` も対象なので、これが無いと飛んでいる複製と元位置の実カードが180ms同時に見える。
- **ダメージ数値の尺の式は `damageLabelDurationMs()`（render.js）が唯一の定義。**
  既定950ms・下限600ms（`labelDurationMin:0` で外せる）。呼び出し側に別の式を書かないこと。

---

## 5. 作業の進め方

### 承認設定

`prototype/` 内でのファイル作成・編集・必要なコマンド実行は承認済みとして扱う。
ファイル削除は、ユーザーから明示的な指示がある場合を除き禁止する。
`prototype/Vesselbound_data.xlsx`（および利用者が置き直した同等のxlsx）は**参照のみ**。
編集・削除・移動・上書きを禁止する。
`prototype/` 外の実装ファイルは、ユーザーから明示的な指示がない限り変更しない。

### Git操作

以下はユーザーの明示的承認なしに実行してはならない。

- `git commit` / `git push` / `git reset` / `git checkout` / `git clean` / `git rm`
- `git restore` による作業内容の破棄

### アクセス範囲

指示がない限り、`AGENTS.md` `CLAUDE.md` `docs/` `prototype/` のみを読み書き・参照対象とする。
`画像素材/` `資料/` `old_build/` などにはユーザーから明示的に指示がない限りアクセスしない。

SE選定・実装時のみ `docs/SOUND_EFFECT_RULES.md` を読むこと。SEに関係しない改修では読まない。

### Claude / Codex の役割

Claudeが司令塔、Codexが実装担当。委譲の主目的は**Claudeのコンテキスト消費の節約**であり、委譲自体は必須ではない。

- Claudeが直接行う：原因調査・不具合の切り分け・ブラウザでの実測・少量の修正。
  直接やった方が効率的ならそのまま実施してよい。
- Codexへ委譲する：仕様と変更範囲が明確な中〜大規模実装、定型的な変更、並列化可能な作業。

委譲時は実体パスで起動する（`~/.local/bin/codex` 経由は補助バイナリを解決できない）。

```
~/.codex/packages/standalone/current/bin/codex exec \
  -m gpt-5.6-luna --sandbox workspace-write -C <リポジトリ> "<指示>"
```

仕様・変更対象ファイル・変更しない範囲を明示すること（Codexは非対話）。
**委譲した場合、Claudeが差分と検証結果を必ずレビューする**（最低限 `git diff` と `node --check`）。
Codexは commit / push を行わない。ブラウザ実機確認時はブラウザ音声のミュートを確認させること。

### 高速改修モード

ユーザーが手動テストし、その結果をもとに小さく改修する高速イテレーションで進行する。

1. 最小差分で実装する
2. 既存構造を維持する
3. 指示された仕様だけを変更する
4. 不要なリファクタをしない
5. 長時間の探索・検証より、短い実装と手動テストしやすさを優先する

### 作業開始時のルール

最初に以下を短く列挙し、それが確定するまでコード変更を開始しない。

- 変更対象ファイル（最大5個まで特定する。原則その範囲外は読まない・触らない）
- 変更対象関数
- 変更しない範囲
- 主要な影響先（下記「影響範囲」で洗い出したもの）

複数仕様が含まれる場合、まず最低限動く実装を完成させる。
演出・UI改善・最適化は、ユーザー確認後の次パスで行う。
不明点があっても、作業が止まるほどでなければ合理的に仮定して進め、最後に短く報告する。

### 影響範囲の把握と回帰確認

以前正常だった箇所が壊れる事故が頻発したため、以下を厳守する。

1. 変更する関数・CSSセレクタ・クラス名を、他のどこが使っているかを検索して洗い出す
2. 「主要な影響先」を作業開始時に列挙する
3. 実装は指示された仕様だけに閉じる。気づいた別の不具合はその場で直さず、報告に留める
4. 修正後、列挙した影響先が壊れていないことを確認してから完了報告する

変更内容と無関係な網羅的テストは行わない。

特に注意する共通基盤：

- 共有クラス／セレクタ：`.card` `.rew-card` `.slot.unit-card` `.cant` `right-card-peek` など、
  戦闘・報酬・ショップ・図書館・ゲームオーバーで共用されるもの
- 共有フラグ：`G.phase` の分岐、`_debugMode`、`_isLibrary` / `_isShop` / `_isForge`
- 共通ヘルパー：`playSfx` / 音量計算、`renderHandEditor()`、`toggleBoardCardVisibility()`、戦闘ループの中断フラグ
- 汎用の効果カウンタ：`_unitEffectPanelCount()` などを増減させる変更は、
  開戦・攻撃・負傷・死亡・解放・マナ効果のどれに掛かるかを確認する

### 禁止事項

- 依頼されていない大規模リファクタ／ついで修正／長時間の網羅的調査
- ファイル分割・移動（※`prototype/` フォルダ内に限り可）
- グローバル構造の再設計／ビルドツール導入／モジュール化
- セーブデータ形式の変更／命名規則の全面変更／UI全体の作り直し
- 既存仕様の独自解釈による変更

### 実装ルール

指定値がある場合は必ずその値を使う（「HP+3」「ゴールド+1」「マナ+5」など）。
既存関数がある場合は再利用する。新しい仕組みを作る前に、既存の状態・描画・報酬・フェイズ処理を確認する。

変更はできるだけ以下の単位に閉じる。

- マップ変更 → `map.js`, `floors.js`, `render.js`
- 戦闘変更 → `battle.js`（ルールは `battle/core.js`）
- 報酬変更 → `reward.js`, `pool.js`
- ショップ/施設/イベント → `map.js`, `reward.js`（ショップUIは報酬画面と共通）

### テスト方針

最速で確認できるものだけ実行する。優先順位：

1. 構文エラー確認（`node --check`）
2. 変更箇所周辺の動作確認
3. 「影響範囲」で列挙した主要な影響先の回帰確認
4. ブラウザで確認すべき手動テスト項目の提示

`index.html` の該当 `<script src=...?v=>` を上げること。

### 完了報告ルール

完了時は必ず日本語で、短く以下だけ報告する。

- 変更したファイル
- 実装した内容
- 変更していない内容
- 確認した主要な影響先（回帰していないこと）
- 手動テスト項目

長い説明、推測、設計論は不要。

### 実機検証の完了条件

- UI・演出・召喚・召喚上限・詰めアニメーション・マナ効果発動時点・個別カード効果の修正は、
  自動検査が成功しただけで完了扱いにしない。正常応答を確認した固定ローカルサーバーを実際に開き、
  デバッグモードの試験戦闘で再現ケースを操作し、修正前の症状が消えたことを確認するまで完了報告しない。
  確認できない場合は未完了として報告する。
- 添付スクリーンショットに写ったURLやサーバー名を検証先の根拠にしない。
  HTTP応答を実測したサーバーだけを検証先に使い、使用URLを報告する。
- 召喚上限、盤面の詰め、マナ効果、攻撃演出はイベント生成だけで正常判定しない。
  DOM上の表示位置・表示時刻・状態変化を実測する。
- ユーザーから報告された不具合は、コード変更や自動テストの成功だけで「修正済み」と報告しない。
  複数カードが対象の場合はカードごとに結果を記録し、未確認カードを残したまま「全カード確認済み」と書かない。
- ブラウザ操作ができない環境の場合は、**「ブラウザ確認は未実施」と報告に明記する**こと。

ブラウザ確認の代わりに、ページのコンソールから直接コアの経路を叩いて数値で確かめる方法も使える。
戦闘ループはタブが非表示だと止まるため、`playerPass()` を直接呼ぶか、
`G.allies` / `G.enemies` を手で組んで `applyDamageBatch()` や `_applyUnitAttackEffects()` を呼び、
HP・ATK・`G.mana`・`G.gold` の変化量を確認する。
※効果文をコンソールへ書く時は **敵（U+6575）と 敌（U+654C）を取り違えない**こと。

---

## 6. コードの地図

### ファイル構成

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

### カードデータの構造

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

**個別カードの演出は、シートの「VFX/SE」列（`fxCode`）で指定する。**
空欄ならカード自身のNo.を使う。**キーワードのVFX/SEはここで指定しなくても対象へ出る。**
引き当ては `_effectPresentationCode()`（battle.js）と `getCharacterEffectVfxPath()`（assets.js）が
どちらも `fxCode` を最優先で見る。オンラインへは `effectData.fxCode` として送る。

**固有の素材は `assets.js` に登録したものだけが出る（VFXは `Assets.vfx`、SEは `Assets.sfx`）。**
**登録の鍵は「効果の番号」で、素材のファイル名とはずれてよい**（例：`C003` → `S006.webp`）。
素材名を変えたら、参照先だけを差し替えて鍵は変えないこと（コードが鍵で引いている）。
キャラクター＝`characterEffect`、強化カード＝`enchantEffect`、キーワード＝`keywordEffect`、
薙ぎ払い＝`characterSweep`、特殊演出＝`specialProduction`。
**シートのNo.を振り直したら素材ファイル名もここも必ず一緒に直すこと**（`anim_check.js` が検査する）。

### 主要な状態（G オブジェクト）

`initState()`（`js/engine/state.js`）で初期化。フィールド数が非常に多いため、以下は代表的なものの抜粋（網羅ではない。全量は `initState()` を直接参照）：

- `G.rings[]` — 装備中の指輪4枠（null = 空スロット）。`G.spells` / `G.ringSlots` / `G.handSlots` は存在しない
- `G.mainBoard[]` — メイン置き場（5列×3行＝15枠）。パーティ全体で共有する単一の配置グリッド
- `G.inventory[]` — マップ用インベントリ（9×2＝18枠）。`G.globalPanels[]` は全体強化7枠
- `G.spellSlots[]` — 廃止済み。互換用に空配列だけ残っている
- `G.allies[]` / `G.enemies[]` — 戦場のユニット（hp≤0 = 死亡）
- `G.phase` — `'init'` | `'player'` | `'enemy'` | `'commander'` | `'reward'` 等
- `G.floor`, `G.gold`。ライフは **`G._waveLife` が実値**（`G.life` は旧来の値）
- `G.rewardGrade`, `G.rewardGradeUpCount`, `G.rewardCharCount`, `G.rewardCards` / `G.maxRewardCards` — 報酬グレード関連（旧 `G.rewardLv` は現存しない）
- `G.mana` — **色別ではない共有スカラー値**（数値1つ）。`initState()` では未初期化で、
  戦闘開始時に `battle.js` の `_ensureMana()` が0で遅延生成する。戦闘中の表示は `#battle-mana-value`
- `G.buffAdjBonuses` — パネル配置（隣接強化）による永続ボーナス

### その他のファイル

- **old_build/** — Unityビルド（日付フォルダ／mac用・win用）
- **画像素材/** — PNG素材（キャラ・敵・カード・UI）
- **資料/** — 企画・カードリスト資料

---

## 7. 現在の状態

### 履歴の記述ルール

- 直前の履歴を記述したのが自分（今回の会話セッション）でない場合、今回の作業完了後に履歴を全て消し、
  新規に1件から書き始める。
- 直前の履歴を記述したのが自分である場合、履歴は消さずに書き足す（目安3〜5行を維持）。
- 「自分が書いたか」は会話セッション内の記憶で判断する。内容に見覚えがなければ他セッション／
  ユーザー本人による記述とみなす。
- **完了した作業の経緯は履歴に残さない。** 残すのは「今後も守るべき規則」だけで、それは上の1〜6章へ書く。

### 完了している一本化（これらを二重実装へ戻さないこと）

| 対象 | 唯一の実装 |
| --- | --- |
| 戦闘ルール（攻撃・負傷・死亡・開戦・マナ閾値・毒・指輪／アイテム・魔導板・召喚／変身） | `js/battle/core.js` |
| 戦闘の進行（1ターン） | `coreBattleStep()`。PvEの `battlePhase()` はこれを1手ずつ呼ぶだけ |
| 開戦処理 | `coreRunOpening()`。PvEの `_finishNewPanelBattleStartEffects` もこれを呼ぶだけ |
| 魔導板→出撃ユニット | `js/battle/formation.js` の `buildBoardFormation()` |
| 見せ方の規則 | `js/battle/present.js` |
| イベント1件の見せ方 | `js/battle/present_events.js` |
| 描画そのもの | `js/engine/render.js` |
| 召喚体の位置／盤面の詰め | `coreInsertSummonedUnit()` / `coreCompactUnits()` |

**詰め処理は演出の後に行うこと。** 先に詰めると、再生時に攻撃対象が盤面から消えていて
攻撃モーションが一切出なくなる。`runner.step({deferCompact:true})` → 演出 → `runner.compact()` の順。

### 履歴

35. ケンタウロスの着弾VFXを登録し、提示カードの矢印の重複を無くした（今回）。
    - **ケンタウロスの着弾VFXが未登録だった**（素材名が書き出しのままだった）。
      `C019_2.webp` として `Assets.vfx.enchantEffectHit` へ登録し、
      大きさは `PRESENT_VFX_SCALE.C019_2`（1.2＝炎の矢の着弾と同じ扱い）。
      着弾SE（`C019_2.wav`＝`C019_HIT`）は登録済みだったので、これで絵と音が揃う。
    - **報酬・魔導店で、矢印の向きの組み合わせが完全に同じカードを2枚以上出さないようにした。**
      判定は**向きの集合**（並び順は無関係）で、**本数が違えば同じ向きを含んでよい**
      （「左＋下」は1枚まで／「左＋下＋右」は同時に出てよい）。
      重複したカードだけを**同じ本数のまま**別の組み合わせへ振り直す
      （`_dedupePanelDirections()`＝pool.js。報酬・魔導店とも `drawRewards()` が唯一の入口）。
      提示枚数が組み合わせ数を超える場合（2本＝向かい合わせ禁止で4通りしかない）は重複を許す。
    - 変更：`assets.js` `js/battle/present.js` `js/engine/pool.js` `index.html`。
      `?v=` は **`contact32`**。
    - 検査：balance_sim 5本／`online_payload`／`online_receivers` すべて NG 0。
    - **未確認**：実機での確認は未実施。


34. 効果発動の発光をVFXへ合わせ、バフVFXを対象全員へ出すようにした。ホバー説明も直した。
    - **発光がVFXより先行していた。** コアは効果を解決した順にイベントを出すため、
      `effect_flash` は対応するVFXより前に届く。特にマナ効果は前の効果の演出が
      終わるのを待ってから始まるので、その待ち時間ぶんまるごと先に光っていた。
      **発光は保留し、次にVFXが出る瞬間に合わせて再生する**ようにした
      （`presentQueueEffectFlash()` / `presentFlushEffectFlashes()`＝present_events.js が唯一の実装。
      受け口は render.js の各VFXの入口に `_syncEffectFlashWithVfx()` を置くだけ）。
      VFXを出さない効果のために、700ms（`PRESENT_EFFECT_FLASH_MAX_WAIT_MS`）の安全弁で自動再生する。
      戦闘の切れ目（`presentResetPlayback()` と同じ場所）で保留を捨てる。
    - **バフVFX（S005攻撃／S006負傷／S007死亡／S008マナ／S009常時・開戦）は、
      能力変化を受けた対象全員の上に出す。** `presentStatChangeVfxAllowed()` が
      効果名の一覧（`PRESENT_STAT_CHANGE_VFX_REASONS`）を必須にしていたため、
      一覧に無いトリガのバフは1つも出ていなかった。**トリガが決まる能力変化は必ず出す**へ変更。
    - **マナ効果のバフも S008 を対象全員へ出す。** これまでは
      `PRESENT_STAT_CHANGE_VFX_EXCLUDED`（mana_threshold*）で丸ごと止めていた。
      止めていた理由は「発生元のマナ効果の合図と同じ絵が2重になる」ことなので、
      番号を一律 S008 へ寄せて解決した（合図はカード自身の番号のまま／別素材）。
      `PRESENT_STAT_CHANGE_VFX_EXCLUDED` は廃止。
    - **ホバー説明に見出し下の直線を入れた**（キャラクターと同じ。`data-preview-norule` をやめた）。
    - **所持金・ライフ・マナ・血のホバーが編成画面でしか出なかった。**
      `#battle-status-hud` `#battle-counters` `#village-status` `#map-status` が
      `pointer-events:none` で、枠にカーソルが当たらなかった。**枠（`.battle-status-counter`／
      `.battle-counter`）だけ `pointer-events:auto`** にした（親はnoneのままなので、
      枠の外と枠同士の隙間はこれまで通り素通りする）。戦闘・村・マップ・
      ゲームオーバー／クリアのどの画面でも同じに出る。
    - **それでも対象全員に出なかった原因（ドワーフで発覚）**：
      1. **マナ効果の `stat_change` に `sourceId` が載っていなかった。**
         演出の可否は `ev.sourceId` を必須にしているので、マナ効果のバフは
         1件も通っていなかった。コアの `mana_threshold*` の能力変化すべてと、
         `opening_atk_double` `opening_hp_double` `attack_swap` に発生元を載せた。
      2. **発生元にバフVFXが出ていた。** シートの「VFX/SE」列がS008のカード
         （ドワーフ）は、マナ効果の合図に続く固有VFX（`_playManaEffectPulse`）が
         **発生元の上に**S008を出していた。対象に選ばれていない本人だけが光る形。
         **バフの番号（S005〜S009）は発生元へ出さない**ようにした
         （`presentIsBuffVfxCode()`＝present.js。PvE・オンライン両方の pulse で弾く）。
    - **バフの番号は「シートの指定が最優先」**（コボルドの列がS007＝死亡でS007.wavが
      鳴っていた件は、利用者がシート側を修正）。**コードでトリガの番号へ固定しないこと。**
      固定するとシートを直しても演出が変わらなくなる。
      列にバフの番号が無いカードだけ、トリガの既定で出す
      （攻撃S005／マナS008／開戦・常時S009は一律。負傷・死亡はカード固有の絵をそのまま使う）。
    - 変更：`js/battle/core.js` `js/battle/present.js` `js/battle/present_events.js`
      `js/engine/render.js` `js/engine/battle.js` `js/online/board.js`
      `js/engine/main.js` `index.html`。`?v=` は **`contact31`**（CSVは `sheet0904f`）。
    - **バフVFXが出ないカードがまだあった（フォルモール・センチネル）。**
      `reason` がトリガの一覧に載っていないと演出しない作りだったため、
      効果文から起こす新しい能力変化が漏れていた。
      **`attack_` / `injury_` / `death_` で始まる reason は、一覧に無くても
      そのトリガとして扱う**ようにし（`presentStatChangeTrigger()`）、
      接頭辞の無い名前（`sentinel` `arch_demon_purple_buff` `gremlin_swap`＝攻撃、
      `strange_bond` `roar` `majesty` `green_hermit`＝開戦、
      `warg_count_buff` `summon_scaling_buff` `naga_summon` `jack_o_lantern`＝常時）を一覧へ足した。
      `gremlin_swap` には `sourceId` も無かったので載せた。
    - **メデューサの固有VFX/SEが、効果ダメージを受けた時だけ出なかった。**
      マナ効果の解決中は `state._coreEffectNo` が立っており、その最中に**誘発で
      割り込んだ別のキャラクターのダメージ**（メデューサの負傷＝受けたダメージぶんを
      ランダムな敵へ）にも同じ番号が載っていた。再生側はその番号を見て
      「その効果の演出で見せるダメージ」と判断するため、メデューサ自身の
      固有VFX/SEが一切出なくなっていた。**効果の持ち主が与えたダメージにだけ
      番号を載せる**ようにした（`coreDamageEffectNo()` / `state._coreEffectOwnerId`）。
    - **マナ獲得VFX（S004）を、カード中央より少し上から出し、上へ動きながら
      フェードアウトするようにした**（以前はカードの上端よりさらに上に出て、その場で消えていた）。
      つまみは `PRESENT_MANA_GAIN_VFX_START_Y`（.18）と `PRESENT_MANA_GAIN_VFX_RISE`（.35）。
      どちらもカード高さに対する比。
    - **ミノタウロスがダメージを受ける前に動き出していた。**
      攻撃モーションの先出し（攻撃効果は「少し動き出してから」見せる規則）で、
      **本人が起こした効果かどうかを見ていなかった**ため、
      「受けたダメージ」まで先出しの合図に数えていた。
      オンライン側は最初から発生元を見ており、**PvEだけが取り残されていた**。
      判定を present.js（`presentPreAttackEffectOwnerId()` / `presentPreAttackActorId()`）へ集約し、
      両方の受け口から同じ関数を呼ぶようにした。
    - **ヘカトンケイルがマナ効果の演出より先にマナを得ていた。**
      マナ獲得VFX（S004）はフェードインに140msかかるのに、数字は同じ瞬間に動いていた。
      **数字はVFXが見え始めてから動かす**（`PRESENT_MANA_GAIN_VALUE_DELAY_MS`。PvE・オンライン共通）。
    - **戦闘中に召喚された体のマナ効果が、その時点のマナぶん一気に発動していた。**
      「Xマナ毎」の到達回数は現在マナ÷Xで数えるため、召喚直後の体が
      いきなり撃ち切っていた。**召喚された瞬間のマナを基準にし、
      それ以降に得たマナだけで数える**（`_manaThresholdBaseline` /
      `coreManaThresholdProgress()`）。開戦の召喚は盤面の初期配置と同じ扱いで印を付けない。
    - **マーメイドがいると、誰が攻撃・負傷してもマナが増えていた。**
      `coreGainResource()` は「攻撃：0マナを得る」の形で毎回呼ばれるが、
      **0のまま先へ進んでいた**ため、マーメイドの加算（緑から得るマナ+1）が
      0を1に変えていた。**元の量が0なら即座に抜ける**ようにした。
    - **状態異常を付けた時のVFX（毒牙＝K003 等）を、連続付与で出し直さないようにした。**
      付与のたびに `playHitVfx()` で作り直していたため、絵が何度も頭から再生されていた。
      **同じキャラクターへ続けて付与される間は1つの再生を延ばして出し続ける**
      （`playKeywordEffectVfxSustained()`＝render.js が唯一の実装。尺は
      `PRESENT_KEYWORD_VFX_HOLD_MS`＝最後の付与から800ms）。SEは出し始めの1回だけ鳴らす。
      `getEffectVfxPath()` がキーワードの素材も番号で引けるようにした。
    - **ウォーグのバフは「効果1回につき1回」。**
      「7体になった瞬間の1回」だけ発動していたため、5体＋3体召喚のように
      途中で7体を超えると、7体目より後に出た体が素通りしていた。
      正しい規則は**1回の効果で何体召喚されても発動は1回**
      （6体＋3体召喚＝1回／9体＋1体召喚＝1回／9体＋3体召喚＝1回）。
      召喚は1体ずつ解決されるので、効果の入口（開戦・攻撃・負傷・死亡・結界喪失・
      復活・リッチのまとめ召喚・指輪・アイテム）で `coreBeginSummonBatch()` /
      `coreEndSummonBatch()` を掛け、その間の増加をまとめて1回として扱う。
      **新しく召喚を伴う効果の入口を足す時は、この対で囲むこと。**
      死亡時にも人数を記録し直す（記録が減らないと、後から召喚しても
      「増えて7体以上になった」と判定できない）。
      あわせて、加算値（紫修正などの `coreStatBonus` 込み）と
      イベントに載せる値が食い違っていたのも直した。
    - **ファントム／エイドロンのバフが、復活した体に乗らなかった。**
      「この戦闘中、召喚された味方は+X/+Yを得る」は `coreSummonUnit()` の中でしか
      乗せていなかったが、**復活＝再召喚**なので `coreTryRevive()` でも乗せる。
      revive イベントより**先に**乗せ、イベントに載る値も加算後にする
      （受け口はイベントの値で表示を進めるため、後から足すと表示だけずれる）。
    - **復活VFXの位置がずれていた。** 掴んだ矩形のまま出していたため、
      倒れた体を外して盤面が詰まると絵だけ元の場所に取り残されていた。
      他の効果VFXと同じく**カードを追いかける**ようにした。
      素材（K020）の絵が右寄りなので、`PRESENT_REVIVE_VFX_OFFSET_X`（カード幅比。
      既定 -.06）で中心へ寄せる。**大きさ・位置のつまみはここだけ。**
    - **復活VFXをカードより下に出すようにした。**
      戦闘画面（#scr-battle）は transform:scale で自前の重なり文脈を作るため、
      body直下のVFX層（#vfx-frame-clip）へ入れた絵は**必ずカードより上**になる。
      カードの下に出したい演出は `_underCardVfxLayer()`（#scr-battle 直下の z-index:0 の層。
      ステージ効果動画 #stage-bg-video と同じ位置づけ）へ入れ、
      座標は `_toBattleScreenRect()` で画面内（scaleを戻した）座標へ直す。
      **この層は #scr-battle の末尾へ足すこと。** 先頭へ入れると
      `#scr-battle>div:nth-of-type(1){display:none}` に当たって層ごと消え、
      本来隠れていた要素が代わりに現れる（実際に復活VFXが出なくなった）。
    - **ピクシーの効果文を「攻撃：ランダムな前衛の敵を操り、代わりに攻撃させる。」にした。**
      操る対象を前衛だけに絞る（`js/data/loader.js` の上書きと core の抽出条件）。
      **シートのキャラクターシートはまだ旧文（「ランダムな敵を操り」）。**
    - **オンラインで前の対戦のマナが残っていた。** サーバーへ送る初期マナは0なのに、
      `G.mana` を戻すのは PvE の `startBattle()` だけだった。
      オンラインの `BATTLE_START` でも血と同じく0へ戻す。
    - **勝利・撤退の結果表示中に、所持金・ライフ・マナ・血のホバー説明が出なかった。**
      その画面はカードの説明を止めるために `#kw-tooltip` ごと `display:none`
      にしていた。ステータスの説明には印（`data-preview-status` →
      `#kw-tooltip.status-tip`）を付け、それだけは出すようにした。
    - **ニンフの開戦マナでマナ獲得SEが鳴らなかった。**
      SEは「前に表示していたマナより増えたら鳴らす」判定だが、その基準
      （`_shownManaForSfx`）が初回は null、以降は前の戦闘の値のままだった。
      **戦闘開始時に0へ戻す**ようにした。
    - **召喚の登場演出（S001）を1.5倍速にした**（`PRESENT_SUMMON_VFX_SPEED`＝present.js）。
      順再生の速度は素材そのものなので、折り返し（カードが出る瞬間）が早くなり、
      逆再生がその倍率で速くなる。生贄奉納・封印解放の演出は据え置き。
    - 検査：balance_sim 5本／`online_payload`／`online_receivers` すべて NG 0。
    - **未確認**：実機での確認は未実施。

33. タイトルへ戻ると操作不能になる件と、右クリック・ホバー説明を直した。
    - **ゲームオーバーからタイトルへ戻ると何も押せなくなっていた。**
      メニューは `.startup-menu-visible:not(.startup-menu-ready)` で
      `pointer-events:none` になるが、`showScreen('title')` が
      `startup-menu-ready` を付けていなかった。見えているのに押せない状態だった。
    - **ゲームオーバー・クリア画面でも、魔導板の外を右クリックしてカード非表示を
      切り替えられるようにした**（編成画面と同じ扱い。以前は盤面の上だけ）。
    - **ブラウザの右クリックメニューを全画面で出さないようにした**
      （`document` のcapture段階で `preventDefault`。個別の切り替え処理は
      `preventDefault` では止まらないのでそのまま動く）。
    - **所持金・ライフ・マナ・血にホバー説明を追加した**（`applyStatusTooltips()`／main.js）。
      **文言はテキストメッセージシートが唯一の出どころ**（`window.TEXT_MESSAGES` の
      「全画面「所持金」上」等）。見せ方はキャラクターのホバーと同じ `data-preview` で、
      見せ方はキャラクターのホバーと同じ（直線も同じに出す。34で `data-preview-norule` をやめた）。枠全体がホバー対象。
      戦闘・村・マップ・編成のどの画面の表示にも貼る（描画のたびに貼り直す）。
    - 変更：`js/engine/main.js` `js/engine/reward.js` `index.html`
      `js/data/local_xlsx_data.js`。`?v=` は **`contact18`**（CSVは `sheet0904f`）。
    - **未確認**：実機での確認は未実施。

32. 先攻の指輪判定と、ボス報酬の指輪タグを直した。
    - **疾風の指輪で先攻になっていた。** 先攻になるのは**神速の指輪だけ**
      （開戦：左端のATKを2倍にし、先攻になる）。疾風の指輪は
      「常時：味方の攻撃回数は1回追加される」で先攻とは無関係。
      `corePickFirstSide()` と、PvEの開戦指輪処理の両方で一緒に扱っていた。
    - **ボス報酬の指輪タグが効かないことがあった。** タグの集計に
      「3枚以上」「2枚以上」という独自の下限があり、**魔導板のキャラクターが
      3枚しかいない編成ではどのタグも成立せず、提示が丸ごとランダムへ落ちていた**
      （紫だけの編成なのに他色の瞳の指輪が出る）。計算式シートの定義どおり
      「所持カード内に最も多く含まれるタグ」を素直に数える形にした
      （3色以上で意味を持つ「多色」だけ下限を残す）。
      あわせて「マナ」タグの正規表現のエスケープ誤り（`\\s`）を直した。
    - 変更：`js/battle/core.js` `js/engine/battle.js` `js/engine/reward.js`。
      `?v=` は **`contact17`**。
    - **未確認**：実機での確認は未実施。

31. 紫修正・追加攻撃・合体カードの取りこぼしを直した。
    - **ヴォイド・ウォーカーの紫修正（`_voidWalkerBonus`）を1箇所で作り直す形にした**
      （`coreRefreshVoidWalkerBonus()`）。状態を作った時・召喚した時・手番の頭で必ず通す。
      キャッシュを置く経路が `createBattleState` と `coreSummonUnit`（召喚された体だけ）に
      分かれていて、**手組みの `_createPveCoreState()` では初期化そのものが抜けていた**。
      そのためツインデビルの本体とコピーで +1/+1 と +2/+2 が食い違っていた。
    - **追加攻撃（二段・三段・疾風の指輪）の攻撃モーションが出ないことがあった。**
      `strike()` が「その一撃の主対象」を受け取らず外側の `target` を見ていたため、
      2回目以降の attack イベントが `attackVisual:false` になり再生側が飛ばしていた。
      主対象を渡す形にした（接触VFXの対象・反撃の判定も同じ主対象で見る）。
    - **絆の巻物で合体したカードの攻撃効果だけ2回目が発動しなかった。**
      反復ボーナスの引き方が攻撃だけ `effectData.effectRepeatBonus` しか見ておらず、
      カード自身の `_effectRepeatBonus` を無視していた（開戦・負傷・死亡は両方見ている）。
    - **絆の巻物で合体しても4方向にならなかった。** 矢印は `directions`（配列）で描くが、
      合体処理は `directionCount` しか設定していなかった（3枚合体は両方設定している）。
    - 変更：`js/battle/core.js` `js/engine/battle.js` `js/engine/reward.js`。
      `?v=` は **`contact16`**。
    - **未確認**：実機での確認は未実施。

30. 解放中の数値表示と、根性で耐えた後のHP表示を直した。
    - **解放の演出中にATK/HPが見えなくなっていた。** 封印中は CSS
      （`.sealed-unit .slot-stats`）が `brightness(1.9)` で数値を持ち上げているが、
      解放の暗転→復帰では `sealed-unit` を先に外すため、その補正だけが消えて
      親の `brightness(.45)` がそのままかかっていた（白文字＋黒縁なので消えて見える）。
      同じ補正をインラインで引き継ぎ、明るさと一緒に等倍へ戻すようにした。
    - **根性で耐えた体のHPが0のまま残っていた。** ダメージで表示を0まで進めた後、
      `revive` イベントで表示を戻していなかった。**蘇生後の値まで表示を進める**
      （復活・根性・指輪すべて。`presentReviveEvent` の `applyStats`）。
      専用の演出があるのはキーワード「復活」だけ、という区別はそのまま。
    - 変更：`js/engine/render.js` `js/battle/present_events.js` `js/engine/battle.js`
      `js/online/board.js`。`?v=` は **`contact15`**。
    - **未確認**：実機での見え方は未確認。

29. 同じ陣営への攻撃モーションと、再挑戦時の会話を直した。
    - **ピクシーで操られた敵が、同じ陣営の敵へ突進しなかった。**
      攻撃モーションも受け口も「対象は相手陣営」と決め打ちしていたため、
      対象が見つからずモーションごと出ていなかった。
      **対象は相手陣営とは限らない。** 相手陣営で見つからなければ同じ陣営から探し、
      見つけた側の盤面へ飛ばす（`_playAttackMotionCore` / PvE・オンラインの受け口）。
      傾き（tilt）は今までどおり左右の差だけで決まるので、同じ隊列同士なら角度は付かない。
    - **再挑戦（同じエリート・ボスへ挑み直した）時は開幕の会話を飛ばす。**
      判定は「敵を引き継いだか」（`reuseWaveEnemies`）＝`G._skipBattleStartLines`。
    - マナ獲得VFX（S004）の位置計算が打ち消し合っていた（`offsetY` が効いていなかった）。
      大きさもカード幅に対する下限（`PRESENT_MANA_GAIN_VFX_MIN_CARD_RATIO`＝.55）を入れた。
      64px（ゲーム内座標）のままだと戦闘のカードの上では点にしか見えなかった。
    - 変更：`js/engine/render.js` `js/engine/battle.js` `js/online/board.js`
      `js/battle/present.js`。`?v=` は **`contact14`**。
    - **未確認**：実機での見え方は未確認。

28. 更新されたシートで確認し、残っていた食い違いを直した。
    シートは指示どおり更新済み（C022＝シャドウ／C101＝スケルトン、C107・C108は削除）。
    27で入れた実装が新しい本文で動くことを `effect_audit.js` で確認した
    （シャドウ・ファントム・エイドロン・デュラハン・ボーンチャリオット・スリープシープ・
    ワーム・エレメンタル・サキュバスがすべて期待どおり発動）。
    - **`loader.js` のカード別上書きがシートのキーワードを force で戻していた。**
      ウォーグの `先制`・ワームの `三方向攻撃` はシートから外れたので、上書き側からも外した。
      ウルフを force 一覧へ入れた（シート行はあるが効果文が空で、`_sheetDescLoaded` が
      立って上書きが素通りし、`先制` が付かないため）。
    - **奪った体を配列から null で抜いていたのが原因でオンライン再生が落ちていた**
      （`battleCoreFinalState` が null を踏む）。盤面配列は「生きている体を左詰め」で持つ決まりなので、
      死亡と同じくHPを0にして詰め直しに任せる形へ直した（死亡効果は発動させない）。
    - 回帰を新しい仕様へ更新：ワーム（毒の発動）、エレメンタル（全色で2倍／封印色は数えない）。
      **`createBattleState()` はユニットを複製する。** 検証では状態側の体を見ること
      （元のオブジェクトを見ていて「効果が出ていない」と誤検出した）。
    - 変更：`js/data/loader.js` `js/battle/core.js` `js/data/local_xlsx_data.js`
      `tools/balance_sim/effect_audit.js`。`?v=` は **`contact13`**（CSVは `sheet0904e`）。
    - **未確認**：実機での通し確認は未実施。

27. カード効果の差し替えをコアへ実装した。
    **シートはまだ旧内容のまま。** 効果は「新しい効果文が来たら動く」形で入れてあり、
    シートが更新された時点で切り替わる（現行データでは今までどおり動く）。
    - 新しく実装した効果文（すべて本文駆動）：
      `攻撃：血がN以上なら全ての味方は+X/+Yを得る`（シャドウ）／
      `攻撃：ランダムな敵にXダメージを与える。Xは血に等しい`（デュラハン）／
      `攻撃：全ての敵の毒を発動させる`（ワーム）／
      `死亡：この戦闘中、召喚された味方は+X/+Yを得る`（ファントム）／
      `負傷：この戦闘中、召喚された味方はATK+Xを得る`（エイドロン）／
      `負傷：ランダムな味方に「死亡：「X」を召喚する。」を付与する`（ボーンチャリオット）／
      `死亡：血をN得る`（スリープシープ）／`死亡：ランダムな前衛の敵を奪う`（サキュバス）／
      `開戦：全ての色の味方がいる場合、このキャラクターのATKとHPを2倍にする`（エレメンタル）／
      `常時：このキャラクターが敵を倒した時、血をN得る`（インキュバス）。
      リッチの新しい本文は既存の汎用処理（味方が死亡するたび4ダメージ）で動く。
    - **旧実装は「新しい本文が無い時だけ」動くようにした**（カード名で無条件に発動させない）。
      判定は「**新しい本文が無いこと**」で書くこと。「古い本文があること」で書くと、
      本文を持たない検証用ユニット（`effect_audit` の最小シナリオ）で発動しなくなる。
    - 新しいイベント：`summon_buff`（この戦闘中の召喚バフ）／`unit_stolen`（敵を奪った）。
      受け口はPvE・オンラインの両方に置いた（`online_receivers.js` が欠落を見る）。
    - `js/data/loader.js` のカード別上書きを新しい効果文へ更新し、
      ダイアウルフ＝先制／スケルトン＝復活／ウルフ＝先制を足した。
      **C022＝シャドウ／C101＝スケルトンの入れ替え**に合わせ、召喚専用カード
      （報酬・ショップに出さない）をシャドウからスケルトンへ移した。
      `js/engine/pool.js` の No.・レアリティも入れ替えた。
    - C107 スケープゴート／C108 ナイトはコード側に定義が無く、参照は
      ワームの旧効果（「黒ナイト」召喚）だけ。新しい本文へ移れば呼ばれない。
    - 変更：`js/battle/core.js` `js/battle/present.js` `js/data/loader.js`
      `js/engine/pool.js` `js/engine/battle.js` `js/online/board.js`。`?v=` は **`contact12`**。
    - **未確認**：シートが未更新のため、実データでの動作は未確認。
      シート更新後に `effect_audit.js` を回すと、新しい本文が期待回数どおり
      発動しているかを機械的に確認できる。

26. 復活の演出を足し、確率つき効果の発光を成功時だけにした。
    - **キーワード「復活」で再召喚された時の演出**（K020）。SEと同時にVFXをフェードイン →
      その上にカードをフェードイン → VFXをフェードアウト（`playReviveVfx()`／render.js、
      1件の扱いは `presentReviveEvent()`）。**PvEに `revive` の受け口が無かった**ので追加した
      （オンラインだけが状態を反映していた）。指輪・根性による蘇生は対象外。
    - **確率つきの負傷効果は、成功したときだけ光る**（ヘカトンケイルの「10%の確率で」）。
      発動テキストがあるだけで光らせていたため、外れても「発動した」ように見えていた。
      マナ獲得VFXは `mana_gain` から出るので、当たった時だけ出る。
    - 素材の登録：メデューサ＝C017（VFX/SE）、サイクロプス＝C018（VFXのみ）、
      ケンタウロス＝`C019_1.webp`/`C019_1.wav`（発射）＋`C019_2.wav`（着弾）。
      **`assets/vfx/C019.webp` は `C019_1.webp` へ改名済み**（SEは利用者が改名済み）。
    - 音量は実測から：C017=.56／C019=1.00／C019_HIT=.43／K020=.39。
      倍率：C017/C018=.5、C019/C019_1=.125、K020=.5。
    - 変更：`assets.js` `js/engine/audio.js` `js/engine/state.js` `js/battle/core.js`
      `js/battle/present.js` `js/battle/present_events.js` `js/engine/render.js`
      `js/engine/battle.js` `js/online/board.js`。`?v=` は **`contact11`**。
    - **未確認**：実機での見え方は未確認。

25. 開戦・常時の誘発で生じるバフを S009 にした。
    - 特殊演出シートに **S009＝バフ（常時）「開戦、誘発効果でバフが発生した。」** が
      追加されたので、`presentStatChangeVfxCode()` へ
      **開戦（`opening_*`）・常時の誘発（`passive`）は一律 S009** の規則を足した
      （攻撃時のバフが一律 S005 なのと同じ形）。
    - **「死亡」の分類を直した。** 「味方が死亡するたび」等の**観測**は、
      発動しているのは観測者の常時効果なので `passive`（S009）へ移した。
      S007（死亡）は倒れた本人の死亡効果だけ。
    - **観測系の `stat_change` に `sourceId` が無く、VFXが出せなかった**
      （攻撃観測・結界喪失観測・シャナ）。効果の持ち主を載せ、白い発光も出すようにした。
    - ガーゴイル（開戦のバフ）を「演出しない」一覧から外した（シートでS009が指定された）。
    - 内蔵CSVを再生成（`card` / `enchant` / `specialFx`）。シートのVFX/SE列は
      エティン・ヴァンパイアロード・レヴナント・ウォーグ・ナーガ・ジャック・オ・ランタン・
      グリマルキン・ガーゴイル・ヘルハウンド・ファナティック・奇妙な絆・屍術に S009 が入った。
    - 素材：`S009.webp`（516x516・倍率.5）／`S009.wav`（実測-8.8dBFS→音量.77）。
    - 変更：`assets.js` `js/engine/audio.js` `js/battle/core.js` `js/battle/present.js`
      `js/data/local_xlsx_data.js`。`?v=` は **`contact10`**（CSVは `sheet0904d`）。
    - **未確認**：実機での見え方は未確認。

24. 発光の色分けとマナ獲得の演出を足した。
    - **解放効果＝紫／開戦・終戦・常時の誘発＝白**（`presentEffectFlashEvent` の色表が唯一の定義）。
      コアは `release`（解放）と `passive`（常時の誘発）のイベントを出す。
      `passive` を出すのは**誘発する**常時効果だけ（シャナ・エティン・ワイバーン・
      「味方が死亡するたび」系）。「常時：緑のキャラクターから得るマナは+1される」の
      ような受動的な補正はコアがイベントを出さないので、そもそも光らない。
    - **マナを得たとき S004.webp を、得たキャラクターの上に出す**
      （`playManaGainVfx()`／render.js。魔導板の方向アイコンと同じ64px、
      フェードイン→少し置く→フェードアウト）。つまみは `PRESENT_MANA_GAIN_VFX_*`。
      受け口は PvE・オンラインの `mana_gain` の両方。
    - ケンタウロス（C019）の大きさを炎の矢と揃えた（`PRESENT_VFX_SCALE.C019`＝.125）。
    - 変更：`assets.js` `js/battle/core.js` `js/battle/present.js`
      `js/battle/present_events.js` `js/engine/render.js` `js/engine/battle.js`
      `js/online/board.js` `index.html`（紫の発光色）。`?v=` は **`contact09`**。
    - **未確認**：実機での見え方は未確認。

23. 貫通VFXが出なくなった件を直した。
    **`attackTargets()` にも `withPierce()` にも貫通の巻き込みが書かれていた**（二重実装）。
    先に `attackTargets()` が後衛を対象へ入れてしまうため、`withPierce()` は
    「もう入っている」と判断して**巻き込んだ相手を控えず**、演出を出すかの判定
    （`pierceVictimIds.size`）が常に0になっていた。
    巻き込みは `withPierce()` を唯一の実装とし、控えは「対象に入っているか」と
    無関係に必ず行うようにした。
    **教訓：同じルールを2箇所に書くと、片方が「もう片方がやった」と誤判断する。**
    ケンタウロスのSEは `C019.wav`（実測-12.0dBFS→音量1.00）。`?v=` は **`contact08`**。

22. 効果VFXの追従先を直し、貫通の発生位置を線の上へ揃え、ケンタウロスを追加した。
    - **効果固有VFXが「元の位置」で出続けていた本当の原因**：`playEffectVfxOnUnit()` の
      追従ループが**毎フレーム盤面の定位置へ張り直していた**。発生位置を渡しても
      次のフレームで戻される。追従先を「今そのキャラクターが見えている位置」
      （`_captureUnitEffectRect`＝攻撃モーション中は動いている複製カード）に変えた。
    - **貫通VFXの発生位置を「攻撃者から一番奥の対象へ引いた線の上」にした。**
      対象カードの中心から横へずらしていたため、線が対象と後衛の両方を通らず、
      左の前衛を攻撃した時だけ大きく左へ外れていた（`PRESENT_CONTACT_PIERCE_OFFSET_X`
      は0を既定にした。ずらしたい時だけ使う）。
    - **ケンタウロス（C019）を「発生元から対象へ飛ばす効果」にした。**
      `PRESENT_PROJECTILE_EFFECTS` はマナ効果だけでなく**ダメージの発生元**でも引く。
      該当したら数値・HP・命中VFXを**着弾の瞬間**に出し、通常の被弾演出は出さない
      （`presentDamageEvent`）。素材は `C019.webp` / SEは `Assets.sfx.C019`＝`S019.wav`。
      SEは `C019.wav`。
    - 変更：`assets.js` `js/engine/audio.js` `js/battle/present.js`
      `js/battle/present_events.js` `js/engine/render.js`。`?v=` は **`contact07`**。
    - **未確認**：実機での見え方は未確認。

21. 貫通の当たり判定を「半分以上重なっている後衛」に確定し、VFXを背景内へ収めた。
    - **貫通が巻き込む後衛は「前衛カードに半分以上重なって見える体」**（`CORE_PIERCE_OVERLAP`＝.5）。
      少しでも重なれば当たる（差1枚未満）にしていた頃は、画面ではほとんど後ろにいない
      後衛にも入っていた。**後ろに誰もいなければ、VFX・SE・効果とも発動しない**
      （`contactModes` へ 'pierce' を積むのは巻き込む相手がいる時だけ）。
    - 貫通VFXの幅を2倍（`PRESENT_CONTACT_PIERCE_WIDTH` .55→1.1）、
      出現位置を左へ（`PRESENT_CONTACT_PIERCE_OFFSET_X`＝-.45＝対象カード幅の比）。
    - **効果固有VFXが「元の位置」で出ていた。** 合図（K023）は動いた位置から出るのに、
      固有VFXは合図の逆再生開始後＝攻撃モーションの複製カードが消えた後に位置を
      掴み直していたため。**合図で掴んだ位置をそのまま使う**（`playEffectVfxOnUnit` の `rect`）。
    - **VFXが背景の外（黒帯）へ出ていた。** 全画面の入れ物を1枚だけ作り、
      `clip-path` で背景の描画範囲へ切り抜く（`_vfxClipLayer()` / `_battleVfxClipRect()`）。
      入れ物は画面いっぱいなので、中のhostの座標計算は今までのまま。
      **攻撃モーションの複製カードだけは入れない**（VFXではないので切り抜くと欠ける）。
    - **試験戦闘を途中で終えて通常戦闘に入るとキャラクターが複製されていた。**
      パネル召喚の印が付いた体だけを消していたため、戦闘中に召喚・変身した体が残り、
      次の戦闘で編成ぶんが改めて出撃していた。**盤面は空にする**（次は編成から作り直す）。
    - 大きさ：S003＝.5、K004＝.4。
    - **デバッグモードの編成画面にも魔導店と同じ売却ボタンを出した**
      （`_boardCardSellEnabled()`）。以前はボタンが出ず、×の経路でゴールドも入らず消えていた。
    - 変更：`js/battle/core.js` `js/battle/present.js` `js/engine/render.js`
      `js/engine/battle.js` `js/engine/reward.js` `js/online/board.js`。`?v=` は **`contact06`**。
    - **未確認**：実機での見え方は未確認。

20. 弱体付与の被弾VFX・サイレンの範囲演出・シートのVFX/SE列を実装した。
    - **与えたダメージが弱体を付与したら、被弾VFXを K004.webp にする**（SEは変えない）。
      判定は「そのダメージの直後に同じ体へ出ている `keyword_effect`」で行う
      （`presentDamageVfxKeyword`／present.js）。絵だけ差し替える口として
      `playHitVfxAtRect` に `vfxKeyword` を足した。
    - **サイレン（C011）の攻撃演出**を追加。発生源の周りにフェードインしてから
      高速で巨大化し、画面外へ抜ける（`playExpandingWaveVfx`／render.js）。
      **絵が届いた対象から順に数値を出す**（薙ぎ払いと同じ規則）。
      コアは `sweep_vfx` で対象と順番だけを出し、絵の選び方は
      `presentAreaVfxStyle()`（present.js）が決める。
      **サイレンは味方にも当たる**ので、受け口は対象を敵・味方の両方から引くようにした。
    - **シートの「VFX/SE」列を両シートぶん反映した。**
      キャラクターは複数指定に対応（ブラウニー＝攻撃S005／負傷S006をトリガで選ぶ）。
      エンチャントは強化カード側の指定を使う（剣技＝S005・継承/遺志＝S007 等）。
      マナ効果の素材も同じ列で引く（`_effectFxCodeByNo()`。`effectNo` は識別子のまま）。
      剣技を「演出しない」一覧から外した（シートでS005が指定されたため）。
    - 内蔵CSVの `card` / `enchant` を再生成（エンチャントシートにVFX/SE列が増えたため）。
    - 変更：`assets.js` `js/engine/audio.js` `js/engine/state.js` `js/battle/core.js`
      `js/battle/present.js` `js/battle/present_events.js` `js/engine/render.js`
      `js/engine/battle.js` `js/online/board.js` `js/data/local_xlsx_data.js`。
      `?v=` は **`contact05`**（CSVは `sheet0904c`）。
    - **未確認**：実機での見え方は未確認。広がる波の尺・大きさは
      `PRESENT_EXPAND_VFX_FADE_MS`／`GROW_MS`／`START`／`END`／`HIT_RATIO` で調整する。

19. 貫通の当たり判定を見た目に合わせ、効果の発生位置・音量・決着後の停止を直した。
    - **貫通が巻き込む後衛を「真後ろに重なって見える体」に変えた**（`corePierceRearTargets`）。
      以前は後衛を前衛の人数で等分する近似だったため、**画面では線の上にいない後衛に
      ダメージが入っていた**。前衛・後衛は同じ幅のカードを中央寄せで並べるので、
      中央からの位置（カード何枚分か）の差が1枚未満なら重なっている、で判定する。
      VFXも**一番奥の対象**へ向けて飛ばし、貫く相手が必ず線の上に来るようにした。
    - **効果の演出は「今そのキャラクターが見えている位置」から出す**
      （`_captureUnitEffectRect()`＝攻撃モーション中の複製カードの位置）。
      攻撃で少し動いた地点で発動したマナ効果・炎の矢が、盤面の定位置から出ていた。
      **ダメージ数値と被弾VFXは盤面の定位置のまま**（動く体に数値を付けると読めない）。
    - **決着後にマナ効果が続いていた。** どちらかの陣営が全滅していたらマナ閾値効果を
      一切発動しない（`coreApplyManaThresholdEffectsInner` の先頭）。
      「居ない」と「全滅した」は別物なので、体はあるのに生存0の時だけ止める。
      `_forceStopAllVfx()` からも `_resetManaEffectRun()` を呼び、出しっぱなしを断つ。
    - **同じカードを複数枚持つ時、矢が1本しか飛ばずダメージだけ2体に入っていた。**
      同じ発動回に同じキャラクターの発動が並ぶ場合、2件目を捨てていたのが原因
      （`presentManaThresholdEvent`）。**VFXは1体につき1つ、対象は足し合わせる**形にした。
    - **SEの音割れ**：追加したSEを音量1.0のまま鳴らしていた。素材の実測ラウドネス
      （200ms窓RMS）を測り、他と同じ目標（約-11dBFS）へ揃えた。
      K009=-2.9dBFS→.40、C008=-3.5→.42、K019=-3.0→.40 など。
      あわせて**同じ音を同時に鳴らす上限**（`SFX_SETTINGS.maxSameSound`＝2）を入れた。
      同じ波形が重なると振幅がそのまま足し算になり、1本では割れない音でも振り切れる。
    - 変更：`js/battle/core.js` `js/battle/present_events.js` `js/engine/render.js`
      `js/engine/battle.js` `js/engine/audio.js` `js/online/board.js`。`?v=` は **`contact04`**。
    - **未確認**：実機での見え方・聞こえ方は未確認。

18. 貫通を「絵が通った所に当たる」演出にし、同名カード複数枚の発動を直した。
    - **貫通は攻撃者から対象への角度のまま飛ばす。** 対象カードの手前から、その角度で
      後ろの敵を貫き画面外へ抜ける。当たったキャラクターの数値は、**絵がその位置を
      通り過ぎた瞬間**に出す（`playCurvedMissile` の `waypoints` →
      `api.onContactPass` → 受け口の `_awaitContactHold`）。
      **貫通だけがVFX依存。** 三方向攻撃・全体攻撃は同時に当たるので依存させない。
    - **接触演出の対象を、範囲攻撃ぶん（`targetIds`）と貫通ぶん（`pierceTargetIds`）に
      分けた。** 1つの配列にまとめていたため、三方向攻撃のVFXが貫通で巻き込んだ
      後衛にまで出ていた。
    - **同じマナ効果カードを複数枚持つと1枚ぶんしか発動しなかった。**
      `cost|repeat|desc` で重複を落としていたのが原因（炎の矢×2で1回だけ）。
      重複除去は「同じ配列を別の保持先へ複製している」場合のためのものなので、
      **保持先ごとに数えて一番多い保持先を採る**形に変えた。
    - **キーワードVFXに倍率が効いていなかった**（倍率の鍵を命中VFXとキャラVFXからしか
      取っていなかった）。毒＝K017・毒牙＝K003 を .5 に。
    - **毒牙などのキーワード演出を、矢の着弾の瞬間に1回ずつ出すようにした。**
      イベント順のまま出していたため、炎の矢を4本撃っても毒付与の演出は
      まとめて1回に見えていた（`presentEffectKeywordEvents`）。
    - **数値を短くするのは「同じ体へ続けて数値が出る」時だけ**にした（`gate.runMs` 側も）。
      前回は先読み（`runAheadMs`）だけ直しており、直前の束を見る側が残っていた。
    - アラクネのVFX倍率を **2**（.5から）。
    - **試験戦闘を途中で止めた時に、効果のSEが鳴り続けていた。**
      `stopAllSfx()`（audio.js）を追加し、中断時に必ず止める。
    - **試験戦闘の再開で止まる件**：実行中フラグに戦闘ID（`G._battlePhaseRunId`）を
      持たせ、**前の戦闘のフラグが残っていても新しい戦闘は進む**ようにした。
      あわせて `_exitTestBattle()` はフラグ解除を先頭で行い、`onBattleEnd()` が
      失敗しても後始末を最後まで通す（途中で抜けると以後の終了処理が全て素通りしていた）。
    - 変更：`js/battle/core.js` `js/battle/present.js` `js/battle/present_events.js`
      `js/engine/render.js` `js/engine/battle.js` `js/engine/audio.js` `js/online/board.js`。
      `?v=` は **`contact03`**。
    - **未確認**：実機での見え方は未確認。

17. 接触演出の大きさの決め方を直し、演出の二重発生と持ち越しを止めた。
    - **VFXの大きさは「画面に出る絵の幅」で決める。** 入れ物（host）はCSSで
      `width:460%` の絵を置くための箱でしかない。対象の矩形をそのまま入れ物にすると、
      対象の数や素材の縦横比で絵の大きさが変わる。貫通（K007＝137x1086）は
      縦に約8倍伸びるため、画面の高さを超えて**画面の下から現れたように見えていた**。
      `PRESENT_VFX_CSS_WIDTH_RATIO`（4.6）で入れ物の幅を逆算する。
    - つまみ：`PRESENT_CONTACT_PIERCE_WIDTH`（.55＝対象カード幅に対する絵の幅）／
      `PRESENT_CONTACT_TRI_WIDTH`（3＝対象3体の横幅に対する絵の幅）／
      `PRESENT_CONTACT_TRI_OFFSET_X`（-.2＝**絵の幅**に対する左へのずらし）。
      **ずらしの単位を「カード幅」にしていた時は、絵が桁違いに大きいため効かなかった。**
    - **キーワードNo.の対応表（`KW_NO_MAP`／state.js）が古かった。**
      毒が `K007` のままで、K007は現在**貫通**。毒ダメージで貫通のSEが鳴り、
      毒のVFX（K017）は出ていなかった。シートの現行No.へ更新した。
    - **内蔵CSV（`local_xlsx_data.js`）の keyword / item / ring / specialFx / textMessage が
      古かった**ので再生成した（`file://` の実機はこれを読む）。
    - **マナ効果の演出が二重・三重に出ていた。** マナ効果の合図がその効果のVFX/SEを
      出しているのに、`stat_change`（reason が `mana_threshold*`）でもカード本人の
      固有VFX/SEを出していた。`PRESENT_STAT_CHANGE_VFX_EXCLUDED` へ入れて止めた。
    - **効果のNo.が載っているダメージは、カード本人の演出にしない**
      （`presentDamageVfxSource` が `ev.effectNo` で弾く）。付けている強化カード
      （炎の矢）で起きたダメージまで本人の効果として鳴り、
      「関係ない場面でそのキャラクターのSEが鳴る」原因になっていた（アラクネ）。
    - **数値を短くするのは「同じ体へ続けて数値が出る」時だけ**にした
      （`presentDamageRunAheadMs`）。別の体へ移るだけで短くしていたため、
      全体ダメージの数値が一瞬で消えていた。
    - **攻撃効果は「少し動き出してから」発動させる対象に、マナ獲得とマナ効果も入れた。**
      `mana_gain` / `mana_threshold` を先出しモーションの判定に入れていなかったため、
      マナ生成のマナ増加も、それで発動する他キャラクターのマナ効果も、
      攻撃者が**全く動く前**に起きていた。
    - **中断された戦闘の演出を持ち越さないようにした**（`_resetManaEffectRun()`）。
      試験戦闘を途中で終えると効果固有VFXがループしたまま次の戦闘へ残っていた。
    - **試験戦闘を途中で終了すると、次の試験戦闘が前の盤面のまま止まっていた。**
      `battlePhase()` を `return` で抜けるだけで `G._battlePhaseRunning` が立ったままになり、
      `_advanceToBattlePhase()` のガードに弾かれていた。`_exitTestBattle()` で必ず降ろす。
    - 毒付与VFX（K003）を **.75**、炎の矢の発射間隔を **260ms**（反復時に2本が同時に
      出たように見えないように）。
    - 変更：`js/battle/present.js` `js/battle/present_events.js` `js/engine/render.js`
      `js/engine/battle.js` `js/engine/state.js` `js/online/board.js`
      `js/data/local_xlsx_data.js`。`?v=` は **`contact02`**（CSVは `sheet0904b`）。
    - **未確認**：実機での見え方は未確認。上のつまみで調整すること。

16. 攻撃範囲の接触演出（貫通・三方向攻撃・全体攻撃）を作り直した。
    - **貫通と三方向攻撃・全体攻撃を併用できるようにした。** 効果もVFXも両方出る
      （コア＝`withPierce()`／イベントは `mode` 1つではなく `modes` 配列）。
      片方だけを選んでいたため、三方向攻撃持ちの貫通が丸ごと消えていた。
    - **接触VFXとSEを「ぶつかった瞬間」に出すようにした。** コアが
      `attack_contact_vfx` を attack より**前**に出し、受け口が保留して
      攻撃モーションの `onContact` で鳴らす。以前は attack の後ろにあったため、
      モーションを再生し終えた＝キャラクターが戻ってから出ていた。
    - **接触VFXを await しないようにした。** 待っていたため、複数の敵に同時に入る
      はずのダメージ数値がVFXの尺のぶんずれていた。
    - **貫通VFXの向きを直した。** 対象カードの真上（攻撃者と反対側）から、
      攻撃者の角度に依存せず画面外までまっすぐ抜ける（上か下の2通りだけ）。
      敵の攻撃では下向きになるべきところが常に上向きで、画面下から現れていた。
      大きさは `PRESENT_CONTACT_PIERCE_SCALE`（.5→**1**＝2倍）。
    - **三方向攻撃VFXを更に左へ。** `PRESENT_CONTACT_TRI_OFFSET_X`（カード幅の比）
      が唯一のつまみ。現在 **-1.9**（＝対象列の左端から更に約1枚ぶん左）。
    - **全体攻撃・三方向攻撃で2回攻撃して見える件を直した。** 対象ごとに出る
      attack イベントのうち、効果の先出しモーションが**最初の1件**を掴んでいた。
      主対象が先頭とは限らないため、主対象ぶんのモーションがもう一度再生されていた。
      `attackVisual!==false` で絞る（PvE・オンラインの両方）。
    - **ゴーレムの負傷効果が「機能していない」件を直した。** シートのVFX/SE列が
      `S006` になり、`S006` が `assets.js` に未登録だったため、絵も音も出ず
      効果が起きていないように見えていた。S003/S006/S008 と K007-K009 を登録した。
    - **内蔵CSV（`local_xlsx_data.js`）が古く、VFX/SE列とマナ順位列を持っていなかった。**
      `file://` の実機はこれを読むので、両列の機能が丸ごと効かない状態だった。
      `card` / `enchant` を再生成した。
    - **賢者の指輪・マナの種の反復で、炎の矢が同じ敵を続けて狙わないようにした。**
      一続きの中で既に狙った敵を除いて抽選する（全員狙い終えたら選び直す）。
    - **炎の矢の飛行速度を50%にした**（`PRESENT_PROJECTILE_FLIGHT_MS` 224→**448**）。
    - 変更：`js/battle/core.js` `js/battle/present.js` `js/battle/present_events.js`
      `js/engine/battle.js` `js/engine/render.js` `js/engine/audio.js` `js/online/board.js`
      `assets.js` `js/data/local_xlsx_data.js`。`?v=` は **`contact01`**（CSVは `sheet0904`）。
    - 検査：balance_sim 5本／`online_payload`／`online_receivers` すべて NG 0。
      **`present_parity` / `anim_check` は未実施**（実測は指示された時だけ、の運用による）。
    - **未確認**：実機での見え方（位置・大きさ・向き・速さ）は未確認。上のつまみで調整すること。
    - **未解決**：マナ生成（攻撃：1マナを得る）が実機で効かないという報告は再現できていない。
      コアは `mana_gain` を出しマナも増える（node検証済み）、PvEの受け口も
      `G.mana` を進めて `_refreshManaDisplays()` を呼んでいる。盤面の情報待ち。

15. マナ効果でフリーズする件を直した。
    `playHitVfxAtRect()` で `effectHitVfx` を**宣言前に読んでいた**（TDZ）。
    参照エラーで演出が止まり、マナ効果SEだけ鳴って戦闘が進まなくなっていた。
    値を決める位置を宣言の後ろへ移した。`?v=` は **`fx0904`**。
    **教訓：`const` を宣言より前で読むと `typeof` ガードでも防げない。**
    ブロックの途中へ計算を差し込む時は、参照するものが上で宣言済みか必ず確認する。

14. S005/S007の演出を追加し、アラクネを画面演出にした。
    - `S005.webp/.wav` `S007.webp/.wav` を登録。シートの「VFX/SE」列で指定すれば出る。
      尺は `PRESENT_CARD_EFFECT_VFX_MS`（700ms＝ゴーレムの負傷エフェクトと同じ）に一本化した。
    - `playScreenBottomEffectVfx()`（render.js）を追加。アラクネ（C008）は
      画面の中心が頂点・画面の底辺が中心になる大きさで、画面へ1回だけ出す。
    - **`assets/vfx/C008.webp` が未配置**（`Hovl Studio_..._Meteors AOE_Side.webp` が
      それらしい名前で置かれている）。置くまでアラクネの演出は出ない。
    - `?v=` は **`fx0903`**。

13. 炎の矢を曲線軌道のミサイルにし、活性化の間の詰まりを直した。
    - `playCurvedMissile()`（render.js）を追加。三次ベジェ＋イージングで飛ばし、
      少し先と少し手前の点の差から進行方向を出して `<img>` を回転させる（素材は無加工）。
      5方向（左下→右上／左上→右下／右→左／近距離／遠距離）で実測：
      onHit 各1回、所要 799〜1025ms、弧の高さ 27〜113px、変形なし、
      pointer-events:none、再生後の残DOM 0。
    - **1回目と2回目の間が約1.1秒空いていた。** `_manaEffectCurrentCode` を立てた直後に
      既存の `_endManaEffectRun()` がそれを消しており、2回目が「別の効果」と誤判定されて
      マナ効果VFXの完了（約1秒）を待っていた。印を立てる場所をその後ろへ移した。
      実測：E045のSEが 1216→1367→1521→1672→1825→1977ms（一定150ms間隔）。
    - `PRESENT_EFFECT_HIT_OFFSET_Y`（-.14）で着弾VFXを少し上へ。
    - `?v=` は **`missile02`**。

12. 1回目と2回目の間が空く件を直した。
    間隔をマナ効果VFXの逆再生開始からではなく、**1回目を出した時刻から**測るようにした。
    あわせて `E058_2` の倍率を .6 → **1.2**（2倍）。`?v=` は **`asset0906`**。

11. 同じ効果を全発動ぶんまとめて処理するようにした。
    - コアは**1パスで「一番上の順位の効果」だけ**を撃ち、撃ち切ったら次の効果へ移る。
      活性化（順位1）×8 → 炎の矢（順位2）×8 の順になり、演出も交互にならない。
      撃ち切った効果を `fireQueue` から外すのを忘れると走査が途中で終わる（実際に一度そうなった）。
    - 着弾VFX（`E058_2.webp`）が出なかったのは、大きさの鍵を**枝番を落として**引いていたため
      矢と同じ倍率（.125）で描かれていたから。鍵を `E058_2` まで含め、倍率 .6 を登録した。
    - `?v=` は **`asset0905`**。

10. 効果の演出が重なる件を直した。
    - **繰り返し発動の経路だけ、直前の効果の演出を終わらせていなかった。**
      活性化の演出中に炎の矢の演出が重なる原因。`_manaEffectCurrentCode` を持ち、
      違う効果が来たらどの経路でも `_endManaEffectRun()` を通すようにした。
    - 炎の矢：VFXの大きさを半分（`E058` = .25 → **.125**）、
      着弾位置を `PRESENT_PROJECTILE_IMPACT_OFFSET_Y`（.18）だけ下げた。
    - 変更：`js/battle/present.js` `js/engine/battle.js` `js/engine/render.js`
      `js/online/board.js`。`?v=` は **`asset0904`**。

9. 素材の一斉改名への追随と、演出の指定方法を追加した。
   - 改名：`C001`→`S003`／`C003`→`S006`／`E045`→`S008`（webp・wav とも）、
     `K026.wav`→`K023.wav`（シートのNo.に一致）、`S002`→`K019`（封印解放）。
     **登録の鍵（効果の番号）は変えず、参照先のファイル名だけを差し替えた。**
   - 生贄奉納（旧S003）の専用素材は廃止。登録が無いので演出なしで状態だけ進む。
   - **戦闘中の召喚に登場演出を追加**（`playSummonAppearVfx`／render.js）。
     `S001.wav` と `S001.webp` を同時に始め、**逆再生開始でカードを出す**（生贄奉納の逆）。
   - **攻撃時のバフ効果は一律 `S005.webp`**（`PRESENT_ATTACK_BUFF_REASONS` /
     `presentStatChangeVfxCode`／present.js）。カードごとに別の絵が出ると何の効果か読めない。
   - **シートに「VFX/SE」列を追加**。個別カードの演出はこの番号で引く（`fxCode`）。
   - 変更：`assets.js` `js/engine/audio.js` `js/data/loader.js` `js/battle/core.js`
     `js/battle/present.js` `js/battle/present_events.js` `js/engine/battle.js`
     `js/engine/render.js` `js/online/board.js` `js/online/versus.js` `js/online/server_local.js`。
     `?v=` は **`asset0903`**。
   - **`assets/vfx/S001.webp` が未配置**（`S00X.webp` という名前で置かれている）。
     置くまで召喚の登場演出は出ず、カードは即座に出る。

8. 炎の矢が飛ばない件を直し、素材の名前変更に追随した。
   - **飛行時間が `NaN` だった。** `Number(undefined) ?? 既定` は `??` が null/undefined しか
     拾わないため **NaN のまま通る**。`setTimeout(fn, NaN)` は即時発火するので、
     矢が1フレームで消えていた。`Number.isFinite()` で判定するように直した。
     **`Number(x) ?? 既定` は書かないこと。**
   - 素材名の変更に追随：`C003.webp`→`S006.webp`（ゴーレム）、
     `E045.webp`→`S008.webp`（活性化）。倍率表は効果の番号と素材の番号の両方を登録する。
   - 大きさ：活性化はゴーレムと同じ `.5`、炎の矢は `.25`（素材が210x388に切り詰められたため）。
   - `anim_check` の素材名の直書きをやめ、`assets.js` の登録から引くようにした
     （素材名が変わるたびに検査が落ちていた）。
   - `assets/vfx/E058_2.webp` が配置されたので、着弾VFXも本来の素材で出る。
   - 変更：`assets.js` `js/battle/present.js` `js/engine/render.js` `tools/parity/anim_check.js`。
     `?v=` は **`arrow03`**。

7. 炎の矢を「対象へ飛ぶ矢」にした。
   - `playProjectileEffectVfx()`（render.js）を追加。発生元→対象へ `E058_1.webp` を飛ばし、
     着弾で消して `E058_2` と `E058_2.wav`、そして**ダメージ数値**を出す。
   - 発射は `PRESENT_PROJECTILE_STAGGER_MS`（90ms）ずつずらす。飛行は
     `PRESENT_PROJECTILE_FLIGHT_MS`（420ms）。数値は矢ごとの着弾時刻に出る。
   - `E058` の表示倍率を 2 → **1**（半分）にした。
   - 変更：`js/battle/present.js` `js/battle/present_events.js` `js/engine/battle.js`
     `js/engine/render.js` `js/online/board.js`。`?v=` は **`arrow01`**。
   - （`assets/vfx/E058_2.webp` はその後配置された。）

6. マナが増えた時に `S004.wav` を鳴らすようにした。
   `_refreshManaDisplays()`（battle.js）が唯一の実装で、**増えた時だけ**鳴らす。
   オンラインの `mana_gain` / `mana_set` もこの共通出口を通すようにした。
   `?v=` は **`manaSfx01`**。

5. 炎の矢のエフェクトが出ない件を直した。
   - 着弾：`E058_2.webp` が未配置のため専用素材だけを見に行って**何も出ていなかった**。
     `playHitVfxAtRect()` が読み込み失敗を拾い、通常の被弾VFXへ戻すようにした（警告も出す）。
   - 発生元：`E058` を `PRESENT_VFX_SCALE` へ 2 で登録（E045と同じ1920×1080で余白が多い）。
     等倍だと絵が小さく、出ていないように見える。
   - 効果VFXを**フェードイン**（180ms）で出すようにした（`playEffectVfxOnUnit`）。
   - 変更：`js/engine/render.js` `js/battle/present.js`。`?v=` は **`kwVfx03`**。
   - **`assets/vfx/E058_2.webp` は未配置のまま。** 置けばコード変更なしで着弾VFXに切り替わる。

4. キーワード演出の整理と、同一効果の同時発動を直した。
   - **同じ効果は順位に関係なく同時に見せる**（コアが効果ごとの最小順位でまとめ、
     再生側は同じ `wave` の間は拾い続ける）。順位で間に別効果が挟まると
     片方だけVFXが出て、もう片方が素通りしていた。
   - 結界喪失VFX＝`K018.webp`、毒付与＝`K003.webp`/`K003.wav`、
     毒ダメージSE＝`K017.wav` を追加。SEは絵と同じく `KW_NO_MAP` で引く
     （`getKeywordEffectSfxKey()`／鳴らすのは `playHitVfxAtRect()`）。
     廃止された `poison.wav` の参照を消した。
   - 炎の矢：発生元へ `E058_1.webp`＋`E058_1.wav`（マナ効果の共通経路）、
     着弾へ `E058_2.webp`＋`E058_2.wav`（damageイベントの `effectNo` で引く）。
   - `keyword_effect` の受け口をPvEにも追加（従来はオンラインだけが持っていた）。
   - 変更：`assets.js` `js/engine/audio.js` `js/battle/core.js` `js/battle/present.js`
     `js/battle/present_events.js` `js/engine/battle.js` `js/engine/render.js`
     `js/online/board.js`。`?v=` は **`kwVfx02`**。
   - **`assets/vfx/E058_2.webp` が未配置。** 置くまで着弾VFXは通常の被弾VFXのままになる
     （SEは鳴る）。
   - **未確認**：デバッグモードの試験戦闘での通し操作は未実施。

3. マナ効果の発動順を「マナ順位」列で決めるようにした。
   - 小さい順→同率は前衛左から右、続いて後衛左から右。空欄は最後。
     並べ替えは `coreApplyManaThresholdEffectsInner()` の `fireQueue`。
   - `E045.webp` の最低再生時間を `PRESENT_EFFECT_VFX_MIN_MS`（900ms）にした
     （発動1回だけの時に一瞬で消えていた）。
   - 変更：`js/data/loader.js` `js/battle/core.js` `js/battle/present.js` `js/engine/battle.js`
     `js/engine/render.js` `js/online/board.js` `js/online/versus.js` `js/online/server_local.js`
     `tools/parity/online_payload.js`。`?v=` は **`manaOrder01`**。
   - **未確認**：デバッグモードの試験戦闘での通し操作は未実施。

2. マナ効果の演出を「マナ効果VFX/SEは1回だけ → その後は効果固有のVFX/SEを回数ぶん」にした。
   - K023／K026 はその効果につき1回。逆再生開始から先は `E045.webp` を
     処理が終わるまで出し続け、`E045.wav` を発動回数ぶん鳴らす（`_playManaEffectPulse()`）。
   - `playSustainedEffectVfx()`（処理が終わるまでのループ）を `playEffectVfxOnUnit()` へ改名し、
     `durationMs` で1回ぶんの再生ができるようにした。
   - `E045.wav` を `Assets.sfx` と `SFX_SETTINGS.sounds` へ登録。引き当ては `getEffectSfxKey()`。
     固有素材が無い効果（サテュロスの「1マナ：3マナを得る」等）は繰り返しで何も出さない
     （K026で代用すると発動のたびにマナ効果SEが鳴る）。
   - 変更：`assets.js` `js/engine/audio.js` `js/engine/battle.js` `js/engine/render.js`
     `js/online/board.js`、`tools/parity/anim_check.js`、
     `tools/balance_sim/battle_event_regression.js`。`?v=` は **`vfxSeq05`**。
   - 実測（サテュロス+活性化／マータ+活性化、開始マナ5→8）：
     K026 は 963ms に1回、E045 は 1191/1345/1506/1665/1826/1985/2145/2306ms＝8回。
     固有VFXは常に2件（1キャラ1つ）で重ならず、ATKは a0/a1 が同じ瞬間に上がる。
   - E045が小さく見えたため、VFXの大きさを `PRESENT_VFX_SCALE`（present.js）へ集約し、
     `E045 = 2` を登録した（素材は1920×1080＝16:9で余白が多い）。
   - **未確認**：デバッグモードの試験戦闘での通し操作は未実施。大きさは実機で見て調整すること。

1. マナ効果の演出と表示を直した。
   - **戦闘中のマナカウントが動かない**：更新に呼んでいたのが `renderManaHud()` だけだったが、
     これは戦闘画面では非表示にして即 return する。数字を出しているのは `#battle-mana-value`＝
     `renderBattleCounters()`。`_refreshManaDisplays()`（両方を呼ぶ）へ一本化した。
   - **効果固有VFX（活性化＝E045）が出ない**：演出の区切りをキャラクター単位にしていたため、
     自前のマナ効果を持つキャラクターの2つ目の効果が「繰り返し」と誤判定されていた。**効果単位**へ変更。
   - **同じ効果が1体ずつ順に発動する**：コアが `wave`（発動回の通し番号）を載せ、
     同じ効果・同じ発動回のキャラクターをまとめて1回で見せるようにした。
   - **ギガンテスの負傷で味方にヒットエフェクト**：固有VFX素材の無いカードで
     `playHitVfxAtRect()` が通常の被弾VFXへ落ちていた。素材が無ければ何も再生しない。
   - **同種ダメージの連続で「-1」が1回に見える**：数値の尺が間隔と同じで消え際が次と重なっていた。
     間隔170ms／尺はその60%。
   - `index.html` の該当JSの `?v=` は **`vfxSeq04`**。
   - 検査：balance_sim 5本／`anim_check`／`online_payload` すべて NG 0。
     `present_parity` は下記の不安定項目を除き NG 0。
   - **未確認**：デバッグモードの試験戦闘での通し操作は未実施。

### 未コミットの作業

最後のコミットは `9dfc8d7`。**以降の作業は全て未コミット**（コミットは指示があるまで行わない）。
`js/battle/core.js` `js/battle/present.js` `js/battle/present_events.js` `js/engine/battle.js`
`js/engine/render.js` `js/engine/audio.js` `js/online/board.js` `js/online/versus.js`
`js/online/server_local.js` `js/data/loader.js` `js/data/local_xlsx_data.js`
`js/engine/main.js` `js/engine/reward.js` `assets.js` `index.html` と `tools/` 各種。
素材の追加：`assets/vfx/` と `assets/sfx/` の S00X・K00X・E058_X・C008（いずれも未コミット）。

xlsxは `prototype/Vesselbound_data.xlsx`（利用者管理）。**このファイルは触らないこと。**
内蔵CSV（`js/data/local_xlsx_data.js`）はここから再生成する側なので、こちらは更新してよい。

### 未解決

#### 直近の利用者報告（2026-09-04時点）

**16の作業で直した（実機未確認）**：三方向攻撃と貫通の併用／貫通VFXの向きと出現位置／
接触VFX・SEのタイミング／三方向攻撃VFXの横位置／攻撃効果持ちの2回攻撃／
複数対象のダメージ表示のずれ／ゴーレムの負傷効果／炎の矢の速度と重複狙い。

**残っている報告**：

1. 攻撃効果発動時の黄色い発光が見えないことがある。発光対象はキャラクターカードの外周だけ。
2. ~~**アラクネの効果が「アラクネ自身にだけ」出る形になった**~~ → 34で対応。
   マナ効果のバフは **S008 を対象全員の上**に出す（発生元のマナ効果の合図は
   カード自身の番号のまま＝別素材なので2重にならない）。

上記を直す際の確認順は、`core.js` のイベント生成 → `present.js` / `present_events.js` の規則 →
`render.js` の矩形・回転・CSS → PvE／オンライン両受け口、とする。実機で未確認のものは「修正済み」と報告しない。

1. **`loop_parity` のケース6が完走しない**（戦闘が終わらない）。ケース2にもHP不一致
   （ドラゴネット PvE=20 / core=17）。**どちらも変更前のコード（HEAD）で再現する。**原因のカードを特定すること。
2. **`present_parity` の「【薙ぎ払い】数値がカード外に出ない」が不安定**（同じコードで通ったり落ちたりする）。
   死亡した対象の数値が `_lastVisualRect`（詰める前の位置）を追い続けるため。今回の変更とは無関係。
3. **オンラインで味方が複数回連続攻撃することがある**（利用者報告）。イベント列600戦では再現せず。盤面の情報待ち。
4. **ハーピー（C010・衝撃3）に闇の炎を付けると死亡時に遅延する**（利用者報告）。未確認。
5. **闇の炎を複数持っても1回しか発動しない**（`coreApplyDeathEffects` が所持数ではなく
   `repeats`＝逆襲等の反復数でループしている）。仕様なのか不具合なのか要判断。**未修正。**
6. 同一手番内で死亡と次の攻撃が続く場合、詰めのタイミングの差で対象選択が入れ替わることがある
   （PvEは演出の後、コアは手番の終わりに詰めるため）。

### 未確認のまま残っている報告

ゴーストの死亡効果でダメージVFXが出る／オンラインで結界を失っても結界VFXが残る／
街を出て待機状態になった後、消えたボタンの反応が残る／マミーが敵位置で停止して戻らない／
スケルトンキングの戻り位置がずれる／レムレース・サキュバスで枠が緑になる
（**敵を仲間にした時・敵に変身した時に枠を変えないこと。敵枠は必ず同じものにする**）／
アラッサスの `super_magic.wav`／バジリスクのキーワード表示／アビス・バロンの∞表示／
`攻防一体` の効果文にカード名がキーワードとして書かれている（データ側の修正が要る）。

### 個別指示があるまで修正しない残課題

FLIP（人数減少時のカード移動演出）の詰め／召喚時のDOM同期・モーション同期／
召喚上限の実機拒否確認／デバッグ試験戦闘まわりの機能整備／全カード個別の実機目視確認。
