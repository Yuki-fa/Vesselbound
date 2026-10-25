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
  // 2026-10-17: 画像素材（webp）の貼り付けを廃止し、ダイアウルフの登場と隕石の巻物の衝撃をコードで描き直した。この2種だけ不変の対象から外す。
  const REDRAWN=new Set(['direwolf','meteor-scroll','behemoth','overlord','minotaur']);
  assert.equal(read('js/vfx/defs/geometry.js'),sourceLoader('js/vfx/defs/geometry.js'),'既存の全定義を保持: js/vfx/defs/geometry.js');
  // 2026-10-18：閃光の図形 flare を柔らかく描き直し、立体的な結晶 crystal-gem を足した。それ以外の図形は不変。
  {const shapesOf=src=>{const o=JSON.parse(src.slice(src.indexOf('VbFxDefs.register(')+18,src.lastIndexOf(');'))).shapes;delete o.flare;delete o['crystal-gem'];return o;};
    assert.deepEqual(shapesOf(read('js/vfx/defs/webp_geometry.js')),shapesOf(sourceLoader('js/vfx/defs/webp_geometry.js')),'既存の全定義を保持: js/vfx/defs/webp_geometry.js（flare・crystal-gemを除く）');}
  {const keep=src=>literalDefinition(src,'effects').effects.filter(d=>!REDRAWN.has(d.name));
    assert.deepEqual(keep(read('js/vfx/defs/effects.js')),keep(sourceLoader('js/vfx/defs/effects.js')),'既存の全定義を保持: js/vfx/defs/effects.js（描き直した2種を除く）');}
  const before=harness(false,null,{sourceLoader,excludeScripts:['js/vfx/defs/characters_1012.js','js/vfx/defs/additions_1017.js','js/vfx/defs/additions_1023.js','js/vfx/defs/additions_1025.js']}),after=harness(false);
  assert.equal(before.fx.effects.length,82);
  // 描画命令の完全一致は元の50種（effects.js）だけ。置換32種（webp.js）は2026-10-14から作り直している。
  const original=new Set(literalDefinition(read('js/vfx/defs/effects.js'),'effects').effects.map(d=>d.name));assert.equal(original.size,50);
  // 2026-10-21 利用者指定：枠線の出る演出は、元の枠の形（枠画像から実測した角R）を少し大きくした形に描き直した。
  // 枠の形の線・縁の光・枠の塗り・枠での切り抜きを持つ演出は描画命令が変わるので、完全一致の対象から外す。
  const FRAME_OUTLINE=d=>(d.layers||[]).some(l=>['card','superellipse'].includes(l.geometry)||l.clip==='card');
  const outlined=before.fx.effects.filter(d=>original.has(d.name)&&!REDRAWN.has(d.name)&&FRAME_OUTLINE(d)).length;
  for(const d of before.fx.effects.filter(d=>original.has(d.name)&&!REDRAWN.has(d.name)&&!FRAME_OUTLINE(d)))for(const speed of [1.5,3,4.5]){
    const pending=[];for(const h of [before,after])pending.push(h.fx.play(d.name,{source:h.fx.rect(h.source),targets:[h.fx.rect(h.target),h.fx.rect(h.target2)],allies:[h.fx.rect(h.source)],enemies:[h.fx.rect(h.target),h.fx.rect(h.target2)],board:h.body,speed,seed:53,dir:1,value:3}));
    const ms=before.fx.duration(d.name,speed);assert.equal(after.fx.duration(d.name,speed),ms);
    for(let i=0;i<8;i++)assert.deepEqual(after.step(ms*i/8),before.step(ms*i/8),d.name+' speed='+speed+' frame='+i+'の描画命令');
    before.fx.stopAll();after.fx.stopAll();await Promise.all(pending);
  }
  console.log(`OK 元の50種（描き直した${REDRAWN.size}種と枠線の${outlined}種を除く）: 定義3ファイル一致 / 3速さ×8時刻のCanvas命令完全一致（画素は未確認）`);
}
async function newDataChecks(){
  const {bundle,jsonBytes}=validatedBundle(),data=literalDefinition(read('js/vfx/defs/characters_1012.js'),'characters_1012');
  assert.equal(names.length,21);assert.equal(new Set(names).size,21);assert.equal(data.effects.length,20);
  const shared=data.effects.find(d=>d.name==='phantom');assert.equal(shared.variants.length,1);assert.equal(shared.variants[0].name,'eidolon');
  // 2026-10-17: additions_1017.js の新規分を除いて数える（第2段の総数は変えない）。
  // 2026-10-23: additions_1023.js（VFX の全検査で新しく作った演出）も同じく除く。
  // 2026-10-25: additions_1025.js（利用者指定の新しい演出）も同じく除く。
  const added1017=['additions_1017.js','additions_1023.js','additions_1025.js'].reduce((n,f)=>n+(t=>JSON.parse(t.slice(t.indexOf('VbFxDefs.register(')+18,t.lastIndexOf(');'))))(require('fs').readFileSync(require('path').join(__dirname,'../../js/vfx/defs/'+f),'utf8')).effects.length,0);
  // 2026-10-25 利用者の方針：一旦 1.1MB（tools/vfx_export.js と同じ。後で使っていない演出を削って 1MB へ戻す）。
  assert.ok(jsonBytes<=1.1e6);assert.equal(bundle.effects.length,102+added1017);
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
// 2026-10-22 シート改訂：効果が別の番号へ移ったので、SE のファイル名も新しい番号へ付け替えた（新 → 旧）。
// アークデーモン C082 とフィーンド C099 は効果が入れ替わったので、ファイルの中身も入れ替えた。
const RENAMED_1022={E042_1:'C024_1',E042_2:'C024_2',E083:'C025',E043:'C031',E031:'C084',E056:'C057',E024:'C109',E082:'C121',C050:'C049',C107:'C124',C124:'C107'};
function audioChecks(){
  const raw=read('tools/vfx_preview/se_catalog.js'),catalog=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
  const picks=JSON.parse(read('tools/vfx_preview/se/picks_1012.json')),used=new Set(),hashes=new Set();
  // 利用者がLABで選んだ候補の台帳（adopted_MMDD.json）。日付順に重ね、同じ番号は新しい採用を正とする（2026-10-21 から全台帳を見る）。
  // 2026-10-25：10-22 の番号の振り直しより前の台帳は旧番号、以後の台帳は新番号（新しい C109＝インキュバスの起動は、旧 C109＝今の E024 とは別物）。
  // 新番号の採用が別名のファイル（C114_blessing.wav 等。旧番号の音のファイルを残すため）なら、番号.wav の照合には使わない。
  const ledgers=fs.readdirSync(path.join(ROOT,'tools/vfx_preview/se')).filter(f=>/^adopted_\d{4}\.json$/.test(f)).sort();
  const adopted1018=Object.assign({},...ledgers.filter(f=>f.slice(8,12)<'1022').map(f=>JSON.parse(read('tools/vfx_preview/se/'+f))));
  const adoptedRenumbered=Object.assign({},...ledgers.filter(f=>f.slice(8,12)>='1022').map(f=>JSON.parse(read('tools/vfx_preview/se/'+f))));
  const old=execFileSync('git',['show',BASELINE+':prototype/tools/vfx_preview/se_catalog.js'],{cwd:ROOT,encoding:'utf8'});
  const previous=JSON.parse(old.slice(old.indexOf('{'),old.lastIndexOf('}')+1));
  // 2026-10-18：利用者の指示で選び直し・加工した候補（reason に日付を残す）は変更を許す。
  const redone=id=>/2026-10-(1[78]|2\d)/.test(String((catalog.sounds[id]||{}).reason||''))&&!/2026-10-(1[78]|2\d)/.test(String((previous.sounds[id]||{}).reason||''));
  // 2026-10-20：採用の印（adopted／provisional）は利用者が選ぶたびに変わるので、登録値の比較から外す。
  const stable=s=>{if(!s)return s;const {adopted,provisional,...rest}=s;return rest;};
  for(const [id,sound]of Object.entries(previous.sounds))if(!redone(id))assert.deepEqual(stable(catalog.sounds[id]),stable(sound),'既存SEの登録値を保持: '+id);
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
      const frames=pcm.length/(format.channels*2);assert.ok(frames<=((sound.edit&&sound.edit.maxSec)||1.95)*48000+1);assert.ok(Math.abs(frames/48000-sound.duration)<1e-6);
      let max=0,peakAt=0;for(let n=0;n<pcm.length/2;n++){const x=Math.abs(pcm.readInt16LE(n*2));if(x>max){max=x;peakAt=Math.floor(n/format.channels)/48000;}}
      assert.ok(Math.abs(20*Math.log10(max/32767)+1)<.003);
      // 2026-10-15：スキュラは作り直した候補（peakは20ms平均の包絡線の最大。末尾は400msのcos²フェード）。
      if(sound.peakMode==='envelope20ms'){
        let env=0,best=-1,bestAt=0;const k=Math.round(.02*48000),abs=n=>{let m=0;for(let c=0;c<format.channels;c++)m=Math.max(m,Math.abs(pcm.readInt16LE((n*format.channels+c)*2)));return m;};
        const vals=Array.from({length:frames},(_,n)=>abs(n));let sum=0;for(let n=0;n<frames;n++){sum+=vals[n];if(n>=k)sum-=vals[n-k];const center=n-Math.floor(k/2);if(sum>best){best=sum;bestAt=center;}}
        assert.ok(Math.abs(bestAt/48000-sound.peak)<.005,name+'-'+i+' のpeak（包絡線）');
      }else assert.ok(Math.abs(peakAt-sound.peak)<1e-6);
      for(let ch=0;ch<format.channels;ch++)assert.equal(pcm.readInt16LE(pcm.length-2*(ch+1)),0,'末尾フェード');
      // 2026-10-18：利用者がLABで選んだ候補（adopted_1018.json）があれば、それをそのまま配置。無ければ候補1の仮配置。
      // Bufferの deepEqual は不一致時の差分作成が極端に重いので、ハッシュで比べる。
      if(i===1){const oldCode=RENAMED_1022[entry.code],renewed=adoptedRenumbered[entry.code],pick=(renewed&&renewed.file==='assets/sfx/'+entry.code+'.wav'?renewed:null)||adopted1018[oldCode||entry.code],expected=pick?catalog.sounds[pick.candidate].sha256:digest;
        assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT,'assets/sfx',entry.code+'.wav'))).digest('hex'),expected,(pick?'選んだ候補（'+pick.candidate+'）をそのまま採用':'候補1をそのまま仮配置')+': '+entry.code);}
    }
  }
  assert.equal(used.size,63);
  // 2026-10-15：スキュラの仮SE（候補1）だけ作り直した候補へ差し替えた（利用者指摘「SEが急に止まる」）。
  // 2026-10-17：演出の webp（butterfly を除く）と shield.png は削除してよい（利用者指定。演出はすべてコードで描く）。削除だけを許し、変更は許さない。
  const removable=f=>/assets\/vfx\/[^/]+\.webp$|assets\/vfx\/shield\.png$/.test(f)&&!fs.existsSync(path.join(ROOT,'..',f));
  // 2026-10-17：巻物・旗の使用SE（利用者が LAB 候補 scroll-shield-3 を採用）を新しく足した。追加だけを許す。
  const addedByUser=new Set(['prototype/assets/sfx/item_scroll.wav']);
  // 2026-10-18：利用者がLABで選んだ候補で置き換えた・足した効果音（台帳 adopted_1018.json）は変更を許す。
  // 2026-10-20 以降の採用（adopted_MMDD.json。加工しただけの E071 なども含む）も同じ扱い。
  for(const f of fs.readdirSync(path.join(ROOT,'tools/vfx_preview/se')).filter(f=>/^adopted_\d{4}\.json$/.test(f)))
    for(const v of Object.values(JSON.parse(read('tools/vfx_preview/se/'+f))))if(v&&v.file)addedByUser.add('prototype/'+v.file);
  // ファイル名を付け替えた SE（新旧どちらの名前も）は変更を許す。
  for(const [now,was]of Object.entries(RENAMED_1022))for(const code of [now,was])addedByUser.add('prototype/assets/sfx/'+code+'.wav');
  // 2026-10-24：カード番号の振り直し（card_renumber_history.json）で付け替えただけのファイルは変更に数えない。
  // 前の版の名前を今の番号へ読み替えた先、または今の名前を前の版の番号へ戻した先と中身が同じなら付け替え。採用SEの許可も読み替え先で引く。
  const renumber=require('./card_renumber');
  const blob=(ref,f)=>{try{return execFileSync('git',['rev-parse',ref+':'+f],{cwd:path.join(ROOT,'..'),encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch(e){return '';}};
  const nowBlob=f=>fs.existsSync(path.join(ROOT,'..',f))?execFileSync('git',['hash-object',path.join(ROOT,'..',f)],{encoding:'utf8'}).trim():'';
  const renamedOnly=f=>{const was=renumber.unrelabelPath(f),now=renumber.relabelPath(f);
    return addedByUser.has(now)||addedByUser.has(was)||(was!==f&&!!nowBlob(f)&&blob(BASELINE,was)===nowBlob(f))||(now!==f&&!!blob(BASELINE,f)&&blob(BASELINE,f)===nowBlob(now));};
  assert.deepEqual(execFileSync('git',['diff','--name-only',BASELINE,'--','assets/'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n').filter(Boolean).filter(f=>!removable(f)&&!addedByUser.has(f)&&!renamedOnly(f)).filter(f=>!/assets\/sfx\/(C0\d\d|C\d\d\d)\.wav$/.test(f)||!picks[Object.keys(picks).find(n=>f.endsWith(picks[n].code+'.wav'))]),[],'既存assetsの変更なし');
  console.log('OK SE63候補: 既存登録保持・元素材重複なし・ボイス名除外・48kHz/PCM16・最長1.95秒・-1dBFS・peak・末尾フェード・仮コピー21');
}
(async()=>{audioChecks();if(!process.env.VB_ONLY||process.env.VB_ONLY==='new')await newDataChecks();if(!process.env.VB_ONLY||process.env.VB_ONLY==='baseline')await baselineChecks();})().catch(e=>{console.error(e.stack);process.exitCode=1;});
