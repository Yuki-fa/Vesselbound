// 恒久コレクション。カードの表示・正式取得だけを受け、戦闘計算からは呼ばない。
const SaveProfile=(()=>{
  let profile=null,dirty=false,blocked=false;
  function fresh(){return {saveVersion:1,gameVersion:SaveMigrations.gameVersion,cards:{},items:{},rings:{},completedRuns:{}};}
  function validate(raw){
    const p=SaveMigrations.migrate('profile',raw),assert=SaveMigrations.assert;
    for(const group of ['cards','items','rings']){
      assert(p[group]&&!Array.isArray(p[group]),'コレクションがありません');
      for(const [id,value] of Object.entries(p[group])){
        assert(/^[A-Z][A-Z0-9_-]*\d[A-Z0-9_-]*$/.test(id),'コレクションIDが不正です');
        assert(value&&typeof value.seen==='boolean'&&typeof value.acquired==='boolean'&&(!value.acquired||value.seen),'発見・取得状態が不正です');
      }
    }
    assert(p.completedRuns&&typeof p.completedRuns==='object','ラン結果がありません');
    return p;
  }
  function load(){
    if(profile) return profile;
    try{profile=SaveStorage.read('profile',validate)?.data||fresh();}
    catch(error){console.error('[profile] 復旧できませんでした。既存データを保護します',error);blocked=true;profile=fresh();}
    return profile;
  }
  function enabled(){return typeof G!=='undefined'&&!!G._runId&&!G._debugMode&&!G._onlineMode&&!G._testBattleMode&&!G._libraryTestBattleMode&&!G._libraryTutorialActive&&!G._isSimulating&&!G._savePreparing;}
  function identity(card){
    if(!card) return null;
    const pools=[...(typeof PANEL_POOL!=='undefined'?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'?ENEMY_POOL:[]),...(typeof ITEM_POOL!=='undefined'?ITEM_POOL:[]),...(typeof RING_POOL!=='undefined'?RING_POOL:[])];
    const code=x=>{
      let value=String(x?.no||x?.No||x?.['No.']||x?.artCode||x?._artCode||x?.code||'').trim().toUpperCase();
      // アイテムシートはNo.が数字のみ。カテゴリを付けた正式な素材IDに揃える。
      if(/^\d+$/.test(value)) value=(x?.type==='ring'?'R':x?.kind==='item'||x?.type==='consumable'?'I':'')+value.padStart(3,'0');
      return value;
    };
    let def=typeof card==='string'?pools.find(x=>code(x)===card||x.id===card):card;
    if(!def) return null;
    if(!code(def)) def=pools.find(x=>x.id===def.id)||pools.find(x=>x.name===def.name)||def;
    const id=code(def);
    if(!/^[A-Z][A-Z0-9_-]*\d[A-Z0-9_-]*$/.test(id)) return null;
    const type=String(def.type||card.type||'');
    const group=type==='ring'||/^R\d/.test(id)?'rings':type==='consumable'||type==='item'||/^I\d/.test(id)?'items':'cards';
    return {id,group};
  }
  function flush(force=false){
    load();
    if(blocked) return false;
    if(!dirty&&!force) return true;
    try{SaveStorage.write('profile',profile,validate);dirty=false;return true;}
    catch(error){console.error('[profile] セーブに失敗しました',error);return false;}
  }
  function mark(card,acquired){
    if(!enabled()||card?._profileExcluded) return false;
    const ref=identity(card);if(!ref) return false;
    const p=load(),old=p[ref.group][ref.id];
    if(old?.seen&&(!acquired||old.acquired)) return true;
    p[ref.group][ref.id]={seen:true,acquired:!!acquired||!!old?.acquired};dirty=true;
    return flush();
  }
  function owned(){
    if(!enabled()) return;
    // 戦闘用allies/enemiesは所持品ではない。一時召喚・コピー・変身は入らない。
    for(const name of ['mainBoard','inventory','globalPanels','spellSlots','rings']){
      for(const card of G[name]||[]) if(card) mark(card,true);
    }
  }
  function observe(element,card){
    if(!enabled()) return;
    const runId=G._runId;
    queueMicrotask(()=>{
      if(!enabled()||G._runId!==runId||!element.isConnected||!element.getClientRects().length) return;
      if(element.closest('.battle-opening-pending')) return;
      if(getComputedStyle(element).visibility==='hidden') return;
      mark(card,false);
    });
  }
  function finish(result){
    if(!enabled()) return true;
    owned();
    const p=load();
    p.completedRuns[G._runId]={result,endedAt:Date.now()};dirty=true;
    return flush(true);
  }
  return {validate,load,flush,enabled,identity,owned,observe,finish,markCardSeen:card=>mark(card,false),markCardAcquired:card=>mark(card,true)};
})();
function markCardSeen(cardId){return SaveProfile.markCardSeen(cardId);}
function markCardAcquired(cardId){return SaveProfile.markCardAcquired(cardId);}
