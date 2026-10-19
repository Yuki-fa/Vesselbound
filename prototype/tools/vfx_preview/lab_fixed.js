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
};
