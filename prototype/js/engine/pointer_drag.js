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
// Esc・窓の外で離す・フォーカスを失う時は drop せず dragend だけ送る。
// イベントの中身は標準ドラッグと同じ形（clientX/Y・dataTransfer・relatedTarget）なので、
// 既存の検査が DragEvent を直接送る書き方もそのまま使える。
(function _initPointerDrag(){
  if(typeof window==='undefined'||typeof document==='undefined') return;
  const THRESHOLD=4;          // 押してからドラッグとみなすまでの移動量（px）
  const CLICK_GUARD_MS=400;   // ドラッグで離した直後のクリックを握りつぶす時間
  const root=document.documentElement;
  let down=null;   // {src,x,y,event}：押したがまだドラッグになっていない
  let drag=null;   // {src,dt,over,x,y}
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
    drag={src,dt:new DataTransfer(),over:null,x,y};
    const ev=fire(src,'dragstart',x,y);
    if(ev.defaultPrevented){ drag=null; return; }
    root.classList.add('pointer-dragging');
    move(x,y);
  };
  const move=(x,y)=>{
    drag.x=x; drag.y=y;
    fire(drag.src,'drag',x,y);
    const target=hit(x,y);
    if(target!==drag.over){
      if(drag.over&&drag.over.isConnected) fire(drag.over,'dragleave',x,y,{relatedTarget:target});
      if(target) fire(target,'dragenter',x,y,{relatedTarget:drag.over});
      drag.over=target;
    }
    if(target) fire(target,'dragover',x,y);
  };
  const end=allowDrop=>{
    if(!drag) return;
    const {src,x,y}=drag;
    const target=drag.over&&drag.over.isConnected?drag.over:null;
    if(target){
      // 離した位置で受け付けるかを確かめ直してから落とす（標準ドラッグと同じく最後の dragover で決まる）。
      const accepted=allowDrop&&fire(target,'dragover',x,y).defaultPrevented;
      if(accepted) fire(target,'drop',x,y);
      else fire(target,'dragleave',x,y);
    }
    fire(src,'dragend',x,y);
    // ドロップ後の再描画で元の要素が画面から外れていると、document 側の片付けに dragend が届かない。
    if(!src.isConnected) fire(document,'dragend',x,y);
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
      if(e.buttons===0){ end(false); return; }   // 窓の外で離した
      move(e.clientX,e.clientY);
      return;
    }
    if(!down) return;
    if(e.buttons===0){ down=null; return; }
    if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>=THRESHOLD) start(e.clientX,e.clientY);
  },true);
  window.addEventListener('pointerup',()=>{ down=null; if(drag) end(true); },true);
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
