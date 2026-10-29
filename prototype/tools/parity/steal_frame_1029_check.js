'use strict';
// 2026-10-29 利用者報告：「敵を奪うと枠がボスのものになる（終戦時に元に戻る）」。
// 手番の再生中は見た目の姿を手番の前の写し（battleFxShownForm）で描く。奪われる前の写しには
// 「敵の枠を使う」印（_useEnemyVisualFrame）が無く、味方側へ移った瞬間に自軍キャラ扱いでボス枠（enemy_frame_m）になっていた。
// 通常戦闘でサキュバスを倒させ、奪った体の枠が最初から最後まで敵の枠（enemy_frame.svg）であることを見る。
// 実行：node tools/parity/steal_frame_1029_check.js（既定 http://127.0.0.1:5500、VB_URL で変更）
const assert = require('node:assert/strict');
const { launch } = require('./headless');
const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
(async () => {
  const b = await launch();
  try {
    let checked = 0;
    for (let run = 0; run < 3; run++) {
      // 回ごとに保存領域を空にして読み込み直す（前の回のランを持ち越さない）。
      await b.goto(URL); await b.eval('try{localStorage.clear();}catch(_){}'); await b.goto(URL);
      await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20&&typeof startGame==="function"', 30000);
      await b.eval('window.alert=()=>{};_prepareStoryArrival=()=>null;startGame(false);');
      await b.waitFor('!!document.querySelector("#scr-village.active")&&!G._villageIntroPlaying', 30000);
      await b.eval(`G.mainBoard=Array(15).fill(null);
        const s=makePanel('サキュバス');s.power=1;s.life=1;G.mainBoard[1]=s;
        ['ゴーレム','コボルド'].forEach((n,i)=>{const c=makePanel(n);c.power=1;c.life=40;c.desc='';c.keywords=[];G.mainBoard[[3,10][i]]=c;});
        G._wave=2;window.__stealFrames=[];
        const tick=()=>{const u=(G.allies||[]).find(a=>a&&a._stolen);
          if(u){const slot=document.querySelector('#f-ally .slot[data-unit-id="'+u.id+'"]');
            const f=slot?String(slot.style.getPropertyValue('--unit-frame')||''):'';if(f)window.__stealFrames.push(f);}
          if(!window.__stealDone)requestAnimationFrame(tick);};
        requestAnimationFrame(tick);_startWaveBattle(2);`);
      await b.waitFor('(window.__stealFrames.length>0&&(G.phase==="reward"||!document.querySelector("#scr-battle.active")))', 120000)
        .catch(async () => { if (!(await b.eval('return window.__stealFrames.length'))) throw new Error('奪う場面が来なかった'); });
      const frames = await b.eval('window.__stealDone=true;return [...new Set(window.__stealFrames)];');
      assert.ok(frames.length && frames.every(f => /enemy_frame\.svg/.test(f)), frames.join(' / '));
      checked++; console.log(`OK ${run + 1}回目：奪った体の枠は最初から敵の枠（${frames.length}種）`);
    }
    console.log(`奪った体の枠1029：${checked}項目 OK`);
  } finally { await b.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
