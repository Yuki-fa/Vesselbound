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
const nodes = new Map(), slots = new Map(), calls = [], sounds = [], legacy = [], stopped = [], motions = [], attackSounds = [], route = [];
const rect = (i,side)=>({left:100+i*110,top:side==='p2'?140:550,width:95,height:140,right:195+i*110,bottom:side==='p2'?280:690});
function element(id,r) {const e=makeElement();e.id=id;e.isConnected=true;e.offsetWidth=r.width;e.offsetHeight=r.height;e.getBoundingClientRect=()=>r;return e;}
const screen=element('scr-battle',{left:0,top:0,width:1280,height:800,right:1280,bottom:800});
screen.classList.contains=c=>c==='active';nodes.set(screen.id,screen);
global.innerWidth=1280;global.innerHeight=800;
global.document.getElementById=id=>nodes.get(id)||null;
global.document.querySelector=selector=>selector==='#scr-battle .battle-area'?screen:null;
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
global.playEffectVfxOnUnit=(u,s,code)=>{legacy.push({fn:'effect',unit:u?.id,code});return {stop:()=>Promise.resolve()};};
global._playCardEffectVfx=(code,targets)=>{legacy.push({fn:'card',code,targets:targets.map(u=>u.id)});return Promise.resolve();};
global.battlePresentationSetTimeout=fn=>{queueMicrotask(fn);return 0;};
SaveRun.recordDeath=()=>{};
global.persistBoardCharacterStats=()=>true;
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
  assert.ok(main.every(c=>c.opts.speed===1.5),no+' 標準速さ');
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
  for(const file of ['K009.webp','K020.webp','K004.webp','appearance_sheet.webp'])add('assets/vfx/'+file);
  for(const url of urls)assert.ok(fs.existsSync(path.join(ROOT,url.split('?')[0])),url+' の素材が存在する');
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(html,/<link\s+rel="icon"\s+href="data:,"/,'未配置favicon.icoの自動取得を防ぐ');
  console.log('OK 素材 '+urls.size+'パスの実在・favicon.icoの自動取得抑止');
}
async function extraChecks() {
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
  assert.equal(legacy.filter(c=>c.opts?.keywordEffect==='結界').length,2,'結界の防御命中は従来のK018へ渡す');
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
    assert.equal(_battleFxStates.size,0,'終戦時に状態ループを破棄する');
    assert.ok(!stopped.slice(stops).includes('all'),'状態停止が終戦の単発VFXを打ち切らない');
    console.log('OK 本体／SaveRun.applyEndの終戦VFX・数値の二重加算なし・終戦中の状態停止');
  } finally {global._persistPermanentStatOrWarn=persist;}
}
(async()=>{
  await loadGameData();
  assetChecks();
  if(!process.env.VB_ONLY)await staleSessionChecks();
  const selected=[...Object.entries(cases).map(([no,trigger])=>[no,no,trigger]),...vbLabVfxExtraCases()]
    .filter(([no])=>!process.env.VB_ONLY||process.env.VB_ONLY.split(',').includes(no));
  for(const [no,card,trigger]of selected) await runCase(no,trigger,card);
  if(!process.env.VB_ONLY) {await committedEndChecks();await extraChecks();}
  stopBattleLabFx();console.log('LAB戦闘接続回帰: '+selected.length+'演出 OK');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
