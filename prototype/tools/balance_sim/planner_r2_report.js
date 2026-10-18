'use strict';

const fs=require('node:fs'),path=require('node:path');
const {ARCHETYPES,writeTables,extract}=require('./synergy'),{curve}=require('./boon_report');
const {recordedChoices:choices}=require('./planner_horizon');
const avg=(xs,f)=>xs.length?xs.reduce((s,x)=>s+Number(f(x)),0)/xs.length:null;
const pct=n=>n==null?'—':(n*100).toFixed(1)+'%',num=n=>n==null?'—':n.toFixed(3);
const table=(heads,rows)=>`|${heads.join('|')}|\n|${heads.map(()=>'---').join('|')}|\n`+rows.map(r=>'|'+r.map(x=>String(x??'—').replaceAll('|','／').replaceAll('\n',' ')).join('|')+'|').join('\n')+'\n\n';
const names={lookahead:'lookahead',planner_r1:'planner（第1段）',planner_r2:'planner（第2段）'};
function actionChoices(r){return choices(r).map(c=>({...c,seed:r.seed,reachedWave:r.reachedWave,clear:r.clear}));}
function lossExamples(runs){
  const result=[];
  for(const r of runs)for(const battle of r.battles.filter(b=>!b.retry&&['elite','boss'].includes(b.type)&&b.outcome!=='p1')){
    const plans=r.actions.flatMap(a=>[
      ...(a.forecast?.horizon?[{type:a.type,name:a.name,wave:a.wave,stage:a.stage,horizon:a.forecast.horizon}]:[]),
      ...(Array.isArray(a.forecast)?a.forecast.filter(c=>c.value?.horizon).map(c=>({type:a.type,wave:a.wave,stage:a.stage,horizon:c.value.horizon})):[])
    ]).filter(p=>p.horizon.distance>0&&p.horizon.target.wave===battle.wave&&p.horizon.target.stage===battle.stage);
    const plan=plans.at(-1);if(!plan)continue;
    const future=plan.horizon.scenarios.filter(s=>s.future>=0).sort((a,b)=>b.win-a.win||b.hp-a.hp)[0];if(!future)continue;
    const actual=battle.board.filter(Boolean),projected=future.board.filter(Boolean);
    const count=list=>{const map=new Map();for(const c of list)map.set(c.name,(map.get(c.name)||0)+1);return map;};
    const actualCounts=count(actual),assumedCounts=count(projected),missing=[];
    for(const [name,n] of assumedCounts)if(n>(actualCounts.get(name)||0))missing.push(`${name}×${n-(actualCounts.get(name)||0)}`);
    const acquiredMissing=[...new Set(future.acquired.filter(c=>(assumedCounts.get(c.name)||0)>(actualCounts.get(c.name)||0)).map(c=>c.name))];
    const roles=actual.map(extract),shortages=[],pairedSupply=new Set((battle.synergy?.pairs||[]).filter(p=>p.active).map(p=>p.token));
    for(const token of ['mana','blood','summon','poison','barrier'])if(roles.some(c=>(c.consumes[token]||0)>=.65)&&!roles.some(c=>(c.produces[token]||0)>=.65)&&!pairedSupply.has(token))shortages.push(`${token}の主な供給がない（抽出上）`);
    const enemyHp=battle.enemies.reduce((s,e)=>s+e.hp,0),remainingRatio=battle.remainingEnemies.reduce((s,e)=>s+e.hp,0)/Math.max(1,enemyHp);
    if(remainingRatio>.7)shortages.push('敵HPの7割以上が残る（削り切れない）');
    if(battle.outcome==='draw'&&!battle.remainingEnemies.length)shortages.push('残敵0の引分');
    const manaEvents=battle.eventCounts.mana_threshold||0;
    if(actual.some(c=>/\d+\s*マナ(?:毎)?[：:]/.test(c.desc||''))&&!manaEvents)shortages.push('Nマナ効果あり・閾値発動イベントなし');
    const diagnosis=plan.horizon.win===0?'全想定で勝てない：供給/発動を含む戦闘力が不足':
      plan.horizon.scenarios[0].win>=.75?'追加取得なしでも高勝率予測：敵/戦闘サンプル・途中経過の差':
      acquiredMissing.length?'想定した将来カードが揃わない：提示・選択・差し替えの差':
        missing.length?'想定と実際で構成/接続先が異なる':'同名構成でも、矢印・強化・敵/戦闘乱数の差で敗北';
    result.push({seed:r.seed,wave:battle.wave,stage:battle.stage,type:battle.type,decisionType:plan.type,decisionCard:plan.name||'',
      distance:plan.horizon.distance,predictedWin:plan.horizon.win,missWin:plan.horizon.scenarios[0].win,bestFutureWin:future.win,
      actualOutcome:battle.outcome,assumedAcquisitions:future.acquired.map(c=>c.name).join('/'),missingAcquisitions:acquiredMissing.join('/'),
      shortages:shortages.join('/'),manaThresholdEvents:manaEvents,enemyHpRemainingRatio:remainingRatio,
      ownCardAtk:actual.filter(c=>c.category==='キャラクター').reduce((s,c)=>s+c.power,0),ownCardHp:actual.filter(c=>c.category==='キャラクター').reduce((s,c)=>s+c.life,0),enemyHp,
      missingProjected:missing.join('/'),projectedBoard:projected.map(c=>`${c.slot}:${c.name}(${c.power??0}/${c.life??0})`).join('/'),
      actualBoard:actual.map(c=>`${c.slot}:${c.name}(${c.power??0}/${c.life??0})`).join('/'),remainingEnemies:battle.remainingEnemies.map(e=>`${e.name} HP${e.hp}`).join('/'),diagnosis});
  }
  return result;
}
function write({rows,meta,out}){
  const {analyze,csv,readInput}=require('./run_report'),data=analyze(rows,meta);
  fs.mkdirSync(out,{recursive:true});
  for(const key of ['summaries','stages','resources','cards','combos','archetypes','never','noncontributing'])csv(path.join(out,({summaries:'policies',never:'never_adopted'}[key]||key)+'.csv'),data[key]);
  for(const [category,file] of [['キャラクター','characters'],['エンチャント','enchants'],['指輪','rings'],['アイテム','items']])csv(path.join(out,file+'.csv'),data.cards.filter(c=>c.category===category));
  for(const p of ['lookahead','planner','all'])csv(path.join(out,(p==='all'?'all_policy':p)+'_cards.csv'),data.cards.filter(c=>c.policy===p));
  const investments=require('./planner_report').investmentRows(rows);
  csv(path.join(out,'planner_investments.csv'),investments);
  const extraction=writeTables(out);fs.writeFileSync(path.join(out,'synergy_summary.json'),JSON.stringify(extraction,null,2)+'\n');
  const r1=readInput(path.join(out,'r1_evaluation'));
  const jointFile=path.join(out,'benchmark_joint.json'),jointData=fs.existsSync(jointFile)?JSON.parse(fs.readFileSync(jointFile,'utf8')):null;
  const joint=jointData?.mainElapsedMs===meta.elapsedMs&&jointData?.r1ElapsedMs===r1.meta.elapsedMs?jointData:null;
  const sets={lookahead:rows.filter(r=>r.policy==='lookahead'),planner_r1:r1.rows.filter(r=>r.policy==='planner'),planner_r2:rows.filter(r=>r.policy==='planner')};
  const policies=Object.keys(sets),all=policies.flatMap(policy=>sets[policy].map(r=>({...r,policy})));
  const summary=policies.map(policy=>{const list=sets[policy],time=policy==='planner_r1'?r1.meta.policyElapsedMs.planner:meta.policyElapsedMs[policy==='planner_r2'?'planner':policy];
    return {policy,runs:list.length,clears:list.filter(r=>r.clear).length,clearRate:avg(list,r=>r.clear),meanWave:avg(list,r=>r.reachedWave),meanProgress:avg(list,r=>r.progress),
      secondsPerRun:time/list.length/1000,gameover:list.filter(r=>r.status==='gameover').length,timeout:list.filter(r=>r.status==='timeout').length,stalled:list.filter(r=>r.status==='stalled').length};});
  csv(path.join(out,'planner_r2_comparison.csv'),summary);
  csv(path.join(out,'planner_comparison.csv'),summary);
  csv(path.join(out,'planner_strategy_history.csv'),all.filter(r=>r.planner).flatMap(r=>r.planner.history.map((h,index)=>({policy:r.policy,seed:r.seed,index,wave:h.wave,stage:h.stage,reason:h.reason,dominant:h.dominant,completed:h.completed.join('/'),...h.weights}))));
  csv(path.join(out,'planner_boons.csv'),policies.flatMap(policy=>['stats','modifiers','damage','mana','familiars','bosses','rerolls'].map(id=>({policy,id,purchases:sets[policy].reduce((s,r)=>s+r.actions.filter(a=>a.type==='boon_purchase'&&a.id===id).length,0)}))));
  const bySeed=Object.fromEntries(policies.map(p=>[p,new Map(sets[p].map(r=>[r.seed,r]))]));
  const paired=sets.lookahead.map(a=>{const b=bySeed.planner_r1.get(a.seed),c=bySeed.planner_r2.get(a.seed);if(!b||!c)throw Error('三方針の種が揃っていない');return {seed:a.seed,
    lookaheadWave:a.reachedWave,r1Wave:b.reachedWave,r2Wave:c.reachedWave,lookaheadProgress:a.progress,r1Progress:b.progress,r2Progress:c.progress,
    lookaheadClear:a.clear,r1Clear:b.clear,r2Clear:c.clear};});
  csv(path.join(out,'planner_seed_pairs.csv'),paired);
  const first=curve(all);csv(path.join(out,'difficulty_curve.csv'),first);
  const keys=[...new Set(first.map(c=>`${c.wave}:${c.stage}:${c.type}`))].sort((a,b)=>{const x=a.split(':'),y=b.split(':');return x[0]-y[0]||x[1]-y[1];});
  const curves=new Map(first.map(c=>[`${c.policy}:${c.wave}:${c.stage}:${c.type}`,c]));
  const compareScene=(key)=>{const a=curves.get(`lookahead:${key}`),b=curves.get(`planner_r2:${key}`);return `${pct(a.winRate)}（${a.firstBattles}戦）→${pct(b.winRate)}（${b.firstBattles}戦）`;};
  const types=policies.flatMap(policy=>ARCHETYPES.map(a=>{const list=sets[policy],complete=list.filter(r=>r.synergy.completed.includes(a.id)),clears=list.filter(r=>r.clear);return {policy,type:a.id,name:a.name,
    runs:complete.length,total:list.length,share:complete.length/list.length,clearRuns:complete.filter(r=>r.clear).length,clearShare:clears.length?complete.filter(r=>r.clear).length/clears.length:null};}));
  csv(path.join(out,'planner_archetypes.csv'),types);
  const patterns=policies.flatMap(policy=>{const counts=new Map();for(const r of sets[policy]){const key=r.synergy.completed.slice().sort().join('+')||'未完成';counts.set(key,(counts.get(key)||0)+1);}return [...counts].map(([type,n])=>({policy,type,runs:n,share:n/sets[policy].length}));});
  csv(path.join(out,'planner_type_combinations.csv'),patterns);
  const combinations=require('./planner_report').pairRows(all);csv(path.join(out,'planner_combos.csv'),combinations);
  const decisions=sets.planner_r2.flatMap(actionChoices),changed=decisions.filter(c=>c.changed);
  csv(path.join(out,'horizon_choices.csv'),decisions.map(c=>({seed:c.seed,type:c.type,card:c.name||'',changed:c.changed,wave:c.target.wave,stage:c.target.stage,wall:c.target.type,distance:c.distance,
    withoutWin:c.withoutWin,chosenWin:c.chosenWin,winDelta:c.chosenWin-c.withoutWin,withoutHp:c.withoutHp,chosenHp:c.chosenHp,withoutName:c.withoutName||'',withoutAction:JSON.stringify(c.withoutAction),
    immediate:c.value.immediate,future:c.value.future,horizonBonus:c.value.horizon.bonus,total:c.value.total,reachedWave:c.reachedWave,clear:c.clear})));
  const losses=lossExamples(sets.planner_r2);csv(path.join(out,'horizon_losses.csv'),losses);
  fs.writeFileSync(path.join(out,'horizon_audits.jsonl'),sets.planner_r2.flatMap(r=>(r.horizon.audits||[]).map(a=>JSON.stringify({seed:r.seed,...a}))).join('\n')+'\n');
  const training=JSON.parse(fs.readFileSync(path.join(out,'training/search_summary.json'),'utf8')),weights=JSON.parse(fs.readFileSync(path.join(out,'training/selected_weights.json'),'utf8'));
  const initialTrainingFile=path.join(out,'training_initial/search_summary.json');
  const initialTraining=fs.existsSync(initialTrainingFile)?JSON.parse(fs.readFileSync(initialTrainingFile,'utf8')):null;
  const itemTrainingFile=path.join(out,'r2_initial/training/search_summary.json');
  const itemTraining=fs.existsSync(itemTrainingFile)?JSON.parse(fs.readFileSync(itemTrainingFile,'utf8')):null;
  const retryTrainingFile=path.join(out,'r2_before_retry_fix/training/search_summary.json');
  const retryTraining=fs.existsSync(retryTrainingFile)?JSON.parse(fs.readFileSync(retryTrainingFile,'utf8')):null;
  const retryEvaluationFile=path.join(out,'r2_before_retry_fix/comparison.json');
  const retryEvaluation=fs.existsSync(retryEvaluationFile)?JSON.parse(fs.readFileSync(retryEvaluationFile,'utf8')):null;
  const priorEvaluationFile=path.join(out,'r2_initial/comparison.json');
  const priorEvaluation=fs.existsSync(priorEvaluationFile)?JSON.parse(fs.readFileSync(priorEvaluationFile,'utf8')):null;
  const old=readInput(path.join(__dirname,'out_planner_r1'));
  let md='# 周回ボット：lookahead → planner（第1段）→ planner（第2段）\n\n';
  md+=`学習種${training.trainingSeedStart}〜${training.trainingSeedEnd}とは重ならない種${Math.min(...rows.map(r=>r.seed))}〜${Math.max(...rows.map(r=>r.seed))}を各200周。第1段も同じ評価種で再実行した。初回旅程・祝福の座あり、魔導店は3枚との無料交換だけ、カード売却なし、祭壇の指輪取得は本体どおり必須（本体が認める枚数不足時の例外あり）。${meta.trial?'現在のPvE試験実装（合体停止・交換店の道具売却なし）で再実行した。戦闘コア・内蔵シートは維持する。':'js/**・index.html・内蔵シートは編集していない。'}前回out/の32ファイルはout_planner_r1/にバイト一致で保存した。\n\n`;
  if(meta.towerBoon?.priceBasis==='perBlessing')md+='祝福の価格は祝福ごとの購入回数で200G→500G→1000G→以後+1000G。未購入の祝福は200Gを維持する。全方針で本体towerBoonChoicePriceを使い、各候補の購入後に80Gを残せるか判定する。価格規則の変更を含む現在の本体で再生成しており、シートと戦闘コアは変更していない。\n\n';
  md+=table(['方針','周回','クリア率','平均到達St','平均進行 St+マス/100','秒/周','GO / timeout / stalled'],summary.map(s=>[names[s.policy],s.runs,`${s.clears}/${s.runs} (${pct(s.clearRate)})`,num(s.meanWave),num(s.meanProgress),num(s.secondsPerRun),`${s.gameover} / ${s.timeout} / ${s.stalled}`]));
  const baseline=summary[0],now=summary[2],progressed=paired.filter(p=>p.r2Progress>p.lookaheadProgress).length,regressed=paired.filter(p=>p.r2Progress<p.lookaheadProgress).length;
  md+=`lookaheadに対して進行が伸びた${progressed}種、短くなった${regressed}種、同じ${paired.length-progressed-regressed}種。平均到達St差${num(now.meanWave-baseline.meanWave)}、クリア率差${pct(now.clearRate-baseline.clearRate)}。200周で観測した差であり、希少なクリアや後半の少数例から一般的な強さは断定しない。\n\n`;
  if(now.meanWave>baseline.meanWave&&now.clearRate<baseline.clearRate)md+='第2段は平均到達ステージを伸ばした一方、クリア率はlookaheadを下回った。到達の改善を、クリアまで含む全体の改善とは扱わない。\n\n';
  md+=`初戦勝率はSt1エリートが${compareScene('1:4:elite')}、St2エリートが${compareScene('2:3:elite')}。St3エリートは${compareScene('3:3:elite')}で、ここが引き続き大きな壁となった。後半の母数と生存者は方針で異なるため、率だけで同じ敵に強くなったとは断定しない。\n\n`;
  md+=`所要時間は各ランの壁時計時間の合計÷周回数。${joint?'各4ワーカーの2バッチを同時実行（最大8ワーカー）':`${meta.workers||1}プロセス実行`}の競合を含み、単独実行のCPU時間ではない。主比較400周の全体壁時計は${num(meta.elapsedMs/1000)}秒、第1段200周は${num(r1.meta.elapsedMs/1000)}秒。${joint?`両方の完了まで${num(joint.wallElapsedMs/1000)}秒。`:''}時間をランJSONLから分離し、同じ種での完全一致を守る。\n\n`;
  const timingFile=path.join(out,'planner_timing.json');
  if(fs.existsSync(timingFile)){
    const timing=JSON.parse(fs.readFileSync(timingFile,'utf8'));
    if(timing.kind==='timing_only_not_evaluation'&&Object.entries(timing.toolHashes).every(([k,v])=>meta.toolHashes[k]===v)&&Object.entries(timing.sourceHashes).every(([k,v])=>meta.sourceHashes[k]===v))md+=`単独実行の参考測定は学習種${timing.seed}の1周で${num(timing.secondsPerRun)}秒（St${timing.reachedWave}で${timing.status}）。この1例は平均時間の代表値ではなく、評価200種にも含めない。元の計測とハッシュはplanner_timing.json。\n\n`;
  }
  md+=table(['方針','次戦コア試行/周','山場コア試行/周','山場評価の平均候補数/判断'],policies.map(p=>{const list=sets[p];return [names[p],num(avg(list,r=>r.lookahead.trials)),num(avg(list,r=>r.horizon?.stats.trials||0)),p==='planner_r2'?num(list.reduce((s,r)=>s+r.horizon.stats.candidates,0)/list.reduce((s,r)=>s+r.horizon.stats.decisions,0)):'—'];}));
  md+='前回の種1〜200での記録（今回の独立評価とは種が異なる）：\n\n'+table(['方針','周回','クリア率','平均到達St'],['lookahead','planner'].map(policy=>{const list=old.rows.filter(r=>r.policy===policy);return [policy==='planner'?'planner（第1段）':policy,list.length,pct(avg(list,r=>r.clear)),num(avg(list,r=>r.reachedWave))];}));
  md+='## 山場の先読みと評価式\n\n';
  md+=`次戦は従来どおり独立${meta.lookahead.samples}例で実コアを呼ぶ。山場は本体の旅程から次のエリート/ボスを探し、未戦闘なら本体generateEliteEnemies/generateEnemiesで別系列「planner-wall」の${meta.horizon.enemies}例を生成する。再戦では両方とも保存済みの既知の敵を使い、戦闘乱数だけを別系列にする。敵の内容が変わればサンプルとコアのキャッシュも切り替える。予測全体をGと提示のコピーで実行し、ランのG・乱数・提示を復元する。実戦の未提示の報酬や未戦闘の敵の未来の抽選を先取りしない。\n\n`;
  md+=`次戦点＝${meta.planner.win}×勝率＋${meta.planner.hp}×log(1+残HP/max(40,敵HP))＋${meta.planner.damage}×log(1+与ダメージ/max(40,敵HP))。ライフ1の勝率係数は${meta.planner.emergencyWin}。総合点＝next×次戦点＋fit×既存相乗＋option×入手見込み＋focus×型への近さ＋祝福の将来価値＋山場点。山場点＝[wall×山場勝率＋wallHp×log(1+山場残HP/max(40,敵HP))＋wallProgress×敵HP減少率] / (1+distanceDecay×山場までの通常戦数)。近い壁を重くする。決まったnext=${meta.planner.next}、wall=${meta.planner.wall}、wallHp=${meta.planner.wallHp}、wallProgress=${meta.planner.wallProgress}、fit=${meta.planner.fit}、option=${meta.planner.option}、focus=${meta.planner.focus}、prior=${meta.planner.prior}、distanceDecay=${meta.planner.distanceDecay}。全敗で味方HPが0の候補にも差が付くよう、残敵HP/敵開始HPから求めた減少率を0〜1に丸めて補助点を付ける。\n\n`;
  md+=`候補は次戦点の上位${meta.horizon.candidates}件に絞り、役割評価までで首位の候補と見送り（任意の選択時）も残すため最大${meta.horizon.candidates+2}件。報酬・無料交換・祭壇の3枚の差し出しと指輪・祝福・合法スワップ・再抽選前の品質判定が共通の評価を使う。指輪必須時は見送りを作らない。\n\n`;
  md+=`山場までの通常戦勝利で得る5択から1枚、未来に街があれば交換3択を機会とする。エリート/ボスの後に通常報酬があるという仮定は置かない。各候補について、独立した${meta.horizon.futures}種類の提示列を実際のdrawRewardsで作る。レアリティ・グレード・在庫・封印/高レア上限・キャラ/強化保証・祝福を本体が処理する。提示内からsynergyの役割と既存の型に合うカードを、共通の合法配置評価で1枚ずつ選ぶ。配置改善もpolicies.arrangeの同じ合法スワップ探索を${meta.horizon.arrangePasses}巡だけ使い、矢印は変更しない。山場直前には架空の取得を足さない。\n\n`;
  md+=`将来カードなしを${pct(meta.horizon.missWeight)}、2種類の提示列をそれぞれ${pct((1-meta.horizon.missWeight)/meta.horizon.futures)}として山場の勝率と残HPを平均する。これは未来の提示から選べる範囲の近似で、途中戦闘の敗北・永久強化・死亡損失までは展開しない。現時点の資源・配置は各候補を本体の操作で適用してから試す。盤面/装備が同じ試行はキャッシュし、時間はランJSONから分離する。\n\n`;
  md+='道具は未来カードを足す前に実ランと同じ方針で使う。途中の通常戦を越える時に本体_prepareStartingBattleItemsを通すので、次戦限りの隕石/沈黙を遠い山場へ持ち越さない。巨大化などの永続変更は取得済みの本体へ適用する。山場が次戦なら一時効果も試す。想定のqueuedItemsと永久強化の対象を自己テストで検査した。\n\n';
  md+='## 重みの自動探索\n\n';
  if(priorEvaluation){
    const a=priorEvaluation.summaries.find(s=>s.policy==='lookahead'),b=priorEvaluation.summaries.find(s=>s.policy==='planner_r2_before_item_fix');
    md+=`最初の種${priorEvaluation.seeds.join('〜')}の比較は、道具の寿命の不具合を発見した診断用データとしてr2_initial/へ保存した。そこでlookahead平均到達${num(a.meanWave)}、修正前の第2段${num(b.meanWave)}だったが、最終版の独立評価には混ぜない。予備のJSONLはgzipで保存し、ARCHIVE_TRAINING.jsonに元データのSHA-256を記録した。前回のout_planner_r1/は未圧縮のまま32ファイルを保存する。\n\n`;
  }
  if(initialTraining)md+=`予備探索${initialTraining.totalRuns}周をtraining_initial/、道具修正前${itemTraining?.totalRuns||0}周をr2_initial/training/、再戦敵の修正前${retryTraining?.totalRuns||0}周をr2_before_retry_fix/training/へ保存した。同じ学習種だけで最後に${training.totalRuns}周の探索を実行した（計${initialTraining.totalRuns+(itemTraining?.totalRuns||0)+(retryTraining?.totalRuns||0)+training.totalRuns}周）。第1段の学習種40周の比較も予備フォルダに残す。以下は最終モデル内の探索。\n\n`;
  if(retryEvaluation)md+=`種${retryEvaluation.seeds.join('〜')}では平均到達2.450→2.440、クリア4→0で改善せず、r2_before_retry_fix/へ隔離した。再戦で既知の敵への勝率を下げた配置変更が${retryEvaluation.conflicts.length}件あり、山場側だけ別の敵を使っていた不整合を修正した。既知の敵と敵データを含むキャッシュへ切り替え、最終比較には新たな未使用の種4001〜4200を使う。\n\n`;
  md+=`8候補を同じ10種、上位3候補を同じ20種、上位2候補を同じ40種で比較した。既存結果を再利用し、合計${training.totalRuns}周。目的値はmean(到達St+マス/100)+2×クリア率。全40種の目的値を最大にした「${training.selected}」を採用し、その後の評価200種で重みを選び直していない。探索経過の全係数と成績はtraining/weight_search.csv、種ごとの成績は各候補の*_training.json、確定値はplanner_weights.jsonとtraining/selected_weights.jsonに保存。\n\n`;
  md+=table(['候補','種数','next / wall / wallHp / wallProgress','fit / option / focus / prior','距離減衰','クリア','平均到達St','目的値','秒/周'],training.history.map(h=>[h.id,h.runs,`${h.next} / ${h.wall} / ${h.wallHp} / ${h.wallProgress}`,`${h.fit} / ${h.option} / ${h.focus} / ${h.prior}`,h.distanceDecay,h.clears,num(h.meanWave),num(h.objective),num(h.secondsPerRun)]));
  if(training.history.every(h=>h.clears===0))md+='最終探索は全候補・全段階でクリア0件だった。そのため目的値の「2×クリア率」は候補の順位に影響せず、実際の選択は到達とマス進行だけで決まった。クリアを狙う重みをこの40種で選別できていない点は、学習結果の限界として残る。\n\n';
  md+='## 山場で実際に変わった選択\n\n';
  md+=`実行した選択・配置のうち、山場を加える前の首位から変わった記録は${changed.length}件。山場勝率が上がった${changed.filter(c=>c.chosenWin>c.withoutWin).length}件、勝率同値で残HPや目先との合算で変わったものも含む。以下は同じ敵・同じ将来提示系列による反実仮想のコア比較で、代替選択をしたラン全体の実測結果ではない。全件はhorizon_choices.csv、盤面と将来カードを含む例はhorizon_audits.jsonl。\n\n`;
  const examples=changed.filter(c=>c.distance>0&&c.chosenWin>c.withoutWin).sort((a,b)=>(b.chosenWin-b.withoutWin)-(a.chosenWin-a.withoutWin)).slice(0,8);
  md+=table(['種','選択 ← 山場なしなら','山場 / 残り通常戦','予測勝率 山場なしの選択→採用','予測残HP','実際の山場初戦'],examples.map(c=>{const r=bySeed.planner_r2.get(c.seed),actual=r.battles.find(b=>!b.retry&&b.wave===c.target.wave&&b.stage===c.target.stage);return [c.seed,`${c.type} ${c.name||'配置変更'} ← ${c.withoutName||JSON.stringify(c.withoutAction)}`,`${c.target.wave}:${c.target.stage}:${c.target.type} / ${c.distance}`,`${pct(c.withoutWin)}→${pct(c.chosenWin)}`,`${num(c.withoutHp)}→${num(c.chosenHp)}`,actual?(actual.outcome==='p1'?'勝利':actual.outcome==='p2'?'敗北':'引分'):'未到達'];}));
  md+='## 目先を下げた投資と、その後の組合せ\n\n';
  md+=`第2段で、次戦の勝率→残HP→与ダメージの比較でも次戦連続点でも劣り、役割の将来点が高い候補を実際に取った記録は${investments.length}件。そのうち取得時に無かった相手を後で得て実戦で同時出撃/接続したのは${investments.filter(x=>x.matchedLater).length}件、既存の相手や再配置も含めて成立したのは${investments.filter(x=>x.matchedInBattle).length}件。山場点も併用するため、役割の将来点だけが採用の原因とは断定しない。成立は役割と接続の照合で、全効果の発動量を保証しない。全件はplanner_investments.csv。\n\n`;
  const investmentExamples=investments.filter(x=>x.card!==x.immediateAlternative).sort((a,b)=>Number(b.matchedLater)-Number(a.matchedLater)||Number(b.matchedInBattle)-Number(a.matchedInBattle)||a.seed-b.seed).slice(0,6);
  md+=table(['種 / St:マス','取得 ← 次戦なら','次戦点差','役割の将来点差','その後'],investmentExamples.map(x=>[`${x.seed} / ${x.wave}:${x.stage}`,`${x.card} ← ${x.immediateAlternative}`,num(x.immediateDelta),num(x.futureDelta),`${x.status}${x.partner?`：${x.partner} (${x.token})、St${x.firstMatch}`:''}`]));
  md+='## 難易度曲線：各場面の初戦勝率\n\n同じ評価種の各マス初戦だけ。再戦・未到達は母数に入れない。後半の生存者は方針ごとに異なり、操作や再抽選が変わるため本体の実戦の敵も完全一致ではない。CSVには開始時の敵ATK/HPと盤面上のキャラ本体ATK/HP（予備込み、接続や開戦効果前）も記録した。\n\n';
  md+=table(['St:マス:種別',...policies.map(p=>`${names[p]} 初戦数 / 勝率`)],keys.map(key=>[key,...policies.map(p=>{const c=curves.get(`${p}:${key}`);return c?`${c.firstBattles} / ${pct(c.winRate)}`:'0 / —';})]));
  md+='## 最終盤面の型の分布\n\n出撃枠の本体・接続・装備にある別2枚の供給/需要が強度0.65以上で噛み合う静的な完成判定。封印の解放、十分な供給量、発動までの生存、実コアでの全効果の発動は保証しない。複数同時成立するため比率の合計は100%を超える。最終祭壇の還魂後に型が崩れた場合も、終了盤面のまま数える。\n\n';
  md+=table(['型',...policies.map(p=>names[p])],ARCHETYPES.map(a=>[a.name,...policies.map(p=>{const t=types.find(t=>t.policy===p&&t.type===a.id);return `${t.runs}/${t.total} (${pct(t.share)})`;})]));
  md+=table(['方針','型の種類 / 9','併存パターン数','未完成比率','クリア盤面数'],policies.map(p=>[names[p],types.filter(t=>t.policy===p&&t.runs).length,patterns.filter(t=>t.policy===p).length,pct(patterns.find(t=>t.policy===p&&t.type==='未完成')?.share||0),summary.find(s=>s.policy===p).clears]));
  md+='クリア内の型比率はplanner_archetypes.csvのclearShare。0クリアなら空欄。よく組まれた組合せはplanner_combos.csv（1組は1ラン1回、実戦開始時に有効な役割照合）。\n\n';
  md+=table(['第2段の供給側','使用側','役割','周回 / 比率'],combinations.filter(c=>c.policy==='planner_r2'&&c.type!=='color').slice(0,12).map(c=>[c.producer,c.consumer,c.token,`${c.runs} / ${pct(c.share)}`]));
  md+='## 山場で負ける時の診断\n\n不足の候補は役割抽出上の推定とコアの観測値。指輪などの供給は戦闘開始時の有効な役割ペアも照合する。manaThresholdEventsは両陣営合計の閾値発動イベント数で、味方だけの稼働量ではない。\n\n';
  md+=`将来カードを想定した実行選択の後で、同じ山場の初戦に勝てなかった（敗北・引分）${losses.length}例をhorizon_losses.csvに保存した。想定盤面・実際の盤面・想定した入手・実盤面に無いカード・残敵を照合する。将来の提示が外れたことと、候補の選び方や配置が違うことの両方を含むため、未取得カードだけから原因を断定しない。\n\n`;
  md+='追加取得なしの枝でも勝率75%以上と予測した敗退は別分類にする。この場合は想定カードの未取得だけでは説明できず、敵2例・戦闘乱数の少なさと途中の実選択/損失による差を含む。ここでの勝率は少数サンプル上の値で、校正済みの成功確率ではない。\n\n';
  const counts=new Map();for(const l of losses)counts.set(l.diagnosis,(counts.get(l.diagnosis)||0)+1);
  md+=table(['診断の分類','件数'],[...counts]);
  md+=table(['種 / 山場','平均予測 / 将来枝の最良 / 追加なし','想定の取得','実盤面に無い想定カード','足りない要素 / 残った敵'],losses.slice().sort((a,b)=>b.predictedWin-a.predictedWin).slice(0,6).map(l=>[`${l.seed} / ${l.wave}:${l.stage}:${l.type}`,`${pct(l.predictedWin)} / ${pct(l.bestFutureWin)} / ${pct(l.missWin)}`,l.assumedAcquisitions,l.missingProjected,`${l.shortages} / ${l.remainingEnemies}`]));
  if(now.meanWave<=baseline.meanWave)md+='平均到達Stはlookaheadを上回っていない。ボット側の追加診断と修正の記録はR2_DIAGNOSIS.mdを参照。\n\n';
  const diagnostic='# 第2段の診断とボット側の修正\n\n'+
    '評価用の種を使う前の試運転と学習で、想定盤面でも全敗する壁を確認した。勝率と味方残HPが共に0だと山場の係数を増やしても候補に差が付かない。bot_sandbox.trialでコアの残敵HPを計測し、planner_horizonの補助点wallProgressで壁への進み具合を評価するよう修正した。既存の次戦lookaheadと第1段の採点は維持する。\n\n'+
    '第1段の静的な入手見込みにはエリート/ボス後の通常報酬も含まれていた。本体はこの2種で通常5択を出さない。第2段は次の戦闘から通常戦だけを数え、勝利後のstageで確率を計算する。例：St2マス1からは報酬20回という旧近似を15回へ修正、交換はどちらも3回。自己テストで残回数を固定検査した。第1段の再比較は当時の計算を保存する。\n\n'+
    '道具の寿命も修正した。最初の種2001〜2200の比較を精査したところ、次戦だけの隕石/沈黙が数戦先の山場へ残り、巨大化の対象も未来の本体へ変わる想定になっていた。道具は未来の取得前に使い、途中の戦闘で本体の準備経路を通して一時効果を消費する。山場が次戦の場合の効果は残す。専用の回帰検査を追加した。\n\n'+
    '再戦の敵入力も修正した。種3001〜3200で到達が改善せず、既知の敵なら勝率100%と見積もった候補を捨て、山場側の別の敵に勝てる配置を選んだ実例を確認した。敵が既知なら山場も同じ保存済みの敵を使い、戦闘乱数だけを独立させる。サンプルのキャッシュは既知の敵を鍵へ追加し、コアのキャッシュも種だけでなく敵全データを含めた。専用の検査で敵の切替・キャッシュ更新を確認した。\n\n'+
    '同じ学習40種で8候補から重みを再探索した。探索はtraining_initial/、r2_initial/training/、r2_before_retry_fix/training/、最後のtraining/へ保存する。2001〜2200と3001〜3200は診断に使ったので最終比較には混ぜず、新たな未使用の種4001〜4200を重みの確定後に使う。\n\n'+
    `最終の評価は平均到達St ${num(baseline.meanWave)}→${num(now.meanWave)}、クリア率 ${pct(baseline.clearRate)}→${pct(now.clearRate)}。\n\n`+
    '追加取得なしの枝でも75%以上と予測して負けた例は、想定カード未取得の分類から分ける。敵2例のサンプル誤差や途中の実選択・死亡・永久強化を含む差であり、将来カードが無かったことだけを敗因にはしない。\n\n'+
    table(['山場での敗退の分類','件数'],[...counts])+table(['種 / 山場','想定盤面','実際の盤面','不足の観測'],losses.slice().sort((a,b)=>b.predictedWin-a.predictedWin).slice(0,4).map(l=>[`${l.seed} / ${l.wave}:${l.stage}`,l.projectedBoard,l.actualBoard,`${l.missingProjected} / ${l.shortages}`]))+
    '将来の提示2通りでは入手分布を十分に覆えず、接続の矢印・別カードの選択・道具・永久強化・途中の死亡に差が残る。追加カードなし35%を併用し、全敗時の補助点を入れたが、完全なランの再演ではない。これらを含むモデル精度の限界と、現在の候補探索で壁を越せる編成を提示できない不足を区別する。カードや敵の本体数値は変更しない。\n';
  fs.writeFileSync(path.join(out,'R2_DIAGNOSIS.md'),diagnostic);
  md+='## 役割の抽出・検査・未確認\n\n';
  md+=`抽出対象${extraction.cards}枚、効果文あり${extraction.withEffect}枚。未対応を含む${extraction.unknownCards}枚・${extraction.unknownClauses}文節をsynergy_unknown.csvへ残した。主要な活性化・マナ生成・Nマナ毎・解放・死亡/召喚の分類は自己テストで検査する。\n\n`+table(['カード','未対応の文節'],extraction.examples.map(e=>[e.name,e.text]));
  const testFile=path.join(out,'SELFTEST.json');if(fs.existsSync(testFile)){const t=JSON.parse(fs.readFileSync(testFile,'utf8'));md+=`run_bot_selftest.js：${t.passed?'合格':'不合格'}、${t.checks.length}項目。\n\n`+t.checks.map(c=>'- '+c).join('\n')+'\n\n';}else md+='自己テストはSELFTEST.jsonの生成後に報告を再生成する。\n\n';
  md+='既存のnode tools/balance_sim/run.js 5、node tools/parity/tower_boon_check.js、新規・変更JSのnode --checkの結果はVALIDATION.mdに記録。画面・音・file://実機・セーブ復元・オンライン対戦の実機は未確認。未来の永久強化/死亡損失/道具購入/将来の指輪交換を含む完全な数手先のラン再演、実際の発動量での型判定、40種を超える学習、別の大量評価種での再現は未確認。\n\n';
  md+='型はマナ、血と解放、召喚と死亡、色、毒、結界、負傷、攻撃回数、キーワード数の9種。現在の成立度log(1+役割ペア強度)を温度max(0.5,2.5-ステージ×0.5)のsoftmaxで正規化し、前の重み55%と新45%で更新する。序盤は広く後半は寄せる。静的な入手見込みは残りの報酬/交換回数と本体のレアリティ/グレード分布から1−積(引けない確率)で近似する。山場の将来提示はこの独立枠近似ではなく実抽選を使う。トリプルの専用収集加点は無効。\n\n';
  md+='確定した係数（再実行時はこのファイルを読む）：\n\n```json\n'+JSON.stringify(weights,null,2)+'\n```\n\n';
  md+='## 再実行\n\n```sh\nnode tools/balance_sim/planner_tune.js --workers 4\nnode tools/balance_sim/run_bot.js --runs 200 --policy lookahead,planner --seed 4001 --workers 4 --out tools/balance_sim/out\nnode tools/balance_sim/run_bot.js --runs 200 --policy planner --planner-stage r1 --seed 4001 --workers 4 --out tools/balance_sim/out/r1_evaluation\nnode tools/balance_sim/run_bot_selftest.js --input tools/balance_sim/out --variant tools/balance_sim/out/r1_evaluation\nnode tools/balance_sim/run_report.js --input tools/balance_sim/out\nVB_REPORT_PATH=/tmp/vb-balance-report.md node tools/balance_sim/run.js 5\nnode tools/parity/tower_boon_check.js\n```\n';
  fs.writeFileSync(path.join(out,'RUN_REPORT.md'),md);
  return {rows:rows.length,summary,changed:changed.length,losses:losses.length,extraction};
}
module.exports={write,lossExamples};
