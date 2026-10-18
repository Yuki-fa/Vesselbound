'use strict';

// 第2回の仮設定。ディスク上の本体には触らず、実戦・次戦・山場・固定比較で
// 同じ本体関数へ同じ入力補正を渡す。空設定は元の周回JSONと完全一致させる。
let installed=false,config={},observation=null;
const copy=x=>structuredClone(x);
function boardCounts(){
  const cards=G.mainBoard.filter(Boolean),characters=cards.filter(c=>c.category==='キャラクター');
  return {cards:cards.length,characters:characters.length,enchants:cards.filter(c=>c.category==='エンチャント').length,
    ownTotal:characters.reduce((s,c)=>s+(Number(c.power)||0)+(Number(c.life)||0),0),gold:G.gold,
    rings:G.rings.filter(Boolean).length,names:cards.map(c=>c.name)};
}
function battleObservation(initial,result){
  const events=result.events,units=initial.units.p1.filter(Boolean);
  return {wave:G._wave,stage:G._waveStage,retry:!!G._waveIsRetry,openingMana:initial.resources.p1.mana,
    thresholdCarry:Number(initial._experimentThresholdCarry)||0,finalMana:result.finalState.resources.p1.mana,
    blood:result.finalState.blood?.p1||0,units:units.map(u=>({id:u.id,name:u.name,desc:u.desc||'',
      seal:coreSealValue(u),manaRepeat:!!u.manaRepeat,manaCost:u.manaCost||0,
      released:events.some(e=>e.type==='seal_release'&&e.side==='p1'&&e.unitId===u.id),
      thresholds:events.filter(e=>e.type==='mana_threshold'&&e.side==='p1'&&e.unitId===u.id).length})),
    releases:events.filter(e=>e.type==='seal_release'&&e.side==='p1').length,
    thresholds:events.filter(e=>e.type==='mana_threshold'&&e.side==='p1').length};
}
async function install(){
  const engine=require('./fixed_engine'),api=await engine.initialize();if(installed)return;installed=true;
  require('./experiment_1017b_cache').extendCacheInputs(api);
  const parseEnchant=api.parsers.enchant;
  api.parsers.enchant=card=>{
    parseEnchant(card);
    // 仮追加の「味方が熟練を得る」は接続先への無条件な熟練付与ではない。
    // 本体ファイルを変えず、Fで明示したキーワード欄を入力の正とする。
    if(config.explicitEnchantKeywords&&Array.isArray(card.keywords))card.adjacentKeywords=[...card.keywords];
    const seals=(card.keywords||[]).filter(k=>/^封印\d+$/.test(k));
    if(seals.length)card.adjacentKeywords=[...(card.adjacentKeywords||[]).filter(k=>!/^封印\d+$/.test(k)),...seals];
  };
  const generate=generateEliteEnemies,create=_createPveCoreState,progress=coreManaThresholdProgress,
    price=towerBoonPrice,next=_startWaveFlowNext,victory=finishWaveBattleVictory;
  generateEliteEnemies=(...args)=>{
    const enemies=generate(...args),mul=config.eliteStatMultiplier??1;
    if(mul!==1)for(const e of enemies.filter(Boolean))for(const key of ['atk','hp','maxHp','baseAtk','baseMaxHp'])
      if(Number.isFinite(e[key]))e[key]=Math.max(key.toLowerCase().includes('hp')?1:0,Math.round(e[key]*mul));
    return enemies;
  };
  _createPveCoreState=(...args)=>{
    const state=create(...args);
    if(config.openingMana)state.resources.p1.mana+=config.openingMana;
    if(config.thresholdCarry)state._experimentThresholdCarry=Number(G._experimentCarryMana)||0;
    return state;
  };
  coreManaThresholdProgress=(state,side,t,unit)=>{
    const carry=side==='p1'&&t?.repeat&&unit?._manaThresholdBaseline===undefined
      ?Number(state?._experimentThresholdCarry)||0:0;
    if(!carry)return progress(state,side,t,unit);
    return progress({...state,resources:{...state.resources,[side]:{...state.resources[side],mana:state.resources[side].mana+carry}}},side,t,unit);
  };
  towerBoonPrice=n=>Number(n)===0&&config.firstBoonPrice!==undefined?config.firstBoonPrice:price(n);
  // fixed_worker の採取経路と同じ高速受け口。表示フレーム以外は本体と一致する。
  SaveRun.computeBattle=(initial,seed,options)=>{
    const result=engine.fastCompute(initial,seed,options);
    if(!G._botProbe&&observation){
      observation.battles.push(battleObservation(initial,result));
      if(config.thresholdCarry)G._experimentCarryMana=(Number(G._experimentCarryMana)||0)+Math.max(0,result.finalState.resources.p1.mana);
    }
    return result;
  };
  _startWaveFlowNext=(...args)=>{
    if(!G._botProbe&&observation&&G._isVillageMenu&&G._isWaveAltar&&G._wave>0)
      observation.stageEnds[G._wave]={wave:G._wave,point:'altar_departure',...boardCounts()};
    return next(...args);
  };
  finishWaveBattleVictory=(...args)=>{
    const wave=G._wave,boss=G._waveBattleType==='boss',answer=victory(...args);
    if(!G._botProbe&&observation&&boss&&answer)
      observation.bossEnds[wave]={wave,point:'boss_victory',...boardCounts()};
    return answer;
  };
}
function begin(settings={}){config=copy(settings);observation={stageEnds:{},bossEnds:{},battles:[]};}
function end(){
  if(G._botEnded?.clear&&G._wave>0)observation.stageEnds[G._wave]={wave:G._wave,point:'clear_altar',...boardCounts()};
  const result=observation;observation=null;config={};return result;
}
function configure(settings={}){config=copy(settings);observation=null;}
module.exports={install,begin,end,configure,battleObservation,boardCounts};
