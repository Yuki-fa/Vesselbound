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

- デバッグパレット（`#debug-card-palette`）のカードだけ`aspect-ratio:260/395`に強制されており、通常カード（`.card{aspect-ratio:569/983}`）と縦横比が異なるためフレーム画像が歪み、マナ/生贄アイコン（`.card-activation-costs`、位置は`left:4.6%;top:4.2%`の%指定）が絵柄に対してずれて見える不具合を修正。`.debug-palette-card`と`.debug-palette-card > .card`のaspect-ratioを`569/983`に統一（index.html）。またドラッグ時にさらにズレる件は、デバッグパレットのドラッグゴースト生成（`reward.js`のdragstartハンドラ）が他8箇所と異なり`.card`要素ではなくラッパーの`.debug-palette-card`（`cardWrap`）を`_createDragGhost()`に渡していたため、`#debug-card-palette`スコープ限定CSSがbody直下のゴーストに効かなくなっていたのが原因。`cardWrap`ではなく`cardEl`（`.card`要素自体）を渡すよう修正し、他箇所と統一。実機（getBoundingClientRectでの相対位置計算）で静止時・ドラッグ時とも通常カードと同じ4.6%/4.2%位置になることを確認済み。
- 戦闘開始時に「野生の力」を持つ味方のマナが2倍になる不具合を修正。`_afterPanelSummon()`内の野生の力マナ加算（`isInitialDeploy`ガード無し）と、開戦効果`_applyNewOpeningEffects()`内の同処理が両方とも初期配置時に実行され二重発動していたのが原因。`_afterPanelSummon()`側の加算に`!isInitialDeploy`ガードを追加し、開戦時の通常出撃では`_applyNewOpeningEffects()`側でのみ加算されるよう統一（battle.js）。実機（ダミーユニットで`_afterPanelSummon`→`_applyNewOpeningEffects`を直接実行）でマナ合計が2倍(4)から正しい値(2)になったことを確認済み。
- VFX（ダメージ/特殊演出/薙ぎ払い、z-index 10001〜10021）がホバー説明文（`#kw-tooltip`、旧z-index:9999）より手前に表示される不具合を修正。`#kw-tooltip`のz-indexを10100に変更（index.html）。また勝利/敗北確定後もVFXが残り続ける可能性への対策として、render.jsに`_forceStopAllVfx()`（`.damage-vfx-host`/`.special-vfx-clip`/`.sweep-vfx-clip`を強制除去し`__activeVfxPromises`をクリア）を新設し、`handleBattleDefeat()`（battle.js）と`showVictoryOverlay()`（main.js）の先頭で呼び出すよう追加。実機で強制除去の動作を確認済み。
- マナ・負傷効果の演出速度可変化を実装。合計発動予定回数（マナしきい値効果＋負傷効果を合算）が30回以上で3倍速、50回以上で5倍速にし、残り回数が10回以下になったら残り5回になるまでの間に徐々に等倍へ減速する仕組み（`_beginEffectPaceBurst`/`_stepEffectPace`、battle.js）を新設。`_checkManaThresholdUnitEffects()`と`applyDamageBatch()`（負傷効果ループ直前）でそれぞれ発動予定回数を事前見積もりして登録し、各発動直前に`_stepEffectPace()`で倍率を更新。`playHitVfxAtRect()`（render.js）が`G._effectVfxSpeedMultiplier`を見てhitDuration/fadeDuration/gateMsをこの倍率で短縮するよう変更（マナ・負傷以外の演出は倍率1のままなので無影響）。発動回数が有限に定まらない（Infinity等）場合は100回とみなしてクランプ。実機でtotal=40→3倍速→終盤減速→1倍、total=60→5倍速→終盤減速→1倍、Infinity/巨大値→100クランプ、playHitVfxAtRectのgateMs実測（200ms→約40ms@5倍速）を確認済み。
- 上記4件はfile://環境でのスクリプトキャッシュにより実機確認時に更新が反映されない事象があったため、index.htmlのbattle.js/render.js/reward.js/main.jsの`<script src>`バージョンクエリを更新（`?v=effectpace1`等）。
- 【訂正】デバッグパレットのアイコンズレ対応で「aspect-ratioを569/983に統一」としたのはユーザー確認の結果誤りと判明（260/395が魔導板カード共通の正しい比率）。260/395に戻した。ズレの真因は別にあった：`.card-activation-costs .activation-cost-entry img`が`display:inline`のままbaseline配置されており、親要素(`.activation-cost-entry`)基準の位置とズレていた（`<b>`数字側は`position:absolute;inset:0`で正確なのにimg側だけ無指定だったのが非対称の原因）。imgにも`position:absolute;inset:0;display:block`を追加して解消。加えて、デバッグパレット専用の古い`.mana-cost-orbs img{width:22px!important}`ルール（IDセレクタ込みで詳細度が高い）が、新システムの`.activation-cost-entry img{width:40.96px}`を上書きしてアイコンだけ小さく左上に偏って見えていたため削除。実機（getBoundingClientRect比較）でentry/img/bの位置・サイズが静止時・ドラッグ時とも完全一致することを確認済み。
- 3枚合体（triple-merge）演出の3件を修正（reward.js/index.html）。①ATK/HPが演出中に左へずれる：`_freezeTripleCloneOverlayGeometry`内`pin()`がATK/HP要素の`display:flex`はコピーしていたが`justify-content`/`align-items`をコピーしておらず、コピー先で既定値(flex-start)に戻り左寄りになっていたのが原因。両プロパティのコピーを追加（実機でcomputedStyleが`center`に一致することを確認済み）。②合体完了時、隣接パネルと接続済みの方向は矢印が出ない仕様のため4方向揃わないことがあった：`panelDirectionMarksHtml()`に`card._tripleMerged`時はconnectivity判定をスキップし常に4方向描画する分岐を追加。実機フルフロー（デバッグ配置→`placePendingPanelToSelectedUnit`→合体トリガー）でDOM上4方向とも描画されることを確認済み（コード上は正しく動作。ユーザー側で見えなかった報告があったが、スクリプトversionクエリ更新前のキャッシュが原因の可能性が高い）。【注意】③「ATK/HPが4桁でカード外にはみ出て切れる」対策として`--unit-stat-w`を72px→96pxに広げたが、これは合体演出に限らず通常表示のATK/HP位置も変えてしまう指示範囲外の変更だったとユーザー指摘を受け72pxへ即時revert済み。3桁超え対策は今回は未実施（再度依頼があれば合体後カードのみに限定する等スコープを絞って対応する）。
- 「旅の進捗」パネル（reward.js `_syncRewardJourneyUi`）のエリート/ボスホバー機能を実装。enemy.jsに`_ensureWaveEnemyPreview(wave,type)`を新設し、そのwaveのエリート/ボス個体・ATK/HPを初回アクセス時（旅の進捗パネル表示時）に1回だけ確定して`G._waveEnemyPreview[`${wave}:${type}`]`にキャッシュ、`generateEnemies()`/`generateEliteEnemies()`（enemy.js）はボス/エリート本体（isCenter）についてこのキャッシュがあればdef・ATK/HPともそのまま使うよう変更（雑魚敵・左右サイドは従来通りランダム）。`_syncRewardJourneyUi()`でエリート/ボスノードに`data-journey-enemy`（JSON：name/desc/atk/hp/art）を埋め込み、`_initKwTooltip()`（render.js）に新設した`_formatJourneyEnemyHtml()`で「タイトル（XXXとの戦闘）→カード画像→ATK/HP→直線→効果テキスト」の順にツールチップ表示（`assetUrl()`がurl("...")形式で二重引用符を含むため、style属性は単一引用符で囲んで衝突を回避）。実機で①表示されたエリート/ボスの名前・ATK/HPと、実際に`generateEliteEnemies`/`generateEnemies`を実行した結果が完全一致すること、②通常戦ノードは従来通りプレーンテキスト表示のままであること、を確認済み。
- 「3枚合体後に4方向矢印が出ない」再報告への対応：ユーザーからGemini検証コードの提示あり。①「絆の巻物」（`bond_scroll`、2枚合体の別機能）の矢印未対応も指摘されたが、ユーザーからこの巻物は廃止予定につき対応不要と明言されたため着手前に取り消し済み（コード変更なし）。②3枚合体（triple-merge）自体は、演出完了（`.triple-merge-result-hidden`解除・ghost全消滅）まで`await`で明示的に待った上で実機検証しても、DOM上は正しく4方向の`.panel-dir`が描画されることを確認済み（前回の確認は演出開始直後の早すぎるタイミングでの検証だった疑いがあり、今回は演出完了を確実に待ってから再検証した）。原因は特定できていないが、保険として`_playTripleMergeAnimation()`の演出完了コールバック内（`target.classList.remove('triple-merge-result-hidden')`と同じタイミング）で`renderHandEditor()`/`renderFieldEditor()`を追加実行するようにした（reward.js）。
- 上記のさらなる調査で、ユーザーから「演出内ではATK/HPも合体後の値になっていない」との指摘があり、個別要素の同期（pin()方式）を直し続けるのは大変なため方針転換：「3枚が合体して発光したら、演出完了まで真っ白なままにする」という要望を実装。`index.html`の`@keyframes tripleMergeShapeFlash`（`.triple-merge-white-flash::after`、白い角丸オーバーレイ）の`100%`を`opacity:0`→`opacity:1`に変更するだけで対応（JS側の変更は無し）。発光ピーク(28%)以降そのままopacity:1を維持し、演出完了時にghost要素ごと削除されるまで中身（ATK/HP・矢印含め全て）が完全に隠れる。実機で発光開始(2020ms)〜演出完了(2780ms)の間、複数タイミングでサンプリングし`opacity:1`が維持されること、演出完了後は正しいATK/HP・4方向矢印を持つ実カードに切り替わることを確認済み（視覚的なスクリーンショット確認はBrowser paneの制約でfixed要素が反映されずできなかったが、DOM/CSS実測は確認済み）。`_freezeTripleCloneOverlayGeometry`のpin()処理自体は残っている（発光前の3枚が動く演出中はそのまま使われる）が、発光後は白で隠れるため個別要素の位置ズレは実質無害化された。
- ユーザーから9件の新規報告があり、4つのExploreエージェントを並行調査させた上で全て修正・実機検証済み（reward.js/battle.js/render.js/enemy.js/map.js/index.html）。①合体カード接続時にunite画像の下へarrow画像が残る：`panelDirectionMarksHtml()`の`_tripleMerged`強制表示フラグ（forceAllDirs）が接続済み方向でも矢印を出していたのが原因で撤去、元のconnectivity判定に復元（実機でconnected方向は矢印非表示、open方向のみ表示を確認）。②戦闘開始時マナ効果でフリーズ（ヴリコラカスで再現）：`_applyManaThresholdEffectText()`「ランダムな味方が復活を得る」分岐が未宣言の`foes`を参照しReferenceErrorがstartBattle()全体を無捕捉で停止させていた既存バグ（今回のペース調整機構とは無関係）。`candidates`（取得済みの生存味方）を使うよう修正。③ミノタウロス不発：`_onAllyInjuredByPanel()`のミノタウロス分岐・メデューサ分岐も同じ未宣言`foes`参照バグを持っていた（根本原因は②と同一）。`alive`（取得済み生存敵リスト）を使うよう修正。両方とも実機でエラー無し・効果発動を確認。④カードを非表示にした時（`right-card-peek`）カーソルが変化する：カードCSSリセットに`cursor`指定が漏れていたため`cursor:default!important`を追加。⑤peek中に特殊マス説明が2重表示：`#map-power-tooltip`側が`isPanelPeek`を見ずに`#kw-tooltip`と同じ内容を重ねて表示していたため、条件に`!isPanelPeek`を追加。⑥peek中に報酬/デバッグカードのホバー説明が消える：`isPanelPeek`判定がbody全体のクラスのみで魔導板以外にも及んでいたため、`tgt.closest('#hand-slots.unit-equip-slots')`をAND条件に追加してスコープを魔導板に限定。⑤⑥とも実機確認済み。⑦合体しても「逆上」ダメージが2倍にならない：`battle.js`内のダメージ量がカードデータ非参照のハードコード値`3`だったため（`_doubleTripleStoredEffects`等の対象プロパティに含まれず、表示文言だけ`_doubleTripleMergedDesc`で「6ダメージ」に書き換わり表示と実挙動が不一致になっていた）、`unit._tripleMerged`を見て動的に3/6を切り替えるよう修正（実機で3→6を確認、他の合体非対応キーワードは今回未調査）。⑧デバッグ戦闘終了ボタンの形状崩れ：`#log-wrap #btn-pass{border-radius:50%}`（丸ボタン用）がデバッグ時の横長オーバーライドでリセットされておらず、矩形の`button_purple.svg`が楕円にクリップされていたため`border-radius:0!important`を追加。⑨旅の進捗でエリート/ボスに同じ敵が表示される：`G.worldMapRun`がwave-loopフローでは未初期化のため`_pickBossEnemyDef`の使用済み除外が機能しておらず、`_ensureWaveEnemyPreview`もelite/boss間で独立抽選していたため、先に確定済みの反対側の名前を除外して抽選するよう変更（実機20回試行で重複ゼロを確認）。⑩旅の進捗のカード画像とATK/HPが別要素で分離：`_formatJourneyEnemyHtml()`を、敵専用フレーム(`Assets.cards.enemyFrame`)を背景にした`.journey-enemy-card`1要素の中に絵柄・ATK/HPを重ねる構造に変更（実機で1要素へ統合されたことを確認）。
- 上記のうち「魔導板を『召喚の力』に変化させた時の演出をboard_change1/2.webp+wavに差し替える」要望も対応。`_playMapForgeSlotRoll()`（map.js）のカードフェードアウト後のルーレット演出部分を撤去し、新設`_playMapBoardChangeVfx(isSummon)`でwebpを画面中央に固定表示＋SFX再生する形に置き換え（`power.id==='summon'`で1/2を判定）。ただし`assets/sfx/board_change2.wav`は実在しないため、それ以外への変化時はSFXが無音になる（`new Audio().play()`失敗を`.catch()`で握りつぶす実装のためエラーにはならない）。board_change2.wav相当の音声ファイルをご用意いただくか、代替方針をご指示いただければ次パスで対応します。
- 「旅の進捗」パネル（reward.js `_syncRewardJourneyUi`）のエリート/ボスアイコンホバー時に「XXXとの戦闘」＋効果＋カード画像＋実出現ATK/HPを表示する要望は着手前の調査のみ完了・未実装。現状は敵個体が戦闘開始時（`generateEnemies`/`generateEliteEnemies`、enemy.js）まで乱数未確定のため、ユーザー確認の結果「編成画面表示時点で先読み確定する」方針に決定（表示と実戦を一致させるため、以降の戦闘抽選もその確定値を使うよう変更が必要）。実装には①wave/stageからfloor/gradeを求める`_waveStageFloor`等は決定論的で先読み可能、②`G.worldMapRun.usedBossEnemyNames`によるボス重複除外はwave-loopフローでは`G.worldMapRun`自体が未初期化のため現状無効化されている点の扱い、③`enemyStats()`のATK/HP乱数を先読み時点で確定し戦闘開始時に使い回す仕組み、④ツールチップ（`_initKwTooltip`）へ画像＋ATK/HP表示を追加するHTML拡張、の4点で構成される見込み（次回セッションで着手）。表示順序はユーザー指定で「タイトル→カード画像→直線→効果テキスト」（ボス/エリート共通）。【以下の行で最終形に刷新済み、この行は経緯として残す】
- デバッグ戦闘終了ボタン（`#btn-pass`のtest-battle-active時オーバーライド、index.html）の位置を調整：右端を編成画面「元に戻す」ボタン（`.rew-reset-btn`）の右端に実測値ベースで合わせ（`right:86px→81px`）、`bottom:152px→182px`で少し上へ。
- デバッグパレット（`renderDebugCardPalette()`、reward.js）のヘッダー上部に「ショップ呼び出し」「鍛冶屋呼び出し」ボタンを追加（`.debug-palette-jump`、既存の`openMapShop()`/`openMapForge()`をそのまま呼ぶだけ。wave-loopフローの村メニュー/祭壇メニューからも同じ関数が使われていることを確認済みなので流用可能と判断）。
- 【最新パス4】6件対応（reward.js / battle.js / render.js / main.js / index.html）。①ショップで手持ちカードを販売枠に置くと動かせなくなる：売却待ちカード（`_shopSalePending`）は購入対象でないため`canBuy=false`になり、`(G._isShop&&!canBuy)`のドラッグロックに巻き込まれていた。ロック条件に`&&!isPendingSale`を追加し、あわせてクリックでも魔導板へ戻せるよう`div.onclick=onBuy`を付与。`takeRewCard()`側でも売却待ちは`isTown=false`／`cost=0`扱いにしてゴールドを徴収しないようにした（実機で`_mkRewDiv`直接呼び出し検証：売却待ち＝draggable:true/locked:false/onclickあり、購入不可の通常カード＝draggable:false/locked:trueを確認）。②戦闘中の所持金が3桁区切りでない＋増加演出：`updateHUD()`の`h-gold`/`battle-gold-value`を`toLocaleString('ja-JP')`に変更。あわせて`onGoldGained()`に**表示専用**のカウントアップ演出を新設（`G._goldDisplay`＋`startGoldCountUp()`／`goldDisplayValue()`）。実値`G.gold`は即時確定させ購入可否等のロジックには一切影響させない設計で、演出中以外は常に実値を返す（減少時に古い表示が残らない）。残り時間から1フレーム加算量を逆算する方式にして、増加量に関わらず約420msで必ず完了する（実機で441msで完了を確認）。③敵撃破後の詰めでテンポ悪化：VFX既定尺を`hitDuration 900→600` / `labelDuration 550→380` / `fadeDuration 180→140`へ短縮し、「ダメージ表示消滅後に詰める」挙動は維持したままテンポを戻した。④売却ボタンで決定音が重なる：売却/還魂ボタン（魔導板側・ショップ提示カード側とも）に`data-sfx-silent="1"`を付与し、audio.jsのグローバルクリック音を抑止（sell.wav/ascension.wavのみ鳴る）。⑤鍛冶屋のフェードアウト中、召喚マス以外にキャラがいた場所の枠線が消える：通常マスの枠は`.board-frame-layer`が`display:none`でカード自身の背景が枠を描いており、フェード中はその背景が空マス画像へ差し替わるため枠が消えていた。`body.map-forge-roll-hide-cards`かつ`.map-forge-roll-card-fade`の間だけ`.board-frame-layer`を表示するルールを追加（実機で通常マス3件とも`display:block`/`opacity:1`/m_board_frame画像を確認）。⑥デバッグモードで旅の進捗のマスをクリックしてそのstageへ移動：各ノードに`data-journey-jump`（stage番号）と`data-journey-type`を付け、`_bindDebugJourneyJump()`で city→`_openWaveVillage` / altar→`_openWaveAltar` / それ以外→`_startWaveBattle` を呼ぶ。ホバー発光とpointerカーソルのCSSも追加（実機でエリートマスのクリック→stage3・type='elite'・敵6体・elite個体ありで戦闘開始を確認）。
- 【最新パス3】7件対応（index.html / map.js / reward.js / battle.js）。①鍛冶屋のマス変更時にwebp以外で白く発光する：`G._mapForgeHighlightSlot`を常に`null`にし、対象位置はVFX（webp）だけで示すよう変更（実機でcandidate/highlightとも0件・VFXのみを確認）。②3桁超えステータスと矢印の先端がカード移動直後に一瞬切れる：接続フラッシュ演出用CSS`.panel-connect-flash{overflow:hidden!important}`が原因。`overflow:visible`へ戻し、走査光は`::before`側に`clip-path:inset(2px round 12px)`を付けてカード内に収めることで見た目を維持したまま解消（位置の変更なし）。③「戦闘開始」を押すと半透明になる：連打防止で`disabled=true`にした際に`.btn:disabled{opacity:.35}`が効いていたため、`:disabled:not(.disabled)`（本当の無効状態＝`.disabled`クラス時は従来通り）に限りopacity/filterを打ち消すルールを追加。④敵撃破後の詰めがダメージ表示より先に走る：`applyDamageBatch()`の死亡処理後、`_endDeathCompactDelay()`の直前に`await _waitForPendingVfx()`を挿入し、ヒットVFX（-Nラベル込み）の完全消滅を待ってから詰めるよう変更。⑤還魂/売却ボタンの`title`属性を削除（ブラウザ標準のホバー表示を抑止）。⑥⑦⑧SE設定：還魂＝`ascension.wav`／売却＝`sell.wav`（魔導板の売却ボタンとショップ提示カードの売却の両方）／ショップで魔導板へ配置＝`buy.wav`。SEはボタン種別（`ring-offer-discard-btn`クラス）で**ハンドラ先頭**に判定するようにした——デバッグモード分岐が先にreturnして還魂SEに到達しない問題があったため。実機でbuy/sell/ascensionすべて意図通り鳴ることを確認済み。
- 【最新パス2】さらに5件対応（map.js / render.js / reward.js / main.js）。①エリート/ボスのホバー説明にキーワードが出ない：payloadに`def.keywords`（重複除去）を追加し、`_formatJourneyEnemyHtml()`で効果テキストの一番上に「A / B」形式の太字で並べる（通常カードの`キーワード：`行と同じ見せ方でラベルは非表示）。②VFX位置が上がり過ぎ：`rect.height*0.22`の上方オフセットを廃止しマス中心（dx=0,dy=0）に配置（実機実測で確認）。③「召喚の力」以外でSEが鳴らない：`assets/sfx/board_change2.wav`が未配置だったのが原因。候補配列＋`error`/`play()`reject両対応のフォールバック（`board_change2.wav`→`board_change1.wav`）を実装し、二重発火防止の`advanced`フラグも追加（実機でAudio生成が2回＝重複なしを確認）。**board_change2.wav自体は依然として未配置のため、専用音源を置けば自動的に優先される。** ④複数マスの一斉発光を廃止：`G._mapForgeCandidateSlots`を常に`null`にし、光るのは確定した対象1マスのみに（実機でcandidate発光0件・highlight1件を確認）。⑤デバッグモードのみ鍛冶屋に「元に戻す」を表示：`canResetMapReward`の鍛冶屋除外に`||!!G._debugMode`を追加。押下時は`forgePlacementOnly`（購入内容を保持してしまう）ではなく`resetRewardToStart(null)`で入店時スナップショットまで完全に巻き戻す（実機で所持金・mapPanelPowers・提示内容の3点とも入店時へ復元を確認）。⑥デバッグモードの初期所持金を999→100000に変更（main.js、ログ文言も更新）。
- 【最新パス】ボタン挙動3件＋鍛冶屋演出3件＋旅の進捗カード表示の仕上げを実施（index.html / map.js / render.js）。①デバッグ「戦闘終了」ボタン：`bottom:182px→206px`でさらに上へ、`line-height:122px`＋`padding:0`でラベルだけを枠の窓位置に合わせて下げ、試験戦闘ボタンと同型の`::before`発光（`button_purple.svg`＋`brightness(2.15)`＋drop-shadow、hoverで`opacity:1`＋`unifiedActionButtonGlow`）を追加。②「戦闘開始」ボタン：hover時に本体`::after`へ`filter:brightness(1.85)+drop-shadow`を追加し、発光だけでなく色自体がはっきり変わるようにした（既存の`::before`発光ルールは維持）。③「元に戻す」ボタン：hover時に`::after`を`brightness(1.45)`、`::before`を`opacity:.55`にして control を明るく。3件ともCSSOM走査で該当:hoverルールの登録を実機確認済み。
- 鍛冶屋演出3件を修正（`_playMapForgeSlotRoll`/`_playMapBoardChangeVfx`、map.js）。①「演出が出るパネルと実際に変化するパネルが不一致」：ハイライト（`G._mapForgeHighlightSlot`）を演出開始時点から確定済みの`target`に設定し、さらにVFX自体も画面中央固定をやめて対象マスの矩形へ重ねるよう変更（実機で highlight slot == `G.mapPanelPowers`の変更先 == VFX中心、かつ dx=0 を確認）。②「カードがフェードアウトせず急に消える」：`map-forge-roll-hide-cards`クラス付与の直後に`renderHandEditor()`を呼んでいたためDOMが作り直され、新要素が最初から`opacity:0`で生成されCSS transitionが走っていなかったのが原因。クラス付与時は再描画しないよう変更（実機でopacityが1→0.74→0.37→0.15→0.06→0と0.45sかけて遷移することを確認）。③VFX位置を対象マス中心より`rect.height*0.22`だけ上へオフセットし、VFX開始0.5秒後に`G.mapPanelPowers[target]=power.id`＋再描画してマス画像を変化後へ差し替える`onMidpoint`を追加（実機でt≈1326msに`powerAtTarget`が反映されることを確認）。
- 「旅の進捗」カード表示を最終形に修正。前パスの「mkCardEl生成物を`width:100%`でツールチップ幅に合わせる」方式は、内部のATK/HP等が設計px固定のため取り残されて位置・サイズが崩れ、かつカード自体が実カードより巨大になっていた。カードは設計寸法（260x395）のまま描画し、ラッパー`.journey-card-wrap`側で`transform:scale(var(--game-scale))`により要素ごと一括縮小する方式へ変更（実機でツールチップ内カードと魔導板カードが同一サイズ45.3x68.8になることを確認）。加えてATK/HPの配置指定が`#hand-slots`/`#rw-cards`等にスコープされていたため、`#kw-tooltip .journey-card-wrap > .card`にも同じ`--unit-stat-*`変数を明示適用（実機で相対位置・幅が魔導板カードと完全一致することを確認）。効果テキストの改行は、シート実データが改行ではなく全角スペース区切り（例「常時：〜。　誘発：〜。」）だったため、`_formatJourneyEffectText()`の分割条件を`/\n|　(?=[^：:　]{1,12}[：:])/`に変更し、2つ目以降の効果も「：」前が`<strong>`化されるようにした（実機で2行・両方太字を確認）。
- 「旅の進捗」エリート/ボスホバー表示を全面刷新（前回実装の`.journey-enemy-art`＋`.journey-enemy-stats`の独自簡易表示は「カードが潰れている」「他のカードと違う見た目」との指摘を受け廃止）。`_formatJourneyEnemyHtml()`（render.js）を、敵情報から`type:'panel',panelScope:'unit',category:'キャラクター'`等を持つ疑似カードオブジェクトを組み立てて`mkCardEl()`にそのまま渡す方式に変更（他の全カードと完全に同じ生成経路になるため見た目が統一される）。ただしゲーム全体の`.card`共通CSS（`html body .card{aspect-ratio:479/727!important}`が実際の基準比率で569/983ではなかった）や、ATK/HP要素（`.card-summon-atk/-hp`）が`--game-scale`スケール適用前提の固定px（`bottom:92px`,`font-size:65px`相当）を持つため、scale変換の外にあるツールチップにそのまま埋め込むと巨大・位置ズレになった。`#kw-tooltip .card .card-summon-atk/-hp`専用に%ベースの小さい値（`font-size:13px`,`width:34%`等）を`!important`で追加してツールチップサイズに合わせた。タイトルは`previewText`を`エリート\nカード名`/`ボス\nカード名`形式にし（reward.js）、`_formatJourneyEnemyHtml`側で`\n`を`<br>`に変換して2行中央揃え表示（`.preview-title`は既存CSSでtext-align:center済み）。効果テキストは新設`_formatJourneyEffectText()`で行ごとに「：」より前を`<strong>`化しつつ`\n`を`<br>`に変換（通常カードの`_formatPreviewHtml`と同じ規則）。実機でエリート・ボス両方とも、カードのアスペクト比崩れなし、ATK/HPがカード内に正しく収まること、タイトル2行表示、効果文の太字化を確認済み（スクリーンショットでも視認確認済み）。

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
