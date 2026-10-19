// PvEのラン進行。数値への適用はcore.js、編成への接続はformation.jsに集約する。
// シート未収録の今回の追加仕様の文言・調整値はこの表を使う。
const RUN_LEVEL_CONFIG = {
  names: { atk:'ATKレベル', hp:'HPレベル' },
  rewards: [
    { id:'atk3', gains:{atk:3,hp:0}, probability:0.15 },
    { id:'hp3', gains:{atk:0,hp:3}, probability:0.25 },
    { id:'atk2-hp1', gains:{atk:2,hp:1}, probability:0.35 },
    { id:'atk1-hp2', gains:{atk:1,hp:2}, probability:0.25 },
  ],
  title:'レベル報酬', receivedTitle:'レベル報酬（受け取り済み）',
};
function runLevelInitialState(){
  return { version:2, values:coreNormalizeRunLevels(), seq:0, lastBattleKey:null, reward:null };
}
function runLevelNormalizeState(raw){
  const state={...runLevelInitialState(),values:coreNormalizeRunLevels(raw&&raw.values),
    seq:Math.max(0,Math.floor(Number(raw&&raw.seq)||0)),lastBattleKey:raw&&raw.lastBattleKey||null};
  const reward=raw&&raw.reward;
  if(reward){
    // 旧4レベルの表示中報酬は既にvaluesへ適用済み。再抽選・再加算せず、
    // 受領確認だけ残して、進む時のエリート／ボス後処理を従来の入口へ通す。
    state.reward=raw.version===2?{...reward,gains:{...reward.gains},
      before:coreNormalizeRunLevels(reward.before),after:coreNormalizeRunLevels(reward.after)}
      :{id:'legacy-received',gains:{atk:0,hp:0},before:{...state.values},after:{...state.values},
        received:true,active:!!reward.active};
  }
  return state;
}
function runLevelState(){
  if(!G.runLevels||G.runLevels.version!==2) G.runLevels=runLevelNormalizeState(G.runLevels);
  return G.runLevels;
}
function runLevelBattleValues(){
  return coreNormalizeRunLevels(G._onlineMode?null:runLevelState().values);
}
function runLevelBattleCard(card,options){ return coreApplyCardRunLevels(card,runLevelBattleValues(),options); }
// 表示する場所ではなく所有側で決める。敵枠を使う味方（取得したボス・奪った体）も自軍。
function runLevelDisplayValues(card,owner){
  const enemy=c=>c&&(c.side==='p2'||c._sheetEnemy||(G.enemies||[]).includes(c));
  return enemy(owner)||enemy(card)?coreNormalizeRunLevels():runLevelBattleValues();
}
function runLevelDisplayCard(card,owner){
  if(!card) return card;
  if(String(card.category||'')!=='キャラクター') return card;
  if(owner&&coreRunLevelIsFamiliar(owner)) return card;
  return coreApplyCardRunLevels(card,runLevelDisplayValues(card,owner));
}
function runLevelCoreFields(){
  const values=runLevelBattleValues();
  return Object.values(values).some(n=>n>1)?{runLevels:{p1:values}}:{};
}
function runLevelRollReward(stage, before, options){
  const state=runLevelState(),seq=state.seq++;
  const result=runWithKeyedRandom(`run-level:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}:${seq}`,()=>{
    let point=rand();
    const pool=RUN_LEVEL_CONFIG.rewards;
    const choice=pool.find(c=>(point-=c.probability)<0)||pool[pool.length-1];
    const previous=coreNormalizeRunLevels(before),after={...previous};
    Object.keys(RUN_LEVEL_CONFIG.names).forEach(kind=>{after[kind]+=choice.gains[kind];});
    return {id:choice.id,gains:{...choice.gains},before:previous,after,active:true};
  });
  if(!(options&&options.deferApply)) state.values={...result.after};
  state.reward=result;
  return result;
}
function runLevelRewardActive(){ return !!(!G._onlineMode&&runLevelState().reward&&runLevelState().reward.active); }
function runLevelOpenVictoryReward(type, intro){
  if(G._onlineMode||G._testBattleMode||G._libraryTestBattleMode||G._arenaActive||!['elite','boss'].includes(type)) return false;
  // 最終決戦の2連戦（エピトメ戦・伏せられたラスボス戦）ではレベル報酬を出さない（2026-10-19 利用者指定）。
  if(typeof isEpitomeVictoryBattle==='function'&&isEpitomeVictoryBattle()) return false;
  if(typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()) return false;
  const state=runLevelState(),key=`${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}:${type}`;
  if(state.lastBattleKey===key) return runLevelRewardActive();
  state.lastBattleKey=key;
  const reward=runLevelRollReward(Number(G._wave)||1,state.values,{deferApply:true});
  const open=()=>{
    // 帰滅のHPなど、今回の戦闘の書き戻しには出撃時のレベルを使う。
    if(typeof _cleanupBattleEndTransientUnits==='function') _cleanupBattleEndTransientUnits();
    state.values={...reward.after};
    G.enemies=[];G.phase=null;
    goToReward({checkpoint:true,noNewRewards:true});
  };
  if(intro) showVictoryOverlay(open);else open();
  return true;
}
function runLevelContinueReward(){
  if(!runLevelRewardActive()) return false;
  runLevelState().reward.active=false;
  return finishWaveBattleVictory(false);
}
function runLevelRenderReward(row){
  const reward=runLevelState().reward;
  const host=document.createElement('div');host.className='run-level-reward';
  const heading=document.createElement('div');heading.className='run-level-result';
  heading.textContent=reward.received?RUN_LEVEL_CONFIG.receivedTitle:Object.entries(RUN_LEVEL_CONFIG.names)
    .filter(([key])=>reward.gains[key]>0).map(([key,name])=>`${name} +${reward.gains[key]}`).join('・');
  const values=document.createElement('div');values.className='run-level-values';
  values.textContent=Object.entries(RUN_LEVEL_CONFIG.names).map(([key,name])=>
    reward.received?`${name} ${reward.after[key]}`:`${name} ${reward.before[key]} → ${reward.after[key]}`).join(' ／ ');
  host.appendChild(heading);host.appendChild(values);row.appendChild(host);
}
