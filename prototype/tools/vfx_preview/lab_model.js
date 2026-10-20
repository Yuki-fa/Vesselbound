/* LABだけの分類・割り振り・保存契約。ゲームのルールや描画を変更しない。 */
var VbFxLabModel = (function () {
  'use strict';
  var pages = [
    {id:'effects',title:'演出の一覧',sources:[]},
    {id:'character',title:'キャラクター',sources:['card']},
    {id:'enchant',title:'エンチャント',sources:['enchant']},
    {id:'item',title:'アイテム',sources:['item']},
    {id:'ring',title:'指輪',sources:['ring']},
    {id:'enemy',title:'敵／NPC',sources:['enemy','char']},
    {id:'board',title:'魔導板強化',sources:['mapPanelPower']},
    {id:'other',title:'その他',sources:['keyword','specialFx']}
  ];
  var assignKinds = {card:'character',enchant:'enchant',item:'item',ring:'ring',enemy:'enemy',char:'npc',mapPanelPower:'board',keyword:'keyword',specialFx:'other'};
  // js/engine/battle_fx.js の _battleFxValues / _battleFxFollowStates の対応。
  var states = {'結界':'shield-state','毒':'poison-state','弱体':'weaken-state','根性':'guts-state','復活':'revive-state'};
  var MAX_ASSIGN = 10;
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function empty() { return {version:1,savedAt:null,effects:{},suppressGeneric:{}}; }
  function pageFor(card) { return pages.find(function (p) { return p.sources.indexOf(card.kind) >= 0; }); }
  function target(card) { return {kind:assignKinds[card.kind],id:card.kind === 'keyword' ? card.name : card.no,name:card.name}; }
  function sameTarget(a, b) { var t = target(b); return a.kind === t.kind && a.id === t.id; }
  function meta(name, saved, base) {
    var raw = saved && saved.effects && saved.effects[name] || base && base[name];
    return {title:raw && raw.title || '見出し未設定',tags:raw && raw.tags ? raw.tags.slice() : [],
      addedAt:base && base[name] && base[name].addedAt || '',unregistered:!(base && base[name]),missing:!(raw && raw.title && raw.title!=='見出し未設定')};
  }
  function effects(definitions, saved, base) {
    return definitions.map(function (d, i) { return {name:d.name,definition:d,index:i,meta:meta(d.name,saved,base)}; })
      .sort(function (a,b) { return Number(b.meta.unregistered)-Number(a.meta.unregistered) || b.meta.addedAt.localeCompare(a.meta.addedAt) || a.index-b.index; });
  }
  function definitionName(media) { return media.definition || (String(media.path || '').match(/^vfx:[^:]+:([^:]+)$/) || [])[1] || ''; }
  function codeOf(media) { return media.sourceCode || (String(media.path || '').match(/^vfx:([^:]+):/) || [])[1] || ''; }
  // 素材キーが空のキーワード（熟練など絵を持たないもの）を、番号の無い経路に結び付けない。
  function keywordForCode(code, keywords) { if (!code) return ''; return Object.keys(keywords || {}).find(function (k) { return keywords[k] && keywords[k] === code; }) || ''; }
  function keywordNames(card, cards) {
    var text = String(card.keywords || '') + ' ' + String(card.row['合体キーワード'] || '');
    return cards.filter(function (c) { return c.kind === 'keyword'; }).map(function (c) { return c.name; })
      .filter(function (name) { return card.kind==='keyword'&&card.name===name || text.split(/[\s,、/]+/).some(function (w) { return w.replace(/(?:\d+|X|∞)+$/,'') === name; }); });
  }
  function rawVfx(card, routes) { return (routes.records[card.no] || {}).vfx || []; }
  function rawSe(card, routes) { return (routes.records[card.no] || {}).se || []; }
  // 現行割り振りは実経路とpresent.jsの明示的な表だけから読む。catalog.source/labelは根拠にしない。
  function currentUses(name, cards, routes, labFx, keywordKeys) {
    var result = [];
    function add(card, trigger, basis, code) {
      var a = Object.assign(target(card),{trigger:trigger || null,se:'game',basis:basis,code:code || card.no,
        scale:typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(code || card.no):null});
      if (!result.some(function (x) { return x.kind===a.kind && x.id===a.id && x.trigger===a.trigger; })) result.push(a);
    }
    cards.forEach(function (c) {
      rawVfx(c,routes).forEach(function (m) {
        var code=codeOf(m), replacement=labFx[code];
        if ((replacement ? replacement[0] : definitionName(m)) === name) add(c,m.trigger,'cards_routes.js'+(replacement?' → PRESENT_LAB_FX':''),code);
      });
      var codes = [c.kind==='keyword' ? keywordKeys[c.name] : c.no].concat(c.kind==='specialFx'&&keywordKeys[c.name]?[keywordKeys[c.name]]:[],String(c.row['VFX/SE'] || '').split(/[\s,、/]+/));
      codes.filter(Boolean).forEach(function (code) {
        if (labFx[code] && labFx[code][0]===name) add(c,null,'PRESENT_LAB_FX'+(c.kind==='keyword'?' / KEYWORD_ASSET_KEYS':''),code);
      });
      if(c.kind==='keyword' && states[c.name]===name) add(c,'状態','battle_fx.js / _battleFxValues',keywordKeys[c.name]);
    });
    // 番号の後ろに「_種類」が付く置換（K009_SWEEP＝1列だけの全体攻撃など）も、その番号の持ち主の割り振り。
    cards.forEach(function (c) {
      var code = c.kind==='keyword' ? keywordKeys[c.name] : c.no;
      if (code) Object.keys(labFx).forEach(function (k) { if (k.indexOf(code + '_')===0 && labFx[k][0]===name) add(c,null,'PRESENT_LAB_FX（'+k+'）',k); });
    });
    // 番号で引かない演出（present.js：巻物の使用・マップの力・開戦の登場）。
    var itemFx = typeof PRESENT_ITEM_USE_FX !== 'undefined' ? PRESENT_ITEM_USE_FX : {};
    Object.keys(itemFx).forEach(function (no) { if (itemFx[no]!==name) return; var c=cards.find(function(x){return x.kind==='item'&&x.no===no;}); if (c) add(c,'使用','PRESENT_ITEM_USE_FX',no); });
    var mapNo = typeof PRESENT_MAP_POWER_NO !== 'undefined' ? PRESENT_MAP_POWER_NO : {};
    Object.keys(labFx).forEach(function (k) {
      var m=/^map:(.+)$/.exec(k); if (!m || labFx[k][0]!==name) return;
      var c=cards.find(function(x){return x.kind==='mapPanelPower'&&x.no===mapNo[m[1]];}); if (c) add(c,null,'PRESENT_LAB_FX / PRESENT_MAP_POWER_NO',k);
    });
    (typeof PRESENT_DIRECT_LAB_FX !== 'undefined' ? PRESENT_DIRECT_LAB_FX : []).forEach(function (d) {
      if (d.effect===name && !result.some(function(x){return x.kind==='other'&&x.id===d.id;})) result.push({kind:'other',id:d.id,name:d.name,trigger:d.trigger,se:'game',basis:d.basis,code:d.id,scale:null});
    });
    if (labFx.shield_break && labFx.shield_break[0]===name) {var shield=cards.find(function(c){return c.kind==='keyword'&&c.name==='結界';});if(shield)add(shield,'消失','PRESENT_LAB_FX','shield_break');}
    return result;
  }
  function generic(card, cards, routes, keywordKeys, labFx) {
    var out=[];
    function add(id,name,media,basis) {
      var e=out.find(function (x) { return x.id===id; });
      if (!e) { e={id:id,name:name,media:[],basis:basis}; out.push(e); }
      if(media && !e.media.some(function (m) { return JSON.stringify(m)===JSON.stringify(media); })) e.media.push(media);
    }
    rawVfx(card,routes).forEach(function (m) {
      var code=codeOf(m), kw=keywordForCode(code,keywordKeys);
      if (/^S00[5-9]$/.test(code)) add(code,code+' '+({'S005':'攻撃強化','S006':'負傷強化','S007':'死亡強化','S008':'マナ強化','S009':'常時強化'}[code]),m,'実経路');
      else if(kw) add(kw,kw,m,'実経路 / KEYWORD_ASSET_KEYS');
      else if(code==='hit') add('hit','被弾',m,'実経路');
      else if(m.generic) add(m.fn,m.fn==='playCardBurnAway'?'カードの消滅':'発動の光',m,'実経路');
    });
    keywordNames(card,cards).forEach(function (kw) {
      var key=keywordKeys[kw], k=cards.find(function(c){return c.kind==='keyword'&&c.name===kw;});
      if(k) rawVfx(k,routes).filter(function(m){return codeOf(m)===key;}).forEach(function(m){add(kw,kw,m,'シートのキーワード / 実経路');});
      if(labFx[key]) add(kw,kw,{definition:labFx[key][0],sourceCode:key,trigger:'keyword_effect',mode:'hit'},'シートのキーワード / PRESENT_LAB_FX');
      if(states[kw]) add(kw,kw,{definition:states[kw],sourceCode:key,trigger:'状態',loop:true,mode:'state',geometry:{anchor:'source'}},'シートのキーワード / battle_fx.js');
    });
    return out;
  }
  function suppressed(card, media, state, keywordKeys) {
    var ids=state.suppressGeneric[card.no] || [],code=codeOf(media),kw=keywordForCode(code,keywordKeys);
    return ids.indexOf(code)>=0 || ids.indexOf(media.fn)>=0 || ids.indexOf(kw)>=0 || ids.some(function(id){return states[id]===definitionName(media);});
  }
  function assignmentsFor(card, state, cards) {
    var kws=keywordNames(card,cards), result=[];
    Object.keys(state.effects).forEach(function (name) {
      state.effects[name].assign.forEach(function (a) {
        if(sameTarget(a,card) || a.kind==='keyword' && kws.indexOf(a.id)>=0 && (state.suppressGeneric[card.no] || []).indexOf(a.id)<0)
          result.push({name:name,assign:a});
      });
    });
    return result;
  }
  function scene(card, trigger) {
    if(card.kind==='mapPanelPower' || card.kind==='item' && !/次の戦闘|戦闘開始/.test(card.effect))
      return {type:'board',no:card.no,kind:card.kind,cell:7,self:true,note:card.kind==='item'?'魔導板上で使用した対象のカード':'魔導板の中央のマス（クリックで変更）'};
    var enemy=card.kind==='enemy'||card.kind==='char',self=/代わりに受ける/.test(card.effect)||card.kind==='ring'||card.kind==='specialFx'||card.kind==='keyword' && !!states[card.name];
    return {type:'battle',no:card.no,kind:card.kind,side:enemy?'enemy':'ally',lane:enemy?'rear':'front',self:self,
      note:enemy?'敵の後衛中央が発生元':card.kind==='ring'?'指輪が発動した味方の上':card.kind==='enchant'?'エンチャントを付けた味方が発生元':self?'効果を受けるカードの上':'戦闘盤面・味方前衛中央が発生元',trigger:trigger || null};
  }
  function validate(value) {
    function obj(v) { return v && typeof v==='object' && !Array.isArray(v); }
    function str(v) { return typeof v==='string' && v.length<=300; }
    function require(ok, msg) { if(!ok) throw new Error('保存JSON：'+msg); }
    require(obj(value)&&value.version===1,'version は1');
    require(value.savedAt===null || typeof value.savedAt==='string' && Number.isFinite(Date.parse(value.savedAt)),'savedAt はISO時刻またはnull');
    require(obj(value.effects)&&obj(value.suppressGeneric),'effects / suppressGeneric はオブジェクト');
    Object.keys(value.effects).forEach(function(name) {
      require(str(name)&&!['__proto__','constructor','prototype'].includes(name),'効果名が不正');
      var e=value.effects[name];
      require(obj(e)&&str(e.title)&&e.title.trim(),'見出しが空');
      require(Array.isArray(e.tags)&&e.tags.length<=30&&e.tags.every(str),'tags は文字列配列（30件まで）');
      require(Array.isArray(e.assign)&&e.assign.length<=MAX_ASSIGN,'割り振りは10件まで');
      e.assign.forEach(function(a) {
        require(obj(a)&&['character','enchant','item','ring','enemy','npc','board','keyword','other'].includes(a.kind),'割り振り種別が不正');
        require(str(a.id)&&a.id.trim()&&str(a.name)&&a.name.trim(),'割り振り先の番号・名前が空');
        require(a.trigger===null||str(a.trigger),'trigger は文字列またはnull');
        require(a.se===null||str(a.se),'se は候補ID / game / null');
      });
    });
    Object.keys(value.suppressGeneric).forEach(function(id) {
      require(/^[A-Z]+\d{3}(?:_\d+)?$/.test(id),'抑止の対象番号が不正');
      require(Array.isArray(value.suppressGeneric[id])&&value.suppressGeneric[id].every(str),'抑止は文字列配列');
    });
    return clone(value);
  }
  function materialize(state,definitions,base,savedAt) {
    var out=clone(state); out.savedAt=savedAt;
    definitions.forEach(function(d) { if(!out.effects[d.name]) { var m=meta(d.name,state,base);out.effects[d.name]={title:m.title,tags:m.tags,assign:[]}; } });
    return validate(out);
  }
  return {pages:pages,assignKinds:assignKinds,states:states,MAX_ASSIGN:MAX_ASSIGN,empty:empty,clone:clone,
    pageFor:pageFor,target:target,meta:meta,effects:effects,definitionName:definitionName,codeOf:codeOf,keywordNames:keywordNames,
    currentUses:currentUses,generic:generic,suppressed:suppressed,assignmentsFor:assignmentsFor,scene:scene,validate:validate,materialize:materialize,
    rawVfx:rawVfx,rawSe:rawSe};
})();
