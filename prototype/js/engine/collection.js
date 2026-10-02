// collection.js — タイトル画面のコレクション一覧。
// 表示状態は SaveProfile から読むだけで、この画面を開いたことで発見済みにはしない。
const COLLECTION_KIND_CHARACTER='character';
const COLLECTION_GRID_COLS=7;

let _collectionKind=COLLECTION_KIND_CHARACTER;
let _collectionSelected=-1;
let _collectionMerged=false;
let _collectionCloseTimer=0;

function _collectionText(key,fallback){
  const value=typeof textMessage==='function'?textMessage(key,fallback):fallback;
  return String(value||fallback||'').trim();
}
function _collectionTextItem(item){
  if(!item) return '';
  return item[0]?_collectionText(item[0],item[1]):String(item[1]||'').trim();
}

const COLLECTION_TEXTS={
  title:['コレクション','コレクション'],
  character:['「キャラクター」タブ','キャラクター'],
  enchant:['「エンチャント」タブ','エンチャント'],
  enemy:['「エネミー」タブ','エネミー'],
  equipment:['「リング / アイテム」タブ','リング / アイテム'],
  merge:['「マージ」ボタン','マージ'],
  return:['「タイトルに戻る」ボタン','タイトルに戻る'],
  // この3件はシートに行が無い補助ラベル。
  previous:[null,'前のカード'],
  next:[null,'次のカード'],
  unseen:[null,'未発見'],
};

function applyCollectionTexts(){
  document.querySelectorAll('[data-collection-text]').forEach(el=>{
    const item=COLLECTION_TEXTS[el.dataset.collectionText];
    if(item) el.textContent=_collectionTextItem(item);
  });
  const prev=document.getElementById('collection-prev');
  const next=document.getElementById('collection-next');
  if(prev) prev.setAttribute('aria-label',_collectionTextItem(COLLECTION_TEXTS.previous));
  if(next) next.setAttribute('aria-label',_collectionTextItem(COLLECTION_TEXTS.next));
}

function _collectionSheetCode(card,kind,index){
  const raw=String(card&&(card.artCode??card.no??card.No??card['No.']??card.imageNo)||'').trim().toUpperCase();
  if(/^[A-Z]+\d+$/.test(raw)) return raw;
  const prefix={character:'C',enchant:'E',enemy:'EN',item:'I',ring:'R'}[kind]||'';
  const digits=(raw.match(/\d+/)||[])[0]||String(index+1);
  return prefix+String(parseInt(digits,10)||index+1).padStart(3,'0');
}

function _collectionSortValue(card,kind,index){
  const code=_collectionSheetCode(card,kind,index);
  const n=parseInt((code.match(/\d+/)||[])[0],10);
  return Number.isFinite(n)?n:999999;
}

function _collectionDefinitions(kind){
  let list=[];
  if(kind==='equipment'){
    const rings=typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL)?RING_POOL:[];
    const items=typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[];
    const sorted=(values,type)=>values.filter(card=>_collectionDefinitionVisible(card,true))
      .map((card,index)=>({card,index,sort:_collectionSortValue(card,type,index)}))
      .sort((a,b)=>a.sort-b.sort||String(a.card.name||'').localeCompare(String(b.card.name||''),'ja'))
      .map(row=>row.card);
    return [...sorted(rings,'ring'),...sorted(items,'item')];
  }
  if(kind==='enemy') list=typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[];
  else list=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]).filter(card=>{
    const cat=String(card&&card.category||'');
    return kind==='character'?cat==='\u30ad\u30e3\u30e9\u30af\u30bf\u30fc':cat==='\u5f37\u5316'||cat==='\u30a8\u30f3\u30c1\u30e3\u30f3\u30c8';
  });
  return list.filter(card=>_collectionDefinitionVisible(card,kind==='enemy'))
    .map((card,index)=>({card,index,sort:_collectionSortValue(card,kind,index)}))
    .sort((a,b)=>a.sort-b.sort||String(a.card.name||'').localeCompare(String(b.card.name||''),'ja'))
    .map(row=>row.card);
}

function _collectionDefinitionVisible(card,allowWithoutSheetSeen){
  return !!(card&&card.name&&String(card.name)!=='false'&&!card.removed&&card._implemented!==false&&
    card.implemented!==false&&card.rarity!==-1&&(allowWithoutSheetSeen||card._sheetSeen));
}

function _collectionEntryKind(card){
  if(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)&&ENEMY_POOL.includes(card)) return 'enemy';
  if(typeof RING_POOL!=='undefined'&&Array.isArray(RING_POOL)&&RING_POOL.includes(card)) return 'ring';
  if(typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)&&ITEM_POOL.includes(card)) return 'item';
  return _collectionKind;
}

function _collectionState(card){
  if(_collectionEntryKind(card)==='enemy') return {seen:true,acquired:true};
  return typeof SaveProfile!=='undefined'&&typeof SaveProfile.collectionState==='function'
    ?SaveProfile.collectionState(card):{seen:false,acquired:false};
}

function _collectionCopyCard(card){
  const copy={...card};
  ['keywords','adjacentKeywords','directions','manaThresholds','attackEffects'].forEach(key=>{
    if(Array.isArray(card&&card[key])) copy[key]=card[key].map(v=>v&&typeof v==='object'?{...v}:v);
  });
  if(card&&card.mergedForm) copy.mergedForm={...card.mergedForm};
  return copy;
}

function _collectionDisplayCard(card){
  const out=_collectionCopyCard(card);
  if(_collectionEntryKind(card)==='enemy'){
    out._sheetEnemy=true;
    out._useEnemyVisualFrame=!out.bossOnly;
  }
  if(!_collectionMerged||!['character','enchant'].includes(_collectionKind)) return out;
  out._merged=true;
  out._tripleMerged=true;
  const baseName=String(out.name||'').replace(/\+$/,'');
  out._tripleBaseName=baseName;
  out._displayName=`${baseName}+`;
  out.rarity=Math.max(1,Number(out.rarity)||1)+1;
  if(typeof applyMergedPanelForm==='function') applyMergedPanelForm(out);
  if(_collectionKind==='character'){
    out.power=(Number(card.power??card.atk)||0)*2;
    out.life=Math.max(1,(Number(card.life??card.hp)||1)*2);
    if(out.atk!=null) out.atk=out.power;
    if(out.hp!=null) out.hp=out.life;
  }
  return out;
}

function _collectionItemArt(card){
  if(!card) return '';
  if(typeof _rewardItemArtPath==='function') return _rewardItemArtPath(card);
  return String(card.art||card.image||'');
}

function _collectionRingArt(card){
  if(!card) return '';
  if(typeof _rewardRingArtPath==='function') return _rewardRingArtPath(card);
  const raw=String(card.artCode||card.no||card.No||card['No.']||'').trim();
  const n=(raw.match(/\d+/)||[])[0];
  return n?`assets/art/rings/R${String(parseInt(n,10)).padStart(3,'0')}.jpg`:'';
}

function _collectionSetAuxArt(el,card,kind){
  const path=kind==='item'?_collectionItemArt(card):_collectionRingArt(card);
  if(path) el.style.setProperty('--collection-aux-art',`url("${path}")`);
  else el.style.removeProperty('--collection-aux-art');
}

function _collectionCardCell(card,index){
  const state=_collectionState(card);
  const entryKind=_collectionEntryKind(card);
  const selectable=!!(state.seen||state.acquired);
  const button=document.createElement('button');
  button.type='button';
  button.className=`collection-grid-cell collection-${entryKind}`;
  button.dataset.collectionIndex=String(index);
  if(state.acquired) button.classList.add('is-acquired');
  else if(state.seen) button.classList.add('is-seen');
  else button.classList.add('is-unseen');
  button.disabled=!selectable;
  button.setAttribute('aria-label',selectable?String(card.name||''):_collectionTextItem(COLLECTION_TEXTS.unseen));

  // 未発見のリング／アイテムも枠だけは置く（キャラクターの空マスと同じ扱い）。
  // 絵は発見済みのときだけ入れる（--collection-aux-art が無ければ ::after は描かれない）。
  if(entryKind==='item'||entryKind==='ring'){
    const aux=document.createElement('span');
    aux.className='collection-aux-face';
    if(state.seen||state.acquired) _collectionSetAuxArt(aux,card,entryKind);
    button.appendChild(aux);
  }
  if((state.seen||state.acquired)&&entryKind!=='item'&&entryKind!=='ring'){
    const face=document.createElement('span');
    face.className='collection-card-face';
    // マージ中は一覧側も拡大表示と同じ合体枠へ切り替える。
    if(typeof applyCardVisual==='function') applyCardVisual(face,_collectionDisplayCard(card));
    const art=document.createElement('span');
    art.className='collection-card-art';
    const frame=document.createElement('span');
    frame.className='collection-card-frame';
    face.append(art,frame);
    button.appendChild(face);
  }
  if(selectable){
    const select=()=>_collectionSelect(index);
    button.addEventListener('mouseenter',select);
    button.addEventListener('focus',select);
    button.addEventListener('click',select);
  }
  return button;
}

function _collectionRenderMarks(){
  const marks=document.getElementById('collection-grid-marks');
  const grid=document.getElementById('collection-grid');
  if(!marks) return;
  marks.innerHTML='';
  if(!grid) return;
  const cells=[...grid.querySelectorAll('.collection-grid-cell')];
  const rows=[];
  cells.forEach(cell=>{
    const top=Math.round(cell.offsetTop*100)/100;
    let row=rows.find(r=>Math.abs(r.top-top)<.5);
    if(!row){ row={top,cells:[]};rows.push(row); }
    row.cells.push(cell);
  });
  rows.sort((a,b)=>a.top-b.top).forEach(row=>row.cells.sort((a,b)=>a.offsetLeft-b.offsetLeft));
  for(let row=1;row<rows.length;row++){
    const above=rows[row-1],below=rows[row];
    const aboveBottom=above.top+(above.cells[0]?.offsetHeight||0);
    // 装備の区切り線をまたぐ場所には mark.svg を置かない。
    // 行間を広げても通常の行間マークは消さず、実際の区切り線の有無で判定する。
    const crossesEquipmentLine=[...grid.querySelectorAll('.collection-equipment-line')].some(line=>{
      const center=line.offsetTop+line.offsetHeight/2;
      return center>aboveBottom&&center<below.top;
    });
    if(crossesEquipmentLine) continue;
    const cols=Math.min(COLLECTION_GRID_COLS,Math.max(above.cells.length,below.cells.length));
    for(let col=1;col<cols;col++){
      const leftCell=above.cells[col-1]||below.cells[col-1];
      const rightCell=above.cells[col]||below.cells[col];
      if(!leftCell||!rightCell) continue;
      const mark=document.createElement('i');
      mark.style.left=`${(leftCell.offsetLeft+leftCell.offsetWidth+rightCell.offsetLeft)/2-10.5}px`;
      mark.style.top=`${(aboveBottom+below.top)/2-10.5}px`;
      marks.appendChild(mark);
    }
  }
}

function _collectionSelectableIndices(cards){
  const out=[];
  cards.forEach((card,index)=>{
    const state=_collectionState(card);
    if(state.seen||state.acquired) out.push(index);
  });
  return out;
}

function _collectionEnsureSelection(cards){
  if(cards[_collectionSelected]){
    const state=_collectionState(cards[_collectionSelected]);
    if(state.seen||state.acquired) return;
  }
  _collectionSelected=_collectionSelectableIndices(cards)[0]??-1;
}

function _collectionDescriptionHtml(card,entryKind){
  if(!card) return '';
  const desc=typeof _plainEffectTextForPreview==='function'
    ?_plainEffectTextForPreview(card):String(card.desc||card.effectText||card.effect||'').replace(/<[^>]*>/g,'');
  const kind=entryKind||_collectionEntryKind(card);
  let source='';
  if((kind==='character'||kind==='enemy')&&typeof _unitPreviewText==='function'){
    source=_unitPreviewText(card,desc,null);
  }else if(kind==='item'||kind==='ring'){
    // 道具・指輪の本文に含まれる「復活」などは効果の対象を表す語であり、
    // その道具自身のキーワードではないため、キーワード欄を生成しない。
    source=String(desc||'').trim();
  }else{
    // キーワード欄は render.js の _enchantPreviewKeywords() が唯一の実装。
    // 自前で名前を足したり効果文から拾ったりすると、魔導板・報酬画面と違う欄になる
    // （「結界1 / 結界」の二重表示、「衝撃波」に弱体1が付く等）。
    const keywords=typeof _enchantPreviewKeywords==='function'?_enchantPreviewKeywords(card):[];
    const shown=new Set(keywords.map(k=>k.replace(/(?:\d+|X|∞)+$/,'')));
    const visibleDesc=String(desc||'').split('\n').filter(line=>{
      const tokens=String(line||'').trim().split(/[\s　]+/).filter(Boolean);
      return !(tokens.length&&tokens.every(t=>shown.has(t.replace(/(?:\d+|X|∞)+$/,''))));
    }).join('\n').trim();
    source=[keywords.length?`キーワード：${keywords.join(' / ')}`:'',visibleDesc].filter(Boolean).join('\n');
  }
  const cleaned=String(source||'').split('\n').filter(line=>String(line).trim()!==String(card.name||'').trim()).join('\n');
  const html=typeof _formatPreviewHtml==='function'
    ?_formatPreviewHtml(`__COLLECTION__\n${cleaned}`,{plainTitle:true,sortEffects:true}).replace(/^<strong class="preview-title">[\s\S]*?<\/strong>/,'')
    :String(cleaned).replace(/\n/g,'<br>');
  return html.replace(/^<br>/,'');
}

function _collectionEnemyStats(card){
  const grade=Math.max(1,Number(card&&card.grade)||1);
  let floors=_waveEnemyStatFloors(grade,card&&card.bossOnly?['elite','boss']:['battle','elite','boss']);
  const code=_enemyDefCode(card);
  // ステージ5の固定敵は、その個体が出る戦闘だけを表示範囲へ入れる。
  if(code===SCENE5_BOSS_ENEMY_NO) floors=[floorForMapDeep(5,_waveDeepLevelForStory(4,5,'boss',false,true))];
  if([FINAL_BOSS_ENEMY_NO,FINAL_BOSS_LEFT_ENEMY_NO,FINAL_BOSS_RIGHT_ENEMY_NO].includes(code)){
    floors=[floorForMapDeep(5,_waveDeepLevelForStory(5,5,'boss',false,true))];
  }
  // 通常抽選に出ない追撃戦の対象と闘技場の覇者も、専用の生成経路と同じ深層を使う。
  const configs=typeof QUEST_CONFIG!=='undefined'?Object.values(QUEST_CONFIG):[];
  if(configs.some(config=>config.pursuit&&String(config.pursuit.targetEnemyNo||'').toUpperCase()===code)) floors=[questGarmStatFloor()];
  if(card&&card.name===ARENA_CHAMPION_ENEMY_NAME) floors=[_arenaRoundStatFloor(6)];
  const ranges=floors.map(floor=>enemyStatRanges(card||{},floor));
  ranges.push(...arenaEnemyStatRanges(card));
  return {
    atkMin:Math.min(...ranges.map(range=>range.atkMin)),atkMax:Math.max(...ranges.map(range=>range.atkMax)),
    hpMin:Math.min(...ranges.map(range=>range.hpMin)),hpMax:Math.max(...ranges.map(range=>range.hpMax)),
  };
}

function _collectionRenderDetail(){
  const cards=_collectionDefinitions(_collectionKind);
  _collectionEnsureSelection(cards);
  const original=cards[_collectionSelected]||null;
  const card=original?_collectionDisplayCard(original):null;
  const entryKind=original?_collectionEntryKind(original):_collectionKind;
  const preview=document.getElementById('collection-preview-card');
  const orb=document.getElementById('collection-color-orb');
  const name=document.getElementById('collection-card-name');
  const stats=document.getElementById('collection-card-stats');
  const desc=document.getElementById('collection-card-desc');
  const prev=document.getElementById('collection-prev');
  const next=document.getElementById('collection-next');
  const merge=document.getElementById('collection-merge');
  if(!preview||!orb||!name||!stats||!desc||!prev||!next||!merge) return;

  preview.className='collection-preview-card';
  preview.innerHTML='';
  preview.removeAttribute('style');
  orb.hidden=true;
  name.textContent='';stats.textContent='';desc.innerHTML='';
  const selectable=_collectionSelectableIndices(cards);
  prev.disabled=next.disabled=selectable.length<2;
  merge.disabled=!card||!['character','enchant'].includes(_collectionKind);
  merge.classList.toggle('is-active',!!(_collectionMerged&&!merge.disabled));
  if(!card) return;

  const state=_collectionState(original);
  if(state.seen&&!state.acquired) preview.classList.add('is-unowned');
  if(entryKind==='item'||entryKind==='ring'){
    preview.classList.add('collection-preview-aux',`collection-preview-${entryKind}`);
    _collectionSetAuxArt(preview,card,entryKind);
  }else{
    preview.classList.add('collection-preview-panel');
    if(typeof applyCardVisual==='function') applyCardVisual(preview,card);
    const art=document.createElement('span');
    art.className='collection-preview-art';
    const frame=document.createElement('span');
    frame.className='collection-preview-frame';
    preview.append(art,frame);
    const colorPath=typeof _colorIconPath==='function'?_colorIconPath(card.color):'';
    if(colorPath){ orb.src=colorPath;orb.hidden=false; }
  }
  name.textContent=typeof _cardUiName==='function'?_cardUiName(card):String(card.name||'');
  if(entryKind==='character') stats.textContent=`ATK${Number(card.power??card.atk??0)} / HP${Number(card.life??card.hp??0)}`;
  else if(entryKind==='enemy'){
    const range=_collectionEnemyStats(card);
    stats.textContent=`ATK ${range.atkMin} 〜 ${range.atkMax} / HP ${range.hpMin} 〜 ${range.hpMax}`;
  }
  desc.innerHTML=_collectionDescriptionHtml(card,entryKind);
}

function _collectionSelect(index){
  const cards=_collectionDefinitions(_collectionKind);
  if(!cards[index]) return;
  const state=_collectionState(cards[index]);
  if(!state.seen&&!state.acquired) return;
  _collectionSelected=index;
  document.querySelectorAll('.collection-grid-cell.is-selected').forEach(el=>el.classList.remove('is-selected'));
  document.querySelector(`.collection-grid-cell[data-collection-index="${index}"]`)?.classList.add('is-selected');
  _collectionRenderDetail();
}

function _collectionSyncThumb(){
  const viewport=document.getElementById('collection-grid-viewport');
  const thumb=document.getElementById('collection-scroll-thumb');
  if(!viewport||!thumb) return;
  const max=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
  thumb.style.top=`${max?viewport.scrollTop/max*100:0}%`;
  thumb.classList.toggle('is-disabled',max<=0);
  viewport.classList.toggle('is-at-bottom',max<=0||viewport.scrollTop>=max-.5);
}

function _collectionRender(){
  const cards=_collectionDefinitions(_collectionKind);
  _collectionEnsureSelection(cards);
  const grid=document.getElementById('collection-grid');
  const viewport=document.getElementById('collection-grid-viewport');
  if(!grid||!viewport) return;
  grid.innerHTML='';
  grid.classList.toggle('is-equipment',_collectionKind==='equipment');
  let insertedEquipmentLine=false;
  cards.forEach((card,index)=>{
    if(_collectionKind==='equipment'&&!insertedEquipmentLine&&_collectionEntryKind(card)==='item'){
      const line=document.createElement('img');
      line.className='collection-equipment-line';
      line.src='assets/ui/collection_line.svg?v=band0924';
      line.alt='';
      grid.appendChild(line);
      insertedEquipmentLine=true;
    }
    grid.appendChild(_collectionCardCell(card,index));
  });
  _collectionRenderMarks();
  document.querySelectorAll('.collection-tab[data-collection-kind]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.collectionKind===_collectionKind));
  viewport.scrollTop=0;
  _collectionRenderDetail();
  if(_collectionSelected>=0) grid.querySelector(`[data-collection-index="${_collectionSelected}"]`)?.classList.add('is-selected');
  requestAnimationFrame(_collectionSyncThumb);
}

function _collectionSetKind(kind){
  if(!['character','enchant','enemy','equipment'].includes(kind)) return;
  _collectionKind=kind;
  _collectionSelected=-1;
  _collectionRender();
}

function _collectionStep(direction){
  const cards=_collectionDefinitions(_collectionKind);
  const selectable=_collectionSelectableIndices(cards);
  if(!selectable.length) return;
  let pos=selectable.indexOf(_collectionSelected);
  if(pos<0) pos=0;
  pos=(pos+(direction<0?-1:1)+selectable.length)%selectable.length;
  if(typeof playSfx==='function') playSfx('select',{group:'ui',guardKey:'ui:collection-step',guardMs:0});
  _collectionSelect(selectable[pos]);
  document.querySelector(`.collection-grid-cell[data-collection-index="${_collectionSelected}"]`)?.scrollIntoView({block:'nearest'});
  _collectionSyncThumb();
}

function _collectionToggleMerged(){
  if(!['character','enchant'].includes(_collectionKind)||_collectionSelected<0) return;
  _collectionMerged=!_collectionMerged;
  // 拡大画像だけでなく、左の一覧カードも同じマージ枠へ更新する。
  const cards=_collectionDefinitions(_collectionKind);
  document.querySelectorAll('.collection-grid-cell[data-collection-index]').forEach(cell=>{
    const index=Number(cell.dataset.collectionIndex);
    const face=cell.querySelector('.collection-card-face');
    if(face&&cards[index]&&typeof applyCardVisual==='function') applyCardVisual(face,_collectionDisplayCard(cards[index]));
  });
  _collectionRenderDetail();
}

function openCollection(){
  const title=document.getElementById('scr-title');
  const layer=document.getElementById('collection-layer');
  if(!title||!layer||!title.classList.contains('active')) return;
  if(_collectionCloseTimer){ clearTimeout(_collectionCloseTimer);_collectionCloseTimer=0; }
  title.classList.add('collection-transition');
  document.body.classList.add('collection-open');
  layer.setAttribute('aria-hidden','false');
  _collectionKind=COLLECTION_KIND_CHARACTER;
  _collectionSelected=-1;
  _collectionMerged=false;
  applyCollectionTexts();
  _collectionRender();
  requestAnimationFrame(()=>requestAnimationFrame(()=>title.classList.add('collection-open')));
}

function closeCollection(){
  const title=document.getElementById('scr-title');
  const layer=document.getElementById('collection-layer');
  title?.classList.remove('collection-open');
  document.body.classList.remove('collection-open');
  if(_collectionCloseTimer) clearTimeout(_collectionCloseTimer);
  _collectionCloseTimer=setTimeout(()=>{
    layer?.setAttribute('aria-hidden','true');
    title?.classList.remove('collection-transition');
    _collectionCloseTimer=0;
  },460);
}

function _collectionWireScroll(){
  const viewport=document.getElementById('collection-grid-viewport');
  const hit=document.getElementById('collection-scroll-hit');
  const thumb=document.getElementById('collection-scroll-thumb');
  if(!viewport||!hit||!thumb) return;
  viewport.addEventListener('scroll',_collectionSyncThumb,{passive:true});
  let grab=0;
  const update=e=>{
    const rect=hit.getBoundingClientRect();
    const max=Math.max(0,viewport.scrollHeight-viewport.clientHeight);
    if(!(rect.height>0&&max>0)) return;
    const ratio=Math.max(0,Math.min(1,(e.clientY-grab-rect.top)/rect.height));
    const next=ratio*max;
    if(Math.abs(next-viewport.scrollTop)>.5) viewport.scrollTop=next;
  };
  const begin=e=>{
    const handle=e.currentTarget;
    e.preventDefault();e.stopPropagation();
    const t=thumb.getBoundingClientRect();
    const center=t.top+t.height/2;
    grab=Math.abs(e.clientY-center)<=t.height/2?e.clientY-center:0;
    handle.setPointerCapture?.(e.pointerId);update(e);
  };
  const move=e=>{ const handle=e.currentTarget;if(handle.hasPointerCapture?.(e.pointerId)) update(e); };
  // スクロールつまみでは SE を鳴らさない（つまみの SE はオプションのスライダーだけ）。
  const end=e=>{
    const handle=e.currentTarget;
    if(handle.hasPointerCapture?.(e.pointerId)) handle.releasePointerCapture(e.pointerId);
  };
  [hit,thumb].forEach(handle=>{
    handle.addEventListener('pointerdown',begin);
    handle.addEventListener('pointermove',move);
    handle.addEventListener('pointerup',end);
    handle.addEventListener('pointercancel',end);
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  applyCollectionTexts();
  document.querySelector('#title-menu .title-menu-item.collection')?.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();openCollection();
  });
  document.querySelectorAll('.collection-tab[data-collection-kind]').forEach(button=>{
    button.addEventListener('click',()=>_collectionSetKind(button.dataset.collectionKind));
  });
  document.getElementById('collection-merge')?.addEventListener('click',_collectionToggleMerged);
  document.getElementById('collection-prev')?.addEventListener('click',()=>_collectionStep(-1));
  document.getElementById('collection-next')?.addEventListener('click',()=>_collectionStep(1));
  document.getElementById('collection-return')?.addEventListener('click',closeCollection);
  _collectionWireScroll();
});
