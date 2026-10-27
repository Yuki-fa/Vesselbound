// render_attack_motion.js — 盤面カードの動く複製・奪取移動・攻撃モーション
// 2026-10-25 リファクタリング：render.js から移した（処理は変えていない）。

// ── 盤面カードの「動く複製」を作る ────────────────────────────
// **カードを動かす演出（攻撃モーション・奪う移動）はこの複製を使う。**
// 元のスロット要素をそのまま複製すると、CSS変数・固定px指定（ATK/HP・枠）が
// 親の縮尺から外れて崩れるため、実測値を1つずつ写している。
// fromEl … 見た目の元にするスロット要素／fr … 置きたい位置と大きさ（ビューポート座標）
// 攻撃モーションの複製カードのATK/HP表示を、別の要素（今の表示を持つ複製・スロット）へ揃える。
function _syncMotionCloneStats(clone, latest){
  if(!clone||!latest) return;
  const atk=latest.querySelector('.slot-stats .a'),hp=latest.querySelector('.slot-stats .h');
  if(atk&&hp){
    // innerHTMLを写すと、game-scaleの外へ補正した複製の座標・文字サイズまで実枠の値へ戻る。
    const keepSize=Number(hp.textContent)<=0;
    _setUnitStatText(clone.querySelector('.slot-stats .a'),atk.textContent,hp.textContent,keepSize);
    const shownHp=clone.querySelector('.slot-stats .h');
    _setUnitStatText(shownHp,hp.textContent,atk.textContent,keepSize);
    if(shownHp) shownHp.classList.toggle('hp-damaged',hp.classList.contains('hp-damaged'));
  }
  const fill=latest.querySelector('.slot-life-fill'),shownFill=clone.querySelector('.slot-life-fill');
  if(fill&&shownFill) shownFill.style.width=fill.style.width;
  const bar=latest.querySelector('.slot-life-bar'),shownBar=clone.querySelector('.slot-life-bar');
  if(bar&&shownBar) shownBar.title=bar.title;
}
// 停止中・割り込み中も、いま画面に出ている1枚だけを共通の数値更新へ渡す。
function battleMotionClone(unit){
  const owner=unit&&_attackMotionOwners.get(String(unit.id));
  return owner&&owner.clone.isConnected?owner.clone:null;
}
function _buildMotionCardClone(fromEl, fr){
  const clone=fromEl.cloneNode(true);
  // 召喚の後半などが先に終了しても、複製へ写した透明度・scaleを残さない。
  if(typeof VbFx!=='undefined'&&typeof VbFx.prepareClone==='function'){
    VbFx.prepareClone(fromEl,clone);
    // 隠密・防戦は絵の子要素へ透明度等を掛ける。根だけを戻すと、
    // 付け替え前の一時値が複製の原値になり、停止後も半透明のまま残る。
    const sourceChildren=fromEl.querySelectorAll('*'),cloneChildren=clone.querySelectorAll('*');
    sourceChildren.forEach((child,i)=>{if(cloneChildren[i]) VbFx.prepareClone(child,cloneChildren[i]);});
  }
  clone.querySelectorAll('[data-vb-fx-local]').forEach(el=>el.remove());
  clone.classList.add('attack-motion-clone');
  // 直前の攻撃が中断された場合でも、複製側へ非表示状態を引き継がない。
  clone.classList.remove('dragging','drag-over','selected','selectable','motion-hidden');
  // **元スロットが隠されていても、複製は必ず見える状態で作る。**
  // 攻撃モーション中のスロットは inline で visibility:hidden になっており、
  // そのまま複製すると「動いているはずのカードが見えない」ことになる。
  clone.style.removeProperty('visibility');
  clone.style.setProperty('visibility','visible','important');
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
  const gameScale=_gameScale();
  if(frameRect&&frameRect.width&&frameRect.height){
    clone.style.setProperty('--unit-frame-w',`${frameRect.width}px`,'important');
    clone.style.setProperty('--unit-hate-frame-w',`${frameRect.width}px`,'important');
    const cloneFrame=clone.querySelector('.unit-frame-layer');
    const sourceFrameStyle=getComputedStyle(frameLayer);
    if(cloneFrame){
      cloneFrame.style.setProperty('width',`${frameRect.width}px`,'important');
      cloneFrame.style.setProperty('height',`${frameRect.height}px`,'important');
      cloneFrame.style.setProperty('max-width',`${frameRect.width}px`,'important');
      cloneFrame.style.setProperty('max-height',`${frameRect.height}px`,'important');
      cloneFrame.style.setProperty('transform','translate(-50%,-50%)','important');
      // 元カードはゲーム全体の scale 配下、攻撃複製は body 直下にある。
      // ここを2px固定にすると複製だけ実表示が 1/scale 倍太くなるため、
      // デザイン上の2pxへ現在のゲーム倍率を掛けて同じ見た目にする。
      const motionFrameBorderPx=2*gameScale;
      cloneFrame.style.setProperty('border',`${motionFrameBorderPx}px solid #c49a6c`,'important');
      cloneFrame.style.setProperty('border-width',`${motionFrameBorderPx}px`,'important');
      cloneFrame.style.setProperty('background-origin','border-box','important');
      cloneFrame.style.setProperty('background-image',sourceFrameStyle.backgroundImage,'important');
      cloneFrame.style.setProperty('background-size',sourceFrameStyle.backgroundSize||'100% 100%','important');
      cloneFrame.style.setProperty('background-position',sourceFrameStyle.backgroundPosition||'center','important');
      cloneFrame.style.setProperty('background-repeat','no-repeat','important');
      cloneFrame.style.setProperty('border-radius',sourceFrameStyle.borderRadius||'5.65% / 3.721%','important');
      cloneFrame.style.setProperty('clip-path',`inset(0 round ${sourceFrameStyle.borderRadius||'5.65% / 3.721%'})`,'important');
    }
    // stat_overlay は元盤面ではゲーム全体の scale 配下だが、攻撃複製は body 直下に置く。
    // CSS変数の設計pxをそのまま使うと実寸より大きくなり、下端の表示がカード外へ逃げる。
    // 枠画像と同じ実測矩形へ固定し、複製でも必ず枠の前面に残す。
    const sourceOverlay=fromEl.querySelector('.unit-stat-overlay-layer');
    const cloneOverlay=clone.querySelector('.unit-stat-overlay-layer');
    if(sourceOverlay&&cloneOverlay){
      const sourceOverlayStyle=getComputedStyle(sourceOverlay);
      cloneOverlay.style.setProperty('display','block','important');
      cloneOverlay.style.setProperty('visibility','visible','important');
      cloneOverlay.style.setProperty('opacity','1','important');
      cloneOverlay.style.setProperty('width',`${frameRect.width}px`,'important');
      cloneOverlay.style.setProperty('height',`${frameRect.height}px`,'important');
      cloneOverlay.style.setProperty('max-width',`${frameRect.width}px`,'important');
      cloneOverlay.style.setProperty('max-height',`${frameRect.height}px`,'important');
      cloneOverlay.style.setProperty('transform','translate(-50%,-50%)','important');
      cloneOverlay.style.setProperty('background-image',sourceOverlayStyle.backgroundImage||'url("assets/cards/status_overlay.png")','important');
      cloneOverlay.style.setProperty('background-size','100% 100%','important');
      cloneOverlay.style.setProperty('background-position','center','important');
      cloneOverlay.style.setProperty('background-repeat','no-repeat','important');
      cloneOverlay.style.setProperty('z-index','5','important');
      cloneOverlay.style.setProperty('border-radius',sourceFrameStyle.borderRadius||'5.65% / 3.721%','important');
      cloneOverlay.style.setProperty('clip-path',`inset(0 round ${sourceFrameStyle.borderRadius||'5.65% / 3.721%'})`,'important');
    }
  }
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
  // 攻撃クローンはbody直下へ移すため、マナ数値（.activation-cost-entry b）が
  // カード側の相対レイアウトを失うと巨大化することがある。元カードの実寸・文字サイズを
  // そのままクローンへコピーして、通常表示と同じ大きさを維持する。
  const srcCosts=fromEl.querySelector('.card-activation-costs');
  const dstCosts=clone.querySelector('.card-activation-costs');
  if(srcCosts&&dstCosts){
    const srcCostRect=srcCosts.getBoundingClientRect();
    const cloneRect=clone.getBoundingClientRect();
    dstCosts.style.setProperty('left',`${srcCostRect.left-fr.left}px`,'important');
    dstCosts.style.setProperty('top',`${srcCostRect.top-fr.top}px`,'important');
    dstCosts.style.setProperty('width',`${srcCostRect.width}px`,'important');
    dstCosts.style.setProperty('height',`${srcCostRect.height}px`,'important');
    dstCosts.querySelectorAll('.activation-cost-entry').forEach((srcEntry,i)=>{
      const dstEntry=clone.querySelectorAll('.activation-cost-entry')[i];
      if(!dstEntry) return;
      const er=srcEntry.getBoundingClientRect();
      const b=srcEntry.querySelector('b');
      const dstB=dstEntry.querySelector('b');
      dstEntry.style.setProperty('left',`${er.left-srcCostRect.left}px`,'important');
      dstEntry.style.setProperty('top',`${er.top-srcCostRect.top}px`,'important');
      dstEntry.style.setProperty('width',`${er.width}px`,'important');
      dstEntry.style.setProperty('height',`${er.height}px`,'important');
      if(b&&dstB){
        const bs=getComputedStyle(b);
        dstB.style.setProperty('font-size',`${parseFloat(bs.fontSize)||19.84}px`,'important');
        dstB.style.setProperty('line-height',bs.lineHeight||'1','important');
      }
    });
  }
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
  // 元スロットが前衛カード用の overflow:visible を持つ場合でも、body直下へ
  // 移した攻撃クローンの子要素が左上へ飛び出して残らないよう、カード外を切る。
  clone.style.setProperty('overflow','hidden','important');
  clone.style.transform='translate(0,0)';
  clone.style.transformOrigin='center center';
  // body直下のfixed要素にビューポート座標のinsetを指定すると、カード自身の領域を
  // 切り抜いてしまい、攻撃者が「消えた」ように見える。そのため複製カード自身のクリップは
  // 常に解除する（元スロットのclip-pathを引き継がせない）。背景外へのはみ出しは、
  // 追加先である#vfx-clip-root側のclip-pathでまとめて切るため、これで二重に困ることはない。
  clone.style.clipPath='none';
  return clone;
}


// ── 奪ったキャラの移動 ────────────────────────────────────
// **ワープさせない。** 敵陣に居た位置から、味方陣の新しい位置まで
// 攻撃モーションと同じ「動く複製」で運ぶ（利用者指定）。
//
// 順番が肝心：
//   1) **盤面を動かす前**に、いま見えている位置から複製を作って置く。
//   2) その複製が居る間に盤面を詰め直す（applyBoard）。実スロットは
//      renderField() が「複製が生きている＝motion-hidden」で自動的に隠す。
//   3) 新しいスロットの位置まで複製を運び、着いたら複製を消して実スロットを出す。
// これを守らないと、詰め直した瞬間に移動先へカードが現れてから動く（＝ワープに見える）。
// 攻撃モーション（G._battleMotionDepth）が終わるのを待つ。
// **必ず時間切れを持つこと。** 数え違いで depth が残ると戦闘の再生ごと止まる。
function _waitForBattleMotionIdle(timeoutMs){
  const limit=Math.max(0,Number(timeoutMs)||0);
  if(!(Number(G&&G._battleMotionDepth)>0)) return Promise.resolve();
  return new Promise(resolve=>{
    const start=performance.now();
    const tick=()=>{
      if(!(Number(G&&G._battleMotionDepth)>0)||performance.now()-start>=limit){ resolve(); return; }
      window.setTimeout(tick,30);
    };
    tick();
  });
}
// 奪う演出：対象の上で出す絵と音（キャラクターNo.で引く）と、動き出すまでの間。
const STEAL_CAST_CODE='C115';
const STEAL_CAST_HOLD_MS=1000;
const STEAL_MOVE_MS=520;
const STEAL_MOVE_EASING='cubic-bezier(.3,.05,.2,1)';
// ── 奪われる体を、演出が始まるまで元の位置へ留める ────────────────
// **PvEはコアと盤面配列を共有している。** コアは1手ぶんを全部解決してから
// イベントを再生するので、`unit_stolen` が届く頃には**とっくに移動先へ描かれている**
// （実測：unit_stolen の時点で敵側のスロットは無く、味方側のスロットが既にある）。
// そのままでは何を動かしてもワープに見えるので、**再生を始める前**に
// 「いま見えている位置」へ複製を貼り付け、実スロットは描かせないようにする。
// この複製が、そのまま奪う移動で運ばれる複製になる。
// 詰め直し（FLIP）の途中でも「落ち着いた先の位置」を返す。
// FLIPは実レイアウトを終点に置いたうえで transform で移動元へずらしている。
// getBoundingClientRect() に transform の行列を手計算で戻すと、再描画をまたいだ
// 移動状態で補正を二重にすることがあるため、測定中だけ transform を無効化する。
// **待たずに同期で測れる**のが重要（待つ間に再描画が入るとワープする）。
function _settledRectOf(el){
  if(!el) return null;
  const hadInlineTransform=el.style.getPropertyValue('transform')!=='';
  const inlineTransform=el.style.getPropertyValue('transform');
  const inlineTransformPriority=el.style.getPropertyPriority('transform');
  const hadInlineTransition=el.style.getPropertyValue('transition')!=='';
  const inlineTransition=el.style.getPropertyValue('transition');
  const inlineTransitionPriority=el.style.getPropertyPriority('transition');
  let r=null;
  try{
    el.style.setProperty('transform','none','important');
    el.style.setProperty('transition','none','important');
    r=el.getBoundingClientRect();
  }finally{
    if(hadInlineTransform) el.style.setProperty('transform',inlineTransform,inlineTransformPriority);
    else el.style.removeProperty('transform');
    if(hadInlineTransition) el.style.setProperty('transition',inlineTransition,inlineTransitionPriority);
    else el.style.removeProperty('transition');
  }
  if(!r||!r.width||!r.height) return null;
  return _copyBattleVisualRect(r);
}
// **同期で完結させること。** ここで await すると、その隙の再描画で
// カードが移動先へ現れてしまう（＝ワープ）。
function beginUnitStealPresentation(unit, fromSide){
  if(!unit||unit._stealPresent||!document.body) return false;
  if(typeof getCurrentUnitSlot!=='function') return false;
  const el=getCurrentUnitSlot(fromSide==='p2'?'enemy':'ally',unit);
  // 奪取元は現在画面に見えている位置から運ぶ。FLIP中でも、ここでは
  // transformを外した終点ではなく、実際に表示されている矩形が必要。
  const r=el&&el.getBoundingClientRect();
  if(!el||!r) return false;
  const clone=_buildMotionCardClone(el,r);
  clone.style.margin='0';
  clone.style.zIndex='10000';
  clone.style.pointerEvents='none';
  (document.body||document.documentElement).appendChild(clone);
  clone.getBoundingClientRect();
  unit._stealPendingPresent=true;
  const field=el.closest('#f-enemy,#f-ally');
  // is-rear は敵側の描画補助クラスで、味方側には付かない。レーンは
  // DOMの見た目ではなく、コア／配置が持つユニット属性を唯一の根拠にする。
  const lane=unit.lane==='rear'?'rear':'front';
  const fieldUnits=fromSide==='p2'?(G.enemies||[]):(G.allies||[]);
  const slotLane=slot=>{
    if(!slot) return 'front';
    if(String(slot.dataset.unitId)===String(unit.id)) return lane;
    const slotUnit=fieldUnits.find(x=>x&&String(x.id)===String(slot.dataset.unitId));
    return slotUnit&&slotUnit.lane==='rear'?'rear':'front';
  };
  const laneSlots=field?[...field.querySelectorAll('.slot[data-unit-id]')]
    .filter(slot=>slotLane(slot)===lane)
    .sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left):[];
  const position=Math.max(0,laneSlots.indexOf(el));
  const fromList=fromSide==='p2'?(G.enemies||[]):(G.allies||[]);
  unit._stealPresent={clone,rect:_copyBattleVisualRect(r),
    // PvEはコアと配列を共有するため、この時点で元配列から既に抜けている。
    // オンラインはイベント再生時に抜くので、まだ実カード自身が元の枠を占めている。
    // 後者へ描画用の空席まで足すと二重に数えて敵盤面を動かしてしまう。
    origin:{side:fromSide,lane,position,released:false,detached:!fromList.includes(unit)}};
  el.classList.add('motion-hidden');
  el.style.setProperty('visibility','hidden','important');
  return true;
}
async function playUnitStealMotion(unit, fromSide, toSide, applyBoard, durationMs){
  const sideName=s=>s==='p2'?'enemy':'ally';
  const run=typeof applyBoard==='function'?applyBoard:()=>{};
  if(!unit||!document.body){ run(); return false; }
  // **走っている攻撃モーションが終わってから始める。**
  // 途中で割り込むと、飛んでいる複製と奪う複製が同じカードを取り合い、
  // 攻撃のアニメーションが消えたり、着地先に二重に見えたりする。
  await _waitForBattleMotionIdle(1200);
  // 再生前に貼り付けておいた複製があれば、それをそのまま運ぶ（PvE）。
  // 無ければ、いま見えている元スロットから作る（オンラインはこちら）。
  // オンライン側もPvEと同じ事前保持を使う。元スロットから直接複製するだけだと
  // 移動先の実カードが待機中からレイアウト人数へ入り、発動元や既存の味方を
  // 先に動かしたうえ、着地後に奪ったカード自身もFLIPでもう一度ずれる。
  if(!unit._stealPresent&&typeof beginUnitStealPresentation==='function'){
    beginUnitStealPresentation(unit,fromSide);
  }
  const pre=unit._stealPresent;
  let fromEl=null, fr=pre?pre.rect:null, clone=pre?pre.clone:null;
  if(!clone){
    fromEl=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(sideName(fromSide),unit):null;
    fr=fromEl&&fromEl.getBoundingClientRect();
    if(!fromEl||!fr||!fr.width||!fr.height){ run(); return false; }
    clone=_buildMotionCardClone(fromEl,fr);
    clone.style.margin='0';
    clone.style.zIndex='10000';
    clone.style.pointerEvents='none';
    fromEl.classList.add('motion-hidden');
    fromEl.style.setProperty('visibility','hidden','important');
    (document.body||document.documentElement).appendChild(clone);
    clone.getBoundingClientRect();
  }
  unit._motionHidden=true;
  // **発動時：対象の上でC115を再生し、1秒置いてから動き出す。**（利用者指定）
  // 動き出しと同時に盤面を詰める。詰めを先にすると、まだ元の位置に貼り付いている
  // カードの上へ他の敵が寄ってきて重なる。
  const holdMs=Math.max(0,Number(STEAL_CAST_HOLD_MS)||0);
  const castPath=typeof getEffectVfxPath==='function'?getEffectVfxPath(STEAL_CAST_CODE):'';
  if(castPath&&typeof playHitVfxAtRect==='function'){
    // 完了は待たない（1秒の間に重ねて見せる）。
    // 大きさは present.js の PRESENT_VFX_SCALE（C115＝毒牙と同じ .5）。
    void playHitVfxAtRect(_copyBattleVisualRect(fr),0,
      {customVfxPath:castPath,waitForFinish:false,gateMs:0,rotation:0,
       vfxScale:(typeof presentCharacterVfxScale==='function'?presentCharacterVfxScale(STEAL_CAST_CODE):1)});
  }
  if(typeof playSfx==='function'&&typeof getEffectSfxKey==='function'){
    const key=getEffectSfxKey(STEAL_CAST_CODE);
    if(key) playSfx(key,{group:'combat'});
  }
  if(holdMs>0) await new Promise(resolve=>window.setTimeout(resolve,holdMs));
  const finish=()=>{
    clone.remove();
    unit._motionHidden=false;
    delete unit._stealPendingPresent;
    delete unit._stealPresent;
    // 奪ったカードは複製が最終地点まで運んだので、盤面詰めのFLIPを重ねない。
    // 残すと着地後に実カードへ切り替わった瞬間、さらに数px移動して見える。
    if(G._battleCompactMoves) G._battleCompactMoves.delete(String(unit.id));
    const el=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(sideName(toSide),unit):null;
    if(el){ el.classList.remove('motion-hidden'); el.style.removeProperty('visibility'); }
    if(typeof renderAll==='function') renderAll();
  };
  try{
    // **盤面を詰めるのと動き出しは同時。** 詰めを先に済ませて待つと、
    // まだ元の位置に貼り付いているカードの上へ他の敵が寄ってきて重なる。
    // 元陣営の空席保持もこの瞬間に解除する。保持したまま描き直すと、
    // 複製だけが動いて残った敵は元位置に留まり、詰めが後追いになってしまう。
    if(pre&&pre.origin) pre.origin.released=true;
    run();
    const findTo=()=>typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(sideName(toSide),unit):null;
    let toEl=findTo();
    // 詰め直しが非同期に描く場合だけ、スロットができるのを1フレーム分待つ。
    if(!toEl){ await new Promise(resolve=>window.setTimeout(resolve,32)); toEl=findTo(); }
    // **着地点も「落ち着いた先の位置」で測る。**
    // 詰め直しは残ったカードを260msかけて動かすので、素の矩形だと
    // 「まだ動いている最中の位置」へ運んでしまい、あとから本来の位置へ跳ねる。
    const to=_settledRectOf(toEl);
    if(!to){ finish(); return false; }
    const dx=to.left-fr.left, dy=to.top-fr.top;
    if(Math.abs(dx)<2&&Math.abs(dy)<2){ finish(); return false; }
    const ms=Math.max(1,Number(durationMs)||STEAL_MOVE_MS);
    // **Web Animations APIで運ぶ。** CSSのtransitionは、複製が持ち込んだ
    // インラインの transition/transform に上書きされることがあり、
    // 途中で飛んだり効かなかったりする。keyframeで始点と終点を明示する。
    clone.style.transition='none';
    let anim=null;
    try{
      anim=clone.animate(
        [{transform:'translate3d(0,0,0)'},{transform:`translate3d(${dx}px,${dy}px,0)`}],
        {duration:ms,easing:STEAL_MOVE_EASING,fill:'forwards'});
    }catch(e){ clone.style.transform=`translate3d(${dx}px,${dy}px,0)`; }
    // 実機で見え方を確かめられるよう、始点・終点と実際の再生状態を残す。
    G._vbStealProbe={from:{left:Math.round(fr.left),top:Math.round(fr.top)},
      to:{left:Math.round(to.left),top:Math.round(to.top)},dx:Math.round(dx),dy:Math.round(dy),
      durationMs:ms,playState:anim?anim.playState:'no-anim'};
    await new Promise(resolve=>window.setTimeout(resolve,ms+30));
    if(G._vbStealProbe&&anim) G._vbStealProbe.endState=anim.playState;
  }catch(e){ /* 演出の失敗で盤面を止めない */ }
  finish();
  return true;
}

// 攻撃効果で召喚・死亡が起き、並びのFLIPが始まった場合だけ、
// 対象が終点へ着くまで待つ。rAFが止まるタブでも戦闘を止めないよう上限を持つ。
function _attackLayoutIsMoving(){
  const now=performance.now();
  const compactUntil=Math.max(0,Number(G&&G._battleCompactAnimatingUntil)||0);
  // transition開始は描画の次フレームなので、記録した260msに
  // 2フレーム分の余裕を足し、実スロットのtransformが終わるまで移動中とする。
  return !!(G&&G._animateBattleCompact)||now<compactUntil+34;
}
function _waitForAttackLayoutSettled(timeoutMs){
  const limit=Math.max(0,Number(timeoutMs)||900);
  const started=performance.now();
  return new Promise(resolve=>{
    const poll=()=>{
      const now=performance.now();
      const compactUntil=Math.max(0,Number(G&&G._battleCompactAnimatingUntil)||0);
      const moving=_attackLayoutIsMoving();
      if(!moving||now-started>=limit){ resolve(!moving); return; }
      window.setTimeout(poll,Math.min(34,Math.max(8,compactUntil+34-now)));
    };
    poll();
  });
}

// 2026-10-10 利用者報告：連続・割り込み攻撃でも同じIDの動くカードは1枚だけ。
// 古いモーションの終了処理が新しいモーションの実枠を再表示しないよう、所有者を持つ。
const _attackMotionOwners=new Map();
function _playAttackMotionCore(attacker,target,isEnemySide,onImpactPause,options){
  if(!attacker||!target||!document.body) return Promise.resolve();
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_start',{
    attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
  });
  const opt=options||{};
  const layoutAtStart=typeof _battleLayoutSignature==='function'?_battleLayoutSignature():'';
  const fromList=isEnemySide?G.enemies:G.allies;
  const ownLiveCountAtStart=(fromList||[]).filter(u=>u&&u.hp>0).length;
  // **対象は相手陣営とは限らない。** ピクシーで操られた敵は同じ陣営の敵を殴る。
  // 相手陣営に見つからなければ、同じ陣営から探す（見つけた側の盤面へ飛ばす）。
  const foeList=isEnemySide?G.allies:G.enemies;
  const hasTarget=list=>!!list&&(list.includes(target)
    ||(target.id!=null&&list.some(u=>u&&u.id===target.id)));
  const targetOnFoeSide=hasTarget(foeList);
  const toList=targetOnFoeSide?foeList:fromList;
  let fromIdx=fromList.indexOf(attacker);
  let toIdx=toList.indexOf(target);
  if(fromIdx<0&&attacker.id) fromIdx=fromList.findIndex(u=>u&&u.id===attacker.id);
  if(toIdx<0&&target.id) toIdx=toList.findIndex(u=>u&&u.id===target.id);
  if(fromIdx<0||toIdx<0) return Promise.resolve();
  const fromField=document.getElementById(isEnemySide?'f-enemy':'f-ally');
  const toField=document.getElementById(targetOnFoeSide?(isEnemySide?'f-ally':'f-enemy')
    :(isEnemySide?'f-enemy':'f-ally'));
  // 召喚・死亡後の詰め直しでは配列インデックスが同一フレーム内に更新される。
  // インデックスを先に使うと、攻撃対象の配列位置とDOM上のカードが一時的に
  // 食い違い、別キャラクターの攻撃モーションを表示することがある。IDを正とし、
  // IDがない旧ユニットだけインデックスへフォールバックする。
  const byUnitId=(field,unit)=>unit&&unit.id!=null
    ?[...(field?.querySelectorAll('.slot[data-unit-id]')||[])].find(el=>el.dataset.unitId===String(unit.id))||null
    :null;
  const fromEl=byUnitId(fromField,attacker)||fromField?.querySelector(`.slot[data-unit-idx="${fromIdx}"]`)||getCurrentUnitSlot(isEnemySide?'enemy':'ally',fromIdx);
  const toEl=byUnitId(toField,target)||toField?.querySelector(`.slot[data-unit-idx="${toIdx}"]`)||getCurrentUnitSlot(isEnemySide?'ally':'enemy',toIdx);
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_dom_resolve',{
    attackerId:attacker&&attacker.id,targetId:target&&target.id,
    sourceDomId:fromEl?.dataset?.unitId||null,targetDomId:toEl?.dataset?.unitId||null,
    sourceIdx:fromEl?.dataset?.unitIdx||null,targetIdx:toEl?.dataset?.unitIdx||null
  });
  // 即時攻撃はコア側で命中・死亡まで確定してから再生されるため、対象DOMが
  // 先に空枠へ置き換わる場合がある。死亡直前の矩形が渡されていれば、攻撃者の
  // モーションだけは従来どおり再生し、対象DOMの存在を必須にしない。
  const targetRectOverride=opt.targetRect&&opt.targetRect.width>0&&opt.targetRect.height>0
    ?opt.targetRect:null;
  if(!fromEl||(!toEl&&!targetRectOverride)) return Promise.resolve();
  // 攻撃者自身は、接触中の敵死亡による盤面詰め直しから除外する。
  // ここを攻撃終了後だけにすると、onContact 内の死亡処理で先にFLIPが付き、
  // 複製カードの戻り動作と重なって「跳ねてから戻る」ように見える。
  const compactHold=G._suppressCompactUnitIds||(G._suppressCompactUnitIds=new Set());
  if(attacker.id!=null) compactHold.add(String(attacker.id));
  const fr=fromEl.getBoundingClientRect();
  const tr=targetRectOverride||_getAttackTargetRect(toEl);
  const dx=(tr.left+tr.width/2)-(fr.left+fr.width/2);
  const dy=(tr.top+tr.height/2)-(fr.top+fr.height/2);
  const dist=Math.hypot(dx,dy)||1;
  const overlap=Math.min(fr.width,tr.width)*0.33;
  const ratio=Math.max(0,dist-overlap)/dist;
  const mx=dx*ratio;
  const my=dy*ratio;
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_rects',{
    attackerId:attacker.id,targetId:target.id,
    openingLayoutSettledAt:Number(G&&G._battleOpeningLayoutSettledAt)||null,
    sourceRect:_copyBattleVisualRect(fr),
    targetRect:_copyBattleVisualRect(tr),
    dx,dy,mx,my,dist,ratio,
    motionDepth:Number(G&&G._battleMotionDepth)||0
  });
  const tilt=Math.abs(dx)<Math.max(6,fr.width*0.15)?0:(dx>0?4:-4)*(isEnemySide?-1:1);
  const clone=_buildMotionCardClone(fromEl, fr);
  const motionKey=String(attacker.id);
  const previousOwner=_attackMotionOwners.get(motionKey);
  // 攻撃効果の途中（25%で止めている間）に本人が割り込み攻撃をする場合（ミノタウロスの負傷→攻撃等）、
  // 止めている本来の一撃は取り消さずに隠して残し、割り込み攻撃はその止めた位置から出て同じ位置へ戻る。
  // 割り込みが終わったら本来の一撃を再表示し、解放されたら続きから接触する（2026-10-16 利用者指摘）。
  const suspendedOwner=opt.suspendPaused&&previousOwner&&previousOwner.paused?previousOwner:null;
  if(suspendedOwner) suspendedOwner.clone.style.setProperty('opacity','0','important');
  else if(previousOwner){ previousOwner.cancel(); previousOwner.clone.remove(); }
  const homeTransform=suspendedOwner&&suspendedOwner.clone.style.transform||'translate(0,0) rotate(0deg)';
  let cancelled=false, cancelPause=()=>{};
  const cancellation=new Promise(resolve=>{ cancelPause=resolve; });
  const motionOwner={clone,paused:false,cancel:()=>{ cancelled=true; cancelPause({abort:true}); }};
  _attackMotionOwners.set(motionKey,motionOwner);
  attacker._motionHidden=true;
  fromEl.classList.add('motion-hidden');
  fromEl.style.setProperty('visibility','hidden','important');
  // 攻撃モーションの複製カードはVFXではないので、背景で切り抜く入れ物へは入れない
  // （切り抜くと、盤面の端のカードが動いた時に欠ける）。
  (document.body||document.documentElement).appendChild(clone);
  clone.getBoundingClientRect();
  const stopRatio=Number.isFinite(opt.stopRatio)?opt.stopRatio:1;
  const getCurrentTargetEl=()=>{
    // 対象が同じ陣営のこともある（ピクシーで操られた敵）。見つけた側の盤面を使う。
    const side=targetOnFoeSide?(isEnemySide?'ally':'enemy'):(isEnemySide?'enemy':'ally');
    const current=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,target):null;
    return current||(toEl?.isConnected?toEl:null);
  };
  const getTargetMotionTransform=(targetRatio)=>{
    const currentTargetEl=getCurrentTargetEl();
    const currentTargetRect=currentTargetEl?_getAttackTargetRect(currentTargetEl):null;
    if(!currentTargetRect) return null;
    const nextDx=(currentTargetRect.left+currentTargetRect.width/2)-(fr.left+fr.width/2);
    const nextDy=(currentTargetRect.top+currentTargetRect.height/2)-(fr.top+fr.height/2);
    const nextDist=Math.hypot(nextDx,nextDy)||1;
    const nextOverlap=Math.min(fr.width,currentTargetRect.width)*0.33;
    const nextRatio=Math.max(0,nextDist-nextOverlap)/nextDist;
    const nextTilt=Math.abs(nextDx)<Math.max(6,fr.width*0.15)?0:(nextDx>0?4:-4)*(isEnemySide?-1:1);
    return `translate(${nextDx*nextRatio*targetRatio}px,${nextDy*nextRatio*targetRatio}px) rotate(${nextTilt}deg)`;
  };
  const getAttackerReturnTransform=()=>{
    // 攻撃効果中の召喚・死亡で攻撃者のスロットが変わった場合も、
    // 複製を固定した開始位置ではなく、現在の最終スロットへ戻す。
    const side=isEnemySide?'enemy':'ally';
    const currentList=isEnemySide?G.enemies:G.allies;
    const ownLiveCountNow=(currentList||[]).filter(u=>u&&u.hp>0).length;
    if(suspendedOwner) return homeTransform;
    if(ownLiveCountNow===ownLiveCountAtStart) return 'translate(0,0) rotate(0deg)';
    const current=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(side,attacker):null;
    if(!current) return 'translate(0,0) rotate(0deg)';
    const currentRect=_getAttackTargetRect(current);
    if(!currentRect) return 'translate(0,0) rotate(0deg)';
    const dx=(currentRect.left+currentRect.width/2)-(fr.left+fr.width/2);
    const dy=(currentRect.top+currentRect.height/2)-(fr.top+fr.height/2);
    return `translate(${dx}px,${dy}px) rotate(0deg)`;
  };
  const atStop=getTargetMotionTransform(stopRatio)||`translate(${mx*stopRatio}px,${my*stopRatio}px) rotate(${tilt}deg)`;
  const atHit=getTargetMotionTransform(1)||`translate(${mx}px,${my}px) rotate(${tilt}deg)`;
  const cleanup=()=>{
    // 複製を外してから実枠を戻す。同一IDの次の攻撃が始まっていたら、後始末を引き継ぐ。
    clone.remove();
    if(_attackMotionOwners.get(motionKey)!==motionOwner) return;
    if(suspendedOwner&&suspendedOwner.clone.isConnected){
      // 止めていた本来の一撃へ戻す。実枠は隠したまま（本来の一撃の後始末で戻す）。
      _attackMotionOwners.set(motionKey,suspendedOwner);
      // 本来の一撃の複製は止めた時点のATK/HPのままなので、割り込み中に変わった今の表示へ合わせてから見せる。
      // 合わせないと、ミノタウロス＋懺悔でHPが「56→57→55」のように増えたり減ったりして見えた（2026-10-19 利用者指摘）。
      _syncMotionCloneStats(suspendedOwner.clone,clone);
      suspendedOwner.clone.style.removeProperty('opacity');
      return;
    }
    _attackMotionOwners.delete(motionKey);
    if(attacker&&attacker.id!=null&&G._suppressCompactUnitIds){
      // cleanup直後のrenderAll／死亡後compactが同じフレームで走るため、
      // ここで即解除すると元カードへFLIPが付き、戻り終端で一度跳ねる。
      const id=String(attacker.id);
      window.setTimeout(()=>{
        if(_attackMotionOwners.has(id)||!G._suppressCompactUnitIds) return;
        G._suppressCompactUnitIds.delete(id);
        if(!G._suppressCompactUnitIds.size) G._suppressCompactUnitIds=null;
      },620);
    }
    if(fromEl){
      fromEl.classList.remove('motion-hidden');
      fromEl.style.removeProperty('visibility');
    }
    attacker._motionHidden=false;
    // 攻撃中に召喚・変身・FLIP再描画が走ると、G配列内の実体が差し替わる
    // ことがある。古いattacker参照だけを解除すると、新しい実体に残った
    // _motionHiddenによって攻撃後もカードがvisibility:hiddenのままになる。
    // 安定IDで現在の戦闘実体も必ず解除する。
    if(attacker&&attacker.id!=null){
      [G.allies||[],G.enemies||[]].forEach(list=>{
        list.forEach(u=>{
          if(u&&String(u.id)===String(attacker.id)) u._motionHidden=false;
        });
      });
    }
    // モーション中に（本来は起こらないはずだが）renderAll()等でフィールドが再構築され、fromElが
    // 古い（DOMから外れた）要素になっていた場合の保険。現在のDOM上のスロットも同様に復元する
    const currentEl=typeof getCurrentUnitSlot==='function'?getCurrentUnitSlot(isEnemySide?'enemy':'ally',attacker):null;
    if(currentEl&&currentEl!==fromEl){
      currentEl.classList.remove('motion-hidden');
      currentEl.style.removeProperty('visibility');
    }
    if(typeof renderAll==='function'){
      requestAnimationFrame(()=>{
        // 攻撃終了時の保険renderが、直前に開始したFLIPの詰めアニメーションを
        // 同じフレームで上書きしないようにする。
        // （2026-09-15：ここを requestBattleCompact 経由にすると、攻撃中に倒れた敵の隙間が
        //  次の死亡まで約30秒残る回帰が出たため、コミット済みの renderAll に戻した。
        //  この場合だけ隙間がモーション終了時に1フレームで詰まる問題は未解決。AGENTS.md 参照）
        if(!_attackMotionOwners.has(motionKey)&&attacker&&attacker.hp>0&&performance.now()>(Number(G._battleCompactAnimatingUntil)||0)) renderAll();
      });
    }
  };
  const runSegment=(frames,duration,dynamicEnd)=>{
    // 攻撃モーションも戦闘演出の速度（オプション「高速」＝1.5倍、PvEの自動加速）に合わせる（利用者指定）。
    // 短くしすぎると接触前にカードが瞬間移動したように見えるので、下限180msは残す。
    const presentationSpeed=typeof getBattlePresentationSpeedScale==='function'?getBattlePresentationSpeedScale():1;
    const scaledDuration=Math.max(180,duration/presentationSpeed);
    const parseTransform=value=>{
      const tm=String(value||'').match(/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/);
      const rm=String(value||'').match(/rotate\(\s*(-?[\d.]+)deg\s*\)/);
      return {x:tm?Number(tm[1]):0,y:tm?Number(tm[2]):0,r:rm?Number(rm[1]):0};
    };
    const start= parseTransform(frames[0]?.transform);
    const staticEnd=parseTransform(frames[frames.length-1]?.transform);
    // 終点が途中で変わる場合は、前フレームの現在位置から残り進捗ぶんだけ
    // 新しい終点へ近づける。固定した始点から毎回引き直すと、召喚・死亡で
    // 対象枠が変わった瞬間に攻撃カードが横へ跳ねる。
    let current={...start};
    let previousEased=0;
    clone.style.setProperty('transition','none','important');
    clone.style.transform=frames[0]?.transform||'translate(0,0) rotate(0deg)';
    return new Promise(resolve=>{
      let done=false;
      // 起点は「予約した時刻」ではなく「最初のフレームが実際に来た時刻」。
      // ゲーム起動直後はカード絵・VFXのデコードでメインスレッドが数百ms止まることがあり、
      // 予約時刻から測ると1フレーム目で既に経過時間が尺を超えていて終端へ飛ぶ。
      // ＝最初の数戦だけ、最初の数体の攻撃モーションが再生されずワープして見える。
      let startedAt=null;
      // rAFが来ないまま止まる環境（非表示タブ等）の保険。最初のフレームが来たら
      // 正確な尺へ張り直す。ここを短くすると上と同じ「飛ぶ」症状に戻るので注意。
      let fallbackTimer=setTimeout(()=>{ if(!done) finish(); },scaledDuration+2000);
      const finish=()=>{
        if(done) return;
        done=true;
        if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer=null; }
        const end=dynamicEnd?parseTransform(dynamicEnd()):staticEnd;
        clone.style.transform=`translate(${end.x}px,${end.y}px) rotate(${end.r}deg)`;
        resolve();
      };
      const tick=now=>{
        if(done) return;
        if(startedAt===null){
          startedAt=now;
          if(fallbackTimer) clearTimeout(fallbackTimer);
          fallbackTimer=setTimeout(()=>{ if(!done) finish(); },scaledDuration+80);
          // 1フレーム目は必ず開始姿勢のまま。ここで進捗を計算すると
          // now===startedAt でp=0になるだけだが、意図を明示しておく。
        }
        if(cancelled){ finish(); return; }
        const p=Math.max(0,Math.min(1,(now-startedAt)/scaledDuration));
        // 攻撃モーション本来の加速・減速を戻す。
        const eased=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
        const end=dynamicEnd?parseTransform(dynamicEnd()):staticEnd;
        let x,y,r;
        if(dynamicEnd){
          const rest=Math.max(0,1-previousEased);
          const alpha=rest>0?Math.max(0,Math.min(1,(eased-previousEased)/rest)):1;
          current={
            x:current.x+(end.x-current.x)*alpha,
            y:current.y+(end.y-current.y)*alpha,
            r:current.r+(end.r-current.r)*alpha,
          };
          previousEased=eased;
          ({x,y,r}=current);
        }else{
          x=start.x+(end.x-start.x)*eased;
          y=start.y+(end.y-start.y)*eased;
          r=start.r+(end.r-start.r)*eased;
        }
        clone.style.transform=`translate(${x}px,${y}px) rotate(${r}deg)`;
        if(p>=1){ finish(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  return (async()=>{
    try{
      if(typeof onImpactPause==='function'){
        // 攻撃効果は「少し動き出した時点」で発動させる（stopRatio＝既定25%）。
        // ここで全行程を進めてから止めると、カードが相手に密着したまま
        // 効果の間だけ固まって見え、効果の発動も一拍遅れて感じられる。
        // firstDuration＝踏み込み、secondDuration＝残りの間合いを詰める分。
        await runSegment([
          {transform:'translate(0,0) rotate(0deg)'},
          {transform:atStop},
        ],opt.firstDuration||260);
        if(cancelled) return;
        motionOwner.paused=true;
        const pauseResult=await Promise.race([onImpactPause(),cancellation]);
        motionOwner.paused=false;
        if(cancelled) return;
        if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_effect_pause',{
          attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
        });
        // グレムリンやギガンテス等、一時停止中にステータス変化を行う効果がある場合、
        // 攻撃を再開する前に背景側の実スロット全体も最新値へ同期する。
        if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
        // 飛んでいる複製の数値も**画面に出してよい値**を使う。実体を直に読むと、
        // まだ見せていない反撃ダメージが、止まった瞬間に攻撃者のHPへ入って見える。
        const _cAtk=Math.max(0,typeof presentShownAtk==='function'?presentShownAtk(attacker):(attacker.atk||0));
        const _cHp=Math.max(0,typeof presentShownHp==='function'?presentShownHp(attacker):(attacker.hp||0));
        const cloneAtkEl=clone.querySelector('.slot-stats .a');
        _setUnitStatText(cloneAtkEl,_cAtk,_cHp);
        const cloneHpEl=clone.querySelector('.slot-stats .h');
        _setUnitStatText(cloneHpEl,_cHp,_cAtk);
        const cloneLifeFill=clone.querySelector('.slot-life-fill');
        if(cloneLifeFill){
          const cloneMaxHp=typeof presentShownMaxHp==='function'?presentShownMaxHp(attacker)
            :Math.max(1,Number(attacker.maxHp)||Number(attacker.hp)||1);
          cloneLifeFill.style.width=`${Math.max(0,Math.min(1,_cHp/cloneMaxHp))*100}%`;
        }
        if(pauseResult&&pauseResult.abort){
          let stableReturnTransform=null;
          const stableReturn=()=>stableReturnTransform||(stableReturnTransform=getAttackerReturnTransform());
          await runSegment([
            {transform:atStop},
            {transform:'translate(0,0) rotate(0deg)'},
          ],opt.returnDuration||420,stableReturn);
          return;
        }
        // 攻撃効果で並びが増減したら、死亡演出中に保留された詰めも
        // ここで共通入口から流す。この時点で攻撃前効果は全て見せ終わっているため、
        // 旧配置に数値・VFXを出す必要はもう無い。FLIPの終了後に対象へ向かう。
        const layoutNow=typeof _battleLayoutSignature==='function'?_battleLayoutSignature():layoutAtStart;
        const layoutChanged=layoutNow!==layoutAtStart;
        const compactPending=!!(G&&G._pendingBattleCompact);
        const domOutOfSync=typeof _battleDomLayoutMatchesUnits==='function'
          ?!_battleDomLayoutMatchesUnits():false;
        const compactWasMoving=_attackLayoutIsMoving();
        // 死亡ケースはコアが攻撃モーション開始前に最終HPまで解決するため、
        // 配列シグネチャは前後で同じになり得る。DOMとの不一致はここで必ず流す。
        if((compactPending||domOutOfSync)&&typeof requestBattleCompact==='function'){
          // 保留分をこの場で引き受ける。まだ死亡効果処理中なら
          // requestBattleCompact()側が再度保留するので、その状態は失わない。
          G._pendingBattleCompact=false;
          G._pendingBattleRender=false;
          requestBattleCompact({forceDuringMotion:true,forceRender:true});
        }
        const shouldWait=layoutChanged||compactPending||domOutOfSync
          ||compactWasMoving||_attackLayoutIsMoving();
        if(shouldWait) await _waitForAttackLayoutSettled(900);
        // 効果を出し終えてから残りの間合いを詰めて接触する。
        // 召喚の描画が効果待ちの終端と同じフレームに入る場合があるため、
        // 対象はunitIdで接触直前まで取り直す。runSegment側が現在位置から
        // 滑らかに追従させるので、三段攻撃中の詰め直しでも横へ跳ねない。
        const resumedHit=getTargetMotionTransform(1)||atHit;
        await runSegment([
          {transform:atStop},
          {transform:resumedHit},
        ],opt.secondDuration||360,()=>getTargetMotionTransform(1)||resumedHit);
      } else {
        await runSegment([
          {transform:homeTransform},
          {transform:atHit},
        ],opt.firstDuration||420);
      }
      if(cancelled) return;
      // 接触した瞬間のフック。戻りモーション（returnDuration）を待つと画面揺れが
      // 体感で1テンポ遅れるため、ここで呼ぶ。
      if(typeof _recordBattleTrace==='function'){
        const contactTargetEl=getCurrentTargetEl();
        // 検査用の targetCenter は終点補正値ではなく、接触したその瞬間に
        // 画面上で見えている対象枠を記録する。同じ補正関数どうしを比べると、
        // FLIP途中に外れていても検査が通るため。
        const contactTargetRect=contactTargetEl?.getBoundingClientRect?.()||null;
        const settledTargetRect=contactTargetEl?_getAttackTargetRect(contactTargetEl):null;
        const contactMotionRect=clone.getBoundingClientRect();
        const center=rect=>rect?{
          x:rect.left+rect.width/2,y:rect.top+rect.height/2,
          width:rect.width,height:rect.height,
        }:null;
        _recordBattleTrace('attack_motion_contact',{
          attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide,
          targetDomId:contactTargetEl?.dataset?.unitId||null,
          motionCenter:center(contactMotionRect),targetCenter:center(contactTargetRect),
          settledTargetCenter:center(settledTargetRect),
        });
      }
      if(typeof opt.onHit==='function'){ try{ opt.onHit(); }catch(e){ console.error('[attackMotion onHit]',e); } }
      // 攻撃効果の一時停止（onImpactPause）とは別に、実際の接触時点で
      // ダメージ・反撃を適用する。ここをawaitしても戻りモーションだけが
      // 後続処理を待つため、接触時刻とダメージ時刻が一致する。
      if(typeof opt.onContact==='function') await opt.onContact();
      let stableReturnTransform=null;
      const stableReturn=()=>stableReturnTransform||(stableReturnTransform=getAttackerReturnTransform());
      const returnStart=clone.style.transform||atHit;
      await runSegment([
        {transform:returnStart},
        {transform:homeTransform},
      ],opt.returnDuration||480,stableReturn);
    } finally {
      cleanup();
      if(typeof _recordBattleTrace==='function') _recordBattleTrace('attack_motion_end',{
        attackerId:attacker.id,targetId:target.id,isEnemySide:!!isEnemySide
      });
    }
  })();
}

function playAttackMotion(attacker,target,isEnemySide,onImpact,options){
  return _playAttackMotionCore(attacker,target,isEnemySide,onImpact,{
    firstDuration:320,
    returnDuration:340,
    ...(options||{}),
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
