// ═══════════════════════════════════════
// pool.js — 報酬プール・カード抽選
// 依存: constants.js, state.js, units.js, spells.js
// ═══════════════════════════════════════

function randUses(){ return 3+Math.floor(rand()*4); }

// キャラクターのグレードを階層に応じて決定

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

function _rollPanelDirections(count=2, opts){
  const dirs=['up','right','down','left'];
  const picks=[];
  const need=Math.max(1,Math.min(4,count||2));
  const avoidOpposite=!!(opts&&opts.avoidOpposite);
  while(picks.length<need){
    const d=dirs[Math.floor(rand()*dirs.length)];
    if(avoidOpposite&&need===2){
      if((d==='up'&&picks.includes('down'))||(d==='down'&&picks.includes('up'))||(d==='left'&&picks.includes('right'))||(d==='right'&&picks.includes('left'))) continue;
    }
    if(!picks.includes(d)) picks.push(d);
  }
  return picks;
}

// 提示するカードの矢印の向き。**同じ提示の中に、向きの組み合わせが完全に同じカードを2枚以上出さない。**
// 例）「左＋下」のカードは1枚まで。「左＋下＋右」は向きの数（ポート数）が違うので同時に出てよい。
// 判定は「向きの集合」で行う（並び順は関係ない）。
function _panelDirectionKey(dirs){
  return [...new Set((dirs||[]).map(d=>String(d||'')))].sort().join('|');
}
// その本数で作れる向きの組み合わせを全部返す。
// avoidOpposite＝2本のときは向かい合わせ（上下・左右）を作らない（_rollPanelDirections と同じ規則）。
function _panelDirectionCombos(count, avoidOpposite){
  const dirs=['up','right','down','left'];
  const need=Math.max(1,Math.min(4,Number(count)||1));
  const out=[];
  const walk=(start,cur)=>{
    if(cur.length===need){ out.push(cur.slice()); return; }
    for(let i=start;i<dirs.length;i++) walk(i+1,cur.concat(dirs[i]));
  };
  walk(0,[]);
  return out.filter(c=>!(avoidOpposite&&need===2
    &&((c.includes('up')&&c.includes('down'))||(c.includes('left')&&c.includes('right')))));
}
// 重複した組み合わせだけを、**同じ本数のまま**別の組み合わせへ振り直す。
// 空きが無ければそのまま（提示枚数が組み合わせ数を超える場合は重複を許す）。
function _dedupePanelDirections(cards){
  const used=new Set();
  (cards||[]).filter(Boolean).forEach(card=>{
    const dirs=Array.isArray(card.directions)?card.directions:[];
    if(!dirs.length) return;
    const key=_panelDirectionKey(dirs);
    if(!used.has(key)){ used.add(key); return; }
    const avoidOpposite=String(card.category||'')==='キャラクター';
    const free=_panelDirectionCombos(dirs.length,avoidOpposite)
      .filter(c=>!used.has(_panelDirectionKey(c)));
    if(!free.length){ used.add(key); return; }
    card.directions=free[Math.floor(rand()*free.length)].slice();
    used.add(_panelDirectionKey(card.directions));
  });
  return cards;
}

// ── 合体後の姿へ差し替える ────────────────────────────────
// **合体後の効果・キーワードはシートの「合体効果」列が唯一の出どころ**（loader.js が
// `mergedForm` として派生値まで作る）。**テキストの数字を機械的に2倍にしてはいけない。**
// 指定が無いカード（列が空欄）は、合体しても効果もキーワードも変わらない。
// 戻り値：差し替えたら true（＝表示側で数字を2倍にしてはいけない）。
function applyMergedPanelForm(card){
  const form=card&&card.mergedForm;
  if(!form) return false;
  Object.keys(form).forEach(k=>{
    const v=form[k];
    if(v===null||v===undefined) delete card[k];
    else card[k]=Array.isArray(v)?v.slice():v;
  });
  card._mergedFormApplied=true;
  return true;
}
// そのカードが「カード定義には無いキーワード」を持っているか（アイテム等で個別に付いたもの）。
// 合体後の姿はシート由来で作り直すため、個別に付いたぶんはここで拾って戻す。
function extraPanelKeywords(card){
  if(!card||!Array.isArray(card.keywords)) return [];
  const def=(typeof PANEL_POOL!=='undefined'&&PANEL_POOL.find(p=>(card.id&&p.id===card.id)||p.name===card.name))||null;
  const base=new Set(((def&&def.keywords)||[]).map(k=>String(k||'').trim()));
  return card.keywords.map(k=>String(k||'').trim()).filter(k=>k&&!base.has(k));
}

function _isImplementedPoolCard(p){
  return !!(p&&p._implemented!==false&&p._sheetSeen);
}

const PANEL_POOL=[
  {id:'panel_gnome',no:'001',name:'ノーム',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:4,desc:'終戦：5ゴールドを得る。'},
  {id:'panel_mata',no:'002',name:'マータ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:0,life:7,desc:'常時：味方が受ける2以上のダメージを1にし、1を超えた分をこのキャラクターが代わりに受ける。'},
  {id:'panel_golem',no:'003',name:'ゴーレム',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'アーティファクト',power:3,life:3,desc:'負傷：このキャラクターは+2/+2を得る。'},
  {id:'panel_satyr',no:'004',name:'サテュロス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:3,manaCost:1,desc:'1マナ：3マナを得る。'},
  {id:'panel_dwarf',no:'005',name:'ドワーフ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:5,manaCost:2,manaRepeat:true,desc:'2マナ毎：ランダムな赤キャラクター2体は+3/+2を得る。'},
  {id:'panel_lamia',no:'006',name:'ラミア',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:6,desc:'攻撃：このキャラクターは+2/+1を得る。対象が負傷している場合、もう一度繰り返す。'},
  {id:'panel_kobold',no:'007',name:'コボルド',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:2,life:4,desc:'負傷：全ての赤キャラクターは+1/+1を得る。'},
  {id:'panel_arachne',no:'008',name:'アラクネ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:2,life:6,manaCost:3,manaRepeat:true,desc:'3マナ毎：全ての味方に+2/+2を与えた後、1ダメージを与える。'},
  {id:'panel_minotaur',no:'009',name:'ミノタウロス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:5,desc:'負傷：直ちにランダムな敵に攻撃する。'},
  {id:'panel_harpy',no:'010',name:'ハーピー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:5,life:3,keywords:['先制'],desc:''},
  {id:'panel_siren',no:'011',name:'サイレン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:6,desc:'攻撃：全てのキャラクターに1ダメージを与える。'},
  {id:'panel_gigantes',no:'012',name:'ギガンテス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:5,life:4,desc:'負傷：全ての味方はATK+Xを得る。Xは受けたダメージに等しい。'},
  {id:'panel_formorian',no:'013',name:'フォルモール',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:4,desc:'負傷：ランダムな赤、青、緑キャラクター1体ずつは+2/+2を得る。'},
  {id:'panel_titan',no:'014',name:'タイタン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:6,life:4,desc:'開戦：全ての敵に弱体1を与える。'},
  {id:'panel_ettin',no:'015',name:'エティン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:1,life:6,desc:'常時：味方の負傷効果が発動するたび、このキャラクターは+2/+1を得る。'},
  {id:'panel_sentinel',no:'016',name:'センチネル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'アーティファクト',power:5,life:5,desc:'攻撃：「赤センチネル」以外のランダムな味方はHP+Xを得る。XはこのキャラクターのHPに等しい。'},
  {id:'panel_medusa',no:'017',name:'メデューサ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:7,desc:'負傷：ランダムな敵にXダメージを与える。Xは受けたダメージに等しい。'},
  {id:'panel_cyclops',no:'018',name:'サイクロプス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:4,life:6,manaCost:3,desc:'3マナ：全体攻撃を得る。'},
  {id:'panel_centaur',no:'019',name:'ケンタウロス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:5,desc:'攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。'},
  {id:'panel_hecatoncheir',no:'020',name:'ヘカトンケイル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,race:'亜人',power:3,life:6,desc:'負傷：10%の確率で1マナを得る。'},
  {id:'panel_zombie',no:'021',name:'ゾンビ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,power:3,life:1,summonCount:2,desc:'開戦：コピーを1体召喚する。'},
  {id:'panel_skeleton',no:'101',name:'スケルトン',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:2,keywords:['復活'],desc:'復活'},
  {id:'panel_mummy',no:'023',name:'マミー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:3,life:2,desc:'死亡：10ゴールドを得る。'},
  {id:'panel_banshee',no:'024',name:'バンシー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:3,desc:'死亡：ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい。'},
  {id:'panel_wraith',no:'025',name:'レイス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:6,life:1,desc:'死亡：ランダムな味方の負傷効果を発動する。'},
  {id:'panel_skeleton_king',no:'026',name:'スケルトンキング',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'攻撃：「青スケルトン」を召喚し、代わりに攻撃させる。'},
  {id:'panel_spectre',no:'027',name:'スペクター',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:3,life:5,manaCost:2,manaRepeat:true,desc:'2マナ毎：全ての青キャラクターはATK+2を得る。'},
  {id:'panel_ghost',no:'028',name:'ゴースト',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:2,desc:'死亡：ランダムな青キャラクターは+2/+1を得る。'},
  {id:'panel_phantom',no:'029',name:'ファントム',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:3,desc:'死亡：「青シャドウ」を3体召喚する。'},
  {id:'panel_blue_shadow',no:'022',name:'シャドウ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:1,life:1,desc:'攻撃：血が7以上なら全ての味方は+4/+4を得る。'},
  {id:'panel_blue_wild_hunt',no:'EN038',name:'ワイルドハント',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'-',power:20,life:20,desc:'（他の効果で召喚される「青ワイルドハント」も同じ強化を得る）'},
  {id:'panel_nosferatu',no:'030',name:'ノスフェラトゥ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,keywords:['隠密'],desc:'隠密'},
  {id:'panel_lemures',no:'031',name:'レムレース',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:1,life:4,desc:'死亡：「青レムレース」以外の、この戦闘で死亡したランダムなキャラクターをATKとHPを半分にして召喚する。'},
  {id:'panel_vrykolakas',no:'032',name:'ヴリコラカス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:6,life:3,manaCost:4,manaRepeat:true,desc:'4マナ毎：ランダムな味方が復活を得る。'},
  {id:'panel_vampire_lord',no:'033',name:'ヴァンパイアロード',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'常時：キャラクターが死亡するたび、全ての味方はHP+1を得る。'},
  {id:'panel_eidolon',no:'034',name:'エイドロン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'負傷：この戦闘中、召喚された味方はATK+2を得る。'},
  {id:'panel_death_knight',no:'035',name:'デスナイト',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:3,desc:'死亡：「青スケルトン」を召喚する。'},
  {id:'panel_revenant',no:'036',name:'レヴナント',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:4,desc:'常時：味方が死亡するたび、このキャラクターは+1/+1を得る。'},
  {id:'panel_dullahan',no:'037',name:'デュラハン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:4,life:4,desc:'常時：味方が死亡するたび、ランダムな敵に4ダメージを与える。'},
  {id:'panel_bone_chariot',no:'038',name:'ボーンチャリオット',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:5,life:5,desc:'死亡：ランダムな味方に「死亡：「青スケルトン」を召喚する。」を付与する。'},
  {id:'panel_lich',no:'039',name:'リッチ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:7,life:3,desc:'常時：味方が召喚された時、「青シャドウ」を1体召喚する。'},
  {id:'panel_grim_reaper',no:'040',name:'グリムリーパー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,race:'不死',power:1,life:5,keywords:['封印5','即死'],desc:'封印5　即死'},
  {id:'panel_dire_wolf',no:'041',name:'ダイアウルフ',rarity:1,displayRarity:'-',grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,power:3,life:3,manaCost:3,manaRepeat:true,desc:'3マナ毎：「緑ウルフ」を召喚する。'},
  {id:'panel_sleep_sheep',no:'042',name:'スリープシープ',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,power:0,life:1,desc:'死亡：血を3得る。'},
  {id:'panel_brownie',no:'061',name:'ブラウニー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,power:1,life:4,desc:'攻撃＆負傷：全ての仲間のHPが+2される。'},
  {id:'panel_elf',no:'062',name:'エルフ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,power:5,life:3,keywords:['結界1'],desc:'結界1\n負傷：結界1を得る。'},
  {id:'panel_twin_devil',no:'C087',name:'ツインデビル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:2,life:1,directionCount:2,summonCount:2,desc:'開戦：コピーを1体召喚する。'},
  {id:'panel_archdemon',no:'082',name:'アークデーモン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:25,life:20,keywords:['封印12'],desc:'封印12　解放：全ての紫のキャラクターは+1/+1を得る。このキャラクターに接続しているエンチャントの数だけ繰り返す。'},
  {id:'panel_arassas',no:'043',name:'アラッサス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'青',cost:1,slot:1,power:15,life:15,desc:'召喚：全ての敵に3ダメージを与える。'},
  {id:'panel_slin',no:'044',name:'スリン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,power:10,life:20,keywords:['毒牙3','邪眼3'],desc:'毒牙3　邪眼3'},
  {id:'panel_mitera',no:'045',name:'ミテーラ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'獣',power:2,life:4,desc:'開戦：「緑ペリカン」を2体召喚する。'},
  {id:'panel_jackalope',no:'046',name:'ジャッカロープ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'獣',power:2,life:2,desc:'開戦：Xマナを得る。Xは味方の緑キャラクターの数に等しい。'},
  {id:'panel_ymir',no:'047',name:'ユミル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'亜人',power:3,life:3,desc:'攻撃：+X/+Xを得る。Xはマナに等しい。'},
  {id:'panel_mermaid',no:'048',name:'マーメイド',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'亜人',power:3,life:4,desc:'常時：緑のキャラクターから得るマナは+1される。'},
  {id:'panel_green_wolf',name:'ウルフ',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'獣',power:3,life:3,desc:''},
  {id:'panel_green_dragon',name:'ドラゴン',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'竜',power:20,life:20,keywords:['全体攻撃'],desc:'全体攻撃'},
  {id:'panel_green_pelican',name:'ペリカン',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'獣',power:1,life:1,desc:''},
  {id:'panel_bandersnatch',no:'C053',name:'バンダースナッチ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'獣',power:5,life:5,manaCost:6,manaRepeat:false,desc:'6マナ：ランダムな敵を「緑ペリカン」に変身させる。'},
  {id:'panel_hydra',no:'C055',name:'ハイドラ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'竜',power:7,life:7,desc:'終戦：このキャラクター以外の、生存したキャラクターが報酬に出現する。'},
  {id:'panel_scylla',no:'C056',name:'スキュラ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'獣',power:4,life:8,manaCost:3,manaRepeat:true,desc:'3マナ毎：全ての敵に毒12を与える。'},
  {id:'panel_naga',no:'C057',name:'ナーガ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'緑',cost:1,slot:1,race:'竜',power:4,life:5,desc:'常時：戦闘中に召喚される味方は+1/+1を得る。戦闘中に召喚された味方の数だけ繰り返す。'},
  {id:'panel_elven_mage',no:'065',name:'エルヴンメイジ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,race:'精霊',power:2,life:4,desc:'攻撃：全ての黄キャラクターは+1/+1を得る。'},
  {id:'panel_titania',no:'C073',name:'タイタニア',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,race:'精霊',power:3,life:5,desc:'常時：味方の攻撃回数は1回追加される。'},
  {id:'panel_ketshi',no:'074',name:'ケットシー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,race:'獣',power:2,life:3,desc:'負傷：「黄ナイトキャット」を召喚する。'},
  {id:'panel_knight_cat',name:'ナイトキャット',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,race:'獣',power:1,life:2,keywords:['結界1'],desc:'結界1'},
  {id:'panel_summon_ifrit',no:'C106',name:'イフリート',rarity:-1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',cost:1,slot:1,power:99999,life:1,keywords:[],desc:''},
  {id:'panel_carbuncle',no:'C077',name:'カーバンクル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,race:'精霊',power:1,life:5,desc:'常時：味方が結界を失うたび、全ての敵に1ダメージを与える。'},
  {id:'panel_elemental',no:'C080',name:'エレメンタル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'黄',cost:1,slot:1,race:'精霊',power:5,life:5,desc:'開戦：全ての色の味方がいる場合、生命吸収を得る。'},
  {id:'panel_counterattack_oath',no:'E001',name:'逆襲',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['逆襲'],desc:'死亡：全ての味方は+1/+1を得る。'},
  {id:'panel_great_guard',no:'E002',name:'大いなる守護',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentHpBonus:7,desc:'常時：HP+7を得る。'},
  {id:'panel_inner_might',no:'E003',name:'内なる大力',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentAtkBonus:4,adjacentHpBonus:2,desc:'常時：+4/+2を得る。'},
  {id:'panel_dark_ritual',no:'E004',name:'闇の儀式',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['闇の儀式'],desc:'死亡：以後、召喚される同名のキャラクターを永久に+2/+2する。'},
  {id:'panel_persistent_flame',no:'E005',name:'執念の炎',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['根性'],desc:'根性（致死ダメージを受けた時、1度だけHP1で耐える）'},
  {id:'panel_dark_flame',no:'E006',name:'闇の炎',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['闇の炎'],desc:'死亡：全ての敵キャラクターに1ダメージを与える。'},
  {id:'panel_poison_blade',no:'E007',name:'毒の刃',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['毒牙2'],desc:'毒牙2（攻撃時にダメージを受ける毒を付与）'},
  {id:'panel_dragon_contract',no:'008',name:'竜の契約',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['竜の契約'],desc:'攻撃：ランダムな敵に5ダメージを与える。'},
  {id:'panel_imp',no:'C081',name:'インプ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:2,life:1,desc:'攻撃：全てのキャラクターからATKを1奪う。'},
  {id:'panel_gremlin',no:'C083',name:'グレムリン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:4,life:5,desc:'負傷：全ての敵はATK-1を得る。'},
  {id:'panel_incubus',name:'インキュバス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'負傷：全ての敵はATK-1を得る。'},
  {id:'panel_gargoyle',name:'ガーゴイル',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'開戦：ランダムな黄、緑、紫キャラクター1体ずつは+5/+5を得る。'},
  {id:'panel_hellhound',name:'ヘルハウンド',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'常時：敵が死んだ時、+1/+1を得る。この戦闘で死んだ敵の数だけ繰り返す。'},
  {id:'panel_dark_one',name:'ダークワン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,manaCost:1,manaRepeat:true,desc:'1マナ毎：ランダムな紫のキャラクターは+1/+1を得る。'},
  {id:'panel_familiar',name:'ファミリア',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'攻撃：血が5以上なら2マナ得る。'},
  {id:'panel_succubus',name:'サキュバス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'攻撃：このキャラクターが敵を倒した時、そのキャラクターを倒される直前の状態で召喚する。'},
  {id:'panel_hell_knight',name:'ヘルナイト',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'攻撃：このキャラクターは+X/+Xを得る。Xは血に等しい。'},
  {id:'panel_wendigo',name:'ウェンディゴ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'開戦：全ての敵は-1/-1を得る。この効果は、このキャラクターのHP10につき1回発生する。'},
  {id:'panel_void_walker',name:'ヴォイド・ウォーカー',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'常時：紫のキャラクターが与える戦闘修正の値は1大きくなる。'},
  {id:'panel_chaos_imp',name:'カオス・インプ',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'常時：味方が解放された時、ランダムな味方の開戦効果を発動する。'},
  {id:'panel_lilith',name:'リリス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'開戦：ランダムな味方に結界を付与する。この効果は、このキャラクターのATK10につき1回発生する。'},
  {id:'panel_nightmare',name:'ナイトメア',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'死亡：このキャラクターは封印Xを得て封印される。Xは現在の血の2倍に等しい。'},
  {id:'panel_behemoth',name:'ベヒーモス',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,keywords:['封印10'],desc:'封印10'},
  {id:'panel_overlord',name:'オーバーロード',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,keywords:['封印5'],desc:'封印5　解放：このキャラクターの戦闘力を2倍にする。'},
  {id:'panel_abyss_baron',name:'アビス・バロン',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,keywords:['封印4'],desc:'封印4　解放：ランダムな敵に封印∞を付与する。'},
  {id:'panel_fiend',name:'フィーンド',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,keywords:['封印2'],desc:'封印2　解放：全ての敵に1ダメージを与える。このキャラクターに接続している強化カードの数だけ繰り返す。'},
  {id:'panel_fanatic',name:'ファナティック',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'紫',cost:1,slot:1,power:1,life:1,desc:'常時：味方が解放された時、このキャラクターは+X/+Xと結界を得る。Xは血に等しい。'},
  {id:'panel_madness',no:'E009',name:'狂気',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['狂気'],desc:'死亡：青マナを得る。'},
  {id:'panel_wild_power',no:'E013',name:'野生の力',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['野生の力'],desc:'召喚：緑マナを得る。'},
  {id:'panel_magic_circuit_a',no:'E010',name:'魔導回路',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,directionCount:3,desc:'効果なし　三方向パネル'},
  {id:'panel_healing_trait',no:'E012',name:'治癒能力',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['治癒能力'],desc:'負傷：HP+2を得る。'},
  {id:'panel_legacy',name:'遺産',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'死亡：1ゴールドを得る。'},
  {id:'panel_origin_seed',name:'マナの種',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'常時：このキャラクターのマナ効果は1回追加で発動する。'},
  {id:'panel_jade_vase',no:'E040',name:'翡翠の壺',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,directionCount:0,sellPrice:200,keywords:['荷物'],desc:'荷物\n高く売れそうだ。（200Gで売れる。）'},
  {id:'panel_golden_vase',no:'E041',name:'黄金の壺',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,directionCount:0,sellPrice:400,keywords:['荷物'],desc:'荷物\n高く売れそうだ。（400Gで売れる。）'},
  {id:'panel_magic_mirror',name:'魔鏡',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,directionCount:0,keywords:['荷物'],desc:'荷物\n荷物以外の全てのカードの3枚目として合体できる。'},
  {id:'panel_grace',name:'恩寵',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['恩寵'],desc:'常時：このキャラクターの開戦効果は1回追加で発動する。'},
  {id:'panel_copy',name:'複製',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'常時：接続している強化カードに変化する。'},
  {id:'panel_alchemy',name:'錬成',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'開戦：ランダムなアイテムを得る。'},
  {id:'panel_mana_generate',name:'マナ生成',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,manaOnAttack:1,desc:'攻撃：1マナを得る。'},
  {id:'panel_rage',name:'逆上',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['逆上'],desc:'負傷：ランダムな敵に3ダメージを与える。'},
  {id:'panel_sword_skill',name:'剣技',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['剣技'],desc:'攻撃：ATK+3を得る。'},
  {id:'panel_ferocious',name:'獰猛',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentAtkBonus:12,adjacentHpBonus:-3,desc:'常時：+12/-3を得る。'},
  {id:'panel_grudge',name:'怨念',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['怨念'],desc:'死亡：ランダムな敵に自身の攻撃力に等しいダメージを与える。'},
  {id:'panel_necromancy',name:'屍術',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'常時：キャラクターが死亡するたび、+1/+1を得る。'},
  {id:'panel_sacrifice',name:'生贄',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['生贄'],desc:'生贄'},
  // 以下は「強化」シートにキーワード欄のみで登録されている単純なキーワード付与パネル。
  // PANEL_POOLに未登録だとシート同期の対象外（=常に取得不可）になるため、ここにスタブを追加する。
  {id:'panel_double_attack',no:'014',name:'二段攻撃',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['二段攻撃']},
  {id:'panel_triple_attack',no:'015',name:'三段攻撃',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['三段攻撃']},
  {id:'panel_instant_death',no:'016',name:'即死',rarity:5,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['即死']},
  {id:'panel_triway_attack',no:'017',name:'三方向攻撃',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['三方向攻撃']},
  {id:'panel_evil_eye',no:'018',name:'邪眼',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['邪眼5']},
  {id:'panel_weaken',no:'019',name:'衝撃',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['衝撃5']},
  {id:'panel_first_strike',no:'020',name:'先制',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['先制']},
  {id:'panel_shield',no:'021',name:'結界',rarity:2,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['結界']},
  {id:'panel_aoe_attack',no:'022',name:'全体攻撃',rarity:5,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['全体攻撃']},
  {id:'panel_lifesteal',no:'023',name:'生命吸収',rarity:3,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['生命吸収']},
  {id:'panel_pierce',name:'貫通',rarity:4,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['貫通']},
  {id:'panel_bond',name:'奇妙な絆',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['奇妙な絆'],desc:'開戦：このキャラクターは+X/+Xを得る。Xはこの効果を持つ味方の数に等しい。'},
  {id:'panel_penitence',name:'懺悔',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,adjacentKeywords:['懺悔'],desc:'攻撃：このキャラクターは1ダメージを2回受ける。'},
  {id:'panel_activation',name:'活性化',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'1マナ毎：このキャラクターは+1/+1を得る。'},
  {id:'panel_inheritance',name:'継承',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'死亡：このキャラクターのATKをランダムな味方に与える。'},
  {id:'panel_roar',name:'咆哮',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'開戦：このキャラクターのATKを2倍にする。'},
  {id:'panel_awe',name:'威光',rarity:1,grade:1,type:'panel',kind:'panel',panelScope:'unit',category:'エンチャント',cost:1,slot:1,desc:'開戦：このキャラクターのHPを2倍にする。'},
];

const ITEM_POOL=[
  {id:'item_silence_scroll',no:'001',name:'静寂の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'silence_scroll',art:'assets/art/item/I001.jpg',desc:'次の戦闘中、全ての敵は一度攻撃するまで全ての効果が無効化される。'},
  {id:'item_bond_scroll',no:'002',name:'絆の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'bond_scroll',art:'assets/art/item/I002.jpg',desc:'同名のキャラクター2枚を選んで合体する。'},
  {id:'item_shield_scroll',no:'003',name:'盾の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'shield_scroll',art:'assets/art/item/I003.jpg',desc:'対象のキャラクターに結界1を永久付与する。'},
  {id:'item_underworld_scroll',no:'004',name:'幻視の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'vision_scroll',art:'assets/art/item/I004.jpg',desc:'対象のキャラクターに復活を永久付与する。'},
  {id:'item_giant_scroll',no:'005',name:'巨大化の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'giant_scroll',art:'assets/art/item/I005.jpg',desc:'対象のキャラクターに+5/+5を永久付与する。'},
  {id:'item_meteor_scroll',no:'006',name:'隕石の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'meteor_scroll',art:'assets/art/item/I006.jpg',desc:'次の戦闘開始時、隕石を落とす。全ての敵にHPの半分のダメージを与える。重複不可。'},
  {id:'item_sacrifice_doll',no:'007',name:'生贄人形',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'sacrifice_doll',art:'assets/art/item/I007.jpg',desc:'キャラクターを1枚破壊し、別のキャラクターが持つ封印の値を永久に1減らす。'},
  {id:'item_weakening_scroll',no:'008',name:'衰弱の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'weakening_scroll',art:'assets/art/item/I008.jpg',desc:'キャラクターを1枚破壊し、ランダムな召喚の力マスを永劫の力マスに変化させる。'},
  {id:'item_portal_scroll',no:'009',name:'ポータルの巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'portal_scroll',art:'assets/art/item/I009.jpg',desc:'直前の村にワープする。再出発時は現在位置の次の場所に移動する。'},
  {id:'item_golden_scroll',no:'010',name:'黄金の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'golden_scroll',art:'assets/art/item/I010.jpg',desc:'所持金を2倍にする。'},
  {id:'item_mana_scroll',no:'011',name:'魔力の巻物',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'mana_scroll',art:'assets/art/item/I011.jpg',desc:'対象のキャラクターが持つマナ効果の値を永久に1減らす。（但し、最低値は1）'},
  {id:'item_inspire_flag',no:'012',name:'鼓舞の旗',rarity:1,type:'consumable',kind:'item',category:'アイテム',itemEffectKey:'inspire_flag',art:'assets/art/item/I012.jpg',desc:'対象のキャラクターに根性を永久付与する。'},
];

function makeItem(idOrName){
  const def=ITEM_POOL.find(p=>p.id===idOrName||p.name===idOrName);
  if(!def||!def.name||def._implemented===false||String(def.name).trim().toLowerCase()==='false') return null;
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
  if(String(c.category||'')==='キャラクター') c.directions=_rollPanelDirections(c.directionCount||2,{avoidOpposite:true});
  if(['強化','エンチャント'].includes(String(c.category||''))){
    const directionCount=c.directionCount==null?2:Math.max(0,Number(c.directionCount)||0);
    c.directions=directionCount>0?_rollPanelDirections(directionCount):[];
  }
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

const _REWARD_RARITY_WEIGHTS={1:54,2:22,3:14,4:8,5:2};
const _NON_BATTLE_REWARD_RARITY_WEIGHTS={1:50,2:25,3:15,4:7,5:3};
const _GOLDEN_RING_REWARD_RARITY_WEIGHTS={1:30,2:33,3:21,4:11,5:5};

function _currentRewardMapNumber(){
  const mapNo=Number(G&&G._wave);
  return Math.max(1,Math.min(5,mapNo||1));
}

function _rewardRarityWeights(useGoldenRing,useMapProgress){
  if(!useMapProgress) return _NON_BATTLE_REWARD_RARITY_WEIGHTS;
  if(useGoldenRing&&typeof _hasRingNamed==='function'&&_hasRingNamed('黄金の指輪')){
    return _GOLDEN_RING_REWARD_RARITY_WEIGHTS;
  }
  if(useMapProgress){
    const mapOffset=Math.max(0,_currentRewardMapNumber()-1);
    return {
      1:Math.max(0,_REWARD_RARITY_WEIGHTS[1]-6*mapOffset),
      2:_REWARD_RARITY_WEIGHTS[2]+2*mapOffset,
      3:_REWARD_RARITY_WEIGHTS[3]+2*mapOffset,
      4:_REWARD_RARITY_WEIGHTS[4]+mapOffset,
      5:_REWARD_RARITY_WEIGHTS[5]+mapOffset,
    };
  }
  return _REWARD_RARITY_WEIGHTS;
}

// 「現在のマップ」＝グレード抽選の基準。ワールドマップ時代は worldMap.index、
// **ウェーブ進行ではステージ（G._wave）**。レアリティ側（_currentRewardMapNumber）と
// 同じ値を見ること。ここが1に固定されていた頃は、どこまで進んでも
// 「グレード1以下」が基準のままだった。
function _currentRewardMapGrade(fallback){
  const mapNo=Number(G&&G.worldMap&&G.worldMap.index)||Number(G&&G._wave)||0;
  const base=Number.isFinite(mapNo)&&mapNo>0?mapNo:Number(fallback||G&&G.rewardGrade||1);
  return Math.max(1,Math.min(5,base||1));
}

// ── 提示カードのグレード抽選（シート「戦闘報酬カード出現率計算式」）───────────
// 現在のマップ以下：70％／マップより1高い：15％／2高い：10％／3高い：5％。
// **報酬に出るグレードは4まで。上限を超える枠は「以下」の枠へ足す。**
// （ステージ2なら「+3＝グレード5」が無いのでその5％が下へ回り、
//   グレード2以下75％／3が15％／4が10％になる。ステージ4以降は100％が「以下」）
// 候補が尽きた枠も同じように「以下」へ寄せる（提示が空になるのを防ぐ）。
const REWARD_GRADE_WEIGHTS=[70,15,10,5];   // [現在のマップ以下, +1, +2, +3]
const REWARD_MAX_GRADE=4;

// 候補を「現在のマップとのグレード差」ごとに分ける。
// 差が0以下は先頭（以下）、+3を超えるものは末尾の枠へ入れる（取りこぼさないため）。
function _rewardGradeBuckets(available,cur){
  const buckets=REWARD_GRADE_WEIGHTS.map(()=>[]);
  (available||[]).forEach(p=>{
    const d=(Math.max(1,Number(p&&p.grade)||1))-cur;
    buckets[Math.max(0,Math.min(buckets.length-1,d))].push(p);
  });
  return buckets;
}

// 上の重みでグレードの枠を1つ選び、その枠の候補配列を返す。
function _pickRewardGradePool(available,cur){
  const buckets=_rewardGradeBuckets(available,cur);
  const weights=REWARD_GRADE_WEIGHTS.slice();
  for(let k=1;k<weights.length;k++){
    if(cur+k>REWARD_MAX_GRADE||!buckets[k].length){ weights[0]+=weights[k]; weights[k]=0; }
  }
  if(!buckets[0].length){
    // 「以下」に候補が無い時だけ、残っている上の枠を元の比率で引き直す。
    weights[0]=0;
    for(let k=1;k<weights.length;k++) if(buckets[k].length) weights[k]=REWARD_GRADE_WEIGHTS[k];
  }
  const total=weights.reduce((a,b)=>a+b,0);
  if(!total) return [];
  let r=rand()*total;
  for(let k=0;k<weights.length;k++){
    r-=weights[k];
    if(r<0&&buckets[k].length) return buckets[k];
  }
  return buckets.find(b=>b.length)||[];
}

function _rewardWeightedPick(defs,currentGrade,usedIds,useGoldenRing,useMapProgress){
  const available=(defs||[]).filter(p=>p&&(!usedIds||!usedIds.has(p.id)));
  if(!available.length) return null;
  const cur=Math.max(1,Math.min(5,Number(currentGrade)||1));
  const gradePool=_pickRewardGradePool(available,cur);
  if(!gradePool.length) return null;
  const weighted=[];
  gradePool.forEach(p=>{
    const rarity=Math.max(1,Math.min(5,Number(p.rarity)||1));
    const w=_rewardRarityWeights(useGoldenRing,useMapProgress)[rarity]||1;
    for(let i=0;i<w;i++) weighted.push(p);
  });
  return weighted.length?randFrom(weighted):randFrom(gradePool);
}

// 封印カードは1回の提示に1枚まで。**封印を持つキャラクターと「封印されしもの」を
// 合わせて数える。** 2枚以上出ても解放に必要な血が足りず、どちらも使えないため。
// 判定はキーワード（自身の封印／接続先へ付ける封印）で行い、カード名では判定しない。
function _isSealPanel(panel){
  const has=list=>(Array.isArray(list)?list:[]).some(k=>/^封印\s*\d*$/.test(String(k||'').trim()));
  return !!panel&&(has(panel.keywords)||has(panel.adjacentKeywords));
}

function drawPanel(n=1, maxGrade){
  ensurePanelSaleStock();
  const currentGrade=_currentRewardMapGrade(maxGrade);
  const excluded=p=>G._isShop?p._shopExcluded:p._rewardExcluded;
  const panelCandidates=PANEL_POOL.filter(p=>p&&p.id&&_isImplementedPoolCard(p)&&!excluded(p)&&p.rarity!==-1&&panelSaleStockCount(p)>0);
  const charCandidates=panelCandidates.filter(p=>String(p.category||'')==='キャラクター');
  const enchantCandidates=panelCandidates.filter(p=>['エンチャント','強化'].includes(String(p.category||'')));
  const allPool=[...panelCandidates];
  const res=[];
  const usedIds=new Set();
  // 既に封印カードを1枚出したか。出したら以後は候補から外す。
  let sealPicked=false;
  const takeable=list=>list.filter(p=>!usedIds.has(p.id)&&!(sealPicked&&_isSealPanel(p)));
  let t=0;
  while(res.length<n&&allPool.length>0&&t++<300){
    // 出現率：キャラクター45%・強化45%・スペル10%（グレード等の絞り込みは各候補配列側で反映済み）
    const r=rand();
    let pool=r<0.5?charCandidates:enchantCandidates;
    let available=takeable(pool);
    if(!available.length){
      // 選んだカテゴリの在庫が尽きている場合は、全体プールから補う
      available=takeable(allPool);
    }
    if(!available.length) break;
    const picked=_rewardWeightedPick(available,currentGrade,usedIds,true,true);
    if(!picked) break;
    if(_isSealPanel(picked)) sealPicked=true;
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
    if(!p||!p.id||!_isImplementedPoolCard(p)||(p._rewardExcluded&&p._shopExcluded)||p.rarity===-1) return;
    G.panelSaleStock[panelSaleStockKey(p)]=Math.max(0,9-(p.grade||1));
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


// 通常廃棄は指定がない限りゴールドを増やさない。ショップ売却はreward/map側の販売価格表を使う。
function cardRefund(card){
  return 0; // 指輪・杖・消耗品はすべてゴールド還元なし
}

// ── アイテムプールから N 個抽選 ─────────────────

function drawItems(n, maxGrade){
  const currentGrade=_currentRewardMapGrade(maxGrade);
  const excluded=G._isShop?p=>p._shopExcluded===true:p=>p._rewardExcluded===true;
  const pool=(ITEM_POOL||[]).filter(p=>p&&p.id&&p.name&&String(p.name).trim().toLowerCase()!=='false'&&p._implemented!==false&&!excluded(p));
  const res=[];
  const used=new Set();
  let t=0;
  while(res.length<n&&pool.length&&t++<100){
    const cand=_rewardWeightedPick(pool,currentGrade,used);
    if(!cand) break;
    used.add(cand.id);
    const item=makeItem(cand.id);
    if(item&&item.name&&String(item.name).trim().toLowerCase()!=='false') res.push(item);
  }
  return res;
}

function drawRewards(n){
  if(n!=null){
    // 宝箱：現在の階層セクショングレード以下のアイテムのみ
    const fd=FLOOR_DATA[G.floor];
    const maxGrade=fd?(fd.sectionGrade||Math.min(4,Math.ceil(fd.grade))||1):1;
    return drawItems(n, maxGrade);
  }
  const baseGrade=G.rewardGrade||1;
  const res=drawPanel(5, baseGrade);
  const maxGrade=_currentRewardMapGrade(baseGrade);
  const pickGuaranteedPanel=(pred, used)=>{
    ensurePanelSaleStock();
    const excluded= p=>G._isShop?p._shopExcluded:p._rewardExcluded;
    // 確定枠でも封印カードは1枚まで（既に出ていれば候補から外す）。
    const hasSeal=res.some(_isSealPanel);
    const candidates=PANEL_POOL.filter(p=>p&&p.id&&_isImplementedPoolCard(p)&&!excluded(p)&&p.rarity!==-1&&panelSaleStockCount(p)>0&&!used.has(p.id)&&!(hasSeal&&_isSealPanel(p))&&pred(p));
    if(!candidates.length) return null;
    const picked=_rewardWeightedPick(candidates,maxGrade,used,true,true);
    if(!picked) return null;
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
  if(Array.isArray(G._bonusRewardPanels)&&G._bonusRewardPanels.length){
    const bonus=G._bonusRewardPanels.splice(0);
    const visibleBonus=bonus.filter(Boolean);
    if(visibleBonus.length) res.splice(0,visibleBonus.length,...visibleBonus);
  }
  // **同じ提示の中で矢印の向きが完全に同じカードを重ねない。**
  // 規則は _dedupePanelDirections() が唯一の実装。魔導店は drawRewards() を通らないため
  // `_ensureWaveShopStock()`（map.js）が同じ関数を自分で呼ぶ。新しい提示口を足したら同様に呼ぶこと。
  _dedupePanelDirections(res);
  return res;
}
