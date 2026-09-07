// バージョンごとの変換はここへ追加する。runとprofileは別々に進化できる。
const SaveMigrations=(()=>{
  const versions={run:2,profile:1};
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
      }
    },
    profile:{}
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
  return {versions,steps,assert,json,migrate,gameVersion:'save-20260907-2'};
})();
