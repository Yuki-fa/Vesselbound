'use strict';
// 実LABのDOM/APIと保存サーバーを検査する。画素・聴感の確認とは別。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {sandbox}=require('./cards_dom.cjs');
const root=path.resolve(__dirname,'../..');
function boot(options={}){
  const env=sandbox(pathToFileURL(path.join(root,'tools/vfx_preview.html')).href),ctx=env.context;
  ctx.Blob=Blob;ctx.fetch=options.fetch || (async()=>({status:404,ok:false}));
  if(options.storage)ctx.localStorage=options.storage;
  ctx.location.protocol=options.protocol || 'http:';
  const html=fs.readFileSync(path.join(root,'tools/vfx_preview.html'),'utf8');
  env.parse(html.match(/<body>([^]*?)<\/body>/)[1].replace(/<script[^]*?<\/script>/g,''));
  vm.createContext(ctx);
  for(const [,src]of html.matchAll(/<script src="([^"]+)"/g)){
    if(/capture_frames|frame_capture/.test(src))continue;
    const f=path.resolve(root,'tools',src.split('?')[0]);vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
  }
  return env;
}
const plain=x=>JSON.parse(JSON.stringify(x));
function assertSavedJson(actual,expected,message){
  // 期待値はLABのVM由来。JSONには含まれないrealmの差だけを取り除き、全フィールドを厳密比較する。
  assert.deepEqual(actual,plain(expected),message);
}
function savedJsonComparison(snapshot){
  assertSavedJson(plain(snapshot),snapshot,'VM由来の期待値と保存JSONは同じ内容');
  const changes=[
    value=>{value.version='1';},
    value=>{value.effects['dark-fire'].title+='変更';},
    value=>{value.effects['dark-fire'].tags.push('差分検出');},
    value=>{value.effects['dark-fire'].assign[0].id='C058';},
    value=>{value.suppressGeneric.C008=[];},
    value=>{delete value.effects['dark-fire'];}
  ];
  for(const change of changes){
    const changed=plain(snapshot);change(changed);
    assert.throws(()=>assertSavedJson(changed,snapshot),{code:'ERR_ASSERTION'},'保存内容の差は検出する');
  }
}
async function layout(){
  const env=boot(),ctx=env.context,$=id=>env.document.getElementById(id),M=ctx.VbFxLabModel,S=ctx.VbFxLabStore;
  await env.flush();
  const cards=ctx.VbFxCards.cards(),definitions=ctx.VbFx.effects;
  const keywordKeys=vm.runInContext('KEYWORD_ASSET_KEYS',ctx);
  assert.equal(definitions.length,103,'現在の全103項目（共有派生含む）');
  const buttons=env.document.querySelectorAll('#effect-list button');
  assert.equal(buttons.length,definitions.length);
  assert.equal(new Set(buttons.map(b=>b.dataset.name)).size,definitions.length,'一覧は全効果を1回ずつ');
  for(const d of definitions){const m=ctx.VbFxLabMeta[d.name];assert.ok(m&&m.title&&m.tags.length,d.name+' 見出し・タグあり');assert.notEqual(m.title,d.label,d.name+' 見た目の見出し');}
  const draft=M.empty();draft.effects.satyr={title:'修正した青い陣',tags:['変更タグ'],assign:[]};
  assert.equal(M.meta('satyr',draft,ctx.VbFxLabMeta).title,'修正した青い陣','保存済みの見出し優先');
  assert.equal(M.meta('new-effect',draft,ctx.VbFxLabMeta).title,'見出し未設定');
  const ordered=M.effects(definitions.concat([{name:'new-effect'}]),draft,ctx.VbFxLabMeta);
  assert.equal(ordered[0].name,'new-effect','未登録の新規定義は先頭');
  const newest=ordered.filter(e=>e.meta.addedAt==='2026-10-12').map(e=>e.name);
  assert.deepEqual(Array.from(newest),Array.from(definitions.filter(d=>ctx.VbFxLabMeta[d.name].addedAt==='2026-10-12'),d=>d.name),'同日内の順を保持');
  const tabs=env.document.querySelectorAll('.lab-tabs button');assert.equal(tabs.length,8);
  assert.deepEqual(tabs.map(b=>b.textContent),['演出の一覧','キャラクター','エンチャント','アイテム','指輪','敵／NPC','魔導板強化','その他']);
  const visited=new Set();let vfxCount=0,seCount=0;
  for(const p of M.pages.filter(p=>p.id!=='effects')){
    ctx.VbFxCards.show(p.id);
    const rows=env.document.querySelectorAll('#card-catalog-rows tr');
    const expected=cards.filter(c=>p.sources.includes(c.kind));assert.equal(rows.length,expected.length,p.title+' 全件');
    for(const card of expected){
      assert.ok(!visited.has(card.no),'分類の重複なし '+card.no);visited.add(card.no);
      const row=rows.find(r=>r.dataset.no===card.no);assert.ok(row,card.no+' の行');
      if(p.id==='character')assert.match(card.no,/^C\d{3}$/,'キャラクターはC番号のみ');
      for(const media of M.rawVfx(card,ctx.VbFxCardRoutes)){assert.ok(row.textContent.includes(media.path||media.fn),card.no+' VFXの経路欠落');vfxCount++;}
      for(const media of M.rawSe(card,ctx.VbFxCardRoutes)){assert.ok(row.textContent.includes(media.path),card.no+' SEの経路欠落');seCount++;}
    }
  }
  assert.equal(visited.size,Object.keys(ctx.VbFxCardRoutes.records).length,'台帳の全レコードを分類');
  ctx.VbFxCards.show('effects');
  $('search').value='サテュロス';$('search').dispatchEvent(new env.Event('input'));
  assert.ok(!env.document.querySelector('#effect-list button[data-name="satyr"]').hidden,'現行割り振り先のカード名で検索');
  $('search').value='';$('search').dispatchEvent(new env.Event('input'));
  await env.drive(ctx.VbFxPreview.select('dark-fire'));
  S.setMeta('dark-fire','テスト用の黒い炎',['確認タグ','黒']);
  assert.equal($('effect-title').textContent,'テスト用の黒い炎');
  const titleInput=$('lab-title-input'),firstButton=env.document.querySelector('#effect-list button');titleInput.value='入力から直した黒い炎';titleInput.dispatchEvent(new env.Event('change'));
  assert.equal($('lab-title-input'),titleInput,'見出し編集で入力欄を取り替えない');assert.equal(env.document.querySelector('#effect-list button'),firstButton,'見出し編集で左のボタンを取り替えない');
  const a={kind:'character',id:'C058',name:'アラッサス',trigger:'攻撃',se:null};
  S.setAssignments('dark-fire',Array.from({length:10},()=>a));
  assert.equal(env.document.querySelectorAll('.lab-assignment-row').length,10);
  assert.throws(()=>S.setAssignments('dark-fire',Array.from({length:11},()=>a)),/10件/);
  S.setAssignments('dark-fire',[{kind:'enemy',id:'EN001',name:'ゴブリン',trigger:'攻撃',se:null}]);
  ctx.VbFxCards.generics('EN001').forEach(g=>S.suppress('EN001',g.id,true));
  ctx.VbFxCards.show('enemy');ctx.VbFxCards.choose('EN001');
  const play=ctx.VbFx.play,calls=[];ctx.VbFx.play=(name,opts)=>{calls.push({name,opts});return play(name,opts);};
  await env.drive(ctx.VbFxCards.play('EN001'));
  const enemy=calls.find(c=>c.name==='dark-fire').opts.source;
  assert.equal(enemy.element.dataset.side,'enemy');assert.equal(enemy.element.dataset.lane,'rear');
  assert.equal(enemy.element.offsetLeft,ctx.VbFxLabGeometry.position('enemy','rear',3,1).left,'敵後衛中央');
  S.setAssignments('board-enchant',[{kind:'board',id:'M001',name:'召喚の力',trigger:'魔導板変更',se:null}]);
  ctx.VbFxCards.show('board');ctx.VbFxCards.choose('M001');await env.drive(ctx.VbFxCards.play('M001'));
  assert.equal(env.document.querySelectorAll('.lab-board-cell').length,15,'魔導板5×3');
  assert.equal(ctx.VbFxPreview.snapshot().sourceId,'lab-board-7');assert.ok($('board-design').classList.contains('lab-board-scene'));
  assert.ok(env.document.querySelector('.lab-board-frame'),'既存の魔導板枠');ctx.VbFxCards.stop();
  const golem=cards.find(c=>c.no==='C008');assert.ok(ctx.VbFxCards.generics('C008').some(g=>g.id==='S006'),'実経路の負傷強化');
  S.suppress('C008','S006',true);assert.ok(M.suppressed(golem,golem.vfx.find(m=>m.sourceCode==='S006'),S.get(),keywordKeys),'S006の個別抑止');
  const poison=cards.find(c=>/毒牙/.test(c.keywords));assert.ok(poison);assert.ok(ctx.VbFxCards.generics(poison.no).some(g=>g.id==='毒牙'),'シートのキーワードから汎用VFX');
  S.suppress(poison.no,'毒牙',true);
  ctx.VbFxCards.generics(poison.no).find(g=>g.id==='毒牙').media.forEach(m=>assert.ok(M.suppressed(poison,m,S.get(),keywordKeys),'毒牙の個別抑止'));
  S.setAssignments('dark-fire',[{kind:'character',id:'C008',name:'ゴーレム',trigger:'負傷',se:null}]);
  calls.length=0;ctx.VbFxCards.show('character');ctx.VbFxCards.choose('C008');await env.drive(ctx.VbFxCards.play('C008'));
  assert.ok(calls.some(c=>c.name==='dark-fire'),'編集中の割り振りを再生');assert.ok(!calls.some(c=>c.name==='injury-buff'),'チェックしたS006は実際のプレビューから除外');ctx.VbFxCards.stop();
  const snapshot=M.materialize(S.get(),definitions,ctx.VbFxLabMeta,'2026-10-15T01:02:03.000Z');
  assert.deepEqual(plain(M.validate(JSON.parse(JSON.stringify(snapshot)))),plain(snapshot),'保存JSON往復');
  savedJsonComparison(snapshot);
  assert.equal(Object.keys(snapshot.effects).length,definitions.length,'保存は全演出');
  assert.throws(()=>M.validate({...snapshot,version:2}),/version/);
  assert.throws(()=>M.validate({...snapshot,suppressGeneric:{'../other':['hit']}}),/番号/);
  let stored=null;
  ctx.fetch=async(url,opts)=>opts&&opts.method==='POST'?(stored=JSON.parse(opts.body),{ok:true,json:async()=>({ok:true})}):{status:200,ok:true,json:async()=>stored};
  const saved=await env.drive(S.save());assert.equal(saved.server,true);assert.equal(S.info().dirty,false);
  await env.drive(S.load());assert.deepEqual(plain(S.get()),stored,'POST確定後の読込で同じ');
  S.setMeta('dark-fire','復元される下書き',['下書き']);
  const restored=boot({storage:ctx.localStorage,fetch:async()=>({status:200,ok:true,json:async()=>stored})});await restored.flush();
  assert.equal(restored.context.VbFxLabStore.meta('dark-fire').title,'復元される下書き');assert.equal(restored.context.VbFxLabStore.info().dirty,true,'下書きは確定扱いにしない');
  const fallback=boot({protocol:'file:'});await fallback.flush();
  let downloads=0;fallback.context.URL=class extends URL{static createObjectURL(){downloads++;return 'blob:test';}static revokeObjectURL(){}};
  const exported=await fallback.drive(fallback.context.VbFxLabStore.save());assert.equal(exported.server,false);assert.equal(downloads,1);assert.match(fallback.context.VbFxLabStore.info().status,/サーバー保存できなかったのでダウンロードしました/);
  fallback.context.location.protocol='http:';fallback.context.fetch=async()=>({ok:false,status:501});
  const ordinary=await fallback.drive(fallback.context.VbFxLabStore.save());assert.equal(ordinary.server,false);assert.equal(downloads,2,'普通のhttp.serverでもダウンロードへ退避');
  console.log(`LABレイアウト: ${definitions.length}演出 / ${visited.size}行 / VFX ${vfxCount}経路 / SE ${seCount}経路、8分類・検索・編集10件・場面・抑止・保存往復・下書き・fileダウンロード OK`);
  return snapshot;
}
async function server(payload){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-lab-layout-'));
  const dest=path.join(temp,'tools/vfx_preview');fs.mkdirSync(dest,{recursive:true});
  fs.copyFileSync(path.join(__dirname,'lab_server.py'),path.join(dest,'lab_server.py'));
  fs.writeFileSync(path.join(temp,'tools/vfx_preview.html'),'LAB TEST');
  const child=spawn('python3',[path.join(dest,'lab_server.py'),'0'],{stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',d=>errors+=d.toString());
  try{
    let base;
    try{base=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('lab_server起動待機：'+errors)),8000);
      let output='';child.stdout.on('data',d=>{output+=d;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
      child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('lab_server終了 '+code+'：'+errors));});
    });}catch(error){
      if(!/PermissionError: \[Errno 1\] Operation not permitted/.test(errors))throw error;
      // 管理環境でTCP bind自体が禁止される場合も、実HandlerのHTTP解析とPOST書き込みは実行する。
      // ネットワーク待受の検査を通過扱いにはしない。制限のない環境では上の実サーバーで検査する。
      directServer(payload,temp);console.log('未実行: lab_serverのTCP待受（環境が127.0.0.1へのbindを拒否）。実HTTP HandlerのPOST/GET・バックアップは子Pythonで確認。');return;
    }
    const target=path.join(dest,'lab_assignments.json'),previous=path.join(dest,'lab_assignments.prev.json');
    assert.equal(await (await fetch(base+'/tools/vfx_preview.html')).text(),'LAB TEST','通常GETはprototype配信');
    const post=(data,route='/__vfx_lab/save',origin=base)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)});
    assert.equal((await post(payload)).status,200);assertSavedJson(JSON.parse(fs.readFileSync(target)),payload,'POST内容を指定ファイルへ保存');assert.equal(fs.existsSync(previous),false);
    const before=fs.readFileSync(target,'utf8'),second={...payload,savedAt:'2026-10-15T02:03:04.000Z'};
    assert.equal((await post(second)).status,200);assert.equal(fs.readFileSync(previous,'utf8'),before,'前回分をそのままバックアップ');
    const loaded=await fetch(base+'/tools/vfx_preview/lab_assignments.json');assert.equal(loaded.headers.get('cache-control'),'no-store');assertSavedJson(await loaded.json(),second,'GETで保存内容を復元');
    assert.equal((await post({...payload,version:2})).status,400,'不正な保存JSONを拒否');
    assert.equal((await post(payload,'/other')).status,404,'保存先は固定');
    assert.equal((await post(payload,'/__vfx_lab/save','https://example.com')).status,403,'別オリジンを拒否');
    assertSavedJson(JSON.parse(fs.readFileSync(target)),second,'拒否時は保存ファイルを維持');
    console.log('lab_server.py: 127.0.0.1配信・POST指定先・前回バックアップ・GET往復・不正入力拒否 OK');
  }finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));fs.rmSync(temp,{recursive:true,force:true});}
}
function directServer(payload,temp){
  const source=`
import importlib.util, io, json, sys, threading, types
from pathlib import Path
spec=importlib.util.spec_from_file_location('lab_server',sys.argv[1])
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
root=Path(sys.argv[2]);payload=json.load(sys.stdin)
class Connection:
    def __init__(self,raw): self.raw=io.BytesIO(raw);self.output=bytearray()
    def makefile(self,*args,**kwargs): return self.raw
    def sendall(self,data): self.output.extend(data)
server=types.SimpleNamespace(server_port=5500,lab_root=root,save_lock=threading.Lock())
def request(method,route,data=None,origin='http://127.0.0.1:5500'):
    body=json.dumps(data,ensure_ascii=False).encode('utf-8') if data is not None else b''
    head=(f'{method} {route} HTTP/1.0\\r\\nHost: 127.0.0.1:5500\\r\\nOrigin: {origin}\\r\\nContent-Type: application/json\\r\\nContent-Length: {len(body)}\\r\\n\\r\\n').encode('ascii')
    connection=Connection(head+body)
    module.Handler(connection,('127.0.0.1',12345),server,directory=str(root))
    header,result=bytes(connection.output).split(b'\\r\\n\\r\\n',1)
    return int(header.split(b' ')[1]),header,result
target=root/'tools/vfx_preview/lab_assignments.json';previous=target.with_name('lab_assignments.prev.json')
assert request('GET','/tools/vfx_preview.html')[2]==b'LAB TEST'
assert request('POST','/__vfx_lab/save',payload)[0]==200
assert json.loads(target.read_text())==payload
before=target.read_bytes();second=dict(payload,savedAt='2026-10-15T02:03:04.000Z')
assert request('POST','/__vfx_lab/save',second)[0]==200
assert previous.read_bytes()==before
status,header,body=request('GET','/tools/vfx_preview/lab_assignments.json')
assert status==200 and b'Cache-Control: no-store' in header and json.loads(body)==second
assert request('POST','/__vfx_lab/save',dict(payload,version=2))[0]==400
assert request('POST','/other',payload)[0]==404
assert request('POST','/__vfx_lab/save',payload,origin='https://example.com')[0]==403
assert json.loads(target.read_text())==second
print('HTTP Handler: POST指定先・前回分・GET往復・不正JSON・別パス・別Origin OK')
`;
  const result=spawnSync('python3',['-c',source,path.join(temp,'tools/vfx_preview/lab_server.py'),temp],{input:JSON.stringify(payload),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);console.log(result.stdout.trim());
}
(async()=>{const payload=await layout();await server(payload);})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
