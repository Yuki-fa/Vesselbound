'use strict';
// 元画像の方向性・品質は撮影画像で目視する。この検査は接続・尺・描画・復元を確かめる。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {validatedBundle}=require('../vfx_export');
const {harness,traceQuality}=require('./vfx_data_regression');
const ROOT=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const manifest=JSON.parse(read('tools/vfx_capture/webp_manifest.json'));
async function run(){
  const {bundle}=validatedBundle(),effects=bundle.effects.filter(d=>manifest.effects.some(ref=>ref.name===d.name)),names=effects.map(d=>d.name);
  assert.equal(bundle.effects.filter(d=>!d.sourceCode).length,50,'第1段の50種を保持');
  assert.deepEqual(names,manifest.effects.map(d=>d.name),'参考一覧と書き出し定義の対応');
  assert.deepEqual(read('tools/vfx_capture/webp_targets.txt').trim().split(/\r?\n/),names,'撮影対象の順序');
  const assets=fs.readdirSync(path.join(ROOT,'assets/vfx')).filter(f=>f.endsWith('.webp')).map(f=>f.slice(0,-5)).sort();
  assert.deepEqual([...new Set(manifest.effects.map(d=>d.asset).concat(manifest.excluded.map(d=>d.asset)))].sort(),assets,'全WebPを対象または除外理由に分類');
  const game=read('assets.js')+read('js/engine/render.js')+read('js/engine/map.js')+read('js/engine/battle.js');
  for(const effect of effects){
    assert.ok(game.includes('vfx:'+effect.sourceCode+':'+effect.name),effect.name+' を実際の入口に登録');
    assert.ok(!effect.layers.some(layer=>layer.type==='sprite'),effect.name+' は画像部品を含まない');
    const ref=JSON.parse(read('tools/vfx_capture/refs/'+effect.sourceCode+'/reference.json'));
    assert.equal(ref.times.length,8); assert.equal(ref.indices.length,8);
    // 切り出した参照画像（frame_*.png）は作り直せる生成物なので本体には入れない（2026-10-13。tools/vfx_capture/extract_refs.py で作る）。
    // 手元に作ってある時だけ、8コマ揃っているかを確かめる。
    if(fs.existsSync(path.join(ROOT,'tools/vfx_capture/refs',effect.sourceCode,'frame_0.png')))
      for(let i=0;i<8;i++)assert.ok(fs.existsSync(path.join(ROOT,'tools/vfx_capture/refs',effect.sourceCode,'frame_'+i+'.png')));
  }
  const schema=read('js/vfx/schema.js');
  for(const change of [d=>{d.effects[0].sourceCode='K003;call()';},d=>{d.effects[0].playback.baseSize=0;},d=>{d.effects[0].playback.baseSize=33;}]){
    const bad=JSON.parse(JSON.stringify(bundle)),ctx=vm.createContext({});change(bad);vm.runInContext(schema,ctx);
    assert.throws(()=>vm.runInContext('VbFxDefs.register('+JSON.stringify(bad)+');',ctx));
  }
  console.log('OK 画像一覧の全件分類・32定義のJSON/許可リスト・参考8コマ・ゲーム接続');
  const first=harness(false),second=harness(false);
  for(const effect of effects){
    const expected=manifest.effects.find(d=>d.name===effect.name).playbackMs;
    assert.equal(first.fx.duration(effect.name,1.5),expected,effect.name+' の基準尺');
    assert.equal(first.fx.impactMs(effect.name,1.5),effect.impact.cueMs/1.5,effect.name+' の合図');
    const pending=[];
    for(const h of [first,second]){
      h.fx.stopAll();h.step(0);
      pending.push(h.fx.play(effect.name,{source:h.source,targets:[h.source],speed:1.5,seed:53,dir:1}));
    }
    let draws=0;
    for(let i=0;i<=8;i++){
      const a=first.step(expected*i/8),b=second.step(expected*i/8);
      draws+=traceQuality(a,effect.name);assert.deepEqual(a,b,effect.name+' の決定性');
    }
    assert.ok(draws>0,effect.name+' の描画が空');
    first.fx.stopAll();second.fx.stopAll();await Promise.all(pending);
    assert.equal(first.fx.activeCount(),0);assert.equal(first.body.children.length,0);
    console.log('OK 新定義 '+effect.name+'（尺・合図・9時刻・有限値・seed・後始末）');
  }
  // 効果全体が描けても、材質の不足で一層だけ空になることを見逃さない。
  // 実際の共通レンダラーで層を単独再生し、出力Canvasへの不透明な描画を数える。
  // カードの明るさ・揺れ（card/shake）はCanvasへ描かずDOMへ効くので、描画の有無を数える対象から外す（2026-10-14）。
  const layers=effects.flatMap(effect=>effect.layers.map((layer,index)=>({layer,index})).filter(x=>x.layer.type!=='card'&&x.layer.type!=='shake').map(({layer,index})=>({
    ...effect,name:'audit-'+effect.name+'-'+index,label:'層検査 '+effect.name+' '+index,layers:[layer]
  })));
  const audit=harness(false,{schemaVersion:2,effects:layers});let paints=0,paintContext;
  for(const effect of layers){
    const durationMs=effect.ms/1.5;
    audit.step(0);
    const pending=audit.fx.play(effect.name,{source:audit.source,targets:[audit.source],durationMs,seed:53,dir:1});
    audit.step(0);
    const output=audit.contexts.filter(c=>c.canvas&&c.canvas.dataset.vbFxCanvas).at(-1);
    assert.ok(output,'層検査の出力Canvas');
    if(paintContext!==output){
      paintContext=output;
      for(const method of ['drawImage','fill','stroke','fillRect']){
        const original=output[method];
        output[method]=(...args)=>{if(output.globalAlpha>0)paints++;return original(...args);};
      }
    }
    paints=0;
    for(let i=1;i<16;i++)traceQuality(audit.step(durationMs*i/16),effect.label);
    assert.ok(paints>0,effect.label+' が一度も描画されない（材質・寸法・時間区間を確認）');
    audit.fx.stopAll();await pending;
  }
  console.log('OK 新定義の全'+layers.length+'層が出力Canvasへ描画（単独・15時刻・有限値）');
  const follow=harness(false);
  follow.ctx.DOMMatrixReadOnly=function(text){[this.a,this.b,this.c,this.d,this.e,this.f]=text.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);};
  const playing=follow.fx.play('fang-poison',{source:follow.source,targets:[follow.source],durationMs:800,followGeometry:true,followOpacity:true,seed:53,dir:1});
  follow.step(0);
  const mainContext=follow.contexts.find(c=>c.canvas&&c.canvas.dataset.vbFxCanvas),paintAlpha=[];
  for(const method of ['drawImage','fill','stroke','fillRect']){const original=mainContext[method];mainContext[method]=(...args)=>{paintAlpha.push(mainContext.globalAlpha);return original(...args);};}
  follow.source.style.transform='matrix(0,1,-2,0,0,0)';
  follow.source.style.setProperty('opacity','.25');
  follow.source.bounds={left:300,top:200,width:280,height:95,right:580,bottom:295};
  const trace=follow.step(200);traceQuality(trace,'追従');
  assert.ok(trace.some(r=>r[0]==='translate'&&r[1]===440&&r[2]===247.5),'動いた入れ物の中心へ追従');
  assert.ok(trace.some(r=>r[0]==='rotate'&&r[1]===Math.PI/2),'入れ物の回転へ追従');
  assert.ok(trace.some(r=>r[0]==='scale'&&r[1]===1&&r[2]===2),'縦方向だけの拡大を保持');
  assert.ok(trace.some(r=>r[0]==='globalAlpha'&&r[1]===.25),'外側のフェードを反映');
  assert.ok(paintAlpha.length>0&&paintAlpha.every(a=>a<=.25),'実際の部品の描画も外側の濃さを越えない');
  paintAlpha.length=0;
  const parent=follow.ctx.document.createElement('div');parent.style.setProperty('opacity','.5');
  follow.source.parentElement=parent;parent.parentElement=follow.body;
  follow.source.style.transform='matrix(1,0,0,1,0,0)';follow.source.style.scale='200% 50%';follow.source.style.rotate='90deg';
  const previousStyle=follow.ctx.getComputedStyle;
  follow.ctx.getComputedStyle=el=>Object.assign(previousStyle(el),{scale:el.style.scale||'none',rotate:el.style.rotate||'none'});
  const individual=follow.step(205);traceQuality(individual,'個別の姿勢');
  assert.ok(individual.some(r=>r[0]==='rotate'&&r[1]===Math.PI/2),'CSSの個別rotateへ追従');
  assert.ok(individual.some(r=>r[0]==='scale'&&r[1]===2&&r[2]===.5),'CSSの個別scaleの百分率と縦横差へ追従');
  assert.ok(individual.some(r=>r[0]==='globalAlpha'&&r[1]===.125),'祖先の不透明度も掛ける');
  assert.ok(paintAlpha.length>0&&paintAlpha.every(a=>a<=.125),'部品がalphaを直接指定しても祖先の濃さを保つ');
  follow.source.style.setProperty('opacity','0');paintAlpha.length=0;follow.step(208);
  assert.ok(paintAlpha.every(a=>a===0),'完全に薄れた入れ物の部品は描かれない');
  follow.source.isConnected=false;follow.step(210);
  assert.equal((await playing).cancelled,true);assert.equal(follow.fx.activeCount(),0,'親除去で再生も終了');
  const loop=harness(false),looping=loop.fx.play('attack-buff',{source:loop.source,targets:[loop.source],repeat:true,followGeometry:true,durationMs:700,seed:53,dir:1});
  loop.step(0);loop.step(175);const firstCycle=loop.step(875),nextCycle=loop.step(1575);
  assert.ok(traceQuality(nextCycle,'繰り返し')>0,'2周目も描く');
  assert.deepEqual(nextCycle,firstCycle,'停止するまで同じ定義を時間曲線の始めから繰り返す');
  assert.equal((await looping).looping,true);loop.fx.stopAll();assert.equal(loop.fx.activeCount(),0);
  for(const durationMs of [0,-1,Infinity,30001])await assert.rejects(loop.fx.play('hit-burst',{source:loop.source,durationMs}),/durationMs/);
  for(const impactTimesMs of [[],[0,100],[-1],[NaN],[Infinity]])await assert.rejects(loop.fx.play('hit-burst',{source:loop.source,targets:[loop.source],impactTimesMs}),/impactTimesMs/);
  console.log('OK 入れ物の移動・回転・縦拡大・フェード・親除去・継続2周・不正尺の拒否（画面は未確認）');
}
if(require.main===module)run().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={run};
