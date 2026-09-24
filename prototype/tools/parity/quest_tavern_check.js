'use strict';

// 酒場クエスト（Q003 護衛依頼：エルムの酒場・ファラ）の実ブラウザ回帰検査。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
//   VB_ONLY=部分一致 で節（「酒場」「ショップ」「戦闘」「塔」「祭壇」「所持金」）を絞れる。
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
    await b.until('typeof G!=="undefined"&&window.QUEST_DATA&&window.QUEST_DATA.Q003_1&&typeof PANEL_POOL!=="undefined"&&PANEL_POOL.length>20',30000);
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
  const status=b=>b.run(`return (G.questProgress&&G.questProgress.${QUEST}||{}).status||''`);
  const face=b=>b.run(`const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="F003"]');return f?(f.complete&&f.naturalWidth>0?'表示':'読込失敗'):'なし'`);
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
    await b.run(`startGame(false);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
    await b.run(`G._wave=${WAVE};const d=QUEST_DATA.Q003_1;G.questProgress={${QUEST}:{questId:'${QUEST}',wave:${WAVE},tavernVariant:'Q003_1',towerVariant:'Q003_2',status:'accepted',rewardCardTaken:true,partedPending:false,towerEventStarted:false,towerRewardGiven:false,towerEventDone:false,description:d.description}};
      const panel=PANEL_POOL.find(c=>c&&c._npcCard&&String(c.no||'').toUpperCase()==='NPC001');const card=makePanel(panel.id);card._npcCard=true;card.boss=true;card.directions=[];
      const u=_getPartyBoardUnit();for(let i=0;i<u.boardCards.length;i++) u.boardCards[i]=null;u.boardCards[1]=card;return 1;`);
  }

  const q1=await (async()=>{const b=await newPage();const v=await b.run(`return QUEST_DATA.Q003_1`);const v2=await b.run(`return QUEST_DATA.Q003_2`);await b.close();return {q:v,q2:v2};})();
  ok('クエストシートを見出しで読む（失敗後・非戦闘時・死亡時・逃走時・説明文・報酬）',
    q1.q.initial.length===4&&q1.q.failedAfter.length===1&&q1.q.failedNonBattle.length===1&&q1.q.death.length===1&&q1.q.flee.length===1
    &&/ファラ/.test(q1.q.description)&&q1.q2.rewardGold===100);

  // ── 酒場：会話・編成窓・拒否・受託 ─────────────────────────
  if(section('酒場')){
    const b=await newPage();
    await b.run(`startGame(false);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
    ok('酒場はクエストのある街（エルム）だけ開く',await b.run(`return [0,1,2,3].map(w=>questTavernAvailable(w)).join()==='false,true,false,false'`));
    await openWave(b,WAVE);
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.initial[0]);
    await b.until('[...document.querySelectorAll(".tavern-presentation-host img")].length>=2&&[...document.querySelectorAll(".tavern-presentation-host img")].every(i=>i.complete&&i.naturalWidth>0)');
    ok('立ち絵：MC001（-207,252）とファラの立ち絵MC002（2211,300）',await b.run(`const m=[...document.querySelectorAll('#tavern-presentation-layer img')].map(i=>i.dataset.portraitId+'@'+i.style.left+','+i.style.top);return m.join()==='MC001@-207px,252px,MC002@2211px,300px'`));
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
    await finish(b);
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
    ok('「別れる」でファラが消える（まだ失敗ではない）',await b.run(`return !(G.mainBoard||[]).some(c=>c&&String(c.no).toUpperCase()==='NPC001')&&G.questProgress.${QUEST}.status==='accepted'`));
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
        await status(b)==='failed'&&await b.run(`return !(G.mainBoard||[]).some(c=>c&&String(c.no).toUpperCase()==='NPC001')`));
      await finish(b);
    }
  }

  // ── 塔：到着の会話と報酬 ────────────────────────────────
  if(section('塔')){
    const b=await newPage();
    await acceptedRun(b);
    const gold0=await b.run(`return G.gold`);
    await b.run(`G._wave=${WAVE};G._waveStage=10;G._waveVillage=true;G._isWaveAltar=true;openMapVillage({tower:true,intro:true});return 1;`);
    await waitLine(b,q1.q2.initial[0]);
    await b.until(`G.gold===${gold0}+100`);
    // 「+100」は共通の所持金演出（gold_fx.js）が次のコマで出す。
    await b.until(`[...document.querySelectorAll('.gold-fx-pop')].some(p=>p.textContent==='+100')`,3000);
    ok('塔の地名表示の後に Q003_2、台詞1で +100G（+100 の表示）',true);
    await clickDialogue(b); await waitLine(b,q1.q2.initial[1]); await clickDialogue(b);
    await b.until(`G.questProgress.${QUEST}.status==='completed'`);
    ok('最後のクリックでクエスト完了（説明文を消す）',await b.run(`return G.questProgress.${QUEST}.description===''`));
    await finish(b);
  }

  // ── 所持金：「+X」が消えるまでで 200G 分進む速さ ─────────────────
  if(section('所持金')){
    const b=await newPage();
    await b.run(`startGame(false);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
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
    await b.run(`startGame(false);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
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
