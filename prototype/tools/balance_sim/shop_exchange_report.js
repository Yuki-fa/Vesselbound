'use strict';
const fs=require('node:fs'),path=require('node:path');
const avg=(xs,fn)=>xs.length?xs.reduce((sum,x)=>sum+fn(x),0)/xs.length:0;
const pct=n=>(n*100).toFixed(1)+'%',num=n=>n.toFixed(2);
const table=(headers,rows)=>`|${headers.join('|')}|\n|${headers.map(()=>'---').join('|')}|\n`+rows.map(row=>'|'+row.map(x=>String(x).replaceAll('|','／')).join('|')+'|').join('\n')+'\n\n';
const ringTakes=run=>run.acquisitions.filter(a=>a.card.category==='指輪');
function summary(rows,policy){
  const runs=rows.filter(r=>r.policy===policy),altars=runs.flatMap(r=>r.route.filter(n=>n.type==='altar'));
  const altarTakes=runs.flatMap(r=>r.acquisitions.filter(a=>a.source==='ringExchange'));
  const actions=runs.flatMap(r=>r.actions);
  return {runs:runs.length,clears:runs.filter(r=>r.clear).length,clearRate:avg(runs,r=>+r.clear),wave:avg(runs,r=>r.reachedWave),
    progress:avg(runs,r=>r.progress),gold:avg(runs,r=>r.finalGold),ringRuns:runs.filter(r=>ringTakes(r).length).length,
    ringRunRate:avg(runs,r=>+(ringTakes(r).length>0)),ringsPerRun:avg(runs,r=>ringTakes(r).length),altars:altars.length,altarTakes:altarTakes.length,
    altarTakeRate:altars.length?altarTakes.length/altars.length:0,sales:actions.filter(a=>a.type==='sell').length,
    purchases:actions.filter(a=>a.type==='purchase').length,exchanges:actions.filter(a=>a.type==='exchange').length,
    shortage:actions.filter(a=>a.type==='ring_shortage').length};
}
function build(rows,baseline,out,csv,trial){
  const policies=[...new Set(rows.map(r=>r.policy))];
  const comparison=policies.map(policy=>({policy,before:summary(baseline,policy),after:summary(rows,policy)}));
  csv(path.join(out,'shop_exchange_before_after.csv'),comparison.map(({policy,before,after})=>({policy,...Object.fromEntries(Object.entries(before).map(([k,v])=>['before_'+k,v])),...Object.fromEntries(Object.entries(after).map(([k,v])=>['after_'+k,v]))})));
  const rings=[];
  for(const policy of ['all',...policies]) {
    const old=policy==='all'?baseline:baseline.filter(r=>r.policy===policy),now=policy==='all'?rows:rows.filter(r=>r.policy===policy);
    const names=[...new Set([...old,...now].flatMap(r=>ringTakes(r).map(a=>a.card.name)))].sort();
    for(const name of names) {
      const count=rs=>rs.flatMap(r=>ringTakes(r).filter(a=>a.card.name===name)).length;
      const rate=rs=>avg(rs,r=>+ringTakes(r).some(a=>a.card.name===name));
      rings.push({policy,name,beforeCount:count(old),afterCount:count(now),beforeRunRate:rate(old),afterRunRate:rate(now)});
    }
  }
  csv(path.join(out,'shop_exchange_rings.csv'),rings);
  let md='## 店と祭壇の変更前→変更後\n\n';
  md+='変更前は `out_before_shop_exchange/` に退避した祝福ありの前回記録。変更後も祝福あり・初回ストーリー。種と周回数は各記録に従い、共通seed比較と全件集計を区別する。カード交換・必須還魂・カード購入と売却の廃止、およびそれに伴う資金・抽選系列・選択方針の差を含む。戦闘コア・出撃生成・内蔵シートは変更していない。'+(trial?'今回の記録は新規合体停止・交換店の道具売却禁止・祝福の訪問固定・瞳の編成表示/出発判定の修正も含む。':'')+'\n\n';
  md+=table(['方針','周回 前→後','クリア 前→後','平均到達St 前→後','平均到達St+マス/100 前→後','終了G 前→後'],comparison.map(({policy,before:a,after:b})=>[policy,`${a.runs}→${b.runs}`,`${a.clears}/${a.runs} (${pct(a.clearRate)})→${b.clears}/${b.runs} (${pct(b.clearRate)})`,`${num(a.wave)}→${num(b.wave)}`,`${num(a.progress)}→${num(b.progress)}`,`${num(a.gold)}→${num(b.gold)}`]));
  md+='### 指輪の取得率\n\n取得率の母数を全ランと祭壇到達の2通りで示す。全ランの値は塔へ着く前の敗退も含む。祭壇で免除できるのは、刻印・クエストの移動制限と最後の出撃キャラを考慮した支払可能枚数が3枚未満の場合だけ。交換枚数は3枚のまま。\n\n';
  md+=table(['方針','指輪取得ラン率 前→後','1ランの取得数 前→後','祭壇で取得 前→後','枚数不足の免除 後'],comparison.map(({policy,before:a,after:b})=>[policy,`${pct(a.ringRunRate)}→${pct(b.ringRunRate)}`,`${num(a.ringsPerRun)}→${num(b.ringsPerRun)}`,`${a.altarTakes}/${a.altars} (${pct(a.altarTakeRate)})→${b.altarTakes}/${b.altars} (${pct(b.altarTakeRate)})`,b.shortage]));
  const peddlerRule=rows.some(r=>r.actions.some(a=>a.type==='peddler'&&a.stock.length===3))
    ?'魔導店と敗北時の行商人は本体の共通交換を使う。'+(trial?'この2店では道具も売却できない。道具屋の売買・他施設で認められた道具売却・道具の使用、宿・鍛冶・祝福の支払いは維持する。':'道具屋の購入・手持ち道具の売却と使用、宿・鍛冶・祝福の支払いは維持する。')
    :'道具の購入・使用と、宿・鍛冶・祝福の支払いは維持する。ゲーム本体の行商人のカード購入は従来のまま残し、このボットは選ばない。';
  md+='### 売買・交換の実行数\n\nカードの売却・購入は変更後すべて0。'+peddlerRule+'\n\n';
  md+=table(['方針','カード売却 前→後','カード/道具購入アクション 前','カード交換 後'],comparison.map(({policy,before:a,after:b})=>[policy,`${a.sales}→${b.sales}`,a.purchases,b.exchanges]));
  md+='### 取得した指輪の種類\n\n件数は取得イベント数、率はその種類を1個以上取得したランの割合。同じ種類を複数回得てもラン率は1回。方針別の全件をCSVにも保存する。\n\n';
  md+=table(['方針','指輪','取得数 前→後','取得ラン率 前→後'],rings.map(r=>[r.policy,r.name,`${r.beforeCount}→${r.afterCount}`,`${pct(r.beforeRunRate)}→${pct(r.afterRunRate)}`]));
  md+='各場面の初戦勝率・敵と自軍のATK/HP合計は、次節の「難易度曲線：各マスの初戦」と `difficulty_curve.csv` に変更前→変更後で記録する。自軍値は両版のJSONLに共通して残る魔導板上のキャラ本体の合計（予備を含む）。指輪・接続・開戦効果後の戦闘値ではない。未到達の場面は補完しない。\n\n';
  return {markdown:md,comparison,rings};
}
module.exports={build,summary};
