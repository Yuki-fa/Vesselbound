// ═══════════════════════════════════════
// render.js — 描画・UIヘルパー
// 依存: constants.js, state.js, battle.js
// ═══════════════════════════════════════

// ── キーワードツールチップ（KW_DESC_MAP は loader.js で effect_id シートから読み込み）──

(function _initKwTooltip(){
  const tip=document.getElementById('kw-tooltip');
  if(!tip) return;
  let _dragging=false;
  document.addEventListener('dragstart',()=>{ _dragging=true; tip.style.display='none'; }, true);
  document.addEventListener('dragend',()=>{ _dragging=false; }, true);
  document.addEventListener('mouseup',()=>{ _dragging=false; }, true);
  document.addEventListener('mousemove',e=>{
    if(_dragging){ tip.style.display='none'; return; }
    const tgt=e.target&&e.target.closest?e.target:null;
    const el=tgt&&(tgt.closest('.slot-badge[data-kwdesc]')||tgt.closest('[data-preview]'));
    if(!el){ tip.style.display='none'; return; }
    const isKeywordDesc=el.hasAttribute('data-kwdesc');
    const desc=el.getAttribute('data-kwdesc')||el.getAttribute('data-preview')||'';
    if(!desc){ tip.style.display='none'; return; }
    tip.innerHTML=_formatPreviewHtml(desc,{plainTitle:!isKeywordDesc});
    tip.className=tip.className.replace(/\brarity-\d\b/g,'').trim();
    const rarityClass=[...el.classList].find(c=>/^rarity-[1-5]$/.test(c));
    if(rarityClass) tip.classList.add(rarityClass);
    tip.style.display='block';
    _posKwTip(tip,e);
  });
})();
function _escapePreviewHtml(s){
  return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// 説明文中の「（色文字）（数字）マナ」をマナ数分のマナアイコンに置き換える（数字・「マナ」の文字は表示しない）。
// また色名（青・赤・緑・黄・紫・茶）が強化系キーワードに続く場合は、見た目・種族分類の色アイコンを添える（マナとは無関係）。
function _injectManaIcons(escapedText){
  if(typeof _manaOrbPath!=='function') return escapedText;
  const manaIcon=()=>{
    const path=_manaOrbPath();
    return path?`<img class="desc-mana-icon" src="${path}" alt="マナ">`:'';
  };
  const colorIcon=m=>{
    const path=typeof _colorIconPath==='function'?_colorIconPath(m):'';
    return path?`<img class="desc-mana-icon" src="${path}" alt="${m}">`:m;
  };
  return String(escapedText||'').split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) return part;
    return part
      // 赤・青・緑・黄・紫は前後の単語を問わず、漢字1字だけで常にアイコン化する。
      // ただし「色（＋「の」）＋マナ」の並びは次のマナ用置換にまとめて任せる（二重変換で
      // <img alt="色">のalt属性内の文字を再度アイコン化してしまうのを防ぐため、先読みで除外する）。
      .replace(/[青赤緑黄紫](?!(?:の)?\d*マナ)/g,m=>colorIcon(m))
      // 「赤の3マナ」「2マナ」のように、色（省略可）＋「の」（省略可）＋数字（省略可）＋「マナ」を
      // まとめてマナの数だけアイコン化する。色が付かない場合（例：「2マナを得る」）にも対応する。
      .replace(/([青赤緑黄紫茶])?(?:の)?(\d*)マナ/g,(_,c,n)=>{
        const icon=c?colorIcon(c):manaIcon();
        return icon.repeat(Math.max(1,parseInt(n,10)||1));
      });
  }).join('');
}
function _stripStrongMarkupText(text){
  return String(text||'')
    .replace(/&lt;\s*\/?\s*strong\s*&gt;/gi,'')
    .replace(/<\/\s*strong\s*>/gi,'')
    .replace(/<\s*\/?\s*strong\s*>/gi,'')
    .replace(/<\/\s*strong\s*/gi,'')
    .replace(/<\s*strong\s*/gi,'');
}
function _boldKeywordsInHtml(html){
  const variable='毒牙|邪眼|衝撃|強靭|結界|封印|弱体|毒';
  const fixed='復活|根性|二段攻撃|三段攻撃|三方向攻撃|全体攻撃|生贄|即死|先制|狙撃|隠密|加護|貫通|生命吸収';
  const re=new RegExp(`(${variable})\\d*|(${fixed})`,'g');
  const normalized=_stripStrongMarkupText(html);
  return normalized.split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) return part;
    return part.replace(re,m=>`<strong>${m}</strong>`);
  }).join('');
}
function _formatPreviewHtml(desc,opt){
  const plainTitle=!!(opt&&opt.plainTitle);
  const clean=_stripStrongMarkupText(desc).replace(/<[^>]*>/g,'');
  const lines=clean.split('\n').map((line,li)=>{
    if(li===0){
      const title=_escapePreviewHtml(line);
      return `<strong class="preview-title">${plainTitle?title:_injectManaIcons(_boldKeywordsInHtml(title))}</strong>`;
    }
    const m=line.match(/^([^：:]+)([：:])(.*)$/);
    if(!m) return _injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(line)));
    if(m[1]==='キーワード'){
      // 「キーワード：」というラベル自体は表示せず、キーワードそのものだけを太字で並べる
      return _stripStrongMarkupText(m[3]).split(/\s*\/\s*/).map(k=>k.trim()).filter(Boolean)
        .map(k=>_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(k)))).join(' / ');
    }
    let body=_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(m[3])));
    // 「Xマナ：」「Xマナ毎：」ラベルはマナ数分のアイコンに変換する（他のタイミングラベルと違い文字列のまま太字にしない）
    if(/^\d+マナ毎?$/.test(m[1])){
      return `<strong>${_injectManaIcons(_boldKeywordsInHtml(_escapePreviewHtml(m[1])))}</strong>${_escapePreviewHtml(m[2])}${body}`;
    }
    return `<strong>${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`;
  });
  // .preview-title は display:block のため、直後に<br>を挟むと1行分余分な空白ができる
  return lines[0]+(lines.length>1?lines.slice(1).join('<br>'):'');
}
function _previewRarityLine(card){
  return '';
}
function _plainEffectTextForPreview(card){
  if(!card) return '';
  const raw=(typeof _rawSubstitutedDesc==='function'?_rawSubstitutedDesc(card):String(card.desc||card.effectText||card.effect||''));
  return _stripOwnNameFromEffectText(String(raw||'').replace(/<[^>]*>/g,''),card.name);
}
// マナは色を持たない単一プールのため、常に同じアイコンを返す
function _manaOrbPath(){
  return Assets.cards.manaOrb;
}
// 見た目・種族分類の色（強化キーワード等の表示用）。マナとは無関係
function _colorIconPath(color){
  const c=String(color||'').toLowerCase();
  if(c==='red'||c==='赤') return Assets.cards.redOrb;
  if(c==='blue'||c==='青') return Assets.cards.blueOrb;
  if(c==='green'||c==='緑') return Assets.cards.greenOrb;
  if(c==='yellow'||c==='黄'||c==='茶') return Assets.cards.yellowOrb;
  if(c==='purple'||c==='紫') return Assets.cards.purpleOrb;
  return '';
}
function cardManaCostHtml(card){
  const n=Math.max(0,Number(card?.manaCost)||0);
  const path=n?_manaOrbPath():'';
  if(!n||!path) return '';
  return `<span class="mana-cost-orbs">${Array.from({length:n},()=>`<img src="${path}" alt="">`).join('')}</span>`;
}
function _sealCostValue(card){
  if(!card) return 0;
  const kws=[...(card.keywords||[])];
  const kw=kws.find(k=>/^封印\s*\d+$/.test(String(k||'')));
  if(kw) return Math.max(1,parseInt(String(kw).replace(/\D/g,''),10)||1);
  if(card._sealValue>0||card._sealed===true) return Math.max(1,Number(card._sealValue)||1);
  if(card._sealed===false) return 0;
  if(typeof _sealValue==='function'){
    const v=_sealValue(card);
    if(v>0) return v;
  }
  const text=[card.desc,card.effectText,card.effect].filter(Boolean).join(' ');
  const m=[...kws,String(text||'')].join(' ').match(/封印\s*(\d+)/);
  return m?Math.max(1,parseInt(m[1],10)||1):0;
}
function _sealSacrificeCountForDisplay(){
  const inBattle=typeof G!=='undefined'&&(G.phase==='player'||G.phase==='enemy');
  if(!inBattle) return 0;
  if(typeof _sacrificeCount==='function') return Math.max(0,Number(_sacrificeCount())||0);
  const all=[...(G.allies||[]),...(G.enemies||[])];
  return all.filter(u=>u&&u.hp>0&&!u._sealed&&typeof _unitHasSacrifice==='function'&&_unitHasSacrifice(u)).length;
}
function cardSealCostHtml(card){
  if(card&&card._sealed===false&&!card._sealValue) return '';
  const cost=_sealCostValue(card);
  const path=Assets?.cards?.blood||'';
  if(!cost||!path) return '';
  const inBattle=typeof G!=='undefined'&&(G.phase==='player'||G.phase==='enemy');
  const lit=inBattle?Math.max(0,Math.min(cost,_sealSacrificeCountForDisplay())):cost;
  const ready=inBattle&&lit>=cost;
  const cls=`seal-cost-badge${ready?' seal-cost-ready':''}${inBattle?' seal-cost-battle':''}`;
  const icons=Array.from({length:cost},(_,i)=>`<img class="${i<lit?'seal-cost-lit':''}" src="${path}" alt="">`).join('');
  return `<span class="${cls}">${icons}</span>`;
}
// entity（スペル/強化パネル/召喚済みユニット）が持つ manaCost/manaRepeat/_manaFireCount を見て、
// div内の.mana-cost-orbsのアイコン点灯・非表示状態を反映する。マナは消費されない共有蓄積値のため、
// 「直近の発動基準（manaCost×発動回数）からの蓄積分」だけ点灯させる。
// 非repeatは発動後アイコンごと非表示、manaRepeatは発動後も表示を維持し次の閾値へ向けて再点灯する。
function _applyManaOrbState(div,entity){
  if(!div) return;
  const wrap=div.querySelector('.mana-cost-orbs');
  if(!wrap) return;
  const cost=Number(entity&&entity.manaCost)||0;
  if(!cost) return;
  const orbImgs=wrap.querySelectorAll('img');
  const inBattle=typeof G!=='undefined'&&(G.phase==='player'||G.phase==='enemy');
  if(!inBattle){
    wrap.classList.remove('mana-orbs-hidden');
    orbImgs.forEach(img=>img.classList.add('mana-orb-lit'));
    return;
  }
  const repeat=!!(entity&&entity.manaRepeat);
  const fired=(entity&&entity._manaFireCount)||0;
  if(fired>=1&&!repeat){
    wrap.classList.add('mana-orbs-hidden');
    return;
  }
  wrap.classList.remove('mana-orbs-hidden');
  const have=Math.max(0,(typeof _ensureMana==='function'?_ensureMana():Number(G.mana)||0)-cost*fired);
  orbImgs.forEach((img,i)=>{ if(i<have) img.classList.add('mana-orb-lit'); });
}
function _posKwTip(tip,e){
  const x=e.clientX+12, y=e.clientY-8;
  const tw=tip.offsetWidth, th=tip.offsetHeight;
  tip.style.left=Math.min(x,window.innerWidth-tw-8)+'px';
  tip.style.top=Math.max(4,(y-th>4?y-th:y+16))+'px';
}

// 味方の全スロット（MAX_ALLIES件）DOM 要素を配列で返す（lane 対応・ピッカー用）
function _getAllyDomSlots(){
  const arr=[];
  [...(document.getElementById('f-ally')?.querySelectorAll('.slot')||[])].forEach((slot,pos)=>{
    const idx=slot.dataset&&slot.dataset.unitIdx!=null?parseInt(slot.dataset.unitIdx,10):pos;
    arr[idx]=slot;
  });
  return arr;
}
function _getEnemyDomSlots(){
  return [...(document.getElementById('f-enemy')?.querySelectorAll('.slot')||[])];
}

// スロット高さをCSSカスタムプロパティに反映（リサイズ対応）
function _updateLaneOffset(){
  // 実在スロットが計測できれば最も正確
  const anyRow=document.getElementById('f-ally')||document.getElementById('f-enemy');
  const anySlot=anyRow&&anyRow.querySelector('.slot');
  if(anySlot){
    const h=anySlot.getBoundingClientRect().height;
    if(h>0){
      document.documentElement.style.setProperty('--_slot-h',h+'px');
      document.documentElement.style.setProperty('--lane-rear-top',Math.round(h*0.67)+'px');
      return;
    }
  }
  // フォールバック：max-width:1100px を考慮した計算
  const W=Math.min(document.documentElement.clientWidth,1100);
  const slotH=(W-49)/7*88/63;
  document.documentElement.style.setProperty('--_slot-h',Math.round(slotH)+'px');
  document.documentElement.style.setProperty('--lane-rear-top',Math.round(slotH*0.67)+'px');
}

// ── 攻撃ライン描画 ──
(function _initAttackLineSvg(){
  if(document.getElementById('atk-line-svg')) return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id='atk-line-svg';
  svg.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(svg);
})();

function showAttackLine(fromEl, toEls, color){
  const svg=document.getElementById('atk-line-svg');
  if(!svg||!fromEl||!toEls||!toEls.length) return;
  svg.innerHTML='';
  const fr=fromEl.getBoundingClientRect();
  const fx=fr.left+fr.width/2, fy=fr.top+fr.height/2;
  toEls.forEach(toEl=>{
    if(!toEl) return;
    const tr=toEl.getBoundingClientRect();
    const tx=tr.left+tr.width/2, ty=tr.top+tr.height/2;
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',fx); line.setAttribute('y1',fy);
    line.setAttribute('x2',tx); line.setAttribute('y2',ty);
    line.setAttribute('stroke',color||'#fff');
    line.setAttribute('stroke-width','2');
    line.setAttribute('stroke-opacity','0.85');
    line.setAttribute('stroke-linecap','round');
    svg.appendChild(line);
  });
}

function hideAttackLine(){
  const svg=document.getElementById('atk-line-svg');
  if(svg) svg.innerHTML='';
}

function getCurrentUnitSlot(side,idxOrUnit){
  const field=document.getElementById(side==='enemy'?'f-enemy':'f-ally');
  if(!field) return null;
  const list=side==='enemy'?G.enemies:G.allies;
  const idx=typeof idxOrUnit==='number'?idxOrUnit:list.indexOf(idxOrUnit);
  if(idx<0) return null;
  return field.querySelector(`.slot[data-unit-idx="${idx}"]`)||
    field.querySelectorAll('.slot')[idx]||
    null;
}

// VFX動画は背景黒で書き出されている。<video>要素はブラウザによってはCSSの
// mix-blend-mode:screenが正しく効かない（動画専用の合成レイヤーで描画されるため）ことがあるので、
// <canvas>に毎フレーム描画し、輝度の低い（黒に近い）ピクセルほど透明にするルミナンスキー処理で
// 黒背景を確実に透過させる。戻り値のcanvasをDOMに追加して使う（videoはcanvasの下に自動追加済み）。
// host：video/canvasを実際に配置する親要素（画面外に置くとChrome等が「非表示の背景動画」と
// 判定し、省電力のため自動一時停止してしまう＝AbortError: video-only background media was
// paused to save power。実際に表示されるhost内に収めることでこれを回避する）。
// zoom：動画フレーム中心付近だけを拡大して描画したい場合の倍率（例：3なら中心1/3四方を全体に拡大）。
// 省略時は1（フレーム全体をそのまま描画）。
function _createLumaKeyedVideoCanvas(videoUrl, className, host, zoom){
  const zoomFactor=Math.max(1,zoom||1);
  const video=document.createElement('video');
  // videoの見た目上の位置・変形はcanvasの描画結果に影響しない（canvasはvideoの現在フレームを
  // ピクセルとしてサンプリングするだけ）。videoは「そこそこの大きさで表示されている」状態を
  // 保てば十分。opacity:0や極小サイズ・画面外配置にすると、Chrome等が「非表示の背景動画」と
  // 判定し省電力のため自動一時停止してしまう（AbortError: video-only background media was
  // paused to save power）ため、それらは避けた静的なスタイルを与える。
  // canvas側は呼び出し元がclassName（位置・アニメーション）を制御して上に重ねて隠す。
  video.src=videoUrl;
  video.muted=true;
  video.autoplay=true;
  video.playsInline=true;
  Object.assign(video.style,{position:'absolute',left:'0',top:'0',width:'60%',height:'60%',opacity:'0.01',pointerEvents:'none'});
  if(host) host.appendChild(video);
  else document.body.appendChild(video);

  const canvas=document.createElement('canvas');
  canvas.className=className;

  let ctx=null;
  let timer=0;
  let stopped=false;
  // requestAnimationFrameはタブが非アクティブ/非表示扱いの場合に発火しないことがあるため
  // （自動操作環境等）、確実に動かすsetTimeoutベースのループを使う。
  const draw=()=>{
    if(stopped) return;
    if(video.paused||video.ended||video.readyState<2){
      timer=setTimeout(draw,32);
      return;
    }
    if(!ctx){
      canvas.width=video.videoWidth||canvas.width||2;
      canvas.height=video.videoHeight||canvas.height||2;
      // 動画本来の縦横比を保つ（CSS側で片方の辺のみ指定している場合に、もう片方をこれで決める）
      canvas.style.aspectRatio=`${canvas.width} / ${canvas.height}`;
      ctx=canvas.getContext('2d',{willReadFrequently:true});
    }
    if(zoomFactor>1){
      const sw=video.videoWidth/zoomFactor, sh=video.videoHeight/zoomFactor;
      const sx=(video.videoWidth-sw)/2, sy=(video.videoHeight-sh)/2;
      ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
    } else {
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
    }
    try{
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=frame.data;
      // しきい値以下の輝度は完全透明、しきい値〜しきい値+softness の間はなだらかに不透明化する
      const threshold=24, softness=60;
      for(let i=0;i<d.length;i+=4){
        const luma=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        d[i+3]=Math.max(0,Math.min(255,(luma-threshold)*(255/softness)));
      }
      ctx.putImageData(frame,0,0);
    }catch(err){
      // getImageDataに失敗した場合、黒背景の生フレームを不透明表示し続けるより、
      // 何も出さない方が見た目の破綻が少ないため canvas をクリアする。
      console.error('[luma-key VFX] getImageData failed, hiding this frame instead of showing an opaque black frame.',err);
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    timer=setTimeout(draw,32);
  };
  draw();
  video.play?.().catch(()=>{});

  const stop=()=>{
    stopped=true;
    clearTimeout(timer);
    video.pause?.();
    video.remove();
  };
  return {video,canvas,stop};
}

function playHitVfxAtRect(rect,amount,options){
  if(!rect) return Promise.resolve();
  const opt=options||{};
  const hitDuration=opt.hitDuration||900;
  const fadeDuration=opt.fadeDuration||180;
  const labelDuration=opt.labelDuration||550;
  // 見た目の再生時間（hitDuration）と、次の行動に進むまで呼び出し元が待つ時間は切り離す。
  // hitDurationはあくまで演出を見やすくスローにするためのもので、これに比例して攻撃間の
  // テンポまで間延びしないよう、呼び出し元への復帰は短いgateMsだけ待てば十分とする。
  // 演出自体はgateMs経過後もバックグラウンドで最後まで再生・フェードアウトを続ける。
  const gateMs=opt.gateMs??200;
  if(!rect.width||!rect.height) return Promise.resolve();
  const host=document.createElement('div');
  host.className='damage-vfx-host';
  Object.assign(host.style,{
    left:`${rect.left}px`,
    top:`${rect.top}px`,
    width:`${rect.width}px`,
    height:`${rect.height}px`,
  });
  // キャラクターの効果でダメージが発生した場合、そのキャラクター専用のVFXがあればそれを再生する。
  // 無ければ通常のhit（既定はWebP）を使う。
  const charVfx=opt.effectSource&&typeof getCharacterEffectVfxPath==='function'?getCharacterEffectVfxPath(opt.effectSource):'';
  // キャラクター固有VFXが無い場合、毒等キーワード発動によるダメージならキーワード専用のVFXを探す。
  const keywordVfx=!charVfx&&opt.keywordEffect&&typeof getKeywordEffectVfxPath==='function'?getKeywordEffectVfxPath(opt.keywordEffect):'';
  const hitUrl=charVfx||keywordVfx||Assets?.vfx?.hit||'assets/temp/vfx/hit.webp';
  document.body.appendChild(host);

  const isWebp=/\.webp(\?|$)/i.test(hitUrl);
  let mediaEl,stop,videoRef=null;
  if(isWebp){
    // 透過済みWebPアニメーション（黒背景は変換時に透過済み）。canvasでのルミナンスキー処理は不要で、
    // imgでそのまま再生するだけでよい。再生時間・ズームも変換時に焼き込み済み。
    mediaEl=document.createElement('img');
    mediaEl.className='vfx vfx-hit-video';
    mediaEl.alt='';
    // 同一URLの<img>を短時間に連続生成すると、ブラウザによっては再生状態が共有され
    // ループ位置がずれて見えることがあるため、インスタンスごとに独立した画像として
    // 扱わせるためのダミークエリを付与する。
    mediaEl.src=hitUrl+(hitUrl.includes('?')?'&':'?')+'_r='+Math.random();
    host.appendChild(mediaEl);
    stop=()=>{};
  } else {
    const created=_createLumaKeyedVideoCanvas(hitUrl,'vfx vfx-hit-video',host,opt.zoom||2);
    mediaEl=created.canvas;
    stop=created.stop;
    videoRef=created.video;
    mediaEl.style.setProperty('--hit-vfx-duration',`${hitDuration}ms`);
    // hit.mp4自体は0.8秒程度と短いため、等速のままだと一瞬で終わり早すぎて見える。
    // hitDuration（既定1400ms）まで間延びさせるよう再生速度を落とし、スローモーションにする。
    videoRef.addEventListener('loadedmetadata',()=>{
      if(videoRef.duration&&isFinite(videoRef.duration)&&videoRef.duration>0){
        videoRef.playbackRate=Math.min(16,Math.max(0.25,videoRef.duration/(hitDuration/1000)));
      }
    },{once:true});
    host.appendChild(mediaEl);
  }
  if(amount>0){
    const label=document.createElement('div');
    label.className='vfx-damage-label';
    label.textContent=`-${amount}`;
    label.style.setProperty('--damage-label-duration',`${labelDuration}ms`);
    host.appendChild(label);
  }
  // 演出本体の後始末（フェードアウト→DOM除去）はgateMsとは無関係に、演出の実時間に沿って
  // バックグラウンドで進行させる。呼び出し元（戦闘ループ）はこれを待たない。
  let done=false;
  const finish=()=>{
    if(done) return; done=true;
    stop();
    mediaEl.style.transition=`opacity ${fadeDuration}ms ease-out`;
    // transitionプロパティを設定した直後に同じフレーム内でopacityを変更すると、ブラウザによっては
    // トランジションが認識されずopacity:0へ瞬時にジャンプしてしまう（消え方が不自然に見える原因）。
    // 一度スタイルを強制的に確定させてから変更することで、確実にフェードアニメーションとして扱わせる。
    void mediaEl.offsetWidth;
    mediaEl.style.opacity='0';
    setTimeout(()=>{ host.remove(); },fadeDuration);
  };
  if(isWebp){
    // 素材自体の再生がhitDurationより先に終わり最後のコマで静止した後、finish()の
    // フェード開始をhitDurationまで待つ形だと「一瞬静止してから唐突に消える」不自然な
    // 見た目になる。hitDuration全体を1本のアニメーションとして扱い、終盤（fadeDuration分）
    // にかけて動きを止めずに滑らかにフェードアウトさせる。
    const fadeStartRatio=Math.max(0,Math.min(1,1-fadeDuration/hitDuration));
    const anim=mediaEl.animate([
      {opacity:1,offset:0},
      {opacity:1,offset:fadeStartRatio},
      {opacity:0,offset:1},
    ],{duration:hitDuration,easing:'ease-out',fill:'forwards'});
    const finishWebp=()=>{ if(done) return; done=true; host.remove(); };
    anim.addEventListener('finish',finishWebp,{once:true});
    setTimeout(finishWebp,hitDuration+60);
  } else {
    videoRef.addEventListener('ended',finish,{once:true});
    // 再生速度調整が効かない場合（メタデータ取得失敗等）の保険。通常はvideoのendedで先に終わる。
    setTimeout(finish,opt.maxDuration||Math.max(1000,hitDuration+400));
  }
  // 呼び出し元への復帰はgateMsのみ待つ（次の攻撃・演出再開のテンポを演出の長さに引きずられないようにする）。
  return new Promise(resolve=>setTimeout(resolve,gateMs));
}

function playHitVfxOnSlot(slot,amount,options){
  if(!slot) return Promise.resolve();
  const rect=slot.getBoundingClientRect();
  return playHitVfxAtRect(rect,amount,options);
}

function playHitVfx(side,idxOrUnit,amount,options){
  return playHitVfxOnSlot(getCurrentUnitSlot(side,idxOrUnit),amount,options);
}

function _battleBackgroundFrameRect(){
  const scr=document.getElementById('scr-battle');
  const r=scr?.getBoundingClientRect?.();
  if(!r||!r.width||!r.height) return {left:0,top:0,width:window.innerWidth||3840,height:window.innerHeight||2160,scale:1};
  const scale=r.width/3840;
  return {left:r.left,top:r.top,width:r.width,height:r.height,scale};
}

// ── 特殊演出（生贄破棄・封印解放）── 「特殊演出」シートのS002/S003用の汎用再生関数。
// 対象カードの上にWebPを表示してSFXを再生し、forwardMsが経過したらonMidpoint()を呼びつつ
// （カードの消去・解封などの実処理はここで行う）、直近forwardMs分に実際に描画されたフレームを
// canvasへ毎フレーム記録しておき、それをreverseMsかけて逆順に再生する（＝WebPの逆再生）。
// file://運用のためfetch/XMLHttpRequestで生バイトを読めない（ImageDecoderが使えない）制約があり、
// 代わりに<img>が実際に表示した見た目をcanvasにdrawImage()で記録→逆順描画する方式にしている。
function playSpecialProductionVfx(slot, sfxKey, vfxUrl, onMidpoint, options){
  const opt=options||{};
  const forwardMs=opt.forwardMs??200;
  const reverseMs=opt.reverseMs??200;
  const finishMidpoint=()=>{ if(onMidpoint) try{ onMidpoint(); }catch(e){ console.error('[SpecialVfx onMidpoint]',e); } };
  if(!slot||!vfxUrl){ finishMidpoint(); return Promise.resolve(); }
  const rect=slot.getBoundingClientRect();
  if(!rect.width||!rect.height){ finishMidpoint(); return Promise.resolve(); }
  if(sfxKey&&typeof playSfx==='function') playSfx(sfxKey,{group:'magic'});
  const clipRect=_battleBackgroundFrameRect();
  const clip=document.createElement('div');
  clip.className='special-vfx-clip';
  Object.assign(clip.style,{
    position:'fixed',
    left:`${clipRect.left}px`,
    top:`${clipRect.top}px`,
    width:`${clipRect.width}px`,
    height:`${clipRect.height}px`,
    zIndex:opt.zIndex??10001,
    pointerEvents:'none',
    overflow:'hidden',
  });
  const host=document.createElement('div');
  host.className='special-vfx-host';
  const scale=Math.max(1,Number(opt.scale)||1);
  const hostW=rect.width*scale, hostH=rect.height*scale;
  const hostLeft=rect.left+(rect.width-hostW)/2;
  const hostTop=opt.anchor==='bottom'
    ? rect.top+rect.height-hostH*0.62
    : rect.top+(rect.height-hostH)/2;
  const offsetY=Number(opt.offsetY)||0;
  Object.assign(host.style,{
    position:'absolute',left:`${hostLeft-clipRect.left}px`,top:`${hostTop+offsetY-clipRect.top}px`,
    width:`${hostW}px`,height:`${hostH}px`,
    pointerEvents:'none',overflow:'visible',
  });
  clip.appendChild(host);
  document.body.appendChild(clip);
  const img=document.createElement('img');
  img.className='special-vfx-img';
  img.alt='';
  img.style.cssText=`position:absolute;inset:0;width:100%;height:100%;object-fit:${opt.fit||'cover'};object-position:${opt.objectPosition||'center center'};`;
  img.src=vfxUrl+(vfxUrl.includes('?')?'&':'?')+'_r='+Math.random();
  host.appendChild(img);
  const w=Math.max(1,Math.round(hostW)), h=Math.max(1,Math.round(hostH));
  const frames=[];
  let capturing=true;
  const captureLoop=()=>{
    if(!capturing) return;
    try{
      const c=document.createElement('canvas');
      c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      frames.push(c);
    }catch(e){ /* デコード前フレーム等はスキップ */ }
    if(capturing) requestAnimationFrame(captureLoop);
  };
  requestAnimationFrame(captureLoop);
  return new Promise(resolve=>{
    setTimeout(()=>{
      capturing=false;
      finishMidpoint();
      img.style.display='none';
      const canvas=document.createElement('canvas');
      canvas.width=w; canvas.height=h;
      canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;';
      host.appendChild(canvas);
      const ctx=canvas.getContext('2d');
      const seq=frames.slice().reverse();
      const cleanup=()=>{ clip.remove(); resolve(); };
      if(!seq.length){ setTimeout(cleanup,reverseMs); return; }
      const started=performance.now();
      const step=now=>{
        const elapsed=now-started;
        if(elapsed>=reverseMs){ cleanup(); return; }
        const progress=Math.max(0,Math.min(1,elapsed/reverseMs));
        const i=Math.min(seq.length-1,Math.floor(progress*seq.length));
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(seq[i],0,0);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },forwardMs);
  });
}

// S002/S003は元動画が長尺のため、順再生後に直近フレームを逆順に描画して折り返す。
const _SPECIAL_VFX_TIMING={forwardMs:750,reverseMs:750};
const _SEAL_RELEASE_VFX_TIMING={forwardMs:1750,reverseMs:1750};

// 生贄キャラを1体、S003演出付きで破棄する（封印解放の生贄コスト用）
function playSacrificeDestroyVfx(unit, side){
  const slot=getCurrentUnitSlot(side,unit);
  const url=Assets?.vfx?.specialProduction?.S003||'';
  const slotH=slot?.getBoundingClientRect?.().height||0;
  return playSpecialProductionVfx(slot,'S003',url,()=>{
    unit.hp=0;
    unit._deathProcessed=true;
    unit._dp=true;
    unit._sacrificedForSeal=true;
    if(slot){
      slot.style.setProperty('transition','none','important');
      slot.style.setProperty('opacity','0','important');
    }
  },{..._SPECIAL_VFX_TIMING,scale:4,fit:'cover',offsetY:-slotH*0.15});
}

// 封印を1体、S002演出付きで解放する
function playSealReleaseVfx(unit, side){
  const slot=getCurrentUnitSlot(side,unit);
  const url=Assets?.vfx?.specialProduction?.S002||'';
  const slotH=slot?.getBoundingClientRect?.().height||0;
  const fadeMs=Math.max(0,_SEAL_RELEASE_VFX_TIMING.forwardMs+_SEAL_RELEASE_VFX_TIMING.reverseMs-250);
  if(slot){
    slot.querySelectorAll('.seal-cost-badge').forEach(el=>{ el.style.display='none'; });
    const fadeEls=[...slot.children].filter(el=>!el.classList.contains('seal-cost-badge')&&!el.classList.contains('unit-hit-layer'));
    fadeEls.forEach(el=>{
      el.style.setProperty('transition',`filter ${fadeMs}ms ease-out`,'important');
      el.style.setProperty('filter','brightness(.45) saturate(.65)','important');
    });
    // CSSの.sealed-unit子要素暗転を外した後、次フレームでインラインfilterを解除し、
    // S002の順再生+逆再生と同じ尺で明るくする。
    slot.classList.remove('sealed-unit');
    requestAnimationFrame(()=>fadeEls.forEach(el=>el.style.setProperty('filter','brightness(1) saturate(1)','important')));
    setTimeout(()=>{
      fadeEls.forEach(el=>el.style.removeProperty('transition'));
      fadeEls.forEach(el=>el.style.removeProperty('filter'));
    },fadeMs+40);
  }
  return playSpecialProductionVfx(slot,'S002',url,()=>{
    unit._sealed=false;
    delete unit._sealValue;
  },{..._SEAL_RELEASE_VFX_TIMING,scale:3,fit:'cover',objectPosition:'center center',offsetY:-slotH*0.05});
}

// キャラクター専用エフェクトのうち、対象1体に重ねるのではなく、攻撃キャラクターを起点に
// 対象範囲（最も左〜最も右）を薙ぎ払うように再生する特別な動画を持つキャラクター。
// 現状はC043（アラッサス）のみの例外対応。
const _SWEEP_STYLE_EFFECT_CODES=new Set(['C043']);

// 薙ぎ払いWebP素材のうち、周囲に透明マージンを持つもの（フレーム全体を使っていない）だけ、
// 実際に絵が描かれている領域をフレーム全体に対する比率で指定する。値は全フレームの非透明
// ピクセル外接矩形の和集合から算出したもの。マージンを持たない素材は登録不要（未登録の場合は
// _SWEEP_VFX_FIT側でcontain指定になり、素材本来の縦横比を保ったまま自動的にフィットする）。
const _SWEEP_VFX_CROP={};

function isSweepStyleEffectVfx(unit){
  if(!unit||typeof _assetCodeRaw!=='function'||typeof _normalizeAssetCode!=='function') return false;
  const raw=_assetCodeRaw(unit);
  if(!raw) return false;
  const code=_normalizeAssetCode(raw,'C');
  return !!(code&&_SWEEP_STYLE_EFFECT_CODES.has(code));
}

// 攻撃キャラクターのカード先端を起点に、実際の距離・角度で対象群（最も左〜最も右、最も近い〜最も遠い）
// まで届く長さで炎を伸ばし、対象の角度範囲を回転しながら薙ぎ払うように動画を再生する。
// SEと合わせるため、再生時間（sweepDuration）は対象数・回転量に関わらず常に一定にする。
function playCharacterSweepVfx(unit,isEnemySide,targets,videoUrl,options){
  if(!videoUrl) return Promise.resolve();
  const opt=options||{};
  const sweepDuration=opt.sweepDuration||700;
  const sourceSlot=getCurrentUnitSlot(isEnemySide?'enemy':'ally',unit);
  const targetSlots=(targets||[]).map(t=>getCurrentUnitSlot(isEnemySide?'ally':'enemy',t)).filter(Boolean);
  if(!sourceSlot||!targetSlots.length) return Promise.resolve();
  const sourceRect=sourceSlot.getBoundingClientRect();
  // カード先端（味方なら上端＝敵陣営へ向く側）を発生源にする
  // カード中央ではなく、やや左寄り（口元付近を想定）を発生源にする
  const originX=sourceRect.left+sourceRect.width*0.25;
  const originY=isEnemySide?sourceRect.bottom:sourceRect.top;

  // 発生源から見た各対象の実際の角度・距離を計算する。これにより対象が1体で近くても、
  // 遠く（後衛）でも、正しい長さ・向きで炎が届く。
  const targetRects=targetSlots.map(s=>s.getBoundingClientRect());
  const points=targetRects.map(r=>({x:r.left+r.width/2,y:r.top+r.height/2}));
  const angles=points.map(p=>Math.atan2(p.y-originY,p.x-originX)*180/Math.PI);
  const distances=points.map(p=>Math.hypot(p.x-originX,p.y-originY));
  const minAngle=Math.min(...angles), maxAngle=Math.max(...angles);
  const midAngle=(minAngle+maxAngle)/2;
  const halfSpread=Math.max(0,(maxAngle-minAngle)/2);
  const maxDist=Math.max(...distances);
  // 最も遠い対象（後衛）まで確実に届くよう、少し余裕を持たせた長さにする
  // （ユーザー確認により、届く長さをさらに2倍に調整済み）
  const length=Math.max(80,maxDist*1.2)*2;
  const startAngle=midAngle-halfSpread, endAngle=midAngle+halfSpread;

  const clipRect=_battleBackgroundFrameRect();
  const clip=document.createElement('div');
  clip.className='sweep-vfx-clip';
  Object.assign(clip.style,{
    position:'fixed',
    left:`${clipRect.left}px`,
    top:`${clipRect.top}px`,
    width:`${clipRect.width}px`,
    height:`${clipRect.height}px`,
    zIndex:10021,
    pointerEvents:'none',
    overflow:'hidden',
  });
  const host=document.createElement('div');
  host.className='sweep-vfx-host';
  Object.assign(host.style,{
    position:'absolute',
    left:`${originX-clipRect.left}px`,
    top:`${originY-clipRect.top}px`,
    width:`${length}px`,
    height:`${length}px`,
    zIndex:'auto',
  });
  clip.appendChild(host);
  document.body.appendChild(clip);
  const isWebp=/\.webp(\?|$)/i.test(videoUrl);
  let mediaEl,stop;
  if(isWebp){
    // 透過済みWebPアニメーション。canvasでのルミナンスキー処理は不要でbackground-imageでそのまま再生する
    // （<img>ではなくdivのbackground-imageにするのは、素材の透明マージンをbackground-size/positionで
    // トリミングし、実際に絵が描かれている範囲だけをbox一杯に表示するため。後述）。
    // 動画のように再生速度をsweepDurationへ動的に同期させることはできないため、中身のアニメーションは
    // 自身の速度で再生させ、薙ぎ払いの見た目（回転）はhost側のanimateでsweepDuration通りに制御する。
    mediaEl=document.createElement('div');
    mediaEl.className='vfx-sweep-video';
    // 同一URLの背景画像を短時間に連続生成した際の再生状態共有を避けるためのダミークエリ。
    const bustUrl=videoUrl+(videoUrl.includes('?')?'&':'?')+'_r='+Math.random();
    // 素材によっては帯の左右・上下に透明マージンを持って書き出されていることがあり、そのままの
    // 比率で炎box（幅=届く長さ、高さ=太さ）に収めると、透明部分の分だけ発生源（攻撃キャラ）側に
    // 隙間ができ、炎がキャラクターから離れて浮いて見えてしまう。そういう素材だけ_SWEEP_VFX_CROPに
    // 登録しておき、background-size/positionで実際に絵が描かれている範囲（全フレームを走査した
    // 非透明ピクセルの外接矩形の和集合）だけをbox一杯にトリミング表示することで隙間を無くす
    // （マージンを持たない素材はcontainで縦横比を保ったままフィットさせるだけでよい）。
    const code=typeof _assetCodeRaw==='function'&&typeof _normalizeAssetCode==='function'?_normalizeAssetCode(_assetCodeRaw(unit),'C'):'';
    const crop=_SWEEP_VFX_CROP[code];
    mediaEl.style.backgroundImage=`url("${bustUrl}")`;
    mediaEl.style.backgroundRepeat='no-repeat';
    if(crop){
      const wFrac=crop.right-crop.left, hFrac=crop.bottom-crop.top;
      const sx=100/wFrac, sy=100/hFrac;
      const px=100*crop.left/(1-wFrac), py=100*crop.top/(1-hFrac);
      mediaEl.style.backgroundSize=`${sx}% ${sy}%`;
      mediaEl.style.backgroundPosition=`${px}% ${py}%`;
    } else {
      // トリミング指定が無い（＝透明マージンを持たない）素材は、100%/100%で引き伸ばすと
      // box側のアスペクト比（幅=届く長さ、高さ=太さ）とズレて非一様に歪んでしまう。
      // containで素材本来の縦横比を保ったままboxいっぱいにフィットさせる。
      mediaEl.style.backgroundSize='contain';
      mediaEl.style.backgroundPosition='center';
    }
    stop=()=>{};
  } else {
    // 炎の実体はmp4フレーム中心付近にしかないため、中心を拡大して描画する
    const created=_createLumaKeyedVideoCanvas(videoUrl,'vfx-sweep-video',host,opt.zoom||3);
    mediaEl=created.canvas;
    stop=created.stop;
    // 回転量に関わらず再生時間を一定に保つため、動画自体の再生速度をsweepDurationに合わせる
    created.video.addEventListener('loadedmetadata',()=>{
      if(created.video.duration&&isFinite(created.video.duration)&&created.video.duration>0){
        created.video.playbackRate=Math.min(16,Math.max(0.25,created.video.duration/(sweepDuration/1000)));
      }
    },{once:true});
  }
  host.appendChild(mediaEl);
  // widthは対象までの実距離から計算した「届く長さ」そのものなので、scale()で等倍拡大すると
  // 炎の先端が対象を大きく超えて伸びてしまい、発生源から見て炎が対象と無関係な場所まで届いて
  // しまう（＝カードから離れて見える）原因になる。太さ（height方向）だけをscaleYで拡大し、
  // 届く長さ（width方向）は変えないことで、発生源の位置・炎の届く範囲を保ったまま太くする。
  const sizeScale=opt.sizeScale||2;
  const anim=mediaEl.animate([
    {transform:`rotate(${startAngle}deg) scaleY(${sizeScale})`,opacity:0},
    {transform:`rotate(${startAngle}deg) scaleY(${sizeScale})`,opacity:1,offset:0.1},
    {transform:`rotate(${endAngle}deg) scaleY(${sizeScale})`,opacity:1,offset:0.75},
    {transform:`rotate(${endAngle}deg) scaleY(${sizeScale})`,opacity:0,offset:1},
  ],{duration:sweepDuration,easing:'ease-in-out',fill:'forwards'});
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{ if(done) return; done=true; stop(); clip.remove(); resolve(); };
    anim.addEventListener('finish',finish,{once:true});
    setTimeout(finish,sweepDuration+400);
  });
}

// カードDOMを作り直さず、HP数値とライフバーだけを即座に更新する（applyDamageBatch用の軽量更新）
function updateUnitDamageUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const atkEl=slot.querySelector('.slot-stats .a');
  if(atkEl) atkEl.textContent=Math.max(0,unit.atk||0);
  const hpEl=slot.querySelector('.slot-stats .h');
  if(hpEl){
    hpEl.textContent=Math.max(0,unit.hp||0);
    hpEl.classList.toggle('hp-damaged',unit.maxHp!=null&&unit.hp<unit.maxHp);
  }
  const maxHp=Math.max(1,Number(unit.maxHp)||Number(unit.hp)||1);
  const rate=Math.max(0,Math.min(1,(unit.hp||0)/maxHp));
  const fill=slot.querySelector('.slot-life-fill');
  if(fill) fill.style.width=`${rate*100}%`;
  const bar=slot.querySelector('.slot-life-bar');
  if(bar) bar.title=`ライフ ${Math.max(0,unit.hp||0)}/${maxHp}`;
}
// 戦闘中、ATK/HPを変化させる効果が発動するたびに呼び出し、両陣営の生存ユニット全員の
// 外観の数値（ATK/HP）を即座に更新する（renderAll()のようなカード再構築は行わない軽量版）。
// 例：アラクネの「負傷：全ての敵はATK-1を得る」等、ダメージを受けていないユニットの
// ステータスも変化する効果がある場合、そのユニットの表示も同時に更新する必要があるため。
function _refreshAllUnitStatsUi(){
  (G.allies||[]).forEach(u=>{ if(u&&u.hp>0) updateUnitDamageUi(u,'ally'); });
  (G.enemies||[]).forEach(u=>{ if(u&&u.hp>0) updateUnitDamageUi(u,'enemy'); });
}

// シールド消費時、カードDOMを作り直さずshield-active/魔方陣レイヤーだけを即座に更新する
function updateUnitShieldUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const hasShield=unit.shield>0;
  slot.classList.toggle('shield-active',hasShield);
  const badge=slot.querySelector('.b-shield');
  if(badge){
    if(hasShield) badge.textContent=`結界${unit.shield}`;
    else badge.remove();
  }
  const portrait=slot.querySelector('.unit-portrait');
  const existingLayer=portrait&&portrait.querySelector('.unit-shield-layer');
  if(hasShield&&portrait&&!existingLayer){
    const layer=document.createElement('div');
    layer.className='unit-shield-layer';
    portrait.appendChild(layer);
  } else if(!hasShield&&existingLayer){
    existingLayer.remove();
  }
}

// クローンは画面スケール変換(--game-scale)の外(document.body直下)に置かれるため、
// 元要素の computed フォントサイズをそのままコピーすると等倍(未縮小)で表示され巨大化する。
function _gameScale(){
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
}
function _playAttackMotionCore(attacker,target,isEnemySide,onImpactPause,options){
  if(!attacker||!target||!document.body) return Promise.resolve();
  const opt=options||{};
  const fromList=isEnemySide?G.enemies:G.allies;
  const toList=isEnemySide?G.allies:G.enemies;
  let fromIdx=fromList.indexOf(attacker);
  let toIdx=toList.indexOf(target);
  if(fromIdx<0&&attacker.id) fromIdx=fromList.findIndex(u=>u&&u.id===attacker.id);
  if(toIdx<0&&target.id) toIdx=toList.findIndex(u=>u&&u.id===target.id);
  if(fromIdx<0||toIdx<0) return Promise.resolve();
  const fromField=document.getElementById(isEnemySide?'f-enemy':'f-ally');
  const toField=document.getElementById(isEnemySide?'f-ally':'f-enemy');
  const fromEl=fromField?.querySelector(`.slot[data-unit-idx="${fromIdx}"]`)||getCurrentUnitSlot(isEnemySide?'enemy':'ally',fromIdx);
  const toEl=toField?.querySelector(`.slot[data-unit-idx="${toIdx}"]`)||getCurrentUnitSlot(isEnemySide?'ally':'enemy',toIdx);
  if(!fromEl||!toEl||!fromEl.animate) return Promise.resolve();
  const fr=fromEl.getBoundingClientRect();
  const tr=toEl.getBoundingClientRect();
  const dx=(tr.left+tr.width/2)-(fr.left+fr.width/2);
  const dy=(tr.top+tr.height/2)-(fr.top+fr.height/2);
  const dist=Math.hypot(dx,dy)||1;
  const overlap=Math.min(fr.width,tr.width)*0.33;
  const ratio=Math.max(0,dist-overlap)/dist;
  const mx=dx*ratio;
  const my=dy*ratio;
  const tilt=dx===0?0:(dx>0?4:-4)*(isEnemySide?-1:1);
  const clone=fromEl.cloneNode(true);
  clone.classList.add('attack-motion-clone');
  clone.classList.remove('dragging','drag-over','selected','selectable');
  clone.style.setProperty('border','0','important');
  clone.style.setProperty('border-top','0','important');
  const cs=getComputedStyle(fromEl);
  ['--new-card-art-left','--new-card-art-top','--new-card-art-h','--unit-art-size','--unit-art-position'].forEach(k=>{
    const v=cs.getPropertyValue(k);
    if(v) clone.style.setProperty(k,v);
  });
  clone.style.position='fixed';
  clone.style.left=`${fr.left}px`;
  clone.style.top=`${fr.top}px`;
  clone.style.setProperty('width',`${fr.width}px`,'important');
  clone.style.setProperty('min-width',`${fr.width}px`,'important');
  clone.style.setProperty('max-width',`${fr.width}px`,'important');
  clone.style.setProperty('height',`${fr.height}px`,'important');
  clone.style.setProperty('min-height',`${fr.height}px`,'important');
  clone.style.setProperty('max-height',`${fr.height}px`,'important');
  clone.style.setProperty('--motion-card-w',`${fr.width}px`);
  clone.style.setProperty('--motion-card-h',`${fr.height}px`);
  clone.style.setProperty('aspect-ratio','auto','important');
  const unitCardW=cs.getPropertyValue('--unit-card-w');
  const unitCardH=cs.getPropertyValue('--unit-card-h');
  if(unitCardW) clone.style.setProperty('--unit-card-w',unitCardW);
  if(unitCardH) clone.style.setProperty('--unit-card-h',unitCardH);
  const frameW=cs.getPropertyValue('--unit-frame-w');
  const hateFrameW=cs.getPropertyValue('--unit-hate-frame-w');
  if(frameW) clone.style.setProperty('--unit-frame-w',frameW);
  if(hateFrameW) clone.style.setProperty('--unit-hate-frame-w',hateFrameW);
  const frameLayer=fromEl.querySelector('.unit-frame-layer');
  const frameRect=frameLayer?.getBoundingClientRect?.();
  if(frameRect&&frameRect.width&&frameRect.height){
    clone.style.setProperty('--unit-frame-w',`${frameRect.width}px`,'important');
    clone.style.setProperty('--unit-hate-frame-w',`${frameRect.width}px`,'important');
    const cloneFrame=clone.querySelector('.unit-frame-layer');
    if(cloneFrame){
      cloneFrame.style.setProperty('width',`${frameRect.width}px`,'important');
      cloneFrame.style.setProperty('height',`${frameRect.height}px`,'important');
      cloneFrame.style.setProperty('max-width',`${frameRect.width}px`,'important');
      cloneFrame.style.setProperty('max-height',`${frameRect.height}px`,'important');
      cloneFrame.style.setProperty('transform','translate(-50%,-50%)','important');
    }
  }
  const gameScale=_gameScale();
  const copyMotionStat=(srcSel,dstSel,refSel)=>{
    const src=fromEl.querySelector(srcSel);
    const dst=clone.querySelector(dstSel);
    if(!src||!dst) return;
    // refSel未指定時はfromEl基準。ただし実際のCSS containing blockが別要素
    // （例：position指定のある.slot-stats）の場合は必ずrefSelで明示すること。
    // fromEl基準のまま計算するとcontaining blockの実寸と食い違い、bottom指定が
    // top+heightに上書きされて位置がズレる（over-constrained時はbottomが無視される）。
    const refSrc=refSel?src.closest(refSel):fromEl;
    const refDst=refSel?dst.closest(refSel):clone;
    if(!refSrc||!refDst) return;
    const s=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const rr=refSrc.getBoundingClientRect();
    const fs=(parseFloat(s.fontSize)||Math.max(24,Math.min(fr.width,fr.height)*0.16))*gameScale;
    dst.style.setProperty('font-size',`${fs}px`,'important');
    dst.style.setProperty('line-height','1','important');
    dst.style.setProperty('left',`${sr.left-rr.left}px`,'important');
    dst.style.setProperty('right','auto','important');
    dst.style.setProperty('top','auto','important');
    dst.style.setProperty('bottom',`${rr.bottom-sr.bottom}px`,'important');
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
    dst.style.setProperty('display','flex','important');
    dst.style.setProperty('align-items','center','important');
    dst.style.setProperty('justify-content','center','important');
    dst.style.setProperty('text-align',s.textAlign||'center','important');
  };
  const stats=clone.querySelector('.slot-stats');
  if(stats){
    const srcStats=fromEl.querySelector('.slot-stats .a')||fromEl.querySelector('.slot-stats');
    const statsSize=(parseFloat(getComputedStyle(srcStats||fromEl).fontSize)||0)*gameScale;
    const statLimit=Math.max(28,Math.min(fr.width,fr.height)*0.28);
    const motionStatSize=statsSize||statLimit;
    clone.style.setProperty('--motion-stat-size',`${motionStatSize}px`,'important');
    stats.style.setProperty('font-size',`${motionStatSize}px`,'important');
    stats.style.setProperty('line-height','1','important');
    stats.querySelectorAll('.a,.h').forEach(el=>{
      el.style.setProperty('font-size',`${motionStatSize}px`,'important');
      el.style.setProperty('line-height','1','important');
    });
    copyMotionStat('.slot-stats .a','.slot-stats .a','.slot-stats');
    copyMotionStat('.slot-stats .h','.slot-stats .h','.slot-stats');
  }
  copyMotionStat('.card-summon-atk','.card-summon-atk');
  copyMotionStat('.card-summon-hp','.card-summon-hp');
  // マナオーブ（固定px画像）・方向矢印（固定pxフォント）もスケール外に置かれるため個別に補正する
  const srcOrbImgs=fromEl.querySelectorAll('.mana-cost-orbs img');
  const dstOrbImgs=clone.querySelectorAll('.mana-cost-orbs img');
  srcOrbImgs.forEach((src,i)=>{
    const dst=dstOrbImgs[i];
    if(!dst) return;
    const sr=src.getBoundingClientRect();
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
  });
  const rr0=fromEl.getBoundingClientRect();
  const srcDirs=fromEl.querySelectorAll('.panel-dir');
  const dstDirs=clone.querySelectorAll('.panel-dir');
  srcDirs.forEach((src,i)=>{
    const dst=dstDirs[i];
    if(!dst) return;
    const s=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const fs=(parseFloat(s.fontSize)||0)*gameScale;
    dst.style.setProperty('font-size',`${fs}px`,'important');
    dst.style.setProperty('line-height','1','important');
    dst.style.setProperty('left',`${sr.left-rr0.left}px`,'important');
    dst.style.setProperty('top',`${sr.top-rr0.top}px`,'important');
    dst.style.setProperty('right','auto','important');
    dst.style.setProperty('bottom','auto','important');
    dst.style.setProperty('width',`${sr.width}px`,'important');
    dst.style.setProperty('height',`${sr.height}px`,'important');
    dst.style.setProperty('transform','none','important');
  });
  clone.style.margin='0';
  clone.style.zIndex='10000';
  clone.style.pointerEvents='none';
  clone.style.transform='translate(0,0)';
  clone.style.transformOrigin='center center';
  attacker._motionHidden=true;
  fromEl.classList.add('motion-hidden');
  fromEl.style.setProperty('visibility','hidden','important');
  document.body.appendChild(clone);
  clone.getBoundingClientRect();
  const stopRatio=Number.isFinite(opt.stopRatio)?opt.stopRatio:1;
  const atStop=`translate(${mx*stopRatio}px,${my*stopRatio}px) rotate(${tilt}deg)`;
  const atHit=`translate(${mx}px,${my}px) rotate(${tilt}deg)`;
  const cleanup=()=>{
    if(fromEl){
      fromEl.classList.remove('motion-hidden');
      fromEl.style.removeProperty('visibility');
    }
    attacker._motionHidden=false;
    // モーション中に（本来は起こらないはずだが）renderAll()等でフィールドが再構築され、fromElが
    // 古い（DOMから外れた）要素になっていた場合の保険。現在のDOM上のスロットも同様に復元する
    const currentEl=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(isEnemySide?'enemy':'ally',attacker):null;
    if(currentEl&&currentEl!==fromEl){
      currentEl.classList.remove('motion-hidden');
      currentEl.style.removeProperty('visibility');
    }
    clone.remove();
  };
  const runSegment=(frames,duration)=>{
    const speed=typeof getBattleSpeedScale==='function'?getBattleSpeedScale():1;
    const scaledDuration=Math.max(1,duration/Math.max(1,speed));
    const anim=clone.animate(frames,{duration:scaledDuration,easing:'ease-in-out',fill:'forwards'});
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{
        if(done) return;
        done=true;
        resolve();
      };
      anim.addEventListener('finish',finish,{once:true});
      anim.addEventListener('cancel',finish,{once:true});
      setTimeout(finish,scaledDuration+60);
    });
  };
  return (async()=>{
    try{
      if(typeof onImpactPause==='function'){
        await runSegment([
          {transform:'translate(0,0) rotate(0deg)'},
          {transform:atStop},
        ],opt.firstDuration||260);
        const pauseResult=await onImpactPause();
        // グレムリンやギガンテス等、一時停止中にステータス変化を行う効果がある場合、
        // 攻撃を再開する前に背景側の実スロット全体も最新値へ同期する。
        if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
        const cloneAtkEl=clone.querySelector('.slot-stats .a');
        if(cloneAtkEl) cloneAtkEl.textContent=Math.max(0,attacker.atk||0);
        const cloneHpEl=clone.querySelector('.slot-stats .h');
        if(cloneHpEl) cloneHpEl.textContent=Math.max(0,attacker.hp||0);
        const cloneLifeFill=clone.querySelector('.slot-life-fill');
        if(cloneLifeFill){
          const cloneMaxHp=Math.max(1,Number(attacker.maxHp)||Number(attacker.hp)||1);
          cloneLifeFill.style.width=`${Math.max(0,Math.min(1,(attacker.hp||0)/cloneMaxHp))*100}%`;
        }
        if(pauseResult&&pauseResult.abort){
          await runSegment([
            {transform:atStop},
            {transform:'translate(0,0) rotate(0deg)'},
          ],opt.returnDuration||420);
          return;
        }
        await runSegment([
          {transform:atStop},
          {transform:atHit},
        ],opt.secondDuration||360);
      } else {
        await runSegment([
          {transform:'translate(0,0) rotate(0deg)'},
          {transform:atHit},
        ],opt.firstDuration||420);
      }
      await runSegment([
        {transform:atHit},
        {transform:'translate(0,0) rotate(0deg)'},
      ],opt.returnDuration||480);
    } finally {
      cleanup();
    }
  })();
}

function playAttackMotion(attacker,target,isEnemySide){
  return _playAttackMotionCore(attacker,target,isEnemySide,null,{
    firstDuration:320,
    returnDuration:340,
  });
}

function playArassusAttackMotion(attacker,target,isEnemySide,onStop){
  return _playAttackMotionCore(attacker,target,isEnemySide,onStop,{
    stopRatio:.25,
    firstDuration:260,
    secondDuration:360,
    returnDuration:420,
  });
}

function renderAll(){
  // 戦闘中（player/enemyフェイズ）はログ表示（枠・見出し含む）を隠す
  document.body.classList.toggle('battle-turn-active',G.phase==='player'||G.phase==='enemy');
  renderField('f-ally',  G.allies,  false);
  renderField('f-enemy', G.enemies, true);
  renderHand();
  renderManaHud();
  renderControls();
  renderEnemyHand();
  updateHUD();
  requestAnimationFrame(fitCardDescs);
}

function renderManaHud(){
  let hud=document.getElementById('mana-hud');
  if(!hud){
    hud=document.createElement('div');
    hud.id='mana-hud';
    document.body.appendChild(hud);
  }
  const show=G&&G.phase&&G.phase!=='reward'&&G.phase!=='gameover';
  hud.style.display=show?'grid':'none';
  if(!show) return;
  const n=Math.max(0,Number(G.mana)||0);
  const path=typeof _manaOrbPath==='function'?_manaOrbPath():'';
  hud.innerHTML=`<div class="mana-row">${path?`<img class="mana-icon" src="${path}" alt="マナ">`:''}<b>${n}</b></div>`;
  const clip=_battleBackgroundFrameRect();
  const padX=3840*.047*(clip.scale||1);
  const padY=2160*.06*(clip.scale||1);
  const rowWidth=Math.max(74*(clip.scale||1),hud.getBoundingClientRect().width||0);
  hud.style.position='fixed';
  hud.style.left=`${clip.left+clip.width-rowWidth-padX}px`;
  hud.style.right='auto';
  hud.style.top=`${clip.top+padY}px`;
}

// キーワードバッジで表示済みの文字列をdesc先頭から除去
function _stripKeywordsFromDesc(desc, unit){
  if(!desc) return desc;
  const patterns=[
    ...(unit.keywords||[]),
    '2回攻撃','トリプル','3段攻撃','2段攻撃',
  ];
  let result=desc;
  let changed=true;
  while(changed){
    changed=false;
    for(const kw of patterns){
      // 数字部分は桁数の異なる値にも一致するよう\d+化してマッチ
      const esc=kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\d+/g,'\\d+');
      const re=new RegExp('^'+esc+'[\\s\u3000。、]*');
      const next=result.replace(re,'').trimStart();
      if(next!==result){ result=next; changed=true; break; }
    }
  }
  return result.trim();
}

function _stripBattleParentheticalText(text){
  if(!text) return text;
  return String(text)
    .replace(/（[^）]*）/g,'')
    .replace(/[ \t]*\n[ \t]*/g,'\n')
    .replace(/\n{2,}/g,'\n')
    .trim();
}

function _stripOwnNameFromEffectText(text, name){
  let out=String(text||'').trim();
  const n=String(name||'').trim();
  if(!out||!n) return out;
  const esc=n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(let i=0;i<4;i++){
    const next=out.replace(new RegExp(`(?:[\\s　、,，。:：\\-]|<br\\s*/?>)*(?:「|『|【)?${esc}(?:」|』|】)?(?:[\\s　、,，。:：\\-]|<br\\s*/?>)*$`,'i'),'').trim();
    if(next===out) break;
    out=next;
  }
  return out;
}

const _ENCHANT_KEYWORD_ONLY=new Set(['毒','毒牙','邪眼','衝撃','強靭','復活','根性','二段攻撃','三段攻撃','三方向攻撃','全体攻撃','生贄','即死','先制','狙撃','隠密','加護','貫通','結界','生命吸収','封印']);
function _enchantKeywordDesc(k){
  const s=String(k||'').trim();
  if(!s) return '';
  if(_ENCHANT_KEYWORD_ONLY.has(s)) return s;
  if(/^結界\d+$/.test(s)) return s;
  if(/^封印\d+$/.test(s)) return s;
  if(s==='生贄') return '効果なし';
  if(/^毒牙\d+$/.test(s)){
    const v=s.replace('毒牙','');
    return `キャラクターにダメージを与えた時、そのキャラクターに毒${v}を与える。`;
  }
  if(/^毒\d+$/.test(s)){
    const v=s.replace('毒','');
    return `キャラクターにダメージを与えた時、そのキャラクターに毒${v}を与える。`;
  }
  if(s==='内なる大力') return '常時：+2/+1を得る。';
  if(s==='大いなる守護') return '常時：HP+7を得る。';
  if(s==='逆襲') return '常時：このキャラクターの死亡効果は1回追加で発動する。';
  if(s==='闇の儀式') return '死亡：リーダーは+1/+1を得る。';
  if(s==='執念の炎') return '常時：このキャラクターの負傷効果は1回追加で発動する。';
  if(s==='闇の炎') return '死亡：全ての敵キャラクターに1ダメージを与える。';
  if(s==='竜の契約') return '常時：5回負傷した時、25/40のドラコニアンに変身する。';
  if(s==='治癒能力') return '負傷：HP+2を得る。';
  if(s==='狂気') return '死亡：1マナを得る。';
  if(s==='野生の力') return '開戦：2マナを得る。';
  if(s==='マナ生成') return '攻撃：1マナを得る。';
  if(s==='生命吸収') return 'このキャラクターが与えたダメージ分、HPを増加する。';
  if(/^邪眼\d+$/.test(s)) return s;
  if(/^衝撃(\d+)$/.test(s)) return `攻撃/ダメージ効果で対象に弱体${s.replace('衝撃','')}を付与する。`;
  return s;
}
function _enchantEffectTextForPanel(p){
  if(!p) return '';
  if(p.manaOnAttack) return `攻撃：${Math.max(1,Number(p.manaOnAttack)||1)}マナを得る。`;
  if(p.adjacentAtkBonus||p.adjacentHpBonus){
    const a=p.adjacentAtkBonus||0, h=p.adjacentHpBonus||0;
    return `常時：${a&&h?`+${a}/+${h}`:a?`ATK+${a}`:`HP+${h}`}を得る。`;
  }
  // 自分自身の名前を自己参照キーワードとして持つ場合（狂気・闇の炎等）は、
  // _enchantKeywordDesc()の汎用（かつシート更新に追従しない恐れのある）ハードコード文言ではなく、
  // シート上の本文（authoritative）をそのまま使う
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.includes(p.name)&&(p.desc||p.effectText||p.effect)){
    return _stripOwnNameFromEffectText(p.desc||p.effectText||p.effect,p.name);
  }
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.length){
    // 付与するキーワードが全て単純キーワード（_ENCHANT_KEYWORD_ONLY）の場合は、
    // 既にキャラクター側の太字キーワード欄に表示されるため、効果文としては重複表示しない
    if(p.adjacentKeywords.every(k=>_ENCHANT_KEYWORD_ONLY.has(String(k||'').trim()))) return '';
    return p.adjacentKeywords.map(_enchantKeywordDesc).filter(Boolean).join('\n');
  }
  return _plainEffectTextForPreview(p)||'';
}
// unitに現在効果を及ぼしている強化(エンチャント)パネルの一覧と、その全文効果テキストを返す（カード名は含めない）
// slotIdx：効果を受ける側のスロット番号（キャラクター本体は0、他の枠に召喚キャラクターパネルが
// 置かれている場合はそのパネル自身の番号を渡すことで、その位置に隣接する強化パネルを判定できる）
function _enchantmentEffectsList(unit,slotIdx){
  if(!unit) return [];
  slotIdx=slotIdx||0;
  const eq=Array.isArray(unit.equipment)?unit.equipment:[];
  const panels=typeof _collectEnhancementPanelsForSlot==='function'
    ?_collectEnhancementPanelsForSlot(unit,slotIdx)
    :eq.map((panel,idx)=>({panel,idx}));
  const results=[];
  panels.forEach(({panel:p,idx})=>{
    if(!p||idx===slotIdx||!(String(p.category||'')==='強化'||String(p.category||'')==='エンチャント')) return;
    if(typeof _collectEnhancementPanelsForSlot!=='function'){
      if(typeof _isAdjacentPanelSlot==='function'&&!_isAdjacentPanelSlot(slotIdx,idx)) return;
      const dir=typeof _directionFromPanelToSlot==='function'?_directionFromPanelToSlot(idx,slotIdx):'';
      if(typeof _panelAllowsDirection==='function'&&!_panelAllowsDirection(p,dir)) return;
    }
    const rawKws=(p.adjacentKeywords||[]).map(k=>String(k||'').trim()).filter(Boolean);
    const baseKws=rawKws.map(k=>k.replace(/\d+.*/,'').trim());
    let text;
    if(rawKws.length&&baseKws.every(k=>_ENCHANT_KEYWORD_ONLY.has(k))){
      // 単純キーワード（生命吸収・二段攻撃・毒牙2等、数値の有無を問わない）は、キャラクター側の
      // 太字キーワード欄に既に表示されるため、効果文としては重複表示しない
      text='';
    } else {
      text=_enchantEffectTextForPanel(p);
    }
    // 「効果なし」の強化パネル（方向接続専用パネル等）はキャラクター側に何も表示しない
    if(text&&/効果なし/.test(text)) text='';
    // ここでアイコン化すると、data-preview経由でホバー表示する際に_formatPreviewHtmlの
    // タグ除去処理に巻き込まれて色情報が消えるため、生テキストのまま格納する
    // （アイコン化は各利用箇所の描画直前で行う）
    if(text) results.push({panel:p,idx,text});
  });
  return results;
}
// 接続中の強化カード効果を「通常表示分」と「キャラクター用説明文（同名複数接続は×N・数値N倍）」に分けて
// プレーンテキストの行配列として返す。HTML表示（_unitCombinedDescHtml）とツールチップ表示
// （_unitPreviewText）の両方から共通して使う。
function _groupedEnchantEffectTexts(unit,slotIdx){
  const list=_enchantmentEffectsList(unit,slotIdx);
  const normal=list.filter(e=>!(e.panel&&e.panel.characterDesc));
  const charDescMap=new Map();
  list.filter(e=>e.panel&&e.panel.characterDesc).forEach(e=>{
    const key=`${e.panel.name}::${e.panel.characterDesc}`;
    if(!charDescMap.has(key)) charDescMap.set(key,{name:e.panel.name,text:e.panel.characterDesc,count:0});
    charDescMap.get(key).count++;
  });
  const scaleNumbers=(text,count)=>String(text||'').replace(/\d+/g,n=>String((parseInt(n,10)||0)*count));
  const originBaseDesc=unit&&typeof _rawSubstitutedDesc==='function'?_rawSubstitutedDesc(unit):'';
  const normalTexts=normal.map(e=>{
    if(e.panel&&e.panel.name==='起源の種'&&originBaseDesc) return originBaseDesc;
    return e.text;
  });
  // 「キャラクター用説明文」列には既に「カード名」が本文の一部として書かれているため、
  // ここで別途ラベルを前置すると「カード名」が二重表示されてしまう。
  // 2枚以上接続時の（×N）は、本文中の既存の「カード名」表記の直後に挿入する。
  const charTexts=[...charDescMap.values()].map(g=>{
    const scaled=scaleNumbers(g.text,g.count);
    if(g.count<=1) return scaled;
    const marker=`「${g.name}」`;
    if(scaled.includes(marker)) return scaled.replace(marker,`${marker}（×${g.count}）`);
    return `${marker}（×${g.count}）${scaled}`;
  });
  return {normalTexts,charTexts};
}
// キャラクターカードの説明欄HTML：本来の効果の下に線を引き、その下に強化カードが与えている効果の全文を並べる
function _unitCombinedDescHtml(unit,baseDesc,slotIdx){
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const battleNormalTexts=normalTexts.map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  const battleCharTexts=charTexts.map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  const kws=typeof _unitDisplayKeywords==='function'?_unitDisplayKeywords(unit,baseDesc,slotIdx):[];
  const kwHtml=kws.length?`<div class="slot-desc-keywords"><strong>${kws.map(k=>typeof _escapePreviewHtml==='function'?_escapePreviewHtml(k):k).join(' / ')}</strong></div>`:'';
  const baseSafe=baseDesc&&(typeof _escapePreviewHtml==='function'?_escapePreviewHtml(baseDesc):baseDesc);
  const baseDecorated=baseSafe?(_boldKeywordsInHtml(baseSafe)):'';
  const baseHtml=baseDecorated?`<div class="slot-desc-base">${typeof _injectManaIcons==='function'?_injectManaIcons(baseDecorated):baseDecorated}</div>`:'';
  if(!battleNormalTexts.length&&!battleCharTexts.length) return (kwHtml||baseHtml)?`<div class="slot-desc">${kwHtml}${baseHtml}</div>`:'';
  const toLineHtml=line=>{
    const safe=typeof _escapePreviewHtml==='function'?_escapePreviewHtml(line):line;
    const decorated=_boldKeywordsInHtml(safe);
    return `<div class="slot-desc-enchant-line">${typeof _injectManaIcons==='function'?_injectManaIcons(decorated):decorated}</div>`;
  };
  const effectsHtml=battleNormalTexts.map(toLineHtml).join('');
  const charHtml=battleCharTexts.map(toLineHtml).join('');
  return `<div class="slot-desc">${kwHtml}${baseHtml}${effectsHtml?`<div class="slot-desc-sep"></div><div class="slot-desc-enchant">${effectsHtml}</div>`:''}${charHtml?`<div class="slot-desc-sep"></div><div class="slot-desc-enchant">${charHtml}</div>`:''}</div>`;
}
// キャラクターカードにホバーした時、効果を及ぼしている強化カード（装備欄側の表示）を青く発光させる
// slotIdx：ホバーしたカード自身のスロット番号（キャラクター本体は0、装備欄内の召喚キャラクターパネルはその番号）
function _wireEnchantGlowHover(hitLayer,unit,unitIdx,slotIdx){
  if(!hitLayer||!unit) return;
  slotIdx=slotIdx||0;
  hitLayer.addEventListener('mouseenter',()=>{
    if(unitIdx!==G._selectedEquipUnitIdx) return;
    const list=typeof _collectEnhancementPanelsForSlot==='function'
      ?_collectEnhancementPanelsForSlot(unit,slotIdx).filter(({panel:p,idx})=>
        p&&idx!==slotIdx&&(String(p.category||'')==='強化'||String(p.category||'')==='エンチャント'))
      :_enchantmentEffectsList(unit,slotIdx);
    if(!list.length) return;
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    list.forEach(({idx})=>{
      const card=handSlots.querySelector(`[data-equip-idx="${idx}"]`);
      if(card) card.classList.add('glow-blue');
    });
  });
  hitLayer.addEventListener('mouseleave',()=>{
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    handSlots.querySelectorAll('.glow-blue').forEach(c=>c.classList.remove('glow-blue'));
  });
}
// スロット番号に対応する装備欄カードのDOM要素を取得
function _equipSlotEl(handSlots,slotIdx){
  if(!handSlots) return null;
  return handSlots.querySelector(`[data-equip-idx="${slotIdx}"]`);
}
function _connectedPanelHoverIndicesUntilCharacter(unit,startIdx){
  if(typeof _connectedBoardFlashIndices==='function') return new Set(_connectedBoardFlashIndices(unit,startIdx));
  return new Set([startIdx]);
}
// 強化カード自体にホバーした時：自身は白発光（既存の:hoverと同じ）、
// それと効果が繋がっている強化カード・キャラクターカード（本体または装備欄内の召喚キャラクターパネル）を青く発光させる
function _wireEnchantSelfHover(cardDiv,unit,enchantIdx){
  if(!cardDiv||!unit) return;
  cardDiv.addEventListener('mouseenter',()=>{
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    const eq=Array.isArray(unit.equipment)?unit.equipment:[];
    const affected=new Set();
    const connected=new Set();
    const passable=_connectedPanelHoverIndicesUntilCharacter(unit,enchantIdx);
    eq.forEach((panel,idx)=>{
      if(idx===enchantIdx) return;
      const isCharTarget=panel&&String(panel.category||'')==='キャラクター';
      if(!isCharTarget) return;
      if(!passable.has(idx)) return;
      const contrib=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(unit,idx):[];
      if(contrib.some(c=>c.idx===enchantIdx)){
        affected.add(idx);
        contrib.forEach(c=>{ if(c.idx!==enchantIdx&&passable.has(c.idx)) connected.add(c.idx); });
      }
    });
    affected.forEach(idx=>{ const el=_equipSlotEl(handSlots,idx); if(el) el.classList.add('glow-blue'); });
    connected.forEach(idx=>{ const el=_equipSlotEl(handSlots,idx); if(el) el.classList.add('glow-blue'); });
  });
  cardDiv.addEventListener('mouseleave',()=>{
    const handSlots=document.getElementById('hand-slots');
    if(!handSlots) return;
    handSlots.querySelectorAll('.glow-blue').forEach(c=>c.classList.remove('glow-blue'));
  });
}
// シート「キーワード」列に実在しない、内部の効果判定専用の自己参照名（強化カード名がそのまま
// 内部keywordとして使われるもの）。UI上はこれらを「キーワード」として表示しない。
const _INTERNAL_ONLY_ENCHANT_NAMES=new Set([
  '逆襲','闇の儀式','執念の炎','闇の炎','狂気','野生の力','治癒能力',
  '逆上','剣技','怨念','錬成','起源の種','竜の契約','恩寵','マナ生成'
]);
// UI上に表示すべきキーワード一覧を算出する（強化パネル由来で既に効果文に出ているものや、
// 内部集計専用のショートハンドは除外）。_unitPreviewText（ツールチップ）と
// _unitCombinedDescHtml（カード常時表示）の両方で同じ一覧を使うための共通ヘルパー。
function _unitDisplayKeywords(unit, desc, slotIdx){
  if(!unit) return [];
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const panelEffects=[...normalTexts,...charTexts].map(t=>_stripBattleParentheticalText(t)).filter(Boolean);
  // シート上「キーワード」欄に単独で載っているキーワード（_ENCHANT_KEYWORD_ONLY）以外は、
  // 説明文や効果全文の中に同じ文字列がそのまま含まれていれば、そちらの文脈で既に表示されるため
  // キーワード欄には重複して出さない（例：ゾンビの説明文が「死亡：青強化」の場合、
  // キーワード「青強化」は単独表示せず「死亡：青強化」の行にのみ表示する）。
  // ただし_ENCHANT_KEYWORD_ONLY（二段攻撃・シールド等、効果文を持たない単純キーワード付与パネル）は
  // 接続元パネルの効果文に現れない（本文が空のため）ので、常にキーワード欄に表示する。
  // desc/panelEffectsはマナアイコンが<img alt="色">に変換済みのHTMLの場合があるため、
  // 文字列比較の前にアイコンを元の色文字に戻し、タグを除去しておく
  const _stripIconsForMatch=s=>String(s||'').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const fullText=_stripIconsForMatch(`${desc||''} ${panelEffects.join(' ')}`);
  // loader.jsのシート同期時にdescから内部集計用に自動生成されるショートハンド（battle.jsのcount()判定専用で、
  // desc文と文字列としては一致しないため通常の重複除外に引っかからない）はUI上には表示しない
  const _isInternalOnlyKeyword=k=>/^[赤青緑黄紫茶]全体強化\d*(_\d+)?$/.test(k)||_INTERNAL_ONLY_ENCHANT_NAMES.has(k);
  const dynamicKws=[];
  if(unit.shield>0) dynamicKws.push(`結界${unit.shield}`);
  // unit.shieldは既に結界を持つ全ての発生源（強化パネル接続・キャラクター効果付与等）を合算した
  // 最終値のため、unit.keywords側に残る「結界」「結界N」は表示上ここで除外し、dynamicKwsの
  // 1エントリだけを正とする（両方を残すと_mergeCountedKeywordsで合算され「結界2」等に二重計上される）。
  const normalizedKws=[...(unit.keywords||[]).filter(k=>!/^結界\d*$/.test(String(k||'').trim())),...dynamicKws]
    .map(k=>String(k||'').replace(/^毒(\d+)$/,'毒牙$1'))
    .filter(k=>k&&!_isInternalOnlyKeyword(k));
  // 邪眼X・毒牙X等、末尾に数値を持つキーワードは複数所持時にXを合算した1つの表示にまとめる
  const mergedKws=typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords(normalizedKws):[...new Set(normalizedKws)];
  const filtered=mergedKws.filter(k=>{
    if(!_ENCHANT_KEYWORD_ONLY.has(k.replace(/\d+$/,''))&&fullText.includes(k)) return false;
    return true;
  });
  // 弱体X（弱体化Xにより付与された状態）はunit.keywordsではなくunit.weaken（数値、加算式）で
  // 管理しているため、ここで表示用の擬似キーワードとして先頭に合成する
  const weakenList=unit.weaken>0?[`弱体${unit.weaken}`]:[];
  return [...weakenList,...filtered];
}
function _unitPreviewText(unit, desc, slotIdx){
  if(!unit) return desc||'';
  const lines=[];
  if(unit.name) lines.push(unit.name);
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const panelEffects=[...normalTexts,...charTexts];
  const _stripIconsForMatch=s=>String(s||'').replace(/<img[^>]*alt="([^"]*)"[^>]*>/g,'$1').replace(/<[^>]*>/g,'');
  const kws=_unitDisplayKeywords(unit,desc,slotIdx);
  // 「キーワード：」というラベルは表示せず、キーワードそのものを太字で並べる
  // （_formatPreviewHtmlがこのマーカー行を検出してラベルなし・太字表示に変換する）
  if(kws.length) lines.push(`キーワード：${kws.join(' / ')}`);
  // 戦闘実行後に付与された状態異常（毒など）は静的なdesc/keywordsには含まれないため、
  // 現在値をここで都度追記しないとホバー説明文に反映されない
  if(unit.poison>0) lines.push(`状態異常：毒${unit.poison}`);
  if(unit.shield>0) lines.push(`状態：結界${unit.shield}`);
  // descが単純にキーワード名の羅列（例：「先制　シールド」「根性」）で、既にキーワード欄と内容が
  // 重複している場合は二重表示しない
  const descTokens=_stripIconsForMatch(desc).split(/[\s　]+/).filter(Boolean);
  const descIsRedundant=descTokens.length>0&&descTokens.every(t=>(unit.keywords||[]).some(k=>String(k||'')===t));
  // descはcomputeDesc()経由でマナアイコンが注入済みの場合があるため、data-preview行としては
  // 生の色文字に戻して格納する（ホバー時に_formatPreviewHtmlが改めてアイコン化するため）
  if(desc&&!descIsRedundant) lines.push(_stripIconsForMatch(desc));
  if(panelEffects.length) lines.push(panelEffects.join('\n'));
  return lines.join('\n');
}

function renderField(id,units,isEnemy,_lane){
  const el=document.getElementById(id);
  el.innerHTML='';
  // 優先ターゲットのインデックスを特定（グループ全体をハイライト）
  // _isObject のユニットは攻撃対象外なので除外
  const liveUnits=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&!x.u._isObject);
  const prioritySet=new Set();
  if(isEnemy){
    // allyTarget 強制指定 → 前衛（lane==='front' or hate）→ 全生存敵
    const forced=liveUnits.filter(x=>x.u.allyTarget);
    if(forced.length){
      forced.forEach(x=>prioritySet.add(x.i));
    } else {
      const front=liveUnits.filter(x=>(x.u.lane==='front'||(x.u.hate&&x.u.hateTurns>0))&&!x.u.stealth);
      (front.length?front:liveUnits).forEach(x=>prioritySet.add(x.i));
    }
  } else {
    // hate（前衛・タウント）→ 全生存味方（getAttackTargetと同じロジック）
    const hated=liveUnits.filter(x=>x.u.hate&&x.u.hateTurns>0&&!x.u.stealth);
    (hated.length?hated:liveUnits.filter(x=>!x.u.stealth)).forEach(x=>prioritySet.add(x.i));
  }
  const _isRearUnit=x=>x.u&&x.u.hp>0&&(x.u.lane||'front')==='rear';
  const _rearIndexes=units.map((u,i)=>({u,i})).filter(_isRearUnit).map(x=>x.i);
  const _frontIndexes=units.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&!_isRearUnit(x)).map(x=>x.i);
  const renderIndexes=isEnemy
    ?Array.from({length:MAX_ENEMIES||10},(_,idx)=>idx)
    :Array.from({length:MAX_ALLIES||10},(_,idx)=>idx);
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  el.style.setProperty('grid-template-columns',`repeat(${frontSlots},var(--unit-card-w))`,'important');
  el.style.setProperty('justify-content','center','important');
  const _fieldW=`calc(var(--unit-card-w) * ${frontSlots} + var(--unit-field-gap) * ${frontSlots-1})`;
  const _unitX=(count,pos)=>`calc((${_fieldW} - var(--unit-card-w)) / 2 + (${pos} - (${count} - 1) / 2) * (var(--unit-card-w) + var(--unit-field-gap)))`;
  const _rearLeft=new Map(_rearIndexes.map((idx,pos)=>[idx,_unitX(_rearIndexes.length,pos)]));
  const _frontLeft=new Map(_frontIndexes.map((idx,pos)=>[idx,_unitX(_frontIndexes.length,pos)]));
  for(const i of renderIndexes){
    const rawU=units[i];
    const u=rawU;
    const slot=document.createElement('div');
    slot.className='slot'+(isEnemy?' enemy':'');
    slot.dataset.unitIdx=i;
    slot.style.setProperty('width','var(--unit-card-w)','important');
    slot.style.setProperty('min-width','var(--unit-card-w)','important');
    slot.style.setProperty('max-width','var(--unit-card-w)','important');
    slot.style.setProperty('height','var(--unit-card-h)','important');
    slot.style.setProperty('min-height','var(--unit-card-h)','important');
    slot.style.setProperty('max-height','var(--unit-card-h)','important');
    slot.style.setProperty('aspect-ratio','450 / 605','important');
    slot.style.setProperty('flex','0 0 var(--unit-card-w)','important');
    slot.style.setProperty('pointer-events','auto','important');
    // 敵スロットのレーン：生存敵はu.lane、死亡/空スロットはmoveMaskLanesで補完
    const _slotLane=isEnemy?(u&&u.hp>0?(u.lane||(i>=frontSlots?'rear':'front')):(G.moveMaskLanes?.[i]||(i>=frontSlots?'rear':'front'))):(u&&u.hp>0?(u.lane||'front'):(i>=frontSlots?'rear':'front'));
    if(!u||u.hp<=0){
      slot.style.gridRow=_slotLane==='rear'?'1':'2';
      slot.style.gridColumn=String((i%frontSlots)+1);
      // #f-enemy/#f-ally は display:block で運用されておりgrid-row/columnは効かないため、
      // 空き/死亡スロットも生存ユニットと同様に絶対座標で位置指定する
      // （さもないと全ての空きスロットが同じ位置に重なり、特定スロットのホバー判定を塞いでしまう）
      slot.style.left=_unitX(frontSlots,i%frontSlots);
      const _emptyRearTop=isEnemy?'0':'calc(var(--unit-card-h) + var(--unit-field-gap))';
      const _emptyFrontTop=isEnemy?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0';
      slot.style.top=_slotLane==='rear'?_emptyRearTop:_emptyFrontTop;
      slot.style.setProperty('position','absolute','important');
      slot.style.setProperty('transform','none','important');
      // 生存数が7体未満だと生存ユニットは中央寄せで再配置されるため、空きスロットの位置と
      // 重なることがある。重なった場合でも必ず生存ユニット側のhit-layerが優先されるよう、
      // 空きスロットは常に低いz-indexにしておく
      slot.style.setProperty('z-index','1','important');
    }
    if(u&&u.hp>0){
      const _row=_slotLane==='rear'?1:2;
      slot.style.gridRow=String(_row);
      slot.style.gridColumn='1';
      slot.style.left=(_slotLane==='rear'?_rearLeft.get(i):_frontLeft.get(i))||`calc((var(--unit-card-w) + var(--unit-field-gap)) * ${(i%frontSlots)})`;
      // 前衛は敵に近い側（画面中央寄り）、後衛は画面外側（味方側は下端、敵側は上端）に表示する。
      // 敵は画面上部・味方は画面下部に配置されるため、両者の前衛同士が画面中央で向き合う形になる。
      const _rearTop=isEnemy?'0':'calc(var(--unit-card-h) + var(--unit-field-gap))';
      const _frontTop=isEnemy?'calc(var(--unit-card-h) + var(--unit-field-gap))':'0';
      slot.style.top=_slotLane==='rear'?_rearTop:_frontTop;
      slot.style.setProperty('position','absolute','important');
      slot.style.setProperty('transform','none','important');
    }
    if(isEnemy&&_slotLane==='rear') slot.classList.add('is-rear');
    if(isEnemy&&_slotLane!=='rear') slot.classList.add('is-front');
    if(u&&u._motionHidden){ slot.classList.add('motion-hidden'); slot.style.visibility='hidden'; }
    const _isPlayerHero=!!(u&&!isEnemy&&!u._panelSummoned);
    const _hasGuardPanel=u&&!_isPlayerHero&&((isEnemy||u._panelSummoned)&&u.guardian);
    if(u&&u.hp>0&&_hasGuardPanel) slot.classList.add('is-defender','uses-hate-frame');
    if(u&&u.hp>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('is-defender');
    if(u&&u.hp>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('uses-hate-frame');
    if(_isPlayerHero) slot.classList.remove('is-defender','uses-hate-frame');
    if(u&&(!isEnemy||u.hp>0)){
      slot.classList.add('unit-card');
      if(u.name==='石像') slot.classList.add('no-unit-shadow');
      if(u._sealed){
        slot.classList.add('sealed-unit');
        slot.style.filter='';
      } else {
        slot.style.filter='';
      }
      if(u.hp<=0) slot.classList.add('dead-unit','inert');
      if(!isEnemy&&G._selectedEquipUnitIdx===i) slot.classList.add('selected');
      if(typeof applyUnitVisual==='function') applyUnitVisual(slot,u);
      if(_isPlayerHero){
        slot.classList.remove('is-defender','uses-hate-frame');
        if(typeof assetUrl==='function'&&typeof Assets!=='undefined'&&Assets.cards?.characterFrame){
          slot.style.setProperty('--unit-frame',assetUrl(Assets.cards.characterFrame));
        }
      }
      if(isEnemy&&typeof getSheetRaceByName==='function'){
        const _sheetRace=getSheetRaceByName(u.name);
        if(_sheetRace) u.race=_sheetRace;
      }
      // ライブユニットは常にユニットとして描画する（moveMask は死亡スロットにのみ表示）
      {
        // ── ステータスバッジ（右上固定：状態異常のみ）──
        const bs=[];
        const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';};
        // 標的バッジは非表示（is-front の視覚的シフトで代用）
        if(u.guardian) bs.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield"${_sd('結界')}>結界${u.shield}</span>`);
        if(u.instadead) bs.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${u.poison}</span>`);
        if(u.stealth) bs.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
        if(u.allyTarget) bs.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        // ── キーワードブロック（パワー/ライフとテキストの中間・中央揃え）──
        // エリート/ボスは他キーワードの1行上。
        const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','毒':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','三方向攻撃':'#e04040','貫通':'#e08040','狩人':'#d08040','狙撃':'#d08040','結束':'#80d0d0','邪眼':'#c060c0','弱体':'#c08040','衝撃':'#c08040','強靭':'#60c090','結界':'#60a0e0','隠密':'#8080c0','アーティファクト':'#b0a080'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};font-weight:bold;cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
        // 弱体X（弱体化Xにより付与された状態）はunit.weaken（数値、加算式）で管理しているため、
        // バッジ表示用の擬似キーワードとして合成する
        const _dynKws=u.shield>0?[`結界${u.shield}`]:[];
        const _allKws=[...(u.weaken>0?[`弱体${u.weaken}`]:[]),...(typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords([...(u.keywords||[]),..._dynKws]):[...new Set([...(u.keywords||[]),..._dynKws])])].filter(k=>!_INTERNAL_ONLY_ENCHANT_NAMES.has(k));
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:1px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
        const gradeTag='';
        const _rawDesc=u.desc?_stripBattleParentheticalText(_rawSubstitutedDesc(u)):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const descTag=_unitCombinedDescHtml(u,_desc);
        // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
        // 既にアイコン化済みの_desc（<img alt="マナ">を含む）ではなくプレーンテキストを渡す
        // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
        const _plainDesc=u.desc?_stripKeywordsFromDesc(_stripBattleParentheticalText(_rawSubstitutedDesc(u)),u):'';
        const _preview=_unitPreviewText(u,_plainDesc);
        if(_preview) slot.setAttribute('data-preview',_preview);
        const _hpClass=(u.maxHp!=null&&u.hp<u.maxHp)?'h hp-damaged':'h';
        const _hpMax=Math.max(1,u.maxHp||u.hp||1);
        const _hpPct=Math.max(0,Math.min(100,Math.round((Math.max(0,u.hp||0)/_hpMax)*100)));
        const hpBar=`<div class="slot-life-bar" title="ライフ ${Math.max(0,u.hp||0)}/${_hpMax}"><div class="slot-life-fill" style="width:${_hpPct}%"></div></div>`;
        const raceTag='';
        // 情報ブロック：絶対配置でカード全体に広げ中央固定
        // 下部セクション：kwBlock・desc をHPバー直上に絶対配置
        const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
        const _btmStyle='position:absolute;bottom:6px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0;z-index:1;pointer-events:auto';
        slot.style.borderTop='2px solid var(--teal2)';
        if(u.shield>0) slot.classList.add('shield-active'); else slot.classList.remove('shield-active');
        // .unit-portraitの子として配置することで、attack-motion-clone生成時にportrait用のCSS変数
        // (--new-card-art-left等)がそのまま効き、独立した%指定を並行して持つことによるズレ・変形を防ぐ
        const shieldLayer=u.shield>0?'<div class="unit-shield-layer"></div>':'';
        const manaOrbHtml=typeof cardManaCostHtml==='function'?cardManaCostHtml(u):'';
        const sealCostHtml=typeof cardSealCostHtml==='function'?cardSealCostHtml(u):'';
        if(isEnemy){
          slot.innerHTML=`${manaOrbHtml}${sealCostHtml}${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        } else {
          slot.innerHTML=`${manaOrbHtml}${sealCostHtml}${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        }
        if(typeof _applyManaOrbState==='function') _applyManaOrbState(slot,u);
        const hitLayer=document.createElement('div');
        hitLayer.className='unit-hit-layer';
        if(_preview) hitLayer.setAttribute('data-preview',_preview);
        slot.appendChild(hitLayer);
        slot._hitLayer=hitLayer;
        if(!isEnemy&&typeof _wireEnchantGlowHover==='function') _wireEnchantGlowHover(hitLayer,u,i);
      }
      if(u&&!isEnemy){
        const battleScreenActive=!!document.getElementById('scr-battle')?.classList.contains('active');
        const canMoveUnit=!isEnemy&&(G.phase==='reward'||G.phase==='player'||(battleScreenActive&&G.phase!=='enemy'));
        slot.draggable=canMoveUnit;
        slot.addEventListener('dragstart',e=>{
          if(!canMoveUnit) { e.preventDefault(); return; }
          window._allySlotDragSrc=i;
          e.dataTransfer.effectAllowed='move';
          if(typeof _transparentDragImg!=='undefined') e.dataTransfer.setDragImage(_transparentDragImg,0,0);
          slot.classList.add('dragging');
          if(typeof _createDragGhost==='function') _createDragGhost(slot);
          if(typeof _moveDragGhost==='function') _moveDragGhost(e.clientX,e.clientY);
        });
        slot.addEventListener('drag',e=>{ if(typeof _moveDragGhost==='function'&&e.clientX&&e.clientY) _moveDragGhost(e.clientX,e.clientY); });
        slot.addEventListener('dragend',()=>{ window._allySlotDragSrc=null; slot.classList.remove('dragging'); if(typeof _removeDragGhost==='function') _removeDragGhost(); });
        slot.addEventListener('dragover',e=>{
          if(!canMoveUnit||window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(!canMoveUnit) return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            const frontSlots=ENEMY_FRONT_SLOTS||7;
            if((src>=frontSlots)!==(i>=frontSlots)){
              log('前衛と後衛の間では移動できません','bad');
              window._allySlotDragSrc=null;
              renderAll();
              return;
            }
            const tmp=G.allies[src];
            G.allies[src]=G.allies[i];
            G.allies[i]=tmp;
            if(G.allies[i]) G.allies[i].lane=i>=frontSlots?'rear':'front';
            if(G.allies[src]) G.allies[src].lane=src>=frontSlots?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
        slot.onclick=()=>{
          if(G.phase==='player') return;
          if(G._selectedEquipUnitIdx!==i) G._selectedEquipCardIdx=null;
          G._selectedEquipUnitIdx=i;
          G._showGlobalPanels=false;
          renderAll();
          if(typeof renderHandEditor==='function') renderHandEditor();
        };
        if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
      }
      if(u&&isEnemy&&u.hp>0&&G.phase==='player'){
        slot.onclick=()=>{
          const unitIdx=G._selectedEquipUnitIdx;
          const equipIdx=G._selectedEquipCardIdx;
          const ally=G.allies&&G.allies[unitIdx];
          const card=ally&&ally.equipment&&ally.equipment[equipIdx];
          if(!ally||ally.hp<=0||equipIdx==null||equipIdx<0||!card) return;
          if(card.fixedAttack&&typeof useFixedEquipOnEnemy==='function'){
            useFixedEquipOnEnemy(unitIdx,equipIdx,i);
            return;
          }
          if(!card.fixedEquip&&typeof useDraggedSpellOnTarget==='function'){
            const prev=G.spells;
            G.spells=ally.equipment;
            G._unitEquipSpellRestore=prev;
            useDraggedSpellOnTarget(equipIdx,'enemy',i);
            if(typeof _restoreUnitEquipSpellSource==='function') _restoreUnitEquipSpellSource();
          }
        };
        if(slot._hitLayer) slot._hitLayer.onclick=slot.onclick;
      }
      if(u&&u.hp>0&&G.phase==='player'&&typeof useDraggedSpellOnTarget==='function'){
        slot.addEventListener('dragover',e=>{
          if(isEnemy&&window._fixedEquipDrag){
            e.preventDefault();
            slot.classList.add('drag-over');
            return;
          }
          const si=window._spellDragIdx;
          if(si==null) return;
          const sp=G.spells&&G.spells[si];
          const who=isEnemy?'enemy':'ally';
          if(!sp) return;
          if((sp.needsEnemy&&who!=='enemy')||(sp.needsAlly&&who!=='ally')) return;
          if(!sp.needsEnemy&&!sp.needsAlly&&!sp.needsAny) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(isEnemy&&window._fixedEquipDrag&&typeof useFixedEquipOnEnemy==='function'){
            e.preventDefault();
            slot.classList.remove('drag-over');
            useFixedEquipOnEnemy(window._fixedEquipDrag.unitIdx, window._fixedEquipDrag.equipIdx, i);
            window._fixedEquipDrag=null;
            return;
          }
          const si=window._spellDragIdx;
          if(si==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          useDraggedSpellOnTarget(si,isEnemy?'enemy':'ally',i);
          window._spellDragIdx=null;
        });
      }
    } else {
      slot.classList.add('empty');
      if(!isEnemy){
        slot.addEventListener('dragover',e=>{
          if(!(G.phase==='reward'||G.phase==='player')) return;
          if(window._allySlotDragSrc==null) return;
          e.preventDefault();
          slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
        slot.addEventListener('drop',e=>{
          if(!(G.phase==='reward'||G.phase==='player')) return;
          const src=window._allySlotDragSrc;
          if(src==null) return;
          e.preventDefault();
          slot.classList.remove('drag-over');
          if(src!==i){
            const frontSlots=ENEMY_FRONT_SLOTS||7;
            if((src>=frontSlots)!==(i>=frontSlots)){
              log('前衛と後衛の間では移動できません','bad');
              window._allySlotDragSrc=null;
              renderAll();
              return;
            }
            G.allies[i]=G.allies[src];
            G.allies[src]=null;
            if(G.allies[i]) G.allies[i].lane=i>=frontSlots?'rear':'front';
            renderAll();
          }
          window._allySlotDragSrc=null;
        });
      }
    }
    el.appendChild(slot);
  }
}

function renderHand(){
  if(typeof renderHandEditor==='function') renderHandEditor();
}

function _circleCost(n){
  const chars=['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];
  return (n>=0&&n<chars.length)?chars[n]:`(${n})`;
}

// ()内の数式を計算する（×÷対応）
function _evalMath(desc){
  return desc.replace(/\(([^)]+)\)/g,(match,inner)=>{
    const expr=inner.replace(/×/g,'*').replace(/÷/g,'/').trim();
    if(/^[\d\s+\-*/.]+$/.test(expr)){
      try{
        // eslint-disable-next-line no-new-func
        const r=Function('"use strict";return ('+expr+')')();
        if(typeof r==='number'&&isFinite(r))
          return Number.isInteger(r)?String(r):r.toFixed(1);
      }catch(e){}
    }
    return match;
  });
}

// カードのdesc要素をコンテナからはみ出さないようフォントサイズを縮小
function fitCardDescs(){
  function fit(el,container){
    el.style.fontSize='';
    let fs=parseFloat(window.getComputedStyle(el).fontSize);
    while(container.scrollHeight>container.clientHeight+1&&fs>6.5){
      fs=Math.max(6.5,fs-0.5);
      el.style.fontSize=fs+'px';
    }
  }
  document.querySelectorAll('.card .card-desc').forEach(el=>{
    const c=el.closest('.card'); if(c) fit(el,c);
  });
  document.querySelectorAll('.rew-card .rew-card-desc').forEach(el=>{
    const c=el.closest('.rew-card'); if(c) fit(el,c);
  });
}

// Grade/X置換のみを適用した、マナアイコン注入前のプレーンテキスト。
// data-preview（ホバー時に_formatPreviewHtmlで改めてアイコン化される）に渡す用途では、
// 既にアイコン化済みのHTMLを渡すと<img alt="マナ">がアイコン数分「マナ」という文字列に
// 逆変換されてしまい「2マナ」が「マナマナ」になるバグの原因になるため、必ずこちらを使う。
function _rawSubstitutedDesc(card){
  if(!card||card.isEnchant) return card&&card.isEnchant?('契約に「'+card.enchantType+'」を付与する'):'';
  const g=card.grade||1;
  let desc=_evalMath((card.desc||'').replace(/Grade/g,String(g)));
  const ownName=String(card.name||'').trim();
  if(ownName){
    desc=_stripOwnNameFromEffectText(desc,ownName);
  }
  if(card.descXEqualsAtk&&card.atk!=null) desc=desc.replace(/X/g,String(card.atk));
  return desc;
}
function computeDesc(card,_mlOverride){
  if(card.isEnchant) return '契約に「'+card.enchantType+'」を付与する';
  let desc=_rawSubstitutedDesc(card);
  // タイミングキーワードを太字化（「開戦：」「終戦：」等）
  desc=desc.replace(/(開戦|終戦|負傷|誘発|攻撃|召喚|常在|常時)：/g,'<strong>$1</strong>：');
  // 説明文中の色名（青・赤・緑・黄）をマナアイコンに置き換える
  desc=_boldKeywordsInHtml(desc);
  if(typeof _injectManaIcons==='function') desc=_injectManaIcons(desc);
  desc=desc.replace(/\n/g,'<br>');
  return desc;
}

function mkCardEl(card,_idx,_ctx,_mlOverride){
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム','global-panel':'全体'};
  const div=document.createElement('div');
  const t=card.type||'ring';
  const _isWandSub=t==='wand'&&card.subtype==='wand';
  const _subtypeClass=_isWandSub?' wand-sub':'';
  div.className=`card ${t}${_subtypeClass}${card.legend?' legend-card':''}`;
  if(card._isChar||(!card.type&&!card.kind)) div.classList.add('character-card');
  if(card.rarity>=1&&card.rarity<=5) div.classList.add(`rarity-${card.rarity}`);
  div.dataset.cardIdx=String(_idx);
  div.dataset.cardCtx=_ctx||'';
  if(typeof applyCardVisual==='function'){
    applyCardVisual(div,card);
  } else if(typeof getCardAsset==='function'&&typeof assetUrl==='function'){
    div.style.setProperty('--card-art',assetUrl(getCardAsset(card)));
  }
  const enc=card.enchants&&card.enchants.length?`<div class="card-enc">${card.enchants.join('・')}</div>`:'';
  const tpLabel=_isWandSub?'短杖':(typeLabel[t]||'指輪');
  const kindLabel='';
  const gradeEl='';
  const manaCostEl=cardManaCostHtml(card);
  const sealCostEl=cardSealCostHtml(card);
  // 価格バッジはショップ（G._isShop）かつ実際に価格が1以上の場合のみ表示する。
  // 無料報酬（_buyPrice===0）ではバッジそのものを作らない（CSSでの後隠しはしない）。
  const showPriceBadge=G.phase==='reward'&&!!G._isShop&&Number(card._buyPrice)>0;
  const badgeEl=showPriceBadge?`<span class="card-badge">${_circleCost(card._buyPrice)}</span>`:'';
  const isPassivePanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('パッシブ');
  const isCombatPowerPanel=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope)&&String(card.category||'').includes('戦闘力');
  const isPanelCard=card&&(card.type==='panel'||card.kind==='panel'||card.panelScope);
  const isPanelCharacter=isPanelCard&&String(card.category||'')==='キャラクター';
  if(isPanelCharacter) div.classList.add('character-card','panel-character-card');
  const isActionPanel=card&&(card.fixedAttack||card.fixedEquip||((card.type==='panel'||card.kind==='panel'||card.panelScope)&&!isPassivePanel&&!isCombatPowerPanel&&card.panelScope!=='global'));
  const charges=(!isPanelCard&&isActionPanel)?(card.cost>0?card.cost:1):null;
  const _chargeColorClass=_isWandSub?' wand-sub':'';
  const chargeLabel=charges!==null?`<div class="card-charge${_chargeColorClass}">${charges}</div>`:'';
  const atkLabel='', hpLabel='';
  const dynDesc=computeDesc(card,_mlOverride);
  let _charPreview='';
  if(div.classList.contains('character-card')){
    // シート「キーワード」列由来のcard.keywordsは、敵ユニット同様に_unitPreviewText()で
    // 「キーワード：〇〇」行として合成する（descが空でもキーワードだけで説明文が成立するようにする）
    // マナアイコン注入済みのdynDescではなく、_formatPreviewHtmlで改めてアイコン化する前提の
    // プレーンテキストを渡す（さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
    _charPreview=_unitPreviewText(card,_rawSubstitutedDesc(card));
    if(_charPreview) div.setAttribute('data-preview',_charPreview);
  }
  const dirMarks=typeof panelDirectionMarksHtml==='function'?panelDirectionMarksHtml(card):'';
  if(isPanelCharacter){
    const pAtk=Number(card.power??card.atk??0);
    const pHp=Number(card.life??card.hp??1);
    const preview=_charPreview||[card.name,card.desc||''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}${dirMarks}<div class="card-art"></div><span class="card-summon-atk">${pAtk}</span><span class="card-summon-hp">${pHp}</span>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  if(isPanelCard&&['強化','エンチャント'].includes(String(card.category||''))){
    div.classList.add('enchantment-card');
    // data-previewはホバー時に_formatPreviewHtmlで再度HTMLタグ除去→マナアイコン挿入されるため、
    // 既にアイコンが埋め込まれたdynDesc（computeDesc結果）ではなく生のcard.descを使う。
    // 本文が空でもシート「キーワード」列（adjacentKeywords）があれば、隣接キャラクターに付与する
    // キーワードとして「キーワード：〇〇」行を合成する（敵/キャラクターと同じ表示規則）。
    // シート「キーワード」列に実在しないカード名自己参照マーカー（内部の効果判定専用）は
    // このカード自身のキーワード欄プレビューからも除外する
    const _adjKws=[...new Set(card.adjacentKeywords||[])].filter(k=>{
      const s=String(k||'').trim();
      if(_INTERNAL_ONLY_ENCHANT_NAMES.has(s)) return false;
      if(s===String(card.name||'')&&!_ENCHANT_KEYWORD_ONLY.has(s)&&!/^結界\d+$/.test(s)&&!/^封印\d+$/.test(s)&&!/^毒牙?\d*$/.test(s)&&!/^邪眼\d*$/.test(s)&&!/^衝撃\d*$/.test(s)&&!/^強靭\d*$/.test(s)) return false;
      return true;
    });
    // 本文に「効果なし」を含む強化カード（方向接続専用パネル等）は説明文を表示しない
    const _panelDescForPreview=/効果なし/.test(String(card.desc||''))?'':_plainEffectTextForPreview(card);
    const preview=[card.name,_panelDescForPreview,_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}${dirMarks}<div class="card-art"></div>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  if(typeof _isSpellCard==='function'&&_isSpellCard(card)){
    div.classList.add('spell-card');
    const preview=[card.name,_previewRarityLine(card),card.desc||''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${sealCostEl}${badgeEl}<div class="card-art"></div>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  div.innerHTML=`${gradeEl}${sealCostEl}${badgeEl}${dirMarks}<div class="card-art"></div><div class="card-tp ${t}${_subtypeClass}">${tpLabel}${kindLabel}</div><div class="card-name">${card.name}</div><div class="card-desc">${dynDesc}</div>${enc}${chargeLabel}${atkLabel}${hpLabel}`;
  return div;
}

function renderControls(){
  const badge=document.getElementById('ph-badge');
  const pp=document.getElementById('btn-pass');
  const dbg=document.getElementById('btn-debug-kill');
  const testBtn=document.getElementById('btn-test-battle');
  if(G.phase==='player'){
    badge.className='ph-badge ph-player'; badge.textContent='プレイヤーターン';
    if(dbg) dbg.style.display=G._debugMode?'':'none';
    if(testBtn) testBtn.style.display='none';
  } else if(G.phase==='reward'){
    // 商談フェイズ：バッジはgoToReward()で設定済みなので上書きしない
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
    return;
  } else {
    badge.className='ph-badge ph-enemy'; badge.textContent='敵のターン';
    if(dbg) dbg.style.display='none';
    if(testBtn) testBtn.style.display='none';
  }
  // 戦闘開始ボタンは廃止した。試験戦闘中のみ「試験終了」として常時表示する。
  if(G._testBattleMode){
    pp.textContent='試験終了';
    pp.disabled=false;
    pp.style.display='';
  } else {
    pp.style.display='none';
  }
}

function setHint(t){ document.getElementById('hint-txt').textContent=t; }

// 敵側インベントリエリア（報酬フェイズの施設アップグレード表示専用）
function renderEnemyHand(){
  const area=document.getElementById('enemy-hand-area');
  if(!area) return;
  const isReward=G.phase==='reward'&&(G._masterHandReady||false);
  if(!isReward){ area.style.display='none'; return; }
  area.style.display='';
  const handEl=document.getElementById('enemy-hand-slots');
  const handCountEl=document.getElementById('enemy-hand-count');
  const handMaxEl=document.getElementById('enemy-hand-max');
  if(!handEl) return;
  handEl.innerHTML='';
  if(typeof renderFacilitiesRow==='function'){
    renderFacilitiesRow();
    if(handCountEl) handCountEl.textContent='6';
    if(handMaxEl) handMaxEl.textContent='6';
  }
}
