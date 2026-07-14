# GAME_SYSTEMS.md

## システム概要
- オートバトルカードゲームとRPGの融合。
- ゲームの目的はマップを探索して、所定ターン内にラスボスを倒すこと。
- 戦闘はオートバトル。
- 戦闘後はいくつかの報酬から1つを得られる。
- カードは所持数制限がある。
- 獲得したカードの置き場所によって、キャラクターの効果を強化できる。
（例：「死亡しても1度だけ復活」効果を持つキャラクターに矢印を向けて「死亡すると全ての敵にダメージ」効果を付与すると、「死亡すると全ての敵にダメージ」効果が2回発動できることになる）
- 戦闘では「マナ」を得ることがある。「マナ」を必要とするカードは、必要数のマナが溜まった時点で召喚、または発動する。
- 戦闘後、召喚されたキャラクターは消滅し、戦闘時のダメージや状態変化はリセットされる。
- （現時点では）後列のプレイヤーキャラが受けたバフ効果、ダメージは永続である。
- （現時点では）後列中央のプレイヤーキャラが死亡し、そこに何も残らなければゲームオーバーになる。
（注：プレイヤーキャラが死んでも、そこに代わりのキャラが召喚された場合はゲームオーバーにならない。変身した場合も同様）
- 現在、マップ探索は実装されていないが、実装後はこの上二つのルールは変更される見通しである。
（変更後はプレイヤーキャラも全状態リセットとし、戦闘に負けてもターン数が減少するだけでゲームが続く）

## マップ

現時点では「広いマップを探索する」という本来の設計は未実装。暫定措置として、20階層を1本道で自動的に進める形になっている（分岐選択は事実上ない）。かつて存在した「洞窟の奥へ」「湖の畔へ」「道を進む」といった行き先分岐は廃止済み。

- マップデータ：`プロトタイプ/js/data/floors.js` の `FLOOR_DATA`（1〜20階、grade/mult/magicLevel/boss を階層ごとに定義）, `BOSS_FLOORS`（フォールバック用）, `NODE_TYPES`（battle/smithy/rest/shop等のラベル定義。smithy/restは表示上使われていない廃止済みの名残）
- マップ生成：`chooseMove(nt)`（`move.js`）が `G.floor++` して次の画面へ遷移するのみ。行き先候補の絞り込みは `renderMoveSlotsInEnemy()`（`reward.js`）内で `battle`/`boss` のみに固定フィルタされている
- マップ描画：座標・グラフを持つ視覚的なマップ描画は無し。`renderMoveSlotsInEnemy()`（`reward.js`）が次の行き先ボタン（森=battle または ボス戦のみ）を並べるだけ
- ノードクリック処理：`chooseMoveInline(nt)`（`reward.js`）→ `chooseMove(nt)`（`move.js`）
- 空白マス表示：該当機能なし（未実装）

## 戦闘

- 戦闘開始：`battle.js: startBattle()`
- 味方召喚：`summon.js: makeUnit(), addAlly(), fireTrigger()`
- 敵生成：`enemy.js: generateEnemies(floor)`
- ターン進行：`battle.js: nextTurn(), commanderPhase(), startPlayerPhase(), battlePhase()`
- 敵攻撃：`battle.js: enemyAttackAction()`
- 味方攻撃：`battle.js: allyAttackAction()`
- 戦闘終了：`battle.js: onBattleEnd(), _checkBattleOver(), handleBattleDefeat()`
- マナ：`_gainMana(color, amount)` が `G.mana{red,blue,green,yellow}` に加算 → `_checkManaCostSummons()` が `manaCost` を満たしたパネルを検出 → `_payPanelMana()` でマナを消費して召喚・発動

## フェイズ

- 現在フェイズ管理：`G.phase`（`'init'`/`'player'`/`'enemy'`/`'commander'`/`'reward'`等）を各所で直接切り替え。専用の管理モジュールはない
- 画面切り替え：`main.js: showScreen(id)`
- 戦闘後遷移：`battle.js: showVictoryOverlay()` → `hideVictoryOverlay()` → `reward.js: goToReward()`
- 報酬画面：`reward.js: goToReward(), renderRewCards(), takeRewCard()`
- ショップ：`shop.js: doShop(), renderShop(), shopDone()`
- イベント：`event.js: showEvent(), doSmithy(), doRest(), eventDone()`

## 報酬

- カード報酬：`pool.js: drawRewards(n), drawCharacters(n), drawCharacterOfGrade(grade)` / `reward.js: renderRewCards(), takeRewCard()`
- 宝報酬：`pool.js: drawTreasure(), drawItems(), drawEquipment(), drawConsumable()`
- グレード管理：`pool.js: rollCharGrade(floor)`（`rollGrade()`はそのエイリアス）がフロア帯からグレード1〜4を決定。`calcBuyPrice(card)` が購入価格を算出
- ランダム抽選：`pool.js: _rollRarity(weights), _applyUniqueSlot(res), _drawByType(type,n,maxGrade)`

備考：かつての「指輪（RING）」＝トリガーで味方を召喚するカード概念は廃止済み。現行の `RING_POOL` はパッシブ効果のみのカード群。トリガー式の類似システムは今後 SPELL 側で復活予定（未着手）。