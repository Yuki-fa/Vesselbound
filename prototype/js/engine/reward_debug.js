// reward_debug.js — デバッグモードの編成画面に出すカード一覧（全カードを並べ、ドラッグで魔導板・報酬枠へ置く）
// 2026-10-25 リファクタリング：reward.js から移した（処理は変えていない）。reward.js の直後に読み込む。

function _debugPanelSortValue(card){
  const raw=String(card&&(
    card.no??card.No??card['No.']??card.imageNo??card.artCode??''
  )||'').trim();
  const n=parseInt(raw.replace(/^\D+/,''),10);
  return Number.isFinite(n)?n:99999;
}

function _debugImplementedPanelCards(){
  const kind=String(G&&G._debugPaletteKind||'character');
  if(kind==='item'){
    if(typeof ITEM_POOL==='undefined'||!Array.isArray(ITEM_POOL)) return [];
    return ITEM_POOL.filter(p=>p&&p.id&&p.name&&String(p.name)!=='false'&&p._implemented!==false&&p.implemented!==false)
      .sort((a,b)=>_debugPanelSortValue(a)-_debugPanelSortValue(b)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
  }
  if(kind==='ring'){
    if(typeof RING_POOL==='undefined'||!Array.isArray(RING_POOL)) return [];
    return RING_POOL.filter(p=>p&&p.id&&p.name&&String(p.name)!=='false'&&p._implemented!==false&&p.implemented!==false)
      .sort((a,b)=>_debugPanelSortValue(a)-_debugPanelSortValue(b)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
  }
  if(typeof PANEL_POOL==='undefined'||!Array.isArray(PANEL_POOL)) return [];
  return PANEL_POOL.filter(p=>{
    // **シートに行が無いカード（_sheetSeen が無い）は出さない。** 報酬・商店（_isImplementedPoolCard）と同じ基準。
    // pool.js に残った旧スタブ（「生贄」）がシートから消しても一覧に出続けていた。
    if(!p||!p.id||p.removed||p._implemented===false||p.rarity===-1||!p._sheetSeen) return false;
    const cat=String(p.category||'');
    if(kind==='character') return cat==='キャラクター';
    return cat==='強化'||cat==='エンチャント';
  }).sort((a,b)=>_debugPanelSortValue(a)-_debugPanelSortValue(b)||String(a.name||'').localeCompare(String(b.name||''),'ja'));
}

function _debugPanelDirectionCount(def){
  const raw=Number(def&&def.directionCount);
  if(Number.isFinite(raw)&&raw>=0) return Math.min(4,Math.max(0,Math.floor(raw)));
  const cat=String(def&&def.category||'');
  if(cat==='キャラクター') return 2;
  return 2;
}
function _debugRotatedDirections(def){
  const dirs=['up','right','down','left'];
  const cat=String(def&&def.category||'');
  const count=_debugPanelDirectionCount(def);
  if(count===0) return [];
  // デバッグ配置では、回転4/5を相互接続用のプリセットにする。
  // キャラクターと強化を同じ回転で置いても、通常の連続2方向
  // （up+right 等）だけでは隣接方向が噛み合わず、効果検証自体が
  // できない。回転4=縦、回転5=横なら双方が相手方向を持つ。
  if(count===2&&((G&&G._debugDirRotation)||0)%6===4) return ['up','down'];
  if(count===2&&((G&&G._debugDirRotation)||0)%6===5) return ['left','right'];
  if(count===2&&cat!=='キャラクター'){
    const patterns=[['up','right'],['right','down'],['down','left'],['left','up'],['up','down'],['left','right']];
    return patterns[((G&&G._debugDirRotation)||0)%patterns.length].slice();
  }
  const start=((G&&G._debugDirRotation)||0)%dirs.length;
  const out=[];
  for(let i=0;i<count;i++) out.push(dirs[(start+i)%dirs.length]);
  return out;
}
function _debugMakePanelCard(id){
  const kind=String(G&&G._debugPaletteKind||'character');
  if(kind==='item'){
    const card=typeof makeItem==='function'?makeItem(id):null;
    if(card){
      card._debugInfiniteCard=true; card._buyPrice=0;
      if(!card.artCode&&!card.imageNo) card.artCode=String(card.no||card.No||card['No.']||'');
    }
    return card;
  }
  if(kind==='ring'){
    const def=typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL)?RING_POOL.find(p=>p&&p.id===id):null;
    const card=def?clone(def):null;
    if(card){ card._debugInfiniteCard=true; card._buyPrice=0; }
    return card;
  }
  const def=typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL.find(p=>p&&p.id===id):null;
  const card=typeof makePanel==='function'?makePanel(id):(def?clone(def):null);
  if(card&&def){
    card.directions=_debugRotatedDirections(def);
    card._debugDirections=card.directions.slice();
  }
  if(card) card._debugInfiniteCard=true;
  return card;
}
function _debugPanelCode(def,kind,index){
  const raw=String(def&&(
    def.no??def.No??def['No.']??def.imageNo??def.artCode??''
  )||'').trim();
  if(raw) return raw.match(/^[A-Za-z]+\d+$/)?raw:`${kind==='enchant'?'E':kind==='character'?'C':''}${raw.padStart(3,'0')}`;
  const prefix=kind==='enchant'?'E':kind==='character'?'C':'';
  return prefix?`${prefix}${String(index+1).padStart(3,'0')}`:'';
}
function _debugPanelDisplayNo(code){
  const m=String(code||'').match(/(\d+)$/);
  return m?m[1]:String(code||'');
}
function _debugTakePanelCard(id){
  if(!G||!G._debugMode||G.phase!=='reward') return;
  const kind=String(G._debugPaletteKind||'character');
  if(kind==='item'){
    const card=_debugMakePanelCard(id);
    G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:Array(4).fill(null);
    while(G.spellSlots.length<4) G.spellSlots.push(null);
    const idx=G.spellSlots.findIndex(v=>!v);
    if(!card||idx<0){ return; }
    G.spellSlots[idx]=card;
    _playRewardAcquireSfx('item_get.wav');
    // アイテム枠・指輪枠の絵は_syncRewardProductionUi()が描くので、
    // renderHandEditor()だけでは反映されない（カード配置等で他の経路が走るまで出ない）。
    renderHandEditor(); _syncRewardProductionUi(); updateHUD();
    return;
  }
  if(kind==='ring'){
    const card=_debugMakePanelCard(id);
    if(!card||!_takeRingCard(card)){ return; }
    if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
    renderHandEditor(); _syncRewardProductionUi(); updateHUD();
    return;
  }
  if(typeof makePanel!=='function') return;
  if(G._pendingPanelPlacement) G._pendingPanelPlacement=null;
  const card=_debugMakePanelCard(id);
  if(!card) return;
  startPanelPlacement(card,()=>{},'DEBUG');
}

function renderDebugCardPalette(){
  const host=document.getElementById('debug-card-palette');
  if(!host) return;
  document.body.classList.toggle('debug-mode',!!(G&&G._debugMode));
  if(!G||!G._debugMode||G.phase!=='reward'){
    host.innerHTML='';
    document.body.classList.remove('debug-mode');
    return;
  }
  if(!['character','enchant','item','ring'].includes(G._debugPaletteKind)) G._debugPaletteKind='character';
  const prevList=host.querySelector('.debug-palette-list');
  const prevScrollTop=prevList?prevList.scrollTop:(G._debugPaletteScrollTop||0);
  const pendingId=G._pendingPanelPlacement&&G._pendingPanelPlacement.card&&G._pendingPanelPlacement.card.id;
  const kind=G._debugPaletteKind;
  const tab=(key,label)=>`<button type="button" class="debug-palette-kind${kind===key?' active':''}" data-kind="${key}">${label}</button>`;
  const title={character:'DEBUG CARD',enchant:'DEBUG ENCHANT',item:'DEBUG ITEM',ring:'DEBUG RING'}[kind];
  host.innerHTML=`<div class="debug-palette-head"><div class="debug-palette-tabs">${tab('character','キャラ')}${tab('enchant','強化')}${tab('item','アイテム')}${tab('ring','指輪')}</div><div class="debug-palette-title">${title}</div><button type="button" class="debug-palette-rotate"${kind==='item'||kind==='ring'?' disabled':''}>回転</button></div><div class="debug-palette-list"></div>`;
  host.querySelectorAll('.debug-palette-kind').forEach(btn=>{
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      G._debugPaletteKind=['character','enchant','item','ring'].includes(btn.dataset.kind)?btn.dataset.kind:'character';
      renderDebugCardPalette();
    };
  });
  const rot=host.querySelector('.debug-palette-rotate');
  if(rot) rot.onclick=e=>{
    e.preventDefault();
    e.stopPropagation();
    G._debugDirRotation=((G._debugDirRotation||0)+1)%6;
    renderDebugCardPalette();
  };
  const list=host.querySelector('.debug-palette-list');
  _debugImplementedPanelCards().forEach((def,debugIdx)=>{
    const card=_debugMakePanelCard(def.id);
    if(!card) return;
    const debugCode=_debugPanelCode(def,kind,debugIdx);
    if(debugCode){
      if(!card.no&&!card.No&&!card['No.']&&!card.imageNo&&!card.artCode) card.no=debugCode;
      if(!card.imageNo&&!card.artCode) card.artCode=debugCode;
    }
    let suppressClick=false;
    const item=document.createElement('button');
    item.type='button';
    item.className='debug-palette-item'+(pendingId===def.id?' pending':'');
    const panelKind=kind==='character'||kind==='enchant';
    item.draggable=panelKind;
    const no=_debugPanelDisplayNo(debugCode);
    const cardWrap=document.createElement('div');
    cardWrap.className='debug-palette-card';
    let cardEl;
    if(kind==='ring'){
      cardEl=document.createElement('div');
      const ringPath=_rewardRingArtPath(card);
      cardEl.className=`ring-visual${ringPath?' ring-visual-filled':''}`;
      if(ringPath){
        cardEl.style.setProperty('--ring-art',`url("${ringPath}")`);
        const art=document.createElement('img');
        art.className='debug-ring-art';
        art.src=ringPath;
        art.alt=card.name||'指輪';
        cardEl.appendChild(art);
      }
      cardEl.setAttribute('data-preview',[typeof _cardUiName==='function'?_cardUiName(card):card.name,card.desc||''].filter(Boolean).join('\n'));
      const keywordPreview=typeof _auxiliaryKeywordPreviewText==='function'?_auxiliaryKeywordPreviewText(card,card.desc||''):'';
      if(keywordPreview) cardEl.setAttribute('data-keyword-preview',keywordPreview);
    }else if(kind==='item'){
      // デバッグ一覧のアイテムも指輪と同じく、専用画像を原寸比で収める表示にする。
      // 通常のカードDOMへ流すとカード枠とカード比率で拡大されるため、item_slot.svgは使わない。
      cardEl=document.createElement('div');
      const itemPath=typeof _rewardItemArtPath==='function'?_rewardItemArtPath(card):'';
      cardEl.className=`item-visual${itemPath?' item-visual-filled':''}`;
      if(itemPath){
        cardEl.style.setProperty('--item-art',`url("${itemPath}")`);
        const art=document.createElement('img');
        art.className='debug-item-art';
        art.src=itemPath;
        art.alt=card.name||'アイテム';
        cardEl.appendChild(art);
      }
      cardEl.setAttribute('data-preview',[typeof _cardUiName==='function'?_cardUiName(card):card.name,card.desc||''].filter(Boolean).join('\n'));
      const keywordPreview=typeof _auxiliaryKeywordPreviewText==='function'?_auxiliaryKeywordPreviewText(card,card.desc||''):'';
      if(keywordPreview) cardEl.setAttribute('data-keyword-preview',keywordPreview);
    }else{
      cardEl=panelKind&&typeof mkCardEl==='function'
        ?mkCardEl(card,-1,'debug-palette')
        :(typeof _mkRewDiv==='function'?_mkRewDiv(card,null,-1):document.createElement('div'));
    }
    cardEl.draggable=false;
    const preview=cardEl.getAttribute('data-preview');
    if(preview) item.setAttribute('data-preview',preview);
    const keywordPreview=cardEl.getAttribute('data-keyword-preview');
    if(keywordPreview) item.setAttribute('data-keyword-preview',keywordPreview);
    const titleColor=cardEl.getAttribute('data-preview-title-color');
    if(titleColor) item.setAttribute('data-preview-title-color',titleColor);
    const cardRarity=[...cardEl.classList].find(c=>/^rarity-[1-6]$/.test(c));
    if(cardRarity) item.classList.add(cardRarity);
    cardWrap.appendChild(cardEl);
    const label=document.createElement('div');
    const rarityClass=card.rarity>=1&&card.rarity<=5?` rarity-${card.rarity}`:'';
    label.className=`debug-palette-label${rarityClass}`;
    label.innerHTML=`${no?`<span class="debug-palette-no">No.${no}</span>`:''}${_escapePreviewHtml(card.name||def.name||'')}`;
    item.appendChild(cardWrap);
    item.appendChild(label);
    item.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(suppressClick) return;
      _debugTakePanelCard(def.id);
    };
    item.addEventListener('dragstart',e=>{
      if(!panelKind){ e.preventDefault(); return; }
      suppressClick=true;
      if(G._pendingPanelPlacement) G._pendingPanelPlacement=null;
      const dragCard=_debugMakePanelCard(def.id);
      if(!dragCard){ e.preventDefault(); return; }
      _dragSrc={arr:'debugPanel',id:def.id,card:dragCard};
      if(e.dataTransfer){
        e.dataTransfer.effectAllowed='copy';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
      }
      // 他の全ドラッグ元と同じく`.card`要素自体を渡す（ラッパーの`.debug-palette-card`を
      // 渡すと、#debug-card-paletteスコープ限定CSS（アイコン位置補正等）がbody直下の
      // ゴーストには効かなくなり、アイコン位置がずれる）。
      _createDragGhost(cardEl);
      item.classList.add('dragging');
    });
    item.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
    item.addEventListener('dragend',()=>{ item.classList.remove('dragging'); _removeDragGhost(); _dragSrc=null; setTimeout(()=>{ suppressClick=false; },0); });
    list.appendChild(item);
  });
  list.scrollTop=prevScrollTop||0;
  list.addEventListener('scroll',()=>{ G._debugPaletteScrollTop=list.scrollTop; },{passive:true});
}
