'use strict';
const fs=require('node:fs'),path=require('node:path');
const avg=(xs,f)=>xs.length?xs.reduce((s,x)=>s+f(x),0)/xs.length:null;
const pct=n=>n==null?'—':(n*100).toFixed(1)+'%',num=n=>n==null?'—':n.toFixed(2);
const group=(xs,key)=>{const m=new Map();for(const x of xs){const k=key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x);}return m;};
const table=(heads,rows)=>`|${heads.join('|')}|\n|${heads.map(()=>'---').join('|')}|\n`+rows.map(row=>'|'+row.map(x=>String(x??'—').replace(/\|/g,'／').replace(/\n/g,' ')).join('|')+'|').join('\n')+'\n\n';
const runKey=r=>`${r.policy}:${r.seed}:${r.storyCycle}`;
function curve(rows){
  const observations=[];
  for(const run of rows){const seen=new Set();for(const b of run.battles){const key=`${b.wave}:${b.stage}:${b.type}`;if(b.retry||seen.has(key))continue;seen.add(key);
    const own=b.board.filter(c=>c?.category==='キャラクター');
    observations.push({policy:run.policy,wave:b.wave,stage:b.stage,type:b.type,win:b.outcome==='p1'?1:0,
      enemyAtk:b.enemies.reduce((s,c)=>s+c.atk,0),enemyHp:b.enemies.reduce((s,c)=>s+c.hp,0),ownAtk:own.reduce((s,c)=>s+c.power,0),ownHp:own.reduce((s,c)=>s+c.life,0)});
  }}
  return [...group(observations,b=>`${b.policy}:${b.wave}:${b.stage}:${b.type}`)].map(([,list])=>{
    const b=list[0],enemyAtk=avg(list,x=>x.enemyAtk),enemyHp=avg(list,x=>x.enemyHp),ownAtk=avg(list,x=>x.ownAtk),ownHp=avg(list,x=>x.ownHp);
    return {policy:b.policy,wave:b.wave,stage:b.stage,type:b.type,firstBattles:list.length,winRate:avg(list,x=>x.win),enemyAtk,enemyHp,enemyTotal:enemyAtk+enemyHp,ownAtk,ownHp,ownTotal:ownAtk+ownHp};
  }).sort((a,b)=>a.policy.localeCompare(b.policy)||a.wave-b.wave||a.stage-b.stage);
}
function build(rows,meta,baseline,baselineMeta,out,csv){
  const config=meta.towerBoon.config,ids=config.blessings.map(b=>b.id),name=id=>`祝福${ids.indexOf(id)+1}(${id})`,policies=[...new Set(rows.map(r=>r.policy))];
  const baseMap=new Map(baseline.map(r=>[runKey(r),r])),pairs=rows.map(r=>({before:baseMap.get(runKey(r)),after:r})).filter(p=>p.before),pairedBase=pairs.map(p=>p.before);
  const beforeAfter=policies.map(policy=>{
    const old=baseline.filter(r=>r.policy===policy),now=rows.filter(r=>r.policy===policy),matched=pairs.filter(p=>p.after.policy===policy);
    return {policy,beforeRuns:old.length,afterRuns:now.length,beforeClearRate:avg(old,r=>+r.clear),afterClearRate:avg(now,r=>+r.clear),beforeMeanWave:avg(old,r=>r.reachedWave),afterMeanWave:avg(now,r=>r.reachedWave),beforeMeanProgress:avg(old,r=>r.progress),afterMeanProgress:avg(now,r=>r.progress),beforeFinalGold:avg(old,r=>r.finalGold),afterFinalGold:avg(now,r=>r.finalGold),pairs:matched.length,pairedBeforeClearRate:avg(matched,p=>+p.before.clear),pairedAfterClearRate:avg(matched,p=>+p.after.clear),pairedBeforeWave:avg(matched,p=>p.before.reachedWave),pairedAfterWave:avg(matched,p=>p.after.reachedWave),pairedBeforeGold:avg(matched,p=>p.before.finalGold),pairedAfterGold:avg(matched,p=>p.after.finalGold)};
  });
  csv(path.join(out,'boon_before_after.csv'),beforeAfter);
  const purchases=[],orders=[],sequences=[],usage=[];
  for(const [policy,runs] of [['all',rows],...policies.map(p=>[p,rows.filter(r=>r.policy===p)])]){
    const actions=runs.flatMap(r=>r.actions.filter(a=>a.type==='boon_purchase'));
    for(const id of ids){const takes=actions.filter(a=>a.id===id),adopted=runs.filter(r=>r.actions.some(a=>a.type==='boon_purchase'&&a.id===id));
      purchases.push({policy,id,purchases:takes.length,runs:adopted.length,clearRate:avg(adopted,r=>+r.clear),meanWave:avg(adopted,r=>r.reachedWave),meanProgress:avg(adopted,r=>r.progress),meanFinalGold:avg(adopted,r=>r.finalGold),meanPaid:avg(takes,a=>a.price),meanOrder:avg(takes,a=>a.purchaseNumber),sample:adopted.length<20?'母数不足':'参考値'});
    }
    for(const [key,list] of group(actions,a=>`${a.purchaseNumber}:${a.id}`)){const [position,id]=key.split(':'),total=actions.filter(a=>a.purchaseNumber===Number(position)).length;orders.push({policy,position:Number(position),id,count:list.length,share:list.length/total});}
    const bought=runs.filter(r=>r.actions.some(a=>a.type==='boon_purchase'));
    for(const [sequence,list] of group(bought,r=>r.actions.filter(a=>a.type==='boon_purchase').map(a=>a.id).join(' → ')))sequences.push({policy,sequence,runs:list.length,clearRate:avg(list,r=>+r.clear),meanWave:avg(list,r=>r.reachedWave),meanFinalGold:avg(list,r=>r.finalGold)});
    const seats=runs.flatMap(r=>r.actions.filter(a=>a.type==='boon_visit'));
    usage.push({policy,runs:runs.length,visits:seats.length,insufficientAtEntry:seats.filter(a=>a.gold-a.nextPrice<a.reserve).length,purchases:actions.length,laterPurchases:actions.filter(a=>a.purchaseNumber>1).length,rerolls:runs.reduce((s,r)=>s+r.actions.filter(a=>a.type==='boon_reroll').length,0),bossOffers:runs.reduce((s,r)=>s+r.offers.filter(o=>o.card.towerBoonBoss).length,0),blessedAcquisitions:runs.reduce((s,r)=>s+r.acquisitions.filter(a=>a.card.boon).length,0)});
  }
  csv(path.join(out,'boon_purchases.csv'),purchases);csv(path.join(out,'boon_orders.csv'),orders);csv(path.join(out,'boon_sequences.csv'),sequences);csv(path.join(out,'boon_usage.csv'),usage);
  const oldCurve=curve(pairedBase),newCurve=curve(pairs.map(p=>p.after)),key=c=>`${c.policy}:${c.wave}:${c.stage}:${c.type}`,oldMap=new Map(oldCurve.map(c=>[key(c),c])),newMap=new Map(newCurve.map(c=>[key(c),c]));
  const cells=[...new Set([...oldMap.keys(),...newMap.keys()])].map(k=>{
    const a=oldMap.get(k),b=newMap.get(k),c=a||b;return {policy:c.policy,wave:c.wave,stage:c.stage,type:c.type,beforeN:a?.firstBattles||0,afterN:b?.firstBattles||0,beforeWinRate:a?.winRate??null,afterWinRate:b?.winRate??null,beforeEnemyAtk:a?.enemyAtk??null,afterEnemyAtk:b?.enemyAtk??null,beforeEnemyHp:a?.enemyHp??null,afterEnemyHp:b?.enemyHp??null,beforeEnemyTotal:a?.enemyTotal??null,afterEnemyTotal:b?.enemyTotal??null,beforeOwnAtk:a?.ownAtk??null,afterOwnAtk:b?.ownAtk??null,beforeOwnHp:a?.ownHp??null,afterOwnHp:b?.ownHp??null,beforeOwnTotal:a?.ownTotal??null,afterOwnTotal:b?.ownTotal??null};
  }).sort((a,b)=>a.policy.localeCompare(b.policy)||a.wave-b.wave||a.stage-b.stage);
  csv(path.join(out,'difficulty_curve.csv'),cells);
  const exchange=meta.botVersion>=4;
  let md=exchange?'## 祝福の利用と難易度曲線：変更前→変更後\n\n':'## 祝福の座：なし→あり\n\n';
  md+=exchange?'両版とも祝福の座あり。変更前はout_before_shop_exchange/、変更後はout/。次の表と難易度曲線は共通seedで比較する。\n\n':'なしはout_no_boon/へ保存した前回の全記録。ありは今回の記録。周回数が異なるlookaheadについて、全記録の表と共通seedだけの表を分ける。\n\n';
  const lookRuns=rows.filter(r=>r.policy==='lookahead');
  if(!exchange&&lookRuns.length&&lookRuns.length<200)md+=`lookaheadは${lookRuns.length}周。第4段の祝福あり試走はクリア例で約42秒/周だったため、計算量を考慮して100周へ制限した。予測の表示フレーム省略前後で試走2周の全JSONが一致することも確認した。\n\n`;
  const shopFile=path.join(out,'boon_shop_probe.json');
  if(fs.existsSync(shopFile)){const probe=JSON.parse(fs.readFileSync(shopFile,'utf8'));if(probe.knownIssue)md+=`### 本体側の未解決：祝福6の魔導店提示\n\n${probe.knownIssue} 固定seedの${probe.samples}店舗で生成${probe.generated}枚・提示配列${probe.offered}枚。報酬・行商人の出現は自然周回で確認した。js/**を編集しない条件を守り、本体のフィルタを上書きして出現させる変更は行っていない。再現データはboon_shop_probe.json。\n\n`;}
  md+=table(['方針','周回 なし→あり','クリア率 なし→あり','平均到達St なし→あり','終了G なし→あり'],beforeAfter.map(r=>[r.policy,`${r.beforeRuns}→${r.afterRuns}`,`${pct(r.beforeClearRate)}→${pct(r.afterClearRate)}`,`${num(r.beforeMeanWave)}→${num(r.afterMeanWave)}`,`${num(r.beforeFinalGold)}→${num(r.afterFinalGold)}`]));
  md+='### 共通seedだけの比較\n\n'+table(['方針','組数','クリア率 なし→あり','平均到達St なし→あり','終了G なし→あり'],beforeAfter.map(r=>[r.policy,r.pairs,`${pct(r.pairedBeforeClearRate)}→${pct(r.pairedAfterClearRate)}`,`${num(r.pairedBeforeWave)}→${num(r.pairedAfterWave)}`,`${num(r.pairedBeforeGold)}→${num(r.pairedAfterGold)}`]));
  const changed=Object.entries(baselineMeta.sourceHashes||{}).filter(([f,h])=>meta.sourceHashes?.[f]!==h).map(([f])=>f);
  if(changed.length)md+=`前回から本体の版が変わったファイル: ${changed.join('、')}。内蔵シートは${baselineMeta.sourceHashes?.['js/data/local_xlsx_data.js']===meta.sourceHashes?.['js/data/local_xlsx_data.js']?'同じ':'異なる'}。${exchange?'この比較には交換店・必須還魂と、それに伴う資金・抽選系列の差を含む。':'この比較には取り込みによる版差と、購入・再抽選で変わる資金・抽選系列も含む。'}祝福単体の戦闘寄与はfixed/FIXED_REPORT.mdを参照。\n\n`;
  md+='### 選択方針と残す額\n\n'+table(['方針','祝福の優先順位/評価','残すG','1訪問の購入上限'],policies.map(policy=>{const s=meta.towerBoon.settings[policy];return [policy,s.priority?s.priority.map(name).join(' → '):'固定盤面の4場面平均勝率差。既購入数+1で割る。6は最大値×0.25（撃破済みボスがある時）、7は最大値×0.5。',s.reserve,s.maxPerVisit];}));
  md+=`基本方針は優先順位の点数を既購入数+1で割り、重ね買いと別祝福を比較する。同じ訪問で提示された3択を維持し、${meta.towerBoon.priceBasis==='perBlessing'?'価格は本体towerBoonChoicePriceから祝福ごとに読む。未購入は200G、同じ祝福は500G→1000G→以後+1000G。各候補の価格で80Gを残せるか判定する':'価格は当時の合計購入回数に従う'}。次戦が無い終点では購入しない。施設は他の訪問施設の後。既存カードは強化せず、その後の生成カードだけ本体が祝福する。\n\n`;
  md+=`報酬再抽選は本体の可否・残回数を守る。基本方針は最大配置改善点が${meta.towerBoon.limits.weakGain}未満、lookaheadは最良取得でも次戦の勝率→残HP→与ダメージが現状を改善しない時に使う。1報酬で最大${meta.towerBoon.limits.maxRerollsPerReward}回。使用前の提示も提示回数に含む。\n\n`;
  md+=table(['方針','訪問','購入','再抽選','倒したボスの提示','祝福済みカード取得'],usage.filter(u=>u.policy!=='all').map(u=>[u.policy,u.visits,u.purchases,u.rerolls,u.bossOffers,u.blessedAcquisitions]));
  md+='### 祝福ごとの購入・成績\n\n購入したランの成績は、塔まで到達できた生存者の偏りと他の祝福を含む観測値。購入自体の因果効果ではない。方針別の全件はboon_purchases.csv。\n\n';
  md+=table(['祝福','購入回数','購入ラン','購入ランのクリア率','平均到達St','平均終了G','平均購入順','母数'],purchases.filter(r=>r.policy==='all').map(r=>[name(r.id),r.purchases,r.runs,pct(r.clearRate),num(r.meanWave),num(r.meanFinalGold),num(r.meanOrder),r.sample]));
  const maximum=Math.max(0,...orders.map(r=>r.position));
  md+=`今回の実周回で確認した最大購入順は${maximum}。2回目以降の購入は${usage.find(r=>r.policy==='all').laterPurchases}回。価格上昇後の複数回購入・積み重ねの自然周回での成績は、その購入数が少ない範囲では未評価。\n\n`;
  md+=table(['方針',meta.towerBoon.priceBasis==='perBlessing'?'訪問時に最安の祝福と80Gを確保できなかった回数':'訪問時に次回価格と80Gの両方を確保できなかった回数','全訪問'],usage.filter(r=>r.policy!=='all').map(r=>[r.policy,r.insufficientAtEntry,r.visits]));
  md+='### 購入順の傾向\n\n'+table(['方針','購入順','上位の祝福（その順番の購入内比率）'],policies.flatMap(policy=>[...new Set(orders.filter(r=>r.policy===policy).map(r=>r.position))].sort((a,b)=>a-b).map(position=>[policy,position,orders.filter(r=>r.policy===policy&&r.position===position).sort((a,b)=>b.count-a.count).slice(0,3).map(r=>`${name(r.id)} ${pct(r.share)}`).join('、')])));
  md+=table(['方針','購入列','周回数','クリア率'],sequences.filter(s=>s.policy==='all').sort((a,b)=>b.runs-a.runs).slice(0,20).map(s=>[s.policy,s.sequence,s.runs,pct(s.clearRate)]));
  md+='### 難易度曲線：各マスの初戦\n\n共通seedの周回を対象に、各マスの最初の戦闘だけを集計。再戦は除く。未到達は補完しないため、後半は生存者が異なる。敵は開始時の敵ATK/HP合計、自軍は両版で保存されている魔導板上のキャラクター本体ATK/HP合計（予備を含む）。指輪・接続・開戦効果後の合計ではない。CSVにはATK/HPを分けた値と合計も保存する。\n\n';
  md+=table(['方針','St:マス:種別','初戦数 なし→あり','初戦勝率 なし→あり','敵ATK+HP なし→あり','自軍本体ATK+HP なし→あり'],cells.map(c=>[c.policy,`${c.wave}:${c.stage}:${c.type}`,`${c.beforeN}→${c.afterN}`,`${pct(c.beforeWinRate)}→${pct(c.afterWinRate)}`,`${num(c.beforeEnemyTotal)}→${num(c.afterEnemyTotal)}`,`${num(c.beforeOwnTotal)}→${num(c.afterOwnTotal)}`]));
  md+='`--tower-boon off`で施設訪問・購入・再抽選を無効化できる。ボス撃破の記録と、本体が祝福なしの生成で乱数を増やさない経路は維持する。\n\n';
  if(exchange)md=md.replaceAll('なし→あり','変更前→変更後');
  return {markdown:md,beforeAfter,purchases,orders,sequences,usage,curve:cells};
}
module.exports={curve,build};
