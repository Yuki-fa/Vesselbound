// ═══════════════════════════════════════
// assets.js — 仮アセット台帳
// すべての画像参照はこのファイルに集約する。
// file:// 起動を維持するため、プロジェクトルート相対パスを使う。
// ═══════════════════════════════════════

const Assets = {
  cards: {
    default: 'assets/cards/card_placeholder.svg',
    character: 'assets/cards/card_character.svg',
    ring: 'assets/cards/card_ring.svg',
    wand: 'assets/cards/card_wand.svg',
    consumable: 'assets/cards/card_item.svg',
    characterFrame: 'assets/cards/character_frame.png',
    defenderFrame: 'assets/cards/character_defender_frame.png',
    enemyFrame: 'assets/cards/enemy_frame.png',
    ringFrame: 'assets/cards/ring_frame.png',
    wandFrame: 'assets/cards/wand_frame.png',
    itemFrame: 'assets/cards/item_frame.png',
    weaponFrame: 'assets/cards/weapon_frame.png',
    growthFrame: 'assets/cards/growth_frame.png',
    summonFrameGreen: 'assets/cards/summon_frame1.png',
    summonFrameBlue: 'assets/cards/summon_frame2.png',
    summonFrameRed: 'assets/cards/summon_frame3.png',
    summonFrameBrown: 'assets/cards/summon_frame4.png',
    summonFramePurple: 'assets/cards/summon_frame5.png',
    enchantmentFrame: 'assets/cards/enchantment.png',
    spell1: 'assets/cards/spell_frame1.png',
    spell2: 'assets/cards/spell_frame2.png',
    spell3: 'assets/cards/spell_frame3.png',
    spell4: 'assets/cards/spell_frame4.png',
    spell5: 'assets/cards/spell_frame5.png',
    gradeStar: 'assets/cards/grade_star.png',
    redOrb: 'assets/cards/red_orb.png',
    blueOrb: 'assets/cards/blue_orb.png',
    greenOrb: 'assets/cards/green.png',
    yellowOrb: 'assets/cards/yellow_orb.png',
    purpleOrb: 'assets/cards/purple_orb.png',
    manaOrb: 'assets/cards/mana_orb.png',
    blood: 'assets/cards/blood.png',
    characterMask: 'assets/cards/ch_mask.png',
    wandSheet: 'assets/cards/wand_sheet.png',
  },
  characterSheets: {
    set1: 'assets/cards/characters/sheet_set1.png',
    set2: 'assets/cards/characters/sheet_set2.png',
    set3: 'assets/cards/characters/sheet_set3.png',
  },
  backgrounds: {
    title: 'assets/art/backgrounds/title_castle.png',
    camp: 'assets/art/backgrounds/camp.png',
    worldMap: 'assets/art/backgrounds/world_map.png',
    stage1: 'assets/art/backgrounds/stage_forest.webp',
    stage2: 'assets/art/backgrounds/stage_grassland.webp',
    stage3: 'assets/art/backgrounds/stage_valley.webp',
    stage4: 'assets/art/backgrounds/stage_capital.webp',
    stageEnd: 'assets/art/backgrounds/stage_endworld.webp',
    // 街（村）専用画面の背景。ステージ番号＝G._waveに対応する。
    // village0＝ゲーム開始地点「風止みの村 リーゼ」。
    village0: 'assets/art/backgrounds/village_start.png',
    village1: 'assets/art/backgrounds/village_forest.png',
    village2: 'assets/art/backgrounds/village_grassland.png',
    village3: 'assets/art/backgrounds/village_valley.png',
    village4: 'assets/art/backgrounds/city_capital.png',
    villageEnd: 'assets/art/backgrounds/village_endworld.png',
    // ワールドマップ画面（出発時に数秒表示する）
    map: 'assets/art/backgrounds/map.jpg',
    // 塔（祭壇）画面の背景
    tower: 'assets/art/backgrounds/tower.png',
    // 街の施設ごとの背景（ステージ1・エルム）
    itemShopForest: 'assets/art/backgrounds/item_shop_forest.png',
    magicShopForest: 'assets/art/backgrounds/magic_shop_forest.png',
    // 街の施設ごとの背景（ステージ2・ヴァルガ）
    itemShopGrassland: 'assets/art/backgrounds/item_shop_grassland.png',
    magicShopGrassland: 'assets/art/backgrounds/magic_shop_grassland.png',
    blacksmithGrassland: 'assets/art/backgrounds/blacksmith_grassland.png',
    // 街の施設ごとの背景（ステージ3・ギャラハ）
    magicShopValley: 'assets/art/backgrounds/magic_shop_valley.png',
    blacksmithValley: 'assets/art/backgrounds/blacksmith_valley.png',
  },
  vfx: {
    // 透過済みアニメーションWebP（黒背景を事前に透過済み）。playHitVfxAtRect()が.webpを
    // 検出した場合、canvasでのルミナンスキー処理を行わずimgでそのまま再生する。
    hit: 'assets/vfx/hit.webp',
    glow: 'assets/vfx/glow.svg',
    // キャラクターの効果（通常攻撃ではない）でダメージが発生した際、そのキャラクターの
    // ナンバー（CXXX）に対応するWebPがあれば、通常のhit.webpの代わりに再生する。
    // 存在するものだけをここに登録する（未登録＝通常のhit.webpを使用）。
    characterEffect: {
      'C001': 'assets/vfx/C001.webp',
      'C002': 'assets/vfx/C002.webp',
      'C003': 'assets/vfx/C003.webp',
      'C043': 'assets/vfx/C043.webp',
    },
    // C043等、薙ぎ払い演出（playCharacterSweepVfx）専用の動画/WebP。
    // mp4ならcanvasでズーム・回転・再生速度をリアルタイム調整し、WebPならimgでそのまま再生する
    // （characterEffectとは別管理。playHitVfxAtRect()側からは参照しない）。
    characterSweep: {
      'C043': 'assets/vfx/C043.webp',
    },
    // 特殊演出シート（生贄破棄・封印解放等）専用のWebP。playSpecialProductionVfx()が使用する。
    specialProduction: {
      S002: 'assets/vfx/S002.webp',
      S003: 'assets/vfx/S003.webp',
    },
    // キーワード発動（毒等）でダメージが発生した際、そのキーワードのナンバー（KXXX）に
    // 対応するWebPがあれば、通常のhit.webpの代わりに再生する。存在するものだけをここに登録する。
    keywordEffect: {
      'K007': 'assets/vfx/K007.webp', // 毒
      'K026': 'assets/vfx/K026.webp', // マナ効果
    },
  },
  ui: {
    frame: 'assets/ui/card_frame.svg',
    turn: 'assets/ui/turn.png',
    turnFlow: 'assets/ui/turn_flow.png',
    log: 'assets/ui/log.png',
    option: 'assets/ui/option.svg',
    button: 'assets/ui/button.svg',
    backLight: 'assets/ui/back_light.svg',
    board: 'assets/ui/board.svg',
    itemSlot: 'assets/ui/item_slot.svg',
    mark: 'assets/ui/mark.svg',
    reward: 'assets/ui/reward.svg',
    ringSlot: 'assets/ui/ring_slot.svg',
  },
  map: {
    panel: 'assets/art/backgrounds/world_map.png',
    panel2: 'assets/art/backgrounds/world_map.png',
    dashedLine: 'assets/map/dashed_line.png',
    player: 'assets/map/player.png',
    empty: 'assets/map/empty.png',
    empty2: 'assets/map/empty2.png',
    mob: 'assets/map/mob.png',
    elite: 'assets/map/elite.png',
    boss: 'assets/map/boss.png',
    treasure: 'assets/map/treasure.png',
    altar: 'assets/map/altar.png',
    event: 'assets/map/event.png',
    shop: 'assets/map/shop.png',
  },
  mapBoard: {
    summon: 'assets/cards/m_board1.svg',
    life: 'assets/cards/m_board2.svg',
    eternal: 'assets/cards/m_board3.svg',
    resonance: 'assets/cards/m_board4.svg',
    duplicate: 'assets/cards/m_board5.svg',
    empty: 'assets/cards/m_board6.svg',
  },
  sfx: {
    uiConfirm: 'assets/sfx/ui_confirm.wav',
    uiConfirmHeavy: 'assets/sfx/ui_confirm_heavy.wav',
    uiError: 'assets/sfx/ui_error.wav',
    menuOpen: 'assets/sfx/menu_open.wav',
    menuClose: 'assets/sfx/menu_close.wav',
    select: 'assets/sfx/select.wav',
    knock: 'assets/sfx/knock.wav',
    boom: 'assets/sfx/boom.wav',
    shopIn: 'assets/sfx/shop_in.wav',
    shopOut: 'assets/sfx/shop_out.wav',
    altarIn: 'assets/sfx/altar_in.wav',
    altarOut: 'assets/sfx/altar_out.wav',
    fit: 'assets/sfx/fit.wav',
    'return': 'assets/sfx/return.wav',
    menu: 'assets/bgm/menu.wav',
    villageForest: 'assets/bgm/village_forest.wav',
    villageGrassland: 'assets/bgm/village_grassland.wav',
    villageValley: 'assets/bgm/village_valley.wav',
    villageEndworld: 'assets/bgm/village_endworld.wav',
    cityCapital: 'assets/bgm/city_capital.wav',
    tower: 'assets/bgm/tower.wav',
    gameStart: 'assets/bgm/game_start.wav',
    villageStart: 'assets/bgm/village_start.wav', // リーゼ（ゲーム開始地点）
    // 街BGMに重ねる環境音（サブBGMレイヤー）
    thunder: 'assets/bgm/thunder.wav',
    rain: 'assets/bgm/rain.wav',
    bug: 'assets/bgm/bug.wav',
    // 施設内で重ねる環境音
    blacksmith: 'assets/bgm/blacksmith.wav',
    battle1: 'assets/bgm/battle1.wav',
    battle3: 'assets/bgm/battle3.wav',
    reroll: 'assets/sfx/reroll.wav',
    purchase: 'assets/sfx/purchase.wav',
    attack: 'assets/sfx/attack.wav',
    shield: 'assets/sfx/shield.wav',
    poison: 'assets/sfx/poison.wav',
    fire: 'assets/sfx/fire.wav',
    superMagic: 'assets/sfx/super_magic.wav',
    sword1: 'assets/sfx/sword1.wav',
    sword2: 'assets/sfx/sword2.wav',
    sword3: 'assets/sfx/sword3.wav',
    axe1: 'assets/sfx/axe1.wav',
    axe2: 'assets/sfx/axe2.wav',
    axe3: 'assets/sfx/axe3.wav',
    punch1: 'assets/sfx/punch1.wav',
    punch2: 'assets/sfx/punch2.wav',
    punch3: 'assets/sfx/punch3.wav',
    kick1: 'assets/sfx/kick1.wav',
    kick2: 'assets/sfx/kick2.wav',
    kick3: 'assets/sfx/kick3.wav',
    death: 'assets/sfx/death.wav',
    C001: 'assets/sfx/C001.wav',
    C002: 'assets/sfx/C002.wav',
    C003: 'assets/sfx/C003.wav',
    K026: 'assets/sfx/K026.wav',
    spellCast: 'assets/sfx/spell_cast.wav',
    spellFire: 'assets/sfx/spell_fire.wav',
    spellHeal: 'assets/sfx/spell_heal.wav',
    summon: 'assets/sfx/summon.wav',
    victory: 'assets/sfx/victory.wav',
    bossVictory: 'assets/sfx/boss_victory.wav',
    lifeLost: 'assets/sfx/life_lost.wav',
    S002: 'assets/sfx/S002.wav',
    S003: 'assets/sfx/S003.wav',
  },
};

const SpellArtMap = {
  '炎の杖': 'assets/cards/wands/fire.png',
  '毒の杖': 'assets/cards/wands/poison.png',
  '強化の杖': 'assets/cards/wands/boost.png',
  '岩の杖': 'assets/cards/wands/rock.png',
  '隕石の杖': 'assets/cards/wands/meteor.png',
  '破滅の杖': 'assets/cards/wands/ruin.png',
  '成長の杖': 'assets/cards/wands/growth.png',
  '魅了の杖': 'assets/cards/wands/charm.png',
  '回復の杖': 'assets/cards/wands/recovery.png',
  '撹乱の短杖': 'assets/cards/wands/disruption.png',
  '犠牲の短杖': 'assets/cards/wands/sacrifice.png',
  '転移の短杖': 'assets/cards/wands/teleportation.png',
};

const PanelArtMap = {
  'ミラ': 'assets/cards/panels/generated/mira.png',
  'アトラ': 'assets/cards/panels/generated/atora.png',
  'アドラ': 'assets/cards/panels/generated/atora.png',
  '武術の知識': 'assets/cards/panels/generated/martial_knowledge.png',
  '魔術の知識': 'assets/cards/panels/generated/magic_knowledge.png',
  '神術の知識': 'assets/cards/panels/generated/divine_knowledge.png',
  '戦技マスター': 'assets/cards/panels/generated/master_knowledge.png',
  '修練': 'assets/cards/panels/generated/training.png',
  '吸血': 'assets/cards/panels/generated/vampire.png',
  '隠密': 'assets/cards/panels/generated/stealth.png',
  '反撃': 'assets/cards/panels/generated/counter.png',
  'パンチ': 'assets/cards/panels/generated/punch.png',
  '噛みつき': 'assets/cards/panels/generated/bite.png',
};

const CharacterArtOverrideMap = {
  'ミラ': {path:'assets/cards/panels/generated/mira.png'},
  'アトラ': {path:'assets/cards/panels/generated/atora.png'},
  'アドラ': {path:'assets/cards/panels/generated/atora.png'},
  '戦士': {path:'assets/cards/characters/crops/new_starters/starter_warrior.png'},
  '魔術師': {path:'assets/cards/characters/crops/new_starters/starter_mage.png'},
  '神官': {path:'assets/cards/characters/crops/new_starters/starter_priest.png'},
  '盗賊': {path:'assets/cards/characters/crops/new_starters/starter_thief.png'},
  '騎士': {path:'assets/cards/characters/crops/new_starters/starter_knight.png'},
  '屍術師': {path:'assets/cards/characters/crops/new_starters/starter_necromancer.png'},
  '蛮族': {path:'assets/cards/characters/crops/new_starters/starter_barbarian.png'},
  '狩人': {path:'assets/cards/characters/crops/new_starters/starter_hunter.png'},
  '咬竜"グレイプニル"': {path:'assets/cards/characters/crops/new_starters/named_graipnir.png'},
  '咬竜“グレイプニル”': {path:'assets/cards/characters/crops/new_starters/named_graipnir.png'},
  '金床の賢者"シンドリ"': {path:'assets/cards/characters/crops/new_starters/named_sindri.png'},
  '金床の賢者“シンドリ”': {path:'assets/cards/characters/crops/new_starters/named_sindri.png'},
  '極光の女王"グンダ"': {path:'assets/cards/characters/crops/new_starters/named_gunda.png'},
  '極光の女王“グンダ”': {path:'assets/cards/characters/crops/new_starters/named_gunda.png'},
  '深淵の捕食者"エギル"': {path:'assets/cards/characters/crops/new_starters/named_aegir.png'},
  '深淵の捕食者“エギル”': {path:'assets/cards/characters/crops/new_starters/named_aegir.png'},
  'ミテーラ': {path:'assets/cards/characters/crops/mitera.png'},
  'ジャッカロープ': {path:'assets/cards/characters/crops/jackalope.png'},
  'ケットシー': {path:'assets/cards/characters/crops/ketshi.png'},
  'グリマルキン': {path:'assets/cards/characters/crops/grimalkin.png'},
  'マーメイド': {path:'assets/cards/characters/crops/mermaid.png'},
  'ピグミー': {path:'assets/cards/characters/crops/pygmy.png'},
  'ドワーフ': {path:'assets/cards/characters/crops/dwarf.png'},
  'ラミア': {path:'assets/cards/characters/crops/lamia.png'},
  'スケルトン': {path:'assets/cards/characters/crops/skeleton.png'},
  'ゾンビ': {path:'assets/cards/characters/crops/zombie.png'},
  'マミー': {path:'assets/cards/characters/crops/mummy.png'},
  'バンシー': {path:'assets/cards/characters/crops/banshee.png'},
  'エルフ': {path:'assets/art/characters/C044.jpg'},
  'ブラウニー': {path:'assets/art/characters/C043.jpg'},
  'ジャック・オ・ランタン': {path:'assets/cards/characters/crops/jack_o_lantern.png'},
  'シルフ': {path:'assets/cards/characters/crops/sylph.png'},
  'インプ': {path:'assets/art/characters/C061.jpg'},
  'グレムリン': {path:'assets/cards/characters/crops/gremlin.png'},
  'インキュバス': {path:'assets/cards/characters/crops/incubus.png'},
  'サキュバス': {path:'assets/cards/characters/crops/succubus.png'},
  'ヘルナイト': {path:'assets/cards/characters/crops/hell_knight.png'},
  'デーモン': {path:'assets/cards/characters/crops/demon.png'},
  'ウェンディゴ': {path:'assets/cards/characters/crops/wendigo.png'},
  'ヴォイド・ウォーカー': {path:'assets/cards/characters/crops/void_walker.png'},
  'ヴォイドウォーカー': {path:'assets/cards/characters/crops/void_walker.png'},
  'カオス・インプ': {path:'assets/cards/characters/crops/chaos_imp.png'},
  'カオスインプ': {path:'assets/cards/characters/crops/chaos_imp.png'},
  'レッサーデーモン': {path:'assets/cards/characters/crops/lesser_demon.png'},
  'ドラゴネット': {path:'assets/cards/characters/crops/dragonet.png'},
  'アークデーモン': {path:'assets/art/characters/C062.jpg'},
  'アラッサス': {path:'assets/art/characters/C081.jpg'},
  'スリン': {path:'assets/art/characters/C082.jpg'},
  'リザードマン': {path:'assets/cards/characters/crops/lizardman.png'},
  'ゴブリン': {path:'assets/cards/characters/crops/goblin.png'},
  'オーク': {path:'assets/cards/characters/crops/orc.png'},
  'グール': {path:'assets/cards/characters/crops/ghoul.png'},
  'ポルターガイスト': {path:'assets/cards/characters/crops/poltergeist.png'},
  'ジャイアントラット': {path:'assets/cards/characters/crops/giant_rat.png'},
  'マッドキャット': {path:'assets/cards/characters/crops/madcat.png'},
  'ウィスプ': {path:'assets/cards/characters/crops/wisp.png'},
  'コブラン': {path:'assets/cards/characters/crops/kobran.png'},
  'ファイアブレス': {path:'assets/cards/characters/crops/fire_breath.png'},
  'ポイズンミスト': {path:'assets/cards/characters/crops/poison_mist.png'},
  '惑わしの妖精"エインセル"': {path:'assets/cards/characters/crops/named_einsel.png'},
  '惑わしの妖精“エインセル”': {path:'assets/cards/characters/crops/named_einsel.png'},
  '鉄の拳"フォルニョート"': {path:'assets/cards/characters/crops/named_fornjotr.png'},
  '鉄の拳“フォルニョート”': {path:'assets/cards/characters/crops/named_fornjotr.png'},
  '残響の魔導師"アバドン"': {path:'assets/cards/characters/crops/named_abaddon.png'},
  '残響の魔導師“アバドン”': {path:'assets/cards/characters/crops/named_abaddon.png'},
  '黄金の瞳"フレイ"': {path:'assets/cards/characters/crops/named_freyr.png'},
  '黄金の瞳“フレイ”': {path:'assets/cards/characters/crops/named_freyr.png'},
  '虚空の渡し守"ナグルファル"': {path:'assets/cards/characters/crops/named_naglfar.png'},
  '虚空の渡し守“ナグルファル”': {path:'assets/cards/characters/crops/named_naglfar.png'},
  'コカトリス': {path:'assets/cards/characters/crops/named_cocatrice.png'},
  'ウォーグ': {path:'assets/cards/characters/crops/named_warg.png'},
  'ペガサス': {path:'assets/cards/characters/crops/named_pegasus.png'},
  'ペリュトン': {path:'assets/cards/characters/crops/named_peryton.png'},
  'ゴールデン・グース': {path:'assets/cards/characters/crops/named_golden_goose.png'},
  'コボルド': {path:'assets/cards/characters/crops/named_kobold.png'},
  'アラクネ': {path:'assets/cards/characters/crops/named_arachne.png'},
  'ミノタウロス': {path:'assets/cards/characters/crops/minotaur.png'},
  'ハーピー': {path:'assets/cards/characters/crops/harpy.png'},
  'サイレン': {path:'assets/cards/characters/crops/siren.png'},
  'レイス': {path:'assets/cards/characters/crops/wraith.png'},
  'ドラウグ': {path:'assets/cards/characters/crops/draugr.png'},
  'シャドウ': {path:'assets/cards/characters/crops/shadow.png'},
  'スペクター': {path:'assets/cards/characters/crops/spectre.png'},
  'ゴースト': {path:'assets/cards/characters/crops/ghost.png'},
  'ノーム': {path:'assets/cards/characters/crops/gnome.png'},
  'ドリアード': {path:'assets/cards/characters/crops/dryad.png'},
  'ウンディーネ': {path:'assets/cards/characters/crops/undine.png'},
  'フロスト・スプライト': {path:'assets/cards/characters/crops/frost_sprite.png'},
  'フロストスプライト': {path:'assets/cards/characters/crops/frost_sprite.png'},
  'レプラコーン': {path:'assets/cards/characters/crops/leprechaun.png'},
  'ガーゴイル': {path:'assets/cards/characters/crops/gargoyle.png'},
  'ヘルハウンド': {path:'assets/cards/characters/crops/hellhound.png'},
  'アルプ': {path:'assets/cards/characters/crops/alp.png'},
  'ダークワン': {path:'assets/cards/characters/crops/darkone.png'},
  'ファミリア': {path:'assets/cards/characters/crops/familiar.png'},
  'ワーム': {path:'assets/cards/characters/crops/worm.png'},
  'リンドヴルム': {path:'assets/cards/characters/crops/lindworm.png'},
  'ハイドラ': {path:'assets/cards/characters/crops/hydra.png'},
  'ドレイク': {path:'assets/cards/characters/crops/drake.png'},
  'シーサーペント': {path:'assets/cards/characters/crops/sea_serpent.png'},
  'サラマンダー': {path:'assets/cards/characters/crops/salamander.png'},
  'ワイバーン': {path:'assets/cards/characters/crops/wyvern.png'},
  'ナーガ': {path:'assets/cards/characters/crops/naga.png'},
  'ケートス': {path:'assets/cards/characters/crops/cetus.png'},
  'ヴィブリア': {path:'assets/cards/characters/crops/viburia.png'},
  'バジリスク': {path:'assets/cards/characters/crops/basilisk.png'},
  'ホムンクルス': {path:'assets/cards/characters/crops/homunculus.png'},
  'サテュロス': {path:'assets/cards/characters/crops/satyr.png'},
  'ダークエルフ': {path:'assets/cards/characters/crops/dark_elf.png'},
  'カースドアーマー': {path:'assets/cards/characters/crops/cursed_armor.png'},
  'ボーンナイト': {path:'assets/cards/characters/crops/bone_knight.png'},
  'ダイアウルフ': {path:'assets/art/characters/C041.jpg'},
  'スリープシープ': {path:'assets/art/characters/C042.jpg'},
  'ヒポグリフ': {path:'assets/cards/characters/crops/hippogriff.png'},
  'ケルピー': {path:'assets/cards/characters/crops/kelpie.png'},
  'スプリガン': {path:'assets/cards/characters/crops/spriggan.png'},
  'ズメイ': {path:'assets/cards/characters/crops/zmei.png'},
  'ブラッドロード': {path:'assets/cards/characters/crops/bloodlord.png'},
  'クロコッタ': {path:'assets/cards/characters/crops/crocutta.png'},
  'ルフ': {path:'assets/cards/characters/crops/rukh.png'},
  'バンダースナッチ': {path:'assets/cards/characters/crops/bandersnatch.png'},
  'ナックラヴィー': {path:'assets/cards/characters/crops/nuckelavee.png'},
  'ヴァーチャー': {path:'assets/cards/characters/crops/virtue.png'},
  'エルヴンメイジ': {path:'assets/cards/characters/crops/elven_mage.png'},
  'メリュジーヌ': {path:'assets/cards/characters/crops/melusine.png'},
  'リアナンシー': {path:'assets/cards/characters/crops/rhiannon.png'},
  'ファナティック': {path:'assets/art/characters/C100.jpg'},
};

const CharacterArtMap = {
  '惑わしの妖精"エインセル"': {path:'assets/cards/characters/crops/named_einsel.png'},
  '鉄の拳"フォルニョート"': {path:'assets/cards/characters/crops/named_fornjotr.png'},
  '残響の魔導師"アバドン"': {path:'assets/cards/characters/crops/named_abaddon.png'},
  '黄金の瞳"フレイ"': {path:'assets/cards/characters/crops/named_freyr.png'},
  '虚空の渡し守"ナグルファル"': {path:'assets/cards/characters/crops/named_naglfar.png'},
  'コカトリス': {path:'assets/cards/characters/crops/named_cocatrice.png'},
  'ウォーグ': {path:'assets/cards/characters/crops/named_warg.png'},
  'ペガサス': {path:'assets/cards/characters/crops/named_pegasus.png'},
  'ペリュトン': {path:'assets/cards/characters/crops/named_peryton.png'},
  'ゴールデン・グース': {path:'assets/cards/characters/crops/named_golden_goose.png'},
  'コボルド': {path:'assets/cards/characters/crops/named_kobold.png'},
  'アラクネ': {path:'assets/cards/characters/crops/named_arachne.png'},
  'ジャイアントラット': {sheet:'set1', cols:6, rows:2, col:0, row:0},
  'マッドキャット': {sheet:'set1', cols:6, rows:2, col:1, row:0},
  'ミテーラ': {sheet:'set1', cols:6, rows:2, col:2, row:0},
  'ジャッカロープ': {sheet:'set1', cols:6, rows:2, col:3, row:0},
  'ケットシー': {sheet:'set1', cols:6, rows:2, col:4, row:0},
  'グリマルキン': {sheet:'set1', cols:6, rows:2, col:5, row:0},
  'ゴブリン': {sheet:'set1', cols:6, rows:2, col:0, row:1},
  'オーク': {sheet:'set1', cols:6, rows:2, col:1, row:1},
  'マーメイド': {sheet:'set1', cols:6, rows:2, col:2, row:1},
  'ピグミー': {sheet:'set1', cols:6, rows:2, col:3, row:1},
  'ドワーフ': {sheet:'set1', cols:6, rows:2, col:4, row:1},
  'ラミア': {sheet:'set1', cols:6, rows:2, col:5, row:1},
  'グール': {sheet:'set2', cols:6, rows:2, col:0, row:0},
  'ポルターガイスト': {sheet:'set2', cols:6, rows:2, col:1, row:0},
  'スケルトン': {sheet:'set2', cols:6, rows:2, col:2, row:0},
  'ゾンビ': {sheet:'set2', cols:6, rows:2, col:3, row:0},
  'マミー': {sheet:'set2', cols:6, rows:2, col:4, row:0},
  'バンシー': {sheet:'set2', cols:6, rows:2, col:5, row:0},
  'ウィスプ': {sheet:'set2', cols:6, rows:2, col:0, row:1},
  'コブラン': {sheet:'set2', cols:6, rows:2, col:1, row:1},
  'エルフ': {sheet:'set2', cols:6, rows:2, col:2, row:1},
  'ブラウニー': {sheet:'set2', cols:6, rows:2, col:3, row:1},
  'ジャック・オ・ランタン': {sheet:'set2', cols:6, rows:2, col:4, row:1},
  'シルフ': {sheet:'set2', cols:6, rows:2, col:5, row:1},
  'ポイズンミスト': {sheet:'set3', cols:5, rows:2, col:0, row:0},
  'インプ': {sheet:'set3', cols:5, rows:2, col:1, row:0},
  'グレムリン': {sheet:'set3', cols:5, rows:2, col:2, row:0},
  'インキュバス': {sheet:'set3', cols:5, rows:2, col:3, row:0},
  'レッサーデーモン': {sheet:'set3', cols:5, rows:2, col:4, row:0},
  'ファイアブレス': {sheet:'set3', cols:5, rows:2, col:0, row:1},
  'ドラゴネット': {sheet:'set3', cols:5, rows:2, col:1, row:1},
  'アラッサス': {sheet:'set3', cols:5, rows:2, col:2, row:1},
  'スリン': {sheet:'set3', cols:5, rows:2, col:3, row:1},
  'リザードマン': {sheet:'set3', cols:5, rows:2, col:4, row:1},
};

function assetUrl(path){
  // pathが配列の場合、先頭から順に重ねて指定する。存在しない画像はそのレイヤーが
  // 単に透過表示されるだけなので、下に重ねた候補（別拡張子）が透けて見える＝拡張子違いの自動フォールバックになる
  if(Array.isArray(path)) return path.filter(Boolean).map(p=>`url("${p}")`).join(',');
  return `url("${path}")`;
}

function getStageBackgroundKey(floor){
  const f=Number(floor||1);
  if(f<=5) return 'stage1';
  if(f<=10) return 'stage2';
  if(f<=15) return 'stage3';
  return 'stage4';
}

function getCardAsset(card){
  if(!card) return Assets.cards.default;
  const panelArt=getPanelArtPath(card);
  if(panelArt) return panelArt;
  if(card._isChar||(!card.type&&!card.kind)) return Assets.cards.character;
  if(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope) return Assets.cards.consumable;
  if(card.type==='wand') return Assets.cards.wand;
  if(card.type==='consumable') return Assets.cards.consumable;
  if(card.type==='ring'||card.kind==='summon'||card.kind==='passive') return Assets.cards.ring;
  return Assets.cards.default;
}

const SummonColorByName = {
  'ノーム':'黄',
  'マータ':'赤',
  'ゾンビ':'青',
  'スケルトン':'青',
  'ダイアウルフ':'緑',
  'スリープシープ':'緑',
  'ブラウニー':'黄',
  'エルフ':'黄',
  'インプ':'赤',
  'アークデーモン':'赤',
  'アラッサス':'青',
  'スリン':'緑',
};

function _summonColor(card){
  const direct=String(card?.color||card?.カラー||card?.colour||'').trim();
  if(direct) return direct;
  return SummonColorByName[String(card?.name||'').trim()]||'';
}

function _summonFrameByColor(color){
  if(color==='緑') return Assets.cards.summonFrameGreen||Assets.cards.characterFrame;
  if(color==='青') return Assets.cards.summonFrameBlue||Assets.cards.characterFrame;
  if(color==='赤') return Assets.cards.summonFrameRed||Assets.cards.characterFrame;
  if(color==='茶'||color==='黄') return Assets.cards.summonFrameBrown||Assets.cards.characterFrame;
  if(color==='紫') return Assets.cards.summonFramePurple||Assets.cards.characterFrame;
  return Assets.cards.summonFrameGreen||Assets.cards.characterFrame;
}

function _spellFrameByColor(color){
  const c=String(color||'').trim().toLowerCase();
  if(c==='green'||c==='緑') return Assets.cards.spell1;
  if(c==='blue'||c==='青') return Assets.cards.spell2;
  if(c==='yellow'||c==='黄'||c==='茶') return Assets.cards.spell3;
  if(c==='red'||c==='赤') return Assets.cards.spell4;
  if(c==='purple'||c==='紫') return Assets.cards.spell5;
  return Assets.cards.spell1;
}

function getCardFrameAsset(card){
  if(!card) return Assets.cards.default;
  if(card._isChar||(!card.type&&!card.kind)) return Assets.cards.characterFrame;
  if(card.magicPanel) return Assets.cards.wandFrame;
  if(card.type==='global-panel'||card.panelScope==='global') return Assets.cards.itemFrame;
  if(card.category==='スペル'||card.type==='spell'||card.kind==='spell') return _spellFrameByColor(card.color);
  if(card.type==='panel'||card.kind==='panel'||card.panelScope){
    const cat=String(card.category||'');
    if(cat.includes('キャラクター')||cat.includes('召喚')){
      const color=_summonColor(card);
      return color?_summonFrameByColor(color):Assets.cards.characterFrame;
    }
    if(cat.includes('強化')||cat.includes('エンチャント')) return Assets.cards.enchantmentFrame||Assets.cards.wandFrame;
    return Assets.cards.growthFrame||Assets.cards.itemFrame;
  }
  if(card.fixedAttack||card.fixedEquip) return Assets.cards.weaponFrame||Assets.cards.itemFrame;
  if(card.type==='wand') return Assets.cards.wandFrame;
  if(card.type==='consumable') return Assets.cards.itemFrame;
  if(card.type==='ring'||card.kind==='summon'||card.kind==='passive') return Assets.cards.ringFrame;
  return Assets.cards.itemFrame;
}

function _characterArtDef(cardOrName){
  const name=typeof cardOrName==='string'?cardOrName:cardOrName?.name;
  if(!name) return null;
  return CharacterArtOverrideMap[name]||CharacterArtMap[name]||null;
}

function _assetCodeRaw(card){
  if(!card||typeof card!=='object') return '';
  return String(card.artCode??card._artCode??card.code??card._code??card['No.']??card.No??card.no??card['No']??card.imageNo??card.image_no??card.画像No??card.画像番号??'').trim();
}

function _normalizeAssetCode(raw, fallbackPrefix){
  const text=String(raw||'').trim();
  if(!text) return '';
  // 旧「P」表記（メインキャラクター）は新しい「MC」表記に読み替える
  const prefixed=text.match(/^(MC|EN|P|[ECS])\s*0*(\d+)$/i);
  if(prefixed){
    let p=prefixed[1].toUpperCase();
    if(p==='P') p='MC';
    return p+String(parseInt(prefixed[2],10)).padStart(3,'0');
  }
  const n=parseInt(text,10);
  if(!Number.isFinite(n)||n<=0) return '';
  return String(fallbackPrefix||'C').toUpperCase()+String(n).padStart(3,'0');
}

function getCharacterNoArtPath(card){
  if(!card||typeof card!=='object') return '';
  const raw=_assetCodeRaw(card);
  if(!raw) return '';
  const isEnemyCard=!!(card._sheetEnemy||card.enemyOnly||card.side==='enemy'||card.isEnemy);
  const explicit=String(raw).trim().match(/^(MC|EN|[ECS])/i);
  let prefix=explicit?explicit[1].toUpperCase():'';
  if(!prefix){
    const cat=String(card.category||card.kind||card.type||'');
    if(isEnemyCard) prefix='EN';
    else if(card._isChar||card.starterOnly||card.initialParty) prefix='MC';
    else if(cat==='スペル') prefix='S';
    else if(cat==='強化'||cat==='エンチャント') prefix='E';
    else if(cat||card.panelScope||card.summon||card.magicPanel) prefix='C';
    else prefix='C';
  }
  let code=_normalizeAssetCode(raw,prefix);
  if(!code) return '';
  // 敵専用カードはシート側が旧「E」表記のままでも、実ファイルが「EN」表記のため補正する。
  if(isEnemyCard){
    const m=code.match(/^E(\d+)$/i);
    if(m) code='EN'+m[1].padStart(3,'0');
  }
  let dir='';
  if(code.startsWith('MC')) dir='assets/art/main_characters';
  else if(code.startsWith('EN')) dir='assets/art/enemies';
  else if(code[0]==='E') dir='assets/art/enchantment';
  else if(code[0]==='C') dir='assets/art/characters';
  else if(code[0]==='S') dir='assets/art/cards';
  else return '';
  // 拡張子はjpg/pngどちらで保存されているか分からないため両方を候補として返す（assetUrlが重ね合わせで解決する）
  return [`${dir}/${code}.jpg`,`${dir}/${code}.png`];
}

// キャラクターの効果によるダメージ時、そのキャラクター専用の透過WebPが
// 登録されていればそのパスを返す。登録が無ければ空文字（呼び出し側で通常のhit.webpを使う）。
function getCharacterEffectVfxPath(unit){
  const raw=_assetCodeRaw(unit);
  if(!raw) return '';
  const code=_normalizeAssetCode(raw,'C');
  if(!code) return '';
  return (Assets.vfx.characterEffect&&Assets.vfx.characterEffect[code])||'';
}

// C043等、薙ぎ払い演出（playCharacterSweepVfx）専用の動画（mp4）のパスを返す。
// canvasでのズーム・回転・再生速度調整をリアルタイムに行うため、こちらはWebP化しない。
function getCharacterSweepVfxPath(unit){
  const raw=_assetCodeRaw(unit);
  if(!raw) return '';
  const code=_normalizeAssetCode(raw,'C');
  if(!code) return '';
  return (Assets.vfx.characterSweep&&Assets.vfx.characterSweep[code])||'';
}

// キーワード（毒等）の発動によるダメージ時、そのキーワードのナンバー（KXXX、KW_NO_MAPで解決）に
// 対応する動画が登録されていればそのパスを返す。登録が無ければ空文字。
function getKeywordEffectVfxPath(keywordName){
  if(!keywordName) return '';
  const code=(typeof KW_NO_MAP!=='undefined'&&KW_NO_MAP[keywordName])||'';
  if(keywordName==='マナ効果'&&!code) return Assets.vfx.keywordEffect?.K026||'';
  if(!code) return '';
  return (Assets.vfx.keywordEffect&&Assets.vfx.keywordEffect[code])||'';
}

function applyCharacterArtVars(el, cardOrName, prefix){
  if(!el) return false;
  const direct=typeof cardOrName==='object' ? (cardOrName.art||cardOrName.image||'') : '';
  if(direct){
    const p=prefix||'--char';
    el.style.setProperty(`${p}-art`, assetUrl(direct));
    el.style.setProperty(`${p}-art-size`, 'cover');
    el.style.setProperty(`${p}-art-position`, 'center 58%');
    return true;
  }
  const numbered=typeof cardOrName==='object' ? getCharacterNoArtPath(cardOrName) : '';
  if(numbered){
    const p=prefix||'--char';
    el.style.setProperty(`${p}-art`, assetUrl(numbered));
    el.style.setProperty(`${p}-art-size`, 'cover');
    el.style.setProperty(`${p}-art-position`, 'center 58%');
    return true;
  }
  const def=_characterArtDef(cardOrName);
  if(!def) return false;
  const name=typeof cardOrName==='string'?cardOrName:cardOrName?.name;
  const sheet=def.path||`assets/cards/characters/crops/${def.sheet}_${def.col}_${def.row}.png`;
  const p=prefix||'--char';
  el.style.setProperty(`${p}-art`, assetUrl(sheet));
  el.style.setProperty(`${p}-art-size`, 'cover');
  el.style.setProperty(`${p}-art-position`, name==='アラッサス'?'56% 58%':'center 58%');
  return true;
}

function applySpellArtVars(el, card, prefix){
  if(!el||!card||card.type!=='wand') return false;
  const path=SpellArtMap[card.name];
  if(!path) return false;
  const p=prefix||'--card';
  el.style.setProperty(`${p}-art`, assetUrl(path));
  el.style.setProperty(`${p}-art-size`, 'cover');
  el.style.setProperty(`${p}-art-position`, 'center 58%');
  return true;
}

function getPanelArtPath(card){
  const name=card?.name||'';
  if(!name) return '';
  if(card?.art||card?.image) return card.art||card.image;
  const numbered=getCharacterNoArtPath(card);
  if(numbered) return numbered;
  if(PanelArtMap[name]) return PanelArtMap[name];
  const key=Object.keys(PanelArtMap).find(k=>name.includes(k));
  return key?PanelArtMap[key]:'';
}

function applyPanelArtVars(el, card, prefix){
  if(!el||!card) return false;
  const path=getPanelArtPath(card);
  if(!path) return false;
  const p=prefix||'--card';
  el.style.setProperty(`${p}-art`, assetUrl(path));
  el.style.setProperty(`${p}-art-size`, 'cover');
  el.style.setProperty(`${p}-art-position`, 'center top');
  return true;
}

function applyCardVisual(el, card){
  if(!el) return;
  el.style.setProperty('--card-frame', assetUrl(getCardFrameAsset(card)));
  if(!applyPanelArtVars(el, card, '--card')&&!applySpellArtVars(el, card, '--card')&&!applyCharacterArtVars(el, card, '--card')){
    el.style.setProperty('--card-art', assetUrl(getCardAsset(card)));
    el.style.removeProperty('--card-art-size');
    el.style.removeProperty('--card-art-position');
  }
}

function panelDirectionMarksHtml(card, connectivity){
  const cat=String(card?.category||'');
  if(!card||!Array.isArray(card.directions)||!(cat==='強化'||cat==='エンチャント')) return '';
  // つながっている方向は矢印自体を消す（代わりに_renderPanelUniteMarkersが2枚の中間にunite画像を1つだけ描画する）
  return card.directions.map(d=>{
    if(connectivity&&connectivity[d]==='connected') return '';
    return `<span class="panel-dir panel-dir-${d}"></span>`;
  }).join('');
}

function applyUnitVisual(el, unit){
  if(!el) return;
  const isEnemyEl=el.classList.contains('enemy')||!!(unit&&unit._useEnemyVisualFrame);
  const isPlayerHero=!!(unit&&!isEnemyEl&&!unit._panelSummoned);
  const hasGuard=!isPlayerHero&&!!(unit&&Array.isArray(unit.equipment)&&unit.equipment.some(p=>p&&(p.name==='守護'||p.name==='ヘイト'||(p.keywords||[]).includes('守護')||(p.keywords||[]).includes('ヘイト'))));
  const unitGuard=!isPlayerHero&&!!(unit&&Array.isArray(unit.keywords)&&(unit.keywords.includes('守護')||unit.keywords.includes('ヘイト')));
  const classGuard=!isPlayerHero&&(el.classList.contains('is-defender')||el.classList.contains('uses-hate-frame'));
  const isDefender=!!(unit&&!isPlayerHero&&(unit.hate&&unit.hateTurns>0||hasGuard||unitGuard))||classGuard;
  const frame=isEnemyEl
    ? Assets.cards.enemyFrame
    : isPlayerHero
      ? Assets.cards.characterFrame
      : _summonFrameByColor(_summonColor(unit)) || (isDefender?Assets.cards.defenderFrame:Assets.cards.characterFrame);
  el.style.setProperty('--unit-frame', assetUrl(frame));
  if(!applyCharacterArtVars(el, unit, '--unit')){
    el.style.setProperty('--unit-art', assetUrl(Assets.cards.character));
    el.style.removeProperty('--unit-art-size');
    el.style.removeProperty('--unit-art-position');
  }
}

function gradeIconHtml(g){
  const n=Math.max(1,Math.min(5,Number(g)||1));
  return `<span class="grade-stars grade-stars-${n}" aria-label="G${n}">${Array.from({length:n},(_,i)=>`<span class="grade-star grade-star-${i+1}"></span>`).join('')}</span>`;
}

function setScreenAssetBackground(screenId, bgKey){
  const el=document.getElementById('scr-'+screenId);
  const path=Assets.backgrounds[bgKey];
  if(!el||!path) return;
  el.classList.add('asset-backed');
  el.style.setProperty('--screen-bg-image', assetUrl(path));
}

function applyScreenAssetBackground(screenId){
  if(screenId==='title'){ setScreenAssetBackground('title','title'); return; }
  if(screenId==='shop'){ setScreenAssetBackground('shop','shop'); return; }
  if(screenId==='village'){
    const key=(typeof getVillageBackgroundKey==='function')?getVillageBackgroundKey():'village1';
    setScreenAssetBackground('village',key);
    return;
  }
  if(screenId==='map'){ setScreenAssetBackground('map','map'); return; }
  if(screenId==='battle'){
    const mapStage=(typeof getWorldMapStageBackgroundKey==='function')?getWorldMapStageBackgroundKey():null;
    const key=mapStage||((typeof G!=='undefined'&&G&&G._isShop)?'camp':getStageBackgroundKey(typeof G!=='undefined'?G.floor:1));
    setScreenAssetBackground('battle',key);
  }
}

function applyUiAssets(){
  const root=document.documentElement;
  if(!root) return;
  root.style.setProperty('--turn-button-image', assetUrl(Assets.ui.turn));
  root.style.setProperty('--turn-button-flow-image', assetUrl(Assets.ui.turnFlow));
  root.style.setProperty('--grade-star-image', assetUrl(Assets.cards.gradeStar));
  root.style.setProperty('--character-mask-image', assetUrl(Assets.cards.characterMask));
  root.style.setProperty('--log-panel-image', assetUrl(Assets.ui.log));
  root.style.setProperty('--option-button-image', assetUrl(Assets.ui.option));
  if(Assets.map&&Assets.map.panel) root.style.setProperty('--world-map-panel-image', assetUrl(Assets.map.panel));
}

function setBattleStageBackground(){
  const mapStage=(typeof getWorldMapStageBackgroundKey==='function')?getWorldMapStageBackgroundKey():null;
  setScreenAssetBackground('battle',mapStage||getStageBackgroundKey(typeof G!=='undefined'?G.floor:1));
}

function setBattleShopBackground(){
  setScreenAssetBackground('battle','camp');
}

function playVfxOnElement(type, el){
  if(!el||typeof G!=='undefined'&&G._isSimulating) return;
  const path=Assets.vfx[type];
  if(!path) return;
  const fx=document.createElement('div');
  fx.className=`vfx vfx-${type}`;
  fx.style.setProperty('--vfx-image', assetUrl(path));
  el.appendChild(fx);
  fx.addEventListener('animationend',()=>fx.remove(),{once:true});
}

function playHitVfx(side, idx, amount){
  if(typeof G!=='undefined'&&G._isSimulating) return;
  const draw=()=>{
    const id=side==='enemy'?'f-enemy':'f-ally';
    const slot=document.getElementById(id)?.querySelector(`.slot[data-unit-idx="${idx}"]`)||
      document.getElementById(id)?.querySelectorAll('.slot')?.[idx];
    if(typeof window.playHitVfx==='function'&&window.playHitVfx!==playHitVfx){
      window.playHitVfx(side,idx,amount);
      return;
    }
    playVfxOnElement('hit',slot);
  };
  requestAnimationFrame(()=>requestAnimationFrame(draw));
}

function playCardUseVfx(idx){
  const el=document.querySelector(`[data-card-ctx="spell-battle"][data-card-idx="${idx}"]`);
  if(el){
    el.classList.add('card-use-glow');
    playVfxOnElement('glow',el);
    setTimeout(()=>el.classList.remove('card-use-glow'),420);
  }
}

window.Assets=Assets;
window.applyCardVisual=applyCardVisual;
window.applyUnitVisual=applyUnitVisual;
window.gradeIconHtml=gradeIconHtml;

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',applyUiAssets,{once:true});
}else{
  applyUiAssets();
}
