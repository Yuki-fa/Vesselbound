'use strict';
// 2026-10-12 利用者指定: 実際のチュートリアル完走・再読込／コンティニューと、試験戦闘前後の立ち絵を確認。
// 戦闘は実際のstartBattle／onBattleEndを通し、開幕待ちだけを保留して入口・出口の見え方を測る。
const assert=require('node:assert/strict');
const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
(async()=>{
  const b=await launch({width:1920,height:1080});
  try{
    const open=async()=>{
      await b.goto(URL);
      await b.waitFor('typeof PANEL_POOL!=="undefined"&&PANEL_POOL.some(c=>c.no==="E014"&&c._sheetSeen)&&typeof SaveRun!=="undefined"',20000);
      await b.eval(`window.VB1012Test={visible:el=>{
        if(!el||!el.isConnected)return false;const r=el.getBoundingClientRect();
        if(!(r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight))return false;
        for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<=0)return false;}
        const s=getComputedStyle(el);return s.color!=='rgba(0, 0, 0, 0)'&&(!el.matches('img')||(el.complete&&el.naturalWidth>0));
      }};`);
    };
    const menu=async debug=>b.eval(`initState();G._debugMode=${debug};G.gold=10000;G._waveLife=3;${debug?'':'SaveRun.begin();'}openMapLibraryMenu();`);
    const completedEntry=async()=>{
      await b.eval(`document.getElementById('library-howto-btn').click();`);
      await b.waitFor('G._isLibrary&&document.body.classList.contains("library-formation-active")',10000);
      // _waitLibraryUIReadyの予約まで待ち、遅れて説明が出ないことも確認する。
      await b.eval(`await new Promise(r=>setTimeout(r,700));`);
      const result=await b.eval(`return {active:!!G._libraryTutorialActive,box:!!document.querySelector('.library-tutorial-box'),
        loans:_rewCards.filter(Boolean).map(c=>c.no),shown:VB1012Test.visible(document.querySelector('#reward-offer-row .rew-card'))};`);
      assert.ok(!result.active&&!result.box&&result.shown,JSON.stringify(result));
      assert.deepEqual(result.loans,['C050','C099','E013','E032','E014']);
    };
    const complete=async()=>{
      const result=await b.eval(`
        const wait=ms=>new Promise(r=>setTimeout(r,ms));let visibleText=false;
        for(let i=0;i<35&&G._libraryTutorialActive;i++){
          const box=document.querySelector('.library-tutorial-box');visibleText ||= VB1012Test.visible(box);
          const move=G._libraryTutorialMove;
          if(move){const at=_rewCards.findIndex(c=>c&&c.name===move.name);if(at<0)throw new Error('貸出移動対象なし');takeRewCard(at,move.index);await wait(500);}
          else {if(!box)throw new Error('説明の窓なし');box.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));await wait(240);}
        }
        return {done:!G._libraryTutorialActive,visibleText,completed:_libraryBoardTutorialCompleted()};
      `);
      assert.ok(result.done&&result.visibleText&&result.completed,JSON.stringify(result));
    };
    await open();await b.eval(`SaveStorage.remove('profile');SaveStorage.remove('run');SaveProfile.resetCache();`);await menu(false);
    assert.equal(await b.eval(`return VB1012Test.visible(document.getElementById('library-merge-btn'));`),false);
    await b.eval(`document.getElementById('library-howto-btn').click();`);
    await b.waitFor('G._libraryTutorialActive&&G._libraryTutorialStep>=0',10000);
    const loan=await b.eval(`const el=document.querySelector('#reward-offer-row .rew-card[data-merge-rew-idx="4"]');return {
      codes:_rewCards.filter(Boolean).map(c=>c.no),visible:VB1012Test.visible(el),preview:el?.getAttribute('data-preview')||'',
      expected:PANEL_POOL.find(c=>c.no==='E014').name,keywords:_rewCards[4]?.adjacentKeywords};`);
    assert.deepEqual(loan.codes,['C050','C099','E013','E032','E014']);
    assert.ok(loan.visible&&loan.preview.includes(loan.expected)&&loan.keywords.includes('二段攻撃'),JSON.stringify(loan));
    assert.equal(await b.eval(`return SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY);`),false);
    // 途中離脱だけでは完走を書かない。
    await open();await menu(false);assert.equal(await b.eval(`return _libraryBoardTutorialCompleted();`),false);
    await b.eval(`document.getElementById('library-howto-btn').click();`);await b.waitFor('G._libraryTutorialActive&&G._libraryTutorialStep>=0',10000);
    await complete();await b.eval(`closeMapLibraryFormation();openMapLibraryMenu();`);await completedEntry();
    await b.eval(`closeMapLibraryFormation();SaveRun.saveRun(SaveRun.buildRunSave('reward'));`);
    await open();await b.eval(`await SaveRun.continueRun();openMapLibraryMenu();`);
    const resumed=await b.eval(`return {completed:SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY),merge:VB1012Test.visible(document.getElementById('library-merge-btn'))};`);
    assert.ok(resumed.completed&&!resumed.merge,JSON.stringify(resumed));await completedEntry();
    console.log('OK 3/4: E014貸出の表示、途中離脱、実際の完走、同ページと再読込→コンティニュー後の説明省略');

    await open();await menu(true);
    assert.equal(await b.eval(`return VB1012Test.visible(document.getElementById('library-merge-btn'));`),false,'デバッグは通常プロフィールを使わない');
    const profile=await b.eval(`return SaveProfile.load();`);
    await b.eval(`document.getElementById('library-howto-btn').click();`);await b.waitFor('G._libraryTutorialActive&&G._libraryTutorialStep>=0',10000);
    await complete();await b.eval(`closeMapLibraryFormation();openMapLibraryMenu();`);await completedEntry();
    assert.deepEqual(await b.eval(`return SaveProfile.load();`),profile,'デバッグ完走をプロフィールへ書かない');
    await open();await menu(true);assert.equal(await b.eval(`return _libraryBoardTutorialCompleted();`),false,'デバッグは再読込で説明を再び実行できる');
    console.log('OK 4: デバッグの同ページ完走・プロフィール非更新・再読込の扱い');

    await open();
    for(const mode of ['shop','item','forge','peddler','tavern','camp']){
      await b.eval(`
        await _qClearPresentation({immediate:true,includeShop:true});_qRemoveDialogue();
        initState();G._debugMode=true;G.gold=10000;G._waveLife=3;G.phase='reward';G._wave=1;
        const mode=${JSON.stringify(mode)};
        if(['shop','item','forge'].includes(mode)){
          // 2026-10-12 第1回Chrome検査: ステージ1に無い鍛冶屋も、施設とBキャラが実在する街で検査する。
          let fac=null;
          for(const wave of Object.keys(window.REGION_INFO||{}).map(Number).sort((a,b)=>a-b)){
            G._wave=wave;
            fac=villageFacilityList().find(f=>f.key===mode&&_shopPortraitB(f));
            if(fac)break;
          }
          if(!fac)throw new Error('施設・Bキャラのある街なし '+mode);
          _enterVillageFacilityNow(fac);_showShopPortraitB(fac);
        }else if(mode==='peddler'){
          G._isShop=G._isPeddler=true;_rewCards=[];showScreen('battle');goToReward({restoreCheckpoint:true});
        }else{
          G._wave=mode==='camp'?2:1;
          G._isTavern=mode==='tavern';G._questCampScene=mode==='camp';
          showScreen('village');renderVillageScreen();
          if(mode==='camp')document.body.classList.add('quest-camp-scene','tavern-tower-event-active');
          const questId=mode==='camp'?'Q004':'Q003',entry={questId,tavernVariant:questId+'_1'};
          const data=_qQuestData(entry.tavernVariant);await _qShowPortraitPair('village',entry,{firstLines:_qFormationInitialLines(entry,data)});
        }
        const card=makePanel(PANEL_POOL.find(c=>c.no==='C064').id);card.power=1;card.life=5000;card.desc='';
        G.mainBoard.fill(null);G.mainBoard[1]=card;G.mapPanelPowers={1:'summon'};
        const host=document.getElementById('tavern-presentation-layer');if(!host)throw new Error(mode+' 立ち絵なし');
        await Promise.all([...host.querySelectorAll('img')].map(el=>el.decode().catch(()=>{})));
        await new Promise(r=>setTimeout(r,750));
        VB1012Test.beforeHost=host;VB1012Test.beforeHtml=host.outerHTML;VB1012Test.beforeParent=host.parentNode;
        VB1012Test.snapshot=()=>[...host.querySelectorAll('.tavern-portrait,.tavern-face')].map(el=>{
          const s=getComputedStyle(el),r=el.getBoundingClientRect();return {src:el.src,key:el.dataset.portraitKey||el.dataset.facePortraitKey,
            opacity:s.opacity,visible:VB1012Test.visible(el),rect:[r.left,r.top,r.width,r.height].map(n=>Math.round(n))};
        });
        VB1012Test.before=VB1012Test.snapshot();
        VB1012Test.intro=_playBattleStartIntro;VB1012Test.held=false;
        _playBattleStartIntro=()=>new Promise(resolve=>{VB1012Test.release=resolve;VB1012Test.held=true;});
        startTestBattle();
      `);
      await b.waitFor('VB1012Test.held&&G._testBattleMode',15000);
      const during=await b.eval(`renderAll();await new Promise(r=>requestAnimationFrame(r));return {
        before:VB1012Test.before,host:!!document.getElementById('tavern-presentation-layer'),
        visible:[...document.querySelectorAll('.tavern-portrait,.tavern-face')].filter(VB1012Test.visible).length};`);
      assert.ok(during.before.some(x=>x.visible),mode+' 開始前に立ち絵が見える');
      assert.ok(!during.host&&during.visible===0,mode+' 試験戦闘中に立ち絵・表情が見えない');
      const after=await b.eval(`
        await _exitTestBattle();_bumpBattleRunId();VB1012Test.release('normal');_playBattleStartIntro=VB1012Test.intro;
        await new Promise(r=>requestAnimationFrame(r));
        return {same:document.getElementById('tavern-presentation-layer')===VB1012Test.beforeHost,
          parent:VB1012Test.beforeHost.parentNode===VB1012Test.beforeParent,html:VB1012Test.beforeHost.outerHTML===VB1012Test.beforeHtml,
          before:VB1012Test.before,after:VB1012Test.snapshot(),phase:G.phase};
      `);
      assert.ok(after.same&&after.parent&&after.html&&after.phase==='reward',mode+' 同じ立ち絵・表情・層を復帰');
      assert.deepEqual(after.after,after.before,mode+' 復帰後の表示・不透明度・位置・寸法');
    }
    console.log('OK 5: 魔導店・道具屋・鍛冶屋・行商人・酒場・campの試験戦闘中の非表示と元の表示への復帰');
  }finally{await b.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
