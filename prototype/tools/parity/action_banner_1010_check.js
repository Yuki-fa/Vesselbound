'use strict';
// 2026-10-10：左右の行動バナーを実画面で測る。基準位置・30px・方向・削除・上限・既存の尺。
const assert = require('node:assert/strict'), path = require('node:path'), vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { launch } = require('./headless');
const ROOT = path.resolve(__dirname, '../..');
const pageScript = `
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  document.getElementById('scr-battle').classList.add('active');
  G.phase='battle';G._battlePhaseRunning=true;window.VB_OPTION_SPEED='normal';
  initializeBattlePresentationState();
  const results=[],check=(name,ok,detail)=>results.push({name,ok:!!ok,detail});
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const frame=()=>new Promise(r=>requestAnimationFrame(r));
  const c=ACTION_BANNER_CONFIG;
  check('30pxと方向が設定値',c.stackGap===30&&c.stackDirection.p2===1&&c.stackDirection.p1===-1,c);
  check('既存のフェードと倍速非表示設定',c.fadeInMs===100&&c.fadeOutMs===400&&c.noVfxHoldMs===700&&c.hideAtSpeed===2,c);
  function show(side,n) {
    const original=PANEL_POOL.find(card=>card.name==='アラッサス')||PANEL_POOL[0];
    const card={...original,name:'バナー'+n,no:'check-'+side+'-'+n};
    const token=_actionBannerToken({side,kind:'character',card},false);
    token.users=1;_actionBannerShow(token);return token;
  }
  function visible(token) {
    if(!token.el||!token.el.isConnected)return false;
    const style=getComputedStyle(token.el),r=token.el.getBoundingClientRect();
    const label=token.el.querySelector('.action-banner-name'),text=getComputedStyle(label);
    return r.width>0&&r.height>0&&style.visibility!=='hidden'&&Number(style.opacity)>.95
      &&label.textContent===token.source.card.name&&text.color==='rgb(255, 255, 255)'&&text.visibility!=='hidden';
  }
  for(const side of ['p2','p1']) {
    actionBannerClear(true);
    const tokens=[0,1,2].map(n=>show(side,n));await wait(150);await frame();
    const root=document.getElementById('battle-action-banners'),bounds=root.getBoundingClientRect();
    const scale=bounds.height/root.clientHeight;
    const rects=tokens.map(t=>t.el.getBoundingClientRect());
    check(side+' 3本とも文字が実際に見える',tokens.every(visible),rects);
    check(side+' 1本目が基本位置',Math.abs((rects[0].top-bounds.top)/scale-(side==='p2'?c.enemyY:c.allyY))<.5,rects[0].top);
    for(let i=1;i<rects.length;i++) {
      const gap=side==='p2'?(rects[i].top-rects[i-1].bottom)/scale:(rects[i-1].top-rects[i].bottom)/scale;
      check(side+' '+(i+1)+'本目は前の端から30px',Math.abs(gap-30)<.5,gap);
    }
    const heldTops=tokens.slice(1).map(t=>t.el.getBoundingClientRect().top);
    tokens[0].users=0;const fadedAt=performance.now();_actionBannerFade(tokens[0]);
    await wait(100);
    check(side+' フェード中は位置を予約する',tokens[0].el.isConnected&&_actionBannerSides[side].includes(tokens[0]));
    await wait(360);await frame();
    check(side+' フェード後に先頭を除去',!tokens[0].el.isConnected&&performance.now()-fadedAt>=c.fadeOutMs);
    check(side+' 残りを詰めず、ちらつきを防ぐ',tokens.slice(1).every((t,i)=>Math.abs(t.el.getBoundingClientRect().top-heldTops[i])<.5));
    const added=show(side,3);await wait(150);
    check(side+' 空いた基本位置を次の帯が使う',added.stackIndex===0&&visible(added));
    check(side+' 同じ発動元の再通知は帯を増やさない',_actionBannerToken(added.source,false)===added&&_actionBannerSides[side].length===3);

    actionBannerClear(true);
    const many=Array.from({length:30},(_,i)=>show(side,i));await wait(150);
    const shown=many.filter(t=>t.el),rootHeight=root.clientHeight;
    const expected=Array.from({length:30},(_,i)=>(side==='p2'?c.enemyY:c.allyY)+c.stackDirection[side]*i*(c.height+c.stackGap))
      .filter(top=>top>=0&&top+c.height<=rootHeight).length;
    check(side+' はみ出す新しい帯だけ省略',shown.length===expected&&many.slice(expected).every(t=>t.suppressed&&!t.el),{shown:shown.length,expected});
    check(side+' 既存の帯を縮めず画面内へ収める',shown.every(t=>{
      const top=parseFloat(t.el.style.top);return top>=0&&top+c.height<=rootHeight&&getComputedStyle(t.el).height===c.height+'px';
    }));
    actionBannerHold();shown.forEach(t=>{t.users=0;_actionBannerFade(t);});await wait(450);
    check(side+' 終戦から進むボタンの準備まで保持する',shown.every(visible));
    actionBannerReleaseHold();await wait(460);
    check(side+' 進むボタン準備時に全て消える',shown.every(t=>!t.el.isConnected)&&_actionBannerSides[side].length===0);
  }
  for(const speed of ['x2','x3']) {
    actionBannerClear(true);window.VB_OPTION_SPEED=speed;
    const token=show('p1',0);await frame();
    check(speed+' hideAtSpeedを維持',!token.el&&document.querySelectorAll('.action-banner[data-occupied]').length===0);
  }
  actionBannerClear(true);
  return results;
`;
new vm.Script('(async()=>{'+pageScript+'})()');
async function main() {
  const b=await launch();
  try {
    await b.call('Emulation.setDeviceMetricsOverride',{width:1860,height:1180,deviceScaleFactor:1,mobile:false});
    await b.goto(process.env.VB_URL||pathToFileURL(path.join(ROOT,'index.html')).href);
    await b.waitFor("typeof _actionBannerToken==='function'&&PANEL_POOL.length>0");
    const results=await b.eval(pageScript);
    results.forEach(r=>console.log((r.ok?'OK ':'NG ')+r.name+(r.ok?'':' '+JSON.stringify(r.detail))));
    assert.ok(results.length>=25&&results.every(r=>r.ok),'行動バナー1010の検査');
  } finally { await b.close(); }
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={pageScript};
