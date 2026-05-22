すべての思考・回答・コメントは日本語で行うこと。

# AGENTS.md

このファイルは、このリポジトリ内のコードを扱う際に、Codex（Codex.ai/code）にガイダンスを提供します。
ユーザーは高速な試作検証を重視している。
「完全性」より「短時間で試せる状態」を優先すること。

## Codex作業方針：高速改修モード

このプロジェクトは、ユーザーが手動テストし、その結果をもとにCodexが小さく改修する高速イテレーションで進行する。

Codexは以下を最優先すること。

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
- ファイル分割・ファイル移動
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
例：「横14マス」「総マス55」「ソウル+5」など。

既存関数がある場合は再利用する。  
新しい仕組みを作る前に、既存の状態・描画・報酬・フェイズ処理を確認する。

変更はできるだけ以下の単位に閉じる。

- マップ変更 → `move.js`, `floors.js`, `render.js`
- 戦闘変更 → `battle.js`, `summon.js`
- 報酬変更 → `reward.js`, `pool.js`
- ショップ変更 → `shop.js`
- イベント変更 → `event.js`, `events.js`
- 杖・アイテム使用制限 → `spell.js`, `main.js`, 関連UI

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

## ファイル構成

```
index.html             — HTML/CSS のみ。<script src> タグで全JSを読み込む
js/
  data/                — カード・ゲームデータ（カード追加時はここを編集）
    floors.js          — FLOOR_DATA（20階分）, BOSS_FLOORS, NODE_TYPES
    events.js          — ENEMY_NAMES/ICONS, ENCHANT_TYPES, SHRINE_EVENTS
    rings.js           — RING_POOL（召喚・パッシブ指輪カード一覧）
    spells.js          — SPELL_POOL（杖・消耗品カード一覧）
  engine/              — ゲームロジック（メカニクス変更時はここを編集）
    constants.js       — GRADE_MULT, SPELL_GRADE, RANK_UP_COSTS, RING_SLOTS, SPELL_SLOTS
    state.js           — グローバル状態 G, uid/clone/rand ユーティリティ, initState()
    pool.js            — drawRewards(), getPool()
    enemy.js           — generateEnemies(), generateMoveMasks()
    summon.js          — makeUnit(), addAlly(), fireTrigger(), summonAllies(), onAllyDeath()
    battle.js          — startBattle(), enemyTurn(), dealDmgToEnemy(), retreat(), surrender()
    render.js          — renderAll(), mkCardEl(), computeDesc(), effectiveStats()
    spell.js           — useSpell(), applySpell(), pickTarget()
    reward.js          — goToReward(), renderHandEditor(), エンチャントモーダル
    shop.js            — doShop(), buyItem(), グレードアップモーダル
    move.js            — renderMoveSelect(), chooseMove(), takeCardToHand()
    event.js           — doShrine(), showEvent(), eventDone()
    main.js            — showScreen(), updateHUD(), log(), startGame(), gameOver()
```

### スクリプトロード順（index.html）

`constants.js` → `data/*` → `state.js` → engine 各ファイル → `main.js`

関数本体内の参照はロード順に依存しないが、トップレベルの変数宣言は宣言順に解決されるため、この順序を維持すること。

## カードデータの構造

### 指輪（RING_POOL）— `js/data/rings.js`

```js
{
  id: 'unique_id',
  name: '表示名',
  type: 'ring',
  kind: 'summon' | 'passive',
  grade: 1,                    // 1〜4、GRADE_MULT で倍率適用
  trigger: 'battle_start' | 'turn_start' | 'on_summon' | 'on_spell' |
           'on_damage_count' | 'on_death_count' | 'on_full_board' |
           'on_ally_death_notskel' | 'on_outnumbered',
  summon: { atk, hp, name, icon },  // kind='summon' のみ
  count: 1,                    // 召喚数
  unique: 'wolf_aura' | 'shadow_copy' | 'djinn_replace' | ...  // 特殊処理キー
}
```

### 杖・消耗品（SPELL_POOL）— `js/data/spells.js`

```js
{
  id: 'unique_id',
  name: '表示名',
  type: 'wand' | 'consumable',
  effect: 'fire' | 'hate' | 'boost' | 'rally' | 'heal_ally' | 'nullify' |
          'double_hp' | 'swap_all' | 'seal' | 'spread' | 'instakill' |
          'golem' | 'meteor' | 'bomb' | 'revive' | 'big_rally' | 'gold_8',
  baseUses: 4,                 // 杖の初期使用回数
  needsEnemy: true,            // 対象選択が必要な場合に指定
  needsAlly: true,
}
```

## 主要な状態（G オブジェクト）

`initState()` で初期化。主なフィールド：

- `G.rings[]` / `G.spells[]` — 装備中のカード（null = 空スロット）
- `G.allies[]` / `G.enemies[]` — 戦場のユニット（hp≤0 = 死亡）
- `G.phase` — `'player'` | `'enemy'`
- `G.floor`, `G.life`, `G.gold`, `G.rewardLv`
- `G.buffAdjBonuses` — buff_adj パッシブによる永続ボーナス `{ringId: {atk, hp}}`

## その他のファイル

- **Build/** — Unityビルド（日付フォルダ／mac用・win用）
- **画像素材/** — PNG素材（キャラ・敵・カード・UI）
- **仕様変更.txt** — 設計仕様メモ（Shift-JIS）。読む場合: `iconv -f SHIFT_JIS -t UTF-8 仕様変更.txt`
- **concept.pdf**, **d_list0322.pdf** — 企画・カードリスト資料

## サウンドエフェクト

SE選定・実装時のみ `docs/SOUND_EFFECT_RULES.md` を読むこと。  

SEに関係しない改修では読まないこと。