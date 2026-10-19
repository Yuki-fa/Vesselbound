#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {initialize,simulateRun}=require('./run_bot');
const lookahead=require('./lookahead');
const sandbox=require('./bot_sandbox');
const {readInput,analyze,comparison}=require('./run_report');
const {probeCard}=require('./bot_probe');
const overrides=require('./bot_override');
const {source}=require('./bot_runtime');
const boons=require('./bot_boons');
const planner=require('./planner');

function validateRuns(rows,api) {
  let battles=0,enemies=0,retries=0;
  const types=new Set();
  for(const row of rows) {
    api.cycle=row.storyCycle;initState();
    const itinerary=[1,2,3,4].flatMap(wave=>_waveRouteForWave(wave).map((type,index)=>({wave,stage:index+1,type})));
    let cursor=0,previous=null;
    for(const node of row.route) {
      const actual={wave:node.wave===0?1:node.wave,stage:node.stage,type:node.type};
      if(node.retry) {
        assert.deepEqual(actual,previous,`${row.policy}/${row.seed}: 再戦で別のマスへ進んだ`);retries++;
      } else {
        assert.deepEqual(actual,itinerary[cursor],`${row.policy}/${row.seed}: 本体の旅程と不一致 (${cursor})`);
        previous=actual;cursor++;
      }
      types.add(node.type);
    }
    if(row.clear) {
      assert.equal(cursor,itinerary.length,`${row.seed}: 途中でクリア扱い`);
      assert.equal(row.route.at(-1).type,'altar');
    }
    if(row.status==='gameover'&&row.gameOverReason!=='quest_card_loss')assert.equal(row.finalLife,0,`${row.seed}: ライフが残っているGO`);
    assert.equal(row.finalBoard.length,15);
    assert.ok(Number.isFinite(row.finalGold)&&row.finalGold>=0);
    assert.ok(row.finalLife>=0);
    const offerIds=new Set(row.offers.map(o=>o.id));
    assert.equal(offerIds.size,row.offers.length,'提示ID重複');
    const selected=new Set();
    for(const take of row.acquisitions) if(take.offerId) {
      assert.ok(offerIds.has(take.offerId),'取得元の提示がない');
      assert.ok(!selected.has(take.offerId),'同じ提示を二重取得');selected.add(take.offerId);
    }
    const priorEnemies=new Map();
    for(const b of row.battles) {
      battles++;
      G._wave=b.wave;G._waveStage=b.stage;G._waveBattleType=b.type;G.floor=b.floor;
      assert.equal(b.floor,_waveStageFloor(b.wave,b.stage,b.type),`${row.seed}: 階層不一致`);
      assert.equal(b.deepLevel,_waveDeepLevel(b.stage,b.wave,b.type),`${row.seed}: 深層不一致`);
      const counts=_sceneEnemyCount(b.type,{wave:b.wave,stage:b.stage});
      assert.ok(counts,`${row.seed}: 敵数設定がない`);
      assert.equal(b.enemies.length,counts[0],`${row.seed}: 敵数不一致`);
      assert.equal(b.enemies.filter(e=>e.lane==='rear').length,counts[1],`${row.seed}: 敵後衛数不一致`);
      for(const enemy of b.enemies) {
        const def=ENEMY_POOL.find(e=>enemy.code&&String(e.artCode||e.no||'')===enemy.code)||ENEMY_POOL.find(e=>e.name===enemy.name);
        assert.ok(def,`${enemy.name}: 本体の敵プールにない`);
        assert.ok(_enemySpawnAllowed(def),`${enemy.name}: 出現不可の敵`);
        const range=enemyStatRanges(def,b.floor);
        assert.ok(enemy.atk>=range.atkMin&&enemy.atk<=range.atkMax,`${enemy.name}: ATK${enemy.atk} は階層範囲外 ${JSON.stringify(range)}`);
        assert.ok(enemy.hp>=range.hpMin&&enemy.hp<=range.hpMax,`${enemy.name}: HP${enemy.hp} は階層範囲外`);
        assert.equal(enemy.grade,FLOOR_DATA[b.floor].grade,`${enemy.name}: 階層グレード不一致`);
        enemies++;
      }
      const k=`${b.wave}:${b.stage}`;
      if(b.retry)assert.deepEqual(b.enemies,priorEnemies.get(k),`${row.seed}: 再戦の敵が変わった`);
      else priorEnemies.set(k,b.enemies);
      assert.ok(['p1','p2','draw'].includes(b.outcome));
      assert.equal(b.lifeAfter,b.outcome==='p2'?Math.max(0,b.coreLifeAfter-1):b.coreLifeAfter,
        `${row.seed}: コアのライフ／敗北ペナルティの出口が不一致`);
      assert.equal(b.eventCounts.battle_start,1,'開戦の重複／欠落');
      assert.equal(b.eventCounts.battle_end,1,'終戦の重複／欠落');
      assert.ok(b.turns<=BATTLE_CORE_TURN_LIMIT);
    }
  }
  return {runs:rows.length,battles,enemies,retries,types:[...types]};
}

async function main(args=process.argv.slice(2)) {
  let input=path.join(__dirname,'out'),variants=[],out;
  for(let i=0;i<args.length;i++){
    const flag=args[i],value=args[++i];if(!value)throw new Error(`値が必要: ${flag}`);
    if(flag==='--input')input=value;else if(flag==='--variant')variants.push(value);else if(flag==='--out')out=value;else throw new Error(`不明な引数: ${flag}`);
  }
  let temporary=null;
  // 出力はgit管理外。新しいworktreeでも実周回を生成し、同じ監査・再現検査へ渡す。
  // 明示した--inputの欠落は誤指定として残し、既定のoutだけを補う。
  if(!args.includes('--input')&&!fs.existsSync(path.join(input,'runs.jsonl'))){
    temporary=fs.mkdtempSync(path.join(os.tmpdir(),'vb-run-selftest-'));
    console.log('既定のout/runs.jsonlが無いため、一時フォルダで6方針×4周を生成して検査します（バランス評価の標本には含めません）。');
    const child=spawnSync(process.execPath,[path.join(__dirname,'run_bot.js'),'--runs','4','--lookahead-runs','4','--policy','all','--seed','4001','--workers','4','--out',temporary],{encoding:'utf8'});
    if(child.status!==0){fs.rmSync(temporary,{recursive:true,force:true});throw Error(child.stderr||child.error||'検査用周回の生成に失敗');}
    input=temporary;
  }
  try{
  const api=await initialize();
  const baseline=readInput(path.resolve(input));
  if(!variants.length&&!(baseline.meta.botVersion>=2))variants=['override_numeric','override_add'].map(d=>path.join(path.dirname(baseline.file),d)).filter(f=>fs.existsSync(path.join(f,'runs.jsonl')));
  const datasets=[baseline,...variants.map(v=>readInput(path.resolve(v)))];
  const checks=[],knownIssues=[];
  const check=(title,fn)=>{const result=fn();checks.push(title);console.log(`OK ${title}`);return result;};
  for(const data of datasets)check(`${path.basename(path.dirname(data.file))}: 本体ソースのハッシュ一致`,()=>{
    for(const [file,hash] of Object.entries(data.meta.sourceHashes||{}))assert.equal(crypto.createHash('sha256').update(source(file)).digest('hex'),hash,file);
    for(const [file,hash] of Object.entries(data.meta.toolHashes||{}))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file))).digest('hex'),hash,file);
  });
  const validation=datasets.map(data=>check(`${path.basename(path.dirname(data.file))}: 全周回の旅程・階層・敵数・前後衛・能力値・再戦・資源`,()=>validateRuns(data.rows,api)));
  const all=datasets.flatMap(d=>d.rows);
  if(baseline.meta.trial)check('全周回で合体停止・交換店の道具売却なしを適用し、合体素材の収集・巻物使用を行わない',()=>{
    for(const data of datasets){
      assert.equal(data.meta.trial.panelMerge,false);assert.equal(data.meta.trial.exchangeItemSale,false);
      for(const row of data.rows){
        for(const card of [...row.finalBoard,...row.battles.flatMap(b=>b.board)].filter(Boolean))assert.ok(!card.triple&&!card.bond);
        assert.ok(!row.actions.some(a=>['sell','item_sale'].includes(a.type)||a.type==='item'&&a.name==='絆の巻物'));
        assert.ok(!row.offers.some(o=>o.card.name==='魔鏡'));
      }
    }
  });
  const presentPolicies=[...new Set(baseline.rows.map(r=>r.policy))];
  await require('./planner_selftest').test(api,check,baseline.rows);
  if(baseline.meta.botVersion>=6&&baseline.rows.some(r=>r.plannerStage==='r2'))await require('./planner_horizon_selftest').test(api,check,baseline);
  if(presentPolicies.includes('planner')){
    const limits={...planner.LIMITS};
    try{
      // 合体停止で旧seedの戦況は変わるため、互いに倒し切れない体を本体の開戦入口へ渡す。
      // 通常成績には混ぜず、コア上限→周回終了→資源記録の出口を回帰検査する。
      Object.assign(planner.LIMITS,{hp:24,damage:12,fit:4,option:2,focus:4,prior:1});
      const compute=SaveRun.computeBattle;
      let timeout;
      try{
        SaveRun.computeBattle=(initial,seed)=>{
          if(G._botProbe)return compute(initial,seed);
          // 初期エンチャントが増えたため、敵だけを硬くしても毒・ATK低下で決着してしまう。
          // 編成後の両軍を無効果の同数値へ置き換え、上限へ確実に達する入力を作る。
          const state=structuredClone(initial);
          state.units=Object.fromEntries(['p1','p2'].map(side=>[side,initial.units[side].map(u=>u?{
            id:u.id,name:'上限検査',side,lane:u.lane,atk:1,baseAtk:1,hp:1000000,maxHp:1000000,keywords:[],desc:''}:null)]));
          state.rings={p1:[],p2:[]};return compute(state,seed);
        };
        timeout=await simulateRun({seed:197,policy:'planner',plannerStage:'r1',plannerWeights:{...planner.LIMITS}});
      }finally{SaveRun.computeBattle=compute;}
      check('コア上限の制御例：timeoutでも最後の戦闘と資源推移を欠落させない',()=>{
        assert.equal(timeout.status,'timeout');assert.equal(timeout.battles.at(-1).endReason,'turn_limit');
        assert.equal(timeout.trajectory.filter(p=>p.event==='battle').length,timeout.battles.length);
        assert.equal(timeout.trajectory.at(-1).life,timeout.finalLife);assert.equal(timeout.trajectory.at(-1).gold,timeout.finalGold);
      });
    }finally{Object.assign(planner.LIMITS,limits);}
  }
  if(baseline.meta.runLevels){
    check('全周回：祝福購入なし、ATK/HPの固定4候補を受領するだけ、下降・再抽選なし',()=>{
      for(const data of datasets)for(const row of data.rows){
        assert.ok(!row.actions.some(a=>['boon_visit','boon_purchase','level_reroll'].includes(a.type)));
        assert.equal(row.towerBoons.purchases,0);assert.equal(row.towerBoons.visits,0);
        let values=coreNormalizeRunLevels();
        const levels=row.actions.filter(a=>a.type==='level_reward');
        for(const a of levels){
          const spec=RUN_LEVEL_CONFIG.rewards.find(c=>c.id===a.id);assert.ok(spec);
          assert.deepEqual(a.before,values);assert.deepEqual(a.gains,spec.gains);assert.equal(a.rerolled,false);
          assert.equal(a.history.length,1);assert.deepEqual(a.history[0].before,values);
          const after={atk:values.atk+spec.gains.atk,hp:values.hp+spec.gains.hp};
          assert.deepEqual(a.after,after);assert.deepEqual(a.history[0].after,after);values=after;
        }
        assert.deepEqual(row.runLevels.values,values);assert.equal(row.runLevels.seq,levels.length);
        assert.equal('counts' in row.runLevels,false);assert.equal('previous' in row.runLevels,false);
      }
    });
    check('通常報酬の再抽選：弱さの根拠、権利優先、100Gと温存、1報酬の有料上限',()=>{
      for(const row of all){
        const paid=new Map();
        for(const a of row.actions.filter(a=>a.type==='boon_reroll')){
          assert.ok(a.quality.weak&&a.reason);
          if(a.remainingBefore>0){assert.equal(a.remainingAfter,a.remainingBefore-1);assert.equal(a.goldBefore,a.goldAfter);}
          else{assert.equal(a.goldBefore-a.goldAfter,100);assert.ok(a.goldAfter>=a.reserve);
            const key=`${a.type}:${a.wave}:${a.stage}`;paid.set(key,(paid.get(key)||0)+1);assert.ok(paid.get(key)<=boons.LIMITS.maxPaidRerollsPerReward);}
        }
      }
    });
    check('店の再抽選：1来店1回、権利優先／100G、支払い後300G以上、行商人では使わない',()=>{
      for(const data of datasets)for(const row of data.rows){
        const seen=new Set();
        for(const a of row.actions.filter(a=>a.type==='shop_reroll')){
          const key=`${a.wave}:${a.stage}:${a.kind}`;assert.ok(!seen.has(key));seen.add(key);
          assert.ok(['shop','item','forge'].includes(a.kind));
          if(a.remainingBefore>0){assert.equal(a.remainingAfter,a.remainingBefore-1);assert.equal(a.goldAfter,a.goldBefore);}
          else{assert.equal(a.goldBefore-a.goldAfter,100);assert.ok(a.goldAfter>=a.reserve);}
        }
      }
    });
    const shopProbe=await require('./boon_shop_probe').probe();
    check('旧祝福6：購入せず旧保存を再現し、撃破ボスが魔導店の最終提示へ残る',()=>{assert.ok(shopProbe.generated>0);assert.equal(shopProbe.offered,shopProbe.generated);});
  }
  if(baseline.meta.botVersion>=2) {
    check('指定方針・要求したseed範囲と周回数が全件揃う（標本規模はメタデータへ記録）',()=>{
      const required=baseline.meta.botVersion>=5?(baseline.meta.options.policy==='all'?Object.keys(require('./policies').policies):baseline.meta.options.policy.split(',')):['greedy','color','enchant','mana','lookahead'];
      for(const policy of required){
        const rows=baseline.rows.filter(r=>r.policy===policy),count=baseline.meta.policyCounts[policy];
        assert.equal(rows.length,count,policy);
        assert.deepEqual(rows.map(r=>r.seed).sort((a,b)=>a-b),Array.from({length:count},(_,i)=>Number(baseline.meta.options.seed)+i));
      }
      assert.equal(baseline.rows.length,baseline.meta.completed);
    });
    check('全方針で再戦前の組み直しを検討し、実際の配置変更がある',()=>{
      for(const policy of presentPolicies) {
        const runs=baseline.rows.filter(r=>r.policy===policy);
        const actions=runs.flatMap(r=>r.actions).filter(a=>a.type==='retry_rebuild');
        assert.ok(actions.length>0,policy);assert.ok(actions.some(a=>a.changed),`${policy}: 全て同じ盤面`);
        for(const action of actions)assert.equal(action.changed,JSON.stringify(action.before)!==JSON.stringify(action.after));
      }
    });
    check('全方針でカード売却・購入がなく、ゴールド0の交換を行う',()=>{
      for(const policy of presentPolicies) {
        const runs=all.filter(r=>r.policy===policy),actions=runs.flatMap(r=>r.actions);
        assert.ok(!actions.some(a=>['sell','purchase','bundle_purchase'].includes(a.type)),policy);
        const exchanges=actions.filter(a=>a.type==='exchange');assert.ok(exchanges.length>0,policy);assert.ok(exchanges.every(a=>a.gold===0&&a.given&&a.index>=0&&a.index<3));
        for(const row of runs){
          assert.ok(!row.acquisitions.some(a=>a.source==='item'&&a.card.category!=='アイテム'));
          const takes=row.acquisitions.filter(a=>a.source==='peddler');
          assert.ok(takes.every(a=>a.card.category!=='アイテム'));
          const exchanges=row.actions.filter(a=>a.type==='exchange'&&a.source==='peddler');
          assert.deepEqual(takes.map(a=>[a.card.name,a.wave,a.stage]),exchanges.map(a=>[a.name,a.wave,a.stage]));
        }
      }
    });
    check('全塔で指輪交換を実行し、支払える枚数が足りない場合だけ取得を免除する',()=>{
      for(const row of baseline.rows)for(const altar of row.route.filter(n=>n.type==='altar')) {
        const decisions=row.actions.filter(a=>['ring_exchange','ring_shortage'].includes(a.type)&&a.wave===altar.wave&&a.stage===altar.stage);
        assert.equal(decisions.length,1,`${row.policy}/${row.seed}: 祭壇判断の欠落・重複`);
        const action=decisions[0];
        if(action.type==='ring_exchange') {
          assert.equal(action.sacrifice.length,3);assert.ok(row.acquisitions.some(a=>a.source==='ringExchange'&&a.wave===altar.wave&&a.card.name===action.name));
        } else assert.ok(action.capacity<action.cost);
      }
    });
    check('敗北でライフが残った時、行商人が毎回3枚の交換店として開く',()=>{
      for(const row of all) {
        const expected=row.battles.filter(b=>b.outcome==='p2'&&b.lifeAfter>0).length;
        const peddlers=row.actions.filter(a=>a.type==='peddler');
        assert.equal(peddlers.length,expected,`${row.policy}/${row.seed}`);
        for(const action of peddlers){
          assert.equal(action.stock.length,3);
          assert.ok(action.stock.every(card=>card&&['キャラクター','エンチャント'].includes(card.category)));
          const offers=row.offers.filter(o=>o.source==='peddler'&&o.wave===action.wave&&o.stage===action.stage);
          assert.ok(action.stock.every(card=>offers.some(o=>o.card.id===card.id)),'本体の行商人在庫を判断へ渡す');
        }
      }
      assert.ok(all.some(row=>row.actions.some(a=>a.type==='exchange'&&a.source==='peddler')),'実周回の行商人で交換がない');
    });
  }
  let healthFixture=null;
  if(!all.some(r=>r.clear)) {
    const add=overrides.pools().panel.filter(c=>c.initial&&c.category==='キャラクター').map(c=>({name:c.name,power:9999,life:9999}));
    healthFixture=await simulateRun({seed:34,policy:'greedy',override:{change:add,add:[]}});
    check('クリア出口の制御フィクスチャ（通常成績には混ぜない）',()=>assert.equal(healthFixture.clear,true));
  }
  check('ゲームオーバーとクリアの終了経路（通常成績とフィクスチャを区別）',()=>{
    assert.ok(all.some(r=>r.status==='gameover'),'ゲームオーバーがない');
    assert.ok(all.some(r=>r.clear)||healthFixture?.clear,'クリアの出口を確認できない');
    const types=new Set([...validation.flatMap(v=>v.types),...(healthFixture?.route||[]).map(r=>r.type)]);
    for(const type of ['city','battle','elite','boss','altar'])assert.ok(types.has(type),`${type} 未到達`);
  });
  const replayChecks=[];
  for(const data of datasets) {
    if(data.meta.lookahead)lookahead.configure({limits:data.meta.lookahead});
    const policies=[...new Set(data.rows.map(r=>r.policy))];
    for(const policy of policies) {
      const selected=data.rows.find(r=>r.policy===policy&&r.clear)||data.rows.find(r=>r.policy===policy);
      const options={seed:selected.seed,policy,storyCycle:selected.storyCycle,override:data.meta.override||{change:[],add:[]},towerBoon:selected.towerBoonMode||'off',
        plannerStage:selected.plannerStage||'r1',plannerWeights:selected.plannerWeights};
      const a=await simulateRun(options);
      // 間に別seed・別方針を挟み、同一プロセスの状態漏れも検査する。
      await simulateRun({seed:777,policy:policy==='greedy'?'mana':'greedy'});
      const b=await simulateRun(options);
      check(`${policy} seed=${selected.seed}: 同一seedの再実行・割込み後・保存JSONLが完全一致`,()=>{
        assert.deepEqual(a,b);assert.deepEqual(a,selected);
      });
      replayChecks.push({dataset:path.dirname(data.file),policy,seed:selected.seed});
    }
  }
  if(baseline.meta.runLevels){
    // 2026-10-19：レベル報酬は止めた（RUN_LEVEL_CONFIG.rewardEnabled=false）。止めている間は出ないことを確かめる。
    const levelRewardOn=!!RUN_LEVEL_CONFIG.rewardEnabled;
    if(!levelRewardOn) check('レベル報酬を止めている間は、どの周回にもレベル報酬が出ない',()=>{
      for(const data of datasets)for(const r of data.rows)assert.ok(!r.actions.some(a=>a.type==='level_reward'),r.seed+'/'+r.policy);
    });
    const candidate=levelRewardOn?baseline.rows.find(r=>r.actions.some(a=>a.type==='level_reward')):baseline.rows[0];
    assert.ok(candidate,'レベル報酬のあるseed');
    const off=await simulateRun({seed:candidate.seed,policy:candidate.policy,storyCycle:candidate.storyCycle,towerBoon:'off'}),again=await simulateRun({seed:candidate.seed,policy:candidate.policy,storyCycle:candidate.storyCycle,towerBoon:'off'});
    check('旧CLIのoffは再現可能、廃止した施設を復活させず、レベル報酬は設定どおり',()=>{
      assert.deepEqual(off,again);assert.equal(off.towerBoons.visits,0);assert.equal(off.towerBoons.purchases,0);
      assert.equal(off.actions.some(a=>a.type==='level_reward'),levelRewardOn);assert.ok(!off.actions.some(a=>['boon_visit','boon_purchase'].includes(a.type)));
    });
    await require('./debug_cards_1018c_regression').testDebugCards(api);
    await require('./shop_reroll_1018c_regression').testShopReroll(api,check);
    await require('./run_levels_1018c_regression').testRunLevels(api,check);RUN_LEVEL_CONFIG.rewardEnabled=levelRewardOn;
    await require('./bot_reroll_selftest').test(api,check);
  }
  check('異なるseedで結果が変わる',()=>assert.notDeepEqual(baseline.rows[0],baseline.rows.find(r=>r.seed!==baseline.rows[0].seed)));
  check('集計の提示・採用・保持率が有効な範囲',()=>{
    for(const data of datasets)for(const c of analyze(data.rows,data.meta).cards){
      assert.ok(c.selectedOffers<=c.offered);assert.ok(c.adoptedRuns<=data.rows.filter(r=>c.policy==='all'||r.policy===c.policy).length);
      assert.ok(c.adoptionRate>=0&&c.adoptionRate<=1);assert.ok(c.retentionRate===null||(c.retentionRate>=0&&c.retentionRate<=1));
    }
  });
  if(baseline.meta.botVersion>=2) {
    api.seed=917;api.cycle=1;api.resetRun();initState();SaveRun.begin();_giveInitialRandomBoardCards();
    G._wave=1;G._waveStage=4;G._waveLife=3;G.phase=null;goToReward();
    const original=G,before=structuredClone(G),offers=structuredClone(_rewCards),random=Math.random;
    let randomCalls=0;const guardedRandom=()=>{randomCalls++;return 0.5;};Math.random=guardedRandom;
    const cases=await sandbox.enemySamples(sandbox.nextBattle(),3);
    const again=await sandbox.enemySamples(sandbox.nextBattle(),3);
    await lookahead.chooseCard({color:G.mainBoard.find(c=>c?.category==='キャラクター')?.color||''});
    check('lookahead：独立3seed、同一敵サンプルの再現、G・提示・ラン乱数・Math.randomを汚染しない',()=>{
      assert.equal(G,original);assert.deepEqual(G,before);assert.deepEqual(_rewCards,offers);assert.equal(randomCalls,0);assert.equal(Math.random,guardedRandom);
      assert.deepEqual(cases,again);assert.equal(new Set(cases.map(c=>c.seed)).size,3);
    });Math.random=random;
    await require('./shop_exchange_selftest').testShopExchange(api,check);
    await require('./peddler_exchange_selftest').testPeddlerExchange(api,check);
    await require('./tower_boon_visit_selftest').testTowerBoonVisit(api,check);
    await require('./formation_eye_preview_selftest').testFormationEyePreview(api,check);
    await require('./pve_trial_selftest').testPveTrial(api,check);
    api.cycle=2;api.resetRun();initState();SaveRun.begin();G._wave=1;G._waveStage=5;G._waveLife=3;G.mainBoard[1]=makePanel('ゴーレム');
    const entry=questDebugForceWaveQuest(1,'Q003');
    await openTavern();await api.drain();takeRewCard(0,3);_qAcceptTavernQuest();await api.drain();
    check('Q003：本体の提示・配置・受託で依頼カードを受け取る',()=>{assert.equal(entry.status,'accepted');assert.ok(_qHasRequiredOnBoard(entry));});
    G._isWaveAltar=true;G._waveStage=_waveRouteForWave(1).indexOf('altar')+1;
    const arrivalGold=G.gold,expectedGold=_qQuestData(entry.towerVariant).rewardGold;
    await api.arrival.tower();await api.drain();
    check('Q003：本体の塔到着コールバックで報酬を得て依頼カードを回収、二重払いなし',()=>{
      assert.equal(entry.status,'completed');assert.equal(G.gold,arrivalGold+goldIncomeAmount(expectedGold));assert.equal(_qHasRequiredOnBoard(entry),false);
    });
    const paid=G.gold;await api.arrival.tower();await api.drain();assert.equal(G.gold,paid);
    api.cycle=1;api.resetRun();initState();SaveRun.begin();G._wave=0;G._waveStage=1;
    const initial=JSON.stringify(G.mainBoard),money=G.gold;
    await _runFirstStoryFacilityEvent({key:'home'});await api.drain();
    check('初回ストーリーの会話処理に存在しないカード・報酬を足さない',()=>{assert.equal(JSON.stringify(G.mainBoard),initial);assert.equal(G.gold,money);});
  }
  check('到達済み地点の資源推移にライフ・ゴールドがある',()=>{
    for(const r of all) {
      assert.equal(r.trajectory.filter(p=>p.event==='battle').length,r.battles.length,`${r.policy}/${r.seed}: 打切りを含む戦闘の資源記録`);
      for(const point of r.trajectory)assert.ok(Number.isFinite(point.life)&&Number.isFinite(point.gold)&&point.gold>=0);
    }
  });
  for(const data of datasets.slice(1))check(`${path.basename(path.dirname(data.file))}: 100周と戦闘上の差`,()=>{
    assert.ok(data.rows.length>=100);const diff=comparison(baseline.rows,data.rows);
    assert.equal(diff.pairs,data.rows.length);assert.ok(diff.changedBattles>0,'本文やカード名だけの差では不足');
  });
  check('仮エンチャント：本体パーサーとコアが既存構文に反応',()=>{
    const snapshot=overrides.snapshot();
    try {
      const note=overrides.applyOverride({change:[],add:[{category:'エンチャント',name:'検査・能力強化',desc:'常時：このキャラクターは+9/+9を得る。'}]},api.parsers)[0];
      assert.equal(probeCard(note.after).interpreted,true);
      const unit={name:'検査本体',keywords:[],_adjacentPanelEffectNames:[note.name],_adjacentPanelEffectTexts:[note.after.desc]};
      assert.ok(!coreUnitKeywords(unit).includes(note.name),'仮カード名がキーワードへ混入');
      const invalid=overrides.applyOverride({change:[],add:[{category:'エンチャント',name:'検査・未知構文',desc:'攻撃：…'}]},api.parsers)[0];
      assert.equal(probeCard(invalid.after).interpreted,false,'未知の文を解釈済みにした');
    } finally {overrides.restore(snapshot);}
  });
  check('本体プールへoverrideが残らない',()=>{
    assert.ok(!PANEL_POOL.some(c=>/^検査・|^仮・共鳴/.test(c.name)));
  });
  const result={passed:true,checks,knownIssues,validation,replays:replayChecks,healthFixture:healthFixture?{policy:healthFixture.policy,seed:healthFixture.seed,clear:healthFixture.clear,controlledOverride:true}:null,
    outcomes:datasets.map(data=>({dataset:path.basename(path.dirname(data.file)),runs:data.rows.length,
      clear:data.rows.filter(r=>r.clear).length,gameover:data.rows.filter(r=>r.status==='gameover').length,
      stalled:data.rows.filter(r=>r.status==='stalled').length,timeout:data.rows.filter(r=>r.status==='timeout').length}))};
  const target=path.resolve(out||path.join(path.dirname(baseline.file),'SELFTEST.json'));
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
  console.log(`合格 ${checks.length}項目 → ${target}`);
  return result;
  }finally{if(temporary){fs.rmSync(temporary,{recursive:true,force:true});console.log('検査用の一時周回を削除しました。');}}
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={main,validateRuns};
