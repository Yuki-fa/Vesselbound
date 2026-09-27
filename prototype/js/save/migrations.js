// バージョンごとの変換はここへ追加する。runとprofileは別々に進化できる。
const SaveMigrations=(()=>{
  const versions={run:4,profile:3};
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
  const replaceLegacyCardRingText=value=>String(value)
    .replace(/\bE015\b/g,'E014')
    .replace(/\bR043\b/g,'R042')
    .split('panel_triple_attack').join('panel_double_attack');
  const catalogCodes=value=>[value&&value.no,value&&value.No,value&&value['No.'],value&&value.artCode,
    value&&value.imageNo,value&&value.code].map(x=>String(x||'').trim().toUpperCase()).filter(Boolean);
  const isLegacyTripleAttack=value=>{
    if(!value||typeof value!=='object'||Array.isArray(value)) return false;
    const codes=catalogCodes(value);
    const enchant=['エンチャント','強化'].includes(String(value.category||''));
    return String(value.id||'')==='panel_triple_attack'||codes.includes('E015')
      ||(enchant&&codes.includes('015'))||(enchant&&String(value.name||'')==='三段攻撃');
  };
  const isLegacyCurseRing=value=>{
    if(!value||typeof value!=='object'||Array.isArray(value)) return false;
    const codes=catalogCodes(value);
    const ring=String(value.type||'')==='ring'||String(value.name||'')==='呪いの指輪';
    return ring&&(codes.includes('R043')||codes.includes('043')||String(value.name||'')==='呪いの指輪');
  };
  const normalizeMergedMultiAttack=value=>{
    const adjacent=(Array.isArray(value.adjacentKeywords)?value.adjacentKeywords:[])
      .filter(keyword=>!['二段攻撃','三段攻撃'].includes(String(keyword||'').trim()));
    adjacent.push('三段攻撃');
    const mergedForm={
      desc:'',keywords:[],adjacentKeywords:['三段攻撃'],adjacentAtkBonus:0,adjacentHpBonus:0,
      manaOnAttack:null,manaOnInjury:null,manaOnDeath:null,goldOnBattleEnd:null,goldOnDeath:null,
      randomItemOnBattleEnd:null,manaCost:null,manaRepeat:null,summonCount:null,
      _manaThresholdDesc:null,releaseAtkBonus:null,releaseHpBonus:null
    };
    const out={...value,id:'panel_double_attack',no:'E014',No:'E014','No.':'E014',artCode:'E014',
      imageNo:'E014',name:'多段攻撃',category:'エンチャント',type:'panel',kind:'panel',panelScope:'unit',
      desc:'',adjacentKeywords:adjacent,adjacentAtkBonus:0,adjacentHpBonus:0,rarity:3,grade:1,
      directions:['up','right','down','left'],directionCount:4,_tripleMerged:true,
      _tripleBaseName:'多段攻撃',_displayName:'多段攻撃+',_mergedFormApplied:true,
      _sheetSeen:true,_implemented:true,initial:false,mergedForm,
      _mergedSource:{desc:'',keywords:'三段攻撃',sheetKeywords:['二段攻撃']}};
    delete out._rewardExcluded;delete out._shopExcluded;
    return out;
  };
  const normalizeCurseRing=value=>({...value,id:'ring_呪いの指輪',name:'呪いの指輪',type:'ring',kind:'passive',
    no:'R042',No:'R042','No.':'R042',artCode:'R042',imageNo:'R042',
    desc:'開戦：全ての敵は+5/+5を得る。'});
  const rewriteLegacyCardRingIds=value=>{
    if(typeof value==='string') return replaceLegacyCardRingText(value);
    if(Array.isArray(value)) return value.map(rewriteLegacyCardRingIds);
    if(!value||typeof value!=='object') return value;
    const triple=isLegacyTripleAttack(value),curse=isLegacyCurseRing(value);
    const out={};
    for(const [key,item] of Object.entries(value)){
      const nextKey=replaceLegacyCardRingText(key);
      const nextValue=rewriteLegacyCardRingIds(item);
      const current=out[nextKey];
      if(current&&nextValue&&typeof current==='object'&&typeof nextValue==='object'
          &&['seen','acquired'].some(k=>k in current||k in nextValue)){
        out[nextKey]={...current,...nextValue,
          seen:!!(current.seen||nextValue.seen),acquired:!!(current.acquired||nextValue.acquired)};
      }else out[nextKey]=nextValue;
    }
    if(triple) return normalizeMergedMultiAttack(out);
    if(curse) return normalizeCurseRing(out);
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
      2:data=>({...rewriteLegacyNpcIds(data),saveVersion:3}),
      // 廃止E015はE014の合体版へ、旧R043（呪いの指輪）は新R042へ移す。
      3:data=>({...rewriteLegacyCardRingIds(data),saveVersion:4})
    },
    profile:{
      // コレクションキー（NPC001等）も新しいBC番号へ統合する。
      1:data=>({...rewriteLegacyNpcIds(data),saveVersion:2}),
      // 新旧キーが併存する場合、seen/acquiredをOR結合して取得履歴を失わない。
      2:data=>({...rewriteLegacyCardRingIds(data),saveVersion:3})
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
  return {versions,steps,assert,json,migrate,gameVersion:'save-20260926-4'};
})();
if(typeof module!=='undefined'&&module.exports) module.exports=SaveMigrations;
