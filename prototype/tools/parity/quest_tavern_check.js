'use strict';

// 酒場クエスト（Q002／Q003／Q004／Q005／Q006 危険生物護送／Q007）の実ブラウザ回帰検査。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
//   VB_ONLY=部分一致 で節（「クエスト変更」「物資回収」「魔獣撃退」「危険生物護送」「命の鎖」「木箱輸送」「呪いの指輪」「酒場」「施設会話」「ショップ」「闘技場アレス」「闘技場後」「戦闘」「塔」「祭壇」「所持金」「画面仕様」）を絞れる。
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
  globalThis.__questOpenPages=openPages;
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
    // 酒場・宿屋・五聖の座の本来の流れを確かめる検査なので、2周目以降（クリア済み）として動かす。
    // 1周目は酒場が「ノックの会話」だけになる（周回の違いは story_cycle_check.js が確かめる）。
    const _goto=b.goto.bind(b);
    b.goto=async(...args)=>{
      const r=await _goto(...args);
      // リーゼ到着時の周回イベント（地名演出後の会話）も出さない。出ている間に別の街へ飛ぶと会話が残る。
      await b.eval(`if(typeof SaveProfile!=='undefined')SaveProfile.hasClearedRun=()=>true;
        if(typeof _storyArrivalSpec==='function')window._storyArrivalSpec=()=>null;return 1;`).catch(()=>{});
      return r;
    };
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
    await b.until(`(()=>[...document.querySelectorAll('${lineSel(side)}')].some(el=>el.textContent===${JSON.stringify(line.text)}&&el.classList.contains('is-visible')&&Number(getComputedStyle(el).opacity)>.9))()`);
  }
  const clickDialogue=b=>b.run(`document.getElementById('tavern-dialogue-layer')?.click();return 1;`);
  async function waitChoice(b,line){
    const expected=String(line&&line.text||'').split('\n').map(v=>v.trim()).filter(v=>v.startsWith('・'));
    await b.until(`(()=>{const els=[...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-choice')],text=els[0]?.closest('.tavern-dialogue-text');return JSON.stringify(els.map(x=>x.textContent))===${JSON.stringify(JSON.stringify(expected))}&&!!text&&text.classList.contains('is-visible')&&Number(getComputedStyle(text).opacity)>.9})()`);
    return expected;
  }
  const clickChoice=(b,index)=>b.run(`document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-choice')[${Number(index)}]?.click();return 1;`);
  async function waitBattleLine(b,text){
    await b.until(`(()=>{const layer=document.getElementById('battle-line-layer');const line=document.getElementById('battle-line-text');return !!(layer&&layer.classList.contains('is-visible')&&line&&line.textContent===${JSON.stringify(String(text||''))}&&Number(getComputedStyle(layer).opacity)>.9);})()`,60000);
  }
  const clickBattleLine=b=>b.run(`document.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));return 1;`);
  async function clickBattleContinue(b){
    const pos=await b.run(`(()=>{const el=document.getElementById('battle-continue-btn');if(!el)return null;const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
    if(!pos) throw new Error('戦闘結果の「進む」が無い');
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos[0],y:pos[1]});
    await b.call('Input.dispatchMouseEvent',{type:'mousePressed',x:pos[0],y:pos[1],button:'left',clickCount:1});
    await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos[0],y:pos[1],button:'left',clickCount:1});
  }
  const statusOf=(b,id)=>b.run(`return (G.questProgress&&G.questProgress[${JSON.stringify(id)}]||{}).status||''`);
  const status=b=>statusOf(b,QUEST);
  const face=(b,id)=>b.run(`const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="${id}"]');return f?(f.complete&&f.naturalWidth>0?'表示':'読込失敗'):'なし'`);
  async function waitVisibleFace(b,id){
    await b.until(`(()=>{const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')];return fs.length&&fs[fs.length-1].dataset.faceId===${JSON.stringify(id)};})()`,5000);
  }
  // 立ち絵が消えていく間（入れ物へ移された後、または is-visible が外れた後）だけ、
  // 親まで掛け合わせた実際の不透明度で「一番濃い表情 ≧ 立ち絵」を確かめる（下の元の顔が透けないこと）。
  async function startPortraitFadeProbe(b){
    await b.run(`window.__portraitFadeProbe={frames:0,bad:0,done:false};
      const eff=el=>{let o=1;for(let n=el;n&&n.nodeType===1;n=n.parentElement)o*=Number(getComputedStyle(n).opacity);return o;};
      const tick=()=>{const ps=[...document.querySelectorAll('.tavern-presentation-host .tavern-portrait')];
        const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face')];
        ps.forEach(p=>{const leaving=(p.parentElement&&p.parentElement.classList.contains('tavern-portrait-fade-group'))||!p.classList.contains('is-visible');if(!leaving)return;
          const mine=fs.filter(f=>f.dataset.facePortraitId===p.dataset.portraitId);if(!mine.length)return;
          const fo=Math.max(...mine.map(eff)),po=eff(p);
          if(po>0.001){__portraitFadeProbe.frames++;if(fo+0.002<po)__portraitFadeProbe.bad++;}});
        if(document.querySelector('.tavern-presentation-host'))requestAnimationFrame(tick);else __portraitFadeProbe.done=true;};
      requestAnimationFrame(tick);return 1;`);
  }
  async function startRunWithWaveQuest(b,wave,id=QUEST){
    await b.run(`startGame(false);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
    // 別の節で塔・街を移動しても新候補Q006の会話が割り込まないよう、両方を固定する。
    await b.run(`questDebugForceWaveQuest(1,'Q003');questDebugForceWaveQuest(2,'Q005');return 1;`);
    const forced=await b.run(`const e=questDebugForceWaveQuest(${Number(wave)},${JSON.stringify(id)});return e&&e.questId||'';`);
    assert.equal(forced,id,`wave${wave}のテスト用クエスト固定に失敗 ${id}`);
  }
  async function startRunWithQuest(b,id=QUEST){
    return startRunWithWaveQuest(b,WAVE,id);
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
    &&q1.q.specialA1.length===1&&q1.q.specialA2.length===1&&q1.q.specialA3.length===1
    &&/ファラ/.test(q1.q.description)&&q1.q2.rewardGold===100);

  const q4=await (async()=>{const b=await newPage();const v=await b.run(`return QUEST_DATA.Q004_2`);const v1=await b.run(`return QUEST_DATA.Q004_1`);await b.close();return {q:v,q1:v1};})();
  ok('クエストシートの表情列を台詞へ持つ（対象とは独立した画像名）',
    [q1.q.accepted[0],q1.q.rejected[0],q1.q.acceptedAfter[0],q1.q.specialA1[0],q1.q.specialA2[0],
      q1.q.failedAfter[0],q1.q.failedNonBattle[0],q1.q.destroyed1[0],q4.q1.accepted[0],q4.q1.rejected[0],
      q4.q1.acceptedAfter[0],q4.q1.progress1[0],q4.q1.progress3[0],q4.q.initial[0],q4.q.specialA1[0]]
      .every(line=>/^MC001_[A-Z]+$/.test(String(line&&line.face||''))));

  const q2=await (async()=>{const b=await newPage();const v=await b.run(`return QUEST_DATA.Q002_1`);const v2=await b.run(`return QUEST_DATA.Q002_2`);await b.close();return {q:v,q2:v2};})();
  ok('Q002のクエストシートを見出しで読む（台詞・選択肢・回収数別報酬）',
    q2.q.initial.length===5&&q2.q.initial[4].text.includes('引き受ける')&&q2.q.initial[4].text.includes('断る')
    &&q2.q.accepted.length===1&&q2.q.rejected.length===1&&q2.q.rejectedAfter.length===1
    &&q2.q2.initial.length===4&&q2.q2.specialA1.length===1&&q2.q2.specialA2.length===1&&q2.q2.specialA3.length===1
    &&q2.q2.specialB1.length===1&&q2.q2.specialB2.length===1&&q2.q2.specialB3.length===0
    &&q2.q2.specialC1===undefined&&q2.q2.specialC2===undefined&&q2.q2.specialC3===undefined
    &&q2.q2.rewardGoldByCount[1]===50&&q2.q2.rewardGoldByCount[2]===120&&q2.q2.rewardGoldByCount[3]===250);
  ok('Q002の特殊台詞は表情列の指定を持つ',
    [q2.q.accepted[0],q2.q.rejected[0],q2.q2.specialA1[0],q2.q2.specialB1[0]]
      .every(line=>/^MC001_[A-Z]+$/.test(String(line&&line.face||''))));

  const q10=await (async()=>{const b=await newPage();const v=await b.run(`return QUEST_DATA.Q007_1`);const v2=await b.run(`return QUEST_DATA.Q007_2`);await b.close();return {q:v,q2:v2};})();
  ok('Q007はシートの台詞・対象・個数別報酬をQ007_1／Q007_2から読む',
    !!q10.q&&q10.q.initial.length===4&&!!q10.q2&&q10.q2.initial.length===3
    &&q10.q2.specialA1.length===1&&q10.q2.specialA2.length===1&&q10.q2.specialA3.length===1&&q10.q2.specialA4.length===1
    &&q10.q2.specialB1.length===1&&q10.q2.specialB2.length===1&&q10.q2.specialB3.length===1
    &&q10.q2.rewardGoldByCount[1]===75&&q10.q2.rewardGoldByCount[2]===150
    &&q10.q2.rewardGoldByCount[3]===300&&q10.q2.rewardGoldByCount[4]===500&&q10.q2.rewardGoldByCount[5]===800);
  ok('Q007の特殊台詞は表情列の指定を持つ',
    // どの台詞に表情を付けるかはシート次第なので、付いている行の値の形だけを見る。
    (()=>{const all=['initial','specialA1','specialA2','specialA3','specialA4','specialB1','specialB2','specialB3'].flatMap(k=>q10.q2[k]||[]);
      const withFace=all.filter(line=>line&&line.face);
      return withFace.length>0&&withFace.every(line=>/^MC001_[A-Z]+$/.test(String(line.face)));})());

  const completion=await (async()=>{const b=await newPage();const v=await b.run(`(()=>{const result={config:{},tower:{}};for(const id of ['Q002','Q003','Q004','Q005','Q007']){const cfg=QUEST_CONFIG[id]||{};result.config[id]={at:cfg.completeAt||'',wave:Number(cfg.completeWave)||0};G.questProgress={[id]:{questId:id,wave:id==='Q005'?2:id==='Q007'?3:1,status:'accepted',towerEventDone:false}};G._wave=G.questProgress[id].wave;G._isWaveAltar=true;result.tower[id]=_qTowerArrivalEntry()?.questId||'';}return result;})()`);await b.close();return v;})();
  ok('完了地点はQ002/Q007=町、Q003/Q005=塔、Q004=戦闘として明示され、町・戦闘型を塔で拾わない',
    completion.config.Q002.at==='town'&&completion.config.Q002.wave===2
    &&completion.config.Q003.at==='tower'&&completion.config.Q004.at==='battle'
    &&completion.config.Q005.at==='tower'&&completion.config.Q007.at==='town'&&completion.config.Q007.wave===4
    &&completion.tower.Q002===''&&completion.tower.Q004===''&&completion.tower.Q007===''
    &&completion.tower.Q003==='Q003'&&completion.tower.Q005==='Q005',completion);

  const q5=await (async()=>{const b=await newPage();const v=await b.run(`(()=>{const no=r=>String(r&&(r.no||r.No||r['No.']||r.artCode)||'').toUpperCase();return {q:QUEST_DATA.Q005_1,q2:QUEST_DATA.Q005_2,ring:RING_POOL.find(r=>no(r)==='R042')||null,title1:textMessage('「酒場の報酬枠」見出し1',''),title2:textMessage('「酒場の報酬枠」見出し2',''),message:textMessage('「クエスト」説明文1',''),hasRevisitKey:JSON.stringify(window.TALK_MESSAGES||{}).includes('"再訪時台詞"')};})()`);await b.close();return v;})();
  ok('会話メッセージは削除済みの「再訪時台詞」を読まない',!q5.hasRevisitKey,q5);
  ok('Q005は台詞5まで・受託／拒否／再訪・塔の台詞3と報酬200Gをシートから読む',
    q5.q.initial.length===5&&q5.q.accepted.length===1&&q5.q.rejected.length===1
    &&q5.q.acceptedAfter.length===1&&q5.q.rejectedAfter.length===1
    &&q5.q2.initial.length===3&&q5.q2.rewardGold===200,q5);
  ok('Q005の依頼品はR042「呪いの指輪」で、見出し1／2と説明文1がシートにある',
    !!q5.ring&&q5.ring.name==='呪いの指輪'&&q5.title1==='依頼人'&&q5.title2==='依頼品'&&!!q5.message,q5);

  // Q004追撃戦の決着だけを実戦画面で再現する。敵の生成、台詞の受け渡し、
  // 戦闘結果の入口は本編の関数をそのまま使い、コアの勝敗判定だけを最小状態に置き換える。
  async function setupQ004PursuitBoard(b,options){
    const opt=options||{};
    await startRunWithWaveQuest(b,2,'Q004');
    // 村へ入った時の遅れた処理（入場の演出）が終わってから戦闘画面へ切り替える。
    // 待たないと約2秒後に画面が村へ戻り、撤退表示の「進む」が押せなくなる（検査だけの問題）。
    await b.until(`document.querySelector('.screen.active')?.id==='scr-village'&&!G._villageIntroPlaying`,60000);
    await new Promise(resolve=>setTimeout(resolve,2500));
    const code=String(opt.enemyCode||'EN027').toUpperCase();
    return b.run(`(()=>{
      if(typeof _skipStartupIntro==='function') window.removeEventListener('pointerdown',_skipStartupIntro,true);
      const code=${JSON.stringify(code)};
      const enemyNo=def=>String(def&&(def.artCode||def._artCode||def.No||def.no||def['No.']||def.code)||'').toUpperCase();
      const def=ENEMY_POOL.find(row=>enemyNo(row)===code);
      if(!def) throw new Error('Q004検査用の敵定義が無い '+code);
      const entry=questDebugForceWaveQuest(2,'Q004');
      Object.assign(entry,{status:'accepted',encounterTarget:{wave:2,stage:6},encounterPhase:'garm',
        encounterFled:false,encounterDefeated:${!!opt.defeated},encounterRewardGiven:false,towerEventDone:false});
      const unit=_mkEnemy(8,12,def.name,def.icon,def.grade||1,0,[...(def.keywords||[])],def.race||'-');
      _applyEnemyDefAbilities(unit,def);
      unit.id='q004-pursuit-enemy';unit.side='p2';unit.lane='rear';unit._visualShift=false;
      if(code==='EN027') unit._questGarm=true;
      const slots=14;
      G.allies=new Array(slots).fill(null);
      G.enemies=new Array(slots).fill(null);G.enemies[0]=unit;
      G._wave=2;G._waveStage=6;G._waveBattleType='battle';
      G._mapBattle={mapIndex:2,nodeId:'quest-garm',type:'battle',floor:1,forcedBoss:false,turn:0};
      G._waveLife=3;G._waveRetryEnemyKey='old-retry';G._waveIsRetry=true;
      G._waveRewardCount=null;G._waveWithdraw=false;G._battleDefeatHandled=false;
      G._battleVictoryPending=false;G._battlePhaseRunning=false;G._battleProceedAction=null;
      G.phase='battle';document.body.classList.remove('reward-screen-active','battle-victory-pending');
      showScreen('battle');renderAll();
      return {id:unit.id,name:unit.name,gold:Number(G.gold)||0,death:[...(unit.deathBattleLines||[])],
        flee:[...(unit.fleeBattleLines||[])],playerDefeat:[...(unit.playerDefeatBattleLines||[])]};
    })()`);
  }

  // ── Q004「魔獣撃退」：追撃戦の敗北・逃走・討伐後撤退 ────────────
  if(section('魔獣撃退')){
    const lost=await newPage();
    const lostEnemy=await setupQ004PursuitBoard(lost);
    ok('魔獣撃退：EN027の死亡・逃走・プレイヤー敗北台詞を敵定義からユニットへ渡す',
      lostEnemy.death.length>0&&lostEnemy.flee.length>0&&lostEnemy.playerDefeat.length>0,lostEnemy);
    await lost.run(`handleWaveBattleDefeat();return 1;`);
    await waitBattleLine(lost,lostEnemy.playerDefeat[0]);
    const lostPaused=await lost.run(`(()=>{const e=G.questProgress.Q004||{};return {status:e.status,phase:e.encounterPhase,
      stage:G._waveStage,retry:G._waveRetryEnemyKey,isRetry:G._waveIsRetry,
      proceed:typeof G._battleProceedAction==='function',cutin:!!document.getElementById('battle-continue-btn')};})()`);
    ok('魔獣撃退 B-1：ガルムの敗北台詞中は撤退表示へ進まず、クエストを失敗にして再戦鍵を消す',
      lostPaused.status==='failed'&&lostPaused.phase==='failed'&&lostPaused.stage===6
      &&lostPaused.retry===null&&!lostPaused.isRetry&&!lostPaused.proceed&&!lostPaused.cutin,lostPaused);
    await clickBattleLine(lost);
    await waitLine(lost,q4.q1.specialA1[0]);
    ok('魔獣撃退 B-1：敵の敗北台詞の後に Q004_1 特殊台詞A1を戦闘画面で出す',
      !(await lost.run(`return typeof G._battleProceedAction==='function'||!!document.getElementById('battle-continue-btn')`)));
    await clickDialogue(lost);
    await lost.until(`typeof G._battleProceedAction==='function'&&!!document.getElementById('battle-continue-btn')`,60000);
    ok('魔獣撃退 B-1：特殊台詞A1を送った後に撤退表示へ進む',
      await lost.run(`return G._waveStage===6&&G._waveWithdraw===true`));
    await clickBattleContinue(lost);
    await lost.until(`G.questProgress?.Q004?.status==='failed'&&Number(G._waveStage)===7&&G._waveBattleType==null&&document.body.classList.contains('reward-screen-active')`,60000);
    const lostDone=await lost.run(`return {status:G.questProgress.Q004.status,stage:G._waveStage,retry:G._waveRetryEnemyKey,isRetry:G._waveIsRetry,withdraw:G._waveWithdraw}`);
    ok('魔獣撃退 B-1：撤退後はステージを通過し、失敗のまま追撃戦を再戦しない',
      lostDone.status==='failed'&&lostDone.stage===7&&lostDone.retry===null&&!lostDone.isRetry&&!lostDone.withdraw,lostDone);
    await finish(lost);

    const fled=await newPage();
    const fledEnemy=await setupQ004PursuitBoard(fled);
    await fled.run(`(()=>{
      const unit=G.enemies.find(Boolean);const ev={type:'fled',side:'p2',unitId:unit.id};
      window.__q004FleeTrace=[];window.__q004FleeDone=false;window.__q004FleeError='';
      const original=window.playFledVfx;window.__q004FleeOriginal=original;
      window.playFledVfx=async(...args)=>{__q004FleeTrace.push('fled');return typeof original==='function'?original(...args):undefined;};
      const recorded=questBattleEnemyFled([ev],(side,id)=>G.enemies.find(x=>x&&x.id===id));
      window.__q004FleePromise=presentFledEvent(ev,{
        findUnit:(side,id)=>G.enemies.find(x=>x&&x.id===id),
        showLines:async(...args)=>{__q004FleeTrace.push('line:start');await showBattleUnitOutcomeLines(...args);__q004FleeTrace.push('line:end');},
        removeFromBoard:(target)=>{__q004FleeTrace.push('remove');const i=G.enemies.indexOf(target);if(i>=0)G.enemies[i]=null;},
        compact:()=>renderAll(),
      }).then(()=>{__q004FleeTrace.push('done');__q004FleeDone=true;window.playFledVfx=original;})
        .catch(error=>{__q004FleeError=String(error&&error.stack||error);__q004FleeDone=true;window.playFledVfx=original;});
      return recorded;
    })()`);
    await waitBattleLine(fled,fledEnemy.flee[0]);
    const fleePaused=await fled.run(`(()=>{const u=G.enemies.find(Boolean),e=G.questProgress.Q004;return {trace:[...__q004FleeTrace],fled:!!u?._fled,onBoard:!!u,done:__q004FleeDone,phase:e.encounterPhase,status:e.status};})()`);
    ok('魔獣撃退 B-2：逃走台詞中は FLED と盤面除外を始めず、追撃結果だけを記録す',
      fleePaused.trace.join('|')==='line:start'&&!fleePaused.fled&&fleePaused.onBoard&&!fleePaused.done
      &&fleePaused.phase==='garmFled'&&fleePaused.status==='accepted',fleePaused);
    await clickBattleLine(fled);
    await fled.until(`window.__q004FleeDone===true`,60000);
    const fleeDone=await fled.run(`return {trace:[...__q004FleeTrace],error:__q004FleeError,onBoard:G.enemies.some(Boolean),phase:G.questProgress.Q004.encounterPhase}`);
    ok('魔獣撃退 B-2：逃走台詞完了後だけ FLED 演出・盤面除外へ順に進む',
      !fleeDone.error&&fleeDone.trace.join('|')==='line:start|line:end|fled|remove|done'
      &&!fleeDone.onBoard&&fleeDone.phase==='garmFled',fleeDone);
    await finish(fled);

    const retreat=await newPage();
    const retreatEnemy=await setupQ004PursuitBoard(retreat,{defeated:true,enemyCode:'EN020'});
    const reportLines=[...(q4.q.initial||[]).slice(0,1),
      ...(q4.q.specialB1||[]),...(q4.q.specialB2||[]),...(q4.q.specialB3||[]),...(q4.q.specialB4||[])];
    ok('魔獣撃退 B-3：討伐後撤退の報告は台詞1から特殊台詞B1へ続く',
      reportLines.length>=2&&(q4.q.specialB1||[]).length>0,{reportLines});
    await retreat.run(`handleWaveBattleDefeat();return 1;`);
    await retreat.until(`typeof G._battleProceedAction==='function'&&!!document.getElementById('battle-continue-btn')`,60000);
    const retreatPaused=await retreat.run(`return {status:G.questProgress.Q004.status,phase:G.questProgress.Q004.encounterPhase,stage:G._waveStage,
      battleLine:document.getElementById('battle-line-text')?.textContent||'',retry:G._waveRetryEnemyKey,isRetry:G._waveIsRetry}`);
    ok('魔獣撃退 B-3：ガルム討伐済みでその後に敗北しても、失敗にせず再戦鍵を消す',
      retreatPaused.status==='accepted'&&retreatPaused.phase==='camp'&&retreatPaused.stage===6
      &&!retreatPaused.battleLine&&retreatPaused.retry===null&&!retreatPaused.isRetry,retreatPaused);
    await clickBattleContinue(retreat);
    for(let i=0;i<reportLines.length;i++){
      await waitLine(retreat,reportLines[i]);
      ok(`魔獣撃退 B-3：報告 ${i+1}/${reportLines.length} をシート順に表示`,true);
      if(i===0&&Number(q4.q.rewardGold)>0){
        await retreat.until(`Number(G.gold)===${Number(retreatEnemy.gold)+Number(q4.q.rewardGold)}`,30000);
      }
      await clickDialogue(retreat);
    }
    await retreat.until(`G.questProgress?.Q004?.status==='completed'&&Number(G._waveStage)===7&&G._waveBattleType==null&&document.body.classList.contains('reward-screen-active')`,60000);
    const retreatDone=await retreat.run(`return {status:G.questProgress.Q004.status,phase:G.questProgress.Q004.encounterPhase,
      stage:G._waveStage,gold:G.gold,rewardGiven:G.questProgress.Q004.encounterRewardGiven,retry:G._waveRetryEnemyKey,isRetry:G._waveIsRetry}`);
    ok('魔獣撃退 B-3：台詞1→B1〜B3（あれば続きも）の後は成功報酬を渡してステージ通過',
      retreatDone.status==='completed'&&retreatDone.phase==='done'&&retreatDone.stage===7
      &&retreatDone.gold===Number(retreatEnemy.gold)+Number(q4.q.rewardGold||0)&&retreatDone.rewardGiven
      &&retreatDone.retry===null&&!retreatDone.isRetry,retreatDone);
    await finish(retreat);
  }

  // ── 闘技場：アレスも汎用の死亡・逃走・プレイヤー敗北台詞を使う ────────
  if(section('闘技場アレス')){
    const b=await newPage();
    await b.run(`if(typeof _skipStartupIntro==='function')window.removeEventListener('pointerdown',_skipStartupIntro,true);startGame(true);return 1;`);
    await b.until(`G&&G._runId`,30000);
    const ares=await b.run(`(()=>{
      const enemyNo=def=>String(def&&(def.artCode||def._artCode||def.No||def.no||def['No.']||def.code)||'').toUpperCase();
      const def=ENEMY_POOL.find(row=>enemyNo(row)==='EN048');if(!def)throw new Error('EN048の敵定義が無い');
      window.__installAresOutcomeTest=()=>{const unit=_mkEnemy(20,30,def.name,def.icon,def.grade||1,0,[...(def.keywords||[])],def.race||'-');
        _applyEnemyDefAbilities(unit,def);unit.id='arena-ares-outcome';unit.side='p2';unit.lane='front';unit.boss=true;
        G.allies=new Array(14).fill(null);G.enemies=new Array(14).fill(null);G.enemies[0]=unit;window.__aresOutcomeUnit=unit;renderAll();return unit;};
      G._wave=3;G._waveStage=1;G._waveBattleType=null;G._mapBattle=null;G.phase='battle';
      G._arenaActive=true;G._arenaRound=6;G._arenaWins=5;G._arenaOutcomePending=false;
      G._battleDefeatHandled=false;G._battleVictoryPending=false;G._battlePhaseRunning=false;G._battleProceedAction=null;
      document.body.classList.remove('reward-screen-active','battle-victory-pending');showScreen('battle');
      const unit=__installAresOutcomeTest();return {name:unit.name,death:[...(unit.deathBattleLines||[])],
        flee:[...(unit.fleeBattleLines||[])],playerDefeat:[...(unit.playerDefeatBattleLines||[])]};
    })()`);
    ok('闘技場：EN048アレスの3種の台詞をシート見出しから戦闘ユニットへ渡す',
      ares.death.length>0&&ares.flee.length>0&&ares.playerDefeat.length>0,ares);

    await b.run(`(()=>{const unit=__aresOutcomeUnit;unit.hp=0;unit._displayHp=0;
      window.__aresDeathTrace=[];window.__aresDeathDone=false;window.__aresDeathError='';
      const ev={type:'death',side:'p2',unitId:unit.id};
      presentDeathEvent(ev,{findUnit:()=>unit,
        showLines:async(...args)=>{__aresDeathTrace.push('line:start');await showBattleUnitOutcomeLines(...args);__aresDeathTrace.push('line:end');},
        beat:async()=>{__aresDeathTrace.push('beat');},startFx:()=>{__aresDeathTrace.push('deathFx');},
        processDeath:async()=>{__aresDeathTrace.push('process');},compact:()=>{__aresDeathTrace.push('compact');},
      }).then(()=>{__aresDeathDone=true;}).catch(error=>{__aresDeathError=String(error&&error.stack||error);__aresDeathDone=true;});return 1;})()`);
    await waitBattleLine(b,ares.death[0]);
    const aresDeathPaused=await b.run(`return {trace:[...__aresDeathTrace],fx:!!__aresOutcomeUnit._deathFxReady,done:__aresDeathDone}`);
    ok('闘技場：アレスの死亡台詞中は死亡ビートと焼失を始めない',
      aresDeathPaused.trace.join('|')==='line:start'&&!aresDeathPaused.fx&&!aresDeathPaused.done,aresDeathPaused);
    await clickBattleLine(b);
    await b.until(`window.__aresDeathDone===true`,30000);
    const aresDeathDone=await b.run(`return {trace:[...__aresDeathTrace],error:__aresDeathError}`);
    ok('闘技場：アレスの死亡台詞完了後に死亡演出へ進む',
      !aresDeathDone.error&&aresDeathDone.trace.join('|')==='line:start|line:end|beat|deathFx|process|compact',aresDeathDone);

    await b.run(`(()=>{const unit=__installAresOutcomeTest();window.__aresFleeTrace=[];window.__aresFleeDone=false;window.__aresFleeError='';
      const original=window.playFledVfx;window.playFledVfx=async(...args)=>{__aresFleeTrace.push('fled');return typeof original==='function'?original(...args):undefined;};
      const ev={type:'fled',side:'p2',unitId:unit.id};presentFledEvent(ev,{findUnit:()=>unit,
        showLines:async(...args)=>{__aresFleeTrace.push('line:start');await showBattleUnitOutcomeLines(...args);__aresFleeTrace.push('line:end');},
        removeFromBoard:()=>{__aresFleeTrace.push('remove');G.enemies[0]=null;},compact:()=>renderAll(),
      }).then(()=>{__aresFleeTrace.push('done');__aresFleeDone=true;window.playFledVfx=original;})
        .catch(error=>{__aresFleeError=String(error&&error.stack||error);__aresFleeDone=true;window.playFledVfx=original;});return 1;})()`);
    await waitBattleLine(b,ares.flee[0]);
    const aresFleePaused=await b.run(`return {trace:[...__aresFleeTrace],fled:!!__aresOutcomeUnit._fled,done:__aresFleeDone}`);
    ok('闘技場：アレスの逃走台詞中は FLED 演出を始めない',
      aresFleePaused.trace.join('|')==='line:start'&&!aresFleePaused.fled&&!aresFleePaused.done,aresFleePaused);
    await clickBattleLine(b);
    await b.until(`window.__aresFleeDone===true`,60000);
    const aresFleeDone=await b.run(`return {trace:[...__aresFleeTrace],error:__aresFleeError,onBoard:G.enemies.some(Boolean)}`);
    ok('闘技場：アレスの逃走台詞完了後に FLED と盤面除外へ進む',
      !aresFleeDone.error&&aresFleeDone.trace.join('|')==='line:start|line:end|fled|remove|done'&&!aresFleeDone.onBoard,aresFleeDone);

    await b.run(`__installAresOutcomeTest();G._arenaOutcomePending=false;G._battleDefeatHandled=false;G._battleVictoryPending=false;G._battleProceedAction=null;arenaHandleBattleDefeat();return 1;`);
    await waitBattleLine(b,ares.playerDefeat[0]);
    const aresDefeatPaused=await b.run(`return {pending:G._arenaOutcomePending,proceed:typeof G._battleProceedAction==='function',cutin:!!document.getElementById('battle-continue-btn')}`);
    ok('闘技場：プレイヤー敗北確定時はアレスの台詞中に敗北表示へ進まない',
      aresDefeatPaused.pending&&!aresDefeatPaused.proceed&&!aresDefeatPaused.cutin,aresDefeatPaused);
    await clickBattleLine(b);
    await b.until(`typeof G._battleProceedAction==='function'&&!!document.getElementById('battle-continue-btn')`,60000);
    ok('闘技場：アレスのプレイヤー敗北台詞完了後に闘技場の敗北表示へ進む',true);
    await finish(b);
  }

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

  async function beginQ002TownArrival(b,count,label){
    await startRunWithQuest(b,'Q002');
    const gold=await b.run(`(()=>{const count=${Number(count)};const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();
      const e=questDebugForceWaveQuest(1,'Q002');e.status='accepted';e.rewardCardTaken=true;e.towerEventDone=false;e.townEventDone=false;e.townEventStarted=false;e.townRewardGiven=false;
      e.rewardMixAssigned=true;e.rewardMixTargets=[{wave:1,stage:1,used:true},{wave:1,stage:2,used:true},{wave:2,stage:1,used:true}];
      const lists=[G.mainBoard,G.globalPanels,G.spellSlots,_rewCards];for(const list of lists)for(let i=0;i<list.length;i++)if(no(list[i])==='E101')list[i]=null;
      const def=PANEL_POOL.find(c=>c&&no(c)==='E101');const make=()=>makePanel(def.id);
      if(count>0)G.mainBoard[0]=make();if(count>1)G.spellSlots[0]=make();if(count>2)_rewCards[0]=make();
      G._partyBoardUnit=null;G._wave=2;const route=_waveRouteForWave(2)||[];G._waveStage=Math.max(1,route.indexOf('city')+1);G._waveVillage=true;G._isWaveAltar=false;G.gold=Number(G.gold)||0;
      window.__questRewardScreenSeen=false;const watch=()=>{if(document.body.classList.contains('reward-screen-active'))__questRewardScreenSeen=true;if(!e.townEventDone)requestAnimationFrame(watch);};requestAnimationFrame(watch);
      const before=G.gold;openMapVillage({intro:true});return before;})()`);
    await waitLine(b,q2.q2.initial[0]);
    await b.until(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC005"]');return !!(p&&p.style.left==='2320px'&&p.style.top==='380px'&&p.complete&&p.naturalWidth>0);})()`,30000);
    ok(`Q002ヴァルガ到着（${label}）：Bの立ち絵はMC005（X2320・Y380）`,true);
    return gold;
  }

  async function beginQ007TownArrival(b,held,label,startGold=null){
    await startRunWithWaveQuest(b,3,'Q007');
    const gold=await b.run(`(()=>{const held=${Number(held)};const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();
      const e=questDebugForceWaveQuest(3,'Q007');e.status='accepted';e.transportCount=3;e.rewardCardTaken=true;e.townEventDone=false;e.townEventStarted=false;e.townRewardGiven=false;e.cargoLossPaid=false;
      const lists=[G.mainBoard,G.globalPanels,G.spellSlots,G.rings,G.inventory,G.hand,G.handSlots,_rewCards];for(const list of lists){if(!Array.isArray(list))continue;for(let i=0;i<list.length;i++)if(no(list[i])==='E102')list[i]=null;}
      const def=PANEL_POOL.find(c=>c&&no(c)==='E102');const make=()=>makePanel(def.id);const slots=[[G.mainBoard,0],[G.spellSlots,0],[G.globalPanels,0],[_rewCards,0]];
      for(let i=0;i<held;i++){const [list,idx]=slots[i];list[idx]=make();}
      G._partyBoardUnit=null;G._wave=4;const route=_waveRouteForWave(4)||[];G._waveStage=Math.max(1,route.indexOf('city')+1);G._waveVillage=true;G._isWaveAltar=false;G.gold=${startGold==null?'Math.max(0,Number(G.gold)||0)':Math.max(0,Number(startGold)||0)};
      window.__questRewardScreenSeen=false;const watch=()=>{if(document.body.classList.contains('reward-screen-active'))__questRewardScreenSeen=true;if(!e.townEventDone)requestAnimationFrame(watch);};requestAnimationFrame(watch);
      const before=G.gold;openMapVillage({intro:true});return before;})()`);
    await waitLine(b,q10.q2.initial[0]);
    await b.until(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC006"]');return !!(p&&p.style.left==='2142px'&&p.style.top==='102px'&&p.complete&&p.naturalWidth>0);})()`,30000);
    await b.until(`document.querySelector('.tavern-name-plate.is-visible')`,5000);
    const townPortrait=await b.run(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC006"]');const plate=document.querySelector('.tavern-name-plate');return {x:p?.style.left||'',y:p?.style.top||'',w:p?.style.width||'',h:p?.style.height||'',visible:!!plate?.classList.contains('is-visible'),name:(plate?.textContent||'').replace(/\\s+/g,'')};})()`);
    ok(`Q007ヴォルザーグ到着（${label}）：BはMC006（X2142・Y102・原寸）、名前札はシート値`,
      townPortrait.x==='2142px'&&townPortrait.y==='102px'&&townPortrait.w==='2077px'&&townPortrait.h==='4452px'&&townPortrait.visible
      &&townPortrait.name===String(q10.q2.characterName||'').replace(/\s+/g,''),townPortrait);
    return gold;
  }

  async function inspectQ007TownResult(b){
    await b.until(`document.querySelector("#scr-village.active")&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    return b.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const lists=[G.mainBoard,G.globalPanels,G.spellSlots,G.rings,G.inventory,G.hand,G.handSlots,_rewCards];let boxes=0;for(const list of lists)if(Array.isArray(list))boxes+=list.filter(c=>no(c)==='E102').length;return {gold:G.gold,status:G.questProgress.Q007.status,boxes,cargoLossPaid:G.questProgress.Q007.cargoLossPaid===true,rewardSeen:__questRewardScreenSeen};})()`);
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

  // ── デバッグ「クエスト変更」：3行の選択・端のループ・酒場への反映 ────
  if(section('クエスト変更')){
    const b=await newPage();
    await b.run(`startGame(true);return 1;`);
    await b.until('G&&G._debugMode&&G._runId&&!G._villageIntroPlaying',30000);
    await b.run(`(()=>{questDebugForceWaveQuest(1,'Q002');questDebugForceWaveQuest(2,'Q004');questDebugForceWaveQuest(3,'Q007');G._wave=1;G._waveStage=1;G._waveVillage=true;G._isWaveAltar=false;return 1;})()`);
    await b.run(`debugOpenFormation();return 1;`);
    await b.until('document.body.classList.contains("reward-screen-active")&&document.body.classList.contains("debug-mode")&&document.getElementById("btn-debug-gameover")&&document.getElementById("btn-debug-quest")',30000);
    const debugButtons=await b.run(`(()=>{const gameover=document.getElementById('btn-debug-gameover');const quest=document.getElementById('btn-debug-quest');return {error:!!document.getElementById('btn-debug-error'),gameover:!!gameover&&getComputedStyle(gameover).display!=='none',quest:!!quest&&getComputedStyle(quest).display!=='none'};})()`);
    ok('デバッグ編成画面：エラー確認はなく、ゲームオーバー確認・クエスト変更がある',!debugButtons.error&&debugButtons.gameover&&debugButtons.quest,debugButtons);

    await b.run(`document.getElementById('btn-debug-quest').click();return 1;`);
    await b.until('document.getElementById("quest-debug-layer")?.classList.contains("is-open")',10000);
    const draft=await b.run(`(()=>{const rows=[...document.querySelectorAll('#quest-debug-layer .quest-debug-row')];const row=wave=>rows.find(r=>r.dataset.wave===String(wave));return {count:rows.length,towns:rows.map(r=>r.querySelector('[data-quest-debug-town]')?.textContent||''),varga:row(2)?.dataset.questId||'',names:rows.map(r=>r.querySelector('[data-quest-debug-name]')?.textContent||'')};})()`);
    ok('クエスト変更：エルム・ヴァルガ・ギャラハの3行を表示する',draft.count===3&&draft.towns.join('|')==='エルム|ヴァルガ|ギャラハ'&&draft.varga==='Q004',draft);
    // ヴァルガの候補は地域情報シートから読む（Q006 などが増えても一周して最初へ戻ることを確かめる）。
    const vargaIds=await b.run(`return _qRegionIds(2)`);
    for(let k=1;k<=vargaIds.length;k++){
      const want=vargaIds[k%vargaIds.length];
      await b.run(`document.querySelector('#quest-debug-layer .quest-debug-row[data-wave="2"] button[data-quest-debug-dir="next"]').click();return 1;`);
      await b.until(`document.querySelector('#quest-debug-layer .quest-debug-row[data-wave="2"]')?.dataset.questId===${JSON.stringify(want)}`,10000);
    }
    ok(`クエスト変更：ヴァルガの右矢印は候補（${vargaIds.join('→')}）を一周して最初へ戻る`,vargaIds[0]==='Q004'&&vargaIds.length>=2,vargaIds);
    await b.run(`document.querySelector('#quest-debug-layer .quest-debug-row[data-wave="2"] button[data-quest-debug-dir="next"]').click();return 1;`);
    await b.until(`document.querySelector('#quest-debug-layer .quest-debug-row[data-wave="2"]')?.dataset.questId==='Q005'`,10000);
    await b.run(`document.getElementById('quest-debug-save').click();return 1;`);
    await b.until('!document.getElementById("quest-debug-layer")?.classList.contains("is-open")',10000);
    const saved=await b.run(`(()=>{const entries=Object.values(G.questProgress||{});const selected=entries.find(e=>Number(e.wave)===2);return {questId:selected?.questId||'',status:selected?.status||'',old:!!G.questProgress.Q004,layer:!!document.getElementById('quest-debug-layer')?.classList.contains('is-open')};})()`);
    ok('クエスト変更を保存するとヴァルガはQ005の初期状態になる',saved.questId==='Q005'&&saved.status==='offered'&&!saved.old&&!saved.layer,saved);

    await openWave(b,2);
    await clickFacility(b,'^酒場$');
    await waitLine(b,q5.q.initial[0]);
    ok('保存後にヴァルガの酒場が選択したQ005の台詞1になる',await b.run(`return G.questProgress.Q005?.questId==='Q005'&&document.querySelector('${lineSel(q5.q.initial[0].speaker==='A'?'left':'right')}')?.textContent===${JSON.stringify(q5.q.initial[0].text)}`));
    await finish(b);
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
      mix.assigned&&mix.count>0&&mix.max&&mix.targetsValid&&mix.targetCounts.every(n=>n===1)
      // 残り戦闘がすべて対象の時は、対象外の戦闘が無いので確認を飛ばす（乱数で起きる）。
      &&(mix.non?mix.nonCount===0:true)&&mix.remaining===0,mix);
    await enterShop(b);
    await sleep(400);
    const desc=await b.run(`return document.querySelector('.reward-prod-quest-body p')?.textContent||''`);
    // 説明文は酒場側（Q002_1）→ 到着側（Q002_2）の順に探す（本体の _qEnsureSelected と同じ）。
    const q2Desc=(q2.q&&q2.q.description)||q2.q2.description;
    ok('Q002受託後、クエスト枠にシートの説明文が出る',!!q2Desc&&desc===q2Desc,{desc,want:q2Desc});
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

    // ── Q002ヴァルガ到着：手持の落とし物を自動回収 ──
    const z=await newPage();
    const goldZ=await beginQ002TownArrival(z,0,'E101が0枚');
    const q002InitialFace=q2.q2.initial[0].face||'';
    const initialFaces=await z.run(`return [...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')].map(f=>f.dataset.faceId)`);
    ok('Q002・0個：A1前はクエストシート無指定の通常表情',!q002InitialFace&&initialFaces.length===0,{q002InitialFace,initialFaces});
    await clickDialogue(z); await waitLine(z,q2.q2.initial[1]); await clickDialogue(z);
    for(const [i,line] of [q2.q2.specialA1[0],q2.q2.specialA2[0],q2.q2.specialA3[0]].entries()){
      await waitLine(z,line);
      if(i===0){ await waitVisibleFace(z,line.face); ok('Q002・0個：A1でシート指定の表情へ切り替わる',await face(z,line.face)==='表示'); }
      await clickDialogue(z);
    }
    await z.until(`document.querySelector("#scr-village.active")&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterZ=await z.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[]),...(G.rings||[]),...(G.inventory||[]),...(_rewCards||[])];return {gold:G.gold,status:G.questProgress.Q002.status,e101:all.filter(c=>no(c)==='E101').length,rewardSeen:__questRewardScreenSeen};})()`);
    ok('Q002・0個：お金なし・落とし物0枚・completed、編成画面なし',afterZ.gold===goldZ&&afterZ.status==='completed'&&afterZ.e101===0&&!afterZ.rewardSeen,afterZ);
    await finish(z);

    const a=await newPage();
    const goldA=await beginQ002TownArrival(a,2,'E101が2枚');
    await clickDialogue(a); await waitLine(a,q2.q2.initial[1]); await clickDialogue(a);
    await waitLine(a,q2.q2.initial[2]);
    ok('Q002・2個：台詞2の後に台詞3を出す',await a.run(`return G.gold`)===goldA);
    await clickDialogue(a);
    const line4={...q2.q2.initial[3],text:q2.q2.initial[3].text.replace(/X/g,'2')};
    await waitLine(a,line4); await a.until(`G.gold===${goldA}+120`);
    ok('Q002・2個：台詞4のXを2に置換し、台詞4で+120G',true);
    await clickDialogue(a);
    await a.until(`document.querySelector("#scr-village.active")&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterA=await a.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[]),...(G.rings||[]),...(G.inventory||[]),...(_rewCards||[])];return {gold:G.gold,status:G.questProgress.Q002.status,e101:all.filter(c=>no(c)==='E101').length,rewardSeen:__questRewardScreenSeen};})()`);
    ok('Q002・2個：落とし物0枚・completed、編成画面なし',afterA.gold===goldA+120&&afterA.status==='completed'&&afterA.e101===0&&!afterA.rewardSeen,afterA);
    await finish(a);

    const t=await newPage();
    const goldT=await beginQ002TownArrival(t,3,'E101が3枚（全部）');
    await clickDialogue(t); await waitLine(t,q2.q2.initial[1]); await clickDialogue(t);
    await waitLine(t,q2.q2.specialB1[0]);
    ok('Q002・3個＝全部：台詞2の後にB1を出し、まだ所持金を加えない',await t.run(`return G.gold`)===goldT);
    await clickDialogue(t); await waitLine(t,q2.q2.specialB2[0]); await t.until(`G.gold===${goldT}+250`);
    ok('Q002・3個＝全部：B2で+250G（空のB3は飛ばす）',true);
    await clickDialogue(t);
    await t.until(`document.querySelector("#scr-village.active")&&!document.body.classList.contains("quest-town-event-active")&&${notFading}`,30000);
    const afterT=await t.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[]),...(G.rings||[]),...(G.inventory||[]),...(_rewCards||[])];return {gold:G.gold,status:G.questProgress.Q002.status,e101:all.filter(c=>no(c)==='E101').length,rewardSeen:__questRewardScreenSeen};})()`);
    ok('Q002・3個＝全部：落とし物0枚・completed、編成画面なし',afterT.gold===goldT+250&&afterT.status==='completed'&&afterT.e101===0&&!afterT.rewardSeen,afterT);
    await finish(t);

  }

  // ── 酒場：会話・編成窓・拒否・受託 ─────────────────────────
  if(section('酒場')){
    const b=await newPage();
    await startRunWithQuest(b);
    ok('酒場はクエストのある街（エルム Q003・ヴァルガ Q004・ギャラハ Q007）だけ開く',await b.run(`return [0,1,2,3].map(w=>questTavernAvailable(w)).join()==='false,true,true,true'`));
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
    ok('編成窓：クエスト説明文・見出し「依頼人」・ファラ（ボス枠・矢印なし）・拒否・元に戻す',
      f.desc===q1.q.description&&f.heading.includes(q5.title1)&&/ファラ/.test(f.card)&&f.frame&&f.ports===0&&f.button==='拒否'&&f.reset,f);
    ok('クエスト説明文：旅の進捗と同じ色・両端揃え・行間はカードのホバー説明と同じ',f.color===f.journey&&f.align==='justify'&&Math.abs(f.lhRatio-1.692857)<0.01,f);
    const q003Slot=await b.run(`(()=>{const board=_getPartyBoardUnit().boardCards;const original=board[1]||null;
      const def=PANEL_POOL.find(c=>c&&c.id&&!c._npcCard&&String(c.no||c.No||c['No.']||'').toUpperCase()!=='BC002'&&c.panelScope!=='global');
      const other=makePanel(def.id);board[1]=other;renderHandEditor();
      const rewardBefore=_rewCards.filter(Boolean).length;
      _dragSrc={arr:'boardCards',idx:1,unitIdx:G._selectedBoardUnitIdx};
      const dragAllowed=_canReturnDragSrcToRewardArea();_returnDragSrcToRewardArea();
      const dragStayed=board[1]===other&&_rewCards.filter(Boolean).length===rewardBefore;
      const ri=_rewCards.findIndex(c=>c&&/\u30d5\u30a1\u30e9/.test(c.name||''));
      _dragSrc={arr:'rew',idx:ri};const dropAllowed=_boardDropAllowedAt(1);_dragSrc=null;
      takeRewCard(ri);const clickPlaced=placePendingPanelToSelectedUnit(1);cancelPendingPanelPlacement();
      const clickStayed=board[1]===other&&_rewCards.some(c=>c&&/\u30d5\u30a1\u30e9/.test(c.name||''));
      board[1]=original;if(typeof syncBoardCardPassives==='function')syncBoardCardPassives();renderHandEditor();renderRewCards();
      return {dragAllowed,dragStayed,dropAllowed,clickPlaced,clickStayed};})()`);
    ok('Q003依頼枠：別カードはドラッグでもクリック入替でも置けず、ドロップ不可表示',
      !q003Slot.dragAllowed&&q003Slot.dragStayed&&!q003Slot.dropAllowed&&!q003Slot.clickPlaced&&q003Slot.clickStayed,q003Slot);
    // 拒否
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(b,q1.q.rejected[0]);
    await sleep(600);
    await b.until(`(()=>{const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="${q1.q.rejected[0].face}"]');return !!(f&&f.complete&&f.naturalWidth>0);})()`,5000).catch(()=>{});
    ok(`Q003拒否台詞の表情列で、Aが${q1.q.rejected[0].face}になる`,await face(b,q1.q.rejected[0].face)==='表示');
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
    // 召喚マスに初期キャラがいる時、ファラと入れ替えると初期キャラが依頼枠へ押し出されるため置けない（依頼枠には元のカード以外を置けない）。
    ok('召喚マスが埋まっている時、入れ替えで依頼枠へ押し出す置き方はできない',await b.run(`const board=G.mainBoard;return !board[1]||placePendingPanelToSelectedUnit(1)===false`));
    // 初期キャラを空いているマスへ移してから、ファラを召喚マスに置く。
    await b.run(`const board=G.mainBoard;if(board[1]){const e=board.findIndex((c,i)=>i!==1&&!c);if(e>=0){board[e]=board[1];board[1]=null;renderHandEditor();}}return 1`);
    ok('ファラを召喚マスに置くと受託',await b.run(`const r=placePendingPanelToSelectedUnit(1);return r&&document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent==='受託'`));
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(b,q1.q.accepted[0]);
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('受託して村へ戻る',await status(b)==='accepted');
    // 受託後に再訪すると受託後台詞。表情は台詞の表情列から変わる。
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.acceptedAfter[0]);
    await waitVisibleFace(b,q1.q.acceptedAfter[0].face);
    ok(`Q003受託後台詞の表情列で、Aが${q1.q.acceptedAfter[0].face}になる`,await face(b,q1.q.acceptedAfter[0].face)==='表示');
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    await finish(b);
  }

  if(section('危険生物護送')){
    const b=await newPage();
    await startRunWithWaveQuest(b,2,'Q006');
    const q6=await b.run(`return {q:QUEST_DATA.Q006_1,q2:QUEST_DATA.Q006_2,card:PANEL_POOL.find(c=>c.no==='BC001')}`);
    ok('Q006の列と依頼NPCを読む（実装falseでも依頼専用、逃走後台詞は対象・表情付き）',
      q6.q.initial.length===11&&q6.q.questClass==='A'&&q6.q.fled1[0].speaker==='A'
      &&q6.q.fled1[0].face==='MC001_C'&&q6.q.fled2.length===1&&q6.q.rewardGold===100
      &&q6.card._npcCard&&q6.card._rewardExcluded&&q6.card._shopExcluded&&q6.card.life===50
      &&q6.card.keywords.includes('帰滅')&&await b.run(`return _cardRequiresDeployableSlot(PANEL_POOL.find(c=>c.no==='BC001'))&&questCardLossIsFatal(PANEL_POOL.find(c=>c.no==='BC001'))`),q6.card);
    const fatalWording=await b.run(`(()=>{const make=desc=>({desc,effectText:'',effect:'',effectData:{effectTexts:[]}});
      const old=make('常時：このキャラクターが還魂以外で失われるとゲームオーバーになる。');
      const current=make('常時：このキャラクターが祭壇に捧げられる以外の理由で失われるとゲームオーバーになる。');
      return {old:questCardLossIsFatal(old),current:questCardLossIsFatal(current),pad:TAVERN_LINE_PAD_X,mc008:TAVERN_PORTRAIT_CONFIG.MC008};})()`);
    ok('帰滅で召喚マスを判定し、致死効果は旧文言と新文言を受け付ける',fatalWording.old&&fatalWording.current&&fatalWording.pad===48
      &&fatalWording.mc008.width===1152&&fatalWording.mc008.height===1183,fatalWording);

    const portraitState=(page,key)=>page.run(`(()=>{const p=document.querySelector('.tavern-portrait[data-portrait-key="${key}"]');if(!p)return null;
      const cs=getComputedStyle(p);return {id:p.dataset.portraitId,x:parseFloat(p.style.left),y:parseFloat(p.style.top),w:p.naturalWidth,h:p.naturalHeight,
      layer:Number(cs.zIndex)||0,flip:new DOMMatrix(cs.transform).a<0,visible:p.complete&&p.naturalWidth>0&&Number(cs.opacity)>.9};})()`);
    const bubbleState=(page,index)=>page.run(`(()=>{const b=document.querySelector('.tavern-dialogue-bubble[data-line-index="${Number(index)}"]');
      const t=document.querySelector('.tavern-dialogue-tail[data-line-index="${Number(index)}"]');const text=b?.querySelector('.tavern-dialogue-text');
      if(!b||!t||!text)return null;const cs=getComputedStyle(t),m=new DOMMatrix(cs.transform),bs=getComputedStyle(b),style=getComputedStyle(text),r=text.getBoundingClientRect();
      let opacity=1;for(let p=text;p&&p.nodeType===1;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);
      return {x:parseFloat(cs.left)+(m.a<0?parseFloat(cs.width):0),y:parseFloat(cs.top)+(m.d>0?parseFloat(cs.height):0),down:m.d>0,
        opacity:Number(bs.opacity),textOpacity:Number(style.opacity),text:text.textContent,visible:opacity>.9&&style.visibility!=='hidden'&&style.display!=='none'&&!/transparent|rgba\\(0, 0, 0, 0\\)/.test(style.color)&&r.bottom>0&&r.top<innerHeight};})()`);
    async function waitIndexed(page,index,line){
      await page.until(`(()=>{const el=document.querySelector('.tavern-dialogue-bubble[data-line-index="${Number(index)}"] .tavern-dialogue-text');return el?.textContent===${JSON.stringify(line.text)}&&el.classList.contains('is-visible')&&Number(getComputedStyle(el).opacity)>.9})()`);
    }
    async function checkDrag(page,id){
      const result=await page.run(`(()=>{const u=_getPartyBoardUnit(),old=clone(u.boardCards);const offer=_rewCards.findIndex(c=>c&&c._questOfferCard&&coreUnitHasKeyword(c,'帰滅'));
        const def=PANEL_POOL.find(c=>c&&c.category==='キャラクター'&&!c._npcCard);u.boardCards[1]=makePanel(def.id);u.boardCards[3]=null;renderHandEditor();
        _dragSrc={arr:'rew',idx:offer};_syncNpcDropHints();const read=i=>{const el=document.querySelector('#hand-slots.board-slots > :nth-child('+(i+1)+')');const layer=el.querySelector(':scope > .map-boundary-layer');return {red:el.classList.contains('npc-drop-danger'),hint:el.classList.contains('npc-drop-hint'),outline:getComputedStyle(el).outlineColor,frame:layer?getComputedStyle(layer).borderTopColor:''};};
        const occupied=read(1),empty=read(3);const was=G._isTavern;G._isTavern=false;_syncNpcDropHints();const normal=read(1);G._isTavern=was;
        _dragSrc=null;_clearNpcDropHints();G.mainBoard=old;G._partyBoardUnit=null;renderHandEditor();return {occupied,empty,normal};})()`);
      ok(`${id}依頼ドラッグ：占有マスは赤、空きは白、通常編成は赤くならない`,
        result.occupied.red&&result.occupied.hint
        // キャラが乗った特殊マスの枠は、マスの枠の層（.map-boundary-layer）で見える。赤はその線の色で確かめる。
        &&(result.occupied.outline==='rgba(255, 48, 48, 0.9)'||result.occupied.frame==='rgba(255, 48, 48, 0.95)')
        &&!result.empty.red&&result.empty.hint&&result.empty.outline==='rgba(255, 255, 255, 0.9)'&&!result.normal.red,result);
    }
    async function finishLines(page,lines){for(const line of lines||[]){await waitLine(page,line);await clickDialogue(page);}}
    async function resumePage(page){
      await page.goto(URL,2500);
      await page.until('window.QUEST_DATA&&QUEST_DATA.Q006_1&&typeof SaveRun!=="undefined"&&typeof questResumePendingEvent==="function"',30000);
      await page.run(`void SaveRun.continueRun();return 1;`);
    }
    async function makeAccepted(page,life=3){
      await startRunWithWaveQuest(page,2,'Q006');
      await page.until(notFading,30000);
      await page.run(`G._wave=2;G._waveStage=5;G._waveVillage=true;G._waveLife=${life};G.life=${life};
        const e=G.questProgress.Q006;e.status='accepted';delete e.acceptedLife;e.acceptedExitDone=true;e.rewardCardTaken=true;
        G.mainBoard=new Array(MAIN_BOARD_SIZE).fill(null);G.mainBoard[1]=_qMakeRequiredCard(e);
        const def=PANEL_POOL.find(c=>c.category==='キャラクター'&&!c._npcCard&&Number(c.power)>0);
        G.mainBoard[3]=makePanel(def.id);G._partyBoardUnit=null;return 1;`);
    }
    async function assertGameOverPresentation(page,label){
      await page.until(`G.phase==='gameover'`,15000);
      await sleep(120);
      const state=await page.run(`(()=>{const video=document.getElementById('gameover-video'),fade=document.getElementById('battle-end-fade');return {
        battle:!!document.querySelector('#scr-battle.active'),body:document.body.classList.contains('gameover-active'),overlay:document.getElementById('scr-gameover')?.classList.contains('gameover-overlay-active'),
        src:video?.getAttribute('src')||'',videoVisible:getComputedStyle(video).visibility==='visible',fade:fade?.classList.contains('is-visible')&&getComputedStyle(fade).visibility==='visible'};})()`);
      ok(`${label}：戦闘敗北と同じ暗転・game_over.webm・結果画面へ移る`,state.battle&&state.body&&state.overlay&&state.src==='assets/vfx/game_over.webm'&&state.videoVisible&&state.fade,state);
    }
    await openWave(b,2);
    await b.run(`G._waveLife=2;G.life=2;return 1;`);
    await clickFacility(b,'^酒場$');
    for(let i=0;i<6;i++){
      await waitIndexed(b,i,q6.q.initial[i]);
      if(i===0){
        const p=await portraitState(b,'MC007'),a=await bubbleState(b,0);
        ok('台詞1：MC007はX2735・Y1015、1085×1288、Bの尻尾は下向きX2810・Y1435',
          p?.visible&&p.x===2735&&p.y===1015&&p.w===1085&&p.h===1288&&a?.visible&&a.down&&a.x===2810&&a.y===1435,{p,a});
        ok('名前札は台詞1では出さない',await b.run(`return !document.querySelector('.tavern-name-plate')`));
        await clickDialogue(b);await sleep(400);
        // 台詞2は A（反対側）なので、B の台詞1の吹き出しは文字ごと残る（「A の台詞は B の台詞で消えない」と同じ決まり）。
        const kept=await bubbleState(b,0);
        ok('反対側の台詞に進んでも、前の吹き出しは文字ごと残る',kept&&kept.opacity===1&&kept.textOpacity===1&&kept.visible,kept);
        continue;
      }
      if(i===2){
        await b.until(`document.querySelector('.tavern-name-plate.is-visible')`);
        const p=await portraitState(b,'MC003'),a=await bubbleState(b,2),small=await portraitState(b,'MC007');
        const plateX=await b.run(`return parseFloat(getComputedStyle(document.querySelector('.tavern-name-plate')).left)`);
        ok('台詞3：MC003は右からX1700へ、MC007より手前、尻尾X2380、名前札の線X2045',
          p?.visible&&p.x===1700&&p.layer>small.layer&&a?.visible&&a.x===2380&&a.y===843&&!a.down&&plateX===2045,{p,a,plateX});
      }
      if(i===3) ok('MC001_reは表情画像を外して本体の顔に戻す',await b.run(`return !document.querySelector('.tavern-face[data-face-portrait-key="MC001"]')`));
      await clickDialogue(b);
    }
    await waitIndexed(b,6,q6.q.initial[6]);
    await waitIndexed(b,7,q6.q.initial[7]);
    const transformed=await portraitState(b,'companion');
    const simultaneous=await b.run(`return [...document.querySelectorAll('.tavern-dialogue-bubble.is-visible')].map(x=>Number(x.dataset.lineIndex)).sort((a,b)=>a-b)`);
    ok('台詞7・8を同時表示し、台詞7でMC007を左右反転MC001（X2190・Y252）へ置き換える',
      simultaneous.join()==='6,7'&&transformed?.visible&&transformed.id==='MC001'&&transformed.flip&&transformed.x===2190&&transformed.y===252&&!(await portraitState(b,'MC007')),
      {simultaneous,transformed});
    await clickDialogue(b);
    for(let i=8;i<q6.q.initial.length;i++){ await waitIndexed(b,i,q6.q.initial[i]);await clickDialogue(b); }
    await b.until('G._isTavern&&document.body.classList.contains("reward-screen-active")');
    const offer=await b.run(`return {cards:_rewCards.filter(Boolean).map(c=>c.no),title:questTavernRewardTitle(),want:textMessage('「酒場の報酬枠」見出し2',''),label:document.querySelector('#reward-move-btns .rew-btn-label')?.textContent}`);
    ok('台詞11後は依頼品の編成画面、BC001が1枚、拒否',offer.cards.join()==='BC001'&&offer.title===offer.want&&offer.label==='拒否',offer);
    await checkDrag(b,'Q006');
    const gold=await b.run(`G.mainBoard[1]=null;renderHandEditor();takeRewCard(0);const invalid=placePendingPanelToSelectedUnit(0);const placed=placePendingPanelToSelectedUnit(1);
      if(invalid||!placed)throw new Error('Q006召喚マス制限');return G.gold;`);
    ok('召喚マスに置くと受託へ変わる',await b.run(`return document.querySelector('#reward-move-btns .rew-btn-label')?.textContent==='受託'`));
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(b,q6.q.accepted[0]);
    ok('受託台詞で概要の100G獲得、写し身のHPはNPCシート固定値50',await b.run(`return G.gold===${gold}+100&&G.mainBoard[1].life===50&&!('acceptedLife' in G.questProgress.Q006)`));
    const acceptedFace=await b.run(`return {hero:!!document.querySelector('.tavern-face.is-visible[data-face-id="${q6.q.accepted[0].face}"][data-face-portrait-key="MC001"]'),
      companion:!!document.querySelector('.tavern-face.is-visible[data-face-id="${q6.q.accepted[0].face}"][data-face-portrait-key="companion"]')}`);
    ok('受託台詞のMC001表情は話者Bではなく画像名どおり主人公へ付ける',acceptedFace.hero&&!acceptedFace.companion,acceptedFace);
    await clickDialogue(b);
    await waitIndexed(b,0,q6.q.specialA1[0]);
    const a1=await bubbleState(b,0),beside=await portraitState(b,'companion'),hero=await portraitState(b,'MC001');
    ok('退出後A1：写し身X330は主人公より奥、尻尾X1650・Y1390、ライフは減らさない',
      beside?.visible&&beside.x===330&&beside.layer<hero.layer&&a1?.visible&&a1.down&&a1.x===1650&&a1.y===1390&&await b.run(`return G._waveLife===2&&G.life===2`),{a1,beside});
    await clickDialogue(b);await waitIndexed(b,1,q6.q.specialA2[0]);
    const keptA1=await bubbleState(b,0),a2=await bubbleState(b,1);
    ok('退出後A2：尻尾X2955・Y1340、A1の吹き出しを残し、ライフは減らさない',
      keptA1?.visible&&a2?.visible&&!a2.down&&a2.x===2955&&a2.y===1340&&await b.run(`return G._waveLife===2&&G.life===2`),{keptA1,a2});
    // A2途中の実セーブから再開しても、受託金を繰り返さず、A1を残す表示を再構成する。
    await resumePage(b);
    const exitLines=[...q6.q.specialA1,...q6.q.specialA2,...q6.q.specialA3];
    for(let i=0;i<exitLines.length;i++){await waitIndexed(b,i,exitLines[i]);await clickDialogue(b);}
    await b.until(`G.questProgress.Q006.acceptedExitDone&&!_qPendingEventSession`);
    ok('A1〜A3を再開してもライフ2・HP50・受託金100Gを保ち、ゲームオーバーにしない',await b.run(`return G._waveLife===2&&G.life===2&&G.mainBoard[1].life===50&&G.gold===${gold}+100&&G.phase!=='gameover'`));
    await finish(b);

    const escort=await newPage();await startRunWithQuest(escort);await openWave(escort,1);
    await escort.run(`_qOpenTavernFormation();return 1;`);await checkDrag(escort,'Q003');await finish(escort);

    const item=await newPage();await makeAccepted(item);await openWave(item,2);await enterShop(item);
    await item.run(`G.mainBoard[3].keywords=['封印5'];const doll=ITEM_POOL.find(c=>c.itemEffectKey==='sacrifice_doll');
      const slots=_ensureItemSlots();slots[0]=clone(doll);_beginBoardItemUse(0,slots[0]);handlePendingItemBoardTarget(1);handlePendingItemBoardTarget(3);return 1;`);
    await waitIndexed(item,0,q6.q.destroyed1[0]);await waitIndexed(item,1,q6.q.destroyed2[0]);
    const itemLoss=await item.run(`return {indices:[...document.querySelectorAll('.tavern-dialogue-bubble.is-visible')].map(x=>Number(x.dataset.lineIndex)).sort((a,b)=>a-b),
      faces:[...document.querySelectorAll('.tavern-face.is-visible')].map(x=>x.dataset.faceId),facilities:getComputedStyle(document.getElementById('village-facilities')).display,moves:getComputedStyle(document.getElementById('village-move-btns')).display}`);
    const itemCompanion=await portraitState(item,'companion');
    ok('アイテム消失：死亡台詞1・2を同時表示し、A・Bは最初からMC001_C、Bは左右反転MC001',
      itemLoss.indices.join()==='0,1'&&itemLoss.faces.filter(x=>x==='MC001_C').length===2&&itemCompanion?.flip&&itemCompanion.x===2190&&itemCompanion.y===252,
      {itemLoss,itemCompanion});
    ok('非戦闘死亡会話中は、街の施設ボタンと「出発する」を押せない',itemLoss.facilities==='none'&&itemLoss.moves==='none',itemLoss);
    await resumePage(item);
    await waitIndexed(item,0,q6.q.destroyed1[0]);await waitIndexed(item,1,q6.q.destroyed2[0]);
    await clickDialogue(item);
    await assertGameOverPresentation(item,'消失イベント途中の再開後');
    await finish(item);

    const parted=await newPage();await makeAccepted(parted);await openWave(parted,2);await enterShop(parted);
    await parted.until(`!!document.querySelector('#hand-slots .quest-part-btn')`);
    await parted.run(`document.querySelector('#hand-slots .quest-part-btn').click();document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitIndexed(parted,0,q6.q.fled1[0]);
    const partFirst=await parted.run(`return {companion:!!document.querySelector('.tavern-portrait[data-portrait-key="companion"]'),
      facilities:getComputedStyle(document.getElementById('village-facilities')).display,moves:getComputedStyle(document.getElementById('village-move-btns')).display,event:document.body.classList.contains('quest-town-event-active')}`);
    ok('店で「別れる」後は逃走後台詞1から始め、Bを出さず、街の操作を封鎖する',!partFirst.companion&&partFirst.facilities==='none'&&partFirst.moves==='none'&&partFirst.event,partFirst);
    await clickDialogue(parted);await waitIndexed(parted,1,q6.q.fled2[0]);
    ok('逃走後台詞2でもBを出さない',!(await portraitState(parted,'companion')));
    await clickDialogue(parted);await assertGameOverPresentation(parted,'店で「別れる」後');await finish(parted);

    for(const kind of ['death','flee']){
      const page=await newPage();await makeAccepted(page);
      // 戦闘の受け口へ確定イベントを渡す。敵が残る状態でも会話へ入ることを検査する。
      await page.run(`G._waveVillage=false;G._isTavern=false;G._isShop=false;G._isVillageMenu=false;G.phase='enemy';showScreen('battle');
        document.body.classList.remove('reward-screen-active','village-screen-active');
        const u={...clone(G.mainBoard[1]),id:'q006-loss',side:'p1',lane:'front',slot:0,atk:25,hp:${kind==='death'?0:50},maxHp:50,_mainBoardSlot:1};
        const enemy={id:'q006-foe',name:'検査用',side:'p2',lane:'front',slot:0,atk:1,hp:999,maxHp:999,keywords:[]};
        G.allies=[u];G.enemies=[enemy];G._battleRunId=100;G._battleVictoryPending=false;
        window.__q6State={units:{p1:G.allies,p2:G.enemies},life:{p1:G._waveLife,p2:1},resources:{p1:{gold:G.gold,mana:0},p2:{gold:0,mana:0}},blood:{p1:0,p2:0}};
        const event={type:'${kind==='death'?'death':'fled'}',side:'p1',unitId:u.id};G._battleCoreEvents=[event];
        window.__q6PlaybackDone=false;void _flushCorePveHitEvents(__q6State,[event],new Set([u,enemy])).then(()=>{__q6PlaybackDone=true;});return 1;`);
      if(kind==='flee'&&q6.q.flee.length){
        await page.until(`document.getElementById('battle-line-text')?.textContent===${JSON.stringify(q6.q.flee[0].text)}&&document.getElementById('battle-line-layer')?.classList.contains('is-visible')`);
        ok('逃走の戦闘吹き出しを先に出す',await page.run(`return !document.getElementById('tavern-dialogue-layer')`));
        await page.call('Input.dispatchMouseEvent',{type:'mousePressed',x:800,y:450,button:'left',clickCount:1});
        await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:800,y:450,button:'left',clickCount:1});
      }
      const lines=kind==='death'?[...q6.q.destroyed1,...q6.q.destroyed2]:[...q6.q.fled1,...q6.q.fled2];
      await waitIndexed(page,0,lines[0]);
      if(kind==='death') await waitIndexed(page,1,lines[1]);
      ok(`戦闘${kind}：敵が残っていても進行を打ち切り、即座にクエスト会話`,await page.run(`return G._battleRunId>100&&G.enemies[0].hp===999&&G.questProgress.Q006.pendingEvent==='loss'&&__q6PlaybackDone`));
      if(kind==='death'){
        const deathState=await page.run(`return {indices:[...document.querySelectorAll('.tavern-dialogue-bubble.is-visible')].map(x=>Number(x.dataset.lineIndex)).sort((a,b)=>a-b),faces:[...document.querySelectorAll('.tavern-face.is-visible')].map(x=>x.dataset.faceId)}`);
        ok('戦闘死亡：死亡台詞1・2を同時表示し、A・BはMC001_C',deathState.indices.join()==='0,1'&&deathState.faces.filter(x=>x==='MC001_C').length===2,deathState);
        await clickDialogue(page);
      }else{
        ok('戦闘逃走：逃走後台詞1ではBを出さない',!(await portraitState(page,'companion')));
        await clickDialogue(page);await waitIndexed(page,1,lines[1]);
        ok('戦闘逃走：逃走後台詞2でもBを出さない',!(await portraitState(page,'companion')));
        await clickDialogue(page);
      }
      await assertGameOverPresentation(page,`戦闘${kind}`);await finish(page);
    }

    const tower=await newPage();await makeAccepted(tower);
    await tower.run(`G._waveStage=10;openMapVillage({tower:true});return 1;`);
    // 出発の処理（マップへ進む＝departWithWorldMap）が呼ばれたことだけを記録し、その先（次の戦闘）へは進ませない。
    // 進ませるとマップの画面は一瞬で過ぎ、次の戦闘で写し身が倒れて別の会話に入る。
    await tower.run(`window.__departCalls=0;window.departWithWorldMap=function(){window.__departCalls++;return false;};return 1;`);
    ok('Q006は塔の到着時には開始せず、「出発する」で特殊A1へ',await tower.run(`const before=!document.getElementById('tavern-dialogue-layer');villageDepart();return before;`));
    await finishLines(tower,q6.q2.specialA1);
    await tower.until(`window.__departCalls===1`,30000);
    ok('還魂せず出発した時は特殊A1の後に元の出発処理を続け、completed・カードと消失効果は残る',await tower.run(`return G.questProgress.Q006.status==='completed'&&!!G.mainBoard[1]&&questCardLossIsFatal(G.mainBoard[1])&&window.__departCalls===1`));
    async function takeAltarRing(page,sacrifice){
      await page.run(`openMapRingExchange();const board=_getPartyBoardUnit().boardCards;const def=PANEL_POOL.find(c=>c.category==='キャラクター'&&!c._npcCard&&Number(c.power)>0);
        for(const idx of [0,2,4])board[idx]=makePanel(def.id);renderHandEditor();
        for(const idx of ${sacrifice?'[1,0,2]':'[0,2,4]'})_discardBoardCardForRingOffer(idx,board[idx]);
        const slot=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')].find(el=>!el._rewardRing);if(!slot)throw new Error('空き指輪枠なし');
        _dragSrc={arr:'ringOffer',idx:0};slot.dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));return 1;`);
    }
    await tower.run(`G._wave=3;G._waveStage=10;openMapVillage({tower:true});return 1;`);
    await takeAltarRing(tower,true);
    ok('以後の塔で還魂を確定しても、祭壇を離れるまでは会話を待つ',await tower.run(`return G.questProgress.Q006.companionReleased&&G.questProgress.Q006.pendingEvent==='towerSacrifice'&&!document.getElementById('tavern-dialogue-layer')`));
    await tower.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitIndexed(tower,0,q6.q2.initial[0]);
    const sacrificedPortrait=await portraitState(tower,'companion');
    ok('完了後の別の塔でも還魂→台詞1、Bは左右反転MC001',sacrificedPortrait?.flip&&sacrificedPortrait.x===2190&&sacrificedPortrait.y===252,sacrificedPortrait);
    await clickDialogue(tower);await waitIndexed(tower,1,q6.q2.initial[1]);
    const restored=await portraitState(tower,'restored'),towerLine2=await bubbleState(tower,1);
    ok('台詞2の前に白くフェードしMC008（X2700・Y1090、原寸）へ戻し、吹き出し先端はX2810・Y1435',
      restored?.visible&&restored.id==='MC008'&&restored.x===2700&&restored.y===1090&&restored.w===1152&&restored.h===1183
      &&!(await portraitState(tower,'companion'))&&towerLine2?.down&&towerLine2.x===2810&&towerLine2.y===1435,{restored,towerLine2});
    await tower.run(`window.__mc008Dying=false;const host=document.getElementById('tavern-presentation-layer');window.__mc008Watch=new MutationObserver(()=>{if(document.querySelector('.tavern-portrait.is-dying[data-portrait-id="MC008"]'))__mc008Dying=true;});__mc008Watch.observe(host,{subtree:true,attributes:true,attributeFilter:['class']});return 1;`);
    await clickDialogue(tower);await waitIndexed(tower,2,q6.q2.initial[2]);
    const fadeRed=await tower.run(`__mc008Watch.disconnect();return {seen:__mc008Dying,remaining:!!document.querySelector('.tavern-portrait[data-portrait-id="MC008"]')}`);
    ok('台詞3の前にMC008を赤く染めながら消す',fadeRed.seen&&!fadeRed.remaining,fadeRed);
    await clickDialogue(tower);await tower.until(`!_qPendingEventSession`);
    ok('還魂完了後もcompleted、カード消失・ゲームオーバーなし',await tower.run(`return G.questProgress.Q006.status==='completed'&&!G.mainBoard.some(c=>c&&c.no==='BC001')&&G.phase!=='gameover'`));
    await finish(tower);

    const kept=await newPage();await makeAccepted(kept);await kept.run(`G._waveStage=10;openMapVillage({tower:true});return 1;`);
    await takeAltarRing(kept,false);await finishLines(kept,q6.q2.specialA1);await kept.until(`!_qPendingEventSession`);
    ok('写し身を還魂せず指輪を取得した時も特殊A1→completed',await kept.run(`return G.questProgress.Q006.status==='completed'&&G.mainBoard[1]?.no==='BC001'&&!G.questProgress.Q006.companionReleased`));
    await finish(kept);
  }

  // ── ヴォルザーク鍛冶屋：写し身の「命の鎖」を切る特殊会話 ──────────
  if(section('命の鎖')){
    async function prepareForge(page,gold,withCard=true){
      await startRunWithWaveQuest(page,2,'Q006');
      await page.run(`(()=>{const e=G.questProgress.Q006;e.status='completed';e.acceptedExitDone=true;e.rewardCardTaken=true;e.towerEventDone=true;
        e.companionReleased=false;e.lifeLinkCut=false;e.forgeChainSeen=false;G.mainBoard=new Array(MAIN_BOARD_SIZE).fill(null);
        if(${withCard?'true':'false'}){const c=_qMakeRequiredCard(e);c.desc=String(c.desc||'')+'\\n常時：検査用の別効果。';G.mainBoard[1]=c;}
        const def=PANEL_POOL.find(c=>c.category==='キャラクター'&&!c._npcCard&&Number(c.power)>0);G.mainBoard[3]=makePanel(def.id);G._partyBoardUnit=null;
        G.gold=${Number(gold)};G._facilityTalkSeen={};SaveProfile.markTutorialShown('shop:forge');return 1;})()`);
      await openWave(page,4);
    }
    async function leaveForge(page){
      await page.until(`document.body.classList.contains('reward-screen-active')&&G._isForge`,30000);
      await page.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
      await page.until(`document.querySelector('#scr-village.active')&&!G._isForge&&${notFading}`,30000);
    }
    const success=await newPage();await prepareForge(success,250,true);
    const forgeTalk=await success.run(`return villageTalkEntry('ヴォルザーク「鍛冶屋」入店時')`);
    ok('会話メッセージの特殊台詞A1〜A5・B1を新しい列名で読む',
      ['特殊台詞A1','特殊台詞A2','特殊台詞A3','特殊台詞A4','特殊台詞A5','特殊台詞B1'].every(k=>forgeTalk&&forgeTalk[k])
      &&!forgeTalk?.['特殊台詞1']&&!forgeTalk?.['特殊台詞2'],forgeTalk);
    await clickFacility(success,'^鍛[冶治]屋$');
    await waitLine(success,forgeTalk['特殊台詞A1']);
    if(forgeTalk['特殊台詞A1'].face){await waitVisibleFace(success,forgeTalk['特殊台詞A1'].face);ok('鎖切断会話の表情はシートの表情列に従う',await face(success,forgeTalk['特殊台詞A1'].face)==='表示');}
    await clickDialogue(success);await waitLine(success,forgeTalk['特殊台詞A2']);await clickDialogue(success);
    const successChoices=await waitChoice(success,forgeTalk['特殊台詞A3']);
    // 料金はシートの選択肢の文（「・切ってもらう（NG）」）から読む。値を検査に直書きしない（シートで100G→50Gに変わった）。
    const chainCost=Number((String(successChoices[0]||'').match(/（(\d+)G）/)||[])[1]);
    ok('「切ってもらう」の料金を選択肢の文から読む',chainCost>0&&chainCost<250&&successChoices[1].includes('やめておく'),{successChoices,chainCost});
    await success.run(`window.__chainSfx='';window.__chainBlack=false;window.__chainProbeDone=false;
      const original=playFileSfx;window.playFileSfx=function(path,volume){window.__chainSfx=path;const audio=original(path,volume);if(path==='assets/sfx/chain_cut.wav'&&audio?.dispatchEvent)setTimeout(()=>audio.dispatchEvent(new Event('ended')),80);return audio;};
      const probe=()=>{const f=document.getElementById('screen-switch-fade');if(f&&parseFloat(getComputedStyle(f).opacity)>.95)__chainBlack=true;if(!__chainProbeDone)requestAnimationFrame(probe);};requestAnimationFrame(probe);return 1;`);
    await clickChoice(success,0);
    await waitLine(success,forgeTalk['特殊台詞A4']);
    const cut=await success.run(`__chainProbeDone=true;const c=G.mainBoard.find(x=>x&&x.no==='BC001');return {gold:G.gold,sfx:__chainSfx,black:__chainBlack,
      fatal:questCardLossIsFatal(c),other:/検査用の別効果/.test(JSON.stringify(c)),lifeLinkCut:G.questProgress.Q006.lifeLinkCut===true,
      face:!!document.querySelector('.tavern-face.is-visible[data-face-portrait-key="MC001"]')};`);
    ok('料金を支払い、暗転中のchain_cut.wav後に通常顔へ戻し、致死効果だけを削除する',
      cut.gold===250-chainCost&&cut.sfx==='assets/sfx/chain_cut.wav'&&cut.black&&!cut.fatal&&cut.other&&cut.lifeLinkCut&&!cut.face,cut);
    await clickDialogue(success);await waitLine(success,forgeTalk['特殊台詞A5']);
    if(forgeTalk['特殊台詞A5'].face){await waitVisibleFace(success,forgeTalk['特殊台詞A5'].face);ok('切断後A5もシートの表情列に従う',await face(success,forgeTalk['特殊台詞A5'].face)==='表示');}
    await clickDialogue(success);await leaveForge(success);
    await success.goto(URL,2500);
    await success.until('window.QUEST_DATA&&typeof SaveRun!=="undefined"&&typeof questForgeChainState==="function"',30000);
    await success.run(`void SaveRun.continueRun();return 1;`);
    await success.until(`document.querySelector('#scr-village.active')&&G._wave===4&&${notFading}`,30000);
    const restoredCut=await success.run(`(()=>{const c=G.mainBoard.find(x=>x&&x.no==='BC001');return {gold:G.gold,card:!!c,fatal:questCardLossIsFatal(c),other:/検査用の別効果/.test(JSON.stringify(c)),cut:G.questProgress.Q006.lifeLinkCut===true};})()`);
    ok('鎖切断・料金の支払い・残した別効果をランセーブで保つ',restoredCut.gold===250-chainCost&&restoredCut.card&&!restoredCut.fatal&&restoredCut.other&&restoredCut.cut,restoredCut);
    await clickFacility(success,'^鍛[冶治]屋$');await waitLine(success,forgeTalk['台詞1']);
    ok('鎖を切った後の再訪は従来どおり台詞1',true);
    await clickDialogue(success);await success.until(`document.body.classList.contains('reward-screen-active')&&G._isForge`,30000);
    const harmless=await success.run(`(()=>{const i=G.mainBoard.findIndex(x=>x&&x.no==='BC001'),c=G.mainBoard[i];G.mainBoard[i]=null;const fired=questOnCardLost(c,'death');return {fired,pending:G.questProgress.Q006.pendingEvent||'',phase:G.phase};})()`);
    ok('鎖切断後は写し身を別の方法で失ってもゲームオーバーイベントにならない',!harmless.fired&&!harmless.pending&&harmless.phase!=='gameover',harmless);
    await finish(success);

    const shortGold=chainCost-1;
    const retry=await newPage();await prepareForge(retry,shortGold,true);
    const retryTalk=await retry.run(`return villageTalkEntry('ヴォルザーク「鍛冶屋」入店時')`);
    await clickFacility(retry,'^鍛[冶治]屋$');
    await waitLine(retry,retryTalk['特殊台詞A1']);await clickDialogue(retry);
    await waitLine(retry,retryTalk['特殊台詞A2']);await clickDialogue(retry);
    await waitChoice(retry,retryTalk['特殊台詞A3']);await clickChoice(retry,0);
    await waitLine(retry,retryTalk['ゴールド不足時台詞']);
    ok('料金-1Gでは不足台詞を出し、所持金と致死効果を変えない',await retry.run(`const c=G.mainBoard.find(x=>x&&x.no==='BC001');return G.gold===${shortGold}&&questCardLossIsFatal(c)&&G.questProgress.Q006.forgeChainSeen===true`));
    await clickDialogue(retry);await leaveForge(retry);
    await clickFacility(retry,'^鍛[冶治]屋$');await waitLine(retry,retryTalk['特殊台詞B1']);await clickDialogue(retry);
    await waitChoice(retry,retryTalk['特殊台詞A3']);await clickChoice(retry,1);
    await retry.until(`document.body.classList.contains('reward-screen-active')&&G._isForge`,30000);
    ok('不足後の再訪はB1→A3、やめた場合も鎖と所持金を保つ',await retry.run(`const c=G.mainBoard.find(x=>x&&x.no==='BC001');return G.gold===${shortGold}&&questCardLossIsFatal(c)`));
    await leaveForge(retry);
    await retry.run(`const i=G.mainBoard.findIndex(x=>x&&x.no==='BC001');if(i>=0)G.mainBoard[i]=null;return 1;`);
    await clickFacility(retry,'^鍛[冶治]屋$');await waitLine(retry,retryTalk['台詞1']);
    ok('写し身を持っていない時は従来どおり台詞1',true);
    await finish(retry);
  }

  // ── Q007「木箱輸送依頼」：ギャラハで5枚提示し、任意の枚数を持って受託 ──
  if(section('木箱輸送')){
    const b=await newPage();
    await startRunWithWaveQuest(b,3,'Q007');
    await openWave(b,3);
    const tavern=await b.run(`(()=>{const el=[...document.querySelectorAll('.village-facility')].find(x=>/^酒場$/.test((x.querySelector('.village-facility-name')?.textContent||'').trim()));return {available:questTavernAvailable(3),disabled:!!el?.classList.contains('village-facility-disabled'),exists:!!el};})()`);
    ok('ギャラハの酒場はQ007があるため入れる',tavern.available&&tavern.exists&&!tavern.disabled,tavern);
    await clickFacility(b,'^酒場$');
    await waitLine(b,q10.q.initial[0]);
    await b.until(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC004"]');return !!(p&&p.complete&&p.naturalWidth>0);})()`,5000);
    const portrait=await b.run(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC004"]');return {id:p?.dataset.portraitId||'',x:p?.style.left||'',y:p?.style.top||'',loaded:!!(p&&p.complete&&p.naturalWidth>0)};})()`);
    ok('Q007のBはMC004（X1819・Y192）',portrait.id==='MC004'&&portrait.x==='1819px'&&portrait.y==='192px'&&portrait.loaded,portrait);
    for(const line of q10.q.initial){ await waitLine(b,line); await clickDialogue(b); }
    await b.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")',30000);
    const offers=await b.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const cards=(_rewCards||[]).filter(Boolean);return {count:cards.length,e102:cards.filter(c=>no(c)==='E102').length,names:cards.map(c=>c.name||''),heading:getComputedStyle(document.getElementById('reward-offer-section'),'::before').content,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    ok('最後の台詞の後に編成画面が開き、見出し「依頼品」・木箱5枚・ボタンは「拒否」',
      offers.count===5&&offers.e102===5&&offers.names.every(n=>n==='木箱')&&offers.heading.includes(q5.title2)&&offers.label==='拒否',offers);
    const q007Slot=await b.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const board=_getPartyBoardUnit().boardCards;const original=board[0]||null;
      const def=PANEL_POOL.find(c=>c&&c.id&&!c._npcCard&&no(c)!=='E102'&&c.panelScope!=='global');const other=makePanel(def.id);board[0]=other;renderHandEditor();
      const rewardBefore=_rewCards.filter(Boolean).length;
      _dragSrc={arr:'boardCards',idx:0,unitIdx:G._selectedBoardUnitIdx};const dragAllowed=_canReturnDragSrcToRewardArea();_returnDragSrcToRewardArea();
      const dragStayed=board[0]===other&&_rewCards.filter(Boolean).length===rewardBefore;
      const ri=_rewCards.findIndex(c=>no(c)==='E102');_dragSrc={arr:'rew',idx:ri};const dropAllowed=_boardDropAllowedAt(0);_dragSrc=null;
      takeRewCard(ri);const clickPlaced=placePendingPanelToSelectedUnit(0);cancelPendingPanelPlacement();
      const clickStayed=board[0]===other&&_rewCards.filter(c=>no(c)==='E102').length===5;
      board[0]=original;if(typeof syncBoardCardPassives==='function')syncBoardCardPassives();renderHandEditor();renderRewCards();
      return {dragAllowed,dragStayed,dropAllowed,clickPlaced,clickStayed};})()`);
    ok('Q007依頼枠：別カードはドラッグでもクリック入替でも置けず、ドロップ不可表示',
      !q007Slot.dragAllowed&&q007Slot.dragStayed&&!q007Slot.dropAllowed&&!q007Slot.clickPlaced&&q007Slot.clickStayed,q007Slot);
    const one=await b.run(`(()=>{const ri=_rewCards.findIndex(Boolean);const bi=G.mainBoard.findIndex(c=>!c);if(ri<0||bi<0)return {moved:false};takeRewCard(ri);return {moved:placePendingPanelToSelectedUnit(bi),label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||'',board:(G.mainBoard||[]).filter(c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase()==='E102').length};})()`);
    ok('木箱を1枚移すとボタンが「受託」になる',one.moved&&one.board===1&&one.label==='受託',one);
    const returned=await b.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const idx=G.mainBoard.findIndex(c=>no(c)==='E102');_dragSrc={arr:'boardCards',idx,unitIdx:G._selectedBoardUnitIdx};_returnDragSrcToRewardArea();return {reward:_rewCards.filter(c=>c&&no(c)==='E102').length,board:(G.mainBoard||[]).filter(c=>no(c)==='E102').length,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    ok('木箱を戻すとボタンが「拒否」に戻る',returned.reward===5&&returned.board===0&&returned.label==='拒否',returned);
    const movedTwo=await b.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();let moved=0;for(let n=0;n<2;n++){const ri=_rewCards.findIndex(Boolean);const bi=G.mainBoard.findIndex(c=>!c);if(ri<0||bi<0)break;takeRewCard(ri);if(placePendingPanelToSelectedUnit(bi))moved++;}return {moved,board:(G.mainBoard||[]).filter(c=>no(c)==='E102').length,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    ok('木箱を2枚移すと2枚とも魔導板に残り、ボタンが「受託」',movedTwo.moved===2&&movedTwo.board===2&&movedTwo.label==='受託',movedTwo);
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    // 受託台詞がシートにあれば送る（無ければそのまま酒場を出る）。
    for(const line of (q10.q.accepted||[])){ await waitLine(b,line); await clickDialogue(b); }
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("reward-screen-active")&&${notFading}`,30000);
    const accepted=await b.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const e=G.questProgress.Q007;const status=e?.status||'',transportCount=e?.transportCount;const save=SaveRun.buildRunSave('town');
      const savedStatus=save.state.questProgress.Q007?.status||'',savedCount=save.state.questProgress.Q007?.transportCount;
      G.questProgress.Q007.transportCount=0;SaveRun.restoreRunState(save);
      const restored=G.questProgress.Q007;const all=[...(_rewCards||[]),...(G.spellSlots||[]),...(G.globalPanels||[])];
      return {status,transportCount,savedStatus,savedCount,restoredStatus:restored?.status||'',restoredCount:restored?.transportCount,board:(G.mainBoard||[]).filter(c=>no(c)==='E102').length,offer:all.filter(c=>no(c)==='E102').length};})()`);
    ok('「受託」でaccepted・保存数2になり、ランセーブ復元後も木箱2枚と運ぶ数2を保つ',
      accepted.status==='accepted'&&accepted.transportCount===2&&accepted.savedStatus==='accepted'&&accepted.savedCount===2
      &&accepted.restoredStatus==='accepted'&&accepted.restoredCount===2&&accepted.board===2&&accepted.offer===0,accepted);
    await b.run(`G._wave=3;G._waveStage=10;G._waveVillage=true;G._isWaveAltar=true;openMapVillage({tower:true,intro:true});return 1;`);
    await b.until(`document.querySelector('#scr-village.active')&&!G._villageIntroPlaying`,30000);
    await sleep(700);
    const q007Tower=await b.run(`return {status:G.questProgress.Q007?.status||'',started:!!G.questProgress.Q007?.towerEventStarted,active:document.body.classList.contains('tavern-tower-event-active'),dialogue:!!document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')};`);
    ok('Q007受託後に赤禍の塔へ着いても、ヴォルザーグ到着の引き渡しを始めない',
      q007Tower.status==='accepted'&&!q007Tower.started&&!q007Tower.active&&!q007Tower.dialogue,q007Tower);
    await finish(b);

    // 受託後に店で木箱を1枚売り、手持ち数を減らしてから酒場へ戻る。
    const soldAfter=await newPage();
    await startRunWithWaveQuest(soldAfter,3,'Q007');
    await soldAfter.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();
      const e=G.questProgress.Q007;e.status='accepted';e.transportCount=2;e.rewardCardTaken=true;e.townEventDone=false;e.townEventStarted=false;e.cargoLossPaid=false;
      const def=PANEL_POOL.find(c=>c&&no(c)==='E102');const make=()=>makePanel(def.id);const board=_getPartyBoardUnit().boardCards;
      for(let i=0;i<board.length;i++)if(no(board[i])==='E102')board[i]=null;const slots=board.map((c,i)=>c? -1:i).filter(i=>i>=0);
      board[slots[0]]=make();board[slots[1]]=make();G._partyBoardUnit=null;G.gold=1000;return 1;})()`);
    await openWave(soldAfter,3);
    await enterShop(soldAfter);
    const soldOne=await soldAfter.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();
      const before=(G.mainBoard||[]).filter(c=>no(c)==='E102').length;const idx=(G.mainBoard||[]).findIndex(c=>no(c)==='E102');
      const card=document.querySelector('#hand-slots.board-slots > .card[data-board-idx="'+idx+'"]');const btn=card?.querySelector('.shop-board-sell-action');
      if(btn) btn.click();return {before,after:(G.mainBoard||[]).filter(c=>no(c)==='E102').length,clicked:!!btn};})()`);
    ok('Q007受託後、店で木箱を1枚売ると手持ちが1枚減る',soldOne.clicked&&soldOne.before===2&&soldOne.after===1,soldOne);
    await soldAfter.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await soldAfter.until(`document.querySelector("#scr-village.active")&&!G._isShop&&${notFading}`,30000);
    await clickFacility(soldAfter,'^酒場$');
    // シート（Q007_1）に失敗後台詞がまだ無い間は、台詞の確認を飛ばし、受託後台詞が出ないことだけを見る。
    const q7FailedAfter=(q10.q.failedAfter||[])[0];
    if(q7FailedAfter){
      await waitLine(soldAfter,q7FailedAfter);
      await waitVisibleFace(soldAfter,q7FailedAfter.face);
    }else{
      await sleep(1500);
    }
    const soldFail=await soldAfter.run(`return {status:G.questProgress.Q007.status,boxes:(G.mainBoard||[]).filter(c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase()==='E102').length,acceptedAfterShown:[...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-text')].some(x=>x.textContent===${JSON.stringify(((q10.q.acceptedAfter||[])[0]||{}).text||'')})}`);
    ok(q7FailedAfter?'Q007受託後に木箱を失って再入店すると失敗後台詞、状態はacceptedのまま':'Q007受託後に木箱を失って再入店しても受託後台詞は出ない（シートに失敗後台詞が無いので台詞の確認は省略）、状態はacceptedのまま',
      soldFail.status==='accepted'&&soldFail.boxes===1&&!soldFail.acceptedAfterShown,soldFail);
    if(q7FailedAfter) await clickDialogue(soldAfter);
    await soldAfter.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,30000);
    await finish(soldAfter);

    const r=await newPage();
    await startRunWithWaveQuest(r,3,'Q007');
    await openWave(r,3);
    await clickFacility(r,'^酒場$');
    for(const line of q10.q.initial){ await waitLine(r,line); await clickDialogue(r); }
    await r.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")',30000);
    const reject=await r.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const before=(_rewCards||[]).filter(c=>c&&no(c)==='E102').length;const label=document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||'';document.querySelector('#reward-move-btns .rew-move-btn').click();return {before,label};})()`);
    ok('別ランの初期状態は木箱5枚・ボタン「拒否」',reject.before===5&&reject.label==='拒否',reject);
    for(const line of (q10.q.rejected||[])){ await waitLine(r,line); await clickDialogue(r); }
    await r.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("reward-screen-active")&&${notFading}`,30000);
    const rejected=await r.run(`(()=>{const no=c=>String(c&&(c.no||c.No||c['No.']||c.artCode)||'').toUpperCase();const e=G.questProgress.Q007;const save=SaveRun.serializeRunState();const all=[...(G.mainBoard||[]),...(G.spellSlots||[]),...(G.globalPanels||[]),...(_rewCards||[])];return {status:e?.status||'',saveStatus:save.questProgress.Q007?.status||'',transportCount:e?.transportCount,boxes:all.filter(c=>no(c)==='E102').length};})()`);
    ok('「拒否」後はrejectedで、木箱が持ち物に残らない',rejected.status==='rejected'&&rejected.saveStatus==='rejected'&&rejected.transportCount===0&&rejected.boxes===0,rejected);
    await finish(r);

    // ヴォルザーグ到着：受託時の輸送数3に対し、3／4／0／1個を自動判定する。
    const s3=await newPage();
    const goldS3=await beginQ007TownArrival(s3,3,'運ぶ3・手持3');
    await clickDialogue(s3); await waitLine(s3,q10.q2.initial[1]);
    ok('Q007・3/3：台詞2ではまだ所持金を加えない',await s3.run(`return G.gold`)===goldS3);
    await clickDialogue(s3); await waitLine(s3,q10.q2.initial[2]); await s3.until(`G.gold===${goldS3}+300`);
    ok('Q007・3/3：台詞1→台詞2→台詞3を出し、台詞3で+300G',true);
    await clickDialogue(s3);
    const resultS3=await inspectQ007TownResult(s3);
    ok('Q007・3/3：木箱0枚・completed、編成画面なし',resultS3.gold===goldS3+300&&resultS3.status==='completed'&&resultS3.boxes===0&&!resultS3.rewardSeen,resultS3);
    await finish(s3);

    const s4=await newPage();
    const goldS4=await beginQ007TownArrival(s4,4,'運ぶ3・手持4');
    await clickDialogue(s4); await waitLine(s4,q10.q2.initial[1]); await clickDialogue(s4);
    await waitLine(s4,q10.q2.initial[2]); await s4.until(`G.gold===${goldS4}+300`);
    ok('Q007・4/3：増えた木箱も成功、報酬は運ぶ数3で+300G',true);
    await clickDialogue(s4);
    const resultS4=await inspectQ007TownResult(s4);
    ok('Q007・4/3：木箱0枚・completed、編成画面なし',resultS4.gold===goldS4+300&&resultS4.status==='completed'&&resultS4.boxes===0&&!resultS4.rewardSeen,resultS4);
    await finish(s4);

    const z=await newPage();
    const goldZ=await beginQ007TownArrival(z,0,'運ぶ3・手持0',1000);
    await clickDialogue(z);
    const zeroLines=[q10.q2.specialA1[0],q10.q2.specialA2[0],q10.q2.specialA3[0],q10.q2.specialA4[0]];
    for(const [i,line] of zeroLines.entries()){
      await waitLine(z,line);
      if(i===zeroLines.length-1){ await z.until(`G.gold===${goldZ-300}`); await startPortraitFadeProbe(z); }
      await clickDialogue(z);
    }
    const resultZ=await inspectQ007TownResult(z);
    ok('Q007・0/3：A4で失った3個分の-300G、木箱0枚・failed',
      resultZ.gold===goldZ-300&&resultZ.status==='failed'&&resultZ.boxes===0&&resultZ.cargoLossPaid&&!resultZ.rewardSeen,resultZ);
    const fadeProbe=await z.run(`return window.__portraitFadeProbe||null`);
    ok('立ち絵の退場中、表情差分の不透明度が立ち絵を下回らない',
      // この場面は暗転の中で即座に外すことがある（フェードが無い＝透けも起きない）ので、フレーム数は問わない。
      fadeProbe&&fadeProbe.done&&fadeProbe.bad===0,fadeProbe);
    const resumed=await z.run(`(()=>{const before=G.gold;const save=SaveRun.buildRunSave('town');SaveRun.restoreRunState(save);return {before,after:G.gold,paid:G.questProgress.Q007.cargoLossPaid===true};})()`);
    ok('Q007の木箱損失支払いはランセーブ復元後も二重に発生しない',
      resumed.before===resumed.after&&resumed.paid,resumed);
    await finish(z);

    const poor=await newPage();
    const goldPoor=await beginQ007TownArrival(poor,0,'運ぶ3・手持0・所持金200',200);
    await clickDialogue(poor);
    for(const [i,line] of zeroLines.entries()){
      await waitLine(poor,line);
      if(i===zeroLines.length-1) await poor.until('G.gold===0');
      await clickDialogue(poor);
    }
    const resultPoor=await inspectQ007TownResult(poor);
    ok('Q007・所持金200Gで3個紛失：支払いはあるだけの200G、所持金は0未満にならない',
      resultPoor.gold===0&&resultPoor.status==='failed'&&resultPoor.cargoLossPaid,resultPoor);
    await finish(poor);

    const p=await newPage();
    const goldP=await beginQ007TownArrival(p,1,'運ぶ3・手持1',1000);
    await clickDialogue(p); await waitLine(p,q10.q2.initial[1]); await clickDialogue(p);
    const partialLines=[q10.q2.specialB1[0],q10.q2.specialB2[0],q10.q2.specialB3[0]];
    for(const [i,line] of partialLines.entries()){
      await waitLine(p,line);
      if(i===partialLines.length-1) await p.until(`G.gold===${goldP-200}`);
      await clickDialogue(p);
    }
    const resultP=await inspectQ007TownResult(p);
    ok('Q007・1/3：B3で失った2個分の-200G、木箱0枚・failed',
      resultP.gold===goldP-200&&resultP.status==='failed'&&resultP.boxes===0&&resultP.cargoLossPaid&&!resultP.rewardSeen,resultP);
    await finish(p);
  }

  // ── Q005「呪いの指輪輸送依頼」：祭壇配置で受託し、雷鳴の塔で回収 ──
  if(section('呪いの指輪')){
    const b=await newPage();
    await startRunWithWaveQuest(b,2,'Q005');
    await openWave(b,2);
    await clickFacility(b,'^酒場$');
    await waitLine(b,q5.q.initial[0]);
    await b.until(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC003"]');const plate=document.querySelector('.tavern-name-plate.is-visible');return !!(p&&p.complete&&p.naturalWidth>0&&plate);})()`,5000);
    const q005Portrait=await b.run(`(()=>{const p=document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC003"]');const plate=document.querySelector('.tavern-name-plate.is-visible');return {portrait:p?.dataset.portraitId||'',name:(plate?.textContent||'').replace(/\\s+/g,'')};})()`);
    ok('Q005酒場：BはMC003、名前札はシートの「キャラクターの名前」',
      q005Portrait.portrait==='MC003'&&q005Portrait.name===String(q5.q.characterName||'').replace(/\s+/g,''),q005Portrait);
    for(const line of q5.q.initial){ await waitLine(b,line); await clickDialogue(b); }
    await b.until('document.body.classList.contains("reward-screen-active")&&document.body.classList.contains("quest-ring-offer-active")&&document.querySelector("#reward-move-btns .rew-move-btn")',30000);
    const q005Offer=await b.run(`(()=>{const no=r=>String(r&&(r.no||r.No||r['No.']||r.artCode)||'').toUpperCase();const frames=[...document.querySelectorAll('#reward-offer-row .ring-offer-card')];const section=document.getElementById('reward-offer-section');return {phase:!!G._ringOfferPhase,frames:frames.length,ring:(G._ringOffer||[]).map(r=>({no:no(r),name:r.name||'',mark:r._questTransportId||''})),heading:getComputedStyle(section,'::before').content,message:getComputedStyle(section,'::after').content,justify:getComputedStyle(document.getElementById('reward-offer-row')).justifyContent,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    ok('Q005酒場：台詞5の後、祭壇と同じ提示列の中央に印付きR042を1つ出す',
      q005Offer.phase&&q005Offer.frames===1&&q005Offer.ring.length===1&&q005Offer.ring[0].no==='R042'
      &&q005Offer.ring[0].name==='呪いの指輪'&&q005Offer.ring[0].mark==='Q005'&&q005Offer.justify==='center',q005Offer);
    ok('Q005酒場：見出しは「依頼品」、上の文は説明文1、初期ボタンは「拒否」',
      q005Offer.heading.includes(q5.title2)&&q005Offer.message.includes(q5.message)&&q005Offer.label==='拒否',q005Offer);

    const fullSlots=await b.run(`(()=>{const no=r=>String(r&&(r.no||r.No||r['No.']||r.artCode)||'').toUpperCase();const original=clone(G.rings||[]);const ordinary=RING_POOL.find(r=>r&&no(r)!=='R042');if(!ordinary)return {ready:false};G.rings=Array.from({length:4},()=>clone(ordinary));_syncRewardProductionUi();const slots=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')];_dragSrc={arr:'ringOffer',idx:0};slots[0].dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));_openRingActionConfirm(0,slots[0]);const actions=[...document.querySelectorAll('#kw-tooltip .reward-action-btn')].map(x=>x.textContent.trim());_closeItemUseConfirm();const out={ready:true,full:G.rings.every(Boolean),offer:(G._ringOffer||[]).filter(Boolean).length,questRings:G.rings.filter(r=>r&&r._questTransportId==='Q005').length,canDiscardOrdinary:actions.includes('捨てる')};G.rings=original;_dragSrc=null;_syncRewardProductionUi();return out;})()`);
    ok('Q005酒場：指輪枠が満杯なら直接入れ替えず、通常指輪の「捨てる」で空きを作る',
      fullSlots.ready&&fullSlots.full&&fullSlots.offer===1&&fullSlots.questRings===0&&fullSlots.canDiscardOrdinary,fullSlots);

    const placed=await b.run(`(()=>{const slots=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')];const slot=slots.find(x=>!x._rewardRing);if(!slot)return {placed:false};_dragSrc={arr:'ringOffer',idx:0};slot.dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));const idx=(G.rings||[]).findIndex(r=>r&&r._questTransportId==='Q005');return {placed:idx>=0,index:idx,offer:(G._ringOffer||[]).filter(Boolean).length,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    ok('呪いの指輪を指輪枠に置くと「受託」に変わる',placed.placed&&placed.offer===0&&placed.label==='受託',placed);
    const returnedRing=await b.run(`(()=>{const idx=(G.rings||[]).findIndex(r=>r&&r._questTransportId==='Q005');const target=document.querySelector('#reward-offer-row .quest-ring-return-target');_dragSrc={arr:'rings',idx};target?.dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));return {target:!!target,held:(G.rings||[]).filter(r=>r&&r._questTransportId==='Q005').length,offer:(G._ringOffer||[]).filter(r=>r&&r._questTransportId==='Q005').length,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    ok('指輪枠から提示枠へ戻すと「拒否」に戻る',
      returnedRing.target&&returnedRing.held===0&&returnedRing.offer===1&&returnedRing.label==='拒否',returnedRing);
    const placedAgain=await b.run(`(()=>{const slot=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')].find(x=>!x._rewardRing);_dragSrc={arr:'ringOffer',idx:0};slot?.dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));return {held:(G.rings||[]).filter(r=>r&&r._questTransportId==='Q005').length,label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent.trim()||''};})()`);
    assert.ok(placedAgain.held===1&&placedAgain.label==='受託','Q005受託前の再配置に失敗');
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await waitLine(b,q5.q.accepted[0]);

    const locked=await b.run(`(()=>{const no=r=>String(r&&(r.no||r.No||r['No.']||r.artCode)||'').toUpperCase();let idx=(G.rings||[]).findIndex(r=>r&&r._questTransportId==='Q005');_syncRewardProductionUi();let slots=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')];_openRingActionConfirm(idx,slots[idx]);const actions=[...document.querySelectorAll('#kw-tooltip .reward-action-btn')].map(x=>x.textContent.trim()+(x.disabled?':off':''));_closeItemUseConfirm();const before=G.rings[idx];discardHeCard('rings',idx);const discardBlocked=G.rings[idx]===before;
      const ordinary=RING_POOL.find(r=>r&&no(r)!=='R042');const dest=(G.rings||[]).findIndex((r,i)=>i!==idx&&!r);let reordered=false;if(ordinary&&dest>=0){G.rings[dest]=clone(ordinary);_syncRewardProductionUi();slots=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')];_dragSrc={arr:'rings',idx};slots[dest].dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));reordered=G.rings[dest]?._questTransportId==='Q005';G.rings[idx]=null;idx=dest;_dragSrc=null;_syncRewardProductionUi();}
      const save=SaveRun.buildRunSave('town');const savedMark=save.state.player.rings.some(r=>r&&r._questTransportId==='Q005');G.rings[idx]._questTransportId='broken';G.questProgress.Q005.status='offered';SaveRun.restoreRunState(save);const restored=(G.rings||[]).find(r=>r&&r._questTransportId==='Q005');return {actions,locked:questRingActionsLocked(restored),discardBlocked,reordered,savedMark,restoredMark:!!restored,status:G.questProgress.Q005?.status||'',disabled:!!restored?._disabled,ordinaryR042Locked:questRingActionsLocked({...restored,_questTransportId:''})};})()`);
    ok('Q005受託：確認画面の「無効化」・「捨てる」は暗く押せず、直接破棄も防ぐ',
      locked.locked&&locked.discardBlocked&&locked.actions.join('|')==='無効化:off|捨てる:off|やめる'&&!locked.disabled,locked);
    ok('Q005受託：指輪枠内の並べ替えは可能で、個体印とacceptedをランセーブ／復元で保つ',
      locked.reordered&&locked.savedMark&&locked.restoredMark&&locked.status==='accepted'&&!locked.ordinaryR042Locked,locked);
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,30000);
    ok('Q005受託台詞の後に酒場を出てaccepted、印付き呪いの指輪を1つ所持',
      await statusOf(b,'Q005')==='accepted'&&await b.run(`return (G.rings||[]).filter(r=>r&&r._questTransportId==='Q005').length===1`));

    const gold0=await b.run(`return Number(G.gold)||0`);
    await b.until('!G._villageIntroPlaying',30000);
    await b.run(`G._wave=2;G._waveStage=10;G._waveVillage=true;G._isWaveAltar=true;openMapVillage({tower:true,intro:true});return 1;`);
    await waitLine(b,q5.q2.initial[0]);
    ok('Q005雷鳴の塔：台詞1ではまだ指輪と所持金を変えない',
      await b.run(`return G.gold===${gold0}&&(G.rings||[]).some(r=>r&&r._questTransportId==='Q005')`));
    await clickDialogue(b); await waitLine(b,q5.q2.initial[1]);
    ok('Q005雷鳴の塔：台詞2でもまだ指輪と所持金を変えない',
      await b.run(`return G.gold===${gold0}&&(G.rings||[]).some(r=>r&&r._questTransportId==='Q005')`));
    await clickDialogue(b); await waitLine(b,q5.q2.initial[2]);
    await b.until(`G.gold===${gold0}+200&&!(G.rings||[]).some(r=>r&&r._questTransportId==='Q005')`,5000);
    ok('Q005雷鳴の塔：台詞3で200Gを渡し、印付き呪いの指輪を回収',true);
    await clickDialogue(b);
    await b.until(`G.questProgress.Q005?.status==='completed'&&!document.body.classList.contains('tavern-tower-event-active')`,15000);
    ok('Q005雷鳴の塔：会話完了後はcompleted',await b.run(`return G.questProgress.Q005.description===''`));
    await finish(b);

    const r=await newPage();
    await startRunWithWaveQuest(r,2,'Q005');
    await openWave(r,2);
    await clickFacility(r,'^酒場$');
    for(const line of q5.q.initial){ await waitLine(r,line); await clickDialogue(r); }
    await r.until('document.body.classList.contains("reward-screen-active")&&document.querySelector("#reward-move-btns .rew-move-btn")',30000);
    await r.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    for(const line of q5.q.rejected){ await waitLine(r,line); await clickDialogue(r); }
    await r.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&!document.body.classList.contains("reward-screen-active")&&${notFading}`,30000);
    const rejected=await r.run(`(()=>{const no=x=>String(x&&(x.no||x.No||x['No.']||x.artCode)||'').toUpperCase();const save=SaveRun.serializeRunState();return {status:G.questProgress.Q005?.status||'',saved:save.questProgress.Q005?.status||'',r042:(G.rings||[]).filter(x=>no(x)==='R042').length,marked:(G.rings||[]).filter(x=>x&&x._questTransportId==='Q005').length};})()`);
    ok('Q005別ランで拒否：rejectedで、呪いの指輪を持ち物に残さない',
      rejected.status==='rejected'&&rejected.saved==='rejected'&&rejected.r042===0&&rejected.marked===0,rejected);
    await finish(r);
  }

  // ── 施設会話：宿屋の不足時表情と、Bだけの入店台詞でも A を出す ──────
  if(section('施設会話')){
    const b=await newPage();
    await startRunWithWaveQuest(b,2,'Q002');
    await openWave(b,2);
    await b.run(`G.gold=0;G._waveLife=0;updateHUD();return 1;`);
    const innTalk=await b.run(`return villageTalkEntry('「宿屋」入店時')`);
    await clickFacility(b,'^宿屋$');
    await waitLine(b,innTalk['台詞1']);
    const portraits=await b.run(`return [...document.querySelectorAll('#tavern-presentation-layer img.tavern-portrait.is-visible')].map(x=>x.dataset.portraitId)`);
    ok('宿屋の B の入店台詞でも A（MC001）が出る',portraits.includes('MC001'),{portraits});
    await clickDialogue(b);
    await waitChoice(b,innTalk['台詞2']);
    await clickChoice(b,0);
    await waitLine(b,innTalk['ゴールド不足時台詞']);
    await waitVisibleFace(b,innTalk['ゴールド不足時台詞'].face);
    ok('宿屋のゴールド不足時台詞は会話データの表情を使う',await face(b,innTalk['ゴールド不足時台詞'].face)==='表示',innTalk['ゴールド不足時台詞']);
    await clickDialogue(b);
    await b.until(`document.querySelector('#scr-village.active')&&!G._isTavern&&${notFading}`,30000);
    await finish(b);
  }

  // ── ギャラハ魔導店：闘技場参加後の専用入店台詞 ───────────────
  if(section('闘技場後')){
    const arenaAfterCases=[
      {label:'賞金0',column:'特殊台詞A1',result:{wins:0,prize:0,allWon:false}},
      {label:'賞金あり',column:'台詞1',result:{wins:3,prize:100,allWon:false}},
      {label:'全勝',column:'特殊台詞A2',result:{wins:6,prize:800,allWon:true}},
    ];
    for(const scenario of arenaAfterCases){
      const b=await newPage();
      await startRunWithWaveQuest(b,3,'Q007');
      await openWave(b,3);
      // 店の初回説明は表示済みにしておく（enterShop と同じ）。
      await b.run(`['shop','item','forge'].forEach(k=>SaveProfile.markTutorialShown('shop:'+k));return 1;`);
      const expected=await b.run(`(()=>{G._arenaChallengeUsed={3:true};G._arenaResults={3:${JSON.stringify(scenario.result)}};G._facilityTalkSeen={'3:shop':true};
        const talk=villageTalkEntry('「魔導店」入店時（闘技場後）')||{};
        const picked=_facilityArenaAfterTalkLine(talk);
        const source=talk[${JSON.stringify(scenario.column)}];
        const normal=villageTalkEntry('「魔導店」入店時')?.['台詞1'];
        const saved=SaveRun.serializeRunState().choices._arenaResults?.[3];
        return {picked,source,normal,saved};})()`);
      await clickFacility(b,'^魔[導道]店$');
      await waitLine(b,expected.picked);
      const first=await b.run(`return {a:!!document.querySelector('#tavern-presentation-layer img.tavern-portrait[data-portrait-id="MC001"].is-visible'),text:document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent||''}`);
      ok(`闘技場後の魔導店（${scenario.label}）：会話データの分岐と A（MC001）を表示`,
        first.a&&first.text===expected.picked.text&&expected.picked.text===expected.source.text
        &&expected.saved?.wins===scenario.result.wins&&expected.saved?.prize===scenario.result.prize
        &&expected.saved?.allWon===scenario.result.allWon,
        {first,expected,scenario});
      await clickDialogue(b);
      await b.until('document.body.classList.contains("reward-screen-active")&&G._isShop');
      await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
      await b.until(`document.querySelector('#scr-village.active')&&!G._isShop&&${notFading}`,30000);
      if(scenario.column==='特殊台詞A1'){
        await clickFacility(b,'^魔[導道]店$');
        await waitLine(b,expected.normal);
        const second=await b.run(`(()=>{const seen=G._facilityTalkSeen||{};return {text:document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent||'',normal:seen['3:shop']===true,special:seen['3:shop:arenaAfter']===true};})()`);
        ok('闘技場後の専用台詞は1回だけで、次の魔導店入店は通常台詞',second.text===expected.normal.text&&second.special,second);
        // 台詞の表示直後のクリックは取りこぼすことがあるので、店の画面に進むまで送る。
        for(let k=0;k<8&&!(await b.run('return document.body.classList.contains("reward-screen-active")&&!!G._isShop'));k++){ await clickDialogue(b); await sleep(700); }
        await b.until('document.body.classList.contains("reward-screen-active")&&G._isShop');
        await sleep(600);
        await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
        try{ await b.until(`document.querySelector('#scr-village.active')&&!G._isShop&&${notFading}`,30000); }
        catch(e){ console.log('店を出る時の状態',JSON.stringify(await b.run(`return {btn:[...document.querySelectorAll('#reward-move-btns .rew-move-btn')].map(x=>x.textContent.trim()),confirm:document.querySelector('#game-confirm-root.is-open')?document.getElementById('game-confirm-message')?.textContent:null,body:document.body.className.slice(0,200),screen:document.querySelector('.screen.active')?.id,dlg:[...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-text')].map(x=>x.textContent)}`))); throw e; }
      }
      await finish(b);
    }
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
    const buffed=await b.run(`(()=>{const bd=G.mainBoard;if(bd[1]){const e=bd.findIndex((c,i)=>i!==1&&!c);if(e>=0){bd[e]=bd[1];bd[1]=null;}}})();takeRewCard(0);placePendingPanelToSelectedUnit(1);
      const f=G.mainBoard[1];const p0=f.power;
      G._pendingItemUse={key:'giant_scroll',slotIdx:0};handlePendingItemBoardTarget(1);
      const p1=G.mainBoard[1].power;const mark=!!G.mainBoard[1]._itemBuffed;
      _dragSrc={arr:'boardCards',idx:1,unitIdx:G._selectedBoardUnitIdx};_returnDragSrcToRewardArea();
      renderRewCards();renderHandEditor();
      const back=_rewCards.find(c=>c&&/ファラ/.test(c.name));
      return {p0,p1,mark,back:!!back,backMark:!!(back&&back._itemBuffed),label:document.querySelector('#reward-move-btns .rew-move-btn .rew-btn-label')?.textContent};`);
    ok('ファラにアイテムを使うと印が付き、報酬欄へ戻しても残る',buffed.p1===buffed.p0+5&&buffed.mark&&buffed.back&&buffed.backMark&&buffed.label==='拒否',buffed);
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    const lines=[...q1.q.specialA1,...q1.q.specialA2,...q1.q.specialA3];
    ok('特殊拒否台詞A1・A2・A3がシートにある',lines.length===3,{lines});
    // 表情は新しい方を上に重ねてフェードインする（前の表情は少し後で外す）。見えている一番上の表情を見る。
    const faceNow=()=>b.run(`const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')];return fs.length?fs[fs.length-1].dataset.faceId:''`);
    await waitLine(b,lines[0]); await sleep(700);
    await waitVisibleFace(b,lines[0].face);
    ok(`特殊拒否台詞A1の間はシート指定の${lines[0].face}`,await faceNow()===lines[0].face);
    await clickDialogue(b); await waitLine(b,lines[1]);
    await waitVisibleFace(b,lines[1].face);
    // 表情の切り替え中、毎フレーム「どれか1枚の表情が不透明」であること（元の顔が透けない）。
    await b.run(`window.__faceMin=1;window.__faceFrames=0;const tick=()=>{const fs=[...document.querySelectorAll('.tavern-presentation-host .tavern-face')];
      if(fs.length){__faceFrames++;__faceMin=Math.min(__faceMin,Math.max(...fs.map(f=>f.complete&&f.naturalWidth>0?Number(getComputedStyle(f).opacity):0)));}
      if(G._isTavern) requestAnimationFrame(tick);};requestAnimationFrame(tick);return 1;`);
    await clickDialogue(b); await waitLine(b,lines[2]);
    const lastSpecialFace=[...lines].reverse().find(line=>line.face)?.face||'';
    ok('特殊拒否台詞はA2の後にA3も続け、A3の無指定では直前のシート表情を保つ',await faceNow()===lastSpecialFace);
    await clickDialogue(b);
    await sleep(100);
    await sleep(500);
    const fp=await b.run(`const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="${lastSpecialFace}"]');const m=document.querySelector('.tavern-portrait[data-portrait-id="MC001"]');
      return {dx:parseFloat(f.style.left)-parseFloat(m.style.left),dy:parseFloat(f.style.top)-parseFloat(m.style.top),w:f.getBoundingClientRect().width/m.getBoundingClientRect().width*1990,min:__faceMin,frames:__faceFrames}`);
    ok('表情の差分は MC001 の左上から X811・Y335（351×351）、切り替え中に元の顔が透けない',fp.dx===811&&fp.dy===335&&Math.abs(fp.w-351)<1&&fp.min>0.99,fp);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`);
    ok('特殊拒否台詞A1→A2→A3の後、酒場を出る',await status(b)==='rejectedSpecial');
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
    await b.run(`(()=>{const bd=G.mainBoard;if(bd[1]){const e=bd.findIndex((c,i)=>i!==1&&!c);if(e>=0){bd[e]=bd[1];bd[1]=null;}}})();takeRewCard(0);placePendingPanelToSelectedUnit(1);
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
      faces:[...document.querySelectorAll('.tavern-presentation-host .tavern-face.is-visible')].map(f=>f.dataset.faceId).join(),slot:!!_ensureItemSlots()[0],pending:!!G._pendingItemUse,
      facilities:getComputedStyle(document.getElementById('village-facilities')).display,moves:getComputedStyle(document.getElementById('village-move-btns')).display}`);
    const destroyedFirstFace=q1.q.destroyed1[0].face||'';
    ok('編成を閉じて酒場の会話へ（A は非戦闘時死亡台詞のシート表情、生贄人形は使い切り）',!st.reward&&st.village&&st.faces===destroyedFirstFace&&!st.slot&&!st.pending,st);
    ok('護衛依頼の非戦闘破壊会話中も、街の施設ボタンと「出発する」を押せない',st.facilities==='none'&&st.moves==='none',st);
    await clickDialogue(b);
    await b.until(`!!document.querySelector('.tavern-portrait.is-dying[data-portrait-id="MC002"]')`,3000);
    ok('台詞1の後、ファラの立ち絵を赤く消す',true);
    // 非戦闘時死亡時台詞2（シートにあれば）は、立ち絵を消した後に出す。
    for(const line of (q1.q.destroyed2||[])){ await waitLine(b,line); await clickDialogue(b); }
    await b.until(`document.querySelector("#scr-village.active")&&!G._isTavern&&${notFading}`,15000);
    ok('酒場を出て、クエストは killed（ファラは魔導板に戻らない）',await status(b)==='killed'&&await b.run(`return !(G.mainBoard||[]).some(x=>x&&/ファラ/.test(x.name))`));
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.destroyedAfter[0]);
    await waitVisibleFace(b,q1.q.destroyedAfter[0].face);
    await sleep(600);
    ok('再訪時は非戦闘時死亡後台詞のシート表情（立ち絵は A だけ）',await b.run(`return [...document.querySelectorAll('#tavern-presentation-layer img.tavern-portrait')].map(i=>i.dataset.portraitId).join()==='MC001'`)&&await face(b,q1.q.destroyedAfter[0].face)==='表示');
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
    await e.run(`(()=>{const bd=G.mainBoard;if(bd[1]){const e=bd.findIndex((c,i)=>i!==1&&!c);if(e>=0){bd[e]=bd[1];bd[1]=null;}}})();takeRewCard(0);placePendingPanelToSelectedUnit(1);
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
    // 商品パネルで既存の魔導板カードを押し出す入れ替えは、ドラッグ／クリックとも禁止する。
    // 手動で商品枠へ戻す売却と、この来店中に買ったカードの返品は既存どおり確認する。
    const s=await newPage();
    await acceptedRun(s);
    await openWave(s,WAVE);
    await enterShop(s);
    await sleep(300);
    const shopSetup=await s.run(`(()=>{
      const unit=_getPartyBoardUnit();
      const occupied=unit&&unit.boardCards.findIndex(Boolean);
      const def=PANEL_POOL.find(x=>x&&x.name==='ゴーレム');
      if(!unit||occupied<0||!def) throw new Error('ショップ入れ替え検査の盤面または商品を作れない');
      const product=makePanel(def.id);product._buyPrice=50;
      _rewCards=[product,null,null,null,null];
      G.gold=1000;G._isRewardTown=true;G._freeRewardPanelMode=false;G._rewardOnePickMode=true;_rewFreePickDone=false;
      renderRewCards();renderHandEditor();renderMoveSlotsInEnemy();
      return {occupied,oldName:unit.boardCards[occupied].name};
    })()`);
    const blockedDrag=await s.run(`(()=>{
      const unit=_getPartyBoardUnit();const idx=${shopSetup.occupied};const old=unit.boardCards[idx];
      const beforeGold=G.gold;const offer=_rewCards[0];
      _dragSrc={arr:'rew',idx:0};
      const boardUsable=_canCardUseBoardSlot(offer,idx,unit);
      const dragAllowed=_boardDropAllowedAt(idx);
      dropOnCard('boardCards',idx);
      return {boardUsable,dragAllowed,boardKept:unit.boardCards[idx]===old,offerKept:_rewCards[0]===offer,
        goldKept:G.gold===beforeGold,pending:!!G._pendingPanelPlacement};
    })()`);
    ok('ショップ：埋まったマスはドラッグ判定も実ドロップも不可で、カード・お金が残る',
      blockedDrag.boardUsable&&!blockedDrag.dragAllowed&&blockedDrag.boardKept&&blockedDrag.offerKept
      &&blockedDrag.goldKept&&!blockedDrag.pending,blockedDrag);
    const blockedClick=await s.run(`(()=>{
      const unit=_getPartyBoardUnit();const idx=${shopSetup.occupied};const old=unit.boardCards[idx];
      const beforeGold=G.gold;const offer=_rewCards[0];
      takeRewCard(0);const started=!!G._pendingPanelPlacement;
      const placed=placePendingPanelToSelectedUnit(idx);cancelPendingPanelPlacement();
      return {started,placed,boardKept:unit.boardCards[idx]===old,offerKept:_rewCards[0]===offer,
        goldKept:G.gold===beforeGold,pending:!!G._pendingPanelPlacement};
    })()`);
    ok('ショップ：埋まったマスへのクリック配置も不可で、カード・お金が残る',
      blockedClick.started&&!blockedClick.placed&&blockedClick.boardKept&&blockedClick.offerKept
      &&blockedClick.goldKept&&!blockedClick.pending,blockedClick);
    const bought=await s.run(`(()=>{
      const unit=_getPartyBoardUnit();const idx=unit.boardCards.findIndex(c=>!c);const beforeGold=G.gold;
      takeRewCard(0);const started=!!G._pendingPanelPlacement;const placed=placePendingPanelToSelectedUnit(idx);
      return {started,placed,paid:G.gold===beforeGold-50,boardName:unit.boardCards[idx]?.name||'',offerGone:!_rewCards[0]};
    })()`);
    ok('ショップ：空きマスなら商品を買えて、ゴールドだけ価格分減る',
      bought.started&&bought.placed&&bought.paid&&bought.boardName==='ゴーレム'&&bought.offerGone,bought);
    const returned=await s.run(`(()=>{
      const unit=_getPartyBoardUnit();const idx=unit.boardCards.findIndex(c=>c&&c.name==='ゴーレム');
      const card=idx>=0?unit.boardCards[idx]:null;const beforeGold=G.gold;
      const returnable=!!card&&isShopReturnable(card);const btn=document.querySelector('#hand-slots .shop-return-btn');
      if(btn) btn.click();
      return {returnable,button:!!btn,refunded:G.gold===beforeGold+50,boardGone:idx>=0&&!unit.boardCards[idx],offerBack:!!_rewCards[0]};
    })()`);
    ok('ショップ：この来店で買ったカードは従来どおり返品でき、買値が全額戻る',
      returned.returnable&&returned.button&&returned.refunded&&returned.boardGone&&returned.offerBack,returned);
    const sold=await s.run(`(()=>{
      const unit=_getPartyBoardUnit();const idx=unit.boardCards.findIndex(c=>!c);const held=makePanel(PANEL_POOL.find(x=>x&&x.name==='ゴーレム').id);
      unit.boardCards[idx]=held;const beforeGold=G.gold;_dragSrc={arr:'boardCards',idx,unitIdx:G._selectedBoardUnitIdx};_returnDragSrcToRewardArea();
      const saleIdx=_rewCards.findIndex(c=>c&&c._shopSalePending);const saleReady=saleIdx>=0&&!unit.boardCards[idx]&&G.gold===beforeGold;
      const sold=saleReady&&_sellPendingShopCard(saleIdx);
      return {saleReady,sold,goldIncreased:sold&&G.gold>beforeGold};
    })()`);
    ok('ショップ：魔導板カードを商品枠へ手動で戻す売却も従来どおり残る',
      sold.saleReady&&sold.sold&&sold.goldIncreased,sold);
    await s.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    await s.until(`document.querySelector("#scr-village.active")&&!G._isShop&&${notFading}`,30000);
    await finish(s);

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
    const failedNonBattleFace=q1.q.failedNonBattle[0].face;
    ok('OKで暗幕をかけ、非戦闘時クエスト失敗台詞（Aはシート表情）',await b.run(`return !!document.querySelector('.quest-event-shade')`)&&await face(b,failedNonBattleFace)==='表示');
    await clickDialogue(b);
    await b.until(`document.querySelector("#scr-village.active")&&!G._isShop&&${notFading}`,30000);
    ok('台詞の後に店を出て、クエストは失敗',await status(b)==='failed');
    await clickFacility(b,'^酒場$');
    await waitLine(b,q1.q.failedAfter[0]);
    await sleep(700);
    // 表情はシートの「失敗後台詞」の表情列に従う（2026-09-26 表情列を正とする）。
    const failedAfterFace=q1.q.failedAfter[0].face;
    ok(`失敗後に酒場へ入ると失敗後台詞（Aは最初から${failedAfterFace}）`,await face(b,failedAfterFace)==='表示');
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
      // 死亡はファラ1人（HP1）で戦う。強いゴーレムを並べると、味方が先に動いた時に1体だけの敵を倒し切り、
      // ファラが一度も攻撃されずに終わって台詞待ちが時間切れになっていた（先攻は乱数なので結果が揺れていた）。
      // 逃走はATK0のファラだけでは戦闘が終わらないので、今までどおりゴーレムを並べる。
      await b.run(`const c=_getPartyBoardUnit().boardCards[1];${kind==='death'?'c.life=1;c.hp=1;c.power=1;':'c.power=0;c.atk=0;c.life=60;'}
        ${kind==='death'?'':"const d=PANEL_POOL.find(x=>x.name==='ゴーレム');const g=makePanel(d.id);g.power=99;g.life=999;_getPartyBoardUnit().boardCards[3]=g;"}
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

  // ── 画面仕様：出撃キャラ不在の共通エラー／図書館の貸出返却 ────────
  if(section('画面仕様')){
    const b=await newPage();
    await startRunWithQuest(b);
    const before=await b.run(`(()=>{
      showScreen('battle');
      G.phase='reward';G._onlineMode=false;G._moveInlineLocked=false;G._pendingPanelPlacement=null;
      G._isShop=false;G._isItemShop=false;G._isForge=false;G._isTavern=false;G._isLibrary=false;
      G._isRingExchange=false;G._isVillageMenu=false;G._isWaveAltar=false;
      G.mainBoard=new Array(MAIN_BOARD_SIZE).fill(null);G._partyBoardUnit=null;
      document.body.classList.add('reward-screen-active');
      renderMoveSlotsInEnemy();
      const button=document.querySelector('#reward-move-btns .rew-move-btn');
      return {exists:!!button,disabled:!!button?.disabled,disabledClass:!!button?.classList.contains('disabled')};
    })()`);
    ok('出撃キャラ不在でも戦闘開始ボタンは押せる',before.exists&&!before.disabled&&!before.disabledClass,before);
    await b.run(`document.querySelector('#reward-move-btns .rew-move-btn').click();return 1;`);
    const noCharacter=await b.run(`return {
      active:document.body.classList.contains('fatal-error-active'),
      title:document.getElementById('fatal-error-title')?.textContent||'',
      message:document.getElementById('fatal-error-message')?.textContent||'',
      button:document.getElementById('fatal-error-back-btn')?.textContent||'',
      wantTitle:textMessage('「戦闘キャラ不在時」見出し',''),
      wantMessage:textMessage('戦闘キャラ不在時',''),
      wantButton:textMessage('「戻る」ボタン','')
    }`);
    ok('出撃キャラ不在の押下で共通エラー画面にシート文言を出す',
      noCharacter.active&&noCharacter.title===noCharacter.wantTitle&&noCharacter.message===noCharacter.wantMessage
      &&noCharacter.button===noCharacter.wantButton,noCharacter);
    await b.run(`document.getElementById('fatal-error-back-btn').click();return 1;`);
    ok('不在画面の「戻る」で編成画面に留まる',await b.run(`return G.phase==='reward'&&!document.body.classList.contains('fatal-error-active')&&!!document.querySelector('#scr-battle.active')`));

    const loan=await b.run(`(()=>{
      G._isLibrary=true;G._libraryTutorialActive=false;G._rewardOnePickMode=false;
      document.body.classList.add('library-formation-active');
      const cards=_libraryLoanCards();
      _rewCards=clone(cards);G._libraryLoanInitialCards=clone(cards);
      G.mainBoard=new Array(MAIN_BOARD_SIZE).fill(null);G._partyBoardUnit=null;
      const sourceIndex=2;G.mainBoard[0]=clone(_rewCards[sourceIndex]);_rewCards[sourceIndex]=null;
      renderRewCards();renderHandEditor();renderFieldEditor();renderMoveSlotsInEnemy();
      const button=document.querySelector('#hand-slots.board-slots > :nth-child(1) .library-loan-return-btn');
      return {sourceIndex,name:G.mainBoard[0]?.name||'',button:button?.textContent||'',want:textMessage('「返却」ボタン','')};
    })()`);
    ok('図書館の貸出カードは盤面右上に「返却」を出す',!!loan.name&&loan.button===loan.want,loan);
    await b.run(`document.querySelector('#hand-slots.board-slots > :nth-child(1) .library-loan-return-btn').click();return 1;`);
    const returned=await b.run(`return {
      boardEmpty:!G.mainBoard[0],
      name:_rewCards[${loan.sourceIndex}]?.name||'',
      slot:Number(_rewCards[${loan.sourceIndex}]?._libraryLoanSlot),
      sourceBadge:[...document.querySelectorAll('#reward-offer-row .library-loan-badge')].some(el=>el.textContent===textMessage('図書館「貸出」表示','貸出'))
    }`);
    ok('「返却」でカードが元の図書館報酬枠へ戻る',returned.boardEmpty&&returned.name===loan.name
      &&returned.slot===loan.sourceIndex&&returned.sourceBadge,returned);
    await finish(b);
  }
  console.log(`RESULT ${checks.length}項目 OK`);
  globalThis.__questOpenPages=openPages;
})().catch(async error=>{
  console.error('RESULT_NG',error&&error.message||error);
  // 止まった時の状態（原因の切り分け用）。
  for(const pg of (globalThis.__questOpenPages||[])){
    try{ console.error('STATE',JSON.stringify(await pg.run(`return {screen:document.querySelector('.screen.active')?.id,body:document.body.className.slice(0,240),phase:G.phase,wave:G._wave,stage:G._waveStage,altar:G._isWaveAltar,intro:G._villageIntroPlaying,pending:!!G._pendingPanelPlacement,
      q4:G.questProgress&&G.questProgress.Q004&&{s:G.questProgress.Q004.status,ep:G.questProgress.Q004.encounterPhase,fled:G.questProgress.Q004.encounterFled,defeated:G.questProgress.Q004.encounterDefeated,reward:G.questProgress.Q004.encounterRewardGiven},
      q6:G.questProgress&&G.questProgress.Q006&&{s:G.questProgress.Q006.status,ev:G.questProgress.Q006.pendingEvent,after:G.questProgress.Q006.towerKeepDepartAfter},
      retry:G._waveRetryEnemyKey,isRetry:G._waveIsRetry,withdraw:G._waveWithdraw,defeatHandled:G._battleDefeatHandled,
      arena:{active:G._arenaActive,round:G._arenaRound,pending:G._arenaOutcomePending},battleLine:document.getElementById('battle-line-text')?.textContent||'',
      proceed:typeof G._battleProceedAction==='function',fleeTrace:window.__q004FleeTrace||window.__aresFleeTrace||null,deathTrace:window.__aresDeathTrace||null,
      dlg:[...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-text')].map(x=>({text:x.textContent.slice(0,40),visible:x.classList.contains('is-visible'),opacity:getComputedStyle(x).opacity}))}`))); }catch(_e){}
    try{ await pg.close(); }catch(_e){}
  }
  process.exitCode=1;
  // 失敗してもブラウザを閉じる（閉じないと node が終わらない）。
  process.exit(1);
});
