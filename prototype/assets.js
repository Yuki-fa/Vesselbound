// ═══════════════════════════════════════
// assets.js — 仮アセット台帳
// すべての画像参照はこのファイルに集約する。
// file:// 起動を維持するため、プロジェクトルート相対パスを使う。
// ═══════════════════════════════════════

// カード枠の SVG を差し替えたら上げる。ブラウザのキャッシュで古い枠が出続けるのを防ぐ。
const CARD_FRAME_VERSION='frame0916';

const Assets = {
  cards: {
    // エリート／ボス用の枠。SVGをそのまま背景レイヤーとして使用する。
    characterFrame: `assets/cards/enemy_frame_m.svg?v=${CARD_FRAME_VERSION}`,
    enemyFrame: `assets/cards/enemy_frame.svg?v=${CARD_FRAME_VERSION}`,
    statOverlay: 'assets/cards/status_overlay.png',
    // **summon_frameN の N は色の並び（赤・青・緑・黄・紫）に対応する。**
    // summon_frame1 と summon_frame3 は入れ替え済み（1＝赤／3＝緑）。
    summonFrameRed: `assets/cards/character_frame1.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameBlue: `assets/cards/character_frame2.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameGreen: `assets/cards/character_frame3.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameBrown: `assets/cards/character_frame4.svg?v=${CARD_FRAME_VERSION}`,
    summonFramePurple: `assets/cards/character_frame5.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameRedMerged: `assets/cards/character_frame1_m.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameBlueMerged: `assets/cards/character_frame2_m.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameGreenMerged: `assets/cards/character_frame3_m.svg?v=${CARD_FRAME_VERSION}`,
    summonFrameBrownMerged: `assets/cards/character_frame4_m.svg?v=${CARD_FRAME_VERSION}`,
    summonFramePurpleMerged: `assets/cards/character_frame5_m.svg?v=${CARD_FRAME_VERSION}`,
    enchantmentFrame: `assets/cards/enchantment.svg?v=${CARD_FRAME_VERSION}`,
    enchantmentFrameMerged: `assets/cards/enchantment_m.svg?v=${CARD_FRAME_VERSION}`,
    // キーワード「刻印」を持つ強化カード（刻印6種）の枠（2026-10-02 利用者指定）。
    enchantmentEngravingFrame: `assets/cards/enchantment_engraving.svg?v=${CARD_FRAME_VERSION}-engr1002`,
    // spellN は色の枠（_spellFrameByColor が 1=緑 2=青 3=黄 4=赤 5=紫 で引く）。
    // 画像は上と同じものを色で選ぶ。
    spell1: `assets/cards/character_frame3.svg?v=${CARD_FRAME_VERSION}`,
    spell2: `assets/cards/character_frame2.svg?v=${CARD_FRAME_VERSION}`,
    spell3: `assets/cards/character_frame4.svg?v=${CARD_FRAME_VERSION}`,
    spell4: `assets/cards/character_frame1.svg?v=${CARD_FRAME_VERSION}`,
    spell5: `assets/cards/character_frame5.svg?v=${CARD_FRAME_VERSION}`,
    redOrb: 'assets/cards/red_orb.png',
    blueOrb: 'assets/cards/blue_orb.png',
    greenOrb: 'assets/cards/green_orb.png',
    yellowOrb: 'assets/cards/yellow_orb.png',
    purpleOrb: 'assets/cards/purple_orb.png',
    blackOrb: 'assets/cards/black_orb.png',
    manaOrb: 'assets/cards/mana.png',
    blood: 'assets/cards/blood.png',
    collectionBoard: 'assets/cards/c_board.svg',
  },
  backgrounds: {
    title: 'assets/art/backgrounds/title.webp?v=bg1003',
    stage1: 'assets/art/backgrounds/stage1_battlestage.webp?v=bg1003',
    stage2: 'assets/art/backgrounds/stage2_battlestage.webp?v=bg0916',
    stage3: 'assets/art/backgrounds/stage3_battlestage.webp?v=bg0916',
    // ステージ4は街の前後で背景を分ける。
    // stage4＝「黄昏の回廊」（街の手前）／stage4Tower＝「謁見の黒影道」（街を出た後）。
    stage4: 'assets/art/backgrounds/stage4_battlestage_1.webp?v=bg1003',
    stage4Tower: 'assets/art/backgrounds/stage4_battlestage_2.webp?v=bg1003',
    stageEnd: 'assets/art/backgrounds/stage5_battlestage.webp?v=bg0916',
    // 街（村）専用画面の背景。ステージ番号＝G._waveに対応する。
    // village0＝ゲーム開始地点「風止みの村 リーゼ」。
    village0: 'assets/art/backgrounds/stage0_village.webp?v=bg1003',
    village0Night: 'assets/art/backgrounds/stage0_village_night.webp?v=bg1003',
    // リーゼのホーム（1周目の押下会話でだけ使う）。
    homeStart: 'assets/art/backgrounds/stage0_home.webp?v=bg1003',
    village1: 'assets/art/backgrounds/stage1_village.webp?v=bg1003',
    village2: 'assets/art/backgrounds/stage2_city.webp?v=bg1003',
    village3: 'assets/art/backgrounds/stage3_village.webp?v=bg1003',
    // ギャラハの闘技場受付。
    // 受領済みの素材ファイル名には先頭空白が含まれているため、file://で実在する名前を参照する。
    arena: 'assets/art/backgrounds/stage3_arena.webp?v=bg1003',
    // 闘技場の戦闘背景。
    stageArena: 'assets/art/backgrounds/stage3_arena_battlestage.webp?v=bg1003',
    village4: 'assets/art/backgrounds/stage4_city.webp?v=bg1003',
    villageEnd: 'assets/art/backgrounds/stage5_city.webp?v=bg1003',
    // ワールドマップ画面（出発時に数秒表示する）
    map: 'assets/art/backgrounds/map.webp?v=bg1003',
    // 塔（祭壇）画面の背景
    tower: 'assets/art/backgrounds/tower.webp?v=bg1003',
    towerLanding: 'assets/art/backgrounds/tower_landing.webp?v=bg1003',
    // 祭壇（指輪交換）の画面の背景（2026-10-03 利用者指定）。
    altar: 'assets/art/backgrounds/altar.webp?v=bg1003',
    // 図書館画面の背景
    library: 'assets/art/backgrounds/stage0_library.webp?v=bg1003',
    libraryNight: 'assets/art/backgrounds/stage0_library_night.webp?v=bg1003',
    // 街の施設ごとの背景（ステージ1・エルム）
    itemShopForest: 'assets/art/backgrounds/stage1_item_shop.webp?v=bg1003',
    magicShopForest: 'assets/art/backgrounds/stage1_magic_shop.webp?v=bg1003',
    // 街の施設ごとの背景（ステージ2・ヴァルガ）
    itemShopGrassland: 'assets/art/backgrounds/stage2_item_shop.webp?v=bg1003',
    magicShopGrassland: 'assets/art/backgrounds/stage2_magic_shop.webp?v=bg1003',
    // 街の施設ごとの背景（ステージ3・ギャラハ）
    magicShopValley: 'assets/art/backgrounds/stage3_magic_shop.webp?v=bg1003',
    blacksmithValley: 'assets/art/backgrounds/stage3_blacksmith.webp?v=bg1003',
    // 街の施設ごとの背景（ステージ4・ヴォルザーク）
    magicShopCapital: 'assets/art/backgrounds/stage4_item_shop.webp?v=bg1003',
    blacksmithCapital: 'assets/art/backgrounds/stage4_blacksmith.webp?v=bg1003',
    // 街の施設ごとの背景（ステージ5・フォルセティ）
    magicShopEndworld: 'assets/art/backgrounds/stage5_magic_shop.webp?v=bg1003',
    itemShopEndworld: 'assets/art/backgrounds/stage5_item_shop.webp?v=bg1003',
    // 酒場（ステージ1・エルム／2・ヴァルガ／3・ギャラハ）。酒場は未実装のため、今は入れない。
    tavernForest: 'assets/art/backgrounds/stage1_tavern.webp?v=bg1003',
    tavernGrassland: 'assets/art/backgrounds/stage2_tavern.webp?v=bg1003',
    tavernValley: 'assets/art/backgrounds/stage3_tavern.webp?v=bg1003',
    camp: 'assets/art/backgrounds/camp.webp?v=bg1003',
    innGrassland: 'assets/art/backgrounds/stage2_inn.webp?v=bg1003',
    innCapital: 'assets/art/backgrounds/stage4_inn.png?v=bg1003',
    innEndworld: 'assets/art/backgrounds/stage5_inn.webp?v=bg1003',
  },
  vfx: {
    // 定義データの識別子。Pathという既存API名は保つが、画像URLを再生しない。
    hit: 'vfx:hit:hit-burst',
    // キャラクターの効果（通常攻撃ではない）でダメージが発生した際、そのキャラクターの
    // ナンバー（CXXX）に対応する定義があれば、通常の被弾定義の代わりに再生する。
    // 存在するものだけをここに登録する（未登録＝通常の被弾定義を使用）。
    characterEffect: {
      'C001': 'vfx:S003:gold-gain', // 金貨（素材名はS003へ変更済み）
      'C002': 'vfx:C002:attack-recoil',
      'C003': 'vfx:S006:injury-buff', // ゴーレム（素材名はS006へ変更済み）
      'C008': 'vfx:C008:arachne-ring',
      'C011': 'vfx:C011:siren-wave', // サイレン（攻撃：全体へ広がる波）
      'C017': 'vfx:C017:medusa-gaze', // メデューサ（負傷：対象の上にダメージVFXの代わりに出す）
      'C019': 'vfx:C019_1:centaur-missile', // ケンタウロス（攻撃：対象へ飛ばす）
      'C043': 'vfx:C043:flame-sweep',
      'C090': 'vfx:C090:steal-mark', // 奪う（対象の上で再生してから移動する）
      // 2026-10-12: 実戦はPRESENT_LAB_FXの発動単位で再生する新規定義。
      'C004': 'vfx:C004:satyr',
      'C020': 'vfx:C020:hecatoncheir',
      'C021': 'vfx:C021:zombie',
      'C060': 'vfx:C060:behemoth',
      'C064': 'vfx:C064:sylph',
      'C071': 'vfx:C071:nymph',
      'C089': 'vfx:C089:familiar',
      'C099': 'vfx:C099:fiend',
      'C029': 'vfx:C029:phantom',
      'C034': 'vfx:C034:eidolon',
      'C082': 'vfx:C082:arch-demon',
      'C083': 'vfx:C083:gremlin',
      'C095': 'vfx:C095:lilith',
      'C097': 'vfx:C097:overlord',
      'C009': 'vfx:C009:minotaur',
      'C042': 'vfx:C042:sleep-sheep',
      'C056': 'vfx:C056:scylla',
      'C066': 'vfx:C066:undine',
      'C079': 'vfx:C079:spriggan',
      'C084': 'vfx:C084:incubus',
      'C094': 'vfx:C094:chaos-imp',
    },
    // 強化カード（エンチャント）の効果そのものの演出定義。カードのNo.（EXXX）で引く。
    // マナ効果のように「発動してから処理が終わるまで出し続ける」用途に使う
    // （playSustainedEffectVfx。素材はループ再生＝共通レンダラーのrepeatであること）。
    // **素材を足したらここへ登録すること。** 未登録のカードでは何も出ない。
    enchantEffect: {
      'E045': 'vfx:S008:mana-buff',   // 活性化（素材名はS008へ変更済み）
      'E058': 'vfx:E058_1:fire-arrow', // 炎の矢（発生元の上に出す）
    },
    // 効果が**対象に当たった瞬間**の演出。発生元の演出（enchantEffect）とは別素材。
    // ダメージイベントの effectNo で引く。登録が無ければ通常の被弾VFXのまま。
    enchantEffectHit: {
      'E058': 'vfx:E058_2:fire-arrow-impact', // 炎の矢の着弾
      'C019': 'vfx:C019_2:centaur-impact', // ケンタウロスの着弾
    },
    // C043等、薙ぎ払い演出（playCharacterSweepVfx）専用の動画/定義。
    // 描画は共通レンダラー、位置・回転・再生時間は共通の入口で制御する
    // （characterEffectとは別管理。playHitVfxAtRect()側からは参照しない）。
    characterSweep: {
      'C043': 'vfx:C043:flame-sweep',
    },
    // 特殊演出シートの定義。**鍵は特殊演出シートのNo.**（素材名とはずれることがある）。
    // 順再生→逆再生で見せるもの（playSpecialProductionVfx）と、
    // 効果の種類ごとに一律で使うもの（getCharacterEffectVfxPath 経由）の両方を置く。
    // 生贄奉納（旧S003）は廃止。素材が無いので登録しない（演出なしで状態だけ進む）。
    // **シートの「VFX/SE」列に書ける番号は、すべてここに登録すること。**
    // 列にはカードのNo.ではなく素材の番号（S006 等）が書かれる。登録が無いと
    // getCharacterEffectVfxPath() が空を返し、効果の演出が丸ごと出ない
    // （ゴーレム＝C003 のVFX/SE列が S006 になった時、負傷効果が
    //   「何も起きない＝機能していない」ように見えた）。
    specialProduction: {
      S001: 'vfx:S001:summon-sigil',  // 戦闘中の召喚（逆再生開始でカードを出す）
      S003: 'vfx:S003:gold-gain',  // 金貨（旧C001）
      S004: 'vfx:S004:mana-gain',  // マナ獲得（発生させたキャラクターの上に出す）
      S005: 'vfx:S005:attack-buff',  // 攻撃時のバフ効果（カードを問わず一律）
      S006: 'vfx:S006:injury-buff',  // 負傷効果（ゴーレム。旧C003）
      S007: 'vfx:S007:death-buff',  // 特殊演出（シートの「VFX/SE」列で指定して使う）
      S008: 'vfx:S008:mana-buff',  // 活性化（旧E045）
      S009: 'vfx:S009:aura-buff',  // バフ（常時）＝開戦・常時の誘発効果でバフが生じた時
      K019: 'vfx:K019:seal-release',  // 封印解放（素材名はK019へ変更済み）
    },
    // キーワード発動（毒等）でダメージが発生した際、そのキーワードのナンバー（KXXX）に
    // 対応する定義があれば、通常の被弾定義の代わりに再生する。存在するものだけをここに登録する。
    // キーワード発動時の専用VFX。キーワードシートのNo.（KXXX）で引く。
    // **シートのNo.を振り直したら、素材ファイル名もここも必ず一緒に直すこと。**
    // 番号の振り直しで素材が旧名のままだった際、マナ効果と毒は登録が外れて
    // 通常の被弾VFX（被弾定義）に化け、貫通が毒のVFXを拾っていた。
    // ずれていないかは tools/parity/anim_check.js が検査する。
    keywordEffect: {
      'K001': 'vfx:K001:death-mark', // 即死（即死効果を受けた瞬間）
      'K003': 'vfx:K003:fang-poison', // 毒牙（毒のデバフを受けた瞬間）
      'K020': 'vfx:K020:revive-burst', // 復活（再召喚された瞬間）
      'K017': 'vfx:K017:poison-tick', // 毒（毒でダメージを受けた瞬間）
      'K018': 'vfx:K018:shield-contact', // 結界（結界がダメージを防いだ瞬間）
      'K024': 'vfx:K024:mana-cue', // マナ効果（K023＝眷属には素材なし）
    },
    attackContact: {
      tri: 'vfx:K008:tri-streak',
      all: 'vfx:K009:contact-burst',
      pierce: 'vfx:K007:piercing-streak',
    },
  },
  ui: {
    option: 'assets/ui/option_open.svg',
    button: 'assets/ui/button_blue1.svg',
    backLight: 'assets/ui/back_light.svg',
    board: 'assets/ui/board.svg',
    itemSlot: 'assets/ui/item_slot.svg',
    mark: 'assets/ui/mark.svg',
    // ui直下の分割素材が正本。外枠は原寸85pxの9スライスとして使用する。
    panelFrame: 'assets/ui/main_right_frame.svg?v=panels0923b',
    panelDecoration: 'assets/ui/main_right_decoration.svg?v=panels0923',
    leftPanelFrame: 'assets/ui/main_left_frame.svg?v=panels0923',
    leftPanelDecoration: 'assets/ui/main_left_decoration.svg?v=panels0923',
    ringSlot: 'assets/ui/ring_slot.svg',
    collectionLine: 'assets/ui/collection_line.svg',
    collectionThumb: 'assets/ui/thumb_blue.svg',
    collectionTrack: 'assets/ui/track.svg',
    collectionArrow: 'assets/ui/select.svg',
    collectionTab: 'assets/ui/button_invisible.svg',
  },
  mapBoard: {
    summon: 'assets/cards/magic_board1.svg',
    life: 'assets/cards/magic_board2.svg',
    eternal: 'assets/cards/magic_board3.svg',
    resonance: 'assets/cards/magic_board4.svg',
    duplicate: 'assets/cards/magic_board5.svg',
    empty: 'assets/cards/magic_board6.svg',
  },
  sfx: {
    uiConfirm: 'assets/sfx/ui_confirm.wav',
    uiConfirmHeavy: 'assets/sfx/ui_confirm_heavy.wav',
    uiError: 'assets/sfx/ui_error.wav',
    menuOpen: 'assets/sfx/menu_open.wav',
    menuClose: 'assets/sfx/menu_close.wav',
    select: 'assets/sfx/select.wav',
    uiReturn: 'assets/sfx/return.wav', // オプションの「元に戻す」（利用者指定）
    gameStart: 'assets/sfx/game_start.wav',
    knock: 'assets/sfx/knock.wav',
    boom: 'assets/sfx/boom.wav',
    shopIn: 'assets/sfx/shop_in.wav',
    shopOut: 'assets/sfx/shop_out.wav',
    purchase: 'assets/sfx/purchase.wav',
    income: 'assets/sfx/income.wav',
    lifeGet: 'assets/sfx/life_get.wav',
    cheers1: 'assets/sfx/cheers1.wav',
    cheers2: 'assets/sfx/cheers2.wav',
    bookOpening: 'assets/sfx/book_opening.wav',
    bookClosing: 'assets/sfx/book_closing.wav',
    altarIn: 'assets/sfx/altar_in.wav',
    altarOut: 'assets/sfx/altar_out.wav',
    // 報酬めくり（js/engine/card_reveal.js）。音の山を「表になって光る瞬間」に合わせて鳴らす。
    cardFlip: 'assets/sfx/card_flip.wav', // レア度1・2：カードが真横（幅0）になる瞬間
    R3: 'assets/sfx/R3.wav',
    R4: 'assets/sfx/R4.wav',
    R5: 'assets/sfx/R5.wav',
    fit: 'assets/sfx/fit.wav',
    'return': 'assets/sfx/return.wav',
    menu: 'assets/bgm/menu.wav',
    villageForest: 'assets/bgm/stage1_village.wav',
    villageGrassland: 'assets/bgm/stage2_village.wav',
    villageValley: 'assets/bgm/stage3_village.wav',
    villageEndworld: 'assets/bgm/stage5_village.wav',
    cityCapital: 'assets/bgm/stage4_city.wav',
    tower: 'assets/bgm/tower.wav',
    gameTitle: 'assets/bgm/title.wav',
    villageStart: 'assets/bgm/stage0_village.wav', // リーゼ（ゲーム開始地点）
    // 街BGMに重ねる環境音（サブBGMレイヤー）
    thunder: 'assets/bgm/thunder.wav',
    rain: 'assets/bgm/rain.wav',
    bug: 'assets/bgm/bug.wav',
    // 施設内で重ねる環境音
    blacksmith: 'assets/bgm/blacksmith.wav',
    battle1: 'assets/bgm/battle1.wav',
    battle2: 'assets/bgm/battle2.wav',
    battle3: 'assets/bgm/battle3.wav',
    battle4: 'assets/bgm/battle4.wav', // ラスボス戦
    buy1: 'assets/sfx/buy1.wav',
    buy2: 'assets/sfx/buy2.wav',
    attack: 'assets/sfx/attack.wav',

    // 毒のSEはキーワードNo.で引く（毒付与=K003／毒ダメージ=K017）。
    // 旧 poison.wav は廃止。互換のため鍵だけ残し、K003.wav を指す。
    poison: 'assets/sfx/K003.wav',
    // カード効果によるダメージの汎用SE（固有SEを持たない効果で鳴らす）。
    effectDamage: 'assets/sfx/effect_damage.wav',
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
    C001: 'assets/sfx/S003.wav', // 金貨（素材名はS003へ変更済み）
    C002: 'assets/sfx/C002.wav',
    C003: 'assets/sfx/S006.wav', // ゴーレム（素材名はS006へ変更済み）
    C008: 'assets/sfx/C008.wav', // アラクネ
    C011: 'assets/sfx/C011.wav', // LAB採用（2026-10-20 siren-wave 候補1・初期のSE・原音2秒から）
    C017: 'assets/sfx/C017.wav', // メデューサ
    C019: 'assets/sfx/C019_1.wav', // ケンタウロス（発射）
    C090: 'assets/sfx/C090.wav', // 奪う
    C019_HIT: 'assets/sfx/C019_2.wav', // LAB採用（2026-10-20 centaur-impact 候補1）
    // マナ効果SE。シートのNo.に合わせて K024（旧 K023）。
    K024: 'assets/sfx/K024.wav',
    K007: 'assets/sfx/K007.wav', // 貫通
    K008: 'assets/sfx/K008.wav', // 三方向攻撃
    K009: 'assets/sfx/K009.wav', // 全体攻撃
    K009_SWEEP: 'assets/sfx/K009.wav', // 全体攻撃（敵が1列だけの時の白い芯の横一閃。音は全体攻撃と同じ）
    C055: 'assets/sfx/C055.wav', // LAB採用（2026-10-20 hydra-reward 候補1）
    'map:life': 'assets/sfx/map_life.wav', // LAB採用（2026-10-20 map-life 候補1）
    E030: 'assets/sfx/E030.wav', // LAB採用（2026-10-20 alchemy 候補2）
    EN075_1: 'assets/sfx/EN075_1.wav', // LAB採用（2026-10-20 fate-sever 候補1・暗転明けの2回目の音を除去）
    R019: 'assets/sfx/R019.wav', // LAB採用（2026-10-20 paladin-ring 候補2）
    // 強化カード（エンチャント）の効果SE。カードのNo.（EXXX）で引く。
    // 効果が回数ぶん発動する時は、この音を回数ぶん鳴らす（マナ効果SEは最初の1回だけ）。
    E045: 'assets/sfx/S008.wav', // 活性化（素材名はS008へ変更済み）
    E058: 'assets/sfx/E058_1.wav', // 炎の矢（発生元）
    E058_HIT: 'assets/sfx/E058_2.wav', // 炎の矢（着弾）
    E067: 'assets/sfx/E067.wav', // 援護射撃（LABの命中に合わせる）
    // 2026-10-12: 21キャラのSEは候補1を仮配置（利用者未選択）。
    C004: 'assets/sfx/C004.wav',
    C020: 'assets/sfx/C020.wav',
    C021: 'assets/sfx/C021.wav',
    C060: 'assets/sfx/C060.wav', // LAB採用（2026-10-20 behemoth 候補1）
    C064: 'assets/sfx/C064.wav',
    C071: 'assets/sfx/C071.wav', // LAB採用（2026-10-20 nymph 候補1）
    C089: 'assets/sfx/C089.wav',
    C099: 'assets/sfx/C099.wav',
    C029: 'assets/sfx/C029.wav', // LAB採用（2026-10-20 eidolon 候補1・ファントムと共通）
    C034: 'assets/sfx/C034.wav', // LAB採用（2026-10-20 eidolon 候補1・ファントムと共通）
    C082: 'assets/sfx/C082.wav',
    C083: 'assets/sfx/C083.wav',
    C095: 'assets/sfx/C095.wav',
    C097: 'assets/sfx/C097.wav', // LAB採用（2026-10-20 overlord 候補1）
    C009: 'assets/sfx/C009.wav',
    C042: 'assets/sfx/C042.wav',
    C056: 'assets/sfx/C056.wav',
    C066: 'assets/sfx/C066.wav', // LAB採用（2026-10-20 undine 候補1）
    C079: 'assets/sfx/C079.wav', // LAB採用（2026-10-20 spriggan 候補1）
    C084: 'assets/sfx/C084.wav',
    C094: 'assets/sfx/C094.wav',
    // VFX LABで採用済みの戦闘SE。
    E006: 'assets/sfx/E006.wav',
    C024: 'assets/sfx/C024.wav',
    E035: 'assets/sfx/E035.wav',
    C039: 'assets/sfx/C039.wav',
    E062: 'assets/sfx/E062.wav',
    E071: 'assets/sfx/E071.wav',
    E075: 'assets/sfx/E075.wav',
    C032: 'assets/sfx/C032.wav',
    C037: 'assets/sfx/C037.wav',
    C038: 'assets/sfx/C038.wav',
    C046: 'assets/sfx/C046.wav',
    C049: 'assets/sfx/C049.wav',
    C051: 'assets/sfx/C051.wav',
    C053: 'assets/sfx/C053.wav',
    C054: 'assets/sfx/C054.wav',
    C058: 'assets/sfx/C058.wav',
    C067: 'assets/sfx/C067.wav',
    C068: 'assets/sfx/C068.wav',
    C069: 'assets/sfx/C069.wav',
    C077: 'assets/sfx/C077.wav',
    C078: 'assets/sfx/C078.wav',
    C080: 'assets/sfx/C080.wav',
    C081: 'assets/sfx/C081.wav',
    C092: 'assets/sfx/C092.wav',
    C096: 'assets/sfx/C096.wav',
    C098: 'assets/sfx/C098.wav',
    C076: 'assets/sfx/C076.wav',
    C041: 'assets/sfx/C041.wav',
    C014: 'assets/sfx/C014.wav',
    C018: 'assets/sfx/C018.wav',
    C025: 'assets/sfx/C025.wav',
    K016: 'assets/sfx/K016.wav',
    K002: 'assets/sfx/K002.wav',
    I006: 'assets/sfx/I006.wav',
    // 巻物・旗を魔導板のキャラクターに使った時（盾・幻視・巨大化・魔力の巻物、鼓舞の旗）。2026-10-17 利用者指定：SORCERY - DESIGNED - MAGIC WHITE Cast Medium 03-03（LAB候補 scroll-shield-3）。
    itemScroll: 'assets/sfx/item_scroll.wav',
    shield_break: 'assets/sfx/shield_break.wav', // LAB採用（2026-10-18 shield-break 候補2）
    R016: 'assets/sfx/R016.wav', // LAB採用（2026-10-18 intimidate-ring 候補2）
    'map:resonance': 'assets/sfx/map_resonance.wav', // LAB採用（2026-10-18 map-resonance 候補1）
    E032: 'assets/sfx/E032.wav', // LAB採用（2026-10-18 rage-shards 候補2）
    R017: 'assets/sfx/R017.wav', // LAB採用（2026-10-18 undying-ring 候補3）
    R013: 'assets/sfx/R013.wav', // LAB採用（2026-10-18 magic-ring-mana 候補2）
    'map:duplicate': 'assets/sfx/map_duplicate.wav', // LAB採用（2026-10-18 map-duplicate 候補1）
    E077: 'assets/sfx/E077.wav', // LAB採用（2026-10-18 suffering-brand 候補1）
    R023: 'assets/sfx/R023.wav', // LAB採用（2026-10-18 storm-ring 候補1）
    R020: 'assets/sfx/R020.wav', // LAB採用（2026-10-18 oni-ring 候補1）
    C031: 'assets/sfx/C031.wav', // LAB採用（2026-10-18 soul-recall 候補1）
    EN044: 'assets/sfx/EN044.wav', // LAB採用（2026-10-18 keyword-grant 候補1）
    C093: 'assets/sfx/C093.wav', // LAB採用（2026-10-18 void-mastery 候補1）
    R042: 'assets/sfx/R042.wav', // LAB採用（2026-10-18 curse-ring 候補1）
    R041: 'assets/sfx/R041.wav', // LAB採用（2026-10-18 curse-ring 候補1）
    E008: 'assets/sfx/E008.wav', // LAB採用（2026-10-18 dragon-pact 候補1）
    K018_gain: 'assets/sfx/K018_gain.wav',
    K020_gain: 'assets/sfx/K020_gain.wav',

    // キーワード発動のSE。キーワードシートのNo.（KXXX）で引く。
    C043: 'assets/sfx/C043.wav', // アラッサス（全体へ広がる効果ダメージ）
    K001: 'assets/sfx/K001.wav', // 即死（即死効果を受けた瞬間）
    K003: 'assets/sfx/K003.wav', // 毒牙（毒のデバフを受けた瞬間）
    K017: 'assets/sfx/K017.wav', // LAB採用（2026-10-20 poison-tick 候補1）
    K018: 'assets/sfx/K018.wav', // 結界（結界がダメージを防いだ瞬間）
    K020: 'assets/sfx/K020.wav', // 復活（再召喚された瞬間）
    victory: 'assets/sfx/victory.wav',
    bossVictory: 'assets/sfx/boss_victory.wav',
    lifeLost: 'assets/sfx/life_lost.wav',
    K019: 'assets/sfx/K019.wav', // 封印解放（旧S002）
    S001: 'assets/sfx/S001.wav', // 戦闘中の召喚
    // **VFXと同じく、シートの「VFX/SE」列に書ける番号はすべて登録すること。**
    // 登録が無いと _playCardEffectSfx() が鳴らせず、絵も音も出ない。
    S003: 'assets/sfx/S003.wav', // 金貨（旧C001）
    S006: 'assets/sfx/S006.wav', // 負傷効果（ゴーレム。旧C003）
    S008: 'assets/sfx/S008.wav', // 活性化（旧E045）
    S009: 'assets/sfx/S009.wav', // バフ（常時）
    S005: 'assets/sfx/S005.wav', // 攻撃時のバフ効果
    S007: 'assets/sfx/S007.wav', // 特殊演出（シートの「VFX/SE」列で指定して使う）
    S004: 'assets/sfx/S004.wav', // 特殊演出：マナ増加
  },
};

const CharacterArtOverrideMap = {
  // カード名でアート番号を上書きする例外表。原則は「No.」列（C###/E###/EN###/BC###）から
  // assets/art/ 以下を自動解決する（getCharacterNoArtPath）ので、ここに足すのは番号と絵が
  // 一致しないカードだけにすること。
  'エルフ': {path:'assets/art/characters/C044.jpg'},
  'ブラウニー': {path:'assets/art/characters/C043.jpg'},
  'インプ': {path:'assets/art/characters/C061.jpg'},
  'アークデーモン': {path:'assets/art/characters/C062.jpg'},
  'アラッサス': {path:'assets/art/characters/C081.jpg'},
  'スリン': {path:'assets/art/characters/C082.jpg'},
  'ダイアウルフ': {path:'assets/art/characters/C041.jpg'},
  'スリープシープ': {path:'assets/art/characters/C042.jpg'},
  'ファナティック': {path:'assets/art/characters/C100.jpg'},
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
  if(!card) return '';
  const panelArt=getPanelArtPath(card);
  if(panelArt) return panelArt;
  // 実在するカード絵が無いカードは、存在しない汎用画像へフォールバックしない。
  return '';
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

// エリート／ボスの敵はカード枠・戦闘スロットとも enemy_frame_m.svg を使う。
// （通常の敵枠や色別の召喚枠ではなく、特別な相手であることを枠で示す）
function _isEliteOrBossCard(card){
  if(!card) return false;
  if(card.boss||card.elite||card.bossOnly||card._isEliteOrBoss) return true;
  const kws=Array.isArray(card.keywords)?card.keywords:[];
  return kws.includes('ボス')||kws.includes('エリート');
}
// 合体後の枠への変換は、カード描画と戦闘スロットで共通に使う。
const TRIPLE_MERGED_FRAME_MAP = Object.freeze({
  [Assets.cards.enchantmentFrame]: Assets.cards.enchantmentFrameMerged,
  [Assets.cards.summonFrameRed]: Assets.cards.summonFrameRedMerged,
  [Assets.cards.summonFrameBlue]: Assets.cards.summonFrameBlueMerged,
  [Assets.cards.summonFrameGreen]: Assets.cards.summonFrameGreenMerged,
  [Assets.cards.summonFrameBrown]: Assets.cards.summonFrameBrownMerged,
  [Assets.cards.summonFramePurple]: Assets.cards.summonFramePurpleMerged,
  [Assets.cards.enemyFrame]: Assets.cards.characterFrame,
});
function _tripleMergedFrameAsset(frame, card){
  return card&&(card._tripleMerged||(card._copyFrame&&card._copyFrame.merged))
    ?(TRIPLE_MERGED_FRAME_MAP[frame]||frame)
    :frame;
}
function _getCardFrameAssetBase(card){
  if(!card) return '';
  if(_isEliteOrBossCard(card)) return Assets.cards.characterFrame;
  // **敵を仲間にした体・敵に変身した体（_useEnemyVisualFrame）は、カードになっても敵の枠のまま。**
  // 戦闘スロットの applyUnitVisual() と同じ判定。ここで見ていなかったため、レムレース＋ハイドラで
  // 報酬に出たウィスプが召喚体の色の枠（色なし＝緑）になっていた。
  if(card._useEnemyVisualFrame) return Assets.cards.enemyFrame;
  if(card._isChar||(!card.type&&!card.kind)) return Assets.cards.characterFrame;
  if(card.magicPanel) return '';
  if(card.type==='global-panel'||card.panelScope==='global') return '';
  if(card.category==='スペル'||card.type==='spell'||card.kind==='spell') return _spellFrameByColor(card.color);
  if(card.type==='panel'||card.kind==='panel'||card.panelScope){
    const cat=String(card.category||'');
    if(cat.includes('キャラクター')||cat.includes('召喚')){
      const color=_summonColor(card);
      return color?_summonFrameByColor(color):Assets.cards.characterFrame;
    }
    if(cat.includes('強化')||cat.includes('エンチャント')){
      const kws=[...(Array.isArray(card.keywords)?card.keywords:[]),...(Array.isArray(card.adjacentKeywords)?card.adjacentKeywords:[])];
      if(kws.some(k=>String(k||'').trim()==='刻印')) return Assets.cards.enchantmentEngravingFrame;
      return Assets.cards.enchantmentFrame;
    }
    return '';
  }
  if(card.fixedAttack||card.fixedEquip) return '';
  return '';
}
function getCardFrameAsset(card){
  return _tripleMergedFrameAsset(_getCardFrameAssetBase(card),card);
}

// 合体前の枠が enemy_frame_m.svg になるカードは、トリプル合体の素材にしない。
function isTripleMergeBlockedCard(card){
  return _getCardFrameAssetBase(card)===Assets.cards.characterFrame;
}

function _characterArtDef(cardOrName){
  const name=typeof cardOrName==='string'?cardOrName:cardOrName?.name;
  if(!name) return null;
  return CharacterArtOverrideMap[name]||null;
}

function _assetCodeRaw(card){
  if(!card||typeof card!=='object') return '';
  return String(card.artCode??card._artCode??card.code??card._code??card['No.']??card.No??card.no??card['No']??card.imageNo??card.image_no??card.画像No??card.画像番号??'').trim();
}

function _normalizeAssetCode(raw, fallbackPrefix){
  const text=String(raw||'').trim();
  if(!text) return '';
  // 旧「P」表記（メインキャラクター）は新しい「MC」表記に読み替える
  // BC/NPCは「char（NPC）」シートのキャラクター。MCより先に判定しないと
  // 「BC002」などがどの分岐にも当たらず空文字になり、絵が出ない。
  // 「EN075_1」のような枝番付きのNo.も受け付ける（ラスボス戦の後衛3体など、
  // 同じ番号で複数の個体が並ぶケース）。枝番はそのままファイル名へ残す。
  const prefixed=text.match(/^(BC|NPC|MC|EN|P|[ECS])\s*0*(\d+)(_\d+)?$/i);
  if(prefixed){
    let p=prefixed[1].toUpperCase();
    if(p==='P') p='MC';
    return p+String(parseInt(prefixed[2],10)).padStart(3,'0')+(prefixed[3]||'');
  }
  const n=parseInt(text,10);
  if(!Number.isFinite(n)||n<=0) return '';
  return String(fallbackPrefix||'C').toUpperCase()+String(n).padStart(3,'0');
}

const CARD_ART_VERSION='art1010';
function getCharacterNoArtPath(card){
  if(!card||typeof card!=='object') return '';
  const raw=_assetCodeRaw(card);
  if(!raw) return '';
  const isEnemyCard=!!(card._sheetEnemy||card.enemyOnly||card.side==='enemy'||card.isEnemy);
  const explicit=String(raw).trim().match(/^(BC|NPC|MC|EN|[ECS])/i);
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
  // 「MC」は char（NPC）シートのNo.列が裸の数値だった場合のフォールバック接頭辞
  // （loader.js の _assignSheetArtCode）。実ファイルは NPC### 表記なので読み替える。
  if(code.startsWith('MC')) code='NPC'+code.slice(2);
  let dir='';
  if(code.startsWith('NPC')||code.startsWith('BC')) dir='assets/art/npcs';
  else if(code.startsWith('EN')) dir='assets/art/enemies';
  else if(code[0]==='E') dir='assets/art/enchantments';
  else if(code[0]==='C') dir='assets/art/characters';
  else return '';
  // カード絵は jpg だけを読む（利用者指定）。以前は png も重ねて候補にしていたが、
  // 素材はすべて jpg なので、カードを描くたびに存在しない png の 404 が出ていた。
  // 版の印：ファイルを入れ替えると更新日時が元のまま残り、ブラウザが古い絵をキャッシュから出し続ける
  // （2026-10-04 EN025/EN040 を入れ替えた後もグレーターデーモンに旧EN025の絵が出た）。絵を差し替えたら上げる。
  return `${dir}/${code}.jpg?v=${CARD_ART_VERSION}`;
}

// VFXの識別子は元番号と定義名を保持する。素材URLとは混ぜない。
function getVfxDefinitionName(value){
  const m=String(value||'').match(/^vfx:([A-Za-z0-9_]+):([a-z][a-z0-9-]*)$/);
  return m?m[2]:'';
}
function getVfxSourceCode(value){
  const m=String(value||'').match(/^vfx:([A-Za-z0-9_]+):([a-z][a-z0-9-]*)$/);
  return m?m[1]:'';
}

// キャラクターの効果によるダメージ時、そのキャラクター専用のコード描画VFXが
// 登録されていればそのパスを返す。登録が無ければ空文字（呼び出し側で通常の被弾定義を使う）。
function getCharacterEffectVfxPath(unit){
  // **シートの「VFX/SE」列（fxCode）が最優先。** カードのNo.とは別に指定できる。
  const raw=String((unit&&unit.fxCode)||'').trim()||_assetCodeRaw(unit);
  if(!raw) return '';
  const code=_normalizeAssetCode(raw,'C');
  if(!code) return '';
  // 効果の種類ごとに一律で使う演出（攻撃時バフ＝S005 等）も同じ引き方で拾えるようにする。
  return (Assets.vfx.characterEffect&&Assets.vfx.characterEffect[code])
    ||(Assets.vfx.specialProduction&&Assets.vfx.specialProduction[code])||'';
}

// 効果そのものの演出定義を、カードのNo.（CXXX／EXXX）から引く。
// キャラクター（characterEffect）と強化カード（enchantEffect）の**両方**を見る。
// 登録が無ければ空文字。呼び出し側は空なら何も再生しないこと
// （playHitVfxAtRect へ空のまま渡すと通常の被弾VFXへ化ける）。
function getEffectVfxPath(code){
  const raw=String(code||'').trim().toUpperCase();
  if(!/^[A-Z]+\d{3}$/.test(raw)) return '';
  return (Assets.vfx.characterEffect&&Assets.vfx.characterEffect[raw])
    ||(Assets.vfx.enchantEffect&&Assets.vfx.enchantEffect[raw])
    ||(Assets.vfx.specialProduction&&Assets.vfx.specialProduction[raw])
    // キーワードの素材（毒牙＝K003 等）も番号で引けるようにする。
    // 状態異常の付与VFXを「出し直さず継続して出す」経路（playKeywordEffectVfxSustained）が使う。
    ||(Assets.vfx.keywordEffect&&Assets.vfx.keywordEffect[raw])||'';
}

// その効果に固有のSEが登録されていれば、playSfx() へ渡す鍵（＝カードNo.）を返す。
// 登録が無ければ空文字。呼び出し側はその時だけマナ効果SE等で代用すること。
function getEffectSfxKey(code){
  const raw=String(code||'').trim().toUpperCase();
  if(!/^[A-Z]+\d{3}$/.test(raw)) return '';
  return (Assets.sfx&&Assets.sfx[raw])?raw:'';
}

// 効果が**対象に当たった瞬間**の演出。登録が無ければ空文字（通常の被弾VFXのまま）。
function getEffectHitVfxPath(code){
  const raw=String(code||'').trim().toUpperCase();
  if(!/^[A-Z]+\d{3}$/.test(raw)) return '';
  return (Assets.vfx.enchantEffectHit&&Assets.vfx.enchantEffectHit[raw])||'';
}
function getEffectHitSfxKey(code){
  const raw=String(code||'').trim().toUpperCase();
  if(!/^[A-Z]+\d{3}$/.test(raw)) return '';
  return (Assets.sfx&&Assets.sfx[raw+'_HIT'])?raw+'_HIT':'';
}

function getAttackContactVfxPath(mode){
  return Assets.vfx.attackContact?.[String(mode || '').toLowerCase()] || '';
}
function getAttackContactSfxKey(mode){
  const key=String(mode || '').toLowerCase();
  const code=getKeywordAssetKey({tri:'三方向攻撃',all:'全体攻撃',pierce:'貫通'}[key]);
  return code && Assets.sfx?.[code] ? code : '';
}

// C043等、薙ぎ払い専用の定義識別子を返す（SE番号・再生時刻は従来どおり）。
function getCharacterSweepVfxPath(unit){
  const raw=_assetCodeRaw(unit);
  if(!raw) return '';
  const code=_normalizeAssetCode(raw,'C');
  if(!code) return '';
  return (Assets.vfx.characterSweep&&Assets.vfx.characterSweep[code])||'';
}

// 2026-10-12: VFXとSEは共通の名前→素材キーを使い、シート番号の変更から切り離す。
function getKeywordEffectSfxKey(keywordName){
  if(!keywordName) return '';
  const code=getKeywordAssetKey(keywordName);
  if(!code) return '';
  return (Assets.sfx&&Assets.sfx[code])?code:'';
}

function getKeywordEffectVfxPath(keywordName){
  if(!keywordName) return '';
  const code=getKeywordAssetKey(keywordName);
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
  if(!def.path) return false;
  const p=prefix||'--char';
  el.style.setProperty(`${p}-art`, assetUrl(def.path));
  el.style.setProperty(`${p}-art-size`, 'cover');
  el.style.setProperty(`${p}-art-position`, name==='アラッサス'?'56% 58%':'center 58%');
  return true;
}

function getPanelArtPath(card){
  const name=card?.name||'';
  if(!name) return '';
  if(card?.art||card?.image) return card.art||card.image;
  const numbered=getCharacterNoArtPath(card);
  if(numbered) return numbered;
  return '';
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

/* ══════════════════════════════════════════════════════════
   枠画像の角R（cardFrameRadius）
   ──────────────────────────────────────────────────────────
   カードの外周に引く1ptの線（#c49a6c）は CSS の border で描くので、
   **枠画像の角と同じ半径を border-radius に入れないと角だけ二重線になる。**
   枠画像は1枚ずつ角Rが違ううえ、絵を差し替えると変わる。
   （例：summon_frame1 は 712x1079 で 29px、他の7枚は 708x1075 で 40px）
   そこで固定値を書かず、**画像のアルファから角Rを実測して CSS 変数へ流し込む。**

   測り方：枠は角丸長方形なので、上辺(y=0)で最初に不透明になる x が横の半径、
   左辺(x=0)で最初に不透明になる y が縦の半径。しきい値はアルファ128
   ＝ 見た目の輪郭（アンチエイリアスの中間）に合わせている。
   枠画像は `background:… center/100% 100%` でカードの箱いっぱいに伸ばすので、
   半径は画像サイズに対する％で持たせればカードの大きさが変わっても合う。

   結果は要素ごとの inline style ではなく **1枚のスタイルシートへ流し込む**。
   測定は画像読み込み待ちで非同期なので、先に描画されたカードにも後から効かせる必要がある。
   カード側には `data-frame-key`（画像のファイル名）だけを付けておく。
   ══════════════════════════════════════════════════════════ */
const _FRAME_RADIUS_ALPHA=128;
const _frameRadiusByKey=new Map();   // key → '4.07% / 2.69%'
const _frameRadiusPending=new Set();
let _frameRadiusStyleEl=null;

function _frameKeyFromUrl(url){
  const clean=String(url||'').replace(/^url\(["']?|["']?\)$/g,'').split(/[?#]/)[0];
  const base=clean.split('/').pop()||'';
  return base.replace(/\.[a-z0-9]+$/i,'').replace(/[^A-Za-z0-9_-]/g,'_');
}

function _flushFrameRadiusCss(){
  if(typeof document==='undefined') return;
  if(!_frameRadiusStyleEl){
    _frameRadiusStyleEl=document.createElement('style');
    _frameRadiusStyleEl.id='card-frame-radius-css';
    (document.head||document.documentElement).appendChild(_frameRadiusStyleEl);
  }
  let css='';
  _frameRadiusByKey.forEach((v,k)=>{ css+=`[data-frame-key="${k}"]{--card-frame-r:${v};}\n`; });
  _frameRadiusStyleEl.textContent=css;
}

function _measureFrameRadius(url,key){
  if(typeof document==='undefined'||_frameRadiusPending.has(key)) return;
  _frameRadiusPending.add(key);
  const img=new Image();
  img.onload=()=>{
    try{
      const W=img.naturalWidth||img.width, H=img.naturalHeight||img.height;
      if(!W||!H) return;
      // 左上の角だけ読めば足りる。角Rが画像の1/4を超えることはない。
      const n=Math.max(8,Math.min(200,Math.floor(Math.min(W,H)/4)));
      const cv=document.createElement('canvas'); cv.width=n; cv.height=n;
      const ctx=cv.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(img,0,0,n,n,0,0,n,n);
      const d=ctx.getImageData(0,0,n,n).data;
      const op=(x,y)=>d[(y*n+x)*4+3]>_FRAME_RADIUS_ALPHA;
      let rx=0; while(rx<n&&!op(rx,0)) rx++;
      let ry=0; while(ry<n&&!op(0,ry)) ry++;
      // SVG枠の一部は上辺／左辺にアンチエイリアスの線が置かれ、
      // 走査結果が0になることがある。その値を採用すると角丸が0%になり、
      // SVG自体が丸いのにCSSのプログラム枠だけ四角く残るため、既定値を使う。
      if(rx<=0||ry<=0||rx>=n||ry>=n) return;   // 角丸として読めない絵は既定値のまま
      _frameRadiusByKey.set(key,`${(rx/W*100).toFixed(3)}% / ${(ry/H*100).toFixed(3)}%`);
      _flushFrameRadiusCss();
    }catch(e){
      // file:// で開くと canvas が汚染されて読めない。その場合は CSS の既定値で妥協する。
    }
  };
  img.src=url;
}

function applyFrameRadiusKey(el, frameUrl){
  if(!el) return;
  const key=_frameKeyFromUrl(frameUrl);
  if(!key){ el.removeAttribute('data-frame-key'); return; }
  if(el.getAttribute('data-frame-key')!==key) el.setAttribute('data-frame-key',key);
  if(!_frameRadiusByKey.has(key)) _measureFrameRadius(String(frameUrl||'').replace(/^url\(["']?|["']?\)$/g,''),key);
}

function applyCardVisual(el, card){
  if(!el) return;
  const _cardFrame=getCardFrameAsset(card);
  if(_cardFrame){
    const _cardFrameUrl=assetUrl(_cardFrame);
    el.style.setProperty('--card-frame', _cardFrameUrl);
    applyFrameRadiusKey(el,_cardFrameUrl);
  }else{
    el.style.removeProperty('--card-frame');
    el.removeAttribute('data-frame-key');
  }
  if(!applyPanelArtVars(el, card, '--card')&&!applyCharacterArtVars(el, card, '--card')){
    el.style.removeProperty('--card-art');
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
  // コピー（ツインデビル等）はコピー元の枠を使う（core.js の _copyFrame。2026-10-20 利用者指定）。
  const copyFrame=unit&&unit._copyFrame||null;
  const isEnemyEl=el.classList.contains('enemy')||!!(unit&&(unit._useEnemyVisualFrame||copyFrame&&copyFrame.enemyVisual));
  const isPlayerHero=!!(unit&&!isEnemyEl&&(!unit._panelSummoned||copyFrame&&copyFrame.hero));
  // 守護／ヘイト専用の枠は素材ごと廃止した。
  // 判定に使っていた hasGuard / unitGuard / classGuard / isDefender も参照先が無くなったので消してある。
  // **味方でもボス枠のカード（BC「ディナ」など）は戦闘中もボス枠。** 味方は色で召喚枠を選ぶため、
  // 黒（召喚枠の無い色）は既定の緑枠になり、戦闘に入ると枠が変わって見えた（2026-09-24 利用者指摘）。
  // 戦闘中の体には _npcCard／boss の印が引き継がれないので、カード番号（BC002 など）でも見る。
  const _isNpcUnit=!!(unit&&(unit._npcCard||copyFrame&&copyFrame.npc||/^(?:NPC|BC)\d+$/i.test(String(unit.no||unit.artCode||''))));
  const frame=((isEnemyEl&&_isEliteOrBossCard(unit))||(!isEnemyEl&&unit&&(_isNpcUnit||_isEliteOrBossCard(unit))))
    ? Assets.cards.characterFrame
    : isEnemyEl
    ? Assets.cards.enemyFrame
    : isPlayerHero
      ? Assets.cards.characterFrame
      : _summonFrameByColor(_summonColor(unit)) || Assets.cards.characterFrame;
  const _unitFrameUrl=assetUrl(_tripleMergedFrameAsset(frame,unit));
  el.style.setProperty('--unit-frame', _unitFrameUrl);
  applyFrameRadiusKey(el,_unitFrameUrl);
  if(!applyCharacterArtVars(el, unit, '--unit')){
    el.style.removeProperty('--unit-art');
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
    if(typeof G!=='undefined'&&G&&G._arenaActive){
      setScreenAssetBackground('battle','stageArena');
      return;
    }
    const mapStage=(typeof getWorldMapStageBackgroundKey==='function')?getWorldMapStageBackgroundKey():null;
    // 施設／クエストの専用背景は_setOverrideBackground()の
    // --facility-bg-image（.facility-bg-active）が上から出すので、ここではステージ背景だけを敷く。
    const key=mapStage||getStageBackgroundKey(typeof G!=='undefined'?G.floor:1);
    setScreenAssetBackground('battle',key);
  }
}

function applyUiAssets(){
  const root=document.documentElement;
  if(!root) return;
  root.style.setProperty('--option-button-image', assetUrl(Assets.ui.option));
}

function setBattleStageBackground(){
  if(typeof G!=='undefined'&&G&&G._arenaActive){
    setScreenAssetBackground('battle','stageArena');
    return;
  }
  const mapStage=(typeof getWorldMapStageBackgroundKey==='function')?getWorldMapStageBackgroundKey():null;
  setScreenAssetBackground('battle',mapStage||getStageBackgroundKey(typeof G!=='undefined'?G.floor:1));
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

window.Assets=Assets;
window.applyCardVisual=applyCardVisual;
window.applyUnitVisual=applyUnitVisual;
window.gradeIconHtml=gradeIconHtml;

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',applyUiAssets,{once:true});
}else{
  applyUiAssets();
}
