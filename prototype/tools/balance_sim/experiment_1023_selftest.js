#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const experiment=require('./experiment_1023');

async function main(){
  const engine=require('./fixed_engine');
  await engine.initialize();
  const floorBefore={};
  for(const [map,values] of Object.entries(experiment.CURRENT_DEEP))
    floorBefore[map]=values.map((_,i)=>FLOOR_DATA[floorForMapDeep(map,i+1)].mult);

  experiment.applyDeep('deep_standard');
  assert.equal(FLOOR_DATA[floorForMapDeep(3,3)].mult,3.2,'標準候補の3層3段を適用できる');
  assert.ok(FLOOR_DATA[floorForMapDeep(3,2)].mult<FLOOR_DATA[floorForMapDeep(3,3)].mult);
  assert.ok(FLOOR_DATA[floorForMapDeep(3,3)].mult<FLOOR_DATA[floorForMapDeep(3,4)].mult);
  assert.equal(floorBefore[3][2],4,'検査開始時のシート値を確認');
  console.log('OK 深層候補：現行3層3段4.0を標準3.2へメモリ上だけ差し替え');

  await experiment.install(experiment.SPECS.gold50);
  const row=await require('./run_bot').simulateRun({seed:4001,policy:'greedy'});
  const first=row.battles.find(b=>!b.retry);
  assert.ok(first,'固定収入の周回に初戦がある');
  assert.equal(first.goldAfter-first.goldBefore,50,'追加のカード効果がない初戦では固定50Gになる');
  assert.equal(row.experiment1023,undefined,'selftestの戻り値は実験CLIの行と同じ本体行');
  console.log('OK 固定収入：seed 4001の初戦勝利へ50Gを付与し、ゲーム本体ファイルを変更しない');
}

if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
module.exports={main};
