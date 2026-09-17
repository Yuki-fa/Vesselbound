# 作業手順・コード地図・リファクタリング

作業の進め方、主要ファイル、状態構造、コード分割、整理作業の制約を記録する。実装場所に迷ったとき、またはリファクタリング時に読むこと。

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
- **トリプル合体の演出中の合体先マス（2026-09-16）**：魔導板カードの子要素には `visibility:visible!important` を当てるルールがあるため、
  マスに `visibility:hidden` を付けるだけでは合体後の枠（*_m.svg）・裏地・売値が透けて見えた。演出中は状態で持ち、
  `renderHandEditor()` が描く時点から子要素と疑似要素を隠す（reward.js）。
- **開戦効果の表示の据え置き（2026-09-17、利用者報告：ボス戦で「死の体感＋闇の炎＋逆襲＋狂気＋炎の矢」の盤面）**：
  `_finishNewPanelBattleStartEffects()` は戦闘ループと同じく、開戦処理の前のATK/HPで表示を据え置き（`presentHoldShown`）、
  再生中フラグ（`presentBeginPlayback`）を立ててから `_flushCorePveHitEvents` を流す。無いと最初の数値が出た瞬間に最終HPへ飛ぶ。
  再生後は `renderAll()` ではなく `requestBattleCompact({forceRender:true})` で詰める（死んだ体をHP0のカードで描き直さない）。
  **遅延スナップショットの復元（`coreRestoreDeferredState`）は、スナップショットに無いキーを消す。** 表示専用のキー
  （`_display*`・`_deathFx*`）は `CORE_PRESENTATION_ONLY_KEYS` に入れて対象外にする。入れないと炎の矢の演出開始時に据え置きが外れ、
  倒れた敵がスナップショット時点のHPで描き直されて、後で一斉に消えていた。
  **遅延マナ走査はコアの計算状態を巻き戻さない（2026-09-17）**：以前は走査の最後に `coreRestoreDeferredState(state, scanBaseline)` で走査前へ戻しており、
  炎の矢で倒れた敵が生き返った盤面で続きの開戦効果が計算され、`death` の後に同じ体への `damage(hp5)` が出ていた（遅延の有無で結果が変わる＝オンラインと不一致）。
  今は計算状態を進めたままにし、`deferredBefore/deferredAfter` は表示用の情報だけにする。PvE再生側（battle_events.js）も状態を書き戻さず、マナの数字だけ `deferredAfter` の値で表示する。
  HP/ATK の表示は据え置き（presentHoldShown／presentAdvanceShown）で合わせる。検査：battle_event_regression.js に遅延あり／なしの一致と「死亡後のイベントなし」を追加。
  検証：scratch の `boss_repro.js`＋`boss_analyze.py`（1フレームごとに敵のHP表示・見え方・数値・VFXを記録し、急落・再出現・逆戻り・居残りを数える）。
- **登場VFXの時間（2026-09-17、利用者報告「やや大きい」）**：素材は着地直後が小さく明るい光で、後半は大きく薄い輪に広がる。
  700ms／1120msまで出すと輪まで見えて大きく見えたため、薄れ始め560ms・削除980msにした（推測による調整。撮影での比較はしていない）。
- **トリプル合体の演出中の合体先マス（2026-09-17 改訂）**：カード要素（`.card`）は**自分の背景に枠（`--card-frame`）を描く**ので、
  中身だけ隠す方式では合体後の枠だけが見えていた（右側のカードを覗く表示中は別ルールで上書きされ、検証で見逃した）。
  今は `G._tripleMergeHiddenIdx` のマスを `renderHandEditor()` が**空きマスとして描く**。立てるのは合体の後（合体前の3枚の複製を取った後）。
  見た目の確認は `right-card-peek` を外した通常状態でも撮ること。
- **マナ効果の「〜を得る」をキーワードとして拾う読み取り**（コアのマナ閾値の末尾）は、は／が／の／+ を含む語を拾わない。
  以前は活性化の「このキャラクターは+1/+1を得る」が謎のキーワードとして付いていた（利用者報告）。
- **ヴリコラカス**：「「青ヴリコラカス」以外のランダムな味方N体が復活を得る」を本文から読む（除外名は色＋名前、体数は合体で2）。
  復活を**得ただけ**では復活VFXを出さない（`presentKeywordEffectEvent`）。シート（xlsx）の文言は利用者が更新する。
- **終戦の永久強化（レプラコーン）**：PvE の終戦処理 `_applyCoreBattleEndEffectsLive()` はイベントを再生しないので、
  `persistent` の `stat_change` をその場で `persistBoardCharacterStats()` に書き込む（無いと魔導板に残らなかった）。
- **レムレースで呼び戻す体（2026-09-17）**：死亡時のスナップショットから、戦闘開始時から持つ効果（本体・強化カードの効果、マナ効果、キーワード、合体印）を引き継ぐ。
  毒・弱体・結界・死亡印などの戦闘中の状態は引き継がない。能力値は基礎値（`_baseAtk`/`_baseMaxHp`）の半分、合体効果（「半分にして」が無い文）は半分にしない。
  除外名は本文の「「X」以外の」から読む。**相手陣営で倒れた体を呼び戻した時は敵枠**。以前は名前・能力値・キーワードしか写しておらず、活性化の効果文が無いのに謎キーワードだけ残っていた。
- **攻撃中の召喚の位置（2026-09-17）**：攻撃動作中は並びを据え置き（holdLayout）、新しいカードも「前回の列の人数」を基準に置く（重なり防止）。
  ただし**その列に据え置き中の既存カードが無い時は新しい人数で置く**。後衛のエピトメが前衛へボスを召喚した時、前衛の旧人数0を基準にして半枚右へ出ていた。
- **復活時の結界（2026-09-17）**：キーワード「復活」・復活の指輪で蘇った体は、キーワードの結界を付け直して `shield_set` を出す（根性は対象外）。
  PvE の再生（battle_events.js）も `shield_set` を受けて表示を進める（以前は開戦の結界も最後の再描画まで出なかった）。
- **味方全体へのバフの発生元（2026-09-17）**：死亡・攻撃・結界喪失の観測で味方全体を強化する効果（ヴァンパイアロード・ゲルミール・ガルム・エインセル等）は、
  `stat_change.sourceId` を**効果を持つキャラ**にする（合図の光も発生元に1回）。受け取った味方を発生元にすると、表示側が味方ごとに別の効果とみなしてSEを人数ぶん鳴らし、同時再生の上限で落としていた。
  表示の「効果1回」の区切り（`presentBreaksEffectRun`）は attack／turn_begin／**death**。死亡ごとの発動は別の発動としてSE・VFXを出し直す。
- **同じSEの同時本数の上限（`maxSameSound`）**：上限に達した時は新しい音を捨てず、いちばん古い声を止めて鳴らす（本数は増やさない）。
- **ドラッグ中の報酬枠の矢印**：影を戻すルール（`body:is(.dragzone-…) #reward-offer-section #reward-offer-row .panel-dir`）より、暗いカード（`.cant`／`.reward-used-dim`）の矢印の暗転ルールの詳細度を上げている。
- **ゴールド不足の道具屋の商品**：`.cant` のカード背景 `var(--card-frame, var(--bg3))` はアイテム（`.item-visual`）に当てない（`--bg3` の青灰色が出る）。
- **鍛冶屋・道具屋の商品（.item-visual）のホバー発光と値段札（2026-09-17）**：枠線は箱の各辺から 5/189.5（2.64%）内側。
  箱の box-shadow では枠線より大きく、値段札も箱の右端だとはみ出す。道具屋は枠画像の ::before に drop-shadow、鍛冶屋（枠と図柄が1枚の絵）は空いている ::after を枠線位置の箱にして発光、値段札は right:2.64%。
  外側の box-shadow は要素の内側に描かれないので、spread を負にしても縁で途切れて暗い四角が残る（採らない）。
- **効果の発光（effect_flash）の保留**：次のVFXの入口で出す仕組みだが、`presentStatChangeEvent` でも能力変化を見せる瞬間に出す。
  同期の入口を通るVFXが無い効果（グレムリンの全体ATK-1）では、安全弁の700ms後まで光らなかった。
- **フレイの召喚**：「黒マッドキャット」はシートの能力値（2/3）で召喚する。以前は1/2の固定値で、説明文の「2/3の「黒マッドキャット」」と食い違っていた。
  旅の進捗のエリート／ボスのホバーも `_annotateSummonNames` を通して「〜を持つX/Xの」を付ける。
- **デバッグモードのボタン配置（2026-09-17、利用者指定）**：編成画面などの報酬画面は、右列が上から マップ確認(3277.028, 212.211)／エラー確認(368.474)／ミュート(524.737)、左列が ゲームオーバー確認(2749, 368.474)／試験戦闘(524.737)。
  ミュートは報酬画面ではマップ確認と同じ青い大ボタンで「ミュート／ミュート解除」、それ以外（戦闘中・街）はオプションの直下のアイコンボタン。
  マップ画面の「終了」はマップ確認と同じ見た目・同じ位置。「編成」（戦闘・街）はカード非表示と同じ見た目でオプションボタンの左（3384, 90、262×62）。
- **ボタン発光の矩形化（2026-09-17、利用者報告・再発防止）**：ミュート／編成ボタンなどのホバーで、ボタン下に四角い発光・影が出たことがある。原因になりやすい`.btn:hover`の本体`box-shadow`／半透明矩形背景を発光と混同しないこと。本体のホバー影だけを無効化し、枠発光は`#board-card-visibility-btn::before`の外周線専用ルールを共有する。`button_invisible.svg`全体へ発光フィルタを掛けたり、別形状の手書きパスを追加したりしない。修正後は四隅・ボタン下の矩形・カード非表示ボタンとの発光強度を確認する。
- **【未着手・2026-09-17 利用者指定の残作業】**（次のセッションで対応する。最終コミットは 3e28800）
  1. デバッグカード一覧（`#debug-card-palette .debug-palette-list`、index.html 5488 付近 `overflow:auto`）の右端にスクロールバーを出さない（`scrollbar-width:none`＋`::-webkit-scrollbar{display:none}`、スクロール自体は残す）。
  2. ミュート（`#battle-mute-btn`・`#village-mute-btn`）を編成ボタンと同じ見た目（262×62・button_invisible.svg・Shippori Mincho 24px 700）にし、**オプションボタンと編成ボタンの間**に置く（右から オプション→ミュート(3384,90)→編成(3102,90)、間隔20px）。**街・戦闘・編成画面すべてで表示**。文言「ミュート／ミュート解除」。報酬画面の青い大ボタン版ミュートは廃止。
  3. 報酬画面に青い大ボタン「ライフ+」「ライフ-」を新設（押すとライフ ±1、**1〜3の範囲**。`G._waveLife`／`_currentBattleLife()`、押した後にハート表示を更新）。
  4. 報酬画面の青い大ボタンを3行に：ゲームオーバー確認(2749,212.211)／マップ確認(3277.028,212.211)、試験戦闘(2749,368.474)／エラー確認(3277.028,368.474)、ライフ+(2749,524.737)／ライフ-(3277.028,524.737)。
  5. デバッグモード開始時の所持金を通常と同じにする（main.js 1347 `G.gold=100000;` を削除。通常の初期値は state.js の gold:100）。
  6. 鍛冶屋・道具屋の商品の値段札（`...rew-card.item-visual.item-visual > .shop-buy-price{right:2.64%}`）が枠線の上に重なっている。枠線は 189.5 基準で外側5・内側6.8（2.64%〜3.59%）なので、札を枠線の内側（right 3.59%＋1〜2px、上辺も重なるなら下げる）へ入れる。
  **注意（作業途中の状態）**：上の1〜6は Codex が途中まで実装した**未コミット・未検証**の変更が作業ツリーに残っている
  （index.html・js/engine/main.js・audio.js・map.js。`#btn-debug-life-plus`／`#btn-debug-life-minus`＋`debugAdjustLife(delta)`（1〜3に丸めて `updateHUD()`）、
  ミュートの文言「ミュート／ミュート解除」と固定配置、報酬画面の大ボタン版ミュートの廃止、`G.gold=100000` の削除、デバッグカード一覧のスクロールバー非表示など）。
  値段札（6）が入っているかは未確認。**`git diff` で中身を確認し、撮影（編成画面・街・戦闘・マップ・道具屋・鍛冶屋）で検証してからコミットすること。**
  7. **未解決**：「黄金の瞳 フレイ」（攻撃：黒マッドキャットを召喚）が再戦でマッドキャットを出さなかった（1戦目は出た）。ヘッドレスの再戦再現では召喚された。利用者にフレイの前衛／後衛・敵前衛の数（7体で満杯だと召喚拒否）・盤面変更の有無を確認中。
- **長いSEと戦闘SEの上限**：`combat` グループは `maxPlayMs:600` で止める。攻撃範囲の音（K007貫通／K008三方向／K009全体、3.7〜4.5秒）は
  途中で切れていたため、audio.js の各音に `maxPlayMs:0` を付けて外している。combat に長い音を足す時は同様にする。
- **合体後の効果文の体数**：ダイアウルフの合体後は「「緑ウルフ」を2体召喚する」。コアの正規表現が体数を読まず、マナ効果だけ出て召喚0体だった。
  合体効果列を足したら、コアの文の読み取りが合体後の表現（N体・数値違い）に対応しているか確かめる。
- **施設からの試験戦闘の戻り（2026-09-16）**：試験戦闘の `onBattleEnd()` は `_rewCards` を戦闘報酬に置き換える。
  図書館以外でも `startTestBattle()` が施設フラグ・品揃え・ゴールド等を `G._testBattleReturnState` に控え、
  `_exitTestBattle()` が戻してから `goToReward({restoreCheckpoint:true})` で描き直す。控えないと道具屋に戦闘報酬（アイテム枠のカード）が並ぶ。
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
    battle_events.js     — PvEで共通コアのイベント列をGと演出へ反映する受け口
    render.js            — renderAll(), mkCardEl(), computeDesc()
    reward.js            — goToReward(), renderRewCards(), renderHandEditor(), エンチャントモーダル
    reward_items.js      — アイテム表示・使用・対象選択
    reward_journey.js    — 「旅の進捗」の描画・現在地判定・デバッグ移動
    map.js               — 現行の進捗ルート表示と街・塔・各施設
    main.js              — showScreen(), updateHUD(), log(), startGame(), gameOver()
tools/
  balance_sim/offline_online_regression.js — オフライン／オンライン共通コアの回帰検査
  balance_sim/card_core_smoke.js           — 現行カード／強化データのコア適用スモーク検査
```

### スクリプトロード順（index.html）

実際の順序：

`assets.js` → `audio.js` → `constants.js` → `data/floors.js` → `data/events.js` → `local_xlsx_data.js` → （CDN: xlsx.js） → `loader.js` → `units.js` → `battle/core.js` → `online/*.js` → `state.js` → `pool.js` → `enemy.js` → `battle.js` → `battle_events.js` → `render.js` → `reward_items.js` → `reward_journey.js` → `reward.js` → `map.js` → `main.js`

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

### カード枠の外周線と角R — `assets.js` / `index.html`

カードの外周には常に **1px の #c49a6c（`m_board6.svg` と同色）** の線を引く（報酬・戦闘・魔導板すべて）。
線は CSS の `border` で描くので、**枠画像の角Rと同じ半径を `border-radius` に入れないと角だけ二重線になる。**

角Rは枠画像ごとに違い、絵を差し替えれば変わる（`summon_frame1` は 712×1079 で29px、
他の7枚は 708×1075 で40px）。そのため **CSS に固定値を書かない**。

- `applyFrameRadiusKey()`（assets.js）が枠画像のアルファから角Rを実測する。
  角丸長方形なので、上辺で最初に不透明になる x が横半径、左辺で最初に不透明になる y が縦半径。
  しきい値は **アルファ128＝見た目の輪郭**。枠画像は箱いっぱいに伸ばすので半径は％で持つ。
- 結果は要素の inline style ではなく `<style id="card-frame-radius-css">` へ流し込み、
  カード側には `data-frame-key`（画像のファイル名）だけを付ける。
  測定は画像読み込み待ちで非同期なため、**先に描画されたカードにも後から効かせる必要がある**。
- CSS 側は `border-radius:var(--card-frame-r, 5.65% / 3.72%)`。既定値は測定前と
  canvas が読めない環境（`file://` は汚染されて `getImageData` が失敗する）用の保険。
- ドラッグゴーストは `cloneNode(true)` なので `data-frame-key` ごと複製され、半径も一致する。

**枠画像を差し替えても、コードもCSSも直す必要はない**（実測が追随する）。

**魔導板のマスの角Rも同じ値に揃えてある。**
マスには「カードの枠の絵」「マスの背景（`m_board1〜6.svg`）」「マスの外周線（`m_board_frame.svg`）」の
3つの角丸が重なるため、**1つでも半径が違うと角に二重線と隙間が出る。**
- CSS 側の角丸は全て `border-radius:var(--card-frame-r,5.65% / 3.721%)`（22箇所）。
- SVG 側の `rx`/`ry` は **14.7**（＝260×395の箱で 5.65% / 3.721%）。
  **枠画像の角Rを変えたら、この7つのSVGの `rx`/`ry` も同じ値へ直すこと。**
  `python3 -c` でアルファを測った値 × カードの箱の大きさ、で求められる。
- **特殊マスの太い線は「外へ1px・内へ3px」の4px**（`[-1px,+3px]`）。元は5pxすべてが内側だった。
  **この線はCSSではなく `reward.js` が空きマスへインラインの `!important` で書き込む**
  （`outline:4px` / `outline-offset:-3px` / `box-shadow:inset 0 0 0 3px + 0 0 0 1px`）。
  インライン!importantはどのセレクタよりも強いので、**CSSだけ直しても見た目は変わらない。**
  同じ寸法を `index.html`（マス目変更演出）と `map.js`（図書館チュートリアルの発光）も持つので、
  太さを変える時は**3か所すべて**を揃えること。

### 報酬カード／魔導板カードの黒背面と暗転

報酬カードと魔導板カードは、カード本体の最背面へ黒塗りの `m_board6.svg` を常時置く。
`.card-back-layer` だけに依存せず、カードルートにも `#000 url(m_board6.svg)` を指定し、
背面は**いかなる状態でも不透明**にする。カードルート全体へ `opacity` を掛けると背景が透けるため禁止。

- 報酬カードの暗転状態は `.cant` と `.reward-used-dim`。専用の
  `.reward-card-dim-layer`（黒50%、`z-index:10000`）を、カード絵・枠画像・`stat_overlay.png`・
  ATK/HP・プログラム枠線の上へ置く。資金不足表示は `z-index:10002` で暗転より上に残す。
- arrow はカード外へはみ出すため、カード内でクリップされる暗転レイヤーだけでは先端を暗くできない。
  暗い報酬カードでは arrow を `z-index:10001` に置き、arrow 自体へ `brightness(.5)` を掛ける。
  暗転レイヤーの下へ入れないこと（はみ出した先端だけ明るくなる）。
- 魔導板の出撃不可カードも同じ黒背面を使い、暗転は `brightness(.5)` のみで行う。
  `saturate()` を併用すると報酬カードと色味が変わるため使わない。
- ドラッグ中は、持ち上げている暗い魔導板カードだけを明るくし、他の暗い魔導板カードは暗いままにする。
  報酬カードはドラッグ開始前の明暗をカード単位で維持する。ドラッグ中という理由で
  報酬枠の子要素へ一括 `opacity` / `filter` を掛けてはいけない。
- 暗い報酬カードの枠線もカード本体と同じく暗くする。枠線だけを明るく残す指定を追加しない。

この重なり順とドラッグ時の状態は `tools/parity/board_drag_visual_check.js` で検査する。
黒背面の不透明性、暗転レイヤー、`stat_overlay.png`、枠線、arrow、ホバー時の発光を
個別に実測しているため、関連CSSを触ったらこの検査を通すこと。

### 商店の売却UIとアイテム／指輪の固定ホバー

売却・還魂ボタンは `assets/ui/button_invisible_s.svg` を**元サイズの132×62pxのまま**使う。
9スライスや疑似要素で枠を描き直してはいけない。発光は透明部分を含む矩形ではなく、
実際のSVG要素へフィルターを掛けてアルファ形状に沿わせる。

- カードの売却・還魂ボタン：カード上辺から230px下をボタン上辺にする。
- アイテムの売却ボタン：アイテム枠の下線中央に置く（`top:calc(100% - 31px)`）。
- どちらも対象へホバーしている時だけ表示する。
- 価格は `assets/ui/cost.svg` を元サイズの101×46pxで右端揃えにする。
- カード価格の重なり順は**枠画像（100）＜価格（105）＜プログラム描画の枠線（110）**。
  `.shop-pending-sale-ui` 自体に高い stacking context を作らない（`z-index:auto`）。
- アイテム／指輪の価格は `top:34px`。売却ボタンの高さへ移動させない。

アイテム／指輪のクリックでは別ウインドウを作らず、表示中の `#kw-tooltip` をその場で固定する。
固定前の `innerHTML`・`className`・`left`・`top`・実測幅を保存し、末尾へ
`.reward-action-buttons` だけを追加する。固定開始前に `_closeItemUseConfirm()` を呼ぶと、
元の色・位置・内容を失うので禁止。指輪用の `_showRewardRingTooltip()`／
`_moveRewardRingTooltip()`／`_hideRewardRingTooltip()` は
`dataset.rewardLocked==='1'` の間は位置や表示を変更しない。閉じる時は固定印と幅指定を解除する。

アイテム使用待ちの解除は `_cancelPendingItemUse()` を唯一の出口にする。
右クリックは `pointerdown(button===2)` と `contextmenu` の双方で解除し、カード非表示操作へ伝播させない。
左クリックも、`#hand-slots.board-slots > .card` と `.item-use-cancel-btn` の外なら解除する。

### セーブに何を入れるか — `js/save/`

**オフラインの状態を `G` へ足したら、必ず `run_save.js` の `fields` にも名前を足すこと。**
（意図的な除外に当てはまる場合を除く。除外の4つは下の表）

`fields` は手書きの許可リストで、**ここに無い名前は保存されない。しかも何のエラーも出ない。**
再開したときだけ `initState()` の初期値へ静かに巻き戻る形で表面化する。
逆に入れてはいけないものを入れると `copy()` が保存時に例外を投げる
（関数・DOM・クラスのインスタンス・Infinity/NaN）＝その場で気づける。
**入れ忘れは静かに壊れ、入れ間違いは即座に落ちる。だから迷ったら入れる。**

**名前を足すのは後方互換**（古いセーブはその名前を持たないまま初期値で復元される）。
**名前を消す／グループを移すのは非互換**（`validate()` が古いセーブを
「未定義の状態です」で弾く）。どうしても要るときは `migrations.js` にステップを足す。

| 入れないもの | 例 | 理由 |
|---|---|---|
| `Set` は `fields` ではなく **`setFields`** へ | `_usedNamedElite` `_seenRarity3` | `fields` に入れると配列化されたまま復元され `.has()` が壊れる |
| 戦闘中の一時状態 | `allies` `enemies` `phase` `turn` `battleCounters` | `pendingBattle` のイベント列から復元するため、二重に持つと食い違う |
| 画面の開閉・選択状態 | `inventoryOpen` `_selectedBoardUnitIdx` `_showFacilities` | 再開時に前回のUI状態が復活してしまう |
| モード判定 | `_debugMode` `_onlineMode` `_savePresentation` | 起動時に決まる。保存すると再開でモードが混ざる |

`_runId` `_runSeed` `_runRngState` `questProgress` `difficulty` は `fields` ではなく
`serializeRunState()` が個別に書き出している（すでに保存済み。二重に足さないこと）。

**コレクション（`profile_save.js`）は自動。**
`identity()` がシートのNo.列からIDを組み立てて `cards`／`items`／`rings` に振り分けるので、
カード・アイテム・指輪を足すだけで発見・取得が記録される。コードを足す必要は無い。
例外は、No.が英字＋数字の形式でない場合（IDにならず記録から漏れる）と、
この3つ以外の**新しい収集カテゴリ**を作る場合だけ。

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

## 8. リファクタリング（codexへの指示）

**この節は「まとめて整理する」作業のための指示。** 機能追加・不具合修正のついでに
やらないこと（差分が混ざると、壊れた時に原因を切り分けられない）。

### 8-0. 絶対に変えてはいけないもの

1. **`AGENTS.md` と `ONLINE.md` の共通化構造**。コア（`js/battle/core.js`）＝ルール、
   `present.js`／`present_events.js`＝見せ方、`js/engine/battle.js`／`js/online/board.js`＝受け口。
   **この4層の境界を越えて処理を移さない。**
2. **シート駆動**。文言・数値・効果文をコードへ戻さない（`DATA_TEXT.md` と `ONLINE.md` 参照）。
3. **グローバル関数のまま**にする。ESモジュール化・バンドラ導入は禁止
   （`file://` で開ける前提と、`index.html` のスクリプト読み込み順に依存している）。
4. **見た目の数値**（座標・サイズ・尺）を「整理のついで」に変えない。
   変えるなら実測して報告する。

### 8-1. 消してよいと確認済みのもの（到達解析・実機で確認済み）

| 対象 | 状況 |
| --- | --- |
| `_shopSalePending` 一式（`js/engine/reward.js` 13箇所） | 魔導店の商品枠へ魔導板のカードを置く機能。**確認ダイアログは廃止済み。** ただし `_canReturnDragSrcToRewardArea()` が魔導店を弾いていないため経路だけ残っている。**「置けなくする」か「一式消す」かを決めてから**手を付ける |

**消す前に必ず到達解析をやり直すこと**（他セッションが参照を足している可能性がある）。
関数ごとに「外部ファイル＋トップレベルから辿れるか」を見る方法で、
`js/engine/map.js` では到達不能13関数を見つけて消した実績がある。

### 8-2. CSS（`index.html` 13,900行・`!important` 5,481箇所）

**症状**：同じ要素の同じプロパティに、同じ強さのルールが複数ある。
後勝ちで決まるため、詳細度を上げるハックが必要になりやすい。

**やること（この順で）**：

1. 同じセレクタ・同じプロパティの重複ルールを1つにまとめる。
   整理済みの実例：`.reward-prod-quest .reward-prod-quest-body` と
   `.item-use-picking` の競合。今後も同じ方法で小さく進める。
2. まとめ終わってから、詳細度稼ぎの二重クラスを1つに戻す。
3. **実効値が変わっていないことを実機で確認する。**
   `getComputedStyle()` で整理前後の値を比べること（見た目の目視だけでは足りない）。

**まとめては**いけないもの：`:is(#reward-move-btns,#reward-offer-section)` のように
**意図して対象を広げた**セレクタ（報酬枠の中に「元に戻す」と同じボタンを置くため）。

**やってはいけない順序（実際に壊した例）**：重複を残したまま**二重書きだけ先に外す**と、
後方の同じ強さのルールに後勝ちで負けて機能が壊れる。
アイテム使用中の `#reward-offer-section{z-index:9001}` と `#battle-options-btn{z-index:9001}` を
単一クラスへ戻したところ、後方の
`html body.reward-screen-active #reward-offer-section{z-index:10!important}` と
`#reward-production-ui` 等をまとめた `z-index:2!important` に負け、
**報酬枠が暗転の下へ沈み、キャンセルも押せなくなった。**
`.item-use-picking.item-use-picking` にはその旨をCSSのコメントで書いてある。
**コメントごと消さないこと。**

**もう一つの落とし穴**：広い `filter:none!important`（`#hand-pane *` など）は、
より詳細度の低い状態クラス（`.item-target-disabled` の暗転）を巻き添えで消す。
`*:not(.item-target-disabled)` のように除外するか、後ろで打ち消し直すこと。
**「クラスは付いているのに見た目が変わらない」時はこれを疑う。**

### 8-3. ファイル分割

`js/engine/battle.js` と `js/engine/reward.js` はまだ大きい。
分ける場合は**役割で**分け、グローバル関数のまま `index.html` へ読み込み順に足す。

- `battle_events.js` … 「コアのイベントを受けてGと演出へ反映する受け口」を分離済み
- `battle.js` … 「戦闘開始・終了の段取り」と残るPvE進行
- `reward_items.js` … 「アイテムの表示・使用・対象選択」を分離済み
- `reward_journey.js` … 「旅の進捗」を分離済み
- `reward.js` … 「報酬・店の画面」と「魔導板の編集」

**分割は1ファイルずつ、検査を通しながら**行う。まとめて動かすと切り分けができない。

### 8-4. `?v=` の手動更新

`index.html` の `<script src=...?v=>` を毎回手で書き換えている（30箇所以上）。
1箇所で持つ仕組みにしたいが、**`file://` で開ける前提を壊さないこと**。

### 8-5. 終わったら

- `TESTING.md` の該当検査7本＋セーブ3本（1本ずつ）を通す
- 実機（`http://127.0.0.1:5500/index.html`）で
  **編成 → 魔導店 → 祭壇 → 戦闘 → 報酬**を一周し、コンソールにエラーが出ないことを見る
- 消した関数・まとめたルールの一覧を報告する（何が無くなったか分かるように）

---
