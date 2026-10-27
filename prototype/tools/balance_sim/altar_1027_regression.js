'use strict';
// 内蔵CSVと本番のクリック・ドロップ・選択・保存を通す。画面の合成は別途ブラウザで確認する。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {makeElement}=require('./stub');
require('./load');
let passed=0,failed=0,confirmation=null,sounds=[],boardNodes=[];
const noop=()=>{};
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
function element(tag='div'){
  const el=makeElement(tag),classes=new Set(),values=new Map(),attrs=new Map(),events={};
  Object.defineProperty(el,'className',{get:()=>[...classes].join(' '),set:s=>{classes.clear();String(s).split(/\s+/).filter(Boolean).forEach(c=>classes.add(c));}});
  el.classList={add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),contains:c=>classes.has(c),
    toggle:(c,on=!classes.has(c))=>{on?classes.add(c):classes.delete(c);return on;}};
  el.style={setProperty:(k,v)=>values.set(k,String(v)),getPropertyValue:k=>values.get(k)||'',removeProperty:k=>values.delete(k)};
  el.setAttribute=(k,v)=>attrs.set(k,String(v));el.getAttribute=k=>attrs.get(k)||null;el.removeAttribute=k=>attrs.delete(k);
  el.appendChild=c=>{el.children.push(c);c.parentElement=el;return c;};
  el.addEventListener=(type,fn)=>{(events[type]||=[]).push(fn);};
  el.fire=(type,extra={})=>{const e={stopPropagation:noop,preventDefault:noop,dataTransfer:{setDragImage:noop},...extra};(events[type]||[]).forEach(fn=>fn(e));};
  return el;
}
const row=element(),moves=element(),ringSlots=Array.from({length:4},()=>element('i'));
const panel=(no,enhanced=false)=>{const d=PANEL_POOL.find(c=>c.no===no);assert.ok(d,no);const c=makePanel(d.id);return enhanced?enhancedPanelCopy(c):c;};
const item=no=>{const d=ITEM_POOL.find(c=>'I'+String(c.no).padStart(3,'0')===no);assert.ok(d,no);return makeItem(d.id,2);};
function drawBoard(){
  boardNodes=G.mainBoard.map((card,i)=>{
    if(!card)return null;
    const el=element();el.classList.add('card','invalid-battle-position','board-hp-zero');
    _wireHeCardControls(el,card,'boardCards',i);return el;
  });
}
function drawRings(){row.children=[];if(G._ringOfferPhase)_renderRingOfferCards(row);}
function click(el){assert.ok(el&&typeof el.onclick==='function');el.onclick({stopPropagation:noop});}
function fresh(){
  initState();SaveRun.begin();Object.assign(G,{phase:'reward',_wave:2,_waveStage:2,_waveLife:2,life:2,gold:1000,
    _freeRewardPanelMode:true,_rewardOnePickMode:true});
  G.mainBoard.fill(null);G.spellSlots.fill(null);_rewCards=[];_rewFreePickDone=false;
  _pendingCardActivation=null;_blessingFlameVisit=null;confirmation=null;sounds=[];moves.children=[];
}
function altar(){
  fresh();Object.assign(G,{_isRingExchange:true,_isWaveAltar:true,_ringOfferPhase:true,_ringOffer:RING_POOL.slice(0,3).map(clone)});
  G.mainBoard[0]=panel('E041');G.mainBoard[1]=panel('E064');G.mainBoard[2]=panel('C057');G.mainBoard[3]=panel('C006');
  _storeRewardStartSnapshot();drawBoard();drawRings();_syncRewardProductionRings();
}
function selectThree(){for(const i of [0,1,2])click(boardNodes[i]);}
const count=()=>G.mainBoard.filter(Boolean).length;
const confirmSource=fs.readFileSync(require.resolve('../../js/engine/game_confirm.js'),'utf8');
(async()=>{
  console.table=noop;await loadGameData();
  document.createElement=element;document.body=element('body');document.documentElement=element('html');
  document.getElementById=id=>id==='reward-move-btns'?moves:null;
  document.querySelectorAll=s=>s==='.reward-prod-ring .reward-prod-slots i'?ringSlots:[];
  renderHandEditor=drawBoard;renderRewCards=drawRings;
  renderFieldEditor=updateHUD=_syncRewardProductionUi=_playActivationFx=_playItemUseVfx=_playItemSlotVfx=noop;
  _removeDragGhost=_clearDragZoneClass=_createDragGhost=_setDragZoneClass=noop;
  _playRewardAcquireSfx=s=>sounds.push(s);
  const productionMoves=renderMoveSlotsInEnemy;renderMoveSlotsInEnemy=noop;
  showGameConfirm=opts=>{confirmation=opts;};
  await check('祭壇の選択印は2枚選ぶアイテムと同じCSSを共有し、通常発光の抑制で消されない',()=>{
    const html=fs.readFileSync(require.resolve('../../index.html'),'utf8');
    assert.match(html,/:is\(\.item-use-picking,\.activation-picking,\.ring-offer-selecting\)[^{]*\.picking-first\{\s*box-shadow:0 0 12px 3px #effaff,0 0 30px 9px rgba\(145,214,255,\.9\)!important/);
    assert.ok(html.includes('#hand-slots.board-slots > .card:not(.picking-first),'));
  });
  await check('祭壇：1枚ずつ選択し、カードもライフもゴールドもアイテムも変えない。選択数に応じた音',()=>{
    altar();const before=clone(G.mainBoard);
    for(const [n,i]of [0,1,2].entries()){
      click(boardNodes[i]);assert.equal(count(),4);assert.deepEqual(G.mainBoard,before);
      assert.deepEqual(G._ringOfferSelectedSlots,Array.from({length:n+1},(_,k)=>k));
      assert.ok(boardNodes[i].classList.contains('picking-first'));assert.equal(G._ringOfferUnlocked,n===2);
      assert.equal(row.children[0].draggable,n===2);assert.equal(row.children[0].classList.contains('ring-offer-locked'),n!==2);
      assert.equal(G._waveLife,2);assert.equal(G.gold,1000);assert.ok(G.spellSlots.every(c=>!c));
    }
    assert.deepEqual(sounds,['ring_get1.wav','ring_get2.wav','ring_get3.wav']);
  });
  await check('祭壇：3枚選ぶと他のカードを選べず、選択カードの再クリックで解除し指輪を再ロック',()=>{
    altar();selectThree();assert.ok(boardNodes[3].classList.contains('item-target-disabled'));click(boardNodes[3]);
    assert.deepEqual(G._ringOfferSelectedSlots,[0,1,2]);
    click(boardNodes[1]);assert.deepEqual(G._ringOfferSelectedSlots,[0,2]);assert.equal(G._ringOfferUnlocked,false);
    assert.equal(row.children[0].draggable,false);assert.ok(boardNodes[3].classList.contains('item-target-ok'));
    click(boardNodes[3]);assert.equal(G._ringOfferUnlocked,true);assert.equal(sounds.at(-1),'ring_get3.wav');
  });
  for(const mode of ['click','drag'])await check('祭壇：'+mode+'の取得時だけ3枚を消し、回復・200G・アイテムを一度解決',()=>{
    altar();const keep=G.mainBoard[3];selectThree();
    const offered=G._ringOffer[0];
    if(mode==='click')click(row.children[0]);
    else{row.children[0].fire('dragstart');assert.deepEqual(_dragSrc,{arr:'ringOffer',idx:0});ringSlots[2].fire('drop');}
    assert.equal(count(),1);assert.equal(G.mainBoard[3],keep);assert.equal(G._waveLife,3);assert.equal(G.gold,1200);
    assert.equal(G.spellSlots.filter(Boolean).length,1);assert.equal(G.rings[mode==='click'?0:2].id,offered.id);
    assert.equal(G._ringOfferResolved,true);assert.equal(G._ringOfferUnlocked,false);assert.deepEqual(G._ringOfferSelectedSlots,[]);
    assert.equal(_takeRingOffer(0),false);assert.equal(G.gold,1200);assert.equal(sounds.at(-1),'ring_get.wav');
  });
  await check('祭壇：必要枚数不足・空き指輪枠なし・取得先が使用中ならカードも効果も確定しない',()=>{
    altar();assert.equal(_takeRingOffer(0),false);click(boardNodes[0]);assert.equal(_takeRingOffer(0),false);
    selectThree(); // 選択済みの0を一度外したので、最後に戻す。
    if(!G._ringOfferSelectedSlots.includes(0))click(boardNodes[0]);
    G.rings=G.rings.map(()=>clone(RING_POOL[0]));assert.equal(_takeRingOffer(0),false);assert.equal(_takeRingOffer(0,1),false);
    assert.equal(count(),4);assert.equal(G.gold,1000);assert.equal(G._waveLife,2);assert.equal(G._ringOfferResolved,false);
  });
  for(const enhanced of [false,true])for(const life of [2,3])await check('精霊の魂：'+(enhanced?'強化':'通常')+'、現在ライフ'+life+'は選択と解除で変わらず取得時に解決',()=>{
    altar();G._waveLife=G.life=life;G.mainBoard[0]=panel('E041',enhanced);drawBoard();
    click(boardNodes[0]);assert.equal(G._waveLife,life);assert.equal(waveLifeMax(),3);
    click(boardNodes[0]);assert.equal(G._waveLife,life);selectThree();click(row.children[0]);
    assert.equal(waveLifeMax(),enhanced?5:3);assert.equal(G._waveLife,enhanced?life+2:Math.min(3,life+1));
  });
  await check('強化精霊の魂：最大ライフの上限（6未満）で増加分だけ現在ライフを増やす',()=>{
    altar();G.ascensionLifeBonus=1;G.mainBoard[0]=panel('E041',true);drawBoard();selectThree();click(row.children[0]);
    assert.equal(waveLifeMax(),5);assert.equal(G._waveLife,3);
  });
  for(const reset of [resetRewardToStart,resetRewardPlacement])await check('祭壇：'+reset.name+'は選択だけ外し、カード・資源を巻き戻さない',()=>{
    altar();selectThree();G.mainBoard[3].power+=7;const before=clone(G.mainBoard);G.gold+=31;
    reset();assert.deepEqual(G.mainBoard,before);assert.equal(G.gold,1031);assert.equal(G._waveLife,2);
    assert.deepEqual(G._ringOfferSelectedSlots,[]);assert.equal(G._ringOfferUnlocked,false);
    click(boardNodes[0]);assert.equal(sounds.at(-1),'ring_get1.wav');
  });
  await check('祭壇：離れる時のキャンセルは選択維持、OKは選択だけ外す。入り直しても未払い',()=>{
    altar();selectThree();const before=clone(G.mainBoard);let left=0;
    _confirmRingExchangeReturn(()=>left++);assert.ok(confirmation);assert.equal(left,0);assert.equal(G._ringOfferSelectedSlots.length,3);
    confirmation.onOk();assert.equal(left,1);assert.deepEqual(G.mainBoard,before);assert.deepEqual(G._ringOfferSelectedSlots,[]);
    _syncWaveFacilityCache();assert.equal(G._waveRingExchange[_waveFacilityCacheKey()].unlocked,false);
  });
  await check('祭壇：古いセーブにリセット用の控えがなくても選択を外せる',()=>{
    altar();selectThree();delete G._rewardStartSnapshot;resetRewardToStart();
    assert.deepEqual(G._ringOfferSelectedSlots,[]);assert.equal(count(),4);assert.equal(G._ringOfferUnlocked,false);
  });
  await check('祭壇：選択中のカードを支払い済みとして二重に数えず、出発条件は実際の所持枚数で決める',()=>{
    altar();G.mainBoard.fill(null);G.mainBoard[MAIN_BOARD_DEPLOY_SLOTS[0]]=panel('C006');
    const slots=G.mainBoard.map((c,i)=>c?-1:i).filter(i=>i>=0).slice(0,2);
    slots.forEach(i=>{G.mainBoard[i]=panel('E001');});drawBoard();
    assert.equal(ringExchangeDepartureBlocked(),false);click(boardNodes[slots[0]]);
    assert.equal(ringExchangeDepartureBlocked(),false);assert.equal(count(),3);
  });
  for(const n of [1,2,3])await check('祭壇：'+n+'枚選択中の保存・読み込みで同じ選択を復元し、取得で重ねて効果を解決しない',()=>{
    altar();for(let i=0;i<n;i++)click(boardNodes[i]);const before=clone(G.mainBoard);
    const saved=clone(SaveRun.buildRunSave('reward'));SaveRun.restoreRunState(saved);drawBoard();drawRings();
    assert.deepEqual(G.mainBoard,before);assert.deepEqual(G._ringOfferSelectedSlots,Array.from({length:n},(_,i)=>i));
    assert.equal(G._ringOfferUnlocked,n===3);assert.equal(G._waveLife,2);assert.equal(G.gold,1000);
    for(let i=n;i<3;i++)click(boardNodes[i]);click(row.children[0]);
    SaveRun.restoreRunState(clone(SaveRun.buildRunSave('reward')));assert.equal(count(),1);assert.equal(G.gold,1200);assert.equal(G._waveLife,3);
  });
  await check('旧セーブ：選択フィールド欠落時は未選択。消費済みの供物と先払いライフは一度だけ戻す',()=>{
    altar();const saved=clone(SaveRun.buildRunSave('reward'));delete saved.state.choices._ringOfferSelectedSlots;
    const soul=saved.state.player.mainBoard[0];saved.state.player.mainBoard[0]=null;saved.state.player._waveLife=saved.state.player.life=3;
    Object.assign(saved.state.choices,{_ringSacrificedCards:[{idx:0,card:soul,healGain:1}],_boardDiscardCount:1,_ringOfferUnlocked:false});
    SaveRun.restoreRunState(saved);assert.ok(G.mainBoard[0]);assert.equal(G._waveLife,2);assert.deepEqual(G._ringOfferSelectedSlots,[]);
    assert.deepEqual(G._ringSacrificedCards,[]);assert.equal(G._boardDiscardCount,0);
    SaveRun.restoreRunState(clone(SaveRun.buildRunSave('reward')));assert.equal(G._waveLife,2);assert.equal(count(),4);
  });
  await check('指輪依頼：供物なしでクリック取得でき、魔導板のカードを消さない',()=>{
    altar();const original=questRingOfferActive;questRingOfferActive=()=>true;
    try{G._isRingExchange=false;G._ringOfferUnlocked=true;drawRings();click(row.children[0]);assert.equal(count(),4);assert.ok(G.rings[0]);assert.equal(G._waveLife,2);}
    finally{questRingOfferActive=original;}
  });
  const scrolls=['I003','I004','I012','I018','I019','I020','I021','I022','I023'];
  for(const no of scrolls)for(const via of ['own','enhanced','connected','passive','text','reward'])await check(no+'/'+via+'：加算できないキーワードの既得カードは暗くなり押せない',()=>{
    fresh();const use=item(no),kw=_itemGrantedKeyword(use)||({shield_scroll:'結界',vision_scroll:'復活',inspire_flag:'根性'})[_itemEffectKey(use)];
    const card=panel('C006',via==='enhanced');card.keywords=[];card.desc='';card.directions=['up','right','down','left'];G.mainBoard[3]=card;G.mainBoard[8]=panel('C007');
    if(via==='connected')G.mainBoard[2]={...panel('E001'),desc:'',adjacentKeywords:[kw],directions:['right']};
    else if(via==='passive')card.desc='常時：このキャラクターは'+kw+'を持つ。';
    else if(via==='text')card.desc=kw+'\n常時：このキャラクターは+1/+1を得る。';
    else card.keywords=[kw==='結界'?'結界3':kw];
    const zone=via==='reward'?'reward':'board',index=zone==='reward'?0:3;
    if(zone==='reward'){G.mainBoard[3]=null;_rewCards=[card];}
    const at={zone,index,card};G.spellSlots[0]=use;assert.equal(_useImmediateItem(0,use),true);
    assert.equal(_isItemUseTarget(at),false);const el=element();_wireTargetPickingCard(el,zone,index,card);
    assert.ok(el.classList.contains('item-target-disabled'));click(el);assert.ok(G._pendingItemUse);assert.equal(G.spellSlots[0],use);
  });
  for(const no of ['I015','I016','I017','I024'])await check(no+'：数値を加算するキーワードは接続で持っていても再付与できる',()=>{
    fresh();const use=item(no),kw=_itemGrantedKeyword(use);G.mainBoard[3]=panel('C006');G.mainBoard[3].keywords=[kw];G.mainBoard[3].directions=['left'];
    G.mainBoard[2]={...panel('E001'),desc:'',adjacentKeywords:[kw],directions:['right']};G.spellSlots[0]=use;
    assert.equal(_useImmediateItem(0,use),true);assert.ok(_isItemUseTargetSlot(3));click(boardNodes[3]);assert.equal(G.spellSlots[0],null);
    const m=/^(\D+)(\d+)$/.exec(kw);assert.equal(coreKeywordSum(G.mainBoard[3],m[1],true),2*Number(m[2]));
  });
  await check('上位の三段攻撃・全体攻撃を持つ時も、コアが無効にする下位キーワードを重ねない',()=>{
    fresh();const c=G.mainBoard[3]=panel('C006');
    for(const [kw,no]of [['三段攻撃','I018'],['全体攻撃','I021']]){
      c.keywords=[kw];assert.equal(_isItemUseTarget({zone:'board',index:3,card:c},{card:item(no),key:_itemEffectKey(item(no))}),false);
    }
  });
  await check('旧表記の結界Nを与える巻物も、未所持にだけ使える',()=>{
    fresh();const card=G.mainBoard[3]=panel('C006');card.keywords=[];card.desc='';
    const pending={key:'keyword_scroll',card:{desc:'対象のキャラクターに結界3を与える。'}};
    assert.equal(_isItemUseTarget({zone:'board',index:3,card},pending),true);
    card.keywords=['結界2'];assert.equal(_isItemUseTarget({zone:'board',index:3,card},pending),false);
  });
  for(const no of ['C080','C084','C109','C116'])for(const enhanced of [false,true])await check(no+(enhanced?'+':'')+'：通常マス・HP0・刻印付きの魔導板キャラクターも対象なら明るく選べる',()=>{
    fresh();const source=G.mainBoard[1]=panel(no,enhanced);source._activationReady=true;
    G.mainBoard[3]=panel('C006');G.mainBoard[3].life=0;
    if(no!=='C080')G.mainBoard[3].keywords=['刻印'];
    G.mainBoard[8]=panel('C007');G.mainBoard[10]=panel('E001');
    assert.ok(cardActivationClick(1));assert.ok(boardNodes[3].classList.contains('item-target-ok'));
    assert.ok(!boardNodes[3].classList.contains('invalid-battle-position'));assert.ok(!boardNodes[3].classList.contains('board-hp-zero'));
    assert.equal(cardActivationBoardTargetable(source,1),false);assert.equal(_pendingCardActivation.firstTarget,undefined);
    if(no==='C080'&&enhanced)assert.ok(boardNodes[10].classList.contains('item-target-ok'));
    else assert.ok(boardNodes[10].classList.contains('item-target-disabled'));
    click(boardNodes[3]);if(no==='C080'||no==='C084'&&enhanced)click(boardNodes[8]);
    assert.equal(_pendingCardActivation,null);assert.equal(source._activationReady,undefined);
    if(no==='C116')assert.equal(G.mainBoard[3],null);
  });
  function reward(){fresh();G.mainBoard[MAIN_BOARD_DEPLOY_SLOTS[0]]=panel('C006');_rewCards=[{...panel('C007'),_isOriginalReward:true,_buyPrice:0}];}
  await check('報酬未入手：シートのキーで警告を引き、既存のOK／キャンセル確認窓を使う',()=>{
    reward();const original=textMessage;let called=false;
    textMessage=(key,fallback)=>{if(key==='報酬未入手時'){called=true;return 'シートの警告';}return original(key,fallback);};
    try{_confirmUnclaimedBattleReward(noop);assert.ok(called);assert.equal(confirmation.message,'シートの警告');}
    finally{textMessage=original;}
    assert.match(confirmSource,/「OK」ボタン/);assert.match(confirmSource,/「キャンセル」ボタン/);
    if(!textMessage('報酬未入手時',''))console.log('NOTE 報酬未入手時：内蔵CSVにキーがないため仮文を使用');
  });
  await check('未取得の戦闘報酬は、アイテム・起動の対象にならないカードでも警告の対象',()=>{
    reward();_rewCards[0]._npcCard=true;assert.equal(_pickingOfferCardAllowed(_rewCards[0]),false);
    assert.equal(_hasUnclaimedBattleReward(),true);
  });
  await check('戦闘開始ボタン：警告中・キャンセルでは進まず、OKで一度進む。ボタンもキャンセルで押せるまま',()=>{
    reward();const original=chooseMoveInline;let starts=0;chooseMoveInline=()=>starts++;
    try{productionMoves();const button=moves.children.find(c=>c.className.includes('rew-move-btn'));
      click(button);assert.ok(confirmation);assert.equal(starts,0);assert.equal(button.disabled,false);
      if(confirmation.onCancel)confirmation.onCancel();assert.equal(starts,0);click(button);confirmation.onOk();assert.equal(starts,1);assert.equal(button.disabled,true);
      confirmation.onOk();assert.equal(starts,1);
    }finally{chooseMoveInline=original;}
  });
  await check('ポータルの使う：警告でキャンセルなら未消費・未ワープ、OKで消費し元のワープへ進む',()=>{
    reward();const scroll=G.spellSlots[0]=item('I009'),original=warpToPreviousWaveVillage;let warps=0;
    warpToPreviousWaveVillage=()=>{warps++;_consumeItemSlot(G._pendingMapItemUse.slotIdx);G._pendingMapItemUse=null;return true;};
    try{_useImmediateItemWithFx(0,scroll);assert.ok(confirmation);assert.equal(warps,0);assert.equal(G.spellSlots[0],scroll);
      if(confirmation.onCancel)confirmation.onCancel();assert.equal(G.spellSlots[0],scroll);
      _useImmediateItemWithFx(0,scroll);confirmation.onOk();assert.equal(warps,1);assert.equal(G.spellSlots[0],null);confirmation.onOk();assert.equal(warps,1);
    }finally{warpToPreviousWaveVillage=original;}
  });
  for(const state of ['picked','empty','returned','shop','items','forge','altar','tavern','library','fiveSaints'])await check('報酬警告の対象外：'+state,()=>{
    reward();if(state==='picked')_rewFreePickDone=true;else if(state==='empty')_rewCards=[];
    else if(state==='returned')_rewCards[0]._temporaryRewardAreaCard=true;
    else G[{shop:'_isShop',items:'_isItemShop',forge:'_isForge',altar:'_isRingExchange',tavern:'_isTavern',library:'_isLibrary',fiveSaints:'_isFiveSaints'}[state]]=true;
    assert.equal(_hasUnclaimedBattleReward(),false);let advanced=0;_confirmUnclaimedBattleReward(()=>advanced++);assert.equal(advanced,1);assert.equal(confirmation,null);
  });
  console.log(`altar_1027: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
