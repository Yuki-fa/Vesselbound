'use strict';
const fs=require('fs'), path=require('path');
const {simulateCard}=require('./sim');
const {runSelfTest}=require('./selftest');

function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d;}
function avg(rows,key){return rows.length?rows.reduce((s,r)=>s+num(r[key]),0)/rows.length:0;}
function pct(v){return (v*100).toFixed(1)+'%';}
function makeRows(results){
  const groups=new Map(), rarities=new Map(), grades=new Map();
  for(const r of results){const k=`${r.card.rarity}|${r.card.grade}`;(groups.get(k)||groups.set(k,[]).get(k)).push(r.metrics); (rarities.get(r.card.rarity)||rarities.set(r.card.rarity,[]).get(r.card.rarity)).push(r.metrics); (grades.get(r.card.grade)||grades.set(r.card.grade,[]).get(r.card.grade)).push(r.metrics);}
  return results.map(r=>{const g=groups.get(`${r.card.rarity}|${r.card.grade}`), rg=rarities.get(r.card.rarity), gg=grades.get(r.card.grade); const m=r.metrics;
    const z=(key)=>m[key]-avg(g,key); return {...r,win:m.won,metrics:m,
      rarityInsufficient:rg.length<5,gradeInsufficient:gg.length<5,
      devWin:z('won'),devTurn:-z('turns'),devDmg:z('dealt'),devSurvival:z('survivalRate'),
      rarityDevWin:m.won-avg(rg,'won'),rarityDevDmg:m.dealt-avg(rg,'dealt'),rarityDevSurvival:m.survivalRate-avg(rg,'survivalRate'),
      gradeDevWin:m.won-avg(gg,'won'),gradeDevDmg:m.dealt-avg(gg,'dealt'),gradeDevSurvival:m.survivalRate-avg(gg,'survivalRate')};});
}
async function main(){
  const n=Math.max(1,parseInt(process.env.N||process.argv[2]||'200',10));
  await loadGameData();
  const cards=(PANEL_POOL||[]).filter(c=>c&&c.category==='キャラクター'&&!c._rewardExcluded&&num(c.rarity,0)>=0);
  const selftest=await runSelfTest(cards);
  const floor=5, seed=0x5eed1234;
  const results=[];
  for(let i=0;i<cards.length;i++){
    const card=cards[i], rows=[];
    for(let j=0;j<n;j++) rows.push(await simulateCard(card,{seed:seed+j,floor}));
    const decided=rows.filter(r=>r.decided).length;
    results.push({card,metrics:{won:decided?rows.filter(r=>r.won).length/decided:0,
      timeout:avg(rows,'timeout'),decided:decided/n,turns:avg(rows,'turns'),dealt:avg(rows,'dealt'),taken:avg(rows,'taken'),survivalRate:avg(rows,'survivalRate')}});
    process.stdout.write(`\r${i+1}/${cards.length} ${card.name}`);
  }
  process.stdout.write('\n');
  const rows=makeRows(results);
  rows.sort((a,b)=>b.metrics.won-a.metrics.won||b.metrics.dealt-a.metrics.dealt);
  const score=r=>r.devWin*100+r.devDmg/10+r.devSurvival*10-r.devTurn/100;
  const strong=[...rows].sort((a,b)=>score(b)-score(a)).slice(0,10);
  const weak=[...rows].sort((a,b)=>score(a)-score(b)).slice(0,10);
  const line=r=>`| ${r.card.name} | ${r.card.rarity} | ${r.card.grade} | ${pct(r.metrics.won)} | ${pct(r.metrics.timeout)} | ${r.metrics.turns.toFixed(2)} | ${r.metrics.dealt.toFixed(2)} | ${r.metrics.taken.toFixed(2)} | ${pct(r.metrics.survivalRate)} | ${r.metrics.decided.toFixed(3)} | ${r.rarityInsufficient?'母数不足':`${(r.rarityDevWin*100).toFixed(1)}pt / ${r.rarityDevDmg.toFixed(2)} / ${(r.rarityDevSurvival*100).toFixed(1)}pt`} | ${r.gradeInsufficient?'母数不足':`${(r.gradeDevWin*100).toFixed(1)}pt / ${r.gradeDevDmg.toFixed(2)} / ${(r.gradeDevSurvival*100).toFixed(1)}pt`} |`;
  let md=`# Vesselbound 個別カード・バランス検証\n\n`;
  md+=`## 検証条件\n\n- 対象：PANEL_POOL の「キャラクター」かつ _rewardExcluded でないカード（${cards.length}枚）\n- 試行回数：各カード ${n} 回、固定条件の通常戦闘\n- 敵編成：G.floor=5 の generateEnemies()。各カードの試行 j は seed=0x5eed1234+j\n- 盤面：メイン盤面1番（前衛中央）に対象カード1枚、指輪・強化・アイテム・地形援軍なし\n- プレイヤーAI：敵を倒せる場合は敵ATK最大、そうでなければ敵HP最小を選び、実際の allyAttackAction() を呼ぶ。最大ターン数は30\n- 勝率は「決着（勝敗）がついた試行」のみを母数に計算。打ち切りは敗北に含めず、別途集計する。\n\n`;
  const exp=(label,map)=>[...map.entries()].sort((a,b)=>num(a[0])-num(b[0])).map(([k,v])=>{const count=v.length; const insufficient=count<5; return `| ${label}${k} | ${count} | ${insufficient?'母数不足':pct(avg(v,'won'))} | ${pct(avg(v,'timeout'))} | ${avg(v,'turns').toFixed(2)} | ${avg(v,'dealt').toFixed(2)} | ${pct(avg(v,'survivalRate'))} |`;}).join('\n');
  const rarityMap=new Map(), gradeMap=new Map(); rows.forEach(r=>{(rarityMap.get(r.card.rarity)||rarityMap.set(r.card.rarity,[]).get(r.card.rarity)).push(r.metrics);(gradeMap.get(r.card.grade)||gradeMap.set(r.card.grade,[]).get(r.card.grade)).push(r.metrics);});
  md+=`## レアリティ別・グレード別期待値\n\n|分類|枚数|勝率（決着のみ）|打ち切り率|平均ターン|平均与ダメージ|平均生存率|\n|---|---:|---:|---:|---:|---:|---:|\n`+exp('レアリティ',rarityMap)+'\n'+exp('グレード',gradeMap)+'\n\n';
  md+=`## 全カード一覧\n\n|カード|レア|G|勝率（決着のみ）|打ち切り率|平均ターン|平均与ダメージ|平均被ダメージ|平均生存率|決着率|レアリティ偏差（勝率/与ダメ/生存率）|グレード偏差（勝率/与ダメ/生存率）|\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n`+rows.map(line).join('\n')+'\n\n';
  md+='## 突出して強い上位10枚\n\n'+strong.map((r,i)=>`${i+1}. **${r.card.name}** — 勝率${pct(r.metrics.won)}、与ダメ${r.metrics.dealt.toFixed(2)}、生存率${pct(r.metrics.survivalRate)}（同レア/G平均との差：勝率 ${(r.devWin*100).toFixed(1)}pt、与ダメ ${r.devDmg.toFixed(2)}、生存率 ${(r.devSurvival*100).toFixed(1)}pt）`).join('\n')+'\n\n';
  md+='## 弱すぎる下位10枚\n\n'+weak.map((r,i)=>`${i+1}. **${r.card.name}** — 勝率${pct(r.metrics.won)}、与ダメ${r.metrics.dealt.toFixed(2)}、生存率${pct(r.metrics.survivalRate)}（同レア/G平均との差：勝率 ${(r.devWin*100).toFixed(1)}pt、与ダメ ${r.devDmg.toFixed(2)}、生存率 ${(r.devSurvival*100).toFixed(1)}pt）`).join('\n')+'\n\n';
  const timeoutRate=avg(rows.map(r=>r.metrics),'timeout');
  md+=`## 状態リーク自己テスト\n\n- 対象：${selftest.card}、同一seedで単独実行と他カード${selftest.preceding}枚を先に実行した後を比較\n- 結果：${selftest.equal?'一致（合格）':'不一致（失敗）'}\n\n`;
  md+=`## 打ち切り\n\n- 全体打ち切り率：${pct(timeoutRate)}\n- ${timeoutRate>0?'警告：打ち切りが0%ではないため、該当試行の勝敗を勝率の母数に含めていない。':'打ち切りは0%だった。'}\n\n`;
  md+='## このハーネスが再現できていない要素\n\n- 指輪\n- 強化カード\n- アイテム\n- 魔導板パワー\n- 地形援軍\n- 複数体編成・複数カードの配置相互作用\n- スペル、マナ、ショップ、報酬選択、マップ遷移など戦闘外の進行\n- 戦闘中のプレイヤー移動（現行 battle.js にプレイヤー移動入口がないため）\n- DOM、VFX、SE、待機時間\n- 即死・変身・召喚など数値ダメージ以外の影響を与ダメージとしての厳密な個体追跡\n\n';
  const out=path.join(__dirname,'REPORT.md'); fs.writeFileSync(out,md); console.log(`REPORT.md written: ${rows.length} cards x ${n} trials`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
