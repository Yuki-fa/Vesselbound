'use strict';

const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const SHOT=process.env.VB_TRIPLE_FRAME_SHOT||'/tmp/vb-triple-merge-frame.png';

(async()=>{
  const browser=await launch({width:1920,height:1080});
  try{
    await browser.goto(URL,1800);
    const result=await browser.eval(`
      startGame(true);
      await new Promise(r=>setTimeout(r,900));
      G.phase=null; goToReward();
      await new Promise(r=>setTimeout(r,650));
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-village').style.setProperty('display','none','important');
      const screen=document.getElementById('scr-battle');
      screen.classList.add('active'); screen.style.setProperty('display','block','important');
      document.body.className='reward-screen-active debug-mode shop-screen-active';
      G.phase='reward'; G._debugMode=true; G._isShop=true;
      const unit=_getPartyBoardUnit();
      const def=PANEL_POOL.find(c=>c.panelScope==='unit'&&
        ['強化','エンチャント'].includes(String(c.category||''))&&!_isMagicMirrorPanel(c));
      if(!def) throw new Error('合体検証用エンチャントがない');
      const prep=()=>{ const c=_preparePanelCard(def); c.directions=['up','right']; c._sellDisplayPrice=40; return c; };
      G.mainBoard=new Array(15).fill(null);
      G.mainBoard[0]=prep(); G.mainBoard[2]=prep(); G.mainBoard[3]=prep();
      unit.equipment=G.mainBoard;
      renderHandEditor();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const source=document.querySelector('#hand-slots [data-equip-idx="3"]');
      const sourceHadPrice=!!source.querySelector('.shop-board-sell-value');
      const r=source.getBoundingClientRect();
      source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,
        dataTransfer:new DataTransfer(),clientX:r.x+10,clientY:r.y+10}));
      const sourceFrame=source.querySelector('.character-frame-layer');
      const hiddenBefore=getComputedStyle(sourceFrame).opacity;
      const info=_tryTripleMergeOnBoard(unit,3);
      if(!info) throw new Error('トリプル合体が成立しない');
      let connectionFlashCalls=0;
      const originalConnectionFlash=_flashConnectedBoardCards;
      window._flashConnectedBoardCards=(...args)=>{ connectionFlashCalls++; return originalConnectionFlash(...args); };
      renderHandEditor();
      _playTripleMergeAnimation(info);
      await new Promise(r=>setTimeout(r,520));
      const ghosts=[...document.querySelectorAll('.triple-merge-ghost-card.enchantment-card')];
      const rows=ghosts.map(card=>{
        const frame=card.querySelector('.character-frame-layer');
        const arrow=card.querySelector('.panel-dir');
        const s=getComputedStyle(frame), cr=card.getBoundingClientRect(), fr=frame.getBoundingClientRect();
        return {display:s.display,visibility:s.visibility,opacity:s.opacity,z:s.zIndex,
          border:s.borderTopWidth,background:s.backgroundImage,
          arrow:arrow?{z:getComputedStyle(arrow).zIndex,background:getComputedStyle(arrow).backgroundImage}:null,
          card:{w:cr.width,h:cr.height},frame:{w:fr.width,h:fr.height}};
      });
      const ghostHasPrice=ghosts.some(card=>!!card.querySelector('.shop-board-sell-value,.shop-buy-price,.shop-pending-sale-ui'));
      await new Promise(r=>setTimeout(r,2200));
      window._flashConnectedBoardCards=originalConnectionFlash;
      return {hiddenBefore,sourceHadPrice,ghostHasPrice,count:ghosts.length,rows,connectionFlashCalls,
        activeConnectionEffects:document.querySelectorAll('.panel-connect-flash,.panel-connect-flash-clip').length};
    `);
    await browser.screenshot(SHOT);
    const failures=[];
    if(result.hiddenBefore!=='0') failures.push('実操作でドラッグ元の枠が非表示になっていない');
    if(!result.sourceHadPrice) failures.push('合体前カードに売却価格がなく検証できない');
    if(result.ghostHasPrice) failures.push('トリプル合体演出に売却価格が残る');
    if(result.connectionFlashCalls!==0||result.activeConnectionEffects!==0) failures.push('トリプル合体後に接続エフェクトが出る');
    if(result.count!==3) failures.push(`合体ゴーストが3枚でない: ${result.count}`);
    result.rows.forEach((row,i)=>{
      if(row.display==='none'||row.visibility!=='visible'||row.opacity!=='1') failures.push(`${i+1}枚目の合体枠が非表示`);
      if(!row.background.includes('enchantment.svg')) failures.push(`${i+1}枚目の合体枠画像がない`);
      if(row.border!=='2px') failures.push(`${i+1}枚目の合体枠線が2pxでない: ${row.border}`);
      if(row.arrow&&Number(row.arrow.z)<=Number(row.z)) failures.push(`${i+1}枚目のarrowが枠画像より下にある`);
      if(Math.abs(row.card.w-row.frame.w)>.5||Math.abs(row.card.h-row.frame.h)>.5) failures.push(`${i+1}枚目の合体枠がカード実寸と不一致`);
    });
    if(failures.length) throw new Error(`${failures.join('\n')}\n${JSON.stringify(result)}`);
    console.log(`OK エンチャント合体枠のブラウザ表示検査 ${JSON.stringify(result)}\nshot=${SHOT}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e.stack||e); process.exitCode=1; });
