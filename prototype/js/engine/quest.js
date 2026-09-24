// quest.js — 酒場クエスト（護衛依頼など）と、クエスト用の立ち絵／会話表示。
// 依存: loader.js, formation.js, pool.js, reward.js, map.js, main.js
//
// 会話の本文・話者・クエスト説明は window.QUEST_DATA（クエストシート）から読む。
// ここに個別の台詞や説明文を書かないこと。
//
// **クエストの番号・街・必須カードを決め打ちしないこと。**
//   どの街で何のクエストが出るか … 地域情報シートの「クエスト」列（その街＝そのステージの酒場で受ける）
//   会話 … クエストシートの「<番号>_1」（酒場）と「<番号>_2」（その街の塔に着いた時）
//   達成報酬のゴールド … 「_2」行の概要の「100G獲得」から読む（loader.js の rewardGold）
//   シートに列の無いもの（必須カード・右の立ち絵）… 下の QUEST_CONFIG

const QUEST_TAVERN_VARIANT='_1';
const QUEST_TOWER_VARIANT='_2';
// クエストごとの設定。requiredCardNo＝達成に必須のカード（NPCシートのNo.）。
// portraitB＝会話で右（対象B）に出す立ち絵（TAVERN_PORTRAIT_CONFIG のキー）。
const QUEST_CONFIG={
  Q003:{requiredCardNo:'NPC001',portraitB:'MC002'},
};

// ── 調整用レイアウト定数 ──────────────────────────────
// 立ち絵は設計座標へ原寸配置する。画面外へはみ出した分は #scr-* の overflow で切る。
const TAVERN_PORTRAIT_CONFIG={
  MC001:{src:'assets/art/NPC/MC001.webp',x:-207,y:252,width:1990,height:3410},
  MC002:{src:'assets/art/NPC/MC002.webp',x:2211,y:300,width:2095,height:2877},
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
  window.QUEST_CONFIG=QUEST_CONFIG;
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
#tavern-presentation-layer,.tavern-presentation-host{
  position:absolute!important;inset:0!important;overflow:hidden!important;
  z-index:120!important;pointer-events:none!important;
}
/* 失敗の台詞（酒場の外）で画面にかける暗幕。立ち絵より奥。 */
.quest-event-shade{position:absolute!important;inset:0!important;z-index:115!important;pointer-events:auto!important;
  background:rgba(0,0,0,.6)!important;opacity:0;transition:opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease!important}
.quest-event-shade.is-visible{opacity:1!important}
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
/* クエスト説明文：シートの改行をそのまま改行にする。文字色は旅の進捗の「〜の塔まで」と同じ、
   両端揃え、行間はカードのホバー説明（#kw-tooltip の line-height）と同じ（2026-09-24 利用者指定）。 */
html body.reward-screen-active .reward-prod-quest-body p.reward-prod-quest-main,
html body .reward-prod-quest-body p.reward-prod-quest-main{
  white-space:pre-line!important;color:#8b7c67!important;
  text-align:justify!important;text-justify:inter-character!important;line-height:1.692857!important;
}
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

function _qQuestData(id){
  const data=(typeof window!=='undefined'&&window.QUEST_DATA)||{};
  return data[id]||null;
}

function _qVariant(base,suffix){
  const id=`${String(base||'')}${suffix}`;
  return _qQuestData(id)?id:String(base||'');
}

// その街（ステージ）の地域情報に書かれたクエスト番号。会話データがあるものだけ。
function _qRegionIds(wave){
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(wave):null;
  const raw=String(info&&info.quest||'').trim();
  return raw.split(/[、,\s]+/).map(v=>v.trim()).filter(id=>id&&id!=='-')
    .filter(id=>_qQuestData(_qVariant(id,QUEST_TAVERN_VARIANT))||_qQuestData(id));
}

// その街の酒場が開いているか（クエストがある街だけ開く）。map.js が施設ボタンの可否に使う。
function questTavernAvailable(wave){
  const w=Math.max(0,Number(wave!=null?wave:(G&&G._wave))||0);
  return _qRegionIds(w).length>0;
}

function _qAllEntries(){
  const all=_qQuestState();
  return all?Object.values(all).filter(e=>e&&typeof e==='object'&&e.questId):[];
}
// その街で出ている（出た）クエスト。
function _qEntryForWave(wave){
  const w=Number(wave);
  return _qAllEntries().find(e=>Number(e.wave)===w)||null;
}
// 受託して進行中のクエスト（塔に着く前）。
function _qActiveEntry(){
  return _qAllEntries().find(e=>e.status==='accepted'&&!e.towerEventDone)||null;
}

function _qEnsureSelected(){
  const all=_qQuestState();
  if(!all) return null;
  const wave=Math.max(0,Number(G&&G._wave)||0);
  const existing=_qEntryForWave(wave);
  if(existing) return existing;
  const candidates=_qRegionIds(wave);
  if(!candidates.length) return null;
  const selected=runWithKeyedRandom(`quest:${wave}:tavern`,()=>candidates[Math.floor(rand()*candidates.length)]);
  const tavernVariant=_qVariant(selected,QUEST_TAVERN_VARIANT);
  const towerVariant=_qVariant(selected,QUEST_TOWER_VARIANT);
  const data=_qQuestData(tavernVariant)||_qQuestData(selected)||{};
  all[selected]={
    questId:selected,
    wave,
    tavernVariant,
    towerVariant,
    status:'offered',
    rewardCardTaken:false,
    partedPending:false,
    towerEventStarted:false,
    towerRewardGiven:false,
    towerEventDone:false,
    description:String(data.description||''),
  };
  return all[selected];
}

// 酒場の中で扱うクエスト（今の街のもの）。
function _qEntry(){
  const wave=Math.max(0,Number(G&&G._wave)||0);
  return _qEntryForWave(wave)||_qEnsureSelected();
}

function _qConfig(entry){
  return (entry&&QUEST_CONFIG[entry.questId])||{};
}

function _qCardNo(card){
  return String(card&&(card.no||card.No||card['No.']||card.artCode)||'').toUpperCase();
}
// そのクエストに必須のカードか（今回はファラ＝NPC001）。
function _qIsRequiredCard(card,entry){
  const no=String(_qConfig(entry).requiredCardNo||'').toUpperCase();
  return !!(card&&no&&_qCardNo(card)===no);
}
// 進行中のクエストに必須のカードか（ショップの「別れる」、戦闘中の台詞の判定に使う）。
function questRequiredCardFor(card){
  const entry=_qActiveEntry();
  return entry&&_qIsRequiredCard(card,entry)?entry:null;
}

function _qHasRequiredOnBoard(entry){
  if(typeof G==='undefined'||!G||!entry) return false;
  const cards=Array.isArray(G.mainBoard)?G.mainBoard:[];
  return cards.some(card=>_qIsRequiredCard(card,entry));
}
function _qRequiredInReward(entry){
  return typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)&&_rewCards.some(card=>_qIsRequiredCard(card,entry));
}

function _qMakeRequiredCard(entry){
  const no=String(_qConfig(entry).requiredCardNo||'').toUpperCase();
  if(!no||typeof makePanel!=='function') return null;
  const panel=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(card=>card&&card._npcCard&&_qCardNo(card)===no)
    :null;
  const card=makePanel(panel?panel.id:`panel_npc_${no}`);
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

// クエスト枠に出す説明文。受託して進行中の間だけ出す。
// 酒場の依頼の編成窓では、受ける前の依頼として出す（拒否した後は、枠の外では出さない）。
function _qDescription(){
  const active=_qActiveEntry();
  if(active) return String(active.description||(_qQuestData(active.tavernVariant)||{}).description||'').trim();
  if(G&&G._isTavern&&G.phase==='reward'){
    const entry=_qEntryForWave(G._wave);
    if(entry&&['offered','rejected'].includes(String(entry.status))){
      return String(entry.description||(_qQuestData(entry.tavernVariant)||{}).description||'').trim();
    }
  }
  return '';
}

function _qSyncQuestBody(){
  const panel=document.querySelector('.reward-prod-quest');
  if(!panel) return;
  const title=panel.querySelector('h2');
  if(title) title.textContent=_qText('「クエスト枠」見出し','');
  const body=panel.querySelector('.reward-prod-quest-body');
  if(!body) return;
  const desc=_qDescription();
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
  const title=_qText('「酒場の報酬枠」見出し','');
  if(G&&G.phase==='reward'&&G._isTavern){
    body.classList.add('tavern-screen-active');
    body.style.setProperty('--title-reward',JSON.stringify(title));
  }else{
    body.classList.remove('tavern-screen-active');
    body.style.removeProperty('--title-reward');
  }
  const panel=document.querySelector('.reward-prod-quest');
  if(panel) panel.classList.toggle('quest-active',!!_qDescription());
}

function _qMarkFailed(entry){
  if(!entry) return;
  entry.status='failed';
  entry.rewardCardTaken=false;
  entry.partedPending=false;
  entry.description='';
  // 報酬枠に置き去りにした必須カードは消す。
  if(typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)){
    for(let i=0;i<_rewCards.length;i++) if(_qIsRequiredCard(_rewCards[i],entry)) _rewCards[i]=null;
  }
  syncQuestFormationUi();
}

// 必須カードが魔導板から失われていないか。**失敗にするのは本当に失われた時だけ。**
//   ・報酬枠へ置いた／ショップで「別れる」を押しただけなら、画面を出るまでは失敗にしない
//     （出る時は questGuardLeave が「クエスト失敗警告」を出す）。
//   ・戦闘での死亡・逃走（帰滅で消える）は、ここで失敗にする。
//   leaving：画面を出る処理の中から呼ぶ。警告を通らずに出た場合も、ここで失敗へ確定する。
function checkQ009CompanionPresence(options){
  const entry=_qActiveEntry();
  if(!entry) return false;
  if(_qHasRequiredOnBoard(entry)){
    entry.rewardCardTaken=true;
    entry.partedPending=false;
    return false;
  }
  const opts=options||{};
  const pending=_qRequiredInReward(entry)||entry.partedPending;
  if(pending&&!opts.leaving) return false;
  _qMarkFailed(entry);
  return true;
}

function onTavernQuestRewardCardTaken(card){
  const entry=_qEntry();
  if(!entry||!G||!G._isTavern||!_qIsRequiredCard(card,entry)) return;
  entry.rewardCardTaken=_qHasRequiredOnBoard(entry);
  syncQuestFormationUi();
  if(typeof syncTavernFormationControls==='function') syncTavernFormationControls();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
}

// ショップ：必須カードの右上に値段の代わりに「別れる」を出す（reward.js）。押すとカードを消す。
// この時点ではまだ失敗にしない（店を出る時に「クエスト失敗警告」を出す）。
function questCardPartable(card){
  return !!(G&&G._isShop&&questRequiredCardFor(card));
}
function questPartWithCard(card){
  const entry=questRequiredCardFor(card);
  if(!entry) return false;
  entry.partedPending=true;
  return true;
}

// ── 画面を出る時の「クエスト失敗警告」 ─────────────────────
// 進行中のクエストの必須カードが魔導板に無いまま画面を出ようとしたら、
// セーブデータ削除時と同じ見た目の確認窓（showGameConfirm）で警告する。
// OK：失敗にして、非戦闘時クエスト失敗台詞を喋らせてから、押したボタンの処理へ進む。
function questNeedsLeaveWarning(){
  if(!G||G._isTavern) return false;
  const entry=_qActiveEntry();
  return !!(entry&&!_qHasRequiredOnBoard(entry));
}
let _qLeaveBypass=false;
function questGuardLeave(proceed){
  if(_qLeaveBypass||!questNeedsLeaveWarning()) return false;
  const entry=_qActiveEntry();
  const message=_qText('クエスト失敗警告','');
  const open=typeof showGameConfirm==='function'?showGameConfirm:null;
  const onOk=async()=>{
    _qMarkFailed(entry);
    if(typeof renderRewCards==='function') renderRewCards();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint(G._waveVillage?'town':'reward');
    await _qPlayFailLines(entry,'failedNonBattle');
    _qLeaveBypass=true;
    try{ proceed(); }finally{ _qLeaveBypass=false; }
  };
  if(!open){ void onOk(); return true; }
  open({title:_qText('「クエスト失敗警告」見出し','警告'),message,okLabel:'OK',cancelLabel:_qText('「キャンセル」ボタン','キャンセル'),onOk});
  return true;
}
// 画面を出るボタン（報酬・ショップ・施設の移動ボタン、村の出発ボタン）を押した瞬間に先回りして判定する。
if(typeof document!=='undefined'){
  document.addEventListener('click',ev=>{
    if(_qLeaveBypass) return;
    const btn=ev.target&&ev.target.closest&&ev.target.closest('#reward-move-btns .rew-move-btn,#village-depart-btn');
    if(!btn||btn.disabled) return;
    if(!questNeedsLeaveWarning()) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    questGuardLeave(()=>btn.click());
  },true);
}

// 失敗の台詞（非戦闘時・失敗後）を、今の画面の上に暗幕をかけて喋らせる。A は最初から F003 の表情。
async function _qPlayFailLines(entry,kind){
  const data=_qQuestData(entry&&entry.tavernVariant)||{};
  const lines=data[kind]||[];
  if(!lines.length) return;
  const active=document.querySelector('.screen.active');
  const screen=active&&active.id==='scr-battle'?'battle':'village';
  const host=_qMovePresentationHost(screen);
  let shade=null;
  if(host&&!G._isTavern){
    shade=document.createElement('div');
    shade.className='quest-event-shade';
    host.parentElement.insertBefore(shade,host);
    requestAnimationFrame(()=>shade.classList.add('is-visible'));
  }
  await _qShowPortraitPair(screen,entry,{faceA:'F003'});
  await _qStartDialogue(lines,{screen});
  await _qClearPresentation();
  if(shade){
    shade.classList.remove('is-visible');
    await _qWait(TAVERN_PORTRAIT_FADE_MS);
    shade.remove();
  }
}

// ── 戦闘中：必須カードが死亡・逃走する時の台詞 ─────────────────
// 戦闘を一時停止し、そのカードの上に死亡時台詞／逃走時台詞を出す（戦闘の台詞と同じ位置の決め方）。
// battle_events.js が死亡・逃走の演出の直前に呼ぶ。
async function questBattleCardLine(events,kind,findUnit){
  if(typeof _showBattleLine!=='function') return;
  for(const ev of (events||[])){
    if(!ev||ev.side!=='p1') continue;
    const unit=typeof findUnit==='function'?findUnit(ev.side,ev.unitId):null;
    const entry=unit?questRequiredCardFor(unit):null;
    if(!entry) continue;
    const key=`${kind}:${ev.unitId}`;
    entry._battleLinesShown=entry._battleLinesShown||{};
    if(entry._battleLinesShown[key]) continue;
    entry._battleLinesShown[key]=true;
    const lines=((_qQuestData(entry.tavernVariant)||{})[kind==='flee'?'flee':'death'])||[];
    if(!lines.length) continue;
    try{
      if(document.fonts&&document.fonts.ready) await document.fonts.ready;
      const centerX=_battleLineUnitCenterX(unit,false);
      const tailY=_battleLineTailY(false,String(unit.lane||'front')==='rear');
      for(const line of lines) await _showBattleLine(line.text,centerX,tailY,false);
    }finally{
      if(typeof _removeBattleLineLayer==='function') _removeBattleLineLayer();
    }
  }
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
    host.className='tavern-presentation-host';
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

// 立ち絵は**常にフェードで消す**（2026-09-24 利用者指定）。immediate は画面が暗転している時だけ使う。
async function _qClearPresentation(options){
  const host=document.getElementById('tavern-presentation-layer');
  if(!host) return;
  if(options&&options.immediate){ host.remove(); return; }
  // 消える途中の層は id を外し、次に出す立ち絵の層とぶつからないようにする。
  host.removeAttribute('id');
  host.querySelectorAll('.tavern-portrait,.tavern-face').forEach(el=>el.classList.remove('is-visible'));
  await _qWait(TAVERN_PORTRAIT_FADE_MS);
  host.remove();
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

// A（MC001）→ B（クエストごとの立ち絵）の順にフェードインで出す。faceA を渡すと A は最初からその表情。
async function _qShowPortraitPair(screen,entry,options){
  const opts=options||{};
  await _qClearPresentation();
  _qMovePresentationHost(screen);
  await showTavernPortrait('MC001',{screen,face:opts.faceA});
  const portraitB=_qConfig(entry).portraitB;
  if(portraitB) await showTavernPortrait(portraitB,{screen});
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
  const entry=_qEntry();
  const accepted=_qHasRequiredOnBoard(entry);
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
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground('tavern');
  if(typeof goToReward==='function') goToReward();
  const card=_qHasRequiredOnBoard(entry)?null:_qMakeRequiredCard(entry);
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
  if(!entry||!_qHasRequiredOnBoard(entry)) return;
  entry.status='accepted';
  entry.rewardCardTaken=true;
  entry.partedPending=false;
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
  syncQuestFormationUi();
  // 拒否した時は、左のキャラ（MC001）の表情を F003 にする（2026-09-24 利用者指定）。
  void showTavernPortrait('MC001',{screen:'village',face:'F003'});
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
  // 酒場を出る時も暗転を挟む（立ち絵は暗転で隠れてから消す）。
  if(typeof fadeScreenSwitch==='function') return fadeScreenSwitch(_qLeaveTavernToVillageNow);
  return _qLeaveTavernToVillageNow();
}
function _qLeaveTavernToVillageNow(){
  checkQ009CompanionPresence({leaving:true});
  _qRemoveDialogue();
  void _qClearPresentation({immediate:true});
  document.body.classList.remove('tavern-village-active','tavern-screen-active','reward-screen-active','facility-bg-active');
  if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
  if(typeof openMapVillage==='function') openMapVillage();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
}

async function openTavern(){
  if(!G||!questTavernAvailable(G._wave)) return;
  const entry=_qEnsureSelected();
  if(!entry) return;
  // 受託後に必須カードが失われていないかの唯一の判定を通す。
  checkQ009CompanionPresence({leaving:true});
  // 入店は暗転を挟む（map.js の fadeScreenSwitch）。立ち絵は明けてから出す。
  const enter=()=>{
    _qShowTavernVillage();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
    void _qClearPresentation({immediate:true});
  };
  if(typeof fadeScreenSwitch==='function') await fadeScreenSwitch(enter); else enter();
  const data=_qQuestData(entry.tavernVariant)||{};
  if(entry.status==='completed') return;
  // 失敗した後に入ると、失敗後台詞を出して酒場を出る。A は最初から F003 の表情。
  if(entry.status==='failed'){
    await _qShowPortraitPair('village',entry,{faceA:'F003'});
    _qStartDialogue(data.failedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  await _qShowPortraitPair('village',entry);
  if(entry.status==='accepted'){
    _qStartDialogue(data.acceptedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
  }else if(entry.status==='rejected'){
    _qStartDialogue(data.rejectedAfter,{screen:'village',onDone:_qOpenTavernFormation});
  }else{
    _qStartDialogue(data.initial,{screen:'village',onDone:_qOpenTavernFormation});
  }
}

async function _qFinishTowerArrival(entry){
  if(!entry) return;
  entry.status='completed';
  entry.towerEventDone=true;
  entry.description='';
  _qRemoveDialogue();
  await _qClearPresentation();
  document.body.classList.remove('tavern-tower-event-active');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  syncQuestFormationUi();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('tower');
  _qTowerSession=false;
}

// クエストを受けた街の塔に着いた時（地名表示の後）、「_2」の会話を始める。
async function maybeStartQ009TowerArrival(){
  const entry=_qActiveEntry();
  if(_qTowerSession||!entry||!G||!G._isWaveAltar||Number(G._wave)!==Number(entry.wave)) return;
  _qTowerSession=true;
  entry.towerEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('tavern-tower-event-active');
  const facilities=document.getElementById('village-facilities');
  if(facilities) facilities.style.display='none';
  const moves=document.getElementById('village-move-btns');
  if(moves) moves.style.display='none';
  await _qShowPortraitPair('village',entry);
  const data=_qQuestData(entry.towerVariant)||{};
  const reward=Math.max(0,Number(data.rewardGold)||0);
  _qStartDialogue(data.initial,{screen:'village',onLine:index=>{
    if(index!==0||entry.towerRewardGiven) return;
    entry.towerRewardGiven=true;
    // 「+100」と数え上げは共通の所持金演出（gold_fx.js）が出す。ここは所持金を足すだけ。
    if(reward) G.gold=(Number(G.gold)||0)+reward;
    if(typeof updateHUD==='function') updateHUD();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('tower');
  },onDone:()=>_qFinishTowerArrival(entry)});
}

if(typeof window!=='undefined'){
  window.showTavernPortrait=showTavernPortrait;
  window.openTavern=openTavern;
  window.questTavernAvailable=questTavernAvailable;
  window.syncQuestFormationUi=syncQuestFormationUi;
  window.syncTavernFormationControls=syncTavernFormationControls;
  window.checkQ009CompanionPresence=checkQ009CompanionPresence;
  window.onTavernQuestRewardCardTaken=onTavernQuestRewardCardTaken;
  window.maybeStartQ009TowerArrival=maybeStartQ009TowerArrival;
  window.questRequiredCardFor=questRequiredCardFor;
  window.questCardPartable=questCardPartable;
  window.questPartWithCard=questPartWithCard;
  window.questGuardLeave=questGuardLeave;
  window.questBattleCardLine=questBattleCardLine;
}
