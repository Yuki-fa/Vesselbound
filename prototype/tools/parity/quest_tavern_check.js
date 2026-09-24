'use strict';

// Q009 酒場・NPC・塔到着の実ブラウザ回帰検査。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {launch}=require('./headless');

const URL='http://127.0.0.1:5500/index.html';
const SCREEN_DIR='/private/tmp/claude-501/-Users-yuki--------Argante------Vesselbound/1c2dd0aa-80d8-4b55-8928-6ab874994dc9/scratchpad';

(async()=>{
  fs.mkdirSync(SCREEN_DIR,{recursive:true});
  const b=await launch({width:1600,height:1000});
  await b.call('Network.enable');
  const result={checks:[],screenshots:[],consoleErrors:[]};
  const ok=(name,value,extra)=>{
    assert.ok(value,name);
    result.checks.push({name,...(extra||{})});
    console.log('OK '+name);
  };
  // headless.js の eval は本文を関数として実行するので、値を返すには return が要る。
  // 1つの式だけを渡した時（`(()=>{...})()` など）は自動で return を付ける。
  const evalPage=expression=>{
    const code=String(expression).trim();
    const iife=/^\(\s*(?:async\s*)?\(\s*\)\s*=>[\s\S]*\)\s*\(\s*\)\s*;?$/.test(code);
    const single=iife||(!/\breturn\b/.test(code)&&!code.replace(/;\s*$/,'').includes(';'));
    return b.eval(single?`return (${code.replace(/;\s*$/,'')});`:code);
  };
  async function wait(expr,timeout=20000){await b.waitFor(expr,timeout,100);}
  async function openWave(wave){
    await evalPage(`G._wave=${Number(wave)};G._waveStage=1;G._waveVillage=true;G._isWaveAltar=false;openMapVillage();`);
    // 入場演出（地名表示）の間は施設ボタンを押しても無視される（_onVillageFacility）。終わるまで待つ。
    await wait('document.querySelector("#scr-village.active")&&document.querySelectorAll(".village-facility").length>0&&!G._villageIntroPlaying',30000);
  }
  async function clickTavern(){
    await evalPage(`(()=>{const el=[...document.querySelectorAll('.village-facility')].find(x=>(x.querySelector('.village-facility-name')?.textContent||x.textContent).trim()==='酒場');if(!el)throw new Error('酒場ボタンなし');el.click();})()`);
  }
  async function clickDialogue(){
    await evalPage(`document.getElementById('tavern-dialogue-layer')?.click()`);
  }
  async function dialogueText(){
    return evalPage(`(()=>({left:document.querySelector('#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="left"] .tavern-dialogue-text')?.textContent||'',right:document.querySelector('#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="right"] .tavern-dialogue-text')?.textContent||''}))()`);
  }
  async function waitLine(line){
    const side=line.speaker==='A'?'left':'right';
    await wait(`document.querySelector('#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="${side}"] .tavern-dialogue-text')?.textContent===${JSON.stringify(line.text)}`);
    const shown=await dialogueText();
    ok(`台詞「${line.text.replace(/\n/g,'／')}」を${line.speaker}側へ表示`,shown[side]===line.text,{side});
    return shown;
  }
  function lines(id){
    return evalPage(`return (window.QUEST_DATA||{})[${JSON.stringify(id)}]||null`);
  }
  async function errors(){
    return b.events.filter(e=>e.method==='Runtime.consoleAPICalled'&&e.params?.type==='error')
      .map(e=>e.params.args.map(a=>a.description||a.value));
  }
  try{
    await b.goto(URL,2500);
    await wait('typeof G!=="undefined"&&typeof PANEL_POOL!=="undefined"&&PANEL_POOL.length>20',30000);
    ok('クエスト・NPCデータを読み込み',await evalPage('return !!window.QUEST_DATA?.Q009_1&&!!window.QUEST_DATA?.Q009_2'));
    ok('NPC001カードをシート行から生成',await evalPage(`(()=>{const c=PANEL_POOL.find(x=>x&&x._npcCard&&String(x.no||'')==='NPC001');return !!c&&c.name.includes('ディナ')&&c.power===3&&c.life===20&&c.color==='黒'&&c.directionCount===0&&c.keywords.includes('防戦')&&c.keywords.includes('帰滅')})()`));

    await evalPage('startGame(false);return true;');
    await wait('G&&G._runId&&G._waveVillage',30000);

    await openWave(1);
    ok('エルムの酒場は押せない',await evalPage(`(()=>{const e=[...document.querySelectorAll('.village-facility')].find(x=>(x.querySelector('.village-facility-name')?.textContent||x.textContent).trim()==='酒場');return !!e&&e.classList.contains('village-facility-disabled')})()`));
    await openWave(2);
    ok('ヴァルガの酒場は押せない',await evalPage(`(()=>{const e=[...document.querySelectorAll('.village-facility')].find(x=>(x.querySelector('.village-facility-name')?.textContent||x.textContent).trim()==='酒場');return !!e&&e.classList.contains('village-facility-disabled')})()`));
    await openWave(3);
    ok('ギャラハの酒場だけ押せる',await evalPage(`(()=>{const e=[...document.querySelectorAll('.village-facility')].find(x=>(x.querySelector('.village-facility-name')?.textContent||x.textContent).trim()==='酒場');return !!e&&!e.classList.contains('village-facility-disabled')})()`));

    await clickTavern();
    await wait('document.getElementById("tavern-dialogue-layer")&&document.querySelector("#tavern-presentation-layer [data-portrait-id=\\"MC001\\"]")');
    await wait('document.querySelector("#tavern-presentation-layer [data-portrait-id=\\"MC004\\"]")');
    // 要素があるだけでなく、画像が実際に読み込めていること（src の書き方の誤りで出なかったことがある）。
    await wait('[...document.querySelectorAll("#tavern-presentation-layer img")].every(i=>i.complete&&i.naturalWidth>0)');
    ok('酒場でMC001→MC004の順に立ち絵を表示',await evalPage(`(()=>{const h=document.getElementById('tavern-presentation-layer');const a=h?.querySelector('[data-portrait-id="MC001"]');const c=h?.querySelector('[data-portrait-id="MC004"]');return !!a&&!!c&&a.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING})()`));
    const q1=await lines('Q009_1');
    ok('Q009_1の台詞1をシートから取得',Array.isArray(q1.initial)&&q1.initial.length===4);
    let shown=await waitLine(q1.initial[0]);
    await clickDialogue();
    shown=await waitLine(q1.initial[1]);
    ok('Aの台詞がBの台詞で消えない',shown.left===q1.initial[1].text&&shown.right===q1.initial[0].text);
    await b.screenshot(`${SCREEN_DIR}/quest_tavern_dialogue.png`);result.screenshots.push(`${SCREEN_DIR}/quest_tavern_dialogue.png`);
    await clickDialogue(); shown=await waitLine(q1.initial[2]);
    ok('同じB側の次の台詞でもAの台詞を保持',shown.left===q1.initial[1].text&&shown.right===q1.initial[2].text);
    ok('複数行台詞を改行表示',await evalPage(`document.querySelector('#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="right"] .tavern-dialogue-text')?.textContent===${JSON.stringify(q1.initial[2].text)}`));
    await clickDialogue(); await waitLine(q1.initial[3]);
    await clickDialogue();
    await wait('document.body.classList.contains("reward-screen-active")&&document.getElementById("reward-move-btns")?.querySelector(".rew-move-btn")');
    const formation=await evalPage(`(()=>{const q=document.querySelector('.reward-prod-quest-body');const card=typeof _rewCards!=='undefined'&&_rewCards.find(x=>x&&x._npcCard);const offer=document.getElementById('reward-offer-section');const pseudo=offer?getComputedStyle(offer,'::before').content:'';return {desc:q?.textContent||'',heading:pseudo,card:card?{name:card.name,boss:!!card.boss,dirs:card.directions||[],price:card._buyPrice,frame:getCardFrameAsset(card),bossFrame:Assets.cards.characterFrame}:null,portEls:document.querySelectorAll('#rw-cards .panel-dir').length,button:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent||''}})()`);
    ok('最後の台詞後に編成窓を表示',formation.desc.includes(q1.description));
    ok('クエスト枠に説明文',formation.desc===q1.description);
    ok('報酬枠見出しが依頼カード',formation.heading.includes('依頼カード'));
    ok('報酬枠にディナ・ボス枠・矢印なし・価格なし',formation.card&&formation.card.name.includes('ディナ')&&formation.card.boss&&formation.card.frame===formation.card.bossFrame&&formation.card.dirs.length===0&&formation.card.price===0&&formation.portEls===0&&formation.button==='拒否');
    await b.screenshot(`${SCREEN_DIR}/quest_tavern_formation.png`);result.screenshots.push(`${SCREEN_DIR}/quest_tavern_formation.png`);

    await evalPage('document.querySelector("#reward-move-btns .rew-move-btn").click()');
    await wait(`document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent===${JSON.stringify(q1.rejected[0].text)}`);
    await clickDialogue(); await wait('document.querySelector("#scr-village.active")&&!document.getElementById("tavern-dialogue-layer")&&!G._isTavern');
    ok('拒否後に酒場から村へ戻る',await evalPage('return !!document.querySelector("#scr-village.active")&&!G._isTavern'));
    await clickTavern();
    await wait(`document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent===${JSON.stringify(q1.rejectedAfter[0].text)}`);
    ok('再入店で拒否後台詞',true);
    await clickDialogue(); await wait('document.body.classList.contains("reward-screen-active")');

    await evalPage('takeRewCard(0);return true;');
    await wait('G._pendingPanelPlacement&&document.querySelector("#hand-slots")');
    const invalid=await evalPage('const before=JSON.stringify(G.mainBoard);const ok=placePendingPanelToSelectedUnit(0);return {ok,before,after:JSON.stringify(G.mainBoard),invalid:!!document.querySelector("#hand-slots .card-empty.invalid-battle-position")}');
    ok('召喚できないマスへの配置を拒否',!invalid.ok&&invalid.before===invalid.after&&invalid.invalid);
    const valid=await evalPage('const ok=placePendingPanelToSelectedUnit(1);return {ok,card:G.mainBoard[1],pending:!!G._pendingPanelPlacement,q:G.questProgress.Q009};');
    ok('召喚可能なマスへ配置',valid.ok&&!valid.pending&&!!valid.card&&valid.card._npcCard===true);
    const acceptedUi=await evalPage(`(()=>({button:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent||'',sell:!!document.querySelector('#hand-slots .shop-board-sell-action'),price:!!document.querySelector('#rw-cards .shop-buy-price')}))()`);
    ok('配置後は受託、売却不可、価格非表示',acceptedUi.button==='受託'&&!acceptedUi.sell&&!acceptedUi.price);
    await evalPage('document.querySelector("#reward-move-btns .rew-move-btn").click()');
    await wait(`document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent===${JSON.stringify(q1.accepted[0].text)}`);
    await clickDialogue(); await wait('document.querySelector("#scr-village.active")&&!document.getElementById("tavern-dialogue-layer")&&!G._isTavern');
    await clickTavern();
    await wait(`document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent===${JSON.stringify(q1.acceptedAfter[0].text)}`);
    await clickDialogue(); await wait('document.querySelector("#scr-village.active")&&!G._isTavern');
    ok('受託後は再入店で受託後台詞から村へ戻る',await evalPage('return G.questProgress.Q009.status==="accepted"&&!G._isTavern'));

    const acceptedSave=await evalPage('return SaveRun.checkpoint("town")');
    ok('受託中のクエストをランセーブへ保存',acceptedSave?.state?.questProgress?.Q009?.status==='accepted'&&acceptedSave.state.questProgress.Q009.rewardCardTaken===true);
    await evalPage('SaveRun.restoreRunState(loadRun());G._waveVillage=false;G._isTavern=false;G._isVillageMenu=false;G.phase="reward";showScreen("battle");goToReward({restoreCheckpoint:true});');
    await wait('document.body.classList.contains("reward-screen-active")');
    ok('再開後も受託状態とクエスト説明文を復元',await evalPage(`return G.questProgress.Q009.status==='accepted'&&document.querySelector('.reward-prod-quest-body')?.textContent===${JSON.stringify(q1.description)}`));

    const failed=await evalPage(`(()=>{const slot=G.mainBoard.findIndex(c=>c&&c._npcCard);const id='dina-headless-death';G._testBattleMode=false;G._kiemetsuAppliedEvents=null;G.mainBoard[slot]._npcCard=true;G._battleCoreEvents=[{type:'battle_start',sides:{p1:[{id,_mainBoardSlot:slot,hp:20,keywords:['帰滅']}] }},{type:'death',side:'p1',unitId:id}];G.allies=[];_removeAbsentKiemetsuCards();return {slot,status:G.questProgress.Q009.status,has:G.mainBoard.some(c=>c&&c._npcCard),desc:document.querySelector('.reward-prod-quest-body')?.textContent||''}})()`);
    ok('ディナ死亡で魔導板から消えクエスト失敗',failed.status==='failed'&&!failed.has&&!failed.desc);

    await evalPage('SaveRun.restoreRunState('+JSON.stringify(acceptedSave)+');G._wave=3;G._waveStage=10;G._waveVillage=true;G._isWaveAltar=true;openMapVillage({tower:true,intro:true});');
    const q2=await lines('Q009_2');
    await waitLine(q2.initial[0]);
    const towerGold=await evalPage(`(()=>{const h=document.getElementById('tavern-presentation-layer');const ids=[...h?.querySelectorAll('.tavern-portrait')||[]].map(x=>x.dataset.portraitId);return {gold:G.gold,card:G.mainBoard.some(c=>c&&c._npcCard),gain:!!document.querySelector('.tavern-gold-gain'),shown:document.getElementById('village-gold')?.textContent||'',portraits:ids,towerName:document.getElementById('village-name-main')?.textContent||'',expectTower:String((regionInfoForWave(3)||{}).towerName||'')}})()`);
    ok('塔の地名表示後にMC001→MC004→Q009_2',towerGold.card&&towerGold.gain&&towerGold.portraits[0]==='MC001'&&towerGold.portraits[1]==='MC004'&&!!towerGold.expectTower&&towerGold.towerName.includes(towerGold.expectTower));
    const savedGoldBefore=acceptedSave.state.player.gold;
    ok('Q009_2台詞1後に+500G',towerGold.gold===savedGoldBefore+500&&Number(String(towerGold.shown).replaceAll(',',''))===towerGold.gold);
    await clickDialogue(); await waitLine(q2.initial[1]); await clickDialogue();
    await wait('!document.getElementById("tavern-dialogue-layer")&&G.questProgress.Q009.status==="completed"');
    ok('塔の最後のクリックで説明文を消去し完了',await evalPage('return G.questProgress.Q009.status==="completed"&&G.questProgress.Q009.description===""&&G.mainBoard.some(c=>c&&c._npcCard)'));

    // 読み込み失敗（Failed to load resource）は URL を名指しで見る。favicon.ico はサーバーに無いだけなので除く。
    // 立ち絵の src を CSS の url("…") のまま渡して読めなかった不具合は、ここで捕まえる。
    const failedUrls=[...new Set(b.events.filter(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400)
      .map(e=>e.params.response.url))].filter(u=>!/\/favicon\.ico$/.test(u));
    ok('読み込みに失敗した素材が無い',failedUrls.length===0,{failedUrls});
    result.consoleErrors=[...b.consoleErrors(),...(await errors())].filter(e=>!/Failed to load resource/.test(String(e)));
    ok('コンソールにエラーが無い',result.consoleErrors.length===0,{errors:result.consoleErrors});
    console.log('RESULT '+JSON.stringify(result));
  }catch(error){
    result.consoleErrors=[...b.consoleErrors(),...(await errors())];
    console.error('RESULT_NG '+JSON.stringify({message:error.message,checks:result.checks,consoleErrors:result.consoleErrors,screenshots:result.screenshots},null,2));
    throw error;
  }finally{
    await b.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
