#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {csv}=require('./run_report');
const EPSILON_PT=3.34;
const mean=(xs,key)=>xs.length?xs.reduce((s,x)=>s+(typeof key==='function'?key(x):Number(x[key])||0),0)/xs.length:0;
function group(xs,key){const m=new Map();for(const x of xs){const k=key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x);}return m;}
const f=v=>Number.isFinite(v)?v.toFixed(2):'—';
const clean=v=>String(v??'—').replace(/\|/g,'\\|').replace(/\n/g,'<br>');
const table=(heads,rows)=>`|${heads.join('|')}|\n|${heads.map(()=>'---').join('|')}|\n`+rows.map(r=>'|'+r.map(clean).join('|')+'|').join('\n')+'\n\n';
function analyze(rows){
  const cards=[];
  for(const [,list] of group(rows,r=>`${r.scene}:${r.cardKey}`)){
    const first=list[0],B=list.length,delta=mean(list,'gainWinPt');
    // 敵seedは盤面間でも共通。同じseed内の盤面平均差を1観測とし、
    // 対応と盤面間の相関を保つ。150戦を独立な150敵と数えない。
    const N=first.n,paired=Array.from({length:N},(_,i)=>mean(list,r=>r.wins[i]-r.baseWins[i]));
    const variance=paired.reduce((s,d)=>s+(d-delta/100)**2,0)/Math.max(1,N-1),se=100*Math.sqrt(variance/N);
    cards.push({scene:first.scene,cardKey:first.cardKey,name:first.name,category:first.category,form:first.form,rarity:first.rarity,grade:first.grade,price:first.price,temporary:first.temporary,
      boards:B,samples:list.reduce((s,r)=>s+r.n,0),enemyDraws:N,baselineWinRate:mean(list,r=>r.baseline.winRate),winRate:mean(list,r=>r.actual.winRate),meanGainWinPt:delta,minGainWinPt:Math.min(...list.map(r=>r.gainWinPt)),maxGainWinPt:Math.max(...list.map(r=>r.gainWinPt)),
      ciLowPt:Math.max(-100,delta-1.96*se),ciHighPt:Math.min(100,delta+1.96*se),signal:delta-1.96*se>0?'正の差':delta+1.96*se<0?'負の差':'偶然の範囲を含む',
      meanGainHp:mean(list,'gainHp'),meanGainDamage:mean(list,'gainDamage'),eventChangedCases:list.reduce((s,r)=>s+r.eventChangedCases,0),formationChangedBoards:list.filter(r=>r.formationChanged).length,
      connectedBoards:list.filter(r=>r.targets.length).length,effectText:list.some(r=>r.effectText),desc:first.desc});
  }
  const groups=[];
  for(const dimension of ['rarity','grade','price'])for(const [,list] of group(cards,c=>`${c.scene}:${c.category}:${c.form}:${c[dimension]}`)){
    const x=list[0];groups.push({scene:x.scene,category:x.category,form:x.form,dimension,value:x[dimension],cards:list.length,meanGainWinPt:mean(list,'meanGainWinPt'),meanGainHp:mean(list,'meanGainHp'),meanGainDamage:mean(list,'meanGainDamage')});
  }
  for(const c of cards){const peers=cards.filter(p=>p!==c&&p.scene===c.scene&&p.category===c.category&&p.form===c.form&&p.grade===c.grade&&p.rarity===c.rarity&&p.price===c.price&&!p.temporary);
    c.peerCount=peers.length;c.peerMeanGainWinPt=peers.length?mean(peers,'meanGainWinPt'):null;c.peerDeviationPt=peers.length?c.meanGainWinPt-c.peerMeanGainWinPt:null;c.peerSample=peers.length>=3?'比較可能':'同条件のカード不足';}
  const targets=[];
  for(const c of cards.filter(c=>c.category==='エンチャント')){
    const list=rows.filter(r=>r.scene===c.scene&&r.cardKey===c.cardKey),byBody=new Map();
    for(const r of list){const bestPerBody=new Map();for(const p of r.connections)for(const t of p.targets){const old=bestPerBody.get(t.name);if(!old||p.gainWinPt>old.gainWinPt)bestPerBody.set(t.name,p);}
      for(const [name,p] of bestPerBody){if(!byBody.has(name))byBody.set(name,[]);byBody.get(name).push({gain:p.gainWinPt,board:r.board});}}
    const bodies=[...byBody].map(([body,values])=>({scene:c.scene,cardKey:c.cardKey,name:c.name,form:c.form,body,boards:values.length,meanGainWinPt:mean(values,'gain'),minGainWinPt:Math.min(...values.map(v=>v.gain)),maxGainWinPt:Math.max(...values.map(v=>v.gain))})).sort((a,b)=>b.meanGainWinPt-a.meanGainWinPt||b.boards-a.boards||a.body.localeCompare(b.body,'ja'));
    targets.push(...bodies);c.bestBody=bodies[0]?.body||'接続なし';c.bestBodyGainPt=bodies[0]?.meanGainWinPt??null;
    const tested=list.flatMap(r=>r.connections.filter(p=>p.targets.length));c.maxConnectionGainPt=tested.length?Math.max(...tested.map(p=>p.gainWinPt)):null;
    c.noConnection=tested.length===0;c.nearZeroAllBodies=tested.length>0&&tested.every(p=>Math.abs(p.gainWinPt)<=EPSILON_PT);c.noPositiveBody=tested.length>0&&tested.every(p=>p.gainWinPt<=EPSILON_PT);
  }
  const dormant=cards.filter(c=>c.effectText&&c.eventChangedCases===0).map(c=>({...c,status:c.formationChangedBoards?'編成時の補正は変化あり':c.category==='エンチャント'&&c.noConnection?'接続できず未検証':'効果イベント・編成補正の変化未観測'}));
  const inactiveAll=[];
  for(const [cardKey,list] of group(cards,c=>c.cardKey))if(list.some(c=>c.effectText)&&list.every(c=>c.eventChangedCases===0)){
    const c=list[0],formationBoards=list.reduce((s,x)=>s+x.formationChangedBoards,0);
    inactiveAll.push({cardKey,name:c.name,category:c.category,form:c.form,temporary:c.temporary,scenes:list.length,samples:list.reduce((s,x)=>s+x.samples,0),formationChangedBoards:formationBoards,
      status:formationBoards?'編成時の補正は変化あり':c.category==='エンチャント'&&list.every(x=>x.noConnection)?'接続できず未検証':'効果イベント・編成補正の変化未観測',desc:c.desc});
  }
  return {cards,groups,targets,dormant,inactiveAll};
}
function cardTable(cards){return table(['カード','分類/形','G/レア/価格','勝率差pt','最小〜最大','95%区間pt','残HP差','与ダメ差','仮'],cards.map(c=>[c.name,`${c.category}/${c.form}`,`${c.grade}/${c.rarity}/${c.price}`,f(c.meanGainWinPt),`${f(c.minGainWinPt)}〜${f(c.maxGainWinPt)}`,`${f(c.ciLowPt)}〜${f(c.ciHighPt)}`,f(c.meanGainHp),f(c.meanGainDamage),c.temporary?'仮':'']));}
function outlierTable(cards){return table(['カード','分類/形','G/レア/価格','勝率差pt','同条件平均との差pt','比較カード数','95%区間pt'],cards.map(c=>[c.name,`${c.category}/${c.form}`,`${c.grade}/${c.rarity}/${c.price}`,f(c.meanGainWinPt),f(c.peerDeviationPt),c.peerCount,`${f(c.ciLowPt)}〜${f(c.ciHighPt)}`]));}
function boonSection(data,scene){
  if(!data)return '';
  const rows=data.summaries.filter(r=>!scene||r.scene===scene),label=id=>{const d=data.config.blessings.find(b=>b.id===id);return `${data.config.blessings.indexOf(d)+1} ${d.label.replace(/\{(\w+)\}/g,(_,k)=>data.config[k])}`;};
  let md='## 祝福の価値\n\n'+data.method+'\n\n';
  md+=`各盤面・各祝福${data.options.samples}例。${data.options.workers}プロセス、${f(data.elapsedMs/1000)}秒。全盤面を祝福済みとする比較で、実ランで購入後に取得できる枚数・購入費用は別に周回で測る。95%区間は同じ敵seedでの対応差を盤面平均した正規近似。\n\n`;
  if(!scene)md+=table(['祝福','4場面平均の勝率差pt'],Object.entries(data.values).map(([id,v])=>[label(id),f(v)]));
  md+=table(['場面','祝福','基準勝率%','祝福後%','平均差pt','盤面間最小〜最大pt','95%区間pt','残HP差','与ダメージ差'],rows.map(r=>[r.scene,label(r.id),f(r.baselineWinRate*100),f(r.winRate*100),f(r.meanGainWinPt),`${f(r.minGainWinPt)}〜${f(r.maxGainWinPt)}`,`${f(r.ciLowPt)}〜${f(r.ciHighPt)}`,f(r.meanGainHp),f(r.meanGainDamage)]));
  md+='6（倒したボスの出現）・7（報酬再抽選）は固定盤面では測定せず、out/RUN_REPORT.mdの実周回で扱う。元盤面のJSONは変更しない。生データはboon_comparisons.jsonl、集計はboons.csv。\n\n';return md;
}
function sceneReport(scene,boards,data,meta){
  const cards=data.cards.filter(c=>c.scene===scene.id),peers=cards.filter(c=>c.peerCount>=3),rows=[];
  let md=`# ${scene.label} 固定盤面比較\n\n階層${scene.floor}、深層${scene.deepLevel}。${boards.length}盤面、${cards.length}形態。\n\n`;
  md+='## 基準盤面\n\n'+table(['盤面','元方針/seed','選定時勝率','比較時勝率','色構成・主力3枚','追加カード'],boards.map(b=>{
    const cardRow=meta.boardBaselines.find(r=>r.board===b.id);return [b.id,`${b.source.policy}/${b.source.seed}`,`${f(b.baseline.winRate*100)}%`,`${f((cardRow?.winRate||0)*100)}%`,b.features.type,(b.additions||[]).map(a=>`${a.name}@${a.slot}`).join('・')||'なし'];}));
  for(const b of boards){md+=`### ${b.id}\n\n`+table(['マス','マスの力','カード','ATK/HP','向き'],b.board.filter(Boolean).map(c=>[c.slot,c.powerId||'—',c.name,`${c.power}/${c.life}`,c.directions.join('・')]));
    md+=`ライフ${b.state._waveLife}、所持金${b.state.gold}G、指輪${b.state.rings.filter(Boolean).map(r=>r.name).join('・')||'なし'}。開戦アイテム${(b.state.activeBattleItems||[]).map(c=>c.name).join('・')||'なし'}。\n\n`;
    if(b.additions?.length)md+=`追加手順: ${b.additions.map(a=>`${a.name}をマス${a.slot}へ追加（${f(a.beforeWinRate*100)}%→${f(a.afterWinRate*100)}%）`).join('、')}。元のカード・方向・マスの力は維持。\n\n`;
  }
  md+='## 値段・レアリティ・グレードのわりに強い候補 上位15\n\n'+outlierTable(peers.slice().sort((a,b)=>b.peerDeviationPt-a.peerDeviationPt).slice(0,15));
  md+='## 値段・レアリティ・グレードのわりに弱い候補 下位15\n\n'+outlierTable(peers.slice().sort((a,b)=>a.peerDeviationPt-b.peerDeviationPt).slice(0,15));
  md+='比較相手は同じ場面・分類・通常/合体・グレード・レアリティ・標準価格を持つ他カード。相手3枚未満は順位対象外。通常/合体の直接の費用対効果や、素材3枚を集める難しさは別問題。\n\n';
  md+='## 全カード\n\n'+cardTable(cards.slice().sort((a,b)=>b.meanGainWinPt-a.meanGainWinPt||a.cardKey.localeCompare(b.cardKey)));
  md+='## レアリティ・グレード・価格別\n\n'+table(['分類/形','軸','値','カード数','平均勝率差pt'],data.groups.filter(g=>g.scene===scene.id).map(g=>[`${g.category}/${g.form}`,g.dimension,g.value,g.cards,f(g.meanGainWinPt)]));
  const enchants=cards.filter(c=>c.category==='エンチャント');
  md+='## エンチャントの最も合う本体\n\n接続選択用サンプルの各本体での最良配置を、出現した基準盤面間で平均した探索値。複数本体へ同時接続する場合は各本体へ記録し、個々の因果寄与へ分解しない。\n\n'+table(['エンチャント','本体','探索平均差pt','評価時の全盤面平均差pt'],enchants.map(c=>[c.name,c.bestBody,f(c.bestBodyGainPt),f(c.meanGainWinPt)]));
  const nearZero=enchants.filter(c=>c.nearZeroAllBodies);
  md+=`## どの検証本体でも勝率差がほぼ0のエンチャント\n\n全接続候補が±${EPSILON_PT}pt以内: ${nearZero.length}形態。${nearZero.length?nearZero.map(c=>c.name).join('・'):'該当なし'}。未接続は除外。\n\n`;
  md+=`## どの検証本体でも改善を観測できないエンチャント\n\n探索時の全接続候補で最大差が+${EPSILON_PT}pt以下。1/30程度の差を「ほぼ0」の目安にした。未接続とは区別し、この固定盤面で登場した本体の範囲に限る。\n\n`+table(['エンチャント','全候補最大差pt','全候補が±閾値内'],enchants.filter(c=>c.noPositiveBody).map(c=>[c.name,f(c.maxConnectionGainPt),c.nearZeroAllBodies?'はい':'いいえ（悪化も含む）']));
  md+='## 効果イベントに変化を観測しなかったカード\n\n同じ数値・配置のカードから効果文・派生効果・名前で起動する互換効果を外し、同一seedのイベント列と比較。名前と本文の写し・点灯だけは証拠から除く。編成時の常時補正だけが変わるもの、接続できないもの、条件未成立を区別する。実装漏れの断定ではない。\n\n'+table(['カード','分類/形','評価回数','判定'],data.dormant.filter(c=>c.scene===scene.id).map(c=>[c.name,`${c.category}/${c.form}`,c.samples,c.status]));
  return md;
}
function writeReport(out,boardsDir=out){
  const rows=fs.readFileSync(path.join(out,'comparisons.jsonl'),'utf8').trim().split('\n').map(JSON.parse),meta=JSON.parse(fs.readFileSync(path.join(out,'compare_meta.json'),'utf8'));
  const data=analyze(rows),boardBaselines=[];
  const boonFile=path.join(out,'boon_values.json'),boons=fs.existsSync(boonFile)?JSON.parse(fs.readFileSync(boonFile,'utf8')):null;
  if(boons&&JSON.stringify(boons.sourceHashes)!==JSON.stringify(meta.sourceHashes))throw Error('祝福比較とカード比較の本体が異なる');
  for(const [,list] of group(rows,r=>r.board))boardBaselines.push({board:list[0].board,scene:list[0].scene,...list[0].baseline});meta.boardBaselines=boardBaselines;
  const details=rows.map(r=>({scene:r.scene,board:r.board,cardKey:r.cardKey,name:r.name,category:r.category,form:r.form,rarity:r.rarity,grade:r.grade,price:r.price,temporary:r.temporary,n:r.n,baselineWinRate:r.baseline.winRate,winRate:r.actual.winRate,gainWinPt:r.gainWinPt,gainHp:r.gainHp,gainDamage:r.gainDamage,slot:r.slot,replaced:r.replaced,targets:r.targets.map(t=>`${t.name}@${t.slot}`).join('|'),directions:r.directions.join('|'),eventChangedCases:r.eventChangedCases,formationChanged:r.formationChanged}));
  const cardColumns=[...new Set(data.cards.flatMap(c=>Object.keys(c)))];csv(path.join(out,'cards.csv'),data.cards,cardColumns);csv(path.join(out,'board_comparisons.csv'),details);csv(path.join(out,'groups.csv'),data.groups);csv(path.join(out,'enchant_bodies.csv'),data.targets);csv(path.join(out,'inactive_effects.csv'),data.dormant,[...cardColumns,'status']);
  csv(path.join(out,'ineffective_enchants.csv'),data.cards.filter(c=>c.category==='エンチャント'&&c.noPositiveBody),cardColumns);csv(path.join(out,'baselines.csv'),boardBaselines);
  csv(path.join(out,'near_zero_enchants.csv'),data.cards.filter(c=>c.category==='エンチャント'&&c.nearZeroAllBodies),cardColumns);
  csv(path.join(out,'inactive_effects_all.csv'),data.inactiveAll);
  let md='# 固定盤面によるカード比較\n\n';
  md+=`${meta.forms.filter(c=>c.form==='通常').length}枚の通常形と${meta.forms.filter(c=>c.form==='合体').length}形態の本体合体後、合計${meta.forms.length}形態・${rows.length}件のカード×盤面比較。評価は各${meta.options.samples}サンプル、エンチャントの接続選択は別seedの各${meta.options.searchSamples}サンプル。${meta.options.workers}プロセス、比較の壁時計${f(meta.elapsedMs/1000)}秒。差し替え後の評価${rows.reduce((s,r)=>s+r.n,0)}戦に加え、基準・接続探索・効果除去も実行した。\n\n`;
  if(meta.effectProbe)md+=`効果観測の追加検査: ${meta.effectProbe.rows}件、${meta.effectProbe.workers}プロセス、${f(meta.effectProbe.elapsedMs/1000)}秒。${meta.effectProbe.reason}\n\n`;
  const manifestFile=path.join(boardsDir,'boards_manifest.json');if(fs.existsSync(manifestFile)){const m=JSON.parse(fs.readFileSync(manifestFile));md+=`盤面選定の壁時計${f(m.elapsedMs/1000)}秒。${m.construction}\n\n`;}
  if(meta.boardProvenance&&JSON.stringify(meta.boardProvenance.selectionSourceHashes)!==JSON.stringify(meta.sourceHashes))md+='保存済みの標準盤面を維持し、現在の本体で比較を再計算した。選定時勝率は元版の値、比較時勝率は今回の値。盤面選定の元周回は新しいworktreeに含まれない場合がある。\n\n';
  if(meta.runLevels)md+='今回の固定レベル（ATK・HPの順）:\n\n'+table(['場面','レベル'],Object.entries(meta.runLevels).map(([scene,values])=>[scene,['atk','hp'].map(k=>values[k]).join(' / ')]));
  md+='## 方法と解釈\n\n';
  md+=Object.values(meta.rules).map(t=>'- '+t).join('\n')+'\n\n';
  md+='通常形はシートの基準カードで、G1が中心。固有の出現グレードがG2〜G4のカードも全数を測り、その値をG1へ改変しない。合体は `_tryTripleMergeOnBoard` で実際に3枚を合体させた別形態。合体不可のカードは通常行だけ。標準価格は割引前の本体 `_mapSalePrice`。\n\n';
  md+='盤面は元周回を完全一致再実行して、本体の正式なラン保存対象と使用済みの開戦アイテムを採取。選定時には独立30サンプルで25〜75%の盤面だけを採用する。選定時と比較時の敵seedは別なので、比較時の基準勝率がその範囲を外れる場合もある。ライフ・所持金・指輪・永続補正・開戦アイテムは各基準盤面内で固定する。購入・施設・次戦への持越しは測らない。\n\n';
  md+='95%区間は敵seedごとに「全盤面の平均勝敗差」を1観測とする対応あり正規近似（平均±1.96×標準誤差）。同じ敵を盤面間でも使うため、5盤面×30戦を独立な150敵とは数えず、30個の独立seedで誤差を測る。接続を選ぶseedと報告するseedを分け、選択による上振れを抑える。これは試した固定盤面と敵分布での試行誤差であり、未検証盤面への一般化や全カード同時比較の多重性は補正しない。区間が0をまたぐ差は偶然の範囲を含む。\n\n';
  md+='戦闘は本体の魔導板→formation→コアを通す。比較を速くするため、SaveRun.computeBattleのソースから途中の表示フレーム保存を省き、不変の召喚定義を共有した検査専用の受け口を使う。戦闘ステップ・対象・数値・撃破ゴールド処理は原文のまま。本体の500手上限を守る。元のcomputeBattleとの全イベント・最終状態一致を自己テストする。本体ファイルと既存周回ツールは変更しない。\n\n';
  md+='overrideは読み込んだプールへ適用し、仮追加は表の「仮」で区別する。固定盤面の保存済みカード自体は変更せず、比較対象と召喚定義に反映する。既存カードの合体効果変更には周回ボットと同じくmergedDesc指定が必要。解釈できない文・条件未成立はイベント変化なしの候補として出る。\n\n';
  md+='封印持ちの負の差には、解放に必要な血が足りず参加できない場合も含む。解放後だけの性能ではない。色・マナ・召喚数などの条件も固定盤面に依存するため、順位はこの盤面群での調整候補として読む。\n\n';
  const order=['st2_normal','st2_elite','st3_normal','st3_elite'],scenes=[...new Set(rows.map(r=>r.scene))].sort((a,b)=>order.indexOf(a)-order.indexOf(b));
  md+='## 場面別の要点\n\n'+table(['場面','同条件より強い候補 上位3（平均との差pt）','同条件より弱い候補 下位3（平均との差pt）'],scenes.map(id=>{
    const peers=data.cards.filter(c=>c.scene===id&&c.peerCount>=3).sort((a,b)=>b.peerDeviationPt-a.peerDeviationPt);
    return [id,peers.slice(0,3).map(c=>`${c.name} ${f(c.peerDeviationPt)}`).join('・'),peers.slice(-3).reverse().map(c=>`${c.name} ${f(c.peerDeviationPt)}`).join('・')];}));
  md+='## 全場面で効果イベントの変化がなかったカード\n\n本文ありのカードを、通常形・合体形ごとに集計。全評価サンプルで効果を外した場合とイベントが同じだった一覧。効果を外す対照側ではカード名も無効化し、空本文でも起動する本体の名前互換処理が残らないようにする。名前の表示メタデータだけの差は比較から除く。編成時の補正が変わる常時効果は別記し、実装漏れと断定しない。\n\n'+table(['カード','分類/形','場面数','評価回数','判定'],data.inactiveAll.map(c=>[c.name,`${c.category}/${c.form}`,c.scenes,c.samples,c.status]));
  md+=boonSection(boons);
  for(const id of scenes){const saved=JSON.parse(fs.readFileSync(path.join(boardsDir,`boards_${id}.json`),'utf8')),part=sceneReport(saved.scene,saved.boards,data,meta)+boonSection(boons,id),dir=path.join(out,id);fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'FIXED_REPORT.md'),part);csv(path.join(dir,'cards.csv'),data.cards.filter(c=>c.scene===id),cardColumns);csv(path.join(dir,'board_comparisons.csv'),details.filter(r=>r.scene===id));md+='\n'+part.replace(/^(#{1,5}) /gm,'#$1 ');}
  const testFile=path.join(out,'SELFTEST.json');if(fs.existsSync(testFile)){const test=JSON.parse(fs.readFileSync(testFile));md+='\n## 健全性検査\n\n'+test.checks.map(c=>'- '+c).join('\n')+'\n\n';
    if(test.overrideResult?.length)md+='overrideの実測例（検査用の極端な数値。ステージ2通常・全基準盤面・各30例）:\n\n'+table(['変更/追加','平均勝率差pt','仮'],test.overrideResult.map(r=>[r.name,f(r.meanGainWinPt),r.temporary?'仮':'数値変更']));}
  md+='## 未確認・限界\n\n- 5盤面/場面の構成と、提示時の1組のエンチャント方向に依存する。他の向き・構成全般の順位を保証しない。\n- 接続先別の相性表は探索用サンプルの値で、全盤面平均の主表だけが独立評価用サンプル。\n- 発動変化なしは実装漏れと条件未成立を区別できない。将来の戦闘向け経済効果・アイテム取得の価値も勝率差には出ない。\n- イベント変化があっても本文全ての解釈を保証しない。既存名のカードには名前から起動する互換効果もある。\n- 固定盤面への追加カードには実際の入手費用や合体素材集めを課していない。\n- 画面・音・ブラウザ実機は未確認。\n\n';
  md+='## 再実行\n\n```sh\nnode tools/balance_sim/fixed_boards.js --workers 4\nnode tools/balance_sim/fixed_compare.js --workers 4\nnode tools/balance_sim/fixed_selftest.js\n# 仮変更は別フォルダへ\nnode tools/balance_sim/fixed_compare.js --workers 4 --override <json> --out <出力先>\n```\n';
  fs.writeFileSync(path.join(out,'FIXED_REPORT.md'),md);return data;
}
if(require.main===module){try{const out=process.argv[2]||path.join(__dirname,'fixed');writeReport(out,process.argv[3]||out);console.log(`報告作成: ${out}`);}catch(e){console.error(e.stack||e);process.exitCode=1;}}
module.exports={analyze,writeReport,EPSILON_PT};
