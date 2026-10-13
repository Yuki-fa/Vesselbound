#!/usr/bin/env node
'use strict';
// 2026-10-12 利用者指定：元WebPを旧ゲームの配置・CSSで、現在のLAB盤面へ重ねる。
// 旧コードはGitオブジェクトから読み、撮影ページ内の局所スコープだけで実行する。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {execFileSync,spawnSync}=require('node:child_process');
const {launch}=require('../parity/headless');
const {argumentsFor,assetsReady,captureBaseline}=require('./capture');
const {installCaptureClock}=require('./clock');
const {decodeImage}=require('./images');
const ROOT=path.resolve(__dirname,'../..'), BASELINE='5d9e1d2';
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'webp_manifest.json'),'utf8'));

function historicalFunction(source,name) {
  const match=new RegExp('^(?:async )?function '+name+'\\s*\\(','m').exec(source);
  if(!match)throw new Error('旧関数がありません: '+name);
  const line=source.slice(match.index,source.indexOf('\n',match.index));
  try{new vm.Script('('+line+')');return line;}catch(_){}
  const end=source.indexOf('\n}',match.index);
  if(end<0)throw new Error('旧関数の終端がありません: '+name);
  const text=source.slice(match.index,end+2);
  new vm.Script('('+text+')'); // 抽出範囲が関数1つであることを検証する。
  return text;
}
function legacySources() {
  const read=file=>execFileSync('git',['show',BASELINE+':prototype/'+file],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
  const render=read('js/engine/render.js'),present=read('js/battle/present.js'),html=read('index.html');
  const context=vm.createContext({window:{},module:{exports:{}},console});
  vm.runInContext(present,context);
  const constantNames=[...new Set([...present.matchAll(/^(?:const|let|var) (PRESENT_[A-Z0-9_]+)\b/gm)].map(m=>m[1]))];
  const constants=Object.fromEntries(constantNames.map(name=>[name,vm.runInContext(name,context)]));
  const literal=value=>Object.prototype.toString.call(value)==='[object Set]'
    ?'new Set('+JSON.stringify(Array.from(value))+')':JSON.stringify(value);
  const renderNames=['damageLabelDurationMs','_vfxVariantIndex','playHitVfxAtRect','playEffectVfxOnUnit',
    'playCurvedMissile','playAttackContactVfx','playExpandingWaveVfx','playManaGainVfx',
    'playSpecialProductionVfx','playCharacterSweepVfx'];
  const presentNames=['presentMissileEase','presentMissileControlPoints','presentMissileFlightMs','presentCharacterVfxScale','presentProjectileImpactOffsetY'];
  const js=Object.entries(constants).map(([k,v])=>'const '+k+'='+literal(v)+';').join('\n')+'\n'
    +'const VFX_VARIANT_COUNT=6;let _vfxVariantSeq=0;const _SWEEP_VFX_CROP={};\n'
    +renderNames.map(n=>historicalFunction(render,n)).join('\n')+'\n'
    +presentNames.map(n=>historicalFunction(present,n)).join('\n')+'\n'
    +historicalFunction(read('js/engine/battle.js'),'_battleOpeningLandingVfx')+'\n'
    +historicalFunction(read('js/engine/map.js'),'_playMapBoardChangeVfx');
  new vm.Script('(function(){'+js+'})');
  const css=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
  return {baseline:BASELINE,js,css,constants,functions:renderNames.concat(presentNames,
    '_battleOpeningLandingVfx','_playMapBoardChangeVfx')};
}

function routeFor(asset) {
  if(asset==='appearance_sheet')return {kind:'opening',entry:'_battleOpeningLandingVfx'};
  if(asset.startsWith('board_change'))return {kind:'board',entry:'_playMapBoardChangeVfx'};
  if(asset==='C043')return {kind:'sweep',entry:'playCharacterSweepVfx'};
  if(asset==='C011')return {kind:'expand',entry:'playExpandingWaveVfx'};
  if(asset==='C019_1'||asset==='E058_1')return {kind:'projectile',entry:'playCurvedMissile'};
  if(asset==='K007'||asset==='K008')return {kind:asset==='K007'?'pierce':'tri',entry:'playAttackContactVfx'};
  if(asset==='C008')return {kind:'sustain',entry:'playEffectVfxOnUnit'};
  if(asset==='K003')return {kind:'keyword-sustain',entry:'playEffectVfxOnUnit',
    caller:'presentKeywordEffectEvent → playKeywordEffectVfxSustained',fadeInMs:120,fadeOutMs:220};
  if(asset==='S004')return {kind:'rise',entry:'playManaGainVfx'};
  if(asset==='K019')return {kind:'special',entry:'playSpecialProductionVfx',scale:3,forwardMs:1750,reverseMs:1750,offsetY:-.05};
  // この3つは指定基準時点で既にLABへ移行済み。WebPの参考再生を実ゲーム経路とは区別する。
  if(asset==='S001')return {kind:'special',entry:'playSpecialProductionVfx',scale:1,forwardMs:500,reverseMs:500,
    applicability:'reference-only',reason:'5d9e1d2の主経路はbattle-summon。旧汎用WebP順逆再生で参考配置。'};
  const route={kind:'hit',entry:'playHitVfxAtRect'};
  if(asset==='K009'||asset==='K020')Object.assign(route,{applicability:'reference-only',
    reason:'5d9e1d2の主経路は'+(asset==='K009'?'all-cross':'revive-summon')+'。旧汎用WebP命中入口で参考配置。'});
  return route;
}

// 全コマをファイルへ出さず、尺内で必要なネイティブコマだけPillowからメモリへ取り出す。
function assetFrames(asset,maxMs) {
  if(!manifest.effects.some(e=>e.asset===asset)||!Number.isFinite(maxMs)||maxMs<0)throw new Error('素材／時刻が不正');
  const script=`from PIL import Image
from io import BytesIO
import json,base64,sys
with Image.open(sys.argv[1]) as im:
 durations=[];loop=im.info.get('loop',1)
 for i in range(im.n_frames):
  im.seek(i);im.load();durations.append(im.info.get('duration',0) or 1)
 total=sum(durations);stop=float(sys.argv[2]);at=0;frames=[]
 for i,ms in enumerate(durations):
  if at>stop and total>stop:break
  im.seek(i);buf=BytesIO();im.convert('RGBA').save(buf,format='PNG',compress_level=1)
  frames.append(dict(at=at,duration=ms,index=i,src='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()))
  at+=ms
 print(json.dumps(dict(durationMs=total,loop=loop,frames=frames)))`;
  const result=spawnSync('python3',['-c',script,path.join(ROOT,'assets/vfx',asset+'.webp'),String(maxMs)],
    {encoding:'utf8',timeout:60000,maxBuffer:192*1024*1024});
  if(result.error||result.status!==0)throw new Error('旧素材の抽出失敗: '+asset+' / '+(result.error||result.stderr));
  return JSON.parse(result.stdout);
}

// ページ側へ文字列化して渡す。ゲームのグローバル関数・データ・旧ファイルは変更しない。
async function installLegacy(payload,asset,route,info,frames,decode) {
  const clock=window.__vfxCaptureClock, stage=document.getElementById('stage'), nodes=new Set();
  const scale=asset.playbackMs/info.durationMs, scaled=new WeakSet(), animations=new Set();
  const sheet=new CSSStyleSheet();sheet.replaceSync(payload.css);
  function filterRules(rules) {
    return Array.from(rules).map(rule=>{
      if(rule.selectorText)return /(?:\bvfx|effect-sustain-host|battle-opening-appearance)/.test(rule.selectorText)?rule.cssText:'';
      if(rule.name)return /vfx|battle-opening-appearance/.test(rule.name)?rule.cssText:'';
      if(rule.cssRules){const nested=filterRules(rule.cssRules);return nested?rule.cssText.slice(0,rule.cssText.indexOf('{')+1)+nested+'}':'';}
      return '';
    }).join('\n');
  }
  const style=document.createElement('style');style.textContent=filterRules(sheet.cssRules);document.head.appendChild(style);
  const layer=document.createElement('div'), bounds=stage.getBoundingClientRect();
  Object.assign(layer.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'9999',
    clipPath:'inset('+bounds.top+'px '+(innerWidth-bounds.right)+'px '+(innerHeight-bounds.bottom)+'px '+bounds.left+'px)'});
  document.body.appendChild(layer);
  const cards=new Map(Array.from(document.querySelectorAll('.lab-card')).map(el=>[el.id,{id:el.id,side:el.dataset.side==='enemy'?'p2':'p1',element:el}]));
  const source=cards.get(info.source),targets=info.targets.map(id=>cards.get(id));
  if(!source||targets.some(u=>!u))throw new Error('旧配置のカードがありません');
  const cardRect=u=>u.element.getBoundingClientRect();
  // 原画は独自時計。effect用の仮想時刻ではなく、撮影の実経過msで選択する。
  function frameAt(ms) {
    let elapsed=ms;
    if(frames.loop===0)elapsed%=frames.durationMs;
    else if(elapsed<frames.durationMs*Math.max(1,frames.loop))elapsed%=frames.durationMs;
    else elapsed=frames.durationMs;
    return frames.frames.find(f=>f.at+f.duration>elapsed)||frames.frames[frames.frames.length-1];
  }
  await Promise.all(frames.frames.map(async f=>{const image=new Image();await decode(image,asset.asset+'/'+f.index,f.src);}));
  const first=frames.frames[0].src;
  const doc=new Proxy(document,{get(target,key){
    if(key==='createElement')return tag=>{const el=document.createElement(tag);nodes.add(el);
      if(tag==='img'){
        const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
        Object.defineProperty(el,'src',{get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,/assets\/vfx\//.test(value)?first:value);}});
      }
      return el;};
    if(key==='querySelector')return q=>q.startsWith('#hand-slots.board-slots')?targets[0].element:document.querySelector(q);
    const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  const localWindow={...payload.constants};
  const legacyWindow=new Proxy(window,{get(target,key){return key in localWindow?localWindow[key]:Reflect.get(target,key,target);},
    set(_target,key,value){localWindow[key]=value;return true;}});
  const timer=(fn,ms,...args)=>window.setTimeout(fn,ms/scale,...args);
  const bridge={window:legacyWindow,document:doc,performance:{now:()=>clock.now()*scale},
    requestAnimationFrame:fn=>window.requestAnimationFrame(ms=>fn(ms*scale)),setTimeout:timer,
    clearTimeout:window.clearTimeout,battlePresentationSetTimeout:timer,
    getBattlePresentationSpeedScale:()=>scale,_vfxHostParent:()=>layer,_battleBackgroundFrameRect:()=>stage.getBoundingClientRect(),
    _syncEffectFlashWithVfx:()=>{},actionBannerTrackVfxHost:()=>{},playSfx:()=>{},playFileSfx:()=>({addEventListener(){}}),
    _playBattleOpeningAppearanceSfx:()=>{},
    getCurrentUnitSlot:(_side,u)=>u.element,_captureUnitDamageRect:cardRect,_captureUnitEffectRect:cardRect,_captureSweepSourceRect:cardRect,
    _gameScale:()=>source.element.getBoundingClientRect().width/source.element.offsetWidth,
    _withVfxAssetVersion:()=>first,getEffectVfxPath:code=>'assets/vfx/'+code+'.webp',
    getEffectHitVfxPath:code=>'assets/vfx/'+code+'_2.webp',
    getCharacterEffectVfxPath:()=> 'assets/vfx/'+asset.asset+'.webp',
    G:{allies:Array.from(cards.values()).filter(u=>u.side==='p1'),enemies:Array.from(cards.values()).filter(u=>u.side==='p2')},
    Assets:{vfx:{hit:'assets/vfx/hit.webp'}}};
  const names=Object.keys(bridge);
  const api=new Function(...names,payload.js+'\nreturn {'+payload.functions.join(',')+'};')(...names.map(k=>bridge[k]));
  function scaleAnimations() {
    document.getAnimations().forEach(a=>{
      if(!scaled.has(a)){const timing=a.effect.getTiming(),duration=Number(timing.duration);
        if(Number.isFinite(duration))a.effect.updateTiming({duration:duration/scale,delay:timing.delay/scale});scaled.add(a);}
      animations.add(a);
    });
  }
  async function freeze(ms) {
    const selected=frameAt(ms);
    for(const el of nodes){
      if(!el.isConnected)continue;
      if(el.tagName==='IMG')await decode(el,asset.asset+'/'+selected.index,selected.src);
      else if(el.style.backgroundImage)el.style.backgroundImage='url("'+selected.src+'")';
    }
  }
  const side=source.side==='p2'?'enemy':'ally',s=api.presentCharacterVfxScale(route.kind==='projectile'?asset.asset.split('_')[0]:asset.asset);
  function start() {
    let result;
    const hit=()=>Promise.all(targets.map(u=>api.playHitVfxAtRect(cardRect(u),0,{
      customVfxPath:'assets/vfx/'+asset.asset+'.webp',vfxScale:s,hitDuration:asset.playbackMs,
      fadeDuration:asset.asset==='K024'?700:140,waitForFinish:true,keywordSfx:false,
      ...(asset.asset.endsWith('_2')?{effectHitCode:asset.asset.replace('_2','')}:{}),
    })));
    // 着弾の縦補正は旧effectHitVfxの枝にだけ入る。専用素材を引く関数も局所的に供給する。
    if(route.kind==='hit')result=hit();
    else if(route.kind==='sustain'){
      if(!api.playEffectVfxOnUnit(source,side,asset.asset,{durationMs:asset.playbackMs}))throw new Error('継続VFXの作成失敗');
    }else if(route.kind==='keyword-sustain'){
      targets.forEach(u=>{
        if(!api.playEffectVfxOnUnit(u,u.side==='p2'?'enemy':'ally',asset.asset,
          {durationMs:asset.playbackMs,fadeInMs:route.fadeInMs,fadeDuration:route.fadeOutMs}))throw new Error('キーワードVFXの作成失敗');
      });
    }else if(route.kind==='rise')api.playManaGainVfx(source,side);
    else if(route.kind==='projectile')result=api.playCurvedMissile({sourceRect:cardRect(source),targetRect:cardRect(targets[0]),
      asset:'assets/vfx/'+asset.asset+'.webp',code:asset.asset.split('_')[0],scale:s,flightMs:asset.playbackMs});
    else if(route.kind==='pierce'||route.kind==='tri')result=api.playAttackContactVfx({attacker:source,targets,
      targetSide:targets[0].side==='p2'?'enemy':'ally',mode:route.kind,path:'assets/vfx/'+asset.asset+'.webp',duration:asset.playbackMs,fadeDuration:150});
    else if(route.kind==='expand')result=api.playExpandingWaveVfx(source,side,targets,asset.asset,{});
    else if(route.kind==='sweep')result=api.playCharacterSweepVfx(source,side==='enemy',targets,'assets/vfx/'+asset.asset+'.webp',{sweepDuration:asset.playbackMs});
    else if(route.kind==='special')result=api.playSpecialProductionVfx(targets[0].element,'','assets/vfx/'+asset.asset+'.webp',()=>{},
      {scale:route.scale,forwardMs:route.forwardMs,reverseMs:route.reverseMs,fit:'cover',offsetY:cardRect(targets[0]).height*(route.offsetY||0)});
    else if(route.kind==='opening')api._battleOpeningLandingVfx(source.element);
    else if(route.kind==='board')result=api._playMapBoardChangeVfx(asset.asset==='board_change1',0,()=>{});
    else throw new Error('未知の旧経路');
    if(result&&result.catch)result.catch(e=>{window.__legacyError=e.message;});
  }
  window.__legacy={start,async step(to){await freeze(to);scaleAnimations();await clock.step(to);scaleAnimations();
    if(window.__legacyError)throw new Error(window.__legacyError);},dispose(){nodes.forEach(el=>el.remove());animations.forEach(a=>a.cancel());layer.remove();style.remove();}};
  // atlasは静止シート。元の背景・steps(34)を使い、単コマWebPの差し替えはしない。
  if(route.kind==='opening')style.textContent=style.textContent.replace(/url\(["']?assets\/vfx\/appearance_sheet\.webp["']?\)/g,'url("'+first+'")');
}

async function main(argv) {
  const opts=argumentsFor(argv);
  if(!opts){console.log('node tools/vfx_capture/legacy_ingame.js --url <LAB URL> --out <dir> [--names a,b またはtxt]');return;}
  const names=opts.names?opts.names.split(','):manifest.effects.map(e=>e.name);
  const entries=names.map(name=>{const e=manifest.effects.find(e=>e.name===name);if(!e)throw new Error('新32種に無い効果: '+name);return e;});
  const payload=legacySources();fs.mkdirSync(opts.out,{recursive:true});
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-legacy-ingame-'));
  const report={...opts,kind:'legacy-ingame',baseline:BASELINE,effects:[],status:'running'};let browser;
  try{
    browser=await launch({width:1600,height:1000});
    await browser.call('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
    await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:'('+installCaptureClock.toString()+')('+opts.seed+');'});
    for(const entry of entries){
      report.current={name:entry.name,stage:'盤面・旧素材の準備'};
      await browser.goto(opts.url);await browser.waitFor('window.VbFxPreview && VbFxPreview.ready');
      await browser.eval(`await VbFxPreview.select(${JSON.stringify(entry.name)},false);document.getElementById('volume').value='0';document.getElementById('speed').value=${opts.speed};VbFx.settings.seed=${opts.seed};`);
      await assetsReady(browser);
      const info=await browser.eval(`
        const play=VbFx.play;VbFx.play=function(n,o){return play(n,Object.assign({},o,{value:${opts.value},dir:1,speed:${opts.speed}}));};
        VbFxPreview.play().catch(e=>{window.__probeError=e.message;});await __vfxCaptureClock.step(0);
        const state=VbFxPreview.snapshot(),job=VbFx.snapshot()[0];if(!job)throw new Error(window.__probeError||'配置の計測失敗');
        const info={source:state.sourceId,targets:state.targetIds,durationMs:job.durationMs,impactMs:job.impactsMs};
        VbFxPreview.stop();VbFx.play=play;await Promise.resolve();return info;`);
      const baseline=await captureBaseline(browser,opts.out,entry.name),route=routeFor(entry.asset);
      const times=Array.from({length:opts.frames},(_,i)=>info.durationMs*i/opts.frames);
      const frames=assetFrames(entry.asset,route.kind==='special'?info.durationMs/2:times[times.length-1]);
      await browser.eval(`await (${installLegacy})(${JSON.stringify(payload)},${JSON.stringify(entry)},${JSON.stringify(route)},${JSON.stringify(info)},${JSON.stringify(frames)},${decodeImage});__legacy.start();await __legacy.step(0);`);
      const files=[];
      for(let i=0;i<times.length;i++){
        report.current={name:entry.name,stage:'旧ゲーム内コマ',frame:i+1,timeMs:times[i]};
        await browser.eval(`const end=${times[i]};while(__vfxCaptureClock.now()+1000/60<end-.000001)await __legacy.step(__vfxCaptureClock.now()+1000/60);await __legacy.step(end);`);
        const shot=await browser.call('Page.captureScreenshot',{format:'png',clip:baseline.geometry.stage});
        const file=path.join(temp,entry.name+'_'+i+'.png');fs.writeFileSync(file,Buffer.from(shot.data,'base64'));files.push(file);
      }
      const result=spawnSync('python3',[path.join(__dirname,'compare.py'),'--strip',path.join(opts.out,entry.name+'.png'),JSON.stringify(times),...files],{encoding:'utf8'});
      if(result.status!==0)throw new Error(result.stderr||'旧コマの連結失敗');
      report.effects.push({name:entry.name,...info,...baseline,times,file:entry.name+'.png',legacyAsset:entry.asset,legacyRoute:route});
      await browser.eval('__legacy.dispose();');delete report.current;console.log(entry.name+': '+opts.frames+'コマ / '+route.entry+(route.applicability?'（参考経路）':''));
    }
    report.status='captured';
  }catch(e){report.status=browser?'failed':'unexecuted';report.reason=(report.current?report.current.name+' / '+report.current.stage+': ':'')+e.message;throw new Error(report.reason,{cause:e});}
  finally{if(browser)await browser.close();fs.rmSync(temp,{recursive:true,force:true});fs.writeFileSync(path.join(opts.out,'capture.json'),JSON.stringify(report,null,2)+'\n');}
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={BASELINE,historicalFunction,legacySources,routeFor,assetFrames,installLegacy,main};
