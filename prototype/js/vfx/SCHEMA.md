# VFX定義データ v2

`defs/effects.js` の50効果は、宣言的な `layers` と固定の合成設定 `composites` で記述する。
数値、色、数値曲線、グラデーション、範囲乱数、列挙値、図形パスのみを保存する。
式、構文木、変数、実行条件、繰り返し、関数呼び出し、効果固有の部品型を保存しない。
描画の振り分けは部品型・物理配置・素材の列挙値を用いる。効果の `name/label` はAPIの検索専用。
許可する全フィールド・型・範囲は [schema.js](schema.js) の固定の許可リストを正とする。

## 読み込み・書き出し

通常scriptの順序は `schema.js → curves.js → textures.js → defs/geometry.js → defs/effects.js → defs/webp_geometry.js → defs/webp.js → renderer.js → ../engine/fx_lab.js`。
ES Modules、ビルド、サーバー、fetchを必要とせず、file://でも再生できる。
公開VbFx API、戦闘の呼び出し元、命中コールバックは従来どおり。

```sh
node tools/vfx_export.js
```

出力は `tools/vfx_export/vfx_defs.json`、ルートは `{"schemaVersion":2,"shapes":{…},"effects":[…]}`。
定義JSはコメントと一度の `VbFxDefs.register(<JSONリテラル>);` に限る。
書き出し器は定義JSを実行せず引数をJSONとして読み、構文、未知キー、有限数、色、配列、範囲、曲線、パス、参照を検証する。
JSON往復と再登録の値・キーが同じことも検証する。`programs/when/let/call/assign/return/args/bindings/component/expression/kind` を明示的に拒否する。
JSON上限は **1,000,000 bytes**。以前の400,000 bytesから、配置・材質・曲線を省略せず保存できる上限へ変更した。
画像データ・描画コードをJSONに含めない。`graph.js` は存在しない。

## 共通の座標・時刻

| 設定 | 意味 |
| --- | --- |
| basis | `unit`＝発生元カード幅、`card`＝発生元高さ、`bounds`＝アンカー最大寸法。size倍率を掛ける |
| anchor | `source/target/each-target/path/targets/allies/enemies/board/viewport`。群のアンカーは外接矩形、viewportは全描画面 |
| radiusSpace / orbitSpace | `unit/width/height/diagonal/max/min/reach`。reachは発生元から画面角までの最大距離＋20px |
| scaleBounds | diagonal寸法へsize倍率を掛けるか。falseは元のカード寸法を用いる |
| radiusBounds / orbitBounds / extentBounds | 単位寸法に、アンカーの対角線による寸法を加える固定の係数。咆哮などの画面サイズ対応 |
| offset / offsetSpace | 中心と矩形の移動。`unit/bounds`。shiftX/Yは矩形を保ち中心のみ移す。forwardOffsetは進行方向の移動 |
| time / at | 全尺0〜1の区間と起点 `effect/impact/reveal`。impactは対象ごとの旧到達時刻 |
| clockSpace / clockRate / clockOffset | 全尺または層の寿命の時計、倍率、加算する時刻。ループの連続時間も保持 |
| curveTime / continuous | 曲線の入力を層寿命・全尺・連続経過から選ぶ。原則は層寿命 |
| playbackDelay / playbackDuration | `{maxMs,maxRatio}` の小さい値。holdEndは終了値を保持、endAtEffectEndは残りの尺で終える |
| startExclusive / endExclusive | 区間境界を含むか。旧版の出現・消滅の境界を保持 |
| location / pathProgress | アンカー、source、source→対象の経路上の配置。pathBendと添字の偶奇で湾曲を指定 |
| pathFrom / pathFromOffset / pathFromClamp | 画面上端などの経路始点、単位寸法の移動、画面寸法による移動上限 |
| pathAngle / pathSampleStep | 始点→終点の向き、または直前の経路点からの向き |
| seedOffset / targetSeedStride | 再生seedに加える整数。未指定の既存部品は層・対象・複製ごとのseedを使用 |
| batch / pass | 合成する層の番号と、対象ごとの描画順。同じpass内で各対象の全層を描く |
| alpha / intrinsicAlpha / alphaGain | 濃さ・導入の適用位置・全尺での追加濃さ曲線。最終描画のalphaは0〜1へ収める |
| alphaPlacement | `paint/stops`。描画のalphaへ掛けるか、グラデーションの各stopへ掛けるかを旧版どおり選ぶ |
| palette / tint / tintSteps | 色と入力の対応。14段階のmixHex、または0で段階化しない補間。stepも指定可能 |
| blend / softness / blurPrecision | 通常・加算・screen・multiply、ぼかし幅、CSS blurの桁数 |
| clip | カードの角丸または矩形内に収める。半径・張り出し・offsetへ追従するかを指定 |
| copies / layout | 同じ層の複製、中心・円周・線上の配置、複製の遅延と濃さ。効果側にループ構文は無い |
| afterglow | 前フレームまでの残光。65msの指数減衰、dt上限80ms、現在の画面への加算係数0.46を旧版から保持 |

方向はrad、右+x・下+y。揺れはHz、カードのhueは度。整数の数・添字・seedと真偽値は別に検証する。
`bind` は `value/shield/toxin/weakness/guts/revive` から数値曲線へ対応する固定の表。
数値のset/add/multiplyに限り、素材・部品・他層・変数を参照できない。状態の濃さ・重ね数・相互作用に使う。

## 曲線・乱数・変調

曲線は `keys:[[時刻,値],…]`。時刻は狭義昇順、2〜128点。
補間は `linear/smooth/step/ease-out/power-in/power-out/sine-in/sine-out`。
power補間にはexponent、segmentsには区間ごとの補間を指定する。clampは出力範囲。
通常の横軸は0〜1だが、遅延したeaseが全尺末尾でも途中となる場合は終点を1より後に置ける（上限32）。
旧envelopeはattack・releaseの境界を持つ数値曲線、easeは `1-(1-u)^3`、smoothは `u*u*(3-2*u)` で再現する。

範囲乱数と512個のmote属性は旧版のsine-hashを使用する。
`random(i,seed)=fract(sin(i*127.1+seed*311.7)*43758.5453)`。
angle・delay・life・size・velocity・spin・flickerには旧版と同じインデックスを使用し、属性添字は512で周回する。
value noise、3層のfractal noiseも [curves.js](curves.js) と [textures.js](textures.js) に旧版の計算を保持する。

`modulation` はbias・正弦波のamplitude/frequency/phase・添字ごとのphaseStride・ノイズの強さ/scale/offset/seedからなる固定の記録。
時計はlife/effect/continuous/seconds、timeClampは時計を指定範囲に収める。
数値フィールドに最大4個まで適用できる。式文字列、入力変数の評価、任意の処理登録はできない。
Unityでは時間曲線をAnimationCurve/Gradientへ、ちらつき・揺らぎを共通の変調器へ移す。
乱数・noiseは同じsine-hashと補間をC#/HLSLで実装する。Unityの標準乱数やNoiseへ置き換えると生成結果は同じにならない。

## 12部品型とUnity対応

以下は移植設計の対応表。Unity版の実装はこの作業に含めない。

| 部品型 | パラメータの概要・追加した描画方式 | Unityでの対応 |
| --- | --- | --- |
| particles | 放出数・寿命・遅延・速度・抵抗・重力・寸法・回転・材質・配置・揺らぎ・残光。下表の共通分布 | ParticleSystemのMain/Emission/Shape/Velocity/Force/Color/Size/Rotation/Trails、同じ位置計算を行う共通配置器、Billboard/Mesh |
| ring | 円・円弧・カード角丸・superellipse。半径・線幅・noise・画面pxの下限、halo/singleの線 | LineRendererまたは輪郭Mesh。旧4段の発光線と角丸のblurは共有Material/描画pass |
| glow | 名前付き手続き素材の押印・寸法・縦横比・回転・濃さ、放射gradient、残光だけの放出 | SpriteRendererまたはParticleSystem Billboard。共通Texture生成器・放射減衰Material |
| beam | 点列・filament・trail・spiral・branch・radial・sin-wave・grid。線材質・ribbon/taper・noise・尾・火花・格子 | LineRenderer/帯Mesh。共通の点列生成器と幅・色曲線、Noise相当の位置変調 |
| projectile | 端点・offset・湾曲・進行率・頭の図形/素材・回転範囲・尾 | Transform＋Sprite/Mesh＋TrailRenderer。全効果で同じ経路と尾の生成処理 |
| wave | 扇・到達率・厚み・配置数・noise・前縁素材・内部密度 | ParticleSystemの扇配置または帯Mesh。共通の前縁配置器 |
| fog | 低速の霧、膜、orbit-motes。領域寸法・径の分布・回転・粒数・素材・fractal/value noise | ParticleSystem＋透明Billboard。共通の周回配置・サイズ・濃さ変調 |
| shape | SVGまたは頂点・楕円・矩形。図形・倍率・色役割・面のgradient・固定のfacet線 | Sprite/Mesh＋MaterialPropertyBlock。パスの共有Mesh化と同じ頂点・色・線幅 |
| flash | 全領域/カード/正方形の塗り、linear/radial gradient、石目の貼付け、sweep、stopごとの濃さ | Canvas Image/Quad＋共有Material。カードStencilと同じgradient・texture・sweep |
| card | opacity、移動・拡縮、色処理の順序、blurの単位、登場前の姿勢、ディゾルブ、任意のtransition停止・zIndex | Transform/CanvasGroup/SpriteRenderer＋共有色処理Material。終了時に元の値へ復元 |
| shake | x/y振幅・周波数・全尺/秒の時計・連動・alpha・translate/transform | Camera/盤面/カードTransformの一時移動 |
| sprite | 登録画像/アトラス、倍率・余白・コマ・pixel単位の発光・実時間遅延・残り尺 | SpriteRenderer/Texture Sheet Animation。Animated WebPは同じフレーム列へ展開 |

Unityのモジュールの役割は [ParticleSystemの公式資料](https://docs.unity3d.com/6000.0/Documentation/Manual/ParticleSystemModules.html)、
[Noiseの公式資料](https://docs.unity3d.com/6000.0/Documentation/Manual/PartSysNoiseModule.html)、
[LineRendererの公式資料](https://docs.unity3d.com/6000.0/Documentation/Manual/class-LineRenderer.html) に沿う。
具体的な数式・素材生成・合成順を保持する方法は、この定義に対する移植設計である。

### 粒の共通分布

| motion | 固定の配置計算・主なパラメータ |
| --- | --- |
| ballistic | burst/rate、円/円周/矩形/縁/点列/経路の放出、寿命・初速・方向・重力・抵抗 |
| radial-drag | 旧particles。moteの遅延・寿命、指数摩擦、vortex、noise drift、glint・残光 |
| orbit | 円周/ランダム角、径のmote属性分布、角速度、内側への集束、遅延、径の曲線、複数材質 |
| ellipse-motes | 位相を繰り返す楕円分布。径・サイズ・濃さの位相変化、角度・色の分布 |
| edge-motes / rise / corners | カードの周囲・内側を昇る粒・四隅。位相、縁に沿う移動、横揺れ、サイズ・深さの変化 |
| wake / path-motes / stream | 進行軸の後ろ/経路上/端点間の粒。遅延・添字のlag・横揺れ・散開・方向・尾 |
| edge-burst | 矩形の4辺から法線方向へ飛び出す粒。速度、ease、落下、回転、破片と補助光 |
| fan-volume | 扇内部のmote分布。前縁からの距離、角度密度、横noise、size分布、複数材質 |
| arc-grid | 円弧に沿う固定/距離比例の密度、複数行、行ずれ、noise、角度の減衰、材質の行範囲 |
| arc-motes | 円弧前縁から位相とmote属性により剥がれる粒。lag、size、ちらつき |
| line-motes | 点列端点の間の粒。矩形寸法と単位寸法、横方向の散開、粒の回転、補助光 |
| fan-flow | 繰り返す寿命、角度、画面端へのray距離、進行する前縁、乱流、色・寸法・濃さの位相変化 |
| fan-ballistic | 時刻・mote属性による出生、出生時の前縁位置、放射速度、跳ね上がり、回転、寿命の濃さ |
| axial-motes | 進行軸に沿う粒の列、noise横揺れ、軸方向の径・濃さ・色の変化、尾の残光 |

数の丸めはnone/round/ceilで選ぶ。材質は最大8件の固定レコード。
textureまたはshape参照、色、alpha/径/縦横比/回転、位相曲線・palette、行・添字の間隔、補助光の位置を指定する。
行・位相・cadenceは粒の分布と寿命のパラメータであり、任意の実行条件を受け付けない。

分布ごとの寸法・材質の指定は次のとおり。別の分布のキーを入れても同じ意味にはならない。

| 既存パラメータ | 適用先と意味 | Unityでの対応 |
|---|---|---|
| `orbit` / `angleSpeed` | `particles.motion:orbit`の周回半径・角速度。`radius`は周回半径ではない。`orbitSpeed`はこの分布の入力にしない | 共通配置器の周回半径と角速度。径の曲線はAnimationCurve |
| `radial-drag`の`radius` | 放射粒子の到達範囲。粒径は旧50種と同じseed付き分布と発生元の基準幅（job.unit）で決まり、radiusを縮めても粒径は縮まらない。層のsize/sizeRangeをこの分布の粒径指定に使わない | seed付きStart SizeとSize over Lifetimeを固定し、放射の到達距離を別に設定 |
| `ballistic`の`sizeRange` / `radius` / `speed` | 粒径の分布・放出位置の半径・速度を別々に指定する。小さな領域へ収める場合は粒径も明示する。寿命/放出時刻はlifeMs/delayMs | Particle SystemのStart Size、Shape半径、Start Speed、Start Lifetimeと共通配置器の放出時刻 |
| `materials` / 材質の`radius`・`radiusVelocity` | `line-motes`では材質配列を必ず指定する。半径は基準値＋`radiusVelocity`×seedで固定した粒のvelocity。寿命による径の変化は`radiusCurve`で指定する。層の`texture`・`size`だけでは粒を描かない | Particle SystemのRendererの材質・共通配置器のseed付き初期サイズ分布・Size over Lifetime |
| `spreadDistance` | `line-motes`の点列から横へ散る距離。カード幅単位。未指定の値は1なので細い尾では小さい値を明示する | Shapeまたは共通配置器の横幅 |
| `beam.taper` | 汎用点列beamの始点0〜終点1に対する幅倍率の曲線。先細りにはこの曲線を指定する。`strokeProfile`は対応する線のgeometry向けで、汎用点列の幅曲線の代わりにはならない | LineRenderer.widthCurve、帯Meshの各点の幅倍率 |
| `fog.extent` / `offset` / `flow` / `aspect` | `cloud`の領域半径・領域中心・循環移動の速度・素材の縦横比。`flow`は定義尺の秒当たりのカード幅単位。細長い領域を流れる煙や炎にも使う | Particle SystemのBox Shape、共通配置器の循環移動、Billboardの縦横比 |
| `beam.geometry:filament` / `strokeProfile:ribbon` / `filamentClockRate` | 点列の両端を結ぶ揺れる線を、幅と輪郭が変わる帯として描く。時計倍率で揺れの速度を指定する。通常の点列beamの`taper`とは別の輪郭パラメータ | 共通のnoiseによるLineRendererの点配置、幅が変わる帯Meshと透明マテリアル |

第2段の目視修正はこれらの既存パラメータだけを使い、共通部品・既存50種の定義や描画式は変更しない。

### 共有合成

compositesは最大64件、batch番号は一意。参照先の層が必要。
`radial` は旧softLayerの中心・外周・扇端の減衰、`blur` は旧blurLayerの画面全体のぼかし、`plain` はそのまま合成する。
半径・blur・blend・同じ層の重ね数/濃さを指定する。合成の入れ子、部品呼び出し、実行グラフは無い。
shader/RenderTexture/CommandBufferへ移す時も、各batchの順序と通常/加算の合成を保持する。

### 図形と素材

元の15図形に、6頂点の多面片、長短の氷片、顎と歯を含まない顔、金属の矢じり、金の三角片、5頂点の破片を加えた22図形。
SVGの `M/L/H/V/C/Q/Z`、vertices、ellipse、rectとその画面pxの補正、塗り・線の色/alpha、linear/radial gradient、固定のfacet線を許す。
図形内に他部品や関数の参照を置かない。

手続き素材は `glow/smoke/plasma/plasma-soft/stone/ring/magic-circle/skull` の8種類。
旧版と同じtexture生成器を共有し、type・色・variantでキャッシュする。
magic-circleとskullも旧版の生成手順を共通生成器へ移した。効果ごとの描画コードにはしない。
既存の `appearance-atlas → assets/vfx/appearance_sheet.webp`、`impact-all → assets/vfx/K009.webp` を資源表から解決する。
画像URL・Canvas命令・CSSの文字列を効果定義へ書かない。

## API・状態の契約

`play/rect/cardGeometry/duration/impactMs/stop/retarget/prepareClone/stopAll/effects/settings/activeCount/snapshot/assetBase` を保持する。
効果名・表示ラベルの両方で呼べる。impactのatMs/cueMs、targetMs、distance曲線の逆引き、addPlaybackMsを保持する。
状態は初周期でPromiseを解決し、stopまで続く。値での重ね描き・濃さ・追従・非表示・参照の付け替え・keepLoops・stackable・underStatusを保持する。
結界の同じ層は最大6重ね、2層目以降0.18。毒と弱体の入力は同じカードの状態から読む。
戦闘終了後に状態を残す判断は従来のbattle_fx.jsが行う。描画データから戦闘の判定を変更しない。
利用者の指定と日付付きコメントは効果の近くに保持する。

## 検証と完了判定

```sh
node tools/vfx_export.js
node tools/balance_sim/vfx_data_regression.js
node tools/balance_sim/lab_vfx_regression.js
node tools/balance_sim/battle_state_vfx_regression.js
node tools/vfx_capture/check.js
node tools/vfx_capture/trace_compare.js --out /tmp/vfx-trace
node tools/vfx_capture/trace_compare.js --names poison-state,weaken-state --companions poison-state,weaken-state --value 15 --cycles 3 --seed 91 --dir -1 --out /tmp/vfx-mixed-trace
python3 tools/vfx_capture/compare.py <旧撮影フォルダ> <新撮影フォルダ> <比較フォルダ>
```

trace_compareは5d9e1d2の旧コードと、同じ配置・時刻・seed・speed・dir・valueでCanvasの描画命令を比較する補助検査。
生成画像のSHA256、色、点列、変形、線幅、合成、maskと仮DOMへ適用するカード・盤面のstyle値を比較し、trace.csv/trace.jsonを出す。
styleはopacity・filter・transform・translate・scale・transition・z-index。transformは同じ6要素の行列へ変換する。
companionsは同じカードへ重ねる状態、cyclesはループの比較期間（1〜8周期）。seed・dir・値の変更も同じ条件で旧版へ渡す。
透明で画素を作らない命令を除き、数値は1e-7で丸め、差1e-6までの浮動小数点比較を行う。
**実際のCanvasの画素、CSSの見え方、画像再生、目視の一致はこの検査では証明しない。**

compare.pyは撮影条件・時刻・配置を突き合わせ、PNGの時刻ヘッダを除いたRGBを比較する。
コマ別frames.csv、効果別effects.csv、metrics.mdと前後比較画像を出す。
指標はMAE/RMSE（0〜255）、最大チャンネル差、32×32pxの最大局所MAE、差のある画素比、8×8pxの輝度SSIM。
数値の基準は **全コマでMAE ≤ 0.25、最大局所MAE ≤ 1.0、SSIM ≥ 0.9999**。
数値合格はNUMERIC_OK、目視はUNREVIEWEDのまま出力し、STATUSを自動的にVISUAL_OKへ変えない。
全コマ・全RGB一致の場合だけ`RGB_EXACT`、1チャンネルでも差があれば`PIXEL_DIFF`も別列へ出す。数値の目安以下でも画素不変とは判定しない。
全50比較画像を自分で見て数値も確認してから、REVIEWとSTATUSへ判定を書く。
最新の撮影が無い場合は未測定・未確認としてCONTINUEを維持する。

## 第2段：WebPを参考にした32定義

`defs/webp_geometry.js`、`defs/webp.js`を第1段の定義の後、renderer.jsの前に読む。
第1段50効果・22図形の定義は変更しない。全体は82効果・33図形・12部品型。
追加したのは汎用の図形データ・数値パラメータと既存部品の組合せで、部品型・式評価・効果名分岐は増やしていない。

| 追加項目 | 意味・許可値 | Unityでの対応 |
|---|---|---|
| 効果の`sourceCode` | 任意の出自メタデータ。C/E/S/Kの3桁番号と枝番、hit、appearance_sheet、board_change1/2のみ。描画方式の分岐に使わない | ScriptableObjectの元素材ID。JSON取り込み・参考画像・一覧の対応に利用 |
| `playback.baseSize` | 任意の基準倍率、0.01〜32。APIのsize未指定時だけ使う。旧定義では未指定なので従来のsettings.sizeを保つ | Transformの基準スケール／Particle Systemの座標単位 |
| 汎用図形`heart`・`coin` | SVGパス・楕円・面・グラデーションだけの形状データ。shape/particlesの既存geometry欄から使う | ベクターパスをMeshへ変換し、既存のマテリアルとグラデーションで描く |
| 汎用図形`orb` | 中央から縁への色・濃さを持つ楕円。光球・泡・円周上の光に使用 | 楕円Mesh/Billboardと共有の放射Gradient Material |
| 汎用図形`cloud-bank` | 大小43個の楕円と放射Gradientからなる雲の膨らみ。各房の左上の明部から縁の陰部へ濃さを変える。色・陰影・倍率・縦横比を効果側から指定 | 同じ楕円群をMeshへ変換し、各面に共有Gradient Materialを適用 |
| 汎用図形`billow-cloud` | 固定SVGの61房からなる煙塊。各房に細かな起伏と、明部から柔らかく薄れる陰影を持たせる。色・配置・倍率・濃さは既存shapeのパラメータ | 固定パスをMesh群へ変換し、共有の放射Gradient Materialを適用。Transform/AnimationCurveで同じ配置・拡縮・回転・フェードを再生 |
| 汎用図形`ruffled-ring` | ほつれた外周と逆向きの内周を持つSVGの環。中心を塗らず、環自身に厚みと陰影を持つ | 非ゼロ塗りの穴を保持してパスをMesh化。半径・回転はTransform/AnimationCurve |
| 汎用図形`fractured-ring` | 長さの異なる角張った先端・裂けと、逆向きの内周を持つ星形の帯。固定のSVG点列のみ | 穴を保持したMeshと共通の色材質。欠け・先端の位置も固定頂点で移植 |
| 汎用図形`flare` | 八方向の星形と放射Gradient。衝突・光の核・小さな火花に使用 | 同じ頂点のMeshと共有Gradient Material |
| 汎用図形`rune-wheel` | 多重円、中央で交差する三角・星形、周囲の短い線記号、内部にも記号を持つ3印章のSVG集合。文字フォントや効果名の分岐に依存しない | 同じパスの線Mesh/LineRenderer群。記号も固定の頂点で移植 |
| 汎用図形`crack-rays` | 不揃いな11放射・33枝のひびの固定点列 | 共有の線Mesh/LineRenderer。色・倍率・濃さはデータから適用 |
| 汎用図形`flame-tongue` | 分岐・巻き込みを持つ炎の外形、熱い内側と陰のSVG・Linear Gradient。複製と配置は既存のcopies/layout/spreadで指定 | パスのMesh化＋共有Gradient Material。共通配置器が複製と軸上の配置を担当 |
| `shape.scaleX` / `shape.scaleY` | 図形のローカル軸ごとの追加倍率。有限数0.001〜32、未指定は1。既存の数値曲線・入力binding・変調にも対応。`radius × aspect[軸] × scale[軸]`で拡縮した後にrotationを適用する。位置・尺・合図には作用しない | MeshのローカルTransform.localScaleのX/YへAnimationCurveを適用。既存の半径・縦横比と積にし、親の追従Transformや通知時刻から独立させる |

2026-10-12の最終拡大指摘への修正では7図形を追加した。続くvfxcap_y/r1ではそのうち5図形の固定座標・陰影を調整し、fractured-ringと汎用の軸別倍率2欄を追加した。部品型・式評価・効果名分岐は増やしていない。軸別倍率を指定しない旧50種には従来のaspectをそのまま渡し、追加の描画変換を行わない。
核は小径のglow.stops/shape、塊は通常合成のshape、環は穴のあるshapeで描く。カード全体を覆う薄い加算面で存在感を代用しない。
半径・濃さ・回転・複製・固定点列の曲線は既存の数値欄を使用し、実行時に形状の式や生成処理を定義側へ持たせない。

2026-10-13のrun 9再適用ではbillow-cloudを追加して接触の煙へ使う。従来の全図形・部品型・パラメータ・共通レンダラー・許可リストは変更しない。盾の短い放射線と着弾の横光条は既存beam.points/strokes/taper、魔法陣とひびの線幅は既存shape.strokeの数値曲線で指定する。

2026-10-13のr5/r1では、既存billow-cloudを奪う・毒牙・毒被弾にも使い、硬い楕円の房を柔らかな煙へ替える。結界の光条と小片は既存beam.points/strokesの単位座標だけで配置する。復活の開始光点は既存glow.stops/aspect/offset/time/curves、着弾の収束は既存glow.radiusの数値曲線、魔法陣の線幅は既存shape.strokeで指定する。Unityでは同じ固定Mesh・LineRenderer・Gradient MaterialとTransform/AnimationCurve、各層の開始/終了時刻へ移せる。新部品型・新パラメータ・共通描画の分岐は追加しない。

2026-10-13のr5/r2では、毒牙・毒被弾・奪うの煙の中央に、既存glow.stopsを通常合成で3枚重ねる。glowは発光だけでなく、中心が濃く外縁が透ける局所の色の塊にも使える。copies=3・layout=line・spread・aspect・offsetで小径の房を重ね、外側のbillow-cloudの不揃いな輪郭を保つ。radius/alphaの数値曲線は既存の煙と同じ出入りの時刻を使い、全カードを覆う一様な面を増やさない。Unityでは透明な放射Gradient MaterialのQuadを3枚、同じTransform/AnimationCurveと通常のalpha合成で配置する。ハートの配置と炎の陰影色は既存shape.offset/color/light/shadow、魔法陣の線幅は既存shape.strokeを使う。新部品型・新パラメータ・新図形・レンダラーの変更は無い。

2026-10-13のr5/r3では、炎の外側のalphaを抑え、同じflame-tongueをaspect=[1.32,0.40]・小径・暖色の明部で重ねる。分岐する細い内側へ光量を集め、広い煙と区別する。接触煙の中央はglow.stops・通常合成の小径3房で埋める。両方とも既存の固定Mesh/Gradient Material、共通配置器とTransform/AnimationCurveに対応し、新部品型・新パラメータ・新図形・レンダラー分岐を追加しない。演出全尺と命中・合図・追従の時計は維持する。

新しい定義のmsはLAB標準速度1.5で従来の基準尺になる値。実ゲームでは従来の入口が持つ尺を渡す。
特にS004は70+260+260msの浮上とフェード、除去猶予80msの合計670ms、K024は900msのうち200msで効果へ進む合図、K019は1750+1750ms。
S001・K020・K009の主経路は既存のbattle-summon・revive-summon・all-crossを保つ。新しい同番号の定義は旧登録と参考LAB用。

### 共通再生APIの追加オプション

これらはゲーム／LABが共通レンダラーへ渡す配置・時計の入力。JSONに命令や効果固有のコードを入れない。

| オプション | 意味 | Unityでの対応 |
|---|---|---|
| `durationMs` | 0超〜30000msの有限数。speedによる自動尺の代わりに実際の再生尺を渡す。合図の比率もこの尺へ写す | Playableの再生時間・正規化されたAnimationCurveの時計 |
| `repeat` | trueなら一周の時間曲線を停止まで繰り返す。Promiseは一周で解決し、stopで終了。旧loopの連続時間は変更しない | Particle System／Playableのループ、開始した一周の完了通知と停止を分離 |
| `followGeometry` | source要素の中心・回転・縦横別の拡大を毎フレーム追う。飛翔体、薙ぎ払い、拡大波、浮上、着地の入れ物に適用 | 親Transformまたは外部の追従Transform。描画部品の実装は全効果で共通 |
| `followOpacity` | followGeometry使用時、sourceと祖先の不透明度を描画へ掛ける。部品のalpha指定にも共通のCanvasアダプターで適用 | 親のフェード値をMaterial／VFX Graphの全体不透明度へ掛ける |
| `impactTimesMs` | 任意の対象数ぶんの0以上の有限数配列。LABで実際の角度・距離から求めた通過時刻を渡す。未指定なら従来の定義のimpactを使う | 対象の配置を受け取る外部Playableの通知時刻。配列を全尺へ正規化 |

`settings.layer`は親要素を返す関数。戦闘は既存の_vfxClipLayerを渡し、数値ラベルより下に置く。
このオプション群を使わない旧50種は、従来の部品・座標・時間曲線で描画する。

### 利用者指定で保持する内部素材

第1段のdirewolf内部にはappearance-atlas、meteor-scroll内部にはimpact-allのspriteがあり、WebPを参照している。
2026-10-12の利用者指定により、この2層は**既存の見た目を守るため残す**。コード化の残作業として扱わない。
新32種はsprite/WebPを使わず、素材ファイル自体は削除していない。

## 第3段：2026-10-12指定の21キャラクター

`defs/characters_1012.js` を `defs/webp.js` の後、`renderer.js` の前へ追加。
既存82種と33図形は保持し、20定義・共有派生1・汎用図形6個を追加した。
JSONは102定義・39図形・12部品型、公開API/LABは103項目。
図形は `soul-wisp/blood-drop/gear-ring/petal-seal/vine-loop/robed-silhouette` の固定SVG・頂点・Gradientだけ。
新しい部品型、実行グラフ、効果名による描画分岐は追加しない。

| 追加フィールド | 意味・範囲 | Unityでの対応 |
|---|---|---|
| effect.variants | 最大16件の `name/label/sourceCode/value`。同じ層への参照と入力値（1〜128）だけ。公開APIへ派生名を追加する。JSONでは層を複製しない | ScriptableObjectのテンプレート参照とパラメータ値 |
| layer.targetSpread | 0〜1の全尺に対する対象間の時差。対象添字を対象数−1で割って開始時刻へ加える | 対象ごとのPlayable開始オフセット |
| layer.cycles | 1〜128の有限脈動。層寿命内の時計を回数ぶん折り返す。未指定は従来の時計 | 定めた回数のAnimationCurve/Playable反復 |
| layer.colorFrom:anchor | APIが矩形へ渡す `color:#RRGGBB` を使用。ゲームの色名の判定はレンダラーの外に置く | Actor入力のMaterialPropertyBlock色 |
| card.echo / artOnly | 元カードの残像、または絵だけの残像。元DOM・数値を変更せず、終了時に複製を除去 | ActorのSpriteRenderer複製とTransform/CanvasGroup |
| card.lumaMask / lumaGain / lumaExponent | 黒い背景を持つ絵の輝度を透明度へ写す。RGBの係数は0.2126/0.7152/0.0722、ゲイン・指数は0.01〜4。色は層のcolor。ブラウザではSVGのfeColorMatrix/feComponentTransferで処理し、素材の編集・Canvasの画素読出しはしない | 同じsRGB輝度とalphaのgamma処理を持つ共有Material |
| card.dissolveFit:stretch | 2026-10-12指定・撮影第3回。溶解マスクのSVGを縦長カードの全面へ伸ばす。未指定は既存の縦横比を維持する。開始時の上下の切落しを防ぐ | Quad全体のUVへマスクを割り当てる |

ファントム／エイドロンは一つの共有層を使い、valueだけを替える。
既存82種では上のフィールドを指定しないため、従来の曲線・配置・描画を保つ。

2026-10-12指定・撮影第2回：個数をそのまま渡すcopies / cyclesの入力曲線はlinearを使う。
`[[1,1],[128,128]]`をsmoothにすると中間の整数が同じ数にならず、丸めで個数が失われる。
時間方向の出入り・形の変化のsmooth曲線とは分ける。
オーバーロードの背景無しの人型残像はrobed-silhouetteの共有shape描画と数値曲線で表し、
背景付きJPEGの輝度マスクはこの効果の定義では使わない。Unityでは同じSVGから作るMeshとGradient Materialへ移せる。

再生APIへ `cueTimesMs`（最大128件、0以上の有限数）と `onCue(index)` を追加。
実際のフレームの時計が時刻へ到達した時、各添字を一回だけ通知する。
`pulseTimes(name,count)` は、脈動する対象層の開始・終了とalpha曲線から合図の比率を返す。
定義JSONへコールバックや命令を保存しない。UnityではPlayable通知に対応する。
対象・反復数はコアの実体イベントから渡し、演出側で対象抽選や効果量を計算し直さない。

配布JSONは空白を省いて1MB上限を保持する。定義JSは読みやすいJSONリテラルのまま。
撮影と既存82種の画素比較・拡大目視は別途必要で、Nodeの描画命令一致だけではVISUAL_OKにしない。
