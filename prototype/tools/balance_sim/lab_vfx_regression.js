'use strict';
// コアが生成したイベントをゲームの共通presenter／PvE受け口へ流す。描画・実時間だけ置き換える。
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname,'../..');
const {makeElement} = require('./stub');
global.document.head=makeElement('head');
global.MutationObserver=function(){this.observe=()=>{};this.disconnect=()=>{};};
global.setTimeout = (fn,_ms,...args)=>{queueMicrotask(()=>fn(...args));return 0;};
global.requestAnimationFrame = ()=>0;
global.setInterval = ()=>0;
console.table = ()=>{};
for(const m of fs.readFileSync(path.join(ROOT,'index.html'),'utf8').matchAll(/<script\s+src="([^"?]+)(?:\?[^"\s]*)?"/g)) {
  if(!m[1].startsWith('http')) vm.runInThisContext(fs.readFileSync(path.join(ROOT,m[1]),'utf8'),{filename:m[1]});
}
// 第2段では共通描画入口を本物に戻して、VbFx境界だけを観測する。
const definedEntrances=Object.fromEntries(['playHitVfx','playHitVfxAtRect','playEffectVfxOnUnit',
  '_playCardEffectVfx','playCharacterSweepVfx'].map(name=>[name,global[name]]));
const nodes = new Map(), slots = new Map(), calls = [], sounds = [], legacy = [], stopped = [], motions = [], attackSounds = [], route = [];
const rect = (i,side)=>({left:100+i*110,top:side==='p2'?140:550,width:95,height:140,right:195+i*110,bottom:side==='p2'?280:690});
function element(id,r) {const e=makeElement();e.cloneNode=()=>{const c=element(id,r);c.dataset={...e.dataset};return c;};e.id=id;e.isConnected=true;e.offsetWidth=r.width;e.offsetHeight=r.height;e.getBoundingClientRect=()=>r;return e;}
const screen=element('scr-battle',{left:0,top:0,width:1280,height:800,right:1280,bottom:800});
screen.classList.contains=c=>c==='active';nodes.set(screen.id,screen);
global.innerWidth=1280;global.innerHeight=800;
global.document.getElementById=id=>nodes.get(id)||null;
global.document.querySelector=selector=>selector==='#scr-battle .battle-area'?screen:null;
// 状態VFXはカードの可視性も読む。仮DOMの初期状態は、画面に出た不透明なカード。
// 2026-10-11: 数値表示と同時に開始する画面振動も、実装と同じCSS変数読み取りを使えるようにする。
global.getComputedStyle=element=>({visibility:element.style.visibility||'visible',display:element.style.display||'block',opacity:element.style.opacity||'1',getPropertyValue:k=>k==='--game-scale'?'1':(typeof element.style.getPropertyValue==='function'?element.style.getPropertyValue(k):'')});
global.document.createElement=tag=>{const e=makeElement(tag);e.isConnected=true;const append=e.appendChild;e.appendChild=c=>{if(c.id)nodes.set(c.id,c);return append.call(e,c);};return e;};
const append=screen.appendChild;screen.appendChild=c=>{if(c.id)nodes.set(c.id,c);return append.call(screen,c);};
global.getCurrentUnitSlot=(_side,u)=>slots.get(String(u.id))||null;
global._gameScale=()=>1;global._battleVfxClipRect=()=>({left:0,top:0,width:1280,height:800});
global._battleBackgroundFrameRect=global._battleVfxClipRect;global._battleScreenRect=global._battleVfxClipRect;
const audioPlay=global.playSfx;
global.playSfx=(code,opts)=>{sounds.push({code,opts});return true;};
VbFx.play=(name,opts)=>{
  const entry={name,source:opts.source?.element?.dataset.unitId,targets:(opts.targets||[]).map(r=>r.element?.dataset.unitId),opts,
    unfinished:calls.filter(c=>!c.finished&&!c.name.endsWith('-state')).map(c=>c.name),finished:false};
  calls.push(entry);
  return new Promise(resolve=>queueMicrotask(()=>{
    (opts.targets||[]).forEach((_r,i)=>opts.onImpact?.(i));
    (opts.cueTimesMs||[]).forEach((_t,i)=>opts.onCue?.(i));
    queueMicrotask(()=>{entry.finished=true;resolve({name});});
  }));
};
VbFx.stop=handle=>{stopped.push(handle);return 1;};VbFx.stopAll=()=>{stopped.push('all');};
global._syncEffectFlashWithVfx=global.actionBannerTrackVfxHost=()=>{};
global._actionBannerShow=()=>{};
global.renderAll=()=>{['p1','p2'].forEach(side=>(side==='p1'?G.allies:G.enemies).forEach((u,i)=>{if(u&&!slots.has(u.id)){const e=element(u.id,rect(i,side));e.dataset.unitId=u.id;slots.set(u.id,e);battleFxSyncUnit(u,side==='p1'?'ally':'enemy',e);}}));};
global.renderField=(_id,list,enemy)=>list.forEach((u,i)=>{if(!u)return;let e=slots.get(u.id);if(!e){e=element(u.id,rect(i,enemy?'p2':'p1'));e.dataset.unitId=u.id;slots.set(u.id,e);}battleFxSyncUnit(u,enemy?'enemy':'ally',e);});
global.showScreen=()=>{};
global._playBattleStartIntro=global.playBattleOpeningSequence=()=>Promise.resolve();
global._warmBattleHitSfx=()=>{};
global.renderControls=global.updateHUD=()=>{};
global.requestBattleCompact=()=>renderAll();
global.updateUnitDamageUi=global.refreshUnitPreviewUi=()=>{};
global._waitForBattleMotionIdle=global.sleep=global._awaitFrame=()=>Promise.resolve();
global.playAttackMotion=async(a,b,_enemy,onPause,opts)=>{motions.push([a?.id,b?.id]);onPause?.();await opts?.onContact?.();};
global.playAttackDamageSfx=(unit,amount)=>{attackSounds.push([unit?.id,amount]);return true;};
global.playHitVfx=(_s,u,amount,opts)=>{legacy.push({fn:'hit',unit:u?.id,amount,opts});return Promise.resolve();};
global.playHitVfxAtRect=(_r,_n,opts)=>{opts?.onFadeStart?.();return Promise.resolve();};
global.playEffectFlash=()=>{};
global.playUnitDeathBurn=()=>true;
global.playCharacterSweepVfx=async(_source,_enemy,targets,_url,opt)=>{targets.forEach(u=>opt?.onTargetHit?.(u));return true;};
global.playEffectVfxOnUnit=(u,s,code)=>{legacy.push({fn:'effect',unit:u?.id,code});return {stop:()=>Promise.resolve()};};
global._playCardEffectVfx=(code,targets)=>{legacy.push({fn:'card',code,targets:targets.map(u=>u.id)});return Promise.resolve();};
global.battlePresentationSetTimeout=fn=>{queueMicrotask(fn);return 0;};
SaveRun.recordDeath=()=>{};
global.persistBoardCharacterStats=()=>true;
global.persistBoardEffectDamage=()=>true;
const clone=v=>JSON.parse(JSON.stringify(v));
// 共通実装をそのまま呼び、経路だけ記録する。描画境界のVbFxだけがspy。
const beginLab=presentLabBeginEvent,playLab=playBattleLabFx;
global.presentLabBeginEvent=async(...args)=>{route.push(['event',args[0].type]);return beginLab(...args);};
global.playBattleLabFx=(...args)=>{route.push(['adapter',args[0]]);return playLab(...args);};
vm.runInThisContext(fs.readFileSync(path.join(ROOT,'tools/parity/lab_vfx_fixtures.js'),'utf8'),{filename:'lab_vfx_fixtures.js'});
const fixture=vbLabVfxFixture,cases=vbLabVfxCases;
function setup(state) {
  vbLabVfxResetBattle();
  G.allies=state.units.p1;G.enemies=state.units.p2;
  calls.length=sounds.length=legacy.length=motions.length=attackSounds.length=route.length=0;slots.clear();
  ['p1','p2'].forEach(side=>state.units[side].forEach((u,i)=>{if(!u)return;const e=element(u.id,rect(i,side));e.dataset.unitId=u.id;slots.set(u.id,e);battleFxSyncUnit(u,side==='p1'?'ally':'enemy',e);}));
  actionBannerSetBattleData({units:state.units,items:state.items,rings:state.rings});
}
async function runCase(no,trigger,card=no) {
  const s=fixture(card);vbLabVfxPrepare(no,s);setup(s);renderAll();
  const initial=clone(s);
  const run=vbLabVfxStartPve(no,s,trigger);await run.done;const events=run.events;
  for(const e of events.filter(e=>e.type==='damage'&&e.amount>0&&presentLabEventHandled(e))) {
    assert.ok(legacy.some(c=>c.fn==='hit'&&c.unit===e.unitId&&c.opts.labelOnly&&c.opts.keywordSfx===false),no+' LABの命中へ数値だけを重ねる');
  }
  if(events.filter(e=>e.type==='damage'&&e.amount>0).every(presentLabEventHandled))assert.equal(attackSounds.length,0,no+' 採用SEへ旧命中音を重ねない');
  if(no==='C078')assert.ok(!motions.some(([id])=>id.startsWith('foe')),'ピクシーのLAB移動へ攻撃クローンを重ねない');
  if(no==='C032') assert.equal(battleFxStateValues(s.units.p1[1]).revive,1,'復活獲得でループを進める');
  if(no==='C014') assert.equal(battleFxStateValues(s.units.p2[0]).weaken,1,'弱体付与の瞬間にループの値を進める');
  if(no==='C069') assert.equal(battleFxStateValues(s.units.p2[0]).poison,6,'毒の倍化を表示へ進める');
  if(no==='C092')assert.ok(calls.some(c=>c.name==='atk-down'),'ATKとHPが同時に減る効果にもATK減少を出す');
  const name=presentLabFx(no)[0];
  assert.ok(calls.some(c=>c.name===name),no+' '+name+' が実際のイベントから出る: '+JSON.stringify(events.map(e=>[e.type,e.reason,e.effectNo,e.sourceId]))+' / 出た演出 '+calls.map(c=>c.name));
  assert.ok(vbLabVfxExpectedCalls(no,calls.map(c=>c.name)),no+' 固有演出を汎用演出より先に出す');
  assert.ok(route.some(([kind])=>kind==='event')&&route.some(([kind,code])=>kind==='adapter'&&code===no),no+' 共通presenter→実際のLABアダプタを通る');
  if(trigger==='mana'&&cases[no]) {
    const at=route.findIndex(([kind,code])=>kind==='adapter'&&code===no);
    assert.equal(route.slice(0,at).filter(([kind])=>kind==='event').at(-1)[1],'mana_threshold',
      no+' effectNoの合図から直接開始し、後続イベントで代用しない');
  }
  for(const call of calls.filter(c=>['weaken','atk-down','battle-summon','shield-gain','revive-gain'].includes(c.name)))
    assert.ok(!call.unfinished.includes(name),no+' 固有演出の完了後に汎用演出を続ける');
  if(no==='shield_break') assert.ok(!sounds.some(c=>c.code===no),'結界消失はSEなし');
  else assert.ok(sounds.some(c=>c.code===no),no+' SEが出る');
  const main=calls.filter(c=>c.name===name);
  // 戦闘中の召喚（S001）は2.5倍（2026-10-08 利用者指定）。他は標準の1.5。
  assert.ok(main.every(c=>c.opts.speed===(no==='S001'?1.5*2.5:1.5)),no+' 標準速さ');
  assert.ok(main.every(c=>c.opts.board===screen),no+' 実際の戦闘盤面へ画面揺れを接続');
  if(no==='C039') assert.equal(main[0].source,undefined,'リッチは倒れた位置の矩形');
  if(no==='C077') assert.equal(main[0].source,'ally0','カーバンクルは結界消失位置');
  if(no.startsWith('E')&&no!=='E067') assert.equal(main[0].source,'source',no+' 強化カードの持ち主から');
  assert.ok(!legacy.some(c=>c.fn==='card'&&c.code===no||c.fn==='effect'&&c.code===no),no+' 旧素材を重ねない');
  if(process.env.VB_DUMP) console.log(no,JSON.stringify(events),calls.map(c=>[c.name,c.source,c.targets]),legacy);
  const summarize=()=>calls.map(c=>[c.name,c.source,c.targets]),pve=summarize(),pveSounds=sounds.filter(c=>presentLabFx(c.code)).map(c=>c.code);
  // Chromeと同じ保存再生フラグの入口に加え、通常PvEでも同じコアtrigger/受け口を通す。
  const normal=fixture(card);vbLabVfxPrepare(no,normal);setup(normal);G._savedBattleReplaying=false;
  await vbLabVfxStartPve(no,normal,trigger).done;
  assert.deepEqual(summarize(),pve,no+' 通常PvEと保存再生の演出・発生元・対象・順序');
  setup(initial);G._savedBattleReplaying=false;
  const start={type:'battle_start',sides:clone(initial.units)},result={events:[start,...clone(events)],formations:{p1:{units:initial.units.p1,items:initial.items.p1,rings:initial.rings.p1},p2:{units:initial.units.p2,items:initial.items.p2,rings:initial.rings.p2}}};
  beginOnlineVersusField(result);
  await playOnlineBattleEvents(result,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});
  if(no==='C078')assert.ok(!motions.some(([id])=>id.startsWith('foe')),'オンラインでもピクシーの移動はLABだけ');
  assert.deepEqual(summarize(),pve,no+' PvE／保存再生とオンラインの演出・発生元・対象・順序');
  assert.deepEqual(sounds.filter(c=>presentLabFx(c.code)).map(c=>c.code),pveSounds,no+' 両側の採用SEと順序');
  const live=id=>[...G.allies,...G.enemies].find(u=>u&&u.id===id);
  if(no==='C014')assert.equal(battleFxStateValues(live('foe0')).weaken,1,'オンラインの弱体表示はイベントを1回だけ足す');
  if(no==='C069'){
    renderField('f-enemy',G.enemies,true);
    assert.equal(battleFxStateValues(live('foe0')).poison,6,'オンラインの毒倍化を再描画で戻さない');
  }
  hideOnlineVersusBoard();
  console.log('OK '+no+' '+name+' ('+main.length+'回 / PvE・オンライン・保存再生)');
}
async function staleSessionChecks() {
  // 修正前のChrome検査が使った初期化（戦闘開始処理だけ欠ける）をそのまま再現する。
  // 前回のNode検査は毎回この処理を呼んでいたため、27件の欠落を捕まえられなかった。
  const initialize=initializeBattlePresentationState;
  actionBannerClear(true);global.initializeBattlePresentationState=()=>{};
  const missing=[];
  try {
    for(const [no,trigger]of Object.entries(cases)) {
      const state=fixture(no);setup(state);await vbLabVfxStartPve(no,state,trigger).done;
      if(!calls.some(c=>c.name===presentLabFx(no)[0]))missing.push(no);
    }
    assert.deepEqual(missing,Object.keys(cases).filter(no=>!['E006','E062','E067','C049','C053','C032','C051','C041','C018','I006'].includes(no)),
      '初期化漏れが残ると、マナ発動元IDを直した後も23件の演出が欠ける');
  } finally {global.initializeBattlePresentationState=initialize;actionBannerClear(true);}
  console.log('OK ブラウザ検査の初期化漏れ: マナ発動元ID修正後にも23件の欠落を再現');
}
function assetChecks() {
  const urls=new Set(),add=value=>{
    if(typeof value==='string'&&value.startsWith('assets/'))urls.add(value);
    else if(value&&typeof value==='object')Object.values(value).forEach(add);
  };
  add(Assets);
  for(const [no]of Object.entries(cases)) {
    const state=fixture(no);
    for(const unit of [...state.units.p1,...state.units.p2]) {
      add(getCharacterNoArtPath(unit));add(getPanelArtPath(unit));add(actionBannerImage(unit,'character'));
    }
    const def=[...PANEL_POOL,...ITEM_POOL].find(d=>d.no===no||d.artCode===no);
    if(def)add(actionBannerImage(def,no.startsWith('E')?'enchant':'character'));
  }
  // 第1段のsprite資源は資源表から検査し、新しい定義はデータの検証を通す。
  const exporter=require('../vfx_export');
  const registry=exporter.validatedBundle().bundle;
  const vm=require('node:vm'),context=vm.createContext({});
  for(const rel of ['js/vfx/curves.js','js/vfx/textures.js']) vm.runInContext(fs.readFileSync(path.join(ROOT,rel),'utf8'),context);
  Object.values(context.VbFxTextures.sprites).forEach(resource=>add('assets/'+resource.path));
  const names=new Set(registry.effects.flatMap(d=>[d.name,...(d.variants||[]).map(v=>v.name)]));
  const checkDefinitions=value=>{
    if(typeof value==='string'&&value.startsWith('vfx:'))assert.ok(names.has(getVfxDefinitionName(value)),value+' の定義が存在する');
    else if(value&&typeof value==='object')Object.values(value).forEach(checkDefinitions);
  };
  checkDefinitions(Assets.vfx);
  for(const url of urls)assert.ok(fs.existsSync(path.join(ROOT,url.split('?')[0])),url+' の素材が存在する');
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(html,/<link\s+rel="icon"\s+href="data:,"/,'未配置favicon.icoの自動取得を防ぐ');
  console.log('OK 素材 '+urls.size+'パスの実在・favicon.icoの自動取得抑止');
}
async function extraChecks() {
  const oldBurn=playCardBurnAway,oldWave=playCardWaveAway,oldWasted=playWastedLabel;
  try {
    for(const drained of [false,true]) {
      let removed=false,played=false;
      const snapshot={querySelectorAll:selector=>selector==='[data-vb-fx-local]'?[{remove:()=>{removed=true;}}]:[]};
      global.playCardBurnAway=global.playCardWaveAway=()=>{assert.ok(removed,'死亡クローンの局所状態キャンバスを描く前に取り除く');played=true;};
      global.playWastedLabel=()=>{};
      _playUnitDeathCardFx({_deathByStatDrain:drained},snapshot,rect(0,'p1'));
      assert.ok(played,'通常死・衰弱死とも共通の死亡描画入口を通る');
    }
    console.log('OK 死亡クローンに複製済みの状態キャンバスも残さない');
  } finally {global.playCardBurnAway=oldBurn;global.playCardWaveAway=oldWave;global.playWastedLabel=oldWasted;}
  const s=fixture('C003');s.units.p1[0].keywords=['結界2','根性','復活'];s.units.p1[0].shield=2;setup(s);
  const u=s.units.p1[0];_battleFxFollowStates();const started=calls.length;
  _battleFxFollowStates();assert.equal(calls.length,started,'状態ループを二重に開始しない');
  assert.ok(calls.some(c=>c.name==='shield-state'&&c.opts.value===2),'最初から持つ結界のループ');
  assert.ok(!calls.some(c=>c.name==='shield-gain'||c.name==='revive-gain'),'初期状態に獲得演出を出さない');
  battleFxAdvanceStates(u,{shield:3,poison:4,weaken:2});_battleFxFollowStates();
  assert.equal(calls.filter(c=>c.name==='shield-state').at(-1).opts.value,3,'結界値を更新');
  assert.equal(calls.filter(c=>c.name==='poison-state'&&c.source===u.id).at(-1).opts.value,4,'毒値を更新');
  const old=slots.get(u.id),next=element(u.id,rect(3,'p1'));next.dataset.unitId=u.id;slots.set(u.id,next);_battleFxFollowStates();
  await playBattleLabFx('K016',u,[u]);
  assert.equal(calls.at(-1).opts.resolveElement(old),next,'単発演出も再描画したDOMを引く');
  assert.ok(stopped.some(h=>h.name==='shield-state'&&h.element===old),'並べ替え時に元DOMの状態を停止');
  assert.equal(calls.filter(c=>c.name==='shield-state').at(-1).opts.source.element,next,'移動先DOMへ付け直す');
  battleFxAdvanceStates(u,{shield:0,poison:0,weaken:0,guts:0,revive:0});_battleFxFollowStates();
  for(const name of ['shield-state','poison-state','weaken-state','guts-state','revive-state']) assert.ok(stopped.some(h=>h.name===name&&h.element===next),name+'を個別に止める');
  stopBattleLabFx();assert.equal(_battleFxStates.size,0,'戦闘終了で全状態を破棄');
  console.log('OK 状態ループの開始・更新・移動・個別停止・全停止');

  setup(s);u.shield=2;battleFxAdvanceStates(u,{shield:2});
  const shieldEvents=[{type:'shield_lost',side:'p1',unitId:u.id,shield:1},{type:'shield_lost',side:'p1',unitId:u.id,shield:0}];
  await _flushCorePveHitEvents(s,shieldEvents,new Set([...s.units.p1,...s.units.p2]));
  assert.equal(calls.filter(c=>c.name==='shield-break').length,1,'結界0になった時だけ消失を1回');
  assert.equal(legacy.filter(c=>c.opts?.keywordEffect==='結界').length,0,'旧K018の絵を重ねない');
  assert.equal(sounds.filter(c=>c.code===getKeywordEffectSfxKey('結界')).length,2,'防いだ瞬間のK018.wavは残す');
  assert.ok(!sounds.some(c=>c.code==='shield_break'),'結界消失にはSE無し');
  const revived=s.units.p1[1];revived.keywords=['復活'];revived.hp=0;
  const reviveEvents=[];coreTryRevive(revived,s,e=>reviveEvents.push(e));
  await _flushCorePveHitEvents(s,reviveEvents,new Set([...s.units.p1,...s.units.p2]));
  assert.ok(calls.some(c=>c.name==='revive-summon'),'実際の復活イベントからLABを呼ぶ');
  assert.equal(battleFxStateValues(revived).revive,0,'復活を消費した状態を停止');
  const summonEvents=[];coreSummonUnit(s,'p1',{name:'青スケルトン',color:'青'},e=>summonEvents.push(e),u.id);
  await _flushCorePveHitEvents(s,summonEvents,new Set([...s.units.p1,...s.units.p2]));
  assert.ok(calls.some(c=>c.name==='battle-summon'),'実際の召喚イベントからLABを呼ぶ');
  await playAttackContactVfx({attacker:u,targets:s.units.p2,targetSide:'enemy',mode:'all'});
  assert.ok(calls.some(c=>c.name==='all-cross'&&c.targets.length===3),'全体攻撃を1波で出す');
  const elf=PANEL_POOL.find(c=>/負傷[：:].*結界/.test(c.desc||''));assert.ok(elf,'負傷で結界を得るカード');
  const es=fixture(elf.no);setup(es);const ee=[],er=createSeededRng(53);
  coreApplyInjuryEffects(es.units.p1[0],4,es,er,e=>ee.push(e),()=>({}),es.units.p2[0]);
  await _flushCorePveHitEvents(es,ee,new Set([...es.units.p1,...es.units.p2]));
  assert.ok(calls.some(c=>c.name==='shield-gain'),'負傷で得た結界に獲得演出');
  assert.ok(battleFxStateValues(es.units.p1[0]).shield>0,'結界ループを獲得時に進める');
  const w=s.units.p2[0];setup(s);w.weaken=2;presentHoldShown(w,w.atk,w.hp,w.maxHp,0,0);battleFxAdvanceStates(w,{weaken:0});
  const weakEvents=[{type:'keyword_effect',side:'p2',unitId:w.id,effect:'weaken',amount:1},{type:'keyword_effect',side:'p2',unitId:w.id,effect:'weaken',amount:1}];
  const weakApi={findUnit:(side,id)=>s.units[side].find(u=>u&&u.id===id),units:side=>s.units[side]};
  for(let i=0;i<weakEvents.length;i++) {
    await presentLabBeginEvent(weakEvents[i],weakEvents,i,weakApi);presentKeywordEffectEvent(weakEvents[i],weakApi);
    await presentLabEndEvent(weakEvents[i],weakEvents,i,weakApi);assert.equal(presentShownWeaken(w),i+1,'連続弱体を1回ずつ進める');
  }
  presentReleaseShown(w);
  const consumed={keywords:[],desc:'根性',_starterRegenUsed:true};assert.equal(_battleFxValues(consumed).guts,0,'本文の根性を消費後に再表示しない');
  consumed.keywords=['復活'];assert.equal(_battleFxValues(consumed).revive,1,'後から付いた復活は表示する');
  battleFxAdvanceStates(u,{revive:0});u.keywords=['復活'];battleFxSyncUnit(u,'ally',slots.get(u.id));
  assert.equal(battleFxStateValues(u).revive,0,'再生側の古いキーワードで消費した復活を再表示しない');
  console.log('OK 結界消失の条件・復活・召喚・全体攻撃・結界獲得');

  const a=fixture('C024');setup(a);a.units.p1[0]._adjacentPanelEffectTexts=['負傷：ランダムな敵に4ダメージを与える。'];
  const unrelated=[{type:'effect_flash',side:'p1',unitId:'source',trigger:'injury'},{type:'damage',side:'p2',unitId:'foe0',sourceId:'source',amount:4,hpAfter:76,effect:true,effectSource:false,damageKind:'injury_effect'}];
  await _flushCorePveHitEvents(a,unrelated,new Set([...a.units.p1,...a.units.p2]));
  assert.ok(!calls.some(c=>c.name==='banshee'),'付与された負傷効果に本人の死亡VFXを出さない');
  const decrease={type:'stat_change',side:'p2',unitId:'foe0',sourceId:'source',atk:-2,hp:0,reason:'evil_eye'},negative=[decrease];
  a.units.p1[0].no='C017';actionBannerSetBattleData({units:a.units});
  await presentLabBeginEvent(decrease,negative,0,{findUnit:(side,id)=>a.units[side].find(u=>u&&u.id===id),units:side=>a.units[side]});
  assert.equal(presentLabEventHandled(decrease),false,'未置換カードの固有演出をATK減少の合図で抑止しない');
  console.log('OK 置き換え対象以外の付与効果を保つ');

  const speeds=[1,2,3],originalSpeed=getBattlePresentationSpeedScale;
  for(const scale of speeds){global.getBattlePresentationSpeedScale=()=>scale;await playBattleLabFx('C024',a.units.p1[0],[a.units.p2[0]]);assert.equal(calls.at(-1).opts.speed,1.5*scale);}
  global.getBattlePresentationSpeedScale=originalSpeed;
  for(const name of ['shield-state','poison-state','weaken-state','guts-state','revive-state']) assert.equal(VbFx.duration(name,1.5),VbFx.duration(name,4.5),name+'の周期は速度に依存しない');
  const adopted=fs.readFileSync(path.join(ROOT,'tools/vfx_preview/se/ADOPTED.md'),'utf8');
  for(const line of adopted.split('\n')){const cells=line.split('|').map(v=>v.trim());if(!/^[A-Z]+\d{3}(?:_gain)?$/.test(cells[1]||''))continue;
    const spec=presentLabFx(cells[1]);assert.ok(spec,'採用SEの登録 '+cells[1]);assert.equal(spec[0],cells[2]);assert.equal(spec[1],Number(cells[5]));assert.ok(fs.existsSync(path.join(ROOT,Assets.sfx[cells[1]])),'採用SEのファイル '+cells[1]);}
  sounds.length=0;_battleFxSound('C024',1.5,VbFx.duration('banshee',1.5),false);await Promise.resolve();
  const sound=sounds.at(-1).opts,hit=VbFx.impactMs('banshee',1.5),duration=VbFx.duration('banshee',1.5);
  assert.equal(sound.fadeEndMs-sound.fadeAtMs,1100);assert.equal(sound.playbackRate,1);assert.equal(sound.offsetMs,Math.max(0,240-hit));
  sounds.length=0;_battleFxSound('C041',1.5,VbFx.duration('direwolf',1.5),true);await Promise.resolve();
  assert.ok(sounds.at(-1).opts.fadeEndMs<=VbFx.duration('direwolf',1.5)*.44,'遠吠えのSEを登場前に閉じる');
  console.log('OK 等速・2倍・3倍・状態周期・採用SEとpeak・音の終了');
  stopBattleLabFx();

  // 実際のaudio.jsを仮想時計で鳴らし、途中再生の立ち上がりとフェードを確認。
  const timer=global.setTimeout,interval=global.setInterval,time=global.performance,AudioOriginal=global.Audio;
  let now=0,tick,voice,lastVoice;
  global.performance={now:()=>now};global.setTimeout=()=>0;global.setInterval=fn=>{tick=fn;return 0;};
  global.Audio=function(){const a={dataset:{},style:{},isConnected:true,setAttribute(){},currentTime:0,duration:4,volume:1,playbackRate:1,paused:false,
    cloneNode:()=>new global.Audio(),load(){},pause(){this.paused=true;},addEventListener(){},play(){lastVoice=this;return Promise.resolve();}};return a;};
  vm.runInThisContext('_sfxUnlocked=true;');
  const volume=.7*SFX_SETTINGS.sfxVolume*SFX_SETTINGS.masterVolume;
  assert.equal(audioPlay('C024',{guardMs:0,offsetMs:120,fadeInMs:60,fadeAtMs:800,fadeEndMs:1900,playbackRate:1,onVoice:v=>{voice=v;}}),true);
  assert.equal(lastVoice.currentTime,.12);assert.equal(lastVoice.volume,0);
  now=30;tick();assert.ok(Math.abs(lastVoice.volume-volume*.5)<1e-6,'60msで立ち上げる');
  now=60;tick();assert.ok(Math.abs(lastVoice.volume-volume)<1e-6);
  now=1350;tick();assert.ok(Math.abs(lastVoice.volume-volume*.5)<1e-6,'フェード中間はcos²で半分');
  now=1900;tick();assert.equal(lastVoice.paused,true);await voice.finished;
  global.setTimeout=timer;global.setInterval=interval;global.performance=time;global.Audio=AudioOriginal;
  console.log('OK 音声の途中再生・60msの立ち上げ・1.1秒のcos²フェード');
}
async function committedEndChecks() {
  const persist=_persistPermanentStatOrWarn;
  global._persistPermanentStatOrWarn=()=>true;
  try {
    const initial=fixture('C068'),endState=clone(initial),events=[];
    coreTriggerBattleEnd(endState,e=>events.push(e),createSeededRng(53));
    const beforeAtk=initial.units.p1[0].atk;
    setup(initial);G._battleCoreEvents=[];G._savedBattleEnd=null;G._battleVictoryPending=true;
    await onBattleEnd();
    const live=calls.map(c=>[c.name,c.source,c.targets]);
    assert.ok(calls.some(c=>c.name==='leprechaun'),'本体のonBattleEndから終戦VFXを出す');
    assert.equal(G.allies[0].atk,endState.units.p1[0].atk,'確定済みの終戦能力値を再加算しない');
    assert.ok(G.allies[0].atk>beforeAtk,'実際の終戦効果を通した');
    const replay=fixture('C068');setup(replay);G._battleCoreEvents=[];G._battleVictoryPending=true;
    G._savedBattleEnd={pending:{frames:[{state:endState,from:0,to:events.length}],events},applied:false};
    await onBattleEnd();
    assert.deepEqual(calls.map(c=>[c.name,c.source,c.targets]),live,'SaveRun.applyEndを通る保存再生でも同じ終戦VFX');
    assert.equal(G.allies[0].atk,endState.units.p1[0].atk,'保存再生の確定値を再加算しない');
    const count=calls.length;await onBattleEnd();assert.equal(calls.length,count,'終戦VFXを二重に出さない');
    const states=fixture('C003');setup(states);_battleFxFollowStates();
    const stops=stopped.length;G._battleVictoryPending=true;_battleFxFollowStates();
    // 2026-10-07 利用者指定：終戦後も残っている状態の表示は消さない（戦闘画面を離れる・次の戦闘で片付ける）。
    assert.ok(_battleFxStates.size>0,'終戦時も状態ループを残す');
    assert.ok(!stopped.slice(stops).includes('all'),'状態停止が終戦の単発VFXを打ち切らない');
    console.log('OK 本体／SaveRun.applyEndの終戦VFX・数値の二重加算なし・終戦中も状態を残す');
  } finally {global._persistPermanentStatOrWarn=persist;}
}
// 2026-10-07報告。最終状態を先に持つPvEと、イベントで進むオンラインを同じ一手で比較する。
async function battleBugChecks() {
  const errors=[];
  const verify=(label,fn)=>{try{fn();}catch(e){errors.push(label+': '+e.message);}};
  const bare=(id,over={})=>({id,name:'検査素体',atk:2,hp:40,maxHp:40,color:'黒',desc:'',keywords:[],lane:'front',...over});
  const scenarios=[
    {name:'最小・生存',front:1,hp:40},
    {name:'中央・接触で死亡',front:3,hp:8},
    {name:'右端・接触で死亡',front:3,hp:8,targetAt:2},
    {name:'前衛5体・接触で死亡',front:5,hp:8},
    {name:'前衛6体・召喚拒否',front:6,hp:40},
    {name:'前衛満員・召喚拒否',front:7,hp:40},
    {name:'後衛あり・接触で死亡',front:5,rear:3,hp:8},
    {name:'薙ぎ払いで隣が死亡',front:5,rear:2,hp:40,peerHp:1},
    {name:'反撃で攻撃者が死亡',front:3,hp:40,allyHp:1},
  ];
  const oldMotion=playAttackMotion,oldHit=playHitVfx,oldSound=playAttackDamageSfx;
  const contactBoards=[];
  let phase='events';
  global.playAttackMotion=async(a,b,_side,pause,opt)=>{
    phase='pause';if(pause)await pause();phase='contact';
    contactBoards.push([a?.id,b?.id,(G.enemies||[]).filter(Boolean).map(u=>u.id)]);
    await opt?.onContact?.();phase='returned';
  };
  global.playHitVfx=(side,u,amount,opt)=>{const result=oldHit(side,u,amount,opt);legacy.at(-1).phase=phase;legacy.at(-1).hp=presentShownHp(u);return result;};
  global.playAttackDamageSfx=(u,n)=>{const result=oldSound(u,n);attackSounds.at(-1).phase=phase;return result;};
  try {
    for(const sc of scenarios) {
      const foes=Array.from({length:sc.front},(_,i)=>bare('E'+i,{hp:sc.peerHp||40,maxHp:sc.peerHp||40}));
      const at=sc.targetAt??Math.floor(sc.front/2);
      foes[at]=bare('R',{name:'波の娘"ラン・ドーター"',no:'EN027',hp:sc.hp,maxHp:sc.hp,desc:'負傷：「黒ケルピー」を2体召喚する。',keywords:['守護'],guardian:true});
      for(let i=0;i<(sc.rear||0);i++)foes.push(bare('B'+i,{lane:'rear'}));
      const source=bare('A0',{...PANEL_POOL.find(c=>c.no==='C043'),id:'A0',atk:12,hp:sc.allyHp||40,maxHp:sc.allyHp||40});
      const state=createBattleState({sides:{p1:{units:[source]},p2:{units:foes}},summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
      state._coreFirstSide='p1';setup(state);contactBoards.length=0;const initial=clone(state),before=new Set([...state.units.p1,...state.units.p2]);
      const held=[...before].map(u=>[u,u.atk,u.hp,u.maxHp,u.shield||0,u.weaken||0]);
      const emitted=[],runner=createBattleRunner(state,createSeededRng(53),e=>emitted.push(e),{skipOpening:true});
      runner.step({deferCompact:true});
      const events=emitted.filter(e=>!['battle_start','battle_end'].includes(e.type));
      held.forEach(args=>presentHoldShown(...args));
      phase='events';await _flushCorePveHitEvents(state,events,before);
      const hits=()=>legacy.filter(c=>c.fn==='hit'&&c.amount>0).map(c=>[c.unit,c.amount,c.hp]);
      const pve=hits(),order=calls.map(c=>c.name),pveBoard=clone(contactBoards);
      const combat=events.filter(e=>e.type==='damage'&&e.damageKind==='combat'&&e.amount>0);
      verify(sc.name+' PvE接触ダメージ',()=>{for(const e of combat)assert.ok(pve.some(c=>c[0]===e.unitId&&c[1]===e.amount&&c[2]===e.hpAfter),'数値・HPが出ない '+e.unitId);});
      verify(sc.name+' PvE命中時刻',()=>{for(const e of combat)assert.ok(legacy.some(c=>c.unit===e.unitId&&c.amount===e.amount&&c.phase==='contact'),'接触でヒットVFXが出ない '+e.unitId);});
      verify(sc.name+' PvE命中SE',()=>{if(combat.length)assert.ok(attackSounds.some(c=>c.phase==='contact'),'接触で命中SEが出ない');});
      setup(initial);contactBoards.length=0;G._savedBattleReplaying=false;
      const result={events:[{type:'battle_start',sides:clone(initial.units)},...clone(events)],formations:{p1:{units:initial.units.p1},p2:{units:initial.units.p2}}};
      beginOnlineVersusField(result);phase='events';
      await playOnlineBattleEvents(result,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});
      verify(sc.name+' 両側のHPと数値',()=>assert.deepEqual(hits(),pve));
      verify(sc.name+' 両側のVFX順序',()=>assert.deepEqual(calls.map(c=>c.name),order));
      verify(sc.name+' 接触時の盤面の並び',()=>assert.deepEqual(contactBoards,pveBoard));
      verify(sc.name+' オンライン命中時刻',()=>{for(const e of combat)assert.ok(legacy.some(c=>c.unit===e.unitId&&c.amount===e.amount&&c.phase==='contact'),'接触でヒットVFXが出ない '+e.unitId);});
      hideOnlineVersusBoard();
      console.log('検査 '+sc.name+': summon='+events.filter(e=>e.type==='summon').length+' rejected='+events.filter(e=>e.type==='summon_rejected').length);
    }
    // 最小盤面も一手だけでは拒否へ届かない。満員後まで進め、効果と命中の呼び出し順を比べる。
    const source=bare('A0',{...PANEL_POOL.find(c=>c.no==='C043'),id:'A0',atk:12,hp:300,maxHp:300});
    const ran=bare('R',{name:'波の娘"ラン・ドーター"',no:'EN027',desc:'負傷：「黒ケルピー」を2体召喚する。'});
    const state=createBattleState({sides:{p1:{units:[source]},p2:{units:[ran]}},summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
    state._coreFirstSide='p1';setup(state);const initial=clone(state),events=[];
    const runner=createBattleRunner(state,createSeededRng(53),e=>events.push(e),{skipOpening:true});
    const oldNow=performance.now;let now=oldNow();performance.now=()=>now+=1000;
    try {
      for(let turn=0;turn<60&&!runner.result;turn++) {
        const before=new Set([...state.units.p1,...state.units.p2]);
        const held=[...before].map(u=>[u,u.atk,u.hp,u.maxHp,u.shield||0,u.weaken||0]),from=events.length;
        runner.step({deferCompact:true});held.forEach(args=>presentHoldShown(...args));phase='events';
        await _flushCorePveHitEvents(state,events.slice(from),before);
        held.forEach(([u])=>presentReleaseShown(u));runner.compact();
      }
      assert.ok(events.some(e=>e.type==='summon_rejected'),'最小盤面を召喚拒否が起きるまで再生する');
      const controlEvents=[];
      const control=createBattleState({sides:{p1:{units:clone(initial.units.p1)},p2:{units:clone(initial.units.p2)}},summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
      control._coreFirstSide='p1';
      runBattleCore(control,createSeededRng(53),{skipOpening:true,onEvent:e=>controlEvents.push(e)});
      assert.deepEqual(events,controlEvents.filter(e=>e.type!=='battle_end'),'PvEへ再生しても次の手番のコア結果・順序を変えない');
      const visual=()=>({lab:calls.map(c=>[c.name,c.source,c.targets]),hit:legacy.map(c=>[c.fn,c.unit,c.amount]),
        order:route.filter(c=>c[1]!=='battle_start')});
      const pve=visual();setup(initial);
      const result={events:[{type:'battle_start',sides:clone(initial.units)},...clone(events)],formations:{p1:{units:initial.units.p1},p2:{units:initial.units.p2}}};
      beginOnlineVersusField(result);phase='events';
      await playOnlineBattleEvents(result,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});
      verify('最小盤面・満員後の両側演出',()=>assert.deepEqual(visual(),pve));hideOnlineVersusBoard();
      console.log('検査 最小盤面・満員後: '+events.length+'イベント／召喚拒否'+events.filter(e=>e.type==='summon_rejected').length+'件');
    } finally {performance.now=oldNow;}
  } finally {global.playAttackMotion=oldMotion;global.playHitVfx=oldHit;global.playAttackDamageSfx=oldSound;}
  assert.deepEqual(errors,[],'戦闘表示の回帰');
  console.log('OK ラン・ドーター9盤面: 接触のHP・VFX・SE・並び／召喚拒否・後衛・死亡／PvE・オンライン・保存再生');
}
async function shieldBreakChecks() {
  // 同じ全体攻撃で、1体は結界で防ぎ、隣の1体は死亡する。生存敵を残して終戦処理は含めない。
  const source={id:'A0',name:'検査素体',atk:12,hp:40,maxHp:40,color:'赤',keywords:['全体攻撃'],desc:''};
  const foe={id:'E0',name:'検査敵',atk:2,hp:40,maxHp:40,color:'黒',shield:1,guardian:true,keywords:[],desc:''};
  const next={...foe,id:'E1',hp:8,maxHp:8,shield:0,guardian:false};
  const initial=createBattleState({sides:{p1:{units:[source]},p2:{units:[foe,next]}}});
  const oldLab=playBattleLabFx,oldMotion=playAttackMotion,oldDeath=_playDeathBurnOnce;
  const oldTimer=setTimeout,oldNow=performance.now;
  for(const mode of ['通常PvE','保存再生','オンライン']) {
    const state=createBattleState({sides:{p1:{units:clone(initial.units.p1)},p2:{units:clone(initial.units.p2)}}});
    state._coreFirstSide='p1';setup(state);G._savedBattleReplaying=mode==='保存再生';
    _battleFxFollowStates();
    let release,finished=false,deathWhileBreak=false,phase='events',startedAt=null,stateAtBreak=null,loopAtBreak=null;
    let now=oldNow();performance.now=()=>now;
    global.setTimeout=(fn,ms,...args)=>{queueMicrotask(()=>{now+=Math.max(0,Number(ms)||0);fn(...args);});return 0;};
    const pending=new Promise(resolve=>{release=resolve;});
    global.playBattleLabFx=(code,...args)=>{
      if(code!=='shield_break')return oldLab(code,...args);
      startedAt=phase;
      stateAtBreak=battleFxStateValues(args[0]).shield;
      loopAtBreak=_battleFxStates.get(args[0].id)?.loops.has('shield-state');
      return pending;
    };
    global.playAttackMotion=async(_a,_b,_side,pause,opt)=>{if(pause)await pause();phase='contact';await opt?.onContact?.();phase='returned';};
    global._playDeathBurnOnce=(...args)=>{deathWhileBreak=startedAt!==null&&!finished;return oldDeath(...args);};
    let done=false,task;
    try {
      const events=[],runner=createBattleRunner(state,createSeededRng(53),e=>events.push(e),{skipOpening:true});
      runner.step({deferCompact:true});
      if(mode==='オンライン') {
        const result={events:[{type:'battle_start',sides:clone(initial.units)},...clone(events)],formations:{p1:{units:initial.units.p1},p2:{units:initial.units.p2}}};
        beginOnlineVersusField(result);_battleFxFollowStates();
        task=playOnlineBattleEvents(result,{onEvent:(e,ctx)=>renderOnlineVersusBoard(e,ctx)});
      } else {
        for(const side of ['p1','p2'])state.units[side].forEach((u,i)=>{const b=initial.units[side][i];presentHoldShown(u,b.atk,b.hp,b.maxHp,b.shield||0,0);});
        task=_flushCorePveHitEvents(state,events,new Set([...state.units.p1,...state.units.p2]));
      }
      task.then(()=>{done=true;});
      for(let i=0;i<2000&&!done;i++)await Promise.resolve();
      assert.ok(done,mode+' 結界消失VFXが終わらなくてもイベント再生が完了する');
      assert.equal(startedAt,'contact',mode+' 接触時にshield-breakを開始');
      assert.equal(stateAtBreak,0,mode+' 結界の状態値も命中と同時に進む');
      assert.equal(loopAtBreak,false,mode+' shield-stateを命中と同時に止める');
      assert.ok(deathWhileBreak,mode+' 結界消失中に敵の死亡演出を開始');
      assert.equal(legacy.filter(c=>c.opts?.keywordEffect==='結界').length,0,mode+' K018の旧VFXを出さない');
      assert.equal(sounds.filter(c=>c.code===getKeywordEffectSfxKey('結界')).length,1,mode+' K018.wavを1回だけ鳴らす');
      console.log('OK '+mode+' 結界消失: 接触開始・状態即時停止・旧VFXなし・死亡を待たせない');
    } finally {
      finished=true;release();if(task)await task;
      if(mode==='オンライン')hideOnlineVersusBoard();
      global.playBattleLabFx=oldLab;global.playAttackMotion=oldMotion;global._playDeathBurnOnce=oldDeath;
      global.setTimeout=oldTimer;performance.now=oldNow;
    }
  }
}
async function webpPresenterChecks(){
  const stubs=Object.fromEntries(Object.keys(definedEntrances).map(name=>[name,global[name]]));
  const create=global.document.createElement;
  global.document.createElement=tag=>{const e=create(tag);e.animate=()=>({finished:Promise.resolve(),cancel(){},addEventListener(){}});return e;};
  Object.assign(global,definedEntrances);
  try{
    const names=new Set(VbFx.effects.filter(d=>d.sourceCode).map(d=>d.name));
    const summarize=()=>calls.filter(c=>names.has(c.name)).map(c=>[c.name,c.opts.durationMs,c.opts.size,!!c.opts.repeat]);
    for(const [no,trigger,expected,baselineSe]of vbWebpVfxCases){
      const state=fixture(no),initial=clone(state);setup(state);renderAll();
      const run=vbLabVfxStartPve(no,state,trigger);await run.done;
      const events=clone(run.events),pve=summarize(),se=sounds.filter(c=>getEffectSfxKey(no)===c.code).map(c=>c.code);
      assert.ok(pve.some(c=>c[0]===expected),no+' のコアのイベントから '+expected+' を再生: '+JSON.stringify(pve));
      const normal=fixture(no);setup(normal);G._savedBattleReplaying=false;renderAll();
      await vbLabVfxStartPve(no,normal,trigger).done;
      assert.deepEqual(summarize(),pve,no+' 通常PvE／保存再生の新しい定義・尺・倍率・繰り返し');
      setup(initial);G._savedBattleReplaying=false;
      const result={events:[{type:'battle_start',sides:clone(initial.units)},...events],formations:{
        p1:{units:initial.units.p1,items:initial.items.p1,rings:initial.rings.p1},
        p2:{units:initial.units.p2,items:initial.items.p2,rings:initial.rings.p2}}};
      beginOnlineVersusField(result);await playOnlineBattleEvents(result,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});
      assert.deepEqual(summarize(),pve,no+' PvE／オンラインの新しい定義・尺・倍率・繰り返し');
      if(baselineSe){
        assert.deepEqual(se,baselineSe.pve,no+' PvEの元のSE番号・回数');
        assert.deepEqual(sounds.filter(c=>getEffectSfxKey(no)===c.code).map(c=>c.code),baselineSe.online,no+' オンラインの元のSE番号・回数');
      }else assert.deepEqual(sounds.filter(c=>getEffectSfxKey(no)===c.code).map(c=>c.code),se,no+' 元のSE番号・回数');
      hideOnlineVersusBoard();console.log('OK 第2段 '+no+' '+expected+'（共通描画入口・PvE・保存再生・オンライン）');
    }
  }finally{Object.assign(global,stubs);global.document.createElement=create;}
}
async function new1012Checks(){
  const apiFor=s=>({findUnit:(side,id)=>s.units[side].find(u=>u&&u.id===id),units:side=>s.units[side]});
  for(const [no,trigger]of Object.entries(vbLabVfx1012Cases)){
    const state=fixture(no);setup(state);
    const events=[{type:'effect_flash',side:'p1',unitId:'source',trigger:({attackContact:'attack',kill:'passive',releaseObserver:'release',mana:'mana'})[trigger]||trigger}];
    await _flushCorePveHitEvents(state,events,new Set([...state.units.p1,...state.units.p2]));
    assert.ok(!calls.some(c=>c.name===presentLabFx(no)[0]),no+' 発光だけでは固有演出を出さない');
  }
  const negatives={
    C004:s=>s.resources.p1.mana=0,C020:s=>{},C060:s=>s.resources.p1.mana=0,
    C089:s=>s.blood.p1=4,C099:s=>s.units.p1[0].boardCards=[],C082:s=>s.units.p1[0].boardCards=[],
    C095:s=>s.units.p1[0].atk=4,C009:s=>{},C056:s=>s.resources.p1.mana=0,C066:s=>s.resources.p1.mana=0,C079:s=>s.resources.p1.mana=0,
    C084:s=>{},C094:s=>s.units.p1.slice(1).forEach((u,i)=>{s.units.p1[i+1]={id:u.id,name:'素体',side:'p1',color:u.color,atk:4,hp:70,maxHp:100,desc:'',keywords:[]};}),
  };
  for(const [no,prepare]of Object.entries(negatives)){
    const state=fixture(no);prepare(state);setup(state);const events=[],rng=createSeededRng(1),emit=e=>events.push(e),u=state.units.p1[0];u._sealed=false;
    const hit=(a,b,n,c,ss,st,opt)=>coreResolveHit(state,a,b,n,c,rng,emit,{skipSourceEffects:!!ss,skipTough:!!st,...opt});
    if(no==='C009')coreApplyInjuryEffects(u,4,state,rng,emit,hit,state.units.p2[0],null,'combat');
    else if(no==='C084')hit(u,state.units.p2[0],2);
    else vbLabVfxTriggers[vbLabVfx1012Cases[no]](state,u,rng,emit,hit);
    await _flushCorePveHitEvents(state,events,new Set([...state.units.p1,...state.units.p2]));
    assert.ok(!calls.some(c=>c.name===presentLabFx(no)[0]),no+' 条件未達・確率の外れ・接続0・非撃破・再発火不成立で出さない: '+JSON.stringify(events));
  }
  for(const no of ['C099','C095','C082','C029','C034','C071','C084','C009','C094']){
    const state=fixture(no);setup(state);const run=vbLabVfxStartPve(no,state,vbLabVfx1012Cases[no]);await run.done;
    const main=calls.filter(c=>c.name===presentLabFx(no)[0]);
    if(no==='C099')assert.deepEqual(main.flatMap(c=>c.targets),run.events.filter(e=>e.type==='damage'&&e.sourceId==='source'&&!e.counter).map(e=>e.unitId),'弾の回数・対象・順序はdamageそのもの');
    if(no==='C095'){
      const targets=run.events.filter(e=>e.type==='stat_change'&&e.reason==='lilith').map(e=>e.unitId);
      assert.deepEqual(main[0].targets,targets,'リリスは重複対象を保持');assert.equal(main[0].opts.value,targets.length);
      assert.ok(main[0].opts.impactTimesMs.every((t,i,a)=>!i||t>a[i-1]),'各紋章の命中を順に通知');
    }
    if(no==='C082'){
      const evs=run.events.filter(e=>e.reason==='arch_demon_purple_buff'),targets=[...new Set(evs.map(e=>e.unitId))];
      assert.deepEqual(main[0].targets,targets);assert.equal(main[0].opts.value,evs.length/targets.length,'脈動数はコアの反復数');
    }
    if(no==='C029'||no==='C034')assert.deepEqual(main[0].targets,run.events.filter(e=>e.type==='stat_change'&&e.reason==='summon_buff').map(e=>e.unitId),'場の眷属だけに紋章');
    if(no==='C071'){
      const sources=run.events.find(e=>e.colorSources).colorSources;
      assert.deepEqual(main[0].targets,sources.map(c=>c.unitId));assert.equal(main[0].opts.value,sources.length,'光球数は実際の色数');assert.ok(main[0].opts.targets.every(r=>/^#[0-9a-f]{6}$/i.test(r.color)));
    }
    if(no==='C084'){const blood=run.events.find(e=>e.victimId);assert.deepEqual(main[0].targets,[blood.victimId]);assert.equal(main[0].opts.value,blood.gained);assert.ok(state.units.p2[0]._deathFxDone,'血へ消えた敵に焼失を重ねない');}
    if(no==='C009'){
      const names=calls.map(c=>c.name),shield=names.indexOf('shield-gain');assert.ok(shield>names.indexOf('minotaur')&&shield<names.lastIndexOf('minotaur'));
      assert.equal(main[0].opts.value,1);assert.equal(main[1].opts.value,2);assert.equal(sounds.filter(c=>c.code==='C009').length,1,'怒りのSEを照準で二重再生しない');
    }
    if(no==='C094'){
      const actual=run.events.find(e=>e.retriggerTargetId);assert.deepEqual(main[0].targets,[actual.retriggerTargetId]);
      assert.ok(calls.findIndex(c=>c.name==='chaos-imp')<calls.findIndex(c=>c.name==='nymph'),'再点火の後に対象の元の開戦演出');
    }
  }
  const motion=global.playAttackMotion,lab=global.playBattleLabFx;let contact=false,seen=[];
  try{
    global.playAttackMotion=async(_a,_b,_side,pause,opt)=>{if(pause)await pause();contact=true;try{await opt?.onContact?.();}finally{contact=false;}};
    global.playBattleLabFx=(code,...args)=>{if(['C064','C089'].includes(code))seen.push([code,contact]);return lab(code,...args);};
    for(const no of ['C064','C089']){const state=fixture(no);setup(state);await vbLabVfxStartPve(no,state,'attackContact').done;}
    assert.deepEqual(seen,[['C064',true],['C089',true]],'攻撃の魔力／吸血は実際の接触フックで始める');
  }finally{global.playAttackMotion=motion;global.playBattleLabFx=lab;}
  console.log('OK 新21種の発光だけ抑止・13不発条件・実対象/重複/反復/色数/血滴・ミノタウロス直列・接触同期');
}

async function browser1012ParityChecks(){
  const {LAB_1012_SCENARIOS,lab1012ParityScript}=require('../parity/present_parity');
  const frame=global.requestAnimationFrame,opening=global.playBattleOpeningSequence,render=global.renderOnlineVersusBoard;
  let introCalls=0;
  const run=async(no,trigger,online)=>{
    slots.clear();
    // Chromeスクリプトの盤面配置後の1フレームを進める。状態ループの後続RAFは回さない。
    const frames=[];global.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
    const done=vm.runInThisContext('(async()=>{'+lab1012ParityScript(no,trigger,online)+'})()',
      {filename:'present_parity:LAB1012:'+no});
    frames.splice(0).forEach(fn=>fn(performance.now()));
    return done;
  };
  try{
    // 従来のNode検査では省略していた登場VFXもVbFx境界まで通す。
    global.playBattleOpeningSequence=async()=>{
      for(const u of [...G.allies,...G.enemies].filter(Boolean)){
        introCalls++;await VbFx.play('opening-sigil',{durationMs:980,source:{element:slots.get(u.id)}});
      }
    };
    for(const [no,trigger]of LAB_1012_SCENARIOS){
      const pve=await run(no,trigger,false),online=await run(no,trigger,true);
      assert.ok(pve.own>0&&online.own>0,no+' Chromeと同じスクリプトで実体イベントから発動');
      assert.deepEqual(online,pve,no+' 登場演出後の発生元・対象・回数・入力・尺・SEが一致');
    }
    assert.ok(introCalls>=LAB_1012_SCENARIOS.length,'オンラインのbattle_startで登場VFXを実際に記録した');
    const pve=await run('C004','mana',false);
    let injected=false;
    global.renderOnlineVersusBoard=async(ev,ctx)=>{
      if(ev.type!==ONLINE_EVENT.BATTLE_START&&!injected){
        injected=true;
        await VbFx.play('opening-sigil',{durationMs:980});playSfx('C071');
      }
      return render(ev,ctx);
    };
    const extra=await run('C004','mana',true);
    assert.ok(extra.calls.some(c=>c[0]==='opening-sigil'),'実体イベント中の同名VFXは除外しない');
    assert.notDeepEqual(extra.calls,pve.calls,'登場後に余分なVFXが入ると一致検査が落ちる');
    assert.notDeepEqual(extra.sounds,pve.sounds,'登場後に余分なSEが入ると一致検査が落ちる');
    console.log('OK Chrome用LAB1012スクリプト: 登場VFXありで21種一致／実体イベント中の余分なVFX・SEを検出');
  }finally{
    global.requestAnimationFrame=frame;global.playBattleOpeningSequence=opening;global.renderOnlineVersusBoard=render;
  }
}

function new1012CoreBaselineChecks(){
  // コア変更は演出メタデータだけ。作業前コアと数値・実体イベントを厳密に比較する。
  const baseline='097927f8332c7a55701eaa82aebc7b2177d17016';
  const ctx={console,Math,PANEL_POOL,ENEMY_POOL,ITEM_POOL,KW_NO_MAP,KW_DESC_MAP};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'js/online/protocol.js'),'utf8'),ctx);
  vm.runInContext(require('node:child_process').execFileSync('git',['show',baseline+':prototype/js/battle/core.js'],{cwd:ROOT,encoding:'utf8',maxBuffer:2e6}),ctx);
  const clean=(value)=>JSON.parse(JSON.stringify(value,(key,v)=>['_coreOpeningEffectsState','retriggerSourceId','retriggerTargetId','retriggerKey','colorSources','reactionSourceId','victimId','victimSide'].includes(key)?undefined:v));
  for(const [no,trigger]of Object.entries(vbLabVfx1012Cases)){
    const initial=fixture(no),results=[];
    for(const api of [global,ctx]){
      const state=api.createBattleState({sides:{p1:{units:clone(initial.units.p1)},p2:{units:clone(initial.units.p2)}},resources:clone(initial.resources),blood:clone(initial.blood),summonDefs:[...PANEL_POOL,...ENEMY_POOL]});
      const events=[],emit=e=>events.push(e),rng=api.createSeededRng(no==='C020'?7:53),u=state.units.p1[0];u._sealed=false;u._currentAttackTarget=state.units.p2[0];
      const hit=(a,b,n,c,ss,st,opt)=>api.coreResolveHit(state,a,b,n,c,rng,emit,{skipSourceEffects:!!ss,skipTough:!!st,...opt});
      if(trigger==='mana')api.coreApplyManaThresholdEffects(state,rng,emit,hit);
      else if(trigger==='opening')api.coreApplyOpeningEffects(u,state,rng,emit,hit);
      else if(trigger==='injury')api.coreApplyInjuryEffects(u,4,state,rng,emit,hit,state.units.p2[0]);
      else if(trigger==='death'){u.hp=0;emit({type:'death',side:u.side,unitId:u.id});api.coreTriggerDeath(u,state,emit);api.coreApplyDeathEffects(u,state,rng,emit,hit);}
      else if(trigger==='release')api.coreApplyReleaseEffects(u,[state.units.p1[1]],state,rng,emit,hit);
      else if(trigger==='releaseObserver')api.coreApplyReleaseEffects(state.units.p1[1],[],state,rng,emit,hit);
      else if(trigger==='kill'){state.units.p2[0].hp=1;hit(u,state.units.p2[0],2);}
      else {state._coreFirstSide='p1';api.createBattleRunner(state,rng,emit,{skipOpening:true}).step({deferCompact:true});}
      const filtered=clean(events).map(e=>{if(no==='C060'&&e.reason==='behemoth'){delete e.sourceId;delete e.gained;}if(no==='C009'&&e.type==='keyword_effect'&&e.effect==='shield')delete e.sourceId;return e;});
      results.push({events:filtered,resources:clean(state.resources),blood:clean(state.blood),units:clean(['p1','p2'].map(side=>state.units[side].map(api.coreUnitSnapshot)))});
    }
    assert.deepEqual(results[0],results[1],no+' 作業前コアと結果・メタデータ以外の全イベントが一致');
  }
  console.log('OK 作業前コアとの21ケース完全一致（演出用の追加メタデータだけ除外）');
}
(async()=>{
  await loadGameData();
  if(!process.env.VB_ONLY||process.env.VB_ONLY==='bugs')await battleBugChecks();
  if(!process.env.VB_ONLY||process.env.VB_ONLY==='shield')await shieldBreakChecks();
  assetChecks();
  if(!process.env.VB_ONLY||process.env.VB_ONLY==='1012'){new1012CoreBaselineChecks();await new1012Checks();}
  if(!process.env.VB_ONLY||process.env.VB_ONLY==='browser1012')await browser1012ParityChecks();
  if(!process.env.VB_ONLY)await staleSessionChecks();
  const selected=[...Object.entries(vbLabVfx1012Cases).map(([no,trigger])=>[no,no,trigger]),...Object.entries(cases).map(([no,trigger])=>[no,no,trigger]),...vbLabVfxExtraCases()]
    .filter(([no])=>!process.env.VB_ONLY||process.env.VB_ONLY.split(',').includes(no));
  for(const [no,card,trigger]of selected) await runCase(no,trigger,card);
  if(!process.env.VB_ONLY) {await committedEndChecks();await extraChecks();}
  if(!process.env.VB_ONLY||process.env.VB_ONLY==='webp')await webpPresenterChecks();
  stopBattleLabFx();console.log('LAB戦闘接続回帰: 既存 '+selected.length+'演出 / 第2段 '+(!process.env.VB_ONLY||process.env.VB_ONLY==='webp'?vbWebpVfxCases.length:0)+'シナリオ OK');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
