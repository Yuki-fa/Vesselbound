'use strict';
const {assert,sheet,copy,plain,harness,initRun,pipelines} = require('./rules_1026_harness');
const vm=require('node:vm'),fs=require('node:fs');
let passed=0,failed=0;
async function check(label,fn){try{await fn();passed++;console.log('OK '+label);}catch(e){failed++;console.error('NG '+label+'\n'+e.stack);}}
const ring=no=>copy(RING_POOL.find(r=>r.no===no));
const numbers=text=>[...text.matchAll(/\d+(?:\.\d+)?/g)].map(m=>Number(m[0]));
function opening(h){coreApplyOpeningRings(h.state,h.rng,h.emit,h.hit);}
(async()=>{
 console.table=()=>{};await loadGameData();
 for(const no of 'R012 R015 R019 R021 R022 R023 R031 R034 R035'.split(' '))for(const modified of [false,true])for(const side of ['p1','p2'])await check(`${no} ${ring(no).name}/${modified?'本文数値差替':'シート'}/${side}`,async()=>{
  const r=ring(no);if(modified)r.desc=r.desc.replace(/\d+(?:\.\d+)?/g,n=>String(Number(n)+2));
  const [n,m,d]=numbers(r.desc),own=[plain('source'),plain('ally',{lane:'rear'})];
  if(['R019','R022','R034'].includes(no))own[0].desc='開戦：「青スケルトン」を召喚する。';
  if(no==='R021')own[0].keywords=['毒牙3'];
  if(no==='R035')own[0].keywords=['結界1'];
  const h=harness(side,own,{rings:{[side]:[r]}});
  if(no==='R023')h.initial.resources[side].mana=n*2+3;
  switch(no){
   case 'R012': {
    const original=h.own.map(u=>[u.atk,u.hp,u.maxHp]);opening(h);
    h.own.forEach((u,i)=>assert.deepEqual([u.atk,u.hp,u.maxHp],[original[i][0]+n,original[i][1]+m-d,original[i][2]+m]));
    const hits=h.events.filter(e=>e.type==='damage');assert.equal(new Set(hits.map(e=>e.batch)).size,1);
    assert.ok(h.events.findIndex(e=>e.type==='damage')>h.events.findLastIndex(e=>e.reason==='pain_ring'));break;
   }
   case 'R015': {
    opening(h);h.events.length=0;h.hit(h.foes[0],h.u,2);
    assert.deepEqual([h.u.atk,h.u.hp,h.u.maxHp],[5+n,98+m,100+m]);assert.deepEqual([h.own[1].atk,h.own[1].hp],[5+n,100+m]);
    const restored=createCoreUnit(coreUnitSnapshot(h.u),side,0);assert.equal(restored.ringInjuryAtk,n);assert.equal(restored.ringInjuryHp,m);break;
   }
   case 'R019': {
    assert.deepEqual(h.own.map(u=>[u.hp,u.maxHp]),[[100*n,100*n],[100*n,100*n]]);
    opening(h);opening(h);assert.equal(h.u.hp,100*n);assert.ok(!h.events.some(e=>e.reason==='paladin_ring'));
    const child=coreSummonUnit(h.state,side,{name:'new',atk:2,hp:7,maxHp:11,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);
    assert.deepEqual([child.hp,child.maxHp],[7*n,11*n]);
    const stolen=h.foes[0];assert.ok(coreStealUnit(h.state,stolen,side,h.emit,h.u.id,undefined,h.rng,h.hit));assert.equal(stolen.hp,100*n);
    coreApplyPassiveHpRings(h.state,child);assert.equal(child.hp,7*n);
    const snapshot=coreUnitSnapshot(child);assert.equal(snapshot._paladinRingApplied,true);const restored=createCoreUnit(snapshot,side,0);coreApplyPassiveHpRings(h.state,restored);assert.equal(restored.hp,child.hp);
    const twin=coreSummonUnit(h.state,side,{...snapshot,name:'copy',_inheritsStats:true,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);assert.equal(twin.hp,child.hp,'倍率を含むコピーの数値を再度倍にしない');
    assert.ok(coreStealUnit(h.state,stolen,h.other,h.emit,h.u.id,undefined,h.rng,h.hit));assert.ok(coreStealUnit(h.state,stolen,side,h.emit,h.u.id,undefined,h.rng,h.hit));assert.equal(stolen.hp,100*n,'同じ体の再奪取でも1回だけ');break;
   }
   case 'R021': {
    for(const amount of [1,3,8]){
     const x=harness(side,[plain('source',{keywords:['毒牙'+amount]})],{rings:{[side]:[r,r]}});x.hit(x.u,x.foes[0],1);
     assert.equal(x.foes[0].poison,Math.ceil(amount*n));assert.equal(x.events.find(e=>e.effect==='poison').amount,Math.ceil(amount*n));
    }
    h.u.desc='開戦：全ての敵に毒3を与える。';coreApplyOpeningEffects(h.u,h.state,h.rng,h.emit,h.hit);assert.ok(h.foes.every(u=>u.poison===Math.ceil(3*n)));
    const bag=harness(side,[plain('source',{_adjacentPanelEffectTexts:['死亡：ランダムな敵2体に毒3を与える。']})],{rings:{[side]:[r]}});bag.u.hp=0;coreApplyDeathEffects(bag.u,bag.state,bag.rng,bag.emit,bag.hit);assert.equal(bag.foes.reduce((s,u)=>s+u.poison,0),2*Math.ceil(3*n));break;
   }
   case 'R022': {
    const child=coreSummonUnit(h.state,side,{name:'kin',atk:4,hp:7,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);
    assert.ok(coreUnitHasKeyword(child,'貫通'));assert.equal(child.shield,0);assert.ok(!coreUnitHasKeyword(h.u,'貫通'));
    if(modified){const changed={...r,desc:r.desc.replace('貫通','先制')};const x=harness(side,[plain('source')],{rings:{[side]:[changed]}});const other=coreSummonUnit(x.state,side,{name:'changed',atk:4,hp:7,_fixedSummonStats:true},x.emit,x.u.id,false,x.rng,x.hit);assert.ok(coreUnitHasKeyword(other,'先制'));}break;
   }
   case 'R023': {
    h.state.resources[side].mana=n*2+3;coreApplyRingManaEffects(h.state,h.rng,h.emit,h.hit);
    assert.equal(h.events.filter(e=>e.type==='ring_effect').length,2);assert.ok(h.events.filter(e=>e.type==='damage').every(e=>e.amount===m));
    assert.ok(h.foes.every(u=>u.hp===Math.max(0,100-2*m)));const before=h.events.length;coreApplyRingManaEffects(h.state,h.rng,h.emit,h.hit);assert.equal(h.events.length,before);break;
   }
   case 'R031': {
    h.own.unshift(createCoreUnit(plain('rear-first',{lane:'rear'}),side,5));opening(h);assert.equal(h.u.atk,5*n);assert.equal(h.own[0].atk,5);assert.equal(corePickFirstSide(h.state,h.rng),side);
    const rear=harness(side,[plain('rear',{lane:'rear'})],{rings:{[side]:[r]}});opening(rear);assert.equal(rear.u.atk,5);assert.equal(corePickFirstSide(rear.state,rear.rng),rear.other);break;
   }
   case 'R034': {
    const child=coreSummonUnit(h.state,side,{name:'kin',atk:4,hp:7,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);assert.deepEqual([child.atk,child.hp,child.maxHp],[4+n,7+m,7+m]);break;
   }
   case 'R035': {
    h.u.shield=1;h.hit(h.foes[0],h.u,3);h.own.forEach(u=>assert.deepEqual([u.atk,u.hp,u.maxHp],[5+n,100+m,100+m]));assert.equal(h.u.shield,0);break;
   }
  }
  await pipelines(h.initial);
 });
 await check('R014 黄金：4回ごとの強化、複数所持、再抽選、持越し、保存・元に戻す・古い保存',async()=>{
  for(const modified of [false,true]){
   initRun();const r=ring('R014');if(modified)r.desc=r.desc.replace('4回','3回').replace('1枚','2枚');G.rings=[r,copy(r),null,null];
   const [period,count]=numbers(r.desc);const definition=PANEL_POOL.find(c=>c.category==='エンチャント'&&panelHasEnhancementForm(c));assert.ok(definition);
   const cards=()=>Array.from({length:5},()=>({...makePanel(definition.id),_isOriginalReward:true}));
   for(let i=1;i<period;i++){const fresh=cards();_markRewardAppearancePending(fresh);assert.ok(fresh.every(c=>!c._merged));_markRewardAppearancePending(fresh);assert.equal(G.goldenRingRewards.views,i);}
   // 強化先のない回も4回目に数え、権利を持ち越す。
   const unavailable=[{id:'dummy',name:'dummy',category:'エンチャント',desc:'',_isOriginalReward:true}];_markRewardAppearancePending(unavailable);
   assert.deepEqual(G.goldenRingRewards,{views:period,pending:2*count});
   _rewCards=cards();_markRewardAppearancePending(_rewCards);assert.equal(_rewCards.filter(c=>c._merged).length,2*count);assert.equal(G.goldenRingRewards.pending,0);
   _storeRewardStartSnapshot();const progress=copy(G.goldenRingRewards);resetRewardToStart();assert.deepEqual(G.goldenRingRewards,progress);
   const save=SaveRun.buildRunSave('reward');G.goldenRingRewards={views:0,pending:0};SaveRun.restoreRunState(copy(save));_markRewardAppearancePending(_rewCards);assert.deepEqual(G.goldenRingRewards,progress);
   const before=copy(G.goldenRingRewards);for(const flag of ['_isShop','_isPeddler','_isForge','_isItemShop','_isLibrary','_isTavern','_isFiveSaints','_isRingExchange','_isVillageMenu','_isWaveAltar']){G[flag]=true;_markRewardAppearancePending(cards());G[flag]=false;}assert.deepEqual(G.goldenRingRewards,before);
   // 再抽選の本番入口を通す。演出のDOMだけ省略する。
   const prepare=_prepareRewardRerollReveal,render=renderRewCards,complete=_completeRewardAppearance;
   _prepareRewardRerollReveal=()=>null;renderRewCards=()=>{};_completeRewardAppearance=()=>{};
   try{towerBoonState().rerolls=1;G.gold=800;assert.equal(towerBoonRerollRewards(),true);assert.equal(G.goldenRingRewards.views,before.views+1);}finally{_prepareRewardRerollReveal=prepare;renderRewCards=render;_completeRewardAppearance=complete;}
   delete save.state.player.goldenRingRewards;SaveRun.restoreRunState(save);assert.deepEqual(G.goldenRingRewards,{views:0,pending:0});
   G._onlineMode=true;const onlineFresh=cards();_markRewardAppearancePending(onlineFresh);assert.equal(G.goldenRingRewards.views,1,'オンラインの通常報酬も同じ提示を数える');G._onlineMode=false;
  }
 });
 await check('R014 黄金は戦闘結果を変更せず、PvE・オンライン・保存再生も一致',async()=>{await pipelines(harness('p1',[plain('source')],{rings:{p1:[ring('R014')]}}).initial);});
 await check('旧保存の指輪も新本文・ツールチップ用説明へ更新、生命R033は最大ライフ+1',()=>{
  initRun();G.rings=[{...ring('R015'),desc:'開戦：全ての味方はHP+1を得る。'},ring('R033'),null,null];_storeRewardStartSnapshot();const saved=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(saved);
  assert.equal(G.rings[0].desc,ring('R015').desc);assert.equal(G._rewardStartSnapshot.rings[0].desc,ring('R015').desc);assert.equal(waveLifeMax(),4);
 });
 for(const no of ['R024','R030','R037'])await check(`${no} 実装false：報酬・店の候補に出ない`,()=>{
  const row=sheet.sheetRows('ring').find(r=>r['No.']===no),def=RING_POOL.find(r=>r.no===no);assert.equal(row['実装'],'false');assert.equal(row['出現'],'false');assert.ok(!def||def._rewardExcluded||def._rewardAvailable===false);
  initRun();for(let i=0;i<50;i++){G._bossRingOfferSeen=[];assert.ok(!_pickAltarRingOffer().some(r=>r.no===no));}
  if(def)assert.equal(_shopOrRewardExcluded(def),true);
 });
 console.log(`指輪1026: OK ${passed} / NG ${failed}`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
