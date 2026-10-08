/* 手続き生成テクスチャ。画像ファイルへ依存しない（ベクター記号はdefsのパスデータ）。 */
var VbFxTextures = (function () {
  'use strict';
  var spriteCache=Object.create(null), math=VbFxCurves, TAU=Math.PI*2;
  var clamp=math.clamp, mix=math.mix, noise=math.noise, fractal=math.fractal, rgba=math.rgba, rgb=math.rgb;
  function surface(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function texture(type, color, variant, params) {
    params=params||{};
    var key = type + color + (variant || 0)+JSON.stringify(params), cached = spriteCache[key]; if (cached) return cached;
    var c = surface(params.resolution||(type === 'glow' ? 192 : 128)), g = c.getContext('2d'), s = c.width, m = s / 2;
    if (type === 'glow') {
      var halo = g.createRadialGradient(m, m, 0, m, m, m);
      halo.addColorStop(0, '#ffffff'); halo.addColorStop(.035, '#fffef7');
      halo.addColorStop(.11, rgba(color, .98)); halo.addColorStop(.28, rgba(color, .46));
      halo.addColorStop(.57, rgba(color, .13)); halo.addColorStop(1, rgba(color, 0));
      g.fillStyle = halo; g.fillRect(0, 0, s, s);
      var bloom = surface(s); var bg = bloom.getContext('2d');
      bg.filter = 'blur('+(params.blurPx==null?5:params.blurPx)+'px)'; bg.globalAlpha = .65; bg.drawImage(c, 0, 0); bg.filter = 'none';
      bg.globalCompositeOperation = 'lighter'; bg.drawImage(c, 0, 0); c = bloom;
    } else {
      var data = g.createImageData(s, s), col = rgb(color), seed = (params.seed==null?11:params.seed) + (variant || 0) * 31;
      for (var y = 0; y < s; y++) for (var x = 0; x < s; x++) {
        var u = (x - m) / m, v = (y - m) / m, d = Math.hypot(u, v), a = Math.atan2(v, u);
        var warpFrequency=params.warpFrequency==null?3:params.warpFrequency,noiseScale=params.noiseScale==null?4.4:params.noiseScale;
        var warp = noise(u * warpFrequency + 7, v * warpFrequency + 7, seed);
        var curl = a + warp * (params.warp==null?2.4:params.warp) + d * 4.5;
        var n = fractal(Math.cos(curl) * d * noiseScale + 17, Math.sin(curl) * d * noiseScale + 21, seed);
        var falloff = clamp(1 - d * (1 + (warp - .5) * .35));
        var plasma = type.indexOf('plasma') === 0;
        var density = plasma ? Math.pow(clamp((n - .29) * 2.45), 1.15) : .18 + n * .9;
        var value = type === 'stone' ? .36 + n * .64 : plasma ? .3 + density * 1.12 : .23 + n * .95;
        var core = type === 'plasma' ? Math.pow(clamp(1 - d * 3.2), 2) * .93 : 0;
        var k = (y * s + x) * 4;
        for (var ch = 0; ch < 3; ch++) data.data[k + ch] = mix(col[ch] * value, 255, core);
        data.data[k + 3] = type === 'stone' ? 255 : Math.pow(falloff, type === 'smoke' ? 1.45 : 1.8) * density * 255;
      }
      g.putImageData(data, 0, 0);
      if (type === 'smoke') {
        var soft = surface(s), sg = soft.getContext('2d'); sg.filter = 'blur('+(params.blurPx==null?2:params.blurPx)+'px)'; sg.drawImage(c, 0, 0); c = soft;
      }
    }
    spriteCache[key] = c; return c;
  }

  function magicTexture(color) {
    var key = 'magic' + color; if (spriteCache[key]) return spriteCache[key];
    var c = surface(512), g = c.getContext('2d'), m = 256, r = 207;
    g.translate(m, m); g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
    function circle(rad, lw, alpha) { g.globalAlpha = alpha; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.stroke(); }
    circle(r * .96, r * .14, .46); circle(r, 2.4, .95); circle(r * .91, 1.6, .9);
    circle(r * .74, 1.7, .8); circle(r * .7, .8, .65);
    for (var petal = 0; petal < 40; petal++) {
      g.save(); g.rotate(petal * TAU / 40); g.globalAlpha = .58; g.lineWidth = 2.1;
      g.beginPath(); g.moveTo(r * .91, 0);
      g.bezierCurveTo(r * .93, -11, r * 1.01, -11, r, 0);
      g.bezierCurveTo(r * .97, 10, r * .9, 10, r * .91, 0); g.stroke(); g.restore();
    }
    for (var n = 0; n < 32; n++) {
      g.save(); g.rotate(n * TAU / 32); g.globalAlpha = .9; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(r * .81, -7); g.lineTo(r * .86, 0); g.lineTo(r * .81, 7);
      g.moveTo(r * .81, 0); g.lineTo(r * .88, 0); g.stroke(); g.restore();
    }
    for (var p = 0; p < 8; p++) {
      g.save(); g.rotate(p * TAU / 8); g.globalAlpha = .9; g.lineWidth = 1.45;
      g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(24, -14, 33, -69, 9, -r * .66);
      g.bezierCurveTo(0, -r * .75, -14, -r * .62, -9, -r * .53);
      g.bezierCurveTo(-36, -70, -23, -13, 0, 0); g.stroke();
      g.beginPath(); g.arc(19, -r * .64, 12, 0, TAU * .82); g.stroke();
      g.beginPath(); g.arc(-19, -r * .64, 12, Math.PI, TAU * 1.28); g.stroke(); g.restore();
    }
    circle(r * .12, 1.1, .75);
    var out = surface(512), og = out.getContext('2d');
    og.filter = 'blur(4px)'; og.globalAlpha = .8; og.drawImage(c, 0, 0); og.filter = 'none';
    og.globalCompositeOperation = 'lighter'; og.drawImage(c, 0, 0); spriteCache[key] = out; return out;
  }
  function boneTexture() {
    var key='bone'; if(spriteCache[key]) return spriteCache[key];
    var c=surface(128),g=c.getContext('2d');
    var b=g.createRadialGradient(48,40,5,64,64,66); b.addColorStop(0,'#f6f0d2'); b.addColorStop(.6,'#a5b6a9'); b.addColorStop(1,'#395d56');
    g.fillStyle=b;g.beginPath();g.moveTo(33,84);g.bezierCurveTo(3,40,29,13,64,15);g.bezierCurveTo(109,13,125,48,95,84);
    g.lineTo(82,108);g.lineTo(43,108);g.closePath();g.fill();
    g.globalCompositeOperation='source-atop';g.globalAlpha=.27;g.drawImage(texture('stone','#bcd5c3',2),0,0,128,128);g.globalAlpha=1;
    var eye=g.createLinearGradient(0,45,0,86);eye.addColorStop(0,'#061816');eye.addColorStop(1,'#44776a');g.fillStyle=eye;
    g.beginPath();g.ellipse(42,60,13,17,-.28,0,TAU);g.ellipse(84,60,13,17,.28,0,TAU);g.fill();
    g.beginPath();g.moveTo(63,71);g.lineTo(55,86);g.lineTo(71,86);g.closePath();g.fill();
    g.strokeStyle='#2a5047';g.lineWidth=2;for(var i=0;i<5;i++){g.beginPath();g.moveTo(45+i*8,94);g.lineTo(47+i*8,109);g.stroke();}
    var out=surface(128),o=out.getContext('2d');o.filter='blur(3px)';o.globalAlpha=.55;o.drawImage(c,0,0);o.filter='none';o.drawImage(c,0,0);
    spriteCache[key]=out;return out;
  }

  // 第2段で使う手続き名も同じ部品へ解決する。palette/variantは生成パラメータ。
  function get(name,color,variant,params){
    var aliases={'soft-dot':'glow','smoke-noise':'smoke','spark':'plasma','ring':'glow'};
    if(name==='magic-circle')return magicTexture(color);
    if(name==='skull')return boneTexture();
    var type=aliases[name]||name;
    if(['glow','smoke','plasma','plasma-soft','stone'].indexOf(type)<0)throw new Error('VFX: 手続きテクスチャがありません '+name);
    params=params||{};
    if(name!=='ring')return texture(type,color,variant,params);
    var key='ring'+color+JSON.stringify(params);if(spriteCache[key])return spriteCache[key];
    var size=params.resolution||128,c=surface(size),g=c.getContext('2d'),m=size/2;
    var grad=g.createRadialGradient(m,m,0,m,m,m),inner=params.inner==null?.62:params.inner,soft=params.softness==null?.12:params.softness;
    grad.addColorStop(0,rgba(color,0));grad.addColorStop(Math.max(0,inner-soft),rgba(color,0));grad.addColorStop(inner,rgba(color,.85));
    grad.addColorStop(Math.min(1,inner+soft),rgba(color,0));grad.addColorStop(1,rgba(color,0));g.fillStyle=grad;g.fillRect(0,0,size,size);
    spriteCache[key]=c;return c;
  }
  var sprites = { 'appearance-atlas': {path:'vfx/appearance_sheet.webp',columns:34}, 'impact-all': {path:'vfx/K009.webp'} };
  return {get:get,surface:surface,sprites:sprites};
})();
