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
- 【演出・BGM】街への入場演出`_playVillageEnterIntro()`：黒フェード→背景を放射グラデーションのマスク（`mask-size`を0→420%）で中央から滑らかにフェードイン→途中で地域名（2段組み・白＋ドロップシャドウ）＋`battle_line.svg`を表示、同時にboom.wav→**文字と下線が完全に表示された時点（title の opacity transition .5s 完了時）から街BGMを再生**→消えてから他要素をフェードイン。演出中は`.village-facility`が`pointer-events:auto`を持つため、CSSとJS（`G._villageIntroPlaying`）の両方でクリックを止めている。街BGMは`VILLAGE_BGM`（ステージ別に曲・開始位置・重ねる環境音を定義。0リーゼ=village_start@1:23／1エルム=village_forest@1:21／2ヴァルガ=village_grassland@1:10／3ギャラハ=village_valley@1:15／4ヴォルザーク=city_capital@0:47／5フォルセティ=village_endworld@1:50+bug、フェードイン600ms）、塔（祭壇）は**村と全く同じ形式**：`_openWaveAltar()`→`openMapVillage({intro:true,tower:true})`で`#scr-village`を塔仕様（`G._isWaveAltar`で分岐：名前＝シートの塔の名前／施設＝「塔の施設」列（祭壇→指輪交換・踊り場は未実装）／背景＝tower.png／効果動画＝tower.webm／BGM＝`TOWER_BGM`(tower.wav@1:37)）で開く。`_openWaveAltarMenu()`は互換ラッパー（指輪交換の「祭壇を離れる」の戻り先）。塔の施設位置は`TOWER_FACILITY_POS`（祭壇2260,246／踊り場1621,1402。全ステージ共通・左上合わせpx）、説明文は「テキストメッセージ」シートの`塔「◯◯」直下`を参照（未登録なら`VILLAGE_FACILITY_FALLBACK_DESC`）。祭壇は指輪取得済み（`G._waveRingExchange[wave].resolved`）でも**入場できる**（グレーアウトなし）。取得後の中身は`_renderRingOfferResolvedFrames()`（reward.js）が空の枠3つ（`RING_OFFER_SLOT_COUNT`・`.ring-offer-spent`）だけを描き、見出し下の説明文は`body.ring-offer-resolved`で「対価の力は与えられた」に差し替わる。取得直後の1回だけ、残った指輪が元の位置でフェードアウトする（取得時に`G._ringOfferFadeOut={taken,offer}`へ退避→`.ring-offer-fading`／`@keyframes ringOfferFadeOut`。再入場時は最初から枠だけ）。`G._ringOffer`のspliceは維持している（ボス報酬の`_hasPendingRingOffer`が`length>0`で判定しているため、残したままにすると報酬フローが壊れる）。環境音はチャンネル制の`playBgmLayer(channel,key)`／`stopBgmLayer(channel)`（audio.js）。`'ambient0〜2'`＝街の環境音（複数可。`_applyVillageAmbience()`が配列を固定チャンネルへ割り当て）、`'facility'`＝施設内の環境音（鍛冶屋＝blacksmith.wav、`FACILITY_AMBIENCE`）で、別チャンネルなので雷を止めずに重なる。`'stage0〜2'`＝ステージ持続環境音（`STAGE_AMBIENCE`／`_syncStageAmbience()`。ステージ4は雷=最初の戦闘から・雨=街から、どちらも塔に入るまで止めない）。いずれも`loop=true`で常に頭からループする。`stopBgm()`は`stage*`以外のチャンネルだけを止め、`stage*`は`_syncStageAmbience()`と`stopEveryBgmLayer()`（ゲームオーバー／`startGame()`）でしか止まらない。街の効果動画は`VILLAGE_BG_VIDEOS`（1エルム=village_forest／3ギャラハ=village_valley／4ヴォルザーク=city_capital（これのみ3倍の0.9）、塔は全ステージtower.webm）。いずれもscreen合成・不透明度50%・再生速度30%。値は文字列または`{src,rate,layers}`で、**`layers:2`にすると同じ動画を2枚重ねる**（`#village-bg-video`＋`#village-bg-video-2`。screen合成が2回掛かるので薄い動画がはっきり見える）。塔のtower.webmが薄かったため2重にしている。2枚目は`_syncBgVideoLayerTime()`が2秒ごとに再生位置を1枚目へ合わせる（ずれると別々の明滅になり「2重」にならない）。CSSは`#village-bg-video-2`にも同じ指定＋入場演出の除外指定を追加済み。塔（祭壇）の背景は`tower.png`で、`_setOverrideBackground('tower')`を`_openWaveAltarMenu()`から呼ぶ（施設背景と同じ`body.facility-bg-active`＋`--facility-bg-image`の仕組みを共用。back1.webmも自動で非表示になる）。曲ごとの既定開始位置は`BGM_DEFAULT_START_TIMES`（battle3=1:43、tower=1:37）で、`playBgm()`が`opts.startTime`未指定時に使う。`G._villageBgmActive`が立っている間は`goToReward()`/`showScreen()`がBGMを触らない（＝店に入ってもmenu.wavへ切り替わらない）。`playBgm()`の`opts.startTime`は初回のみで、2周目以降は曲の頭から。ワールドマップは街・塔どちらの「出発する」でも表示する（`departWithWorldMap()`を村ボタンと`renderMoveSlotsInEnemy()`の祭壇ボタンで共有）。`WORLD_MAP_LINES`（`ui/map_line/*.svg`を左上合わせのpx座標で配置）を`worldMapActiveLine(wave,stage)=(wave-1)*2+(stage>=5?2:1)`で塗り分け、進行中の1本だけマスクを流して光らせる。表示するラインは「これから向かう区間」なので、`_playWorldMapDeparture()`で村（stage4）→stage5、塔（stage10）→次waveのstage1へ読み替えてから求める。現在地マークは`WORLD_MAP_MARKS`（キー＝activeLine、`ui/map_mark.svg`を左上合わせpx）で、本体に`mapMarkBob`（上下の揺れ）、`::before`に`mapMarkGlow`（発光）を掛ける。**`map_mark.svg`には矩形のPNG影が埋め込まれており、本体へdrop-shadowを掛けると発光が四角くなる**ため、ピン形状だけを白で抜いた`ui/map_mark_glow.svg`（本体SVGのpathから生成）を発光レイヤーに使っている。wave5（蝕界の塔後）はactiveLine=0でラインのアニメーションを行わずマークのみ。
- 【表示テキスト】戦闘カットインはタイトル「戦 闘 開 始」固定＋副題が道中の固有名（stage1〜4＝「街までの名前」／stage5〜＝「塔までの名前」、`_waveBattleRouteName()`）。ゲームオーバーの「到達地点」も同じ道中名。旅の進捗の「祭壇」表記は「塔の名前」に、村／祭壇アイコンのホバーは街名／塔名。エリート／ボスのホバーはキーワードを無条件に太字化し、`keywords`列に加えて**効果テキスト中に出てくるキーワード**も`KW_DESC_MAP`で走査して説明を併記する（末尾Xは数字を差し込み、「毒牙2」に対する「毒」のような包含語は除外）。
- 【直した既存バグ】祭壇でカードを3枚還魂しても指輪が解放されなかった原因は、還魂ボタンのハンドラ（reward.js、`.discard-btn`のonclick）で**デバッグモード分岐が指輪解放の判定より先にreturnしていた**こと（カードは盤面から消えるが`_boardDiscardCount`が増えない）。`_ringOfferDiscardable`の判定を`arrName==='unitEquip'`直後（ショップ・デバッグ分岐より前）へ移動して解決。実測で1→2→3枚で解放、取得後は`resolved`が立ち塔へ戻ると祭壇がグレーアウトする。
- 【やって取り消したこと】施設内の枠を80%不透明にする対応は「一部がより透けた」ため全て撤回済み（背景素材側で対応する方針）。左上プレートの2段組みも取り消し、2段にするのは入場演出のタイトルのみ。

- 【今回：音の破綻の原因と修正】ヴォルザークでcity_capital.wavが途中から急に鳴り出す／その後の戦闘BGMが一切鳴らなくなる、の原因は**`_fadeAudioVolume()`がモジュール変数1本（`_bgmFadeTimer`）でフェードを管理していた**こと。BGMと環境音を同時にフェードすると、①後発が先発のタイマーを消して先発が途中の音量で固まる（`stopBgmLayer`のfinishも呼ばれず居残る）②`setInterval`のコールバックが自分のidではなくモジュール変数を`clearInterval`するため、完了時に**今動いている別のフェードを殺して自分は永久に回り続ける**（ゾンビタイマー）。②が1本でも生まれると以後すべてのフェードが30msで止まり、BGMが極小音量に固定される。**音声要素ごとのタイマー（`audio._fadeTimer`）＋ローカルidのclearInterval**へ修正（`_cancelAudioFade()`を追加）。デバッグミュートで環境音が消えなかったのも同じ原因（走行中のフェードが直後に音量を戻していた）で、`toggleDebugMute()`はBGM・次曲・全レイヤーのフェードを止めてから音量を確定するようにした。
- 【今回：シートが反映されていなかった】`塔「祭壇」直下`等がシートにあるのに出なかったのは、xlsxのファイル名が`Vesselbound_data (1).xlsx`になっていて`loader.js`の`_XLSX_PATHS`が見つけられず、**古い内蔵CSV（`js/data/local_xlsx_data.js`）へ黙ってフォールバックしていた**ため（＝直近のシート編集が全て無視されていた）。`_XLSX_PATHS`に`(1)`付きも追加し、内蔵CSVの`textMessage`/`region`を再生成した。以後シートを更新したら`python3 tools/update_local_xlsx_data.py textMessage region`（キー指定で該当シートだけ差し替える。既存キーの数値表記を壊さないため全書き換えはしない）。読み込み元はコンソールの`[Vesselbound] XLSX path:`で確認できる。
- 【今回：旅の進捗のSceneマーク】上段のSceneマーク5個のホバーは、ブラウザ標準の`title="Scene N"`をやめて`data-preview`＝そのステージの塔の名前（`_journeySceneTowerName()`、reward.js。ステージ5は`???`固定）にした。枠はカードと同じ`#kw-tooltip`をそのまま使い、見出しだけの1行なので`data-preview-norule`属性→render.jsが`#kw-tooltip`に`no-title-rule`を付け、CSSで`.preview-title`の`border-bottom`／`padding-bottom`／`margin-bottom`を消し、あわせて`#kw-tooltip`の固定幅（`width:calc(460px*var(--game-scale))`）を`width:auto`にして文字幅＋左右パディング分だけに縮めている（通常のカードは直線あり・固定幅のまま）。下段のノード列も同じ枠に統一し、**カードを出すエリート／ボス（`data-journey-enemy`あり）以外**＝一般戦闘・街・塔に`data-preview-norule`を付けている。ノードのラベルは`_journeyNodeLabel()`（battle=「一般戦闘」／city=街の名前／altar=塔の名前）。
- 【今回：塔と街で帯の高さが違って見えた原因（重要）】`#village-name-plate`のボックスは実測で街・塔とも高さ200px・top100pxで**CSSは完全に同一**。にもかかわらず見た目が違ったのは、`name_back.svg`に`preserveAspectRatio`が無かったため。**`background-size:100% 100%`を指定してもSVGは既定の`xMidYMid meet`でviewBox比(1400:200)を保ったまま「幅に合わせて」縮小され、帯が縦にレターボックス化する**（街 幅930px→帯133px／塔 幅717px→帯102px、どちらも200px枠の中で上下中央）。つまり帯の実高さが要素の幅に比例していた。SVGルートに`preserveAspectRatio="none"`を追加して解決（ブラウザキャッシュ対策でCSSのURLに`?v=`を付与している。SVGを差し替えたら必ず更新すること）。その後、帯の高さは**180px**へ変更（CSS`height:180px`＋SVGのviewBox`0 0 1400 180`／下線`y=177`を1:1で合わせている。上辺Y=100pxは据え置き）。**getBoundingClientRectだけでは絶対に検出できない**種類の差なので、「数値は同じなのに見た目が違う」時はSVG側のpreserveAspectRatioを疑うこと。

- 【今回：ステージ持続演出の追加分】ステージ4の雷は**戦闘中も見えている必要がある**ため、街画面の`#village-bg-video`とは別に`#scr-battle`側へ`#stage-bg-video`を追加した（`STAGE_BG_VIDEOS`／`_syncStageBgVideo()`、map.js）。見え方は街と同じ（screen合成・不透明度50%・rate0.9）。重ね順は`#scr-battle::before`（ステージ背景＝z-index:-1）より手前、`.battle-scroll`（戦闘UI＝z-index:1）より奥の**z-index:0**。`_syncStageAmbience()`が動画と環境音をまとめて更新する。
- 【今回：環境音のループ継ぎ目】`<audio loop>`のネイティブループは終端→先頭で無音が入る（rain.wavが途切れる）。メインBGMと同じ方式（終端0.18s手前で次の再生を重ね、前の音を120msでフェードアウト）を環境音チャンネルにも実装＝`_scheduleLayerSeamlessLoop()`（audio.js）。`playBgmLayer()`は`loop=false`にしてこのスケジューラに任せ、`stopBgmLayer()`はループタイマーも止める。※rain.wavの前後に無音は無い（実測RMS約3000）ので、原因は純粋に継ぎ目だった。
- 【今回：BGMの音量を曲ごとに正規化】音源のマスター音量が曲ごとに最大8.6dB違っていた（実測RMS[dBFS]：battle1 -10.8／battle3 -12.2／village_forest -12.7／village_grassland -11.1／village_valley -13.0／tower -10.8／city_capital -17.2／village_endworld -19.4／game_start -18.9／menu -32.3）。`BGM_DEFAULT_VOLUMES`を「RMS×音量」が-16dBFS前後に揃うよう個別設定し、`showScreen()`が戦闘BGMへ渡していた`volume:.32`の決め打ちを削除（これが戦闘BGMだけ小さかった主因）。city_capital・village_endworld・game_start・menuは音量1.0でも目標に届かない＝**音源側を作り直さないとこれ以上上げられない**。
- 【今回：直した祭壇のバグ2件】①指輪取得直後に枠まで消えていた（要素自体をフェードしていた）→フェードは指輪の絵（`.ring-offer-fading::after`）だけに掛け、枠（`::before`のring_slot）は残すようにした。②**別の塔の祭壇で指輪が出ない**：`openMapRingExchange()`の新規作成分岐が`G._ringOfferUnlocked`/`_ringOfferResolved`/`_boardDiscardCount`を初期化しておらず、前の塔の`resolved=true`を持ち越して「取得済み＝空の枠」表示になっていた。分岐内で明示的にリセット。

- 【今回：施設キャッシュの保存先ズレ（デバッグで指輪が出ない原因）】`_syncWaveFacilityCache()`が保存時に`G._wave`を読んでいたため、デバッグの旅の進捗Sceneジャンプ（`_bindDebugSceneJump`は**`G._wave`を書き換えてから**`_openWaveFormation()`を呼ぶ）で、祭壇の状態（resolved=true）が**移動先ステージのキー**へ書き込まれ、次の塔で最初から「取得済み＝空の枠」になっていた。`openMapShop/Forge/ItemShop/RingExchange`が入場時に`G._facilityCacheKey`を記録し、保存はそのキーを使うよう変更（`_startWaveBattle`でクリア）。ショップ・鍛冶屋の在庫にも同じズレが起きうる箇所だった。
- 【今回：エリート/ボス戦後の暗転で盤面が一瞬見えた】`continueAfterBattleVictory()`が`action()`直後に黒オーバーレイ2枚を無条件で外していたため、`_playVillageEnterIntro()`の暗転（.34s）が乗るまでの間だけ盤面が見えていた。①演出中（`G._villageIntroPlaying`）は`continueAfterBattleVictory()`が黒を外さない、②`_playVillageEnterIntro()`は既に暗転済みなら自前のフェードを省いて即`opacity:1`から始め、村画面を組み立てた時点で戦闘側の黒を外す、の2点で解決。
- 【今回：#stage-bg-videoの表示条件】編成画面・施設内（`body.reward-screen-active`）ではCSSで`display:none`にする。**pauseはしない**ので勝利・撤退の表示中や次の戦闘へ切れ目なく続く（勝利・撤退の時点では`reward-screen-active`がまだ付かないため表示されたまま）。

- 【今回：SEの音量を正規化】**`playSfx()`が`ui`/`reward`グループを問答無用で`finalVol=1.0`に上書きしていたため、`SFX_SETTINGS.sounds`の個別音量が全く効いていなかった**（音源のマスター音量差がそのまま出て、altar_in -1.0dBFS と ui_confirm -19.9dBFS で約19dB差）。この上書きを削除し、先頭の音量ハックも`dataset.sfx==='1'`（`_sfxAudio()`が付与）を対象外にして個別音量が通るようにした。目標は UI・報酬=-12dBFS／打撃の強度段階 1=-15・2=-12.5・3=-10（1<2<3の差は意図的なので維持）／その他の戦闘・魔法=-11。UI/報酬のばらつきは18.9dB→7.9dB。
- 【今回：直接new Audioしていた箇所を集約】買う/売る/指輪取得/アイテム取得/合体/魔導板変更/登場/ライフ喪失/ゲームオーバーは各所で`new Audio()`を直に叩いており、**音量管理からも外れ、デバッグミュートも効いていなかった**。`playFileSfx(path,volume)`＋`FILE_SFX_VOLUMES`（audio.js）に集約し、`SFX_SETTINGS.masterVolume`とプレビュー無音化に従うようにした。
- 【音量調整の手順】音源のラウドネスは「最大200ms窓のRMS(dBFS)」で測っている（BGMは全体RMS）。目標dBFSを決めて `音量 = 10^((目標 - 実測)/20)`（上限1.0）。実測が目標より小さい音源は1.0でも届かない＝音源の作り直しが必要（BGM: city_capital/village_endworld/game_start/menu、SE: ui_confirm/fit/item_get/select/ui_error/life_lost/K026）。

- 【今回：出発ムービー】ワールドマップの代わりにムービーを流すステージを`DEPARTURE_MOVIES`（map.js。キー＝`G._wave`、街のみ・塔は対象外）で定義する。現在はステージ5（フォルセティ）＝`assets/movie/movie1.webm`。`departWithWorldMap()`が分岐し、`_playDepartureMovie()`が暗転→全画面`#cutscene-video`で再生→`ended`で暗転→`shopDone()`（次の戦闘へ）→明転、の順に進める。`ended`/`error`のどちらも来ない場合に備え、尺+1.5秒（尺不明なら30秒）で必ず抜ける安全弁を張っている。音量はデバッグミュート（`SFX_SETTINGS.masterVolume`）に追従。z-indexは暗転（`#village-enter-fade`＝99000）より奥の98000。

- 【今回：ゲーム開始地点をリーゼに】`startGame()`は`_openWaveFormation()`ではなく`G._wave=0 / G._waveStage=4`で`_openWaveVillage(4,false)`を呼び、「風止みの村 リーゼ」（地域情報シートのステージ0）を**普通の村と同じ`#scr-village`＋入場演出**で開く。背景は`Assets.backgrounds.village0`（専用画が無いため`camp.png`を流用中→差し替え候補）、BGMは`VILLAGE_BGM[0]`＝village_start.wav@1:23。ホーム・図書館は`VILLAGE_FACILITY_UNIMPLEMENTED`（キー`home`/`library`）に入れて**表示はするが押せない**（`.village-facility-disabled`で暗転）ので、選べるのは「出発する」だけ。出発すると`_startWaveFlowNext()`が先頭で`G._wave===0`を捕まえて`G._wave=1`＋`_startWaveBattle(1)`へ進める。ワールドマップの光らせる区間も`_playWorldMapDeparture()`でステージ0→(wave1,stage1)へ読み替えている。`getVillageBackgroundKey()`と`_waveFacilityCacheKey()`の`Math.max(1,…)`を`Math.max(0,…)`に変更済み（ステージ0をステージ1と混同しないため）。

- 【今回：塔→街でマップが2回出た】`_playWorldMapDeparture()`が`done()`の後で無条件に暗転を明転させ、さらに`_playVillageEnterIntro()`が`#village-enter-fade`の現在値を見ずに`opacity:0`から自前のフェードをやり直していたため、「マップ→暗転→マップ→暗転→街」になっていた。①マップ／ムービー側は`G._villageIntroPlaying`なら明転せず演出へ引き継ぐ、②入場演出は`#village-enter-fade`が既にopacity≧0.99なら`alreadyBlack`扱いにして自前のフェードを省く、の2点で解決（戦闘後の`continueAfterBattleVictory()`と同じ考え方）。
- 【今回：デバッグ用の編成ボタン】ミュートボタンの直下に「編成」ボタンを追加（`#battle-formation-btn`／`#village-formation-btn`）。どちらも`debugOpenFormation()`（main.js）を呼び、`village-screen-active`等を外してから`_openWaveFormation()`する。戦闘画面側は`_positionDebugMuteButton()`と同じ方式でミュートボタンに追従（`_positionDebugFormationButton()`）、街画面側はCSS固定（left:3666px / top:290px / 110x90＝オプション70・ミュート180の下）。デバッグモードON/OFFで表示を切り替える。

- 【未対応・申し送り】ホーム・酒場・広場は表示のみ（中身は未実装）。祭壇（塔側の`_openWaveAltarMenu`）は従来の編成画面ベースのまま。街の効果動画・専用BGMはステージ1のみ、施設背景はステージ1〜3のみ定義済み（`VILLAGE_BG_VIDEOS`/`VILLAGE_BGM`/`VILLAGE_FACILITY_BG`、map.js）。「キーワード」シートに`シールド`の行が無いためステージ3ボスの説明が出ない。`assets/sfx/board_change2.wav`は未配置（board_change1.wavへフォールバック中）。

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
