#!/usr/bin/env node
'use strict';
// ブラウザは通常のscript登録、移植先はこのJSONを読む。定義ファイルはJSONリテラルだけ。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
// 数値配列も読める改行形式を保ちつつ、配布JSONの空白を抑える。
const JSON_INDENT=1;
const DEFINITION_SCRIPTS=['js/vfx/schema.js','js/vfx/defs/geometry.js','js/vfx/defs/effects.js','js/vfx/defs/webp_geometry.js','js/vfx/defs/webp.js'];
const RUNTIME_SCRIPTS=['js/vfx/schema.js','js/vfx/curves.js','js/vfx/textures.js','js/vfx/defs/geometry.js','js/vfx/defs/effects.js','js/vfx/defs/webp_geometry.js','js/vfx/defs/webp.js','js/vfx/renderer.js','js/engine/fx_lab.js'];
function uncomment(source){
  let out='',quote=false,escape=false;
  for(let i=0;i<source.length;i++){
    const c=source[i],next=source[i+1];
    if(quote){out+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quote=false;continue;}
    if(c==='"'){quote=true;out+=c;continue;}
    if(c==='/'&&next==='/'){while(i<source.length&&source[i]!=='\n')i++;out+='\n';continue;}
    if(c==='/'&&next==='*'){i+=2;while(i<source.length&&!(source[i]==='*'&&source[i+1]==='/'))i++;assert.ok(i<source.length,'未閉鎖のコメント');i++;out+=' ';continue;}
    out+=c;
  }
  assert.ok(!quote,'未閉鎖の文字列');return out.trim();
}
function literalDefinition(source,file){
  const match=uncomment(source).match(/^VbFxDefs\.register\(([\s\S]*)\);$/);
  assert.ok(match,file+' は単一のJSON登録でなければならない');
  let data;try{data=JSON.parse(match[1]);}catch(e){throw new Error(file+' に式・プログラム構文があります: '+e.message);}
  return data;
}
function loadDefinitions(){
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(ROOT,DEFINITION_SCRIPTS[0]),'utf8'),context,{filename:DEFINITION_SCRIPTS[0]});
  for(const file of DEFINITION_SCRIPTS.slice(1)){
    const data=literalDefinition(fs.readFileSync(path.join(ROOT,file),'utf8'),file);
    vm.runInContext('VbFxDefs.register('+JSON.stringify(data)+');',context,{filename:file});
  }
  return context.VbFxDefs;
}
function equalValues(a,b,at='defs'){
  if(a===null||typeof a!=='object'){assert.ok(Object.is(a,b),at+' がJSON往復で変化');return;}
  assert.equal(Array.isArray(a),Array.isArray(b),at);
  assert.deepEqual(Object.keys(a),Object.keys(b),at+' のキーが変化');
  for(const key of Object.keys(a))equalValues(a[key],b[key],at+'.'+key);
}
function validatedBundle(){
  assert.equal(fs.existsSync(path.join(ROOT,'js/vfx/graph.js')),false,'汎用インタプリタが残っています');
  const registry=loadDefinitions(),counts=registry.validate(),original=registry.bundle(),text=JSON.stringify(original),copy=JSON.parse(text);
  equalValues(original,copy);
  const roundTrip=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(ROOT,'js/vfx/schema.js'),'utf8'),roundTrip);
  vm.runInContext('VbFxDefs.register('+text+');VbFxDefs.validate();',roundTrip);
  assert.equal(JSON.stringify(roundTrip.VbFxDefs.bundle()),text,'JSONの再登録結果が変化');
  // 許可リストで各値を検査した上で、以前の実行形式も明示的に禁止する。
  const forbidden=new Set(['programs','when','let','call','assign','return','args','bindings','component','expression','kind']);
  function walk(value,at){
    if(!value||typeof value!=='object')return;
    for(const [key,child]of Object.entries(value)){assert.ok(!forbidden.has(key),at+'.'+key+' に実行形式があります');walk(child,at+'.'+key);}
  }
  walk(copy,'bundle');
  const sourceBytes=DEFINITION_SCRIPTS.slice(1).reduce((sum,file)=>sum+fs.statSync(path.join(ROOT,file)).size,0);
  const jsonBytes=Buffer.byteLength(JSON.stringify(copy,null,JSON_INDENT)+'\n');
  // 分布・複数材質・縁の減衰を省略せず宣言するための上限。描画コードや画像は含めない。
  assert.ok(jsonBytes<=1000000,'定義JSONが1MBを超えています');
  return {bundle:copy,counts,sourceBytes,jsonBytes};
}
function main(){
  const {bundle,counts,sourceBytes,jsonBytes}=validatedBundle(),output=path.join(ROOT,'tools/vfx_export/vfx_defs.json');
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(bundle,null,JSON_INDENT)+'\n');
  console.log(`${counts.effects}効果 / ${counts.layers}層 / ${counts.shapes}図形 / ${counts.types}部品型: 許可リスト・リテラル・式/構文木なし・JSON往復 OK`);
  console.log(`定義JS合計 ${sourceBytes} bytes / JSON ${jsonBytes} bytes → ${path.relative(ROOT,output)}`);
}
if(require.main===module)main();
module.exports={DEFINITION_SCRIPTS,RUNTIME_SCRIPTS,loadDefinitions,validatedBundle,equalValues,literalDefinition};
