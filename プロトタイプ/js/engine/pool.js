// ═══════════════════════════════════════
// pool.js — 報酬プール・カード抽選
// 依存: constants.js, state.js, units.js, spells.js
// ═══════════════════════════════════════

function randUses(){ return 3+Math.floor(Math.random()*4); }

// キャラクターのグレードを階層に応じて決定
function rollCharGrade(floor){
  if(floor<5)  return 1;
  if(floor<10) return 2;
  if(floor<15) return 3;
  return 4;
}

// 購入価格
function calcBuyPrice(card){
  if(!card) return 1;
  if(typeof G!=='undefined'&&G&&G._freeRewardPanelMode&&(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope)) return 0;
  // キャラクター
  if(card._isChar){
    return card.cost||2;
  }
  if(card.type==='consumable') return card.cost||1;
  if(card.type==='wand') return card.cost||2;
  if(card.type==='panel'||card.type==='global-panel'||card.kind==='panel'||card.panelScope) return card.cost||2;
  // 指輪
  return card.cost||4;
}

function _normalizePanelRewardCost(def){
  if(!def) return def;
  if(def._baseCost==null) def._baseCost=def.cost||1;
  def.cost=0;
  return def;
}

function _rollPanelDirections(count=2){
  const dirs=['up','right','down','left'];
  const picks=[];
  const need=Math.max(1,Math.min(4,count||2));
  while(picks.length<need){
    const d=dirs[Math.floor(Math.random()*dirs.length)];
    if(!picks.includes(d)) picks.push(d);
  }
  return picks;
}

const PANEL_POOL=[
  {id:'panel_gnome',no:'001',name:'ノーム',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:4,desc:'終戦：2ゴールドを得る。'},
  {id:'panel_mata',no:'002',name:'マータ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:0,life:7,desc:'常時：味方が受ける2以上のダメージの半分を代わりに受ける。'},
  {id:'panel_golem',no:'003',name:'ゴーレム',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'アーティファクト',power:3,life:3,desc:''},
  {id:'panel_satyr',no:'004',name:'サテュロス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:3,manaCost:1,desc:'1マナ：3マナを得る。'},
  {id:'panel_dwarf',no:'005',name:'ドワーフ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:5,manaCost:2,manaRepeat:true,desc:'2マナ毎：ランダムな赤キャラクターは+4/+4を得る。'},
  {id:'panel_lamia',no:'006',name:'ラミア',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:6,desc:'攻撃：対象のキャラクターの攻撃力がこのキャラクターより低い場合、そのキャラクターを仲間にする。'},
  {id:'panel_kobold',no:'007',name:'コボルド',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:2,life:4,desc:'負傷：全ての赤キャラクターは+1/+1を得る。'},
  {id:'panel_arachne',no:'008',name:'アラクネ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:2,life:6,desc:'負傷：全ての敵はATK-1を得る。'},
  {id:'panel_minotaur',no:'009',name:'ミノタウロス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:5,desc:'負傷：直ちにランダムな敵に攻撃する。'},
  {id:'panel_harpy',no:'010',name:'ハーピー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:5,life:3,keywords:['先制'],desc:''},
  {id:'panel_siren',no:'011',name:'サイレン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:6,desc:'攻撃：全てのキャラクターに1ダメージを与える。'},
  {id:'panel_gigantes',no:'012',name:'ギガンテス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:5,life:4,desc:'常時：敵が死亡するたびに1マナを得る。'},
  {id:'panel_formorian',no:'013',name:'フォルモール',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:4,desc:'常時：味方の負傷効果は1回追加で発動する。'},
  {id:'panel_titan',no:'014',name:'タイタン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:6,life:4,desc:'開戦：全ての敵に弱体2を与える。'},
  {id:'panel_ettin',no:'015',name:'エティン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:1,life:6,desc:'常時：味方の負傷効果が発動するたび、このキャラクターは+2/+1を得る。'},
  {id:'panel_sentinel',no:'016',name:'センチネル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'アーティファクト',power:5,life:5,desc:'負傷：「赤ゴーレム」を召喚する。'},
  {id:'panel_medusa',no:'017',name:'メデューサ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:7,desc:'負傷：ランダムな敵にXダメージを与える。Xは受けたダメージに等しい。'},
  {id:'panel_cyclops',no:'018',name:'サイクロプス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:6,manaCost:3,desc:'3マナ：全体攻撃を得る。'},
  {id:'panel_centaur',no:'019',name:'ケンタウロス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:5,desc:'攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。'},
  {id:'panel_hecatoncheir',no:'020',name:'ヘカトンケイル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:6,desc:'負傷：1マナを得る。'},
  {id:'panel_zombie',no:'021',name:'ゾンビ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,power:3,life:1,summonCount:2,desc:'開戦：コピーを1体召喚する。'},
  {id:'panel_skeleton',no:'022',name:'スケルトン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:2,desc:'死亡：ランダムな青キャラクターは+2/+1を得る。'},
  {id:'panel_mummy',no:'023',name:'マミー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:3,life:2,desc:'死亡：1ゴールドを得る。'},
  {id:'panel_banshee',no:'024',name:'バンシー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:3,desc:'死亡：全ての敵にXダメージを与える。XはこのキャラクターのATKに等しい。'},
  {id:'panel_wraith',no:'025',name:'レイス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:6,life:1,desc:'死亡：ランダムな味方に「死亡：「青ゴースト」を召喚する。」を付与する。'},
  {id:'panel_skeleton_king',no:'026',name:'スケルトンキング',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'開戦：「青スケルトン」を2体召喚する。'},
  {id:'panel_spectre',no:'027',name:'スペクター',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:3,life:5,manaCost:2,manaRepeat:true,desc:'2マナ毎：全ての青キャラクターはATK+2を得る。'},
  {id:'panel_ghost',no:'028',name:'ゴースト',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:2,desc:'死亡：全ての青キャラクターは+2/+2を得る。'},
  {id:'panel_phantom',no:'029',name:'ファントム',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:3,desc:'攻撃：ランダムな発動済みのスペルを1つ発動する。'},
  {id:'panel_nosferatu',no:'030',name:'ノスフェラトゥ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,keywords:['生命吸収'],desc:''},
  {id:'panel_lemures',no:'031',name:'レムレース',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:1,life:4,desc:'負傷：このキャラクターをダメージを与えたキャラクターに変身する。'},
  {id:'panel_vrykolakas',no:'032',name:'ヴリコラカス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:6,life:3,manaCost:4,manaRepeat:true,desc:'4マナ毎：復活を得る。'},
  {id:'panel_vampire_lord',no:'033',name:'ヴァンパイアロード',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'常時：キャラクターが死亡するたび、全ての味方はHP+1を得る。'},
  {id:'panel_eidolon',no:'034',name:'エイドロン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'常時：味方が3体死亡するたび、1マナを得る。'},
  {id:'panel_death_knight',no:'035',name:'デスナイト',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:3,desc:'死亡：「青ゴースト」を召喚する。'},
  {id:'panel_revenant',no:'036',name:'レヴナント',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:4,desc:'常時：味方が死亡するたび、このキャラクターは+1/+1を得る。'},
  {id:'panel_dullahan',no:'037',name:'デュラハン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'常時：味方が死亡するたび、ランダムな敵に4ダメージを与える。'},
  {id:'panel_bone_chariot',no:'038',name:'ボーンチャリオット',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:5,desc:'攻撃：隣接するキャラクターの死亡効果を発動する。'},
  {id:'panel_lich',no:'039',name:'リッチ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:7,life:3,desc:'常時：味方の死亡効果は1回追加で発動する。'},
  {id:'panel_grim_reaper',no:'040',name:'グリムリーパー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:1,life:5,keywords:['即死'],desc:'即死'},
  {id:'panel_dire_wolf',no:'041',name:'ダイアウルフ',rarity:1,displayRarity:'-',grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,power:3,life:3,desc:''},
  {id:'panel_sleep_sheep',no:'042',name:'スリープシープ',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,power:0,life:1,summonCount:3,desc:'開戦：コピーを2体召喚する。'},
  {id:'panel_brownie',no:'061',name:'ブラウニー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,power:1,life:4,desc:'攻撃：全ての仲間のHPが+1される。'},
  {id:'panel_elf',no:'062',name:'エルフ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,power:5,life:3,keywords:['先制','シールド'],desc:'先制　シールド'},
  {id:'panel_twin_devil',no:'009',name:'ツインデビル',rarity:-1,removed:true,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,power:2,life:1,summonCount:2,desc:'削除'},
  {id:'panel_archdemon',no:'082',name:'アークデーモン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,power:25,life:20,desc:'召喚：ランダムな前衛の敵1体を破壊する。'},
  {id:'panel_arassas',no:'043',name:'アラッサス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,power:15,life:15,desc:'召喚：全ての敵に3ダメージを与える。'},
  {id:'panel_slin',no:'044',name:'スリン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,power:10,life:20,keywords:['毒牙3'],desc:'毒牙3'},
  {id:'panel_counterattack_oath',no:'013',name:'逆襲',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['逆襲'],desc:'死亡：全ての味方は+1/+1を得る。'},
  {id:'panel_great_guard',no:'014',name:'大いなる守護',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentHpBonus:7,desc:'常時：HP+7を得る。'},
  {id:'panel_inner_might',no:'015',name:'内なる大力',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentAtkBonus:2,adjacentHpBonus:1,desc:'常時：+2/+1を得る。'},
  {id:'panel_dark_ritual',no:'016',name:'闇の儀式',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['闇の儀式'],desc:'死亡：以後、召喚される同名のキャラクターを永久に+2/+2する。'},
  {id:'panel_persistent_flame',no:'017',name:'執念の炎',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['根性'],desc:'根性（致死ダメージを受けた時、1度だけHP1で耐える）'},
  {id:'panel_dark_flame',no:'018',name:'闇の炎',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['闇の炎'],desc:'死亡：全ての敵キャラクターに1ダメージを与える。'},
  {id:'panel_poison_blade',no:'019',name:'毒の刃',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['毒牙2'],desc:'毒牙2（攻撃時にダメージを受ける毒を付与）'},
  {id:'panel_dragon_contract',no:'020',name:'竜の契約',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['竜の契約'],desc:'常時：5回負傷した時、25/40、竜の「ドラコニアン」に変身する。（自身が「ドラコニアン」の場合は無効）'},
  {id:'panel_imp',no:'009',name:'インプ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,power:2,life:1,keywords:['根性'],desc:'根性'},
  {id:'panel_madness',no:'021',name:'狂気',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['狂気'],desc:'死亡：青マナを得る。'},
  {id:'panel_wild_power',no:'025',name:'野生の力',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['野生の力'],desc:'召喚：緑マナを得る。'},
  {id:'panel_magic_circuit_a',no:'022',name:'魔導回路',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,directionCount:3,desc:'効果なし　三方向パネル'},
  {id:'panel_healing_trait',no:'024',name:'治癒能力',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['治癒能力'],desc:'負傷：HP+2を得る。'},
  // 以下は「強化」シートにキーワード欄のみで登録されている単純なキーワード付与パネル。
  // PANEL_POOLに未登録だとシート同期の対象外（=常に取得不可）になるため、ここにスタブを追加する。
  {id:'panel_double_attack',no:'014',name:'二段攻撃',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['二段攻撃']},
  {id:'panel_triple_attack',no:'015',name:'三段攻撃',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['三段攻撃']},
  {id:'panel_instant_death',no:'016',name:'即死',rarity:5,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['即死']},
  {id:'panel_triway_attack',no:'017',name:'三方向攻撃',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['三方向攻撃']},
  {id:'panel_evil_eye',no:'018',name:'邪眼',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['邪眼5']},
  {id:'panel_weaken',no:'019',name:'弱体化',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['弱体化5']},
  {id:'panel_first_strike',no:'020',name:'先制',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['先制']},
  {id:'panel_shield',no:'021',name:'シールド',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['シールド']},
  {id:'panel_aoe_attack',no:'022',name:'全体攻撃',rarity:5,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['全体攻撃']},
  {id:'panel_lifesteal',no:'023',name:'生命吸収',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['生命吸収']},
];

// ── スペルカード：指定マナが貯まると自動で1回だけ発動するカード ──
const SPELL_POOL=[
  {id:'spell_fire_arrow',no:'001',name:'炎の矢',type:'spell',kind:'spell',category:'スペル',manaCost:1,color:'赤',effectKey:'fire_arrow',desc:'HPが最も低いランダムな敵に5ダメージを与える。'},
];

function makeSpell(idOrName){
  const def=SPELL_POOL.find(p=>p.id===idOrName||p.name===idOrName);
  if(!def) return null;
  const c=clone(def);
  _normalizePanelRewardCost(c);
  c.noRewardUse=true;
  c._buyPrice=0;
  return c;
}

function makePanel(idOrName){
  const def=PANEL_POOL.find(p=>p.id===idOrName||p.name===idOrName);
  if(!def) return null;
  const c=clone(def);
  if(String(c.category||'')==='キャラクター'){
    c._permBasePower=Number(c.power??c.atk??0);
    c._permBaseLife=Number(c.life??c.hp??1);
    const b=G&&G.panelPermanentBuffs&&G.panelPermanentBuffs[c.name];
    if(b){
      c._permBuffAtkApplied=Number(b.atk||0);
      c._permBuffHpApplied=Number(b.hp||0);
      c.power=c._permBasePower+c._permBuffAtkApplied;
      c.life=c._permBaseLife+c._permBuffHpApplied;
    }
    const colorKey=_panelColorBuffKey(c.color||c.カラー);
    const cb=G&&G.panelColorPermanentBuffs&&G.panelColorPermanentBuffs[colorKey];
    if(cb){
      c._permColorBuffAtkApplied=Number(cb.atk||0);
      c._permColorBuffHpApplied=Number(cb.hp||0);
      c.power=Number(c.power||0)+c._permColorBuffAtkApplied;
      c.life=Number(c.life||0)+c._permColorBuffHpApplied;
    }
  }
  _normalizePanelRewardCost(c);
  c.equip=true;
  c.noRewardUse=true;
  if(['強化','エンチャント'].includes(String(c.category||''))) c.directions=_rollPanelDirections(c.directionCount||2);
  c._buyPrice=calcBuyPrice(c);
  return c;
}

function _panelColorBuffKey(color){
  const c=String(color||'').trim().toLowerCase();
  if(c==='赤'||c==='red') return 'red';
  if(c==='青'||c==='blue') return 'blue';
  if(c==='緑'||c==='green') return 'green';
  if(c==='黄'||c==='茶'||c==='yellow') return 'yellow';
  if(c==='紫'||c==='purple') return 'purple';
  return c;
}

function drawPanel(n=1, maxGrade){
  ensurePanelSaleStock();
  const targetGrade=maxGrade!=null?maxGrade:(G.rewardGrade||1);
  const panelCandidates=PANEL_POOL.filter(p=>p&&p.id&&p._sheetSeen&&p.rarity!==-1&&p.name!=='ダイアウルフ'&&(p.grade||1)<=targetGrade&&panelSaleStockCount(p)>0);
  const charCandidates=panelCandidates.filter(p=>String(p.category||'')==='キャラクター');
  const enchantCandidates=panelCandidates.filter(p=>['エンチャント','強化'].includes(String(p.category||'')));
  const allPool=[...panelCandidates];
  const res=[];
  const usedIds=new Set();
  let t=0;
  while(res.length<n&&allPool.length>0&&t++<300){
    // 出現率：キャラクター45%・強化45%・スペル10%（グレード等の絞り込みは各候補配列側で反映済み）
    const r=rand();
    let pool=r<0.5?charCandidates:enchantCandidates;
    let available=pool.filter(p=>!usedIds.has(p.id));
    if(!available.length){
      // 選んだカテゴリの在庫が尽きている場合は、全体プールから補う
      available=allPool.filter(p=>!usedIds.has(p.id));
    }
    if(!available.length) break;
    const weighted=available.flatMap(p=>{
      const w=Math.max(1,7-(p.rarity||1));
      return Array.from({length:w},()=>p);
    });
    const picked=randFrom(weighted);
    consumePanelSaleStock(picked);
    usedIds.add(picked.id);
    const card=makePanel(picked.id);
    if(card) res.push(card);
  }
  return res;
}

function panelSaleStockKey(panel){
  return panel&&(panel.id||panel.name);
}

function ensurePanelSaleStock(){
  if(G.panelSaleStock) return;
  G.panelSaleStock={};
  (PANEL_POOL||[]).forEach(p=>{
    if(!p||!p.id||p.rarity===-1) return;
    G.panelSaleStock[panelSaleStockKey(p)]=Math.max(0,11-(p.grade||1));
  });
  (SPELL_POOL||[]).forEach(p=>{
    if(!p||!p.id) return;
    G.panelSaleStock[panelSaleStockKey(p)]=99;
  });
}

function panelSaleStockCount(panel){
  ensurePanelSaleStock();
  return G.panelSaleStock[panelSaleStockKey(panel)]||0;
}

function consumePanelSaleStock(panel){
  ensurePanelSaleStock();
  const key=panelSaleStockKey(panel);
  G.panelSaleStock[key]=Math.max(0,(G.panelSaleStock[key]||0)-1);
}

function returnPanelToSalePool(panel){
  ensurePanelSaleStock();
  const key=panelSaleStockKey(panel);
  if(key) G.panelSaleStock[key]=(G.panelSaleStock[key]||0)+1;
}

function addPanelToSalePool(panel){
  returnPanelToSalePool(panel);
}

// 売却払い戻し
function cardRefund(card){
  if(!card) return 0;
  if(card._isChar) return 1;
  return 0; // 指輪・杖・消耗品はすべてゴールド還元なし
}

// ── アイテムプールから N 個抽選 ─────────────────

function drawItems(n, maxGrade){
  return drawPanel(n, maxGrade);
}

function drawRewards(n){
  if(n!=null){
    // 宝箱：現在の階層セクショングレード以下のアイテムのみ
    const fd=FLOOR_DATA[G.floor];
    const maxGrade=fd?(fd.sectionGrade||Math.min(4,Math.ceil(fd.grade))||1):1;
    return drawItems(n, maxGrade);
  }
  // 最初の報酬フェイズ（戦闘0回目、G.floorがまだ0）は報酬カードを提示しない
  if(!(G.floor>0)) return [];
  const appraiser=G.allies&&G.allies.some(a=>a&&a.hp>0&&typeof unitHasEquip==='function'&&unitHasEquip(a,'equip_appraiser'));
  const baseGrade=G.rewardGrade||1;
  const boostGrade=Math.min(5,baseGrade+1);
  const targetGrade=appraiser?boostGrade:undefined;
  const res=drawPanel(5, targetGrade);
  const maxGrade=targetGrade!=null?targetGrade:(G.rewardGrade||1);
  const pickGuaranteedPanel=(pred, used)=>{
    ensurePanelSaleStock();
    const candidates=PANEL_POOL.filter(p=>p&&p.id&&p._sheetSeen&&p.rarity!==-1&&(p.grade||1)<=maxGrade&&panelSaleStockCount(p)>0&&!used.has(p.id)&&pred(p));
    if(!candidates.length) return null;
    const picked=randFrom(candidates);
    consumePanelSaleStock(picked);
    return makePanel(picked.id);
  };
  const used=new Set(res.filter(Boolean).map(c=>c.id));
  const isNormalSummon=p=>String(p.category||'')==='キャラクター';
  const isEnchant=p=>['エンチャント','強化'].includes(String(p.category||''));
  if(!res.some(isNormalSummon)){
    const c=pickGuaranteedPanel(isNormalSummon,used);
    if(c){ if(res[0]&&res[0].id) returnPanelToSalePool(res[0]); res[0]=c; used.add(c.id); }
  }
  if(!res.some(isEnchant)){
    const c=pickGuaranteedPanel(isEnchant,used);
    if(c){
      const idx=res.some(isNormalSummon)?1:0;
      if(res[idx]&&res[idx].id) returnPanelToSalePool(res[idx]);
      res[idx]=c;
      used.add(c.id);
    }
  }
  if(G._nextRewardUniqueSlot){
    G._nextRewardUniqueSlot=false;
  }
  return res;
}
