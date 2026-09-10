'use strict';
const {launch,sleep}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const OUT=process.env.VB_C019_SHOT||'/tmp/vesselbound-c019-check.png';

(async()=>{
  const browser=await launch({width:1600,height:1000});
  try{
    await browser.goto(URL);
    await browser.waitFor('typeof playCurvedMissile==="function"&&typeof renderField==="function"',20000);
    const target=await browser.eval(`
      startGame(true);
      await new Promise(resolve=>setTimeout(resolve,1400));
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-title').style.setProperty('display','none','important');
      document.getElementById('scr-battle').classList.add('active');
      document.body.className='';
      const centaur={id:'c019-source',name:'ケンタウロス',side:'p1',lane:'front',atk:3,hp:9,maxHp:9,color:'赤',keywords:[],desc:'',_panelSummoned:true};
      const enemy={id:'c019-target',name:'着弾中心',side:'p2',lane:'front',atk:3,hp:30,maxHp:30,color:'黒',keywords:[],desc:'',_panelSummoned:true};
      G.allies=[centaur]; G.enemies=[enemy];
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const source=document.querySelector('.slot[data-unit-id="c019-source"]');
      const target=document.querySelector('.slot[data-unit-id="c019-target"]');
      const r=target.getBoundingClientRect();
      window.__c019VisualPromise=playCurvedMissile({sourceElement:source,targetElement:target,
        asset:'assets/vfx/C019_1.webp',scale:.125,code:'C019',straight:true,flightMs:4000});
      return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
    `);
    await sleep(3500);
    const shot=await browser.screenshot(OUT);
    const probe=await browser.eval(`
      const host=document.querySelector('.effect-sustain-host');
      const r=host&&host.getBoundingClientRect();
      return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;
    `);
    if(!probe) throw new Error('C019の飛行中DOMが取得できない');
    // 3500/4000では終点の直前。対象中心までカード幅未満に収まることを保証する。
    const distance=Math.hypot(probe.x-target.x,probe.y-target.y);
    if(distance>=target.w) throw new Error(`C019終点が離れすぎ: ${distance.toFixed(1)}px`);
    console.log(`OK C019着弾直前の中心距離 ${distance.toFixed(1)}px: ${shot}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exitCode=1; });
