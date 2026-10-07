# 正式採用したSE（assets/sfx へコピー済み）

VFXラボで採用したSEを、切り出し・音量調整した版のまま assets/sfx/<番号>.wav へコピーしたもの（元の素材ファイルは動かしていない）。
K009（全体攻撃）・S001（戦闘中の召喚）・K020（復活の再召喚）は利用者の許可（2026-10-06）で今の音を上書きした。
S001は2026-10-08に Cast Small 02-01 へ差し替え、利用者指定で2.5倍（ファイルを1.75倍＋再生音量.70→1.0）にした。
K018_gain（結界獲得）・K020_gain（復活獲得）は、戦闘中に結界／復活を得た時、本来のVFXの後に自動で続けて出す演出の音（例：ヴリコラカス→復活獲得、エルフの負傷→結界獲得）。
`peak` はその音の一番大きい所（秒）。ゲームへ組み込む時は VFX の命中の瞬間に合わせて鳴らす。

| 番号 | 演出 | 元の素材 | 長さ | peak |
|---|---|---|---|---|
| E006 | dark-fire | Adobe/火・炎・爆発/Fire Roar Heavy Sizzle 01.wav | 3.2秒 | 0.5 |
| C024 | banshee | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Deflect Spell-04.wav | 1.48秒 | 0.24 |
| E035 | resentment | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Medium-01.wav | 3.02秒 | 0.7 |
| C039 | lich | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Necromancer-01.wav | 3.6秒 | 0.7 |
| E062 | great-shield | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Deflect Spell-04.wav | 1.263秒 | 0.36 |
| E067 | cover-fire | Adobe/武器・銃器など/Weapon Arrow Shot 01.wav | 0.362秒 | 0.04 |
| E071 | shockwave | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Elemental Palette Designed Vol. 1/WINDDsgn_Wind, Rush, Whoosh, Long x5 01_344 Audio_Elemental Palette Designed Vol 1.wav | 1.019秒 | 0.1 |
| E075 | demon-soul | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Cast Large Hex Spell-01.wav | 4.4秒 | 0.9 |
| C032 | vrykolakas | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Medium 02-01.wav | 4.2秒 | 0.9 |
| C037 | dullahan | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Ghostly 05.wav | 1.96秒 | 0.18 |
| C038 | bone-chariot | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Large 03-01.wav | 4.2秒 | 0.9 |
| C046 | jackalope | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Whoosh Mystical 01-03.wav | 3.6秒 | 0.7 |
| C049 | dragonnet | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WATER Cast Medium-01.wav | 2.76秒 | 0.58 |
| C051 | cockatrice | The Vault/Broken/Sounds/分割/BROKEN - DESIGNED - BOULDER Stone Drop Medium 02-01.wav | 1.28秒 | 0.04 |
| C053 | bandersnatch | Xylon Sound Library/Designed Sounds/SFX/Transitions/Space Transition.wav | 3.72秒 | 0.9 |
| C054 | worm | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ACID Cast Medium 01-02.wav | 2.58秒 | 0.9 |
| C058 | wyvern | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Whoosh Short 06.wav（高音を抑えた版） | 0.8秒 | 0.3 |
| C067 | frost-sprite | asfx-christmas-freebies-2024/WOW Sound - ASFX - RPG Magic 3 Freebies/RPG Magic SFX Pack 3 – Elemental/RPG3_IceMagic2_IceBreakLonger01.wav | 1.38秒 | 0.18 |
| C068 | leprechaun | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Christmas Vol. 1/MAGMisc_Magic Christmas Bells 2_344 Audio_Christmas.wav | 4.2秒 | 0.9 |
| C069 | melusine | Xylon Sound Library/Designed Sounds/Textures and Drones/Bubbles.wav | 4.4秒 | 0.9 |
| C077 | carbuncle | Adobe/衝突・破壊・クラッシュ音/Crash Glass Break Plate 03.wav | 0.807秒 | 0.04 |
| C078 | pixie | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ELECTRIC Cast Medium Bolt-01.wav | 2.9秒 | 0.9 |
| C080 | elemental | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC FIRE Cast Medium-01.wav | 3.024秒 | 0.74 |
| C081 | imp | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Summon Long-02.wav | 4.2秒 | 0.9 |
| C092 | wendigo | Adobe/雨・雷・風など天候/Weather Ambience Wind Blizzard Snow Whistle Gust 01.wav | 4.4秒 | 0.9 |
| C096 | nightmare | Adobe/持続する低音・不穏な持続音/Drone Production Element Imaging Dark Phase Evil Gritty 01.wav | 4.2秒 | 0.9 |
| C098 | baron | Xylon Sound Library/Designed Sounds/Textures and Drones/Underground Room.wav | 4.2秒 | 0.9 |
| C076 | pegasus | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Large 01-03.wav | 2.86秒 | 0.9 |
| C041 | direwolf | Adobe/ホラー・恐怖系/Horror Scary Werewolf Howl 05.wav | 3.8秒 | 0.12 |
| K016 | weaken | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC BLACK Whoosh Small-03.wav | 1.8秒 | 0.2 |
| K002 | atk-down | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Bass Drops & Downers Vol. 3/DSGNBass_Tone Downer (Reverb)_344 Audio_Bass Drops and Downers Vol 3.wav | 3.1秒 | 0.44 |
| K009 | all-cross | Xylon Sound Library/Designed Sounds/SFX/Impacts/Crash Impact.wav | 3.0秒 | 0.04 |
| I006 | meteor-scroll | Adobe/火・炎・爆発/Explosion Volcano 01.wav | 2.28秒 | 0.08 |
| C014 | titan | The Vault/Broken/Sounds/分割/BROKEN - DESIGNED - EARTHQUAKE Rumble LFE 01-01.wav | 4.4秒 | 0.9 |
| C018 | cyclops | Xylon Sound Library/Designed Sounds/SFX/Impacts/Riser + Impact.wav | 4.0秒 | 0.9 |
| C025 | wraith | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Stab Dark Ghostly 02.wav | 4.0秒 | 0.34 |
| S001 | battle-summon | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Cast Small 02-01.wav | 1.8秒 | 0.46 |
| K020 | revive-summon | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC WHITE Summon Meditative-01.wav | 2.3秒 | 0.9 |
| K018_gain | shield-gain | The Vault/Sorcery/Sounds/分割/SORCERY - DESIGNED - MAGIC ICE Deflect Spell-01.wav | 1.2秒 | 0.22 |
| K020_gain | revive-gain | Adobe/映像／音響演出用SE・トランジションなど/Production Element Title Transition Bell Chime 01.wav | 0.999秒 | 0.24 |
