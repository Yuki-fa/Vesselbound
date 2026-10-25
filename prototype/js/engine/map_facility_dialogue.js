// map_facility_dialogue.js — 施設の会話・ストーリー到着・鍛冶屋と宿屋のイベント進行
// 2026-10-25 リファクタリング：map.js から移した（処理は変えていない）。

// ── 施設の会話（会話メッセージシート）─────────────────────
// 現在の街の見出しだけを見る。場面名には「ヴァルガ「宿屋」入店時」のような街名が付く。
function villageTalkEntry(scene){
  const all=(typeof window!=='undefined'&&window.TALK_MESSAGES)||{};
  const town=String((regionInfoForWave(G&&G._wave)||{}).townName||'');
  // 会話シートの街見出しと地域情報の街名は、前半（二つ名）が食い違うことがある
  // （例：地域情報「遥かなる記憶 フォルセティ」／会話「断罪と記憶の村 フォルセティ」。2026-10-04）。
  // 完全一致・包含で見つからなければ、後半の固有名（スペースの後）で引く。
  const properName=v=>String(v||'').trim().split(/[ 　]+/).pop();
  const own=Object.keys(all).find(k=>town&&(k===town||k.includes(town)||town.includes(k)))
    ||Object.keys(all).find(k=>town&&properName(k)&&properName(k)===properName(town));
  const rows=own&&all[own];
  if(!rows) return null;
  const name=Object.keys(rows).find(k=>k===scene||k.endsWith(scene));
  return name?rows[name]:null;
}
// 街の見出しに依存しないストーリー会話。塔の場面も同じ経路でシートから引く。
function storyTalkEntry(scene){
  const all=(typeof window!=='undefined'&&window.TALK_MESSAGES)||{};
  for(const rows of Object.values(all)){
    if(rows&&rows[scene]) return rows[scene];
  }
  return null;
}
function _storyTalkLines(entry){
  return Object.keys(entry||{}).filter(key=>/^台詞\d+$/.test(key))
    .sort((a,b)=>Number(a.replace('\u53f0\u8a5e',''))-Number(b.replace('\u53f0\u8a5e','')))
    .map(key=>entry[key]).filter(line=>line&&String(line.text||'').trim()).map(line=>({...line}));
}
function _storyFirstFace(lines,id){
  const prefix=`${id}_`;
  const line=(lines||[]).find(item=>String(item&&item.face||'').startsWith(prefix));
  return line?String(line.face):undefined;
}

async function _runFirstStoryFacilityEvent(fac){
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
  const suffix=fac.key==='home'?'「ホーム」押下時（一周目）':'「酒場」押下時（一周目）';
  const talk=villageTalkEntry(suffix);
  const lines=_storyTalkLines(talk);
  if(!lines.length) return false;
  if(fac.key==='tavern'&&typeof playFileSfx==='function') playFileSfx('assets/sfx/knock.wav');
  // 1周目のホームは暗転させない（入る時も、会話の後にキャラを消して戻る時も。2026-10-02 利用者指定）。
  const noFade=fac.key==='home';
  if(noFade) _showFacilityGreetingScene(fac,{keepPlate:true});
  else await fadeScreenSwitch(()=>{if(isCurrent()) _showFacilityGreetingScene(fac);});
  if(!isCurrent()) return true;
  if(typeof _qShowPortraitPair==='function'){
    await _qShowPortraitPair('village',{tavernVariant:''},{portraitB:_villageFacilityPortraitB(fac),
      firstLines:lines,faceA:_storyFirstFace(lines,'MC001'),withoutNamePlate:true});
  }
  if(!isCurrent()) return true;
  if(typeof _qStartDialogue==='function') await _qStartDialogue(lines,{screen:'village'});
  if(!isCurrent()) return true;
  const town=String((regionInfoForWave(G&&G._wave)||{}).townName||'');
  if(fac.key==='tavern'&&town.includes('ギャラハ')&&typeof storyFlipSlidePortraitLeft==='function'){
    await storyFlipSlidePortraitLeft('MC001');
  }else if(typeof _qClearPresentation==='function') await _qClearPresentation();
  if(!isCurrent()) return true;
  const back=()=>{
    if(!isCurrent()) return;
    if(typeof _qClearPresentation==='function') void _qClearPresentation({immediate:true});
    _hideFacilityGreetingScene();
    if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('village');
    renderVillageScreen();
  };
  if(noFade) back(); else await fadeScreenSwitch(back);
  return true;
}

function _storyArrivalSpec(options){
  if(!G||G._onlineMode||options&&options.skipStoryArrival) return null;
  const seen=G._facilityTalkSeen||{};
  if(!G._isWaveAltar&&Number(G._wave)===0){
    const first=typeof isFirstStoryRun==='function'&&isFirstStoryRun();
    const repeat=typeof isRepeatStoryRun==='function'&&isRepeatStoryRun();
    if(!first&&!repeat) return null;
    const cycle=first?1:2;
    const key=`story:riese-arrival:${cycle}`;
    // 1周目用・2周目用それぞれ、そのシステムデータ（プロフィール）で一度だけ出す（2026-10-02 利用者指定）。
    const shownInProfile=!G._debugMode&&typeof SaveProfile!=='undefined'&&SaveProfile&&typeof SaveProfile.tutorialShown==='function'
      &&SaveProfile.tutorialShown(key);
    // デバッグでマーク／マスから入場した時は、プロフィール・ランの既読を両方無視する。
    // 施設から戻っただけならランの既読を使い、到着会話を繰り返さない。
    const debugArrival=G._debugMode&&options&&options.intro;
    if((!debugArrival&&seen[key])||shownInProfile) return null;
    return {key,scene:first?'リーゼ地名演出後（一周目）':'リーゼ地名演出後（二周目）',cssClass:'quest-town-event-active'};
  }
  if(G._isWaveAltar&&Number(G._wave)===4
    &&typeof isFirstStoryRun==='function'&&isFirstStoryRun()){
    return {scene:'蝕界の塔到達時（一周目）',portraitB:'MC010',cssClass:'tavern-tower-event-active',finalClear:true};
  }
  return null;
}
function _prepareStoryArrival(options){
  const spec=_storyArrivalSpec(options);
  if(!spec) return null;
  if(typeof _qEnsureStyle==='function') _qEnsureStyle();
  document.body.classList.add(spec.cssClass);
  ['MC001',spec.portraitB].filter(Boolean).forEach(id=>{
    const cfg=window.TAVERN_PORTRAIT_CONFIG&&window.TAVERN_PORTRAIT_CONFIG[id];
    if(!cfg) return;
    const image=new Image();
    image.src=cfg.src;
    if(typeof image.decode==='function') image.decode().catch(()=>{});
  });
  return spec;
}
async function _runStoryArrival(spec){
  if(!spec||G._storyArrivalBusy) return '';
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
  const talk=storyTalkEntry(spec.scene);
  const lines=_storyTalkLines(talk);
  if(!lines.length){
    document.body.classList.remove(spec.cssClass);
    return '';
  }
  G._storyArrivalBusy=true;
  try{
    document.body.classList.add(spec.cssClass);
    if(typeof _qShowPortraitPair==='function'){
      await _qShowPortraitPair('village',{tavernVariant:''},{portraitB:spec.portraitB,
        firstLines:lines,faceA:_storyFirstFace(lines,'MC001'),withoutNamePlate:true});
    }
    if(!isCurrent()) return 'cancelled';
    // 会話シートの「キャラクターの名前」を、最初の台詞で X540 に名前札として出す（リーゼ地名演出後。2026-10-08 利用者指定）。
    const storyName=talk&&talk.characterName?String(talk.characterName).trim():'';
    if(typeof _qStartDialogue==='function') await _qStartDialogue(lines,{screen:'village',
      ...(storyName?{namePlateText:storyName,namePlateX:540,namePlateLine:1,namePlateAnySpeaker:true}:{})});
    if(!isCurrent()) return 'cancelled';
    if(spec.finalClear){
      if(typeof _qClearPresentation==='function') await _qClearPresentation();
      if(!isCurrent()) return 'cancelled';
      if(typeof stopBgm==='function') stopBgm(600);
      if(typeof stopEveryBgmLayer==='function') stopEveryBgmLayer(600);
      const fade=_ensureVillageEnterFadeEl();
      fade.style.transition='opacity .6s ease';
      fade.style.opacity='1';
      await _mapDelay(630);
      if(!isCurrent()) return 'cancelled';
      document.body.classList.remove(spec.cssClass);
      if(typeof gameOver==='function') gameOver({clear:true,firstRunClear:true});
      // 結果画面の黒地に渡した後は、村の暗幕自体は撤去する。
      fade.style.transition='none';
      fade.style.opacity='0';
      return 'final';
    }
    G._facilityTalkSeen=G._facilityTalkSeen||{};
    G._facilityTalkSeen[spec.key]=true;
    if(!G._debugMode&&spec.key&&typeof SaveProfile!=='undefined'&&SaveProfile&&typeof SaveProfile.markTutorialShown==='function'){
      SaveProfile.markTutorialShown(spec.key);
    }
    if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
      const saved=SaveRun.checkpointFacilityTalk(false);
      if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
    }
    if(typeof _qClearPresentation==='function') await _qClearPresentation();
    if(!isCurrent()) return 'cancelled';
    document.body.classList.remove(spec.cssClass);
    renderVillageScreen();
    return 'done';
  }finally{
    if(isCurrent()) G._storyArrivalBusy=false;
  }
}
function _facilityGreetingEntry(fac){
  for(const v of villageFacilityNameVariants(fac&&fac.name)){
    const t=villageTalkEntry(`「${v}」入店時`)||villageTalkEntry(`「${v}」入場時`);
    if(t) return t;
  }
  return null;
}
// 店内の特殊会話は商品画面へ重ね、店のBキャラをそのまま使う。
async function showVillageShopSpecialDialogue(column){
  if(!G||!G._isShop||G._villageFacilityBusy) return;
  const generation=Number(G._debugEventGeneration)||0;
  const isCurrent=()=>generation===(Number(G._debugEventGeneration)||0);
  const fac=villageFacilityList().find(f=>f.key===(G._isItemShop?'item':'shop'));
  const talk=_facilityGreetingEntry(fac),line=talk&&talk[column];
  if(!line) return;
  G._villageFacilityBusy=true;
  document.body.classList.add('shop-special-dialogue-active');
  const shade=document.createElement('div');
  shade.className='quest-event-shade is-visible';
  document.getElementById('scr-battle')?.appendChild(shade);
  try{
    await _qShowPortraitPair('battle',{tavernVariant:''},{portraitB:_villageFacilityPortraitB(fac),firstLines:[line],withoutNamePlate:true});
    if(!isCurrent()) return;
    await _qStartDialogue([line],{screen:'battle'});
    if(!isCurrent()) return;
    _qRemoveDialogue();
    await _qClearPresentation();
  }finally{
    shade.remove();
    if(isCurrent()){
      document.body.classList.remove('shop-special-dialogue-active');
      G._villageFacilityBusy=false;
    }
  }
}
function _facilityArenaAfterTalkEntry(fac){
  const names=villageFacilityNameVariants(fac&&fac.name);
  const isMagicShop=fac&&fac.key==='shop'&&names.some(v=>['魔導取引所','魔導店','魔道店','ショップ'].includes(v));
  if(!isMagicShop) return null;
  for(const v of names){
    const t=villageTalkEntry(`「${v}」入店時（闘技場後）`);
    if(t) return t;
  }
  return null;
}
function _facilityArenaAfterTalkLine(talk){
  const result=G&&G._arenaResults&&G._arenaResults[_waveFacilityCacheKey()];
  if(result&&result.allWon) return talk&&talk['特殊台詞A2']||talk&&talk['台詞1'];
  if(result&&Number(result.prize)<=0) return talk&&talk['特殊台詞A1']||talk&&talk['台詞1'];
  // 古いランセーブなどで結果がまだ無い場合は、通常の台詞へ戻す。
  return talk&&talk['台詞1'];
}
function _facilityArenaAfterTalkKey(){
  return `${_waveFacilityCacheKey()}:shop:arenaAfter`;
}
function _villageDialogueChoices(text){
  return String(text||'').split('\n').map(s=>s.trim()).filter(Boolean).map(s=>{
    const priceMatch=s.match(/([\d,]+)G/);
    const lifeMatch=s.match(/ライフ\s*(\d+)\s*回復/);
    return {text:s,price:priceMatch?Number(priceMatch[1].replace(/,/g,'')):0,
      life:lifeMatch?Number(lifeMatch[1]):0,cancel:s.includes('やめておく')};
  });
}
const FORGE_CHAIN_CUT_SFX='assets/sfx/chain_cut.wav';
const FORGE_CHAIN_CUT_TIMEOUT_MS=6500;
function _waitForgeChainCutSfx(){
  const audio=typeof playFileSfx==='function'?playFileSfx(FORGE_CHAIN_CUT_SFX):null;
  if(!audio||typeof audio.addEventListener!=='function') return Promise.resolve();
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{ if(done) return;done=true;resolve(); };
    audio.addEventListener('ended',finish,{once:true});
    audio.addEventListener('error',finish,{once:true});
    window.setTimeout(finish,FORGE_CHAIN_CUT_TIMEOUT_MS);
  });
}
function _saveForgeChainProgress(){
  if(typeof SaveRun==='undefined'||!SaveRun.enabled()) return null;
  // 特殊会話は通常の鍛冶屋画面を開く前に確定する。
  // 入店後の差分保存だけでは基準時点より前の支払い・効果削除を拾えないため、町状態へ明示的に保存する。
  return SaveRun.checkpoint('town');
}
async function _runVillageForgeChainDialogue(talk,state){
  const intro=state&&state.revisit
    ?[talk['特殊台詞B1']]
    :[talk['特殊台詞A1'],talk['特殊台詞A2']];
  const lines=intro.filter(Boolean);
  if(lines.length) await _qStartDialogue(lines,{screen:'village'});
  const prompt=talk['特殊台詞A3'];
  if(!prompt) return false;
  const choices=_villageDialogueChoices(prompt.text);
  const chosen=await _qStartDialogue([{...prompt,choices}],{screen:'village'});
  if(typeof questMarkForgeChainSeen==='function') questMarkForgeChainSeen();
  if(!chosen||chosen.cancel){
    _saveForgeChainProgress();
    return true;
  }
  const price=Math.max(0,Number(chosen.price)||0);
  if((Number(G.gold)||0)<price){
    _saveForgeChainProgress();
    if(talk['ゴールド不足時台詞']) await _qStartDialogue([talk['ゴールド不足時台詞']],{screen:'village'});
    return true;
  }
  if(typeof spendEventGold==='function') spendEventGold(price);
  else G.gold=Math.max(0,(Number(G.gold)||0)-price);
  await fadeScreenSwitch(async()=>{
    // 暗転中に表情差分を外す。明転時には最初から本体の通常の顔が出る。
    if(typeof showTavernPortrait==='function') await showTavernPortrait('MC001',{screen:'village',face:'MC001_re'});
    if(typeof questCutFatalLink==='function') questCutFatalLink();
    if(typeof updateHUD==='function') updateHUD();
    _saveForgeChainProgress();
    await _waitForgeChainCutSfx();
  });
  // fadeScreenSwitch は明転を開始した時点で戻るため、画面が完全に見えてからA4へ進む。
  await _mapDelay(SCREEN_SWITCH_FADE_IN_MS);
  const after=[talk['特殊台詞A4'],talk['特殊台詞A5']].filter(Boolean);
  if(after.length) await _qStartDialogue(after,{screen:'village'});
  return true;
}
const INN_REST_BG_FADE_MS=650;
const INN_LIFE_FADE_MS=750;
// 施設の会話で、A（MC001）とその施設のB（店員）を**同時に**出し直す（宿屋の暗転明け・闘技場から戻った時）。
// Bは要素ごと消えていることがあるので、先に画像を読み終えてから、両方の準備が済んだ同じフレームでフェードインする
// （_qShowPortraitPair と同じ waitAppearance）。
async function _showFacilityPortraitPair(facKey,options){
  const opts=options||{};
  if(typeof showTavernPortrait!=='function') return;
  const bId=typeof _villageFacilityPortraitB==='function'?_villageFacilityPortraitB({key:facKey}):null;
  const bSrc=bId&&typeof TAVERN_PORTRAIT_CONFIG!=='undefined'&&TAVERN_PORTRAIT_CONFIG[bId]?TAVERN_PORTRAIT_CONFIG[bId].src:'';
  if(bSrc){ try{ const pre=new Image(); pre.src=bSrc; await pre.decode(); }catch(_e){} }
  const count=bId?2:1;let ready=0,release;
  const appearanceReady=new Promise(resolve=>{release=resolve;});
  const waitAppearance=()=>{if(++ready===count) release();return appearanceReady;};
  const shown=[showTavernPortrait('MC001',{screen:'village',face:opts.faceA,waitAppearance})];
  if(bId) shown.push(showTavernPortrait(bId,{screen:'village',waitAppearance}));
  await Promise.all(shown);
}
async function _runVillageInnDialogue(talk){
  if(talk['台詞1']) await _qStartDialogue([talk['台詞1']],{screen:'village'});
  const prompt=talk['台詞2'];
  if(!prompt) return;
  // 回復量が今の減っている分より多い選択肢は出さない（ライフが2以上減っている時だけ「ライフ2回復」を出す。
  // ライフ上限が増えても、減っている分で判定する。2026-09-25 利用者指定）。
  const lifeMax=typeof waveLifeMax==='function'?waveLifeMax():3;
  const lifeNow=Math.max(0,Math.min(lifeMax,Number(G._waveLife==null?lifeMax:G._waveLife)||0));
  const missing=lifeMax-lifeNow;
  const choices=_villageDialogueChoices(prompt.text).filter(c=>c.cancel||!(c.life>0)||c.life<=missing);
  const chosen=await _qStartDialogue([{...prompt,choices}],{screen:'village'});
  if(!chosen||chosen.cancel) return;
  if((Number(G.gold)||0)<chosen.price){
    // ゴールド不足時台詞の表情は、会話メッセージシートの列を使う。
    if(talk['ゴールド不足時台詞']) await _qStartDialogue([talk['ゴールド不足時台詞']],{screen:'village'});
    return;
  }
  G.gold-=chosen.price;
  G._waveInnUsed=G._waveInnUsed||{};
  G._waveInnUsed[_waveFacilityCacheKey()]=true;
  if(typeof playSfx==='function') playSfx('purchase',{group:'ui'});
  // 台詞3を閉じたら暗転する。**暗転でA/Bの立ち絵も両方消し**、明けた時（台詞4の前）に両方を同時に出し直す（2026-10-04 利用者指定）。
  if(talk['台詞3']) await _qStartDialogue([talk['台詞3']],{screen:'village'});
  document.body.classList.add('inn-rest-fading');
  await Promise.all([
    typeof _qClearPresentation==='function'?_qClearPresentation():Promise.resolve(),
    _mapDelay(INN_REST_BG_FADE_MS),
  ]);
  if(typeof playSfx==='function') playSfx('lifeGet',{group:'ui'});
  const max=typeof waveLifeMax==='function'?waveLifeMax():3;
  const previous=Math.max(0,Math.min(max,Number(G._waveLife==null?max:G._waveLife)||0));
  const next=Math.min(max,previous+chosen.life);
  G._waveLife=next;
  const lifeEl=document.getElementById('village-life');
  if(lifeEl){
    lifeEl.innerHTML=Array.from({length:max},(_,i)=>lifeHeartHtml(i>=max-next)).join('');
    Array.from(lifeEl.querySelectorAll('.battle-life-heart')).forEach((heart,i)=>{
      if(i>=max-next&&i<max-previous) heart.classList.add('inn-life-restored');
    });
  }
  if(typeof updateHUD==='function') updateHUD();
  if(typeof SaveRun!=='undefined'&&SaveRun.enabled()){
    const saved=SaveRun.checkpointFacilityTalk(true);
    if(saved&&typeof SaveRun.showAutoSaveIndicator==='function') void SaveRun.showAutoSaveIndicator();
  }
  await _mapDelay(INN_LIFE_FADE_MS);
  // 台詞4は暗転を解いてから出し、クリックしたら宿屋を出る（2026-09-25 利用者指定）。
  // 台詞4がシートに無ければ、暗転のまま宿屋を出る。
  if(talk['台詞4']){
    document.body.classList.add('inn-rest-return');
    document.body.classList.remove('inn-rest-fading');
    // 背景の復帰と一緒に、A（台詞4の表情指定つき）とB（宿屋の店員）を同時に出し直す。
    const restFaceSpec=typeof _qFaceSpec==='function'?_qFaceSpec(talk['台詞4'].face):null;
    const restFace=restFaceSpec&&restFaceSpec.portraitId==='MC001'?restFaceSpec.name:undefined;
    void _showFacilityPortraitPair('inn',{faceA:restFace});
    await _mapDelay(INN_REST_BG_FADE_MS);
    document.body.classList.remove('inn-rest-return');
    await _qStartDialogue([talk['台詞4']],{screen:'village'});
  }
}
// 台詞の間は、村の画面を施設の背景にして施設ボタン類を隠す。
function _showFacilityGreetingScene(fac,options){
  G._facilityGreetingKey=fac.key;
  if(typeof applyScreenAssetBackground==='function') applyScreenAssetBackground('village');
  document.body.classList.add('facility-greeting-active');
  // keepPlate：左上の地名を施設名に変えない（1周目のホーム押下時。2026-10-02 利用者指定）。
  if(options&&options.keepPlate) return;
  const plate=document.getElementById('village-name-plate');
  if(plate) plate.style.display='inline-flex';
  const sub=document.getElementById('village-name-sub');
  const main=document.getElementById('village-name-main');
  if(sub) sub.textContent='';
  if(main) main.textContent=villageFacilityLabelText(fac.name);
}
function _hideFacilityGreetingScene(){
  G._facilityGreetingKey=null;
  document.body.classList.remove('facility-greeting-active');
}
