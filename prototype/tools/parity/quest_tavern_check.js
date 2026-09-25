'use strict';

// 酒場クエスト（Q002 物資回収／Q003 護衛依頼：エルムの酒場・ファラ）の実ブラウザ回帰検査。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
//   VB_ONLY=部分一致 で節（「物資回収」「酒場」「ショップ」「戦闘」「塔」「祭壇」「所持金」）を絞れる。
const assert=require('node:assert/strict');
const {launch,sleep}=require('./headless');

const URL='http://127.0.0.1:5500/index.html';
const ONLY=process.env.VB_ONLY||'';
const QUEST='Q003';
const WAVE=1;

(async()=>{
  const checks=[];
  const ok=(name,value,extra)=>{
    assert.ok(value,`${name}${extra?' '+JSON.stringify(extra):''}`);
    checks.push(name);
    console.log('OK '+name);
  };
  const section=name=>!ONLY||name.includes(ONLY)||ONLY.includes(name);

  const openPages=new Set();
  async function newPage(){
    const b=await launch({width:1600,height:900});
    openPages.add(b);
    await b.call('Network.enable');
    // headless.js の eval は本文を関数として実行するので、値を返すには return が要る。
    // 1つの式だけを渡した時（`(()=>{...})()` など）は自動で return を付ける。
    b.run=expression=>{
      const code=String(expression).trim();
      const iife=/^\(\s*(?:async\s*)?\(\s*\)\s*=>[\s\S]*\)\s*\(\s*\)\s*;?$/.test(code);
      const single=iife||(!/\breturn\b/.test(code)&&!code.replace(/;\s*$/,'').includes(';'));
      return b.eval(single?`return (${code.replace(/;\s*$/,'')});`:code);
    };
    b.until=(expr,timeout=20000)=>b.waitFor(expr,timeout,80);
    await b.goto(URL,2500);
    await b.until('typeof G!=="undefined"&&window.QUEST_DATA&&window.QUEST_DATA.Q003_1&&typeof PANEL_POOL!=="undefined"&&PANEL_POOL.length>20&&typeof questDebugForceWaveQuest==="function"',30000);
    return b;
  }
  const notFading='!document.getElementById("screen-switch-fade")?.classList.contains("is-blocking")&&!G._villageIntroPlaying';
  async function openWave(b,wave){
    await b.run(`G._wave=${wave};G._waveStage=1;G._waveVillage=true;G._isWaveAltar=false;openMapVillage();return 1;`);
    await b.until(`document.querySelector("#scr-village.active")&&document.querySelectorAll(".village-facility").length>0&&${notFading}`,30000);
  }
  async function clickFacility(b,pattern){
    await b.until(notFading);
    await b.run(`(()=>{const re=new RegExp(${JSON.stringify(pattern)});const el=[...document.querySelectorAll('.village-facility')].find(x=>re.test((x.querySelector('.village-facility-name')?.textContent||'').trim()));if(!el) throw new Error('施設ボタンなし '+${JSON.stringify(pattern)});el.click();return 1;})()`);
  }
  // 魔導店へ入る。入店時の台詞（会話メッセージシート）が出たら送る。初回説明はプロフィールで表示済みにしておく。
  async function enterShop(b){
    await b.run(`['shop','item','forge'].forEach(k=>SaveProfile.markTutorialShown('shop:'+k));return 1;`);
    await clickFacility(b,'^魔[導道]店$');
    await b.until('(document.body.classList.contains("reward-screen-active")&&G._isShop)||document.body.classList.contains("facility-greeting-active")&&!!document.querySelector("#tavern-dialogue-layer .tavern-dialogue-text")');
    if(await b.run(`return document.body.classList.contains('facility-greeting-active')`)){
      await sleep(300);
      await clickDialogue(b);
    }
    await b.until('document.body.classList.contains("reward-screen-active")&&G._isShop');
  }
  const lineSel=side=>`#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="${side}"] .tavern-dialogue-text`;
  async function waitLine(b,line){
    const side=line.speaker==='A'?'left':'right';
    await b.until(`document.querySelector('${lineSel(side)}')?.textContent===${JSON.stringify(line.text)}`);
  }
  const clickDialogue=b=>b.run(`document.getElementById('tavern-dialogue-layer')?.click();return 1;`);
  async function waitChoice(b,line){
    const expected=String(line&&line.text||'').split('\n').map(v=>v.trim()).filter(v=>v.startsWith('・'));
    await b.until(`(()=>JSON.stringify([...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-choice')].map(x=>x.textContent))===${JSON.stringify(JSON.stringify(expected))})()`);
    return expected;
  }
  const clickChoice=(b,index)=>b.run(`document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-choice')[${Number(index)}]?.click();return 1;`);
  const statusOf=(b,id)=>b.run(`return (G.questProgress&&G.questProgress[${JSON.stringify(id)}]||{}).status||''`);
  const status=b=>statusOf(b,QUEST);
  const face=b=>b.run(`const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="F003"]');return f?(f.complete&&f.naturalWidth>0?'表示':'読込失敗'):'なし'`);
  async function waitVisibleFace(b,id){
    await b.until(`(()=>{const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')];return fs.length&&fs[fs.length-1].dataset.faceId===${JSON.stringify(id)};})()`,5000);
  }
  async function startRunWithQuest(b,id=QUEST){
    await b.run(`startGame(false);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
    const forced=await b.run(`const e=questDebugForceWaveQuest(${WAVE},${JSON.stringify(id)});return e&&e.questId||'';`);
    assert.equal(forced,id,`エルムのテスト用クエスト固定に失敗 ${id}`);
  }
  async function finish(b){
    const failed=[...new Set(b.events.filter(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400)
      .map(e=>e.params.response.url))].filter(u=>!/\/favicon\.ico$/.test(u))
      // シート本体（Vesselbound_data.xlsx）は利用者が置くもので、無ければ内蔵データへ落ちる（素材ではない）。
      .filter(u=>!/\/Vesselbound_data[^/]*\.xlsx$/.test(u));
    ok('読み込みに失敗した素材が無い',failed.length===0,{failed});
    const errors=b.consoleErrors().filter(e=>!/Failed to load resource/.test(String(e)));
    ok('コンソールにエラーが無い',errors.length===0,{errors:errors.slice(0,4)});
    openPages.delete(b);
    await b.close();
  }
  // 受託済みで、ファラを召喚マス（1）に置いた状態を直接作る（戦闘・塔・ショップの検査用）。
  async function acceptedRun(b){
    await startRunWithQuest(b);
    await b.run(`G._wave=${WAVE};const d=QUEST_DATA.Q003_1;G.questProgress={${QUEST}:{questId:'${QUEST}',wave:${WAVE},tavernVariant:'Q003_1',towerVariant:'Q003_2',status:'accepted',rewardCardTaken:true,partedPending:false,towerEventStarted:false,towerRewardGiven:false,towerEventDone:false,description:d.description}};
      const panel=PANEL_POOL.find(c=>c&&c._npcCard&&String(c.no||'').toUpperCase()==='BC002');const card=makePanel(panel.id);card._npcCard=true;card.boss=true;card.directions=[];
      const u=_getPartyBoardUnit();for(let i=0;i<u.boardCards.length;i++) u.boardCards[i]=null;u.boardCards[1]=card;return 1;`);
  }

  const q1=await (async()=>{const b=await newPage();const v=await b.run(`return QUEST_DATA.Q003_1`);const v2=await b.run(`return QUEST_DATA.Q003_2`);await b.close();return {q:v,q2:v2};})();
  ok('クエストシートを見出しで読む（失敗後・非戦闘時・死亡時・逃走時・説明文・報酬）',
    q1.q.initial.length===4&&q1.q.failedAfter.length===1&&q1.q.failedNonBattle.length===1&&q1.q.death.length===1&&q1.q.flee.length===1
    &&/ファラ/.test(q1.q.description)&&q1.q2.rewardGold===100);

  const q2=await (async()=>{const b=await newPage();const v=await b.run(`return QUEST_DATA.Q002_1`);const v2=await b.run(`return QUEST_DATA.Q002_2`);await b.close();return {q:v,q2:v2};})();
  ok('Q002のクエストシートを見出しで読む（台詞・選択肢・回収数別報酬）',
    q2.q.initial.length===5&&q2.q.initial[4].text.includes('引き受ける')&&q2.q.initial[4].text.includes('断る')
    &&q2.q.accepted.length===1&&q2.q.rejected.length===1&&q2.q.rejectedAfter.length===1
    &&q2.q2.initial.length===3&&q2.q2.specialA1.length===1&&q2.q2.specialA2.length===1
    &&q2.q2.specialB1.length===1&&q2.q2.specialB2.length===1
    &&q2.q2.specialC1.length===1&&q2.q2.specialC2.length===1&&q2.q2.specialC3.length===1
    &&q2.q2.rewardGoldByCount[1]===50&&q2.q2.rewardGoldByCount[2]===120&&q2.q2.rewardGoldByCount[3]===250);

  async function openQ002Choice(b){
    await openWave(b,WAVE);
    await clickFacility(b,'^酒場$');
    for(let i=0;i<4;i++){
      await waitLine(b,q2.q.initial[i]);
      await clickDialogue(b);
    }
    await b.until(`(()=>{const p=[...document.querySelectorAll('#tavern-presentation-layer img.tavern-portrait')];return p.map(x=>x.dataset.portraitId+'@'+x.style.left+','+x.style.top).join()==='MC001@-207px,252px,MC002@2211px,300px'&&p.every(x=>x.complete&&x.naturalWidth>0);})()`);
    return waitChoice(b,q2.q.initial[4]);
  }

  async function beginQ002TownDelivery(b,label){
    await startRunWithQuest(b,'Q002');
    await b.run(`const e=questDebugForceWaveQuest(1,'Q002');e.status='accepted';e.rewardCardTaken=true;e.towerEventDone=false;e.townEventDone=false;e.townEventStarted=false;e.townRewardGiven=false;
      G._wave=2;G._waveStage=4;G._waveVillage=true;G._isWaveAltar=false;G.gold=Number(G.gold)||0;openMapVillage({intro:true});return 1;`);
    await waitLine(b,q2.q2.initial[0]);
    await b.until(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC005"]');return !!(p&&p.style.left==='2320px'&&p.style.top==='380px'&&p.complete&&p.naturalWidth>0);})()`,30000);
    ok(`Q002ヴァルガ到着（${label}）：Bの立ち絵はMC005（X2320・Y380）`,true);
    await clickDialogue(b);
    await waitLine(b,q2.q2.initial[1]);
    await clickDialogue(b);
    await b.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")',30000);
    return b.run(`return G.gold`);
  }

  async function setQ002DeliveryOffers(b,mode){
    return b.run(`(()=>{const mode=${JSON.stringify(mode)};
      const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();
      const byNo=n=>PANEL_POOL.find(c=>c&&no(c)===n);
      const make=n=>{const d=byNo(n);return d?makePanel(d.id):null;};
      const otherDef=PANEL_POOL.find(c=>c&&c.id&&!c._npcCard&&no(c)!=='E101');
      const other=otherDef?makePanel(otherDef.id):null;
      const e1=make('E101'),e2=make('E101'),e3=make('E101');
      const board=_getPartyBoardUnit().boardCards;
      let offers=[];
      if(mode==='two') offers=[e1,e2];
      if(mode==='zero') offers=[];
      if(mode==='mixed') offers=[e1,other];
      if(mode==='other') offers=[other];
      if(mode==='three') offers=[e1,e2,e3];
      if((mode==='mixed'||mode==='other')&&other){ board[0]=null;other._questDeliveryOrigin={arr:'boardCards',idx:0}; }
      _rewCards=offers.filter(Boolean);
      renderRewCards();renderHandEditor();renderMoveSlotsInEnemy();syncTavernFormationControls();
      return {label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||'',e101:_rewCards.filter(c=>no(c)==='E101').length,otherNo:no(other)};
    })()`);
  }

  async function inspectQ002RewardMix(b){
    return b.run(`(()=>{const e=G.questProgress.Q002;const oldWave=G._wave,oldStage=G._waveStage;
      const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();
      const seed=PANEL_POOL.find(c=>c&&c.id&&!c._npcCard&&no(c)!=='E101');
      const all=[];const fromStage=Math.max(0,Number(oldStage)||0);
      for(let wave=1;wave<=2;wave++){const route=_waveRouteForWave(wave)||[];const city=route.indexOf('city');
        const first=wave===1?fromStage+1:1;const last=city>=0?city:route.length;
        for(let stage=first;stage<=last;stage++) if(['battle','elite','boss'].includes(String(route[stage-1]||''))) all.push({wave,stage});}
      const targets=Array.isArray(e&&e.rewardMixTargets)?e.rewardMixTargets:[];
      const targetKeys=new Set(targets.map(t=>String(t.wave)+':'+String(t.stage)));
      const mixAt=(wave,stage)=>{G._wave=wave;G._waveStage=stage;const cards=seed?[makePanel(seed.id),makePanel(seed.id)]:[];const out=questMixBattleRewards(cards);return out.filter(c=>no(c)==='E101').length;};
      const targetCounts=targets.map(t=>mixAt(Number(t.wave),Number(t.stage)));
      const non=all.find(t=>!targetKeys.has(String(t.wave)+':'+String(t.stage)));
      const nonCount=non?mixAt(non.wave,non.stage):null;
      G._wave=oldWave;G._waveStage=oldStage;
      return {assigned:!!(e&&e.rewardMixAssigned),count:targets.length,max:targets.length<=3,targetsValid:targets.every(t=>['battle','elite','boss'].includes(String((_waveRouteForWave(t.wave)||[])[Number(t.stage)-1]||''))),targetCounts,non,nonCount,remaining:Number(e&&e.rewardMixRemaining)};
    })()`);
  }

  // ── Q002「物資回収」：エルムの選択・拒否再訪・報酬混入 ───────────────
  if(section('物資回収')){
    const b=await newPage();
    await startRunWithQuest(b,'Q002');
    const choices=await openQ002Choice(b);
    ok('Q002酒場：Bの立ち絵はMC002、台詞5は「引き受ける／断る」の選択肢',choices.join('|')==='・引き受ける|・断る');
    await clickChoice(b,0);
    await waitLine(b,q2.q.accepted[0]);
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,30000);
    ok('Q002を引き受けると受託台詞の後に酒場を出て、状態がaccepted',await statusOf(b,'Q002')==='accepted');
    const mix=await inspectQ002RewardMix(b);
    ok('Q002受託後の保存状態：ヴァルガまで最大3戦を選び、対象だけE101を1枚、対象外は0枚',
      mix.assigned&&mix.count>0&&mix.max&&mix.targetsValid&&mix.targetCounts.every(n=>n===1)&&!!mix.non&&mix.nonCount===0&&mix.remaining===0,mix);
    await enterShop(b);
    await sleep(400);
    const desc=await b.run(`return document.querySelector('.reward-prod-quest-body p')?.textContent||''`);
    ok('Q002受託後、クエスト枠にシートの説明文が出る',desc===q2.q2.description,{desc,want:q2.q2.description});
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isShop&&${notFading}`,30000);
    await finish(b);

    const r=await newPage();
    await startRunWithQuest(r,'Q002');
    await openQ002Choice(r);
    await clickChoice(r,1);
    await waitLine(r,q2.q.rejected[0]);
    await clickDialogue(r);
    await r.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,30000);
    ok('Q002を断ると拒否台詞の後に酒場を出て、状態がrejected',await statusOf(r,'Q002')==='rejected');
    await clickFacility(r,'^酒場$');
    await waitLine(r,q2.q.rejectedAfter[0]);
    await clickDialogue(r);
    const repeat=await waitChoice(r,q2.q.initial[4]);
    ok('Q002拒否後の再訪で拒否後台詞の後に台詞5の選択肢が再表示される',repeat.join('|')==='・引き受ける|・断る');
    await clickChoice(r,1);
    await waitLine(r,q2.q.rejected[0]);
    await clickDialogue(r);
    await r.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,30000);
    await finish(r);

    // ── Q002ヴァルガ到着：0／1／2／3枚と無関係カード ───────────────
    const a=await newPage();
    const goldA=await beginQ002TownDelivery(a,'E101を2枚');
    const offerA=await setQ002DeliveryOffers(a,'two');
    ok('Q002ヴァルガ：枠にE101を2枚置くとボタンが「渡す」',offerA.e101===2&&offerA.label==='渡す',offerA);
    await a.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    const lineA={...q2.q2.initial[2],text:q2.q2.initial[2].text.replace(/X/g,'2')};
    await waitLine(a,lineA);
    ok('E101を2枚渡すと台詞3のXが2に置換される',true);
    await a.until(`G.gold===${goldA}+120`);
    await clickDialogue(a);
    await a.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterA=await a.run(`const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[]),...(_rewCards||[])];return {gold:G.gold,status:G.questProgress.Q002.status,e101:all.filter(c=>no(c)==='E101').length}`);
    ok('E101を2枚渡すと+120G、E101は無くなり、街へ戻ってcompleted',afterA.gold===goldA+120&&afterA.status==='completed'&&afterA.e101===0,afterA);
    await finish(a);

    const z=await newPage();
    const goldZ=await beginQ002TownDelivery(z,'何も置かない');
    const offerZ=await setQ002DeliveryOffers(z,'zero');
    ok('Q002ヴァルガ：何も置かない時のボタンは「渡さない」',offerZ.e101===0&&offerZ.label==='渡さない',offerZ);
    await z.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(z,q2.q2.specialA1[0]);
    await clickDialogue(z);
    await waitLine(z,q2.q2.specialA2[0]);
    await waitVisibleFace(z,'F003');
    ok('何も渡さない時、特殊台詞A1→A2でAの表情がF003',true);
    await clickDialogue(z);
    await z.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterZ=await z.run(`return {gold:G.gold,status:G.questProgress.Q002.status}`);
    ok('何も渡さない時は所持金が変わらず、街へ戻ってcompleted',afterZ.gold===goldZ&&afterZ.status==='completed',afterZ);
    await finish(z);

    const m=await newPage();
    const goldM=await beginQ002TownDelivery(m,'E101 1枚＋無関係1枚');
    const offerM=await setQ002DeliveryOffers(m,'mixed');
    ok('Q002ヴァルガ：E101＋無関係カードを置くとボタンが「渡す」',offerM.e101===1&&offerM.label==='渡す'&&!!offerM.otherNo,offerM);
    await m.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(m,q2.q2.specialB1[0]);
    await clickDialogue(m);
    const lineM={...q2.q2.specialB2[0],text:q2.q2.specialB2[0].text.replace(/X/g,'1')};
    await waitLine(m,lineM);
    ok('E101 1枚＋無関係カードでは特殊台詞B1→B2、Xが1に置換される',true);
    await m.until(`G.gold===${goldM}+50`);
    await clickDialogue(m);
    await m.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterM=await m.run(`const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[])];return {gold:G.gold,status:G.questProgress.Q002.status,e101:all.filter(c=>no(c)==='E101').length,other:all.filter(c=>no(c)==='${offerM.otherNo}').length}`);
    ok('E101 1枚＋無関係カードでは+50G、無関係カードだけ持ち物へ戻りcompleted',afterM.gold===goldM+50&&afterM.status==='completed'&&afterM.e101===0&&afterM.other===1,afterM);
    await finish(m);

    const c=await newPage();
    const goldC=await beginQ002TownDelivery(c,'無関係カードだけ');
    const offerC=await setQ002DeliveryOffers(c,'other');
    ok('Q002ヴァルガ：無関係カードだけでも枠に置くとボタンが「渡す」',offerC.e101===0&&offerC.label==='渡す'&&!!offerC.otherNo,offerC);
    await c.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(c,q2.q2.specialC1[0]);
    await clickDialogue(c);
    await waitLine(c,q2.q2.specialC2[0]);
    await waitVisibleFace(c,'F005');
    ok('無関係カードだけでは特殊台詞C1→C2でAの表情がF005',true);
    await clickDialogue(c);
    await waitLine(c,q2.q2.specialC3[0]);
    await clickDialogue(c);
    await c.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterC=await c.run(`const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[])];return {gold:G.gold,status:G.questProgress.Q002.status,other:all.filter(c=>no(c)==='${offerC.otherNo}').length}`);
    ok('無関係カードだけではカードが無くなり、所持金変化なしでcompleted',afterC.gold===goldC&&afterC.status==='completed'&&afterC.other===0,afterC);
    await finish(c);

    const t=await newPage();
    const goldT=await beginQ002TownDelivery(t,'E101を3枚');
    const offerT=await setQ002DeliveryOffers(t,'three');
    ok('Q002ヴァルガ：E101を3枚置くとボタンが「渡す」',offerT.e101===3&&offerT.label==='渡す',offerT);
    await t.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    const lineT={...q2.q2.initial[2],text:q2.q2.initial[2].text.replace(/X/g,'3')};
    await waitLine(t,lineT);
    ok('E101を3枚渡すと台詞3のXが3に置換される',true);
    await t.until(`G.gold===${goldT}+250`);
    await clickDialogue(t);
    await t.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterT=await t.run(`const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[]),...(_rewCards||[])];return {gold:G.gold,status:G.questProgress.Q002.status,e101:all.filter(c=>no(c)==='E101').length}`);
    ok('E101を3枚渡すと+250G、E101は無くなり、街へ戻ってcompleted',afterT.gold===goldT+250&&afterT.status==='completed'&&afterT.e101===0,afterT);
    await finish(t);
  }

  // ── 酒場：会話・編成窓・拒否・受託 ─────────────────────────
  if(section('酒場')){
    const b=await newPage();
    await startRunWithQuest(b);
    ok('酒場はクエストのある街（エルム Q003・ヴァルガ Q004）だけ開く',await b.run(`return [0,1,2,3].map(w=>questTavernAvailable(w)).join()==='false,true,true,false'`));
    await openWave(b,WAVE);
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.initial[0]);
    await b.until('[...document.querySelectorAll(".tavern-presentation-host img")].length>=2&&[...document.querySelectorAll(".tavern-presentation-host img")].every(i=>i.complete&&i.naturalWidth>0)');
    ok('立ち絵：MC001（-207,252）とファラの立ち絵MC002（2211,300）',await b.run(`const m=[...document.querySelectorAll('#tavern-presentation-layer img.tavern-portrait')].map(i=>i.dataset.portraitId+'@'+i.style.left+','+i.style.top);return m.join()==='MC001@-207px,252px,MC002@2211px,300px'`));
    await clickDialogue(b); await waitLine(b,q1.q.initial[1]);
    await clickDialogue(b); await waitLine(b,q1.q.initial[2]);
    ok('Aの台詞はBの台詞で消えない',await b.run(`return document.querySelector('${lineSel('left')}')?.textContent===${JSON.stringify(q1.q.initial[1].text)}`));
    await clickDialogue(b); await waitLine(b,q1.q.initial[3]);
    await clickDialogue(b);
    await b.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")');
    await sleep(600);
    const f=await b.run(`(()=>{const p=document.querySelector('.reward-prod-quest-body p');const cs=getComputedStyle(p);const j=getComputedStyle(document.querySelector('.journey-countdown'));
      const card=_rewCards.find(Boolean);return {desc:p.textContent,color:cs.color,journey:j.color,align:cs.textAlign,lhRatio:parseFloat(cs.lineHeight)/parseFloat(cs.fontSize),
      heading:getComputedStyle(document.getElementById('reward-offer-section'),'::before').content,card:card&&card.name,frame:card&&getCardFrameAsset(card)===Assets.cards.characterFrame,
      ports:document.querySelectorAll('#rw-cards .panel-dir').length,button:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent,reset:!!document.querySelector('#reward-move-btns .rew-reset-btn')}})()`);
    ok('編成窓：クエスト説明文・依頼カード・ファラ（ボス枠・矢印なし）・拒否・元に戻す',
      f.desc===q1.q.description&&/依頼カード/.test(f.heading)&&/ファラ/.test(f.card)&&f.frame&&f.ports===0&&f.button==='拒否'&&f.reset,f);
    ok('クエスト説明文：旅の進捗と同じ色・両端揃え・行間はカードのホバー説明と同じ',f.color===f.journey&&f.align==='justify'&&Math.abs(f.lhRatio-1.692857)<0.01,f);
    // 拒否
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(b,q1.q.rejected[0]);
    await sleep(600);
    await b.until(`(()=>{const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="F003"]');return !!(f&&f.complete&&f.naturalWidth>0);})()`,5000).catch(()=>{});
    ok('拒否した時、Aの表情がF003',await face(b)==='表示');
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('拒否した後は酒場を出る',await status(b)==='rejected');
    // 拒否した後はクエスト枠を出さない（魔導店の編成画面で確かめる）
    await enterShop(b);
    await sleep(400);
    ok('拒否した後、クエスト枠の表示は消える',await b.run(`return (document.querySelector('.reward-prod-quest-body')?.textContent||'').trim()===''`));
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isShop&&${notFading}`);
    // 再入店→拒否後台詞→受託
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.rejectedAfter[0]);
    await clickDialogue(b);
    await b.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")');
    await b.run(`takeRewCard(0);return 1;`); await sleep(200);
    ok('ファラは召喚できないマスに置けない',await b.run(`return placePendingPanelToSelectedUnit(0)===false`));
    ok('ファラを召喚マスに置くと受託',await b.run(`const r=placePendingPanelToSelectedUnit(1);return r&&document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent==='受託'`));
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(b,q1.q.accepted[0]);
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('受託して村へ戻る',await status(b)==='accepted');
    // 受託後に再訪すると受託後台詞。台詞が出たら A の表情を F005 にする。
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.acceptedAfter[0]);
    await b.until(`(()=>{const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')];return fs.length&&fs[fs.length-1].dataset.faceId==='F005';})()`,5000);
    ok('受託後台詞が出たら A の表情が F005',true);
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    await finish(b);
  }

  // ── 特殊拒否：依頼カードのファラにアイテムで永久強化を与えてから拒否 ──
  if(section('特殊拒否')){
    const b=await newPage();
    await startRunWithQuest(b);
    await openWave(b,WAVE);
    await clickFacility(b,'^酒場$');
    for(const line of q1.q.initial){ await waitLine(b,line); await clickDialogue(b); }
    await b.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")');
    await sleep(500);
    // ファラを召喚マスへ置き、巨大化の巻物を使い、報酬欄へ戻す。
    const buffed=await b.run(`takeRewCard(0);placePendingPanelToSelectedUnit(1);
      const f=G.mainBoard[1];const p0=f.power;
      G._pendingItemUse={key:'giant_scroll',slotIdx:0};handlePendingItemBoardTarget(1);
      const p1=G.mainBoard[1].power;const mark=!!G.mainBoard[1]._itemBuffed;
      _dragSrc={arr:'boardCards',idx:1,unitIdx:G._selectedBoardUnitIdx};_returnDragSrcToRewardArea();
      renderRewCards();renderHandEditor();
      const back=_rewCards.find(c=>c&&/ファラ/.test(c.name));
      return {p0,p1,mark,back:!!back,backMark:!!(back&&back._itemBuffed),label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent};`);
    ok('ファラにアイテムを使うと印が付き、報酬欄へ戻しても残る',buffed.p1===buffed.p0+5&&buffed.mark&&buffed.back&&buffed.backMark&&buffed.label==='拒否',buffed);
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    const lines=[...q1.q.specialRejected1,...q1.q.specialRejected2];
    ok('特殊拒否台詞が1・2ともシートにある',lines.length===2,{lines});
    // 表情は新しい方を上に重ねてフェードインする（前の表情は少し後で外す）。見えている一番上の表情を見る。
    const faceNow=()=>b.run(`const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')];return fs.length?fs[fs.length-1].dataset.faceId:''`);
    await waitLine(b,lines[0]); await sleep(700);
    ok('特殊拒否台詞1の間は F003',await faceNow()==='F003');
    await clickDialogue(b); await waitLine(b,lines[1]);
    // 表情の切り替え中、毎フレーム「どれか1枚の表情が不透明」であること（元の顔が透けない）。
    await b.run(`window.__faceMin=1;window.__faceFrames=0;const tick=()=>{const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face')];
      if(fs.length){__faceFrames++;__faceMin=Math.min(__faceMin,Math.max(...fs.map(f=>f.complete&&f.naturalWidth>0?Number(getComputedStyle(f).opacity):0)));}
      if(G._isTavern) requestAnimationFrame(tick);};requestAnimationFrame(tick);return 1;`);
    await clickDialogue(b);
    await b.until(`(()=>{const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')];return fs.length&&fs[fs.length-1].dataset.faceId==='F002';})()`,5000);
    ok('特殊拒否台詞2を出し終わったら F002',true);
    await sleep(500);
    const fp=await b.run(`const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="F002"]');const m=document.querySelector('.tavern-portrait[data-portrait-id="MC001"]');
      return {dx:parseFloat(f.style.left)-parseFloat(m.style.left),dy:parseFloat(f.style.top)-parseFloat(m.style.top),w:f.getBoundingClientRect().width/m.getBoundingClientRect().width*1990,min:__faceMin,frames:__faceFrames}`);
    ok('表情の差分は MC001 の左上から X811・Y335（351×351）、切り替え中に元の顔が透けない',fp.dx===811&&fp.dy===335&&Math.abs(fp.w-351)<1&&fp.min>0.99,fp);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('特殊拒否台詞1→2の後、酒場を出る',await status(b)==='rejectedSpecial');
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.specialRejectedAfter[0]);
    await sleep(600);
    ok('再訪時は特殊拒否後台詞（ファラの立ち絵は出さない）',await b.run(`return [...document.querySelectorAll('#tavern-presentation-layer img.tavern-portrait')].map(i=>i.dataset.portraitId).join()==='MC001'`));
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('特殊拒否後台詞の後は酒場を出る（編成窓は開かない）',await status(b)==='rejectedSpecial');
    await finish(b);
  }

  // ── 戦闘以外で必須カードを破壊（生贄人形）──────────────────
  if(section('破壊')){
    // 酒場の依頼の編成中に破壊 → 編成を閉じて非戦闘時死亡時台詞 → 立ち絵を赤く消す → 酒場を出る
    const b=await newPage();
    await startRunWithQuest(b);
    await openWave(b,WAVE);
    await clickFacility(b,'^酒場$');
    for(const line of q1.q.initial){ await waitLine(b,line); await clickDialogue(b); }
    await b.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")');
    await sleep(500);
    // 封印を持つカードを魔導板に置いておく（生贄人形の2段目の相手）。
    await b.run(`takeRewCard(0);placePendingPanelToSelectedUnit(1);
      const sealed=makePanel(PANEL_POOL.find(c=>c.name==='ゴーレム').id);sealed.keywords=(sealed.keywords||[]).concat(['封印5']);
      _getPartyBoardUnit().boardCards[3]=sealed;renderHandEditor();
      const doll=PANEL_POOL.concat(typeof ITEM_POOL!=='undefined'?ITEM_POOL:[]).find(c=>c&&c.itemEffectKey==='sacrifice_doll');
      const slots=_ensureItemSlots();slots[0]=Object.assign({},doll);
      _beginBoardItemUse(0,slots[0]);handlePendingItemBoardTarget(1);return 1;`);
    await sleep(900);
    ok('生贄人形の1段目でファラを壊しても、封印の相手を選ぶまでは進まない',await b.run(`return document.body.classList.contains('reward-screen-active')&&!!G._pendingItemUse&&!document.getElementById('tavern-dialogue-layer')`));
    // 取り消すとファラは戻り、何も起きない
    await b.run(`_cancelPendingItemUse();return 1;`);
    await sleep(900);
    ok('封印の相手を選ぶ前に取り消すと、ファラは戻り進行しない',await b.run(`return document.body.classList.contains('reward-screen-active')&&!document.getElementById('tavern-dialogue-layer')&&/ファラ/.test((G.mainBoard[1]||{}).name||'')&&!!_ensureItemSlots()[0]&&G.questProgress.${QUEST}.status==='offered'`));
    // もう一度使い、封印を減らしてから進む
    await b.run(`const slots=_ensureItemSlots();_beginBoardItemUse(0,slots[0]);handlePendingItemBoardTarget(1);handlePendingItemBoardTarget(3);return 1;`);
    ok('封印を減らしてから進む（封印5→2）',await b.run(`return (G.mainBoard[3].keywords||[]).includes('封印2')`));
    const d1=q1.q.destroyed1;
    ok('非戦闘時死亡時台詞がシートにある',d1.length>=1,{d1,d2:q1.q.destroyed2});
    await waitLine(b,d1[0]);
    await sleep(700);
    const st=await b.run(`return {reward:document.body.classList.contains('reward-screen-active'),village:!!document.querySelector('#scr-village.active'),
      faces:[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')].map(f=>f.dataset.faceId).join(),slot:!!_ensureItemSlots()[0],pending:!!G._pendingItemUse}`);
    ok('編成を閉じて酒場の会話へ（A は F003、生贄人形は使い切り）',!st.reward&&st.village&&st.faces==='F003'&&!st.slot&&!st.pending,st);
    await clickDialogue(b);
    await b.until(`!!document.querySelector('.tavern-portrait.is-dying[data-portrait-id="MC002"]')`,3000);
    ok('台詞1の後、ファラの立ち絵を赤く消す',true);
    // 非戦闘時死亡時台詞2（シートにあれば）は、立ち絵を消した後に出す。
    for(const line of (q1.q.destroyed2||[])){ await waitLine(b,line); await clickDialogue(b); }
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,15000);
    ok('酒場を出て、クエストは killed（ファラは魔導板に戻らない）',await status(b)==='killed'&&await b.run(`return !(G.mainBoard||[]).some(x=>x&&/ファラ/.test(x.name))`));
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.destroyedAfter[0]);
    await sleep(600);
    ok('再訪時は非戦闘時死亡後台詞（立ち絵は A だけ）',await b.run(`return [...document.querySelectorAll('#tavern-presentation-layer img.tavern-portrait')].map(i=>i.dataset.portraitId).join()==='MC001'`));
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('非戦闘時死亡後台詞の後は酒場を出る',await status(b)==='killed');
    await finish(b);

    // 永劫の巻物で破壊 → マスが「永劫の力」に変わってから編成画面を閉じる
    const e=await newPage();
    await startRunWithQuest(e);
    await openWave(e,WAVE);
    await clickFacility(e,'^酒場$');
    for(const line of q1.q.initial){ await waitLine(e,line); await clickDialogue(e); }
    await e.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")');
    await sleep(500);
    await e.run(`takeRewCard(0);placePendingPanelToSelectedUnit(1);
      window.__closedWith=null;window.__animSeen=false;
      const tick=()=>{ if(G._mapForgeAnimating) __animSeen=true;
        if(!document.body.classList.contains('reward-screen-active')){ __closedWith={power:(G.mapPanelPowers||{})[1],anim:!!G._mapForgeAnimating}; return; }
        requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      const sc=PANEL_POOL.concat(typeof ITEM_POOL!=='undefined'?ITEM_POOL:[]).find(x=>x&&x.itemEffectKey==='weakening_scroll');
      const slots=_ensureItemSlots();slots[0]=Object.assign({},sc);
      _beginBoardItemUse(0,slots[0]);handlePendingItemBoardTarget(1);return 1;`);
    await waitLine(e,d1[0]);
    const closed=await e.run(`return {closed:__closedWith,animSeen:__animSeen}`);
    ok('永劫の巻物ではマスが永劫の力に変わってから編成画面を閉じる',closed.animSeen&&closed.closed&&closed.closed.power==='eternal'&&!closed.closed.anim,closed);
    await finish(e);

    // 受託後、魔導店の編成画面で破壊 → オーバーレイをかけて同じ流れ、店に残る
    const c=await newPage();
    await acceptedRun(c);
    await c.run(`const d=PANEL_POOL.find(x=>x.name==='ゴーレム');_getPartyBoardUnit().boardCards[3]=makePanel(d.id);return 1;`);
    await openWave(c,WAVE);
    await enterShop(c);
    await sleep(500);
    await c.run(`const doll=PANEL_POOL.concat(typeof ITEM_POOL!=='undefined'?ITEM_POOL:[]).find(x=>x&&x.itemEffectKey==='sacrifice_doll');
      const g=G.mainBoard[3];g.keywords=(g.keywords||[]).concat(['封印5']);
      const slots=_ensureItemSlots();slots[0]=Object.assign({},doll);
      _beginBoardItemUse(0,slots[0]);handlePendingItemBoardTarget(1);handlePendingItemBoardTarget(3);return 1;`);
    await waitLine(c,d1[0]);
    await sleep(700);
    ok('受託後の破壊はオーバーレイをかけて台詞（店の画面のまま）',await c.run(`return !!document.querySelector('.quest-event-shade.is-visible')&&!!G._isShop`));
    await clickDialogue(c);
    for(const line of (q1.q.destroyed2||[])){ await waitLine(c,line); await clickDialogue(c); }
    await c.until(`!document.querySelector('.quest-event-shade')&&!document.getElementById('tavern-dialogue-layer')`,15000);
    ok('台詞の後はオーバーレイを外して店に残り、クエストは killed',await c.run(`return !!G._isShop&&G.questProgress.${QUEST}.status==='killed'&&!(G.mainBoard||[]).some(x=>x&&/ファラ/.test(x.name))`));
    await finish(c);
  }

  // ── ショップ：「別れる」→ クエスト失敗警告 → 非戦闘時クエスト失敗台詞 → 失敗後の酒場 ──
  if(section('ショップ')){
    const b=await newPage();
    await acceptedRun(b);
    // ファラと別れた後も出撃できるキャラがいないと「店を出る」自体が押せないので、ゴーレムも置く。
    await b.run(`const d=PANEL_POOL.find(x=>x.name==='ゴーレム');_getPartyBoardUnit().boardCards[3]=makePanel(d.id);return 1;`);
    await openWave(b,WAVE);
    await enterShop(b);
    await sleep(500);
    ok('ショップでファラの右上は値段ではなく「別れる」',await b.run(`const btn=document.querySelector('#hand-slots .quest-part-btn');return !!btn&&btn.textContent.trim()==='別れる'`));
    await b.run(`document.querySelector('#hand-slots .quest-part-btn').click();return 1;`); await sleep(300);
    ok('「別れる」でファラが消える（まだ失敗ではない）',await b.run(`return !(G.mainBoard||[]).some(c=>c&&String(c.no).toUpperCase()==='BC002')&&G.questProgress.${QUEST}.status==='accepted'`));
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await b.until('document.getElementById("game-confirm-root")?.classList.contains("is-open")');
    ok('店を出ると「クエスト失敗警告」（削除確認と同じ確認窓）',await b.run(`return document.getElementById('game-confirm-message').textContent===textMessage('クエスト失敗警告','')&&!!textMessage('クエスト失敗警告','')`));
    await b.run(`document.getElementById('game-confirm-cancel').click();return 1;`); await sleep(300);
    ok('キャンセルなら店に残る',await b.run(`return !!G._isShop&&!document.getElementById('game-confirm-root').classList.contains('is-open')`));
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await b.until('document.getElementById("game-confirm-root")?.classList.contains("is-open")');
    await b.run(`document.getElementById('game-confirm-ok').click();return 1;`);
    await waitLine(b,q1.q.failedNonBattle[0]);
    await sleep(600);
    ok('OKで暗幕をかけ、非戦闘時クエスト失敗台詞（Aは最初からF003）',await b.run(`return !!document.querySelector('.quest-event-shade')`)&&await face(b)==='表示');
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isShop&&${notFading}`,30000);
    ok('台詞の後に店を出て、クエストは失敗',await status(b)==='failed');
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.failedAfter[0]);
    await sleep(700);
    ok('失敗後に酒場へ入ると失敗後台詞（Aは最初からF003）',await face(b)==='表示');
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,30000);
    ok('失敗後台詞の後は酒場を出る',true);
    await finish(b);
  }

  // ── 戦闘：ファラが死亡・逃走する時の台詞 ─────────────────────
  if(section('戦闘')){
    for(const kind of ['death','flee']){
      const b=await newPage();
      await acceptedRun(b);
      // 死亡：HP1。逃走：ATK0（コアが逃走させる）。
      await b.run(`const c=_getPartyBoardUnit().boardCards[1];${kind==='death'?'c.life=1;c.hp=1;c.power=1;':'c.power=0;c.atk=0;c.life=60;'}
        const d=PANEL_POOL.find(x=>x.name==='ゴーレム');const g=makePanel(d.id);g.power=99;g.life=999;_getPartyBoardUnit().boardCards[3]=g;
        G._waveVillage=false;_startWaveBattle(1);return 1;`);
      const text=q1.q[kind][0].text;
      await b.until(`document.getElementById('battle-line-text')?.textContent===${JSON.stringify(text)}&&document.getElementById('battle-line-layer')?.classList.contains('is-visible')`,60000);
      ok(`戦闘中：ファラの${kind==='death'?'死亡時':'逃走時'}台詞を出して止まる`,true);
      await sleep(800);
      const still=await b.run(`return document.getElementById('battle-line-text')?.textContent===${JSON.stringify(text)}`);
      ok(`台詞の間は戦闘が止まっている（${kind}）`,still);
      // 文字が見える色であること（以前は味方の吹き出しの文字色が透明で、枠だけが出ていた）。
      const color=await b.run(`return getComputedStyle(document.getElementById('battle-line-text')).color`);
      ok(`台詞の文字が見える（${kind}）`,!/rgba\(0, 0, 0, 0\)|transparent/.test(color),{color});
      // 尻尾・枠には影を付けない（影は両方を含む層に1つだけ）。
      const filters=await b.run(`return ['battle-line-tail','battle-line-bubble'].map(id=>getComputedStyle(document.getElementById(id)).filter)`);
      ok(`尻尾と枠に個別の影が無い（${kind}）`,filters.every(f=>f==='none'),{filters});
      if(process.env.VB_SHOT) await b.screenshot(`${process.env.VB_SHOT}/line_${kind}.png`);
      await b.call('Input.dispatchMouseEvent',{type:'mousePressed',x:800,y:450,button:'left',clickCount:1});
      await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:800,y:450,button:'left',clickCount:1});
      // 勝利の後、報酬画面へ入る（帰滅で消えるのは戦闘の後片付けの時）。
      await b.until(`typeof G._battleProceedAction==='function'`,60000);
      await b.run(`continueAfterBattleVictory(true);return 1;`);
      await b.until('document.body.classList.contains("reward-screen-active")',30000);
      await sleep(800);
      ok(`戦闘後、ファラは魔導板から消え、クエストは失敗（${kind}）`,
        await status(b)==='failed'&&await b.run(`return !(G.mainBoard||[]).some(c=>c&&String(c.no).toUpperCase()==='BC002')`));
      await finish(b);
    }
  }

  // ── 塔：到着の会話と報酬 ────────────────────────────────
  if(section('塔')){
    const b=await newPage();
    await acceptedRun(b);
    const gold0=await b.run(`return G.gold`);
    // 前の街の入場演出が終わってから塔へ入る（演出中に呼ぶと演出が省かれ、実際の到着と違う順になる）。
    await b.until('!G._villageIntroPlaying',30000);
    // 地名表示の間から会話が始まるまで、施設ボタン・出発ボタンが一度も見えないこと（毎フレーム見張る）。
    await b.run(`window.__btnSeen=[];window.__sfx=[];const o=playSfx;window.playSfx=function(n,...a){__sfx.push(n);return o.call(this,n,...a)};
      const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();if(!(r.width>0&&r.height>0))return false;
        let op=1;for(let e=el;e&&e.nodeType===1;e=e.parentElement){const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return false;op*=Number(cs.opacity);}
        return op>0.05;};
      const tick=()=>{document.querySelectorAll('.village-facility,#village-move-btns .rew-move-btn,#village-depart-btn').forEach(el=>{if(vis(el))__btnSeen.push(el.id||el.textContent.trim().slice(0,8));});
        if(!document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')) requestAnimationFrame(tick);};
      requestAnimationFrame(tick);return 1;`);
    await b.run(`G._wave=${WAVE};G._waveStage=10;G._waveVillage=true;G._isWaveAltar=true;openMapVillage({tower:true,intro:true});return 1;`);
    await waitLine(b,q1.q2.initial[0]);
    const seen=await b.run(`return [...new Set(__btnSeen)]`);
    ok('到着の会話が始まる塔では、ボタンが一瞬も出ない',seen.length===0,{seen});
    await b.until(`G.gold===${gold0}+100`);
    // 「+100」は共通の所持金演出（gold_fx.js）が次のコマで出す。
    await b.until(`[...document.querySelectorAll('.gold-fx-pop')].some(p=>p.textContent==='+100')`,3000);
    ok('塔の地名表示の後に Q003_2、台詞1で +100G（+100 の表示）',true);
    ok('お礼のゴールドで income.wav を鳴らす',await b.run(`return __sfx.includes('income')`));
    await clickDialogue(b); await waitLine(b,q1.q2.initial[1]); await clickDialogue(b);
    await b.until(`G.questProgress.${QUEST}.status==='completed'`);
    ok('最後のクリックでクエスト完了（説明文を消す）',await b.run(`return G.questProgress.${QUEST}.description===''`));
    ok('クエスト完了でファラを魔導板から消す',await b.run(`return !(G.mainBoard||[]).some(c=>c&&/ファラ/.test(c.name))`));
    // 達成後の同じ街の酒場：説明は「街「酒場」直下（クエスト完了後）」、ボタンは暗くして入れない。
    await b.until(`!document.getElementById('tavern-dialogue-layer')&&!document.body.classList.contains('tavern-tower-event-active')`,15000);
    await openWave(b,WAVE);
    const tv=await b.run(`const el=[...document.querySelectorAll('.village-facility')].find(x=>/^酒場$/.test((x.querySelector('.village-facility-name')?.textContent||'').trim()));
      return {disabled:el.classList.contains('village-facility-disabled'),desc:(el.querySelector('.village-facility-desc')||{}).textContent,want:textMessage('街「酒場」直下（クエスト完了後）','')}`);
    ok('達成後の酒場は暗くなり、説明はクエスト完了後の文',tv.disabled&&!!tv.want&&tv.desc===tv.want,tv);
    await clickFacility(b,'^酒場$');
    await sleep(1200);
    ok('達成後の酒場には入れない',await b.run(`return !G._isTavern&&!!document.querySelector('#scr-village.active')&&!document.getElementById('tavern-dialogue-layer')`));
    await finish(b);
  }

  // ── 所持金：「+X」が消えるまでで 200G 分進む速さ ─────────────────
  if(section('所持金')){
    const b=await newPage();
    await startRunWithQuest(b);
    await sleep(800);
    const t=await b.run(`const el=document.getElementById('village-gold');const start=Number(el.textContent.replace(/,/g,''));G.gold+=200;const t0=performance.now();
      await new Promise(r=>{const tick=()=>{if(Number(el.textContent.replace(/,/g,''))===start+200) r();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
      return Math.round(performance.now()-t0);`);
    ok('200G は「+X」が消える時間（約1.7秒）で数え終わる',t>1500&&t<1950,{ms:t});
    await finish(b);
  }

  // ── 祭壇：途中離脱の確認窓 ──────────────────────────────
  if(section('祭壇')){
    const b=await newPage();
    await startRunWithQuest(b);
    await b.run(`G._ringOfferPhase=true;G._ringOfferResolved=false;G._boardDiscardCount=1;window.__left=false;_confirmRingExchangeReturn(()=>{window.__left=true;});return 1;`);
    ok('祭壇の途中離脱は削除確認と同じ確認窓',await b.run(`return document.getElementById('game-confirm-root')?.classList.contains('is-open')&&document.getElementById('game-confirm-message').textContent===textMessage('「祭壇」途中離脱時','')`));
    await b.run(`document.getElementById('game-confirm-ok').click();return 1;`);
    ok('OKで離れる',await b.run(`return window.__left===true`));
    await finish(b);
  }
  console.log(`RESULT ${checks.length}項目 OK`);
  globalThis.__questOpenPages=openPages;
})().catch(async error=>{
  console.error('RESULT_NG',error&&error.message||error);
  process.exitCode=1;
  // 失敗してもブラウザを閉じる（閉じないと node が終わらない）。
  process.exit(1);
});
