'use strict';
// 2026-10-18 第2回。実データ・共通コア・PvEの入口をNodeで実行する（画面の確認ではない）。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const { makeElement } = require('./stub');
document.head = makeElement('head');
global.requestAnimationFrame = global.setInterval = () => 0;
console.table = () => {};
for (const m of fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if (!m[1].startsWith('http')) {
    const before=process.env.VB_RUNTIME_BASELINE&&path.join(process.env.VB_RUNTIME_BASELINE,m[1]);
    vm.runInThisContext(fs.readFileSync(before&&fs.existsSync(before)?before:path.join(ROOT,m[1]),'utf8'),{filename:m[1]});
  }
}
let checked = 0, failed = 0;
const unblessedResults=[];
async function check(name, fn) {
  if (process.env.VB_ONLY && !name.includes(process.env.VB_ONLY)) return;
  try { await fn(); checked++; console.log('OK ' + name); }
  catch (error) { failed++; console.error('NG ' + name + '\n' + (error.stack || error)); }
}
const copy = value => JSON.parse(JSON.stringify(value));
const def = no => PANEL_POOL.find(p => p.no === no);
const card = no => makePanel(def(no).id);
const dummy = (id, extra = {}) => ({ id, name: id, atk: 10000, hp: 1000000, maxHp: 1000000, keywords: [], ...extra });
function fresh() {
  initState(); G._debugMode = true; G._wave = 1; G.phase = 'reward'; G._waveLife = 3;
  _rewCards = []; G.mainBoard.fill(null); G._partyBoardUnit = null;
}
function formed(c, online = false) {
  fresh();
  if (c.category === 'キャラクター') {
    c.directions = ['left', 'right']; G.mainBoard[1] = c;
    if(c.no==='C099'){const e=card('E003');e.directions=['right'];G.mainBoard[0]=e;}
  }
  else { G.mainBoard[1] = card('C001'); G.mainBoard[1].directions = ['left']; c.directions = ['right']; G.mainBoard[0] = c; }
  const u = online ? buildOnlineSelfFormation().units[0]
    : buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered[0].unit;
  u.id = 'subject'; u.atk = 17; u.hp = u.maxHp = 10000;
  return copy(u);
}
function trigger(raw, kind, side = 'p1', extraAllies = []) {
  const other = side === 'p1' ? 'p2' : 'p1';
  const state = createBattleState({ sides: { [side]: { units: [raw, dummy('friend', { color: '赤', desc:'攻撃：1マナを得る。' }),...extraAllies] },
    [other]: { units: [dummy('foe1'), dummy('foe2'), dummy('foe3', { lane: 'rear' })] } },
    resources: { [side]: { mana: 4, gold: 200 } }, blood: { [side]: 9 }, stageNumber: 2,
    summonDefs: [...PANEL_POOL, ...ENEMY_POOL] });
  const unit = state.units[side][0], events = [], emit = e => events.push(e), rng = createSeededRng(1018);
  const hit = (s, t, a, c, ss, st, opt) => coreResolveHit(state, s, t, a, c, rng, emit,
    { skipSourceEffects: ss, skipTough: st, ...opt });
  unit._currentAttackTarget = state.units[other][0];
  if (kind === '開戦') coreApplyOpeningEffects(unit, state, rng, emit, hit);
  if (kind === '攻撃') coreApplyAttackEffects(unit, state, rng, emit, hit);
  if (kind === '負傷') coreApplyInjuryEffects(unit, 7, state, rng, emit, hit, state.units[other][0]);
  if (kind === '死亡') { unit.hp = 0; coreApplyDeathEffects(unit, state, rng, emit, hit); }
  if (kind === '解放') {unit._sealed=false;delete unit._sealValue;coreApplyReleaseEffects(unit, [], state, rng, emit, hit);}
  if (kind === 'マナ') coreApplyManaThresholdEffects(state, rng, emit, hit);
  if (kind === '味方攻撃') coreApplyAttackObservers(state.units[side][1], state, rng, emit, hit);
  if (kind === '味方死亡') coreApplyDeathObservers({ ...state.units[side][1], hp: 0 }, state, rng, emit, hit);
  if (kind === '結界喪失') coreApplyShieldLostEffects(state.units[side][1], state, rng, emit, hit);
  if (kind === 'ATK獲得') coreTriggerAtkGainEffects(unit,1,state,rng,emit,hit);
  let damageSourceId='subject';
  if (kind === '召喚後死亡') {
    const child=coreSummonUnit(state,side,{name:'緑ペリカン',atk:1,hp:10},emit,unit.id);
    assert.ok(child);child.hp=0;damageSourceId=child.id;coreApplyDeathEffects(child,state,rng,emit,hit);
  }
  return { state, events, unit, hits: events.filter(e => e.type === 'damage' && e.sourceId === damageSourceId && e.damageKind !== 'combat') };
}

(async () => {
  await loadGameData();
  await check('1：炎の矢はPvE編成・オンラインpayloadの両方で4→12、接続先の祝福は混ぜない', () => {
    for (const online of [false, true]) for (const side of ['p1', 'p2']) {
      const raw = card('E058'), blessed = copy(raw); coreApplyCardBoon(blessed, { dmgMul: 3 });
      const normal = trigger(formed(raw, online), 'マナ', side).hits;
      const bonus = trigger(formed(blessed, online), 'マナ', side).hits;
      assert.ok(normal.length); assert.deepEqual(bonus.map(e => e.amount), normal.map(e => e.amount * 3));
    }
  });
  await check('1：炎の矢の保存済み派生説明が祝福前でもカード本文の12ダメージを使う', () => {
    const c=card('E058');coreApplyCardBoon(c,{dmgMul:3});
    c._manaThresholdDesc=def('E058').desc.replace(/^\d+マナ毎：/,'');
    for(const online of [false,true]) assert.ok(trigger(formed(copy(c),online),'マナ').hits.every(e=>e.amount===12));
  });
  await check('1：ダメージを持つ全カード群のトリガを祝福なし／3倍・両陣営で比較', () => {
    const tested = [], misses = [];
    for (const definition of PANEL_POOL.filter(c => /ダメージ/.test(c.desc || '') && c.category !== 'スペル')) {
      const kinds = ['開戦', '攻撃', '負傷', '死亡', '解放'].filter(k => new RegExp(coreTriggerLabelPattern(k) + '[：:；]').test(definition.desc));
      if (/\d+マナ/.test(definition.desc)) kinds.push('マナ');
      if (/味方が攻撃するたび/.test(definition.desc)) kinds.push('味方攻撃');
      if (/味方が死亡するたび/.test(definition.desc)) kinds.push('味方死亡');
      if (/味方が結界を失うたび/.test(definition.desc)) kinds.push('結界喪失');
      if (/ATKを得るたび/.test(definition.desc)) kinds.push('ATK獲得');
      if (/味方の攻撃効果が発動するたび/.test(definition.desc)) kinds.push('味方攻撃');
      if (/召喚したキャラクターは「死亡/.test(definition.desc)) kinds.push('召喚後死亡');
      for (const kind of kinds) for (const online of [false, true]) for (const side of ['p1', 'p2']) {
        const raw = makePanel(definition.id), blessed = copy(raw); coreApplyCardBoon(blessed, { dmgMul: 3 });
        const a = trigger(formed(raw, online), kind, side), b = trigger(formed(blessed, online), kind, side);
        unblessedResults.push({card:definition.no,kind,online,side,hits:a.hits.map(e=>[e.unitId,e.amount]),
          units:Object.fromEntries(Object.entries(a.state.units).map(([side,list])=>[side,list.map(u=>[u.id,u.atk,u.hp,u.shield,u.poison||0])]))});
        if (!a.hits.length) continue; // 攻撃命令・毒発動などは効果ダメージではない。別途不変検査。
        tested.push(definition.no + '/' + kind);
        if (JSON.stringify(b.hits.map(e => e.amount)) !== JSON.stringify(a.hits.map(e => e.amount * 3)))
          misses.push(`${definition.no} ${definition.name}/${kind}/${online ? 'online' : 'PvE'}/${side}: ${a.hits.map(e => e.amount)} → ${b.hits.map(e => e.amount)}`);
      }
    }
    console.log('効果ダメージ対象：' + [...new Set(tested)].join('、'));
    assert.deepEqual(misses, []);
  });
  await check('1：同名の強化を通常＋祝福で接続しても各カードの値で発動する', () => {
    const misses = [];
    for (const [no, kind] of [['E006','死亡'],['E008', '攻撃'], ['E032', '負傷'], ['E035', '死亡'], ['E037','攻撃'], ['E058', 'マナ'], ['E067', '攻撃'], ['E070','召喚後死亡'], ['E077', '死亡']]) {
      for (const online of [false, true]) for (const side of ['p1', 'p2']) {
        const one = card(no), two = copy(one); coreApplyCardBoon(two, { dmgMul: 3 });
        fresh(); const c = card('C001'); c.directions = ['left', 'right']; one.directions = ['right']; two.directions = ['left'];
        G.mainBoard[0] = one; G.mainBoard[1] = c; G.mainBoard[2] = two;
        const raw = online ? buildOnlineSelfFormation().units[0] : buildBoardFormation(_getPartyBoardUnit(), { persistEternal: false }).ordered[0].unit;
        raw.id = 'subject'; raw.atk = 17; raw.hp = raw.maxHp = 10000;
        const h = trigger(raw, kind, side), amounts = h.hits.map(e => e.amount);
        if (!amounts.length) continue;
        if (no==='E077' ? amounts.some(n=>n!==40) : !amounts.some(n => amounts.includes(n * 3))) misses.push(no + '/' + online + '/' + side + ': ' + amounts);
      }
    }
    assert.deepEqual(misses, []);
  });
  await check('1：報酬化したボスの負傷・味方攻撃観測も3倍、両陣営で同一', () => {
    for(const [no,kind]of [['EN013','負傷'],['EN031','負傷'],['EN045','味方攻撃'],['EN075_2','味方攻撃']]){
      const definition=ENEMY_POOL.find(c=>c.no===no);assert.ok(definition,no);
      for(const online of [false,true])for(const side of ['p1','p2']){
        const raw=towerBoonMakeBossCard(definition),blessed=copy(raw);coreApplyCardBoon(blessed,{dmgMul:3});
        const a=trigger(formed(raw,online),kind,side).hits,b=trigger(formed(blessed,online),kind,side).hits;
        assert.ok(a.length,no);assert.deepEqual(b.map(e=>e.amount),a.map(e=>e.amount*3),no);
      }
    }
  });
  await check('1：援護射撃は実際の射手を置いて発動元の2→6、射手自身の祝福と混ぜない',()=>{
    for(const online of [false,true])for(const side of ['p1','p2']){
      const shooter=formed(card('E067'),online);shooter.id='shooter';
      const ordinary=card('E067'),blessed=copy(ordinary);coreApplyCardBoon(blessed,{dmgMul:3});
      const a=trigger(formed(ordinary,online),'攻撃',side,[shooter]);
      const b=trigger(formed(blessed,online),'攻撃',side,[shooter]);
      const values=h=>h.events.filter(e=>e.type==='damage'&&e.fxEffect==='援護射撃').map(e=>e.amount);
      assert.deepEqual(values(a),[2]);assert.deepEqual(values(b),[6]);
      const blessedShooter=copy(shooter);blessedShooter.boon={dmgMul:3};
      assert.deepEqual(values(trigger(formed(card('E067'),online),'攻撃',side,[blessedShooter])),[2]);
    }
  });
  await check('1：魔族の魂の永久減衰も個体の祝福に合わせ、12→11／36→33',()=>{
    for(const multiplier of [1,3])for(const side of ['p1','p2']){
      const c=card('E075');if(multiplier>1)coreApplyCardBoon(c,{dmgMul:multiplier});
      const h=trigger(formed(c),'攻撃',side),events=[],rng=createSeededRng(1018),emit=e=>events.push(e);
      const hit=(s,t,a,c,ss,st,opt)=>coreResolveHit(h.state,s,t,a,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...opt});
      coreApplyAttackEffects(h.unit,h.state,rng,emit,hit);
      assert.deepEqual(h.hits.map(e=>e.amount),[12,12,12].map(n=>n*multiplier));
      assert.deepEqual(events.filter(e=>e.type==='damage').map(e=>e.amount),[11,11,11].map(n=>n*multiplier));
    }
  });
  await check('1：指輪・アイテムは祝福対象外、装備者のdmgMulを受け継がない', () => {
    const run=blessed=>{
      fresh();const c=card('C001');if(blessed)coreApplyCardBoon(c,{dmgMul:3});
      const state=createBattleState({sides:{p1:{units:[formed(c)]},p2:{units:[dummy('foe')]}},resources:{p1:{mana:10}},
        rings:{p1:RING_POOL.filter(r=>['苦行の指輪','嵐の指輪'].includes(r.name))},items:{p1:[makeItem(ITEM_POOL.find(i=>i.itemEffectKey==='meteor_scroll').id)]}});
      const events=[],emit=e=>events.push(e),rng=createSeededRng(3);
      const hit=(s,t,a,c,ss,st,opt)=>coreResolveHit(state,s,t,a,c,rng,emit,{skipSourceEffects:ss,skipTough:st,...opt});
      coreApplyOpeningRings(state,rng,emit,hit);coreApplyOpeningItems(state,rng,emit,hit);coreApplyRingManaEffects(state,rng,emit,hit);
      return events.filter(e=>e.type==='damage').map(e=>e.amount);
    };
    assert.deepEqual(run(true),run(false));assert.ok(run(false).length>=3);
    for(const definition of [...RING_POOL,...ITEM_POOL]){
      fresh();G.towerBoons.counts.damage=1;const c=copy(definition);towerBoonBlessGeneratedCard(c);assert.equal(c.boon,undefined);
    }
  });
  await check('1・2：祝福なしの80編成は修正前と結果・ダメージ列を比較できる',()=>{
    const characters=PANEL_POOL.filter(c=>c.category==='キャラクター'&&!/^BC/.test(c.no));
    const enchants=PANEL_POOL.filter(c=>c.category==='エンチャント');
    for(let seed=1;seed<=80;seed++){
      const rng=createSeededRng(seed),sides={};
      for(const side of ['p1','p2']){
        sides[side]={units:[]};
        for(let i=0;i<3;i++){
          fresh();const c=makePanel(rng.pick(characters).id),e=makePanel(rng.pick(enchants).id);
          c.directions=['left'];e.directions=['right'];G.mainBoard[1]=c;G.mainBoard[0]=e;
          const u=copy(buildBoardFormation(_getPartyBoardUnit(),{persistEternal:false}).ordered[0]?.unit);
          if(u){u.id=side+'-'+i;sides[side].units.push(u);}
        }
      }
      const state=createBattleState({sides,summonDefs:[...PANEL_POOL,...ENEMY_POOL]}),events=[];
      const result=runBattleCore(state,createSeededRng(seed),{onEvent:e=>events.push(e),turnLimit:80});
      unblessedResults.push({seed,result,resources:state.resources,
        damage:events.filter(e=>e.type==='damage').map(e=>[e.unitId,e.sourceId,e.amount,e.hpAfter,e.damageKind]),
        units:Object.fromEntries(Object.entries(state.units).map(([side,list])=>[side,list.map(u=>[u.id,u.atk,u.hp,u.shield,u.poison||0])]))});
    }
  });
  await check('2：炎の矢2体・反復のコアイベントは各命中→毒→邪眼→ATK減少、結果不変', () => {
    for(const online of [false,true])for(const side of ['p1','p2']){
    const a = formed(card('E058'),online); a.keywords.push('毒牙2', '邪眼3');
    const b = copy(a); b.id = 'second';
    const h = trigger(a, 'マナ',side,[b]);
    assert.equal(h.events.filter(e=>e.type==='damage').length,2);
    const victims=h.state.units[side==='p1'?'p2':'p1'];
    assert.equal(victims.reduce((sum,u)=>sum+1000000-u.hp,0),8);
    assert.equal(victims.reduce((sum,u)=>sum+10000-u.atk,0),6);
    assert.equal(victims.reduce((sum,u)=>sum+(u.poison||0),0),4);
    for (let i = 0; i < h.events.length; i++) if (h.events[i].type === 'damage') {
      assert.deepEqual(h.events.slice(i + 1, i + 4).map(e => e.type + ':' + (e.effect || e.reason)),
        ['keyword_effect:poison', 'keyword_effect:evil_eye', 'stat_change:evil_eye']);
    }
    }
  });
  await check('2：マナ効果の先読みで次の矢やキーワードを先に再生しない', async () => {
    const a = dummy('a'), b = dummy('b'), foe = dummy('foe');
    const events = [{ type: 'mana_threshold', side: 'p1', unitId: 'a', effectNo: 'E058', cost: 2, wave: 1, desc: 'ランダムな敵に4ダメージを与える。' },
      { type: 'damage', side: 'p2', unitId: 'foe', sourceId: 'a', amount: 4, hpAfter: 96, effectNo: 'E058' },
      { type: 'keyword_effect', side: 'p2', unitId: 'foe', sourceId: 'a', effect: 'evil_eye', amount: 3 },
      { type: 'stat_change', side: 'p2', unitId: 'foe', sourceId: 'a', reason: 'evil_eye', atk: -3, hp: 0 }];
    events.push({ ...events[0], unitId: 'b' }, { ...events[1], sourceId: 'b' });
    const cues = [];
    await presentManaThresholdEvent(events[0], { findUnit: (side, id) => [a, b, foe].find(u => u.id === id),
      waveEvents: () => presentManaWaveEvents(events, 0), effectDamage: e => presentEffectDamageEvents(events, events.indexOf(e)),
      effectKeywords: d => presentEffectKeywordEvents(events, d), playCue: (units, opt) => cues.push({ units, opt }) });
    assert.ok(cues.every(c => c.units.every(u => u.targets.length === 0)), '矢と付随効果はdamageからイベント順に再生');
  });
  await check('2：共通damage再生は着弾・数値まで待ち、VFXの終了を待たず付随イベントへ進む',async()=>{
    const original=playProjectileEffectVfx;let shot;
    playProjectileEffectVfx=(from,fromSide,to,toSide,code,opt)=>{assert.equal(code,'E058');shot=opt;return new Promise(()=>{});};
    try{for(const mode of ['PvE','online']){
      shot=null;const trace=[],source=dummy('source'),target=dummy('target');let completed=false;
      const ev={type:'damage',side:'p2',unitId:'target',sourceId:'source',amount:4,hpAfter:96,effect:true,effectNo:'E058'};
      const pending=presentDamageEvent(ev,{findUnit:()=>target,findAnyUnit:()=>source,applyHp:(u,hp)=>{u.hp=hp;trace.push('hp:'+hp);}}).then(()=>{completed=true;});
      await Promise.resolve();await Promise.resolve();assert.ok(shot,mode);assert.equal(completed,false,mode);
      shot.onImpact();trace.push('damage:4');shot.onDamageShown();await pending;
      trace.push('keyword');assert.deepEqual(trace,['hp:96','damage:4','keyword']);
    }}finally{playProjectileEffectVfx=original;}
  });
  await check('2：描画本体は数値を出した後に着弾完了を通知する',async()=>{
    const originalPath=getEffectVfxPath,originalHit=playHitVfx,trace=[];
    getEffectVfxPath=()=>'';playHitVfx=()=>{trace.push('number');return Promise.resolve();};
    try{await playProjectileEffectVfx(dummy('a'),'ally',dummy('b'),'enemy','E058',{
      amount:4,onImpact:()=>trace.push('impact'),onDamageShown:()=>trace.push('shown')});}
    finally{getEffectVfxPath=originalPath;playHitVfx=originalHit;}
    assert.deepEqual(trace,['impact','number','shown']);
  });
  await check('2：同時対象の各命中のキーワードを固有VFXの終了後へ貯めない',()=>{
    if(typeof _presentLabClaimHitReactions!=='function')throw new Error('命中ごとのキーワード接続がない');
    const hits=['a','b'].map(id=>({type:'damage',side:'p2',unitId:id,sourceId:'s',amount:4,batch:'b1'}));
    const reactions=['a','b'].flatMap(id=>[{type:'keyword_effect',effect:'evil_eye',side:'p2',unitId:id,sourceId:'s'},
      {type:'stat_change',reason:'evil_eye',side:'p2',unitId:id,sourceId:'s',atk:-3,hp:0}]);
    const plan={members:hits};_presentLabClaimHitReactions(plan,[...hits,...reactions]);
    assert.equal(plan.hitReactions.size,4);assert.ok(reactions.every(e=>!presentLabEventHandled(e)));
    presentResetLabEvents();
  });
  await check('3：継戦では味方・新しい敵とも開戦を再発動しない（通常・保存経路）', () => {
    const first = createBattleState({ sides: { p1: {units:[dummy('opening', { desc: '開戦：1マナを得る。', manaOnAttack: 0 })]},
      p2: {units:[dummy('enemy', { desc: '開戦：2マナを得る。' })]} }, resources: { p1: { mana: 0, gold: 0 }, p2: { mana: 0, gold: 0 } } });
    const start = SaveRun.computeBattle(first, 42, { skipBattleEnd: true });
    assert.equal(start.events.filter(e => e.type === 'mana_gain' && e.reason === 'opening_mana').length, 2);
    const next = SaveRun.computeBattle(first, 42, { skipOpening: true, skipBattleEnd: true });
    assert.equal(next.events.filter(e => e.type === 'mana_gain' && e.reason === 'opening_mana').length, 0);
  });
  await check('3：実際の継戦入口はマナ効果の発動済み回数を消さない', async () => {
    fresh();G._arenaActive=true;G._arenaRound=2;G.mana=4;
    const raw=formed(card('E058'));G._arenaActive=true;G._arenaRound=2;G.mana=4;
    const mana=card('E058').desc.match(/^(\d+)マナ毎：(.+)$/),key=`${mana[1]}|1|${mana[2]}`;
    raw._manaFireCounts={[key]:2};G.allies=[raw];
    const original=generateArenaEnemies,stop=new Error('継戦初期化の検査境界');
    generateArenaEnemies=()=>{throw stop;};
    try{await assert.rejects(startBattle(),error=>error===stop);}finally{generateArenaEnemies=original;}
    assert.deepEqual(raw._manaFireCounts,{[key]:2});
  });
  await check('4：闘技場の引き分けは今回の勝利数を含めてやめる入口へ進む', async () => {
    fresh();G.phase='enemy'; G._arenaActive = true; G._arenaRound = 3; G._arenaWins = 2;
    const original = _arenaFinish, originalWait = _waitForPendingVfx,originalDefeat=arenaHandleBattleDefeat; let result;
    _arenaFinish = async (...args) => { result = args; }; _waitForPendingVfx = async () => {};
    arenaHandleBattleDefeat=async()=>{result=['lose',G._arenaWins];};
    try { await finishBattleAsVictory('Draw');await Promise.resolve(); } finally { _arenaFinish = original; _waitForPendingVfx = originalWait;arenaHandleBattleDefeat=originalDefeat; }
    assert.deepEqual(result, ['win', 3]); assert.equal(arenaPrizeForWins(result[1]), 100);
  });
  await check('4：保存なしの闘技場もコアの両者防戦の引き分けを勝利終了へ渡す',async()=>{
    fresh();G._arenaActive=true;G._arenaRound=2;G._arenaWins=1;G.phase='player';
    _bumpBattleRunId();
    G.allies=[dummy('a',{keywords:['防戦']})];G.enemies=[dummy('b',{keywords:['防戦']})];
    const finish=_arenaFinish,wait=_waitForPendingVfx,flush=_flushCorePveHitEvents,render=renderAll,controls=renderControls,compact=requestBattleCompact,clock=global.performance;let result,time=0;
    _arenaFinish=async(...args)=>{result=args;};_waitForPendingVfx=async()=>{};
    _flushCorePveHitEvents=async()=>{};renderAll=renderControls=requestBattleCompact=()=>{};
    global.performance={now:()=>time+=1000};
    try{await battlePhase();await Promise.resolve();}finally{
      _arenaFinish=finish;_waitForPendingVfx=wait;_flushCorePveHitEvents=flush;renderAll=render;renderControls=controls;requestBattleCompact=compact;
      global.performance=clock;
    }
    assert.deepEqual(result,['win',2]);
  });
  await check('6：依頼品・NPC・帰滅は両方向の交換不可、通常カードは交換可', () => {
    for (const peddler of [false, true]) for (const no of ['BC001', 'BC002', 'BC004', 'E102', 'E101']) {
      fresh(); G._isShop = true; G._isPeddler = peddler; G._wave = 3;
      G.mainBoard[0] = card(no); G.mainBoard[1] = card('C001'); _rewCards = [card('E003')];
      assert.equal(canExchangeShopCardAt(0, 0), false, no); assert.equal(exchangeShopCard(0, 0), false, no);
      _dragSrc = { arr: 'boardCards', idx: 0 }; assert.equal(_exchangeShopOfferDropAllowedAt(0), false); _dragSrc = null;
      assert.equal(canExchangeShopCardAt(0, 1), true);
    }
  });
  await check('6：魔族の魂はエルムで一度拒否・保存、到達前行商人は不可、以後は交換してQ001終了', () => {
    fresh(); G._isShop = true; G._waveVillage = true; G._wave = 1;
    G.mainBoard[0] = card('E075'); G.mainBoard[1] = card('C001'); _rewCards = [card('E003')];
    const entry=questDebugForceWaveQuest(1,'Q001');entry.status='accepted';entry.rewardCardTaken=true;
    const originalDialogue = showVillageShopSpecialDialogue, originalRender = renderHandEditor, originalRew = renderRewCards;
    let dialogues = 0; showVillageShopSpecialDialogue = async column => { assert.equal(column, '特殊台詞A1'); dialogues++; };
    renderHandEditor = renderRewCards = () => {};
    try {
      assert.equal(canExchangeShopCardAt(0, 0), true, '一度目は試みられる');
      assert.equal(exchangeShopCard(0, 0), false); assert.equal(dialogues, 1); assert.equal(G.mainBoard[0].no, 'E075');
      assert.equal(canExchangeShopCardAt(0, 0), false); exchangeShopCard(0, 0); assert.equal(dialogues, 1);
      G._runId='fixes-1018b';G._runSeed=1018;G._runRngState=1018;G._waveStage=_waveRouteForWave(1).lastIndexOf('city')+1;
      const saved = SaveRun.buildRunSave('town'); initState(); SaveRun.restoreRunState(saved); G._isShop = true; G.phase = 'reward';
      assert.equal(canExchangeShopCardAt(0, 0), false, '拒否済みはラン保存');
      G._isPeddler = true; assert.equal(canExchangeShopCardAt(0, 0), false);
      G._wave=2;G._waveVillage=false;G._waveStage=_waveRouteForWave(2).indexOf('city');assert.equal(canExchangeShopCardAt(0,0),false,'ヴァルガ到達前の行商人');
      G._wave = 2; G._waveVillage = true; G._isPeddler=false; assert.equal(canExchangeShopCardAt(0, 0), true, 'ヴァルガ到達後');
      assert.equal(exchangeShopCard(0,0),true);assert.equal(G.questProgress.Q001.status,'ended','最後の魂を交換すると終了');
    } finally { showVillageShopSpecialDialogue = originalDialogue; renderHandEditor = originalRender; renderRewCards = originalRew; }
  });
  console.log(`修正1018b：${checked}件OK / ${failed}件NG（画面は未確認）`);
  if(process.env.VB_RESULT_PATH)fs.writeFileSync(process.env.VB_RESULT_PATH,JSON.stringify(unblessedResults));
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
