'use strict';
// 画面を出さないChromeで、実CSS・重なり・マウス操作・ホバーの可視性を検査する。
// python3 -m http.server 5500 を prototype で起動後、node tools/parity/picking_1026_visual_check.js
// file:// でも同じ選択UIを検査する。画像は一時ディレクトリへ保存し、利用者のChromeには触れない。
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {launch,sleep}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const FILE_URL=pathToFileURL(path.resolve(__dirname,'../../index.html')).href;
const OUT=process.env.VB_PICKING_SHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'vb-picking-1026-'));
const BOARD=i=>`#hand-slots.board-slots > [data-board-idx="${i}"]`;
const OFFER=i=>`#reward-offer-row [data-merge-rew-idx="${i}"]`;
const ITEM=i=>`.reward-prod-item .reward-prod-slots i:nth-child(${i+1})`;
let browser,passed=0;
async function read(selector,pseudo=null){return browser.eval(`
  const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('要素が無い: '+${JSON.stringify(selector)});
  const s=getComputedStyle(el,${JSON.stringify(pseudo)}),r=el.getBoundingClientRect(),ancestors=[];
  for(let p=el.parentElement;p;p=p.parentElement){const a=getComputedStyle(p);ancestors.push({tag:p.id||p.className,filter:a.filter,opacity:a.opacity,display:a.display,visibility:a.visibility});}
  const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {display:s.display,visibility:s.visibility,opacity:s.opacity,filter:s.filter,shadow:s.boxShadow,outline:s.outlineWidth,
    animation:s.animationName,color:s.color,content:s.content,pointer:s.pointerEvents,border:s.borderColor,
    rect:{x:r.x,y:r.y,w:r.width,h:r.height},hit:!!hit&&(hit===el||el.contains(hit)),ancestors,classes:el.className,text:el.textContent};
`);}
function visible(s){assert.notEqual(s.display,'none');assert.notEqual(s.visibility,'hidden');assert.ok(Number(s.opacity)>0);assert.ok(s.rect.w>0&&s.rect.h>0);assert.ok(s.ancestors.every(a=>a.display!=='none'&&a.visibility!=='hidden'&&Number(a.opacity)>0));}
function bright(s){visible(s);assert.ok(!/brightness\(0\./.test(s.filter),s.filter);assert.ok(s.ancestors.every(a=>!/brightness\(0\./.test(a.filter)),JSON.stringify(s.ancestors));}
async function move(selector){const s=await read(selector);visible(s);await browser.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:s.rect.x+s.rect.w/2,y:s.rect.y+s.rect.h/2});await sleep(150);}
async function click(selector){const s=await read(selector);visible(s);assert.equal(s.hit,true,'手前の要素で押せない: '+selector);const at={x:s.rect.x+s.rect.w/2,y:s.rect.y+s.rect.h/2,button:'left',clickCount:1};await browser.call('Input.dispatchMouseEvent',{type:'mousePressed',...at});await browser.call('Input.dispatchMouseEvent',{type:'mouseReleased',...at});await sleep(100);}
async function setup(source=null,enhanced=false,shop=false){await browser.eval(`await window.__pickingSetup(${JSON.stringify(source)},${enhanced},${shop});`);await sleep(100);}
async function startItem(no){await browser.eval(`G.spellSlots[0]=window.__pickingItem(${JSON.stringify(no)});_syncRewardProductionItems();_useImmediateItem(0,G.spellSlots[0]);`);await sleep(100);}
async function active(){return browser.eval('return _targetPickingActive();');}
async function noGlows(){
  const failures=await browser.eval(`
    const nodes=[...document.querySelectorAll('#hand-slots.board-slots > .card,#reward-offer-row > .rew-card,.reward-prod-slots i')];
    const errors=[];
    for(const el of nodes){
      const label=el.className;
      if(!el.classList.contains('picking-first')){
        const s=getComputedStyle(el);if(s.boxShadow!=='none'||parseFloat(s.outlineWidth)!==0||s.filter.includes('drop-shadow'))errors.push(label+': '+s.boxShadow+'/'+s.outlineWidth);
      }
      for(const pseudo of ['::before','::after']){const s=getComputedStyle(el,pseudo);if(s.boxShadow!=='none'||s.filter.includes('drop-shadow'))errors.push(label+pseudo+': '+s.boxShadow+'/'+s.filter);}
      for(const layer of el.querySelectorAll('.card-glow-layer,.reward-card-line-layer,.character-frame-layer,.board-frame-layer')){
        const s=getComputedStyle(layer);if(s.display!=='none'&&Number(s.opacity)>0&&s.boxShadow!=='none')errors.push(layer.className+': '+s.boxShadow);
      }
    }
    return errors;
  `);assert.deepEqual(failures,[],'選択中に通常の発光が残る');
}
async function common(name){
  const overlay=await read('#board-drag-overlay');visible(overlay);assert.equal(overlay.pointer,'auto');
  assert.equal((await read('#reward-offer-row')).display,'flex');
  assert.equal(await browser.eval('return !!document.querySelector(".item-use-cancel-btn");'),false);
  assert.equal(await browser.eval('return document.documentElement.style.getPropertyValue("--item-use-desc");'),'');
  const disabled=await read(BOARD(10));assert.equal(disabled.pointer,'none');
  const layer=await read(BOARD(10)+' > :is(.board-frame-layer,.character-frame-layer)');assert.match(layer.filter,/brightness\(0\.42\)/);
  const button=await read('#board-card-visibility-btn');assert.equal(button.pointer,'none');assert.match(button.filter,/brightness\(0\.45\)/);
  const leave=await read('#reward-move-btns .rew-move-btn');assert.equal(leave.hit,false,'対象区域外のボタンは暗転に遮られる');
  await noGlows();await browser.screenshot(path.join(OUT,name+'.png'));
}
async function install(){
  await browser.waitFor('typeof loadGameData==="function"&&typeof initState==="function"&&typeof goToReward==="function"',20000);
  await browser.eval(`
    await loadGameData();
    window.__pickingItem=no=>makeItem(ITEM_POOL.find(c=>'I'+String(c.no).padStart(3,'0')===no).id,2);
    window.__pickingSetup=async(no,enhanced,shop)=>{
      _pendingCardActivation=null;if(G)G._pendingItemUse=null;initState();SaveRun.begin();
      Object.assign(G,{phase:null,_wave:1,_waveStage:1,_waveLife:3,gold:1000,_debugMode:true,_isShop:shop,_isItemShop:false,_isForge:false});
      goToReward({noNewRewards:true});
      G.phase='reward';G._rewardOnePickMode=!shop;G._freeRewardPanelMode=!shop;_rewFreePickDone=false;
      G.mainBoard.fill(null);G.spellSlots=[window.__pickingItem('I002'),window.__pickingItem('I018'),null,null];
      const panel=n=>makePanel(PANEL_POOL.find(c=>c.no===n).id);
      G.mainBoard[3]=panel('C006');G.mainBoard[8]=panel('C007');G.mainBoard[10]=panel('E001');
      if(no){G.mainBoard[1]=panel(no);if(enhanced)G.mainBoard[1]=enhancedPanelCopy(G.mainBoard[1]);G.mainBoard[1]._activationReady=true;}
      _rewCards=[panel('C008'),panel('C009'),panel('E002')];
      if(!shop)_rewCards.forEach(c=>{c._isOriginalReward=true;c._buyPrice=0;});
      _rewCards[0].rarity=3;_rewCards[1].rarity=2;
      _syncItemUsePickingUi();renderHandEditor();renderRewCards();_syncRewardProductionUi();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    };
  `);
}
(async()=>{
  browser=await launch({width:1920,height:1080});
  try{
    for(const [protocol,url]of [['http',URL],['file',FILE_URL]]){
      await browser.goto(url,1800);await install();
      await setup();await startItem('I002');await common(protocol+'-item');
      bright(await read(ITEM(0)));assert.equal((await read(ITEM(0))).hit,true);
      assert.match((await read(ITEM(1))).filter,/brightness\(0\.5\)/);
      await move(ITEM(0));const tip=await read('#kw-tooltip');visible(tip);assert.ok(!/rgba?\([^)]*,\s*0\)/.test(tip.color));
      assert.ok(tip.text.includes('変身の巻物'),'使用中のアイテムのホバー説明');
      await move(BOARD(3));await noGlows();await click(OFFER(0));
      assert.match((await read(OFFER(0))).classes,/picking-first/);assert.match((await read(OFFER(0))).shadow,/145, 214, 255/);
      await browser.screenshot(path.join(OUT,protocol+'-first.png'));
      await click(OFFER(0));assert.doesNotMatch((await read(OFFER(0))).classes,/picking-first/);assert.equal(await active(),true);
      await click(OFFER(0));await click(BOARD(3));assert.equal(await active(),false);
      assert.equal(await browser.eval('return _rewCards[0].no;'),'C006');passed++;
      for(const no of ['C080','C084','C109','C116']){
        await setup(no,no==='C084');await click(BOARD(1));await common(protocol+'-'+no);
        bright(await read(BOARD(1)));bright(await read(BOARD(1)+' > .character-frame-layer'));
        await move(BOARD(1));visible(await read('#kw-tooltip'));await noGlows();
        if(no==='C080'||no==='C084'){
          await click(OFFER(0));assert.match((await read(OFFER(0))).classes,/picking-first/);
          await click(OFFER(0));assert.doesNotMatch((await read(OFFER(0))).classes,/picking-first/);assert.equal(await active(),true);
          await click(OFFER(0));await click(BOARD(8));assert.equal(await active(),false);
        }else{await click(BOARD(1));assert.equal(await active(),false);}
        passed++;
      }
      await setup('C003');const empty=await read(ITEM(2));await click(BOARD(1));
      bright(await read(BOARD(1)));assert.equal((await read(BOARD(3))).pointer,'none');assert.match((await read(BOARD(3)+' > .character-frame-layer')).filter,/brightness\(0\.42\)/);
      assert.match((await read('#hand-pane-board-bg')).filter,/brightness\(0\.5\)/);
      const after=await read(ITEM(2));assert.equal(after.filter,empty.filter);assert.equal(after.opacity,empty.opacity);bright(after);
      bright(await read(ITEM(0)));assert.equal((await read(ITEM(0))).hit,true);await noGlows();await browser.screenshot(path.join(OUT,protocol+'-mammon.png'));
      await click(ITEM(0));assert.equal(await active(),false);passed++;
      await setup('C109',false,true);await click(BOARD(1));await move(OFFER(0));await noGlows();bright(await read(OFFER(0)));await click(OFFER(0));assert.equal(await active(),false);passed++;
      // Esc・右クリックは実入力で取り消し、カード非表示には切り替えない。
      for(const cancel of ['esc','right']){
        await setup('C080');await click(BOARD(1));
        if(cancel==='esc'){await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await browser.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});}
        else{const s=await read(BOARD(3)),at={x:s.rect.x+s.rect.w/2,y:s.rect.y+s.rect.h/2,button:'right',clickCount:1};await browser.call('Input.dispatchMouseEvent',{type:'mousePressed',...at});await browser.call('Input.dispatchMouseEvent',{type:'mouseReleased',...at});}
        await sleep(100);assert.equal(await active(),false);assert.equal(await browser.eval('return document.body.classList.contains("right-card-peek");'),false);passed++;
      }
    }
    const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails?.exception?.description||e.params.exceptionDetails?.text);
    assert.deepEqual(errors,[]);console.log(`picking_1026_visual: ${passed} passed; screenshots: ${OUT}`);
  }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
