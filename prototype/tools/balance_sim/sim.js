'use strict';
require('./load');

let damageTrackerInstalled=false;
function installDamageTracker(){
  if(damageTrackerInstalled) return;
  const original=_applyDamageState;
  _applyDamageState=function(unit,dmg,source,side,skipTough){
    const before=unit&&typeof unit.hp==='number'?unit.hp:0;
    const result=original(unit,dmg,source,side,skipTough);
    const actual=Math.max(0,before-(unit&&typeof unit.hp==='number'?unit.hp:before));
    if(G._simMetrics){
      if(side==='enemy' && G.allies.includes(source)) G._simMetrics.dealt+=actual;
      if(side==='ally' && G.enemies.includes(source)) G._simMetrics.taken+=actual;
    }
    return result;
  };
  damageTrackerInstalled=true;
}

function makeRng(seed){
  let x=(seed>>>0)||1;
  return ()=>{ x=(Math.imul(1664525,x)+1013904223)>>>0; return x/4294967296; };
}

async function waitBattleEnd(){
  for(let i=0;i<200;i++){
    if(G.phase==='reward'||G._battleDefeatHandled||G._simTimeout||G.phase===null){
      // 勝敗確定後に本体が予約する後処理（VFX待ち・報酬遷移）を消化してから、
      // 次の試行でグローバルGを初期化する。
      await new Promise(r=>setImmediate(r));
      await new Promise(r=>setImmediate(r));
      return;
    }
    await new Promise(r=>setImmediate(r));
  }
  G._testBattleAbort=true;
  G._simTimeout=true;
}

async function simulateCard(card,{seed=123456789,floor=5}={}){
  installDamageTracker();
  const oldRandom=Math.random;
  Math.random=makeRng(seed);
  try{
    // initState() は通常も全体を置換するが、念のため旧Gのキーを先に全削除する。
    // 非同期後処理が参照する残留フラグも含め、試行境界を明確にする。
    Object.keys(G||{}).forEach(key=>{ delete G[key]; });
    initState();
    G.floor=floor; G._mapBattle=null; G._waveLoopEnabled=false; G._debugMode=false;
    G._simMetrics={dealt:0,taken:0};
    // メイン盤面の前衛中央に1枚だけ置く。同じ配置を全カードで固定する。
    G.mainBoard=new Array(15).fill(null);
    G.mainBoard[1]=clone(card);
    G.phase='player';
    await startBattle();
    await waitBattleEnd();
    const allies=(G.allies||[]).filter(Boolean);
    const living=allies.filter(u=>u.hp>0&&!u._isObject&&!u._isSoul).length;
    const started=Math.max(1,allies.length);
    const timeout=!!G._simTimeout || (G.phase!=='reward'&&!G._battleDefeatHandled);
    const won=!timeout && G.phase==='reward' && !(G._battleDraw);
    const lost=!timeout && !won && !!G._battleDefeatHandled;
    return {won,lost,timeout,decided:won||lost,turns:Number(G.turn)||0,dealt:G._simMetrics.dealt,taken:G._simMetrics.taken,
      survivalRate:living/started,living,started,enemyCount:(G.enemies||[]).filter(Boolean).length};
  } finally { Math.random=oldRandom; }
}

module.exports={simulateCard};
