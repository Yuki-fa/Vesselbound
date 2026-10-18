#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const engine=require('./fixed_engine'),{runJobs}=require('./fixed_pool');
function best(a,b){return a.winRate>b.winRate||a.winRate===b.winRate&&(a.meanHp>b.meanHp||a.meanHp===b.meanHp&&a.meanDamage>b.meanDamage);}
function metric(r){return {wins:r.points.reduce((s,p)=>s+p.win,0),n:r.points.length,winRate:r.winRate,meanHp:r.meanHp,meanDamage:r.meanDamage};}
function startStats(initial){return JSON.stringify(initial.units.p1.map(u=>u?{atk:u.atk,hp:u.hp,maxHp:u.maxHp,shield:u.shield,poison:u.poison,lane:u.lane,keywords:u.keywords}:null));}
async function compareJob(job){
  await engine.initialize();engine.resetOverride(job.override);
  const scene=engine.sceneById(job.scene),allForms=await engine.cardForms(job.cardSeed),forms=allForms.filter(f=>job.keys.includes(f.key));
  const training=await engine.enemySamples(scene,job.searchSamples,job.seed,'connection'),samples=await engine.enemySamples(scene,job.samples,job.seed,'evaluation');
  const added=new Set((job.override?.add||[]).map(c=>c.name)),rows=[];
  for(const board of job.boards){
    const setupSeed=engine.hash(`fixed-formation:${board.id}`),options={preparedItems:board.preparedItems,setupSeed};
    const base=await engine.evaluate(board.state,scene,samples,options),searchBase=await engine.evaluate(board.state,scene,training,options);
    for(const form of forms){
      const candidates=await engine.placements(board.state,form);if(!candidates.length)throw new Error(`${board.id}/${form.name}: 比較用の置き場所がない`);
      let choice=candidates[0],searchResult=null;const connections=[];
      if(form.category==='エンチャント')for(const place of candidates){
        const result=await engine.evaluate(board.state,scene,training,{...options,mutate:()=>{G.mainBoard[place.slot]=engine.copy(place.card);}});
        connections.push({slot:place.slot,targets:place.targets,replaced:place.replaced,...metric(result),gainWinPt:100*(result.winRate-searchBase.winRate)});
        if(!searchResult||best(result,searchResult)){choice=place;searchResult=result;}
      }
      const actual=await engine.evaluate(board.state,scene,samples,{...options,mutate:()=>{G.mainBoard[choice.slot]=engine.copy(choice.card);}});
      const blankCard=engine.ablated(choice.card),blank=await engine.evaluate(board.state,scene,samples,{...options,mutate:()=>{G.mainBoard[choice.slot]=engine.copy(blankCard);}});
      const eventChanged=actual.points.map((p,i)=>p.digest!==blank.points[i].digest);
      const text=String(form.card.desc||'').replace(/[\s　]/g,''),keywordOnly=text&&text===(form.card.keywords||[]).join('').replace(/[\s　]/g,'');
      rows.push({scene:scene.id,board:board.id,cardKey:form.key,baseId:form.baseId,name:form.name,category:form.category,form:form.form,rarity:form.rarity,grade:form.grade,price:form.price,temporary:added.has(form.card.name.replace(/\+$/,'')),
        desc:form.card.desc||'',effectText:!!text&&!keywordOnly,directions:choice.card.directions,slot:choice.slot,replaced:choice.replaced,targets:choice.targets,
        n:samples.length,baseline:metric(base),actual:metric(actual),gainWinPt:100*(actual.winRate-base.winRate),gainHp:actual.meanHp-base.meanHp,gainDamage:actual.meanDamage-base.meanDamage,
        baseWins:base.points.map(p=>p.win),wins:actual.points.map(p=>p.win),hpDeltas:actual.points.map((p,i)=>p.hp-base.points[i].hp),damageDeltas:actual.points.map((p,i)=>p.damage-base.points[i].damage),
        eventChangedCases:eventChanged.filter(Boolean).length,formationChanged:startStats(actual.initial)!==startStats(blank.initial),
        blankWins:blank.points.map(p=>p.win),connections,searchBaseline:metric(searchBase)});
    }
  }
  return rows;
}
function options(args){const o={boards:path.join(__dirname,'fixed'),out:path.join(__dirname,'fixed'),samples:30,searchSamples:30,seed:7411,cardSeed:1701,workers:4};
  for(let i=0;i<args.length;i++){const key={'--boards':'boards','--out':'out','--samples':'samples','--search-samples':'searchSamples','--seed':'seed','--card-seed':'cardSeed','--workers':'workers','--override':'overrideFile','--cards':'cards','--scenes':'scenes'}[args[i]];if(!key||args[i+1]===undefined)throw new Error(`不正な引数: ${args[i]}`);o[key]=args[++i];}
  for(const k of ['samples','searchSamples','seed','cardSeed','workers'])o[k]=Number(o[k]);
  if(!Number.isInteger(o.samples)||o.samples<20||!Number.isInteger(o.searchSamples)||o.searchSamples<20||!Number.isInteger(o.workers)||o.workers<1||o.workers>8)throw new Error('samples/search-samples>=20、workers=1〜8 が必要');return o;
}
async function main(args=process.argv.slice(2)){
  const o=options(args),start=performance.now();await engine.initialize();const override=engine.overrides.readOverride(o.overrideFile),notes=engine.resetOverride(override),forms=await engine.cardForms(o.cardSeed);
  const wanted=o.cards?.split(','),scenes=o.scenes?o.scenes.split(',').map(engine.sceneById):engine.SCENES,used=forms.filter(f=>!wanted||wanted.includes(f.name)||wanted.includes(f.baseId));
  if(!used.length)throw new Error('対象カードが0件');fs.mkdirSync(o.out,{recursive:true});
  const jobs=[],boardFiles=[];
  for(const scene of scenes){const file=path.join(o.boards,`boards_${scene.id}.json`),data=JSON.parse(fs.readFileSync(file,'utf8'));boardFiles.push({file:path.basename(file),hash:engine.sha(fs.readFileSync(file,'utf8')),count:data.boards.length});
    for(let i=0;i<used.length;i+=6)jobs.push({kind:'compare',scene:scene.id,boards:data.boards,keys:used.slice(i,i+6).map(f=>f.key),seed:o.seed,cardSeed:o.cardSeed,samples:o.samples,searchSamples:o.searchSamples,override});
  }
  console.log(`固定比較 ${scenes.length}場面 × ${used.length}形態、評価${o.samples}例・接続選択${o.searchSamples}例、${o.workers}プロセス`);
  const rows=(await runJobs(jobs,{workers:o.workers,label:'固定カード比較'})).flat().sort((a,b)=>a.scene.localeCompare(b.scene)||a.cardKey.localeCompare(b.cardKey)||a.board.localeCompare(b.board));
  fs.writeFileSync(path.join(o.out,'comparisons.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  const manifestFile=path.join(o.boards,'boards_manifest.json');
  const boardProvenance=fs.existsSync(manifestFile)?{manifestHash:engine.sha(fs.readFileSync(manifestFile,'utf8')),selectionSourceHashes:JSON.parse(fs.readFileSync(manifestFile,'utf8')).sourceHashes}:null;
  const meta={schemaVersion:1,options:o,elapsedMs:performance.now()-start,completed:rows.length,forms:used.map(({card,...f})=>f),override,overrideNotes:notes.map(n=>({operation:n.operation,name:n.name,patch:n.patch})),boardFiles,boardProvenance,sourceHashes:engine.sourceHashes(),toolHashes:engine.toolHashes(),
    samples:{selection:o.searchSamples,evaluation:o.samples,independentPartitions:true},rules:{weakCharacter:'出撃中キャラの本体ATK+HP最小、同点はマス番号。元キャラの向きを継承。',enchant:'空きマス全てと、隣接ATK+HP・レア度・マス番号で最弱の既存エンチャント1枚。実際の本体接続を列挙。提示時の向きを固定。',choice:'独立した接続選択サンプルで勝率→残HP→与ダメージを比較し、別の評価サンプルで差を測定。',forms:'シート基準の通常形（G1を含む全グレード）と本体の3枚合体。シートG2以上をG1へ改変しない。',damage:'コアdamageイベントの敵側amount合計（オーバーキルを含む）。',hp:'coreLivingUnitsが返す行動可能な生存味方のHP合計。封印中は除く。'}};
  fs.writeFileSync(path.join(o.out,'compare_meta.json'),JSON.stringify(meta,null,2)+'\n');
  const {writeReport}=require('./fixed_report');writeReport(o.out,o.boards);console.log(`固定比較完了 ${(meta.elapsedMs/1000).toFixed(2)}秒、${rows.length}比較 → ${o.out}`);return {rows,meta};
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={main,compareJob,options,metric};
