'use strict';
// 2026-10-12: 21種の宣言データ、共有部品、SE契約と、作業前82種のCanvas命令を検査。
// 画素・聴感・目視の合格をこの検査で代用しない。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {validatedBundle,literalDefinition}=require('../vfx_export');
const {harness,traceQuality}=require('./vfx_data_regression');
const ROOT=path.resolve(__dirname,'../..'),BASELINE='097927f8332c7a55701eaa82aebc7b2177d17016';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const names=read('tools/vfx_capture/new_targets_1012.txt').trim().split(/\r?\n/);
async function baselineChecks(){
  const cache=new Map(),sourceLoader=file=>{if(!cache.has(file))cache.set(file,execFileSync('git',['show',BASELINE+':prototype/'+file],{cwd:ROOT,encoding:'utf8',maxBuffer:4e6}));return cache.get(file);};
  // webp.js（置換32種）は2026-10-14から品質向上で作り直しているので、不変の確認は元の50種と図形だけにする。
  for(const file of ['js/vfx/defs/geometry.js','js/vfx/defs/effects.js','js/vfx/defs/webp_geometry.js'])assert.equal(read(file),sourceLoader(file),'既存の全定義を保持: '+file);
  const before=harness(false,null,{sourceLoader,excludeScripts:['js/vfx/defs/characters_1012.js','js/vfx/defs/additions_1017.js']}),after=harness(false);
  assert.equal(before.fx.effects.length,82);
  // 描画命令の完全一致は元の50種（effects.js）だけ。置換32種（webp.js）は2026-10-14から作り直している。
  const original=new Set(literalDefinition(read('js/vfx/defs/effects.js'),'effects').effects.map(d=>d.name));assert.equal(original.size,50);
  for(const d of before.fx.effects.filter(d=>original.has(d.name)))for(const speed of [1.5,3,4.5]){
    const pending=[];for(const h of [before,after])pending.push(h.fx.play(d.name,{source:h.fx.rect(h.source),targets:[h.fx.rect(h.target),h.fx.rect(h.target2)],allies:[h.fx.rect(h.source)],enemies:[h.fx.rect(h.target),h.fx.rect(h.target2)],board:h.body,speed,seed:53,dir:1,value:3}));
    const ms=before.fx.duration(d.name,speed);assert.equal(after.fx.duration(d.name,speed),ms);
    for(let i=0;i<8;i++)assert.deepEqual(after.step(ms*i/8),before.step(ms*i/8),d.name+' speed='+speed+' frame='+i+'の描画命令');
    before.fx.stopAll();after.fx.stopAll();await Promise.all(pending);
  }
  console.log('OK 元の50種: 定義3ファイル完全一致 / 3速さ×8時刻のCanvas命令完全一致（画素は未確認）');
}
async function newDataChecks(){
  const {bundle,jsonBytes}=validatedBundle(),data=literalDefinition(read('js/vfx/defs/characters_1012.js'),'characters_1012');
  assert.equal(names.length,21);assert.equal(new Set(names).size,21);assert.equal(data.effects.length,20);
  const shared=data.effects.find(d=>d.name==='phantom');assert.equal(shared.variants.length,1);assert.equal(shared.variants[0].name,'eidolon');
  // 2026-10-17: additions_1017.js の新規分を除いて数える（第2段の総数は変えない）。
  const added1017=(t=>JSON.parse(t.slice(t.indexOf('VbFxDefs.register(')+18,t.lastIndexOf(');'))))(require('fs').readFileSync(require('path').join(__dirname,'../../js/vfx/defs/additions_1017.js'),'utf8')).effects.length;
  assert.ok(jsonBytes<=1e6);assert.equal(bundle.effects.length,102+added1017);
  const h=harness(false);assert.equal(h.fx.effects.length,103+added1017);
  assert.equal(h.fx.effects.find(d=>d.name==='phantom').layers,h.fx.effects.find(d=>d.name==='eidolon').layers,'共有定義の層を参照し、複製しない');
  for(const name of names)for(const speed of [1.5,3,4.5]){
    const def=h.fx.effects.find(d=>d.name===name);assert.ok(def&&def.sourceCode);
    assert.ok(!def.layers.some(l=>l.type==='sprite'||l.type==='flash'),'新規は画像や全カード色面を使わない: '+name);
    const value=name==='eidolon'?2:name==='arch-demon'||name==='lilith'||name==='sleep-sheep'||name==='minotaur'?3:name==='incubus'?2:1;
    const targets=[h.fx.rect(h.target),h.fx.rect(h.target2)];targets[0].color='#ff728c';targets[1].color='#54baff';
    const promise=h.fx.play(name,{source:h.fx.rect(h.source),targets,board:h.body,speed,seed:53,dir:1,value});
    let draws=0;for(let i=0;i<16;i++)draws+=traceQuality(h.step(h.fx.duration(name,speed)*i/16),name);
    assert.ok(draws>0,name+' の実部品に描画がある');h.fx.stopAll();await promise;
    assert.equal(h.fx.activeCount(),0);assert.equal(h.body.children.length,0,name+' の残像/描画層を除去');
    for(const el of [h.source,h.target,h.target2])for(const prop of ['opacity','filter','transform','mask-image','mask-size','z-index'])assert.equal(el.style.getPropertyValue(prop),'',name+' のstyleを復元');
  }
  // 2026-10-12指定・撮影第2回: 描画の有無だけでなく、光球・花弁・血滴の実個数を数える。
  for(const [name,index] of [['nymph',2],['lilith',0],['sleep-sheep',3],['incubus',2]]){
    const original=data.effects.find(d=>d.name===name),layer=original.layers[index];
    const probe={...structuredClone(original),name:'copies-probe',label:'copies probe',layers:[layer]};
    const ch=harness(false,{schemaVersion:2,effects:[probe]});
    const filledPaths=ch.ctx.VbFxDefs.shapes[layer.shape].paths.filter(p=>p.fill!=='none').length;
    assert.ok(filledPaths>0);
    for(const speed of [1.5,3,4.5])for(const value of [1,2,3,5]){
      const job=ch.fx.play(probe.name,{source:ch.fx.rect(ch.source),targets:[ch.fx.rect(ch.target)],speed,value,seed:53});
      ch.step(0);const [start,end]=layer.time,trace=ch.step((start+(end-start)*.3)*ch.fx.duration(probe.name,speed));
      assert.equal(trace.filter(r=>r[0]==='fill').length,value*filledPaths,name+' value='+value+'の実個数');
      const centers=trace.filter((r,i)=>r[0]==='translate'&&trace[i+1]?.[0]==='rotate').map(r=>r.slice(1).join(','));
      assert.equal(new Set(centers).size,value,name+'の個体を別々の位置へ置く');
      ch.fx.stopAll();await job;
    }
  }
  // 時差を付けない同じ部品との比較。既存にはこのパラメータを適用しない。
  const sample=structuredClone(data.effects.find(d=>d.name==='arch-demon'));sample.name='pulse-probe';sample.label='pulse probe';sample.layers=[sample.layers[2]];
  const pulse=harness(false,{schemaVersion:2,effects:[sample]});
  pulse.fx.play(sample.name,{source:pulse.fx.rect(pulse.source),targets:[pulse.fx.rect(pulse.target)],speed:1.5,seed:53,value:3});
  const ms=pulse.fx.duration(sample.name,1.5);pulse.step(0);const traces=[0,1,2].map(n=>pulse.step((.14+.82*(n+.5)/3)*ms));
  assert.ok(traces.every(t=>traceQuality(t,'有限脈動')>0));pulse.fx.stopAll();
  for(const speed of [1.5,3,4.5])for(const value of [1,2,3,5]){
    const job=pulse.fx.play(sample.name,{source:pulse.fx.rect(pulse.source),targets:[pulse.fx.rect(pulse.target)],speed,value,seed:53});
    pulse.step(0);const ms=pulse.fx.duration(sample.name,speed);
    for(let i=0;i<value;i++){
      const start=.14+.82*i/value;
      const quiet=pulse.step((start+.82*.001/value)*ms),bright=pulse.step((start+.82*.3/value)*ms);
      const opacity=t=>Math.max(0,...t.filter(r=>r[0]==='globalAlpha'&&r[1]<1).map(r=>r[1]));
      assert.ok(opacity(quiet)<.001,'脈動'+i+'の谷へ戻る: '+value);
      assert.ok(opacity(bright)>.5,'実際の脈動'+i+'が発光: '+value);
    }
    pulse.fx.stopAll();await job;
  }
  const notify=harness(false),seen=[],times=notify.fx.pulseTimes('arch-demon',3),duration=notify.fx.duration('arch-demon',1.5);
  assert.equal(times.length,3);assert.ok(times.every((t,i)=>t>0&&t<1&&(!i||t>times[i-1])));
  const notified=notify.fx.play('arch-demon',{source:notify.fx.rect(notify.source),targets:[notify.fx.rect(notify.target)],speed:1.5,value:3,seed:53,
    cueTimesMs:times.map(t=>t*duration),onCue:i=>seen.push(i)});
  notify.step(0);for(const t of times){notify.step(t*duration+.001);notify.step(t*duration+.001);}
  assert.deepEqual(seen,[0,1,2],'実フレームの各脈動通知は一度だけ');notify.fx.stopAll();await notified;
  // 撮影第1回で落ちた色光・花弁の大きさ・亡霊波の通過位置を実描画で検査する。
  const colored=harness(false),colorTargets=[colored.fx.rect(colored.target),colored.fx.rect(colored.target2)];
  colorTargets[0].color='#ff728c';colorTargets[1].color='#54baff';
  const coloredJob=colored.fx.play('nymph',{source:colored.fx.rect(colored.source),targets:colorTargets,speed:1.5,value:2,seed:53});
  colored.step(0);
  const colors=new Set(colored.step(135).filter(r=>r[0]==='strokeStyle').map(r=>r[1]));
  assert.ok(colors.has('#ff728c')&&colors.has('#54baff'),'各カードの色が座標更新後の光線へ届く');
  colored.fx.stopAll();await coloredJob;
  const petal=data.effects.find(d=>d.name==='lilith').layers[0],petalPath=data.shapes['petal-seal'].paths[0].d;
  const petalScales=[];
  for(const size of [1,2]){
    const probe={...structuredClone(data.effects.find(d=>d.name==='lilith')),name:'petal-probe',label:'petal probe',ms:500,
      impact:{atMs:250,cueMs:250},layers:[{...petal,copies:1,time:[0,1]}]};
    delete probe.layers[0].bind;
    const ph=harness(false,{schemaVersion:2,effects:[probe]});
    const job=ph.fx.play(probe.name,{source:ph.fx.rect(ph.source),size,speed:1.5,seed:53});
    ph.step(0);
    const trace=ph.step(100),fill=trace.findIndex(r=>r[0]==='fill'&&Array.isArray(r[1])&&r[1][1]===petalPath);
    assert.ok(fill>=0,'花弁の外形が描かれる');
    const scale=trace.slice(0,fill).findLast(r=>r[0]==='scale');assert.ok(scale&&scale[1]>5,'花弁を1pxの点にしない');
    petalScales.push(scale[1]);ph.fx.stopAll();await job;
  }
  assert.equal(petalScales[1],petalScales[0]*2,'カードの描画倍率に花弁の外形も追従する');
  const waveProbe={...structuredClone(shared),name:'wave-probe',label:'wave probe',layers:[shared.layers[0]]};delete waveProbe.variants;
  const wh=harness(false,{schemaVersion:2,effects:[waveProbe]}),source=wh.fx.rect(wh.source);
  const waveJob=wh.fx.play(waveProbe.name,{source,targets:[wh.fx.rect(wh.target)],speed:1.5,seed:53});
  wh.step(0);
  const wt=wh.step(300),stroke=wt.findIndex(r=>r[0]==='stroke');
  const radius=Math.max(...wt.slice(0,stroke).filter(r=>r[0]==='lineTo'||r[0]==='moveTo').map(r=>Math.hypot(r[1]-(source.left+source.width/2),r[2]-(source.top+source.height/2))));
  assert.ok(radius>source.width&&radius<source.width*2,'最初の撮影間隔で波が近隣カードの領域に残る');
  wh.fx.stopAll();await waveJob;
  // 命中の通知が出る瞬間に、LABの本体も実際に敵の位置へ到着している。
  for(const speed of [1.5,3,4.5])for(const value of [1,2,3]){
    const dash=harness(false),seen=[];
    const job=dash.fx.play('minotaur',{source:dash.fx.rect(dash.source),targets:[dash.fx.rect(dash.target)],speed,value,seed:53,onImpact:i=>seen.push(i)});
    dash.step(0);const hit=dash.fx.snapshot()[0].impactsMs[0];dash.step(hit+.001);
    const m=dash.source.style.getPropertyValue('transform').match(/translate\(([-\d.]+)px,([-\d.]+)px\)/);
    assert.ok(m,'ミノタウロスの移動');
    assert.ok(Math.abs(+m[1]-(value===3?440:0))<.001&&Math.abs(+m[2]-(value===3?-380:0))<.001,'value='+value+'の命中時の位置');
    assert.ok(+dash.source.style.getPropertyValue('z-index')>+dash.target.style.getPropertyValue('z-index'),'接触時に同じ親の敵カードより前へ出す');
    assert.deepEqual(seen,[0]);dash.step(dash.fx.duration('minotaur',speed));
    await job;assert.equal(dash.source.style.getPropertyValue('transform'),'','突進後のstyle復元');
    assert.equal(dash.source.style.getPropertyValue('z-index'),'','突進後の重なり順を復元');
  }
  // 2026-10-14: スリープシープ・インキュバスは四角い溶解をやめ、体が深紅に染まって薄れる（色処理＋不透明度）。
  // 途中で色処理と薄れが掛かり、終了後に元へ戻ることを確かめる（3速さ）。
  for(const name of ['sleep-sheep','incubus'])for(const speed of [1.5,3,4.5]){
    const fade=harness(false),el=name==='incubus'?fade.target:fade.source;
    const job=fade.fx.play(name,{source:fade.fx.rect(fade.source),targets:[fade.fx.rect(fade.target)],speed,value:name==='incubus'?2:3,seed:53});
    fade.step(0);const ms=fade.fx.duration(name,speed);fade.step(ms*.4);
    assert.match(el.style.getPropertyValue('filter'),/sepia\(/,'深紅へ染める色処理');
    assert.ok(+el.style.getPropertyValue('opacity')<1,'体が薄れる');
    assert.equal(el.style.getPropertyValue('mask-image'),'','四角い溶解のマスクを使わない');
    fade.step(ms);await job;
    for(const property of ['filter','opacity','mask-image'])assert.equal(el.style.getPropertyValue(property),'','終了後に'+property+'を復元');
  }
  console.log('OK 第3回撮影の回帰: 接触時の重なり順と復元 / 体が深紅に染まって薄れ・終了後復元（3速さ）');
  console.log('OK 第2回撮影の回帰: 光球・花弁・血滴の実個数 / 脈動1・2・3・5回の谷と発光 / 突進と命中の位置同期（3速さ）');
  console.log('OK 第1回撮影の回帰: ニンフの2色光 / 花弁の外形と倍率 / 亡霊波の近隣カード通過');
  console.log('OK 新21種: 20定義+共有派生1 / 3速さ×16時刻・有限数・実描画・残像の除去・復元・JSON '+jsonBytes+' bytes');
}
function audioChecks(){
  const raw=read('tools/vfx_preview/se_catalog.js'),catalog=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
  const picks=JSON.parse(read('tools/vfx_preview/se/picks_1012.json')),used=new Set(),hashes=new Set();
  const old=execFileSync('git',['show',BASELINE+':prototype/tools/vfx_preview/se_catalog.js'],{cwd:ROOT,encoding:'utf8'});
  const previous=JSON.parse(old.slice(old.indexOf('{'),old.lastIndexOf('}')+1));
  for(const [id,sound]of Object.entries(previous.sounds))assert.deepEqual(catalog.sounds[id],sound,'既存SEの登録値を保持: '+id);
  for(const [name,entry]of Object.entries(picks)){
    assert.equal(catalog.effects[name].length,3);
    for(let i=1;i<=3;i++){
      const sound=catalog.sounds[name+'-'+i];assert.ok(sound);assert.ok(!/Human|Voice|Whisper|Speak|Chant|Scream|Howl|Growl|Creature|Animal|Monster/i.test(sound.filename));
      assert.ok(!Object.values(previous.sounds).some(s=>s.filename===sound.filename),'既存候補と重複しない');
      assert.ok(!used.has(sound.source));used.add(sound.source);assert.ok(!hashes.has(sound.sha256));hashes.add(sound.sha256);
      const bytes=fs.readFileSync(path.join(ROOT,'tools/vfx_preview/se',name+'-'+i+'.wav'));
      const digest=require('node:crypto').createHash('sha256').update(bytes).digest('hex');assert.equal(digest,sound.sha256);
      let at=12,format=null,pcm=null;
      while(at+8<=bytes.length){const id=bytes.toString('ascii',at,at+4),n=bytes.readUInt32LE(at+4);if(id==='fmt ')format={pcm:bytes.readUInt16LE(at+8),channels:bytes.readUInt16LE(at+10),rate:bytes.readUInt32LE(at+12),bits:bytes.readUInt16LE(at+22)};if(id==='data')pcm=bytes.subarray(at+8,at+8+n);at+=8+n+(n%2);}
      assert.ok(format&&pcm);assert.equal(format.pcm,1);assert.equal(format.rate,48000);assert.equal(format.bits,16);
      const frames=pcm.length/(format.channels*2);assert.ok(frames<=1.95*48000);assert.ok(Math.abs(frames/48000-sound.duration)<1e-6);
      let max=0,peakAt=0;for(let n=0;n<pcm.length/2;n++){const x=Math.abs(pcm.readInt16LE(n*2));if(x>max){max=x;peakAt=Math.floor(n/format.channels)/48000;}}
      assert.ok(Math.abs(20*Math.log10(max/32767)+1)<.003);
      // 2026-10-15：スキュラは作り直した候補（peakは20ms平均の包絡線の最大。末尾は400msのcos²フェード）。
      if(sound.peakMode==='envelope20ms'){
        let env=0,best=-1,bestAt=0;const k=Math.round(.02*48000),abs=n=>{let m=0;for(let c=0;c<format.channels;c++)m=Math.max(m,Math.abs(pcm.readInt16LE((n*format.channels+c)*2)));return m;};
        const vals=Array.from({length:frames},(_,n)=>abs(n));let sum=0;for(let n=0;n<frames;n++){sum+=vals[n];if(n>=k)sum-=vals[n-k];const center=n-Math.floor(k/2);if(sum>best){best=sum;bestAt=center;}}
        assert.ok(Math.abs(bestAt/48000-sound.peak)<.005,name+'-'+i+' のpeak（包絡線）');
      }else assert.ok(Math.abs(peakAt-sound.peak)<1e-6);
      for(let ch=0;ch<format.channels;ch++)assert.equal(pcm.readInt16LE(pcm.length-2*(ch+1)),0,'末尾フェード');
      if(i===1)assert.deepEqual(fs.readFileSync(path.join(ROOT,'assets/sfx',entry.code+'.wav')),bytes,'候補1をそのまま仮配置');
    }
  }
  assert.equal(used.size,63);
  // 2026-10-15：スキュラの仮SE（候補1）だけ作り直した候補へ差し替えた（利用者指摘「SEが急に止まる」）。
  assert.deepEqual(execFileSync('git',['diff','--name-only',BASELINE,'--','assets/'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean).filter(f=>!/assets\/sfx\/(C0\d\d|C\d\d\d)\.wav$/.test(f)||!picks[Object.keys(picks).find(n=>f.endsWith(picks[n].code+'.wav'))]),[],'既存assetsの変更なし');
  console.log('OK SE63候補: 既存登録保持・元素材重複なし・ボイス名除外・48kHz/PCM16・最長1.95秒・-1dBFS・peak・末尾フェード・仮コピー21');
}
(async()=>{audioChecks();if(!process.env.VB_ONLY||process.env.VB_ONLY==='new')await newDataChecks();if(!process.env.VB_ONLY||process.env.VB_ONLY==='baseline')await baselineChecks();})().catch(e=>{console.error(e.stack);process.exitCode=1;});
