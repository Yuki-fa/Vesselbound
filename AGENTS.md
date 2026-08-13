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

- 【今回セッション1件目】ステージ1/2の背景入れ替え＋街（村）専用画面の新設＋道具屋の新規実装＋戦闘開始表示の固有名化を実施（assets.js / js/data/loader.js / js/data/local_xlsx_data.js / index.html / js/engine/map.js / js/engine/reward.js / js/engine/battle.js / js/engine/main.js / 新規 assets/ui/button_blue.svg）。①背景入れ替え：`Assets.backgrounds.stage1`をstage_forest、`stage2`をstage_grasslandに交換（村の背景名と対応が揃う）。②「地域情報」シートの読み込みを追加：`_XLSX_SHEETS.region='地域情報'`、`rgt`として各ローダー（xlsx/embedded/GoogleCSV）に伝搬し、`loadGameData()`内で`window.REGION_INFO`（キー＝ステージ番号＝G._wave）へ`toTownName`/`townName`/`townFacilities`/`toTowerName`等をパース。`-`は空文字に正規化。file://用の`local_xlsx_data.js`にも`region`キーをxlsxから生成して追記済み。③街専用画面：`index.html`に`#scr-village`（`.screen`）を新設し、`openMapVillage()`（map.js）を編成画面＋battle-order-rowのボタン列から専用画面へ差し替え。`goToReward()`を通らないため`menu_open.wav`は鳴らない。`showScreen()`（main.js）に`id==='village'`→メニューBGM、および「商談フェイズ中に戦闘画面へ戻る場合もメニューBGM」の分岐を追加（施設入店時に戦闘曲が一瞬鳴るのを防止）。背景は`getVillageBackgroundKey()`（wave1〜4→village_forest/grassland/valley/city_capital、5→village_endworld）を`applyScreenAssetBackground('village')`（assets.js）から解決。左上は`name_back.svg`を`background-size:100% 100%`で敷いた`#village-name-plate`で、街名の文字量に応じて横幅が自動で伸びる（実測 wave1:1112px〜wave4:1410px）。街名は半角/全角スペースで分割し前半（地域名）を62px、後半（固有名）を92pxで表示。④施設ボタン：`button_purple.svg`を青（枠グラデーション#79b6e8〜#1f5586）＋背面`fill-opacity:.55`にした`assets/ui/button_blue.svg`を新設し`.village-facility`で使用。ホバーで`brightness(1.55)`＋青いdrop-shadow。施設一覧は「街の施設」列を`、`区切りでパースし`VILLAGE_FACILITY_DEFS`（ホーム/ショップ/道具屋/鍛冶屋/鍛治屋/宿屋/広場/酒場。シート表記が「鍛治屋」なので両方登録）で動作キーと説明文へ変換。位置は`VILLAGE_FACILITY_POS`で最大4件分を固定割り当て。ショップ/鍛冶屋/道具屋は`showScreen('battle')`→既存の`openMapShop()`/`openMapForge()`/新規`openMapItemShop()`を呼び、左上ラベルは`G._facilityLabel`（シートの施設名そのまま）を`_syncRewardTitleLabel()`（reward.js、`_syncRewardProductionUi()`から呼ぶ）で「編成」から差し替える。`.reward-prod-title span`に`white-space:nowrap`を追加（3文字の施設名が2行に折り返していた）。広場・酒場は表示のみ（log出力）。⑤宿屋：`useVillageInn()`で500G消費・`G._waveLife`+1。`G._waveInnUsed[wave]`で1つの街1回に制限し、ライフ満タン/所持金不足/利用済みはボタンをグレーアウト（`_villageFacilityDisabled()`）。⑥道具屋：`openMapItemShop()`で`drawItems(3)`を提示、価格＝レアリティ×180（`_itemShopBuyPrice`）。`G._isShop`も立てて既存のショップ購入・価格バッジ機構を流用し、`G._isItemShop`で分岐。`renderRewCards()`に道具屋分岐を追加して`item_slot`枠（`treasure-offer-card item-visual`）で3つ並べ、`.item-shop-card > .shop-buy-price`だけCSSで表示復活。**ドラッグでアイテム枠へ入れる経路はゴールドを徴収しないため`d.draggable=false`でクリック購入のみに限定**。手持ちアイテム（`.reward-prod-item`の4枠）には`+レアリティ×45G`と売却ボタンを重ね（`_sellHeldItem()`、CSSは`body.item-shop-active`スコープで189px枠用に70×38pxへ縮小）、道具屋中はクリックでのアイテム使用確認を抑止。提示内容は`G._waveItemShopStock[wave]`でwaveごとにキャッシュ（`_syncWaveFacilityCache()`に分岐追加）。⑦戦闘開始表示：`_waveBattleRouteName()`（battle.js）を新設し、stage1〜4は「街までの名前」、stage5以降は「塔までの名前」（空なら相互フォールバック）を`_battleStartIntroText().title`として返し、`showBattleCutin()`のタイトルを`戦 闘 開 始`から差し替え（`_escapePreviewHtml`でエスケープ）。実機（ローカルHTTPサーバでindex.htmlを起動）で確認済み：wave1〜5の街名・背景・施設一覧がシートと一致、道具屋の購入（-180G）→アイテム枠へ格納→売却（+45G）が正しく動作、店を出る→街画面の往復、宿屋の500G/ライフ+1/同一街2回目不可/所持金不足でのグレーアウト、村入場時のplaySfx呼び出しが0件（menu_open.wav無音）、戦闘カットインのタイトルが「木漏れ日の古道」（wave1 stage1）・「深緑の迷い路」（wave1 stage5）になること、埋め込みCSV（file://フォールバック）側でも同じ地域情報が得られること。
- 【今回セッション2件目】1件目のレイアウト指摘9件を修正（index.html / js/engine/map.js / js/engine/reward.js / js/engine/battle.js / js/engine/main.js / js/data/loader.js / js/data/local_xlsx_data.js）。①街の所持金/ライフを独自レイアウトから戦闘画面の`#battle-status-hud`と同一に変更（`.battle-status-counter`/`.battle-status-label`/`.battle-life-heart`をそのまま共用し、`#village-status`は`left:70px;bottom:70px;gap:36.4px`で同位置・同寸法）。②「出発する」を編成画面の「戦闘開始」と完全一致させた：`#reward-move-btns`を含む**全CSSルール（69件）をスクリプトで機械的に複製**し、`body.reward-screen-active`→`body.village-screen-active`／`#reward-move-btns`→`#village-move-btns`へ置換した自動複製ブロックを`</style>`直前に追加（`.rew-reset-btn`／`#scr-battle`スコープ／`:not(.reward-pick-taken)`のトークンは除外し、`.reward-pick-taken`は街では常時適用＝取得済みと同じbutton_brown＋待機発光になる）。`village-screen-active`は`showScreen()`（main.js）で`id==='village'`のときだけ付与。実測で編成画面の戦闘開始と街の出発するが完全同値（left:2749 / top:3458 / 493×121 / font-size:43.82px）。③施設ボタンを元ファイル寸法（`button_purple.svg`＝498×124）に変更し、ホバー発光を編成画面の操作ボタンと同方式（`::before`に同一輪郭＋`brightness(2.15)`＋drop-shadow、hoverで`opacity:1`＋`unifiedActionButtonGlow`）へ統一。ボタンの顔は`::after`側へ移した。④ボタン下の説明文を「テキストメッセージ」シート駆動に変更：loader.jsに`textMessage`シート（`tmt`）読み込みと`window.TEXT_MESSAGES`を追加し、`villageFacilityDescText()`（map.js）が`街「◯◯」直下`行を引く（鍛冶／鍛治の表記揺れは両方試行）。文字サイズは44px→28px、グラデーションの左右paddingを44px→132pxに広げてテキストより長めにした。**シートに行が無い施設（道具屋・宿屋・広場）は説明文が出ない**。⑤左上プレート：`name_back.svg`（ユーザーが今回シンプルな帯へ差し替え済み）の帯の上辺を`y=0`→`y=100`へ変更し（帯は y=100〜200 の下半分）、プレート要素側は`top:0;height:200px`でviewBox（1400×200）と1:1に対応させたうえで`padding-top:100px`＋`align-items:center`にして文字を帯の中で縦中央に置いた（実測：帯0〜200／sub・mainともcy=150で一致）。文字色を`#c49a6c`（所持金表示と同色）に、半角スペース前を62px→38pxへさらに縮小。⑥道具屋のドラッグ&ドロップを解禁：`d.draggable=false`を撤去し、代わりにアイテム枠のdropハンドラ（reward.js `_syncRewardProductionItems`）で`G._isItemShop`時に`card._buyPrice`を徴収＋所持金不足なら拒否、提示枠は`splice`ではなく`null`化してショップと同挙動に。⑦売却額表示のイタリックを解消（枠が`<i>`要素なので`font-style:normal!important`を追加）。⑧道具屋でも枠クリックで通常の使用確認ダイアログが出るようにした（`if(G._isItemShop) return`を撤去。売却ボタンは`stopPropagation`済みでダイアログは出ない）。⑨道具屋の3枠を上・下・上と互い違いに配置（JS側で`item-shop-card-up/-down`を付与＋CSSの`align-self`。DOM順ではなく提示indexで決めるので購入で1枠空いてもズレない。実測 topOffset 0/142/0・bottomGap 142/0/142で行の上下に余白なし）。⑩戦闘カットインを、大きい文字＝`一般戦闘`/`エリート出現`/`ボス出現`、小さい文字＝道中の固有名に入れ替え（battle.js `_battleStartIntroText`）。実機で①〜⑩すべて確認済み。編成画面側は`title`ラベルの`white-space:nowrap`追加のみで、戦闘開始ボタンの位置・寸法とも変化なしを実測確認。
- 【今回セッション3件目】6件対応（index.html / js/engine/map.js / js/engine/reward.js / assets/ui/name_back.svg）。①`name_back.svg`の帯を高さ200px（viewBox全体）へ戻し、画面上の上辺Y=100pxは`#village-name-plate`の`top:100px`＋`height:200px`＋`padding:0`＋`align-items:center`で表現。街名は帯の中で上下中央（実測：帯100〜300／sub・mainともcy=200）。②道具屋の説明文が空だった件：「テキストメッセージ」シートに`街「道具屋」直下`行が無いのが原因のため、`VILLAGE_FACILITY_FALLBACK_DESC`（道具屋／宿屋／広場／闘技場）を新設してシート未登録時のみ使う（シートに行を足せばそちらが優先）。③施設ボタンのホバー発光を前パスの`unifiedActionButtonGlow`（金色の明滅）から元の方式へ戻した：顔を`::after`から`::before`に戻し、hoverは`brightness(1.55)`＋青いdrop-shadowのみ。④説明文はホバー中だけ表示（`opacity:0`→`:hover`で1、`transition .16s`）。⑤施設ボタン位置を施設名で指定できるようにした（`VILLAGE_FACILITY_POS_BY_NAME`＋未指定分は`VILLAGE_FACILITY_POS`の空きスロットへ順送りする`_villageFacilityPositions()`）。エルムは酒場→中央の巨木(50%,50%)、道具屋→右手前(79%,58%)。⑥「出発する」のXを「元に戻す」と同じにするため`#village-move-btns`に`justify-content:flex-end`を追加（実測ともに左端3277px）。文字のY位置がずれていた真因は**フォント**で、編成画面には`html body.reward-screen-active *{font-family:"Shippori Mincho"…!important}`があるのに街画面には無く`.btn`の`var(--font-hd)`＝Cinzelになっていた。`html body.village-screen-active #scr-village *`に同じ明朝体指定を追加して解消（実測でラベルのbtn内オフセットが38.72pxで一致）。⑦デバッグモードで「旅の進捗」のSceneマーク（`.journey-scene-mark`＝countdown文字の上にある5個のアイコン列）をクリックしてステージ（=G._wave）移動できるようにした：`_syncRewardJourneyUi()`で`data-journey-scene`を付与し、新設`_bindDebugSceneJump()`（reward.js、`_bindDebugJourneyJump()`から呼ぶ）が`G._wave`/`G._waveStage=1`/`G.floor`を更新して`_openWaveFormation()`で**編成画面のまま**留まる。実機でScene3クリック→wave3・stage1・floor13・画面はscr-battle（左上「編成」）・Sceneマークのcurrentが3番目・その後の戦闘名が「焦土の断崖道」・村が「赤土と鍛冶の集落 ギャラハ」になることを確認済み。
- 【今回セッション4件目】3件対応（assets.js / js/engine/audio.js / index.html / js/engine/map.js / js/engine/main.js）。①施設押下SE：`Assets.sfx.knock`と`SFX_SETTINGS.sounds.knock`を追加し、audio.jsに**再生完了を待てる`playSfxAwait(key,opts)`**を新設（`playSfx()`で鳴らした上でbase Audioの`duration`から待ち時間を算出、鳴らせなかった場合＝ミュート/未解錠は即resolveして演出が止まらないようにする）。`_onVillageFacility()`（map.js）をasync化し、`_VILLAGE_KNOCK_KEYS`（shop/forge/item/inn）だけ`await playSfxAwait('knock')`→その後にshop_in.wav＋画面遷移。二重押し防止に`G._villageFacilityBusy`。宿屋は押下時のshop_inと重なるため`useVillageInn()`内の`purchase`再生を削除。広場・酒場はknockもshop_in/shop_outも鳴らさない（実機でSE呼び出し順を検証：道具屋＝await:knock→play:knock→play:shopIn、宿屋＝同順＋ライフ2→3/所持金1000→500、広場＝呼び出し0件、店を出る＝shopOutのみ）。②道具屋のドラッグ暗転を指輪交換と同一方式へ変更：既存の「パネルごとに`filter:brightness(.4) saturate(.5)`」をitem-shop中は`filter:none`で打ち消し、代わりに指輪交換と同じ`#ring-drag-overlay`（`rgba(0,0,0,.5)`／z-index:8000）を表示し、`.battle-scroll{z-index:30}`＋`#reward-production-ui{z-index:9001}`＋`#battle-order-section{z-index:9001}`で持ち上げる。明るく残す枠だけを`.reward-prod-ring`→`.reward-prod-item`へ入れ替えた（`#reward-production-ui > *:not(.reward-prod-item){filter:brightness(.5)}`）ので**指輪枠は暗く、アイテム枠は明るい**。実機実測でoverlay=block/z8000/rgba(0,0,0,.5)、item=none、ring/quest/bottom=brightness(0.5)、hand-pane・reward-move-btns=noneを確認。③街への入場演出`_playVillageEnterIntro(build)`（map.js）を新設し`openMapVillage({intro:true})`で再生（施設からの「店を出る」は演出なし＝既定）。流れは(1)body直下の`#village-enter-fade`を0.34sで黒へフェード→(2)村画面へ切り替え（`village-intro-hide-ui`で背景以外を`opacity:0`）→(3)黒を即消し`#scr-village::before`に`villageIntroCircleIn`（`clip-path:circle(0%→82%)`＋opacity、0.9s）で中央から円形フェードイン。下地は`village-intro-active`で純黒に→(4)円形演出の340ms後に`#village-intro-title`（地域名180px＋`battle_line.svg`を`filter:brightness(0) invert(1)`で白化、両方ドロップシャドウ付き）を0.5sでフェードイン→(5)0.8s保持後0.44sでフェードアウト→(6)消えきってから`villageIntroUiIn`で背景以外を0.44sフェードイン。呼び出し元は`_openWaveVillage()`と敗北後の村復帰（main.js）。実機で時刻サンプリング（t360黒/t420 circle14%・plate opacity0/t1000 title0.72/t1500 title1/t2400 fade out/t2700 plate0.78）とタイトル表示のスクリーンショットを確認済み。
- 【今回セッション5件目】7件対応（assets.js / js/engine/audio.js / index.html / js/engine/map.js / js/engine/main.js / js/engine/battle.js）。①中央からのフェードインを`clip-path:circle()`（縁が硬い）から**放射グラデーションのマスク**へ変更：`mask-image:radial-gradient(closest-side ellipse, …7段の減衰ストップ…)`を敷き、`mask-size`を0%→420%までアニメーション（`villageIntroMaskIn` 1.15s）。`mask-size`はアニメーション可能なので、縁がぼけたまま滑らかに広がる。②`village_forest.webm`を背景の真上に重ねた：`#village-bg-video`（`#scr-village`直下、`z-index:0`＝背景`::before`のz-index:-1より手前・UIのz-index:1より奥、`object-fit:cover`、`mix-blend-mode:screen`、`opacity:.85`）を新設し、`VILLAGE_BG_VIDEOS`（現状ステージ1のみ）を`_syncVillageBgVideo()`で切り替える。動画は実測で平均輝度20/最大87・約50%が黒＝黒背景の光エフェクト素材なので、screen合成が正解（黒は透過して光だけ乗る）。入場演出中は背景と同じマスクを適用し、`village-intro-hide-ui`の対象からも除外して背景と一緒に円形フェードインする。③エルムの酒場ボタンを(50%,50%)→(53%,45%)へ。④道具屋で所持アイテムをドラッグ中は売却価格と売却ボタンを非表示（`body.item-shop-active.dragzone-itemslot`と`.drag-ghost`配下を`display:none`。実機でflex→none→flexを確認）。⑤入場演出で文字表示と同時に`boom.wav`を再生し、その**直後**から街BGMをフェードイン：`playSfxAwait('boom')`のPromise解決後に`playVillageBgm(1600)`を呼ぶ。⑥街BGMをステージ別にした（`VILLAGE_BGM`＝ステージ1は`villageForest`／開始位置81秒。未定義ステージはメニュー曲）。`playBgm()`（audio.js）に`opts.startTime`を追加し、`_bgmStartTime`＋`_applyBgmStartTime()`で本再生とシームレスループの次トラック両方に開始位置を適用する。入場演出の黒フェード時に`stopBgm(320)`して一旦無音にする。`showScreen('village')`は入場演出中はBGMを触らない（演出側が鳴らす）。実機で呼び出し列（stop:320→bgm:villageForest{fadeInMs:1600,startTime:81}）とSE列（await:boom→play:boom）を確認。⑦戦闘カットインのタイトルを戦闘種別によらず「戦 闘 開 始」に統一（サブタイトルの固有名はそのまま）。⑧ゲームオーバーの「到達地点」を`_runStatsAreaName()`（main.js）で「地域情報」シートの現ステージの街の名前にした（実測：ステージ1＝大樹の抱く集落 エルム／ステージ3＝赤土と鍛冶の集落 ギャラハ）。
- 【今回セッション6件目】6件対応（index.html / js/engine/map.js / js/engine/reward.js / js/engine/main.js）。①`village_forest.webm`を`opacity:.85`→`.5`、再生速度を`playbackRate/defaultPlaybackRate=0.3`に（`_syncVillageBgVideo()`内で設定。実測rate=0.3/opacity=0.5）。②街のBGMを施設に入っても止めない：`playVillageBgm()`で`G._villageBgmActive=true`を立て、`goToReward()`（reward.js）と`showScreen()`（main.js）はこのフラグが立っている間`playBgm()`を一切呼ばないようにした。**店ではmenu.wavを鳴らさない**（実測：ショップ入店時のplayBgm呼び出し0件、街BGMが継続）。`_startWaveBattle()`と`_openWaveFormation()`でフラグを解除して通常制御（battle1／menu）へ戻す（実測：出発する→bgm:battle1、通常編成画面→bgm:menu）。③ショップの品揃えが再入店で補充される不具合を修正：`openMapShop()`のキャッシュ復元が`clone(stock).filter(shopAllowed)`だったため購入済みのnullが**配列から消え**、その直後の「5枚未満なら補充」ブロックが新カードを引いていた。`map(shopSlot)`（不可カードもnull化して位置と長さを保つ）に変え、補充ブロックを撤去して`while(_rewCards.length<5) push(null)`に置換。道具屋も同様に`while(_rewCards.length<3) push(null)`。鍛冶屋は元から補充コードが無く、実機検証でも購入→退店→再入店で提示が2件のまま復元されることを確認（＝元々補充されていなかった）。④ショップ／道具屋は購入後の枠を詰めずに残し中心に「売切」と表示：`_mkShopSoldOutDiv(itemIdx)`（reward.js）を新設し、`renderRewCards()`のショップ分岐・道具屋分岐でnullスロットに差し込む。CSSは`.shop-sold-out`（ショップ＝`m_board_frame.svg`のカード比率／道具屋＝`item_slot.svg`の正方形＋上下互い違いを維持）＋`.shop-sold-out-label`（明朝46px）。実測でDOMが[card,SOLDOUT,card,SOLDOUT,card]と位置を保つこと、退店→再入店でも同じ並びであることを確認。⑤`#battle-order-section::before`の見出しを「販売カード」→「商品」に変更。⑥編成画面左上の鍛冶屋の既定ラベルを「鍛冶屋」→「鍛治屋」に変更（シート表記に合わせる。`villageFacilityDescText()`は従来どおり冶／治の両表記で説明文を探す）。
- 【今回セッション7件目】6件対応（js/engine/main.js / js/engine/audio.js / js/engine/reward.js / js/engine/map.js / assets.js / index.html）。①戦闘後に村へ入るとbattle1.wavが鳴る不具合を修正：`_openWaveVillage()`（main.js）冒頭の`showScreen('battle')`が、`G.phase=null`を代入する**前**に走っていたため`showScreen()`のBGM分岐が「戦闘中」と判定してbattle1を再生していた。画面切り替えは`openMapVillage()`（入場演出）側が行うので、この`showScreen('battle')`を撤去。②村BGMのループが途切れる／開始位置の扱いを修正：`playBgm()`が`loadedmetadata`前に`_scheduleBgmSeamlessLoop()`を呼んでいたため、シーク（81秒）が反映される前の`currentTime`で残り尺を計算し、ループ予約が曲の終端を過ぎてしまっていた。`_applyBgmStartTime(audio,onReady)`をコールバック式に変え、**シーク完了後に**フェードインとループ予約を行うよう変更。あわせて`_bgmStartTime`は適用時に0へリセットし、**2周目以降は曲の頭から**鳴るようにした。③ショップで手持ちカードを商品枠へ移すと右端に入り動かせなくなる不具合を修正：`_pushToRewardArea()`のショップ分岐が`filter(Boolean)`で配列を**詰めてから末尾に追加**していた（＝売切枠が消えて描画対象外の位置に入る）。売切（null）の枠を探してそこへ入れ、空きが無ければ拒否する方式へ変更。枠数は`_shopSlotCapacity()`（道具屋3／それ以外5）で判定するので道具屋の同不具合も解消。④ショップで魔導板の埋まっているマスへ商品を置くと元のカードが即売却される仕様を廃止：`placePendingPanelToSelectedUnit()`の`G._isShop`分岐で`onGoldGained()`していたのをやめ、買ったカードが抜けた提示枠へ押し出されたカードを移す「入れ替え」に変更（商品側は従来どおり購入扱いでゴールドを支払う）。押し出されたカードは`_shopSalePending`付きで提示枠に並ぶので、ドラッグで戻すことも売却ボタンで売ることもできる。⑤道具屋の売値を`_shopCardSellGain()`側でも`_itemShopSellPrice()`（レアリティ×45）に統一し、`.item-shop-card > .shop-pending-sale-ui`をCSSで表示（`treasure-offer-card > *`の一括非表示に隠されていた）。⑥旅の進捗の「祭壇」表記を「地域情報」シートの`塔の名前`に置換（`碧翠の塔まであと N 戦`／`碧翠の塔に到達`。`次の`は削除）。⑦ワールドマップ画面`#scr-map`を新設：背景`map.jpg`（`Assets.backgrounds.map`＋`applyScreenAssetBackground('map')`）、左上に街名プレート（`#map-name-plate`は`#village-name-plate`とCSSを共有）、左下に所持金/ライフ（`.battle-status-counter`を共有）、右上にオプション（`.screen-options-btn`を新設し街画面にも同じものを追加）。`WORLD_MAP_LINES`（map.js）に8本の`ui/map_line/N.svg`の左上座標とviewBox寸法・進行方向を定義し、`renderWorldMapScreen()`が到達済み＝`.is-done`（暗く）、移動中＝`.is-active dir-XX`（同じ画像を重ねてlinear-gradientマスクを進行方向へ流す`mapLineFlowLR/RL/BT/TB`）で描画。現在ライン番号は`worldMapActiveLine(wave,stage)`＝`(wave-1)*2+(stage>=5?2:1)`（wave5は0＝全て暗転）。「出発する」押下で`_playWorldMapDeparture()`が黒フェード→マップ表示（3.2秒）→黒フェード→`shopDone()`で戦闘へ、という流れを担当する。
- 【今回セッション8件目】前回パス（未検証だった7件目）の構文チェックと実機確認を完了したうえで、6件対応（index.html / js/engine/map.js / js/engine/reward.js / js/engine/main.js / assets.js / js/data/local_xlsx_data.js / assets/ui/map_line/*.svg）。①左上プレートの2段化は**取り消し**（ユーザー指示により1行のまま）。代わりに**入場演出のタイトル**を2段組みにした：`#village-intro-title`のマークアップを`.village-intro-name-sub`（80px・上）＋`.village-intro-name-main`（180px・下）に分割し、`_playVillageEnterIntro()`が半角/全角スペースで分割して流し込む。実機で sub 943〜1023 / main 1037〜1217 / 下線 1214〜 と縦に並ぶことを確認。②「ショップ」を「魔導店」へ改称（シート側もユーザーが更新済み）。`VILLAGE_FACILITY_DEFS`に`魔導店`/`魔道店`を追加（**未登録だったため押しても何も起きない状態だった**）、`villageFacilityNameVariants()`を新設して鍛冶／鍛治・魔導／魔道・旧称ショップの表記揺れを一括で吸収（説明文検索・位置テーブル・予備テキストすべてで共用）。編成画面左上の既定ラベルも「魔導店」に変更。③マップの移動アニメーションを強化：下地と光の帯のコントラストを上げ（done .5／active下地 .45）、帯を細く（mask-size 65%→45%）・速く（3.2s→1.6s linear）し、`brightness(2.6)`＋4段のdrop-shadowで発光を強めた。**それでも線が細くて視認できなかったため、`assets/ui/map_line/*.svg`8本の`stroke-width`を3px→9pxに変更**（座標・viewBoxは不変）。実機スクリーンショットで線がはっきり見えることを確認。④「出発する」押下時点で`G._villageBgmActive=false`＋`stopBgm(900)`し、街BGMをフェードアウトさせる（実機でstop:900→マップ表示→battle1の順を確認）。⑤エルムの施設背景：`Assets.backgrounds.itemShopForest`/`magicShopForest`を追加し、`VILLAGE_FACILITY_BG`（街×施設キー）＋`_applyFacilityBackground()`で適用。編成画面は`html body.reward-screen-active #scr-battle{background:…main.webp}`で背景を丸ごと差し替えているため`--screen-bg-image`では効かず、**`body.facility-bg-active`＋`--facility-bg-image`という専用の上書きルール**を新設した。街へ戻る／戦闘へ入る／通常編成画面へ戻る各所で解除する。実機で魔導店＝magic_shop_forest.png、道具屋＝item_shop_forest.pngが表示されることを確認。⑥ユーザーがシートを更新していたため、file://用の`local_xlsx_data.js`の`region`／`textMessage`をxlsxから再生成（施設が全街「魔導店」始まりに変更されている）。あわせて`VILLAGE_FACILITY_POS_BY_WAVE`のキーも`ショップ`→`魔導店`へ。
- 【今回セッション9件目】3件対応（index.html / js/engine/map.js）。①施設専用背景の画面（魔導店・道具屋）では編成画面の背景動画`back1.webm`を重ねないようにした（`html body.reward-screen-active.facility-bg-active #reward-bg-video{display:none}`。実機でdisplay:noneを確認）。②街／マップのオプションボタンが潰れて見えた真因を特定：戦闘画面の最終ルール（index.html 10094付近）では`::after`が**`option.svg`＋`button_option.svg`の2枚重ね**なのに、`.screen-options-btn`は`button.svg`1枚だったため別のボタン絵になっていた。`::after`を2枚重ね（42px 42px, 100% 100%）に、`::before`を`transform:scale(1.03)`＋`brightness(2.1)`のグロー、hoverは`::before{opacity:.84}`／`::after{grayscale(.65) brightness(1.35)}`にして戦闘画面と完全一致させた（実機で`::after`のbackgroundImageが戦闘画面と一致することを確認）。③施設ボタン位置を調整：エルム酒場53%→57%、ヴァルガ 鍛冶屋88→91% / 道具屋29→24% / 宿屋(45,76)→(38,40)＝道具屋より上 / 魔導店(76,38)→(70,55)、ギャラハ鍛冶屋82→62%、ヴォルザーク 魔導店38→91%（画面右端）・酒場(27,68)→(78,68)＝魔導店の左下。エルム／ヴァルガ／ギャラハ／ヴォルザークの4街ともスクリーンショットで確認済み。
- 【今回セッション10件目】3件対応（index.html / js/engine/map.js / js/engine/reward.js）。①ゲームオーバー画面のレイアウトを修正：(a)`.gameover-rows`だけ`transform:translateX(65px)`が無く、タイトル／ライン／ボタン（+65px）に対して項目グループが65px左にずれていた（到達地点が「N階」から長い街名になったことで目立つようになった）。同じ+65pxを付与し、`justify-content:center`＋`max-content`列との組み合わせで**地域名や敵名の長さに関わらず自動で「旅の終焉」の中心に揃う**ようにした（実測：タイトル中心1159＝行グループ内容中心1159、差0）。(b)`#gameover-shell`を`top:15.5%`から`top:50%`＋`translateY(-50%)`に変更し、「旅の終焉」〜魔導板のセットを画面の縦中央に揃えた（実測：セット387〜1783＝中心1085、画面中心1080）。②施設ボタン位置を再調整：ヴァルガ 鍛冶屋91→89% / 道具屋24→29% / 魔導店(70,55)→(66,42)、ギャラハ 鍛冶屋62→72%、ヴォルザーク 酒場(78,68)→(70,76)。③旅の進捗アイコンのホバー表示を「村」「祭壇」から**そのステージの街の名前／塔の名前**に変更（`_journeyNodeLabel(type,scene)`に`scene`引数を追加し`regionInfoForWave()`から解決。実測：wave1＝「大樹の抱く集落 エルム」「碧翠の塔」、wave3＝「赤土と鍛冶の集落 ギャラハ」「赤禍の塔」）。
- 【今回セッション11件目】ゲームオーバー画面が画面上部に寄る不具合を修正（index.html）。真因は`#scr-gameover.gameover-overlay-active`の`inset:0!important`で、**オーバーレイがビューポート左上に貼り付いていた**こと。ゲームキャンバス（`#scr-battle`）はウィンドウが16:9でない場合`--game-offset-y`で上下中央に置かれるため、オーバーレイだけがそのオフセット分だけ上にずれ、前パスで入れた`top:50%`が「ビューポートの中央」＝「見えているキャンバスより上」になっていた。`inset:0`をやめ、他の画面と同じ`left:var(--game-offset-x)/top:var(--game-offset-y)/width:var(--game-w)/height:var(--game-h)`に揃えた。実測：1000×700（非16:9）でキャンバス69〜631とオーバーレイ69〜631が一致し、セット中心352＝キャンバス中心350（差2px）。1280×720（16:9）でも差2pxで維持。
- 【今回セッション12件目】ゲームオーバーの「到達地点」を街の名前から**道の名前**に変更（main.js `_runStatsAreaName()`）。街より前（stage1〜4）は「街までの名前」、街を出た後（stage5〜）は「塔までの名前」を使う＝戦闘カットインの副題と同じ`_waveBattleRouteName()`を流用。実測：wave1 stage1〜3＝木漏れ日の古道／wave1 stage5・9＝深緑の迷い路／wave2 stage1＝開拓者の街道／wave2 stage7＝風鳴りの荒野路／wave4 stage6＝謁見の黒影道／wave5＝断絶の巡礼路。実際のゲームオーバー画面でも`#go-area`が「木漏れ日の古道」になることを確認。
- 【今回セッション13件目】施設ボタンの配置をpx直接指定に変更（js/engine/map.js / index.html）。`VILLAGE_FACILITY_POS_BY_WAVE`の値を`{left,top}`の%指定（中心合わせ）から`{x,y}`のpx指定（**左上合わせ**、ゲームキャンバス3840×2160座標）へ変更し、`renderVillageScreen()`が`x`を持つ定義では`.village-facility-topleft`（`transform:none`で中心合わせのtranslateを打ち消す）を付けて`left/top`をpxで設定する。%指定の汎用スロット（`VILLAGE_FACILITY_POS`）は従来どおり中心合わせで併存し、`_villageFacilityPositions()`の「使用済みスロット」判定は%指定同士だけで行う。指定座標：エルム 酒場(1770,516)／魔導店(267,814)／道具屋(3132,1020)、ヴァルガ 鍛冶屋(3209,967)／魔導店(2352,967)／道具屋(756,1020)／宿屋(1231,814)、ギャラハ 鍛冶屋(2481,487)／魔導店(2826,899)／広場(486,1481)、ヴォルザーク 酒場(2485,1698)／魔導店(3206,1100)／鍛冶屋(335,1096)、フォルセティ 魔導店(485,910)／宿屋(2723,839)／道具屋(1198,972)。実機で全5街・全ボタンの左上座標とサイズ（498×124）が指定値と完全一致することを確認。`VILLAGE_FACILITY_POS_BY_NAME`は全街が個別指定になったため空にした。
- 【今回セッション14件目】2件対応（index.html / js/engine/map.js / js/engine/audio.js / assets.js）。①デバッグモードで街画面にもミュートボタンを表示：`#village-mute-btn`を`#scr-village`に追加し、オプションボタン（left:3666 / top:70 / 110×90）の直下（top:180）へCSSで固定配置。表示・アイコン同期・onclickは`renderVillageScreen()`が`G._debugMode`を見て設定する。`toggleDebugMute()`（audio.js）は戦闘・街の両ボタンを同期するよう変更し、状態取得用に`isDebugMuted()`を追加。実測：デバッグON＝display:block・(3666,180,110×90)、デバッグOFF＝display:none。②ヴァルガ（ステージ2）の施設背景を追加：`Assets.backgrounds`に`itemShopGrassland`/`magicShopGrassland`/`blacksmithGrassland`を登録し、`VILLAGE_FACILITY_BG[2]={item,shop,forge}`を設定。実測で道具屋＝item_shop_grassland.png／魔導店＝magic_shop_grassland.png／鍛冶屋＝blacksmith_grassland.pngが適用され、いずれも`back1.webm`は非表示（既存の`facility-bg-active`ルールが効く）。エルム（ステージ1）側も従来どおりmagic_shop_forest.pngのままであることを確認。
- 【今回セッション15件目】施設内の枠を80%不透明にする対応を一度入れたが、**ユーザー確認の結果「変わっていないどころかライフ枠など一部はより透けた」ため全て取り消した**（背景素材側で対応する方針）。追加したCSSブロックと`body.facility-screen-active`（reward.js）の付与を削除し、実測で施設内・編成画面とも枠の各レイヤーがopacity:1／counter.svg・reward.svgが要素自身の背景／`#hand-pane-board-bg`もopacity:1と、変更前と同じ状態に戻ったことを確認。※`facility-bg-active`（施設ごとの背景画像とback1.webm非表示）は別機能なので残している。
- 【今回セッション16件目】旅の進捗のエリート／ボスのホバー表示を改善（js/engine/render.js `_formatJourneyEnemyHtml`）。①キーワードが太字にならなかったのは、`_boldKeywordsInHtml()`が固定のキーワード一覧（毒牙・全体攻撃など一部）しか太字化しない実装で、敵のキーワードに当たらないケースがあったため。この箇所は「キーワードそのものを並べる」場所なので、無条件に`<strong>`で囲むよう変更。②キーワードの説明も併記するようにした（`KW_DESC_MAP`→`_enchantKeywordDesc()`の順で引き、末尾の数字はXへ差し込む。効果テキストの下に区切り線を挟んで「名前：説明」形式で表示）。実測：エリート「残響の魔導師“アバドン”」＝**全体攻撃**＋「全体攻撃：このキャラクターの攻撃は、全ての敵にダメージを与える。」、ボス「鉄の拳“フォルニョート”」＝**二段攻撃**＋常時効果＋「二段攻撃：このキャラクターは攻撃後、再攻撃する。」
- 【今回セッション17件目】2件対応（index.html / js/engine/render.js）。①街の施設（魔導店／道具屋／鍛冶屋）で、店の背景画の真上に`assets/art/backgrounds/black.svg`（3840×2160の横方向グラデーション）を乗算で重ねた。`html body.reward-screen-active.facility-bg-active #scr-battle::before`に`background`＋`mix-blend-mode:multiply`＋`z-index:0`を指定（UIはz-index:1以上なので影響しない）。既存の「reward-screen-active中は`#scr-battle.asset-backed::before`を`content:none;display:none`にする」ルールと同詳細度なので、`</style>`直前に置いて後勝ちさせている。実測：施設内＝content:""/display:block/mix-blend-mode:multiply/z-index:0、通常の編成画面＝content:none/display:noneで従来どおり。②旅の進捗のキーワード説明を、`keywords`列だけでなく**効果テキスト中に登場するキーワード**も対象にした（`_formatJourneyEnemyHtml`）。`KW_DESC_MAP`の全キーを本文に対して走査し（末尾Xの見出しは`\d*`付きで数字あり／なし両対応）、出現順に重複除去したうえで、他の検出語に含まれる短い語（例「毒牙2」に対する「毒」）は落とす。実測：ボス「不敗の剣鬼“マニガンス”」の効果文「開戦：全ての味方が結界1を得る。」から「結界1：このキャラクターはダメージを1回無効化する。」（X→1の差し込み込み）が出るようになった。エリート「虚飾の歌姫“リリス・ヴェノム”」の三方向攻撃・毒牙8も従来どおり表示。
- 【今回セッション18件目】村の入場演出中に、まだ見えていない施設ボタンが押せてしまう不具合を修正（index.html / js/engine/map.js）。原因は`.village-facility{pointer-events:auto!important}`で、親（`#village-facilities`）を`pointer-events:none`にしても子のボタン側で復活していたこと（`village-intro-hide-ui`の`#scr-village > *`ルールは親にしか効かない）。CSSに`html body.village-intro-active #scr-village` / `html body.village-intro-hide-ui .village-facility` / `html body.village-intro-reveal-ui .village-facility`の`pointer-events:none`を追加（フェードイン中も完全に見えるまでは押せない）。あわせてJS側でも`_onVillageFacility()`と`villageDepart()`の先頭に`if(G._villageIntroPlaying) return;`を追加した。実測：演出中（t600〜t2600）は施設ボタン・出発するとも`pointer-events:none`で、クリックしても画面遷移せず（scr-village／isShop:false／stage不変）。演出完了後（t2900〜）は両方`auto`に戻り、クリックで魔導店が開く（左上ラベル「魔導店」）ことを確認。
- 【今回セッション19件目】編成画面・施設内の「魔導板」ラベル位置をゲームオーバー画面と揃えた（index.html）。`#hand-pane::before`のルールは3箇所あり、最後（source順で勝つ）の`html body.reward-screen-active #hand-pane::before`だけが`top:38px!important`で、ゲームオーバー用の`#gameover-board-grid>#hand-pane::before`は`top:48px`だったため10pxずれていた。編成側を48pxに変更して統一。実測：編成画面・魔導店（施設内）とも`::before`の`top`が48pxになったことを確認。
- 【未対応・申し送り】ホームと酒場の中身は未実装（ボタンと説明文のみ）。広場も指示通り表示のみでクエスト機能は未実装。「テキストメッセージ」シートに道具屋・宿屋・広場の`街「◯◯」直下`行が無いため、その3つはコード側の予備テキスト（`VILLAGE_FACILITY_FALLBACK_DESC`、map.js）を表示している（シートに行を追記すればそちらが優先される）。祭壇（塔側の`_openWaveAltarMenu`）は今回スコープ外のため従来の編成画面ベースのまま。ステージ0（風止みの村 リーゼ／ホーム）はwave進行が1始まりのため現状到達しない。`assets/sfx/board_change2.wav`は依然未配置（board_change1.wavへフォールバック中）。街の効果動画・専用BGMはステージ1（エルム）のみ定義済みで、他ステージは`VILLAGE_BG_VIDEOS`/`VILLAGE_BGM`（map.js）へ追記すれば有効になる。

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
