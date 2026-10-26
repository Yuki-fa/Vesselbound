/* プレビュー専用の発生元・対象設定。戦闘ルールには使用しない。 */
var VbFxPreviewCatalog = {
  'dark-fire': { source: 'C034', mode: 'foes', note: '真上から見た黒紫の炎流。黒い煙と紫〜赤の火の縁を持つ多数の炎が敵方向へ流れる。画面端へ届いた後も燃え続け、最後の0.5秒で消える。' },
  banshee: { source: 'C034', mode: 'foe', note: '人魂のような青白い霊体。半透明の頭と、ゆらめく5本の尾、剥がれて漂う霊気。着弾で霊体がほどけ、渦を巻く霊気の筋と柔らかい波紋が広がる。' },
  resentment: { source: 'C034', mode: 'foe', note: '怨念は紫色の霊体。バンシーと同じ形で色を変える。' },
  lich: { source: 'C049', mode: 'foe', deadOrigin: true, note: 'リッチ自身ではなく、倒れた味方のカード中心から緑色の霊体が飛ぶ。金枠は死亡した味方。' },
  'great-shield': { source: 'C097', mode: 'self', note: '発生元から相手陣営へ、透明な扇形の膜と細い格子を一瞬だけ広げる。' },
  'cover-fire': { source: 'C061', mode: 'foe', note: '細い矢と短い残像を高速で飛ばす。着弾は小さな火花だけに抑える。' },
  shockwave: { source: 'C087', mode: 'foes', note: '乱れた青白い多層の前縁と後方の乱流が扇状に広がる。敵ごとの接触で閃光を出し、画面端まで届く。' },
  'demon-soul': { source: 'C123', mode: 'foes', note: '足元に赤い魔法陣。赤黒い厚い波が3度押し寄せ、通った跡に赤黒い霞が残る（画面端まで消えない）。波頭に火の粉と黒い煙。' },
  vrykolakas: { then: 'revive-gain', source: 'C042', mode: 'friend', note: '対象に不死者のオーラを纏わせ、続けて49「復活獲得」を自動で出す（ゲームでも本来のVFXの後に続ける）。' },
  dullahan: { source: 'C047', mode: 'foe', note: '骸骨のオーラが飛ぶ：青白い霊体の頭に骸骨の顔、周りを骨が回る。着弾で霊体がほどけ、骨が散る。' },
  'bone-chariot': { source: 'C048', mode: 'friend', note: 'カード外周の骨色の発光と渦に、陰影・割れ目を持つ頭蓋骨の魔法文様を7つ巡らせる。すべて真上から見た配置。' },
  jackalope: { source: 'C061', mode: 'green', note: '味方の緑キャラと、自然に揺らぐ緑の光の線で繋がる。線に沿って光の粒が流れ、繋がったカードの縁が緑に光る。' },
  dragonnet: { source: 'C064', mode: 'self', morph: 'CF004', note: '霧が最も濃い時点でドラゴネットの絵をドラゴン（CF004）へ差し替える。晴れた後に変化が見える。' },
  cockatrice: { source: 'C066', mode: 'foe', note: '対象のカードを一時的に石色へ変え、表面に短い亀裂を出す。終了時には元の色に戻す。' },
  bandersnatch: { source: 'C068', mode: 'self', morph: 'CF004', note: 'ドラゴネットと共通の変身VFX。霧が最も濃い時に絵が差し替わる。' },
  worm: { source: 'C069', mode: 'foes', note: '緑色の波動が敵全体を通過して画面端まで残る。各敵への通過時に onImpact を呼ぶ。毒札は対象の例示。' },
  wyvern: { source: 'C073', mode: 'foe', note: '風が対象へ届いた瞬間に白い3本の切り傷を出す。全尺480msの高速版。' },
  'frost-sprite': { source: 'C087', mode: 'foe', note: '輪郭と面のある8本のつらら状の氷が、白い冷気の尾を引いて飛ぶ。着弾で霜の結晶が放射状に伸び、氷片が散る。' },
  leprechaun: { source: 'C088', mode: 'friends', note: '味方の前後衛を一つの金色の光だまりで包む。カード外周の縁・円形の魔法陣・小さく集まる金粉を重ねる。0.3秒で満ち、0.8秒保ち、0.6秒で消える。' },
  melusine: { source: 'C089', mode: 'foes', note: '敵グループ全体に暗い緑の霧を流す。カードの輪郭は見える程度に残す。' },
  carbuncle: { source: 'C097', mode: 'foe', note: '発生元の結界の輪が砕け、薄桃色の破片が対象へ飛び、ぶつかって散る。金枠が結界を失ったキャラの位置。' },
  pixie: { source: 'C098', mode: 'pair', note: 'ビームで前衛の敵を捕縛し、その敵のカードを別の敵へ動かして攻撃させる。命中の通知は捕縛した敵、攻撃された敵の順。' },
  elemental: { source: 'C100', mode: 'self', note: '真上から見た虹色の炎。8色のノイズを持つプラズマがカード中心の周囲で燃え、円周方向へ渦を巻く。' },
  imp: { source: 'C106', mode: 'others', note: '発生元以外の敵・味方すべてから赤い粒子を吸い込む。粒子が集まるほど中心の赤い光が強くなる。' },
  wendigo: { source: 'C117', mode: 'foes', note: '白い冷気、霜の線、小さな結晶が放射状に敵を通過する。冷気は画面端まで消えない。' },
  nightmare: { source: 'C121', mode: 'self', note: 'カード外周を囲む紫の発光の縁に、黒い煙・逆回転するプラズマ・上から見た粒子の渦を重ねる。' },
  abyss: { source: 'C123', mode: 'self', note: 'アビス・バロンの案A。青黒い渦が逆回転し、暗いオーラをカードへ巻きつける。' },
  baron: { source: 'C123', mode: 'self', note: 'アビス・バロンの案B。赤い縁を持つ黒いオーラ。C123は「アビス・バロン」という1枚のカード。' },
  pegasus: { source: 'C096', mode: 'friend', note: '上からのスポットライトを円形の光だまりとして描く。淡い金色の魔法陣・白い核・光の粒が対象を照らす。' },
  direwolf: { source: 'C056', mode: 'summon', auxiliary: 'opening', note: '控えめな遠吠え（カード周りに収まる輪と小さな揺れ）の後、ウルフが左端から登場する。大きな咆哮は全体攻撃案Dへ移した。' },
  weaken: { source: 'C061', mode: 'foe', note: '対象のカードだけを430ms、小さく震わせる。枠・絵・文字を一体で動かす。' },
  'atk-down': { source: 'C087', mode: 'foe', note: '対象のカードを一瞬青白くする。描画用の色だけを変え、数字の変更は行わない。' },
  'all-sweep': { source: 'C056', mode: 'foes', proposal: 'A', note: '全体攻撃案A：乱れた輪郭と白い芯を持つ幅広い一閃。流体の帯と火花が敵全体を一瞬で薙ぎ払う。460ms。' },
  'all-ring': { source: 'C056', mode: 'foes', proposal: 'B', note: '全体攻撃案B：敵グループ中央の白い核から、真円の多層衝撃輪と青白い乱流が一瞬広がる。580ms。' },
  'all-cross': { source: 'C056', mode: 'foes', proposal: 'C', note: '全体攻撃案C：白い芯・色の帯・柔らかい残光を持つ2本の斬撃が交差する。散る粒子で敵全体の範囲を示す。460ms。' },
  'all-roar': { source: 'C056', mode: 'foes', proposal: 'D', note: '全体攻撃案D：ダイアウルフ当初の大きな咆哮。敵グループの中央から、ぼかした多重の輪・空気の圧・粉塵が全体へ広がり、画面が揺れる。900ms。' },
  'meteor-scroll': { source: 'C087', mode: 'foes', cue: 'impact', note: '画面上端の外から燃え盛る火球が落下（真上視点なので近づくほど大きくなる）。一瞬の白いフラッシュで火球を消し、変更前の全体攻撃素材 K009.webp を敵グループ上に出す。' },
  'shield-state': { source: 'C097', mode: 'self', note: 'カードを包む透明な膜（縁ほど濃く、ゆっくり呼吸する）と、表面をときどき通る斜めの光。周りを回る物は無し（ループ。SEは今の結界の音を維持）。' },
  'poison-state': { source: 'C069', mode: 'self', note: '毒が付いている間ずっと出す。脈打つ緑の縁・湧いて弾ける泡・まとわりつく霧（ループ／SEなし）。' },
  'weaken-state': { source: 'C061', mode: 'self', note: '弱体が付いている間ずっと出す。カードの上に紫灰色の暗い膜が垂れ込め、縁が弱々しく明滅し、粒が中心へ沈む（ループ／SEなし）。' },
  'guts-state': { source: 'C056', mode: 'self', note: '根性を持っている間ずっと出す。鼓動のように脈打つ橙色の縁・縁を巡る炎・火の粉（ループ／SEなし）。' },
  titan: { source: 'C019', mode: 'foes', note: 'タイタン（開戦：全ての敵に弱体）。踏み鳴らしで足元に土煙、画面が揺れ、地割れと土煙の波が敵全体へ走る。届いた敵の足元が割れ、紫の気配が沈む。' },
  cyclops: { source: 'C023', mode: 'self', note: 'サイクロプス（3マナ：全体攻撃を得る）。赤金の力が渦を巻いて集まり、光条と衝撃の輪が弾け、カード型の炎のオーラを纏う。' },
  wraith: { source: 'C035', mode: 'friend', deadOrigin: true, note: 'レイス（死亡：味方の負傷効果を発動）。倒れたレイスの足元に禍々しい陣、黒紫の瘴気が味方へ流れ込み、まとわりつく。' },
  'battle-summon': { source: 'C056', mode: 'self', note: '戦闘中の召喚。マスに魔法陣が開き、光が立ち上がって閃光とともにカードが現れる。' },
  'revive-summon': { source: 'C042', mode: 'self', note: '復活による召喚。散った魂の欠片が渦を巻いて集まり、ぼやけた姿が青白い光とともに形を取り戻す。' },
  'shield-gain': { source: 'C097', mode: 'self', note: '結界を得た瞬間。金の縁が外から締まって現れ、結界の状態表示へ移る。' },
  'revive-gain': { source: 'C042', mode: 'self', note: '復活を得た瞬間。青白い縁が外から締まって現れ、復活の状態表示へ移る。' },
  'shield-break': { source: 'C097', mode: 'self', note: '結界消失。金の膜にひびが走り、一瞬光って砕け、金の破片が飛び散って消える。' },
  'revive-state': { source: 'C042', mode: 'self', note: '復活効果が付いている間ずっと出す青白いオーラ（ループ／SEなし）。停止するまで出し続ける。' },
  // 第2段：元の番号を保ったコード描画。
  "hit-burst": {"source": "C056", "mode": "foe", "sourceCode": "hit", "note": "砂金色の短い火花と薄い煙。白い面でカードを覆わず、細い筋と小さな核で衝突を示す。", "notice": "第2段 · 元の番号 hit · 基準尺 800ms。画像は方向性の参考。"},
  "attack-recoil": {"source": "C007", "mode": "self", "sourceCode": "C007", "note": "赤橙の外周リング、琥珀の軌道光、薄い霞。赤い反撃の環をカードの周りに残す。", "notice": "第2段 · 元の番号 C002 · 基準尺 700ms。画像は方向性の参考。"},
  "arachne-ring": {"source": "C013", "mode": "friends", "sourceCode": "C013", "note": "2026-10-15作り直し：アラクネに熱が集まり、橙の熱波が味方全体へ広がる。届いた瞬間に強化（金の炎）とダメージ（火の弾け）を同時に出す。", "notice": "第2段 · 元の番号 C008 · 旧素材は踏襲しない（利用者指定）。"},
  "siren-wave": {"source": "C016", "mode": "foes", "sourceCode": "C016", "note": "淡い金の細い波紋と浮遊光。発生元から拡大し、波の縁がカードへ届く順に命中する。", "notice": "第2段 · 元の番号 C011 · 基準尺 800ms。画像は方向性の参考。", "motion": "expand"},
  "medusa-gaze": {"source": "C022", "mode": "foe", "sourceCode": "C022", "note": "白金の短い稲光と桃色の欠片。前半の一閃を強くし、後半には霞だけを残す。", "notice": "第2段 · 元の番号 C017 · 基準尺 800ms。画像は方向性の参考。"},
  "centaur-missile": {"source": "C024", "mode": "foe", "sourceCode": "E042_1", "note": "緑の先端に橙の二筋の尾。先端を中心へ合わせ、既存と同じ加速・曲線・上向きの姿勢で飛ぶ。", "notice": "第2段 · 元の番号 C024_1 · 基準尺 448ms。画像は方向性の参考。", "motion": "projectile", "impactOffsetY": 0},
  "centaur-impact": {"source": "C024", "mode": "foe", "sourceCode": "E042_2", "note": "緑の横長の衝撃と金の火花。飛翔体の色を着弾へ引き継ぐ。", "notice": "第2段 · 元の番号 C024_2 · 基準尺 800ms。画像は方向性の参考。"},
  "flame-sweep": {"source": "C058", "mode": "foes", "sourceCode": "C058", "note": "橙の流れる炎、細い黄金の芯、控えめな煙。カード先端を原点に、対象までの距離と角度で伸びる。", "notice": "第2段 · 元の番号 C043 · 基準尺 700ms。画像は方向性の参考。", "motion": "sweep"},
  "steal-mark": {"source": "C115", "mode": "foe", "sourceCode": "C115", "note": "桃色の煙と小さなハート。柔らかい霧を主にし、ハートは少数だけ浮かべる。", "notice": "第2段 · 元の番号 C090 · 基準尺 800ms。画像は方向性の参考。"},
  "fire-arrow": {"source": "C056", "mode": "foe", "sourceCode": "E058_1", "note": "橙の彗星の先端と赤桃色の尾。尾を二層の細い帯にして飛ばす。", "notice": "第2段 · 元の番号 E058_1 · 基準尺 448ms。画像は方向性の参考。", "motion": "projectile", "impactOffsetY": 0.18},
  "fire-arrow-impact": {"source": "C056", "mode": "foe", "sourceCode": "E058_2", "note": "橙の横長の火花と短い衝撃輪。白い核を小さくしてカードの絵を残す。", "notice": "第2段 · 元の番号 E058_2 · 基準尺 800ms。画像は方向性の参考。"},
  "death-mark": {"source": "C042", "mode": "self", "sourceCode": "K001", "note": "紫の蒸気と細かな光。暗い外周と薄い粒で死亡効果の気配を出す。", "notice": "第2段 · 元の番号 K001 · 基準尺 800ms。画像は方向性の参考。"},
  "fang-poison": {"source": "C056", "mode": "foe", "sourceCode": "K003", "note": "黄緑の丸い毒霧と泡の輪。元の丸い塊を薄いプラズマと少数の環で表す。", "notice": "第2段 · 元の番号 K003 · 基準尺 800ms。画像は方向性の参考。"},
  "piercing-streak": {"source": "C056", "mode": "foe", "sourceCode": "K007", "note": "細い青白い貫通線。進行方向を向く青い二筋と短い尾で貫く。", "notice": "第2段 · 元の番号 K007 · 基準尺 420ms。画像は方向性の参考。", "motion": "pierce", "impactOffsetY": 0},
  "tri-streak": {"source": "C056", "mode": "front", "sourceCode": "K008", "note": "青白い横薙ぎの一閃。三体分の列を横切る細い帯と短い火花。", "notice": "第2段 · 元の番号 K008 · 基準尺 800ms。画像は方向性の参考。", "motion": "row"},
  "contact-burst": {"source": "C056", "mode": "foe", "sourceCode": "K009", "note": "灰色の二波の煙と金の衝撃。二回の膨らみを時間曲線で表す（旧meteor-scroll内の画像は別途保留）。", "notice": "第2段 · 元の番号 K009 · 基準尺 800ms。画像は方向性の参考。"},
  "poison-tick": {"source": "C056", "mode": "foe", "sourceCode": "K017", "note": "縦に立つ緑の毒霧と泡。毒牙より暗くして継続ダメージを見分ける。", "notice": "第2段 · 元の番号 K017 · 基準尺 800ms。画像は方向性の参考。"},
  "shield-contact": {"source": "C056", "mode": "foe", "sourceCode": "K018", "note": "小さな青い接触光と波紋。結界への命中を短い青の環で示す。", "notice": "第2段 · 元の番号 K018 · 基準尺 800ms。画像は方向性の参考。"},
  "seal-release": {"source": "C042", "mode": "self", "sourceCode": "K019", "note": "紫の魔法陣と三角の記号。1750msで展開から収束へ折り返し、解封の合図を保つ。", "notice": "第2段 · 元の番号 K019 · 基準尺 3500ms。画像は方向性の参考。"},
  "revive-burst": {"source": "C042", "mode": "self", "sourceCode": "K020", "note": "青の光球、輪、少数の欠片。復活の青を細い環と渦で表す（ゲームの主経路はrevive-summon）。", "notice": "第2段 · 元の番号 K020 · 基準尺 1500ms。画像は方向性の参考。"},
  "mana-cue": {"source": "C056", "mode": "self", "sourceCode": "K024", "note": "水色の魔法陣と回転する三角。マナ効果の合図を細い環と幾何学模様で示す。", "notice": "第2段 · 元の番号 K024 · 基準尺 900ms。画像は方向性の参考。"},
  "summon-sigil": {"source": "C056", "mode": "self", "sourceCode": "S001", "note": "緑の召喚球と渦の弧。500msのカード出現の合図を持つ（ゲームの主経路はbattle-summon）。", "notice": "第2段 · 元の番号 S001 · 基準尺 1000ms。画像は方向性の参考。"},
  "gold-gain": {"source": "C056", "mode": "self", "sourceCode": "S003", "note": "陰影のある金貨と薄い灰色の煙。輪郭と面を持つコインを少数だけ散らす。", "notice": "第2段 · 元の番号 S003 · 基準尺 700ms。画像は方向性の参考。"},
  "mana-gain": {"source": "C056", "mode": "self", "sourceCode": "S004", "note": "青白い縦長の宝石。小さな結晶と光をカード中央の少し上から浮かせる。", "notice": "第2段 · 元の番号 S004 · 基準尺 670ms。画像は方向性の参考。", "motion": "rise"},
  "attack-buff": {"source": "C056", "mode": "self", "sourceCode": "S005", "note": "金のほつれた環と星の光。細い金の二重輪を主にして攻撃バフを表す。", "notice": "第2段 · 元の番号 S005 · 基準尺 700ms。画像は方向性の参考。"},
  "injury-buff": {"source": "C056", "mode": "self", "sourceCode": "S006", "note": "橙のほつれた環と点の光。負傷効果のオーラを控えめな赤橙で描く。", "notice": "第2段 · 元の番号 S006 · 基準尺 700ms。画像は方向性の参考。"},
  "death-buff": {"source": "C056", "mode": "self", "sourceCode": "S007", "note": "青緑の環と青の破片。死亡効果のオーラを冷たい色で見分ける。", "notice": "第2段 · 元の番号 S007 · 基準尺 700ms。画像は方向性の参考。"},
  "mana-buff": {"source": "C056", "mode": "self", "sourceCode": "S008", "note": "緑の環と丸い光。マナ効果のオーラを薄い緑の二重輪で表す。", "notice": "第2段 · 元の番号 S008 · 基準尺 700ms。画像は方向性の参考。"},
  "aura-buff": {"source": "C056", "mode": "self", "sourceCode": "S009", "note": "淡い青緑の環と三角片。常時バフの静かなオーラとして繰り返し再生する。", "notice": "第2段 · 元の番号 S009 · 基準尺 700ms。画像は方向性の参考。"},
  "opening-sigil": {"source": "C056", "mode": "self", "sourceCode": "appearance_sheet", "note": "着地の足元に舞う砂煙（左右へ転がる塊・昇る土埃・跳ねる砂粒）と一瞬の平たい金の閃き。カード幅に収める。396msから現れ、560msから薄れ、980msで消す。", "notice": "第2段 · 元の番号 appearance_sheet · 基準尺 980ms。画像は方向性の参考。", "motion": "opening"},
  "board-summon": {"source": "C056", "mode": "self", "sourceCode": "board_change1", "note": "緑の薄い輪と少数の粒。500msでカードを差し替え、1200msで消す。", "notice": "第2段 · 元の番号 board_change1 · 基準尺 1200ms。画像は方向性の参考。", "motion": "board"},
  "board-enchant": {"source": "C056", "mode": "self", "sourceCode": "board_change2", "note": "青の薄い輪と少数の粒。召喚と同じ尺・密度にして強化の色だけを見分ける。", "notice": "第2段 · 元の番号 board_change2 · 基準尺 1200ms。画像は方向性の参考。", "motion": "board"},
  // 2026-10-12: 新21キャラ。サンプル回数はプレビュー専用。
  "satyr": {"source": "C009", "mode": "self", "sampleValue": 1, "value": 1, "note": "足元の青い魔法陣から3本の魔力が湧き上がり、既存のマナ獲得へ続く。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "hecatoncheir": {"source": "C025", "mode": "self", "sampleValue": 1, "value": 1, "note": "確率に当たった負傷だけ小径の陣から青い魔力を噴く。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "zombie": {"source": "C031", "mode": "self", "sampleValue": 1, "value": 1, "note": "死亡位置から青白い魂が浮上し、マナ獲得につながる。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "behemoth": {"source": "C075", "mode": "self", "sampleValue": 1, "value": 1, "note": "青い結晶の魔力を白熱させ、細い閃光と小片へ炸裂させる。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "sylph": {"source": "C084", "mode": "self", "sampleValue": 1, "value": 1, "note": "命中時に青白い旋風を巻き、青い魔力を湧かせる。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "nymph": {"source": "C091", "mode": "colors", "sampleValue": 5, "value": 5, "note": "実際に存在する各色の代表から細光を集め、色数だけ小光球を作る。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "familiar": {"source": "C114", "mode": "foe", "sampleValue": 1, "value": 1, "note": "命中した敵から赤い血滴を吸い上げ、中央で青い魔力へ転換する。", "new1012": true, "then": "mana-gain", "thenAt": "source"},
  "fiend": {"source": "C124", "mode": "foe", "sampleValue": 1, "value": 1, "note": "黒紫の核と紫の尾を持つ弾。実戦はdamage1件につき1発。", "new1012": true},
  "phantom": {"source": "C039", "mode": "kenzoku", "sampleValue": 1, "value": 1, "note": "半透明の波を戦場へ広げ、対象の眷属にだけ小さな霊火の紋章を約2秒残す。", "new1012": true},
  "eidolon": {"source": "C044", "mode": "kenzoku", "sampleValue": 2, "value": 2, "note": "ファントムと同じ定義。入力value=2で霊火の径だけ少し強める。", "new1012": true},
  "arch-demon": {"source": "C107", "mode": "purple", "sampleValue": 3, "value": 3, "note": "紫の味方だけを魔力線で結び、実際の反復回数ぶん魔力が流れて脈打つ。", "new1012": true},
  "gremlin": {"source": "C108", "mode": "foes", "sampleValue": 1, "value": 1, "note": "煤色の波と歯車粉を敵へ送り、HPの萎縮を使わずATK減少へ引き継ぐ。", "new1012": true, "then": "atk-down", "thenSilent": true},
  "lilith": {"source": "C120", "mode": "sequence", "sampleValue": 3, "value": 3, "note": "実際の回数だけ赤紫の花弁紋章を作り、順に飛ばす。重複する対象も同じ回数だけ脈動。", "new1012": true},
  // 2026-10-12指定・撮影第2回: 背景を伴わない頭巾・袖・裾の輪郭で倍化を示す。
  // 2026-10-12指定・撮影第3回: 元絵に沿う座ったローブ姿の輪郭へ修正。
  "overlord": {"source": "C122", "mode": "self", "sampleValue": 1, "value": 1, "note": "座ったローブ姿の二重影の後、後方の巨大な残像が本体へ重なる。数値別の表現をせず全体の倍化を示す。", "new1012": true},
  "minotaur": {"source": "C014", "mode": "foe", "sampleValue": 3, "value": 3, "note": "赤い怒りの閃光→既存結界獲得→敵への赤い照準→実際の割り込み攻撃。", "new1012": true},
  "sleep-sheep": {"source": "C057", "mode": "self", "sampleValue": 3, "value": 3, "note": "赤い血の羊毛がほどけて3滴になる。合体時の滴数はblood_set.gainedを使う。", "new1012": true},
  "scylla": {"source": "C071", "mode": "foes", "sampleValue": 1, "value": 1, "note": "黄緑の飛沫を対象全員へ降らせ、元の毒付与・毒の状態表示へつなぐ。", "new1012": true},
  "undine": {"source": "C086", "mode": "foes", "sampleValue": 1, "value": 1, "note": "濁った灰紫・水色の霧が敵を鎮め、元の弱体獲得へつなぐ。", "new1012": true, "then": "weaken"},
  "spriggan": {"source": "C099", "mode": "friend", "sampleValue": 1, "value": 1, "note": "地面から枝と蔓の輪が育ち、淡い光の環へ変わって既存結界へつなぐ。", "new1012": true, "then": "shield-gain"},
  "incubus": {"source": "C109", "mode": "foe", "sampleValue": 2, "value": 2, "note": "実際に倒した敵の位置を赤い霧でほどき、2滴へまとめて消す。", "new1012": true},
  "chaos-imp": {"source": "C119", "mode": "friend", "sampleValue": 1, "value": 1, "note": "インプから歪んだ紫の稲妻が跳び、小径の開戦陣へ再点火。開戦効果本体は元の演出へ渡す。", "new1012": true},
  // 2026-10-17 未設定だった演出の新規制作（Claude直接）
  "dragon-pact": {"source": "C056", "mode": "foe", "note": "竜の契約（E008）。赤黒い渦に橙金の炎が集まり、白金の芯の火球が長い尾を引いて飛び、着弾で炎が爆ぜる。実戦は攻撃効果のdamage1件につき1発。"},
  "rage-shards": {"source": "C056", "mode": "foe", "note": "逆上（E032）。負傷したカードに赤い裂け目が走り、3本の赤い破片が弧を描いて対象へ刺さる。"},
  "storm-ring": {"source": "C056", "mode": "foes", "note": "嵐の指輪（R023）。敵の上に暗雲が垂れこめ、上端から各敵へ雷が2度落ちる。"},
  "scroll-shield": {"source": "C056", "mode": "self", "note": "幻視の巻物（I004）の使用（2026-10-18 盾と入れ替え）。青い魔法陣と紋の輪が集まり、結晶の紋が刻まれる。"},
  "scroll-revive": {"source": "C056", "mode": "self", "note": "盾の巻物（I003）の使用（2026-10-18 幻視と入れ替え）。金の魔法陣と紋の輪が集まり、羽の紋が刻まれる。"},
  "scroll-giant": {"source": "C056", "mode": "self", "note": "巨大化の巻物（I005）の使用。橙の魔法陣と紋の輪が集まり、星の紋が刻まれる。"},
  "scroll-mana": {"source": "C056", "mode": "self", "note": "魔力の巻物（I011）の使用。水色の魔法陣と紋の輪が集まり、結晶の紋が刻まれる。"},
  "scroll-guts": {"source": "C056", "mode": "self", "note": "鼓舞の旗（I012）の使用。赤い魔法陣と紋の輪が集まり、閃光の紋が刻まれる。"},
  "ring-eye-red": {"source": "C056", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）赤い瞳の指輪（R001）の開戦。赤の味方の縁が赤く光り、額に結晶が灯って光の粒が昇る。"},
  "ring-eye-blue": {"source": "C056", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）青い瞳の指輪（R002）の開戦。"},
  "ring-eye-green": {"source": "C056", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）緑の瞳の指輪（R003）の開戦。"},
  "ring-eye-yellow": {"source": "C056", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）黄の瞳の指輪（R004）の開戦。"},
  "ring-eye-purple": {"source": "C056", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）紫の瞳の指輪（R005）の開戦。"},
  "ring-eye-rainbow": {"source": "C056", "mode": "friends", "note": "（未割り当て：瞳の指輪から外した。別で使う予定）虹の瞳の指輪（R032）の開戦。味方全員の縁を5色が順に走り、白い結晶と色の粒が昇る。"},
  "paladin-ring": {"source": "C056", "mode": "friends", "note": "聖騎士の指輪（R019）の開戦。金の縁が二重に重なり、金の結晶が灯ってHPが倍になる。"},
  "speed-ring": {"source": "C056", "mode": "friend", "note": "神速の指輪（R031）の開戦。白金の集中線が左端のカードへ集まり、光の輪とともに前へ踏み出す。"},
  "toughness-ring": {"source": "C056", "mode": "friends", "note": "強靭の指輪（R015）の開戦：全ての味方に「負傷：全ての味方は+1/+1」を付与（2026-10-26 本文変更）。琥珀の縁が光り、光の粒が昇る。紋は出さない。"},
  "curse-ring": {"source": "C056", "mode": "foes", "note": "呪いの指輪（R042）・憎悪の指輪（R041）の開戦。敵に黒紫の煙と呪いの陣がまとわりつき、色が沈む。"},
  "sealed-power": {"source": "C056", "mode": "self", "note": "封印されしもの（E057）の解放。紫の封印の輪が砕け、金の裂け目の光が走り、金の光の柱が立つ。"},
  "void-mastery": {"source": "C118", "mode": "friends", "note": "ヴォイド・ウォーカー（C118）の開戦。虚空の渦と紋の輪から紫の稲妻が紫の味方へ走り、縮む紋の輪と紫の縁で熟練が刻まれる。"},
  "keyword-grant": {"source": "C056", "mode": "friends", "note": "金床の賢者“シンドリ”（EN044）の開戦。金の紋の輪が味方へ縮み、金の縁でキーワード（貫通）が刻まれる。"},
  "fate-sever": {"source": "C056", "mode": "self", "note": "刻を織る者“ウルズ・ラグナ”（EN075_1）の開戦。時の紋の輪が回り、白い亀裂の光が走って画面が灰色に沈み、敵のライフが1になる。"},
  "penance-ring": {"source": "C056", "mode": "friends", "note": "苦行の指輪（R012）の開戦。暗い紅の茨の輪が全ての味方を締め付け、締まった瞬間に赤い裂け目と血の滴で1ダメージ。"},
  "alchemy": {"source": "C056", "mode": "self", "note": "錬成（E030）の終戦。金貨が渦を巻いて金の錬成陣へ吸い込まれ、白金の閃光とともにアイテムの結晶が生まれる。"},
  "hydra-reward": {"source": "C070", "mode": "self", "note": "ハイドラ（C070）の終戦。翠の首が3本、彗星の尾を引いて上へ伸び、先に報酬の宝石が灯る。"},
  "gold-loss": {"source": "C056", "mode": "self", "note": "苦悶の刻印（E078）の死亡。紫黒の刻印が疼き、金貨が上へ弾けてから重く落ち、黒い靄に崩れる。"},
  "suffering-brand": {"source": "C056", "mode": "friends", "note": "受難の刻印（E077）の死亡。倒れた場所の刻印が割れ、暗い紅の呪いが全ての味方へ飛んでダメージを刻む。"},
  "soul-recall": {"source": "C041", "mode": "self", "note": "レムレース（C041）の死亡。倒れた場所に青白い魂が渦を巻いて集まり、光の柱とともに死者を呼び戻す（続けて登場演出でカードが出る）。"},
  "undying-ring": {"source": "C056", "mode": "self", "note": "不死の指輪（R017）。前衛が全滅した時、陣の中央に死霊術の陣が開き、骨の白い光の柱が3本立つ（続けて青スケルトンが3体出る）。"},
  "oni-ring": {"source": "C056", "mode": "self", "note": "鬼神の指輪（R020）。陣の中央に紅蓮の陣が開き、炎の柱と熱の輪が弾ける（続けて赤イフリートが出て攻撃する）。"},
  "map-life": {"source": "C056", "mode": "friends", "note": "生命の力（魔導板）の開戦。緑の生命の光が2度脈打ち、HPが倍になる。"},
  "map-resonance": {"source": "C056", "mode": "friends", "note": "共鳴の力（魔導板）の開戦。同じ色の味方に金の波紋が重なり、+3/+3。"},
  "map-duplicate": {"source": "C056", "mode": "self", "note": "複製の力（魔導板）の開戦。元のカードに鏡の光が走り、写しが生まれる（続けて登場演出でコピーが出る）。"},
  "intimidate-ring": {"source": "C056", "mode": "foes", "note": "威圧の指輪（R016）の開戦。敵に暗い紅の重圧がのしかかり、カードが沈む（続けて弱体の付与）。"},
  "magic-ring-mana": {"source": "C056", "mode": "self", "note": "魔力の指輪（R013）。敵が倒れるたび、陣の中央に蒼い魔力の結晶が弾けて2マナを得る。"}
};

/* カード名・色は内蔵CSVのヘッダから抽出したプレビュー用スナップショット。 */
var VbFxPreviewCards = {
  "C062": { "no": "C062", "name": "ユミル", "color": "緑" },
  "C095": { "no": "C095", "name": "グリマルキン", "color": "黄" },
  "C008": { "no": "C008", "name": "ゴーレム", "color": "赤" },
  "C019": { "no": "C019", "name": "タイタン", "color": "赤" },
  "C023": { "no": "C023", "name": "サイクロプス", "color": "赤" },
  "C035": { "no": "C035", "name": "レイス", "color": "青" },
  "C034": {
    "no": "C034",
    "name": "バンシー",
    "color": "青"
  },
  "C049": {
    "no": "C049",
    "name": "リッチ",
    "color": "青"
  },
  "C042": {
    "no": "C042",
    "name": "ヴリコラカス",
    "color": "青"
  },
  "C047": {
    "no": "C047",
    "name": "デュラハン",
    "color": "青"
  },
  "C048": {
    "no": "C048",
    "name": "ボーンチャリオット",
    "color": "青"
  },
  "C056": {
    "no": "C056",
    "name": "ダイアウルフ",
    "color": "緑"
  },
  "C061": {
    "no": "C061",
    "name": "ジャッカロープ",
    "color": "緑"
  },
  "C064": {
    "no": "C064",
    "name": "ドラゴネット",
    "color": "緑"
  },
  "C066": {
    "no": "C066",
    "name": "コカトリス",
    "color": "緑"
  },
  "C068": {
    "no": "C068",
    "name": "バンダースナッチ",
    "color": "緑"
  },
  "C069": {
    "no": "C069",
    "name": "ワーム",
    "color": "緑"
  },
  "C073": {
    "no": "C073",
    "name": "ワイバーン",
    "color": "緑"
  },
  "C087": {
    "no": "C087",
    "name": "フロスト・スプライト",
    "color": "黄"
  },
  "C088": {
    "no": "C088",
    "name": "レプラコーン",
    "color": "黄"
  },
  "C089": {
    "no": "C089",
    "name": "メリュジーヌ",
    "color": "黄"
  },
  "C096": {
    "no": "C096",
    "name": "ペガサス",
    "color": "黄"
  },
  "C097": {
    "no": "C097",
    "name": "カーバンクル",
    "color": "黄"
  },
  "C098": {
    "no": "C098",
    "name": "ピクシー",
    "color": "黄"
  },
  "C100": {
    "no": "C100",
    "name": "エレメンタル",
    "color": "黄"
  },
  "C106": {
    "no": "C106",
    "name": "インプ",
    "color": "紫"
  },
  "C117": {
    "no": "C117",
    "name": "ウェンディゴ",
    "color": "紫"
  },
  "C121": {
    "no": "C121",
    "name": "ナイトメア",
    "color": "紫"
  },
  "C123": {
    "no": "C123",
    "name": "アビス・バロン",
    "color": "紫"
  },
  "CF002": {
    "no": "CF002",
    "name": "ウルフ",
    "color": "緑"
  },
  "CF004": {
    "no": "CF004",
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
VbFxPreviewCards["C007"] = {"no":"C007","name":"マータ","color":"赤"};
VbFxPreviewCards["C013"] = {"no":"C013","name":"アラクネ","color":"赤"};
VbFxPreviewCards["C016"] = {"no":"C016","name":"サイレン","color":"赤"};
VbFxPreviewCards["C022"] = {"no":"C022","name":"メデューサ","color":"赤"};
VbFxPreviewCards["C024"] = {"no":"C024","name":"ケンタウロス","color":"赤"};
VbFxPreviewCards["C058"] = {"no":"C058","name":"アラッサス","color":"緑"};
VbFxPreviewCards["C115"] = {"no":"C115","name":"サキュバス","color":"紫"};

// 2026-10-12: 21キャラの名・色を内蔵CSVのヘッダから転記（シート本体は変更しない）。
VbFxPreviewCards["C009"]={"name":"サテュロス","color":"赤"};
VbFxPreviewCards["C014"]={"name":"ミノタウロス","color":"赤"};
VbFxPreviewCards["C025"]={"name":"ヘカトンケイル","color":"赤"};
VbFxPreviewCards["C031"]={"name":"ゾンビ","color":"青"};
VbFxPreviewCards["C039"]={"name":"ファントム","color":"青"};
VbFxPreviewCards["C044"]={"name":"エイドロン","color":"青"};
VbFxPreviewCards["C057"]={"name":"スリープシープ","color":"緑"};
VbFxPreviewCards["C071"]={"name":"スキュラ","color":"緑"};
VbFxPreviewCards["C075"]={"name":"ベヒーモス","color":"緑"};
VbFxPreviewCards["C084"]={"name":"シルフ","color":"黄"};
VbFxPreviewCards["C086"]={"name":"ウンディーネ","color":"黄"};
VbFxPreviewCards["C091"]={"name":"ニンフ","color":"黄"};
VbFxPreviewCards["C099"]={"name":"スプリガン","color":"黄"};
VbFxPreviewCards["C107"]={"name":"アークデーモン","color":"紫"};
VbFxPreviewCards["C108"]={"name":"グレムリン","color":"紫"};
VbFxPreviewCards["C109"]={"name":"インキュバス","color":"紫"};
VbFxPreviewCards["C114"]={"name":"ファミリア","color":"紫"};
VbFxPreviewCards["C119"]={"name":"カオス・インプ","color":"紫"};
VbFxPreviewCards["C120"]={"name":"リリス","color":"紫"};
VbFxPreviewCards["C122"]={"name":"オーバーロード","color":"紫"};
VbFxPreviewCards["C124"]={"name":"フィーンド","color":"紫"};
// 2026-10-23 VFX の全検査で新しく作った演出（利用者の確認待ち）。
Object.assign(VbFxPreviewCatalog, {
  "alastor-brand": {"source": "C013", "mode": "friend", "note": "（絵が未着のため見本はアラクネ）アラストル（C001。2026-10-25 新しいキャラクター）の3マナ毎：発生元から紅い光が味方へ伝い、味方の縁に火の呪印（負傷：ランダムな敵に1ダメージ）が刻まれる。"},
  "erinyes-flame": {"source": "C013", "mode": "foe", "note": "エリニュス（C002）の常時：赤の味方が負傷するたび、紅紫の復讐の火がランダムな敵へ飛ぶ。"},
  "banshee-miasma": {"source": "C013", "mode": "foes", "note": "バンシー（C034）の死亡：全ての敵に毒1と弱体1。毒緑と紫（毒と弱体の色）の波が広がって敵全員へ届く。2026-10-25 利用者指摘でエキドナ（echidna-wave）から付け替えて改名。"},
  "atlas-burden": {"source": "C013", "mode": "friends", "note": "アトラス（C005）の常時：敵から受けたダメージの半分を、琥珀と土色の重い光で他の全ての味方へ割り振る。"},
  "thunderbird-charge": {"source": "C013", "mode": "self", "note": "サンダーバード（C052）の2マナ（このゲーム中、味方の眷属は衝撃を得る）：2026-10-25 作り直し。常時の強化の層組みを金色の雷の充填に。輪と光が自分へ収束し、白金の閃きと火花が散る（自分がダメージを受けるように見えないバフの形）。"},
  "dark-fireball": {"source": "C056", "mode": "foe", "note": "闇の炎（E006 の死亡：ランダムな敵2体に3ダメージ。2026-10-26 利用者指定で全体の黒い炎の波から作り替え）：竜の火球の層組みを黒と紫の炎に。黒い煙の尾を引く火球が敵1体ずつへ飛んで爆ぜる。"},
  "poison-spit": {"source": "C056", "mode": "foe", "note": "毒袋（E015 の死亡：ランダムな敵2体に毒2。2026-10-26 利用者指定）：酸の緑の毒液が尾を引いて飛び、着弾で毒の滴が跳ねる。単体に飛ばす毒の共通演出（全体はスキュラの波）。"},
  "weaken-wave": {"source": "C013", "mode": "foes", "note": "マータ（負傷：全ての敵に弱体1）・カトブレパス（死亡：全てのキャラクターに弱体2）（2026-10-26 利用者指定）：バンシーの波の色違い。紫の波が広がって全員へ届く。"},
  "keyword-grant-fang": {"source": "C056", "mode": "friend", "note": "毒牙を与える（毒牙の巻物など。2026-10-26 利用者指定：キーワードの付与の色違い）。緑の紋の輪が縮み、縁に刻まれる。"},
  "keyword-grant-first": {"source": "C056", "mode": "friend", "note": "先制を与える（先制の巻物など。2026-10-26 利用者指定：キーワードの付与の色違い）。空色の紋の輪が縮み、縁に刻まれる。"},
  "scroll-guts-shield": {"source": "C056", "mode": "self", "note": "盾の巻物（2026-10-26 利用者指定：鼓舞の旗の青の色違い）。"},
  "scroll-guts-regen": {"source": "C056", "mode": "self", "note": "再生の巻物（2026-10-26 利用者指定：鼓舞の旗の翠の色違い）。"},
  "scroll-guts-fang": {"source": "C056", "mode": "self", "note": "毒牙の巻物（2026-10-26 利用者指定：鼓舞の旗の黄緑の色違い）。"},
  "scroll-guts-evil-eye": {"source": "C056", "mode": "self", "note": "邪眼の巻物（2026-10-26 利用者指定：鼓舞の旗の紫の色違い）。"},
  "scroll-guts-impact": {"source": "C056", "mode": "self", "note": "衝撃の巻物（2026-10-26 利用者指定：鼓舞の旗の黄の色違い）。"},
  "scroll-guts-double": {"source": "C056", "mode": "self", "note": "二段攻撃の巻物（2026-10-26 利用者指定：鼓舞の旗の橙の色違い）。"},
  "scroll-guts-stealth": {"source": "C056", "mode": "self", "note": "隠密の巻物（2026-10-26 利用者指定：鼓舞の旗の灰緑の色違い）。"},
  "scroll-guts-first": {"source": "C056", "mode": "self", "note": "先制の巻物（2026-10-26 利用者指定：鼓舞の旗の空色の色違い）。"},
  "scroll-guts-tri": {"source": "C056", "mode": "self", "note": "三方向攻撃の巻物（2026-10-26 利用者指定：鼓舞の旗の深紅の色違い）。"},
  "scroll-guts-drain": {"source": "C056", "mode": "self", "note": "生命吸収の巻物（2026-10-26 利用者指定：鼓舞の旗の紅紫の色違い）。"},
  "scroll-guts-pierce": {"source": "C056", "mode": "self", "note": "貫通の巻物（2026-10-26 利用者指定：鼓舞の旗の白青の色違い）。"},
  "scroll-guts-veteran": {"source": "C056", "mode": "self", "note": "老練の巻物（2026-10-26 利用者指定：鼓舞の旗の青銅の色違い）。"},
  "scroll-sealed-reverse": {"source": "C056", "mode": "self", "note": "静寂の巻物・隕石の巻物・生贄人形・召竜の巻物（次の戦闘で効く。2026-10-26 利用者指定：魂交換の巻物＝先制の色のキーワード付与を逆再生し紫紺の色違い）。使った瞬間にアイテムの枠から。"},
  "portal-vortex": {"source": "C056", "mode": "self", "note": "ポータルの巻物（2026-10-26 利用者指定）：画面全体が渦を巻き、中心の暗闇へ加速しながら吸い込まれる。ゲームでは画面全体から出す。"},
  "chimera-blessing": {"source": "C056", "mode": "friend", "note": "キマイラ（C054 開戦：ランダムな味方は+2/+2。味方の色の数だけ繰り返す。2026-10-26 新作）：金の炎が味方へ伝い、金と翠の炎の粒が宿る。"},
  "thunder-strike": {"source": "C013", "mode": "self", "note": "暗雲から黄金の稲妻が落ちる（旧サンダーバードの演出。2026-10-26 利用者指定：アークデーモン C124 に割り当て）。"},
  "kele-blood-nova": {"source": "C013", "mode": "foes", "note": "ケール（C105）の常時：血が3の倍数になった時、深紅の精髄が昇り、深紅の衝撃波が全ての敵へ広がる（敵が死ねば繰り返す）。"},
  "hellknight-slash": {"source": "C013", "mode": "friend", "note": "ヘルナイトの起動（C116。2026-10-25 利用者指定）：破壊されるカード（発生元）を赤い剣戟が左上→右下へ斜めに一閃し、切り口から立つ深紅の精髄が光の筋になってヘルナイト（対象。LABでは隣の味方）へ流れ、吸い込んだヘルナイトが赤黒いオーラで脈打つ。カードが斜めに切れてずれながら消える動きはゲーム側（activation.js）で付ける。"},
  "ymir-aura": {"source": "C062", "mode": "self", "note": "ユミルの終戦（リロール1を得る。2026-10-25 利用者指定）：氷の巨人らしい青白い光と、ゆっくり回る魔法陣・昇る灯の神秘的なオーラ。戦闘中の強化（収束する光）とは分ける。"},
  "grimalkin-glint": {"source": "C095", "mode": "self", "note": "グリマルキンの終戦1〜3回目（あとX戦。2026-10-25 利用者指定）：カードの上で小さな星が3つ煌めく控えめな演出。"},
  "grimalkin-pillar": {"source": "C095", "mode": "self", "note": "グリマルキンの終戦4回目（接続したエンチャントを強化。2026-10-25 利用者指定）：紫の陣から金の光の柱が立ち、床の輪・光条・星の閃き・昇る光の粒で豪華に。"},
  "reward-blessing": {"source": "C114", "mode": "self", "note": "ファミリア・ゴーレム（このゲーム中、報酬とトレーダーのキャラクターは+X/+X。2026-10-25 利用者指定）：戦闘中の強化と雰囲気を分ける。2026-10-25 2回目の作り直し：真上から見た形で、カードの面がふわりと灯り、その上から翠と金の光の粒が立ちのぼって画面の外（報酬）へ去る。ゴーレムの負傷のバフ演出（S006）と同時に出す。"},
  "revival-ring": {"source": "C013", "mode": "self", "note": "復活の指輪（R018：最初に死んだ味方は最大HPで復活する。2026-10-25 利用者指定）：頭上の薔薇金の輪から光が降り、灰色のカードが色を取り戻して蘇る。"},
  "stealth-veil": {"source": "C044", "mode": "self", "note": "隠密（2026-10-25 利用者指定）：灰緑の迷彩の霧に包まれ、カードが透けて輪郭だけが揺らぐ。終わりに戻る（消えたままにはしない）。戦闘中に隠密を得た瞬間に出す（持っている間は stealth-state）。"},
  "guard-stance": {"source": "C008", "mode": "self", "note": "防戦（攻撃しない。2026-10-25 利用者指定）：鈍い鋼と青銅の重い盾が据わり、砂煙と短い縦の揺れで重さを出す。刃や突進の動きは入れない。戦闘中に防戦を得た瞬間に出す（ランダムな敵を防戦にする効果など。持っている間は guard-state）。"},
  "stealth-state": {"source": "C044", "mode": "self", "note": "隠密を持っている間ずっと出す（2026-10-25 作り直し。利用者指摘「背景に隠れる光学迷彩」）：カードが半ば透けて背景に溶け、輪郭がかげろうのように揺れ、屈折の光の筋が斜めに走り抜ける（ループ／SEなし）。"},
  "guard-state": {"source": "C008", "mode": "self", "note": "防戦を持っている間ずっと出す（2026-10-25 作り直し。利用者指摘「根性と似ている。灰色でずっしり」）：カードが鈍い灰色に沈み、上から重い影がのしかかって下に溜まる。厚い石灰色の縁がゆっくり重く脈打つ（ループ／SEなし）。"},
  "frost-retaliate": {"source": "C056", "mode": "foe", "note": "凍てつく亡霊“リムスルス”（EN031）の負傷：自分にダメージを与えた敵へ、青白い菫の氷の針が冷気の尾を引いて飛び、着弾で霜の枝が走る。"},
  "echo-bolt": {"source": "C056", "mode": "foe", "note": "残響の魔導師“アバドン”（EN013）の負傷：発生元で残響の輪が三重に広がり、紫の光の粒の筋がランダムな敵へ走って、着弾で小さな残響の輪が弾ける。"},
  "activation-transform": {"source": "C084", "mode": "self", "note": "起動の変身（シルフ C084・変身の巻物 I002）：翡翠の魔法陣が回り、粒子が渦を巻いて収束し、白く光って姿が変わる。"},
  "activation-empower": {"source": "C109", "mode": "self", "note": "インキュバスの起動（C109）：薔薇色と金の光が昇り、五色の粒が散って色が移ろう。"},
  "activation-devour": {"source": "C116", "mode": "foe", "note": "ヘルナイトの起動（C116）：破壊されるカードが灰色に沈んで黒紅の瘴気を上げ、暗い光の粒の筋がヘルナイトへ吸い込まれて赤黒く脈打つ。"}
});
