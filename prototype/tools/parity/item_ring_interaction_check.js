'use strict';

const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';

(async()=>{
  const browser=await launch({width:1920,height:1080});
  try{
    await browser.goto(URL,2200);
    const result=await browser.eval(`
      startGame(true); await new Promise(r=>setTimeout(r,900));
      G.phase=null; goToReward(); await new Promise(r=>setTimeout(r,600));
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      const screen=document.getElementById('scr-battle'); screen.classList.add('active');
      screen.style.setProperty('display','block','important');
      document.body.className='reward-screen-active debug-mode';
      G.phase='reward'; G._debugMode=true;
      const item=clone(ITEM_POOL.find(x=>x&&_rewardItemArtPath(x))||ITEM_POOL[0]);
      const ring=clone(RING_POOL.find(x=>x&&_rewardRingArtPath(x))||RING_POOL[0]);
      G.spellSlots=[item,null,null,null];
      G.rings=[ring,null,null,null];
      _syncRewardProductionUi();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const itemSlots=[...document.querySelectorAll('.reward-prod-item .reward-prod-slots i')];
      const ringSlots=[...document.querySelectorAll('.reward-prod-ring .reward-prod-slots i')];
      const dragStart=el=>{ const r=el.getBoundingClientRect(); el.dispatchEvent(new DragEvent('dragstart',{
        bubbles:true,cancelable:true,dataTransfer:new DataTransfer(),clientX:r.x+r.width/2,clientY:r.y+r.height/2
      })); _moveDragGhost(r.x+r.width*1.5,r.y+r.height*.5); };
      const dragEnd=el=>el.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}));
      const pseudo=(el,kind)=>{ const s=getComputedStyle(el,kind),r=el.getBoundingClientRect(); return {
        content:s.content,display:s.display,opacity:s.opacity,background:s.backgroundImage,x:r.x,y:r.y
      }; };
      const state=el=>{ const s=getComputedStyle(el),r=el.getBoundingClientRect(); return {
        display:s.display,visibility:s.visibility,opacity:s.opacity,x:r.x,y:r.y,w:r.width,h:r.height
      }; };

      dragStart(itemSlots[0]); await new Promise(r=>requestAnimationFrame(r));
      const itemGhost=document.querySelector('.drag-ghost');
      const itemDrag={ghost:state(itemGhost),frame:pseudo(itemGhost,'::before'),art:pseudo(itemGhost,'::after'),
        sourceArt:pseudo(itemSlots[0],'::after')};
      dragEnd(itemSlots[0]); await new Promise(r=>requestAnimationFrame(r));

      dragStart(ringSlots[0]); await new Promise(r=>requestAnimationFrame(r));
      const ringGhost=document.querySelector('.drag-ghost');
      const ringDrag={ghost:state(ringGhost),frame:pseudo(ringGhost,'::before'),art:pseudo(ringGhost,'::after'),
        sourceArt:pseudo(ringSlots[0],'::after')};
      dragEnd(ringSlots[0]); await new Promise(r=>requestAnimationFrame(r));

      const tip=document.getElementById('kw-tooltip');
      const keyword=document.getElementById('keyword-tooltip');
      const opened=()=>tip.dataset.rewardLocked==='1'&&tip.style.display==='block';
      const closed=()=>({action:tip.style.display,locked:tip.dataset.rewardLocked||'',keyword:keyword.style.display,keywordHtml:keyword.innerHTML});
      const seedKeyword=()=>{ keyword.innerHTML='<b>キーワード</b>'; keyword.style.display='block'; };

      itemSlots[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      const emptyItemOpened=opened(); seedKeyword();
      itemSlots[1].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));
      itemSlots[1].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      const emptyItemClose=closed();

      ringSlots[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      const emptyRingOpened=opened(); seedKeyword();
      ringSlots[1].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));
      ringSlots[1].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      const emptyRingClose=closed();

      itemSlots[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      seedKeyword();
      document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0}));
      const outsideClose=closed();

      ringSlots[0].dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      seedKeyword();
      document.body.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));
      const rightClose=closed();
      return {itemDrag,ringDrag,emptyItemOpened,emptyItemClose,emptyRingOpened,emptyRingClose,outsideClose,rightClose};
    `);
    const failures=[];
    const check=(ok,msg)=>{if(!ok) failures.push(msg);};
    for(const [name,d] of [['item',result.itemDrag],['ring',result.ringDrag]]){
      check(d.ghost.display!=='none'&&d.ghost.visibility==='visible'&&d.ghost.opacity==='1',`${name}のゴーストが非表示`);
      check(d.frame.content!=='none'&&d.frame.display!=='none'&&d.frame.background!=='none',`${name}のゴースト枠がない`);
      check(d.art.content!=='none'&&d.art.display!=='none'&&d.art.background!=='none',`${name}のゴースト画像がない`);
      check(d.sourceArt.opacity==='0',`${name}の元画像がドラッグ中も残る`);
    }
    check(result.emptyItemOpened,'アイテムウインドウが開かない');
    check(result.emptyRingOpened,'指輪ウインドウが開かない');
    for(const [name,c] of [['空アイテム枠',result.emptyItemClose],['空指輪枠',result.emptyRingClose],
      ['外側',result.outsideClose],['右クリック',result.rightClose]]){
      check(c.action==='none'&&c.locked===''&&c.keyword==='none'&&c.keywordHtml==='',`${name}で説明が同時に閉じない: ${JSON.stringify(c)}`);
    }
    if(failures.length) throw new Error(`${failures.join('\n')}\n${JSON.stringify(result)}`);
    console.log(`OK アイテム／指輪のドラッグと説明閉じる操作: ${JSON.stringify(result)}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
