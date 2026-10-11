'use strict';
// 2026-10-11: Chrome検査の数値観測をそのまま使い、CSS開始の遅れを許しつつ不可視の数値は通さない。
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {observeDamageLabel}=require('../parity/damage_shake_1011_check');
function environment(change=()=>{},noFrames=false){
  let now=0,id=0,count=0;
  const frames=new Map(),timers=new Map();
  const style={display:'block',visibility:'visible',opacity:'1',color:'rgb(255, 255, 255)'};
  const parent={style:{...style},parentElement:null};
  const label={isConnected:true,parentElement:parent,style:{...style},rect:{left:200,top:100,right:280,bottom:160,width:80,height:60},getBoundingClientRect(){return this.rect;}};
  const context=vm.createContext({innerWidth:1920,innerHeight:1080,performance:{now:()=>now},getComputedStyle:el=>el.style,
    requestAnimationFrame:fn=>{const n=++id;frames.set(n,fn);if(!noFrames)queueMicrotask(()=>{if(!frames.delete(n))return;now+=16;change(label,++count);fn(now);});return n;},
    cancelAnimationFrame:n=>frames.delete(n),setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:n=>timers.delete(n)});
  return {label,frames,timers,observe:vm.runInContext('('+observeDamageLabel.toString()+')',context),
    timeout(){now=1500;for(const fn of [...timers.values()])fn();}};
}
(async()=>{
  let checked=0;
  async function check(name,change,expected){
    const e=environment(change),result=await e.observe(e.label);
    assert.equal(result.visible,expected,name);
    assert.equal(e.frames.size,0,name+' 観測フレームを片付ける');
    assert.equal(e.timers.size,0,name+' タイマーを片付ける');
    checked++;return result;
  }
  const delayed=await check('CSS開始時の透明な2フレームを表示欠落と誤判定しない',(el,frame)=>{el.style.opacity=frame<=3?'0':'1';},true);
  assert.equal(delayed.frames,4);assert.equal(delayed.first.opacity,'0');assert.equal(delayed.last.opacity,'1');
  assert.equal(delayed.visibleAt,64);
  await check('最初の表示フレームを検出する',()=>{},true);
  for(const [name,change] of [
    ['透明のまま',el=>{el.style.opacity='0';}],
    ['非表示',el=>{el.style.display='none';}],
    ['visibility:hidden',el=>{el.style.visibility='hidden';}],
    ['透明な文字色',el=>{el.style.color='rgba(0, 0, 0, 0)';}],
    ['画面外',el=>{el.rect.left=2000;el.rect.right=2080;}],
    ['寸法ゼロ',el=>{el.rect.width=0;}],
    ['透明な親',el=>{el.parentElement.style.opacity='0';}],
    ['非表示の親',el=>{el.parentElement.style.display='none';}],
    ['表示前に消失',(el,frame)=>{el.style.opacity='0';if(frame===3)el.isConnected=false;}],
  ])await check(name+'を成功扱いしない',change,false);
  const stopped=environment(()=>{},true),pending=stopped.observe(stopped.label);
  stopped.timeout();assert.equal((await pending).visible,false);
  assert.equal(stopped.frames.size,0);assert.equal(stopped.timers.size,0);checked++;
  console.log('2026-10-11 振動Chrome検査の数値観測: '+checked+'件OK（CSS開始遅延・画面外・色・親の非表示・消失・rAF停止）');
})().catch(e=>{console.error(e);process.exitCode=1;});
