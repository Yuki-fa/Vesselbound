'use strict';

const {isolated,nextBattle,enemySamples,trial,hash}=require('./bot_sandbox');
const {layoutScore,score,exchangeChoices,sacrificePlans,arrange:basicArrange}=require('./policies');
const {useItems}=require('./bot_items');

const DEFAULTS={samples:3,cardCandidates:5,placements:1,swapCandidates:5,arrangePasses:2,ringPlans:3,layoutCandidates:4};
const stats={decisions:0,trials:0,candidates:0,cacheHits:0};
const cache=new Map();
let takeRing=()=>false;
function configure({ring,limits={}}={}) {if(ring)takeRing=ring;Object.assign(DEFAULTS,limits);}
function immediateCompare(a,b) {for(const key of ['win','hp','damage'])if(Math.abs(a[key]-b[key])>1e-8)return a[key]>b[key]?1:-1;return 0;}
function compare(a,b) {return a.total!==undefined&&b.total!==undefined?(Math.abs(a.total-b.total)>1e-8?Math.sign(a.total-b.total):0):immediateCompare(a,b);}
const rankPolicy=context=>context.policy==='planner'?'planner':'greedy';
function swap(a,b) {
  const unit=_getPartyBoardUnit(),board=unit.boardCards;
  if(board[a]&&!_canCardUseBoardSlot(board[a],b,unit)||board[b]&&!_canCardUseBoardSlot(board[b],a,unit))return false;
  const next=board.slice();[next[a],next[b]]=[next[b],next[a]];
  if(!_canApplyBoardChange(unit,next))return false;
  [board[a],board[b]]=[board[b],board[a]];_syncUnitPanelEffectsAfterMove(unit);return true;
}
function apply(action) {
  if(action.boon!==undefined&&!towerBoonChoose(action.boon))return false;
  if(action.exchange&&!exchangeShopCard(action.exchange.index,action.exchange.slot))return false;
  if(action.index!==undefined) {
    const card=_rewCards[action.index];if(!card)return false;
    takeRewCard(action.index,action.slot);
    if(_rewCards[action.index]===card||G._pendingPanelPlacement)return false;
  }
  for(const [a,b] of action.swaps||[])if(!swap(a,b))return false;
  if(action.ring!==undefined){for(const slot of action.sacrifice)_discardBoardCardForRingOffer(slot,G.mainBoard[slot]);if(!takeRing(action.ring,action.replaceRing))return false;}
  return true;
}

async function decision(context,callback) {
  const target=nextBattle();if(!target)return null;
  const samples=await enemySamples(target,DEFAULTS.samples);
  const planner=context.policy==='planner'?require('./planner'):null,plan=planner?.prepare(context);
  let bestImmediate=null;const evaluated=[];
  const battleKey=JSON.stringify([target,samples]);
  stats.decisions++;
  async function evaluate(action) {
    stats.candidates++;
    const value=await isolated(async()=>{
      if(!apply(action)||!boardHasDeployableCharacter(_getPartyBoardUnit()))return {win:-1,hp:0,damage:0,...(planner?{total:-1e9,immediate:-1e9,future:0}:{} )};
      const strategy=planner?.strategic(context,plan);
      await useItems(planner?'planner':'lookahead',context);
      const state=structuredClone(G);
      const key=battleKey+JSON.stringify([state.mainBoard,state.gold,state.rings,state.spellSlots,state.pendingBattleItems,state.nextBattleItems,state.mapPanelPowers,state._waveLife,state.panelPermanentBuffs,state.panelColorPermanentBuffs]);
      if(cache.has(key)){stats.cacheHits++;const point=cache.get(key);return planner?planner.evaluate(point,strategy,samples):point;}
      const result={win:0,hp:0,damage:0};
      for(const sample of samples) {
        const point=await isolated(()=>trial(target,sample),{state,seed:sample.seed});stats.trials++;
        for(const field of ['win','hp','damage'])result[field]+=point[field]/samples.length;
      }
      cache.set(key,result);return planner?planner.evaluate(result,strategy,samples):result;
    },{seed:hash(`choice:${G._runSeed}:${G._wave}:${G._waveStage}`)});
    if(planner&&(!bestImmediate||immediateCompare(value,bestImmediate.value)>0))bestImmediate={action,value,
      name:action.index!==undefined?_rewCards[action.index]?.name:action.exchange?_rewCards[action.exchange.index]?.name:action.ring!==undefined?G._ringOffer[action.ring]?.name:action.boon};
    if(planner)evaluated.push({action,value});
    return value;
  }
  let result=await callback(evaluate,target);
  if(planner&&context.plannerStage!=='r1')result=await require('./planner_horizon').rerank(context,target,evaluated,result,apply);
  if(planner&&result?.action){
    result.bestImmediate=bestImmediate;
    result.investment=immediateCompare(result.value,bestImmediate.value)<0&&result.value.immediate<bestImmediate.value.immediate-1e-6&&result.value.future>bestImmediate.value.future+1e-6;
  }
  return result;
}

function placements(card,context,shop) {
  const unit=_getPartyBoardUnit(),board=unit.boardCards,result=[];
  for(let slot=0;slot<board.length;slot++) {
    if(shop&&board[slot]&&!_mergedPanelCard(board[slot],card))continue;
    if(!_canCardUseBoardSlot(card,slot,unit))continue;
    const old=board[slot];board[slot]=card;
    const value=_canApplyBoardChange(unit,board)?layoutScore(rankPolicy(context),context):-Infinity;
    board[slot]=old;
    if(Number.isFinite(value))result.push({slot,value});
  }
  result.sort((a,b)=>b.value-a.value||a.slot-b.slot);
  // 同じ粗い評価でも前後衛・接続先が違う候補を残す。
  const selected=result.slice(0,DEFAULTS.placements);
  const rear=result.find(r=>r.slot>=10),front=result.find(r=>r.slot<10);
  for(const pick of [rear,front])if(pick&&!selected.some(r=>r.slot===pick.slot))selected.push(pick);
  return selected;
}

async function chooseCard(context,{shop=false}={}) {
  return decision(context,async evaluate=>{
    const stay=await evaluate({}),result={action:null,value:stay,baseline:stay};
    const cards=_rewCards.map((card,index)=>({card,index})).filter(x=>x.card&&!x.card._shopSalePending&&(!shop||x.card.type==='consumable'))
      .sort((a,b)=>score(rankPolicy(context),b.card,context)-score(rankPolicy(context),a.card,context)).slice(0,DEFAULTS.cardCandidates);
    for(const {card,index} of cards) {
      if(!['panel','consumable'].includes(card.type)||shop&&(card._buyPrice||0)>G.gold)continue;
      const slots=G.spellSlots||[];
      const places=card.type==='consumable'?(slots.length<4||slots.some(c=>!c)?[{slot:null}]:[]):await isolated(()=>placements(card,context,false));
      for(const place of places) {
        const action={index,slot:place.slot},value=await evaluate(action);
        const tie=compare(value,result.value)===0&&!shop&&score('greedy',card,context)>0;
        if(compare(value,result.value)>0||tie&&!result.action)Object.assign(result,{action,value});
      }
    }
    return result;
  });
}

async function chooseExchange(context) {
  const candidates=exchangeChoices(rankPolicy(context),context);
  return decision(context,async evaluate=>{
    const baseline=await evaluate({});let best={action:null,value:baseline,baseline};
    // 店3枠×占有マスの合法な交換をすべて、同じ次戦の敵サンプルで評価する。
    for(const candidate of candidates) {
      const action={exchange:{index:candidate.index,slot:candidate.slot}},value=await evaluate(action);
      if(compare(value,best.value)>0)best={action,value,baseline};
    }
    return best;
  });
}

async function chooseRing(context) {
  const groups=sacrificePlans(rankPolicy(context),context).slice(0,DEFAULTS.ringPlans);
  const replaceRing=G.rings.every(Boolean)?G.rings.map((card,index)=>({card,index}))
    .filter(x=>!(typeof questRingActionsLocked==='function'&&questRingActionsLocked(x.card)))
    .sort((a,b)=>score(rankPolicy(context),a.card,context)-score(rankPolicy(context),b.card,context))[0]?.index:undefined;
  if(G.rings.every(Boolean)&&replaceRing===undefined)return null;
  return decision(context,async evaluate=>{
    let best=null;
    for(const {sacrifice} of groups)for(let ring=0;ring<G._ringOffer.length;ring++) {
      const action={sacrifice,ring,replaceRing},value=await evaluate(action);
      // 交換は必須。交換前の戦力と比較して見送る選択肢は作らない。
      if(!best||compare(value,best.value)>0)best={action,value};
    }
    return best;
  });
}

async function arrange(context,{retry=false}={}) {
  const changes=[];
  for(let pass=0;pass<DEFAULTS.arrangePasses;pass++) {
    const chosen=await decision(context,async evaluate=>{
      const baseline=await evaluate({});let best={value:baseline,action:null};
      const candidates=await isolated(()=>{
      const candidates=[];
      for(let a=0;a<G.mainBoard.length;a++)for(let b=a+1;b<G.mainBoard.length;b++) {
        if(!G.mainBoard[a]&&!G.mainBoard[b])continue;
        if(!swap(a,b))continue;
        const rank=layoutScore(rankPolicy(context),context);swap(a,b);
        candidates.push({a,b,rank});
      }
      return candidates;
      });
      candidates.sort((a,b)=>b.rank-a.rank||a.a-b.a||a.b-b.b);
      const short=candidates.slice(0,DEFAULTS.swapCandidates);
      // 形だけ同じ粗い評価の中にもコアで試す候補を分散させる。
      for(let i=0;i<4&&candidates.length;i++) {
        const item=candidates[Math.floor((i+0.5)*candidates.length/4)];
        if(!short.includes(item))short.push(item);
      }
      // 1～2手では改善しない接続網も、基本方針が組み上げた完成盤面で比較する。
      // 粗い評価のまま採用せず、全候補と同じコア・敵サンプルで決める。
      for(const name of (context.policy==='planner'?['planner','greedy','color','enchant']:['greedy','color','enchant','mana']).slice(0,DEFAULTS.layoutCandidates)) {
        const action=await isolated(()=>{
          const before=G.mainBoard.slice();basicArrange(name,context);
          const desired=G.mainBoard.slice(),current=before.slice(),swaps=[];
          for(let i=0;i<current.length;i++)if(current[i]!==desired[i]) {
            const j=current.findIndex((card,index)=>index>i&&card===desired[i]);
            if(j<0)return {swaps:[]};
            [current[i],current[j]]=[current[j],current[i]];swaps.push([i,j]);
          }
          return {swaps};
        });
        if(action.swaps.length){const value=await evaluate(action);if(compare(value,best.value)>0)best={action,value};}
      }
      for(const c of short) {
        const action={swaps:[[c.a,c.b]]},value=await evaluate(action);
        if(compare(value,best.value)>0)best={action,value};
      }
      // 再戦で局所解に留まった時は2スワップの候補も試す。
      if((retry||baseline.win<1)&&!best.action)for(let i=0;i<Math.min(6,candidates.length-1);i++) {
        const a=candidates[i],b=candidates[(i*7+3)%candidates.length];
        const action={swaps:[[a.a,a.b],[b.a,b.b]]},value=await evaluate(action);
        if(compare(value,best.value)>0)best={action,value};
      }
      return {...best,baseline};
    });
    if(!chosen?.action)break;
    if(!apply(chosen.action))throw new Error('先読みで決めた配置が実行できない');
    changes.push(chosen);
  }
  return changes;
}

function resetStats(){cache.clear();for(const key of Object.keys(stats))stats[key]=0;}
async function chooseBoon(context,choices){return decision(context,async evaluate=>{
  const baseline=await evaluate({});let best={action:null,value:baseline,baseline};
  for(const boon of choices){const action={boon},value=await evaluate(action);if(compare(value,best.value)>0)best={action,value,baseline};}
  return best;
});}
module.exports={chooseCard,chooseRing,arrange,decision,evaluateCompare:compare,immediateCompare,apply,swap,configure,stats,resetStats,DEFAULTS,placements,chooseExchange,chooseBoon};
