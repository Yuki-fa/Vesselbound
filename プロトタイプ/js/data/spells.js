// ═══════════════════════════════════════
// SPELL_POOL — 杖・消耗品カード定義
// ═══════════════════════════════════════
const SPELL_POOL=[

  // ── WANDS（初期装備専用） ──
  {id:'w_fire',       name:'炎の杖',    type:'wand',
   desc:'対象のキャラクターにXダメージを与える。', effect:'fire', needsAny:true, baseUses:4},

  {id:'w_start_null', name:'沈黙の杖',  type:'wand', starterOnly:true,
   desc:'対象の敵のATKを0にする（1ターン）。', effect:'nullify', needsEnemy:true, baseUses:5},

  {id:'w_start_heal', name:'回復の杖',  type:'wand', starterOnly:true,
   desc:'全ての仲間のHPを全回復する。', effect:'heal_ally', baseUses:5},

  {id:'w_start_buff', name:'強化の杖',  type:'wand', starterOnly:true,
   desc:'対象のキャラクターに+X/±0を与える。', effect:'boost', needsAny:true, baseUses:5},

  {id:'w_golem',      name:'岩の杖',    type:'wand', starterOnly:true,
   desc:'前衛にX/Xのゴーレムを召喚する。', effect:'golem', baseUses:5},

  // ── WANDS（通常報酬プール） ──
  {id:'w_hate',       name:'撹乱の短杖', type:'wand', subtype:'wand', cost:2,
   desc:'対象のキャラクターの隊列を変更する。（前衛なら後衛、後衛なら前衛にする）', effect:'change_formation', needsAny:true, baseUses:4},

  {id:'w_poison',     name:'毒の杖',    type:'wand', cost:2,
   desc:'対象のキャラクターに毒Xを与える。', effect:'poison_wand', needsAny:true, baseUses:4},

  {id:'w_sacrifice',  name:'犠牲の短杖',  type:'wand', subtype:'wand', cost:2,
   desc:'対象の仲間を破壊し、全ての敵にそのパワーに等しいダメージを与える。', effect:'sacrifice', needsAlly:true, baseUses:4},

  {id:'w_boost_atk',  name:'強化の杖',  type:'wand', cost:2,
   desc:'対象のキャラクターに+X/±0を与える。', effect:'boost_atk', needsAny:true, baseUses:3},

  {id:'w_swap_pos',   name:'転移の短杖',  type:'wand', subtype:'wand', cost:2,
   desc:'対象のキャラクター2体の位置を入れ替える。（仲間と敵は不可）', effect:'swap_pos', baseUses:4},

  {id:'w_weaken',     name:'脱力の短杖',  type:'wand', subtype:'wand', cost:2,
   desc:'対象のキャラクターのパワーを半分にする。', effect:'weaken_half', needsAny:true, baseUses:3},

  {id:'w_golem_pool', name:'岩の杖',    type:'wand', cost:2,
   desc:'前衛にX/Xのゴーレムを召喚する。', effect:'golem', baseUses:4},

  {id:'w_spread',     name:'拡散の短杖',  type:'wand', subtype:'wand', cost:2, unique:true,
   desc:'右隣の杖の効果を使用する。', effect:'spread', baseUses:3},

  {id:'w_meteor',     name:'隕石の杖',  type:'wand', cost:2,
   desc:'ランダムな敵にXダメージをX回与える。', effect:'meteor_multi', baseUses:4},

  {id:'w_shield_grant', name:'光輝の短杖', type:'wand', subtype:'wand', cost:2,
   desc:'対象のキャラクターにシールドを与える。', effect:'shield_wand', needsAny:true, baseUses:4},

  {id:'w_growth_grant', name:'成長の杖', type:'wand', cost:2,
   desc:'対象のキャラクターに成長Xを与える。', effect:'growth_wand', needsAny:true, baseUses:3},

  {id:'w_flash_blade', name:'閃刃の短杖', type:'wand', subtype:'wand', cost:2,
   desc:'全てのキャラクターに1ダメージを与える。', effect:'flash_blade', baseUses:4},

  {id:'w_charm',      name:'魅了の杖',  type:'wand', cost:2,
   desc:'対象のパワーが魔術レベル以下の敵を仲間にする。', effect:'charm', needsEnemy:true, baseUses:3},

  {id:'w_doom',       name:'破滅の杖',  type:'wand', cost:2,
   desc:'全ての敵にXダメージを与える。', effect:'doom', baseUses:4},

  {id:'w_possess',    name:'憑依の短杖',  type:'wand', subtype:'wand', cost:2,
   desc:'対象の仲間と、最もパワーの低い敵の場所を入れ替える。', effect:'possess', needsAlly:true, baseUses:4},

  {id:'w_confusion',  name:'混乱の短杖',  type:'wand', subtype:'wand', cost:2,
   desc:'対象のキャラクターのパワーとライフを入れ替える。', effect:'swap_stats', needsAny:true, baseUses:4},

  // ── WEAPONS（手動戦闘用） ──
  {id:'wp_hatchet', name:'ハチェット', type:'weapon', cost:2, grade:1, rarity:1, slotSize:1, power:3, baseUses:6,
   desc:'対象にこのキャラクターのパワー+3ダメージを与える。', needsEnemy:true},
  {id:'wp_longsword', name:'ロングソード', type:'weapon', cost:2, grade:1, rarity:1, slotSize:1, power:4, baseUses:5,
   desc:'対象にこのキャラクターのパワー+4ダメージを与える。', needsEnemy:true},
  {id:'wp_spear', name:'スピア', type:'weapon', cost:2, grade:1, rarity:1, slotSize:1, power:5, baseUses:3,
   desc:'対象にこのキャラクターのパワー+5ダメージを与える。', needsEnemy:true},
  {id:'wp_francisca', name:'フランキスカ', type:'weapon', cost:2, grade:1, rarity:1, slotSize:1, power:4, baseUses:6, weaponMode:'twin',
   desc:'対象に隣接したキャラクターに、このキャラクターのパワー+4ダメージを与える。', needsEnemy:true},
  {id:'wp_bastard_sword', name:'バスタードソード', type:'weapon', cost:3, grade:2, rarity:2, slotSize:1, power:5, baseUses:4, weaponKeyword:'armor8',
   desc:'対象にこのキャラクターのパワー+5ダメージを与え、装甲8を得る。', needsEnemy:true},
  {id:'wp_halberd', name:'ハルバード', type:'weapon', cost:3, grade:2, rarity:2, slotSize:1, power:6, baseUses:4,
   desc:'対象にこのキャラクターのパワー+6ダメージを与える。', needsEnemy:true},
  {id:'wp_battle_axe', name:'バトルアクス', type:'weapon', cost:3, grade:2, rarity:2, slotSize:1, power:8, baseUses:6,
   desc:'対象にこのキャラクターのパワー+8ダメージを与える。', needsEnemy:true},
  {id:'wp_claymore', name:'クレイモア', type:'weapon', cost:4, grade:3, rarity:2, slotSize:2, power:7, baseUses:5, weaponMode:'triple',
   desc:'対象と隣接したキャラクターに、このキャラクターのパワー+7ダメージを与える。', needsEnemy:true},
  {id:'wp_partisan', name:'パルチザン', type:'weapon', cost:4, grade:3, rarity:2, slotSize:1, power:9, baseUses:4,
   desc:'対象にこのキャラクターのパワー+9ダメージを与える。', needsEnemy:true},
  {id:'wp_fury_axe', name:'フューリーアクス', type:'weapon', cost:4, grade:3, rarity:3, slotSize:1, power:5, baseUses:15, weaponMode:'all',
   desc:'味方を含む全てのキャラクターに、このキャラクターのパワー+5ダメージを与える。'},
  {id:'wp_avenger', name:'アヴェンジャー', type:'weapon', cost:4, grade:3, rarity:3, slotSize:1, power:8, baseUses:9, weaponKeyword:'lifesteal',
   desc:'対象にこのキャラクターのパワー+8ダメージを与え、与えたダメージ分ライフを回復する。', needsEnemy:true},
  {id:'wp_rune_spear', name:'ルーンスピア', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:11, baseUses:3, lethalEffect:'soul1',
   desc:'対象にこのキャラクターのパワー+11ダメージを与える。致命：ソウルを1得る。', needsEnemy:true},
  {id:'wp_mjolnir', name:'ミョルニール', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:13, baseUses:9,
   desc:'対象にこのキャラクターのパワー+13ダメージを与える。', needsEnemy:true},
  {id:'wp_forseti', name:'フォルセティ', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:'durability', baseUses:20,
   desc:'対象にこのキャラクターのパワー+耐久度ダメージを与える。', needsEnemy:true},
  {id:'wp_stormbringer', name:'ストームブリンガー', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:8, baseUses:15, repeat:3,
   desc:'対象にこのキャラクターのパワー+8ダメージを3回与える。', needsEnemy:true},
  {id:'wp_mistilteinn', name:'ミストルティン', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:1, baseUses:3, weaponKeyword:'instant',
   desc:'対象にこのキャラクターのパワー+1ダメージを与える。命中した対象は即死する。', needsEnemy:true},
  {id:'wp_gungnir', name:'グングニル', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:15, baseUses:2, lethalEffect:'no_durability_loss',
   desc:'対象にこのキャラクターのパワー+15ダメージを与える。致命：耐久度が減らない。', needsEnemy:true},
  {id:'wp_trident', name:'トライデント', type:'weapon', cost:5, grade:4, rarity:3, slotSize:1, power:12, baseUses:8, weaponMode:'triple',
   desc:'対象と隣接したキャラクターに、このキャラクターのパワー+12ダメージを与える。', needsEnemy:true},

  // ── ITEMS（マップショップ用） ──
  {id:'c_vital_water', name:'活力の水', type:'consumable', cost:2, grade:1, rarity:1,
   desc:'対象のライフを+1〜4する。', effect:'vital_water', needsAlly:true},
  {id:'c_speed_water', name:'神速の水', type:'consumable', cost:3, grade:2, rarity:2,
   desc:'この後、2回続けて行動する。', effect:'speed_water', needsAlly:true},
  {id:'c_life_water', name:'生命の水', type:'consumable', cost:2, grade:1, rarity:1,
   desc:'対象のライフを4〜7回復する。', effect:'life_water', needsAlly:true},
  {id:'c_elixir', name:'エリクサー', type:'consumable', cost:4, grade:3, rarity:3,
   desc:'対象のライフを全回復する。', effect:'elixir', needsAlly:true},
  {id:'c_power_water', name:'力の水', type:'consumable', cost:2, grade:1, rarity:1,
   desc:'対象のパワーを+1〜4する。', effect:'power_water', needsAlly:true},
  {id:'c_might_potion', name:'怪力の薬', type:'consumable', cost:3, grade:2, rarity:2,
   desc:'対象のパワーを10にする。', effect:'might_potion', needsAlly:true},
  {id:'c_hero_potion', name:'英雄の薬', type:'consumable', cost:4, grade:3, rarity:3,
   desc:'この戦闘の間、ライフと最大ライフとパワーを2倍にする。', effect:'hero_potion', needsAlly:true},
  {id:'c_witch_elixir', name:'魔女の秘薬', type:'consumable', cost:4, grade:3, rarity:3,
   desc:'対象のパワーをこのキャラクターにコピーする。', effect:'witch_elixir', needsAlly:true},
  {id:'c_mist_potion', name:'霧化の薬', type:'consumable', cost:3, grade:2, rarity:2,
   desc:'3ターンの間、対象が受けるダメージを半減する。', effect:'mist_potion', needsAlly:true},
  {id:'c_fire_bottle', name:'火炎瓶', type:'consumable', cost:3, grade:2, rarity:2,
   desc:'対象と、隣接した場所を炎上させる。（炎上はその上のカードに毎ターン開始時に10ダメージ。3ターン後に鎮火）', effect:'fire_bottle', needsAny:true},
  {id:'c_acid_bottle', name:'硫酸瓶', type:'consumable', cost:2, grade:1, rarity:1,
   desc:'対象と、隣接した場所のカードに5ダメージを与える。', effect:'acid_bottle', needsAny:true},

  // ── CONSUMABLES ──
  {id:'c_battle_start', name:'栄光の巻物', type:'consumable', cost:2,
   desc:'全ての戦闘開始時の効果を発動する。', effect:'battle_start_book'},

  {id:'c_magic_book',   name:'叡智の薬',   type:'consumable', cost:2,
   desc:'魔術レベルが+1される。', effect:'magic_book'},

  {id:'c_sacr_doll',    name:'破壊の巻物', type:'consumable', cost:2,
   desc:'対象のボス、エリートでないキャラクターを破壊する。', effect:'sacrifice_doll', needsAny:true},

  {id:'c_counter',      name:'反逆の薬',   type:'consumable', cost:2,
   desc:'対象のキャラクターに反撃を与える。', effect:'counter_scroll', needsAny:true},

  {id:'c_purify',       name:'浄化の薬',   type:'consumable', cost:2,
   desc:'対象のキャラクターの毒を消す。', effect:'purify_hate', needsAny:true},

  {id:'c_kill',         name:'禁呪の薬',   type:'consumable', cost:2,
   desc:'対象のキャラクターに即死を与える。', effect:'instakill', needsAny:true},

  {id:'c_rally',        name:'鼓舞の巻物', type:'consumable', cost:2,
   desc:'全ての仲間に±0/+2を与える。', effect:'big_rally'},

  {id:'c_ritual_scroll',name:'儀式の巻物', type:'consumable', cost:2,
   desc:'対象の仲間を破壊し、そのキャラクターが持っていた全てのキーワード能力を対象の別のキャラクターに移す。', effect:'ritual_scroll', needsAlly:true},

  // ── 特殊消耗品（通常報酬には出ない） ──
  {id:'c_soul_dregs',  name:'魂の残滓', type:'consumable', starterOnly:true,
   desc:'契約を1つ選ぶ。そのグレードを次の戦闘終了まで+1する。', effect:'soul_dregs'},

  {id:'c_reiki_herb',  name:'治癒の薬',   type:'consumable', rarity:-1,
   desc:'対象のキャラクターに±0/+4を与える。', effect:'reiki_herb', needsAny:true},

  {id:'w_heal_all',    name:'回復の杖',  type:'wand', cost:2,
   desc:'全ての仲間のライフを+Xする。', effect:'heal_wand_all', baseUses:4},

  {id:'w_transform',   name:'変身の短杖', type:'wand', subtype:'wand', cost:2,
   desc:'対象のキャラクターを、同じグレードのランダムなキャラクターに変化させる。（全ての状態異常やバフ、重ね状態はリセットされる）', effect:'transform_wand', needsAny:true, baseUses:3},

  // ── レアリティ4消耗品（洞窟ボーナス・特殊入手のみ） ──
  {id:'c_demon_herb',  name:'魔神の秘薬', type:'consumable', rarity:4,
   desc:'戦闘終了時に得るソウルが永続で+1される。', effect:'soul_income'},

  {id:'c_king_herb',   name:'聖王の秘薬', type:'consumable', rarity:4,
   desc:'行動回数が永続で+1される。', effect:'bonus_action_herb'},

  {id:'c_sage_herb',   name:'賢者の秘薬', type:'consumable', rarity:4,
   desc:'魔術レベルが+3される。', effect:'magic_book_3'},
];
