// ═══════════════════════════════════════
// assets.js — 仮アセット台帳
// すべての画像参照はこのファイルに集約する。
// file:// 起動を維持するため、プロジェクトルート相対パスを使う。
// ═══════════════════════════════════════

const Assets = {
  cards: {
    default: 'assets/temp/cards/card_placeholder.svg',
    character: 'assets/temp/cards/card_character.svg',
    ring: 'assets/temp/cards/card_ring.svg',
    wand: 'assets/temp/cards/card_wand.svg',
    consumable: 'assets/temp/cards/card_item.svg',
    characterFrame: 'assets/temp/cards/character_frame.png',
    defenderFrame: 'assets/temp/cards/character_defender_frame.png',
    ringFrame: 'assets/temp/cards/ring_frame.png',
    wandFrame: 'assets/temp/cards/wand_frame.png',
    itemFrame: 'assets/temp/cards/item_frame.png',
    weaponFrame: 'assets/temp/cards/weapon_frame.png',
    gradeStar: 'assets/temp/cards/grade_star.png',
    characterMask: 'assets/temp/cards/ch_mask.png',
    wandSheet: 'assets/temp/cards/wand_sheet.png',
  },
  characterSheets: {
    set1: 'assets/temp/cards/characters/sheet_set1.png',
    set2: 'assets/temp/cards/characters/sheet_set2.png',
    set3: 'assets/temp/cards/characters/sheet_set3.png',
  },
  backgrounds: {
    title: 'assets/temp/backgrounds/title_castle.png',
    camp: 'assets/temp/backgrounds/camp.png',
    stage1: 'assets/temp/backgrounds/stage_grassland.png',
    stage2: 'assets/temp/backgrounds/stage_forest.png',
    stage3: 'assets/temp/backgrounds/stage_valley.png',
    stage4: 'assets/temp/backgrounds/stage_capital.png',
  },
  vfx: {
    hit: 'assets/temp/vfx/hit.svg',
    glow: 'assets/temp/vfx/glow.svg',
  },
  ui: {
    frame: 'assets/temp/ui/card_frame.svg',
    turn: 'assets/temp/ui/turn.png',
    turnFlow: 'assets/temp/ui/turn_flow.png',
    log: 'assets/temp/ui/log.png',
    option: 'assets/temp/ui/option.png',
  },
  map: {
    panel: 'assets/temp/ui/map/panel.png',
    panel2: 'assets/temp/ui/map/panel2.png',
    dashedLine: 'assets/temp/ui/map/dashed_line.png',
    player: 'assets/temp/ui/map/player.png',
    empty: 'assets/temp/ui/map/empty.png',
    empty2: 'assets/temp/ui/map/empty2.png',
    mob: 'assets/temp/ui/map/mob.png',
    elite: 'assets/temp/ui/map/elite.png',
    boss: 'assets/temp/ui/map/boss.png',
    treasure: 'assets/temp/ui/map/treasure.png',
    altar: 'assets/temp/ui/map/altar.png',
    event: 'assets/temp/ui/map/event.png',
    shop: 'assets/temp/ui/map/shop.png',
  },
  sfx: {
    uiConfirm: 'assets/temp/sfx/ui_confirm.wav',
    uiError: 'assets/temp/sfx/ui_error.wav',
    reroll: 'assets/temp/sfx/reroll.wav',
    purchase: 'assets/temp/sfx/purchase.wav',
    goldGain: 'assets/temp/sfx/gold_gain.wav',
    attackLight: 'assets/temp/sfx/attack_light.wav',
    hitLight: 'assets/temp/sfx/hit_light.wav',
    death: 'assets/temp/sfx/death.wav',
    spellCast: 'assets/temp/sfx/spell_cast.wav',
    spellFire: 'assets/temp/sfx/spell_fire.wav',
    spellPoison: 'assets/temp/sfx/spell_poison.wav',
    spellHeal: 'assets/temp/sfx/spell_heal.wav',
    summon: 'assets/temp/sfx/summon.wav',
    victory: 'assets/temp/sfx/victory.wav',
  },
};

const SpellArtMap = {
  '炎の杖': 'assets/temp/cards/wands/fire.png',
  '毒の杖': 'assets/temp/cards/wands/poison.png',
  '強化の杖': 'assets/temp/cards/wands/boost.png',
  '岩の杖': 'assets/temp/cards/wands/rock.png',
  '隕石の杖': 'assets/temp/cards/wands/meteor.png',
  '破滅の杖': 'assets/temp/cards/wands/ruin.png',
  '成長の杖': 'assets/temp/cards/wands/growth.png',
  '魅了の杖': 'assets/temp/cards/wands/charm.png',
  '回復の杖': 'assets/temp/cards/wands/recovery.png',
  '撹乱の短杖': 'assets/temp/cards/wands/disruption.png',
  '犠牲の短杖': 'assets/temp/cards/wands/sacrifice.png',
  '転移の短杖': 'assets/temp/cards/wands/teleportation.png',
};

const PanelArtMap = {
  'ミラ': 'assets/temp/cards/panels/generated/mira.png',
  'アトラ': 'assets/temp/cards/panels/generated/atora.png',
  'アドラ': 'assets/temp/cards/panels/generated/atora.png',
  '武術の知識': 'assets/temp/cards/panels/generated/martial_knowledge.png',
  '魔術の知識': 'assets/temp/cards/panels/generated/magic_knowledge.png',
  '神術の知識': 'assets/temp/cards/panels/generated/divine_knowledge.png',
  '戦技マスター': 'assets/temp/cards/panels/generated/master_knowledge.png',
  '修練': 'assets/temp/cards/panels/generated/training.png',
  '吸血': 'assets/temp/cards/panels/generated/vampire.png',
  '隠密': 'assets/temp/cards/panels/generated/stealth.png',
  '反撃': 'assets/temp/cards/panels/generated/counter.png',
  'パンチ': 'assets/temp/cards/panels/generated/punch.png',
  '噛みつき': 'assets/temp/cards/panels/generated/bite.png',
};

const CharacterArtOverrideMap = {
  'ミラ': {path:'assets/temp/cards/panels/generated/mira.png'},
  'アトラ': {path:'assets/temp/cards/panels/generated/atora.png'},
  'アドラ': {path:'assets/temp/cards/panels/generated/atora.png'},
  '戦士': {path:'assets/temp/cards/characters/crops/new_starters/starter_warrior.png'},
  '魔術師': {path:'assets/temp/cards/characters/crops/new_starters/starter_mage.png'},
  '神官': {path:'assets/temp/cards/characters/crops/new_starters/starter_priest.png'},
  '盗賊': {path:'assets/temp/cards/characters/crops/new_starters/starter_thief.png'},
  '騎士': {path:'assets/temp/cards/characters/crops/new_starters/starter_knight.png'},
  '屍術師': {path:'assets/temp/cards/characters/crops/new_starters/starter_necromancer.png'},
  '蛮族': {path:'assets/temp/cards/characters/crops/new_starters/starter_barbarian.png'},
  '狩人': {path:'assets/temp/cards/characters/crops/new_starters/starter_hunter.png'},
  '咬竜"グレイプニル"': {path:'assets/temp/cards/characters/crops/new_starters/named_graipnir.png'},
  '咬竜“グレイプニル”': {path:'assets/temp/cards/characters/crops/new_starters/named_graipnir.png'},
  '金床の賢者"シンドリ"': {path:'assets/temp/cards/characters/crops/new_starters/named_sindri.png'},
  '金床の賢者“シンドリ”': {path:'assets/temp/cards/characters/crops/new_starters/named_sindri.png'},
  '極光の女王"グンダ"': {path:'assets/temp/cards/characters/crops/new_starters/named_gunda.png'},
  '極光の女王“グンダ”': {path:'assets/temp/cards/characters/crops/new_starters/named_gunda.png'},
  '深淵の捕食者"エギル"': {path:'assets/temp/cards/characters/crops/new_starters/named_aegir.png'},
  '深淵の捕食者“エギル”': {path:'assets/temp/cards/characters/crops/new_starters/named_aegir.png'},
  'ミテーラ': {path:'assets/temp/cards/characters/crops/mitera.png'},
  'ジャッカロープ': {path:'assets/temp/cards/characters/crops/jackalope.png'},
  'ケットシー': {path:'assets/temp/cards/characters/crops/ketshi.png'},
  'グリマルキン': {path:'assets/temp/cards/characters/crops/grimalkin.png'},
  'マーメイド': {path:'assets/temp/cards/characters/crops/mermaid.png'},
  'ピグミー': {path:'assets/temp/cards/characters/crops/pygmy.png'},
  'ドワーフ': {path:'assets/temp/cards/characters/crops/dwarf.png'},
  'ラミア': {path:'assets/temp/cards/characters/crops/lamia.png'},
  'スケルトン': {path:'assets/temp/cards/characters/crops/skeleton.png'},
  'ゾンビ': {path:'assets/temp/cards/characters/crops/zombie.png'},
  'マミー': {path:'assets/temp/cards/characters/crops/mummy.png'},
  'バンシー': {path:'assets/temp/cards/characters/crops/banshee.png'},
  'エルフ': {path:'assets/temp/cards/characters/crops/elf.png'},
  'ブラウニー': {path:'assets/temp/cards/characters/crops/brownie.png'},
  'ジャック・オ・ランタン': {path:'assets/temp/cards/characters/crops/jack_o_lantern.png'},
  'シルフ': {path:'assets/temp/cards/characters/crops/sylph.png'},
  'インプ': {path:'assets/temp/cards/characters/crops/imp.png'},
  'グレムリン': {path:'assets/temp/cards/characters/crops/gremlin.png'},
  'インキュバス': {path:'assets/temp/cards/characters/crops/incubus.png'},
  'サキュバス': {path:'assets/temp/cards/characters/crops/succubus.png'},
  'ヘルナイト': {path:'assets/temp/cards/characters/crops/hell_knight.png'},
  'デーモン': {path:'assets/temp/cards/characters/crops/demon.png'},
  'ウェンディゴ': {path:'assets/temp/cards/characters/crops/wendigo.png'},
  'ヴォイド・ウォーカー': {path:'assets/temp/cards/characters/crops/void_walker.png'},
  'ヴォイドウォーカー': {path:'assets/temp/cards/characters/crops/void_walker.png'},
  'カオス・インプ': {path:'assets/temp/cards/characters/crops/chaos_imp.png'},
  'カオスインプ': {path:'assets/temp/cards/characters/crops/chaos_imp.png'},
  'レッサーデーモン': {path:'assets/temp/cards/characters/crops/lesser_demon.png'},
  'ドラゴネット': {path:'assets/temp/cards/characters/crops/dragonet.png'},
  'アラッサス': {path:'assets/temp/cards/characters/crops/arassus.png'},
  'スリン': {path:'assets/temp/cards/characters/crops/slinn.png'},
  'リザードマン': {path:'assets/temp/cards/characters/crops/lizardman.png'},
  'ゴブリン': {path:'assets/temp/cards/characters/crops/goblin.png'},
  'オーク': {path:'assets/temp/cards/characters/crops/orc.png'},
  'グール': {path:'assets/temp/cards/characters/crops/ghoul.png'},
  'ポルターガイスト': {path:'assets/temp/cards/characters/crops/poltergeist.png'},
  'ジャイアントラット': {path:'assets/temp/cards/characters/crops/giant_rat.png'},
  'マッドキャット': {path:'assets/temp/cards/characters/crops/madcat.png'},
  'ウィスプ': {path:'assets/temp/cards/characters/crops/wisp.png'},
  'コブラン': {path:'assets/temp/cards/characters/crops/kobran.png'},
  'ファイアブレス': {path:'assets/temp/cards/characters/crops/fire_breath.png'},
  'ポイズンミスト': {path:'assets/temp/cards/characters/crops/poison_mist.png'},
  '惑わしの妖精"エインセル"': {path:'assets/temp/cards/characters/crops/named_einsel.png'},
  '惑わしの妖精“エインセル”': {path:'assets/temp/cards/characters/crops/named_einsel.png'},
  '鉄の拳"フォルニョート"': {path:'assets/temp/cards/characters/crops/named_fornjotr.png'},
  '鉄の拳“フォルニョート”': {path:'assets/temp/cards/characters/crops/named_fornjotr.png'},
  '残響の魔導師"アバドン"': {path:'assets/temp/cards/characters/crops/named_abaddon.png'},
  '残響の魔導師“アバドン”': {path:'assets/temp/cards/characters/crops/named_abaddon.png'},
  '黄金の瞳"フレイ"': {path:'assets/temp/cards/characters/crops/named_freyr.png'},
  '黄金の瞳“フレイ”': {path:'assets/temp/cards/characters/crops/named_freyr.png'},
  '虚空の渡し守"ナグルファル"': {path:'assets/temp/cards/characters/crops/named_naglfar.png'},
  '虚空の渡し守“ナグルファル”': {path:'assets/temp/cards/characters/crops/named_naglfar.png'},
  'コカトリス': {path:'assets/temp/cards/characters/crops/named_cocatrice.png'},
  'ウォーグ': {path:'assets/temp/cards/characters/crops/named_warg.png'},
  'ペガサス': {path:'assets/temp/cards/characters/crops/named_pegasus.png'},
  'ペリュトン': {path:'assets/temp/cards/characters/crops/named_peryton.png'},
  'ゴールデン・グース': {path:'assets/temp/cards/characters/crops/named_golden_goose.png'},
  'コボルド': {path:'assets/temp/cards/characters/crops/named_kobold.png'},
  'アラクネ': {path:'assets/temp/cards/characters/crops/named_arachne.png'},
  'ミノタウロス': {path:'assets/temp/cards/characters/crops/minotaur.png'},
  'ハーピー': {path:'assets/temp/cards/characters/crops/harpy.png'},
  'サイレン': {path:'assets/temp/cards/characters/crops/siren.png'},
  'レイス': {path:'assets/temp/cards/characters/crops/wraith.png'},
  'ドラウグ': {path:'assets/temp/cards/characters/crops/draugr.png'},
  'シャドウ': {path:'assets/temp/cards/characters/crops/shadow.png'},
  'スペクター': {path:'assets/temp/cards/characters/crops/spectre.png'},
  'ゴースト': {path:'assets/temp/cards/characters/crops/ghost.png'},
  'ノーム': {path:'assets/temp/cards/characters/crops/gnome.png'},
  'ドリアード': {path:'assets/temp/cards/characters/crops/dryad.png'},
  'ウンディーネ': {path:'assets/temp/cards/characters/crops/undine.png'},
  'フロスト・スプライト': {path:'assets/temp/cards/characters/crops/frost_sprite.png'},
  'フロストスプライト': {path:'assets/temp/cards/characters/crops/frost_sprite.png'},
  'レプラコーン': {path:'assets/temp/cards/characters/crops/leprechaun.png'},
  'ガーゴイル': {path:'assets/temp/cards/characters/crops/gargoyle.png'},
  'ヘルハウンド': {path:'assets/temp/cards/characters/crops/hellhound.png'},
  'アルプ': {path:'assets/temp/cards/characters/crops/alp.png'},
  'ダークワン': {path:'assets/temp/cards/characters/crops/darkone.png'},
  'ファミリア': {path:'assets/temp/cards/characters/crops/familiar.png'},
  'ワーム': {path:'assets/temp/cards/characters/crops/worm.png'},
  'リンドヴルム': {path:'assets/temp/cards/characters/crops/lindworm.png'},
  'ハイドラ': {path:'assets/temp/cards/characters/crops/hydra.png'},
  'ドレイク': {path:'assets/temp/cards/characters/crops/drake.png'},
  'シーサーペント': {path:'assets/temp/cards/characters/crops/sea_serpent.png'},
  'サラマンダー': {path:'assets/temp/cards/characters/crops/salamander.png'},
  'ワイバーン': {path:'assets/temp/cards/characters/crops/wyvern.png'},
  'ナーガ': {path:'assets/temp/cards/characters/crops/naga.png'},
  'ケートス': {path:'assets/temp/cards/characters/crops/cetus.png'},
  'ヴィブリア': {path:'assets/temp/cards/characters/crops/viburia.png'},
  'バジリスク': {path:'assets/temp/cards/characters/crops/basilisk.png'},
  'ホムンクルス': {path:'assets/temp/cards/characters/crops/homunculus.png'},
  'サテュロス': {path:'assets/temp/cards/characters/crops/satyr.png'},
  'ダークエルフ': {path:'assets/temp/cards/characters/crops/dark_elf.png'},
  'カースドアーマー': {path:'assets/temp/cards/characters/crops/cursed_armor.png'},
  'ボーンナイト': {path:'assets/temp/cards/characters/crops/bone_knight.png'},
  'ダイアウルフ': {path:'assets/temp/cards/characters/crops/dire_wolf.png'},
  'ヒポグリフ': {path:'assets/temp/cards/characters/crops/hippogriff.png'},
  'ケルピー': {path:'assets/temp/cards/characters/crops/kelpie.png'},
  'スプリガン': {path:'assets/temp/cards/characters/crops/spriggan.png'},
  'ズメイ': {path:'assets/temp/cards/characters/crops/zmei.png'},
  'ブラッドロード': {path:'assets/temp/cards/characters/crops/bloodlord.png'},
  'クロコッタ': {path:'assets/temp/cards/characters/crops/crocutta.png'},
  'ルフ': {path:'assets/temp/cards/characters/crops/rukh.png'},
  'バンダースナッチ': {path:'assets/temp/cards/characters/crops/bandersnatch.png'},
  'ナックラヴィー': {path:'assets/temp/cards/characters/crops/nuckelavee.png'},
  'ヴァーチャー': {path:'assets/temp/cards/characters/crops/virtue.png'},
  'エルヴンメイジ': {path:'assets/temp/cards/characters/crops/elven_mage.png'},
  'メリュジーヌ': {path:'assets/temp/cards/characters/crops/melusine.png'},
  'リアナンシー': {path:'assets/temp/cards/characters/crops/rhiannon.png'},
};

const CharacterArtMap = {
  '惑わしの妖精"エインセル"': {path:'assets/temp/cards/characters/crops/named_einsel.png'},
  '鉄の拳"フォルニョート"': {path:'assets/temp/cards/characters/crops/named_fornjotr.png'},
  '残響の魔導師"アバドン"': {path:'assets/temp/cards/characters/crops/named_abaddon.png'},
  '黄金の瞳"フレイ"': {path:'assets/temp/cards/characters/crops/named_freyr.png'},
  '虚空の渡し守"ナグルファル"': {path:'assets/temp/cards/characters/crops/named_naglfar.png'},
  'コカトリス': {path:'assets/temp/cards/characters/crops/named_cocatrice.png'},
  'ウォーグ': {path:'assets/temp/cards/characters/crops/named_warg.png'},
  'ペガサス': {path:'assets/temp/cards/characters/crops/named_pegasus.png'},
  'ペリュトン': {path:'assets/temp/cards/characters/crops/named_peryton.png'},
  'ゴールデン・グース': {path:'assets/temp/cards/characters/crops/named_golden_goose.png'},
  'コボルド': {path:'assets/temp/cards/characters/crops/named_kobold.png'},
  'アラクネ': {path:'assets/temp/cards/characters/crops/named_arachne.png'},
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

function getCardFrameAsset(card){
  if(!card) return Assets.cards.default;
  if(card._isChar||(!card.type&&!card.kind)) return Assets.cards.characterFrame;
  if(card.type==='global-panel'||card.panelScope==='global') return Assets.cards.itemFrame;
  if(card.type==='panel'||card.kind==='panel'||card.panelScope){
    return String(card.category||'').includes('パッシブ')?Assets.cards.ringFrame:(Assets.cards.weaponFrame||Assets.cards.itemFrame);
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

function applyCharacterArtVars(el, cardOrName, prefix){
  if(!el) return false;
  const def=_characterArtDef(cardOrName);
  if(!def) return false;
  const name=typeof cardOrName==='string'?cardOrName:cardOrName?.name;
  const sheet=def.path||`assets/temp/cards/characters/crops/${def.sheet}_${def.col}_${def.row}.png`;
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

function applyUnitVisual(el, unit){
  if(!el) return;
  const isDefender=!!(unit&&(unit.hate&&unit.hateTurns>0||unit.lane==='front'));
  el.style.setProperty('--unit-frame', assetUrl(isDefender?Assets.cards.defenderFrame:Assets.cards.characterFrame));
  if(!applyCharacterArtVars(el, unit, '--unit')){
    el.style.setProperty('--unit-art', assetUrl(Assets.cards.character));
    el.style.removeProperty('--unit-art-size');
    el.style.removeProperty('--unit-art-position');
  }
}

function gradeIconHtml(g){
  const n=1;
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
  if(screenId==='battle'){
    const key=(typeof G!=='undefined'&&G&&G._isShop)?'shop':getStageBackgroundKey(typeof G!=='undefined'?G.floor:1);
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
  setScreenAssetBackground('battle',getStageBackgroundKey(typeof G!=='undefined'?G.floor:1));
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

function playHitVfx(side, idx){
  if(typeof G!=='undefined'&&G._isSimulating) return;
  const draw=()=>{
    const id=side==='enemy'?'f-enemy':'f-ally';
    const slot=document.getElementById(id)?.querySelectorAll('.slot')?.[idx];
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
