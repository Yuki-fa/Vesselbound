'use strict';
// 内蔵CSV→本番loader→対象選択のcapture→取得→共通戦闘→保存・オンラインを通す。
// CSSの静的照合とブラウザ撮影は ui_1027b_visual_check.js も参照。
const fs=require('node:fs');
const {makeElement}=require('./stub');
const handlers={};
document.addEventListener=(type,fn)=>{(handlers[type]||=[]).push(fn);};
const {assert,sheet,copy,plain,card,enchanted,harness,initRun,pipelines}=require('./rules_1026_harness');
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
function node(tag='div'){
  const el=makeElement(tag),classes=new Set(),props=new Map();
  Object.defineProperty(el,'className',{get:()=>[...classes].join(' '),set:s=>{classes.clear();String(s).split(/\s+/).filter(Boolean).forEach(c=>classes.add(c));}});
  el.classList={add:(...cs)=>cs.forEach(c=>classes.add(c)),remove:(...cs)=>cs.forEach(c=>classes.delete(c)),contains:c=>classes.has(c),
    toggle:(c,on=!classes.has(c))=>{on?classes.add(c):classes.delete(c);return on;}};
  el.matches=s=>s.split(',').some(x=>[...x.matchAll(/\.([\w-]+)/g)].some(m=>classes.has(m[1])));
  el.closest=s=>el.matches(s)?el:null;
  el.style={setProperty:(k,v)=>props.set(k,String(v)),getPropertyValue:k=>props.get(k)||'',removeProperty:k=>props.delete(k)};
  el.getClientRects=()=>[];
  return el;
}
const slots=Array.from({length:4},()=>node('i'));
function fresh(){
  initRun();SaveRun.begin();G._freeRewardPanelMode=true;G.mainBoard.fill(null);G.spellSlots.fill(null);
  _pendingCardActivation=null;G._pendingItemUse=null;_rewCards=[];_rewFreePickDone=false;_rewPhaseId=1;
  document.body.className='reward-screen-active';_syncItemUsePickingUi();
}
function panel(no,enhanced=false){const base=makePanel(PANEL_POOL.find(c=>c.no===no).id);return enhanced?enhancedPanelCopy(base):base;}
function item(){return makeItem(ITEM_POOL.find(c=>Number(c.no)===18).id,2);}
function activate(no,enhanced=false){const source=G.mainBoard[1]=panel(no,enhanced);source._activationReady=true;assert.equal(cardActivationClick(1),true);return source;}
function input(type,target,extra={}){
  const e={target,button:0,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};
  const fn=(handlers[type]||[]).find(f=>f.toString().includes('_targetPickingActive'));
  assert.ok(fn,type);fn(e);return e;
}
function clickSlot(index){
  const el=slots[index];assert.equal(input('pointerdown',el).stopped,false,'実際のcaptureが有効対象を遮らない');
  assert.equal(input('click',el).stopped,false);el.onclick({stopPropagation(){}});
}
function endBattle(){
  const state=createBattleState({sides:{p1:{units:[plain('hero')]},p2:{units:[plain('foe')]}},
    ...coreBattleEndCardFields({p1:G.mainBoard}),summonDefs:PANEL_POOL}),events=[];
  coreTriggerBattleEnd(state,e=>events.push(e),createSeededRng(1027));events.forEach(applyCoreBattleEndCardEvent);return events;
}
function acquire(no){
  // 在庫を絞って本番の抽選器に必ず候補を選ばせる（シートの報酬制限は変更しない）。
  const pool=PANEL_POOL.slice();let rewards;
  try{PANEL_POOL.splice(0,PANEL_POOL.length,...pool.filter(c=>c.no===no||c.no==='C006'));rewards=drawRewards(3);}finally{PANEL_POOL.splice(0,PANEL_POOL.length,...pool);}
  const offered=rewards.find(c=>c.no===no);assert.ok(offered,no+'が報酬抽選に出る');
  offered._isOriginalReward=true;offered._buyPrice=0;_rewCards=[offered];G._rewardOnePickMode=true;
  takeRewCard(0,0);assert.equal(G.mainBoard[0]?.no,no,'本番の報酬取得を通す');return G.mainBoard[0];
}
function formed(no,enhanced=false){
  fresh();G.mainBoard[1]=panel('C006');Object.assign(G.mainBoard[1],{power:7,life:9,desc:'',keywords:[],directions:['left']});
  G.mainBoard[0]=panel(no,enhanced);G.mainBoard[0].directions=['right'];
  const u=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered.find(e=>e.slotIdx===1)?.unit;
  assert.ok(u);assert.ok(coreUnitTriggerText(u,'死亡').includes(sheet.effectText(no,enhanced).replace(/^死亡：/,'')));return u;
}
(async()=>{
  console.table=()=>{};await loadGameData();
  document.body=node('body');document.documentElement=node('html');document.createElement=node;
  document.querySelectorAll=s=>s==='.reward-prod-item .reward-prod-slots i'?slots:[];
  document.getElementById=()=>null;
  renderHandEditor=renderRewCards=renderMoveSlotsInEnemy=renderFieldEditor=updateHUD=_storeRewardStartSnapshot=_playActivationFx=()=>{};
  for(const enhanced of [false,true])await check('1 マモン'+(enhanced?'+':'')+'：captureを含むアイテムクリックで破壊・入金・使用印の消費を1回',()=>{
    fresh();G.gold=100;G.spellSlots[0]=item();const source=activate('C003',enhanced);_syncRewardProductionItems();
    assert.ok(slots[0].classList.contains('item-target-ok'));assert.equal(slots[0].draggable,false);
    for(const slot of slots)assert.ok(!slot.classList.contains('activation-target-disabled'),'空き枠も対象外暗転しない');
    const gain=Number(source.desc.match(/(\d+)G/)[1]);clickSlot(0);
    assert.equal(G.spellSlots[0],null);assert.equal(G.gold,100+gain);assert.equal(_pendingCardActivation,null);assert.equal(source._activationReady,undefined);
    _syncRewardProductionItems();assert.ok(!slots[0].classList.contains('item-target-ok'));
    slots[0].onclick({stopPropagation(){}});assert.equal(G.gold,100+gain);
  });
  for(const kind of ['item','activation'])await check('2 '+kind+'：区域外の全ボタンをcaptureで遮り、元・有効対象・取消を維持',()=>{
    fresh();G.mainBoard[3]=panel('C006');G.spellSlots[0]=item();
    if(kind==='item')_beginBoardItemUse(0,G.spellSlots[0]);else activate('C109');_syncRewardProductionItems();
    for(const name of ['再抽選','戦闘開始','配置を戻す','カード非表示','店を出る','廃棄','ミュート','デバッグ追加']){
      const btn=node('button');btn.textContent=name;
      for(const type of ['pointerdown','click'])assert.ok(input(type,btn).stopped,name);
    }
    const target=node();target.classList.add('item-target-ok');assert.equal(input('click',target).stopped,false);
    const tipButton=node('button');tipButton.closest=s=>s.includes('button')||s.includes('#kw-tooltip')?tipButton:null;
    assert.equal(input('click',tipButton).stopped,true,'説明枠に残った別の操作ボタンも遮断');
    if(kind==='item'){assert.equal(input('click',slots[0]).stopped,false);slots[0].onclick({stopPropagation(){}});}
    else{const source=node();source.classList.add('picking-source');assert.equal(input('click',source).stopped,false);cancelCardActivation();}
    assert.equal(_targetPickingActive(),false);
    if(kind==='item')_beginBoardItemUse(0,G.spellSlots[0]);else activate('C109');
    assert.ok(input('keydown',node(),{key:'Escape'}).stopped);assert.equal(_targetPickingActive(),false);
  });
  await check('1・2・3 CSS：マモンの区画を暗くせず、全ボタンの暗転・遮断と廃棄の共通ラベルを保つ',()=>{
    const html=fs.readFileSync(require.resolve('../../index.html'),'utf8'),source=fs.readFileSync(require.resolve('../../js/engine/reward_board_editor.js'),'utf8');
    assert.match(html,/#scr-battle :is\(button,\[role="button"\]/);assert.match(html,/:not\(#battle-options-btn\)/);
    assert.match(html,/filter:grayscale\(1\) brightness\(\.45\)!important;\s*pointer-events:none!important/);
    assert.doesNotMatch(html,/body:is\(\.item-use-picking,\.activation-picking-item\) #reward-production-ui \.reward-prod-item(?:::| > h2)/);
    assert.match(source,/class="shop-board-sell-value shop-board-sell-action debug-discard-btn"/);
    assert.doesNotMatch(source,/class="discard-btn [^"]*debug-discard-btn/);
  });
  for(const enhanced of [false,true])await check('4 報酬の呪いの印'+(enhanced?'+':'')+'：取得・強化の姿・残戦数・保存・4戦目の英雄の印',()=>{
    fresh();acquire('E066');if(enhanced)G.mainBoard[0]=enhancedPanelCopy(G.mainBoard[0]);
    assert.match(getCardFrameAsset(G.mainBoard[0]),enhanced?/enchantment_m\.svg/:/enchantment\.svg/);
    for(let battle=1;battle<=4;battle++){
      assert.match(_rawSubstitutedDesc(G.mainBoard[0]),new RegExp('あと'+(5-battle)+'戦'));
      const events=endBattle();assert.equal(events.filter(e=>e.kind==='enchant_transform').length,1);
      const after=copy(G.mainBoard);events.forEach(applyCoreBattleEndCardEvent);assert.deepEqual(G.mainBoard,after);
      SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));
      assert.equal(G.mainBoard[0].no,battle===4?'E073':'E066');
    }
    assert.equal(!!G.mainBoard[0]._tripleMerged,enhanced);assert.equal(G.mainBoard[0].desc,panel('E073',enhanced).desc);
  });
  for(const no of ['E076','E077'])for(const enhanced of [false,true])for(const side of ['p1','p2'])await check('5 '+no+(enhanced?'+':'')+'/'+side+'：実編成から死亡・封印・解放・再死亡',()=>{
    const u=formed(no,enhanced),target=plain('sealed',{keywords:['封印999'],_sealed:true,_sealValue:999,atk:2,hp:30,maxHp:30});
    const h=harness(side,[{...u,id:'source'},target,plain('helper')],{blood:{p1:2,p2:2}});
    h.hit(h.foes[0],h.u,1000,false,true);
    if(no==='E076'){
      const d=/の半分/.test(sheet.effectText(no,enhanced))?2:1,a=Math.floor(7/d),p=Math.floor(9/d);
      assert.deepEqual([h.own[1].atk,h.own[1].hp,h.own[1].maxHp],[2+a,30+p,30+p]);
      assert.ok(h.own[1]._sealed);assert.equal(h.events.filter(e=>e.reason==='death_sealed_stat_transfer').length,1);
      assert.equal(h.events.filter(e=>e.type==='stat_change'&&e.unitId==='helper').length,0);
    }else{
      const mul=Number(sheet.effectText(no,enhanced).match(/血の(\d+)倍/)[1]);
      assert.equal(h.state.blood[side],3);assert.equal(h.u._sealValue,3*mul);assert.ok(h.u._sealed);assert.equal(h.u.hp,h.u.maxHp);
      h.u.keywords.push('封印1');assert.equal(coreSealRelease(h.u,h.own,h.state.blood).required,3*mul,'元の封印値で解放しない');
      h.state.blood[side]=3*mul;runBattleCore(h.state,h.rng,{skipOpening:true,turnLimit:1,onEvent:h.emit});
      assert.equal(h.u._sealed,false);assert.equal(h.u._coreDeathTriggered,undefined);assert.equal(h.u._coreDeathObserved,undefined);
      h.hit(h.foes[0],h.u,1000,false,true);assert.equal(h.state.blood[side],3*mul+1);
      assert.equal(h.events.filter(e=>e.type==='seal_apply'&&e.unitId===h.u.id).length,2);
      const ev=h.events.find(e=>e.type==='seal_apply'),online={...h.u,hp:0},final=coreUnitSnapshot(h.u);
      presentHoldShown(h.u,{atk:7,hp:0,maxHp:9});
      presentSealApplyEvent(ev,{findUnit:()=>h.u});assert.equal(h.u.hp,final.hp,'PvE最終状態を巻き戻さない');assert.equal(presentShownHp(h.u),ev.hp);
      presentSealApplyEvent(ev,{findUnit:()=>online,applyState:(unit,e)=>Object.assign(unit,{hp:e.hp,_sealed:true,_sealValue:e.value})});
      assert.equal(presentShownHp(online),ev.hp);assert.ok(online._sealShownPending);
    }
  });
  for(const no of ['E076','E077'])await check('5 '+no+'：PvE runner・保存の再計算／再生・オンラインの全イベントが一致',async()=>{
    const h=harness('p1',[enchanted(no,false,undefined,{hp:1,maxHp:9,atk:7}),plain('sealed',{keywords:['封印999']}),plain('helper')]);
    await pipelines(h.initial);
  });
  await check('5 対象不在の殉教は無発動・複数接続と通常／強化の分量を混同しない',()=>{
    const one=card('E076'),two=card('E076',true),h=harness('p1',[plain('source',{atk:7,hp:9,maxHp:9,boardCards:[one,two],_adjacentPanelEffectTexts:[one.desc,two.desc]}),plain('ally')]);
    h.hit(h.foes[0],h.u,1000,false,true);assert.equal(h.events.filter(e=>e.reason==='death_sealed_stat_transfer').length,0);
    const both=harness('p1',[plain('source',{atk:7,hp:9,maxHp:9,boardCards:[one,two],_adjacentPanelEffectTexts:[one.desc,two.desc]}),plain('sealed',{_sealed:true,_sealValue:999})]);
    both.hit(both.foes[0],both.u,1000,false,true);assert.deepEqual(both.events.filter(e=>e.reason==='death_sealed_stat_transfer').map(e=>[e.atk,e.hp]),[[3,4],[7,9]]);
  });
  await check('5 一時の眠りの通常と強化を同時接続すると、各カードの封印を合算する',()=>{
    const cards=[card('E077'),card('E077',true)],h=harness('p1',[plain('source',{boardCards:cards,_adjacentPanelEffectTexts:cards.map(c=>c.desc)}),plain('reserve')]);
    h.hit(h.foes[0],h.u,1000,false,true);
    const scales=cards.map(c=>Number(c.desc.match(/血の(\d+)倍/)[1]));
    assert.equal(h.u._sealValue,h.state.blood.p1*scales.reduce((a,b)=>a+b));
    assert.equal(h.events.filter(e=>e.type==='seal_apply').length,2);
  });
  await check('5 一時の眠りで本人も封印された時は、殉教の「味方」から本人を勝手に除外しない',()=>{
    for(const enhanced of [false,true]){
      const cards=[card('E077',enhanced),card('E076',enhanced)],h=harness('p1',[plain('source',{atk:7,hp:9,maxHp:9,boardCards:cards,_adjacentPanelEffectTexts:cards.map(c=>c.desc)}),plain('reserve')]);
      h.hit(h.foes[0],h.u,1000,false,true);
      const d=/の半分/.test(cards[1].desc)?2:1;
      assert.deepEqual([h.u.atk,h.u.hp,h.u.maxHp],[7+Math.floor(7/d),9+Math.floor(9/d),9+Math.floor(9/d)]);
      assert.equal(h.events.filter(e=>e.reason==='death_sealed_stat_transfer'&&e.unitId===h.u.id).length,1);assert.ok(h.u._sealed);
    }
  });
  await check('5 解放→再封印の再生はPvEの最終状態を戻さず、オンラインだけイベントの状態を反映する',async()=>{
    const u=plain('sealed',{_sealed:true,_sealValue:30}),before=copy(u),old=playSealReleaseVfx;
    const apply={type:'seal_apply',side:'p1',unitId:u.id,value:30,fromDeath:true,hp:u.hp,maxHp:u.maxHp,atk:u.atk};
    playSealReleaseVfx=async()=>{assert.equal(u._sealed,true);assert.equal(u._sealValue,30);};
    try{
      await presentSealReleaseEvent({type:'seal_release',side:'p1',unitId:u.id},{findUnit:()=>u});
      assert.equal(u._sealShownPending,false);assert.equal(u._sealed,before._sealed);assert.equal(u._sealValue,before._sealValue);
      const snap=coreSnapshotDeferredState({units:{p1:[u],p2:[]}});u._sealShownPending=true;coreRestoreDeferredState({units:{p1:[u],p2:[]}},snap);
      assert.equal(u._sealShownPending,true,'表示の進みはコアの遅延復元で戻さない');
      presentSealApplyEvent(apply,{findUnit:()=>u});assert.equal(u._sealed,true);assert.equal(u._sealValue,30);
      presentReleaseShown(u);assert.equal(u._sealShownPending,undefined);
      const online=copy(before);
      await presentSealReleaseEvent({type:'seal_release',side:'p1',unitId:u.id},{findUnit:()=>online,applyState:unit=>{unit._sealed=false;delete unit._sealValue;}});
      assert.equal(online._sealed,false);assert.equal(online._sealValue,undefined);
    }finally{playSealReleaseVfx=old;}
  });
  await check('4・5 未配置の4枚は番号・効果を維持し、通常／強化・行動表示とも実在する仮画像を使う',()=>{
    for(const no of ['E066','E073','E076','E077'])for(const enhanced of [false,true]){
      const c=panel(no,enhanced),art=getPanelArtPath(c);assert.equal(c.no,no);assert.equal(c.artCode,no);
      assert.equal(art,'assets/art/enchantments/E0XX.jpg');assert.ok(fs.existsSync(require('node:path').resolve(__dirname,'../..',art)));
      assert.equal(actionBannerImage(c,'enchant'),art);
    }
  });
  await check('6 行商人列の有無・値に関わらず同じloader結果とアイテム抽選',async()=>{
    const original=window.VESSELBOUND_LOCAL_XLSX_CSV,rows=sheet.parseCsv(original.item),headers=rows.shift();
    const csv=rs=>rs.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
    const snapshot=()=>ITEM_POOL.map(c=>({no:c.no,name:c.name,grade:c.grade,rarity:c.rarity,desc:c.desc,reward:!!c._rewardExcluded,shop:!!c._shopExcluded}));
    const expected=snapshot(),idx=headers.indexOf('行商人');assert.ok(idx>=0);
    try{
      for(const keep of [false,true]){
        window.VESSELBOUND_LOCAL_XLSX_CSV={...original,item:csv([headers,...rows].map((r,i)=>r.filter((_,n)=>keep||n!==idx).map((v,n)=>keep&&i&&n===idx?'false':v)))};
        await loadGameData();assert.deepEqual(snapshot(),expected);assert.ok(ITEM_POOL.every(c=>!('_peddlerAvailable'in c)));
        fresh();for(const forShop of [false,true]){const items=drawItems(4,3,{forShop});assert.ok(items.length);assert.ok(items.every(c=>c._implemented!==false&&!c._noItemEffectImpl));}
      }
    }finally{window.VESSELBOUND_LOCAL_XLSX_CSV=original;await loadGameData();}
    assert.doesNotMatch(fs.readFileSync(require.resolve('../../js/engine/pool.js'),'utf8'),/forPeddler|_peddlerAvailable/);
  });
  console.log(`ui_1027b: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
