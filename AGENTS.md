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

- `wave-loop-system` ブランチ。Wave/Stage構成（1wave＝10stage：1-3通常戦/4エリート→村5/5村/6-8通常戦/9地域ボス→祭壇10/10祭壇→次wave、wave4祭壇後はラスボス→クリア）、敵戦力計算式（深層レベル1-6・エリート固定3・ボス固定6・強敵補正1/1.5/2を`G._extraBattleMult`に統一）まで実装・実機確認済み。敵戦力上昇は深層レベル×強敵補正のフックで直接確認済み（例：wave1コボルトatk1→wave4ボスatk180-200）。
- ライフ制を導入：敗北しても即ゲームオーバーにせず`G._waveLife`（初期3）を1減らし、0で`gameOver()`。残っていれば0.8秒後に同stageを`_startWaveBattle`でやり直す（`handleWaveBattleDefeat`）。所持金/ターン枠だった場所は「ライフ」＋♥♥♥表示に変更、「エリート襲撃まで/ボス襲撃まで＋Xターン」は白文字で「戦闘開始」ボタン上（`.reward-prod-wave-countdown`）に移動。
- ショップ/鍛冶屋に入った後は「村に戻る」/「祭壇に戻る」ボタンを表示（`G._isWaveAltar`で判定）。背景をwave単位（`G._wave`→stage1-4アセット）に変更（`getWorldMapStageBackgroundKey`）。ボス報酬ゴールド・旧マップ施設生成は廃止/未使用のまま。
- 実機（console/screenshot）でライフ表示・白文字カウントダウン・村/祭壇の戻るボタン・背景キー・敗北時のライフ減少とゲームオーバー分岐まで確認済み。クエスト受託・指輪交換は仕様通り未実装スタブ。
- ♥♥♥/♡（ライフ表示）のフォントサイズ・Y軸を所持金額と揃え（46px・top:27px）、右端をキャンバス座標X=1039pxに統一（`.reward-prod-turn strong`）。実機の計算値で確認済み。
- 敗北時の挙動を「同stage即やり直し」から「Withdraw表示→表示が消えてから村/祭壇/新規報酬5枚提示のいずれかへ遷移」に変更。`_startWaveBattle()`で直前画面（村/祭壇/報酬）を`G._waveDefeatReturnTo`に記録し、`handleWaveBattleDefeat()`で`G._rewardStartSnapshot`（村/祭壇/報酬いずれもgoToReward()経由で取得済み）まで盤面・所持金・アイテム・指輪・魔導板パネル配置を巻き戻してから遷移（＝直前に取得した報酬は失う）。`showVictoryOverlay()`のphase==='reward'ガードを満たすため画面構築より先にphaseだけ設定し、実際の`goToReward()`/`openMapVillage()`/`_openWaveAltarMenu()`呼び出しはコールバック（Withdraw非表示後）に遅延。実機で遷移タイミング（goToReward呼び出しがoverlay非表示後）と巻き戻し（直前カード復活・戦闘直前カード消失・所持金復元）を確認済み。
- ショップでゴールド不足のスペルカードの`spell_frame`（枠画像）自体は正しく描画されている（`--card-frame`が`spell_frame4.png`等に正しく設定され、画像も存在・ロード成功）ことを実機検証で確認。ただしカードアート側（`assets/art/cards/S001.jpg`等）に対応する`assets/art/cards/`フォルダが存在せず、枠のオーバル窓が空のまま＝カード全体が「何も表示されていない」ように見える。これはコードではなくアセット未整備（＝ユーザー側で対応が必要な事項）。
- ゴールド不足カードの「ゴールド不足」バッジが暗く見える問題は、`.rew-card.cant`への`filter:grayscale/brightness`が子要素のバッジまで一緒に暗くしていたことが原因。バッジの暗さ表現を`::after`の半透明黒オーバーレイのみに絞り、`.cant`側の`filter`は`drop-shadow`のみ残す形に修正。また`.rew-card.cant{pointer-events:none}`がホバーの説明文表示（`_initKwTooltip`のmousemove判定）をブロックしていたため、`pointer-events:none`を削除（`cursor:default`のみ維持）。購入不可の実効ロジックはJS側（`canBuy`がfalseならonclick自体を付与しない）のままなので、pointer-events解除後もクリック購入は発生しないことを実機確認済み。
- 祭壇の「指輪交換」を実装（未実装スタブから変更）。ボス撃破後の「栄光の力」画面（`_ringOfferPhase`／指輪3枚提示・魔導板カード3枚廃棄で1枚だけ選択取得、既存の`_pickRingOffer`/`_discardBoardCardForRingOffer`/ドロップ処理をそのまま流用）を`openMapRingExchange()`（map.js）から`G._isBossRewardCycle`なしでも起動できるようにし、祭壇メニューから遷移。ボタン構成は後続の修正で変更済み（下記参照）。
- ショップ／鍛冶屋／指輪交換は、同一wave内で一度戻って再訪しても提示内容が再抽選されないよう`G._waveShopStock`/`G._waveForgeOffers`/`G._waveRingExchange`（waveNoキー）にキャッシュし、`_syncWaveFacilityCache()`を離脱時（戻るボタン／戦闘開始／元に戻す）に呼んで購入・廃棄・指輪取得などの進捗も保持。あわせて`_ringOfferResolved`が`_rewardStartSnapshot`に未保存で「元に戻す」後も解決済み状態が残ったままになる既存の抜けを修正。実機で「戻って再訪しても同じ指輪/品揃えのまま」「指輪取得後に戻って再訪しても指輪が盤面に残り残り2枚のまま」を確認済み。
- 編成画面で右クリック（`right-card-peek`）中にパネル（召喚の力など）名をホバー表示すると、上に乗っているカードのレアリティ色がそのままツールチップに適用され「パネル名がカードと同じ色」になる不具合を修正（`render.js`の`_initKwTooltip`：`data-panel-power-preview`を表示する時はカード側の`rarity-N`クラスを付与しないよう分岐）。実機でpeek時は色なし、通常ホバーはカード本来のレアリティ色のままであることを確認済み。
- 鍛冶屋でのパネル力ロール演出中（`G._mapForgeAnimating`）に別の魔導板カードをドラッグすると、演出の候補/当選発光（`map-forge-roll-candidate`/`-highlight`）がドラッグ中もずっと表示され続ける不具合を修正（`reward.js`：ドラッグ中（`_dragSrc`あり）は演出クラスを付与しない）。実機でドラッグ中は発光なし、ドラッグしていない時は従来通り発光することを確認済み。
- 上記は「ロール演出中の話」ではなく「鍛冶屋にいる間は常に、魔導板カードをドラッグしたら選択肢（`#battle-order-section`）がアイテム枠と同様に暗くなるべき」という指摘だったため別途対応。`reward-screen-active`中は`#battle-order-section`を常に明るく保つ既存の重複ルール群（ドラッグ中の暗転を打ち消す）に対し、`body.reward-screen-active.forge-screen-active.dragzone-mainequip`という詳細度の高い新ルールを追加し、鍛冶屋だけ暗転させるようにした（ショップ等は従来通り明るいまま）。実機で鍛冶屋のみ`filter:brightness(.4) saturate(.5)`になることを確認済み。
- 村/祭壇の施設画面（ショップ・鍛冶屋・指輪交換）のボタン構成を仕様通りに変更：「戦闘開始」の代わりに常に村/祭壇メニューへ戻るだけのボタン（ショップ＝「村に戻る」、鍛冶屋・指輪交換＝「祭壇に戻る」、押すと`openMapVillage()`/`_openWaveAltarMenu()`）にし、次stageへ進む機能は各施設からは削除（村/祭壇メニュー自体の「村を出る」ボタンのみが担う）。「元に戻す」はショップ・指輪交換にのみ表示し、鍛冶屋には表示しない（`canResetMapReward`から`G._isForge`を除外）。
- ショップで魔導板の既存カードへ新しいカードを重ねて入れ替えた時、押し出されたカードを報酬エリアへ戻さず自動的に売却するよう変更（`placePendingPanelToSelectedUnit`：`G._isShop`時は売却ボタンと同じ換算＝売値の1/4を加算）。実機で売却額・購入額それぞれの計算とゴールド反映を確認済み。
- 「魔導板のキャラクターの説明文に強化カードで得たキーワードが書かれていない」報告を調査：`_isPanelCharacter`のホバー説明文（`_collectAdjacentEnhancements`→`_unitDisplayKeywords`、直接接続・多段チェーン接続とも）は「毒牙1」等の通常キーワードでは正しく反映される。「逆襲」等一部の強化カード名は`_INTERNAL_ONLY_ENCHANT_NAMES`（内部専用の自己参照名）により意図的に非表示。
- 上記の追加報告で「結界を複数キャラ（複数接続）させた時、結界Xが編成画面で表示されない（戦闘画面では表示される）」と判明・再現・修正。原因は`_unitDisplayKeywords`の「結界X」合算表示が`unit.shield`（数値、戦闘中は`_applyAdjacentPanelEnhancements`で計算済み）を参照する仕様なのに対し、編成画面の`_cardForPreview`（板カードのプレビュー用オブジェクト）には`.shield`が一切セットされておらず、かつ生の「結界N」キーワード文字列自体は重複防止のため表示側で除外される実装だったため、常に非表示になっていた。`_mkRewDiv`内の`_cardForPreview`構築後に`_cardForPreview.shield=_unitShieldValue(_cardForPreview)`（戦闘時と同じ計算関数）を追加して解消。実機で「結界」パネル2つを1キャラへ接続→「キーワード：結界2」が表示されること、接続なしでは表示されないことを確認済み。
- 戦闘画面の味方/敵グループのY軸を指定値に調整：`html body:not(.reward-screen-active) #ally-section{top:1233px}`（魔導板の真ん中のカードのY軸に一致。前衛は`#ally-section`直下でoffset0のため、この値がそのままプレイヤー前衛上辺になる）、`#enemy-area{top:114px}`（後衛は`#enemy-area`直下でoffset0のため、この値がそのまま敵後衛上辺になる）。魔導板の真ん中のカード（15マス中央、index7）のY軸は実機計測で1233pxと確定（ユーザーの事前調査値と一致）。実機のgetBoundingClientRectとcanvasスケール(0.174219)から逆算した設計座標で、両者とも指定値になることを確認済み。
- 指輪交換を1回済ませた（`_ringOfferResolved`）祭壇では、次に祭壇メニューを開いた時に「指輪交換」の選択肢自体を消すよう修正（`_openWaveAltarMenu`：`G._waveRingExchange[wave].resolved`を見て項目を出し分け）。実機でwave内は消えたまま維持され、次waveの祭壇では再度表示されることを確認済み。
- 「魔導板左下の召喚マス（idx10、既定deploy slotの一つ）に置いたファミリアが戦闘に出ない」との報告を調査したが、素の盤面・スターター盤面＋実際のカード配置関数（`placePendingPanelToSelectedUnit`）経由の2パターンともに`_startWaveBattle`実機再現では正常にG.alliesへ出撃し、再現できなかった。`applyNewPanelBattleStart`のデプロイ経路（既定5枠は常時デプロイ／鍛冶屋付与枠は`G.mapPanelPowers`経由）はコード読解上も問題なし。ただし鍛冶屋の「召喚の力」ロール候補マス（`_mapForgeCandidateSlots`のsummon用ハードコード`[0,2,4,11,13]`）が既定deploy slot`[1,3,10,12,14]`と一致しない不一致は別途発見済み（未修正・要確認）。ユーザーから編成画面・戦闘開始画面のSSを追加提供されたが、静止画からの目視だけでは盤面インデックスと戦闘後ステータス（強化適用後の数値）の対応が取れず特定できず。再現条件（追加確認質問）を提示中。
- 「復活の指輪で蘇生した時、ヘルナイトの生贄付与が効かない」を調査・修正。キーワード蘇生（復活/根性）は`_reviveWithHalvedStats`経由で`_afterPanelSummon()`（ヘルナイトの生贄付与・光の指輪の結界付与等をまとめて処理する「戦闘中に現れた」共通フック）を呼ぶのに対し、指輪蘇生（`processAllyDeath`内の「復活の指輪」分岐）はHPを直接戻すだけで`_afterPanelSummon()`を一切呼んでいなかったのが原因。指輪蘇生後にも`await _afterPanelSummon(unit,false)`を追加し、キーワード蘇生と同じ扱いに統一。実機（ヘルナイト＋瀕死ユニット＋復活の指輪を直接セットして`processAllyDeath`実行）で生贄キーワード付与を確認済み。
- 「指輪交換でタグが機能していないように見える」を調査：`_pickRingOffer()`自体は死亡/攻撃等の効果タグ（該当指輪が2枚以上ある場合）では「2枚一致＋1枚タグなし」を安定して満たすことを実機確認。ただし色タグ（赤/青/緑/黄/紫）は各色につき指輪が1枚ずつしか存在しないため、「タグ一致が2枚に満たない場合は他の指輪で補う」という既存の意図的なフォールバックが常に発動し、結果的に色偏重デッキではタグ一致1枚＋ランダム2枚になり、体感「タグが効いていない」ように見える。ロジックのバグではなくRING_POOLの色タグ指輪が1色1枚しかないというデータ上の制約が原因のため、修正方針（色タグ指輪を増やす／フォールバック挙動を変える等）はユーザー判断待ちで未着手。
- ファミリア出撃不具合の根本原因を特定・修正。開戦時のパネル出撃は前衛7・後衛3（計10）の枠上限があり、前衛スロット（1,3）が複製の力等で水増しされて前衛7枠を使い切ると、`_summonPanelUnitToFront`の後衛フォールバックで前衛超過分が後衛枠まで侵食していた。後衛は`[14,12,10]`の逆順で処理されるため、一番左下（idx10）が常に「最後に処理されて真っ先に溢れる」枠になっていたのが原因（ユーザー実機検証で確認済み）。対応として①`ENEMY_REAR_SLOTS`を3→5に増量（constants.js）、②「戦闘中に召喚される」系（効果による召喚・仲間化・蘇生：`_spawnAdhocAllyUnit`／ラミア仲間化／サキュバス簒奪／`_reviveWithHalvedStats`・復活の指輪蘇生）は前衛のみを対象とする新関数`_summonMidBattleAllyFront`に差し替え、後衛へは絶対に溢れさせないようにした（前衛が満杯なら召喚自体を諦める）。開戦時のパネル出撃（`applyNewPanelBattleStart`、isInitialDeploy）側の前衛→後衛フォールバック自体は変更していない（既定の板配置ルールとして維持）。実機で「前衛7埋まった状態でのミッドバトル召喚は後衛に溢れず失敗する」「復活キーワードでの蘇生後は必ずlane='front'になる」「複製の力で前衛が増えても後衛枠(10,12,14)のファミリアが正常出撃する」の3点を確認済み。
- mainブランチのマップシステム（49マス・フロード型）復元を着手しかけたが、ユーザーから中止指示があり撤回（`map_legacy_flood.js`を作成したが読み込み前に削除、コード変更なし）。ブランチ状況の調査で判明：mainとwave-loop-systemはa0e9acbで分岐した完全に別系統の履歴で、mainには現行のルート型（村/行商人/祭壇）とは別の49マス・フロード型（エリート徘徊あり）map.jsが存在する。将来必要になった場合は`generateWorldMap`等9関数（generateWorldMap/renderWorldMap/_mapNodeIcon/_mapNodeTitle/skipWorldMapTurn/_moveToAdjacentMapNode/moveToMapNode/_executeMoveToMapNode/finishMapBattleVictory/handleMapBattleDefeat）のみが実質差分で、他の`_moveMapElites`等ヘルパーは両ブランチで完全一致（git diffで確認済み）なので、Flood接頭辞でリネームした別関数として追加すれば現行のルート型を壊さず共存できる。
- ユーザー指定の強化カード5種を実装・修正（pool.js/battle.js/reward.js）。①竜の契約：旧「5回負傷でドラコニアンに変身」効果（`_checkDragonContractInjury`、battle.js内6箇所から呼び出し）を完全削除し、「攻撃：ランダムな敵に5ダメージを与える」に置き換え（`_applyUnitAttackEffects`内にキーワード判定ブロックを新規追加）。②逆上：全体8ダメージ→4ダメージに変更。③④翡翠の壺(200G)/黄金の壺(300G)：ITEM_POOLに新規追加、`_useImmediateItem`に`jade_vase`/`golden_vase`キー（`golden_scroll`と同じ即時ゴールド獲得パターン）を追加。⑤貫通：戦闘ロジック自体（前衛攻撃時に後衛3人まで貫通）は既存実装済みだったが、それを付与するパネルカードがPANEL_POOL未登録で入手不可だったため、二段攻撃等と同じ「キーワードのみスタブ」形式で追加（rarity4、no未指定）。実機で全て動作確認済み（竜の契約5dmg、逆上4dmg×全体、壺のゴールド加算とスロット消費、貫通カードがシート同期でE042として認識）。
- assets/sfx内のBGM系ファイル（battle1.wav/menu.wav）をユーザーが新設の`assets/bgm/`フォルダへ移動し、新規`battle3.wav`を追加。`Assets.sfx`（assets.js）のmenu/battle1パスを`assets/bgm/`配下に更新し、battle3を新規登録（`BGM_DEFAULT_VOLUMES`にも.32で追加）。`showScreen('battle')`（main.js）で`G._waveBattleType==='boss'`の時だけbattle3を再生するよう分岐追加（通常/エリート戦はbattle1のまま）。実機でBGMキー選択（通常戦→battle1、ボス戦→battle3）を確認済み。

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
