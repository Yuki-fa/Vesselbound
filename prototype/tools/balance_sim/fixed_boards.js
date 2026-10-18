#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const engine=require('./fixed_engine'),{runJobs}=require('./fixed_pool');
function collect(rows){
  const records=[];const seen=new Set();
  for(const row of rows.slice().sort((a,b)=>(a.policy==='lookahead'?-1:0)-(b.policy==='lookahead'?-1:0)||a.seed-b.seed||a.policy.localeCompare(b.policy)))for(const b of row.battles){
    const scene=engine.SCENES.find(s=>s.wave===b.wave&&s.stage===b.stage);if(!scene||b.retry)continue;
    const rings=row.acquisitions.filter(a=>a.card.category==='指輪'&&(a.wave<b.wave||a.wave===b.wave&&a.stage<b.stage)).map(a=>a.card);
    const sig=engine.signature(b.board),key=`${scene.id}:${sig}:${b.lifeBefore}:${b.goldBefore}:${rings.map(r=>r.name).join(',')}`;if(seen.has(key))continue;seen.add(key);
    records.push({key,scene:scene.id,policy:row.policy,seed:row.seed,storyCycle:row.storyCycle,battleIndex:b.index,board:b.board,life:b.lifeBefore,gold:b.goldBefore,rings,outcome:b.outcome,features:engine.features(b.board)});
  }
  return records;
}
function diverse(candidates,count){
  const left=candidates.slice(),chosen=[],usedMain=new Map(),usedColors=new Map(),usedPatterns=new Map();
  const colorPattern=c=>{const total=Object.values(c.features.colors).reduce((s,n)=>s+n,0)||1;return Object.keys(c.features.colors).sort().map(k=>`${k}:${(c.features.colors[k]/total).toFixed(3)}`).join('|');};
  while(chosen.length<count&&left.length){
    left.sort((a,b)=>rank(b)-rank(a)||a.seed-b.seed||String(a.key).localeCompare(String(b.key)));
    const c=left.shift();chosen.push(c);for(const name of c.features.main)usedMain.set(name,(usedMain.get(name)||0)+1);
    for(const color of Object.keys(c.features.colors))usedColors.set(color,(usedColors.get(color)||0)+1);
    const pattern=colorPattern(c);usedPatterns.set(pattern,(usedPatterns.get(pattern)||0)+1);
  }
  function rank(c){const colors=Object.keys(c.features.colors);return (c.policy==='lookahead'||c.source?.policy==='lookahead'?1:0)+c.features.main.reduce((s,n)=>s+4/(1+(usedMain.get(n)||0)),0)+4/(1+(usedPatterns.get(colorPattern(c))||0))+colors.reduce((s,n)=>s+2/(1+(usedColors.get(n)||0)),0)/Math.max(1,colors.length)-Math.abs((c.baseline?.winRate??c.screen?.winRate??0.5)-0.5);}
  return chosen;
}
function opts(args){const o={input:path.join(__dirname,'out/runs.jsonl'),out:path.join(__dirname,'fixed'),samples:30,count:5,seed:3101,workers:4,candidates:96};
  for(let i=0;i<args.length;i++){const key={'--input':'input','--out':'out','--samples':'samples','--count':'count','--seed':'seed','--workers':'workers','--candidates':'candidates'}[args[i]];if(!key||args[i+1]===undefined)throw new Error(`不正な引数: ${args[i]}`);o[key]=args[++i];}
  for(const k of ['samples','count','seed','workers','candidates'])o[k]=Number(o[k]);
  if(!Number.isInteger(o.samples)||o.samples<20||o.count<5||o.count>8||o.workers<1||o.workers>8)throw new Error('samples>=20、count=5〜8、workers=1〜8 が必要');return o;}
async function main(args=process.argv.slice(2)){
  const o=opts(args),start=performance.now();await engine.initialize();fs.mkdirSync(o.out,{recursive:true});
  const input=fs.readFileSync(o.input,'utf8'),rows=input.trim().split('\n').map(JSON.parse),records=collect(rows),jobs=[];
  const chosenPool=[];
  for(const scene of engine.SCENES){const all=records.filter(r=>r.scene===scene.id),subset=diverse(all,Math.min(o.candidates,all.length));chosenPool.push(...subset);for(let i=0;i<subset.length;i+=12)jobs.push({kind:'screen',scene:scene.id,seed:o.seed,samples:o.samples,records:subset.slice(i,i+12)});console.log(`${scene.id} 実盤面${all.length}件、予備選定${subset.length}件`);}
  const screened=(await runJobs(jobs,{workers:o.workers,label:'盤面30サンプル予備検査'})).flat();
  fs.writeFileSync(path.join(o.out,'selection_screen.json'),JSON.stringify({seed:o.seed,samples:o.samples,inputHash:engine.sha(input),records:screened})+'\n');
  const candidates=screened.filter(r=>r.screen.winRate>=.25&&r.screen.winRate<=.75);
  const capturePool=[];for(const scene of engine.SCENES){const valid=candidates.filter(r=>r.scene===scene.id);console.log(`${scene.id} 25〜75%の候補 ${valid.length}`);const picks=diverse(valid,Math.min(o.count+3,valid.length));
    if(picks.length<o.count+3){const near=screened.filter(r=>r.scene===scene.id&&r.screen.winRate<.25&&!picks.includes(r)).sort((a,b)=>b.screen.winRate-a.screen.winRate||a.seed-b.seed);picks.push(...near.slice(0,o.count+3-picks.length));}capturePool.push(...picks);}
  const sources=new Map();for(const r of capturePool)sources.set(`${r.policy}:${r.seed}`,rows.find(row=>row.policy===r.policy&&row.seed===r.seed));
  const captures=(await runJobs([...sources.values()].map(record=>({kind:'capture',record})),{workers:o.workers,label:'元周回の完全一致再実行・完全状態採取'})).flat();
  const full=capturePool.map(r=>{const snapshot=captures.find(c=>c.scene===r.scene&&c.source.policy===r.policy&&c.source.seed===r.seed);if(!snapshot)throw new Error(`開戦前の状態が取れない: ${r.key}`);return {...r,...snapshot,features:engine.features(snapshot.board)};});
  const validationJobs=engine.SCENES.map(scene=>({kind:'validate',scene:scene.id,seed:o.seed,samples:o.samples,boards:full.filter(b=>b.scene===scene.id)}));
  const verified=(await runJobs(validationJobs,{workers:o.workers,label:'完全状態の基準勝率検査'})).flat();
  fs.writeFileSync(path.join(o.out,'selection_captures.json'),JSON.stringify({seed:o.seed,samples:o.samples,inputHash:engine.sha(input),boards:verified})+'\n');
  const augmentJobs=[];
  for(const scene of engine.SCENES){const valid=verified.filter(b=>b.scene===scene.id&&b.baseline.winRate>=.25&&b.baseline.winRate<=.75);
    if(valid.length<o.count){const weak=verified.filter(b=>b.scene===scene.id&&b.baseline.winRate<.25).sort((a,b)=>b.baseline.winRate-a.baseline.winRate).slice(0,4);for(const board of weak)augmentJobs.push({kind:'augment',scene:scene.id,seed:o.seed,samples:o.samples,board});}}
  if(augmentJobs.length)verified.push(...(await runJobs(augmentJobs,{workers:o.workers,label:'不足する盤面へ本体カードを追加'})).flat());
  const selected=[];
  for(const scene of engine.SCENES){const valid=verified.filter(b=>b.scene===scene.id&&b.baseline.winRate>=.25&&b.baseline.winRate<=.75);let boards=diverse(valid,o.count);
    if(boards.length<o.count)throw new Error(`${scene.id}: 本体カードを追加しても中間勝率の盤面が${boards.length}枚。追加探索が必要`);
    boards=boards.map((b,i)=>({...b,id:`${scene.id}_${i+1}`,key:b.key}));selected.push(...boards);
    fs.writeFileSync(path.join(o.out,`boards_${scene.id}.json`),JSON.stringify({schemaVersion:1,scene,seed:o.seed,samples:o.samples,partition:'selection',boards},null,2)+'\n');
    console.log(`${scene.id} 保存 ${boards.map(b=>`${b.id}=${(100*b.baseline.winRate).toFixed(1)}%`).join(' ')}`);
  }
  const manifest={schemaVersion:1,options:o,elapsedMs:performance.now()-start,inputHash:engine.sha(input),sourceHashes:engine.sourceHashes(),candidateCounts:Object.fromEntries(engine.SCENES.map(s=>[s.id,records.filter(r=>r.scene===s.id).length])),screened:screened.map(r=>({scene:r.scene,policy:r.policy,seed:r.seed,key:r.key,winRate:r.screen.winRate})),boards:selected.map(b=>({id:b.id,scene:b.scene,source:b.source,winRate:b.baseline.winRate,features:b.features,additions:b.additions||[]})),construction:'実周回の非再戦の開戦直前。JSONLで予備評価し、元seedを完全一致再実行して本体の正式なラン保存対象・開戦アイテムを採取。不足時のみ本体の通常／3枚合体カードを空きマスへ追加。既存カードの数値・方向は維持。'};
  fs.writeFileSync(path.join(o.out,'boards_manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(`盤面選定完了 ${(manifest.elapsedMs/1000).toFixed(2)}秒`);return manifest;
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={main,collect,diverse};
