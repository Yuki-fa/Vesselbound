'use strict';
const noop = () => {};
const immediate = (fn) => { if (typeof fn === 'function') fn(); return 0; };
function makeElement(tag = 'div') {
  const el = {nodeType:1, tagName:String(tag).toUpperCase(), style:{setProperty:noop,getPropertyValue:()=>'',removeProperty:noop}, dataset:{}, className:'',
    classList:{add:noop,remove:noop,toggle:()=>false,contains:()=>false}, children:[], childNodes:[],
    parentNode:null, innerHTML:'', textContent:'', value:'', disabled:false, checked:false, hidden:false,
    offsetWidth:0, offsetHeight:0,
    appendChild(c){if(c){this.children.push(c);c.parentNode=this;}return c;}, removeChild:noop, remove:noop,
    prepend:noop, replaceChildren:noop, setAttribute(k,v){this[k]=String(v);}, getAttribute(k){return this[k]??null;},
    removeAttribute:noop, addEventListener:noop, removeEventListener:noop, dispatchEvent:noop,
    querySelector:()=>null, querySelectorAll:()=>[], closest:()=>null,
    getBoundingClientRect:()=>({left:0,top:0,right:0,bottom:0,width:0,height:0}),
    getContext:()=>({clearRect:noop,fillRect:noop,drawImage:noop}),
    animate:()=>({finished:Promise.resolve(),cancel:noop,play:noop,playbackRate:1}), focus:noop,blur:noop,click:noop};
  return el;
}
const documentStub={body:makeElement('body'),documentElement:makeElement('html'),createElement:makeElement,createElementNS:(_ns,tag)=>makeElement(tag),
  createTextNode:t=>({textContent:String(t)}),getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],
  addEventListener:noop,removeEventListener:noop};
const storage=new Map();
const localStorageStub={getItem:k=>storage.get(String(k))??null,setItem:(k,v)=>storage.set(String(k),String(v)),removeItem:k=>storage.delete(String(k)),clear:()=>storage.clear()};
global.window=global; global.window.addEventListener=noop; global.window.removeEventListener=noop; global.document=documentStub;
try { Object.defineProperty(global,'navigator',{value:{userAgent:'node-balance-sim'},configurable:true}); } catch (_) {}
global.requestAnimationFrame=immediate; global.cancelAnimationFrame=noop; global.performance={now:()=>Date.now()};
global.getComputedStyle=()=>new Proxy({}, {get:()=>''});
global.Audio=function(){return {play:()=>Promise.resolve(),pause:noop,load:noop,addEventListener:noop,currentTime:0};};
global.HTMLMediaElement=function HTMLMediaElement(){};
global.localStorage=localStorageStub; global.sessionStorage=localStorageStub; global.alert=noop; global.confirm=()=>true; global.prompt=()=>null;
global.matchMedia=()=>({matches:false,addListener:noop,removeListener:noop});
global.ResizeObserver=function(){this.observe=noop;this.disconnect=noop;};
global.IntersectionObserver=function(){this.observe=noop;this.disconnect=noop;};
global.fetch=()=>Promise.reject(new Error('balance_sim: network disabled'));
// 戦闘間のG再初期化へ古いタイマーが遅れて到達すると、次試行の勝敗を壊す。
// ハーネスでは演出待ちを再現しないため、タイマー処理はその場で完了させる。
global.setTimeout=(fn,_ms,...args)=>{ if(typeof fn==='function') fn(...args); return 0; };
module.exports={makeElement};
