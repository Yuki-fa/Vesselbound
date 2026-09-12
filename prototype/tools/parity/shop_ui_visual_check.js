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
      const cardRect=card.getBoundingClientRect();
      const saleCss=getComputedStyle(sale);
      const action=tip.querySelector('.reward-action-btn'),af=getComputedStyle(action,'');
      const itemSale=document.querySelector('.reward-prod-item .reward-prod-slots i .shop-board-sell-btn');
      const itemCost=document.querySelector('.reward-prod-item .reward-prod-slots i .shop-board-sell-value');
      const itemSlot=itemSale&&itemSale.closest('i');
      if(!itemSale||!itemCost||!itemSlot) throw new Error('アイテムの売却UIが作られていない');
      itemSale.style.setProperty('display','flex','important');
      const itemSaleCss=getComputedStyle(itemSale),itemCostCss=getComputedStyle(itemCost);
      const itemSlotFrame=getComputedStyle(itemSlot,'::before');
      const saleMetrics={x:sr.x,y:sr.y,w:sr.width,h:sr.height,cssW:saleCss.width,cssH:saleCss.height,
        top:parseFloat(saleCss.top),frame:saleCss.backgroundImage,filter:saleCss.filter};
      const costCss=getComputedStyle(cost);
      const costStack={
        top:parseFloat(costCss.top),right:parseFloat(costCss.right),z:costCss.zIndex,
        parent:cost.parentElement?.className||'',parentZ:getComputedStyle(cost.parentElement||cost).zIndex,
        layers:[...card.querySelectorAll('.board-frame-layer,.map-boundary-layer,.character-frame-layer')].map(x=>({cls:x.className,z:getComputedStyle(x).zIndex,rect:(()=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()})),
        pseudo:{before:getComputedStyle(card,'::before').zIndex,after:getComputedStyle(card,'::after').zIndex}
      };
      const costMetrics={x:cr.x,y:cr.y,w:cr.width,h:cr.height,cssW:getComputedStyle(cost).width,
        cssH:getComputedStyle(cost).height,z:getComputedStyle(cost).zIndex,
        padL:getComputedStyle(cost).paddingLeft,padR:getComputedStyle(cost).paddingRight};
      const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
      const actionMetrics={frame:af.backgroundImage,width:parseFloat(af.width),height:parseFloat(af.height),expectedW:132*scale,expectedH:62*scale};
      const itemMetrics={sale:{width:itemSaleCss.width,height:itemSaleCss.height,top:itemSaleCss.top,
          background:itemSaleCss.backgroundImage},cost:{top:itemCostCss.top,z:itemCostCss.zIndex},frameZ:itemSlotFrame.zIndex};
      const tipContentKept=tip.innerHTML.startsWith(beforeHtml),tipColorKept=beforeColor===afterColor;
      _openRewardActionTooltip(card,'絆の巻物','同名のキャラクター2枚を選んでマージする。',
        [{label:'使う'},{label:'捨てる'},{label:'やめる'}]);
      document.body.classList.remove('right-card-peek');
      document.body.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));
      const popupRightClick={closed:tip.dataset.rewardLocked!=='1',peek:document.body.classList.contains('right-card-peek')};
      document.body.classList.add('right-card-peek');
      sale.style.removeProperty('display');
      const hiddenSale=getComputedStyle(sale);
      document.body.classList.remove('right-card-peek');
      const probeEnchant=mkCardEl({id:'probe-enchant',name:'毒牙',type:'panel',kind:'panel',panelScope:'unit',category:'強化',keywords:['毒牙'],adjacentKeywords:['毒牙'],desc:'攻撃時：毒牙を得る。',rarity:2},-1,'probe');
      const probeChar=mkCardEl({id:'probe-char',name:'赤の試験キャラ',type:'panel',kind:'panel',panelScope:'unit',category:'キャラクター',color:'赤',power:1,life:2,keywords:[],desc:''},-1,'probe');
      probeEnchant.style.display='none'; probeChar.style.display='none';
      document.body.append(probeEnchant,probeChar);
      probeChar.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:500,clientY:500}));
      await new Promise(resolve=>setTimeout(resolve,30));
      const debugLabels=(typeof renderDebugCardPalette==='function'?(renderDebugCardPalette(),document.querySelectorAll('#debug-card-palette .debug-palette-label[class*="rarity-"]').length):0);
      const debugHoverCard=document.querySelector('#debug-card-palette .debug-palette-card [data-preview][data-keyword-preview]');
      if(debugHoverCard){
        debugHoverCard.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:520,clientY:520}));
        await new Promise(resolve=>setTimeout(resolve,30));
      }
      const debugTip=document.getElementById('kw-tooltip'),debugKwTip=document.getElementById('keyword-tooltip');
      return {sale:saleMetrics,cost:costMetrics,item:itemMetrics,
        action:actionMetrics,hide:{x:hr.x,y:hr.y,w:hr.width,h:hr.height},
        costCenter:{actual:cr.x+cr.width/2,expected:cardRect.x+cardRect.width/2},costStack,
        tipMove:{x:after.x-before.x,y:after.y-before.y,w:after.width-before.width},
        tipContentKept,tipColorKept,popupRightClick,
        enhancementKeywordPreview:!!probeEnchant.getAttribute('data-keyword-preview'),
        characterTitleIcon:!!document.querySelector('#kw-tooltip .preview-title-color-icon'),
        debugRarityLabels:debugLabels,
        debugHover:{rarity:[...debugTip.classList].some(c=>/^rarity-[1-6]$/.test(c)),keyword:!!(debugKwTip&&debugKwTip.style.display==='block')},
        hiddenSale:{display:hiddenSale.display,pointerEvents:hiddenSale.pointerEvents}};
    `);
    if(Math.abs(metrics.tipMove.x)>.5||Math.abs(metrics.tipMove.y)>.5||Math.abs(metrics.tipMove.w)>.5) throw new Error('クリック時にツールチップが動いた');
    if(!metrics.tipContentKept||!metrics.tipColorKept) throw new Error(`ホバー説明の内容または色がクリックで変わった: ${JSON.stringify(metrics)}`);
    if(!metrics.popupRightClick.closed||!metrics.popupRightClick.peek) throw new Error(`ポップアップ上の右クリックが共通切替になっていない: ${JSON.stringify(metrics.popupRightClick)}`);
    if(!metrics.enhancementKeywordPreview||!metrics.characterTitleIcon||metrics.debugRarityLabels<1||!metrics.debugHover.rarity||!metrics.debugHover.keyword) throw new Error(`強化カード／色アイコン／デバッグホバー表示が不足: ${JSON.stringify(metrics)}`);
    if(metrics.hiddenSale.display!=='none'&&metrics.hiddenSale.pointerEvents!=='none') throw new Error(`カード非表示中も売却UIが反応する: ${JSON.stringify(metrics.hiddenSale)}`);
    if(metrics.sale.cssW!=='132px'||metrics.sale.cssH!=='62px'||metrics.sale.top!==230) throw new Error(`売却ボタンの寸法または位置が不正: ${JSON.stringify(metrics)}`);
    if(metrics.cost.padL!==metrics.cost.padR) throw new Error(`販売価格テキストの左右余白が不均等: ${JSON.stringify(metrics.cost)}`);
    if(!/button_invisible_s\.svg/.test(metrics.sale.frame)) throw new Error('売却ボタンがbutton_invisible_s.svgではない');
    if(metrics.item.sale.width!=='132px'||metrics.item.sale.height!=='62px'||! /button_invisible_s\.svg/.test(metrics.item.sale.background)) throw new Error(`アイテム売却ボタンが原寸素材ではない: ${JSON.stringify(metrics.item)}`);
    if(metrics.item.cost.top!=='34px'||Number(metrics.item.cost.z)>=Number(metrics.item.frameZ)) throw new Error(`アイテム価格の位置または重なり順が不正: ${JSON.stringify(metrics.item)}`);
    if(!/button_invisible_s\.svg/.test(metrics.action.frame)||Math.abs(metrics.action.width-metrics.action.expectedW)>.1||Math.abs(metrics.action.height-metrics.action.expectedH)>.1) throw new Error(`操作ボタンがbutton_invisible_s.svg原寸ではない: ${JSON.stringify(metrics.action)}`);
    if(metrics.cost.cssW!=='101px'||metrics.cost.cssH!=='46px') throw new Error(`cost.svg表示の寸法が101x46ではない: ${JSON.stringify(metrics)}`);
    if(Number(metrics.cost.z)!==105) throw new Error(`価格表示の重なり順が不正: ${JSON.stringify(metrics.cost)}`);
    const disabledRect=await browser.eval(`
      _openRewardActionTooltip(document.querySelector('#hand-slots .card'),'絆の巻物','説明',
        [{label:'使う',disabled:true},{label:'捨てる'},{label:'やめる'}]);
      const r=document.querySelector('#kw-tooltip .reward-action-btn')?.getBoundingClientRect();
      return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;
    `);
    if(!disabledRect) throw new Error('無効ボタンの実測要素が取得できない');
    await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:disabledRect.x,y:disabledRect.y});
    const disabledGlow=await browser.eval(`return (()=>{const b=document.querySelector('#kw-tooltip .reward-action-btn.is-disabled');return {found:!!b,opacity:b?getComputedStyle(b,'::after').opacity:'missing'};})();`);
    if(!disabledGlow.found||disabledGlow.opacity!=='0') throw new Error(`無効ボタンがホバー発光している: ${JSON.stringify(disabledGlow)}`);
    await browser.eval(`_closeItemUseConfirm()`);
    await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:metrics.sale.x+metrics.sale.w/2,y:metrics.sale.y+metrics.sale.h/2});
    await sleep(180);
    const hoverFilter=await browser.eval(`return (()=>{const b=document.querySelector('#hand-slots .shop-board-sell-btn');const p=getComputedStyle(b,'::after');return {filter:p.filter,opacity:p.opacity};})();`);
    if(!/drop-shadow|url\(/.test(hoverFilter.filter)||Number(hoverFilter.opacity)<=0) throw new Error(`売却ボタンがホバー発光していない: ${JSON.stringify(hoverFilter)}`);
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
