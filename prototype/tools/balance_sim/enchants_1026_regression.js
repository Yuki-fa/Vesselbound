'use strict';
const H = require('./rules_1026_harness');
const {assert,sheet,copy,plain,card,enchanted,harness,initRun,pipelines,unchangedMain,REVISED_ENCHANTS} = H;
let passed=0, failed=0;
async function check(label,fn) { try { await fn(); passed++; console.log('OK '+label); } catch(e) { failed++; console.error('NG '+label+'\n'+e.stack); } }
const pair=text=>text.match(/\+(\d+)\/\+(\d+)/).slice(1).map(Number);
const attack=h=>coreApplyAttackEffects(h.u,h.state,h.rng,h.emit,h.hit);
const injury=h=>coreApplyInjuryEffects(h.u,3,h.state,h.rng,h.emit,h.hit);
const damage=h=>h.events.filter(e=>e.type==='damage'&&e.sourceId===h.u.id&&e.amount>0);
const totals=h=>h.own.map(u=>[u.atk,u.hp,u.maxHp]);
(async()=>{
  console.table=()=>{}; await loadGameData();
  const implementedEnchants=[...REVISED_ENCHANTS].filter(no=>card(no)._implemented!==false);
  for(const no of implementedEnchants) for(const enhanced of [false,true]) for(const modified of [false,true]) for(const side of ['p1','p2']) {
    const original=sheet.effectText(no,enhanced), text=modified?original.replace(/\d+/g,n=>String(Number(n)+2)):original;
    const label=`${no} ${card(no).name}/${enhanced?'強化':'通常'}/${modified?'数値差替':'シート'}/${side}`;
    await check(label,async()=>{
      let own=[enchanted(no,enhanced,text),plain('ally',{_mainBoardSlot:3}),plain('ally2',{_mainBoardSlot:11})];
      if(['E011','E047'].includes(no)) own[0].desc='攻撃：ランダムな敵にXダメージを与える。Xはマナに等しい。';
      if(['E023','E069'].includes(no)) own[0].desc='開戦：「青スケルトン」を召喚する。';
      if(['E063','E069'].includes(no)) own[0].keywords=['邪眼2','毒牙3','衝撃4'];
      if(no==='E074')own[1].keywords=['結界1'];
      if(no==='E040')own[1]._adjacentPanelEffectTexts=[text];
      if(no==='E055') own.forEach(u=>{u._uniteGroups=['enchant-slot-8'];u._adjacentPanelEffectTexts=[text];});
      const h=harness(side,own,no==='E047'?{foes:Array.from({length:8},(_,i)=>plain('foe'+i))}:{}), start=h.u.atk;
      switch(no) {
        case 'E011': {
          h.u.desc='攻撃：ランダムな敵にXダメージを与える。Xはマナに等しい。';
          const before=h.u.hp; attack(h);
          assert.deepEqual(damage(h).map(e=>e.amount),[7+Number(text.match(/\+(\d+)/)[1])]);
          h.events.length=0;h.u._coreAttackContact=true;h.hit(h.u,h.foes[0],2);delete h.u._coreAttackContact;
          assert.equal(damage(h)[0].amount,2,'通常攻撃は加算しない'); assert.equal(h.u.hp,before); break;
        }
        case 'E015': {
          h.u.hp=0; coreApplyDeathEffects(h.u,h.state,h.rng,h.emit,h.hit);
          const m=text.match(/敵(\d+)体に毒(\d+)/), repeats=sheet.effectRepetitions(text);
          assert.equal(h.foes.reduce((s,u)=>s+u.poison,0),Math.min(3,Number(m[1]))*Number(m[2])*repeats);
          const waves=new Map(); for(const e of h.events.filter(e=>e.effect==='poison')) waves.set(e.fxBatch,[...(waves.get(e.fxBatch)||[]),e.unitId]);
          for(const ids of waves.values())assert.equal(ids.length,new Set(ids).size);break;
        }
        case 'E016': {
          h.own[2].hp=0; coreTriggerBattleEnd(h.state,h.emit,h.rng);
          const e=h.events.find(e=>e.kind==='board_transform'); assert.ok(e); assert.equal(e.fromUnitId,'ally');
          assert.equal(e.mode,text.includes('本来')?'base':'copy');
          initRun(); const def=PANEL_POOL.find(c=>c.category==='キャラクター'&&c.name==='ノーム');
          G.mainBoard[7]=copy(PANEL_POOL.find(c=>c.category==='キャラクター'));G.mainBoard[3]={...copy(def),power:Number(def.power)+9,life:Number(def.life)+7};
          applyCoreRunEffectEvent({...e,side:'p1'});assert.equal(G.mainBoard[7].name,def.name);assert.equal(G.mainBoard[7].power,Number(def.power)+(text.includes('本来')?0:9));break;
        }
        case 'E019': {
          h.own[1].hp=0;coreApplyDeathObservers(h.own[1],h.state,h.rng,h.emit,h.hit);
          assert.equal(h.u.atk,start+pair(text)[0]);assert.equal(h.u.maxHp,100+pair(text)[1]);
          h.foes[0].hp=0;coreApplyDeathObservers(h.foes[0],h.state,h.rng,h.emit,h.hit);assert.equal(h.u.atk,start+pair(text)[0]);break;
        }
        case 'E020': {
          h.own[1].hp=80; h.foes[0].hp=70;
          const mul=Number((text.match(/キャラクターの(\d+)倍/)||[])[1])||1;
          attack(h);assert.equal(h.u.atk,start+pair(text)[0]*2*mul);assert.equal(h.u.maxHp,100+pair(text)[1]*2*mul);break;
        }
        case 'E022': case 'E044': {
          const amount=(no==='E022'?7:5)*(Number((text.match(/(?:マナ|血)の(\d+)倍/)||[])[1])||1);
          attack(h);assert.equal(h.u.atk,start+amount);assert.equal(h.u.maxHp,100+amount);break;
        }
        case 'E023': {
          coreSummonUnit(h.state,side,{name:'検査眷属',atk:2,hp:3,_fixedSummonStats:true},h.emit,'ally',false,h.rng,h.hit);
          assert.equal(h.u.atk,start+pair(text)[0]);assert.equal(h.u.maxHp,100+pair(text)[1]);
          coreSummonUnit(h.state,h.other,{name:'敵眷属',atk:2,hp:3,_fixedSummonStats:true},h.emit,'foe',false,h.rng,h.hit);assert.equal(h.u.atk,start+pair(text)[0]);break;
        }
        case 'E024': {
          const before=h.state.blood[side];h.hit(h.u,h.foes[0],1000);
          assert.equal(h.state.blood[side],before+Number(text.match(/血を(\d+)/)[1]),'倒した敵の死亡の血は敵陣営へ、渇望の血だけ味方へ');break;
        }
        case 'E040': {
          h.own[1]._adjacentPanelEffectTexts=[text];h.foes[0]._adjacentPanelEffectTexts=[text];injury(h);
          assert.equal(h.own[1].atk,5+pair(text)[0]);assert.equal(h.own[1].hp,100+pair(text)[1]);
          assert.equal(h.u.atk,start);assert.equal(h.own[2].atk,5);assert.equal(h.foes[0].atk,5);break;
        }
        case 'E042': attack(h);assert.deepEqual(damage(h).map(e=>e.amount),Array(sheet.effectRepetitions(text)).fill(7));assert.ok(damage(h).every(e=>e.effectSource===false));break;
        case 'E047': {
          h.u.desc='攻撃：ランダムな敵にXダメージを与える。Xはマナに等しい。';attack(h);
          const extra=Number(text.match(/対象は(\d+)体/)[1]);assert.equal(damage(h).length,Math.min(h.foes.length,1+extra));assert.equal(new Set(damage(h).map(e=>e.unitId)).size,Math.min(h.foes.length,1+extra));
          const a=harness(side,[enchanted(no,enhanced,text,{desc:'開戦：ランダムな味方に結界1を与える。'}),plain('ally'),plain('ally2'),plain('ally3')]);
          coreApplyOpeningEffects(a.u,a.state,a.rng,a.emit,a.hit);assert.equal(a.events.filter(e=>e.effect==='shield').length,(text.includes('味方、または敵')?Math.min(4,1+extra):1));
          const bag=harness(side,[enchanted(no,enhanced,text,{desc:'死亡：ランダムな敵2体に毒3を与える。'})],{foes:Array.from({length:8},(_,i)=>plain('foe'+i))});
          bag.u.hp=0;coreApplyDeathEffects(bag.u,bag.state,bag.rng,bag.emit,bag.hit);assert.equal(bag.events.filter(e=>e.effect==='poison').length,2+extra);
          const mana=harness(side,[enchanted(no,enhanced,text,{manaCost:1,manaRepeat:false,manaThresholdDesc:'ランダムな敵に2ダメージを与える。'})],{foes:Array.from({length:8},(_,i)=>plain('foe'+i,{desc:'負傷：このキャラクターは+1/+1を得る。'}))});
          coreApplyManaThresholdEffects(mana.state,mana.rng,mana.emit,mana.hit);const hits=damage(mana);assert.equal(hits.length,1+extra);assert.equal(new Set(hits.map(e=>e.batch)).size,1);
          assert.ok(mana.events.findLastIndex(e=>e.type==='damage')<mana.events.findIndex(e=>e.type==='stat_change'),'追加対象すべてへダメージを入れてから負傷を誘発');
          break;
        }
        case 'E055': {
          const incoming=modified?17:13;h.hit(h.foes[0],h.u,incoming);
          const split=text.includes('半分')?Math.ceil(incoming/2):incoming;
          assert.ok([Math.floor(split/3),Math.ceil(split/3)].includes(100-h.u.hp-(incoming-split)));
          assert.equal(h.own.reduce((s,u)=>s+100-u.hp,0),incoming);assert.ok(h.own.slice(1).every(u=>100-u.hp===Math.floor(split/3)||100-u.hp===Math.ceil(split/3)));
          const shield=harness(side,copy(own));shield.u.shield=1;shield.hit(shield.foes[0],shield.u,incoming);assert.ok(shield.own.every(u=>u.hp===100));assert.equal(shield.u.shield,0);
          const weak=harness(side,copy(own));weak.u.weaken=3;weak.hit(weak.foes[0],weak.u,incoming);assert.equal(weak.own.reduce((s,u)=>s+100-u.hp,0),incoming+3,'弱体は分散前の1回だけ');break;
        }
        case 'E056': {
          h.u.hp=0;const before=h.state.blood[side];coreApplyDeathEffects(h.u,h.state,h.rng,h.emit,h.hit);assert.equal(h.state.blood[side]-before,Number(text.match(/血を(\d+)/)[1]));break;
        }
        case 'E059': coreApplyAttackObservers(h.own[1],h.state,h.rng,h.emit,h.hit);assert.equal(h.u.atk,start+pair(text)[0]);assert.equal(h.u.maxHp,100+pair(text)[1]);break;
        case 'E062': {
          for(const atk of [4,5,8]) { const notice={};assert.equal(coreCounterDamage(h.u,{...h.foes[0],atk},notice),enhanced||atk<5?0:atk); }break;
        }
        case 'E063': {
          h.u.keywords=['邪眼2','毒牙3','衝撃4'];const add=Number(text.match(/\+(\d+)/)[1]);
          for(const [k,n]of [['邪眼',2],['毒牙',3],['衝撃',4]])assert.equal(coreKeywordSum(h.u,k),n+add);
          assert.equal(coreKeywordSum({...h.u,keywords:[]},'毒牙'),0);break;
        }
        case 'E064': {
          const c=card(no,enhanced,text),gain=Number(text.match(/(\d+)G/)[1]);assert.equal(coreAscensionSpec(c).gold,gain);
          initRun();G.gold=800;applyAscensionCardEffects([{card:c}]);assert.equal(G.gold,800+gain);const s=SaveRun.buildRunSave('reward');SaveRun.restoreRunState(s);assert.equal(G.gold,800+gain);break;
        }
        case 'E069': {
          h.u.keywords=['貫通','先制','毒牙2','魔術の知識'];const child=coreSummonUnit(h.state,side,{name:'検査眷属',atk:2,hp:3,_fixedSummonStats:true},h.emit,h.u.id,false,h.rng,h.hit);
          assert.equal(child.keywords.filter(k=>k!=='眷属').length,Math.min(3,Number(text.match(/(\d+)つ得る/)[1])));assert.ok(!child.keywords.includes('魔術の知識'));break;
        }
        case 'E074': attack(h);assert.deepEqual(h.state.runEffects[side].rewardBuff,{atk:0,hp:Number(text.match(/HP\+(\d+)/)[1])});break;
        default:throw Error(no);
      }
      await pipelines(h.initial);
    });
  }
  await check('実際の魔導板→共通編成で全戦闘エンチャントの本文・強化・数値差替を保持し、カード名をキーワードへ混ぜない',()=>{
    for(const no of implementedEnchants)for(const enhanced of [false,true]) {
      if(no==='E064')continue; // 還魂専用で接続効果を持たない。
      initRun();G.mapPanelPowers={1:'summon'};
      const base=makePanel(PANEL_POOL.find(c=>c.category==='キャラクター'&&c.name==='ノーム').id);
      base.desc='';base.keywords=[];base.directions=['left'];const c=card(no,enhanced);c.directions=['right'];
      G.mainBoard[1]=base;G.mainBoard[0]=c;
      const built=buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false});assert.equal(built.ordered.length,1,no);
      const u=built.ordered[0].unit;assert.ok(coreUnitEffectText(u).includes(c.desc),no+' 本文保持');
      assert.ok(!coreUnitKeywords(u).some(k=>[c.name,c.name+'+'].includes(k)),no+' 非キーワード');
      if(no==='E055')assert.deepEqual(u._uniteGroups,['0']);
    }
  });
  await check('精霊の魂 E041：通常・強化の現状だけ記録（別担当、変更しない）',()=>{
    const normal=coreAscensionSpec(card('E041')), enhanced=coreAscensionSpec(card('E041',true));
    console.log('  E041 現状 '+JSON.stringify({normal,enhanced}));assert.equal(enhanced.life,2);
  });
  await check('非対象のカード・指輪は開始時mainと結果・全イベント・次の乱数が完全一致',unchangedMain);
  console.log(`エンチャント1026: OK ${passed} / NG ${failed}`);process.exitCode=failed?1:0;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
