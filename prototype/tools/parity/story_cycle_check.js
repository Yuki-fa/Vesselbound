'use strict';

// 1周目／2周目以降のオフライン分岐と、五聖の座の再入場・退場演出を実ブラウザで確かめる。
// 実行前に prototype で `python3 -m http.server 5500 --bind 127.0.0.1` を起動する。
const assert=require('node:assert/strict');
const {launch,sleep}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';

async function checkDebugStoryCycle(browser,ok){
  const result=await browser.eval(`
    const old={hasCleared:SaveProfile.hasClearedRun,shown:SaveProfile.tutorialShown,mark:SaveProfile.markTutorialShown,
      village:_openWaveVillage,intro:_playVillageEnterIntro,portrait:showTavernPortrait,dialogue:_qStartDialogue,
      story:_runStoryArrival,delay:_mapDelay,gameOver,town:maybeStartQuestTownArrival,tower:maybeStartQ009TowerArrival,
      pair:_qShowPortraitPair,recovery:_qRunRecoveryTownArrival};
    const out={selections:[],arrivals:[],order:[],profileWrites:[],clears:[],towns:[]};
    let opening=null,townArrival=null;
    try{
      SaveProfile.hasClearedRun=()=>false;
      SaveProfile.tutorialShown=()=>true;
      SaveProfile.markTutorialShown=key=>out.profileWrites.push(key);
      _openWaveVillage=(stage,elite,options)=>{out.startOptions=options;};
      startGame(true,false);
      out.start={cycle:offlineStoryCycle(),wave:G._wave,stage:G._waveStage,arrival:_storyArrivalSpec(out.startOptions)};
      _openWaveVillage=(...args)=>{opening=old.village(...args);return opening;};
      _playVillageEnterIntro=async build=>{out.order.push('intro');build();return true;};
      showTavernPortrait=async()=>null;
      _qShowPortraitPair=async()=>{};
      _qStartDialogue=async lines=>{out.order.push('dialogue');out.lastLines=lines.map(line=>line.text);};
      _mapDelay=async()=>{};
      gameOver=options=>out.clears.push(options);
      _runStoryArrival=spec=>{if(spec) out.arrivals.push(spec.scene);return old.story(spec);};
      maybeStartQuestTownArrival=()=>{townArrival=old.town();return townArrival;};
      _qRunRecoveryTownArrival=async entry=>{out.towns.push(entry.questId);return 'completed';};
      G._facilityTalkSeen={'story:riese-arrival:1':true,'story:riese-arrival:2':true};
      const root=document.getElementById('journey-progress-ui');
      const select=async(cycle,scene)=>{
        _syncRewardJourneyUi({root});
        const mark=root.querySelector('[data-journey-cycle="'+cycle+'"][data-journey-scene="'+scene+'"]');
        if(!mark) throw new Error('デバッグの周回・ステージマークが無い: '+cycle+':'+scene);
        await mark.onclick(new MouseEvent('click',{bubbles:true,cancelable:true}));
        _syncRewardJourneyUi({root});
      };
      for(const cycle of [1,2]){
        // プロフィールを選択と逆の周回にしても、旅程で選んだ周回を使う。
        SaveProfile.hasClearedRun=()=>cycle===1;
        for(let scene=1;scene<=(cycle===1?4:5);scene++){
          await select(cycle,scene);
          const route=_waveRouteForWave(scene).slice();
          G._debugMode=false;SaveProfile.hasClearedRun=()=>cycle===2;
          const normalRoute=_waveRouteForWave(scene).slice();
          G._debugMode=true;SaveProfile.hasClearedRun=()=>cycle===1;
          const current=root.querySelector('.journey-scene-mark.current');
          out.selections.push({cycle:offlineStoryCycle(),scene,wave:G._wave,stage:G._waveStage,
            sameRoute:JSON.stringify(route)===JSON.stringify(normalRoute),formation:scene===1||!!document.querySelector('#scr-battle.active'),
            currentCycle:Number(current?.dataset.journeyCycle),currentScene:Number(current?.dataset.journeyScene),
            elite:scene<=4?_waveDeepLevel(route.indexOf('elite')+1,scene):null,
            boss:scene<=4?_waveDeepLevel(route.indexOf('boss')+1,scene):null,
            bossPreview:scene<=4?FLOOR_DATA[_ensureWaveEnemyPreview(scene,'boss').floor].deepLevel:null});
          if(scene===1){
            const home=villageFacilityList().find(f=>f.key==='home');
            out['cycle'+cycle]={background:getVillageBackgroundKey(),library:libraryBackgroundKey(),homeDisabled:_villageFacilityDisabled(home)};
            await select(cycle,scene); // ラン既読・プロフィール既読があっても同じ会話をもう一度出す。
          }
          if(scene===2){
            const track=root.querySelector('.journey-scene-track-debug');
            const groups=[...track.querySelectorAll('.journey-scene-group')];
            const bounds=root.getBoundingClientRect();
            const children=[...track.querySelectorAll('.journey-scene-mark,.journey-cycle-label')];
            const label=track.querySelector('.journey-cycle-label'),style=getComputedStyle(label);
            out.layout={counts:groups.map(group=>group.querySelectorAll('.journey-scene-mark').length),
              sideBySide:groups[0].getBoundingClientRect().right<groups[1].getBoundingClientRect().left,
              fits:children.every(el=>{const r=el.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right;}),
              visible:style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>0&&label.getBoundingClientRect().height>0,
              size:getComputedStyle(track.querySelector('.journey-scene-mark')).width,
              line:getComputedStyle(track.querySelector('.journey-track-line')).width,
              gap:getComputedStyle(track).gap,currentCount:track.querySelectorAll('.journey-scene-mark.current').length};
          }
        }
        // 周回別のヴァルガ宿屋・酒場・五聖の座も通常と同じ条件になる。
        G._wave=2;G._waveLife=1;G._isWaveAltar=false;
        const inn=villageFacilityList().find(f=>f.key==='inn');
        out['cycle'+cycle].innDisabled=_villageFacilityDisabled(inn);
        out['cycle'+cycle].tavernDisabled=_villageFacilityDisabled(villageFacilityList().find(f=>f.key==='tavern'));
        G._isWaveAltar=true;G._fiveSaints={visited:false,offeredNos:[],offers:{},decisions:{},targets:{}};
        out['cycle'+cycle].landingVisible=villageFacilityList().some(f=>f.key==='landing');
        out['cycle'+cycle].landingUnlocked=_fiveSaintsUnlocked();
      }
      // ステージ2の編成から街マスを押すと、前の街で受けた依頼の到着イベントへ入る。
      G.questProgress={Q002:{questId:'Q002',wave:1,status:'accepted',tavernVariant:'Q002_1',towerVariant:'Q002_2',
        townEventDone:false,towerEventDone:false}};
      await select(2,2);
      root.querySelector('[data-journey-type="city"]').click();
      await opening;await townArrival;
      out.town={started:out.towns.includes('Q002'),done:G.questProgress.Q002.townEventDone,
        stage:G._waveStage,type:_waveRouteNode(G._waveStage)};
      await select(2,2);
      const replay=G._debugArrivalQuest,goldBefore=G.gold,boardCard=G.mainBoard[0];
      replay.townRewardGiven=false;replay.cargoLossPaid=false;
      _qGiveTownArrivalGold(replay,{rewardGoldByCount:{3:250}},{},3);
      const loss=_qPayCargoLoss(replay,3,0);
      const testCard=makePanel(PANEL_POOL[0].id);G.mainBoard[0]=testCard;
      const held=_qTakeOwnedCards(_qCardNo(testCard),replay);
      out.replayResources=G.gold===goldBefore&&loss===0&&held>=1&&G.mainBoard[0]===testCard
        &&G.questProgress.Q002.status==='completed';
      G.mainBoard[0]=boardCard;
      root.querySelector('[data-journey-type="city"]').click();
      await opening;await townArrival;
      out.town.replayed=out.towns.filter(id=>id==='Q002').length===2&&G.questProgress.Q002.status==='completed';
      G.questProgress={};
      for(const cycle of [1,2]){
        await select(cycle,4);
        const clearsBefore=out.clears.length;
        root.querySelector('[data-journey-type="altar"]').click();
        await opening;
        // 1周目の蝕界の塔到達イベントは、立ち絵のフェード（実時間）を挟んでからクリア画面へ進む。終わるまで待つ。
        await new Promise(resolve=>{const t0=Date.now();const iv=setInterval(()=>{
          if(out.clears.length>clearsBefore||Date.now()-t0>(cycle===1?6000:1500)){clearInterval(iv);resolve();}},50);});
        out['tower'+cycle]={arrival:_storyArrivalSpec({intro:true}),clearCount:out.clears.length};
      }
      // 進行中の会話・立ち絵・施設・五聖の座と、止まった到着セッションを片付ける。
      G._storyArrivalBusy=true;G._villageFacilityBusy=true;G._isFiveSaints=true;G._fiveSaintsResolving=true;G._facilityGreetingKey='shop';
      _qTownSession=true;_qTowerSession=true;
      document.body.classList.add('five-saints-active','five-saints-formation-active','quest-town-event-active','facility-bg-active');
      for(const [id,className] of [['tavern-dialogue-layer',''],['five-saints-decor',''],['','tavern-presentation-host'],['','quest-event-shade']]){
        const el=document.createElement('div');if(id) el.id=id;if(className) el.className=className;
        document.getElementById('scr-village').appendChild(el);
      }
      await select(2,3);
      out.cleanup={dom:!document.querySelector('#tavern-dialogue-layer,#five-saints-decor,.tavern-presentation-host,.quest-event-shade'),
        classes:!['five-saints-active','five-saints-formation-active','quest-town-event-active','facility-bg-active'].some(c=>document.body.classList.contains(c)),
        state:!G._storyArrivalBusy&&!G._villageFacilityBusy&&!G._isFiveSaints&&!G._fiveSaintsResolving&&!G._facilityGreetingKey&&!_qTownSession&&!_qTowerSession};
      // 立ち絵の待機中に選び直しても、前の到着会話が後から復活しない。
      let release;
      showTavernPortrait=()=>new Promise(resolve=>{release=resolve;});
      G._wave=0;G._isWaveAltar=false;
      const pending=_runStoryArrival(_storyArrivalSpec({intro:true}));
      const linesBefore=out.order.filter(v=>v==='dialogue').length;
      await select(1,3);release(null);
      out.cancelled=await pending==='cancelled'&&!G._storyArrivalBusy
        &&out.order.filter(v=>v==='dialogue').length===linesBefore;
      showTavernPortrait=async()=>null;
      // 保存形式への追加、復元後の周回、古い保存の既定値を確かめる。
      const save=SaveRun.buildRunSave('reward');
      out.saved=save.state.progress._debugStoryCycle;
      SaveRun.restoreRunState(save);G._debugMode=true;
      out.restored=offlineStoryCycle();
      delete save.state.progress._debugStoryCycle;
      SaveRun.restoreRunState(save);G._debugMode=true;
      out.legacy=offlineStoryCycle();
      G._debugStoryCycle=1;G._onlineMode=true;G._wave=2;
      _syncRewardJourneyUi({root});
      out.online={cycle:offlineStoryCycle(),groups:root.querySelectorAll('.journey-scene-group').length,
        marks:root.querySelectorAll('.journey-scene-mark').length,landing:_fiveSaintsUnlocked()};
      return out;
    }finally{
      questForceEndEventForDebug();
      SaveProfile.hasClearedRun=old.hasCleared;SaveProfile.tutorialShown=old.shown;SaveProfile.markTutorialShown=old.mark;
      _openWaveVillage=old.village;_playVillageEnterIntro=old.intro;showTavernPortrait=old.portrait;
      _qStartDialogue=old.dialogue;_runStoryArrival=old.story;_mapDelay=old.delay;gameOver=old.gameOver;
      maybeStartQuestTownArrival=old.town;maybeStartQ009TowerArrival=old.tower;
      _qShowPortraitPair=old.pair;_qRunRecoveryTownArrival=old.recovery;
      G._debugMode=false;G._onlineMode=false;G._isWaveAltar=false;G._facilityTalkSeen={};G.questProgress={};
    }
  `);
  ok('デバッグ開始は2周目ステージ1・到着会話を省略',result.start.cycle===2&&result.start.wave===0
    &&result.start.stage===1&&result.start.arrival===null&&result.startOptions.skipStoryArrival,result.start);
  ok('デバッグで1周目1〜4／2周目1〜5を選べ、currentとルート・深層が選択に一致',result.selections.length===9
    &&result.selections.every(s=>s.sameRoute&&s.formation&&s.stage===1&&s.wave===(s.scene===1?0:s.scene)
      &&s.currentCycle===s.cycle&&s.currentScene===s.scene
      &&(s.scene===5||(s.elite===3&&s.boss===(s.cycle===1?6:7)&&s.bossPreview===s.boss))),result.selections);
  ok('デバッグ旅程の4個＋5個は横並びで枠内、現在マークは1つ',JSON.stringify(result.layout.counts)==='[4,5]'
    &&result.layout.sideBySide&&result.layout.fits&&result.layout.visible&&result.layout.currentCount===1
    &&result.layout.size==='16px'&&result.layout.line==='24px'&&result.layout.gap==='56px',result.layout);
  ok('デバッグの背景・ホーム・宿屋・酒場・五聖の座は選んだ周回に従う',result.cycle1.background==='village0Night'
    &&result.cycle1.library==='libraryNight'&&!result.cycle1.homeDisabled&&result.cycle1.innDisabled&&!result.cycle1.tavernDisabled
    &&!result.cycle1.landingVisible&&!result.cycle1.landingUnlocked&&result.cycle2.background==='village0'
    &&result.cycle2.library==='library'&&result.cycle2.homeDisabled&&!result.cycle2.innDisabled&&!result.cycle2.tavernDisabled
    &&result.cycle2.landingVisible&&result.cycle2.landingUnlocked,{first:result.cycle1,repeat:result.cycle2});
  ok('デバッグ選び直しは既読でも地名演出後に周回別リーゼ会話、プロフィールへ書かない',
    result.arrivals.filter(s=>s==='リーゼ地名演出後（一周目）').length===2
    &&result.arrivals.filter(s=>s==='リーゼ地名演出後（二周目）').length>=2
    &&result.order[0]==='intro'&&result.order[1]==='dialogue'&&result.profileWrites.length===0,result.arrivals);
  ok('デバッグの街・塔マスから到着クエスト（完了済みも再生）／1周目の蝕界イベントへ入る',result.town.started&&result.town.done&&result.town.replayed
    &&result.town.type==='city'&&result.tower1.arrival.finalClear&&result.tower1.arrival.portraitB==='MC010'
    &&result.tower1.clearCount===1&&result.tower2.arrival===null&&result.tower2.clearCount===1,{town:result.town,first:result.tower1,repeat:result.tower2});
  ok('デバッグ選び直しは前のイベントを片付け、待機中の到着会話も復活しない',result.cleanup.dom
    &&result.cleanup.classes&&result.cleanup.state&&result.cancelled,result.cleanup);
  ok('完了済み到着会話の再生は報酬・支払い・カード回収を重複しない',result.replayResources);
  ok('デバッグ周回はランへ保存・復元され、古いランは2周目、オンラインは影響なし',result.saved===1
    &&result.restored===1&&result.legacy===2&&result.online.cycle===0&&result.online.groups===0
    &&result.online.marks===5&&result.online.landing,{saved:result.saved,restored:result.restored,legacy:result.legacy,online:result.online});
}

async function checkDebugStoryCycleVisible(browser,ok){
  // 会話の可視性も、実際に旅程を押して出た吹き出しで確認する（上の経路検査は待ち時間だけ省略）。
  await browser.eval(`window.__debugStoryProfile={shown:SaveProfile.tutorialShown,mark:SaveProfile.markTutorialShown};
    SaveProfile.tutorialShown=()=>true;SaveProfile.markTutorialShown=()=>{throw new Error('デバッグからプロフィールに既読を書いた');};`);
  try{
    for(const cycle of [1,2]){
      await browser.eval(`
        G._onlineMode=false;G._debugMode=true;G._debugStoryCycle=${cycle};G._wave=2;G._waveStage=1;G.questProgress={};
        G._facilityTalkSeen={'story:riese-arrival:1':true,'story:riese-arrival:2':true};
        questForceEndEventForDebug();_openWaveFormation();
        document.querySelector('#journey-progress-ui [data-journey-cycle="${cycle}"][data-journey-scene="1"]').click();
      `);
      await browser.waitFor(`(()=>{const el=document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text.is-visible');
        return !G._villageIntroPlaying&&!!el&&Number(getComputedStyle(el).opacity)>.95;})()`,20000);
      const visible=await browser.eval(`
        const el=document.querySelector('#tavern-dialogue-layer .tavern-dialogue-text.is-visible');
        const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
        let opacity=1;for(let p=el;p;p=p.parentElement) opacity*=Number(getComputedStyle(p).opacity);
        return {text:el.textContent,expected:storyTalkEntry('リーゼ地名演出後（${cycle===1?'一':'二'}周目）')['台詞1'].text,
          visible:opacity>.1&&style.visibility!=='hidden'&&style.display!=='none'&&style.color!=='rgba(0, 0, 0, 0)'
            &&rect.width>0&&rect.height>0&&rect.left<innerWidth&&rect.right>0&&rect.top<innerHeight&&rect.bottom>0,
          background:getVillageBackgroundKey(),cycle:offlineStoryCycle()};
      `);
      ok('デバッグ'+cycle+'周目のリーゼ到着会話は実際の色・不透明度・画面内位置で見える',visible.visible
        &&visible.text.trim()===visible.expected.trim()&&visible.cycle===cycle
        &&visible.background===(cycle===1?'village0Night':'village0'),visible);
    }
  }finally{
    await browser.eval(`questForceEndEventForDebug();
      SaveProfile.tutorialShown=window.__debugStoryProfile.shown;SaveProfile.markTutorialShown=window.__debugStoryProfile.mark;
      delete window.__debugStoryProfile;_openWaveFormation();G._debugMode=false;G._onlineMode=false;G._facilityTalkSeen={};`);
  }
}

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
        G._debugStoryCycle=2;
        result.debug={cycle:offlineStoryCycle(),route:_journeyRouteForScene(1).slice()};
      }finally{
        SaveProfile.hasClearedRun=oldHasCleared;
        G._onlineMode=false;G._debugMode=false;G._isWaveAltar=false;
      }
      return result;
    `);
    // Scene 1（エルム→碧翠の塔）は元から通常戦3回＋ボス、他のSceneは4回＋ボス。1周目はどちらも1回少ない。
    ok('1周目だけ各街から塔までが1戦少ない',branches.first.afterCityBattles===3
      &&branches.repeat.afterCityBattles===4&&branches.first.standardAfterCityBattles===4
      &&branches.repeat.standardAfterCityBattles===5&&branches.first.route.length+1===branches.repeat.route.length
      &&branches.first.journeyRemaining==='4'&&branches.repeat.journeyRemaining==='5',branches);
    ok('1周目はホーム／酒場が押せ、ヴァルガ宿屋は満タン文で固定',!branches.first.homeDisabled&&!branches.first.tavernDisabled
      &&branches.first.vargaInn.disabled
      &&branches.first.vargaInn.desc===await browser.eval(`return textMessage('街「宿屋」直下（ライフ満タン時）','')`),branches.first);
    ok('1周目は五聖の座を表示せず、未解放説明は再訪時の行',!branches.first.landingVisible
      &&branches.first.lockedDesc===await browser.eval(`return textMessage('塔「五聖の座」直下（再訪時）','')`),branches.first);
    ok('1周目は夜・2周目は通常のリーゼ背景、2周目は宿屋と五聖の座を通常利用',branches.repeat.background==='village0'&&branches.first.background==='village0Night'
      &&!branches.repeat.vargaInn.disabled&&branches.repeat.landing.visible&&!branches.repeat.landing.disabled
      &&branches.repeat.landing.desc===await browser.eval(`return textMessage('塔「五聖の座」直下','')`),branches.repeat);
    ok('五聖の座は拒否後は再入場可、受諾後は再訪時文で操作不可',!branches.repeat.refused.disabled
      &&branches.repeat.refused.desc===await browser.eval(`return textMessage('塔「五聖の座」直下','')`)
      &&branches.repeat.accepted.disabled
      &&branches.repeat.accepted.desc===await browser.eval(`return textMessage('塔「五聖の座」直下（再訪時）','')`),branches.repeat);
    ok('オンラインとデバッグはプロフィール周回分岐の対象外',branches.online.cycle===0&&branches.online.visible&&!branches.online.disabled
      &&branches.debug.cycle===2&&branches.debug.route.length===branches.repeat.route.length,{online:branches.online,debug:branches.debug});

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
        // 別のラン（ラン内の記録なし）でも、プロフィールに記録済みなら出さない。
        const oldShown=SaveProfile.tutorialShown;
        G._facilityTalkSeen={};SaveProfile.tutorialShown=key=>key===out.first.key;out.firstOtherRun=_storyArrivalSpec();
        SaveProfile.tutorialShown=oldShown;
        G._facilityTalkSeen={};SaveProfile.hasClearedRun=()=>true;out.repeat=_storyArrivalSpec();
        SaveProfile.hasClearedRun=()=>false;G._wave=4;G._isWaveAltar=true;out.tower=_storyArrivalSpec();
        G._onlineMode=true;out.online=_storyArrivalSpec();
      }finally{SaveProfile.hasClearedRun=oldHasCleared;G._onlineMode=false;G._debugMode=false;G._isWaveAltar=false;G._facilityTalkSeen={};}
      return out;
    `);
    ok('リーゼ会話は周回別にシステムデータ内1回、蝕界の塔は1周目だけMC010付き',arrival.first.scene==='リーゼ地名演出後（一周目）'
      &&arrival.firstSeen===null&&arrival.firstOtherRun===null&&arrival.repeat.scene==='リーゼ地名演出後（二周目）'
      &&arrival.tower.finalClear&&arrival.tower.portraitB==='MC010'&&arrival.online===null,arrival);

    await checkDebugStoryCycle(browser,ok);
    await checkDebugStoryCycleVisible(browser,ok);

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
        const smokeState={exists:!!smoke,mask:smoke?.style.webkitMaskImage||smoke?.style.maskImage||'',animated:!!smoke&&smoke.getAnimations().length>0,transform:smoke?getComputedStyle(smoke).transform:''};
        await smokePromise;
        const smokeGone=!document.querySelector('.five-saints-smoke-group')&&!document.querySelector('.tavern-portrait[data-portrait-key="five-saints-mc009"]');
        await _qClearPresentation({immediate:true});
        await showTavernPortrait('MC001',{screen:'village',face:'MC001_C'});
        const exitPromise=storyFlipSlidePortraitLeft('MC001');
        await new Promise(r=>setTimeout(r,80));
        // 元の立ち絵は素早いフェードで消え、左右反転した写しがフェードで現れる（横幅を縮めない）。
        const exits=[...document.querySelectorAll('.tavern-portrait-exit-group')];
        const orig=exits.find(el=>!(el.style.transform||'').includes('scaleX(-1)'));
        const flip=exits.find(el=>(el.style.transform||'').includes('scaleX(-1)'));
        await new Promise(r=>setTimeout(r,400));
        const exitState={exists:exits.length===2,origOpacity:orig?.style.opacity||'',flipOpacity:flip?.style.opacity||'',
          slideTransform:flip?.style.transform||'',origGoneAfterFade:!orig?.isConnected};
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
      &&motion.smokeState.mask.includes('linear-gradient')&&motion.smokeState.animated&&motion.smokeGone,motion.smokeState);
    ok('ギャラハ用退場は素早いフェードで左右反転してから左へスライドして消える',motion.exitState.exists
      &&motion.exitState.origOpacity==='0'&&motion.exitState.flipOpacity==='1'&&motion.exitState.origGoneAfterFade
      &&/translate3d\(-\d/.test(motion.exitState.slideTransform)&&motion.exitState.slideTransform.includes('scaleX(-1)')&&motion.exitGone,motion.exitState);

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
