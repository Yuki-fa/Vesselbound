'use strict';
// ═══════════════════════════════════════
// tools/parity/loop_parity.js — PvEの戦闘ループとコアの戦闘ループが同じ結果を出すかを検証する。
//
// なぜ要るか：ルールの食い違いは個別に潰したが、PvEの battlePhase() と
// コアの runBattleCore()（= coreBattleStep）は今も別々のコードである。
// 片方だけ直せば、また「オンラインだけ違う」バグが生まれる。それを機械的に検出する。
//
// 方法：同じ盤面・同じ乱数（定数）で両方を回し、各キャラの最終HP・生死・勝敗を比べる。
//   - 乱数は定数。呼ぶ順番が違っても同じ添字を選ぶので、
//     乱数の消費順ではなくループ構造の違いだけが差として出る。
//   - 開戦・終戦・封印・解放・生贄を持つカードは除く。
//     これらは runBattleCore にしか無い工程で、PvEでは startBattle() 側にあるため。
//   - **1ケースごとにページを再読み込みする。**
//     G には戦闘をまたいで残るカウンタ（味方の死亡数など）があり、
//     再読み込みしないと2回目以降の結果がずれて比較にならない。
//
//   1. ローカルサーバーを立てる（既定 http://127.0.0.1:5500）
//   2. node tools/parity/loop_parity.js
//      VB_CASES=40 で件数、VB_URL でURLを変えられる。
//
// 不一致が出たら閾値を緩めず、原因のカードを特定すること。
// ═══════════════════════════════════════
const { launch } = require('./headless');

const BASE = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const CASES = Number(process.env.VB_CASES || 24);
const READY = "typeof G!=='undefined' && typeof battlePhase==='function' && typeof runBattleCore==='function' && typeof PANEL_POOL!=='undefined' && PANEL_POOL.length>0";

// ページ内で1ケースを実行して結果を返す。ci で盤面が決まる。
const PLAIN = process.env.VB_PLAIN === '1';
const CASE_SRC = ci => `
  const ci=${ci};
  const PLAIN=${PLAIN};
  const noop=()=>{}; const aNoop=()=>Promise.resolve();
  window.battleSleep=aNoop; window.playAttackMotion=aNoop; window.playHitVfx=aNoop;
  window.playSpecialProductionVfx=aNoop; window.playSfx=noop; window.log=noop;
  window.renderAll=noop; window.renderField=noop; window.renderControls=noop;
  window.updateUnitDamageUi=noop; window.showDamageLabel=aNoop;

  const NG=/開戦|終戦|封印|解放|生贄/;
  const pool=PANEL_POOL.filter(c=>c&&c.category==='キャラクター'
    &&Number(c.power)>0&&Number(c.life)>0
    &&!NG.test(String(c.desc||''))&&!NG.test(String((c.keywords||[]).join(' '))));
  if(!pool.length) throw new Error('比較に使えるカードが0件');

  const lcg=s=>()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
  const clone=u=>JSON.parse(JSON.stringify(u));
  const pick=lcg(1000+ci*7919);
  const n=2+Math.floor(pick()*3);
  const makeSide=(side)=>{
    const out=[];
    for(let i=0;i<n;i++){
      // VB_PLAIN=1：効果もキーワードも持たない素のキャラだけで、
      // 攻撃順・対象選択・終了判定というターン進行そのものを切り分ける。
      const c=PLAIN
        ? {name:'素'+side+i, power:1+Math.floor(pick()*6), life:3+Math.floor(pick()*12),
           color:'赤', keywords:[], desc:''}
        : pool[Math.floor(pick()*pool.length)];
      out.push({id:side+i, name:c.name, lane:'front', slot:i, side,
        atk:Number(c.power)||1, hp:Number(c.life)||1, maxHp:Number(c.life)||1,
        color:c.color||'赤', keywords:Array.isArray(c.keywords)?c.keywords.slice():[],
        desc:String(c.desc||''), _panelSummoned:true});
    }
    return out;
  };
  const A=makeSide('p1'), B=makeSide('p2');
  const names={}; [...A,...B].forEach(u=>{names[u.id]=u.name;});

  // 定数乱数。先攻の同数時（コアは乱数コイン／PvEは味方固定）を
  // PvE側へ寄せて中和し、登録済みの意図的差分をここで拾わないようにする。
  const R=0.4;
  // PvEはコアへ委譲する抽選に coreMathRng を使う。これを定数化しないと、
  // PvE側だけ本物の疑似乱数で引くことになり、ルールではなく乱数の違いが差として出る。
  // 両方を同じ coreMathRng に固定して比べる。
  coreMathRng.seed=function(){};
  coreMathRng.next=function(){ return R; };
  coreMathRng.int=function(lo,hi){ return lo+Math.floor(this.next()*(hi-lo+1)); };
  coreMathRng.pick=function(arr){ return arr.length ? arr[Math.floor(this.next()*arr.length)] : null; };
  const rngObj=coreMathRng;

  const snap=(p1,p2,life)=>{
    const m={};
    [...(p1||[]),...(p2||[])].filter(Boolean).forEach(u=>{ m[u.id]={hp:Math.max(0,Number(u.hp)||0),atk:Number(u.atk)||0}; });
    return {units:m, life:Number(life)||0};
  };
  const alive=list=>(list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;

  // ── A: PvEの battlePhase() ──
  G.allies=new Array(14).fill(null); G.enemies=new Array(14).fill(null);
  clone(A).forEach((u,i)=>{G.allies[i]=u;});
  clone(B).forEach((u,i)=>{G.enemies[i]=u;});
  // startBattle() が戦闘前に初期化するフィールドを同じように用意する。
  // 1つでも欠けると battlePhase() の中で例外が出て、その手番が飛び、
  // 「PvEとコアがずれている」ように見えてしまう（実際は検証側の不備）。
  G.phase='battle'; G.life=20; G.mana=0; G.gold=0; G.rings=[]; G.activeBattleItems=[];
  G.battleCounters={damage:0,deaths:0};
  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._battleRunId=1; G._debugFormationAbort=false; G._testBattleAbort=false;
  G._testBattleMode=false; G._battleVictoryPending=false; G._battleMotionDepth=0;
  G._battleCoreEvents=[]; G._coreConsumedItemEvents=new Set(); G._injuryDispatchSequence=0;
  G._battleDraw=false; G._isBossRewardCycle=false; G._battleSummonedAllyCount=0;
  G._masterHandReady=false; G._manaCycleUsed=false; G._eidolonDeathCount=0;
  G._genericAllyDeaths=0; G._showGlobalPanels=true; G._battleDefeatHandled=false;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G._battleStartedAt=performance.now(); G._battleSpeed=1; G._battleSpeedFrom=1;
  G._battleSpeedTarget=1; G._battleSpeedChangedAt=performance.now(); G._battleSpeedReason='';
  G._battleAttackedIds={}; G._battleEndEffectsApplied=false;
  G._necromancerRingUsed=false; G._revivalRingUsed=false; G._oniRingAttackCount=0;
  G._stormRingFireCount=0; G._enemyDeathsThisBattle=0;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const bs=document.getElementById('scr-battle'); if(bs) bs.classList.add('active');
  const realRandom=Math.random; Math.random=()=>R;
  // **PvEの開戦処理を先に走らせる。** battlePhase() は開戦済みを前提に
  // skipOpening で始まるため、これを飛ばすと結界・開戦効果の分だけ core とずれる
  // （検査側の不備であり、製品の不具合ではない）。
  if(typeof _finishNewPanelBattleStartEffects==='function'){
    try{ await _finishNewPanelBattleStartEffects(); }catch(e){ /* 開戦効果なしで続行 */ }
  }
  // battlePhase() は攻撃1回分の例外を握りつぶして手番を進めないため、
  // console.error を拾わないと「ルールの差」に見えてしまう。必ず失敗させる。
  const caught=[]; const origErr=console.error;
  console.error=function(){ caught.push([...arguments].map(String).join(' ')); };
  let pveErr=null;
  try{ await Promise.race([battlePhase(), new Promise(r=>setTimeout(()=>r('timeout'),20000))]); }
  catch(e){ pveErr=String(e&&e.message||e); }
  Math.random=realRandom; console.error=origErr;
  if(caught.length) pveErr='攻撃処理で例外: '+caught[0].slice(0,160);
  const pve=snap(G.allies,G.enemies,G.life);
  const pveWin=alive(G.enemies)===0 ? (alive(G.allies)===0?'draw':'p1')
             : (alive(G.allies)===0?'p2':'unfinished');

  // ── B: コアの runBattleCore() ──
  // **PvEと同じ入力を与えること。** 召喚定義を渡さないと core だけ召喚できず、
  // 検査側の都合で勝敗が変わる（製品の不具合ではない）。
  const state=createBattleState({
    resources:{p1:{mana:0,gold:0},p2:{mana:0,gold:0}},
    rings:{p1:[],p2:[]}, items:{p1:[],p2:[]},
    sides:{p1:{units:clone(A)}, p2:{units:clone(B)}},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'?ITEM_POOL:[],
  });
  state.life={p1:20,p2:20};
  let coreErr=null, coreRes=null;
  try{ coreRes=runBattleCore(state,rngObj,{}); }catch(e){ coreErr=String(e&&e.message||e); }
  const cor=snap(state.units.p1,state.units.p2,state.life&&state.life.p1);
  const coreWin=(coreRes&&coreRes.outcome)||'unfinished';

  // ── 比較 ──
  const diffs=[];
  Object.keys(names).forEach(id=>{
    const a=pve.units[id]||{hp:0,atk:0}, b=cor.units[id]||{hp:0,atk:0};
    if(a.hp!==b.hp){ diffs.push(id+'('+names[id]+') HP PvE='+a.hp+' core='+b.hp); return; }
    // PvEは死亡キャラを配列から外すためATKが残らない。両方生存時のみ比べる。
    if(a.hp>0&&b.hp>0&&a.atk!==b.atk) diffs.push(id+'('+names[id]+') ATK PvE='+a.atk+' core='+b.atk);
  });
  if(pveWin!==coreWin) diffs.push('勝敗 PvE='+pveWin+' core='+coreWin);
  return {ci,n,pveErr,coreErr,diffs,names:Object.values(names),
    sig:JSON.stringify([pve,pveWin])};
`;

(async () => {
  const b = await launch();
  const rows = [];
  const T0 = Date.now();
  try {
    for (let ci = 0; ci < CASES; ci++) {
      // Gには戦闘をまたいで残る状態があるため、毎回まっさらに読み直す。
      await b.goto(BASE, 900);
      await b.waitFor(READY);
      const r = await b.eval(CASE_SRC(ci), 60000);
      // 同じケースをもう一度まっさらな状態で走らせ、PvEが再現するか確かめる。
      // 再現しないなら比較結果は信用できない。
      if (ci < Number(process.env.VB_STABLE||0)) {
        await b.goto(BASE, 900);
        await b.waitFor(READY);
        const r2 = await b.eval(CASE_SRC(ci), 60000);
        r.stable = r.sig === r2.sig;
      } else r.stable = true;
      rows.push(r);
      process.stdout.write(`\r  ${ci + 1}/${CASES} ケース実行中… (${Math.round((Date.now()-T0)/1000)}s)`);
    }
    process.stdout.write('\r' + ' '.repeat(40) + '\r');

    let ng = 0;
    rows.forEach(r => {
      if (!r.diffs.length && !r.pveErr && !r.coreErr && r.stable) return;
      ng++;
      console.log(`NG   ケース${r.ci}（${r.n}体×2）`);
      if (!r.stable) console.log('     ※PvEが同じ入力で違う結果を出す（比較不能。Gの持ち越しを疑う）');
      if (r.pveErr) console.log(`     PvE例外: ${r.pveErr}`);
      if (r.coreErr) console.log(`     core例外: ${r.coreErr}`);
      r.diffs.slice(0, 8).forEach(d => console.log(`     ${d}`));
      console.log(`     出撃: ${r.names.join('、')}`);
    });
    console.log(`\nループ一致検証: ${rows.length}ケース中 NG ${ng}`);
    const errs = (await b.consoleErrors()).filter(e => !/404|Failed to load resource/.test(e));
    if (errs.length) console.log('コンソール例外:', errs.slice(0, 5));
    process.exitCode = ng ? 1 : 0;
  } finally { await b.close(); }
})();
