// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// ── キーワードツールチップ（KW_DESC_MAP は loader.js で effect_id シートから読み込み）──

(function _initKwTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  const mapTip=()=>document.getElementById('map-power-tooltip');
  const keywordTip=()=>document.getElementById('keyword-tooltip');
  const hideTips=()=>{
    tip.style.display='none';
    const mt=mapTip(),kt=keywordTip();
    if(mt) mt.style.display='none';
    if(kt) kt.style.display='none';
  };
  // ドラッグ中はホバー説明を出さない。ただしこのフラグが立ちっぱなしになると
  // 以後ホバー説明が一切出なくなるため、解除の経路を多重化しておく。
  // ※HTML5ドラッグ中はmouseupが発火しない。さらに、ドロップ成功で再描画が走り
  //   ドラッグ元の要素がDOMから作り直されるとdragendも発火しないことがある
  //   （reward.jsの指輪ドロップ等）。その場合フラグが戻らず、戦闘中にキャラへ
  //   ホバーしても説明が出ない状態になる。
  let _dragging=false;
  document.addEventListener('dragstart',()=>{ _dragging=true; hideTips(); }, true);
  document.addEventListener('dragend',()=>{ _dragging=false; }, true);
  document.addEventListener('drop',()=>{ _dragging=false; }, true);
  // 同じ理由（ドロップ成功→再描画→dragendが来ない）で、カーソル追従の複製（.drag-ghost）が
  // 画面に残り続けることがある。残ると「置いたカードがその場に貼り付いて動かない」ように見える
  // （例：店の売切枠へ魔導板のカードを置いた直後）。ドロップ後に必ず片付ける。
  // ※各ドロップ処理より後に走らせたいのでバブリング側で登録する。
  document.addEventListener('drop',()=>{
    if(typeof _removeDragGhost==='function') _removeDragGhost();
    if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
  });
  document.addEventListener('mouseup',()=>{ _dragging=false; }, true);
  document.addEventListener('mousemove',e=>{
    // 保険：ボタンを押していないmousemoveが来た時点でドラッグは終わっている。
    // HTML5ドラッグ中はmousemoveが発火しないので、これでドラッグを誤って打ち切ることはない。
    if(_dragging&&e.buttons===0) _dragging=false;
    if(_dragging){ hideTips(); return; }
    const tgt=e.target&&e.target.closest?e.target:null;
    const cardPreviewEl=tgt&&tgt.closest('[data-preview]');
    const journeyEnemyEl=tgt&&tgt.closest('[data-journey-enemy]');
    const panelPreviewEl=tgt&&tgt.closest('[data-panel-power-preview]');
    const kwEl=tgt&&tgt.closest('.slot-badge[data-kwdesc]');
    const mapPreviewEl=tgt&&tgt.closest('[data-map-power-preview]');
    const keywordPreviewEl=tgt&&tgt.closest('[data-keyword-preview]');
    // 鍛冶屋・道具屋のメニュー、指輪交換の指輪、所持アイテム・所持指輪はカーソルの右下に出す。
    const _tipBelow=_tipBelowCursorTarget(tgt);
    // 右クリックのぞき見（right-card-peek）は魔導板カードを透明化する機能なので、
    // その挙動（カード自身の説明を出さずマスの説明だけ出す）も魔導板の範囲に限定する。
    // body全体で判定すると、のぞき見中に報酬カード・デバッグカードへホバーしても
    // data-previewが無視されて説明が消えてしまっていた。
    const isGameoverBoard=!!(tgt&&tgt.closest('#gameover-board-grid'));
    const isPanelPeek=!!(document.body&&document.body.classList.contains('right-card-peek'))
      &&!!(tgt&&tgt.closest('#hand-slots.unit-equip-slots,#gameover-board-grid'));
    // 右クリックのぞき見中は、透明化したカード自身の説明へフォールバックしない。
    // 特殊マスがある場合だけ、そのマスの説明を表示する。
    const el=isPanelPeek?panelPreviewEl:(cardPreviewEl||kwEl||panelPreviewEl);
    if(!el&&!mapPreviewEl&&!keywordPreviewEl){ hideTips(); return; }
    const isKeywordDesc=!!(el&&el.hasAttribute('data-kwdesc'));
    // 右クリックのぞき見中、マス自体（召喚の力など）の説明はdata-panel-power-previewから出す。
    // このマスにレアリティはないため、上に置かれているカードのrarityクラスは適用しない。
    const isPanelPowerDesc=isPanelPeek&&!isKeywordDesc&&!!(el&&el.hasAttribute('data-panel-power-preview'));
    const isMapPowerDesc=isPanelPowerDesc||!!(el&&el.hasAttribute('data-panel-power-preview')&&!el.hasAttribute('data-preview'));
    const desc=(isMapPowerDesc&&el&&el.getAttribute('data-panel-power-preview'))
      ||(el&&!isPanelPeek&&el.getAttribute('data-preview'))
      ||(el&&el.getAttribute('data-kwdesc'))||(el&&el.getAttribute('data-panel-power-preview'))||(el&&el.getAttribute('data-preview'))||'';
    if(desc){
      const journeyEnemyJson=(el&&el===journeyEnemyEl)?el.getAttribute('data-journey-enemy'):'';
      tip.innerHTML=journeyEnemyJson?_formatJourneyEnemyHtml(desc,journeyEnemyJson)
        :(isMapPowerDesc?_formatMapPowerHtml(desc):_formatPreviewHtml(desc,{plainTitle:!isKeywordDesc}));
      tip.className=tip.className.replace(/\brarity-\d\b/g,'').trim();
      tip.classList.toggle('map-tooltip',isMapPowerDesc);
      // data-preview-norule＝見出しだけの1行表示（旅の進捗のSceneマーク＝塔の名前）。
      // 枠はカードと同じまま、見出し下の直線だけを消す。
      tip.classList.toggle('no-title-rule',!!(el&&el.hasAttribute('data-preview-norule')));
      if(!isMapPowerDesc){
        const rarityClass=el&&[...el.classList].find(c=>/^rarity-[1-6]$/.test(c));
        if(rarityClass) tip.classList.add(rarityClass);
      }
      tip.style.display='block';
      _posKwTip(tip,e,0,0,_tipBelow);
    }else tip.style.display='none';

    // 特殊マスの説明は編成画面だけでなく、ショップ・鍛冶屋などの
    // 魔導板を表示している報酬フェイズでも表示する。
    const formationOnly=typeof G!=='undefined'&&(G.phase==='reward'||G.phase==='gameover');
    const mt=mapTip();
    // のぞき見中は#kw-tooltip側（tip）が既に同じ特殊マス説明を表示しているため、
    // #map-power-tooltipに同一内容を重ねて2つ表示しないようにする。
    if(mt&&formationOnly&&mapPreviewEl&&!isPanelPeek){
      mt.innerHTML=_formatMapPowerHtml(mapPreviewEl.getAttribute('data-map-power-preview')||'');
      mt.style.display='block';
    }else if(mt) mt.style.display='none';
    const kt=keywordTip();
    if(kt&&keywordPreviewEl&&!isPanelPeek){
      kt.innerHTML=_formatKeywordOnlyHtml(keywordPreviewEl.getAttribute('data-keyword-preview')||'');
      kt.style.display='block';
    }else if(kt) kt.style.display='none';
    // 常に「カード効果 → キーワード → 特殊マス」の順で縦に積む。
    // 画面下端を越える場合は3枠をまとめて上へ戻し、各説明同士を重ねない。
    let stackAnchor=tip.style.display==='block'?tip:null;
    if(kt&&kt.style.display==='block'){
      if(stackAnchor) _posTipRelative(kt,stackAnchor,'below',false);
      else _posKwTip(kt,e,0,0,_tipBelow);
      stackAnchor=kt;
    }
    if(mt&&mt.style.display==='block'){
      if(stackAnchor) _posTipRelative(mt,stackAnchor,'below',false);
      else _posKwTip(mt,e,0,0,_tipBelow);
      stackAnchor=mt;
    }
    _fitTooltipStack([tip,kt,mt]);
  });
})();
function _escapePreviewHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// 説明文中の「（色文字）（数字）マナ」をマナ数分のマナアイコンに置き換える（数字・「マナ」の文字は表示しない）。
// また色名（青・赤・緑・黄・紫・茶）が強化系キーワードに続く場合は、見た目・種族分類の色アイコンを添える（マナとは無関係）。
function _injectManaIcons(escapedText){
  if(typeof _manaOrbPath!=='function') return escapedText;
  const manaIcon=()=>{
    const path=_manaOrbPath();
    return path?`<img class="desc-mana-icon" src="${path}" alt="マナ">`:'';
  };
  const colorIcon=m=>{
    const path=typeof _colorIconPath==='function'?_colorIconPath(m):'';
    return path?`<img class="desc-mana-icon" src="${path}" alt="${m}">`:m;
  };
  const bloodPath=typeof Assets!=='undefined'&&Assets.cards&&Assets.cards.blood||'assets/cards/blood.png';
  const bloodIcon=`<img class="desc-mana-icon desc-blood-icon" src="${bloodPath}" alt="血">`;
  const eyeNames=[];
  const protectEyeNames=text=>String(text).replace(/[赤青緑黄紫]い瞳/g,name=>{
    const token=`__EYE_NAME_${eyeNames.length}__`;
    eyeNames.push(name);
    return token;
  });
  const restoreEyeNames=text=>String(text).replace(/__EYE_NAME_(\d+)__/g,(_,i)=>eyeNames[Number(i)]||'');
  return String(escapedText||'').split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) return part;
    return restoreEyeNames(protectEyeNames(part)
      // 赤・青・緑・黄・紫は前後の単語を問わず、漢字1字だけで常にアイコン化する。
      // ただし「色（＋「の」）＋マナ」の並びは次のマナ用置換にまとめて任せる（二重変換で
      // <img alt="色">のalt属性内の文字を再度アイコン化してしまうのを防ぐため、先読みで除外する）。
      .replace(/[青赤緑黄紫黒](?!(?:の)?\d*マナ)/g,m=>colorIcon(m))
      // 「赤の3マナ」「2マナ」のように、色（省略可）＋「の」（省略可）＋数字（省略可）＋「マナ」を
      // まとめてマナの数だけアイコン化する。色が付かない場合（例：「2マナを得る」）にも対応する。
      .replace(/([青赤緑黄紫茶黒])?(?:の)?(\d*)マナ/g,(_,c,n)=>{
        const icon=c?colorIcon(c):manaIcon();
        return icon.repeat(Math.max(1,parseInt(n,10)||1));
      })
      .replace(/血(?=が|に|の|は|以上|。|、|$)/g,bloodIcon));
  }).join('');
}
function _stripStrongMarkupText(text){
  return String(text||'')
    .replace(/&lt;\s*\/?\s*strong\s*&gt;/gi,'')
    .replace(/<\/\s*strong\s*>/gi,'')
    .replace(/<\s*\/?\s*strong\s*>/gi,'')
    .replace(/<\/\s*strong\s*/gi,'')
    .replace(/<\s*strong\s*/gi,'');
}
function _boldKeywordsInHtml(html){
  const variable='毒牙|邪眼|衝撃|結界|封印|弱体|毒';
  const fixed='復活|根性|二段攻撃|三段攻撃|三方向攻撃|全体攻撃|即死|先制|隠密|加護|貫通|生命吸収';
  const re=new RegExp(`(${variable})\\d*|(${fixed})`,'g');
  const normalized=_stripStrongMarkupText(html);
  return normalized.split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) return part;
    return part.replace(re,m=>`<strong>${m}</strong>`);
  }).join('');
}
// 効果テキストを他のカード説明と同じ規則で整形する：効果ごとに「：」より前を太字にする。
// シート上の効果区切りは実データでは改行ではなく全角スペースのため（例
// 「常時：〜。　誘発：〜。」）、改行に加えて「全角スペース＋短いラベル＋：」も改行として扱う。
function _formatJourneyEffectText(desc){
  return String(desc||'').split(/\n|　(?=[^：:　]{1,12}[：:])/).map(line=>{
    const text=String(line||'').trim();
    if(!text) return '';
    const m=text.match(/^([^：:]+)([：:])(.*)$/);
    if(!m) return _injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(text)));
    const body=_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(m[3])));
    return `<strong>${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`;
  }).filter(Boolean).join('<br>');
}
// 「旅の進捗」パネルのエリート/ボスホバー専用フォーマット。
// タイトル（エリート／ボス＋カード名、2行中央揃え）→カード画像→直線→効果テキストの順に組み立てる。
function _formatJourneyEnemyHtml(titleText,jsonStr){
  const titleHtml=String(titleText||'').split('\n').map(l=>_escapePreviewHtml(l)).join('<br>');
  const title=`<strong class="preview-title">${titleHtml}</strong>`;
  let data=null;
  try{ data=JSON.parse(jsonStr); }catch(_e){}
  if(!data) return title;
  // 他のカードと全く同じ生成経路（mkCardEl）でフレーム・絵柄・ATK/HPを1枚のカードとして
  // 描画する（独自の簡易表示だと縦横比が崩れて潰れて見えるため）。
  const pseudoCard={
    id:'journey-enemy-preview',
    name:data.name,
    type:'panel',
    kind:'panel',
    panelScope:'unit',
    category:'キャラクター',
    power:Number(data.atk)||0,
    atk:Number(data.atk)||0,
    life:Number(data.hp)||0,
    hp:Number(data.hp)||0,
    color:data.color||'',
    artCode:data.artCode||'',
    _artCode:data.artCode||'',
    _sheetEnemy:!!data._sheetEnemy,
    _isEliteOrBoss:!!data._isEliteOrBoss,
    directions:[],
  };
  const cardEl=typeof mkCardEl==='function'?mkCardEl(pseudoCard,-1,'journey-preview'):null;
  // カードは魔導板と同じ設計寸法（260x395）のまま生成し、ラッパー側のtransform:scaleで
  // 縮小表示する。幅だけをツールチップに合わせて伸縮させると、内部のATK/HP等（設計px固定）
  // だけが取り残されてサイズ・位置が崩れるため。
  const cardHtml=cardEl?`<div class="journey-card-wrap">${cardEl.outerHTML}</div>`:'';
  const sectionRule='<div class="preview-section-rule"></div>';
  // 通常カードと同じく、効果テキストの一番上にキーワードを「A / B」形式の太字で並べる
  // （_formatPreviewHtmlの「キーワード：」行と同じ見せ方。ラベル自体は表示しない）。
  const kws=Array.isArray(data.keywords)?data.keywords.map(k=>String(k||'').trim()).filter(Boolean):[];
  // _boldKeywordsInHtml()は固定のキーワード一覧しか太字にしないため、敵のキーワードには
  // 当たらない。ここは「キーワードそのものを並べる」箇所なので無条件に太字にする。
  const kwHtml=kws.length
    ?kws.map(k=>`<strong>${_injectManaIcons(_escapePreviewHtml(k))}</strong>`).join(' / ')
    :'';
  // 効果テキスト中に登場するキーワード（例：マニガンスの「結界」）も説明の対象にする。
  const descRaw=String(data.desc||'');
  const hits=[];
  if(typeof KW_DESC_MAP!=='undefined'&&KW_DESC_MAP){
    Object.keys(KW_DESC_MAP).forEach(rawName=>{
      // 「毒牙X」のようなX付きの見出しは、数字付き／無しの両方を本文から拾う。
      const stem=String(rawName||'').trim().replace(/X$/,'');
      if(!stem) return;
      const re=new RegExp(stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\d*','g');
      let m;
      while((m=re.exec(descRaw))) hits.push({name:m[0],index:m.index});
    });
  }
  hits.sort((a,b)=>a.index-b.index);
  const textKws=[];
  hits.forEach(h=>{ if(!textKws.includes(h.name)) textKws.push(h.name); });
  // 他の検出語に含まれてしまう短い語（例：「毒牙2」に対する「毒」）は落とす。
  const uniqueTextKws=textKws.filter(k=>!textKws.some(o=>o!==k&&o.includes(k)));
  const allKws=[...kws];
  uniqueTextKws.forEach(k=>{ if(!allKws.includes(k)) allKws.push(k); });
  // キーワードの説明も併記する（通常カードのキーワード説明と同じ「名前：説明」形式）。
  const kwDescHtml=allKws.map(k=>{
    const base=k.replace(/\d+$/,'');
    let d=(typeof KW_DESC_MAP!=='undefined'&&(KW_DESC_MAP[k]||KW_DESC_MAP[base]))||'';
    if(!d&&typeof _enchantKeywordDesc==='function') d=_enchantKeywordDesc(k)||'';
    const value=(k.match(/(\d+)$/)||[])[1];
    if(value) d=String(d||'').replace(/X/g,value);
    return d?`<strong>${_escapePreviewHtml(k)}</strong>：${_injectManaIcons(_escapePreviewHtml(d))}`:'';
  }).filter(Boolean).join('<br>');
  const descText=data.desc?_formatJourneyEffectText(data.desc):'';
  const body=[kwHtml,descText].filter(Boolean).join('<br>');
  const kwSection=kwDescHtml?`${sectionRule}${kwDescHtml}`:'';
  return `${title}${cardHtml}${sectionRule}${body}${kwSection}`;
}
function _formatPreviewHtml(desc,opt){
  const plainTitle=!!(opt&&opt.plainTitle);
  const clean=_stripStrongMarkupText(desc).replace(/<[^>]*>/g,'');
  const sectionRule='<div class="preview-section-rule"></div>';
  const lines=clean.split('\n').map((line,li)=>{
    if(li===0){
      const title=_escapePreviewHtml(line);
      return `<strong class="preview-title">${plainTitle?title:_injectManaIcons(_boldKeywordsInHtml(title))}</strong>`;
    }
    if(line==='__CHARACTER_DESC_SEPARATOR__') return sectionRule;
    const m=line.match(/^([^：:]+)([：:])(.*)$/);
    if(!m) return _injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(line)));
    if(m[1]==='キーワード'){
      // 「キーワード：」というラベル自体は表示せず、キーワードそのものだけを太字で並べる
      return _stripStrongMarkupText(m[3]).split(/\s*\/\s*/).map(k=>k.trim()).filter(Boolean)
        .map(k=>_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(k)))).join(' / ');
    }
    let body=_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(m[3])));
    // 「Xマナ：」「Xマナ毎：」ラベルはマナ数分のアイコンに変換する（他のタイミングラベルと違い文字列のまま太字にしない）
    if(/^\d+マナ毎?$/.test(m[1])){
      return `<strong>${_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(m[1])))}</strong>${_escapePreviewHtml(m[2])}${body}`;
    }
    return `<strong>${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`;
  });
  // .preview-title は display:block のため、直後に<br>を挟むと1行分余分な空白ができる
  let body='';
  lines.slice(1).forEach(part=>{
    if(part===sectionRule){ body+=sectionRule; return; }
    if(body&&!body.endsWith(sectionRule)) body+='<br>';
    body+=part;
  });
  return lines[0]+body;
}
function _keywordOnlyPreviewText(card,desc,slotIdx){
  const seen=new Set();
  const sourceKws=slotIdx!=null&&typeof _unitDisplayKeywords==='function'
    ?_unitDisplayKeywords(card,desc||'',slotIdx):(card&&card.keywords||[]);
  // 「マナ効果」は説明専用の擬似キーワード。キャラクター本文のキーワード一覧には加えず、
  // manaCostを持つキャラ、または接続強化を含む効果文に「Xマナ（毎）：」があるキャラの
  // keyword-tooltipだけに追加する。
  let manaEffectText=`${desc||''}\n${card&&card.desc||''}\n${card&&card._manaThresholdDesc||''}`;
  if(card&&slotIdx!=null&&typeof _groupedEnchantEffectTexts==='function'){
    const grouped=_groupedEnchantEffectTexts(card,slotIdx);
    manaEffectText+=`\n${[...(grouped.normalTexts||[]),...(grouped.charTexts||[])].join('\n')}`;
  }
  const hasManaEffect=Number(card&&card.manaCost)>0||/^\s*\d+マナ(?:毎)?[：:]/m.test(manaEffectText);
  const tooltipKws=[...sourceKws];
  if(hasManaEffect) tooltipKws.push('マナ効果');
  return tooltipKws.map(k=>String(k||'').trim()).filter(k=>{
    if(!k||seen.has(k)) return false;
    seen.add(k); return true;
  }).filter(k=>typeof _INTERNAL_ONLY_ENCHANT_NAMES==='undefined'||!_INTERNAL_ONLY_ENCHANT_NAMES.has(k)).map(k=>{
    const base=k.replace(/\d+$/,'');
    let desc=(typeof KW_DESC_MAP!=='undefined'&&(KW_DESC_MAP[k]||KW_DESC_MAP[base]))||
      (typeof _enchantKeywordDesc==='function'?_enchantKeywordDesc(k):'');
    if(!desc&&base==='マナ効果') desc='戦闘中、指定のマナが溜まると一度だけ発動する。（毎の場合は、指定のマナの倍数が溜まるごとに何度でも発動する）';
    const value=(k.match(/(\d+)$/)||[])[1];
    if(value) desc=String(desc||'').replace(/X/g,value);
    return desc?`${k}：${desc}`:'';
  }).filter(Boolean).join('\n');
}
function _formatKeywordOnlyHtml(text){
  return String(text||'').split('\n').filter(Boolean).map(line=>{
    const m=line.match(/^([^：:]+)[：:](.*)$/);
    if(!m) return _injectManaIcons(_escapePreviewHtml(line));
    return `<strong>${_escapePreviewHtml(m[1])}</strong>：${_injectManaIcons(_escapePreviewHtml(m[2]))}`;
  }).join('<br>');
}
function _formatMapPowerHtml(desc){
  const lines=String(desc||'').split('\n');
  const title=_escapePreviewHtml(lines.shift()||'');
  const body=_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(lines.join('\n')))).replace(/\n/g,'<br>');
  return `<strong class="preview-title">${title}</strong>${body}`;
}
function _previewRarityLine(card){
  return '';
}
function _plainEffectTextForPreview(card){
  if(!card) return '';
  const raw=(typeof _rawSubstitutedDesc==='function'?_rawSubstitutedDesc(card):String(card.desc||card.effectText||card.effect||''));
  return _stripOwnNameFromEffectText(String(raw||'').replace(/<[^>]*>/g,''),card.name);
}
// マナは色を持たない単一プールのため、常に同じアイコンを返す
function _manaOrbPath(){
  return Assets.cards.manaOrb;
}
function _cardUiName(card){
  return String(card&&card._displayName||card&&card.name||'');
}
// 召喚体は内部判定用に色接頭辞を持つ場合があるが、色は枠／colorで表示する。
// 固有名カードを壊さないよう、既知の召喚体名だけ表示時に除去する。
function _battleDisplayUnitName(name){
  return String(name||'').replace(/^(赤|青|緑|黄|黒|紫)(?=(?:シャドウ|スケルトン|ペリカン|ウルフ|ナイトキャット|ケルピー|イフリート|ドラゴン)$)/,'');
}
// 見た目・種族分類の色（強化キーワード等の表示用）。マナとは無関係
function _colorIconPath(color){
  const c=String(color||'').toLowerCase();
  if(c==='red'||c==='赤') return Assets.cards.redOrb;
  if(c==='blue'||c==='青') return Assets.cards.blueOrb;
  if(c==='green'||c==='緑') return Assets.cards.greenOrb;
  if(c==='yellow'||c==='黄'||c==='茶') return Assets.cards.yellowOrb;
  if(c==='purple'||c==='紫') return Assets.cards.purpleOrb;
  if(c==='black'||c==='黒') return Assets.cards.blackOrb;
  return '';
}
function cardManaCostHtml(card){
  if(!card) return '';
  const entries=[];
  const isEnchant=String(card.category||'')==='強化'||String(card.category||'')==='エンチャント';
  // 封印されしもの本体には封印コストを表示するが、他の強化カードへ封印を波及させない。
  const seal=isEnchant&&card.name!=='封印されしもの'?0:_sealCostValue(card);
  const blood=Assets?.cards?.blood||'';
  if(seal&&blood){
    const value=seal===Infinity?'∞':seal;
    entries.push(`<span class="activation-cost-entry seal-cost-entry"><img src="${blood}" alt=""><b>${value}</b></span>`);
  }
  const path=_manaOrbPath();
  // 接続元のマナ効果（_extraManaCosts）はキャラクターにだけ表示する。
  // 強化カード同士を接続しても、接続先の強化カードへアイコンを複製しない。
  // 戦闘中のユニットはcategoryを持たない（編成カードから作られる際に引き継がれない）ため、
  // categoryが空のものも強化カードでなければキャラクター扱いにする。
  // これを見落とすと、元からマナ効果を持つキャラが強化カードで2つ目のマナ効果を得ても
  // 戦闘中だけアイコンが1つしか出ない。
  const _cat=String(card.category||'');
  const _isCharacterLike=_cat==='キャラクター'||(!_cat&&!isEnchant);
  const extraCosts=_isCharacterLike
    ?(Array.isArray(card._extraManaCosts)?card._extraManaCosts:
      (Array.isArray(card._extraManaThresholds)?card._extraManaThresholds.map(t=>Number(t&&t.cost)||0):[]))
    :[];
  // 同じ必要マナの同一効果が複数接続されても、表示アイコンは1つだけにする。
  const costs=[...new Set([Number(card.manaCost)||0,...extraCosts].filter(v=>v>0))];
  if(path) costs.forEach((cost,i)=>{
    entries.push(`<span class="activation-cost-entry mana-cost-entry${i===0?' mana-primary':''}" data-mana-cost="${cost}"><img src="${path}" alt=""><b>${cost}</b></span>`);
  });
  return entries.length?`<span class="card-activation-costs mana-cost-orbs">${entries.join('')}</span>`:'';
}
function _sealCostValue(card){
  if(!card) return 0;
  const kws=[...(card.keywords||[]),...(card.adjacentKeywords||[])];
  if(card._sealInfinity||kws.some(k=>/^封印\s*∞$/.test(String(k||'')))) return Infinity;
  const kw=kws.find(k=>/^封印\s*\d+$/.test(String(k||'')));
  if(kw) return Math.max(1,parseInt(String(kw).replace(/\D/g,''),10)||1);
  if(card._sealValue===Infinity) return Infinity;
  if(card._sealValue>0||card._sealed===true) return Math.max(1,Number(card._sealValue)||1);
  if(card._sealed===false) return 0;
  if(typeof _sealValue==='function'){
    const v=_sealValue(card);
    if(v>0) return v;
  }
  const text=[card.desc,card.effectText,card.effect].filter(Boolean).join(' ');
  const m=[...kws,String(text||'')].join(' ').match(/封印\s*(\d+)/);
  return m?Math.max(1,parseInt(m[1],10)||1):0;
}
function cardSealCostHtml(card){
  return '';
}
// entity（スペル/強化パネル/召喚済みユニット）が持つ manaCost/manaRepeat/_manaFireCount を見て、
// div内の.mana-cost-orbsのアイコン点灯・非表示状態を反映する。マナは消費されない共有蓄積値のため、
// 「直近の発動基準（manaCost×発動回数）からの蓄積分」だけ点灯させる。
// 非repeatは発動後アイコンごと非表示、manaRepeatは発動後も表示を維持し次の閾値へ向けて再点灯する。
function _applyManaOrbState(div,entity){
  if(!div) return;
  const wrap=div.querySelector('.mana-cost-orbs');
  if(!wrap) return;
  const cost=Number(entity&&entity.manaCost)||0;
  if(!cost) return;
  const primary=wrap.querySelector('.mana-primary');
  const orbImgs=primary?primary.querySelectorAll('img'):[];
  const inBattle=typeof G!=='undefined'&&(G.phase==='player'||G.phase==='enemy');
  if(!inBattle){
    if(primary) primary.classList.remove('mana-primary-hidden');
    orbImgs.forEach(img=>img.classList.add('mana-orb-lit'));
    return;
  }
  const repeat=!!(entity&&entity.manaRepeat);
  const fired=(entity&&entity._manaFireCount)||0;
  if(fired>=1&&!repeat){
    if(primary) primary.classList.add('mana-primary-hidden');
    return;
  }
  if(primary) primary.classList.remove('mana-primary-hidden');
  const have=Math.max(0,(typeof _ensureMana==='function'?_ensureMana():Number(G.mana)||0)-cost*fired);
  orbImgs.forEach((img,i)=>{ if(i<have) img.classList.add('mana-orb-lit'); });
}
// 説明枠をカーソルの右下に出す対象（鍛冶屋のメニュー・指輪交換の指輪・道具屋のメニュー・
// 所持アイテム・所持指輪）。いずれも .item-visual / .ring-visual を持つ枠。
const TIP_BELOW_CURSOR_SELECTOR='.item-visual,.ring-visual,[data-tip-below]';
function _tipBelowCursorTarget(target){
  return !!(target&&target.closest&&target.closest(TIP_BELOW_CURSOR_SELECTOR));
}
// 説明枠を収める下端。ゲーム描画領域（背景）の底辺で切れてしまうため、
// ウィンドウ下端ではなく背景の下端を上限にする。
function _tooltipAreaBottom(){
  const rs=getComputedStyle(document.documentElement);
  const scale=parseFloat(rs.getPropertyValue('--game-scale'))||0;
  const offY=parseFloat(rs.getPropertyValue('--game-offset-y'))||0;
  const gameBottom=scale>0?offY+2160*scale:window.innerHeight;
  return Math.min(window.innerHeight,gameBottom)-8;
}
function _posKwTip(tip,e,dx=0,dy=0,below=false){
  const tw=tip.offsetWidth, th=tip.offsetHeight;
  const bottomLimit=_tooltipAreaBottom();
  if(below){
    // カーソルの右下に出す。画面外へ出る場合だけ内側へ寄せる。
    const x=e.clientX+18+dx, y=e.clientY+18+dy;
    tip.style.left=Math.max(4,Math.min(x,window.innerWidth-tw-8))+'px';
    tip.style.top=Math.max(4,Math.min(y,bottomLimit-th))+'px';
    return;
  }
  const x=e.clientX+12+dx, y=e.clientY-8+dy;
  tip.style.left=Math.min(x,window.innerWidth-tw-8)+'px';
  // カーソルの上に出せるならそちら、無理なら下。どちらでも背景の下端からはみ出さないよう戻す。
  tip.style.top=Math.max(4,Math.min((y-th>4?y-th:y+16),bottomLimit-th))+'px';
}
function _posTipRelative(tip,anchor,side,clampY=true){
  const ar=anchor.getBoundingClientRect();
  const gap=8;
  const tw=tip.offsetWidth,th=tip.offsetHeight;
  const useBelow=side==='below'||(side==='right-or-below'&&ar.right+gap+tw>window.innerWidth-8);
  const x=useBelow?ar.left:ar.right+gap;
  const y=useBelow?ar.bottom+gap:ar.top;
  tip.style.left=Math.max(4,Math.min(x,window.innerWidth-tw-8))+'px';
  tip.style.top=(clampY?Math.max(4,Math.min(y,window.innerHeight-th-8)):y)+'px';
}
function _fitTooltipStack(tips){
  const shown=tips.filter(el=>el&&el.style.display==='block');
  if(!shown.length) return;
  const bottom=Math.max(...shown.map(el=>el.getBoundingClientRect().bottom));
  const overflow=bottom-_tooltipAreaBottom();
  if(overflow>0){
    shown.forEach(el=>{
      const top=parseFloat(el.style.top)||el.getBoundingClientRect().top;
      el.style.top=Math.max(4,top-overflow)+'px';
    });
  }
}

// 味方の全スロット（MAX_ALLIES件）DOM 要素を配列で返す（lane 対応・ピッカー用）
function _getAllyDomSlots(){
  const arr=[];
  [...(document.getElementById('f-ally')?.querySelectorAll('.slot')||[])].forEach((slot,pos)=>{
    const idx=slot.dataset&&slot.dataset.unitIdx!=null?parseInt(slot.dataset.unitIdx,10):pos;
    arr[idx]=slot;
  });
  return arr;
}

// スロット高さをCSSカスタムプロパティに反映（リサイズ対応）
function _updateLaneOffset(){
  // 実在スロットが計測できれば最も正確
  const anyRow=document.getElementById('f-ally')||document.getElementById('f-enemy');
  const anySlot=anyRow&&anyRow.querySelector('.slot');
  if(anySlot){
    const h=anySlot.getBoundingClientRect().height;
    if(h>0){
      document.documentElement.style.setProperty('--_slot-h',h+'px');
      document.documentElement.style.setProperty('--lane-rear-top',Math.round(h*0.67)+'px');
      return;
    }
  }
  // フォールバック：max-width:1100px を考慮した計算
  const W=Math.min(document.documentElement.clientWidth,1100);
  const slotH=(W-49)/7*88/63;
  document.documentElement.style.setProperty('--_slot-h',Math.round(slotH)+'px');
  document.documentElement.style.setProperty('--lane-rear-top',Math.round(slotH*0.67)+'px');
}

// ── 攻撃ライン描画 ──
(function _initAttackLineSvg(){
  if(document.getElementById('atk-line-svg')) return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id='atk-line-svg';
  svg.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(svg);
})();


function hideAttackLine(){
  const svg=document.getElementById('atk-line-svg');
  if(svg) svg.innerHTML='';
}

function getCurrentUnitSlot(side,idxOrUnit){
  const field=document.getElementById(side==='enemy'?'f-enemy':'f-ally');
  if(!field) return null;
  const list=side==='enemy'?G.enemies:G.allies;
  // コアイベントの再生では、state.units由来のオブジェクトとG配列上の
  // 実体が別参照になることがある。FLIP後の実DOMはunitIdを正として
  // 解決し、VFX・攻撃モーション・召喚完了判定の対象を一致させる。
  const unitId=idxOrUnit&&typeof idxOrUnit==='object'&&idxOrUnit.id!=null
    ?String(idxOrUnit.id):null;
  if(unitId){
    const byId=[...field.querySelectorAll('.slot[data-unit-id]')]
      .find(slot=>String(slot.dataset.unitId||'')===unitId);
    if(byId) return byId;
  }
  const idx=typeof idxOrUnit==='number'?idxOrUnit:list.indexOf(idxOrUnit);
  if(idx<0) return null;
  const found=field.querySelector(`.slot[data-unit-idx="${idx}"]`)||
    field.querySelectorAll('.slot')[idx]||
    null;
  // 死亡後の空きスロットは7枠等間隔の位置にあり、生存時の中央寄せとは別の場所にある。
  // ここを「そのキャラの居場所」として返すと、数値・VFX・攻撃モーションが
  // 何もない場所へ出る。キャラ指定での解決では空きスロットを返さない。
  if(found&&typeof idxOrUnit==='object'&&found.classList&&found.classList.contains('dead-empty')) return null;
  return found;
}

// VFX動画は背景黒で書き出されている。<video>要素はブラウザによってはCSSの
// mix-blend-mode:screenが正しく効かない（動画専用の合成レイヤーで描画されるため）ことがあるので、
// <canvas>に毎フレーム描画し、輝度の低い（黒に近い）ピクセルほど透明にするルミナンスキー処理で
// 黒背景を確実に透過させる。戻り値のcanvasをDOMに追加して使う（videoはcanvasの下に自動追加済み）。
// host：video/canvasを実際に配置する親要素（画面外に置くとChrome等が「非表示の背景動画」と
// 判定し、省電力のため自動一時停止してしまう＝AbortError: video-only background media was
// paused to save power。実際に表示されるhost内に収めることでこれを回避する）。
// zoom：動画フレーム中心付近だけを拡大して描画したい場合の倍率（例：3なら中心1/3四方を全体に拡大）。
// 省略時は1（フレーム全体をそのまま描画）。
function _createLumaKeyedVideoCanvas(videoUrl, className, host, zoom){
  const zoomFactor=Math.max(1,zoom||1);
  const video=document.createElement('video');
  // videoの見た目上の位置・変形はcanvasの描画結果に影響しない（canvasはvideoの現在フレームを
  // ピクセルとしてサンプリングするだけ）。videoは「そこそこの大きさで表示されている」状態を
  // 保てば十分。opacity:0や極小サイズ・画面外配置にすると、Chrome等が「非表示の背景動画」と
  // 判定し省電力のため自動一時停止してしまう（AbortError: video-only background media was
  // paused to save power）ため、それらは避けた静的なスタイルを与える。
  // canvas側は呼び出し元がclassName（位置・アニメーション）を制御して上に重ねて隠す。
  video.src=videoUrl;
  video.muted=true;
  video.autoplay=true;
  video.playsInline=true;
  Object.assign(video.style,{position:'absolute',left:'0',top:'0',width:'60%',height:'60%',opacity:'0.01',pointerEvents:'none'});
  if(host) host.appendChild(video);
  else document.body.appendChild(video);

  const canvas=document.createElement('canvas');
  canvas.className=className;

  let ctx=null;
  let timer=0;
  let stopped=false;
  // requestAnimationFrameはタブが非アクティブ/非表示扱いの場合に発火しないことがあるため
  // （自動操作環境等）、確実に動かすsetTimeoutベースのループを使う。
  const draw=()=>{
    if(stopped) return;
    if(video.paused||video.ended||video.readyState<2){
      timer=setTimeout(draw,32);
      return;
    }
    if(!ctx){
      canvas.width=video.videoWidth||canvas.width||2;
      canvas.height=video.videoHeight||canvas.height||2;
      // 動画本来の縦横比を保つ（CSS側で片方の辺のみ指定している場合に、もう片方をこれで決める）
      canvas.style.aspectRatio=`${canvas.width} / ${canvas.height}`;
      ctx=canvas.getContext('2d',{willReadFrequently:true});
    }
    if(zoomFactor>1){
      const sw=video.videoWidth/zoomFactor, sh=video.videoHeight/zoomFactor;
      const sx=(video.videoWidth-sw)/2, sy=(video.videoHeight-sh)/2;
      ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
    } else {
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
    }
    try{
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=frame.data;
      // しきい値以下の輝度は完全透明、しきい値〜しきい値+softness の間はなだらかに不透明化する
      const threshold=24, softness=60;
      for(let i=0;i<d.length;i+=4){
        const luma=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i+3]=Math.max(0,Math.min(255,(luma-threshold)*(255/softness)));
      }
      ctx.putImageData(frame,0,0);
    }catch(err){
      // getImageDataに失敗した場合、黒背景の生フレームを不透明表示し続けるより、
      // 何も出さない方が見た目の破綻が少ないため canvas をクリアする。
      console.error('[luma-key VFX] getImageData failed, hiding this frame instead of showing an opaque black frame.',err);
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    timer=setTimeout(draw,32);
  };
  draw();
  video.play?.().catch(()=>{});

  const stop=()=>{
    stopped=true;
    clearTimeout(timer);
    video.pause?.();
    video.remove();
  };
  return {video,canvas,stop};
}

// ── 死亡演出：白くボケてから燃えて崩れる ─────────────────────
// カードが盤面から消える直前の見た目をそのまま複製し、#vfx-clip-rootの中で焼き落とす。
// 実スロットは従来どおり即座に空にするため、盤面の詰め直しや当たり判定には影響しない。
const DEATH_BURN_MS=900;
const DEATH_BURN_HOLES=9;      // 焼け穴の数
const DEATH_BURN_SPREAD=78;    // 穴を散らす範囲（大きいほど全面へ広がる）
const DEATH_BURN_EDGE='6%';    // 焼け縁のぼかし幅
const DEATH_BURN_EMBER='9%';   // 火種の帯の太さ
const DEATH_BURN_ROUGH=34;     // 輪郭の歪み量（0で正円のまま）
const DEATH_BURN_FREQ=0.013;   // 歪みの細かさ
const DEATH_BURN_CR_START=-10.9; // 開始時に穴を完全に塞ぐための負のマージン
const DEATH_BURN_CR_END=115;

function _deathBurnRnd(seed){ const x=Math.sin(seed)*10000; return x-Math.floor(x); }

// 穴の配置・大きさ・広がる速さを毎回引き直す。これで同じ崩れ方は二度と起きない。
function _buildDeathBurnPattern(host,seed){
  const masks=[],embers=[];
  for(let i=0;i<DEATH_BURN_HOLES;i++){
    const cx=50+(_deathBurnRnd(seed+i*3.11)-.5)*DEATH_BURN_SPREAD;
    const cy=44+(_deathBurnRnd(seed+i*7.77)-.5)*DEATH_BURN_SPREAD*0.92;
    // 穴ごとに広がる速さを変える（0.55〜1.35倍）。これが虫食いのばらつきになる。
    const k=(0.55+_deathBurnRnd(seed+i*5.31)*0.8).toFixed(2);
    const R='calc(var(--death-cr) * '+k+')';
    const shape='circle at '+cx.toFixed(1)+'% '+cy.toFixed(1)+'%';
    masks.push('radial-gradient('+shape+', transparent '+R+', #000 calc('+R+' + '+DEATH_BURN_EDGE+'))');
    embers.push('radial-gradient('+shape+','
      +' rgba(255,250,225,1) '+R+','
      +' rgba(255,186,64,.95) calc('+R+' + '+DEATH_BURN_EMBER+' * .38),'
      +' rgba(226,86,14,.6) calc('+R+' + '+DEATH_BURN_EMBER+' * .72),'
      +' rgba(120,30,0,0) calc('+R+' + '+DEATH_BURN_EMBER+'))');
  }
  host.style.setProperty('--death-mask',masks.join(','));
  host.style.setProperty('--death-ember',embers.join(','));
}

// 穴の縁を円のままにすると形が幾何学的に見えるため、feDisplacementMapで輪郭を歪ませる。
// CSSではfilterがmaskより先に適用されるので、マスクを掛けた要素を包む親へ当てる。
function _makeDeathBurnFilter(seed){
  const svg=document.getElementById('death-burn-filters');
  if(!svg) return null;
  const id='death-burn-rough-'+Math.round(Math.abs(seed)*97)+'-'+Math.round(Math.random()*100000);
  const NS='http://www.w3.org/2000/svg';
  const f=document.createElementNS(NS,'filter');
  f.setAttribute('id',id);
  f.setAttribute('x','-25%'); f.setAttribute('y','-25%');
  f.setAttribute('width','150%'); f.setAttribute('height','150%');
  f.setAttribute('color-interpolation-filters','sRGB');
  const t=document.createElementNS(NS,'feTurbulence');
  t.setAttribute('type','fractalNoise'); t.setAttribute('numOctaves','4');
  t.setAttribute('baseFrequency',String(DEATH_BURN_FREQ));
  t.setAttribute('seed',String(Math.round(Math.abs(seed)*13)%97)); t.setAttribute('result','n');
  const d=document.createElementNS(NS,'feDisplacementMap');
  d.setAttribute('in','SourceGraphic'); d.setAttribute('in2','n');
  d.setAttribute('scale','0');
  d.setAttribute('xChannelSelector','R'); d.setAttribute('yChannelSelector','G');
  f.appendChild(t); f.appendChild(d); svg.appendChild(f);
  return {id,filter:f,disp:d};
}

// slotNode は再描画前に控えた複製、rect はそのときの画面上の位置。
function playCardBurnAway(slotNode,rect,sourceSize){
  try{
    if(!slotNode||!rect) return;
    if(!(rect.width>0&&rect.height>0)) return;
    const parent=typeof _vfxHostParent==='function'?_vfxHostParent():document.body;
    const seed=Math.random()*1000+1;

    const host=document.createElement('div');
    host.className='death-burn-clone';
    Object.assign(host.style,{
      left:rect.left+'px', top:rect.top+'px',
      width:rect.width+'px', height:rect.height+'px',
    });
    _buildDeathBurnPattern(host,seed);

    // カード本体（マスクで食われる）
    const card=slotNode.cloneNode(true);
    card.className='death-burn-card '+slotNode.className;
    card.removeAttribute('id');
    card.style.cssText='';
    // 前衛スロットの位置識別クラス（.is-front）が持つ赤いborder-topを、
    // body直下へ移した死亡演出クローンには引き継がない。
    card.style.setProperty('border','0','important');
    card.style.setProperty('border-top','0','important');
    card.style.setProperty('outline','0','important');
    card.style.setProperty('box-shadow','none','important');
    // 戦闘画面は3840x2160の内部座標を親要素で縮小している。クローンをbody直下へ
    // 移すと親の縮小が外れ、カード内部だけが巨大化するため、元のレイアウト寸法で複製して
    // getBoundingClientRect()の表示寸法までクローン全体を縮小する。
    const sourceW=Math.max(1,Number(sourceSize?.width)||Number(slotNode.dataset?.deathSourceWidth)||rect.width);
    const sourceH=Math.max(1,Number(sourceSize?.height)||Number(slotNode.dataset?.deathSourceHeight)||rect.height);
    card.style.setProperty('position','absolute','important');
    card.style.setProperty('left','0','important');
    card.style.setProperty('top','0','important');
    card.style.setProperty('width',sourceW+'px','important');
    card.style.setProperty('min-width',sourceW+'px','important');
    card.style.setProperty('max-width',sourceW+'px','important');
    card.style.setProperty('height',sourceH+'px','important');
    card.style.setProperty('min-height',sourceH+'px','important');
    card.style.setProperty('max-height',sourceH+'px','important');
    card.style.setProperty('aspect-ratio','auto','important');
    card.style.setProperty('transform-origin','0 0','important');
    card.style.setProperty('transform',`scale(${rect.width/sourceW},${rect.height/sourceH})`,'important');
    const flash=document.createElement('div');
    flash.className='death-burn-flash';
    card.appendChild(flash);

    const warpCard=document.createElement('div');
    warpCard.className='death-burn-warp';
    warpCard.appendChild(card);

    // 焼け縁の火（本体とは別要素。カードが欠けても火は残す）
    const ember=document.createElement('div');
    ember.className='death-burn-ember';
    const warpEmber=document.createElement('div');
    warpEmber.className='death-burn-warp';
    warpEmber.appendChild(ember);

    host.appendChild(warpCard);
    host.appendChild(warpEmber);
    parent.appendChild(host);

    // 輪郭の歪みはSVG属性なのでCSSアニメーションで動かせない。進行度を読んで書き換える。
    const fx=_makeDeathBurnFilter(seed);
    if(fx){
      warpCard.style.filter='url(#'+fx.id+')';
      warpEmber.style.filter='url(#'+fx.id+')';
    }
    const span=DEATH_BURN_CR_END-DEATH_BURN_CR_START;
    const timer=window.setInterval(()=>{
      if(!host.isConnected){ window.clearInterval(timer); return; }
      if(!fx) return;
      const cr=parseFloat(getComputedStyle(host).getPropertyValue('--death-cr'))||DEATH_BURN_CR_START;
      const t=Math.max(0,Math.min(1,(cr-DEATH_BURN_CR_START)/span));
      // 燃え始めた瞬間から縁は乱れていてほしい。進行度に素直に比例させると
      // 穴が小さいうちは歪みも小さく、正円のリングに見えてしまう。
      const w=t>0.004?(0.6+0.4*Math.pow(t,0.7)):0;
      fx.disp.setAttribute('scale',(DEATH_BURN_ROUGH*w).toFixed(1));
    },33);

    // 後片付けは「実際にアニメーションが終わったとき」に行う。固定時間で消すと、
    // 重い処理でアニメーションの開始が遅れた場合に再生途中で消えてしまう。
    let cleaned=false;
    const cleanup=()=>{
      if(cleaned) return; cleaned=true;
      window.clearInterval(timer);
      window.clearTimeout(fallback);
      host.remove();
      if(fx&&fx.filter&&fx.filter.parentNode) fx.filter.parentNode.removeChild(fx.filter);
    };
    host.addEventListener('animationend',ev=>{
      if(ev.target===host&&ev.animationName==='death-burn') cleanup();
    });
    // animationendが来ない環境・中断された場合の保険（十分に長く取る）
    const fallback=window.setTimeout(cleanup,DEATH_BURN_MS+4000);
  }catch(e){ console.error('[playCardBurnAway]',e); }
}

// 死亡効果の解決を待たず、死亡が確定した瞬間のカードから演出を開始する。
// これにより、闇の炎など非同期の死亡効果がある場合も演出が遅れず、攻撃モーション後の
// 盤面詰めで死亡ユニットが配列から除かれる前に確実に複製元を確保できる。
function playUnitDeathBurn(unit,side){
  if(!unit||unit.hp>0||unit._deathFxDone) return false;
  const slot=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,unit):null;
  if(!slot) return false;
  const rect=slot.getBoundingClientRect();
  if(!(rect.width>0&&rect.height>0)) return false;
  const clone=slot.cloneNode(true);
  unit._deathFxDone=true;
  slot.style.setProperty('visibility','hidden','important');
  playCardBurnAway(clone,rect,{width:slot.offsetWidth,height:slot.offsetHeight});
  return true;
}

// 演出用ホストの追加先。fixed要素をtransform付きの#vfx-clip-rootへ入れると、
// 実機ブラウザによってはfixed座標の基準が変わり、カード上のVFXが画面外へ配置される。
// ダメージ演出は実カードのgetBoundingClientRect()を絶対座標として使うため、body直下に置く。
// 背景外へ出ないことより、命中位置へ確実に表示されることを優先する。
function _vfxHostParent(){
  return document.body;
}

// 勝利・敗北が確定した時点で、再生中の全VFX（ダメージ演出／特殊演出／薙ぎ払い演出）を
// 即座に打ち切ってDOMから除去する。演出用の各hostは常にdocument.body直下へfixedで
// 追加されるため、専用クラスで一括除去すればどの演出タイミングで戦闘が終わっても残らない。
function _forceStopAllVfx(options){
  const preserveDamage=!!(options&&options.preserveDamage);
  // 戦闘画面のVFXは複数の親（#vfx-clip-root／#scr-battle／body）に
  // 生成されるため、戦闘終了時は一時要素を種類を問わずまとめて除去する。
  const selectors=(preserveDamage?'':'.damage-vfx-host,.damage-label-host,')+
    '.special-vfx-clip,.special-vfx-host,.sweep-vfx-clip,.sweep-vfx-host,'+
    '.attack-motion-clone,.death-burn-clone,.battle-opening-appearance-vfx,#battle-start-intro'
  document.querySelectorAll(selectors).forEach(el=>el.remove());
  // 死亡演出のSVGフィルタ定義も次の画面へ持ち越さない。
  const deathFilters=document.getElementById('death-burn-filters');
  if(deathFilters) deathFilters.replaceChildren();
  if(window.__activeVfxPromises&&!preserveDamage) window.__activeVfxPromises.clear();
}

// ダメージ数値ラベルの表示時間。同じキャラクターへ連続してダメージを出す側
// （battle.js）が「前の数値が消えるまで待つ」ためにも使うので、式はここ1か所に置く。
function damageLabelDurationMs(labelDuration){
  const speedMul=(typeof G!=='undefined'&&G&&Number(G._effectVfxSpeedMultiplier))||1;
  return Math.max(600,(Number(labelDuration)||950)/speedMul);
}

function playHitVfxAtRect(rect,amount,options){
  if(!rect) return Promise.resolve();
  const opt=options||{};
  // マナ・負傷効果が短時間に大量発動する場面向けの演出高速化倍率（既定1＝通常速度）。
  // _stepEffectPace()（battle.js）が発動のたびに更新する。
  const speedMul=(typeof G!=='undefined'&&G&&Number(G._effectVfxSpeedMultiplier))||1;
  // 撃破後の盤面詰めがVFX完了を待つようになったため、既定尺のままだと1体倒すごとに
  // 待ち時間が上乗せされてテンポが悪化する。表示・消失とも少し早める。
  const hitDuration=(opt.hitDuration||800)/speedMul;
  const fadeDuration=(opt.fadeDuration||140)/speedMul;
  const labelDuration=damageLabelDurationMs(opt.labelDuration);
  // 見た目の再生時間（hitDuration）と、次の行動に進むまで呼び出し元が待つ時間は切り離す。
  // hitDurationはあくまで演出を見やすくスローにするためのもので、これに比例して攻撃間の
  // テンポまで間延びしないよう、呼び出し元への復帰は短いgateMsだけ待てば十分とする。
  // 演出自体はgateMs経過後もバックグラウンドで最後まで再生・フェードアウトを続ける。
  const gateMs=(opt.gateMs??200)/speedMul;
  if(!rect.width||!rect.height) return Promise.resolve();
  const host=document.createElement('div');
  host.className='damage-vfx-host';
  Object.assign(host.style,{
    left:`${rect.left}px`,
    top:`${rect.top}px`,
    width:`${rect.width}px`,
    height:`${rect.height}px`,
  });
  // キャラクターの効果でダメージが発生した場合、そのキャラクター専用のVFXがあればそれを再生する。
  // 無ければ通常のhit（既定はWebP）を使う。
  const charVfx=opt.effectSource&&typeof getCharacterEffectVfxPath==='function'?getCharacterEffectVfxPath(opt.effectSource):'';
  // キャラクター固有VFXが無い場合、毒等キーワード発動によるダメージならキーワード専用のVFXを探す。
  const keywordVfx=!charVfx&&opt.keywordEffect&&typeof getKeywordEffectVfxPath==='function'?getKeywordEffectVfxPath(opt.keywordEffect):'';
  // labelOnly：命中VFXを出さず、ダメージ数値だけを出す。
  // 薙ぎ払い（アラッサス）のように演出を別で持つ効果で、数値まで消さないために使う。
  const labelOnly=!!opt.labelOnly;
  const hitUrl=charVfx||keywordVfx||Assets?.vfx?.hit||'assets/vfx/hit.webp';
  // キャラクター固有VFXの大きさは present.js が唯一の実装。
  // 明示指定が無いときは素材の番号から決める（指定しないと等倍で巨大に出る）。
  const charVfxCode=charVfx?((String(charVfx).match(/([A-Za-z]\d{3})\.[a-z0-9]+$/)||[])[1]||''):'';
  const vfxScale=Number(opt.vfxScale)
    ||(charVfxCode&&typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(charVfxCode):1);
  const spin=!!opt.spin;
  const baseTransform=`translate(-50%,-50%) scale(${vfxScale})`;
  _vfxHostParent().appendChild(host);
  let labelHost=null;

  const isWebp=labelOnly?true:/\.webp(\?|$)/i.test(hitUrl);
  let mediaEl,stop,videoRef=null;
  if(labelOnly){
    // 数値だけを出す。命中VFXの絵は作らず、尺の管理だけ同じ経路に乗せる。
    mediaEl=document.createElement('div');
    mediaEl.className='vfx vfx-hit-video';
    mediaEl.style.display='none';
    host.appendChild(mediaEl);
    stop=()=>{};
  } else if(isWebp){
    // 透過済みWebPアニメーション（黒背景は変換時に透過済み）。canvasでのルミナンスキー処理は不要で、
    // imgでそのまま再生するだけでよい。再生時間・ズームも変換時に焼き込み済み。
    mediaEl=document.createElement('img');
    mediaEl.className='vfx vfx-hit-video';
    mediaEl.alt='';
    // 同一URLの<img>を短時間に連続生成すると、ブラウザによっては再生状態が共有され
    // ループ位置がずれて見えることがあるため、インスタンスごとに独立した画像として
    // 扱わせるためのダミークエリを付与する。
    mediaEl.src=hitUrl+(hitUrl.includes('?')?'&':'?')+'_r='+Math.random();
    host.appendChild(mediaEl);
    stop=()=>{};
  } else {
    const created=_createLumaKeyedVideoCanvas(hitUrl,'vfx vfx-hit-video',host,opt.zoom||2);
    mediaEl=created.canvas;
    stop=created.stop;
    videoRef=created.video;
    mediaEl.style.setProperty('--hit-vfx-duration',`${hitDuration}ms`);
    // hit.mp4自体は0.8秒程度と短いため、等速のままだと一瞬で終わり早すぎて見える。
    // hitDuration（既定1400ms）まで間延びさせるよう再生速度を落とし、スローモーションにする。
    videoRef.addEventListener('loadedmetadata',()=>{
      if(videoRef.duration&&isFinite(videoRef.duration)&&videoRef.duration>0){
        videoRef.playbackRate=Math.min(16,Math.max(0.25,videoRef.duration/(hitDuration/1000)));
      }
    },{once:true});
    host.appendChild(mediaEl);
  }
  mediaEl.style.transform=baseTransform;
  if(amount>0){
    const label=document.createElement('div');
    label.className='vfx-damage-label';
    label.textContent=`-${amount}`;
    label.style.setProperty('--damage-label-duration',`${labelDuration}ms`);
    // 数値はVFXホストのスタッキングコンテキストから分離し、常に全VFXより前面へ出す。
    labelHost=document.createElement('div');
    labelHost.className='damage-label-host';
    // 同じ位置に前の数値が残っていると重なって読めない。連続表示では
    // 前の数値を消してから次を出す（同じ対象の古いラベルだけを消す）。
    const labelKey=opt.labelKey||`${Math.round(rect.left)}:${Math.round(rect.top)}`;
    labelHost.dataset.damageLabelKey=String(labelKey);
    document.querySelectorAll(`.damage-label-host[data-damage-label-key="${String(labelKey).replace(/"/g,'\\"')}"]`)
      .forEach(old=>old.remove());
    Object.assign(labelHost.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    document.body.appendChild(labelHost);
    labelHost.appendChild(label);
    const damageDigits=String(Math.max(0,Math.floor(Math.abs(Number(amount)||0)))).length;
    if(damageDigits>=3){
      // 3桁から少しずつ縮小し、桁数が増え続けてもカード幅からはみ出さないようにする。
      // damage-label-animationの最大scaleが1.3なので、通常幅をカード幅以下に収めれば
      // アニメーション中もキャラクター画像幅の1.3倍を超えない。
      const baseFontSize=parseFloat(getComputedStyle(label).fontSize)||60;
      const digitScale=Math.pow(.9,damageDigits-2);
      label.style.fontSize=`${baseFontSize*digitScale}px`;
      const labelWidth=label.scrollWidth;
      if(labelWidth>rect.width&&labelWidth>0){
        label.style.fontSize=`${baseFontSize*digitScale*(rect.width/labelWidth)}px`;
      }
    }
  }
  // 演出本体の後始末（フェードアウト→DOM除去）はgateMsとは無関係に、演出の実時間に沿って
  // バックグラウンドで進行させる。呼び出し元（戦闘ループ）はこれを待たない。
  let done=false;
  let fadeStarted=false;
  // 盤面の詰め直し（FLIP）でカードは演出中にも動く。位置を出した時のまま固定すると、
  // 数値やVFXが「何もない場所」に取り残される。対象カードの現在位置へ毎フレーム追従させる。
  if(typeof opt.getRect==='function'){
    let hadRect=false,missed=0;
    const follow=()=>{
      if(done) return;
      let r=null;
      try{ r=opt.getRect(); }catch(e){ r=null; }
      if(r&&r.width>0&&r.height>0){
        hadRect=true; missed=0;
        const box={left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`};
        Object.assign(host.style,box);
        if(labelHost) Object.assign(labelHost.style,box);
      } else if(hadRect&&++missed>2){
        // 対象カードが盤面から消えた。数値だけが空白の上に残ると
        // 「何もない場所に数値が出ている」ように見えるため、ここで畳む。
        finish();
        return;
      }
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }
  const notifyFadeStart=()=>{
    if(fadeStarted) return;
    fadeStarted=true;
    if(typeof opt.onFadeStart==='function'){
      try{ opt.onFadeStart(); }catch(e){ console.error('[HitVfx onFadeStart]',e); }
    }
  };
  let resolveComplete;
  const completePromise=new Promise(resolve=>{ resolveComplete=resolve; });
  const activeVfx=window.__activeVfxPromises||(window.__activeVfxPromises=new Set());
  activeVfx.add(completePromise);
  completePromise.finally(()=>activeVfx.delete(completePromise));
  const finish=()=>{
    if(done) return; done=true;
    notifyFadeStart();
    stop();
    mediaEl.style.transition=`opacity ${fadeDuration}ms ease-out`;
    // transitionプロパティを設定した直後に同じフレーム内でopacityを変更すると、ブラウザによっては
    // トランジションが認識されずopacity:0へ瞬時にジャンプしてしまう（消え方が不自然に見える原因）。
    // 一度スタイルを強制的に確定させてから変更することで、確実にフェードアニメーションとして扱わせる。
    void mediaEl.offsetWidth;
    mediaEl.style.opacity='0';
    setTimeout(()=>{ host.remove(); labelHost?.remove(); resolveComplete(); },fadeDuration);
  };
  if(isWebp){
    // 素材自体の再生がhitDurationより先に終わり最後のコマで静止した後、finish()の
    // フェード開始をhitDurationまで待つ形だと「一瞬静止してから唐突に消える」不自然な
    // 見た目になる。hitDuration全体を1本のアニメーションとして扱い、終盤（fadeDuration分）
    // にかけて動きを止めずに滑らかにフェードアウトさせる。
    const fadeStartRatio=Math.max(0,Math.min(1,1-fadeDuration/hitDuration));
    const finishWebp=()=>{ if(done) return; done=true; host.remove(); labelHost?.remove(); resolveComplete(); };
    // 素材が重い（K026＝6.6MB等）と、デコードが終わる前にフェードと破棄タイマーが
    // 走り切り、1コマも描かれないまま消える。＝マナ効果VFXが出ない原因。
    // 画像が使える状態になってから尺を数え始める。読み込めない場合に止まらないよう、
    // 待つのは最大1.5秒まで。
    const startWebpPlayback=()=>{
      if(done) return;
      if(typeof mediaEl.animate==='function'){
        const anim=mediaEl.animate([
          {opacity:1,offset:0},
          {opacity:1,offset:fadeStartRatio},
          {opacity:0,offset:1},
        ],{duration:hitDuration,easing:'ease-out',fill:'forwards'});
        anim.addEventListener('finish',finishWebp,{once:true});
      }else{
        // iOS等でWeb Animations APIが無い場合も、VFX自体を例外で中断させない。
        // フェードは省略し、素材を表示したまま所定時間後に確実に破棄する。
        mediaEl.style.opacity='1';
      }
      if(spin&&typeof mediaEl.animate==='function') mediaEl.animate([
        {transform:`${baseTransform} rotate(0deg)`},
        {transform:`${baseTransform} rotate(360deg)`},
        {transform:`${baseTransform} rotate(1440deg)`},
      ],{duration:hitDuration,easing:'linear',fill:'forwards'});
      setTimeout(finishWebp,hitDuration+60);
      setTimeout(notifyFadeStart,Math.max(0,hitDuration-fadeDuration));
    };
    if(labelOnly||(mediaEl.complete&&mediaEl.naturalWidth>0)){
      startWebpPlayback();
    }else{
      let started=false;
      const begin=()=>{ if(started) return; started=true; startWebpPlayback(); };
      mediaEl.addEventListener('load',begin,{once:true});
      mediaEl.addEventListener('error',begin,{once:true});
      setTimeout(begin,1500);
    }
  } else {
    videoRef.addEventListener('ended',finish,{once:true});
    // 再生速度調整が効かない場合（メタデータ取得失敗等）の保険。通常はvideoのendedで先に終わる。
    setTimeout(finish,opt.maxDuration||Math.max(1000,hitDuration+400));
    setTimeout(notifyFadeStart,Math.max(0,hitDuration-fadeDuration));
  }
  // 呼び出し元への復帰はgateMsのみ待つ（次の攻撃・演出再開のテンポを演出の長さに引きずられないようにする）。
  // WebPは読み込み完了後に startWebpPlayback() 側で回転もかける。
  // ここで先に回すと、デコード待ちの間に回転だけ終わってしまう。
  if(spin&&!isWebp){
    if(typeof mediaEl.animate==='function') mediaEl.animate([
      {transform:`${baseTransform} rotate(0deg)`},
      {transform:`${baseTransform} rotate(360deg)`},
      {transform:`${baseTransform} rotate(1440deg)`},
    ],{duration:hitDuration,easing:'linear',fill:'forwards'});
  }
  return opt.waitForFinish?completePromise:new Promise(resolve=>setTimeout(resolve,gateMs));
}

function playHitVfxOnSlot(slot,amount,options){
  if(!slot) return Promise.resolve();
  const rect=slot.getBoundingClientRect();
  return playHitVfxAtRect(rect,amount,options);
}

// ATKが0になったキャラクターの逃走表示。カード中央へ「FLED」を1文字ずつ落とし、
// 文字を消してからカードを暗くフェードアウトさせる（死亡演出は使わない）。
// カード幅から文字サイズを決めるので、枠からはみ出さない。
async function playFledVfx(side, unit){
  const slot=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,unit):null;
  if(!slot) return;
  const label=document.createElement('div');
  label.className='fled-label';
  const rect=slot.getBoundingClientRect();
  if(rect.width>0) label.style.fontSize=`${Math.max(12,Math.round(rect.width*0.30))}px`;
  const letters='FLED'.split('');
  const stepMs=90;
  letters.forEach((ch,i)=>{
    const span=document.createElement('span');
    span.textContent=ch;
    span.style.animationDelay=`${i*stepMs}ms`;
    label.appendChild(span);
  });
  slot.appendChild(label);
  // 全文字が落ち切ってから少し見せる。
  await new Promise(r=>setTimeout(r,letters.length*stepMs+420));
  // 文字はカードのフェードアウトより前に消す。
  label.remove();
  slot.classList.add('fled-unit');
  await new Promise(r=>setTimeout(r,460));
}
if(typeof window!=='undefined') window.playFledVfx=playFledVfx;

// ── 薙ぎ払いの見せ方（PvEとオンラインで唯一の実装）──────────────
// 対象ごとの命中VFXを出す代わりに、攻撃者から炎が薙ぎ払い、当たった瞬間に
// その対象のダメージ数値を出す。片側だけ別実装にすると、オンラインだけ
// 対象ごとに固有VFXが3回出る、といった食い違いになる。
//   damageOf(target) … その対象のダメージイベント（{amount, keywordEffect}）を返す
//   onShown(target, ev) … 数値を出した対象を呼び出し側へ知らせる（二重表示の抑止用）
async function presentSweepAttack(source,isEnemySide,targets,damageOf,onShown){
  if(!source||!targets||!targets.length) return false;
  const url=typeof getCharacterSweepVfxPath==='function'?getCharacterSweepVfxPath(source):'';
  if(!url||typeof playCharacterSweepVfx!=='function') return false;
  const targetSide=isEnemySide?'ally':'enemy';
  await playCharacterSweepVfx(source,isEnemySide,targets,url,{
    onTargetHit:target=>{
      if(!target) return;
      const ev=typeof damageOf==='function'?damageOf(target):null;
      const amount=Math.max(0,Number(ev&&ev.amount)||0);
      if(!(amount>0)) return;
      if(typeof onShown==='function') onShown(target,ev);
      if(typeof updateUnitDamageUi==='function') updateUnitDamageUi(target,targetSide);
      // 命中VFXと数値の両方を、炎が当たった瞬間に出す。
      if(typeof playHitVfx==='function') playHitVfx(targetSide,target,amount,
        {...(ev&&ev.keywordEffect?{keywordEffect:ev.keywordEffect}:{})});
    },
  });
  return true;
}

function playHitVfx(side,idxOrUnit,amount,options){
  // 同じキャラクターへ続けて数値が出る時、前の数値を消してから次を出せるよう
  // 対象を識別する鍵を渡す（渡さないと座標で判定するため、盤面が動くと重なる）。
  const unitId=idxOrUnit&&typeof idxOrUnit==='object'?idxOrUnit.id:idxOrUnit;
  const liveRect=()=>{
    const s=getCurrentUnitSlot(side,idxOrUnit);
    if(s&&!(s.classList&&s.classList.contains('dead-empty'))){
      const r=s.getBoundingClientRect();
      if(r&&r.width>0&&r.height>0) return r;
    }
    return (idxOrUnit&&typeof idxOrUnit==='object'?idxOrUnit._lastVisualRect:null)||null;
  };
  const opt={...(options||{}),getRect:(options&&options.getRect)||liveRect,
    ...(unitId!=null?{labelKey:`u:${unitId}`}:{})};
  const slot=getCurrentUnitSlot(side,idxOrUnit);
  // 空きスロット（死亡後の枠）は7枠等間隔の位置にあり、生存時の中央寄せとは別物。
  // そこへ数値を出すと「何もない場所」に見えるので、直前のカード位置を使う。
  const dead=!slot||(slot.classList&&slot.classList.contains('dead-empty'));
  if(dead){
    const last=idxOrUnit&&typeof idxOrUnit==='object'?idxOrUnit._lastVisualRect:null;
    if(last&&last.width>0&&last.height>0) return playHitVfxAtRect(last,amount,opt);
    if(!slot) return Promise.resolve();
  }
  return playHitVfxOnSlot(slot,amount,opt);
}

function _battleBackgroundFrameRect(){
  const scr=document.getElementById('scr-battle');
  const r=scr?.getBoundingClientRect?.();
  if(!r||!r.width||!r.height) return {left:0,top:0,width:window.innerWidth||3840,height:window.innerHeight||2160,scale:1};
  const scale=r.width/3840;
  return {left:r.left,top:r.top,width:r.width,height:r.height,scale};
}

// ── 特殊演出（生贄破棄・封印解放）── 「特殊演出」シートのS002/S003用の汎用再生関数。
// 対象カードの上にWebPを表示してSFXを再生し、forwardMsが経過したらonMidpoint()を呼びつつ
// （カードの消去・解封などの実処理はここで行う）、直近forwardMs分に実際に描画されたフレームを
// canvasへ毎フレーム記録しておき、それをreverseMsかけて逆順に再生する（＝WebPの逆再生）。
// file://運用のためfetch/XMLHttpRequestで生バイトを読めない（ImageDecoderが使えない）制約があり、
// 代わりに<img>が実際に表示した見た目をcanvasにdrawImage()で記録→逆順描画する方式にしている。
function playSpecialProductionVfx(slot, sfxKey, vfxUrl, onMidpoint, options){
  const opt=options||{};
  const forwardMs=opt.forwardMs??200;
  const reverseMs=opt.reverseMs??200;
  const finishMidpoint=()=>{ if(onMidpoint) try{ onMidpoint(); }catch(e){ console.error('[SpecialVfx onMidpoint]',e); } };
  if(!slot||!vfxUrl){ finishMidpoint(); return Promise.resolve(); }
  const rect=slot.getBoundingClientRect();
  if(!rect.width||!rect.height){ finishMidpoint(); return Promise.resolve(); }
  if(sfxKey&&typeof playSfx==='function') playSfx(sfxKey,{group:'magic'});
  const clipRect=_battleBackgroundFrameRect();
  const clip=document.createElement('div');
  clip.className='special-vfx-clip';
  Object.assign(clip.style,{
    position:'fixed',
    left:`${clipRect.left}px`,
    top:`${clipRect.top}px`,
    width:`${clipRect.width}px`,
    height:`${clipRect.height}px`,
    zIndex:opt.zIndex??10001,
    pointerEvents:'none',
    overflow:'hidden',
  });
  const host=document.createElement('div');
  host.className='special-vfx-host';
  const scale=Math.max(1,Number(opt.scale)||1);
  const hostW=rect.width*scale, hostH=rect.height*scale;
  const hostLeft=rect.left+(rect.width-hostW)/2;
  const hostTop=opt.anchor==='bottom'
    ? rect.top+rect.height-hostH*0.62
    : rect.top+(rect.height-hostH)/2;
  const offsetY=Number(opt.offsetY)||0;
  Object.assign(host.style,{
    position:'absolute',left:`${hostLeft-clipRect.left}px`,top:`${hostTop+offsetY-clipRect.top}px`,
    width:`${hostW}px`,height:`${hostH}px`,
    pointerEvents:'none',overflow:'visible',
  });
  clip.appendChild(host);
  _vfxHostParent().appendChild(clip);
  const img=document.createElement('img');
  img.className='special-vfx-img';
  img.alt='';
  img.style.cssText=`position:absolute;inset:0;width:100%;height:100%;object-fit:${opt.fit||'cover'};object-position:${opt.objectPosition||'center center'};`;
  img.src=vfxUrl+(vfxUrl.includes('?')?'&':'?')+'_r='+Math.random();
  host.appendChild(img);
  const w=Math.max(1,Math.round(hostW)), h=Math.max(1,Math.round(hostH));
  const frames=[];
  let capturing=true;
  const captureLoop=()=>{
    if(!capturing) return;
    try{
      const c=document.createElement('canvas');
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      frames.push(c);
    }catch(e){ /* デコード前フレーム等はスキップ */ }
    if(capturing) requestAnimationFrame(captureLoop);
  };
  requestAnimationFrame(captureLoop);
  return new Promise(resolve=>{
    setTimeout(()=>{
      capturing=false;
      finishMidpoint();
      img.style.display='none';
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
      host.appendChild(canvas);
      const ctx=canvas.getContext('2d');
      const seq=frames.slice().reverse();
      let finished=false;
      let watchdog=null;
      const cleanup=()=>{
        if(finished) return;
        finished=true;
        if(watchdog){ clearTimeout(watchdog); watchdog=null; }
        clip.remove();
        resolve();
      };
      // 逆再生はrequestAnimationFrameで進めるが、タブが非表示・最小化・スロットリング中は
      // フレームが来ない。ここで止まると戦闘フロー全体が固まって進まなくなるため、
      // 必ず有限時間で終わる番人を置く。演出が途中で切れても戦闘は続けること。
      watchdog=setTimeout(cleanup,reverseMs+1500);
      if(!seq.length){ setTimeout(cleanup,reverseMs); return; }
      const started=performance.now();
      const step=now=>{
        if(finished) return;
        const elapsed=now-started;
        if(elapsed>=reverseMs){ cleanup(); return; }
        const progress=Math.max(0,Math.min(1,elapsed/reverseMs));
        const i=Math.min(seq.length-1,Math.floor(progress*seq.length));
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(seq[i],0,0);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },forwardMs);
  });
}

// S002/S003は元動画が長尺のため、順再生後に直近フレームを逆順に描画して折り返す。
const _SPECIAL_VFX_TIMING={forwardMs:750,reverseMs:750};
const _SEAL_RELEASE_VFX_TIMING={forwardMs:1750,reverseMs:1750};

// 生贄キャラを1体、S003演出付きで破棄する（封印解放の生贄コスト用）
function playSacrificeDestroyVfx(unit, side, onReverseStart){
  const slot=getCurrentUnitSlot(side,unit);
  const url=Assets?.vfx?.specialProduction?.S003||'';
  const slotH=slot?.getBoundingClientRect?.().height||0;
  return playSpecialProductionVfx(slot,'S003',url,()=>{
    unit.hp=0;
    unit._deathProcessed=true;
    unit._dp=true;
    unit._sacrificedForSeal=true;
    if(slot){
      slot.style.setProperty('transition','none','important');
      slot.style.setProperty('opacity','0','important');
    }
    if(typeof onReverseStart==='function'){
      try{ onReverseStart(unit); }catch(e){ console.error('[Sacrifice onReverseStart]',e); }
    }
  },{..._SPECIAL_VFX_TIMING,scale:4,fit:'cover',offsetY:-slotH*0.15});
}

// 封印を1体、S002演出付きで解放する
function playSealReleaseVfx(unit, side){
  const slot=getCurrentUnitSlot(side,unit);
  const url=Assets?.vfx?.specialProduction?.S002||'';
  const slotH=slot?.getBoundingClientRect?.().height||0;
  const fadeMs=Math.max(0,_SEAL_RELEASE_VFX_TIMING.forwardMs+_SEAL_RELEASE_VFX_TIMING.reverseMs-250);
  if(slot){
    slot.querySelectorAll('.seal-cost-badge').forEach(el=>{ el.style.display='none'; });
    const fadeEls=[...slot.children].filter(el=>!el.classList.contains('seal-cost-badge')&&!el.classList.contains('unit-hit-layer'));
    fadeEls.forEach(el=>{
      el.style.setProperty('transition',`filter ${fadeMs}ms ease-out`,'important');
      el.style.setProperty('filter','brightness(.45) saturate(.65)','important');
    });
    // CSSの.sealed-unit子要素暗転を外した後、次フレームでインラインfilterを解除し、
    // S002の順再生+逆再生と同じ尺で明るくする。
    slot.classList.remove('sealed-unit');
    requestAnimationFrame(()=>fadeEls.forEach(el=>el.style.setProperty('filter','brightness(1) saturate(1)','important')));
    setTimeout(()=>{
      fadeEls.forEach(el=>el.style.removeProperty('transition'));
      fadeEls.forEach(el=>el.style.removeProperty('filter'));
    },fadeMs+40);
  }
  return playSpecialProductionVfx(slot,'S002',url,()=>{
    unit._sealed=false;
    delete unit._sealValue;
  },{..._SEAL_RELEASE_VFX_TIMING,scale:3,fit:'cover',objectPosition:'center center',offsetY:-slotH*0.05});
}

// キャラクター専用エフェクトのうち、対象1体に重ねるのではなく、攻撃キャラクターを起点に
// 対象範囲（最も左〜最も右）を薙ぎ払うように再生する特別な動画を持つキャラクター。
// 現状はC043（アラッサス）のみの例外対応。
const _SWEEP_STYLE_EFFECT_CODES=new Set(['C043']);

// 薙ぎ払いWebP素材のうち、周囲に透明マージンを持つもの（フレーム全体を使っていない）だけ、
// 実際に絵が描かれている領域をフレーム全体に対する比率で指定する。値は全フレームの非透明
// ピクセル外接矩形の和集合から算出したもの。マージンを持たない素材は登録不要（未登録の場合は
// _SWEEP_VFX_FIT側でcontain指定になり、素材本来の縦横比を保ったまま自動的にフィットする）。
const _SWEEP_VFX_CROP={};

function isSweepStyleEffectVfx(unit){
  if(!unit||typeof _assetCodeRaw!=='function'||typeof _normalizeAssetCode!=='function') return false;
  const raw=_assetCodeRaw(unit);
  if(!raw) return false;
  const code=_normalizeAssetCode(raw,'C');
  return !!(code&&_SWEEP_STYLE_EFFECT_CODES.has(code));
}

// 攻撃キャラクターのカード先端を起点に、実際の距離・角度で対象群（最も左〜最も右、最も近い〜最も遠い）
// まで届く長さで炎を伸ばし、対象の角度範囲を回転しながら薙ぎ払うように動画を再生する。
// SEと合わせるため、再生時間（sweepDuration）は対象数・回転量に関わらず常に一定にする。
function playCharacterSweepVfx(unit,isEnemySide,targets,videoUrl,options){
  if(!videoUrl) return Promise.resolve();
  const opt=options||{};
  const sweepDuration=opt.sweepDuration||700;
  const sourceSlot=getCurrentUnitSlot(isEnemySide?'enemy':'ally',unit);
  const targetSlots=(targets||[]).map(t=>getCurrentUnitSlot(isEnemySide?'ally':'enemy',t)).filter(Boolean);
  if(!sourceSlot||!targetSlots.length) return Promise.resolve();
  const sourceRect=sourceSlot.getBoundingClientRect();
  // カード先端（味方なら上端＝敵陣営へ向く側）を発生源にする
  // カード中央ではなく、やや左寄り（口元付近を想定）を発生源にする
  const originX=sourceRect.left+sourceRect.width*0.25;
  const originY=isEnemySide?sourceRect.bottom:sourceRect.top;

  // 発生源から見た各対象の実際の角度・距離を計算する。これにより対象が1体で近くても、
  // 遠く（後衛）でも、正しい長さ・向きで炎が届く。
  const targetRects=targetSlots.map(s=>s.getBoundingClientRect());
  const points=targetRects.map(r=>({x:r.left+r.width/2,y:r.top+r.height/2}));
  const angles=points.map(p=>Math.atan2(p.y-originY,p.x-originX)*180/Math.PI);
  const distances=points.map(p=>Math.hypot(p.x-originX,p.y-originY));
  const minAngle=Math.min(...angles), maxAngle=Math.max(...angles);
  const midAngle=(minAngle+maxAngle)/2;
  const halfSpread=Math.max(0,(maxAngle-minAngle)/2);
  const maxDist=Math.max(...distances);
  // 最も遠い対象（後衛）まで確実に届くよう、少し余裕を持たせた長さにする
  // （ユーザー確認により、届く長さをさらに2倍に調整済み）
  const length=Math.max(80,maxDist*1.2)*2;
  const startAngle=midAngle-halfSpread, endAngle=midAngle+halfSpread;

  const clipRect=_battleBackgroundFrameRect();
  const clip=document.createElement('div');
  clip.className='sweep-vfx-clip';
  Object.assign(clip.style,{
    position:'fixed',
    left:`${clipRect.left}px`,
    top:`${clipRect.top}px`,
    width:`${clipRect.width}px`,
    height:`${clipRect.height}px`,
    zIndex:10021,
    pointerEvents:'none',
    overflow:'hidden',
  });
  const host=document.createElement('div');
  host.className='sweep-vfx-host';
  Object.assign(host.style,{
    position:'absolute',
    left:`${originX-clipRect.left}px`,
    top:`${originY-clipRect.top}px`,
    width:`${length}px`,
    height:`${length}px`,
    zIndex:'auto',
  });
  clip.appendChild(host);
  _vfxHostParent().appendChild(clip);
  const isWebp=/\.webp(\?|$)/i.test(videoUrl);
  let mediaEl,stop;
  if(isWebp){
    // 透過済みWebPアニメーション。canvasでのルミナンスキー処理は不要でbackground-imageでそのまま再生する
    // （<img>ではなくdivのbackground-imageにするのは、素材の透明マージンをbackground-size/positionで
    // トリミングし、実際に絵が描かれている範囲だけをbox一杯に表示するため。後述）。
    // 動画のように再生速度をsweepDurationへ動的に同期させることはできないため、中身のアニメーションは
    // 自身の速度で再生させ、薙ぎ払いの見た目（回転）はhost側のanimateでsweepDuration通りに制御する。
    mediaEl=document.createElement('div');
    mediaEl.className='vfx-sweep-video';
    // 同一URLの背景画像を短時間に連続生成した際の再生状態共有を避けるためのダミークエリ。
    const bustUrl=videoUrl+(videoUrl.includes('?')?'&':'?')+'_r='+Math.random();
    // 素材によっては帯の左右・上下に透明マージンを持って書き出されていることがあり、そのままの
    // 比率で炎box（幅=届く長さ、高さ=太さ）に収めると、透明部分の分だけ発生源（攻撃キャラ）側に
    // 隙間ができ、炎がキャラクターから離れて浮いて見えてしまう。そういう素材だけ_SWEEP_VFX_CROPに
    // 登録しておき、background-size/positionで実際に絵が描かれている範囲（全フレームを走査した
    // 非透明ピクセルの外接矩形の和集合）だけをbox一杯にトリミング表示することで隙間を無くす
    // （マージンを持たない素材はcontainで縦横比を保ったままフィットさせるだけでよい）。
    const code=typeof _assetCodeRaw==='function'&&typeof _normalizeAssetCode==='function'?_normalizeAssetCode(_assetCodeRaw(unit),'C'):'';
    const crop=_SWEEP_VFX_CROP[code];
    mediaEl.style.backgroundImage=`url("${bustUrl}")`;
    mediaEl.style.backgroundRepeat='no-repeat';
    if(crop){
      const wFrac=crop.right-crop.left, hFrac=crop.bottom-crop.top;
      const sx=100/wFrac, sy=100/hFrac;
      const px=100*crop.left/(1-wFrac), py=100*crop.top/(1-hFrac);
      mediaEl.style.backgroundSize=`${sx}% ${sy}%`;
      mediaEl.style.backgroundPosition=`${px}% ${py}%`;
    } else {
      // トリミング指定が無い（＝透明マージンを持たない）素材は、100%/100%で引き伸ばすと
      // box側のアスペクト比（幅=届く長さ、高さ=太さ）とズレて非一様に歪んでしまう。
      // containで素材本来の縦横比を保ったままboxいっぱいにフィットさせる。
      mediaEl.style.backgroundSize='contain';
      mediaEl.style.backgroundPosition='center';
    }
    stop=()=>{};
  } else {
    // 炎の実体はmp4フレーム中心付近にしかないため、中心を拡大して描画する
    const created=_createLumaKeyedVideoCanvas(videoUrl,'vfx-sweep-video',host,opt.zoom||3);
    mediaEl=created.canvas;
    stop=created.stop;
    // 回転量に関わらず再生時間を一定に保つため、動画自体の再生速度をsweepDurationに合わせる
    created.video.addEventListener('loadedmetadata',()=>{
      if(created.video.duration&&isFinite(created.video.duration)&&created.video.duration>0){
        created.video.playbackRate=Math.min(16,Math.max(0.25,created.video.duration/(sweepDuration/1000)));
      }
    },{once:true});
  }
  host.appendChild(mediaEl);
  // widthは対象までの実距離から計算した「届く長さ」そのものなので、scale()で等倍拡大すると
  // 炎の先端が対象を大きく超えて伸びてしまい、発生源から見て炎が対象と無関係な場所まで届いて
  // しまう（＝カードから離れて見える）原因になる。太さ（height方向）だけをscaleYで拡大し、
  // 届く長さ（width方向）は変えないことで、発生源の位置・炎の届く範囲を保ったまま太くする。
  const sizeScale=opt.sizeScale||2;
  // 炎は startAngle から endAngle へ回る。各対象は自分の角度を通過した瞬間に「当たる」。
  // ダメージ数値はその時刻に出す（薙ぎ払いは対象ごとの命中VFXを出さないため、
  // ここで知らせないと数値がまったく出ない）。
  if(typeof opt.onTargetHit==='function'){
    const span=(endAngle-startAngle)||1;
    angles.forEach((a,i)=>{
      const ratio=Math.max(0,Math.min(1,(a-startAngle)/span));
      // 0〜0.1は出現、0.1〜0.75で回り切る。その区間へ対象の角度を写す。
      const at=sweepDuration*(0.1+0.65*ratio);
      setTimeout(()=>{ try{ opt.onTargetHit((targets||[])[i],i); }catch(e){ console.error('[sweep onTargetHit]',e); } },at);
    });
  }
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{ if(done) return; done=true; stop(); clip.remove(); resolve(); };
    if(typeof mediaEl.animate==='function'){
      const anim=mediaEl.animate([
        {transform:`rotate(${startAngle}deg) scaleY(${sizeScale})`,opacity:0},
        {transform:`rotate(${startAngle}deg) scaleY(${sizeScale})`,opacity:1,offset:0.1},
        {transform:`rotate(${endAngle}deg) scaleY(${sizeScale})`,opacity:1,offset:0.75},
        {transform:`rotate(${endAngle}deg) scaleY(${sizeScale})`,opacity:0,offset:1},
      ],{duration:sweepDuration,easing:'ease-in-out',fill:'forwards'});
      anim.addEventListener('finish',finish,{once:true});
    }else{
      // Web Animations API非対応端末でも、アラッサスの従来VFXを消失させない。
      mediaEl.style.transform=`rotate(${endAngle}deg) scaleY(${sizeScale})`;
      mediaEl.style.opacity='1';
    }
    setTimeout(finish,sweepDuration+400);
  });
}

// カードDOMを作り直さず、HP数値とライフバーだけを即座に更新する（applyDamageBatch用の軽量更新）
function updateUnitDamageUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const _atkVal=Math.max(0,typeof presentShownAtk==='function'?presentShownAtk(unit):(unit.atk||0));
  const _hpVal=Math.max(0,typeof presentShownHp==='function'?presentShownHp(unit):(unit.hp||0));
  // 倒れた瞬間は桁数が減る（例：9999→0）。ここで作り直すと、消える直前に
  // 数字だけ大きくなって目立つので、大きさは据え置く。
  const _keepSize=_hpVal<=0;
  const atkEl=slot.querySelector('.slot-stats .a');
  _setUnitStatText(atkEl,_atkVal,_hpVal,_keepSize);
  const hpEl=slot.querySelector('.slot-stats .h');
  if(hpEl){
    _setUnitStatText(hpEl,_hpVal,_atkVal,_keepSize);
    hpEl.classList.toggle('hp-damaged',_hpVal<(typeof presentShownMaxHp==='function'?presentShownMaxHp(unit):Math.max(1,unit.maxHp||unit.hp||1)));
  }
  const maxHp=typeof presentShownMaxHp==='function'?presentShownMaxHp(unit):Math.max(1,Number(unit.maxHp)||Number(unit.hp)||1);
  const rate=Math.max(0,Math.min(1,_hpVal/maxHp));
  const fill=slot.querySelector('.slot-life-fill');
  if(fill) fill.style.width=`${rate*100}%`;
  const bar=slot.querySelector('.slot-life-bar');
  if(bar) bar.title=`ライフ ${_hpVal}/${maxHp}`;
}
// 戦闘中、ATK/HPを変化させる効果が発動するたびに呼び出し、両陣営の生存ユニット全員の
// 外観の数値（ATK/HP）を即座に更新する（renderAll()のようなカード再構築は行わない軽量版）。
// 例：アラクネの「負傷：全ての敵はATK-1を得る」等、ダメージを受けていないユニットの
// ステータスも変化する効果がある場合、そのユニットの表示も同時に更新する必要があるため。
function _refreshAllUnitStatsUi(){
  // 死亡処理・盤面詰めより先にHP0を表示するため、死亡ユニットも更新する。
  (G.allies||[]).forEach(u=>{ if(u) updateUnitDamageUi(u,'ally'); });
  (G.enemies||[]).forEach(u=>{ if(u) updateUnitDamageUi(u,'enemy'); });
}

// シールド消費時、カードDOMを作り直さずshield-active/魔方陣レイヤーだけを即座に更新する
function updateUnitShieldUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const hasShield=unit.shield>0;
  slot.classList.toggle('shield-active',hasShield);
  const badge=slot.querySelector('.b-shield');
  if(badge){
    if(hasShield) badge.textContent=`結界${unit.shield}`;
    else badge.remove();
  }
  const portrait=slot.querySelector('.unit-portrait');
  const existingLayer=portrait&&portrait.querySelector('.unit-shield-layer');
  if(hasShield&&portrait&&!existingLayer){
    const layer=document.createElement('div');
    layer.className='unit-shield-layer';
    portrait.appendChild(layer);
  } else if(!hasShield&&existingLayer){
    existingLayer.remove();
  }
}

// クローンは画面スケール変換(--game-scale)の外(document.body直下)に置かれるため、
// 元要素の computed フォントサイズをそのままコピーすると等倍(未縮小)で表示され巨大化する。
function _gameScale(){
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
}
function _getAttackTargetRect(slot){
  const rect=slot?.getBoundingClientRect?.();
  if(!rect) return rect;
  // 詰めアニメーション中は現在のgetBoundingClientRect()が移動途中の値になる。
  // inlineのleft/topは詰め後の終点を保持しているため、攻撃先だけ終点へ補正する。
  const left=parseFloat(slot.style.left);
  const top=parseFloat(slot.style.top);
  const parent=slot.offsetParent;
  if(!Number.isFinite(left)||!Number.isFinite(top)||!parent) return rect;
  const parentRect=parent.getBoundingClientRect();
  const scaleX=parent.offsetWidth?parentRect.width/parent.offsetWidth:1;
  const scaleY=parent.offsetHeight?parentRect.height/parent.offsetHeight:1;
  return {
    left:parentRect.left+left*scaleX,
    top:parentRect.top+top*scaleY,
    width:rect.width,
    height:rect.height,
  };
}

function _playAttackMotionCore(attacker,target,isEnemySide,onImpactPause,options){
  if(!attacker||!target||!document.body) return Promise.resolve();
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_start',{
    attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
  });
  const opt=options||{};
  const fromList=isEnemySide?G.enemies:G.allies;
  const toList=isEnemySide?G.allies:G.enemies;
  let fromIdx=fromList.indexOf(attacker);
  let toIdx=toList.indexOf(target);
  if(fromIdx<0&&attacker.id) fromIdx=fromList.findIndex(u=>u&&u.id===attacker.id);
  if(toIdx<0&&target.id) toIdx=toList.findIndex(u=>u&&u.id===target.id);
  if(fromIdx<0||toIdx<0) return Promise.resolve();
  const fromField=document.getElementById(isEnemySide?'f-enemy':'f-ally');
  const toField=document.getElementById(isEnemySide?'f-ally':'f-enemy');
  // 召喚・死亡後の詰め直しでは配列インデックスが同一フレーム内に更新される。
  // インデックスを先に使うと、攻撃対象の配列位置とDOM上のカードが一時的に
  // 食い違い、別キャラクターの攻撃モーションを表示することがある。IDを正とし、
  // IDがない旧ユニットだけインデックスへフォールバックする。
  const byUnitId=(field,unit)=>unit&&unit.id!=null
    ?[...(field?.querySelectorAll('.slot[data-unit-id]')||[])].find(el=>el.dataset.unitId===String(unit.id))||null
    :null;
  const fromEl=byUnitId(fromField,attacker)||fromField?.querySelector(`.slot[data-unit-idx="${fromIdx}"]`)||getCurrentUnitSlot(isEnemySide?'enemy':'ally',fromIdx);
  const toEl=byUnitId(toField,target)||toField?.querySelector(`.slot[data-unit-idx="${toIdx}"]`)||getCurrentUnitSlot(isEnemySide?'ally':'enemy',toIdx);
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_dom_resolve',{
    attackerId:attacker&&attacker.id,targetId:target&&target.id,
    sourceDomId:fromEl?.dataset?.unitId||null,targetDomId:toEl?.dataset?.unitId||null,
    sourceIdx:fromEl?.dataset?.unitIdx||null,targetIdx:toEl?.dataset?.unitIdx||null
  });
  // 即時攻撃はコア側で命中・死亡まで確定してから再生されるため、対象DOMが
  // 先に空枠へ置き換わる場合がある。死亡直前の矩形が渡されていれば、攻撃者の
  // モーションだけは従来どおり再生し、対象DOMの存在を必須にしない。
  const targetRectOverride=opt.targetRect&&opt.targetRect.width>0&&opt.targetRect.height>0
    ?opt.targetRect:null;
  if(!fromEl||(!toEl&&!targetRectOverride)) return Promise.resolve();
  const fr=fromEl.getBoundingClientRect();
  const tr=targetRectOverride||_getAttackTargetRect(toEl);
  const dx=(tr.left+tr.width/2)-(fr.left+fr.width/2);
  const dy=(tr.top+tr.height/2)-(fr.top+fr.height/2);
  const dist=Math.hypot(dx,dy)||1;
  const overlap=Math.min(fr.width,tr.width)*0.33;
  const ratio=Math.max(0,dist-overlap)/dist;
  const mx=dx*ratio;
  const my=dy*ratio;
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_rects',{
    attackerId:attacker.id,targetId:target.id,
    openingLayoutSettledAt:Number(G&&G._battleOpeningLayoutSettledAt)||null,
    sourceRect:{left:fr.left,top:fr.top,width:fr.width,height:fr.height},
    targetRect:{left:tr.left,top:tr.top,width:tr.width,height:tr.height},
    dx,dy,mx,my,dist,ratio,
    motionDepth:Number(G&&G._battleMotionDepth)||0
  });
  const tilt=Math.abs(dx)<Math.max(6,fr.width*0.15)?0:(dx>0?4:-4)*(isEnemySide?-1:1);
  const clone=fromEl.cloneNode(true);
  clone.classList.add('attack-motion-clone');
  // 直前の攻撃が中断された場合でも、複製側へ非表示状態を引き継がない。
  clone.classList.remove('dragging','drag-over','selected','selectable','motion-hidden');
  clone.style.setProperty('border','0','important');
  clone.style.setProperty('border-top','0','important');
  const cs=getComputedStyle(fromEl);
  ['--new-card-art-left','--new-card-art-top','--new-card-art-h','--unit-art-size','--unit-art-position'].forEach(k=>{
    const v=cs.getPropertyValue(k);
    if(v) clone.style.setProperty(k,v);
  });
  clone.style.position='fixed';
  clone.style.left=`${fr.left}px`;
  clone.style.top=`${fr.top}px`;
  clone.style.setProperty('width',`${fr.width}px`,'important');
  clone.style.setProperty('min-width',`${fr.width}px`,'important');
  clone.style.setProperty('max-width',`${fr.width}px`,'important');
  clone.style.setProperty('height',`${fr.height}px`,'important');
  clone.style.setProperty('min-height',`${fr.height}px`,'important');
  clone.style.setProperty('max-height',`${fr.height}px`,'important');
  clone.style.setProperty('--motion-card-w',`${fr.width}px`);
  clone.style.setProperty('--motion-card-h',`${fr.height}px`);
  clone.style.setProperty('aspect-ratio','auto','important');
  const unitCardW=cs.getPropertyValue('--unit-card-w');
  const unitCardH=cs.getPropertyValue('--unit-card-h');
  if(unitCardW) clone.style.setProperty('--unit-card-w',unitCardW);
  if(unitCardH) clone.style.setProperty('--unit-card-h',unitCardH);
  const frameW=cs.getPropertyValue('--unit-frame-w');
  const hateFrameW=cs.getPropertyValue('--unit-hate-frame-w');
  if(frameW) clone.style.setProperty('--unit-frame-w',frameW);
  if(hateFrameW) clone.style.setProperty('--unit-hate-frame-w',hateFrameW);
  const frameLayer=fromEl.querySelector('.unit-frame-layer');
  const frameRect=frameLayer?.getBoundingClientRect?.();
  if(frameRect&&frameRect.width&&frameRect.height){
    clone.style.setProperty('--unit-frame-w',`${frameRect.width}px`,'important');
    clone.style.setProperty('--unit-hate-frame-w',`${frameRect.width}px`,'important');
    const cloneFrame=clone.querySelector('.unit-frame-layer');
    if(cloneFrame){
      cloneFrame.style.setProperty('width',`${frameRect.width}px`,'important');
      cloneFrame.style.setProperty('height',`${frameRect.height}px`,'important');
      cloneFrame.style.setProperty('max-width',`${frameRect.width}px`,'important');
      cloneFrame.style.setProperty('max-height',`${frameRect.height}px`,'important');
      cloneFrame.style.setProperty('transform','translate(-50%,-50%)','important');
    }
  }
  const gameScale=_gameScale();
  const copyMotionStat=(srcSel,dstSel,refSel)=>{
    const src=fromEl.querySelector(srcSel);
    const dst=clone.querySelector(dstSel);
    if(!src||!dst) return;
    // refSel未指定時はfromEl基準。ただし実際のCSS containing blockが別要素
    // （例：position指定のある.slot-stats）の場合は必ずrefSelで明示すること。
    // fromEl基準のまま計算するとcontaining blockの実寸と食い違い、bottom指定が
    // top+heightに上書きされて位置がズレる（over-constrained時はbottomが無視される）。
    const refSrc=refSel?src.closest(refSel):fromEl;
    const refDst=refSel?dst.closest(refSel):clone;
    if(!refSrc||!refDst) return;
    const s=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const rr=refSrc.getBoundingClientRect();
    const fs=(parseFloat(s.fontSize)||Math.max(24,Math.min(fr.width,fr.height)*0.16))*gameScale;
    dst.style.setProperty('font-size',`${fs}px`,'important');
    dst.style.setProperty('line-height','1','important');
    dst.style.setProperty('left',`${sr.left-rr.left}px`,'important');
    dst.style.setProperty('right','auto','important');
    dst.style.setProperty('top','auto','important');
    dst.style.setProperty('bottom',`${rr.bottom-sr.bottom}px`,'important');
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
    dst.style.setProperty('display','flex','important');
    dst.style.setProperty('align-items','center','important');
    dst.style.setProperty('justify-content','center','important');
    dst.style.setProperty('text-align',s.textAlign||'center','important');
  };
  const stats=clone.querySelector('.slot-stats');
  if(stats){
    const srcStats=fromEl.querySelector('.slot-stats .a')||fromEl.querySelector('.slot-stats');
    const statsSize=(parseFloat(getComputedStyle(srcStats||fromEl).fontSize)||0)*gameScale;
    const statLimit=Math.max(28,Math.min(fr.width,fr.height)*0.28);
    const motionStatSize=statsSize||statLimit;
    clone.style.setProperty('--motion-stat-size',`${motionStatSize}px`,'important');
    stats.style.setProperty('font-size',`${motionStatSize}px`,'important');
    stats.style.setProperty('line-height','1','important');
    stats.querySelectorAll('.a,.h').forEach(el=>{
      el.style.setProperty('font-size',`${motionStatSize}px`,'important');
      el.style.setProperty('line-height','1','important');
    });
    copyMotionStat('.slot-stats .a','.slot-stats .a','.slot-stats');
    copyMotionStat('.slot-stats .h','.slot-stats .h','.slot-stats');
  }
  copyMotionStat('.card-summon-atk','.card-summon-atk');
  copyMotionStat('.card-summon-hp','.card-summon-hp');
  // マナオーブ（固定px画像）・方向矢印（固定pxフォント）もスケール外に置かれるため個別に補正する
  const srcOrbImgs=fromEl.querySelectorAll('.mana-cost-orbs img');
  const dstOrbImgs=clone.querySelectorAll('.mana-cost-orbs img');
  srcOrbImgs.forEach((src,i)=>{
    const dst=dstOrbImgs[i];
    if(!dst) return;
    const sr=src.getBoundingClientRect();
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
  });
  // 攻撃クローンはbody直下へ移すため、マナ数値（.activation-cost-entry b）が
  // カード側の相対レイアウトを失うと巨大化することがある。元カードの実寸・文字サイズを
  // そのままクローンへコピーして、通常表示と同じ大きさを維持する。
  const srcCosts=fromEl.querySelector('.card-activation-costs');
  const dstCosts=clone.querySelector('.card-activation-costs');
  if(srcCosts&&dstCosts){
    const srcCostRect=srcCosts.getBoundingClientRect();
    const cloneRect=clone.getBoundingClientRect();
    dstCosts.style.setProperty('left',`${srcCostRect.left-fr.left}px`,'important');
    dstCosts.style.setProperty('top',`${srcCostRect.top-fr.top}px`,'important');
    dstCosts.style.setProperty('width',`${srcCostRect.width}px`,'important');
    dstCosts.style.setProperty('height',`${srcCostRect.height}px`,'important');
    dstCosts.querySelectorAll('.activation-cost-entry').forEach((srcEntry,i)=>{
      const dstEntry=clone.querySelectorAll('.activation-cost-entry')[i];
      if(!dstEntry) return;
      const er=srcEntry.getBoundingClientRect();
      const b=srcEntry.querySelector('b');
      const dstB=dstEntry.querySelector('b');
      dstEntry.style.setProperty('left',`${er.left-srcCostRect.left}px`,'important');
      dstEntry.style.setProperty('top',`${er.top-srcCostRect.top}px`,'important');
      dstEntry.style.setProperty('width',`${er.width}px`,'important');
      dstEntry.style.setProperty('height',`${er.height}px`,'important');
      if(b&&dstB){
        const bs=getComputedStyle(b);
        dstB.style.setProperty('font-size',`${parseFloat(bs.fontSize)||19.84}px`,'important');
        dstB.style.setProperty('line-height',bs.lineHeight||'1','important');
      }
    });
  }
  const rr0=fromEl.getBoundingClientRect();
  const srcDirs=fromEl.querySelectorAll('.panel-dir');
  const dstDirs=clone.querySelectorAll('.panel-dir');
  srcDirs.forEach((src,i)=>{
    const dst=dstDirs[i];
    if(!dst) return;
    const s=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const fs=(parseFloat(s.fontSize)||0)*gameScale;
    dst.style.setProperty('font-size',`${fs}px`,'important');
    dst.style.setProperty('line-height','1','important');
    dst.style.setProperty('left',`${sr.left-rr0.left}px`,'important');
    dst.style.setProperty('top',`${sr.top-rr0.top}px`,'important');
    dst.style.setProperty('right','auto','important');
    dst.style.setProperty('bottom','auto','important');
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
    dst.style.setProperty('transform','none','important');
  });
  clone.style.margin='0';
  clone.style.zIndex='10000';
  clone.style.pointerEvents='none';
  // 元スロットが前衛カード用の overflow:visible を持つ場合でも、body直下へ
  // 移した攻撃クローンの子要素が左上へ飛び出して残らないよう、カード外を切る。
  clone.style.setProperty('overflow','hidden','important');
  clone.style.transform='translate(0,0)';
  clone.style.transformOrigin='center center';
  // body直下のfixed要素にビューポート座標のinsetを指定すると、カード自身の領域を
  // 切り抜いてしまい、攻撃者が「消えた」ように見える。そのため複製カード自身のクリップは
  // 常に解除する（元スロットのclip-pathを引き継がせない）。背景外へのはみ出しは、
  // 追加先である#vfx-clip-root側のclip-pathでまとめて切るため、これで二重に困ることはない。
  clone.style.clipPath='none';
  attacker._motionHidden=true;
  fromEl.classList.add('motion-hidden');
  fromEl.style.setProperty('visibility','hidden','important');
  _vfxHostParent().appendChild(clone);
  clone.getBoundingClientRect();
  const stopRatio=Number.isFinite(opt.stopRatio)?opt.stopRatio:1;
  const getCurrentTargetEl=()=>{
    const side=isEnemySide?'ally':'enemy';
    const current=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,target):null;
    return current||(toEl?.isConnected?toEl:null);
  };
  const getTargetMotionTransform=(targetRatio)=>{
    const currentTargetEl=getCurrentTargetEl();
    const currentTargetRect=_getAttackTargetRect(currentTargetEl||toEl);
    if(!currentTargetRect) return null;
    const nextDx=(currentTargetRect.left+currentTargetRect.width/2)-(fr.left+fr.width/2);
    const nextDy=(currentTargetRect.top+currentTargetRect.height/2)-(fr.top+fr.height/2);
    const nextDist=Math.hypot(nextDx,nextDy)||1;
    const nextOverlap=Math.min(fr.width,currentTargetRect.width)*0.33;
    const nextRatio=Math.max(0,nextDist-nextOverlap)/nextDist;
    const nextTilt=Math.abs(nextDx)<Math.max(6,fr.width*0.15)?0:(nextDx>0?4:-4)*(isEnemySide?-1:1);
    return `translate(${nextDx*nextRatio*targetRatio}px,${nextDy*nextRatio*targetRatio}px) rotate(${nextTilt}deg)`;
  };
  const atStop=getTargetMotionTransform(stopRatio)||`translate(${mx*stopRatio}px,${my*stopRatio}px) rotate(${tilt}deg)`;
  const atHit=getTargetMotionTransform(1)||`translate(${mx}px,${my}px) rotate(${tilt}deg)`;
  const cleanup=()=>{
    if(fromEl){
      fromEl.classList.remove('motion-hidden');
      fromEl.style.removeProperty('visibility');
    }
    attacker._motionHidden=false;
    // 攻撃中に召喚・変身・FLIP再描画が走ると、G配列内の実体が差し替わる
    // ことがある。古いattacker参照だけを解除すると、新しい実体に残った
    // _motionHiddenによって攻撃後もカードがvisibility:hiddenのままになる。
    // 安定IDで現在の戦闘実体も必ず解除する。
    if(attacker&&attacker.id!=null){
      [G.allies||[],G.enemies||[]].forEach(list=>{
        list.forEach(u=>{
          if(u&&String(u.id)===String(attacker.id)) u._motionHidden=false;
        });
      });
    }
    // モーション中に（本来は起こらないはずだが）renderAll()等でフィールドが再構築され、fromElが
    // 古い（DOMから外れた）要素になっていた場合の保険。現在のDOM上のスロットも同様に復元する
    const currentEl=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(isEnemySide?'enemy':'ally',attacker):null;
    if(currentEl&&currentEl!==fromEl){
      currentEl.classList.remove('motion-hidden');
      currentEl.style.removeProperty('visibility');
    }
    clone.remove();
    if(typeof renderAll==='function'){
      requestAnimationFrame(()=>{
        // 攻撃終了時の保険renderが、直前に開始したFLIPの詰めアニメーションを
        // 同じフレームで上書きしないようにする。
        if(attacker&&attacker.hp>0&&performance.now()>(Number(G._battleCompactAnimatingUntil)||0)) renderAll();
      });
    }
  };
  const runSegment=(frames,duration,dynamicEnd)=>{
    // 戦闘全体の自動高速化で攻撃モーションまで短縮すると、接触前に
    // カードが瞬間移動したように見える。攻撃演出は常に指定尺で再生する。
    const scaledDuration=Math.max(180,duration);
    const parseTransform=value=>{
      const tm=String(value||'').match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/);
      const rm=String(value||'').match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
      return {x:tm?Number(tm[1]):0,y:tm?Number(tm[2]):0,r:rm?Number(rm[1]):0};
    };
    const start= parseTransform(frames[0]?.transform);
    const staticEnd=parseTransform(frames[frames.length-1]?.transform);
    clone.style.setProperty('transition','none','important');
    clone.style.transform=frames[0]?.transform||'translate(0,0) rotate(0deg)';
    return new Promise(resolve=>{
      let done=false;
      // 起点は「予約した時刻」ではなく「最初のフレームが実際に来た時刻」。
      // ゲーム起動直後はカード絵・VFXのデコードでメインスレッドが数百ms止まることがあり、
      // 予約時刻から測ると1フレーム目で既に経過時間が尺を超えていて終端へ飛ぶ。
      // ＝最初の数戦だけ、最初の数体の攻撃モーションが再生されずワープして見える。
      let startedAt=null;
      // rAFが来ないまま止まる環境（非表示タブ等）の保険。最初のフレームが来たら
      // 正確な尺へ張り直す。ここを短くすると上と同じ「飛ぶ」症状に戻るので注意。
      let fallbackTimer=setTimeout(()=>{ if(!done) finish(); },scaledDuration+2000);
      const finish=()=>{
        if(done) return;
        done=true;
        if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer=null; }
        const end=dynamicEnd?parseTransform(dynamicEnd()):staticEnd;
        clone.style.transform=`translate(${end.x}px,${end.y}px) rotate(${end.r}deg)`;
        resolve();
      };
      const tick=now=>{
        if(done) return;
        if(startedAt===null){
          startedAt=now;
          if(fallbackTimer) clearTimeout(fallbackTimer);
          fallbackTimer=setTimeout(()=>{ if(!done) finish(); },scaledDuration+80);
          // 1フレーム目は必ず開始姿勢のまま。ここで進捗を計算すると
          // now===startedAt でp=0になるだけだが、意図を明示しておく。
        }
        const p=Math.max(0,Math.min(1,(now-startedAt)/scaledDuration));
        // 攻撃モーション本来の加速・減速を戻す。
        const eased=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        const end=dynamicEnd?parseTransform(dynamicEnd()):staticEnd;
        const x=start.x+(end.x-start.x)*eased;
        const y=start.y+(end.y-start.y)*eased;
        const r=start.r+(end.r-start.r)*eased;
        clone.style.transform=`translate(${x}px,${y}px) rotate(${r}deg)`;
        if(p>=1){ finish(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  return (async()=>{
    try{
      if(typeof onImpactPause==='function'){
        // 攻撃効果は「少し動き出した時点」で発動させる（stopRatio＝既定25%）。
        // ここで全行程を進めてから止めると、カードが相手に密着したまま
        // 効果の間だけ固まって見え、効果の発動も一拍遅れて感じられる。
        // firstDuration＝踏み込み、secondDuration＝残りの間合いを詰める分。
        await runSegment([
          {transform:'translate(0,0) rotate(0deg)'},
          {transform:atStop},
        ],opt.firstDuration||260,()=>getTargetMotionTransform(stopRatio));
        const pauseResult=await onImpactPause();
        if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_effect_pause',{
          attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
        });
        // グレムリンやギガンテス等、一時停止中にステータス変化を行う効果がある場合、
        // 攻撃を再開する前に背景側の実スロット全体も最新値へ同期する。
        if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
        const _cAtk=Math.max(0,attacker.atk||0), _cHp=Math.max(0,attacker.hp||0);
        const cloneAtkEl=clone.querySelector('.slot-stats .a');
        _setUnitStatText(cloneAtkEl,_cAtk,_cHp);
        const cloneHpEl=clone.querySelector('.slot-stats .h');
        _setUnitStatText(cloneHpEl,_cHp,_cAtk);
        const cloneLifeFill=clone.querySelector('.slot-life-fill');
        if(cloneLifeFill){
          const cloneMaxHp=Math.max(1,Number(attacker.maxHp)||Number(attacker.hp)||1);
          cloneLifeFill.style.width=`${Math.max(0,Math.min(1,(attacker.hp||0)/cloneMaxHp))*100}%`;
        }
        if(pauseResult&&pauseResult.abort){
          await runSegment([
            {transform:atStop},
            {transform:'translate(0,0) rotate(0deg)'},
          ],opt.returnDuration||420);
          return;
        }
        // 効果を出し終えてから残りの間合いを詰めて接触する。
        await runSegment([
          {transform:atStop},
          {transform:atHit},
        ],opt.secondDuration||360,()=>getTargetMotionTransform(1));
      } else {
        await runSegment([
          {transform:'translate(0,0) rotate(0deg)'},
          {transform:atHit},
        ],opt.firstDuration||420,()=>getTargetMotionTransform(1));
      }
      // 接触した瞬間のフック。戻りモーション（returnDuration）を待つと画面揺れが
      // 体感で1テンポ遅れるため、ここで呼ぶ。
      if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_contact',{
        attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
      });
      if(typeof opt.onHit==='function'){ try{ opt.onHit(); }catch(e){ console.error('[attackMotion onHit]',e); } }
      // 攻撃効果の一時停止（onImpactPause）とは別に、実際の接触時点で
      // ダメージ・反撃を適用する。ここをawaitしても戻りモーションだけが
      // 後続処理を待つため、接触時刻とダメージ時刻が一致する。
      if(typeof opt.onContact==='function') await opt.onContact();
      await runSegment([
        {transform:atHit},
        {transform:'translate(0,0) rotate(0deg)'},
      ],opt.returnDuration||480);
    } finally {
      cleanup();
      if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_end',{
        attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
      });
    }
  })();
}

function playAttackMotion(attacker,target,isEnemySide,onImpact,options){
  return _playAttackMotionCore(attacker,target,isEnemySide,onImpact,{
    firstDuration:320,
    returnDuration:340,
    ...(options||{}),
  });
}

function playArassusAttackMotion(attacker,target,isEnemySide,onStop){
  return _playAttackMotionCore(attacker,target,isEnemySide,onStop,{
    stopRatio:.25,
    firstDuration:260,
    secondDuration:360,
    returnDuration:420,
  });
}

function renderAll(){
  // FLIPの移動元を作った直後に、攻撃ダメージ表示・HUD更新などの別経路が
  // renderAll()を呼ぶと、移動中のslotが再生成されてtransition開始前に破棄される。
  // 初回描画（_animateBattleCompact中）は通し、それ以外の260msだけ盤面再構築を
  // 保留して、終了後に最新状態を1回だけ反映する。通常モード／人数変化なしでは
  // このガードは一切発生しない。
  const compactUntil=Number(G&&G._battleCompactAnimatingUntil)||0;
  if(!G._animateBattleCompact&&compactUntil>performance.now()){
    G._compactRenderPending=true;
    if(!G._compactRenderTimer){
      G._compactRenderTimer=window.setTimeout(()=>{
        G._compactRenderTimer=0;
        if(!G._compactRenderPending) return;
        G._compactRenderPending=false;
        if(typeof renderAll==='function') renderAll();
      },Math.max(0,compactUntil-performance.now()+8));
    }
    return;
  }
  if(typeof _recordRunStatsSnapshot==='function') _recordRunStatsSnapshot();
  // 戦闘中（player/enemyフェイズ）はログ表示（枠・見出し含む）を隠す
  document.body.classList.toggle('battle-turn-active',G.phase==='player'||G.phase==='enemy');
  renderField('f-ally',  G.allies,  false);
  renderField('f-enemy', G.enemies, true);
  renderHand();
  renderManaHud();
  renderControls();
  renderEnemyHand();
  updateHUD();
  requestAnimationFrame(fitCardDescs);
}

function renderManaHud(){
  let hud=document.getElementById('mana-hud');
  if(!hud){
    hud=document.createElement('div');
    hud.id='mana-hud';
    document.body.appendChild(hud);
  }
  // 戦闘中は右下の専用カウンターを使う。旧HUDはbody直下に生成されるため、
  // #scr-battle側のCSSだけでは右上のマナ表示を確実に隠せない。
  const isBattleScreen=document.getElementById('scr-battle')?.classList.contains('active');
  const show=!isBattleScreen&&G&&G.phase&&G.phase!=='reward'&&G.phase!=='gameover';
  hud.style.display=show?'grid':'none';
  if(!show) return;
  const n=Math.max(0,Number(G.mana)||0);
  const path=typeof _manaOrbPath==='function'?_manaOrbPath():'';
  hud.innerHTML=`<div class="mana-row">${path?`<img class="mana-icon" src="${path}" alt="マナ">`:''}<b>${n}</b></div>`;
  const clip=_battleBackgroundFrameRect();
  const padX=3840*.047*(clip.scale||1);
  const padY=2160*.06*(clip.scale||1);
  const rowWidth=Math.max(74*(clip.scale||1),hud.getBoundingClientRect().width||0);
  hud.style.position='fixed';
  hud.style.left=`${clip.left+clip.width-rowWidth-padX}px`;
  hud.style.right='auto';
  hud.style.top=`${clip.top+padY}px`;
}

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

const _ENCHANT_KEYWORD_ONLY=new Set(['毒','毒牙','邪眼','衝撃','復活','根性','二段攻撃','三段攻撃','三方向攻撃','全体攻撃','即死','先制','防戦','帰滅','隠密','貫通','結界','生命吸収','封印','荷物']);
function _enchantKeywordDesc(k){
  const s=String(k||'').trim();
  if(!s) return '';
  if(/^加護\d*$/.test(s)){
    const value=Math.max(1,parseInt(s.replace('加護',''),10)||1);
    return `このキャラクターは敵から与えられる状態異常を${value}回無効化する。`;
  }
  if(_ENCHANT_KEYWORD_ONLY.has(s)) return s;
  if(/^結界\d+$/.test(s)) return s;
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
function _enchantEffectTextForPanel(p){
  if(!p) return '';
  if(p.name==='封印されしもの'){
    return _stripOwnNameFromEffectText(p.desc||p.effectText||p.effect||'','封印されしもの')
      .replace(/^封印\d+\s*/,'').trim();
  }
  if(p.manaOnAttack) return `攻撃：${Math.max(1,Number(p.manaOnAttack)||1)}マナを得る。`;
  if(p.adjacentAtkBonus||p.adjacentHpBonus){
    const a=p.adjacentAtkBonus||0, h=p.adjacentHpBonus||0;
    return `常時：${a&&h?`+${a}/+${h}`:a?`ATK+${a}`:`HP+${h}`}を得る。`;
  }
  // 自分自身の名前を自己参照キーワードとして持つ場合（狂気・闇の炎等）は、
  // _enchantKeywordDesc()の汎用（かつシート更新に追従しない恐れのある）ハードコード文言ではなく、
  // シート上の本文（authoritative）をそのまま使う
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.includes(p.name)&&(p.desc||p.effectText||p.effect)){
    return _stripOwnNameFromEffectText(p.desc||p.effectText||p.effect,p.name);
  }
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.length){
    // 付与するキーワードが全て単純キーワード（_ENCHANT_KEYWORD_ONLY）の場合は、
    // 既にキャラクター側の太字キーワード欄に表示されるため、効果文としては重複表示しない
    if(p.adjacentKeywords.every(k=>_ENCHANT_KEYWORD_ONLY.has(String(k||'').trim()))) return '';
    return p.adjacentKeywords.map(_enchantKeywordDesc).filter(Boolean).join('\n');
  }
  return _plainEffectTextForPreview(p)||'';
}
// unitに現在効果を及ぼしている強化(エンチャント)パネルの一覧と、その全文効果テキストを返す（カード名は含めない）
// slotIdx：効果を受ける側のスロット番号（キャラクター本体は0、他の枠に召喚キャラクターパネルが
// 置かれている場合はそのパネル自身の番号を渡すことで、その位置に隣接する強化パネルを判定できる）
function _enchantmentEffectsList(unit,slotIdx){
  if(!unit) return [];
  slotIdx=slotIdx||0;
  const eq=Array.isArray(unit.equipment)?unit.equipment:[];
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
      text=_enchantEffectTextForPanel(p);
    } else if(rawKws.length&&baseKws.every(k=>_ENCHANT_KEYWORD_ONLY.has(k))){
      // 単純キーワード（生命吸収・二段攻撃・毒牙2等、数値の有無を問わない）は、キャラクター側の
      // 太字キーワード欄に既に表示されるため、効果文としては重複表示しない
      text='';
    } else {
      text=_enchantEffectTextForPanel(p);
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
  const strategyPanels=list.filter(e=>e.panel&&e.panel.name==='策士');
  const normal=list.filter(e=>!(e.panel&&e.panel.characterDesc)&&!(e.panel&&e.panel.name==='策士'));
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
  list.filter(e=>e.panel&&e.panel.characterDesc&&e.panel.name!=='策士').forEach(e=>{
    const key=`${e.panel._tripleMerged?'merged':'base'}::${e.panel.name}::${e.panel.characterDesc}`;
    if(!charDescMap.has(key)) charDescMap.set(key,{name:_cardUiName(e.panel),text:e.panel.characterDesc,count:0});
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
    const cardNames=new Set(['封印されしもの','禁断の力','武器破壊','団結','共振','遺志','熟練','戦術','大盾','策士']);
    const baseKeywords=typeof _unitPanelKeywords==='function'?_unitPanelKeywords(unit):(unit.keywords||[]);
    const keywordNames=new Set([...baseKeywords,...strategyPanels.flatMap(e=>e.panel.adjacentKeywords||[])].map(k=>String(k||'').trim().replace(/\d+$/,'')).filter(k=>k&&!cardNames.has(k)));
    const amount=keywordNames.size*2*strategyPanels.reduce((sum,e)=>sum+(e.panel._tripleMerged?2:1),0);
    if(amount>0) charTexts.unshift(`「策士」の効果で+${amount}/+${amount}されている。`);
  }
  return {normalTexts,charTexts};
}
// 指輪シートの「キャラクター用説明文」は、装備中の指輪が味方キャラクターへ
// 常時付与する説明として、キャラクター効果の末尾に表示する。
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
    .map(r=>String(r&&r.characterDesc||'').trim()).filter(Boolean);
}
// キャラクターカードの説明欄HTML：本来の効果の下に線を引き、その下に強化カードが与えている効果の全文を並べる
function _unitCombinedDescHtml(unit,baseDesc,slotIdx){
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const ringCharTexts=_ringCharacterDescriptionsForUnit(unit);
  const battleNormalTexts=normalTexts.map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  const battleCharTexts=[...charTexts,...ringCharTexts].map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  const kws=typeof _unitDisplayKeywords==='function'?_unitDisplayKeywords(unit,baseDesc,slotIdx):[];
  const kwHtml=kws.length?`<div class="slot-desc-keywords"><strong>${kws.map(k=>typeof _escapePreviewHtml==='function'?_escapePreviewHtml(k):k).join(' / ')}</strong></div>`:'';
  const baseSafe=baseDesc&&(typeof _escapePreviewHtml==='function'?_escapePreviewHtml(baseDesc):baseDesc);
  const baseDecorated=baseSafe?(_boldKeywordsInHtml(baseSafe)):'';
  const baseHtml=baseDecorated?`<div class="slot-desc-base">${typeof _injectManaIcons==='function'?_injectManaIcons(baseDecorated):baseDecorated}</div>`:'';
  if(!battleNormalTexts.length&&!battleCharTexts.length) return (kwHtml||baseHtml)?`<div class="slot-desc">${kwHtml}${baseHtml}</div>`:'';
  const toLineHtml=line=>{
    const safe=typeof _escapePreviewHtml==='function'?_escapePreviewHtml(line):line;
    const decorated=_boldKeywordsInHtml(safe);
    return `<div class="slot-desc-enchant-line">${typeof _injectManaIcons==='function'?_injectManaIcons(decorated):decorated}</div>`;
  };
  const effectsHtml=battleNormalTexts.map(toLineHtml).join('');
  const charHtml=battleCharTexts.map(toLineHtml).join('');
  return `<div class="slot-desc">${kwHtml}${baseHtml}${effectsHtml?`<div class="slot-desc-sep"></div><div class="slot-desc-enchant">${effectsHtml}</div>`:''}${charHtml?`<div class="slot-desc-sep"></div><div class="slot-desc-enchant">${charHtml}</div>`:''}</div>`;
}
// キャラクターカードにホバーした時、効果を及ぼしている強化カード（装備欄側の表示）を青く発光させる
// slotIdx：ホバーしたカード自身のスロット番号（キャラクター本体は0、装備欄内の召喚キャラクターパネルはその番号）
function _wireEnchantGlowHover(hitLayer,unit,unitIdx,slotIdx){
  if(!hitLayer||!unit) return;
  slotIdx=slotIdx||0;
  hitLayer.addEventListener('mouseenter',()=>{
    if(unitIdx!==G._selectedEquipUnitIdx) return;
    const list=typeof _collectEnhancementPanelsForSlot==='function'
      ?_collectEnhancementPanelsForSlot(unit,slotIdx).filter(({panel:p,idx})=>
        p&&idx!==slotIdx&&(String(p.category||'')==='強化'||String(p.category||'')==='エンチャント'))
      :_enchantmentEffectsList(unit,slotIdx);
    if(!list.length) return;
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    list.forEach(({idx})=>{
      const card=handSlots.querySelector(`[data-equip-idx="${idx}"]`);
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
function _equipSlotEl(handSlots,slotIdx){
  if(!handSlots) return null;
  return handSlots.querySelector(`[data-equip-idx="${slotIdx}"]`);
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
    const eq=Array.isArray(unit.equipment)?unit.equipment:[];
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
    affected.forEach(idx=>{ const el=_equipSlotEl(handSlots,idx); if(el) el.classList.add('glow-blue'); });
    connected.forEach(idx=>{ const el=_equipSlotEl(handSlots,idx); if(el) el.classList.add('glow-blue'); });
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
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const panelEffects=[...normalTexts,...charTexts].map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  // シート上「キーワード」欄に単独で載っているキーワード（_ENCHANT_KEYWORD_ONLY）以外は、
  // 説明文や効果全文の中に同じ文字列がそのまま含まれていれば、そちらの文脈で既に表示されるため
  // キーワード欄には重複して出さない（例：ゾンビの説明文が「死亡：青強化」の場合、
  // キーワード「青強化」は単独表示せず「死亡：青強化」の行にのみ表示する）。
  // ただし_ENCHANT_KEYWORD_ONLY（二段攻撃・シールド等、効果文を持たない単純キーワード付与パネル）は
  // 接続元パネルの効果文に現れない（本文が空のため）ので、常にキーワード欄に表示する。
  // desc/panelEffectsはマナアイコンが<img alt="色">に変換済みのHTMLの場合があるため、
  // 文字列比較の前にアイコンを元の色文字に戻し、タグを除去しておく
  const _stripIconsForMatch=s=>String(s||'').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const fullText=_stripIconsForMatch(`${desc||''} ${panelEffects.join(' ')}`);
  // loader.jsのシート同期時にdescから内部集計用に自動生成されるショートハンド（battle.jsのcount()判定専用で、
  // desc文と文字列としては一致しないため通常の重複除外に引っかからない）はUI上には表示しない
  const _isInternalOnlyKeyword=k=>/^[赤青緑黄紫茶]全体強化\d*(_\d+)?$/.test(k)||_INTERNAL_ONLY_ENCHANT_NAMES.has(k);
  const dynamicKws=[];
  if(unit.shield>0) dynamicKws.push(`結界${unit.shield}`);
  // unit.shieldは既に結界を持つ全ての発生源（強化パネル接続・キャラクター効果付与等）を合算した
  // 最終値のため、unit.keywords側に残る「結界」「結界N」は表示上ここで除外し、dynamicKwsの
  // 1エントリだけを正とする（両方を残すと_mergeCountedKeywordsで合算され「結界2」等に二重計上される）。
  const cardNames=new Set(['封印されしもの','禁断の力','武器破壊','団結','共振','遺志','熟練','戦術','大盾','策士']);
  const normalizedKws=[...(unit.keywords||[]).filter(k=>!/^結界\d*$/.test(String(k||'').trim())&&!cardNames.has(String(k||'').trim())),...dynamicKws]
    .map(k=>String(k||'').replace(/^毒(\d+)$/,'毒牙$1'))
    .filter(k=>k&&!_isInternalOnlyKeyword(k));
  // 邪眼X・毒牙X等、末尾に数値を持つキーワードは複数所持時にXを合算した1つの表示にまとめる
  const mergedKws=typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords(normalizedKws):[...new Set(normalizedKws)];
  const filtered=mergedKws.filter(k=>{
    if(!_ENCHANT_KEYWORD_ONLY.has(k.replace(/\d+$/,''))&&fullText.includes(k)) return false;
    return true;
  });
  // 弱体X（弱体化Xにより付与された状態）はunit.keywordsではなくunit.weaken（数値、加算式）で
  // 管理しているため、ここで表示用の擬似キーワードとして先頭に合成する
  const weakenList=unit.weaken>0?[`弱体${unit.weaken}`]:[];
  return [...weakenList,...filtered];
}
// 戦闘中のユニットは _panelSummonDisplayEquipment() が作る
// 「index0＝本体、以降＝接続中の強化カード」という平坦な配列を equipment に持つ。
// これを盤面のスロット番号（_mainBoardSlot）で引くと _collectEnhancementPanelsForSlot() の
// 隣接判定がどれも成立せず、強化カードの効果文が丸ごと消えて編成画面と食い違う。
// 平坦配列を持つユニットは本体の位置＝0 で引く。
function _unitDescSlotIdx(unit, fallbackIdx){
  const eq=Array.isArray(unit&&unit.equipment)?unit.equipment:null;
  if(eq&&eq.length&&eq[0]&&String(eq[0].category||'')==='キャラクター') return 0;
  return Number.isInteger(unit&&unit._mainBoardSlot)?unit._mainBoardSlot:fallbackIdx;
}

function _unitPreviewText(unit, desc, slotIdx){
  if(!unit) return desc||'';
  const lines=[];
  if(unit.name) lines.push(_cardUiName(unit));
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const characterTexts=[...charTexts,..._ringCharacterDescriptionsForUnit(unit)];
  const _stripIconsForMatch=s=>String(s||'').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const kws=_unitDisplayKeywords(unit,desc,slotIdx);
  // 「キーワード：」というラベルは表示せず、キーワードそのものを太字で並べる
  // （_formatPreviewHtmlがこのマーカー行を検出してラベルなし・太字表示に変換する）
  if(kws.length) lines.push(`キーワード：${kws.join(' / ')}`);
  // 戦闘実行後に付与された状態異常（毒など）は静的なdesc/keywordsには含まれないため、
  // 現在値をここで都度追記しないとホバー説明文に反映されない
  if(unit.poison>0) lines.push(`状態異常：毒${unit.poison}`);
  if(unit.shield>0) lines.push(`状態：結界${unit.shield}`);
  // descが単純にキーワード名の羅列（例：「先制　シールド」「根性」）で、既にキーワード欄と内容が
  // 重複している場合は二重表示しない
  const descTokens=_stripIconsForMatch(desc).split(/[\s　]+/).filter(Boolean);
  const descIsRedundant=descTokens.length>0&&descTokens.every(t=>(unit.keywords||[]).some(k=>String(k||'')===t));
  // descはcomputeDesc()経由でマナアイコンが注入済みの場合があるため、data-preview行としては
  // 生の色文字に戻して格納する（ホバー時に_formatPreviewHtmlが改めてアイコン化するため）
  if(desc&&!descIsRedundant) lines.push(_stripIconsForMatch(desc));
  if(normalTexts.length) lines.push(normalTexts.join('\n'));
  if(characterTexts.length){
    lines.push('__CHARACTER_DESC_SEPARATOR__');
    lines.push(characterTexts.join('\n'));
  }
  return lines.join('\n');
}

function renderField(id,units,isEnemy,_lane){
  const el=document.getElementById(id);
  const previousRects=new Map();
  // 死亡演出の複製元。スロットは毎回createElementで作り直されるため、
  // 消える前のDOMをここで控えておかないと「生きていたときの見た目」が取れない。
  // 全スロットを複製すると無駄なので、今回死んだユニットの分だけに絞る。
  // 再生中に位置を据え置くため、今画面にあるカードの left を控える。
  const previousLefts=new Map();
  for(const oldSlot of el.querySelectorAll('.slot[data-unit-id]')){
    const left=oldSlot.style&&oldSlot.style.left;
    if(left) previousLefts.set(String(oldSlot.dataset.unitId||''),left);
  }
  // 「直前までカードが出ていた」体だけを対象にする。配列には前の波の死体など
  // 一度も描かれていない体が残っていることがあり、それらまで数えると生存数が
  // 水増しされて、盤面全体の中央寄せ位置がずれる。
  const dyingIds=new Set((units||[]).filter(x=>x&&x.hp<=0&&!x._deathFxDone&&x.id!=null
    &&previousLefts.has(String(x.id))).map(x=>String(x.id)));
  const previousSlots=new Map();
  {
    for(const oldSlot of el.querySelectorAll('.slot[data-unit-id]')){
      previousRects.set(oldSlot.dataset.unitId,oldSlot.getBoundingClientRect());
      // 死亡イベントの効果VFXは、死亡処理後に盤面を詰め直してから再生される。
      // その時点では旧スロットが空枠へ置き換わっているため、死亡直前の矩形を
      // ユニットへ保持し、マミー等の死亡効果が対象DOM消去後でも同じ位置へ出る
      // ようにする。次の生存描画では通常のDOM矩形を再び優先する。
      const visualUnit=(units||[]).find(x=>x&&String(x.id)===String(oldSlot.dataset.unitId));
      if(visualUnit&&visualUnit.hp<=0){
        const r=oldSlot.getBoundingClientRect();
        if(r&&r.width>0&&r.height>0) visualUnit._lastVisualRect={left:r.left,top:r.top,width:r.width,height:r.height};
      }
      if(dyingIds.has(oldSlot.dataset.unitId)&&oldSlot.childElementCount>0){
        const clone=oldSlot.cloneNode(true);
        clone.dataset.deathSourceWidth=String(oldSlot.offsetWidth||0);
        clone.dataset.deathSourceHeight=String(oldSlot.offsetHeight||0);
        previousSlots.set(oldSlot.dataset.unitId,clone);
      }
    }
  }
  el.innerHTML='';
  // 優先ターゲットのインデックスを特定（グループ全体をハイライト）
  // _isObject のユニットは攻撃対象外なので除外
  // コアが生成済みだが、まだsummonイベントを再生していないユニットは
  // 上限判定のため配列に残る一方、画面上の配置枠は占有しない。
  // ここを生存ユニットとして数えると、非表示のpending体ぶんだけ既存体が
  // 左右へずれ、召喚上限時に一瞬左端へ飛ぶ。
  const liveUnits=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&!x.u._corePendingSummon&&!x.u._isObject);
  const prioritySet=new Set();
  if(isEnemy){
    // allyTarget 強制指定 → 前衛（lane==='front' or hate）→ 全生存敵
    const forced=liveUnits.filter(x=>x.u.allyTarget);
    if(forced.length){
      forced.forEach(x=>prioritySet.add(x.i));
    } else {
      const front=liveUnits.filter(x=>(x.u.lane==='front'||(x.u.hate&&x.u.hateTurns>0))&&!x.u.stealth);
      (front.length?front:liveUnits).forEach(x=>prioritySet.add(x.i));
    }
  } else {
    // hate（前衛・タウント）→ 全生存味方（getAttackTargetと同じロジック）
    const hated=liveUnits.filter(x=>x.u.hate&&x.u.hateTurns>0&&!x.u.stealth);
    (hated.length?hated:liveUnits.filter(x=>!x.u.stealth)).forEach(x=>prioritySet.add(x.i));
  }
  // HPが0になっても、死亡演出が終わるまでは盤面の枠を確保しておく。
  // ここで即座に詰めると、まだ出ていないダメージ数値やVFXが移動前の位置
  // （＝何もない場所）へ出てしまう。
  const _keepDying=typeof presentIsPlaying==='function'&&presentIsPlaying();
  const _onBoard=x=>!!x.u&&(x.u.hp>0||(_keepDying&&x.u.id!=null&&!x.u._deathFxReady&&dyingIds.has(String(x.u.id))));
  const _isRearUnit=x=>_onBoard(x)&&(x.u.lane||'front')==='rear';
  const _rearIndexes=units.map((u,i)=>({u,i})).filter(x=>_onBoard(x)&&!x.u._corePendingSummon&&!x.u._isObject&&_isRearUnit(x)).map(x=>x.i);
  const _frontIndexes=units.map((u,i)=>({u,i})).filter(x=>_onBoard(x)&&!x.u._corePendingSummon&&!x.u._isObject&&!_isRearUnit(x)).map(x=>x.i);
  const renderIndexes=isEnemy
    ?Array.from({length:MAX_ENEMIES||10},(_,idx)=>idx)
    :Array.from({length:MAX_ALLIES||10},(_,idx)=>idx);
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  el.style.setProperty('grid-template-columns',`repeat(${frontSlots},var(--unit-card-w))`,'important');
  el.style.setProperty('justify-content','center','important');
  const _fieldW=`calc(var(--unit-card-w) * ${frontSlots} + var(--unit-field-gap) * ${frontSlots-1})`;
  const _unitX=(count,pos)=>`calc((${_fieldW} - var(--unit-card-w)) / 2 + (${pos} - (${count} - 1) / 2) * (var(--unit-card-w) + var(--unit-field-gap)))`;
  const _rearLeft=new Map(_rearIndexes.map((idx,pos)=>[idx,_unitX(_rearIndexes.length,pos)]));
  const _frontLeft=new Map(_frontIndexes.map((idx,pos)=>[idx,_unitX(_frontIndexes.length,pos)]));
  for(const i of renderIndexes){
    const rawU=units[i];
    // コアは後続効果の対象にできるよう召喚体を生成直後に配列へ入れるが、
    // `_flushCorePveHitEvents()`が召喚イベントを再生するまでは未配置状態である。
    // ここを描画すると、配列末尾の空き枠や左端へ一瞬表示され、実際の召喚順・
    // 攻撃順と画面がずれる。正式配置イベントでフラグが外れるまで描画しない。
    // 未表示フラグが立つ召喚体は描画しない。なぜ画面から消えたのかを
    // 後から追えるよう、生存している体を飛ばした時だけ記録を残す。
    if(rawU&&rawU._corePendingSummon&&rawU.hp>0&&typeof _recordBattleTrace==='function'){
      _recordBattleTrace('render_skip_pending',{unitId:rawU.id,name:rawU.name,side:isEnemy?'p2':'p1',index:i});
    }
    const u=rawU&&rawU._corePendingSummon?null:rawU;
    // イベント再生中にHPが0になった体は、死亡演出を行うまでカードを残す。
    // 先に空スロットへ変えてしまうと、まだ出ていないダメージ数値・個別VFXが
    // 空きスロットの位置（7枠等間隔の左端寄り）へ出てしまう。
    const _pendingDeath=!!(u&&u.hp<=0&&u.id!=null&&!u._deathFxReady&&dyingIds.has(String(u.id))
      &&_keepDying);
    const _alive=!!u&&(u.hp>0||_pendingDeath);
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    slot.dataset.unitIdx=i;
    // 空スロットにIDを残すと、数値やモーションが「カードのない枠」に吸い寄せられる。
    if(_alive&&u.id!=null) slot.dataset.unitId=String(u.id);
    slot.style.setProperty('width','var(--unit-card-w)','important');
    slot.style.setProperty('min-width','var(--unit-card-w)','important');
    slot.style.setProperty('max-width','var(--unit-card-w)','important');
    slot.style.setProperty('height','var(--unit-card-h)','important');
    slot.style.setProperty('min-height','var(--unit-card-h)','important');
    slot.style.setProperty('max-height','var(--unit-card-h)','important');
    slot.style.setProperty('aspect-ratio','450 / 605','important');
    slot.style.setProperty('flex','0 0 var(--unit-card-w)','important');
    slot.style.setProperty('pointer-events','auto','important');
    // 敵スロットのレーン：生存敵はu.lane、死亡/空スロットはmoveMaskLanesで補完
    const _slotLane=isEnemy?(_alive?(u.lane||(i>=frontSlots?'rear':'front')):(G.moveMaskLanes?.[i]||(i>=frontSlots?'rear':'front'))):(_alive?(u.lane||'front'):(i>=frontSlots?'rear':'front'));
    if(!_alive){
      // 消える直前のカードを焼き落とす。実スロットは従来どおり即座に空にするため、
      // 盤面の詰め直しや当たり判定には影響しない。_deathFxDoneで一度だけ発火させる。
      // イベント再生中は焼き落とさない。ここで消すと、まだ出ていないダメージ数値や
      // 個別VFXが「カードのない空きスロット」へ出てしまう。死亡演出は再生の最後に
      // まとめて行う（battle.js の death ループ）。
      const _flushing=_keepDying&&!(u&&u._deathFxReady);
      if(!_flushing&&u&&u.hp<=0&&!u._deathFxDone&&u.id!=null&&typeof playCardBurnAway==='function'){
        const _prevNode=previousSlots.get(String(u.id));
        const _prevRect=previousRects.get(String(u.id));
        if(_prevNode&&_prevRect&&_prevRect.width>0){
          u._deathFxDone=true;
          playCardBurnAway(_prevNode,_prevRect);
        }
      }
      slot.classList.add('empty','dead-empty');
      slot.innerHTML='';
      slot.style.gridRow=_slotLane==='rear'?'1':'2';
      slot.style.gridColumn=String((i%frontSlots)+1);
      // #f-enemy/#f-ally は display:block で運用されておりgrid-row/columnは効かないため、
      // 空き/死亡スロットも生存ユニットと同様に絶対座標で位置指定する
      // （さもないと全ての空きスロットが同じ位置に重なり、特定スロットのホバー判定を塞いでしまう）
      slot.style.left=_unitX(frontSlots,i%frontSlots);
      const _emptyRearTop=isEnemy?'0':'calc(var(--unit-card-h) + var(--unit-field-gap))';
      const _emptyFrontTop=isEnemy?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0';
      slot.style.top=_slotLane==='rear'?_emptyRearTop:_emptyFrontTop;
      slot.style.setProperty('position','absolute','important');
      slot.style.setProperty('transform','none','important');
      // 生存数が7体未満だと生存ユニットは中央寄せで再配置されるため、空きスロットの位置と
      // 重なることがある。重なった場合でも必ず生存ユニット側のhit-layerが優先されるよう、
      // 空きスロットは常に低いz-indexにしておく
      slot.style.setProperty('z-index','1','important');
    }
    // 再生中に倒れた体もカードとして描く（_alive）。ここをhp>0にすると、
    // 数値やVFXが出る前にカードが消え、位置指定のない空枠へ吸い寄せられる。
    if(_alive){
      const _row=_slotLane==='rear'?1:2;
      slot.style.gridRow=String(_row);
      slot.style.gridColumn='1';
      slot.style.left=(_slotLane==='rear'?_rearLeft.get(i):_frontLeft.get(i))||`calc((var(--unit-card-w) + var(--unit-field-gap)) * ${(i%frontSlots)})`;
      // 前衛は敵に近い側（画面中央寄り）、後衛は画面外側（味方側は下端、敵側は上端）に表示する。
      // 敵は画面上部・味方は画面下部に配置されるため、両者の前衛同士が画面中央で向き合う形になる。
      const _rearTop=isEnemy?'0':'calc(var(--unit-card-h) + var(--unit-field-gap))';
      const _frontTop=isEnemy?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0';
      slot.style.top=_slotLane==='rear'?_rearTop:_frontTop;
      slot.style.setProperty('position','absolute','important');
      // 人数変化のFLIP中に別のrenderAll()が走っても、再生成したslotで
      // transform:noneへ戻すと移動が瞬間移動に見える。描画間で保持した
      // 残り移動量を引き継ぎ、同じ時刻から終点へ遷移させる。
      const compactMove=G._battleCompactMoves&&G._battleCompactMoves.get(String(u.id));
      // 新しいFLIPの初回描画では、前回移動のtransformを先に適用すると
      // getBoundingClientRect()が「移動後の矩形」になり、旧矩形との差分を
      // 正しく測れない。新しいFLIP側が旧DOM矩形から移動元を再計算する。
      if(compactMove&&!G._animateBattleCompact&&performance.now()-compactMove.start<compactMove.duration){
        const progress=Math.max(0,Math.min(1,(performance.now()-compactMove.start)/compactMove.duration));
        const rx=compactMove.dx*(1-progress), ry=compactMove.dy*(1-progress);
        const moveStart=compactMove.start;
        slot.style.setProperty('transition','none','important');
        slot.style.setProperty('transform',`translate(${rx}px,${ry}px)`,'important');
        requestAnimationFrame(()=>{
          // 連続召喚・死亡で同じユニットの新しいFLIPが始まった場合、
          // 古いrenderFieldのRAFが新しい移動をtranslate(0,0)へ戻さない。
          const currentMove=G._battleCompactMoves?.get(String(u.id));
          if(!slot.isConnected||!currentMove||currentMove.start!==moveStart) return;
          slot.style.setProperty('transition','transform 260ms ease','important');
          slot.style.setProperty('transform','translate(0,0)','important');
        });
      }else slot.style.setProperty('transform','none','important');
    }
    if(isEnemy&&_slotLane==='rear') slot.classList.add('is-rear');
    if(isEnemy&&_slotLane!=='rear') slot.classList.add('is-front');
    // 攻撃モーション中だけ実スロットを隠す。再描画・召喚・変身の境界で
    // _motionHidden が古い実体へ残ると、攻撃終了後もカードが消えたままになり、
    // 表示上の攻撃者とコア上の攻撃者がずれる。モーション深度がない stale flag は
    // ここで解除して、通常のカード表示へ戻す。
    // 深度カウンタだけに頼ると、モーションの入れ子・中断で数え違いが起きたとき
    // 「飛んでいる複製カード」と「元位置の実カード」が同時に見える（＝カードが2枚に見える）。
    // 実際に複製が生きているかをDOMで直接確かめ、生きている間は必ず実スロットを隠す。
    const _hasMotionClone=!!(u&&u.id!=null
      &&document.querySelector(`.attack-motion-clone[data-unit-id="${String(u.id).replace(/["\\]/g,'\\$&')}"]`));
    // 判断の第一根拠はDOM上に複製が生きているかどうか。深度カウンタや
    // _motionHidden フラグは、例外・入れ子・再描画の境界でずれることがあり、
    // ずれた瞬間に「飛んでいる複製」と「元位置の実カード」が同時に見える
    // （＝戦闘が長引くほど起きやすくなる）。複製が生きている間は無条件で隠す。
    if(u&&_hasMotionClone){
      u._motionHidden=true;
      slot.classList.add('motion-hidden'); slot.style.visibility='hidden';
    } else if(u&&u._motionHidden&&Number(G&&G._battleMotionDepth||0)>0){
      slot.classList.add('motion-hidden'); slot.style.visibility='hidden';
    } else if(u&&u._motionHidden){
      u._motionHidden=false;
    }
    const _isPlayerHero=!!(u&&!isEnemy&&!u._panelSummoned);
    const _hasGuardPanel=u&&!_isPlayerHero&&((isEnemy||u._panelSummoned)&&u.guardian);
    if(u&&u.hp>0&&_hasGuardPanel) slot.classList.add('is-defender','uses-hate-frame');
    if(u&&u.hp>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('is-defender');
    if(u&&u.hp>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('uses-hate-frame');
    if(_isPlayerHero) slot.classList.remove('is-defender','uses-hate-frame');
    // 敵も、再生中に倒れた体は死亡演出まで中身を描く（味方と同じ扱い）。
    if(u&&(!isEnemy||_alive)){
      slot.classList.add('unit-card');
      if(u.name==='石像') slot.classList.add('no-unit-shadow');
      if(u._sealed){
        slot.classList.add('sealed-unit');
        slot.style.filter='';
      } else {
        slot.style.filter='';
      }
      // 死亡演出を始めるまでは暗くしない。数値を出し切るための短い間だけ枠を
      // 残しているので、ここで暗い見た目にすると「死体が場に残っている」ように見える。
      if(u.hp<=0) slot.classList.add('inert');
      if(u.hp<=0&&!_pendingDeath) slot.classList.add('dead-unit');
      if(!isEnemy&&G._selectedEquipUnitIdx===i) slot.classList.add('selected');
      if(typeof applyUnitVisual==='function') applyUnitVisual(slot,u);
      if(_isPlayerHero){
        slot.classList.remove('is-defender','uses-hate-frame');
        if(typeof assetUrl==='function'&&typeof Assets!=='undefined'&&Assets.cards?.characterFrame){
          slot.style.setProperty('--unit-frame',assetUrl(Assets.cards.characterFrame));
        }
      }
      if(isEnemy&&typeof getSheetRaceByName==='function'){
        const _sheetRace=getSheetRaceByName(u.name);
        if(_sheetRace) u.race=_sheetRace;
      }
      // ライブユニットは常にユニットとして描画する（moveMask は死亡スロットにのみ表示）
      {
        // ── ステータスバッジ（右上固定：状態異常のみ）──
        const bs=[];
        const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';};
        // 標的バッジは非表示（is-front の視覚的シフトで代用）
        if(u.guardian) bs.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield"${_sd('結界')}>結界${u.shield}</span>`);
        if(u.instadead) bs.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${u.poison}</span>`);
        if(u.stealth) bs.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
        if(u.allyTarget) bs.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        // ── キーワードブロック（パワー/ライフとテキストの中間・中央揃え）──
        // エリート/ボスは他キーワードの1行上。
        const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','毒':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','三方向攻撃':'#e04040','貫通':'#e08040','狩人':'#d08040','狙撃':'#d08040','結束':'#80d0d0','邪眼':'#c060c0','弱体':'#c08040','衝撃':'#c08040','強靭':'#60c090','結界':'#60a0e0','隠密':'#8080c0','アーティファクト':'#b0a080'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};font-weight:bold;cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
        // 弱体X（弱体化Xにより付与された状態）はunit.weaken（数値、加算式）で管理しているため、
        // バッジ表示用の擬似キーワードとして合成する
        const _dynKws=u.shield>0?[`結界${u.shield}`]:[];
        const _allKws=[...(u.weaken>0?[`弱体${u.weaken}`]:[]),...(typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords([...(u.keywords||[]),..._dynKws]):[...new Set([...(u.keywords||[]),..._dynKws])])].filter(k=>!_INTERNAL_ONLY_ENCHANT_NAMES.has(k)&&!(typeof CORE_REMOVED_KEYWORDS!=='undefined'&&CORE_REMOVED_KEYWORDS.has(String(k).replace(/\d+$/,''))));
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:1px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
        const gradeTag='';
        const _rawDesc=u.desc?_stripBattleParentheticalText(_rawSubstitutedDesc(u)):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const _descSlot=_unitDescSlotIdx(u,i);
        const descTag=_unitCombinedDescHtml(u,_desc,_descSlot);
        // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
        // 既にアイコン化済みの_desc（<img alt="マナ">を含む）ではなくプレーンテキストを渡す
        // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
        const _plainDesc=u.desc?_stripKeywordsFromDesc(_stripBattleParentheticalText(_rawSubstitutedDesc(u)),u):'';
        const _preview=_unitPreviewText(u,_plainDesc,_descSlot);
        if(_preview) slot.setAttribute('data-preview',_preview);
        // 画面に出す値は present.js が唯一の実装。演出の再生中は
        // 「まだ見せていない変化」を反映しない（数値が出る前にHPが減らない）。
        const _shownAtk=typeof presentShownAtk==='function'?presentShownAtk(u):(u.atk||0);
        const _shownHp=typeof presentShownHp==='function'?presentShownHp(u):(u.hp||0);
        const _shownMaxHp=typeof presentShownMaxHp==='function'?presentShownMaxHp(u):Math.max(1,u.maxHp||u.hp||1);
        const _hpClass=(_shownHp<_shownMaxHp)?'h hp-damaged':'h';
        // ATK/HPで縮小率が食い違わないよう、桁数の多い方に合わせた同じクラスを両方へ当てる。
        const _statPairCls=_cardStatPairDigitClass(_shownAtk,_shownHp);
        const _hpMax=_shownMaxHp;
        const _hpPct=Math.max(0,Math.min(100,Math.round((Math.max(0,_shownHp)/_hpMax)*100)));
        const hpBar=`<div class="slot-life-bar" title="ライフ ${Math.max(0,_shownHp)}/${_hpMax}"><div class="slot-life-fill" style="width:${_hpPct}%"></div></div>`;
        const raceTag='';
        // 情報ブロック：絶対配置でカード全体に広げ中央固定
        // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
        const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
        const _btmStyle='position:absolute;bottom:6px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0;z-index:1;pointer-events:auto';
        slot.style.borderTop='2px solid var(--teal2)';
        if(u.shield>0) slot.classList.add('shield-active'); else slot.classList.remove('shield-active');
        // .unit-portraitの子として配置することで、attack-motion-clone生成時にportrait用のCSS変数
        // (--new-card-art-left等)がそのまま効き、独立した%指定を並行して持つことによるズレ・変形を防ぐ
        const shieldLayer=u.shield>0?'<div class="unit-shield-layer"></div>':'';
        const manaOrbHtml=typeof cardManaCostHtml==='function'?cardManaCostHtml(u):'';
        const sealCostHtml=typeof cardSealCostHtml==='function'?cardSealCostHtml(u):'';
        if(isEnemy){
          slot.innerHTML=`${manaOrbHtml}${sealCostHtml}${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${_battleDisplayUnitName(u.name)}</div>${raceTag}<div class="slot-stats"><span class="a${_statPairCls}">${_shownAtk}</span><span class="s">/</span><span class="${_hpClass}${_statPairCls}">${_shownHp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        } else {
          slot.innerHTML=`${manaOrbHtml}${sealCostHtml}${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${_battleDisplayUnitName(u.name)}</div>${raceTag}<div class="slot-stats"><span class="a${_statPairCls}">${_shownAtk}</span><span class="s">/</span><span class="${_hpClass}${_statPairCls}">${_shownHp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        }
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(slot,u);
        const hitLayer=document.createElement('div');
        hitLayer.className='unit-hit-layer';
        if(_preview) hitLayer.setAttribute('data-preview',_preview);
        slot.appendChild(hitLayer);
        slot._hitLayer=hitLayer;
        if(!isEnemy&&typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(hitLayer,u,i);
      }
      if(u&&!isEnemy){
        const canMoveUnit=!isEnemy&&G.phase==='reward'&&!G._battlePhaseRunning&&!G._resolvingSeals&&!G._mapBattle;
        slot.draggable=canMoveUnit;
        slot.addEventListener('dragstart',e=>{
          if(!canMoveUnit||document.body.classList.contains('right-card-peek')) { e.preventDefault(); return; }
          if(typeof _libraryTutorialIsMoveStep==='function'&&_libraryTutorialIsMoveStep()) { e.preventDefault(); return; }
          window._allySlotDragSrc=i;
          e.dataTransfer.effectAllowed='move';
          if(typeof _transparentDragImg!=='undefined') e.dataTransfer.setDragImage(_transparentDragImg,0,0);
          slot.classList.add('dragging');
          if(typeof _createDragGhost==='function') _createDragGhost(slot);
          if(typeof _moveDragGhost==='function') _moveDragGhost(e.clientX,e.clientY);
        });
        slot.addEventListener('drag',e=>{ if(typeof _moveDragGhost==='function'&&e.clientX&&e.clientY) _moveDragGhost(e.clientX,e.clientY); });
        slot.addEventListener('dragend',()=>{ window._allySlotDragSrc=null; slot.classList.remove('dragging'); if(typeof _removeDragGhost==='function') _removeDragGhost(); });
        slot.addEventListener('dragover',e=>{
          if(!canMoveUnit||window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(!canMoveUnit) return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          if(typeof _libraryTutorialAllowsMove==='function'&&!_libraryTutorialAllowsMove(G.allies[src],i)) { window._allySlotDragSrc=null; return; }
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            const frontSlots=ENEMY_FRONT_SLOTS||7;
            if((src>=frontSlots)!==(i>=frontSlots)){
              log('前衛と後衛の間では移動できません','bad');
              window._allySlotDragSrc=null;
              renderAll();
              return;
            }
            const tmp=G.allies[src];
            G.allies[src]=G.allies[i];
            G.allies[i]=tmp;
            if(G.allies[i]) G.allies[i].lane=i>=frontSlots?'rear':'front';
            if(G.allies[src]) G.allies[src].lane=src>=frontSlots?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
        slot.onclick=()=>{
          if(G.phase==='player') return;
          if(G._selectedEquipUnitIdx!==i) G._selectedEquipCardIdx=null;
          G._selectedEquipUnitIdx=i;
          G._showGlobalPanels=false;
          renderAll();
          if(typeof renderHandEditor==='function') renderHandEditor();
        };
        if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
      }
      if(u&&isEnemy&&u.hp>0&&G.phase==='player'){
        slot.onclick=()=>{
          const unitIdx=G._selectedEquipUnitIdx;
          const equipIdx=G._selectedEquipCardIdx;
          const ally=G.allies&&G.allies[unitIdx];
          const card=ally&&ally.equipment&&ally.equipment[equipIdx];
          if(!ally||ally.hp<=0||equipIdx==null||equipIdx<0||!card) return;
          if(card.fixedAttack&&typeof useFixedEquipOnEnemy==='function'){
            useFixedEquipOnEnemy(unitIdx,equipIdx,i);
            return;
          }
          if(!card.fixedEquip&&typeof useDraggedSpellOnTarget==='function'){
            const prev=G.spells;
            G.spells=ally.equipment;
            G._unitEquipSpellRestore=prev;
            useDraggedSpellOnTarget(equipIdx,'enemy',i);
            if(typeof _restoreUnitEquipSpellSource==='function') _restoreUnitEquipSpellSource();
          }
        };
        if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
      }
      if(u&&u.hp>0&&G.phase==='player'&&typeof useDraggedSpellOnTarget==='function'){
        slot.addEventListener('dragover',e=>{
          if(isEnemy&&window._fixedEquipDrag){
            e.preventDefault();
            slot.classList.add('drag-over');
            return;
          }
          const si=window._spellDragIdx;
          if(si==null) return;
          const sp=G.spells&&G.spells[si];
          const who=isEnemy?'enemy':'ally';
          if(!sp) return;
          if((sp.needsEnemy&&who!=='enemy')||(sp.needsAlly&&who!=='ally')) return;
          if(!sp.needsEnemy&&!sp.needsAlly&&!sp.needsAny) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(isEnemy&&window._fixedEquipDrag&&typeof useFixedEquipOnEnemy==='function'){
            e.preventDefault();
            slot.classList.remove('drag-over');
            useFixedEquipOnEnemy(window._fixedEquipDrag.unitIdx, window._fixedEquipDrag.equipIdx, i);
            window._fixedEquipDrag=null;
            return;
          }
          const si=window._spellDragIdx;
          if(si==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          useDraggedSpellOnTarget(si,isEnemy?'enemy':'ally',i);
          window._spellDragIdx=null;
        });
      }
    } else {
      slot.classList.add('empty');
      if(!isEnemy){
        slot.addEventListener('dragover',e=>{
          if(!(G.phase==='reward'||G.phase==='player')) return;
          if(window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(!(G.phase==='reward'||G.phase==='player')) return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          if(typeof _libraryTutorialAllowsMove==='function'&&!_libraryTutorialAllowsMove(G.allies[src],i)) { window._allySlotDragSrc=null; return; }
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            const frontSlots=ENEMY_FRONT_SLOTS||7;
            if((src>=frontSlots)!==(i>=frontSlots)){
              log('前衛と後衛の間では移動できません','bad');
              window._allySlotDragSrc=null;
              renderAll();
              return;
            }
            G.allies[i]=G.allies[src];
            G.allies[src]=null;
            if(G.allies[i]) G.allies[i].lane=i>=frontSlots?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
      }
    }
    el.appendChild(slot);
    if(u&&u.hp>0&&typeof _recordBattleTrace==='function'){
      // renderAll()は演出中にも複数回呼ばれるため、同じユニットのDOM追加を毎回
      // 記録すると召喚・FLIP・マナの時系列がログから押し出される。
      // ユニットIDごとに初回のDOM追加だけを記録し、召喚体が実際にDOMへ入った時刻を残す。
      const domKey=`${isEnemy?'p2':'p1'}:${u.id}`;
      const domSeen=G._battleTraceDomIds||(G._battleTraceDomIds=new Set());
      if(!domSeen.has(domKey)){
        domSeen.add(domKey);
        _recordBattleTrace('unit_dom_append',{unitId:u.id,side:isEnemy?'p2':'p1'});
      }
    }
  }
  // renderFieldはスロットを再生成するため、通常のtransitionだけでは
  // 移動前の位置を失ってしまう。FLIPで旧位置から新位置へ滑らかに移動させる。
  if(G._animateBattleCompact&&previousRects.size){
    _recordBattleTrace('battle_compact_snapshot',{field:id,previousRects:previousRects.size,currentSlots:el.querySelectorAll('.slot[data-unit-id]').length,ids:[...previousRects.keys()]});
    // 新しいDOMを作った同じ同期処理内で移動元transformを設定する。
    // ここを最初のrequestAnimationFrame内で行うと、連続召喚・攻撃終了時の
    // renderAll()に上書きされ、ブラウザが移動元を一度も描画せず瞬間移動になる。
    let compactMatched=0;
    for(const slot of el.querySelectorAll('.slot[data-unit-id]')){
        const oldRect=previousRects.get(slot.dataset.unitId);
        if(!oldRect) continue;
        compactMatched++;
        const newRect=slot.getBoundingClientRect();
        const dx=oldRect.left-newRect.left;
        const dy=oldRect.top-newRect.top;
        if(Math.abs(dx)<0.5&&Math.abs(dy)<0.5) continue;
        // grid の position:relative 要素へ absolute な left/top を設定すると、
        // 「目標位置そのもの」ではなく元の grid 配置からさらにオフセットされる。
        // そのため人数変化時のFLIPは相対移動量を transform で扱う。
        const dxScaled=oldRect.left-newRect.left;
        const dyScaled=oldRect.top-newRect.top;
        const moveKey=String(slot.dataset.unitId);
        const compactMoves=G._battleCompactMoves||(G._battleCompactMoves=new Map());
        compactMoves.set(moveKey,{dx:dxScaled,dy:dyScaled,start:performance.now(),duration:260});
        _recordBattleTrace('battle_compact_flip',{unitId:slot.dataset.unitId,oldLeft:oldRect.left,oldTop:oldRect.top,newLeft:newRect.left,newTop:newRect.top,dx,dy});
        slot.style.setProperty('transition','none','important');
        slot.style.setProperty('transform',`translate(${dxScaled}px,${dyScaled}px)`,'important');
        // 新しいslotへ設定した移動元transformをこのフレーム中に確定する。
        // これを省くと、ブラウザが「移動元」と「移動先」を同一レイアウトとして
        // 折りたたみ、transitionが発火せず瞬間移動になることがある。
        void slot.offsetWidth;
        requestAnimationFrame(()=>{
          if(!slot.isConnected) return;
          _recordBattleTrace('battle_compact_transition_start',{unitId:slot.dataset.unitId,dx:dxScaled,dy:dyScaled});
          slot.style.setProperty('transition','transform 260ms ease','important');
          void slot.offsetWidth;
          slot.style.setProperty('transform','translate(0,0)','important');
          window.setTimeout(()=>{
            if(!slot.isConnected) return;
            _recordBattleTrace('battle_compact_transition_sample',{unitId:slot.dataset.unitId,
              transform:getComputedStyle(slot).transform,elapsed:performance.now()-compactMoves.get(moveKey)?.start});
          },130);
          window.setTimeout(()=>{
            if(!slot.isConnected) return;
            slot.style.removeProperty('transition');
            slot.style.removeProperty('transform');
            const current=G._battleCompactMoves;
            if(current&&current.get(moveKey)?.start===compactMoves.get(moveKey)?.start) current.delete(moveKey);
          },320);
        });
      }
    _recordBattleTrace('battle_compact_prepare',{field:id,previousRects:previousRects.size,currentSlots:el.querySelectorAll('.slot[data-unit-id]').length,matched:compactMatched});
  }
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

// カードのdesc要素をコンテナからはみ出さないようフォントサイズを縮小
function fitCardDescs(){
  function fit(el,container){
    el.style.fontSize='';
    let fs=parseFloat(window.getComputedStyle(el).fontSize);
    while(container.scrollHeight>container.clientHeight+1&&fs>6.5){
      fs=Math.max(6.5,fs-0.5);
      el.style.fontSize=fs+'px';
    }
  }
  document.querySelectorAll('.card .card-desc').forEach(el=>{
    const c=el.closest('.card'); if(c) fit(el,c);
  });
  document.querySelectorAll('.rew-card .rew-card-desc').forEach(el=>{
    const c=el.closest('.rew-card'); if(c) fit(el,c);
  });
}

// Grade/X置換のみを適用した、マナアイコン注入前のプレーンテキスト。
// data-preview（ホバー時に_formatPreviewHtmlで改めてアイコン化される）に渡す用途では、
// 既にアイコン化済みのHTMLを渡すと<img alt="マナ">がアイコン数分「マナ」という文字列に
// 逆変換されてしまい「2マナ」が「マナマナ」になるバグの原因になるため、必ずこちらを使う。
function _rawSubstitutedDesc(card){
  if(!card||card.isEnchant) return card&&card.isEnchant?('契約に「'+card.enchantType+'」を付与する'):'';
  const g=card.grade||1;
  let desc=_evalMath((card.desc||'').replace(/Grade/g,String(g)));
  const ownName=String(card.name||'').trim();
  if(ownName){
    desc=_stripOwnNameFromEffectText(desc,ownName);
  }
  if(card.descXEqualsAtk&&card.atk!=null) desc=desc.replace(/X/g,String(card.atk));
  if(card._tripleMerged&&!card._tripleDescApplied) desc=_doubleTripleMergedDesc(desc);
  // 絆の巻物による合体は同じ効果を2回発動するため、表示上の効果量も2倍にする。
  // マナ閾値そのもの（例：3マナ毎）は変更しない。
  if(card._merged&&!card._tripleMerged) desc=_doubleTripleMergedDesc(desc);
  return desc;
}
function _doubleTripleMergedDesc(desc){
  return String(desc||'').split('\n').map(line=>{
    const mana=[];
    let text=line.replace(/^\s*\d+マナ(?:毎)?[:：]/,m=>{ mana.push(m); return `\u0000${mana.length-1}\u0000`; });
    const xClause=text.search(/Xは/);
    let head=xClause>=0?text.slice(0,xClause):text;
    const tail=xClause>=0?text.slice(xClause):'';
    head=head.replace(/\d+/g,n=>String(Number(n)*2)).replace(/(?<!\d)X/g,'2X');
    // 合体後も固定仕様の「4方向ポート」は増やさない。
    head=head.replace(/8\s*方向/g,'4方向').replace(/8\s*つのポート/g,'4つのポート');
    head=head.replace(/\u0000(\d+)\u0000/g,(_,i)=>mana[Number(i)]||'');
    return head+tail;
  }).join('\n');
}
function computeDesc(card,_mlOverride){
  if(card.isEnchant) return '契約に「'+card.enchantType+'」を付与する';
  let desc=_rawSubstitutedDesc(card);
  // タイミングキーワードを太字化（「開戦：」「終戦：」等）
  desc=desc.replace(/(開戦|終戦|負傷|誘発|攻撃|召喚|常在|常時)：/g,'<strong>$1</strong>：');
  // 説明文中の色名（青・赤・緑・黄）をマナアイコンに置き換える
  desc=_boldKeywordsInHtml(desc);
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

function mkCardEl(card,_idx,_ctx,_mlOverride){
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム','global-panel':'全体'};
  const div=document.createElement('div');
  const t=card.type||'ring';
  const _isWandSub=t==='wand'&&card.subtype==='wand';
  const _subtypeClass=_isWandSub?' wand-sub':'';
  div.className=`card ${t}${_subtypeClass}${card.legend?' legend-card':''}`;
  if(card._isChar||(!card.type&&!card.kind)) div.classList.add('character-card');
  if(card.rarity>=1&&card.rarity<=6) div.classList.add(`rarity-${card.rarity}`);
  div.dataset.cardIdx=String(_idx);
  div.dataset.cardCtx=_ctx||'';
  if(typeof applyCardVisual==='function'){
    applyCardVisual(div,card);
  } else if(typeof getCardAsset==='function'&&typeof assetUrl==='function'){
    div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
  }
  const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
  const tpLabel=_isWandSub?'短杖':(typeLabel[t]||'指輪');
  const kindLabel='';
  const gradeEl='';
  const manaCostEl=cardManaCostHtml(card);
  const sealCostEl=cardSealCostHtml(card);
  // 価格バッジはショップ（G._isShop）かつ実際に価格が1以上の場合のみ表示する。
  // 無料報酬（_buyPrice===0）ではバッジそのものを作らない（CSSでの後隠しはしない）。
  const showPriceBadge=G.phase==='reward'&&!!G._isShop&&Number(card._buyPrice)>0&&!card._debugInfiniteCard;
  const badgeEl=showPriceBadge?`<span class="card-badge">${_circleCost(card._buyPrice)}</span>`:'';
  const mergeStarEl=card._tripleMerged?'<span class="triple-merge-star" aria-label="3枚合体">★</span>':'';
  const isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
  const isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
  const isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
  const isPanelCharacter=isPanelCard&&String(card.category||'')==='キャラクター';
  if(isPanelCharacter) div.classList.add('character-card','panel-character-card');
  const isActionPanel=card&&(card.fixedAttack||card.fixedEquip||((card.type==='panel'||card.kind==='panel'||card.panelScope)&&!isPassivePanel&&!isCombatPowerPanel&&card.panelScope!=='global'));
  const charges=(!isPanelCard&&isActionPanel)?(card.cost>0?card.cost:1):null;
  const _chargeColorClass=_isWandSub?' wand-sub':'';
  const chargeLabel=charges!==null?`<div class="card-charge${_chargeColorClass}">${charges}</div>`:'';
  const atkLabel='', hpLabel='';
  const dynDesc=computeDesc(card,_mlOverride);
  const _keywordPreviewCard={...card,keywords:[...(card.keywords||[]),...(card.adjacentKeywords||[])]};
  const _keywordPreviewAll=typeof _keywordOnlyPreviewText==='function'?_keywordOnlyPreviewText(_keywordPreviewCard):'';
  if(_keywordPreviewAll) div.setAttribute('data-keyword-preview',_keywordPreviewAll);
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
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}${mergeStarEl}${dirMarks}<div class="card-art"></div><span class="card-summon-atk${_cardStatPairDigitClass(pAtk,pHp)}">${pAtk}</span><span class="card-summon-hp${_cardStatPairDigitClass(pAtk,pHp)}">${pHp}</span>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  if(isPanelCard&&['強化','エンチャント'].includes(String(card.category||''))){
    div.classList.add('enchantment-card');
    // data-previewはホバー時に_formatPreviewHtmlで再度HTMLタグ除去→マナアイコン挿入されるため、
    // 既にアイコンが埋め込まれたdynDesc（computeDesc結果）ではなく生のcard.descを使う。
    // 本文が空でもシート「キーワード」列（adjacentKeywords）があれば、隣接キャラクターに付与する
    // キーワードとして「キーワード：〇〇」行を合成する（敵/キャラクターと同じ表示規則）。
    // シート「キーワード」列に実在しないカード名自己参照マーカー（内部の効果判定専用）は
    // このカード自身のキーワード欄プレビューからも除外する
    const _adjKws=[...new Set([...(card.keywords||[]).filter(k=>String(k||'').trim()==='荷物'),...(card.adjacentKeywords||[])])].filter(k=>{
      const s=String(k||'').trim();
      if(_INTERNAL_ONLY_ENCHANT_NAMES.has(s)) return false;
      if(s===String(card.name||'')&&!_ENCHANT_KEYWORD_ONLY.has(s)&&!/^結界\d+$/.test(s)&&!/^封印\d+$/.test(s)&&!/^毒牙?\d*$/.test(s)&&!/^邪眼\d*$/.test(s)&&!/^衝撃\d*$/.test(s)) return false;
      return true;
    });
    // 本文に「効果なし」を含む強化カード（方向接続専用パネル等）は説明文を表示しない
    const _panelDescRaw=/効果なし/.test(String(card.desc||''))?'':_plainEffectTextForPreview(card).replace(/^荷物\s*/,'');
    const _panelDescForPreview=card.name==='封印されしもの'
      ?String(_panelDescRaw||'').replace(/^封印\d+\s*/,'').trim():_panelDescRaw;
    const preview=[_cardUiName(card),_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:'',_panelDescForPreview].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}${mergeStarEl}${dirMarks}<div class="card-art"></div>`;
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
  div.innerHTML=`${gradeEl}${sealCostEl}${badgeEl}${mergeStarEl}${dirMarks}<div class="card-art"></div><div class="card-tp ${t}${_subtypeClass}">${tpLabel}${kindLabel}</div><div class="card-name">${_cardUiName(card)}</div><div class="card-desc">${dynDesc}</div>${enc}${chargeLabel}${atkLabel}${hpLabel}`;
  return div;
}

function renderControls(){
  const badge=document.getElementById('ph-badge');
  const pp=document.getElementById('btn-pass');
  const dbg=document.getElementById('btn-debug-kill');
  const testBtn=document.getElementById('btn-test-battle');
  const dbgOver=document.getElementById('btn-debug-gameover');
  const debugTestBattle=!!(G._debugMode&&G._testBattleMode&&!G._libraryTestBattleMode);
  // デバッグ撃破ボタンは報酬バー内にあるため、試験戦闘中だけ親を表示して
  // 実際のクリック領域を確保する。通常モード・通常戦闘では親も従来どおり隠す。
  const dbgParent=dbg&&dbg.parentElement;
  if(dbgParent){
    if(debugTestBattle) dbgParent.style.setProperty('display','block','important');
    else dbgParent.style.removeProperty('display');
  }
  if(G.phase==='player'){
    badge.className='ph-badge ph-player'; badge.textContent='プレイヤーターン';
    if(dbg) dbg.style.display=G._debugMode?'':'none';
    if(testBtn) testBtn.style.display='none';
    if(dbgOver) dbgOver.style.display='none';
  } else if(G.phase==='reward'){
    // 商談フェイズ：バッジはgoToReward()で設定済みなので上書きしない
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
    if(dbgOver) dbgOver.style.display=G._debugMode?'':'none';
    if(testBtn) testBtn.style.display=G._debugMode?'':'none';
    return;
  } else {
    badge.className='ph-badge ph-enemy'; badge.textContent='敵のターン';
    // デバッグ試験戦闘では自動進行中（enemyフェイズ）でも一括撃破を使えるようにする。
    // 人数減少後のFLIPを画面遷移前に実測するための検証専用入口で、通常戦闘には出さない。
    if(dbg) dbg.style.display=G._debugMode&&G._testBattleMode?'':'none';
    if(dbgOver) dbgOver.style.display='none';
    if(testBtn) testBtn.style.display='none';
  }
  // 戦闘開始ボタンは廃止した。試験戦闘中のみ「戦闘終了」として常時表示する。
  // ただし図書館の試験戦闘は勝敗が付くまで行うため、中断ボタンは出さない。
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    pp.textContent='戦闘終了';
    pp.disabled=false;
    pp.style.display='';
  } else {
    pp.style.display='none';
  }
}

function setHint(t){ document.getElementById('hint-txt').textContent=t; }

// 敵側インベントリエリア（報酬フェイズの施設アップグレード表示専用）
function renderEnemyHand(){
  const area=document.getElementById('enemy-hand-area');
  if(!area) return;
  const isReward=G.phase==='reward'&&(G._masterHandReady||false);
  if(!isReward){ area.style.display='none'; return; }
  area.style.display='';
  const handEl=document.getElementById('enemy-hand-slots');
  const handCountEl=document.getElementById('enemy-hand-count');
  const handMaxEl=document.getElementById('enemy-hand-max');
  if(!handEl) return;
  handEl.innerHTML='';
  if(typeof renderFacilitiesRow==='function'){
    renderFacilitiesRow();
    if(handCountEl) handCountEl.textContent='6';
    if(handMaxEl) handMaxEl.textContent='6';
  }
}
