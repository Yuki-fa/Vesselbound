'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
let installed=false;
function extendCacheInputs(api){
  if(installed)return;installed=true;
  // 元ファイルは保存済みoutのハッシュ契約の対象。ディスクを変更せず、
  // 実験用の追加資源だけを両キャッシュの入力に含めた同じモジュールを使う。
  for(const [name,from,to] of [
    ['lookahead','state.panelColorPermanentBuffs,','state.panelColorPermanentBuffs,Number(state._experimentCarryMana)||0,'],
    ['planner_horizon','G.gold,G._waveLife,','G.gold,G._waveLife,Number(G._experimentCarryMana)||0,'],
  ]){
    const file=path.join(__dirname,name+'.js'),original=fs.readFileSync(file,'utf8');
    if(original.split(from).length!==2)throw Error('先読みキャッシュの境界が変わった: '+name);
    const target=require('./'+name),replacement=new Module(file,module);replacement.filename=file;replacement.paths=module.paths;
    replacement._compile(original.replace(from,to),file);
    Object.assign(target,replacement.exports);
  }
  require('./lookahead').configure({ring:api.takeRing});
}
module.exports={extendCacheInputs};
