// ═══════════════════════════════════════
// units.js — キャラクタープール（全グレード）
// ═══════════════════════════════════════

const UNIT_POOL = [
  // ─── ゴーレム（初期キャラ・非売品） ───
  {id:'c_golem',      name:'守護者"アイギス"', race:'-',   grade:1, atk:5,  hp:10, cost:0,  unique:false, icon:'🪨', desc:'', keywords:['アーティファクト']},

  // ─── G1 通常 ───
  {id:'c_mermaid',    name:'マーメイド',       race:'亜人', grade:1, atk:3,  hp:12, cost:3,  unique:false, icon:'🧜', desc:'開戦：魔術レベルが+1される。',             effect:'mermaid_start'},
  {id:'c_skeleton',   name:'スケルトン',       race:'不死', grade:1, atk:6,  hp:1,  cost:3,  unique:false, icon:'💀', desc:'誘発：このキャラクターが死亡した場合、0/4、種族なしの「骨」を召喚する。', effect:'skeleton_bone'},
  {id:'c_zombie',     name:'ゾンビ',           race:'不死', grade:1, atk:4,  hp:7,  cost:3,  unique:false, icon:'🧟', desc:'終戦：±0/+3を得る。',                        effect:'zombie_end'},
  {id:'c_kettcat',    name:'ケットシー',       race:'獣',   grade:1, atk:3,  hp:6,  cost:3,  unique:false, icon:'🐱', desc:'負傷：最も左の空き地に1/2、獣の「ナイトキャット」を召喚する。', injury:'kettcat'},
  {id:'c_grimalkin',  name:'グリマルキン',     race:'獣',   grade:1, atk:3,  hp:7,  cost:3,  unique:false, icon:'😼', desc:'誘発：他のキャラクターの効果でキャラクターが召喚されると+1/+1を得る。', effect:'grimalkin_onsum'},
  {id:'c_elf',        name:'エルフ',           race:'精霊', grade:1, atk:4,  hp:9,  cost:5,  unique:false, icon:'🧝', desc:'攻撃：+1/±0を得る。',                  effect:'elf_attack'},
  {id:'c_brownie',    name:'ブラウニー',       race:'精霊', grade:1, atk:2,  hp:12, cost:4,  unique:false, icon:'🍄', desc:'攻撃：全ての仲間が±0/+1を得る。',       effect:'brownie_attack'},
  {id:'c_imp',        name:'インプ',           race:'悪魔', grade:1, atk:6,  hp:8,  cost:4,  unique:false, icon:'😈', desc:'誘発：仲間を還魂すると、ランダムなG1のアイテムを得る。', effect:'imp_sell'},
  {id:'c_dragonet',   name:'ドラゴネット',     race:'竜',   grade:1, atk:5,  hp:6,  cost:2,  unique:false, icon:'🐲', desc:'終戦：3回目の戦闘終了時、ランダムなG2の竜に変身する。', effect:'dragonet_end'},
  {id:'c_dwarf',      name:'ドワーフ',         race:'亜人', grade:1, atk:3,  hp:15, cost:5,  unique:false, icon:'⚒️', desc:'誘発：オーナーが杖を使うたび、隣接する仲間が+1/+1を得る。', effect:'dwarf_wand'},
  {id:'c_mummy',      name:'マミー',           race:'不死', grade:1, atk:2,  hp:12, cost:3,  unique:false, icon:'🤕', desc:'負傷：今後商談フェイズで現れる「不死」のキャラクターが+1/±0を得る。', injury:'mummy'},
  {id:'c_gremlin',    name:'グレムリン',       race:'悪魔', grade:1, atk:4,  hp:8,  cost:4,  unique:false, icon:'👺', desc:'開戦：全ての敵が-1/±0を得る。', effect:'gremlin_start'},
  {id:'c_jack',       name:'ジャック・オ・ランタン', race:'精霊', grade:1, atk:3,  hp:12, cost:3,  unique:false, icon:'🎃', desc:'開戦：ランダムな仲間1体が「シールド」を得る。', effect:'jack_start'},
  {id:'c_lizardman',  name:'リザードマン',     race:'竜',   grade:1, atk:5,  hp:13, cost:4,  unique:false, icon:'🦎', desc:'攻撃：±0/+1を得る。',                   counter:true, effect:'lizardman_attack', keywords:['成長1','反撃']},
  {id:'c_lamia',      name:'ラミア',           race:'亜人', grade:1, atk:4,  hp:12, cost:4,  unique:false, icon:'🐍', desc:'終戦：魔術レベル5につきソウル1を得る。', effect:'lamia_end'},
  {id:'c_mitera',     name:'ミテーラ',         race:'精霊', grade:1, atk:3,  hp:9,  cost:3,  unique:false, icon:'🦤', desc:'使役：最も左の空き地に1/3、獣の「ペリカン」を召喚する。', effect:'mitera_summon'},
  {id:'c_jackalope',  name:'ジャッカロープ',   race:'獣',   grade:1, atk:4,  hp:8,  cost:4,  unique:false, icon:'🐰', desc:'開戦：オーナーは「治癒の薬」を1枚得る。', effect:'jackalope_start'},
  {id:'c_pigmy',      name:'ピグミー',         race:'亜人', grade:1, atk:1,  hp:8,  cost:3,  unique:false, icon:'🏹', desc:'常時：このキャラクターのパワーは魔術レベルに等しい。', effect:'pigmy_magic', counter:true, keywords:['反撃']},
  {id:'c_banshee',    name:'バンシー',         race:'不死', grade:1, atk:4,  hp:8,  cost:3,  unique:false, icon:'🙀', desc:'負傷：「バンシー」以外の全てのキャラクターに1ダメージを与える。', injury:'banshee'},
  {id:'c_sylph',      name:'シルフ',           race:'精霊', grade:1, atk:3,  hp:9,  cost:3,  unique:false, icon:'🌬️', desc:'攻撃：隣接するキャラクターが+1/±0を得る。', effect:'sylph_attack'},
  {id:'c_incubus',    name:'インキュバス',     race:'悪魔', grade:1, atk:4,  hp:8,  cost:4,  unique:false, icon:'😈', desc:'誘発：アイテムを使用するたび、最も左の空き地に3/1、悪魔の「ナイトメア」を召喚する。', effect:'incubus_spell'},
  {id:'c_lesser_demon',name:'レッサーデーモン',race:'悪魔', grade:1, atk:5,  hp:10, cost:3,  unique:false, icon:'👿', desc:'', keywords:['成長2']},
  {id:'c_arachas',    name:'アラッサス',       race:'亜人', grade:1, atk:4,  hp:9,  cost:3,  unique:false, icon:'🦂', desc:'攻撃：全ての敵に「毒牙1」を与える。', effect:'arachas_attack'},
  {id:'c_slin',       name:'スリン',           race:'亜人', grade:1, atk:2,  hp:10, cost:4,  unique:false, icon:'🌿', desc:'使役：他の全ての仲間が「成長1」を得る。', effect:'slin_summon', keywords:['成長1']},
  {id:'c_goblin',     name:'ゴブリン',         race:'亜人', grade:1, atk:4,  hp:8,  cost:2,  unique:false, icon:'👺', desc:''},
  {id:'c_orc',        name:'オーク',           race:'亜人', grade:1, atk:5,  hp:12, cost:3,  unique:false, icon:'🪓', desc:'', counter:true, keywords:['反撃']},
  {id:'c_ghoul',      name:'グール',           race:'不死', grade:1, atk:5,  hp:9,  cost:2,  unique:false, icon:'🧟', desc:''},
  {id:'c_poltergeist',name:'ポルターガイスト', race:'不死', grade:1, atk:3,  hp:8,  cost:2,  unique:false, icon:'🌀', desc:'', keywords:['呪詛1']},
  {id:'c_giant_rat',  name:'ジャイアントラット',race:'獣',  grade:1, atk:6,  hp:7,  cost:2,  unique:false, icon:'🐀', desc:''},
  {id:'c_madcat',     name:'マッドキャット',   race:'獣',   grade:1, atk:5,  hp:9,  cost:3,  unique:false, icon:'😾', desc:'', keywords:['狩人']},
  {id:'c_wisp',       name:'ウィスプ',         race:'精霊', grade:1, atk:2,  hp:9,  cost:2,  unique:false, icon:'🕯️', desc:''},
  {id:'c_kobran',     name:'コブラン',         race:'亜人', grade:1, atk:4,  hp:10, cost:3,  unique:false, icon:'🐍', desc:'', shield:1, keywords:['シールド']},
  {id:'c_firebreath', name:'ファイアブレス',   race:'竜',   grade:1, atk:6,  hp:7,  cost:2,  unique:false, icon:'🔥', desc:''},
  {id:'c_poisonmist', name:'ポイズンミスト',   race:'亜人', grade:1, atk:3,  hp:9,  cost:2,  unique:false, icon:'🌫️', desc:'', keywords:['侵食1']},

  // ─── G1 ネームド（legend） ───
  {id:'c_einsel',     name:'惑わしの妖精"エインセル"',     race:'精霊', grade:1, atk:5,  hp:12, cost:8,  unique:true, icon:'🧚', desc:'シールド　常時：ターン開始時、一番右のキャラクターがシールドを得る。　誘発：仲間がシールドを失った時、+1/+2を得る。', shield:1, effect:'einsel', keywords:['シールド']},
  {id:'c_forniot',    name:'鉄の拳"フォルニョート"',       race:'亜人', grade:1, atk:6,  hp:18, cost:10, unique:true, icon:'👊', desc:'二段攻撃　攻撃：全ての仲間が+1/±0を得る。', effect:'forniot', keywords:['二段攻撃']},
  {id:'c_abadon',     name:'残響の魔導師"アバドン"',       race:'悪魔', grade:1, atk:3,  hp:16, cost:9,  unique:true, icon:'🔮', desc:'全体攻撃', keywords:['全体攻撃']},
  {id:'c_freyr',      name:'黄金の瞳"フレイ"',             race:'獣',   grade:1, atk:7,  hp:11, cost:10, unique:true, icon:'👁️', desc:'負傷：最も右の空き地に「反撃」を持つ4/6、種族なしの「ストーンキャット」を召喚する。', injury:'freyr'},
  {id:'c_naglfar',    name:'虚空の渡し守"ナグルファル"',   race:'不死', grade:1, atk:4,  hp:14, cost:9,  unique:true, icon:'⚓', desc:'誘発：キャラクターが死亡するたび、このキャラクターは+2/+1を得る。', effect:'naglfar_ondeath'},

  // ─── G2 通常 ───
  {id:'c_worm',       name:'ワーム',           race:'竜',   grade:2, atk:9,  hp:22, cost:7,  unique:false, icon:'🪱', desc:'反撃　負傷：全ての仲間が+1/±0を得る。', counter:true, injury:'worm', keywords:['反撃']},
  {id:'c_darkone',    name:'ダークワン',       race:'悪魔', grade:2, atk:6,  hp:12, cost:5,  unique:false, icon:'😈', desc:'誘発：アイテムを使用するたび、全ての仲間の悪魔が+1/+1を得る。', effect:'darkone_spell'},
  {id:'c_drake',      name:'ドレイク',         race:'竜',   grade:2, atk:5,  hp:8,  cost:3,  unique:false, icon:'🐲', desc:'開戦：全てのキャラクターに1ダメージを与える。', effect:'drake_start'},
  {id:'c_lindworm',   name:'リンドヴルム',     race:'竜',   grade:2, atk:9,  hp:6,  cost:5,  unique:false, icon:'🐍', desc:'誘発：仲間の負傷効果が発動するたび、全ての仲間の竜が+1/+1を得る。', effect:'lindworm_injury'},
  {id:'c_gnome',      name:'ノーム',           race:'精霊', grade:2, atk:10, hp:16, cost:5,  unique:false, icon:'🧌', desc:'常時：宝箱出現率が1.5倍になる。（宝箱は1戦闘に1個までしか出現しない）', effect:'gnome_treasure'},
  {id:'c_gargoyle',   name:'ガーゴイル',       race:'悪魔', grade:2, atk:7,  hp:25, cost:5,  unique:false, icon:'🗿', desc:'反撃　常時：味方が受けるダメージは-1される。', counter:true, effect:'gargoyle_shield', keywords:['反撃']},
  {id:'c_minotaur',   name:'ミノタウロス',     race:'亜人', grade:2, atk:9,  hp:28, cost:5,  unique:false, icon:'🐂', desc:'成長3　開戦：グレードアップのコストが-1される。', effect:'minotaur_gradeup', keywords:['成長3']},
  {id:'c_harpy',      name:'ハーピー',         race:'亜人', grade:2, atk:8,  hp:21, cost:5,  unique:false, icon:'🦅', desc:'反撃　誘発：魔術レベルが上がるたび、全ての仲間が+1/+2を得る。', effect:'harpy_magiclevel', counter:true, keywords:['反撃']},
  {id:'c_wraith',     name:'レイス',           race:'不死', grade:2, atk:6,  hp:30, cost:5,  unique:false, icon:'👻', desc:'誘発：死亡した場合、全ての仲間に攻撃力に等しいダメージを与える。', effect:'wraith_death'},
  {id:'c_draug',      name:'ドラウグ',         race:'不死', grade:2, atk:10, hp:22, cost:5,  unique:false, icon:'💀', desc:'誘発：攻撃を行った敵に「毒3」を与える。', effect:'draug_attack'},
  {id:'c_shadow',     name:'シャドウ',         race:'不死', grade:2, atk:8,  hp:20, cost:5,  unique:false, icon:'🌑', desc:'開戦：正面の敵に変身する。', effect:'shadow_start'},
  {id:'c_specter',    name:'スペクター',       race:'不死', grade:2, atk:9,  hp:23, cost:5,  unique:false, icon:'👤', desc:'攻撃：今後商談フェイズで現れる「不死」のキャラクターが+1/+1を得る。', effect:'specter_attack'},
  {id:'c_ghost',      name:'ゴースト',         race:'不死', grade:2, atk:7,  hp:20, cost:5,  unique:false, icon:'👻', desc:'誘発：他のキャラクターが死亡するたび、このキャラクターは+1/+1を得る。', effect:'ghost_ondeath'},
  {id:'c_hellhound',  name:'ヘルハウンド',     race:'悪魔', grade:2, atk:11, hp:15, cost:5,  unique:false, icon:'🐕', desc:'誘発：アイテムを使用するたび、このキャラクターはランダムな敵を攻撃する。', effect:'hellhound_spell'},
  {id:'c_centaur',    name:'ケンタウロス',     race:'亜人', grade:2, atk:9,  hp:24, cost:5,  unique:false, icon:'🏇', desc:'二段攻撃　開戦：オーナーの魔術レベルが+1される。',        effect:'centaur_start', keywords:['二段攻撃']},
  {id:'c_homunculus', name:'ホムンクルス',     race:'全て', grade:2, atk:7,  hp:23, cost:5,  unique:false, icon:'🧪', desc:'開戦：+X/+Xを得る。Xは仲間の種族の数に等しい。',   effect:'homunculus_start'},
  {id:'c_dryad',      name:'ドリアード',       race:'精霊', grade:2, atk:8,  hp:22, cost:5,  unique:false, icon:'🌿', desc:'攻撃：ランダムな仲間2体が+1/+1を得る。', effect:'dryad_attack'},
  {id:'c_warg',       name:'ウォーグ',         race:'獣',   grade:2, atk:9,  hp:22, cost:5,  unique:false, icon:'🐺', desc:'負傷：全ての仲間の獣が+1/+1を得る。', injury:'warg'},
  {id:'c_pegasus',    name:'ペガサス',         race:'獣',   grade:2, atk:10, hp:20, cost:5,  unique:false, icon:'🦄', desc:'攻撃：右端のキャラクターが±0/+4を得る。', effect:'pegasus_attack'},
  {id:'c_perytons',   name:'ペリュトン',       race:'獣',   grade:2, atk:8,  hp:24, cost:5,  unique:false, icon:'🦌', desc:'誘発：仲間を還魂すると、以後キャラクターの効果で召喚されるキャラクターが+1/±0される。', effect:'perytons_sell'},
  {id:'c_golden_goose',name:'ゴールデン・グース',race:'獣', grade:2, atk:3,  hp:28, cost:5,  unique:false, icon:'🪿', desc:'開戦：最も左の空き地に0/1、獣の「ゴールデンエッグ」を召喚する。', effect:'golden_goose_start'},
  {id:'c_kobold',     name:'コボルド',         race:'亜人', grade:2, atk:7,  hp:22, cost:5,  unique:false, icon:'🐊', desc:'使役：左端の杖に+1チャージする。', effect:'kobold_summon'},
  {id:'c_arachne',    name:'アラクネ',         race:'亜人', grade:2, atk:6,  hp:25, cost:5,  unique:false, icon:'🕷️', desc:'誘発：杖が壊れるたび、魔術レベルが+1される。', effect:'arachne_wand'},
  {id:'c_undine',     name:'ウンディーネ',     race:'精霊', grade:2, atk:8,  hp:22, cost:5,  unique:false, icon:'💧', desc:'常時：攻撃した味方が+1/+1を得る。', effect:'undine_passive'},
  {id:'c_frost_sprite',name:'フロスト・スプライト',race:'精霊',grade:2,atk:7,hp:24, cost:5,  unique:false, icon:'❄️', desc:'開戦：正面の敵を1ターン行動不能にする。', effect:'frost_start'},
  {id:'c_leprechaun', name:'レプラコーン',     race:'精霊', grade:2, atk:5,  hp:28, cost:5,  unique:false, icon:'🍀', desc:'誘発：ソウルを得るたび、全てのキャラクターは±0/+1を得る。', effect:'leprechaun_gold'},
  {id:'c_alp',        name:'アルプ',           race:'不死', grade:2, atk:8,  hp:22, cost:5,  unique:false, icon:'😈', desc:'負傷：敵の場に0/1、精霊の「ソウルボム」を召喚する。', injury:'alp'},
  {id:'c_familiar',   name:'ファミリア',       race:'悪魔', grade:2, atk:9,  hp:20, cost:5,  unique:false, icon:'🦇', desc:'常時：商談フェイズで最初に購入したアイテムのコピーを得る。', effect:'familiar_shop'},
  {id:'c_hydra',      name:'ハイドラ',         race:'獣',   grade:2, atk:8,  hp:26, cost:5,  unique:false, icon:'🐉', desc:'負傷：+2/+2を得る。', injury:'hydra'},
  {id:'c_sea_serpent',name:'シーサーペント',   race:'獣',   grade:2, atk:10, hp:20, cost:5,  unique:false, icon:'🐍', desc:'開戦：全ての敵に2ダメージを与える。', effect:'sea_serpent_start', keywords:['毒牙4']},
  // キーワードのみG2
  {id:'c_satyr',      name:'サテュロス',       race:'亜人', grade:2, atk:9,  hp:22, cost:5,  unique:false, icon:'🐐', desc:''},
  {id:'c_dark_elf',   name:'ダークエルフ',     race:'精霊', grade:2, atk:12, hp:18, cost:5,  unique:false, icon:'🧝', desc:'', keywords:['狩人']},
  {id:'c_cursed_armor',name:'カースドアーマー',race:'-',    grade:2, atk:7,  hp:28, cost:5,  unique:false, icon:'🛡️', desc:'', keywords:['呪詛2']},
  {id:'c_bone_knight',name:'ボーンナイト',     race:'不死', grade:2, atk:10, hp:22, cost:5,  unique:false, icon:'💀', desc:''},
  {id:'c_dire_wolf',  name:'ダイアウルフ',     race:'獣',   grade:2, atk:14, hp:18, cost:5,  unique:false, icon:'🐺', desc:'', keywords:['二段攻撃']},
  {id:'c_hippogriff', name:'ヒポグリフ',       race:'獣',   grade:2, atk:9,  hp:24, cost:5,  unique:false, icon:'🦅', desc:''},
  {id:'c_kelpie',     name:'ケルピー',         race:'獣',   grade:2, atk:8,  hp:26, cost:5,  unique:false, icon:'🐴', desc:''},
  {id:'c_spriggan',   name:'スプリガン',       race:'精霊', grade:2, atk:7,  hp:28, cost:5,  unique:false, icon:'🌱', desc:'', shield:1, keywords:['シールド']},
  {id:'c_zmei',       name:'ズメイ',           race:'竜',   grade:2, atk:9,  hp:22, cost:5,  unique:false, icon:'🐲', desc:'', keywords:['侵食3']},
  {id:'c_bloodlord',  name:'ブラッドロード',   race:'不死', grade:2, atk:14, hp:20, cost:5,  unique:false, icon:'🩸', desc:'', keywords:['邪眼5']},

  // ─── G2 ネームド ───
  {id:'c_ran',        name:'波の娘"ラン・ドーター"',       race:'亜人', grade:2, atk:3,  hp:35, cost:10, unique:true, icon:'🌊', desc:'負傷：10/X、亜人の「海の眷属」を左端に召喚する。（X=被ダメージ）', injury:'ran'},
  {id:'c_garm',       name:'隻眼の魔狼"ガルム・グリーム"', race:'獣',   grade:2, atk:15, hp:30, cost:12, unique:true, icon:'🐺', desc:'三段攻撃',                          keywords:['三段攻撃']},
  {id:'c_manigans',   name:'不敗の剣鬼"マニガンス"',       race:'亜人', grade:2, atk:14, hp:32, cost:12, unique:true, icon:'⚔️', desc:'狩人　開戦：全ての仲間がシールドを得る。', effect:'manigans_start', keywords:['狩人']},
  {id:'c_vidar',      name:'緑域の隠者"ヴィーザル"',       race:'精霊', grade:2, atk:16, hp:25, cost:12, unique:true, icon:'🌳', desc:'常時：ターン開始時、全ての仲間に+2/+2を与える。', effect:'vidar_turn'},
  {id:'c_lilith',     name:'虚飾の歌姫"リリス・ヴェノム"', race:'悪魔', grade:2, atk:18, hp:20, cost:12, unique:true, icon:'🎤', desc:'全体攻撃　自動：敵がダメージを受けた時、毒3を与える。', effect:'lilith_ondmg', keywords:['全体攻撃']},
  {id:'c_limslus',    name:'凍てつく亡霊"リムスルス"',     race:'不死', grade:2, atk:10, hp:45, cost:12, unique:true, icon:'❄️', desc:'呪詛1　負傷：全ての敵に3ダメージを与える。', injury:'limslus', keywords:['呪詛1']},

  // ─── G3 通常 ───
  {id:'c_cocatrice',  name:'コカトリス',       race:'獣',   grade:3, atk:8,  hp:38, cost:7,  unique:false, icon:'🦅', desc:'常時：カードの効果で召喚された仲間が+2/+1を得る。', effect:'cocatrice_passive'},
  {id:'c_phantom',    name:'ファントム',       race:'不死', grade:3, atk:11, hp:48, cost:7,  unique:false, icon:'👤', desc:'誘発：「アク」以外の仲間が死んだ時、0/1、不死の「アク」を召喚する。', effect:'phantom_onallydie'},
  {id:'c_salamander', name:'サラマンダー',     race:'竜',   grade:3, atk:16, hp:40, cost:7,  unique:false, icon:'🔥', desc:'成長4　開戦：全ての敵に4ダメージを与える。', effect:'salamander_start', keywords:['成長4']},
  {id:'c_vampire',    name:'ヴァンパイア',     race:'不死', grade:3, atk:13, hp:45, cost:7,  unique:false, icon:'🧛', desc:'攻撃：全ての仲間の「不死」が+2/+1を得る。', effect:'vampire_attack'},
  {id:'c_chimera',    name:'キメラ',           race:'獣',   grade:3, atk:15, hp:42, cost:7,  unique:false, icon:'🐉', desc:'召喚：ランダムなキーワード能力を3つ得る。（即死、毒牙5、狩人、標的、成長5、加護、反撃、二段攻撃から抽選。同じものは選ばれない。）', effect:'chimera_summon'},
  {id:'c_ogre',       name:'オーガ',           race:'亜人', grade:3, atk:14, hp:55, cost:7,  unique:false, icon:'👹', desc:'終戦：この戦闘で死んだランダムなキャラクター1体をライフ1で召喚する。'},
  {id:'c_succubus',   name:'サキュバス',       race:'悪魔', grade:3, atk:18, hp:30, cost:7,  unique:false, icon:'😈', desc:''},
  {id:'c_medusa',     name:'メデューサ',       race:'亜人', grade:3, atk:13, hp:50, cost:7,  unique:false, icon:'🐍', desc:''},
  {id:'c_wyvern',     name:'ワイバーン',       race:'竜',   grade:3, atk:17, hp:44, cost:7,  unique:false, icon:'🐲', desc:'攻撃：すべての味方が+3/+1を得る。'},
  {id:'c_scylla',     name:'スキュラ',         race:'獣',   grade:3, atk:15, hp:45, cost:7,  unique:false, icon:'🦑', desc:''},
  {id:'c_baphomet',   name:'バフォメット',     race:'悪魔', grade:3, atk:19, hp:35, cost:7,  unique:false, icon:'🐐', desc:''},
  {id:'c_daemon',     name:'デーモン',         race:'悪魔', grade:3, atk:20, hp:32, cost:7,  unique:false, icon:'👿', desc:''},
  {id:'c_troll',      name:'トロール',         race:'亜人', grade:3, atk:12, hp:60, cost:7,  unique:false, icon:'🧌', desc:''},
  {id:'c_carbuncle',  name:'カーバンクル',     race:'精霊', grade:3, atk:11, hp:40, cost:7,  unique:false, icon:'💎', desc:''},

  // ─── G3 ネームド ───
  {id:'c_graipnir',   name:'咬竜"グレイプニル"',         race:'竜',   grade:3, atk:24, hp:55, cost:14, unique:true, icon:'🐉', desc:''},
  {id:'c_sindri',     name:'金床の賢者"シンドリ"',       race:'亜人', grade:3, atk:20, hp:65, cost:14, unique:true, icon:'⚒️', desc:''},
  {id:'c_gunda',      name:'極光の女王"グンダ"',         race:'精霊', grade:3, atk:28, hp:45, cost:14, unique:true, icon:'✨', desc:''},
  {id:'c_aegir',      name:'深淵の捕食者"エギル"',       race:'獣',   grade:3, atk:25, hp:50, cost:14, unique:true, icon:'🌊', desc:''},
  {id:'c_haze',       name:'反逆の熾火"ヘイズ"',         race:'悪魔', grade:3, atk:32, hp:35, cost:14, unique:true, icon:'🔥', desc:''},
  {id:'c_forseti',    name:'灰の王"フォルセティ"',       race:'不死', grade:3, atk:18, hp:75, cost:14, unique:true, icon:'👑', desc:''},

  // ─── G4 通常 ───
  {id:'c_behemoth',   name:'ベヒーモス',       race:'竜',   grade:4, atk:28, hp:90,  cost:10, unique:false, icon:'🐉', desc:''},
  {id:'c_ouroboros',  name:'ウロボロス',       race:'竜',   grade:4, atk:25, hp:100, cost:10, unique:false, icon:'🐍', desc:''},
  {id:'c_unicorn',    name:'ユニコーン',       race:'獣',   grade:4, atk:22, hp:75,  cost:10, unique:false, icon:'🦄', desc:''},
  {id:'c_archie',     name:'アーチー',         race:'悪魔', grade:4, atk:35, hp:50,  cost:10, unique:false, icon:'👿', desc:''},
  {id:'c_lich',       name:'リッチ',           race:'不死', grade:4, atk:20, hp:95,  cost:10, unique:false, icon:'💀', desc:''},
  {id:'c_elemental',  name:'エレメンタル',     race:'精霊', grade:4, atk:30, hp:65,  cost:10, unique:false, icon:'⚡', desc:''},
  {id:'c_pantrokos',  name:'パントロコス',     race:'全て', grade:4, atk:25, hp:80,  cost:10, unique:false, icon:'🌌', desc:''},
  {id:'c_lilith4',    name:'リリス',           race:'悪魔', grade:4, atk:32, hp:55,  cost:10, unique:false, icon:'😈', desc:''},
  {id:'c_basilisk',   name:'バジリスク',       race:'竜',   grade:4, atk:26, hp:85,  cost:10, unique:false, icon:'🐍', desc:''},
  {id:'c_cerberus',   name:'ケルベロス',       race:'獣',   grade:4, atk:28, hp:80,  cost:10, unique:false, icon:'🐕', desc:'三段攻撃', keywords:['三段攻撃']},
  {id:'c_managarm',   name:'マナガルム',       race:'獣',   grade:4, atk:27, hp:82,  cost:10, unique:false, icon:'🐺', desc:''},
  {id:'c_dullahan',   name:'デュラハン',       race:'不死', grade:4, atk:24, hp:90,  cost:10, unique:false, icon:'🪖', desc:'三段攻撃', keywords:['三段攻撃']},
  {id:'c_disir',      name:'ディシル',         race:'精霊', grade:4, atk:26, hp:78,  cost:10, unique:false, icon:'🌟', desc:''},
  {id:'c_dragonzombie',name:'ドラゴンゾンビ',  race:'竜',   grade:4, atk:25, hp:110, cost:10, unique:false, icon:'🐲', desc:''},

  // ─── G4 ネームド ───
  {id:'c_eitrvorm',   name:'原初の大蛇"エイトルヴォルム"', race:'竜',   grade:4, atk:45, hp:120, cost:18, unique:true, icon:'🐍', desc:''},
  {id:'c_skoll',      name:'蝕の翼"スコル・ハティ"',       race:'竜',   grade:4, atk:48, hp:110, cost:18, unique:true, icon:'🌑', desc:''},
  {id:'c_urd',        name:'刻を織る者"ウルズ・ラグナ"',   race:'精霊', grade:4, atk:50, hp:90,  cost:18, unique:true, icon:'⏳', desc:''},
  {id:'c_tiamariz',   name:'深藍の魔女"ティアマリス"',     race:'悪魔', grade:4, atk:55, hp:80,  cost:18, unique:true, icon:'🔮', desc:''},
  {id:'c_gelmir',     name:'忘却の骸"ゲルミール"',         race:'不死', grade:4, atk:35, hp:150, cost:18, unique:true, icon:'💀', desc:''},
  {id:'c_epitome',    name:'万象の揺り籠"エピトメ"',       race:'全て', grade:4, atk:40, hp:100, cost:18, unique:true, icon:'🌌', desc:''},
];

// 単体のユニットを定義IDから生成する
function makeUnitFromDef(def, fieldIdx, skipSummonBonus){
  const unit = {
    id:       uid(),
    defId:    def.id,
    name:     def.name,
    race:     def.race || '-',
    icon:     def.icon || '❓',
    atk:      def.atk,
    hp:       def.hp,
    maxHp:    def.hp,
    baseAtk:  def.atk,
    grade:    def.grade || 1,
    cost:     def.cost  || 0,
    unique:   def.unique || false,
    desc:     def.desc  || '',
    enchants: [],
    // 戦闘状態
    shield:   def.shield || 0,
    hate:     def.hate   || false,
    hateTurns:def.hate   ? 99 : 0,
    sealed:   0,
    poison:   0,
    curse:    0,
    doomed:   0,
    _dp:      false,
    powerBroken: false,
    // 能力キー
    regen:      0,
    _battleStartHp: def.hp,
    effect:   def.effect  || null,
    injury:   def.injury  || null,
    counter:  def.counter || false,
    keywords: def.keywords ? [...def.keywords] : [],
    // 重ねシステム
    _stackCount: 0,
    _baseDesc:   def.desc  || '',
    _baseGrade:  def.grade || 1,
  };
  // マミー効果：「不死」のキャラクターにATKボーナス（累積）
  // drawCharacters で既に適用済みの場合（_bonusApplied）は二重加算しない
  if(def.race==='不死' && typeof G!=='undefined' && G._undeadHpBonus && !def._bonusApplied){
    unit.atk    += G._undeadHpBonus;
    unit.baseAtk += G._undeadHpBonus;
  }
  // スペクター効果：「不死」のキャラクターにATK+HPボーナス（累積）
  if(def.race==='不死' && typeof G!=='undefined' && G._specterBonus && !def._bonusApplied){
    unit.atk    += G._specterBonus;
    unit.baseAtk += G._specterBonus;
    unit.hp     += G._specterBonus;
    unit.maxHp  += G._specterBonus;
  }
  // ペリュトン(旧:グリマルキン)：キャラクター効果で召喚される場合にATKボーナス適用（購入時は対象外）
  if(!skipSummonBonus && typeof G!=='undefined'){
    const _totalBD=(G.hasGoldenDrop?1:0)+(G._grimalkinBonus||0);
    if(_totalBD>0){
      unit.atk+=_totalBD; unit.baseAtk+=_totalBD;
      // HPはhasGoldenDropのみ（_grimalkinBonusはATKのみ）
      const _hpBonus=(G.hasGoldenDrop?1:0);
      if(_hpBonus>0){ unit.hp+=_hpBonus; unit.maxHp+=_hpBonus; }
    }
  }
  // ハーピー・ピグミー：ATKは常時魔術レベルに等しい（ボーナス適用後も上書き）
  if((unit.effect==='harpy_magiclevel'||unit.effect==='pigmy_magic')&&typeof G!=='undefined'){
    const _ml=G.magicLevel||1; unit.atk=_ml; unit.baseAtk=_ml;
  }
  return unit;
}
