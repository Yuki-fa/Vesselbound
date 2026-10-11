// peddler.js — 全ゲームを通して初めて戦闘に敗北した時の、行商人のイベント（2026-10-10 利用者指定）。
// 依存: map.js（storyTalkEntry／_storyTalkLines／_mapPickSaleCard／fadeScreenSwitch）, quest.js（立ち絵・会話）,
//       pool.js（drawItems）, reward.js（goToReward）, main.js（_finishWaveBattleDefeat から呼ばれる）
//
// 流れ：敗北の結果表示の「進む」→ camp を背景に行商人の会話（会話メッセージシート「戦闘敗北時（一度だけ）」）
//       → そのまま魔導店と同じ売買の編成画面（敗北後の編成画面を兼ねる。「再戦」で同じ戦闘へ）。
// 2回目以降の敗北は会話を飛ばし、camp の背景に行商人（Bキャラ）だけを出して売買の編成画面にする（2026-10-11 利用者指定）。
// 売買の編成画面は背景を camp のまま（編成画面の背景に切り替えない）、BGM は流さず環境音だけ（2026-10-11 利用者指定）。
// 会話の一度きりの記録はランではなくプロフィール（SaveProfile）に持つ（AGENTS.md §7）。
// 台詞・名前はシートが唯一の出どころ。ここに台詞を書かない。

const DEFEAT_PEDDLER_SCENE='戦闘敗北時（一度だけ）';
const DEFEAT_PEDDLER_PROFILE_KEY='defeatPeddler';
// Bキャラ（行商人）の立ち絵と、この場面だけの吹き出しの尻尾の先（設計座標）。
// 立ち絵の位置は quest.js の TAVERN_PORTRAIT_CONFIG.MC025（X2505・Y685）。
// 吹き出しは通常の右側（尻尾が上）を上下反転し、尻尾を下向きにして先端を Y1140 にする。X は通常の右側のまま
// （2026-10-10 利用者指定。最初は Y685・上向きだった）。
const DEFEAT_PEDDLER_PORTRAIT_B='MC025';
const DEFEAT_PEDDLER_B_TAIL_Y=1140;
const DEFEAT_PEDDLER_B_TAIL='bottom';
// 品揃え：左からキャラクター2枚・エンチャント2枚・アイテム1つ。
const DEFEAT_PEDDLER_CHARACTER_COUNT=2;
const DEFEAT_PEDDLER_ENCHANT_COUNT=2;
const DEFEAT_PEDDLER_ITEM_COUNT=1;

function _defeatPeddlerLines(){
  const talk=typeof storyTalkEntry==='function'?storyTalkEntry(DEFEAT_PEDDLER_SCENE):null;
  return {talk,lines:typeof _storyTalkLines==='function'?_storyTalkLines(talk):[]};
}
// 編成画面の左上の見出し。テキストメッセージシートの「「行商人」見出し」（2026-10-11 利用者指定）。
// 行が無い時だけ、会話シートの「キャラクターの名前」（行商人 ガーラ）の空白より前を使う。
function defeatPeddlerTitle(){
  const name=String((_defeatPeddlerLines().talk||{}).characterName||'').trim();
  const fallback=name.split(/[ 　]+/)[0]||name;
  return typeof textMessage==='function'?textMessage('「行商人」見出し',fallback):fallback;
}
// 行商人の商品枠のうち、アイテムの枠か（左からキャラクター・エンチャントの後）。売切の枠の形に使う。
function defeatPeddlerIsItemSlot(idx){
  return Number(idx)>=DEFEAT_PEDDLER_CHARACTER_COUNT+DEFEAT_PEDDLER_ENCHANT_COUNT;
}
// 敗北の後に行商人が来るか（毎回）。オンライン・試験戦闘・闘技場では来ない。
function defeatPeddlerPending(){
  if(typeof G==='undefined'||!G) return false;
  if(G._onlineMode||G._testBattleMode||G._libraryTestBattleMode||G._arenaActive) return false;
  return true;
}
// 会話（全ゲームを通して初めての敗北の時だけ）を出すか。
function _defeatPeddlerTalkPending(){
  if(G._defeatPeddlerShownThisRun) return false;
  if(!G._debugMode&&typeof SaveProfile!=='undefined'&&SaveProfile&&typeof SaveProfile.tutorialShown==='function'
    &&SaveProfile.tutorialShown(DEFEAT_PEDDLER_PROFILE_KEY)) return false;
  return _defeatPeddlerLines().lines.length>0;
}
// 売買の編成画面：camp の背景と行商人の立ち絵を出し、BGM を止める（環境音だけ）。
// reward.js goToReward() が G._isPeddler の時に呼ぶ（チェックポイントからの再開も同じ）。
function defeatPeddlerApplySaleScene(){
  if(typeof _setOverrideBackground==='function') _setOverrideBackground('camp');
  G._questNoBgm=true;
  if(typeof stopBgm==='function') stopBgm(600);
  if(typeof _syncStageAmbience==='function') _syncStageAmbience();
  const host=typeof _qMovePresentationHost==='function'?_qMovePresentationHost('battle'):null;
  if(!host) return;
  // 魔導店の店の人と同じ扱い（戦闘を始める時に _clearShopPortrait() が消す）。
  host.dataset.shopPortrait='1';
  host.dataset.shopPortraitKey=DEFEAT_PEDDLER_PORTRAIT_B;
  if(!host.querySelector(`.tavern-portrait[data-portrait-key="${DEFEAT_PEDDLER_PORTRAIT_B}"]`)
    &&typeof _placePortraitInstant==='function') _placePortraitInstant(DEFEAT_PEDDLER_PORTRAIT_B,'battle');
}
function _buildDefeatPeddlerStock(){
  const used=new Set();
  const isChar=p=>String(p&&p.category||'')==='キャラクター';
  const isEnchant=p=>['エンチャント','強化'].includes(String(p&&p.category||''));
  const pick=pred=>typeof _mapPickSaleCard==='function'?_mapPickSaleCard(pred,used):null;
  const cards=[
    ...Array.from({length:DEFEAT_PEDDLER_CHARACTER_COUNT},()=>pick(isChar)),
    ...Array.from({length:DEFEAT_PEDDLER_ENCHANT_COUNT},()=>pick(isEnchant)),
  ];
  // 魔導店と同じく、同じ品揃えの中で矢印の向きが完全に同じカードを重ねない。
  if(typeof _dedupePanelDirections==='function') _dedupePanelDirections(cards);
  const items=(typeof drawItems==='function'?drawItems(DEFEAT_PEDDLER_ITEM_COUNT,undefined,{forPeddler:true}):[]).filter(Boolean);
  items.forEach(item=>{
    item._buyPrice=typeof _shopBuyPriceWithRings==='function'&&typeof _itemShopBuyPrice==='function'
      ?_shopBuyPriceWithRings(_itemShopBuyPrice(item)):0;
  });
  while(items.length<DEFEAT_PEDDLER_ITEM_COUNT) items.push(null);
  return [...cards,...items];
}

async function runDefeatPeddlerEvent(){
  G._peddlerStock=_buildDefeatPeddlerStock();
  // 売買の編成画面を開く（camp の背景と行商人は goToReward → defeatPeddlerApplySaleScene が出す）。
  const openSale=()=>{
    if(typeof _qClearPresentation==='function') void _qClearPresentation({immediate:true});
    G._questCampScene=false;
    document.body.classList.remove('tavern-tower-event-active','quest-camp-scene','village-screen-active');
    G._questNoBgm=true;
    if(typeof showScreen==='function') showScreen('battle');
    return typeof goToReward==='function'?goToReward({checkpoint:true,noNewRewards:true,peddler:true}):undefined;
  };
  // 2回目以降：会話を飛ばし、暗転のまま売買の画面へ。
  if(!_defeatPeddlerTalkPending()){
    return fadeScreenSwitch(()=>{
      document.body.classList.remove('battle-victory-pending','battle-turn-active','reward-screen-active','facility-bg-active');
      document.getElementById('scr-battle')?.classList.remove('battle-opening-pending','battle-opening-active');
      G.phase='reward';
      const transitionFade=document.getElementById('battle-transition-fade');
      if(transitionFade) transitionFade.classList.remove('is-visible');
      G._battleFadeHeldByCaller=false;
      return openSale();
    });
  }
  const {talk,lines}=_defeatPeddlerLines();
  // 途中で止まっても二度出ないよう、始めた時点で記録する（デバッグはこのランの間だけ）。
  G._defeatPeddlerShownThisRun=true;
  if(!G._debugMode&&typeof SaveProfile!=='undefined'&&SaveProfile&&typeof SaveProfile.markTutorialShown==='function'){
    SaveProfile.markTutorialShown(DEFEAT_PEDDLER_PROFILE_KEY);
  }
  const rightAnchor=(typeof TAVERN_DIALOGUE_ANCHORS!=='undefined'&&TAVERN_DIALOGUE_ANCHORS.right)||{x:3082,tail:'top'};
  const bAnchor={...rightAnchor,y:DEFEAT_PEDDLER_B_TAIL_Y,tail:DEFEAT_PEDDLER_B_TAIL};
  const shownLines=lines.map(line=>line.speaker==='B'?{...line,anchor:bAnchor}:line);
  // 敗北の結果表示の暗転を、camp へ切り替え終わるまで保つ（quest.js の _qShowGarmCamp と同じ形）。
  await fadeScreenSwitch(()=>{
    document.body.classList.remove('battle-victory-pending','battle-turn-active','reward-screen-active','facility-bg-active');
    // 開戦中に全滅した時も、開戦演出のクリック止め（battle.js）が会話送りを握りつぶさないよう外す。
    document.getElementById('scr-battle')?.classList.remove('battle-opening-pending','battle-opening-active');
    G.phase='reward';
    G._questCampScene=true;
    // camp の会話と続く売買の画面は BGM を流さない（環境音だけ。2026-10-11 利用者指摘：街の曲になっていた）。
    G._questNoBgm=true;
    if(typeof stopBgm==='function') stopBgm(600);
    if(typeof _qEnsureStyle==='function') _qEnsureStyle();
    document.body.classList.add('tavern-tower-event-active','quest-camp-scene');
    if(typeof showScreen==='function') showScreen('village');
    if(typeof renderVillageScreen==='function') renderVillageScreen();
    if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('village');
    if(typeof _syncStageAmbience==='function') _syncStageAmbience();
    const transitionFade=document.getElementById('battle-transition-fade');
    if(transitionFade) transitionFade.classList.remove('is-visible');
    G._battleFadeHeldByCaller=false;
  });
  if(typeof _qShowPortraitPair==='function'){
    await _qShowPortraitPair('village',{tavernVariant:''},{portraitB:DEFEAT_PEDDLER_PORTRAIT_B,
      firstLines:shownLines,faceA:typeof _storyFirstFace==='function'?_storyFirstFace(shownLines,'MC001'):undefined,
      withoutNamePlate:true});
  }
  const name=talk&&talk.characterName?String(talk.characterName).trim():'';
  if(typeof _qStartDialogue==='function') await _qStartDialogue(shownLines,{screen:'village',
    ...(name?{namePlateText:name,namePlateLine:1,namePlateAnySpeaker:true}:{})});
  if(typeof _qRemoveDialogue==='function') _qRemoveDialogue();
  // イベントから編成画面へは暗転しない（camp のイベントと同じ。quest.js _qEventFormationSwitch）。
  return typeof _qEventFormationSwitch==='function'?_qEventFormationSwitch(openSale):openSale();
}
