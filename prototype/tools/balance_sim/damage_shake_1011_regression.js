'use strict';
// 2026-10-11: 通常攻撃・攻撃効果・反撃・効果ダメージ × 1/2/3倍 × PvE/オンラインを1本で再現。
// 2026-10-12 利用者指定：振動するのは攻撃で与えた大ダメージだけ（反撃・攻撃効果・効果ダメージでは振動しない）。
const assert = require('node:assert/strict');
const h = require('./presentation_1011_harness');
const unit = (id, atk, desc = '') => ({id, name:id, atk, hp:1000, maxHp:1000, lane:'front', keywords:[], desc});
function fixture(kind, amount = 80) {
  const state = createBattleState({sides:{
    p1:{units:[unit('attacker',kind==='normal'?amount:1,kind==='attack_effect'?`攻撃：全ての敵に${amount}ダメージを与える。`:''),unit('helper',1)]},
    p2:{units:[unit('target',kind==='counter'?amount:1)]},
  }});
  const before = h.copy(state), events = [];
  if(kind==='effect') coreWithDamageKind(state,'other',()=>coreResolveHit(state,state.units.p1[0],state.units.p2[0],amount,false,
    createSeededRng(7),e=>events.push(e),{effect:true,skipSourceEffects:true}));
  else runBattleCore(state,createSeededRng(7),{turnLimit:1,onEvent:e=>events.push(e)});
  return {state,before,events};
}
(async()=>{
  await h.ready;
  let checked=0;
  for(const kind of ['normal','attack_effect','counter','effect']) for(const speed of [1,2,3]) for(const online of [false,true]) {
    const run=fixture(kind), expected=run.events.filter(e=>e.type==='damage'&&e.amount>=50);
    assert.equal(expected.length,1,kind+'の大ダメージは1件');
    h.setup(online?h.copy(run.before):run.state,speed);
    assert.equal(optionBattleSpeedMultiplier(),speed);
    await h.replay(online?h.copy(run.before):run.state,run.events,online);
    const shakes=h.trace.filter(e=>e.type==='shake'),hits=h.trace.filter(e=>e.type==='hit'&&e.amount>=50);
    const label=`${kind} ${speed}倍 ${online?'オンライン':'PvE'}`;
    assert.equal(hits.length,1,label+' ダメージ表示は1回');
    if(kind!=='normal') { assert.equal(shakes.length,0,label+' 攻撃以外（反撃・攻撃効果・効果）は振動しない'); checked++; continue; }
    assert.equal(shakes.length,1,label+' 振動は1回');
    assert.equal(shakes[0].amount,expected[0].amount,label+' 確定ダメージで強さを決める');
    assert.equal(shakes[0].time,hits[0].time,label+' ダメージ表示と同じ時刻');
    const back=h.trace.find(e=>e.type==='return');
    // 2026-10-11: モーションが欠落した再現を通さず、Chromeと同じ戻り完了の条件を検査する。
    if(kind!=='effect') {
      assert.ok(back,label+' 攻撃者の戻り完了');
      assert.ok(shakes[0].time<back.time,label+' 戻る前に振動を始める');
    }
    checked++;
  }
  // 既存の閾値・振幅・長さの境界。弱い多段ダメージを合算しない。
  assert.deepEqual(BATTLE_SCREEN_SHAKE_TIERS.map(t=>[t.min,t.max??null,t.amplitude,t.duration]),
    [[50,74,7,150],[75,99,11,180],[100,149,16,220],[150,199,22,260],[200,null,30,320]]);
  for(const amount of [49,50,74,75,99,100,149,150,199,200]) {
    const run=fixture('normal',amount);h.setup(run.state);await h.replay(run.state,run.events);
    assert.equal(h.trace.filter(e=>e.type==='shake').length,amount<50?0:1); checked++;
  }
  // 同じイベントを接触と後続ループから渡しても振動を重複しない。
  const ev={type:'damage',amount:80,damageKind:'combat'};presentResetLabEvents();h.trace.length=0;
  presentDamageImpact(ev);presentDamageImpact(ev);assert.equal(h.trace.filter(e=>e.type==='shake').length,1);
  const assertImpact=label=>{
    const hits=h.trace.filter(e=>e.type==='hit'&&e.amount>=50),shakes=h.trace.filter(e=>e.type==='shake');
    // 効果ダメージ（飛び道具・範囲・ライブ効果）は数値だけ出し、振動しない（2026-10-12）。
    assert.equal(hits.length,1,label+' 数値は1回');assert.equal(shakes.length,0,label+' 効果ダメージは振動しない');checked++;
  };
  // 絵を描く境界だけを置換し、範囲・飛び道具の実際の共通受け口を通す。
  playCurvedMissile=async opt=>{h.advance(420);await opt.onHit();};
  const shot=fixture('effect'),shotEv=shot.events.find(e=>e.type==='damage');
  shotEv.fxEffect=PANEL_POOL.find(c=>c.no==='E058').name;shotEv.effectSource=false;h.setup(shot.state);
  await presentDamageEvent(shotEv,{findUnit:(side,id)=>shot.state.units[side].find(u=>u.id===id),findAnyUnit:id=>Object.values(shot.state.units).flat().find(u=>u.id===id)});
  assertImpact('飛び道具の着弾');
  playCharacterSweepVfx=async(_src,_enemy,targets,_url,opt)=>{h.advance(180);targets.forEach(t=>opt.onTargetHit(t));return true;};
  playExpandingWaveVfx=async(_src,_side,targets,_code,opt)=>{h.advance(180);targets.forEach(t=>opt.onTargetHit(t));return true;};
  for(const no of ['C058','C016']) {
    const run=fixture('effect'),ev=run.events.find(e=>e.type==='damage');h.setup(run.state);
    const source={...PANEL_POOL.find(c=>c.no===no),...run.state.units.p1[0]},target=run.state.units.p2[0];
    source.fxCode=no;
    assert.ok(await presentSweepAttack(source,false,[target],()=>ev,()=>{}));
    await presentDamageEvent(ev,{findUnit:()=>target,alreadyShown:()=>true});assertImpact(no+' 範囲の到達と表示済みガード');
  }
  const live=fixture('effect');h.setup(live.before);
  await applyDamageBatch([{unit:live.before.units.p2[0],side:'enemy',amount:80,source:live.before.units.p1[0]}],{effect:true});
  assertImpact('ライブ効果ダメージ');
  console.log(`ダメージ振動: ${checked}件OK（24組合せ＝攻撃だけ振動・反撃／攻撃効果／効果は振動しない＋閾値境界＋飛び道具・範囲・ライブ効果）`);
})().catch(e=>{console.error(e);process.exitCode=1;});
