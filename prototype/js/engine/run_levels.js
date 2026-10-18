// PvEのラン進行。数値への適用はcore.js、編成への接続はformation.jsに集約する。
// シート未収録の今回の追加仕様の文言・調整値はこの表を使う。
const RUN_LEVEL_CONFIG = {
  names: { stats:'戦闘力レベル', familiars:'眷属レベル', modifiers:'戦闘修正レベル', damage:'効果威力レベル' },
  repeatWeight:0.4, tradeoffStage:2, title:'レベル報酬',
};
function runLevelInitialState(){
  return { values:coreNormalizeRunLevels(), counts:{}, previous:null, seq:0, lastBattleKey:null, reward:null };
}
function runLevelState(){ return G.runLevels || (G.runLevels=runLevelInitialState()); }
function runLevelBattleValues(){
  return coreNormalizeRunLevels(G._onlineMode?null:runLevelState().values);
}
function runLevelBattleCard(card){ return coreApplyCardRunLevels(card,runLevelBattleValues()); }
function runLevelCoreFields(){
  const values=runLevelBattleValues();
  return Object.values(values).some(n=>n>1)?{runLevels:{p1:values}}:{};
}
function runLevelCandidates(stage, state){
  const s=state||runLevelState(), kinds=Object.keys(RUN_LEVEL_CONFIG.names);
  return [1,...(Number(stage)>=RUN_LEVEL_CONFIG.tradeoffStage?[2]:[])].flatMap(amount=>kinds.map(kind=>{
    const id=`${kind}:${amount}`, n=Math.max(0,Number(s.counts[id])||0);
    return {id,kind,amount,weight:Math.pow(RUN_LEVEL_CONFIG.repeatWeight,n)};
  })).filter(c=>c.id!==s.previous);
}
function runLevelRollReward(stage, before, options){
  const state=runLevelState(), seq=state.seq++;
  const result=runWithKeyedRandom(`run-level:${G._wave}:${G._waveStage}:${Number(G._waveDefeatCount)||0}:${seq}`,()=>{
    const pool=runLevelCandidates(stage,state), max=Math.max(...pool.map(c=>c.weight));
    // 共通因子で割っておくと長いランでも重みの合計が0へ潰れにくい。
    let point=rand()*pool.reduce((sum,c)=>sum+c.weight/max,0);
    const choice=pool.find(c=>(point-=c.weight/max)<0)||pool[pool.length-1];
    const values=coreNormalizeRunLevels(before);
    values[choice.kind]+=choice.amount;
    const lower=choice.amount===2?Object.keys(values).filter(k=>k!==choice.kind&&values[k]>=2):[];
    const lowered=lower.length?randFrom(lower):null;
    if(lowered) values[lowered]--;
    return {...choice,lowered,before:coreNormalizeRunLevels(before),after:values,active:true};
  });
  state.counts[result.id]=(state.counts[result.id]||0)+1;
  state.previous=result.id;
  if(!(options&&options.deferApply)) state.values={...result.after};
  state.reward=result;
  return result;
}
function runLevelRewardActive(){ return !!(!G._onlineMode&&G.runLevels&&G.runLevels.reward&&G.runLevels.reward.active); }
function runLevelOpenVictoryReward(type, intro){
  if(G._onlineMode||G._testBattleMode||G._libraryTestBattleMode||G._arenaActive||!['elite','boss'].includes(type)) return false;
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
function runLevelRerollReward(){
  const state=runLevelState(),rights=towerBoonState();
  if(!runLevelRewardActive()||!towerBoonCanReroll()||rights.rerolls<=0) return false;
  rights.rerolls--;rights.rerollSeq++;
  // 前の上昇・下降を取り消し、同じ報酬前のレベルから置き換える。提示履歴は戻さない。
  runLevelRollReward(Number(G._wave)||1,state.reward.before);
  _storeRewardStartSnapshot();
  renderRewCards();renderHandEditor();renderFieldEditor();renderMoveSlotsInEnemy();
  if(typeof SaveRun!=='undefined') SaveRun.checkpoint('reward');
  return true;
}
function runLevelRenderReward(row){
  const reward=runLevelState().reward;
  const host=document.createElement('div');host.className='run-level-reward';
  const heading=document.createElement('div');heading.className='run-level-result';
  heading.textContent=`${RUN_LEVEL_CONFIG.names[reward.kind]} +${reward.amount}`;
  const detail=document.createElement('div');
  detail.textContent=reward.lowered?`${RUN_LEVEL_CONFIG.names[reward.lowered]} −1`:'他のレベルの低下なし';
  const values=document.createElement('div');values.className='run-level-values';
  values.textContent=Object.entries(RUN_LEVEL_CONFIG.names).map(([key,name])=>`${name} ${reward.before[key]} → ${reward.after[key]}`).join('　／　');
  host.appendChild(heading);host.appendChild(detail);host.appendChild(values);row.appendChild(host);
}
