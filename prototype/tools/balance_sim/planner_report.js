'use strict';

const fs=require('node:fs'),path=require('node:path');
const {ARCHETYPES,writeTables}=require('./synergy');
const {curve}=require('./boon_report');
const avg=(xs,f)=>xs.length?xs.reduce((s,x)=>s+Number(f(x)),0)/xs.length:0;
const pct=x=>x==null?'—':(x*100).toFixed(1)+'%',num=x=>x==null?'—':Number(x).toFixed(2);
const table=(heads,rows)=>`|${heads.join('|')}|\n|${heads.map(()=>'---').join('|')}|\n`+rows.map(r=>'|'+r.map(x=>String(x??'—').replaceAll('|','／').replaceAll('\n',' ')).join('|')+'|').join('\n')+'\n\n';
const label=id=>ARCHETYPES.find(a=>a.id===id)?.name||id;
function investmentRows(rows){
  const result=[];
  for(const r of rows.filter(r=>r.policy==='planner'))for(const a of r.actions.filter(a=>a.investment&&['take','exchange','ring_exchange','item_purchase'].includes(a.type))){
    const name=a.chosenCard.name,initial=a.synergyAfter.pairs.filter(p=>p.active&&(p.consumer===name||p.producer===name));
    const initialKeys=new Set(initial.map(p=>`${p.token}:${p.producer}:${p.consumer}`));
    const matches=[];
    for(const b of r.battles.filter(b=>b.index>=a.battleIndex))for(const p of b.synergy?.pairs||[]){
      if(!p.active||(p.producer!==name&&p.consumer!==name))continue;
      const partner=p.producer===name?p.consumer:p.producer;
      const acquiredLater=r.acquisitions.slice(a.acquisitionIndex).some(x=>x.card.name===partner&&(x.wave<b.wave||x.wave===b.wave&&x.stage<=b.stage));
      const fresh=!initialKeys.has(`${p.token}:${p.producer}:${p.consumer}`);
      matches.push({battle:b,pair:p,partner,acquiredLater,fresh});
    }
    const later=matches.find(m=>m.fresh&&m.acquiredLater),any=matches[0],match=later||any;
    result.push({seed:r.seed,wave:a.wave,stage:a.stage,action:a.type,card:name,immediateAlternative:a.bestImmediate.name||'現状維持',
      slot:a.slot??'',sacrifice:(a.sacrifice||[]).join('/'),alternativeAction:JSON.stringify(a.bestImmediate.action),
      immediate:a.forecast.immediate,alternativeImmediate:a.bestImmediate.value.immediate,future:a.forecast.future,alternativeFuture:a.bestImmediate.value.future,
      immediateDelta:a.forecast.immediate-a.bestImmediate.value.immediate,futureDelta:a.forecast.future-a.bestImmediate.value.future,
      matchedLater:!!later,matchedInBattle:!!any,partner:match?.partner||'',token:match?.pair.token||'',
      firstMatch:match?`${match.battle.wave}:${match.battle.stage}`:'',matchOutcome:match?.battle.outcome||'',
      manaThresholdEvents:match?.battle.effectReasons?.mana_threshold||0,
      status:later?'後から得た相手と実戦で接続/同時出撃':any?'実戦で相乗り（既存の相手・再配置を含む）':'実戦での組合せ成立なし',
      retained:[...r.finalBoard.filter(Boolean),...r.rings,...r.items].some(c=>c.name===name),clear:r.clear,reachedWave:r.reachedWave});
  }
  return result;
}
function pairRows(rows){
  const counts=new Map();
  for(const r of rows){const seen=new Map();for(const b of r.battles)for(const p of b.synergy?.pairs||[])if(p.active)seen.set(`${p.token}\0${p.producer}\0${p.consumer}`,p);
    for(const [k,p] of seen){const id=r.policy+'\0'+k;if(!counts.has(id))counts.set(id,{policy:r.policy,type:p.type,token:p.token,producer:p.producer,consumer:p.consumer,runs:0,clearRuns:0,waveSum:0});const s=counts.get(id);s.runs++;s.clearRuns+=+r.clear;s.waveSum+=r.reachedWave;}
  }
  return [...counts.values()].map(s=>({...s,share:s.runs/rows.filter(r=>r.policy===s.policy).length,clearRate:s.clearRuns/s.runs,meanWave:s.waveSum/s.runs})).sort((a,b)=>a.policy.localeCompare(b.policy)||b.runs-a.runs||a.producer.localeCompare(b.producer));
}
function write({rows,meta,out}){
  const {analyze,csv}=require('./run_report'),data=analyze(rows,meta);
  fs.mkdirSync(out,{recursive:true});
  for(const key of ['summaries','stages','resources','cards','combos','archetypes','never','noncontributing']){
    const names={summaries:'policies',never:'never_adopted'};csv(path.join(out,(names[key]||key)+'.csv'),data[key]);
  }
  for(const [category,file] of [['キャラクター','characters'],['エンチャント','enchants'],['指輪','rings'],['アイテム','items']])csv(path.join(out,file+'.csv'),data.cards.filter(c=>c.category===category));
  for(const policy of ['lookahead','planner','all'])csv(path.join(out,(policy==='all'?'all_policy':policy)+'_cards.csv'),data.cards.filter(c=>c.policy===policy));
  const extraction=writeTables(out);
  fs.writeFileSync(path.join(out,'synergy_summary.json'),JSON.stringify(extraction,null,2)+'\n');
  const policies=['lookahead','planner'],by=Object.fromEntries(policies.map(p=>[p,rows.filter(r=>r.policy===p)]));
  const map=new Map(by.lookahead.map(r=>[`${r.seed}:${r.storyCycle}`,r]));
  const pairs=by.planner.map(r=>({a:map.get(`${r.seed}:${r.storyCycle}`),b:r})).filter(p=>p.a);
  const overview={pairs:pairs.length,lookaheadRuns:by.lookahead.length,plannerRuns:by.planner.length,
    beforeClearRate:avg(pairs,p=>+p.a.clear),afterClearRate:avg(pairs,p=>+p.b.clear),
    beforeMeanWave:avg(pairs,p=>p.a.reachedWave),afterMeanWave:avg(pairs,p=>p.b.reachedWave),
    beforeMeanProgress:avg(pairs,p=>p.a.progress),afterMeanProgress:avg(pairs,p=>p.b.progress),
    progressed:pairs.filter(p=>p.b.progress>p.a.progress).length,regressed:pairs.filter(p=>p.b.progress<p.a.progress).length,
    beforeClears:pairs.filter(p=>p.a.clear).length,afterClears:pairs.filter(p=>p.b.clear).length};
  csv(path.join(out,'planner_comparison.csv'),[overview]);
  csv(path.join(out,'planner_seed_pairs.csv'),pairs.map(({a,b})=>({seed:a.seed,storyCycle:a.storyCycle,before:a.status,after:b.status,beforeWave:a.reachedWave,afterWave:b.reachedWave,beforeStage:a.reachedStage,afterStage:b.reachedStage,beforeProgress:a.progress,afterProgress:b.progress})));
  const first=curve(pairs.flatMap(p=>[p.a,p.b])),old=new Map(first.filter(c=>c.policy==='lookahead').map(c=>[`${c.wave}:${c.stage}:${c.type}`,c])),now=new Map(first.filter(c=>c.policy==='planner').map(c=>[`${c.wave}:${c.stage}:${c.type}`,c]));
  const cells=[...new Set([...old.keys(),...now.keys()])].map(key=>{const a=old.get(key),b=now.get(key),c=a||b;return {wave:c.wave,stage:c.stage,type:c.type,beforeN:a?.firstBattles||0,afterN:b?.firstBattles||0,beforeWinRate:a?.winRate??null,afterWinRate:b?.winRate??null,beforeEnemyTotal:a?.enemyTotal??null,afterEnemyTotal:b?.enemyTotal??null,beforeOwnTotal:a?.ownTotal??null,afterOwnTotal:b?.ownTotal??null};}).sort((a,b)=>a.wave-b.wave||a.stage-b.stage);
  csv(path.join(out,'difficulty_curve.csv'),cells);
  const types=policies.flatMap(policy=>ARCHETYPES.map(a=>{const runs=by[policy],completed=runs.filter(r=>r.synergy?.completed.includes(a.id)),clear=runs.filter(r=>r.clear);return {policy,type:a.id,name:a.name,runs:completed.length,total:runs.length,share:completed.length/runs.length,clearRuns:completed.filter(r=>r.clear).length,totalClears:clear.length,clearShare:clear.length?completed.filter(r=>r.clear).length/clear.length:null};}));
  csv(path.join(out,'planner_archetypes.csv'),types);
  const combinations=[];
  for(const policy of policies){const m=new Map();for(const r of by[policy]){const key=r.synergy?.completed.slice().sort().join('+')||'未完成';m.set(key,(m.get(key)||0)+1);}for(const [type,n] of m)combinations.push({policy,type,runs:n,share:n/by[policy].length});}
  csv(path.join(out,'planner_type_combinations.csv'),combinations);
  const combos=pairRows(rows);csv(path.join(out,'planner_combos.csv'),combos);
  const investments=investmentRows(rows);csv(path.join(out,'planner_investments.csv'),investments);
  const histories=by.planner.flatMap(r=>r.planner.history.map((h,index)=>({seed:r.seed,index,wave:h.wave,stage:h.stage,reason:h.reason,dominant:h.dominant,completed:h.completed.join('/'),...h.weights})));
  csv(path.join(out,'planner_strategy_history.csv'),histories);
  const boons=policies.flatMap(policy=>TOWER_IDS.map(id=>{const list=by[policy].flatMap(r=>r.actions.filter(a=>a.type==='boon_purchase'&&a.id===id));return {policy,id,purchases:list.length};}));
  csv(path.join(out,'planner_boons.csv'),boons);
  const updateRuns=by.planner.filter(r=>new Set(r.planner.history.map(h=>h.dominant)).size>1).length;
  let md='# 周回ボット：lookahead → planner\n\n';
  md+=`同じ本体・内蔵シート、種${Math.min(...rows.map(r=>r.seed))}〜${Math.max(...rows.map(r=>r.seed))}、初回旅程、祝福の座あり。魔導店は3枚との1対1交換のみ、カード売却・購入なし。祭壇は本体が認める枚数不足の例外を除き3枚還魂して指輪を取得。${meta.trial?'PvEの新規合体は停止、交換店の道具売却なし。旧比較の記録は退避先に保持する。':'ゲーム本体・index.html・シートは変更していない。旧outの28ファイルはout_before_planner/へバイト一致を確認して退避。'}\n\n`;
  if(meta.towerBoon?.priceBasis==='perBlessing')md+='祝福の価格は祝福ごとの購入回数で200G→500G→1000G→以後+1000G。未購入は200Gのまま。全方針で本体towerBoonChoicePriceを使い、各候補の購入後に80Gを残せるか判定する。\n\n';
  md+=table(['方針','周回','クリア','平均到達St','平均進行 St+マス/100','秒/周','GO / timeout / stalled'],data.summaries.map(s=>[s.policy,s.runs,`${s.clear}/${s.runs} (${pct(s.clearRate)})`,num(s.meanWave),num(s.meanProgress),num(s.msPerRun/1000),`${s.gameover} / ${s.timeout} / ${s.stalled}`]));
  md+=`共通seed ${overview.pairs}組：クリア率 ${pct(overview.beforeClearRate)} → ${pct(overview.afterClearRate)}、平均到達St ${num(overview.beforeMeanWave)} → ${num(overview.afterMeanWave)}。進行が伸びた${overview.progressed}組、短くなった${overview.regressed}組。全体壁時計${num(meta.elapsedMs/1000)}秒、${meta.workers||1}プロセス。秒/周は各ランの壁時計の合計÷周回数（並列競合込み）。時間はJSONLから分離し、種を固定した再現性を守る。\n\n`;
  if(overview.afterClearRate<=overview.beforeClearRate||overview.afterMeanProgress<=overview.beforeMeanProgress)md+='**長期の投資判断が成立することと、周回成績が改善することは分けて扱う。この比較で改善していない指標も上表のとおり残している。**\n\n';
  md+='現状では役割の噛み合いが増えても踏破性能の改善に結び付いていない。残る改善対象はplanner.jsの将来価値の精度（供給量・発動の時期・封印に必要な血・生存までの時間）と、今回採用していない山場での仮想盤面試行。型が成立したという静的な判定だけでは、この不足を解消できない。\n\n';
  md+='## 評価の中身\n\n';
  md+=`同じ敵${meta.lookahead.samples}例を本体のcomputeBattleで試す。plannerの合計点＝目先の点＋将来の点。目先＝${meta.planner.win}×次戦勝率＋${meta.planner.hp}×log(1+味方残HP/max(40,敵開始HP))＋${meta.planner.damage}×log(1+与ダメージ/max(40,敵開始HP))。ライフ1では勝率の係数を${meta.planner.emergencyWin}に上げる。lookaheadの勝率→残HP→与ダメージという比較を、plannerでは将来価値と足せる連続点へ変換した。封印を除く生存HP・勝敗は共通のコア試行から得る。\n\n`;
  md+=`将来＝${meta.planner.fit}×既存の噛み合い＋${meta.planner.option}×未成立の組合せの見込み＋${meta.planner.focus}×型への近さ＋祝福の将来価値。噛み合いは供給と需要の小さい方に稼働率を掛け、型ごとにlog(1+合計)で飽和させる。実際に出撃する本体・接続した強化・装備指輪の稼働率は1、予備/未接続は${meta.planner.reserveWeight}、未使用アイテムは${meta.planner.itemWeight}。本体限定のキーワード数や効果の追加発動は同じ接続先だけを照合する。全体への自傷・追加攻撃は全体供給として扱う。普通の被弾・一度の死亡を弱い供給として加点するが、それだけでは型の完成にしない。\n\n`;
  md+='型は'+ARCHETYPES.map(a=>a.name).join('、')+'の9種。実際の取得・交換・還魂・配置・祝福の後で、盤面の成立度をsoftmaxにかける。温度はmax(0.5, 2.5−St×0.5)で序盤を広く、後半を集中させる。前の重み55%＋今回の推定45%で更新し、型ごとの係数は0.5＋重み×3。主方針が切り替わった自然周回は'+updateRuns+'/'+by.planner.length+'周。選択肢の試行中は重みを固定し、候補を試す順番で学習状態を変えない。履歴はplanner_strategy_history.csv。\n\n';
  md+=`入手見込みは本体の残り旅程（報酬・街の交換）を数え、本体の実装済み/除外フラグ・現在の残在庫・カテゴリ・グレード・レアリティを参照する。_rewardGradeBuckets / _rewardGradeWeights / _rewardRarityWeightsで確率を分解し、ステージ別の分布と序盤のレア制限、黄金の指輪も反映。将来の実ラン乱数・未提示の在庫は見ない。役割の相手を見つける確率P＝1−Π(1−1提示枠で相手を引く確率)^実効提示数。実効提示数＝報酬5枠×${meta.planner.acquireRate}または交換3枠×${meta.planner.exchangeRate}、さらに将来のSt差ごとに${meta.planner.reachDiscount}倍、先の機会ごとに${meta.planner.distanceDiscount}倍。選べる枚数と到達しない危険を割り引く近似で、P×不足側の役割量/(1+既所持の相手量)を将来資産として評価する。\n\n`;
  md+='祝福も同じ次戦＋将来の点で3択を比較する。既存盤面には遡及させず、残り実効提示数/10（上限1）×祝福ごとの価値×(1−1/(1+購入数))を加える。基準値はstats 15、modifiers 10、damage 12、mana/familiarsは6＋関連役割量×7、bossesは撃破済みなら9、rerolls 10。80Gを残し1訪問2回まで。本体が価格・支払い・効果を決める。再抽選は同じ評価の取得改善が0.8点未満なら、本体の権利内で最大3回。\n\n';
  md+=`探索上限は両方とも敵${meta.lookahead.samples}例、報酬上位${meta.lookahead.cardCandidates}枚、基本配置上位${meta.lookahead.placements}箇所＋前後衛、配置替え上位${meta.lookahead.swapCandidates}件＋分散4件、改善${meta.lookahead.arrangePasses}回、還魂上位${meta.lookahead.ringPlans}組、完成配置${meta.lookahead.layoutCandidates}案。交換は全合法候補。plannerは絞込み・配置・還魂にも同じ役割評価を使い、絞込み用のカード役割加点は${meta.planner.prior}倍に抑える。トリプル専用の収集加点はしない。${meta.trial?'本体の試験設定に従い、通常操作でも新規合体を行わない。':'本体が通常操作の結果として行う合体は残す。'}次の山場で仮想カードを追加するコア探索は計算量を抑えるため採用せず、未来の価値は役割と入手見込みの近似。\n\n`;
  md+='## 難易度曲線：各マスの初戦\n\n共通seedのみ、再戦を除く。未到達は勝敗の母数へ入れないため、後半ほど生存者が異なる。選択・交換・再抽選等で本体乱数の消費も変わるので、後の実戦の敵が完全に同一とは限らない。敵/自軍は開始時に記録したATK+HP。自軍は魔導板の予備キャラを含む本体値で、接続・指輪・開戦効果後の戦闘値ではない。\n\n';
  md+=table(['St:マス:種別','初戦数 lookahead→planner','初戦勝率','敵ATK+HP','自軍本体ATK+HP'],cells.map(c=>[`${c.wave}:${c.stage}:${c.type}`,`${c.beforeN}→${c.afterN}`,`${pct(c.beforeWinRate)}→${pct(c.afterWinRate)}`,`${num(c.beforeEnemyTotal)}→${num(c.afterEnemyTotal)}`,`${num(c.beforeOwnTotal)}→${num(c.afterOwnTotal)}`]));
  md+='## 最終盤面の型と多様性\n\n完成判定は、出撃/接続/装備が有効な別の2枚に供給・需要があり、役割強度0.65以上でつながった状態。キーワード数や色なども含む静的な成立判定で、実際のコアで全効果が発動した保証ではない。複数の型が同時に成立するため割合の合計は100%を超え得る。全終了盤面とクリア盤面を分ける。\n\n';
  md+=table(['型','最終盤面 lookahead→planner','全周回比率','クリア盤面 lookahead→planner','クリア内比率'],ARCHETYPES.map(a=>{const x=types.find(t=>t.type===a.id&&t.policy==='lookahead'),y=types.find(t=>t.type===a.id&&t.policy==='planner');return [a.name,`${x.runs}→${y.runs}`,`${pct(x.share)}→${pct(y.share)}`,`${x.clearRuns}→${y.clearRuns}`,`${pct(x.clearShare)}→${pct(y.clearShare)}`];}));
  md+=table(['方針','出現した型の数 / 9','型の併存パターン数','最多パターン比率','未完成'],policies.map(policy=>{const list=combinations.filter(c=>c.policy===policy);return [policy,types.filter(t=>t.policy===policy&&t.runs).length,list.length,pct(Math.max(...list.map(c=>c.share))),pct(list.find(c=>c.type==='未完成')?.share||0)];}));
  if(!by.planner.some(r=>r.clear))md+='plannerのクリア盤面は0件のため、クリアした型の分布・多様性は未評価。敗退を含む最終盤面の成立分布を代わりに明示した。\n\n';
  md+='## よく組まれた組合せ\n\n実際の戦闘開始時に出撃/接続/装備が有効だった組だけ。1組は1ラン1回。役割照合上の組合せで、発動回数・因果的な勝利寄与の順位ではない。全件はplanner_combos.csv。\n\n';
  for(const policy of policies)md+=`### ${policy}\n\n`+table(['供給側','使用側','役割','周回数 / 比率'],combos.filter(c=>c.policy===policy).slice(0,15).map(c=>[c.producer,c.consumer,c.token,`${c.runs} / ${pct(c.share)}`]));
  md+='### planner：色以外の組合せ\n\n'+table(['供給側','使用側','役割','周回数 / 比率'],combos.filter(c=>c.policy==='planner'&&c.type!=='color').slice(0,15).map(c=>[c.producer,c.consumer,c.token,`${c.runs} / ${pct(c.share)}`]));
  md+='## 目先を下げて将来へ投資した実例\n\n';
  md+=`報酬・交換・指輪・道具の選択で、旧lookaheadの比較でも目先の連続点でも劣る候補を、将来点の上積みで選んだ記録は${investments.length}件（別のカードを選んだ${investments.filter(x=>x.card!==x.immediateAlternative).length}件と、同じカードの別配置・還魂の差を含む）。その後、取得時には無かった組合せの相手を新たに得て、実際の戦闘で同時出撃/接続できたのは${investments.filter(x=>x.matchedLater).length}件。既存の相手や再配置を含めて実戦で成立したのは${investments.filter(x=>x.matchedInBattle).length}件。これはカードごとの発動を追跡した因果検証ではなく、役割と接続が実戦盤面で成立した検査。\n\n`;
  const differentCards=investments.filter(x=>x.card!==x.immediateAlternative);
  const examples=[...(differentCards.length?differentCards:investments)].sort((a,b)=>(Number(b.card==='活性化')-Number(a.card==='活性化'))||Number(b.matchedLater)-Number(a.matchedLater)||Number(b.matchedInBattle)-Number(a.matchedInBattle)||a.seed-b.seed).slice(0,8);
  md+=table(['種 / St:マス','取得 ← 目先なら','目先差','将来差','その後'],examples.map(x=>[`${x.seed} / ${x.wave}:${x.stage}`,`${x.card} ← ${x.immediateAlternative}`,num(x.immediateDelta),num(x.futureDelta),`${x.status}${x.partner?`：${x.partner} (${x.token})、St${x.firstMatch} ${x.matchOutcome==='p1'?'勝利':'敗北/引分'}`:''}`]));
  const failed=investments.filter(x=>!x.matchedInBattle).slice(0,3);if(failed.length)md+='成立しなかった例も保持：'+failed.map(x=>`種${x.seed} St${x.wave}:${x.stage}の${x.card}（終了St${x.reachedWave}）`).join('、')+'。全例と保持・到達の結果はplanner_investments.csv。\n\n';
  md+='## 役割の抽出と未対応\n\n';
  md+=`sheet_data.jsのヘッダ名参照で${extraction.cards}枚（効果文あり${extraction.withEffect}枚）を読み、synergy_cards.csvへ出力。キーワードの定義はシートに限定し、効果文のある強化名をキーワードへ混ぜない。未対応の文節を含むカードは${extraction.unknownCards}枚、${extraction.unknownClauses}文節（部分抽出済み・未実装行・荷物の文言も含む）。synergy_unknown.csvに全文と未対応部分を併記。名前で補う例外辞書は使用していない。\n\n`;
  md+=table(['カード','未対応部分'],extraction.examples.map(x=>[x.name,x.text]));
  md+='## 検査と残る限界\n\n';
  const testFile=path.join(out,'SELFTEST.json');if(fs.existsSync(testFile)){const test=JSON.parse(fs.readFileSync(testFile,'utf8'));md+=`run_bot_selftest.js：${test.passed?'合格':'不合格'}、${test.checks.length}項目。\n\n`+test.checks.map(t=>'- '+t).join('\n')+'\n\n';}else md+='自己テストの結果はSELFTEST.json生成後にこの報告を再生成する。\n\n';
  md+='将来分布は各枠を独立とする近似で、1提示内の同名重複不可・封印1枚上限・高レア上限・キャラ/強化保証・祝福6によるボス置換・将来の指輪/アイテム提示の確率は未モデル化。現在の在庫不足は反映するが、将来の他カード取得による在庫変化までは再演しない。死亡の敵/味方、マナ供給のタイミング、封印の血の必要量、複数段階のエンジン循環は粗い役割分類に留まる。祝福の係数・型の温度・重みはAIの近似値で、カード効果の数値ではない。\n\n';
  md+='種1〜30の試走と初回200組で過剰投資による到達低下を確認し、既存の型への加点・絞込みへの影響を抑えた。種201〜220でも試走した。最終200組の種は初回評価と重複しており、調整に使っていない種での独立した大規模検証は未実施。全クリア率や後半の少数例から人間のプレイにおけるカードの強弱は断定しない。画面・音・file://実機・セーブ復元・オンライン対戦の実機は未確認。ゲーム本体は編集していない。\n\n';
  md+='調整用定数（planner.js LIMITS）：\n\n```json\n'+JSON.stringify(meta.planner,null,2)+'\n```\n\n';
  md+='## 再実行\n\n```sh\nnode tools/balance_sim/synergy.js --out tools/balance_sim/out\nnode tools/balance_sim/run_bot.js --runs 200 --policy lookahead,planner --seed 1 --workers 4 --tower-boon on --out tools/balance_sim/out\nnode tools/balance_sim/run_bot_selftest.js --input tools/balance_sim/out\nnode tools/balance_sim/run_report.js --input tools/balance_sim/out\nVB_REPORT_PATH=/tmp/vb-balance-report.md node tools/balance_sim/run.js 5\nnode tools/parity/tower_boon_check.js\n```\n';
  fs.writeFileSync(path.join(out,'RUN_REPORT.md'),md);
  return {rows:rows.length,summary:data.summaries,comparison:overview,extraction,investments:investments.length};
}
const TOWER_IDS=['stats','modifiers','damage','mana','familiars','bosses','rerolls'];
module.exports={write,investmentRows,pairRows};
