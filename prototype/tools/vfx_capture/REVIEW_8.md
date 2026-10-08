# VFX第1段・撮影第1回の確認 8（2026-10-09）

**STATUS: VISUAL_OK。全50効果で目視上の差を識別できず、全400コマが画素指標の目安を満たした。**

基準はmainの `5d9e1d2`、変更後はvfx-dataの `2718796`。利用者が撮影した `vfxcap_c/cmp_1/` の全50枚を自分の目で比較した。8時刻を通して形・色・模様・配置・動き・濃さ・大きさ・尾・出現と消失のタイミングを照合した。画素差がある6効果は、差のある全20コマを元画像から切り出し、原寸でも前後を並べて確認した。デュラハン・エレメンタル・復活による召喚・結界消失では、最大差の位置・最大局所差の領域・VFXの領域も追加照合した。

44効果・380コマは画素完全一致。残る6効果・20コマには下表の画素差があるが、原寸で並べても見分けられる差は見つからなかった。描画コードの追加修正は不要と判定した。この回の更新は `REVIEW_8.md`、画素の2つのCSV、`CHECKS_8.csv`、`STATUS.txt` の5ファイル。撮影後の定義・レンダラーは変更していない。

## 撮影条件と数値

- 旧版: `http://127.0.0.1:5510/tools/vfx_preview.html`。変更後: `http://127.0.0.1:5520/tools/vfx_preview.html`。
- seed=53、speed=1.5、value=1、dir=1、各効果8コマ（全尺の0/8〜7/8）。各コマ1378×775px。時刻ラベル24pxは指標から除外。
- `capture.json` の効果・発生元・対象・尺・到達時刻・撮影時刻の一致をcompare.pyで検証した。
- 元の `base/`・`new/` からcompare.pyを再実行した。50行のeffects.csvと400行のframes.csvは、提供されたcmp_1の値と全項目一致した。
- 目安: 全コマで **RGB MAE ≤ 0.25、32×32px最大局所MAE ≤ 1.0、輝度SSIM ≥ 0.9999**。RGBは0〜255。SSIMは8×8pxの非重複窓を画素数で加重する。
- 実測最悪値: **MAE 0.010945268973266538、最大局所MAE 0.7568359374999999、最小SSIM 0.9999678090608254**。すべてデュラハンの0ms。最大RMSEは0.21845427814975563。

全桁の効果別値と目視判定は [PIXEL_8_EFFECTS.csv](PIXEL_8_EFFECTS.csv)、コマ別値は [PIXEL_8_FRAMES.csv](PIXEL_8_FRAMES.csv)。compare.py自身が出す目視欄はUNREVIEWEDのままで、これらのCSVには今回の目視判定を手動で追記した。

入力フォルダは `/private/tmp/claude-501/-Users-yuki--------Argante------Vesselbound/eecb536a-6c05-4b0b-9075-f79f9c8d7cf1/scratchpad/vfxcap_c/`。入力画像・入力CSV・提供ログは変更していない。

## 効果ごとの判定

各行は8コマすべての判定。数値は各効果の最悪値、目視欄は全時刻を照合した結果。

| 効果 | 最大MAE | 最大局所MAE | 最小SSIM | 最大RMSE | 最大チャンネル差 | 目視・数値 | 確認した表現 |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| アビス・バロン A・渦（abyss） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 渦の輪・霧・周回粒・色と薄まりが同じ |
| 全体攻撃 C・交差斬撃（all-cross） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 交差する帯の形・角度・火花・到達時の光が同じ |
| 全体攻撃 B・衝撃リング（all-ring） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 3重の輪・広がり・霧・周回粒・対象の光が同じ |
| 全体攻撃 D・咆哮（all-roar） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 咆哮の輪・遅延・広がり・粒・揺れ・余韻が同じ |
| 全体攻撃 A・横一閃（all-sweep） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 横一閃の帯・細線・粒・各対象の光と出現時刻が同じ |
| ATK減少（atk-down） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 青い光・縮む輪と粒・カードの色と拡縮が同じ |
| バンダースナッチ（bandersnatch） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 消えるカード・霧・出現後の粒とタイミングが同じ |
| バンシー（banshee） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 人魂の頭・尾の形と長さ・剥がれる粒・到達光が同じ |
| アビス・バロン B・赤い縁（baron） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 赤い縁・霧・輪・周回粒と薄まりが同じ |
| 戦闘中の召喚（battle-summon） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 魔法陣・光・カードの透明度と拡縮・登場時刻が同じ |
| ボーンチャリオット（bone-chariot） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 顔の配置と回転・魔法陣・霧・補助光が同じ |
| カーバンクル（carbuncle） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 結晶片の面・数・配置・回転・光が同じ |
| コカトリス（cockatrice） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 石目・ひび・灰色になるカード・粒と薄まりが同じ |
| 援護射撃（cover-fire） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 矢じり・帯状の尾・火花・飛行経路と到達時刻が同じ |
| サイクロプス（全体攻撃を得る）（cyclops） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 集束・放射する光・後半に残る熱い縁・粒が同じ |
| 闇の炎（dark-fire） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 扇の煙と火・前縁・画面端への流れ・残光が同じ |
| 魔族の魂（demon-soul） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 中心光・らせん・粒・初期半径・到達光が同じ |
| ダイアウルフ（direwolf） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 小さい咆哮・揺れ・ウルフの登場と横移動・着地光が同じ |
| ドラゴネット（dragonnet） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | カードの消失と出現・霧・粒・透明度のタイミングが同じ |
| デュラハン（dullahan） | 0.010945 | 0.756836 | 0.9999678091 | 0.218454 | 34 | VISUAL_OK / 8/8 NUMERIC_OK | 顔と骨の配置・回転・霊体の尾・到達光が同じ |
| エレメンタル（elemental） | 0.004679 | 0.048503 | 0.9999944728 | 0.075730 | 34 | VISUAL_OK / 8/8 NUMERIC_OK | 8色の光と雲・輪の各色・粒・ちらつきと残光が同じ |
| フロスト・スプライト（frost-sprite） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 氷片の面・角度・回転・光・飛行中の粒が同じ |
| 大盾（great-shield） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 小さい膜・六角格子・輪・接触位置と薄まりが同じ |
| 根性状態（guts-state） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 赤橙の縁のちらつき・淡いオーラ・四隅の光が同じ |
| インプ（imp） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 対象から戻る粒・接続線・発生元の光とタイミングが同じ |
| ジャッカロープ（jackalope） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 緑の光の線・接続先・魔法陣・粒・到達光が同じ |
| レプラコーン（leprechaun） | 0.001232 | 0.175130 | 0.9999993402 | 0.035121 | 2 | VISUAL_OK / 8/8 NUMERIC_OK | 全体の金色の光・魔法陣・粒・瞬きと薄まりが同じ |
| リッチ（lich） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 人魂の頭・尾の形と長さ・粒・経路と固有の色が同じ |
| メリュジーヌ（melusine） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 群を包む霧・内部の粒・到達光と広がりが同じ |
| 隕石の巻物（meteor-scroll） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 落下する火球・尾・残光・閃光・画像のコマと時刻が同じ |
| ナイトメア（nightmare） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 周囲の霧・光・輪・周回粒・色と薄まりが同じ |
| ペガサス（pegasus） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 光だまり・魔法陣・輪・周囲の粒と薄まりが同じ |
| ピクシー（pixie） | 0.001204 | 0.179036 | 0.9999997007 | 0.034742 | 2 | VISUAL_OK / 8/8 NUMERIC_OK | 捕縛の線と輪・移動と戻り・対象の位置への追従が同じ |
| 毒状態（poison-state） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 下からの緑の霧・泡・カードの濁り・表示位置が同じ |
| 怨念（resentment） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 人魂の頭・尾・粒・経路・固有の色と濃さが同じ |
| 復活獲得（revive-gain） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 青白い枠・カード内の魂の粒・終了時の薄まりが同じ |
| 復活状態（revive-state） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 青白い縁・カード内を昇る魂の灯と薄まりが同じ |
| 復活による召喚（revive-summon） | 0.004702 | 0.048503 | 0.9999944395 | 0.075880 | 34 | VISUAL_OK / 8/8 NUMERIC_OK | 巻き付く魂・縁と粒・透明度と拡縮・登場時刻が同じ |
| 結界消失（shield-break） | 0.004723 | 0.048503 | 0.9999944408 | 0.076020 | 34 | VISUAL_OK / 8/8 NUMERIC_OK | 金の膜・ひび・閃光・飛び散る三角片・余韻が同じ |
| 結界獲得（shield-gain） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 閉じる金の枠・膜・光帯と反射・呼吸と薄まりが同じ |
| 結界状態（shield-state） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 金の膜・斜めの光帯・反射・呼吸と表示位置が同じ |
| 衝撃波（shockwave） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 扇の前縁・内部の粒・画面端への到達と薄まりが同じ |
| タイタン（地震で敵全体を弱体化）（titan） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 踏み鳴らし・土煙・岩くず・揺れ・到達時の色変化が同じ |
| ヴリコラカス（vrykolakas） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 不死の霧・魔法陣・輪・周囲の粒が同じ |
| 弱体状態（weaken-state） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 上からの紫の膜・沈む粒・カードの濁りが同じ |
| 弱体化（weaken） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 震え・拡縮・色あせ・吸い込まれる霧と粒が同じ |
| ウェンディゴ（wendigo） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 扇の氷片・針・光・前縁・霧と残光が同じ |
| ワーム（worm） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 扇の煙・前縁・内部の粒・ぼかしと薄まりが同じ |
| レイス（味方の負傷効果を発動）（wraith） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 影の針・到達時の霧と粒・カードの色変化が同じ |
| ワイバーン（wyvern） | 0.000000 | 0.000000 | 1.0000000000 | 0.000000 | 0 | VISUAL_OK / 8/8 NUMERIC_OK | 風の頭・流れる尾・火花・飛行経路が同じ |

画素差があるコマ: デュラハンは0、エレメンタルは3、復活による召喚は7、結界消失は5。レプラコーンとピクシーは0〜7。後2件は発生元カードの絵・枠付近（x=652〜725、y=452〜575）に最大2階調の差。前4件の最大チャンネル差34は共通のカード角の1画素（x=652、y=211）で発生し、背景にも微小な差が散在する。デュラハンの最大局所差は後列カードの数値の丸い枠付近。これらの領域も原寸で照合し、前後を見分けられる違いは認めなかった。座標はラベルを除いたコマ左上を原点とする。

## 共通部品とUnity対応

宣言データは50効果・653層・22共有図形。12部品型のうち、現行効果は10部品型を使う。許可フィールドの完全な一覧は [schema.js](../../js/vfx/schema.js)、単位・配置・時計・Unity移植設計は [SCHEMA.md](../../js/vfx/SCHEMA.md)。

| 部品型 | 層数 | パラメータ概要 | Unityでの対応 |
| --- | ---: | --- | --- |
| particles | 150 | 放出数・配置・寿命・遅延・範囲乱数・速度・抵抗・重力・noise・材質・粒の尾と残光 | ParticleSystem各モジュール＋共通配置器、Billboard/Mesh |
| ring | 112 | 円/円弧・角丸・superellipse、径・線幅・noise・4段の発光線・px下限 | LineRenderer/輪郭Mesh＋共有Materialの描画pass |
| glow | 171 | 手続き素材名・variant・寸法・回転・縦横比・放射gradient・濃さ・残光 | SpriteRenderer/Particle Billboard＋共通Texture生成器 |
| beam | 97 | 点列・帯・尾・らせん・枝・放射・格子・正弦波・noise・gradient・火花 | LineRenderer/帯Mesh＋共通点列生成器 |
| projectile | 0 | 端点・offset・湾曲・進行率・頭・尾・回転分布 | Transform＋Sprite/Mesh＋TrailRenderer |
| wave | 0 | 扇・到達率・厚み・配置数・前縁素材・内部密度・noise | ParticleSystemの扇配置/帯Mesh＋共通前縁配置器 |
| fog | 25 | 霧・膜・周回粒、領域・径の分布・回転・数・素材・noise | 透明Billboard/ParticleSystem＋共通周回配置器 |
| shape | 2 | SVG/頂点/楕円/矩形、色役割・面のgradient・facet線・画面px補正 | 共有Mesh/Sprite＋MaterialPropertyBlock |
| flash | 13 | 全画面/カード/四角/円、linear/radial gradient・stopのalpha・石目・sweep | Canvas Image/Quad＋共有Material/Stencil |
| card | 44 | opacity・移動・拡縮・filter順・blur単位・登場前の姿勢・transition・zIndex | Transform/CanvasGroup/SpriteRenderer＋共有色処理Material |
| shake | 37 | 振幅・周波数・秒/全尺の時計・連動・濃さ・適用先 | Camera/盤面/カードTransformの一時移動 |
| sprite | 2 | 登録資源・atlas・倍率・余白・コマ・px発光・実時間遅延・残り尺 | SpriteRenderer/Texture Sheet Animation |

旧版を再現するために前回実装で豊かにした共通部品・パラメータ:

- 粒の放射・円周・軌道・らせん・経路沿い・矩形内・格子・辺・四隅・扇などの分布、18の共通運動方式、材質の添字/行/位相、寿命と遅延の分布。
- 旧sine-hashとseed添字、512個のmote属性、value/fractal noise、正弦波の周波数・位相・振幅・hash変調。
- 旧envelope/ease/smoothと同じ曲線補間。power・sine・区間ごとの補間・出力clamp、14段の色補間。
- 旧stampのglow/smoke/plasma/plasma-soft/stone/ringにmagic-circle/skullを加えた8素材。同じ生成手順・色・variantのキャッシュ。
- 頂点/楕円/矩形、面のgradient、facet線、7共有図形の追加。元の15図形・既存素材は保持。
- 固定の合成batch、対象ごとのpass、radial/blur/plain、扇端の減衰、同じ層の重ねと濃さ。
- 単位寸法・カード寸法・画面到達距離、経路、時計、境界、残り尺、gradient stopへのalpha。カードの登場前の姿勢・transition停止・zIndex。

Unity移植では標準乱数や標準Noiseへ単純置換せず、共通C#/HLSLの配置・変調・Texture生成器で旧版と同じ数学、材質、描画順を保持する設計。Unity版の実装・実機検証は今回の範囲外。

## 宣言性・grep・定義の大きさ

定義JSはコメントと単一のJSONリテラル登録。式・構文木・変数・実行条件・繰り返し・部品呼び出し・効果専用の部品型は無い。JSON書き出し器は定義JSを実行せずJSONとして解析し、固定許可リストで未知キー・型・有限数・配列・色・範囲・曲線・図形パス・参照を検証する。JSON往復と再登録も成功した。

- effects.js: **339,236 bytes**、geometry.js: **26,105 bytes**、定義JS合計 **365,341 bytes**。
- 書き出しJSON: **654,971 bytes**。上限 **1,000,000 bytes**。画像・コード・式を格納しない。

実行したrg（grep相当）の結果:

```sh
rg -n '\b(function|return|for|while|if|eval|Function|Math)\b|=>|\b(let|const|var)\s+[A-Za-z_$]' js/vfx/defs/*.js
# 0件（exit 1）
rg -n 'expression|programs|bindings|component|when|assign|graph\.js|AST' js/vfx/defs/*.js tools/vfx_export/vfx_defs.json
# 0件（exit 1）
rg -n '(def|job\.def|d)\.(kind|name|label)\s*(===|==|!==|!=)|switch\s*\([^)]*(kind|name|label)|\bkind\b' js/vfx/renderer.js
# 3件: 1251 / 1337 / 1348。APIの同名状態の更新・stop/retargetの識別。
```

描画は `painters[s.type]` から部品へ渡す。効果名/label/kindによる描画分岐は無い。レンダラーの全50効果名の文字列リテラルは0件、kindは0件、graph.jsは存在しない。配置・線形状・素材の列挙値は共通の数学を選ぶためのパラメータ。日付付きの利用者指定コメントは効果定義の近くと共通契約処理に保持されている。

## 検査結果

- 基準5d9e1d2からの変更JS全16本とbalance_sim内のJS全28本、重複を除く **41本のnode --checkが成功**。
- balance_simの実行検査 **全23本が成功**。vfx_data_regression・lab_vfx_regression・battle_state_vfx_regressionを含む。
- online_payload・online_receiversが成功（NG 0）。
- vfx_capture/check.jsとvfx_export.jsが成功。実行検査は計 **27本、すべて終了コード0**。
- git diff --check成功。
- Chromeの検査スクリプトは **未実行**。利用者の撮影した実画素を目視・数値で確認した。

今回の構文・実行検査のファイル別結果は [CHECKS_8.csv](CHECKS_8.csv)。実行検査の一覧:

| 検査 | 終了コード |
| --- | ---: |
| tools/balance_sim/attack_summon_regression.js | 0 |
| tools/balance_sim/battle_carry_order_regression.js | 0 |
| tools/balance_sim/battle_event_regression.js | 0 |
| tools/balance_sim/battle_state_init_regression.js | 0 |
| tools/balance_sim/battle_state_vfx_regression.js | 0 |
| tools/balance_sim/card_core_smoke.js | 0 |
| tools/balance_sim/damage_metrics_regression.js | 0 |
| tools/balance_sim/deep_level_regression.js | 0 |
| tools/balance_sim/defeat_retry_regression.js | 0 |
| tools/balance_sim/effect_audit.js | 0 |
| tools/balance_sim/effect_value_audit.js | 0 |
| tools/balance_sim/id_reference_audit.js | 0 |
| tools/balance_sim/kenzoku_regression.js | 0 |
| tools/balance_sim/lab_vfx_regression.js | 0 |
| tools/balance_sim/offline_online_regression.js | 0 |
| tools/balance_sim/permanent_damage_regression.js | 0 |
| tools/balance_sim/pve_core_resource_parity.js | 0 |
| tools/balance_sim/quest_q001_regression.js | 0 |
| tools/balance_sim/quest_q008_regression.js | 0 |
| tools/balance_sim/run.js | 0 |
| tools/balance_sim/selftest.js | 0 |
| tools/balance_sim/silence_scroll_check.js | 0 |
| tools/balance_sim/vfx_data_regression.js | 0 |
| tools/parity/online_payload.js | 0 |
| tools/parity/online_receivers.js | 0 |
| tools/vfx_capture/check.js | 0 |
| tools/vfx_export.js | 0 |

vfx_data_regressionは尺・命中順/時刻・Promise・決定性・復元、5状態の値1/5/6/10/11/15/16/30・長時間ループ・値更新・追従・非表示・retarget・keepLoops・stackable・underStatusを確認。結界は最大6重ね、追加alpha .18。毒/弱体の1→15の色・粒密度・相互の濁りも確認した。lab_vfx_regressionとbattle_state_vfx_regressionで戦闘側の既存接続も確認した。

前回の描画命令・仮DOMの照合456コマは [TRACE_7.csv](TRACE_7.csv) にある。今回は撮影の画素・目視を主判定とした。値15、複数周期、毒と弱体の同時重ねについての撮影画像は今回の入力に含まれず、当該条件はNode検査と前回の描画命令照合で確認している。

## 再現できなかった表現・保持した境界

今回の全50効果の比較では、再現できなかった表現と、見分けられる見た目の差は検出しなかった。効果専用のコードへ戻した箇所は無い。

公開VbFx API・戦闘の接続・状態ループの仕様を保持した。作業は指定worktreeのprototype内のみ。core.js・戦闘判定・docs/・AGENTS.md・xlsx・local_xlsx_data.jsを変更せず、assets/の削除は無い。ゲーム本体フォルダへ書き込んでいない。コミットは行っていない。

この回に実行JSの変更は無いため、index.htmlとtools/vfx_preview.htmlの?v=は撮影時の値を保持した。前回変更した6実行JSのみvfx-data1009-1へ更新済み。

## 入力と定義の識別

| ファイル | SHA256 |
| --- | --- |
| 入力 effects.csv | 32adc1aa9e2bd02ec0b07abb4db5ad5df9bca97346f9b1d39d1bef94b89b6551 |
| 入力 frames.csv | 39f5e5dc4296c00165a0260349cba43f1e936b4794645f7e7ec2988f79aee156 |
| js/vfx/defs/effects.js | 168611616b66324b88b5663812fc5fcccc6073d6dd355299313c8b91395794e9 |
| js/vfx/defs/geometry.js | 41d729740c7522741141622ff1d73d125875135496f51b804a5771b209d6c890 |
| js/vfx/renderer.js | 6d07a9a7623d17960d8629ad4ea34ba845930d671a6bfeed5d5597ede11605f7 |
| tools/vfx_export/vfx_defs.json | 3bf05519e6628551041c66eda51760fcb90b7560c3386d090d4ac4ac0a6e91a3 |
