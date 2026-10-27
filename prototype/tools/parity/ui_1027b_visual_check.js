'use strict';
// 画面を出さないChromeでfile://を操作する。起動不可なら利用者指定のCSS値確認へ切り替える。
// node tools/parity/ui_1027b_visual_check.js [--css-only]
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {launch,sleep}=require('./headless');
const ROOT=path.resolve(__dirname,'../..'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
function cssCheck(){
  const source=fs.readFileSync(path.join(ROOT,'js/engine/reward_board_editor.js'),'utf8');
  assert.match(source,/class="shop-board-sell-value shop-board-sell-action debug-discard-btn"/);
  assert.doesNotMatch(source,/class="discard-btn [^"]*debug-discard-btn/);
  const fixed=[...html.matchAll(/html body\.reward-screen-active #hand-slots\.board-slots > \.card > \.shop-board-sell-action\s*\{([^}]+)\}/g)].at(-1)?.[1];
  assert.ok(fixed,'通常の売却ラベルと共通の最終固定');
  const expected={top:'34px',right:'0',left:'auto',width:'101px','min-width':'101px',height:'46px',transform:'none','z-index':'105'};
  for(const [key,value]of Object.entries(expected))assert.match(fixed,new RegExp(key+':'+value+'!important;'));
  const cost=html.slice(html.indexOf('/* cost.svg は枠線の下側に重ね'));
  assert.match(cost,/background:rgb\(0 0 0 \/ var\(--shop-cost-bg-opacity\)\) url\("assets\/ui\/cost\.svg/);
  assert.match(cost,/--shop-cost-bg-opacity:\.8;/);
  const after=[...html.matchAll(/html body\.reward-screen-active #hand-slots\.board-slots > \.card > \.shop-board-sell-action::after,[\s\S]*?\{([^}]+)\}/g)].at(-1)?.[1];
  assert.match(after,/content:none!important/);assert.match(after,/display:none!important/);
  console.log('CSS確認: 廃棄は共通の価格ラベル。'+JSON.stringify({...expected,backgroundOpacity:.8,legacyDiscardShadow:'適用なし',glowPseudo:'非表示'}));
}
async function run(){
  cssCheck();if(process.argv.includes('--css-only'))return;
  let browser;
  try{browser=await launch({width:1920,height:1080});}
  catch(error){console.log('撮影未実施: '+error.message+'。CSS値による代替確認まで完了。');return;}
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'vb-ui1027b-visual-'));
  try{
    await browser.goto(pathToFileURL(path.join(ROOT,'index.html')).href,1800);
    await browser.waitFor('typeof loadGameData==="function"&&typeof goToReward==="function"');
    await browser.eval(`
      await loadGameData();initState();SaveRun.begin();
      Object.assign(G,{_wave:1,_waveStage:1,_waveLife:3,gold:1000,_debugMode:true});goToReward({noNewRewards:true});
      G.mainBoard.fill(null);G.spellSlots.fill(null);
      G.mainBoard[1]=makePanel(PANEL_POOL.find(c=>c.no==='C003').id);G.mainBoard[1]._activationReady=true;
      G.mainBoard[3]=makePanel(PANEL_POOL.find(c=>c.no==='C006').id);
      G.spellSlots[0]=makeItem(ITEM_POOL.find(c=>Number(c.no)===18).id,2);
      renderHandEditor();_syncRewardProductionUi();
    `);
    await sleep(150);
    const label=await browser.eval(`
      const el=document.querySelector('.debug-discard-btn'),ref=document.createElement('div');
      ref.className='shop-board-sell-value shop-board-sell-action';ref.textContent='還魂';el.parentElement.appendChild(ref);
      const props=['top','right','left','width','height','padding','border','borderRadius','fontFamily','fontSize','fontWeight','lineHeight','textAlign','background','boxShadow','filter','transform'];
      const values=n=>Object.fromEntries(props.map(k=>[k,getComputedStyle(n)[k]]));
      const result={actual:values(el),reference:values(ref),pseudo:getComputedStyle(el,'::after').display};ref.remove();return result;
    `);
    assert.deepEqual(label.actual,label.reference);assert.equal(label.pseudo,'none');
    await browser.screenshot(path.join(out,'discard-ready.png'));
    const initial=await browser.eval(`
      const els=[...document.querySelectorAll('.reward-prod-item,.reward-prod-item h2,.reward-prod-item .reward-prod-slots i')];
      return els.map(e=>({filter:getComputedStyle(e).filter,opacity:getComputedStyle(e).opacity}));
    `);
    await browser.eval('cardActivationClick(1);');await sleep(100);
    const picking=await browser.eval(`
      const els=[...document.querySelectorAll('.reward-prod-item,.reward-prod-item h2,.reward-prod-item .reward-prod-slots i')];
      const blocked=[...document.querySelectorAll('#scr-battle button')].filter(e=>e.id!=='battle-options-btn'&&e.getClientRects().length&&getComputedStyle(e).display!=='none')
        .map(e=>({id:e.id,filter:getComputedStyle(e).filter,pointer:getComputedStyle(e).pointerEvents}));
      const slot=document.querySelector('.reward-prod-item .reward-prod-slots i'),r=slot.getBoundingClientRect();
      return {slots:els.map(e=>({filter:getComputedStyle(e).filter,opacity:getComputedStyle(e).opacity})),blocked,at:{x:r.x+r.width/2,y:r.y+r.height/2},gold:G.gold};
    `);
    assert.deepEqual(picking.slots,initial,'マモンの対象区画・空き枠も同じ明るさ');
    for(const b of picking.blocked){assert.equal(b.pointer,'none',b.id);assert.match(b.filter,/brightness\(0\.45\)/,b.id);}
    await browser.screenshot(path.join(out,'mammon-picking.png'));
    const at={...picking.at,button:'left',clickCount:1};
    await browser.call('Input.dispatchMouseEvent',{type:'mousePressed',...at});await browser.call('Input.dispatchMouseEvent',{type:'mouseReleased',...at});await sleep(150);
    const used=await browser.eval('return {active:_targetPickingActive(),item:G.spellSlots[0],gold:G.gold};');
    assert.equal(used.active,false);assert.equal(used.item,null);assert.ok(used.gold>picking.gold);
    await browser.screenshot(path.join(out,'mammon-used.png'));
    const errors=browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails?.text);assert.deepEqual(errors,[]);
    console.log('ヘッドレス撮影・実クリック確認: '+out);
  }finally{await browser.close();}
}
if(require.main===module)run().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={cssCheck};
