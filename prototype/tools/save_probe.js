'use strict';
const {launch}=require('./parity/headless');
(async()=>{
  const b=await launch();
  try{
    await b.goto('http://127.0.0.1:5500/index.html');
    await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20',20000);
    await b.eval('window.__alerts=[];window.alert=message=>window.__alerts.push(message);');
    console.log(await b.eval('return {cards:PANEL_POOL.length,items:ITEM_POOL.slice(0,1),card:PANEL_POOL.slice(0,1),enemy:ENEMY_POOL.slice(0,1)}'));
    console.log(await b.eval('startGame(false);return {save:loadRun(),profile:SaveProfile.load()}'));
    await b.eval('window.__intro=0;_playBattleStartIntro=async()=>{window.__intro++;return new Promise(()=>{})};G._villageIntroPlaying=false;_startWaveFlowNext();');
    await b.waitFor('window.__intro>0||document.querySelector("#scr-title.active")',20000);
    console.log(await b.eval('return {save:loadRun()?.checkpoint,bytes:JSON.stringify(loadRun()).length,intro:window.__intro,preparing:G._savePreparing,phase:G.phase,alerts:window.__alerts}'));
    console.log(b.events.filter(e=>e.method==='Runtime.consoleAPICalled'&&e.params.type==='error').map(e=>e.params.args.map(a=>a.description||a.value)));
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
