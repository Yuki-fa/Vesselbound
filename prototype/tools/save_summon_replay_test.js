'use strict';
const assert=require('node:assert/strict');
const {launch}=require('./parity/headless');
const URL='http://127.0.0.1:5500/index.html';

(async()=>{
  const b=await launch();
  const ok=(name,value)=>{assert.ok(value,name);console.log('OK '+name);};
  const ready='typeof SaveRun!=="undefined"&&PANEL_POOL.some(x=>x&&x.id==="panel_mitera")';
  try{
    await b.goto(URL);await b.waitFor(ready,20000);
    await b.eval(`
      localStorage.removeItem(SaveStorage.key('run','current'));
      localStorage.removeItem(SaveStorage.key('run','backup'));
      window.alert=()=>{};
      startGame(false);
      G.mainBoard[3]=makePanel('panel_mitera');
      G.floor=13;G._wave=3;G._waveStage=2;G._waveVillage=false;G._waveBattleType='normal';
      window.__intro=0;
      _playBattleStartIntro=async()=>{window.__intro++;return new Promise(()=>{});};
      showScreen('battle');void startBattle();
    `);
    await b.waitFor('window.__intro>0',30000);
    const pending=await b.eval(`
      const p=loadRun().pendingBattle;
      return {summons:p.events.filter(e=>e.type==='summon'&&String(e.unit?.name||'').includes('ペリカン')).length,
        frames:p.frames.length,outcome:p.outcome};
    `);
    ok('ミテーラのペリカン2体を保存済みイベントへ含める',pending.summons===2);
    ok('召喚後も続く複数フレームの戦闘を生成',pending.frames>=4);

    await b.goto(URL);await b.waitFor(ready,20000);
    await b.eval(`
      window.alert=()=>{};window.__summonFrames=[];window.__frameTypes=[];
      const originalFlush=_flushCorePveHitEvents;
      _flushCorePveHitEvents=async(state,events,before)=>{
        window.__frameTypes=events.map(e=>e.type);
        return originalFlush(state,events,before);
      };
      const originalCompact=requestBattleCompact;
      requestBattleCompact=function(options){
        const result=originalCompact(options);
        if(G._savedBattleReplaying){
          const units=(G.allies||[]).filter(u=>u&&u.hp>0&&String(u.name||'').includes('ペリカン'));
          window.__summonFrames.push({types:[...window.__frameTypes],units:units.map(u=>({
            id:u.id,pending:!!u._corePendingSummon,
            visible:!!document.querySelector('.slot[data-unit-id="'+CSS.escape(String(u.id))+'"]')
          }))});
        }
        return result;
      };
      void SaveRun.continueRun();
    `);
    await b.waitFor('G._battleProceedAction||G.phase==="gameover"',90000);
    const result=await b.eval(`
      const first=window.__summonFrames.find(x=>x.types.includes('summon')&&x.units.length);
      const later=window.__summonFrames.find(x=>!x.types.includes('summon')&&x.units.length);
      return {first,later,all:window.__summonFrames};
    `);
    ok('召喚フレームでペリカンが表示される',result.first&&result.first.units.every(u=>u.visible&&!u.pending));
    if(!result.later) console.log(JSON.stringify(result.all));
    ok('後続フレームでも生存ペリカンが消えない',result.later&&result.later.units.every(u=>u.visible&&!u.pending));
  }finally{await b.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
