'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const horizon=require('./planner_horizon'),planner=require('./planner'),lookahead=require('./lookahead'),sandbox=require('./bot_sandbox');
const choices=horizon.recordedChoices;
async function test(api,check,{rows,meta,file}){
  const beforeWeights={...planner.LIMITS};planner.configure('r2',meta.planner);
  try{await sandbox.isolated(async()=>{
    api.cycle=1;api.seed=1002;api.resetRun();initState();SaveRun.begin();G._wave=2;G._waveStage=1;G._waveLife=3;G.gold=50;
    G.mainBoard.fill(null);G.mainBoard[1]=makePanel('ゴーレム');G.mainBoard[3]=makePanel('シルフ');
    G.mainBoard[1].power=100;G.mainBoard[1].life=150;
    const items=_ensureItemSlots();items.fill(null);items[0]=makeItem('巨大化の巻物');
    G.pendingBattleItems=[{...makeItem('隕石の巻物'),itemEffectKey:'meteor_scroll',_itemUseInstanceId:'horizon-selftest'}];G.nextBattleItems=[];
    G.phase=null;goToReward();_rewCards=['活性化','内なる大力','策士'].map(name=>makePanel(name));
    for(const c of _rewCards){c.directions=['up','left','right'];c._isOriginalReward=true;}
    const context={policy:'planner',plannerStage:'r2',color:'赤'};planner.refresh(context,'horizon-fixture');
    const ref=G,before=structuredClone(G),offers=structuredClone(_rewCards),random=Math.random;
    let calls=0;Math.random=()=>{calls++;return .5;};
    try{
      horizon.reset();lookahead.resetStats();
      const next=sandbox.nextBattle(),wall=horizon.wallFrom(next);
      const a=await sandbox.enemySamples(wall.target,2,{partition:'planner-wall'}),b=await sandbox.enemySamples(wall.target,2,{partition:'planner-wall'});
      const near=await sandbox.enemySamples(wall.target,2);
      const choice=await lookahead.chooseCard(context);
      const nearChoice=await sandbox.isolated(async()=>{G._waveStage=3;return lookahead.chooseCard(context);});
      const known=await sandbox.isolated(async()=>{
        G._waveStage=3;G._waveIsRetry=true;G._waveRetryEnemyKey=`${wall.target.wave}:${wall.target.stage}:${wall.target.type}`;
        G._waveEnemySnapshot=a[0].enemies.map(e=>e?{...e,atk:1000000,hp:1000000000,maxHp:1000000000}:null);
        const samples=await sandbox.enemySamples(wall.target,2,{partition:'planner-wall'});
        return {samples,choice:await lookahead.chooseCard(context)};
      });
      check('山場：本体の旅程から次のエリートを選び、通常戦2回だけを将来の報酬機会にする',()=>{
        assert.equal(wall.target.type,'elite');assert.equal(wall.target.wave,2);assert.equal(wall.target.stage,3);
        assert.equal(wall.distance,2);assert.equal(wall.opportunities.length,2);assert.ok(wall.opportunities.every(n=>n.type==='reward'));
        assert.equal(horizon.wallFrom(wall.target).opportunities.length,0);
        const forecast=planner.forecast({stage:'r2'});assert.equal(forecast.rewards,15);assert.equal(forecast.exchanges,3);
        assert.equal(planner.futureNodes({stage:'r2'})[0].stage,2);
      });
      check('山場：独立seedの敵・将来提示・コア試行を実行し、G・提示・ラン乱数を汚染しない',()=>{
        assert.deepEqual(a,b);assert.notEqual(a[0].seed,near[0].seed);assert.notEqual(a[0].seed,a[1].seed);
        assert.ok(horizon.stats.trials>0);assert.ok(horizon.stats.projections>0);assert.ok(horizon.stats.futureCards>0);
        assert.equal(G,ref);assert.deepEqual(G,before);assert.deepEqual(_rewCards,offers);assert.equal(calls,0);
        assert.ok(choice.value.horizon);assert.equal(choice.value.horizon.scenarios.length,3);
        const scenarios=choice.value.horizon.scenarios;assert.equal(scenarios[0].acquired.length,0);
        assert.ok(Math.abs(scenarios.reduce((s,x)=>s+x.weight,0)-1)<1e-9);
        for(const s of scenarios){assert.ok(s.acquired.length<=2);assert.ok(s.win>=0&&s.win<=1);assert.equal(s.board.length,15);}
        assert.ok(choice.value.horizon.distanceWeight<1);
        assert.ok(choice.value.horizon.progress>=0&&choice.value.horizon.progress<=1);
      });
      check('山場：次戦だけの巻物を遠い壁へ持ち越さず、永久強化は将来取得前の本体に使う',()=>{
        for(const scenario of choice.value.horizon.scenarios){assert.deepEqual(scenario.queuedItems,[]);assert.equal(scenario.board.find(c=>c?.name==='ゴーレム').power,105);}
        assert.equal(nearChoice.value.horizon.distance,0);assert.ok(nearChoice.value.horizon.scenarios[0].queuedItems.includes('隕石の巻物'));
      });
      check('山場：再戦は既知の敵へ切り替え、敵が変わればサンプルとコアのキャッシュも更新する',()=>{
        assert.ok(known.samples.every(s=>s.retry));assert.equal(known.choice.value.horizon.enemySource,'known');
        assert.deepEqual(known.choice.value.horizon.enemySignatures.map(s=>s.hash),known.samples.map(s=>sandbox.hash(JSON.stringify(s.enemies))));
        assert.equal(known.choice.value.horizon.win,0,'変更前の弱い敵への勝率をキャッシュから再利用しない');
        assert.ok(known.choice.value.horizon.enemySignatures.every(s=>s.known));
      });
    }finally{Math.random=random;}
  });}finally{for(const key of Object.keys(planner.LIMITS))delete planner.LIMITS[key];Object.assign(planner.LIMITS,beforeWeights);}
  const runs=rows.filter(r=>r.policy==='planner'&&r.plannerStage==='r2'),changed=runs.flatMap(choices).filter(c=>c.changed);
  check('第2段の実周回：山場を実コアで試し、実行した報酬・交換・祝福・配置の選択を変える',()=>{
    assert.ok(runs.every(r=>r.horizon.stats.trials>0));assert.ok(changed.length>0);
    assert.ok(changed.some(c=>c.chosenWin>c.withoutWin),'先読みで山場の予測勝率を上げる実例がある');
    assert.ok(runs.some(r=>r.horizon.audits.some(a=>a.changed&&a.distance>0&&a.chosen.horizon.scenarios.some(s=>s.acquired.length))));
    for(const c of changed)assert.ok(c.value.horizon&&c.value.total>=0);
    const retryChoices=runs.flatMap(choices).filter(c=>c.type==='retry_rebuild'&&c.distance===0);
    assert.ok(retryChoices.length>0);assert.ok(retryChoices.every(c=>c.value.horizon.enemySource==='known'),'実際の山場再戦も保存済みの敵を使う');
  });
  check('学習と検証：保存済みの重みを固定し、検証seedを学習40種から分離する',()=>{
    const trained=JSON.parse(fs.readFileSync(path.join(__dirname,'planner_weights.json'),'utf8'));
    assert.equal(trained.status,'trained');assert.equal(trained.training.runs,40);
    const a=new Set(rows.filter(r=>r.policy==='lookahead').map(r=>r.seed)),b=new Set(runs.map(r=>r.seed));
    assert.ok(b.size>0);if(a.size)assert.deepEqual(a,b);
    for(const seed of b)assert.ok(seed<trained.training.seedStart||seed>trained.training.seedEnd);
    for(const relative of ['r2_initial/comparison.json','r2_before_retry_fix/comparison.json']){
      const usedFile=path.join(path.dirname(file),relative);
      if(fs.existsSync(usedFile)){const used=JSON.parse(fs.readFileSync(usedFile,'utf8')).seeds;for(const seed of b)assert.ok(seed<used[0]||seed>used[1],'診断に使った種を最終評価で再利用しない');}
    }
    assert.ok(runs.every(r=>JSON.stringify(r.plannerWeights)===JSON.stringify(meta.planner)));
  });
  const searchFile=path.join(path.dirname(file),'training/search_summary.json');
  if(!fs.existsSync(searchFile))console.log('SKIP 過去の重み探索履歴の再監査：training/がありません。保存済み重み・学習seedとの分離・実コアの山場予測は検査済み。');
  else check('保存された重み探索履歴：40種の最終候補から目的値最大を選び、採用係数が一致する',()=>{
    const trained=JSON.parse(fs.readFileSync(path.join(__dirname,'planner_weights.json'),'utf8'));
    const search=JSON.parse(fs.readFileSync(searchFile,'utf8'));
    assert.ok(search.history.filter(h=>h.runs===40).length>=2);assert.ok(search.history.length>8);
    const finalists=search.history.filter(h=>h.runs===40).sort((x,y)=>y.objective-x.objective||y.meanWave-x.meanWave||x.id.localeCompare(y.id));
    assert.equal(search.selected,finalists[0].id);
    assert.deepEqual(trained,JSON.parse(fs.readFileSync(path.join(path.dirname(file),'training/selected_weights.json'),'utf8')));
    for(const key of ['next','wall','wallHp','wallProgress','fit','option','focus','prior','distanceDecay'])assert.equal(trained.weights[key],finalists[0][key]);
  });
}
module.exports={test,choices};
