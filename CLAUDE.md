# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Vesselbound（仮）** — Argante 製のローグライクカードゲーム。`Vesselbound.html` を開くだけで動作するシングルファイル構成（ビルドツールなし、`file://` プロトコル対応）。JavaScript はすべてグローバルスコープ。

## ファイル構成

```
Vesselbound.html       — HTML/CSS のみ。<script src> タグで全JSを読み込む
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

### スクリプトロード順（Vesselbound.html）

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
