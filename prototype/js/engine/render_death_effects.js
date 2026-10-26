// render_death_effects.js — カードの焼失・衰弱死の消滅演出と描画用フィルター
// 2026-10-25 リファクタリング：render.js から移した（処理は変えていない）。

// ── 死亡演出：白くボケてから燃えて崩れる ─────────────────────
// カードが盤面から消える直前の見た目をそのまま複製し、#vfx-clip-rootの中で焼き落とす。
// 実スロットは従来どおり即座に空にするため、盤面の詰め直しや当たり判定には影響しない。
const DEATH_BURN_MS=900;
const DEATH_BURN_CR_HOLD_MS=DEATH_BURN_MS*0.30;
const DEATH_BURN_HOLES=9;      // 焼け穴の数
const DEATH_BURN_SPREAD=78;    // 穴を散らす範囲（大きいほど全面へ広がる）
const DEATH_BURN_EDGE='6%';    // 焼け縁のぼかし幅
const DEATH_BURN_EMBER='9%';   // 火種の帯の太さ
const DEATH_BURN_ROUGH=34;     // 輪郭の歪み量（0で正円のまま）
const DEATH_BURN_FREQ=0.013;   // 歪みの細かさ
// 書き換えのたびにSVGフィルターの再描画が走る。毎フレームだと約2倍になり処理落ちするため、33msごとにする。
const DEATH_BURN_FILTER_UPDATE_INTERVAL_MS=33;

// death-burn の --death-cr と同じ進行度。CSSでは30%まで開始値を保ち、
// 30〜100%を直線補間しているため、Computed Styleを読まずに経過時間から求める。
function _deathBurnCrProgress(elapsedMs){
  return Math.max(0,Math.min(1,
    (elapsedMs-DEATH_BURN_CR_HOLD_MS)/(DEATH_BURN_MS-DEATH_BURN_CR_HOLD_MS)));
}

function _deathBurnRnd(seed){ const x=Math.sin(seed)*10000; return x-Math.floor(x); }

// 穴の配置・大きさ・広がる速さを毎回引き直す。これで同じ崩れ方は二度と起きない。
function _buildDeathBurnPattern(host,seed){
  const masks=[],embers=[];
  for(let i=0;i<DEATH_BURN_HOLES;i++){
    const cx=50+(_deathBurnRnd(seed+i*3.11)-.5)*DEATH_BURN_SPREAD;
    const cy=44+(_deathBurnRnd(seed+i*7.77)-.5)*DEATH_BURN_SPREAD*0.92;
    // 穴ごとに広がる速さを変える（0.55〜1.35倍）。これが虫食いのばらつきになる。
    const k=(0.55+_deathBurnRnd(seed+i*5.31)*0.8).toFixed(2);
    const R='calc(var(--death-cr) * '+k+')';
    const shape='circle at '+cx.toFixed(1)+'% '+cy.toFixed(1)+'%';
    masks.push('radial-gradient('+shape+', transparent '+R+', #000 calc('+R+' + '+DEATH_BURN_EDGE+'))');
    embers.push('radial-gradient('+shape+','
      +' rgba(255,250,225,1) '+R+','
      +' rgba(255,186,64,.95) calc('+R+' + '+DEATH_BURN_EMBER+' * .38),'
      +' rgba(226,86,14,.6) calc('+R+' + '+DEATH_BURN_EMBER+' * .72),'
      +' rgba(120,30,0,0) calc('+R+' + '+DEATH_BURN_EMBER+'))');
  }
  host.style.setProperty('--death-mask',masks.join(','));
  host.style.setProperty('--death-ember',embers.join(','));
}

// 穴の縁を円のままにすると形が幾何学的に見えるため、feDisplacementMapで輪郭を歪ませる。
// CSSではfilterがmaskより先に適用されるので、マスクを掛けた要素を包む親へ当てる。
function _makeDeathBurnFilter(seed){
  const svg=document.getElementById('death-burn-filters');
  if(!svg) return null;
  const id='death-burn-rough-'+Math.round(Math.abs(seed)*97)+'-'+Math.round(Math.random()*100000);
  const NS='http://www.w3.org/2000/svg';
  const f=document.createElementNS(NS,'filter');
  f.setAttribute('id',id);
  f.setAttribute('x','-25%'); f.setAttribute('y','-25%');
  f.setAttribute('width','150%'); f.setAttribute('height','150%');
  f.setAttribute('color-interpolation-filters','sRGB');
  const t=document.createElementNS(NS,'feTurbulence');
  t.setAttribute('type','fractalNoise'); t.setAttribute('numOctaves','4');
  t.setAttribute('baseFrequency',String(DEATH_BURN_FREQ));
  t.setAttribute('seed',String(Math.round(Math.abs(seed)*13)%97)); t.setAttribute('result','n');
  const d=document.createElementNS(NS,'feDisplacementMap');
  d.setAttribute('in','SourceGraphic'); d.setAttribute('in2','n');
  d.setAttribute('scale','0');
  d.setAttribute('xChannelSelector','R'); d.setAttribute('yChannelSelector','G');
  f.appendChild(t); f.appendChild(d); svg.appendChild(f);
  return {id,filter:f,disp:d};
}

// slotNode は再描画前に控えた複製、rect はそのときの画面上の位置。
function playCardBurnAway(slotNode,rect,sourceSize){
  try{
    if(!slotNode||!rect) return;
    if(!(rect.width>0&&rect.height>0)) return;
    const parent=typeof _vfxHostParent==='function'?_vfxHostParent():document.body;
    const seed=Math.random()*1000+1;

    const host=document.createElement('div');
    host.className='death-burn-clone';
    Object.assign(host.style,{
      left:rect.left+'px', top:rect.top+'px',
      width:rect.width+'px', height:rect.height+'px',
    });
    _buildDeathBurnPattern(host,seed);

    // カード本体（マスクで食われる）
    const card=slotNode.cloneNode(true);
    card.className='death-burn-card '+slotNode.className;
    card.removeAttribute('id');
    card.style.cssText='';
    // 前衛スロットの位置識別クラス（.is-front）が持つ赤いborder-topを、
    // body直下へ移した死亡演出クローンには引き継がない。
    card.style.setProperty('border','0','important');
    card.style.setProperty('border-top','0','important');
    card.style.setProperty('outline','0','important');
    card.style.setProperty('box-shadow','none','important');
    // 戦闘画面は3840x2160の内部座標を親要素で縮小している。クローンをbody直下へ
    // 移すと親の縮小が外れ、カード内部だけが巨大化するため、元のレイアウト寸法で複製して
    // getBoundingClientRect()の表示寸法までクローン全体を縮小する。
    const sourceW=Math.max(1,Number(sourceSize?.width)||Number(slotNode.dataset?.deathSourceWidth)||rect.width);
    const sourceH=Math.max(1,Number(sourceSize?.height)||Number(slotNode.dataset?.deathSourceHeight)||rect.height);
    card.style.setProperty('position','absolute','important');
    card.style.setProperty('left','0','important');
    card.style.setProperty('top','0','important');
    card.style.setProperty('width',sourceW+'px','important');
    card.style.setProperty('min-width',sourceW+'px','important');
    card.style.setProperty('max-width',sourceW+'px','important');
    card.style.setProperty('height',sourceH+'px','important');
    card.style.setProperty('min-height',sourceH+'px','important');
    card.style.setProperty('max-height',sourceH+'px','important');
    card.style.setProperty('aspect-ratio','auto','important');
    card.style.setProperty('transform-origin','0 0','important');
    card.style.setProperty('transform',`scale(${rect.width/sourceW},${rect.height/sourceH})`,'important');
    const flash=document.createElement('div');
    flash.className='death-burn-flash';
    card.appendChild(flash);

    const warpCard=document.createElement('div');
    warpCard.className='death-burn-warp';
    warpCard.appendChild(card);

    // 焼け縁の火（本体とは別要素。カードが欠けても火は残す）
    const ember=document.createElement('div');
    ember.className='death-burn-ember';
    const warpEmber=document.createElement('div');
    warpEmber.className='death-burn-warp';
    warpEmber.appendChild(ember);

    host.appendChild(warpCard);
    host.appendChild(warpEmber);
    parent.appendChild(host);

    // 輪郭の歪みはSVG属性なのでCSSアニメーションで動かせない。
    // CSSの--death-crを読むと毎回スタイル計算を強制するため、開始時刻から進行度を求める。
    const fx=_makeDeathBurnFilter(seed);
    if(fx){
      warpCard.style.filter='url(#'+fx.id+')';
      warpEmber.style.filter='url(#'+fx.id+')';
    }
    const burnStartedAt=performance.now();
    let animationFrame=0;
    let lastFilterWriteAt=-Infinity;
    let lastFilterScale='';
    const updateFilter=now=>{
      if(!host.isConnected) return;
      if(fx){
        const elapsed=now-burnStartedAt;
        const t=_deathBurnCrProgress(elapsed);
        if(elapsed-lastFilterWriteAt>=DEATH_BURN_FILTER_UPDATE_INTERVAL_MS||t>=1){
          // 燃え始めた瞬間から縁は乱れていてほしい。進行度に素直に比例させると
          // 穴が小さいうちは歪みも小さく、正円のリングに見えてしまう。
          const w=t>0.004?(0.6+0.4*Math.pow(t,0.7)):0;
          const scale=(DEATH_BURN_ROUGH*w).toFixed(1);
          if(scale!==lastFilterScale){
            fx.disp.setAttribute('scale',scale);
            lastFilterScale=scale;
            lastFilterWriteAt=now;
          }
        }
      }
      animationFrame=window.requestAnimationFrame(updateFilter);
    };
    animationFrame=window.requestAnimationFrame(updateFilter);

    // 後片付けは「実際にアニメーションが終わったとき」に行う。固定時間で消すと、
    // 重い処理でアニメーションの開始が遅れた場合に再生途中で消えてしまう。
    let cleaned=false;
    const cleanup=()=>{
      if(cleaned) return; cleaned=true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(fallback);
      host.remove();
      if(fx&&fx.filter&&fx.filter.parentNode) fx.filter.parentNode.removeChild(fx.filter);
    };
    host.addEventListener('animationend',ev=>{
      if(ev.target===host&&ev.animationName==='death-burn') cleanup();
    });
    // animationendが来ない環境・中断された場合の保険（十分に長く取る）
    const fallback=window.setTimeout(cleanup,DEATH_BURN_MS+4000);
  }catch(e){ console.error('[playCardBurnAway]',e); }
}

// ── 戦闘修正でHPが0になった時の死亡演出（青・波打ちフェード）──────────
// ダメージで倒れた時（playCardBurnAway）とは別の見せ方。
// 波打ちはSVGのfeDisplacementMapで作り、CSSでは動かせないのでJSが時間で書き換える。
const DEATH_WAVE_MS=1100;
const DEATH_WAVE_FREQ=0.008;   // うねりの細かさ（小さいほど大きな波）
const DEATH_WAVE_MAX=26;       // うねりの最大振幅（px相当）

function _makeDeathWaveFilter(seed){
  const svg=document.getElementById('death-burn-filters');
  if(!svg) return null;
  const id='death-wave-'+Math.round(Math.abs(seed)*97)+'-'+Math.round(Math.random()*100000);
  const NS='http://www.w3.org/2000/svg';
  const f=document.createElementNS(NS,'filter');
  f.setAttribute('id',id);
  f.setAttribute('x','-30%'); f.setAttribute('y','-30%');
  f.setAttribute('width','160%'); f.setAttribute('height','160%');
  f.setAttribute('color-interpolation-filters','sRGB');
  const t=document.createElementNS(NS,'feTurbulence');
  t.setAttribute('type','fractalNoise'); t.setAttribute('numOctaves','2');
  t.setAttribute('baseFrequency',String(DEATH_WAVE_FREQ));
  t.setAttribute('seed',String(Math.round(Math.abs(seed)*13)%97)); t.setAttribute('result','n');
  const d=document.createElementNS(NS,'feDisplacementMap');
  d.setAttribute('in','SourceGraphic'); d.setAttribute('in2','n');
  d.setAttribute('scale','0');
  d.setAttribute('xChannelSelector','R'); d.setAttribute('yChannelSelector','G');
  f.appendChild(t); f.appendChild(d); svg.appendChild(f);
  return {id,filter:f,disp:d,turb:t};
}

// ── 即死：薄れながら四散する（2026-10-27 利用者指定「即死したキャラはフェードで四散」）──────────
// カードを格子の破片（複製を clip-path で切り抜いたもの）に分け、中心から外へ回りながら飛ばし、薄くして消す。
const DEATH_SCATTER_MS=900;
function playCardScatterAway(slotNode,rect,sourceSize){
  try{
    if(!slotNode||!rect||!(rect.width>0&&rect.height>0)) return;
    const parent=typeof _vfxHostParent==='function'?_vfxHostParent():document.body;
    const host=document.createElement('div');
    host.className='death-scatter-clone';
    Object.assign(host.style,{position:'fixed',zIndex:'10019',pointerEvents:'none',overflow:'visible',
      left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    const sourceW=Math.max(1,Number(sourceSize&&sourceSize.width)||rect.width),sourceH=Math.max(1,Number(sourceSize&&sourceSize.height)||rect.height);
    const makeCard=()=>{
      const card=slotNode.cloneNode(true);card.removeAttribute('id');card.style.cssText='';
      for(const [k,v] of Object.entries({position:'absolute',left:'0',top:'0',width:sourceW+'px','min-width':sourceW+'px','max-width':sourceW+'px',
        height:sourceH+'px','min-height':sourceH+'px','max-height':sourceH+'px','aspect-ratio':'auto','transform-origin':'0 0',
        transform:'scale('+(rect.width/sourceW)+','+(rect.height/sourceH)+')',border:'0','box-shadow':'none',outline:'0',transition:'none',animation:'none'}))
        card.style.setProperty(k,v,'important');
      return card;
    };
    const cols=4,rows=6,pieces=[];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const piece=document.createElement('div');
      Object.assign(piece.style,{position:'absolute',inset:'0',willChange:'transform,opacity',
        clipPath:`inset(${(r/rows*100).toFixed(2)}% ${(100-(c+1)/cols*100).toFixed(2)}% ${(100-(r+1)/rows*100).toFixed(2)}% ${(c/cols*100).toFixed(2)}%)`});
      piece.appendChild(makeCard());host.appendChild(piece);
      const dx=((c+.5)/cols-.5),dy=((r+.5)/rows-.5),dist=Math.hypot(dx,dy)||.1,jit=Math.random()*.5+.75;
      pieces.push({piece,tx:dx/dist*rect.width*.55*jit+dx*rect.width*.3,ty:dy/dist*rect.height*.32*jit+dy*rect.height*.2-rect.height*.06,
        rot:(Math.random()-.5)*70,delay:dist*160+Math.random()*60});
    }
    parent.appendChild(host);
    let done=0;
    const cleanup=()=>{if(host.isConnected)host.remove();};
    pieces.forEach(({piece,tx,ty,rot,delay})=>{
      const a=piece.animate?.([
        {transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,filter:'brightness(1)'},
        {transform:`translate(${tx*.25}px,${ty*.25}px) rotate(${rot*.25}deg) scale(.98)`,opacity:.85,filter:'brightness(1.35)',offset:.25},
        {transform:`translate(${tx}px,${ty}px) rotate(${rot}deg) scale(.8)`,opacity:0,filter:'brightness(.9)'}],
        {duration:DEATH_SCATTER_MS-delay*.5,delay,easing:'cubic-bezier(.2,.6,.3,1)',fill:'forwards'});
      if(a)a.finished.catch(()=>{}).finally(()=>{if(++done>=pieces.length)cleanup();});
    });
    window.setTimeout(cleanup,DEATH_SCATTER_MS+800);
  }catch(e){ console.error('[playCardScatterAway]',e); }
}

// slotNode は再描画前に控えた複製、rect はそのときの画面上の位置。
function playCardWaveAway(slotNode,rect,sourceSize){
  try{
    if(!slotNode||!rect) return;
    if(!(rect.width>0&&rect.height>0)) return;
    const parent=typeof _vfxHostParent==='function'?_vfxHostParent():document.body;
    const seed=Math.random()*1000+1;

    const host=document.createElement('div');
    host.className='death-wave-clone';
    Object.assign(host.style,{
      left:rect.left+'px', top:rect.top+'px',
      width:rect.width+'px', height:rect.height+'px',
    });

    const card=slotNode.cloneNode(true);
    card.className='death-wave-card '+slotNode.className;
    card.removeAttribute('id');
    card.style.cssText='';
    card.style.setProperty('border','0','important');
    card.style.setProperty('border-top','0','important');
    card.style.setProperty('outline','0','important');
    card.style.setProperty('box-shadow','none','important');
    // 戦闘画面は3840x2160の内部座標を親で縮小している。body直下へ移すと縮小が外れるので、
    // 元のレイアウト寸法で複製してから表示寸法まで縮める（焼失演出と同じ扱い）。
    const sourceW=Math.max(1,Number(sourceSize&&sourceSize.width)||Number(slotNode.dataset&&slotNode.dataset.deathSourceWidth)||rect.width);
    const sourceH=Math.max(1,Number(sourceSize&&sourceSize.height)||Number(slotNode.dataset&&slotNode.dataset.deathSourceHeight)||rect.height);
    card.style.setProperty('position','absolute','important');
    card.style.setProperty('left','0','important');
    card.style.setProperty('top','0','important');
    card.style.setProperty('width',sourceW+'px','important');
    card.style.setProperty('min-width',sourceW+'px','important');
    card.style.setProperty('max-width',sourceW+'px','important');
    card.style.setProperty('height',sourceH+'px','important');
    card.style.setProperty('min-height',sourceH+'px','important');
    card.style.setProperty('max-height',sourceH+'px','important');
    card.style.setProperty('aspect-ratio','auto','important');
    card.style.setProperty('transform-origin','0 0','important');
    card.style.setProperty('transform','scale('+(rect.width/sourceW)+','+(rect.height/sourceH)+')','important');

    const tint=document.createElement('div');
    tint.className='death-wave-tint';
    const shade=document.createElement('div');
    shade.className='death-wave-shade';
    card.appendChild(tint);
    card.appendChild(shade);

    const warp=document.createElement('div');
    warp.className='death-wave-warp';
    warp.appendChild(card);
    host.appendChild(warp);
    parent.appendChild(host);

    const fx=_makeDeathWaveFilter(seed);
    if(fx) warp.style.filter='url(#'+fx.id+')';

    // うねりは「立ち上がって、消えるころに収まる」。基準の細かさも少しずつ動かして
    // 波が流れているように見せる。
    const start=performance.now();
    const timer=window.setInterval(()=>{
      if(!host.isConnected){ window.clearInterval(timer); return; }
      if(!fx) return;
      const t=Math.max(0,Math.min(1,(performance.now()-start)/DEATH_WAVE_MS));
      const amp=Math.sin(Math.PI*Math.pow(t,0.85))*DEATH_WAVE_MAX;
      fx.disp.setAttribute('scale',amp.toFixed(1));
      fx.turb.setAttribute('baseFrequency',(DEATH_WAVE_FREQ*(1+t*0.9)).toFixed(4));
    },33);

    let cleaned=false;
    const cleanup=()=>{
      if(cleaned) return; cleaned=true;
      window.clearInterval(timer);
      window.clearTimeout(fallback);
      host.remove();
      if(fx&&fx.filter&&fx.filter.parentNode) fx.filter.parentNode.removeChild(fx.filter);
    };
    host.addEventListener('animationend',ev=>{
      if(ev.target===host&&ev.animationName==='death-wave') cleanup();
    });
    const fallback=window.setTimeout(cleanup,DEATH_WAVE_MS+3000);
  }catch(e){ console.error('[playCardWaveAway]',e); }
}

// 死亡効果の解決を待たず、死亡が確定した瞬間のカードから演出を開始する。
// これにより、闇の炎など非同期の死亡効果がある場合も演出が遅れず、攻撃モーション後の
// 盤面詰めで死亡ユニットが配列から除かれる前に確実に複製元を確保できる。
