'use strict';

// 取り込み済みの内蔵シート→本番loader→編成・コア・保存の出口を検査する。ブラウザは使わない。
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sheet=require('./sheet_data');
require('./load');
const copy=value=>JSON.parse(JSON.stringify(value));
const changes=[['E066','E102','宿業の刻印'],['E076','E101','抑圧の刻印'],['E077','E103','受難の刻印'],
  ['E078','E104','苦悶の刻印'],['E079','E105','修道の刻印'],['E080','E106','我慢の刻印'],
  ['E101','E107','落とし物'],['E102','E108','木箱']];
let passed=0,failed=0;
async function check(label,fn){try{await fn();passed++;console.log('OK '+label);}catch(e){failed++;console.error('NG '+label+'\n'+e.stack);}}
function panel(no){const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);return makePanel(def.id);}
function fresh(){
  initState();SaveRun.begin();Object.assign(G,{phase:'reward',_wave:1,_waveStage:1,_waveLife:3,gold:800});
  G.mainBoard.fill(null);G.rings=[];G.mapPanelPowers={};_rewCards=[];_rewFreePickDone=false;_rewPhaseId=1;
}
function legacy(card,old){
  const out=copy(card);out.id='panel_sheet_'+old;
  for(const key of ['no','No','No.','artCode','imageNo'])out[key]=old;
  return out;
}
function setup(cards=G.mainBoard){
  return {seed:1027, ...coreBattleEndCardFields({p1:cards}),
    sides:{p1:{units:[{id:'hero',atk:100,hp:100,maxHp:100,keywords:[]}]},
      p2:{units:[{id:'foe',atk:1,hp:1,maxHp:1,keywords:[]}]}},summonDefs:PANEL_POOL};
}
function finish(cards=G.mainBoard){
  const state=createBattleState(setup(cards)),events=[];
  coreTriggerBattleEnd(state,e=>events.push(e),createSeededRng(1027));
  events.forEach(applyCoreBattleEndCardEvent);return {state,events};
}

(async()=>{
  console.table=()=>{};await loadGameData();
  await check('番号変更8枚は名前・ID・番号が一意に対応し、クエスト設定と五聖の候補も現行番号',()=>{
    for(const [,no,name]of changes){const c=panel(no);assert.equal(c.name,name);assert.equal(PANEL_POOL.filter(d=>d.no===no).length,1);assert.equal(makePanel(c.id).name,name);}
    assert.equal(new Set(PANEL_POOL.map(c=>c.id)).size,PANEL_POOL.length);
    assert.deepEqual(new Set(FIVE_SAINTS_ENGRAVING_NOS),new Set(changes.slice(0,6).map(c=>c[1])));
    assert.equal(QUEST_CONFIG.Q002.rewardMix.cardNo,'E107');assert.equal(QUEST_CONFIG.Q007.requiredCardNo,'E108');
    assert.equal(presentLabFx('E103')[0],'suffering-brand');assert.equal(presentLabFx('E104')[0],'gold-loss');
    assert.equal(getEffectSfxKey('E103'),'E103');assert.match(Assets.sfx.E103,/E077\.wav/);assert.match(Assets.sfx.E104,/E078\.wav/);/* 受難・苦悶は旧番号の音のファイルを引く。E077 は一時の眠りの番号になった（6cc3d8a） */
    fresh();const c=panel('E101');c._fiveSaintsOfferCard=true;c._fiveSaintsOfferNo='E101';c._fixedBoardSlot=2;
    assert.equal(_cardIsSuppressionEngraving(c),true);assert.equal(_cardIsSuppressionEngraving(panel('E076')),false);
    assert.equal(fiveSaintsCardCanUseBoardSlot(c,2),true);assert.equal(fiveSaintsCardCanUseBoardSlot(c,3),false);
  });
  await check('落とし物は選定済みの戦闘報酬へ混ざり、木箱の所持数と回収は別の刻印を含めない',()=>{
    fresh();const entry={questId:'Q002',wave:1,status:'accepted',rewardMixTargets:[{wave:1,stage:2,used:false}]};
    G.questProgress.Q002=entry;G._waveStage=2;
    const rewards=questMixBattleRewards([panel('C006')]);assert.equal(rewards[0].no,'E107');assert.equal(entry.rewardMixTargets[0].used,true);
    G.questProgress={Q007:{questId:'Q007',wave:3,status:'accepted'}};
    G.mainBoard[0]=panel('E108');G.mainBoard[1]=panel('E108');G.mainBoard[2]=panel('E102');
    assert.equal(_qCargoHeldCount(G.questProgress.Q007),2);
    assert.equal(_qTakeOwnedCards('E108',G.questProgress.Q007),2);assert.equal(G.mainBoard[2].name,'宿業の刻印');
  });
  await check('旧セーブの8番号・生成ID・番号別名・在庫・元に戻す控え・五聖の選択を一度だけ移行',()=>{
    fresh();changes.forEach(([old,no],i)=>G.mainBoard[i]=legacy(panel(no),old));
    const oldCards=copy(G.mainBoard);_rewCards=[copy(oldCards[0])];
    G._rewardStartSnapshot={mainBoard:copy(oldCards)};G._waveShopStock={1:[copy(oldCards[7])]};
    G._fiveSaints={visited:true,offeredNos:['E066','E076'],offers:{1:'E076'},decisions:{1:{accepted:true,no:'E076'}},targets:{1:2}};
    const save=SaveRun.buildRunSave('reward');delete save.enchantNumberVersion;
    const before=JSON.stringify(save),migrated=SaveRun.validate(save);assert.equal(JSON.stringify(save),before,'入力セーブを破壊しない');
    SaveRun.restoreRunState(migrated);
    for(const [,no,name]of changes){const c=G.mainBoard.find(c=>c&&c.no===no);assert.ok(c);assert.equal(c.name,name);assert.equal(makePanel(c.id).name,name);for(const key of ['No','No.','artCode','imageNo'])assert.equal(c[key],no);}
    assert.equal(G._rewardStartSnapshot.mainBoard[0].id,'panel_sheet_E102');assert.equal(G._waveShopStock[1][0].no,'E108');
    assert.equal(_rewCards[0].no,'E102');assert.equal(G._fiveSaints.offers[1],'E101');assert.equal(G._fiveSaints.decisions[1].no,'E101');
    assert.deepEqual(SaveRun.validate(migrated),migrated,'再検査で番号を再移行しない');
    SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));assert.equal(G.mainBoard[0].no,'E102');
  });
  await check('旧IDだけ・旧番号だけの参照も同じカードを指し、新セーブの呪いの印・刻印は再移行しない',()=>{
    fresh();G.mainBoard[0]={id:'panel_sheet_E066',name:'宿業の刻印',category:'エンチャント'};
    G.mainBoard[1]={no:'E101',name:'落とし物',category:'エンチャント'};
    const old=SaveRun.buildRunSave('reward');delete old.enchantNumberVersion;SaveRun.restoreRunState(old);
    assert.equal(makePanel(G.mainBoard[0].id).name,'宿業の刻印');assert.equal(PANEL_POOL.find(c=>c.no===G.mainBoard[1].no).name,'落とし物');
    fresh();G.mainBoard[0]=panel('E066');G.mainBoard[1]=panel('E101');G.mainBoard[2]=panel('E102');
    const save=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(save);
    assert.deepEqual(G.mainBoard.slice(0,3).map(c=>[c.no,c.name]),[['E066','呪いの印'],['E101','抑圧の刻印'],['E102','宿業の刻印']]);
  });
  await check('呪いの印はシートの毒・弱体を接続キャラへ付与し、開始値・毒の手番・弱体の被ダメージに反映',()=>{
    fresh();const curse=panel('E066'),hero=panel('C006');curse.directions=['right'];hero.directions=['left'];hero.power=30;hero.life=80;hero.desc='';hero.keywords=[];
    G.mainBoard[0]=curse;G.mainBoard[1]=hero;
    const raw=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0].unit;
    const kws=sheet.sheetRows('enchant').find(c=>c['No.']==='E066')['キーワード'].split(/\s+/);
    assert.ok(kws.every(k=>coreUnitKeywords(raw).includes(k)));assert.ok(!coreUnitKeywords(raw).includes(curse.name));
    const state=createBattleState({sides:{p1:{units:[raw]},p2:{units:[{id:'foe',atk:1,hp:100,maxHp:100}]}},...coreBattleEndCardFields({p1:G.mainBoard})});
    const u=state.units.p1[0],events=[],poison=Number(kws.find(k=>k.startsWith('毒')).slice(1)),weaken=Number(kws.find(k=>k.startsWith('弱体')).slice(2));
    assert.equal(u.poison,poison);assert.equal(u.weaken,weaken);const hp=u.hp;
    coreApplyPoisonBeforeTurn(u,e=>events.push(e));assert.equal(u.hp,hp-poison);
    coreResolveHit(state,state.units.p2[0],u,1,false,createSeededRng(1),e=>events.push(e));assert.equal(u.hp,hp-poison-1-weaken);
    const online=window.buildOnlineSelfFormation();assert.equal(online.battleEndCards.p1[0].no,'E066');
    const received=createBattleState({sides:{p1:{units:online.units}},battleEndCards:online.battleEndCards});
    assert.deepEqual([received.units.p1[0].poison,received.units.p1[0].weaken],[poison,weaken]);
  });
  for(const enhanced of [false,true])await check(`呪いの印${enhanced?'+':''}：4→3→2→1戦を表示、保存再開し4回目だけ英雄の印${enhanced?'+':''}へ変化`,()=>{
    fresh();const base=panel('E066');G.mainBoard[0]=enhanced?enhancedPanelCopy(base):base;
    Object.assign(G.mainBoard[0],{directions:['up','right'],directionCount:2,_placeKey:'curse-instance'});
    for(let count=0;count<4;count++){
      assert.match(_rawSubstitutedDesc(G.mainBoard[0]),new RegExp('あと'+(4-count)+'戦'));
      assert.equal(G.mainBoard[0]._battleEndCount||0,count);
      const {events}=finish();assert.equal(events.filter(e=>e.kind==='enchant_transform').length,1);
      const once=copy(G.mainBoard);events.forEach(applyCoreBattleEndCardEvent);assert.deepEqual(G.mainBoard,once,'同じイベントの再生は冪等');
      SaveRun.restoreRunState(SaveRun.buildRunSave('reward'));
      if(count<3)assert.equal(G.mainBoard[0].no,'E066');
    }
    const result=G.mainBoard[0],hero=enhanced?enhancedPanelCopy(panel('E073')):panel('E073');
    assert.equal(result.no,'E073');assert.equal(result.desc,hero.desc);assert.deepEqual(result.adjacentKeywords,hero.adjacentKeywords);
    assert.equal(!!result._tripleMerged,enhanced);assert.deepEqual(result.directions,['up','right']);assert.equal(result._placeKey,'curse-instance');
    assert.equal(result._battleEndCount,undefined);assert.ok(!/毒12|弱体12|あとX戦/.test(_rawSubstitutedDesc(result)));
    assert.equal(finish().events.filter(e=>e.kind==='enchant_transform').length,0);
  });
  await check('個体ごとの終戦を数える：未配置は数えず、未接続・接続先死亡・複数接続でも1戦で1回',()=>{
    fresh();const unplaced=panel('E066');G.mainBoard[0]=panel('E066');finish();assert.equal(unplaced._battleEndCount,undefined);
    G.mainBoard[2]=panel('E066');G.mainBoard[2]._battleEndCount=3;
    const initial=setup(),state=createBattleState(initial),events=[];
    state.units.p1=[{id:'dead',hp:0,boardCards:[copy(G.mainBoard[0])]},{id:'copy',hp:0,boardCards:[copy(G.mainBoard[0])]}];
    coreTriggerBattleEnd(state,e=>events.push(e),createSeededRng(1));events.forEach(applyCoreBattleEndCardEvent);
    assert.equal(G.mainBoard[0]._battleEndCount,2);assert.equal(G.mainBoard[2].no,'E073');assert.equal(events.filter(e=>e.kind==='enchant_transform').length,2);
  });
  await check('4戦目の同じ終戦でグリマルキンに強化された呪いの印も、英雄の印+になる',()=>{
    fresh();G.mainBoard[0]=panel('E066');G.mainBoard[0]._battleEndCount=3;
    const def=PANEL_POOL.find(c=>/回目の終戦ごとに/.test(c.desc||''));assert.ok(def);
    const input=setup(),owner=input.sides.p1.units[0],after=Number(def.desc.match(/(\d+)回目/)[1]);
    owner.desc=def.desc;owner._battleEndCount=after-1;owner._mainBoardSlot=1;
    owner.boardCards=[{...copy(G.mainBoard[0]),_mainBoardSlot:0}];G.mainBoard[1]=makePanel(def.id);
    const state=createBattleState(input),events=[];coreTriggerBattleEnd(state,e=>events.push(e),createSeededRng(1));
    assert.equal(events.find(e=>e.kind==='enchant_transform').toName,'英雄の印+');
    for(const event of events){applyCoreRunEffectEvent(event);applyCoreBattleEndCardEvent(event);}
    assert.equal(G.mainBoard[0].no,'E073');assert.equal(G.mainBoard[0]._tripleMerged,true);
  });
  await check('runBattleCore・オンライン計算・保存戦闘の終戦から同じ変化イベントが出て、保存再生が魔導板へ戻す',()=>{
    fresh();G.mainBoard[0]=panel('E066');G.mainBoard[0]._battleEndCount=3;const input=setup();
    const direct=[],state=createBattleState(copy(input));runBattleCore(state,createSeededRng(input.seed),{onEvent:e=>direct.push(e)});
    const online=simulateOnlineBattle(copy(input));const pick=es=>es.filter(e=>e.kind==='enchant_transform');
    assert.deepEqual(pick(direct),pick(online.events));assert.equal(pick(direct)[0].toName,'英雄の印');
    const mirror={...copy(input),battleEndCards:{p2:copy(input.battleEndCards.p1)}};
    const mirrored=simulateOnlineBattle(mirror);assert.equal(pick(mirrored.events)[0].side,'p2');assert.equal(pick(mirrored.events)[0].toName,'英雄の印');
    const pending=SaveRun.computeBattle(createBattleState(copy(input)),input.seed);
    assert.deepEqual(pick(pending.events),pick(direct));const save=SaveRun.buildRunSave('battle',pending);
    save.pendingBattle=SaveRun.packBattleEvents(pending);const loaded=SaveRun.validate(save);SaveRun.restoreRunState(loaded);
    G._savedBattleEnd={pending:loaded.pendingBattle,applied:false};G._battleCoreEvents=[];
    assert.equal(SaveRun.applyEnd({units:{p1:copy(pending.setup.units.p1),p2:copy(pending.setup.units.p2)}}),true);
    assert.equal(G.mainBoard[0].no,'E073');const done=copy(G.mainBoard);SaveRun.applyEnd(state);assert.deepEqual(G.mainBoard,done);
  });
  await check('旧戦闘セーブのsetup・frame・イベント内のカードIDと番号も移行',()=>{
    fresh();const pending=SaveRun.computeBattle(createBattleState(setup()),1027),old=legacy(panel('E102'),'E066');
    pending.setup.units.p1[0].boardCards=[copy(old)];pending.frames[0].state.units.p1[0].boardCards=[copy(old)];
    pending.events[0].oldCard=copy(old);const save=SaveRun.buildRunSave('battle',pending);delete save.enchantNumberVersion;
    const migrated=SaveRun.validate(save);
    for(const c of [migrated.pendingBattle.setup.units.p1[0].boardCards[0],migrated.pendingBattle.frames[0].state.units.p1[0].boardCards[0],migrated.pendingBattle.events[0].oldCard]){
      assert.equal(c.no,'E102');assert.equal(makePanel(c.id).name,'宿業の刻印');
    }
  });
  await check('実装・報酬・店の許可を現行シートから読み、呪いの印・殉教・一時の眠りの入手制限を更新',()=>{
    fresh();const rows=sheet.sheetRows('enchant');
    for(const no of ['E060','E076','E077','E066']){
      const c=panel(no),r=rows.find(r=>r['No.']===no),yes=k=>String(r[k]).toLowerCase()==='true';
      assert.equal(c._implemented,yes('実装'));assert.equal(!!c._rewardExcluded,!yes('報酬'));assert.equal(!!c._shopExcluded,!yes('ショップ'));
    }
    for(let i=0;i<20;i++){for(const cards of [drawRewards(3),drawRewards(3,{trader:true})]){assert.ok(cards.length);assert.ok(cards.every(c=>c.no!=='E060'));}}
    assert.ok(panel('E057').adjacentKeywords.includes('封印6'));
  });
  await check('巻物の各段階の新テキストキーを保持し、廃止した説明UI・旧キー参照を復活させない',()=>{
    const rows=sheet.parseCsv(sheet.loadLocalXlsxData().textMessage),keys=new Set(rows.map(r=>r[0]));
    const headers=rows.find(r=>r.includes('場面')&&r.includes('テキスト'));
    const messageByKey=new Map(rows.map(r=>[r[headers.indexOf('場面')],r[headers.indexOf('テキスト')]]));
    const names=['変身の巻物','結界の巻物','復活の巻物','巨大化の巻物','魂交換の巻物','絆の巻物','毒牙の巻物','邪眼の巻物','衝撃の巻物','二段攻撃の巻物','隠密の巻物','先制の巻物','三方向攻撃の巻物','生命吸収の巻物','貫通の巻物','熟練の巻物'];
    for(const name of names){const c=ITEM_POOL.find(c=>c.name===name);assert.ok(c,name);const pair=['変身の巻物','魂交換の巻物'].includes(name);
      for(let step=1;step<=(pair?2:1);step++){const key=`「${name}」使用時${pair?step:''}`;assert.ok(keys.has(key),key);assert.ok(messageByKey.get(key),key);assert.equal(textMessage(key,''),messageByKey.get(key));}}
    assert.equal(typeof _itemUsePromptText,'undefined','picking-1026で廃止した報酬説明UIを戻さない');
    assert.ok(textMessage('報酬未入手時',''));
    for(const key of ['「マモン」','「チェンジリング」1','「チェンジリング」2'])assert.ok(textMessage(key,''),key);
    for(const file of fs.readdirSync(path.resolve(__dirname,'../../js/engine')).filter(f=>f.endsWith('.js'))){
      const source=fs.readFileSync(path.resolve(__dirname,'../../js/engine',file),'utf8');
      assert.doesNotMatch(source,/「(?:盾の巻物|幻視の巻物|生贄人形|永劫の巻物|魔力の巻物)」使用時|「絆の巻物」使用時[12]/,file);
    }
  });
  console.log(`シート1027: OK ${passed} / NG ${failed}`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
