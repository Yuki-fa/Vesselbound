# 正式採用したSE（assets/sfx へコピー済み）

VFXラボで採用したSEを、切り出し・音量調整した版のまま assets/sfx/<番号>.wav へコピーしたもの（元の素材ファイルは動かしていない）。
K009（全体攻撃）・S001（戦闘中の召喚）・K020（復活の再召喚）は利用者の許可（2026-10-06）で今の音を上書きした。
S001は2026-10-08に Cast Small 02-01 へ差し替え（音量はそのまま）。演出の速さは利用者指定で2.5倍（present.js PRESENT_LAB_SPEED_BY_CODE）。
K018_gain（結界獲得）・K020_gain（復活獲得）は、戦闘中に結界／復活を得た時、本来のVFXの後に自動で続けて出す演出の音（例：ヴリコラカス→復活獲得、エルフの負傷→結界獲得）。
2026-10-18：E071（衝撃波）は途中の「チッ」を抑えるため、単発の不連続をならし高音を下げた（利用者指摘）。
2026-10-18：利用者がLABで選んだ候補をまとめて採用（台帳 adopted_1018.json。加工した候補は se_tools_1018.py）。
`peak` はその音の一番大きい所（秒）。ゲームへ組み込む時は VFX の命中の瞬間に合わせて鳴らす。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| E006 | dark-fire | Adobe/火・炎・爆発/Fire Roar Heavy Sizzle 01.wav | 3.2秒 | 0.5 |
| C034 | banshee | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Deflect Spell-04.wav | 1.48秒 | 0.24 |
| E035 | resentment | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Medium-01.wav | 3.02秒 | 0.7 |
| C049 | lich | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Necromancer-01.wav | 3.6秒 | 0.7 |
| E062 | great-shield | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Deflect Spell-04.wav | 1.263秒 | 0.36 |
| E067 | cover-fire | Adobe/武器・銃器など/Weapon Arrow Shot 01.wav | 0.362秒 | 0.04 |
| E075 | demon-soul | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Large Hex Spell-01.wav | 4.4秒 | 0.9 |
| C042 | vrykolakas | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Medium 02-01.wav | 4.2秒 | 0.9 |
| C047 | dullahan | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Ghostly 05.wav | 1.96秒 | 0.18 |
| C048 | bone-chariot | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Large 03-01.wav | 4.2秒 | 0.9 |
| C061 | jackalope | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 01-03.wav | 3.6秒 | 0.7 |
| C064 | dragonnet | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Cast Medium-01.wav | 2.76秒 | 0.58 |
| C066 | cockatrice | The Vault/Broken/Sounds/分割/BROKEN - DESIGNED - BOULDER Stone Drop Medium 02-01.wav | 1.28秒 | 0.04 |
| C068 | bandersnatch | Xylon Sound Library/Designed Sounds/SFX/Transitions/Space Transition.wav | 3.72秒 | 0.9 |
| C069 | worm | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ACID Cast Medium 01-02.wav | 2.58秒 | 0.9 |
| C073 | wyvern | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Whoosh Short 06.wav（高音を抑えた版） | 0.8秒 | 0.3 |
| C087 | frost-sprite | asfx-christmas-freebies-2024/WOW Sound - ASFX - RPG Magic 3 Freebies/RPG Magic SFX Pack 3 – Elemental/RPG3_IceMagic2_IceBreakLonger01.wav | 1.38秒 | 0.18 |
| C088 | leprechaun | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Christmas Vol. 1/MAGMisc_Magic Christmas Bells 2_344 Audio_Christmas.wav | 4.2秒 | 0.9 |
| C089 | melusine | Xylon Sound Library/Designed Sounds/Textures and Drones/Bubbles.wav | 4.4秒 | 0.9 |
| C097 | carbuncle | Adobe/衝突・破壊・クラッシュ音/Crash Glass Break Plate 03.wav | 0.807秒 | 0.04 |
| C098 | pixie | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Medium Bolt-01.wav | 2.9秒 | 0.9 |
| C100 | elemental | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Cast Medium-01.wav | 3.024秒 | 0.74 |
| C106 | imp | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Long-02.wav | 4.2秒 | 0.9 |
| C117 | wendigo | Adobe/雨・雷・風など天候/Weather Ambience Wind Blizzard Snow Whistle Gust 01.wav | 4.4秒 | 0.9 |
| C121 | nightmare | Adobe/持続する低音・不穏な持続音/Drone Production Element Imaging Dark Phase Evil Gritty 01.wav | 4.2秒 | 0.9 |
| C096 | pegasus | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Large 01-03.wav | 2.86秒 | 0.9 |
| C056 | direwolf | Adobe/ホラー・恐怖系/Horror Scary Werewolf Howl 05.wav | 3.8秒 | 0.12 |
| K016 | weaken | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Whoosh Small-03.wav | 1.8秒 | 0.2 |
| K002 | atk-down | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Bass Drops & Downers Vol. 3/DSGNBass_Tone Downer (Reverb)_344 Audio_Bass Drops and Downers Vol 3.wav | 3.1秒 | 0.44 |
| K009 | all-cross | Xylon Sound Library/Designed Sounds/SFX/Impacts/Crash Impact.wav | 3.0秒 | 0.04 |
| I006 | meteor-scroll | Adobe/火・炎・爆発/Explosion Volcano 01.wav | 2.28秒 | 0.08 |
| C019 | titan | The Vault/Broken/Sounds/分割/BROKEN - DESIGNED - EARTHQUAKE Rumble LFE 01-01.wav | 4.4秒 | 0.9 |
| C023 | cyclops | Xylon Sound Library/Designed Sounds/SFX/Impacts/Riser + Impact.wav | 4.0秒 | 0.9 |
| C035 | wraith | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Stab Dark Ghostly 02.wav | 4.0秒 | 0.34 |
| K020 | revive-summon | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Summon Meditative-01.wav | 2.3秒 | 0.9 |
| K018_gain | shield-gain | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ICE Deflect Spell-01.wav | 1.2秒 | 0.22 |
| K020_gain | revive-gain | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Bell Chime 01.wav | 0.999秒 | 0.24 |

## 2026-10-20 正式採用（利用者がLABで選択）

台帳 adopted_1020.json。ゲームの assets/sfx に配置済み。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| R019 | paladin-ring | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Large 02-04.wav | 1.95秒 | 0.45 |
| EN075_1 | fate-sever | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Antique Clocks/CLOCKTick_Crooked Antique Clock_344 Audio_Antique Clocks.wav | 1.32秒 | 0.45 |
| E030 | alchemy | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Large 01-02.wav | 1.95秒 | 0.45 |
| map:life | map-life | asfx-christmas-freebies-2024/WOW Sound - ASFX - RPG Magic 3 Freebies/RPG Magic SFX Pack 3 – Elemental/RPG3_LightMagicEpic_HealingWing_P2.wav | 1.95秒 | 0.243979 |
| C075 | behemoth | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Large 02-01.wav | 1.95秒 | 0.48 |
| C070 | hydra-reward | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Cast Large-01.wav | 1.95秒 | 0.45 |
| C091 | nymph | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-03.wav | 1.95秒 | 0.736167 |
| C122 | overlord | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Large Hex Spell-02.wav | 1.95秒 | 0.48 |
| C086 | undine | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Deflect Spell-02.wav | 1.95秒 | 0.16925 |
| K017 | poison-tick | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ACID Hit-01.wav | 1.95秒 | 0.483708 |
| S005 | attack-buff | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Large 01-01.wav | 1.95秒 | 0.45 |
| S007 | death-buff | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Large 01-01.wav | 1.95秒 | 0.45 |
| C099 | spriggan | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Medium 01-01.wav | 1.95秒 | 0.45 |
| C039 | phantom | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Deflect Spell-04.wav | 1.95秒 | 0.218375 |
| C044 | eidolon | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Deflect Spell-04.wav | 1.95秒 | 0.218375 |
| C024_HIT | centaur-impact | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Deflect Spell-02.wav | 1.36秒 | 0.367146 |
| S001 | battle-summon | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Small 02-01.wav | 1.8秒 | 0.46 |
| C016 | siren-wave | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ICE Freeze Cast Medium-02.wav | 1.12秒 | 0.043958 |

## 2026-10-21 正式採用（利用者がLABで選択）

台帳 adopted_1021.json。ゲームの assets/sfx に配置済み。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| E057 | sealed-power | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Medium Energy-03.wav | 1.95秒 | 0.45 |
| C115 | steal-mark | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Bell Warble 04.wav | 1.95秒 | 0.101187 |
| R012 | penance-ring | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Medium-04.wav | 1.95秒 | 0.45 |
| E071 | shockwave | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Whoosh Long 01.wav | 1.680542秒 | 0.45 |
| E078 | gold-loss | Adobe/物を扱う音、衣擦れなど日常的な実音/Foley Coin Drop On Wood Platform 05.wav | 0.619667秒 | 0.242979 |
| C057 | sleep-sheep | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Cast Medium-03.wav | 1.95秒 | 0.45 |
| R016 | intimidate-ring | Adobe/持続する低音・不穏な持続音/Drone Production Element Imaging Ominous Dark Deep Rumble 01.wav | 3.4秒 | 0.450021 |
| K001 | death-mark | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Large-03.wav | 1.95秒 | 0.45 |
| C108 | gremlin | asfx-christmas-freebies-2024/David Dumais - ASFX - Steampunk Mech Freebies/Steampunk Mech SFX - Free Samples/MACHMech_Steampunk Gadget Open Close 10_DDUMAIS_NONE.wav | 1.6秒 | 0.341896 |
| R031 | speed-ring | The Vault/RTSB Collision/Sounds/分割/DSGNImpt-DS_WHOOSH HIT-Hypersonic Missile_RTSB_COL-04.wav | 1.04秒 | 0.12 |

## 2026-10-25 正式採用（利用者がLABで選択）

台帳 adopted_1025.json。ゲームの assets/sfx に配置済み。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| C001 | alastor-brand | tools/vfx_preview/se_tools_1025.py | 0.95秒 | 0.242771 |
| C002 | erinyes-flame | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Cast Large Whiplash-03.wav | 1.95秒 | 0.438229 |
| C004 | echidna-wave | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ACID Cast Large 01-04.wav | 1.95秒 | 0.45 |
| C005 | atlas-burden | The Vault/RTSB Collision/Sounds/分割/DSGNImpt-DS_IMPACT PHSYICS-Stone Crush_RTSB_COL-01.wav | 1.401秒 | 0.247667 |
| C052 | thunderbird-charge | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Large-04.wav | 1.316625秒 | 0.45 |
| C105 | kele-blood-nova | The Vault/RTSB Collision/Sounds/分割/DSGNImpt-DS_IMPACT-Annihilating Blast_RTSB_COL-01.wav | 1.95秒 | 0.296875 |
| C095_1 | grimalkin-glint | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Tinkly 01.wav | 1.95秒 | 0.256979 |
| C095 | grimalkin-pillar | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Ascend 02.wav | 1.473875秒 | 0.122354 |
| K013 | stealth-veil | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Whoosh Drone 02.wav | 1.95秒 | 0.4785 |
| K014 | guard-stance | The Vault/RTSB Collision/Sounds/分割/DSGNImpt-DS_IMPACT-Hollow Slam_RTSB_COL-01.wav | 1.95秒 | 0.156354 |
| EN031 | frost-retaliate | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ICE Break Out Of Spell-01.wav | 1.95秒 | 0.45 |
| EN013 | echo-bolt | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Medium-03.wav | 1.786458秒 | 0.45 |
| C080 | activation-transform | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Cast Medium-04.wav | 1.95秒 | 0.45 |
| C109 | activation-empower | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Medium Energy-04.wav | 1.95秒 | 0.45 |
| C116 | hellknight-slash | tools/vfx_preview/se_tools_1025.py | 2.35秒 | 0.85 |

## 2026-10-18 正式採用（利用者がLABで選択・「SE含めOK」とした分）

10/12に仮配置した候補1のうち利用者がOKとしたもの（サテュロス・ヘカトンケイル・ゾンビ・シルフ・フィーンド・リリス）と、2026-10-18に利用者がLABで選んだ候補（台帳 adopted_1018.json）。ゲームの assets/sfx に配置済み。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| C009 | satyr | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-01.wav | 1.950000秒 | 0.625708 |
| C025 | hecatoncheir | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-02.wav | 1.950000秒 | 0.655729 |
| C031 | zombie | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Whoosh Small-01.wav | 1.950000秒 | 0.263917 |
| C084 | sylph | Adobe/UI・電子音・マルチメディア系/Multimedia Internet CD-Rom Flash Whoosh Short 01.wav | 0.877062秒 | 0.284083 |
| C114 | familiar | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Small-01.wav | 1.95秒 | 0.867437 |
| C124 | fiend | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Small-02.wav | 1.950000秒 | 0.833771 |
| C107 | arch-demon | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Beam-01.wav | 2.6秒 | 0.774937 |
| C120 | lilith | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Small 01-04.wav | 1.950000秒 | 0.384333 |
| C014 | minotaur | Adobe/火・炎・爆発/Fire Fireball Large 02.wav | 1.06917秒 | 0.2575 |
| C119 | chaos-imp | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Small-03.wav | 1.95秒 | 0.923583 |
| E008 | dragon-pact | Adobe/火・炎・爆発/Fire Fireball Large 01.wav | 1.09638秒 | 0.228604 |
| R041 | curse-ring | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Large Hex Spell-03.wav | 1.95秒 | 0.45 |
| R042 | curse-ring | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Large Hex Spell-03.wav | 1.95秒 | 0.45 |
| C118 | void-mastery | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Medium-03.wav | 1.95秒 | 0.45 |
| EN044 | keyword-grant | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Summon-01.wav | 1.95秒 | 0.45 |
| C041 | soul-recall | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Ghostly 01.wav | 1.95秒 | 0.45 |
| R020 | oni-ring | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Cast Large Frenzy-02.wav | 1.95秒 | 0.45 |
| C058 | flame-sweep | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Cast Large Whiplash-01.wav | 1.95秒 | 0.45 |
| K024 | mana-cue | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Medium 04-01.wav | 1.95秒 | 0.45 |
| S006 | injury-buff | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Cast Large Frenzy-01.wav | 1.95秒 | 0.45 |
| R023 | storm-ring | Adobe/雨・雷・風など天候/Weather Storm Lightning Bolt Crash Crack 01.wav | 1.95秒 | 0.215771 |
| E077 | suffering-brand | A Sound Effect - Celine Woodburn Bonus Sounds/Gore Galore/GOREStab_Knife Stabbing Body Bloody_Celine Woodburn_Gore Galore_08.wav | 1.95秒 | 0.074896 |
| map:duplicate | map-duplicate | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Crystal Shatter 01.wav | 1.95秒 | 0.45 |
| K003 | fang-poison | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ACID Cast Large 01-01.wav | 2.8秒 | 0.450021 |
| R013 | magic-ring-mana | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ICE Freeze Cast Large-02.wav | 1.37317秒 | 0.45 |
| C007 | attack-recoil | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Deflect Spell-01.wav | 1.9314秒 | 0.309063 |
| R017 | undying-ring | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Long-03.wav | 1.95秒 | 0.45 |
| C013 | arachne-ring | Adobe/火・炎・爆発/Explosion Fireball Blast Fire 01.wav | 1.95秒 | 0.171354 |
| S009 | aura-buff | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Cast Medium-02.wav | 1.95秒 | 0.45 |
| C022 | medusa-gaze | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Medium-01.wav | 1.68179秒 | 0.45 |
| C024 | centaur-missile | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Medium-02.wav | 1.73929秒 | 0.45 |
| E032 | rage-shards | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Whoosh Fire 01.wav | 3秒 | 0.450021 |
| map:resonance | map-resonance | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Bell Hit 10.wav | 1.95秒 | 0.072292 |
| shield_break | shield-break | The Vault/Broken/Sounds/分割/BROKEN - DESIGNED - WINDSHIELD Glass Stress and Pop-01.wav | 1.2秒 | 0.318812 |

## 2026-10-12追加：仮（候補1・利用者未選択）

以下は正式採用ではなく、候補1をゲーム確認用に新規配置したまま利用者の選択が無いもの。原音・既存assetsは変更していない。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| C071 | scylla | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ACID Cast Large 02-01.wav | 1.950000秒 | 0.450000 |

2026-10-15：C071（スキュラ）は「SEが急に止まる」との指摘で候補を作り直し、新しい候補1を仮に配置（末尾400msのcos²フェード）。
