#!/usr/bin/env node
'use strict';
// ブラウザを起動せず、本体の施設・描画入口・編成送信・保存・コアを検査する。
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {initialize}=require('./run_bot');
const {source}=require('./bot_runtime');
const {makeElement}=require('./stub');
const {sheetRows}=require('./sheet_data');
let count=0;
function check(name,fn){fn();count++;console.log('OK '+name);}
async function checkAsync(name,fn){await fn();count++;console.log('OK '+name);}
function restore(name){
  const match=source('js/engine/reward.js').match(new RegExp(`^function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^\\}`,'m'));
  assert.ok(match,name+' の本体');vm.runInThisContext(match[0]);
}
function element(tag='div'){
  const el=makeElement(tag),classes=new Set(),props={};
  el.classList={add:(...a)=>a.forEach(c=>classes.add(c)),remove:(...a)=>a.forEach(c=>classes.delete(c)),
    contains:c=>classes.has(c),toggle(c,on){const add=on??!classes.has(c);if(add)classes.add(c);else classes.delete(c);return add;}};
  el.style.setProperty=(k,v)=>{props[k]=v;};el.style.getPropertyValue=k=>props[k]||'';
  el.style.removeProperty=k=>delete props[k];
  el.matches=selector=>selector.split(',').some(s=>el.classList.contains(s.trim().slice(1))||el.className.split(' ').includes(s.trim().slice(1)));
  return el;
}
const definition=no=>PANEL_POOL.find(p=>p.no===no);
const card=no=>makePanel(definition(no).id);
function fresh(){
  initState();SaveRun.begin();G._runSeed=1019;G._runRngState=1019;
  Object.assign(G,{_wave:1,_waveStage:1,_waveLife:3,_isWaveAltar:true,_waveVillage:true,_debugMode:true,_debugStoryCycle:2,phase:'reward'});
  G.mainBoard[1]=card('C008');G.mainBoard[3]=card('C006');
  _rewCards=[];_rewFreePickDone=false;_rewPhaseId=1;
}
function simulate(units){
  const setup={seed:1019,stageNumber:1,turnLimit:2,summonDefs:[...PANEL_POOL,...ENEMY_POOL],
    sides:{p1:{units},p2:{units:[{id:'target',name:'検査相手',atk:1,hp:100000,maxHp:100000}]}}};
  const state=createBattleState(setup),events=[];
  runBattleCore(state,createSeededRng(setup.seed),{turnLimit:setup.turnLimit,onEvent:e=>events.push(e)});
  return {state,events,setup};
}
(async()=>{
  await initialize();
  // ハーネスで省略する入店時スナップショットと巻き戻しは、本体へ戻して検査する。
  restore('_storeRewardStartSnapshot');restore('resetRewardToStart');restore('renderMoveSlotsInEnemy');
  fresh();
  check('施設の移設：旧祝福の座の位置に五聖、旧五聖の位置に炎、祭壇は維持',()=>{
    assert.deepEqual(_villageFacilityFixedPos('五聖の座'),{x:650,y:1402});
    assert.deepEqual(_villageFacilityFixedPos('踊り場'),{x:650,y:1402});
    assert.deepEqual(_villageFacilityFixedPos(BLESSING_FLAME_CONFIG.name),{x:1621,y:1402});
    assert.deepEqual(_villageFacilityFixedPos('祭壇'),{x:2260,y:246});
    for(let wave=1;wave<=4;wave++)for(const cycle of [1,2]){
      G._wave=wave;G._debugStoryCycle=cycle;
      const facs=villageFacilityList();
      assert.equal(facs.filter(f=>f.key===BLESSING_FLAME_CONFIG.key).length,1);
      assert.equal(facs.some(f=>f.key===TOWER_BOON_CONFIG.key),false);
      assert.equal(facs.some(f=>f.key==='landing'),cycle===2);
      const positions=_villageFacilityPositions(facs);
      assert.equal(new Set(positions.map(p=>JSON.stringify(p))).size,positions.length);
    }
    G._isWaveAltar=false;assert.equal(villageFacilityList().some(f=>f.key===BLESSING_FLAME_CONFIG.key),false);
  });
  fresh();
  check('入場：抽選や支払いなしで編成、元の盤面をスナップショットに残す',()=>{
    const board=clone(G.mainBoard),gold=G.gold,rng=G._runRngState;
    assert.equal(openBlessingFlame(),true);assert.equal(G._isBlessingFlame,true);
    assert.equal(G._isWaveAltar,true);assert.equal(G._isVillageMenu,false);
    // 「配置を戻す」の印（_placeKey、2026-10-25）は画面の管理用。盤面の内容としては比べない。
    const unplaced=b=>JSON.parse(JSON.stringify(b,(k,v)=>k==='_placeKey'?undefined:v));
    assert.deepEqual(unplaced(G._rewardStartSnapshot.mainBoard),board);assert.deepEqual(unplaced(G.mainBoard),board);
    assert.deepEqual(_rewCards,[]);assert.equal(G.gold,gold);assert.equal(G._runRngState,rng);
    assert.equal(openBlessingFlame(),false);assert.equal(towerBoonRerollVisible(),false);
  });
  check('選択とプレビュー：元カードを変えず、1枚表示・選び直し・青白い外周の専用層',()=>{
    const original=clone(G.mainBoard[1]),create=document.createElement;
    try{
      document.createElement=element;
      const slot=element();_wireHeCardControls(slot,G.mainBoard[1],'boardCards',1);
      slot.onclick({stopPropagation(){}});
      assert.deepEqual(G.mainBoard[1],original);
      const row=element(),section=element();blessingFlameRenderPreview(row,section);
      assert.equal(row.children.filter(c=>c.classList.contains('blessing-flame-preview')).length,1);
      assert.ok(row.children[0]['data-preview'].includes(definition('C008').mergedForm.desc));
      assert.equal(row.children[0].draggable,false);assert.equal(row.children[0].onclick,undefined);
      const selected=element();blessingFlameWireCard(selected,G.mainBoard[1],1);
      assert.equal(selected.classList.contains('blessing-flame-selected'),true);
      assert.equal(selected.children[0].className,'blessing-flame-selection-glow');
      assert.equal(blessingFlameSelect(3),true);
      const previous=element();blessingFlameWireCard(previous,G.mainBoard[1],1);
      assert.equal(previous.classList.contains('blessing-flame-selected'),false);
      const nextRow=element();blessingFlameRenderPreview(nextRow,element());
      assert.ok(nextRow.children[0]['data-preview'].includes(definition('C006').mergedForm.desc));
      assert.deepEqual(_rewCards,[],'プレビューを取得可能な報酬配列に入れない');
    }finally{document.createElement=create;}
  });
  check('右下：祝福を離れる・配置を戻す。実行・キャンセルはプレビュー中だけ',()=>{
    blessingFlameReset();
    const row=element();blessingFlameRenderControls(row);
    assert.deepEqual(row.children.map(b=>b.children[0].textContent),['祝福を離れる','配置を戻す']);
    blessingFlameSelect(1);const selected=element();blessingFlameRenderControls(selected);
    assert.deepEqual(selected.children.map(b=>b.children[0].textContent),['祝福を離れる','配置を戻す','実行','キャンセル']);
    assert.ok(selected.children[2].className.includes('rew-move-btn'));assert.ok(selected.children[3].className.includes('rew-reset-btn'));
    assert.equal(selected.children[2].disabled,false);
    // プレビュー中は説明文を出さない。キャンセルは選択だけを外す。
    const previewRow=element(),create=document.createElement;
    try{document.createElement=element;blessingFlameRenderPreview(previewRow,element());}finally{document.createElement=create;}
    assert.equal(previewRow.children.some(c=>c.className==='blessing-flame-instruction'),false);
    const board=clone(G.mainBoard);assert.equal(blessingFlameCancel(),true);
    assert.equal(_blessingFlameVisit.selected,-1);assert.deepEqual(G.mainBoard,board);
    const helpRow=element();blessingFlameRenderPreview(helpRow,element());
    assert.equal(helpRow.children.filter(c=>c.className==='blessing-flame-instruction').length,1);
    blessingFlameSelect(1);
  });
  await checkAsync('実行：基礎ATK/HP2倍の後に正負の修正、強化効果・キーワード・旧合体枠、1枚だけ',async()=>{
    G.mainBoard[1].power+=7;G.mainBoard[1].life-=2;
    G.mainBoard[1].keywords.push('毒牙5');
    _storeRewardStartSnapshot();
    const other=clone(G.mainBoard[3]),base=definition('C008'),row=sheetRows('card').find(r=>r['No.']==='C008');
    blessingFlameSelect(1);assert.equal(await blessingFlameExecute(),true);
    const result=G.mainBoard[1];
    assert.equal(result.power,base.power*2+7);assert.equal(result.life,base.life*2-2);
    assert.equal(result.desc,row['強化効果']??row['合体効果']);
    for(const kw of String(row['強化キーワード']??row['合体キーワード']).split(/\s+/).filter(Boolean))assert.ok(result.keywords.includes(kw));
    assert.ok(result.keywords.includes('毒牙5'));assert.equal(result._mergedFormApplied,true);
    assert.equal(result._merged,true);assert.equal(result._tripleMerged,true);
    assert.notEqual(getCardFrameAsset(result),getCardFrameAsset(base));
    assert.deepEqual(result.directions,G._rewardStartSnapshot.mainBoard[1].directions);
    assert.deepEqual(G.mainBoard[3],other);
    assert.equal(await blessingFlameExecute(),false);assert.equal(blessingFlameSelect(3),false);
  });
  check('配置を戻す：強化後の修正・効果・枠は保持し、別カードを強化できない',()=>{
    const upgraded=clone(G.mainBoard[1]);G.mainBoard[5]=G.mainBoard[1];G.mainBoard[1]=null;
    assert.equal(blessingFlameReset(),true);assert.deepEqual(G.mainBoard[1],upgraded);assert.equal(G.mainBoard[5],null);
    assert.equal(G.mainBoard[1]._tripleMerged,true);
    assert.equal(blessingFlameSelect(3),false);assert.equal(blessingFlameUsed(),false);
  });
  check('強化不可：空欄・強化後の無いエンチャント・依頼/NPC・木箱・強化済みを暗くし、選択しない。エンチャントは強化できる',()=>{
    fresh();openBlessingFlame();
    const raw=card('C008');
    assert.equal(blessingFlameCardEligible(card('E002')),true,'エンチャントも強化できる（2026-10-20）');
    assert.equal(blessingFlameCardEligible(card('E010')),true,'魔導回路は強化効果が空欄でも強化できる（強化すると本文が消える。2026-10-26）');
    const enchant=enhancedPanelCopy(card('E001'));assert.ok(enchant&&enchant._tripleMerged&&enchant.desc!==card('E001').desc);
    const cases=[null,{...raw,_mergedSource:{desc:'',keywords:''}},
      {...raw,mergedForm:null},{...raw,_npcCard:true},{...raw,_npcDeployOnly:true},
      {...raw,_questOfferCard:true},{...raw,_questTransportId:'Q005'},{...raw,no:'BC001'},
      card('E108'),enhancedPanelCopy(raw),{...raw,_merged:true}];
    for(const invalid of cases){
      assert.equal(blessingFlameCardEligible(invalid),false);
      G.mainBoard[5]=invalid;assert.equal(blessingFlameSelect(5),false);
      if(invalid){const el=element();blessingFlameWireCard(el,invalid,5);assert.equal(el.classList.contains('blessing-flame-unavailable'),true);}
    }
    G.mainBoard[5]=null;
    const keywordOnly=PANEL_POOL.find(p=>p.category==='キャラクター'&&p.mergedForm&&p._mergedSource&&!p._mergedSource.desc&&p._mergedSource.keywords);
    if(keywordOnly){assert.equal(blessingFlameCardEligible(keywordOnly),true);assert.ok(enhancedPanelCopy(keywordOnly));}
  });
  check('施設内の入力：プレビュー取得を防ぎ、魔導板のドラッグ・道具操作・説明ホバーとオプションを維持',()=>{
    const event=(type,allowed)=>{
      let prevented=false,stopped=false;
      const target={closest:s=>s==='#scr-battle'?true:allowed&&s.includes(allowed)?true:null};
      blessingFlameBlockInput({type,target,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
      return [prevented,stopped];
    };
    assert.deepEqual(event('click',''),[true,true]);
    assert.deepEqual(event('dragstart',''),[true,true]);
    assert.deepEqual(event('dragstart','#hand-slots'),[false,false],'effects-1026c: 祝福前から魔導板の中を動かせる');
    assert.deepEqual(event('contextmenu',''),[true,true]);
    assert.deepEqual(event('click','#reward-move-btns'),[false,false]);
    assert.deepEqual(event('click','#battle-options-btn'),[false,false]);
  });
  await checkAsync('退場：強化を確定。祭壇と同じく再入場でき、使用済みの炎では選べない。未実行の退場は使用済みにしない（2026-10-20）',async()=>{
    blessingFlameSelect(3); // effects-1026c: 前節のドラッグ開始でプレビューを解除したため、選び直す。
    assert.equal(await blessingFlameExecute(),true);
    // 強化後は全てのカードを明るくする（強化できないカードも）。
    G.mainBoard[5]=card('E010');const dim=element();blessingFlameWireCard(dim,G.mainBoard[5],5);
    assert.equal(dim.classList.contains('blessing-flame-unavailable'),false);G.mainBoard[5]=null;
    // 強化した後は魔導板の中でカードを動かせる（2026-10-23 利用者指定）。
    const movable=element();movable.draggable=true;
    assert.equal(blessingFlameWireCard(movable,G.mainBoard[3],3),false,'通常の操作を付けさせる');
    assert.equal(movable.draggable,true);assert.equal(movable.onclick,undefined);
    const drag=(type,inside)=>{let prevented=false;
      blessingFlameBlockInput({type,target:{closest:s=>s==='#scr-battle'||inside&&s==='#hand-slots'?true:null},preventDefault(){prevented=true;},stopImmediatePropagation(){}});
      return prevented;};
    assert.equal(drag('dragstart',true),false);assert.equal(drag('drop',true),false);
    assert.equal(drag('drop',false),true,'魔導板の外へは落とせない');
    const upgraded=clone(G.mainBoard[3]);
    assert.equal(await blessingFlameLeave(),true);
    assert.equal(blessingFlameUsed(1),true);assert.equal(G._isWaveAltar,true);
    assert.equal(G._isBlessingFlame,false);assert.deepEqual(G.mainBoard[3],upgraded);
    assert.equal(_villageFacilityDisabled({key:BLESSING_FLAME_CONFIG.key}),false);
    assert.equal(openBlessingFlame(),true);
    assert.equal(blessingFlameSelect(1),false);assert.equal(_blessingFlameVisit.executed,true);
    const help=element();blessingFlameRenderPreview(help,element());
    assert.equal(help.children[0].textContent,blessingFlameText('used'));
    assert.equal(blessingFlameReset(),true);assert.equal(blessingFlameSelect(1),false,'入り直して元に戻しても使用済みのまま');
    assert.deepEqual(G.mainBoard[3],upgraded);
    assert.equal(await blessingFlameLeave(),true);
    G._wave=2;assert.equal(blessingFlameUsed(),false);assert.equal(openBlessingFlame(),true);
    assert.equal(await blessingFlameLeave(),true);
    assert.equal(blessingFlameUsed(2),false,'未実行の退場は使用済みにしない');
    assert.equal(openBlessingFlame(),true);assert.equal(blessingFlameSelect(1),true);
    assert.equal(await blessingFlameExecute(),true);assert.equal(await blessingFlameLeave(),true);
    assert.equal(blessingFlameUsed(2),true);
  });
  check('セーブ→ロード：強化した姿と使用済み、古いセーブの既定値、選択/VFXは保存しない',()=>{
    const upgraded=clone(G.mainBoard[3]);
    const save=SaveRun.buildRunSave('tower');SaveRun.validate(save);SaveRun.saveRun(save);
    SaveRun.ready();const loaded=SaveRun.loadRun();assert.ok(loaded);
    SaveRun.restoreRunState(loaded);assert.deepEqual(G.mainBoard[3],upgraded);
    assert.equal(blessingFlameUsed(1),true);assert.equal(blessingFlameUsed(2),true);
    assert.equal(blessingFlameActive(),false);assert.equal(openBlessingFlame(),true);
    assert.equal(blessingFlameSelect(1),false);blessingFlameClear();
    assert.equal(JSON.stringify(save).includes('_blessingFlameVisit'),false);
    const old=clone(save);delete old.state.choices._blessingFlameUsed;
    SaveRun.restoreRunState(old);assert.deepEqual(G._blessingFlameUsed,{});
    SaveRun.restoreRunState(save);
  });
  await checkAsync('戦闘：強化後のATK/HP・効果・キーワードがPvE編成とオンラインpayload/receiverへ届く',async()=>{
    fresh();openBlessingFlame();blessingFlameSelect(1);await blessingFlameExecute();
    G.mainBoard[3]=null;
    const upgraded=G.mainBoard[1],formed=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
    assert.equal(formed.atk,upgraded.power);assert.equal(formed.hp,upgraded.life);
    assert.equal(formed.desc,upgraded.desc);assert.ok(formed.keywords.includes('根性'));
    const pve=simulate([formed]),payload=JSON.parse(JSON.stringify(buildOnlineSelfFormation()));
    assert.equal(payload.units[0].atk,formed.atk);assert.equal(payload.units[0].hp,formed.hp);
    assert.equal(payload.units[0].desc,formed.desc);assert.deepEqual(payload.units[0].keywords,formed.keywords);
    const online=simulate(payload.units);
    const changes=events=>events.filter(e=>e.type==='run_effect'&&e.kind==='reward_buff').map(e=>[e.atk,e.hp]);
    assert.ok(changes(pve.events).length);assert.ok(changes(pve.events).every(v=>v[0]===2&&v[1]===2));
    assert.deepEqual(changes(online.events),changes(pve.events));
    assert.equal(online.state.units.p1[0]._tripleMerged,true);
    const src=fs.readFileSync(path.resolve(__dirname,'../../js/online/board.js'),'utf8');
    const start=src.indexOf('  function _fieldUnit('),end=src.indexOf('\n  // 前衛・後衛',start);
    const receiver=vm.runInNewContext(`(${src.slice(start,end).trim()})`,{_cardInfo:{p1:new Map(),p2:new Map()}});
    const received=receiver(coreUnitSnapshot(online.state.units.p1[0]),'p1');
    assert.equal(received.atk,online.state.units.p1[0].atk);assert.equal(received.desc,upgraded.desc);
    assert.equal(received._tripleMerged,true);
  });
  check('実際の描画入口：報酬枠にはプレビューだけ、魔導板クリックは選択、プレビュー中は実行・キャンセルが加わる',()=>{
    fresh();openBlessingFlame();
    const render=renderRewCards,get=document.getElementById,create=document.createElement;
    const section=element(),row=element(),buttons=element();
    const ids={'reward-offer-section':section,'reward-offer-row':row,'reward-move-btns':buttons};
    try{
      document.createElement=element;document.getElementById=id=>ids[id]||get(id);
      restore('renderRewCards');
      blessingFlameSelect(1);
      renderMoveSlotsInEnemy();
      assert.equal(row.children.filter(c=>c.classList.contains('blessing-flame-preview')).length,1);
      assert.equal(section.style.getPropertyValue('--title-reward'),'"強化後のカード"');
      // 検査用の要素は innerHTML='' で子を消さないので、最後に描いた4つを見る。
      assert.deepEqual(buttons.children.slice(-4).map(b=>b.children[0].textContent),['祝福を離れる','配置を戻す','実行','キャンセル']);
      const wired=element();_wireHeCardControls(wired,G.mainBoard[1],'boardCards',1);
      assert.notEqual(wired.draggable,false);wired.onclick({stopPropagation(){}});
      assert.equal(wired.classList.contains('blessing-flame-selected'),true);
    }finally{renderRewCards=render;document.getElementById=get;document.createElement=create;}
  });
  await checkAsync('白光の演出中：元カードを維持し、連打・配置を戻す・立ち去るを受け付けない',async()=>{
    const query=document.querySelector,timer=setTimeout,slot=element(),before=clone(G.mainBoard[1]);
    let finish,delay;
    try{
      document.querySelector=selector=>selector.startsWith('#hand-slots >')?slot:query(selector);
      global.setTimeout=(fn,ms)=>{finish=fn;delay=ms;return 0;};
      const pending=blessingFlameExecute();
      assert.equal(delay,BLESSING_FLAME_CONFIG.flashMs);assert.equal(delay,760);
      assert.equal(slot.children[0].className,'blessing-flame-flash triple-merge-white-flash');
      assert.match(fs.readFileSync(path.resolve(__dirname,'../../js/engine/blessing_flame.js'),'utf8'),/playFileSfx\('assets\/sfx\/merge\.wav'\)/,'強化はカード合体と同じSE（2026-10-20）');
      assert.deepEqual(G.mainBoard[1],before);assert.equal(await blessingFlameExecute(),false);
      assert.equal(blessingFlameReset(),false);assert.equal(await blessingFlameLeave(),false);
      assert.equal(blessingFlameSelect(1),false);
      finish();assert.equal(await pending,true);assert.equal(G.mainBoard[1]._mergedFormApplied,true);
    }finally{document.querySelector=query;global.setTimeout=timer;}
  });
  await checkAsync('退場の実セーブ：使用済みと強化をtowerチェックポイントへ同時保存',async()=>{
    const enabled=SaveRun.enabled;
    try{
      G._debugMode=false;
      SaveRun.enabled=()=>true;
      assert.equal(await blessingFlameLeave(),true);
      const save=SaveRun.loadRun();assert.equal(save.checkpoint.type,'tower');
      assert.equal(save.state.choices._blessingFlameUsed[1],true);
      assert.equal(save.state.player.mainBoard[1]._mergedFormApplied,true);
      assert.equal(save.state.place._isVillageMenu,true);
      SaveRun.restoreRunState(save);assert.equal(openBlessingFlame(),true);
      assert.equal(blessingFlameSelect(1),false);blessingFlameClear();
    }finally{SaveRun.enabled=enabled;}
  });
  check('個体の祝福と同名/色の修正：元からある倍率は維持し、加算分を倍にしない',()=>{
    fresh();
    const raw=card('C008'),base=definition('C008');
    coreApplyCardBoon(raw,{statMul:3});
    raw.power+=9;raw.life-=2;
    const result=enhancedPanelCopy(raw);
    assert.equal(result.power,base.power*3*2+9);assert.equal(result.life,base.life*3*2-2);
    assert.equal(result.boon.statMul,3);
    G.panelPermanentBuffs={[base.name]:{atk:7,hp:11}};
    G.panelColorPermanentBuffs={[_panelColorBuffKey(base.color)]:{atk:2,hp:3}};
    const permanent=enhancedPanelCopy(card('C008'));
    assert.equal(permanent.power,base.power*2+9);assert.equal(permanent.life,base.life*2+14);
  });
  check('図鑑：停止中の3枚合体とは独立して「強化」を表示し、施設と同じ2倍の姿',()=>{
    assert.equal(PANEL_MERGE_TRIAL.enabled,false);assert.equal(panelMergeEnabled(),false);
    assert.equal(_collectionTextItem(COLLECTION_TEXTS.merge),'強化');
    _collectionKind='character';_collectionMerged=true;
    const raw=definition('C008'),shown=_collectionDisplayCard(raw);
    assert.equal(shown.power,raw.power*2);assert.equal(shown.life,raw.life*2);
    assert.equal(shown.desc,raw.mergedForm.desc);assert.equal(shown._tripleMerged,true);
    assert.equal(getCardFrameAsset(shown),getCardFrameAsset(enhancedPanelCopy(raw)));
    _collectionMerged=false;
  });
  console.log(`\n祝福の炎1019：${count}項目 OK（ブラウザの見た目は未確認）`);
})().catch(error=>{console.error(error);process.exitCode=1;});
