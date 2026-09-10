'use strict';
const {launch,sleep}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const OUT=process.env.VB_SHOP_UI_SHOT||'/tmp/vesselbound-shop-ui-check.png';

(async()=>{
  const browser=await launch({width:1600,height:1000});
  try{
    await browser.goto(URL);
    await browser.waitFor('typeof startGame==="function"&&typeof goToReward==="function"',20000);
    const metrics=await browser.eval(`
      startGame(true);
      await new Promise(resolve=>setTimeout(resolve,1400));
      G.phase=null;
      goToReward();
      await new Promise(resolve=>setTimeout(resolve,1000));
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-village').style.setProperty('display','none','important');
      document.getElementById('scr-battle').classList.add('active');
      document.getElementById('scr-battle').style.setProperty('display','block','important');
      document.body.className='reward-screen-active debug-mode';
      G._isShop=true; G._debugMode=true; G.phase='reward';
      renderHandEditor();
      const sale=document.querySelector('#hand-slots .shop-board-sell-btn');
      const cost=document.querySelector('#hand-slots .shop-board-sell-value');
      if(!sale||!cost) throw new Error('魔導板の売却UIが作られていない');
      sale.style.setProperty('display','flex','important');
      const card=sale.closest('.card');
      const tip=document.getElementById('kw-tooltip');
      tip.style.display='block'; tip.style.left='100px'; tip.style.top='470px';
      tip.innerHTML='<div class="preview-title">絆の巻物</div><div>ホバー中の説明</div>';
      const before=tip.getBoundingClientRect();
      _openRewardActionTooltip(card,'絆の巻物','同名のキャラクター2枚を選んでマージする。',[
        {label:'使う'},{label:'捨てる'},{label:'やめる'}
      ]);
      const after=tip.getBoundingClientRect();
      const hide=document.getElementById('board-card-visibility-btn');
      hide.style.setProperty('display','flex','important');
      const sr=sale.getBoundingClientRect(), cr=cost.getBoundingClientRect(), hr=hide.getBoundingClientRect();
      return {sale:{x:sr.x,y:sr.y,w:sr.width,h:sr.height,cssW:getComputedStyle(sale).width,cssH:getComputedStyle(sale).height},cost:{x:cr.x,y:cr.y,w:cr.width,h:cr.height,cssW:getComputedStyle(cost).width,cssH:getComputedStyle(cost).height},
        hide:{x:hr.x,y:hr.y,w:hr.width,h:hr.height},tipMove:{x:after.x-before.x,y:after.y-before.y}};
    `);
    if(Math.abs(metrics.tipMove.x)>.5||Math.abs(metrics.tipMove.y)>.5) throw new Error('クリック時にツールチップが動いた');
    if(metrics.sale.cssW!=='130px'||metrics.sale.cssH!=='51px') throw new Error(`売却ボタンの寸法が130x51ではない: ${JSON.stringify(metrics)}`);
    if(metrics.cost.cssW!=='101px'||metrics.cost.cssH!=='46px') throw new Error(`cost.svg表示の寸法が101x46ではない: ${JSON.stringify(metrics)}`);
    const shot=await browser.screenshot(OUT);
    console.log(`OK 商店UI実画面: ${shot}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exitCode=1; });
