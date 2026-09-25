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
  // Q002 は受託時に、次の街（wave 2）までの残り戦闘から最大3戦を選び、E101を報酬へ混ぜる。
  // townArrival は塔イベントとは別に、指定waveの街へ着いた直後に編成画面を挟む。
  Q002:{requiredCardNo:'',portraitB:'MC002',initialChoice:true,
    rewardMix:{cardNo:'E101',count:3,arrivalWave:2},
    townArrival:{wave:2,portraitB:'MC005',fallbackGoldByCount:{1:50,2:120,3:250}}},
  Q003:{requiredCardNo:'BC002',portraitB:'MC002',acceptedFace:'F005'},
  // Q004 は依頼カードを介さず、酒場の台詞4で受託／拒否を選ぶ。
  // encounterTargets は受託時にランの鍵付き乱数で1件だけ保存する対象戦闘。
  Q004:{requiredCardNo:'',portraitB:'MC003',initialChoice:true,rejectFace:'F004',noFailureRevisit:true,
    encounterTargets:[{wave:2,stage:6},{wave:2,stage:7},{wave:3,stage:1}]},
};

// ── 調整用レイアウト定数 ──────────────────────────────
// 立ち絵は設計座標へ原寸配置する。画面外へはみ出した分は #scr-* の overflow で切る。
const TAVERN_PORTRAIT_CONFIG={
  MC001:{src:'assets/art/NPC/MC001.webp',x:-207,y:252,width:1990,height:3410},
  MC002:{src:'assets/art/NPC/MC002.webp',x:2211,y:300,width:2095,height:2877},
  MC003:{src:'assets/art/NPC/MC003.webp',x:2400,y:240,width:2305,height:3880},
  MC004:{src:'assets/art/NPC/MC004.webp',x:1819,y:192,width:3155,height:4291},
  MC005:{src:'assets/art/NPC/MC005.webp',x:2320,y:380,width:1898,height:2847},
};
const TAVERN_PORTRAIT_FADE_MS=480;
const TAVERN_FACE_FADE_MS=1000;   // 表情の差分のフェードイン（0.48秒では早すぎた。2026-09-25 利用者指摘）
const TAVERN_DESTROY_RED_MS=450;    // 破壊された必須カードの立ち絵が赤く染まるまで
const TAVERN_DESTROY_FADE_MS=900;   // 赤くなってから消えるまで
const TAVERN_DESTROY_AFTER_ITEM_MS=400; // アイテムの演出（マスの変化など）が終わってから編成画面を閉じるまで
const TAVERN_PORTRAIT_STEP_MS=500;
// face を渡した時だけ、MC001の左上からの相対座標へ表情差分を重ねる。
// 表情の差分（F001〜、351×351）。MC001 の左上から X811・Y335 に実寸で置く（2026-09-25 利用者指定。
// MC001.webp と画素を突き合わせて一致を確認済み）。
const TAVERN_FACE_CONFIG={x:811,y:335,width:351,height:351};
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
let _qTownSession=false;
let _qFormationContext=null;

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
/* 依頼人の名前札（_qShowNamePlate）。線と文字には「戦闘開始」と同じドロップシャドウ。 */
.tavern-name-plate{position:absolute!important;left:${TAVERN_NAME_PLATE.x}px!important;top:0!important;width:${TAVERN_NAME_PLATE.lineW}px!important;height:0!important;
  z-index:2!important;opacity:0;transition:opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease!important;pointer-events:none!important}
.tavern-name-plate.is-visible{opacity:1!important}
/* 線は main_line.svg の形で切り抜き、名前と同じ色をグラデーションで塗る。影は切り抜きに消されないよう外側の箱に付ける。 */
.tavern-name-line{position:absolute!important;left:0!important;top:${TAVERN_NAME_PLATE.y}px!important;width:${TAVERN_NAME_PLATE.lineW}px!important;height:${TAVERN_NAME_PLATE.lineH}px!important;
  filter:drop-shadow(0 4px 5px rgba(14,7,2,.72)) drop-shadow(0 0 12px rgba(255,214,104,.28))!important}
.tavern-name-line-fill{position:absolute!important;inset:0!important;background:${TAVERN_NAME_LINE_GRADIENT}!important;
  -webkit-mask:url("assets/ui/main_line.svg") center/100% 100% no-repeat!important;mask:url("assets/ui/main_line.svg") center/100% 100% no-repeat!important}
.tavern-name-text{position:absolute!important;left:0!important;right:0!important;bottom:${-(TAVERN_NAME_PLATE.y-12)}px!important;display:flex!important;
  align-items:center!important;justify-content:center!important;gap:28px!important;white-space:nowrap!important;
  color:#f7efdf!important;font-family:"Shippori Mincho",serif!important;font-weight:600!important;letter-spacing:.06em!important;
  filter:drop-shadow(0 4px 5px rgba(14,7,2,.72)) drop-shadow(0 0 12px rgba(255,214,104,.28))!important}
.tavern-name-sub{font-size:48px!important;line-height:1!important}
.tavern-name-main{font-size:86px!important;line-height:1!important}
/* 必須カードを壊したアイテムの演出が終わるまで、画面の操作を止める（_qWaitItemPresentation）。 */
html body.quest-destroy-wait #scr-battle,html body.quest-destroy-wait #scr-battle *{pointer-events:none!important}
/* 必須カードが破壊された時、その立ち絵を赤く染めながら消す（_qFadePortraitRed）。 */
.tavern-portrait.is-dying{
  opacity:0!important;
  filter:sepia(1) saturate(9) hue-rotate(-50deg) brightness(.75)!important;
  transition:filter ${TAVERN_DESTROY_RED_MS}ms ease,opacity ${TAVERN_DESTROY_FADE_MS}ms ease ${TAVERN_DESTROY_RED_MS}ms!important;
}
.tavern-face{
  position:absolute!important;display:block!important;margin:0!important;padding:0!important;
  width:${TAVERN_FACE_CONFIG.width}px!important;height:${TAVERN_FACE_CONFIG.height}px!important;max-width:none!important;max-height:none!important;
  object-fit:fill!important;opacity:0;transition:opacity ${TAVERN_FACE_FADE_MS}ms ease-in-out!important;pointer-events:none!important;
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
.tavern-dialogue-choice{display:block!important;pointer-events:auto!important;cursor:var(--cursor-pointer, pointer)!important}
.tavern-dialogue-choice:hover,.tavern-dialogue-choice:focus-visible{
  color:#a45a1f!important;text-shadow:0 0 9px rgba(255,232,162,.85)!important;outline:none!important;
}
.tavern-dialogue-bubble.is-dark .tavern-dialogue-text{color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.65)!important}
.tavern-dialogue-bubble.is-dark .tavern-dialogue-choice:hover,
.tavern-dialogue-bubble.is-dark .tavern-dialogue-choice:focus-visible{
  color:#ffe8a2!important;text-shadow:0 0 9px rgba(255,232,162,.9)!important;
}
.tavern-dialogue-note{display:block!important;color:#6f5b47!important;font-size:.72em!important;font-weight:600!important;line-height:1.35!important}
.tavern-dialogue-bubble.is-dark .tavern-dialogue-note{color:rgba(255,255,255,.72)!important}
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
html body.tavern-tower-event-active #village-move-btns,
html body.quest-town-event-active #village-facilities,
html body.quest-town-event-active #village-move-btns{display:none!important}
/* 魔獣撃退依頼の camp の場面では、街の名前の札も出さない（街の画面を背景の器として使うだけ）。 */
html body.quest-camp-scene #village-name-plate{display:none!important}
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
html body:is(.tavern-village-active,.tavern-tower-event-active,.quest-town-event-active) #village-name-plate{z-index:130!important}
html body:is(.tavern-village-active,.tavern-tower-event-active,.quest-town-event-active) #village-status{z-index:5100!important}
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

// その街の酒場のクエストを「_2」まで達成したか（失敗ではなく completed）。
// 達成後はその酒場を暗くして入れなくする（map.js。2026-09-25 利用者指定）。
function questTavernCompleted(wave){
  const w=Math.max(0,Number(wave!=null?wave:(G&&G._wave))||0);
  const entry=_qEntryForWave(w);
  return !!(entry&&entry.status==='completed');
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
  const arrivalData=_qQuestData(towerVariant)||{};
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
    // Q004 の対象戦闘。旧セーブには無いので、各ヘルパーで既定値を補う。
    encounterTarget:null,
    encounterPhase:'none',
    encounterFled:false,
    encounterRewardGiven:false,
    // Q002_1 は説明欄が空で、受託後に表示する本文は Q002_2 側にある。
    description:String(data.description||arrivalData.description||''),
    rewardMixTargets:[],
    townEventStarted:false,
    townEventDone:false,
  };
  return all[selected];
}

// 酒場クエスト検査専用。ランダム選択済みの状態を指定クエストへ置き換える。
// 本編からは呼ばず、実ブラウザ検査が _qEnsureSelected() より前にだけ使う。
function questDebugForceWaveQuest(wave,id){
  const all=_qQuestState();
  if(!all) return null;
  const w=Math.max(0,Number(wave)||0);
  const selected=String(id||'').trim();
  if(!selected||!_qQuestData(_qVariant(selected,QUEST_TAVERN_VARIANT))) return null;
  Object.keys(all).forEach(key=>{
    const entry=all[key];
    if(entry&&Number(entry.wave)===w) delete all[key];
  });
  const tavernVariant=_qVariant(selected,QUEST_TAVERN_VARIANT);
  const towerVariant=_qVariant(selected,QUEST_TOWER_VARIANT);
  const data=_qQuestData(tavernVariant)||_qQuestData(selected)||{};
  const arrivalData=_qQuestData(towerVariant)||{};
  const entry={
    questId:selected,
    wave:w,
    tavernVariant,
    towerVariant,
    status:'offered',
    rewardCardTaken:false,
    partedPending:false,
    towerEventStarted:false,
    towerRewardGiven:false,
    towerEventDone:false,
    encounterTarget:null,
    encounterPhase:'none',
    encounterFled:false,
    encounterRewardGiven:false,
    description:String(data.description||arrivalData.description||''),
    rewardMixTargets:[],
    townEventStarted:false,
    townEventDone:false,
  };
  all[selected]=entry;
  return entry;
}

// 酒場の中で扱うクエスト（今の街のもの）。
function _qEntry(){
  const wave=Math.max(0,Number(G&&G._wave)||0);
  return _qEntryForWave(wave)||_qEnsureSelected();
}

function _qConfig(entry){
  return (entry&&QUEST_CONFIG[entry.questId])||{};
}

function _qHasDirectChoice(entry){
  return !!_qConfig(entry).initialChoice;
}

function _qCardNo(card){
  return String(card&&(card.no||card.No||card['No.']||card.artCode)||'').toUpperCase();
}
// そのクエストに必須のカードか（ファラ＝BC002）。
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
  if(!String(_qConfig(entry).requiredCardNo||'').trim()) return true;
  const cards=Array.isArray(G.mainBoard)?G.mainBoard:[];
  return cards.some(card=>_qIsRequiredCard(card,entry));
}
function _qRequiredInReward(entry){
  if(!String(_qConfig(entry).requiredCardNo||'').trim()) return false;
  return typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)&&_rewCards.some(card=>_qIsRequiredCard(card,entry));
}

// 報酬欄の依頼カードに、アイテムで永久強化が与えられているか（reward_items.js が _itemBuffed を付ける）。
// 与えたまま拒否すると特殊拒否になる（2026-09-25 利用者指定）。
function _qRequiredCardBuffed(entry){
  const lists=[typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)?_rewCards:[],
    Array.isArray(G&&G.mainBoard)?G.mainBoard:[],Array.isArray(G&&G.globalPanels)?G.globalPanels:[]];
  return lists.some(list=>list.some(card=>card&&card._itemBuffed&&_qIsRequiredCard(card,entry)));
}
// 必須カードを魔導板・共通欄・報酬欄から取り除く（クエスト完了で別れた時）。
function _qRemoveRequiredCards(entry){
  let removed=false;
  const clear=list=>{ if(!Array.isArray(list)) return; list.forEach((card,i)=>{ if(card&&_qIsRequiredCard(card,entry)){ list[i]=null; removed=true; } }); };
  clear(G&&G.mainBoard);
  clear(G&&G.globalPanels);
  const unit=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  if(unit&&unit.boardCards!==G.mainBoard) clear(unit.boardCards);
  if(typeof _rewCards!=='undefined') clear(_rewCards);
  if(removed&&typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  return removed;
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
  if(active) return String(active.description||(_qQuestData(active.tavernVariant)||{}).description
    ||(_qQuestData(active.towerVariant)||{}).description||'').trim();
  if(G&&G._isTavern&&G.phase==='reward'){
    const entry=_qEntryForWave(G._wave);
    if(entry&&['offered','rejected'].includes(String(entry.status))){  // 特殊拒否（rejectedSpecial）は編成窓を開かない
      return String(entry.description||(_qQuestData(entry.tavernVariant)||{}).description||'').trim();
    }
  }
  return '';
}

// 魔獣撃退依頼（Q004）：討伐対象（ガルム・グリーム）の見た目と強さ。受託中はクエスト枠の文にホバーすると、
// 旅の進捗のボスアイコンと同じ形（data-journey-enemy）で出す（2026-09-25 利用者指定）。
// 強さは一度決めたらクエストの状態に残し、実際のガルム戦（enemy.js generateQuestGarmEnemies）も同じ値を使う。
function _qGarmDef(){
  const pool=typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[];
  return pool.find(d=>String(d&&(d.artCode||d._artCode||d.No||d.no||d['No.']||'')).toUpperCase()==='EN027')||null;
}
function questGarmPreviewStats(){
  const entry=_qActiveEntry();
  if(!entry||!_qConfig(entry).encounterTargets) return null;
  const def=_qGarmDef();
  if(!def) return null;
  if(!entry.garmPreview||!(Number(entry.garmPreview.hp)>0)){
    const floor=typeof _waveStageFloor==='function'?_waveStageFloor(2,3):1;
    const stats=typeof enemyStats==='function'?enemyStats(def,floor,1.5):{atk:def.atk,hp:def.hp};
    entry.garmPreview={atk:Number(stats.atk)||0,hp:Number(stats.hp)||1};
  }
  return {def,atk:entry.garmPreview.atk,hp:entry.garmPreview.hp};
}
function _qGarmPreviewPayload(){
  const p=questGarmPreviewStats();
  if(!p) return null;
  const def=p.def;
  return {
    name:def.name,
    desc:typeof _annotateSummonNames==='function'?_annotateSummonNames(String(def.desc||'').trim(),{...def,atk:p.atk,maxHp:p.hp}):String(def.desc||'').trim(),
    atk:p.atk,hp:p.hp,
    art:typeof getCharacterNoArtPath==='function'?getCharacterNoArtPath(def):null,
    keywords:[...new Set((def.keywords||[]).map(k=>String(k||'').trim()).filter(Boolean))],
    artCode:def.artCode||def._artCode||def.No||def['No.']||def.no||def.imageNo||'',
    color:def.color||'',_sheetEnemy:!!def._sheetEnemy,_isEliteOrBoss:true,
  };
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
    const active=_qActiveEntry();
    const garm=active&&active.status==='accepted'?_qGarmPreviewPayload():null;
    if(garm){
      p.setAttribute('data-preview',garm.name);
      p.setAttribute('data-journey-enemy',JSON.stringify(garm));
      p.style.setProperty('pointer-events','auto','important');
    }
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
  if('encounterPhase' in entry) entry.encounterPhase='failed';
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
  open({title:_qText('「クエスト失敗警告」見出し','警告'),message,okLabel:_qText('「OK」ボタン','OK'),cancelLabel:_qText('「キャンセル」ボタン','キャンセル'),onOk,allowOptions:true});
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

// ── 戦闘以外で必須カードが破壊された時（生贄人形・永劫の巻物など）───────────
// 酒場の依頼の編成中：ただちに編成画面を閉じ、酒場の会話で非戦闘時死亡時台詞1 → 立ち絵を赤く消す →
//   非戦闘時死亡時台詞2 → 酒場を出る。A は最初から F003。
// それ以外（受託後の編成画面など）：画面にオーバーレイをかけて同じ流れ。
// 以後クエストは killed（再訪時は非戦闘時死亡後台詞を出して酒場を出る）。2026-09-25 利用者指定。
// reward_items.js が、アイテムを使う前に魔導板にあった必須カードの持ち主（questRequiredEntryOnBoard）を覚えておき、
// 使った後にこれを呼ぶ。本当に消えていれば true を返して流れを始める。
function questRequiredEntryOnBoard(){
  const active=_qActiveEntry();
  if(active&&_qHasRequiredOnBoard(active)) return active;
  const tavern=G&&G._isTavern?_qEntry():null;
  if(tavern&&['offered','rejected'].includes(String(tavern.status))&&_qHasRequiredOnBoard(tavern)) return tavern;
  return null;
}
let _qDestroySession=false;
function questRequiredCardGone(entry){
  return !!(entry&&!_qDestroySession&&!_qHasRequiredOnBoard(entry)&&!_qRequiredInReward(entry));
}
function questOnRequiredCardDestroyed(entry){
  if(!questRequiredCardGone(entry)) return false;
  const inTavern=!!(G&&G._isTavern);
  entry.status='killed';
  entry.rewardCardTaken=false;
  entry.partedPending=false;
  entry.description='';
  _qRemoveRequiredCards(entry);
  syncQuestFormationUi();
  void _qPlayDestroyedLines(entry,inTavern);
  return true;
}
async function _qFadePortraitRed(id){
  const img=document.querySelector(`#tavern-presentation-layer .tavern-portrait[data-portrait-id="${id}"]`);
  if(!img) return;
  img.classList.add('is-dying');
  img.classList.remove('is-visible');
  await _qWait(TAVERN_DESTROY_RED_MS+TAVERN_DESTROY_FADE_MS);
  img.remove();
}
// アイテムの演出（永劫の巻物のマスの変化など）が終わるまで待つ。終わってから少しだけ間をおく。
// 待つ間は編成画面を触らせない（元に戻す・拒否などで壊したファラが戻らないように）。
async function _qWaitItemPresentation(){
  document.body.classList.add('quest-destroy-wait');
  try{
    const started=Date.now();
    while(G&&G._mapForgeAnimating&&Date.now()-started<8000) await _qWait(50);
    await _qWait(TAVERN_DESTROY_AFTER_ITEM_MS);
  }finally{
    document.body.classList.remove('quest-destroy-wait');
  }
}
async function _qPlayDestroyedLines(entry,inTavern){
  _qDestroySession=true;
  try{
    // 編成画面を閉じる・オーバーレイをかけるのは、アイテムの演出が終わってから（2026-09-25 利用者指定）。
    await _qWaitItemPresentation();
    const data=_qQuestData(entry.tavernVariant)||{};
    const portraitB=_qConfig(entry).portraitB;
    let shade=null;
    let screen='village';
    if(inTavern){
      // 編成画面をただちに閉じ、酒場の会話の画面へ戻る。
      if(typeof G!=='undefined') G._pendingPanelPlacement=null;
      _qReturnToTavernResponse();
    }else{
      const active=document.querySelector('.screen.active');
      screen=active&&active.id==='scr-battle'?'battle':'village';
      const host=_qMovePresentationHost(screen);
      if(host){
        shade=document.createElement('div');
        shade.className='quest-event-shade';
        host.parentElement.insertBefore(shade,host);
        requestAnimationFrame(()=>shade.classList.add('is-visible'));
      }
    }
    await _qShowPortraitPair(screen,entry,{faceA:'F003'});
    if((data.destroyed1||[]).length) await _qStartDialogue(data.destroyed1,{screen});
    if(portraitB) await _qFadePortraitRed(portraitB);
    if((data.destroyed2||[]).length) await _qStartDialogue(data.destroyed2,{screen});
    if(inTavern){
      await _qLeaveTavernAfterLines();
      return;
    }
    _qRemoveDialogue();
    await _qClearPresentation();
    if(shade){
      shade.classList.remove('is-visible');
      await _qWait(TAVERN_PORTRAIT_FADE_MS);
      shade.remove();
    }
  }finally{
    _qDestroySession=false;
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
  // 立ち絵がこれから出る（まだ見えていない）時に表情を指定されたら、表情も立ち絵と同時に出す。
  // 立ち絵が出てから表情が切り替わって見えないようにする（2026-09-26 利用者指定）。
  const appearing=first||!img.classList.contains('is-visible');
  let appearFace=null;
  if(opts.face&&id==='MC001'){
    const faceName=String(opts.face).match(/^F\d{3}$/)?.[0];
    if(faceName&&!host.querySelector(`.tavern-face[data-face-id="${faceName}"]`)){
      const current=[...host.querySelectorAll('.tavern-face')];
      const face=document.createElement('img');
      face.className='tavern-face';
      face.dataset.faceId=faceName;
      face.alt='';
      face.src=_qPortraitSrc(`assets/art/NPC/${faceName}.webp`);
      face.style.left=`${cfg.x+TAVERN_FACE_CONFIG.x}px`;
      face.style.top=`${cfg.y+TAVERN_FACE_CONFIG.y}px`;
      // 表情は常にフェードインで替える（2026-09-25 利用者指定）。新しい表情を今の表情の上へ重ねてフェードインし、
      // 出きってから前の表情を外す。前の表情は不透明のまま下に残るので、元の顔が透けることもない。
      host.appendChild(face);
      if(appearing){
        // 立ち絵と同じ速さで、立ち絵と同じ瞬間にフェードインする（下の立ち絵の表示でまとめて出す）。
        face.style.setProperty('transition',`opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease`,'important');
        current.forEach(el=>{ try{ el.remove(); }catch(_e){} });
        appearFace=face;
      }else{
      // 画像を展開し終えてから不透明度を上げる（展開前に上げると、展開した瞬間にパッと出る）。
      // 2フレーム待って opacity:0 の状態を一度描かせてから、トランジションを始める。
      const show=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>face.classList.add('is-visible')));
      const ready=typeof face.decode==='function'?face.decode():new Promise(r=>{ face.onload=r; face.onerror=r; });
      Promise.resolve(ready).catch(()=>{}).then(()=>{
        show();
        if(current.length) window.setTimeout(()=>current.forEach(el=>{ try{ el.remove(); }catch(_e){} }),TAVERN_FACE_FADE_MS+300);
      });
      }
    }
  }
  // 大きな立ち絵は、描ける状態（decode）になってからフェードインする。読み込み・展開の前に
  // 不透明度だけ上がると、展開が終わった瞬間にパッと出て見える（塔に着いた時。2026-09-25 利用者指摘）。
  if(typeof img.decode==='function'){ try{ await img.decode(); }catch(_e){} }
  if(appearFace&&typeof appearFace.decode==='function'){ try{ await appearFace.decode(); }catch(_e){} }
  if(appearing){
    requestAnimationFrame(()=>{ img.classList.add('is-visible'); if(appearFace) appearFace.classList.add('is-visible'); });
    await _qWait(TAVERN_PORTRAIT_STEP_MS);
  }
  return img;
}

// 立ち絵は**常にフェードで消す**（2026-09-24 利用者指定）。immediate は画面が暗転している時だけ使う。
async function _qClearPresentation(options){
  _qPendingNamePlate='';
  const host=document.getElementById('tavern-presentation-layer');
  if(!host) return;
  if(options&&options.immediate){ host.remove(); return; }
  // 消える途中の層は id を外し、次に出す立ち絵の層とぶつからないようにする。
  host.removeAttribute('id');
  // 表情の差分は替える時だけゆっくり（TAVERN_FACE_FADE_MS）。消す時は立ち絵と同じ速さで一緒に消す。
  host.querySelectorAll('.tavern-face').forEach(el=>el.style.setProperty('transition',`opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease`,'important'));
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

function _qDrawFrame(bubble,w,h,dark){
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
  poly.setAttribute('fill',dark?'#1b130b':TAVERN_LINE_FRAME_FILL);
  poly.setAttribute('stroke',dark?'#6e4928':TAVERN_LINE_FRAME_STROKE_COLOR);
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
  const dark=!!(line&&line.dark);
  bubble.classList.toggle('is-dark',dark);
  textEl.replaceChildren();
  const orderedChoiceRows=Array.isArray(line.choiceRows)&&line.choiceRows.length
    ?line.choiceRows
    :[
      ...(String(line.note||'').trim()?[{note:String(line.note).trim()}]:[]),
      ...(Array.isArray(line.choices)?line.choices.map((choice,index)=>({choice,index})):[]),
    ];
  if(Array.isArray(line.choices)&&line.choices.length){
    orderedChoiceRows.forEach(row=>{
      if(row&&row.note){
        const note=document.createElement('span');
        note.className='tavern-dialogue-note';
        note.textContent=String(row.note);
        textEl.appendChild(note);
        return;
      }
      const choice=row&&row.choice;
      if(!choice) return;
      const option=document.createElement('span');
      option.className='tavern-dialogue-choice';
      option.dataset.choiceIndex=String(row.index);
      option.tabIndex=0;
      option.setAttribute('role','button');
      option.textContent=choice.text;
      textEl.appendChild(option);
    });
  }else textEl.textContent=raw;
  const rows=Array.isArray(line.choices)&&line.choices.length
    ?orderedChoiceRows.map(row=>row&&row.note?String(row.note):String(row&&row.choice&&row.choice.text||''))
    :raw.split('\n');
  const safeRows=rows.length?rows:[''];
  const h=TAVERN_LINE_PAD_Y*2+safeRows.length*Math.round(TAVERN_LINE_FONT*TAVERN_LINE_LINE_H);
  const cap=_qFrameCap(h);
  const w=Math.max(TAVERN_LINE_MIN_W,Math.ceil(_qMeasureText(textEl,safeRows))+TAVERN_LINE_PAD_X*2+Math.ceil(cap*2));
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
  tail.style.backgroundImage=`url("assets/ui/speechbubble${dark?4:2}.svg")`;
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
  _qDrawFrame(bubble,w,h,dark);
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
  // 酒場で B（依頼人）が最初に喋る時に名前札を出す（_qShowPortraitPair が _qPendingNamePlate に預ける）。
  const namePlateText=_qPendingNamePlate;
  let namePlateIndex=-1;
  const hideNamePlateLater=()=>{
    if(namePlateIndex<0) return;
    namePlateIndex=-2;
    window.setTimeout(_qHideNamePlate,TAVERN_NAME_PLATE_HOLD_MS);
  };
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
    // opts.dark（暗色の吹き出し）は B 側だけに掛ける。A（主人公）はいつもの淡色（speechbubble1/2）。
    _qRenderBubble(bubble,side,{...line,dark:!!line.dark||(!!opts.dark&&side!=='left')});
    if(namePlateText&&namePlateIndex===-1&&side==='right'){
      _qPendingNamePlate='';
      namePlateIndex=index;
      _qShowNamePlate(namePlateText);
    }
    if(typeof opts.onLine==='function') opts.onLine(index,line);
  };
  render();
  return new Promise(resolve=>{
    let finished=false;
    const finish=()=>{
      if(finished) return;
      finished=true;
      _qRemoveDialogue();
      if(typeof opts.onDone==='function') opts.onDone();
      resolve();
    };
    layer.addEventListener('click',event=>{
      if(session!==_qDialogueSession) return;
      event.preventDefault();
      event.stopPropagation();
      const line=list[index];
      if(Array.isArray(line.choices)&&line.choices.length){
        const option=event.target.closest('.tavern-dialogue-choice');
        if(!option) return;
        const choice=line.choices[Number(option.dataset.choiceIndex)];
        if(!choice) return;
        if(index===namePlateIndex) hideNamePlateLater();
        _qRemoveDialogue();
        if(typeof opts.onChoice==='function') opts.onChoice(choice);
        resolve(choice);
        return;
      }
      // 名前札は、それを出した台詞を送ってから1秒待って消す。
      if(index===namePlateIndex) hideNamePlateLater();
      if(index<list.length-1){ index++; render(); return; }
      finish();
    });
    layer.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ') return;
      const option=event.target.closest('.tavern-dialogue-choice');
      if(option){ event.preventDefault(); option.click(); }
    });
    if(opts.autoCloseMs>0) window.setTimeout(()=>{
      if(session===_qDialogueSession) finish();
    },opts.autoCloseMs);
  });
}

// A（MC001）→ B（クエストごとの立ち絵）の順にフェードインで出す。faceA を渡すと A は最初からその表情。
async function _qShowPortraitPair(screen,entry,options){
  const opts=options||{};
  await _qClearPresentation();
  _qMovePresentationHost(screen);
  await showTavernPortrait('MC001',{screen,face:opts.faceA});
  const portraitB=opts.withoutB?'':(opts.portraitB||_qConfig(entry).portraitB);
  if(portraitB) await showTavernPortrait(portraitB,{screen});
  // 酒場で B が出ている時は、次の会話で B が最初に喋る時に名前札を出す（クエストシート「キャラクターの名前」）。
  const name=portraitB&&G&&G._isTavern&&!opts.withoutNamePlate
    ?String((_qQuestData(entry.tavernVariant)||{}).characterName||'').trim():'';
  _qPendingNamePlate=name;
}

// ── 依頼人の名前札（2026-09-26 利用者指定）────────────────────
// main_line.svg を高さ30px（930×30）で X2370・Y1765 に置き、その上に名前を中央揃えで出す。
// 「奇妙な少女 ファラ」のように空白があれば、空白の前を小さく、後を大きく。文字と線には
// 戦闘開始の文字と同じドロップシャドウを付ける。フェードイン／フェードアウト。
const TAVERN_NAME_PLATE={x:2370,y:1765,lineW:930,lineH:30};
// 名前札の線の色。名前の文字色（#f7efdf）を中央に、両端を金色寄りに落とす。
const TAVERN_NAME_LINE_GRADIENT='linear-gradient(90deg,#9c7a45 0%,#f7efdf 38%,#f7efdf 62%,#9c7a45 100%)';
const TAVERN_NAME_PLATE_HOLD_MS=1000;   // 名前札を出した台詞を送ってから消し始めるまで
let _qPendingNamePlate='';
function _qShowNamePlate(text){
  const host=document.getElementById('tavern-presentation-layer');
  if(!host||!text) return;
  _qHideNamePlate(true);
  const m=String(text).match(/^(.*?)[ 　]+(.+)$/);
  const plate=document.createElement('div');
  plate.className='tavern-name-plate';
  plate.innerHTML='<div class="tavern-name-text"></div><div class="tavern-name-line"><div class="tavern-name-line-fill"></div></div>';
  const t=plate.querySelector('.tavern-name-text');
  if(m){
    const sub=document.createElement('span'); sub.className='tavern-name-sub'; sub.textContent=m[1];
    const main=document.createElement('span'); main.className='tavern-name-main'; main.textContent=m[2];
    t.append(sub,main);
  }else{
    const main=document.createElement('span'); main.className='tavern-name-main'; main.textContent=String(text);
    t.append(main);
  }
  host.appendChild(plate);
  requestAnimationFrame(()=>requestAnimationFrame(()=>plate.classList.add('is-visible')));
}
function _qHideNamePlate(immediate){
  document.querySelectorAll('.tavern-name-plate').forEach(plate=>{
    if(immediate===true){ plate.remove(); return; }
    plate.classList.remove('is-visible');
    window.setTimeout(()=>{ try{ plate.remove(); }catch(_e){} },TAVERN_PORTRAIT_FADE_MS+50);
  });
}

// ── Q004「魔獣撃退依頼」──────────────────────────────────────
// 対象戦闘の判定・敵編成の入口はここで共通化し、battle.js はこのフックを呼ぶだけにする。
// 戦闘効果そのものは通常どおり core.js が解決する。
function _qEncounterTargetMatches(entry,wave,stage){
  const target=entry&&entry.encounterTarget;
  return !!(target&&Number(target.wave)===Number(wave)&&Number(target.stage)===Number(stage));
}

function _qQuestEnemyDef(code){
  const key=String(code||'').toUpperCase();
  const pool=typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[];
  return pool.find(def=>String(def&&(def.artCode||def._artCode||def.No||def.no||def['No.']||def.code||'')).toUpperCase()===key)||null;
}

function _qIsQuestBattleNode(nodeId){
  return String(nodeId||'')==='quest-garm';
}

function questIsMagicWolfBattle(){
  const entry=_qActiveEntry();
  const game=typeof G!=='undefined'&&G?G:null;
  return !!(entry&&_qConfig(entry).encounterTargets&&entry.status==='accepted'
    &&entry.encounterPhase==='wolf'
    &&_qEncounterTargetMatches(entry,game&&game._wave,game&&game._waveStage)
    &&String(game&&game._waveBattleType||'')==='battle'
    &&!_qIsQuestBattleNode(game&&game._mapBattle&&game._mapBattle.nodeId));
}

function questIsGarmBattle(){
  const entry=_qActiveEntry();
  const game=typeof G!=='undefined'&&G?G:null;
  return !!(entry&&_qConfig(entry).encounterTargets&&entry.status==='accepted'
    &&['garm','garmFled'].includes(String(entry.encounterPhase||''))
    &&_qEncounterTargetMatches(entry,game&&game._wave,game&&game._waveStage)
    &&_qIsQuestBattleNode(game&&game._mapBattle&&game._mapBattle.nodeId));
}

function questBattleEnemyFled(events,findUnit){
  if(!questIsGarmBattle()) return false;
  const entry=_qActiveEntry();
  let found=false;
  (events||[]).forEach(event=>{
    if(!event||event.side!=='p2'||event.type!=='fled') return;
    const unit=typeof findUnit==='function'?findUnit(event.side,event.unitId):null;
    const code=String(unit&&(unit.artCode||unit._artCode)||'').toUpperCase();
    if(unit&&(unit._questGarm||code==='EN027')) found=true;
  });
  if(found){
    entry.encounterFled=true;
    entry.encounterPhase='garmFled';
  }
  return found;
}

function questReplaceMagicWolfEnemies(enemies){
  if(!questIsMagicWolfBattle()||!Array.isArray(enemies)) return 0;
  const def=_qQuestEnemyDef('EN020');
  if(!def||typeof _mkEnemy!=='function') return 0;
  const indexes=enemies.map((unit,index)=>({unit,index})).filter(item=>item.unit)
    .sort((a,b)=>{
      const al=String(a.unit.lane||'front')==='front'?0:1;
      const bl=String(b.unit.lane||'front')==='front'?0:1;
      return al-bl||a.index-b.index;
    }).slice(0,3);
  indexes.forEach(({unit})=>{
    const old={
      id:unit.id,lane:unit.lane,visualShift:unit._visualShift,
      atk:Math.max(1,Number(unit.atk)||1),hp:Math.max(1,Number(unit.hp)||1),
      maxHp:Math.max(1,Number(unit.maxHp)||Number(unit.hp)||1),
    };
    const next=_mkEnemy(old.atk,old.hp,def.name,def.icon,def.grade||1,
      typeof _kwShield==='function'?_kwShield(def):0,[...(def.keywords||[])],def.race||'-');
    if(typeof _applyEnemyDefAbilities==='function') _applyEnemyDefAbilities(next,def);
    next.id=old.id;
    next.lane=old.lane||'front';
    next._visualShift=old.visualShift;
    next.atk=old.atk;
    next.baseAtk=old.atk;
    next.hp=old.hp;
    next.maxHp=old.maxHp;
    next._questMagicWolf=true;
    next._questEnemyCode='EN020';
    Object.keys(unit).forEach(key=>{ if(!(key in next)) delete unit[key]; });
    Object.assign(unit,next);
  });
  return indexes.length;
}

// 闘技場のcarry判定と同じ意味で使う。Garm戦は、魔狼戦の直後の味方盤面を初期化しない。
function questBattleCarryActive(){ return questIsGarmBattle(); }

function questBattleStartSpec(stage){
  const entry=_qActiveEntry();
  const game=typeof G!=='undefined'&&G?G:null;
  if(!entry||!_qConfig(entry).encounterTargets||!['garm','garmFled'].includes(String(entry.encounterPhase||''))) return null;
  if(!_qEncounterTargetMatches(entry,game&&game._wave,stage)) return null;
  const floor=typeof _waveStageFloor==='function'?_waveStageFloor(2,3):Number(game&&game.floor)||1;
  return {type:'battle',nodeId:'quest-garm',floor,forcedBoss:false};
}

function _qMakeBattleShade(){
  const host=_qMovePresentationHost('battle');
  if(!host||!host.parentElement) return null;
  const shade=document.createElement('div');
  shade.className='quest-event-shade';
  // 戦闘画面では背景・盤面の層が暗幕（z115）より手前にあり、暗くならなかった（2026-09-25）。
  // 立ち絵の層の中の一番奥へ置き、立ち絵より奥・戦闘画面の全てより手前にする。
  host.insertBefore(shade,host.firstChild);
  // 立ち絵より奥にする（暗幕の z-index:115 のままだと、同じ層の立ち絵の上に重なっていた。2026-09-25 利用者指摘）。
  shade.style.setProperty('z-index','0','important');
  requestAnimationFrame(()=>shade.classList.add('is-visible'));
  return shade;
}

async function _qClearBattleShade(shade){
  if(!shade) return;
  shade.classList.remove('is-visible');
  await _qWait(TAVERN_PORTRAIT_FADE_MS);
  shade.remove();
}

async function _qFinishMagicWolfEscape(entry,shade){
  _qMarkFailed(entry);
  // 立ち絵・暗幕は暗転の中で消す。先に消すと、暗転までの間に戦闘画面が一瞬見えて乱れていた（2026-09-25 利用者指摘）。
  await fadeScreenSwitch(()=>{
    _qRemoveDialogue();
    void _qClearPresentation({immediate:true});
    if(shade) shade.remove();
    document.body.classList.remove('battle-victory-pending','battle-turn-active');
    G._battleVictoryPending=false;
    G._battlePhaseRunning=false;
    if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
    if(typeof finishWaveBattleVictory==='function') finishWaveBattleVictory(false);
    if(typeof goToReward==='function') goToReward({checkpoint:true});
  });
}

async function _qPlayMagicWolfEncounter(entry){
  const data=_qQuestData(entry.tavernVariant)||{};
  // 魔狼に出会った時、A は最初から F004（2026-09-26 利用者指定）。
  await _qShowPortraitPair('battle',entry,{withoutB:true,faceA:'F004'});
  const shade=_qMakeBattleShade();
  if((data.progress1||[]).length) await _qStartDialogue(data.progress1,{screen:'battle',dark:true});
  const lines=Array.isArray(data.progress2)?data.progress2:[];
  let choice=null;
  if(lines.length){
    const prompt=lines[lines.length-1];
    choice=await _qStartDialogue([
      ...lines.slice(0,-1),
      _qChoiceLine(prompt),
    ],{screen:'battle',dark:true});
  }
  if(choice&&String(choice.text||'').includes('魔狼に挑む')){
    entry.encounterPhase='garm';
    entry.encounterFled=false;
    _qRemoveDialogue();
    await _qClearPresentation({immediate:true});
    if(shade) shade.remove();
    G._battleVictoryPending=false;
    G._battlePhaseRunning=false;
    // main.js の通常戦闘入口が questBattleStartSpec() を読み、Garm編成を選ぶ。
    if(typeof _startWaveBattle==='function') _startWaveBattle(Number(G._waveStage)||1);
    return;
  }
  if((data.progress3||[]).length) await _qStartDialogue(data.progress3,{screen:'battle',dark:true});
  await _qFinishMagicWolfEscape(entry,shade);
}

function questHandleMagicWolfVictory(){
  if(!questIsMagicWolfBattle()||G._battleDraw) return false;
  const entry=_qActiveEntry();
  entry.encounterPhase='choice';
  // 魔狼の会話の間はデバッグ用のボタンを出さない（闘技場の継戦確認と同じ。render.js debugButtonsSuppressed）。
  if(typeof _arenaHideDebugButtons==='function') _arenaHideDebugButtons();
  G._battleVictoryPending=true;
  G._battlePhaseRunning=false;
  G.phase='reward';
  document.body.classList.add('battle-victory-pending');
  document.body.classList.remove('battle-turn-active');
  updateHUD();
  void _qPlayMagicWolfEncounter(entry);
  return true;
}

async function _qShowGarmCamp(entry,escaped){
  const data=_qQuestData(entry.towerVariant)||{};
  const reward=Math.max(0,Number(data.rewardGold)||0);
  const lines=escaped
    ?[...(data.specialRejected1||[]),...(data.specialRejected2||[])]
    :(data.initial||[]);
  // continueAfterBattleVictory() が作った暗幕を、camp の切り替えが終わるまで保持する。
  // camp は酒場と同じく街の画面の形（背景だけ＋立ち絵＋所持金・ライフ）で見せる。
  // 編成画面の上に camp を重ねると、報酬欄・魔導板の枠が暗く透けて見えていた（2026-09-25）。
  await fadeScreenSwitch(()=>{
    document.body.classList.remove('battle-victory-pending','battle-turn-active','reward-screen-active','facility-bg-active');
    G.phase='reward';
    G._questCampScene=true;
    // 討伐後の camp と、その後の編成画面では BGM を流さず環境音だけにする（2026-09-25 利用者指定）。
    // 次の画面（マップ・戦闘・街）へ移る時に main.js showScreen() が解除する。
    G._questNoBgm=true;
    if(typeof stopBgm==='function') stopBgm(600);
    _qEnsureStyle();
    document.body.classList.add('tavern-tower-event-active','quest-camp-scene');
    if(typeof showScreen==='function') showScreen('village');
    if(typeof renderVillageScreen==='function') renderVillageScreen();
    if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('village');
    if(typeof _syncStageAmbience==='function') _syncStageAmbience();
    const transitionFade=document.getElementById('battle-transition-fade');
    if(transitionFade) transitionFade.classList.remove('is-visible');
    G._battleFadeHeldByCaller=false;
  });
  await _qShowPortraitPair('village',entry);
  const rewardIndex=escaped?1:0;
  await _qStartDialogue(lines,{screen:'village',onLine:index=>{
    if(index!==rewardIndex||entry.encounterRewardGiven) return;
    entry.encounterRewardGiven=true;
    if(reward&&typeof gainEventGold==='function') gainEventGold(reward);
    if(typeof updateHUD==='function') updateHUD();
  }});
  entry.status='completed';
  entry.towerEventDone=true;
  entry.towerEventStarted=true;
  entry.encounterPhase='done';
  entry.description='';
  _qRemoveDialogue();
  await fadeScreenSwitch(()=>{
    void _qClearPresentation({immediate:true});
    G._questCampScene=false;
    document.body.classList.remove('tavern-tower-event-active','quest-camp-scene','village-screen-active');
    if(typeof showScreen==='function') showScreen('battle');
    if(typeof finishWaveBattleVictory==='function') finishWaveBattleVictory(false);
    if(typeof goToReward==='function') goToReward({checkpoint:true});
  });
}

function questHandleBattleVictory(){
  if(!questIsGarmBattle()||G._battleDraw) return false;
  const entry=_qActiveEntry();
  const escaped=!!entry.encounterFled;
  entry.encounterPhase='camp';
  G._battleVictoryPending=true;
  G._battlePhaseRunning=false;
  G.phase='reward';
  document.body.classList.add('battle-victory-pending');
  document.body.classList.remove('battle-turn-active');
  updateHUD();
  showVictoryOverlay(()=>{
    const ov=document.getElementById('victory-overlay');
    if(ov) ov.style.display='none';
    _cleanupBattleEndTransientUnits();
    G._battleFadeHeldByCaller=true;
    void _qShowGarmCamp(entry,escaped);
  });
  return true;
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
  const context=_qFormationContext;
  const entry=context&&context.entry?_qFormationContext.entry:_qEntry();
  const delivery=!!(context&&context.mode==='delivery');
  if(delivery){
    const hasOffer=typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)&&_rewCards.some(Boolean);
    button.disabled=!!G._pendingPanelPlacement;
    button.classList.toggle('disabled',!!button.disabled);
    button.innerHTML=`<span class="rew-btn-label">${_qText(hasOffer?'「渡す」ボタン':'「渡さない」ボタン',hasOffer?'渡す':'渡さない')}</span>`;
    button.onclick=()=>{
      if(button.disabled||G._pendingPanelPlacement) return;
      void _qSubmitTownDelivery(entry);
    };
    const extra=document.getElementById('map-village-extra-btn');
    if(extra) extra.style.setProperty('display','none','important');
    return;
  }
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

function _qOpenTavernFormation(options){
  const opts=options&&options.mode?options:{};
  const entry=opts.entry||_qEntry();
  if(!entry) return;
  _qFormationContext={mode:opts.mode||'accept',entry,shade:opts.shade||null};
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
  const card=opts.mode==='delivery'||_qHasRequiredOnBoard(entry)?null:_qMakeRequiredCard(entry);
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

// シートの「台詞4」に含まれる「・」行だけを押せる選択肢にする。
// 括弧書きなどの説明行は note として同じ吹き出し内に残す。
function _qChoiceLine(line){
  const rows=String(line&&line.text||'').split('\n').map(row=>row.trim()).filter(Boolean);
  let choiceIndex=0;
  const choiceRows=rows.map(row=>row.startsWith('・')
    ?{choice:{text:row},index:choiceIndex++}
    :{note:row});
  const choices=choiceRows.filter(row=>row.choice).map(row=>row.choice);
  const note=rows.filter(row=>!row.startsWith('・')).join('\n');
  return {...line,choices,note,choiceRows};
}

// promptOnly：断った後の再訪では、拒否後台詞のあとに選択肢（台詞4）だけを出す（台詞1〜3は繰り返さない）。
async function _qRunDirectTavernChoice(entry,data,promptOnly){
  const lines=Array.isArray(data&&data.initial)?data.initial:[];
  if(!lines.length){ _qRejectTavernQuest(); return; }
  const prompt=lines[lines.length-1];
  const choice=await _qStartDialogue([
    ...(promptOnly?[]:lines.slice(0,-1)),
    _qChoiceLine(prompt),
  ],{screen:'village'});
  if(!choice) return;
  if(String(choice.text||'').includes('受ける')) _qAcceptTavernQuest();
  else _qRejectTavernQuest();
}

function _qAssignRewardMix(entry){
  const cfg=_qConfig(entry).rewardMix;
  if(!cfg||entry.rewardMixAssigned) return;
  const fromWave=Math.max(1,Number(G&&G._wave)||Number(entry.wave)||1);
  const fromStage=Math.max(0,Number(G&&G._waveStage)||0);
  const arrivalWave=Math.max(fromWave,Number(cfg.arrivalWave)||fromWave);
  const candidates=[];
  for(let wave=fromWave;wave<=arrivalWave;wave++){
    const route=typeof _waveRouteForWave==='function'?(_waveRouteForWave(wave)||[]):[];
    const cityStage=wave===arrivalWave?route.indexOf('city')+1:0;
    const first=wave===fromWave?fromStage+1:1;
    const last=cityStage>0?cityStage-1:route.length;
    for(let stage=first;stage<=last;stage++){
      if(['battle','elite','boss'].includes(String(route[stage-1]||''))) candidates.push({wave,stage,used:false});
    }
  }
  const choose=()=>{
    const shuffled=candidates.map(x=>({...x}));
    for(let i=shuffled.length-1;i>0;i--){
      const j=Math.floor(rand()*(i+1));
      [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
    }
    return shuffled.slice(0,Math.min(Math.max(0,Number(cfg.count)||0),shuffled.length));
  };
  entry.rewardMixTargets=typeof runWithKeyedRandom==='function'
    ?runWithKeyedRandom(`quest:${entry.questId}:reward-mix-targets:${fromWave}:${fromStage}:${arrivalWave}`,choose):choose();
  entry.rewardMixAssigned=true;
  entry.rewardMixRemaining=entry.rewardMixTargets.length;
}

// 通常報酬の生成直後に呼ぶ。選定済みの戦闘だけ、通常候補1枚を荷物カード1枚へ置き換える。
function questMixBattleRewards(cards){
  const list=Array.isArray(cards)?cards.slice():[];
  const entry=_qActiveEntry();
  const cfg=entry&&_qConfig(entry).rewardMix;
  if(!entry||entry.status!=='accepted'||!cfg) return list;
  const target=(entry.rewardMixTargets||[]).find(x=>x&&!x.used
    &&Number(x.wave)===Number(G&&G._wave)&&Number(x.stage)===Number(G&&G._waveStage));
  if(!target) return list;
  const wanted=String(cfg.cardNo||'').toUpperCase();
  const def=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(card=>_qCardNo(card)===wanted):null;
  const mixed=def&&typeof makePanel==='function'?makePanel(def.id||def.name):null;
  if(!mixed) return list;
  let slot=0;
  if(list.length){
    const pick=()=>Math.min(list.length-1,Math.floor(rand()*list.length));
    slot=typeof runWithKeyedRandom==='function'
      ?runWithKeyedRandom(`quest:${entry.questId}:reward-mix:${target.wave}:${target.stage}`,pick):pick();
    if(list[slot]&&typeof returnPanelToSalePool==='function') returnPanelToSalePool(list[slot]);
    list[slot]=mixed;
  }else list.push(mixed);
  target.used=true;
  entry.rewardMixRemaining=(entry.rewardMixTargets||[]).filter(x=>x&&!x.used).length;
  return list;
}

function _qAssignEncounter(entry){
  const cfg=_qConfig(entry);
  const targets=Array.isArray(cfg.encounterTargets)?cfg.encounterTargets:[];
  if(!targets.length||entry.encounterTarget) return;
  const chosen=typeof runKeyedPick==='function'
    ?runKeyedPick(`quest:${entry.questId}:encounter-target`,targets)
    :targets[0];
  entry.encounterTarget=chosen?{wave:Number(chosen.wave),stage:Number(chosen.stage)}:null;
  entry.encounterPhase='wolf';
  entry.encounterFled=false;
}

function _qReturnToTavernResponse(){
  _qShowTavernVillage();
  _qMovePresentationHost('village');
}

function _qAcceptTavernQuest(){
  const entry=_qFormationContext&&_qFormationContext.mode==='accept'?_qFormationContext.entry:_qEntry();
  if(!entry||_qDestroySession||entry.status==='killed'||!_qHasRequiredOnBoard(entry)) return;
  _qFormationContext=null;
  entry.status='accepted';
  entry.rewardCardTaken=true;
  entry.partedPending=false;
  entry.towerEventDone=false;
  _qAssignRewardMix(entry);
  _qAssignEncounter(entry);
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  _qReturnToTavernResponse();
  const data=_qQuestData(entry.tavernVariant)||{};
  _qStartDialogue(data.accepted,{screen:'village',onDone:_qLeaveTavernAfterLines});
}

function _qRejectTavernQuest(){
  const entry=_qFormationContext&&_qFormationContext.mode==='accept'?_qFormationContext.entry:_qEntry();
  if(!entry||_qDestroySession||entry.status==='killed') return;
  _qFormationContext=null;
  // 依頼カードにアイテムで永久強化を与えたまま拒否した時は特殊拒否。
  // 特殊拒否台詞1→2と進んで酒場を出る。以後、依頼は受けられない（再訪時は特殊拒否後台詞だけ）。
  const data=_qQuestData(entry.tavernVariant)||{};
  const special=_qRequiredCardBuffed(entry)
    &&((data.specialRejected1||[]).length||(data.specialRejected2||[]).length);
  entry.status=special?'rejectedSpecial':'rejected';
  entry.rewardCardTaken=false;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  _qReturnToTavernResponse();
  syncQuestFormationUi();
  if(special){
    // 特殊拒否台詞1の間は A を F003、特殊拒否台詞2を出し終わったら F002 にしてから酒場を出る（2026-09-25 利用者指定）。
    void showTavernPortrait('MC001',{screen:'village',face:'F003'});
    _qStartDialogue([...(data.specialRejected1||[]),...(data.specialRejected2||[])],{screen:'village',onDone:async()=>{
      await showTavernPortrait('MC001',{screen:'village',face:'F002'});
      await _qWait(TAVERN_FACE_FADE_MS);
      _qLeaveTavernAfterLines();
    }});
    return;
  }
  // 拒否した時の表情はクエスト設定で指定する。Q003は従来どおりF003、Q004はF004。
  void showTavernPortrait('MC001',{screen:'village',face:_qConfig(entry).rejectFace||'F003'});
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
  _qFormationContext=null;
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
    if(_qConfig(entry).noFailureRevisit) return;
    await _qShowPortraitPair('village',entry,{faceA:'F003'});
    _qStartDialogue(data.failedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 戦闘以外で破壊した後に入ると、非戦闘時死亡後台詞を出して酒場を出る。相手はもういないので A（F003）だけ出す。
  if(entry.status==='killed'){
    await _qShowPortraitPair('village',entry,{withoutB:true,faceA:'F003'});
    _qStartDialogue(data.destroyedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 特殊拒否の後に入ると、特殊拒否後台詞を出して酒場を出る。相手はもう出発しているので A だけ出す。
  if(entry.status==='rejectedSpecial'){
    await _qShowPortraitPair('village',entry,{withoutB:true});
    _qStartDialogue(data.specialRejectedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  if(_qHasDirectChoice(entry)&&entry.status==='rejected'){
    await _qShowPortraitPair('village',entry);
    await _qStartDialogue(data.rejectedAfter,{screen:'village'});
    await _qRunDirectTavernChoice(entry,data,true);
    return;
  }
  await _qShowPortraitPair('village',entry);
  if(entry.status==='accepted'){
    // 受託後台詞の表情はクエスト設定で指定する（Q003だけ従来どおりF005）。
    const lastIdx=(data.acceptedAfter||[]).length-1;
    const acceptedFace=_qConfig(entry).acceptedFace||'';
    _qStartDialogue(data.acceptedAfter,{screen:'village',
      onLine:index=>{ if(acceptedFace&&index===lastIdx) void showTavernPortrait('MC001',{screen:'village',face:acceptedFace}); },
      onDone:_qLeaveTavernAfterLines});
  }else if(entry.status==='rejected'){
    _qStartDialogue(data.rejectedAfter,{screen:'village',onDone:_qOpenTavernFormation});
  }else if(_qHasDirectChoice(entry)){
    await _qRunDirectTavernChoice(entry,data);
  }else{
    _qStartDialogue(data.initial,{screen:'village',onDone:_qOpenTavernFormation});
  }
}

// Q002の受け渡し編成中、魔導板から報酬枠へ移したカードへ元の位置を記録する。
// reward.js が複製する直前に呼ぶため、返却対象にも同じ印が引き継がれる。
function questMarkDeliveryOffer(card,source){
  if(!_qFormationContext||_qFormationContext.mode!=='delivery'||!card||!source) return false;
  if(!['boardCards','spellSlots'].includes(String(source.arr||''))) return false;
  card._questDeliveryOrigin={arr:String(source.arr),idx:Number(source.idx)};
  return true;
}

function _qCleanDeliveryCard(card){
  const copyCard=typeof clone==='function'?clone(card):JSON.parse(JSON.stringify(card));
  ['_questDeliveryOrigin','_temporaryRewardAreaCard','_isOriginalReward','_rewardReturnCard',
    '_rewardReturnIdx','_rewardReturnPhaseId','_shopSalePending','_sellDisplayPrice'].forEach(key=>delete copyCard[key]);
  return copyCard;
}

function _qRestoreDeliveryCards(cards){
  (cards||[]).forEach(card=>{
    if(!card) return;
    const origin=card._questDeliveryOrigin||{};
    const returned=_qCleanDeliveryCard(card);
    if(origin.arr==='spellSlots'){
      const slots=G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:[];
      let idx=Number.isInteger(origin.idx)&&origin.idx>=0&&!slots[origin.idx]?origin.idx:slots.findIndex(x=>!x);
      if(idx<0) idx=slots.length;
      slots[idx]=returned;
      return;
    }
    const board=G.mainBoard=Array.isArray(G.mainBoard)?G.mainBoard:[];
    let idx=Number.isInteger(origin.idx)&&origin.idx>=0&&!board[origin.idx]?origin.idx:board.findIndex(x=>!x);
    if(idx<0) idx=board.length;
    board[idx]=returned;
  });
  G._partyBoardUnit=null;
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
}

function _qDeliveryGold(data,count,cfg){
  const sheet=data&&data.rewardGoldByCount||{};
  const fallback=cfg&&cfg.fallbackGoldByCount||{};
  return Math.max(0,Number(sheet[count]??sheet[String(count)]??fallback[count]??fallback[String(count)])||0);
}

function _qReplaceCount(lines,count){
  return (lines||[]).map(line=>({...line,text:String(line.text||'').replace(/X/g,String(count))}));
}

function _qShowTownEventScreen(){
  G._isTavern=false;
  G._isVillageMenu=true;
  G._isWaveAltar=false;
  G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false;
  G._facilityLabel='';
  G.phase='reward';
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground(null);
  document.body.classList.remove('reward-screen-active','tavern-screen-active','tavern-village-active','facility-bg-active');
  document.body.classList.add('village-screen-active','quest-town-event-active');
  if(typeof showScreen==='function') showScreen('village');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  _qMovePresentationHost('village');
  syncQuestFormationUi();
}

async function _qFinishTownArrival(entry,shade){
  [G&&G.mainBoard,G&&G.spellSlots,G&&G.globalPanels].forEach(list=>{
    if(Array.isArray(list)) list.forEach(card=>{ if(card) delete card._questDeliveryOrigin; });
  });
  entry.status='completed';
  entry.townEventDone=true;
  entry.towerEventDone=true;
  entry.description='';
  _qRemoveDialogue();
  await _qClearPresentation();
  if(shade){
    shade.classList.remove('is-visible');
    await _qWait(TAVERN_PORTRAIT_FADE_MS);
    shade.remove();
  }
  document.body.classList.remove('quest-town-event-active','tavern-screen-active','reward-screen-active','facility-bg-active');
  document.body.classList.add('village-screen-active');
  G._isTavern=false;
  G._isVillageMenu=true;
  G._facilityLabel='';
  if(typeof _applyFacilityBackground==='function') _applyFacilityBackground(null);
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  syncQuestFormationUi();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  _qTownSession=false;
}

async function _qSubmitTownDelivery(entry){
  const context=_qFormationContext;
  if(!entry||!context||context.mode!=='delivery'||context.submitting) return;
  context.submitting=true;
  const offered=(typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)?_rewCards:[]).filter(Boolean);
  const lost=offered.filter(card=>_qCardNo(card)===String(_qConfig(entry).rewardMix&&_qConfig(entry).rewardMix.cardNo||'').toUpperCase());
  const other=offered.filter(card=>!lost.includes(card));
  if(lost.length&&other.length) _qRestoreDeliveryCards(other);
  if(typeof _rewCards!=='undefined') _rewCards=[];
  const shade=context.shade||null;
  _qFormationContext=null;
  _qRemoveDialogue();
  _qShowTownEventScreen();
  const data=_qQuestData(entry.towerVariant)||{};
  const cfg=_qConfig(entry).townArrival||{};
  let lines=[];
  let rewardLine=-1;
  let faceLine=-1;
  let initialFace='';
  if(!offered.length){
    lines=[...(data.specialA1||[]),...(data.specialA2||[])];
    initialFace='F003';
  }else if(lost.length&&!other.length){
    lines=_qReplaceCount((data.initial||[]).slice(2,3),lost.length);
    rewardLine=0;
  }else if(lost.length&&other.length){
    lines=_qReplaceCount([...(data.specialB1||[]),...(data.specialB2||[])],lost.length);
    rewardLine=Math.max(0,(data.specialB1||[]).length);
  }else{
    lines=[...(data.specialC1||[]),...(data.specialC2||[]),...(data.specialC3||[])];
    faceLine=(data.specialC1||[]).length;
  }
  if(initialFace) await showTavernPortrait('MC001',{screen:'village',face:initialFace});
  let rewarded=false;
  await _qStartDialogue(lines,{screen:'village',onLine:index=>{
    if(faceLine>=0&&index===faceLine) void showTavernPortrait('MC001',{screen:'village',face:'F005'});
    if(index!==rewardLine||rewarded||!lost.length) return;
    rewarded=true;
    const gold=_qDeliveryGold(data,lost.length,cfg);
    entry.townRewardGiven=true;
    if(gold&&typeof gainEventGold==='function') gainEventGold(gold);
    if(typeof updateHUD==='function') updateHUD();
  }});
  await _qFinishTownArrival(entry,shade);
}

function _qTownArrivalEntry(){
  const entry=_qActiveEntry();
  const cfg=entry&&_qConfig(entry).townArrival;
  if(_qTownSession||!entry||!cfg||entry.townEventDone||!G||G._isWaveAltar) return null;
  if(Number(G._wave)!==Number(cfg.wave)) return null;
  if(typeof waveStageRouteType==='function'&&waveStageRouteType(G._wave,G._waveStage)!=='city') return null;
  return entry;
}

function questPrepareTownArrival(){
  const entry=_qTownArrivalEntry();
  if(!entry) return false;
  const portraitB=_qConfig(entry).townArrival&&_qConfig(entry).townArrival.portraitB;
  ['MC001',portraitB].filter(Boolean).forEach(id=>{
    const cfg=TAVERN_PORTRAIT_CONFIG[id];
    if(!cfg) return;
    const pre=new Image();
    pre.src=_qPortraitSrc(cfg.src);
    if(typeof pre.decode==='function') pre.decode().catch(()=>{});
  });
  _qEnsureStyle();
  document.body.classList.add('quest-town-event-active');
  return true;
}

async function maybeStartQuestTownArrival(){
  const entry=_qTownArrivalEntry();
  if(!entry) return false;
  _qTownSession=true;
  entry.townEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('quest-town-event-active');
  const screen=_qPresentationScreen('village');
  const shade=document.createElement('div');
  shade.className='quest-event-shade';
  if(screen) screen.appendChild(shade);
  requestAnimationFrame(()=>shade.classList.add('is-visible'));
  const portraitB=_qConfig(entry).townArrival&&_qConfig(entry).townArrival.portraitB;
  await _qShowPortraitPair('village',entry,{portraitB,withoutNamePlate:true});
  const data=_qQuestData(entry.towerVariant)||{};
  await _qStartDialogue((data.initial||[]).slice(0,2),{screen:'village'});
  _qOpenTavernFormation({mode:'delivery',entry,shade});
  return true;
}

async function _qFinishTowerArrival(entry){
  if(!entry) return;
  // クエスト完了（クエスト枠の文が消える時）に、必須カード（ファラ）とも別れる（2026-09-25 利用者指定）。
  _qRemoveRequiredCards(entry);
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

// この塔で到着の会話が始まるか（クエストを受けた街の塔に、受託中で着いた時）。
function _qTowerArrivalEntry(){
  const entry=_qActiveEntry();
  if(_qTowerSession||!entry||!G||!G._isWaveAltar||Number(G._wave)!==Number(entry.wave)) return null;
  // 魔獣撃退依頼（Q004）の「_2」は塔ではなく討伐後の camp で出す（塔で始まっていた。2026-09-25 利用者指摘）。
  if(_qConfig(entry).encounterTargets) return null;
  return entry;
}
// 塔に入る前（地名表示の前）に呼ぶ。会話が始まる塔なら、施設ボタン・出発ボタンを最初から隠す。
// 以前は地名表示の後にボタンが一瞬出てから会話で隠れていた（2026-09-25 利用者指摘）。
function questPrepareTowerArrival(){
  const entry=_qTowerArrivalEntry();
  if(!entry) return false;
  // 地名表示の間に立ち絵を読み込み・展開しておく（着いてからだと展開待ちで遅れて急に出る）。
  ['MC001',_qConfig(entry).portraitB].filter(Boolean).forEach(id=>{
    const cfg=TAVERN_PORTRAIT_CONFIG[id];
    if(!cfg) return;
    const pre=new Image();
    pre.src=_qPortraitSrc(cfg.src);
    if(typeof pre.decode==='function') pre.decode().catch(()=>{});
  });
  _qEnsureStyle();
  document.body.classList.add('tavern-tower-event-active');
  return true;
}

// クエストを受けた街の塔に着いた時（地名表示の後）、「_2」の会話を始める。
async function maybeStartQ009TowerArrival(){
  const entry=_qTowerArrivalEntry();
  if(!entry) return;
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
    // 「+100」と数え上げは共通の所持金演出（gold_fx.js）、音はイベント収入の共通処理が鳴らす。
    if(reward&&typeof gainEventGold==='function') gainEventGold(reward);
    if(typeof updateHUD==='function') updateHUD();
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('tower');
  },onDone:()=>_qFinishTowerArrival(entry)});
}

if(typeof window!=='undefined'){
  window.showTavernPortrait=showTavernPortrait;
  window.openTavern=openTavern;
  window.questTavernAvailable=questTavernAvailable;
  window.questTavernCompleted=questTavernCompleted;
  window.questDebugForceWaveQuest=questDebugForceWaveQuest;
  window.questGarmPreviewStats=questGarmPreviewStats;
  window.syncQuestFormationUi=syncQuestFormationUi;
  window.syncTavernFormationControls=syncTavernFormationControls;
  window.checkQ009CompanionPresence=checkQ009CompanionPresence;
  window.onTavernQuestRewardCardTaken=onTavernQuestRewardCardTaken;
  window.questMixBattleRewards=questMixBattleRewards;
  window.questMarkDeliveryOffer=questMarkDeliveryOffer;
  window.maybeStartQuestTownArrival=maybeStartQuestTownArrival;
  window.questPrepareTownArrival=questPrepareTownArrival;
  window.maybeStartQ009TowerArrival=maybeStartQ009TowerArrival;
  window.questPrepareTowerArrival=questPrepareTowerArrival;
  window.questRequiredEntryOnBoard=questRequiredEntryOnBoard;
  window.questOnRequiredCardDestroyed=questOnRequiredCardDestroyed;
  window.questRequiredCardGone=questRequiredCardGone;
  window.questRequiredCardFor=questRequiredCardFor;
  window.questCardPartable=questCardPartable;
  window.questPartWithCard=questPartWithCard;
  window.questGuardLeave=questGuardLeave;
  window.questBattleCardLine=questBattleCardLine;
  window.questIsMagicWolfBattle=questIsMagicWolfBattle;
  window.questIsGarmBattle=questIsGarmBattle;
  window.questBattleCarryActive=questBattleCarryActive;
  window.questBattleStartSpec=questBattleStartSpec;
  window.questHandleMagicWolfVictory=questHandleMagicWolfVictory;
  window.questHandleBattleVictory=questHandleBattleVictory;
  window.questBattleEnemyFled=questBattleEnemyFled;
  window.questReplaceMagicWolfEnemies=questReplaceMagicWolfEnemies;
}
