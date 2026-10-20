'use strict';
// 2026-10-21 利用者報告：蝕界の塔から出発して踏破（ステージ4で終わり）になった時、結果画面の「続ける」が押せなかった。
// 「出発する」の保存中に掛ける入力止め（SaveRun.lockInput＝body.inert）が、次の戦闘も村も通らないので残っていた。
// 入力止めが掛かった状態から踏破画面（1周目／2周目以降）を出し、本物のクリックで「続ける」→タイトルへ戻れることを見る。
// 実行：node tools/parity/clear_continue_1021_check.js（既定 http://127.0.0.1:5500、VB_URL で変更）
const assert = require('node:assert/strict');
const { launch } = require('./headless');
const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
(async () => {
  const b = await launch();
  let checked = 0;
  try {
    await b.goto(URL); await b.waitFor('typeof SaveRun!=="undefined"&&PANEL_POOL.length>20&&typeof gameOver==="function"', 20000);
    await b.eval('window.alert=()=>{};_prepareStoryArrival=()=>null;startGame(false);');
    await b.waitFor('!!document.querySelector("#scr-village.active")&&!G._villageIntroPlaying', 20000);
    for (const first of [true, false]) {
      await b.eval(`SaveRun.lockInput(true);Object.assign(G,{_wave:4,_waveStage:6});gameOver({clear:true,firstRunClear:${first}});`);
      await b.waitFor('!document.body.classList.contains("gameover-ui-pending")', 20000);
      await new Promise(r => setTimeout(r, 1500));
      const pos = await b.eval(`const r=document.getElementById('gameover-continue-btn').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,document.body.inert];`);
      assert.equal(pos[2], false, '結果画面では入力止めが外れている');
      await b.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos[0], y: pos[1], button: 'left', clickCount: 1 });
      await b.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos[0], y: pos[1], button: 'left', clickCount: 1 });
      await b.waitFor('!!document.querySelector("#scr-title.active")&&!document.body.classList.contains("gameover-active")', 10000);
      checked++; console.log(`OK 踏破（${first ? '1周目' : '2周目以降'}）：入力止めが残っていても「続ける」でタイトルへ戻る`);
      await b.eval('startGame(false);'); await b.waitFor('!!document.querySelector("#scr-village.active")&&!G._villageIntroPlaying', 20000);
    }
    console.log(`踏破の続ける1021：${checked}項目 OK`);
  } finally { await b.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
