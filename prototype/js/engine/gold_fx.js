// gold_fx.js — 所持金の増減演出（全場面共通。戦闘・ショップ・酒場・塔・報酬など）。
//
// **所持金が増減したら、ここだけが見せ方を決める。** 個々の獲得・支払い経路に演出を書かないこと。
// G.gold を毎フレーム監視し、変わったら
//   1) 所持金の数字の真上に「+500」「-80」を出す（数字と同じ大きさ・右端を数字の右端に揃える）
//   2) 表示中の数字を目標値まで高速に1ずつ数え上げ／数え下げる
//   3) 「+500」は GOLD_FX_HOLD_MS 待ってから上へ動きながら消える
// 表示中の値は goldDisplayValue() で読む（updateHUD などはこれを使って描いている）。
//
// まだ見せたくない金額（終戦時の効果のように、コアが先に所持金を確定し、演出の時に見せる分）は
// goldFxDefer(額) で預け、演出の時に goldFxRelease(額) で出す。所持金そのものは書き換えない。
// 以前は所持金を一度減らしてから足し戻していたため、この監視だと「-X」「+X」が出てしまう。
//
// 画面を作り直す時（ラン開始・セーブからの復元・タイトルへ戻る）は goldFxSnap() で演出なしに合わせる。
// ランが変わった時（G._runId が変わった時）も演出なしに合わせる。

const GOLD_FX_HOLD_MS=1000;      // 「+X」を出してから上へ動き始めるまで（利用者指定）
const GOLD_FX_RISE_MS=700;       // 上へ動きながら消えるまで
const GOLD_FX_RISE_PX=90;        // 上へ動く距離（設計座標）
// 数え上げの速さ：「+X」が完全に消えるまで（止まる1秒＋消える0.7秒）で 200G 分進む速さ（利用者指定）。
// 1Gあたり 1700÷200＝8.5ms。増減が大きいほど長くかかる（上限なし）。
const GOLD_FX_COUNT_PER_SPAN=200;
const GOLD_FX_COUNT_MS_PER=(GOLD_FX_HOLD_MS+GOLD_FX_RISE_MS)/GOLD_FX_COUNT_PER_SPAN;
const GOLD_FX_COUNT_MAX_MS=Infinity;
const GOLD_FX_COUNT_MIN_MS=0;
// 所持金を表示している要素。見えているものすべてに「+X」を出し、数字を書き換える。
const GOLD_FX_TARGETS=['#battle-gold-value','#village-gold','#map-gold','.reward-prod-money-value','#rw-gold'];

let _goldFxShown=null;
let _goldFxKnown=null;
let _goldFxRunId=null;
let _goldFxFrom=0,_goldFxTo=0,_goldFxStart=0,_goldFxDur=0;
let _goldFxDeferred=0;

function goldDisplayValue(){
  if(_goldFxShown==null) return Math.max(0,Number(G&&G.gold)||0)-_goldFxDeferred;
  return _goldFxShown;
}
// イベント（クエストのお礼など）で所持金を得る時の共通の入口。所持金を足し、income.wav を鳴らす。
// **イベントで収入を得る時は、今後もこれを通す**（利用者指定 2026-09-25）。
// 「+X」と数え上げはこのファイルの監視が出すので、ここでは所持金を足すだけ。
function gainEventGold(amount){
  const add=Math.max(0,Math.round(Number(amount)||0));
  if(!add||typeof G==='undefined'||!G) return 0;
  G.gold=(Number(G.gold)||0)+add;
  if(typeof playSfx==='function') playSfx('income',{group:'ui'});
  if(typeof updateHUD==='function') updateHUD();
  return add;
}
function goldFxDefer(amount){ _goldFxDeferred+=Math.max(0,Number(amount)||0); }
function goldFxRelease(amount){ _goldFxDeferred=Math.max(0,_goldFxDeferred-Math.max(0,Number(amount)||0)); }
function goldFxSnap(){
  _goldFxDeferred=0;
  const v=Math.max(0,Number(G&&G.gold)||0);
  _goldFxKnown=v; _goldFxShown=v; _goldFxFrom=v; _goldFxTo=v; _goldFxDur=0;
  _goldFxRunId=G?G._runId:null;
  _goldFxWriteAll();
}
function _goldFxFormat(v){ return Math.max(0,Math.round(Number(v)||0)).toLocaleString('ja-JP'); }
function _goldFxVisible(el){
  if(!el||!el.isConnected) return false;
  const r=el.getBoundingClientRect();
  if(!(r.width>0&&r.height>0)) return false;
  const cs=getComputedStyle(el);
  return cs.visibility!=='hidden'&&Number(cs.opacity)>0.05;
}
function _goldFxElements(){
  const out=[];
  GOLD_FX_TARGETS.forEach(sel=>document.querySelectorAll(sel).forEach(el=>out.push(el)));
  return out;
}
function _goldFxWriteAll(){
  const text=_goldFxFormat(goldDisplayValue());
  _goldFxElements().forEach(el=>{ if(el.textContent!==text) el.textContent=text; });
}
// 所持金の数字の真上に「+X」を出す。文字の大きさは数字と同じ、右端は数字の右端に揃える。
function _goldFxPopup(delta){
  const text=(delta>0?'+':'-')+Math.abs(delta).toLocaleString('ja-JP');
  _goldFxElements().filter(_goldFxVisible).forEach(el=>{
    const r=el.getBoundingClientRect();
    const cs=getComputedStyle(el);
    // ゲーム画面は拡大・縮小して表示しているので、見た目の大きさ（画面上の倍率）を掛ける。
    const scale=el.offsetWidth>0?r.width/el.offsetWidth:1;
    const pop=document.createElement('div');
    pop.className='gold-fx-pop'+(delta<0?' is-loss':'');
    pop.textContent=text;
    // 画面の拡大率に関係なく、数字と同じ見た目の大きさにする（画面座標で置く）。
    Object.assign(pop.style,{
      position:'fixed',right:`${Math.max(0,window.innerWidth-r.right)}px`,top:`${r.top-r.height*1.05}px`,
      fontSize:`${(parseFloat(cs.fontSize)||16)*scale}px`,fontFamily:cs.fontFamily,fontWeight:cs.fontWeight,
      lineHeight:`${r.height}px`,letterSpacing:`${(parseFloat(cs.letterSpacing)||0)*scale}px`,
    });
    pop.style.setProperty('--gold-fx-rise',`${-GOLD_FX_RISE_PX*scale}px`);
    pop.style.setProperty('--gold-fx-hold',`${GOLD_FX_HOLD_MS}ms`);
    pop.style.setProperty('--gold-fx-rise-ms',`${GOLD_FX_RISE_MS}ms`);
    document.body.appendChild(pop);
    window.setTimeout(()=>{ try{ pop.remove(); }catch(_e){} },GOLD_FX_HOLD_MS+GOLD_FX_RISE_MS+200);
  });
}
function _goldFxTick(now){
  try{
    if(typeof G!=='undefined'&&G){
      const gold=Math.max(0,Number(G.gold)||0);
      const target=Math.max(0,gold-_goldFxDeferred);
      if(_goldFxKnown==null||_goldFxRunId!==G._runId){
        goldFxSnap();
      }else if(target!==_goldFxTo){
        const delta=target-_goldFxTo;
        if(delta) _goldFxPopup(delta);
        _goldFxFrom=_goldFxShown==null?_goldFxTo:_goldFxShown;
        _goldFxTo=target;
        _goldFxStart=now;
        const steps=Math.abs(_goldFxTo-_goldFxFrom);
        _goldFxDur=Math.min(GOLD_FX_COUNT_MAX_MS,Math.max(GOLD_FX_COUNT_MIN_MS,steps*GOLD_FX_COUNT_MS_PER));
      }
      _goldFxKnown=gold;
      if(_goldFxShown!==_goldFxTo){
        const t=_goldFxDur>0?Math.min(1,(now-_goldFxStart)/_goldFxDur):1;
        _goldFxShown=Math.round(_goldFxFrom+(_goldFxTo-_goldFxFrom)*t);
        _goldFxWriteAll();
      }
    }
  }catch(e){ console.error('[gold_fx]',e); }
  window.requestAnimationFrame(_goldFxTick);
}
if(typeof window!=='undefined'){
  window.goldDisplayValue=goldDisplayValue;
  window.goldFxDefer=goldFxDefer;
  window.gainEventGold=gainEventGold;
  window.goldFxRelease=goldFxRelease;
  window.goldFxSnap=goldFxSnap;
  window.requestAnimationFrame(_goldFxTick);
}
