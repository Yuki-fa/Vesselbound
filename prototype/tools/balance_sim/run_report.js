#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const MIN_SAMPLE=20;
const avg=(rows,fn)=>rows.length?rows.reduce((s,r)=>s+Number(fn(r)||0),0)/rows.length:0;
const rate=rows=>avg(rows,r=>r.clear);
const pct=n=>(n*100).toFixed(1)+'%';
const num=n=>Number(n||0).toFixed(2);
const key=c=>`${c.category}\0${c.name}`;
const clean=s=>String(s??'').replaceAll('|','／').replaceAll('\n',' ');
const group=(rows,fn)=>{
  const map=new Map();for(const row of rows){const k=fn(row);if(!map.has(k))map.set(k,[]);map.get(k).push(row);}return map;
};
function csv(file,rows,columns) {
  const quote=value=>{const s=String(value??'');return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
  const headers=columns||Object.keys(rows[0]||{});
  fs.writeFileSync(file,'\uFEFF'+[headers.join(','),...rows.map(r=>headers.map(h=>quote(r[h])).join(','))].join('\n')+'\n');
}
function table(headers,rows) {return `|${headers.join('|')}|\n|${headers.map(()=> '---').join('|')}|\n`+rows.map(r=>'|'+r.map(clean).join('|')+'|').join('\n')+'\n\n';}

function readInput(input) {
  const file=fs.statSync(input).isDirectory()?path.join(input,'runs.jsonl'):input;
  const lines=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(line=>line.trim());
  const rows=lines.map((line,index)=>{
    let row;try{row=JSON.parse(line);}catch(e){throw new Error(`${file}:${index+1} JSONエラー: ${e.message}`);}
    if(row.schemaVersion!==1||!Array.isArray(row.offers)||!Array.isArray(row.battles)||!Array.isArray(row.acquisitions)||!Array.isArray(row.route)||!Array.isArray(row.trajectory)) throw new Error(`${file}:${index+1} 周回形式が不正`);
    if(!['clear','gameover','timeout','stalled'].includes(row.status)||row.clear!==(row.status==='clear')) throw new Error(`${file}:${index+1} 終了状態が不正`);
    return row;
  });
  if(!rows.length) throw new Error('周回データが空');
  const ids=new Set();for(const r of rows){const id=`${r.policy}:${r.seed}:${r.storyCycle}`;if(ids.has(id))throw new Error(`重複する試行: ${id}`);ids.add(id);}
  const metaFile=path.join(path.dirname(file),'meta.json');
  const meta=fs.existsSync(metaFile)?JSON.parse(fs.readFileSync(metaFile,'utf8')):{};
  return {rows,meta,file};
}

function analyze(rows,meta={}) {
  const policyGroups=group(rows,r=>r.policy);
  const summaries=[...policyGroups].map(([policy,runs])=>({policy,runs:runs.length,clear:runs.filter(r=>r.clear).length,
    clearRate:rate(runs),meanWave:avg(runs,r=>r.reachedWave),meanProgress:avg(runs,r=>r.progress),
    meanBattles:avg(runs,r=>r.battles.length),meanFinalLife:avg(runs,r=>r.finalLife),meanFinalGold:avg(runs,r=>r.finalGold),
    gameover:runs.filter(r=>r.status==='gameover').length,timeout:runs.filter(r=>r.status==='timeout').length,stalled:runs.filter(r=>r.status==='stalled').length,
    msPerRun:(meta.policyElapsedMs?.[policy]||0)/runs.length,
    retryRebuilds:runs.reduce((s,r)=>s+r.actions.filter(a=>a.type==='retry_rebuild').length,0),
    changedRebuilds:runs.reduce((s,r)=>s+r.actions.filter(a=>a.type==='retry_rebuild'&&a.changed).length,0),
    sales:runs.reduce((s,r)=>s+r.actions.filter(a=>a.type==='sell').length,0),
    peddlers:runs.reduce((s,r)=>s+r.actions.filter(a=>a.type==='peddler').length,0)}));
  const stages=[];const resources=[];
  for(const [policy,runs] of policyGroups) {
    for(const [position,list] of group(runs,r=>`${r.reachedWave}:${r.reachedStage}`)) {
      const [wave,stage]=position.split(':').map(Number);stages.push({policy,wave,stage,count:list.length,share:list.length/runs.length});
    }
    const observations=runs.flatMap(r=>r.trajectory.map(point=>({...point,seed:r.seed})));
    for(const [position,list] of group(observations,p=>`${p.wave}:${p.stage}:${p.event}`)) {
      const [wave,stage,...event]=position.split(':');
      resources.push({policy,wave:Number(wave),stage:Number(stage),event:event.join(':'),observations:list.length,
        runs:new Set(list.map(x=>x.seed)).size,meanLife:avg(list,x=>x.life),meanGold:avg(list,x=>x.gold),meanMana:avg(list,x=>x.mana)});
    }
  }
  stages.sort((a,b)=>a.policy.localeCompare(b.policy)||a.wave-b.wave||a.stage-b.stage);
  resources.sort((a,b)=>a.policy.localeCompare(b.policy)||a.wave-b.wave||a.stage-b.stage||a.event.localeCompare(b.event));
  const catalog=new Map((meta.catalog||[]).map(c=>[key(c),c]));
  for(const r of rows) for(const c of [...r.offers.map(o=>o.card),...r.acquisitions.map(a=>a.card)]) catalog.set(key(c),{...catalog.get(key(c)),...c});
  const cards=[];
  for(const [policy,runs] of [['all',rows],...policyGroups]) {
    const overallClear=rate(runs),overallWave=avg(runs,r=>r.reachedWave),overallProgress=avg(runs,r=>r.progress);
    const stats=new Map([...catalog].map(([k,c])=>[k,{policy,name:c.name,category:c.category,rarity:c.rarity,grade:c.grade,
      eligible:c.rewardEligible!==false||c.shopEligible!==false,offered:0,offeredRuns:0,selectedOffers:0,acquisitions:0,
      adoptedRuns:0,adoptedClears:0,adoptedWaveSum:0,adoptedProgressSum:0,retainedRuns:0,initialRuns:0,grantRuns:0}]));
    for(const r of runs) {
      const selected=new Set(r.acquisitions.map(a=>a.offerId).filter(Boolean)),seenOffers=new Set();
      for(const offer of r.offers) {
        const s=stats.get(key(offer.card));s.offered++;seenOffers.add(key(offer.card));
        if(selected.has(offer.id)) s.selectedOffers++;
      }
      for(const k of seenOffers) stats.get(k).offeredRuns++;
      const adopted=new Set();
      for(const a of r.acquisitions){stats.get(key(a.card)).acquisitions++;adopted.add(key(a.card));}
      const retained=new Set([...r.finalBoard.filter(Boolean),...r.rings,...r.items].map(key));
      for(const k of adopted) {
        const s=stats.get(k);s.adoptedRuns++;s.adoptedClears+=r.clear?1:0;s.adoptedWaveSum+=r.reachedWave;s.adoptedProgressSum+=r.progress;
        if(retained.has(k))s.retainedRuns++;
        if(r.acquisitions.some(a=>key(a.card)===k&&a.source==='initial'))s.initialRuns++;
        if(r.acquisitions.some(a=>key(a.card)===k&&['effect','elite'].includes(a.source)))s.grantRuns++;
      }
    }
    for(const s of stats.values()) {
      const count=s.adoptedRuns;
      cards.push({policy:s.policy,category:s.category,name:s.name,rarity:s.rarity,grade:s.grade,
        offered:s.offered,offeredRuns:s.offeredRuns,selectedOffers:s.selectedOffers,adoptionRate:s.offered?s.selectedOffers/s.offered:0,
        acquisitions:s.acquisitions,adoptedRuns:count,adoptedClearRate:count?s.adoptedClears/count:null,
        overallClearRate:overallClear,clearLift:count?s.adoptedClears/count-overallClear:null,
        adoptedMeanWave:count?s.adoptedWaveSum/count:null,overallMeanWave:overallWave,waveLift:count?s.adoptedWaveSum/count-overallWave:null,
        adoptedMeanProgress:count?s.adoptedProgressSum/count:null,progressLift:count?s.adoptedProgressSum/count-overallProgress:null,
        retainedRuns:s.retainedRuns,retentionRate:count?s.retainedRuns/count:null,initialRuns:s.initialRuns,grantRuns:s.grantRuns,
        sample:count<MIN_SAMPLE?'母数不足':'参考値',availability:s.eligible?'抽選対象候補':'通常抽選対象外'});
    }
  }
  const comboStats=new Map();
  for(const r of rows) for(const c of r.combos||[]) {
    const k=`${r.policy}\0${c.enchant}\0${c.body}`;
    if(!comboStats.has(k))comboStats.set(k,{policy:r.policy,enchant:c.enchant,body:c.body,runs:0,clears:0,waveSum:0});
    const s=comboStats.get(k);s.runs++;s.clears+=r.clear?1:0;s.waveSum+=r.reachedWave;
  }
  const combos=[...comboStats.values()].map(s=>({...s,clearRate:s.clears/s.runs,meanWave:s.waveSum/s.runs,sample:s.runs<MIN_SAMPLE?'母数不足':'参考値'}));
  for(const [k,list] of group(combos,c=>`${c.enchant}\0${c.body}`)) {
    const count=list.reduce((s,c)=>s+c.runs,0),clears=list.reduce((s,c)=>s+c.clears,0),sum=list.reduce((s,c)=>s+c.waveSum,0);
    combos.push({policy:'all',enchant:list[0].enchant,body:list[0].body,runs:count,clears,waveSum:sum,clearRate:clears/count,meanWave:sum/count,sample:count<MIN_SAMPLE?'母数不足':'参考値'});
  }
  const archetypes=[];
  for(const [policy,runs] of [['all',rows],...policyGroups]) {
    const cleared=runs.filter(r=>r.clear);
    const types=group(cleared,r=>{
      const chars=r.finalBoard.filter(c=>c?.category==='キャラクター');
      const colors=[...group(chars,c=>c.color||'無色')].map(([c,a])=>`${c}${a.length}`).sort().join('・');
      const main=chars.slice().sort((a,b)=>(b.power+b.life)-(a.power+a.life)||a.name.localeCompare(b.name,'ja')).slice(0,3).map(c=>c.name).sort().join('・');
      return `${colors} / ${main}`;
    });
    for(const [type,list] of types) archetypes.push({policy,type,runs:list.length,clearRuns:cleared.length,share:list.length/cleared.length});
  }
  archetypes.sort((a,b)=>a.policy.localeCompare(b.policy)||b.runs-a.runs||a.type.localeCompare(b.type));
  const never=cards.filter(c=>c.policy==='all'&&c.adoptedRuns===0);
  const noncontributing=cards.filter(c=>c.policy==='all'&&c.adoptedRuns>=MIN_SAMPLE&&c.clearLift<=0&&c.progressLift<=0);
  return {summaries,stages,resources,cards,combos,archetypes,never,noncontributing};
}

function comparison(rows,otherRows) {
  const baseline=new Map(rows.map(r=>[`${r.policy}:${r.seed}:${r.storyCycle}`,r]));
  const pairs=otherRows.map(r=>({base:baseline.get(`${r.policy}:${r.seed}:${r.storyCycle}`),variant:r})).filter(p=>p.base);
  const outcomes=pairs.filter(p=>p.base.clear!==p.variant.clear);
  const progress=pairs.filter(p=>p.base.reachedWave!==p.variant.reachedWave||p.base.reachedStage!==p.variant.reachedStage);
  const battleChanges=pairs.filter(p=>JSON.stringify(p.base.battles.map(b=>[b.wave,b.stage,b.outcome,b.turns,b.goldAfter,b.manaAfter]))!==JSON.stringify(p.variant.battles.map(b=>[b.wave,b.stage,b.outcome,b.turns,b.goldAfter,b.manaAfter])));
  return {pairs:pairs.length,baselineClearRate:avg(pairs,p=>p.base.clear),variantClearRate:avg(pairs,p=>p.variant.clear),
    baselineMeanWave:avg(pairs,p=>p.base.reachedWave),variantMeanWave:avg(pairs,p=>p.variant.reachedWave),
    changedClear:outcomes.length,changedProgress:progress.length,changedBattles:battleChanges.length,
    examples:battleChanges.slice(0,5).map(p=>({policy:p.variant.policy,seed:p.variant.seed,
      before:`${p.base.status} St${p.base.reachedWave}:${p.base.reachedStage}`,after:`${p.variant.status} St${p.variant.reachedWave}:${p.variant.reachedStage}`,
      beforeBattles:p.base.battles.length,afterBattles:p.variant.battles.length}))};
}

function failureDiagnosis(rows) {
  const focus=rows.filter(r=>r.policy==='lookahead'),failed=focus.filter(r=>!r.clear&&r.deathBattle);
  const groups=[...group(failed,r=>`${r.deathBattle.wave}:${r.deathBattle.stage}:${r.deathBattle.type}`)]
    .map(([position,list])=>({position,count:list.length,share:failed.length?list.length/failed.length:0,
      meanGold:avg(list,r=>r.finalGold),example:list.slice().sort((a,b)=>a.seed-b.seed)[Math.floor(list.length/2)]}))
    .sort((a,b)=>b.count-a.count||a.position.localeCompare(b.position));
  return {focus,failed,groups};
}

function writeReport(input,out,comparisons=[],noBoonInput) {
  const {rows,meta}=readInput(input),data=analyze(rows,meta);
  if(meta.botVersion>=6&&rows.some(r=>r.plannerStage==='r2'))return require('./planner_r2_report').write({rows,meta,out});
  if(meta.botVersion>=5&&rows.some(r=>r.policy==='planner'))return require('./planner_report').write({rows,meta,out});
  fs.mkdirSync(out,{recursive:true});
  csv(path.join(out,'policies.csv'),data.summaries);
  csv(path.join(out,'stages.csv'),data.stages);
  csv(path.join(out,'resources.csv'),data.resources);
  csv(path.join(out,'cards.csv'),data.cards);
  const cardColumns=Object.keys(data.cards[0]||{});
  for(const [category,file] of [['キャラクター','characters'],['エンチャント','enchants'],['指輪','rings'],['アイテム','items']]) csv(path.join(out,`${file}.csv`),data.cards.filter(c=>c.category===category),cardColumns);
  csv(path.join(out,'combos.csv'),data.combos,['policy','enchant','body','runs','clears','clearRate','meanWave','sample']);
  csv(path.join(out,'archetypes.csv'),data.archetypes,['policy','type','runs','clearRuns','share']);
  csv(path.join(out,'never_adopted.csv'),data.never,cardColumns);
  csv(path.join(out,'noncontributing.csv'),data.noncontributing,cardColumns);
  csv(path.join(out,'lookahead_cards.csv'),data.cards.filter(c=>c.policy==='lookahead'),cardColumns);
  csv(path.join(out,'all_policy_cards.csv'),data.cards.filter(c=>c.policy==='all'),cardColumns);
  const focusPolicy=rows.some(r=>r.policy==='lookahead')?'lookahead':'all';
  const diagnosis=failureDiagnosis(rows);
  csv(path.join(out,'lookahead_failures.csv'),diagnosis.groups.map(g=>({position:g.position,count:g.count,share:g.share,meanGold:g.meanGold,exampleSeed:g.example.seed})),['position','count','share','meanGold','exampleSeed']);
  let md='# Vesselbound 自動周回バランス検証\n\n';
  md+=`${rows.length}周、種${Math.min(...rows.map(r=>r.seed))}〜${Math.max(...rows.map(r=>r.seed))}。魔導板→formation→本番セーブ用computeBattle→runBattleCoreで計算。戦闘コアは変更していない。\n\n`;
  if(meta.trial)md+=`PvE試験設定：新規合体${meta.trial.panelMerge?'あり':'停止'}、交換店での道具売却${meta.trial.exchangeItemSale?'あり':'なし'}。魔鏡・絆の巻物は通常抽選から除外し、コアが戦闘効果で与えた絆の巻物と旧所持品は保持する。編成の出発可否と瞳の表示を修正し、戦闘へ渡す編成と内蔵シートは維持する。\n\n`;
  md+=`ストーリー周回: ${[...new Set(rows.map(r=>r.storyCycle))].join(', ')}。初回はステージ4の塔で本体がクリアを確定。2周目以降も五聖の座を訪れない通常踏破を扱う。全体の壁時計 ${num((meta.elapsedMs||0)/1000)}秒、${meta.workers||1}プロセス。方針別の1周所要時間は下表（並列実行の競合を含む）。\n\n`;
  if(focusPolicy==='lookahead') {
    const summary=data.summaries.find(s=>s.policy==='lookahead');
    md+=`## 主評価：lookahead\n\n**${summary.clear}/${summary.runs}周クリア（${pct(summary.clearRate)}）、平均到達ステージ${num(summary.meanWave)}、1周${num(summary.msPerRun/1000)}秒。**\n\n`;
    md+=`敵生成・戦闘乱数はランとは独立した種を使い、同じ候補間では共通の敵サンプルで比較する。G・提示・ラン乱数を複製して、実際のcomputeBattleで勝率→行動可能な味方の残HP合計→敵へのダメージ量の順に評価。封印中のHPはコアのcoreLivingUnitsで除外。各${meta.lookahead?.samples||3}例。初期の5例試走では約18秒/周だったため3例へ削減した。カードは基本評価上位${meta.lookahead?.cardCandidates||5}枚、配置は基本上位${meta.lookahead?.placements||1}箇所に前衛・後衛候補を加え、配置交換は基本上位${meta.lookahead?.swapCandidates||5}件＋分散候補4件、改善${meta.lookahead?.arrangePasses||2}回。基本4方針の完成盤面も${meta.lookahead?.layoutCandidates||4}案までコアで評価する。再戦時や見積り勝率が100%未満の時は2スワップの候補も試す。\n\n`;
    md+=`魔導店は3枠×魔導板の占有マスの合法な交換をすべて同じ次戦サンプルで比較する。祭壇の交換は必須で、還魂候補は基本評価上位${meta.lookahead?.ringPlans||3}組から各指輪との組合せを試す。道具の購入・使用は維持する。未来の報酬・品揃えは参照せず、既知の再戦相手は保存済みの敵と独立した戦闘乱数で試す。\n\n`;
    md+=`周回数は通常4方針各200、lookaheadは${summary.runs}周${summary.runs<200?'（計算量のため削減）':'（低いクリア率の診断のため200周まで実行）'}。目安の10%${summary.clearRate>=0.1?'を達成':'には未達（下記に敗因と限界を記録）'}。\n\n`;
  }
  if(!rows.some(r=>r.clear)) md+='**この条件ではクリア0件。クリア盤面の多様性と勝利への寄与は母数不足で評価できない。強弱候補の順位は主に到達地点との関連であり、勝率の優劣を示さない。終了経路の健全性は仮変更で実際にクリアしたランも含めて検査した。**\n\n';
  md+='## 方針別\n\n'+table(['方針','周回','クリア率','平均到達St','平均戦闘数','終了G','秒/周','GO／打切／停止'],data.summaries.map(s=>[s.policy,s.runs,`${s.clear}/${s.runs} (${pct(s.clearRate)})`,num(s.meanWave),num(s.meanBattles),num(s.meanFinalGold),num(s.msPerRun/1000),`${s.gameover}／${s.timeout}／${s.stalled}`]));
  if(meta.towerBoon){
    const before=meta.botVersion>=4?path.join(__dirname,'out_before_shop_exchange'):(noBoonInput||path.join(__dirname,'out_no_boon'));
    if(fs.existsSync(path.join(before,'runs.jsonl'))){
      const old=readInput(before);
      if(meta.botVersion>=4)md+=require('./shop_exchange_report').build(rows,old.rows,out,csv,meta.trial).markdown;
      md+=require('./boon_report').build(rows,meta,old.rows,old.meta,out,csv).markdown;
    }
  }
  if(meta.botVersion>=2){
    const peddlerRule=meta.sourceHashes?.['js/engine/peddler.js']
      ?'行商人の提示は本体の報酬抽選3枚を使い、魔導店と同じ判断とexchangeShopCardで交換する。'
      :'行商人の提示は本体を使い、ボットは道具だけ購入する。';
    md+='## 再戦・行商人\n\n'+table(['方針','再編成を検討','盤面が変わった回数','カード売却数','行商人来訪'],data.summaries.map(s=>[s.policy,s.retryRebuilds,s.changedRebuilds,s.sales,s.peddlers]))+'全方針で敗北後に再配置する。lookaheadは改善が無い場合に維持し、検討と実変更を別々に記録する。'+peddlerRule+'\n\n';
  }
  if(focusPolicy==='lookahead') {
    const winner=rows.find(r=>r.policy==='lookahead'&&r.clear);
    if(winner) {
      md+=`## lookaheadの実クリア例\n\n種${winner.seed}、${winner.battles.length}戦、最終ライフ${winner.finalLife}、${winner.finalGold}G。仮変更を使わず、本体のクリア出口まで進んだ記録。\n\n`;
      md+=table(['マス','マスの力','カード','分類','素のATK/HP','向き'],winner.finalBoard.filter(Boolean).map(c=>[c.slot,c.powerId||'—',c.name,c.category,`${c.power}/${c.life}`,c.directions.join('・')]));
      md+=`指輪: ${winner.rings.map(c=>c.name).join('・')||'なし'}。この1例だけで各カードの強さを確定しない。\n\n`;
    }
    md+='## lookaheadの敗因診断\n\n'+table(['最後の戦闘 St:マス:種別','敗退数','敗退内の割合','終了G平均','典型例の種'],diagnosis.groups.map(g=>[g.position,g.count,pct(g.share),num(g.meanGold),g.example.seed]));
    md+='本体の能力値を下げず、実際の最終敗北を集計した。以下は頻出地点ごとの代表例。魔導板のATK/HPはカード本体の記録値であり、接続・指輪・開戦効果後の戦闘値ではない。接続向きと効果文も併記する。\n\n';
    for(const entry of diagnosis.groups.slice(0,3)) {
      const run=entry.example,b=run.deathBattle;
      const chars=b.board.filter(c=>c?.category==='キャラクター');
      const strongest=Math.max(...b.enemies.map(e=>e.atk));
      const remains=b.remainingEnemies||[];
      md+=`### 種${run.seed} / ${entry.position}\n\n`;
      md+=`ライフ${b.lifeBefore}→${b.lifeAfter}、最終所持金${run.finalGold}G。敵の最大ATK${strongest}に対し、素のHPがそれ未満のキャラは${chars.filter(c=>c.life<strongest).length}/${chars.length}枚。最終敗北時にも敵${remains.length}体・合計HP${remains.reduce((s,e)=>s+e.hp,0)}が残った。\n\n`;
      md+=table(['敵','前後衛','ATK','HP'],b.enemies.map(e=>[e.name,e.lane,e.atk,e.hp]));
      md+=table(['魔導板マス','マスの力','カード','分類','素のATK/HP','向き','効果'],b.board.filter(Boolean).map(c=>[c.slot,c.powerId||'—',c.name,c.category,`${c.power}/${c.life}`,c.directions.join('・'),c.desc]));
      const retry=run.actions.filter(a=>a.type==='retry_rebuild');
      md+=`再戦前の組み直しは${retry.length}回検討し、${retry.filter(a=>a.changed).length}回配置を変更。合体カード${b.board.filter(c=>c?.triple||c?.bond).length}枚、魔導板にマナ獲得の文を持つカード${b.board.filter(c=>c&&/マナを?得る/.test(c.desc)).length}枚。\n\n`;
      const lastForecast=retry.filter(a=>a.wave===b.wave&&a.stage===b.stage).at(-1)?.forecast?.at(-1)?.value;
      if(lastForecast)md+=`最後の再戦前に選んだ配置の見積り勝率は${pct(lastForecast.win)}（独立${meta.lookahead?.samples||3}試行）。${lastForecast.win>0?'実戦の乱数は別なので、この見積りでも敗北している。':'全試行で敗北し、探索範囲内で勝てる編成を作れていない。'}\n\n`;
    }
    md+='### ボット側で修正して再実行した点と残る限界\n\n';
    md+='- カードの売却と購入を廃止し、店の交換を本体のexchangeShopCardで実行する。\n- 基本4方針は盤面評価が改善する交換、lookaheadは次戦評価が改善する交換を順番に選ぶ。\n- 祭壇は3枚還魂と指輪取得を必ず行い、最後の出撃キャラを残して3枚払えない場合だけ免除する。\n- 道具の購入・使用、再戦の配置改善は維持する。\n- 先読みは次の1戦だけを扱う。店の全合法交換を試すが、複数回の交換を組にした全探索や、将来の合体・未提示カードの探索は行わない。\n\n';
    md+='さらに、基本4方針が組んだ完成盤面を候補へ追加した。1～2手の交換では途中の評価が改善しなくても、接続網を組み替えた結果が強ければ実際のコア試行で採用できる。完成盤面も同じ敵サンプルで比較し、実ランへの反映は合法なスワップだけを使う。\n\n';
    md+='初回ストーリーのホーム／酒場の本体処理は会話のみで、配布カードやゴールドの処理が存在しない。Q003等の通常依頼は本体の `_onVillageFacility` が2周目以降に開くため、初回ランへ勝手に追加しなかった。`--story-cycle 2` では本体のクエスト抽選・カード提示・受託・到着報酬を使う。Q003の受領→塔での100G→カード回収は自己テストで実行し、二重払いも検査した。追撃戦は専用戦闘・敗退後の進行、塔出発型は同行者を残す／捧げる等の分岐を必要とする。その操作AI・専用旅程の監査は未実装なので受託前に除外し、理由を各ランへ記録する。\n\n';
    md+='診断上の不足は、中盤の敵を倒し切れる火力と攻撃を受ける耐久を同時に伸ばす編成への移行。単体の強いカードや次戦用の道具を取るだけでは、敵が複数残る敗北を解消できていない。マナ連鎖・合体・指輪へ数手かけて投資する計画は未実装であり、次の1戦で改善しない素材や組合せを捨てる場合がある。これはカードそのものの弱さと区別すべき、ボット側に残る能力の限界。\n\n';
    md+='クリア率が低い状態では、後半カードの評価とクリア盤面の型の偏りは特に不確か。今回のカード表はこのボットによる選択・到達の観測結果であり、上手いプレイヤー全般を代表する強弱の確定値としては使えない。\n\n';
  }
  md+='## 評価関数と配置\n\n'+Object.entries(meta.policies||{}).map(([p,s])=>`- **${p}**: ${s}`).join('\n')+'\n\n';
  md+='4つの基本方針は本体の出撃枠・配置可否・接続探索を使い、前衛のHP・接続する強化網を評価して最大3回の合法スワップで改善する。再戦は評価を大きく落とさない別配置も試す。全方針で矢印は提示時の向きを維持し、通常プレイにない回転はしない。報酬は本体の1枚取得制限、鍛冶は購入可能な強化、宿は支払可能な最大回復。\n\n';
  md+='## 到達ステージの分布\n\n'+table(['方針','到達St:マス','周回数','割合'],data.stages.map(s=>[s.policy,`${s.wave}:${s.stage}`,s.count,pct(s.share)]));
  md+='## ライフ・ゴールド推移\n\n各到達地点の観測平均（脱落後の値は補完しない）。再戦は別観測。CSVには施設ごとの推移・マナ・観測数・到達ラン数も含む。\n\n';
  md+=table(['方針','St','観測数','平均ライフ','平均G'],[...group(data.resources.filter(r=>r.event==='battle'),r=>`${r.policy}:${r.wave}`)].map(([,list])=>{
    const count=list.reduce((s,r)=>s+r.observations,0);return [list[0].policy,list[0].wave,count,
      num(list.reduce((s,r)=>s+r.meanLife*r.observations,0)/count),num(list.reduce((s,r)=>s+r.meanGold*r.observations,0)/count)];}));
  md+='## カード別の関連（因果効果ではない）\n\n採用率＝提示機会のうち実際に取得した割合。同一カードの再提示も数える。初期カードは提示・強制採用として含み、初期／効果・エリート直接付与のラン数をCSVで区別する。採用ランの成績は同一カードを何枚取っても1ラン。保持率＝採用ランのうち終了時の魔導板・指輪枠・アイテム枠に同名が残る割合。消耗アイテムは使用すると保持されない。未採用は成績なし。\n\n';
  md+=`採用ラン${MIN_SAMPLE}未満を「母数不足」とする。全体との差は観測上の関連に限る。強いランほど後半カードを取得できる生存者の偏り、初期カードの強制採用、方針の偏りがある。方針内平均との差も cards.csv に併記。到達St差とマスを含む進行差は別列。\n\n`;
  for(const policy of focusPolicy==='lookahead'?['lookahead','all']:['all']) {
  md+=`### ${policy==='lookahead'?'lookahead単独（主評価）':'全方針合計'}\n\n`;
  for(const category of ['キャラクター','エンチャント','指輪','アイテム']) {
    md+=`#### ${category}\n\n`+table(['カード','提示','採用率','採用ラン','採用クリア率','同方針平均との差pt','平均到達St（差）','保持率','母数'],data.cards.filter(c=>c.policy===policy&&c.category===category).sort((a,b)=>b.adoptedRuns-a.adoptedRuns).map(c=>[
      c.name,c.offered,pct(c.adoptionRate),c.adoptedRuns,c.adoptedClearRate===null?'—':pct(c.adoptedClearRate),c.clearLift===null?'—':num(c.clearLift*100),c.adoptedRuns?`${num(c.adoptedMeanWave)} (${num(c.waveLift)})`:'—',c.retentionRate===null?'—':pct(c.retentionRate),c.sample]));
  }}
  const eligible=data.cards.filter(c=>c.policy===focusPolicy&&c.adoptedRuns>=MIN_SAMPLE);
  const strong=[...eligible].sort((a,b)=>b.clearLift-a.clearLift||b.progressLift-a.progressLift).slice(0,10);
  const weak=[...eligible].sort((a,b)=>a.clearLift-b.clearLift||a.progressLift-b.progressLift).slice(0,10);
  for(const [label,list] of [['強すぎ候補',strong],['弱すぎ候補',weak]]) md+=`## ${label}（${focusPolicy}内の関連）\n\n`+table(['カード','分類','採用ラン','クリア率差pt','到達St差'],list.map(c=>[c.name,c.category,c.adoptedRuns,num(c.clearLift*100),num(c.waveLift)]));
  const allCombos=data.combos.filter(c=>c.policy===focusPolicy);
  const comboTable=list=>table(['エンチャント','本体','採用ラン','クリア率','平均到達St','母数'],list.map(c=>[c.enchant,c.body,c.runs,pct(c.clearRate),num(c.meanWave),c.sample]));
  md+='## エンチャント×本体 上位20\n\n同じ組合せは、何戦使っても1ラン1採用として数える。実際に出撃枠の本体へ接続した時点のみ。\n\n### 採用数\n\n'+comboTable([...allCombos].sort((a,b)=>b.runs-a.runs).slice(0,20));
  const enough=allCombos.filter(c=>c.runs>=MIN_SAMPLE);
  md+='### クリア率が高い組合せ\n\n'+comboTable([...enough].sort((a,b)=>b.clearRate-a.clearRate||b.runs-a.runs).slice(0,20));
  md+='### クリア率が低い組合せ\n\n'+comboTable([...enough].sort((a,b)=>a.clearRate-b.clearRate||b.runs-a.runs).slice(0,20));
  if(enough.length<20)md+=`母数を満たす組合せは${enough.length}種類。20件に満たない分を少数例で埋めない。全組合せと方針別の値は combos.csv。\n\n`;
  md+='## クリア盤面の多様性\n\n型＝終了時に魔導板上で所持するキャラの色別枚数＋素のATK+HP上位3枚のカード名（並び替え後）。同点は名前順。出撃外の予備も含む。\n\n';
  md+=table(['方針','クリア数','型の種類','最多型比率','上位3型の割合','上位10型の割合'],['all',...data.summaries.map(s=>s.policy)].map(policy=>{
    const types=data.archetypes.filter(t=>t.policy===policy).sort((a,b)=>b.runs-a.runs);return [policy,types[0]?.clearRuns||0,types.length,types.length?pct(types[0].share):'母数不足',types.length?pct(types.slice(0,3).reduce((s,t)=>s+t.share,0)):'母数不足',types.length?pct(types.slice(0,10).reduce((s,t)=>s+t.share,0)):'母数不足'];
  }));
  md+=table(['方針','型','数','割合'],data.archetypes.filter(t=>t.policy==='all').slice(0,20).map(t=>[t.policy,t.type,t.runs,pct(t.share)]));
  md+='## 一度も採用されないカード\n\n通常抽選対象外・未提示も区別。全分類・方針別の件数はCSV。\n\n'+table(['分類','カード','提示','対象'],data.never.map(c=>[c.category,c.name,c.offered,c.availability]));
  md+='## 採用されても成績向上との関連が見られないカード\n\n「勝ちに寄与しない」の探索用指標＝採用20ラン以上、クリア率差≦0、到達進行差≦0。因果的に効果が無いとは断定しない。\n\n'+table(['分類','カード','採用ラン','クリア率差pt','到達St差'],data.noncontributing.map(c=>[c.category,c.name,c.adoptedRuns,num(c.clearLift*100),num(c.waveLift)]));
  if(meta.overrideNotes?.length) md+='## 仮変更の解釈\n\n'+meta.overrideNotes.map(n=>`- ${n.name}: ${n.interpretation}`).join('\n')+'\n\n';
  const comparisonRows=[];
  for(const item of comparisons) {
    const variant=readInput(item),result=comparison(rows,variant.rows);
    comparisonRows.push({variant:path.basename(item),...result,examples:JSON.stringify(result.examples)});
    md+=`## 仮変更比較: ${path.basename(item)}\n\n`;
    md+=(variant.meta.overrideNotes||[]).map(n=>`- ${n.name}: ${JSON.stringify(n.patch)}。${n.interpretation}`).join('\n')+'\n\n';
    md+=`同じ方針・種・ストーリー周回の${result.pairs}組を比較。クリア率 ${pct(result.baselineClearRate)} → ${pct(result.variantClearRate)}、平均到達St ${num(result.baselineMeanWave)} → ${num(result.variantMeanWave)}。クリア可否の変化${result.changedClear}組、到達地点の変化${result.changedProgress}組、戦闘結果・手数・資源の変化${result.changedBattles}組。\n\n`;
    md+=table(['方針','種','変更前','変更後','戦闘数 前→後'],result.examples.map(e=>[e.policy,e.seed,e.before,e.after,`${e.beforeBattles}→${e.afterBattles}`]));
  }
  if(comparisonRows.length)csv(path.join(out,'override_comparison.csv'),comparisonRows);
  const selftestFile=path.join(out,'SELFTEST.json');
  if(fs.existsSync(selftestFile)) {
    const check=JSON.parse(fs.readFileSync(selftestFile,'utf8'));
    md+='## 健全性検査\n\n'+check.checks.map(s=>`- ${s}`).join('\n')+'\n\n';
  }
  if(meta.botVersion>=2)md+=`第1段の \`override_numeric/\`、\`override_add/\`、\`override_comparison.csv\` は旧ボットの記録として${meta.botVersion>=3?'out_no_boon/へ退避して':''}保持し、今回の通常${rows.length}周の比較・集計・自己テストには含めていない。今回のボットで仮変更を比較する場合は、同じ版でoverride側も再実行する。\n\n`;
  md+='## 本体の受け口・省略した要素\n\n'+(meta.bypasses||[]).map(s=>`- ${s}`).join('\n')+'\n\n';
  if(meta.botVersion>=2)md+='到着イベントは本体の `maybeStartQ009TowerArrival` / `maybeStartQuestTownArrival` を退避し、通常の自動呼出しを止めて施設到着時に1回呼ぶ。`fadeScreenSwitch` / `_qEventFormationSwitch` は処理を即時実行し、会話コールバックのPromise完了を待つ。`_prepareStoryArrival` / `_runStoryArrival` の到着演出は省略し、初回のクリア確定は本体 `_startWaveFlowNext` の出口を使う。`_playVillageEnterIntro`、`_qClearPresentation`、`playBattlePlayerDefeatLines`、`_playMapForgeSlotRoll`、`_flushRingManaThresholdEffects` も表示待ちを省略する。`SaveProfile.hasClearedRun` は指定したstory-cycleを返す。\n\n無処理にした描画・音声・プロフィール記録関数（戦闘計算は含まない）：\n\n'+(meta.noopFunctions||[]).map(s=>'`'+s+'`').join('、')+'。\n\n';
  md+='### 再現していない要素・未確認\n\n'+(meta.unsupported||[]).map(s=>`- ${s}`).join('\n')+'\n\n画面・音声・ブラウザ実機は未確認。初回施設の会話に配布処理はなく、通常依頼は2周目の本体経路で受け取る。強弱の判断はこのAI・省略条件下の比較であり、人間のプレイ成績との一致は未確認。探索の調整には同じseed範囲の試走も使っており、別seed範囲での独立した性能検証は未実施。\n\n';
  md+=`### 調整値\n\nMIN_SAMPLE=${MIN_SAMPLE}、MAX_ACTIONS=${meta.limits?.maxActions||300}、基本方針の配置改善=${meta.limits?.arrangePasses||3}回、lookaheadの配置改善=${meta.lookahead?.arrangePasses||2}回、戦闘上限=${meta.limits?.coreTurnLimit||500}手（本体）。\n\n`;
  md+=`### 再実行\n\n\`\`\`sh\nnode tools/balance_sim/run_bot.js --runs 200 --lookahead-runs ${meta.policyCounts?.lookahead||100} --policy all --seed 1 --workers 4 --out tools/balance_sim/out\nnode tools/balance_sim/run_bot_selftest.js --input tools/balance_sim/out\nnode tools/balance_sim/run_report.js --input tools/balance_sim/out\n\`\`\`\n\n`;
  fs.writeFileSync(path.join(out,'RUN_REPORT.md'),md);
  return {rows:rows.length,summary:data.summaries,comparisons:comparisonRows};
}

function main(args=process.argv.slice(2)) {
  let input=path.join(__dirname,'out'),out,comparisons=[],noBoon;
  for(let i=0;i<args.length;i++){
    const flag=args[i],value=args[++i];
    if(!value)throw new Error(`値が必要: ${flag}`);
    if(flag==='--input')input=value;else if(flag==='--out')out=value;else if(flag==='--compare')comparisons.push(value);else if(flag==='--no-boon')noBoon=path.resolve(value);else throw new Error(`不明な引数: ${flag}`);
  }
  input=path.resolve(input);out=path.resolve(out||(fs.statSync(input).isDirectory()?input:path.dirname(input)));
  const result=writeReport(input,out,comparisons.map(f=>path.resolve(f)),noBoon);
  console.log(`報告作成: ${result.rows}周 → ${path.join(out,'RUN_REPORT.md')}`);
}
module.exports={analyze,readInput,writeReport,comparison,csv,MIN_SAMPLE};
if(require.main===module){try{main();}catch(e){console.error(e.stack||e);process.exitCode=1;}}
