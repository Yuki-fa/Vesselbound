'use strict';
// 2026-10-12 利用者指定: 熟練の付与再生・カード欄・シート説明・図鑑を実Chromeで確認する。
// Chromeの実行は利用者側。--syntax-onlyでは生成するブラウザ内スクリプトも構文検査する。
const assert=require('node:assert/strict'),vm=require('node:vm');
const {sheetRows}=require('../balance_sim/sheet_data');
const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
function visibleText(root,needle){
  if(!root)return false;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(!node.textContent.includes(needle))continue;
    let visible=true;
    for(let el=node.parentElement;el;el=el.parentElement){
      const s=getComputedStyle(el);
      if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<=0){visible=false;break;}
    }
    const style=getComputedStyle(node.parentElement),range=document.createRange();range.selectNodeContents(node);
    const r=range.getBoundingClientRect();
    if(visible&&style.color!=='rgba(0, 0, 0, 0)'&&r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight)return true;
  }
  return false;
}
function hoverPoint(selector){
  const el=document.querySelector(selector);
  if(!el?.hasAttribute('data-preview'))throw new Error('ホバーの受け口がない: '+selector);
  const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  const hit=document.elementFromPoint(x,y);
  // 2026-10-12 第2回Chrome検査修正: 座標だけでは、手札領域やタイトルが入力を遮る状態を検出できない。
  // 実際の入力先も必須にし、合成イベントやCSSの上書きでホバーを成立させない。
  if(!(r.width>0&&r.height>0&&x>0&&x<innerWidth&&y>0&&y<innerHeight&&hit&&(hit===el||el.contains(hit)))){
    const describe=node=>node?{tag:node.tagName,id:node.id,className:node.className}:null;
    throw new Error('ホバー対象に入力が届かない: '+JSON.stringify({selector,x,y,
      hit:describe(hit),layers:document.elementsFromPoint(x,y).slice(0,6).map(describe)}));
  }
  return {selector,x,y,width:r.width,height:r.height};
}
async function battleCase(online,side,merged,grace,rows,hoverPoint){
  initState();G._debugMode=true;G.phase='battle';G._coreDrivenBattle=true;G._savedBattleReplaying=true;
  window.VB_OPTION_SPEED='normal';
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  const screen=document.getElementById('scr-battle');screen.classList.add('active');screen.style.setProperty('display','block','important');document.body.className='test-battle-active';
  const other=side==='p1'?'p2':'p1',walkerRow=rows.find(r=>r['No.']==='C093'),graceRow=rows.find(r=>r['No.']==='E039');
  const walkerDesc=walkerRow[merged?'合体効果':'効果'],graceDesc=graceRow[grace?'合体効果':'効果'];
  const u=(id,extra={})=>({id,name:id,no:'C093',atk:20,hp:100,maxHp:100,lane:'front',color:'紫',keywords:[],desc:'',_panelSummoned:true,...extra});
  const state=createBattleState({sides:{[side]:{units:[u('walker',{name:walkerRow['名前'],desc:walkerDesc,
    effectData:{effectNames:['恩寵'],effectTexts:[graceDesc]}}),u('recipient')]},[other]:{units:[u('other',{color:'赤'})]}}});
  const before=structuredClone(state.units),events=[],rng=createSeededRng(1012),emit=e=>events.push(e);
  const hit=(a,b,n,c,ss,st,opt)=>coreResolveHit(state,a,b,n,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...(opt||{})});
  coreRunOpening(state,rng,emit,hit,()=>{});
  if(online){
    const out={events,formations:Object.fromEntries(['p1','p2'].map(s=>[s,{units:structuredClone(before[s]),rings:[],items:[]}]))};
    beginOnlineVersusField(out);await playOnlineBattleEvents(out,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});
  }else{
    G.allies=state.units.p1;G.enemies=state.units.p2;initializeBattlePresentationState();
    for(const s of ['p1','p2'])for(const unit of state.units[s]){
      const old=before[s].find(x=>x.id===unit.id);presentHoldShown(unit,old.atk,old.hp,old.maxHp,old.shield||0);
    }
    renderAll();
    actionBannerSetBattleData({units:state.units,rings:state.rings,items:state.items});
    await _flushCorePveHitEvents(state,events,new Set([...state.units.p1,...state.units.p2]));
    for(const s of ['p1','p2'])for(const unit of state.units[s])presentReleaseShown(unit);
  }
  // 2026-10-12 第2回Chrome検査修正: 通常の描画経路で手札・操作領域も戦闘状態へ同期する。
  // フィールドだけを描いて、起動直後の手札・操作領域の表示状態を残さない。
  renderAll();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const target=(side==='p1'?G.allies:G.enemies).find(x=>x.id==='recipient');
  const expected=Number(walkerDesc.match(/熟練(\d+)/)[1])*(1+Number(graceDesc.match(/(\d+)回追加/)[1]));
  // 2026-10-12 第1回Chrome検査修正: 戦闘カードの.slot-descは既存仕様で非表示。
  // 所持欄は実際のホバー窓#kw-tooltipで検査し、別窓#keyword-tooltipは編成カードで検査する。
  return {amount:coreKeywordSum(target,'熟練'),expected,keywords:target.keywords,
    hover:hoverPoint('.slot[data-unit-id="recipient"]'),asset:getKeywordEffectVfxPath('熟練')};
}
async function prepareCardCase(keywords,hoverPoint){
  initState();G._debugMode=true;G.phase='reward';G.gold=10000;
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  const screen=document.getElementById('scr-battle');screen.classList.add('active');screen.style.setProperty('display','block','important');
  document.body.className='reward-screen-active debug-mode';
  const def=PANEL_POOL.find(p=>p.no==='C093'),card=makePanel(def.id);
  // 付与後のキーワードを持つカードの表示用入力。属性や説明窓は本体の描画関数が生成する。
  card.keywords=[...keywords];card.desc='';
  G.mainBoard.fill(null);G.mainBoard[1]=card;G.mapPanelPowers={1:'summon'};
  renderAll();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const selector='#hand-slots.board-slots > .card[data-board-idx="1"]',el=document.querySelector(selector);
  if(!el?.hasAttribute('data-keyword-preview'))throw new Error('熟練の編成カードにキーワード説明の受け口がない');
  return hoverPoint(selector);
}
async function inspectHover(expected,keywordWindow,point,visibleText){
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const cardTip=document.getElementById('kw-tooltip'),owned=cardTip?.querySelector('.preview-owned-keywords');
  const keywordTip=document.getElementById('keyword-tooltip'),description=KW_DESC_MAP['熟練'];
  return {hovered:!!document.querySelector(point.selector)?.matches(':hover'),
    cardVisible:visibleText(owned,'熟練'+expected),cardText:owned?.textContent||'',cardTooltip:cardTip?.textContent||'',
    tooltipVisible:!keywordWindow||visibleText(keywordTip,description),description,tooltip:keywordTip?.textContent||''};
}
async function collectionCase(visibleText){
  initState();G._debugMode=false;
  // 2026-10-12 第3回Chrome検査修正: 通常ラン未開始ではSaveProfileの取得記録が無効。
  // 正式な開始APIでランを作り、取得・選択が成功したことを確かめてから説明の可視性を検査する。
  SaveRun.begin();
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  document.getElementById('scr-title').classList.add('active');
  for(const code of ['C093','E052']){
    const card=PANEL_POOL.find(p=>p.no===code);
    if(!card||!SaveProfile.markCardAcquired(card)||!SaveProfile.collectionState(card).acquired){
      throw new Error('図鑑の取得状態を準備できない: '+code);
    }
  }
  openCollection();await new Promise(r=>setTimeout(r,600));
  const result=[];
  const mergeEnabled=PANEL_MERGE_TRIAL.enabled;
  _collectionRenderDetail();
  if(getComputedStyle(document.getElementById('collection-merge')).display!=='none')throw Error('合体停止中に図鑑の合体ボタンが出る');
  // 既存の合体済みカードの本文も引き続き検証するため、ここだけ復帰する。
  PANEL_MERGE_TRIAL.enabled=true;
  for(const kind of ['character','enchant']){
    _collectionKind=kind;_collectionMerged=false;_collectionRender();
    const code=kind==='character'?'C093':'E052',cards=_collectionDefinitions(kind),index=cards.findIndex(p=>p.no===code);
    const cell=document.querySelector('.collection-grid-cell[data-collection-index="'+index+'"]');
    if(!cell||cell.disabled)throw new Error('図鑑のカードが選択できない: '+code);
    cell.click();
    if(_collectionSelected!==index)throw new Error('図鑑のカード選択が反映されていない: '+code);
    const original=cards[index];
    for(const merged of [false,true]){
      _collectionMerged=merged;_collectionRenderDetail();
      const card=_collectionDisplayCard(original),expected=String(card.desc||'');
      const desc=document.getElementById('collection-card-desc');
      result.push({code,merged,expected,visible:visibleText(desc,kind==='character'?'熟練'+(merged?3:1):'戦闘修正の値'),text:desc.textContent});
    }
  }
  PANEL_MERGE_TRIAL.enabled=mergeEnabled;closeCollection();return result;
}
const rows=[...sheetRows('card'),...sheetRows('enchant')].filter(r=>['C093','E039','E052'].includes(r['No.']));
const makeBattle=(online,side,merged,grace)=>`return await (${battleCase.toString()})(${online},${JSON.stringify(side)},${merged},${grace},${JSON.stringify(rows)},${hoverPoint.toString()});`;
const makeCollection=()=>`return await (${collectionCase.toString()})(${visibleText.toString()});`;
const makeCard=keywords=>`return await (${prepareCardCase.toString()})(${JSON.stringify(keywords)},${hoverPoint.toString()});`;
const makeHover=(expected,keywordWindow,point)=>`return await (${inspectHover.toString()})(${expected},${keywordWindow},${JSON.stringify(point)},${visibleText.toString()});`;
for(const online of [false,true])for(const side of ['p1','p2'])for(const merged of [false,true])for(const grace of [false,true]){
  new vm.Script('(async()=>{'+makeBattle(online,side,merged,grace)+'})');
}
new vm.Script('(async()=>{'+makeCollection()+'})');
new vm.Script('(async()=>{'+makeCard(['熟練2'])+'})');
for(const keywordWindow of [false,true])new vm.Script('(async()=>{'+makeHover(2,keywordWindow,{selector:'.syntax-only'})+'})');
if(process.argv.includes('--syntax-only'))console.log('OK Chrome検査スクリプト構文: 16戦闘・編成カードの実ホバー＋図鑑');
else (async()=>{
  const b=await launch({width:1920,height:1080});
  const openPage=async()=>{
    await b.goto(URL);await b.waitFor('typeof PANEL_POOL!=="undefined"&&PANEL_POOL.some(c=>c.no==="C093"&&c._sheetSeen)',20000);
    // 2026-10-12 第2回Chrome検査修正: 通常のタイトル表示まで進め、盤面作成後にタイトルを再表示する起動タイマーを残さない。
    await b.eval('_revealTitleMenu();');
    await b.waitFor('document.getElementById("scr-title").classList.contains("startup-menu-ready")&&Number(getComputedStyle(document.getElementById("scr-loading")).opacity)===0',5000);
  };
  const hover=async point=>{
    assert.ok(point.width>0&&point.height>0&&point.x>0&&point.x<1920&&point.y>0&&point.y<1080,'ホバー対象が画面内にない: '+JSON.stringify(point));
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});
    await b.call('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
  };
  try{
    for(const online of [false,true])for(const side of ['p1','p2'])for(const merged of [false,true])for(const grace of [false,true]){
      await openPage();
      const result=await b.eval(makeBattle(online,side,merged,grace));
      assert.equal(result.amount,result.expected,JSON.stringify(result));
      assert.equal(result.asset,'','熟練が旧弱体のVFXを再生');
      assert.equal(result.keywords.filter(k=>/^熟練\d+$/.test(k)).length,1,'重複付与の合算表示');
      await hover(result.hover);
      const battleHover=await b.eval(makeHover(result.expected,false,result.hover));
      assert.ok(battleHover.hovered&&battleHover.cardVisible,JSON.stringify({online,side,merged,grace,result,battleHover}));
      const point=await b.eval(makeCard(result.keywords));await hover(point);
      const cardHover=await b.eval(makeHover(result.expected,true,point));
      assert.ok(cardHover.hovered&&cardHover.cardVisible&&cardHover.tooltipVisible,JSON.stringify({online,side,merged,grace,result,cardHover}));
      assert.equal(cardHover.description,sheetRows('keyword').find(r=>r['名前']==='熟練')['効果']);
    }
    await openPage();
    const result=await b.eval(makeCollection());assert.ok(result.every(x=>x.visible),JSON.stringify(result));
    assert.deepEqual(result.map(x=>x.expected),[rows[0]['効果'],rows[0]['合体効果'],rows.find(r=>r['No.']==='E052')['効果'],rows.find(r=>r['No.']==='E052')['合体効果']]);
    assert.deepEqual(await b.consoleErrors(),[]);
    console.log('OK 熟練Chrome: PvE/オンライン×両陣営×通常/合体×恩寵、実表示・色・不透明度・位置・図鑑');
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
