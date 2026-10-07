'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
const {makeElement}=require('./stub');
// 演出のrAFループを同期実行すると、自分を予約するたびに再帰してしまう。
// 数値ハーネスではフレーム・常駐監視を進めず、戦闘コアだけを実行する。
document.head=makeElement('head');
global.requestAnimationFrame=()=>0;
global.setInterval=()=>0;
let harnessTime=0;
global.performance={now:()=>harnessTime};
global.setTimeout=(fn,ms,...args)=>{harnessTime+=Math.max(0,Number(ms)||0);if(typeof fn==='function') fn(...args);return 0;};
const ROOT=path.resolve(__dirname,'../..');
const scripts=[...fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)]
  .map(m=>m[1]).filter(src=>!src.startsWith('http'));
for(const rel of scripts) vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});
vm.runInThisContext(`
  renderAll=function(){}; renderControls=function(){}; updateGoldenDrop=function(){}; playBattleStartLines=async function(){}; updateHUD=function(){}; gameOver=function(){}; goToReward=function(){}; triggerBattleScreenShake=async function(){};
  playHitVfx=function(){}; playDamageEffectSfx=function(){}; _playCardEffectVfx=function(){};
  _playCardEffectSfx=function(){}; _waitForPendingVfx=async function(){}; _delayDeathCompact=function(){};
  playBattleOpeningSequence=async function(){}; _playBattleStartIntro=async function(){return 'normal';};
  _handleVictory=function(){};
  SaveRun.enabled=function(){return false;};
`,{filename:'balance_sim_overrides.js'});
require('./ai').installBalanceCoreHarness();
module.exports={ROOT,scripts};
