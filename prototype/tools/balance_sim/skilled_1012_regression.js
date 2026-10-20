'use strict';
// 2026-10-12 利用者指定: 熟練N、E052旧文、C093開戦付与を実際のloader・編成・共通コアで検査。
const assert=require('node:assert/strict');
const {sheetRows}=require('./sheet_data');
require('./load');
const copy=v=>JSON.parse(JSON.stringify(v));
const plain=(id,color='紫',extra={})=>({id,name:id,color,atk:20,hp:100,maxHp:100,lane:'front',keywords:[],desc:'',...extra});
const row=no=>[...sheetRows('card'),...sheetRows('enchant')].find(r=>r['No.']===no);
const text=(no,merged)=>row(no)[merged?'合体効果':'効果'];
function panel(no,merged){
  const def=PANEL_POOL.find(p=>p.no===no);assert.ok(def,no+'のloader登録');
  const p=makePanel(def.id);if(merged){applyMergedPanelForm(p);p._tripleMerged=true;}
  return p;
}
function formed(no,enchantments=[],extra={}){
  initState();G._wave=1;G.mainBoard.fill(null);G.mapPanelPowers={1:'summon'};
  const base=panel(no,false);Object.assign(base,extra);base.directions=['left','right'];G.mainBoard[1]=base;
  enchantments.forEach(([code,merged],i)=>{const p=panel(code,merged);p.directions=[i?'left':'right'];G.mainBoard[i?2:0]=p;});
  const entry=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0];
  assert.ok(entry,no+'の実編成');entry.unit.boardCards=_panelSummonDisplayBoardCards(entry.panel,entry.contributingPanels);
  return entry.unit;
}
function setup(units,side='p1'){
  const other=side==='p1'?'p2':'p1';
  const state=createBattleState({sides:{[side]:{units},[other]:{units:[plain('foe','赤')]}},frontSlots:20,maxUnits:30});
  const events=[],rng=createSeededRng(1012),emit=e=>events.push(e);
  const hit=(a,b,n,c,ss,st,opt)=>coreResolveHit(state,a,b,n,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...(opt||{})});
  return {state,side,other,events,rng,emit,hit};
}
const opening=h=>coreRunOpening(h.state,h.rng,h.emit,h.hit,()=>{});

(async()=>{
  console.table=()=>{};await loadGameData();let checked=0;
  const giver=plain('giver','赤',{keywords:['熟練2','熟練3']}),receiver=plain('receiver','青',{keywords:['熟練9']});
  for(const n of [0,1,4,-1,-4])assert.equal(coreStatBonus(receiver,n,giver),n+(n?Math.sign(n)*5:0));
  assert.equal(coreStatBonus(receiver,2,plain('unskilled')),2,'受け手の熟練で増えた');
  assert.equal(coreKeywordCountBuff(['熟練','熟練1','熟練3','先制'],[{desc:text('E063',false)}]),4,'熟練Nは1種類、カード名は除外');

  for(const side of ['p1','p2'])for(const merged of [false,true]){
    // E052はシート本文の通常1／合体3。改名しても本文で効く。
    const unit=formed('C093',[['E052',merged]],{name:'改名した与え手',desc:'',keywords:[]});
    const amount=Number(text('E052',merged).match(/値は(\d+)/)[1]);
    unit.keywords.push('熟練2');
    const h=setup([unit,plain('receiver','青')],side),u=h.state.units[side][0],foe=h.state.units[h.other][0];
    assert.equal(coreStatBonus(foe,2,u),2+amount+2);assert.equal(coreStatBonus(foe,-2,u),-2-amount-2);
    u.desc='開戦：全ての味方は+2/+3を得る。';
    const receiver=h.state.units[side][1],before=[receiver.atk,receiver.hp,receiver.maxHp];
    coreApplyOpeningEffects(u,h.state,h.rng,h.emit,h.hit,0);
    assert.deepEqual([receiver.atk,receiver.hp,receiver.maxHp],[before[0]+2+amount+2,before[1]+3+amount+2,before[2]+3+amount+2]);
    // 備考の「邪眼にも有効」：負傷でランダムな敵へATK-2。
    u.desc='負傷：ランダムな敵はATK-2を得る。';
    coreApplyInjuryEffects(u,1,h.state,h.rng,h.emit,h.hit,foe,0,'combat');
    assert.equal(foe.atk,20-2-amount-2);checked++;
  }
  // 同じ旧文を通常＋合体で接続すると各本文の値を足す（最大値で上書きしない）。
  const mixed=formed('C093',[['E052',false],['E052',true]],{desc:'',keywords:[]});
  const mixedBonus=[false,true].reduce((n,m)=>n+Number(text('E052',m).match(/値は(\d+)/)[1]),0);
  assert.equal(coreStatBonus(plain('r'),1,mixed),1+mixedBonus);assert.equal(coreStatBonus(plain('r'),-1,mixed),-1-mixedBonus);
  for(const side of ['p1','p2']){
    const eye=setup([plain('eye','赤',{keywords:['熟練1'],desc:'負傷：ランダムな敵はATK-2を得る。'})],side);
    coreApplyInjuryEffects(eye.state.units[side][0],1,eye.state,eye.rng,eye.emit,eye.hit,eye.state.units[eye.other][0],0,'combat');
    assert.equal(eye.state.units[eye.other][0].atk,17,'熟練1＋邪眼の負傷ATK-2はATK-3');
    const negative=setup([plain('negative','赤',{hp:10,maxHp:10,keywords:['熟練2'],
      desc:'開戦：全ての敵は-1/-2を得る。この効果は、このキャラクターのHP10につき1回発生する。'})],side);
    opening(negative);assert.deepEqual([negative.state.units[negative.other][0].atk,negative.state.units[negative.other][0].hp],[17,96],'負のATK/HPをそれぞれ-X');checked+=2;
  }

  for(const side of ['p1','p2'])for(const merged of [false,true])for(const grace of [null,false,true]){
    const walker=formed('C093',grace==null?[]:[['E039',grace]]);walker.desc=text('C093',merged);
    const h=setup([walker,plain('purple'),plain('red','赤'),plain('sealed','紫',{keywords:['封印99'],_sealed:true}),plain('dead','紫',{hp:0,_deployedAtZeroHp:true})],side);
    const expected=Number(walker.desc.match(/熟練(\d+)/)[1])*(1+(grace==null?0:Number(text('E039',grace).match(/(\d+)回追加/)[1])));
    assert.equal(coreKeywordSum(h.state.units[side][1],'熟練'),0,'開戦前に付与');
    opening(h);
    for(const u of h.state.units[side].slice(0,2)){
      assert.equal(coreKeywordSum(u,'熟練'),expected,`${side} C093${merged?'合体':'通常'} 恩寵=${grace}`);
      assert.equal(coreStatBonus(plain('r'),-2,u),-2-expected);assert.equal(u._voidWalkerBonus,0);
    }
    for(const u of h.state.units[side].slice(2))assert.equal(coreKeywordSum(u,'熟練'),0);
    assert.equal(coreKeywordSum(h.state.units[h.other][0],'熟練'),0,'敵へ付与');
    const grants=h.events.filter(e=>e.effect==='keyword_gain');assert.ok(grants.length>0&&grants.every(e=>Array.isArray(e.keywords)));
    h.state.units[side][0].hp=0;coreRefreshVoidWalkerBonus(h.state);
    assert.equal(coreStatBonus(plain('r'),1,h.state.units[side][1]),1+expected,'付与元の死亡で熟練が消える');
    const child=coreSummonUnit(h.state,side,plain('late'),h.emit,'purple');assert.ok(child);
    assert.equal(coreKeywordSum(child,'熟練'),0,'開戦後に新たな体へ常時付与');checked++;
  }
  for(const side of ['p1','p2'])for(const strategyMerged of [false,true]){
    const recipient=formed('C093',[['E063',strategyMerged]],{desc:'',keywords:['先制']});recipient.id='strategy';
    const walker=plain('walker','紫',{desc:text('C093',false)});
    const h=setup([walker,recipient],side),u=h.state.units[side][1];
    const before=[u.atk,u.hp,u.maxHp],multiplier=Number(text('E063',strategyMerged).match(/数の(\d+)倍/)[1]);
    opening(h);
    assert.equal(coreKeywordCountBuff(u.keywords,[{desc:text('E063',strategyMerged)}]),multiplier*2,'付与後の策士の種類数');
    assert.deepEqual([u.atk,u.hp,u.maxHp],before.map(n=>n+multiplier+1),'新しい1種類分＋自身の熟練1');
    coreApplyOpeningEffects(h.state.units[side][0],h.state,h.rng,h.emit,h.hit,1);
    assert.equal(coreKeywordSum(u,'熟練'),2);assert.deepEqual([u.atk,u.hp,u.maxHp],before.map(n=>n+multiplier+1),'同種の重複で策士の種類数が増えた');checked++;
  }
  // 状態異常、毒によるHP減少、結界、通常ダメージは熟練の対象外。
  for(const side of ['p1','p2']){
    const h=setup([plain('skill','紫',{keywords:['熟練4','邪眼2','毒牙2','衝撃2'],poison:2})],side);
    const u=h.state.units[side][0],foe=h.state.units[h.other][0];
    coreApplyKeywordOnHit(u,foe,1,foe.hp,h.state,h.emit);
    assert.deepEqual([foe.atk,foe.poison,foe.weaken],[14,2,2]);
    const hp=u.hp;coreApplyPoisonBeforeTurn(u,h.emit);assert.equal(u.hp,hp-2);
    u.desc='開戦：全ての味方に結界2を付与する。';coreApplyOpeningEffects(u,h.state,h.rng,h.emit,h.hit,0);assert.equal(u.shield,1,'結界Nは1つ、熟練の補正も受けない');
    const foeHp=foe.hp;h.hit(u,foe,3,false,true);assert.equal(foe.hp,foeHp-5,'ダメージは弱体2だけが加算、熟練は加算しない');checked++;
  }
  // 2体の開戦付与は値を加算する。旧常時は旧本文のある保存だけに残す。
  const twice=setup([plain('a','紫',{desc:text('C093',false)}),plain('b','紫',{desc:text('C093',true)}),plain('r')]);opening(twice);
  assert.equal(coreKeywordSum(twice.state.units.p1[2],'熟練'),[false,true].reduce((n,m)=>n+Number(text('C093',m).match(/熟練(\d+)/)[1]),0));
  const copied=setup([plain('copy-walker','紫',{desc:text('C093',false),_mapPanelPower:'duplicate'})]);opening(copied);
  assert.equal(copied.state.units.p1.length,2,'複製の力の開戦コピー');
  copied.state.units.p1.forEach(u=>assert.equal(coreKeywordSum(u,'熟練'),1,'先に出た開戦コピーも熟練を得る'));
  const legacy=setup([plain('old','紫',{desc:'常時：紫の味方が与える戦闘修正の値は3大きくなる。'}),plain('r')]);
  assert.equal(coreStatBonus(plain('t'),1,legacy.state.units.p1[1]),4,'旧保存の常時本文');

  // 同じ実編成をPvEの参照共有状態とオンラインpayload→コアへ渡して、イベント列・最終状態を比較。
  formed('C093',[['E039',true],['E052',true]]);
  const payload=buildOnlineSelfFormation();payload.units.push(plain('r'));
  G.allies=payload.units.map((u,i)=>createCoreUnit(u,'p1',i));
  G.enemies=[createCoreUnit(plain('foe','赤'),'p2',0)];G.mana=0;G.gold=0;G._waveLife=3;
  const online=createBattleState({sides:{p1:payload,p2:{units:copy(G.enemies)}},life:{p1:3,p2:3}});
  const pve=_createPveCoreState(),pveEvents=[],onlineEvents=[];
  runBattleCore(pve,createSeededRng(1012),{turnLimit:2,onEvent:e=>pveEvents.push(e)});
  runBattleCore(online,createSeededRng(1012),{turnLimit:2,onEvent:e=>onlineEvents.push(e)});
  const view=events=>events.filter(e=>['keyword_effect','stat_change','damage'].includes(e.type));
  assert.deepEqual(view(pveEvents),view(onlineEvents),'PvE/オンラインの熟練・補正イベント');
  assert.deepEqual(pve.units.p1.map(u=>[u.atk,u.hp,u.maxHp,coreKeywordSum(u,'熟練')]),online.units.p1.map(u=>[u.atk,u.hp,u.maxHp,coreKeywordSum(u,'熟練')]),'PvE/オンラインの最終値');
  console.log(`OK 熟練: ${checked}組＋正負/0・E052通常/合体/混在・恩寵・策士・対象外・2体加算・旧保存・実payloadパリティ`);
})().catch(e=>{console.error(e);process.exitCode=1;});
