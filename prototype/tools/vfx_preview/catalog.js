/* プレビュー専用の発生元・対象設定。戦闘ルールには使用しない。 */
var VbFxPreviewCatalog = {
  'dark-fire': { source: 'C024', mode: 'foes', note: '真上から見た黒紫の炎流。黒い煙と紫〜赤の火の縁を持つ多数の炎が敵方向へ流れる。画面端へ届いた後も燃え続け、最後の0.5秒で消える。' },
  banshee: { source: 'C024', mode: 'foe', note: '人魂のような青白い霊体。半透明の頭と、ゆらめく5本の尾、剥がれて漂う霊気。着弾で霊体がほどけ、渦を巻く霊気の筋と柔らかい波紋が広がる。' },
  resentment: { source: 'C024', mode: 'foe', note: '怨念は紫色の霊体。バンシーと同じ形で色を変える。' },
  lich: { source: 'C039', mode: 'foe', deadOrigin: true, note: 'リッチ自身ではなく、倒れた味方のカード中心から緑色の霊体が飛ぶ。金枠は死亡した味方。' },
  'great-shield': { source: 'C077', mode: 'self', note: '発生元から相手陣営へ、透明な扇形の膜と細い格子を一瞬だけ広げる。' },
  'cover-fire': { source: 'C046', mode: 'foe', note: '細い矢と短い残像を高速で飛ばす。着弾は小さな火花だけに抑える。' },
  shockwave: { source: 'C067', mode: 'foes', note: '乱れた青白い多層の前縁と後方の乱流が扇状に広がる。敵ごとの接触で閃光を出し、画面端まで届く。' },
  'demon-soul': { source: 'C098', mode: 'foes', note: '足元に赤い魔法陣。赤黒い厚い波が3度押し寄せ、通った跡に赤黒い霞が残る（画面端まで消えない）。波頭に火の粉と黒い煙。' },
  vrykolakas: { then: 'revive-gain', source: 'C032', mode: 'friend', note: '対象に不死者のオーラを纏わせ、続けて49「復活獲得」を自動で出す（ゲームでも本来のVFXの後に続ける）。' },
  dullahan: { source: 'C037', mode: 'foe', note: '骸骨のオーラが飛ぶ：青白い霊体の頭に骸骨の顔、周りを骨が回る。着弾で霊体がほどけ、骨が散る。' },
  'bone-chariot': { source: 'C038', mode: 'friend', note: 'カード外周の骨色の発光と渦に、陰影・割れ目を持つ頭蓋骨の魔法文様を7つ巡らせる。すべて真上から見た配置。' },
  jackalope: { source: 'C046', mode: 'green', note: '味方の緑キャラと、自然に揺らぐ緑の光の線で繋がる。線に沿って光の粒が流れ、繋がったカードの縁が緑に光る。' },
  dragonnet: { source: 'C049', mode: 'self', morph: 'C104', note: '霧が最も濃い時点でドラゴネットの絵をドラゴン（C104）へ差し替える。晴れた後に変化が見える。' },
  cockatrice: { source: 'C051', mode: 'foe', note: '対象のカードを一時的に石色へ変え、表面に短い亀裂を出す。終了時には元の色に戻す。' },
  bandersnatch: { source: 'C053', mode: 'self', morph: 'C104', note: 'ドラゴネットと共通の変身VFX。霧が最も濃い時に絵が差し替わる。' },
  worm: { source: 'C054', mode: 'foes', note: '緑色の波動が敵全体を通過して画面端まで残る。各敵への通過時に onImpact を呼ぶ。毒札は対象の例示。' },
  wyvern: { source: 'C058', mode: 'foe', note: '風が対象へ届いた瞬間に白い3本の切り傷を出す。全尺480msの高速版。' },
  'frost-sprite': { source: 'C067', mode: 'foe', note: '輪郭と面のある8本のつらら状の氷が、白い冷気の尾を引いて飛ぶ。着弾で霜の結晶が放射状に伸び、氷片が散る。' },
  leprechaun: { source: 'C068', mode: 'friends', note: '味方の前後衛を一つの金色の光だまりで包む。カード外周の縁・円形の魔法陣・小さく集まる金粉を重ねる。0.3秒で満ち、0.8秒保ち、0.6秒で消える。' },
  melusine: { source: 'C069', mode: 'foes', note: '敵グループ全体に暗い緑の霧を流す。カードの輪郭は見える程度に残す。' },
  carbuncle: { source: 'C077', mode: 'foe', note: '発生元の結界の輪が砕け、薄桃色の破片が対象へ飛び、ぶつかって散る。金枠が結界を失ったキャラの位置。' },
  pixie: { source: 'C078', mode: 'pair', note: 'ビームで前衛の敵を捕縛し、その敵のカードを別の敵へ動かして攻撃させる。命中の通知は捕縛した敵、攻撃された敵の順。' },
  elemental: { source: 'C080', mode: 'self', note: '真上から見た虹色の炎。8色のノイズを持つプラズマがカード中心の周囲で燃え、円周方向へ渦を巻く。' },
  imp: { source: 'C081', mode: 'others', note: '発生元以外の敵・味方すべてから赤い粒子を吸い込む。粒子が集まるほど中心の赤い光が強くなる。' },
  wendigo: { source: 'C092', mode: 'foes', note: '白い冷気、霜の線、小さな結晶が放射状に敵を通過する。冷気は画面端まで消えない。' },
  nightmare: { source: 'C096', mode: 'self', note: 'カード外周を囲む紫の発光の縁に、黒い煙・逆回転するプラズマ・上から見た粒子の渦を重ねる。' },
  abyss: { source: 'C098', mode: 'self', note: 'アビス・バロンの案A。青黒い渦が逆回転し、暗いオーラをカードへ巻きつける。' },
  baron: { source: 'C098', mode: 'self', note: 'アビス・バロンの案B。赤い縁を持つ黒いオーラ。C098は「アビス・バロン」という1枚のカード。' },
  pegasus: { source: 'C076', mode: 'friend', note: '上からのスポットライトを円形の光だまりとして描く。淡い金色の魔法陣・白い核・光の粒が対象を照らす。' },
  direwolf: { source: 'C041', mode: 'summon', auxiliary: 'opening', note: '控えめな遠吠え（カード周りに収まる輪と小さな揺れ）の後、ウルフが左端から登場する。大きな咆哮は全体攻撃案Dへ移した。' },
  weaken: { source: 'C046', mode: 'foe', note: '対象のカードだけを430ms、小さく震わせる。枠・絵・文字を一体で動かす。' },
  'atk-down': { source: 'C067', mode: 'foe', note: '対象のカードを一瞬青白くする。描画用の色だけを変え、数字の変更は行わない。' },
  'all-sweep': { source: 'C041', mode: 'foes', proposal: 'A', note: '全体攻撃案A：乱れた輪郭と白い芯を持つ幅広い一閃。流体の帯と火花が敵全体を一瞬で薙ぎ払う。460ms。' },
  'all-ring': { source: 'C041', mode: 'foes', proposal: 'B', note: '全体攻撃案B：敵グループ中央の白い核から、真円の多層衝撃輪と青白い乱流が一瞬広がる。580ms。' },
  'all-cross': { source: 'C041', mode: 'foes', proposal: 'C', note: '全体攻撃案C：白い芯・色の帯・柔らかい残光を持つ2本の斬撃が交差する。散る粒子で敵全体の範囲を示す。460ms。' },
  'all-roar': { source: 'C041', mode: 'foes', proposal: 'D', note: '全体攻撃案D：ダイアウルフ当初の大きな咆哮。敵グループの中央から、ぼかした多重の輪・空気の圧・粉塵が全体へ広がり、画面が揺れる。900ms。' },
  'meteor-scroll': { source: 'C067', mode: 'foes', cue: 'impact', note: '画面上端の外から燃え盛る火球が落下（真上視点なので近づくほど大きくなる）。一瞬の白いフラッシュで火球を消し、変更前の全体攻撃素材 K009.webp を敵グループ上に出す。' },
  'shield-state': { source: 'C077', mode: 'self', note: 'カードを包む透明な膜（縁ほど濃く、ゆっくり呼吸する）と、表面をときどき通る斜めの光。周りを回る物は無し（ループ。SEは今の結界の音を維持）。' },
  'poison-state': { source: 'C054', mode: 'self', note: '毒が付いている間ずっと出す。脈打つ緑の縁・湧いて弾ける泡・まとわりつく霧（ループ／SEなし）。' },
  'weaken-state': { source: 'C046', mode: 'self', note: '弱体が付いている間ずっと出す。カードの上に紫灰色の暗い膜が垂れ込め、縁が弱々しく明滅し、粒が中心へ沈む（ループ／SEなし）。' },
  'guts-state': { source: 'C041', mode: 'self', note: '根性を持っている間ずっと出す。鼓動のように脈打つ橙色の縁・縁を巡る炎・火の粉（ループ／SEなし）。' },
  titan: { source: 'C014', mode: 'foes', note: 'タイタン（開戦：全ての敵に弱体）。踏み鳴らしで足元に土煙、画面が揺れ、地割れと土煙の波が敵全体へ走る。届いた敵の足元が割れ、紫の気配が沈む。' },
  cyclops: { source: 'C018', mode: 'self', note: 'サイクロプス（3マナ：全体攻撃を得る）。赤金の力が渦を巻いて集まり、光条と衝撃の輪が弾け、カード型の炎のオーラを纏う。' },
  wraith: { source: 'C025', mode: 'friend', deadOrigin: true, note: 'レイス（死亡：味方の負傷効果を発動）。倒れたレイスの足元に禍々しい陣、黒紫の瘴気が味方へ流れ込み、まとわりつく。' },
  'battle-summon': { source: 'C041', mode: 'self', note: '戦闘中の召喚。マスに魔法陣が開き、光が立ち上がって閃光とともにカードが現れる。' },
  'revive-summon': { source: 'C032', mode: 'self', note: '復活による召喚。散った魂の欠片が渦を巻いて集まり、ぼやけた姿が青白い光とともに形を取り戻す。' },
  'shield-gain': { source: 'C077', mode: 'self', note: '結界を得た瞬間。金の縁が外から締まって現れ、結界の状態表示へ移る。' },
  'revive-gain': { source: 'C032', mode: 'self', note: '復活を得た瞬間。青白い縁が外から締まって現れ、復活の状態表示へ移る。' },
  'shield-break': { source: 'C077', mode: 'self', note: '結界消失。金の膜にひびが走り、一瞬光って砕け、金の破片が飛び散って消える。' },
  'revive-state': { source: 'C032', mode: 'self', note: '復活効果が付いている間ずっと出す青白いオーラ（ループ／SEなし）。停止するまで出し続ける。' },
  // 第2段：元の番号を保ったコード描画。
  "hit-burst": {"source": "C041", "mode": "foe", "sourceCode": "hit", "note": "砂金色の短い火花と薄い煙。白い面でカードを覆わず、細い筋と小さな核で衝突を示す。", "notice": "第2段 · 元の番号 hit · 基準尺 800ms。画像は方向性の参考。"},
  "attack-recoil": {"source": "C002", "mode": "self", "sourceCode": "C002", "note": "赤橙の外周リング、琥珀の軌道光、薄い霞。赤い反撃の環をカードの周りに残す。", "notice": "第2段 · 元の番号 C002 · 基準尺 700ms。画像は方向性の参考。"},
  "arachne-ring": {"source": "C008", "mode": "friends", "sourceCode": "C008", "note": "2026-10-15作り直し：アラクネに熱が集まり、橙の熱波が味方全体へ広がる。届いた瞬間に強化（金の炎）とダメージ（火の弾け）を同時に出す。", "notice": "第2段 · 元の番号 C008 · 旧素材は踏襲しない（利用者指定）。"},
  "siren-wave": {"source": "C011", "mode": "foes", "sourceCode": "C011", "note": "淡い金の細い波紋と浮遊光。発生元から拡大し、波の縁がカードへ届く順に命中する。", "notice": "第2段 · 元の番号 C011 · 基準尺 800ms。画像は方向性の参考。", "motion": "expand"},
  "medusa-gaze": {"source": "C017", "mode": "foe", "sourceCode": "C017", "note": "白金の短い稲光と桃色の欠片。前半の一閃を強くし、後半には霞だけを残す。", "notice": "第2段 · 元の番号 C017 · 基準尺 800ms。画像は方向性の参考。"},
  "centaur-missile": {"source": "C019", "mode": "foe", "sourceCode": "C019_1", "note": "緑の先端に橙の二筋の尾。先端を中心へ合わせ、既存と同じ加速・曲線・上向きの姿勢で飛ぶ。", "notice": "第2段 · 元の番号 C019_1 · 基準尺 448ms。画像は方向性の参考。", "motion": "projectile", "impactOffsetY": 0},
  "centaur-impact": {"source": "C019", "mode": "foe", "sourceCode": "C019_2", "note": "緑の横長の衝撃と金の火花。飛翔体の色を着弾へ引き継ぐ。", "notice": "第2段 · 元の番号 C019_2 · 基準尺 800ms。画像は方向性の参考。"},
  "flame-sweep": {"source": "C043", "mode": "foes", "sourceCode": "C043", "note": "橙の流れる炎、細い黄金の芯、控えめな煙。カード先端を原点に、対象までの距離と角度で伸びる。", "notice": "第2段 · 元の番号 C043 · 基準尺 700ms。画像は方向性の参考。", "motion": "sweep"},
  "steal-mark": {"source": "C090", "mode": "foe", "sourceCode": "C090", "note": "桃色の煙と小さなハート。柔らかい霧を主にし、ハートは少数だけ浮かべる。", "notice": "第2段 · 元の番号 C090 · 基準尺 800ms。画像は方向性の参考。"},
  "fire-arrow": {"source": "C041", "mode": "foe", "sourceCode": "E058_1", "note": "橙の彗星の先端と赤桃色の尾。尾を二層の細い帯にして飛ばす。", "notice": "第2段 · 元の番号 E058_1 · 基準尺 448ms。画像は方向性の参考。", "motion": "projectile", "impactOffsetY": 0.18},
  "fire-arrow-impact": {"source": "C041", "mode": "foe", "sourceCode": "E058_2", "note": "橙の横長の火花と短い衝撃輪。白い核を小さくしてカードの絵を残す。", "notice": "第2段 · 元の番号 E058_2 · 基準尺 800ms。画像は方向性の参考。"},
  "death-mark": {"source": "C032", "mode": "self", "sourceCode": "K001", "note": "紫の蒸気と細かな光。暗い外周と薄い粒で死亡効果の気配を出す。", "notice": "第2段 · 元の番号 K001 · 基準尺 800ms。画像は方向性の参考。"},
  "fang-poison": {"source": "C041", "mode": "foe", "sourceCode": "K003", "note": "黄緑の丸い毒霧と泡の輪。元の丸い塊を薄いプラズマと少数の環で表す。", "notice": "第2段 · 元の番号 K003 · 基準尺 800ms。画像は方向性の参考。"},
  "piercing-streak": {"source": "C041", "mode": "foe", "sourceCode": "K007", "note": "細い青白い貫通線。進行方向を向く青い二筋と短い尾で貫く。", "notice": "第2段 · 元の番号 K007 · 基準尺 420ms。画像は方向性の参考。", "motion": "pierce", "impactOffsetY": 0},
  "tri-streak": {"source": "C041", "mode": "front", "sourceCode": "K008", "note": "青白い横薙ぎの一閃。三体分の列を横切る細い帯と短い火花。", "notice": "第2段 · 元の番号 K008 · 基準尺 800ms。画像は方向性の参考。", "motion": "row"},
  "contact-burst": {"source": "C041", "mode": "foe", "sourceCode": "K009", "note": "灰色の二波の煙と金の衝撃。二回の膨らみを時間曲線で表す（旧meteor-scroll内の画像は別途保留）。", "notice": "第2段 · 元の番号 K009 · 基準尺 800ms。画像は方向性の参考。"},
  "poison-tick": {"source": "C041", "mode": "foe", "sourceCode": "K017", "note": "縦に立つ緑の毒霧と泡。毒牙より暗くして継続ダメージを見分ける。", "notice": "第2段 · 元の番号 K017 · 基準尺 800ms。画像は方向性の参考。"},
  "shield-contact": {"source": "C041", "mode": "foe", "sourceCode": "K018", "note": "小さな青い接触光と波紋。結界への命中を短い青の環で示す。", "notice": "第2段 · 元の番号 K018 · 基準尺 800ms。画像は方向性の参考。"},
  "seal-release": {"source": "C032", "mode": "self", "sourceCode": "K019", "note": "紫の魔法陣と三角の記号。1750msで展開から収束へ折り返し、解封の合図を保つ。", "notice": "第2段 · 元の番号 K019 · 基準尺 3500ms。画像は方向性の参考。"},
  "revive-burst": {"source": "C032", "mode": "self", "sourceCode": "K020", "note": "青の光球、輪、少数の欠片。復活の青を細い環と渦で表す（ゲームの主経路はrevive-summon）。", "notice": "第2段 · 元の番号 K020 · 基準尺 1500ms。画像は方向性の参考。"},
  "mana-cue": {"source": "C041", "mode": "self", "sourceCode": "K024", "note": "水色の魔法陣と回転する三角。マナ効果の合図を細い環と幾何学模様で示す。", "notice": "第2段 · 元の番号 K024 · 基準尺 900ms。画像は方向性の参考。"},
  "summon-sigil": {"source": "C041", "mode": "self", "sourceCode": "S001", "note": "緑の召喚球と渦の弧。500msのカード出現の合図を持つ（ゲームの主経路はbattle-summon）。", "notice": "第2段 · 元の番号 S001 · 基準尺 1000ms。画像は方向性の参考。"},
  "gold-gain": {"source": "C041", "mode": "self", "sourceCode": "S003", "note": "陰影のある金貨と薄い灰色の煙。輪郭と面を持つコインを少数だけ散らす。", "notice": "第2段 · 元の番号 S003 · 基準尺 700ms。画像は方向性の参考。"},
  "mana-gain": {"source": "C041", "mode": "self", "sourceCode": "S004", "note": "青白い縦長の宝石。小さな結晶と光をカード中央の少し上から浮かせる。", "notice": "第2段 · 元の番号 S004 · 基準尺 670ms。画像は方向性の参考。", "motion": "rise"},
  "attack-buff": {"source": "C041", "mode": "self", "sourceCode": "S005", "note": "金のほつれた環と星の光。細い金の二重輪を主にして攻撃バフを表す。", "notice": "第2段 · 元の番号 S005 · 基準尺 700ms。画像は方向性の参考。"},
  "injury-buff": {"source": "C041", "mode": "self", "sourceCode": "S006", "note": "橙のほつれた環と点の光。負傷効果のオーラを控えめな赤橙で描く。", "notice": "第2段 · 元の番号 S006 · 基準尺 700ms。画像は方向性の参考。"},
  "death-buff": {"source": "C041", "mode": "self", "sourceCode": "S007", "note": "青緑の環と青の破片。死亡効果のオーラを冷たい色で見分ける。", "notice": "第2段 · 元の番号 S007 · 基準尺 700ms。画像は方向性の参考。"},
  "mana-buff": {"source": "C041", "mode": "self", "sourceCode": "S008", "note": "緑の環と丸い光。マナ効果のオーラを薄い緑の二重輪で表す。", "notice": "第2段 · 元の番号 S008 · 基準尺 700ms。画像は方向性の参考。"},
  "aura-buff": {"source": "C041", "mode": "self", "sourceCode": "S009", "note": "淡い青緑の環と三角片。常時バフの静かなオーラとして繰り返し再生する。", "notice": "第2段 · 元の番号 S009 · 基準尺 700ms。画像は方向性の参考。"},
  "opening-sigil": {"source": "C041", "mode": "self", "sourceCode": "appearance_sheet", "note": "着地の足元に舞う砂煙（左右へ転がる塊・昇る土埃・跳ねる砂粒）と一瞬の平たい金の閃き。カード幅に収める。396msから現れ、560msから薄れ、980msで消す。", "notice": "第2段 · 元の番号 appearance_sheet · 基準尺 980ms。画像は方向性の参考。", "motion": "opening"},
  "board-summon": {"source": "C041", "mode": "self", "sourceCode": "board_change1", "note": "緑の薄い輪と少数の粒。500msでカードを差し替え、1200msで消す。", "notice": "第2段 · 元の番号 board_change1 · 基準尺 1200ms。画像は方向性の参考。", "motion": "board"},
  "board-enchant": {"source": "C041", "mode": "self", "sourceCode": "board_change2", "note": "青の薄い輪と少数の粒。召喚と同じ尺・密度にして強化の色だけを見分ける。", "notice": "第2段 · 元の番号 board_change2 · 基準尺 1200ms。画像は方向性の参考。", "motion": "board"},
  // 2026-10-12: 新21キャラ。サンプル回数はプレビュー専用。
  "satyr": {"source": "C004", "mode": "self", "sampleValue": 1, "value": 1, "note": "足元の青い魔法陣から3本の魔力が湧き上がり、既存のマナ獲得へ続く。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "hecatoncheir": {"source": "C020", "mode": "self", "sampleValue": 1, "value": 1, "note": "確率に当たった負傷だけ小径の陣から青い魔力を噴く。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "zombie": {"source": "C021", "mode": "self", "sampleValue": 1, "value": 1, "note": "死亡位置から青白い魂が浮上し、マナ獲得につながる。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "behemoth": {"source": "C060", "mode": "self", "sampleValue": 1, "value": 1, "note": "青い結晶の魔力を白熱させ、細い閃光と小片へ炸裂させる。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "sylph": {"source": "C064", "mode": "self", "sampleValue": 1, "value": 1, "note": "命中時に青白い旋風を巻き、青い魔力を湧かせる。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "nymph": {"source": "C071", "mode": "colors", "sampleValue": 5, "value": 5, "note": "実際に存在する各色の代表から細光を集め、色数だけ小光球を作る。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "familiar": {"source": "C089", "mode": "foe", "sampleValue": 1, "value": 1, "note": "命中した敵から赤い血滴を吸い上げ、中央で青い魔力へ転換する。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "fiend": {"source": "C099", "mode": "foe", "sampleValue": 1, "value": 1, "note": "黒紫の核と紫の尾を持つ弾。実戦はdamage1件につき1発。", "new1012": true},
  "phantom": {"source": "C029", "mode": "kenzoku", "sampleValue": 1, "value": 1, "note": "半透明の波を戦場へ広げ、対象の眷属にだけ小さな霊火の紋章を約2秒残す。", "new1012": true},
  "eidolon": {"source": "C034", "mode": "kenzoku", "sampleValue": 2, "value": 2, "note": "ファントムと同じ定義。入力value=2で霊火の径だけ少し強める。", "new1012": true},
  "arch-demon": {"source": "C082", "mode": "purple", "sampleValue": 3, "value": 3, "note": "紫の味方だけを魔力線で結び、実際の反復回数ぶん魔力が流れて脈打つ。", "new1012": true},
  "gremlin": {"source": "C083", "mode": "foes", "sampleValue": 1, "value": 1, "note": "煤色の波と歯車粉を敵へ送り、HPの萎縮を使わずATK減少へ引き継ぐ。", "new1012": true, "then": "atk-down", "thenSound": "gremlin-weaken"},
  "lilith": {"source": "C095", "mode": "sequence", "sampleValue": 3, "value": 3, "note": "実際の回数だけ赤紫の花弁紋章を作り、順に飛ばす。重複する対象も同じ回数だけ脈動。", "new1012": true},
  // 2026-10-12指定・撮影第2回: 背景を伴わない頭巾・袖・裾の輪郭で倍化を示す。
  // 2026-10-12指定・撮影第3回: 元絵に沿う座ったローブ姿の輪郭へ修正。
  "overlord": {"source": "C097", "mode": "self", "sampleValue": 1, "value": 1, "note": "座ったローブ姿の二重影の後、後方の巨大な残像が本体へ重なる。数値別の表現をせず全体の倍化を示す。", "new1012": true},
  "minotaur": {"source": "C009", "mode": "foe", "sampleValue": 3, "value": 3, "note": "赤い怒りの閃光→既存結界獲得→敵への赤い照準→実際の割り込み攻撃。", "new1012": true},
  "sleep-sheep": {"source": "C042", "mode": "self", "sampleValue": 3, "value": 3, "note": "赤い血の羊毛がほどけて3滴になる。合体時の滴数はblood_set.gainedを使う。", "new1012": true},
  "scylla": {"source": "C056", "mode": "foes", "sampleValue": 1, "value": 1, "note": "黄緑の飛沫を対象全員へ降らせ、元の毒付与・毒の状態表示へつなぐ。", "new1012": true},
  "undine": {"source": "C066", "mode": "foes", "sampleValue": 1, "value": 1, "note": "濁った灰紫・水色の霧が敵を鎮め、元の弱体獲得へつなぐ。", "new1012": true, "then": "weaken"},
  "spriggan": {"source": "C079", "mode": "friend", "sampleValue": 1, "value": 1, "note": "地面から枝と蔓の輪が育ち、淡い光の環へ変わって既存結界へつなぐ。", "new1012": true, "then": "shield-gain"},
  "incubus": {"source": "C084", "mode": "foe", "sampleValue": 2, "value": 2, "note": "実際に倒した敵の位置を赤い霧でほどき、2滴へまとめて消す。", "new1012": true},
  "chaos-imp": {"source": "C094", "mode": "friend", "sampleValue": 1, "value": 1, "note": "インプから歪んだ紫の稲妻が跳び、小径の開戦陣へ再点火。開戦効果本体は元の演出へ渡す。", "new1012": true},
  // 2026-10-17 未設定だった演出の新規制作（Claude直接）
  "dragon-pact": {"source": "C041", "mode": "foe", "note": "竜の契約（E008）。赤黒い渦に橙金の炎が集まり、白金の芯の火球が長い尾を引いて飛び、着弾で炎が爆ぜる。実戦は攻撃効果のdamage1件につき1発。"},
  "rage-shards": {"source": "C041", "mode": "foe", "note": "逆上（E032）。負傷したカードに赤い裂け目が走り、3本の赤い破片が弧を描いて対象へ刺さる。"},
  "storm-ring": {"source": "C041", "mode": "foes", "note": "嵐の指輪（R023）。敵の上に暗雲が垂れこめ、上端から各敵へ雷が2度落ちる。"},
  "scroll-shield": {"source": "C041", "mode": "self", "note": "幻視の巻物（I004）の使用（2026-10-18 盾と入れ替え）。青い魔法陣と紋の輪が集まり、結晶の紋が刻まれる。"},
  "scroll-revive": {"source": "C041", "mode": "self", "note": "盾の巻物（I003）の使用（2026-10-18 幻視と入れ替え）。金の魔法陣と紋の輪が集まり、羽の紋が刻まれる。"},
  "scroll-giant": {"source": "C041", "mode": "self", "note": "巨大化の巻物（I005）の使用。橙の魔法陣と紋の輪が集まり、星の紋が刻まれる。"},
  "scroll-mana": {"source": "C041", "mode": "self", "note": "魔力の巻物（I011）の使用。水色の魔法陣と紋の輪が集まり、結晶の紋が刻まれる。"},
  "scroll-guts": {"source": "C041", "mode": "self", "note": "鼓舞の旗（I012）の使用。赤い魔法陣と紋の輪が集まり、閃光の紋が刻まれる。"},
  "ring-eye-red": {"source": "C041", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）赤い瞳の指輪（R001）の開戦。赤の味方の縁が赤く光り、額に結晶が灯って光の粒が昇る。"},
  "ring-eye-blue": {"source": "C041", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）青い瞳の指輪（R002）の開戦。"},
  "ring-eye-green": {"source": "C041", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）緑の瞳の指輪（R003）の開戦。"},
  "ring-eye-yellow": {"source": "C041", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）黄の瞳の指輪（R004）の開戦。"},
  "ring-eye-purple": {"source": "C041", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）紫の瞳の指輪（R005）の開戦。"},
  "ring-eye-rainbow": {"source": "C041", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）虹の瞳の指輪（R032）の開戦。味方全員の縁を5色が順に走り、白い結晶と色の粒が昇る。"},
  "paladin-ring": {"source": "C041", "mode": "friends", "note": "聖騎士の指輪（R019）の開戦。金の縁が二重に重なり、金の結晶が灯ってHPが倍になる。"},
  "speed-ring": {"source": "C041", "mode": "friend", "note": "神速の指輪（R031）の開戦。白金の集中線が左端のカードへ集まり、光の輪とともに前へ踏み出す。"},
  "toughness-ring": {"source": "C041", "mode": "friends", "note": "強靭の指輪（R015）の開戦。緑の縁が光り、生命の紋が刻まれる。"},
  "curse-ring": {"source": "C041", "mode": "foes", "note": "呪いの指輪（R042）・憎悪の指輪（R041）の開戦。敵に黒紫の煙と呪いの陣がまとわりつき、色が沈む。"},
  "sealed-power": {"source": "C041", "mode": "self", "note": "封印されしもの（E057）の解放。紫の封印の輪が砕け、金の裂け目の光が走り、金の光の柱が立つ。"},
  "void-mastery": {"source": "C093", "mode": "friends", "note": "ヴォイド・ウォーカー（C093）の開戦。虚空の渦と紋の輪から紫の稲妻が紫の味方へ走り、縮む紋の輪と紫の縁で熟練が刻まれる。"},
  "keyword-grant": {"source": "C041", "mode": "friends", "note": "金床の賢者“シンドリ”（EN044）の開戦。金の紋の輪が味方へ縮み、金の縁でキーワード（貫通）が刻まれる。"},
  "fate-sever": {"source": "C041", "mode": "self", "note": "刻を織る者“ウルズ・ラグナ”（EN075_1）の開戦。時の紋の輪が回り、白い亀裂の光が走って画面が灰色に沈み、敵のライフが1になる。"},
  "penance-ring": {"source": "C041", "mode": "friends", "note": "苦行の指輪（R012）の開戦。暗い紅の茨の輪が全ての味方を締め付け、締まった瞬間に赤い裂け目と血の滴で1ダメージ。"},
  "alchemy": {"source": "C041", "mode": "self", "note": "錬成（E030）の終戦。金貨が渦を巻いて金の錬成陣へ吸い込まれ、白金の閃光とともにアイテムの結晶が生まれる。"},
  "hydra-reward": {"source": "C055", "mode": "self", "note": "ハイドラ（C055）の終戦。翠の首が3本、彗星の尾を引いて上へ伸び、先に報酬の宝石が灯る。"},
  "gold-loss": {"source": "C041", "mode": "self", "note": "苦悶の刻印（E078）の死亡。紫黒の刻印が疼き、金貨が上へ弾けてから重く落ち、黒い靄に崩れる。"},
  "suffering-brand": {"source": "C041", "mode": "friends", "note": "受難の刻印（E077）の死亡。倒れた場所の刻印が割れ、暗い紅の呪いが全ての味方へ飛んでダメージを刻む。"},
  "soul-recall": {"source": "C031", "mode": "self", "note": "レムレース（C031）の死亡。倒れた場所に青白い魂が渦を巻いて集まり、光の柱とともに死者を呼び戻す（続けて登場演出でカードが出る）。"},
  "undying-ring": {"source": "C041", "mode": "self", "note": "不死の指輪（R017）。前衛が全滅した時、陣の中央に死霊術の陣が開き、骨の白い光の柱が3本立つ（続けて青スケルトンが3体出る）。"},
  "oni-ring": {"source": "C041", "mode": "self", "note": "鬼神の指輪（R020）。陣の中央に紅蓮の陣が開き、炎の柱と熱の輪が弾ける（続けて赤イフリートが出て攻撃する）。"},
  "map-life": {"source": "C041", "mode": "friends", "note": "生命の力（魔導板）の開戦。緑の生命の光が2度脈打ち、HPが倍になる。"},
  "map-resonance": {"source": "C041", "mode": "friends", "note": "共鳴の力（魔導板）の開戦。同じ色の味方に金の波紋が重なり、+3/+3。"},
  "map-duplicate": {"source": "C041", "mode": "self", "note": "複製の力（魔導板）の開戦。元のカードに鏡の光が走り、写しが生まれる（続けて登場演出でコピーが出る）。"},
  "intimidate-ring": {"source": "C041", "mode": "foes", "note": "威圧の指輪（R016）の開戦。敵に暗い紅の重圧がのしかかり、カードが沈む（続けて弱体の付与）。"},
  "magic-ring-mana": {"source": "C041", "mode": "self", "note": "魔力の指輪（R013）。敵が倒れるたび、陣の中央に蒼い魔力の結晶が弾けて2マナを得る。"}
};

/* カード名・色は内蔵CSVのヘッダから抽出したプレビュー用スナップショット。 */
var VbFxPreviewCards = {
  "C014": { "no": "C014", "name": "タイタン", "color": "赤" },
  "C018": { "no": "C018", "name": "サイクロプス", "color": "赤" },
  "C025": { "no": "C025", "name": "レイス", "color": "青" },
  "C024": {
    "no": "C024",
    "name": "バンシー",
    "color": "青"
  },
  "C039": {
    "no": "C039",
    "name": "リッチ",
    "color": "青"
  },
  "C032": {
    "no": "C032",
    "name": "ヴリコラカス",
    "color": "青"
  },
  "C037": {
    "no": "C037",
    "name": "デュラハン",
    "color": "青"
  },
  "C038": {
    "no": "C038",
    "name": "ボーンチャリオット",
    "color": "青"
  },
  "C041": {
    "no": "C041",
    "name": "ダイアウルフ",
    "color": "緑"
  },
  "C046": {
    "no": "C046",
    "name": "ジャッカロープ",
    "color": "緑"
  },
  "C049": {
    "no": "C049",
    "name": "ドラゴネット",
    "color": "緑"
  },
  "C051": {
    "no": "C051",
    "name": "コカトリス",
    "color": "緑"
  },
  "C053": {
    "no": "C053",
    "name": "バンダースナッチ",
    "color": "緑"
  },
  "C054": {
    "no": "C054",
    "name": "ワーム",
    "color": "緑"
  },
  "C058": {
    "no": "C058",
    "name": "ワイバーン",
    "color": "緑"
  },
  "C067": {
    "no": "C067",
    "name": "フロスト・スプライト",
    "color": "黄"
  },
  "C068": {
    "no": "C068",
    "name": "レプラコーン",
    "color": "黄"
  },
  "C069": {
    "no": "C069",
    "name": "メリュジーヌ",
    "color": "黄"
  },
  "C076": {
    "no": "C076",
    "name": "ペガサス",
    "color": "黄"
  },
  "C077": {
    "no": "C077",
    "name": "カーバンクル",
    "color": "黄"
  },
  "C078": {
    "no": "C078",
    "name": "ピクシー",
    "color": "黄"
  },
  "C080": {
    "no": "C080",
    "name": "エレメンタル",
    "color": "黄"
  },
  "C081": {
    "no": "C081",
    "name": "インプ",
    "color": "紫"
  },
  "C092": {
    "no": "C092",
    "name": "ウェンディゴ",
    "color": "紫"
  },
  "C096": {
    "no": "C096",
    "name": "ナイトメア",
    "color": "紫"
  },
  "C098": {
    "no": "C098",
    "name": "アビス・バロン",
    "color": "紫"
  },
  "C102": {
    "no": "C102",
    "name": "ウルフ",
    "color": "緑"
  },
  "C104": {
    "no": "C104",
    "name": "ドラゴン",
    "color": "緑"
  },
  "EN001": {
    "no": "EN001",
    "name": "ゴブリン",
    "color": "黒"
  },
  "EN005": {
    "no": "EN005",
    "name": "ジャイアントラット",
    "color": "黒"
  },
  "EN010": {
    "no": "EN010",
    "name": "ポイズンミスト",
    "color": "黒"
  },
  "EN011": {
    "no": "EN011",
    "name": "惑わしの妖精 \"エインセル\"",
    "color": "黒"
  },
  "EN020": {
    "no": "EN020",
    "name": "ダイアウルフ",
    "color": "黒"
  }
};

// 第2段の素体。内蔵CSVのヘッダから採取。
VbFxPreviewCards["C002"] = {"no":"C002","name":"マータ","color":"赤"};
VbFxPreviewCards["C008"] = {"no":"C008","name":"アラクネ","color":"赤"};
VbFxPreviewCards["C011"] = {"no":"C011","name":"サイレン","color":"赤"};
VbFxPreviewCards["C017"] = {"no":"C017","name":"メデューサ","color":"赤"};
VbFxPreviewCards["C019"] = {"no":"C019","name":"ケンタウロス","color":"赤"};
VbFxPreviewCards["C043"] = {"no":"C043","name":"アラッサス","color":"緑"};
VbFxPreviewCards["C090"] = {"no":"C090","name":"サキュバス","color":"紫"};

// 2026-10-12: 21キャラの名・色を内蔵CSVのヘッダから転記（シート本体は変更しない）。
VbFxPreviewCards["C004"]={"name":"サテュロス","color":"赤"};
VbFxPreviewCards["C009"]={"name":"ミノタウロス","color":"赤"};
VbFxPreviewCards["C020"]={"name":"ヘカトンケイル","color":"赤"};
VbFxPreviewCards["C021"]={"name":"ゾンビ","color":"青"};
VbFxPreviewCards["C029"]={"name":"ファントム","color":"青"};
VbFxPreviewCards["C034"]={"name":"エイドロン","color":"青"};
VbFxPreviewCards["C042"]={"name":"スリープシープ","color":"緑"};
VbFxPreviewCards["C056"]={"name":"スキュラ","color":"緑"};
VbFxPreviewCards["C060"]={"name":"ベヒーモス","color":"緑"};
VbFxPreviewCards["C064"]={"name":"シルフ","color":"黄"};
VbFxPreviewCards["C066"]={"name":"ウンディーネ","color":"黄"};
VbFxPreviewCards["C071"]={"name":"ニンフ","color":"黄"};
VbFxPreviewCards["C079"]={"name":"スプリガン","color":"黄"};
VbFxPreviewCards["C082"]={"name":"アークデーモン","color":"紫"};
VbFxPreviewCards["C083"]={"name":"グレムリン","color":"紫"};
VbFxPreviewCards["C084"]={"name":"インキュバス","color":"紫"};
VbFxPreviewCards["C089"]={"name":"ファミリア","color":"紫"};
VbFxPreviewCards["C094"]={"name":"カオス・インプ","color":"紫"};
VbFxPreviewCards["C095"]={"name":"リリス","color":"紫"};
VbFxPreviewCards["C097"]={"name":"オーバーロード","color":"紫"};
VbFxPreviewCards["C099"]={"name":"フィーンド","color":"紫"};
