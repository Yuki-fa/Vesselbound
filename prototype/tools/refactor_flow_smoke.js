'use strict';
const assert=require('node:assert/strict');
const {launch}=require('./parity/headless');

const URL='http://127.0.0.1:5500/index.html';

(async()=>{
  const browser=await launch();
  try{
    await browser.goto(URL);
    await browser.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20',20000);
    await browser.eval(`
      localStorage.clear();
      window.__alerts=[];
      window.alert=message=>window.__alerts.push(message);
      startGame(false);
      G._villageIntroPlaying=false;
      _openWaveFormation();
    `);
    assert.ok(await browser.eval(`
      return document.body.classList.contains('reward-screen-active')&&!G._isShop;
    `),'編成');

    await browser.eval('openMapShop()');
    assert.ok(await browser.eval(`
      return G._isShop&&document.body.classList.contains('shop-screen-active');
    `),'魔導店');

    await browser.eval('_openWaveAltarMenu()');
    assert.ok(await browser.eval(`
      return G._isWaveAltar&&document.body.classList.contains('village-screen-active');
    `),'祭壇');

    await browser.eval(`
      _openWaveFormation();
      _playBattleStartIntro=async()=>{};
      _startWaveFlowNext();
    `);
    await browser.waitFor(`
      G._battleProceedAction||G.phase==='gameover'||window.__alerts.length
    `,90000);
    const battleEnd=await browser.eval(`
      return {won:!!G._battleProceedAction,alerts:window.__alerts};
    `);
    assert.ok(battleEnd.won&&!battleEnd.alerts.length,'戦闘');

    await browser.eval('continueAfterBattleVictory(true)');
    await browser.waitFor(`
      G.phase==='reward'&&!G._battleProceedAction
    `,15000);
    assert.ok(await browser.eval(`
      return document.body.classList.contains('reward-screen-active');
    `),'報酬');

    const errors=browser.events.filter(event=>
      event.method==='Runtime.exceptionThrown'||
      (event.method==='Runtime.consoleAPICalled'&&event.params.type==='error')
    );
    assert.equal(errors.length,0,'コンソールエラー');
    console.log('OK 編成 → 魔導店 → 祭壇 → 戦闘 → 報酬');
  }finally{
    await browser.close();
  }
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
