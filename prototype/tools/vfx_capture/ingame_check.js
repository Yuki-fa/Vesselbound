'use strict';
// 撮影道具のNode検査。旧Gitの関数を実行し、既知の画素値で存在感の計算を確かめる。
// この検査はChromeの描画・見た目の確認ではない。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {sandbox}=require('../vfx_preview/cards_dom.cjs');
const {installCaptureClock}=require('./clock'),{captureBaseline}=require('./capture');
const {legacySources,routeFor,assetFrames,installLegacy}=require('./legacy_ingame');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'webp_manifest.json'),'utf8'));
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-6,label+': '+actual+' / '+expected);

function boot(){
  const env=sandbox('http://127.0.0.1:5520/tools/vfx_preview.html'),ctx=vm.createContext(env.context),doc=env.document;
  const created=[],animations=[],Element=Object.getPrototypeOf(doc.createElement('img')).constructor;
  const originalSrc=Object.getOwnPropertyDescriptor(Element.prototype,'src');
  Object.defineProperty(Element.prototype,'src',{get:originalSrc.get,set(value){originalSrc.set.call(this,value);
    queueMicrotask(()=>this.dispatchEvent(new env.Event('load')));},configurable:true});
  Element.prototype.decode=async function(){assert.ok(this.src);};
  Element.prototype.animate=function(frames,timing){
    const animation={element:this,frames,timing:{delay:0,...timing},effect:{
      getTiming:()=>animation.timing,updateTiming:patch=>Object.assign(animation.timing,patch)},
      pause(){this.paused=true;},cancel(){this.cancelled=true;},addEventListener(){}};
    animations.push(animation);return animation;
  };
  Element.prototype.getContext=function(){
    const owner=this;
    return {clearRect(){},drawImage(image){owner.recordedSrc=image.recordedSrc||image.src;}};
  };
  const originalCreate=doc.createElement;
  doc.createElement=tag=>{const el=originalCreate(tag);created.push(el);return el;};
  doc.head=doc.createElement('head');doc.documentElement.prepend(doc.head);
  doc.getAnimations=()=>animations.filter(a=>a.element.isConnected&&!a.cancelled);
  ctx.Image=function(){return doc.createElement('img');};ctx.HTMLImageElement=Element;
  ctx.MutationObserver=class{observe(){}};
  ctx.innerWidth=1600;ctx.innerHeight=1000;
  // CSSOMの取捨を検査する。描画やCSSのレイアウトを模倣して合格にしない。
  ctx.CSSStyleSheet=class{replaceSync(css){this.input=css;assert.match(css,/width:460%/);
    this.cssRules=[{selectorText:'.damage-vfx-host',cssText:'.damage-vfx-host{position:fixed;}'},
      {selectorText:'.effect-sustain-host',cssText:'.effect-sustain-host{position:fixed;}'},
      {selectorText:'.unrelated',cssText:'.unrelated{display:none;}'},
      {name:'battle-opening-appearance-frames',cssText:'@keyframes battle-opening-appearance-frames{from{opacity:0}to{opacity:1}}'}];}};
  const rect=(left,top,width,height)=>({x:left,y:top,left,top,width,height,right:left+width,bottom:top+height});
  const stage=doc.createElement('div');stage.id='stage';stage.getBoundingClientRect=()=>rect(28,95,1536,864);doc.body.appendChild(stage);
  const ids=['source','target','target2','target3'];
  ids.forEach((id,i)=>{const card=doc.createElement('div');card.id=id;card.className='lab-card';
    card.dataset.side=i?'enemy':'ally';card.dataset.no=i?'C023':'C056';
    const r=i?rect(525+i*120,242,108.33331298828125,164.58331298828125):rect(745.8333129882812,520.25,108.33331298828125,164.58331298828125);
    card.getBoundingClientRect=()=>r;card.appendChild(doc.createElement('span'));stage.appendChild(card);
  });
  ctx.VbFxPreview={snapshot:()=>({sourceId:'source',targetIds:['target']})};
  // 旧関数を局所スコープへ注入しても現在の同名入口は書き換わらない。
  ctx.playHitVfxAtRect=()=>{throw new Error('現在の入口へ漏れた');};
  vm.runInContext('('+installCaptureClock+')(53);',ctx);
  return {ctx,doc,created,animations};
}

async function historicalRoutes(payload){
  for(const entry of manifest.effects)for(const speed of [1,2,3]){
    const {ctx,doc,created,animations}=boot(),route=routeFor(entry.asset);
    const info={source:'source',targets:route.kind==='tri'||route.kind==='sweep'?['target','target2','target3']:['target'],durationMs:entry.playbackMs/speed};
    const frames={loop:1,durationMs:10000,frames:Array.from({length:160},(_,i)=>({index:i,at:i*66,duration:66,src:'data:image/png;base64,FRAME'+i}))};
    ctx.payload=payload;ctx.entry=entry;ctx.route=route;ctx.info=info;ctx.frames=frames;
    // 画像ロードは既存check.jsで実行検査済み。ここでは旧描画入口・幾何・時計を検査する。
    await vm.runInContext('('+installLegacy+')(payload,entry,route,info,frames,async(image,label,src)=>{image.src=src;});',ctx);
    ctx.__legacy.start();await ctx.__legacy.step(0);
    const vfx=created.filter(el=>el.isConnected&&el.className&&el!==doc.getElementById('source')&&el!==doc.getElementById('target'));
    assert.ok(vfx.length,entry.name+'の旧VFXが生成される');
    const oldStyle=doc.head.children[0].textContent;
    assert.match(oldStyle,/\.effect-sustain-host\{position:fixed/);assert.doesNotMatch(oldStyle,/\.unrelated/);
    assert.equal(doc.querySelector('.damage-label-host'),null,'検査用のダメージ数値を足さない');
    const target=doc.getElementById('target').getBoundingClientRect(),source=doc.getElementById('source').getBoundingClientRect();
    if(route.kind==='hit'){
      const host=doc.querySelector('.damage-vfx-host');assert.ok(host,entry.name);
      near(parseFloat(host.style.width),target.width,'命中の入れ物は対象カード幅');
      near(parseFloat(host.style.top),target.top+(entry.asset.endsWith('_2')?target.height*-.14:0),'着弾だけ旧-.14高さの補正');
      assert.ok(animations.length,'旧Web Animationsのフェードを使う');
      near(animations[0].timing.duration,info.durationMs,'倍速のフェード尺');
    }else if(route.kind==='sustain'||route.kind==='keyword-sustain'){
      const host=doc.querySelector('.effect-sustain-host'),r=route.kind==='sustain'?source:target;
      near(parseFloat(host.style.left),r.left,'継続VFXは発生カードへ配置');
      if(route.kind==='sustain')assert.equal(host.children[0].style.width,'100%','C013は460%へ戻さない');
      else assert.equal(host.children[0].style.transition,'opacity 120ms ease-out','毒牙の旧導入');
    }else if(route.kind==='projectile'){
      const img=doc.querySelector('.effect-sustain-host img');
      assert.ok(img.style.transform.includes('scale('+(entry.asset==='C024_1'?.0625:.125)+')'),'飛翔体の旧倍率');
    }else if(route.kind==='sweep'){
      const clip=doc.querySelector('.sweep-vfx-clip'),host=doc.querySelector('.sweep-vfx-host');
      near(parseFloat(host.style.left)+parseFloat(clip.style.left),source.left+source.width*.25,'炎の原点x');
      near(parseFloat(host.style.top)+parseFloat(clip.style.top),source.top,'炎の原点y');
      near(animations[0].timing.duration,info.durationMs,'薙ぎ払いの倍速尺');
    }else if(route.kind==='special'){
      const host=doc.querySelector('.special-vfx-host');near(parseFloat(host.style.width),target.width*route.scale,'特殊演出の旧倍率');
    }else if(route.kind==='board'){
      near(parseFloat(doc.querySelector('.map-board-change-vfx').style.width),Math.max(target.width,target.height)*2.6,'盤面変更の旧幅');
    }else if(route.kind==='opening'){
      assert.ok(doc.getElementById('source').classList.contains('battle-opening-appearance-active'));
    }
    for(let i=1;i<8;i++){
      const to=info.durationMs*i/8;
      while(ctx.__vfxCaptureClock.now()+1000/60<to-1e-6)await ctx.__legacy.step(ctx.__vfxCaptureClock.now()+1000/60);
      await ctx.__legacy.step(to);
      assert.equal(ctx.__vfxCaptureClock.now(),to);
      if(route.kind==='special'&&i>4){
        const reverse=doc.querySelector('.special-vfx-host canvas');
        assert.ok(reverse&&/FRAME\d+/.test(reverse.recordedSrc),'実際に記録した旧フレームを逆順へ戻す');
      }
    }
    // 元画像は倍速にならない。新定義用の効果時計から独立した実経過時刻を使う。
    const media=created.find(el=>el.isConnected&&el.tagName==='IMG'&&el.className.includes('vfx'));
    if(media&&route.kind!=='special'&&route.kind!=='opening')assert.equal(media.src,frames.frames[Math.floor(info.durationMs*7/8/66)].src,'WebP独自時計');
    const end=info.durationMs+2000;
    while(ctx.__vfxCaptureClock.now()+1000/60<end-1e-6)await ctx.__legacy.step(ctx.__vfxCaptureClock.now()+1000/60);
    await ctx.__legacy.step(end);
    assert.equal(created.filter(el=>el.isConnected&&/^(?:damage-vfx-host|effect-sustain-host|special-vfx-clip|sweep-vfx-clip|map-board-change-vfx|battle-opening-appearance-vfx)$/.test(el.className)).length,0,entry.name+'の旧VFXの終了・除去 / '+speed+'倍');
    ctx.__legacy.dispose();assert.equal(doc.head.children.length,0,'旧CSSを除去');
    assert.equal(ctx.playHitVfxAtRect.toString().includes('現在の入口へ漏れた'),true,'現在の入口を保持');
  }
}

async function main(){
  const payload=legacySources();assert.equal(payload.baseline,'5d9e1d2');assert.equal(payload.functions.length,17);
  assert.match(payload.css,/\.vfx\{[^}]*mix-blend-mode:screen/);
  assert.match(payload.css,/\.effect-sustain-host\{\s*position:fixed/);
  assert.match(payload.css,/inset:-72%/);assert.match(payload.css,/steps\(34,jump-none\) 396ms/);
  assert.deepEqual(manifest.effects.filter(e=>routeFor(e.asset).applicability).map(e=>e.asset),['K009','K020','S001']);
  await historicalRoutes(payload);
  // 素材のdurationはPillowのload後の値。81msのhitを66msへ置き換えてはいけない。
  const extracted=assetFrames('hit',120);assert.equal(extracted.durationMs,1296);assert.equal(extracted.loop,1);
  assert.deepEqual(extracted.frames.map(f=>[f.at,f.duration]),[[0,81],[81,81]]);
  const assets=manifest.effects.map(e=>({asset:e.asset,data:assetFrames(e.asset,120)}));
  for(const {asset,data} of assets){
    if(asset==='appearance_sheet'){assert.equal(data.frames.length,1);continue;}
    const ref=JSON.parse(fs.readFileSync(path.join(__dirname,'refs',asset,'reference.json'),'utf8'));
    assert.equal(data.durationMs,ref.durationMs,asset+'の原画全尺');
  }
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-ingame-check-'));
  try{
    execFileSync('python3',['-c',[
      'from PIL import Image,ImageChops', 'from io import BytesIO', 'from pathlib import Path', 'import base64,json,sys',
      'for entry in json.load(sys.stdin):',
      '    with Image.open(Path(sys.argv[1])/(entry["asset"]+".webp")) as source:',
      '        for frame in entry["data"]["frames"]:',
      '            source.seek(frame["index"]); source.load()',
      '            decoded=Image.open(BytesIO(base64.b64decode(frame["src"].split(",",1)[1])))',
      '            diff=ImageChops.difference(decoded.convert("RGBA"),source.convert("RGBA"))',
      '            assert all(lo==hi==0 for lo,hi in diff.getextrema())'
    ].join('\n'),path.resolve(__dirname,'../../assets/vfx')],{input:JSON.stringify(assets)});
    const {ctx}=boot(),before=ctx.__vfxCaptureClock.now();
    const baseline=await captureBaseline({eval:code=>vm.runInContext('(async()=>{'+code+'})()',ctx),
      call:async(method,params)=>{assert.equal(method,'Page.captureScreenshot');assert.equal(params.clip.x,28);
        return {data:Buffer.from('PNG検査').toString('base64')};}},temp,'effect');
    assert.equal(ctx.__vfxCaptureClock.now(),before,'基準盤面の取得は効果時計を進めない');
    near(baseline.geometry.cards[0].left,745.8333129882812-28,'PNG左上からのカード座標');
    assert.equal(baseline.baselineFile,'baselines/effect.png','連結PNGと同じ階層へ基準盤面を置かない');
    const status=fs.readFileSync(path.join(__dirname,'STATUS.txt'),'utf8');
    const output=execFileSync('python3',[path.join(__dirname,'ingame_check.py'),temp],
      {encoding:'utf8',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
    assert.match(output,/ゲーム内比較の既知画素・32効果・不正入力拒否 OK/);
    assert.equal(fs.readFileSync(path.join(__dirname,'STATUS.txt'),'utf8'),status,'道具の数値成功を目視合格にしない');
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  console.log('ゲーム内比較の道具: 5d9e1d2の旧17関数・32素材・1/2/3倍の96経路・独立画像時計・逆再生・基準盤面・既知画素の数値・入力検証 OK（Chrome描画は未実行）');
}
if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={main};
