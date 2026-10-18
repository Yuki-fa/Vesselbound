'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {placement,score}=require('./policies'),lookahead=require('./lookahead'),{nextBattle}=require('./bot_sandbox');
const SETTINGS={
  greedy:{priority:['stats','damage','rerolls','modifiers','familiars','bosses','mana'],reserve:80,maxPerVisit:2},
  color:{priority:['stats','modifiers','bosses','damage','familiars','rerolls','mana'],reserve:80,maxPerVisit:2},
  enchant:{priority:['damage','modifiers','rerolls','familiars','stats','mana','bosses'],reserve:80,maxPerVisit:2},
  mana:{priority:['mana','familiars','bosses','stats','modifiers','damage','rerolls'],reserve:80,maxPerVisit:2},
  lookahead:{reserve:80,maxPerVisit:2},
  planner:{reserve:80,maxPerVisit:2},
};
const LIMITS={weakGain:12,maxRerollsPerReward:3,bossValueFactor:.25,rerollValueFactor:.5};
let measured;
function measuredValues(){
  if(measured)return measured;
  const file=path.join(__dirname,'fixed/boon_values.json'),data=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const relative of ['js/battle/core.js','js/battle/formation.js','js/engine/tower_boon.js']){
    const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../..',relative))).digest('hex');
    if(hash!==data.sourceHashes[relative])throw Error('祝福の固定評価が本体の版と異なる。fixed_boons.jsを先に実行する: '+relative);
  }
  measured={values:data.values,sourceHashes:data.sourceHashes,boardFiles:data.boardFiles};return measured;
}
function value(policy,id){
  const state=towerBoonState(),count=state.counts[id]||0,setting=SETTINGS[policy];
  if(policy!=='lookahead')return (setting.priority.length-setting.priority.indexOf(id))/(1+count);
  const values=measuredValues().values,best=Math.max(0,...Object.values(values));
  const v=id==='bosses'?(state.defeatedBosses.length?best*LIMITS.bossValueFactor:0):id==='rerolls'?best*LIMITS.rerollValueFactor:Math.max(0,values[id]||0);
  return v/(1+count);
}
async function visit(policy,record,ctx={color:'',policy}){
  const setting=SETTINGS[policy];openTowerBoonSeat();
  const choices=_towerBoonChoices.slice();
  const prices=Object.fromEntries(choices.map(id=>[id,towerBoonChoicePrice(id)]));
  record({type:'boon_visit',choices,prices,gold:G.gold,reserve:setting.reserve,nextPrice:Math.min(...Object.values(prices))});
  if(!nextBattle())return;
  for(let i=0;i<setting.maxPerVisit;i++){
    const state=towerBoonState(),affordable=choices.filter(id=>G.gold-towerBoonChoicePrice(id)>=setting.reserve);
    if(!affordable.length)break;
    const chosen=policy==='planner'?await lookahead.chooseBoon(ctx,affordable):null;
    const ranked=policy==='planner'?[]:affordable.map(id=>({id,value:value(policy,id)})).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
    const best=policy==='planner'?(chosen?.action?{id:chosen.action.boon,value:chosen.value.total-chosen.baseline.total}:null):ranked[0];if(!best||best.value<=0)break;
    const gold=G.gold,price=towerBoonChoicePrice(best.id);if(!towerBoonChoose(best.id))throw Error('本体の祝福購入が実行できない');
    record({type:'boon_purchase',id:best.id,choices,price,purchaseNumber:state.purchases,goldBefore:gold,goldAfter:G.gold,reserve:setting.reserve,value:best.value,counts:{...state.counts},...(policy==='planner'?{forecast:chosen.value,baseline:chosen.baseline,horizonDecision:chosen.horizonDecision}: {})});
  }
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
    if(!towerBoonCanReroll()||towerBoonState().rerolls<=0||!_rewCards.some(c=>c?._isOriginalReward))break;
    const q=await quality(policy,ctx);if(!q.weak)break;
    const before=_rewCards.filter(Boolean).map(c=>c.name),balance=towerBoonState().rerolls;
    recordOffers(_rewCards,'reward:reroll_before');
    if(!towerBoonRerollRewards())throw Error('再抽選の本体条件を満たしたのに実行できない');
    record({type:'boon_reroll',before,after:_rewCards.filter(Boolean).map(c=>c.name),remainingBefore:balance,remainingAfter:towerBoonState().rerolls,quality:q});
  }
}
module.exports={SETTINGS,LIMITS,measuredValues,value,visit,quality,rerollIfWeak};
