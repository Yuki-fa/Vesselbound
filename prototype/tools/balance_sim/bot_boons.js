'use strict';
const {placement,score}=require('./policies'),lookahead=require('./lookahead');
const SETTINGS=Object.fromEntries(['greedy','color','enchant','mana','lookahead','planner'].map(policy=>
  [policy,{reserve:300,maxShopRerolls:1,rerollLevels:false}]));
const LIMITS={weakGain:12,maxRerollsPerReward:3};
// レベル報酬は引き直さず受け取る。既存の権利はカード報酬と店に温存する。
function acceptLevelReward(policy,record){
  if(!runLevelRewardActive()) return false;
  const reward=runLevelState().reward;
  record({type:'level_reward',id:reward.id,lowered:reward.lowered,before:clone(reward.before),after:clone(reward.after),rerolled:false});
  return true;
}
function rerollShop(policy,record){
  const setting=SETTINGS[policy];
  if(!shopCanReroll()||(!towerBoonState().rerolls&&G.gold<SHOP_REROLL_COST+setting.reserve))return false;
  const gold=G.gold,rights=towerBoonState().rerolls,kind=shopRerollKind();
  if(!shopRerollOffers())throw Error('条件を満たした店の再抽選を実行できない');
  record({type:'shop_reroll',kind,goldBefore:gold,goldAfter:G.gold,remainingBefore:rights,
    remainingAfter:towerBoonState().rerolls,reserve:setting.reserve});
  return true;
}
async function quality(policy,ctx){
  if(['lookahead','planner'].includes(policy)){
    const choice=await lookahead.chooseCard(ctx);
    return {weak:!choice?.action||(policy==='planner'?choice.value.total-choice.baseline.total<require('./planner').LIMITS.rerollGain:lookahead.evaluateCompare(choice.value,choice.baseline)<=0),forecast:choice?.value,baseline:choice?.baseline};
  }
  let gain=0;
  for(const card of _rewCards.filter(Boolean)){
    const pick=card.type==='consumable'?(_ensureItemSlots().some(c=>!c)?{gain:score(policy,card,ctx)*.6}:null):placement(policy,card,ctx);
    if(pick)gain=Math.max(gain,pick.gain);
  }
  return {weak:gain<LIMITS.weakGain,gain};
}
async function rerollIfWeak(policy,ctx,{record,recordOffers}){
  for(let i=0;i<LIMITS.maxRerollsPerReward;i++){
    if(runLevelRewardActive()||shopRerollKind()||!towerBoonCanReroll()||towerBoonState().rerolls<=0||!_rewCards.some(c=>c?._isOriginalReward))break;
    const q=await quality(policy,ctx);if(!q.weak)break;
    const before=_rewCards.filter(Boolean).map(c=>c.name),balance=towerBoonState().rerolls;
    recordOffers(_rewCards,'reward:reroll_before');
    if(!towerBoonRerollRewards())throw Error('再抽選の本体条件を満たしたのに実行できない');
    record({type:'boon_reroll',before,after:_rewCards.filter(Boolean).map(c=>c.name),remainingBefore:balance,remainingAfter:towerBoonState().rerolls,quality:q});
  }
}
module.exports={SETTINGS,LIMITS,acceptLevelReward,rerollShop,quality,rerollIfWeak};
