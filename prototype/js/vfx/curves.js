/* 共通のキーフレーム補間・色補間・seed付き乱数・連続ノイズ。定義の式を実行する機能は持たない。 */
var VbFxCurves = (function () {
  'use strict';
  function clamp(v,a,b){return Math.max(a==null?0:a,Math.min(b==null?1:b,v));}
  function mix(a,b,t){return a+(b-a)*t;}
  function ease(t){return 1-Math.pow(1-clamp(t),3);}
  function smooth(t){t=clamp(t);return t*t*(3-2*t);}
  function envelope(t,a,r){return clamp(t/(a||.1))*clamp((1-t)/(r||.25));}
  function random(i,seed){var v=Math.sin(i*127.1+seed*311.7)*43758.5453;return v-Math.floor(v);}
  function hash(x,y,seed){var h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed||1,1442695041);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967295;}
  function noise(x,y,seed){var ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),fx),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),fx),fy);}
  function fractal(x,y,seed){return noise(x,y,seed)*.57+noise(x*2.07,y*2.07,seed+7)*.28+noise(x*4.13,y*4.13,seed+19)*.15;}
  function rgb(c){return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];}
  function rgba(c,a){return 'rgba('+rgb(c).join(',')+','+clamp(a)+')';}
  function mixRgb(a,b,f){return[0,1,2].map(function(i){return Math.round(mix(a[i],b[i],f));}).join(',');}
  // 粒のテクスチャは色ごとに作るので、色は14段階に丸めて使う（既存のキャッシュ方針）。
  function mixHex(a,b,f){f=Math.round(clamp(f)*14)/14;return '#'+[0,1,2].map(function(i){return('0'+Math.round(mix(a[i],b[i],f)).toString(16)).slice(-2);}).join('');}
  function sample(c,time){
    var keys=c.keys;
    function bounded(v){return c.clamp?clamp(v,c.clamp[0],c.clamp[1]):v;}
    if(time<=keys[0][0])return bounded(keys[0][1]);
    for(var i=1;i<keys.length;i++)if(time<=keys[i][0]){
      var a=keys[i-1],b=keys[i],u=(time-a[0])/(b[0]-a[0]);
      var mode=c.segments?c.segments[i-1]:c.interpolation;
      if(mode==='step')u=time<b[0]?0:1;else if(mode==='smooth')u=smooth(u);else if(mode==='ease-out')u=ease(u);
      else if(mode==='power-in')u=Math.pow(u,c.exponent);else if(mode==='power-out')u=1-Math.pow(1-u,c.exponent);
      else if(mode==='sine-in')u=1-Math.cos(u*Math.PI/2);else if(mode==='sine-out')u=Math.sin(u*Math.PI/2);
      return bounded(mix(a[1],b[1],u));
    }
    return bounded(keys[keys.length-1][1]);
  }
  function inverse(c,value,iterations){
    var keys=c.keys,first=keys[0],last=keys[keys.length-1],lo=0,hi=1;
    if(c.interpolation==='linear'&&keys.length===2)return mix(first[0],last[0],clamp((value-first[1])/(last[1]-first[1])));
    for(var i=0;i<(iterations||16);i++){var mid=(lo+hi)/2;if(sample(c,mix(first[0],last[0],mid))<value)lo=mid;else hi=mid;}
    return mix(first[0],last[0],(lo+hi)/2);
  }
  function gradientColor(stops,u){
    if(u<=stops[0][0])return stops[0][1];
    for(var i=1;i<stops.length;i++)if(u<=stops[i][0]){
      var a=rgb(stops[i-1][1]),b=rgb(stops[i][1]),f=(u-stops[i-1][0])/(stops[i][0]-stops[i-1][0]);
      return '#'+[0,1,2].map(function(k){return('0'+Math.round(mix(a[k],b[k],f)).toString(16)).slice(-2);}).join('');
    }
    return stops[stops.length-1][1];
  }
  function range(r,seed,index){return Array.isArray(r)?mix(r[0],r[1],random(index,seed)):r;}
  return {clamp:clamp,mix:mix,ease:ease,smooth:smooth,envelope:envelope,random:random,hash:hash,noise:noise,fractal:fractal,
    rgb:rgb,rgba:rgba,mixRgb:mixRgb,mixHex:mixHex,sample:sample,inverse:inverse,gradientColor:gradientColor,range:range};
})();
