'use strict';
// 依存追加なし。JavaScriptをASTで読み、表示先の値・表示用設定・HTML/CSSの文言を拾う。
// コメント／正規表現／console／判定だけの文字列は抽出しない。アプリやシートは実行・変更しない。
// node tools/balance_sim/hardcoded_text_audit_1027.js [--out path.md] [--json /tmp/audit.json]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const sheet=require('./sheet_data');
const ROOT=path.resolve(__dirname,'../..');
const BUTTON_IDS=new Set([...fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<button\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]));
function parser(){
  try{return require('acorn');}catch(_){
    // Nodeに同梱されたAcornを独立したVMで読む。外部パッケージ／ネットワークは不要。
    const source=process.binding('natives')['internal/deps/acorn/acorn/dist/acorn'];
    if(!source)throw new Error('Acornを同梱したNode（検証: v24）が必要です。');
    const module={exports:{}};vm.runInNewContext(source,{module,exports:module.exports});return module.exports;
  }
}
const acorn=parser(),JP=/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const norm=s=>String(s??'').replace(/[\s　]+/g,'').trim();
const messages=(()=>{
  const rows=sheet.parseCsv(sheet.loadLocalXlsxData().textMessage),head=rows.find(r=>r.includes('場面')&&r.includes('テキスト'));
  // 区分名の行（テキストが空）は loader.js と同じく落とす。残すと同名のキー（オンライン対戦など）を空で上書きする。
  return rows.map(r=>({key:r[head.indexOf('場面')]||'',text:r[head.indexOf('テキスト')]||''})).filter(r=>r.key&&String(r.text).trim());
})();
const byKey=new Map(messages.map(r=>[norm(r.key),r]));
function bindingExists(key){
  if(key.startsWith('キーワード表:')){
    const name=key.slice('キーワード表:'.length);
    return sheet.sheetRows('keyword').some(r=>String(r['名前']||'').replace(/X$/,'')===name&&String(r['効果']||'').trim());
  }
  return !!byKey.get(norm(key))?.text.trim();
}
const DISPLAY_PROPS=new Set('text texts textContent innerText innerHTML outerHTML name names title alt ariaLabel placeholder label labels caption description desc message messages subtitle heading note tooltip help hint fallback emptyText emptyMessage okLabel cancelLabel receivedTitle summary'.split(' '));
const SHEET_CALLS=new Set(['textMessage','_uiLabel','_onlineText','_collectionText']);
const PREDICATES=/^(?:test|includes|startsWith|endsWith|has|findIndex|indexOf|some|every|match|exec|search)$/;
function children(node){return Object.entries(node).flatMap(([key,value])=>key==='loc'?[]:Array.isArray(value)?value.filter(v=>v&&typeof v.type==='string'):value&&typeof value.type==='string'?[value]:[]);}
function propertyName(node){return node&&!node.computed&&(node.property?.name||node.key?.name)||node?.property?.value||node?.key?.value||'';}
function callName(node){const c=node?.callee||node;return c?.type==='Identifier'?c.name:c?.type==='MemberExpression'?String(propertyName(c)):'';}
function humanText(value){
  let s=String(value??'');const attrs=[];
  // style.textContent等のCSSや、HTMLに埋め込まれた開発コメントは画面の文ではない。
  s=s.replace(/<!--[\s\S]*?-->/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\/\*[\s\S]*?\*\//g,'');
  if(/(?:^|\n)\s*(?:[.#@]|:root|html\s|body\s)[^{}]*\{/.test(s)&&/!important|@keyframes/.test(s)){
    s=s.replace(/\/\*[\s\S]*?\*\//g,'');
    s=[...s.matchAll(/content\s*:\s*[^;{}]*?["']([^"']*[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}][^"']*)["'][^;{}]*[;}]/gu)].map(m=>m[1]).join('\n');
  }
  s.replace(/\b(aria-label|title|alt|placeholder|data-preview|data-keyword-preview)\s*=\s*(["'])([\s\S]*?)\2/gi,(_,name,_q,text)=>{if(JP.test(text))attrs.push(name+': '+text);return _;});
  s=s.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
  return [...new Set([s,...attrs].filter(x=>JP.test(x)))].join('\n');
}
function scanJs(source,file,offset=0){
  const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module',locations:true,allowReturnOutsideFunction:true});
  const meta=new WeakMap(),nodes=[],scopes=[],rows=new Map(),functions=new Map();
  function scope(parent,name){const s={parent,name,defs:new Map()};scopes.push(s);return s;}
  const top=scope(null,'');
  function define(s,name,value){if(!name||!value)return;const list=s.defs.get(name)||[];list.push(value);s.defs.set(name,list);}
  function visit(n,parent,s,fn){
    if(!n)return;meta.set(n,{parent,scope:s,fn});nodes.push(n);
    if(/Function(?:Declaration|Expression)$/.test(n.type)||n.type==='ArrowFunctionExpression'){
      const name=n.id?.name||(parent?.type==='VariableDeclarator'&&parent.id.name)||(parent?.type==='Property'&&propertyName(parent))||fn?.name||'(無名関数)';
      if(n.type==='FunctionDeclaration')define(s,name,n);
      if(!functions.has(name))functions.set(name,[]);functions.get(name).push(n);
      const next=scope(s,name);n.params.forEach(p=>{if(p.type==='Identifier')define(next,p.name,{type:'AuditParameter',name:p.name,functionNode:n});});
      const f={name,node:n};for(const c of children(n))if(c!==n.id&&!n.params.includes(c))visit(c,n,next,f);return;
    }
    if(n.type==='VariableDeclarator'&&n.id.type==='Identifier')define(s,n.id.name,n.init);
    if(n.type==='AssignmentExpression'&&n.left.type==='Identifier')define(s,n.left.name,n.right);
    for(const c of children(n))visit(c,n,s,fn);
  }
  visit(ast,null,top,null);
  const returnsByFunction=new Map();
  for(const n of nodes)if(n.type==='ReturnStatement'){
    const fn=meta.get(n)?.fn?.node;if(fn){if(!returnsByFunction.has(fn))returnsByFunction.set(fn,[]);returnsByFunction.get(fn).push(n);}
  }
  const sheetCalls=new Set(SHEET_CALLS);
  for(let pass=0;pass<3;pass++)for(const [name,fns] of functions)for(const fn of fns){
    const body=source.slice(fn.start,fn.end);
    if(fn.params.length===2&&body.length<550&&[...sheetCalls].some(k=>body.includes(k+'(')))sheetCalls.add(name);
  }
  function ancestors(n){const out=[];for(let p=meta.get(n)?.parent;p;p=meta.get(p)?.parent)out.push(p);return out;}
  function definitions(n,name){for(let s=meta.get(n)?.scope||top;s;s=s.parent)if(s.defs.has(name))return s.defs.get(name);return [];}
  function staticValue(n,ctx=new Map(),seen=new Set()){
    if(!n||seen.has(n))return null;seen=new Set(seen).add(n);
    if(n.type==='Literal'&&!n.regex)return n.value;
    if(n.type==='AuditParameter')return staticValue(ctx.get(n.name),ctx,seen);
    if(n.type==='Identifier'){if(ctx.has(n.name))return staticValue(ctx.get(n.name),ctx,seen);const ds=definitions(n,n.name);return ds.length===1?staticValue(ds[0],ctx,seen):null;}
    if(n.type==='BinaryExpression'&&n.operator==='+'){const a=staticValue(n.left,ctx,seen),b=staticValue(n.right,ctx,seen);return a!=null&&b!=null?String(a)+b:null;}
    if(n.type==='TemplateLiteral'){let s='';for(let i=0;i<n.quasis.length;i++){s+=n.quasis[i].value.cooked||'';if(n.expressions[i]){const v=staticValue(n.expressions[i],ctx,seen);if(v==null)return null;s+=v;}}return s;}
    if(n.type==='MemberExpression'){const vals=memberValues(n,ctx,seen);return vals.length===1?staticValue(vals[0],ctx,seen):null;}
    return null;
  }
  function objectValues(n,ctx,seen=new Set()){
    if(!n||seen.has(n))return [];seen=new Set(seen).add(n);
    if(n.type==='ObjectExpression'||n.type==='ArrayExpression'||/Function/.test(n.type))return [n];
    if(n.type==='Identifier')return (ctx.has(n.name)?[ctx.get(n.name)]:definitions(n,n.name)).flatMap(d=>objectValues(d,ctx,seen));
    if(n.type==='MemberExpression')return memberValues(n,ctx,seen).flatMap(d=>objectValues(d,ctx,seen));
    return [];
  }
  function staticOptions(n,ctx){
    const value=staticValue(n,ctx);if(value!=null)return [String(value)];
    if(n?.type==='ConditionalExpression')return [...staticOptions(n.consequent,ctx),...staticOptions(n.alternate,ctx)];
    if(n?.type==='LogicalExpression'&&n.operator==='||')return [...staticOptions(n.left,ctx),...staticOptions(n.right,ctx)];
    return [];
  }
  function memberValues(n,ctx,seen=new Set()){
    const key=n.computed?staticValue(n.property,ctx,seen):propertyName(n);
    return objectValues(n.object,ctx,seen).flatMap(obj=>obj.type==='ObjectExpression'
      ?obj.properties.filter(p=>p.type==='Property'&&(key==null||String(propertyName(p))===String(key))).map(p=>p.value)
      :obj.type==='ArrayExpression'?(Number.isInteger(Number(key))&&key!=null?[obj.elements[Number(key)]]:obj.elements).filter(Boolean):[]);
  }
  function record(n,reason,binding=null){
    const raw=n.type==='TemplateLiteral'?n.quasis.map((q,i)=>(q.value.cooked||'')+(n.expressions[i]?'${'+source.slice(n.expressions[i].start,n.expressions[i].end).replace(/\s+/g,' ').slice(0,100)+'}':'')).join(''):n.value;
    const text=humanText(raw);if(!text||!JP.test(text)||n.regex)return;
    // テンプレートの差し込み式（_uiLabel('キー','予備') など）は別に辿るので、地の文に日本語が無ければ数えない。
    if(n.type==='TemplateLiteral'&&!JP.test(humanText(n.quasis.map(q=>q.value.cooked||'').join(''))))return;
    const parents=ancestors(n),decl=parents.find(p=>p.type==='VariableDeclarator'),root=decl?.id?.name||'';
    const row=rows.get(n)||{file,line:n.loc.start.line+offset,column:n.loc.start.column+1,text,where:new Set(),bindings:new Set(),raw:String(raw),root,
      dataFallback:file==='js/engine/pool.js'&&['PANEL_POOL','ITEM_POOL'].includes(root)};
    row.where.add(reason||meta.get(n)?.fn?.name||'画面への値');if(binding)row.bindings.add(binding);rows.set(n,row);
  }
  function trace(n,reason,ctx=new Map(),seen=new Set(),binding=null){
    if(!n||seen.has(n)||seen.size>180)return;seen=new Set(seen).add(n);
    switch(n.type){
      case 'Literal':if(typeof n.value==='string')record(n,reason,binding);return;
      case 'TemplateLiteral':record(n,reason,binding);n.expressions.forEach(e=>trace(e,reason,ctx,seen,binding));return;
      case 'Identifier':(ctx.has(n.name)?[ctx.get(n.name)]:definitions(n,n.name)).forEach(d=>trace(d,reason,ctx,seen,binding));return;
      case 'AuditParameter':trace(ctx.get(n.name),reason,ctx,seen,binding);return;
      case 'ChainExpression':trace(n.expression,reason,ctx,seen,binding);return;
      case 'MemberExpression':memberValues(n,ctx).forEach(v=>trace(v,reason,ctx,seen,binding));return;
      case 'ConditionalExpression':trace(n.consequent,reason,ctx,seen,binding);trace(n.alternate,reason,ctx,seen,binding);return;
      case 'LogicalExpression':if(n.operator!=='&&')trace(n.left,reason,ctx,seen,binding);trace(n.right,reason,ctx,seen,binding);return;
      case 'BinaryExpression':if(n.operator==='+'){trace(n.left,reason,ctx,seen,binding);trace(n.right,reason,ctx,seen,binding);}return;
      case 'ArrayExpression':{
        // [シートのキー, 予備文] の組（blessing_flame.js などの表示設定）。キーは表示しない。
        const pairKey=n.elements.length===2&&n.elements[0]?.type==='Literal'&&typeof n.elements[0].value==='string'?n.elements[0].value:null;
        if(pairKey&&bindingExists(pairKey)){trace(n.elements[1],reason,ctx,seen,pairKey);return;}
        n.elements.forEach(e=>trace(e,reason,ctx,seen,binding));return;
      }
      case 'ObjectExpression':n.properties.filter(p=>p.type==='Property'&&(DISPLAY_PROPS.has(propertyName(p))||/\/ (?:text|texts|names|labels|messages)\b/.test(reason))).forEach(p=>trace(p.value,reason,ctx,seen,binding));return;
      case 'AssignmentExpression':trace(n.right,reason,ctx,seen,binding);return;
      case 'SequenceExpression':trace(n.expressions.at(-1),reason,ctx,seen,binding);return;
      case 'FunctionExpression':case 'FunctionDeclaration':case 'ArrowFunctionExpression':{
        if(n.type==='ArrowFunctionExpression'&&n.body.type!=='BlockStatement')trace(n.body,reason,ctx,seen,binding);
        else (returnsByFunction.get(n)||[]).forEach(r=>trace(r.argument,reason,ctx,seen,binding));return;
      }
      case 'NewExpression':if(callName(n)==='Error')n.arguments.forEach(a=>trace(a,reason,ctx,seen,binding));return;
      case 'CallExpression':{
        const name=callName(n),callee=n.callee;
        if(callee.type==='MemberExpression'&&callee.object.name==='console'||PREDICATES.test(name)||['cardByName','boardSlot','done'].includes(name))return;
        if(sheetCalls.has(name)){
          const keys=staticOptions(n.arguments[0],ctx);
          for(const tag of keys.length?[...new Set(keys)]:['動的キー'])trace(n.arguments[1],reason,ctx,seen,tag);return;
        }
        if(callee.type==='MemberExpression'){
          if(['entries','values'].includes(name)&&callee.object.name==='Object'){
            for(const a of n.arguments)for(const obj of objectValues(a,ctx)){
              const vals=obj.type==='ObjectExpression'?obj.properties.map(p=>p.value):obj.elements||[];vals.forEach(v=>trace(v,reason,ctx,seen,binding));
            }return;
          }
          trace(callee.object,reason,ctx,seen,binding);
          n.arguments.slice(name==='replace'||name==='replaceAll'?1:0).forEach(a=>trace(a,reason,ctx,seen,binding));return;
        }
        const defs=definitions(n,name).filter(d=>/Function/.test(d.type)),targets=defs.length?defs:functions.get(name)||[];
        if(targets.length){for(const fn of targets){const next=new Map(ctx);fn.params.forEach((p,i)=>{if(p.name&&n.arguments[i])next.set(p.name,n.arguments[i]);});trace(fn,reason,next,seen,binding);}return;}
        // エスケープ・型変換など別ファイルの表示ヘルパーの入力も失わない。
        if(!/^(?:core|_?unitHas|_?has|_?is|_?can|_?getSheet|villageTalkMessage|_q(?:Text|Talk))/.test(name))n.arguments.forEach(a=>trace(a,reason,ctx,seen,binding));
      }
    }
  }
  function debugOnly(n){
    const text=source.slice(n.start,n.end);
    const fn=meta.get(n)?.fn?.name||'';
    if(n.type==='AssignmentExpression'&&n.left.object?.type==='Identifier'){
      const defs=definitions(n,n.left.object.name);
      if(defs.some(d=>{const s=source.slice(d.start,d.end);return /createElement\(['"]button['"]\)/.test(s)||[...BUTTON_IDS].some(id=>s.includes(id));}))return false;
    }
    return /debug/i.test(fn)&&!/button|\bbtn\b|<option|aria-label|title=/.test(text)&&!/palette.*(?:filter|toggle)|label|Button/i.test(fn);
  }
  for(const n of nodes){
    if(n.type==='CallExpression'&&n.callee.type==='MemberExpression'&&n.callee.object.name==='console')continue;
    if(ancestors(n).some(a=>a.type==='CallExpression'&&a.callee.type==='MemberExpression'&&a.callee.object.name==='console'))continue;
    const fn=meta.get(n)?.fn?.name||'';
    if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&DISPLAY_PROPS.has(propertyName(n.left))&&!debugOnly(n))
      trace(n.right,`${fn||'初期化'} → ${source.slice(n.left.start,n.left.end)}`);
    if(n.type==='Property'&&(DISPLAY_PROPS.has(propertyName(n))||/(?:Text|Label|Title|Message|Hint|Description|Tooltip|Intro|Fallback)$/.test(propertyName(n))
      ||/Steps$/.test(propertyName(n))&&n.value.type==='ArrayExpression')&&!debugOnly(n)){
      const obj=meta.get(n)?.parent,props=obj?.properties||[];
      const own=propertyName(n),keyName=own==='title'?'titleKey':/Fallback$/.test(own)?own.replace(/Fallback$/,'Key'):'key';
      const keyProp=props.find(p=>propertyName(p)===keyName);
      const key=keyProp&&staticValue(keyProp.value);
      trace(n.value,`${fn||'表示設定'}${ancestors(n).find(p=>p.type==='VariableDeclarator')?.id?.name?' '+ancestors(n).find(p=>p.type==='VariableDeclarator').id.name:''} / ${propertyName(n)}`,new Map(),new Set(),key&&(['fallback','title'].includes(own)||/Fallback$/.test(own))?String(key):null);
    }
    // [DOMのid, メッセージキー, 予備文] および [キー, 予備文] の表示設定表。
    if(n.type==='ArrayExpression'&&[2,3].includes(n.elements.length)
      &&!ancestors(n).some(p=>p.type==='Property'&&/(?:Keys|Alts)$/.test(propertyName(p))||p.type==='VariableDeclarator'&&/KEYS$/.test(p.id.name||''))){
      const at=n.elements.length-2,key=staticValue(n.elements[at]),value=n.elements.at(-1);
      if(typeof key==='string'&&(byKey.has(norm(key))||/[「」]|見出し|説明文/.test(key))&&value?.type==='Literal'&&typeof value.value==='string'&&JP.test(value.value))
        trace(value,fn+' / キー付き表示設定',new Map(),new Set(),key);
    }
    if(n.type==='ReturnStatement'&&/(?:Label|Html|Preview|Tooltip|Desc|Description|DisplayName|Text|Message|Steps)$/.test(fn)&&!/^core/.test(fn)&&!debugOnly(n)){
      if(fn==='_libraryBoardTutorialSteps'&&n.argument.type==='ArrayExpression'){
        for(const step of n.argument.elements||[])if(step?.type==='ArrayExpression')trace(step.elements[2],fn+' / チュートリアル本文',new Map(),new Set(),'「魔導板の使い方」'+staticValue(step.elements[0]));
      }else trace(n.argument,fn+' の表示値');
    }
    if(n.type==='TemplateLiteral'&&n.quasis.some(q=>/<(?:button|h[1-6]|span|div|p|label|option|small)\b/.test(q.value.raw))&&!debugOnly(n))trace(n,fn+' / HTML');
    if(n.type==='Literal'&&typeof n.value==='string'&&/<(?:button|h[1-6]|span|div|p|label|option|small|img)\b/.test(n.value)&&!debugOnly(n))trace(n,fn+' / HTML');
    if(n.type==='VariableDeclarator'&&n.init?.type==='ObjectExpression'&&n.id.name==='KW_DESC_MAP'){
      for(const prop of n.init.properties)trace(prop.value,'キーワード説明の初期値 / '+propertyName(prop),new Map(),new Set(),'キーワード表:'+propertyName(prop));
    }
    if(n.type==='VariableDeclarator'&&n.init?.type==='ObjectExpression'&&n.id.name==='COLLECTION_TEXTS'){
      for(const prop of n.init.properties)if(prop.value.type==='ArrayExpression'){
        const value=prop.value.elements[1],key=staticValue(prop.value.elements[0]);
        trace(value,'コレクション / '+propertyName(prop),new Map(),new Set(),key);
        if(key===null&&rows.has(value))rows.get(value).noSheetKey=true;
      }
    }
    if(n.type==='CallExpression'){
      const name=callName(n);
      if(sheetCalls.has(name))trace(n,fn+' / シート文言の予備');
      else if(/^(?:log|addLog|showErrorOverlay|showGameConfirm|alert|confirm|prompt|play[A-Za-z]*Label|show[A-Za-z]*(?:Message|Warning|Error|Tooltip|Notice))$/.test(name)&&!debugOnly(n))n.arguments.forEach(a=>trace(a,fn+' → '+name));
      else if(name==='setAttribute'&&['title','alt','aria-label','placeholder','data-preview','data-keyword-preview'].includes(staticValue(n.arguments[0]))&&!debugOnly(n))trace(n.arguments[1],fn+' / '+staticValue(n.arguments[0]));
    }
    if(n.type==='NewExpression'&&callName(n)==='Error')n.arguments.forEach(a=>trace(a,fn+' / エラー（表示は呼出元に依存）'));
  }
  // typeof textMessage の別枝も同じ行の予備文。主一覧へ二重計上しない。
  const bound=[...rows.values()].filter(r=>r.bindings.size);
  for(const row of rows.values())if(!row.bindings.size){const match=bound.find(b=>Math.abs(b.line-row.line)<=1&&norm(b.text)===norm(row.text));if(match)row.bindings=new Set(match.bindings);}
  return {rows:[...rows.values()],ast,nodes,meta,staticValue};
}
function scanHtml(source,js){
  const rows=[],line=i=>source.slice(0,i).split('\n').length;
  const cssKeys=new Map(),domKeys=[];
  for(const p of js.nodes.filter(n=>n.type==='ObjectExpression')){
    const get=k=>{const n=p.properties.find(n=>propertyName(n)===k);return n&&js.staticValue(n.value);};
    if(get('prop')&&get('key'))cssKeys.set(get('prop'),get('key'));
    if(get('sel')&&get('key'))domKeys.push({sel:get('sel'),key:get('key')});
  }
  const htmlRows=[];let masked=source.replace(/<!--[\s\S]*?-->/g,s=>s.replace(/[^\n]/g,' '));
  masked=masked.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi,(whole,css,index)=>{
    const start=index+whole.indexOf(css);
    for(const m of css.matchAll(/content\s*:\s*([^;{}]+)[;}]/g)){
      const value=m[1],bindings=new Set();for(const v of value.matchAll(/var\(\s*(--[\w-]+)/g))if(cssKeys.has(v[1]))bindings.add(cssKeys.get(v[1]));
      for(const q of value.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g))if(JP.test(q[2])){
        const brace=css.lastIndexOf('{',m.index),previous=css.lastIndexOf('}',brace),selector=css.slice(previous+1,brace).replace(/\/\*[\s\S]*?\*\//g,'').trim().replace(/\s+/g,' ');
        rows.push({file:'index.html',line:line(start+m.index),column:1,text:q[2],where:new Set(['CSS content / '+selector]),bindings,raw:q[2]});
      }
    }
    return whole.replace(/[^\n]/g,' ');
  }).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,s=>s.replace(/[^\n]/g,' '));
  const stack=[];
  function matchesSelector(sel){
    // 対象表の単純なID・クラス・タグの子孫セレクタだけを使う。
    const parts=sel.trim().split(/\s+/);let at=stack.length-1;
    for(let i=parts.length-1;i>=0;i--){const part=parts[i];let found=false;for(;at>=0;at--){const el=stack[at],tag=part.match(/^[\w-]+/)?.[0],id=part.match(/#([\w-]+)/)?.[1],classes=[...part.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);if((!tag||el.tag===tag)&&(!id||el.id===id)&&classes.every(c=>el.classes.includes(c))){found=true;at--;break;}}if(!found)return false;}return true;
  }
  for(const m of masked.matchAll(/<\/?[a-zA-Z][^>]*>|[^<]+/g)){
    const token=m[0];if(token.startsWith('</')){const tag=token.match(/^<\/([\w-]+)/)[1];while(stack.length){if(stack.pop().tag===tag)break;}continue;}
    if(token.startsWith('<')){
      const tag=token.match(/^<([\w-]+)/)[1],id=token.match(/\bid="([^"]*)"/)?.[1]||'',classes=(token.match(/\bclass="([^"]*)"/)?.[1]||'').split(/\s+/);
      const el={tag,id,classes};stack.push(el);
      for(const a of token.matchAll(/\b(title|alt|aria-label|placeholder|data-preview)\s*=\s*(["'])([\s\S]*?)\2/g))if(JP.test(a[3]))htmlRows.push({file:'index.html',line:line(m.index),column:1,text:a[3],where:new Set(['HTML '+(id?'#'+id:tag)+' / '+a[1]]),bindings:new Set(),raw:a[3]});
      if(/\/\s*>$/.test(token)||/^(?:meta|link|img|input|br|hr|source|area|wbr)$/.test(tag))stack.pop();continue;
    }
    const text=humanText(token);if(!JP.test(text))continue;
    const el=stack.at(-1)||{tag:'html',id:'',classes:[]};
    const bound=domKeys.filter(d=>matchesSelector(d.sel)).map(d=>d.key);
    htmlRows.push({file:'index.html',line:line(m.index+token.search(/\S/)),column:1,text,where:new Set(['HTML '+stack.filter(e=>e.id).map(e=>'#'+e.id).join(' ')+' '+el.tag+(el.classes.length?'.'+el.classes.join('.'):'')]),bindings:new Set(bound),raw:text});
  }
  return [...rows,...htmlRows];
}
function keyMatches(text){
  const s=norm(text),pattern=s.replace(/\$\{[^}]*\}/g,'X');
  const exact=messages.filter(m=>norm(m.text)===s).map(m=>m.key);
  if(exact.length)return '同文: '+exact.join(' / ');
  if(s.length<2)return 'なし';
  const partial=messages.filter(m=>{const t=norm(m.text);return t===pattern||Math.min(s.length,t.length)>=6
    &&Math.min(s.length,t.length)/Math.max(s.length,t.length)>=.5&&(t.includes(s)||s.includes(t));}).map(m=>m.key);
  return partial.length?'部分一致候補: '+partial.join(' / '):'なし';
}
function allFiles(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?allFiles(path.join(dir,e.name)):/\.(?:js|mjs)$/.test(e.name)?[path.join(dir,e.name)]:[]);}
function audit(){
  const files=['js/engine','js/battle','js/save','js/online'].flatMap(d=>allFiles(path.join(ROOT,d))).sort(),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  let rows=[],mainJs;
  for(const file of files){const scan=scanJs(fs.readFileSync(file,'utf8'),path.relative(ROOT,file));rows.push(...scan.rows);if(file.endsWith('/js/engine/main.js'))mainJs=scan;}
  for(const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi))rows.push(...scanJs(m[1],'index.html',html.slice(0,m.index+ m[0].indexOf(m[1])).split('\n').length-1).rows);
  rows.push(...scanHtml(html,mainJs));
  const unique=new Map();
  for(const row of rows){
    row.where=[...row.where];row.bindings=[...row.bindings];row.keys=keyMatches(row.text);
    if(row.noSheetKey)row.bindings=[];
    const known=row.bindings.filter(bindingExists);
    row.status=row.dataFallback?'各シートで上書きする初期定義':known.length?'シート読込済みの予備／初期表示':row.bindings.includes('動的キー')?'動的キーの予備（キーは呼出時に決定）':row.bindings.length?'キー未収録・予備文が表示':'コードから表示';
    const key=[row.file,row.line,row.column,row.text].join(':');if(!unique.has(key))unique.set(key,row);
  }
  const result=[...unique.values()].sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line||a.column-b.column);
  return {source:'js/data/local_xlsx_data.js（読取専用）',files:files.map(f=>path.relative(ROOT,f)).concat('index.html'),rows:result};
}
function markdown(report){
  const direct=report.rows.filter(r=>!r.status.startsWith('シート読込済み')&&!r.status.startsWith('動的キー')&&!r.dataFallback),dynamic=report.rows.filter(r=>r.status.startsWith('動的キー')),fallback=report.rows.filter(r=>r.status.startsWith('シート読込済み')),initial=report.rows.filter(r=>r.dataFallback);
  const esc=s=>String(s).replace(/\|/g,'\\|').replace(/\r?\n/g,'<br>').replace(/`/g,'&#96;');
  const lines=['# シートを読んでいない日本語文言（2026-10-27）','',
    '対象: `js/engine`・`js/battle`・`index.html`・`js/save`・`js/online`。シートは取り込み済みの内蔵CSVを参照。',
    'ASTで表示先の値、ボタン等のHTML、表示用設定、エラー、CSSのcontentを抽出した静的監査。コメント・console・正規表現・比較や検索にしか使わない語・開発者専用のデバッグ情報は除外し、デバッグ画面のボタンは含める。',
    '「どこに出るか」は表示先／関数／設定の入口を示す。旧仕様・条件付き経路も残す。`${…}`は実行時の差し込み、エラーは呼出元で画面へ出る場合を含む。実機の全画面を走査した一覧ではない。',
    '対応キーは同文と部分一致候補を区別した。同文のキーがあってもコードが引いていなければ主一覧に残す。予備文と初期HTMLのうち既にシートを読むものは末尾へ分けた。文言の置換は行っていない。','',
    `走査: ${report.files.length}ファイル。主一覧 ${direct.length}箇所、動的キーの予備 ${dynamic.length}箇所、シート読込済みの予備／初期表示 ${fallback.length}箇所、各シートで上書きする初期定義 ${initial.length}箇所。`,'',
    '再生成: `node tools/balance_sim/hardcoded_text_audit_1027.js`。任意のJSON出力: `--json /tmp/hardcoded-text-1027.json`。',''];
  function table(title,rs){lines.push('## '+title,'','| ファイル | 行 | 文 | どこに出るか | テキストメッセージ表の対応キー | 読み取り状態 |','| --- | ---: | --- | --- | --- | --- |');for(const r of rs)lines.push(`| ${r.file} | ${r.line} | ${esc(r.text)} | ${esc(r.where.join(' / '))} | ${esc(r.bindings.length?r.bindings.map(k=>`${k}（${bindingExists(k)?'あり':'未収録／動的'}）`).join(' / '):r.keys)} | ${r.status} |`);lines.push('');}
  table('コードから表示する文・キー未収録の文',direct);table('動的キーを使う予備文（呼出時のキー確認用）',dynamic);table('参考: シートを読む予備文・上書き前の初期表示',fallback);table('参考: loaderが各シートで上書きするカード・アイテムの初期定義（未使用の旧定義を含む）',initial);
  return lines.join('\n')+'\n';
}
function selfTest(){
  const sample=`// 無視するコメント\nconsole.log('無視するログ'); const f = x => x === '判定語';\nconst title='固定の見出し'; out.textContent=title;\nbtn.innerHTML='<span>デバッグ用ボタン</span>';\nconst t=textMessage('存在しない検査キー','不足した説明'); node.textContent=t;\nstyle.textContent='/* 除外するCSSコメント */ .a{color:red}';\nfunction debugInfo(){stats.textContent='開発専用の情報';}\nfunction debugButton(){btn.textContent='検査のボタン';}`;
  const rows=scanJs(sample,'fixture.js').rows;
  for(const text of ['無視するコメント','無視するログ','判定語','除外するCSSコメント','開発専用の情報'])assert.ok(!rows.some(r=>r.text.includes(text)),text);
  for(const text of ['固定の見出し','デバッグ用ボタン','不足した説明','検査のボタン'])assert.ok(rows.some(r=>r.text===text),text);
  assert.ok(rows.find(r=>r.text==='不足した説明').bindings.has('存在しない検査キー'));
}
if(require.main===module){
  selfTest();const report=audit(),args=process.argv.slice(2),out=args.includes('--out')?path.resolve(args[args.indexOf('--out')+1]):path.join(__dirname,'HARDCODED_TEXT_1027.md');
  fs.writeFileSync(out,markdown(report));if(args.includes('--json'))fs.writeFileSync(path.resolve(args[args.indexOf('--json')+1]),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({files:report.files.length,rows:report.rows.length,counts:report.rows.reduce((m,r)=>(m[r.status]=(m[r.status]||0)+1,m),{}),out}));
}
module.exports={scanJs,scanHtml,audit,markdown,selfTest};
