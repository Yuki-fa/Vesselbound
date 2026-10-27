# シートを読んでいない日本語文言（2026-10-27）

対象: `js/engine`・`js/battle`・`index.html`・`js/save`・`js/online`。シートは取り込み済みの内蔵CSVを参照。
ASTで表示先の値、ボタン等のHTML、表示用設定、エラー、CSSのcontentを抽出した静的監査。コメント・console・正規表現・比較や検索にしか使わない語・開発者専用のデバッグ情報は除外し、デバッグ画面のボタンは含める。
「どこに出るか」は表示先／関数／設定の入口を示す。旧仕様・条件付き経路も残す。`${…}`は実行時の差し込み、エラーは呼出元で画面へ出る場合を含む。実機の全画面を走査した一覧ではない。
対応キーは同文と部分一致候補を区別した。同文のキーがあってもコードが引いていなければ主一覧に残す。予備文と初期HTMLのうち既にシートを読むものは末尾へ分けた。文言の置換は行っていない。

走査: 62ファイル。主一覧 254箇所、動的キーの予備 0箇所、シート読込済みの予備／初期表示 264箇所、各シートで上書きする初期定義 270箇所。

再生成: `node tools/balance_sim/hardcoded_text_audit_1027.js`。任意のJSON出力: `--json /tmp/hardcoded-text-1027.json`。

## コードから表示する文・キー未収録の文

| ファイル | 行 | 文 | どこに出るか | テキストメッセージ表の対応キー | 読み取り状態 |
| --- | ---: | --- | --- | --- | --- |
| index.html | 11503 | 旅の進捗 | HTML #run-resume-journey-ui / aria-label | なし | コードから表示 |
| index.html | 11510 | データを読み込み中... | HTML #scr-loading #load-msg div. | なし | コードから表示 |
| index.html | 11523 | オンライン対戦 | HTML #scr-title #title-menu span.title-menu-label | オンライン対戦（未収録／動的） | キー未収録・予備文が表示 |
| index.html | 11524 | コレクション | HTML #scr-title #title-menu span.title-menu-label | コレクション（未収録／動的） | キー未収録・予備文が表示 |
| index.html | 11542 | 前のカード | HTML #collection-prev / aria-label | なし | コードから表示 |
| index.html | 11544 | 次のカード | HTML #collection-next / aria-label | なし | コードから表示 |
| index.html | 11553 | オプションを閉じる | HTML #options-close-proxy / aria-label | なし | コードから表示 |
| index.html | 11554 | オプション | HTML #options-panel / aria-label | 同文: 「オプション」見出し | コードから表示 |
| index.html | 11572 | 日本語 | HTML #options-layer #options-panel span. | 同文: 「表示言語」項目1 | コードから表示 |
| index.html | 11584 | クエスト | HTML #quest-debug-panel / aria-label | 同文: 「クエスト枠」見出し | コードから表示 |
| index.html | 11628 | 戦闘カウンター | HTML #battle-counters / aria-label | なし | コードから表示 |
| index.html | 11638 | 所持金とライフ | HTML #battle-status-hud / aria-label | なし | コードから表示 |
| index.html | 11650 | 編成 | HTML #scr-battle #battle-formation-btn button.btn.small | 同文: 「編成画面」見出し | コードから表示 |
| index.html | 11654 | 編成 | HTML #scr-battle #reward-production-ui span. | 同文: 「編成画面」見出し | コードから表示 |
| index.html | 11667 | 東の砦まで商人を護衛せよ。（あと3戦） | HTML #scr-battle #reward-production-ui p. | なし | コードから表示 |
| index.html | 11668 | 次の村まで物資を輸送せよ。 | HTML #scr-battle #reward-production-ui p. | なし | コードから表示 |
| index.html | 11673 | 旅の進捗 | HTML #journey-progress-ui / aria-label | なし | コードから表示 |
| index.html | 11681 | ターン | HTML #scr-battle #reward-production-ui h2.reward-prod-turn-label | なし | コードから表示 |
| index.html | 11693 | 試験戦闘 | HTML #scr-battle #btn-test-battle button.btn | 同文: 「試験戦闘」ボタン | コードから表示 |
| index.html | 11694 | ゲームオーバー確認 | HTML #scr-battle #btn-debug-gameover span.debug-button-label | なし | コードから表示 |
| index.html | 11696 | マップ確認 | HTML #scr-battle #btn-debug-map button.btn | なし | コードから表示 |
| index.html | 11698 | クエスト変更 | HTML #scr-battle #btn-debug-quest span.debug-button-label | なし | コードから表示 |
| index.html | 11699 | ライフ変更 | HTML #scr-battle #btn-debug-life-plus button.btn | なし | コードから表示 |
| index.html | 11700 | エリート / ボス変更 | HTML #scr-battle #btn-debug-elite-boss span.debug-button-label | なし | コードから表示 |
| index.html | 11706 | 敵の盤面 | HTML #scr-battle #enemy-area #enemy-field-label div.field-label | なし | コードから表示 |
| index.html | 11712 | 提示カード | HTML #scr-battle #reward-cards-section div.field-label | なし | コードから表示 |
| index.html | 11721 | 戦闘実行 | HTML #scr-battle #btn-pass button.btn.small | なし | コードから表示 |
| index.html | 11725 | ゴールド | HTML #scr-battle #reward-info-bar span.ri-soul | 同文: 「所持金枠」見出し | コードから表示 |
| index.html | 11726 | 全敵撃破 | HTML #scr-battle #reward-info-bar #btn-debug-kill button.btn.small | なし | コードから表示 |
| index.html | 11727 | 報酬 | HTML #scr-battle #reward-info-bar span.ri-soul | なし | コードから表示 |
| index.html | 11727 | 枚 | HTML #scr-battle #reward-info-bar span.ri-soul | なし | コードから表示 |
| index.html | 11734 | 味方の盤面 | HTML #scr-battle #ally-section div.field-label | なし | コードから表示 |
| index.html | 11746 | カード非表示 | HTML #scr-battle #main-hand-area #hand-pane #board-card-visibility-btn span.bcv-label | 同文: 「カード非表示」ボタン | コードから表示 |
| index.html | 11749 | デバッグカード一覧 | HTML #debug-card-palette / aria-label | なし | コードから表示 |
| index.html | 11784 | 魔導板の使い方 | HTML #scr-village #library-actions #library-howto-btn button. | 同文: 図書館「魔導板の使い方」ボタン / 図書館「魔導板の使い方」説明開始 | コードから表示 |
| index.html | 11786 | 所持金とライフ | HTML #village-status / aria-label | なし | コードから表示 |
| index.html | 11805 | 出発する | HTML #scr-village #village-move-btns #village-depart-btn span.rew-btn-label | 同文: 「出発する」ボタン | コードから表示 |
| index.html | 11811 | 編成 | HTML #scr-village #village-formation-btn button.btn.small | 同文: 「編成画面」見出し | コードから表示 |
| index.html | 11820 | 所持金とライフ | HTML #map-status / aria-label | なし | コードから表示 |
| index.html | 11831 | マップ無限再生を終了（デバッグ） | HTML #map-debug-map-btn / title | なし | コードから表示 |
| index.html | 11831 | 終了 | HTML #scr-map #map-debug-map-btn button.btn.small | 同文: 終了 | コードから表示 |
| index.html | 11838 | 旅の終焉 | HTML #scr-gameover #gameover-shell #gameover-results h1. | 同文: 「ゲームオーバー」見出し | コードから表示 |
| index.html | 11840 | 難易度 | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「難易度」見出し | コードから表示 |
| index.html | 11840 | ノーマル | HTML #scr-gameover #gameover-shell #gameover-results #go-difficulty span. | 同文: 難易度ノーマル | コードから表示 |
| index.html | 11841 | 到達地点 | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「到達地点」見出し | コードから表示 |
| index.html | 11842 | 最終戦闘 | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「最終戦闘」見出し | コードから表示 |
| index.html | 11843 | 味方死亡回数 | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「味方死亡回数」見出し | コードから表示 |
| index.html | 11844 | 最大ダメージ | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「最大ダメージ」見出し | コードから表示 |
| index.html | 11844 | 0 ダメージ | HTML #scr-gameover #gameover-shell #gameover-results #go-damage span. | なし | コードから表示 |
| index.html | 11845 | 最大ステータス | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「最大ステータス」見出し | コードから表示 |
| index.html | 11846 | プレイ時間 | HTML #scr-gameover #gameover-shell #gameover-results b. | 同文: 「プレイ時間」見出し | コードから表示 |
| index.html | 11848 | 再挑戦 | HTML #scr-gameover #gameover-shell #gameover-results #gameover-actions #gameover-retry-btn button.btn | 同文: 「再挑戦」ボタン | コードから表示 |
| index.html | 11848 | 続ける | HTML #scr-gameover #gameover-shell #gameover-results #gameover-actions #gameover-continue-btn button.btn | 同文: 「続ける」ボタン | コードから表示 |
| index.html | 11848 | タイトルに戻る | HTML #scr-gameover #gameover-shell #gameover-results #gameover-actions #gameover-back-btn button.btn | 同文: 「タイトルに戻る」ボタン | コードから表示 |
| js/battle/core.js | 349 | (X×${boon.dmgMul})ダメージ | 表示設定 / coreBoonDisplayText | なし | コードから表示 |
| js/battle/core.js | 359 | （戦闘修正の増加量×${boon.modMul}） | 表示設定 / coreBoonDisplayText | なし | コードから表示 |
| js/battle/core.js | 361 | (X+${boon.manaDelta})マナ | 表示設定 / coreBoonDisplayText | なし | コードから表示 |
| js/battle/core.js | 362 | マナを(X+${boon.manaDelta})得る | 表示設定 / coreBoonDisplayText | なし | コードから表示 |
| js/battle/core.js | 1122 | ${Math.max(1,(Number(value)\|\|0)-reduction)}マナ${every\|\|''} | coreMapPanelPowerDisplayCard / desc / 表示設定 / coreMapPanelPowerAdjustManaText | なし | コードから表示 |
| js/battle/core.js | 3411 | 青シャドウ | coreSummonUnit / name | なし | コードから表示 |
| js/battle/core.js | 3432 | 青シャドウ | coreFlushPendingLichSummons / name | なし | コードから表示 |
| js/battle/core.js | 3564 | 青ワイルドハント | coreApplyOpeningItems / name | なし | コードから表示 |
| js/battle/core.js | 4591 | 青スケルトン | coreApplyAttackEffectsInner skeleton / name | なし | コードから表示 |
| js/battle/core.js | 4607 | 黒マッドキャット | coreApplyAttackEffectsInner / name | なし | コードから表示 |
| js/battle/core.js | 4847 | 黄ナイトキャット | coreApplyInjuryEffectsBody / name | なし | コードから表示 |
| js/battle/core.js | 4852 | 黒ケルピー | coreApplyInjuryEffectsBody / name | なし | コードから表示 |
| js/battle/core.js | 5569 | 青スケルトン | coreApplyDeathEffectsInner / name | なし | コードから表示 |
| js/battle/core.js | 5593 | 青シャドウ | coreApplyDeathEffectsInner / name | なし | コードから表示 |
| js/battle/core.js | 5598 | 青スケルトン | coreApplyDeathEffectsInner / name | なし | コードから表示 |
| js/battle/core.js | 5946 | 赤イフリート | coreApplyAttackRing efreet / name | なし | コードから表示 |
| js/battle/core.js | 6682 | マナ： | resolveThreshold rewardGrowth / desc / resolveThreshold → rewardGrowth.desc | なし | コードから表示 |
| js/battle/core.js | 6946 | 緑ウルフ | resolveThreshold resolveThreshold / name | なし | コードから表示 |
| js/battle/present.js | 2179 | 開戦の登場（着地の砂煙） | 表示設定 PRESENT_DIRECT_LAB_FX / name | なし | コードから表示 |
| js/engine/activation.js | 105 | 起動可 | wireCardActivation → label.textContent / wireCardActivation / シート文言の予備 | 「起動可」表示（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/activation.js | 105 | 起動可 | wireCardActivation → label.textContent | 「起動可」表示（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/arena.js | 399 | 闘技場 | _arenaPrepareReception fac / name | 同文: 街「闘技場」ボタン / 「闘技場」説明開始 | コードから表示 |
| js/engine/arena.js | 409 | 闘技場 | _arenaFinish talk / name | 同文: 街「闘技場」ボタン / 「闘技場」説明開始 | コードから表示 |
| js/engine/audio.js | 902 | ミュート解除 | toggleDebugMute → btn.textContent | なし | コードから表示 |
| js/engine/audio.js | 902 | ミュート | toggleDebugMute → btn.textContent | なし | コードから表示 |
| js/engine/battle_intro.js | 47 | 闘技場 | _battleStartIntroText の表示値 / _battleStartIntroText / subtitle | 同文: 街「闘技場」ボタン / 「闘技場」説明開始 | コードから表示 |
| js/engine/battle_intro.js | 47 | 闘技場 | _battleStartIntroText の表示値 / _battleStartIntroText / subtitle | 同文: 街「闘技場」ボタン / 「闘技場」説明開始 | コードから表示 |
| js/engine/battle_intro.js | 266 | 敗北 | showBattleCutin / シート文言の予備 / showBattleCutin → overlay.innerHTML / showBattleCutin / HTML | 戦闘結果「敗北」（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/battle_panel_formation.js | 430 | 召喚 | _makePanelSummonUnit / name | なし | コードから表示 |
| js/engine/blessing_flame.js | 3 | 祝福の炎 | 表示設定 BLESSING_FLAME_CONFIG / name | なし | コードから表示 |
| js/engine/blessing_flame.js | 7 | 魔導板のキャラクターかエンチャント1枚を強化する。 | 表示設定 BLESSING_FLAME_CONFIG / text / 表示設定 BLESSING_FLAME_CONFIG / description | なし | コードから表示 |
| js/engine/blessing_flame.js | 8 | この炎の祝福は、すでに失われた。 | 表示設定 BLESSING_FLAME_CONFIG / text / blessingFlameRenderPreview → help.textContent | なし | コードから表示 |
| js/engine/blessing_flame.js | 9 | 強化するカードを1枚選んでください。 | 表示設定 BLESSING_FLAME_CONFIG / text / blessingFlameRenderPreview → help.textContent | なし | コードから表示 |
| js/engine/blessing_flame.js | 10 | 強化しました。「元に戻す」で選び直せます。 | 表示設定 BLESSING_FLAME_CONFIG / text / blessingFlameRenderPreview → help.textContent | なし | コードから表示 |
| js/engine/blessing_flame.js | 11 | 祝福を離れる | 表示設定 BLESSING_FLAME_CONFIG / text / blessingFlameRenderControls / シート文言の予備 | 「祝福を離れる」ボタン（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/blessing_flame.js | 11 | 強化後のカード | 表示設定 BLESSING_FLAME_CONFIG / text | なし | コードから表示 |
| js/engine/card_reveal.js | 28 | 通常 | 表示設定 CARD_REVEAL_TIERS / label | 同文: 「演出速度」項目1 | コードから表示 |
| js/engine/card_reveal.js | 30 | 青の縁光 | 表示設定 CARD_REVEAL_TIERS / label | なし | コードから表示 |
| js/engine/card_reveal.js | 32 | 黄金の掃光 | 表示設定 CARD_REVEAL_TIERS / label | なし | コードから表示 |
| js/engine/card_reveal.js | 34 | 秘術 | 表示設定 CARD_REVEAL_TIERS / label | なし | コードから表示 |
| js/engine/card_reveal.js | 36 | 炸裂 | 表示設定 CARD_REVEAL_TIERS / label | なし | コードから表示 |
| js/engine/collection.js | 21 | コレクション | 表示設定 COLLECTION_TEXTS / title | コレクション（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/collection.js | 21 | コレクション | コレクション / title / 表示設定 COLLECTION_TEXTS / title /  / キー付き表示設定 | コレクション（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/collection.js | 27 | 強化 | コレクション / merge | なし | コードから表示 |
| js/engine/collection.js | 30 | 前のカード | コレクション / previous / applyCollectionTexts / aria-label | なし | コードから表示 |
| js/engine/collection.js | 31 | 次のカード | コレクション / next / applyCollectionTexts / aria-label | なし | コードから表示 |
| js/engine/collection.js | 32 | 未発見 | コレクション / unseen / _collectionCardCell / aria-label | なし | コードから表示 |
| js/engine/collection.js | 260 | キーワード：${keywords.join(' / ')} | _collectionDescriptionHtml の表示値 / _collectionRenderDetail → desc.innerHTML | なし | コードから表示 |
| js/engine/enemy.js | 127 | ゴブリン | _pickEnemyDef / name | なし | コードから表示 |
| js/engine/game_confirm.js | 22 | aria-label: オプション | _ensureGameConfirm → root.innerHTML / _ensureGameConfirm / HTML | なし | コードから表示 |
| js/engine/main.js | 166 | オンライン対戦 | 表示設定 SHEET_DOM_TITLES / fallback | オンライン対戦（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/main.js | 167 | コレクション | 表示設定 SHEET_DOM_TITLES / fallback | コレクション（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/main.js | 310 | ミュート解除 | _positionDebugMuteButton → btn.textContent | なし | コードから表示 |
| js/engine/main.js | 310 | ミュート | _positionDebugMuteButton → btn.textContent | なし | コードから表示 |
| js/engine/main.js | 467 | 接続条件を満たす初期カード3枚を選べませんでした。 | _giveInitialRandomBoardCards / エラー（表示は呼出元に依存） | なし | コードから表示 |
| js/engine/main.js | 1359 | デバッグモード | _syncTitleStartLabel → label.textContent | なし | コードから表示 |
| js/engine/main.js | 1361 | デバッグオンライン | _syncTitleStartLabel → onlineLabel.textContent | なし | コードから表示 |
| js/engine/main.js | 1371 | オンライン対戦 | _syncTitleStartLabel → onlineLabel.textContent / _syncTitleStartLabel / シート文言の予備 | オンライン対戦（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/main.js | 1371 | オンライン対戦 | _syncTitleStartLabel → onlineLabel.textContent | オンライン対戦（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/main.js | 1371 | オンライン対戦 | _syncTitleStartLabel → onlineLabel.textContent | オンライン対戦（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/main.js | 1709 | 編成画面に戻る | _renderGameOverResults → back.textContent | なし | コードから表示 |
| js/engine/main.js | 2302 | タイトルに戻る | showFatalError / buttonFallback | 同文: 「タイトルに戻る」ボタン | コードから表示 |
| js/engine/main.js | 2351 | ✓ データを読み込みました | (無名関数) → msgEl.textContent | なし | コードから表示 |
| js/engine/main.js | 2352 | ⚠ オフライン：内蔵データで起動します | (無名関数) → msgEl.textContent | なし | コードから表示 |
| js/engine/main.js | 2450 | ✓ 最新のエクセル能力（表記・戦闘効果）を現在の盤面に直接ドッキングしました！ | (無名関数) → pSuccess.innerHTML | なし | コードから表示 |
| js/engine/map.js | 13 | 召喚の力 | 表示設定 MAP_PANEL_POWERS / name | なし | コードから表示 |
| js/engine/map.js | 13 | 置いたカードがキャラクターなら開戦時に場に出る。 | 表示設定 MAP_PANEL_POWERS / desc | なし | コードから表示 |
| js/engine/map.js | 14 | 闇の力 | 表示設定 MAP_PANEL_POWERS / name | なし | コードから表示 |
| js/engine/map.js | 14 | 置いたカードがキャラクターならそのキャラクターが持つ封印の値を3減らして、開戦時に場に出す。 | 表示設定 MAP_PANEL_POWERS / desc | なし | コードから表示 |
| js/engine/map.js | 15 | 永劫の力 | 表示設定 MAP_PANEL_POWERS / name | なし | コードから表示 |
| js/engine/map.js | 15 | 置いたカードがキャラクターなら、開戦時に場に出して永久に+1/+1を与える。 | 表示設定 MAP_PANEL_POWERS / desc | なし | コードから表示 |
| js/engine/map.js | 16 | 魔の力 | 表示設定 MAP_PANEL_POWERS / name | なし | コードから表示 |
| js/engine/map.js | 16 | 置いたカードがキャラクターならそのキャラクターが持つマナ効果の値を1減らして、開戦時に場に出す。（但し、最低値は1） | 表示設定 MAP_PANEL_POWERS / desc | なし | コードから表示 |
| js/engine/map.js | 17 | 複製の力 | 表示設定 MAP_PANEL_POWERS / name | なし | コードから表示 |
| js/engine/map.js | 17 | 置いたカードがキャラクターなら、開戦時に場に出てコピーを1体生成する。 | 表示設定 MAP_PANEL_POWERS / desc | なし | コードから表示 |
| js/engine/map.js | 165 | 戻る | guardRingExchangeDeparture / buttonFallback | 同文: 「戻る」ボタン | コードから表示 |
| js/engine/map.js | 516 | アイテムの売買ができる。 | villageFacilityDescText の表示値 / villageFacilityList / desc | なし | コードから表示 |
| js/engine/map.js | 517 | ライフを回復できる。 | villageFacilityDescText の表示値 / villageFacilityList / desc | 同文: 街「宿屋」直下 | コードから表示 |
| js/engine/map.js | 518 | クエストを受けることができる。 | villageFacilityDescText の表示値 / villageFacilityList / desc | なし | コードから表示 |
| js/engine/map.js | 519 | 腕試しができる。 | villageFacilityDescText の表示値 / villageFacilityList / desc | 同文: 街「闘技場」直下 | コードから表示 |
| js/engine/map.js | 521 | カード3枚と引き換えに指輪1つを得る。 | villageFacilityDescText の表示値 / villageFacilityList / desc | なし | コードから表示 |
| js/engine/map.js | 522 | ひと息つける。 | villageFacilityDescText の表示値 / villageFacilityList / desc | なし | コードから表示 |
| js/engine/map.js | 523 | ひと息つける。 | villageFacilityDescText の表示値 / villageFacilityList / desc | なし | コードから表示 |
| js/engine/map.js | 533 | 魔導取引所 | villageFacilityLabelText の表示値 / villageFacilityList / label | 同文: 「魔導取引所」見出し / 街「魔導取引所」ボタン / 「魔導取引所」説明開始 | コードから表示 |
| js/engine/map.js | 1085 | 街 | renderWorldMapScreen → main.textContent | なし | コードから表示 |
| js/engine/map.js | 1413 | 五聖の座 | renderVillageScreen → main.textContent | 同文: 「五聖の座」見出し / 塔「五聖の座」ボタン | コードから表示 |
| js/engine/map.js | 1415 | 塔 | renderVillageScreen → main.textContent | なし | コードから表示 |
| js/engine/map.js | 1416 | 街 | renderVillageScreen → main.textContent | なし | コードから表示 |
| js/engine/map.js | 1476 | ミュート解除 | renderVillageScreen → mute.textContent | なし | コードから表示 |
| js/engine/map.js | 1476 | ミュート | renderVillageScreen → mute.textContent | なし | コードから表示 |
| js/engine/map.js | 1548 | 塔 | _playVillageEnterIntro → mainEl.textContent | なし | コードから表示 |
| js/engine/map.js | 1549 | 街 | _playVillageEnterIntro → mainEl.textContent | なし | コードから表示 |
| js/engine/options.js | 12 | 「オプション」見出し | 表示設定 _optionLabels / title | なし | コードから表示 |
| js/engine/peddler.js | 30 | トレーダー | defeatPeddlerTitle / シート文言の予備 | 「行商人」見出し（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/peddler.js | 136 | トレーダー | runDefeatPeddlerEvent / namePlateText | 同文: 「トレーダー」見出し | コードから表示 |
| js/engine/quest_event_flow.js | 21 | ${_qText('「店を出る」ボタン',currentLabel)} | _qCustomizeTavernVillage → depart.innerHTML / _qCustomizeTavernVillage / HTML | なし | コードから表示 |
| js/engine/quest_event_flow.js | 56 | ${_qText(accepted?(_qConfig(entry).acceptButtonKey\|\|'「受託」ボタン'):'「拒否」ボタン','')} | syncTavernFormationControls → button.innerHTML / syncTavernFormationControls / HTML | なし | コードから表示 |
| js/engine/quest.js | 445 | ${_qText(accepted?'「受諾」ボタン':'「拒否」ボタン',accepted?'受諾':'拒否')} | syncFiveSaintsFormationControls → button.innerHTML / syncFiveSaintsFormationControls / HTML | なし | コードから表示 |
| js/engine/quest.js | 1021 | ${_qDebugShortTownName(item.wave)}の${button.dataset.questDebugDir==='next'?'次':'前'}のクエスト | _qDebugRender / aria-label | なし | コードから表示 |
| js/engine/quest.js | 1021 | 次 | _qDebugRender / aria-label | なし | コードから表示 |
| js/engine/quest.js | 1021 | 前 | _qDebugRender / aria-label | なし | コードから表示 |
| js/engine/render_card_display.js | 86 | このキャラクターは敵から与えられる状態異常を${value}回無効化する。 | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 89 | 結界 | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 91 | 効果なし | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 94 | キャラクターにダメージを与えた時、そのキャラクターに毒${v}を与える。 | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 98 | キャラクターにダメージを与えた時、そのキャラクターに毒${v}を与える。 | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 100 | このキャラクターが与えたダメージ分、HPを増加する。 | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 102 | 攻撃/ダメージ効果で対象に弱体${s.replace('衝撃','')}を付与する。 | _enchantKeywordDesc の表示値 / _enchantmentEffectsList / text | なし | コードから表示 |
| js/engine/render_card_display.js | 212 | 邪眼 | _enchantCharacterDescription の表示値 / _groupedEnchantEffectTexts / text | なし | コードから表示 |
| js/engine/render_card_display.js | 212 | 毒牙 | _enchantCharacterDescription の表示値 / _groupedEnchantEffectTexts / text | なし | コードから表示 |
| js/engine/render_card_display.js | 212 | 衝撃 | _enchantCharacterDescription の表示値 / _groupedEnchantEffectTexts / text | なし | コードから表示 |
| js/engine/render_card_display.js | 600 | ${shownKeywords.join(isSummon?'と':'・')}を持つ | ringDisplayDesc の表示値 / _rawSubstitutedDesc の表示値 / computeDesc の表示値 | なし | コードから表示 |
| js/engine/render_card_display.js | 600 | と | ringDisplayDesc の表示値 / _rawSubstitutedDesc の表示値 / computeDesc の表示値 | なし | コードから表示 |
| js/engine/render_card_display.js | 603 | ${shown(atk)}/${shown(hp)}の | ringDisplayDesc の表示値 / _rawSubstitutedDesc の表示値 / computeDesc の表示値 | なし | コードから表示 |
| js/engine/render_card_display.js | 660 | （あと${remaining}戦） | _battleEndCountdownDescription の表示値 / _rawSubstitutedDesc の表示値 / computeDesc の表示値 | なし | コードから表示 |
| js/engine/render_card_display.js | 679 | （状態異常：毒${Math.max(0,Number(shownPoison)\|\|0)}） | _rawSubstitutedDesc の表示値 / computeDesc の表示値 | なし | コードから表示 |
| js/engine/render_card_display.js | 748 | aria-label: レアリティ${rarity} | cardRarityBannerHtml の表示値 / cardRarityBannerHtml / HTML | なし | コードから表示 |
| js/engine/render_card_display.js | 818 | キーワード：${_adjKws.join(' / ')} | mkCardEl / data-preview | なし | コードから表示 |
| js/engine/render_tooltip_helpers.js | 12 | 結界 | _shieldDisplayText の表示値 / _formatKeywordOnlyHtml の表示値 | なし | コードから表示 |
| js/engine/render_tooltip_helpers.js | 23 | alt: マナ | _formatJourneyEnemyHtml / HTML / toHtml の表示値 / _formatJourneyEnemyHtml の表示値 / _formatPreviewHtml の表示値 / _formatPreviewHtml / HTML / _formatKeywordOnlyHtml の表示値 / _formatMapPowerHtml の表示値 | なし | コードから表示 |
| js/engine/render_tooltip_helpers.js | 30 | alt: 血 | _formatJourneyEnemyHtml / HTML / toHtml の表示値 / _formatJourneyEnemyHtml の表示値 / _formatPreviewHtml の表示値 / _formatPreviewHtml / HTML / _formatKeywordOnlyHtml の表示値 / _formatMapPowerHtml の表示値 | なし | コードから表示 |
| js/engine/render.js | 2111 | alt: マナ | renderManaHud → hud.innerHTML / renderManaHud / HTML | なし | コードから表示 |
| js/engine/render.js | 2111 | alt: マナ | renderManaHud → hud.innerHTML / renderManaHud / HTML | なし | コードから表示 |
| js/engine/render.js | 2852 | 戦闘終了 | renderControls → pp.textContent | なし | コードから表示 |
| js/engine/reward_board_editor.js | 59 | title: ${_escapePreviewHtml(typeof _lifeLabelText==='function'?_lifeLabelText():'ライフ')} ${Math.max(0,unit.hp\|\|0)}/${_hpMax} | _renderFieldRow / HTML / _renderFieldRow → div.innerHTML | なし | コードから表示 |
| js/engine/reward_board_editor.js | 59 | ライフ | _renderFieldRow / HTML / _renderFieldRow → div.innerHTML | 同文: 「ライフ枠」見出し | コードから表示 |
| js/engine/reward_board_editor.js | 564 | 全体${i+1} | renderHeRow _slotDef / label | なし | コードから表示 |
| js/engine/reward_board_editor.js | 655 | ${_uiLabel('「返却」ボタン','返却')} | renderHeRow / HTML / renderHeRow → div.innerHTML | なし | コードから表示 |
| js/engine/reward_board_editor.js | 659 | ${_uiLabel('「別れる」ボタン','別れる')} | renderHeRow / HTML / renderHeRow → div.innerHTML | なし | コードから表示 |
| js/engine/reward_board_editor.js | 664 | ${_uiLabel('「廃棄」ボタン','廃棄')} | renderHeRow / HTML / renderHeRow → div.innerHTML | なし | コードから表示 |
| js/engine/reward_board_editor.js | 664 | 廃棄 | renderHeRow / HTML / renderHeRow / シート文言の予備 / renderHeRow → div.innerHTML | 「廃棄」ボタン（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/reward_board_editor.js | 726 | キーワード：${_adjKws.join(' / ')} | renderHeRow / data-preview | なし | コードから表示 |
| js/engine/reward_debug.js | 147 | ${tab('character','キャラ')}${tab('enchant','強化')}${tab('item','アイテム')}${tab('ring','指輪')}${title}回転 | renderDebugCardPalette → host.innerHTML / renderDebugCardPalette / HTML | なし | コードから表示 |
| js/engine/reward_debug.js | 147 | キャラ | renderDebugCardPalette → host.innerHTML / renderDebugCardPalette / HTML | なし | コードから表示 |
| js/engine/reward_debug.js | 147 | 強化 | renderDebugCardPalette → host.innerHTML / renderDebugCardPalette / HTML | なし | コードから表示 |
| js/engine/reward_debug.js | 147 | アイテム | renderDebugCardPalette → host.innerHTML / renderDebugCardPalette / HTML | 同文: 「アイテム枠」見出し | コードから表示 |
| js/engine/reward_debug.js | 147 | 指輪 | renderDebugCardPalette → host.innerHTML / renderDebugCardPalette / HTML | なし | コードから表示 |
| js/engine/reward_journey.js | 75 | 村 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_journey.js | 75 | 村 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_journey.js | 80 | 祭壇 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | 同文: 「祭壇」見出し / 塔「祭壇」ボタン | コードから表示 |
| js/engine/reward_journey.js | 80 | 祭壇 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | 同文: 「祭壇」見出し / 塔「祭壇」ボタン | コードから表示 |
| js/engine/reward_journey.js | 82 | エリート | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_journey.js | 82 | ボス | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_journey.js | 120 | 最終決戦 | _journeyCountdownHtml の表示値 / _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | なし | コードから表示 |
| js/engine/reward_journey.js | 120 | 祭壇 | _journeyCountdownHtml の表示値 / _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | 同文: 「祭壇」見出し / 塔「祭壇」ボタン | コードから表示 |
| js/engine/reward_journey.js | 171 | data-journey-scene="${n}"${cycle?&#96; data-journey-cycle="${cycle}" aria-label="${cycle}周目 ステージ${n}"&#96;:''}<br>aria-label: ${cycle}周目 ステージ${n} | buildSceneMarks / HTML / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_journey.js | 171 | data-journey-cycle="${cycle}" aria-label="${cycle}周目 ステージ${n}"<br>aria-label: ${cycle}周目 ステージ${n} | buildSceneMarks / HTML / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_journey.js | 177 | ${cycle}周目${buildSceneMarks(cycle===1?4:5,cycle)} | _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | なし | コードから表示 |
| js/engine/reward_offer_cards.js | 74 | 指輪 | _renderRingOfferCards / data-preview | なし | コードから表示 |
| js/engine/reward.js | 13 | 魔導取引所：カード交換 | 表示設定 SHOP_EXCHANGE_TRIAL / text / 表示設定 SHOP_EXCHANGE_TRIAL / shopIntro | なし | コードから表示 |
| js/engine/reward.js | 15 | 店のカードを、魔導板上のカードへドラッグすると交換できます。 | 表示設定 SHOP_EXCHANGE_TRIAL / text / 表示設定 SHOP_EXCHANGE_TRIAL / shopSteps | なし | コードから表示 |
| js/engine/reward.js | 16 | 空きマスには置けません。交換の回数・カードの種類に制限はなく、ゴールドも使いません。 | 表示設定 SHOP_EXCHANGE_TRIAL / text / 表示設定 SHOP_EXCHANGE_TRIAL / shopSteps | なし | コードから表示 |
| js/engine/reward.js | 17 | 店へ渡したカードも再び交換できます。品揃えと交換結果は、この街へ再訪しても残ります。 | 表示設定 SHOP_EXCHANGE_TRIAL / text / 表示設定 SHOP_EXCHANGE_TRIAL / shopSteps | なし | コードから表示 |
| js/engine/reward.js | 19 | 指輪の交換が必要です | 表示設定 SHOP_EXCHANGE_TRIAL / text / 表示設定 SHOP_EXCHANGE_TRIAL / ringTitle | なし | コードから表示 |
| js/engine/reward.js | 20 | 出発する前に、塔の祭壇でカードを捧げて指輪を取得してください。 | 表示設定 SHOP_EXCHANGE_TRIAL / text | なし | コードから表示 |
| js/engine/reward.js | 1091 | 配置を戻せません | _showInitialCardMissingError → showErrorOverlay / _showInitialCardMissingError / title / _showInitialCardMissingError / シート文言の予備 | 「初期カード不存在時」見出し（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/reward.js | 1094 | 戻る | _showInitialCardMissingError / buttonFallback | 同文: 「戻る」ボタン | コードから表示 |
| js/engine/reward.js | 1169 | ${_uiLabel('「配置を戻す」ボタン','配置を戻す')} | _placementResetButton → reset.innerHTML / _placementResetButton / HTML | なし | コードから表示 |
| js/engine/reward.js | 1303 | 戻る | _showNoDeployableCharacterError / buttonFallback | 同文: 「戻る」ボタン | コードから表示 |
| js/engine/reward.js | 1343 | ${_uiLabel('「進む」ボタン','進む')} | renderMoveSlotsInEnemy → next.innerHTML / renderMoveSlotsInEnemy / HTML | なし | コードから表示 |
| js/engine/reward.js | 1351 | ${_uiLabel('「試験戦闘」ボタン','試験戦闘')} | renderMoveSlotsInEnemy → test.innerHTML / renderMoveSlotsInEnemy / HTML | なし | コードから表示 |
| js/engine/reward.js | 1361 | ${_uiLabel('「元に戻す」ボタン','元に戻す')} | renderMoveSlotsInEnemy → restore.innerHTML / renderMoveSlotsInEnemy / HTML | なし | コードから表示 |
| js/engine/reward.js | 1370 | ${_uiLabel('「読書をやめる」ボタン','読書をやめる')} | renderMoveSlotsInEnemy → quit.innerHTML / renderMoveSlotsInEnemy / HTML | なし | コードから表示 |
| js/engine/reward.js | 1478 | ${_uiLabel('「元に戻す」ボタン','元に戻す')} | renderMoveSlotsInEnemy → reset.innerHTML / renderMoveSlotsInEnemy / HTML | なし | コードから表示 |
| js/engine/reward.js | 1706 | トレーダー | _syncRewardTitleLabel → el.textContent | 同文: 「トレーダー」見出し | コードから表示 |
| js/engine/reward.js | 1707 | 魔導取引所 | _syncRewardTitleLabel → el.textContent | 同文: 「魔導取引所」見出し / 街「魔導取引所」ボタン / 「魔導取引所」説明開始 | コードから表示 |
| js/engine/reward.js | 1711 | 魔導取引所 | _syncRewardTitleLabel / シート文言の予備 / _syncRewardTitleLabel → el.textContent | 「魔導店」見出し（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/reward.js | 1712 | 魔導取引所 | _syncRewardTitleLabel → el.textContent | 「魔導店」見出し（未収録／動的） | キー未収録・予備文が表示 |
| js/engine/reward.js | 1716 | 魔導取引所 | _syncRewardTitleLabel → el.textContent | 同文: 「魔導取引所」見出し / 街「魔導取引所」ボタン / 「魔導取引所」説明開始 | コードから表示 |
| js/engine/reward.js | 1784 | 指輪 | _syncRewardProductionRings / data-preview | なし | コードから表示 |
| js/engine/reward.js | 1910 | ${esc(title\|\|_uiLabel('「指輪枠」見出し','指輪'))}${esc(desc)} | _showRewardRingTooltip → tip.innerHTML / _showRewardRingTooltip / HTML | なし | コードから表示 |
| js/engine/reward.js | 2623 | 封印${Math.max(1,mergedSeal-sealReduction)} | _tryTripleMergeOnBoard → target.desc | なし | コードから表示 |
| js/engine/run_levels.js | 6 | ATKレベル | 表示設定 RUN_LEVEL_CONFIG / names / runLevelRenderReward → heading.textContent / runLevelRenderReward → values.textContent | なし | コードから表示 |
| js/engine/run_levels.js | 6 | HPレベル | 表示設定 RUN_LEVEL_CONFIG / names / runLevelRenderReward → heading.textContent / runLevelRenderReward → values.textContent | なし | コードから表示 |
| js/engine/run_levels.js | 13 | レベル報酬 | 表示設定 RUN_LEVEL_CONFIG / title | なし | コードから表示 |
| js/engine/run_levels.js | 13 | レベル報酬（受け取り済み） | 表示設定 RUN_LEVEL_CONFIG / receivedTitle / runLevelRenderReward → heading.textContent | なし | コードから表示 |
| js/engine/tower_boon.js | 3 | 祝福の座（仮） | 表示設定 TOWER_BOON_CONFIG / name | なし | コードから表示 |
| js/engine/tower_boon.js | 3 | ゴールドを捧げ、これから出会うカードに祝福を授ける。 | 表示設定 TOWER_BOON_CONFIG / description | なし | コードから表示 |
| js/engine/tower_boon.js | 8 | 塔に戻る | 表示設定 TOWER_BOON_CONFIG / text | なし | コードから表示 |
| js/engine/tower_boon.js | 8 | 再抽選（残{count}） | 表示設定 TOWER_BOON_CONFIG / text / towerBoonRerollButtonState / label | なし | コードから表示 |
| js/engine/tower_boon.js | 9 | （祝福：召喚する眷属のATKとHPは{mul}倍） | 表示設定 TOWER_BOON_CONFIG / text | なし | コードから表示 |
| js/engine/tower_boon.js | 11 | （祝福：増加量+{delta}、0は変更なし） | 表示設定 TOWER_BOON_CONFIG / text | なし | コードから表示 |
| js/engine/tower_boon.js | 14 | 今後のキャラクターカードのATKとHPが{multiplier}倍 | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 15 | 今後のカードの戦闘修正を正の値は+{modifierStep}、負の値は-{modifierStep} | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 16 | 今後のカードの効果ダメージが{multiplier}倍 | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 17 | 今後のカードから得られるマナが+{manaStep} | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 18 | 今後のカードが出す眷属のATKとHPが{multiplier}倍 | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 19 | このランで倒したボスが報酬とショップに出現する | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 20 | 報酬ごとに再抽選権を{rerollsPerStack}回得る | 表示設定 TOWER_BOON_CONFIG / label | なし | コードから表示 |
| js/engine/tower_boon.js | 160 | 再抽選（${SHOP_REROLL_COST}G） | towerBoonRerollButtonState / label | なし | コードから表示 |
| js/online/board.js | 362 | 敗北 | _playResultCutin / defeatLabel | 同文: 闘技場戦闘結果「敗北」 | コードから表示 |
| js/online/server_local.js | 114 | 対戦相手${i + 1} | _makeOpponentFormation / name | なし | コードから表示 |
| js/save/migrations.js | 57 | 多段攻撃 | normalizeMergedMultiAttack out / name | なし | コードから表示 |
| js/save/migrations.js | 66 | 呪いの指輪 | normalizeCurseRing normalizeCurseRing / name | なし | コードから表示 |
| js/save/migrations.js | 68 | 開戦：全ての敵は+5/+5を得る。 | normalizeCurseRing normalizeCurseRing / desc | なし | コードから表示 |
| js/save/migrations.js | 133 | このセーブは新しいゲーム版で作成されています | migrate / エラー（表示は呼出元に依存） | なし | コードから表示 |
| js/save/run_save.js | 76 | 不正な数値: ${key} | copy / エラー（表示は呼出元に依存） | なし | コードから表示 |
| js/save/run_save.js | 77 | 関数を保存できません: ${key} | copy / エラー（表示は呼出元に依存） | なし | コードから表示 |
| js/save/run_save.js | 79 | 保存できないオブジェクト: ${key} | copy / エラー（表示は呼出元に依存） | なし | コードから表示 |
| js/save/run_save.js | 359 | タイトルに戻る | showSaveError SaveRun / buttonFallback | 同文: 「タイトルに戻る」ボタン | コードから表示 |

## 動的キーを使う予備文（呼出時のキー確認用）

| ファイル | 行 | 文 | どこに出るか | テキストメッセージ表の対応キー | 読み取り状態 |
| --- | ---: | --- | --- | --- | --- |

## 参考: シートを読む予備文・上書き前の初期表示

| ファイル | 行 | 文 | どこに出るか | テキストメッセージ表の対応キー | 読み取り状態 |
| --- | ---: | --- | --- | --- | --- |
| index.html | 2973 | 所持金 | CSS content / body.reward-screen-active #reward-info-bar .ri-soul:first-child::before, body:not(.reward-screen-active) #reward-info-bar .ri-soul:first-child::before | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4696 | 報酬カード | CSS content / html body.reward-screen-active #reward-offer-section::before | 「編成画面の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4710 | 商品 | CSS content / html body.reward-screen-active.shop-screen-active #reward-offer-section::before | 「魔導取引所の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4714 | 商品 | CSS content / html body.reward-screen-active.item-shop-active #reward-offer-section::before | 「道具屋の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4717 | 貸出カード | CSS content / html body.reward-screen-active.library-formation-active #reward-offer-section::before | 「図書館の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4720 | 魔導板強化 | CSS content / html body.reward-screen-active.forge-screen-active #reward-offer-section::before | 「鍛冶屋の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4724 | 祭壇 | CSS content / html body.reward-screen-active.ring-offer-phase #reward-offer-section::before | 「祭壇の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 4733 | 3枚のカードを捧げれば、1つを選んで獲得可能 | CSS content / html body.reward-screen-active.ring-offer-phase #reward-offer-section::after | 「祭壇」説明文1（あり） | シート読込済みの予備／初期表示 |
| index.html | 4749 | 対価の力は与えられた | CSS content / html body.reward-screen-active.ring-offer-phase.ring-offer-resolved #reward-offer-section::after | 「祭壇」説明文2（あり） | シート読込済みの予備／初期表示 |
| index.html | 4860 | 魔導板 | CSS content / html body.reward-screen-active #hand-pane::before | 「魔導板枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 5465 | 魔導板 | CSS content / html body.reward-screen-active #hand-pane::before | 「魔導板枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 8855 | 魔導板 | CSS content / html body.gameover-active #gameover-board-grid>#hand-pane::before | 「魔導板枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11521 | ゲームスタート | HTML #scr-title #title-menu span.title-menu-label | ゲームスタート（あり） | シート読込済みの予備／初期表示 |
| index.html | 11522 | コンティニュー | HTML #scr-title #title-menu #title-continue-btn span.title-menu-label | コンティニュー（あり） | シート読込済みの予備／初期表示 |
| index.html | 11525 | 終了 | HTML #scr-title #title-menu span.title-menu-label | 終了（あり） | シート読込済みの予備／初期表示 |
| index.html | 11641 | 所持金 | HTML #scr-battle #battle-status-hud span.battle-status-label.status-label-gold | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11645 | ライフ | HTML #scr-battle #battle-status-hud span.battle-status-label.status-label-life | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11657 | アイテム | HTML #scr-battle #reward-production-ui h2. | 「アイテム枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11661 | 指輪 | HTML #scr-battle #reward-production-ui h2. | 「指輪枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11665 | クエスト | HTML #scr-battle #reward-production-ui h2. | 「クエスト枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11672 | 旅の進捗 | HTML #scr-battle #reward-production-ui h2. | 「旅程枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11677 | 所持金 | HTML #scr-battle #reward-production-ui h2. | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11789 | 所持金 | HTML #scr-village #village-status span.battle-status-label.status-label-gold | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11793 | ライフ | HTML #scr-village #village-status span.battle-status-label.status-label-life | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11823 | 所持金 | HTML #scr-map #map-status span.battle-status-label.status-label-gold | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| index.html | 11827 | ライフ | HTML #scr-map #map-status span.battle-status-label.status-label-life | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/arena.js | 279 | 闘技場 | _arenaShowContinueConfirm → showGameConfirm / _arenaShowContinueConfirm / title / _arenaShowContinueConfirm / シート文言の予備 | 「闘技場継戦確認」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/arena.js | 280 | 次の戦闘へ進みますか？（賞金：XG） | _arenaShowContinueConfirm → showGameConfirm / _arenaShowContinueConfirm / message / _arenaShowContinueConfirm / シート文言の予備 | 闘技場継戦確認（あり） | シート読込済みの予備／初期表示 |
| js/engine/arena.js | 281 | 続ける | _arenaShowContinueConfirm → showGameConfirm / _arenaShowContinueConfirm / okLabel / _arenaShowContinueConfirm / シート文言の予備 | 「続ける」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/arena.js | 282 | やめる | _arenaShowContinueConfirm → showGameConfirm / _arenaShowContinueConfirm / cancelLabel / _arenaShowContinueConfirm / シート文言の予備 | 「やめる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 36 | 戦 闘 開 始 | _battleStartIntroText の表示値 / _battleStartIntroText / title / _battleStartIntroText / シート文言の予備 | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 37 | 試験戦闘 | _battleStartIntroText の表示値 / _battleStartIntroText / subtitle / _battleStartIntroText / シート文言の予備 | 「試験戦闘」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 43 | 闘技場 | _battleStartIntroText / シート文言の予備 / _battleStartIntroText の表示値 / _battleStartIntroText / subtitle | 街「闘技場」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 43 | 闘技場 | _battleStartIntroText の表示値 / _battleStartIntroText / subtitle | 街「闘技場」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 45 | 再 戦 | _battleStartIntroText / シート文言の予備 / _battleStartIntroText の表示値 / _battleStartIntroText / title | 「再戦」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 46 | 戦 闘 開 始 | _battleStartIntroText / シート文言の予備 / _battleStartIntroText の表示値 / _battleStartIntroText / title | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 58 | 再 戦 | _battleStartIntroText の表示値 / _battleStartIntroText / title / _battleStartIntroText / シート文言の予備 | 「再戦」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 59 | 戦 闘 開 始 | _battleStartIntroText の表示値 / _battleStartIntroText / title / _battleStartIntroText / シート文言の予備 | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 264 | 勝利 | showBattleCutin / シート文言の予備 / showBattleCutin → overlay.innerHTML / showBattleCutin / HTML | 戦闘結果「勝利」（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 265 | 撤退 | showBattleCutin / シート文言の予備 / showBattleCutin → overlay.innerHTML / showBattleCutin / HTML | 戦闘結果「撤退」（あり） | シート読込済みの予備／初期表示 |
| js/engine/battle_intro.js | 267 | 戦 闘 開 始 | showBattleCutin / シート文言の予備 / showBattleCutin → overlay.innerHTML / showBattleCutin / HTML | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/blessing_flame.js | 11 | 実行 | 表示設定 BLESSING_FLAME_CONFIG / text / blessingFlameRenderControls / シート文言の予備 | 「実行」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/blessing_flame.js | 11 | キャンセル | 表示設定 BLESSING_FLAME_CONFIG / text / blessingFlameRenderControls / シート文言の予備 | 「キャンセル」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/blessing_flame.js | 157 | 元に戻す | blessingFlameRenderControls / シート文言の予備 | 「元に戻す」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/collection.js | 22 | キャラクター | コレクション / character /  / キー付き表示設定 | 「キャラクター」タブ（あり） | シート読込済みの予備／初期表示 |
| js/engine/collection.js | 23 | エンチャント | コレクション / enchant /  / キー付き表示設定 | 「エンチャント」タブ（あり） | シート読込済みの予備／初期表示 |
| js/engine/collection.js | 24 | エネミー | コレクション / enemy /  / キー付き表示設定 | 「エネミー」タブ（あり） | シート読込済みの予備／初期表示 |
| js/engine/collection.js | 25 | リング / アイテム | コレクション / equipment /  / キー付き表示設定 | 「リング / アイテム」タブ（あり） | シート読込済みの予備／初期表示 |
| js/engine/collection.js | 28 | タイトルに戻る | コレクション / return /  / キー付き表示設定 | 「タイトルに戻る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/game_confirm.js | 44 | キャンセル | showGameConfirm → cancel.textContent / showGameConfirm / シート文言の予備 | 「キャンセル」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 115 | 所持金 | 表示設定 STATUS_TOOLTIPS / title | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 115 | 街で買い物や鍛冶に利用できる。 | 表示設定 STATUS_TOOLTIPS / fallback | 全画面「所持金枠」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 118 | ライフ | 表示設定 STATUS_TOOLTIPS / title | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 118 | ライフが0になるとゲームオーバーになる。 | 表示設定 STATUS_TOOLTIPS / fallback | 全画面「ライフ枠」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 121 | マナ | 表示設定 STATUS_TOOLTIPS / title | 「マナ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 121 | マナ効果の発動に必要。 | 表示設定 STATUS_TOOLTIPS / fallback | 戦闘画面「マナ枠」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 123 | 血 | 表示設定 STATUS_TOOLTIPS / title | 「血枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 124 | 味方が死ぬと増加する。封印されたキャラクターの解放や、一部のカード効果の発動に必要。 | 表示設定 STATUS_TOOLTIPS / fallback | 戦闘画面「血枠」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 150 | 旅の進捗 | 表示設定 SHEET_DOM_TITLES / fallback | 「旅程枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 151 | 図書館 | 表示設定 SHEET_DOM_TITLES / fallback | 街「図書館」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 152 | 図書館から出る | 表示設定 SHEET_DOM_TITLES / fallback | 「図書館を出る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 153 | アイテム | 表示設定 SHEET_DOM_TITLES / fallback | 「アイテム枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 154 | 指輪 | 表示設定 SHEET_DOM_TITLES / fallback | 「指輪枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 155 | クエスト | 表示設定 SHEET_DOM_TITLES / fallback | 「クエスト枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 156 | 旅の進捗 | 表示設定 SHEET_DOM_TITLES / fallback | 「旅程枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 157 | 所持金 | 表示設定 SHEET_DOM_TITLES / fallback | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 160 | 所持金 | 表示設定 SHEET_DOM_TITLES / fallback | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 161 | ライフ | 表示設定 SHEET_DOM_TITLES / fallback | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 164 | ゲームスタート | 表示設定 SHEET_DOM_TITLES / fallback | ゲームスタート（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 165 | コンティニュー | 表示設定 SHEET_DOM_TITLES / fallback | コンティニュー（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 168 | 終了 | 表示設定 SHEET_DOM_TITLES / fallback | 終了（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 169 | エラー | 表示設定 SHEET_DOM_TITLES / fallback | 「エラー発生時」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 170 | タイトルに戻る | 表示設定 SHEET_DOM_TITLES / fallback | 「タイトルに戻る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 171 | オプション | 表示設定 SHEET_DOM_TITLES / fallback | 「オプション」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1355 | ゲームスタート | _titleStartLabel / シート文言の予備 / _syncTitleStartLabel → label.textContent | ゲームスタート（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1684 | 難易度 | _renderGameOverResults / キー付き表示設定 | 「難易度」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1684 | 到達地点 | _renderGameOverResults / キー付き表示設定 | 「到達地点」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1685 | 最終戦闘 | _renderGameOverResults / キー付き表示設定 | 「最終戦闘」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1685 | 味方死亡回数 | _renderGameOverResults / キー付き表示設定 | 「味方死亡回数」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1686 | 最大ダメージ | _renderGameOverResults / キー付き表示設定 | 「最大ダメージ」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1686 | 最大ステータス | _renderGameOverResults / キー付き表示設定 | 「最大ステータス」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1687 | プレイ時間 | _renderGameOverResults / キー付き表示設定 | 「プレイ時間」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1694 | ノーマル | _renderGameOverResults → document.getElementById('go-difficulty').textContent / _renderGameOverResults / シート文言の予備 | 難易度ノーマル（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1703 | 完全勝利 | _renderGameOverResults → resultTitle.textContent / _renderGameOverResults / シート文言の予備 | オンライン対戦「完全勝利」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1704 | 踏破 | _renderGameOverResults → resultTitle.textContent / _renderGameOverResults / シート文言の予備 | 「クリア」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1705 | 旅の終焉 | _renderGameOverResults → resultTitle.textContent / _renderGameOverResults / シート文言の予備 | 「ゲームオーバー」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1710 | タイトルに戻る | _renderGameOverResults → back.textContent / _renderGameOverResults / シート文言の予備 | 「タイトルに戻る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1718 | 再挑戦 | _renderGameOverResults → retry.textContent / _renderGameOverResults / シート文言の予備 | 「再挑戦」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1725 | 続ける | _renderGameOverResults → continueBtn.textContent / _renderGameOverResults / シート文言の予備 | 「続ける」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1945 | 進む | _armBattleContinue → label.textContent / _armBattleContinue / シート文言の予備 | 「進む」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 1945 | 進む | _armBattleContinue → label.textContent | 「進む」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 2220 | 予期しないエラーが発生しました。<br>続行できないため、タイトル画面へ戻ります。<br><br>エラーコード： | _fatalErrorMessage の表示値 / _fatalErrorMessage / シート文言の予備 / showFatalError → showErrorOverlay / showFatalError / message | エラー発生時（あり） | シート読込済みの予備／初期表示 |
| js/engine/main.js | 2263 | エラー | showErrorOverlay → titleEl.textContent / showErrorOverlay / シート文言の予備 | 「エラー発生時」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1387 | 魔導板の使い方 | renderVillageScreen → btn.textContent / renderVillageScreen / シート文言の予備 | 図書館「魔導板の使い方」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1396 | 魔導板の使い方を確認する。 | renderVillageScreen → desc.textContent / renderVillageScreen / シート文言の予備 | 図書館「魔導板の使い方」直下（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1467 | 出発する | renderVillageScreen / シート文言の予備 / renderVillageScreen → depart.innerHTML / renderVillageScreen / HTML / renderVillageScreen → labelEl.textContent | 「出発する」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1700 | 図書館 | openMapLibraryMenu / シート文言の予備 | 街「図書館」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1828 | 図書館 | openMapLibraryFormation / シート文言の予備 | 街「図書館」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1904 | 魔導板の使い方 | startLibraryBoardTutorial / introText / startLibraryBoardTutorial / シート文言の予備 | 図書館「魔導板の使い方」説明開始（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1919 | カードは魔導板に置くことで所持できます。多くのカードは、魔導板に置かれているだけで効果を発揮します。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」1（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1920 | ここ、図書館ではカードを借りて戦闘の練習を行うことができます。これから上の貸出カードを使って、実際に編成してみましょう。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」2（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1921 | 下部に数字が書かれたカードは「キャラクターカード」です。左下の数字がATK（攻撃力）、右下の数字がHP（体力）を表します。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」3（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1922 | キャラクターカードは「召喚の力」マスに置くことで戦闘に参加します。上段の「召喚の力」マスに置いたキャラクターは前衛、下段に置いたキャラクターは後衛になります。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」4-1（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1923 | 貸出キャラクターの「リザードマン」を下段中央の「召喚の力」マスに置いてみましょう。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」4-2（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1924 | それ以外のカードは「エンチャントカード」です。エンチャントカードとキャラクターカードの矢印を向かい合わせると、そのキャラクターにエンチャントの効果を与えられます。これを「リンク」と呼びます。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」5-1（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1925 | 貸出エンチャントの「野生の力」を魔導板に置き、先ほど配置したキャラクターと矢印を向かい合わせてみましょう。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」5-2（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1926 | エンチャントカード同士の矢印を向かい合わせると、その繋がりを通してキャラクターに効果を与えられます。ただし、キャラクターカードは効果を通さないため、キャラクター同士を繋いでも効果はありません。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」5-3（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1927 | 戦闘ではキャラクターが多い陣営が先攻となり、前衛の左端から敵味方が交互に行動します。攻撃対象はランダムな敵前衛となり、前衛がいない場合はランダムな後衛を攻撃します。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」6（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1928 | 相手を全滅させれば勝利です。敗北するとライフを1つ失い、ライフがなくなるとゲームオーバーです。それでは、試験戦闘を行ってみましょう。 | _libraryBoardTutorialSteps / チュートリアル本文 | 「魔導板の使い方」7（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 1985 | 闘技場 | _maybeStartArenaTutorial / introText / _maybeStartArenaTutorial / シート文言の予備 | 「闘技場」説明開始（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 2758 | 改造「X」 | renderMapForgeOffers / シート文言の予備 / renderMapForgeOffers / data-preview | 鍛冶屋「魔導板強化」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 2758 | 改造「X」 | renderMapForgeOffers / data-preview | 鍛冶屋「魔導板強化」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 2759 | 改造「X」 | renderMapForgeOffers / data-preview | 鍛冶屋「魔導板強化」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 2768 | ゴールド不足 | renderMapForgeOffers → shortage.textContent / renderMapForgeOffers / シート文言の予備 | ショップ「ゴールド不足」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/map.js | 2768 | ゴールド不足 | renderMapForgeOffers → shortage.textContent | ショップ「ゴールド不足」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 12 | オプション | 表示設定 _optionLabels / title /  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「オプション」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 12 | 現在設定 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「現在設定」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 12 | ゲーム設定 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「ゲーム設定」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 13 | 演出速度 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「演出速度」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 13 | グラフィック設定 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「グラフィック設定」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 13 | 表示モード |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「表示モード」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 14 | 言語設定 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「言語設定」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 14 | 表示言語 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「表示言語」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 14 | サウンド設定 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「サウンド設定」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 15 | BGM ボリューム |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「BGM ボリューム」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 15 | SE ボリューム |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「SE ボリューム」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 15 | データ管理 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「データ管理」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 16 | セーブデータの削除 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「セーブデータの削除」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 16 | システムデータの削除 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「システムデータの削除」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 17 | ※ラン中は削除できません。 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | データ管理注釈（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 17 | 実行 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「実行」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 17 | 保存して戻る |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「保存して戻る」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 17 | 戻る |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「戻る」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 18 | 元に戻す |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「元に戻す」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 18 | タイトルに戻る |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「タイトルに戻る」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 18 | 削除実行 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionSetText → document.getElementById('options-confirm-delete').textContent / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「削除実行」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 19 | キャンセル |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionSetText → document.getElementById('options-confirm-cancel').textContent / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「キャンセル」ボタン（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 19 | 警告 |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionSetText → document.getElementById('options-confirm-title').textContent / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | 「データ削除時」見出し（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 19 | 直前のランのデータを削除します。<br>この操作は取り消すことができません。<br>本当に削除してよろしいですか？ |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | セーブデータ削除時（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 20 | コレクションと履歴のデータを削除します。<br>この操作は取り消すことができません。<br>本当に削除してよろしいですか？ |  / キー付き表示設定 / _optionSetText → el.textContent / _optionSetText / シート文言の予備 / _optionConfirm → document.getElementById('options-confirm-message').textContent / _optionConfirm / シート文言の予備 | システムデータ削除時（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 24 | 通常 |  / キー付き表示設定 / _optionSetText → box.querySelector('span').textContent / _optionSetText / シート文言の予備 / _optionCurrent / シート文言の予備 / _optionRender → box.querySelector('span').textContent / _optionRender / シート文言の予備 / _optionRender → el.textContent | 「演出速度」項目1（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 24 | 2倍速 |  / キー付き表示設定 / _optionCurrent / シート文言の予備 / _optionRender → box.querySelector('span').textContent / _optionRender / シート文言の予備 / _optionRender → el.textContent | 「演出速度」項目2（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 24 | 3倍速 |  / キー付き表示設定 / _optionCurrent / シート文言の予備 / _optionRender → box.querySelector('span').textContent / _optionRender / シート文言の予備 / _optionRender → el.textContent | 「演出速度」項目3（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 25 | フルスクリーン |  / キー付き表示設定 / _optionCurrent / シート文言の予備 / _optionRender → box.querySelector('span').textContent / _optionRender / シート文言の予備 / _optionRender → el.textContent | 「表示モード」項目4（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 26 | 日本語 |  / キー付き表示設定 / _optionSetText → box.querySelector('span').textContent / _optionSetText / シート文言の予備 / _optionCurrent / シート文言の予備 / _optionRender → box.querySelector('span').textContent / _optionRender / シート文言の予備 / _optionRender → el.textContent | 「表示言語」項目1（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/options.js | 26 | 中文 |  / キー付き表示設定 / _optionCurrent / シート文言の予備 / _optionRender → box.querySelector('span').textContent / _optionRender / シート文言の予備 / _optionRender → el.textContent | 「表示言語」項目3（あり） / 動的キー（未収録／動的） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 220 | 五聖の座 | fiveSaintsRewardTitle / シート文言の予備 | 「五聖の座」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 223 | 力の枷 | fiveSaintsRewardSlotTitle / シート文言の予備 | 「五聖の座の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 393 | 五聖の座 | _fiveSaintsShowScene / シート文言の予備 | 塔「五聖の座」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 445 | 受諾 | syncFiveSaintsFormationControls → button.innerHTML / syncFiveSaintsFormationControls / HTML / syncFiveSaintsFormationControls / シート文言の予備 | 「受諾」ボタン（あり） / 「拒否」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 445 | 拒否 | syncFiveSaintsFormationControls → button.innerHTML / syncFiveSaintsFormationControls / HTML / syncFiveSaintsFormationControls / シート文言の予備 | 「受諾」ボタン（あり） / 「拒否」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 467 | 五聖の座 | _fiveSaintsOpenFormationNow / シート文言の予備 | 塔「五聖の座」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 1008 | クエスト | _qDebugRender / シート文言の予備 | 「クエスト枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 1009 | 保存して戻る | _qDebugRender → save.textContent / _qDebugRender / シート文言の予備 | 「保存して戻る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 1698 | 警告 | questGuardLeave / title / questGuardLeave / シート文言の予備 | 「クエスト失敗警告」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/quest.js | 1698 | キャンセル | questGuardLeave / cancelLabel / questGuardLeave / シート文言の予備 | 「キャンセル」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/render_tooltip_helpers.js | 8 | ライフ | _lifeLabelText の表示値 / _lifeLabelText / シート文言の予備 | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/render_tooltip_helpers.js | 8 | ライフ | _lifeLabelText の表示値 | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_board_editor.js | 655 | 返却 | renderHeRow / HTML / renderHeRow / シート文言の予備 / renderHeRow → div.innerHTML | 「返却」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_board_editor.js | 659 | 別れる | renderHeRow / HTML / renderHeRow / シート文言の予備 / renderHeRow → div.innerHTML | 「別れる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_items.js | 834 | 使う | _openItemUseConfirm / label / _openItemUseConfirm / シート文言の予備 | 「使う」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_items.js | 835 | 捨てる | _openItemUseConfirm / label / _openItemUseConfirm / シート文言の予備 | 「捨てる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_items.js | 841 | やめる | _openItemUseConfirm / label / _openItemUseConfirm / シート文言の予備 | 「やめる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 68 | 編成 | _journeyNodeLabel の表示値 / _journeyNodeLabel / シート文言の予備 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | 「編成画面」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 68 | 編成 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | 「編成画面」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 70 | 戦闘 | _journeyNodeLabel の表示値 / _journeyNodeLabel / シート文言の予備 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | オンライン対戦編成画面「戦闘」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 70 | 戦闘 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | オンライン対戦編成画面「戦闘」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 82 | 一般戦闘 | _journeyNodeLabel の表示値 / _journeyNodeLabel / シート文言の予備 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | 編成画面「一般戦闘」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 82 | 一般戦闘 | _journeyNodeLabel の表示値 / _syncRewardJourneyUi / HTML / _syncRewardJourneyUi → root.innerHTML | 編成画面「一般戦闘」説明文（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 116 | 〜に到達 | _journeyCountdownHtml / シート文言の予備 / _journeyCountdownHtml の表示値 / _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | 「編成画面、ショップ画面の旅程枠」内 塔到達時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 118 | 最終決戦まで、あと X 戦 | _journeyCountdownHtml / シート文言の予備 / _journeyCountdownHtml の表示値 / _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | 「編成画面、ショップ画面の旅程枠」内 ステージ5時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 119 | 〜まであとX戦 | _journeyCountdownHtml / シート文言の予備 / _journeyCountdownHtml の表示値 / _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | 「編成画面、ショップ画面の旅程枠」内 通常時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 233 | 次の対戦相手はX | _syncRewardJourneyUi / シート文言の予備 / _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | オンライン対戦「次の対戦相手」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_journey.js | 233 | 次の対戦相手はX | _syncRewardJourneyUi → root.innerHTML / _syncRewardJourneyUi / HTML | オンライン対戦「次の対戦相手」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_offer_cards.js | 122 | 売切 | _mkShopSoldOutDiv → label.textContent / _mkShopSoldOutDiv / シート文言の予備 | ショップ「売切」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_offer_cards.js | 134 | 貸出中 | _mkLibraryLoanedOutDiv → label.textContent / _mkLibraryLoanedOutDiv / シート文言の予備 | 図書館「貸出中」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_offer_cards.js | 229 | ゴールド不足 | _mkRewDiv → shortBadgeItem.textContent / _mkRewDiv / シート文言の予備 | ショップ「ゴールド不足」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward_offer_cards.js | 288 | 貸出 | _appendLibraryLoanBadge → badge.textContent / _appendLibraryLoanBadge / シート文言の予備 | 図書館「貸出」表示（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 46 | カード表示 | _syncBoardCardVisibilityToggle → label.textContent / _syncBoardCardVisibilityToggle / シート文言の予備 | 「カード表示」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 47 | カード非表示 | _syncBoardCardVisibilityToggle → label.textContent / _syncBoardCardVisibilityToggle / シート文言の予備 | 「カード非表示」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 402 | 捧げたカードを回収して祭壇を離れますか？ | _confirmRingExchangeReturn / シート文言の予備 / _confirmRingExchangeReturn → showGameConfirm / _confirmRingExchangeReturn / message | 「祭壇」途中離脱時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 403 | 捧げたカードを回収して祭壇を離れますか？ | _confirmRingExchangeReturn → showGameConfirm / _confirmRingExchangeReturn / message | 「祭壇」途中離脱時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 413 | 祭壇 | _confirmRingExchangeReturn → showGameConfirm / _confirmRingExchangeReturn / title / _confirmRingExchangeReturn / シート文言の予備 | 「祭壇」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 414 | キャンセル | _confirmRingExchangeReturn → showGameConfirm / _confirmRingExchangeReturn / cancelLabel / _confirmRingExchangeReturn / シート文言の予備 | 「キャンセル」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 826 | 所持金 | goToReward → goldLabel.textContent / goToReward / シート文言の予備 | 「所持金枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 853 | 貸出カード | goToReward / シート文言の予備 | 「図書館の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 854 | 報酬 | goToReward / シート文言の予備 | 「編成画面の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1092 | この画面になった時のカードがどこにも存在しません。<br>配置を戻すことは出来ませんでした。 | _showInitialCardMissingError → showErrorOverlay / _showInitialCardMissingError / message / _showInitialCardMissingError / シート文言の予備 | 初期カード不存在時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1169 | 配置を戻す | _placementResetButton → reset.innerHTML / _placementResetButton / HTML / _placementResetButton / シート文言の予備 | 「配置を戻す」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1300 | 戦闘不可 | _showNoDeployableCharacterError → showErrorOverlay / _showNoDeployableCharacterError / title / _showNoDeployableCharacterError / シート文言の予備 | 「戦闘キャラ不在時」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1301 | 戦闘可能なキャラクターがいません。<br>封印の効果を持たないキャラクターを1枚以上、召喚可能なマスに置いてください。 | _showNoDeployableCharacterError → showErrorOverlay / _showNoDeployableCharacterError / message / _showNoDeployableCharacterError / シート文言の予備 | 戦闘キャラ不在時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1324 | 報酬 | _confirmUnclaimedBattleReward → showGameConfirm / _confirmUnclaimedBattleReward / title / _confirmUnclaimedBattleReward / シート文言の予備 | 「編成画面の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1325 | 報酬カードをまだ取得していません。<br>このまま進みますか？ | _confirmUnclaimedBattleReward → showGameConfirm / _confirmUnclaimedBattleReward / message / _confirmUnclaimedBattleReward / シート文言の予備 | 報酬未入手時（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1343 | 進む | renderMoveSlotsInEnemy → next.innerHTML / renderMoveSlotsInEnemy / HTML / renderMoveSlotsInEnemy / シート文言の予備 | 「進む」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1351 | 試験戦闘 | renderMoveSlotsInEnemy → test.innerHTML / renderMoveSlotsInEnemy / HTML / renderMoveSlotsInEnemy / シート文言の予備 | 「試験戦闘」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1361 | 元に戻す | renderMoveSlotsInEnemy → restore.innerHTML / renderMoveSlotsInEnemy / HTML / renderMoveSlotsInEnemy / シート文言の予備 | 「元に戻す」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1370 | 読書をやめる | renderMoveSlotsInEnemy → quit.innerHTML / renderMoveSlotsInEnemy / HTML / renderMoveSlotsInEnemy / シート文言の予備 | 「読書をやめる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1396 | 戦闘待機中 | renderMoveSlotsInEnemy / シート文言の予備 | オンライン対戦「戦闘開始」ボタン（待機時）（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1400 | 選択完了 n/3 | renderMoveSlotsInEnemy / シート文言の予備 | オンライン対戦「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1405 | 再戦 | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「再戦」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1405 | 戦闘開始 | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1407 | 図書館を出る | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「図書館を出る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1408 | 祭壇を離れる | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「祭壇を離れる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1408 | 店を出る | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「店を出る」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1410 | 出発する | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「出発する」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1411 | 拒否 | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「拒否」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1478 | 元に戻す | renderMoveSlotsInEnemy → reset.innerHTML / renderMoveSlotsInEnemy / HTML / renderMoveSlotsInEnemy / シート文言の予備 | 「元に戻す」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1514 | 戦闘待機中 | renderMoveSlotsInEnemy / シート文言の予備 | オンライン対戦「戦闘開始」ボタン（待機時）（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1518 | 戦闘待機中 | renderMoveSlotsInEnemy / シート文言の予備 | オンライン対戦「戦闘開始」ボタン（待機時）（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1522 | 選択完了 n/3 | renderMoveSlotsInEnemy / シート文言の予備 | オンライン対戦「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1527 | 再戦 | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「再戦」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1527 | 戦闘開始 | renderMoveSlotsInEnemy / シート文言の予備 / renderMoveSlotsInEnemy → btn.innerHTML / renderMoveSlotsInEnemy / HTML | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1689 | ライフ | _syncMoneyTurnTile → turnLabel.textContent / _syncMoneyTurnTile / シート文言の予備 | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1689 | ライフ | _syncMoneyTurnTile → turnLabel.textContent | 「ライフ枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1714 | 道具屋 | _syncRewardTitleLabel → el.textContent / _syncRewardTitleLabel / シート文言の予備 | 「道具屋」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1715 | 鍛治屋 | _syncRewardTitleLabel → el.textContent / _syncRewardTitleLabel / シート文言の予備 | 「鍛冶屋」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1717 | 祭壇 | _syncRewardTitleLabel → el.textContent / _syncRewardTitleLabel / シート文言の予備 | 「祭壇」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1718 | 編成 | _syncRewardTitleLabel → el.textContent / _syncRewardTitleLabel / シート文言の予備 | 「編成画面」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1722 | 貸出カード | _syncRewardTitleLabel / シート文言の予備 | 「図書館の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1723 | 報酬 | _syncRewardTitleLabel / シート文言の予備 | 「編成画面の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1868 | やめる | _openRingActionConfirm cancel / label / _openRingActionConfirm / シート文言の予備 | 「やめる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1872 | 有効化 | _openRingActionConfirm actions / label / _openRingActionConfirm / シート文言の予備 | 「有効化」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1872 | 無効化 | _openRingActionConfirm actions / label / _openRingActionConfirm / シート文言の予備 | 「無効化」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1878 | 捨てる | _openRingActionConfirm actions / label / _openRingActionConfirm / シート文言の予備 | 「捨てる」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1886 | 指輪 | _openRingActionConfirm / シート文言の予備 | 「指輪枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1910 | 指輪 | _showRewardRingTooltip → tip.innerHTML / _showRewardRingTooltip / HTML / _showRewardRingTooltip / シート文言の予備 | 「指輪枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1938 | 貸出カード | renderRewCards → rewardSectionLabel.textContent / renderRewCards / シート文言の予備 | 「図書館の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1940 | 依頼人 | renderRewCards → rewardSectionLabel.textContent / renderRewCards / シート文言の予備 | 「酒場の報酬枠」見出し1（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 1941 | 報酬 | renderRewCards → rewardSectionLabel.textContent / renderRewCards / シート文言の予備 | 「編成画面の報酬枠」見出し（あり） | シート読込済みの予備／初期表示 |
| js/engine/reward.js | 2101 | 返品 | _shopReturnLabel の表示値 / _shopReturnLabel / シート文言の予備 | 「返品」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 29 | このキャラクターからダメージを受けたキャラクターは即死する。（備考：結界で防がれた場合は不発。） | キーワード説明の初期値 / 即死 | キーワード表:即死（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 30 | このキャラクターにダメージを与えたキャラクターは即死する。（備考：攻撃者が「加護」を持つ場合は不発。） | キーワード説明の初期値 / 呪詛 | キーワード表:呪詛（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 31 | このキャラクターからダメージを受けたキャラクターのATKはX減少する。（備考：結界で防がれた場合は不発。） | キーワード説明の初期値 / 邪眼 | キーワード表:邪眼（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 32 | このキャラクターからダメージを受けたキャラクターに「毒X」を付与する。（備考：結界で防がれた場合は不発。） | キーワード説明の初期値 / 毒牙 | キーワード表:毒牙（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 33 | このキャラクターからダメージを受けたキャラクターに「弱体X」を付与する。 | キーワード説明の初期値 / 衝撃 | キーワード表:衝撃（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 34 | このキャラクターが受ける1以上のダメージはX増加する。 | キーワード説明の初期値 / 弱体 | キーワード表:弱体（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 35 | このキャラクターは攻撃を行う前にHP-Xする。 | キーワード説明の初期値 / 毒 | キーワード表:毒（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 36 | このキャラクターはダメージをX回無効化する。 | キーワード説明の初期値 / 結界 | キーワード表:結界（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 37 | このキャラクターは攻撃できず、いかなる効果も受けない。血がX以上になると解放される。 | キーワード説明の初期値 / 封印 | キーワード表:封印（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 38 | このキャラクターは死亡した時、一度だけATKとHPを半分にして召喚する。 | キーワード説明の初期値 / 復活 | キーワード表:復活（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 39 | このキャラクターは死亡ダメージを受ける時、一度だけHP1で生き残る。 | キーワード説明の初期値 / 根性 | キーワード表:根性（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 40 | このキャラクターはダメージを与えた時、その分のHPを得る。 | キーワード説明の初期値 / 生命吸収 | キーワード表:生命吸収（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 41 | このキャラクターは「先制」を持たない敵よりも先にダメージを与える。（備考：先に相手を倒した場合、反撃ダメージを受けない。） | キーワード説明の初期値 / 先制 | キーワード表:先制（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 42 | このキャラクターは攻撃しない。 | キーワード説明の初期値 / 防戦 | キーワード表:防戦（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 43 | このキャラクターは戦闘中のHP変化が永続化する。また、死亡、逃走した場合は消滅する。 | キーワード説明の初期値 / 帰滅 | キーワード表:帰滅（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 44 | このキャラクターは「隠密」を持たないキャラクターがいる限り、敵の攻撃の対象にならない。 | キーワード説明の初期値 / 隠密 | キーワード表:隠密（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 45 | このキャラクターはダメージ以外の効果を受けない。 | キーワード説明の初期値 / 加護 | キーワード表:加護（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 46 | このキャラクターは攻撃後、再攻撃する。（備考：一回目で対象が死んだ場合、他の相手キャラクターに攻撃する。） | キーワード説明の初期値 / 二段攻撃 | キーワード表:二段攻撃（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 47 | このキャラクターは攻撃後、2回再攻撃する。 | キーワード説明の初期値 / 三段攻撃 | キーワード表:三段攻撃（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 48 | このキャラクターの攻撃は、全ての敵にダメージを与える。 | キーワード説明の初期値 / 全体攻撃 | キーワード表:全体攻撃（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 49 | このキャラクターの攻撃は、対象に隣接する2体にもダメージを与える。 | キーワード説明の初期値 / 三方向攻撃 | キーワード表:三方向攻撃（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 50 | このキャラクターの前衛のキャラクターへの攻撃は、後衛のキャラクターにもダメージを与える。（備考：対象と接する後衛キャラクターにダメージを与える。最大3人。） | キーワード説明の初期値 / 貫通 | キーワード表:貫通（あり） | シート読込済みの予備／初期表示 |
| js/engine/state.js | 51 | 戦闘中に他のカードの効果で新たに召喚された。復活や変身では付与、解除されず、そのまま引き継がれる。 | キーワード説明の初期値 / 眷属 | キーワード表:眷属（あり） | シート読込済みの予備／初期表示 |
| js/online/board.js | 663 | 戦闘開始 | _renderOnlineVersusEvent / シート文言の予備 / _renderOnlineVersusEvent / title | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/online/board.js | 663 | 戦 闘 開 始 | _renderOnlineVersusEvent / title | 「戦闘開始」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/online/hud.js | 38 | 残り時間 | _el → timerLabel.textContent / _el / シート文言の予備 | オンライン対戦「残り時間」見出し（あり） | シート読込済みの予備／初期表示 |
| js/online/hud.js | 38 | 残り時間 | _el → timerLabel.textContent | オンライン対戦「残り時間」見出し（あり） | シート読込済みの予備／初期表示 |
| js/online/matching.js | 72 | マッチング | _syncText → title.textContent / _syncText / シート文言の予備 | オンライン対戦「マッチング」見出し（あり） | シート読込済みの予備／初期表示 |
| js/online/matching.js | 73 | キャンセル | _syncText → back.textContent / _syncText / シート文言の予備 | 「キャンセル」ボタン（あり） | シート読込済みの予備／初期表示 |
| js/online/matching.js | 74 | 対戦開始！ | _syncText → start.textContent / _syncText / シート文言の予備 | オンライン対戦「対戦開始」表示（あり） | シート読込済みの予備／初期表示 |
| js/save/run_save.js | 354 | エラー | showSaveError / シート文言の予備 / showSaveError → showErrorOverlay / showSaveError SaveRun / title | 「エラー発生時」見出し（あり） | シート読込済みの予備／初期表示 |
| js/save/run_save.js | 354 | エラー | showSaveError → showErrorOverlay / showSaveError SaveRun / title | 「エラー発生時」見出し（あり） | シート読込済みの予備／初期表示 |
| js/save/run_save.js | 368 | セーブに失敗しました。空き容量やブラウザの保存設定を確認してください。 | error / シート文言の予備 / error → showSaveError | セーブ失敗時（あり） | シート読込済みの予備／初期表示 |
| js/save/run_save.js | 462 | セーブデータを再開できませんでした。 | continueRun / シート文言の予備 / continueRun → showSaveError | セーブ再開失敗時（あり） | シート読込済みの予備／初期表示 |

## 参考: loaderが各シートで上書きするカード・アイテムの初期定義（未使用の旧定義を含む）

| ファイル | 行 | 文 | どこに出るか | テキストメッセージ表の対応キー | 読み取り状態 |
| --- | ---: | --- | --- | --- | --- |
| js/engine/pool.js | 166 | ノーム | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 166 | 終戦：5ゴールドを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 167 | マータ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 167 | 常時：味方が受ける2以上のダメージを1にし、1を超えた分をこのキャラクターが代わりに受ける。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 168 | ゴーレム | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 168 | 負傷：このキャラクターは+2/+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 169 | サテュロス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 169 | 1マナ：3マナを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 170 | ドワーフ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 170 | 2マナ毎：ランダムな赤キャラクター2体は+3/+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 171 | ラミア | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 171 | 攻撃：このキャラクターは+2/+1を得る。対象が負傷している場合、もう一度繰り返す。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 172 | コボルド | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 172 | 負傷：全ての赤キャラクターは+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 173 | アラクネ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 173 | 3マナ毎：全ての味方に+2/+2を与えた後、1ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 174 | ミノタウロス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 174 | 負傷：直ちにランダムな敵に攻撃する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 175 | ハーピー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 176 | サイレン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 176 | 攻撃：全てのキャラクターに1ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 177 | ギガンテス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 177 | 負傷：全ての味方はATK+Xを得る。Xは受けたダメージに等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 178 | フォルモール | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 178 | 負傷：ランダムな赤、青、緑キャラクター1体ずつは+2/+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 179 | タイタン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 179 | 開戦：全ての敵に弱体1を与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 180 | エティン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 180 | 常時：味方の負傷効果が発動するたび、このキャラクターは+2/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 181 | センチネル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 181 | 攻撃：「赤センチネル」以外のランダムな味方はHP+Xを得る。XはこのキャラクターのHPに等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 182 | メデューサ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 182 | 負傷：ランダムな敵にXダメージを与える。Xは受けたダメージに等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 183 | サイクロプス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 183 | 3マナ：全体攻撃を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 184 | ケンタウロス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 184 | 攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 185 | ヘカトンケイル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 185 | 負傷：10%の確率で1マナを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 186 | ゾンビ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 186 | 開戦：コピーを1体召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 187 | スケルトン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 187 | 復活 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 188 | マミー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 188 | 死亡：10ゴールドを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 189 | バンシー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 189 | 死亡：ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 190 | レイス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 190 | 死亡：ランダムな味方の負傷効果を発動する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 191 | スケルトンキング | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 191 | 復活<br>攻撃：「青スケルトン」を召喚し、このキャラクターの前に攻撃させる。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 192 | スペクター | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 192 | 2マナ毎：全ての青キャラクターはATK+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 193 | ゴースト | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 193 | 死亡：ランダムな青キャラクターは+2/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 194 | ファントム | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 194 | 死亡：この戦闘中、味方の眷属は+1/+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 195 | シャドウ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 195 | 攻撃：血が7以上なら全ての味方は+4/+4を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 196 | ワイルドハント | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 196 | （他の効果で召喚される「青ワイルドハント」も同じ強化を得る） | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 197 | ノスフェラトゥ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 197 | 隠密 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 198 | レムレース | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 198 | 死亡：「青レムレース」以外の、この戦闘で死亡したランダムなキャラクターをATKとHPを半分にして召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 199 | ヴリコラカス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 199 | 4マナ毎：ランダムな味方が復活を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 200 | ヴァンパイアロード | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 200 | 常時：キャラクターが死亡するたび、全ての味方はHP+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 201 | エイドロン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 201 | 負傷：この戦闘中、味方の眷属はATK+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 202 | デスナイト | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 202 | 死亡：「青スケルトン」を召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 203 | レヴナント | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 203 | 常時：味方が死亡するたび、このキャラクターは+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 204 | デュラハン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 204 | 常時：味方が死亡するたび、ランダムな敵に4ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 205 | ボーンチャリオット | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 205 | 死亡：ランダムな味方に「死亡：「青スケルトン」を召喚する。」を付与する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 206 | リッチ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 206 | 常時：味方が召喚された時、「青シャドウ」を1体召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 207 | グリムリーパー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 207 | 封印5　即死 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 208 | ダイアウルフ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 208 | 3マナ毎：「緑ウルフ」を召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 209 | スリープシープ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 209 | 死亡：血を3得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 210 | ブラウニー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 210 | 攻撃＆負傷：全ての仲間のHPが+2される。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 211 | エルフ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 211 | 結界1<br>負傷：結界1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 212 | ツインデビル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 212 | 開戦：コピーを1体召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 213 | アークデーモン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 213 | 封印12　解放：全ての紫のキャラクターは+1/+1を得る。このキャラクターに接続しているエンチャントの数だけ繰り返す。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 214 | アラッサス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 214 | 攻撃：全ての敵に4ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 215 | スリン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 215 | 毒牙3　邪眼3 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 216 | ミテーラ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 216 | 開戦：「緑ペリカン」を2体召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 217 | ジャッカロープ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 217 | 開戦：Xマナを得る。Xは味方の緑キャラクターの数に等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 218 | ユミル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 218 | 攻撃：+X/+Xを得る。Xはマナに等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 219 | マーメイド | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 219 | 常時：緑のキャラクターから得るマナは+1される。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 220 | ウルフ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 221 | ドラゴン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 221 | 全体攻撃 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 222 | ペリカン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 223 | バンダースナッチ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 223 | 6マナ：ランダムな敵を「緑ペリカン」に変身させる。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 224 | ハイドラ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 224 | 終戦：このキャラクター以外の、生存したキャラクターが報酬に出現する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 225 | スキュラ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 225 | 3マナ毎：全ての敵に毒12を与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 226 | ナーガ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 226 | 常時：味方の眷属が召喚された時、その眷属は+1/+1を得る。この戦闘で召喚された味方の眷属の数だけ繰り返す。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 227 | エルヴンメイジ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 227 | 攻撃：全ての黄キャラクターは+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 228 | タイタニア | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 228 | 常時：味方の攻撃回数は1回追加される。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 229 | ケットシー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 229 | 負傷：「黄ナイトキャット」を召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 230 | ナイトキャット | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 230 | 結界1 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 231 | イフリート | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 232 | カーバンクル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 232 | 常時：味方が結界を失うたび、全ての敵に1ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 233 | エレメンタル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 233 | 開戦：全ての色の味方がいる場合、生命吸収を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 234 | 逆襲 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 234 | 死亡：全ての味方は+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 235 | 大いなる守護 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 235 | 常時：このキャラクターはHP+5を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 236 | 内なる大力 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 236 | 常時：このキャラクターは+3/+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 237 | 闇の儀式 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 237 | 死亡：以後、召喚される同名のキャラクターを永久に+2/+2する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 238 | 執念の炎 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 238 | 根性（致死ダメージを受けた時、1度だけHP1で耐える） | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 239 | 闇の炎 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 239 | 死亡：全ての敵キャラクターに1ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 240 | 毒の刃 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 240 | 毒牙2（攻撃時にダメージを受ける毒を付与） | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 241 | 竜の契約 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 241 | 攻撃：ランダムな敵に5ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 242 | インプ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 242 | 攻撃：全てのキャラクターからATKを1奪う。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 243 | グレムリン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 243 | 負傷：全ての敵はATK-1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 244 | インキュバス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 244 | 負傷：全ての敵はATK-1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 245 | ガーゴイル | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 245 | 開戦：ランダムな黄、緑、紫キャラクター1体ずつは+5/+5を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 246 | ヘルハウンド | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 246 | 常時：敵が死んだ時、+1/+1を得る。この戦闘で死んだ敵の数だけ繰り返す。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 247 | ダークワン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 247 | 1マナ毎：ランダムな紫のキャラクターは+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 248 | ファミリア | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 248 | 攻撃：血が5以上なら2マナ得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 249 | サキュバス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 249 | 攻撃：このキャラクターが敵を倒した時、そのキャラクターを倒される直前の状態で召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 250 | ヘルナイト | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 250 | 攻撃：このキャラクターは+X/+Xを得る。Xは血に等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 251 | ウェンディゴ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 251 | 開戦：全ての敵は-1/-1を得る。この効果は、このキャラクターのHP10につき1回発生する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 252 | ヴォイド・ウォーカー | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 252 | 常時：紫のキャラクターが与える戦闘修正の値は1大きくなる。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 253 | カオス・インプ | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 253 | 常時：味方が解放された時、ランダムな味方の開戦効果を発動する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 254 | リリス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 254 | 開戦：ランダムな味方に結界を付与する。この効果は、このキャラクターのATK10につき1回発生する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 255 | ナイトメア | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 255 | 死亡：このキャラクターは封印Xを得て封印される。Xは現在の血の2倍に等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 256 | ベヒーモス | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 256 | 封印10 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 257 | オーバーロード | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 257 | 封印5　解放：このキャラクターの戦闘力を2倍にする。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 258 | アビス・バロン | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 258 | 封印4　解放：ランダムな敵に封印∞を付与する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 259 | フィーンド | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 259 | 封印2　解放：全ての敵に1ダメージを与える。このキャラクターに接続している強化カードの数だけ繰り返す。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 260 | ファナティック | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 260 | 常時：味方が解放された時、このキャラクターは+X/+Xと結界を得る。Xは血に等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 261 | 狂気 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 261 | 死亡：青マナを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 262 | 野生の力 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 262 | 召喚：緑マナを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 263 | 魔導回路 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 263 | 効果なし　三方向パネル | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 264 | 治癒能力 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 264 | 負傷：HP+2を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 265 | 遺産 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 265 | 死亡：1ゴールドを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 266 | マナの種 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 266 | 常時：このキャラクターのマナ効果は1回追加で発動する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 267 | 翡翠の壺 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 267 | 負傷：このキャラクター以外の、この効果を持つ全ての味方は+3/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 268 | 黄金の壺 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 268 | 常時：このカードを還魂すると、最大ライフが1増える。（6以上にはならない） | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 269 | 魔鏡 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 269 | 常時：このカードを還魂すると、200Gを獲得する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 270 | 恩寵 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 270 | 常時：このキャラクターの開戦効果は1回追加で発動する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 271 | 複製 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 271 | 開戦：このキャラクターの1/1のコピーを召喚する。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 272 | 錬成 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 272 | 開戦：ランダムなアイテムを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 273 | マナ生成 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 273 | 攻撃：1マナを得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 274 | 逆上 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 274 | 負傷：ランダムな敵に3ダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 275 | 剣技 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 275 | 攻撃：ATK+3を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 276 | 獰猛 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 276 | 常時：このキャラクターは+8/-3を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 277 | 怨念 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 277 | 死亡：ランダムな敵に自身の攻撃力に等しいダメージを与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 278 | 屍術 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 278 | 常時：キャラクターが死亡するたび、+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 281 | 多段攻撃 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 282 | 即死 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 283 | 三方向攻撃 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 284 | 邪眼 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 285 | 衝撃 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 286 | 先制 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 287 | 結界 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 288 | 全体攻撃 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 291 | 生命吸収 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 292 | 貫通 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 293 | 奇妙な絆 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 293 | 常時：このキャラクターは+X/+Xを得る。Xはこの効果を持つ味方の数に等しい。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 294 | 懺悔 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 294 | 攻撃：このキャラクターは1ダメージを2回受ける。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 295 | 活性化 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 295 | 1マナ毎：このキャラクターは+1/+1を得る。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 296 | 継承 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 296 | 死亡：このキャラクターのATKをランダムな味方に与える。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 297 | 咆哮 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 297 | 開戦：このキャラクターのATKを2倍にする。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 298 | 威光 | 表示設定 PANEL_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 298 | 開戦：このキャラクターのHPを2倍にする。 | 表示設定 PANEL_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 302 | 静寂の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 302 | 次の戦闘中、全ての敵は一度攻撃するまで全ての効果が無効化される。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 303 | 変身の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 303 | 対象のカード1枚を、対象の別のキャラクターに変身させる。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 304 | 盾の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 304 | 対象のキャラクターに結界1を永久付与する。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 305 | 幻視の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 305 | 対象のキャラクターに復活を永久付与する。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 306 | 巨大化の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 306 | 対象のキャラクターに+5/+5を永久付与する。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 307 | 隕石の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 307 | 次の戦闘開始時、隕石を落とす。全ての敵にHPの半分のダメージを与える。重複不可。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 308 | 生贄人形 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 308 | キャラクターを1枚破壊し、対象のキャラクターが持つ封印の値を永久に3減らす。（但し、最低値は1） | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 311 | 永劫の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 311 | 「召喚の力」マス上のキャラクターを1枚破壊し、そのマスを「永劫の力」マスに変化させる。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 312 | ポータルの巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 312 | 直前の村にワープする。再出発時は現在位置の次の場所に移動する。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 313 | 黄金の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 313 | 所持金を2倍にする。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 314 | 魔力の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 314 | 対象のキャラクターが持つマナ効果の値を永久に1減らす。（但し、最低値は1） | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 315 | 鼓舞の旗 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 315 | 対象のキャラクターに根性を永久付与する。 | 表示設定 ITEM_POOL / desc | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 318 | 絆の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |
| js/engine/pool.js | 319 | 召竜の巻物 | 表示設定 ITEM_POOL / name | なし | 各シートで上書きする初期定義 |

