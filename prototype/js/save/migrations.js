// バージョンごとの変換はここへ追加する。runとprofileは別々に進化できる。
const SaveMigrations=(()=>{
  const versions={run:3,profile:2};
  const legacyNpcIds={NPC001:'BC002',NPC002:'BC003',NPC003:'BC004'};
  const replaceLegacyNpcText=value=>{
    let text=String(value);
    for(const [oldId,newId] of Object.entries(legacyNpcIds)) text=text.split(oldId).join(newId);
    return text;
  };
  const rewriteLegacyNpcIds=value=>{
    if(typeof value==='string') return replaceLegacyNpcText(value);
    if(Array.isArray(value)) return value.map(rewriteLegacyNpcIds);
    if(!value||typeof value!=='object') return value;
    const out={};
    for(const [key,item] of Object.entries(value)){
      const nextKey=replaceLegacyNpcText(key);
      const nextValue=rewriteLegacyNpcIds(item);
      const current=out[nextKey];
      if(current&&nextValue&&typeof current==='object'&&typeof nextValue==='object'
          &&['seen','acquired'].some(k=>k in current||k in nextValue)){
        out[nextKey]={...current,...nextValue,
          seen:!!(current.seen||nextValue.seen),acquired:!!(current.acquired||nextValue.acquired)};
      }else out[nextKey]=nextValue;
    }
    return out;
  };
  const steps={
    run:{
      1:data=>{
        const state=data&&data.state;
        const old=data&&data.checkpoint;
        const type=old==='battle'?'battle':(state&&state.place&&state.place._isWaveAltar?'tower':'town');
        return {...data,saveVersion:2,checkpoint:{
          type,
          scene:state&&state.location?state.location.scene:null,
          stage:state&&state.location?state.location.stage:null,
          node:state&&state.location?state.location.node:null,
          battleType:state&&state.progress?state.progress._waveBattleType:null
        }};
      },
      // NPCシートのNo.変更。カード本体・盤面・報酬・クエスト状態内の参照をまとめて読み替える。
      2:data=>({...rewriteLegacyNpcIds(data),saveVersion:3})
    },
    profile:{
      // コレクションキー（NPC001等）も新しいBC番号へ統合する。
      1:data=>({...rewriteLegacyNpcIds(data),saveVersion:2})
    }
  };
  function assert(condition,message){if(!condition) throw new Error(message);}
  function json(value,parents=new Set()){
    if(value===null||typeof value==='string'||typeof value==='boolean') return;
    if(typeof value==='number'){assert(Number.isFinite(value),'保存値が有限数ではありません');return;}
    assert(value&&typeof value==='object','JSON以外の保存値です');
    assert(!parents.has(value),'保存値が循環しています');
    assert(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null,'保存値が通常のオブジェクトではありません');
    parents.add(value);
    for(const [k,v] of Object.entries(value)){
      assert(!['__proto__','constructor','prototype'].includes(k),'不正な保存キーです');
      json(v,parents);
    }
    parents.delete(value);
  }
  function migrate(kind,data){
    json(data);
    assert(data&&Number.isInteger(data.saveVersion)&&data.saveVersion>0,'saveVersionが不正です');
    if(data.saveVersion>versions[kind]){
      const error=new Error('このセーブは新しいゲーム版で作成されています');error.code='SAVE_FUTURE';throw error;
    }
    while(data.saveVersion<versions[kind]){
      const convert=steps[kind][data.saveVersion];
      assert(typeof convert==='function','対応するマイグレーションがありません');
      data=convert(data);
    }
    assert(typeof data.gameVersion==='string','gameVersionがありません');
    return data;
  }
  return {versions,steps,assert,json,migrate,gameVersion:'save-20260926-3'};
})();
