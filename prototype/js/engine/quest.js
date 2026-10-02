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
const FIVE_SAINTS_ENGRAVING_NOS=['E066','E076','E077','E078','E079','E080'];
const FIVE_SAINTS_SYMBOL_X=[1875,1965,2055,2145];
const FIVE_SAINTS_SYMBOL_TOP=155;
const FIVE_SAINTS_CURRENT_PULSE_MS=4000;
// Q007 の木箱を失った時に、1個あたり支払う金額。
const Q007_CARGO_LOSS_GOLD_PER_BOX=100;
// 設計座標。写し身は同じ素材を別インスタンス（key）として扱う。
const Q006_SCENE={
  companion:{id:'MC001',key:'companion',x:2190,y:252,flipX:true,layer:0},
  guest:{id:'MC003',x:1700,y:240,layer:1},
  beside:{id:'MC001',key:'companion',x:330,y:252,layer:-1},
  firstAnchor:{x:2810,y:1435,tail:'bottom'},
  rightAnchor:{x:2380,y:843,tail:'top'},
  acceptedA1Anchor:{x:1650,y:1390,tail:'bottom'},
  acceptedA2Anchor:{x:2955,y:1340,tail:'top'},
  restored:{id:'MC008',key:'restored',x:2700,y:1090},
  namePlateX:2045,
};
// クエストごとの設定。requiredCardNo／requiredRingNo＝達成に必須の所持品のNo.。
// portraitB＝会話で右（対象B）に出す立ち絵（TAVERN_PORTRAIT_CONFIG のキー）。
const QUEST_CONFIG={
  // Q002 は受託時に、次の街（wave 2）までの残り戦闘から最大3戦を選び、E101を報酬へ混ぜる。
  // townArrival は塔イベントとは別に、指定waveの街へ着いた直後に所持品を自動集計する。
  Q002:{requiredCardNo:'',portraitB:'MC002',initialChoice:true,completeAt:'town',completeWave:2,
    rewardMix:{cardNo:'E101',count:3,arrivalWave:2},
    townArrival:{portraitB:'MC005',fallbackGoldByCount:{1:50,2:120,3:250}}},
  Q003:{requiredCardNo:'BC002',portraitB:'MC002',completeAt:'tower'},
  // Q005 は祭壇の指輪提示レイアウトを使い、R042 を1つだけ依頼品として渡す。
  // towerArrival.rewardLine は1始まりで、報酬と指輪回収を行う台詞番号。
  Q005:{requiredRingNo:'R042',portraitB:'MC003',completeAt:'tower',offerTitleKey:'「酒場の報酬枠」見出し2',
    ringOffer:{messageKey:'「クエスト」説明文1'},towerArrival:{rewardLine:3,collectRing:true}},
  Q006:{requiredCardNo:'BC001',portraitB:'MC007',completeAt:'tower',offerTitleKey:'「酒場の報酬枠」見出し2',
    acceptGold:true,lostPortrait:Q006_SCENE.companion,
    tavernScene:{guest:Q006_SCENE.guest,guestLine:3,namePlateLine:3,namePlateX:Q006_SCENE.namePlateX,
      firstAnchor:Q006_SCENE.firstAnchor,rightAnchor:Q006_SCENE.rightAnchor,
      transformLine:7,transformed:Q006_SCENE.companion,simultaneousLines:[[7,8]]},
    acceptedExit:{portrait:Q006_SCENE.beside,firstAnchor:Q006_SCENE.acceptedA1Anchor,
      secondAnchor:Q006_SCENE.acceptedA2Anchor,persistentLines:[1]},
    towerDeparture:{portrait:Q006_SCENE.companion,restored:Q006_SCENE.restored,restoreLine:2,
      fadeLine:3,line2Anchor:Q006_SCENE.firstAnchor}},
  // Q007 は効果なしの荷物カード（E102 木箱）を、酒場の依頼枠へ5枚提示する。
  Q007:{requiredCardNo:'E102',offerCount:5,cargo:true,portraitB:'MC004',completeAt:'town',completeWave:4,offerTitleKey:'「酒場の報酬枠」見出し2',
    townArrival:{portraitB:'MC006',fallbackGoldByCount:{1:75,2:150,3:300,4:500,5:800}}},
  // Q004 は依頼カードを介さず、酒場の台詞4で受託／拒否を選ぶ。
  // encounterTargets は受託時にランの鍵付き乱数で1件だけ保存する対象戦闘。
  Q004:{requiredCardNo:'',portraitB:'MC003',initialChoice:true,noFailureRevisit:true,completeAt:'battle',
    encounterTargets:[{wave:2,stage:6},{wave:2,stage:7},{wave:3,stage:1}],
    // 追撃戦固有の決着は、クエストID分岐ではなくこの設定から引く。
    pursuit:{targetEnemyNo:'EN027',escortEnemyNo:'EN020',noRetry:true,passStageOnDefeat:true,
      defeatDialogue:{variant:'tavern',specialGroup:'A',count:1},
      defeatedThenRetreat:{initialCount:1,specialGroup:'B'}}},
};

// ── 調整用レイアウト定数 ──────────────────────────────
// 立ち絵は設計座標へ原寸配置する。画面外へはみ出した分は #scr-* の overflow で切る。
const TAVERN_PORTRAIT_CONFIG={
  MC001:{src:'assets/art/sprites/MC001.webp',x:-207,y:252,width:1990,height:3410},
  MC002:{src:'assets/art/sprites/MC002.webp',x:2211,y:300,width:2095,height:2877},
  MC003:{src:'assets/art/sprites/MC003.webp',x:2400,y:240,width:2305,height:3880},
  MC004:{src:'assets/art/sprites/MC004.webp',x:1819,y:192,width:3155,height:4291},
  MC005:{src:'assets/art/sprites/MC005.webp',x:2320,y:380,width:1898,height:2847},
  MC006:{src:'assets/art/sprites/MC006.webp',x:2142,y:102,width:2077,height:4452},
  MC007:{src:'assets/art/sprites/MC007.webp',x:2735,y:1015,width:1085,height:1288},
  MC008:{src:'assets/art/sprites/MC008.webp',x:2700,y:1090,width:1152,height:1183},
  MC009:{src:'assets/art/sprites/MC009.webp',x:2060,y:185,width:2455,height:4118},
  // 蝕界の塔の1周目到着イベント。素材の原寸で指定座標へ置く。
  MC010:{src:'assets/art/sprites/MC010.webp',x:2350,y:150,width:1885,height:3678},
};
const TAVERN_PORTRAIT_FADE_MS=480;
const TAVERN_FACE_FADE_MS=1000;   // 表情の差分のフェードイン（0.48秒では早すぎた。2026-09-25 利用者指摘）
const TAVERN_DESTROY_RED_MS=450;    // 破壊された必須カードの立ち絵が赤く染まるまで
const TAVERN_DESTROY_FADE_MS=900;   // 赤くなってから消えるまで
const TAVERN_DESTROY_AFTER_ITEM_MS=400; // アイテムの演出（マスの変化など）が終わってから編成画面を閉じるまで
const TAVERN_PORTRAIT_STEP_MS=500;
const TAVERN_PORTRAIT_SLIDE_MS=700;
const TAVERN_TRANSFORM_GLOW_MS=350;
const TAVERN_DIALOGUE_FADE_MS=180;
// 表情画像は「立ち絵ID_表情名」で指定する。座標は立ち絵ごとに持ち、
// 未登録の立ち絵へ表情を付けようとした場合は画像を出さずに警告する。
// MC001.webp と画素を突き合わせた表情差分は、左上から X811・Y335、351×351。
const TAVERN_FACE_CONFIG={
  MC001:{x:811,y:335,width:351,height:351},
};
function _qFaceSpec(faceName){
  const name=String(faceName||'').trim();
  const split=name.indexOf('_');
  if(split<=0||split===name.length-1){
    if(name) console.warn(`[quest] 表情名の形式が不正です: ${name}`);
    return null;
  }
  const portraitId=name.slice(0,split);
  // _re は画像ではなく「本体の顔へ戻す」。表情配置のない立ち絵にも共通。
  if(name.slice(split+1)==='re') return {name,portraitId,reset:true};
  const config=TAVERN_FACE_CONFIG[portraitId];
  if(!config){
    console.warn(`[quest] 表情の配置が未登録です: ${name}（立ち絵 ${portraitId}）`);
    return null;
  }
  return {name,portraitId,config};
}
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
// 本文と枠の左右間隔。従来の96pxから半分にし、2行台詞の過剰な横幅を抑える。
const TAVERN_LINE_PAD_X=48;
const TAVERN_LINE_PAD_Y=44;
const TAVERN_LINE_MIN_W=520;
// 台詞枠の端（六角形の尖った先）から尻尾の先端までの横の距離。見本画像から測った値。
// 左のキャラの枠は尻尾が左寄りから左下へ、右のキャラの枠は右寄りから右上へ伸びる。
const TAVERN_LINE_TIP_FROM_END=84;

if(typeof window!=='undefined'){
  window.QUEST_CONFIG=QUEST_CONFIG;
  window.Q007_CARGO_LOSS_GOLD_PER_BOX=Q007_CARGO_LOSS_GOLD_PER_BOX;
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

function _fiveSaintsState(){
  if(typeof G==='undefined'||!G) return {visited:false,offeredNos:[],offers:{},decisions:{},targets:{}};
  if(!G._fiveSaints||typeof G._fiveSaints!=='object'||Array.isArray(G._fiveSaints)) G._fiveSaints={};
  const state=G._fiveSaints;
  state.visited=!!state.visited;
  if(!Array.isArray(state.offeredNos)) state.offeredNos=[];
  for(const key of ['offers','decisions','targets']){
    if(!state[key]||typeof state[key]!=='object'||Array.isArray(state[key])) state[key]={};
  }
  return state;
}
function fiveSaintsAcceptedCount(source){
  const raw=source||((typeof G!=='undefined'&&G)?_fiveSaintsState():{});
  const decisions=raw&&raw.decisions&&typeof raw.decisions==='object'?raw.decisions:raw;
  return Object.values(decisions||{}).filter(value=>value===true||(value&&value.accepted===true)).length;
}
function fiveSaintsShouldAdvanceToStageFive(source){ return fiveSaintsAcceptedCount(source)>=2; }
function fiveSaintsRewardTitle(){ return _qText('「五聖の座」見出し','五聖の座'); }
function fiveSaintsRewardSlotTitle(){
  // 「五聖の座」見出しは画面左上の表示。報酬枠はこの行だけを使う（2026-10-01 利用者指定）。
  return _qText('「五聖の座の報酬枠」見出し','力の枷');
}
function _fiveSaintsTalkRow(key){
  const all=(typeof window!=='undefined'&&window.TALK_MESSAGES)||{};
  return (all['塔']||{})[key]||{};
}
function _fiveSaintsTalkLines(row,keys){
  // 表情画像のIDは話者A/Bとは独立している。MC009が話している行でも
  // MC001_* は同席している主人公側の表情差分としてそのまま反映する。
  return (keys||[]).map(key=>row&&row[key]).filter(line=>line&&String(line.text||'').trim())
    .map(line=>({...line}));
}

function _fiveSaintsWave(){ return Math.max(1,Math.min(4,Number(G&&G._wave)||1)); }
function _fiveSaintsDecisionAt(wave,state){
  const value=(state||_fiveSaintsState()).decisions[String(wave)];
  if(value===true||value===false) return {accepted:value};
  return value&&typeof value==='object'?value:null;
}
function fiveSaintsCurrentTowerResolved(){
  if(typeof G==='undefined'||!G) return false;
  const decision=_fiveSaintsDecisionAt(_fiveSaintsWave(),_fiveSaintsState());
  return !!(decision&&(decision.accepted||decision.blocked));
}
function _fiveSaintsCheckpoint(){
  if(typeof SaveRun==='undefined'||!SaveRun.enabled()) return false;
  return SaveRun.checkpoint('tower');
}
function _fiveSaintsOfferNo(wave){
  const state=_fiveSaintsState();
  const key=String(wave);
  if(FIVE_SAINTS_ENGRAVING_NOS.includes(String(state.offers[key]||''))) return state.offers[key];
  const used=new Set([
    ...state.offeredNos,
    ...Object.values(state.offers),
  ].map(no=>String(no||'').toUpperCase()).filter(Boolean));
  let candidates=FIVE_SAINTS_ENGRAVING_NOS.filter(no=>!used.has(no));
  if(!candidates.length) candidates=FIVE_SAINTS_ENGRAVING_NOS.slice();
  const choose=()=>candidates[Math.floor(rand()*candidates.length)];
  const no=typeof runWithKeyedRandom==='function'
    ?runWithKeyedRandom(`five-saints:engraving:${wave}`,choose):choose();
  state.offers[key]=no;
  if(!state.offeredNos.includes(no)) state.offeredNos.push(no);
  return no;
}
function _fiveSaintsTargetSlot(wave,no){
  const state=_fiveSaintsState();
  const key=String(wave);
  if(String(no)!=='E076') return null;
  const saved=Number(state.targets[key]);
  if(Number.isInteger(saved)&&saved>=0&&saved<15) return saved;
  const board=Array.isArray(G&&G.mainBoard)?G.mainBoard:[];
  const empty=Array.from({length:15},(_,i)=>i).filter(i=>!board[i]);
  const movable=Array.from({length:15},(_,i)=>i).filter(i=>{
    const card=board[i];
    return card&&!(_cardIsEngraved(card)||_cardIsSuppressionEngraving(card));
  });
  const candidates=empty.length?empty:(movable.length?movable:Array.from({length:15},(_,i)=>i));
  const choose=()=>candidates[Math.floor(rand()*candidates.length)];
  const target=typeof runWithKeyedRandom==='function'
    ?runWithKeyedRandom(`five-saints:suppression-slot:${wave}`,choose):choose();
  state.targets[key]=target;
  return target;
}
function _fiveSaintsMakeOfferCard(wave){
  const no=_fiveSaintsOfferNo(wave);
  const def=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(card=>_qCardNo(card)===no):null;
  const card=def&&typeof makePanel==='function'?makePanel(def.id||def.name):null;
  if(!card) return null;
  card._buyPrice=0;
  card.cost=0;
  card.noRewardUse=true;
  card._isOriginalReward=true;
  card._fiveSaintsOfferCard=true;
  card._fiveSaintsOfferWave=wave;
  card._fiveSaintsOfferNo=no;
  const target=_fiveSaintsTargetSlot(wave,no);
  if(target!=null) card._fixedBoardSlot=target;
  return card;
}
function fiveSaintsCardCanUseBoardSlot(card,slotIdx){
  if(!card||!card._fiveSaintsOfferCard||String(card._fiveSaintsOfferNo||_qCardNo(card))!=='E076') return true;
  const target=Number(card._fixedBoardSlot);
  return Number.isInteger(target)&&Number(slotIdx)===target;
}
function _fiveSaintsPlacedCard(context){
  const ctx=context||_qFormationContext;
  if(!ctx||ctx.mode!=='fiveSaints') return null;
  return (G.mainBoard||[]).find(card=>card&&card._fiveSaintsOfferCard
    &&Number(card._fiveSaintsOfferWave)===Number(ctx.wave))||null;
}
function _fiveSaintsRenderDecor(options){
  const opts=options||{};
  const screen=document.getElementById('scr-village');
  if(!screen) return;
  document.getElementById('five-saints-decor')?.remove();
  const state=_fiveSaintsState();
  const wave=_fiveSaintsWave();
  const host=document.createElement('div');
  host.id='five-saints-decor';
  const approval=document.createElement('img');
  approval.className='five-saints-approval';
  approval.src='assets/ui/approval.svg';
  approval.alt='';
  const primary=document.createElement('img');
  primary.className='five-saints-primary';
  primary.src='assets/ui/symbol1.svg';
  primary.alt='';
  const divider=document.createElement('span');
  divider.className='five-saints-divider';
  host.append(approval,primary,divider);
  FIVE_SAINTS_SYMBOL_X.forEach((x,index)=>{
    const tower=index+1;
    const stored=_fiveSaintsDecisionAt(tower,state);
    // 今の塔で拒否しただけなら、まだ受諾できる（再入場で台詞2から）ので未決のまま明滅させる。
    const decision=(tower===wave&&stored&&!stored.accepted&&!stored.blocked)?null:stored;
    const symbol=document.createElement('span');
    symbol.className='five-saints-symbol';
    symbol.style.left=`${x}px`;
    if(decision){
      const img=document.createElement('img');
      img.src=decision.accepted?'assets/ui/symbol1.svg':'assets/ui/symbol2.svg';
      img.alt='';
      symbol.appendChild(img);
    }else if(tower<wave){
      const img=document.createElement('img');
      img.src='assets/ui/symbol2.svg';
      img.alt='';
      symbol.appendChild(img);
    }else symbol.classList.add('is-pending');
    // 受諾してsymbol1.svgになった塔は、もう明滅させない（2026-10-01 利用者指定）。
    if(tower===wave&&!decision&&Number(opts.newlyAccepted)!==tower) symbol.classList.add('is-current');
    if(Number(opts.newlyAccepted)===tower) symbol.classList.add('is-newly-accepted');
    host.appendChild(symbol);
  });
  screen.appendChild(host);
}
function _fiveSaintsShowScene(options){
  _qEnsureStyle();
  _qRemoveDialogue();
  void _qClearPresentation({immediate:true});
  G._isFiveSaints=true;
  G._isTavern=false;
  G._isVillageMenu=false;
  G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false; G._isLibrary=false;
  G._isWaveAltar=true;
  G._facilityLabel=_qText('塔「五聖の座」ボタン','五聖の座');
  G.phase='reward';
  document.body.classList.remove('world-map-active','reward-screen-active','five-saints-formation-active');
  document.body.classList.add('five-saints-active');
  if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
  if(typeof showScreen==='function') showScreen('village');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  _fiveSaintsRenderDecor(options);
  // Aキャラ（主人公 MC001）は原則として出す（2026-10-01 利用者指定）。
  void showTavernPortrait('MC001',{screen:'village'});
  void showTavernPortrait('MC009',{screen:'village',key:'five-saints-mc009'});
}
async function _fiveSaintsLeaveToTower(options){
  const generation=Number(G&&G._debugEventGeneration)||0;
  _qRemoveDialogue();
  const delay=options&&options.delay!=null?Math.max(0,Number(options.delay)||0):TAVERN_LEAVE_DELAY_MS;
  if(delay) await _qWait(delay);
  if(!G||!G._isFiveSaints||generation!==(Number(G._debugEventGeneration)||0)) return;
  const leave=()=>{
    _qFormationContext=null;
    void _qClearPresentation({immediate:true});
    document.getElementById('five-saints-decor')?.remove();
    document.body.classList.remove('five-saints-active','five-saints-formation-active','reward-screen-active');
    G._isFiveSaints=false;
    if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
    if(typeof openMapVillage==='function') openMapVillage({tower:true});
  };
  if(typeof fadeScreenSwitch==='function') await fadeScreenSwitch(leave); else leave();
}
function fiveSaintsSyncTargetGlow(){
  document.querySelectorAll('.five-saints-target-glow').forEach(el=>el.remove());
  const ctx=_qFormationContext;
  if(!G||!G._isFiveSaints||!ctx||ctx.mode!=='fiveSaints'||ctx.no!=='E076'||_fiveSaintsPlacedCard(ctx)) return;
  const slot=document.querySelector(`#hand-slots.board-slots > :nth-child(${Number(ctx.targetSlot)+1})`);
  if(!slot) return;
  const glow=document.createElement('span');
  glow.className='five-saints-target-glow';
  slot.appendChild(glow);
}
function syncFiveSaintsFormationControls(){
  if(!G||!G._isFiveSaints||G.phase!=='reward'||!_qFormationContext||_qFormationContext.mode!=='fiveSaints') return;
  const host=document.getElementById('reward-move-btns');
  const button=host&&host.querySelector('.rew-move-btn');
  if(!button) return;
  const accepted=!!_fiveSaintsPlacedCard();
  button.disabled=!!(G._pendingPanelPlacement||G._fiveSaintsResolving);
  button.classList.toggle('disabled',button.disabled);
  button.innerHTML=`<span class="rew-btn-label">${_qText(accepted?'「受諾」ボタン':'「拒否」ボタン',accepted?'受諾':'拒否')}</span>`;
  button.onclick=()=>{
    if(button.disabled||G._pendingPanelPlacement||G._fiveSaintsResolving) return;
    if(accepted) void _fiveSaintsAccept();
    else void _fiveSaintsReject();
  };
  fiveSaintsSyncTargetGlow();
}
function _fiveSaintsOpenFormationNow(){
  const wave=_fiveSaintsWave();
  const no=_fiveSaintsOfferNo(wave);
  const targetSlot=_fiveSaintsTargetSlot(wave,no);
  _qFormationContext={mode:'fiveSaints',wave,no,targetSlot};
  _qRemoveDialogue();
  void _qClearPresentation({immediate:true});
  G._isFiveSaints=true;
  G._isTavern=false; G._isVillageMenu=false; G._isShop=false; G._isForge=false;
  G._isItemShop=false; G._isRingExchange=false; G._isLibrary=false;
  G._isWaveAltar=true;
  G._facilityLabel=_qText('塔「五聖の座」ボタン','五聖の座');
  G._mapReturnAfterReward=true;
  G._freeRewardPanelMode=true;
  G._rewardOnePickMode=true;
  G.phase='reward';
  document.getElementById('five-saints-decor')?.remove();
  document.body.classList.remove('village-screen-active','five-saints-active');
  document.body.classList.add('reward-screen-active','five-saints-formation-active');
  if(typeof showScreen==='function') showScreen('battle');
  if(typeof _setOverrideBackground==='function') _setOverrideBackground('towerLanding');
  if(typeof goToReward==='function') goToReward();
  const card=_fiveSaintsMakeOfferCard(wave);
  if(typeof _rewCards!=='undefined') _rewCards=card?[card]:[];
  if(typeof _rewFreePickDone!=='undefined') _rewFreePickDone=false;
  if(typeof _storeRewardStartSnapshot==='function') _storeRewardStartSnapshot();
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  if(typeof renderMoveSlotsInEnemy==='function') renderMoveSlotsInEnemy();
  syncQuestFormationUi();
  syncFiveSaintsFormationControls();
  fiveSaintsSyncTargetGlow();
  _fiveSaintsCheckpoint();
}
async function _fiveSaintsOpenFormation(){
  if(typeof fadeScreenSwitch==='function') await fadeScreenSwitch(_fiveSaintsOpenFormationNow);
  else _fiveSaintsOpenFormationNow();
}
async function _fiveSaintsAccept(){
  const ctx=_qFormationContext;
  const card=_fiveSaintsPlacedCard(ctx);
  if(!ctx||!card||G._fiveSaintsResolving) return;
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
  G._fiveSaintsResolving=true;
  try{
    const state=_fiveSaintsState();
    state.decisions[String(ctx.wave)]={accepted:true,no:ctx.no,slot:(G.mainBoard||[]).indexOf(card)};
    delete card._fiveSaintsOfferCard;
    delete card._fiveSaintsOfferWave;
    delete card._fiveSaintsOfferNo;
    delete card._rewardReturnCard;
    delete card._rewardReturnIdx;
    delete card._rewardReturnPhaseId;
    if(ctx.no==='E076') card._fixedBoardSlot=(G.mainBoard||[]).indexOf(card);
    if(typeof _rewCards!=='undefined') _rewCards=[];
    G._pendingPanelPlacement=null;
    _qFormationContext=null;
    _fiveSaintsCheckpoint();
    const show=()=>_fiveSaintsShowScene({newlyAccepted:ctx.wave});
    if(typeof fadeScreenSwitch==='function') await fadeScreenSwitch(show); else show();
    if(!isCurrent()) return;
    const row=_fiveSaintsTalkRow('塔「五聖の座」入場時');
    await _qStartDialogue(_fiveSaintsTalkLines(row,['台詞3']),{screen:'village'});
    if(!isCurrent()) return;
    // 承諾後は、五聖側の立ち絵を下端から烟のように消してから塔へ戻る。
    await _qSmokePortraitUp('five-saints-mc009');
    if(!isCurrent()) return;
    await _fiveSaintsLeaveToTower({delay:0});
  }finally{ if(isCurrent()) G._fiveSaintsResolving=false; }
}
async function _fiveSaintsReject(){
  const ctx=_qFormationContext;
  if(!ctx||_fiveSaintsPlacedCard(ctx)||G._fiveSaintsResolving) return;
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
  G._fiveSaintsResolving=true;
  try{
    const state=_fiveSaintsState();
    state.decisions[String(ctx.wave)]={accepted:false,no:ctx.no};
    if(typeof _rewCards!=='undefined') _rewCards=[];
    G._pendingPanelPlacement=null;
    _qFormationContext=null;
    _fiveSaintsCheckpoint();
    const show=()=>_fiveSaintsShowScene();
    if(typeof fadeScreenSwitch==='function') await fadeScreenSwitch(show); else show();
    if(!isCurrent()) return;
    const row=_fiveSaintsTalkRow('塔「五聖の座」入場時');
    await _qStartDialogue(_fiveSaintsTalkLines(row,['特殊台詞A1']),{screen:'village'});
    if(!isCurrent()) return;
    await _fiveSaintsLeaveToTower();
  }finally{ if(isCurrent()) G._fiveSaintsResolving=false; }
}
async function _fiveSaintsRunEntry(firstVisit){
  const state=_fiveSaintsState();
  const wave=_fiveSaintsWave();
  const initial=_fiveSaintsTalkRow('塔「五聖の座」初回入場時');
  const entry=_fiveSaintsTalkRow('塔「五聖の座」入場時');
  if(firstVisit){
    await _qStartDialogue(_fiveSaintsTalkLines(initial,['台詞1','台詞2','台詞3']),{screen:'village'});
    if(!G||!G._isFiveSaints) return;
    // 初回台詞を最後まで見た時点で保存する。入場直後にvisitedを立てると、
    // 台詞の途中で再開したランが初回台詞を飛ばしてしまう。
    state.visited=true;
    _fiveSaintsCheckpoint();
  }
  if(!G||!G._isFiveSaints) return;
  const noEarlierAcceptance=wave===4&&[1,2,3].every(tower=>!(_fiveSaintsDecisionAt(tower,state)||{}).accepted);
  if(noEarlierAcceptance){
    await _qStartDialogue(_fiveSaintsTalkLines(entry,['台詞1']),{screen:'village'});
    state.decisions[String(wave)]={accepted:false,blocked:true};
    _fiveSaintsCheckpoint();
    _fiveSaintsRenderDecor();
    await _qStartDialogue(_fiveSaintsTalkLines(entry,['特殊台詞B1']),{screen:'village'});
    await _fiveSaintsLeaveToTower();
    return;
  }
  const stored=_fiveSaintsDecisionAt(wave,state);
  // 通常の拒否はこの塔で再び提示できる。蝕界の特殊終了と受諾だけを確定済みとする。
  const decided=stored&&(stored.accepted||stored.blocked)?stored:null;
  const retryAfterRefusal=!!(stored&&!stored.accepted&&!stored.blocked);
  // 同じ塔で拒否した後の再入場は台詞1を飛ばし、台詞2から再開する。
  if(!firstVisit&&!retryAfterRefusal) await _qStartDialogue(_fiveSaintsTalkLines(entry,['台詞1']),{screen:'village'});
  if(!G||!G._isFiveSaints) return;
  if(decided){
    await _qStartDialogue(_fiveSaintsTalkLines(entry,[decided.accepted?'台詞3':'特殊台詞A1']),{screen:'village'});
    await _fiveSaintsLeaveToTower();
    return;
  }
  await _qStartDialogue(_fiveSaintsTalkLines(entry,['台詞2']),{screen:'village'});
  if(G&&G._isFiveSaints) await _fiveSaintsOpenFormation();
}
function openFiveSaintsSeat(){
  if(!G||G._isFiveSaints) return;
  const state=_fiveSaintsState();
  const firstVisit=!state.visited;
  _fiveSaintsShowScene();
  void _fiveSaintsRunEntry(firstVisit);
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
.tavern-name-plate{position:absolute!important;left:var(--tavern-name-x,${TAVERN_NAME_PLATE.x}px)!important;top:0!important;width:${TAVERN_NAME_PLATE.lineW}px!important;height:0!important;
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
  width:${TAVERN_FACE_CONFIG.MC001.width}px!important;height:${TAVERN_FACE_CONFIG.MC001.height}px!important;max-width:none!important;max-height:none!important;
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
  text-shadow:0 1px 0 rgba(255,245,225,.5)!important;opacity:0!important;
  transition:opacity ${TAVERN_DIALOGUE_FADE_MS}ms ease!important;
}
.tavern-dialogue-text.is-visible{opacity:1!important}
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
/* 呪いの指輪輸送は祭壇の配置だけを借り、見出しと説明文はクエストのシート文言を使う。 */
html body.reward-screen-active.tavern-screen-active.quest-ring-offer-active #reward-offer-section::after{
  content:var(--quest-ring-offer-desc,"")!important;
}
html body.tavern-village-active #village-facilities,
html body.tavern-tower-event-active #village-facilities,
html body.tavern-tower-event-active #village-move-btns,
html body.quest-town-event-active #village-facilities,
html body.quest-town-event-active #village-move-btns,
html body.tavern-dialogue-active #village-facilities,
html body.tavern-dialogue-active #village-move-btns{display:none!important}
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
/* 五聖の座だけに重ねる承認表示。座標は3840×2160のゲーム座標。 */
#five-saints-decor{position:absolute!important;inset:0!important;z-index:126!important;pointer-events:none!important}
#five-saints-decor .five-saints-approval{position:absolute!important;left:1650px!important;top:115px!important;width:650px!important;height:150px!important}
#five-saints-decor .five-saints-primary{position:absolute!important;left:1735px!important;top:145px!important;width:90px!important;height:90px!important}
#five-saints-decor .five-saints-divider{position:absolute!important;left:1850px!important;top:160px!important;width:2.667px!important;height:60px!important;
  background:linear-gradient(180deg,#bf9000 0%,#8a5c12 100%)!important}
#five-saints-decor .five-saints-symbol{position:absolute!important;top:${FIVE_SAINTS_SYMBOL_TOP}px!important;width:70px!important;height:70px!important;
  transform-origin:center!important;filter:none}
#five-saints-decor .five-saints-symbol.is-pending{background:#6d6d6d!important;
  -webkit-mask:url("assets/ui/symbol1.svg") center/100% 100% no-repeat!important;
  mask:url("assets/ui/symbol1.svg") center/100% 100% no-repeat!important}
#five-saints-decor .five-saints-symbol img{display:block!important;width:70px!important;height:70px!important;max-width:none!important;max-height:none!important}
#five-saints-decor .five-saints-symbol.is-current{animation:five-saints-current-pulse ${FIVE_SAINTS_CURRENT_PULSE_MS}ms ease-in-out infinite!important}
#five-saints-decor .five-saints-symbol.is-newly-accepted{animation:five-saints-accepted-glow 1200ms ease-out 1!important}
@keyframes five-saints-current-pulse{0%,100%{filter:brightness(.3)}50%{filter:brightness(2.35) drop-shadow(0 0 18px rgba(255,218,93,.8))}}
@keyframes five-saints-accepted-glow{0%{filter:brightness(.15)}45%{filter:brightness(3) drop-shadow(0 0 30px rgba(255,218,93,1))}100%{filter:brightness(1)}}
html body.five-saints-active #village-facilities,
html body.five-saints-active #village-move-btns{display:none!important}
html body.reward-screen-active.five-saints-formation-active #scr-battle > #tavern-presentation-layer{z-index:-1!important}
.five-saints-target-glow{position:absolute!important;inset:-10px!important;border:5px solid rgba(79,177,255,.95)!important;
  box-shadow:0 0 18px 7px rgba(38,150,255,.9),inset 0 0 18px rgba(61,178,255,.75)!important;
  border-radius:12px!important;pointer-events:none!important;z-index:90!important;animation:five-saints-target-pulse 1500ms ease-in-out infinite!important}
@keyframes five-saints-target-pulse{0%,100%{opacity:.45}50%{opacity:1}}
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
  const ids=raw.split(/[、,\s]+/);
  return ids.map(v=>String(v||'').trim()).filter(id=>id&&id!=='-')
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
function _qNormalizeEntry(entry){
  if(entry&&_qIsCargoEntry(entry)){
    if(!Number.isFinite(Number(entry.transportCount))) entry.transportCount=0;
    if(!('cargoLossPaid' in entry)) entry.cargoLossPaid=false;
  }
  if(entry&&_qConfig(entry).pursuit&&!('encounterDefeated' in entry)) entry.encounterDefeated=false;
  return entry;
}
// その街で出ている（出た）クエスト。
function _qEntryForWave(wave){
  const w=Number(wave);
  return _qNormalizeEntry(_qAllEntries().find(e=>Number(e.wave)===w)||null);
}
// 受託して進行中のクエスト（塔に着く前）。
function _qActiveEntry(){
  return _qNormalizeEntry(_qAllEntries().find(e=>e.status==='accepted'&&!e.towerEventDone)||null);
}
// 選び直したステージの到着会話は、完了済みの依頼も再生できるようにする。
// 完了記録と報酬の支払済みフラグは保ち、会話用の写しだけを使う。
function questPrepareArrivalReplayForDebug(wave){
  if(!G||!G._debugMode||G._onlineMode) return;
  G._debugArrivalQuest=null;
  if(_qActiveEntry()) return;
  const entry=_qAllEntries().find(e=>{
    const cfg=_qConfig(e);
    return e.status==='completed'&&((cfg.completeAt==='town'&&Number(cfg.completeWave)===Number(wave))
      ||(cfg.completeAt==='tower'&&!cfg.towerDeparture&&Number(e.wave)===Number(wave)));
  });
  if(entry) G._debugArrivalQuest={...clone(entry),status:'accepted',townEventDone:false,towerEventDone:false};
}
function _qArrivalEntry(){
  const active=_qActiveEntry();
  if(active) return active;
  const replay=G&&G._debugMode&&!G._onlineMode&&G._debugArrivalQuest;
  return replay&&!replay.towerEventDone?replay:null;
}
function _qIsDebugArrivalReplay(entry){
  return !!(entry&&G&&G._debugMode&&!G._onlineMode&&entry===G._debugArrivalQuest);
}

// クエストの分類（クエストシートの「分類」。酒場側の行 → 無ければ番号だけの行）。
function _qQuestClass(id){
  const data=_qQuestData(_qVariant(id,QUEST_TAVERN_VARIANT))||_qQuestData(id)||{};
  return String(data.questClass||'').trim();
}
// その街で選ばれる（選ばれた）クエスト。
// 前の街で選ばれたクエストと同じ分類の候補は外す（例：護衛依頼→危険生物護送 にはしない。2026-09-28 利用者指定）。
// 前の街の選択は、実際に選ばれていればそれを、まだなら同じ鍵付き乱数で決まるはずのものを使う（受託・拒否は問わない）。
// 外して候補が無くなる時は、外さずに全候補から選ぶ。
function _qPickForWave(wave,depth){
  const w=Math.max(0,Number(wave)||0);
  const existing=_qEntryForWave(w);
  if(existing) return existing.questId;
  const candidates=_qRegionIds(w);
  if(!candidates.length) return '';
  let pool=candidates;
  if((depth||0)<8){
    let prevWave=w-1;
    while(prevWave>=0&&!_qRegionIds(prevWave).length) prevWave--;
    const prevId=prevWave>=0?_qPickForWave(prevWave,(depth||0)+1):'';
    const prevClass=prevId?_qQuestClass(prevId):'';
    if(prevClass){
      const filtered=candidates.filter(id=>_qQuestClass(id)!==prevClass);
      if(filtered.length) pool=filtered;
    }
  }
  return runWithKeyedRandom(`quest:${w}:tavern`,()=>pool[Math.floor(rand()*pool.length)]);
}
function _qEnsureSelected(){
  const all=_qQuestState();
  if(!all) return null;
  const wave=Math.max(0,Number(G&&G._wave)||0);
  const existing=_qEntryForWave(wave);
  if(existing) return existing;
  const candidates=_qRegionIds(wave);
  if(!candidates.length) return null;
  const selected=_qPickForWave(wave);
  if(!selected) return null;
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
    encounterDefeated:false,
    encounterRewardGiven:false,
    // Q002_1 は説明欄が空で、受託後に表示する本文は Q002_2 側にある。
    description:String(data.description||arrivalData.description||''),
    rewardMixTargets:[],
    townEventStarted:false,
    townEventDone:false,
    cargoLossPaid:false,
  };
  if(_qIsCargoEntry(all[selected])) all[selected].transportCount=0;
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
    encounterDefeated:false,
    encounterRewardGiven:false,
    description:String(data.description||arrivalData.description||''),
    rewardMixTargets:[],
    townEventStarted:false,
    townEventDone:false,
    cargoLossPaid:false,
  };
  if(_qIsCargoEntry(entry)) entry.transportCount=0;
  all[selected]=entry;
  return entry;
}

// デバッグ用「クエスト変更」。地域情報シートの3つの街をそのまま編集する。
// 選択中のクエスト自体は questProgress に置き、保存時だけ既存の強制選択ヘルパーへ渡す。
const QUEST_DEBUG_WAVES=[1,2,3];
let _qDebugDraft=null;
function _qDebugShortTownName(wave){
  const town=String((typeof regionInfoForWave==='function'?regionInfoForWave(wave):null)?.townName||'').trim();
  const match=town.match(/[ 　]([^ 　]+)$/);
  return match?match[1]:town;
}
function _qDebugQuestName(id){
  const data=_qQuestData(_qVariant(id,QUEST_TAVERN_VARIANT))||_qQuestData(id)||{};
  return String(data.name||id||'').trim();
}
function _qDebugDefaultQuestId(wave,candidates){
  const current=_qEntryForWave(wave);
  if(current&&candidates.includes(String(current.questId||''))) return String(current.questId);
  return runWithKeyedRandom(`quest:${wave}:tavern`,()=>candidates[Math.floor(rand()*candidates.length)])||'';
}
function _qDebugBuildDraft(){
  return QUEST_DEBUG_WAVES.map(wave=>{
    const candidates=_qRegionIds(wave);
    const current=_qEntryForWave(wave);
    return {wave,candidates,id:_qDebugDefaultQuestId(wave,candidates),initialId:current&&String(current.questId||'')||''};
  });
}
function _qDebugRender(){
  const root=document.getElementById('quest-debug-layer');
  if(!root||!Array.isArray(_qDebugDraft)) return;
  const title=root.querySelector('#quest-debug-title');
  const save=root.querySelector('#quest-debug-save');
  if(title) title.textContent=_qText('「クエスト枠」見出し','クエスト');
  if(save) save.textContent=_qText('「保存して戻る」ボタン','保存して戻る');
  root.querySelectorAll('.quest-debug-row').forEach(row=>{
    const item=_qDebugDraft.find(v=>String(v.wave)===String(row.dataset.wave));
    if(!item) return;
    row.dataset.questId=item.id;
    row.dataset.selectedQuestId=item.id;
    const town=row.querySelector('[data-quest-debug-town]');
    const name=row.querySelector('[data-quest-debug-name]');
    if(town) town.textContent=_qDebugShortTownName(item.wave);
    if(name) name.textContent=_qDebugQuestName(item.id);
    row.querySelectorAll('button[data-quest-debug-dir]').forEach(button=>{
      button.disabled=!item.candidates.length;
      button.setAttribute('aria-label',`${_qDebugShortTownName(item.wave)}の${button.dataset.questDebugDir==='next'?'次':'前'}のクエスト`);
    });
  });
}
function _qDebugShift(wave,direction){
  const item=Array.isArray(_qDebugDraft)&&_qDebugDraft.find(v=>Number(v.wave)===Number(wave));
  if(!item||!item.candidates.length) return;
  const current=Math.max(0,item.candidates.indexOf(item.id));
  item.id=item.candidates[(current+Number(direction)+item.candidates.length)%item.candidates.length];
  if(typeof playSfx==='function') playSfx('select',{group:'ui',guardKey:`ui:quest-debug:${wave}`});
  _qDebugRender();
}
function _qDebugClose(){
  const layer=document.getElementById('quest-debug-layer');
  if(!layer) return;
  layer.classList.remove('is-open');
  layer.setAttribute('aria-hidden','true');
  document.body.classList.remove('quest-debug-open');
  _qDebugDraft=null;
}
function _qDebugSave(){
  if(!G||!G._debugMode||!Array.isArray(_qDebugDraft)) return;
  _qDebugDraft.forEach(item=>{
    if(!item.id||!item.candidates.includes(item.id)) return;
    const current=_qEntryForWave(item.wave);
    // 変更していない街の accepted／completed などの状態は保持する。
    if(!current||String(current.questId||'')!==item.id) questDebugForceWaveQuest(item.wave,item.id);
  });
  _qDebugClose();
  syncQuestFormationUi();
  if(G._waveVillage&&typeof renderVillageScreen==='function') renderVillageScreen();
  // 通常ランから呼ばれた場合も、クエスト状態は既存のランセーブへ乗せる。
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('reward');
  if(typeof playSfx==='function') playSfx('uiConfirm',{group:'ui',guardKey:'ui:quest-debug-save'});
}
function questDebugOpenEditor(){
  // オンライン進行中はサーバーが現在地を持つため、ローカルのクエスト強制変更を開かない。
  // ボタン側のCSSに加え、古いDOMやプログラム呼び出しからも入れないよう入口でも止める。
  if(!G||!G._debugMode||G._onlineMode
    ||(typeof debugButtonsSuppressed==='function'&&debugButtonsSuppressed())) return;
  const layer=document.getElementById('quest-debug-layer');
  if(!layer) return;
  layer.querySelectorAll('button[data-quest-debug-dir]').forEach(button=>{
    button.onclick=()=>_qDebugShift(button.closest('.quest-debug-row')?.dataset.wave,
      button.dataset.questDebugDir==='next'?1:-1);
  });
  const save=layer.querySelector('#quest-debug-save');
  if(save) save.onclick=_qDebugSave;
  _qDebugDraft=_qDebugBuildDraft();
  _qDebugRender();
  layer.classList.add('is-open');
  layer.setAttribute('aria-hidden','false');
  document.body.classList.add('quest-debug-open');
}
if(typeof window!=='undefined') window.questDebugOpenEditor=questDebugOpenEditor;

// 酒場の中で扱うクエスト（今の街のもの）。
function _qEntry(){
  const wave=Math.max(0,Number(G&&G._wave)||0);
  return _qEntryForWave(wave)||_qEnsureSelected();
}

function _qConfig(entry){
  return (entry&&QUEST_CONFIG[entry.questId])||{};
}

function _qPursuitConfig(entry){
  const pursuit=_qConfig(entry).pursuit;
  return pursuit&&typeof pursuit==='object'?pursuit:null;
}

// 敵生成側も同じ設定を読み、追撃目標と取り巻きのカードNo.を直書きしない。
function questEncounterEnemySpec(){
  const entry=_qActiveEntry();
  const pursuit=_qPursuitConfig(entry);
  return pursuit?{
    targetEnemyNo:String(pursuit.targetEnemyNo||'').toUpperCase(),
    escortEnemyNo:String(pursuit.escortEnemyNo||'').toUpperCase(),
  }:null;
}

function _qIsCargoEntry(entry){
  return !!(_qConfig(entry).cargo);
}

function _qSpecialLines(data,group){
  const prefix=String(group||'').toUpperCase()==='B'?'specialB':'specialA';
  return [1,2,3,4].reduce((lines,n)=>lines.concat((data&&data[`${prefix}${n}`])||[]),[]);
}

function _qHasDirectChoice(entry){
  return !!_qConfig(entry).initialChoice;
}

function _qCardNo(card){
  return String(card&&(card.no||card.No||card['No.']||card.artCode)||'').toUpperCase();
}
function _qRequiredRingNo(entry){
  return String(_qConfig(entry).requiredRingNo||'').trim().toUpperCase();
}
function _qIsRequiredRing(ring,entry,requireMark){
  const no=_qRequiredRingNo(entry);
  if(!ring||!no||_qCardNo(ring)!==no) return false;
  return !requireMark||String(ring._questTransportId||'')===String(entry&&entry.questId||'');
}
function _qRequiredRingCount(entry){
  if(typeof G==='undefined'||!G||!entry||!Array.isArray(G.rings)) return 0;
  return G.rings.filter(ring=>_qIsRequiredRing(ring,entry,true)).length;
}
function _qMakeRequiredRing(entry){
  const no=_qRequiredRingNo(entry);
  if(!no||typeof RING_POOL==='undefined'||!Array.isArray(RING_POOL)) return null;
  const def=RING_POOL.find(ring=>_qCardNo(ring)===no);
  if(!def) return null;
  const ring=typeof clone==='function'?clone(def):{...def};
  ring._questTransportId=String(entry.questId||'');
  ring._disabled=false;
  return ring;
}
function _qRemoveRequiredRing(entry){
  if(!entry||!Array.isArray(G&&G.rings)) return false;
  let removed=false;
  G.rings.forEach((ring,index)=>{
    if(!_qIsRequiredRing(ring,entry,true)) return;
    G.rings[index]=null;
    removed=true;
  });
  if(removed){
    if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
    if(typeof _syncRewardProductionUi==='function') _syncRewardProductionUi();
    if(typeof updateHUD==='function') updateHUD();
  }
  return removed;
}
function _qRingOfferEntry(){
  const context=_qFormationContext;
  const entry=context&&context.mode==='accept'?context.entry:null;
  return entry&&_qConfig(entry).ringOffer?entry:null;
}
function questRingOfferActive(){ return !!_qRingOfferEntry(); }
function questRingOfferSlotCount(){ return questRingOfferActive()?1:3; }
function questRingOfferCanReturn(ring){
  const entry=_qRingOfferEntry();
  return !!(entry&&_qIsRequiredRing(ring,entry,true));
}
function questReturnRingOffer(slotIndex){
  const entry=_qRingOfferEntry();
  const index=Number(slotIndex);
  const ring=entry&&Array.isArray(G&&G.rings)&&Number.isInteger(index)?G.rings[index]:null;
  if(!questRingOfferCanReturn(ring)) return false;
  G.rings[index]=null;
  G._ringOffer=[typeof clone==='function'?clone(ring):{...ring}];
  G._ringOfferUnlocked=true;
  G._ringOfferResolved=false;
  G._ringOfferFadeOut=null;
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  return true;
}
// 依頼品の指輪（このクエストの印付き）は、受け取った時点（受託前の編成中も）から無効化・捨てるを止める。
// クエストが終わる（完了・失敗・塔で回収）まで続ける（2026-09-27 利用者指摘：受け取り時点で押せていた）。
function questRingActionsLocked(ring){
  return _qAllEntries().some(entry=>entry&&entry.status!=='completed'&&entry.status!=='failed'
    &&!entry.towerEventDone&&_qIsRequiredRing(ring,entry,true));
}
function questTavernRewardTitle(){
  const entry=(_qFormationContext&&_qFormationContext.entry)||_qEntryForWave(G&&G._wave);
  const key=_qConfig(entry).offerTitleKey||'「酒場の報酬枠」見出し1';
  return _qText(key,'');
}
// そのクエストに必須のカードか（ファラ＝BC002）。
function _qIsRequiredCard(card,entry){
  const no=String(_qConfig(entry).requiredCardNo||'').toUpperCase();
  return !!(card&&no&&_qCardNo(card)===no);
}
// 進行中のクエストに必須のカードか（ショップの「別れる」、戦闘中の台詞の判定に使う）。
function questRequiredCardFor(card){
  const entry=_qActiveEntry();
  if(entry&&!_qIsCargoEntry(entry)&&_qIsRequiredCard(card,entry)) return entry;
  return _qAllEntries().find(e=>e.status==='completed'&&!e.companionReleased
    &&_qIsRequiredCard(card,e)&&questCardLossIsFatal(card))||null;
}

// カード名・No.ではなく効果文で決める。新旧シート文言のどちらも古いランセーブで読めるようにする。
const QUEST_FATAL_LOSS_EFFECT_RE=/このキャラクターが(?:還魂以外|祭壇に捧げられる以外の理由)で失われるとゲームオーバーになる/;
function questCardLossIsFatal(card){
  const text=typeof coreUnitEffectText==='function'?coreUnitEffectText(card):String(card&&card.desc||'');
  return QUEST_FATAL_LOSS_EFFECT_RE.test(text.replace(/\s/g,''));
}
function _qRequiredDefinition(entry){
  return (typeof PANEL_POOL!=='undefined'?PANEL_POOL:[]).find(card=>_qIsRequiredCard(card,entry))||null;
}
function _qFatalCompanionEntries(){
  return _qAllEntries().filter(e=>['accepted','completed'].includes(e.status)&&!e.companionReleased&&!e.lifeLinkCut
    &&questCardLossIsFatal(_qRequiredDefinition(e)));
}
function _qSacrificePending(entry){
  return !!(G&&G._isRingExchange&&(G._ringSacrificedCards||[]).some(x=>x&&_qIsRequiredCard(x.card,entry)));
}
function _qOwnedFatalCards(){
  const cards=[];
  const seen=new Set();
  _qOwnedCardLists().forEach(list=>list.forEach(card=>{
    if(!card||seen.has(card)||!questCardLossIsFatal(card)) return;
    seen.add(card);
    cards.push(card);
  }));
  return cards;
}
function _qFatalEntriesForCards(cards){
  return _qAllEntries().filter(entry=>['accepted','completed'].includes(entry.status)&&!entry.companionReleased&&!entry.lifeLinkCut
    &&(cards||[]).some(card=>_qIsRequiredCard(card,entry)));
}
function _qOwnedLinkedQuestCards(){
  const fatal=_qOwnedFatalCards();
  const entries=_qFatalEntriesForCards(fatal);
  return fatal.filter(card=>entries.some(entry=>_qIsRequiredCard(card,entry)));
}
// 鍛冶屋は「強制ゲームオーバー」効果の所有だけを見る。カード名は見ない。
function questForgeChainState(){
  const cards=_qOwnedLinkedQuestCards();
  if(!cards.length) return null;
  const entries=_qFatalEntriesForCards(cards);
  return {revisit:cards.some(card=>card._forgeChainSeen)||entries.some(entry=>entry.forgeChainSeen)};
}
function questMarkForgeChainSeen(){
  const cards=_qOwnedLinkedQuestCards();
  cards.forEach(card=>{ card._forgeChainSeen=true; });
  _qFatalEntriesForCards(cards).forEach(entry=>{ entry.forgeChainSeen=true; });
  return cards.length>0;
}
function _qRemoveFatalLossEffect(card){
  if(!card||!questCardLossIsFatal(card)) return false;
  const remove=/(?:常時\s*[：:]\s*)?このキャラクターが(?:還魂以外|祭壇に捧げられる以外の理由)で失われるとゲームオーバーになる[\s。]*/g;
  const strip=text=>String(text||'').replace(remove,'').replace(/\n{3,}/g,'\n\n').trim();
  ['desc','effectText','effect'].forEach(key=>{
    if(card[key]!=null) card[key]=strip(card[key]);
  });
  if(card.effectData&&Array.isArray(card.effectData.effectTexts)){
    card.effectData.effectTexts=card.effectData.effectTexts.map(strip).filter(Boolean);
  }
  if(Array.isArray(card._adjacentPanelEffectTexts)){
    card._adjacentPanelEffectTexts=card._adjacentPanelEffectTexts.map(strip).filter(Boolean);
  }
  card._forgeChainSeen=true;
  card._fatalLinkCut=true;
  return true;
}
function questCutFatalLink(){
  const cards=_qOwnedLinkedQuestCards();
  if(!cards.length) return false;
  const entries=_qFatalEntriesForCards(cards);
  cards.forEach(_qRemoveFatalLossEffect);
  entries.forEach(entry=>{
    entry.forgeChainSeen=true;
    entry.lifeLinkCut=true;
  });
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  return true;
}

function _qRequiredOnBoardCount(entry){
  if(_qRequiredRingNo(entry)) return _qRequiredRingCount(entry);
  if(typeof G==='undefined'||!G||!entry) return 0;
  const no=String(_qConfig(entry).requiredCardNo||'').trim();
  if(!no) return 0;
  return (Array.isArray(G.mainBoard)?G.mainBoard:[]).filter(card=>_qIsRequiredCard(card,entry)).length;
}

function _qRequiredOfferCount(entry){
  const no=String(_qConfig(entry).requiredCardNo||'').trim();
  if(!no) return 0;
  return Math.max(1,Math.floor(Number(_qConfig(entry).offerCount)||1));
}

function _qHasRequiredOnBoard(entry){
  if(typeof G==='undefined'||!G||!entry) return false;
  if(_qRequiredRingNo(entry)) return _qRequiredRingCount(entry)>0;
  if(!String(_qConfig(entry).requiredCardNo||'').trim()) return true;
  return _qRequiredOnBoardCount(entry)>0;
}
function _qRequiredInReward(entry){
  if(_qRequiredRingNo(entry)) return Array.isArray(G&&G._ringOffer)
    &&G._ringOffer.some(ring=>_qIsRequiredRing(ring,entry,true));
  if(!String(_qConfig(entry).requiredCardNo||'').trim()) return false;
  return typeof _rewCards!=='undefined'&&Array.isArray(_rewCards)&&_rewCards.some(card=>_qIsRequiredCard(card,entry));
}

// 報酬欄の依頼カードに、アイテムで永久強化が与えられているか（reward_items.js が _itemBuffed を付ける）。
// 与えたまま拒否すると特殊拒否になる（2026-09-25 利用者指定）。
function _qRequiredCardBuffed(entry){
  if(_qIsCargoEntry(entry)) return false;
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
    ?PANEL_POOL.find(card=>card&&_qCardNo(card)===no)
    :null;
  const card=makePanel(panel?panel.id:`panel_npc_${no}`);
  if(!card) return null;
  // NPC依頼カードの基本形だけを整える。配置制限はここでNPC扱いから推測せず、
  // reward.js がキーワード「帰滅」で判定する（木箱 E102 は通常配置）。
  if(panel&&panel._npcCard){
    card._npcCard=true;
    card.boss=true;
    card.directionCount=0;
    card.directions=[];
  }
  card._buyPrice=0;
  card.cost=0;
  card.noRewardUse=true;
  return card;
}

function _qClearCargoRewardCards(entry){
  if(!_qIsCargoEntry(entry)||typeof _rewCards==='undefined'||!Array.isArray(_rewCards)) return;
  for(let i=0;i<_rewCards.length;i++){
    if(_qIsRequiredCard(_rewCards[i],entry)) _rewCards[i]=null;
  }
}

// 酒場の依頼枠には、この編成を開いた時に提示されていた依頼カードだけを戻せる。
// reward.js のドラッグ返却と、クリック／ドラッグによる入れ替えの両方がこの判定を使う。
function questRewardSlotAcceptsCard(card){
  if(!_qFormationContext||_qFormationContext.mode!=='accept') return true;
  return !!(card&&card._questOfferCard);
}
function questRequestDragActive(card){
  return !!(G&&G._isTavern&&_qFormationContext&&_qFormationContext.mode==='accept'
    &&card&&card._questOfferCard&&typeof coreUnitHasKeyword==='function'&&coreUnitHasKeyword(card,'帰滅'));
}

function _qClearOfferCardMarks(){
  const lists=[G&&G.mainBoard,G&&G.globalPanels,G&&G.spellSlots,
    typeof _rewCards!=='undefined'?_rewCards:null];
  lists.forEach(list=>{
    if(!Array.isArray(list)) return;
    list.forEach(card=>{ if(card) delete card._questOfferCard; });
  });
}

// クエスト枠に出す説明文。受託して進行中の間だけ出す。
// 酒場の依頼の編成窓では、受ける前の依頼として出す（拒否した後は、枠の外では出さない）。
function _qDescription(){
  if(G&&G._isFiveSaints) return '';
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
  const spec=questEncounterEnemySpec();
  const targetNo=String(spec&&spec.targetEnemyNo||'').toUpperCase();
  if(!targetNo) return null;
  const pool=typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[];
  return pool.find(d=>String(d&&(d.artCode||d._artCode||d.No||d.no||d['No.']||'')).toUpperCase()===targetNo)||null;
}
function questGarmPreviewStats(){
  const entry=_qActiveEntry();
  if(!entry||!_qConfig(entry).encounterTargets) return null;
  const def=_qGarmDef();
  if(!def) return null;
  if(!entry.garmPreview||!(Number(entry.garmPreview.hp)>0)){
    const floor=questGarmStatFloor();
    const stats=typeof enemyStats==='function'?enemyStats(def,floor):{atk:def.atk,hp:def.hp};
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
  const fiveSaints=!!(G&&G.phase==='reward'&&G._isFiveSaints);
  const title=fiveSaints?fiveSaintsRewardSlotTitle():questTavernRewardTitle();
  if(G&&G.phase==='reward'&&(G._isTavern||fiveSaints)){
    body.classList.add('tavern-screen-active');
    body.style.setProperty('--title-reward',JSON.stringify(title));
  }else{
    body.classList.remove('tavern-screen-active');
    body.style.removeProperty('--title-reward');
  }
  const panel=document.querySelector('.reward-prod-quest');
  if(panel) panel.classList.toggle('quest-active',!!_qDescription());
  body.classList.toggle('five-saints-formation-active',fiveSaints&&!!(_qFormationContext&&_qFormationContext.mode==='fiveSaints'));
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
  const opts=options||{};
  const lost=_qFatalCompanionEntries().find(e=>!_qHasRequiredOnBoard(e)&&!_qRequiredInReward(e)&&!_qSacrificePending(e));
  if(lost) return questOnRequiredCardDestroyed(lost,{deferEvent:!!opts.deferEvent});
  const entry=_qActiveEntry();
  if(!entry) return false;
  if(entry.companionReleased||_qSacrificePending(entry)) return false;
  // 木箱は輸送後の紛失判定を今回の範囲に含めない。通常の同行キャラだけを判定する。
  if(_qIsCargoEntry(entry)) return false;
  if(_qHasRequiredOnBoard(entry)){
    entry.rewardCardTaken=true;
    entry.partedPending=false;
    return false;
  }
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
  if(questCardLossIsFatal(card)) entry.lossKindPending='flee';
  return true;
}

// ── 画面を出る時の「クエスト失敗警告」 ─────────────────────
// 進行中のクエストの必須カードが魔導板に無いまま画面を出ようとしたら、
// セーブデータ削除時と同じ見た目の確認窓（showGameConfirm）で警告する。
// OK：失敗にして、非戦闘時クエスト失敗台詞を喋らせてから、押したボタンの処理へ進む。
function questNeedsLeaveWarning(){
  if(!G||G._isTavern) return false;
  const entry=_qActiveEntry();
  return !!(entry&&!_qIsCargoEntry(entry)&&!_qHasRequiredOnBoard(entry)&&!_qSacrificePending(entry)
    &&!entry.companionReleased&&(entry.lifeLinkCut||!questCardLossIsFatal(_qRequiredDefinition(entry))));
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

// 失敗の台詞（非戦闘時・失敗後）を、今の画面の上に暗幕をかけて喋らせる。
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
  await _qShowPortraitPair(screen,entry,{firstLines:lines,
    faceA:_qFirstLineFace(lines,'MC001')?'':'MC001_C'});
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
//   非戦闘時死亡時台詞2 → 酒場を出る。
// それ以外（受託後の編成画面など）：画面にオーバーレイをかけて同じ流れ。
// 以後クエストは killed（再訪時は非戦闘時死亡後台詞を出して酒場を出る）。2026-09-25 利用者指定。
// reward_items.js が、アイテムを使う前に魔導板にあった必須カードの持ち主（questRequiredEntryOnBoard）を覚えておき、
// 使った後にこれを呼ぶ。本当に消えていれば true を返して流れを始める。
function questRequiredEntryOnBoard(){
  const fatal=_qFatalCompanionEntries().find(e=>_qHasRequiredOnBoard(e));
  if(fatal) return fatal;
  const active=_qActiveEntry();
  if(active&&!_qIsCargoEntry(active)&&_qHasRequiredOnBoard(active)) return active;
  const tavern=G&&G._isTavern?_qEntry():null;
  if(tavern&&!_qIsCargoEntry(tavern)&&['offered','rejected'].includes(String(tavern.status))&&_qHasRequiredOnBoard(tavern)) return tavern;
  return null;
}
let _qDestroySession=false;
function questRequiredCardGone(entry){
  return !!(entry&&!_qIsCargoEntry(entry)&&!_qDestroySession&&!_qHasRequiredOnBoard(entry)&&!_qRequiredInReward(entry));
}
function questOnRequiredCardDestroyed(entry,options){
  if(!questRequiredCardGone(entry)) return false;
  if(!entry.lifeLinkCut&&questCardLossIsFatal(_qRequiredDefinition(entry))){
    const parted=entry.lossKindPending==='flee'||entry.partedPending;
    entry.lossKindPending='';
    return _qBeginFatalLoss(entry,parted?'flee':'death',!parted,!!(options&&options.deferEvent));
  }
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
// 立ち絵を消す時の表情差分は、立ち絵と同じ開始時刻・尺で消す。
// 表情だけを先に外すと、フェード途中で立ち絵本体の元の顔が見える。
async function _qFadePresentationElements(elements,duration,delay){
  const list=[...new Set(Array.from(elements||[]).filter(Boolean))];
  const ms=Math.max(0,Number(duration)||0);
  const waitDelay=Math.max(0,Number(delay)||0);
  const transition=`opacity ${ms}ms ease${waitDelay?` ${waitDelay}ms`:''}`;
  // 立ち絵と表情の差分を別々に薄くすると、半透明の差分の下から立ち絵本体の元の顔が透けて見える。
  // 立ち絵ごとに「立ち絵＋その表情」を1つの入れ物へ移し、入れ物ごと薄くする（差分は不透明のまま＝変化した表情のまま消える）。
  // 入れ物は親と同じ大きさ・原点なので、中の絶対配置の位置は変わらない（2026-09-27 利用者指摘）。
  const grouped=new Set();
  const fadeTargets=[];
  list.filter(el=>el.classList.contains('tavern-portrait')).forEach(portrait=>{
    const key=portrait.dataset.portraitKey||portrait.dataset.portraitId;
    const faces=list.filter(el=>el.classList.contains('tavern-face')&&(el.dataset.facePortraitKey||el.dataset.facePortraitId)===key);
    const parent=portrait.parentNode;
    if(!parent||!faces.length) return;
    const wrap=document.createElement('div');
    wrap.className='tavern-portrait-fade-group';
    wrap.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:1';
    wrap.style.zIndex=portrait.style.zIndex||'0';
    parent.insertBefore(wrap,portrait);
    [portrait,...faces].forEach(el=>{ wrap.appendChild(el); grouped.add(el); });
    fadeTargets.push(wrap);
  });
  list.filter(el=>!grouped.has(el)).forEach(el=>{
    el.style.setProperty('transition',transition,'important');
    el.classList.remove('is-visible');
  });
  if(fadeTargets.length){
    fadeTargets.forEach(wrap=>{ wrap.style.transition=transition; });
    void document.body.offsetWidth;
    fadeTargets.forEach(wrap=>{ wrap.style.opacity='0'; });
  }
  await _qWait(waitDelay+ms);
}
async function _qFadePortraitRed(id){
  const host=document.getElementById('tavern-presentation-layer');
  const img=host&&host.querySelector(`.tavern-portrait[data-portrait-id="${id}"]`);
  if(!img) return;
  const faces=[...host.querySelectorAll(`.tavern-face[data-face-portrait-id="${id}"]`)];
  img.classList.add('is-dying');
  // 赤く染まる時間は立ち絵だけにあり、表情は赤くせず同じ時刻から消し始める。
  faces.forEach(el=>el.style.setProperty('transition',
    `opacity ${TAVERN_DESTROY_FADE_MS}ms ease ${TAVERN_DESTROY_RED_MS}ms`,'important'));
  img.classList.remove('is-visible');
  faces.forEach(el=>el.classList.remove('is-visible'));
  await _qWait(TAVERN_DESTROY_RED_MS+TAVERN_DESTROY_FADE_MS);
  faces.forEach(el=>el.remove());
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
    const firstLines=data.destroyed1||[];
    await _qShowPortraitPair(screen,entry,{firstLines,
      faceA:_qFirstLineFace(firstLines,'MC001')?'':'MC001_C'});
    if(firstLines.length) await _qStartDialogue(firstLines,{screen});
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
async function questBattleCardLine(events,kind,findUnit,resolvedEvents){
  for(const ev of (events||[])){
    if(!ev||ev.side!=='p1') continue;
    const unit=typeof findUnit==='function'?findUnit(ev.side,ev.unitId):null;
    const entry=unit?questRequiredCardFor(unit):null;
    const fatal=questCardLossIsFatal(unit);
    if(!entry&&!fatal) continue;
    // 今回の死亡から次の死亡までをコアに渡し、復活した死亡を後の死亡と混ぜない。
    const sequence=resolvedEvents||events||[];
    const at=sequence.indexOf(ev);
    const next=at>=0?sequence.findIndex((x,i)=>i>at&&x&&x.type==='death'
      &&x.side===ev.side&&String(x.unitId)===String(ev.unitId)):-1;
    const deathEvents=at>=0?sequence.slice(at,next<0?sequence.length:next):sequence;
    if(fatal&&kind==='death'&&typeof coreKiemetsuExitReason==='function'
      &&coreKiemetsuExitReason(deathEvents,ev.unitId,ev.side)!=='death') continue;
    // 即時終了を要する死亡には、戦闘中の台詞を挟まず非戦闘時死亡台詞へ進む。
    if(fatal&&kind==='death') return questOnCardLost(unit,'death');
    const key=`${kind}:${ev.unitId}`;
    const shown=entry?(entry._battleLinesShown||(entry._battleLinesShown={})):{};
    const lines=shown[key]?[]:((_qQuestData(entry&&entry.tavernVariant)||{})[kind==='flee'?'flee':'death'])||[];
    shown[key]=true;
    if(lines.length&&typeof _showBattleLine==='function') try{
      if(document.fonts&&document.fonts.ready) await document.fonts.ready;
      const centerX=_battleLineUnitCenterX(unit,false);
      const tailY=_battleLineTailY(false,String(unit.lane||'front')==='rear');
      for(const line of lines) await _showBattleLine(line.text,centerX,tailY,false);
    }finally{
      if(typeof _removeBattleLineLayer==='function') _removeBattleLineLayer();
    }
    if(fatal) return questOnCardLost(unit,kind);
  }
  return false;
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
  const opts=options||{};
  const faceSpec=opts.face?_qFaceSpec(opts.face):null;
  // 台詞の対象（A/B）ではなく、表情ファイル名の「_」より前のIDで
  // 表情を付ける立ち絵を決める。呼び出し側が別の立ち絵IDを渡しても、
  // 表情の対象を取り違えないようにする。
  if(faceSpec&&faceSpec.portraitId!==id){
    return showTavernPortrait(faceSpec.portraitId,{...opts,face:faceSpec.name});
  }
  const base=TAVERN_PORTRAIT_CONFIG[id];
  if(!base) return null;
  const host=_qMovePresentationHost(opts.screen||'village');
  if(!host) return null;
  host.classList.remove('is-leaving');
  const key=opts.key||id;
  let img=host.querySelector(`.tavern-portrait[data-portrait-key="${key}"]`);
  // 表情だけを替える呼び出しでは、既に配置した位置・向きを維持する。
  const cfg={...base,...(img?{x:parseFloat(img.style.left),y:parseFloat(img.style.top),
    flipX:img.dataset.flipX==='true',layer:Number(img.style.zIndex)||0}:{}),...opts};
  const first=!img;
  if(!img){
    img=document.createElement('img');
    img.className='tavern-portrait';
    img.dataset.portraitId=id;
    img.dataset.portraitKey=key;
    img.dataset.flipX=String(!!cfg.flipX);
    img.alt='';
    img.style.left=`${cfg.x}px`;
    img.style.top=`${cfg.y}px`;
    img.style.width=`${cfg.width}px`;
    img.style.height=`${cfg.height}px`;
    img.style.transform=cfg.flipX?'scaleX(-1)':'none';
    img.style.zIndex=String(cfg.layer||0);
    img.src=_qPortraitSrc(cfg.src);
    host.appendChild(img);
  }
  // 立ち絵がこれから出る（まだ見えていない）時に表情を指定されたら、表情も立ち絵と同時に出す。
  // 立ち絵が出てから表情が切り替わって見えないようにする（2026-09-26 利用者指定）。
  const appearing=first||!img.classList.contains('is-visible');
  let appearFace=null;
  if(faceSpec&&faceSpec.reset){
    host.querySelectorAll(`.tavern-face[data-face-portrait-key="${key}"]`).forEach(face=>face.remove());
  }else if(faceSpec&&faceSpec.portraitId===id){
    const faceName=faceSpec.name;
    const currentFace=host.querySelector(`.tavern-face[data-face-id="${faceName}"][data-face-portrait-key="${key}"]`);
    if(!currentFace||!currentFace.classList.contains('is-visible')){
      const current=[...host.querySelectorAll(`.tavern-face.is-visible[data-face-portrait-key="${key}"]`)];
      const face=document.createElement('img');
      face.className='tavern-face';
      face.dataset.faceId=faceName;
      face.dataset.facePortraitId=id;
      face.dataset.facePortraitKey=key;
      face.alt='';
      // 表情差分は立ち絵ごとの下位フォルダ（MC001_A → sprites/MC001_face/MC001_A.webp）。
      face.src=_qPortraitSrc(`assets/art/sprites/${String(faceName).split('_')[0]}_face/${faceName}.webp`);
      face.style.left=`${cfg.x+(cfg.flipX?cfg.width-faceSpec.config.x-faceSpec.config.width:faceSpec.config.x)}px`;
      face.style.top=`${cfg.y+faceSpec.config.y}px`;
      face.style.setProperty('width',`${faceSpec.config.width}px`,'important');
      face.style.setProperty('height',`${faceSpec.config.height}px`,'important');
      face.style.transform=cfg.flipX?'scaleX(-1)':'none';
      face.style.zIndex=String(cfg.layer||0);
      // 表情は常にフェードインで替える（2026-09-25 利用者指定）。新しい表情を今の表情の上へ重ねてフェードインし、
      // 出きってから前の表情を外す。前の表情は不透明のまま下に残るので、元の顔が透けることもない。
      host.appendChild(face);
      if(appearing){
        // 初登場は下で「立ち絵＋表情」を同じ入れ物へまとめて出す。
        // 表情自身は最初から不透明にし、元の顔が途中で透けないようにする。
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
    let appearanceGroup=null;
    if(appearFace){
      // 個々を0→1にすると、半透明の表情差分の下から本体の元の顔が見える。
      // 子は最初から不透明にし、消える時と同じく入れ物のopacityだけを動かす。
      appearanceGroup=document.createElement('div');
      appearanceGroup.className='tavern-portrait-fade-group';
      appearanceGroup.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;opacity:0';
      appearanceGroup.style.zIndex=String(cfg.layer||0);
      host.insertBefore(appearanceGroup,img);
      appearanceGroup.appendChild(img);
      appearanceGroup.appendChild(appearFace);
      [img,appearFace].forEach(el=>{
        el.style.setProperty('transition','none','important');
        el.classList.add('is-visible');
      });
      void appearanceGroup.offsetWidth;
      appearanceGroup.style.transition=`opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease`;
      requestAnimationFrame(()=>{ if(appearanceGroup) appearanceGroup.style.opacity='1'; });
    }else{
      requestAnimationFrame(()=>img.classList.add('is-visible'));
    }
    await _qWait(TAVERN_PORTRAIT_STEP_MS);
    if(appearanceGroup&&appearanceGroup.parentNode){
      const parent=appearanceGroup.parentNode;
      while(appearanceGroup.firstChild) parent.insertBefore(appearanceGroup.firstChild,appearanceGroup);
      appearanceGroup.remove();
      [img,appearFace].forEach(el=>el&&el.style.removeProperty('transition'));
    }
  }
  return img;
}

async function _qSlidePortrait(spec,screen){
  const img=await showTavernPortrait(spec.id,{...spec,x:3840,screen});
  if(!img) return;
  img.style.setProperty('transition',`left ${TAVERN_PORTRAIT_SLIDE_MS}ms ease-out`,'important');
  void img.offsetWidth;
  img.style.left=`${spec.x}px`;
  await _qWait(TAVERN_PORTRAIT_SLIDE_MS);
  img.style.removeProperty('transition');
}

// 立ち絵と現在の表情差分を、座標を変えずに1つの演出層へまとめる。
// フェード中に本体の元の顔が透けないよう、立ち絵と表情は必ず同じ層で動かす。
function _qTakePortraitAnimationGroup(key,className){
  const host=document.getElementById('tavern-presentation-layer');
  const portrait=host&&host.querySelector(`.tavern-portrait[data-portrait-key="${key}"]`);
  if(!host||!portrait) return null;
  const faces=[...host.querySelectorAll(`.tavern-face[data-face-portrait-key="${key}"]`)];
  const group=document.createElement('div');
  group.className=className||'tavern-portrait-animation-group';
  group.style.cssText='position:absolute;inset:0;pointer-events:none;opacity:1';
  group.style.zIndex=portrait.style.zIndex||'0';
  host.insertBefore(group,portrait);
  [portrait,...faces].forEach(el=>group.appendChild(el));
  return {host,portrait,faces,group};
}

// ギャラハの1周目酒場用。A立ち絵（表情込み）を、素早いフェードで左右反転した姿へ入れ替えてから、
// 画面左へスライドして消す。横幅を縮めて裏返すような見せ方にはしない（2026-10-02 利用者指定）。
const STORY_FLIP_FADE_MS=180;    // 反転した姿へ入れ替えるフェード
const STORY_FLIP_SLIDE_MS=800;   // 反転後、画面左外へ抜けるスライド
async function _qFlipSlidePortraitLeft(key){
  const taken=_qTakePortraitAnimationGroup(key||'MC001','tavern-portrait-exit-group');
  if(!taken) return false;
  const {host,portrait,group}=taken;
  const x=parseFloat(portrait.style.left)||0;
  const width=parseFloat(portrait.style.width)||0;
  const flipped=group.cloneNode(true);
  flipped.style.transformOrigin=`${x+width/2}px 50%`;
  flipped.style.transform='translate3d(0,0,0) scaleX(-1)';
  flipped.style.opacity='0';
  host.insertBefore(flipped,group.nextSibling);
  group.style.transition=`opacity ${STORY_FLIP_FADE_MS}ms linear`;
  flipped.style.transition=`opacity ${STORY_FLIP_FADE_MS}ms linear`;
  void flipped.offsetWidth;
  group.style.opacity='0';
  flipped.style.opacity='1';
  await _qWait(STORY_FLIP_FADE_MS+20);
  group.remove();
  flipped.style.transition=`transform ${STORY_FLIP_SLIDE_MS}ms cubic-bezier(.5,0,.85,.45)`;
  void flipped.offsetWidth;
  // 画面の左外まで（立ち絵の右端がX0より左へ出るまで）送る。
  flipped.style.transform=`translate3d(${-(x+width+40)}px,0,0) scaleX(-1)`;
  await _qWait(STORY_FLIP_SLIDE_MS+20);
  flipped.remove();
  return true;
}

// 五聖の座の受諾後用。下端から上へ透明になりながら、少し揺らいで立ち上るように消す。
// **毎フレームJSでマスクの式やぼかしを作り直さない**（大きな立ち絵では重く、カクついた。2026-10-02 利用者指摘）。
// 固定のグラデーションマスクの位置（mask-position）と transform・opacity を Web Animations で動かす。
const FIVE_SAINTS_SMOKE_MS=1600;
async function _qSmokePortraitUp(key){
  const taken=_qTakePortraitAnimationGroup(key,'five-saints-smoke-group');
  if(!taken) return false;
  const {group}=taken;
  // マスクは縦200%：上半分＝不透明、真ん中に境目、下半分＝透明。位置0%（上半分が見える）→100%（下半分が見える）へ
  // 動かすと、境目が立ち絵の下端から上端まで、演出の始めから終わりまで一定の速さで上がる。
  const mask='linear-gradient(to bottom,#000 0%,#000 44%,rgba(0,0,0,.45) 50%,transparent 56%,transparent 100%)';
  ['maskImage','webkitMaskImage'].forEach(k=>{ group.style[k]=mask; });
  ['maskSize','webkitMaskSize'].forEach(k=>{ group.style[k]='100% 200%'; });
  ['maskRepeat','webkitMaskRepeat'].forEach(k=>{ group.style[k]='no-repeat'; });
  group.style.willChange='transform,opacity,mask-position';
  const frame=(p,dx,op)=>({offset:p,maskPosition:`0% ${p*100}%`,webkitMaskPosition:`0% ${p*100}%`,
    transform:`translate3d(${dx}px,${-90*p}px,0)`,opacity:op});
  const anim=group.animate([
    frame(0,0,1),frame(.2,6,1),frame(.4,-8,1),frame(.6,9,.95),frame(.8,-6,.6),frame(1,0,0),
  ],{duration:FIVE_SAINTS_SMOKE_MS,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
  try{ await anim.finished; }catch(_e){}
  group.remove();
  return true;
}

async function _qReplacePortraitWhite(fromKey,spec,screen){
  const host=document.getElementById('tavern-presentation-layer');
  const old=host&&host.querySelector(`.tavern-portrait[data-portrait-key="${fromKey}"]`);
  if(old){
    const faces=[...host.querySelectorAll(`.tavern-face[data-face-portrait-key="${fromKey}"]`)];
    // 白化とフェードは表情を含む1つの層へ掛ける。
    const group=document.createElement('div');
    group.style.cssText=`position:absolute;inset:0;pointer-events:none;z-index:${old.style.zIndex||0}`;
    host.appendChild(group);
    [old,...faces].forEach(el=>group.appendChild(el));
    group.style.transition=`filter ${TAVERN_TRANSFORM_GLOW_MS}ms ease,opacity ${TAVERN_PORTRAIT_FADE_MS}ms ease`;
    group.style.filter='brightness(1)';
    void group.offsetWidth;
    group.style.filter='brightness(0) invert(1) drop-shadow(0 0 40px white)';
    await _qWait(TAVERN_TRANSFORM_GLOW_MS);
    group.style.opacity='0';
    await _qWait(TAVERN_PORTRAIT_FADE_MS);
    group.remove();
  }
  await showTavernPortrait(spec.id,{...spec,screen});
}

// 立ち絵は**常にフェードで消す**（2026-09-24 利用者指定）。immediate は画面が暗転している時だけ使う。
async function _qClearPresentation(options){
  _qPendingNamePlate='';
  const host=document.getElementById('tavern-presentation-layer');
  if(!host) return;
  if(options&&options.immediate){ host.remove(); return; }
  // 消える途中の層は id を外し、次に出す立ち絵の層とぶつからないようにする。
  host.removeAttribute('id');
  await _qFadePresentationElements(host.querySelectorAll('.tavern-portrait,.tavern-face'),TAVERN_PORTRAIT_FADE_MS);
  host.remove();
}

// **デバッグの編成ボタン用：進行中のイベント（酒場・クエストの街／塔イベント・camp・店の入店台詞）を強制終了する。**
// 台詞は世代番号を進めて消すので、台詞を待っている処理はそこで止まったまま再開しない。
// 立ち絵・暗幕・名前札・施設の背景も即座に片付ける（背景は編成画面の setup.webp に戻る）。2026-09-30 利用者指定。
function questForceEndEventForDebug(){
  _qRemoveDialogue();
  _qTowerSession=false;
  _qTownSession=false;
  _qPendingEventSession=false;
  _qDestroySession=false;
  _qPendingNamePlate='';
  _qFormationContext=null;
  void _qClearPresentation({immediate:true});
  document.querySelectorAll('.quest-event-shade,.tavern-name-plate,.tavern-presentation-host').forEach(el=>el.remove());
  document.getElementById('five-saints-decor')?.remove();
  document.querySelectorAll('.five-saints-target-glow').forEach(el=>el.remove());
  document.body.classList.remove('tavern-village-active','tavern-screen-active','quest-town-event-active',
    'tavern-tower-event-active','quest-camp-scene','facility-greeting-active','facility-bg-active',
    'five-saints-active','five-saints-formation-active','library-screen-active','library-formation-active',
    'village-intro-active','village-intro-circle','village-intro-hide-ui','village-intro-reveal-ui');
  document.getElementById('village-intro-title')?.classList.remove('is-visible','is-hiding');
  const fade=document.getElementById('village-enter-fade');
  if(fade){ fade.style.transition='none'; fade.style.opacity='0'; }
  const switchFade=document.getElementById('screen-switch-fade');
  if(switchFade){ switchFade.classList.remove('is-blocking'); switchFade.style.transition='none'; switchFade.style.opacity='0'; }
  if(typeof _screenSwitchFading!=='undefined') _screenSwitchFading=false;
  if(G){
    G._debugEventGeneration=(Number(G._debugEventGeneration)||0)+1;
    G._storyArrivalBusy=false;
    G._villageIntroPlaying=false;
    G._villageFacilityBusy=false;
    G._fiveSaintsResolving=false;
    G._isTavern=false; G._isFiveSaints=false; G._questCampScene=false; G._facilityGreetingKey=null;
    // 貸出カードを次のステージへ持ち出さず、図書館に入る前の盤面を戻す。
    if((G._isLibrary||G._isLibraryMenu)&&G._libraryLoanSnapshot){
      G.mainBoard=clone(G._libraryLoanSnapshot.mainBoard||[]);
      G.globalPanels=clone(G._libraryLoanSnapshot.globalPanels||[]);
      if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
    }
    G._isLibrary=false; G._isLibraryMenu=false;
    G._libraryLoanSnapshot=null; G._libraryLoanResetSnapshot=null;
    G._libraryLoanCardsState=null; G._libraryLoanInitialCards=null; G._libraryLoanMode=null;
    G._isShop=false; G._isForge=false; G._isItemShop=false; G._isRingExchange=false;
    G._ringOfferPhase=false; G._facilityLabel='';
    G._pendingPanelPlacement=null;
    G._debugArrivalQuest=null;
  }
  if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
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
  const tail=bubble._dialogueTail;
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
  const anchor=line.anchor||TAVERN_DIALOGUE_ANCHORS[isRight?'right':'left'];
  const topTail=anchor.tail==='top';
  // speechbubble2.svg は元の向きで「左下を指す」（先端＝素材の左下）。
  //   左のキャラ：元の向きのまま。尻尾は枠の左寄りの下辺から左下へ。
  //   右のキャラ：180度回して右上を指す。尻尾は枠の右寄りの上辺から右上へ。
  const tailLeft=isRight?anchor.x-TAVERN_LINE_TAIL_W:anchor.x;
  const tailTop=topTail?anchor.y:anchor.y-TAVERN_LINE_TAIL_H;
  tail.style.left=`${tailLeft}px`;
  tail.style.top=`${tailTop}px`;
  tail.style.width=`${TAVERN_LINE_TAIL_W}px`;
  tail.style.height=`${TAVERN_LINE_TAIL_H}px`;
  tail.style.backgroundImage=`url("assets/ui/speechbubble${dark?4:2}.svg")`;
  tail.style.transform=`scale(${isRight?-1:1},${topTail?-1:1})`;
  let left,top;
  if(TAVERN_DIALOGUE_POSITION_MODE==='box'){
    left=anchor.x; top=anchor.y;
  }else if(topTail){
    left=isRight?anchor.x+TAVERN_LINE_TIP_FROM_END-w:anchor.x-TAVERN_LINE_TIP_FROM_END;
    const tailLineY=tailTop+TAVERN_LINE_TAIL_H-TAVERN_LINE_TAIL_BASE_INSET;
    top=tailLineY-TAVERN_LINE_FRAME_EDGE;
  }else{
    left=isRight?anchor.x+TAVERN_LINE_TIP_FROM_END-w:anchor.x-TAVERN_LINE_TIP_FROM_END;
    const tailLineY=tailTop+TAVERN_LINE_TAIL_BASE_INSET;
    top=tailLineY+TAVERN_LINE_FRAME_EDGE-h;
  }
  bubble.style.left=`${Math.max(20,Math.min(left,3840-20-w))}px`;
  bubble.style.top=`${Math.max(20,Math.min(top,2160-20-h))}px`;
  _qDrawFrame(bubble,w,h,dark);
}

// 表情は話者の左右ではなく、シートの画像名から対象立ち絵を決める。
// 表情が空欄の台詞では、この関数を呼ばず前の表情をそのまま残す。
function _qApplyLineFace(line,screen,faceKeys){
  const spec=_qFaceSpec(line&&line.face);
  if(!spec) return;
  const key=faceKeys&&faceKeys[line.speaker];
  const portrait=key&&document.querySelector(`.tavern-portrait[data-portrait-key="${key}"]`);
  if(key&&!portrait) return;
  void showTavernPortrait(spec.portraitId,{screen:screen||'village',face:spec.name,
    ...(portrait&&portrait.dataset.portraitId===spec.portraitId?{key}:{})});
}

function _qStartDialogue(lines,options){
  const opts=options||{};
  const items=(Array.isArray(lines)?lines:[]).map((line,sourceIndex)=>({line,sourceIndex}))
    .filter(item=>item.line&&String(item.line.text||'').trim());
  _qRemoveDialogue();
  if(!items.length){ if(typeof opts.onDone==='function') opts.onDone(); return Promise.resolve(); }
  // 同時表示と残す台詞の番号は、シートと同じ1始まりで指定する。
  const groups=(Array.isArray(opts.simultaneousLines)?opts.simultaneousLines:[])
    .map(group=>new Set((Array.isArray(group)?group:[]).map(n=>Math.max(0,Number(n)-1))));
  const grouped=new Set();
  const steps=[];
  items.forEach(item=>{
    if(grouped.has(item.sourceIndex)) return;
    const group=groups.find(set=>set.has(item.sourceIndex));
    const step=group?items.filter(candidate=>group.has(candidate.sourceIndex)):[item];
    step.forEach(candidate=>grouped.add(candidate.sourceIndex));
    if(step.length) steps.push(step);
  });
  const persistent=new Set((Array.isArray(opts.persistentLines)?opts.persistentLines:[])
    .map(n=>Math.max(0,Number(n)-1)));
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
  let stepIndex=0;
  let changing=false;
  // 切り替え中（フェード中）のクリックは捨てずに1回分覚え、切り替えが終わったら次へ進める（2026-09-28）。
  let pendingAdvance=false;
  // 酒場で B（依頼人）が最初に喋る時に名前札を出す（_qShowPortraitPair が _qPendingNamePlate に預ける）。
  const namePlateText=_qPendingNamePlate;
  let namePlateIndex=-1;
  const hideNamePlateLater=()=>{
    if(namePlateIndex<0) return;
    namePlateIndex=-2;
    window.setTimeout(_qHideNamePlate,TAVERN_NAME_PLATE_HOLD_MS);
  };
  const activeItemsForStep=index=>{
    const current=steps[index]||[];
    const maxIndex=Math.max(...current.map(item=>item.sourceIndex),-1);
    const kept=items.filter(item=>persistent.has(item.sourceIndex)&&item.sourceIndex<=maxIndex);
    // 左右それぞれ、今の台詞に無い側は「直前にその側で話した台詞」を残す（以前の見え方。B が話しても A の吹き出しは消えない）。
    const minIndex=Math.min(...current.map(item=>item.sourceIndex),Infinity);
    const sideOf=item=>item.line.speaker==='A'?'left':'right';
    const currentSides=new Set(current.map(sideOf));
    const lastBySide=new Map();
    items.forEach(item=>{
      if(item.sourceIndex>=minIndex) return;
      const side=sideOf(item);
      if(currentSides.has(side)) return;
      const prev=lastBySide.get(side);
      if(!prev||item.sourceIndex>prev.sourceIndex) lastBySide.set(side,item);
    });
    return [...new Map([...kept,...lastBySide.values(),...current].map(item=>[item.sourceIndex,item])).values()];
  };
  const bubbleFor=item=>{
    const key=String(item.sourceIndex);
    let bubble=stage.querySelector(`.tavern-dialogue-bubble[data-line-index="${key}"]`);
    if(bubble) return bubble;
    const side=item.line.speaker==='A'?'left':'right';
    bubble=document.createElement('div');
    bubble.className='tavern-dialogue-bubble';
    bubble.dataset.side=side;
    bubble.dataset.lineIndex=key;
    bubble.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><polygon></polygon></svg><div class="tavern-dialogue-text"></div>';
    const tail=document.createElement('div');
    tail.className='tavern-dialogue-tail';
    tail.dataset.tailSide=side;
    tail.dataset.lineIndex=key;
    bubble._dialogueTail=tail;
    stage.append(bubble,tail);
    return bubble;
  };
  const render=async()=>{
    changing=true;
    const current=steps[stepIndex]||[];
    const active=activeItemsForStep(stepIndex);
    const nextKeys=new Set(active.map(item=>String(item.sourceIndex)));
    const leaving=[...stage.querySelectorAll('.tavern-dialogue-bubble.is-visible')]
      .filter(bubble=>!nextKeys.has(bubble.dataset.lineIndex));
    leaving.forEach(bubble=>{
      bubble.classList.remove('is-visible');
      bubble.querySelector('.tavern-dialogue-text')?.classList.remove('is-visible');
    });
    if(leaving.length) await _qWait(TAVERN_DIALOGUE_FADE_MS);
    if(session!==_qDialogueSession) return;
    leaving.forEach(bubble=>{
      if(bubble._dialogueTail) bubble._dialogueTail.remove();
      bubble.remove();
    });
    if(typeof opts.beforeLine==='function'){
      for(const item of current) await opts.beforeLine(item.sourceIndex,item.line);
    }
    if(session!==_qDialogueSession) return;
    active.forEach(item=>{
      const line=item.line;
      const side=line.speaker==='A'?'left':'right';
      const bubble=bubbleFor(item);
      const lineOptions=typeof opts.lineOptions==='function'?opts.lineOptions(item.sourceIndex,line):{};
      // opts.dark（暗色の吹き出し）は B 側だけに掛ける。
      _qRenderBubble(bubble,side,{...line,...lineOptions,dark:!!line.dark||(!!opts.dark&&side!=='left')});
    });
    current.forEach(item=>_qApplyLineFace(item.line,opts.screen||'village',opts.faceKeys));
    if(namePlateText&&namePlateIndex===-1){
      const named=current.find(item=>item.line.speaker!=='A'
        &&(opts.namePlateLine==null||item.sourceIndex===opts.namePlateLine-1));
      if(named){
        _qPendingNamePlate='';
        namePlateIndex=named.sourceIndex;
        _qShowNamePlate(namePlateText,opts.namePlateX);
      }
    }
    if(typeof opts.onLine==='function') current.forEach(item=>opts.onLine(item.sourceIndex,item.line));
    const entering=active.map(bubbleFor).filter(bubble=>!bubble.classList.contains('is-visible'));
    if(entering.length){
      void stage.offsetWidth;
      entering.forEach(bubble=>{
        bubble.classList.add('is-visible');
        if(bubble._dialogueTail) bubble._dialogueTail.classList.add('is-visible');
        bubble.querySelector('.tavern-dialogue-text')?.classList.add('is-visible');
      });
      await _qWait(TAVERN_DIALOGUE_FADE_MS);
    }
    if(session===_qDialogueSession){
      changing=false;
      if(pendingAdvance){
        pendingAdvance=false;
        layer.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      }
    }
  };
  void render();
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
      // 切り替え中でも、画面に出ている選択肢は押せる（見えたらすぐ押せるように）。
      // 台詞送りは1回分覚えて、切り替えが終わってから進める。
      if(changing&&!event.target.closest('.tavern-dialogue-choice')){
        pendingAdvance=true;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const option=event.target.closest('.tavern-dialogue-choice');
      if(option){
        const bubble=option.closest('.tavern-dialogue-bubble');
        const item=items.find(candidate=>String(candidate.sourceIndex)===bubble?.dataset.lineIndex);
        const choice=item&&item.line.choices&&item.line.choices[Number(option.dataset.choiceIndex)];
        if(!choice) return;
        if((steps[stepIndex]||[]).some(candidate=>candidate.sourceIndex===namePlateIndex)) hideNamePlateLater();
        _qRemoveDialogue();
        if(typeof opts.onChoice==='function') opts.onChoice(choice);
        resolve(choice);
        return;
      }
      if(activeItemsForStep(stepIndex).some(item=>Array.isArray(item.line.choices)&&item.line.choices.length)) return;
      // 名前札は、それを出した台詞を送ってから1秒待って消す。
      if((steps[stepIndex]||[]).some(item=>item.sourceIndex===namePlateIndex)) hideNamePlateLater();
      if(stepIndex<steps.length-1){ stepIndex++;void render();return; }
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

function _qFirstLineFace(lines,portraitId){
  const line=(Array.isArray(lines)?lines:[]).find(item=>item&&String(item.text||'').trim());
  const spec=_qFaceSpec(line&&line.face);
  return spec&&spec.portraitId===portraitId?spec.name:'';
}

// A（MC001）→ B（クエストごとの立ち絵）の順にフェードインで出す。
// 最初の台詞に表情があれば、立ち絵のフェードイン前に重ねて同時に出す。
async function _qShowPortraitPair(screen,entry,options){
  const generation=Number(G&&G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G&&G._debugEventGeneration)||0);
  const opts=options||{};
  await _qClearPresentation();
  if(!isCurrent()) return;
  _qMovePresentationHost(screen);
  const portraitSpec=opts.withoutB?null:(opts.portraitB||_qConfig(entry).portraitB);
  const portraitB=typeof portraitSpec==='object'?portraitSpec?.id:portraitSpec;
  const firstLines=opts.firstLines||[];
  // 表情は話者 A/B ではなく画像名の接頭辞で対象を決める。MC001 が2体いる場面でも、
  // 通常の MC001_* は主人公へ付け、写し身にも必要な死亡会話だけ faceB で明示する。
  const firstFaceA=Object.prototype.hasOwnProperty.call(opts,'faceA')
    ?String(opts.faceA||''):_qFirstLineFace(firstLines,'MC001');
  const firstFaceB=portraitB?(Object.prototype.hasOwnProperty.call(opts,'faceB')
    ?String(opts.faceB||''):(portraitB==='MC001'?'':_qFirstLineFace(firstLines,portraitB))):'';
  await showTavernPortrait('MC001',{screen,face:firstFaceA});
  if(!isCurrent()) return;
  if(portraitB) await showTavernPortrait(portraitB,{...(typeof portraitSpec==='object'?portraitSpec:{}),screen,face:firstFaceB});
  if(!isCurrent()) return;
  // 酒場と街到着イベントで B が出ている時は、次の会話で B が最初に喋る時に名前札を出す。
  // 街到着では _2 行の「キャラクターの名前」を使う。
  const nameVariant=opts.namePlateVariant||entry.tavernVariant;
  const name=portraitB&&G&&(G._isTavern||opts.forceNamePlate)&&!opts.withoutNamePlate
    ?String((_qQuestData(nameVariant)||{}).characterName||'').trim():'';
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
function _qShowNamePlate(text,x){
  const host=document.getElementById('tavern-presentation-layer');
  if(!host||!text) return;
  _qHideNamePlate(true);
  const m=String(text).match(/^(.*?)[ 　]+(.+)$/);
  const plate=document.createElement('div');
  plate.className='tavern-name-plate';
  if(Number.isFinite(x)) plate.style.setProperty('--tavern-name-x',`${x}px`);
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

// Q004の対象マスへ入ったか。通常進行は既存の戦闘入口が必ず呼ばれるが、
// オンラインのformationマスは戦闘を省いて編成画面だけを開くため、flow.jsが
// この共通判定を見てクエスト戦だけを開始する。
function questEncounterBattlePending(stage){
  const entry=_qActiveEntry();
  const game=typeof G!=='undefined'&&G?G:null;
  return !!(entry&&_qConfig(entry).encounterTargets&&entry.status==='accepted'
    &&['wolf','garm','garmFled'].includes(String(entry.encounterPhase||''))
    &&_qEncounterTargetMatches(entry,game&&game._wave,stage));
}

function _qResumeOnlineAfterQuestEncounter(){
  if(!G||!G._onlineMode||typeof resumeOnlineFlow!=='function') return;
  requestAnimationFrame(()=>resumeOnlineFlow());
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
  return !!(entry&&_qPursuitConfig(entry)&&entry.status==='accepted'
    &&['garm','garmFled'].includes(String(entry.encounterPhase||''))
    &&_qEncounterTargetMatches(entry,game&&game._wave,game&&game._waveStage)
    &&_qIsQuestBattleNode(game&&game._mapBattle&&game._mapBattle.nodeId));
}

function _qPursuitUnitMatches(entry,unit){
  const pursuit=_qPursuitConfig(entry);
  const targetNo=String(pursuit&&pursuit.targetEnemyNo||'').toUpperCase();
  const code=String(unit&&(unit.artCode||unit._artCode||unit.No||unit.no||unit['No.']||unit.code)||'').toUpperCase();
  return !!(unit&&targetNo&&(code===targetNo||unit._questGarm));
}

function questBattleEnemyFled(events,findUnit){
  if(!questIsGarmBattle()) return false;
  const entry=_qActiveEntry();
  let found=false;
  (events||[]).forEach(event=>{
    if(!event||event.side!=='p2'||event.type!=='fled') return;
    const unit=typeof findUnit==='function'?findUnit(event.side,event.unitId):null;
    if(_qPursuitUnitMatches(entry,unit)) found=true;
  });
  if(found){
    entry.encounterFled=true;
    entry.encounterPhase='garmFled';
  }
  return found;
}

function questBattleEnemyDefeated(events,findUnit){
  if(!questIsGarmBattle()) return false;
  const entry=_qActiveEntry();
  const found=(events||[]).some(event=>{
    if(!event||event.side!=='p2'||event.type!=='death') return false;
    const unit=typeof findUnit==='function'?findUnit(event.side,event.unitId):null;
    return _qPursuitUnitMatches(entry,unit);
  });
  if(found){
    entry.encounterDefeated=true;
    entry.encounterFled=false;
  }
  return found;
}

// 追撃戦の敗北を、通常の再戦と切り分ける入口。
// 目標を既に倒していれば成功、それ以外はここで失敗を確定する。
function questPrepareBattleDefeat(){
  if(!questIsGarmBattle()) return null;
  const entry=_qActiveEntry();
  const pursuit=_qPursuitConfig(entry);
  if(!entry||!pursuit) return null;
  const success=!!entry.encounterDefeated;
  if(success) entry.encounterPhase='camp';
  else _qMarkFailed(entry);
  return {
    handled:true,entry,success,
    noRetry:!!pursuit.noRetry,
    passStage:!!pursuit.passStageOnDefeat,
    pursuit,
  };
}

// プレイヤー敗北台詞の後、撤退カットインの前に出すクエスト台詞。
async function questPlayBattleDefeatDialogue(spec){
  if(!spec||!spec.handled||spec.success||!spec.entry) return false;
  const rule=spec.pursuit&&spec.pursuit.defeatDialogue;
  if(!rule) return false;
  const data=_qQuestData(rule.variant==='tower'?spec.entry.towerVariant:spec.entry.tavernVariant)||{};
  const all=_qSpecialLines(data,rule.specialGroup||'A');
  const count=Math.max(0,Number(rule.count)||all.length);
  const lines=all.slice(0,count);
  if(!lines.length) return false;
  await _qShowPortraitPair('battle',spec.entry,{withoutB:true,firstLines:lines});
  const shade=_qMakeBattleShade();
  try{
    await _qStartDialogue(lines,{screen:'battle',dark:true});
  }finally{
    _qRemoveDialogue();
    await _qClearPresentation({immediate:true});
    if(shade) shade.remove();
  }
  return true;
}

// 撤退表示の「進む」後。失敗はそのステージを通過し、討伐後の撤退は成功報告へ進む。
async function questFinishBattleDefeat(spec){
  if(!spec||!spec.handled||!spec.entry) return false;
  if(spec.success){
    G._battleFadeHeldByCaller=true;
    await _qShowGarmCamp(spec.entry,false,{defeatedThenRetreat:true});
    return true;
  }
  if(spec.passStage&&typeof finishWaveBattleVictory==='function') finishWaveBattleVictory(false);
  const result=typeof goToReward==='function'?goToReward({checkpoint:true}):undefined;
  await Promise.resolve(result);
  _qResumeOnlineAfterQuestEncounter();
  return true;
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
  const floor=questGarmStatFloor();
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
    const result=typeof goToReward==='function'?goToReward({checkpoint:true}):undefined;
    _qResumeOnlineAfterQuestEncounter();
    return result;
  });
}

async function _qPlayMagicWolfEncounter(entry){
  const data=_qQuestData(entry.tavernVariant)||{};
  await _qShowPortraitPair('battle',entry,{withoutB:true,firstLines:data.progress1||[]});
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

async function _qShowGarmCamp(entry,escaped,options){
  const data=_qQuestData(entry.towerVariant)||{};
  const reward=Math.max(0,Number(data.rewardGold)||0);
  const retreatedAfterDefeat=!!(options&&options.defeatedThenRetreat);
  const retreatRule=_qPursuitConfig(entry)?.defeatedThenRetreat||{};
  const initial=Array.isArray(data.initial)?data.initial:[];
  const lines=retreatedAfterDefeat
    ?[
      ...initial.slice(0,Math.max(0,Number(retreatRule.initialCount)||1)),
      ..._qSpecialLines(data,retreatRule.specialGroup||'B'),
    ]
    :(escaped?_qSpecialLines(data,'A'):initial);
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
  await _qShowPortraitPair('village',entry,{firstLines:lines});
  const rewardIndex=escaped?Math.max(0,(data.specialA1||[]).length):0;
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
    const result=typeof goToReward==='function'?goToReward({checkpoint:true}):undefined;
    _qResumeOnlineAfterQuestEncounter();
    return result;
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
  const accepted=_qHasRequiredOnBoard(entry);
  button.disabled=!!G._pendingPanelPlacement;
  button.classList.toggle('disabled',!!button.disabled);
  button.innerHTML=`<span class="rew-btn-label">${_qText(accepted?'「受託」ボタン':'「拒否」ボタン','')}</span>`;
  button.onclick=()=>{
    if(button.disabled||G._pendingPanelPlacement) return;
    if(accepted) _qAcceptTavernQuest();
    else _qRejectTavernQuest();
  };
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
  const cfg=_qConfig(entry);
  const ringOffer=!!cfg.ringOffer;
  // 木箱は5枚すべてを任意の数だけ移す。依頼品の指輪は祭壇の提示操作を使うため、
  // どちらも通常報酬の1枚取得制限では管理しない。
  G._rewardOnePickMode=ringOffer?false:!_qIsCargoEntry(entry);
  if(ringOffer){
    const held=_qRequiredRingCount(entry)>0;
    const ring=held?null:_qMakeRequiredRing(entry);
    G._ringOffer=ring?[ring]:[];
    G._ringOfferUnlocked=!held&&!!ring;
    G._ringOfferResolved=held;
    G._ringOfferFadeOut=null;
    G._ringOfferPhase=true;
    document.body.classList.add('quest-ring-offer-active');
    document.body.style.setProperty('--quest-ring-offer-desc',JSON.stringify(_qText(cfg.ringOffer.messageKey,'')));
  }else{
    document.body.classList.remove('quest-ring-offer-active');
    document.body.style.removeProperty('--quest-ring-offer-desc');
  }
  const card=ringOffer||_qHasRequiredOnBoard(entry)?null:_qMakeRequiredCard(entry);
  // 提示中の保存から再開した場合も、元の依頼品だけを依頼枠へ戻せるようにする。
  if(_qFormationContext.mode==='accept'){
    (G.mainBoard||[]).forEach(held=>{ if(_qIsRequiredCard(held,entry)) held._questOfferCard=true; });
  }
  if(typeof _rewCards!=='undefined'){
    _rewCards=[];
    if(card){
      const count=_qRequiredOfferCount(entry);
      for(let i=0;i<count;i++){
        const offer=i===0?card:_qMakeRequiredCard(entry);
        if(!offer) continue;
        offer._isOriginalReward=true;
        offer._questOfferCard=true;
        _rewCards[i]=offer;
      }
    }
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

function _qCloseRingOffer(entry,removeHeld){
  if(!entry||!_qConfig(entry).ringOffer) return;
  if(removeHeld) _qRemoveRequiredRing(entry);
  G._ringOffer=[];
  G._ringOfferUnlocked=false;
  G._ringOfferResolved=false;
  G._ringOfferFadeOut=null;
  G._ringOfferPhase=false;
  G._ringPhaseStartSnapshot=null;
  document.body.classList.remove('quest-ring-offer-active','ring-offer-phase','ring-offer-resolved');
  document.body.style.removeProperty('--quest-ring-offer-desc');
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
  entry.encounterDefeated=false;
}

function _qReturnToTavernResponse(){
  _qShowTavernVillage();
  _qMovePresentationHost('village');
}

function _qTavernDialogueOptions(entry,initial){
  const scene=_qConfig(entry).tavernScene;
  if(!scene) return {};
  return {
    namePlateLine:initial?scene.namePlateLine:1,namePlateX:scene.namePlateX,
    simultaneousLines:initial?scene.simultaneousLines:undefined,
    lineOptions:(index,line)=>line.speaker==='B'
      ?{anchor:initial&&index===0?scene.firstAnchor:scene.rightAnchor}:{},
    beforeLine:initial?async index=>{
      if(index===scene.guestLine-1) await _qSlidePortrait(scene.guest,'village');
      if(index===scene.transformLine-1) await _qReplacePortraitWhite(_qConfig(entry).portraitB,scene.transformed,'village');
    }:undefined,
  };
}
async function _qShowTavernResponsePortraits(entry,lines){
  const scene=_qConfig(entry).tavernScene;
  await _qShowPortraitPair('village',entry,{firstLines:lines,
    ...(scene?{portraitB:scene.transformed}:{})});
  if(scene) await showTavernPortrait(scene.guest.id,{...scene.guest,screen:'village'});
}

// 途中再開に必要なのはイベントの種類と支払済みの回数だけ。DOMや時間は保存しない。
let _qPendingEventSession=false;
let _qTowerDepartBypass=false;
function _qCheckpointEvent(){
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    SaveRun.checkpoint(G._isWaveAltar?'tower':G._waveVillage?'town':'reward');
  }
}
function _qBeginFatalLoss(entry,kind,waitItem,deferEvent){
  if(!entry||entry.pendingEvent==='loss'||_qDestroySession) return false;
  entry.status='killed';
  entry.lossKind=kind==='flee'||kind==='fled'?'flee':'death';
  entry.lossWaitItem=!!waitItem;
  entry.pendingEvent='loss';
  entry.rewardCardTaken=false;
  entry.partedPending=false;
  entry.description='';
  _qRemoveRequiredCards(entry);
  // 進行中の戦闘を世代番号で無効化する。数値や勝敗はここで再計算しない。
  if(typeof _bumpBattleRunId==='function') _bumpBattleRunId();
  G._battleDefeatHandled=true;
  G._battleVictoryPending=true;
  G._battleVictoryCheckPending=false;
  G._battlePhaseRunning=false;
  document.body.classList.remove('battle-turn-active');
  _qCheckpointEvent();
  if(!deferEvent) void _qRunPendingEvent(entry,{waitItem:!!waitItem});
  return true;
}
function questOnCardLost(card,reason){
  if(reason==='sacrifice'||!questCardLossIsFatal(card)) return false;
  const entry=_qAllEntries().find(e=>_qIsRequiredCard(card,e))||{questId:'$cardLoss'};
  if(entry.companionReleased) return false;
  if(entry.questId==='$cardLoss') _qQuestState()[entry.questId]=entry;
  return _qBeginFatalLoss(entry,reason,false);
}
function questBattleVanishedCard(unit,events){
  if(!unit||!unit._deathWithoutEvent||!questCardLossIsFatal(unit)) return false;
  const outcome=coreKiemetsuBattleOutcome(unit,unit,events||[]);
  return outcome.vanished?questOnCardLost(unit,outcome.reason):false;
}
// 通常の全滅判定が同じ手番で走っても、必要な会話を追い越させない。
function questDeferGameOver(options){
  return !(options&&options.questLoss)&&_qAllEntries().some(e=>e.pendingEvent==='loss');
}
function questResumePendingEvent(options){
  const entry=_qAllEntries().find(e=>e.pendingEvent);
  if(!entry) return false;
  if(!_qPendingEventSession){
    const opts={...(options||{})};
    if(entry.pendingEvent==='loss'&&entry.lossWaitItem) opts.waitItem=true;
    void _qRunPendingEvent(entry,opts);
  }
  return true;
}
async function _qRunPendingEvent(entry,options){
  if(_qPendingEventSession) return;
  _qPendingEventSession=true;
  const opts=options||{};
  try{
    if(opts.restore&&entry.pendingEvent!=='accepted'){
      if(entry.pendingEvent==='loss'&&!G._waveVillage){
        if(typeof showScreen==='function') showScreen('battle');
        if(typeof goToReward==='function') goToReward({restoreCheckpoint:true});
      }else if(typeof openMapVillage==='function') openMapVillage({tower:!!G._isWaveAltar,restoreCheckpoint:true});
    }
    while(entry.pendingEvent){
      const event=entry.pendingEvent;
      const cfg=_qConfig(entry);
      const data=_qQuestData(event.startsWith('tower')?entry.towerVariant:entry.tavernVariant)||{};
      if(event==='accepted'){
        _qReturnToTavernResponse();
        if(opts.restore||!document.querySelector('.tavern-portrait[data-portrait-key="companion"]')){
          await _qShowTavernResponsePortraits(entry,data.accepted||[]);
        }
        await _qStartDialogue(data.accepted,{screen:'village',..._qTavernDialogueOptions(entry,false),onLine:()=>{
          if(!cfg.acceptGold||entry.acceptGoldGiven) return;
          entry.acceptGoldGiven=true;
          if(data.rewardGold&&typeof gainEventGold==='function') gainEventGold(data.rewardGold);
          _qCheckpointEvent();
        }});
        entry.pendingEvent=cfg.acceptedExit?'afterAccept':'';
        _qCheckpointEvent();
        await _qLeaveTavernAfterLines();
        continue;
      }
      if(event==='afterAccept'){
        const exit=cfg.acceptedExit;
        const lines=_qSpecialLines(data,'A');
        document.body.classList.add('quest-town-event-active');
        await _qShowPortraitPair('village',entry,{withoutB:true,firstLines:lines});
        if(exit&&exit.portrait) await showTavernPortrait(exit.portrait.id,{...exit.portrait,screen:'village',
          face:''});
        await _qStartDialogue(lines,{screen:'village',
          persistentLines:exit.persistentLines,
          lineOptions:(index,line)=>{
            if(line.speaker!=='B') return {};
            if(index===0) return {anchor:exit.firstAnchor};
            if(index===1) return {anchor:exit.secondAnchor};
            return {};
          }});
        entry.acceptedExitDone=true;
        entry.pendingEvent='';
        await _qClearPresentation();
        document.body.classList.remove('quest-town-event-active');
        if(typeof renderVillageScreen==='function') renderVillageScreen();
        _qCheckpointEvent();
        continue;
      }
      if(event==='loss'){
        _qDestroySession=true;
        document.body.classList.add('quest-town-event-active');
        if(opts.waitItem) await _qWaitItemPresentation();
        entry.lossWaitItem=false;
        if(G._isTavern){ G._pendingPanelPlacement=null;_qFormationContext=null;_qReturnToTavernResponse(); }
        const screen=document.querySelector('#scr-battle.active')?'battle':'village';
        const host=_qMovePresentationHost(screen);
        const shade=document.createElement('div');
        shade.className='quest-event-shade is-visible';
        if(host) host.parentElement.insertBefore(shade,host);
        const fleeing=entry.lossKind==='flee';
        const lines=fleeing?[...(data.fled1||[]),...(data.fled2||[])]:[...(data.destroyed1||[]),...(data.destroyed2||[])];
        await _qShowPortraitPair(screen,entry,{portraitB:cfg.lostPortrait,withoutB:fleeing,
          firstLines:lines,...(fleeing?{}:{faceA:'MC001_C',faceB:'MC001_C'}),withoutNamePlate:true});
        await _qStartDialogue(lines,{screen,faceKeys:fleeing?{}:{B:'companion'},
          simultaneousLines:fleeing?undefined:[[1,2]]});
        await _qClearPresentation();
        shade.remove();
        document.body.classList.remove('quest-town-event-active');
        // 最後の会話からgameOverまでを同じ保存状態に保つ。中断した場合は会話を再開。
        gameOver({questLoss:true});
        entry.pendingEvent='';
        break;
      }
      if(event==='towerSacrifice'||event==='towerKeep'){
        _qTowerSession=true;
        document.body.classList.add('tavern-tower-event-active');
        const tower=cfg.towerDeparture;
        const lines=event==='towerSacrifice'?data.initial:data.specialA1;
        await _qShowPortraitPair('village',entry,{portraitB:tower.portrait,firstLines:lines,withoutNamePlate:true});
        await _qStartDialogue(lines,{screen:'village',faceKeys:{B:'companion'},
          lineOptions:(index,line)=>event==='towerSacrifice'&&index===tower.restoreLine-1&&line.speaker==='B'
            ?{anchor:tower.line2Anchor}:{},
          beforeLine:async index=>{
            if(event==='towerSacrifice'&&index===tower.restoreLine-1){
              await _qReplacePortraitWhite(tower.portrait.key,tower.restored,'village');
            }
            if(event==='towerSacrifice'&&index===tower.fadeLine-1){
              await _qFadePortraitRed(tower.restored.id);
            }
          }});
        const departAfter=event==='towerKeep'&&!!entry.towerKeepDepartAfter;
        entry.status='completed';
        entry.towerEventDone=true;
        entry.towerKeepDepartAfter=false;
        entry.description='';
        entry.pendingEvent='';
        await _qClearPresentation();
        document.body.classList.remove('tavern-tower-event-active');
        syncQuestFormationUi();
        _qTowerSession=false;
        _qCheckpointEvent();
        if(departAfter&&typeof villageDepart==='function'){
          _qTowerDepartBypass=true;
          try{ villageDepart(); }finally{ _qTowerDepartBypass=false; }
        }else if(typeof renderVillageScreen==='function') renderVillageScreen();
        continue;
      }
      break;
    }
  }finally{
    _qPendingEventSession=false;
    _qDestroySession=false;
  }
}

// 指輪を取得した瞬間、還魂が確定したカードだけを記録する。途中退出で回収したカードは対象外。
function questCommitAltarSacrifices(cards){
  const entries=_qAllEntries().filter(e=>_qConfig(e).towerDeparture&&!e.companionReleased
    &&['accepted','completed'].includes(e.status));
  entries.forEach(entry=>{
    if(!(cards||[]).some(x=>_qIsRequiredCard(x.card||x,entry))) return;
    entry.companionReleased=true;
    entry.pendingEvent='towerSacrifice';
  });
}
function questOnAltarRingTaken(){
  if(!G._isRingExchange) return;
  const pending=_qAllEntries().find(e=>e.pendingEvent==='towerSacrifice');
  const entry=_qActiveEntry();
  if(pending){
    if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
    _qCheckpointEvent();
    return;
  }
  if(!entry||!_qConfig(entry).towerDeparture||entry.companionReleased) return;
  entry.pendingEvent='towerKeep';
  entry.towerKeepDepartAfter=false;
  if(typeof _syncWaveFacilityCache==='function') _syncWaveFacilityCache();
  _qCheckpointEvent();
  // 還魂しなかった場合は取得直後に会話へ。還魂した場合は「祭壇を離れる」まで待つ。
  void fadeScreenSwitch(()=>openMapVillage({tower:true}));
}
function questBeforeTowerDepart(){
  if(!G||!G._isWaveAltar) return false;
  if(_qTowerDepartBypass) return false;
  if(_qPendingEventSession) return true;
  const entry=_qActiveEntry();
  if(!entry||!_qConfig(entry).towerDeparture) return false;
  entry.pendingEvent=entry.companionReleased?'towerSacrifice':'towerKeep';
  entry.towerKeepDepartAfter=entry.pendingEvent==='towerKeep';
  _qCheckpointEvent();
  questResumePendingEvent();
  return true;
}

function _qAcceptTavernQuest(){
  const entry=_qFormationContext&&_qFormationContext.mode==='accept'?_qFormationContext.entry:_qEntry();
  if(!entry||_qDestroySession||entry.status==='killed'||!_qHasRequiredOnBoard(entry)) return;
  // 提示中に操作窓を開いて無効化していても、受託時点では必ず有効へ戻す。
  // 以後は questRingActionsLocked() が無効化・破棄を選択肢から外す。
  if(_qRequiredRingNo(entry)&&Array.isArray(G.rings)){
    G.rings.forEach(ring=>{ if(_qIsRequiredRing(ring,entry,true)) ring._disabled=false; });
    if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  }
  if(_qIsCargoEntry(entry)) entry.transportCount=_qRequiredOnBoardCount(entry);
  const cfg=_qConfig(entry);
  _qClearCargoRewardCards(entry);
  _qClearOfferCardMarks();
  _qFormationContext=null;
  entry.status='accepted';
  entry.rewardCardTaken=true;
  entry.partedPending=false;
  entry.towerEventDone=false;
  _qAssignRewardMix(entry);
  _qAssignEncounter(entry);
  _qCloseRingOffer(entry,false);
  if(cfg.acceptedExit||cfg.acceptGold) entry.pendingEvent='accepted';
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('town');
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  _qReturnToTavernResponse();
  if(entry.pendingEvent){ questResumePendingEvent();return; }
  const data=_qQuestData(entry.tavernVariant)||{};
  _qStartDialogue(data.accepted,{screen:'village',onDone:_qLeaveTavernAfterLines});
}

function _qRejectTavernQuest(){
  const entry=_qFormationContext&&_qFormationContext.mode==='accept'?_qFormationContext.entry:_qEntry();
  if(!entry||_qDestroySession||entry.status==='killed') return;
  _qFormationContext=null;
  // 依頼カードにアイテムで永久強化を与えたまま拒否した時は特殊拒否。
  // 特殊拒否台詞A1→A2→A3と進んで酒場を出る。以後、依頼は受けられない（再訪時は特殊拒否後台詞だけ）。
  const data=_qQuestData(entry.tavernVariant)||{};
  const specialLines=_qSpecialLines(data,'A');
  const special=!_qConfig(entry).acceptedExit&&_qRequiredCardBuffed(entry)&&specialLines.length;
  if(_qIsCargoEntry(entry)){
    entry.transportCount=0;
    _qClearCargoRewardCards(entry);
  }
  _qClearOfferCardMarks();
  entry.status=special?'rejectedSpecial':'rejected';
  entry.rewardCardTaken=false;
  _qCloseRingOffer(entry,true);
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('town');
    if(special&&saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  _qReturnToTavernResponse();
  syncQuestFormationUi();
  if(special){
    // A1〜A3の表情は各台詞の「表情」列だけで切り替える。
    _qStartDialogue(specialLines,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 表情列が空の旧場面だけ、従来の直書き表情を残す。列に指定がある場面は
  // _qStartDialogue() がシートの値を正として適用する。
  const lines=data.rejected||[];
  if(!_qFirstLineFace(lines,'MC001')) void showTavernPortrait('MC001',{screen:'village',face:'MC001_C'});
  _qStartDialogue(lines,{screen:'village',..._qTavernDialogueOptions(entry,false),onDone:_qLeaveTavernAfterLines});
}

// 会話を終えて酒場を出る時は、台詞枠を消してから少し間をおく（利用者指定）。
async function _qLeaveTavernAfterLines(){
  _qRemoveDialogue();
  await _qWait(TAVERN_LEAVE_DELAY_MS);
  if(!G||!G._isTavern) return;
  return _qLeaveTavernToVillage();
}

function _qLeaveTavernToVillage(){
  // 酒場を出る時も暗転を挟む（立ち絵は暗転で隠れてから消す）。
  if(typeof fadeScreenSwitch==='function') return fadeScreenSwitch(_qLeaveTavernToVillageNow);
  return _qLeaveTavernToVillageNow();
}
function _qLeaveTavernToVillageNow(){
  const formationEntry=_qFormationContext&&_qFormationContext.entry;
  if(formationEntry&&_qConfig(formationEntry).ringOffer&&formationEntry.status!=='accepted'){
    _qCloseRingOffer(formationEntry,true);
  }
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
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
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
  if(!isCurrent()) return;
  const data=_qQuestData(entry.tavernVariant)||{};
  if(entry.status==='completed') return;
  // 失敗した後に入ると、失敗後台詞を出して酒場を出る。
  if(entry.status==='failed'){
    if(_qConfig(entry).noFailureRevisit) return;
    const lines=data.failedAfter||[];
    await _qShowPortraitPair('village',entry,{firstLines:lines,
      faceA:_qFirstLineFace(lines,'MC001')?'':'MC001_C'});
    if(!isCurrent()) return;
    _qStartDialogue(data.failedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 戦闘以外で破壊した後に入ると、非戦闘時死亡後台詞を出して酒場を出る。相手はもういないので A だけ出す。
  if(entry.status==='killed'){
    const lines=data.destroyedAfter||[];
    // 再訪時の表情は「非戦闘時死亡後台詞」の表情列に従う。
    await _qShowPortraitPair('village',entry,{withoutB:true,firstLines:lines});
    if(!isCurrent()) return;
    _qStartDialogue(data.destroyedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // 特殊拒否の後に入ると、特殊拒否後台詞を出して酒場を出る。相手はもう出発しているので A だけ出す。
  if(entry.status==='rejectedSpecial'){
    await _qShowPortraitPair('village',entry,{withoutB:true});
    if(!isCurrent()) return;
    _qStartDialogue(data.specialRejectedAfter,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  // Q007 は受託後に木箱を売るなどして手持ちが減っていても、状態を accepted のまま保つ。
  // その状態での再訪は、通常の「失敗後」台詞だけを出して酒場を出る。
  if(entry.status==='accepted'&&_qIsCargoEntry(entry)
    &&_qCargoHeldCount(entry)<Math.max(0,Math.floor(Number(entry.transportCount)||0))){
    const lines=data.failedAfter||[];
    await _qShowPortraitPair('village',entry,{firstLines:lines});
    if(!isCurrent()) return;
    _qStartDialogue(lines,{screen:'village',onDone:_qLeaveTavernAfterLines});
    return;
  }
  if(_qHasDirectChoice(entry)&&entry.status==='rejected'){
    await _qShowPortraitPair('village',entry);
    if(!isCurrent()) return;
    await _qStartDialogue(data.rejectedAfter,{screen:'village'});
    if(!isCurrent()) return;
    await _qRunDirectTavernChoice(entry,data,true);
    return;
  }
  if(entry.status==='accepted'||entry.status==='rejected'){
    await _qShowTavernResponsePortraits(entry,entry.status==='accepted'?data.acceptedAfter:data.rejectedAfter);
  }else await _qShowPortraitPair('village',entry,{firstLines:data.initial||[]});
  if(!isCurrent()) return;
  if(entry.status==='accepted'){
    _qStartDialogue(data.acceptedAfter,{screen:'village',..._qTavernDialogueOptions(entry,false),onDone:_qLeaveTavernAfterLines});
  }else if(entry.status==='rejected'){
    _qStartDialogue(data.rejectedAfter,{screen:'village',..._qTavernDialogueOptions(entry,false),onDone:_qOpenTavernFormation});
  }else if(_qHasDirectChoice(entry)){
    await _qRunDirectTavernChoice(entry,data);
  }else{
    _qStartDialogue(data.initial,{screen:'village',..._qTavernDialogueOptions(entry,true),onDone:_qOpenTavernFormation});
  }
}

function _qDeliveryGold(data,count,cfg){
  const sheet=data&&data.rewardGoldByCount||{};
  const fallback=cfg&&cfg.fallbackGoldByCount||{};
  return Math.max(0,Number(sheet[count]??sheet[String(count)]??fallback[count]??fallback[String(count)])||0);
}

function _qReplaceCount(lines,count){
  return (lines||[]).map(line=>({...line,text:String(line.text||'').replace(/X/g,String(count))}));
}

// 現在の正式な所持欄だけを列挙する。魔導板の表示用代理配列は同じ参照なら1回だけ数える。
// ショップ在庫・開始スナップショットは所持品ではないため含めない。
function _qOwnedCardLists(){
  const lists=[];
  const seen=new Set();
  const add=list=>{
    if(!Array.isArray(list)||seen.has(list)) return;
    seen.add(list);
    lists.push(list);
  };
  ['mainBoard','globalPanels','spellSlots','rings','inventory','hand','handSlots'].forEach(key=>add(G&&G[key]));
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  add(board&&board.boardCards);
  if(typeof _rewCards!=='undefined') add(_rewCards);
  return lists;
}

// 木箱の所持数は、到着時の回収と酒場の紛失判定で同じ範囲を使う。
function _qCountOwnedCards(cardNo){
  const wanted=String(cardNo||'').trim().toUpperCase();
  if(!wanted) return 0;
  return _qOwnedCardLists().reduce((count,list)=>count+list.filter(card=>_qCardNo(card)===wanted).length,0);
}
function _qCargoHeldCount(entry){
  return _qIsCargoEntry(entry)?_qCountOwnedCards(_qConfig(entry).requiredCardNo):0;
}

function _qTakeOwnedCards(cardNo,entry){
  if(_qIsDebugArrivalReplay(entry)) return _qCountOwnedCards(cardNo);
  const wanted=String(cardNo||'').trim().toUpperCase();
  if(!wanted) return 0;
  const lists=_qOwnedCardLists();
  let count=0;
  lists.forEach(list=>{
    for(let i=0;i<list.length;i++){
      if(_qCardNo(list[i])!==wanted) continue;
      list[i]=null;
      count++;
    }
  });
  if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
  if(typeof renderRewCards==='function') renderRewCards();
  if(typeof renderHandEditor==='function') renderHandEditor();
  if(typeof renderFieldEditor==='function') renderFieldEditor();
  return count;
}

function _qGiveTownArrivalGold(entry,data,cfg,count){
  if(entry.townRewardGiven||_qIsDebugArrivalReplay(entry)) return;
  entry.townRewardGiven=true;
  const gold=_qDeliveryGold(data,count,cfg);
  if(gold&&typeof gainEventGold==='function') gainEventGold(gold);
  if(typeof updateHUD==='function') updateHUD();
}

function _qPayCargoLoss(entry,transportCount,held){
  if(!entry||entry.cargoLossPaid||_qIsDebugArrivalReplay(entry)) return 0;
  const required=Math.max(0,Math.floor(Number(transportCount)||0));
  const owned=Math.max(0,Math.floor(Number(held)||0));
  const lost=Math.max(0,required-owned);
  if(!lost) return 0;
  const due=lost*Q007_CARGO_LOSS_GOLD_PER_BOX;
  // gold_fx.js が表示（-X）・数え下げ・SEを一括して担当する。
  if(typeof spendEventGold!=='function') return 0;
  const paid=spendEventGold(due);
  entry.cargoLossPaid=true;
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()) SaveRun.checkpoint('town');
  return paid;
}

function _qQ002ExpectedCount(entry){
  if(Array.isArray(entry&&entry.rewardMixTargets)) return entry.rewardMixTargets.length;
  return Math.max(0,Math.floor(Number(_qConfig(entry).rewardMix&&_qConfig(entry).rewardMix.count)||0));
}

async function _qRunRecoveryTownArrival(entry,data,cfg){
  await _qStartDialogue((data.initial||[]).slice(0,2),{screen:'village'});
  const mix=_qConfig(entry).rewardMix||{};
  const held=_qTakeOwnedCards(mix.cardNo,entry);
  const expected=_qQ002ExpectedCount(entry);
  if(held===0){
    // Q002_2の到着台詞1〜2は表情指定がないため、Aの通常表情を保つ。
    // A1以降の切り替えは各台詞の表情列が担当する。
    await _qStartDialogue(_qSpecialLines(data,'A'),{screen:'village'});
    return 'completed';
  }
  if(expected>0&&held===expected){
    const lines=_qSpecialLines(data,'B');
    const rewardLine=(data.specialB2||[]).length?(data.specialB1||[]).length:-1;
    await _qStartDialogue(lines,{screen:'village',onLine:index=>{
      if(index===rewardLine) _qGiveTownArrivalGold(entry,data,cfg,held);
    }});
    return 'completed';
  }
  const line3=(data.initial||[]).slice(2,3);
  const line4=_qReplaceCount((data.initial||[]).slice(3,4),held);
  const lines=[...line3,...line4];
  const rewardLine=line4.length?line3.length:-1;
  await _qStartDialogue(lines,{screen:'village',onLine:index=>{
    if(index===rewardLine) _qGiveTownArrivalGold(entry,data,cfg,held);
  }});
  return 'completed';
}

async function _qRunCargoTownArrival(entry,data,cfg){
  await _qStartDialogue((data.initial||[]).slice(0,1),{screen:'village'});
  const held=_qTakeOwnedCards(_qConfig(entry).requiredCardNo,entry);
  const transportCount=Math.max(0,Math.floor(Number(entry.transportCount)||0));
  if(transportCount>=1&&held>=transportCount){
    const line2=_qReplaceCount((data.initial||[]).slice(1,2),transportCount);
    const line3=_qReplaceCount((data.initial||[]).slice(2,3),transportCount);
    const lines=[...line2,...line3];
    const rewardLine=line3.length?line2.length:-1;
    await _qStartDialogue(lines,{screen:'village',onLine:index=>{
      if(index===rewardLine) _qGiveTownArrivalGold(entry,data,cfg,transportCount);
    }});
    return 'completed';
  }
  if(held===0){
    const lines=_qSpecialLines(data,'A');
    await _qStartDialogue(lines,{screen:'village',onLine:index=>{
      // 全部なくした場合は特殊台詞A4を表示した時に支払う。
      if(index===lines.length-1) _qPayCargoLoss(entry,transportCount,held);
    }});
    return 'failed';
  }
  const lines=[
    ...(data.initial||[]).slice(1,2),
    ..._qSpecialLines(data,'B'),
  ];
  await _qStartDialogue(lines,{screen:'village',onLine:index=>{
    // 一部なくした場合は特殊台詞B3を表示した時に支払う。
    if(index===lines.length-1) _qPayCargoLoss(entry,transportCount,held);
  }});
  return 'failed';
}

async function _qFinishTownArrival(entry,shade,status){
  const generation=Number(G._debugEventGeneration)||0;
  entry.status=status==='failed'?'failed':'completed';
  if(entry.status==='failed'){
    entry.rewardCardTaken=false;
    entry.partedPending=false;
  }
  entry.townEventDone=true;
  entry.towerEventDone=true;
  entry.description='';
  _qRemoveDialogue();
  await _qClearPresentation();
  if(generation!==(Number(G._debugEventGeneration)||0)) return;
  if(shade){
    shade.classList.remove('is-visible');
    await _qWait(TAVERN_PORTRAIT_FADE_MS);
    if(generation!==(Number(G._debugEventGeneration)||0)) return;
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
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('town');
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  _qTownSession=false;
}

function _qTownArrivalEntry(){
  const entry=_qArrivalEntry();
  const questCfg=entry&&_qConfig(entry);
  const cfg=questCfg&&questCfg.townArrival;
  if(_qTownSession||!entry||questCfg.completeAt!=='town'||!cfg||entry.townEventDone||!G||G._isWaveAltar) return null;
  if(Number(G._wave)!==Number(questCfg.completeWave)) return null;
  // オンラインのG._waveStageはサーバーのraw step（city=5）で、PvEの旅程配列とは
  // 添字の意味が違う。オンラインだけはサーバーが配った現在ノードを正とする。
  const onlineState=G._onlineMode&&typeof OnlineMatch!=='undefined'&&OnlineMatch
    ?OnlineMatch.getState():null;
  const nodeType=onlineState&&onlineState.nodeType
    ?String(onlineState.nodeType)
    :(typeof waveStageRouteType==='function'?waveStageRouteType(G._wave,G._waveStage):null);
  if(nodeType!=='city') return null;
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
  const generation=Number(G._debugEventGeneration)||0;
  _qTownSession=true;
  entry.townEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('quest-town-event-active');
  const screen=_qPresentationScreen('village');
  const shade=document.createElement('div');
  shade.className='quest-event-shade';
  if(screen) screen.appendChild(shade);
  requestAnimationFrame(()=>shade.classList.add('is-visible'));
  const questCfg=_qConfig(entry);
  const cfg=questCfg.townArrival||{};
  const portraitB=cfg.portraitB;
  const data=_qQuestData(entry.towerVariant)||{};
  const firstLines=questCfg.cargo?(data.initial||[]).slice(0,1):(data.initial||[]).slice(0,2);
  await _qShowPortraitPair('village',entry,{portraitB,firstLines,namePlateVariant:entry.towerVariant,forceNamePlate:true});
  if(generation!==(Number(G._debugEventGeneration)||0)) return false;
  const status=questCfg.cargo
    ?await _qRunCargoTownArrival(entry,data,cfg)
    :await _qRunRecoveryTownArrival(entry,data,cfg);
  if(generation!==(Number(G._debugEventGeneration)||0)) return false;
  await _qFinishTownArrival(entry,shade,status);
  return true;
}

async function _qFinishTowerArrival(entry){
  if(!entry) return;
  const generation=Number(G._debugEventGeneration)||0;
  // クエスト完了（クエスト枠の文が消える時）に、必須カード（ファラ）とも別れる。
  // 指輪輸送は指定台詞で回収済みだが、中断経路への安全策としてここでも印付き個体だけを除く。
  if(!_qIsDebugArrivalReplay(entry)){
    _qRemoveRequiredCards(entry);
    _qRemoveRequiredRing(entry);
  }
  entry.status='completed';
  entry.towerEventDone=true;
  entry.description='';
  _qRemoveDialogue();
  await _qClearPresentation();
  if(generation!==(Number(G._debugEventGeneration)||0)) return;
  document.body.classList.remove('tavern-tower-event-active');
  if(typeof renderVillageScreen==='function') renderVillageScreen();
  syncQuestFormationUi();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpoint('tower');
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  _qTowerSession=false;
}

// この塔で到着の会話が始まるか（クエストを受けた街の塔に、受託中で着いた時）。
function _qTowerArrivalEntry(){
  const entry=_qArrivalEntry();
  if(_qTowerSession||!entry||!G||!G._isWaveAltar||Number(G._wave)!==Number(entry.wave)) return null;
  // 塔で完了すると明示した依頼だけを拾う。町到着・戦闘完了型の「_2」を塔で始めない。
  if(_qConfig(entry).completeAt!=='tower') return null;
  if(_qConfig(entry).towerDeparture) return null;
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
  const generation=Number(G._debugEventGeneration)||0;
  _qTowerSession=true;
  entry.towerEventStarted=true;
  _qEnsureStyle();
  document.body.classList.add('tavern-tower-event-active');
  const facilities=document.getElementById('village-facilities');
  if(facilities) facilities.style.display='none';
  const moves=document.getElementById('village-move-btns');
  if(moves) moves.style.display='none';
  const data=_qQuestData(entry.towerVariant)||{};
  await _qShowPortraitPair('village',entry,{firstLines:data.initial||[]});
  if(generation!==(Number(G._debugEventGeneration)||0)) return;
  const reward=Math.max(0,Number(data.rewardGold)||0);
  const towerCfg=_qConfig(entry).towerArrival||{};
  const rewardLine=Math.max(0,(Number(towerCfg.rewardLine)||1)-1);
  _qStartDialogue(data.initial,{screen:'village',onLine:index=>{
    if(index!==rewardLine||entry.towerRewardGiven||_qIsDebugArrivalReplay(entry)) return;
    entry.towerRewardGiven=true;
    // 指定された台詞で、クエスト由来の印を持つ指輪だけを回収する。
    if(towerCfg.collectRing) _qRemoveRequiredRing(entry);
    // 「+X」と数え上げは共通の所持金演出（gold_fx.js）、音はイベント収入の共通処理が鳴らす。
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
  window.openFiveSaintsSeat=openFiveSaintsSeat;
  window.fiveSaintsAcceptedCount=fiveSaintsAcceptedCount;
  window.fiveSaintsShouldAdvanceToStageFive=fiveSaintsShouldAdvanceToStageFive;
  window.fiveSaintsCurrentTowerResolved=fiveSaintsCurrentTowerResolved;
  window.fiveSaintsRewardTitle=fiveSaintsRewardTitle;
  window.fiveSaintsRewardSlotTitle=fiveSaintsRewardSlotTitle;
  window.fiveSaintsCardCanUseBoardSlot=fiveSaintsCardCanUseBoardSlot;
  window.fiveSaintsSyncTargetGlow=fiveSaintsSyncTargetGlow;
  window.syncFiveSaintsFormationControls=syncFiveSaintsFormationControls;
  window.storyFlipSlidePortraitLeft=_qFlipSlidePortraitLeft;
  window.questTavernRewardTitle=questTavernRewardTitle;
  window.questRingOfferActive=questRingOfferActive;
  window.questRingOfferSlotCount=questRingOfferSlotCount;
  window.questRingOfferCanReturn=questRingOfferCanReturn;
  window.questReturnRingOffer=questReturnRingOffer;
  window.questRingActionsLocked=questRingActionsLocked;
  window.checkQ009CompanionPresence=checkQ009CompanionPresence;
  window.onTavernQuestRewardCardTaken=onTavernQuestRewardCardTaken;
  window.questMixBattleRewards=questMixBattleRewards;
  window.questRewardSlotAcceptsCard=questRewardSlotAcceptsCard;
  window.questRequestDragActive=questRequestDragActive;
  window.questCardLossIsFatal=questCardLossIsFatal;
  window.questForgeChainState=questForgeChainState;
  window.questMarkForgeChainSeen=questMarkForgeChainSeen;
  window.questCutFatalLink=questCutFatalLink;
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
  window.questOnCardLost=questOnCardLost;
  window.questBattleVanishedCard=questBattleVanishedCard;
  window.questDeferGameOver=questDeferGameOver;
  window.questResumePendingEvent=questResumePendingEvent;
  window.questCommitAltarSacrifices=questCommitAltarSacrifices;
  window.questOnAltarRingTaken=questOnAltarRingTaken;
  window.questBeforeTowerDepart=questBeforeTowerDepart;
  window.questEncounterBattlePending=questEncounterBattlePending;
  window.questEncounterEnemySpec=questEncounterEnemySpec;
  window.questIsMagicWolfBattle=questIsMagicWolfBattle;
  window.questIsGarmBattle=questIsGarmBattle;
  window.questBattleCarryActive=questBattleCarryActive;
  window.questBattleStartSpec=questBattleStartSpec;
  window.questHandleMagicWolfVictory=questHandleMagicWolfVictory;
  window.questHandleBattleVictory=questHandleBattleVictory;
  window.questBattleEnemyFled=questBattleEnemyFled;
  window.questBattleEnemyDefeated=questBattleEnemyDefeated;
  window.questPrepareBattleDefeat=questPrepareBattleDefeat;
  window.questPlayBattleDefeatDialogue=questPlayBattleDefeatDialogue;
  window.questFinishBattleDefeat=questFinishBattleDefeat;
  window.questReplaceMagicWolfEnemies=questReplaceMagicWolfEnemies;
}
