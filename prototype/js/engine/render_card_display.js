// render_card_display.js — キャラクターの説明・キーワード・召喚注釈とカード要素の描画
// 2026-10-25 リファクタリング：render.js から移した（処理は変えていない）。

// キーワードバッジで表示済みの文字列をdesc先頭から除去
function _stripKeywordsFromDesc(desc, unit){
  if(!desc) return desc;
  const patterns=[
    ...(unit.keywords||[]),
    '2回攻撃','トリプル','3段攻撃','2段攻撃',
  ];
  let result=desc;
  let changed=true;
  while(changed){
    changed=false;
    for(const kw of patterns){
      // 数字部分は桁数の異なる値にも一致するよう\d+化してマッチ
      const esc=kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\d+/g,'\\d+');
      const re=new RegExp('^'+esc+'[\\s\u3000。、]*');
      const next=result.replace(re,'').trimStart();
      if(next!==result){ result=next; changed=true; break; }
    }
  }
  return result.trim();
}

function _stripBattleParentheticalText(text){
  if(!text) return text;
  return String(text)
    .replace(/（[^）]*）/g,'')
    .replace(/[ \t]*\n[ \t]*/g,'\n')
    .replace(/\n{2,}/g,'\n')
    .trim();
}

function _stripOwnNameFromEffectText(text, name){
  let out=String(text||'').trim();
  const n=String(name||'').trim();
  if(!out||!n) return out;
  const esc=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(let i=0;i<4;i++){
    const next=out.replace(new RegExp(`(?:[\\s　、,，。:：\\-]|<br\\s*/?>)*(?:「|『|【)?${esc}(?:」|』|】)?(?:[\\s　、,，。:：\\-]|<br\\s*/?>)*$`,'i'),'').trim();
    if(next===out) break;
    out=next;
  }
  return out;
}

const _ENCHANT_KEYWORD_ONLY=new Set(['毒','毒牙','邪眼','衝撃','熟練','復活','根性','二段攻撃','三段攻撃','三方向攻撃','全体攻撃','即死','先制','防戦','帰滅','隠密','貫通','結界','生命吸収','封印']);
// 強化・エンチャントカードの「キーワード：〜」欄に出す語の唯一の実装。
// 魔導板・報酬画面・コレクションはすべてこれを呼ぶ（同じカードが画面ごとに違う欄を出さないため）。
// 出すのはシート「キーワード」列（adjacentKeywords）。
// **効果文に出てくる語は拾わない。** 「衝撃波（攻撃：全ての敵に弱体1を与える）」の弱体1や、
// 「栄光の歌」の結界1は相手や味方に与えるものであって、そのカードのキーワードではない。
// カード名と同じ語は、単純キーワード付与パネル（_ENCHANT_KEYWORD_ONLY）と
// 数値付きの結界／封印／毒／邪眼／衝撃だけ残す（「狂気」等の自己参照マーカーは落とす）。
function _enchantPreviewKeywords(card){
  if(!card) return [];
  const internal=typeof _INTERNAL_ONLY_ENCHANT_NAMES!=='undefined'?_INTERNAL_ONLY_ENCHANT_NAMES:new Set();
  const ownName=String(card.name||'').trim();
  return [...new Set([
    ...(card.adjacentKeywords||[]),
  ].map(k=>coreShieldValueFromKeyword(k)?'結界':String(k||'').trim()).filter(Boolean))].filter(k=>{
    if(internal.has(k)) return false;
    // 2026-10-12: 古いE052の自己参照名は残さず、数値付きの熟練Nだけを表示する。
    if(k==='熟練') return false;
    if(k!==ownName) return true;
    return _ENCHANT_KEYWORD_ONLY.has(k)||/^結界\d+$/.test(k)||/^封印\d+$/.test(k)
      ||/^毒牙?\d*$/.test(k)||/^邪眼\d*$/.test(k)||/^衝撃\d*$/.test(k)||/^熟練\d+$/.test(k);
  });
}
function _enchantKeywordDesc(k){
  const s=String(k||'').trim();
  if(!s) return '';
  // 2026-10-12: キーワード「熟練N」の説明は、同名エンチャントE052の本文と区別する。
  if (/^熟練(?:\d+|X)$/.test(s)) return (typeof KW_DESC_MAP!=='undefined'&&KW_DESC_MAP['熟練'])||'';
  // **強化カード名のキーワードは、その強化カードの本文（シート）を使う。**
  // 攻防一体・熟練・大盾などはカードそのものなので、説明はシートの「効果」列が正。
  // コード側へ文章を書き写さないこと（書き写すとシートを直しても反映されない）。
  if(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)){
    const panel=PANEL_POOL.find(p=>p&&String(p.category||'')==='エンチャント'
      &&String(p.name||'').trim()===s&&String(p.desc||'').trim());
    if(panel) return String(panel.desc).trim();
  }
  if(/^加護\d*$/.test(s)){
    const value=Math.max(1,parseInt(s.replace('加護',''),10)||1);
    return `このキャラクターは敵から与えられる状態異常を${value}回無効化する。`;
  }
  if(_ENCHANT_KEYWORD_ONLY.has(s)) return s;
  if(/^結界\d*$/.test(s)) return '結界';
  if(/^封印\d+$/.test(s)) return s;
  if(s==='生贄') return '効果なし';
  if(/^毒牙\d+$/.test(s)){
    const v=s.replace('毒牙','');
    return `キャラクターにダメージを与えた時、そのキャラクターに毒${v}を与える。`;
  }
  if(/^毒\d+$/.test(s)){
    const v=s.replace('毒','');
    return `キャラクターにダメージを与えた時、そのキャラクターに毒${v}を与える。`;
  }
  if(s==='生命吸収') return 'このキャラクターが与えたダメージ分、HPを増加する。';
  if(/^邪眼\d+$/.test(s)) return s;
  if(/^衝撃(\d+)$/.test(s)) return `攻撃/ダメージ効果で対象に弱体${s.replace('衝撃','')}を付与する。`;
  // キーワードシートにない強化カード名や内部判定名は、キーワードとして表示しない。
  return '';
}
function _enchantEffectTextForPanel(p,owner){
  if(!p) return '';
  p=runLevelDisplayCard(p,owner);
  if(p.boon&&String(p.desc||'').trim()) return _plainEffectTextForPreview(p,owner)||'';
  if(corePermanentDamageSpec(p.desc)) return _plainEffectTextForPreview(p,owner)||'';
  if(p.name==='封印されしもの'){
    return _stripOwnNameFromEffectText(p.desc||p.effectText||p.effect||'','封印されしもの')
      .replace(/^封印\d+\s*/,'').trim();
  }
  // 自分自身の名前を自己参照キーワードとして持つ場合（狂気・闇の炎等）は、
  // _enchantKeywordDesc()の汎用（かつシート更新に追従しない恐れのある）ハードコード文言ではなく、
  // シート上の本文（authoritative）をそのまま使う
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.includes(p.name)&&(p.desc||p.effectText||p.effect)){
    return _stripOwnNameFromEffectText(p.desc||p.effectText||p.effect,p.name);
  }
  // 刻印6種は「刻印」を付与しつつ、それとは別に固有の効果文を持つ。
  // キーワード説明だけへ畳むと、接続先キャラクターのプレビューから固有効果が消える。
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.includes('刻印')
    &&_STAGE_ENGRAVING_NAMES.has(String(p.name||'').trim())){
    return _plainEffectTextForPreview(p,owner)||'';
  }
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.length){
    // 付与するキーワードが全て単純キーワード（_ENCHANT_KEYWORD_ONLY）の場合は、
    // 既にキャラクター側の太字キーワード欄に表示されるため、効果文としては重複表示しない
    if(p.adjacentKeywords.every(k=>_ENCHANT_KEYWORD_ONLY.has(String(k||'').trim()))) return '';
    return p.adjacentKeywords.map(_enchantKeywordDesc).filter(Boolean).join('\n');
  }
  return _plainEffectTextForPreview(p,owner)||'';
}
// unitに現在効果を及ぼしている強化(エンチャント)パネルの一覧と、その全文効果テキストを返す（カード名は含めない）
// slotIdx：効果を受ける側のスロット番号（キャラクター本体は0、他の枠に召喚キャラクターパネルが
// 置かれている場合はそのパネル自身の番号を渡すことで、その位置に隣接する強化パネルを判定できる）
function _enchantmentEffectsList(unit,slotIdx){
  if(!unit) return [];
  slotIdx=slotIdx||0;
  const eq=Array.isArray(unit.boardCards)?unit.boardCards:[];
  const panels=typeof _collectEnhancementPanelsForSlot==='function'
    ?_collectEnhancementPanelsForSlot(unit,slotIdx)
    :eq.map((panel,idx)=>({panel,idx}));
  const results=[];
  panels.forEach(({panel:p,idx})=>{
    if(!p||idx===slotIdx||!(String(p.category||'')==='強化'||String(p.category||'')==='エンチャント')) return;
    if(typeof _collectEnhancementPanelsForSlot!=='function'){
      if(typeof _isAdjacentPanelSlot==='function'&&!_isAdjacentPanelSlot(slotIdx,idx)) return;
      const dir=typeof _directionFromPanelToSlot==='function'?_directionFromPanelToSlot(idx,slotIdx):'';
      if(typeof _panelAllowsDirection==='function'&&!_panelAllowsDirection(p,dir)) return;
    }
    const rawKws=(p.adjacentKeywords||[]).map(k=>String(k||'').trim()).filter(Boolean);
    const baseKws=rawKws.map(k=>k.replace(/\d+.*/,'').trim());
    let text;
    if(p.name==='封印されしもの'){
      // 封印1はキーワード欄に残しつつ、接続先には解放効果も表示する。
      text=_enchantEffectTextForPanel(p,unit);
    } else if(rawKws.length&&baseKws.every(k=>_ENCHANT_KEYWORD_ONLY.has(k))){
      // 単純キーワード（生命吸収・二段攻撃・毒牙2等、数値の有無を問わない）は、キャラクター側の
      // 太字キーワード欄に既に表示されるため、効果文としては重複表示しない
      text='';
    } else {
      text=_enchantEffectTextForPanel(p,unit);
    }
    // 「効果なし」の強化パネル（方向接続専用パネル等）はキャラクター側に何も表示しない
    if(text&&/効果なし/.test(text)) text='';
    // ここでアイコン化すると、data-preview経由でホバー表示する際に_formatPreviewHtmlの
    // タグ除去処理に巻き込まれて色情報が消えるため、生テキストのまま格納する
    // （アイコン化は各利用箇所の描画直前で行う）
    if(text) results.push({panel:p,idx,text});
  });
  return results;
}
// 接続中の強化カード効果を「通常表示分」と「キャラクター用説明文（同名複数接続は×N・数値N倍）」に分けて
// プレーンテキストの行配列として返す。HTML表示（_unitCombinedDescHtml）とツールチップ表示
// （_unitPreviewText）の両方から共通して使う。
function _groupedEnchantEffectTexts(unit,slotIdx){
  const list=_enchantmentEffectsList(unit,slotIdx);
  const isKeywordCount=e=>/キーワードの数の\d+倍に等しい/.test(String(e.panel&&e.panel.desc||''));
  const strategyPanels=list.filter(isKeywordCount);
  const normal=list.filter(e=>(!(e.panel&&e.panel.characterDesc)||corePermanentDamageSpec(e.panel.desc))&&!isKeywordCount(e));
  const normalMap=new Map();
  normal.forEach(e=>{
    // 以前の「マナの種」は“キャラクター自身の効果を複製する”仕様で、説明文もキャラの効果文へ
    // 差し替えていた。現行仕様は「このキャラクターのマナ効果は1回追加で発動する。」なので、
    // カード自身の説明文をそのまま出す（差し替えるとキャラの効果が二重表示になる）。
    const text=e.text;
    const identity=`${e.panel&&e.panel._tripleMerged?'merged':'base'}::${e.panel&&e.panel.name||''}::${text}`;
    if(!normalMap.has(identity)) normalMap.set(identity,{text,count:0});
    normalMap.get(identity).count++;
  });
  const charDescMap=new Map();
  list.filter(e=>e.panel&&e.panel.characterDesc&&!isKeywordCount(e)).forEach(e=>{
    let text=_stageEngravingDescription(e.panel,e.panel.characterDesc);
    const stats=String(e.panel.desc||'').match(/常時[：:]このキャラクターは([+-]\d+)\/([+-]\d+)を得る/);
    if(stats) text=text.replace(/[+-]X\/[+-]X/g,`${stats[1]}/${stats[2]}`);
    const key=`${e.panel._tripleMerged?'merged':'base'}::${e.panel.name}::${text}`;
    if(!charDescMap.has(key)) charDescMap.set(key,{name:_cardUiName(e.panel),text,count:0});
    charDescMap.get(key).count++;
  });
  const normalTexts=[...normalMap.values()].map(g=>g.count>1?`${g.text}（×${g.count}）`:g.text);
  // 「キャラクター用説明文」列には既に「カード名」が本文の一部として書かれているため、
  // ここで別途ラベルを前置すると「カード名」が二重表示されてしまう。
  // 2枚以上接続時の（×N）は、本文中の既存の「カード名」表記の直後に挿入する。
  const charTexts=[...charDescMap.values()].map(g=>{
    if(g.count<=1) return g.text;
    return `${g.text}（×${g.count}）`;
  });
  if(strategyPanels.length){
    // **数え方は battle.js の _collectAdjacentEnhancements() だけが持つ。** ここで数え直さないこと
    // （以前は別の数え方をしていて、説明は+4/+4なのに実際は+2/+2だった）。
    const enh=typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(unit,slotIdx):null;
    const amount=Number(enh&&enh.strategyBonus)||0;
    const template=String(strategyPanels.find(e=>String(e.panel&&e.panel.characterDesc||'').trim())?.panel.characterDesc||'').trim();
    if(amount>0&&template) charTexts.unshift(template.replace(/\+\d+\s*\/\s*\+\d+/,`+${amount}/+${amount}`));
  }
  return {normalTexts,charTexts};
}
// 指輪シートの「キャラクター用説明文」は、装備中の指輪が味方キャラクターへ
// 常時付与する説明として、キャラクター効果の末尾に表示する。
function _currentRainbowRingBonusForUnit(unit){
  const applied=Number(unit&&unit._rainbowRingBonus);
  if(Number.isFinite(applied)&&applied>0) return applied;
  let allies=[];
  const battleAllies=Array.isArray(G?.allies)?G.allies:[];
  if(battleAllies.includes(unit)){
    allies=battleAllies;
  }else if(unit&&unit._ownedBoardPreview===true){
    // 編成中は「盤面にある全カード」ではなく、実際に出撃するユニットを数える。
    // buildBoardFormation は戦闘と同じ出撃判定を使う。persistEternal:false で盤面は書き換えない。
    try{
      const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
      const formation=board&&typeof buildBoardFormation==='function'
        ?buildBoardFormation(board,{persistEternal:false}):null;
      const entries=(formation&&formation.entries)||[];
      allies=entries.filter(entry=>G._onlineMode||entry.assignedSlot>=0).map(entry=>entry&&entry.unit).filter(Boolean);
      // コアの開戦処理と同じく、強化でHP0になった体も瞳の対象・色数へ含める。
      // 戦闘入力や元のユニットを変えず、色数を数える表示用の写しだけを作る。
      if(!G._onlineMode) allies=allies.map(u=>u._deployedAtZeroHp&&u.hp<=0?{...u,hp:1}:u);
    }catch(_e){ allies=[]; }
  }
  if(typeof coreRainbowRingBonusForUnits==='function') return coreRainbowRingBonusForUnits(allies);
  const colors=new Set(allies.filter(u=>u&&u.hp>0&&!u._sealed)
    .map(u=>String(u.color||'')).filter(Boolean));
  return Math.min(5,colors.size)*3;
}
function _ringCharacterDescriptionsForUnit(unit){
  if(!unit||!Array.isArray(G?.rings)) return [];
  // 敵キャラクターへプレイヤーの指輪説明を付けない。
  if(Array.isArray(G.enemies)&&G.enemies.includes(unit)) return [];
  // 戦闘中の味方、または所有中の魔導板カードだけを対象にする。
  // 販売・報酬・デバッグカードには装備中の指輪説明を付けない。
  const ownedBattleUnit=G.phase!=='reward'&&Array.isArray(G.allies)&&G.allies.includes(unit);
  if(!ownedBattleUnit&&unit._ownedBoardPreview!==true) return [];
  const rings=typeof _effectiveRings==='function'?_effectiveRings():G.rings;
  const eyeColors={'赤い瞳の指輪':'赤','青い瞳の指輪':'青','緑の瞳の指輪':'緑','黄の瞳の指輪':'黄','紫の瞳の指輪':'紫'};
  const colorMap={red:'赤',blue:'青',green:'緑',yellow:'黄',brown:'黄',purple:'紫',茶:'黄'};
  const rawColor=String(unit.color||'').trim().toLowerCase();
  const unitColor=colorMap[rawColor]||String(unit.color||'').trim();
  return (rings||[])
    .filter(r=>!eyeColors[r&&r.name]||eyeColors[r.name]===unitColor)
    .map(r=>{
      let text=String(r&&r.characterDesc||'').trim();
      if(r&&r.name==='虹の瞳の指輪'&&text){
        const x=_currentRainbowRingBonusForUnit(unit);
        text=text.replace(/\+X\/\+X/g,`+${x}/+${x}`);
      }
      return text;
    }).filter(Boolean);
}
// キャラクターカードの説明欄HTML：本来の効果の下に線を引き、その下に強化カードが与えている効果の全文を並べる
function _unitCombinedDescHtml(unit,baseDesc,slotIdx){
  const mapText=unit&&unit._mapPanelPowerText||'';
  const adjustMapText=value=>typeof coreMapPanelPowerAdjustManaText==='function'
    ?coreMapPanelPowerAdjustManaText(value,mapText):String(value||'');
  const {normalTexts:rawNormalTexts,charTexts:rawCharTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const normalTexts=rawNormalTexts.map(adjustMapText);
  const charTexts=rawCharTexts.map(adjustMapText);
  const ringCharTexts=_ringCharacterDescriptionsForUnit(unit);
  const battleNormalTexts=normalTexts.map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  const battleCharTexts=[...charTexts,...ringCharTexts].map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  const shownBaseDesc=adjustMapText(baseDesc);
  const kws=typeof _unitDisplayKeywords==='function'?_unitDisplayKeywords(unit,shownBaseDesc,slotIdx):[];
  const kwHtml=kws.length?`<div class="slot-desc-keywords"><strong>${kws.map(k=>typeof _escapePreviewHtml==='function'?_escapePreviewHtml(k):k).join(' / ')}</strong></div>`:'';
  const baseSafe=shownBaseDesc&&(typeof _escapePreviewHtml==='function'?_escapePreviewHtml(shownBaseDesc):shownBaseDesc);
  const baseDecorated=baseSafe?(_boldKeywordsInHtml(baseSafe)):'';
  const baseHtml=baseDecorated?`<div class="slot-desc-base">${typeof _injectManaIcons==='function'?_injectManaIcons(baseDecorated):baseDecorated}</div>`:'';
  const toLineHtml=line=>{
    const safe=typeof _escapePreviewHtml==='function'?_escapePreviewHtml(line):line;
    const decorated=_boldKeywordsInHtml(safe);
    return `<div class="slot-desc-enchant-line">${typeof _injectManaIcons==='function'?_injectManaIcons(decorated):decorated}</div>`;
  };
  // 2026-10-25：マナ効果・起動効果の説明はキーワード説明の欄にだけ出す（本文へは重ねない。利用者指定）。
  const pseudoHtml='';
  if(!battleNormalTexts.length&&!battleCharTexts.length) return (kwHtml||pseudoHtml||baseHtml)
    ?`<div class="slot-desc">${kwHtml}${baseHtml}${pseudoHtml?`<div class="slot-desc-enchant">${pseudoHtml}</div>`:''}</div>`:'';
  const effectsHtml=battleNormalTexts.map(toLineHtml).join('');
  const charHtml=battleCharTexts.map(toLineHtml).join('');
  return `<div class="slot-desc">${kwHtml}${baseHtml}${pseudoHtml?`<div class="slot-desc-enchant">${pseudoHtml}</div>`:''}${effectsHtml?`<div class="slot-desc-sep"></div><div class="slot-desc-enchant">${effectsHtml}</div>`:''}${charHtml?`<div class="slot-desc-sep"></div><div class="slot-desc-enchant">${charHtml}</div>`:''}</div>`;
}
// キャラクターカードにホバーした時、効果を及ぼしている強化カード（装備欄側の表示）を青く発光させる
// slotIdx：ホバーしたカード自身のスロット番号（キャラクター本体は0、装備欄内の召喚キャラクターパネルはその番号）
function _wireEnchantGlowHover(hitLayer,unit,unitIdx,slotIdx){
  if(!hitLayer||!unit) return;
  slotIdx=slotIdx||0;
  hitLayer.addEventListener('mouseenter',()=>{
    if(unitIdx!==G._selectedBoardUnitIdx) return;
    const list=typeof _collectEnhancementPanelsForSlot==='function'
      ?_collectEnhancementPanelsForSlot(unit,slotIdx).filter(({panel:p,idx})=>
        p&&idx!==slotIdx&&(String(p.category||'')==='強化'||String(p.category||'')==='エンチャント'))
      :_enchantmentEffectsList(unit,slotIdx);
    if(!list.length) return;
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    list.forEach(({idx})=>{
      const card=handSlots.querySelector(`[data-board-idx="${idx}"]`);
      if(card) card.classList.add('glow-blue');
    });
  });
  hitLayer.addEventListener('mouseleave',()=>{
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    handSlots.querySelectorAll('.glow-blue').forEach(c=>c.classList.remove('glow-blue'));
  });
}
// スロット番号に対応する装備欄カードのDOM要素を取得
function _boardSlotEl(handSlots,slotIdx){
  if(!handSlots) return null;
  return handSlots.querySelector(`[data-board-idx="${slotIdx}"]`);
}
function _connectedPanelHoverIndicesUntilCharacter(unit,startIdx){
  if(typeof _connectedBoardFlashIndices==='function') return new Set(_connectedBoardFlashIndices(unit,startIdx));
  return new Set([startIdx]);
}
// 強化カード自体にホバーした時：自身は白発光（既存の:hoverと同じ）、
// それと効果が繋がっている強化カード・キャラクターカード（本体または装備欄内の召喚キャラクターパネル）を青く発光させる
function _wireEnchantSelfHover(cardDiv,unit,enchantIdx){
  if(!cardDiv||!unit) return;
  cardDiv.addEventListener('mouseenter',()=>{
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    const eq=Array.isArray(unit.boardCards)?unit.boardCards:[];
    const affected=new Set();
    const connected=new Set();
    const passable=_connectedPanelHoverIndicesUntilCharacter(unit,enchantIdx);
    eq.forEach((panel,idx)=>{
      if(idx===enchantIdx) return;
      const isCharTarget=panel&&String(panel.category||'')==='キャラクター';
      if(!isCharTarget) return;
      if(!passable.has(idx)) return;
      const contrib=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(unit,idx):[];
      if(contrib.some(c=>c.idx===enchantIdx)){
        affected.add(idx);
        contrib.forEach(c=>{ if(c.idx!==enchantIdx&&passable.has(c.idx)) connected.add(c.idx); });
      }
    });
    affected.forEach(idx=>{ const el=_boardSlotEl(handSlots,idx); if(el) el.classList.add('glow-blue'); });
    connected.forEach(idx=>{ const el=_boardSlotEl(handSlots,idx); if(el) el.classList.add('glow-blue'); });
  });
  cardDiv.addEventListener('mouseleave',()=>{
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    handSlots.querySelectorAll('.glow-blue').forEach(c=>c.classList.remove('glow-blue'));
  });
}
// シート「キーワード」列に実在しない、内部の効果判定専用の自己参照名（強化カード名がそのまま
// 内部keywordとして使われるもの）。UI上はこれらを「キーワード」として表示しない。
const _INTERNAL_ONLY_ENCHANT_NAMES=new Set([
  '逆襲','闇の儀式','執念の炎','闇の炎','狂気','野生の力','治癒能力',
  '逆上','剣技','怨念','錬成','マナの種','奇妙な絆','竜の契約','恩寵','マナ生成'
]);
// UI上に表示すべきキーワード一覧を算出する（強化パネル由来で既に効果文に出ているものや、
// 内部集計専用のショートハンドは除外）。_unitPreviewText（ツールチップ）と
// _unitCombinedDescHtml（カード常時表示）の両方で同じ一覧を使うための共通ヘルパー。
function _unitDisplayKeywords(unit, desc, slotIdx){
  if(!unit) return [];
  const displayUnit=unit&&unit._mapPanelPowerText&&typeof coreMapPanelPowerDisplayCard==='function'
    ?coreMapPanelPowerDisplayCard(unit,unit._mapPanelPowerText):unit;
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const mapText=unit&&unit._mapPanelPowerText||'';
  const adjustMapText=value=>typeof coreMapPanelPowerAdjustManaText==='function'
    ?coreMapPanelPowerAdjustManaText(value,mapText):String(value||'');
  const panelEffects=[...normalTexts,...charTexts].map(t=>adjustMapText(_stripBattleParentheticalText(t))).filter(Boolean);
  // シート上「キーワード」欄に単独で載っているキーワード（_ENCHANT_KEYWORD_ONLY）以外は、
  // 説明文や効果全文の中に同じ文字列がそのまま含まれていれば、そちらの文脈で既に表示されるため
  // キーワード欄には重複して出さない（例：ゾンビの説明文が「死亡：青強化」の場合、
  // キーワード「青強化」は単独表示せず「死亡：青強化」の行にのみ表示する）。
  // ただし_ENCHANT_KEYWORD_ONLY（二段攻撃・シールド等、効果文を持たない単純キーワード付与パネル）は
  // 接続元パネルの効果文に現れない（本文が空のため）ので、常にキーワード欄に表示する。
  // desc/panelEffectsはマナアイコンが<img alt="色">に変換済みのHTMLの場合があるため、
  // 文字列比較の前にアイコンを元の色文字に戻し、タグを除去しておく
  const _stripIconsForMatch=s=>String(s||'').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const fullText=_stripIconsForMatch(`${adjustMapText(desc||'')} ${panelEffects.join(' ')}`);
  // loader.jsのシート同期時にdescから内部集計用に自動生成されるショートハンド（battle.jsのcount()判定専用で、
  // desc文と文字列としては一致しないため通常の重複除外に引っかからない）はUI上には表示しない
  const _isInternalOnlyKeyword=k=>/^[赤青緑黄紫茶]全体強化\d*(_\d+)?$/.test(k)||_INTERNAL_ONLY_ENCHANT_NAMES.has(k);
  const dynamicKws=[];
  // 結界は有無だけ表示する。盤面に無いカード
  // （デバッグ一覧・報酬の提示など）ではshieldが0なので、カード自身のキーワードから拾う。
  // これが無いと、エルフのようにシートで結界を持つカードの表示が一覧だけ欠ける。
  if(Number(unit.shield)>0||coreUnitShieldValue(unit)>0) dynamicKws.push('結界');
  // 各発生源の旧表記は落とし、結界の表示を1エントリにまとめる。
  const cardNames=CORE_EFFECT_CARD_NAMES;  // 一覧はコア側が持つ（2箇所で持たない）
  // **廃止済みキーワード（エリート・ボス・生贄など、CORE_REMOVED_KEYWORDS）は出さない。**（利用者指定）
  // battle.js はエリート戦／ボス戦の判定に keywords の「エリート」「ボス」を使うので、データからは消さず表示で除く。
  // 戦闘中のバッジ（renderField）は以前から除いていたが、ホバー説明のキーワード欄だけ残っていた。
  const _isRemovedKeyword=k=>typeof CORE_REMOVED_KEYWORDS!=='undefined'&&CORE_REMOVED_KEYWORDS.has(String(k||'').trim().replace(/\d+$/,''));
  const normalizedKws=[...(displayUnit.keywords||[]).filter(k=>!/^結界\d*$/.test(String(k||'').trim())&&!cardNames.has(String(k||'').trim())),...dynamicKws]
    .map(k=>String(k||'').replace(/^毒(\d+)$/,'毒牙$1'))
    .filter(k=>k&&!_isInternalOnlyKeyword(k)&&!_isRemovedKeyword(k));
  // 邪眼X・毒牙X等、末尾に数値を持つキーワードは複数所持時にXを合算した1つの表示にまとめる
  const mergedKws=typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords(normalizedKws):[...new Set(normalizedKws)];
  const filtered=mergedKws.filter(k=>{
    // 眷属は召喚による分類。自身の効果文にも眷属が現れていても、所持欄へ表示する。
    if(k==='眷属') return true;
    if(!_ENCHANT_KEYWORD_ONLY.has(k.replace(/\d+$/,''))&&fullText.includes(k)) return false;
    return true;
  });
  // 弱体X（弱体化Xにより付与された状態）はunit.keywordsではなくunit.weaken（数値、加算式）で
  // 管理しているため、ここで表示用の擬似キーワードとして先頭に合成する
  // 戦闘の再生中は、まだ演出を出していない弱体を含めない（present.js の据え置き値）。
  const shownWeaken=typeof presentShownWeaken==='function'?presentShownWeaken(unit):(Number(unit.weaken)||0);
  const weakenList=shownWeaken>0?[`弱体${shownWeaken}`]:[];
  return [...weakenList,...filtered];
}
// 戦闘中のユニットは _panelSummonDisplayBoardCards() が作る
// 「index0＝本体、以降＝接続中の強化カード」という平坦な配列を boardCards に持つ。
// これを盤面のスロット番号（_mainBoardSlot）で引くと _collectEnhancementPanelsForSlot() の
// 隣接判定がどれも成立せず、強化カードの効果文が丸ごと消えて編成画面と食い違う。
// 平坦配列を持つユニットは本体の位置＝0 で引く。
function _unitDescSlotIdx(unit, fallbackIdx){
  const eq=Array.isArray(unit&&unit.boardCards)?unit.boardCards:null;
  if(eq&&eq.length&&eq[0]&&String(eq[0].category||'')==='キャラクター') return 0;
  return Number.isInteger(unit&&unit._mainBoardSlot)?unit._mainBoardSlot:fallbackIdx;
}

function _unitPreviewText(unit, desc, slotIdx){
  if(!unit) return desc||'';
  const lines=[];
  if(unit.name) lines.push(_cardUiName(unit));
  const mapText=unit&&unit._mapPanelPowerText||'';
  const adjustMapText=value=>typeof coreMapPanelPowerAdjustManaText==='function'
    ?coreMapPanelPowerAdjustManaText(value,mapText):String(value||'');
  const {normalTexts:rawNormalTexts,charTexts:rawCharTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const normalTexts=rawNormalTexts.map(adjustMapText);
  const charTexts=rawCharTexts.map(adjustMapText);
  const characterTexts=[...charTexts,..._ringCharacterDescriptionsForUnit(unit)];
  const _stripIconsForMatch=s=>String(s||'').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const shownDesc=adjustMapText(desc);
  const kws=_unitDisplayKeywords(unit,shownDesc,slotIdx);
  // 「キーワード：」というラベルは表示せず、キーワードそのものを太字で並べる
  // （_formatPreviewHtmlがこのマーカー行を検出してラベルなし・太字表示に変換する）
  if(kws.length) lines.push(`キーワード：${kws.join(' / ')}`);
  // 2026-10-25：マナ効果・起動効果の説明はキーワード説明の欄にだけ出す（本文へは重ねない。利用者指定）。
  // 戦闘実行後に付与された状態異常（毒など）は静的なdesc/keywordsには含まれないため、
  // 現在値をここで都度追記しないとホバー説明文に反映されない
  // **「状態」は戦闘中だけ出す。** 編成画面では結界はキーワード欄に出ており、
  // そこへ更に「状態：結界1」を並べると同じことを二度書くことになる。
  const _inBattle=typeof G!=='undefined'&&G&&(G.phase==='player'||G.phase==='enemy');
  // 状態は名前と値だけの1行（キーワードの説明文は続けない。2026-09-27 利用者指定で元に戻した）。
  if(_inBattle&&unit.poison>0) lines.push(`状態異常：毒${unit.poison}`);
  if(_inBattle&&unit.shield>0) lines.push('状態：結界');
  // descの中の単独キーワード行は、既にキーワード欄へ出しているためその行だけ除く。
  // スケルトンキングの「復活\n攻撃：…」は、復活だけが本文色で二重表示されていた。
  const shownKeywordNames=new Set([...(unit.keywords||[]),...kws]
    .map(k=>String(k||'').trim().replace(/\d+$/,'')).filter(Boolean));
  const visibleDesc=_stripIconsForMatch(shownDesc).split('\n').filter(line=>{
    const tokens=String(line||'').trim().split(/[\s　]+/).filter(Boolean);
    return !(tokens.length&&tokens.every(t=>shownKeywordNames.has(t.replace(/\d+$/,''))));
  }).join('\n').trim();
  // descはcomputeDesc()経由でマナアイコンが注入済みの場合があるため、data-preview行としては
  // 生の色文字に戻して格納する（ホバー時に_formatPreviewHtmlが改めてアイコン化するため）
  if(visibleDesc) lines.push(visibleDesc);
  if(normalTexts.length) lines.push(normalTexts.join('\n'));
  if(characterTexts.length){
    // 区切りの直線は、前に本文（キーワード・効果）がある時だけ。名前の直後には見出しの直線が既にあるので、
    // 効果を持たないキャラ（ペリカン等）が指輪などで効果を得た時に直線が2本並んでいた（2026-10-05 利用者指摘）。
    if(lines.length>(unit.name?1:0)) lines.push('__CHARACTER_DESC_SEPARATOR__');
    lines.push(characterTexts.join('\n'));
  }
  return lines.join('\n');
}

function renderHand(){
  if(typeof renderHandEditor==='function') renderHandEditor();
}

function _circleCost(n){
  const chars=['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
  return (n>=0&&n<chars.length)?chars[n]:`(${n})`;
}

// ()内の数式を計算する（×÷対応）
function _evalMath(desc){
  return desc.replace(/\(([^)]+)\)/g,(match,inner)=>{
    const expr=inner.replace(/×/g,'*').replace(/÷/g,'/').trim();
    if(/^[\d\s+\-*/.]+$/.test(expr)){
      try{
        // eslint-disable-next-line no-new-func
        const r=Function('"use strict";return ('+expr+')')();
        if(typeof r==='number'&&isFinite(r))
          return Number.isInteger(r)?String(r):r.toFixed(1);
      }catch(e){}
    }
    return match;
  });
}

// Grade/X置換のみを適用した、マナアイコン注入前のプレーンテキスト。
// data-preview（ホバー時に_formatPreviewHtmlで改めてアイコン化される）に渡す用途では、
// 既にアイコン化済みのHTMLを渡すと<img alt="マナ">がアイコン数分「マナ」という文字列に
// 逆変換されてしまい「2マナ」が「マナマナ」になるバグの原因になるため、必ずこちらを使う。
// 説明文に出てくる召喚・変身先のキャラクター名へ、そのキャラの
// キーワードとステータスを添える。
//   例）「青スケルトン」を召喚し… → 復活を持つ4/1の「青スケルトン」を召喚し…
// **数値もキーワードもカードの定義（シート）から引く。** 文章へ書き足さないこと。
function _summonNameAnnotation(name, owner, isSummon, context){
  const wanted=String(name||'').trim();
  if(!wanted) return '';
  const defs=[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),
    ...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])];
  const def=defs.find(p=>p&&String(p.category||'')!=='エンチャント'
    &&(String(p.name||'').trim()===wanted
      ||`${p.color||''}${String(p.name||'').trim()}`===wanted));
  if(!def) return '';
  let kws=(def.keywords||[]).map(k=>String(k||'').trim())
    .filter(k=>k&&!(typeof _INTERNAL_ONLY_ENCHANT_NAMES!=='undefined'&&_INTERNAL_ONLY_ENCHANT_NAMES.has(k)));
  const form=!isSummon&&owner&&owner._runLevelsApplied
    ?coreApplyUnitRunLevels(def,owner._runLevelsApplied,{familiar:coreRunLevelIsFamiliar(context||owner)}):def;
  let atk=Number(form.power!=null?form.power:form.atk);
  let hp=Number(form.life!=null?form.life:form.hp);
  if(isSummon&&owner){
    const summoner=context||owner;
    const side=summoner.side||(summoner._sheetEnemy||(G.enemies||[]).includes(summoner)?'p2':'p1');
    const playing=presentIsPlaying()||G.phase==='battle'||G.phase==='enemy';
    const shown=playing&&presentSummonPreviewState();
    const state=shown||{gameSummonBuff:{p1:G.gameSummonBuff},
      rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},items:{p1:playing?G.activeBattleItems||[]:[],p2:[]}};
    const units=sideUnits=>(playing?sideUnits:[]).filter(Boolean).map(u=>({...u,
      atk:presentShownAtk(u),hp:presentShownHp(u),maxHp:presentShownMaxHp(u)}));
    const source={...summoner,atk:summoner.atk??summoner.power,hp:summoner.hp??summoner.life,
      maxHp:summoner.maxHp??summoner.life??summoner.hp};
    const stats=corePreviewSummonStats({...state,units:{p1:units(G.allies||[]),p2:units(G.enemies||[])}},side,def,
      {...source,atk:presentShownAtk(source),hp:presentShownHp(source),maxHp:presentShownMaxHp(source)},owner.boon);
    atk=stats.atk;hp=stats.hp;
    kws=stats.keywords.filter(k=>!(typeof _INTERNAL_ONLY_ENCHANT_NAMES!=='undefined'&&_INTERNAL_ONLY_ENCHANT_NAMES.has(k)));
  }else if(owner&&owner._sheetEnemy){
    // 変身の注釈は、従来どおり元の敵の現在戦力を使う。
    const actual=coreEnemySummonStats(owner);
    if(actual){atk=actual.atk;hp=actual.hp;}
  }
  const shownKeywords=isSummon?_mergeCountedKeywords(kws):kws;
  const head=shownKeywords.length?`${shownKeywords.join(isSummon?'と':'・')}を持つ`:'';
  // シートの「∞」は内部では SHEET_INFINITY_VALUE（loader.js）。表示は ∞ に戻す（鬼神の指輪の赤イフリート）。
  const shown=v=>typeof SHEET_INFINITY_VALUE!=='undefined'&&v>=SHEET_INFINITY_VALUE?'∞':v;
  const stat=(Number.isFinite(atk)&&Number.isFinite(hp))?`${shown(atk)}/${shown(hp)}の`:'';
  return `${head}${stat}`;
}
// 「〇〇」を召喚／「〇〇」に変身 の直前へ注釈を差し込む。
// **その並びの時だけ**にする（「「青レムレース」以外の」のような文には付けない）。
function _annotateSummonNames(desc, owner, context){
  // 中身から「も除く。除かないと入れ子（「死亡：「青スケルトン」を召喚する。」）で
  // 外側を先に掴んでしまい、内側のキャラ名に注釈が付かない（ボーンチャリオット）。
  return String(desc||'').replace(/「([^「」]{1,24})」(?=(?:を\d*体?召喚|に変身))/g,(m,name,offset,whole)=>{
    const note=_summonNameAnnotation(name, owner,/^を\d*体?召喚/.test(whole.slice(offset+m.length)),context);
    return note?`${note}${m}`:m;
  });
}
// 指輪の説明文（表示用）。指輪が眷属を召喚する本文にも、キャラの説明文と同じく
// 「〜を持つX/Xの「〇〇」」を添える（2026-10-21 利用者指定：不死の指輪）。効果の判定は元の本文（ring.desc）のまま。
function ringDisplayDesc(ring){
  const desc=String(ring&&(ring.desc||ring.description||ring.effectText||ring.effect)||'').trim();
  return desc?_annotateSummonNames(desc,ring):'';
}
// 刻印カードに記録した取得時のステージ（無ければ0）。
function engravingCardStage(card){
  const v=Math.floor(Number(card&&card._engravingStage)||0);
  return v>0?v:0;
}
if(typeof window!=='undefined') window.engravingCardStage=engravingCardStage;
const _STAGE_ENGRAVING_NAMES=new Set([
  '宿業の刻印','抑圧の刻印','受難の刻印','苦悶の刻印','修道の刻印','我慢の刻印',
]);
function _stageEngravingDescription(card,desc){
  const name=String(card&&card.name||'').trim();
  const no=String(card&&card.no||'').toUpperCase();
  if(!_STAGE_ENGRAVING_NAMES.has(name)&&!['E066','E076','E077','E078','E079','E080'].includes(no)) return desc;
  // Xは取得した時のステージで固定（カードの _engravingStage）。記録の無いカード（未取得の提示中・古いセーブ）は現在のステージ。
  const stage=(typeof engravingCardStage==='function'&&engravingCardStage(card))
    ||Math.max(1,Math.floor(Number(typeof G!=='undefined'&&G&&G._wave)||1));
  let value=stage*(name==='苦悶の刻印'||no==='E078'?20:5);
  if(name==='宿業の刻印'||no==='E066'){
    value=-corePanelStatBonuses(card,{stageNumber:stage}).atk;
  }else if(name==='修道の刻印'||no==='E079'){
    value=-coreBoonDynamicValue(card,card.desc,-value,'mod');
  }else if(name==='受難の刻印'||no==='E077') value=coreBoonDynamicValue(card,card.desc,value,'damage');
  let out=String(desc||'');
  if(name==='宿業の刻印'||no==='E066'){
    out=out.replace(/-\s*\d+\s*\/\s*-\s*\d+/,`-${value}/-${value}`);
    out=out.replace(/「[^」]+」(?=の効果で)/,`「${_cardUiName(card)}」`);
  }
  return out.replace(/X/g,String(value));
}
// 「N回目の終戦ごとに〜（あとX戦）」のXは、次に発動するまでの残りの戦闘数（グリマルキン。2026-10-23 利用者指摘）。
// 数えた終戦の回数はカードの _battleEndCount（コアの終戦処理が数え、戦闘の体からカードへ戻る）。
function _battleEndCountdownDescription(card,desc){
  const text=String(desc||'');
  const every=text.match(/(\d+)回目の終戦ごとに/);
  if(!every||!/（あと\s*X\s*戦）/.test(text)) return text;
  const n=Math.max(1,Number(every[1])||1);
  const count=Math.max(0,Math.floor(Number(card&&card._battleEndCount)||0));
  return text.replace(/（あと\s*X\s*戦）/g,`（あと${n-count%n}戦）`);
}
function _rawSubstitutedDesc(card,owner){
  if(!card) return '';
  card=runLevelDisplayCard(card,owner);
  const g=card.grade||1;
  let desc=_evalMath((card.desc||'').replace(/Grade/g,String(g)));
  const ownName=String(card.name||'').trim();
  if(ownName){
    desc=_stripOwnNameFromEffectText(desc,ownName);
  }
  if(card.descXEqualsAtk&&card.atk!=null) desc=desc.replace(/X/g,String(card.atk));
  desc=_stageEngravingDescription(card,desc);
  desc=_battleEndCountdownDescription(card,desc);
  desc=corePermanentDamageDescription(card,desc);
  desc=coreBoonDisplayText(card,desc,typeof TOWER_BOON_CONFIG!=='undefined'?TOWER_BOON_CONFIG.text:null);
  // （状態異常：毒N）は今の毒の値で出す（永続化した毒／戦闘中はその体の毒。預言者"ディナ"、2026-10-11）。
  const shownPoison=card._persistentPoison!=null?card._persistentPoison
    :(card._mainBoardSlot!=null&&card.poison!=null?card.poison:null);
  if(shownPoison!=null) desc=desc.replace(/（状態異常：毒\d+）/,`（状態異常：毒${Math.max(0,Number(shownPoison)||0)}）`);
  desc=_annotateSummonNames(desc,card,owner);
  if(card.boon&&card.boon.famMul>1&&/召喚/.test(String(card.desc||''))){
    desc+=TOWER_BOON_CONFIG.text.familiar.replace('{mul}',card.boon.famMul);
  }
  // **合体後の効果文はシートの「合体効果」列がそのまま入っている**（loader.js／pool.js）。
  // ここで数字を2倍にしてはいけない（シートには倍にしない値がある）。
  // シートに指定が無いカード（`_mergedFormApplied` が立たない）は、合体しても効果は変わらない。
  return _shieldDisplayText(desc);
}
function computeDesc(card,_mlOverride){
  let desc=_rawSubstitutedDesc(card);
  // 説明文中の色名（青・赤・緑・黄）をマナアイコンに置き換える
  desc=_boldKeywordsInHtml(desc);
  // タイミングのラベルを太字にする。**キーワードの太字より後に行うこと**
  // （_boldKeywordsInHtml は既存の strong を剥がすため、先に付けても消える）。
  desc=_boldTriggerLabelsInHtml(desc);
  if(typeof _injectManaIcons==='function') desc=_injectManaIcons(desc);
  desc=desc.replace(/\n/g,'<br>');
  return desc;
}

// ATK/HPの桁数が増えた時、カード中央下の矢印（.panel-dir-down）にぶつからない大きさへ縮める。
// 数字は幅72pxのボックスに中央揃えで置かれ、桁が増えると左右へはみ出す。
// 中心を軸にscaleすれば位置はそのままで、はみ出し量だけが比例して小さくなる。
// 実測（設計座標・カード幅260）：ボックス中心 x=49 / 矢印の左端 x=98。
// 65.52pxでの文字幅は 1桁36.3 / 2桁82.5 / 3桁123.8 / 4桁165 / 5桁206.3。
// 右端を x=94（矢印の手前4px）までに収めるため、許容幅は90px。
// ATKとHPで縮小率が食い違わないよう、両方の桁数のうち多い方でクラスを決める。
// （片方だけ小さくなると同じキャラの数値でサイズが揃わない）
function _cardStatPairDigitClass(atk,hp){
  const d=v=>String(v==null?'':v).replace(/[^0-9]/g,'').length;
  return _cardStatDigitClass('0'.repeat(Math.max(d(atk),d(hp))||1));
}
function _cardStatDigitClass(value){
  const digits=String(value==null?'':value).replace(/[^0-9]/g,'').length;
  if(digits>=5) return ' stat-d5';
  if(digits===4) return ' stat-d4';
  if(digits===3) return ' stat-d3';
  return '';
}
// 戦闘中のユニットカードのATK/HP（.slot-stats .a/.h）にも、桁数に応じた縮小クラスを当てる。
// 数値を入れ替えるだけの軽量更新経路が複数あるため、テキストとクラスを必ず一緒に更新する。
// keepSize：桁数が変わっても文字の大きさを変えない。
// death の瞬間はHPが0（1桁）になるため、そのまま作り直すと消える直前に
// 数字だけ大きくなって目立つ。死亡演出中は大きさを据え置く。
function _setUnitStatText(el,value,pairValue,keepSize){
  if(!el) return;
  el.textContent=value;
  if(keepSize) return;
  el.classList.remove('stat-d3','stat-d4','stat-d5');
  // pairValueを渡すと、ATK/HPのうち桁数が多い方に合わせた同じクラスになる。
  const cls=(pairValue===undefined?_cardStatDigitClass(value):_cardStatPairDigitClass(value,pairValue)).trim();
  if(cls) el.classList.add(cls);
}

// カードのホバー説明上辺のレアリティ表示。背景は新規SVG、星はSVGマスクに
// パステルレインボーを流し、レアリティ数だけ中央に並べる。
function cardRarityBannerHtml(card){
  const rarity=Math.max(0,Math.min(6,Math.floor(Number(card&&card.rarity)||0)));
  if(!rarity) return '';
  const step=27.92;
  const starSpan=rarity*23.92+Math.max(0,rarity-1)*4;
  // 5個で虹全体を使い、1〜4個では同じ虹の中央だけを切り出す。
  // これにより星が減るほど左右の色が削れ、1個では中央の黄色がほぼ全面を占める。
  const fullCount=Math.max(5,rarity);
  const fullSpan=fullCount*23.92+Math.max(0,fullCount-1)*4;
  const cropStart=(fullSpan-starSpan)/2;
  const stars=Array.from({length:rarity},(_v,i)=>`<span class="card-rarity-mark" style="--rarity-offset:calc(${-(cropStart+i*step)}px * var(--game-scale))"></span>`).join('');
  return `<span class="card-rarity-banner" aria-label="レアリティ${rarity}"><span class="card-rarity-back"></span><span class="card-rarity-marks" style="--rarity-full-span:calc(${fullSpan}px * var(--game-scale))">${stars}</span></span>`;
}

function mkCardEl(card,_idx,_ctx){
  const div=document.createElement('div');
  if(typeof SaveProfile!=='undefined') SaveProfile.observe(div,card);
  card=runLevelDisplayCard(card);
  const t=card.type||'ring';
  div.className=`card ${t}${card.legend?' legend-card':''}`;
  if(!card.type&&!card.kind) div.classList.add('character-card');
  if(card.rarity>=1&&card.rarity<=6) div.classList.add(`rarity-${card.rarity}`);
  div.dataset.cardIdx=String(_idx);
  div.dataset.cardCtx=_ctx||'';
  if(typeof applyCardVisual==='function'){
    applyCardVisual(div,card);
  } else if(typeof getCardAsset==='function'&&typeof assetUrl==='function'){
    div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
  }
  const manaCostEl=cardManaCostHtml(card);
  const sealCostEl=cardSealCostHtml(card);
  // 価格バッジはショップ（G._isShop）かつ実際に価格が1以上の場合のみ表示する。
  // 無料報酬（_buyPrice===0）ではバッジそのものを作らない（CSSでの後隠しはしない）。
  const showPriceBadge=G.phase==='reward'&&!!G._isShop&&Number(card._buyPrice)>0&&!card._debugInfiniteCard;
  const badgeEl=showPriceBadge?`<span class="card-badge">${_circleCost(card._buyPrice)}</span>`:'';
  const isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
  const isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
  const isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
  const isPanelCharacter=isPanelCard&&String(card.category||'')==='キャラクター';
  if(isPanelCharacter) div.classList.add('character-card','panel-character-card');
  if(div.classList.contains('character-card')&&card.color) div.setAttribute('data-preview-title-color',String(card.color));
  const _keywordPreviewCard={...card,keywords:[...(card.keywords||[]),...(card.adjacentKeywords||[])]};
  const _keywordPreviewAll=typeof _keywordOnlyPreviewText==='function'?_keywordOnlyPreviewText(_keywordPreviewCard):'';
  if(_keywordPreviewAll) div.setAttribute('data-keyword-preview',_keywordPreviewAll);
  if(card.type==='ring'||card.type==='consumable'||card.kind==='item'){
    const _auxKeywordPreview=typeof _auxiliaryKeywordPreviewText==='function'?_auxiliaryKeywordPreviewText(card,card.desc||''):'';
    if(_auxKeywordPreview) div.setAttribute('data-keyword-preview',_auxKeywordPreview);
  }
  let _charPreview='';
  if(div.classList.contains('character-card')){
    // シート「キーワード」列由来のcard.keywordsは、敵ユニット同様に_unitPreviewText()で
    // 「キーワード：〇〇」行として合成する（descが空でもキーワードだけで説明文が成立するようにする）
    // マナアイコン注入済みのdynDescではなく、_formatPreviewHtmlで改めてアイコン化する前提の
    // プレーンテキストを渡す（さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
    _charPreview=_unitPreviewText(card,_rawSubstitutedDesc(card));
    if(_charPreview) div.setAttribute('data-preview',_charPreview);
    const _keywordPreview=typeof _keywordOnlyPreviewText==='function'?_keywordOnlyPreviewText(card):'';
    if(_keywordPreview) div.setAttribute('data-keyword-preview',_keywordPreview);
  }
  const dirMarks=typeof panelDirectionMarksHtml==='function'?panelDirectionMarksHtml(card):'';
  if(isPanelCharacter){
    const pAtk=Number(card.power??card.atk??0);
    const pHp=Number(card.life??card.hp??1);
    const preview=_charPreview||[_cardUiName(card),card.desc||''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}${dirMarks}<div class="card-art"></div><span class="unit-stat-overlay-layer" aria-hidden="true"></span><span class="card-summon-atk${_cardStatPairDigitClass(pAtk,pHp)}">${pAtk}</span><span class="card-summon-hp${_cardStatPairDigitClass(pAtk,pHp)}">${pHp}</span>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  if(isPanelCard&&['強化','エンチャント'].includes(String(card.category||''))){
    div.classList.add('enchantment-card');
    // data-previewはホバー時に_formatPreviewHtmlで再度HTMLタグ除去→マナアイコン挿入されるため、
    // 既にアイコンが埋め込まれたdynDesc（computeDesc結果）ではなく生のcard.descを使う。
    // 本文が空でもシート「キーワード」列（adjacentKeywords）があれば、隣接キャラクターに付与する
    // キーワードとして「キーワード：〇〇」行を合成する（敵/キャラクターと同じ表示規則）。
    // キーワード欄の中身は _enchantPreviewKeywords() が唯一の実装。
    const _adjKws=_enchantPreviewKeywords(card);
    // 本文に「効果なし」を含む強化カード（方向接続専用パネル等）は説明文を表示しない
    const _panelDescRaw=/効果なし/.test(String(card.desc||''))?'':_plainEffectTextForPreview(card);
    const _panelDescForPreview=card.name==='封印されしもの'
      ?String(_panelDescRaw||'').replace(/^封印\d+\s*/,'').trim():_panelDescRaw;
    const preview=[_cardUiName(card),_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:'',_panelDescForPreview].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    const keywordPreview=typeof _keywordOnlyPreviewText==='function'
      ?_keywordOnlyPreviewText({...card,keywords:_adjKws}):'';
    if(keywordPreview) div.setAttribute('data-keyword-preview',keywordPreview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}${dirMarks}<div class="card-art"></div>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  if(typeof _isSpellCard==='function'&&_isSpellCard(card)){
    div.classList.add('spell-card');
    const preview=[_cardUiName(card),_previewRarityLine(card),card.desc||''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}<div class="card-art"></div>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}<div class="card-art"></div>`;
  return div;
}
