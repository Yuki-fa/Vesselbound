// render_tooltip_helpers.js — ホバー説明の整形・キーワード・配置の補助関数
// 2026-10-25 リファクタリング：render.js から移した（処理は変えていない）。

function _escapePreviewHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function _lifeLabelText(){
  return typeof textMessage==='function'?textMessage('「ライフ枠」見出し','ライフ'):'ライフ';
}
// 旧シートの結界N／結界Xは表示時だけ数字を外す。効果のパース用本文は変えない。
function _shieldDisplayText(text){
  return String(text||'').replace(/結界[ \t　]*(?:\d+|X)/g,'結界');
}
function _shieldKeywordDescription(base,desc){
  return base==='結界'?String(desc||'').replace(/X/g,'1'):desc;
}
// 説明文のマナ・色・血を、共通のアイコンへ置き換える。
function _injectManaIcons(escapedText){
  escapedText=_shieldDisplayText(escapedText);
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
  // 色の字を含む「名前」はアイコン化しない。指輪名（「緑の瞳の指輪」「黄金の指輪」等）と
  // 「赤い瞳」は色の指定ではなく固有名詞なので、文字のまま残す（利用者指定 2026-09-22）。
  // 指輪名は RING_POOL から引くので、シートへ指輪を足せばそのまま守られる。
  const eyeNames=[];
  const _protectedNamePatterns=()=>{
    const names=(typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL)?RING_POOL:[])
      .map(r=>String(r&&r.name||'').trim())
      .filter(n=>n&&/[赤青緑黄紫黒]/.test(n))
      .sort((a,b)=>b.length-a.length)
      .map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    // 指輪表に無い言い回しも守る：「赤の指輪」のように色＋「の指輪」と続く形と、「黄金」。
    return new RegExp(`(?:${[...names,'[赤青緑黄紫黒]の指輪','黄金','[赤青緑黄紫]い瞳'].join('|')})`,'g');
  };
  const protectEyeNames=text=>String(text).replace(_protectedNamePatterns(),name=>{
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
      // **「マナ効果」はキーワード名なので文字のまま残す。**（利用者指定）後ろに「効果」が続くマナは置き換えない。
      .replace(/([青赤緑黄紫茶黒])?(?:の)?(\d*)マナ(?!効果)/g,(_,c,n)=>{
        const icon=c?colorIcon(c):manaIcon();
        return icon.repeat(Math.max(1,parseInt(n,10)||1));
      })
      // 「血を3得る」のように助詞が続く場合も含めてアイコンにする。
      // ここに助詞を書き足し忘れると、その言い回しだけ文字のまま残る。
      .replace(/血(?=[がにのはをへとやも、。]|以上|以下|\d|$)/g,bloodIcon));
  }).join('');
}
function _stripStrongMarkupText(text){
  return String(text||'')
    .replace(/<\s*strong\b[^>]*>/gi,'')
    .replace(/&lt;\s*\/?\s*strong\s*&gt;/gi,'')
    .replace(/<\/\s*strong\s*>/gi,'')
    .replace(/<\s*\/?\s*strong\s*>/gi,'')
    .replace(/<\/\s*strong\s*/gi,'')
    .replace(/<\s*strong\s*/gi,'');
}
// タイミングのラベル（「開戦：」「死亡：」「4マナ毎：」など）を太字にする。
// **一覧は持たない。** 文の先頭・句点のあと・「の直後 に現れる「短い語＋：」を対象にする。
// 一覧を持つと、シートへ新しいトリガを足した時に太字にならない（死亡・解放が抜けていた）。
// マナのアイコン化より前に呼ぶこと（アイコンにした後だと「毎」だけが残って当たる）。
function _boldTriggerLabelsInHtml(html){
  return String(html||'').split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) return part;
    // 括弧内の注記（「（備考：〜）」）はラベルではないので、括弧を含む語は対象外にする。
    return part.replace(/(^|[。\n「　])([^\s。、「」（）()：:<>]{1,8})([：:])/g,(all,prefix,label,colon)=>{
      const meta=typeof PREVIEW_EFFECT_TRIGGER_CLASS!=='undefined'
        ?PREVIEW_EFFECT_TRIGGER_CLASS[label]
          ||(/^\d+マナ毎?$/.test(label)?PREVIEW_EFFECT_TRIGGER_CLASS.マナ効果:'')
        :'';
      return `${prefix}<strong class="effect-trigger-label${meta?` ${meta}`:''}">${label}</strong>${colon}`;
    });
  }).join('');
}
function _previewKeywordEntries(){
  if(typeof KW_DESC_MAP==='undefined'||!KW_DESC_MAP) return [];
  return Object.keys(KW_DESC_MAP).map(raw=>{
    const name=String(raw||'').trim();
    if(!name||name==='マナ効果') return null;
    const desc=String(KW_DESC_MAP[raw]||'');
    return {name,base:name.replace(/X$/,''),desc};
  }).filter(Boolean).sort((a,b)=>b.base.length-a.base.length);
}
function _previewKeywordMatchAllowed(text,match,index,entry){
  const rest=String(text||'').slice(index+match.length);
  // 「」で括ったカード名の一部はキーワードにしない（「宿業の刻印」の刻印など。2026-10-20 利用者指定）。
  // 「毒牙」「先制」のように括った中身がキーワードそのものの時は従来どおり太字にする。
  const source=String(text||''),open=source.lastIndexOf('「',index),close=source.lastIndexOf('」',index);
  if(open>close){
    const end=source.indexOf('」',index);
    if(end>=0&&source.slice(open+1,end)!==match) return false;
  }
  // 「封印される」のような動詞はキーワードではない。カード名「衝撃波」も同様に除外する。
  if(entry.base==='封印'&&/^(?:される|する|した|し|させる)/.test(rest)) return false;
  if(entry.base==='衝撃'&&/^波/.test(rest)) return false;
  return true;
}
function _findPreviewKeywordMatches(text){
  const source=String(text||'');
  const entries=_previewKeywordEntries();
  if(!source||!entries.length) return [];
  const names=entries.map(e=>e.base.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const re=new RegExp(`(?:${names.join('|')})(?:\\d+|X|∞)?`,'g');
  const result=[];
  let m;
  while((m=re.exec(source))){
    const entry=entries.find(e=>source.startsWith(e.base,m.index));
    if(!entry||!_previewKeywordMatchAllowed(source,m[0],m.index,entry)) continue;
    result.push({name:m[0],base:entry.base,index:m.index});
  }
  return result;
}
function _boldPreviewKeywordText(text){
  const source=String(text||''), hits=_findPreviewKeywordMatches(source);
  if(!hits.length) return source;
  let out='',cursor=0;
  hits.forEach(hit=>{
    if(hit.index<cursor) return;
    out+=source.slice(cursor,hit.index);
    out+=`<strong class="preview-keyword">${hit.name}</strong>`;
    cursor=hit.index+hit.name.length;
  });
  return out+source.slice(cursor);
}
function _boldKeywordsInHtml(html){
  // **太字にするキーワードの一覧はシート（KW_DESC_MAP）から作る。**
  // ここに名前を書き並べると、シートへ足したキーワード（防戦・呪詛など）が太字にならない。
  // 長い名前から先に当てる（「毒牙」を「毒」より先に判定するため）。
  const normalized=_stripStrongMarkupText(html);
  return normalized.split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) return part;
    return _boldPreviewKeywordText(part);
  }).join('');
}
// 効果テキストを他のカード説明と同じ規則で整形する：効果ごとに「：」より前を太字にする。
// シート上の効果区切りは実データでは改行ではなく全角スペースのため（例
// 「常時：〜。　誘発：〜。」）、改行に加えて「全角スペース＋短いラベル＋：」も改行として扱う。
function _formatJourneyEffectText(desc){
  const source=String(desc||'').split(/\n|　(?=[^：:　]{1,12}[：:])/);
  const lines=_sortPreviewEffectLines(source);
  const parts=lines.map(line=>{
    const text=String(line||'').trim();
    if(!text) return null;
    const m=text.match(/^([^：:]+)([：:])(.*)$/);
    const meta=_previewEffectMeta(text);
    const group=_previewLineGroup(text);
    if(!m) return {html:_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(text))),group};
    const rawBody=String(m[3]||'');
    const body=_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(rawBody)));
    if(!meta) return {html:`<strong class="effect-trigger-label">${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`,group};
    return {html:`<strong class="effect-trigger-label ${meta.className}">${_injectManaIcons(_escapePreviewHtml(m[1]))}</strong>${_escapePreviewHtml(m[2])}${body}`,group};
  }).filter(Boolean);
  return _joinPreviewParts(parts);
}
// 「旅の進捗」パネルのエリート/ボスホバー専用フォーマット。
// タイトル（カード名のみ）→カード画像→直線→効果テキストの順に組み立てる。
function _formatJourneyEnemyHtml(titleText,jsonStr){
  const titleLines=String(titleText||'').split('\n');
  const titleHtml=titleLines.map(l=>_escapePreviewHtml(l)).join('<br>');
  let title=`<strong class="preview-title">${titleHtml}</strong>`;
  let data=null;
  try{ data=JSON.parse(jsonStr); }catch(_e){}
  if(!data) return title;
  const enemyName=data.name||titleLines[titleLines.length-1]||'';
  // 「黄金の瞳“フレイ”」のような二つ名は、名前側の引用符の直前だけで改行する。
  // 効果本文中の「攻撃：「黒マッドキャット」…」にはこの改行を適用しない。
  const enemyNameParts=String(enemyName).match(/^(.*?)([“"])(.*)$/);
  const enemyNameHtml=enemyNameParts
    ?`<span class="journey-enemy-prefix">${_escapePreviewHtml(enemyNameParts[1])}</span><br><span class="journey-enemy-main-name">${_escapePreviewHtml(enemyNameParts[2]+enemyNameParts[3])}</span>`
    :_escapePreviewHtml(enemyName);
  // エリート／ボスの見出しには色アイコンを表示しない。
  // 色アイコンは通常のキャラクター説明（_formatPreviewHtml）の見出しだけに表示する。
  title=`<strong class="preview-title journey-enemy-title"><span class="journey-enemy-name">${enemyNameHtml}</span></strong>`;
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
  const kws=Array.isArray(data.keywords)?coreNormalizeShieldKeywords(data.keywords.map(k=>String(k||'').trim()).filter(Boolean)):[];
  // _boldKeywordsInHtml()は固定のキーワード一覧しか太字にしないため、敵のキーワードには
  // 当たらない。ここは「キーワードそのものを並べる」箇所なので無条件に太字にする。
  const kwHtml=kws.length
    ?`<span class="preview-owned-keywords">${kws.map(k=>`<strong class="preview-keyword">${_injectManaIcons(_escapePreviewHtml(k))}</strong>`).join(' / ')}</span>`
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
  // **説明は種類ごとに1回だけ、変数はXのまま出す**（キーワード欄に数値が出ているため）。
  const kwDescSeen=new Set();
  const toHtml=line=>{
    const m=String(line||'').match(/^([^：:]+)：(.*)$/);
    return m?`<strong class="effect-trigger-label">${_escapePreviewHtml(m[1])}</strong>：${_injectManaIcons(_escapePreviewHtml(m[2]))}`:'';
  };
  const kwDescHtml=allKws.flatMap(k=>{
    const base=k.replace(/\d+$/,'');
    if(!base||kwDescSeen.has(base)) return [];
    kwDescSeen.add(base);
    const lines=[_keywordDescLine(base,k)];
    // 付与する状態異常（毒牙→毒、衝撃→弱体）の説明をすぐ下に続ける。
    _keywordFollowUps(base).forEach(f=>{
      if(kwDescSeen.has(f)) return;
      kwDescSeen.add(f);
      lines.push(_keywordDescLine(f));
    });
    return lines.filter(Boolean).map(toHtml);
  }).filter(Boolean).join('<br>');
  // キーワード欄へ既に出した語だけで構成される単独行は本文へ重ねない。
  // スケルトンキングの「復活\n攻撃：…」のようなデータで、復活が
  // キーワード色と本文色の2つに見えるのを防ぐ。
  const shownKeywordNames=new Set(allKws.map(k=>String(k||'').trim().replace(/\d+$/,'')).filter(Boolean));
  const visibleDesc=descRaw.split('\n').filter(line=>{
    const tokens=String(line||'').trim().split(/[\s　]+/).filter(Boolean);
    return !(tokens.length&&tokens.every(t=>shownKeywordNames.has(t.replace(/\d+$/,''))));
  }).join('\n').trim();
  const descText=visibleDesc?_formatJourneyEffectText(visibleDesc):'';
  // キーワード効果とタイミング付きの効果の間にも直線を置く（_joinPreviewParts と同じ規則）。
  const body=[kwHtml,descText].filter(Boolean).join(sectionRule);
  const kwSection=kwDescHtml?`${sectionRule}<span class="journey-keyword-descriptions">${kwDescHtml}</span>`:'';
  return `${title}${cardHtml}${sectionRule}${body}${kwSection}`;
}
function _formatPreviewHtml(desc,opt){
  const plainTitle=!!(opt&&opt.plainTitle);
  const titleColor=String(opt&&opt.titleColor||'').trim();
  const clean=_shieldDisplayText(_stripStrongMarkupText(desc).replace(/<[^>]*>/g,''));
  const sectionRule='<div class="preview-section-rule"></div>';
  // シート上では複数効果が改行ではなく「全角空白＋次のタイミング：」で
  // 連結されている場合があるため、旅の進捗と同じ規則で表示行へ分割する。
  const sourceLines=clean.split(/\n|　(?=[^：:　]{1,12}[：:])/);
  const orderedLines=opt&&opt.sortEffects?_sortPreviewEffectLines(sourceLines):sourceLines;
  const lines=orderedLines.map((line,li)=>{
    if(li===0){
      const title=_escapePreviewHtml(line);
      const colorPath=titleColor&&typeof _colorIconPath==='function'?_colorIconPath(titleColor):'';
      const colorIcon=colorPath?`<img class="preview-title-color-icon" src="${_escapePreviewHtml(colorPath)}" alt="${_escapePreviewHtml(titleColor)}">`:'';
      return `<strong class="preview-title"><span class="preview-title-text">${plainTitle?title:_injectManaIcons(_boldKeywordsInHtml(title))}</span>${colorIcon}</strong>`;
    }
    if(line==='__CHARACTER_DESC_SEPARATOR__') return sectionRule;
    const m=line.match(/^([^：:]+)([：:])(.*)$/);
    if(!m) return _injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(line)));
    if(m[1]==='キーワード'){
      // 「キーワード：」というラベル自体は表示せず、キーワードそのものだけを太字で並べる
      const ownedKeywords=_stripStrongMarkupText(m[3]).split(/\s*\/\s*/).map(k=>k.trim()).filter(Boolean)
        .map(k=>`<strong class="preview-keyword">${_injectManaIcons(_escapePreviewHtml(k))}</strong>`).join(' / ');
      return `<span class="preview-owned-keywords">${ownedKeywords}</span>`;
    }
    let body=_injectManaIcons(_boldTriggerLabelsInHtml(_boldKeywordsInHtml(_escapePreviewHtml(m[3]))));
    const meta=_previewEffectMeta(line);
    // 「Xマナ：」「Xマナ毎：」ラベルはマナ数分のアイコンに変換する（他のタイミングラベルと違い文字列のまま太字にしない）
    if(/^\d+マナ毎?$/.test(m[1])){
      return `<strong class="effect-trigger-label ${meta?meta.className:''}">${_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(m[1])))}</strong>${_escapePreviewHtml(m[2])}${body}`;
    }
    return `<strong class="effect-trigger-label ${meta?meta.className:''}">${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`;
  });
  // .preview-title は display:block のため、直後に<br>を挟むと1行分余分な空白ができる
  const parts=lines.slice(1).map((html,i)=>({
    html,
    group:orderedLines[i+1]==='__CHARACTER_DESC_SEPARATOR__'?'':_previewLineGroup(orderedLines[i+1]),
  }));
  return lines[0]+_joinPreviewParts(parts);
}
// **効果の種類が変わる所に直線（info_line.svg）を置く。**（利用者指定）
// 種類＝キーワード効果／開戦／解放／攻撃／負傷／死亡／常時／マナ効果／終戦。
// マナ効果は必要量が違っても1つの種類として扱う。種類を持たない行（本文の続きなど）は直前の種類のまま。
function _previewLineGroup(line){
  const text=String(line||'').trim();
  if(/^キーワード[：:]/.test(text)) return 'キーワード効果';
  const meta=_previewEffectMeta(text);
  return meta?meta.kind:'';
}
function _joinPreviewParts(parts){
  const sectionRule='<div class="preview-section-rule"></div>';
  let body='';
  let previousGroup='';
  (parts||[]).forEach(({html,group})=>{
    if(html===sectionRule){
      if(!body.endsWith(sectionRule)) body+=sectionRule;
      previousGroup='';
      return;
    }
    if(group&&previousGroup&&group!==previousGroup&&body&&!body.endsWith(sectionRule)) body+=sectionRule;
    if(group) previousGroup=group;
    if(body&&!body.endsWith(sectionRule)) body+='<br>';
    body+=html;
  });
  return body;
}
// キャラクター効果の表示順。戦闘ルールには触れず、ホバー説明の行だけを並べ替える。
const PREVIEW_EFFECT_TRIGGER_ORDER={開戦:0,解放:1,攻撃:2,負傷:3,死亡:4,常時:5,マナ効果:6,終戦:7};
const PREVIEW_EFFECT_TRIGGER_CLASS={開戦:'trigger-opening',解放:'trigger-release',攻撃:'trigger-attack',負傷:'trigger-injury',死亡:'trigger-death',常時:'trigger-passive',マナ効果:'trigger-mana',終戦:'trigger-ending'};
function _previewEffectMeta(line){
  const m=String(line||'').trim().match(/^([^：:]+)[：:]/);
  if(!m) return null;
  const label=String(m[1]||'').trim();
  const kind=/^\d+マナ(?:毎)?$/.test(label)?'マナ効果':label;
  if(!(kind in PREVIEW_EFFECT_TRIGGER_ORDER)) return null;
  // マナ効果は必要量が違えば別タイミングなので、実際の表記をキーにする。
  const key=kind==='マナ効果'?label:kind;
  const suborder=kind==='マナ効果'?(parseInt(label,10)||0):0;
  return {key,kind,label,order:PREVIEW_EFFECT_TRIGGER_ORDER[kind],suborder,className:PREVIEW_EFFECT_TRIGGER_CLASS[kind]};
}
function _sortPreviewEffectLines(lines){
  // 区切り線をまたいで説明の所属を変えない。各節内でだけ安定ソートする。
  const result=[];
  let segment=[];
  const flush=()=>{
    const slots=[];
    const effects=[];
    segment.forEach((line,index)=>{
      const meta=_previewEffectMeta(line);
      if(meta){ slots.push(index); effects.push({line,index,...meta}); }
    });
    effects.sort((a,b)=>a.order-b.order||a.suborder-b.suborder||a.index-b.index);
    const sorted=segment.slice();
    slots.forEach((slot,index)=>{ sorted[slot]=effects[index].line; });
    result.push(...sorted);
    segment=[];
  };
  (lines||[]).forEach(line=>{
    if(line==='__CHARACTER_DESC_SEPARATOR__'){ flush(); result.push(line); }
    else segment.push(line);
  });
  flush();
  return result;
}
// 説明にXを含むキーワードは、名前の末尾にXを付けて出す（例：邪眼X）。
// 数値そのものはキーワード欄（「邪眼2」）に出ているので、こちらは変数のまま。
function _keywordDescLabel(base,desc){
  const name=String(base||'').trim();
  return name!=='結界'&&/X/.test(String(desc||''))?`${name}X`:name;
}
// **付与する状態異常の説明も続けて出す。**（利用者指定）
// 「毒牙X」だけでは何が起きるか読み取れないので、その下に「毒X」の説明を並べる。
// 追加する時はここだけに書くこと（キーワード説明を作る場所は2つあり、両方がこれを見る）。
const KW_FOLLOW_UP_DESCS={ '毒牙':['毒'], '衝撃':['弱体'] };
function _keywordFollowUps(base){
  return (KW_FOLLOW_UP_DESCS[String(base||'').trim()]||[]).slice();
}
// キーワード1つ分の説明行（「名前X：説明」）。説明が無ければ空文字。
function _keywordDescLine(name,lookupKey){
  const base=String(name||'').trim();
  if(!base) return '';
  const key=lookupKey||base;
  let d=(typeof KW_DESC_MAP!=='undefined'&&(KW_DESC_MAP[key]||KW_DESC_MAP[base]))||'';
  if(!d&&typeof _enchantKeywordDesc==='function') d=_enchantKeywordDesc(key)||'';
  d=_shieldKeywordDescription(base,d);
  return d?`${_keywordDescLabel(base,d)}：${d}`:'';
}
function _keywordOnlyPreviewText(card,desc,slotIdx){
  const seen=new Set();
  const mapText=card&&card._mapPanelPowerText||'';
  const adjustMapText=value=>typeof coreMapPanelPowerAdjustManaText==='function'
    ?coreMapPanelPowerAdjustManaText(value,mapText):String(value||'');
  const rawDesc=[desc,typeof _rawSubstitutedDesc==='function'&&card?_rawSubstitutedDesc(card):'',card&&card.desc]
    .filter(Boolean).map(adjustMapText).join('\n');
  const sourceKws=slotIdx!=null&&typeof _unitDisplayKeywords==='function'
    ?_unitDisplayKeywords(card,desc||'',slotIdx):(card&&card.keywords||[]);
  // 「マナ効果」は説明専用の擬似キーワード。キャラクター本文のキーワード一覧には加えず、
  // manaCostを持つキャラ、または接続強化を含む効果文に「Xマナ（毎）：」があるキャラの
  // keyword-tooltipだけに追加する。
  let manaEffectText=`${rawDesc}\n${adjustMapText(card&&card._manaThresholdDesc||'')}`;
  if(card&&slotIdx!=null&&typeof _groupedEnchantEffectTexts==='function'){
    const grouped=_groupedEnchantEffectTexts(card,slotIdx);
    manaEffectText+=`\n${[...(grouped.normalTexts||[]),...(grouped.charTexts||[])].map(adjustMapText).join('\n')}`;
  }
  const pseudoKeywords=[];
  if(typeof KW_DESC_MAP!=='undefined'&&KW_DESC_MAP['マナ効果']
    &&/(?:^|\n)\s*\d+\s*マナ(?:毎)?\s*[:：]/.test(manaEffectText)) pseudoKeywords.push('マナ効果');
  if(typeof KW_DESC_MAP!=='undefined'&&KW_DESC_MAP['起動効果']
    &&/(?:^|\n)\s*起動\s*[:：]/.test(manaEffectText)) pseudoKeywords.push('起動効果');
  const tooltipKws=[...sourceKws,...pseudoKeywords];
  // 「即死する」は本文による確率判定。キーワード「即死」の所持や付与ではない。
  _findPreviewKeywordMatches(manaEffectText.replace(/即死(?:する|させる)/g,'')).forEach(hit=>tooltipKws.push(hit.name));
  // **説明は種類ごとに1回だけ、変数はXのまま出す。**
  // 結界は固定の1回として説明し、その他の数値キーワードは一般的な説明を出す。
  return tooltipKws.map(k=>String(k||'').trim()).filter(Boolean)
    .filter(k=>typeof _INTERNAL_ONLY_ENCHANT_NAMES==='undefined'||!_INTERNAL_ONLY_ENCHANT_NAMES.has(k))
    .flatMap(k=>{
      // 数値・変数記号付きのキーワードは、説明辞書を引く際だけ基底名へ戻す。
      // 例：「封印1」「封印X」「封印∞」はいずれも「封印」の説明を使う。
      const base=k.replace(/(?:\d+|X|∞)+$/,'');
      if(!base||seen.has(base)) return [];
      seen.add(base);
      let desc=(typeof KW_DESC_MAP!=='undefined'&&(KW_DESC_MAP[k]||KW_DESC_MAP[base]))||
        (typeof _enchantKeywordDesc==='function'?_enchantKeywordDesc(k):'');
      desc=_shieldKeywordDescription(base,desc);
      // 変数を持つキーワードは名前の末尾にXを付ける（例：邪眼X）。
      const lines=[desc?`${_keywordDescLabel(base,desc)}：${desc}`:''];
      // 付与する状態異常（毒牙→毒、衝撃→弱体）の説明をすぐ下に続ける。
      _keywordFollowUps(base).forEach(f=>{
        if(seen.has(f)) return;
        seen.add(f);
        lines.push(_keywordDescLine(f));
      });
      return lines;
    }).filter(Boolean).join('\n');
}
// アイテム／指輪はカードと異なり、キーワード列が無いデータもある。
// 説明文・指輪タグに含まれる「キーワード説明辞書に登録済みの語」だけを拾い、
// カード名や通常の効果文を誤ってキーワードとして表示しない。
function _auxiliaryKeywordPreviewText(card,desc){
  if(!card) return '';
  const rawDesc=String(desc??card.desc??card.description??card.effectText??card.effect??'');
  const rawTag=String(card.tag??card.tags??'');
  const source=[...(Array.isArray(card.keywords)?card.keywords:[]),rawTag].filter(Boolean).map(String);
  const haystack=`${rawDesc}\n${rawTag}`;
  const names=typeof KW_DESC_MAP!=='undefined'&&KW_DESC_MAP
    ?Object.keys(KW_DESC_MAP).filter(Boolean).sort((a,b)=>b.length-a.length):[];
  names.forEach(name=>{
    const escaped=String(name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const m=haystack.match(new RegExp(`${escaped}\\d*`));
    if(m) source.push(m[0]);
  });
  const keywords=[...new Set(source.map(k=>String(k).trim()).filter(Boolean))];
  if(!keywords.length) return '';
  return _keywordOnlyPreviewText({...card,keywords},rawDesc);
}
function _formatKeywordOnlyHtml(text){
  return _shieldDisplayText(text).split('\n').filter(Boolean).map(line=>{
    const m=line.match(/^([^：:]+)[：:](.*)$/);
    if(!m) return _injectManaIcons(_escapePreviewHtml(line));
    return `<strong class="effect-trigger-label">${_escapePreviewHtml(m[1])}</strong>：${_injectManaIcons(_escapePreviewHtml(m[2]))}`;
  }).join('<br>');
}
function _formatMapPowerHtml(desc){
  const lines=String(desc||'').split('\n');
  const title=_escapePreviewHtml(lines.shift()||'');
  const body=_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(lines.join('\n')))).replace(/\n/g,'<br>');
  return `<strong class="preview-title">${title}</strong>${body}`;
}
// 旅の進捗の通常マス／Scene名は、改行を含んでも全行を同じ見出しとして描く。
// 街名の「地名 固有名」を2行にした時、2行目だけ本文サイズへ落ちるのを防ぐ。
function _formatTitleOnlyHtml(desc){
  const lines=String(desc||'').split('\n');
  const title=lines.map((line,i)=>{
    const text=_escapePreviewHtml(line);
    if(lines.length===1&&line==='一般戦闘') return `<span class="journey-battle-prefix">${text}</span>`;
    return lines.length>1&&i===0?`<span class="journey-town-prefix">${text}</span>`:text;
  }).join('<br>');
  return `<strong class="preview-title">${title}</strong>`;
}
function _previewRarityLine(card){
  return '';
}
function _plainEffectTextForPreview(card,owner){
  if(!card) return '';
  const raw=(typeof _rawSubstitutedDesc==='function'?_rawSubstitutedDesc(card,owner):String(card.desc||card.effectText||card.effect||''));
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
  const costs=[...new Set([Number(card.manaCost)||0,...extraCosts].map(v=>coreManaThresholdCost(card,v)).filter(v=>v>0))];
  if(path) costs.forEach((cost,i)=>{
    entries.push(`<span class="activation-cost-entry mana-cost-entry${i===0?' mana-primary':''}" data-mana-cost="${cost}"><img src="${path}" alt=""><b>${cost}</b></span>`);
  });
  return entries.length?`<span class="card-activation-costs mana-cost-orbs">${entries.join('')}</span>`:'';
}
function _sealCostValue(card){
  if(!card) return 0;
  const kws=[...(card.keywords||[]),...(card.adjacentKeywords||[])];
  if(card._mapPanelPowerText) return coreSealValue({...card,keywords:kws});
  if(card._sealInfinity||kws.some(k=>/^封印\s*∞$/.test(String(k||'')))) return Infinity;
  // 封印は持っている分を合計する（戦闘の coreSealValue と同じ。封印3＋封印されしもの＝封印12）。
  const sealKws=kws.filter(k=>/^封印\s*\d+$/.test(String(k||'')));
  if(sealKws.length) return sealKws.reduce((sum,k)=>sum+Math.max(1,parseInt(String(k).replace(/\D/g,''),10)||1),0);
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
  const cost=coreManaThresholdCost(entity,entity&&entity.manaCost);
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
// ホバー説明はゲーム画面の上下左右70pxを除いた範囲へ収める。
// 数値は3840x2160の設計pxなので、実表示では--game-scaleを掛ける。
function _tooltipSafeBounds(){
  const rs=getComputedStyle(document.documentElement);
  const scale=parseFloat(rs.getPropertyValue('--game-scale'))||1;
  const offX=parseFloat(rs.getPropertyValue('--game-offset-x'))||0;
  const offY=parseFloat(rs.getPropertyValue('--game-offset-y'))||0;
  const margin=70*scale;
  const gameLeft=Math.max(0,offX);
  const gameTop=Math.max(0,offY);
  const gameRight=Math.min(window.innerWidth,offX+3840*scale);
  const gameBottom=Math.min(window.innerHeight,offY+2160*scale);
  const left=gameLeft+margin;
  const right=Math.max(left,gameRight-margin);
  const top=gameTop+margin;
  const bottom=Math.max(top,gameBottom-margin);
  return {left,right,top,bottom,width:right-left,height:bottom-top,scale};
}
function _posKwTip(tip,e,dx=0,dy=0,below=false){
  const tw=tip.offsetWidth, th=tip.offsetHeight;
  const safe=_tooltipSafeBounds();
  if(below){
    // カーソルの右下に出す。画面外へ出る場合だけ内側へ寄せる。
    const x=e.clientX+18+dx, y=e.clientY+18+dy;
    tip.style.left=Math.max(safe.left,Math.min(x,safe.right-tw))+'px';
    tip.style.top=Math.max(safe.top,Math.min(y,safe.bottom-th))+'px';
    return;
  }
  const x=e.clientX+12+dx, y=e.clientY-8+dy;
  tip.style.left=Math.max(safe.left,Math.min(x,safe.right-tw))+'px';
  // カーソルの上に出せるならそちら、無理なら下。どちらでも背景の下端からはみ出さないよう戻す。
  tip.style.top=Math.max(safe.top,Math.min((y-th>safe.top?y-th:y+16),safe.bottom-th))+'px';
}
function _posTipRelative(tip,anchor,side,clampY=true){
  const ar=anchor.getBoundingClientRect();
  const gap=12*_tooltipSafeBounds().scale;
  const tw=tip.offsetWidth,th=tip.offsetHeight;
  const safe=_tooltipSafeBounds();
  const useBelow=side==='below'||(side==='right-or-below'&&ar.right+gap+tw>safe.right);
  const x=useBelow?ar.left:ar.right+gap;
  const y=useBelow?ar.bottom+gap:ar.top;
  tip.style.left=Math.max(safe.left,Math.min(x,safe.right-tw))+'px';
  tip.style.top=(clampY?Math.max(safe.top,Math.min(y,safe.bottom-th)):y)+'px';
}
// **編成画面の魔導板・報酬カード枠のホバー説明（カード・キーワード・特殊マス）は、原則右に出すが、
// 右に出した時に他のカードを隠す面積が、左に出した時より20%以上多ければ左に出す。**（2026-09-30 利用者指定）
// 数えるのは魔導板と報酬カード枠に置かれているカードだけ（空きマス・特殊マスの枠、デバッグカード領域は数えない）。
// 空きマスも数えると、何も無いマスを覆う側を避けてカードを隠す側へ出てしまった（2026-09-30 利用者指摘）。
// 右にも左にもカードが無ければ右のまま。
// 店・行商人・鍛冶屋などの施設でも同じ規則にする（2026-10-16 利用者指摘：行商人で常に右に出てカードを隠していた）。
function _formationTipPrefersLeft(anchor,safe,w,h,top,rightLeft,leftLeft){
  if(typeof G==='undefined'||!G||G.phase!=='reward') return false;
  if(!anchor||!anchor.closest||!anchor.closest('#hand-slots,#reward-offer-row')) return false;
  const others=[...document.querySelectorAll('#hand-slots .card,#reward-offer-row > .rew-card,#reward-offer-row > .character-card')]
    .filter(el=>el!==anchor&&!anchor.contains(el)&&!el.contains(anchor)&&!el.classList.contains('card-empty'))
    .map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0);
  if(!others.length) return false;
  const t=Math.max(safe.top,Math.min(top,safe.bottom-h));
  const cover=left=>{
    const l=Math.max(safe.left,Math.min(left,safe.right-w)),r=l+w,b=t+h;
    return others.reduce((sum,o)=>sum+Math.max(0,Math.min(r,o.right)-Math.max(l,o.left))*Math.max(0,Math.min(b,o.bottom)-Math.max(t,o.top)),0);
  };
  const right=cover(rightLeft),left=cover(leftLeft);
  return right>0&&right>=left*1.2;
}
// 説明・キーワード説明・マス説明を、1つの縦長グループとして配置する。
// side＝基準の右15px（見切れるなら左）、above＝真上15px（見切れるなら下）。
// 70pxセーフゾーンへ平行移動しても縦に収まらない場合は、まず特殊マス説明を右列へ移す。
// それでも収まらない場合は、右列を「キーワード説明→特殊マス説明」の順に積む。
function _positionTooltipGroup(tips,anchor,placement='side'){
  const shown=(tips||[]).filter(el=>el&&el.style.display==='block');
  if(!shown.length||!anchor?.getBoundingClientRect) return false;
  const ar=anchor.getBoundingClientRect();
  const safe=_tooltipSafeBounds();
  const scale=safe.scale;
  const anchorGap=15*scale;
  const itemGap=12*scale;
  const main=shown.find(el=>el.id==='kw-tooltip');
  const keyword=shown.find(el=>el.id==='keyword-tooltip');
  const map=shown.find(el=>el.id==='map-power-tooltip');
  // offsetWidth/offsetHeightは整数へ丸められ、15pxの隙間が表示倍率によって約1設計pxずれる。
  // 配置とセーフゾーン判定には小数を保持する実描画矩形を使う。
  const sizes=new Map(shown.map(el=>{
    const rect=el.getBoundingClientRect();
    return [el,{width:rect.width,height:rect.height}];
  }));
  const makeColumn=items=>{
    const active=items.filter(Boolean);
    const positions=new Map();
    const width=active.length?Math.max(...active.map(el=>sizes.get(el).width)):0;
    let y=0;
    active.forEach(el=>{ positions.set(el,{x:0,y}); y+=sizes.get(el).height+itemGap; });
    return {positions,width,height:active.length?y-itemGap:0};
  };
  const joinColumns=(leftItems,rightItems)=>{
    const left=makeColumn(leftItems),right=makeColumn(rightItems);
    const positions=new Map(left.positions);
    right.positions.forEach((pos,el)=>positions.set(el,{x:left.width+itemGap,y:pos.y}));
    return {
      positions,
      width:left.width+(left.width&&right.width?itemGap:0)+right.width,
      height:Math.max(left.height,right.height)
    };
  };
  let layout=makeColumn(shown);
  const fits=box=>box.width<=safe.width+.5&&box.height<=safe.height+.5;
  if(!fits(layout)&&main&&map){
    // 第1縮約：キャラ説明＋キーワード説明を左列、特殊マス説明を右列へ置く。
    layout=joinColumns([main,keyword],[map]);
    if(!fits(layout)&&keyword){
      // 第2縮約：キャラ説明を左列、キーワード説明＋特殊マス説明を右列へ置く。
      layout=joinColumns([main],[keyword,map]);
    }
  }
  const groupWidth=layout.width;
  const groupHeight=layout.height;
  let groupLeft=0,groupTop=0;
  // status-above＝所持金・ライフ・マナ・血。真上15pxに固定し、見切れても下へは回さない（下の clamp で内側へ寄せる）。
  if(placement==='above'||placement==='status-above'){
    groupLeft=ar.left+ar.width/2-groupWidth/2;
    groupTop=ar.top-anchorGap-groupHeight;
    if(placement==='above'&&groupTop<safe.top) groupTop=ar.bottom+anchorGap;
  }else{
    const rightLeft=ar.right+anchorGap,leftLeft=ar.left-anchorGap-groupWidth;
    groupLeft=rightLeft;
    groupTop=ar.top+ar.height/2-groupHeight/2;
    if(groupLeft+groupWidth>safe.right) groupLeft=leftLeft;
    else if(_formationTipPrefersLeft(anchor,safe,groupWidth,groupHeight,groupTop,rightLeft,leftLeft)) groupLeft=leftLeft;
  }
  groupLeft=Math.max(safe.left,Math.min(groupLeft,safe.right-groupWidth));
  groupTop=Math.max(safe.top,Math.min(groupTop,safe.bottom-groupHeight));
  shown.forEach(el=>{
    const pos=layout.positions.get(el)||{x:0,y:0};
    // 1列のアイコン上表示だけは、幅の異なる枠をグループ中央へ揃える。
    const centeredOffset=layout.positions.size===shown.length&&layout.width===Math.max(...shown.map(x=>sizes.get(x).width))
      &&(placement==='above'||placement==='status-above')?(layout.width-sizes.get(el).width)/2:0;
    el.style.left=`${groupLeft+pos.x+centeredOffset}px`;
    el.style.top=`${groupTop+pos.y}px`;
  });
  return true;
}
function _fitTooltipStack(tips){
  const shown=tips.filter(el=>el&&el.style.display==='block');
  if(!shown.length) return;
  const safe=_tooltipSafeBounds();
  const bottom=Math.max(...shown.map(el=>el.getBoundingClientRect().bottom));
  const overflow=bottom-safe.bottom;
  if(overflow>0){
    shown.forEach(el=>{
      const top=parseFloat(el.style.top)||el.getBoundingClientRect().top;
      el.style.top=Math.max(safe.top,top-overflow)+'px';
    });
  }
}

// 味方の全スロット（MAX_ALLIES件）DOM 要素を配列で返す（lane 対応・ピッカー用）
