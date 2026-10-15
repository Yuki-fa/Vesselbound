/* 確定ファイルと編集中の下書きを分ける。確定操作だけがPOST/ダウンロードを行う。 */
var VbFxLabStore = (function () {
  'use strict';
  var M=VbFxLabModel, state=M.empty(), baseline=M.empty(), listeners=[], dirty=false, loading=false, saving=false;
  var DRAFT='vbfx-lab-draft-v1', CONFIRMED='vbfx-lab-confirmed-v1', revision=0;
  function read(key) { try { var s=localStorage.getItem(key);return s?JSON.parse(s):null; } catch(e){return null;} }
  function cache(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch(e){ /* 保存本体の代用にしない */ } }
  function notify() { listeners.forEach(function(fn){fn();}); }
  function content(s) { return JSON.stringify([s.effects,s.suppressGeneric]); }
  function changed() { revision++;dirty=content(state)!==content(baseline);cache(DRAFT,{base:baseline.savedAt,state:state,dirty:dirty});notify(); }
  function edit(name) {
    if(!state.effects[name]) { var m=M.meta(name,state,VbFxLabMeta);state.effects[name]={title:m.title,tags:m.tags,assign:[]}; }
    return state.effects[name];
  }
  function restoreDraft() {
    var d=read(DRAFT);
    if(d&&d.dirty&&d.base===baseline.savedAt) { try{state=M.validate(d.state);dirty=true;}catch(e){ /* 不正な下書きは使わない */ } }
  }
  async function load() {
    loading=true;notify();var began=revision;
    try {
      if(typeof fetch!=='function') throw new Error('この環境ではファイルを取得できません');
      var response=await fetch('vfx_preview/lab_assignments.json',{cache:'no-store'});
      if(response.status===404) baseline=M.empty();
      else {if(!response.ok) throw new Error('HTTP '+response.status);baseline=M.validate(await response.json());}
      if(began===revision) {state=M.clone(baseline);restoreDraft();}
      cache(CONFIRMED,baseline);
      status=dirty?'未保存の下書きを復元しました':'保存ファイルを読み込みました';
    } catch(e) {
      var cached=read(CONFIRMED);
      if(began===revision) {if(cached)try{baseline=M.validate(cached);state=M.clone(baseline);}catch(ignore){}restoreDraft();}
      status=location.protocol==='file:'?'file://：保存JSONは「JSONを読み込む」から選べます（前回の下書きは復元）':'保存ファイルを読めません：'+e.message;
    }
    loading=false;notify();return state;
  }
  var status='保存ファイルを準備中';
  function download(payload) {
    var url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
    var a=document.createElement('a');a.href=url;a.download='lab_assignments.json';document.body.appendChild(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  async function save() {
    if(saving||loading)return;
    var payload=M.materialize(state,VbFx.effects,VbFxLabMeta,new Date().toISOString()),began=revision,server=false;
    saving=true;status='保存中…';notify();
    try {
      if(location.protocol==='file:'||typeof fetch!=='function')throw new Error('ローカルファイル');
      var response=await fetch('/__vfx_lab/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!response.ok)throw new Error('HTTP '+response.status);
      var result=await response.json();if(!result.ok)throw new Error('保存応答が不正');server=true;
    } catch(e) {
      try {download(payload);}catch(failed){saving=false;status='保存もダウンロードもできません：'+failed.message;notify();return;}
    }
    baseline=M.clone(payload);cache(CONFIRMED,baseline);
    if(began===revision) {state=M.clone(payload);dirty=false;} else {state.savedAt=payload.savedAt;dirty=true;}
    cache(DRAFT,{base:baseline.savedAt,state:state,dirty:dirty});saving=false;
    status=server?'確定保存しました（lab_assignments.json）':'サーバー保存できなかったのでダウンロードしました';
    if(dirty)status+='／保存中の追加変更は未保存';notify();return {server:server,payload:payload};
  }
  function importData(value) { state=M.validate(value);changed();status='JSONを読み込みました。確定保存で反映してください';notify(); }
  return {get:function(){return state;},info:function(){return {dirty:dirty,loading:loading,saving:saving,status:status};},
    meta:function(name){return M.meta(name,state,VbFxLabMeta);},onChange:function(fn){listeners.push(fn);},
    setMeta:function(name,title,tags){var e=edit(name);e.title=title.trim()||'見出し未設定';e.tags=tags;changed();},
    setAssignments:function(name,assign){if(assign.length>M.MAX_ASSIGN)throw new Error('割り振りは10件まで');edit(name).assign=M.clone(assign);changed();},
    suppress:function(no,id,on){var list=(state.suppressGeneric[no]||[]).filter(function(x){return x!==id;});if(on)list.push(id);if(list.length)state.suppressGeneric[no]=list;else delete state.suppressGeneric[no];changed();},
    load:load,save:save,importData:importData,download:download};
})();
