'use strict';

// 闘技場（ギャラハ wave 3）と Q004「魔獣撃退依頼」の実ブラウザ回帰検査。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
//   VB_ONLY=闘技場 または VB_ONLY=魔獣撃退 で節を絞れる。
const assert=require('node:assert/strict');
const {launch,sleep}=require('./headless');

const URL='http://127.0.0.1:5500/index.html';
const ONLY=process.env.VB_ONLY||'';
const ARENA_WAVE=3;
const QUEST_WAVE=2;
const ARENA_ROUNDS=6;

(async()=>{
  const checks=[];
  const ok=(name,value,extra)=>{
    assert.ok(value,`${name}${extra?' '+JSON.stringify(extra):''}`);
    checks.push(name);
    console.log('OK '+name);
  };
  const section=name=>!ONLY||name.includes(ONLY)||ONLY.includes(name);

  const openPages=new Set();
  globalThis.__arenaQ004OpenPages=openPages;
  async function newPage(){
    const b=await launch({width:1600,height:900});
    openPages.add(b);
    await b.call('Network.enable');
    // headless.js の eval は本文を関数として実行するので、値を返すには return が要る。
    // 既存検査と同じく、単一の IIFE は暗黙に return する。
    b.run=expression=>{
      const code=String(expression).trim();
      const iife=/^\(\s*(?:async\s*)?\(\s*\)\s*=>[\s\S]*\)\s*\(\s*\)\s*;?$/.test(code);
      const single=iife||(!/\breturn\b/.test(code)&&!code.replace(/;\s*$/,'').includes(';'));
      return b.eval(single?`return (${code.replace(/;\s*$/,'')});`:code);
    };
    b.until=(expr,timeout=20000)=>b.waitFor(expr,timeout,80);
    await b.goto(URL,2500);
    await b.until('typeof G!=="undefined"&&window.QUEST_DATA&&window.QUEST_DATA.Q004_1&&window.QUEST_DATA.Q004_2&&typeof PANEL_POOL!=="undefined"&&PANEL_POOL.length>20&&typeof questDebugForceWaveQuest==="function"',30000);
    // 戦闘開始時の台詞（#battle-line-layer）はプレイヤーのクリックまで進まない作り。検査では出たら自動で送る。
    await b.run(`if(!window.__vbLineClicker){window.__vbLineClicker=setInterval(()=>{const l=document.getElementById('battle-line-layer');if(l&&l.classList.contains('is-visible'))document.dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));},700);}return 1;`);
    return b;
  }

  // 勝利画面の「進む」は .click() では進まない（ポインター操作で受ける）。実際のマウス操作で押す。
  async function clickContinue(b){
    const pos=await b.run(`(()=>{const e=document.getElementById('battle-continue-btn');if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];})()`);
    if(!pos) throw new Error('「進む」ボタンが無い');
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos[0],y:pos[1]});
    await b.call('Input.dispatchMouseEvent',{type:'mousePressed',x:pos[0],y:pos[1],button:'left',clickCount:1});
    await b.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos[0],y:pos[1],button:'left',clickCount:1});
  }
  const notFading='!document.getElementById("screen-switch-fade")?.classList.contains("is-blocking")&&!G._villageIntroPlaying';
  const lineSel=side=>`#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="${side}"] .tavern-dialogue-text`;
  async function waitLine(b,line){
    const side=line.speaker==='A'?'left':'right';
    await b.until(`document.querySelector('${lineSel(side)}')?.textContent===${JSON.stringify(line.text)}`,60000);
  }
  const clickDialogue=b=>b.run(`document.getElementById('tavern-dialogue-layer')?.click();return 1;`);
  async function waitChoice(b,line){
    const expected=String(line&&line.text||'').split('\n').map(v=>v.trim()).filter(v=>v.startsWith('・'));
    await b.until(`(()=>JSON.stringify([...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-choice')].map(x=>x.textContent))===${JSON.stringify(JSON.stringify(expected))})()`,60000);
    return expected;
  }
  const clickChoice=(b,index)=>b.run(`document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-choice')[${Number(index)}]?.click();return 1;`);
  const boardSnapshotExpr=`(()=>JSON.stringify({
    mainBoard:G.mainBoard||[],globalPanels:G.globalPanels||[],spellSlots:G.spellSlots||[],rings:G.rings||[],
    mapPanelPowers:G.mapPanelPowers||[],panelPermanentBuffs:G.panelPermanentBuffs||{},
    panelColorPermanentBuffs:G.panelColorPermanentBuffs||{}
  }))()`;

  async function finish(b){
    await sleep(300);
    const failed=[...new Set(b.events.filter(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400)
      .map(e=>e.params.response.url))].filter(u=>!/\/favicon\.ico$/.test(u))
      // シート本体は利用者が置くもので、無ければ内蔵データへ落ちる（素材ではない）。
      .filter(u=>!/\/Vesselbound_data[^/]*\.xlsx$/.test(u));
    ok('読み込みに失敗した素材が無い',failed.length===0,{failed});
    const errors=b.consoleErrors().filter(e=>!/Failed to load resource/.test(String(e)));
    ok('コンソールにエラーが無い',errors.length===0,{errors:errors.slice(0,4)});
    openPages.delete(b);
    await b.close();
  }

  async function startDebugRun(b){
    await b.run(`window.removeEventListener('pointerdown',_skipStartupIntro,true);_optionApply({...OPTION_DEFAULTS,speed:'x3'});startGame(true);return 1;`);
    await b.until('G&&G._runId&&G._waveVillage',30000);
  }
  async function openWave(b,wave){
    await b.run(`G._wave=${Number(wave)};G._waveStage=1;G._waveVillage=true;G._isWaveAltar=false;openMapVillage();return 1;`);
    await b.until(`document.querySelector("#scr-village.active")&&document.querySelectorAll(".village-facility").length>0&&${notFading}`,30000);
  }
  async function clickFacility(b,pattern){
    await b.until(notFading);
    await b.run(`(()=>{const re=new RegExp(${JSON.stringify(pattern)});const el=[...document.querySelectorAll('.village-facility')].find(x=>re.test((x.querySelector('.village-facility-name')?.textContent||'').trim()));if(!el) throw new Error('施設ボタンなし '+${JSON.stringify(pattern)});el.click();return 1;})()`);
  }

  // デバッグ開始時のゴーレムを、戦闘中に確実に勝てる値へ揃える。
  // 魔導板の比較はこの準備後の状態を基準にする。
  async function prepareStrongBoard(b){
    const result=await b.run(`(()=>{
      const unit=_getPartyBoardUnit();
      if(!unit||!Array.isArray(unit.boardCards)) throw new Error('魔導板を取得できない');
      const board=unit.boardCards;
      let golem=board.find(c=>c&&c.name==='ゴーレム');
      if(!golem){
        golem=makePanel('ゴーレム');
        const slot=board.findIndex(c=>!c);
        if(!golem||slot<0) throw new Error('ゴーレムを魔導板へ置けない');
        board[slot]=golem;
      }
      golem.power=9999;golem.life=9999;golem.atk=9999;golem.hp=9999;golem.maxHp=9999;
      golem.baseAtk=9999;golem._permBasePower=9999;golem._permBaseLife=9999;
      G.gold=99999;G._waveLife=typeof waveLifeMax==='function'?waveLifeMax():3;
      if(typeof syncBoardCardPassives==='function') syncBoardCardPassives();
      if(typeof renderHandEditor==='function') renderHandEditor();
      if(typeof renderFieldEditor==='function') renderFieldEditor();
      return {gold:G.gold,golem:golem.name,power:golem.power,life:golem.life,board:board.filter(Boolean).length};
    })()`);
    return result;
  }

  async function startArenaRun(b){
    await startDebugRun(b);
    await openWave(b,ARENA_WAVE);
    const setup=await prepareStrongBoard(b);
    // WAVE より先に開幕台詞が出た場合も拾えるよう、闘技場へ入る前から記録する。
    await armWaveRecorder(b);
    const boardBefore=await b.run(`return ${boardSnapshotExpr}`);
    const talk=await b.run(`(()=>{const t=villageTalkEntry('「闘技場」入場時')||{};return {line1:t['台詞1']||null,prompt:t['台詞2']||null,line3:t['台詞3']||null,line4:t['台詞4']||null,line5:t['台詞5']||null,specialA1:t['特殊台詞A1']||null};})()`);
    assert.ok(talk.line1&&talk.prompt&&talk.line3&&talk.line4,'闘技場の会話シートを取得できない');
    await clickFacility(b,'^闘技場$');
    await waitLine(b,talk.line1);
    await clickDialogue(b);
    const choices=await waitChoice(b,talk.prompt);
    const participateIndex=choices.findIndex(text=>text.includes('参加する'));
    const costMatch=String(talk.prompt.text||'').match(/参加する.*?([\d,]+)G/);
    const cost=costMatch?Number(costMatch[1].replace(/,/g,'')):0;
    ok('闘技場：シートの参加選択肢が「参加する（120G）」',participateIndex>=0&&cost===120,{choices,cost});
    const goldBefore=Number(setup.gold);
    await clickChoice(b,participateIndex);
    await b.until(`G._arenaActive===true&&Number(G.gold)===${goldBefore-cost}`,10000);
    await waitLine(b,talk.line3);
    ok('闘技場：参加直後にシートの台詞3が出て参加費120Gが引かれる',true);
    await clickDialogue(b);
    return {talk,setup,boardBefore,goldBefore,cost};
  }

  async function armCarryProbe(b,kind,round){
    const key=kind==='arena'?'__arenaCarrySamples':'__garmCarrySamples';
    await b.run(`(()=>{
      window.${key}=[];
      const started=performance.now();
      const sample=()=>{
        const host=document.getElementById('scr-battle');
        const arenaMatch=${kind==='arena'?`G&&G._arenaActive&&Number(G._arenaRound)===${Number(round)}`:`G&&G._mapBattle&&G._mapBattle.nodeId==='quest-garm'`};
        if(arenaMatch&&host){
          const cards=[...host.querySelectorAll('#f-ally .unit-card')];
          const fadeOpacity=Math.max(0,...['battle-transition-fade','screen-switch-fade'].map(id=>{const el=document.getElementById(id);return el?Number(getComputedStyle(el).opacity)||0:0;}));
          const fade=fadeOpacity>0.5;
          const startText=[...host.querySelectorAll('.battle-start-intro .battle-start-title')].some(el=>/戦\\s*闘\\s*開\\s*始/.test(el.textContent||''));
          window.${key}.push({opening:host.classList.contains('battle-opening-pending')||host.classList.contains('battle-opening-active'),fade,fadeOpacity,startText,cards:cards.length,visible:cards.length>0&&cards.every(el=>getComputedStyle(el).visibility==='visible')});
        }
        if(performance.now()-started<15000) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);return 1;
    })()`);
  }
  async function arenaCarrySample(b,round){
    const samples=await b.run(`return window.__arenaCarrySamples||[]`);
    const opening=samples.filter(s=>s.opening);
    const allySamples=opening.filter(s=>s.cards>0);
    const maxFade=Math.max(0,...opening.map(s=>s.fadeOpacity||0));
    const hit=allySamples.find(s=>!s.fade&&!s.startText&&s.visible);
    ok(`闘技場：${round}戦目以降は暗転・戦闘開始文字なしで味方カードを表示`,!!hit&&maxFade<=0.5&&opening.every(s=>!s.startText)&&allySamples.every(s=>s.visible),{maxFade,opening:opening.length,allySamples:allySamples.length,samples:samples.slice(-6)});
    return samples;
  }
  // WAVE の表示開始・完全消去・開幕台詞をページ内の高頻度ポーリングで記録する。
  // __vbLineClicker が台詞を送る前に順序を確定し、__vbWaveSeen は従来どおり表示記録として残す。
  async function armWaveRecorder(b){
    await b.run(`if(!window.__vbWaveRecorder){
      window.__vbWaveSeen=[];window.__vbWaveGone=[];window.__vbWaveLineSeen=[];
      window.__vbWaveExpected={};window.__vbWaveWasVisible={};window.__vbWaveOrderErrors=[];window.__vbWaveTimeline=[];
      window.__vbWaveRecorder=setInterval(()=>{
        if(!(typeof G!=='undefined'&&G&&G._arenaActive)) return;
        const round=Math.max(1,Number(G._arenaRound)||1);const key='WAVE '+round+'/${ARENA_ROUNDS}';
        const wave=document.getElementById('arena-wave-intro');
        const waveStyle=wave?getComputedStyle(wave):null;
        const waveVisible=!!(wave&&wave.textContent.trim()===key&&waveStyle.visibility!=='hidden'&&Number(waveStyle.opacity)>0.01);
        if(waveVisible){
          __vbWaveWasVisible[key]=true;
          if(!__vbWaveSeen.includes(key)){__vbWaveSeen.push(key);__vbWaveTimeline.push({key,event:'wave-visible',at:performance.now()});}
          if(!Object.prototype.hasOwnProperty.call(__vbWaveExpected,key)){
            __vbWaveExpected[key]=typeof _battleStartLineSpeakers==='function'&&_battleStartLineSpeakers().length>0;
          }
        }else if(__vbWaveWasVisible[key]&&!__vbWaveGone.includes(key)){
          __vbWaveGone.push(key);__vbWaveTimeline.push({key,event:'wave-gone',at:performance.now()});
        }
        const line=document.getElementById('battle-line-layer');
        const lineVisible=!!(line&&line.classList.contains('is-visible'));
        if(lineVisible&&!__vbWaveLineSeen.includes(key)){
          __vbWaveLineSeen.push(key);__vbWaveTimeline.push({key,event:'line-visible',at:performance.now(),text:document.getElementById('battle-line-text')?.textContent||''});
          if(!__vbWaveSeen.includes(key)) __vbWaveOrderErrors.push({key,reason:'line-before-wave'});
          if(!__vbWaveGone.includes(key)||waveVisible) __vbWaveOrderErrors.push({key,reason:'line-before-wave-gone'});
        }
      },20);
    }return 1;`);
  }
  async function waitArenaIntro(b,round){
    await armWaveRecorder(b);
    const key=`WAVE ${round}/${ARENA_ROUNDS}`;
    await b.until(`(window.__vbWaveSeen||[]).includes(${JSON.stringify(key)})&&(window.__vbWaveGone||[]).includes(${JSON.stringify(key)})`,90000);
    await b.until(`G._arenaActive===true&&Number(G._arenaRound)===${Number(round)}&&document.querySelector("#scr-battle.active")`,60000);
    const expected=await b.run(`return !!(window.__vbWaveExpected||{})[${JSON.stringify(key)}]`);
    if(expected) await b.until(`(window.__vbWaveLineSeen||[]).includes(${JSON.stringify(key)})`,30000);
    const order=await b.run(`return {seen:(window.__vbWaveSeen||[]).includes(${JSON.stringify(key)}),gone:(window.__vbWaveGone||[]).includes(${JSON.stringify(key)}),line:(window.__vbWaveLineSeen||[]).includes(${JSON.stringify(key)}),expected:!!(window.__vbWaveExpected||{})[${JSON.stringify(key)}],errors:(window.__vbWaveOrderErrors||[]).filter(e=>e.key===${JSON.stringify(key)}),timeline:(window.__vbWaveTimeline||[]).filter(e=>e.key===${JSON.stringify(key)})}`);
    ok(`闘技場：${round}戦目の WAVE ${round}/${ARENA_ROUNDS} は開幕台詞より前に出て、完全に消えてから台詞`,
      order.seen&&order.gone&&(!order.expected||order.line)&&order.errors.length===0,order);
  }
  async function waitArenaConfirm(b,round){
    await b.until(`G._arenaOutcomePending===true&&Number(G._arenaRound)===${Number(round)}&&document.querySelector('#game-confirm-root.is-open')`,120000);
    const expected=25*Math.pow(2,round-1);
    const info=await b.run(`(()=>{const root=document.getElementById('game-confirm-root');return {message:document.getElementById('game-confirm-message')?.textContent||'',ok:document.getElementById('game-confirm-ok')?.textContent.trim()||'',cancel:document.getElementById('game-confirm-cancel')?.textContent.trim()||'',open:!!root?.classList.contains('is-open')};})()`);
    ok(`闘技場：${round}勝後の継戦確認は賞金${expected}G`,info.open&&info.message.includes(String(expected))&&info.ok==='続ける'&&info.cancel==='やめる',info);
    return info;
  }
  async function waitArenaVillage(b){
    await b.until(`!G._arenaActive&&G._isVillageMenu&&document.querySelector("#scr-village.active")&&!document.getElementById('tavern-dialogue-layer')&&${notFading}`,60000);
  }

  // ── 闘技場：ギャラハ wave 3 の6連戦、途中離脱 ────────────────
  if(section('闘技場')){
    const b=await newPage();
    const run=await startArenaRun(b);
    await waitArenaIntro(b,1);
    for(let round=1;round<ARENA_ROUNDS;round++){
      await waitArenaConfirm(b,round);
      await armCarryProbe(b,'arena',round+1);
      await armWaveRecorder(b);
      await b.run(`document.getElementById('game-confirm-ok').click();return 1;`);
      await waitArenaIntro(b,round+1);
      await arenaCarrySample(b,round+1);
    }
    await b.until(`G._arenaOutcomePending===true&&Number(G._arenaRound)===${ARENA_ROUNDS}&&document.getElementById('battle-continue-btn')`,120000);
    ok('闘技場：6戦目勝利後は「進む」ボタンで最終結果を進められる',true);
    await clickContinue(b);
    // 全勝は台詞4ではなく特殊台詞A1（会話メッセージシートの新列名）。
    await waitLine(b,run.talk.specialA1||run.talk.line4);
    ok('闘技場：全勝後は特殊台詞A1が出る',!!run.talk.specialA1);
    await b.until(`Number(G.gold)===${run.goldBefore-run.cost+800}`,30000);
    ok('闘技場：全勝後は参加前−参加費+800G',true);
    await clickDialogue(b);
    await waitArenaVillage(b);
    const after=await b.run(`(()=>{const name='闘技場';const el=[...document.querySelectorAll('.village-facility')].find(x=>(x.querySelector('.village-facility-name')?.textContent||'').trim()===name);return {gold:G.gold,board:${boardSnapshotExpr},sameBoard:JSON.stringify(${boardSnapshotExpr})===${JSON.stringify(run.boardBefore)},boardDiff:(()=>{const a=JSON.parse(${JSON.stringify(run.boardBefore)}),b=JSON.parse(${boardSnapshotExpr});const out=[];const walk=(x,y,p)=>{if(out.length>12)return;if(JSON.stringify(x)===JSON.stringify(y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'){for(const k of new Set([...Object.keys(x),...Object.keys(y)]))walk(x[k],y[k],p+'.'+k);}else out.push(p+': '+JSON.stringify(x)+' -> '+JSON.stringify(y));};walk(a,b,'');return out;})(),arenaUsed:!!G._arenaChallengeUsed?.[${ARENA_WAVE}],disabled:!!el?.classList.contains('village-facility-disabled')};})()`);
    // キーの並び順は復元で変わることがあるので、中身の差（boardDiff）で比べる。
    ok('闘技場：終了後も魔導板は参加前と同じで、闘技場ボタンが暗い',after.boardDiff.length===0&&after.arenaUsed&&after.disabled,after);
    await finish(b);

    const quit=await newPage();
    const quitRun=await startArenaRun(quit);
    await waitArenaIntro(quit,1);
    await waitArenaConfirm(quit,1);
    await quit.run(`document.getElementById('game-confirm-cancel').click();return 1;`);
    await waitLine(quit,quitRun.talk.line4);
    await quit.until(`Number(G.gold)===${quitRun.goldBefore-quitRun.cost+25}`,30000);
    ok('闘技場：1勝で「やめる」を選ぶと+25Gになり、台詞4が出る',true);
    await clickDialogue(quit);
    await waitArenaVillage(quit);
    await finish(quit);
  }

  async function startQ004(b){
    await startDebugRun(b);
    const forced=await b.run(`const e=questDebugForceWaveQuest(${QUEST_WAVE},'Q004');return e&&e.questId||'';`);
    assert.equal(forced,'Q004','Q004のテスト用クエスト固定に失敗');
    await openWave(b,QUEST_WAVE);
    await prepareStrongBoard(b);
    const q=await b.run(`return {q:QUEST_DATA.Q004_1,q2:QUEST_DATA.Q004_2}`);
    ok('Q004：酒場のシートに台詞4の2択と討伐後報酬200Gがある',q.q.initial.length>=4&&q.q.initial[q.q.initial.length-1].text.includes('依頼を受ける')&&q.q.initial[q.q.initial.length-1].text.includes('断る')&&Number(q.q2.rewardGold)===200,q);
    await clickFacility(b,'^酒場$');
    for(let i=0;i<q.q.initial.length-1;i++){
      await waitLine(b,q.q.initial[i]);
      await clickDialogue(b);
    }
    const choices=await waitChoice(b,q.q.initial[q.q.initial.length-1]);
    const acceptIndex=choices.findIndex(text=>text.includes('依頼を受ける'));
    assert.ok(acceptIndex>=0,'Q004の依頼を受ける選択肢がない');
    await clickChoice(b,acceptIndex);
    await b.until(`G.questProgress.Q004?.status==='accepted'&&G.questProgress.Q004?.encounterTarget&&Number(G.questProgress.Q004.encounterTarget.wave)>0&&Number(G.questProgress.Q004.encounterTarget.stage)>0`,30000);
    const accepted=await b.run(`(()=>{const e=G.questProgress.Q004;return {status:e.status,target:{wave:Number(e.encounterTarget.wave),stage:Number(e.encounterTarget.stage)},phase:e.encounterPhase};})()`);
    ok('Q004：台詞4の「依頼を受ける」でacceptedになり、encounterTargetが保存される',accepted.status==='accepted'&&accepted.phase==='wolf'&&accepted.target.wave>0&&accepted.target.stage>0,accepted);
    await waitLine(b,q.q.accepted[0]);
    await clickDialogue(b);
    await b.until(`!G._isTavern&&document.querySelector("#scr-village.active")&&${notFading}`,30000);
    return {q,accepted};
  }

  async function startSavedQ004Battle(b,target){
    await b.run(`(()=>{const t=G.questProgress.Q004.encounterTarget;G._wave=Number(t.wave);G._waveStage=Number(t.stage);G._waveVillage=false;_startWaveBattle(Number(t.stage));return 1;})()`);
    await b.until(`G._mapBattle&&G._mapBattle.nodeId===null&&G._waveBattleType==='battle'&&Number(G._wave)===${Number(target.wave)}&&Number(G._waveStage)===${Number(target.stage)}`,60000);
    await b.until(`Array.isArray(G.enemies)&&G.enemies.filter(e=>e&&e.name==='ダイアウルフ').length>=3`,60000);
    const setup=await b.run(`(()=>({wave:Number(G._wave),stage:Number(G._waveStage),type:G._waveBattleType,node:G._mapBattle?.nodeId,wolves:(G.enemies||[]).filter(e=>e&&e.name==='ダイアウルフ').length}))()`);
    ok('Q004：保存済み対象の戦闘を直接開始し、ダイアウルフ3体以上を確認',setup.wave===target.wave&&setup.stage===target.stage&&setup.type==='battle'&&setup.node===null&&setup.wolves>=3,setup);
    return setup;
  }

  async function waitMagicWolfProgress(b,q){
    const progress1=q.q.progress1[0];
    await waitLine(b,progress1);
    await b.until(`(()=>{const f=document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="${String(progress1.face||'').replace(/"/g,'')}"].is-visible');return !!(f&&f.complete&&f.naturalWidth>0);})()`,10000);
    const scene=await b.run(`(()=>{
      const host=document.getElementById('tavern-presentation-layer');
      const shade=host?.querySelector('.quest-event-shade');
      const portrait=host?.querySelector('.tavern-portrait[data-portrait-id="MC001"]');
      const bubble=document.querySelector('#tavern-dialogue-layer .tavern-dialogue-bubble[data-side="right"]');
      const ids=['btn-debug-kill','btn-debug-gameover','btn-test-battle','btn-debug-error','btn-debug-map','btn-debug-life-plus','btn-debug-elite-boss'];
      return {
        progress:document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text')?.textContent||'',
        faceVisible:!!document.querySelector('.tavern-presentation-host .tavern-face[data-face-id="${String(progress1.face||'').replace(/"/g,'')}"].is-visible'),
        portraitVisible:!!portrait?.classList.contains('is-visible'),
        shadeFirst:!!shade&&host?.firstElementChild===shade,
        shadeBelowPortrait:!!shade&&!!portrait&&!!(shade.compareDocumentPosition(portrait)&Node.DOCUMENT_POSITION_FOLLOWING),
        shadeZ:shade?getComputedStyle(shade).zIndex:'',portraitZ:portrait?getComputedStyle(portrait).zIndex:'',
        bubbleRight:!!bubble,bubbleDark:!!bubble?.classList.contains('is-dark'),
        normalVictory:!!document.querySelector('.battle-start-intro.cutin-victory,#battle-continue-btn'),
        debugHidden:ids.every(id=>{const el=document.getElementById(id);return !el||getComputedStyle(el).display==='none';})
      };
    })()`);
    ok('Q004：魔狼戦勝利後は通常の勝利演出を出さず、暗幕が立ち絵より下',!scene.normalVictory&&scene.shadeFirst&&scene.shadeBelowPortrait&&Number(scene.shadeZ)<=0,scene);
    ok(`Q004：進行台詞1の表情${progress1.face||'(無指定)'}でA（MC001）が出る`,scene.portraitVisible&&scene.faceVisible,scene);
    ok('Q004：進行台詞1は右側の暗色吹き出しで、デバッグ用ボタンは非表示',scene.bubbleRight&&scene.bubbleDark&&scene.progress===progress1.text&&scene.debugHidden,scene);
    await clickDialogue(b);
    const prompt=q.q.progress2[q.q.progress2.length-1];
    const choices=await waitChoice(b,prompt);
    ok('Q004：進行台詞2に「魔狼に挑む／逃げる」の2択が出る',choices.length===2&&choices.some(text=>text.includes('魔狼に挑む'))&&choices.some(text=>text.includes('逃げる')),choices);
    return {progress1,prompt,choices};
  }

  // ── 魔獣撃退：Q004「魔狼に挑む」→ ガルム戦 → camp ────────
  if(section('魔獣撃退')){
    const b=await newPage();
    const run=await startQ004(b);
    await startSavedQ004Battle(b,run.accepted.target);
    const magic=await waitMagicWolfProgress(b,run.q);
    await armCarryProbe(b,'garm');
    const challengeIndex=magic.choices.findIndex(text=>text.includes('魔狼に挑む'));
    assert.ok(challengeIndex>=0,'魔狼に挑む選択肢がない');
    await clickChoice(b,challengeIndex);
    await b.until(`G.questProgress.Q004?.encounterPhase==='garm'&&G._mapBattle&&G._mapBattle.nodeId==='quest-garm'&&G._waveBattleType==='battle'`,60000);
    await b.until(`Array.isArray(G.enemies)&&G.enemies.some(e=>e&&/ガルム.*グリ.?ム/.test(e.name||'')&&e.lane==='rear')`,60000);
    await b.until(`Array.isArray(window.__garmCarrySamples)&&window.__garmCarrySamples.some(s=>s.opening)`,10000);
    const carrySamples=await b.run(`return window.__garmCarrySamples||[]`);
    const carryOpening=carrySamples.filter(s=>s.opening);
    const carryAllySamples=carryOpening.filter(s=>s.cards>0);
    const carryMaxFade=Math.max(0,...carryOpening.map(s=>s.fadeOpacity||0));
    const carry=carryAllySamples.find(s=>!s.fade&&!s.startText&&s.visible);
    ok('Q004：「魔狼に挑む」は開戦効果なしで続き、戦闘開始文字・暗転なし、味方カードが消えない',!!carry&&carryMaxFade<=0.5&&carryOpening.every(s=>!s.startText)&&carryAllySamples.every(s=>s.visible),{maxFade:carryMaxFade,opening:carryOpening.length,allySamples:carryAllySamples.length,samples:carrySamples.slice(-8)});
    await b.until(`G._battleVictoryPending===true&&G._mapBattle&&G._mapBattle.nodeId==='quest-garm'&&document.getElementById('battle-continue-btn')`,120000);
    // 報酬は台詞1が出た時点で入るので、基準は勝利画面の時点の所持金（ガルム戦のドロップは反映済み）。
    const goldAtVictory=await b.run('return Number(G.gold)');
    await clickContinue(b);
    await b.until(`G._questCampScene===true&&document.querySelector("#scr-village.active")&&document.querySelector("#tavern-dialogue-layer .tavern-dialogue-text")`,60000);
    await waitLine(b,run.q.q2.initial[0]);
    const camp=await b.run(`(()=>({camp:!!G._questCampScene,noBgm:!!G._questNoBgm,gold:Number(G.gold),status:G.questProgress.Q004.status,active:!!document.querySelector('#tavern-dialogue-layer')}))()`);
    ok('Q004：勝利後はG._questCampSceneでキャンプになり、BGMなし',camp.camp&&camp.noBgm&&camp.active,camp);
    const goldBeforeReward=goldAtVictory;
    await b.until(`Number(G.gold)===${goldBeforeReward+200}`,30000);
    ok('Q004：Q004_2台詞1で+200G',true);
    await clickDialogue(b);
    await waitLine(b,run.q.q2.initial[1]);
    await clickDialogue(b);
    await b.until(`document.body.classList.contains('reward-screen-active')&&!G._questCampScene&&G.questProgress.Q004.status==='completed'`,60000);
    ok('Q004：「魔狼に挑む」勝利後はQ004_2台詞2を経てcompleted・報酬画面',true);
    await finish(b);

    // ── 魔獣撃退：別ランで「逃げる」→ 進行台詞3 → failed ────
    const escape=await newPage();
    const escapeRun=await startQ004(escape);
    await startSavedQ004Battle(escape,escapeRun.accepted.target);
    const escapeMagic=await waitMagicWolfProgress(escape,escapeRun.q);
    const fleeIndex=escapeMagic.choices.findIndex(text=>text.includes('逃げる'));
    assert.ok(fleeIndex>=0,'逃げる選択肢がない');
    await clickChoice(escape,fleeIndex);
    await waitLine(escape,escapeRun.q.q.progress3[0]);
    ok('Q004：「逃げる」で進行台詞3が出る',true);
    await clickDialogue(escape);
    await escape.until(`document.body.classList.contains('reward-screen-active')&&G.questProgress.Q004.status==='failed'`,60000);
    ok('Q004：「逃げる」の後は報酬画面へ戻りfailedになる',true);
    await finish(escape);
  }

  console.log(`RESULT ${checks.length}項目 OK`);
})().catch(async error=>{
  console.error('RESULT_NG',error&&error.message||error);
  // 止まった時の状態（原因の切り分け用）。
  for(const b of globalThis.__arenaQ004OpenPages||[]){
    try{ console.error('STATE',JSON.stringify(await b.run(`return {screen:document.querySelector('.screen.active')?.id,body:document.body.className.slice(0,220),phase:G.phase,arena:G._arenaActive,round:G._arenaRound,outcome:G._arenaOutcomePending,victory:G._battleVictoryPending,node:G._mapBattle&&G._mapBattle.nodeId,camp:G._questCampScene,q4:G.questProgress&&G.questProgress.Q004&&{s:G.questProgress.Q004.status,p:G.questProgress.Q004.encounterPhase},lines:[...document.querySelectorAll('#tavern-dialogue-layer .tavern-dialogue-text')].map(x=>x.textContent),battleLine:document.getElementById('battle-line-text')?.textContent||null,cont:!!document.getElementById('battle-continue-btn'),gold:G.gold,given:G.questProgress&&G.questProgress.Q004&&G.questProgress.Q004.encounterRewardGiven}`))); console.error('EXC',JSON.stringify((b.events||[]).filter(e=>e.method==='Runtime.exceptionThrown').map(e=>(e.params.exceptionDetails.exception?.description||e.params.exceptionDetails.text||'').slice(0,300)))); }catch(_e){}
  }
  process.exitCode=1;
  // 失敗してもブラウザを閉じる（閉じないと node が終わらない）。
  for(const b of globalThis.__arenaQ004OpenPages||[]) { try{ await b.close(); }catch(_){} }
  process.exit(1);
});
