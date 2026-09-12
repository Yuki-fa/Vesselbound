'use strict';

const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const SHOT=process.env.VB_GAMEOVER_BOARD_SHOT||'/tmp/vb-gameover-board-hidden.png';

(async()=>{
  const browser=await launch({width:1920,height:1080});
  try{
    await browser.goto(URL,1800);
    const result=await browser.eval(`
      startGame(true);
      await new Promise(r=>setTimeout(r,1000));
      G.phase=null; goToReward();
      await new Promise(r=>setTimeout(r,500));
      const unit=_getPartyBoardUnit();
      const enchant=PANEL_POOL.find(c=>c.panelScope==='unit'&&['強化','エンチャント'].includes(String(c.category||'')));
      const character=PANEL_POOL.find(c=>String(c.category||'')==='キャラクター');
      const prep=c=>typeof _preparePanelCard==='function'?_preparePanelCard(c):({...c});
      G.mainBoard=new Array(15).fill(null);
      G.mainBoard[0]=prep(enchant);
      G.mainBoard[1]=prep(character);
      unit.equipment=G.mainBoard;
      G.phase='gameover';
      renderGameOverBoard();
      document.body.classList.remove('reward-screen-active','right-card-peek','game-clear-active');
      document.body.classList.add('gameover-active');
      document.getElementById('scr-gameover').classList.add('active','gameover-overlay-active');
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const host=document.querySelector('#gameover-board-grid #hand-slots.unit-equip-slots');
      const card=i=>host.querySelector('[data-equip-idx="'+i+'"]');
      const style=e=>{ if(!e) return null; const s=getComputedStyle(e); return {
        display:s.display,visibility:s.visibility,opacity:s.opacity,border:s.borderTopWidth,
        background:s.backgroundImage,z:s.zIndex
      }; };
      const read=()=>{
        const e=card(0),c=card(1);
        return {
          enchant:{card:style(e),frame:style(e?.querySelector('.character-frame-layer')),after:style(e,'::after')},
          character:{card:style(c),frame:style(c?.querySelector('.character-frame-layer')),
            boundary:style(c?.querySelector('.map-boundary-layer')),after:style(c,'::after')}
        };
      };
      const visible=read();
      toggleBoardCardVisibility();
      await new Promise(r=>requestAnimationFrame(r));
      const hiddenGameOver=read();
      G.phase='clear'; document.body.classList.add('game-clear-active');
      await new Promise(r=>requestAnimationFrame(r));
      const hiddenClear=read();
      return {visible,hiddenGameOver,hiddenClear,peek:document.body.classList.contains('right-card-peek')};
    `);
    await browser.screenshot(SHOT);
    const failures=[];
    const check=(ok,msg)=>{ if(!ok) failures.push(msg); };
    check(result.visible.character.boundary?.border==='5px','ゲームオーバー画面の特殊マス境界が5pxでない');
    check(result.visible.enchant.frame?.background.includes('enchantment.svg'),'ゲームオーバー画面のエンチャント枠がない');
    for(const [name,state] of [['ゲームオーバー',result.hiddenGameOver],['クリア',result.hiddenClear]]){
      check(state.enchant.frame?.display==='none'&&state.enchant.frame.visibility==='hidden'&&state.enchant.frame.opacity==='0',
        name+'画面の非表示でエンチャント枠が残る');
      check(state.character.frame?.display==='none'&&state.character.frame.visibility==='hidden'&&state.character.frame.opacity==='0',
        name+'画面の非表示でキャラクター枠が残る');
      check(state.character.boundary?.display==='block'&&state.character.boundary.visibility==='visible'&&
        state.character.boundary.opacity==='1'&&state.character.boundary.border==='5px',
        name+'画面の非表示で特殊マス5px境界が保たれない');
    }
    if(failures.length) throw new Error(failures.join('\n')+'\n'+JSON.stringify(result));
    console.log('OK ゲームオーバー／クリア魔導板表示: '+JSON.stringify(result)+'\nshot='+SHOT);
  }finally{ await browser.close(); }
})().catch(e=>{ console.error(e.stack||e); process.exitCode=1; });
