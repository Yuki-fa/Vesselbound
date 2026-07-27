すべての思考・回答・コメントは日本語で行うこと。

# AGENTS.md

このファイルは、このリポジトリ内のコードを扱う際のガイダンスを提供します。
ユーザーは高速な試作検証を重視している。
「完全性」より「短時間で試せる状態」を優先すること。

## 現在の状態（最新セッション終了時点）

- 【今回追加】不要な鑑定/旧廃棄ゴールド処理を削除し、報酬/ショップ/指輪抽選式を仕様へ寄せた（pool.js／reward.js／map.js／state.js／index.html）。未コミット。
  - 既存変更を先に`main`へコミット`b9a370f`し、`origin/main`へプッシュ済み。
  - `equip_appraiser`による報酬グレード上振れを削除。通常廃棄の返金は常に0にし、ショップ内の非魔導板系スロットに残っていた旧`+1G`売却分岐も削除。ショップ売却は販売価格の1/4のみ。
  - 戦闘報酬カード抽選を「現在マップ以下85%／上位15%」＋レアリティ重み（50/25/15/7/3）へ変更し、最低1枚ずつキャラクター/エンチャントを含める既存保証を維持。ショップ5枠も同じ重みを使いつつ、2枚はR1のみ、2枚はR2以上、1枚はR3以上。
  - ボス指輪報酬は「所持済み除外」ではなく「過去にボス報酬として提示済み除外」を`G._bossRingOfferSeen`で追跡するよう変更。タグなし判定は空欄/`-`対応。`node --check`はpool/reward/map/state通過。
- 【今回追加】XLSXシート名変更によるカードデータ崩れとエリート最低倍率を修正（loader.js／local_xlsx_data.js／map.js／index.html）。未コミット。
  - 現行`Vesselbound_data.xlsx`は旧名の`階層データ`/`強化`/`階層レベル`ではなく、`計算式`/`エンチャント`/`深層レベル`になっていたためXLSX読込が失敗し、古い`local_xlsx_data.js`へフォールバックしてカード名・絵・テキスト・紫カードのステータスが崩れていた。ローダーを新旧シート名対応へ修正。
  - `local_xlsx_data.js`を現行XLSXから再生成し、フォールバック時も旧カード表へ戻らないようにした。script版数タグも更新。
  - エリート戦倍率を最低1.2倍に戻し、破壊した村/宝箱の数だけさらに1.2倍が累積する式に修正。`node --check js/data/loader.js`, `js/data/local_xlsx_data.js`, `js/engine/map.js`, `js/engine/enemy.js`通過。実機目視は未実施。
- 【今回追加】計算式まわりの指定反映（pool.js／main.js／map.js／reward.js／index.html）。未コミット。
  - パネル在庫を `9 - グレード` に変更。初期カード候補からのダイアウルフ除外を解除。リロールはボタン表示と関数本体を無効化し、施設説明のリロール文言も消した。
  - ボス撃破マップボーナスを `残りターン^2 ×10G` に変更。エリート戦は深層レベル4固定、ボス戦は深層レベル5固定で階層補正を参照するよう変更。エリート固定1.2倍は外し、村/宝箱破壊の成長倍率だけを使う。
  - `node --check js/engine/pool.js`, `main.js`, `map.js`, `reward.js`, `enemy.js` 通過。実機目視は未実施。
- 【今回追加】階層グレード改め「階層レベル」/「深層レベル」シート対応（loader.js／floors.js／map.js／index.html）。未コミット。
  - 新CSV gid `708322601` を `階層レベル`/`深層レベル` として登録し、結合セルで空欄になる「マップ」列を前行から引き継いで `window.MAP_DEEP_LEVEL_DATA` に読み込むよう変更。
  - ローカル/内蔵XLSXが先に読まれても新シートだけGoogle CSVから補完取得する安全弁を追加。内蔵フォールバックも4マップ×深層6（map3/deep6=4）へ更新。
  - マップ戦闘の階層参照を `(マップ, 初期地点からの距離=深層レベル最大6)` に変更し、ターン補正を `1+現在ターン×0.5`、ボス1.5、強制ボス追加2倍、エリート1.2系に整理。script版数を `deeplevel1` へ更新。
  - `node --check js/data/loader.js`, `js/data/floors.js`, `js/engine/map.js` 通過。公開CSVで `マップ3/深層レベル6/補正4` を確認済み。実機戦闘の目視確認は未実施。
- 【今回追加】魔導板強化シートから鍛冶屋パネルの価格・説明文を参照するよう対応（loader.js／map.js／index.html）。未コミット。
  - 公開HTMLから`魔導板強化`のgidが`496120185`であることを確認し、`_SHEET_GIDS`とxlsx任意シート定義へ追加。
  - ローカルxlsxに同シートが無い/空の場合でもGoogle CSVから任意取得し、`window.MAP_PANEL_POWER_SHEET_ROWS`へ保存。`map.js`側でM001〜M005または名前一致により`MAP_PANEL_POWERS`の`price`/`desc`を上書きする。
  - `loader.js`/`map.js`の読み込み版数を`mappower1`へ更新。`node --check js/data/loader.js`, `js/engine/map.js`, `js/engine/battle.js`通過。
- 【今回追加】鍛冶屋「共鳴の力」と鍛冶屋中の報酬欄ドラッグ開放を修正（battle.js／reward.js／index.html）。未コミット。
  - 共鳴パネル上のキャラクターを強化接続ノードとして扱い、強化ラインがそこで途切れず相互矢印で先へ伸びるよう変更。
  - 共鳴キャラクターは隣接先にキーワードと固有効果名を渡し、開戦・攻撃・負傷・死亡・解放の主要な名前判定効果が受け手側で発動できるようにした（カード名は表示キーワードには入れない）。
  - 鍛冶屋中は手持ちカードを報酬カード欄へ戻せないよう、受け入れ判定・ドロップ処理・ドラッグ中の報酬欄z-index引き上げ・明るい表示を抑制。`battle.js`/`render.js`/`reward.js`の読み込み版数を`resonance1`へ更新。
  - 追加修正：共鳴パネル出撃時の表示用装備生成が、生カードと`{panel,idx}`形式の混在で`clone(undefined)`になり戦闘開始時に落ちる可能性を修正。`battle.js`の読み込み版数を`resonance2`へ更新。
  - `node --check js/engine/battle.js`, `js/engine/reward.js`, `js/engine/render.js`通過。実機操作確認は未実施。
- 【今回追加】勝利待機中の封印アイコン点灯と宝箱取得後アイコン化けを修正（render.js／map.js／index.html）。未コミット。
  - 勝利確定後の`G.phase='reward'`中でも`G._battleVictoryPending`なら封印アイコン表示を戦闘中扱いにし、戦闘終了演出中に全点灯しないよう変更。
  - 宝箱ノードは踏んだ時点で`cleared=true`かつ`type='empty'`へ変換し、報酬取得後に宝箱/開始地点風のアイコンとして残りにくくした。
  - `render.js`/`map.js`の読み込み版数を`sealmapfix1`へ更新。`node --check js/engine/render.js`, `js/engine/map.js`通過。
- 【今回追加】プレイヤーとエリートのすれ違い対策（map.js／index.html）。未コミット。
  - プレイヤー移動先の戦闘/イベント/宝箱/村判定を、エリート移動より先に処理するよう順序を変更。
  - 2マス以上の自動移動では各歩ごとにエリートを動かさず、移動処理が完了してマップ上に残っている場合だけ最後にエリート出現/移動を1回行う。
  - `map.js`の読み込み版数を`eliteitems2`へ更新。`node --check js/engine/map.js`通過。
- 【今回追加】エリート出現/移動AI・敵マス強さ表示・アイテム即時効果化を実装（map.js／reward.js／battle.js／pool.js／index.html）。未コミット。
  - マップ初期配置からエリートを外し、3ターンごとに未知の通常/空白/イベント系マスへ出現。既存エリートは2ターンごとに移動し、2マス以内のプレイヤー/村/宝箱へ優先移動（同距離はプレイヤー優先）。隣接停止は廃止し、プレイヤーマスへ入れば戦闘になる。
  - エリートが村/宝箱へ到達するたび`_elitePowerMult`を1.2倍し、エリート戦倍率へ反映。エリート撃破時は通常報酬後に宝箱と同じランダムアイテム報酬へ遷移する。
  - 敵マスhoverに暫定の星評価（ラスボス10星基準）を`data-preview`で表示。隕石の巻物は選択敵マスの最終戦力倍率を0.5倍、非敵マスは空白化。ポータル/幻視ワープもマップ上で即時解決。
  - 静寂の巻物だけ次戦闘予約に残し、他アイテムは使用時即時効果へ変更。絆の巻物は同名未合体2枚を合体（4方向/ステ加算/レアリティ+1/効果追加発動+1）、盾/巨大化/鼓舞/生贄人形/衰弱は魔導板上の対象選択で解決。`pool.js`のアイテム説明・幻視リネーム・ポータル追加も更新。
  - `pool.js`/`battle.js`/`reward.js`/`map.js`の読み込み版数を`eliteitems1`へ更新。`node --check js/engine/map.js`, `reward.js`, `battle.js`, `pool.js`通過。
- 【今回追加】起源の種の未適用ルート・勝利時の味方消失・ハイドラ/レムレース報酬を修正（battle.js／map.js／index.html）。未コミット。
  - `起源の種`をツインデビル等の`summonCount>1`出撃コピー数にも加算し、死亡効果リピートにも加算。既存の開戦/攻撃/負傷/解放リピートとあわせて主要トリガーを確認。
  - 戦闘終了ボーナス処理から`_panelSummoned`掃除を分離し、勝利表示中に味方がダメージ表示ごと消えないよう、報酬遷移/クリア遷移直前に掃除する方式へ変更。
  - ハイドラは生存候補全員ではなく、ハイドラ1体につきランダム1体だけを報酬化。レムレース含む報酬化カードは戦闘中ステータス/一時キーワードではなく、`PANEL_POOL`の基礎カード（arrow/方向数・基礎ATK/HP・効果）を使うよう修正。
  - `battle.js`/`map.js`の読み込み版数を`originreward1`へ更新。`node --check js/engine/battle.js`, `js/engine/map.js`通過。
- 【今回追加】嵐の指輪の処理順・特殊マス出撃位置・勝利時演出中断・4面クリア遷移を修正（battle.js／map.js／index.html）。未コミット。
  - `嵐の指輪`のマナ到達効果をキュー化し、攻撃本体へ進む前に必ず待機するよう変更。攻撃時効果由来のマナ獲得でも先に嵐ダメージが解決される。
  - 鍛冶屋で特殊化した魔導板スロットは、魔導板上の列から戦闘中の配置スロット（`_battleSlot`）を決め、戦闘開始時の整列でもその位置を優先。
  - 敵全滅後は封印/生贄演出の開始を止め、処理中でも勝利確定済みなら途中で抜ける。4面ボス撃破時は報酬/編成へ行かず直接クリア画面へ遷移。
  - `battle.js`/`map.js`の読み込み版数を`battleflow1`へ更新。`node --check js/engine/battle.js`, `js/engine/map.js`通過。
- 【今回追加】村ショップ/鍛冶屋の在庫固定・元に戻す・鍛冶屋対象制限を修正（map.js／reward.js／index.html）。未コミット。
  - 村ノードごとに`shopStock`/`forgeOffers`を保存し、再入店しても購入済み・改良済みの内容が補充されないよう変更。
  - ショップ/鍛冶屋にも「元に戻す」ボタンを表示し、入店時スナップショット（所持金・魔導板・在庫/候補）へ復元して村ノード側にも反映。
  - 鍛冶屋改良は中段スロット（5〜9）を対象外にした。`reward.js`/`map.js`の読み込み版数を`villagefac1`へ更新。`node --check js/engine/reward.js`, `js/engine/map.js`通過。
- 【今回追加】編成画面右クリック非表示の表示範囲とツールチップ優先順位を修正（index.html／render.js）。未コミット。
  - 右クリック非表示モードでは魔導板カードの中身だけを消し、下のカード置き場は`card_back.png`/`card_back_o.png`で表示し続けるよう調整。`unite`接続画像は非表示化。
  - 通常表示中は特殊マス上のカードにホバーした場合、特殊マス説明ではなくカード説明を優先。非表示モードでは特殊マス説明を表示する。
  - `render.js`の読み込み版数を`peekfix1`へ更新。`node --check js/engine/render.js`通過。
- 【今回追加】マップ開始時のエリート初期配置距離を制限（map.js）。未コミット。
  - マップ生成時、エリートは初期マスからグラフ距離4未満のノードには割り当てないよう`_canAssignMapNodeType()`に制約を追加。
  - `node --check js/engine/map.js`通過。簡易生成シミュレーション500回でエリート距離違反0件、最小距離4を確認。
- 【今回追加】ショップ購入不能カードのsummon_frame消失とアイテム使用効果の発動保険を修正（index.html／reward.js／battle.js）。未コミット。
  - 前回追加した赤い購入不能枠は削除。`.rew-card.cant`が`background:var(--bg)`へ落として`--card-frame`（summon_frame等）を消していたため、この背景上書きを外した。
  - アイテム使用時に`pendingBattleItems`だけでなく`nextBattleItems`にも使用インスタンスID付きで保存し、戦闘開始時に両方から重複排除して`activeBattleItems`へ移すよう補強。
  - `battle.js`/`reward.js`の読み込み版数を`itemuse2`へ更新。`node --check js/engine/reward.js`, `js/engine/battle.js`通過。
- 【今回追加】ショップ購入・鍛冶屋改良後の所持金表示を即時同期（reward.js／map.js／index.html）。未コミット。
  - `refreshRewardGoldUi()`を追加し、`#rw-gold`・右上の`reward-prod-money-value`・HUDをまとめて更新するようにした。
  - カード/指輪/パネル/アイテム購入と鍛冶屋の魔導板改良の支払い直後に即時同期。アイテム購入経路で支払いが抜けていた可能性も修正。
  - `reward.js`/`map.js`の読み込み版数を`goldsync1`へ更新。`node --check js/engine/reward.js`, `js/engine/map.js`通過。
- 【今回追加】編成画面の右クリックを魔導板カード非表示トグルに変更（reward.js／render.js／index.html）。未コミット。
  - 報酬/編成フェイズ中は画面内のどこで右クリックしても`right-card-peek`をトグルし、魔導板上の全カード本体・イラスト・数値・矢印・廃棄ボタンを非表示にする（特殊マスのラベルは残す）。
  - 特殊マス説明ツールチップは非表示モードに関係なく常時ホバー表示。初期召喚マスにも「召喚の力」の説明を持たせ、価格行は表示しない。
  - 報酬/編成フェイズ外へ出たら非表示モードを解除。`node --check js/engine/reward.js`, `js/engine/render.js`通過。
- 【今回追加】制限ターン判定・インプ生贄誤設定・隣接エリート移動・死亡表示残像を修正（map.js／pool.js／loader.js／render.js）。未コミット。
  - 強制ボス判定を`turn+1>=limit`から`turn>=limit`に変更し、17/18のような制限ターン前の移動ではボス戦に入らないよう修正。
  - `panel_imp`の固定定義とシート同期後の上書き定義から`生贄`キーワードを削除。説明文からの自己キーワード抽出も`生贄`単独トークンだけに限定し、「生贄を持つキャラクター」等では生贄扱いしない。
  - エリートがプレイヤー現在地に隣接している場合は移動カウント/移動処理を行わないよう変更。
  - HP0ユニット描画時に`empty/dead-empty`化して内容を空にし、死亡直後のカード残像を抑制。`node --check js/engine/map.js`, `js/engine/pool.js`, `js/data/loader.js`, `js/engine/render.js`通過。
- 【今回追加】通常戦闘でボス/エリート風編成が出る誤判定を修正（enemy.js）。未コミット。
  - `generateEnemies()`がマップ戦でも`FLOOR_DATA[floor].boss`を見ていたため、通常マスが5層相当などに当たると通常戦闘でもボス編成/ボス表示になり得た。
  - マップ戦中は`G._mapBattle.type`だけでボス判定し、通常マスは階層データのbossフラグを無視するよう変更。`node --check js/engine/enemy.js`通過。
- 【今回追加】ゲーム開始時の初期所持金を100Gに変更（state.js）。未コミット。
  - `initState()`の`G.gold`初期値を0から100へ変更。デバッグモードは従来通り`startGame()`内で999Gへ上書きされる。`node --check js/engine/state.js`通過。
- 【今回追加】一度表示された未知マスへの道を記憶して消えないよう修正（map.js）。未コミット。
  - `G.worldMap.revealedEdges`を追加し、現在地周辺プレビューまたは両端表示で一度描画された道を保存するようにした。
  - 描画条件に保存済みedgeを追加し、現在地から離れても未知マスへ伸びる既知の道が消えないよう変更。`node --check js/engine/map.js`通過。
- 【今回追加】マップ道路の重なり防止として分岐角度30度制約を追加（map.js）。未コミット。
  - マップ生成時、同一ノードから伸びる既存道路との見た目上の角度差が30度未満になる候補辺を採用しないようにした。判定は最終表示座標（ランダム揺らぎ込み）で実施。
  - `_newMapNode()`を事前生成した表示座標キャッシュから作る形に変更し、道路角度判定と実際の描画座標がズレないようにした。
  - `node --check js/engine/map.js`通過。簡易生成シミュレーション200回で最小角30.02度、違反0件、マス数36〜40維持を確認。
- 【今回追加】マップ戦闘の敵数固定/制限ターン/エリート・ボス強度を再調整（battle.js／map.js／enemy.js）。未コミット。
  - 敵数1体/2体固定を「開始地点からの距離」ではなく、マップ内の戦闘順`battleNo`ベースに変更。通常戦闘の1戦目は1体、2戦目は2体。
  - 15ターン以降のエリート追加・0.1ターン補正仕様を廃止し、15ターン目に移動しようとした時点で強制ボス戦へ入る仕様に戻した。
  - エリート戦はマス距離を無視して4層相当、ボス戦は5層相当で生成。通常ボス補正は1.5倍、強制ボスはボス補正1.5倍×強制補正2倍（合計3倍）にターン補正を掛ける。
  - マップボス戦は`FLOOR_DATA[5].boss`に依存せず、必ずボス編成を生成するよう`generateEnemies()`側を補強。`node --check js/engine/map.js`, `js/engine/battle.js`, `js/engine/enemy.js`通過。
- 【今回追加】隣接マスの先の道が表示されないことがある問題を再修正（map.js）。未コミット。
  - 道のプレビュー表示条件を「見えている端点がアンカー」依存から、「現在地からグラフ距離1以内のノードに接続する道は未知側でも表示」へ変更。
  - エリート移動/15ターン以降のエリート追加後にも`_revealAroundCurrentMapNode()`を呼び、移動後のマス種別変化で視界情報が古いまま残るのを防止。`node --check js/engine/map.js`通過。
- 【今回追加】ファミリア/カオス・インプが生贄扱いになる誤判定を修正（battle.js）。未コミット。
  - `_unitPanelKeywords()`が説明文中の「生贄」を全文検索していたため、「場の生贄の数」「生贄を持つキャラクター」も自己キーワードとして拾っていた。
  - `生贄`単独トークン/単独行だけを自己キーワード扱いするよう正規表現を限定。`node --check js/engine/battle.js`通過。
- 【今回追加】マップ描画・エリート移動・ターン補正仕様を修正（map.js／enemy.js／index.html）。未コミット。
  - マップ復帰直後にアイコン/道だけが先行表示される症状を軽減するため、復帰直後だけマップノード/道レイヤーを短時間非表示にする`world-map-render-pending`を追加。マップ画面中の右上マナHUDもCSSで非表示。
  - 現在地の隣接アイコンと、その先へ伸びる道の表示条件を拡張。ボス済み/表示済み判定でボスマスが空画像に落ちないよう描画条件を補強。初期生成時の端マスは`empty`にしない。
  - 2マス以上先への移動は非同期で1歩ずつ描画しながら進む。途中の村は自動移動中には入らず通過し、戦闘/宝箱/イベント等では停止。
  - 強制ボス戦を廃止。15ターン以降はターン補正を`1+ターン数×0.1`にし、毎ターン空マスへエリートを1体追加。エリートはプレイヤー移動後、2ターンに1回隣接マスへ移動し、元マスは空マス化・移動先はエリート化。エリート戦にもターン補正を適用。`node --check js/engine/map.js`, `js/engine/enemy.js`, `js/engine/battle.js`, `js/engine/main.js`, `js/engine/reward.js`通過。
- 【今回追加】起源の種・マップ移動/視界・マップ編成戻すボタン・初期ATK0抽選を修正（battle.js／map.js／reward.js／main.js）。未コミット。
  - `起源の種`を開戦効果リピートにも加算し、ミテーラ等の「本来持つ開戦効果」が追加発動するよう修正。
  - マップは現在地から1歩先のアイコンに加え、その先へ伸びる道をプレビュー表示。表示済みの2歩以上先ノードをクリックした場合は最短経路で1歩ずつ自動移動し、途中で戦闘/村/宝箱/イベントに入ったら停止する。
  - 制限ターン到達時のボス戦はマップ復帰時ではなく移動開始時に発火。マップから開いた編成画面では`元に戻す`を出さず、アイテム再取得を防止。
  - 初期配布キャラクター候補からATK0のキャラクターを除外。`node --check js/engine/battle.js`, `js/engine/main.js`, `js/engine/map.js`, `js/engine/reward.js`通過。
- 【今回追加】新規マップ開始時のズームを最大倍率に変更（map.js／index.html）。未コミット。
  - `generateWorldMap()`の初期`zoom`を`1.8`へ変更し、ゲーム開始/次マップ生成時から最大倍率で表示。`map.js`読み込み版数を`mapzoom1`へ更新。`node --check js/engine/map.js`通過。
- 【今回追加】マップ特殊マスの隣接/同種距離制約を追加（map.js／index.html）。未コミット。
  - マップ生成時、通常戦闘以外（empty/elite/boss/village/event/treasure）は既存の非通常戦闘マスと8近傍で隣接しないよう配置判定を追加。
  - 村・エリート・宝箱は同種同士のマンハッタン距離が3未満にならないよう制約。条件を満たせない候補は通常戦闘へフォールバックする。
  - `map.js`の読み込み版数を`mapspacing1`へ更新。`node --check js/engine/map.js`通過。
- 【今回追加】アイテム取得/使用フローを魔導板から分離（reward.js／battle.js／index.html）。未コミット。
  - 財宝/報酬アイテムのドラッグゾーンを`dragzone-reward-item`へ分離し、魔導板へのドロップ取得を禁止。左のアイテム枠だけが受け取り先になり、アイテム枠内は`dragzone-itemslot`で並べ替え可能。
  - アイテムドラッグ中は財宝欄（battle-order-section）と左アイテム欄だけを明るくし、魔導板・指輪・クエスト等は暗くするCSSを追加。
  - 左アイテム枠を左クリックすると「使う / キャンセル」の小ウィンドウを出し、「使う」でアイテムを消費して`G.pendingBattleItems`へ予約。次の`startBattle()`で`G.activeBattleItems`へ移し、その戦闘1回だけ効果参照。
  - 編成画面中の右クリック透過対象を魔導板以外の報酬カード/デバッグカード/左アイテム・指輪枠にも拡張。`node --check js/engine/reward.js`, `js/engine/battle.js`通過。
- 【今回追加】右クリック特殊マス説明・村戻りボタン・アイテム枠取得・強制ボス階層を修正（index.html／reward.js／render.js／map.js）。未コミット。
  - 右クリック押下中は魔導板上のカード表示を一時的に消し、特殊マスに`data-panel-power-preview`を持たせて説明表示できるよう変更（後続修正で通常表示中はカード説明優先に変更済み）。
  - 村の第三ボタン（旧試験戦闘位置）はCSSの`display:none!important`に負けていたため、JS側も`display:block!important`で表示。ショップ/鍛冶屋/酒場では「村へ戻る」として機能。
  - 左の「アイテム」4枠を`G.spellSlots`と同期し、財宝アイテムを指輪と同様にドラッグ取得・枠内移動できるよう実装。財宝提示は`ring-visual`流用をやめ`item-visual`に変更。
  - 15ターン目の強制ボス戦は現在マス距離ではなくマップ番号ごとのボス階層（5/10/15/20層）を参照するよう修正。`node --check js/engine/reward.js`, `js/engine/render.js`, `js/engine/map.js`通過。
- 【今回追加】下部ボタン位置と村第三選択肢/試験戦闘ボタン位置を修正（index.html／reward.js／map.js）。未コミット。
  - 前回3ボタン対応で変更した`#reward-move-btns`の位置/幅を元の右下2ボタン位置（left 2740px / width 1020px / gap 42px）へ戻し、編成完了・元に戻すの位置を固定。
  - `btn-test-battle`をデバッグカードパレット上（left 2778px / top 536px / width 900px）へ移動。旧試験戦闘ボタン位置には新設`#map-village-extra-btn`を表示し、村メニューでは「情報」、ショップ/鍛冶屋/酒場では「村へ戻る」として使う。
  - 村メニュー中央のカードはショップ/鍛冶屋の2枚にし、第三選択肢の情報は専用ボタンへ移動。マップ復帰時に村用追加ボタンを明示的に非表示。`node --check js/engine/reward.js`, `js/engine/map.js`通過。
- 【今回追加】宝箱アイテム取得画面の表示/復帰を修正（reward.js／map.js／index.html）。未コミット。
  - 宝箱提示カードから`treasure`クラス由来の青枠アニメーションを外し、CSS側でも`.treasure-offer-card`は枠/影/アニメなしに固定。指輪風の正方形枠＋アイテム画像表示だけを残した。
  - 宝箱アイテムをクリック取得・スペル/アイテム欄へドラッグ取得した後、`renderMoveSlotsInEnemy()`とHUD更新を呼び、下部の「編成完了」ボタン（クリックでマップ復帰）が表示されるよう修正。宝箱画面開始時にも`renderHandEditor()`を明示呼び出し。
  - script版数を`treasurefix1`へ更新。`node --check js/engine/reward.js`, `js/engine/map.js`通過。ブラウザ統合確認は未実施。
- 【今回追加】マップ画面のオプションボタンサイズを編成画面と統一（index.html）。未コミット。
  - `#battle-options-btn`の編成画面専用CSS（位置・104×88.5表示枠・option.png/option_back.png疑似要素）を`body.world-map-active`にも適用し、マップ画面だけ旧円形112pxボタンに戻る差異を解消。HTML/CSSのみの変更でJS構文チェックは未実施。
- 【今回追加】マップ報酬ボタン・視界・ズーム・序盤敵数を再修正（map.js／battle.js／reward.js／index.html）。未コミット。
  - ワールドマップ中の通常報酬でも「元に戻す」を表示するよう、マップ報酬分岐のreset表示条件を拡張。3ボタン表示時に右端から消えないよう`#reward-move-btns`の幅と位置も調整。
  - マップ背景を再びズーム対象の`.map-grid`側へ戻し、`effect.png`は`.map-grid::before`で背景直上・道/アイコン下に配置。道は%座標距離ではなくグリッド実ピクセル換算で長さ/角度を計算し、16:9領域でもアイコン中心へ接続するよう修正。
  - マップ表示は「1歩先のアイコン＋その先へ伸びる道」まで表示するよう、現在地隣接ノードから未知ノードへ伸びる辺もプレビュー描画。未知ノード自体は引き続き非表示。
  - 制限ターンを15へ変更し、HUDは`現在ターン/15`表示。マップ右上の既存階層/所持金HUDは非表示。1戦目は敵1体、2戦目は敵2体のルールをマップ戦闘でも優先し、最低4体補正を序盤だけ無効化。
  - `node --check js/engine/map.js`, `js/engine/battle.js`, `js/engine/reward.js`通過。ブラウザ統合確認は未実施。
- 【今回追加】マップ/鍛冶屋/封印∞/ショップ表示の追加修正（map.js／battle.js／render.js／reward.js／pool.js／index.html）。未コミット。
  - マップ生成を上下左右のみから斜め隣接も含む生成木へ変更し、生成済みの道を移動可能リンクとして参照。ノード座標は背景サイズを維持したまま中心寄せで距離を約半分にし、揺らぎを増やして格子感を軽減。通常戦闘比率は3へ下げ、空マスを追加。一度クリアした通常/エリート戦闘マスは空マス化し、再訪時に敵を出さない。
  - マップ背景は`#world-map-panel`全面に固定し、`effect.png`は背景の直上・道/アイコンの下へ移動。拡大時は道とアイコンだけでなく地図レイヤー全体の見え方がパネル内でクリップされる。
  - 鍛冶屋の改良パネルを非出撃枠にも反映し、見た目上の出撃枠化・暗転解除・開戦時召喚対象化を接続。ショップではゴールド不足カードに暗幕を載せ、ゴールド不足表示を最前面化。所持カードの売却額を×ボタン下に表示。
  - アビス・バロンの解放効果を`封印∞`へ変更。対象はbloodアイコン1つ＋∞表示になり、解除チェックを走らせず、封印中の敵は勝利判定の生存敵から除外。攻撃モーション終了後に元スロットを再描画して、逆上などの途中再描画後に一瞬消える症状を抑止。
  - `node --check js/engine/map.js`, `js/engine/battle.js`, `js/engine/render.js`, `js/engine/reward.js`通過。ブラウザ統合確認は未実施。
- 【今回追加】マップ全画面化・宝箱・アイテム12種を実装（index.html／map.js／reward.js／pool.js／battle.js）。未コミット。
  - `#world-map-panel`を4K基準の全面表示にし、地図画像を`.map-grid`側へ移してホイール拡大時にノード/道ごと拡大、外側はクリップ。`assets/temp/art/backgrounds/effect.png`を上から重ねる。未知ノードに接続する道は描画しないよう変更。
  - マップ生成に`treasure`マスを追加（通常6:エリート1:村1:イベント1:宝箱1目安）。宝箱に入ると報酬枠が「財宝」になり、`ring_slot.png`風の正方形枠でランダムアイテム1枚を提示。クリック/ドラッグでアイテム欄へ取得し、「マップへ戻る」で復帰。
  - `ITEM_POOL`に静寂/絆/盾/冥府/巨大化/隕石/生贄人形/衰弱/幻影/黄金/魔力/鼓舞を追加し、I001〜I012画像を対応。開戦時効果を`battle.js`に実装、青ワイルドハント召喚専用トークンも追加。
  - `node --check js/engine/map.js js/engine/reward.js js/engine/battle.js js/engine/pool.js`通過。Playwright/Chrome自動確認はこの環境で起動失敗、HTTPサーバー接続もサンドボックス都合で確認不可。アセット存在確認は通過。
- 【今回追加】現状を一旦コミット＆push後、7×7ワールドマップ試作と初回フィードバック修正を追加（map.js／main.js／move.js／battle.js／enemy.js／reward.js／assets.js／index.html）。
  - コミット`be7be76`（`Fix card effects and asset paths`）を`origin/main`へpush済み。その後のマップ実装は未コミット。
  - `assets/temp/art/backgrounds/world_map.png`を生成し、`Assets.map`の参照を移動後の`assets/temp/map`へ修正。ゲーム開始時は中央開始のランダム7×7マップ（36〜40マス、ボス距離4以上）へ入る。
  - マップは移動・視界保持・ホイール拡縮（最小=全景、地図画像ごと拡大しパネルでクリップ）・20ターン強制ボス・4マップ進行・通常/エリート/ボス戦闘接続を実装。道は生成木の辺のみ描画して交差を抑止。
  - 村はショップ/鍛冶屋/情報を全て選択式に変更。施設内から「村へ戻る」、ショップ/鍛冶屋に「元に戻す」を追加し、村を出た後も現在地の村を再クリックして再入場可能。鍛冶屋は選択した改良を任意パネルへ適用し、所持金表示も即時更新することを実機確認済み。マップ用インベントリUIは廃止。
  - マップBGMを編成画面BGMへ変更し、マップ中の背景はマップ番号固定（1=grassland/2=forest/3=valley/4=capital）。ボス撃破時は残りターン数^2×20Gを付与し、通常報酬/指輪報酬完了後に次マップへ進むよう修正。エリートのボス表示とカーバンクル攻撃時の誤ダメージも修正。
  - 戦闘中/封印解放中/勝利オーバーレイ中に報酬・魔導板操作状態が混ざるのを抑止。戦闘中の味方カードドラッグを報酬フェイズのみに限定し、封印付与からの再解放処理をawait。`node --check`はmap/battle/enemy/reward/render/main/move/assets通過、ブラウザでマップ/村/ショップ/鍛冶屋/編成完了を確認済み。
- 【今回追加】野生の力だけ恩寵の開戦+1を受けない件を修正（battle.js／index.html）。
  - `野生の力`はキャラ本体開戦効果ループではなく`_afterPanelSummon()`内で直接マナ獲得していたため、恩寵のrepeat対象外になっていた。`wild * 2`に`_openingEffectRepeatCount(unit)`を掛けるよう変更し、野生の力1枚＋恩寵1枚なら開戦時4マナになる。
  - `野生の力`枚数は`_unitEffectPanelCount()`と`_unitKeywordCount()`の最大値で見るようにし、物理接続・付与済みキーワードのどちらでも拾うが二重計上しない。script版数は`gracewild1`。`node --check js/engine/battle.js`通過。未コミット。
- 【今回追加】恩寵の開戦+1が発動しない件、ジャッカロープ説明文、実装falseカードの報酬混入を修正（battle.js／pool.js／loader.js／index.html）。
  - `_unitEffectPanelCount()`を、戦闘中ユニットに`_mainBoardSlot`がある場合は共有魔導板の実配置スロットから接続強化パネルを数えるよう変更。これにより恩寵/起源の種/野生の力などの物理接続カウントが、表示用equipmentに依存せず効く。
  - ジャッカロープの説明文をコード側で固定上書きしていた行を削除し、Googleスプレッドシート/ローカルxlsx由来の文面を優先する形に戻した。
  - シート`実装=false`行は同期が必要でも`_rewardExcluded`を付け、通常報酬抽選・在庫生成・最低保証枠から除外するよう変更。カード効果や特殊報酬用のデータとしては残せる。script版数は`gracecount1`/`rewardfalse1`。`node --check js/engine/battle.js`, `js/engine/pool.js`, `js/data/loader.js`通過。未コミット。
- 【今回追加】左上スロット絡みで恩寵の開戦+1が発動しない／カード取得が詰まる件を修正（reward.js／battle.js／index.html）。
  - 共有魔導板オブジェクトに対し、カード移動後同期 `_syncUnitPanelEffectsAfterMove()` が固定でスロット0の隣接強化を適用していた旧仕様の名残を削除。これにより左上カードの強化補正が仮想ボード本体へ誤適用され、内部状態や取得判定を壊す経路を塞いだ。
  - `startPanelPlacement()`／`placePendingPanelToSelectedUnit()` の `unit.hp<=0` ガードを削除。現行の `_getPartyBoardUnit()` は共有ボード用の仮想ユニットで、HPは配置可否判定に使わない。
  - `refreshUnitPanelEffects()` は戦闘中ユニット自身の `_mainBoardSlot` を見て、共有魔導板から正しいスロットの隣接強化を集計するよう変更。script版数は`boardslotfix1`。`node --check js/engine/reward.js`, `js/engine/battle.js`通過。未コミット。
- 【今回追加】キーワード末尾に`</ strong>`等が表示される件と、竜の契約/恩寵/マナ生成が接続先キャラの表示キーワードになる件を再修正（render.js／index.html）。
  - `_formatPreviewHtml()`と`_boldKeywordsInHtml()`の入口に`_stripStrongMarkupText()`を追加し、通常の`<strong>`だけでなく空白入り・途中欠け・HTMLエンティティ化されたstrongタグ文字列も除去してから、キーワード太字化を再適用するよう変更。
  - `キーワード：`行は、太字化済みHTMLを`/`分割してさらに`<strong>`で包む処理をやめ、プレーン文字列を分割してから各キーワードを個別にエスケープ/太字化/アイコン化する方式へ変更。
  - 効果判定用に`unit.keywords`へ保持する自己参照名のうち、`竜の契約`/`恩寵`/`マナ生成`を`_INTERNAL_ONLY_ENCHANT_NAMES`へ追加。効果は従来通り判定できるが、UI上はキーワードとして表示しない。script版数は`keywordclean3`。`node --check js/engine/render.js`, `js/engine/reward.js`通過。未コミット。
- 【今回追加】キーワード太字化のタグ崩れと単純キーワード強化カードの表示消失を再修正（render.js／reward.js／index.html）。
  - 前回の太字化で既存`<strong>`タグが混ざる経路に対し、`_boldKeywordsInHtml()`と`_formatPreviewHtml()`の入口で空白入りも含む`strong`タグを除去してから再装飾するよう変更。`</ strong>`風の崩れが残りにくい形にした。
  - 前回の「自己参照カード名をプレビューから除外」が広すぎ、`三段攻撃`等のカード名そのものが有効キーワードである強化カードまで消していたため、自己名でも`_ENCHANT_KEYWORD_ONLY`や結界/封印/毒/毒牙/邪眼/衝撃/強靭系なら表示に残すよう修正。
  - `node --check js/engine/render.js`, `js/engine/reward.js` は通過。script版数は`keywordclean2`へ更新。ブラウザ統合確認は未実施。未コミット。
- 【今回追加】効果欄末尾カード名混入と`</strong>`表示崩れを修正（render.js／reward.js／index.html）。
  - 原因は2つ。①強化効果表示の一部で`computeDesc()`済みHTML（`<strong>攻撃</strong>`等）をプレーン説明文として再利用し、再エスケープ/再太字化でタグが本文に出ていた。②`adjacentKeywords`に内部処理用として入れている自己参照カード名（マナ生成/竜の契約/恩寵等）を、プレビューの「キーワード」行へそのまま出していた。
  - `render.js`に`_plainEffectTextForPreview()`を追加し、強化効果文・カードプレビュー本文は必ず`_rawSubstitutedDesc()`由来のプレーン本文＋カード名末尾除去で生成するよう変更。`_enchantEffectTextForPanel()`のfallbackから`computeDesc(p)`利用を撤去。
  - `render.js`/`reward.js`の強化カードプレビューで、`adjacentKeywords`から自己参照カード名を除外。報酬画面内フロー表示でも`computeDesc()`ではなくプレーン本文を`_unitCombinedDescHtml()`へ渡すよう修正。
  - `node --check js/engine/render.js`, `js/engine/reward.js` は通過。script版数は`effecttextclean1`へ更新。ブラウザ統合確認は未実施。未コミット。
- 【今回追加】本文中キーワードの太字化、結界誤抽出、本文末尾カード名除去を再修正（render.js／loader.js／battle.js／index.html）。
  - `render.js`に`_boldKeywordsInHtml`を追加し、カード本文・戦闘中本文・ホバー説明で、効果本文中のキーワード（結界/毒/毒牙/邪眼/衝撃/強靭/封印/弱体など数値付き/無し両対応、固定キーワードも含む）を太字化。エルフの`結界1`やカーバンクル本文中の`結界`も強調対象。
  - カーバンクルやリリスの本文中にある「結界を失う/付与する」を自身の`結界1`キーワードとして誤抽出しないよう、loader/battle両方の結界抽出を「行頭に単独で書かれた結界N」に限定。
  - 竜の契約/恩寵などの本文末尾カード名混入対策をさらに強化し、末尾の空白・句読点・コロン・ハイフン・括弧付きカード名も除去するよう変更。
  - `node --check js/engine/render.js`, `js/engine/battle.js`, `js/data/loader.js` は通過。script版数は`keywordbold1`へ更新。ブラウザ統合確認は未実施。未コミット。
- 【今回追加】未解決だった説明文/召喚バフ/試験戦闘敗北を修正（pool.js／loader.js／render.js／battle.js／index.html）。
  - ベヒーモスの本文から`封印3`を除去し、キーワード配列にだけ残す形へ修正。竜の契約は`no:'008'`へ戻してE008絵柄を参照するよう修正。loader/render両方の末尾カード名除去を強化し、竜の契約・恩寵などの本文末尾にカード名が混入しても同期後/表示時に落とす。
  - `マナ生成`を強化キーワードとして認識し、接続先キャラクターの効果表示を`攻撃：1マナを得る。`として生成する明示処理を追加。戦闘中の強化効果本文にも`（）`書き非表示を適用。
  - 戦闘中召喚されたユニットへ、赤/青/緑/黄/紫の瞳の指輪の常時+10/+10を単体適用する処理を追加（初期出撃には既存の開戦時全体処理があるため対象外）。ナイトキャット等の効果召喚にも黄の瞳の指輪などが乗る。
  - 試験戦闘中に味方が全滅した場合は`gameOver()`へ行かず、`_exitTestBattle()`で編成画面へ戻るよう変更。`node --check js/engine/battle.js`, `js/engine/render.js`, `js/engine/pool.js`, `js/data/loader.js` は通過。script版数は`fixtextbuff1`へ更新。ブラウザ統合確認は未実施。未コミット。
- 【今回追加】サイレン攻撃中のATK表示チラつき、スケルトン文言、召喚専用カードの同名強化説明を修正（battle.js／render.js／pool.js／loader.js／index.html）。
  - `applyDamageBatch`で負傷効果をawaitし終えた直後に`_refreshAllUnitStatsUi()`を呼び、攻撃モーション中に裏側の実スロット表示も最新値へ同期。`_playAttackMotionCore`のインパクト後更新も対象単体ではなく全ユニット同期に変更し、ギガンテス負傷でサイレンATKが上がった後の一瞬の巻き戻りを抑止。
  - スケルトンの旧死亡効果（青キャラ+2/+1）を効果判定・実行処理から削除し、説明文を「（他の効果で召喚される「青スケルトン」も同じ強化を得る）」へ変更。シャドウ／ウルフ／ペリカン／ドラゴン／ナイトキャットにも同種の括弧書き説明を追加。
  - 戦闘フィールド上の本文・ホバー説明では`（）`書きテキストを非表示にする`_stripBattleParentheticalText`を追加。カード/報酬側の説明表示は維持。召喚専用カードの強化継承は既存の味方側`_spawnAdhocAllyUnit`の同名魔導板参照で仕様通り（敵同名には反映なし）。
  - `node --check js/engine/battle.js`, `js/engine/render.js`, `js/engine/pool.js`, `js/data/loader.js` は通過。script版数は`summoninherit1`へ更新。ブラウザ統合確認は未実施。未コミット。
- 【今回追加】メデューサの効果ダメージで死んだ敵を後続キャラが攻撃する件を修正（battle.js `_fireAllyInjuryEffects`内のメデューサ分岐、Gemini指摘・採用）。演出をずらす目的の`setTimeout(...,200)`により、ダメージ処理が呼び出し元（`applyDamageBatch`→`_fireAllyInjuryEffects`）のawait列から外れ、戦闘進行が先に進んでから敵が死亡していた。`setTimeout`＋`dealDmgToEnemy`をやめ、`await applyDamageBatch([{unit:target,side:'enemy',amount:actualDmg,source:unit}],{source:unit,effect:true})`に置き換え（隣の逆上／ミノタウロス分岐と同じ形）。対象選択も`e&&e.hp>0`から`_canReceiveBattleEffect`に統一（封印中等を除外）。負傷効果自体が通常攻撃のVFX完了後に直列awaitで走るため、元の「演出が重なる」問題は再発しない。実機確認：headless Chrome＋CDPでHP2の敵にメデューサの負傷効果5ダメージを発火させ、`await _fireAllyInjuryEffects()`が返った時点で既に敵HP=0になっていることを確認（旧実装ではこの時点でHP2のまま）。node --check通過。未コミット。
  - ノームの`goldOnBattleEnd`定義漏れ（Gemini指摘）は**誤検出のため対応不要**。`loader.js`の`_setPanelKeywordsFromDesc`が`終戦：\s*(\d+)\s*ゴールドを?得る`でdescから毎回導出しており（pool.js側にハードコードがあっても`delete`されてから再導出される）、`_requestedEffectOverrides`の`'ノーム': {desc:'終戦：5ゴールドを得る。'}`適用後にも再実行される。実機確認：`PANEL_POOL`のノームは`goldOnBattleEnd:5`、実際に出撃させて`onBattleEnd()`を呼ぶとG.goldが0→5になることを確認済み。
- 【前回】同名だったC047/C048を分離・改名（pool.js／loader.js／battle.js／render.js／index.html）。C005ドワーフは「2マナ毎：ランダムな赤+3/+2」のみ、C006ラミアは攻撃時+2/+1のみ、C047はユミル（攻撃：マナ分+X/+X）、C048はマーメイド（緑キャラ由来マナ+1）に分離した。
- シート側が旧名のままでもNo.がC047/C048ならユミル/マーメイドとして同期する例外を追加。戦闘処理も攻撃時+X/+Xはユミル、緑マナ増加はマーメイド参照に変更。
- ベヒーモス/エルフのdescをキーワード行と本文行に改行分離。さらにloader/render両方で「説明文末尾に自分のカード名が混入した場合は除去」する保険を追加し、竜の契約/恩寵などの末尾カード名混入を防止。
- `node --check js/engine/pool.js`, `js/data/loader.js`, `js/engine/battle.js`, `js/engine/render.js` は通過。script版数は`renamefix1`へ更新。ブラウザ統合確認は未実施。未コミット。

- 【今回追加】強化カード「恩寵」を実装（pool.js／loader.js／battle.js／index.html）。`常時：このキャラクターの開戦効果は1回追加で発動する。`として報酬プールに追加し、シート同期後も`adjacentKeywords:['恩寵']`を保持する。
- 開戦処理に`_openingEffectRepeatCount`を追加し、ガーゴイル/ウェンディゴ/リリス/ミテーラ/ジャッカロープ/エレメンタル/錬成の開戦効果を`1+恩寵数`回発動。タイタンの弱体付与も同じ回数に対応。
- ゾンビ/ツインデビル等の「開戦：コピーを1体召喚する。」は、恩寵1枚につきコピー召喚数が1体増えるよう初期出撃時の`spec.count`へ加算。
- `node --check js/engine/battle.js`, `js/engine/pool.js`, `js/data/loader.js` は通過。script版数は`grace1`へ更新。ブラウザ統合確認は未実施。未コミット。

- 【今回追加】戦闘中召喚専用カードと剣技を実装（pool.js／loader.js／index.html）。`シャドウ`を追加し、`ウルフ`/`ペリカン`/`ドラゴン`/`ナイトキャット`を召喚専用カードとして明示、通常報酬には出ないよう`rarity:-1`を維持する。
- 召喚専用5体はシートの実装フラグがfalseでも、ステータス・カラー・種族・No.（対応イラスト）だけ同期する例外を追加。効果は指定通り、シャドウ/ウルフ/ペリカンは効果なし、ドラゴンは全体攻撃、ナイトキャットは結界1に固定。
- `剣技`は強化カードとして`攻撃：ATK+3を得る。`を有効化。戦闘効果自体は既存の`剣技`キーワード処理で発動する。
- `node --check js/engine/pool.js`, `js/data/loader.js` は通過。script版数は`loader.js`/`pool.js`を`summontokens1`へ更新。ブラウザ統合確認は未実施。未コミット。

- 【今回追加】大量のキャラクター効果変更を実装（battle.js／pool.js／loader.js／index.html）。ノーム終戦ゴールド、各種負傷・攻撃・死亡・開戦・マナ毎効果、封印/生贄/隠密/即死/結界/生命吸収などを新仕様へ更新し、未実装扱いのシート行も指定キャラだけローカル上書きで有効化するようにした。
- 召喚系トークン（緑ウルフ／緑ドラゴン／緑ペリカン／黄ナイトキャット等）と不足していたフォールバックカードを追加。レムレース/ハイドラの追加報酬は`G._bonusRewardPanels`として次回報酬先頭へ差し込む。
- マナ閾値効果の処理をasync化し、召喚・自傷・封印解放を順番に待てるよう調整。`index.html`のscript版数は`charfx1`へ更新済み。
- `node --check js/engine/battle.js`, `js/engine/pool.js`, `js/data/loader.js` は通過。ブラウザ上の統合確認は未実施。未コミット。

- 【今回追加】報酬カードが特定配置で取得できない件と、報酬画面ドラッグ中の魔導板暗転を再修正（index.html／reward.js）。
  - 【追加修正12】HP0キャラクターの接続表示をunite画像に戻した（reward.js）。追加修正11はarrowを残す方向で対処したが、正しい仕様は「HP0でも通常どおりunite画像でつながる」。`_renderPanelUniteMarkers`からHP0キャラの除外（描画元・接続先の両方の`isDeadPanelCharacter`早期return）を削除し、追加修正11で入れた`_connectivityForDisplay`と`_isDeadPanelCharacterForBoard`を撤去して`_panelDirectionConnectivity`を直接使う形に戻した。実機確認：headless Chrome＋CDPでHP0キャラ（`charIsInvalid:true`）に強化2枚を隣接させ、unite_b（右）／unite_a（下）が描画され、接続方向のarrowが消えて未接続方向のみ残ることを確認。`_flashConnectedBoardCards`の発光もHP0カードを含めて発火することを確認（`.panel-unite-link`はpointer-events:none、廃棄ボタンはz-index:220のまま操作性を維持）。node --check通過。未コミット。
  - 【追加修正11】※追加修正12で置き換え済み。HP0キャラクターに強化カードをつなぐとarrow画像が消える件を修正（reward.js）。原因は`panelDirectionMarksHtml`が接続済み方向のarrowを消す一方、`_renderPanelUniteMarkers`はHP0キャラを含む接続のunite画像を描画しないため、arrowもuniteも無くなっていたこと。表示用の`_connectivityForDisplay`を追加し、HP0キャラ自身またはHP0キャラを接続先に持つ方向だけ`connected`→`open`扱いにしてarrowを残す。
  - 【追加修正10】ドラッグ開始瞬間にカードが画面左上へ一瞬表示される件を修正（index.html／reward.js）。原因は前回の`.drag-ghost{visibility:visible!important}`で、JSが座標を入れる前の初期位置（left:0/top:0）が見えていたため。CSSの強制visibilityを削除し、`_moveDragGhost()`側で座標反映後に`visibility:visible!important`を設定する流れへ戻した。node --check通過。未コミット。
  - 【追加修正9】ドラッグ時に元位置へカード中身（イラスト/ATK/HP/arrow/×）だけ残る件をCSS優先度合戦から切り離して修正（reward.js／index.html）。魔導板カードのdragstartでドラッグゴースト生成後、元カードの直下子要素へインライン`opacity:0!important`を付ける`_hideDragSourceParts`を追加し、dragendで復元。CSSにも`.drag-source-parts-hidden`の子要素/疑似要素非表示を追加。枠は残し、中身だけ消す。node --check通過。未コミット。
  - 【追加修正8】カードが動かなくなった件を修正（index.html）。HTML5 Drag & Dropが`visibility:hidden`で中断される可能性を踏まえ、ドラッグ元非表示は`opacity:0!important; visibility:visible!important`へ変更。古い強いルール`#hand-slots.unit-equip-slots > .card.dragging:not(.reward-unit-anchor){opacity:1}`にも勝つ上書きを追加し、ドラッグゴーストは`opacity:1; visibility:visible`で明示。node --check通過。未コミット。
  - 【追加修正7】ドラッグ元カード残存／カードが動かせない件の原因になっていた高詳細度CSSを整理（index.html）。`reward-screen-active:is(... ) #hand-pane *` と `#hand-slots.unit-equip-slots *` の強制`opacity:1`が末尾の`.card.dragging *{visibility:hidden}`より詳細度で勝っていたため、該当ブロックから全子要素`*`指定を削除。末尾はGemini案ベースの「魔導板親・背景枠・タイトル・空枠/出撃枠のみ明るく保持、`.card.dragging`と内部要素は非表示」に整理し、高詳細度の`.card.dragging *`非表示も追加。node --check通過。未コミット。
  - 【追加修正6】Gemini検証を反映し、ドラッグ元カード残存対策をさらに強化（index.html）。CSS最下部に`.card.dragging`/`.card.dragging *`/`.slot.dragging`/`.slot.dragging *`へ`opacity:0!important; visibility:hidden!important`を追加。子要素へ別の強制表示ルールが当たっても、イラスト/ATK/HP/arrow/×ボタンが元位置に残らないようにした。未コミット。
  - 【追加修正5】魔導板暗転防止CSSの副作用（ドラッグ元カードのイラスト/ATK/HP/arrow/×が残る）をGemini検証に従って再修正（index.html）。最下部の重複CSSを整理し、明るくする対象を`.card:not(.dragging)`/`.card-empty:not(.dragging)`/`.deploy-slot:not(.dragging)`/`.equip-empty:not(.dragging)`に限定。`.card.dragging`/`.slot.dragging`は`opacity:0!important`で元位置に残らないようにした。node --check通過。未コミット。
  - 【追加修正4】魔導板暗転修正後の副作用として、ドラッグ元カードのイラスト/ATK/HP/arrow/廃棄ボタンが元位置に残る件を修正（index.html）。最下部CSSの強制`opacity:1`で`.card.dragging`まで復活していたため、最後に`#hand-pane .card.dragging{opacity:.01}`と子要素/疑似要素`opacity:0`を追加。ドラッグゴーストは`#hand-pane`外なので影響なし。未コミット。
  - 【追加修正3】Gemini検証2を反映し、`_DRAG_ZONE_RAISE_TARGETS`の重なり順を修正（reward.js）。ドラッグ中は`#hand-pane-board-bg`を9002、カード・文字を含む`#hand-pane`を9004にして、背景枠が本体を覆う逆転を解消。CSS最下部にも`position`明示込みで同じ順序（main-hand-area 9001 / board-bg 9002 / hand-pane 9004）を強制指定し、`.spell-label`、カード、空枠、deploy/equip枠、疑似要素、imgのopacity/filterを解除。node --check通過。未コミット。
  - 【追加修正2】Gemini検証を反映し、CSS最下部に`body[class*="dragzone-"]`汎用の強制解除を追加（index.html）。`#main-hand-area`/`#hand-pane`/`#hand-pane-board-bg`、魔導板内`.card`/`.card-empty`/`.deploy-slot`/`.equip-empty`、およびそれらの`::before`/`::after`へ直接`opacity:1!important; filter:none!important`を指定。z-index引き上げだけでは直接暗転された要素を明るくできない問題への対処。`_DRAG_ZONE_RAISE_TARGETS`は既に`#main-hand-area`入りで確認済み。node --check通過。未コミット。
  - 【追加修正】まだ残っていた魔導板暗転を再修正（index.html）。原因は報酬画面でも`dragzone-battleorder`/`dragzone-spellslot`時に古いCSS（`#hand-slots.unit-equip-slots{filter:brightness(.4)}`）が残っていたため。報酬画面中のカードドラッグ系5クラス（mainequip/reward-spell/reward-nonspell/battleorder/spellslot）すべてで、`#main-hand-area`/`#hand-pane`/`#hand-pane-board-bg`/`#hand-slots`配下をfilter/opacity解除し、`#mainequip-drag-overlay`も非表示にする最終上書きを追加。指輪ドラッグは対象外にして既存挙動を維持。node --check通過。未コミット。
  - 報酬カードを既存魔導板スロットへドラッグした時、押し出された既存カードを「元の報酬スロット」へ明示的に戻すよう変更。提示カードが5枚満杯でも入れ替えが成立する。あわせて旧「左上固定パネル」時代の`fixedEquip`/`starterPanel`印は配置カード生成時に削除し、`_clearStarterPanelMarker`のidx=0限定も撤廃。
  - 報酬画面の魔導板カード／報酬カードドラッグ中は`#mainequip-drag-overlay`を使わず、暗くしたい領域のみ個別filterに変更。`#hand-pane`、魔導板内カード、`card_back.png`/`card_back_o.png`、魔導板見出しはfilter/opacityを強制解除。`reward.js?v=swapfix1`へ更新済み。
  - `node --check js/engine/reward.js`通過。実機で同一配置の再現確認は未実施。未コミット。
- 【今回追加】封印表示・特殊演出サイズ・ファナティック画像を修正（assets.js／index.html／battle.js／render.js）。
  - 【追加修正】魔導板ドラッグ中の暗転が残っていた件を再修正（index.html／reward.js）。原因は`#hand-pane`自体を上げても、親の`.hand-area`が`#mainequip-drag-overlay`より下のスタッキングコンテキストに残っており、子要素だけでは暗転から抜けられなかったため。魔導板を包む手札エリアに`id="main-hand-area"`を追加し、dragzone中のインラインz-index引き上げ対象へ`#main-hand-area`を追加（9001、`#hand-pane` 9003、board-bg 9004）。CSSでもdragzone中だけ`#main-hand-area{position:absolute;inset:0;z-index:9001}`で親ごと上げ、`#hand-pane`配下はfilter/opacity解除、デバッグパレット/スペル枠は個別に暗転維持。`reward.js?v=handarea1`へ更新済み。node --check通過。未コミット。
  - 【追加修正】未解決だったunite画像の回り込み／魔導板ドラッグ暗転／素材配置変更を対応（assets.js／index.html／reward.js／render.js）。CSS末尾のGPU固定ルールがカード/空き枠にスタッキングコンテキストを作っていたため、末尾に最終上書きを追加し、`.panel-unite-link`をz-index 9999（pointer-events:none）、`.discard-btn`を10000へ。dragzone中は`#hand-pane` 9001、`#hand-pane-board-bg` 9002、魔導板内要素はfilter/opacity解除で固定。封印カード本体フェードはS002合計3.5秒から0.25秒減らし3.25秒（`fadeMs = forward+reverse-250`）。素材参照は旧`assets/temp/cards/art`・`assets/temp/ring`・`assets/temp/backgrounds`から新`assets/temp/art`配下（`art/ring`、`art/backgrounds`含む）へ更新。`assets.js?v=artpath1`、`render.js?v=sealfade4`、`reward.js?v=artpath1`へ更新済み。旧パス参照0件、node --check通過。未コミット。
  - S002の再生/逆再生と封印カード本体フェードの体感ズレ調整として、S002を順再生1.75秒＋逆再生1.75秒へ変更（render.js `_SEAL_RELEASE_VFX_TIMING`）。カード本体のフェードは同タイミング合計値から自動算出されるため3.5秒に同期。`render.js?v=sealfade3`へ更新済み。node --check通過。未コミット。
  - unite画像とドラッグ暗転の見た目を追加修正（index.html）。前回HP0対策で`.panel-unite-link`をz-index 45へ下げた副作用により、カードhover時にunite画像がカード下へ回り込んでいたため、pointer-events:noneを維持したままz-index 140へ戻し、HP0/出撃不可カードの×ボタンはz-index 220へ上げて操作面を維持。魔導板カード/報酬カードのドラッグ中に「魔導板」文字、魔導板内カード、`card_back.png`/`card_back_o.png`が暗くなる件は、dragzone中の`#hand-pane`配下全要素・疑似要素・`#hand-pane-board-bg`に`filter:none; opacity:1`を明示して修正。`reward.js?v=unitefix2`へ更新済み。node --check通過。未コミット。
  - 封印カード本体のフェードインとS002再生/逆再生の尺ズレを修正（render.js）。カード本体のfilter transitionは固定2.6秒を廃止し、`_SEAL_RELEASE_VFX_TIMING.forwardMs + reverseMs`（現状3秒）から自動算出。スタイル解除も中間点からではなく演出開始から3秒+40msに変更。さらにWebP逆再生は「フレーム数×最低16ms」方式をやめ、`performance.now()` + `requestAnimationFrame`の時間ベースにして指定reverseMsで終わるよう変更。`render.js?v=sealfade2`へ更新済み。node --check通過。未コミット。
  - 報酬画面の魔導板で、HP0になったキャラクターパネルが出撃パネル上にいると`unite_a/b`接続画像がカード下に回り込み、廃棄・取得操作がしづらくなる件を修正（index.html／reward.js）。HP0のキャラクターパネルは接続マーカー描画対象から除外し、`.panel-unite-link`のz-indexをカード無効化オーバーレイより下げ、無効表示中の×ボタンはz-index 160で常に上へ出す。`reward.js?v=unitefix1`へ更新済み。node --check通過。未コミット。
  - S002.webp（封印解放）は「直前表示サイズのさらに1.5倍」としてscale 3、S003.webp（生贄破棄）は前設定のscale 4へ戻して対象カード中心に再生。S002は順再生1.5秒→逆再生1.5秒、封印カードのbloodアイコン列はS002再生開始と同時に消し、カード本体のフェードインはS002再生開始と同時に2.6秒（slot本体ではなく子要素filterをtransition）。S003は前設定の順再生0.75秒→逆再生0.75秒で、逆再生開始時に生贄カードをtransitionなしで瞬時消去。位置は下すぎ/上すぎのSS比較を受け、カード高の5%ぶん上へ移動。
  - ファナティックの画像未表示は`CharacterArtOverrideMap`に`ファナティック -> assets/temp/cards/art/characters/C100.jpg`を追加して修正。
  - 封印持ちカード／戦闘ユニットに`assets/temp/cards/blood.png`を必要生贄数ぶん左上へ縦並び表示。取得後カードでも表示されるよう`keywords`の`封印N`を直接読む表示用ロジックに修正し、魔導板独自描画（reward.js `renderHeRow`）にも差し込み。戦闘中は場の生贄数ぶん先頭から明るくなり、生贄が減るとその分暗く戻る。解放後はbloodアイコン列を非表示。デバッグカード上は22px、ドラッグゴーストでは元カード上の実寸をコピー。生贄複数時のずれは180ms。`blood.png`は新規未追跡素材。node --check通過。未コミット。
  - S002/S003特殊VFXはホスト側の`overflow:hidden`をやめ、画面端でのみクリップされるよう修正。`object-fit:cover`でカード外に大きく出し、S002はカード下寄せアンカーで表示。フィーンドの「解放：全ての敵に1ダメージ」が攻撃時にも発火していた件は、攻撃効果の汎用「全ての敵に1ダメージ」判定から`解放:`を除外して修正。
  - 特殊VFX（S002/S003等）に加え、C043など通常攻撃の薙ぎ払いVFXも、スケール後の`#scr-battle`実表示矩形と同じ固定クリップコンテナ（`.special-vfx-clip`/`.sweep-vfx-clip`、overflow hidden）内に入れるよう変更。4Kゲーム画面からはみ出す部分はカットされる。前回の`.battle-area::before`相当（4K座標top315/bottom270/width2660）基準は実背景とズレて変な位置で切れていたため撤回。マナHUDも表示内容生成後に実幅を測り、`#scr-battle`右上（従来同等の右4.7%/上6%）へ固定配置。`render.js?v=vfxclip4`へ更新済み。node --check通過。未コミット。
- 【今回追加】⑧初期配置・指輪ドラッグ暗転・指輪解放の廃棄カウントを修正（main.js／index.html／reward.js）。
  - 初期キャラをランダムな出撃パネルへ（main.js `_giveInitialRandomBoardCards`）：`charSlot`が固定の7（非出撃スロット）だったため、開始時のキャラが常に「出撃不可」表示（`invalid-battle-position`）になっていた。`MAIN_BOARD_DEPLOY_SLOTS`（[0,2,4,11,13]）から`randFrom`で選ぶよう変更。強化カード2枚を置くフォールバック分岐も固定の`[6,5]`をやめ、charSlotに隣接する空きの非出撃スロットから詰めるよう一般化（同関数内で`deploySlots`を二重`const`宣言していた箇所も解消）。
  - 指輪ドラッグ中に画面全体が暗くなる件（index.html）：⑦と同じ原因（`#ring-drag-overlay`がbody直下にあり、`transform`でスタッキングコンテキストを作る`#scr-battle`の中身がz-indexで逃げられない）。オーバーレイを`.battle-area`内へ移動し`position:absolute;z-index:8000`に変更、ドラッグ中のみ`.battle-scroll{z-index:30}`に引き上げ。指輪置き場は既存の`#reward-production-ui{z-index:9001}`＋「指輪以外の兄弟に`filter:brightness(.5)`」の仕組みがそのまま効くようになった。栄光の力からのドラッグ（`dragzone-ring-offer`）ではドラッグ元の`#battle-order-section`も明るく残すルールを追加。
  - 指輪提示で3枚のはずが4枚廃棄になる／キャラクターがカウントされない件（reward.js `renderHeRow`、Gemini指摘・採用）：そのターン取得したばかりのカードは`_isCurrentRewardReturnCard`が優先され×が「報酬に戻す」として処理されるため、盤面から消えても`_boardDiscardCount`が増えていなかった（取得カードがキャラクターであることが多く「キャラは数えられない」と見えていた）。`_ringOfferDiscardable`の`!_isCurrentRewardReturnCard(card)`除外を削除し、`_spellBtn`のボタン生成と`discardBtn.onclick`の分岐の両方で指輪提示中の廃棄を「報酬に戻す」より先に判定するよう順序を入れ替え。
  - 実機確認：headless Chrome＋CDPで、①初期キャラが30回とも出撃パネル（0/2/4/11/13にランダム分散）に乗り強化2枚も配置されること、②指輪ドラッグ中に指輪置き場だけが明るく残ること（elementFromPoint＋スクリーンショット目視）、③キャラ・強化・取得直後カードの全てに`ring-offer-discard-btn`が付き、3クリックで`_boardDiscardCount=3`／`_ringOfferUnlocked=true`になることを確認済み。node --check通過。未コミット。
- 【前回】⑦魔導板／報酬カードのドラッグ中の暗転範囲を修正（index.html／reward.js）。⑥で入れた「インラインz-indexで9001に引き上げる」対処は根本的に効かないことが判明：`#scr-battle`は`transform:scale(--game-scale)`でスタッキングコンテキストを作るため、body直下にある暗転オーバーレイ（z-index:9000）より上に画面内の要素を出すことは原理的に不可能で、結果として画面全体が暗くなっていた。①`#mainequip-drag-overlay`のDOM位置を`.battle-area`内へ移動し`position:absolute;z-index:8000`に変更（暗転しない枠と同じスタッキングコンテキストで競わせる）。②`.battle-scroll`（z-index:1）の外にいる`#reward-production-ui`（z-index:2）等にもオーバーレイを届かせるため、ドラッグ中のみ`.battle-scroll{z-index:30}`に引き上げ。③明るく残す枠は`#hand-pane`(9001)・`#hand-pane-board-bg`(9002＝board.pngの枠画像。通常時9>2の重なり順を保つため1段高くする)・`#battle-order-section`(9001)。`_DRAG_ZONE_RAISE_TARGETS`を`[セレクタ, z-index値]`のペア形式に変更。④報酬カードのドラッグ（`dragzone-reward-spell`/`dragzone-reward-nonspell`）でも同じオーバーレイを表示し、魔導板を暗くしていた既存ルール`dragzone-reward-spell #hand-slots.unit-equip-slots{filter:brightness(.4)}`を削除。実機確認：headless Chrome＋CDPで報酬画面を再現し、`elementFromPoint`で魔導板・報酬カード枠がオーバーレイより上、指輪置き場/編成UIがオーバーレイより下になることを3ゾーン全てで確認。スクリーンショットでも背景・左カラムのみ暗転し2枠が明るいままであることを目視確認。ドラッグ解除後にz-indexが元値（10/9/2/1）へ戻ることも確認済み。node --check通過。未コミット。
- 【前回】⑥栄光の力画面の細部（フォント統一・部分取得後の表示・暗転範囲）を修正。
  - 説明文「3枚のカードを捧げれば〜」のフォントをクエスト討伐目標行と同じ（Shippori Mincho, 30px, #8b7c67）に統一。
  - 廃棄4枚必要になる不具合：`_discardBoardCardForRingOffer`に「既に廃棄済み（枠が空）なら二重加算しない」防御チェックを追加（根本原因は未特定、再発防止の防御的対応）。
  - 魔導板カードをドラッグすると指輪（暗転中）が明るくなる件：`#battle-order-row`に一度だけ登録される「カードを報酬置き場へ戻す」dragover/dropリスナーが、栄光の力画面遷移後もフェイズ判定なしに残留し続けており、`_dragSrc.arr==='unitEquip'`（魔導板カード）を検出すると誤発火していたのが原因。`_canReturnDragSrcToRewardArea()`の先頭で`G._ringOfferPhase`ならfalseを返すよう修正。
  - 指輪ドラッグ中に指輪置き場自体が暗くなる件（前回の修正が効いていなかった）：`.reward-prod-ring`の祖先`#reward-production-ui`のz-indexを引き上げる自前ルールと、`html body.reward-screen-active #reward-production-ui 等{z-index:2!important}`という後方の包括リセットルールが同じ詳細度（id1+class1）で衝突しており、後方勝ちで無効化されていた。同様の問題が魔導板ドラッグ中の`#hand-pane`にもあった（さらに`:has()`使用で詳細度id2相当の別ルールもあり、CSS詳細度の重ね掛けだけでは確実に勝てなかった）。`_setDragZoneClass`/`_clearDragZoneClass`（reward.js）にゾーン別のインラインstyle（`setProperty('z-index','9001','important')`）による引き上げ・解除処理を追加し、CSS優先度に依存せず確実に暗転から除外するよう修正。
  - 魔導板ドラッグ中は魔導板・報酬カード（栄光の力）以外を暗くする：`#mainequip-drag-overlay`を新設し、`dragzone-mainequip`中に表示。上記のインラインz-index引き上げと組み合わせて対応。
  - 指輪を1つ取得した後、残り2枚を暗い状態のまま中央揃えで表示し続ける：`G._ringOffer`を空にせず選択分だけ`splice`で除去する方式に変更。新規フラグ`G._ringOfferResolved`で「取得済み」を管理し（`_ringOffer.length`では区別できないため）、廃棄ボタンの再表示や「編成完了」ボタンラベル（指輪を取らない/決定）の判定に使用。ring-phase専用スナップショットにも追加。
  - ドラッグで指輪取得後に巨大なゴースト画像が残る件：ドロップ成功時`renderRewCards()`がドラッグ元要素自体を再生成（DOM上から消える）するため、自然発火するはずの`dragend`が発火せずゴーストが残っていた。ドロップ処理内で明示的に`_removeDragGhost()`/`_clearDragZoneClass()`を呼ぶよう修正。
  - 実機確認：discardCount 3/3・remaining ring offer後のG._ringOffer/表示・ghost残留無し・z-index（9001/2/10の切替と解除後の復元）・`_canReturnDragSrcToRewardArea()`のring-offer-phase中false化を全てconsole+スクリーンショットで確認済み。node --checkも全対象ファイル通過。
  - 指輪報酬フェイズが出ない件（Gemini指摘・採用）：①`finishBattleAsVictory()`冒頭で`if(_isBossFight) G._bossJustDefeated=true;`を無条件に立てるよう変更（battlePhase()内の膠着状態Draw分岐がこのフラグを経由せず`finishBattleAsVictory('Draw')`を直接呼んでいたため、ボス戦の膠着引き分けだけ指輪報酬が飛んでいた）。②`_pickRingOffer()`（reward.js）に安全弁を追加：未所有指輪が3枚未満なら所有済みも含む全体プールにフォールバックし、それでも3枚に満たない場合は無条件にプールから埋めて必ず3枚返すようにした。
  - 生贄破棄・封印解放VFXが左上に小さく出て封印解放（S002）が再生されない件（Gemini指摘・採用）：`applyNewPanelBattleStart()`の出撃ループが`_afterPanelSummon(...,true)`をawaitせずに連続呼び出ししており、各ユニット内部の`_resolveSeals()`が全キャラクターの配置・DOM描画（レイアウト確定）より前にフライング実行され、`getBoundingClientRect()`が正しい座標を取れず、かつ描画前に`unit._sealed=false`へ書き換わって封印演出自体がスキップされていた。①`_afterPanelSummon`に`if(!isInitialDeploy) await _resolveSeals();`ガードを追加し、開戦時の通常出撃では内部で解封処理をしない。②`applyNewPanelBattleStart()`で全ユニット配置後に`renderAll()`＋1フレーム+50ms待機を挟んでからタイタン等の開戦効果・`_initSealStates()`・`_resolveSeals()`を実行するよう変更。③`playSealReleaseVfx`（render.js）でS002再生開始と同時に暗い封印フィルターを0.8秒かけてフェードインで解除するよう変更。
  - 栄光の力（指輪提示）画面の見た目・操作性（index.html／reward.js）：①提示指輪カードを元のカード幅のまま、ring_slot.png本来の比率（正方形）にし、`align-self:flex-end`で底辺を揃えたまま上端だけ詰める新クラス`.ring-offer-card`用CSSを追加。②空いた見出し〜カードの間に説明文「3枚のカードを捧げれば、1つを選んで獲得可能」を`#battle-order-section::after`で追加。③指輪ドラッグ中に指輪置き場まで暗くなる件：`.reward-prod-ring`は`#reward-production-ui`（z-index:2の祖先）に閉じ込められておりz-index単体では暗転オーバーレイ（z-index:9000）より上に出せなかったため、`#reward-production-ui`自体をオーバーレイより上げつつ、指輪置き場以外の兄弟セクションだけ`filter:brightness(.5)`で個別に暗くする方式に変更。④ドラッグ中に指輪の絵が浮かない件：`_createDragGhost()`がクローン後に`style.cssText`を丸ごと上書きしてしまい、`--ring-art`（CSSカスタムプロパティ）が消えていたのが原因。指輪置き場・栄光の力両方のdragstartで、ゴースト生成直後に元要素から`--ring-art`を再設定するよう修正。⑤指輪置き場でドラッグ中に他の指輪枠へホバーした時に魔導板と同じ発光（白いdrop-shadow）をするCSSを追加。
  - 実機確認：node --check通過。ボス報酬フェイズを実際の勝利処理（`_onAllEnemiesDefeated`等）経由でconsole再現し正常動作を確認。`_afterPanelSummon`のisInitialDeploy別`_resolveSeals()`呼び出し有無をモンキーパッチで確認（true時は呼ばれない/false時は呼ばれる）。栄光の力画面のスクリーンショットで正方形カード・説明文・ドラッグ中のリング画像浮遊・指輪置き場の非暗転・スロット発光を目視確認。試験戦闘で回帰エラー無し。
  - 結界の説明文が「結界2」になる件：`_unitDisplayKeywords`（render.js）が`unit.keywords`（強化パネル接続で既に"結界1"のような数値付きで入っている）と、`unit.shield`から動的生成する`結界${unit.shield}`を両方足し合わせ、`_mergeCountedKeywords`が同じ基底キーを合算してしまっていたのが原因（実際の`unit.shield`自体は正しく1）。`unit.keywords`側の`結界`/`結界N`表示用エントリを除外し、`unit.shield`由来の1エントリだけを正とするよう修正。
  - 生贄・封印解放のVFXが出ない件（音だけ鳴る）：`playSpecialProductionVfx`（render.js）のforwardMs/reverseMsが200ms/200msで、S002.webp（約9秒尺）・S003.webp（約2.6秒尺）に対して短すぎ、`<img>`がろくに描画されないうちに順再生の記録を打ち切って逆再生していたため、ほぼ何も映らないまま終わっていた。`playSacrificeDestroyVfx`/`playSealReleaseVfx`にforwardMs:750/reverseMs:750（計1.5秒）を明示指定。生贄ごとの演出ずらし・最後の生贄完了後に封印解放VFXが続く順序は既存の`_sacrificeUnitsForSeal`/`_resolveSeals`の構造で元々満たされていた（変更なし）。
  - 常時効果が最優先されない件：`_applyRingBattleStartEffects()`（指輪の色+10/+10等）が`_applyNewOpeningEffects()`の後に呼ばれており、かつ`_applyNewOpeningEffects()`内部で既に`_resolveSeals()`（生贄破棄・封印解放）まで実行してしまっていたため、封印中のキャラクターは指輪の色バフを受けられず（`_addBattleStats`/`_buffAllBattleColor`が封印中ユニットを除外）、かつ生贄にした味方も未バフの基礎値のまま破棄されていた。①`_addBattleStats`/`_buffAllBattleColor`に`includeSealed`引数を追加し、常時効果（指輪の色バフ）呼び出し時のみ封印中ユニットにも適用するように変更、②色バフ部分を`_applyRingPassiveBattleStartEffects()`として分離し、`applyNewPanelBattleStart()`内でユニット出撃直後・タイタン/スケルトンキング等の開戦効果や`_initSealStates()`/`_resolveSeals()`より前の最速タイミングで呼ぶよう並び替え。開戦タグの指輪効果（苦行/強靭/威圧/疾風/聖騎士）は従来の`_applyRingBattleStartEffects()`のまま、開戦効果と同格の位置に残した。紫の瞳の指輪＋封印持ちアークデーモン＋生贄2体（ツインデビル×2）の実例で、修正前は誤った値、修正後は仕様通り50/44になることをconsole経由で確認済み。
  - 起源の種が機能していない件：既存実装（`_applyNewOpeningEffects`内、descが空の場合だけ基礎descをコピーする謎処理）はカードテキスト「このキャラクターが本来持つ、キーワード以外の効果を得る」の実際の意味（このキャラクター自身の効果が1回追加で発動する）と一致しておらず削除。`_unitEffectPanelCount(unit,'起源の種')`を、解放（`_releaseRepeatCount`）・死亡（`_applyDeathKeywordEffects`のdeathRepeats）・負傷（`_fireAllyInjuryEffects`のinjuryRepeats）・攻撃（`_applyAllyAttackEffects`のextra）の4箇所の既存repeatカウントに、対象ユニット自身の接続数として加算するよう追加（指輪の陣営全体加算とは異なり、このキャラクター自身のみに効く）。上記アークデーモンの例に起源の種を追加すると78/68（2回加算）になることをconsole経由で確認済み。
  - 生贄で破壊されるキャラクターの死亡効果が発動しない件：`_sacrificeUnitsForSeal()`はunit.hp=0等のフラグを直接立てるだけで`processAllyDeath`/`processEnemyDeath`を経由せず、死亡効果（`_applyDeathKeywordEffects`）が一切発動していなかった。各生贄ユニットの破棄演出完了直後に`_applyDeathKeywordEffects`・`G.battleCounters.deaths`カウント・`_onAnyCharDeath`を発火するよう追加（`processAllyDeath`等の死亡処理本体は経由しない軽量版、二重の`_resolveSeals()`呼び出しは避けている）。
  - 実機確認：node --check通過。試験戦闘で回帰エラー無し。上記の数値検証は全てconsole経由の直接呼び出しで実施（実際のパネル配置経由の統合テストは未実施）。
  - 指輪の絵柄が出ない件：`mkCardEl()`の汎用カード絵柄解決は`assets/temp/ring/R0xx.jpg`の指輪専用パス規則を知らないため空になっていた。指輪の見た目（`ring_slot.png`枠＋`--ring-art`背景）を祖先要素に依存しない単独クラス`.ring-visual`/`.ring-visual-filled`としてindex.htmlに再定義（従来は`.reward-prod-ring .reward-prod-slots i`祖先スコープの`::before`/`::after`だったため、`cloneNode`するドラッグゴーストでは枠・絵柄が消えていた）。指輪置き場のスロット（`_syncRewardProductionRings`）と栄光の力の提示カード（`_renderRingOfferCards`、mkCardElを使わず自前でdiv生成に変更）の両方に適用。
  - 指輪置き場でドラッグ時に持ち上がらない件：`_syncRewardProductionRings`のスロットdragstartに`_createDragGhost(slot)`呼び出しが無かったのを追加（`drag`イベントでの追従・グローバルなdragend/dropでのゴースト解除は既存の仕組みに乗る形で対応）。`_DRAG_ZONE_CLASSES`にも`dragzone-ring-slot`/`dragzone-ring-offer`を追加（無いとbodyクラスが解除されず残留する不具合があった）。
  - 指輪ドラッグ中の暗転：`#ring-drag-overlay`（fixed, black 50%, z-index:9000）を新設し、`body.dragzone-ring-slot`/`dragzone-ring-offer`中のみ表示。`.reward-prod-ring`だけz-index:9001に引き上げて暗転から除外。
  - 指輪獲得後「元に戻す」で報酬カード画面まで戻ってしまう件：`_enterRingOfferPhase()`実行時に`_storeRingPhaseStartSnapshot()`で専用スナップショット（mainBoard/rings/ringOffer/unlocked/discardCount）を取り、栄光の力画面中の「元に戻す」は`_resetRingPhaseToStart()`でこのスナップショットにのみ戻す（`G._ringOfferPhase`はtrueのまま維持）よう分岐。通常報酬画面中の「元に戻す」は従来通り`resetRewardToStart()`。
  - 実機確認：ring-visual付与・ドラッグゴースト生成・オーバーレイのz-index/表示切替・栄光の力画面中の「元に戻す」でmainBoard/rings/ringOfferが画面遷移前の状態のみ巻き戻ること（報酬カード画面には戻らない）を全てconsole経由で確認済み。node --checkも通過。
- 【前回】①色アイコン化の退行バグ修正、②指輪報酬画面が出ない件を調査（未再現・原因未特定→上記の通りキャッシュが原因と判明）。
  - ①render.js `_injectManaIcons`：前回セッションで「色＋マナ」正規表現の色部分を`([青赤緑黄紫茶])`（必須）に書き換えてしまっており、色が付かない「2マナを得る」のような表記（実例：野生の力の実データ「開戦：2マナを得る。」）が全くアイコン化されなくなっていた（退行）。色を再び任意`([青赤緑黄紫茶])?`に戻して修正。あわせて、前回追加した「単独の色の字は常にアイコン化」ルール（`/[青赤緑黄紫]/g`、無条件）が、先に処理された「色＋マナ」置換結果（`<img alt="赤">`等）のalt属性内の色文字まで誤って再アイコン化してしまう二重変換バグを発見・修正（`[青赤緑黄紫](?!(?:の)?\d*マナ)`という否定先読みで「これから色＋マナ処理される文字」を除外してから単独色マッチを行う）。実機で「2マナ」「赤の3マナ」「紫のキャラクター」「青マナ」「野生の力の実データ」全パターンでの二重変換無し・正しいアイコン化を確認済み。
  - ②指輪報酬画面（栄光の力）が表示されなかった件：`_onAllEnemiesDefeated()`→`finishBattleAsVictory()`→`_handleVictory()`→`goToReward()`→「編成完了」クリック→`_enterRingOfferPhase()`の一連を、実際のボス戦勝利に近い形（`_isBossFight=true`、`G.allies`生存、`G.enemies`全滅、setTimeoutも実際に待つ）でconsole経由フル再現したが、`G._isBossRewardCycle=true`・`G._ringOffer`3件生成・「編成完了」クリックで「栄光の力」ヘッダーとカード3枚の表示まで全て正常に動作し、再現できなかった。script版数タグ（`?v=...`）を毎回更新しないとブラウザキャッシュで古いJSが動くという既知の問題があるため、ユーザー側のキャッシュが古い可能性が高いと推測しているが未確定。次回、再現しない場合はユーザーに「本当にボス階だったか」「通常の報酬カード画面は出たか」「編成完了ボタンを押したか」を確認する。
  - 色アイコン化（render.js `_injectManaIcons`/`_colorIconPath`、assets.js）：①ヴォイド・ウォーカーの説明文「紫のキャラクター」がアイコン化されなかった件を修正。原因は二重：(a) 正規表現が色文字の直後に特定単語（キャラクター等）が続く場合のみマッチし「の」を挟む言い回しに未対応だった、(b) 紫のアイコン画像自体がassets.js/assetsフォルダに未登録だった（赤青緑黄のみ存在）。ユーザーからpurple_orb.png（77×77、他色と同形式）の提供を受け、`Assets.cards.purpleOrb`として登録し`_colorIconPath`に紫の分岐を追加。②ユーザー要望により、色文字マッチ条件を「特定単語が続く場合のみ」から「赤・青・緑・黄・紫の漢字1字なら前後を問わず常にアイコン化」に変更（`_injectManaIcons`第2正規表現を`/[青赤緑黄紫]/g`に簡略化。茶は対象外＝ユーザー指定の5色のみ）。副作用として「緑域の隠者」等、色の字を含む無関係な複合語もアイコン化される（キャラクター名は`_formatPreviewHtml`のplainTitle経由で保護されるため実害は限定的だが、望まない箇所があれば個別に要調整）。
  - ミノタウロスの負傷効果の処理順序（battle.js）：負傷効果（ミノタウロス「直ちにランダムな敵に攻撃する」等）が、攻撃中のキャラクター（例：全体攻撃効果を持つサイレン）の攻撃処理と並行実行され、順序が乱れる（例：既に死んだ敵を後続キャラが攻撃してしまう）不具合を修正。`_applyDamageState`は`applyDamageBatch`内で同期的に呼ばれるため、そこでは「負傷効果が必要」というフラグ（`needsAllyInjuryEffects`）だけを立て、`applyDamageBatch`が自身のVFX・死亡処理を確定させた後に`_fireAllyInjuryEffects`/`_onAllyInjuredByPanel`を対象ごと直列にawaitして発動するよう変更（両関数をasync化）。ミノタウロスの攻撃自体も、旧実装（`playAttackMotion`を待たず`dealDmgToEnemy`を直接呼ぶ簡易版）から、通常攻撃と同じ`_dealAttackDamageWithMutual`（攻撃モーション・反撃を含む一連の処理）を使うよう変更し、二段攻撃・三段攻撃キーワードがあれば規定回数awaitしながら繰り返すようにした。ついでに同じ関数内の「逆上」キーワードの`applyDamageBatch`呼び出しにもawaitを追加（同種の未await問題だったため）。`processAllyDeath`の根性リバイブ分岐の呼び出し元にもawaitを追加。実機で二段攻撃ミノタウロスに1ダメージ与えるバッチをawaitし、戻り値の時点で敵HPが2回分減っていることを確認済み（試験戦闘でのリグレッションエラーも無し）。

新しいチャットを開始したら、作業に入る前に必ずこの節を読むこと。
**この節は、まとまった作業を終えるたびに必ず更新すること**（何を変えたか・未コミットかどうか・次にやるべきことを3〜5行で）。長い経緯は書かず、直近の状態だけを残す（古い内容は上書きしてよい）。

- 未コミット変更あり。今回追加で `index.html`, `assets.js`, `js/engine/audio.js`, `js/engine/battle.js`, `js/engine/render.js` を編集済み（それ以前からの未コミット変更も残存）。script版数タグを一部 `?v=specialfx1` に更新済み（ローカルhttp.serverでのキャッシュ確認用。file://でも動作に影響なし）。
- 前回実装（ミュートボタン／グレムリン演出）に加え、今回実装：
  ①マナ持ちキャラをドラッグした時にマナアイコンがズレる不具合を修正（index.html `.drag-ghost .mana-cost-orbs` の誤った `transform:translateX(-50%)` を削除）。
  ②ガーゴイルの「全紫+1/+1、接続強化カード数だけ繰り返す」を `Math.max(1,N)`→`1+N` に修正（battle.js `_applyNewOpeningEffects`）。※フィーンドの解放効果も同一パターンで同じ疑いあり、確認待ちタスクをspawn_task済み（未修正）。
  ③「特殊演出」シート対応：生贄破棄→封印解放を瞬時実行ではなく、S003.webp/wavで1体ずつ左上優先・少しずつずらして破棄→S002.webp/wavでフェードイン解放、の演出付きに変更（battle.js `_sacrificeUnitsForSeal`/`_resolveSeals`、render.js `playSpecialProductionVfx`/`playSacrificeDestroyVfx`/`playSealReleaseVfx` を新設）。あわせて `_afterPanelSummon`/`_spawnAdhocAllyUnit` をasync化し、デスナイト等の死亡召喚チェーンが演出完了まで正しくawaitされるよう修正。
  ④通常攻撃ヒットVFX（hit.webp）が終盤で静止してから唐突に消えていた件を修正：`playHitVfxAtRect`のwebp分岐を、hitDuration経過後にCSS transitionでフェード開始する方式から、hitDuration全体を1本のWeb Animations API（.animate()）にして終盤で動きを止めずに滑らかにフェードアウトする方式に変更（render.js）。Gemini提案のscale演出追加は見送り、フェードのタイミング修正のみに限定。
  ⑤デバッグミュート中でもmenu/ui/click/confirm/purchase/reroll系の音だけ鳴ってしまう件を修正：`_boostGlobalUiSounds`のvolumeセッターが`val`の大小を見ずに常に1.0へ強制上書きしていたため、`val>0`の時だけ上書きするよう条件を追加（audio.js）。val===0（ミュート指示）はそのまま通るようになった。実機でAudio要素のvolume=0が維持されることを確認済み。
  ⑥アラッサスの薙ぎ払い炎素材がユーザーにより新しいC043.webpに差し替えられ（675x302、透明マージン無し＝コンテンツがフレーム全体を占める）、旧素材向けに登録していた`_SWEEP_VFX_CROP['C043']`のトリミング値が不正合になったため削除。トリミング未登録の素材は`background-size:100% 100%`（非一様stretch）ではなく`contain`にフォールバックするよう変更し、素材本来の縦横比を保ったままboxにフィットするよう修正（render.js `playCharacterSweepVfx`）。実機でbackground-size:'contain'が適用されることを確認済み。
  ※WebPの「逆再生」は file://運用のためImageDecoder/fetchが使えず、<img>再生中の見た目をcanvasにdrawImage()で記録→逆順描画する方式で近似実装（実機で forward→2枚同時→S002切替→クリーンアップ まで確認済み）。
- ローカルhttp.server(8795/8796)で実機確認済み（ガーゴイル+3、マナアイコン位置一致、生贄演出の表示順序・タイミングを確認）。構文チェックも全ファイル通過。Gitコミットはしていない。
- アラッサスの薙ぎ払い炎：`object-fit:contain`＋長さ2倍だけでは「炎がキャラから遠い」問題が残ったため、根本原因（C043.webp素材は帯の左右上下に大きな透明マージンを持つ）を全15フレームのアルファ外接矩形の和集合から実測し解決。`<img>`をやめてbackground-image方式のdivに変更し、`background-size`/`background-position`で透明マージンをトリミングして炎本体だけをbox一杯に表示するよう修正（render.js `playCharacterSweepVfx`、新設 `_SWEEP_VFX_CROP` マップ＝コード別トリミング値、現状C043のみ登録）。計算式・実際の適用値はgetComputedStyleで一致確認済みだが、この環境でのスクリーンショット確認が画面状態の制約で行えておらず、最終目視はユーザー確認待ち。
- 試験戦闘で通常攻撃音が鳴らない件：解決。原因は`_panelSummonSpec()`（battle.js）がパネルの`sfxType`（剣/斧/パンチ/キック）を召喚spec に引き継いでいなかったため、魔導板から出撃する味方ユニットは常にsfxType=''になり、`playAttackDamageSfx`の命中音（sword1/punch1等）が鳴らなかった（`_makePanelSummonUnit`側はspec.sfxTypeを正しく使う実装だったため、抜け漏れ箇所はここだけ）。通常戦闘では敵の攻撃（enemy.js側は元からsfxTypeが正しく入る）で音が鳴っていたため気づきにくく、試験戦闘は敵ATK0で敵が攻撃しないため露呈していた。`_panelSummonSpec`にsfxType継承処理を追加して修正、`_getPartyBoardUnit()`→`startBattle()`の実経路でアラッサス(パンチ)のsfxTypeが最後まで引き継がれ`_normalizeAttackSfxType`が'punch'を返すことを実機確認済み。Gemini提案のもう1つの修正（sfxType未設定時にswordへフォールバック）は今回の根本原因ではなく全キャラの挙動に影響する副作用があるため見送り。
- 【新機能】「呪詛」キーワード＋指輪システム（R001〜R029、実装=falseのR014/R025/R027除く26種）を実装済み。ユーザーフィードバックを反映して指輪提示フローを作り直した（旧：ボス撃破直後にフローティングパネルでクリック取得／新：通常報酬取得後の別編成画面でドラッグ取得）。
  - 呪詛：`applyKeywordOnHit`（battle.js）の先頭に追加。対象側キーワードで攻撃者を即死させ、死亡処理を明示発火。3箇所の呼び出し元ガード（`_applyDamageState`/`dealDmgToAlly`/`dealDmgToEnemy`）を攻撃者のキーワード有無に依存しない形に緩和。
  - 指輪データ：`loader.js`がRING_POOLを完全シート駆動で読み込み。指輪シートのみ`_rowImplemented`（未指定＝実装済み扱い）ではなく`_truthySheet(row['実装'])`（明示的にTRUE/✓等の場合のみ採用）でフィルタするよう修正（空欄のドラフト行「均衡の指輪」R043等が誤って出現するバグを解消。実機で指輪26件に減ったことを確認済み）。初期装備の指輪は廃止（`state.js` `rings:[null,null,null,null]`）。
  - 指輪効果の実装場所（battle.js）：色+10/+10・苦行・強靭・威圧・疾風・聖騎士は新設`_applyRingBattleStartEffects()`（`applyNewPanelBattleStart`から呼び出し、加算→乗算の順を厳守）。狂戦士/屍術師/激怒/秘紋/賢者は既存のrepeat変数に`_ringCount()`を加算。加護は`_isAilmentImmune()`に統合。毒沼は毒付与の最終値に乗算。魔力は`processEnemyDeath`、復活は`processAllyDeath`冒頭（1戦闘1回、`G._revivalRingUsed`）、光は`_afterPanelSummon`、嵐は`_gainMana`から呼ぶ新設`_checkRingManaThresholdEffects()`（10マナ毎リピート）、幸運は`applyKeywordOnHit`内でHP=7/77/777判定、鬼神は`allyAttackAction`末尾の12回カウンタ、呼応は`_resolveSeals()`内のコピー召喚、鏡は`_effectiveRings()`（右隣解決・最大深度4）で汎用対応。
  - ボス報酬後の指輪提示フロー（reward.js）：`goToReward()`で`G._bossJustDefeated`を`G._isBossRewardCycle`にスナップショットし、`_pickRingOffer()`（魔導板カードのタグ出現数を集計し最多タグ一致2枚＋タグなし1枚を選出）で`G._ringOffer`を準備するが、この時点ではまだ表示しない。通常の報酬カード取得後に「編成完了」ボタンを押すと、`_hasPendingRingOffer`があれば即座に`chooseMoveInline`へ進まず`_enterRingOfferPhase()`（`G._ringOfferPhase=true`）へ切り替え、同じ`#battle-order-section`／`#battle-order-row`（従来「報酬カード」表示に使っていた枠）に指輪3枚を`_renderRingOfferCards()`で表示する。見出しは`body.ring-offer-phase`クラス＋CSSの`::before{content:"栄光の力"}`（index.html、`#battle-order-section::before`の上書きルール）で「報酬カード」→「栄光の力」に切替。指輪カードは暗い間はホバーで説明のみ（`data-preview`＋既存のグローバルツールチップ機構、`pointer-events`は殺さない）、魔導板カードの新設「廃棄」ボタン（`.ring-offer-discard-btn`、デバッグ廃棄・報酬返却ボタンとは排他、`G._ringOfferPhase`中のみ表示）を3回押すと`G._ringOfferUnlocked=true`になり指輪カードが明るくドラッグ可能になる（`_dragSrc={arr:'ringOffer',idx}`）。指輪置き場（`.reward-prod-ring .reward-prod-slots i`、`_syncRewardProductionRings()`）の空き枠にドロップすると装備、既存の指輪同士もドラッグ&ドロップで入れ替え可能（鏡の指輪は右隣を参照するため順序に意味がある）。「編成完了」ボタンは`G._ringOfferPhase`中は「指輪を取らない」（未取得）/「決定」（取得後）に切り替わり、押すと`chooseMoveInline`が実行される。「元に戻す」は`resetRewardToStart()`のスナップショットに指輪提示状態一式（`rings`/`ringOffer`/`ringOfferUnlocked`/`boardDiscardCount`/`ringOfferPhase`）を含めたため、ボス報酬サイクルの最初の状態まで正しく巻き戻る。
  - SEが鳴らなくなる不具合（指輪取得後に「元に戻す」を押すと発生、と報告）への対処：明確な再現手順・例外は特定できなかったため（Claude Browser環境は音声自体が強制ミュートされ再生系の実地検証ができないという制約あり）、`playSfx`（audio.js）に安全弁を追加：`ended`/`error`イベントが何らかの理由で発火しない場合でも4秒後に強制的にボイス枠（`_sfxActiveVoices`）を解放するようにした（従来は`maxPlayMs`指定時のみ強制解放していた）。ユーザーによる実機での再現・改善確認が必要。
  - 実機確認：ローカルhttp.server(8791、ブラウザキャッシュにより`?cachebust=`クエリでの強制再読み込みが必要な場面あり)＋Claude Browserで、RING_POOL 26件ロード・構文エラー無し・戦闘開始時の加算→乗算順・魔力の指輪の敵撃破時+2マナ・復活の指輪の最大HP復活・「編成完了」押下での栄光の力画面遷移（見出し切替・カード表示）・廃棄3枚での解放・ドラッグでの指輪装備・指輪置き場内のドラッグ入れ替え・「元に戻す」での巻き戻りを、実際のボタンクリック（`.click()`）またはDragEvent相当の状態操作で個別に動作確認済み。node --checkは全対象ファイル通過。Gitコミットはしていない。

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
