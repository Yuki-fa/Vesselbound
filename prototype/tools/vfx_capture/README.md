# VFXの固定時刻撮影

prototypeで実行する。Chromeの起動と終了は既存の`tools/parity/headless.js`を使う。
PNGの連結・数値比較はPython3、Pillow、NumPyが必要。`VB_CHROME`でChromeの実行ファイルを指定できる。

```sh
node tools/vfx_capture/capture.js --url http://127.0.0.1:5510/tools/vfx_preview.html --out /tmp/vfx-before
node tools/vfx_capture/capture.js --url http://127.0.0.1:5520/tools/vfx_preview.html --out /tmp/vfx-after
python3 tools/vfx_capture/compare.py /tmp/vfx-before /tmp/vfx-after /tmp/vfx-comparison
```

別ポート、file://、任意の既存LABページを指定できる。
変更前コミット`5d9e1d2`のページにもそのまま使える。ページへの撮影機構追加は不要。
旧ページ内のphoto撮影モードと干渉させないため、`?photo=`を付けない。
撮影ツールは現在の作業ツリー側から起動し、--urlだけを前後のページへ向ける。

オプションは`--names banshee,shield-state`、`--frames 8`、`--seed 53`、`--speed 1.5`、`--value 1`。
既定ではVbFx.effectsの全50件を、LABの各効果の既定発生元・対象で撮る。
前後で同じ引数を指定する。状態の濃さと重ねを比較する場合は--valueを変えて別フォルダへ保存する。
方向は1に固定、SEは無音。発生元・対象・尺・命中・コマ時刻はcapture.jsonへ記録する。

時計はページ最初のscriptより前にCDPで注入する。
performance.now、Date、RAF、タイマー、Math.randomを差し替え、外部から60fps刻みで進める。
CSSアニメーションも開始時刻を記録して停止・時刻指定する。
Animated WebPの独自時計は停止できないため、既存のcapture_framesから生成後の経過時刻に対応する静止コマを選ぶ。
静止コマは撮影ツールのフォルダから読み、data URLでブラウザへ渡す。撮影対象ページのサーバーには要求しない。
capture_frames/はGit管理外なので、変更前コミットの配信フォルダに無くても撮れる。
ツール側にも静止コマが無い場合は、ツール側のassets/vfx/の元Animated WebPからPillowで該当コマをメモリ上に抽出する。
いずれも新しい画像ファイルをプロジェクトには作らない。srcを差し替えた画像はload完了後にdecodeし、同じコマのsrcは再設定しない。
画像・フォントの読み込みは待つ。各効果はページを読み直して独立した同一seedから始める。

コマ時刻は全尺の0/N〜(N-1)/N。既定8枚を横へ並べ、上に実時刻を記す。
終端そのものは後片付け後になるため含めない。#stageの矩形を撮る。
compare.pyは同名PNGの組を、上段BEFORE・下段AFTERへ連結する。
時刻ヘッダを除いたRGBで、各コマのMAE・RMSE・最大チャンネル差・32×32pxの最大局所MAE・輝度SSIM・差のある画素比を測る。
frames.csv、effects.csv、metrics.mdにコマ別・効果別の結果を出す。SSIMは8×8pxの非重複窓を画素数で加重平均する。
全コマでMAE ≤ 0.25、最大局所MAE ≤ 1.0、SSIM ≥ 0.9999を数値の目安とする。
全コマ・全RGBの一致は別列のRGB_EXACTで示す。1チャンネルでも差があればPIXEL_DIFFとし、数値の目安を満たしていても完全一致にはしない。
capture.jsonの撮影条件・時刻・配置も突き合わせる。数値だけで目視を合格にしない。
名前・寸法の不足がある場合は失敗させ、比較の取り違えを隠さない。
失敗時もChromeと一時コマを片付け、capture.jsonへ効果名・コマ番号・時刻と理由を記録する。

Chrome無しで道具を実行検証するには`node tools/vfx_capture/check.js`。
これは実ブラウザの撮影確認とは別の検査。
旧版とのCanvas命令・生成素材ハッシュ・仮DOM適用値の補助照合は、`node tools/vfx_capture/trace_compare.js --out /tmp/vfx-trace`。
trace.csv/trace.jsonへ全50効果×8時刻の結果を出す。この照合だけでは実際の画素や見た目を確認できない。
`--companions poison-state,weaken-state --cycles 3`で同じカードの状態を重ね、長い連続時間も照合できる。複数周期は状態ループ専用。
STATUS.txtは比較画像を全部目視してからVISUAL_OKまたはCONTINUEへ毎回書き直す。
各回の判定・修正内容・残る確認はREVIEW_*.mdへ記録する。

## 第2段の参考画像と比較

`webp_manifest.json`に全素材の分類・新しい名前・基準尺・対象外の理由を記録している。第1段の内部画像2層（appearance_sheet・K009）は、2026-10-12の利用者指定により既存の見た目を守るため残す。
Pillowだけで元の素材の全尺8コマと全コマ縮小一覧を作る。

```sh
python3 tools/vfx_capture/extract_refs.py
node tools/vfx_capture/capture.js --url file:///作業ツリー/prototype/tools/vfx_preview.html --out /tmp/vfx-webp --names tools/vfx_capture/webp_targets.txt
python3 tools/vfx_capture/ref_compare.py --new /tmp/vfx-webp --out /tmp/vfx-webp-pairs
```

`--names`はカンマ区切りに加えて一覧txtのパスも受け取る。空行・コメント行は除く。重複は失敗させる。
指定がなければ、前後照合用の第1段50種を撮る。新しい32種は一覧txtで指定する。
ref_compare.pyは32種すべての撮影完了・8コマ・i/8の相対時刻を検査し、上段に元WebP、下段に新しい描画を置く。
元WebPの全尺と、実ゲームで切り取られていた尺は異なるため、両方をヘッダに記す。色・形・流れを参考にし、画素一致の数値判定はしない。
ツールの成功だけでSTATUSをVISUAL_OKにしない。新しい32種と旧50種の比較画像をすべて目視し、REVIEW_WEBP_*.mdとSTATUS.txtを更新する。

Chromeなしの実行検査には、従来のcheck.jsに一覧txt・32種の参考比較・不正時刻の拒否も含めた。
`node tools/balance_sim/vfx_webp_regression.js`は32種の描画・尺・合図・追従・縦拡大・繰り返し・後始末を検査する。
全層を単独再生し、出力Canvasへ不透明な描画があることも確かめる。材質の不足で粒だけが描かれない場合は失敗させる。
`node tools/vfx_preview/cards_runtime_check.cjs --placement-only`は両陣営で飛翔体・貫通・拡大波・前衛列・盤面変更の配置と通過時刻を検査する。
`VB_ONLY=webp node tools/balance_sim/lab_vfx_regression.js`は固有効果のコア→共通presenter→共通描画入口をPvE／保存再生／オンラインで比較する。
いずれも実画面の目視とは別の検査。

## ゲーム内での存在感を旧版と比較する（2026-10-12）

元WebPを黒地へ拡大した`ref_compare.py`は色・形・流れの参考用。ゲーム内の大きさ・明るさは、以下の同じ盤面で比較する。
現在の作業ツリーの道具を使い、旧・新とも**同じ現在のLABのURL**へ向ける。旧ゲームの配信やチェックアウトは不要。

```sh
node tools/vfx_capture/capture.js --url http://127.0.0.1:5520/tools/vfx_preview.html --out /tmp/vfx-ingame/new --names tools/vfx_capture/webp_targets.txt
node tools/vfx_capture/legacy_ingame.js --url http://127.0.0.1:5520/tools/vfx_preview.html --out /tmp/vfx-ingame/old --names tools/vfx_capture/webp_targets.txt
python3 tools/vfx_capture/ingame_compare.py --old /tmp/vfx-ingame/old --new /tmp/vfx-ingame/new --out /tmp/vfx-ingame/cmp
```

`legacy_ingame.js`の引数は`capture.js`と同じ（カンマ区切りの`--names`も可）。省略時は新32種を撮る。
既定は8コマ・seed=53・speed=1.5・value=1。前後で同じ引数を使う。2・3倍速は、LAB既定1.5の2・3倍として`--speed 3`／`--speed 4.5`を両方へ渡し、別フォルダへ撮る。
画像・カード・フォントを待ってから撮り、コマは新定義の実尺のi/8（i=0..7）。発生元・対象・尺・命中も同じ現在のLABから取得する。
画像の連結PNGは各フォルダ直下、VFXなしの盤面は`baselines/<効果名>.png`。カードの画面矩形をPNGの左上基準で`capture.json`へ記録する。
**r8以前のnew_webpには基準盤面・座標が無いため、新32種を更新したcapture.jsで撮り直す。**既存のcompare.pyはbaselines/を比較に含めず、旧50種の比較にも引き続き使える。

旧配置はGitオブジェクト`5d9e1d2`のrender.js・present.js・battle.js・map.js・index.htmlから読み取る（このコミットがローカルGitに必要）。
旧17関数と旧定数はページ内の局所スコープへ渡し、同名の現在のゲーム関数は上書きしない。CSSOMからVFX・継続ホスト・着地アトラス関連だけを取り出す。
命中画像は旧CSSの幅460%と旧素材別倍率、C008は100%×2、飛翔体は旧曲線・倍率・回転、貫通・前衛列は旧逆算寸法、C043は旧背景画像＋回転、S004は旧上昇、K019は旧順逆再生、着地は旧34列アトラスと396/560/980ms、盤面変更は旧対象寸法×2.6を使う。
盤面・カード・数値は現在のcaptureと揃え、ダメージ数値・ゲーム状態変更・SEは追加しない。VFXだけを重ねる。
WebPはPillowでネイティブ寸法・RGBA・各コマの実durationを読み、data URLで渡す。画像の時計は実経過msのまま、旧JSの移動・フェード・タイマーだけを撮影速度へ合わせる（元WebPの動画自体は旧ゲームでも倍速にならなかった）。逆再生は旧コードが実際に記録したコマを戻す。file://にも対応する。

**基準時点で既にLABへ置換済みの3種は参考配置**：S001はbattle-summon、K020はrevive-summon、K009はall-crossが主経路だった。
そのため、旧WebPを主経路で使っていたとは記録しない。S001は旧汎用特殊演出の500ms順＋500ms逆、K020/K009は旧汎用命中入口へ代表尺で配置する。
`capture.json`のlegacyRoute、比較画像の上段、metrics.mdに`reference-only`と理由を明記する。既存3種のLABは変更しない。

`ingame_compare.py`の出力は効果ごとの旧（上）／新（下）の8コマ、`metrics.md`、`frames.csv`、`ingame_compare.json`。
さらに`crops/<効果名>-0.png`（0〜3/8）と`-1.png`（4〜7/8）に、カード周辺を最近傍2倍で拡大した旧／新を保存する。
発生元＋対象から変化が最も多いカードを1枚選び、幅1枚分の余白を付けた同じ固定矩形で全コマを切り出す。座標・選択カード・倍率はJSONの`card_crops`に記録する。
画面全体の縮小だけで判定せず、この拡大画像で核・環・煙の輪郭・魔法陣を確認する。明るさ補正は行わず、数値は拡大前の盤面で測る。

- 領域：発生元と対象のカード矩形を、それぞれカード幅1枚分だけ上下左右へ広げた和集合。重なりは二重に数えず、盤面の端で切る。
- 変化面積：各自のVFXなしの盤面から、RGBのいずれかが3段階以上変わった画素数。カード面積比は元のカード矩形の和集合を分母にする。
- 明るさ増分：変化画素のΔY+=max(0,0.2126ΔR+0.7152ΔG+0.0722ΔB)の合計。0〜255のsRGB値を使用。ROI平均・変化画素平均・暗くなる増分も保存する。
- 核の明るさ：変化画素のΔY+の上位5%平均。個数の端数は切り上げ、変化が無いコマは0。カードの白い絵を核へ算入しないため増分を主指標とし、描画後のYの上位5%平均も補助値として併記する。
- 形の重なり：旧新それぞれの明るさ合計ピークの変化マスクのIoU（共通画素数／和集合画素数）。同じ盤面座標で比較し、位置合わせ・拡縮はしない。面積ピーク同士のIoUと同時刻同士の各コマIoUも保存する。両側が空なら「—」、片側だけ空なら0。
- 色相：正のRGB増分のHSV色相を彩度・輝度で加重した円平均。無彩色は「—」。0/60/120/180/240/300度が赤/黄/緑/水色/青/紫。

旧・新それぞれ8コマ中の最大面積・最大明るさ・最大核を取り、すべての旧比が70〜130%、明るさピークのIoUが0.35以上なら`METRIC_GUIDE_OK`。ピークのコマ番号と、各同時刻の比率も出す。
従来の面積＋明るさだけの`PRESENCE_RANGE_OK`判定はJSONの`presence_status`にも残す。目安を満たしても、カードの色かぶりだけ・核が弱い・塊が無い・魔法陣が読めない等は目視で不合格にする。
旧ピークが0なら`UNMEASURABLE`、範囲外は`ADJUST`。一部だけの撮影も比較できるが、全32種が揃ったかを別に示す。
条件・カード配置・基準盤面・PNGの撮影情報が違う、撮影が未完了、画像や記録が欠けている場合は失敗する。
数値の成功は目視合格とは別で、`visual_review`は常に`UNREVIEWED`。STATUSは自動更新しない。
全部の画像を目視して存在感・終盤の絵/数値・尺/命中・倍速を確認し、効果ごとに旧比をREVIEW_WEBPへ記録してからVISUAL_OKへ進める。

`node tools/vfx_capture/check.js`には、旧関数の32経路×1/2/3倍速、Pillowの32素材のRGBA・時刻、逆再生、基準盤面の取得、既知画素での面積・輝度・色相・上位5%・IoU、32比較画像と拡大画像、入力の取り違えの拒否を含めた。合計が揃っていても核が弱い例・位置が違う例を検査で落とす。Chromeの画素確認は別途必要。
既存50種のr8微差は2026-10-12の利用者指定で合格。旧微差の追跡と内部2層のコード化は残作業から外す。
