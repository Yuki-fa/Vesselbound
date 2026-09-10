'use strict';
const assert=require('node:assert/strict');
const {launch}=require('./headless');

const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';

(async()=>{
  const browser=await launch();
  try{
    await browser.goto(URL);
    await browser.waitFor('typeof beginUnitStealPresentation==="function"&&typeof presentPreAttackPlan==="function"',20000);

    const steal=await browser.eval(`
      document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
      document.getElementById('scr-battle').classList.add('active');
      document.body.className='';
      const mk=(id,side)=>({id,name:id,side,lane:'front',atk:3,hp:20,maxHp:20,color:'赤',keywords:[],desc:'',_panelSummoned:true});
      const e1=mk('steal-e1','p2'), stolen=mk('steal-target','p2'), e3=mk('steal-e3','p2'), ally=mk('steal-a1','p1');
      G.enemies=[e1,stolen,e3]; G.allies=[ally]; G._battleCompactMoves=new Map();
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const left=id=>Math.round(document.querySelector('.slot[data-unit-id="'+id+'"]')?.getBoundingClientRect().left||0);
      const before={e1:left('steal-e1'),e3:left('steal-e3'),ally:left('steal-a1')};
      G.enemies.splice(G.enemies.indexOf(stolen),1); stolen.side='p1'; G.allies.push(stolen);
      const began=beginUnitStealPresentation(stolen,'p2');
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const waiting={e1:left('steal-e1'),e3:left('steal-e3'),ally:left('steal-a1')};
      const motion=playUnitStealMotion(stolen,'p2','p1',()=>{
        renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      },80);
      await new Promise(resolve=>setTimeout(resolve,300));
      // C090の待機中に別の再描画が入る、実際に問題が起きていた条件。
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const pending={e1:left('steal-e1'),e3:left('steal-e3'),ally:left('steal-a1')};
      await motion;
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const landed=left('steal-target');
      await new Promise(resolve=>setTimeout(resolve,380));
      const settled=left('steal-target');
      const released={e1:left('steal-e1'),e3:left('steal-e3'),ally:left('steal-a1')};
      return {began,before,waiting,pending,released,landed,settled};
    `);
    assert.ok(steal.began,'奪う演出の準備');
    assert.deepEqual(steal.waiting,steal.before,'奪取待機中に発動元・既存カードを動かさない');
    assert.deepEqual(steal.pending,steal.before,'奪うVFX待機中に敵陣を詰めない');
    assert.notDeepEqual(steal.released,steal.before,'奪う移動開始時に敵陣を詰める');
    assert.ok(Math.abs(steal.landed-steal.settled)<=1,'奪ったカードが着地後にもう一度ずれている');
    console.log('OK 奪う移動開始まで元の敵配置を保持');

    const onlineSteal=await browser.eval(`
      const mk=(id,side)=>({id,name:id,side,lane:'front',atk:3,hp:20,maxHp:20,color:'赤',keywords:[],desc:'',_panelSummoned:true});
      const e1=mk('online-e1','p2'), target=mk('online-target','p2'), e3=mk('online-e3','p2'), ally=mk('online-a1','p1');
      G.enemies=[e1,target,e3]; G.allies=[ally]; G._battleCompactMoves=new Map();
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const left=id=>Math.round(document.querySelector('.slot[data-unit-id="'+id+'"]')?.getBoundingClientRect().left||0);
      const before={e1:left('online-e1'),target:left('online-target'),e3:left('online-e3'),ally:left('online-a1')};
      const motion=playUnitStealMotion(target,'p2','p1',()=>{
        G.enemies.splice(G.enemies.indexOf(target),1); target.side='p1'; G.allies.push(target);
        renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      },80);
      await new Promise(resolve=>setTimeout(resolve,300));
      renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const waiting={e1:left('online-e1'),target:left('online-target'),e3:left('online-e3'),ally:left('online-a1')};
      await motion;
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const landed=left('online-target');
      await new Promise(resolve=>setTimeout(resolve,380));
      return {before,waiting,landed,settled:left('online-target')};
    `);
    assert.deepEqual(onlineSteal.waiting,onlineSteal.before,'オンライン奪取待機中に盤面が動いている');
    assert.ok(Math.abs(onlineSteal.landed-onlineSteal.settled)<=1,'オンラインで奪ったカードが着地後にもう一度ずれている');
    console.log('OK オンライン奪取も待機中固定・最終地点へ1回で移動');

    const siren=await browser.eval(`
      const originalMotion=playAttackMotion;
      const originalFlash=presentEffectFlashEvent;
      const originalSweep=presentSweepAttack;
      const trace=[];
      try{
        const siren={id:'siren-double',name:'サイレン',side:'p1',lane:'front',atk:2,hp:40,maxHp:40,color:'赤',keywords:['二段攻撃'],desc:'攻撃：全てのキャラクターに1ダメージを与える。',_panelSummoned:true};
        const enemy={id:'siren-enemy',name:'敵',side:'p2',lane:'front',atk:1,hp:40,maxHp:40,color:'黒',keywords:[],desc:'',_panelSummoned:true};
        G.allies=[siren]; G.enemies=[enemy]; G._coreDrivenBattle=true;
        renderField('f-enemy',G.enemies,true); renderField('f-ally',G.allies,false);
        let strike=0;
        playAttackMotion=async(_attacker,_target,_enemySide,onImpactPause)=>{
          const n=++strike; trace.push('start'+n);
          await new Promise(resolve=>setTimeout(resolve,20));
          const hold=typeof onImpactPause==='function'?onImpactPause():null;
          trace.push('pause'+n);
          if(hold&&typeof hold.then==='function') await hold;
          trace.push('release'+n);
        };
        presentEffectFlashEvent=async()=>{ trace.push('effect'+(strike||0)); return true; };
        presentSweepAttack=async()=>{ trace.push('sweep'+(strike||0)); return true; };
        const events=[
          {type:'turn_begin'},
          {type:'effect_flash',side:'p1',unitId:siren.id,trigger:'attack'},
          {type:'sweep_vfx',side:'p1',unitId:siren.id,targetIds:[enemy.id]},
          {type:'damage',side:'p2',unitId:enemy.id,sourceId:siren.id,effect:true,damageKind:'attack_effect',amount:1,hpAfter:39},
          {type:'attack',side:'p1',attackerId:siren.id,targetId:enemy.id},
          {type:'damage',side:'p2',unitId:enemy.id,sourceId:siren.id,effect:false,amount:0,hpAfter:39},
          {type:'effect_flash',side:'p1',unitId:siren.id,trigger:'attack'},
          {type:'sweep_vfx',side:'p1',unitId:siren.id,targetIds:[enemy.id]},
          {type:'damage',side:'p2',unitId:enemy.id,sourceId:siren.id,effect:true,damageKind:'attack_effect',amount:1,hpAfter:38},
          {type:'attack',side:'p1',attackerId:siren.id,targetId:enemy.id},
        ];
        const state={units:{p1:G.allies,p2:G.enemies},resources:{p1:{mana:0,gold:0},p2:{mana:0,gold:0}},rings:{p1:[],p2:[]},items:{p1:[],p2:[]}};
        await _flushCorePveHitEvents(state,events,new Set([siren,enemy]));
        return trace;
      }finally{
        playAttackMotion=originalMotion;
        presentEffectFlashEvent=originalFlash;
        presentSweepAttack=originalSweep;
      }
    `);
    assert.deepEqual(siren,[
      'start1','pause1','effect1','sweep1','release1',
      'start2','pause2','effect2','sweep2','release2',
    ],'二段攻撃を一撃ごとに「動き出す→効果→接触」で再生');
    console.log('OK サイレン＋二段攻撃を一撃ごとに分離');

    const revive=await browser.eval(`
      const originalReviveVfx=playReviveVfx;
      const unit={id:'multi-revive',name:'スケルトン',side:'p2',lane:'front',atk:2,hp:0,maxHp:2,
        color:'青',keywords:[],desc:'復活',_deathFxStarted:true,_deathFxReady:true,_deathFxDone:true};
      try{
        G.enemies=[unit]; G.allies=[];
        presentBeginPlayback();
        presentHoldShown(unit,2,0,2,0);
        let during=false,after=false;
        playReviveVfx=async()=>{
          const slot=document.querySelector('#f-enemy .slot[data-unit-id="multi-revive"]');
          during=!!slot&&slot.classList.contains('revive-hidden');
          delete unit._reviveHidden;
          renderField('f-enemy',G.enemies,true);
          after=!!document.querySelector('#f-enemy .slot[data-unit-id="multi-revive"]:not(.dead-empty)');
        };
        await presentReviveEvent({type:'revive',side:'p2',unitId:unit.id,atk:1,hp:1,maxHp:1,reason:'復活'}, {
          findUnit:()=>unit,
          applyStats:(u,e)=>presentAdvanceShown(u,{atk:e.atk,hp:e.hp,maxHp:e.maxHp}),
          render:()=>renderField('f-enemy',G.enemies,true),
        });
        return {during,after,ready:!!unit._deathFxReady,done:!!unit._deathFxDone};
      }finally{
        playReviveVfx=originalReviveVfx;
        presentEndPlayback();
      }
    `);
    assert.deepEqual(revive,{during:true,after:true,ready:false,done:false},
      '多段攻撃途中の復活でカード本体が再描画されていない');
    console.log('OK 多段攻撃途中の復活でVFX後にカードを再表示');

    const fixedEnemies=await browser.eval(`
      const savedMap=G._mapBattle, savedLane=G._enemyLaneFixed;
      try{
        const shape=list=>list.filter(Boolean).map(e=>[e.name,e.lane,e.atk,e.hp]);
        G._mapBattle={type:'battle',floor:1,mapIndex:1,turn:1,normalBattleNo:1};
        G._enemyLaneFixed=true;
        const afterNormal=shape(_generateFixedTestBattleEnemies(19));
        G._mapBattle={type:'boss',floor:5,mapIndex:5,turn:9,forcedBoss:true};
        G._enemyLaneFixed=false;
        const afterBoss=shape(_generateFixedTestBattleEnemies(19));
        return {afterNormal,afterBoss,mapType:G._mapBattle.type};
      }finally{ G._mapBattle=savedMap; G._enemyLaneFixed=savedLane; }
    `);
    assert.deepEqual(fixedEnemies.afterNormal,fixedEnemies.afterBoss,
      '直前の通常戦闘nodeによってデバッグ試験戦闘の敵編成が変化している');
    assert.equal(fixedEnemies.mapType,'boss','試験戦闘の固定生成が通常進行のnodeを破壊している');
    console.log('OK 通常戦闘後も試験戦闘の敵編成を固定');

    const kingCard=await browser.eval(`
      const base=PANEL_POOL.find(p=>p&&p.name==='スケルトンキング');
      const merged=clone(base);
      applyMergedPanelForm(merged);
      return {base:base&&base.desc,baseRevive:base&&base.keywords&&base.keywords.includes('復活'),
        merged:merged&&merged.desc,mergedRevive:merged&&merged.keywords&&merged.keywords.includes('復活')};
    `);
    assert.match(kingCard.base,/青スケルトン」を召喚し、このキャラクターの前に攻撃させる/);
    assert.match(kingCard.merged,/青スケルトン」を2体召喚し、このキャラクターの前に攻撃させる/);
    assert.equal(kingCard.baseRevive&&kingCard.mergedRevive,true,'スケルトンキングの復活が合体前後で欠けている');
    console.log('OK スケルトンキングの合体前後の説明・復活を更新');

    const forgeClass=await browser.eval(`
      const oldDelay=_mapDelay, oldVfx=_playMapBoardChangeVfx, oldRender=renderHandEditor;
      try{
        _mapDelay=async()=>{};
        _playMapBoardChangeVfx=async(_summon,_target,onMidpoint)=>{ if(onMidpoint) onMidpoint(); };
        renderHandEditor=()=>{};
        G.mapPanelPowers={};
        await _playMapForgeSlotRoll([1],1,{id:'eternal'});
        return document.body.classList.contains('map-forge-roll-hide-cards');
      }finally{
        _mapDelay=oldDelay; _playMapBoardChangeVfx=oldVfx; renderHandEditor=oldRender;
        G._mapForgeAnimating=false;
      }
    `);
    assert.equal(forgeClass,false,'魔導板変更後も結合アイコンを隠すbodyクラスが残っている');
    console.log('OK 永劫の巻物／鍛冶後に結合アイコン非表示クラスを解除');
  }finally{
    await browser.close();
  }
})().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
