'use strict';

const synergy=require('./synergy');
const {ARCHETYPES,COLORS,extract}=synergy;
const LIMITS={win:240,emergencyWin:400,hp:40,damage:4,fit:.6,option:1.2,focus:.5,prior:.3,
  reserveWeight:.22,itemWeight:.35,acquireRate:.35,exchangeRate:.55,reachDiscount:.88,distanceDiscount:.97,
  preferenceMemory:.55,rerollGain:.8};
const R1_WEIGHTS={...LIMITS};
const R2_DEFAULTS={...R1_WEIGHTS,next:1,wall:180,wallHp:20,wallProgress:16,distanceDecay:.5};
function weights(stage='r2',custom){
  if(stage==='r1')return {...R1_WEIGHTS,...custom};
  const saved=custom||require('./planner_weights.json').weights;
  return {...R2_DEFAULTS,...saved};
}
function configure(stage,custom){
  for(const key of Object.keys(LIMITS))delete LIMITS[key];
  Object.assign(LIMITS,weights(stage,custom));
}
const round=x=>Number(x.toFixed(6));
const tokenFamily=t=>ARCHETYPES.find(a=>a.tokens.includes(t))?.id||'keywords';
function empty(){return Object.fromEntries(ARCHETYPES.map(a=>[a.id,0]));}

// 全て本体の配置・接続を参照。未接続の強化や予備は小さな将来資産として扱う。
function entries(){
  const unit=_getPartyBoardUnit(),board=unit.boardCards,deploy=formationDeploySlots(unit);
  const hosts=new Map(board.map((c,i)=>[i,[]]));
  const active=deploy.filter(d=>board[d.idx]?.category==='キャラクター').map(d=>d.idx);
  for(const idx of active){
    hosts.get(idx).push(idx);
    for(const link of _collectEnhancementPanelsForSlot(unit,idx))if(hosts.has(link.idx))hosts.get(link.idx).push(idx);
  }
  const result=board.map((card,slot)=>card?{card,key:'board:'+slot,slot,hosts:hosts.get(slot),weight:hosts.get(slot).length?1:LIMITS.reserveWeight}:null).filter(Boolean);
  for(const [i,card] of G.rings.entries())if(card)result.push({card,key:'ring:'+i,hosts:active.slice(),weight:1});
  for(const [i,card] of (G.spellSlots||[]).entries())if(card)result.push({card,key:'item:'+i,hosts:active.slice(),weight:LIMITS.itemWeight});
  for(const entry of result){
    const role=extract(entry.card);entry.role={...role,produces:{...role.produces},consumes:{...role.consumes}};
    if(entry.role.consumes['color:self']){
      delete entry.role.consumes['color:self'];
      for(const idx of entry.hosts)if(COLORS.includes(board[idx]?.color))entry.role.consumes['color:'+board[idx].color]=.9;
    }
  }
  return result;
}
function analyzeEntries(list){
  const produced={},consumed={},raw=empty(),pairs=[];
  for(const e of list)for(const [field,target] of [['produces',produced],['consumes',consumed]])for(const [t,v] of Object.entries(e.role[field]))target[t]=(target[t]||0)+v*e.weight;
  for(const consumer of list)for(const [token,need] of Object.entries(consumer.role.consumes))for(const producer of list){
    const supply=producer.role.produces[token]||0;if(!supply||consumer.key===producer.key)continue;
    if(consumer.role.local.includes(token)&&!producer.role.global?.includes(token)&&!consumer.hosts.some(h=>producer.hosts.includes(h)))continue;
    const strength=Math.min(supply,need)*consumer.weight*producer.weight;
    if(strength<.1)continue;
    const type=tokenFamily(token);raw[type]+=strength;
    if(strength>=.45)pairs.push({type,token,producer:producer.card.name,consumer:consumer.card.name,producerKey:producer.key,consumerKey:consumer.key,strength:round(strength),
      active:producer.weight===1&&consumer.weight===1});
  }
  const completed=ARCHETYPES.filter(a=>pairs.some(p=>p.active&&p.type===a.id&&p.strength>=.65&&
    // 普通の被弾・死亡・攻撃だけでは型の完成としない。
    !['atkBuff','hpBuff','enchant','openingEffect'].includes(p.token))).map(a=>a.id);
  return {produced,consumed,raw,pairs,completed};
}
function describe(){const model=analyzeEntries(entries());return {completed:model.completed,pairs:model.pairs,readiness:Object.fromEntries(Object.entries(model.raw).map(([k,v])=>[k,round(v)]))};}

// _rewardWeightedPickの確率分解。枠の重み・グレード振分け・序盤制限は本体の関数を呼ぶ。
// 重複不可、封印上限、高レア上限、キャラ/強化保証は独立近似（説明はPLANNER.md）。
function distribution(pool,wave,stage,{mapProgress=true}={}){
  if(!pool.length)return [];
  const saved=G;
  try{
    G={...saved,_wave:wave,_waveStage:stage};
    const buckets=_rewardGradeBuckets(pool,wave),gradeWeights=_rewardGradeWeights(buckets,wave),rw=_rewardRarityWeights(mapProgress,mapProgress);
    const total=Object.values(rw).reduce((s,v)=>s+v,0),prob=new Map();
    const add=(cards,mass)=>{for(const card of cards)prob.set(card,(prob.get(card)||0)+mass/cards.length);};
    for(let rarity=1;rarity<=5;rarity++){
      const mass=(rw[rarity]||0)/total;if(!mass)continue;
      const narrowed=buckets.map(b=>b.filter(c=>_rewardRarityOf(c)===rarity));
      const norm=gradeWeights.reduce((s,w,i)=>s+(narrowed[i].length?w:0),0);
      if(norm){for(let i=0;i<buckets.length;i++)if(narrowed[i].length&&gradeWeights[i])add(narrowed[i],mass*gradeWeights[i]/norm);}
      else{
        const sum=gradeWeights.reduce((s,w)=>s+w,0);
        for(let i=0;i<buckets.length;i++)if(gradeWeights[i]&&buckets[i].length){
          const closest=[...buckets[i]].sort((a,b)=>Math.abs(_rewardRarityOf(a)-rarity)-Math.abs(_rewardRarityOf(b)-rarity)||_rewardRarityOf(a)-_rewardRarityOf(b))[0];
          add(buckets[i].filter(c=>_rewardRarityOf(c)===_rewardRarityOf(closest)),mass*gradeWeights[i]/sum);
        }
      }
    }
    return [...prob].map(([card,p])=>({card,p}));
  }finally{G=saved;}
}
function futureNodes({stage:plannerStage='r1'}={}){
  if(plannerStage==='r2'){
    const next=require('./bot_sandbox').nextBattle(),result=[];if(!next)return result;
    for(let wave=next.wave;wave<=4;wave++)for(const [i,type] of _waveRouteForWave(wave).entries()){
      if(wave===next.wave&&i+1<next.stage)continue;
      // 本体は通常戦だけで5択報酬を出す。抽選は勝利後のstageで行う。
      if(type==='battle')result.push({wave,stage:i+2,type:'battle'});
      if(type==='city')result.push({wave,stage:i+1,type});
    }
    return result;
  }
  const result=[],wave=Math.max(1,Number(G._wave)||1),stage=Number(G._waveStage)||0;
  for(let w=wave;w<=4;w++)for(const [i,type] of _waveRouteForWave(w).entries()){
    if(w===wave&&i+1<=stage)continue;
    if(['battle','elite','boss','city'].includes(type))result.push({wave:w,stage:i+1,type});
  }
  return result;
}
function forecast(options){
  const nodes=futureNodes(options),logs={produces:{},consumes:{}},expected=[],wave=Math.max(1,Number(G._wave)||1);
  const pool=PANEL_POOL.filter(c=>c&&c.id&&_isImplementedPoolCard(c)&&c.rarity!==-1&&
    (!G.panelSaleStock||(G.panelSaleStock[panelSaleStockKey(c)]||0)>0));
  let rewards=0,exchanges=0;
  for(const [distance,node] of nodes.entries()){
    const shop=node.type==='city',draws=shop?SHOP_EXCHANGE_TRIAL.stockCount:5;
    if(shop)exchanges++;else rewards++;
    const available=pool.filter(c=>!(shop?c._shopExcluded:c._rewardExcluded));
    const groups=[available.filter(c=>c.category==='キャラクター'),available.filter(c=>['エンチャント','強化'].includes(c.category))];
    const effective=draws*(shop?LIMITS.exchangeRate:LIMITS.acquireRate)*LIMITS.reachDiscount**(node.wave-wave)*LIMITS.distanceDiscount**distance;
    const distributionAtNode=groups.flatMap(g=>distribution(g,node.wave,node.stage).map(x=>({...x,p:x.p*(groups.every(g=>g.length)? .5:1)})));
    const probs={produces:{},consumes:{}};
    for(const {card,p} of distributionAtNode){
      expected.push({card,weight:p*effective});
      const role=extract(card);
      for(const field of ['produces','consumes'])for(const [token,strength] of Object.entries(role[field]))probs[field][token]=(probs[field][token]||0)+p*Math.min(1,strength);
    }
    for(const field of ['produces','consumes'])for(const [token,p] of Object.entries(probs[field]))logs[field][token]=(logs[field][token]||0)+effective*Math.log1p(-Math.min(.999999,p));
  }
  const chance={produces:{},consumes:{}};
  for(const field of ['produces','consumes'])for(const [token,v] of Object.entries(logs[field]))chance[field][token]=1-Math.exp(v);
  return {chance,expected,rewards,exchanges,effectiveCards:expected.reduce((s,x)=>s+x.weight,0)};
}
function init(context){context.planner={weights:Object.fromEntries(ARCHETYPES.map(a=>[a.id,1/ARCHETYPES.length])),history:[],updates:0};}
function refresh(context,reason){
  if(!context.planner)init(context);
  const state=context.planner,model=analyzeEntries(entries()),wave=Math.max(1,Number(G._wave)||1);
  const temperature=Math.max(.5,2.5-wave*.5),signals=ARCHETYPES.map(a=>Math.log1p(model.raw[a.id]));
  const max=Math.max(...signals),exps=signals.map(s=>Math.exp((s-max)/temperature)),total=exps.reduce((s,x)=>s+x,0);
  const old=state.weights;
  state.weights=Object.fromEntries(ARCHETYPES.map((a,i)=>[a.id,old[a.id]*LIMITS.preferenceMemory+(1-LIMITS.preferenceMemory)*exps[i]/total]));
  state.updates++;state.summary=model;
  const weights=Object.fromEntries(Object.entries(state.weights).map(([k,v])=>[k,round(v)]));
  const prior=state.history.at(-1),dominant=Object.keys(weights).sort((a,b)=>weights[b]-weights[a]||a.localeCompare(b))[0];
  if(!prior||prior.dominant!==dominant||Math.max(...Object.keys(weights).map(k=>Math.abs(weights[k]-prior.weights[k])))>.035||prior.wave!==G._wave){
    state.history.push({reason,wave:G._wave,stage:G._waveStage,dominant,weights,completed:model.completed});
  }
}
function prepare(context){
  if(!context.planner)refresh(context,'start');
  const plan={weights:{...context.planner.weights},forecast:forecast({stage:context.plannerStage||'r1'})};
  context.planner.plan=plan;return plan;
}
function boonValue(model,plan){
  const counts=G.towerBoons?.counts||{},f=plan.forecast;
  const mana=Math.min(2,(model.consumed.mana||0)/2),summon=Math.min(2,(model.produced.summon||0)/2);
  const per={stats:15,modifiers:10,damage:12,mana:6+7*mana,familiars:6+7*summon,
    bosses:(G.towerBoons?.defeatedBosses?.length?9:0),rerolls:10};
  return Object.entries(per).reduce((sum,[id,v])=>sum+v*(1-1/(1+(counts[id]||0))),0)*Math.min(1,f.effectiveCards/10);
}
function strategic(context,plan=context.planner?.plan){
  const model=analyzeEntries(entries()),weights=plan?.weights||Object.fromEntries(ARCHETYPES.map(a=>[a.id,1/ARCHETYPES.length]));
  const chance=plan?.forecast.chance||{produces:{},consumes:{}},option=empty();
  for(const field of ['produced','consumed'])for(const [token,amount] of Object.entries(model[field])){
    if(['attack','injury','death','blood'].includes(token)&&amount<.4)continue;
    const opposite=field==='produced'?'consumed':'produced',futureField=field==='produced'?'consumes':'produces';
    option[tokenFamily(token)]+=amount*(chance[futureField][token]||0)/(1+(model[opposite][token]||0));
  }
  let fit=0,potential=0,focus=0;
  for(const a of ARCHETYPES){const preference=.5+weights[a.id]*3;fit+=Math.log1p(model.raw[a.id])*preference;potential+=Math.log1p(option[a.id])*preference;focus+=weights[a.id]*Math.min(2,model.raw[a.id]);}
  const boon=plan?boonValue(model,plan):0;
  return {future:LIMITS.fit*fit+LIMITS.option*potential+LIMITS.focus*focus+boon,fit,potential,focus,boon,completed:model.completed};
}
function evaluate(point,strategy,samples){
  const enemyHp=samples.reduce((sum,s)=>sum+s.enemies.reduce((v,e)=>v+Math.max(1,e?.hp||0),0),0)/samples.length;
  const winWeight=Number(G._waveLife)<=1?LIMITS.emergencyWin:LIMITS.win;
  const immediate=winWeight*point.win+LIMITS.hp*Math.log1p(point.hp/Math.max(40,enemyHp))+LIMITS.damage*Math.log1p(point.damage/Math.max(40,enemyHp));
  return {...point,immediate:round(immediate),future:round(strategy.future),total:round((LIMITS.next??1)*immediate+strategy.future),strategy};
}
function cardValue(card,context){
  const role=extract(card),model=context.planner?.summary,weights=context.planner?.weights||{};
  let value=0;
  for(const [field,other] of [['produces','consumed'],['consumes','produced']])for(const [token,amount] of Object.entries(role[field])){
    value+=amount*(.5+(model?.[other][token]||0))*(1+(weights[tokenFamily(token)]||0)*2);
  }
  return Math.min(45,value*2)*LIMITS.prior;
}
function layoutValue(context){return strategic(context).future;}
function end(context){const s=context.planner;return {weights:s.weights,updates:s.updates,history:s.history,forecast:s.plan?{rewards:s.plan.forecast.rewards,exchanges:s.plan.forecast.exchanges,effectiveCards:round(s.plan.forecast.effectiveCards)}:null};}
module.exports={LIMITS,R1_WEIGHTS,R2_DEFAULTS,weights,configure,entries,analyzeEntries,describe,distribution,futureNodes,forecast,init,refresh,prepare,strategic,evaluate,cardValue,layoutValue,end};
