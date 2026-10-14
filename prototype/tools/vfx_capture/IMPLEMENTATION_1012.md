# VFX21 制作・検査報告 / 利用者指定 2026-10-12

21キャラ分の演出と63候補のSEを実装。定義データは20定義＋共有派生1、LABの公開項目は既存82＋新21＝103。既存定義・既存assets・戦闘結果を保持し、共通presenter経由で通常PvE・保存再生・オンラインへ接続。**第8回の新21種全168コマと既存82種の前後全656コマを、カード周囲で切り出し、補間なし2倍へ拡大して自分の目で確認した。新21種の固有部分に追加修正は不要。既存82種も演出の形・配置・発光・消失に見た目の変更は認められない。数値目安82/82、RGB完全一致76/82種・649/656コマ。6種7コマの厳密差と、C094の通常開戦後の既存コア抑止経路は未解消。SE63候補・仮コピー21件は揃い、Node全38本・追加検査・変更JS/CJS30本の構文検査は成功。 STATUSはCONTINUE。C094の既存コア制限により、通常戦闘で全21種が発動する完了条件は未達。**

## 21キャラの作りと判断

各尺は LAB 1.5×＝ゲーム等速での固有部分。既存のマナ・毒・弱体・ATK減少・結界などの後続は含めない。ファントム／エイドロンは「数秒残る紋章」の指定に合わせ、余韻込み2.4秒の例外にした。

| 番号 / 効果 | 等速の固有尺 | 作り・曖昧な部分の判断 |
|---|---:|---|
| C004 / satyr | 0.700秒 | 足元の青い魔法陣・薄い楕円の輪から複数の魔力の筋を上へ噴く。カード全体の色面を使わず、青い核で存在感を出す。 |
| C020 / hecatoncheir | 0.600秒 | サテュロスより小径の陣と短い湧き出し。確率に当たった mana_gain だけで始める。 |
| C021 / zombie | 0.750秒 | 青白い魂の頭と細い尾を死亡位置から浮上。カード消失前に開始し、既存マナ獲得の位置も確保する。 |
| C060 / behemoth | 1.100秒 | マナを連想させる青い結晶を白熱させ、白い八方向の閃光と小片へ炸裂。実際にマナが増えた時だけ。 |
| C064 / sylph | 0.650秒 | 命中フックで2本の巻いた渦（polarTurn 10.4rad）と青い魔力を出す。通常攻撃の当たりと同時に始め、その後に既存マナ獲得。 |
| C071 / nymph | 1.000秒 | コアが実際に数えた各色の代表IDから、色付きの細光を集める。colorSources の数だけ光球を生成。 |
| C089 / familiar | 0.800秒 | 血の条件を満たしてマナを得た攻撃だけ、実際の命中対象から赤い滴を吸い上げ、青い魔力へ転換。 |
| C099 / fiend | 0.720秒 | 黒紫の立体的な核と尾を持つ弾。damage 一件＝一発で、回数・対象・順序を保つ（結界で防がれた弾も対象に届く）。 |
| C029 / phantom | 2.400秒 | 半透明の2波を戦場へ広げ、stat_change:summon_buff の対象だけに小さな霊火の紋章。カード幅基準の波は最大1.092秒、紋章の余韻を含め全尺2.4秒。 |
| C034 / eidolon | 2.400秒 | ファントムの共有層を参照する派生設定（value=2）。霊火の半径だけ0.14→0.16カード幅へ少し強める。HP減少や別の効果にはしない。 |
| C082 / arch-demon | 1.400秒 | 実際に強化された紫の体だけを細い紫の線で接続。コアの反復回数だけ脈動し、共有定義の脈動時刻で各回の数値を進める。 |
| C083 / gremlin | 0.900秒 | 煤色の波・歯車粉・小さな黒い煙を敵へ送る。HPの萎縮は使わず、既存ATK減少へ直列に接続。 |
| C095 / lilith | 1.500秒 | 実体イベント数だけ赤紫の花弁紋章を生成し、一つずつ実対象へ飛ばす。同じ味方が重複して選ばれても、各命中と膨張パルスを保つ。 |
| C097 / overlord | 1.400秒 | 背景の無い座ったローブ姿の二重影→後方の1.9倍の巨大な残像→本体への合流。C097の元絵を見て短い頭巾・肩飾り・膝上の手と裾の輪郭、衣の折り目をパスデータへ描いた。元絵の厳密な切抜ではなく輪郭を採用し、ATK/HP個別の見せ方にしない。 |
| C009 / minotaur | 0.650秒 | value=1で赤い怒りの閃光（240ms）→既存結界獲得→value=2で実対象への赤い照準（300ms）→コアの割り込み攻撃。SEは最初の一回。LABのvalue=3では閃光・照準・高速突進を単独再生。 |
| C042 / sleep-sheep | 1.050秒 | 赤い羊毛状の霧の房と小粒へ身体がほどけ、blood_set.gained の滴数へ集約して消える。通常は3滴。縦長カード全面の細かい溶解マスクから局所の血の房へ移す。焼失は重ねない。 |
| C056 / scylla | 0.700秒 | 黄緑の飛沫を実対象全員へ降らせ、既存の毒付与・毒状態へ引き継ぐ。 |
| C066 / undine | 0.800秒 | 灰紫を含む濁った水色の低い霧と沈む輪。黄緑の毒とは色・動きで区別し、既存弱体獲得へ引き継ぐ。 |
| C079 / spriggan | 0.900秒 | 地面から枝・葉・蔓の円環を育て、薄い光の環へ移してから既存結界獲得。対象を再抽選しない。 |
| C084 / incubus | 0.900秒 | コアの victimId の死亡位置で身体を局所の赤い霧の房へほどき、blood_set.gained の滴数で消す。通常は2滴。縦長カード全面の細かい溶解マスクを使う。普通の死亡・非撃破では再生しない。 |
| C094 / chaos-imp | 0.900秒 | retriggerSourceId→retriggerTargetId へ歪んだ紫の稲妻を跳ばし、小径の開戦陣を点火する。その後の開戦効果は元の演出へ渡す。実体の再発火が無ければ出さない。 |

調整定数は `PRESENT_LAB_SPEED=1.5`、`PRESENT_LAB_REACTION_FLASH_MS=240`、`PRESENT_LAB_REACTION_AIM_MS=300`。ゲームのミノタウロスの固有部分は240+300msをそれぞれ速度設定で割り、間に既存の結界獲得を挟む。LAB単独の全編は0.650秒。

## レンダラーの汎用拡張

- 部品型は既存12種のまま。初回にcardのecho / artOnly / lumaMaskとlumaGain / lumaExponentを汎用の残像・輝度マスクとして追加。第2回のオーバーロードは背景付きJPEGが矩形に見えるため、このマスクを使わず、追加図形robed-silhouetteのshape描画で人型影を合流させる。巨大残像倍率1.9、半径1.292→0.68。素材ファイルを編集せず、Canvasの画素読出しも使わない。
- targetSpread は対象間の時差、cycles は同じ層の有限回の脈動。未指定の従来層は元の描画式を使う。リリスの対象間の広がりは全尺の0.49。
- colorFrom:anchor は外部が渡した色を受け取る。カード色→光色は PRESENT_LAB_CARD_COLORS の一箇所。rendererにゲームの色・効果の判定を置かない。
- effect.variants は同じ層への参照と入力値だけ。ファントム／エイドロンの層は同一参照で、JSONに重複定義しない。
- cueTimesMs / onCue は実フレーム時刻の汎用通知。アークデーモンの数値はこの合図へ同期。回数は実体イベント、時刻は共有定義の層から読む。
- 第3回にcard.dissolveFit:stretchを任意指定として追加。溶解マスクのSVGを縦長カード全面へ伸ばし、開始時の上下の切落しを防ぐ。未指定は旧SVGの文字列を保持。羊・インキュバスだけ指定し、マスクの48×48セルと終了後の復元を3速さで検査した。煙の房は既存fog/glow、突進の表示順は既存zIndexを定義から指定する。
- 固有名での描画分岐・描画コード・式・実行グラフ・ES Modulesを定義へ持ち込んでいない。JSONは1MB上限を守り、配布JSONだけ空白を省略。読みやすい定義JSは保持。

## SE63候補

素材名・原音の性質による一次選定。**聴感は未確認**。原本は変更しない。相互・既存候補・採用SEと元素材のファイル名が重複しない63素材。ボイス・囁き・詠唱・叫び等のファイル名を除外。48kHz・16bit PCM、最長1.95秒、頭の無音を詰め、末尾30msフェード、ピーク約-1dBFS。各ファイルの実測peakと切り出し開始は [SE README](../vfx_preview/se/README.md) と manifest / se_catalog に記録。候補1を新規 `assets/sfx/Cxxx.wav` へ同じバイト列で配置し、ADOPTED.md に仮（利用者未選択）として記載。ゲームではそのpeakを発生・命中へ合わせる。

| 効果 | 候補1の元素材 | 候補2の元素材 | 候補3の元素材 |
|---|---|---|---|
| satyr | [SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-01.wav](../vfx_preview/se/README.md#satyr-1) | [SORCERY - DESIGNED - MAGIC WHITE Deflect Spell 01-01.wav](../vfx_preview/se/README.md#satyr-2) | [SORCERY - DESIGNED - MAGIC WATER Deflect Spell-01.wav](../vfx_preview/se/README.md#satyr-3) |
| hecatoncheir | [SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-02.wav](../vfx_preview/se/README.md#hecatoncheir-1) | [SORCERY - DESIGNED - MAGIC ICE Deflect Spell-02.wav](../vfx_preview/se/README.md#hecatoncheir-2) | [SORCERY - DESIGNED - MAGIC ELECTRIC Cast Small-01.wav](../vfx_preview/se/README.md#hecatoncheir-3) |
| zombie | [SORCERY - DESIGNED - MAGIC BLACK Whoosh Small-01.wav](../vfx_preview/se/README.md#zombie-1) | [SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 02-01.wav](../vfx_preview/se/README.md#zombie-2) | [SORCERY - DESIGNED - MAGIC BLACK Deflect Spell-01.wav](../vfx_preview/se/README.md#zombie-3) |
| behemoth | [SORCERY - DESIGNED - MAGIC WHITE Cast Large 02-01.wav](../vfx_preview/se/README.md#behemoth-1) | [SORCERY - DESIGNED - MAGIC ELECTRIC Cast Large-01.wav](../vfx_preview/se/README.md#behemoth-2) | [SORCERY - DESIGNED - MAGIC WHITE Cast Medium 03-01.wav](../vfx_preview/se/README.md#behemoth-3) |
| sylph | [Multimedia Internet CD-Rom Flash Whoosh Short 01.wav](../vfx_preview/se/README.md#sylph-1) | [Production Element Title Transition Whoosh Fly By 02.wav](../vfx_preview/se/README.md#sylph-2) | [SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 02-02.wav](../vfx_preview/se/README.md#sylph-3) |
| nymph | [SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-03.wav](../vfx_preview/se/README.md#nymph-1) | [SORCERY - DESIGNED - MAGIC WHITE Deflect Spell 01-02.wav](../vfx_preview/se/README.md#nymph-2) | [SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 02-03.wav](../vfx_preview/se/README.md#nymph-3) |
| familiar | [MELEE - DESIGNED - BLOOD Squish 01-01.wav](../vfx_preview/se/README.md#familiar-1) | [WATRMisc_Water, Liquid Impact, Bubble, Sci Fi, Hit 04_344 Audio_Elemental Palette Designed Vol 1.wav](../vfx_preview/se/README.md#familiar-2) | [SORCERY - DESIGNED - MAGIC BLACK Cast Small-01.wav](../vfx_preview/se/README.md#familiar-3) |
| fiend | [SORCERY - DESIGNED - MAGIC BLACK Cast Small-02.wav](../vfx_preview/se/README.md#fiend-1) | [SORCERY - DESIGNED - MAGIC BLACK Deflect Spell-02.wav](../vfx_preview/se/README.md#fiend-2) | [SORCERY - DESIGNED - MAGIC BLACK Whoosh Small-02.wav](../vfx_preview/se/README.md#fiend-3) |
| phantom | [SORCERY - DESIGNED - MAGIC BLACK Whoosh Small-04.wav](../vfx_preview/se/README.md#phantom-1) | [SORCERY - DESIGNED - MAGIC BLACK Deflect Spell-03.wav](../vfx_preview/se/README.md#phantom-2) | [SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 02-04.wav](../vfx_preview/se/README.md#phantom-3) |
| eidolon | [SORCERY - DESIGNED - MAGIC BLACK Deflect Spell-04.wav](../vfx_preview/se/README.md#eidolon-1) | [SORCERY - DESIGNED - MAGIC BLACK Cast Small-03.wav](../vfx_preview/se/README.md#eidolon-2) | [SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 03-01.wav](../vfx_preview/se/README.md#eidolon-3) |
| arch-demon | [SORCERY - DESIGNED - MAGIC ELECTRIC Beam-01.wav](../vfx_preview/se/README.md#arch-demon-1) | [SORCERY - DESIGNED - MAGIC BLACK Cast Medium-02.wav](../vfx_preview/se/README.md#arch-demon-2) | [SORCERY - DESIGNED - MAGIC ELECTRIC Cast Large-02.wav](../vfx_preview/se/README.md#arch-demon-3) |
| gremlin | [Industry Metal Clink Gear Fast 06.wav](../vfx_preview/se/README.md#gremlin-1) | [Industry Metal Clink Gear Slow 12.wav](../vfx_preview/se/README.md#gremlin-2) | [GEARBOX - DESIGNED - SMALL - Oscillating Gizmo 01-01.wav](../vfx_preview/se/README.md#gremlin-3) |
| lilith | [SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-04.wav](../vfx_preview/se/README.md#lilith-1) | [SORCERY - DESIGNED - MAGIC WHITE Deflect Spell 02-01.wav](../vfx_preview/se/README.md#lilith-2) | [SORCERY - DESIGNED - MAGIC WHITE Cast Medium 03-02.wav](../vfx_preview/se/README.md#lilith-3) |
| overlord | [SORCERY - DESIGNED - MAGIC BLACK Cast Large Hex Spell-02.wav](../vfx_preview/se/README.md#overlord-1) | [SORCERY - DESIGNED - MAGIC ELECTRIC Cast Large Fury-01.wav](../vfx_preview/se/README.md#overlord-2) | [SORCERY - DESIGNED - MAGIC WHITE Cast Large 02-02.wav](../vfx_preview/se/README.md#overlord-3) |
| minotaur | [Fire Flare Start Up Ignite 01.wav](../vfx_preview/se/README.md#minotaur-1) | [Fire Fireball Large 02.wav](../vfx_preview/se/README.md#minotaur-2) | [Impact Metal Bar Hit Ring 01.wav](../vfx_preview/se/README.md#minotaur-3) |
| sleep-sheep | [MELEE - DESIGNED - BLOOD Squish 01-02.wav](../vfx_preview/se/README.md#sleep-sheep-1) | [Horror Scary Squish Eyeball Crush 08.wav](../vfx_preview/se/README.md#sleep-sheep-2) | [MELEE - DESIGNED - BLOOD Squish 01-03.wav](../vfx_preview/se/README.md#sleep-sheep-3) |
| scylla | [SORCERY - DESIGNED - MAGIC ACID Cast Small-01.wav](../vfx_preview/se/README.md#scylla-1) | [SORCERY - DESIGNED - MAGIC ACID Cast Small-02.wav](../vfx_preview/se/README.md#scylla-2) | [SORCERY - DESIGNED - MAGIC ACID Cast Small-03.wav](../vfx_preview/se/README.md#scylla-3) |
| undine | [SORCERY - DESIGNED - MAGIC WATER Deflect Spell-02.wav](../vfx_preview/se/README.md#undine-1) | [SORCERY - DESIGNED - MAGIC WATER Deflect Spell-03.wav](../vfx_preview/se/README.md#undine-2) | [SORCERY - DESIGNED - MAGIC ICE Deflect Spell-04.wav](../vfx_preview/se/README.md#undine-3) |
| spriggan | [Foley Wood Tree Branches Breaking And Crunching 01.wav](../vfx_preview/se/README.md#spriggan-1) | [Foley Wood Tree Branches Breaking And Crunching 02.wav](../vfx_preview/se/README.md#spriggan-2) | [Foley Wood Creak 03.wav](../vfx_preview/se/README.md#spriggan-3) |
| incubus | [MELEE - DESIGNED - BLOOD Squish 02-01.wav](../vfx_preview/se/README.md#incubus-1) | [MELEE - DESIGNED - BLOOD Squish 02-02.wav](../vfx_preview/se/README.md#incubus-2) | [Horror Scary Flesh Hits Wet Bloody Ground 01.wav](../vfx_preview/se/README.md#incubus-3) |
| chaos-imp | [SORCERY - DESIGNED - MAGIC ELECTRIC Cast Small-02.wav](../vfx_preview/se/README.md#chaos-imp-1) | [SORCERY - DESIGNED - MAGIC ELECTRIC Cast Small-03.wav](../vfx_preview/se/README.md#chaos-imp-2) | [SORCERY - DESIGNED - MAGIC ELECTRIC Deflect Spell-01.wav](../vfx_preview/se/README.md#chaos-imp-3) |

各素材の全文パス・選んだ理由・原音尺・開始位置・出力尺・peakは上のリンク先に各3件ずつ記録。再生成は `python3 tools/vfx_preview/prepare_se_1012.py`（追加21種だけ。既存候補・原音は上書きしない）。

## 検査

- tools/balance_sim全38本：成功。第8回のvfx_1012_regressionは134.07秒、vfx_data_regressionは242.26秒で完走。
- 実体イベントfixtureは通常PvE受け口／保存再生／オンラインで発生元・対象・回数・順序・SEが一致。発光だけの抑止、13不発条件、既存状態への直列接続と接触同期も成功。C094のfixtureは通常開戦前である点を区別する。
- 作業前コア097927f8332c7a55701eaa82aebc7b2177d17016との21ケースは演出用メタデータ以外一致。戦闘結果を変更していない。
- 新VFXの3速さ×16時刻、実個数・脈動・実フレーム通知、突進の命中位置と表示順、縦長の溶解、終了後復元・残像除去、SE63契約：成功。
- 既存82種の定義4ファイル・3速さ×8時刻のCanvas命令と尺は作業前一致。**第8回の全656コマを拡大目視し、6種7差分コマも前後・差分24倍・最大点8倍で確認。演出の形に変更は認められないが、RGB完全一致76/82種・649/656コマ。厳密差は残る。** [全所見](REVIEW_1012.md)。
- SE63候補と仮コピー21件、online_payload／online_receivers、全カード台帳・LAB割当、撮影道具のNode検査、初回からの変更JS/CJS30本のnode --check、git diff --check：成功。[全結果](CHECKS_1012.md)。
- Chromeのlab_vfx_check / present_parity / anim_check / online_pipeline / current_issues_check：未実行。present_parityにはLAB1012の21シナリオを追加済み。`VB_ONLY=LAB1012 node tools/parity/present_parity.js`で節のみ実行可能。

## コアへ付け足した演出用情報

既存のイベント種別だけを使い、抽選・効果・数値・乱数消費は変更していない。ニンフの mana_gain に実際の colorSources、ベヒーモスの mana_set に sourceId と gained、ミノタウロスの結界に sourceId と割り込みattackに reactionSourceId、インキュバスの blood_set に victimId / victimSide、再発火した既存開戦イベントに retriggerSourceId / retriggerTargetId / retriggerKey。これにより対象を再抽選したり、死亡列の最後の体を撃破対象と推測したりしない。

## 残る確認とC094の既存制限

1. 第8回の新21種全168コマはカード周囲切出し・2倍拡大で目視済み。固有部分に追加修正待ち・修正後再撮影待ちはない。後続演出・実戦の高速連続描画は未確認。
2. 旧82種の全コマ前後目視で演出の形に変更は認められない。数値目安82/82、RGB完全一致76/82種・649/656コマ。6種7コマの厳密差は未解消。6コマは同じ黒い端の1画素の大きな差、残る1コマは煙内の最大2階調差。実装が変わらず差が入れ替わるため撮影／DOM側の揺れが疑われるが原因は未確定。画像・RGB判定・閾値を変更しない。
3. SEの聴き比べ・声の混入の聴感確認・利用者の正式選択は未実施。
4. **C094：通常開戦を既に解決した体への再発火が、既存コアで抑止される経路がある。** coreApplyOpeningEffectsInner は文字列の triggerIndex を0へ戻すため、coreApplyReleaseEffects が渡す `release:...` が通常開戦の0と重なり、同じstateの体では早期returnする。全対象にニンフの開戦を先に解決してから解放すると、開戦10イベント→解放の実体イベント0を再現した。作業前のコアでも同じ構造。今回の「戦闘結果を変えない」範囲でこの判定を直していない。実体イベントが無い場合は、指定どおりインプVFXも再生しない。初回の開戦が実際に発動するfixtureでは、C094→対象の開戦演出が両受け口で一致する。通常戦闘でこの経路を発動させるには、別途コアの再発火判定の修正が残る。

通常戦闘でC094も再発火する完了条件は未達。戦闘結果を変えない今回の範囲ではコア判定を変更しない。実体イベント無しの効果を演出だけで発動したように見せない。写真の固有部分の確認と実戦上の制限を区別し、STATUSはCONTINUE。同じ単独写真の再撮影だけではこの制限は解消しない。

## 変更ファイル

docs/・AGENTS.md・Vesselbound_data.xlsx・local_xlsx_data.js・既存assets・既存82種の定義は変更していない。コミットしていない。
- `assets.js`
- `index.html`
- `js/battle/core.js`
- `js/battle/present.js`
- `js/battle/present_events.js`
- `js/engine/audio.js`
- `js/engine/battle_events.js`
- `js/engine/battle_fx.js`
- `js/engine/render.js`
- `js/online/board.js`
- `js/vfx/SCHEMA.md`
- `js/vfx/defs/characters_1012.js`
- `js/vfx/renderer.js`
- `js/vfx/schema.js`
- `tools/balance_sim/lab_vfx_regression.js`
- `tools/balance_sim/vfx_1012_regression.js`
- `tools/balance_sim/vfx_data_regression.js`
- `tools/balance_sim/vfx_webp_regression.js`
- `tools/parity/lab_vfx_check.js`
- `tools/parity/lab_vfx_fixtures.js`
- `tools/parity/present_parity.js`
- `tools/vfx_capture/CHECKS_1012.md`
- `tools/vfx_capture/IMPLEMENTATION_1012.md`
- `tools/vfx_capture/REVIEW_1012.md`
- `tools/vfx_capture/STATUS.txt`
- `tools/vfx_capture/capture.js`
- `tools/vfx_capture/check.js`
- `tools/vfx_capture/new_targets_1012.txt`
- `tools/vfx_export.js`
- `tools/vfx_export/vfx_defs.json`
- `tools/vfx_preview.html`
- `tools/vfx_preview/cards.js`
- `tools/vfx_preview/cards_check.cjs`
- `tools/vfx_preview/cards_model.js`
- `tools/vfx_preview/cards_routes.js`
- `tools/vfx_preview/cards_scan.cjs`
- `tools/vfx_preview/catalog.js`
- `tools/vfx_preview/prepare_se_1012.py`
- `tools/vfx_preview/preview.js`
- `tools/vfx_preview/se/ADOPTED.md`
- `tools/vfx_preview/se/README.md`
- `tools/vfx_preview/se/manifest.json`
- `tools/vfx_preview/se/picks_1012.json`
- `tools/vfx_preview/se_catalog.js`

音声の新規追加：`tools/vfx_preview/se/<効果>-1/2/3.wav` 63個、`assets/sfx/<番号>.wav` 21個。

## 初回制作時の確認（現在の結果は末尾の第8回を参照）

- 全38本のNode検査：成功（vfx_dataは単独再実行で成功）。
- 変更JS/CJS 29本の node --check：成功。
- online_payload / online_receivers / 全カード一覧 / 台帳 --check / 撮影道具のNode検査：成功。
- 最終変更の新21種・実フレームの脈動通知・SE形式/peak：成功。
- index.html / tools/vfx_preview.html の該当?v=と読み込み順：成功。
- git diff --check、禁止対象の差分なし、一時参照画像の除去：成功。
- 第1回の新13種全104コマと旧82種の差のある全7コマを拡大目視済み。修正後・未撮影8種・旧82種の厳密一致・Chrome検査・SE聴感は未確認／未実行。
- STATUS.txt は CONTINUE。コミットなし。

新しい定義だけを短く回す場合：`VB_ONLY=new node tools/balance_sim/vfx_1012_regression.js`。既存82種の描画命令比較だけは `VB_ONLY=baseline`。既定は両方を実行。

全38本の検査一覧は [CHECKS_1012.md](CHECKS_1012.md)。

## 第1回撮影の修正 / 2026-10-13

- overlord の停止は撮影道具の誤判定。VFX層の静止JPEG/PNGをAnimated WebPの固定対象から外し、元の全画像indexを保って対応ずれを防いだ。静止画像にもデコード待機を行う。未対応WebPのエラーは残す。混在と静止画像だけの層をNodeで再現検査。
- C064：旋風がC字1本に見えたため、polarTurn 10.4rad・2本・polarWave 0.22・polarRate -18へ変更。
- C071：共通レンダラーの座標更新で対象のcolorが落ちていたため、指定済みcolorを保持する2行を追加。新規定義から各色の幅0.017の細光を追加し、飛翔する光の尾は同色・幅0.02へ変更。
- C029/C034：画面端までの距離による高速の波が撮影間隔内にカード領域を抜けていた。radiusSpaceをwidthへ、半径0.14→1.2→5.4の段階的な2波へ変更。発生元の魂も加え、霊火半径はvalue 1/2で0.14/0.16。共通定義1つの構造を保持。
- C095：新規petal-seal内のSVGパスとellipseが座標を混在させていた。全パスを正規化SVGへ揃え、花弁の半径を0.15に変更。実体イベントの回数・重複対象列は変えていない。
- JSON再出力は102定義・884層・38図形・12部品型、567670 bytes。公開項目103は同じ。今回更新した?v=は characters_1012.js と renderer.js、および再生成した全カードLAB台帳のみ。2026-10-12指定と修正理由をHTMLへコメント。
- 今回の変更ファイル：index.html、tools/vfx_preview.html、js/vfx/defs/characters_1012.js、js/vfx/renderer.js、tools/balance_sim/vfx_1012_regression.js、tools/vfx_capture/capture.js、tools/vfx_capture/check.js、tools/vfx_export/vfx_defs.json、tools/vfx_preview/cards_routes.js、および REVIEW_1012.md / CHECKS_1012.md / この報告。SE・コア・既存82種の定義・既存assetsは今回変更していない。
- 全38本のNode検査と既存82種の3速さ×8時刻の描画命令比較を修正後に再実行して成功。詳細は CHECKS_1012.md。
- 修正後の写真は未確認。Node検査を目視合格に替えず、STATUSはCONTINUEのまま。

## 第2回撮影の修正と確認 / 2026-10-14

- 新21種の全168コマ、旧82種の前後全656コマをカード周囲の2倍で自分の目で確認。確認用の新42枚・旧164枚と強調差分11枚は/private/tmpに作成。元の撮影と他の作業フォルダは変更していない。
- C071 / C095 / C042 / C084の光球・花弁・血滴、C082の脈動は、value→copies/cyclesのsmooth補間で整数入力が1へ丸められる不具合。7箇所の入力曲線をlinearへ変更し、実際の個数1/2/3/5と全脈動の谷・発光を3速さで検査。
- C082のLABの通知を共通pulseTimesへ同期。反復3回の合図は等速241.92 / 624.59 / 1007.25ms。snapshot/capture.jsonにもcueTimesMsを記録し、固定602msの命中表示を廃止。ゲーム内の共通presenterによる各回の通知は保持。
- C095は花弁に放射Gradientと3本の筋、C079は蔓・葉に明暗Gradientと筋を追加。C079の成長は半径0.11→0.51、scaleY 0.08→1.08、shiftY 0.67→0.14で根元をほぼ固定して上へ伸ばす。
- C097は背景付きJPEGの残像から、追加図形robed-silhouetteの人型影へ変更。正確な元絵の切抜ではなく、ローブ姿の輪郭を採用した判断をREVIEWにも記録。巨大影の1.9倍→本体への合流は維持。
- C009はLAB単独の移動timeを[0.62,1]→[0.38,0.88]、移動の最大到達を局所0.16へ変更。命中299msに実カードが対象位置へ到着することを3速さ×value 1/2/3で検査。SEのpeakは最初の赤い閃光55.25msへ同期し、実戦の閃光→結界→照準→コア攻撃は変更しない。
- C042 / C084 / C066の硬い塊は既存の汎用fogへ変更。赤い霧は羊と撃破体の狭い範囲、弱体は灰紫・水色の横へ流れる霧とし、C066の輪alphaを0.28、粒を14へ減らした。既存billow-cloudと旧82定義は保持。
- 今回rendererへ新しい描画部品は追加せず、既存shape/fogと数値曲線を使う。rendererの差はsnapshotのcueTimesMsだけ。SCHEMAには追加図形と整数入力のlinearの理由を記載。JSONは102定義・884層・39図形・12部品型、569730 bytes、公開103項目。
- SE21種×3候補の全63件が揃う。元ファイル63件の実在、相互・既存との重複なし、READMEの元素材と理由、仮コピー21件、PCM48kHz/16bit・尺・-1dBFS・peak・30ms末尾フェードの検査成功。聴感は未確認、正式な利用者選択は未実施。
- 全38本のNode検査、online_payload / online_receivers、台帳 --check / cards_check、撮影道具のNode検査、初回からの変更JS/CJS30本のnode --check、git diff --checkが成功。禁止対象・既存assetsに今回の差分無し。Chrome検査は未実行。
- 旧82種の形・配置・明るさ・消失は拡大目視で差を見つけられなかった。画素比較は数値目安82/82、RGB完全一致72/82種・645/656コマ。10種11コマの静止絵・背景の微差は未確定で、厳密一致は未達。最大33〜34は敵の絵の角の1画素、他はほぼ1〜2段階。作業前の写真にも同じ静止画素の揺れがあり、撮影側が疑われるが断定・差の除外はしない。
- 今回変更したファイル：index.html、tools/vfx_preview.html、js/vfx/SCHEMA.md、js/vfx/defs/characters_1012.js、js/vfx/renderer.js、tools/balance_sim/vfx_1012_regression.js、tools/vfx_capture/capture.js、tools/vfx_export/vfx_defs.json、tools/vfx_preview/catalog.js、tools/vfx_preview/preview.js、tools/vfx_preview/cards_routes.js、REVIEW_1012.md / CHECKS_1012.md / この報告。台帳はindex.htmlの指紋だけ更新し、369件の経路は完全一致。該当HTMLの?v=は変更したファイルだけ更新し、2026-10-12指定と理由をコメント。
- 修正9種の再撮影・旧82種の再比較・厳密一致・後続演出の実戦目視は残る。new_targets_1012.txtは21行のまま、STATUSはCONTINUE。コミットなし。

## 第3回撮影の修正と確認 / 2026-10-14

- 新21種全168コマと、旧82種の前後全656コマをカード周囲で切り出し、補間せず2倍へ拡大して自分の目で確認した。新42枚・旧164枚に加え、旧13種の差のある15コマは前後・差分24倍・最大点8倍の画像でも確認。効果ごとの所見はREVIEW_1012.mdに記録。
- 第2回に直したニンフの複数光球、アークデーモンの3脈動、リリスの3花弁と各命中、蔓の地面からの成長、血滴3個／2個は第3回の写真で反映を確認。15種の固有部分は今回維持した。
- C083：歯車粉の飛翔は読めるが、黒煙が横長の硬い板に見えた。billow-cloudから汎用fog28房へ変更し、局所の放射Gradientの3房を追加。歯車・飛翔線は維持し、HPの萎縮は追加していない。
- C097：二重影と巨大影の合流は読めるが、尖った長いフードと直線の袖・裾が元の座った姿から離れていた。元絵を見て短い頭巾・広い肩飾り・膝上の手・曲線の裾をパスデータへ描き直し、顔の影・目・衣の折り目と放射Gradientの陰影を追加。元絵の厳密切抜ではなく輪郭を採用。aspectは[0.6,1]→[0.7,1]、巨大影1.9倍・合流時刻896ms・全尺1.4秒は維持。
- C009：325msの写真では到達した本体が敵カードの下へ隠れていた。既存card.zIndex:20を定義へ指定し、同じ親の敵より前へ出す。終了時に元の表示順へ復元。299msの到達曲線と閃光→既存結界→照準→コアの割り込み攻撃は変更していない。
- C042 / C084：血滴3個／2個は読めたが、赤い霧が弱く四角い溶解だけが目立った。開始時に上下が切れる正方形SVGマスクの縦横比も修正。dissolveFit:stretchとgrid48で縦長カード全面を細かくほどき、赤いfogを羊36房／撃破体28房、局所のGradient房を3個／2個へ追加。コアが渡す滴数・撃破対象・全尺は維持。
- C066：灰紫の霧は柔らかくなったが薄く、輪の線だけが目立った。既存fogを34房、局所の放射Gradientの3房へ補強。輪alpha=0.28・粒14は維持。胸周囲の小さい房で濁った水色の沈静を示す。
- 今回の汎用追加はcard.dissolveFit:stretchだけ。指定した溶解SVGへpreserveAspectRatio="none"を付け、未指定の旧SVG文字列は完全に保持する。効果名の描画分岐を増やさず、定義データ→共通rendererの構造を守る。部品型12種・公開103項目は同じ。JSONは102定義・888層・39図形・573400 bytes。
- 追加回帰は3速さの接触時の表示順／復元、縦長の開始マスク全セル／終了後復元。全38本のNode検査、online_payload / online_receivers、台帳 --check / cards_check、撮影道具のNode検査、初回からのJS/CJS30本の構文検査、git diff --checkが成功。旧82種の定義と3速さ×8時刻のCanvas命令も作業前と完全一致。
- SE63候補と仮コピー21件は全て揃う。元ファイル実在・重複無し・READMEの元素材／理由・ADOPTED仮節、PCM形式・尺・-1dBFS・peak・30ms末尾フェードの検査成功。今回SEは変更していない。聴感は未確認、利用者の正式選択は未実施。
- 第3回の旧82種は数値目安82/82、RGB完全一致69/82種・641/656コマ。13種15コマの大きい差は同じ敵の静止絵の角の1画素、他は主に1〜2段階で、形・配置・明るさ・消失の変化は目で見つからなかった。撮影／静止DOM描画の揺れが疑われるが原因は未確定。差の除外・許容値緩和・原画像補正はせず厳密一致は未達として記録。
- 今回変更ファイル：index.html、tools/vfx_preview.html、js/vfx/SCHEMA.md、js/vfx/schema.js、js/vfx/defs/characters_1012.js、js/vfx/renderer.js、tools/balance_sim/vfx_1012_regression.js、tools/vfx_export/vfx_defs.json、tools/vfx_preview/catalog.js、tools/vfx_preview/cards_routes.js、REVIEW_1012.md／CHECKS_1012.md／この報告。STATUS.txtにはCONTINUEを再記入。台帳はindex.htmlの指紋だけを更新。HTMLの?v=は変更したスクリプトだけ更新し、理由を2026-10-12指定付きでコメント。
- 修正後6種のfile://撮影を試行したがChromeへ接続できず、写真は0。Chromeの5検査は未実行。修正後6種と旧82の再比較、実戦の後続演出・高速描画、SE聴感は未確認。new_targets_1012.txtは21行を維持し、STATUSはCONTINUE。コミット無し。

## 第4回撮影の確認 / 2026-10-14

- 新42枚・旧164枚のカード周囲切出し画像で、新21種全168コマと旧82種の前後全656コマを補間せず2倍に拡大し、自分の目で確認した。旧7種8コマのRGB差は前後・24倍差分・最大点8倍でも確認。効果ごとの所見、全尺と発生・命中時刻はREVIEW_1012.mdへ記録。
- 前回6種の改善（煤の房、座ったローブの巨大影、突進の重なり順、縦長の全面溶解と3滴／2滴、灰紫・水色の霧の存在感）を確認。ニンフの集光、3脈動、花弁の順次命中、蔓の成長など他15種も全コマを見た。新21種は指定の固有部分として追加の変更は不要と判断した。
- 既存ペガサス・リッチ・ダイアウルフを同じ実盤面サイズで比較。マナ系は0.6〜1.1秒の短い核・陣・渦、強化系は線・紋章・波を保ち、全カードの一様な色面を加えていない。霊火の小紋章だけは指定に沿い2.4秒の余韻。
- 旧82種の数値目安82/82、RGB完全一致75/82種・648/656コマ。7種8コマの厳密一致は未達。6コマの大きい差は同じ静止カードの角の1画素だけで、他は主に1〜2段階。演出の輪郭・配置・密度・明るさ・消失に変更は見つからなかった。
- 追加切り分けとしてVFX再生前の基準画像を全82枚数値照合し79/82枚がRGB完全一致。差のある3枚をカード周囲の前後・強調差分・最大点で拡大目視。bandersnatchは最大2の絵内の点状差、mana-cue / aura-buffは数値の丸枠の縁の差。両者の再生中8コマはRGB完全一致。作業前画像自体にも未発射時の1画素差があり撮影／DOMのラスタライズの揺れが疑われるが、Chromeで原因の再現はできていない。差の除外・閾値緩和・原画像補正はしていない。
- 全38本のNode検査、online_payload / online_receivers、cards_scan --check / cards_check、撮影道具Node検査、変更JS/CJS30本のnode --check、git diff --check：成功。vfx_data_regressionは中断後に単独で238.36秒、vfx_1012_regressionは135.26秒で完走。新21種の発動／不発、実対象・回数、PvE／保存再生／オンラインの同一呼出し、旧82定義と3速さ×8時刻の描画命令一致も成功。
- SE63候補を再照合：全原音実在・素材フォルダ内・相互／既存候補／採用元素材と名前重複無し・READMEとADOPTED・manifestとse_catalog一致・WAV登録hash・48kHz/PCM16・最長1.95秒・実測-1.000152dBFS・peak誤差最大0.00000050秒・末尾30msフェード・仮コピー21件全バイト一致：成功。聴感と正式選択は未確認／未実施。音声の差替えは無し。
- 今回変更ファイルはREVIEW_1012.md / CHECKS_1012.md / この報告。STATUS.txtへCONTINUEを記入。VFX・renderer・SE・コア・HTML・台帳・公開JSONは変更していないため?v=更新無し。docs/・AGENTS.md・シート・local_xlsx_data.js・既存assets・旧82定義の変更無し。コミットしていない。
- Chromeのlab_vfx_check / present_parity / anim_check / online_pipeline / current_issues_checkは未実行。写真は利用者提供の第4回を使う。新21種の追加修正待ちは解消し、旧7種8コマの厳密画素差の原因・解消、実戦の後続と高速描画、SE聴感、C094の既存コアの抑止経路は残る。STATUSはCONTINUE。


## 第5回撮影の確認 / 2026-10-14

- 新21種の全168コマ、旧82種の前後全656コマをカード周囲で切り出し、補間なし2倍で自分の目で確認した。追加のRGB差9コマと再生前基準画像の差2枚も前後・差分24倍・最大点8倍で目視。各効果の全コマ所見と発生・命中時刻はREVIEW_1012.md。
- 新21種の指定の形・存在感・既存との密度と尺は揃い、前回までの6種の改善も確認できた。追加VFX修正は不要と判断。原画像・他の作業場所には書き込んでいない。
- 旧82種は演出の形・位置・明るさ・消失に変化が認められない。数値目安82/82、RGB完全一致74/82種・647/656コマ。8種9コマの厳密一致は未達。最大33〜34の8コマは同じ敵前衛中央の角の1画素、他の1コマは灰色の靄の最大2階調差。
- 再生前基準画像も全82枚比較し80/82枚RGB完全一致。差の2枚は絵内の点状差と能力値の丸枠の縁。全82種のgeometry・時刻・発生元・対象・尺・命中は作業前と同一。第4回版623cb31→第5回版6d2649bで実装は変わっていないが、demon-soul／melusineの差は解消しelemental／frost-sprite／flame-sweepへ差が入れ替わった。撮影／DOMの揺れが疑われるが原因は未確定。差の除外・閾値緩和・画像補正は行わない。
- 全38本のNode検査、online_payload／online_receivers、全カード台帳、撮影道具のNode検査、変更JS/CJS30本のnode --check、git diff --checkは成功。旧82定義4ファイルと3速さ×8時刻のCanvas命令・尺は作業前と完全一致。詳細はCHECKS_1012.md。
- SE63候補・仮コピー21件は全て揃う。元素材実在・重複回避・README／ADOPTED／manifest／catalog・PCM形式・尺・ピーク・peak・30msフェード・仮コピー同一性を再照合して成功。候補の聴き比べ・声の混入の聴感判断は未確認、正式選択は未実施。
- 今回変更ファイル：REVIEW_1012.md / CHECKS_1012.md / この報告。STATUS.txtへCONTINUEを記入。実装コード・コア・SE・HTML・台帳・公開JSONは保持したため?v=更新無し。保護対象と既存assetsの変更無し。コミットしていない。
- Chromeの5検査は未実行。実戦の後続／高速描画、SE聴感、旧8種9コマの厳密一致と原因の特定、C094の既存コア抑止経路は未解消として残す。STATUSはCONTINUE。

## 第6回撮影の確認 / 2026-10-14

- 新21種全168コマと旧82種の前後全656コマを、カード周囲の切出し・補間なし2倍で全て自分の目で確認。差のある全14コマも前後・差分24倍・最大点8倍で追加目視。新21種の固有部分に追加修正は不要。旧82種も形・位置・発光・消失に見た目の変更は認められない。
- 比較の数値目安82/82、RGB完全一致70/82種・642/656コマ。12種14コマの厳密差は残る。第5→6回は報告3ファイルだけの変更で、差が出るコマが入れ替わった。比較基準・閾値・撮影画像は変更しない。
- 全38本のNode検査、online_payload／online_receivers、全カード台帳とLAB割当、撮影道具のNode検査、変更JS/CJS30本の構文検査、git diff --checkは成功。旧82定義4ファイルと3速さ×8時刻のCanvas命令・尺も作業前と一致。
- SE63候補と仮コピー21件は全て揃い、元素材実在・重複回避・README／ADOPTED／manifest／catalog・PCM48kHz/16bit・最長1.95秒・実測-1.000152dBFS・peak・30msフェード・仮コピー同一性を再確認。聴感と正式選択は未確認／未実施。
- C094の通常開戦後の既存コア抑止経路は未解消。実体イベントfixtureの両受け口一致を、通常戦闘で全21種が発動する証明とはしない。この判定を直すと戦闘結果が変わるため今回の範囲では変更せず、完了条件は未達と記録。
- 今回変更したのはREVIEW_1012.md / CHECKS_1012.md / この報告だけ。STATUSへCONTINUEを記入。VFX・renderer・コア・SE・HTML・台帳・公開JSONは保持したため?v=更新無し。禁止対象と既存assetsに差分無し。コミットしていない。
- Chromeの5検査は指定どおり未実行。実戦の後続／高速描画・SE聴感は未確認。新21種の修正後再撮影待ちはない。残るコア制限は単独写真の追加撮影では解消しない。

## 第7回撮影の確認 / 2026-10-14

- 新21種全168コマ・旧82種前後全656コマをカード周囲で切出し・補間なし2倍で自分の目で確認。差16コマも前後・差分24倍・最大点8倍で追加目視。新21種の固有部分に追加修正は不要。旧82種の形・配置・発光・消失に見た目の変更は認められない。
- 数値目安82/82、RGB完全一致70/82種・640/656コマ。12種16コマの厳密差は残る。第6→7回は報告3ファイルだけの変更で差が出るコマが入れ替わった。撮影メタデータは新21種が第6回、旧82種が作業前と完全一致。比較基準・閾値・原画像は保持。
- 全38本のNode検査、オンライン送受信、全カード台帳・LAB割当、撮影道具Node検査、変更JS/CJS30本の構文検査、git diff --checkは成功。旧82定義4ファイルと3速さ×8時刻のCanvas命令・尺も作業前一致。
- SE63候補と仮コピー21件を全照合。元素材実在・重複回避・README／ADOPTED／manifest／catalog／hash、48kHz/PCM16・最長1.95秒・-1.000152dBFS・peak・末尾30msフェード・候補1の全バイト一致：成功。聴感と正式選択は未確認／未実施。
- C094の通常開戦後の既存コア抑止経路は未解消。fixtureの両受け口一致を、通常戦闘で全21種が発動する証明にしない。コア修正は戦闘結果を変えるため今回行わず、完了条件3は未達と記録。
- 今回変更はREVIEW_1012.md / CHECKS_1012.md / この報告だけ。STATUSへCONTINUEを記入。VFX・renderer・コア・SE・HTML・台帳・公開JSONを保持し?v=更新無し。禁止対象・既存assets・旧82定義の変更無し。コミット無し。
- Chromeの5検査は指定どおり未実行。実戦の後続／高速連続描画とSE聴感は未確認。新規の修正後再撮影待ちはない。C094の制限は単独写真の追加撮影では解消しない。

## 第8回撮影の確認 / 2026-10-14

- 新21種全168コマ・旧82種前後全656コマをカード周囲で切出し・補間なし2倍で自分の目で確認。差7コマも前後・差分24倍・最大点8倍で追加目視。新21種の固有部分に追加修正は不要。旧82種の形・配置・発光・消失に見た目の変更は認められない。
- 数値目安82/82、RGB完全一致76/82種・649/656コマ。6種7コマの厳密差は残る。第7→8回は報告3ファイルだけの変更で差が出るコマが入れ替わった。撮影メタデータは新21種が第7回、旧82種が作業前と完全一致。比較基準・閾値・原画像は保持。
- 全38本のNode検査、オンライン送受信、全カード台帳・LAB割当、撮影道具Node検査、変更JS/CJS30本の構文検査、git diff --checkは成功。旧82定義4ファイルと3速さ×8時刻のCanvas命令・尺も作業前一致。
- SE63候補と仮コピー21件を全照合。元素材実在・重複回避・README／ADOPTED／manifest／catalog／hash、48kHz/PCM16・最長1.95秒・-1.000152dBFS・peak・末尾30msフェード・候補1の全バイト一致：成功。聴感と正式選択は未確認／未実施。
- C094の通常開戦後の既存コア抑止経路は未解消。fixtureの両受け口一致を、通常戦闘で全21種が発動する証明にしない。コア修正は戦闘結果を変えるため今回行わず、完了条件3は未達と記録。
- 今回変更はREVIEW_1012.md / CHECKS_1012.md / この報告だけ。STATUSへCONTINUEを記入。VFX・renderer・コア・SE・HTML・台帳・公開JSONを保持し?v=更新無し。禁止対象・既存assets・旧82定義の変更無し。コミット無し。
- Chromeの5検査は指定どおり未実行。実戦の後続／高速連続描画とSE聴感は未確認。新規の修正後再撮影待ちはない。C094の制限は単独写真の追加撮影では解消しない。

## Chrome検査第1回・present_parity修正 / 2026-10-14

- 利用者実測のLAB1012一致検査21件NGは、新しい検査節だけオンラインのbattle_start（登場・カットイン）も計測し、盤面配置後から始めるPvEと区間がずれていたことが原因。通常SCENARIOSと同じく、オンラインの最初の実体イベント直前で記録を初期化した。登場演出自体は実行し、実体イベントの演出・SEは全て残す。比較条件と21種の発動必須は保持。
- Chrome用スクリプトをNodeからも使えるようにし、lab_vfx_regressionへ登場VFXを含む21種の回帰を追加。修正前のC004では9件のopening-sigil混入で失敗し、修正後は21種で両受け口の結果が一致する。実体イベント中のopening-sigilと余分なSEを注入する負例も検出するため、名前で隠して通過させていない。
- 最終検査はtools/balance_sim全38本、online_payload／online_receivers、初回からの変更JS/CJS30本の構文検査、git diff --checkが成功。既存attack_summonの27項目とLAB接続全節も最終変更後に再実行した。
- Chromeでの再検査は接続不可でページ評価前に終了し、修正後の実機結果は未確認。全Node検査などの最終結果はCHECKS_1012.mdの「Chrome検査第1回」を参照。
- 今回変更はtools/parity/present_parity.js、tools/balance_sim/lab_vfx_regression.jsと報告3ファイル。STATUSはCONTINUEを維持。2本ともNode実行用でindex.html／tools/vfx_preview.htmlのscript srcには無く、HTMLの?v=更新対象はない。ゲーム本体・戦闘結果・既存仕様・VFXの見た目・SEは変更していない。コミット無し。
