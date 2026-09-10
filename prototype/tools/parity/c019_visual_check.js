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
      const enemy={id:'c019-target',name:'C019',side:'p2',lane:'front',atk:3,hp:30,maxHp:30,color:'黒',keywords:[],desc:'',_panelSummoned:true};
      const fireTarget={id:'e058-target',name:'E058',side:'p2',lane:'front',atk:3,hp:30,maxHp:30,color:'黒',keywords:[],desc:'',_panelSummoned:true};
      G.allies=[centaur]; G.enemies=[fireTarget,enemy];
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const source=document.querySelector('.slot[data-unit-id="c019-source"]');
      const target=document.querySelector('.slot[data-unit-id="c019-target"]');
      const fire=document.querySelector('.slot[data-unit-id="e058-target"]');
      const r=target.getBoundingClientRect(),fr=fire.getBoundingClientRect();
      [[r,'red'],[fr,'cyan']].forEach(([box,color])=>{ const cross=document.createElement('div');
        cross.style.cssText='position:fixed;z-index:999999;pointer-events:none;width:20px;height:20px;border:2px solid '+color+';border-radius:50%;transform:translate(-50%,-50%);left:'+(box.left+box.width/2)+'px;top:'+(box.top+box.height/2)+'px'; document.body.appendChild(cross); });
      window.__c019VisualPromise=playCurvedMissile({sourceElement:source,targetElement:target,
        asset:'assets/vfx/C019_1.webp',scale:.125,code:'C019',straight:true,flightMs:800,cleanupDelayMs:1200});
      window.__e058VisualPromise=playCurvedMissile({sourceElement:source,targetElement:fire,
        asset:'assets/vfx/E058_1.webp',scale:.125,code:'E058',straight:true,flightMs:800,cleanupDelayMs:1200});
      return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height,
        fire:{x:fr.left+fr.width/2,y:fr.top+fr.height/2,w:fr.width,h:fr.height}};
    `);
    await sleep(1050);
    const shot=await browser.screenshot(OUT);
    const probe=await browser.eval(`
      const host=document.querySelector('img[src*="C019_1.webp"]')?.parentElement;
      const r=host&&host.getBoundingClientRect();
      const fire=document.querySelector('img[src*="E058_1.webp"]')?.parentElement;
      const f=fire&&fire.getBoundingClientRect();
      return r?{x:r.left+r.width/2,y:r.top+r.height/2,fire:f?{x:f.left+f.width/2,y:f.top+f.height/2}:null}:null;
    `);
    if(!probe) throw new Error('C019の飛行中DOMが取得できない');
    // cleanupDelayMs中なので、ここは正確な終点。
    const distance=Math.hypot(probe.x-target.x,probe.y-target.y);
    if(distance>=target.w) throw new Error(`C019終点が離れすぎ: ${distance.toFixed(1)}px`);
    if(!probe.fire) throw new Error('炎の矢の比較DOMが取得できない');
    const fireDistance=Math.hypot(probe.fire.x-target.fire.x,probe.fire.y-target.fire.y);
    console.log(`OK C019終点 ${distance.toFixed(1)}px / E058終点 ${fireDistance.toFixed(1)}px: ${shot}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exitCode=1; });
