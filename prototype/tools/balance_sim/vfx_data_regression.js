'use strict';
// 旧コミットと新しいデータ描画を同じ仮DOM・時計・seedで動かす。
// 全効果の尺・命中を旧版と照合し、描画・座標・色・決定性・復元を検査する。
// この仮DOM検査だけで見た目の一致とは判定しない。画面は vfx_capture の比較で確認する。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {RUNTIME_SCRIPTS,validatedBundle}=require('../vfx_export');
const ROOT=path.resolve(__dirname,'../..');
const before=execFileSync('git',['show','5d9e1d2:prototype/js/engine/fx_lab.js'],{cwd:ROOT,encoding:'utf8'});
function harness(old,extra,options={}){
  let now=0,id=0;const frames=new Map(),trace=[],contexts=[];
  function record(op,args){trace.push([op,...args]);}
  function context(){
    if(options.contextFactory){const c=options.contextFactory();contexts.push(c);return c;}
    const state={globalAlpha:1,globalCompositeOperation:'source-over',filter:'none',lineWidth:1,fillStyle:'#000000',strokeStyle:'#000000'},stack=[];
    const c=new Proxy(state,{get(o,k){
      if(k in o)return o[k];
      if(k==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4)});
      if(k==='createRadialGradient'||k==='createLinearGradient'||k==='createConicGradient')return(...args)=>{
        record(k,args);return {addColorStop:(...args)=>record('colorStop',args)};
      };
      if(k==='save')return()=>{stack.push({...state});record(k,[]);};
      if(k==='restore')return()=>{if(stack.length)Object.assign(state,stack.pop());record(k,[]);};
      if(k==='getTransform')return()=>({a:1,b:0,c:0,d:1,e:0,f:0});
      return(...args)=>record(k,args.map(a=>a&&typeof a==='object'?(a.width?['image',a.width,a.height]:a.d?['path',a.d]:['resource']):a));
    },set(o,k,v){o[k]=v;if(['lineWidth','globalAlpha','filter','globalCompositeOperation','fillStyle','strokeStyle'].includes(k))record(k,[v&&typeof v==='object'?'gradient':v]);return true;}});
    contexts.push(c);return c;
  }
  function element(tag='DIV'){
    const values=new Map(),el={nodeType:1,tagName:tag.toUpperCase(),dataset:{},children:[],isConnected:true,offsetWidth:95,offsetHeight:140,
      style:{setProperty:(k,v)=>values.set(k,String(v)),getPropertyValue:k=>values.get(k)||'',getPropertyPriority:()=>'',removeProperty:k=>values.delete(k)},
      addEventListener(){},hasAttribute:()=>false,querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,removeAttribute(){},setAttribute(k,v){this[k]=String(v);},
      cloneNode(){const clone=element(tag);clone.bounds=this.bounds;clone.dataset={...this.dataset};return clone;},
      getBoundingClientRect(){return this.bounds||{left:100,top:500,width:95,height:140,right:195,bottom:640};},
      getContext(){if(!this.context){this.context=context();this.context.canvas=this;}return this.context;},
      appendChild(child){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(c=>c!==child);child.parentNode=child.parentElement=this;this.children.push(child);return child;},
      remove(){this.isConnected=false;if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}};
    if(options.contextFactory&&el.tagName==='CANVAS')for(const key of['width','height']){
      let size=300;Object.defineProperty(el,key,{get:()=>size,set(v){size=v;if(el.context)el.context.reset();},enumerable:true});
    }
    return el;
  }
  const body=element(),source=element(),target=element(),target2=element();
  target.bounds={left:540,top:120,width:95,height:140,right:635,bottom:260};target2.bounds={left:680,top:300,width:95,height:140,right:775,bottom:440};
  const ctx={console,URL,Uint8ClampedArray,Map,Set,WeakMap,WeakSet,Path2D:function(d){this.d=d;},DOMMatrixReadOnly:class{constructor(t){const a=+(t.match(/rotate\(([\d.-]+)/)||[])[1]||0;this.a=Math.cos(a);this.b=Math.sin(a);}},innerWidth:1280,innerHeight:800,devicePixelRatio:1,
    addEventListener(){},removeEventListener(){},performance:{now:()=>now},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:n=>frames.delete(n),setTimeout:()=>++id,clearTimeout(){},
    document:{body,baseURI:'file:///prototype/index.html',currentScript:{src:'file:///prototype/js/engine/fx_lab.js'},createElement:element,elementFromPoint:()=>null},
    getComputedStyle:el=>({visibility:el.style.visibility||'visible',display:el.style.display||'block',opacity:el.style.getPropertyValue('opacity')||'1',transform:el.style.transform||'none',filter:'none'})};ctx.window=ctx;vm.createContext(ctx);
  for(const file of old?[]:RUNTIME_SCRIPTS){
    if(options.excludeScripts&&options.excludeScripts.includes(file))continue;
    if(extra&&file==='js/vfx/renderer.js')vm.runInContext('VbFxDefs.register('+JSON.stringify(extra)+');',ctx);
    vm.runInContext(options.sourceLoader?options.sourceLoader(file):fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
  }
  if(old)vm.runInContext(before,ctx,{filename:'5d9e1d2/fx_lab.js'});
  function step(ms){now=ms;trace.length=0;const pending=Array.from(frames.values());frames.clear();pending.forEach(fn=>fn(now));return trace.slice();}
  return {fx:ctx.VbFx,ctx,step,source,target,target2,trace,contexts,body,frames};
}
function nearNumbers(a,b,label,tolerance=.00001){
  assert.equal(a.length,b.length,label);
  a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<tolerance,label+' '+v+' / '+b[i]));
}
function traceQuality(trace,name){
  function visit(value){
    if(typeof value==='number')assert.ok(Number.isFinite(value),name+' の描画に非有限数');
    if(Array.isArray(value))value.forEach(visit);
    if(typeof value==='string')assert.ok(!/NaN|Infinity/.test(value),name+' の描画文字列が不正');
  }
  trace.forEach(row=>{
    visit(row);
    if(row[0]==='globalAlpha')assert.ok(row[1]>=0&&row[1]<=1,name+' の透明度が不正');
    if(row[0]==='lineWidth')assert.ok(row[1]>=0,name+' の線幅が不正');
  });
  return trace.filter(row=>['stroke','fill','drawImage','fillRect'].includes(row[0])).length;
}
const clone=x=>JSON.parse(JSON.stringify(x));
function schemaChecks(bundle){
  const schema=fs.readFileSync(path.join(ROOT,'js/vfx/schema.js'),'utf8');
  function reject(change,pattern){
    const bad=clone(bundle);change(bad);const c=vm.createContext({});vm.runInContext(schema,c);
    assert.throws(()=>vm.runInContext('VbFxDefs.register('+JSON.stringify(bad)+');',c),pattern);
  }
  reject(b=>{b.programs={};},/未知のキー/);
  reject(b=>{b.effects[0].kind='wave';},/未知のキー/);
  reject(b=>{b.effects[0].layers[0].type='skull-fly-of-dullahan';},/列挙値/);
  reject(b=>{b.effects[0].layers[0].args=['call','eval'];},/未知のキー/);
  reject(b=>{b.effects[0].layers[0].radius='t*0.5';},/有限数/);
  reject(b=>{b.effects[0].layers[0].color='white';},/#RRGGBB/);
  reject(b=>{b.effects[0].layers[0].texture='fetch';},/列挙値/);
  reject(b=>{b.effects[0].layers[0].time=[0];},/配列の形/);
  reject(b=>{b.effects[0].layers[0].offset=[0,1,2];},/配列の形/);
  reject(b=>{b.effects[0].layers[0].curves={alpha:{keys:[[0,0],[0,1]]}};},/狭義昇順/);
  reject(b=>{b.effects[0].layers[0].curves={alpha:{keys:[[0,0],[1,'Math.random()']]}};},/有限数/);
  reject(b=>{b.effects[0].layers[0].curves={alpha:{keys:[[0,0],[1,1]],domain:'variable'}};},/列挙値/);
  reject(b=>{b.effects[0].layers[0].palette=[[0,'#ffffff'],[1,'#ffaaaa',1]];},/配列の形/);
  reject(b=>{b.effects[0].layers[0].bind=[{input:'stats.hp',target:'alpha',curve:{keys:[[0,0],[1,1]]}}];},/列挙値/);
  reject(b=>{b.effects[0].layers[0].bind=[{input:'value',target:'texture',curve:{keys:[[0,0],[1,1]]}}];},/適用先/);
  reject(b=>{b.effects[0].layers[0]={type:'particles',anchor:'source',lifeMs:[-1,200]};},/範囲/);
  reject(b=>{b.effects[0].layers[0].trail={length:1,call:'other-layer'};},/未知のキー/);
  reject(b=>{b.effects[0].layers[0]={type:'particles',anchor:'source',points:[[0,0]]};},/経路の配列/);
  reject(b=>{b.effects[0].layers[0]={type:'particles',anchor:'source',points:[[0,0],[1,'t']]};},/有限数/);
  reject(b=>{b.effects[0].layers[0]={type:'particles',anchor:'source',emissionArc:[1,-1]};},/範囲の順序/);
  reject(b=>{b.effects[0].layers[0]={type:'beam',anchor:'path',taper:{keys:[[0,-.1],[1,1]]}};},/範囲/);
  reject(b=>{b.effects[0].layers[0]={type:'projectile',anchor:'path',trail:{frequencyHz:'time*2'}};},/有限数/);
  reject(b=>{b.effects[0].layers[0]={type:'projectile',anchor:'path',headRotation:[0]};},/配列の形/);
  reject(b=>{b.effects[0].layers[0]={type:'projectile',anchor:'path',headRotation:[1,-1]};},/範囲の順序/);
  reject(b=>{b.effects[0].layers[0]={type:'projectile',anchor:'path',headRotation:[0,'i*0.1']};},/有限数/);
  reject(b=>{b.effects[0].layers[0]={type:'ring',anchor:'source',stops:[[0,'#ffffff',1],[1,'#ffffff']]};},/配列の形/);
  reject(b=>{b.shapes['skull-face'].paths[0].d='M 0 0 C 1 2';},/個数/);
  reject(b=>{b.shapes['skull-face'].paths[0].d='M 0 0 eval(1)';},/SVGパス/);
  reject(b=>{b.effects[0].layers[0].foo={when:true};},/未知のキー/);
  const {literalDefinition}=require('../vfx_export');
  for(const expression of ['{schemaVersion:2}','{"schemaVersion":1+1}','{"effects":[(()=>1)()]}','{"label":"x"});alert(1);VbFxDefs.register({"effects":[]}','{"effects":["x"]}/* */);var t=1;VbFxDefs.register({"effects":[]}'])
    assert.throws(()=>literalDefinition('VbFxDefs.register('+expression+');','検査'));
  assert.throws(()=>literalDefinition('VbFxDefs.register({"effects":[]}); // /*\n/* 未閉鎖','検査'),/コメント/);
  console.log('OK 許可リストの拒否（未知キー・型・式・構文木・文字列・曲線・範囲・パス・定義JS）');
}
async function allEffects(bundle){
  const old=harness(true),next=harness(false),again=harness(false);
  assert.deepEqual(bundle.effects.filter(d=>!d.sourceCode).map(d=>d.name),Array.from(old.fx.effects,d=>d.name),'旧版の全効果と順序を保持');
  for(const d of bundle.effects.filter(d=>!d.sourceCode)){
    if(process.env.VB_ONLY&&!process.env.VB_ONLY.split(',').includes(d.name))continue;
    const original=old.fx.effects.find(e=>e.name===d.name);
    for(const key of ['label','ms','color','light','loop','underStatus','stackable'])assert.equal(d[key],original[key],d.name+' のメタデータ '+key);
    for(const speed of [.4,1,1.5,3.75,12]){
      assert.equal(next.fx.duration(d.name,speed),old.fx.duration(d.name,speed),d.name+' の尺 '+speed);
      assert.equal(next.fx.duration(d.label,speed),old.fx.duration(d.label,speed),d.name+' のラベルAPI');
      assert.ok(Math.abs(next.fx.impactMs(d.name,speed)-old.fx.impactMs(d.name,speed))<.00001,d.name+' のSE命中cue');
    }
    const hits=[[],[],[]],pending=[];
    for(const [i,h]of[old,next,again].entries()){
      h.fx.stopAll();pending.push(h.fx.play(d.name,{source:h.fx.rect(h.source),targets:[h.fx.rect(h.target),h.fx.rect(h.target2)],board:h.body,
        allies:[h.fx.rect(h.source)],enemies:[h.fx.rect(h.target),h.fx.rect(h.target2)],speed:1.5,seed:53,dir:1,onImpact:n=>hits[i].push(n)}));
    }
    nearNumbers(Array.from(old.fx.snapshot()[0].impactsMs),Array.from(next.fx.snapshot()[0].impactsMs),d.name+' の対象到達時刻');
    const duration=old.fx.duration(d.name,1.5);let drawing=0;
    for(let i=0;i<=8;i++){
      const ms=duration*i/8;old.step(ms);const trace=next.step(ms),repeat=again.step(ms);
      drawing+=traceQuality(trace,d.name);assert.deepEqual(repeat,trace,d.name+' のseed・座標・色・合成・曲線の決定性 '+i);
    }
    assert.ok(drawing>0,d.name+' に描画がある');assert.deepEqual(hits[1],hits[0],d.name+' の命中順・回数');
    old.fx.stopAll();next.fx.stopAll();again.fx.stopAll();const results=await Promise.all(pending);
    for(const result of results)assert.equal(result.assetErrors.length,0,d.name+' の素材解決');
    for(const h of[next,again]){
      for(const el of[h.source,h.target,h.target2,h.body])for(const prop of ['filter','transform','translate','scale','opacity','transition','z-index','mask-image','mask-size','background-image'])
        assert.equal(el.style.getPropertyValue(prop),'',d.name+' の一時style復元 '+prop);
      assert.equal(h.fx.activeCount(),0);assert.equal(h.body.children.length,0,d.name+' の描画層を除去');
    }
    console.log('OK 宣言的描画 '+d.name+'（9時刻・旧尺/命中・座標/色・seed・復元）');
  }
}
async function stateChecks(){
  const old=harness(true),next=harness(false),again=harness(false);
  for(const value of [1,5,6,10,11,15,16,30]){
    const pending=[];
    for(const h of[old,next,again]){
      h.fx.stopAll();
      for(const name of ['shield-state','poison-state','weaken-state','guts-state','revive-state'])pending.push(h.fx.play(name,{source:h.fx.rect(h.target),value,seed:53,dir:1}));
      assert.equal(h.fx.activeCount(),5,'5状態は別々に保持');
    }
    for(const ms of[0,1250,6000,12000]){
      old.step(ms);const trace=next.step(ms),repeat=again.step(ms);traceQuality(trace,'状態 '+value);
      assert.deepEqual(repeat,trace,'5状態・重ね・曲線・相互作用の決定性 '+value+' '+ms);
    }
    const previous=next.fx.activeCount(),update=await next.fx.play('shield-state',{source:next.fx.rect(next.target),value:3,seed:53,dir:1});
    assert.equal(next.fx.activeCount(),previous,'同じカードに同じ状態を二重開始しない');assert.equal(update.updated,true,'stackableは値を更新');
    const local=next.target.children.filter(n=>n.dataset.vbFxLocal==='1');assert.equal(local.length,1,'毒のunderStatus canvasは1枚');
    assert.equal(local[0].style.zIndex,'4','ステータス層が無い時の既定z-index');
    next.fx.stopAll({keepLoops:true});assert.equal(next.fx.activeCount(),5,'終戦後のkeepLoops');
    for(const h of[old,next,again])h.fx.stopAll();await Promise.all(pending);
    console.log('OK 5状態の値 '+value+'・長時間ループ・重ね・値更新・underStatus・保持');
  }
  // 重ね数は全く同じ層を最大6回、追加分のalphaは.18。7以降で描画を増やさない。
  const traces=[];
  for(const value of[1,6,7,30]){
    const h=harness(false);const promise=h.fx.play('shield-state',{source:h.fx.rect(h.target),value,seed:53,dir:1});
    h.step(0);traces.push(h.step(1250));h.fx.stopAll();await promise;
  }
  const strokes=trace=>trace.filter(row=>row[0]==='stroke').length;
  assert.equal(strokes(traces[1]),strokes(traces[0])*6,'結界の全層が6回重なる');assert.deepEqual(traces[2],traces[1],'結界は最大6');assert.deepEqual(traces[3],traces[1],'30でも最大6');
  assert.ok(traces[1].some(row=>row[0]==='globalAlpha'&&Math.abs(row[1]-.18)<1e-8),'追加の層はalpha .18');
  const colors=[],smokes=[];
  for(const name of['poison-state','weaken-state']){
    for(const value of[1,8,15]){
      const h=harness(false);const promise=h.fx.play(name,{source:h.fx.rect(h.target),value,seed:53,dir:1});h.step(0);
      const trace=h.step(1250);colors.push(trace.filter(row=>row[0]==='colorStop').map(row=>row[2]).join('|'));smokes.push(trace.filter(row=>row[0]==='drawImage').length);
      h.fx.stopAll();await promise;
    }
  }
  assert.notEqual(colors[0],colors[1]);assert.notEqual(colors[1],colors[2]);assert.notEqual(colors[3],colors[4]);assert.notEqual(colors[4],colors[5]);
  assert.ok(smokes[2]>smokes[0]&&smokes[5]>smokes[3],'毒・弱体の入力値で粒の密度が増す');
  const h=harness(false);const p=h.fx.play('poison-state',{source:h.fx.rect(h.target),value:1,seed:53,dir:1});h.step(0);const pure=h.step(1000).filter(row=>row[0]==='colorStop').map(row=>row[2]);
  const q=h.fx.play('weaken-state',{source:h.fx.rect(h.target),value:1,seed:53,dir:1});h.step(1000);const mixed=h.step(1000).filter(row=>row[0]==='colorStop').map(row=>row[2]);
  assert.notDeepEqual(mixed.slice(0,pure.length),pure,'同じカードの毒・弱体が曲線で濁る');
  h.target.style.visibility='hidden';const hidden=h.step(1300);assert.equal(hidden.some(row=>['drawImage','fill','stroke'].includes(row[0])),false,'非表示カードの状態は描かない');
  h.target.style.visibility='visible';assert.ok(h.step(1400).some(row=>['drawImage','fill','stroke'].includes(row[0])),'戻したカードに追従');
  const to=h.ctx.document.createElement('div');h.fx.retarget({name:'poison-state',element:h.target},h.fx.rect(to));assert.equal(to.children.filter(n=>n.dataset.vbFxLocal==='1').length,1,'毒canvasもretarget');
  h.fx.stopAll();await Promise.all([p,q]);
  console.log('OK 結界最大6/追加.18・毒/弱体1→15の色/密度・相互濁り・非表示・retarget');
}
async function genericParts(bundle){
  const d=clone(bundle.effects[0]);Object.assign(d,{name:'schema-parts',label:'部品の検査',ms:800,impact:{atMs:200,cueMs:200},defaultTargets:'explicit'});
  const curve={keys:[[0,0],[1,1]],interpolation:'linear'};
  d.layers=[
    {type:'card',anchor:'each-target',x:.4,scale:1.1},
    {type:'card',anchor:'each-target',brightness:1.6},
    {type:'particles',anchor:'each-target',count:8,emit:'burst',emission:'rect',extent:[.2,.3],lifeMs:[500,600],delayMs:[0,40],speed:[.2,.8],direction:[0,Math.PI*2],gravity:[0,.2],drag:1.4,sizeRange:[.03,.06],spin:[-1,1],texture:'smoke',colors:[[0,'#ffffff'],[1,'#ffaa20']],curves:{size:{keys:[[0,1],[1,0]],domain:'life'},alpha:{keys:[[0,0],[.25,.7],[1,0]]}}},
    {type:'particles',anchor:'source',emit:'burst',emission:'line',points:[[-.4,-.2],[.4,.2]],count:12,lifeMs:[400,600],speed:[.1,.2],emissionArc:[-.5,.5],directionSpace:'radial'},
    {type:'beam',anchor:'path',blend:'screen',width:.02,color:'#a0ffff',noise:.1,segments:12,taper:{keys:[[0,0],[.5,1],[1,0]]}},
    {type:'ring',anchor:'target',radius:.3,texture:'plasma-soft',count:24,core:.2,stops:[[0,'#a0ffff',.1],[1,'#a0ffff',0]]},
    {type:'fog',anchor:'source',extent:[.3,.3],radius:.1,count:8,arc:[-.2,.2],flow:[0,0],orbitSpeed:1.5},
    {type:'projectile',anchor:'path',radius:.1,stops:[[0,'#ffffff',1],[1,'#ffffff',0]],trail:{width:.02,wave:.06,softness:.01,core:.5,frequency:2,frequencyHz:3}},
    {type:'card',anchor:'each-target',grid:4,curves:{dissolve:curve}},
    {type:'glow',anchor:'allies',radius:.3,color:'#aaaaff'},
    {type:'glow',anchor:'enemies',radius:.3,color:'#ffaaff'},
    {type:'glow',anchor:'each-target',color:'#aaaaaa',radius:.15,copies:2,copyDelay:.1,bind:[{input:'value',target:'alpha',curve:{keys:[[1,.1],[15,.9]]}}]}
  ];
  const parts=harness(false,{schemaVersion:2,effects:[d]}),again=harness(false,{schemaVersion:2,effects:[d]});
  const pending=[];
  for(const h of[parts,again])pending.push(h.fx.play(d.name,{source:h.fx.rect(h.source),targets:[h.fx.rect(h.target)],allies:[h.fx.rect(h.source)],enemies:[h.fx.rect(h.target)],value:8,seed:53,dir:1}));
  assert.deepEqual(parts.step(0),again.step(0));const trace=parts.step(250);assert.deepEqual(trace,again.step(250));traceQuality(trace,d.name);
  assert.match(parts.target.style.getPropertyValue('transform'),/translate\(56px,0px\).*scale\(1\.1,1\.1\)/,'明るさ・ディゾルブの層が先の移動と拡縮を消さない');
  assert.match(parts.target.style.getPropertyValue('filter'),/brightness\(1\.6\)/,'明るさの層も反映する');
  assert.ok(parts.target.style.getPropertyValue('mask-image').includes('data:image/svg+xml'),'ディゾルブをカードへ反映');
  const cloneEl=parts.ctx.document.createElement('div');cloneEl.style.setProperty('mask-image',parts.target.style.getPropertyValue('mask-image'));
  parts.fx.prepareClone(parts.target,cloneEl);assert.equal(cloneEl.style.getPropertyValue('mask-image'),'','複製へ一時maskを残さない');
  parts.fx.stopAll();again.fx.stopAll();await Promise.all(pending);assert.equal(parts.target.style.getPropertyValue('mask-image'),'','mask復元');
  assert.equal(parts.ctx.VbFxCurves.sample({keys:[[0,0],[1,1]],interpolation:'smooth'},.5),.5);
  assert.equal(parts.ctx.VbFxCurves.range([2,5],53,7),parts.ctx.VbFxCurves.range([2,5],53,7));
  // 共有部品の複製位置は出発時から到達時まで維持する。氷片などが1点へ合流して潰れるのを防ぐ。
  const spread=clone(d);spread.name='schema-projectile-layout';spread.label='移動する複製の検査';
  spread.layers=[{type:'projectile',anchor:'path',copies:3,layout:'line',spread:[.2,0],radius:.09,texture:'glow',orient:false,headRotation:[-.8,.8]}];
  const h=harness(false,{schemaVersion:2,effects:[spread]}),promise=h.fx.play(spread.name,{source:h.fx.rect(h.source),targets:[h.fx.rect(h.target)],seed:53,dir:1,speed:1});
  let headAngles;
  for(const [ms,x,y]of [[0,147.5,570],[400,367.5,380],[800,587.5,190]]){
    const frame=h.step(ms);traceQuality(frame,spread.name);
    const positions=frame.filter(row=>row[0]==='translate'&&row[1]!==0).map(row=>row.slice(1));
    assert.equal(positions.length,3,'頭は常に3個');
    positions.forEach((pos,i)=>nearNumbers(pos,[x+(i-1)*28,y],'複製の間隔と出発/到達位置'));
    const angles=frame.filter(row=>row[0]==='rotate').map(row=>row[1]);
    assert.equal(angles.length,3,'頭の角度は複製ごとに1回');
    assert.ok(angles.every(a=>a>=-.8&&a<=.8),'頭の角度は宣言した範囲内');
    assert.equal(new Set(angles).size,3,'群の頭が全て平行にならない');
    if(headAngles)assert.deepEqual(angles,headAngles,'頭の初期角度は飛行中も維持');else headAngles=angles;
  }
  await promise;assert.equal(h.fx.activeCount(),0);
  console.log('OK 新定義だけで放出・重力/抵抗・寿命変化・先細りビーム・膜/霧・波打つ尾・カード移動と明滅の併用・ディゾルブ・全アンカー・複製の出発/到達・頭の角度範囲と保持');
}
async function shapeAxisChecks(bundle){
  const d=clone(bundle.effects[0]);Object.assign(d,{name:'schema-shape-axes',label:'形状の軸別倍率',ms:800,defaultTargets:'source',impact:{atMs:0,cueMs:0}});
  const base={type:'shape',anchor:'source',basis:'unit',shape:'flare',radius:.25,aspect:[1.6,.8],rotation:.3,color:'#55aa88'};
  async function trace(layer,ms,value=1){
    const def=clone(d);def.layers=[layer];const h=harness(false,{schemaVersion:2,effects:[def]});
    const pending=h.fx.play(def.name,{source:h.source,speed:1,value,seed:53,dir:1});h.step(0);
    const frame=h.step(ms);traceQuality(frame,def.name);h.fx.stopAll();await pending;return frame;
  }
  const animated=Object.assign(clone(base),{curves:{scaleX:{keys:[[0,1],[1,.25]],interpolation:'linear'},scaleY:{keys:[[0,.5],[1,1.5]],interpolation:'linear'}}});
  for(const ms of [0,200,400,800]){
    const p=ms/800,expected=Object.assign(clone(base),{aspect:[1.6*(1-.75*p),.8*(.5+p)]});
    assert.deepEqual(await trace(animated,ms),await trace(expected,ms),'軸別曲線は同じ時刻の固定縦横比と同じ描画・回転・位置になる');
  }
  assert.deepEqual(await trace(Object.assign(clone(base),{scaleX:1,scaleY:1}),400),await trace(base,400),'倍率1は未指定と完全一致');
  const mapped=Object.assign(clone(base),{bind:[{input:'value',target:'scaleX',curve:{keys:[[1,.5],[3,1.5]],interpolation:'linear'}}],modulation:{scaleY:{mode:'multiply',bias:1,amplitude:.2,frequency:Math.PI,timeSpace:'life'}}});
  assert.deepEqual(await trace(mapped,400,2),await trace(Object.assign(clone(base),{aspect:[1.6,.8*1.2]}),400,2),'固定値のない入力bindingと変調も両軸へ適用');
  const schema=fs.readFileSync(path.join(ROOT,'js/vfx/schema.js'),'utf8');
  for(const [axis,value] of [['scaleX',0],['scaleY',33],['scaleX',-1]]){
    const bad=clone(d);bad.layers=[Object.assign(clone(base),{[axis]:value})];const c=vm.createContext({});vm.runInContext(schema,c);
    assert.throws(()=>vm.runInContext('VbFxDefs.register('+JSON.stringify({schemaVersion:2,shapes:bundle.shapes,effects:[bad]})+');',c),/範囲/,'軸別倍率の許可範囲を守る');
  }
  console.log('OK 形状の軸別倍率：全時刻の固定縦横比との一致・未指定/倍率1一致・入力/変調・範囲拒否');
}
async function run(){
  const {bundle}=validatedBundle();assert.equal(bundle.effects.filter(d=>!d.sourceCode).length,50);assert.ok(Object.keys(bundle.shapes).length>=15,'元の図形を保持');
  schemaChecks(bundle);await allEffects(bundle);await stateChecks();await genericParts(bundle);await shapeAxisChecks(bundle);
  console.log('VFXデータ回帰: 50効果・9時刻・5速さ・状態値8段階・許可リスト拒否・新部品 OK（画面は未確認）');
}
if(require.main===module)run().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={harness,traceQuality};
