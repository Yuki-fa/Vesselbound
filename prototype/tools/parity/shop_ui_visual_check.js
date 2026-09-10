'use strict';
const {launch,sleep}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const OUT=process.env.VB_SHOP_UI_SHOT||'/tmp/vesselbound-shop-ui-check.png';

(async()=>{
  // デザイン座標(3840x2160)と同じ等倍で、線幅と文字の見切れを目視確認する。
  const browser=await launch({width:3840,height:2160});
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
      G.spellSlots=[{no:'I002',name:'絆の巻物',rarity:1,desc:'同名のキャラクター2枚を選んでマージする。'},null,null,null];
      renderHandEditor();
      _syncRewardProductionUi();
      const sale=document.querySelector('#hand-slots .shop-board-sell-btn');
      const cost=document.querySelector('#hand-slots .shop-board-sell-value');
      if(!sale||!cost) throw new Error('魔導板の売却UIが作られていない');
      sale.style.setProperty('display','flex','important');
      const card=sale.closest('.card');
      const tip=document.getElementById('kw-tooltip');
      tip.style.display='block'; tip.style.left='100px'; tip.style.top='470px';
      tip.className='rarity-3';
      tip.innerHTML='<div class="preview-title">絆の巻物</div><div class="hover-copy">ホバー中の説明</div>';
      const before=tip.getBoundingClientRect();
      const beforeHtml=tip.innerHTML, beforeColor=getComputedStyle(tip.querySelector('.preview-title')).color;
      _openRewardActionTooltip(card,'絆の巻物','同名のキャラクター2枚を選んでマージする。',[
        {label:'使う'},{label:'捨てる'},{label:'やめる'}
      ]);
      const after=tip.getBoundingClientRect();
      const afterColor=getComputedStyle(tip.querySelector('.preview-title')).color;
      const hide=document.getElementById('board-card-visibility-btn');
      hide.style.setProperty('display','flex','important');
      const sr=sale.getBoundingClientRect(), cr=cost.getBoundingClientRect(), hr=hide.getBoundingClientRect();
      const saleCss=getComputedStyle(sale);
      const action=tip.querySelector('.reward-action-btn'),af=getComputedStyle(action,'::before');
      const itemSale=document.querySelector('.reward-prod-item .reward-prod-slots i .shop-board-sell-btn');
      const itemCost=document.querySelector('.reward-prod-item .reward-prod-slots i .shop-board-sell-value');
      const itemSlot=itemSale&&itemSale.closest('i');
      if(!itemSale||!itemCost||!itemSlot) throw new Error('アイテムの売却UIが作られていない');
      itemSale.style.setProperty('display','flex','important');
      const itemSaleCss=getComputedStyle(itemSale),itemCostCss=getComputedStyle(itemCost);
      const itemSlotFrame=getComputedStyle(itemSlot,'::before');
      const saleMetrics={x:sr.x,y:sr.y,w:sr.width,h:sr.height,cssW:saleCss.width,cssH:saleCss.height,
        top:parseFloat(saleCss.top),frame:saleCss.backgroundImage,filter:saleCss.filter};
      const costMetrics={x:cr.x,y:cr.y,w:cr.width,h:cr.height,cssW:getComputedStyle(cost).width,
        cssH:getComputedStyle(cost).height,z:getComputedStyle(cost).zIndex};
      const actionMetrics={frame:af.borderImageSource,slice:af.borderImageSlice};
      const itemMetrics={sale:{width:itemSaleCss.width,height:itemSaleCss.height,top:itemSaleCss.top,
          background:itemSaleCss.backgroundImage},cost:{top:itemCostCss.top,z:itemCostCss.zIndex},frameZ:itemSlotFrame.zIndex};
      const tipContentKept=tip.innerHTML.startsWith(beforeHtml),tipColorKept=beforeColor===afterColor;
      return {sale:saleMetrics,cost:costMetrics,item:itemMetrics,
        action:actionMetrics,hide:{x:hr.x,y:hr.y,w:hr.width,h:hr.height},
        tipMove:{x:after.x-before.x,y:after.y-before.y,w:after.width-before.width},
        tipContentKept,tipColorKept};
    `);
    if(Math.abs(metrics.tipMove.x)>.5||Math.abs(metrics.tipMove.y)>.5||Math.abs(metrics.tipMove.w)>.5) throw new Error('クリック時にツールチップが動いた');
    if(!metrics.tipContentKept||!metrics.tipColorKept) throw new Error(`ホバー説明の内容または色がクリックで変わった: ${JSON.stringify(metrics)}`);
    if(metrics.sale.cssW!=='132px'||metrics.sale.cssH!=='62px'||metrics.sale.top!==230) throw new Error(`売却ボタンの寸法または位置が不正: ${JSON.stringify(metrics)}`);
    if(!/button_invisible_s\.svg/.test(metrics.sale.frame)) throw new Error('売却ボタンがbutton_invisible_s.svgではない');
    if(metrics.item.sale.width!=='132px'||metrics.item.sale.height!=='62px'||! /button_invisible_s\.svg/.test(metrics.item.sale.background)) throw new Error(`アイテム売却ボタンが原寸素材ではない: ${JSON.stringify(metrics.item)}`);
    if(metrics.item.cost.top!=='34px'||Number(metrics.item.cost.z)>=Number(metrics.item.frameZ)) throw new Error(`アイテム価格の位置または重なり順が不正: ${JSON.stringify(metrics.item)}`);
    if(!/button_invisible\.svg/.test(metrics.action.frame)||metrics.action.slice!=='22 fill') throw new Error('操作ボタンがbutton_invisible.svgの9スライスではない');
    if(metrics.cost.cssW!=='101px'||metrics.cost.cssH!=='46px') throw new Error(`cost.svg表示の寸法が101x46ではない: ${JSON.stringify(metrics)}`);
    if(Number(metrics.cost.z)!==105) throw new Error(`価格表示の重なり順が不正: ${JSON.stringify(metrics.cost)}`);
    await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:metrics.sale.x+metrics.sale.w/2,y:metrics.sale.y+metrics.sale.h/2});
    await sleep(180);
    const hoverFilter=await browser.eval(`return getComputedStyle(document.querySelector('#hand-slots .shop-board-sell-btn')).filter;`);
    if(!/drop-shadow/.test(hoverFilter)) throw new Error(`売却ボタンがホバー発光していない: ${hoverFilter}`);
    const shot=await browser.screenshot(OUT);
    const cancelMetrics=await browser.eval(`
      G._pendingItemUse={slotIdx:0,key:'shield_scroll',card:{name:'盾の巻物'},boardSnapshot:null};
      _syncItemUsePickingUi();
      document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:2}));
      const rightClickCancelled=!G._pendingItemUse&&!document.body.classList.contains('item-use-picking');
      G._pendingItemUse={slotIdx:0,key:'shield_scroll',card:{name:'盾の巻物'},boardSnapshot:null};
      _syncItemUsePickingUi();
      document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));
      return {rightClickCancelled,outsideClickCancelled:!G._pendingItemUse&&!document.body.classList.contains('item-use-picking')};
    `);
    if(!cancelMetrics.rightClickCancelled||!cancelMetrics.outsideClickCancelled) throw new Error('アイテム対象選択を右クリック／場所外クリックで解除できない');
    console.log(`OK 商店UI実画面: ${shot} ${JSON.stringify({...metrics,...cancelMetrics})}`);
  }finally{
    await browser.close();
  }
})().catch(e=>{ console.error(e); process.exitCode=1; });
