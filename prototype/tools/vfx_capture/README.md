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
