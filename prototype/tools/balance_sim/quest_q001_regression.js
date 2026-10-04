'use strict';

// E075/Q001：実際の内蔵シート、共通編成、オンラインpayload、所持操作、旅程と保存を検査する。
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sheet=require('./sheet_data');
const ROOT=path.resolve(__dirname,'../..');
const {makeElement}=require('./stub');
document.head=makeElement('head');
global.requestAnimationFrame=()=>0;
global.setInterval=()=>0;
console.table=()=>{};
for(const match of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)){
  if(!match[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT,match[1]),'utf8'),{filename:match[1]});
}
playFileSfx=()=>{};
let checked=0;
const check=(name,fn)=>{fn();checked++;console.log('OK '+name);};
const copy=value=>JSON.parse(JSON.stringify(value));
const makeSoul=()=>makePanel(PANEL_POOL.find(card=>_qCardNo(card)==='E075').id);
function reset(first=false,seed=1){
  initState();SaveProfile.hasClearedRun=()=>!first;
  G._runId='q001-regression';G._runSeed=seed;G._runRngState=seed;
  G._wave=1;G._waveStage=_waveRouteForWave(1).lastIndexOf('city')+1;
  G._waveVillage=true;G._waveLife=3;G.phase='reward';_rewCards=[];
  return questDebugForceWaveQuest(1,'Q001');
}
function accept(first=false,seed=1){
  const entry=reset(first,seed);
  G.mainBoard[0]=makeSoul();entry.status='accepted';entry.rewardCardTaken=true;
  _qAssignEnemyReplacements(entry);
  return entry;
}
function formationInputs(){
  reset();G.mainBoard.fill(null);
  const def=PANEL_POOL.find(card=>card.category==='キャラクター'&&card.name==='ブラウニー');
  G.mainBoard[1]=makePanel(def.id);
  const soul=makeSoul();soul.directions=['right'];G.mainBoard[0]=soul;
  G._partyBoardUnit=null;
  const formation=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false});
  assert.equal(formation.ordered.length,1);
  const pve=copy(formation.ordered[0].unit);
  const payload=JSON.parse(JSON.stringify(buildOnlineSelfFormation()));
  assert.equal(payload.units.length,1);
  const online=payload.units[0];
  assert.ok(online._adjacentPanelEffectTexts.includes(soul.desc));
  assert.ok(online.effectData.effectTexts.includes(soul.desc));
  pve.id='subject';online.id='subject';
  return {pve,online};
}
function runTrigger(unit,trigger,side='p1'){
  const other=side==='p1'?'p2':'p1';
  const foes=Array.from({length:3},(_,i)=>({id:'foe-'+i,name:'敵'+i,atk:1,hp:100,maxHp:100,lane:i===2?'rear':'front',keywords:[],desc:''}));
  const state=createBattleState({sides:{[side]:{units:[copy(unit)]},[other]:{units:foes}}});
  const subject=state.units[side][0],rng=createSeededRng(42),events=[],emit=event=>events.push(event);
  const hit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>
    coreResolveHit(state,source,target,amount,counter,rng,emit,{skipSourceEffects,skipTough,...options});
  if(trigger==='攻撃') coreApplyAttackEffects(subject,state,rng,emit,hit);
  if(trigger==='死亡'){subject.hp=0;coreApplyDeathEffects(subject,state,rng,emit,hit);}
  return {state,events,hits:events.filter(event=>event.type==='damage')};
}

(async()=>{
  await loadGameData();SaveRun.ready();
  check('E075の本文・数値・ポート・抽選除外はシートどおり、表示の；を維持する',()=>{
    const row=sheet.sheetRows('enchant').find(row=>row['No.']==='E075'),card=makeSoul();
    assert.equal(card.desc,row['効果']);assert.equal(card.desc,'攻撃＆死亡；全ての敵に7ダメージを与える。');
    assert.equal(card.rarity,2);assert.equal(card.grade,1);assert.equal(card.directionCount,1);
    const def=PANEL_POOL.find(card=>_qCardNo(card)==='E075');
    assert.equal(def._rewardAvailable,false);assert.equal(def._shopAvailable,false);
    assert.ok(CORE_EFFECT_CARD_NAMES.has(card.name));assert.ok(!_enchantPreviewKeywords(card).includes(card.name));
    assert.deepEqual(coreTriggerTextParts(card,'攻撃'),['全ての敵に7ダメージを与える。']);
    assert.deepEqual(coreTriggerTextParts(card,'死亡'),['全ての敵に7ダメージを与える。']);
    assert.deepEqual(coreTriggerTextParts(card,'負傷'),[]);
    for(const delimiter of ['；','：',':']) assert.deepEqual(coreTriggerTextParts({desc:card.desc.replace('；',delimiter)},'死亡'),coreTriggerTextParts(card,'死亡'));
    assert.ok(coreUnitTriggerText({desc:'攻撃＆負傷：全ての味方はHP+2を得る。'},'負傷'));
  });
  const inputs=formationInputs();
  for(const trigger of ['攻撃','死亡']) check(`E075 ${trigger}：実際のPvE編成と送信payloadで敵3体へ7、同一の束・通常VFX`,()=>{
    const offline=runTrigger(inputs.pve,trigger),online=runTrigger(inputs.online,trigger);
    for(const result of [offline,online]){
      assert.equal(result.hits.length,3);assert.ok(result.hits.every(event=>event.amount===7&&event.effectSource===false&&event.area));
      assert.ok(result.hits[0].batch);assert.equal(new Set(result.hits.map(event=>event.batch)).size,1);
      assert.deepEqual(result.state.units.p2.map(unit=>unit.hp),[93,93,93]);
    }
    const project=result=>result.hits.map(({amount,unitId,damageKind,effectSource,area})=>({amount,unitId,damageKind,effectSource,area}));
    assert.deepEqual(project(offline),project(online));
    assert.deepEqual(runTrigger(inputs.online,trigger,'p2').hits.map(event=>event.amount),[7,7,7]);
  });
  check('E075＋闇の炎は本文を混同せず、死亡で7と1をそれぞれ全体へ発動する',()=>{
    const unit=copy(inputs.pve);
    const flame=PANEL_POOL.find(card=>card.name==='闇の炎');
    unit._adjacentPanelEffectTexts.push(flame.desc);unit._resonanceEffectNames.push(flame.name);
    const hits=runTrigger(unit,'死亡').hits;
    assert.deepEqual(hits.map(event=>event.amount),[7,7,7,1,1,1]);
  });
  check('サイレン・アラッサスの固有効果を保ち、付与したE075は通常の全体ダメージで発動する',()=>{
    for(const name of ['サイレン','アラッサス']){
      const unit=copy(inputs.pve),def=PANEL_POOL.find(card=>card.name===name);
      unit.name=def.name;unit.no=_qCardNo(def);unit.desc=def.desc;unit.effectText=def.desc;unit.effect=def.desc;
      unit.keywords=[];unit.effectData={effectNames:[],effectTexts:unit._adjacentPanelEffectTexts};unit._resonanceEffectNames=[makeSoul().name];
      const result=runTrigger(unit,'攻撃'),soulHits=result.hits.filter(event=>event.amount===7);
      assert.equal(soulHits.length,3);assert.ok(soulHits.every(event=>event.effectSource===false));
      assert.equal(result.hits.filter(event=>event.amount===1).length,3);
      assert.equal(result.events.filter(event=>event.type==='sweep_vfx').length,1);
    }
  });
  check('E075の2枚接続は各1回ずつ発動し、payloadの重複表現で4回に増えない',()=>{
    const unit=copy(inputs.online);unit._adjacentPanelEffectTexts.push(makeSoul().desc);unit.effectData.effectTexts.push(makeSoul().desc);
    for(const trigger of ['攻撃','死亡']) assert.deepEqual(runTrigger(unit,trigger).hits.map(event=>event.amount),Array(6).fill(7));
  });
  check('runBattleCore／オンラインシミュレータから攻撃と死亡の両方を呼べる',()=>{
    const subject=copy(inputs.online);subject.hp=subject.maxHp=1;subject.atk=1;
    subject.name='検査用';subject.no='C999';subject.desc='';subject.effect='';subject.effectText='';
    const foe={id:'enemy',name:'敵',hp:100,maxHp:100,atk:2,lane:'front',keywords:[],desc:''};
    const setup={seed:8,sides:{p1:{units:[subject]},p2:{units:[foe]}}};
    const online=simulateOnlineBattle(setup),state=createBattleState(copy(setup));
    const events=[];runBattleCore(state,createSeededRng(8),{onEvent:event=>events.push(event)});
    assert.deepEqual(online.events,events);
    assert.ok(events.some(event=>event.type==='damage'&&event.damageKind==='attack_effect'&&event.amount===7));
    assert.ok(events.some(event=>event.type==='damage'&&event.damageKind==='death_effect'&&event.amount===7));
  });
  check('Q001の街候補はシートのみ、デバッグ候補に追加し、台詞・ボタン・見出しをシートから読む',()=>{
    reset();assert.deepEqual(_qRegionIds(1),['Q002','Q003']);
    assert.ok(_qDebugBuildDraft()[0].candidates.includes('Q001'));
    assert.equal(QUEST_CONFIG.Q001.portraitB,QUEST_CONFIG.Q002.portraitB);
    assert.equal(QUEST_DATA.Q001_1.initial.length,6);assert.equal(QUEST_DATA.Q001_2.initial[0].speaker,'A');
    assert.deepEqual(QUEST_DATA.Q001_1.enemyReplacementByScene,{battle:3,elite:2,boss:1});
    assert.equal(questTavernRewardTitle(),textMessage('「酒場の報酬枠」見出し3',''));
    const button=makeElement('button'),host=makeElement();host.querySelector=()=>button;
    const get=document.getElementById;document.getElementById=id=>id==='reward-move-btns'?host:null;
    G._isTavern=true;syncTavernFormationControls();assert.ok(button.innerHTML.includes(textMessage('「拒否」ボタン','')));
    G.mainBoard[0]=makeSoul();syncTavernFormationControls();assert.ok(button.innerHTML.includes(textMessage('「受領」ボタン','')));
    G.mainBoard[0]=null;syncTavernFormationControls();assert.ok(button.innerHTML.includes(textMessage('「拒否」ボタン','')));
    document.getElementById=get;G._isTavern=false;
  });
  for(const first of [false,true]) check(`${first?'初回':'通常'}旅程：ヴァルガ前の全戦へ通常1〜3・エリート1〜2・ボス1を受領時に保存する`,()=>{
    const seen=new Set();
    for(let seed=1;seed<=80;seed++){
      const entry=accept(first,seed),targets=copy(entry.enemyReplacementTargets),expected=[];
      for(let wave=1;wave<=2;wave++){
        const route=_waveRouteForWave(wave),start=wave===1?route.lastIndexOf('city')+2:1,last=wave===2?route.indexOf('city'):route.length;
        for(let stage=start;stage<=last;stage++) if(['battle','elite','boss'].includes(route[stage-1])) expected.push(`${wave}:${stage}`);
      }
      assert.deepEqual(targets.map(target=>`${target.wave}:${target.stage}`),expected);
      for(const target of targets){assert.ok(target.count>=1&&target.count<=({battle:3,elite:2,boss:1}[target.type]));seen.add(target.type+':'+target.count);}
      const rng=G._runRngState;_qAssignEnemyReplacements(entry);assert.equal(G._runRngState,rng);
      const save=SaveRun.buildRunSave('town');SaveRun.restoreRunState(save);
      assert.deepEqual(G.questProgress.Q001.enemyReplacementTargets,targets);
    }
    for(const key of ['battle:1','battle:2','battle:3','elite:1','elite:2','boss:1']) assert.ok(seen.has(key),key);
  });
  check('通常の敵数・前後衛・IDを保ち、エリート／ボス本体を保護して深層補正でEN025へ置き換える',()=>{
    const entry=accept(false,12);
    for(const target of entry.enemyReplacementTargets){
      G._wave=target.wave;G._waveStage=target.stage;G._waveVillage=false;G._waveBattleType=target.type;
      const floor=_waveStageFloor(target.wave,target.stage);G._mapBattle={type:target.type,floor};
      const preview=copy(G._waveEnemyPreview||{}),bosses=copy(G._waveBosses||{});
      const generate=()=>runWithKeyedRandom('q001:normal:'+target.wave+':'+target.stage,()=>generateEnemies(floor));
      entry.status='offered';const before=generate();entry.status='accepted';G._waveEnemyPreview=preview;G._waveBosses=bosses;
      const after=questReplaceBattleEnemies(copy(before),floor),extra=after.filter(unit=>unit._questEnemyReplacementId==='Q001');
      assert.equal(after.length,before.length);assert.equal(extra.length,target.count);
      assert.deepEqual(after.map(unit=>unit.lane),before.map(unit=>unit.lane));
      assert.deepEqual(after.map(unit=>unit.id),before.map(unit=>unit.id));
      const ranges=enemyStatRanges(ENEMY_POOL.find(def=>_enemyDefCode(def)==='EN025'),floor);
      for(let i=0;i<after.length;i++){
        const unit=after[i];
        if(unit._questEnemyReplacementId){
          assert.equal(_qCardNo(unit),'EN025');assert.ok(!before[i].boss&&!before[i].elite&&!['boss','elite'].includes(before[i].role));
          assert.ok(unit.atk>=ranges.atkMin&&unit.atk<=ranges.atkMax);assert.ok(unit.hp>=ranges.hpMin&&unit.hp<=ranges.hpMax);
        }else assert.deepEqual(unit,copy(before[i]));
      }
      const again=copy(after);questReplaceBattleEnemies(after,floor);assert.deepEqual(copy(after),again);
      assert.equal(generate().filter(unit=>unit._questEnemyReplacementId==='Q001').length,target.count);
    }
    for(const mark of [{boss:true},{elite:true},{role:'elite'},{role:'boss'},{keywords:['ボス']},{keywords:['エリート']}]){
      const board=[{id:'protected',lane:'rear',...mark},{id:'ordinary',lane:'front'}];
      assert.deepEqual(questReplaceableEnemyIndexes(board,0),[1]);
    }
  });
  check('手札・共通欄・魔導板の移動で終了せず、最後のE075を放棄した瞬間に終了・割り振り無効・到着なし',()=>{
    for(const location of ['mainBoard','spellSlots','hand','inventory','globalPanels']){
      const entry=accept(),soul=G.mainBoard[0];G.mainBoard[0]=null;G[location]=Array.isArray(G[location])?G[location]:[];G[location][0]=soul;
      assert.equal(checkQ009CompanionPresence(),false);assert.equal(entry.status,'accepted');
      G[location][0]=null;assert.equal(checkQ009CompanionPresence(),true);
      assert.equal(entry.status,'ended');assert.ok(entry.enemyReplacementTargets.every(target=>target.invalidated&&target.count===0));
      assert.equal(_qDescription(),'');G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('city')+1;G._isWaveAltar=false;
      assert.equal(_qTownArrivalEntry(),null);
      const save=SaveRun.buildRunSave('town');SaveRun.restoreRunState(save);assert.equal(G.questProgress.Q001.status,'ended');
    }
  });
  check('エルムの売却は店ごとに阻止し、初回は特殊台詞A1、次から売却ボタンを消して保存する',()=>{
    const entry=accept(),soul=G.mainBoard[0],gold=G.gold;G._isShop=true;
    const original=showVillageShopSpecialDialogue,lines=[];
    showVillageShopSpecialDialogue=column=>{lines.push(_facilityGreetingEntry(villageFacilityList().find(f=>f.key===(G._isItemShop?'item':'shop')))[column]);};
    for(const item of [false,true]){
      G._isItemShop=item;assert.equal(_boardCardSellEnabled(soul),true);
      assert.equal(questTryBlockedCardSale(soul),true);assert.equal(_boardCardSellEnabled(soul),false);
      assert.equal(questTryBlockedCardSale(soul),true);assert.equal(G.gold,gold);assert.equal(G.mainBoard[0],soul);assert.equal(entry.status,'accepted');
    }
    assert.equal(lines.length,2);assert.ok(lines.every(line=>line.speaker==='B'&&line.text&&line.face));
    const save=SaveRun.buildRunSave('town');G._facilityTalkSeen={};SaveRun.restoreRunState(save);G._isShop=true;
    for(const item of [false,true]){G._isItemShop=item;assert.equal(_boardCardSellEnabled(soul),false);}
    showVillageShopSpecialDialogue=original;
    assert.equal(_rewardAreaAcceptsCard(soul),false);assert.equal(_mergedPanelCard(soul,soul),null);
    const board=_getPartyBoardUnit();board.boardCards[2]=makeSoul();board.boardCards[3]=makeSoul();
    assert.equal(_tryTripleMergeOnBoard(board,3),null);
    G.spells=[soul];discardHeCard('spells',0);assert.equal(G.spells[0],soul);
  });
  check('エルム以外の店の売却・報酬への放棄・合成素材化は所持から消えた場合だけ終了する',()=>{
    const entry=accept();G._wave=2;G._waveVillage=true;G._isShop=true;G._isItemShop=false;
    const soul=G.mainBoard[0];assert.equal(questCardRemovalLocked(soul),false);assert.equal(_boardCardSellEnabled(soul),true);
    G.mainBoard[0]=null;_rewCards=[{...soul,_shopSalePending:true}];const gold=G.gold;
    assert.equal(_sellPendingShopCard(0),true);assert.ok(G.gold>gold);assert.equal(entry.status,'ended');
    const discarded=accept();G._waveVillage=false;const card=G.mainBoard[0];_dragSrc={arr:'boardCards',idx:0};
    _returnDragSrcToRewardArea();assert.equal(G.mainBoard[0],null);assert.equal(discarded.status,'ended');
    const merged=accept();G._waveVillage=false;const ingredient=G.mainBoard[0];
    const recipe={id:'q001-test-recipe',name:'検査用合成',mergeFrom:[ingredient.name,ingredient.name],category:'強化',desc:'',grade:1,rarity:1};
    PANEL_POOL.push(recipe);
    try{G.mainBoard[0]=_mergedPanelCard(ingredient,ingredient);assert.ok(G.mainBoard[0]);renderHandEditor();assert.equal(merged.status,'ended');}
    finally{PANEL_POOL.splice(PANEL_POOL.indexOf(recipe),1);}
  });
  check('元に戻すはカードとQ001の終了・割り振りを対で戻し、他クエストには触れない',()=>{
    accept();G._waveVillage=false;G.questProgress.Q003={questId:'Q003',wave:1,status:'offered'};_storeRewardStartSnapshot();
    G.mainBoard[0]=null;questCheckRetainedCards();G.questProgress.Q003.status='rejected';resetRewardToStart();
    assert.equal(G.questProgress.Q001.status,'accepted');assert.equal(_qCardNo(G.mainBoard[0]),'E075');
    assert.ok(G.questProgress.Q001.enemyReplacementTargets.every(target=>!target.invalidated));assert.equal(G.questProgress.Q003.status,'rejected');
  });
  // DOMの描画だけ省き、実際の受領／拒否・街到着イベントの保存と終了処理を動かす。
  vm.runInThisContext(`_qReturnToTavernResponse=()=>{};_qShowPortraitPair=async(_screen,_entry,options)=>{globalThis.q001Portrait=options;};
    _qClearPresentation=async()=>{};_qStartDialogue=(lines,options)=>{globalThis.q001Dialogue={lines,options};return Promise.resolve();};
    _qLeaveTavernAfterLines=async()=>{};renderVillageScreen=()=>{};`);
  const accepted=reset();G.mainBoard[0]=makeSoul();_qAcceptTavernQuest();
  check('受領はacceptedと割り振りを保存してシートの受託台詞へ、拒否はカードを残さず拒否台詞へ',()=>{
    assert.equal(accepted.status,'accepted');assert.deepEqual(global.q001Dialogue.lines,QUEST_DATA.Q001_1.accepted);
    assert.deepEqual(SaveRun.loadRun().state.questProgress.Q001.enemyReplacementTargets,accepted.enemyReplacementTargets);
    const rejected=reset();_rewCards=[makeSoul()];_qRejectTavernQuest();
    assert.equal(rejected.status,'rejected');assert.ok(_rewCards.every(card=>!card));assert.deepEqual(global.q001Dialogue.lines,QUEST_DATA.Q001_1.rejected);
  });
  const arrival=accept();G._wave=2;G._waveStage=_waveRouteForWave(2).indexOf('city')+1;G._isWaveAltar=false;
  const gold=G.gold;await maybeStartQuestTownArrival();
  check('ヴァルガ到着はAの台詞でも酒場と同じBを出して成功完了、E075を保持し以後の置き換えを止める',()=>{
    assert.deepEqual(global.q001Dialogue.lines,QUEST_DATA.Q001_2.initial);assert.notEqual(global.q001Portrait.withoutB,true);
    assert.equal(global.q001Portrait.portraitB||QUEST_CONFIG.Q001.portraitB,QUEST_CONFIG.Q002.portraitB);
    assert.equal(arrival.status,'completed');assert.equal(arrival.townEventDone,true);assert.equal(_qDescription(),'');
    assert.equal(_qCardNo(G.mainBoard[0]),'E075');assert.equal(G.gold,gold);assert.equal(_qActiveEntry(),null);
  });
  G._debugMode=true;questPrepareArrivalReplayForDebug(2);await maybeStartQuestTownArrival();
  check('デバッグ再生と強制終了で完了記録・カードを維持し、オンラインではQ001の機能が動かない',()=>{
    assert.equal(G.questProgress.Q001.status,'completed');questForceEndEventForDebug();assert.equal(_qTownSession,false);
    const entry=accept();G._onlineMode=true;const board=[{id:'normal',hp:10,atk:1}];const before=copy(board);
    questReplaceBattleEnemies(board,1);assert.deepEqual(board,before);G.mainBoard[0]=null;
    assert.equal(questCheckRetainedCards(),false);assert.equal(entry.status,'accepted');assert.equal(questCardRemovalLocked(makeSoul()),false);
  });
  delete global.q001Dialogue;delete global.q001Portrait;
  console.log(`E075/Q001 回帰検査: ${checked}件 OK`);
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
