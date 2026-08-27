すべての思考・回答・コメントは日本語で行うこと。

# AGENTS.md

このファイルは、このリポジトリ内のコードを扱う際のガイダンスを提供します。
ユーザーは高速な試作検証を重視している。
「完全性」より「短時間で試せる状態」を優先すること。

## 現在の状態（最新セッション終了時点）

### 履歴の記述ルール

- 直前の履歴を記述したのが自分（今回の会話セッション）でない場合、今回の作業完了後に履歴を全て消し、新規に1件から書き始める。
- 直前の履歴を記述したのが自分（今回の会話セッション）である場合、履歴は消さずに書き足す（目安3〜5行を維持）。
- 「自分が書いたか」は会話セッション内の記憶で判断する。内容に見覚えがなければ他セッション／ユーザー本人による記述とみなす。
- 【今回：ドラッグ発光・図書館試験戦闘】`dragzone-*`のbody付与を停止し、実ドロップ後の魔導板暗転再計算と4-2/5-2移動先発光を再付与。図書館試験戦闘の勝利BGM維持・開始字幕を修正。構文チェック・差分空白チェックは通過、実機ブラウザ確認は未実施。

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
```

### スクリプトロード順（index.html）

実際の順序：

`assets.js` → `audio.js` → `constants.js` → `data/floors.js` → `data/events.js` → `local_xlsx_data.js` → （CDN: xlsx.js） → `loader.js` → `units.js` → `state.js` → `pool.js` → `enemy.js` → `battle.js` → `render.js` → `reward.js` → `map.js` → `move.js` → `main.js`

関数本体内の参照はロード順に依存しないが、トップレベルの変数宣言は宣言順に解決されるため、この順序を維持すること。

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
