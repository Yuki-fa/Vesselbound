#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {initialize}=require('./run_bot'),{isolated,hash}=require('./bot_sandbox');
async function probe(samples=30){
  await initialize();
  const base=await isolated(()=>{
    initState();G._wave=2;G._waveStage=1;G._waveLife=3;G.life=3;G.gold=1000;G._runSeed=1;G._runRngState=1;
    const def=ENEMY_POOL.find(d=>d.bossOnly),unit={id:'shop-probe-boss',name:def.name,no:def.no,artCode:def.artCode,boss:true};
    towerBoonRecordBattleDeaths([{type:'death',side:'p2',unitId:unit.id}],[unit]);
    assert.equal(towerBoonChoose('bosses'),true);return structuredClone(G);
  },{seed:913});
  const cases=[];
  for(let i=0;i<samples;i++)cases.push(await isolated(()=>{
    G._runSeed=hash(`shop-boon:${i}`);G._isWaveAltar=false;G._isVillageMenu=true;G._waveShopStock={};G._waveFacilityCache={};
    const raw=runWithKeyedRandom(`test-shop:${i}`,()=>_ensureWaveShopStock()),bosses=raw.filter(c=>c?._towerBoonBoss);
    openMapShop();return {seed:hash(`shop-boon:${i}`),generated:bosses.length,offered:_rewCards.filter(c=>c?._towerBoonBoss).length,
      generatedCards:bosses.map(c=>({name:c.name,id:c.id,sheetSeen:!!c._sheetSeen,implemented:_isImplementedPoolCard(c)}))};
  },{state:base,seed:hash(`shop-boon:${i}`)}));
  const generated=cases.reduce((s,c)=>s+c.generated,0),offered=cases.reduce((s,c)=>s+c.offered,0);
  assert.ok(generated>0,'本体のショップ生成でボスを抽選する');
  assert.equal(offered,generated,'祝福6のボスが交換店の提示へ残る');
  return {samples,generated,offered,cases,knownIssue:null,
    source:'js/engine/map.js:openMapShop / js/engine/tower_boon.js:towerBoonMakeBossCard / js/engine/pool.js:_isImplementedPoolCard'};
}
if(require.main===module)probe().then(result=>{const out=process.argv[2]||path.join(__dirname,'out/boon_shop_probe.json');fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(`ショップ祝福6: ${result.samples}店舗 生成${result.generated} 提示${result.offered} → ${out}`);}).catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={probe};
