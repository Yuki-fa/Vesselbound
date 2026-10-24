/* 利用者が見た目・SEともに決めた（FIXした）演出。LAB の「演出の一覧」で、ここに無い演出へ「未FIX」の印を出す（2026-10-20 利用者指定）。
 * 値は決めた日。指摘があって作り直した演出は、利用者が改めてOKを出すまでここから外す。 */
var VbFxLabFixed = {
  // 以前から正式採用（ADOPTED.md の最初の表）で、その後に指摘の無いもの
  'atk-down':'2026-10-12','bandersnatch':'2026-10-12','banshee':'2026-10-06','bone-chariot':'2026-10-12','carbuncle':'2026-10-12',
  'cockatrice':'2026-10-12','cover-fire':'2026-10-06','cyclops':'2026-10-12','dark-fire':'2026-10-18','demon-soul':'2026-10-06',
  'dragonnet':'2026-10-12','dullahan':'2026-10-12','elemental':'2026-10-12','frost-sprite':'2026-10-12','great-shield':'2026-10-06',
  'imp':'2026-10-12','jackalope':'2026-10-12','leprechaun':'2026-10-12','lich':'2026-10-06','melusine':'2026-10-12','meteor-scroll':'2026-10-12',
  'nightmare':'2026-10-12','pegasus':'2026-10-12','pixie':'2026-10-12','resentment':'2026-10-06','revive-gain':'2026-10-06',
  'revive-summon':'2026-10-06','shield-gain':'2026-10-06','titan':'2026-10-12','vrykolakas':'2026-10-12','weaken':'2026-10-12',
  'wendigo':'2026-10-12','worm':'2026-10-12','wraith':'2026-10-12','wyvern':'2026-10-12',
  // 2026-10-18「SE含めOK」
  'dragon-pact':'2026-10-18','curse-ring':'2026-10-18','void-mastery':'2026-10-18','keyword-grant':'2026-10-18','soul-recall':'2026-10-18',
  'oni-ring':'2026-10-18','satyr':'2026-10-18','hecatoncheir':'2026-10-18','zombie':'2026-10-18','sylph':'2026-10-18','fiend':'2026-10-18',
  'lilith':'2026-10-18','flame-sweep':'2026-10-18','mana-cue':'2026-10-18','gold-gain':'2026-10-18','injury-buff':'2026-10-18',
  'magic-ring-mana':'2026-10-18','chaos-imp':'2026-10-18','attack-recoil':'2026-10-18','undying-ring':'2026-10-18','familiar':'2026-10-18',
  'arachne-ring':'2026-10-18','aura-buff':'2026-10-18',
  // 2026-10-20 SEを決定（見た目の指摘なし）
  'paladin-ring':'2026-10-20','alchemy':'2026-10-20','behemoth':'2026-10-20','hydra-reward':'2026-10-20','nymph':'2026-10-20',
  'phantom':'2026-10-20','eidolon':'2026-10-20','overlord':'2026-10-20','undine':'2026-10-20','centaur-impact':'2026-10-20',
  'poison-tick':'2026-10-20','attack-buff':'2026-10-20','death-buff':'2026-10-20','contact-burst':'2026-10-20','battle-summon':'2026-10-20',
  'abyss':'2026-10-20',
  // 2026-10-21 FIX（02・03・05・06・08・22・27・32・33・46・50・54・57・66・67・69・71・74・75・76・96・124・134〜138、SEを決めた19・23・26・51・55・65・103・130・132、速度2.5倍の62、ゲーム側の出し方を直す129・131）
  'rage-shards':'2026-10-21','storm-ring':'2026-10-21','scroll-revive':'2026-10-21','scroll-giant':'2026-10-21','scroll-guts':'2026-10-21',
  'fate-sever':'2026-10-21','suffering-brand':'2026-10-21','map-resonance':'2026-10-21','map-duplicate':'2026-10-21','arch-demon':'2026-10-21',
  'minotaur':'2026-10-21','spriggan':'2026-10-21','hit-burst':'2026-10-21','fire-arrow':'2026-10-21','fire-arrow-impact':'2026-10-21',
  'fang-poison':'2026-10-21','tri-streak':'2026-10-21','shield-contact':'2026-10-21','seal-release':'2026-10-21',
  'shield-break':'2026-10-21','baron':'2026-10-21','revive-state':'2026-10-21','shield-state':'2026-10-21','poison-state':'2026-10-21',
  'weaken-state':'2026-10-21','guts-state':'2026-10-21','sealed-power':'2026-10-21','steal-mark':'2026-10-21','penance-ring':'2026-10-21',
  'shockwave':'2026-10-21','all-ring':'2026-10-21','all-roar':'2026-10-21','gold-loss':'2026-10-21','sleep-sheep':'2026-10-21',
  'incubus':'2026-10-21','centaur-missile':'2026-10-21','all-sweep':'2026-10-21','all-cross':'2026-10-21',
  // 2026-10-21 2回目：FIX（31・70・80・84、SE1を採用した68）。76 は SE を選び直すので外す
  'map-life':'2026-10-21','piercing-streak':'2026-10-21','mana-gain':'2026-10-21','mana-buff':'2026-10-21','death-mark':'2026-10-21',
  // 2026-10-21 3回目：FIX（04・07・86・87・88・78・52・61）
  'scroll-shield':'2026-10-21','scroll-mana':'2026-10-21','opening-sigil':'2026-10-21','board-summon':'2026-10-21','board-enchant':'2026-10-21',
  'summon-sigil':'2026-10-21','scylla':'2026-10-21','medusa-gaze':'2026-10-21',
  // 2026-10-21 4回目：FIX（34・60・126）
  'intimidate-ring':'2026-10-21','siren-wave':'2026-10-21','direwolf':'2026-10-21',
  // 2026-10-21 5回目：FIX（76 速度150%を標準・SE3）
  'revive-burst':'2026-10-21',
  // 2026-10-21 6回目：FIX（47 グレムリン SE2）
  'gremlin':'2026-10-21',
};

/* 2026-10-23 VFX の全検査（利用者指定「FIX&設定されているものは★、されていないものは☆のまま。FIX&設定されていないものは新しくVFXを検討して割り当てる」）。
 * VbFxLabPending：今回新しく割り当てた（流用・新作）もの。利用者が LAB で見て FIX と言うまで☆のまま（★にする時はここから外す）。
 * VbFxLabStarNotes：戦闘中に演出を出さないもの（－）の理由。 */
var VbFxLabPending = {
  C067:'mana-buff（ウォーグのバフに出ていなかった）', C070:'aura-buff（敵が状態異常を得るたびHP+）', C047:'aura-buff（眷属が召喚されるたび）',
  C092:'aura-buff（眷属の強化）', C095:'aura-buff（4回目の終戦でエンチャントを強化した時）', C008:'injury-buff（報酬とトレーダーの強化）',
  C114:'attack-buff（報酬とトレーダーの強化）', C062:'aura-buff（終戦のリロール）', C012:'injury-buff＋S006の音（音が鳴っていなかった）',
  R035:'aura-buff（味方が結界を失うたび全ての味方+1/+1）', M003:'map-life（開戦の着地。旧・生命の力の演出）',
  I015:'keyword-grant', I016:'keyword-grant', I017:'keyword-grant', I018:'keyword-grant', I019:'keyword-grant',
  I020:'keyword-grant', I021:'keyword-grant', I022:'keyword-grant', I023:'keyword-grant',
  // 新しく作った演出（additions_1023.js）
  EN013:'echo-bolt（新作）', EN031:'frost-retaliate（新作）', C084:'activation-transform（新作。起動の変身）',
  C109:'activation-empower（新作。起動の強化と色の変化）', C116:'activation-devour（新作。起動の破壊）', I002:'activation-transform（新作。変身の巻物）',
};
var VbFxLabStarNotes = {
  E029:'開戦で死亡効果を発動する（発動した死亡効果の演出が出る）',
  M002:'値の補正（置いた時点で封印の値が変わる）', M004:'値の補正（置いた時点でマナ効果の値が変わる）',
  I009:'街へワープする（戦闘外）', I011:'再抽選の回数（盤面の対象が無い）',
  R036:'血の数が増えるだけ（画面上の発生場所が無い。血のカウンターに出る）',
};
// 起動の演出（魔導板で対象に使った時）。本体は present.js PRESENT_ACTIVATION_FX。
var VbFxLabActivationFx = typeof PRESENT_ACTIVATION_FX !== 'undefined' ? PRESENT_ACTIVATION_FX : {};

