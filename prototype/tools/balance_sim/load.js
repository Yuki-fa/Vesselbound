'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm');
require('./stub');
const ROOT=path.resolve(__dirname,'../..');
const scripts=['assets.js','js/engine/audio.js','js/engine/constants.js','js/data/floors.js','js/data/events.js','js/data/local_xlsx_data.js','js/data/loader.js','js/data/units.js','js/engine/state.js','js/engine/pool.js','js/engine/enemy.js','js/engine/battle.js','js/engine/render.js','js/engine/reward.js','js/engine/map.js','js/engine/move.js','js/engine/main.js'];
for(const rel of scripts) vm.runInThisContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),{filename:rel});
vm.runInThisContext(`
  renderAll=function(){}; renderControls=function(){}; updateHUD=function(){}; gameOver=function(){}; goToReward=function(){}; triggerBattleScreenShake=async function(){};
  playHitVfx=function(){}; playDamageEffectSfx=function(){}; _playCardEffectVfx=function(){};
  _playCardEffectSfx=function(){}; _waitForPendingVfx=async function(){}; _delayDeathCompact=function(){};
  playBattleOpeningSequence=async function(){}; _playBattleStartIntro=async function(){return 'normal';};
  _handleVictory=function(){};
`,{filename:'balance_sim_overrides.js'});
require('./ai').installBalanceAi();
module.exports={ROOT,scripts};
