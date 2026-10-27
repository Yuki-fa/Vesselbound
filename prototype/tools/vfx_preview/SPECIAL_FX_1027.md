# 特殊演出の一覧（2026-10-27）

カード（キャラクター・エンチャント・敵・NPC）・アイテム・指輪・魔導板（マスの力・マスの変化）以外で使っている演出の一覧。
「特殊演出」表（シート specialFx）へ書き写すための資料。

- **LAB番号**：VFX LAB（tools/vfx_preview.html）の演出一覧の番号（2026-10-27 時点。演出が増えると変わる）。
- **SE**：ゲームで鳴る音の登録キー＝ファイル（assets/sfx/）。
- **シート**：今の「特殊演出」表に行があるか。シートの行は S001・S003〜S012 だけで、S002・S013〜S042 は空き。
- 割り当ては LAB の「現在の割り振り」（lab_model.js currentUses）と、assets.js の `Assets.vfx`（specialProduction・keywordEffect・attackContact）・present.js の `PRESENT_LAB_FX` から集めた。

## 1. 「特殊演出」表の番号で引く演出（Assets.vfx.specialProduction）

| LAB番号 | 演出名 | LAB の見出し | どこで出るか | SE | シート |
|---|---|---|---|---|---|
| 97 | summon-sigil | 緑の召喚陣 · S001 | 召喚（眷属などが召喚された）の共通の演出 | S001＝S001.wav | S001 召喚 |
| 111 | battle-summon | 戦闘中の召喚 | 戦闘中に召喚された体が場に現れる時（render.js `playSummonAppearVfx` が S001 で引く。C036・EN014 など） | S001＝S001.wav | S001 召喚（同じ番号） |
| 98 | gold-gain | 金貨の獲得 · S003 | 所持金が増えた時（ノームの終戦・死亡でゴールドなど） | S003＝S003.wav | S003 お金獲得 |
| 99 | mana-gain | マナの結晶 · S004 | マナが増えた時 | S004＝S004.wav | S004 マナ獲得 |
| 100 | attack-buff | 攻撃の強化 · S005 | 攻撃効果のバフ | S005＝S005.wav | S005 バフ（攻撃） |
| 101 | injury-buff | 負傷の強化 · S006 | 負傷効果のバフ | S006＝S006.wav | S006 バフ（負傷） |
| 102 | death-buff | 死亡の強化 · S007 | 死亡効果のバフ | S007＝S007.wav | S007 バフ（死亡） |
| 103 | mana-buff | マナの強化 · S008 | マナ効果のバフ | S008＝S008.wav | S008 バフ（マナ） |
| 104 | aura-buff | 常時の強化 · S009 | 開戦・常時・誘発効果のバフ、終戦の能力変化（固有の演出が無いもの） | S009＝S009.wav | S009 バフ（常時） |
| 113 | shield-gain | 結界獲得 | 結界を得た時 | K018_gain＝K018_gain.wav | S012 結界獲得 |
| 114 | revive-gain | 復活獲得 | 復活を得た時 | K020_gain＝K020_gain.wav | S011 復活獲得 |
| — | （無し） | — | 全体攻撃を得た時（専用の演出は無い） | — | S010 全体攻撃獲得（行だけある） |

## 2. キーワード・状態の演出（キーワード表の番号 K###）

キーワード表にも行があるが、「特殊演出」表には行が無いもの。

| LAB番号 | 演出名 | LAB の見出し | どこで出るか | SE | シート |
|---|---|---|---|---|---|
| 87 | death-mark | 即死の印 · K001 | 即死した時（黒い波動 E004・EN063 など。この後カードが四散する） | K001＝K001.wav | 無し |
| 147 | atk-down | ATK減少 | 邪眼などで ATK が下がった時 | K002＝K002.wav | 無し |
| 88 | fang-poison | 毒牙の付与 · K003 | 毒を与えた時 | K003＝K003.wav | 無し |
| 92 | poison-tick | 毒の被弾 · K017 | 毒のダメージ | K017＝K017.wav | 無し |
| 146 | weaken | 弱体化 | 弱体を与えた時 | K016＝K016.wav | 無し |
| 89 | piercing-streak | 貫通の軌跡 · K007 | 貫通の攻撃 | K007＝K007.wav | 無し |
| 90 | tri-streak | 三方向の一閃 · K008 | 三方向攻撃 | K008＝K008.wav | 無し |
| 91 | contact-burst | 全体命中の衝撃 · K009 | 全体攻撃の命中 | K009＝K009.wav | 無し |
| 148 | all-sweep | 全体攻撃 A・横一閃 | 1列だけの全体攻撃（K009_SWEEP） | K009_SWEEP＝K009.wav | 無し |
| 150 | all-cross | 全体攻撃 C・交差斬撃 | 全体攻撃（K009） | K009＝K009.wav | 無し |
| 93 | shield-contact | 結界の接触 · K018 | 結界がダメージを防いだ瞬間 | K018＝K018.wav | 無し |
| 115 | shield-break | 結界消失 | 結界を失った時 | shield_break＝shield_break.wav | 無し |
| 95 | revive-burst | 復活の光 · K020 | 復活した瞬間 | K020＝K020.wav | 無し |
| 112 | revive-summon | 復活による召喚 | 復活して場に戻る時 | K020＝K020.wav | 無し |
| 94 | seal-release | 封印の解放 · K019 | 封印が解けた時 | K019＝K019.wav | 無し |
| 96 | mana-cue | マナ効果の合図 · K024 | マナ効果が発動する合図 | K024＝K024.wav | 無し |
| 07 | stealth-veil | 隠密：迷彩 | 隠密を得た時 | K013＝K013.wav | 無し |
| 08 | guard-stance | 防戦：構える盾 | 防戦を得た時 | K014＝K014.wav | 無し |
| 153 | revive-state | 復活状態 | 復活を持っている間（ループ） | 無し（状態は無音） | 無し |
| 154 | shield-state | 結界状態 | 結界を持っている間（ループ） | 無し | 無し |
| 155 | poison-state | 毒状態 | 毒を持っている間（ループ） | 無し | 無し |
| 156 | weaken-state | 弱体状態 | 弱体を持っている間（ループ） | 無し | 無し |
| 157 | guts-state | 根性状態 | 根性を持っている間（ループ） | 無し | 無し |
| 158 | stealth-state | 隠密状態（光学迷彩） | 隠密を持っている間（ループ） | 無し | 無し |
| 159 | guard-state | 防戦状態 | 防戦を持っている間（ループ） | 無し | 無し |

## 3. 戦闘の共通の演出（番号を持たない）

| LAB番号 | 演出名 | LAB の見出し | どこで出るか | SE | シート |
|---|---|---|---|---|---|
| 76 | hit-burst | 被弾 · hit | 通常の攻撃・効果のダメージを受けた時（固有の演出の無いもの全て） | 武器ごとの命中音（attack・sword1〜3・axe1〜3・punch1〜3・kick1〜3）、効果のダメージは effectDamage＝effect_damage.wav | 無し |
| 105 | opening-sigil | 着地の砂煙 · appearance | 戦闘開始：カードが場に降りて着地する時（battle_intro.js） | 開戦の登場の音（presentSfxPeakSec('appearance') に合わせて鳴らす） | 無し |

## 4. LAB の外でコードが描く演出（VFX LAB に無い）

カードの写しや画面の要素を動かして描いているもの。LAB には出ない。

| 演出 | どこで出るか | 描いている所 | SE |
|---|---|---|---|
| 死亡の焼失 | キャラクターが倒れた時 | render.js `playUnitDeathBurn`・render_death_effects.js `playCardBurnAway` | death＝death.wav |
| 即死の四散 | 即死した時（2026-10-27 追加。即死の印 K001 の後に、破片に分けてフェードで散る） | render_death_effects.js `playCardScatterAway` | 専用の音は無し（即死の印の K001 が先に鳴る） |
| 青い波打ち＋WASTED | ダメージ以外で HP が 0 になった時（能力値の減少など） | render_death_effects.js `playCardWaveAway` | — |
| 逃走 | 逃走した時 | render.js `playFledVfx` | — |
| 生贄の消滅 | 生贄にされた時 | render.js `playSacrificeDestroyVfx` | — |
| 開戦の降下・命中の揺れ | 戦闘開始の降下、命中時の画面の揺れ | battle_intro.js `playBattleIntroDescent`・`playBattleHitImpact` | — |
| 勝利・敗北のカットイン | 戦闘の決着 | present_events.js（`showBattleCutin`） | victory＝victory.wav、ボス戦は bossVictory＝boss_victory.wav |
| ライフの減少 | 敗北でライフを失う時 | battle_intro.js | lifeLost＝life_lost.wav |
| 報酬カードのめくり | 報酬・店のカードを表にする時（レアリティの光） | card_reveal.js | cardFlip＝card_flip.wav、レアリティ R3〜R5＝R3〜R5.wav |
| 3枚合体 | 同じカード3枚の合体 | reward.js | union（無い時は merge.wav） |
| 祭壇への出入り | 祭壇（指輪の交換）に入る・出る | map.js・reward.js | altarIn＝altar_in.wav・altarOut＝altar_out.wav |
| 戦闘開始の文字 | 戦闘開始の文字の表示 | map.js | boom＝boom.wav |
| 所持金の増減の表示 | 所持金の数字の増減 | gold_fx.js | income＝income.wav |

## 5. 参考：どこでも使っていない定義

ゲームのどこからも引いていない演出（1MB へ戻す時の削る候補。削るかは利用者が確認してから）。

| LAB番号 | 演出名 | LAB の見出し |
|---|---|---|
| 117 | banshee | バンシー（今のバンシーは banshee-miasma） |
| 125 | dullahan | デュラハン |
| 142 | abyss | アビス・バロン A・渦 |
| 151 | all-roar | 全体攻撃 D・咆哮 |
| 77 | attack-recoil | 反攻の輪 · C007（マータの旧本文） |
| 61 | familiar | ファミリア |
| 44 | hydra-reward | ハイドラ · C070 |
| 23 | scroll-shield | 盾の巻物 · I003（今は scroll-guts-shield） |
| 25 | scroll-giant | 巨大化の巻物 · I005（今は scroll-revive） |
| 28〜33 | ring-eye-red・blue・green・yellow・purple・rainbow | 瞳の指輪 R001〜R005・R032 |
