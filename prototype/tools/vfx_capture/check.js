'use strict';
// Chromeへ接続せず、注入時計・既存画像のコマ固定・別URL・PNG連結を実行する。
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {installCaptureClock}=require('./clock'),{argumentsFor,freezeSprites}=require('./capture');
const {frameSource,decodeImage}=require('./images');

class CaptureImage {
  constructor(src) {
    this.tagName='IMG';this.dataset={};this.listeners=new Map();this.assignments=0;this.complete=true;this.naturalWidth=0;
    if(src)this.src=src;
  }
  get src(){return this.source||'';}
  set src(source){
    this.source=source;this.complete=false;this.naturalWidth=0;const request=++this.assignments;
    // 対象ページのサーバーには静止コマが無い。data URLと元の素材だけ読める。
    queueMicrotask(()=>{
      if(request!==this.assignments)return;
      this.complete=true;this.naturalWidth=source.includes('/capture_frames/')?0:394;
      for(const listener of [...(this.listeners.get(this.naturalWidth?'load':'error')||[])])listener();
    });
  }
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
  async decode(){if(!this.complete||!this.naturalWidth||this.failDecode)throw new Error('EncodingError: The source image cannot be decoded.');}
}

async function main(){
  let observe;const animations=[],image=new CaptureImage('http://127.0.0.1:5817/assets/vfx/K009.webp?vblab=1');
  // オーバーロードの残像JPEGとAnimated WebPが同じVFX層に並ぶ撮影を再現する。
  const portrait=new CaptureImage('http://127.0.0.1:5817/assets/art/characters/C097.jpg?v=1');
  const staticPng=new CaptureImage('http://127.0.0.1:5817/assets/art/static.png');
  const fxImages=[portrait,image,staticPng];
  const context=vm.createContext({URL,performance:{now:()=>999},document:{getAnimations:()=>animations,querySelectorAll:q=>q.includes('data-vb-fx')?fxImages:[]},
    MutationObserver:function(fn){observe=fn;this.observe=()=>{};},location:{href:'http://127.0.0.1:5817/tools/vfx_preview.html'}});
  context.window=context;
  vm.runInContext('('+installCaptureClock.toString()+')(53);',context);
  const evaluate=code=>vm.runInContext('(async()=>{'+code+'})()',context);
  assert.equal(vm.runInContext('performance.now()',context),0);
  assert.equal(vm.runInContext('Date.now()',context),1791417600000);
  const random=vm.runInContext('[Math.random(),Math.random()]',context);
  const second=vm.createContext({performance:{},document:{getAnimations:()=>[]},MutationObserver:function(){this.observe=()=>{};}});second.window=second;
  vm.runInContext('('+installCaptureClock.toString()+')(53);',second);
  assert.deepEqual(Array.from(random),Array.from(vm.runInContext('[Math.random(),Math.random()]',second)));
  await evaluate(`
    window.calls=[];
    const canceled=requestAnimationFrame(()=>calls.push('不正'));
    cancelAnimationFrame(canceled);
    requestAnimationFrame(ms=>{calls.push(ms);requestAnimationFrame(next=>calls.push(next));});
    setTimeout(()=>calls.push('timer'),10);
    await __vfxCaptureClock.step(20);
  `);
  assert.deepEqual(Array.from(context.calls),['timer',20]);
  observe([{addedNodes:[image]}]);assert.equal(context.__vfxCaptureClock.imageStart(image),20);
  const animation={pause(){this.paused=true;}};animations.push(animation);
  await context.__vfxCaptureClock.step(50);assert.equal(animation.currentTime,0);assert.equal(animation.paused,true);
  await context.__vfxCaptureClock.step(100);assert.equal(animation.currentTime,50);
  assert.deepEqual(Array.from(context.calls),['timer',20,50]);
  await assert.rejects(context.__vfxCaptureClock.step(99),/巻き戻せません/);
  context.VbFxCaptureFrames={K009:[{at:0,duration:66,file:'K009_000.webp'},{at:66,duration:66,file:'K009_001.webp'},{at:132,duration:66,file:'K009_002.webp'}]};
  // 修正前の「対象ページへ静止コマを要求して即decode」は、旧配信フォルダで失敗する。
  image.src='http://127.0.0.1:5817/tools/vfx_preview/capture_frames/K009_001.webp';
  await assert.rejects(image.decode(),/EncodingError/);assert.equal(image.naturalWidth,0);
  image.src='http://127.0.0.1:5817/assets/vfx/K009.webp?vblab=1';
  await freezeSprites({eval:evaluate});assert.match(image.src,/^data:image\/(?:webp|png);base64,/);
  assert.equal(image.dataset.captureFrame,'K009_001.webp');assert.equal(context.__vfxCaptureClock.now(),100);
  assert.equal(portrait.src,'http://127.0.0.1:5817/assets/art/characters/C097.jpg?v=1');
  assert.equal(staticPng.src,'http://127.0.0.1:5817/assets/art/static.png');
  assert.equal(portrait.assignments,1);assert.equal(staticPng.assignments,1);
  assert.equal(portrait.dataset.captureFrame,undefined);assert.equal(staticPng.dataset.captureFrame,undefined);
  portrait.failDecode=true;
  await assert.rejects(freezeSprites({eval:evaluate}),/C097\.jpg.*EncodingError/); // 静止画像もデコードを待つ
  portrait.failDecode=false;
  const unsupported=new CaptureImage('http://127.0.0.1:5817/assets/vfx/K999.webp');
  fxImages.push(unsupported);
  await assert.rejects(freezeSprites({eval:evaluate}),/静止コマの無いAnimated WebP: K999/); // 未対応WebPは隠さない
  fxImages.pop();
  fxImages.splice(1,1);
  await freezeSprites({eval:evaluate}); // オーバーロード同様、静止画像だけのVFX層も撮れる
  fxImages.splice(1,0,image);
  const assignments=image.assignments;
  await freezeSprites({eval:evaluate});assert.equal(image.assignments,assignments); // 同じコマのsrcを再設定しない
  await context.__vfxCaptureClock.step(170);
  await freezeSprites({eval:evaluate});assert.equal(image.dataset.captureFrame,'K009_002.webp'); // data URLに変えた画像も更新する
  image.failDecode=true;
  await assert.rejects(freezeSprites({eval:evaluate}),/K009_002\.webp \/ EncodingError/);
  image.failDecode=false;
  assert.equal(image.listeners.get('load').size,0);assert.equal(image.listeners.get('error').size,0);
  const pending=new CaptureImage();
  // src更新直後のdecode拒否も再現し、ネイティブload後のデコードで解消する。
  pending.src=image.src;await assert.rejects(pending.decode(),/EncodingError/);
  await decodeImage(pending,'同じコマ',image.src);
  await decodeImage(pending,'次のコマ',frameSource('K009_000.webp'));
  const httpUrl=context.location.href;
  context.location.href='file:///tmp/baseline/tools/vfx_preview.html';
  await freezeSprites({eval:evaluate});assert.equal(image.dataset.captureFrame,'K009_002.webp');
  context.location.href=httpUrl;
  assert.equal(argumentsFor(['--url',context.location.href,'--out','/tmp/vfx','--names','banshee','--frames','8']).url,context.location.href);
  assert.throws(()=>argumentsFor(['--url',context.location.href,'--out','/tmp/vfx','--frames','0']),/2〜64/);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-vfx-png-check-'));
  try{
    // 道具側にもGit管理外の静止コマが無い場合は、元WebPから抽出してメモリで渡す。
    const missingFrames=path.join(temp,'missing-frames');
    const extracted=frameSource('K009_002.webp',missingFrames);
    assert.match(extracted,/^data:image\/png;base64,/);assert.equal(fs.existsSync(missingFrames),false);
    execFileSync('python3',['-c',[
      'from PIL import Image, ImageChops', 'from io import BytesIO', 'import sys',
      'with Image.open(BytesIO(sys.stdin.buffer.read())) as frame, Image.open(sys.argv[1]) as source:',
      '    source.seek(2)', '    assert frame.n_frames == 1',
      '    diff = ImageChops.difference(frame.convert("RGBA"), source.convert("RGBA"))',
      '    assert all(lo == hi == 0 for lo, hi in diff.getextrema())'
    ].join('\n'),path.join(__dirname,'../../assets/vfx/K009.webp')],{input:Buffer.from(extracted.split(',')[1],'base64')});
    assert.equal(frameSource('K009_002.webp',missingFrames),extracted);
    assert.throws(()=>frameSource('../K009_002.webp'),/ファイル名が不正/);
    assert.throws(()=>frameSource('K009_002.webp',missingFrames,path.join(temp,'missing-assets')),/静止コマを抽出できません: K009_002.webp/);
    execFileSync('python3',['-c','from PIL import Image; import sys; Image.new("RGB",(32,16),"#884411").save(sys.argv[1]); Image.new("RGB",(32,16),"#336688").save(sys.argv[2])',path.join(temp,'a.png'),path.join(temp,'b.png')]);
    const before=path.join(temp,'before'),after=path.join(temp,'after'),out=path.join(temp,'compare');fs.mkdirSync(before);fs.mkdirSync(after);
    for(const dir of[before,after])execFileSync('python3',[path.join(__dirname,'compare.py'),'--strip',path.join(dir,'effect.png'),'[0,100]',path.join(temp,'a.png'),path.join(temp,'b.png')]);
    execFileSync('python3',[path.join(__dirname,'compare.py'),before,after,out]);
    const effectMetrics=fs.readFileSync(path.join(out,'effects.csv'),'utf8');
    assert.match(effectMetrics,/effect,frames,max_mae,max_local_mae,min_ssim/);
    assert.match(effectMetrics,/effect,2,0(?:\.0)?,0(?:\.0)?,1(?:\.0)?/);
    assert.match(effectMetrics,/NUMERIC_OK,UNREVIEWED,RGB_EXACT/);
    // 目安以下の1チャンネル差も「完全一致」としない。
    execFileSync('python3',['-c',[
      'from PIL import Image, PngImagePlugin', 'import sys',
      'p=sys.argv[1]; im=Image.open(p).convert("RGB"); meta=PngImagePlugin.PngInfo()',
      'meta.add_text("vfx_capture",im.info["vfx_capture"])',
      'r,g,b=im.getpixel((0,24)); im.putpixel((0,24),(r+1,g,b)); im.save(p,pnginfo=meta)'
    ].join('\n'),path.join(after,'effect.png')]);
    execFileSync('python3',[path.join(__dirname,'compare.py'),before,after,out]);
    assert.match(fs.readFileSync(path.join(out,'effects.csv'),'utf8'),/NUMERIC_OK,UNREVIEWED,PIXEL_DIFF/);
    execFileSync('python3',['-c',[
      'import importlib.util', 'from PIL import Image', 'import sys',
      's = importlib.util.spec_from_file_location("compare", sys.argv[1]); m = importlib.util.module_from_spec(s); s.loader.exec_module(m)',
      'a = Image.new("RGB", (65, 33), "black"); b = a.copy(); b.putpixel((64,32), (255,0,0))',
      'v = m.metrics(a, b)',
      'assert abs(v["mae"] - 255/(65*33*3)) < 1e-12',
      'assert v["max_local_mae"] == 85 and v["max_channel_diff"] == 255',
      'assert v["changed_pixels"] == 1 and v["local_x"] == 64 and v["local_y"] == 32',
      'assert v["ssim"] < 1',
      'assert m.metrics(a, a)["ssim"] == 1'
    ].join('\n'),path.join(__dirname,'compare.py')]);
    const dimensions=execFileSync('python3',['-c','from PIL import Image; import sys; print(Image.open(sys.argv[1]).size)',path.join(out,'effect.png')],{encoding:'utf8'});
    assert.equal(dimensions.trim(),'(64, 128)');
    // 第2段の一覧txtと参考比較を、32効果の検査用PNGで実行する（実画面ではない）。
    const namesFile=path.join(__dirname,'webp_targets.txt');
    const names=fs.readFileSync(namesFile,'utf8').trim().split(/\r?\n/);
    assert.equal(argumentsFor(['--url',context.location.href,'--out',temp,'--names',namesFile]).names,names.join(','));
    assert.throws(()=>argumentsFor(['--url',context.location.href,'--out',temp,'--names','banshee,banshee']),/重複/);
    const dummy=path.join(temp,'new'),paired=path.join(temp,'ref-paired');
    execFileSync('python3',['-c',[
      'import sys,json', 'from pathlib import Path', 'from PIL import Image',
      'base=Path(sys.argv[1]); out=Path(sys.argv[2]); out.mkdir()',
      'manifest=json.loads((base/"webp_manifest.json").read_text()); records=[]',
      'for effect in manifest["effects"]:',
      '    ms=effect["playbackMs"]; times=[ms*i/8 for i in range(8)]',
      '    image=Image.new("RGB",(128,44),"#336688"); image.save(out/(effect["name"]+".png"))',
      '    records.append(dict(name=effect["name"],file=effect["name"]+".png",durationMs=ms,times=times,impactMs=[]))',
      '(out/"capture.json").write_text(json.dumps(dict(status="captured",effects=records)))'
    ].join('\n'),__dirname,dummy]);
    const status=fs.readFileSync(path.join(__dirname,'STATUS.txt'),'utf8');
    execFileSync('python3',[path.join(__dirname,'ref_compare.py'),'--new',dummy,'--out',paired],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
    const comparisons=JSON.parse(fs.readFileSync(path.join(paired,'ref_compare.json'),'utf8'));
    assert.equal(comparisons.effects.length,32);assert.equal(comparisons.visualReview,'UNREVIEWED');
    assert.equal(fs.readFileSync(path.join(__dirname,'STATUS.txt'),'utf8'),status,'道具の成功を目視合格にしない');
    execFileSync('python3',['-c',[
      'from PIL import Image', 'from pathlib import Path', 'import json,sys',
      'out=Path(sys.argv[1]); data=json.loads((out/"ref_compare.json").read_text())',
      'for entry in data["effects"]:',
      '    image=Image.open(out/entry["file"]); assert image.size==(128,168)',
      '    assert image.getpixel((0,148))==(51,102,136)',
      'report=Path(sys.argv[2])/"capture.json"; data=json.loads(report.read_text()); data["effects"][0]["times"][1]+=1',
      'report.write_text(json.dumps(data))'
    ].join('\n'),paired,dummy]);
    assert.throws(()=>execFileSync('python3',[path.join(__dirname,'ref_compare.py'),'--new',dummy,'--out',paired],{stdio:'pipe',env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}}),/i\/8/);
    fs.unlinkSync(path.join(before,'effect.png'));
    assert.throws(()=>execFileSync('python3',[path.join(__dirname,'compare.py'),before,after,out],{stdio:'pipe'}),/比較対象が一致しません/);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
  await require('./ingame_check').main();
  console.log('撮影道具: 外部時計・seed・RAF・CSS・残像JPEG/PNGとWebPの混在・未対応WebPの拒否・静止コマ未配信・load待機・元WebP抽出・別ポート・file://・PNG比較・一覧txt・参考32効果比較・時刻誤りの拒否 OK（Chrome撮影は未実行）');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
