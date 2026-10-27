'use strict';
// node tools/parity/fixes_1027e_visual_check.js [--fixture]
// --fixture は同じ本番HTMLから一時的な可視検査ページを作る（Chromeを起動できない環境用）。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
const {launch,sleep}=require('./headless');
const ROOT=path.resolve(__dirname,'../..');
async function installFixture(){
  await loadGameData();
  if(!isDebugMuted())toggleDebugMute();
  const panel=no=>makePanel(PANEL_POOL.find(c=>c.no===no).id);
  let kind='祝福';
  const controls=document.createElement('div');
  controls.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483640;background:#111;color:white;font:14px/1.5 monospace;padding:6px';
  const status=document.createElement('span');
  function snapshot(){
    const cards=[1,9].map(index=>{
      const card=document.querySelector(`#hand-slots > [data-board-idx="${index}"]`);
      const label=card?.querySelector('.card-activation-ready-label');
      const css=label&&getComputedStyle(label),rect=label?.getBoundingClientRect();
      const shadow=card&&getComputedStyle(card).boxShadow;
      return {index,label:label?.textContent,opacity:css?.opacity,color:css?.color,display:css?.display,visibility:css?.visibility,
        visible:!!rect&&rect.width>0&&rect.height>0&&rect.right>0&&rect.bottom>0&&rect.left<innerWidth&&rect.top<innerHeight,
        green:!!shadow&&shadow.includes('96, 232, 128'),shadow,canUse:cardActivationCanUse(G.mainBoard[index])};
    });
    return {kind,cards,pending:!!_pendingCardActivation};
  }
  function report(){
    const result=snapshot();status.textContent=JSON.stringify(result);
    document.title='1027e '+kind+' '+(result.cards[0].canUse?'起動可能':'完了待ち');return result;
  }
  async function enter(next){
    kind=next;blessingFlameClear();_pendingCardActivation=null;
    initState();Object.assign(G,{phase:'reward',_debugMode:true,_wave:2,_waveStage:1,_waveLife:3,gold:800});
    document.body.className='';G.mainBoard.fill(null);
    for(const [i,no]of [[1,'C109'],[3,'C008'],[5,'C006'],[6,'C007'],[7,'C010'],[9,'C109']])G.mainBoard[i]=panel(no);
    G.mainBoard[1]._activationReady=G.mainBoard[9]._activationReady=true;
    if(kind==='祝福'){G._isWaveAltar=true;openBlessingFlame();}
    else if(kind==='祭壇')openMapRingExchange();
    else{
      if(kind==='魔導店'||kind==='行商人')G._isShop=true;
      if(kind==='行商人')G._isPeddler=true;
      showScreen('battle');goToReward({noNewRewards:true});
    }
    renderRewCards();renderHandEditor();renderMoveSlotsInEnemy();
    await new Promise(requestAnimationFrame);return report();
  }
  async function complete(){
    if(kind==='祝福'){blessingFlameSelect(1);await blessingFlameExecute();}
    if(kind==='祭壇'){
      _clearRingOfferSelection();for(const i of [5,6,7])_discardBoardCardForRingOffer(i,G.mainBoard[i]);
      if(!_takeRingOffer(0))throw new Error('指輪交換に失敗');
    }
    await new Promise(requestAnimationFrame);return report();
  }
  function button(label,action){
    const b=document.createElement('button');b.textContent=label;b.style.cssText='font:14px sans-serif;margin:0 4px;color:white;background:#333';
    b.onclick=()=>Promise.resolve(action()).catch(e=>{status.textContent=e.stack;});controls.appendChild(b);
  }
  for(const name of ['祝福','祭壇','編成','魔導店','行商人'])button(name,()=>enter(name));
  button('強化・交換を完了',complete);button('状態確認',report);
  controls.appendChild(document.createElement('br'));controls.appendChild(status);document.body.appendChild(controls);
  document.addEventListener('click',()=>setTimeout(report,100));
  window.vbActivationFixture={enter,complete,snapshot};
  await enter('祝福');
}
function fixtureFile(out){
  let html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  html=html.replace('<head>','<head><base href="'+pathToFileURL(ROOT+path.sep).href+'">');
  html=html.replace('</body>','<script>('+installFixture.toString()+')().catch(e=>{document.title="検査エラー";alert(e.stack);});</script></body>');
  const file=path.join(out,'activation-fixture.html');fs.writeFileSync(file,html);return file;
}
function verify(result,ready){
  for(const card of result.cards){
    assert.equal(card.label,'起動可');assert.equal(card.visible,true);
    assert.notEqual(card.display,'none');assert.notEqual(card.visibility,'hidden');assert.notEqual(card.color,'rgba(0, 0, 0, 0)');
    assert.equal(Number(card.opacity),ready?1:.4);assert.equal(card.green,ready);assert.equal(card.canUse,ready);
  }
}
async function run(){
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'vb-fixes1027e-visual-'));
  const url=pathToFileURL(fixtureFile(out)).href;console.log('可視検査ページ: '+url);
  if(process.argv.includes('--fixture'))return;
  const browser=await launch({width:1920,height:1080});
  try{
    await browser.goto(url,1800);await browser.waitFor('window.vbActivationFixture');
    for(const kind of ['祝福','祭壇','編成','魔導店','行商人']){
      const before=await browser.eval(`return await vbActivationFixture.enter(${JSON.stringify(kind)});`);
      const locked=kind==='祝福'||kind==='祭壇';verify(before,!locked);
      await browser.screenshot(path.join(out,kind+'-before.png'));
      if(locked){
        const drag=await browser.eval(`document.body.classList.add('dragzone-board');return vbActivationFixture.snapshot();`);verify(drag,false);
        const ghostOpacity=await browser.eval(`
          _createDragGhost(document.querySelector('#hand-slots > [data-board-idx="1"]'));
          const opacity=getComputedStyle(_dragGhostDiv.querySelector('.card-activation-ready-label')).opacity;
          _removeDragGhost();return opacity;
        `);assert.equal(Number(ghostOpacity),.4,'ドラッグゴーストも暗いラベル');
        await browser.eval(`document.body.classList.remove('dragzone-board');`);
        verify(await browser.eval('return await vbActivationFixture.complete();'),true);
        await sleep(100);await browser.screenshot(path.join(out,kind+'-after.png'));
      }
      console.log('OK '+kind+'：ラベルの可視性・不透明度・緑の発光');
    }
    const exceptions=browser.events.filter(e=>e.method==='Runtime.exceptionThrown');assert.deepEqual(exceptions,[]);
    console.log('画面検査・撮影完了: '+out);
  }finally{await browser.close();}
}
if(require.main===module)run().catch(error=>{console.error(error.stack);process.exitCode=1;});
