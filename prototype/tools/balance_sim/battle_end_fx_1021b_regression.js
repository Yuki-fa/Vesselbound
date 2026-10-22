'use strict';
// 2026-10-21の4件。実際のコアと両再生入口を使い、DOM境界・時計だけを置き換える。
// VB_SOURCE_REF=<修正前のコミット> でも同じ検査を走らせ、各項目の再現を確かめられる。
const assert = require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const h = require('./presentation_1020b_harness');
let failed = 0, checked = 0;
async function check(name, run) {
  try { await run(); checked++; console.log('OK ' + name); }
  catch (e) { failed++; console.error('NG ' + name + '\n' + e.stack); }
}
const definition = no => {
  const card = [...PANEL_POOL, ...ENEMY_POOL].find(c => c.no === no);
  assert.ok(card, no); return h.clone(card);
};
const notes = text => {
  const plain=text.replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const match = plain.match(/(\d+)\/(\d+)の「青スケルトン」/);
  assert.ok(match, text); return match.slice(1).map(Number);
};

// 実レンダラーを手動rAFで動かす。遅れて来た最初のフレームと最終フレームも検査する。
function rendererClock() {
  let now=0,sequence=0;const frames=new Map(),timers=[];
  const drawing=()=>new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},
    {get:(o,k)=>k in o?o[k]:()=>{}});
  const element=()=>({nodeType:1,dataset:{},children:[],isConnected:true,offsetWidth:95,offsetHeight:140,
    style:{setProperty(){},removeProperty(){},getPropertyValue:()=>'',getPropertyPriority:()=>''},
    getContext:drawing,querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,hasAttribute:()=>false,
    appendChild(child){this.children.push(child);child.parentNode=this;return child;},remove(){this.isConnected=false;},
    getBoundingClientRect:()=>({left:100,top:200,width:95,height:140,right:195,bottom:340})});
  const body=element(),ctx={console,URL,Uint8ClampedArray,Path2D:class{},innerWidth:1280,innerHeight:800,devicePixelRatio:1,
    addEventListener(){},removeEventListener(){},performance:{now:()=>now},
    requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout:(_fn,ms)=>{timers.push(ms);return ++sequence;},clearTimeout(){},
    getComputedStyle:()=>({visibility:'visible',display:'block',opacity:'1',filter:'none',transform:'none'}),
    document:{body,baseURI:'file:///prototype/index.html',createElement:element,querySelectorAll:()=>[],getElementById:()=>null}};
  ctx.window=ctx;vm.createContext(ctx);
  const root=path.resolve(__dirname,'../..');
  for(const file of require('../vfx_export').RUNTIME_SCRIPTS) {
    const source=process.env.VB_SOURCE_REF&&file==='js/vfx/renderer.js'
      ?require('node:child_process').execFileSync('git',['show',`${process.env.VB_SOURCE_REF}:prototype/${file}`],{cwd:root,encoding:'utf8'})
      :fs.readFileSync(path.join(root,file),'utf8');
    vm.runInContext(source,ctx,{filename:file});
  }
  return {fx:ctx.VbFx,timers,frame(at){now=at;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));}};
}

(async () => {
  await h.ready;
  await check('1：まとめた死亡の後でも、エインセルの死亡起点へ以前の死体を使わない', async () => {
    const x=h.setup({ sides: { p1: { units: [h.unit('ally')] }, p2: { units: [h.unit('lich','C040')] } } });
    const ally=x.find('ally'),lich=x.find('lich');
    const old = h.unit('old', '', { side: 'p2', hp: 0 });
    const ainsel = { ...definition('EN011'), id: 'ainsel', side: 'p2', hp: 0 };
    const bodies = new Map([old,ainsel,ally,lich].map(u=>[u.id,u]));
    const rects = new Map([[old, { left: 100, top: 100, width: 95, height: 140 }],
      [ainsel, { left: 300, top: 100, width: 95, height: 140 }],
      [ally,{left:100,top:550,width:95,height:140}],[lich,{left:500,top:100,width:95,height:140}]]);
    const rect = global.battleFxRect;
    global.battleFxRect = u => ({ ...rects.get(u), element: { dataset: { unitId: u.id }, isConnected: true } });
    const deaths = [old, ainsel].map(u => ({ type: 'death', side: 'p2', unitId: u.id }));
    const api = { findUnit: (_side, id) => bodies.get(id), units: () => [...bodies.values()] };
    try {
      await presentLabBeginEvent(deaths[0], deaths, 0, api);
      await presentDeathBatch(deaths, { ...api, compact: () => {bodies.delete(old.id);bodies.delete(ainsel.id);} });
      // 両受け口は束の2件目にも届くが、ここでは盤面からの消去が済んでいる。
      await presentLabBeginEvent(deaths[1], deaths, 1, api);
      const origin = _presentLabOrigins.death.get('p2');
      assert.equal(origin?.unit?.id, ainsel.id, '前の死体の位置が再利用された');
      assert.equal(origin.rect.left, 300, 'エインセルが消える前の位置を保つ');
      assert.equal(origin.rect.element, null, '消えたカードのDOMを再利用しない');
      // 死亡位置を使う後続VFXまで通し、以前の敵の位置へ絵を出さないことを確かめる。
      const damage={type:'damage',side:'p1',unitId:ally.id,sourceId:lich.id,amount:4,damageKind:'other'};
      const events=[...deaths,damage];
      await presentLabBeginEvent(damage,events,2,api);await presentFinishLabEvents(events);
      const vfx=h.calls.find(c=>c.name==='lich');assert.ok(vfx);
      assert.equal(vfx.options.source.left,300);
      assert.equal(vfx.options.source.element,null);
      // 位置のない別の死亡は、以前の死体へ代用しない。
      const missing = { type: 'death', side: 'p2', unitId: 'missing' };
      await presentLabBeginEvent(missing, [missing], 0, api);
      assert.equal(_presentLabOrigins.death.has('p2'), false);
    } finally { global.battleFxRect = rect; }
  });

  for (const side of ['p1', 'p2']) for (const no of ['C029', 'C034']) {
    await check(`2：${side} ${no}は最後の死亡・負傷でも固有VFXを残す`, async () => {
      const other = side === 'p1' ? 'p2' : 'p1';
      const x = h.setup({ sides: {
        [side]: { units: [h.unit('source', no, { atk: 2, hp: no==='C034'?2:1, maxHp: 2 }), h.unit('survivor')] },
        [other]: { units: [h.unit('last', '', { atk: 1, hp: 1, maxHp: 1 })] },
      } });
      createBattleRunner(x.state, x.rng, x.emit, { skipOpening: true }).step({ deferCompact: true });
      const buffs = x.events.filter(e => e.type === 'summon_buff' && e.sourceId === 'source');
      assert.equal(buffs.length, 1, 'コアが最後の効果を確定した再現条件');
      assert.ok(buffs[0].persistent);
      const coreResult = h.clone({ events: x.events, buffs: x.state.gameSummonBuff });
      const name = no === 'C029' ? 'phantom' : 'eidolon';
      await x.pve();
      assert.equal(h.calls.filter(c => c.name === name).length, 1, 'PvEの最後の固有VFX');
      assert.equal(presentIsSilentEvent(buffs[0]), false);
      await x.online();
      assert.equal(h.calls.filter(c => c.name === name).length, 1, 'オンラインの最後の固有VFX');
      assert.deepEqual({ events: x.events, buffs: x.state.gameSummonBuff }, coreResult, '再生でイベント・累積値を変えない');
    });
  }
  // 2026-10-22 利用者指定：決着後は省かずに速くする（次戦以後に影響する効果が入ったため）。
  await check('2：決着後の通常バフも省かず、そこから演出を速くする', () => {
    const events = [{ type: 'death', side: 'p2', unitId: 'last' },
      { type: 'stat_change', side: 'p1', unitId: 'ally', sourceId: 'ally', atk: 1, hp: 1, reason: 'ally_death_buff' }];
    presentMarkBattleTail(events, { p1: [{ id: 'ally', hp: 1 }], p2: [{ id: 'last', hp: 1 }] });
    assert.equal(presentIsSilentEvent(events[1]), false, '省かない');
    assert.equal(presentDecidedSpeedScale(), 1, '決着のイベントまでは通常の速さ');
    presentNoteDecidedEvent(events[0]);
    assert.equal(presentDecidedSpeedScale(), 1, '決着した死亡そのものは通常の速さ');
    presentNoteDecidedEvent(events[1]);
    assert.equal(presentDecidedSpeedScale(), PRESENT_DECIDED_SPEED_SCALE, '決着後は速くする');
    presentResetDecided();
  });

  await check('3：全シートのゲーム中眷属強化を洗い出す（通常・強化後）', () => {
    const found = ['card', 'enchant', 'enemy', 'ring', 'item'].flatMap(kind => h.sheetRows(kind)
      .filter(r => ['効果', '強化効果'].some(k => /このゲーム中、味方の眷属は/.test(r[k] || '')))
      .map(r => r['No.'])).sort();
    assert.deepEqual(found, ['C029', 'C034', 'C072']);
  });
  for (const no of ['C029', 'C034', 'C072']) for (const merged of [false, true]) {
    await check(`3：${no} ${merged ? '強化後' : '通常'}の累積値がカード・ホバー・戦闘説明と次戦の召喚へ一致`, async () => {
      const effect = definition(no); if (merged) applyMergedPanelForm(effect);
      const source = h.unit('buffer', no, { desc: effect.desc });
      const x = h.setup({ sides: { p1: { units: [source, h.unit('summoner', 'C035')] }, p2: { units: [h.unit('foe')] } },
        summonDefs: [...PANEL_POOL, ...ENEMY_POOL] });
      if (no === 'C029') { x.find('buffer').hp = 0; coreApplyDeathEffects(x.find('buffer'), x.state, x.rng, x.emit, x.hit); }
      if (no === 'C034') coreApplyInjuryEffects(x.find('buffer'), 1, x.state, x.rng, x.emit, x.hit);
      if (no === 'C072') coreSummonUnit(x.state, 'p1', { name: '青スケルトン' }, x.emit, 'summoner', undefined, x.rng, x.hit);
      const cumulative = h.clone(x.state.gameSummonBuff.p1);
      // 付与元がいなくなった次の戦闘でも累積値は残る。
      const next = h.setup({ sides: { p1: { units: [h.unit('summoner', 'C035')] }, p2: { units: [h.unit('foe')] } },
        summonDefs: [...PANEL_POOL, ...ENEMY_POOL], gameSummonBuff: { p1: cumulative } });
      G.gameSummonBuff = cumulative;
      const knight = definition('C035'), raw = _rawSubstitutedDesc(knight);
      const before = h.clone(next.state);
      const summoned = coreSummonUnit(next.state, 'p1', { name: '青スケルトン' }, next.emit, 'summoner', undefined, next.rng, next.hit);
      const expected = [summoned.atk, summoned.hp];
      assert.deepEqual(notes(raw), expected);
      assert.deepEqual(notes(computeDesc(knight)), expected);
      assert.deepEqual(notes(_unitPreviewText(knight, raw)), expected);
      assert.deepEqual(notes(_rawSubstitutedDesc(before.units.p1[0])), expected);
      // 元データ・基礎値へ焼き込まない。
      assert.deepEqual(knight, definition('C035'));
      assert.deepEqual(next.state.gameSummonBuff.p1, cumulative);
    });
  }

  for(const side of ['p1','p2']) for(const boosted of [false,true]) {
    await check(`3：${side} 眷属倍率・指輪・熟練・生存シャナ${boosted?'あり':'なし'}も実際の召喚と一致`,()=>{
      const rings=boosted?['青い瞳の指輪','虹の瞳の指輪','召喚師の指輪'].map(name=>{
        const ring=RING_POOL.find(c=>c.name===name);assert.ok(ring,name);return ring;
      }):[];
      const source=h.unit('summoner','C035',boosted?{boon:{famMul:2},keywords:['熟練3']}:{});
      const extra=boosted?[h.unit('shana','C072',{keywords:['熟練2']})]:[];
      const x=h.setup({sides:{[side]:{units:[source,...extra]},[side==='p1'?'p2':'p1']:{units:[h.unit('foe')]}},
        rings:{[side]:rings},items:{[side]:boosted?[{itemEffectKey:'bond_scroll'}]:[]},
        gameSummonBuff:{p1:{atk:7,hp:11},p2:{atk:13,hp:17}},summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
      G.phase='battle';G.gameSummonBuff={atk:99,hp:99};
      const before=h.clone(x.state),owner=x.find('summoner');
      const computed=h.clone(x.state),summon=coreSummonUnit(computed,side,{name:'青スケルトン'},()=>{},'summoner',undefined,x.rng,x.hit);
      const expected=[summon.atk,summon.hp];
      presentSetSummonPreviewState(x.state,[]);
      assert.deepEqual(notes(_rawSubstitutedDesc(owner)),expected,'PvEの説明');
      presentSetSummonPreviewFromResult({finalState:battleCoreFinalState(x.state),events:[],formations:{
        p1:{rings:x.state.rings.p1,items:x.state.items.p1},p2:{rings:x.state.rings.p2,items:x.state.items.p2}}});
      assert.deepEqual(notes(_rawSubstitutedDesc(owner)),expected,'オンラインの説明（自陣と敵陣の累積を混ぜない）');
      assert.deepEqual(h.clone(x.state),before,'説明の試算でコアの体・資源・累積・イベントを変えない');
      assert.equal(x.events.length,0);
    });
  }
  await check('3：先の累積値を先取りせず、発動ごとに戦闘カードとホバーを更新する',async()=>{
    const x=h.setup({sides:{p1:{units:[h.unit('summoner','C035')]},p2:{units:[h.unit('foe')]}},gameSummonBuff:{p1:{atk:5,hp:2}}});
    G.phase='battle';
    const events=[{type:'summon_buff',side:'p1',atk:2,hp:0,totalAtk:3,totalHp:2},
      {type:'summon_buff',side:'p1',atk:2,hp:0,totalAtk:5,totalHp:2}];
    const knight=x.find('summoner');presentSetSummonPreviewState(x.state,events);
    assert.deepEqual(notes(_rawSubstitutedDesc(knight)),[5,3],'未再生の2回分を先取りしない');
    const refreshed=[],refresh=global.refreshUnitPreviewUi;
    global.refreshUnitPreviewUi=(unit,side)=>refreshed.push([unit.id,side,notes(_rawSubstitutedDesc(unit))]);
    const api={findUnit:(_side,id)=>x.find(id),units:side=>x.state.units[side]};
    try{
      for(const [i,ev]of events.entries()){
        // 固有VFXのない累積でも、共通のイベント終了処理で説明を更新する。
        presentAdvanceSummonPreview(ev);await presentLabEndEvent(ev,events,i,api);
        assert.deepEqual(notes(_rawSubstitutedDesc(knight)),[7+2*i,3]);
      }
      assert.deepEqual(refreshed,[['summoner','ally',[7,3]],['summoner','ally',[9,3]]]);
    }finally{global.refreshUnitPreviewUi=refresh;}
    const original=fs.readFileSync(path.resolve(__dirname,'../../js/engine/render.js'),'utf8')
      .match(/^function refreshUnitPreviewUi\([^\n]*\)\{[\s\S]*?^\}/m)[0];
    const realRefresh=vm.runInThisContext('('+original+')'),slot=getCurrentUnitSlot('ally',knight),description={};
    slot.querySelector=selector=>selector==='.slot-desc'?description:null;
    realRefresh(knight,'ally');
    assert.deepEqual(notes(slot.getAttribute('data-preview')),[9,3]);
    assert.deepEqual(notes(description.outerHTML),[9,3]);
  });

  for (const no of ['C029', 'C034']) await check(`4：${no}の空白待ちを除き、反復でも全区間を最後まで再生する`, async () => {
    const x = h.setup({ sides: { p1: { units: [h.unit('source', no), h.unit('familiar', '', { keywords: ['眷属'] })] },
      p2: { units: [h.unit('foe')] } } });
    if (no === 'C029') {
      // 同じ手番で死亡効果を複数回発動する効果と同じ入口。
      coreApplyTimedSummonBuff(x.find('source'), '死亡', x.state, x.emit, x.rng, x.hit);
      coreApplyTimedSummonBuff(x.find('source'), '死亡', x.state, x.emit, x.rng, x.hit);
    } else {
      coreApplyInjuryEffects(x.find('source'), 1, x.state, x.rng, x.emit, x.hit);
      coreApplyInjuryEffects(x.find('source'), 1, x.state, x.rng, x.emit, x.hit);
    }
    const name = no === 'C029' ? 'phantom' : 'eidolon';
    const verify = () => {
      const calls = h.calls.filter(c => c.name === name);
      assert.equal(calls.length, 2, '2回目を間引かない');
      const end = Math.max(...VbFx.effects.find(d => d.name === name).layers.map(l => (l.time || [0, 1])[1]));
      assert.equal(calls[0].options.endRatio, end, '見える区間の完了で次の行動へ進む');
      assert.equal(calls[1].options.endRatio, end);
      assert.equal(calls[0].options.durationMs, undefined, '初回の絵の速さを維持');
      assert.ok(Math.abs(calls[1].options.durationMs * end - PRESENT_MANA_RUN_GAP_MS) < 1e-9,
        '反復でも可視区間全体に150msを割り当てる');
      return calls.map(c => [c.options.durationMs, c.options.endRatio]);
    };
    await x.pve(); const pve = verify();
    await x.online(); assert.deepEqual(verify(), pve);
  });
  await check('4：実レンダラーの初回・反復・フレーム遅延でも最後まで完了する（1・2・3倍）',async()=>{
    const clock=rendererClock(),rect={left:100,top:200,width:95,height:140,element:null};
    let at=100000;
    for(const no of ['C029','C034']) for(const speed of [1,2,3]) for(const hasTargets of [false,true]) for(const repeat of [false,true]){
      const name=no==='C029'?'phantom':'eidolon',def=clock.fx.effects.find(d=>d.name===name);
      const ratio=presentLabPlaybackEndRatio(no,def,hasTargets),ms=repeat?PRESENT_MANA_RUN_GAP_MS/(ratio*speed):clock.fx.duration(name,PRESENT_LAB_SPEED*speed);
      const end=ms*ratio;
      const done=clock.fx.play(name,{source:rect,targets:hasTargets?[rect]:[],speed:PRESENT_LAB_SPEED*speed,
        durationMs:repeat?ms:undefined,endRatio:ratio,value:no==='C034'?2:1});
      done.catch(()=>{});
      clock.frame(at); // 予約から大きく遅れても、この最初のフレームが起点。
      assert.equal(clock.fx.activeCount(),1);
      for(let elapsed=16;elapsed<end;elapsed+=16)clock.frame(at+elapsed);
      clock.frame(at+end-1);if(!clock.fx.activeCount())await done;assert.equal(clock.fx.activeCount(),1,`${no} ${speed}倍 対象${hasTargets} 反復${repeat}：終わりの直前まで描く`);
      clock.frame(at+end+.01);assert.equal(clock.fx.activeCount(),0,'空白区間は待たない');
      assert.equal((await done).cancelled,false,'途中停止で切らない');
      assert.ok(Math.abs(clock.timers.at(-1)-(end+100))<1e-8,'番人も同じ可視区間の長さ');
      at+=10000;
    }
  });
  console.log(`戦闘終端1021b: ${checked}件成功、${failed}件失敗（画面・聴感は対象外）`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
