// ═══════════════════════════════════════
// pointer_drag.js — マウス操作から組み立てるドラッグ
// ═══════════════════════════════════════
// **ブラウザ標準のドラッグは使わない。**（利用者指定）
// 標準ドラッグの最中はブラウザが CSS の cursor を無視して自前のカーソルを出すため、
// 掴んだ瞬間からブラウザのカーソルが見えていた。
//
// 置き先の受け付け（dragover／drop）や画面全体の片付け（dragend）は、各画面に約50か所ある。
// それらは書き換えず、**標準ドラッグと同じ種類・同じ順番のイベント**をここから送る。
//   押す → 4px以上動く → dragstart（元の要素。取り消されたら始めない）
//   動かす → drag（元の要素）／dragleave・dragenter・dragover（マウスの下の要素）
//   離す → 置き先が dragover を取り消していれば drop → dragend（元の要素）
// pointercancel・Esc・フォーカスを失う時は drop せず dragend だけ送る。
// イベントの中身は標準ドラッグと同じ形（clientX/Y・dataTransfer・relatedTarget）なので、
// 既存の検査が DragEvent を直接送る書き方もそのまま使える。
(function _initPointerDrag(){
  if(typeof window==='undefined'||typeof document==='undefined') return;
  const THRESHOLD=4;          // 押してからドラッグとみなすまでの移動量（px）
  const CLICK_GUARD_MS=400;   // ドラッグで離した直後のクリックを握りつぶす時間
  const NEAR_DROP_MS=250;     // 置き先を離れてからこの時間内に隙間で離した時だけ、直前の置き先へ落とす
  const root=document.documentElement;
  let down=null;   // {src,x,y,event}：押したがまだドラッグになっていない
  let drag=null;   // {src,dt,over,x,y,pointerId,lastAccepted}
  let suppressClickUntil=0;

  // 本物（ブラウザ標準）のドラッグ開始は、どの処理にも渡さずに止める。
  // 各カードの dragstart に届くと _dragSrc などが立ってしまうため、最も手前（window のキャプチャ）で止める。
  window.addEventListener('dragstart',e=>{
    if(!e.isTrusted) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);

  const fire=(target,type,x,y,extra)=>{
    const ev=new DragEvent(type,{
      bubbles:true,
      cancelable:type!=='dragleave'&&type!=='dragend',
      composed:true,
      clientX:x,clientY:y,screenX:x,screenY:y,
      buttons:(type==='drop'||type==='dragend')?0:1,
      dataTransfer:drag?drag.dt:null,
      ...(extra||{})
    });
    target.dispatchEvent(ev);
    return ev;
  };
  // マウスの下の要素。ドラッグ中のカードの複製は置き先ではないので除く
  // （pointer-events:none の要素は elementsFromPoint が最初から含めない＝標準ドラッグと同じ当たり方）。
  const hit=(x,y)=>(document.elementsFromPoint(x,y)||[])
    .find(el=>!(el.closest&&el.closest('.drag-ghost')))||null;

  const start=(x,y)=>{
    const {src,event}=down; down=null;
    // 押す操作が取り消されていた（チュートリアルで許可外など）なら、標準ドラッグと同じく始めない。
    if(event.defaultPrevented||!src.isConnected) return;
    drag={src,dt:new DataTransfer(),over:null,x,y,pointerId:event.pointerId,lastAccepted:null};
    const ev=fire(src,'dragstart',x,y);
    if(ev.defaultPrevented){ drag=null; return; }
    // 素早い操作や窓外での解放でも、最後の pointerup を受け取るため捕まえる。
    try{ root.setPointerCapture(drag.pointerId); }catch(_err){}
    root.classList.add('pointer-dragging');
    move(x,y);
  };
  const move=(x,y)=>{
    drag.x=x; drag.y=y;
    fire(drag.src,'drag',x,y);
    const target=hit(x,y);
    // 描き直しで古い置き先が消えた時も、新しい要素へ入り直す。
    if(target!==drag.over||!drag.over?.isConnected){
      if(drag.over&&drag.over.isConnected) fire(drag.over,'dragleave',x,y,{relatedTarget:target});
      if(target) fire(target,'dragenter',x,y,{relatedTarget:drag.over});
      drag.over=target;
    }
    if(target){
      const over=fire(target,'dragover',x,y);
      if(over.defaultPrevented){
        let rect=null;
        try{ rect=target.getBoundingClientRect(); }catch(_err){}
        if(rect) drag.lastAccepted={el:target,rect,at:performance.now()};
      }
    }
  };
  const end=(allowDrop,releaseX,releaseY)=>{
    if(!drag) return;
    const {src,x,y}=drag;
    const rx=Number.isFinite(releaseX)?releaseX:x;
    const ry=Number.isFinite(releaseY)?releaseY:y;
    let target=drag.over&&drag.over.isConnected?drag.over:null;
    if(allowDrop){
      target=hit(rx,ry);
      // pointermove の取りこぼしや盤面の描き直し後も、離した場所へ入り直す。
      if(target!==drag.over||!drag.over?.isConnected){
        if(drag.over&&drag.over.isConnected) fire(drag.over,'dragleave',rx,ry,{relatedTarget:target});
        if(target) fire(target,'dragenter',rx,ry,{relatedTarget:drag.over});
        drag.over=target;
      }
      // 離した位置でゴーストを最後に合わせてから、置き先の受付を確認する。
      fire(src,'drag',rx,ry);
    }
    let accepted=false;
    if(target){
      // 離した位置で受け付けるかを確かめ直してから落とす（標準ドラッグと同じく最後の dragover で決まる）。
      accepted=allowDrop&&fire(target,'dragover',rx,ry).defaultPrevented;
      if(accepted) fire(target,'drop',rx,ry);
      else { fire(target,'dragleave',rx,ry); drag.over=null; }
    }
    if(allowDrop&&!accepted){
      const remembered=drag.lastAccepted;
      // **素早く離した時の救済に限る。** 置き先を離れて時間が経ってからの解放まで拾うと、
      // 報酬欄（売却）のような大きな置き先の近くを通っただけで、意図しない所へ落ちる。
      if(remembered&&performance.now()-remembered.at<=NEAR_DROP_MS){
        const r=remembered.rect;
        const dx=rx<r.left?r.left-rx:rx>r.right?rx-r.right:0;
        const dy=ry<r.top?r.top-ry:ry>r.bottom?ry-r.bottom:0;
        const scale=parseFloat(getComputedStyle(root).getPropertyValue('--game-scale'))||1;
        if(Math.hypot(dx,dy)<=Math.max(12,28*scale)){
          const fallback=remembered.el.isConnected?remembered.el:
            hit((r.left+r.right)/2,(r.top+r.bottom)/2);
          if(fallback){
            const fx=Math.min(Math.max(rx,r.left),r.right);
            const fy=Math.min(Math.max(ry,r.top),r.bottom);
            if(fallback!==drag.over&&drag.over?.isConnected)
              fire(drag.over,'dragleave',fx,fy,{relatedTarget:fallback});
            fire(fallback,'dragenter',fx,fy,{relatedTarget:drag.over});
            const fallbackAccepted=fire(fallback,'dragover',fx,fy).defaultPrevented;
            if(fallbackAccepted) fire(fallback,'drop',fx,fy);
            else fire(fallback,'dragleave',fx,fy);
          }
        }
      }
    }
    fire(src,'dragend',rx,ry);
    // ドロップ後の再描画で元の要素が画面から外れていると、document 側の片付けに dragend が届かない。
    if(!src.isConnected) fire(document,'dragend',rx,ry);
    try{ root.releasePointerCapture(drag.pointerId); }catch(_err){}
    drag=null;
    root.classList.remove('pointer-dragging');
    suppressClickUntil=performance.now()+CLICK_GUARD_MS;
  };

  window.addEventListener('pointerdown',e=>{
    if(drag) end(false);
    down=null;
    if(e.button!==0||!e.isPrimary) return;
    const t=e.target instanceof Element?e.target:null;
    // 一番近い draggable 指定が true の時だけ（カード内のボタンは draggable=false で除かれている）。
    const src=t&&t.closest('[draggable]');
    if(!src||src.getAttribute('draggable')!=='true') return;
    down={src,x:e.clientX,y:e.clientY,event:e};
  },true);
  window.addEventListener('pointermove',e=>{
    if(drag){
      if(e.buttons===0){ end(true,e.clientX,e.clientY); return; }
      move(e.clientX,e.clientY);
      return;
    }
    if(!down) return;
    if(e.buttons===0){ down=null; return; }
    if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>=THRESHOLD) start(e.clientX,e.clientY);
  },true);
  window.addEventListener('pointerup',e=>{ down=null; if(drag) end(true,e.clientX,e.clientY); },true);
  window.addEventListener('pointercancel',()=>{ down=null; if(drag) end(false); },true);
  window.addEventListener('keydown',e=>{ if(drag&&e.key==='Escape') end(false); },true);
  window.addEventListener('blur',()=>{ down=null; if(drag) end(false); });
  // ドラッグで離した直後に同じ場所で起きるクリックで、説明やボタンが誤って動かないようにする。
  window.addEventListener('click',e=>{
    if(performance.now()>suppressClickUntil) return;
    suppressClickUntil=0;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
})();
