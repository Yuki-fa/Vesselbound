// quest.js — 酒場クエスト（Q009 護衛依頼）と、クエスト用の立ち絵／会話表示。
// 依存: loader.js, formation.js, pool.js, reward.js, map.js, main.js
//
// 会話の本文・話者・クエスト説明は window.QUEST_DATA（クエストシート）から読む。
// ここに個別の台詞や説明文を書かないこと。

const Q009_ID='Q009';
const Q009_TAVERN_VARIANT='_1';
const Q009_TOWER_VARIANT='_2';

// ── 調整用レイアウト定数 ──────────────────────────────
// 立ち絵は設計座標へ原寸配置する。画面外へはみ出した分は #scr-* の overflow で切る。
const TAVERN_PORTRAIT_CONFIG={
  MC001:{src:'assets/art/NPC/MC001.webp',x:-207,y:252,width:1990,height:3410},
  MC004:{src:'assets/art/NPC/MC004.webp',x:1819,y:192,width:3155,height:4291},
};
const TAVERN_PORTRAIT_FADE_MS=480;
const TAVERN_PORTRAIT_STEP_MS=500;
// face を渡した時だけ、MC001の左上からの相対座標へ表情差分を重ねる。
const TAVERN_FACE_CONFIG={x:827,y:349,width:310,height:233};
// 'tail' は下記座標を吹き出しの尻尾の先端として解釈する。
// 'box' に変えると同じ座標を吹き出し枠の左上として解釈できる。
const TAVERN_DIALOGUE_POSITION_MODE='tail';
const TAVERN_DIALOGUE_ANCHORS={
  // 尻尾の先端の位置（設計座標）。2026-09-24 利用者指定（枠の基準で言うと左X1055,Y550／右X2868,Y822）。
  left:{x:1075,y:695,tail:'bottom'},
  right:{x:3082,y:843,tail:'top'},
};
const TAVERN_GOLD_GAIN_POSITION={x:300,y:1800};
// 最後の台詞をクリックしてから酒場を出る（村へ戻る）までの間。台詞枠は先に消え、立ち絵を少し残す。
const TAVERN_LEAVE_DELAY_MS=900;

// 既存の戦闘台詞枠と同じ寸法・角度の定数。専用のDOMなので戦闘中の枠状態を壊さない。
const TAVERN_LINE_FRAME_INSET_Y=2.62;
const TAVERN_LINE_FRAME_INSET_X=2.89;
const TAVERN_LINE_FRAME_SLOPE=54.81/94.94;
const TAVERN_LINE_FRAME_STROKE=5;
const TAVERN_LINE_FRAME_FILL='#e2cdba';
const TAVERN_LINE_FRAME_STROKE_COLOR='#8c5c2d';
const TAVERN_LINE_TAIL_W=180;
const TAVERN_LINE_TAIL_H=129;
const TAVERN_LINE_TAIL_BASE_X=0.5776;
const TAVERN_LINE_TAIL_BASE_INSET=TAVERN_LINE_TAIL_H*(25.16/170);
const TAVERN_LINE_FRAME_EDGE=2.62;
const TAVERN_LINE_BUBBLE_MARGIN=24;
const TAVERN_LINE_FONT=60;
const TAVERN_LINE_LINE_H=1.45;
const TAVERN_LINE_PAD_X=96;
const TAVERN_LINE_PAD_Y=44;
const TAVERN_LINE_MIN_W=520;
// 台詞枠の端（六角形の尖った先）から尻尾の先端までの横の距離。見本画像から測った値。
// 左のキャラの枠は尻尾が左寄りから左下へ、右のキャラの枠は右寄りから右上へ伸びる。
const TAVERN_LINE_TIP_FROM_END=84;

if(typeof window!=='undefined'){
  window.Q009_ID=Q009_ID;
  window.TAVERN_PORTRAIT_CONFIG=TAVERN_PORTRAIT_CONFIG;
  window.TAVERN_FACE_CONFIG=TAVERN_FACE_CONFIG;
  window.TAVERN_DIALOGUE_POSITION_MODE=TAVERN_DIALOGUE_POSITION_MODE;
  window.TAVERN_DIALOGUE_ANCHORS=TAVERN_DIALOGUE_ANCHORS;
}

let _qDialogueSession=0;
let _qTowerSession=false;

function _qText(key,fallback){
  return typeof textMessage==='function'?textMessage(key,fallback):String(fallback||'');
}

function _qWait(ms){
  return new Promise(resolve=>window.setTimeout(resolve,Math.max(0,Number(ms)||0)));
}

function _qEnsureStyle(){
  if(document.getElementById('tavern-quest-style')) return;
  const style=document.createElement('style');
  style.id='tavern-quest-style';
  style.textContent=`
#tavern-presentation-layer{
  position:absolute!important;inset:0!important;overflow:hidden!important;
  z-index:120!important;pointer-events:none!important;
}
.tavern-portrait{
  position:absolute!important;display:block!important;margin:0!important;padding:0!important;
  max-width:none!important;max-height:none!important;object-fit:fill!important;
  opacity:0;transition:opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease!important;pointer-events:none!important;
}
.tavern-portrait.is-visible{opacity:1!important}
.tavern-face{
  position:absolute!important;display:block!important;margin:0!important;padding:0!important;
  width:310px!important;height:233px!important;max-width:none!important;max-height:none!important;
  object-fit:fill!important;opacity:0;transition:opacity .48s ease!important;pointer-events:none!important;
}
.tavern-face.is-visible{opacity:1!important}
#tavern-dialogue-layer{
  position:absolute!important;inset:0!important;z-index:5000!important;
  pointer-events:auto!important;cursor:var(--cursor-normal)!important;
}
/* 影は枠と尻尾に別々に掛けず、両方を含む層へ1つだけ掛ける。別々だと尻尾の影が枠へ落ちて
   つなぎ目が切れて見えた（speechbubble2.svg に影が付いて見える。2026-09-24 利用者指摘）。 */
#tavern-dialogue-stage{position:absolute!important;inset:0!important;pointer-events:none!important;
  filter:drop-shadow(0 8px 18px rgba(0,0,0,.55))!important}
.tavern-dialogue-bubble{
  position:absolute!important;box-sizing:border-box!important;display:flex!important;
  align-items:center!important;justify-content:center!important;padding:0!important;
  background:none!important;border:0!important;filter:none!important;
  pointer-events:none!important;z-index:1!important;
}
.tavern-dialogue-bubble svg{
  position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
  overflow:visible!important;pointer-events:none!important;
}
.tavern-dialogue-text{
  position:relative!important;z-index:1!important;white-space:pre!important;
  text-align:left!important;color:#332315!important;font-family:"Shippori Mincho",serif!important;
  font-size:60px!important;font-weight:700!important;line-height:1.45!important;
  letter-spacing:.04em!important;font-feature-settings:"palt" 1!important;
  text-shadow:0 1px 0 rgba(255,245,225,.5)!important;
}
.tavern-dialogue-tail{
  position:absolute!important;width:180px!important;height:129px!important;
  background-color:transparent!important;background-position:center!important;background-size:100% 100%!important;
  background-repeat:no-repeat!important;transform-origin:center center!important;
  filter:none!important;z-index:2!important;pointer-events:none!important;
}
.tavern-formation-veil{
  position:absolute!important;inset:0!important;z-index:1!important;pointer-events:none!important;
  background:url("assets/art/backgrounds/black1.svg") center/100% 100% no-repeat!important;
}
.tavern-gold-gain{
  position:absolute!important;z-index:4200!important;pointer-events:none!important;
  color:#f7d67d!important;font-family:"Shippori Mincho",serif!important;font-size:70px!important;
  font-weight:700!important;letter-spacing:.04em!important;text-shadow:0 3px 8px rgba(0,0,0,.95),0 0 18px rgba(255,194,57,.8)!important;
  animation:tavern-gold-gain-float 1.35s ease-out forwards!important;
}
@keyframes tavern-gold-gain-float{
  0%{opacity:0;transform:translate(-50%,20px) scale(.9)}
  16%{opacity:1;transform:translate(-50%,0) scale(1)}
  100%{opacity:0;transform:translate(-50%,-150px) scale(1.04)}
}
/* 編成窓の間、立ち絵は背景のすぐ上（暗幕 ::before z0 と編成の枠より奥）に置く。 */
html body.reward-screen-active.tavern-screen-active #scr-battle > #tavern-presentation-layer{
  z-index:-1!important;
}
html body.tavern-screen-active #reward-offer-section::before{
  content:var(--title-reward)!important;
}
html body.tavern-village-active #village-facilities,
html body.tavern-tower-event-active #village-facilities,
html body.tavern-tower-event-active #village-move-btns{display:none!important}
/* 酒場では「店を出る」ボタンを置かない（会話の終わりに自動で村へ戻る。2026-09-24 利用者指定）。 */
/* 街画面のボタン用の指定（html body.village-screen-active #village-move-btns .rew-move-btn）より強くする。 */
html body.tavern-village-active.village-screen-active #village-move-btns #village-depart-btn{display:none!important}
/* クエスト説明文はシートの改行をそのまま改行にする。 */
html body .reward-prod-quest-body p.reward-prod-quest-main{white-space:pre-line!important}
/* 立ち絵（#tavern-presentation-layer z120）より、左上の場所表示を手前に出す。
   所持金・ライフは会話のクリック層（#tavern-dialogue-layer z5000）より手前にして、
   会話中もホバー説明を出せるようにする（ここを押しても台詞は送らない）。 */
html body:is(.tavern-village-active,.tavern-tower-event-active) #village-name-plate{z-index:130!important}
html body:is(.tavern-village-active,.tavern-tower-event-active) #village-status{z-index:5100!important}
`;
  document.head.appendChild(style);
}

function _qQuestState(){
  if(typeof G==='undefined'||!G) return null;
  if(!G.questProgress||typeof G.questProgress!=='object'||Array.isArray(G.questProgress)) G.questProgress={};
  return G.questProgress;
}

function _qRaw(){
  const all=_qQuestState();
  return all?all[Q009_ID]||null:null;
}

function _qRegionIds(){
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(G&&G._wave):null;
  const raw=String(info&&info.quest||'').trim();
  return raw.split(/[、,\s]+/).map(v=>v.trim()).filter(Boolean);
}

function _qQuestData(id){
  const data=(typeof window!=='undefined'&&window.QUEST_DATA)||{};
  return data[id]||null;
}

function _qVariant(base,suffix){
  const id=`${String(base||Q009_ID)}${suffix}`;
  return _qQuestData(id)?id:String(base||Q009_ID);
}

function _qEnsureSelected(){
  const all=_qQuestState();
  if(!all) return null;
  if(all[Q009_ID]) return all[Q009_ID];
  if(Number(G&&G._wave)!==3) return null;
  const candidates=_qRegionIds().filter(id=>_qQuestData(_qVariant(id,Q009_TAVERN_VARIANT))||_qQuestData(id));
  if(!candidates.length) return null;
  const selected=runWithKeyedRandom(`quest:${Number(G._wave)||0}:tavern`,()=>candidates[Math.floor(rand()*candidates.length)]);
  const tavernVariant=_qVariant(selected,Q009_TAVERN_VARIANT);
  const towerVariant=_qVariant(selected,Q009_TOWER_VARIANT);
  const data=_qQuestData(tavernVariant)||_qQuestData(selected)||{};
  all[Q009_ID]={
    questId:selected,
    tavernVariant,
    towerVariant,
    status:'offered',
    rewardCardTaken:false,
    towerEventStarted:false,
    towerRewardGiven:false,
    towerEventDone:false,
    description:String(data.description||''),
  };
  return all[Q009_ID];
}

function _qEntry(){
  const current=_qRaw();
  return current||_qEnsureSelected();
}

function _qIsActive(entry){
  return !!entry&&['offered','rejected','accepted'].includes(String(entry.status));
}

function _qHasDinaOnBoard(){
  if(typeof G==='undefined'||!G) return false;
  const cards=Array.isArray(G.mainBoard)?G.mainBoard:[];
  return cards.some(card=>card&&(
    card._npcCard||String(card.no||card.No||card['No.']||card.artCode||'').toUpperCase()==='NPC001'
  ));
}

function _qDinaCard(){
  if(typeof makePanel!=='function') return null;
  const panel=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(card=>card&&card._npcCard&&String(card.no||card.artCode||'').toUpperCase()==='NPC001')
    :null;
  const card=makePanel(panel?panel.id:'panel_npc_NPC001');
  if(!card) return null;
  card._npcCard=true;
  card._npcDeployOnly=true;
  card.boss=true;
  card.directionCount=0;
  card.directions=[];
  card._buyPrice=0;
  card.cost=0;
  card.noRewardUse=true;
  return card;
}

function _qDescription(entry){
  if(!entry||!_qIsActive(entry)) return '';
  const data=_qQuestData(entry.tavernVariant)||_qQuestData(entry.questId);
  return String(entry.description||data&&data.description||'').trim();
}

function _qSyncQuestBody(){
  const panel=document.querySelector('.reward-prod-quest');
  if(!panel) return;
  const title=panel.querySelector('h2');
  if(title) title.textContent=_qText('「クエスト枠」見出し','');
  const body=panel.querySelector('.reward-prod-quest-body');
  if(!body) return;
  const entry=_qRaw();
  const desc=_qDescription(entry);
  body.innerHTML='';
  if(desc){
    const p=document.createElement('p');
    p.className='reward-prod-quest-main';
    p.textContent=desc;
    body.appendChild(p);
  }
}

function syncQuestFormationUi(){
  _qEnsureStyle();
  _qSyncQuestBody();
  const body=document.body;
  if(!body) return;
  const entry=_qRaw();
  const title=_qText('「酒場の報酬枠」見出し','');
  if(G&&G.phase==='reward'&&G._isTavern){
    body.classList.add('tavern-screen-active');
    body.style.setProperty('--title-reward',JSON.stringify(title));
  }else{
    body.classList.remove('tavern-screen-active');
    body.style.removeProperty('--title-reward');
  }
  const panel=document.querySelector('.reward-prod-quest');
  if(panel) panel.classList.toggle('q009-active',!!_qDescription(entry));
}

function checkQ009CompanionPresence(options){
  const entry=_qRaw();
  if(!entry||entry.status!=='accepted'||entry.towerEventDone) return false;
  if(_qHasDinaOnBoard()){
    entry.rewardCardTaken=true;
    return false;
  }
  const opts=options||{};
  // 酒場の依頼枠に残る間は、受託ボタンを押す前の一時カード移動として扱う。
  // 酒場を出る時は置き去りなので、必ず失敗へ確定する。
  const rewardHasDina=typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)
    &&_rewCards.some(card=>card&&card._npcCard);
  if(G&&G._isTavern&&!opts.leaving&&rewardHasDina&&entry.status!=='accepted') return false;
  entry.status='failed';
  entry.rewardCardTaken=false;
  entry.description='';
  syncQuestFormationUi();
  return true;
}

function onTavernQuestRewardCardTaken(card){
  const entry=_qRaw();
  if(!entry||!G||!G._isTavern||!card||!card._npcCard) return;
  entry.rewardCardTaken=_qHasDinaOnBoard();
  syncQuestFormationUi();
  if(typeof syncTavernFormationControls==='function') syncTavernFormationControls();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
}

function _qPresentationScreen(kind){
  return document.getElementById(kind==='battle'?'scr-battle':'scr-village');
}

function _qMovePresentationHost(kind){
  _qEnsureStyle();
  const target=_qPresentationScreen(kind);
  if(!target) return null;
  let host=document.getElementById('tavern-presentation-layer');
  if(!host){
    host=document.createElement('div');
    host.id='tavern-presentation-layer';
  }
  target.appendChild(host);
  return host;
}

// <img> の src にはファイルの場所をそのまま渡す。assetUrl() は CSS 用の `url("…")` を返すので
// 使うと読み込みに失敗し、立ち絵が出なかった。
function _qPortraitSrc(path){
  return String(path||'');
}

async function showTavernPortrait(id,options){
  const cfg=TAVERN_PORTRAIT_CONFIG[id];
  if(!cfg) return null;
  const opts=options||{};
  const host=_qMovePresentationHost(opts.screen||'village');
  if(!host) return null;
  host.classList.remove('is-leaving');
  let img=host.querySelector(`.tavern-portrait[data-portrait-id="${id}"]`);
  const first=!img;
  if(!img){
    img=document.createElement('img');
    img.className='tavern-portrait';
    img.dataset.portraitId=id;
    img.alt='';
    img.style.left=`${cfg.x}px`;
    img.style.top=`${cfg.y}px`;
    img.style.width=`${cfg.width}px`;
    img.style.height=`${cfg.height}px`;
    img.src=_qPortraitSrc(cfg.src);
    host.appendChild(img);
  }
  if(opts.face&&id==='MC001'){
    const faceName=String(opts.face).match(/^F00[1-3]$/)?.[0];
    if(faceName&&!host.querySelector(`.tavern-face[data-face-id="${faceName}"]`)){
      const face=document.createElement('img');
      face.className='tavern-face';
      face.dataset.faceId=faceName;
      face.alt='';
      face.src=_qPortraitSrc(`assets/art/NPC/${faceName}.webp`);
      face.style.left=`${cfg.x+TAVERN_FACE_CONFIG.x}px`;
      face.style.top=`${cfg.y+TAVERN_FACE_CONFIG.y}px`;
      host.appendChild(face);
      requestAnimationFrame(()=>face.classList.add('is-visible'));
    }
  }
  if(first){
    requestAnimationFrame(()=>img.classList.add('is-visible'));
      await _qWait(TAVERN_PORTRAIT_STEP_MS);
  }else if(!img.classList.contains('is-visible')){
    requestAnimationFrame(()=>img.classList.add('is-visible'));
    await _qWait(TAVERN_PORTRAIT_STEP_MS);
  }
  return img;
}

function _qClearPresentation(){
  const host=document.getElementById('tavern-presentation-layer');
  if(host) host.remove();
}

function _qRemoveDialogue(){
  _qDialogueSession++;
  const layer=document.getElementById('tavern-dialogue-layer');
  if(layer) layer.remove();
  document.body.classList.remove('tavern-dialogue-active');
}

function _qFrameCap(h){
  return TAVERN_LINE_FRAME_INSET_X+Math.max(0,h/2-TAVERN_LINE_FRAME_INSET_Y)*TAVERN_LINE_FRAME_SLOPE;
}

function _qDrawFrame(bubble,w,h){
  const svg=bubble.querySelector('svg');
  const poly=bubble.querySelector('polygon');
  if(!svg||!poly) return;
  const cap=_qFrameCap(h), mid=h/2;
  const round=n=>Math.round(n*100)/100;
  const points=[
    [w-cap,TAVERN_LINE_FRAME_INSET_Y],[cap,TAVERN_LINE_FRAME_INSET_Y],
    [TAVERN_LINE_FRAME_INSET_X,mid],[cap,h-TAVERN_LINE_FRAME_INSET_Y],
    [w-cap,h-TAVERN_LINE_FRAME_INSET_Y],[w-TAVERN_LINE_FRAME_INSET_X,mid],
  ].map(([x,y])=>`${round(x)},${round(y)}`).join(' ');
  svg.setAttribute('viewBox',`0 0 ${round(w)} ${round(h)}`);
  svg.setAttribute('width',String(round(w)));
  svg.setAttribute('height',String(round(h)));
  poly.setAttribute('points',points);
  poly.setAttribute('fill',TAVERN_LINE_FRAME_FILL);
  poly.setAttribute('stroke',TAVERN_LINE_FRAME_STROKE_COLOR);
  poly.setAttribute('stroke-width',String(TAVERN_LINE_FRAME_STROKE));
  poly.setAttribute('stroke-miterlimit','10');
}

function _qMeasureText(textEl,rows){
  const ctx=(_qMeasureText._ctx||(_qMeasureText._ctx=document.createElement('canvas').getContext('2d')));
  const cs=getComputedStyle(textEl);
  ctx.font=`${cs.fontWeight} ${TAVERN_LINE_FONT}px ${cs.fontFamily}`;
  const letter=parseFloat(cs.letterSpacing)||0;
  return Math.max(...rows.map(row=>ctx.measureText(row).width+letter*row.length));
}

function _qRenderBubble(bubble,side,line){
  const textEl=bubble.querySelector('.tavern-dialogue-text');
  const tail=bubble.parentElement.querySelector(`.tavern-dialogue-tail[data-tail-side="${side}"]`);
  if(!textEl||!tail) return;
  const raw=String(line&&line.text||'');
  textEl.textContent=raw;
  const rows=raw.split('\n');
  const h=TAVERN_LINE_PAD_Y*2+rows.length*Math.round(TAVERN_LINE_FONT*TAVERN_LINE_LINE_H);
  const cap=_qFrameCap(h);
  const w=Math.max(TAVERN_LINE_MIN_W,Math.ceil(_qMeasureText(textEl,rows))+TAVERN_LINE_PAD_X*2+Math.ceil(cap*2));
  bubble.style.width=`${w}px`;
  bubble.style.height=`${h}px`;
  const isRight=side==='right';
  const anchor=TAVERN_DIALOGUE_ANCHORS[isRight?'right':'left'];
  // speechbubble2.svg は元の向きで「左下を指す」（先端＝素材の左下）。
  //   左のキャラ：元の向きのまま。尻尾は枠の左寄りの下辺から左下へ。
  //   右のキャラ：180度回して右上を指す。尻尾は枠の右寄りの上辺から右上へ。
  const tailLeft=isRight?anchor.x-TAVERN_LINE_TAIL_W:anchor.x;
  const tailTop=isRight?anchor.y:anchor.y-TAVERN_LINE_TAIL_H;
  tail.style.left=`${tailLeft}px`;
  tail.style.top=`${tailTop}px`;
  tail.style.width=`${TAVERN_LINE_TAIL_W}px`;
  tail.style.height=`${TAVERN_LINE_TAIL_H}px`;
  tail.style.backgroundImage='url("assets/ui/speechbubble2.svg")';
  tail.style.transform=isRight?'scale(-1,-1)':'none';
  let left,top;
  if(TAVERN_DIALOGUE_POSITION_MODE==='box'){
    left=anchor.x; top=anchor.y;
  }else if(isRight){
    left=anchor.x+TAVERN_LINE_TIP_FROM_END-w;
    const tailLineY=tailTop+TAVERN_LINE_TAIL_H-TAVERN_LINE_TAIL_BASE_INSET;
    top=tailLineY-TAVERN_LINE_FRAME_EDGE;
  }else{
    left=anchor.x-TAVERN_LINE_TIP_FROM_END;
    const tailLineY=tailTop+TAVERN_LINE_TAIL_BASE_INSET;
    top=tailLineY+TAVERN_LINE_FRAME_EDGE-h;
  }
  bubble.style.left=`${Math.max(20,Math.min(left,3840-20-w))}px`;
  bubble.style.top=`${Math.max(20,Math.min(top,2160-20-h))}px`;
  _qDrawFrame(bubble,w,h);
}

function _qStartDialogue(lines,options){
  const list=(Array.isArray(lines)?lines:[]).filter(line=>line&&String(line.text||'').trim());
  const opts=options||{};
  _qRemoveDialogue();
  if(!list.length){ if(typeof opts.onDone==='function') opts.onDone(); return Promise.resolve(); }
  const session=++_qDialogueSession;
  const screen=document.getElementById(opts.screen==='battle'?'scr-battle':'scr-village');
  if(!screen) return Promise.resolve();
  _qEnsureStyle();
  const layer=document.createElement('div');
  layer.id='tavern-dialogue-layer';
  const stage=document.createElement('div');
  stage.id='tavern-dialogue-stage';
  layer.appendChild(stage);
  screen.appendChild(layer);
  document.body.classList.add('tavern-dialogue-active');
  let index=0;
  const render=()=>{
    const line=list[index];
    const side=line.speaker==='A'?'left':'right';
    let bubble=stage.querySelector(`.tavern-dialogue-bubble[data-side="${side}"]`);
    if(!bubble){
      bubble=document.createElement('div');
      bubble.className='tavern-dialogue-bubble';
      bubble.dataset.side=side;
      bubble.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><polygon></polygon></svg><div class="tavern-dialogue-text"></div>';
      stage.appendChild(bubble);
      const tail=document.createElement('div');
      tail.className='tavern-dialogue-tail';
      tail.dataset.tailSide=side;
      stage.appendChild(tail);
    }
    _qRenderBubble(bubble,side,line);
    if(typeof opts.onLine==='function') opts.onLine(index,line);
  };
  render();
  return new Promise(resolve=>{
    layer.addEventListener('click',event=>{
      if(session!==_qDialogueSession) return;
      event.preventDefault();
      event.stopPropagation();
      if(index<list.length-1){ index++; render(); return; }
      _qRemoveDialogue();
      if(typeof opts.onDone==='function') opts.onDone();
      resolve();
    });
  });
}

async function _qShowPortraitPair(screen){
  _qClearPresentation();
  _qMovePresentationHost(screen);
  await showTavernPortrait('MC001',{screen});
  await showTavernPortrait('MC004',{screen});
}

function _qCustomizeTavernVillage(){
  _qEnsureStyle();
  document.body.classList.add('tavern-village-active');
  document.body.classList.remove('reward-screen-active','tavern-screen-active','tavern-tower-event-active');
  const facilities=document.getElementById('village-facilities');
  if(facilities) facilities.style.display='none';
  const plate=document.getElementById('village-name-plate');
  if(plate) plate.style.display='inline-flex';
  const sub=document.getElementById('village-name-sub');
  const main=document.getElementById('village-name-main');
  if(sub) sub.textContent='';
  if(main) main.textContent=_qText('街「酒場」ボタン','');
  const depart=document.getElementById('village-depart-btn');
  if(depart){
    depart.style.display='none';
    const currentLabel=depart.querySelector('.rew-btn-label')?.textContent||'';
    depart.innerHTML=`<span class="rew-btn-label">${_qText('「店を出る」ボタン',currentLabel)}</span>`;
    depart.onclick=()=>_qLeaveTavernToVillage();
  }
  const move=document.getElementById('village-move-btns');
  if(move) move.style.display='flex';
  const intro=document.getElementById('village-intro-title');
  if(intro) intro.style.display='none';
  if(typeof updateHUD==='function') updateHUD();
}

function _qShowTavernVillage(){
  G._isTavern=true;
  G._isVillageMenu=false;
  G._isWaveAltar=false;
  G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false;
  G._facilityLabel=_qText('街「酒場」ボタン','');
  G.phase='reward';
  document.body.classList.remove('world-map-active');
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground('tavern');
  if(typeof showScreen==='function') showScreen('village');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  _qCustomizeTavernVillage();
  _qMovePresentationHost('village');
}

function syncTavernFormationControls(){
  if(!G||!G._isTavern||G.phase!=='reward') return;
  const host=document.getElementById('reward-move-btns');
  const button=host&&host.querySelector('.rew-move-btn');
  if(!button) return;
  const accepted=_qHasDinaOnBoard();
  button.disabled=!!G._pendingPanelPlacement;
  button.classList.toggle('disabled',!!button.disabled);
  button.innerHTML=`<span class="rew-btn-label">${_qText(accepted?'「受託」ボタン':'「拒否」ボタン','')}</span>`;
  button.onclick=()=>{
    if(button.disabled||G._pendingPanelPlacement) return;
    if(accepted) _qAcceptTavernQuest();
    else _qRejectTavernQuest();
  };
  const extra=document.getElementById('map-village-extra-btn');
  if(extra) extra.style.setProperty('display','none','important');
}

function _qOpenTavernFormation(){
  const entry=_qEntry();
  if(!entry) return;
  _qRemoveDialogue();
  G._isTavern=true; G._isVillageMenu=false; G._isWaveAltar=false;
  G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false;
  G._facilityLabel=_qText('街「酒場」ボタン','');
  G._mapReturnAfterReward=true;
  G._freeRewardPanelMode=true;
  G._rewardOnePickMode=true;
  G.phase='reward';
  document.body.classList.remove('village-screen-active','tavern-village-active');
  document.body.classList.add('reward-screen-active');
  if(typeof showScreen==='function') showScreen('battle');
  _qMovePresentationHost('battle');
  // 暗幕は他の施設と同じ `body.facility-bg-active #scr-battle::before`（black1.svg を乗算）を使う。
  // 独自に black1.svg を普通に重ねていた頃は、素材の白い部分がそのまま出て背景が消え、
  // 魔導板などの枠（battle-scroll）より手前に来て枠も隠れていた。
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground('tavern');
  if(typeof goToReward==='function') goToReward();
  const card=_qHasDinaOnBoard()?null:_qDinaCard();
  if(typeof _rewCards!=='undefined'){
    _rewCards=[];
    if(card){ card._isOriginalReward=true; _rewCards[0]=card; }
  }
  if(typeof _rewFreePickDone!=='undefined') _rewFreePickDone=false;
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  if(typeof renderMoveSlotsInEnemy==='function') renderMoveSlotsInEnemy();
  syncQuestFormationUi();
  syncTavernFormationControls();
}

function _qReturnToTavernResponse(){
  _qShowTavernVillage();
  _qMovePresentationHost('village');
}

function _qAcceptTavernQuest(){
  const entry=_qEntry();
  if(!entry||!_qHasDinaOnBoard()) return;
  entry.status='accepted';
  entry.rewardCardTaken=true;
  entry.towerEventDone=false;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  _qReturnToTavernResponse();
  const data=_qQuestData(entry.tavernVariant)||{};
  _qStartDialogue(data.accepted,{screen:'village',onDone:_qLeaveTavernAfterLines});
}

function _qRejectTavernQuest(){
  const entry=_qEntry();
  if(!entry) return;
  entry.status='rejected';
  entry.rewardCardTaken=false;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  _qReturnToTavernResponse();
  const data=_qQuestData(entry.tavernVariant)||{};
  _qStartDialogue(data.rejected,{screen:'village',onDone:_qLeaveTavernAfterLines});
}

// 会話を終えて酒場を出る時は、台詞枠を消してから少し間をおく（利用者指定）。
async function _qLeaveTavernAfterLines(){
  _qRemoveDialogue();
  await _qWait(TAVERN_LEAVE_DELAY_MS);
  if(!G||!G._isTavern) return;
  _qLeaveTavernToVillage();
}

function _qLeaveTavernToVillage(){
  checkQ009CompanionPresence({leaving:true});
  _qRemoveDialogue();
  _qClearPresentation();
  const veil=document.getElementById('tavern-formation-veil');
  if(veil) veil.remove();
  document.body.classList.remove('tavern-village-active','tavern-screen-active','reward-screen-active','facility-bg-active');
  if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
  if(typeof openMapVillage==='function') openMapVillage();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
}

async function openTavern(){
  if(!G||Number(G._wave)!==3) return;
  const entry=_qEnsureSelected();
  if(!entry) return;
  // 村画面の施設ボタンから入る経路も、戦闘／他施設から戻る経路と同じ
  // 「受託後にディナが失われていないか」の唯一の判定を通す。
  checkQ009CompanionPresence({leaving:true});
  _qShowTavernVillage();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  _qClearPresentation();
  if(entry.status==='failed'||entry.status==='completed') return;
  await _qShowPortraitPair('village');
  if(entry.status==='accepted'){
    const data=_qQuestData(entry.tavernVariant)||{};
    _qStartDialogue(data.acceptedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
  }else if(entry.status==='rejected'){
    const data=_qQuestData(entry.tavernVariant)||{};
    _qStartDialogue(data.rejectedAfter,{screen:'village',onDone:_qOpenTavernFormation});
  }else{
    const data=_qQuestData(entry.tavernVariant)||{};
    _qStartDialogue(data.initial,{screen:'village',onDone:_qOpenTavernFormation});
  }
}

function _qUpdateVillageGold(){
  const el=document.getElementById('village-gold');
  if(!el) return;
  const value=typeof goldDisplayValue==='function'?goldDisplayValue():Number(G.gold)||0;
  el.textContent=Number(value).toLocaleString('ja-JP');
}

function _qShowGoldGain(){
  const screen=document.getElementById('scr-village');
  if(!screen) return;
  const old=screen.querySelector('.tavern-gold-gain');
  if(old) old.remove();
  const gain=document.createElement('div');
  gain.className='tavern-gold-gain';
  gain.textContent='+500';
  gain.style.left=`${TAVERN_GOLD_GAIN_POSITION.x}px`;
  gain.style.top=`${TAVERN_GOLD_GAIN_POSITION.y}px`;
  screen.appendChild(gain);
  window.setTimeout(()=>gain.remove(),1450);
}

function _qFinishTowerArrival(){
  const entry=_qRaw();
  if(!entry) return;
  entry.status='completed';
  entry.towerEventDone=true;
  entry.description='';
  _qRemoveDialogue();
  _qClearPresentation();
  document.body.classList.remove('tavern-tower-event-active');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  syncQuestFormationUi();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('tower');
  _qTowerSession=false;
}

async function maybeStartQ009TowerArrival(){
  const entry=_qRaw();
  if(_qTowerSession||!entry||Number(G&&G._wave)!==3||!G._isWaveAltar
    ||entry.status!=='accepted'||entry.towerEventDone) return;
  _qTowerSession=true;
  entry.towerEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('tavern-tower-event-active');
  const facilities=document.getElementById('village-facilities');
  if(facilities) facilities.style.display='none';
  const moves=document.getElementById('village-move-btns');
  if(moves) moves.style.display='none';
  await _qShowPortraitPair('village');
  const data=_qQuestData(entry.towerVariant)||{};
  _qStartDialogue(data.initial,{screen:'village',onLine:index=>{
    if(index!==0||entry.towerRewardGiven) return;
    entry.towerRewardGiven=true;
    G.gold=(Number(G.gold)||0)+500;
    _qUpdateVillageGold();
    if(typeof updateHUD==='function') updateHUD();
    _qShowGoldGain();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('tower');
  },onDone:_qFinishTowerArrival});
}

if(typeof window!=='undefined'){
  window.showTavernPortrait=showTavernPortrait;
  window.openTavern=openTavern;
  window.syncQuestFormationUi=syncQuestFormationUi;
  window.syncTavernFormationControls=syncTavernFormationControls;
  window.checkQ009CompanionPresence=checkQ009CompanionPresence;
  window.onTavernQuestRewardCardTaken=onTavernQuestRewardCardTaken;
  window.maybeStartQ009TowerArrival=maybeStartQ009TowerArrival;
}
