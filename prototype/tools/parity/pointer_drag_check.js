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
      const moved=G.mainBoard[0];
      const resetBoard=async()=>{
        G.mainBoard=new Array(15).fill(null);
        G.mainBoard[0]=moved;
        unit.boardCards=G.mainBoard;
        renderHandEditor();
        await frame();
      };

      // 1. 魔導板のカードを空きマスへ動かす
      const d1=await dragTo(boardCell(0),boardCell(2));
      out.boardMove={during:d1,from:G.mainBoard[0]===null,to:G.mainBoard[2]===moved,
        afterClass:document.documentElement.classList.contains('pointer-dragging'),afterSrc:_dragSrc};

      // 2. ボタンを離した状態の pointermove が先に届いても、その位置で落とす。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from), [x1,y1]=center(to);
        send('pointerdown',x0,y0,1); send('pointermove',x1,y1,1);
        send('pointermove',x1,y1,0); send('pointerup',x1,y1,0);
        out.buttonsReleasedMove=G.mainBoard[2]===moved;
      }

      // 3. 直前に光っていたマスのすぐ外（隙間）でも、そのマスへ落とす。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from);
        const r=to.getBoundingClientRect();
        const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
        const next=boardCell(3).getBoundingClientRect();
        let x,y;
        if(next.left>r.right){ x=(r.right+next.left)/2; y=r.top+r.height/2; }
        else { x=r.left+r.width/2; y=r.top-6*scale; }
        send('pointerdown',x0,y0,1); send('pointermove',r.left+r.width/2,r.top+r.height/2,1);
        send('pointerup',x,y,0);
        out.gapBoardMove=G.mainBoard[2]===moved;
      }

      // 4. 直前のマスから遠く離した時は、救済せず置かない。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from), [x1,y1]=center(to);
        send('pointerdown',x0,y0,1); send('pointermove',x1,y1,1); send('pointerup',5,5,0);
        out.farReleaseNoMove=G.mainBoard[0]===moved&&G.mainBoard[2]===null;
      }

      // 4b. 光ったマスを離れて時間が経ってから隙間で離した時は、救済せず置かない（大きな置き先の近くで誤って落とさない）。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from);
        const r=to.getBoundingClientRect();
        const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
        const next=boardCell(3).getBoundingClientRect();
        let x,y;
        if(next.left>r.right){ x=(r.right+next.left)/2; y=r.top+r.height/2; }
        else { x=r.left+r.width/2; y=r.top-6*scale; }
        send('pointerdown',x0,y0,1); send('pointermove',r.left+r.width/2,r.top+r.height/2,1);
        send('pointermove',x,y,1);
        await wait(400);
        send('pointerup',x,y,0);
        out.lateGapNoMove=G.mainBoard[0]===moved&&G.mainBoard[2]===null;
      }

      // 5. ドラッグ中はポインタを捕まえ、終了時に解放する。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from), [x1,y1]=center(to);
        send('pointerdown',x0,y0,1); send('pointermove',x1,y1,1);
        out.pointerCaptureDuring=document.documentElement.hasPointerCapture(1);
        send('pointerup',x1,y1,0);
        out.pointerCaptureAfter=document.documentElement.hasPointerCapture(1);
        out.pointerCaptureUnsupported=!out.pointerCaptureDuring;
      }

      // 6. 最後の pointermove を待たず、pointerup の位置へ置く。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from), [x1,y1]=center(to);
        send('pointerdown',x0,y0,1); send('pointermove',x1,y1,1); send('pointerup',x1,y1,0);
        out.quickBoardMove=G.mainBoard[2]===moved;
      }

      // 7. 最後の pointermove が手前でも、離した位置へ置く。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from), [x1,y1]=center(to);
        send('pointerdown',x0,y0,1); send('pointermove',x0+20,y0,1); send('pointerup',x1,y1,0);
        out.releasePositionMove=G.mainBoard[2]===moved;
      }

      // 8. 描き直しで古い置き先が消えても、離した位置へ入り直す。
      await resetBoard();
      {
        const from=boardCell(0), to=boardCell(2), [x0,y0]=center(from), [x1,y1]=center(to);
        send('pointerdown',x0,y0,1); send('pointermove',x1,y1,1);
        renderHandEditor(); await frame();
        send('pointerup',x1,y1,0);
        out.rerenderedBoardMove=G.mainBoard[2]===moved;
      }

      // 9. 離した直後のクリックは握りつぶされる（誤ってボタンや説明が動かない）
      let clicked=0; const probe=boardCell(2); const onClick=()=>clicked++;
      probe.addEventListener('click',onClick);
      probe.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      await new Promise(r=>setTimeout(r,450));
      probe.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
      probe.removeEventListener('click',onClick);
      out.clickGuard={firstSwallowed:clicked===1};

      // 10. 4px未満の移動はドラッグにしない（クリックのまま）
      renderHandEditor(); await frame();
      const card=boardCell(2); const [cx,cy]=center(card);
      let started=false; const onStart=()=>{ started=true; };
      document.addEventListener('dragstart',onStart,true);
      send('pointerdown',cx,cy,1); send('pointermove',cx+2,cy+1,1); send('pointerup',cx+2,cy+1,0);
      document.removeEventListener('dragstart',onStart,true);
      out.threshold={noDrag:!started&&G.mainBoard[2]===moved};

      // 11. 報酬カードを魔導板の空きマスへ
      renderRewCards(); await frame();
      const rew=document.querySelector('#reward-offer-row .rew-card');
      const rewCard=_rewCards[0];
      await dragTo(rew,boardCell(4));
      out.rewardToBoard={placed:G.mainBoard.some((c,i)=>i!==2&&c&&(c===rewCard||c.id===rewCard.id))};

      // 12. アイテム枠同士の入れ替え
      _syncRewardProductionUi(); await frame();
      const slots=[...document.querySelectorAll('.reward-prod-item .reward-prod-slots i')];
      const a=G.spellSlots[0], b=G.spellSlots[1];
      if(slots.length>=2) await dragTo(slots[0],slots[1]);
      out.itemSwap={swapped:G.spellSlots[0]===b&&G.spellSlots[1]===a};

      // 13. 対象選択中はドラッグを始めない
      renderHandEditor(); await frame();
      const before=G.mainBoard.slice();
      G._pendingItemUse={slotIdx:0,card:{name:'x'}};
      await dragTo(boardCell(2),boardCell(5));
      G._pendingItemUse=null;
      out.pendingBlocks={unchanged:G.mainBoard.every((c,i)=>c===before[i])};

      // 14. 掴めるカードでは標準ドラッグを始めさせない
      renderHandEditor(); await frame();
      out.nativeDragOff={userDrag:getComputedStyle(boardCell(2)).webkitUserDrag};
      return out;
    `);
    const checks=[
      ['魔導板のカードが空きマスへ移動する',result.boardMove.from&&result.boardMove.to],
      ['1回だけ動かしてすぐ離しても置ける',result.quickBoardMove],
      ['最後の移動が手前でも離した位置のマスに置ける',result.releasePositionMove],
      ['光った後に魔導板が描き直されても離せば置ける',result.rerenderedBoardMove],
      ['ドラッグ中はcursor4のカーソルになる',result.boardMove.during&&result.boardMove.during.dragging&&result.boardMove.during.cursor],
      ['離した後にドラッグの印と_dragSrcが残らない',!result.boardMove.afterClass&&!result.boardMove.afterSrc],
      ['離した直後のクリックだけを握りつぶす',result.clickGuard.firstSwallowed],
      ['4px未満の移動はドラッグにしない',result.threshold.noDrag],
      ['ボタンを離した状態の移動が先に届いても置ける',result.buttonsReleasedMove],
      ['光ったマスのすぐ外（隙間）で離しても置ける',result.gapBoardMove],
      ['光ったマスから遠く離れた所で離すと置かない',result.farReleaseNoMove],
      ['光ったマスを離れて時間が経ってから隙間で離すと置かない',result.lateGapNoMove],
      ['ドラッグ中はポインタを捕まえ、離した後は解放する',
        (result.pointerCaptureDuring&& !result.pointerCaptureAfter)||result.pointerCaptureUnsupported],
      ['報酬カードを魔導板へ置ける',result.rewardToBoard.placed],
      ['アイテム枠同士を入れ替えられる',result.itemSwap.swapped],
      ['対象選択中はドラッグしない',result.pendingBlocks.unchanged],
      ['標準ドラッグは無効（-webkit-user-drag:none）',result.nativeDragOff.userDrag==='none'],
    ];
    let ng=0;
    checks.forEach(([name,ok])=>{ if(!ok) ng++; console.log(`${ok?'OK':'NG'}\t${name}`); });
    if(result.pointerCaptureUnsupported) console.log('  （合成イベント環境ではポインタ捕捉を確認できないためOK扱い）');
    if(ng) console.log(JSON.stringify(result));
    console.log(`マウス操作ドラッグ検証: NG ${ng}`);
    if(ng) process.exitCode=1;
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exit(1); });
