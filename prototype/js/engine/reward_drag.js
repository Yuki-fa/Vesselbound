// reward_drag.js — 報酬・編成画面のドラッグの見た目（自前のドラッグゴースト・置き場の明暗・ドラッグ元の非表示）
// 2026-10-25 リファクタリング：reward.js から節ごと移した（処理は変えていない）。reward.js の直後に読み込む。

// ── カスタムドラッグゴースト＋合成プレビュー ─────────
// ブラウザネイティブのドラッグゴーストはCSSのz-indexより上のコンポジタレイヤーに描画される。
// setDragImageで透明画像に差し替え、自前のゴーストdivを使うことでプレビューを上に出す。

// setDragImage 用の透明画像（DOMに追加済みのimg要素が最も確実に動作する）
const _transparentDragImg=(()=>{
  const img=document.createElement('img');
  img.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  img.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(img));
  return img;
})();

// ドラッグ中、配置できない置き場を暗くするためのbodyクラス制御
const _DRAG_ZONE_CLASSES=['dragzone-reward-offer','dragzone-reward-spell','dragzone-reward-nonspell','dragzone-reward-item','dragzone-board','dragzone-spellslot','dragzone-itemslot','dragzone-ring-slot','dragzone-ring-offer'];
// dragzone-ring-slot/dragzone-ring-offer/dragzone-board中、暗転オーバーレイより上に出したい
// 要素をゾーンごとに列挙する。index.html側には「html body.reward-screen-active #hand-pane:has(...)」
// のようにid2つ分の詳細度を持つ既存ルールが後方に存在し、クラスを重ねる程度のCSS詳細度上げでは
// 勝てない場合があるため、確実に勝つインラインstyle（priority:important）で直接引き上げる。
// 魔導板の枠画像（board.png＝#hand-pane-board-bg）はカードグリッド（#hand-pane）とは別要素なので
// 両方を上げる。ドラッグ中はカード・文字を含む#hand-paneをboard-bgより上にして、
// 枠画像がカードや「魔導板」見出しを覆って暗く見える状態を避ける。
const _DRAG_ZONE_RAISE_TARGETS={
  'dragzone-ring-slot':[['#reward-production-ui',9001]],
  'dragzone-ring-offer':[['#reward-production-ui',9001]],
  // 報酬枠全体を暗転させず、各カードが元々持つ明暗だけを維持する。
  'dragzone-board':[['#reward-offer-section',9001]],
  'dragzone-reward-spell':[['#reward-offer-section',9001]],
  'dragzone-reward-nonspell':[['#reward-offer-section',9001]],
  // アイテムのドラッグは、ドラッグ元にかかわらずアイテム枠だけを明るく残す。
  'dragzone-reward-item':[['#reward-production-ui',9001]],
  'dragzone-itemslot':[['#reward-production-ui',9001]],
};
function _applyDragZoneRaise(cls){
  (_DRAG_ZONE_RAISE_TARGETS[cls]||[]).forEach(([sel,z])=>{
    if(G&&G._isForge&&cls==='dragzone-board'&&sel==='#reward-offer-section') return;
    const el=document.querySelector(sel);
    if(el) el.style.setProperty('z-index',String(z),'important');
  });
}
function _clearDragZoneRaise(){
  Object.values(_DRAG_ZONE_RAISE_TARGETS).flat().forEach(([sel])=>{
    const el=document.querySelector(sel);
    if(el) el.style.removeProperty('z-index');
  });
}
function _setInvalidBoardOverlayDragDimming(active){
  document.querySelectorAll('#hand-slots.board-slots > .card.invalid-battle-position > .unit-stat-overlay-layer').forEach(el=>{
    if(active) el.style.setProperty('filter','brightness(.5)','important');
    else el.style.removeProperty('filter');
  });
}
function _setDragZoneClass(cls){
  document.body.classList.remove(..._DRAG_ZONE_CLASSES);
  _clearDragZoneRaise();
  // dragzone-* はドラッグ中の明暗演出だけでなく、
  //  ・ドラッグ元カードを透明にする（.rew-card.dragging{opacity:0}）
  //  ・魔導板/報酬枠をオーバーレイより上へ出す z-index 引き上げ
  // も担っている。付与をやめるとドラッグ元のカード枠と発光が残るため、必ず付与する。
  if(cls){
    document.body.classList.add(cls);
    _applyDragZoneRaise(cls);
    if(cls==='dragzone-board'||cls==='dragzone-reward-spell'||cls==='dragzone-reward-nonspell'){
      _setInvalidBoardOverlayDragDimming(true);
    }
  }
  _syncRewardProductionUi();
  _syncExchangeShopDropHints();
}
function _clearDragZoneClass(){
  _clearExchangeShopDropHints();
  _setInvalidBoardOverlayDragDimming(false);
  document.body.classList.remove(..._DRAG_ZONE_CLASSES);
  _clearDragZoneRaise();
  _syncRewardProductionUi();
}

let _dragGhostDiv=null;
// ドロップ後にDOMが再構築されると dragend が発火しない場合があるため、グローバルで確実に除去
document.addEventListener('dragend', ()=>{ _removeDragGhost(); _clearDragZoneClass(); }, true);
// drop成功時、ドラッグ元要素が再描画で消滅していると dragend が発火しないことがあるため、
// drop側（消滅しない側）でも確実にクリアする
document.addEventListener('drop', ()=>{ _clearDragZoneClass(); }, true);
function _createDragGhost(srcEl){
  _removeDragGhost();
  // #scr-battleはゲーム画面全体を包む唯一のscreen divのため、これをclosest()判定に含めると
  // どのカードをドラッグしても常にtrueになってしまう（出撃枠のドラッグ時に誤ってmagic_board6.svgへ
  // 切り替わるバグの原因だった）。実際に戦闘中のフィールド上ユニットをドラッグしている場合のみ、
  // または報酬フェイズ以外でのドラッグの場合のみ「戦闘中のドラッグ」として扱う。
  const isBattleDrag = !!(srcEl && (srcEl.closest('#f-ally,#f-enemy') || (typeof G !== 'undefined' && G && G.phase !== 'reward')));
  if(isBattleDrag) document.body.classList.add('dragging-in-battle');
  const d=srcEl.cloneNode(true);
  d.querySelectorAll('button').forEach(b=>b.remove()); // 還魂ボタン等を除去
  // 価格・売却UIは実カード上だけに表示し、ドラッグゴーストには複製しない。
  // ゴーストへ固定pxの価格枠を持ち込むと、ショップカードと魔導板カードで位置・サイズが崩れる。
  d.querySelectorAll('.shop-buy-price,.shop-board-sell-value').forEach(el=>el.remove());
  // アイテム／指輪のゴーストには、報酬カード共通の外周線を複製しない。
  // 専用の item_slot.svg / ring_slot.svg だけを枠として残す。
  if(srcEl.classList.contains('item-visual')||srcEl.classList.contains('ring-visual')){
    d.classList.remove('card','rew-card','item-offer-card','item-shop-card','forge-card');
    d.style.removeProperty('--card-frame');
    d.style.removeProperty('--unit-frame');
    d.querySelectorAll('.reward-card-line-layer,.reward-card-dim-layer').forEach(el=>el.remove());
  }
  d.classList.remove('dragging','drag-over','selectable');
  d.classList.add('drag-ghost');
  const scale=1;
  const rect=srcEl.getBoundingClientRect();
  const W=rect.width||srcEl.offsetWidth||80, H=rect.height||srcEl.offsetHeight||80;
  const visualW=W*scale, visualH=H*scale;
  // body へ追加した直後、最初の dragover より前には座標がまだ (0, 0) である。
  // 子レイヤーには visibility:visible!important があるため、親の visibility だけでは
  // 左上に1フレーム見えることがある。親の合成 opacity も 0 にして完全に隠す。
  d.style.cssText=`position:fixed;pointer-events:none;z-index:9998;opacity:0;visibility:hidden;`+
    `width:${W}px;height:${H}px;`+
    `transform:scale(${scale});transform-origin:top left;transition:none;left:0;top:0;`+
    `border-radius:6px;overflow:visible;box-shadow:0 4px 16px rgba(0,0,0,.6)`;
  // 既存CSSに .drag-ghost { opacity:1!important } があるため、inline側もimportantにする。
  d.style.setProperty('opacity','0','important');
  d.style.setProperty('--hand-card-w',`${W}px`);
  d.style.setProperty('--hand-card-h',`${H}px`);
  d.style.setProperty('--unit-card-w',`${W}px`);
  d.style.setProperty('--unit-card-h',`${H}px`);
  d.style.setProperty('--unit-frame-w',`${W}px`);
  d.style.setProperty('--unit-hate-frame-w',`${W}px`);
  d.style.setProperty('--drag-card-w',`${W}px`);
  d.style.setProperty('--drag-card-h',`${H}px`);
  const gameScale=typeof _gameScale==='function'?_gameScale():1;
  // ゴーストはゲーム画面のscale外（body直下）なので、通常カードのCSS上2pxと
  // 同じ実表示幅にするには現在のゲーム倍率を掛ける必要がある。
  const dragFramePx=2*gameScale;
  const ghostRewardLine=d.querySelector(':scope > .reward-card-line-layer');
  if(ghostRewardLine){
    ghostRewardLine.style.setProperty('border',`${dragFramePx}px solid #c49a6c`,'important');
    ghostRewardLine.style.setProperty('border-width',`${dragFramePx}px`,'important');
    ghostRewardLine.style.setProperty('filter','none','important');
    ghostRewardLine.style.setProperty('z-index','110','important');
  }
  const frameLayer=srcEl.querySelector('.unit-frame-layer');
  const frameRect=frameLayer?.getBoundingClientRect?.();
  if(frameRect&&frameRect.width&&frameRect.height){
    d.style.setProperty('--unit-frame-w',`${frameRect.width}px`);
    d.style.setProperty('--unit-hate-frame-w',`${frameRect.width}px`);
    const ghostFrame=d.querySelector('.unit-frame-layer');
    if(ghostFrame){
      ghostFrame.style.setProperty('width',`${frameRect.width}px`,'important');
      ghostFrame.style.setProperty('height',`${frameRect.height}px`,'important');
      ghostFrame.style.setProperty('max-width',`${frameRect.width}px`,'important');
      ghostFrame.style.setProperty('max-height',`${frameRect.height}px`,'important');
      ghostFrame.style.setProperty('transform','translate(-50%,-50%)','important');
      ghostFrame.style.setProperty('border',`${dragFramePx}px solid #c49a6c`,'important');
      ghostFrame.style.setProperty('border-width',`${dragFramePx}px`,'important');
      ghostFrame.style.setProperty('background-origin','border-box','important');
    }
  }
  const srcCardFrame=srcEl.querySelector('.character-frame-layer');
  let ghostCardFrame=d.querySelector('.character-frame-layer');
  // 報酬枠の強化カード等は枠を ::after だけで描いている。
  // ゴーストでは二重枠防止のため ::after を無効化するので、同じ画像を実DOM層へ移す。
  // これにより報酬カード由来でも、盤面カード由来と同じ階層構造になる。
  let _srcFrameStyle=srcCardFrame?getComputedStyle(srcCardFrame):getComputedStyle(srcEl,'::after');
  const _cssCardFrame=getComputedStyle(srcEl).getPropertyValue('--card-frame').trim();
  const _hasPseudoFrame=!srcCardFrame&&
    !srcEl.matches('.item-visual,.ring-visual,.forge-card')&&
    ((_srcFrameStyle.backgroundImage&&_srcFrameStyle.backgroundImage!=='none')||_cssCardFrame);
  if(!ghostCardFrame&&_hasPseudoFrame){
    ghostCardFrame=document.createElement('div');
    ghostCardFrame.className='character-frame-layer';
    ghostCardFrame.setAttribute('aria-hidden','true');
    d.appendChild(ghostCardFrame);
  }
  if(ghostCardFrame&&(srcCardFrame||_hasPseudoFrame)){
    const _srcFrameRect=srcCardFrame?srcCardFrame.getBoundingClientRect():rect;
    const _framePx=ghostRewardLine?0:dragFramePx;
    ghostCardFrame.style.setProperty('position','absolute','important');
    ghostCardFrame.style.setProperty('left',`${_srcFrameRect.left-rect.left}px`,'important');
    ghostCardFrame.style.setProperty('top',`${_srcFrameRect.top-rect.top}px`,'important');
    ghostCardFrame.style.setProperty('right','auto','important');
    ghostCardFrame.style.setProperty('bottom','auto','important');
    ghostCardFrame.style.setProperty('width',`${_srcFrameRect.width}px`,'important');
    ghostCardFrame.style.setProperty('height',`${_srcFrameRect.height}px`,'important');
    ghostCardFrame.style.setProperty('transform','none','important');
    ghostCardFrame.style.setProperty('border',`${_framePx}px solid #c49a6c`,'important');
    ghostCardFrame.style.setProperty('border-width',`${_framePx}px`,'important');
    ghostCardFrame.style.setProperty('background-origin','border-box','important');
    // 枠を実要素で持たないカードの見た目の正は --card-frame。
    // ::after は祖先の --unit-frame を拾う古い規則が残っており、報酬の強化カードで
    // summon_frame1 を返すことがあるため、疑似要素由来の場合はCSS変数を優先する。
    const _frameBackground=!srcCardFrame&&_cssCardFrame?_cssCardFrame:
      ((_srcFrameStyle.backgroundImage&&_srcFrameStyle.backgroundImage!=='none')
        ?_srcFrameStyle.backgroundImage:_cssCardFrame);
    ghostCardFrame.style.setProperty('background-image',_frameBackground,'important');
    ghostCardFrame.style.setProperty('background-size',_srcFrameStyle.backgroundSize||'100% 100%','important');
    ghostCardFrame.style.setProperty('background-position',_srcFrameStyle.backgroundPosition||'center','important');
    ghostCardFrame.style.setProperty('background-repeat','no-repeat','important');
    const _frameRadius=_srcFrameStyle.borderRadius||'5.65% / 3.721%';
    ghostCardFrame.style.setProperty('border-radius',_frameRadius,'important');
    ghostCardFrame.style.setProperty('clip-path',`inset(0 round ${_frameRadius})`,'important');
    ghostCardFrame.style.setProperty('filter',srcEl.classList.contains('invalid-battle-position')?'none':(_srcFrameStyle.filter||'none'),'important');
  }
  // キャラクターのstat_overlayは通常盤面では#hand-slots限定のz-index:130だが、
  // ドラッグ複製はbody直下へ移るため、汎用指定のz-index:7へ戻って枠画像(z-index:90)
  // の下へ潜ってしまう。元カード上の実測矩形を固定し、ドラッグ複製でも同じ積層順にする。
  const srcStatOverlay=srcEl.querySelector('.unit-stat-overlay-layer');
  const ghostStatOverlay=d.querySelector('.unit-stat-overlay-layer');
  if(srcStatOverlay&&ghostStatOverlay){
    const sr=srcStatOverlay.getBoundingClientRect();
    const ss=getComputedStyle(srcStatOverlay);
    ghostStatOverlay.style.setProperty('position','absolute','important');
    ghostStatOverlay.style.setProperty('left',`${sr.left-rect.left}px`,'important');
    ghostStatOverlay.style.setProperty('top',`${sr.top-rect.top}px`,'important');
    ghostStatOverlay.style.setProperty('right','auto','important');
    ghostStatOverlay.style.setProperty('bottom','auto','important');
    ghostStatOverlay.style.setProperty('width',`${sr.width}px`,'important');
    ghostStatOverlay.style.setProperty('height',`${sr.height}px`,'important');
    ghostStatOverlay.style.setProperty('display','block','important');
    ghostStatOverlay.style.setProperty('visibility','visible','important');
    ghostStatOverlay.style.setProperty('opacity','1','important');
    ghostStatOverlay.style.setProperty('transform','none','important');
    ghostStatOverlay.style.setProperty('background-image',ss.backgroundImage||'url("assets/cards/status_overlay.png")','important');
    ghostStatOverlay.style.setProperty('background-size',ss.backgroundSize||'100% 100%','important');
    ghostStatOverlay.style.setProperty('background-position',ss.backgroundPosition||'center','important');
    ghostStatOverlay.style.setProperty('background-repeat','no-repeat','important');
    ghostStatOverlay.style.setProperty('border-radius',ss.borderRadius||'5.65% / 3.721%','important');
    // 掴んで持ち上げたカード自身は、通常マスの出撃不可カードでも明るく表示する。
    const overlayFilter=srcEl.classList.contains('invalid-battle-position')?'none':(ss.filter||'none');
    ghostStatOverlay.style.setProperty('filter',overlayFilter,'important');
    ghostStatOverlay.style.setProperty('z-index','130','important');
  }
  // 購入不可の報酬カードは、元DOMの疑似要素で暗転している。
  // cloneNodeでは疑似要素が複製されないため、ゴースト専用の暗転層をカード絵の上・枠の下へ置く。
  if(srcEl.classList.contains('cant')&&!d.querySelector(':scope > .reward-card-dim-layer')){
    const dim=document.createElement('span');
    dim.className='drag-card-dim-layer';
    dim.setAttribute('aria-hidden','true');
    d.appendChild(dim);
  }
  const atkEl=srcEl.querySelector('.card-summon-atk');
  const hpEl=srcEl.querySelector('.card-summon-hp');
  const slotAtkEl=srcEl.querySelector('.slot-stats .a');
  const slotHpEl=srcEl.querySelector('.slot-stats .h');
  if(atkEl){
    const r=atkEl.getBoundingClientRect();
    d.style.setProperty('--drag-atk-left',`${r.left-rect.left}px`);
    d.style.setProperty('--drag-atk-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-atk-w',`${r.width}px`);
  }
  if(hpEl){
    const r=hpEl.getBoundingClientRect();
    d.style.setProperty('--drag-hp-right',`${rect.right-r.right}px`);
    d.style.setProperty('--drag-hp-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-hp-w',`${r.width}px`);
  }
  if(slotAtkEl){
    const r=slotAtkEl.getBoundingClientRect();
    d.style.setProperty('--drag-slot-atk-left',`${r.left-rect.left}px`);
    d.style.setProperty('--drag-slot-atk-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-slot-atk-w',`${r.width}px`);
  }
  if(slotHpEl){
    const r=slotHpEl.getBoundingClientRect();
    d.style.setProperty('--drag-slot-hp-right',`${rect.right-r.right}px`);
    d.style.setProperty('--drag-slot-hp-bottom',`${rect.bottom-r.bottom}px`);
    d.style.setProperty('--drag-slot-hp-w',`${r.width}px`);
  }
  const copyStatStyle=(srcSel,dstSel,refSel)=>{
    const src=srcEl.querySelector(srcSel);
    const dst=d.querySelector(dstSel);
    if(!src||!dst) return;
    // refSel未指定時はsrcEl基準。実際のCSS containing blockが別要素（position指定のある
    // .slot-stats等）の場合はrefSelで明示しないと、containing blockの実寸と食い違い
    // bottom指定がtop+heightに上書きされて位置がズレる。
    const refSrc=refSel?src.closest(refSel):srcEl;
    const refDst=refSel?dst.closest(refSel):d;
    if(!refSrc||!refDst) return;
    const s=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const rr=refSrc.getBoundingClientRect();
    const fs=(parseFloat(s.fontSize)||Math.max(24,Math.min(W,H)*0.16))*gameScale;
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
    // **桁数による縮小（.stat-d3/d4/d5 の transform:scale）を残す。**
    // ここで transform:none を掛けていたため、桁数の多いカードをドラッグすると
    // ゴーストの数字だけ元の大きさへ戻っていた。
    // 位置はこの関数が left/top/width/height で決めているので、
    // 元の transform のうち**拡大縮小だけ**を取り出して掛け直す（平行移動は捨てる）。
    const m=/^matrix\(([-\d.]+)/.exec(String(s.transform||''));
    const statScale=m?parseFloat(m[1]):1;
    if(Number.isFinite(statScale)&&statScale>0&&Math.abs(statScale-1)>0.001){
      dst.style.setProperty('transform',`scale(${statScale})`,'important');
      dst.style.setProperty('transform-origin','center center','important');
    }else{
      dst.style.setProperty('transform','none','important');
    }
  };
  copyStatStyle('.card-summon-atk','.card-summon-atk');
  copyStatStyle('.card-summon-hp','.card-summon-hp');
  copyStatStyle('.slot-stats .a','.slot-stats .a','.slot-stats');
  copyStatStyle('.slot-stats .h','.slot-stats .h','.slot-stats');

  // ショップ価格・売却ボタンは、元カードがゲーム全体のscale配下にあるのに対し、
  // ドラッグゴーストはbody直下（scale外）へ移動する。固定pxのCSSをそのまま
  // 引き継ぐと、販売カードでは大きく、魔導板カードでは小さく見えるため、
  // 元カードの実表示矩形をゴースト側へコピーして見た目を統一する。
  const copyShopOverlayStyle=(selector)=>{
    const srcEls=srcEl.querySelectorAll(selector);
    const dstEls=d.querySelectorAll(selector);
    srcEls.forEach((src,i)=>{
      const dst=dstEls[i];
      if(!dst) return;
      const sr=src.getBoundingClientRect();
      const ss=getComputedStyle(src);
      const fs=parseFloat(ss.fontSize)||0;
      const bw=parseFloat(ss.borderTopWidth)||0;
      const br=parseFloat(ss.borderTopLeftRadius)||0;
      const px=parseFloat(ss.paddingLeft)||0;
      const py=parseFloat(ss.paddingTop)||0;
      dst.style.setProperty('left',`${sr.left-rect.left}px`,'important');
      dst.style.setProperty('top',`${sr.top-rect.top}px`,'important');
      dst.style.setProperty('right','auto','important');
      dst.style.setProperty('bottom','auto','important');
      dst.style.setProperty('width',`${sr.width}px`,'important');
      dst.style.setProperty('height',`${sr.height}px`,'important');
      dst.style.setProperty('box-sizing','border-box','important');
      if(fs) dst.style.setProperty('font-size',`${fs*gameScale}px`,'important');
      if(bw) dst.style.setProperty('border-width',`${bw*gameScale}px`,'important');
      if(br) dst.style.setProperty('border-radius',`${br*gameScale}px`,'important');
      if(px||py){
        dst.style.setProperty('padding-left',`${px*gameScale}px`,'important');
        dst.style.setProperty('padding-right',`${(parseFloat(ss.paddingRight)||px)*gameScale}px`,'important');
        dst.style.setProperty('padding-top',`${py*gameScale}px`,'important');
        dst.style.setProperty('padding-bottom',`${(parseFloat(ss.paddingBottom)||py)*gameScale}px`,'important');
      }
      dst.style.setProperty('transform','none','important');
    });
  };
  copyShopOverlayStyle('.shop-board-sell-value');
  copyShopOverlayStyle('.shop-buy-price');
  const statSrc=srcEl.querySelector('.slot-stats .a,.card-summon-atk,.card-summon-hp,.slot-stats');
  const statSize=(parseFloat(getComputedStyle(statSrc||srcEl).fontSize)||0)*gameScale;
  const dragStatSize=statSize||Math.max(28,Math.min(W,H)*0.18);
  d.style.setProperty('--drag-stat-size',`${dragStatSize}px`,'important');
  d.querySelectorAll('.slot-stats,.slot-stats .a,.slot-stats .h,.card-summon-atk,.card-summon-hp')
    .forEach(el=>{
      if(!el.style.getPropertyValue('font-size')) el.style.setProperty('font-size',`${dragStatSize}px`,'important');
      el.style.setProperty('line-height','1','important');
      // **copyStatStyle() が入れた縮小（scale）を上書きしないこと。**
      // ここで一律 transform:none にしていたため、桁数の多いカードをドラッグすると
      // ゴーストの数字だけ元の大きさへ戻っていた。まだ何も入っていない時だけ消す。
      if(!el.style.getPropertyValue('transform')) el.style.setProperty('transform','none','important');
    });
  const cs=getComputedStyle(srcEl);
  ['--card-frame','--card-art','--card-art-size','--card-art-position','--unit-frame','--unit-art','--unit-art-size','--unit-art-position'].forEach(k=>{
    const v=cs.getPropertyValue(k);
    if(v) d.style.setProperty(k,v);
  });
  // マナオーブ（固定px画像）・方向矢印（固定pxフォント）もスケール外に置かれるため個別に補正する
  const srcOrbImgs=srcEl.querySelectorAll('.mana-cost-orbs img');
  const dstOrbImgs=d.querySelectorAll('.mana-cost-orbs img');
  srcOrbImgs.forEach((src,i)=>{
    const dstImg=dstOrbImgs[i];
    if(!dstImg) return;
    const sr=src.getBoundingClientRect();
    dstImg.style.setProperty('width',`${sr.width}px`,'important');
    dstImg.style.setProperty('height',`${sr.height}px`,'important');
  });
  // scale配下の元カードとbody直下のゴーストで、アイコン群と数字の実表示矩形を一致させる。
  const srcCostWrap=srcEl.querySelector('.card-activation-costs');
  const dstCostWrap=d.querySelector('.card-activation-costs');
  if(srcCostWrap&&dstCostWrap){
    const wr=srcCostWrap.getBoundingClientRect();
    dstCostWrap.style.setProperty('left',`${wr.left-rect.left}px`,'important');
    dstCostWrap.style.setProperty('top',`${wr.top-rect.top}px`,'important');
    dstCostWrap.style.setProperty('right','auto','important');
    dstCostWrap.style.setProperty('bottom','auto','important');
    dstCostWrap.style.setProperty('width',`${wr.width}px`,'important');
    dstCostWrap.style.setProperty('height',`${wr.height}px`,'important');
    dstCostWrap.style.setProperty('display','block','important');
    dstCostWrap.style.setProperty('grid-template','none','important');
    dstCostWrap.style.setProperty('grid-auto-flow','unset','important');
    dstCostWrap.style.setProperty('gap','0','important');
    dstCostWrap.style.setProperty('transform','none','important');
    const srcEntries=srcCostWrap.querySelectorAll('.activation-cost-entry');
    const dstEntries=dstCostWrap.querySelectorAll('.activation-cost-entry');
    srcEntries.forEach((src,i)=>{
      const dst=dstEntries[i]; if(!dst) return;
      const er=src.getBoundingClientRect();
      dst.style.setProperty('position','absolute','important');
      dst.style.setProperty('left',`${er.left-wr.left}px`,'important');
      dst.style.setProperty('top',`${er.top-wr.top}px`,'important');
      dst.style.setProperty('width',`${er.width}px`,'important');
      dst.style.setProperty('height',`${er.height}px`,'important');
      dst.style.setProperty('display','block','important');
      dst.style.setProperty('transform','none','important');
      const srcImg=src.querySelector('img'),dstImg=dst.querySelector('img');
      if(srcImg&&dstImg){
        const ir=srcImg.getBoundingClientRect();
        dstImg.style.setProperty('width',`${ir.width}px`,'important');
        dstImg.style.setProperty('height',`${ir.height}px`,'important');
      }
      const sb=src.querySelector('b'), db=dst.querySelector('b');
      if(sb&&db){
        db.style.setProperty('font-size',`${Math.max(9,er.height*.48)}px`,'important');
        db.style.setProperty('line-height','1','important');
        db.style.setProperty('inset','0','important');
        db.style.setProperty('display','flex','important');
        db.style.setProperty('align-items','center','important');
        db.style.setProperty('justify-content','center','important');
        db.style.setProperty('transform','none','important');
      }
    });
  }
  const srcSeal=srcEl.querySelector('.seal-cost-badge');
  const dstSeal=d.querySelector('.seal-cost-badge');
  if(srcSeal&&dstSeal){
    const sr=srcSeal.getBoundingClientRect();
    const rr=srcEl.getBoundingClientRect();
    const ss=getComputedStyle(srcSeal);
    dstSeal.style.setProperty('left',`${sr.left-rr.left}px`,'important');
    dstSeal.style.setProperty('top',`${sr.top-rr.top}px`,'important');
    dstSeal.style.setProperty('right','auto','important');
    dstSeal.style.setProperty('bottom','auto','important');
    dstSeal.style.setProperty('width',`${sr.width}px`,'important');
    dstSeal.style.setProperty('height',`${sr.height}px`,'important');
    dstSeal.style.setProperty('font-size',ss.fontSize,'important');
    dstSeal.style.setProperty('transform','none','important');
    const srcSealImgs=srcSeal.querySelectorAll('img');
    const dstSealImgs=dstSeal.querySelectorAll('img');
    srcSealImgs.forEach((srcImg,i)=>{
      const dstImg=dstSealImgs[i];
      if(!dstImg) return;
      const ir=srcImg.getBoundingClientRect();
      dstImg.style.setProperty('width',`${ir.width}px`,'important');
      dstImg.style.setProperty('height',`${ir.height}px`,'important');
    });
  }
  // 矢印は方向ごとに向きの異なる専用画像を使うため、ゴースト側では回転をかけず位置・サイズのみ合わせる
  const srcDirs=srcEl.querySelectorAll('.panel-dir');
  const dstDirs=d.querySelectorAll('.panel-dir');
  srcDirs.forEach((src,i)=>{
    const dstDir=dstDirs[i];
    if(!dstDir) return;
    const ds=getComputedStyle(src);
    const sr=src.getBoundingClientRect();
    const fs=(parseFloat(ds.fontSize)||0)*gameScale;
    dstDir.style.setProperty('font-size',`${fs}px`,'important');
    dstDir.style.setProperty('line-height','1','important');
    dstDir.style.setProperty('left',`${sr.left-rect.left}px`,'important');
    dstDir.style.setProperty('top',`${sr.top-rect.top}px`,'important');
    dstDir.style.setProperty('right','auto','important');
    dstDir.style.setProperty('bottom','auto','important');
    dstDir.style.setProperty('width',`${sr.width}px`,'important');
    dstDir.style.setProperty('height',`${sr.height}px`,'important');
    dstDir.style.setProperty('transform','none','important');
    // 枠画像は z-index:90。方向矢印は必ずその前面へ出す。
    dstDir.style.setProperty('z-index','300','important');
  });
  d._ghostW=visualW; d._ghostH=visualH;
  document.body.appendChild(d);
  _dragGhostDiv=d;
}
function _moveDragGhost(clientX,clientY){
  if(!_dragGhostDiv) return;
  const W=_dragGhostDiv._ghostW||_dragGhostDiv.offsetWidth||80;
  const H=_dragGhostDiv._ghostH||_dragGhostDiv.offsetHeight||80;
  _dragGhostDiv.style.left=(clientX-W/2)+'px';
  _dragGhostDiv.style.top=(clientY-H/2)+'px';
  _dragGhostDiv.style.setProperty('visibility','visible','important');
  _dragGhostDiv.style.setProperty('opacity','1','important');
}
function _removeDragGhost(){
  document.body.classList.remove('dragging-in-battle');
  if(_dragGhostDiv){ _dragGhostDiv.remove(); _dragGhostDiv=null; }
  setTimeout(()=>{
    try{ document.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true})); }catch(e){}
  },0);
}
// ドラッグ元の見た目を一時的に変える時は、**必ずこれを通して控えを取る**。
// 控えずに style を直接いじると、ドラッグを中断した時
// （枠の外へ落とした・Escで取り消した）に元へ戻せず、
// 再描画が起きるまでカード枠が消えたままになる。
// 対になる復元は _restoreDragSourceParts()。**片方だけ足さないこと。**
const _DRAG_SRC_SAVED_PROPS=[['opacity','Opacity'],['display','Display'],
  ['visibility','Visibility'],['z-index','ZIndex'],['border','Border'],
  ['border-width','BorderWidth'],['background-origin','BackgroundOrigin'],
  ['filter','Filter']];
function _setDragSourceStyle(el,prop,value){
  if(!el) return;
  const key=(_DRAG_SRC_SAVED_PROPS.find(x=>x[0]===prop)||[])[1];
  if(key&&!(('dragSrcPrev'+key) in el.dataset)){
    el.dataset['dragSrcPrev'+key]=el.style.getPropertyValue(prop)||'';
    el.dataset['dragSrcPrev'+key+'Priority']=el.style.getPropertyPriority(prop)||'';
  }
  el.style.setProperty(prop,value,'important');
}
function _hideDragSourceParts(el){
  if(!el) return;
  el.classList.add('drag-source-parts-hidden');
  Array.from(el.children||[]).forEach(ch=>_setDragSourceStyle(ch,'opacity','0'));
  // 所持アイテムの価格・売却表示は、CSSの重要度で opacity を上書きされても
  // ドラッグ元へ残らないよう、表示自体を隠す（復元時は保存値から戻す）。
  el.querySelectorAll('.shop-buy-price,.shop-board-sell-value,.shop-pending-sale-ui').forEach(ch=>{
    _setDragSourceStyle(ch,'display','none');
  });
  // ドラッグ元には「カード」ではなく、その場所のマス枠だけを残す。
  // character-frame-layer を戻すと、エンチャントの枠画像が元位置に残り、
  // ゴースト側との二重表示になる。
  const _mapBoard=!!el.dataset.mapBoard;
  const _boardFrame=el.querySelector('.board-frame-layer');
  if(_boardFrame){
    _setDragSourceStyle(_boardFrame,'display',_mapBoard?'none':'block');
    _setDragSourceStyle(_boardFrame,'visibility',_mapBoard?'hidden':'visible');
    _setDragSourceStyle(_boardFrame,'opacity',_mapBoard?'0':'1');
    _setDragSourceStyle(_boardFrame,'z-index','110');
    _setDragSourceStyle(_boardFrame,'filter','none');
    _setDragSourceStyle(_boardFrame,'border',_mapBoard?'0':'2px solid #c49a6c');
    _setDragSourceStyle(_boardFrame,'border-width',_mapBoard?'0':'2px');
    _setDragSourceStyle(_boardFrame,'background-origin','border-box');
  }
  const _mapBoundary=el.querySelector('.map-boundary-layer');
  if(_mapBoundary){
    _setDragSourceStyle(_mapBoundary,'display','block');
    _setDragSourceStyle(_mapBoundary,'visibility','visible');
    _setDragSourceStyle(_mapBoundary,'opacity','1');
    _setDragSourceStyle(_mapBoundary,'z-index','110');
    _setDragSourceStyle(_mapBoundary,'filter','none');
    _setDragSourceStyle(_mapBoundary,'border','5px solid #c49a6c');
    _setDragSourceStyle(_mapBoundary,'border-width','5px');
  }
}
function _restoreDragSourceParts(el){
  if(!el) return;
  el.classList.remove('drag-source-parts-hidden');
  // **控えたものは全部戻す。** 一部のレイヤ・一部のプロパティだけ戻していた頃は、
  // ドラッグを中断するとキャラクターのカード枠が消えたままになっていた
  // （_hideDragSourceParts が display/visibility も落としているのに、
  //   戻していたのはマス枠と境界の分だけだった）。
  const targets=[el,...Array.from(el.children||[]),
    ...Array.from(el.querySelectorAll('.character-frame-layer,.unit-frame-layer,.board-frame-layer,.map-boundary-layer'))];
  new Set(targets).forEach(node=>{
    if(!node||!node.dataset) return;
    _DRAG_SRC_SAVED_PROPS.forEach(([prop,key])=>{
      if(!(('dragSrcPrev'+key) in node.dataset)) return;
      const prev=node.dataset['dragSrcPrev'+key]||'';
      const prio=node.dataset['dragSrcPrev'+key+'Priority']||'';
      if(prev) node.style.setProperty(prop,prev,prio);
      else node.style.removeProperty(prop);
      delete node.dataset['dragSrcPrev'+key];
      delete node.dataset['dragSrcPrev'+key+'Priority'];
    });
  });
}
