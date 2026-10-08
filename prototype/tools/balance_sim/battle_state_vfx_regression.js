'use strict';
// 実際のVbFxを仮DOM・手動rAFで動かす。描画内容は変えず、付け替えと停止の競合を再現する。
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..'),frames=new Map(),slots=new Map(),clones=[];
let clock=0,sequence=0;
const rotations=[];
function drawingContext() {
  return new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}}),
    rotate:a=>rotations.push(a)}, {get:(o,k)=>k in o?o[k]:(()=>{})});
}
function element(id='') {
  const values=new Map(),e={nodeType:1,id,dataset:{},children:[],isConnected:true,offsetWidth:95,offsetHeight:140,
    style:{setProperty:(k,v)=>values.set(k,String(v)),getPropertyValue:k=>values.get(k)||'',getPropertyPriority:()=>'',removeProperty:k=>values.delete(k)},
    classList:{contains:c=>c==='active'},querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,
    hasAttribute:()=>false,getContext:drawingContext,getBoundingClientRect:()=>({left:100,top:200,width:95,height:140,right:195,bottom:340}),
    appendChild(child){if(child.parentNode)child.remove();this.children.push(child);child.parentNode=child.parentElement=this;child.isConnected=true;return child;},
    remove(){this.isConnected=false;if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);},
  };
  if(id)e.dataset.unitId=id;
  return e;
}
const body=element(),screen=element(),ctx={console,URL,Uint8ClampedArray,Map,Set,WeakMap,WeakSet,
  innerWidth:1280,innerHeight:800,devicePixelRatio:1,addEventListener(){},removeEventListener(){},
  performance:{now:()=>clock},requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:()=>++sequence,clearTimeout(){},
  document:{body,baseURI:'file:///prototype/index.html',createElement:()=>element(),getElementById:id=>id==='scr-battle'?screen:null,
    querySelectorAll:selector=>selector.includes('attack-motion-clone')?clones.filter(c=>c.isConnected):[],querySelector:()=>null},
  getComputedStyle:e=>({visibility:e.style.visibility||'visible',display:'block',opacity:'1',filter:'none',transform:e.style.transform||'none'}),
  DOMMatrixReadOnly:class{constructor(){this.a=Math.cos(.2);this.b=Math.sin(.2);}},
  G:{phase:'battle',allies:[],enemies:[]},_vfxClipLayer:()=>body,getCurrentUnitSlot:(_side,u)=>slots.get(u.id)||null,
};
ctx.window=ctx;vm.createContext(ctx);
for(const file of ['js/battle/present.js',...require('../vfx_export').RUNTIME_SCRIPTS,'js/engine/battle_fx.js','js/battle/present_events.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
function fxFrame() {
  clock+=16;
  const pending=[...frames].find(([,fn])=>fn.name==='tick');
  assert.ok(pending,'VbFxの描画rAFがある');frames.delete(pending[0]);pending[1](clock);
}
function setup() {
  ctx.stopBattleLabFx();frames.clear();slots.clear();clones.length=0;rotations.length=0;
  const u={id:'A0',hp:40,maxHp:40,shield:1,poison:3,weaken:2,keywords:[]},slot=element(u.id);
  ctx.G.allies=[u];ctx.G.enemies=[];ctx.G.phase='battle';slots.set(u.id,slot);
  ctx.battleFxSyncUnit(u,'ally',slot);ctx._battleFxFollowStates();fxFrame();
  assert.equal(ctx.VbFx.activeCount(),3,'結界・毒・弱体を開始');
  return {u,slot};
}
async function run() {
  let {u,slot}=setup();
  const next=element(u.id);slots.set(u.id,next);slot.remove();
  fxFrame(); // fx_labだけが先に新DOMへ付け替え、battle_fxは古いDOM参照を保持したまま。
  ctx._battleFxFollowStates();
  assert.equal(ctx.VbFx.activeCount(),3,'DOM再生成後も同じ状態を二重に出さない');
  next.style.transform='rotate(0.2rad)';fxFrame();
  assert.ok(rotations.some(a=>Math.abs(a-.2)<1e-6),'付け替え後もカードの傾きへ追従');
  ctx.G.phase='victory';ctx.stopBattleLabFx({keepStates:true});ctx._battleFxFollowStates();
  assert.equal(ctx.VbFx.activeCount(),3,'終戦後の状態を残す');
  u._deathFxReady=true;ctx._battleFxFollowStates();
  assert.equal(ctx.VbFx.activeCount(),0,'付け替え済みDOMでも死亡で全状態を止める');
  console.log('OK DOM再生成・傾き追従・終戦keepStates・死亡停止');

  ({u,slot}=setup());
  const clone=element(u.id);clones.push(clone);fxFrame();
  ctx.presentBeginPlayback();u._displayHp=0;ctx._battleFxFollowStates();
  assert.equal(ctx.VbFx.activeCount(),3,'HP0の数値を読ませる間は、まだ画面にあるカードの状態を残す');
  await ctx.presentDeathBatch([{type:'death',side:'p1',unitId:u.id}],{
    findUnit:()=>u,startFx:()=>assert.equal(ctx.VbFx.activeCount(),0,'死亡演出の開始時には状態が消えている'),compact(){},
  });
  assert.equal(ctx.VbFx.activeCount(),0,'攻撃クローンへ付け替え後も死亡で全停止');
  clone.remove();ctx._battleFxFollowStates();
  assert.equal(ctx.VbFx.activeCount(),0,'クローン削除後に状態を出し直さない');
  ctx.presentEndPlayback();
  console.log('OK 攻撃クローンへ追従した状態を死亡演出と同時に停止');

  ({u,slot}=setup());slots.delete(u.id);slot.remove();fxFrame();
  assert.equal(ctx.VbFx.activeCount(),0,'表示先がnullになった状態ジョブを残さない');
  ctx._battleFxFollowStates();
  assert.equal(ctx.VbFx.activeCount(),0,'盤面からの除去・詰め後にも残らない');
  console.log('OK DOM除去・盤面詰め後の状態停止');

  ({u,slot}=setup());const motion=element(u.id);clones.push(motion);fxFrame();
  ctx.battleFxAdvanceStates(u,{shield:0});
  assert.equal(ctx.VbFx.snapshot().some(s=>s.name==='shield-state'),false,'結界消失は次のrAFを待たず停止');
  assert.equal(ctx.VbFx.activeCount(),2,'毒・弱体は残す');
  ctx.stopBattleLabFx();console.log('OK 結界消失の瞬間だけshield-stateを停止');
}
run().catch(e=>{console.error(e.stack);process.exitCode=1;});
