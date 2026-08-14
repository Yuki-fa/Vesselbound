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

- 【街（村）システム一式を実装】`#scr-village`（街専用画面）／道具屋／ワールドマップ画面`#scr-map`を新設し、`Vesselbound_data.xlsx`の「地域情報」「テキストメッセージ」シートを読み込むようにした。主要な構成：`openMapVillage()`（map.js）が街画面を出す（`goToReward()`を通さないのでmenu_open.wavは鳴らない）／施設は`VILLAGE_FACILITY_DEFS`＋シートの「街の施設」列で決まり、押すと既存の編成画面（`#scr-battle`上の報酬UI）を`openMapShop()`/`openMapForge()`/`openMapItemShop()`で開く／左上ラベルは`G._facilityLabel`（シートの施設名そのまま）を`_syncRewardTitleLabel()`が差し替える。道具屋は購入＝レアリティ×180・売却＝レアリティ×45で、既存のショップ機構（`G._isShop`）に`G._isItemShop`で相乗りしている。宿屋は500Gでライフ+1、`G._waveInnUsed[wave]`で1つの街1回。ショップ／鍛冶屋／道具屋／宿屋のみ押下時に`playSfxAwait('knock')`で鳴り終わりを待ってからshop_in.wav＋画面遷移（広場・酒場は無音）。
- 【調べ直すと時間を食う要点（重要）】①**シートの表記揺れ**：鍛冶屋／鍛治屋、魔導店／魔道店、旧称ショップが混在するため`villageFacilityNameVariants()`（map.js）で一括吸収している。施設名を追加する時はここも見ること。②**file://運用**：`fetch('./Vesselbound_data.xlsx')`はfile://では失敗し`js/data/local_xlsx_data.js`（埋め込みCSV）が使われる。**シートを更新したらこのファイルの再生成が必要**（xlsxから`region`/`textMessage`等を書き出す）。③**編成画面のCSSは非常に多層**で、同じ要素に十数個の`!important`ルールが積まれている。位置や見た目を合わせる時は必ず`getComputedStyle`で実測して既存要素と突き合わせること（例：オプションボタンの発光は`back_light.svg`ではなく`button_option.svg`の輪郭＋`scale(1.03)`＋`brightness(2.1)`が正解だった）。④編成画面は`html body.reward-screen-active *`に明朝体の`!important`があるため、別画面で同じボタンを作るとフォントだけ違って文字位置がずれる。⑤`#scr-gameover.gameover-overlay-active`は`inset:0`だとビューポート基準になり、上下中央に置かれるゲームキャンバス（`--game-offset-y`）とずれる。他画面と同じ`left/top:var(--game-offset-*)`に揃えること。⑥「出発する」など編成画面と同一の見た目が要るボタンは、`#reward-move-btns`の全CSSルール（69件）を`#village-move-btns`＋`body.village-screen-active`へ機械的に複製した自動複製ブロック（`</style>`直前）で共有している。編成画面側のボタンCSSを触ったらこのブロックの再生成が必要。
- 【演出・BGM】街への入場演出`_playVillageEnterIntro()`：黒フェード→背景を放射グラデーションのマスク（`mask-size`を0→420%）で中央から滑らかにフェードイン→途中で地域名（2段組み・白＋ドロップシャドウ）＋`battle_line.svg`を表示、同時にboom.wav→消えてから他要素をフェードイン。演出中は`.village-facility`が`pointer-events:auto`を持つため、CSSとJS（`G._villageIntroPlaying`）の両方でクリックを止めている。街BGMは`VILLAGE_BGM`（ステージ1＝village_forest.wav・81秒から）で、`G._villageBgmActive`が立っている間は`goToReward()`/`showScreen()`がBGMを触らない（＝店に入ってもmenu.wavへ切り替わらない）。`playBgm()`の`opts.startTime`は初回のみで、2周目以降は曲の頭から。ワールドマップは`WORLD_MAP_LINES`（`ui/map_line/*.svg`を左上合わせのpx座標で配置）を`worldMapActiveLine(wave,stage)=(wave-1)*2+(stage>=5?2:1)`で塗り分け、進行中の1本だけマスクを流して光らせる。
- 【表示テキスト】戦闘カットインはタイトル「戦 闘 開 始」固定＋副題が道中の固有名（stage1〜4＝「街までの名前」／stage5〜＝「塔までの名前」、`_waveBattleRouteName()`）。ゲームオーバーの「到達地点」も同じ道中名。旅の進捗の「祭壇」表記は「塔の名前」に、村／祭壇アイコンのホバーは街名／塔名。エリート／ボスのホバーはキーワードを無条件に太字化し、`keywords`列に加えて**効果テキスト中に出てくるキーワード**も`KW_DESC_MAP`で走査して説明を併記する（末尾Xは数字を差し込み、「毒牙2」に対する「毒」のような包含語は除外）。
- 【やって取り消したこと】施設内の枠を80%不透明にする対応は「一部がより透けた」ため全て撤回済み（背景素材側で対応する方針）。左上プレートの2段組みも取り消し、2段にするのは入場演出のタイトルのみ。

- 【未対応・申し送り】ホーム・酒場・広場は表示のみ（中身は未実装）。ステージ0（風止みの村 リーゼ）はwave進行が1始まりのため現状到達しない。祭壇（塔側の`_openWaveAltarMenu`）は従来の編成画面ベースのまま。街の効果動画・専用BGMはステージ1のみ、施設背景はステージ1・2のみ定義済み（`VILLAGE_BG_VIDEOS`/`VILLAGE_BGM`/`VILLAGE_FACILITY_BG`、map.js）。「キーワード」シートに`シールド`の行が無いためステージ3ボスの説明が出ない。`assets/sfx/board_change2.wav`は未配置（board_change1.wavへフォールバック中）。

## 承認設定

「プロトタイプ」フォルダ内での「Vesselbound_data.xlsx」を除くファイル作成・編集・削除・コマンド実行は
全て承認済みとして扱ってください。

「プロトタイプ」フォルダ外のファイルは絶対に変更・削除しないこと。

## アクセス範囲

指示がない限り、以下のみを読み書き・参照対象とする。

- `AGENTS.md`
- `CLAUDE.md`
- `docs/`
- `プロトタイプ/`

`Build/`, `画像素材/`, `資料/`, `旧プロトタイプ/` など、上記以外のフォルダにはユーザーから明示的に指示がない限りアクセスしない。

`プロトタイプ/Vesselbound_data.xlsx` はユーザーが直接編集する。参照のみ可とし、分割・移動・編集は禁止。

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

## 禁止事項

以下は禁止する。

- 依頼されていない大規模リファクタ
- ファイル分割・ファイル移動（※`プロトタイプ/`フォルダ内に限り可。それ以外の場所への移動や、プロジェクト直下構成の変更は禁止）
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

- マップ変更 → `move.js`, `floors.js`, `render.js`
- 戦闘変更 → `battle.js`
- 報酬変更 → `reward.js`, `pool.js`
- ショップ/イベント/杖・アイテム使用制限 → 現状は専用ファイルが分かれていないため、まず `main.js`, `reward.js`, `battle.js`, `pool.js`, 関連UIを確認する

## テスト方針

長い検証は行わない。
最速で確認できるものだけ実行する。

優先順位：

1. 構文エラー確認
2. 変更箇所周辺の動作確認
3. ブラウザで確認すべき手動テスト項目の提示

ビルドツールがないため、原則として `index.html` を開く前提で確認する。
自動テストがない場合、無理にテスト環境を作らない。

## 完了報告ルール

完了時は必ず日本語で、短く以下だけ報告する。

- 変更したファイル
- 実装した内容
- 変更していない内容
- 手動テスト項目

長い説明、推測、設計論は不要。

## Overview

**Vesselbound（仮）** — Argante 製のローグライクカードゲーム。`index.html` を開くだけで動作するシングルファイル構成（ビルドツールなし、`file://` プロトコル対応）。JavaScript はすべてグローバルスコープ。

実体は本リポジトリ直下ではなく **`プロトタイプ/`** ディレクトリ配下にある（`プロトタイプ/index.html`, `プロトタイプ/js/...`）。以下のパスは `プロトタイプ/` からの相対パス。

## ファイル構成

```
index.html              — HTML/CSS のみ。<script src> タグで全JSを読み込む
assets.js                — Assets（画像・SEアセットのパス解決）
js/
  data/                  — カード・ゲームデータ（カード追加時はここを編集）
    floors.js            — FLOOR_DATA（20階分）, BOSS_FLOORS, NODE_TYPES
    events.js            — ENEMY_POOL, ENCHANT_TYPES, ARCANA_POOL
    units.js             — UNIT_POOL（全グレードのキャラクターカード定義）
    loader.js            — 起動時にGoogleスプレッドシート(CSV)をfetchし、RING_POOL/SPELL_POOL/FLOOR_DATA等をインプレース上書き。fetch失敗時は内蔵データを使用
    local_xlsx_data.js   — file:// 環境向けのローカルCSVフォールバック（loader.js が参照）
  engine/                — ゲームロジック（メカニクス変更時はここを編集）
    constants.js         — GRADE_MULT, GRADE_COEFF, MAX_GRADE, GRADE_UP_COSTS
    audio.js             — 仮SE再生レイヤー（Assets.sfx 経由で再生）
    state.js             — グローバル状態 G, uid/clone/rand ユーティリティ, initState()
    pool.js              — drawRewards(), rollGrade()
    enemy.js             — generateEnemies(), generateMoveMasks()
    battle.js            — startBattle(), nextTurn(), allyAttackAction(), enemyAttackAction(), onBattleEnd()
    render.js            — renderAll(), mkCardEl(), computeDesc(), effectiveStats()
    reward.js            — goToReward(), renderRewCards(), renderHandEditor(), エンチャントモーダル
    move.js              — renderMoveSelect(), chooseMove(), takeCardToHand()
    main.js              — showScreen(), updateHUD(), log(), startGame(), gameOver()
```

### スクリプトロード順（index.html）

実際の順序：

`assets.js` → `audio.js` → `constants.js` → `data/floors.js` → `data/events.js` → `local_xlsx_data.js` → （CDN: xlsx.js） → `loader.js` → `units.js` → `state.js` → `pool.js` → `enemy.js` → `battle.js` → `render.js` → `reward.js` → `move.js` → `main.js`

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

### 杖・消耗品（SPELL_POOL）— `js/engine/pool.js`

```js
{
  id: 'unique_id',
  name: '表示名',
  type: 'wand' | 'consumable',
  subtype: 'wand',              // 一部の杖のみ（グループ分け用、省略可）
  cost: 2,                      // ショップ購入価格・レアリティ目安
  rarity: -1 | 4,               // 特殊入手専用カードで使用（省略時は通常プール）
  starterOnly: true,            // 初期装備専用（通常報酬プールに出ない）
  effect: 'fire' | 'nullify' | 'heal_ally' | 'boost' | 'golem' |
          'change_formation' | 'poison_wand' | 'sacrifice' | 'boost_atk' |
          'swap_pos' | 'weaken_half' | 'spread' | 'meteor_multi' |
          'shield_wand' | 'growth_wand' | 'flash_blade' | 'charm' | 'doom' |
          'possess' | 'swap_stats' | 'instakill' | 'transform_wand' | ...,
  baseUses: 4,                  // 杖の初期使用回数（consumableは不要）
  needsEnemy: true,              // 敵のみ対象選択が必要な場合
  needsAlly: true,                // 味方のみ対象選択が必要な場合
  needsAny: true,                  // 味方・敵どちらでも選択可能な場合
}
```

## 主要な状態（G オブジェクト）

`initState()`（`js/engine/state.js`）で初期化。フィールド数が非常に多いため、以下は代表的なものの抜粋（網羅ではない。全量は `initState()` を直接参照）：

- `G.rings[]` / `G.spells[]` — 装備中のカード（null = 空スロット）。`G.ringSlots`, `G.handSlots` がそれぞれの有効枠数
- `G.allies[]` / `G.enemies[]` — 戦場のユニット（hp≤0 = 死亡）
- `G.phase` — `'init'` | `'player'` | `'enemy'` | `'commander'` | `'reward'` 等
- `G.floor`, `G.life`, `G.gold`
- `G.rewardGrade`, `G.rewardGradeUpCount`, `G.rewardCharCount`, `G.rewardCards` / `G.maxRewardCards` — 報酬グレード関連（旧 `G.rewardLv` は現存しない）
- `G.mana` — `{red, blue, green, yellow}`。`initState()`では未初期化で、戦闘開始時に`battle.js`の`_ensureMana()`が遅延生成する
- `G.buffAdjBonuses` — パネル配置（隣接強化）による永続ボーナス

## その他のファイル

- **Build/** — Unityビルド（日付フォルダ／mac用・win用）
- **画像素材/** — PNG素材（キャラ・敵・カード・UI）
- **仕様変更.txt** — 設計仕様メモ（Shift-JIS）。読む場合: `iconv -f SHIFT_JIS -t UTF-8 仕様変更.txt`
- **concept.pdf**, **d_list0322.pdf** — 企画・カードリスト資料

## サウンドエフェクト

SE選定・実装時のみ `docs/SOUND_EFFECT_RULES.md` を読むこと。

SEに関係しない改修では読まないこと。
