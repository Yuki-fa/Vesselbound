'use strict';

// 1周目／2周目以降のオフライン分岐と、五聖の座の再入場・退場演出を実ブラウザで確かめる。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
const assert=require('node:assert/strict');
const {launch,sleep}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';

(async()=>{
  const browser=await launch({width:1600,height:900});
  const ok=(name,value,detail)=>{
    assert.ok(value,`${name}${detail?' '+JSON.stringify(detail):''}`);
    console.log(`OK ${name}`);
  };
  try{
    await browser.goto(URL,2500);
    await browser.waitFor(`typeof G!=='undefined'&&window.TALK_MESSAGES
      &&typeof isFirstStoryRun==='function'&&typeof storyTalkEntry==='function'
      &&typeof fiveSaintsCurrentTowerResolved==='function'`,30000);

    const branches=await browser.eval(`
      const oldHasCleared=SaveProfile.hasClearedRun;
      const result={};
      try{
        G._onlineMode=false;G._debugMode=false;G._fiveSaints={visited:false,offeredNos:[],offers:{},decisions:{},targets:{}};
        SaveProfile.hasClearedRun=()=>false;
        const firstRoute=_journeyRouteForScene(1).slice();
        const firstStandard=_journeyRouteForScene(2).slice();
        G._wave=0;G._isWaveAltar=false;G._waveLife=1;
        const home=villageFacilityList().find(f=>f.key==='home');
        result.first={cycle:offlineStoryCycle(),route:firstRoute,
          afterCityBattles:firstRoute.slice(firstRoute.lastIndexOf('city')+1).filter(n=>['battle','elite','boss'].includes(n)).length,
          standardAfterCityBattles:firstStandard.slice(firstStandard.lastIndexOf('city')+1).filter(n=>['battle','elite','boss'].includes(n)).length,
          homeDisabled:_villageFacilityDisabled(home),background:getVillageBackgroundKey()};
        G._wave=1;G._isWaveAltar=false;
        const tavern=villageFacilityList().find(f=>f.key==='tavern');
        result.first.tavernDisabled=_villageFacilityDisabled(tavern);
        G._wave=2;G._isWaveAltar=false;G._waveLife=1;
        const inn=villageFacilityList().find(f=>f.key==='inn');
        result.first.vargaInn={disabled:_villageFacilityDisabled(inn),desc:villageFacilityDescText(inn.name)};
        G._waveStage=5;
        const firstJourney=document.createElement('div');_syncRewardJourneyUi({root:firstJourney,exactCurrent:true});
        result.first.journeyRemaining=firstJourney.querySelector('.journey-countdown strong')?.textContent||'';
        G._wave=1;G._isWaveAltar=true;
        result.first.landingVisible=villageFacilityList().some(f=>f.key==='landing');
        result.first.lockedDesc=villageFacilityDescText('五聖の座');

        SaveProfile.hasClearedRun=()=>true;
        G._onlineMode=false;G._debugMode=false;G._fiveSaints={visited:true,offeredNos:[],offers:{},decisions:{},targets:{}};
        const repeatRoute=_journeyRouteForScene(1).slice();
        const repeatStandard=_journeyRouteForScene(2).slice();
        G._wave=0;G._isWaveAltar=false;G._waveLife=1;
        result.repeat={cycle:offlineStoryCycle(),route:repeatRoute,background:getVillageBackgroundKey(),
          afterCityBattles:repeatRoute.slice(repeatRoute.lastIndexOf('city')+1).filter(n=>['battle','elite','boss'].includes(n)).length,
          standardAfterCityBattles:repeatStandard.slice(repeatStandard.lastIndexOf('city')+1).filter(n=>['battle','elite','boss'].includes(n)).length};
        G._wave=2;G._isWaveAltar=false;G._waveLife=1;
        const repeatInn=villageFacilityList().find(f=>f.key==='inn');
        result.repeat.vargaInn={disabled:_villageFacilityDisabled(repeatInn),desc:villageFacilityDescText(repeatInn.name)};
        G._waveStage=5;
        const repeatJourney=document.createElement('div');_syncRewardJourneyUi({root:repeatJourney,exactCurrent:true});
        result.repeat.journeyRemaining=repeatJourney.querySelector('.journey-countdown strong')?.textContent||'';
        G._wave=1;G._isWaveAltar=true;
        const landing=villageFacilityList().find(f=>f.key==='landing');
        result.repeat.landing={visible:!!landing,disabled:_villageFacilityDisabled(landing),desc:villageFacilityDescText(landing.name)};
        G._fiveSaints.decisions={'1':{accepted:false,no:'E077'}};
        result.repeat.refused={disabled:_villageFacilityDisabled(landing),desc:villageFacilityDescText(landing.name)};
        G._fiveSaints.decisions={'1':{accepted:true,no:'E077'}};
        result.repeat.accepted={disabled:_villageFacilityDisabled(landing),desc:villageFacilityDescText(landing.name)};

        SaveProfile.hasClearedRun=()=>false;
        G._onlineMode=true;G._debugMode=false;G._fiveSaints={visited:false,offeredNos:[],offers:{},decisions:{},targets:{}};
        G._wave=1;G._isWaveAltar=true;
        const onlineLanding=villageFacilityList().find(f=>f.key==='landing');
        result.online={cycle:offlineStoryCycle(),visible:!!onlineLanding,disabled:_villageFacilityDisabled(onlineLanding)};
        G._onlineMode=false;G._debugMode=true;
        result.debug={cycle:offlineStoryCycle(),route:_journeyRouteForScene(1).slice()};
      }finally{
        SaveProfile.hasClearedRun=oldHasCleared;
        G._onlineMode=false;G._debugMode=false;G._isWaveAltar=false;
      }
      return result;
    `);
    ok('1周目だけ各街から塔までが1戦少ない',branches.first.afterCityBattles===4
      &&branches.repeat.afterCityBattles===5&&branches.first.standardAfterCityBattles===4
      &&branches.repeat.standardAfterCityBattles===5&&branches.first.route.length+1===branches.repeat.route.length
      &&branches.first.journeyRemaining==='4'&&branches.repeat.journeyRemaining==='5',branches);
    ok('1周目はホーム／酒場が押せ、ヴァルガ宿屋は満タン文で固定',!branches.first.homeDisabled&&!branches.first.tavernDisabled
      &&branches.first.vargaInn.disabled
      &&branches.first.vargaInn.desc===await browser.eval(`return textMessage('街「宿屋」直下（ライフ満タン時）','')`),branches.first);
    ok('1周目は五聖の座を表示せず、未解放説明は再訪時の行',!branches.first.landingVisible
      &&branches.first.lockedDesc===await browser.eval(`return textMessage('塔「五聖の座」直下（再訪時）','')`),branches.first);
    ok('2周目は夜のリーゼ背景で宿屋と五聖の座を通常利用',branches.repeat.background==='village0Night'
      &&!branches.repeat.vargaInn.disabled&&branches.repeat.landing.visible&&!branches.repeat.landing.disabled
      &&branches.repeat.landing.desc===await browser.eval(`return textMessage('塔「五聖の座」直下','')`),branches.repeat);
    ok('五聖の座は拒否後は再入場可、受諾後は再訪時文で操作不可',!branches.repeat.refused.disabled
      &&branches.repeat.refused.desc===await browser.eval(`return textMessage('塔「五聖の座」直下','')`)
      &&branches.repeat.accepted.disabled
      &&branches.repeat.accepted.desc===await browser.eval(`return textMessage('塔「五聖の座」直下（再訪時）','')`),branches.repeat);
    ok('オンラインとデバッグはプロフィール周回分岐の対象外',branches.online.cycle===0&&branches.online.visible&&!branches.online.disabled
      &&branches.debug.cycle===0&&branches.debug.route.length===branches.first.route.length,{online:branches.online,debug:branches.debug});

    const sheet=await browser.eval(`
      const lineCount=entry=>_storyTalkLines(entry).length;
      const introEl=_ensureSecondRunIntroEl();
      return {
        text:{intro:textMessage('二周目開始演出',''),clear:textMessage('「クリア」見出し（一周目）',''),
          normal:textMessage('塔「五聖の座」直下',''),revisit:textMessage('塔「五聖の座」直下（再訪時）','')},
        lines:{riese1:lineCount(storyTalkEntry('リーゼ地名演出後（一周目）')),
          home:lineCount(storyTalkEntry('リーゼ「ホーム」押下時（一周目）')),
          riese2:lineCount(storyTalkEntry('リーゼ地名演出後（二周目）')),
          elm:lineCount(storyTalkEntry('エルム「酒場」押下時（一周目）')),
          varga:lineCount(storyTalkEntry('ヴァルガ「酒場」押下時（一周目）')),
          galaha:lineCount(storyTalkEntry('ギャラハ「酒場」押下時（一周目）')),
          tower:lineCount(storyTalkEntry('蝕界の塔到達時（一周目）'))},
        mc010:TAVERN_PORTRAIT_CONFIG.MC010,
        introStyle:{fontSize:getComputedStyle(introEl.querySelector('.second-run-intro-text')).fontSize,
          hold:SECOND_RUN_INTRO_HOLD_MS,fade:SECOND_RUN_INTRO_FADE_MS}
      };
    `);
    ok('追加文言と会話はシートの実キーから読み込む',sheet.text.intro==='5年後'&&sheet.text.clear
      &&sheet.text.normal&&sheet.text.revisit&&sheet.lines.riese1===4&&sheet.lines.home===1&&sheet.lines.riese2===3
      &&sheet.lines.elm===1&&sheet.lines.varga===1&&sheet.lines.galaha===1&&sheet.lines.tower===7,sheet);
    ok('MC010はX2350・Y150の原寸定義',JSON.stringify(sheet.mc010)===JSON.stringify({src:'assets/art/sprites/MC010.webp',x:2350,y:150,width:1885,height:3678}),sheet.mc010);
    ok('2周目開始文は173px・3秒後に0.8秒でフェード',sheet.introStyle.fontSize==='173px'
      &&sheet.introStyle.hold===3000&&sheet.introStyle.fade===800,sheet.introStyle);

    const arrival=await browser.eval(`
      const oldHasCleared=SaveProfile.hasClearedRun;
      const out={};
      try{
        G._onlineMode=false;G._debugMode=false;G._facilityTalkSeen={};G._isWaveAltar=false;G._wave=0;
        SaveProfile.hasClearedRun=()=>false;out.first=_storyArrivalSpec();
        G._facilityTalkSeen[out.first.key]=true;out.firstSeen=_storyArrivalSpec();
        G._facilityTalkSeen={};SaveProfile.hasClearedRun=()=>true;out.repeat=_storyArrivalSpec();
        SaveProfile.hasClearedRun=()=>false;G._wave=4;G._isWaveAltar=true;out.tower=_storyArrivalSpec();
        G._onlineMode=true;out.online=_storyArrivalSpec();
      }finally{SaveProfile.hasClearedRun=oldHasCleared;G._onlineMode=false;G._debugMode=false;G._isWaveAltar=false;G._facilityTalkSeen={};}
      return out;
    `);
    ok('リーゼ会話は周回別にラン内1回、蝕界の塔は1周目だけMC010付き',arrival.first.scene==='リーゼ地名演出後（一周目）'
      &&arrival.firstSeen===null&&arrival.repeat.scene==='リーゼ地名演出後（二周目）'
      &&arrival.tower.finalClear&&arrival.tower.portraitB==='MC010'&&arrival.online===null,arrival);

    const facilityEvents=await browser.eval(`
      return (async()=>{
        const old={hasCleared:SaveProfile.hasClearedRun,fadeScreenSwitch,_showFacilityGreetingScene,
          showTavernPortrait,_qStartDialogue,flip:window.storyFlipSlidePortraitLeft,
          _qClearPresentation,_hideFacilityGreetingScene,applyScreenAssetBackground,renderVillageScreen,playFileSfx};
        const out={dialogues:[],portraits:[],sounds:[],galaha:0};
        try{
          SaveProfile.hasClearedRun=()=>false;G._onlineMode=false;G._debugMode=false;G._isWaveAltar=false;
          fadeScreenSwitch=async action=>action();_showFacilityGreetingScene=()=>{};
          showTavernPortrait=async id=>{out.portraits.push(id);return {};};
          _qStartDialogue=async lines=>{out.dialogues.push(lines.map(line=>line.text));};
          window.storyFlipSlidePortraitLeft=async id=>{out.galaha++;out.galahaId=id;return true;};
          _qClearPresentation=async()=>{};_hideFacilityGreetingScene=()=>{};
          applyScreenAssetBackground=()=>{};renderVillageScreen=()=>{};
          playFileSfx=path=>{out.sounds.push(path);return {};};
          G._wave=0;
          await _runFirstStoryFacilityEvent({key:'home',name:'ホーム'});
          await _runFirstStoryFacilityEvent({key:'home',name:'ホーム'});
          for(const wave of [1,2,3]){
            G._wave=wave;
            await _runFirstStoryFacilityEvent({key:'tavern',name:'酒場'});
          }
          return out;
        }finally{
          SaveProfile.hasClearedRun=old.hasCleared;fadeScreenSwitch=old.fadeScreenSwitch;
          _showFacilityGreetingScene=old._showFacilityGreetingScene;showTavernPortrait=old.showTavernPortrait;
          _qStartDialogue=old._qStartDialogue;window.storyFlipSlidePortraitLeft=old.flip;
          _qClearPresentation=old._qClearPresentation;_hideFacilityGreetingScene=old._hideFacilityGreetingScene;
          applyScreenAssetBackground=old.applyScreenAssetBackground;renderVillageScreen=old.renderVillageScreen;
          playFileSfx=old.playFileSfx;G._onlineMode=false;G._debugMode=false;G._isWaveAltar=false;
        }
      })();
    `);
    ok('1周目のホームは毎回、各3街の酒場はknock.wavとA立ち絵で会話',facilityEvents.dialogues.length===5
      &&JSON.stringify(facilityEvents.dialogues[0])===JSON.stringify(facilityEvents.dialogues[1])
      &&facilityEvents.sounds.length===3&&facilityEvents.sounds.every(path=>path==='assets/sfx/knock.wav')
      &&facilityEvents.portraits.length===5&&facilityEvents.portraits.every(id=>id==='MC001')
      &&facilityEvents.galaha===1&&facilityEvents.galahaId==='MC001',facilityEvents);

    const titleFlow=await browser.eval(`
      return (async()=>{
        const old={startGame,_playOpeningMovie,_playSecondRunOpeningSequence,playSfx,
          hasCleared:SaveProfile.hasClearedRun,tutorialShown:SaveProfile.tutorialShown,
          markTutorial:SaveProfile.markTutorialShown,openingShown:SaveProfile.openingMovieShown,
          markOpening:SaveProfile.markOpeningMovieShown};
        const calls=[];let cleared=false,secondShown=false,openingShown=false;
        try{
          startGame=(debug,online)=>calls.push({type:'start',debug:!!debug,online:!!online});
          _playOpeningMovie=async()=>{calls.push({type:'opening'});};
          _playSecondRunOpeningSequence=async()=>{calls.push({type:'second-sequence'});};
          playSfx=()=>{};
          SaveProfile.hasClearedRun=()=>cleared;
          SaveProfile.tutorialShown=()=>secondShown;
          SaveProfile.markTutorialShown=key=>{calls.push({type:'mark-second',key});secondShown=true;};
          SaveProfile.openingMovieShown=()=>openingShown;
          SaveProfile.markOpeningMovieShown=()=>{calls.push({type:'mark-opening'});openingShown=true;};
          startGameFromTitle();await Promise.resolve();
          cleared=true;secondShown=false;openingShown=false;
          startGameFromTitle();await Promise.resolve();await new Promise(r=>setTimeout(r,0));
          return calls;
        }finally{
          startGame=old.startGame;_playOpeningMovie=old._playOpeningMovie;
          _playSecondRunOpeningSequence=old._playSecondRunOpeningSequence;playSfx=old.playSfx;
          SaveProfile.hasClearedRun=old.hasCleared;SaveProfile.tutorialShown=old.tutorialShown;
          SaveProfile.markTutorialShown=old.markTutorial;SaveProfile.openingMovieShown=old.openingShown;
          SaveProfile.markOpeningMovieShown=old.markOpening;
        }
      })();
    `);
    ok('1周目開始はOPなし、初クリア後は二周目演出とOP記録を1回付ける',titleFlow.filter(v=>v.type==='start').length===2
      &&titleFlow.filter(v=>v.type==='opening').length===0&&titleFlow.filter(v=>v.type==='second-sequence').length===1
      &&titleFlow.some(v=>v.type==='mark-second'&&v.key==='story:second-run-intro')
      &&titleFlow.filter(v=>v.type==='mark-opening').length===1,titleFlow);

    const retry=await browser.eval(`
      return (async()=>{
        const oldStart=_qStartDialogue,oldOpen=_fiveSaintsOpenFormation,oldLeave=_fiveSaintsLeaveToTower;
        const calls=[];
        try{
          G._onlineMode=false;G._debugMode=false;G._wave=1;G._isFiveSaints=true;
          G._fiveSaints={visited:true,offeredNos:['E077'],offers:{'1':'E077'},decisions:{'1':{accepted:false,no:'E077'}},targets:{}};
          _qStartDialogue=async lines=>{calls.push(lines.map(line=>line.text));};
          _fiveSaintsOpenFormation=async()=>{calls.push(['FORMATION']);};
          _fiveSaintsLeaveToTower=async()=>{calls.push(['LEAVE']);};
          await _fiveSaintsRunEntry(false);
          const row=_fiveSaintsTalkRow('塔「五聖の座」入場時');
          return {calls,line1:row['台詞1'].text,line2:row['台詞2'].text};
        }finally{_qStartDialogue=oldStart;_fiveSaintsOpenFormation=oldOpen;_fiveSaintsLeaveToTower=oldLeave;G._isFiveSaints=false;}
      })();
    `);
    ok('五聖の座は同じ塔の拒否後に台詞1を飛ばし台詞2から再開',retry.calls.length===2
      &&retry.calls[0][0]===retry.line2&&!retry.calls.flat().includes(retry.line1)&&retry.calls[1][0]==='FORMATION',retry);

    const acceptOrder=await browser.eval(`
      return (async()=>{
        const old={dialogue:_qStartDialogue,smoke:_qSmokePortraitUp,leave:_fiveSaintsLeaveToTower,
          show:_fiveSaintsShowScene,fade:fadeScreenSwitch,checkpoint:_fiveSaintsCheckpoint,context:_qFormationContext};
        const calls=[];
        try{
          G._wave=1;G._isFiveSaints=true;G._fiveSaintsResolving=false;
          G._fiveSaints={visited:true,offeredNos:['E077'],offers:{'1':'E077'},decisions:{},targets:{}};
          const card={name:'受難の刻印',_fiveSaintsOfferCard:true,_fiveSaintsOfferWave:1,_fiveSaintsOfferNo:'E077'};
          G.mainBoard=new Array(15).fill(null);G.mainBoard[2]=card;
          _qFormationContext={mode:'fiveSaints',wave:1,no:'E077',targetSlot:null};
          _qStartDialogue=async lines=>calls.push({type:'dialogue',text:lines.map(line=>line.text)});
          _qSmokePortraitUp=async key=>{calls.push({type:'smoke',key});return true;};
          _fiveSaintsLeaveToTower=async options=>{calls.push({type:'leave',delay:options&&options.delay});};
          _fiveSaintsShowScene=()=>{G._isFiveSaints=true;};fadeScreenSwitch=async action=>action();
          _fiveSaintsCheckpoint=()=>{};
          const line3=_fiveSaintsTalkRow('塔「五聖の座」入場時')['台詞3'].text;
          await _fiveSaintsAccept();
          return {calls,line3,accepted:G._fiveSaints.decisions['1']?.accepted===true};
        }finally{
          _qStartDialogue=old.dialogue;_qSmokePortraitUp=old.smoke;_fiveSaintsLeaveToTower=old.leave;
          _fiveSaintsShowScene=old.show;fadeScreenSwitch=old.fade;_fiveSaintsCheckpoint=old.checkpoint;
          _qFormationContext=old.context;G._isFiveSaints=false;G._fiveSaintsResolving=false;
        }
      })();
    `);
    ok('五聖の座の受諾は台詞3→MC009煙化→塔復帰の順',acceptOrder.accepted
      &&acceptOrder.calls.length===3&&acceptOrder.calls[0].type==='dialogue'
      &&acceptOrder.calls[0].text[0]===acceptOrder.line3
      &&acceptOrder.calls[1].type==='smoke'&&acceptOrder.calls[1].key==='five-saints-mc009'
      &&acceptOrder.calls[2].type==='leave'&&acceptOrder.calls[2].delay===0,acceptOrder);

    const motion=await browser.eval(`
      return (async()=>{
        if(typeof showScreen==='function') showScreen('village');
        if(typeof _qClearPresentation==='function') await _qClearPresentation({immediate:true});
        await showTavernPortrait('MC010',{screen:'village'});
        const mc010=document.querySelector('.tavern-portrait[data-portrait-id="MC010"]');
        const mc010State={left:mc010?.style.left,top:mc010?.style.top,width:mc010?.style.width,height:mc010?.style.height,
          loaded:!!(mc010&&mc010.complete&&mc010.naturalWidth===1885&&mc010.naturalHeight===3678)};
        await _qClearPresentation({immediate:true});
        await showTavernPortrait('MC009',{screen:'village',key:'five-saints-mc009'});
        const smokePromise=_qSmokePortraitUp('five-saints-mc009');
        await new Promise(r=>setTimeout(r,260));
        const smoke=document.querySelector('.five-saints-smoke-group');
        const smokeState={exists:!!smoke,mask:smoke?.style.webkitMaskImage||smoke?.style.maskImage||'',transform:smoke?.style.transform||''};
        await smokePromise;
        const smokeGone=!document.querySelector('.five-saints-smoke-group')&&!document.querySelector('.tavern-portrait[data-portrait-key="five-saints-mc009"]');
        await _qClearPresentation({immediate:true});
        await showTavernPortrait('MC001',{screen:'village',face:'MC001_C'});
        const exitPromise=storyFlipSlidePortraitLeft('MC001');
        await new Promise(r=>setTimeout(r,80));
        const exit=document.querySelector('.tavern-portrait-exit-group');
        const exitState={exists:!!exit,opacity:exit?.style.opacity||'',transform:exit?.style.transform||''};
        await exitPromise;
        const exitGone=!document.querySelector('.tavern-portrait-exit-group')&&!document.querySelector('.tavern-portrait[data-portrait-key="MC001"]');
        await _qClearPresentation({immediate:true});
        return {mc010State,smokeState,smokeGone,exitState,exitGone};
      })();
    `);
    ok('MC010の実素材を原寸配置',motion.mc010State.loaded
      &&JSON.stringify([motion.mc010State.left,motion.mc010State.top,motion.mc010State.width,motion.mc010State.height])
        ===JSON.stringify(['2350px','150px','1885px','3678px']),motion.mc010State);
    ok('台詞3後用の退場は下からのマスクと揺らぎ上昇で完了',motion.smokeState.exists
      &&motion.smokeState.mask.includes('linear-gradient')&&motion.smokeState.transform.includes('translate3d')&&motion.smokeGone,motion.smokeState);
    ok('ギャラハ用退場は左右反転して左へフェード退場',motion.exitState.exists
      &&motion.exitState.opacity==='0'&&motion.exitState.transform.includes('scaleX(-1)')&&motion.exitGone,motion.exitState);

    const clearScreen=await browser.eval(`
      const oldFinish=SaveRun.finish,oldRender=renderGameOverBoard;
      try{
        SaveRun.finish=result=>{window.__storyCycleFinish=result;return true;};
        renderGameOverBoard=()=>{};
        G._onlineMode=false;G._debugMode=false;G._debugGameOver=false;G._libraryTestBattleMode=false;
        G.questProgress={};G.allies=[];G.enemies=[];G.mainBoard=new Array(15).fill(null);
        G.runStats={playedMs:0,startedAt:performance.now(),areaName:'',finalBattle:'',allyDeaths:0,maxDamage:{amount:0,type:''},maxAtk:0,maxHp:0};
        gameOver({clear:true,firstRunClear:true});
        const screen=document.getElementById('scr-gameover');
        const video=document.getElementById('gameover-video');
        return {finish:window.__storyCycleFinish,title:document.querySelector('#gameover-results h1')?.textContent||'',
          firstClass:document.body.classList.contains('game-clear-first-run'),pending:document.body.classList.contains('gameover-ui-pending'),
          background:getComputedStyle(screen).backgroundColor,videoDisplay:getComputedStyle(video).display};
      }finally{SaveRun.finish=oldFinish;renderGameOverBoard=oldRender;}
    `);
    ok('1周目の蝕界の塔後はプロフィールにclearを渡し、黒地の帰宅画面',clearScreen.finish==='clear'
      &&clearScreen.title===await browser.eval(`return textMessage('「クリア」見出し（一周目）','')`)
      &&clearScreen.firstClass&&!clearScreen.pending&&clearScreen.background==='rgb(0, 0, 0)'&&clearScreen.videoDisplay==='none',clearScreen);

    const storyAssets=await browser.eval(`
      return (async()=>{
        const image=url=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve({url,ok:true,w:img.naturalWidth,h:img.naturalHeight});
          img.onerror=()=>resolve({url,ok:false,w:0,h:0});img.src=url;});
        const night=await image('assets/art/backgrounds/stage0_village_night.webp');
        const knock=await fetch('assets/sfx/knock.wav').then(response=>({ok:response.ok,status:response.status})).catch(()=>({ok:false,status:0}));
        return {night,knock};
      })();
    `);
    ok('2周目リーゼ背景と酒場のknock.wavを読み込める',storyAssets.night.ok
      &&storyAssets.night.w>0&&storyAssets.night.h>0&&storyAssets.knock.ok,storyAssets);

    const failed=[...new Set(browser.events.filter(event=>event.method==='Network.responseReceived'&&event.params.response.status>=400)
      .map(event=>event.params.response.url))].filter(url=>!/\/favicon\.ico$/.test(url))
      .filter(url=>!/\/Vesselbound_data[^/]*\.xlsx$/.test(url));
    ok('読み込みに失敗した素材が無い',failed.length===0,{failed});
    const errors=browser.consoleErrors().filter(error=>!/Failed to load resource/.test(String(error)));
    ok('コンソールにエラーが無い',errors.length===0,{errors:errors.slice(0,5)});
    console.log('story cycle check passed');
  }finally{
    await browser.close();
  }
})().catch(error=>{
  console.error(error&&error.stack||error);
  process.exitCode=1;
});
