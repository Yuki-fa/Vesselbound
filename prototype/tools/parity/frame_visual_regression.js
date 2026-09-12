'use strict';

const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const ATTACK_SHOT=process.env.VB_ATTACK_SHOT||'/tmp/vb-attack-frame.png';
const DRAG_SHOT=process.env.VB_DRAG_SHOT||'/tmp/vb-drag-frame.png';

const near=(a,b,eps=.5)=>Math.abs(Number(a)-Number(b))<=eps;

(async()=>{
  const browser=await launch({width:1920,height:1080});
  try{
    await browser.goto(URL,2200);
    await browser.eval(`
      const root=document.getElementById('scr-battle');
      document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
      root.classList.add('active'); document.body.className='';
      const mk=(id,lane,slot)=>({id,name:id,lane,slot,atk:3,hp:50,maxHp:50,color:'赤',keywords:[],desc:'',_panelSummoned:true});
      G.enemies=new Array(14).fill(null); G.enemies[0]=mk('E1','front',0);
      G.allies=new Array(14).fill(null); G.allies[0]=mk('A1','front',0);
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(r=>requestAnimationFrame(r));
      const sourceFrame=document.querySelector('#f-ally .slot.unit-card .unit-frame-layer');
      window.__attackSourceFrame={
        border:parseFloat(getComputedStyle(sourceFrame).borderTopWidth)||0,
        gameScale:_gameScale()
      };
      beginBattleMotion();
      window.__frameMotion=playAttackMotion(G.allies[0],G.enemies[0],false,null,
        {stopRatio:.25,firstDuration:500,secondDuration:500,returnDuration:500});
      return true;
    `);
    await browser.eval(`await new Promise(r=>setTimeout(r,180)); return true;`);
    const attack=await browser.eval(`
      const clone=document.querySelector('.attack-motion-clone');
      const frame=clone&&clone.querySelector('.unit-frame-layer');
      const overlay=clone&&clone.querySelector('.unit-stat-overlay-layer');
      const read=e=>{ const s=getComputedStyle(e),r=e.getBoundingClientRect(); return {
        x:r.x,y:r.y,w:r.width,h:r.height,border:s.borderTopWidth,display:s.display,
        visibility:s.visibility,opacity:s.opacity,z:s.zIndex,background:s.backgroundImage
      }; };
      return {clone:read(clone),frame:read(frame),overlay:read(overlay),source:window.__attackSourceFrame};
    `);
    await browser.screenshot(ATTACK_SHOT);
    await browser.eval(`await window.__frameMotion; endBattleMotion(); return true;`);

    await browser.eval(`
      beginBattleMotion();
      window.__enemyFrameMotion=playAttackMotion(G.enemies[0],G.allies[0],true,null,
        {stopRatio:.25,firstDuration:500,secondDuration:500,returnDuration:500});
      return true;
    `);
    await browser.eval(`await new Promise(r=>setTimeout(r,180)); return true;`);
    const enemyAttack=await browser.eval(`
      const clone=document.querySelector('.attack-motion-clone');
      const frame=clone&&clone.querySelector('.unit-frame-layer');
      const overlay=clone&&clone.querySelector('.unit-stat-overlay-layer');
      const read=e=>{ const s=getComputedStyle(e),r=e.getBoundingClientRect(); return {
        w:r.width,h:r.height,border:s.borderTopWidth,display:s.display,
        visibility:s.visibility,opacity:s.opacity,z:s.zIndex,background:s.backgroundImage
      }; };
      return {frame:read(frame),overlay:read(overlay),source:window.__attackSourceFrame};
    `);
    await browser.eval(`await window.__enemyFrameMotion; endBattleMotion(); return true;`);

    await browser.eval(`
      G.phase=null; goToReward(); await new Promise(r=>setTimeout(r,600));
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-village').style.setProperty('display','none','important');
      const screen=document.getElementById('scr-battle'); screen.classList.add('active');
      screen.style.setProperty('display','block','important');
      document.body.className='reward-screen-active debug-mode shop-screen-active';
      G._isShop=true; G._debugMode=true; G.phase='reward';
      const unit=_getPartyBoardUnit();
      const characterDef=PANEL_POOL.find(c=>String(c.category||'')==='キャラクター');
      const prepare=c=>typeof _preparePanelCard==='function'?_preparePanelCard(c):({...c,directions:['up','right']});
      G.mainBoard=new Array(15).fill(null); G.mainBoard[1]=prepare(characterDef); unit.equipment=G.mainBoard;
      renderHandEditor(); _syncRewardProductionUi();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const card=document.querySelector('#hand-slots [data-equip-idx="1"]');
      const r=card.getBoundingClientRect();
      card.dispatchEvent(new DragEvent('dragstart',{bubbles:true,cancelable:true,
        dataTransfer:new DataTransfer(),clientX:r.x+r.width/2,clientY:r.y+r.height/2}));
      _moveDragGhost(r.x+r.width*1.75,r.y+r.height*.75);
      return true;
    `);
    await browser.eval(`await new Promise(r=>requestAnimationFrame(r)); return true;`);
    const drag=await browser.eval(`
      const ghost=document.querySelector('.drag-ghost');
      const frame=ghost&&ghost.querySelector('.character-frame-layer');
      const art=ghost&&ghost.querySelector('.card-art');
      const read=e=>{ const s=getComputedStyle(e),r=e.getBoundingClientRect(); return {
        x:r.x,y:r.y,w:r.width,h:r.height,border:s.borderTopWidth,display:s.display,
        visibility:s.visibility,opacity:s.opacity,z:s.zIndex,background:s.backgroundImage
      }; };
      const empty=document.querySelector('#hand-slots .card-empty[data-map-board]');
      const es=getComputedStyle(empty);
      document.body.classList.add('right-card-peek');
      const source=document.querySelector('#hand-slots [data-equip-idx="1"]');
      const hiddenFrame=source.querySelector('.character-frame-layer');
      const hiddenStyle=getComputedStyle(hiddenFrame);
      return {ghost:read(ghost),frame:read(frame),art:read(art),
        empty:{backgroundOrigin:es.backgroundOrigin,border:es.borderTopWidth},
        hidden:{display:hiddenStyle.display,visibility:hiddenStyle.visibility,opacity:hiddenStyle.opacity}};
    `);
    await browser.screenshot(DRAG_SHOT);

    const failures=[];
    const check=(ok,msg)=>{if(!ok) failures.push(msg);};
    // 0.92px等の端数線幅はChromeのcomputed styleで1pxへ量子化される。
    check(near(parseFloat(attack.frame.border),attack.source.border*attack.source.gameScale,.15),
      '攻撃複製の枠線が通常カードと同じ実表示幅でない');
    check(attack.frame.background!=='none','攻撃複製の枠画像がない');
    check(attack.overlay.background.includes('stat_overlay.png'),'stat_overlay.pngが攻撃複製にない');
    check(attack.overlay.display!=='none'&&attack.overlay.visibility==='visible'&&attack.overlay.opacity==='1',
      'stat_overlay.pngが攻撃複製で非表示');
    check(near(attack.frame.w,attack.overlay.w)&&near(attack.frame.h,attack.overlay.h),
      'stat_overlay.pngと枠画像の実寸が不一致');
    check(near(parseFloat(enemyAttack.frame.border),enemyAttack.source.border*enemyAttack.source.gameScale,.15),
      '敵側の攻撃複製の枠線が通常カードと同じ実表示幅でない');
    check(enemyAttack.frame.background!=='none'&&enemyAttack.overlay.background.includes('stat_overlay.png'),
      '敵側の攻撃複製で枠画像またはstat_overlay.pngが消える');
    check(enemyAttack.overlay.display!=='none'&&enemyAttack.overlay.visibility==='visible'&&enemyAttack.overlay.opacity==='1',
      '敵側の攻撃複製でstat_overlay.pngが非表示');
    check(near(parseFloat(drag.frame.border),attack.source.border*attack.source.gameScale,.15)&&drag.frame.background!=='none',
      'ドラッグカードの枠線が通常カードと同じ実表示幅でない、または枠画像がない');
    check(drag.frame.display!=='none'&&drag.frame.visibility==='visible'&&drag.frame.opacity==='1',
      'ドラッグカードの枠が非表示');
    check(near(drag.ghost.w,drag.frame.w)&&near(drag.ghost.h,drag.frame.h),
      'ドラッグカードと枠画像の実寸が不一致');
    check(drag.empty.backgroundOrigin==='border-box'&&drag.empty.border==='5px',
      '特殊マスのSVGと5px線が同じ外寸でない');
    check(drag.hidden.display==='none'&&drag.hidden.visibility==='hidden'&&drag.hidden.opacity==='0',
      'カード非表示中にキャラクター枠が残る');
    if(failures.length) throw new Error(`${failures.join('\n')}\nattack=${JSON.stringify(attack)}\ndrag=${JSON.stringify(drag)}`);
    console.log(`OK 枠のブラウザ表示検査\nattack=${JSON.stringify(attack)}\nenemyAttack=${JSON.stringify(enemyAttack)}\ndrag=${JSON.stringify(drag)}\nshots=${ATTACK_SHOT},${DRAG_SHOT}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
