/* 見出し・タグ・最大10件の割り振り。再生と音の同期はpreview.jsへ任せる。 */
var VbFxLabUI = (function () {
  'use strict';
  var M=VbFxLabModel,S=VbFxLabStore,cards=VbFxCards.cards(),uses={},name=VbFxPreview.snapshot().name,editor,editingMeta=false;
  var $=function(id){return document.getElementById(id);};
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
  function button(text,fn){var b=el('button','',text);b.type='button';b.addEventListener('click',fn);return b;}
  function selectInput(values,value,label,fn){var s=el('select');s.setAttribute('aria-label',label);values.forEach(function(v){var o=el('option','',v[1]);o.value=v[0];s.appendChild(o);});s.value=value;s.addEventListener('change',function(){fn(s.value);});return s;}
  VbFx.effects.forEach(function(d){uses[d.name]=M.currentUses(d.name,cards,VbFxCardRoutes,PRESENT_LAB_FX,KEYWORD_ASSET_KEYS);});
  function planned(){return (S.get().effects[name]||{}).assign||[];}
  function addAssignment(a){var next=planned().slice();if(next.length>=M.MAX_ASSIGN)return;next.push({kind:a.kind,id:a.id,name:a.name,trigger:a.trigger||null,se:'game'});S.setAssignments(name,next);}
  function targetOptions(filter){return cards.filter(function(c){return !filter||M.target(c).kind===filter;}).map(function(c){var t=M.target(c);return [t.kind+'|'+t.id,c.no+' · '+c.name];});}
  function updateAssignment(index,patch){var list=M.clone(planned());Object.assign(list[index],patch);S.setAssignments(name,list);}
  function renderEditor(){
    editor.replaceChildren();var m=S.meta(name);
    var head=el('h2','','見出し・タグと割り振り');head.appendChild(el('code','',name));editor.appendChild(head);
    var fields=el('div','lab-meta-fields'),title=el('input'),tags=el('input');title.type=tags.type='text';title.value=m.title;tags.value=m.tags.join(' / ');
    title.id='lab-title-input';tags.id='lab-tags-input';title.maxLength=tags.maxLength=300;title.setAttribute('aria-label','見出し');tags.setAttribute('aria-label','タグ（スラッシュ区切り）');
    title.addEventListener('change',function(){editingMeta=true;S.setMeta(name,title.value,S.meta(name).tags);editingMeta=false;title.value=S.meta(name).title;});
    tags.addEventListener('change',function(){editingMeta=true;S.setMeta(name,S.meta(name).title,Array.from(new Set(tags.value.split(/[\s,、/]+/).filter(Boolean))).slice(0,30));editingMeta=false;tags.value=S.meta(name).tags.join(' / ');});
    [['見出し',title],['タグ（ / 区切り）',tags]].forEach(function(p){var l=el('label','',p[0]);l.appendChild(p[1]);fields.appendChild(l);});editor.appendChild(fields);
    if(m.missing)editor.appendChild(el('p','lab-warning','見出し未設定：lab_meta.jsに無い新しい定義です。ここで名前とタグを付けて保存できます。'));
    var current=el('details','lab-current-uses');current.open=true;current.appendChild(el('summary','','現在のゲームの割り振り · '+uses[name].length+'経路（根拠を表示）'));
    var currentList=el('div','lab-use-list');
    if(!uses[name].length)currentList.appendChild(el('p','','不明：採取済みの実経路・現在の対応表では割り振りを確認できません。未採用の比較案も含みます。'));
    uses[name].forEach(function(a){var r=el('div','lab-use-row');r.appendChild(el('span','',a.id+' · '+a.name+' / '+(a.trigger||'発動種別は不明')));r.appendChild(el('small','',a.basis+' / '+a.code+(a.scale!=null?' / 本体倍率表 '+a.scale+'×':'')));
      var add=button('＋ この割り振りを編集へ',function(){addAssignment(a);});add.disabled=planned().length>=M.MAX_ASSIGN;r.appendChild(add);currentList.appendChild(r);});current.appendChild(currentList);editor.appendChild(current);
    editor.appendChild(el('h3','','変更する割り振り · '+planned().length+' / '+M.MAX_ASSIGN));
    editor.appendChild(el('p','lab-editor-note','指定した対象では、この割り振りを優先してプレビューします。空欄の効果は現行ゲームを継続。ゲームへの反映用に全体を「確定保存」してください。'));
    var rows=el('div','lab-assignment-rows');
    planned().forEach(function(a,i){
      var row=el('div','lab-assignment-row');
      var kinds=[['character','キャラクター'],['enchant','エンチャント'],['item','アイテム'],['ring','指輪'],['enemy','敵'],['npc','NPC'],['board','魔導板のマス'],['keyword','キーワード'],['other','共通演出']];
      row.appendChild(selectInput(kinds,a.kind,'割り振り先の分類',function(kind){var t=cards.map(M.target).find(function(t){return t.kind===kind;});if(t)updateAssignment(i,t);}));
      row.appendChild(selectInput(targetOptions(a.kind),a.kind+'|'+a.id,'割り振り先',function(key){var card=cards.find(function(c){var t=M.target(c);return t.kind+'|'+t.id===key;});if(card)updateAssignment(i,M.target(card));}));
      var triggers=['','攻撃','負傷','死亡','開戦','マナ','常時','命中','付与','状態','召喚','復活','消失','使用','魔導板変更'];
      if(a.trigger&&triggers.indexOf(a.trigger)<0)triggers.push(a.trigger);
      row.appendChild(selectInput(triggers.map(function(t){return [t,t||'発動種別：指定なし'];}),a.trigger||'','発動の種類',function(t){updateAssignment(i,{trigger:t||null});}));
      var sounds=[['game','今のゲームSE'],['','SEなし']].concat((VbFxSeCatalog.effects[name]||[]).map(function(id,j){return [id,'候補'+(j+1)+' · '+VbFxSeCatalog.sounds[id].filename];}));
      if(a.se&&!sounds.some(function(p){return p[0]===a.se;}))sounds.push([a.se,a.se+'（候補未登録）']);
      row.appendChild(selectInput(sounds,a.se||'','この割り振りのSE',function(se){updateAssignment(i,{se:se||null});}));
      row.appendChild(button('この対象で再生',function(){var c=cards.find(function(c){return M.target(c).kind===a.kind&&M.target(c).id===a.id;});if(c){VbFxCards.show(M.pageFor(c).id);VbFxCards.choose(c.no);VbFxCards.play(c.no);}}));
      var remove=button('×',function(){var list=planned().slice();list.splice(i,1);S.setAssignments(name,list);});remove.setAttribute('aria-label','割り振り'+(i+1)+'を削除');row.appendChild(remove);rows.appendChild(row);
    });editor.appendChild(rows);
    var picker=el('div','lab-add-assignment'),query=el('input');query.type='search';query.placeholder='割り振り先を番号・名前で検索';query.setAttribute('aria-label','割り振り候補を検索');
    var choices=selectInput(targetOptions(),targetOptions()[0][0],'追加する割り振り先',function(){});
    query.addEventListener('input',function(){choices.replaceChildren();var q=query.value.toLowerCase();targetOptions().filter(function(p){return p[1].toLowerCase().includes(q);}).forEach(function(p){var o=el('option','',p[1]);o.value=p[0];choices.appendChild(o);});});
    var add=button('＋ 割り振りを追加',function(){var c=cards.find(function(c){var t=M.target(c);return t.kind+'|'+t.id===choices.value;});if(c)addAssignment(M.target(c));});add.disabled=planned().length>=M.MAX_ASSIGN;
    picker.append(query,choices,add);editor.appendChild(picker);
  }
  function refresh(){
    var info=S.info();$('lab-save').disabled=info.loading||info.saving;$('lab-save').textContent=info.saving?'保存中…':'確定保存';
    $('lab-dirty').textContent=info.dirty?'● 未保存の変更あり':'保存済み／変更なし';$('lab-dirty').classList.toggle('dirty',info.dirty);$('lab-save-status').textContent=info.status;
    if(!editingMeta)renderEditor();$('effect-title').textContent=S.meta(VbFxPreview.snapshot().name).title;VbFxPreview.refreshList();
  }
  function init(){
    var bar=el('div','lab-savebar');bar.appendChild(el('span','lab-save-note','割り振り・見出し・タグ・汎用VFXの抑止をまとめて保存'));
    var dirty=el('span');dirty.id='lab-dirty';dirty.setAttribute('role','status');bar.appendChild(dirty);
    var save=button('確定保存',function(){S.save().catch(function(e){$('lab-save-status').textContent=e.message;});});save.id='lab-save';save.className='primary';bar.appendChild(save);
    var file=el('input');file.type='file';file.accept='.json,application/json';file.id='lab-import';file.hidden=true;
    file.addEventListener('change',async function(){try{if(file.files[0])S.importData(JSON.parse(await file.files[0].text()));}catch(e){$('lab-save-status').textContent='読込失敗：'+e.message;}file.value='';});
    bar.appendChild(button('JSONを読み込む',function(){file.click();}));bar.appendChild(file);
    var status=el('span');status.id='lab-save-status';status.setAttribute('role','status');bar.appendChild(status);document.querySelector('main').prepend(bar);
    // タブ（.lab-tabs）は固定ヘッダーの帯の中に置く（2026-10-15 利用者指定）。先に作られていれば移す。
    var tabs=document.querySelector('.lab-tabs');if(tabs)bar.appendChild(tabs);
    editor=el('section','lab-effect-editor');editor.id='lab-effect-editor';document.querySelector('.sound-panel').after(editor);
    S.onChange(refresh);refresh();
    window.addEventListener('beforeunload',function(e){if(S.info().dirty){e.preventDefault();e.returnValue='';}});
    S.load();
  }
  init();
  return {select:function(effect){name=effect;renderEditor();},
    searchText:function(effect){return uses[effect].map(function(a){return a.id+' '+a.name;}).concat(((S.get().effects[effect]||{}).assign||[]).map(function(a){return a.id+' '+a.name;}));},
    current:function(effect){return M.clone(uses[effect]||[]);}};
})();
// 初期化後には現行カード名も検索対象へ入る。
VbFxPreview.refreshList();
