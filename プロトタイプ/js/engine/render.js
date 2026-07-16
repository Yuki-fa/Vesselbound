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
    const desc=el.getAttribute('data-kwdesc')||el.getAttribute('data-preview')||'';
    if(!desc){ tip.style.display='none'; return; }
    tip.innerHTML=_formatPreviewHtml(desc);
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
      .replace(/([青赤緑黄紫茶])?(\d*)マナ/g,(_,c,n)=>{
        const icon=c?colorIcon(c):manaIcon();
        return icon.repeat(Math.max(1,parseInt(n,10)||1));
      })
      .replace(/([青赤緑黄紫茶])(?=強化|キャラクター|カード|コスト|色|スケルトン|ゴーレム|ゴースト|マナ)/g,m=>colorIcon(m));
  }).join('');
}
function _formatPreviewHtml(desc){
  const clean=String(desc||'').replace(/<\/?strong>/gi,'').replace(/<[^>]*>/g,'');
  const lines=clean.split('\n').map((line,li)=>{
    if(li===0) return `<strong class="preview-title">${_injectManaIcons(_escapePreviewHtml(line))}</strong>`;
    const m=line.match(/^([^：:]+)([：:])(.*)$/);
    if(!m) return _injectManaIcons(_escapePreviewHtml(line));
    let body=_injectManaIcons(_escapePreviewHtml(m[3]));
    if(m[1]==='キーワード'){
      // 「キーワード：」というラベル自体は表示せず、キーワードそのものだけを太字で並べる
      return body.split(/\s*\/\s*/).map(k=>k.trim()?`<strong>${k.trim()}</strong>`:'').filter(Boolean).join(' / ');
    }
    // 「Xマナ：」「Xマナ毎：」ラベルはマナ数分のアイコンに変換する（他のタイミングラベルと違い文字列のまま太字にしない）
    if(/^\d+マナ毎?$/.test(m[1])){
      return `<strong>${_injectManaIcons(_escapePreviewHtml(m[1]))}</strong>${_escapePreviewHtml(m[2])}${body}`;
    }
    return `<strong>${_escapePreviewHtml(m[1])}</strong>${_escapePreviewHtml(m[2])}${body}`;
  });
  // .preview-title は display:block のため、直後に<br>を挟むと1行分余分な空白ができる
  return lines[0]+(lines.length>1?lines.slice(1).join('<br>'):'');
}
function _previewRarityLine(card){
  return '';
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
  return '';
}
function cardManaCostHtml(card){
  const n=Math.max(0,Number(card?.manaCost)||0);
  const path=n?_manaOrbPath():'';
  if(!n||!path) return '';
  return `<span class="mana-cost-orbs">${Array.from({length:n},()=>`<img src="${path}" alt="">`).join('')}</span>`;
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

function playHitVfxAtRect(rect,amount,options){
  if(!rect) return Promise.resolve();
  const opt=options||{};
  const hitDuration=opt.hitDuration||320;
  const labelDuration=opt.labelDuration||550;
  if(!rect.width||!rect.height) return Promise.resolve();
  const host=document.createElement('div');
  host.className='damage-vfx-host';
  Object.assign(host.style,{
    left:`${rect.left}px`,
    top:`${rect.top}px`,
    width:`${rect.width}px`,
    height:`${rect.height}px`,
  });
  const vfx=document.createElement('div');
  vfx.className='vfx vfx-hit';
  const hitUrl=Assets?.vfx?.hit||'assets/temp/vfx/hit.webp';
  vfx.style.setProperty('--vfx-image',`url("${hitUrl}")`);
  vfx.style.setProperty('--hit-vfx-duration',`${hitDuration}ms`);
  if(amount>0){
    const label=document.createElement('div');
    label.className='vfx-damage-label';
    label.textContent=`-${amount}`;
    label.style.setProperty('--damage-label-duration',`${labelDuration}ms`);
    host.appendChild(label);
  }
  host.appendChild(vfx);
  document.body.appendChild(host);
  return new Promise(resolve=>{
    setTimeout(()=>{ host.remove(); resolve(); },Math.max(hitDuration,labelDuration)+80);
  });
}

function playHitVfxOnSlot(slot,amount,options){
  if(!slot) return Promise.resolve();
  const rect=slot.getBoundingClientRect();
  return playHitVfxAtRect(rect,amount,options);
}

function playHitVfx(side,idxOrUnit,amount,options){
  return playHitVfxOnSlot(getCurrentUnitSlot(side,idxOrUnit),amount,options);
}

// カードDOMを作り直さず、HP数値とライフバーだけを即座に更新する（applyDamageBatch用の軽量更新）
function updateUnitDamageUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
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

// シールド消費時、カードDOMを作り直さずshield-active/魔方陣レイヤーだけを即座に更新する
function updateUnitShieldUi(unit,side){
  if(!unit) return;
  const slot=getCurrentUnitSlot(side,unit);
  if(!slot) return;
  const hasShield=unit.shield>0;
  slot.classList.toggle('shield-active',hasShield);
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
  const fromIdx=fromList.indexOf(attacker);
  const toIdx=toList.indexOf(target);
  if(fromIdx<0||toIdx<0) return Promise.resolve();
  const fromField=document.getElementById(isEnemySide?'f-enemy':'f-ally');
  const toField=document.getElementById(isEnemySide?'f-ally':'f-enemy');
  const fromEl=fromField?.querySelector(`.slot[data-unit-idx="${fromIdx}"]`);
  const toEl=toField?.querySelector(`.slot[data-unit-idx="${toIdx}"]`);
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
    const anim=clone.animate(frames,{duration,easing:'ease-in-out',fill:'forwards'});
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{
        if(done) return;
        done=true;
        resolve();
      };
      anim.addEventListener('finish',finish,{once:true});
      anim.addEventListener('cancel',finish,{once:true});
      setTimeout(finish,duration+60);
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

const _ENCHANT_KEYWORD_ONLY=new Set(['守護','毒','毒牙','邪眼','再生','復活','根性','二段攻撃','三段攻撃','三方向攻撃','全体攻撃','生贄','即死','先制','シールド','生命吸収']);
function _enchantKeywordDesc(k){
  const s=String(k||'').trim();
  if(!s) return '';
  if(_ENCHANT_KEYWORD_ONLY.has(s)) return s;
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
  if(s==='生命吸収') return 'このキャラクターが与えたダメージ分、HPを増加する。';
  if(/^邪眼\d+$/.test(s)) return s;
  if(/^弱体化(\d+)$/.test(s)) return `攻撃/ダメージ効果で対象に弱体${s.replace('弱体化','')}を付与する。`;
  return s;
}
function _enchantEffectTextForPanel(p){
  if(!p) return '';
  if(p.adjacentAtkBonus||p.adjacentHpBonus){
    const a=p.adjacentAtkBonus||0, h=p.adjacentHpBonus||0;
    return `常時：${a&&h?`+${a}/+${h}`:a?`ATK+${a}`:`HP+${h}`}を得る。`;
  }
  // 自分自身の名前を自己参照キーワードとして持つ場合（狂気・闇の炎等）は、
  // _enchantKeywordDesc()の汎用（かつシート更新に追従しない恐れのある）ハードコード文言ではなく、
  // シート上の本文（authoritative）をそのまま使う
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.includes(p.name)&&(p.desc||p.effectText||p.effect)){
    return p.desc||p.effectText||p.effect;
  }
  if(Array.isArray(p.adjacentKeywords)&&p.adjacentKeywords.length){
    // 付与するキーワードが全て単純キーワード（_ENCHANT_KEYWORD_ONLY）の場合は、
    // 既にキャラクター側の太字キーワード欄に表示されるため、効果文としては重複表示しない
    if(p.adjacentKeywords.every(k=>_ENCHANT_KEYWORD_ONLY.has(String(k||'').trim()))) return '';
    return p.adjacentKeywords.map(_enchantKeywordDesc).filter(Boolean).join('\n');
  }
  return (typeof computeDesc==='function'?computeDesc(p):'')||p.desc||p.effectText||p.effect||'';
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
  const normalTexts=normal.map(e=>e.text);
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
  const kws=typeof _unitDisplayKeywords==='function'?_unitDisplayKeywords(unit,baseDesc,slotIdx):[];
  const kwHtml=kws.length?`<div class="slot-desc-keywords"><strong>${kws.map(k=>typeof _escapePreviewHtml==='function'?_escapePreviewHtml(k):k).join(' / ')}</strong></div>`:'';
  const baseHtml=baseDesc?`<div class="slot-desc-base">${baseDesc}</div>`:'';
  if(!normalTexts.length&&!charTexts.length) return (kwHtml||baseHtml)?`<div class="slot-desc">${kwHtml}${baseHtml}</div>`:'';
  const toLineHtml=line=>{
    const safe=typeof _escapePreviewHtml==='function'?_escapePreviewHtml(line):line;
    return `<div class="slot-desc-enchant-line">${typeof _injectManaIcons==='function'?_injectManaIcons(safe):safe}</div>`;
  };
  const effectsHtml=normalTexts.map(toLineHtml).join('');
  const charHtml=charTexts.map(toLineHtml).join('');
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
    eq.forEach((panel,idx)=>{
      if(idx===enchantIdx) return;
      const isCharTarget=panel&&String(panel.category||'')==='キャラクター';
      if(!isCharTarget) return;
      const contrib=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(unit,idx):[];
      if(contrib.some(c=>c.idx===enchantIdx)){
        affected.add(idx);
        contrib.forEach(c=>{ if(c.idx!==enchantIdx) connected.add(c.idx); });
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
const _INTERNAL_ONLY_ENCHANT_NAMES=new Set(['逆襲','闇の儀式','執念の炎','闇の炎','狂気','野生の力','治癒能力']);
// UI上に表示すべきキーワード一覧を算出する（強化パネル由来で既に効果文に出ているものや、
// 内部集計専用のショートハンドは除外）。_unitPreviewText（ツールチップ）と
// _unitCombinedDescHtml（カード常時表示）の両方で同じ一覧を使うための共通ヘルパー。
function _unitDisplayKeywords(unit, desc, slotIdx){
  if(!unit) return [];
  const {normalTexts,charTexts}=_groupedEnchantEffectTexts(unit,slotIdx);
  const panelEffects=[...normalTexts,...charTexts];
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
  const normalizedKws=(unit.keywords||[])
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
    const _hasGuardPanel=u&&!_isPlayerHero&&(((isEnemy||u._panelSummoned)&&u.guardian)||((u._panelSummoned||isEnemy)&&(u.keywords||[]).includes('守護')));
    if(u&&u.hp>0&&_hasGuardPanel) slot.classList.add('is-defender','uses-hate-frame');
    if(u&&u.hp>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('is-defender');
    if(u&&u.hp>0&&!_isPlayerHero&&u.hate&&u.hateTurns>0) slot.classList.add('uses-hate-frame');
    if(_isPlayerHero) slot.classList.remove('is-defender','uses-hate-frame');
    if(u&&(!isEnemy||u.hp>0)){
      slot.classList.add('unit-card');
      if(u.name==='石像') slot.classList.add('no-unit-shadow');
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
        if(u.shield>0) bs.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
        if(u.instadead) bs.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
        if(u.poison>0) bs.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${u.poison}</span>`);
        if(u.regen) bs.push(`<span class="slot-badge b-regen"${_sd('再生')}>再生${u.regen}</span>`);
        if(u.stealth) bs.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
        if(u.allyTarget) bs.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
        const badgeBlock=bs.length?`<div class="slot-badges">${bs.join('')}</div>`:'';
        // ── キーワードブロック（パワー/ライフとテキストの中間・中央揃え）──
        // エリート/ボスは他キーワードの1行上。
        const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','結束':'#80d0d0','邪眼':'#c060c0','弱体':'#c08040','シールド':'#60a0e0','標的':'#60c0c0','成長':'#60d090','アーティファクト':'#b0a080'};
        const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};font-weight:bold;cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
        // 弱体X（弱体化Xにより付与された状態）はunit.weaken（数値、加算式）で管理しているため、
        // バッジ表示用の擬似キーワードとして合成する
        const _allKws=[...(u.weaken>0?[`弱体${u.weaken}`]:[]),...(typeof _mergeCountedKeywords==='function'?_mergeCountedKeywords(u.keywords||[]):[...new Set(u.keywords||[])])].filter(k=>!_INTERNAL_ONLY_ENCHANT_NAMES.has(k));
        const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
        const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
        const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:1px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
        const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
        let kwBlock='';
        if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
        const gradeTag='';
        const _rawDesc=u.desc?computeDesc(u):'';
        const _desc=_stripKeywordsFromDesc(_rawDesc,u);
        const descTag=_unitCombinedDescHtml(u,_desc);
        // data-previewはホバー時に_formatPreviewHtmlで改めてアイコン化されるため、
        // 既にアイコン化済みの_desc（<img alt="マナ">を含む）ではなくプレーンテキストを渡す
        // （さもないと「2マナ」が「マナマナ」に化けるバグの原因になる）
        const _plainDesc=u.desc?_stripKeywordsFromDesc(_rawSubstitutedDesc(u),u):'';
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
        if(isEnemy){
          slot.innerHTML=`${manaOrbHtml}${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
        } else {
          slot.innerHTML=`${manaOrbHtml}${badgeBlock}<div class="unit-frame-layer"></div>${gradeTag}<div class="unit-portrait">${shieldLayer}</div>${hpBar}<div style="${_infoStyle}">${_topRow}<div class="slot-name">${u.name}</div>${raceTag}<div class="slot-stats"><span class="a">${u.atk}</span><span class="s">/</span><span class="${_hpClass}">${u.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${descTag}</div>`;
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
  if(card.descXEqualsAtk&&card.atk!=null) desc=desc.replace(/X/g,String(card.atk));
  return desc;
}
function computeDesc(card,_mlOverride){
  if(card.isEnchant) return '契約に「'+card.enchantType+'」を付与する';
  let desc=_rawSubstitutedDesc(card);
  // タイミングキーワードを太字化（「開戦：」「終戦：」等）
  desc=desc.replace(/(開戦|終戦|負傷|誘発|攻撃|召喚|常在|常時)：/g,'<strong>$1</strong>：');
  // 説明文中の色名（青・赤・緑・黄）をマナアイコンに置き換える
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
    div.innerHTML=`${manaCostEl}${badgeEl}<div class="card-art"></div><span class="card-summon-atk">${pAtk}</span><span class="card-summon-hp">${pHp}</span>`;
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
    const _adjKws=[...new Set(card.adjacentKeywords||[])].filter(k=>!_INTERNAL_ONLY_ENCHANT_NAMES.has(k));
    // 本文に「効果なし」を含む強化カード（方向接続専用パネル等）は説明文を表示しない
    const _panelDescForPreview=/効果なし/.test(String(card.desc||''))?'':(card.desc||'');
    const preview=[card.name,_panelDescForPreview,_adjKws.length?`キーワード：${_adjKws.join(' / ')}`:''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${badgeEl}${dirMarks}<div class="card-art"></div>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  if(typeof _isSpellCard==='function'&&_isSpellCard(card)){
    div.classList.add('spell-card');
    const preview=[card.name,_previewRarityLine(card),card.desc||''].filter(Boolean).join('\n');
    if(preview) div.setAttribute('data-preview',preview);
    div.innerHTML=`${manaCostEl}${badgeEl}<div class="card-art"></div>`;
    if(typeof _applyManaOrbState==='function') _applyManaOrbState(div,card);
    return div;
  }
  div.innerHTML=`${gradeEl}${badgeEl}${dirMarks}<div class="card-art"></div><div class="card-tp ${t}${_subtypeClass}">${tpLabel}${kindLabel}</div><div class="card-name">${card.name}</div><div class="card-desc">${dynDesc}</div>${enc}${chargeLabel}${atkLabel}${hpLabel}`;
  return div;
}

function renderControls(){
  const badge=document.getElementById('ph-badge');
  const pp=document.getElementById('btn-pass');
  const dbg=document.getElementById('btn-debug-kill');
  if(G.phase==='player'){
    badge.className='ph-badge ph-player'; badge.textContent='プレイヤーターン';
    pp.textContent='戦闘実行';
    pp.disabled=!!G._battlePhaseRunning;
    pp.style.display='';
    if(dbg) dbg.style.display=G._debugMode?'':'none';
  } else if(G.phase==='reward'){
    // 商談フェイズ：バッジはgoToReward()で設定済みなので上書きしない
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
  } else {
    badge.className='ph-badge ph-enemy'; badge.textContent='敵のターン';
    pp.style.display='none';
    if(dbg) dbg.style.display='none';
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
