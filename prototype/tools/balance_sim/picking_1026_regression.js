'use strict';
// 本番の選択・描画の受け口・取得・施設在庫・保存を内蔵CSVで通す。
// 暗転と発光の実際の合成は picking_1026_visual_check.js で検査する。
const assert=require('node:assert/strict'),fs=require('node:fs');
const {makeElement}=require('./stub');
const handlers={};
document.addEventListener=(type,fn)=>{(handlers[type]||=[]).push(fn);};
require('./load');
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
function element(tag='div'){
  const el=makeElement(tag),classes=new Set(),props=new Map(),attrs=new Map();
  Object.defineProperty(el,'className',{get:()=>[...classes].join(' '),set:s=>{classes.clear();String(s).split(/\s+/).filter(Boolean).forEach(c=>classes.add(c));}});
  el.classList={add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),contains:c=>classes.has(c),
    toggle:(c,on=!classes.has(c))=>{on?classes.add(c):classes.delete(c);return on;}};
  el.style={setProperty:(k,v)=>props.set(k,String(v)),getPropertyValue:k=>props.get(k)||'',removeProperty:k=>props.delete(k)};
  el.setAttribute=(k,v)=>attrs.set(k,String(v));el.getAttribute=k=>attrs.get(k)||null;el.removeAttribute=k=>attrs.delete(k);
  el.appendChild=c=>{c.parentElement=el;c.parentNode=el;el.children.push(c);return c;};
  el.insertBefore=c=>{c.parentElement=el;c.parentNode=el;el.children.unshift(c);return c;};
  el.remove=()=>{if(el.parentElement)el.parentElement.children=el.parentElement.children.filter(c=>c!==el);};
  el.matches=s=>s.split(',').some(part=>{const names=[...part.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);return names.length&&names.every(c=>classes.has(c));});
  el.querySelectorAll=s=>el.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);
  el.querySelector=s=>el.querySelectorAll(s)[0]||null;
  Object.defineProperty(el,'innerHTML',{get:()=>'',set:()=>{el.children.length=0;}});
  return el;
}
const section=element(),row=element(),itemSlots=Array.from({length:4},()=>element('i'));
let boardNodes=[];
const card=(no,enhanced=false)=>{const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);const c=makePanel(def.id);return enhanced?enhancedPanelCopy(c):c;};
const item=no=>makeItem(ITEM_POOL.find(c=>'I'+String(c.no).padStart(3,'0')===no).id,2);
function fresh(){
  initState();SaveRun.begin();Object.assign(G,{phase:'reward',_wave:1,_waveStage:1,_waveLife:3,gold:1000,_freeRewardPanelMode:true});
  G.mainBoard.fill(null);G.spellSlots.fill(null);_rewCards=[];_rewFreePickDone=false;_pendingCardActivation=null;_blessingFlameVisit=null;
  document.body.className='reward-screen-active';_refreshTargetPicking();
}
function drawBoard(){
  _syncItemUsePickingUi();
  boardNodes=G.mainBoard.map((c,i)=>{if(!c)return null;const el=element();el.classList.add('card');_wireHeCardControls(el,c,'boardCards',i);return el;});
}
function use(no){G.spellSlots[0]=item(no);assert.equal(_useImmediateItem(0,G.spellSlots[0]),true);assert.ok(G._pendingItemUse);}
function activate(no,enhanced=false){const source=G.mainBoard[1]=card(no,enhanced);source._activationReady=true;assert.equal(cardActivationClick(1),true);return source;}
function click(el){assert.ok(el&&typeof el.onclick==='function');el.onclick({stopPropagation(){}});}
function event(type,extra={}){
  const e={button:0,key:'',target:{closest:()=>null},prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
  const fn=(handlers[type]||[]).find(f=>f.toString().includes('_targetPickingActive'));
  assert.ok(fn,type);fn(e);return e;
}
function offered(index=0){return row.children.find(n=>n.dataset.mergeRewIdx===String(index));}
function take(index=0,slot=10){takeRewCard(index,slot);assert.ok(G.mainBoard[slot]);return G.mainBoard[slot];}
function saveBoard(){
  // その報酬画面だけの返却先は既存の保存対象外。カードの実体と永続効果を比べる。
  const permanent=list=>JSON.parse(JSON.stringify(list,(key,value)=>key.startsWith('_rewardReturn')?undefined:value));
  const before=permanent(G.mainBoard);SaveRun.restoreRunState(clone(SaveRun.buildRunSave('reward')));assert.deepEqual(permanent(G.mainBoard),before);
}
(async()=>{
  console.table=()=>{};await loadGameData();
  document.createElement=element;document.body=element('body');document.documentElement=element('html');
  document.getElementById=id=>id==='reward-offer-section'?section:id==='reward-offer-row'?row:null;
  document.querySelectorAll=selector=>selector==='.reward-prod-item .reward-prod-slots i'?itemSlots:[];
  document.querySelector=selector=>{const m=selector.match(/data-merge-rew-idx="(\d+)"/);return m?offered(Number(m[1])):null;};
  applyCardVisual=()=>{};global.getComputedStyle=el=>el.style;
  renderHandEditor=drawBoard;renderFieldEditor=renderMoveSlotsInEnemy=updateHUD=_storeRewardStartSnapshot=_syncRewardProductionUi=_playActivationFx=_playItemUseVfx=()=>{};
  await check('共通の暗転・発光停止は対象選びのCSSに閉じ、報酬説明・取消ボタン・報酬の非表示を廃止',()=>{
    const html=fs.readFileSync(require.resolve('../../index.html'),'utf8');
    assert.doesNotMatch(html,/--item-use-(?:title|desc)|\.item-use-cancel-btn|item-use-picking[^\n]*#reward-offer-row\{display:none/);
    const css=html.slice(html.indexOf('/* アイテム使用中・起動の対象選び中'));
    for(const token of ['#board-drag-overlay','pointer-events:auto','box-shadow:none','animation:none','.picking-first','rgba(145,214,255,.9)','#hand-pane-board-bg'])assert.ok(css.includes(token),token);
  });
  await check('アイテム：魔導板・報酬・商品の対象だけを操作でき、使用元は明るくホバーを保持。空振り・ドラッグで解除しない',()=>{
    fresh();G.mainBoard[3]=card('C006');G.mainBoard[2]=card('E001');_rewCards=[card('C007'),card('E001')];use('I018');
    assert.ok(document.body.classList.contains('item-use-picking'));assert.ok(boardNodes[3].classList.contains('item-target-ok'));
    assert.ok(boardNodes[2].classList.contains('item-target-disabled'));assert.ok(offered(0).classList.contains('item-target-ok'));
    assert.ok(offered(1).classList.contains('item-target-disabled'));assert.ok(itemSlots[0].classList.contains('picking-source'));
    assert.ok(itemSlots[0].getAttribute('data-preview'));assert.equal(itemSlots[0].draggable,false);assert.equal(offered(0).draggable,false);
    assert.equal(event('pointerdown').prevented,true);assert.ok(G._pendingItemUse);
    assert.equal(event('click').stopped,true);assert.ok(G._pendingItemUse);
    assert.equal(event('dragstart').stopped,true);assert.ok(G._pendingItemUse);
    click(itemSlots[0]);assert.equal(G._pendingItemUse,null);assert.ok(G.spellSlots[0]);assert.ok(!document.body.classList.contains('item-use-picking'));
  });
  for(const no of ['C080','C084','C109','C116'])await check(no+'：起動直後に共通の暗転・対象表示、発生元の再クリックで使用せず取り消し',()=>{
    fresh();G.mainBoard[3]=card('C006');_rewCards=[card('C007')];const source=activate(no);
    assert.ok(document.body.classList.contains('activation-picking'));assert.ok(boardNodes[1].classList.contains('picking-source'));
    assert.ok(boardNodes[1].getAttribute('data-preview')||boardNodes[1].children.some(n=>n.className==='card-activation-ready-label'));
    assert.ok(offered(0).classList.contains('item-target-ok'));click(boardNodes[1]);assert.equal(_pendingCardActivation,null);assert.ok(source._activationReady);
    assert.ok(!document.body.classList.contains('activation-picking'));
  });
  await check('マモン：本人以外の魔導板・報酬は無効。所持アイテムだけ選べ、空アイテム枠は暗転対象にしない',()=>{
    fresh();G.mainBoard[3]=card('C006');_rewCards=[card('C007')];G.spellSlots[0]=item('I018');const source=activate('C003');
    assert.ok(document.body.classList.contains('activation-picking-item'));assert.ok(boardNodes[3].classList.contains('item-target-disabled'));
    assert.ok(offered(0).classList.contains('item-target-disabled'));assert.ok(!itemSlots[0].classList.contains('activation-target-disabled'));
    assert.ok(itemSlots.slice(1).every(n=>!n.classList.contains('activation-target-disabled')));assert.equal(cardActivationItemSlotDimmed(null),false);
    const gold=G.gold;click(itemSlots[0]);assert.equal(G.spellSlots[0],null);assert.equal(G.gold-gold,Number(source.desc.match(/(\d+)G/)[1]));assert.equal(_pendingCardActivation,null);
  });
  for(const kind of ['item','activation'])for(const cancel of ['contextmenu','keydown'])await check(kind+'：'+cancel+'で解除し、右クリックのカード非表示へ漏らさない',()=>{
    fresh();G.mainBoard[3]=card('C006');if(kind==='item')use('I018');else activate('C109');
    const before=G.mainBoard[3];event('pointerdown',{button:2});assert.ok(_targetPickingActive());
    const e=event(cancel,{button:2,key:'Escape'});assert.ok(e.prevented&&e.stopped);assert.ok(!_targetPickingActive());
    assert.equal(G.mainBoard[3],before);assert.ok(!document.body.classList.contains('right-card-peek'));
  });
  for(const mode of ['I002','I008','C080','C084'])for(const zone of ['board','reward','shop'])await check(mode+'/'+zone+'：1枚目は未適用・青白の選択印、同じカードで解除し、2枚目で1回実行',()=>{
    fresh();G.mainBoard[3]=card('C006');G.mainBoard[8]=card('C007');
    if(zone!=='board'){_rewCards=[G.mainBoard[3],G.mainBoard[8]];G.mainBoard[3]=G.mainBoard[8]=null;}
    if(zone==='shop')G._isShop=true;
    const first=zone==='board'?G.mainBoard[3]:_rewCards[0],second=zone==='board'?G.mainBoard[8]:_rewCards[1],before=[first.power,first.life,second.power,second.life];
    if(mode[0]==='I')use(mode);else activate(mode,mode==='C084');
    const getFirst=()=>zone==='board'?boardNodes[3]:offered(0),getSecond=()=>zone==='board'?boardNodes[8]:offered(1);
    click(getFirst());assert.ok(getFirst().classList.contains('picking-first'));assert.deepEqual([first.power,first.life,second.power,second.life],before);
    click(getFirst());assert.ok(!getFirst().classList.contains('picking-first'));assert.ok(_targetPickingActive());assert.ok(!(G._pendingItemUse||_pendingCardActivation).firstTarget);
    click(getFirst());click(getSecond());assert.ok(!_targetPickingActive());
    if(mode==='I002')assert.equal((zone==='board'?G.mainBoard[3]:_rewCards[0]).no,second.no);
    else if(mode==='C080')assert.equal((zone==='board'?G.mainBoard[3]:_rewCards[0]).no,second.no);
    else assert.deepEqual([first.power,first.life,second.power,second.life],[before[2],before[3],before[0],before[1]]);
    assert.equal(mode[0]==='I'?G.spellSlots[0]:G.mainBoard[1]._activationReady,mode[0]==='I'?null:undefined);
  });
  for(const shop of [false,true])for(const no of ['I005','I018','I015','I013'])await check(no+'/'+(shop?'商品':'報酬')+'：取得前の強化・キーワード・ポートが在庫と取得後とセーブに残る',()=>{
    fresh();G._rewardOnePickMode=!shop;G._isShop=shop;G._freeRewardPanelMode=!shop;
    G.mainBoard[3]=card('C008');const offer=card('C006');offer.directions=['up'];offer.directionCount=1;
    if(!shop)Object.assign(offer,{_isOriginalReward:true,_buyPrice:0});
    _rewCards=[offer,card('C007')];const stats=[offer.power,offer.life];use(no);click(offered(0));
    assert.ok(offer._itemBuffed);if(no==='I005')assert.ok(offer.power>stats[0]&&offer.life>stats[1]);
    if(no==='I018')assert.ok(offer.keywords.includes(item(no).desc.match(/に(.+?)を与える/)[1]));
    if(no==='I015')assert.ok(offer._itemKeywordBonuses);if(no==='I013')assert.equal(offer.directionCount,2);
    assert.equal(_rewFreePickDone,false);const expected=clone(offer),gold=G.gold;
    if(shop){assert.deepEqual(G._waveShopStock[1][0],offer);assert.equal(exchangeShopCard(0,3),true);}else take(0,10);
    const acquired=G.mainBoard[shop?3:10];for(const key of ['power','life','keywords','directions','_itemKeywordBonuses'])assert.deepEqual(acquired[key],expected[key],key);
    assert.equal(G.gold,gold);if(!shop){assert.equal(_rewFreePickDone,true);takeRewCard(0,12);assert.equal(G.mainBoard[12],null);}
    saveBoard();
  });
  for(const shop of [false,true])for(const no of ['I002','C084','C109'])await check(no+'/'+(shop?'価格付き商品':'報酬')+'：変身・能力交換・起動強化も取得時の価格と1枚制限を保持',()=>{
    fresh();G._isShop=shop;G._onlineMode=shop;G._isRewardTown=shop;G._freeRewardPanelMode=!shop;G._rewardOnePickMode=!shop;
    const offer=card('C006');Object.assign(offer,{_buyPrice:shop?180:0,_isOriginalReward:!shop});_rewCards=[offer,card('C007')];
    const cost=offer._buyPrice,gold=G.gold;
    if(no==='I002'){G.mainBoard[3]=card('C008');use(no);click(offered(0));click(boardNodes[3]);assert.equal(_rewCards[0].no,'C008');}
    else{G.mainBoard[3]=card('C008');activate(no);click(offered(0));}
    const changed=clone(_rewCards[0]);assert.equal(changed._buyPrice,cost);assert.equal(changed._isOriginalReward,!shop);assert.equal(_rewFreePickDone,false);
    if(shop)assert.deepEqual(G._waveShopStock[1][0],_rewCards[0]);
    const acquired=take();assert.equal(acquired.no,changed.no);assert.deepEqual([acquired.power,acquired.life,acquired.keywords],[changed.power,changed.life,changed.keywords]);
    assert.equal(G.gold,gold-cost);if(!shop){assert.equal(_rewFreePickDone,true);takeRewCard(0,12);assert.equal(G.mainBoard[12],null);}saveBoard();
  });
  await check('変身型起動の共通経路：報酬・価格付き商品を書き換え、同じ添字の魔導板を変えず取得後も残る',()=>{
    for(const shop of [false,true]){
      fresh();G._isShop=shop;G._onlineMode=shop;G._isRewardTown=shop;G._freeRewardPanelMode=!shop;G._rewardOnePickMode=!shop;
      _rewCards=[{...card('C006'),_buyPrice:shop?180:0,_isOriginalReward:!shop}];
      // 現行カードの変身は巻物が担当。既存コアが対応する起動の受け口も本文だけで検査する。
      const source=G.mainBoard[1]=card('C084');source.desc='起動：対象のキャラクターを同じレアリティの別のキャラクターに変身させる。';source._activationReady=true;
      const oldBoard=G.mainBoard[0],oldNo=_rewCards[0].no;
      cardActivationClick(1);click(offered(0));assert.notEqual(_rewCards[0].no,oldNo);assert.equal(G.mainBoard[0],oldBoard);assert.ok(!source._activationReady);
      const result=clone(_rewCards[0]);assert.equal(result._buyPrice,shop?180:0);const acquired=take();assert.equal(acquired.no,result.no);saveBoard();
    }
  });
  await check('1枚取得済みでも残った報酬を対象にできるが、追加取得はできない。依頼品・対象外・重複キーワードは無効',()=>{
    fresh();G._rewardOnePickMode=true;_rewFreePickDone=true;
    _rewCards=[{...card('C006'),_isOriginalReward:true,_buyPrice:0},{...card('C007'),_questOfferCard:true},card('E001')];
    const keyword=item('I018').desc.match(/に(.+?)を与える/)[1];G.mainBoard[3]={...card('C008'),keywords:[keyword]};use('I018');
    assert.ok(offered(0).classList.contains('item-target-ok'));assert.ok(!offered(0).classList.contains('reward-used-dim'));
    assert.ok(offered(1).classList.contains('item-target-disabled'));assert.ok(offered(2).classList.contains('item-target-disabled'));assert.ok(boardNodes[3].classList.contains('item-target-disabled'));
    click(offered(0));assert.ok(_rewFreePickDone);takeRewCard(0,10);assert.equal(G.mainBoard[10],null);
    assert.ok(offered(0).classList.contains('reward-used-dim'));
  });
  await check('候補が報酬だけでも使用可。古くなった1枚目へ別カードを上書きせず、取り消しで実体を入れ替えない',()=>{
    fresh();_rewCards=[card('C006'),card('C007')];assert.equal(_canUseItemNow(item('I002')),true);use('I002');click(offered(0));
    const other=_rewCards[0]=card('C008');handlePendingItemRewardTarget(1);assert.equal(_rewCards[0],other);assert.ok(G._pendingItemUse);_cancelPendingItemUse();assert.equal(_rewCards[0],other);
  });
  await check('商品を変身させて店の在庫を読み直しても、報酬の常時強化を二重適用しない',()=>{
    fresh();G._isShop=true;G.runEffects={...(G.runEffects||{}),rewardBuff:{atk:2,hp:3}};
    _rewCards=applyRewardCharacterEffects([card('C006'),card('C007'),card('C009')].map(_exchangeShopCardCopy));
    G.mainBoard[3]=card('C008');use('I002');click(offered(0));click(boardNodes[3]);
    const expected=clone(_rewCards[0]),stock=_ensureWaveShopStock();
    assert.equal(stock[0].no,expected.no);assert.ok(!('_buyPrice' in stock[0]));assert.deepEqual([stock[0].power,stock[0].life],[expected.power,expected.life]);assert.deepEqual(stock[0]._rewardGrowthApplied,{atk:2,hp:3});
  });
  await check('必須カードを変身させた時は従来のクエスト消失通知へ一度だけ返す',()=>{
    fresh();const required=G.mainBoard[3]=card('C006');G.mainBoard[8]=card('C007');
    const old={questRequiredEntryOnBoard,questRequiredCardGone,questOnRequiredCardDestroyed};let notified=0;
    try{
      questRequiredEntryOnBoard=()=>required;questRequiredCardGone=()=>G.mainBoard[3]!==required;
      questOnRequiredCardDestroyed=entry=>{assert.equal(entry,required);notified++;};
      use('I002');click(boardNodes[3]);assert.equal(notified,0);click(boardNodes[8]);assert.equal(notified,1);
    }finally{Object.assign(globalThis,old);}
  });
  console.log(`picking_1026: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
