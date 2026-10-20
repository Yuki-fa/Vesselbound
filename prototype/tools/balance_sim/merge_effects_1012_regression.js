'use strict';
// 2026-10-12 利用者指定: 全キャラクター・全エンチャントの通常／合体を実際のloaderと共通コアで検査。
// 反復文の期待値は「反復を除いた本文を独立にN+1回発動した結果」。カード別の古い数値は置かない。
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const { sheetRows, effectRepetitions, damageRepetitions } = require('./sheet_data');
require('./load');
console.table=()=>{};
const internals = vm.runInNewContext(fs.readFileSync('js/battle/core.js', 'utf8') + '\n({coreFireWargThreshold,coreMataSplit,coreGainResource});', {});
const rows = [...sheetRows('card'), ...sheetRows('enchant')];
const copy = v => JSON.parse(JSON.stringify(v));
const words = t => String(t || '').split(/[\s　、,]+/).filter(Boolean);
const plain = (id, color = '赤', extra = {}) => ({ id, name: id, atk: 20, hp: 10000, maxHp: 10000, color,
  lane: 'rear', keywords: [], desc: '', ...extra });
function subjectFor(row, merged, override, includeRegular=false) {
  initState(); G._wave = 1; G.mainBoard.fill(null); G.mapPanelPowers = {1:'summon'};
  const def = PANEL_POOL.find(c => c.no === row['No.']);
  assert.ok(def, `${row['No.']} loaderに登録されていない`);
  const p = makePanel(def.id); if (merged) {applyMergedPanelForm(p);p.name+='+';p._tripleMerged=true;}
  if (override != null) p.desc = override;
  if (p.category === 'キャラクター') return { p, unit: _makePanelSummonUnit(_panelSummonSpec(p), []) };
  const base = makePanel(PANEL_POOL.find(c => c.no === 'C064').id);
  base.desc = ''; base.keywords = /キーワードの数/.test(p.desc) ? ['先制','隠密'] : []; base.manaOnAttack = 0; base.directions = includeRegular?['left','right']:['left'];
  p.directions = ['right']; G.mainBoard[1] = base; G.mainBoard[0] = p;
  if(includeRegular){const regular=makePanel(def.id);regular.directions=['left'];G.mainBoard[2]=regular;}
  const formation = buildBoardFormation(_getPartyBoardUnit(), {persistEternal:false});
  const entry = formation.ordered[0];
  entry.unit.boardCards = _panelSummonDisplayBoardCards(entry.panel, entry.contributingPanels);
  return { p, unit: entry.unit };
}
function exercise(row, merged, text, times = 1, side = 'p1', includeRegular=false) {
  const { p, unit: raw } = subjectFor(row, merged, text, includeRegular);
  const other = side === 'p1' ? 'p2' : 'p1';
  const subject = { ...raw, id:'subject', atk:20, hp:40, maxHp:40, _sealed:false, _sealInfinity:false, _sealValue:0 };
  if (text.includes('接続しているエンチャント')) subject.boardCards=[{category:'エンチャント',name:'接続1'},{category:'エンチャント',name:'接続2'}];
  if (/^(E0(?:29|52|68|69|70))$/.test(row['No.'])) {
    subject.effectData = {...subject.effectData, effectTexts:[...(subject.effectData?.effectTexts || []), '死亡：1マナを得る。']};
  }
  const allies = ['赤','青','緑','黄','紫','赤','緑'].map((c,i)=>plain('ally'+i,c));
  if (/負傷効果/.test(text)) allies.forEach(a=>{a.desc='負傷：このキャラクターは+1/+1を得る。';});
  if (/開戦効果/.test(text)) allies.forEach(a=>{a.desc='開戦：1マナを得る。';});
  if (/マナ効果を発動/.test(text)) allies.forEach(a=>Object.assign(a,{desc:'1マナ毎：このキャラクターは+1/+1を得る。',manaCost:1,manaRepeat:true,manaThresholdDesc:'このキャラクターは+1/+1を得る。'}));
  if (/この効果を持つ全ての味方/.test(text)) allies.forEach(a=>{
    a.effectData={effectNames:[p.name],effectTexts:[text]};a.boardCards=[p];
  });
  const foes = [0,1,2].map(i=>plain('foe'+i,'青',{lane:'front',hp:9999,maxHp:10000,atk:20,poison:2}));
  const cost = Number((text.match(/^(\d+)マナ/) || [])[1]) || 0;
  const state = createBattleState({sides:{[side]:{units:[subject,...allies]},[other]:{units:foes}},
    resources:{p1:{mana:cost||10,gold:1000},p2:{mana:cost||10,gold:1000}},blood:{p1:10,p2:10},life:{p1:1,p2:1},maxLife:{p1:3,p2:3},
    summonDefs:[...PANEL_POOL,...ENEMY_POOL],itemDefs:ITEM_POOL,frontSlots:30,maxUnits:40});
  const u=state.units[side][0], receiver=state.units[side][1]; u._currentAttackTarget=state.units[other][0];
  state.deadUnits=[plain('archived','青',{hp:0,atk:6,maxHp:10})];
  const events=[],emit=e=>events.push(e);
  const rng=createSeededRng(1012);if(/確率/.test(text))rng.next=()=>0;
  const hit=(a,b,n,c,_s,_t,o)=>coreResolveHit(state,a,b,n,c,rng,emit,o);
  const run=i=>{
    if (/^(開戦|攻撃|負傷|死亡|終戦|解放|\d+マナ)/.test(text)) {
      if (/^開戦/.test(text)) coreApplyOpeningEffects(u,state,rng,emit,hit,i);
      if (/^攻撃/.test(text)) {coreTriggerManaOnAttack(u,state,emit);coreApplyAttackEffects(u,state,rng,emit,hit,i);}
      if (/^(負傷|攻撃＆負傷)/.test(text)) coreApplyInjuryEffects(u,3,state,rng,emit,hit,state.units[other][0],i,'attack_effect');
      // 反復するのは効果。実際の死亡に伴う血+1を反復分へ混ぜない。
      if (/^死亡/.test(text)) {if(i>0)state.blood[side]=10;u.hp=0;delete u._coreDeathTriggered;delete u._coreDeathEffectsTriggered;coreTriggerDeath(u,state,emit);coreApplyDeathEffects(u,state,rng,emit,hit);}
      if (/^終戦/.test(text)) coreTriggerBattleEnd(state,emit,rng);
      if (/^解放/.test(text)) coreApplyReleaseEffects(u,[],state,rng,emit,hit);
      if (cost) coreApplyManaThresholdEffects(state,rng,emit,hit,{onlyUnitId:u.id,force:i>0});
    } else if (/このキャラクターは-X\/-X/.test(text)) coreRunOpening(state,rng,emit,hit,()=>{});
    else if (/味方の負傷効果が発動するたび/.test(text)) {
      receiver.desc='負傷：検査用の誘発。';coreApplyInjuryEffects(receiver,0,state,rng,emit,hit,null,i);
    } else if (/味方(?:の攻撃効果が発動|が攻撃)するたび/.test(text)) {
      receiver.desc='攻撃：検査用の誘発。';coreApplyAttackObservers(receiver,state,rng,emit,hit);
    } else if (/結界を失うたび/.test(text)) coreApplyShieldLostEffects(receiver,state,rng,emit,hit);
    else if (/ATKを得るたび/.test(text)) coreTriggerAtkGainEffects(u,1,state,rng,emit,hit);
    else if (/味方が7体/.test(text)) internals.coreFireWargThreshold(state,side,emit);
    else if (/解放された時/.test(text)) coreApplyReleaseEffects(receiver,[],state,rng,emit,hit);
    else if (/が(?:死亡するたび|死んだ時)/.test(text)) {
      const dead=/敵が/.test(text)?state.units[other][0]:receiver;dead.hp=0;delete dead._coreDeathObserved;
      coreApplyDeathObservers(dead,state,rng,emit,hit);
    } else if (/が召喚した|眷属が召喚され/.test(text)) {
      const child=coreSummonUnit(state,side,{name:'検査用の眷属',atk:10,hp:20},emit,u.id);
      if (/「死亡：/.test(text)) {child.hp=0;coreApplyDeathEffects(child,state,rng,emit,hit);}
    }
  };
  for(let i=0;i<times;i++)run(i);
  const score={};
  for(const e of events) {
    if(['effect_flash','battle_start','mana_threshold','sweep_vfx','death','compact','opening_step'].includes(e.type))continue;
    if(e.type==='blood_set') {if(e.gained&&e.sourceId)score.blood=(score.blood||0)+e.gained;}
    else if(e.type==='stat_change') {for(const k of ['atk','hp'])score['stat_'+k]=(score['stat_'+k]||0)+(Number(e[k])||0);}
    else if(e.type==='damage') {score.damage=(score.damage||0)+(Number(e.amount)||0);score.hits=(score.hits||0)+1;}
    else if(['mana_gain','gold_gain','life_gain'].includes(e.type))score[e.type]=(score[e.type]||0)+Number(e.amount||0);
    else if(e.type==='keyword_effect' && e.effect==='effect_gain') score.grant=(score.grant||0)+1;
    else score[e.type]=(score[e.type]||0)+1;
  }
  return {p,u,state,events,score,side,other};
}
function concrete(row,merged,text,result) {
  const {p,u,state,events,score,side,other}=result;
  const match=re=>text.match(re);
  let m;
  const repeats=effectRepetitions(text);
  if((m=match(/^(?:攻撃|負傷|死亡|終戦|開戦)：(\d+)(マナ|ゴールド)を得る。/))) {
    assert.equal(score[m[2]==='マナ'?'mana_gain':'gold_gain'],Number(m[1])*repeats);return;
  }
  if((m=match(/^(\d+)マナ(?:毎)?：/))) {
    assert.equal(p.manaCost,Number(m[1]),'発動マナは本文どおり');
    if(text.includes('全体攻撃を得る')) {assert.ok(u.keywords.includes('全体攻撃'));return;}
    const transform=match(/「([^」]+)」に変身する/);
    if(transform) {const target=PANEL_POOL.find(c=>c.name===transform[1]||c.color+c.name===transform[1]);assert.ok(target);
      assert.deepEqual([u.name,u.color,u.no],[target.name,target.color,target.no],'通常／合体の変身先は本文どおり');return;}
  }
  if((m=match(/全ての敵の毒を(?:(\d+)回)?発動させる/))) {
    assert.equal(score.stat_hp,-3*2*(Number(m[1])||1)*repeats,'毒の発動回数');return;
  }
  if((m=match(/このキャラクターの1\/1のコピーを(?:(\d+)体)?召喚する/))) {
    const children=events.filter(e=>e.type==='summon');assert.equal(children.length,(Number(m[1])||1)*repeats);
    const base=side==='p2'?coreEnemySummonStats(u):{atk:1,hp:1};
    assert.ok(children.every(e=>e.unit.atk===base.atk&&e.unit.hp===base.hp),'コピーの基本1/1（敵召喚は共通の80%規則）');return;
  }
  if((m=match(/全ての敵は-(\d+)\/-(\d+)を得る。この効果は、このキャラクターのHP(\d+)につき(\d+)回発生する/))) {
    const n=Math.floor(40/Number(m[3]))*Number(m[4]);
    assert.deepEqual([score.stat_atk,score.stat_hp],[-3*n*Number(m[1]),-3*n*Number(m[2])]);return;
  }
  if((m=match(/ランダムな味方に\+(\d+)\/\+(\d+)を付与する。この効果は、このキャラクターのATK(\d+)につき(\d+)回発生する/))) {
    const n=Math.floor(20/Number(m[3]))*Number(m[4]);
    assert.deepEqual([score.stat_atk,score.stat_hp],[n*Number(m[1]),n*Number(m[2])]);return;
  }
  if((m=match(/このキャラクターは(\d+)ダメージを(\d+)回受ける/))) {assert.equal(score.damage,Number(m[1])*Number(m[2]));return;}
  if((m=match(/召喚したキャラクターは結界(\d+)を得る/))) {
    assert.equal(events.find(e=>e.type==='summon').unit.shield,1,'結界Nも1つ');return;
  }
  if((m=match(/負傷している敵の数(?:の(\d+)倍|だけ)繰り返す/))) {
    const pair=match(/\+(\d+)\/\+(\d+)/),count=state.units[other].filter(x=>x.hp>0&&x.hp<x.maxHp).length*(Number(m[1])||1);
    assert.deepEqual([u.atk,u.maxHp],[20+Number(pair[1])*count,40+Number(pair[2])*count]);return;
  }
  if((m=match(/^\d+マナ毎：(?:全ての|ランダムな)([赤青緑黄紫])の味方は\+(\d+)\/\+(\d+)を得る/))) {
    const runs=repeats,count=text.includes('全ての')?state.units[side].filter(x=>x.color===m[1]).length:1;
    const buffs=events.filter(e=>e.type==='stat_change');assert.ok(buffs.every(e=>state.units[side].find(x=>x.id===e.unitId).color===m[1]));
    assert.deepEqual([score.stat_atk,score.stat_hp],[Number(m[2])*count*runs,Number(m[3])*count*runs]);return;
  }
  if((m=match(/([+-]\d+)\/([+-]\d+)を得る/))&&/^常時：このキャラクターは/.test(text)&&!text.includes('X')) {
    assert.deepEqual([p.adjacentAtkBonus||0,p.adjacentHpBonus||0],[Number(m[1]),Number(m[2])]);return;
  }
  if((m=match(/常時：このキャラクターはHP\+(\d+)/))) {assert.equal(p.adjacentHpBonus,Number(m[1]));return;}
  if((m=match(/このキャラクターの(死亡|攻撃|負傷|開戦|マナ|解放)効果は(\d+)回追加/))) {
    assert.equal(coreExtraTriggerTimes(u,m[1],1),Number(m[2]));return;
  }
  if(text.includes('ダメージを1にし')) {const split=internals.coreMataSplit(u,13);const d=text.includes('半分')?2:Number((match(/(\d+)分の1/)||[])[1])||1;assert.deepEqual(copy(split),{target:1,redirected:Math.floor(12/d)});return;}
  if((m=match(/緑の味方から得るマナは\+(\d+)/))) {
    const before=state.resources[side].mana;internals.coreGainResource(state,side,'mana',1,createCoreUnit(plain('green','緑'),side,9),()=>{},'fixture');assert.equal(state.resources[side].mana-before,1+Number(m[1]));return;
  }
  if((m=match(/紫の味方が与える戦闘修正の値は(\d+)/))) {
    coreRefreshVoidWalkerBonus(state);const source=state.units[side].find(x=>x.color==='紫');assert.equal(coreStatBonus(u,1,source),1+Number(m[1]));return;
  }
  // 2026-10-12: 現行C093は開戦で熟練Nを与え、旧常時補正は持たない。
  if((m=match(/全ての紫の味方は熟練(\d+)を得る/))) {
    for(const x of state.units[side].filter(x=>x.color==='紫')) {
      assert.equal(coreKeywordSum(x,'熟練'),Number(m[1]));
      assert.equal(x._voidWalkerBonus,0);
      assert.equal(coreStatBonus(state.units[other][0],-2,x),-2-Number(m[1]));
    }
    return;
  }
  if((m=match(/このキャラクターが与える戦闘修正の値は(\d+)/))) {assert.equal(coreStatBonus(state.units[side][1],1,u),1+Number(m[1]));return;}
  if((m=match(/味方の攻撃回数は(\d+)/))) {assert.equal(coreExtraAttackTotal(u,state.units[side],0),Number(m[1]));return;}
  if((m=match(/キーワードの数の(\d+)倍/))) {
    // 編成における常時値をシートの倍率とキーワード実数で確認する。
    const formed=subjectFor(row,merged).unit,base=PANEL_POOL.find(c=>c.no==='C064');
    assert.deepEqual([formed.atk,formed.maxHp],[base.power+2*Number(m[1]),base.life+2*Number(m[1])]);return;
  }
  if((m=match(/この効果を持つ味方の数の(\d+)倍/))) {
    assert.equal(coreFormationPassiveSpec(u).multiplier,Number(m[1]));
    const holders=[plain('holder1','赤',{desc:text,hp:40,maxHp:40}),plain('holder2','赤',{desc:text,hp:40,maxHp:40})];
    const formed=coreApplyFormationPassives(holders);assert.equal(formed.count,2);
    assert.ok(holders.every(x=>x.atk===20+2*Number(m[1])&&x.maxHp===40+2*Number(m[1])));return;
  }
  // 宿業の刻印（常時：-X/-X）は 2026-10-20 から内なる大力などと同じく編成の時点で入る（戦闘中のイベントは出ない）。
  if(text.includes('-X/-X')) {
    const formed=subjectFor(row,merged).unit,base=PANEL_POOL.find(c=>c.no==='C064');
    assert.ok(formed.atk<base.power||formed.atk===0,`ATKが編成で下がる ${formed.atk}/${base.power}`);
    assert.ok(formed.maxHp<base.life||formed.maxHp===0,`HPが編成で下がる ${formed.maxHp}/${base.life}`);return;
  }
  if(text.includes('ATKは常にHP')) {assert.equal(coreAttackDamage({...u,hp:13,atk:1},plain('target')),13);return;}
  if(text.includes('最もHPの低い敵')) {const foes=[plain('high'),plain('low','青',{hp:1})];assert.equal(coreSelectAttackTarget(u,foes,createSeededRng(4)).id,'low');return;}
  if(text.includes('分散される')) {assert.ok(u._uniteGroups?.length,'団結の接続が入力へ渡る');return;}
  if(text.includes('HPではなくATK')) {assert.ok(coreHasEffect(u,p.name),'ATKダメージの効果識別子が保持される');return;}
  if(text.includes('反撃ダメージを受けない')) {const notice={};assert.equal(coreCounterDamage(u,plain('foe','赤',{atk:1}),notice),0);return;}
  if(text.includes('敵を倒した時')) {
    const target=state.units[other][0];target.hp=1;const before=state.blood[side];hitKill(u,target,state,events);
    assert.equal(state.blood[side]-before,Number(match(/血を(\d+)得る/)[1]));return;
  }
  // 反復以外の数値変更も、本文の対象・値・倍率を実結果で確認する。
  if((m=match(/(?:このキャラクターの)?(?:ATKとHP|戦闘力)を(\d+)倍にする/))) {
    assert.deepEqual([u.atk,u.maxHp],[20*Number(m[1]),40*Number(m[1])]);return;
  }
  if((m=match(/このキャラクターのATKを(\d+)倍にする/))) {assert.equal(u.atk,20*Number(m[1]));return;}
  if((m=match(/このキャラクターのHPを(\d+)倍にする/))) {assert.equal(u.maxHp,40*Number(m[1]));return;}
  if((m=match(/マナを(\d+)倍にする/))) {assert.equal(state.resources[side].mana,10*Number(m[1]));return;}
  if((m=match(/全ての敵の毒を(\d+)倍/))) {assert.ok(state.units[other].every(x=>x.poison===2*Number(m[1])));return;}
  if((m=match(/封印Xを得て封印される。Xは現在の血の(\d+)倍/))) {assert.equal(u._sealValue,11*Number(m[1]));return;}
  if((m=match(/報酬に(\d+)枚/))) {assert.equal(events.filter(e=>e.type==='bonus_reward').length,Number(m[1]));return;}
  if((m=match(/(\d+)Gと引き換え/))) {assert.equal(1000-state.resources[side].gold,Number(m[1]));return;}
  if((m=match(/全ての敵に(?:弱体|毒)(\d+)/))) {
    const prop=text.includes('弱体')?'weaken':'poison';const runs=repeats;
    assert.ok(state.units[other].every(x=>x[prop]===(prop==='poison'?2:0)+Number(m[1])*runs));return;
  }
  if((m=match(/死亡：血を(\d+)得る/))) {assert.equal(score.blood,Number(m[1]));return;}
  if((m=match(/眷属が召喚された時、その眷属は\+(\d+)\/\+(\d+)/))) {
    const scale=Number((match(/眷属の(?:数の)?(\d+)倍/)||[])[1])||1;
    const child=events.find(e=>e.type==='summon').unit;assert.deepEqual([child.atk,child.hp],[(side==='p2'?16:10)+Number(m[1])*scale,(side==='p2'?32:20)+Number(m[2])*scale]);return;
  }
  if(text.includes('接続しているエンチャント')) {
    const scale=Number((match(/数の(\d+)倍/)||[])[1])||1;
    if((m=match(/敵に(\d+)ダメージ/))) assert.equal(score.damage,2*scale*Number(m[1]));
    else {const pair=match(/\+(\d+)\/\+(\d+)/),targets=state.units[side].filter(x=>x.color==='紫').length;
      assert.equal(score.stat_atk,2*scale*Number(pair[1])*targets);assert.equal(score.stat_hp,2*scale*Number(pair[2])*targets);}
    return;
  }
  if((m=match(/この戦闘で死んだ敵の数(?:の(\d+)倍)?(?:だけ)?繰り返す/))) {assert.equal(u.atk,20+(Number(m[1])||1));return;}
  if((m=match(/死亡：ランダムな敵に(\d+)ダメージ/))&&text.includes('が召喚した')) {
    const granted=text.match(/「(死亡：[^」]+)」/)[1];
    assert.equal(score.damage,Number(m[1])*damageRepetitions(granted));return;
  }
  if(text.includes('確率で即死')) return; // 境界と独立判定は下で別に確認する。
  if(!text || !/^(?:常時|開戦|攻撃|負傷|死亡|解放|終戦|\d+マナ)/.test(text)) return; // 荷物・クエスト・刻印の戦闘外の文。
  assert.ok(Object.keys(score).length>0,`${row['No.']} ${merged?'合体':'通常'} 効果が空振り: ${text}`);
}
function hitKill(u,target,state,events) {
  const emit=e=>events.push(e),rng=createSeededRng(3);
  coreResolveHit(state,u,target,100,false,rng,emit);
}
// 2026-10-12: PvEの開戦→手番および旧死亡／解放入口も、同じ本文のコア結果と比較する。
async function pveBridgeChecks() {
  let checked=0;
  const reset=state=>{
    initState();G.mainBoard.fill(null);G.allies=state.units.p1;G.enemies=state.units.p2;
    G._battleCoreEvents=[];G._coreDrivenBattle=false;G._enemyDeathsThisBattle=0;
    G.activeBattleItems=[];G.rings=[];G.mana=0;G.gold=0;G._blood=0;G._enemyBlood=0;
    _keepPveSummonState({});
  };
  const hellhound=rows.find(r=>r['No.']==='C086');
  for(const merged of [false,true]) {
    const desc=String(merged?hellhound['合体効果']:hellhound['効果']);
    const input={sides:{p1:{units:[plain('hound1','赤',{desc}),plain('p1-a'),plain('p1-b')]},
      p2:{units:[plain('hound2','赤',{desc}),plain('p2-a'),plain('p2-b')]}}};
    const actual=createBattleState(input),expected=createBattleState(input);
    const actualById=new Map([...actual.units.p1,...actual.units.p2].map(u=>[u.id,u]));
    const expectedById=new Map([...expected.units.p1,...expected.units.p2].map(u=>[u.id,u]));
    reset(actual);
    // 開戦で最初の敵が死亡した後、通常手番へ切り替わっても両側の累計を保つ。
    actual.units.p2[1].hp=0;expected.units.p2[1].hp=0;
    coreApplyDeathObservers(actual.units.p2[1],actual,createSeededRng(1012),()=>{},()=>{});
    coreApplyDeathObservers(expected.units.p2[1],expected,createSeededRng(1012),()=>{},()=>{});
    _keepPveSummonState(actual);G._enemyDeathsThisBattle=1;
    const continued=_createPveCoreState();
    assert.deepEqual(continued._coreEnemyDeaths,expected._coreEnemyDeaths,'PvEの開戦死亡数が手番で消えた');
    _keepPveSummonState(continued);
    for(const [side,id] of [['p1','p1-a'],['p2','p2-b'],['p1','p1-b']]) {
      const dead=actualById.get(id);dead.hp=0;expectedById.get(id).hp=0;
      if(side==='p2')G._enemyDeathsThisBattle++;
      await _applyDeathKeywordEffects(dead,side==='p2');
      coreApplyDeathObservers(expectedById.get(id),expected,createSeededRng(1012),()=>{},()=>{});
      for(const s of ['p1','p2']) {const a=actualById.get(s==='p1'?'hound1':'hound2'),e=expectedById.get(a.id);assert.deepEqual(
        [a.atk,a.maxHp],[e.atk,e.maxHp],`${s} ${merged?'合体':'通常'} PvEの旧死亡入口で累計が不一致`);}
      checked++;
    }
    const completed=_createPveCoreState();assert.deepEqual(completed._coreEnemyDeaths,expected._coreEnemyDeaths);
    assert.equal(_createPveCoreState()._coreEnemyDeaths,undefined,'一時状態は一度だけ渡す');
  }
  const walker=rows.find(r=>/全ての紫の味方は熟練\d+を得る/.test(r['効果']||''));
  const release=rows.find(r=>r['No.']==='E057');
  assert.ok(walker&&release,'解放・紫修正のシート本文がない');
  for(const merged of [false,true])for(const releaseMerged of [false,true])for(const side of ['p1','p2']) {
    const other=side==='p1'?'p2':'p1';
    const desc=String(merged?walker['合体効果']:walker['効果']);
    const releaseDesc=String(releaseMerged?release['合体効果']:release['効果']);
    // 2026-10-12: 改名した付与元も開戦で熟練を与えてから解放する。
    const input={sides:{[side]:{units:[plain('release','紫',{desc:releaseDesc}),plain('renamed-walker','紫',{desc})]},[other]:{units:[plain('foe')]}}};
    const actual=createBattleState(input),expected=createBattleState(input);
    for(const state of [actual,expected])coreApplyOpeningEffects(state.units[side][1],state,createSeededRng(1012),()=>{},()=>{});
    const a=actual.units[side][0],e=expected.units[side][0];
    reset(actual);
    await _applyReleaseEffect(a,side==='p2',[]);
    coreApplyReleaseEffects(e,[],expected,createSeededRng(1012),()=>{},()=>{});
    assert.deepEqual([a.atk,a.maxHp],[e.atk,e.maxHp],`${side} PvEの解放入口で紫修正が旧値になる`);
    checked++;
    _createPveCoreState();
  }
  // 熟練は邪眼のATK減少を補正する。状態異常の衝撃（弱体値）は補正しない。
  for(const merged of [false,true])for(const side of ['p1','p2'])for(const color of ['紫','赤'])for(const sealed of [false,true]) {
    const other=side==='p1'?'p2':'p1',desc=String(merged?walker['合体効果']:walker['効果']);
    const value=color==='紫'&&!sealed?Number(desc.match(/熟練(\d+)/)[1]):0;
    const state=createBattleState({sides:{[side]:{units:[plain('attacker',color,{keywords:['邪眼2','衝撃2']}),
      plain('renamed-walker','紫',{desc,_sealed:sealed,keywords:sealed?['封印1']:[]})]},[other]:{units:[plain('target')]}}});
    coreApplyOpeningEffects(state.units[side][1],state,createSeededRng(1012),()=>{},()=>{});
    reset(state);const source=state.units[side][0],target=state.units[other][0];
    assert.equal(coreKeywordSum(source,'熟練'),value,'開戦の熟練付与値');
    coreApplyKeywordOnHit(source,target,1,target.hp,state,()=>{});
    assert.deepEqual([target.atk,target.weaken],[20-2-value,2],'熟練はATK減少だけを補正');checked++;
  }
  return checked;
}
(async()=>{
  await loadGameData();let checked=0,repeats=0;
  for(const row of rows) {
    for(const merged of [false,true]) {
      const desc=String((merged?row['合体効果']:row['効果'])||row['効果']||'').trim();
      const loaded=subjectFor(row,merged).p;
      assert.equal(loaded.desc,desc,`${row['No.']} 本文がloaderで上書きされた`);
      const kw=words((merged?row['合体キーワード']:row['キーワード'])||row['キーワード']);
      if(kw.length) for(const k of kw) assert.ok((loaded.keywords||loaded.adjacentKeywords||[]).includes(k)||(loaded.adjacentKeywords||[]).includes(k),`${row['No.']} ${k}`);
      for(const side of ['p1','p2']) {
        const result=exercise(row,merged,desc,1,side);concrete(row,merged,desc,result);
        for(const k of kw) {
          const numeric=k.match(/^(衝撃|毒牙|邪眼|結界)(\d+)$/);
          if(numeric) assert.ok(coreKeywordSum(result.u,numeric[1])>=(numeric[1]==='結界'?1:Number(numeric[2])));
        }
        const suffix=desc.match(/。(?:これ|この判定)を(?:(\d+)回|もう一度)繰り返す。$/);
        if(suffix&&!desc.includes('即死')) {
          const primitive=desc.slice(0,suffix.index)+'。';
          const count=effectRepetitions(desc),expected=exercise(row,merged,primitive,count,side);
          assert.deepEqual(result.score,expected.score,`${row['No.']} ${side} 合計${count}回: ${desc}`);repeats++;
        }
        checked++;
      }
    }
  }
  // 通常と合体の同時接続も本文ごとに発動する。倍率は順に掛け、その他は両本文の量を足す。
  const mixedFailures=[];let mixedChecked=0;
  for(const row of sheetRows('enchant').filter(r=>r['合体効果']&&r['合体効果']!==r['効果']&&/^(開戦|攻撃|負傷|死亡|終戦|解放|\d+マナ)/.test(r['効果']||''))) {
    for(const side of ['p1','p2'])try{
      const regular=exercise(row,false,row['効果'],1,side),merged=exercise(row,true,row['合体効果'],1,side);
      const mixed=exercise(row,true,row['合体効果'],1,side,true);
      const mul=String(row['合体効果']).match(/このキャラクターの(ATK|HP)を(\d+)倍/);
      if(mul){const basic=Number(row['効果'].match(/を(\d+)倍/)[1]),prop=mul[1]==='ATK'?'atk':'maxHp';
        assert.equal(mixed.u[prop],(mul[1]==='ATK'?20:40)*basic*Number(mul[2]));}
      else {const expected={...regular.score};for(const [key,value] of Object.entries(merged.score))expected[key]=(expected[key]||0)+value;
        assert.deepEqual(mixed.score,expected);}
      mixedChecked++;
    }catch(e){mixedFailures.push(`${row['No.']} ${side}: ${e.message}`);}
  }
  assert.equal(mixedFailures.length,0,mixedFailures.join('\n'));
  // 5%の境界、2回目・3回目だけの成功、0ダメージでは判定しない。名前変更にも追従する。
  const basilisk=rows.find(r=>r['No.']==='C059');
  for(const merged of [false,true]) for(const side of ['p1','p2']) {
    const text=String(merged?basilisk['合体効果']:basilisk['効果']);
    const prob=Number(text.match(/(\d+)%/)[1])/100,rep=effectRepetitions(text)-1;
    for(let success=0;success<=rep;success++) {
      const source=plain('s','緑',{desc:text,name:'改名された体',lane:'front'}),target=plain('t','青',{lane:'front'});
      const other=side==='p1'?'p2':'p1';const state=createBattleState({sides:{[side]:{units:[source]},[other]:{units:[target]}}});
      let calls=0;const rng={next:()=>calls++===success?prob-0.0001:prob,int:()=>0,pick:a=>a[0]};const events=[];
      coreResolveHit(state,state.units[side][0],state.units[other][0],1,false,rng,e=>events.push(e));
      assert.equal(events.filter(e=>e.type==='instant_death').length,1);assert.equal(calls,success+1);
    }
    const run=exercise(basilisk,merged,text,1,side);let calls=0;
    coreResolveHit(run.state,run.u,run.state.units[run.other][0],0,false,{next:()=>{calls++;return 0;}},()=>{});assert.equal(calls,0);
  }
  const bridges=await pveBridgeChecks();
  console.log(`2026-10-12 全効果: ${rows.length}行 × 通常/合体 × 両陣営 = ${checked}件、本文反復 ${repeats}件、通常＋合体接続 ${mixedChecked}件、PvE状態引継ぎ ${bridges}件、確率境界 OK`);
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
