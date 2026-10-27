'use strict';
// 2026-10-27 指示書1〜16。内蔵CSV→本番loader→編成→コア→保存／オンラインを検査する。
// --presentation は独立した仮DOMで本番の表示待ちも実行する（ブラウザ・聴感の確認ではない）。
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const BASELINE = 'cd10e80491ce7434eba63f19bcb503228c1076fd';
const REVISED = new Set('E004 E005 E009 E017 E024 E027 E038 E042 E047 E052 E063 E065 E069 E074 C068'.split(' '));
module.exports={BASELINE,REVISED};
let passed = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
const copy = value => JSON.parse(JSON.stringify(value));
const summary = () => { console.log(`効果1027: OK ${passed} / NG ${failed}`); process.exitCode = failed ? 1 : 0; };

async function presentation() {
  const P = require('./presentation_1020b_harness');
  const { makeElement } = require('./stub');
  await P.ready;
  const getElement = document.getElementById, field = makeElement();
  field.isConnected = true;
  field.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 300, right: 800, bottom: 300 });
  document.getElementById = id => ['f-ally','f-enemy'].includes(id) ? field : getElement(id);
  for (const mode of ['pve','online']) {
    await check(`1 ${mode}: 相打ちの永久強化は現在HPを戻さず、魔導板にはHP増分を渡す`, async () => {
      const owner=P.enchantUnit('killer','E005',{atk:4,hp:4,maxHp:4,_mainBoardSlot:1});
      const x=P.setup({sides:{p1:{units:[owner]},p2:{units:[P.unit('victim',null,{atk:4,hp:4,maxHp:4})]}}});
      coreHitAll(x.state,x.rng,x.emit,(_s,t,n,c,ss,st,o)=>x.hit(t.id==='killer'?x.find('victim'):x.find('killer'),t,n,c,ss,st,o),null,[x.find('killer'),x.find('victim')],4);
      const apply=presentStatChangeEvent,persist=persistBoardCharacterStats,seen=[],written=[];
      presentStatChangeEvent=async(ev,api)=>apply(ev,{...api,applyStats:(u,e)=>{api.applyStats(u,e);if(e.reason==='kill_permanent_buff')seen.push(presentShownHp(u));}});
      persistBoardCharacterStats=(_board,slot,atk,hp)=>{written.push([slot,atk,hp]);return true;};
      try{await x[mode]();assert.deepEqual(seen,[0]);assert.deepEqual(written,[[1,3,3]]);}
      finally{presentStatChangeEvent=apply;persistBoardCharacterStats=persist;}
    });
    await check(`3 ${mode}: 前衛なし→後衛死亡→不死の指輪→召喚の表示待ちが完了する`, async () => {
      const x = P.setup({ sides: { p1: { units: [P.unit('rear', null, { lane: 'rear', atk: 1, hp: 1, maxHp: 1 })] },
        p2: { units: [P.unit('foe', null, { atk: 8 })] } }, rings: { p1: [P.card('R017','ring')] }, summonDefs: PANEL_POOL });
      coreBattleStep({ state: x.state, units: x.state.units, rng: x.rng, emit: x.emit, applyHit: x.hit,
        side: 'p2', decided: () => null, resolveSeals: () => {} });
      assert.equal(x.events.filter(e => e.type === 'summon').length, 3);
      await x[mode]();
      assert.equal(P.calls.filter(c => c.name === 'battle-summon').length, 3);
      assert.ok(P.calls.some(c => c.name === 'undying-ring'));
    });
    await check(`4 ${mode}: 天の魔弓は既存E042の演出に接続する`, async () => {
      const x = P.setup({ sides: { p1: { units: [P.enchantUnit('archer','E042')] }, p2: { units: [P.unit('foe')] } }, resources: { p1: { mana: 7 } } });
      coreApplyAttackEffects(x.find('archer'),x.state,x.rng,x.emit,x.hit);
      assert.equal(x.events.filter(e => e.type === 'damage')[0].amount,7);
      await x[mode]();
      assert.ok(P.calls.some(c => /centaur|E042/.test(c.name)), JSON.stringify(P.calls.map(c => c.name)));
    });
    await check(`6 ${mode}: バンダースナッチの変身は敵の発動表示を作らない`, async () => {
      const x = P.setup({ sides: { p1: { units: [P.unit('caster','C068')] }, p2: { units: [P.unit('victim','C064')] } }, resources: { p1: { mana: 6 } }, summonDefs: PANEL_POOL });
      coreApplyManaThresholdEffects(x.state,x.rng,x.emit,x.hit);
      const ev = x.events.find(e => e.type === 'transform');
      assert.equal(ev.sourceId,'caster');
      const source = presentActionBannerSourceUnfiltered(ev,actionBannerPresentationApi());
      assert.equal(source.card.name,'バンダースナッチ');
      await x[mode]();
      assert.ok(P.calls.some(c => c.name === 'bandersnatch'));
      assert.ok(!P.calls.some(c => c.name === 'dragonnet'));
    });
  }
  await check('3: rendererの完了・命中通知が途切れても召喚を表示し、PvE待ちを解放する', async () => {
    const x = P.setup({ sides: { p1: { units: [P.unit('child')] }, p2: { units: [P.unit('foe')] } } });
    const play = VbFx.play;
    VbFx.play = () => new Promise(() => {});
    try {
      await playSummonAppearVfx(x.find('child'),'ally');
      await _waitForPendingVfx();
      assert.equal(getCurrentUnitSlot('ally',x.find('child')).style.getPropertyValue('visibility'),'');
      assert.equal(window.__activeVfxPromises.size,0);
    } finally { VbFx.play = play; }
  });
  summary();
}

async function main() {
  const H = require('./rules_1026_harness');
  const { sheet, plain, card, enchanted, harness, initRun, pipelines } = H;
  console.table = () => {}; await loadGameData();
  const attack = h => coreApplyAttackEffects(h.u,h.state,h.rng,h.emit,h.hit);
  const hits = h => h.events.filter(e => e.type === 'damage' && e.sourceId === h.u.id && e.amount > 0);
  function unit(no, extra = {}) {
    const def = PANEL_POOL.find(c => c.no === no);
    return { ..._makePanelSummonUnit(_panelSummonSpec(makePanel(def.id)),[]), id: no,
      effectData: { releaseAtkBonus: 0, releaseHpBonus: 0 }, ...extra };
  }
  function formed(no, enhanced = false, baseNo = 'C006') {
    initRun(); G.mainBoard.fill(null); G.mapPanelPowers = { 1: 'summon' };
    const c = card(no,enhanced); c.directions = ['right'];
    const base = makePanel(PANEL_POOL.find(c => c.no === baseNo).id); base.directions = ['left'];
    G.mainBoard[0] = c; G.mainBoard[1] = base;
    const board = _getPartyBoardUnit();
    const result = buildBoardFormation(board,{persistEternal:false}).ordered[0].unit;
    result.id = 'source';
    result.effectData = { releaseAtkBonus: 0, releaseHpBonus: 0, ...result.effectData };
    result.boardCards = _panelSummonDisplayBoardCards(base,_collectEnhancementPanelsForSlot(board,1));
    return result;
  }
  for (const side of ['p1','p2']) for (const enhanced of [false,true]) {
    const tag = `${side}/${enhanced?'強化':'通常'}`;
    await check(`1 ${tag}: 相打ちで渇望・執念の炎、HPは0のまま、永久値は魔導板へ書く`, async () => {
      const e = card('E005',enhanced), thirst = card('E024',enhanced);
      const source = plain('source',{atk:4,hp:4,maxHp:4,_mainBoardSlot:1,
        boardCards:[e,thirst],_adjacentPanelEffectTexts:[e.desc,thirst.desc]});
      const h = harness(side,[source],{foes:[plain('foe',{atk:4,hp:4,maxHp:4})]});
      const blood = h.state.blood[side];
      coreHitAll(h.state,h.rng,h.emit,
        (_source,target,amount,counter,skipSource,skipTough,options) => h.hit(target === h.u ? h.foes[0] : h.u,target,amount,counter,skipSource,skipTough,options),
        null,[h.u,h.foes[0]],4);
      // coreHitAllの通常入口も使い、相打ちのダメージを全員へ入れてから誘発する。
      if(h.u.hp>0||h.foes[0].hp>0) throw new Error('相打ちになっていない');
      const m=e.desc.match(/永久に\+(\d+)\/\+(\d+)/), gain=Number(m[1]);
      const event=h.events.find(e=>e.reason==='kill_permanent_buff');
      assert.ok(event); assert.equal(h.u.hp,0); assert.equal(event.hp,0); assert.equal(event.persistentHp,gain);
      assert.equal(h.state.blood[side]-blood,1+Number(thirst.desc.match(/血を(\d+)/)[1]));
      initRun(); G.mainBoard[1]=makePanel(PANEL_POOL.find(c=>c.no==='C006').id);
      const old=[G.mainBoard[1].power,G.mainBoard[1].life];
      assert.ok(_persistPermanentStatOrWarn(_getPartyBoardUnit(),event));
      assert.deepEqual([G.mainBoard[1].power,G.mainBoard[1].life],old.map(n=>n+gain));
      const stacked=harness(side,[plain('stacked',{_adjacentPanelEffectTexts:[thirst.desc,thirst.desc]})]);
      const before=stacked.state.blood[side];stacked.hit(stacked.u,stacked.foes[0],1000);
      assert.equal(stacked.state.blood[side]-before,2*Number(thirst.desc.match(/血を(\d+)/)[1]),'接続した渇望を全て発動する');
      await pipelines(h.initial);
    });
    await check(`2 ${tag}: 黒い波動は即死キーワードを付けず、本文の5%だけで判定する`, () => {
      const u=formed('E004',enhanced), c=card('E004',enhanced);
      assert.ok(!_enchantPreviewKeywords(c).includes('即死'));
      assert.ok(!coreUnitKeywords(u).includes('即死'));
      assert.ok(!_keywordOnlyPreviewText(c,c.desc).includes('即死'));
      assert.ok(!_keywordOnlyPreviewText(u,u.desc,0).includes('即死'));
      const h=harness(side,[u]); let calls=0;
      h.rng.next=()=>{calls++;return .99;}; h.hit(h.u,h.foes[0],1);
      assert.equal(h.foes[0].hp,99); assert.equal(calls,enhanced?2:1);
      h.rng.next=()=>0; h.hit(h.u,h.foes[0],1);
      assert.equal(h.foes[0].hp,0); assert.ok(h.events.some(e=>e.type==='instant_death'));
    });
    await check(`3 ${tag}: 不死の指輪は前衛なしで開戦時に一度だけ、復活する前衛がいれば待つ`, async () => {
      const ring=copy(RING_POOL.find(r=>r.no==='R017'));
      const h=harness(side,[plain('rear',{lane:'rear'})],{rings:{[side]:[ring]}});
      coreRunOpening(h.state,h.rng,h.emit,h.hit,()=>{});
      assert.equal(h.events.filter(e=>e.type==='summon').length,3);
      assert.ok(h.state.units[side].filter(u=>u.lane!=='rear').every(u=>coreUnitHasKeyword(u,'眷属')));
      assert.equal(coreCheckUndyingRing(h.state,h.emit,h.rng,h.hit),false);
      const r=harness(side,[plain('front',{keywords:['復活']})],{rings:{[side]:[ring]}});
      r.hit(r.foes[0],r.u,1000);assert.ok(r.u.hp>0);
      assert.equal(coreCheckUndyingRing(r.state,r.emit,r.rng,r.hit),false);
      await pipelines(h.initial);
    });
    await check(`4 ${tag}: 魔導板からの天の魔弓、マナ相当ダメージと既存演出の発生元`, async () => {
      const h=harness(side,[formed('E042',enhanced)]);attack(h);
      assert.deepEqual(hits(h).map(e=>e.amount),Array(enhanced?2:1).fill(7));
      assert.ok(hits(h).every(e=>e.effectSource===false&&e.fxEffect==='天の魔弓'));
      await pipelines(h.initial);
    });
    await check(`5 ${tag}: 栄光の歌は後から得た結界を含む現在の所持から選び、実際に結界を張る`, async () => {
      const h=harness(side,[enchanted('E069',enhanced,undefined,{name:'ミテーラ'})]);
      coreGrantShield(h.u,h.emit); // 開戦後の付与。unit.keywords には書き込まない。
      const child=coreSummonUnit(h.state,side,{name:'緑ペリカン'},h.emit,h.u.id,false,h.rng,h.hit);
      assert.equal(child.shield,1);
      assert.ok(h.events.some(e=>e.effect==='shield'&&e.unitId===child.id));
      h.u.shield=0;
      const next=coreSummonUnit(h.state,side,{name:'緑ペリカン'},h.emit,h.u.id,false,h.rng,h.hit);
      assert.ok(!(next.shield>0),'失った結界は抽選しない');
      const initial=copy(h.initial);initial.units[side][0].desc='開戦：「緑ペリカン」を召喚する。';initial.units[side][0].shield=1;
      await pipelines(initial);
    });
    await check(`6 ${tag}: 敵の変身イベントの発生元はバンダースナッチ`, async () => {
      const c=makePanel(PANEL_POOL.find(c=>c.no==='C068').id);
      const source=unit('C068',{manaThresholdDesc:sheet.effectText('C068',enhanced).split('：').slice(1).join('：')});
      const h=harness(side,[source],{resources:{p1:{mana:6},p2:{mana:6}}});
      coreApplyManaThresholdEffects(h.state,h.rng,h.emit,h.hit);
      const transforms=h.events.filter(e=>e.type==='transform');
      assert.equal(transforms.length,enhanced?2:1); assert.ok(transforms.every(e=>e.sourceId===h.u.id));
      assert.ok(c); await pipelines(h.initial);
    });
    await check(`7 ${tag}: 即死にも通常死亡と同じPvE撃破ゴールドが付く`, () => {
      const h=harness(side,[plain('killer',{keywords:['即死']})],{foes:[plain('gold',{hp:99,maxHp:99,goldRange:[13,13]})]});
      h.hit(h.u,h.foes[0],1);
      assert.ok(h.events.some(e=>e.type==='death'&&e.unitId==='gold'));
      const initial=copy(h.initial);initial.units.p2=[{...createCoreUnit(plain('gold',{hp:99,maxHp:99}),'p2',0),goldRange:[13,13]}];
      initial.units.p1=[createCoreUnit(plain('killer',{keywords:['即死']}),'p1',0)];
      const saved=SaveRun.computeBattle(initial,1027);
      const death=saved.events.find(e=>e.type==='death'&&e.unitId==='gold');
      const paid=saved.events.find(e=>e.type==='instant_death'&&e.unitId==='gold');
      assert.ok(death);assert.ok(paid);assert.equal(paid.pveRewardGold,13);
      assert.equal(saved.events.filter(e=>e.unitId==='gold'&&e.pveRewardGold>0).length,1);
      initRun();SaveRun.installSetup(saved);const gold=G.gold;G._savedBattleReplaying=true;
      const victim=G.enemies.find(u=>u.id==='gold');victim.hp=0;
      SaveRun.recordDeath(victim,'p2',paid);SaveRun.recordDeath(victim,'p2',death);G._savedBattleReplaying=false;
      assert.equal(G.gold,gold+13);
    });
    await check(`8 ${tag}: 献身は本人以外へ血相当ATK、HPは変えない`, async () => {
      const h=harness(side,[enchanted('E065',enhanced),plain('ally')]);h.u.hp=0;
      coreApplyDeathEffects(h.u,h.state,h.rng,h.emit,h.hit);
      const events=h.events.filter(e=>e.reason==='devotion');
      assert.equal(events.length,enhanced?2:1);assert.ok(events.every(e=>e.unitId==='ally'&&e.atk===5&&e.hp===0));
      await pipelines(h.initial);
    });
    await check(`9 ${tag}: 狂気は攻撃で血${enhanced?2:1}、他の死亡マナを重複させない`, async () => {
      const h=harness(side,[formed('E009',enhanced)]); const before=h.state.blood[side];attack(h);
      assert.equal(h.state.blood[side]-before,enhanced?2:1);assert.equal(h.state.resources[side].mana,7);
      await pipelines(h.initial);
    });
    await check(`10 ${tag}: マナの種は20%を毎回独立判定、rngと保存・オンラインが一致`, async () => {
      const h=harness(side,[formed('E027',enhanced)]), values=[.19,.20];let n=0;
      h.rng.next=()=>values[n++];coreApplyInjuryEffects(h.u,1,h.state,h.rng,h.emit,h.hit);
      assert.equal(n,enhanced?2:1);assert.equal(h.state.resources[side].mana,8);
      assert.equal(h.events.filter(e=>e.reason==='injury_chance_mana').length,1);
      await pipelines(h.initial);
    });
    await check(`11 ${tag}: 猫の加護は味方の結界喪失だけで+3/+2（強化2倍）`, async () => {
      const h=harness(side,[formed('E038',enhanced),plain('shielded',{shield:1})]);
      const before=[h.u.atk,h.u.hp];h.hit(h.foes[0],h.own[1],1);
      assert.deepEqual([h.u.atk,h.u.hp],[before[0]+(enhanced?6:3),before[1]+(enhanced?4:2)]);
      const current=h.u.atk;h.foes[0].shield=1;h.hit(h.u,h.foes[0],1);assert.equal(h.u.atk,current);
      await pipelines(h.initial);
    });
    await check(`12 ${tag}: 漲る力は報酬・トレーダーのHPをラン全体へ加算・保存`, async () => {
      const h=harness(side,[formed('E074',enhanced)]);attack(h);
      assert.deepEqual(h.state.runEffects[side].rewardBuff,{atk:0,hp:enhanced?2:1});
      const event=h.events.find(e=>e.type==='run_effect'); initRun();applyCoreRunEffectEvent({...event,side:'p1'});
      const save=SaveRun.buildRunSave('reward');initRun();SaveRun.restoreRunState(save);
      assert.deepEqual(G.runEffects.rewardBuff,{atk:0,hp:enhanced?2:1});
      await pipelines(h.initial);
    });
    await check(`13 ${tag}: 卓越は接続から熟練${enhanced?2:1}を得る`, async () => {
      const h=harness(side,[formed('E052',enhanced)]);assert.equal(coreKeywordSum(h.u,'熟練'),enhanced?2:1);
      assert.equal(coreStatBonus(h.u,3,h.u),3+(enhanced?2:1));
      assert.ok(!coreUnitKeywords(h.u).includes('卓越'));await pipelines(h.initial);
    });
    await check(`14 ${tag}: 策士は持つキーワードだけの説明・加算後の表示、後付け衝撃に追随`, async () => {
      const u=formed('E063',enhanced,'C110'); // 所持キーワードは下でスリン相当に固定する。
      u.keywords=['邪眼2','毒牙3'];
      const bonus=enhanced?2:1;
      const text=()=>_unitPreviewText(u,u.desc,0);
      assert.ok(text().includes(`「策士」の効果で邪眼、毒牙の値が+${bonus}された。`),text());
      assert.ok(_unitDisplayKeywords(u,u.desc,0).includes('邪眼'+(2+bonus)));
      const h=harness(side,[u]);coreGrantOpeningKeyword(h.u,'衝撃4',h.u,h.emit,h.state,h.rng,h.hit);
      assert.ok(_unitPreviewText(h.u,h.u.desc,0).includes(`邪眼、毒牙、衝撃の値が+${bonus}された。`));
      assert.ok(_unitDisplayKeywords(h.u,h.u.desc,0).includes('衝撃'+(4+bonus)));
      await pipelines(h.initial);
    });
  }
  await check('15: 原始の武器は血盟と同じ接続経路で3色を調べ、編成表示とオンライン送信に反映する', async () => {
    for(const enhanced of [false,true]) for(const complete of [false,true]) {
      initRun();G.mainBoard.fill(null);G.mapPanelPowers={2:'summon',5:'summon',7:'summon',11:'summon'};
      const weapon=card('E017',enhanced);weapon.directions=['right'];G.mainBoard[0]=weapon;
      for(const [slot,dirs] of [[1,['left','right','down']],[6,['up','right','down','left']]]) G.mainBoard[slot]={...card('E001'),desc:'',adjacentKeywords:[],adjacentAtkBonus:0,adjacentHpBonus:0,directions:dirs};
      for(const [slot,color,dir] of [[2,'赤','left'],[5,'黄','right'],[7,complete?'緑':'黄','left'],[11,'青','up']]) G.mainBoard[slot]={...makePanel(PANEL_POOL.find(c=>c.no==='C006').id),color,desc:'',keywords:[],directions:[dir]};
      const board=_getPartyBoardUnit(), f=buildBoardFormation(board,{persistEternal:false});
      assert.equal(f.ordered.length,4);
      for(const e of f.ordered) {
        const active=complete&&e.unit._mainBoardSlot===5;
        const kw=enhanced?'三段攻撃':'二段攻撃';assert.equal(coreUnitKeywords(e.unit).includes(kw),active);
        assert.equal(coreExtraAttackCount(e.unit),active?(enhanced?2:1):0);
        const enh=_collectAdjacentEnhancements(board,e.unit._mainBoardSlot),raw=G.mainBoard[e.unit._mainBoardSlot];
        const preview={...raw,boardCards:G.mainBoard,keywords:[...raw.keywords,...enh.keywords]};
        assert.equal(_unitDisplayKeywords(preview,raw.desc,e.unit._mainBoardSlot).includes(kw),active,'編成時の実際のキーワード欄');
      }
      const payload=buildOnlineSelfFormation();assert.ok(payload.units.every(u=>coreExtraAttackCount(u)===(complete&&u._mainBoardSlot===5?(enhanced?2:1):0)));
      const h=harness('p1',f.ordered.map((e,i)=>({...e.unit,id:'unit'+i,effectData:{releaseAtkBonus:0,releaseHpBonus:0,...e.unit.effectData}})));await pipelines(h.initial);
    }
  });
  await check('16: 乱れ撃ちは敵だけ増やし、コカトリスの即死は対象ごとの独立判定', async () => {
    for(const side of ['p1','p2']) for(const enhanced of [false,true]) {
      const source=enchanted('E047',enhanced,undefined,{manaCost:1,manaThresholdDesc:'ランダムな敵を50%の確率で即死させる。'});
      const h=harness(side,[source]);let n=0;
      // 対象選択はintを固定、確率判定だけnextを読み、片方だけ当たる状況を作る。
      h.rng.int=()=>0;h.rng.next=()=>[.1,.9,.9][n++];
      coreApplyManaThresholdEffects(h.state,h.rng,h.emit,h.hit);
      assert.equal(n,enhanced?3:2);assert.equal(h.events.filter(e=>e.type==='instant_death').length,1);
      const ally=harness(side,[enchanted('E047',enhanced,undefined,{desc:'開戦：ランダムな味方に結界を与える。'}),plain('ally'),plain('ally2')]);
      coreApplyOpeningEffects(ally.u,ally.state,ally.rng,ally.emit,ally.hit);
      assert.equal(ally.events.filter(e=>e.effect==='shield').length,1);
      const damage=harness(side,[enchanted('E047',enhanced,undefined,{desc:'攻撃：ランダムな敵にXダメージを与える。Xはマナに等しい。'})]);attack(damage);
      assert.equal(hits(damage).length,enhanced?3:2);assert.equal(new Set(hits(damage).map(e=>e.batch)).size,1);
      await pipelines(h.initial);
    }
  });
  await check('対象外のカードはloaderを通した入力データも開始時と完全一致', () => {
    const script=String.raw`
      const fs=require('node:fs'),{execFileSync}=require('node:child_process');
      const source=execFileSync('git',['show',process.argv[1]+':prototype/js/data/loader.js'],{encoding:'utf8',maxBuffer:2e6});
      const read=fs.readFileSync;
      fs.readFileSync=function(file,...args){return String(file).endsWith('/js/data/loader.js')?source:read.call(this,file,...args);};
      require('./tools/balance_sim/load');console.table=()=>{};
      loadGameData().then(()=>console.log(JSON.stringify(PANEL_POOL))).catch(e=>{console.error(e);process.exitCode=1;});`;
    const output=execFileSync(process.execPath,['-e',script,BASELINE],{
      cwd:require('node:path').resolve(__dirname,'../..'),encoding:'utf8',timeout:20000,maxBuffer:4e6});
    const previous=JSON.parse(output.trim().split('\n').at(-1));
    const unchanged=list=>copy(list.filter(card=>!REVISED.has(card.no)));
    assert.deepEqual(unchanged(PANEL_POOL),unchanged(previous));
  });
  await check('対象外の通常・強化カード、敵、指輪は開始時mainと結果・全イベント・次の乱数まで完全一致', () => {
    const source=execFileSync('git',['show',`${BASELINE}:prototype/js/battle/core.js`],{encoding:'utf8',maxBuffer:2e6});
    const sandbox={module:{exports:{}}};vm.runInNewContext(source,sandbox);
    const baseline=sandbox.module.exports,current=require('../../js/battle/core');let count=0;
    const run=(api,input)=>{const state=api.createBattleState(copy(input)),events=[],rng=createSeededRng(271027);
      const result=api.runBattleCore(state,rng,{turnLimit:6,onEvent:e=>events.push(e)});
      return copy({result,events,finalState:api.battleCoreFinalState(state),nextRandom:rng.next()});};
    for(const row of [...sheet.sheetRows('card'),...sheet.sheetRows('enchant')]) if(!REVISED.has(row['No.'])) for(const enhanced of [false,true]) {
      // 合流済みの改訂は各専用回帰で検査し、旧版との一致には含めない。
      if(row['No.']==='E066'||row['No.']==='C016'&&enhanced)continue;
      const def=PANEL_POOL.find(c=>c.no===row['No.']);if(!def)continue;
      const c={...copy(def),desc:(enhanced?row['強化効果']:'')||row['効果']||''};
      const own=def.category==='キャラクター'?{..._makePanelSummonUnit(_panelSummonSpec(c),[]),id:'source',atk:10,hp:70,maxHp:70}:plain('source',{_adjacentPanelEffectTexts:[c.desc],boardCards:[c]});
      for(const side of ['p1','p2']) {const other=side==='p1'?'p2':'p1';
        const input={sides:{[side]:{units:[own,plain('ally')]},[other]:{units:[plain('foe',{hp:5,maxHp:5}),plain('foe2')]}},resources:{[side]:{mana:8,gold:800}},summonDefs:PANEL_POOL};
        assert.deepEqual(run(current,input),run(baseline,input),`${row['No.']}/${enhanced}/${side}`);count++;
      }
    }
    for(const def of ENEMY_POOL) {
      const input={sides:{p1:{units:[plain('ally',{hp:70,maxHp:70})]},p2:{units:[{...copy(def),id:'enemy',atk:8,hp:70,maxHp:70}]}},summonDefs:PANEL_POOL};
      assert.deepEqual(run(current,input),run(baseline,input),def.name);count++;
    }
    for(const ring of RING_POOL.filter(r=>!['R017','R019'].includes(r.no))) for(const side of ['p1','p2']) {
      const input={sides:{p1:{units:[plain('source'),plain('ally')]},p2:{units:[plain('foe'),plain('foe2')]}},rings:{[side]:[ring]},resources:{p1:{mana:15,gold:800},p2:{mana:15,gold:800}},summonDefs:PANEL_POOL};
      assert.deepEqual(run(current,input),run(baseline,input),ring.no+'/'+side);count++;
    }
    assert.ok(count>850);console.log(`  非対象 ${count} ケースで完全一致（基準 ${BASELINE.slice(0,7)}）`);
  });
  await check('仮DOMでPvE／オンラインの演出受け口と中断したVFX待ちを検査',()=>{
    const output=execFileSync(process.execPath,[__filename,'--presentation'],{encoding:'utf8',timeout:45000,maxBuffer:1e6});
    assert.match(output,/効果1027: OK 9 \/ NG 0/,'未解決Promiseで子プロセスが終了していないこと');
    console.log(output);
  });
  summary();
}
if(require.main===module) (process.argv.includes('--presentation')?presentation():main()).catch(e=>{console.error(e.stack);process.exitCode=1;});
