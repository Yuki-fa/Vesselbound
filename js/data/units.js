// ═══════════════════════════════════════
// units.js — キャラクタープール（全グレード）
// ═══════════════════════════════════════

const UNIT_POOL = [
  // ─── ゴーレム（初期キャラ・非売品） ───
  {id:'c_golem',      name:'ゴーレム',        race:'-',   grade:1, atk:5,  hp:10, cost:0,  unique:false, icon:'🪨', desc:''},

  // ─── G1 通常 ───
  {id:'c_mermaid',    name:'マーメイド',       race:'亜人', grade:1, atk:3,  hp:12, cost:3,  unique:false, icon:'🧜', desc:'①：戦闘開始時、魔術レベル+1。',             effect:'mermaid_start'},
  {id:'c_skeleton',   name:'スケルトン',       race:'不死', grade:1, atk:6,  hp:1,  cost:3,  unique:false, icon:'💀', desc:'①：死亡した場合、戦闘終了時にライフ1で召喚する。', effect:'skeleton_revive'},
  {id:'c_zombie',     name:'ゾンビ',           race:'不死', grade:1, atk:4,  hp:7,  cost:3,  unique:false, icon:'🧟', desc:'再生3',                                      regen:3},
  {id:'c_kettcat',    name:'ケットシー',       race:'獣',   grade:1, atk:3,  hp:6,  cost:3,  unique:false, icon:'🐱', desc:'①：負傷時、最も左の空き地に2/4の「ナイトキャット」を召喚する。', injury:'kettcat'},
  {id:'c_grimalkin',  name:'グリマルキン',     race:'獣',   grade:1, atk:3,  hp:7,  cost:3,  unique:false, icon:'😼', desc:'①：仲間を還魂すると、以後の全ての戦闘中に召喚される仲間が+1/+1される。', effect:'grimalkin_sell'},
  {id:'c_elf',        name:'エルフ',           race:'精霊', grade:1, atk:4,  hp:9,  cost:5,  unique:false, icon:'🧝', desc:'①：攻撃時、+1/±0を得る。',                  effect:'elf_attack'},
  {id:'c_brownie',    name:'ブラウニー',       race:'精霊', grade:1, atk:2,  hp:12, cost:4,  unique:false, icon:'🍄', desc:'①：攻撃時、全ての味方が±0/+1を得る。',       effect:'brownie_attack'},
  {id:'c_imp',        name:'インプ',           race:'悪魔', grade:1, atk:6,  hp:8,  cost:4,  unique:false, icon:'😈', desc:'①：戦闘開始時、ランダムなアイテムを得る。',   effect:'imp_start'},
  {id:'c_dragonet',   name:'ドラゴネット',     race:'竜',   grade:1, atk:5,  hp:6,  cost:2,  unique:false, icon:'🐲', desc:'①：3回目の戦闘終了時、「ワーム」に変身する。', effect:'dragonet_end'},
  {id:'c_dwarf',      name:'ドワーフ',         race:'亜人', grade:1, atk:3,  hp:15, cost:5,  unique:false, icon:'⚒️', desc:'①：杖を使うたび、全ての味方が+1/+1を得る。', effect:'dwarf_wand'},
  {id:'c_mummy',      name:'マミー',           race:'不死', grade:1, atk:2,  hp:12, cost:3,  unique:false, icon:'🤕', desc:'①：負傷時、以後の全ての「不死」が+1/±0を得る。', injury:'mummy'},
  {id:'c_gremlin',    name:'グレムリン',       race:'悪魔', grade:1, atk:4,  hp:8,  cost:4,  unique:false, icon:'👺', desc:'①：戦闘開始時、このキャラクターと、最もライフの多い敵のライフを入れ替える。', effect:'gremlin_start'},
  {id:'c_jack',       name:'ジャック・オ・ランタン', race:'精霊', grade:1, atk:3,  hp:12, cost:3,  unique:false, icon:'🎃', desc:'①：召喚時、全ての味方がシールドを得る。', effect:'jack_summon'},
  {id:'c_lizardman',  name:'リザードマン',     race:'竜',   grade:1, atk:5,  hp:13, cost:4,  unique:false, icon:'🦎', desc:'反撃',                                       counter:true},
  {id:'c_lamia',      name:'ラミア',           race:'亜人', grade:1, atk:4,  hp:12, cost:4,  unique:false, icon:'🐍', desc:'①：戦闘終了時、魔術レベル4につきソウル1を得る。', effect:'lamia_end'},

  // ─── G1 ネームド（報酬に出ない） ───
  {id:'c_einsel',     name:'惑わしの妖精"エインセル"',     race:'精霊', grade:1, atk:5,  hp:12, cost:8,  unique:true, icon:'🧚', desc:'シールド　①：ターン開始時、一番右のキャラにシールド+1。②：味方がシールドを失うと+1/+2を得る。', shield:1, effect:'einsel'},
  {id:'c_forniot',    name:'鉄の拳"フォルニョート"',       race:'亜人', grade:1, atk:6,  hp:18, cost:10, unique:true, icon:'👊', desc:'二段攻撃　①：攻撃時、全ての味方が+1/±0を得る。', effect:'forniot', keywords:['二段攻撃']},
  {id:'c_abadon',     name:'残響の魔導師"アバドン"',       race:'悪魔', grade:1, atk:3,  hp:16, cost:9,  unique:true, icon:'🔮', desc:'全体攻撃', keywords:['全体攻撃']},
  {id:'c_freyr',      name:'黄金の瞳"フレイ"',             race:'獣',   grade:1, atk:7,  hp:11, cost:10, unique:true, icon:'👁️', desc:'①：負傷時、最も右の空き地に「反撃」を持つ4/6の「ロイヤルガード」を召喚する。', injury:'freyr'},
  {id:'c_naglfar',    name:'虚空の渡し守"ナグルファル"',   race:'不死', grade:1, atk:4,  hp:14, cost:9,  unique:true, icon:'⚓', desc:'①：キャラクターが死亡するたび、+2/+1を得る。', effect:'naglfar_ondeath'},

  // ─── G2 通常 ───
  {id:'c_worm',       name:'ワーム',           race:'竜',   grade:2, atk:9,  hp:22, cost:7,  unique:false, icon:'🪱', desc:'反撃　①：負傷時、全ての味方が+1/+1を得る。', counter:true, injury:'worm'},
  {id:'c_cocatrice',  name:'コカトリス',       race:'獣',   grade:2, atk:8,  hp:20, cost:5,  unique:false, icon:'🦅', desc:'追加：石化（攻撃不可）'},
  {id:'c_gnome',      name:'ノーム',           race:'精霊', grade:2, atk:10, hp:16, cost:5,  unique:false, icon:'🧌', desc:'①：戦闘終了時、2ソウルを得る。', effect:'gnome_end'},
  {id:'c_gargoyle',   name:'ガーゴイル',       race:'悪魔', grade:2, atk:7,  hp:25, cost:5,  unique:false, icon:'🗿', desc:''},
  {id:'c_minotaur',   name:'ミノタウロス',     race:'亜人', grade:2, atk:9,  hp:28, cost:5,  unique:false, icon:'🐂', desc:'負傷：ランダムな敵に攻撃する。', injury:'minotaur'},
  {id:'c_harpy',      name:'ハーピー',         race:'亜人', grade:2, atk:8,  hp:21, cost:5,  unique:false, icon:'🦅', desc:'反撃', counter:true},
  {id:'c_wraith',     name:'レイス',           race:'不死', grade:2, atk:6,  hp:30, cost:5,  unique:false, icon:'👻', desc:'追加：即死（20%）', keywords:['即死']},
  {id:'c_hellhound',  name:'ヘルハウンド',     race:'悪魔', grade:2, atk:11, hp:15, cost:5,  unique:false, icon:'🐕', desc:'反撃', counter:true},
  {id:'c_centaur',    name:'ケンタウロス',     race:'亜人', grade:2, atk:9,  hp:24, cost:5,  unique:false, icon:'🏇', desc:'2回攻撃', keywords:['二段攻撃']},
  {id:'c_homunculus', name:'ホムンクルス',     race:'全て', grade:2, atk:7,  hp:23, cost:5,  unique:false, icon:'🧪', desc:'①：戦闘開始時、シールドを得る。', effect:'homunculus_start'},
  {id:'c_dryad',      name:'ドリアード',       race:'精霊', grade:2, atk:8,  hp:22, cost:5,  unique:false, icon:'🌿', desc:'①：受けるダメージが半分になる。（端数切り上げ）'},

  // ─── G2 ネームド ───
  {id:'c_ran',        name:'波の娘"ラン・ドーター"',       race:'亜人', grade:2, atk:3,  hp:35, cost:10, unique:true, icon:'🌊', desc:'負傷：7/Xの「海の眷属」を左端に召喚する。（X=被ダメージ）', injury:'ran'},
  {id:'c_garm',       name:'隻眼の魔狼"ガルム・グリーム"', race:'獣',   grade:2, atk:15, hp:30, cost:12, unique:true, icon:'🐺', desc:'トリプル', keywords:['三段攻撃']},
  {id:'c_manigans',   name:'不敗の剣鬼"マニガンス"',       race:'亜人', grade:2, atk:14, hp:32, cost:12, unique:true, icon:'⚔️', desc:'①：ターン開始時、シールドを得る。', effect:'manigans_turn'},
  {id:'c_vidar',      name:'緑域の隠者"ヴィーザル"',       race:'精霊', grade:2, atk:16, hp:25, cost:12, unique:true, icon:'🌳', desc:'①：すべての味方が+3/+3を得る。', effect:'vidar_start'},
  {id:'c_lilith',     name:'虚飾の歌姫"リリス・ヴェノム"', race:'悪魔', grade:2, atk:18, hp:20, cost:12, unique:true, icon:'🎤', desc:'①：戦闘開始時、すべての味方にシールドを与える。', effect:'lilith_start'},
  {id:'c_limslus',    name:'凍てつく亡霊"リムスルス"',     race:'不死', grade:2, atk:10, hp:45, cost:12, unique:true, icon:'❄️', desc:'負傷：すべての敵に3ダメージを与える。', injury:'limslus'},

  // ─── G3 通常 ───
  {id:'c_phantom',    name:'ファントム',       race:'不死', grade:3, atk:11, hp:48, cost:7,  unique:false, icon:'👤', desc:'①：受けるダメージが半分（端数切り上げ）になる。'},
  {id:'c_salamander', name:'サラマンダー',     race:'竜',   grade:3, atk:16, hp:40, cost:7,  unique:false, icon:'🔥', desc:''},
  {id:'c_vampire',    name:'ヴァンパイア',     race:'不死', grade:3, atk:13, hp:45, cost:7,  unique:false, icon:'🧛', desc:''},
  {id:'c_chimera',    name:'キメラ',           race:'獣',   grade:3, atk:15, hp:42, cost:7,  unique:false, icon:'🐉', desc:'①：パワーは魔術レベルに等しい。　①：召喚時、魔術レベル+2。'},
  {id:'c_ogre',       name:'オーガ',           race:'亜人', grade:3, atk:14, hp:55, cost:7,  unique:false, icon:'👹', desc:'①：戦闘終了時、この戦闘で死んだランダムなキャラクター1体をライフ1で召喚する。'},
  {id:'c_succubus',   name:'サキュバス',       race:'悪魔', grade:3, atk:18, hp:30, cost:7,  unique:false, icon:'😈', desc:''},
  {id:'c_medusa',     name:'メデューサ',       race:'亜人', grade:3, atk:13, hp:50, cost:7,  unique:false, icon:'🐍', desc:''},
  {id:'c_wyvern',     name:'ワイバーン',       race:'竜',   grade:3, atk:17, hp:44, cost:7,  unique:false, icon:'🐲', desc:'①：攻撃時、すべての味方が+3/+1を得る。'},
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
  {id:'c_cerberus',   name:'ケルベロス',       race:'獣',   grade:4, atk:28, hp:80,  cost:10, unique:false, icon:'🐕', desc:'トリプル', keywords:['三段攻撃']},
  {id:'c_managarm',   name:'マナガルム',       race:'獣',   grade:4, atk:27, hp:82,  cost:10, unique:false, icon:'🐺', desc:''},
  {id:'c_dullahan',   name:'デュラハン',       race:'不死', grade:4, atk:24, hp:90,  cost:10, unique:false, icon:'🪖', desc:'3段攻撃', keywords:['三段攻撃']},
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
function makeUnitFromDef(def, fieldIdx){
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
    _dp:      false,
    powerBroken: false,
    // 不死
    regen:      def.regen    || 0,
    _battleStartHp: def.hp,
    // 能力キー
    effect:   def.effect  || null,
    injury:   def.injury  || null,
    counter:  def.counter || false,
    keywords: def.keywords ? [...def.keywords] : [],
  };
  // マミー効果：不死ATKボーナス（累積）
  if(def.race==='不死' && typeof G!=='undefined' && G._undeadHpBonus){
    unit.atk    += G._undeadHpBonus;
    unit.baseAtk += G._undeadHpBonus;
  }
  return unit;
}
