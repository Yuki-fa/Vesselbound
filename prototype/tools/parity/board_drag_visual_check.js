'use strict';

const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const DRAG_SHOT=process.env.VB_BOARD_DRAG_SHOT||'/tmp/vb-board-reward-drag.png';
const USED_REWARD_SHOT=process.env.VB_USED_REWARD_SHOT||'/tmp/vb-reward-used-dim.png';

const near=(a,b,eps=.25)=>Math.abs(Number(a)-Number(b))<=eps;

(async()=>{
  const browser=await launch({width:1920,height:1080});
  try{
    await browser.goto(URL,1800);
    const result=await browser.eval(`
      startGame(true);
      await new Promise(r=>setTimeout(r,1200));
      G.phase=null;
      goToReward();
      await new Promise(r=>setTimeout(r,700));
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-village').style.setProperty('display','none','important');
      const screen=document.getElementById('scr-battle');
      screen.classList.add('active');
      screen.style.setProperty('display','block','important');
      document.body.className='reward-screen-active debug-mode shop-screen-active';
      G._isShop=true;
      G._debugMode=true;
      G.phase='reward';

      const unit=_getPartyBoardUnit();
      const enchantDef=PANEL_POOL.find(c=>c.panelScope==='unit'&&
        ['強化','エンチャント'].includes(String(c.category||''))&&Array.isArray(c.directions)&&c.directions.length)
        ||PANEL_POOL.find(c=>c.panelScope==='unit'&&['強化','エンチャント'].includes(String(c.category||'')));
      const characterDef=PANEL_POOL.find(c=>String(c.category||'')==='キャラクター');
      const prepare=c=>typeof _preparePanelCard==='function'
        ?_preparePanelCard(c):({...c,directions:['up','right']});
      G.mainBoard=new Array(15).fill(null);
      G.mainBoard[0]=prepare(enchantDef);
      G.mainBoard[0].directions=['up','right'];
      G.mainBoard[1]=prepare(characterDef);
      G.mainBoard[0]._sellDisplayPrice=40;
      G.mainBoard[1]._sellDisplayPrice=40;
      unit.equipment=G.mainBoard;
      renderHandEditor();
      _syncRewardProductionUi();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

      const host=document.getElementById('hand-slots');
      const card=i=>host.querySelector('[data-equip-idx="'+i+'"]');
      const style=e=>e?{
        display:getComputedStyle(e).display,
        visibility:getComputedStyle(e).visibility,
        opacity:getComputedStyle(e).opacity,
        border:getComputedStyle(e).borderTopWidth,
        filter:getComputedStyle(e).filter,
        z:getComputedStyle(e).zIndex,
        background:getComputedStyle(e).backgroundImage,
        backgroundColor:getComputedStyle(e).backgroundColor
      }:null;
      const rect=e=>{
        const r=e.getBoundingClientRect();
        return {x:r.x,y:r.y,w:r.width,h:r.height};
      };
      const centered=e=>{
        if(!e) return null;
        const r=e.getBoundingClientRect();
        const range=document.createRange();
        range.selectNodeContents(e);
        const t=range.getBoundingClientRect();
        return {
          dx:(t.x+t.width/2)-(r.x+r.width/2),
          dy:(t.y+t.height/2)-(r.y+r.height/2)
        };
      };
      const dragStart=e=>e.dispatchEvent(new DragEvent('dragstart',{
        bubbles:true,cancelable:true,dataTransfer:new DataTransfer(),
        clientX:rect(e).x+10,clientY:rect(e).y+10
      }));
      const dragEnd=e=>e.dispatchEvent(new DragEvent('dragend',{
        bubbles:true,cancelable:true,dataTransfer:new DataTransfer()
      }));

      const enchant=card(0);
      if(!enchant) throw new Error('通常マスの検証カードが描画されていない: '+host.innerHTML.slice(0,1200));
      dragStart(enchant);
      const enchantGhostInitial=document.querySelector('.drag-ghost');
      const enchantInitialOpacity=getComputedStyle(enchantGhostInitial).opacity;
      const enchantRect=rect(enchant);
      _moveDragGhost(enchantRect.x+enchantRect.w*1.5,enchantRect.y+enchantRect.h*.5);
      await new Promise(r=>requestAnimationFrame(r));
      const enchantGhost=document.querySelector('.drag-ghost');
      const enchantGhostArrow=enchantGhost?.querySelector('.panel-dir');
      const enchantGhostFrame=enchantGhost?.querySelector('.character-frame-layer');
      const enchantDrag={
        initialOpacity:enchantInitialOpacity,
        ghostOpacity:getComputedStyle(enchantGhost).opacity,
        sourceFrame:style(enchant.querySelector('.character-frame-layer')),
        sourceBoard:style(enchant.querySelector('.board-frame-layer')),
        ghostFrame:style(enchantGhostFrame),
        ghostArrow:style(enchantGhostArrow),
        ghostBoard:style(enchantGhost?.querySelector('.board-frame-layer')),
        ghostBoundary:style(enchantGhost?.querySelector('.map-boundary-layer'))
      };
      dragEnd(enchant);
      await new Promise(r=>setTimeout(r,30));

      const special=card(1);
      if(!special) throw new Error('特殊マスの検証カードが描画されていない: '+host.innerHTML.slice(0,1200));
      const specialRectBefore=rect(special);
      dragStart(special);
      await new Promise(r=>requestAnimationFrame(r));
      const characterGhost=document.querySelector('.drag-ghost');
      const sourceBoundary=special.querySelector('.map-boundary-layer');
      const specialDrag={
        sourceFrame:style(special.querySelector('.character-frame-layer')),
        sourceBoard:style(special.querySelector('.board-frame-layer')),
        sourceBoundary:style(sourceBoundary),
        sourceBoundaryRect:rect(sourceBoundary),
        ghostFrame:style(characterGhost?.querySelector('.character-frame-layer')),
        ghostOverlay:style(characterGhost?.querySelector('.unit-stat-overlay-layer')),
        ghostFrameRect:rect(characterGhost?.querySelector('.character-frame-layer')),
        ghostOverlayRect:rect(characterGhost?.querySelector('.unit-stat-overlay-layer')),
        ghostBoundary:style(characterGhost?.querySelector('.map-boundary-layer'))
      };
      dropOnCard('unitEquip',2);
      _removeDragGhost();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

      const emptySpecial=host.querySelector('.card-empty[data-map-board]');
      const emptyState={
        style:style(emptySpecial),
        outline:getComputedStyle(emptySpecial).outlineStyle,
        shadow:getComputedStyle(emptySpecial).boxShadow,
        rect:rect(emptySpecial)
      };

      const moved=card(2);
      dragStart(moved);
      await new Promise(r=>requestAnimationFrame(r));
      dropOnCard('unitEquip',1);
      _removeDragGhost();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

      const placed=card(1);
      const placedBoundary=placed.querySelector('.map-boundary-layer');
      const placedState={
        cardRect:rect(placed),
        boundary:style(placedBoundary),
        boundaryRect:rect(placedBoundary)
      };
      const normal=card(0);
      const normalPrice=normal.querySelector('.shop-board-sell-value');
      const specialPrice=placed.querySelector('.shop-board-sell-value');
      const pricing={
        normal:{
          frame:style(normal.querySelector('.character-frame-layer')),
          price:style(normalPrice),
          line:style(normal.querySelector('.board-frame-layer')),
          center:centered(normalPrice)
        },
        special:{
          frame:style(placed.querySelector('.character-frame-layer')),
          price:style(specialPrice),
          line:style(placedBoundary),
          center:centered(specialPrice)
        }
      };

      // 通常マスへ置いた出撃不可キャラクターは、カード枠画像まで暗転する一方、
      // 独立した2pxのマス枠は明るいまま残ることを確認する。
      _removeDragGhost(); _clearDragZoneClass();
      G.mainBoard[2]=prepare(characterDef);
      const invalidPeerIdx=Array.from({length:15},(_,i)=>i).find(i=>i!==2&&
        (typeof mapPanelPowerIdAt!=='function'||!mapPanelPowerIdAt(i)));
      G.mainBoard[invalidPeerIdx]=prepare(characterDef);
      unit.equipment=G.mainBoard;
      renderHandEditor();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const invalidCard=card(2);
      const invalidNormal={
        className:invalidCard?.className||'',
        card:style(invalidCard),
        frame:style(invalidCard?.querySelector('.character-frame-layer')),
        overlay:style(invalidCard?.querySelector('.unit-stat-overlay-layer')),
        back:style(invalidCard?.querySelector('.card-back-layer')),
        line:style(invalidCard?.querySelector('.board-frame-layer'))
      };
      dragStart(invalidCard);
      const invalidRect=rect(invalidCard);
      _moveDragGhost(invalidRect.x+invalidRect.w*1.5,invalidRect.y+invalidRect.h*.5);
      await new Promise(r=>requestAnimationFrame(r));
      const invalidGhost=document.querySelector('.drag-ghost');
      const invalidPeer=card(invalidPeerIdx);
      const invalidDrag={
        frame:style(invalidGhost?.querySelector('.character-frame-layer')),
        overlay:style(invalidGhost?.querySelector('.unit-stat-overlay-layer')),
        back:style(invalidGhost?.querySelector('.card-back-layer')),
        dim:style(invalidGhost?.querySelector('.drag-card-dim-layer')),
        peerClassName:invalidPeer?.className||'',
        peerOverlay:style(invalidPeer?.querySelector('.unit-stat-overlay-layer'))
      };
      dragEnd(invalidCard); _removeDragGhost(); _clearDragZoneClass();

      // 報酬枠の強化カードは枠を疑似要素で持つ。ドラッグ複製では実レイヤーへ
      // 移され、arrowより後ろに残ることを確認する。
      _rewCards=[prepare(enchantDef)];
      _rewCards[0].directions=['up','right'];
      G._isShop=false;
      G._ringOfferPhase=false;
      G._isVillageMenu=false;
      G._isForge=false;
      renderRewCards();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const rewardCard=document.querySelector('#battle-order-row .rew-card');
      if(!rewardCard) throw new Error('報酬枠の検証カードが描画されていない');
      const rewardRect=rect(rewardCard);
      dragStart(rewardCard);
      const rewardGhostInitial=document.querySelector('.drag-ghost');
      const rewardInitialOpacity=getComputedStyle(rewardGhostInitial).opacity;
      _moveDragGhost(rewardRect.x+rewardRect.w*.5,rewardRect.y+rewardRect.h*1.5);
      await new Promise(r=>requestAnimationFrame(r));
      const rewardGhost=document.querySelector('.drag-ghost');
      const rewardFrame=rewardGhost?.querySelector('.character-frame-layer');
      const rewardLine=rewardGhost?.querySelector('.reward-card-line-layer');
      const rewardArrow=rewardGhost?.querySelector('.panel-dir');
      const rewardDrag={
        card:{name:_rewCards[0]?.name,category:_rewCards[0]?.category,isChar:!!_rewCards[0]?._isChar,
          className:rewardCard.className,frameVar:getComputedStyle(rewardCard).getPropertyValue('--card-frame')},
        initialOpacity:rewardInitialOpacity,
        ghostOpacity:getComputedStyle(rewardGhost).opacity,
        ghostRect:rect(rewardGhost),
        frame:style(rewardFrame),
        frameRect:rect(rewardFrame),
        line:style(rewardLine),
        arrow:style(rewardArrow)
      };
      dragEnd(rewardCard);
      _removeDragGhost(); _clearDragZoneClass();

      // 購入不可の報酬カードにも同じ黒いm_board6背面があることを確認する。
      G._isShop=true; G._isRewardTown=true; G._freeRewardPanelMode=false; G.gold=0;
      const darkEnchant={...prepare(enchantDef),_buyPrice:999999,directions:['up','right']};
      const darkCharacter={...prepare(characterDef),_buyPrice:999999,directions:['up','right','down','left']};
      _rewCards=[darkEnchant,darkCharacter];
      renderRewCards();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const darkRewardCard=document.querySelector('.rew-card.cant');
      const darkRewardCharacter=document.querySelectorAll('.rew-card.cant')[1];
      const darkReward={
        className:darkRewardCard?.className||'',
        card:style(darkRewardCard),
        back:style(darkRewardCard?.querySelector('.card-back-layer')),
        dim:style(darkRewardCard?.querySelector('.reward-card-dim-layer')),
        line:style(darkRewardCard?.querySelector('.reward-card-line-layer')),
        shade:style(darkRewardCard),
        frame:{filter:getComputedStyle(darkRewardCard,'::after').filter,
          opacity:getComputedStyle(darkRewardCard,'::after').opacity,
          background:getComputedStyle(darkRewardCard,'::after').backgroundImage},
        characterStats:Array.from(darkRewardCharacter?.querySelectorAll('.card-summon-atk,.card-summon-hp,.stat-atk,.stat-hp')||[]).map(style),
        characterArrows:Array.from(darkRewardCharacter?.querySelectorAll(':scope > .panel-dir,:scope > .panel-dir-up,:scope > .panel-dir-right,:scope > .panel-dir-down,:scope > .panel-dir-left')||[]).map(style),
        characterDim:style(darkRewardCharacter?.querySelector('.reward-card-dim-layer')),
        characterLine:style(darkRewardCharacter?.querySelector('.reward-card-line-layer'))
      };
      _createDragGhost(darkRewardCard);
      const darkRect=rect(darkRewardCard);
      _moveDragGhost(darkRect.x+darkRect.w*1.5,darkRect.y+darkRect.h*.5);
      await new Promise(r=>requestAnimationFrame(r));
      const darkGhost=document.querySelector('.drag-ghost');
      const darkRewardDrag={
        back:style(darkGhost?.querySelector('.card-back-layer')),
        dim:style(darkGhost?.querySelector('.reward-card-dim-layer,.drag-card-dim-layer')),
        frame:style(darkGhost?.querySelector('.character-frame-layer'))
      };
      _removeDragGhost();
      // 魔導板カードのドラッグ中は、報酬枠全体を暗転オーバーレイの下に残す。
      dragStart(invalidCard);
      _moveDragGhost(invalidRect.x+invalidRect.w*1.5,invalidRect.y+invalidRect.h*.5);
      await new Promise(r=>requestAnimationFrame(r));
      const dragOverlay=document.getElementById('mainequip-drag-overlay');
      const rewardSection=document.getElementById('battle-order-section');
      const rewardAreaDuringDrag={
        bodyClass:document.body.className,
        overlay:style(dragOverlay),
        section:style(rewardSection),
        sectionZ:getComputedStyle(rewardSection).zIndex,
        overlayZ:getComputedStyle(dragOverlay).zIndex,
        darkCard:style(darkRewardCard),
        darkFrame:{filter:getComputedStyle(darkRewardCard,'::after').filter,
          opacity:getComputedStyle(darkRewardCard,'::after').opacity},
        darkDim:style(darkRewardCard?.querySelector('.reward-card-dim-layer')),
        darkLine:style(darkRewardCard?.querySelector('.reward-card-line-layer'))
      };
      const backSvg=await fetch('assets/cards/m_board6.svg?v=blackBack02').then(r=>r.text());
      return {gameScale:_gameScale(),enchantDrag,specialRectBefore,specialDrag,emptyState,placedState,pricing,invalidNormal,invalidDrag,rewardDrag,darkReward,darkRewardDrag,rewardAreaDuringDrag,backSvgBlack:/fill:\\s*#000000/i.test(backSvg)};
    `);
    await browser.screenshot(DRAG_SHOT);
    await browser.eval(`
      const draggingCard=document.querySelector('.card.dragging,.rew-card.dragging');
      if(draggingCard) draggingCard.dispatchEvent(new DragEvent('dragend',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}));
      if(typeof _removeDragGhost==='function') _removeDragGhost();
      if(typeof _clearDragZoneClass==='function') _clearDragZoneClass();
      return true;
    `);
    const hoverTargets=await browser.eval(`
      G._isShop=false; G._isRewardTown=false; G._freeRewardPanelMode=true;
      const hoverDef=PANEL_POOL.find(c=>c.panelScope==='unit'&&['強化','エンチャント'].includes(String(c.category||'')));
      _rewCards=[_preparePanelCard(hoverDef)];
      renderRewCards();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const box=e=>{ const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; };
      return {board:box(document.querySelector('#hand-slots.unit-equip-slots > .card')),
        reward:box(document.querySelector('#battle-order-row > .rew-card'))};
    `);
    await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:hoverTargets.board.x,y:hoverTargets.board.y});
    await new Promise(r=>setTimeout(r,260));
    const boardHover=await browser.eval(`{
      const el=document.querySelector('#hand-slots.unit-equip-slots > .card');
      return {shadow:getComputedStyle(el).boxShadow,hovered:el.matches(':hover')};
    }`);
    await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:hoverTargets.reward.x,y:hoverTargets.reward.y});
    await new Promise(r=>setTimeout(r,260));
    const rewardHover=await browser.eval(`{
      const el=document.querySelector('#battle-order-row > .rew-card');
      return {shadow:getComputedStyle(el).boxShadow,hovered:el.matches(':hover')};
    }`);
    result.hover={board:hoverTargets.board,reward:hoverTargets.reward,boardShadow:boardHover,rewardShadow:rewardHover};
    result.usedReward=await browser.eval(`{
      G._isShop=false; G._isRewardTown=false; G._freeRewardPanelMode=false;
      G._rewardOnePickMode=true;
      _rewFreePickDone=true;
      const usedDef=PANEL_POOL.find(c=>c.panelScope==='unit'&&['強化','エンチャント'].includes(String(c.category||'')));
      const used=_preparePanelCard(usedDef);
      used._isOriginalReward=true;
      _rewCards=[used];
      renderRewCards();
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const card=document.querySelector('#battle-order-row > .rew-card');
      const back=card.querySelector(':scope > .card-back-layer');
      const dim=card.querySelector(':scope > .reward-card-dim-layer');
      const line=card.querySelector(':scope > .reward-card-line-layer');
      const pick=e=>e?{opacity:getComputedStyle(e).opacity,z:getComputedStyle(e).zIndex,
        background:getComputedStyle(e).backgroundImage,backgroundColor:getComputedStyle(e).backgroundColor}:null;
      return {className:card.className,card:pick(card),back:pick(back),dim:pick(dim),line:pick(line)};
    }`);
    await browser.screenshot(USED_REWARD_SHOT);

    const failures=[];
    const check=(ok,message)=>{ if(!ok) failures.push(message); };
    check(result.enchantDrag.sourceFrame.opacity==='0','エンチャント枠画像がドラッグ元に残る');
    check(result.enchantDrag.sourceBoard.opacity==='1'&&result.enchantDrag.sourceBoard.filter==='none',
      '通常マスのドラッグ元枠が暗い');
    check(near(parseFloat(result.enchantDrag.ghostFrame.border),2*result.gameScale,.15)&&result.enchantDrag.ghostFrame.opacity==='1',
      'エンチャントのドラッグ枠が通常表示と同じ実表示幅ではない');
    check(result.enchantDrag.initialOpacity==='0'&&result.enchantDrag.ghostOpacity==='1',
      'ドラッグ複製が座標確定前に左上へ表示される');
    check(!result.enchantDrag.ghostArrow||Number(result.enchantDrag.ghostArrow.z)>Number(result.enchantDrag.ghostFrame.z),
      'エンチャントのarrowが枠画像より後ろにある');
    check(result.enchantDrag.ghostBoard.display==='none','ゴーストにマス枠が残る');
    check(result.specialDrag.sourceFrame.opacity==='0','特殊マスのドラッグ元にカード枠画像が残る');
    check(result.specialDrag.sourceBoundary.border==='5px'&&result.specialDrag.sourceBoundary.filter==='none',
      '特殊マスのドラッグ元境界が5px・明表示ではない');
    check(near(parseFloat(result.specialDrag.ghostFrame.border),2*result.gameScale,.15),
      '特殊マス由来のゴースト枠が通常表示と同じ実表示幅ではない');
    check(result.specialDrag.ghostOverlay&&result.specialDrag.ghostOverlay.background.includes('stat_overlay.png')&&
      result.specialDrag.ghostOverlay.display!=='none'&&result.specialDrag.ghostOverlay.opacity==='1',
      'キャラクタードラッグ複製のstat_overlay.pngが表示されない');
    check(Number(result.specialDrag.ghostOverlay.z)>Number(result.specialDrag.ghostFrame.z),
      'キャラクタードラッグ複製のstat_overlay.pngが枠画像より下にある');
    for(const key of ['x','y','w','h']) check(near(result.specialDrag.ghostFrameRect[key],result.specialDrag.ghostOverlayRect[key]),
      `キャラクタードラッグ複製のstat_overlay.pngと枠画像の${key}が不一致`);
    check(result.specialDrag.ghostBoundary.display==='none','ゴーストに特殊マス境界が付いている');
    check(result.emptyState.style.border==='5px'&&result.emptyState.outline==='none'&&result.emptyState.shadow==='none',
      '空の特殊マス境界が占有時と同じ5px内側線ではない');
    check(result.placedState.boundary.border==='5px','再配置後の特殊マス境界が5pxではない');
    for(const key of ['x','y','w','h']){
      check(near(result.specialRectBefore[key],result.emptyState.rect[key]),`特殊マス空化で${key}が変化`);
      check(near(result.emptyState.rect[key],result.placedState.cardRect[key]),`特殊マス再配置で${key}が変化`);
      check(near(result.placedState.cardRect[key],result.placedState.boundaryRect[key]),`特殊マス境界の${key}がカード外へずれる`);
    }
    for(const place of ['normal','special']){
      const p=result.pricing[place];
      check(Number(p.frame.z)<Number(p.price.z)&&Number(p.price.z)<Number(p.line.z),
        `${place}の価格が枠画像とプログラム枠の間にない`);
      check(Math.abs(p.center.dx)<.1&&Math.abs(p.center.dy)<1,
        `${place}の価格文字がラベル中央にない`);
    }
    check(result.invalidNormal.className.includes('invalid-battle-position'),
      '通常マスのキャラクターに出撃不可状態が付かない');
    check(result.invalidNormal.frame.filter!=='none'&&result.invalidNormal.frame.filter.includes('brightness(0.5)'),
      '通常マスのキャラクター枠画像が暗転していない');
    check(result.invalidNormal.overlay&&result.invalidNormal.overlay.filter.includes('brightness(0.5)'),
      '通常マスのキャラクターstat_overlay.pngが暗転していない');
    check(result.invalidDrag.overlay&&result.invalidDrag.overlay.filter==='none'&&!result.invalidDrag.dim,
      '掴んだ暗い魔導板カード自身が明るくならない');
    check(result.invalidDrag.peerOverlay&&result.invalidDrag.peerOverlay.filter.includes('brightness(0.5)'),
      '別カードのドラッグ中に、他の暗い魔導板カードのstat_overlay.pngが明るくなる');
    check(result.invalidNormal.line.filter==='none'&&result.invalidNormal.line.border==='2px',
      '通常マスのプログラム枠線まで暗転または太さ変更されている');
    check(result.invalidNormal.back&&result.invalidNormal.back.background.includes('m_board6.svg'),
      '魔導板カードの最背面にm_board6.svgがない');
    check(result.invalidNormal.card&&result.invalidNormal.card.background.includes('m_board6.svg'),
      '魔導板カード本体の最背面背景にm_board6.svgがない');
    check(result.rewardDrag.initialOpacity==='0'&&result.rewardDrag.ghostOpacity==='1',
      '報酬カードのドラッグ複製が座標確定前に表示される');
    check(result.rewardDrag.frame&&result.rewardDrag.frame.display!=='none'&&
      result.rewardDrag.frame.visibility==='visible'&&result.rewardDrag.frame.opacity==='1'&&
      result.rewardDrag.frame.background.includes('enchantment.svg')&&
      result.rewardDrag.line&&near(parseFloat(result.rewardDrag.line.border),2*result.gameScale,.15),
      '報酬カードのドラッグ枠画像または枠線が消える');
    check(near(result.rewardDrag.ghostRect.w,result.rewardDrag.frameRect.w)&&
      near(result.rewardDrag.ghostRect.h,result.rewardDrag.frameRect.h),
      '報酬カードのドラッグ枠がカード実寸と一致しない');
    check(result.rewardDrag.arrow&&Number(result.rewardDrag.arrow.z)>Number(result.rewardDrag.frame.z),
      '報酬カードのarrowが枠画像より後ろにある');
    check(result.darkReward.className.includes('cant')&&result.darkReward.back&&
      result.darkReward.back.background.includes('m_board6.svg'),
      '暗い報酬カードの最背面にm_board6.svgがない');
    check(result.darkReward.card&&result.darkReward.card.background.includes('m_board6.svg'),
      '報酬カード本体の最背面背景にm_board6.svgがない');
    check(result.darkReward.frame.filter==='none'&&result.darkReward.frame.opacity==='1'&&
      result.darkReward.frame.background!=='none',
      '暗い報酬カードの枠画像が欠けている');
    check(result.darkReward.card.opacity==='1'&&result.darkReward.back.opacity==='1'&&
      result.darkReward.card.backgroundColor==='rgb(0, 0, 0)'&&
      result.darkReward.dim&&result.darkReward.dim.backgroundColor.includes('0.5'),
      '暗い報酬カードの黒背面が不透明でない、または専用暗転層がない');
    check(result.darkReward.line&&result.darkReward.line.filter==='none'&&result.darkReward.line.opacity==='1'&&
      Number(result.darkReward.dim.z)>Number(result.darkReward.line.z),
      '暗い報酬カードのプログラム枠線が暗転層より前にある');
    check(result.darkReward.characterArrows.length>0&&result.darkReward.characterArrows.every(a=>
      Number(a.z)>Number(result.darkReward.dim.z)&&a.filter.includes('brightness(0.5)')),
      '暗い報酬カードのarrow全体が均一に暗転していない');
    check(result.darkReward.characterStats.length>=2&&result.darkReward.characterStats.every(s=>
      Number(result.darkReward.characterDim.z)>Number(s.z))&&
      Number(result.darkReward.characterDim.z)>Number(result.darkReward.characterLine.z),
      '暗い報酬キャラクターのATK/HPまたは枠線が明るいまま残る');
    check(result.darkRewardDrag.dim&&result.darkRewardDrag.dim.opacity==='1'&&
      result.darkRewardDrag.back&&result.darkRewardDrag.back.background.includes('m_board6.svg'),
      '暗い報酬カードがドラッグ中に明るくなる、または黒背面が消える');
    check(result.rewardAreaDuringDrag.bodyClass.includes('dragzone-mainequip')&&
      result.rewardAreaDuringDrag.overlay.display!=='none'&&
      Number(result.rewardAreaDuringDrag.sectionZ)>Number(result.rewardAreaDuringDrag.overlayZ)&&
      result.rewardAreaDuringDrag.darkCard.opacity==='1'&&
      result.rewardAreaDuringDrag.darkDim.opacity==='1'&&
      Number(result.rewardAreaDuringDrag.darkDim.z)>Number(result.rewardAreaDuringDrag.darkLine.z)&&
      result.rewardAreaDuringDrag.darkLine.filter==='none',
      'カードドラッグ中に報酬カード本来の明暗が維持されない');
    check(result.backSvgBlack,'m_board6.svgの塗りが黒ではない');
    check(result.usedReward.className.includes('reward-used-dim')&&
      result.usedReward.card.opacity==='1'&&result.usedReward.back.opacity==='1'&&
      result.usedReward.back.background.includes('m_board6.svg')&&
      result.usedReward.back.backgroundColor==='rgb(0, 0, 0)'&&
      result.usedReward.dim&&result.usedReward.dim.backgroundColor.includes('0.5')&&
      Number(result.usedReward.dim.z)>Number(result.usedReward.line.z),
      '取得済み報酬カードが不透明な黒背面を保ったまま暗転しない');
    check(result.hover.boardShadow.hovered&&result.hover.rewardShadow.hovered&&
      result.hover.boardShadow.shadow!=='none'&&
      result.hover.boardShadow.shadow===result.hover.rewardShadow.shadow,
      '魔導板カードのホバー発光が報酬カードと一致しない');
    if(failures.length) throw new Error(`${failures.join('\n')}\n${JSON.stringify(result)}`);
    console.log(`OK 魔導板ドラッグ実操作: ${JSON.stringify(result)}\nshots=${DRAG_SHOT},${USED_REWARD_SHOT}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{
  console.error(e.stack||e);
  process.exitCode=1;
});
