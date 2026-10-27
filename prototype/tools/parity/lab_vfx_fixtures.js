// LABの戦闘接続検査用。ゲームのシートと編成・コアからイベントを作る（Node/Chrome共通）。
function vbLabVfxFixture(no) {
  const def=[...PANEL_POOL,...ITEM_POOL].find(d=>d.no===no||d.artCode===no||no.startsWith('I')&&'I'+String(d.no).padStart(3,'0')===no);
  if(!def) {
    // E082/E083は内蔵シートに行がない（E083 のマナの種は 2026-10-27 に E027 へ移った）。ゲーム用データは足さず、割り当て済み演出の接続を旧本文で検査する。
    // 2026-10-27：E082 の本文は E077 一時の眠り（実装 false）へ移った。定義が無い時だけ本文で検査する。
    const text={E083:'負傷：10%の確率で1マナを得る。',E082:'死亡：このキャラクターは封印Xを得て封印される。Xは現在の血の2倍に等しい。',E077:'死亡：このキャラクターは封印Xを得て封印される。Xは現在の血の3倍に等しい。'}[no];
    if(!text) throw new Error('カードの定義 '+no);
    return createBattleState({sides:{p1:{units:[{id:'source',name:'演出検査素体',atk:12,hp:30,maxHp:100,color:'赤',keywords:[],boardCards:[{no,name:no,category:'エンチャント',desc:text,art:'assets/art/enchantments/E043.jpg'}],_adjacentPanelEffectTexts:[text]},...['赤','青','緑','黄','紫'].map((color,i)=>({id:'ally'+i,name:'味方'+i,color,atk:4,hp:70,maxHp:100,keywords:[],desc:''}))]},p2:{units:[{id:'foe0',name:'敵',atk:4,hp:100,maxHp:100,keywords:[],desc:''}]}},blood:{p1:20,p2:20}});
  }
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
  // 2026-10-12: C087は攻撃効果の発動を観測するので、観測先にもシートの攻撃効果を持たせる。
  if(no==='C087') allies[0].desc=PANEL_POOL.find(c=>c.no==='E031').desc;
  if(no==='C035') Object.assign(allies[1],PANEL_POOL.find(c=>c.no==='C012'),{id:'ally1',atk:4,hp:70,maxHp:100});
  if(no==='C096') allies.forEach((a,i)=>Object.assign(a,_makePanelSummonUnit(_panelSummonSpec(PANEL_POOL.find(c=>c.no==='C023')),[]),{id:'ally'+i,atk:4,hp:70,maxHp:100}));
  const enemies=['赤','青','緑'].map((color,i)=>({id:'foe'+i,name:'敵'+i,color,atk:4,hp:80,maxHp:100,desc:'',keywords:[],poison:3,shield:0,lane:i===2?'rear':'front'}));
  if(no==='E067') allies[0]={...JSON.parse(JSON.stringify(u)),id:'ally0',hp:70,maxHp:100};
  // 2026-10-12: 新21種も実カードの本文からコアの結果を作る。
  if(['C039','C044','C092','C047'].includes(no)){allies[0].keywords=['眷属'];allies[2].keywords=['眷属'];}
  if(['C124','C107'].includes(no))u.boardCards=Array.from({length:3},()=>({category:'エンチャント',name:'検査接続',desc:''}));
  if(no==='C124'){allies[0].color='紫';allies[3].color='紫';}
  if(no==='C119')allies.forEach((a,i)=>Object.assign(a,_makePanelSummonUnit(_panelSummonSpec(PANEL_POOL.find(c=>c.no==='C091')),[]),{id:'ally'+i,atk:4,hp:70,maxHp:100}));
  return createBattleState({sides:{p1:{units:[u,...allies]},p2:{units:enemies}},resources:{p1:{mana:({C009:1,C071:2,C086:3,C099:4})[no]||6,gold:200},p2:{mana:0,gold:100}},blood:{p1:20,p2:20},items:{p1:no==='I006'?[def]:[],p2:[]},summonDefs:[...PANEL_POOL,...ENEMY_POOL],itemDefs:ITEM_POOL,stageNumber:2});
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
var vbLabVfxCases={E006:'death',E035:'death',C050:'observerDeath',E062:'counter',E067:'attack',E071:'attack',E075:'attack',C042:'mana',C048:'injury',C061:'opening',C064:'mana',C068:'mana',C066:'mana',C069:'attack',C073:'atkGain',C087:'allyAttack',C088:'battleEnd',C089:'attack',C097:'shieldLost',C098:'attack',C100:'opening',C106:'attack',C117:'opening',E077:'death',C123:'release',C096:'attack',C056:'mana',C019:'opening',C023:'mana',C035:'death',I006:'item'};
function vbLabVfxExtraCases() {
  return [['K016','C086','mana'],['K002','C117','opening'],['K009','C008','allAttack'],
    ['S001','C056','mana'],['K020','C008','revive'],['K018_gain','C099','mana'],
    ['K020_gain','C042','mana'],['shield_break','C008','shieldBlock']];
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
  const events=[],rng=createSeededRng(code==='E027'?7:53),emit=e=>events.push(e);
  const hit=(a,b,amount,counter,ss,st,opt)=>coreResolveHit(state,a,b,amount,counter,rng,emit,{skipSourceEffects:!!ss,skipTough:!!st,...(opt||{})});
  const source=state.units.p1[0];source._sealed=false;source._currentAttackTarget=state.units.p2[0];
  presentBeginPlayback();
  if(code==='C088') {G._savedBattleEnd=null;G._battleVictoryPending=true;}
  else vbLabVfxTriggers[trigger](state,source,rng,emit,hit);
  held.forEach(args=>presentHoldShown(...args));
  const done=Promise.resolve(code==='C088'?onBattleEnd():_flushCorePveHitEvents(state,events,before)).finally(()=>{
    if(code==='C088')events.push(...G._battleCoreEvents);
    held.forEach(([u])=>presentReleaseShown(u));presentEndPlayback();
  });
  return {events,done};
}

// 固有演出が呼ばれるだけでなく、汎用演出へ置き換わったり先行したりしていないことも見る。
function vbLabVfxExpectedCalls(code,names) {
  const name=presentLabFx(code)[0],at=names.indexOf(name);
  const generic=['weaken','atk-down','battle-summon','shield-gain','revive-gain'];
  const follow={E071:'weaken',C106:'atk-down',C117:'atk-down',C042:'revive-gain',C056:'battle-summon'}[code];
  return at>=0&&(!vbLabVfxCases[code]||names.slice(0,at).every(n=>!generic.includes(n)))
    &&(!follow||names.indexOf(follow)>at);
}

// C007/C022の固有SEは、以前はPvEだけ1手番の後で鳴らしオンラインは鳴らなかった。2026-10-15から被弾位置の固有VFXと同時に両側で1回鳴らす。
// 第2段の固有演出。旧50種のシナリオはそのまま、新しい描画入口も同じコア→presenterで比較する。
var vbWebpVfxCases=[
  ['C007','redirect','attack-recoil',{pve:['C007'],online:['C007']}],['C013','mana','arachne-ring'],
  ['C016','attack','siren-wave'],['C022','injury','medusa-gaze',{pve:['C022'],online:['C022']}],
  ['E042','attack','centaur-missile'],['C058','attack','flame-sweep'],
  ['C115','death','steal-mark'],['E058','mana','fire-arrow'],
  ['E045','mana','mana-buff'],['E001','injury','injury-buff'],
  ['C006','battleEnd','gold-gain']
];
vbLabVfxTriggers.redirect=(s,_u,_rng,_emit,hit)=>hit(s.units.p2[0],s.units.p1[1],6,false,false,false);

// 2026-10-12: 個別のコア呼び出しだけでなく、攻撃は命中フックまで通す。
var vbLabVfx1012Cases={C009:'mana',E027:'injury',E043:'death',C075:'release',E031:'attackContact',C091:'opening',C124:'release',C039:'death',C044:'injury',C107:'release',C108:'injury',C120:'opening',C122:'release',C014:'injury',E056:'death',C071:'mana',C086:'mana',C099:'mana',E024:'kill',C119:'releaseObserver'};
vbLabVfxTriggers.attackContact=(s,_u,rng,emit)=>{s._coreFirstSide='p1';createBattleRunner(s,rng,emit,{skipOpening:true}).step({deferCompact:true});};
vbLabVfxTriggers.kill=(s,u,_rng,_emit,hit)=>{s.units.p2[0].hp=1;hit(u,s.units.p2[0],2);};
vbLabVfxTriggers.releaseObserver=(s,_u,rng,emit,hit)=>coreApplyReleaseEffects(s.units.p1[1],[],s,rng,emit,hit);
