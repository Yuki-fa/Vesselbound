'use strict';
const crypto=require('node:crypto'),fs=require('node:fs');
const path=require('node:path');
const {harness}=require('../balance_sim/vfx_data_regression');
const {validatedBundle}=require('../vfx_export');
const round=n=>Math.round(n*1e7)/1e7;
const matrixMul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const canonical=x=>typeof x==='number'?round(x):Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k,v])=>k!=='canvas'&&typeof v!=='function').map(([k,v])=>[k,canonical(v)])):x;
function col(c){if(typeof c!=='string')return c;if(c==='transparent')return[0,0,0,0];if(/^#[a-f\d]{6}([a-f\d]{2})?$/i.test(c))return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16),c.length===9?parseInt(c.slice(7,9),16)/255:1];
 let m=c.match(/^rgba?\(([^)]+)\)$/);return m?m[1].split(',').map(Number).concat(m[1].split(',').length===3?[1]:[]):c;}
function factory(){
 let state,stack,path,ops=[];
 const base=()=>({globalAlpha:1,globalCompositeOperation:'source-over',filter:'none',lineWidth:1,lineCap:'butt',lineJoin:'miter',fillStyle:'#000000',strokeStyle:'#000000',matrix:[1,0,0,1,0,0]});
 function reset(){state=base();stack=[];path=[];ops=[];}reset();
 const c=new Proxy({}, {get(o,k){if(k in o)return o[k];if(k in state)return state[k];
  if(k==='reset')return reset;if(k==='ops')return ops;if(k==='save')return()=>stack.push({...state,matrix:state.matrix.slice()});if(k==='restore')return()=>{if(stack.length)state=stack.pop();};
  if(k==='getTransform')return()=>Object.fromEntries(['a','b','c','d','e','f'].map((k,i)=>[k,state.matrix[i]]));
  if(k==='setTransform')return(...a)=>{state.matrix=a;};
  if(k==='translate')return(x,y)=>{state.matrix=matrixMul(state.matrix,[1,0,0,1,x,y]);};
  if(k==='scale')return(x,y)=>{state.matrix=matrixMul(state.matrix,[x,0,0,y,0,0]);};
  if(k==='rotate')return a=>{state.matrix=matrixMul(state.matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);};
  if(k==='transform')return(...a)=>{state.matrix=matrixMul(state.matrix,a);};
  if(k==='createImageData')return(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
  if(k==='putImageData')return(img,x,y)=>ops.push(['bitmap',img.width,img.height,crypto.createHash('sha256').update(img.data).digest('hex'),x,y]);
  if(k.startsWith('create')&&k.endsWith('Gradient'))return(...args)=>{const g={kind:k,args:canonical(args),matrix:canonical(state.matrix),stops:[]};g.addColorStop=(p,c)=>g.stops.push([p,col(c)]);return g;};
  if(k==='clearRect')return()=>{ops=[];};if(k==='beginPath')return()=>{path=[];};
  if(k==='clip')return()=>{state.clip=canonical(path);};
  if(['moveTo','lineTo','bezierCurveTo','quadraticCurveTo','arc','arcTo','ellipse','rect','closePath'].includes(k))return(...a)=>path.push([k,canonical(a),canonical(state.matrix)]);
  if(['fill','stroke','fillRect','strokeRect','drawImage'].includes(k))return(...a)=>{
    const part={kind:k,alpha:state.globalAlpha,blend:state.globalCompositeOperation,filter:state.filter,matrix:state.matrix.slice(),clip:state.clip||null};
    if(k==='stroke'||k==='strokeRect'){part.color=col(state.strokeStyle);part.width=state.lineWidth;part.cap=state.lineCap;part.join=state.lineJoin;}
    else if(k!=='drawImage')part.color=col(state.fillStyle);
    if(k==='fill'||k==='stroke')part.path=path.slice();else if(k==='drawImage'){
      const img=a.shift();part.image=img.context?img.context.ops:img.src||['image',img.width,img.height];part.args=a;
    }else part.args=a;
    const normalized=canonical(part);ops.push(normalized);
  };
  return()=>{};
 },set(o,k,v){if(k==='canvas')o[k]=v;else state[k]=v;return true;}});return c;
}
// 透明なsource-over/加算命令と、描画が無い中間surfaceへのマスクは画素を作らない。
function visibleOps(ops){
 let visible=false,result=[];
 for(const p of ops){
  if(Array.isArray(p)){result.push(p);visible=true;continue;}
  const item={...p};if(item.image&&Array.isArray(item.image))item.image=visibleOps(item.image);
  if(item.blend==='destination-in'||item.blend==='destination-out'){if(visible)result.push(item);continue;}
  if(item.alpha===0||item.color&&Array.isArray(item.color)&&item.color[3]===0||item.color&&item.color.stops&&item.color.stops.every(s=>s[1][3]===0)||item.kind==='drawImage'&&Array.isArray(item.image)&&!item.image.length)continue;
  visible=true;result.push(item);
 }
 return result;
}
function scene(h){const roots=h.contexts.filter(c=>c.canvas&&c.canvas.dataset&&(c.canvas.dataset.vbFxCanvas||c.canvas.dataset.vbFxLocal));return canonical(roots.map(c=>visibleOps(c.ops)));}
function cssTransform(value){
 let matrix=[1,0,0,1,0,0];
 for(const call of value.matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)){
  const args=call[2].split(/[ ,]+/).map(parseFloat),type=call[1];let next=[1,0,0,1,0,0];
  if(type==='translate'){next[4]=args[0];next[5]=args[1]||0;}
  else if(type==='translateX')next[4]=args[0];else if(type==='translateY')next[5]=args[0];
  else if(type==='scale'){next[0]=args[0];next[3]=args[1]??args[0];}
  else if(type==='rotate'){const angle=args[0]*(call[2].includes('deg')?Math.PI/180:1);next=[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0];}
  else throw new Error('CSS姿勢の検査で未対応: '+type);
  matrix=matrixMul(matrix,next);
 }
 return canonical(matrix);
}
// 仮DOMの適用値も照合する。CSSの補間・レイアウト・実画面の検査ではない。
function domScene(h){return ['source','target','target2','body'].map(key=>{
 const style=h[key].style,record={};
 for(const prop of ['opacity','filter','transform','translate','scale','transition','z-index']){
  const value=style.getPropertyValue(prop).trim();
  if(prop==='transform')record[prop]=cssTransform(value);
  else if(prop==='opacity'||prop==='scale')record[prop]=round(Number(value||1));
  else if(prop==='translate')record[prop]=(value||'0px 0px').split(/\s+/).map(n=>round(parseFloat(n)));
  else if(prop==='filter')record[prop]=Array.from(value.matchAll(/([a-z-]+)\(([^)]*)\)/g),call=>({type:call[1],values:call[2].split(/[ ,]+/).map(n=>({number:round(parseFloat(n)),unit:n.replace(/^-?[\d.e+-]+/i,'')}))}));
  else record[prop]=value;
 }
 return record;
});}
function diffs(a,b,at='',list=[]){
 if(list.length>10)return list;
 if(typeof a!==typeof b||a==null||b==null){if(a!==b)list.push([at,a,b]);return list;}
 if(typeof a==='number'){if(Math.abs(a-b)>1e-6)list.push([at,a,b]);}
 else if(Array.isArray(a)){if(a.length!==b.length){list.push([at+'.length',a.length,b.length]);return list;}a.forEach((x,i)=>diffs(x,b[i],at+'.'+i,list));}
 else if(typeof a==='object'){const ka=Object.keys(a),kb=Object.keys(b);if(ka.join()!==kb.join())list.push([at+'.keys',ka,kb]);else ka.forEach(k=>diffs(a[k],b[k],at+'.'+k,list));}
 else if(a!==b)list.push([at,a,b]);return list;
}
// 補助検査。Canvas命令・生成画像のハッシュ・仮DOMの適用値を比較する。画素/目視はcompare.pyで別途行う。
const argv=process.argv.slice(2),options={out:null,names:null,frames:8,seed:53,speed:1.5,value:1,dir:1,cycles:1,companions:null};
for(let i=0;i<argv.length;i++){const k=argv[i].replace(/^--/,'');if(!(k in options)||!argv[i+1])throw new Error('不明/不足の引数: '+argv[i]);options[k]=argv[++i];}
if(!options.out)throw new Error('使用法: node tools/vfx_capture/trace_compare.js --out <フォルダ> [--names a,b] [--frames 8] [--value 15]');
for(const k of ['frames','seed','speed','value','dir','cycles'])options[k]=Number(options[k]);
if(!Number.isInteger(options.frames)||options.frames<2||options.frames>64||!Number.isFinite(options.seed)||!Number.isFinite(options.speed)||options.speed<.4||options.speed>12||!Number.isFinite(options.value)||options.value<1||![-1,1].includes(options.dir)||!Number.isInteger(options.cycles)||options.cycles<1||options.cycles>8)throw new Error('比較条件が不正');
const definitions=validatedBundle().bundle.effects,known=definitions.map(d=>d.name),names=options.names?options.names.split(','):known;
for(const n of names)if(!known.includes(n))throw new Error('未知の効果: '+n);
const companions=options.companions?options.companions.split(','):[];
for(const n of companions)if(!definitions.some(d=>d.name===n&&d.loop))throw new Error('重ねる状態が不正: '+n);
if(options.cycles>1&&names.some(n=>!definitions.find(d=>d.name===n).loop))throw new Error('複数周期は状態ループだけで指定');
fs.mkdirSync(options.out,{recursive:true});
function delta(a,b){if(typeof a==='number'&&typeof b==='number')return Math.abs(a-b);if(a&&b&&typeof a==='object'&&typeof b==='object'){let max=0;for(const k of Object.keys(a))max=Math.max(max,delta(a[k],b[k]));return max;}return 0;}

const report=[];
for(const name of names){
 const hs=[harness(true,null,{contextFactory:factory}),harness(false,null,{contextFactory:factory})];
 for(const h of hs){
  const playback={source:h.fx.rect(h.source),targets:[h.fx.rect(h.target),h.fx.rect(h.target2)],allies:[h.fx.rect(h.source)],enemies:[h.fx.rect(h.target),h.fx.rect(h.target2)],board:h.body,speed:options.speed,seed:options.seed,dir:options.dir,value:options.value};
  h.fx.play(name,playback);for(const other of companions)if(other!==name)h.fx.play(other,playback);
 }
 const frames=[];
 for(const ratio of Array.from({length:options.frames},(_,i)=>i*options.cycles/options.frames)){
  const t=hs[0].fx.duration(name,options.speed)*ratio;hs.forEach(h=>h.step(t));
  const a=scene(hs[0]),b=scene(hs[1]),oldDom=domScene(hs[0]),newDom=domScene(hs[1]),diff=diffs(a,b),domDiff=diffs(oldDom,newDom);
  frames.push({ratio,t,paints:[a.map(x=>x.length),b.map(x=>x.length)],maxNumericDelta:delta(a,b),domMaxNumericDelta:delta(oldDom,newDom),diff,domDiff});
  
 }
 report.push({name,frames});console.log(name+': '+(frames.every(f=>!f.diff.length&&!f.domDiff.length)?'TRACE_OK':'TRACE_DIFF')+' / '+frames.filter(f=>!f.diff.length&&!f.domDiff.length).length+'/'+frames.length);hs.forEach(h=>h.fx.stopAll());
}
fs.writeFileSync(path.join(options.out,'trace.json'),JSON.stringify({baseline:'5d9e1d2',options,tolerance:1e-6,precision:1e-7,effects:report},null,2)+'\n');
const rows=['effect,frame,time_ms,old_paints,new_paints,max_numeric_delta,dom_max_numeric_delta,canvas_result,dom_result,result'];
for(const d of report)for(const [i,f]of d.frames.entries())rows.push([d.name,i,f.t,f.paints[0].reduce((a,b)=>a+b,0),f.paints[1].reduce((a,b)=>a+b,0),f.maxNumericDelta,f.domMaxNumericDelta,f.diff.length?'TRACE_DIFF':'TRACE_OK',f.domDiff.length?'TRACE_DIFF':'TRACE_OK',f.diff.length||f.domDiff.length?'TRACE_DIFF':'TRACE_OK'].join(','));
fs.writeFileSync(path.join(options.out,'trace.csv'),rows.join('\n')+'\n');
const failed=report.filter(d=>d.frames.some(f=>f.diff.length||f.domDiff.length));
console.log('Canvas命令・仮DOM適用値 '+(report.length-failed.length)+'/'+report.length+'効果。画素・実DOM・目視は未確認。');
if(failed.length)process.exitCode=1;
