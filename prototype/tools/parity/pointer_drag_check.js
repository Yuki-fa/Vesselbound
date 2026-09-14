'use strict';
// マウス操作（pointerdown／pointermove／pointerup）だけでドラッグが成立するかの検査。
// js/engine/pointer_drag.js がブラウザ標準ドラッグの代わりに dragstart〜dragend を組み立てる。
//   node tools/parity/pointer_drag_check.js
const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';

(async()=>{
  const browser=await launch({width:3840,height:2160});
  try{
    await browser.goto(URL);
    await browser.waitFor('typeof startGame==="function"&&typeof goToReward==="function"',20000);
    const result=await browser.eval(`
      const wait=ms=>new Promise(r=>setTimeout(r,ms));
      const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      startGame(true);
      await wait(1200);
      G.phase=null;
      goToReward();
      await wait(700);
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-village').style.setProperty('display','none','important');
      const screen=document.getElementById('scr-battle');
      screen.classList.add('active');
      screen.style.setProperty('display','block','important');
      document.body.className='reward-screen-active debug-mode shop-screen-active';
      G._isShop=true; G._debugMode=true; G.phase='reward'; G.gold=9999;

      const prepare=c=>typeof _preparePanelCard==='function'?_preparePanelCard(c):({...c});
      const enchantDef=PANEL_POOL.find(c=>c.panelScope==='unit'&&['強化','エンチャント'].includes(String(c.category||'')));
      const unit=_getPartyBoardUnit();
      G.mainBoard=new Array(15).fill(null);
      G.mainBoard[0]=prepare(enchantDef);
      unit.boardCards=G.mainBoard;
      _rewCards=[prepare(enchantDef)];
      G.spellSlots=[{no:'I002',name:'絆の巻物',rarity:1,desc:'a'},{no:'I003',name:'別の巻物',rarity:1,desc:'b'},null,null];
      renderHandEditor(); renderRewCards(); _syncRewardProductionUi();
      await frame();

      const center=el=>{ const r=el.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; };
      const send=(type,x,y,buttons)=>{
        const target=document.elementFromPoint(x,y)||document.body;
        target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,composed:true,pointerId:1,isPrimary:true,
          pointerType:'mouse',button:0,buttons,clientX:x,clientY:y}));
      };
      // 押す→少しずつ動かす→離す。途中の様子を during に返す。
      const dragTo=async(fromEl,toEl,opts={})=>{
        const [x0,y0]=center(fromEl), [x1,y1]=center(toEl);
        send('pointerdown',x0,y0,1);
        const steps=opts.steps||6;
        let during=null;
        for(let i=1;i<=steps;i++){
          const x=x0+(x1-x0)*i/steps, y=y0+(y1-y0)*i/steps;
          send('pointermove',x,y,1);
          if(i===Math.ceil(steps/2)) during={dragging:document.documentElement.classList.contains('pointer-dragging'),
            cursor:getComputedStyle(document.body).cursor.includes('cursor4.svg'),src:!!_dragSrc};
          await frame();
        }
        send('pointerup',x1,y1,0);
        await frame();
        return during;
      };
      const boardCell=i=>document.querySelector('#hand-slots.board-slots > :nth-child('+(i+1)+')');
      const out={};

      // 1. 魔導板のカードを空きマスへ動かす
      const moved=G.mainBoard[0];
      const d1=await dragTo(boardCell(0),boardCell(2));
      out.boardMove={during:d1,from:G.mainBoard[0]===null,to:G.mainBoard[2]===moved,
        afterClass:document.documentElement.classList.contains('pointer-dragging'),afterSrc:_dragSrc};

      // 2. 離した直後のクリックは握りつぶされる（誤ってボタンや説明が動かない）
      let clicked=0; const probe=boardCell(2); const onClick=()=>clicked++;
      probe.addEventListener('click',onClick);
      probe.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      await new Promise(r=>setTimeout(r,450));
      probe.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      probe.removeEventListener('click',onClick);
      out.clickGuard={firstSwallowed:clicked===1};

      // 3. 4px未満の移動はドラッグにしない（クリックのまま）
      renderHandEditor(); await frame();
      const card=boardCell(2); const [cx,cy]=center(card);
      let started=false; const onStart=()=>{ started=true; };
      document.addEventListener('dragstart',onStart,true);
      send('pointerdown',cx,cy,1); send('pointermove',cx+2,cy+1,1); send('pointerup',cx+2,cy+1,0);
      document.removeEventListener('dragstart',onStart,true);
      out.threshold={noDrag:!started&&G.mainBoard[2]===moved};

      // 4. 報酬カードを魔導板の空きマスへ
      renderRewCards(); await frame();
      const rew=document.querySelector('#reward-offer-row .rew-card');
      const rewCard=_rewCards[0];
      await dragTo(rew,boardCell(4));
      out.rewardToBoard={placed:G.mainBoard.some((c,i)=>i!==2&&c&&(c===rewCard||c.id===rewCard.id))};

      // 5. アイテム枠同士の入れ替え
      _syncRewardProductionUi(); await frame();
      const slots=[...document.querySelectorAll('.reward-prod-item .reward-prod-slots i')];
      const a=G.spellSlots[0], b=G.spellSlots[1];
      if(slots.length>=2) await dragTo(slots[0],slots[1]);
      out.itemSwap={swapped:G.spellSlots[0]===b&&G.spellSlots[1]===a};

      // 6. 対象選択中はドラッグを始めない
      renderHandEditor(); await frame();
      const before=G.mainBoard.slice();
      G._pendingItemUse={slotIdx:0,card:{name:'x'}};
      await dragTo(boardCell(2),boardCell(5));
      G._pendingItemUse=null;
      out.pendingBlocks={unchanged:G.mainBoard.every((c,i)=>c===before[i])};

      // 7. 掴めるカードでは標準ドラッグを始めさせない
      renderHandEditor(); await frame();
      out.nativeDragOff={userDrag:getComputedStyle(boardCell(2)).webkitUserDrag};
      return out;
    `);
    const checks=[
      ['魔導板のカードが空きマスへ移動する',result.boardMove.from&&result.boardMove.to],
      ['ドラッグ中はcursor4のカーソルになる',result.boardMove.during&&result.boardMove.during.dragging&&result.boardMove.during.cursor],
      ['離した後にドラッグの印と_dragSrcが残らない',!result.boardMove.afterClass&&!result.boardMove.afterSrc],
      ['離した直後のクリックだけを握りつぶす',result.clickGuard.firstSwallowed],
      ['4px未満の移動はドラッグにしない',result.threshold.noDrag],
      ['報酬カードを魔導板へ置ける',result.rewardToBoard.placed],
      ['アイテム枠同士を入れ替えられる',result.itemSwap.swapped],
      ['対象選択中はドラッグしない',result.pendingBlocks.unchanged],
      ['標準ドラッグは無効（-webkit-user-drag:none）',result.nativeDragOff.userDrag==='none'],
    ];
    let ng=0;
    checks.forEach(([name,ok])=>{ if(!ok) ng++; console.log(`${ok?'OK':'NG'}\t${name}`); });
    if(ng) console.log(JSON.stringify(result));
    console.log(`マウス操作ドラッグ検証: NG ${ng}`);
    if(ng) process.exitCode=1;
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exit(1); });
