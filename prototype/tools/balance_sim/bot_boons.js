'use strict';
const {placement,score}=require('./policies'),lookahead=require('./lookahead');
const SETTINGS=Object.fromEntries(['greedy','color','enchant','mana','lookahead','planner'].map(policy=>
  [policy,{reserve:300,maxShopRerolls:1}]));
const LIMITS={weakGain:12,maxRerollsPerReward:3,maxPaidRerollsPerReward:1};
function canFund(policy){
  return towerBoonState().rerolls>0||G.gold>=SHOP_REROLL_COST+SETTINGS[policy].reserve;
}
function paymentBefore(){return {goldBefore:G.gold,remainingBefore:towerBoonState().rerolls};}
function paymentAfter(before,policy){return {...before,goldAfter:G.gold,remainingAfter:towerBoonState().rerolls,
  payment:before.remainingBefore>0?'right':'gold',reserve:SETTINGS[policy].reserve};}
function acceptLevelReward(policy,record){
  if(!runLevelRewardActive()) return false;
  const reward=runLevelState().reward;
  record({type:'level_reward',id:reward.id,gains:clone(reward.gains),before:clone(reward.before),after:clone(reward.after),
    rerolled:false,history:[clone(reward)]});
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
  let paid=0;
  for(let i=0;i<LIMITS.maxRerollsPerReward;i++){
    if(runLevelRewardActive()||shopRerollKind()||!towerBoonCanReroll()||!canFund(policy)
      ||(!towerBoonState().rerolls&&paid>=LIMITS.maxPaidRerollsPerReward)||!_rewCards.some(c=>c?._isOriginalReward))break;
    const q=await quality(policy,ctx);if(!q.weak)break;
    const before=_rewCards.filter(Boolean).map(c=>c.name),balance=paymentBefore();
    recordOffers(_rewCards,'reward:reroll_before');
    if(!towerBoonRerollRewards())throw Error('再抽選の本体条件を満たしたのに実行できない');
    if(!balance.remainingBefore)paid++;
    record({type:'boon_reroll',kind:'reward',before,after:_rewCards.filter(Boolean).map(c=>c.name),
      ...paymentAfter(balance,policy),quality:q,reason:'既存の候補評価で改善が小さい通常報酬を引き直す'});
  }
}
module.exports={SETTINGS,LIMITS,acceptLevelReward,rerollShop,quality,rerollIfWeak};
