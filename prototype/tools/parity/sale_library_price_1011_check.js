'use strict';
// 2026-10-11: 1〜3の実DOM検査。通常の売却経路、最後まで進めた図書館、暗転層との重なりを確認。
const assert=require('node:assert/strict');
const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
(async()=>{
  const b=await launch({width:1920,height:1080});
  try {
    const open=async()=>{await b.goto(URL);await b.waitFor('typeof PANEL_POOL!=="undefined"&&PANEL_POOL.some(c=>c.no==="C082")&&typeof SaveProfile!=="undefined"',20000);};
    await open();
    const sale=await b.eval(`
      const visible=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight
        &&[el,...(function*(p){while(p){yield p;p=p.parentElement;}})(el.parentElement)].every(n=>{const s=getComputedStyle(n);return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0;});};
      const out=[];
      for(const [name,flags,classes] of [
        ['デバッグ',{_debugMode:true},'debug-mode'],['魔導店',{_isShop:true},'shop-screen-active'],
        ['道具屋',{_isShop:true,_isItemShop:true},'shop-screen-active item-shop-active'],
        ['鍛冶屋',{_isForge:true},'forge-screen-active'],['行商人',{_isShop:true,_isPeddler:true},'shop-screen-active peddler-screen-active']]) {
        initState();Object.assign(G,{phase:'reward',gold:100,rings:[]},flags);_rewCards=[];_rewFreePickDone=true;
        document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
        const screen=document.getElementById('scr-battle');screen.classList.add('active');screen.style.setProperty('display','block','important');
        document.body.className='reward-screen-active '+classes;
        const item=clone(ITEM_POOL[0]),card=makePanel(PANEL_POOL.find(c=>c.no==='C082').id);
        G.spellSlots=[item,null,null,null];G.mainBoard[1]=card;renderHandEditor();_syncRewardProductionUi();
        await new Promise(r=>requestAnimationFrame(r));
        const itemBtn=document.querySelector('.reward-prod-item .item-shop-sell-action');
        const itemShown=visible(itemBtn),itemGain=goldIncomeAmount(_itemShopSellPrice(item));
        const exchange=_isCardExchangeShop();
        // 2026-10-18：どの施設・デバッグでもアイテムを売れない。
        if(itemBtn)throw new Error(name+' アイテム売却UIが残る');
        if(itemBtn)itemBtn.click();
        const itemUiCorrect=!itemBtn&&!itemShown;
        const itemSaleCorrect=G.spellSlots[0]===item&&G.gold===100;
        const cardBtn=document.querySelector('#hand-slots > .card[data-card-idx="1"] .shop-board-sell-action')
          ||document.querySelectorAll('#hand-slots > *')[1]?.querySelector('.shop-board-sell-action');
        const cardShown=visible(cardBtn),before=G.gold;
        if(cardBtn)cardBtn.click();
        out.push({name,itemUiCorrect,itemSaleCorrect,cardUiAbsent:!cardBtn&&!cardShown,cardKept:G.mainBoard[1]===card&&G.gold===before});
      }
      return out;
    `);
    for(const r of sale) for(const field of ['itemUiCorrect','itemSaleCorrect','cardUiAbsent','cardKept']) assert.ok(r[field],`${r.name} ${field}`);
    console.log('OK 1: 全施設・デバッグでアイテム売却UIなし・カード換金なし');

    // 実際のチュートリアルを開始したままページを離れる。onFinishを直接呼んで済ませない。
    // 2026-10-11: b.evalは関数本体を評価するため、検査する値はreturnで返す（式だけではundefined）。
    await b.eval(`SaveStorage.remove('profile');SaveProfile.resetCache();initState();G.gold=10000;openMapLibraryMenu();`);
    assert.equal(await b.eval(`return getComputedStyle(document.getElementById('library-merge-btn')).display;`),'none','魔導板説明の開始前はマージを表示しない');
    await b.eval(`document.getElementById('library-howto-btn').click();`);
    await b.waitFor('G._libraryTutorialActive&&G._libraryTutorialStep>=0',10000);
    assert.equal(await b.eval(`return SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY);`),false,'魔導板説明の開始だけでは完走を記録しない');
    await open();await b.eval(`initState();G.gold=10000;openMapLibraryMenu();`);
    assert.equal(await b.eval(`return getComputedStyle(document.getElementById('library-merge-btn')).display;`),'none','途中離脱で解放しない');
    const completeBoard=async()=>{
      await b.eval(`document.getElementById('library-howto-btn').click();`);
      await b.waitFor('G._libraryTutorialActive&&G._libraryTutorialStep>=0',10000);
      const result=await b.eval(`
        const wait=ms=>new Promise(r=>setTimeout(r,ms));let visibleText=false;
        for(let i=0;i<30&&G._libraryTutorialActive;i++) {
          const box=document.querySelector('.library-tutorial-box'),s=getComputedStyle(box),r=box.getBoundingClientRect();
          visibleText ||= r.width>0&&r.height>0&&r.left<innerWidth&&r.right>0&&r.top<innerHeight&&r.bottom>0&&s.visibility!=='hidden'&&Number(s.opacity)>0&&s.color!=='rgba(0, 0, 0, 0)';
          const move=G._libraryTutorialMove;
          if(move) {const at=_rewCards.findIndex(c=>c&&c.name===move.name);if(at<0)throw new Error('貸出移動対象がない');takeRewCard(at,move.index);await wait(500);}
          else {box.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));await wait(220);}
        }
        return {done:!G._libraryTutorialActive,visibleText,completed:_libraryBoardTutorialCompleted()};
      `);
      assert.ok(result.done&&result.visibleText&&result.completed,JSON.stringify(result));
    };
    await completeBoard();
    await open();await b.eval(`initState();G.gold=10000;openMapLibraryMenu();`);
    const unlocked=await b.eval(`const el=document.getElementById('library-merge-btn'),s=getComputedStyle(el),r=el.getBoundingClientRect();return {
      saved:SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY),visible:s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight};`);
    assert.ok(unlocked.saved&&!unlocked.visible,'プロフィールは保持し、合体停止中は入口を非表示');
    await b.eval(`openLibraryMergeTutorial();if(G._libraryTutorialActive)throw Error('停止中にマージ案内が開始した');
      PANEL_MERGE_TRIAL.enabled=true;renderVillageScreen();document.getElementById('library-merge-btn').click();`);
    await b.waitFor('G._libraryTutorialActive&&G._libraryTutorialStep===0',10000);
    await b.eval(`document.querySelector('.library-tutorial-box').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));`);
    const loans=await b.eval(`const box=document.querySelector('.library-tutorial-box'),s=getComputedStyle(box),r=box.getBoundingClientRect();return {
      cards:_rewCards.filter(Boolean).map(c=>c.no),name:PANEL_POOL.find(c=>c.no==='C082').name,move:G._libraryTutorialMove?.name,text:box.textContent,
      visible:s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&s.color!=='rgba(0, 0, 0, 0)'&&r.width>0&&r.height>0};`);
    assert.deepEqual(loans.cards,Array(5).fill('C082'));assert.equal(loans.move,loans.name);assert.ok(loans.text.includes(loans.name)&&loans.visible,'C082の貸出名・説明文が実際に見える');
    await open();await b.eval(`SaveStorage.remove('profile');SaveProfile.resetCache();initState();G._debugMode=true;G.gold=10000;openMapLibraryMenu();`);
    await completeBoard();
    assert.equal(await b.eval(`return SaveProfile.tutorialShown(LIBRARY_BOARD_TUTORIAL_KEY);`),false,'デバッグはプロフィールに完走を書かない');
    console.log('OK 2: 実際の完走・途中離脱・再読込・デバッグとC082×5の説明');

    await open();
    const prices=await b.eval(`
      const overrides=[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules];}catch(_e){return [];}})
        .filter(rule=>rule.selectorText?.includes('shop-screen-active:not(.item-shop-active):not(.forge-screen-active)')&&['10001','9999'].includes(rule.style.zIndex));
      if(overrides.length!==2)throw new Error('値札とマナ・血の規則が見つからない');
      const snapshot=card=>Object.fromEntries(['.shop-buy-price','.card-activation-costs','.reward-card-dim-layer','.shop-insufficient-badge'].map(sel=>{
        const el=card.querySelector(sel);if(!el)return [sel,null];const s=getComputedStyle(el),r=el.getBoundingClientRect();return [sel,{z:s.zIndex,color:s.color,filter:s.filter,opacity:s.opacity,bg:s.backgroundColor,display:s.display,visibility:s.visibility,w:r.width,h:r.height}];}));
      const out=[];
      for(const [name,classes,item] of [['魔導店','shop-screen-active',false],['行商人','shop-screen-active peddler-screen-active',false],
        ['道具屋','shop-screen-active item-shop-active',true],['鍛冶屋','shop-screen-active forge-screen-active',false]]) {
        // CSSクラスだけでなく、各施設の実際のモードを揃える（鍛冶屋はショップではない）。
        initState();G.phase='reward';G._isShop=name!=='鍛冶屋';G._isRewardTown=true;G._isItemShop=item;
        G._isPeddler=name==='行商人';G._isForge=name==='鍛冶屋';G._freeRewardPanelMode=false;G.gold=0;
        document.body.className='reward-screen-active '+classes;
        const screen=document.getElementById('scr-battle');screen.classList.add('active');screen.style.setProperty('display','block','important');
        _rewCards=[];renderRewCards();
        const offer=document.getElementById('reward-offer-row');offer.replaceChildren();
        let el;
        if(G._isForge){
          const power=MAP_PANEL_POWERS.find(p=>mapForgePrice(p)>0&&_mapForgeCandidateSlots(p).length);
          if(!power)throw new Error('鍛冶屋の購入対象マスがない');
          G._mapForgeOffers=[clone(power)];renderMapForgeOffers();el=offer.querySelector('.forge-card');
        }else{
          const definition=PANEL_POOL.find(c=>c.category==='キャラクター'&&c.manaCost>0);
          const card=item?clone(ITEM_POOL[0]):makePanel(definition.id);card._buyPrice=1000;
          if(!item)card.keywords=[...(card.keywords||[]),'封印3'];
          el=_mkRewDiv(card,()=>{},0);
          if(item)el.classList.add('item-shop-card','item-offer-card','item-visual','item-shop-card-down');
          offer.appendChild(el);
        }
        const current=snapshot(el),saved=overrides.map(rule=>rule.style.zIndex);
        overrides.forEach(rule=>rule.style.removeProperty('z-index'));
        const prior=snapshot(el);overrides.forEach((rule,i)=>rule.style.setProperty('z-index',saved[i],'important'));
        out.push({name,current,prior,cant:el.classList.contains('cant'),forgeDisabled:el.classList.contains('forge-disabled'),mana:!!el.querySelector('.mana-cost-entry'),blood:!!el.querySelector('.seal-cost-entry')});
      }
      return out;
    `);
    for(const r of prices) {
      if(r.name==='魔導店'||r.name==='行商人'){
        assert.equal(r.cant,false,'交換にはゴールド不要');
        assert.equal(r.current['.shop-buy-price'],null,'交換店には値札なし');
        assert.equal(r.current['.shop-insufficient-badge'],null,'交換店には不足表示なし');
        assert.ok(r.mana&&r.blood,'カード本来のマナ・血バッジは残す');
        const costs=r.current['.card-activation-costs'];
        assert.ok(costs&&costs.w>0&&costs.h>0&&costs.display!=='none'&&costs.visibility==='visible'&&Number(costs.opacity)>0,'マナ・血の表示領域が見える');
        assert.equal(r.current['.reward-card-dim-layer'],null,'交換店を資金不足で暗くしない');
        continue;
      }
      if(r.name==='鍛冶屋'){
        // 本体は絵を暗くしない forge-disabled と不足バッジを使い、汎用の cant を使わない。
        assert.ok(r.forgeDisabled&&!r.cant,'鍛冶屋のゴールド不足は専用の無効状態にする');
        for(const sel of ['.shop-buy-price','.shop-insufficient-badge']){
          const s=r.current[sel];assert.ok(s&&s.w>0&&s.h>0&&s.display!=='none'&&s.visibility==='visible'&&Number(s.opacity)>0,'鍛冶屋 '+sel+'を表示する');
        }
        assert.equal(r.current['.reward-card-dim-layer'],null,'鍛冶屋はゴールド不足だけでは暗転しない');
        assert.deepEqual(r.current,r.prior,'鍛冶屋の見た目を変えない');
        continue;
      }
      assert.ok(r.cant,r.name+' ゴールド不足');
      assert.deepEqual(r.current,r.prior,r.name+'の見た目を変えない');
    }
    console.log('OK 3: 魔導店・行商人の値札と不足札はなく、マナ・血を残し、道具屋／鍛冶屋の見た目を維持');
  } finally {await b.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
