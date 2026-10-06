// LABの戦闘接続検査用。ゲームのシートと編成・コアからイベントを作る（Node/Chrome共通）。
function vbLabVfxFixture(no) {
  const def=[...PANEL_POOL,...ITEM_POOL].find(d=>d.no===no||d.artCode===no||no.startsWith('I')&&'I'+String(d.no).padStart(3,'0')===no);
  if(!def) throw new Error('カードの定義 '+no);
  let u;
  if(no.startsWith('E')) {
    const c={...def},direction=c.directions?.[0]||'up',at={up:2,right:8,down:12,left:6}[direction],opposite={up:'down',right:'left',down:'up',left:'right'}[direction];
    const boardCards=Array(MAIN_BOARD_SIZE).fill(null);
    boardCards[7]={...c,directions:c.directions?.length?c.directions:[direction]};
    boardCards[at]={name:'検査素体',category:'キャラクター',color:'赤',power:12,life:100,desc:'',keywords:[],directions:[opposite]};
    const powers=G.mapPanelPowers;G.mapPanelPowers={[at]:'summon'};
    try{u=buildBoardFormation({boardCards},{stageNumber:2}).entries[0].unit;}finally{G.mapPanelPowers=powers;}
  } else if(no.startsWith('I')) u={name:'検査素体',color:'赤',desc:'',keywords:[]};
  else u=_makePanelSummonUnit(_panelSummonSpec(def),[]);
  Object.assign(u,{id:'source',atk:12,hp:30,maxHp:100,_stageNumber:2});
  const allies=['赤','青','緑','黄','紫'].map((color,i)=>({id:'ally'+i,name:'味方'+i,color,atk:4,hp:70,maxHp:100,desc:'',keywords:[],lane:i>2?'rear':'front'}));
  if(no==='C025') Object.assign(allies[1],PANEL_POOL.find(c=>c.no==='C003'),{id:'ally1',atk:4,hp:70,maxHp:100});
  if(no==='C076') allies.forEach((a,i)=>Object.assign(a,_makePanelSummonUnit(_panelSummonSpec(PANEL_POOL.find(c=>c.no==='C018')),[]),{id:'ally'+i,atk:4,hp:70,maxHp:100}));
  const enemies=['赤','青','緑'].map((color,i)=>({id:'foe'+i,name:'敵'+i,color,atk:4,hp:80,maxHp:100,desc:'',keywords:[],poison:3,shield:0,lane:i===2?'rear':'front'}));
  if(no==='E067') allies[0]={...JSON.parse(JSON.stringify(u)),id:'ally0',hp:70,maxHp:100};
  return createBattleState({sides:{p1:{units:[u,...allies]},p2:{units:enemies}},resources:{p1:{mana:6,gold:200},p2:{mana:0,gold:100}},blood:{p1:20,p2:20},items:{p1:no==='I006'?[def]:[],p2:[]},summonDefs:[...PANEL_POOL,...ENEMY_POOL],itemDefs:ITEM_POOL,stageNumber:2});
}
var vbLabVfxTriggers={
  opening:(s,u,rng,emit,hit)=>coreApplyOpeningEffects(u,s,rng,emit,hit),
  attack:(s,u,rng,emit,hit)=>coreApplyAttackEffects(u,s,rng,emit,hit),
  injury:(s,u,rng,emit,hit)=>coreApplyInjuryEffects(u,4,s,rng,emit,hit,s.units.p2[0]),
  death:(s,u,rng,emit,hit)=>{u.hp=0;emit({type:'death',side:u.side,unitId:u.id});coreTriggerDeath(u,s,emit);coreApplyDeathEffects(u,s,rng,emit,hit);},
  observerDeath:(s,_u,rng,emit,hit)=>{const dead=s.units.p1[1];dead.hp=0;emit({type:'death',side:dead.side,unitId:dead.id});coreApplyDeathObservers(dead,s,rng,emit,hit);},
  shieldLost:(s,_u,rng,emit,hit)=>{const a=s.units.p1[1];emit({type:'shield_lost',side:a.side,unitId:a.id,shield:0});coreApplyShieldLostEffects(a,s,rng,emit,hit);},
  atkGain:(s,u,rng,emit,hit)=>coreTriggerAtkGainEffects(u,1,s,rng,emit,hit),
  allyAttack:(s,_u,rng,emit,hit)=>coreApplyAttackObservers(s.units.p1[1],s,rng,emit,hit),
  battleEnd:(s,_u,rng,emit)=>coreTriggerBattleEnd(s,emit,rng),
  mana:(s,_u,rng,emit,hit)=>coreApplyManaThresholdEffects(s,rng,emit,hit),
  release:(s,u,rng,emit,hit)=>coreApplyReleaseEffects(u,[s.units.p1[1]],s,rng,emit,hit),
  item:(s,_u,rng,emit,hit)=>coreApplyOpeningItems(s,rng,emit,hit),
  counter:(s,u,_rng,emit)=>{const notice={};coreCounterDamage(u,s.units.p2[0],notice);coreEmitCounterBlock(s,u,s.units.p2[0],notice,emit);},
  allAttack:(s,_u,rng,emit)=>runBattleCore(s,rng,{skipOpening:true,turnLimit:1,onEvent:emit}),
  revive:(s,_u,_rng,_emit,hit)=>hit(s.units.p2[0],s.units.p1[1],10000,false,false,false),
  shieldBlock:(s,u,_rng,_emit,hit)=>hit(u,s.units.p2[0],4,false,false,false),
};
var vbLabVfxCases={E006:'death',C024:'death',E035:'death',C039:'observerDeath',E062:'counter',E067:'attack',E071:'attack',E075:'attack',C032:'mana',C037:'attack',C038:'injury',C046:'opening',C049:'mana',C053:'mana',C051:'mana',C054:'attack',C058:'atkGain',C067:'allyAttack',C068:'battleEnd',C069:'attack',C077:'shieldLost',C078:'attack',C080:'opening',C081:'attack',C092:'opening',C096:'death',C098:'release',C076:'attack',C041:'mana',C014:'opening',C018:'mana',C025:'death',I006:'item'};
function vbLabVfxExtraCases() {
  const elf=PANEL_POOL.find(c=>/負傷[：:].*結界/.test(c.desc||''));
  if(!elf)throw new Error('負傷で結界を得る検査用カード');
  return [['K016','C014','opening'],['K002','C092','opening'],['K009','C003','allAttack'],
    ['S001','C041','mana'],['K020','C003','revive'],['K018_gain',elf.no,'injury'],
    ['K020_gain','C032','mana'],['shield_break','C003','shieldBlock']];
}
function vbLabVfxPrepare(code,state) {
  if(code==='K009') state.units.p1[0].keywords.push('全体攻撃');
  if(code==='K020') state.units.p1[1].keywords.push('復活');
  if(code==='shield_break') state.units.p2[0].shield=1;
}

// Chrome/Nodeで同じ入口を使う。initState/stopVfxだけでは行動表示のカード写しが残る。
// 実戦のstartBattle/beginOnlineVersusFieldと同じ初期化で、ケース間の同じIDを再利用できる。
function vbLabVfxResetBattle() {
  _forceStopAllVfx();presentResetPlayback();initState();initializeBattlePresentationState();
  G.phase='player';G._coreDrivenBattle=true;G._savedBattleReplaying=true;
  G._battleRunId=1;G._battleCounters={damage:0,deaths:0};
  G._battleCoreEvents=[];G._battleVictoryPending=false;
}

// コアから作ったイベントを実際のPvE受け口へ流す。描画の代替は検査側だけで行う。
function vbLabVfxStartPve(code,state,trigger) {
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const held=[...before].map(u=>[u,u.atk,u.hp,u.maxHp,u.shield||0,u.weaken||0]);
  const events=[],rng=createSeededRng(53),emit=e=>events.push(e);
  const hit=(a,b,amount,counter,ss,st,opt)=>coreResolveHit(state,a,b,amount,counter,rng,emit,{skipSourceEffects:!!ss,skipTough:!!st,...(opt||{})});
  const source=state.units.p1[0];source._sealed=false;source._currentAttackTarget=state.units.p2[0];
  presentBeginPlayback();
  if(code==='C068') {G._savedBattleEnd=null;G._battleVictoryPending=true;}
  else vbLabVfxTriggers[trigger](state,source,rng,emit,hit);
  held.forEach(args=>presentHoldShown(...args));
  const done=Promise.resolve(code==='C068'?onBattleEnd():_flushCorePveHitEvents(state,events,before)).finally(()=>{
    if(code==='C068')events.push(...G._battleCoreEvents);
    held.forEach(([u])=>presentReleaseShown(u));presentEndPlayback();
  });
  return {events,done};
}

// 固有演出が呼ばれるだけでなく、汎用演出へ置き換わったり先行したりしていないことも見る。
function vbLabVfxExpectedCalls(code,names) {
  const name=presentLabFx(code)[0],at=names.indexOf(name);
  const generic=['weaken','atk-down','battle-summon','shield-gain','revive-gain'];
  const follow={E071:'weaken',C014:'weaken',C081:'atk-down',C092:'atk-down',C032:'revive-gain',C041:'battle-summon'}[code];
  return at>=0&&(!vbLabVfxCases[code]||names.slice(0,at).every(n=>!generic.includes(n)))
    &&(!follow||names.indexOf(follow)>at);
}
