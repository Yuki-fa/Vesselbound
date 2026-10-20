/* 宣言的VFXの許可リスト。描画命令・式・任意の文字列を受け付けない。 */
var VbFxDefs = (function () {
  'use strict';
  var effects = [], shapes = Object.create(null);
  var textures = ['glow', 'smoke', 'plasma', 'plasma-soft', 'stone', 'ring', 'magic-circle', 'skull'];
  // 画像素材（webp）の貼り付けは廃止（2026-10-17）。sprite層・カードのart指定は使えない。
  var sprites = [];
  var tags = ['shield', 'toxin', 'weakness', 'guts', 'revive'];
  function fail(at, message) { throw new TypeError('VFX ' + at + ': ' + message); }
  function object(v, at) {
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.getPrototypeOf(v) !== Object.prototype) fail(at, 'JSONオブジェクトが必要');
  }
  function keys(v, allowed, at, required) {
    object(v, at);
    Object.keys(v).forEach(function (key) { if (allowed.indexOf(key) < 0) fail(at + '.' + key, '未知のキー'); });
    (required || []).forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(v, key)) fail(at + '.' + key, '必須'); });
  }
  function number(v, at, min, max, integer) {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(at, '有限数が必要');
    if (v < min || v > max || (integer && !Number.isInteger(v))) fail(at, '範囲または整数条件が不正');
  }
  function enumeration(v, allowed, at) { if (allowed.indexOf(v) < 0) fail(at, '列挙値が不正'); }
  function color(v, at) { if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) fail(at, '#RRGGBBが必要'); }
  function label(v, at) { if (typeof v !== 'string' || !v.length || v.length > 160) fail(at, 'ラベルが不正'); }
  function id(v, at) { if (typeof v !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(v)) fail(at, '識別名が不正'); }
  function vector(v, at, n, min, max) {
    if (!Array.isArray(v) || v.length !== n) fail(at, '配列の形が不正');
    v.forEach(function (x, i) { number(x, at + '[' + i + ']', min, max); });
  }
  function curve(v, at, input, domain) {
    keys(v, domain ? ['keys', 'interpolation', 'domain', 'exponent', 'segments', 'clamp'] : ['keys', 'interpolation', 'exponent', 'segments', 'clamp'], at, ['keys']);
    if (v.interpolation != null) enumeration(v.interpolation, ['linear', 'smooth', 'step', 'ease-out', 'power-in', 'power-out','sine-in','sine-out'], at + '.interpolation');
    if (v.exponent != null) number(v.exponent, at + '.exponent', .01, 32);
    if (/^power-/.test(v.interpolation || '') && v.exponent == null) fail(at, 'power補間にはexponentが必須');
    if(v.clamp){vector(v.clamp,at+'.clamp',2,-1000000,1000000);if(v.clamp[0]>v.clamp[1])fail(at,'clamp範囲が不正');}
    if (domain && v.domain != null) enumeration(v.domain, ['life', 'effect'], at + '.domain');
    if (!Array.isArray(v.keys) || v.keys.length < 2 || v.keys.length > 128) fail(at, '曲線の配列が不正');
    v.keys.forEach(function (pair, i) {
      vector(pair, at + '.keys[' + i + ']', 2, -1000000, 1000000);
      number(pair[0], at + '.time', 0, input ? 1000000 : 32);
      if (i && pair[0] <= v.keys[i - 1][0]) fail(at, '時刻は狭義昇順');
    });
    if(v.segments){if(!Array.isArray(v.segments)||v.segments.length!==v.keys.length-1)fail(at,'区間補間の配列が不正');
      v.segments.forEach(function(mode){enumeration(mode,['linear','smooth','step','ease-out','power-in','power-out','sine-in','sine-out'],at);if(/^power-/.test(mode)&&v.exponent==null)fail(at,'power補間にはexponentが必須');});}
  }
  function gradient(v, at, spatial) {
    if (!Array.isArray(v) || v.length < 2 || v.length > 32) fail(at, 'グラデーションの配列が不正');
    v.forEach(function (pair, i) {
      if (!Array.isArray(pair) || pair.length !== (spatial ? 3 : 2)) fail(at, '色の配列の形が不正');
      number(pair[0], at, 0, 1); color(pair[1], at);
      if (spatial) number(pair[2], at, 0, 1);
      if (i && pair[0] <= v[i - 1][0]) fail(at, '色位置は狭義昇順');
    });
  }
  // フィールド記述も固定の許可リスト。効果側から新しい部品や処理を登録しない。
  function n(min, max, integer) { return { form: 'number', min: min, max: max, integer: !!integer }; }
  function e(values) { return { form: 'enum', values: values }; }
  function v(min, max) { return { form: 'vector', min: min, max: max }; }
  function r(min, max) { return { form: 'range', min: min, max: max }; }
  var common = {
    type: e(['particles', 'ring', 'glow', 'beam', 'projectile', 'wave', 'fog', 'shape', 'flash', 'card', 'shake', 'sprite']),
    anchor: e(['source', 'target', 'each-target', 'path', 'board', 'allies', 'enemies', 'targets','viewport']),
    time: r(0, 1), at: e(['effect', 'impact', 'reveal']), blend: e(['normal', 'add', 'screen', 'multiply']),
    shiftX: n(-32, 32), shiftY: n(-32, 32), basis: e(['card', 'bounds', 'unit']), offset: v(-32, 32), rotation: n(-100, 100), alpha: n(0, 2),
    color: { form: 'color' }, light: { form: 'color' }, shadow: { form: 'color' }, tint: n(0, 1),
    palette: { form: 'gradient' }, clip: e(['none', 'card']), softness: n(0, 2),
    copies: n(1, 512, true), copyAlpha: n(0, 1), copyDelay: n(0, 1),
    // 2026-10-12: 対象間の時差・有限回の脈動・外部から渡す色。未指定の描画は従来どおり。
    targetSpread: n(0, 1), cycles: n(1, 128), colorFrom: e(['anchor']),
    layout: e(['center', 'orbit', 'line']), orbit: n(0, 32), spread: v(0, 32), cycle: n(.001, 100),
    align: e(['fixed', 'tangent','trajectory']), mirror: { form: 'boolean' }, followMove: { form: 'boolean' },
    pathBend: n(-32, 32), playbackDuration: { form: 'playbackTime' }, playbackDelay: { form: 'playbackTime' },
    indices: { form: 'indices' }, curves: { form: 'curves' }, bind: { form: 'bind' },
    radiusSpace: e(['unit', 'width', 'height', 'diagonal', 'max', 'min', 'reach']),
    seedOffset: n(-100000, 100000, true), clockRate: n(-100, 100), continuous: { form: 'boolean' },
    timeJitter: n(0, .5), endAtEffectEnd: { form: 'boolean' },endExclusive:{form:'boolean'}, directedRotation: { form: 'boolean' }, holdEnd: { form: 'boolean' },
    batch: n(0, 128, true),pass:n(0,128,true), orbitSpace: e(['unit','width','height','diagonal','max','min','reach']), directedOrbit: { form: 'boolean' },
    variant: n(0, 32, true), indexAlternateRotation: { form: 'boolean' }, scaleBounds: { form: 'boolean' },
    intrinsicAlpha: { form: 'boolean' },alphaPlacement:e(['paint','stops']), modulation: { form: 'modulations' }, tintSteps: n(0,256,true),colorInterpolation:e(['linear','step']),
    clockOffset: n(-100,100),clockSpace:e(['effect','life']), curveTime: e(['life','effect','continuous']),
    alphaGain: { form:'curve', min:0,max:8 },alphaDepth:n(-8,8),
    clipRadius:n(0,32),clipPad:n(-32,32),clipGeometry:e(['card','rect']),clipRadiusSpace:e(['unit','width','height','min','max']),clipFollowOffset:{form:'boolean'}
    ,location:e(['anchor','path','source']),pathProgress:n(0,1),pathIndexStride:n(0,100,true),pathIndexOffset:n(-100,100,true),pathSampleStep:n(.00001,1),
    pathFrom:e(['source','screen-top']),pathFromOffset:v(-32,32),pathFromClamp:v(0,32),pathAngle:e(['trajectory','chord']),
    targetSeedStride:n(-100000,100000,true),blurPrecision:n(0,6,true)
    ,offsetSpace:e(['unit','bounds']),afterglowFixedRadius:n(0,32),afterglowAlpha:n(0,2),afterglowColor:{form:'color'},afterglowOnly:{form:'boolean'}
    ,radiusBounds:n(-32,32),radiusBoundsSpace:e(['width','height','diagonal','max','min']),startExclusive:{form:'boolean'},forwardOffset:n(-32,32),pointOffsets:{form:'points'},prewarmTransform:{form:'boolean'}
  };
  var trail = {
    length: n(0, 32), width: n(0, 4), alpha: n(0, 1), color: { form: 'color' },
    texture: e(textures), segments: n(2, 80, true), strands: n(1, 8, true), noise: n(0, 4),
    taper: { form: 'curve', min: 0, max: 2 }, colors: { form: 'gradient' },
    softness: n(0, 2), core: n(0, 1), wave: n(0, 4), frequency: n(0, 16), frequencyHz: n(0, 30)
  };
  var types = {
    particles: { emit: e(['burst', 'rate']), count: n(0, 2000, true), rate: n(.1, 2000),
      motion: e(['ballistic', 'radial-drag', 'orbit', 'ellipse-motes', 'edge-motes', 'rise', 'corners','wake','path-motes','stream','edge-burst','fan-volume','arc-grid','arc-motes','line-motes','fan-flow','fan-ballistic','axial-motes']), radius: n(0, 32), progress: n(0, 1), vortex: n(-32, 32), angleSpeed: n(-100, 100),
      moteOffset: n(0, 100000, true), afterglow: { form: 'boolean' }, glint: { form: 'boolean' },
      targetMoteStride: n(0, 100000, true), phaseRate: v(-100,100), angularClock: e(['time','phase']), directedSpin: { form: 'boolean' },
      radiusX: v(-32,32), radiusY: v(-32,32), positionSpace: e(['unit','bounds','diagonal']),
      sizeEnd: n(0,4), phaseSize: n(0,4), opacityRange: r(0,4), materials: { form:'materials' },
      afterglowEvery: n(1,100,true), afterglowRadius: n(0,8), afterglowAlpha: n(0,2), afterglowColor: { form:'color' },
      angularColors: { form:'colors' },
      travelRate:n(-100,100), inset:n(-32,32), drift:n(-32,32), size:n(0,32), sizeSize:n(-32,32), sizeVelocity:n(-32,32), sizePhase:n(-32,32), sizeTint:n(-32,32),
      alphaExponent:n(.01,8), alphaTint:n(-8,8), radiusMultiplier:n(0,32), glintEvery:n(1,100,true), glintThreshold:n(0,1), glintColor:{form:'color'}, glintRadius:n(0,32), glintAlpha:n(0,8),
      riseX:v(-32,32),riseY:v(-32,32),sway:n(-32,32),swayFrequency:n(-100,100),swayIndex:n(-100,100),rotationPhase:n(-100,100),
      bubbleScale:n(0,32),bubbleHighlight:n(0,32),countScale:e(['none','round','ceil']),
      velocityScale:n(-8,8),glintTintThreshold:n(0,1),cornerStride:n(1,100,true),perCorner:n(1,32,true),
      phaseDistribution:e(['mote','uniform']),phaseSpacing:n(-100,100),riseIndexX:n(-32,32),swaySpace:e(['unit','width','height']),
      countTint:n(-2000,2000),
      orbitVelocity:n(-32,32),orbitSize:n(-32,32),angularSpread:n(-100,100),particleSpin:n(-100,100),materialRotationRate:n(-100,100),wakeAlong:{form:'triple',min:-32,max:32},wakeSpread:v(-32,32),
      lagIndex:n(-1,1),lagDelay:n(-1,1),indexStart:n(0,100000,true),reverse:{form:'boolean'},sizeIndex:n(-32,32),opacityIndex:n(-8,8),scatter:n(0,32),scatterRate:n(-100,100),
      orient:e(['trajectory','mote','radial']),orientationSpread:n(-100,100),orientationOffset:n(-100,100),orientationSpeed:n(-100,100),orientationSpin:n(-100,100),
      lifeRatio:n(.001,32),delayRatio:n(0,32),streamFrom:e(['source','target']),streamTo:e(['source','target']),progressCurve:{form:'curve',min:0,max:1},
      angularProgress:n(0,32),radialProgress:n(0,32),radialDelay:n(0,32),radialLife:n(.001,32),radialCurve:{form:'curve',min:0,max:32},skipNonPositiveRadius:{form:'boolean'},speedOffset:n(-32,32),speedVelocity:n(-32,32),
      countMultiplier:n(0,8),orbitBounds:n(-32,32),orbitSizeBounds:n(-32,32),
      densityExponent:n(.01,8),behind:n(-32,32),noiseMoteAngle:n(-100,100),noiseMoteVelocity:n(-100,100),noiseTime:v(-100,100),noiseSpace:v(-100,100),noiseRows:v(-100,100),noiseOffset:v(-100,100),noiseType:e(['value','fractal']),noiseSeedRow:n(-100,100,true),noiseSway:n(-32,32),radiusBehind:n(-32,32),sizeNoise:n(-32,32),
      gridRows:n(1,16,true),rowOffset:n(-32,32),rowNoiseOffset:n(-32,32),rowOffsetMode:e(['before-noise','after-noise']),radialNoise:n(-32,32),radialFloorPx:n(0,32),angularExponent:n(0,8),spacing:n(.001,32),stepsMin:n(1,512,true),stepsMax:n(1,512,true),staggerRows:{form:'boolean'},minActiveRadius:n(0,32),lagRate:n(-100,100),lagRange:v(-32,32),
      pointSpace:e(['unit','bounds']),spreadDistance:n(-32,32),
      // 2026-10-14: fan-flow の向き・扇の半角・届く長さを層で決める（回転する入れ物の中で帯として流すため）。未指定なら従来どおり。
      fanDirection:n(-100,100),fanHalfArc:n(0,3.2),reachLength:n(0,32),reachSpace:e(['unit','width','height','diagonal','max','min','reach']),
      lifetime:v(.0001,32),spreadScale:n(0,4),flowPower:n(.01,8),flowReachScale:n(0,4),frontProgress:n(0,1),frontPad:n(0,32),noisePhase:v(-100,100),noiseIndex:v(-100,100),swayPhase:n(-32,32),sizeMoteScale:n(-32,32),flickerBias:n(-8,8),flickerNoise:n(-8,8),flickerIndex:n(-100,100),flickerRate:n(-100,100),
      birth:n(0,32),birthSpread:n(0,32),birthMote:e(['delay','size']),hop:n(-32,32),hopScale:n(-32,32),ageAlpha:{form:'curve',min:0,max:8},
      axialDistance:v(-32,32),axialSize:v(-32,32),axialDivisor:n(.001,2000),angleScale:n(-32,32),angleOffset:n(-100,100),angleSpace:e(['world','trajectory']),sizeScale:n(0,32),phaseAlpha:{form:'curve',min:0,max:8},orientationPhase:n(-100,100),
      swayGain:n(-32,32),swayIndexGain:n(-32,32),swayY:n(-32,32),sizeIndexDecay:n(-32,32),
      emission: e(['point', 'circle', 'rim', 'rect', 'edge', 'line', 'path']), extent: v(0, 32),
      lifeMs: r(1, 30000), delayMs: r(0, 30000), speed: r(0, 64), direction: r(-100, 100),
      directionSpace: e(['absolute', 'radial', 'inward', 'forward']), gravity: v(-64, 64), drag: n(0, 64),
      sizeRange: r(.0001, 4), size: n(0, 32), spin: r(-100, 100), particleRotation: r(-100, 100),
      texture: e(textures), shape: { form: 'shapeRef' }, colors: { form: 'gradient' },
      aspect: v(.001, 32), orbitSpeed: n(-100, 100), prewarm: { form: 'boolean' }, trail: { form: 'trail' },
      emissionArc: r(-100, 100), points: { form: 'points' } },
    ring: { geometry: e(['ellipse', 'card', 'superellipse']), radius: n(-32, 32), aspect: v(.001, 32),
      width: n(.0001, 32), widthSpace: e(['unit','pixel']), pad: n(-2, 4), arc: r(-100, 100), noise: n(0, 2),minRadiusPx:n(0,32),
      texture: e(textures), count: n(4, 512, true), core: n(0, 1), stops: { form: 'stops' },
      strokeProfile: e(['soft', 'halo', 'single']), noiseProfile: e(['value', 'fractal']),
      noiseClock: n(-100, 100), exponent: n(.01, 8), cornerRadius: n(0, 2), arcSpace: e(['forward','world']) },
    glow: { radius: n(0, 32), aspect: v(.001, 32), texture: e(textures), stops: { form: 'stops' } },
    beam: { points: { form: 'points' }, width: n(.0001, 4), noise: n(0, 4), segments: n(2, 160, true),
      progress: n(0, 1), core: n(0, 1), taper: { form: 'curve', min: 0, max: 2 },
      geometry:e(['polyline','filament','trail','spiral','branch','sin-wave','radial','grid']),strokeProfile:e(['single','halo','ribbon','taper']),pointSpace:e(['unit','bounds']),inset:n(-32,32),
      gridExtent:n(0,32,true),gridSpacing:v(-32,32),gridOffset:v(-32,32),gridPeriod:n(1,32,true),cellRadius:n(0,32),cellSides:n(3,32,true),
      radius:n(0,32),radiusSize:n(-32,32),innerRadius:n(0,1),angleJitter:n(-32,32),segmentJitter:n(-32,32),segmentMoteOffset:n(0,100000,true),segmentMoteStride:n(0,100000,true),moteOffset:n(0,100000,true),ribbonSeedFromCopy:{form:'boolean'},
      stops:{form:'stops'},gradientFrom:v(-32,32),gradientTo:v(-32,32),widthSpace:e(['unit','pixel']),
      sparkCount:n(0,128,true),sparkRate:n(-100,100),sparkPhase:n(-100,100),sparkRadius:n(0,32),sparkAlpha:n(0,8),sparkColor:{form:'color'},
      tailStep:n(-32,32),tailSway:n(-32,32),tailFrequency:n(-100,100),tailRate:n(-1000,1000),tailPhase:n(-100,100),tailFan:n(-32,32),headRamp:v(.0001,1),
      radius:n(0,32),radialBias:n(-32,32),radialSize:n(-32,32),angleJitter:n(-100,100),moteOffset:n(0,100000,true),
      polarTurn:n(-100,100),polarWave:n(-100,100),polarFrequency:n(-1000,1000),polarRate:n(-1000,1000),reverse:{form:'boolean'},
      tailLength:n(0,32),lateralOffset:n(-32,32),ribbonSeed:n(-100000,100000,true),pointScale:n(0,32),
      ribbonSeedOffset:n(-100000,100000,true),
      branchCount:n(0,32,true),branchSpacing:n(0,1),branchAngle:n(-100,100),branchLength:n(0,32),branchWidth:n(0,32),branchAlpha:n(0,8),filamentClockRate:n(-100,100),
      waveAmplitude:n(-32,32),waveIndexFrequency:n(-100,100),waveSegmentFrequency:n(-100,100),waveStep:n(-32,32),waveStepOffset:n(-32,32),strokes:{form:'strokes'} },
    projectile: { from: e(['source', 'target', 'screen-top']), to: e(['source', 'target']),
      fromOffset: v(-32, 32), toOffset: v(-32, 32), fromJitter: v(0, 8), bend: n(-32, 32), jitter: n(0, 8),
      progress: n(0, 1), radius: n(0, 4), aspect: v(.001, 32), texture: e(textures),
      shape: { form: 'shapeRef' }, trail: { form: 'trail' }, orient: { form: 'boolean' }, stops: { form: 'stops' }, headRotation: r(-100, 100) },
    wave: { range: e(['viewport', 'ray', 'targets']), progress: n(0, 1), width: n(.001, 4),
      arc: r(-100, 100), noise: n(0, 2), count: n(4, 512, true), texture: e(textures),
      fill: n(0, 1), radius: n(0, 32), drift: n(0, 4) },
    fog: { mode: e(['cloud', 'veil', 'radial', 'orbit-motes']), extent: v(.001, 32), count: n(1, 512, true),
      extentSpace: e(['unit', 'bounds', 'diagonal']), radialRange: r(0, 32), radialPower: n(.01, 8),
      spinRate: n(-100, 100), moteOffset: n(0, 100000, true), scale: n(0, 32),extentX:n(0,32),extentY:n(0,32),
      extentBounds:n(-32,32),
      radius: n(.001, 8), flow: v(-8, 8), texture: e(textures), rim: n(0, 1),
      stops: { form: 'stops' }, gradientFrom: v(-32, 32), gradientTo: v(-32, 32),
      noise: n(0, 2), aspect: v(.001, 32), orbitSpeed: n(-100, 100), arc: r(-100, 100) },
    shape: { shape: { form: 'shapeRef' }, radius: n(.0001, 32), aspect: v(.001, 32), scaleX: n(.001, 32), scaleY: n(.001, 32),
      stroke: n(0, 4), progress: n(0, 1) },
    flash: { stops: { form: 'stops' },texture:e(textures), darkStops:{form:'stops'}, stopAlpha:{form:'stopAlpha'},
      gradient:e(['linear','radial']),gradientSpace:e(['unit','bounds']),gradientFrom:v(-32,32),gradientTo:v(-32,32),
      startX:n(-32,32),startY:n(-32,32),endX:n(-32,32),endY:n(-32,32),endTintY:n(-32,32),
      radius:n(0,32),innerRadius:n(0,32),innerRadiusSpace:e(['unit','width','height','diagonal','max','min','reach']),geometry:e(['rect','card','ellipse','square']),cornerRadius:n(0,32),pad:n(-32,32),fillRadius:n(0,32),minRadiusPx:n(0,32),
      sweepRate:n(-100,100),sweepWindow:n(.001,1),sweepRange:v(-32,32),fillPad:n(-32,32),cornerSpace:e(['unit','min']) },
    card: { echo: {form:'boolean'}, artOnly: {form:'boolean'}, lumaMask:{form:'boolean'}, lumaGain:n(.01,4),lumaExponent:n(.01,4),opacity: n(0, 1), brightness: n(0, 4), saturation: n(0, 4), grayscale: n(0, 1),
      sepia: n(0, 1), hue: n(-720, 720), contrast: n(0, 4), blur: n(0, 32), scale: n(0, 4),
      x: n(-32, 32), y: n(-32, 32), move: n(0, 2), moveTo: e(['source', 'next-target', 'screen-left']),
      dissolve: n(0, 1), dissolveFit: e(['stretch']), grid: n(2, 64, true), art: e(sprites), filterOrder: { form: 'filters' }, blurSpace: e(['unit', 'pixel']), scaleProperty: { form: 'boolean' },scaleWhenVisible:{form:'boolean'},transition:e(['none']),zIndex:n(-1024,1024,true) },
    shake: { strength: v(0, 2), frequencyHz: v(.1, 120), timeSpace: e(['seconds','normalized']),
      coupled: { form: 'boolean' }, property: e(['translate','transform']), scale: n(0, 4) },
    sprite: { texture: e(sprites), scale: n(.001, 32), frame: n(0, 1), glow: n(0, 32),glowSpace:e(['unit','pixel']),playbackDurationMode:e(['remaining']),remainingRatio:n(.001,4),pad:n(-32,32) }
  };
  var modulationFields={mode:e(['add','multiply']),bias:n(-100,100),amplitude:n(-100,100),frequency:n(-1000,1000),phase:n(-1000,1000),
    timeSpace:e(['life','effect','continuous','seconds']),phaseStride:n(-1000,1000),noiseAmplitude:n(-100,100),noiseScale:v(-1000,1000),noiseOffset:v(-1000,1000),
    noiseType:e(['value','fractal']),seedOffset:n(-100000,100000,true),timeClamp:r(-100,100)};
  function modulation(spec,at){
    keys(spec,Object.keys(modulationFields),at);
    Object.keys(spec).forEach(function(k){property(spec,k,at+'.'+k,modulationFields[k]);});
  }
  function fields(type) { return Object.assign({}, common, types[type]); }
  function property(spec, key, at, descriptor) {
    var value = spec[key], d = descriptor;
    switch (d.form) {
    case 'number': number(value, at, d.min, d.max, d.integer); break;
    case 'enum': enumeration(value, d.values, at); break;
    case 'color': color(value, at); break;
    case 'boolean': if (typeof value !== 'boolean') fail(at, '真偽値が必要'); break;
    case 'vector': vector(value, at, 2, d.min, d.max); break;
    case 'triple':vector(value,at,3,d.min,d.max);break;
    case 'range': vector(value, at, 2, d.min, d.max); if (value[0] > value[1]) fail(at, '範囲の順序が不正'); break;
    case 'curve':
      curve(value, at, false, false);
      value.keys.forEach(function(pair) { number(pair[1], at, d.min == null ? -1000000 : d.min, d.max == null ? 1000000 : d.max); }); break;
    case 'gradient': gradient(value, at, false); break;
    case 'stops': gradient(value, at, true); break;
    case 'shapeRef': id(value, at); if (!shapes[value]) fail(at, '未知の図形'); break;
    case 'points':
      if (!Array.isArray(value) || value.length < 2 || value.length > 160) fail(at, '経路の配列が不正');
      value.forEach(function (pair, i) { vector(pair, at + '[' + i + ']', 2, -32, 32); }); break;
    case 'indices':
      if (!Array.isArray(value) || !value.length || value.length > 64) fail(at, '対象添字の配列が不正');
      value.forEach(function (index) { number(index, at, 0, 63, true); });
      if (new Set(value).size !== value.length) fail(at, '対象添字が重複'); break;
    case 'filters':
      if (!Array.isArray(value) || !value.length || value.length>7 || new Set(value).size!==value.length) fail(at,'色処理の配列が不正');
      value.forEach(function(k){enumeration(k,['brightness','saturation','grayscale','sepia','hue','contrast','blur'],at);});break;
    case 'colors':
      if(!Array.isArray(value)||!value.length||value.length>32)fail(at,'色一覧が不正');value.forEach(function(c){color(c,at);});break;
    case 'numbers':
      if(!Array.isArray(value)||!value.length||value.length>16)fail(at,'数値配列が不正');value.forEach(function(x){number(x,at,d.min,d.max);});break;
    case 'modulation':modulation(value,at);break;
    case 'modulations':
      object(value,at);Object.keys(value).forEach(function(k){var field=fields(spec.type)[k];if(!field||field.form!=='number')fail(at+'.'+k,'変調対象が不正');
        var list=Array.isArray(value[k])?value[k]:[value[k]];if(!list.length||list.length>4)fail(at,'変調器の数が不正');list.forEach(function(m){modulation(m,at+'.'+k);});});break;
    case 'stopAlpha':
      if(!Array.isArray(value)||value.length<2||value.length>32||!spec.stops||value.length!==spec.stops.length)fail(at,'色位置と透明度の数が不一致');
      value.forEach(function(a,i){var here=at+'['+i+']';keys(a,['range','intro','modulation'],here);
        if(a.range)vector(a.range,here+'.range',2,0,1);if(a.intro!=null&&typeof a.intro!=='boolean')fail(here,'真偽値が必要');if(a.modulation)modulation(a.modulation,here+'.modulation');});break;
    case 'materials':
      if(!Array.isArray(value)||!value.length||value.length>8)fail(at,'粒素材の配列が不正');
      var material={texture:e(textures),shape:{form:'shapeRef'},color:{form:'color'},blend:e(['normal','add','screen','multiply']),radiusScale:n(0,32),alphaScale:n(0,8),aspect:v(.001,32),rotationScale:n(-32,32),variantOffset:n(0,100,true),offset:v(-32,32),
        radius:n(0,32),radiusPhase:n(-32,32),variant:n(0,32,true),phaseOffset:n(-100,100),sway:n(-32,32),swayFrequency:n(-100,100),swayIndex:n(-100,100),swaySpace:e(['unit','width','height']),yOffset:n(-32,32),rotationOffset:n(-100,100),rotationSpeed:n(-100,100),alphaIndex:n(-8,8),every:n(1,100,true),moteShift:v(-32,32),polarOffset:n(-100,100),radialOffset:n(-32,32),directedPolarOffset:{form:'boolean'},
        rows:{form:'indices'},rowRadii:{form:'numbers',min:0,max:32},rowAlpha:{form:'numbers',min:0,max:8},rowColors:{form:'colors'},radiusNoise:n(-32,32),radiusSize:n(-32,32),radiusVelocity:n(-32,32),radiusAbsolute:n(0,32),alphaNoise:n(-8,8),alphaSize:n(-8,8),rotationRow:n(-100,100),moteAngle:n(-100,100),moteSpin:n(-100,100),skipEvery:n(1,100,true),cadenceRow:{form:'boolean'},colors:{form:'colors'},flicker:{form:'modulation'},angularFade:{form:'boolean'},alphaCurve:{form:'curve',min:0,max:8},rotationIndex:n(-100,100),alphaDomain:e(['life','phase']),radiusCurve:{form:'curve',min:0,max:32},palette:{form:'gradient'},colorInterpolation:e(['linear','step']),phaseRange:r(0,1),radialScale:n(-32,32)};
      value.forEach(function(m,i){var here=at+'['+i+']';keys(m,Object.keys(material),here);if((m.texture!=null)+(m.shape!=null)!==1)fail(here,'素材または図形が1つ必要');Object.keys(m).forEach(function(k){property(m,k,here+'.'+k,material[k]);});});break;
    case 'playbackTime':
      keys(value, ['maxMs', 'maxRatio'], at, ['maxMs', 'maxRatio']);
      number(value.maxMs, at, 0, 30000); number(value.maxRatio, at, .0001, 1); break;
    case 'strokes':
      if(!Array.isArray(value)||!value.length||value.length>8)fail(at,'線材質の配列が不正');
      var strokeFields={color:{form:'color'},width:n(0,32),widthSpace:e(['unit','pixel']),alpha:n(0,8),offset:v(-32,32),pointOffset:v(-32,32),lineCap:e(['round','butt','square']),lineJoin:e(['round','miter','bevel']),profile:e(['single','halo']),core:n(0,1)};
      value.forEach(function(s,i){var here=at+'['+i+']';keys(s,Object.keys(strokeFields),here);Object.keys(s).forEach(function(k){property(s,k,here+'.'+k,strokeFields[k]);});});break;
    case 'trail':
      keys(value, Object.keys(trail), at);
      Object.keys(value).forEach(function (k) { property(value, k, at + '.' + k, trail[k]); }); break;
    case 'curves':
      object(value, at);
      Object.keys(value).forEach(function (k) {
        var field = fields(spec.type)[k]; if (!field || field.form !== 'number') fail(at + '.' + k, '曲線対象が不正');
        curve(value[k], at + '.' + k, false, true);
        if(value[k].clamp){number(value[k].clamp[0],at,field.min,field.max);number(value[k].clamp[1],at,field.min,field.max);}
        value[k].keys.forEach(function (pair) { number(pair[1], at + '.' + k, value[k].clamp?-1000000:field.min, value[k].clamp?1000000:field.max); });
      }); break;
    case 'bind':
      if (!Array.isArray(value) || !value.length || value.length > 16) fail(at, '入力対応表の配列が不正');
      value.forEach(function (binding, i) {
        var p = at + '[' + i + ']'; keys(binding, ['input', 'target', 'curve', 'mode'], p, ['input', 'target', 'curve']);
        enumeration(binding.input, ['value'].concat(tags), p + '.input');
        var field = fields(spec.type)[binding.target]; if (!field || field.form !== 'number') fail(p, '入力の適用先が不正');
        curve(binding.curve, p + '.curve', true, false);
        if (binding.mode != null) enumeration(binding.mode, ['set', 'add', 'multiply'], p + '.mode');
      }); break;
    default: fail(at, 'スキーマの内部エラー');
    }
  }
  function layer(spec, at) {
    object(spec, at); enumeration(spec.type, Object.keys(types), at + '.type');
    var allowed = fields(spec.type); keys(spec, Object.keys(allowed), at, ['type', 'anchor']);
    Object.keys(spec).forEach(function (key) { property(spec, key, at + '.' + key, allowed[key]); });
    if (spec.type === 'shape' && !spec.shape) fail(at, '図形が必須');
    if (spec.type === 'sprite' && !spec.texture) fail(at, '画像が必須');
    if (spec.time && spec.time[0] === spec.time[1]) fail(at, '層の寿命が0');
  }
  function effect(d, at) {
    keys(d, ['name', 'label', 'sourceCode', 'variants', 'ms', 'color', 'light', 'playback', 'defaultTargets', 'loop', 'underStatus', 'stackable', 'impact', 'tag', 'intro', 'layers', 'composites'], at,
      ['name', 'label', 'ms', 'color', 'light', 'playback', 'defaultTargets', 'loop', 'underStatus', 'stackable', 'impact', 'layers']);
    id(d.name, at); label(d.label, at); number(d.ms, at, 1, 30000); color(d.color, at); color(d.light, at);
    if(d.variants){
      if(!Array.isArray(d.variants)||!d.variants.length||d.variants.length>16)fail(at,'派生設定の配列が不正');
      d.variants.forEach(function(v,i){var p=at+'.variants['+i+']';keys(v,['name','label','sourceCode','value'],p,['name','label','value']);id(v.name,p);label(v.label,p);number(v.value,p,1,128);
        if(v.sourceCode!=null&&!/^[CESK]\d{3}$/.test(v.sourceCode))fail(p,'派生設定の番号が不正');});
    }
    if (d.sourceCode != null && (typeof d.sourceCode !== 'string' || !/^(?:[CESK]\d{3}(?:_\d+)?|hit|appearance_sheet|board_change[12])$/.test(d.sourceCode))) fail(at + '.sourceCode', '元素材の番号が不正');
    enumeration(d.defaultTargets, ['explicit', 'opponents', 'allies', 'source'], at);
    ['loop', 'underStatus', 'stackable'].forEach(function (k) { if (typeof d[k] !== 'boolean') fail(at + '.' + k, '真偽値が必要'); });
    if (d.tag != null) enumeration(d.tag, tags, at + '.tag');
    if (d.intro) curve(d.intro, at + '.intro', false, false);
    keys(d.playback, ['maxMs', 'speedMin', 'speedMax', 'baseSize'], at + '.playback', ['maxMs', 'speedMin', 'speedMax']);
    number(d.playback.maxMs, at, 1, 30000); number(d.playback.speedMin, at, .01, 100); number(d.playback.speedMax, at, d.playback.speedMin, 100);
    if (d.playback.baseSize != null) number(d.playback.baseSize, at + '.playback.baseSize', .01, 32);
    var impact = d.impact;
    keys(impact, ['atMs', 'cueMs', 'targetMs', 'distance', 'addPlaybackMs'], at + '.impact', ['atMs', 'cueMs']);
    number(impact.atMs, at, 0, d.ms); number(impact.cueMs, at, 0, d.ms);
    if (impact.targetMs) {
      if (!Array.isArray(impact.targetMs) || !impact.targetMs.length || impact.targetMs.length > 64) fail(at, '命中時刻の配列が不正');
      impact.targetMs.forEach(function (x) { number(x, at, 0, d.ms); });
    }
    if (impact.distance) {
      keys(impact.distance, ['range', 'curve', 'inverseIterations'], at + '.distance', ['range', 'curve']);
      enumeration(impact.distance.range, ['viewport', 'ray'], at); curve(impact.distance.curve, at, false, false);
      impact.distance.curve.keys.forEach(function (pair, i, list) { number(pair[1], at, 0, 1); if (i && pair[1] < list[i - 1][1]) fail(at, '到達曲線が逆行'); });
      if (impact.distance.inverseIterations != null) number(impact.distance.inverseIterations, at, 1, 32, true);
    }
    if (impact.addPlaybackMs) {
      keys(impact.addPlaybackMs, ['ratio', 'maxMs', 'maxRatio'], at + '.addPlaybackMs', ['ratio', 'maxMs', 'maxRatio']);
      number(impact.addPlaybackMs.ratio, at, 0, 1); number(impact.addPlaybackMs.maxMs, at, 0, 30000); number(impact.addPlaybackMs.maxRatio, at, 0, 1);
      if (impact.addPlaybackMs.ratio + impact.addPlaybackMs.maxRatio > 1) fail(at, '命中が効果終了後');
    }
    if (!Array.isArray(d.layers) || !d.layers.length || d.layers.length > 128) fail(at, '層の配列が不正');
    d.layers.forEach(function (spec, i) { layer(spec, at + '.layers[' + i + ']'); });
    if(d.composites){
      if(!Array.isArray(d.composites)||d.composites.length>64)fail(at,'合成層の配列が不正');
      var batches=new Set();d.composites.forEach(function(c,i){var here=at+'.composites['+i+']';
        keys(c,['batch','mode','radius','radiusSpace','radiusBounds','radiusBoundsSpace','curves','blend','blur','copies','copyAlpha','bind','scaleBounds','angle','halfArc','forward','angleForward','minRadiusPx'],here,['batch','mode']);
        number(c.batch,here,0,128,true);if(batches.has(c.batch))fail(here,'合成層の番号が重複');batches.add(c.batch);
        enumeration(c.mode,['radial','blur','plain'],here);if(c.blend)enumeration(c.blend,['normal','add','screen','multiply'],here);
        if(c.radiusSpace)enumeration(c.radiusSpace,common.radiusSpace.values,here);
        var synthetic=Object.assign({type:'glow'},c);['radius','radiusBounds','radiusBoundsSpace','copies','copyAlpha','scaleBounds','curves','bind'].forEach(function(k){if(c[k]!=null)property(synthetic,k,here+'.'+k,fields('glow')[k]);});
        if(c.blur!=null)number(c.blur,here,0,32);if(c.angle!=null)number(c.angle,here,-100,100);if(c.halfArc!=null)number(c.halfArc,here,0,Math.PI);if(c.minRadiusPx!=null)number(c.minRadiusPx,here,0,32);['forward','angleForward'].forEach(function(k){if(c[k]!=null&&typeof c[k]!=='boolean')fail(here,'真偽値が必要');});
        if(!d.layers.some(function(l){return l.batch===c.batch;}))fail(here,'合成する層が無い');
      });
    }
  }
  function shape(spec, at) {
    keys(spec, ['label', 'paths','facets'], at, ['label', 'paths']); label(spec.label, at);
    if (!Array.isArray(spec.paths) || !spec.paths.length || spec.paths.length > 64) fail(at, 'パスの配列が不正');
    spec.paths.forEach(function (p, i) {
      var here = at + '.paths[' + i + ']'; keys(p, ['d', 'ellipse','rect','rectPixels','vertices','pixelOffsets','fill', 'stroke', 'width','widthSpace','strokeMinPx','fillAlpha','strokeAlpha','gradient'], here);
      if(['d','ellipse','rect','vertices'].filter(function(k){return p[k]!=null;}).length!==1)fail(here,'図形パスが1つ必要');
      // 標準SVGのM/L/H/V/C/Q/Zだけ。言語やCanvasメソッドは保存しない。
      if(p.d!=null){if (typeof p.d !== 'string' || p.d.length > 16000 || !/^\s*[Mm]/.test(p.d) || !/^[MLHV CQZmlhvcqz0-9eE.,+\-\s]+$/.test(p.d)) fail(here, 'SVGパスが不正');validatePath(p.d, here);}
      if(p.ellipse){vector(p.ellipse,here,5,-100,100);number(p.ellipse[2],here,.0001,100);number(p.ellipse[3],here,.0001,100);}
      if(p.rect){vector(p.rect,here,4,-100,100);number(p.rect[2],here,0,100);number(p.rect[3],here,0,100);}
      if(p.rectPixels){if(!p.rect)fail(here,'rectPixelsには矩形が必要');vector(p.rectPixels,here,4,-100,100);}
      if(p.vertices){if(!Array.isArray(p.vertices)||p.vertices.length<2||p.vertices.length>64)fail(here,'頂点の配列が不正');p.vertices.forEach(function(v){vector(v,here,2,-100,100);});}
      if(p.pixelOffsets){if(!p.vertices||p.pixelOffsets.length!==p.vertices.length)fail(here,'頂点とpixelOffsetsの数が不一致');p.pixelOffsets.forEach(function(v){vector(v,here,2,-100,100);});}
      ['fill', 'stroke'].forEach(function (k) { if (p[k] != null && ['color', 'light', 'shadow', 'none'].indexOf(p[k]) < 0) color(p[k], here); });
      if (p.width != null) number(p.width, here, .0001, 32);if(p.widthSpace)enumeration(p.widthSpace,['unit','pixel'],here);if(p.strokeMinPx!=null)number(p.strokeMinPx,here,0,32);
      ['fillAlpha','strokeAlpha'].forEach(function(k){if(p[k]!=null)number(p[k],here,0,1);});
      if(p.gradient){var g=p.gradient;keys(g,['type','from','to','inner','outer','space','stops'],here+'.gradient',['type','from','to','stops']);enumeration(g.type,['linear','radial'],here);vector(g.from,here,2,-100,100);vector(g.to,here,2,-100,100);
        if(g.space)enumeration(g.space,['unit','pixel'],here);if(g.type==='radial'){number(g.inner,here,0,100);number(g.outer,here,.0001,100);}
        if(!Array.isArray(g.stops)||g.stops.length<2||g.stops.length>32)fail(here,'色の配列が不正');g.stops.forEach(function(stop,j){if(!Array.isArray(stop)||stop.length!==3)fail(here,'色の配列の形が不正');number(stop[0],here,0,1);if(j&&stop[0]<=g.stops[j-1][0])fail(here,'色位置は狭義昇順');if(['color','light','shadow'].indexOf(stop[1])<0)color(stop[1],here);number(stop[2],here,0,1);});
      }
    });
    if(spec.facets){var f=spec.facets;keys(f,['vertices','origin','count','stride','width','colors'],at+'.facets',['vertices','origin','count','stride','width','colors']);
      if(!Array.isArray(f.vertices)||f.vertices.length<3||f.vertices.length>64)fail(at,'面の頂点が不正');f.vertices.forEach(function(v){vector(v,at,2,-100,100);});vector(f.origin,at,2,-100,100);
      number(f.count,at,1,32,true);number(f.stride,at,1,32,true);number(f.width,at,.0001,32);if(!Array.isArray(f.colors)||f.colors.length!==f.count)fail(at,'面の線色が不正');f.colors.forEach(function(v){if(!Array.isArray(v)||v.length!==2)fail(at,'色の形が不正');if(['color','light','shadow'].indexOf(v[0])<0)color(v[0],at);number(v[1],at,0,1);});
    }
  }
  function validatePath(d, at) {
    var tokens = d.match(/[MLHVCQZmlhvcqz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) || [], i = 0;
    var lengths = { M: 2, L: 2, H: 1, V: 1, C: 6, Q: 4, Z: 0 };
    while (i < tokens.length) {
      var command = tokens[i++], count = lengths[command.toUpperCase()];
      if (count == null) fail(at, 'SVGコマンドが不正');
      if (!count) continue;
      var n = 0;
      while (i < tokens.length && !/^[a-z]$/i.test(tokens[i])) { number(Number(tokens[i++]), at, -100, 100); n++; }
      if (!n || n % count) fail(at, 'SVG座標の個数が不正');
    }
  }
  function validate() {
    Object.keys(shapes).forEach(function (key) { id(key, 'shapes'); shape(shapes[key], 'shapes.' + key); });
    var names = new Set(), labels = new Set();
    effects.forEach(function (d, i) {
      effect(d, 'effects[' + i + ']');
      if (names.has(d.name) || labels.has(d.label) || labels.has(d.name) || names.has(d.label)) fail(d.name, '名前が重複');
      names.add(d.name); labels.add(d.label);
      (d.variants||[]).forEach(function(v){if(names.has(v.name)||labels.has(v.label)||labels.has(v.name)||names.has(v.label))fail(v.name,'名前が重複');names.add(v.name);labels.add(v.label);});
    });
    return { effects: effects.length, shapes: Object.keys(shapes).length, layers: effects.reduce(function (sum, d) { return sum + d.layers.length; }, 0), types: Object.keys(types).length };
  }
  function register(bundle) {
    keys(bundle, ['schemaVersion', 'shapes', 'effects'], 'bundle', ['schemaVersion']);
    if (bundle.schemaVersion !== 2) fail('bundle', '版は2');
    var oldShapes = Object.assign(Object.create(null), shapes), oldLength = effects.length;
    try {
      if (bundle.shapes) { object(bundle.shapes, 'shapes'); Object.keys(bundle.shapes).forEach(function (key) { if (shapes[key]) fail(key, '図形が重複'); shapes[key] = bundle.shapes[key]; }); }
      if (bundle.effects) { if (!Array.isArray(bundle.effects)) fail('effects', '配列が必要'); bundle.effects.forEach(function (d) { effects.push(d); }); }
      validate();
    } catch (err) { effects.length = oldLength; Object.keys(shapes).forEach(function (key) { delete shapes[key]; }); Object.assign(shapes, oldShapes); throw err; }
  }
  return { register: register, validate: validate, layer: layer, curve: curve, fields: fields, types: Object.keys(types), textures: textures, sprites: sprites,
    effects: effects, shapes: shapes, bundle: function () { return { schemaVersion: 2, shapes: shapes, effects: effects }; } };
})();
