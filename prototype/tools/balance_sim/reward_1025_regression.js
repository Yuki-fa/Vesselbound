'use strict';
// 本体の報酬入口・再抽選・セーブを使い、描画境界と時計だけを置換して順序を検査する。
const assert=require('node:assert/strict'),vm=require('node:vm');
const {initialize}=require('./run_bot'),{source}=require('./bot_runtime'),{makeElement}=require('./stub');
const {effectText}=require('./sheet_data');
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
function restore(name){const found=source('js/engine/reward.js').match(new RegExp(`^(?:async )?function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^\\}`,'m'));assert.ok(found,name);vm.runInThisContext(found[0]);}
let now=0,jobs=[],next=1,log=[],snapshots=[];
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
async function advance(ms){const end=now+ms;for(let turns=0;turns<200;turns++){
  await flush();jobs.sort((a,b)=>a.at-b.at||a.id-b.id);if(!jobs.length||jobs[0].at>end)break;
  const job=jobs.shift();now=job.at;job.fn();
}now=end;await flush();}
function offer(color,category='キャラクター'){return {...panel(category==='キャラクター'?'C006':'E005'),category,color,power:1,life:1,rarity:5,_isOriginalReward:true};}
function panel(no){const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def,no);return makePanel(def.id);}
(async()=>{
  const api=await initialize();
  for(const name of ['_finishRewardReveal','_playRewardReveal','_storeRewardStartSnapshot'])restore(name);
  global.setTimeout=(fn,ms)=>{const id=next++;jobs.push({id,at:now+Math.max(0,Number(ms)||0),fn});return id;};
  global.clearTimeout=id=>{jobs=jobs.filter(j=>j.id!==id);};
  const realPrepare=_prepareRewardRerollReveal,realSweep=_playRewardRevealSweep,realBuff=_playRewardAppearanceBuffs;
  _prepareRewardRerollReveal=(cards,options)=>{
    _finishRewardReveal(true);const layer=makeElement('div');layer.parentElement=makeElement('div');layer.remove=()=>log.push('remove');
    const reveal={layer,token:_rewardRevealToken,rigs:cards.map((c,idx)=>({idx,rig:{style:{},face:options?.faceDown?'back':'front',
      _cr:{faceFront:{querySelector:()=>({replaceChildren(){log.push('replace');}})}}}}))};
    _rewardRerollReveal=reveal;log.push(options?.faceDown?'prepare:back':'prepare:front');return reveal;
  };
  _playRewardRevealSweep=()=>log.push('sweep');
  cardRevealTurnDown=rig=>{log.push('down');return new Promise(resolve=>setTimeout(()=>{rig.face='back';resolve();},760));};
  cardRevealPlaySequence=(rigs,rarities)=>{
    assert.ok(rarities.filter(r=>r>1).length<=1&&rarities.every(r=>r>=1),'演出付きでめくるのは最高レアの1枚だけ（2026-10-26）');log.push('up');
    return new Promise(resolve=>setTimeout(()=>{rigs.forEach(r=>r.face='front');log.push('front');resolve();},760));
  };
  cardRevealReset=()=>{};_rewardRerollFace=c=>c;
  _playRewardAppearanceBuffs=async waves=>{log.push('buff:'+waves.length);assert.ok(waves.every(w=>w.length===G.mainBoard.filter(Boolean).length));};
  const savedEnabled=SaveRun.enabled,savedCheckpoint=SaveRun.checkpoint;
  SaveRun.enabled=()=>true;SaveRun.checkpoint=type=>{snapshots.push(SaveRun.buildRunSave(type));log.push('save');return true;};
  function fresh(){api.resetRun();initState();SaveRun.begin();G.phase='reward';G._wave=2;G._waveStage=1;G._waveLife=3;G.gold=800;
    now=0;jobs=[];log=[];snapshots=[];_rewardRerollReveal=null;
    G.mainBoard.fill(null);G.mainBoard[0]=panel('C040');G.mainBoard[2]=panel('C040');_rewCards=[offer('青'),offer('青'),offer('緑'),offer('青','エンチャント'),offer('青','アイテム')];
  }
  await check('報酬生成：店と通常報酬の抽選ではまだノスフェラトゥを強化しない',()=>{
    fresh();const before=G.mainBoard.filter(Boolean).map(c=>[c.power,c.life]);
    applyRewardCharacterEffects(_rewCards);drawRewards();drawRewards(undefined,{trader:true});
    assert.deepEqual(G.mainBoard.filter(Boolean).map(c=>[c.power,c.life]),before);
  });
  await check('開始時：5枚を裏向き→光の帯640ms→通常めくり→加算と保存',async()=>{
    fresh();const card=G.mainBoard[0],before=[card.power,card.life],amount=effectText('C040').match(/\+(\d+)\/\+(\d+)/);
    _markRewardAppearancePending(_rewCards);const task=_playRewardReveal();assert.equal(log[0],'prepare:back');assert.deepEqual([card.power,card.life],before);
    await advance(REWARD_REVEAL_START_MS-1);assert.ok(!log.includes('sweep'));
    await advance(1);assert.ok(log.includes('sweep'));assert.ok(!log.includes('up'));
    await advance(REWARD_REVEAL_SWEEP_MS-1);assert.ok(!log.includes('up'));assert.deepEqual([card.power,card.life],before);
    await advance(1);assert.ok(log.includes('up'));assert.deepEqual([card.power,card.life],before);
    await advance(760);await task;
    assert.deepEqual([card.power,card.life],[before[0]+2*Number(amount[1]),before[1]+2*Number(amount[2])]);
    assert.ok(log.indexOf('front')<log.indexOf('buff:2'));assert.ok(log.indexOf('remove')<log.indexOf('buff:2'));
    assert.equal(snapshots.length,1);assert.ok(snapshots[0].state.reward.cards.every(c=>c._rewardAppearancePending===false));
    assert.equal(_rewardRerollReveal,null);assert.equal(document.getElementById('reward-reveal-layer'),null);
  });
  await check('本文の数値・強化本文・改名を読む。複数体へ青キャラ1枚につき1回',()=>{
    fresh();G.mainBoard[2].desc=effectText('C040',true);G.mainBoard[2].name='改名した効果の持ち主';
    const before=G.mainBoard.filter(Boolean).map(c=>[c.power,c.life]);_markRewardAppearancePending(_rewCards);_completeRewardAppearance(_rewCards);
    const amounts=[false,true].map(enhanced=>effectText('C040',enhanced).match(/\+(\d+)\/\+(\d+)/).slice(1).map(Number));
    assert.deepEqual(G.mainBoard.filter(Boolean).map(c=>[c.power,c.life]),before.map((b,i)=>b.map((v,j)=>v+2*amounts[i][j])));
    const after=clone(G.mainBoard);_completeRewardAppearance(_rewCards);renderRewCards();assert.deepEqual(G.mainBoard,after);
    assert.deepEqual(G._rewardStartSnapshot.mainBoard,after,'元に戻すの基準にも加算を含める');
  });
  await check('再開：保存した報酬を表示しても二重加算せず、表示前の保存からは1回だけ得る',()=>{
    fresh();_markRewardAppearancePending(_rewCards);const pending=SaveRun.buildRunSave('reward');_completeRewardAppearance(_rewCards);
    const after=clone(G.mainBoard),complete=SaveRun.buildRunSave('reward');
    SaveRun.restoreRunState(complete);goToReward({restoreCheckpoint:true});assert.deepEqual(G.mainBoard,after);
    SaveRun.restoreRunState(pending);goToReward({restoreCheckpoint:true});assert.deepEqual(G.mainBoard,after);
    goToReward({restoreCheckpoint:true});assert.deepEqual(G.mainBoard,after);
    assert.ok(!log.includes('prepare:back'),'再開ではめくらない');
  });
  await check('旧セーブ：印の無い既存報酬には遡って加算しない',()=>{
    fresh();const before=clone(G.mainBoard);goToReward({restoreCheckpoint:true});assert.deepEqual(G.mainBoard,before);
  });
  await check('施設・トレーダー・オンライン：商品を報酬として数えない',()=>{
    for(const flag of ['_isShop','_isPeddler','_isForge','_isItemShop','_isLibrary','_isTavern','_isRingExchange','_isVillageMenu','_isWaveAltar','_isFiveSaints','_onlineMode']){
      fresh();G[flag]=true;const before=clone(G.mainBoard);_markRewardAppearancePending(_rewCards);_completeRewardAppearance(_rewCards);
      assert.deepEqual(G.mainBoard,before,flag);assert.ok(_rewCards.every(c=>!c._rewardAppearancePending),flag);
    }
  });
  await check('リロール：5枚とも裏になるまで表を入れ替えず、表になってから新たな青だけ加算',async()=>{
    fresh();_markRewardAppearancePending(_rewCards);_completeRewardAppearance(_rewCards);const before=clone(G.mainBoard);log=[];snapshots=[];
    const draw=drawRewards;
    try{drawRewards=()=>[offer('青'),offer('緑'),offer('青','エンチャント'),offer('紫'),offer('赤')].map(c=>({...c,rarity:1}));towerBoonState().rerolls=1;
      assert.equal(towerBoonRerollRewards(),true);assert.equal(log.filter(x=>x==='down').length,5);assert.ok(!log.includes('replace'));
      assert.deepEqual(G.mainBoard,before);await advance(759);assert.ok(!log.includes('replace'));
      await advance(1);assert.equal(log.filter(x=>x==='replace').length,5);assert.deepEqual(G.mainBoard,before);
      await advance(760);const amount=effectText('C040').match(/\+(\d+)\/\+(\d+)/);
      G.mainBoard.forEach((c,i)=>{if(c)assert.deepEqual([c.power,c.life],[before[i].power+Number(amount[1]),before[i].life+Number(amount[2])]);});
      assert.ok(log.includes('buff:1'));assert.equal(_rewardRerollReveal,null);assert.equal(snapshots.at(-1).state.reward.cards[0]._rewardAppearancePending,false);
    }finally{drawRewards=draw;}
  });
  await check('めくり取消：古いタイマーが次の報酬を加算しない',async()=>{
    fresh();_markRewardAppearancePending(_rewCards);const before=clone(G.mainBoard),task=_playRewardReveal();_finishRewardReveal(true);
    await advance(4000);await task;assert.deepEqual(G.mainBoard,before);assert.ok(!log.includes('up'));
  });
  await check('初回入口はcheckpoint時だけめくる。施設・再開・報酬なしでは呼ばない',()=>{
    const reveal=_playRewardReveal;let calls=0;_playRewardReveal=()=>{calls++;};
    try{for(const mode of ['battle','restore','facility','none']){fresh();if(mode==='facility')G._isShop=true;
      goToReward(mode==='restore'?{restoreCheckpoint:true}:mode==='none'?{checkpoint:true,noNewRewards:true}:{checkpoint:true});
      assert.equal(calls,1,mode);
    }}finally{_playRewardReveal=reveal;}
  });
  await check('実際の通常めくり準備は、初回に表を表示せず報酬枠の座標と寸法を使う',()=>{
    fresh();const oldById=document.getElementById,oldFace=cardRevealShowFace,oldRig=cardRevealCreateRig,oldFinish=_finishRewardReveal,oldCreate=document.createElement;
    let shown=0;const host=makeElement(),row=makeElement();host.offsetWidth=3840;host.getBoundingClientRect=()=>({left:0,top:0,width:1920});
    row.children=_rewCards.map((_,i)=>({dataset:{mergeRewIdx:String(i)},getBoundingClientRect:()=>({left:100+i*100,top:400,width:80,height:120})}));
    try{document.getElementById=id=>id==='scr-battle'?host:id==='reward-offer-row'?row:null;
      _finishRewardReveal=()=>{};cardRevealShowFace=()=>{shown++;};cardRevealCreateRig=(_front,width)=>{assert.equal(width,160);return makeElement();};
      const reveal=realPrepare(_rewCards,{faceDown:true});assert.equal(shown,0);assert.equal(reveal.rigs.length,5);assert.equal(reveal.rigs[0].rig.style.left,'200px');assert.equal(reveal.rigs[0].rig.style.top,'800px');
    }finally{document.getElementById=oldById;document.createElement=oldCreate;cardRevealShowFace=oldFace;cardRevealCreateRig=oldRig;_finishRewardReveal=oldFinish;_rewardRerollReveal=null;}
  });
  await check('ノスフェラトゥのVFX：青1枚ごとに全個体のカード上へaura-buff、S009の音は同じ波に1回',async()=>{
    fresh();const oldEl=_activationSlotEl,oldPlay=VbFx.play,oldSound=_playCardEffectSfxAtCue;
    const targets=[makeElement(),makeElement()];targets.forEach(t=>{t.isConnected=true;});const fx=[],sounds=[];
    try{_activationSlotEl=i=>targets[i===0?0:1];VbFx.play=async(name,options)=>{fx.push({name,options});};
      _playCardEffectSfxAtCue=(code,duration)=>sounds.push({code,duration});
      await realBuff([[0,2],[0,2]],_rewardRevealToken);assert.equal(fx.length,4);
      assert.ok(fx.every(f=>f.name==='aura-buff'&&f.options.source===f.options.targets[0]));
      assert.deepEqual(sounds,[{code:'S009',duration:700},{code:'S009',duration:700}]);
    }finally{_activationSlotEl=oldEl;VbFx.play=oldPlay;_playCardEffectSfxAtCue=oldSound;}
  });
  _prepareRewardRerollReveal=realPrepare;_playRewardRevealSweep=realSweep;SaveRun.enabled=savedEnabled;SaveRun.checkpoint=savedCheckpoint;
  console.log(`reward_1025: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
