# GAME_SYSTEMS.md

## システム概要

Vesselboundは、魔導板で編成したキャラクターとエンチャントを戦場へ送り出す、オートバトル型のローグライクゲームである。通常プレイ（PvE）では旅のステージを進み、街・塔・戦闘を経て最終決戦を目指す。オンライン対戦（PvP）では、同じ戦闘コアを使って相手の編成と戦う。

ゲームはビルドツールなしで動くプロトタイプで、`prototype/index.html` を開いて開始できる。通常の画面状態と全体状態は `prototype/js/engine/state.js: initState()` が用意する `G` オブジェクトに保持される。

主な流れは次のとおり。

1. 旅の現在地から、編成・街の施設・戦闘へ進む。
2. 魔導板にカードを置き、配置と向きによるつながりを編成へ反映する。
3. 開戦処理と自動戦闘を解決する。
4. 戦闘後にカード・指輪・アイテムなどを選び、次のマスまたは施設へ進む。
5. ステージを越え、最終ステージのボスを倒す。

カードや指輪の所持状態、ゴールド、ライフ、旅の進捗はランの状態である。戦闘中のユニット配列や演出中の一時状態は、通常のランセーブに二重保存しない。

## マップと旅の進捗

### ステージ構成

旧来の7×7グリッドだけを前提にした進行は現行仕様ではない。現在はステージ（`G._wave`）とステージ内マス（`G._waveStage`）で旅を表し、出発時にワールドマップのルート演出を表示する。

旅の表示ルートは `prototype/js/engine/reward_journey.js: _journeyRouteForScene()` が決める。通常の標準ルートは、一般戦闘、エリート、街、一般戦闘、ボス、祭壇などを含む。ステージ1は先頭がリーゼの村、ステージ5は最終決戦用の短いルートである。実際のステージフローはデータやオンラインのサーバー状態を優先する。

旅の進捗UIは `prototype/js/engine/reward_journey.js: _syncRewardJourneyUi()` が描画する。ステージごとのマーク、現在地、通過済みのマス、次に進むマス、塔までの残り戦闘数を表示する。エリート・ボスは、出現個体の先読み情報をホバー表示することがある。

マスの種別は `prototype/js/engine/map.js: waveStageRouteType()` で取得できる。街の後かどうかは `prototype/js/engine/map.js: waveStageIsAfterCity()`、ステージ背景は `prototype/js/engine/map.js: getWorldMapStageBackgroundKey()` が扱う。地域名・塔名などはシートの地域情報を `prototype/js/engine/map.js: regionInfoForWave()` から参照する。

### 街・塔・施設

街や塔は単なる報酬画面ではなく、施設を選ぶ画面である。入口は `prototype/js/engine/map.js: openMapVillage()` で、施設一覧は `prototype/js/engine/map.js: villageFacilityList()`、施設のクリック処理は `prototype/js/engine/map.js: _onVillageFacility()` が担当する。

現行コードにある主な施設入口は次のとおり。

- `prototype/js/engine/map.js: openMapShop()` — 魔導店。カードを購入・売却する。
- `prototype/js/engine/map.js: openMapForge()` — 鍛冶屋。マップ用の魔導板パワーを購入・適用する。
- `prototype/js/engine/map.js: openMapRingExchange()` — 指輪交換。
- `prototype/js/engine/map.js: openMapItemShop()` — アイテム店。
- `prototype/js/engine/map.js: useVillageInn()` — 宿屋でライフを回復する。
- `prototype/js/engine/map.js: openMapLibraryMenu()` — 図書館メニュー。

魔導板パワーは、召喚、生命、永劫、共鳴、複製の5種を基本とする。編成から出撃ユニットへの変換は `prototype/js/battle/formation.js: buildBoardFormation()` に一本化され、開戦時の処理は戦闘コアへ渡される。

## 編成とカード

メインの魔導板は15枠（5列×3行）で、パーティ全体で共有する。編成画面ではカードを魔導板へ置き、向きと隣接関係に応じてキャラクターへエンチャント効果を与える。報酬画面・編成画面での配置処理は `prototype/js/engine/reward.js: takeRewCard()`、編成の再描画は `prototype/js/engine/reward.js: renderFieldEditor()` が入口になる。

カードプールは `prototype/js/engine/pool.js` にあり、現行の中心は次の3系統である。

- `PANEL_POOL` — キャラクターとエンチャント。
- `SPELL_POOL` — マナを消費して発動するスペル。
- `ITEM_POOL` — 使用対象を選ぶ消耗品。

カード生成は `prototype/js/engine/pool.js: makePanel()` と `prototype/js/engine/pool.js: makeItem()`、報酬抽選は `prototype/js/engine/pool.js: drawRewards()`、アイテム抽選は `prototype/js/engine/pool.js: drawItems()` が担当する。ショップ価格は `prototype/js/engine/pool.js: calcBuyPrice()` で求める。

指輪は `RING_POOL` のパッシブ効果として扱われる。旧来の「指輪がトリガーでキャラクターを召喚する」方式を現行の文書仕様として扱わないこと。指輪の装備枠は `G.rings` で、戦闘中の具体的な効果判定はコア側で行う。

## 戦闘

### 共通コア

戦闘ルールの唯一の実装は `prototype/js/battle/core.js: runBattleCore()` である。PvEの `prototype/js/engine/battle.js: battlePhase()` と、オンラインの `prototype/js/online/sim.js: simulateOnlineBattle()` は、原則としてこのコアを呼び、イベント列を受け取る。コアはDOM、`G`、`Math.random`、`Date.now`に依存せず、乱数は引数から受け取る。

1ターン単位の進行は `prototype/js/battle/core.js: coreBattleStep()` が唯一の実装である。PvEでは `prototype/js/battle/core.js: createBattleRunner()` を使って一手ずつ進め、表示を待ってから次の手へ移る。ターン上限は `BATTLE_CORE_TURN_LIMIT`（現行値500）である。

開戦は `prototype/js/battle/core.js: coreRunOpening()` が行う。開戦イベント、魔導板パワー、指輪・アイテム、結界、開戦効果、マナ閾値効果、ATK0の逃走、前衛全滅時の判定までを共通手順で解決する。PvEの戦闘開始入口は `prototype/js/engine/battle.js: startBattle()` である。

### 盤面と行動

出撃ユニットは陣営ごとの配列で保持し、各ユニットの `lane` で前衛・後衛を区別する。生存ユニットは左詰めに整理される。召喚体の挿入は `prototype/js/battle/core.js: coreInsertSummonedUnit()`、死亡体と空欄の整理は `prototype/js/battle/core.js: coreCompactUnits()` が担当する。

攻撃対象の選択、守護・隠密・狩人・前衛優先、貫通の後衛対象はコアが判定する。攻撃力と追加攻撃、攻撃範囲もコアで確定する。全体攻撃・三方向攻撃・貫通を含む一撃は、対象へのダメージを確定してから負傷・死亡などの誘発を解決する。

ダメージ、能力変化、マナ、ゴールド、召喚、変身、復活、封印、毒、指輪・アイテム効果は、コアがイベントとして出力する。ATKが0になったユニットは死亡ではなく `fled` イベントで場を去る。戦闘の勝敗と終了イベントもコアおよびオンライン側の権威状態で確定する。

### PvEとオンラインの受け口

PvEのイベント受け口は `prototype/js/engine/battle_events.js` にあり、Gの資源・ユニット状態を更新しながら演出を呼ぶ。オンラインは `prototype/js/online/playback.js: playOnlineBattleEvents()` でイベント列を順に再生し、DOM描画は `prototype/js/online/board.js` が担当する。オンラインの対戦要求と編成送信は `prototype/js/online/versus.js: buildSelfFormation()`、サーバー側のローカルNPCスタブは `prototype/js/online/server_local.js` にある。

PvEとオンラインで分けてよいのは盤面DOMや、サーバーが管理する進行の受け口である。ダメージ計算・効果・勝敗・編成変換を片側の描画ファイルへ追加してはならない。オンラインの入力データがコアの読むフィールドを満たすことは `prototype/tools/parity/online_payload.js`、再生受け口の欠落は `prototype/tools/parity/online_receivers.js` で検査する。

## フェイズと画面遷移

フェイズは `G.phase` と、旅のステージ状態 `G._wave`／`G._waveStage` を中心に管理する。画面の切り替えは `prototype/js/engine/main.js: showScreen()` が行う。

通常の戦闘は `prototype/js/engine/battle.js: startBattle()` から開戦処理、`prototype/js/engine/battle.js: battlePhase()` からコアのステップ実行へ進み、`prototype/js/engine/battle.js: _checkBattleOver()` が決着を確認する。勝利時のオーバーレイは `prototype/js/engine/main.js: showVictoryOverlay()`、報酬画面への入口は `prototype/js/engine/reward.js: goToReward()` である。敗北時は `prototype/js/engine/battle.js: handleBattleDefeat()` がライフやゲームオーバー遷移を処理する。

オンラインではサーバー状態に追従して画面を進める。対戦の画面フローは `prototype/js/online/flow.js`、マッチ状態の中継は `prototype/js/online/match.js`、イベントの再生は `prototype/js/online/playback.js` が担当する。オンラインは決着後の進む時刻や敗北表示など、サーバーが確定する部分だけPvEと異なる。

演出の規則は `prototype/js/battle/present.js`、イベント1件の見せ方は `prototype/js/battle/present_events.js` に一本化されている。攻撃・ダメージ・死亡・マナ効果はイベント順、ダメージの束、表示の間隔、死亡後の詰め直しを共通規則で再生する。実際のDOM描画はPvEが `prototype/js/engine/render.js`、オンラインが `prototype/js/online/board.js` で行う。

## 報酬

### 戦闘報酬

戦闘後は `prototype/js/engine/reward.js: goToReward()` が報酬状態を作り、`prototype/js/engine/reward.js: renderRewCards()` が提示カードを表示する。カードの取得と配置は `prototype/js/engine/reward.js: takeRewCard()` が処理する。報酬置き場にはカード上限があり、カードを取った後は魔導板、手札、アイテム枠など適切な場所へ移す。

報酬の抽選はプレイ状況に応じたキー付き乱数を使う。同じランの再現性を保つ入口は `prototype/js/save/run_save.js: runWithKeyedRandom()` と `prototype/js/engine/reward.js: goToReward()` である。ショップの在庫は通常報酬とは別に保持され、売買処理も報酬画面のUIから行う。

### 施設での報酬・交換

魔導店ではカード・アイテムなどを購入でき、鍛冶屋ではマップ用の魔導板パワーを購入できる。指輪交換では所持カードを返して指輪を選ぶ経路がある。これらの画面は `prototype/js/engine/reward.js: goToReward()` を経由する場合と、`prototype/js/engine/map.js: openMapVillage()` から施設画面へ直接入る場合がある。

アイテムの使用・対象選択は `prototype/js/engine/reward_items.js`、カードや指輪の固定ホバー表示は `prototype/js/engine/reward.js: _showRewardRingTooltip()` など報酬画面側が担当する。

### ライフ・ゴールド・マナ

ゴールドはラン全体で持ち越す資源で、報酬・施設購入・一部の戦闘効果で増減する。ライフの実値は `G._waveLife` であり、表示や宿屋の回復もこの値を基準にする。マナは戦闘ごとの資源で、戦闘開始時には両陣営とも0から始まる。マナ閾値を持つキャラクターやスペルは、コアがマナ獲得イベントと閾値効果イベントを発行する。

PvEではコアの状態を `prototype/js/engine/battle.js: _syncCoreLifeToG()`、`prototype/js/engine/battle.js: _syncCoreResourcesToG()`、`prototype/js/engine/battle.js: _syncCoreManaToG()` などでGへ戻す。オンラインではサーバーが確定したイベントと結果を再生し、クライアントが独自にダメージや勝敗を再計算しない。

戦闘終了後、召喚された一時ユニットや戦闘中のHP・状態は次の戦闘へそのまま持ち越さない。例外的に、PvEの魔導板「永劫の力」による恒久的な+1/+1など、編成やラン状態へ保存される効果は別に扱う。

## 仕様を読む順番

画面の入口や大まかなデータの流れを確認するときは、この文書の該当節から `prototype/js/` のファイルを開く。戦闘の条件、イベントの順序、演出の待ち時間、片側限定の理由を変更・判断するときはAGENTS.mdを先に読む。とくに次の対応を崩さない。

- ルールは `prototype/js/battle/core.js`。
- 編成変換は `prototype/js/battle/formation.js`。
- 見せ方の規則は `prototype/js/battle/present.js` と `prototype/js/battle/present_events.js`。
- PvEのDOM受け口は `prototype/js/engine/battle.js` と `prototype/js/engine/render.js`。
- オンラインのDOM受け口は `prototype/js/online/board.js` と `prototype/js/online/playback.js`。
- ランの永続化は `prototype/js/save/`。

この分担により、同じカードや効果をPvEとオンラインで別々に実装しない。新しい効果はコアがイベントを出し、必要な演出を共通のpresent層へ追加し、両方の受け口から同じ見せ方を呼ぶ。

## セーブとプロフィール

ランセーブの公開入口は `prototype/js/save/run_save.js: serializeRunState()`、`prototype/js/save/run_save.js: restoreRunState()`、`prototype/js/save/run_save.js: buildRunSave()`、`prototype/js/save/run_save.js: saveRun()`、`prototype/js/save/run_save.js: loadRun()` である。保存先の抽象化は `prototype/js/save/storage.js`、バージョン移行は `prototype/js/save/migrations.js` が担当する。

保存対象は、旅の進捗、所持カード・アイテム・指輪、ゴールド、ライフ、クエストや乱数状態など、再開に必要なラン状態である。戦闘中の `allies`、`enemies`、`phase`、`turn`、`battleCounters` は、保留中戦闘のイベント列から復元するため通常の状態フィールドへ重複保存しない。状態を追加する場合は `run_save.js` の許可リストと移行処理を確認する。

プロフィールの発見・取得記録は `prototype/js/save/profile_save.js: markCardSeen()`、`prototype/js/save/profile_save.js: markCardAcquired()` および `SaveProfile` が扱う。ランの完了記録とコンティニュー判定は `prototype/js/save/run_save.js: finish()`、`prototype/js/save/run_save.js: refreshContinue()` が入口である。

## データ（シートと内蔵フォールバック）

カード、エンチャント、スペル、アイテム、指輪、地域、階層などのマスターデータはシートを正とする。起動時の読み込みとオブジェクト生成は `prototype/js/data/loader.js: loadGameData()` が行う。ネットワークやCSV取得が使えない `file://` 環境では `prototype/js/data/local_xlsx_data.js` の内蔵データをフォールバックに使う。

シートの列はヘッダー名で読む。カードの効果文、マナ順位、VFX/SE、アート番号などを変更したときは、現行データの内蔵フォールバックも更新する必要がある。カード絵の番号解決は `prototype/assets.js: getCharacterNoArtPath()`、素材の効果参照は `prototype/assets.js: getCharacterEffectVfxPath()` が担当する。

カード名をキーワードとして扱わない。効果文を持つ強化カード名は効果の識別子であり、素のキーワードとは区別する。この一覧と判定は `prototype/js/battle/core.js: coreUnitKeywords()` などコア側の規則に従う。新しいカードや効果の追加時は、AGENTS.mdのカード追加手順・キーワード一覧・オンライン受け渡し規則を必ず確認する。

## 更新時の確認先

この文書は全体像と入口を示す。数値、イベントの順序、演出の間、PvE／オンライン一致の規則はAGENTS.mdを正とする。効果・カードデータを変更した場合は、`prototype/tools/balance_sim/` の効果監査・コアスモーク・オフライン／オンライン回帰・イベント回帰・資源パリティを対象に応じて実行する。演出やオンライン受け口を変更した場合は、`prototype/tools/parity/` の該当検査も実行する。

関数名・ファイル名は、現行コードに存在する入口だけを記載している。旧文書の廃止済みファイル名・関数名・マナ構造・マップ仕様の記述は削除した。

この文書の更新日：2026-09-16。AGENTS.mdが規則と経緯を、GAME_SYSTEMS.mdが全体像と入口を担う。
