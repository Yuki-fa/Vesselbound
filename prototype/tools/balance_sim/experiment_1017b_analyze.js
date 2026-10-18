#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {csv,analyze}=require('./run_report'),{ARCHETYPES}=require('./synergy');
const OUT=process.argv[1]&&path.resolve(process.argv[1])===__filename&&process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'out_1017b');
const mean=(xs,f=x=>x)=>xs.length?xs.reduce((s,x)=>s+f(x),0)/xs.length:null;
function group(xs,f){const m=new Map();for(const x of xs){const k=f(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x);}return m;}
const load=file=>fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
function wilson(k,n){if(!n)return [null,null];const z=1.95996398454,p=k/n,d=1+z*z/n,m=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,m-h),Math.min(1,m+h)];}
function ciMean(values){const m=mean(values);if(values.length<2)return [null,null];const se=Math.sqrt(values.reduce((s,x)=>s+(x-m)**2,0)/(values.length-1)/values.length);return [m-1.96*se,m+1.96*se];}
function exactPairedP(up,down){const n=up+down;if(!n)return 1;let p=2**(-n),sum=p;for(let k=1;k<=Math.min(up,down);k++){p*= (n-k+1)/k;sum+=p;}return Math.min(1,2*sum);}
function pairedWaveP(deltas){let distribution=new Map([[0,1]]);for(const d of deltas.filter(Boolean)){const next=new Map();for(const [sum,p] of distribution)for(const sign of [-1,1]){const k=sum+sign*Math.abs(d);next.set(k,(next.get(k)||0)+p/2);}distribution=next;}
  const observed=Math.abs(deltas.reduce((s,d)=>s+d,0));return Math.min(1,[...distribution].reduce((s,[v,p])=>s+(Math.abs(v)>=observed?p:0),0));}
function first(run,wave,stage){return run.battles.find(b=>b.wave===wave&&b.stage===stage&&!b.retry);}
function wall(rows,wave){const bs=rows.map(r=>first(r,wave,3)).filter(Boolean),wins=bs.filter(b=>b.outcome==='p1').length;return {n:bs.length,wins,rate:bs.length?wins/bs.length:null};}
function summarize(rows){const clear=rows.filter(r=>r.clear).length,[clearLow,clearHigh]=wilson(clear,rows.length),a=wall(rows,2),b=wall(rows,3);
  return {n:rows.length,clear,clearRate:clear/rows.length,clearLow,clearHigh,meanWave:mean(rows,r=>r.reachedWave),meanProgress:mean(rows,r=>r.progress),
    elite2N:a.n,elite2Wins:a.wins,elite2WinRate:a.rate,elite3N:b.n,elite3Wins:b.wins,elite3WinRate:b.rate,
    finalGold:mean(rows,r=>r.finalGold),rings:mean(rows,r=>r.acquisitions.filter(a=>a.source==='ringExchange').length),
    boonPurchases:rows.reduce((s,r)=>s+r.actions.filter(a=>a.type==='boon_purchase').length,0),
    boonRuns:rows.filter(r=>r.actions.some(a=>a.type==='boon_purchase')).length,
    timeout:rows.filter(r=>r.status==='timeout').length,stalled:rows.filter(r=>r.status==='stalled').length};
}
function curves(rows){const observations=rows.flatMap(r=>r.battles.filter(b=>!b.retry).map(b=>{
  const own=b.board.filter(c=>c?.category==='キャラクター');return {policy:r.policy,wave:b.wave,stage:b.stage,type:b.type,win:+(b.outcome==='p1'),
    enemyTotal:b.enemies.reduce((s,c)=>s+c.atk+c.hp,0),enemyAtk:b.enemies.reduce((s,c)=>s+c.atk,0),enemyHp:b.enemies.reduce((s,c)=>s+c.hp,0),ownCount:own.length,
    ownTotal:own.reduce((s,c)=>s+c.power+c.life,0),ownAtk:own.reduce((s,c)=>s+c.power,0),ownHp:own.reduce((s,c)=>s+c.life,0)};}));
  return [...group(observations,b=>`${b.policy}:${b.wave}:${b.stage}`)].map(([,xs])=>{const b=xs[0],n=rows.filter(r=>r.policy===b.policy).length,wins=xs.reduce((s,b)=>s+b.win,0),[ciLow,ciHigh]=wilson(wins,xs.length);
    return {policy:b.policy,wave:b.wave,stage:b.stage,type:b.type,n:xs.length,reached:xs.length/n,wins,winRate:wins/xs.length,ciLow,ciHigh,...Object.fromEntries(['enemyTotal','enemyAtk','enemyHp','ownCount','ownTotal','ownAtk','ownHp'].map(k=>[k,mean(xs,b=>b[k])]))};
  }).sort((a,b)=>a.policy.localeCompare(b.policy)||a.wave-b.wave||a.stage-b.stage);
}
function stageCards(rows){const result=[];for(const [policy,runs] of group(rows,r=>r.policy))for(const point of ['stageEnds','bossEnds'])for(const wave of [1,2,3,4]){
  const pairs=runs.map(r=>({r,b:r.experiment[point][wave]})).filter(x=>x.b),xs=pairs.map(x=>x.b),vals=xs.map(b=>b.cards).sort((a,b)=>a-b),target=2+2*wave;
  result.push({policy,wave,point,n:xs.length,reached:xs.length/runs.length,target,meanCards:mean(xs,b=>b.cards),medianCards:vals.length?vals[Math.floor(vals.length/2)]:null,
    minCards:vals.length?vals[0]:null,maxCards:vals.length?vals.at(-1):null,shortfall:xs.length?mean(xs,b=>b.cards)-target:null,
    meanCharacters:mean(xs,b=>b.characters),meanEnchants:mean(xs,b=>b.enchants),meanOwnTotal:mean(xs,b=>b.ownTotal),meanGold:mean(xs,b=>b.gold),meanRings:mean(xs,b=>b.rings),
    meanInitialCards:mean(pairs,({r})=>wave===1?r.initialBoard.filter(Boolean).length:r.experiment.stageEnds[wave-1]?.cards||0),
    meanRewardCards:mean(pairs,({r})=>r.acquisitions.filter(a=>a.wave===wave&&a.source==='reward'&&['キャラクター','エンチャント'].includes(a.card.category)).length),
    meanRewardItems:mean(pairs,({r})=>r.acquisitions.filter(a=>a.wave===wave&&a.source==='reward'&&a.card.category==='アイテム').length),
    meanQuestCards:mean(pairs,({r})=>r.acquisitions.filter(a=>a.wave===wave&&a.source==='quest'&&['キャラクター','エンチャント'].includes(a.card.category)).length)});
  }return result;}
function types(rows){return [...group(rows,r=>r.policy)].flatMap(([policy,runs])=>[
  ...ARCHETYPES.map(a=>({policy,id:a.id,name:a.name,runs:runs.filter(r=>r.synergy.completed.includes(a.id)).length,share:mean(runs,r=>+r.synergy.completed.includes(a.id)),clearRuns:runs.filter(r=>r.clear&&r.synergy.completed.includes(a.id)).length})),
  {policy,id:'none',name:'未完成',runs:runs.filter(r=>!r.synergy.completed.length).length,share:mean(runs,r=>+!r.synergy.completed.length),clearRuns:runs.filter(r=>r.clear&&!r.synergy.completed.length).length}]);}
function activations(rows){const records=rows.flatMap(r=>r.experiment.battles.flatMap(b=>b.units.filter(u=>u.manaRepeat||u.seal>0).map(u=>({policy:r.policy,...u}))));
  return [...group(records,u=>u.policy+':'+u.name)].map(([,us])=>({policy:us[0].policy,name:us[0].name,unitBattles:us.length,manaEligible:us.filter(u=>u.manaRepeat).length,
    manaTriggered:us.filter(u=>u.manaRepeat&&u.thresholds>0).length,manaRate:mean(us.filter(u=>u.manaRepeat),u=>+(u.thresholds>0)),
    sealEligible:us.filter(u=>u.seal>0).length,released:us.filter(u=>u.seal>0&&u.released).length,releaseRate:mean(us.filter(u=>u.seal>0),u=>+u.released)}));
}
function pair(base,variant){const map=new Map(base.map(r=>[r.seed,r])),pairs=variant.map(r=>({a:map.get(r.seed),b:r})).filter(p=>p.a);
  const up=pairs.filter(p=>!p.a.clear&&p.b.clear).length,down=pairs.filter(p=>p.a.clear&&!p.b.clear).length,deltas=pairs.map(p=>p.b.reachedWave-p.a.reachedWave),ci=ciMean(deltas);
  return {pairs:pairs.length,base:summarize(pairs.map(p=>p.a)),variant:summarize(pairs.map(p=>p.b)),meanWaveDelta:mean(deltas),waveDeltaLow:ci[0],waveDeltaHigh:ci[1],wavePairedP:pairedWaveP(deltas),waveChanged:deltas.filter(Boolean).length,clearUp:up,clearDown:down,clearPairedP:exactPairedP(up,down),
    changedProgress:pairs.filter(p=>p.a.progress!==p.b.progress).length,
    walls:[2,3].map(w=>{const common=pairs.filter(p=>first(p.a,w,3)&&first(p.b,w,3)),ds=common.map(p=>+(first(p.b,w,3).outcome==='p1')-+(first(p.a,w,3).outcome==='p1'));
      return {wave:w,commonN:common.length,pairedWinDelta:mean(ds),ciLow:ciMean(ds)[0],ciHigh:ciMean(ds)[1]};})};}
function fixedSummary(){const rootBase=path.join(OUT,'fixed_baseline/comparisons.jsonl');if(!fs.existsSync(rootBase))return [];
  const base=load(rootBase),baseCards=require('./fixed_report').analyze(base).cards,all=[];
  for(const dir of fs.readdirSync(OUT).filter(d=>/^fixed_.*_effects$/.test(d))){const file=path.join(OUT,dir,'comparisons.jsonl');if(!fs.existsSync(file))continue;
    const rows=load(file),key=r=>`${r.scene}:${r.cardKey}:${r.board}`,roster=new Map(base.map(r=>[key(r),r]));
    for(const row of rows)roster.set(key(row),row);
    const wanted=new Set(rows.map(r=>`${r.scene}:${r.cardKey}`)),cards=require('./fixed_report').analyze([...roster.values()]).cards.filter(c=>wanted.has(`${c.scene}:${c.cardKey}`));
    // 変更対象だけを測ったB/D/Fも、変更後の同条件全カードを相手に偏差を出す。
    csv(path.join(OUT,dir,'cards.csv'),cards);
    for(const card of cards){const old=baseCards.find(c=>c.cardKey===card.cardKey&&c.scene===card.scene),details=rows.filter(r=>r.cardKey===card.cardKey&&r.scene===card.scene),tot=key=>details.reduce((s,r)=>s+(r.activation[key]||0),0);
      const peers=baseCards.filter(p=>p.cardKey!==card.cardKey&&p.scene===card.scene&&p.category===card.category&&p.form===card.form&&p.grade===card.grade&&p.rarity===card.rarity&&p.price===card.price&&!p.temporary);
      all.push({variant:dir.replace(/^fixed_/,'').replace(/_effects$/,''),scene:card.scene,name:card.name,form:card.form,category:card.category,
        gainWinPt:card.meanGainWinPt,baseGainWinPt:old?.meanGainWinPt??null,gainChangePt:old?card.meanGainWinPt-old.meanGainWinPt:null,
        ciLowPt:card.ciLowPt,ciHighPt:card.ciHighPt,peerN:card.peerCount,peerDeviation:card.peerDeviationPt,oldPeerDeviation:old?.peerDeviationPt??null,
        // B/Dは候補だけ変更。他カードの偏差基準は全数を測った今回の基準を使う。
        baselinePeerN:peers.length,baselinePeerDeviation:peers.length?card.meanGainWinPt-mean(peers,p=>p.meanGainWinPt):null,
        manaEligible:tot('manaEligible'),manaTriggered:tot('manaTriggered'),manaRate:tot('manaEligible')?tot('manaTriggered')/tot('manaEligible'):null,
        sealEligible:tot('sealEligible'),released:tot('released'),releaseRate:tot('sealEligible')?tot('released')/tot('sealEligible'):null});
    }
  }csv(path.join(OUT,'fixed_effect_comparison.csv'),all);return all;
}
function main(){const ids=fs.readdirSync(OUT).filter(d=>fs.existsSync(path.join(OUT,d,'runs.jsonl'))),datasets={},summaries=[],typeRows=[],pairs=[],curveRows=[];
  for(const id of ids){const dir=path.join(OUT,id),rows=load(path.join(dir,'runs.jsonl')),meta=JSON.parse(fs.readFileSync(path.join(dir,'meta.json')));datasets[id]=rows;
    const stats=[...group(rows,r=>r.policy)].map(([policy,rs])=>({variant:id,policy,...summarize(rs)}));csv(path.join(dir,'policies.csv'),stats);summaries.push(...stats);
    csv(path.join(dir,'final_runs.csv'),rows.map(r=>({policy:r.policy,seed:r.seed,status:r.status,clear:r.clear,wave:r.reachedWave,stage:r.reachedStage,gold:r.finalGold,life:r.finalLife,mana:r.finalMana,
      boardCards:r.finalBoard.filter(Boolean).length,characters:r.finalBoard.filter(c=>c?.category==='キャラクター').length,rings:r.rings.length,ringNames:r.rings.map(c=>c.name).join('/'),
      boons:r.actions.filter(a=>a.type==='boon_purchase').length,completed:r.synergy.completed.join('/')})));
    const visits=rows.flatMap(r=>[...new Map(r.route.filter(n=>!n.retry).map(n=>{const wave=n.wave||1;return [`${wave}:${n.stage}`,{policy:r.policy,wave,stage:n.stage,type:n.type}];})).values()]);
    csv(path.join(dir,'route_reach.csv'),[...group(visits,n=>`${n.policy}:${n.wave}:${n.stage}`)].map(([,ns])=>({...ns[0],n:ns.length,reached:ns.length/rows.filter(r=>r.policy===ns[0].policy).length})));
    const curve=curves(rows);csv(path.join(dir,'difficulty_curve.csv'),curve);curveRows.push(...curve.map(c=>({variant:id,...c})));
    csv(path.join(dir,'stage_end_cards.csv'),stageCards(rows));const ts=types(rows);csv(path.join(dir,'completed_types.csv'),ts);typeRows.push(...ts.map(t=>({variant:id,...t})));
    csv(path.join(dir,'type_combinations.csv'),[...group(rows,r=>r.policy+':'+(r.synergy.completed.slice().sort().join('+')||'none'))].map(([key,xs])=>({policy:xs[0].policy,type:key.slice(key.indexOf(':')+1),runs:xs.length,share:xs.length/rows.filter(r=>r.policy===xs[0].policy).length})));
    csv(path.join(dir,'mana_release.csv'),activations(rows));
    const events=rows.flatMap(r=>r.actions.filter(a=>a.type==='boon_purchase').map(a=>({policy:r.policy,seed:r.seed,clear:r.clear,wave:r.reachedWave,...a})));
    csv(path.join(dir,'boons.csv'),[...group(events,e=>e.policy+':'+e.id)].map(([,es])=>({policy:es[0].policy,id:es[0].id,purchases:es.length,runs:new Set(es.map(e=>e.seed)).size,paid:es.reduce((s,e)=>s+e.price,0),meanReached:mean(es,e=>e.wave),clearPurchaseEvents:es.filter(e=>e.clear).length})));
    const rings=rows.flatMap(r=>r.acquisitions.filter(a=>a.source==='ringExchange').map(a=>({policy:r.policy,seed:r.seed,wave:a.wave,name:a.card.name,held:r.rings.some(c=>c.name===a.card.name)})));
    csv(path.join(dir,'rings.csv'),[...group(rings,r=>r.policy+':'+r.name)].map(([,rs])=>({policy:rs[0].policy,name:rs[0].name,acquisitions:rs.length,runs:new Set(rs.map(r=>r.seed)).size,heldAtEnd:rs.filter(r=>r.held).length})));
    // 既存集計器と同じ採用定義。仮カードもメタのカタログへ登録する。
    const catalog=meta.catalog.map(c=>({...c,...meta.override.change.find(p=>p.name===c.name)}));for(const add of meta.override.add)if(!catalog.some(c=>c.name===add.name))catalog.push({...add,id:'temporary:'+add.name,rewardEligible:true,shopEligible:true});
    const data=analyze(rows,{...meta,catalog});csv(path.join(dir,'cards.csv'),data.cards);
  }
  const baseline=datasets.baseline.filter(r=>r.policy==='planner');
  for(const [id,rows] of Object.entries(datasets).filter(([id])=>id!=='baseline')){const p=pair(baseline,rows);pairs.push({variantId:id,...p});
    const by=new Map(baseline.map(r=>[r.seed,r]));csv(path.join(OUT,id,'paired_seeds.csv'),rows.map(r=>({seed:r.seed,beforeWave:by.get(r.seed).reachedWave,afterWave:r.reachedWave,beforeClear:by.get(r.seed).clear,afterClear:r.clear,deltaWave:r.reachedWave-by.get(r.seed).reachedWave})));
  }
  csv(path.join(OUT,'policy_summaries.csv'),summaries);csv(path.join(OUT,'type_comparison.csv'),typeRows);csv(path.join(OUT,'difficulty_curves.csv'),curveRows);
  const history=[],historicalCurves=[];
  for(const [id,folder] of [['published_old_no_boon','out_no_boon'],['old_with_boon','out_before_shop_exchange']]){
    const old=load(path.join(__dirname,folder,'runs.jsonl')).filter(r=>r.policy==='lookahead');history.push({condition:id,firstSeed:old[0].seed,lastSeed:old.at(-1).seed,...summarize(old)});
    for(const c of curves(old)){const next=curveRows.find(n=>n.variant==='baseline'&&n.policy==='lookahead'&&n.wave===c.wave&&n.stage===c.stage);
      historicalCurves.push({condition:id,wave:c.wave,stage:c.stage,type:c.type,oldN:c.n,newN:next?.n||0,oldReached:c.reached,newReached:next?.reached,
        oldWinRate:c.winRate,newWinRate:next?.winRate,oldEnemyTotal:c.enemyTotal,newEnemyTotal:next?.enemyTotal,oldOwnCount:c.ownCount,newOwnCount:next?.ownCount,oldOwnTotal:c.ownTotal,newOwnTotal:next?.ownTotal});
    }
  }
  csv(path.join(OUT,'historical_policies.csv'),history);csv(path.join(OUT,'historical_curve_comparison.csv'),historicalCurves);
  csv(path.join(OUT,'paired_comparison.csv'),pairs.map(p=>({variant:p.variantId,pairs:p.pairs,baselineWave:p.base.meanWave,wave:p.variant.meanWave,deltaWave:p.meanWaveDelta,deltaLow:p.waveDeltaLow,deltaHigh:p.waveDeltaHigh,waveChanged:p.waveChanged,wavePairedP:p.wavePairedP,
    baselineClear:p.base.clear,clear:p.variant.clear,clearRate:p.variant.clearRate,clearLow:p.variant.clearLow,clearHigh:p.variant.clearHigh,clearUp:p.clearUp,clearDown:p.clearDown,clearPairedP:p.clearPairedP,
    elite2N:p.variant.elite2N,elite2Wins:p.variant.elite2Wins,elite2Rate:p.variant.elite2WinRate,elite3N:p.variant.elite3N,elite3Wins:p.variant.elite3Wins,elite3Rate:p.variant.elite3WinRate,
    elite2CommonN:p.walls[0].commonN,elite2CommonDelta:p.walls[0].pairedWinDelta,elite3CommonN:p.walls[1].commonN,elite3CommonDelta:p.walls[1].pairedWinDelta,boonPurchases:p.variant.boonPurchases,boonRuns:p.variant.boonRuns,finalGold:p.variant.finalGold})));
  const increments=[];
  for(const [combined,parts] of [['g1_elite_opening',['a_elite','c_opening']],['g2_elite_carry',['a_elite','c_carry']],['g3_elite_boon',['a_elite','e_boon','g1_elite_opening','g2_elite_carry']]])if(datasets[combined])for(const reference of parts)if(datasets[reference]){
    const p=pair(datasets[reference],datasets[combined]);increments.push({combined,reference,n:p.pairs,deltaWave:p.meanWaveDelta,deltaLow:p.waveDeltaLow,deltaHigh:p.waveDeltaHigh,wavePairedP:p.wavePairedP,
      beforeClear:p.base.clear,afterClear:p.variant.clear,clearUp:p.clearUp,clearDown:p.clearDown,clearPairedP:p.clearPairedP});
  }
  csv(path.join(OUT,'combination_incremental.csv'),increments);
  const fixed=fixedSummary();fs.writeFileSync(path.join(OUT,'analysis.json'),JSON.stringify({summaries,pairs,types:typeRows,curves:curveRows,fixed},null,2)+'\n');
  console.log('集計 '+summaries.length+'条件、固定 '+fixed.length+'行');
}
if(require.main===module)main();module.exports={load,mean,group,wilson,ciMean,summarize,curves,stageCards,types,pair,fixedSummary};
