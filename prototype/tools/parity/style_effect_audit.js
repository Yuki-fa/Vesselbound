'use strict';
// 文字色・文字サイズの宣言が、画面状態のどこかで実際に見た目へ効いているかを調べる（ファイルは変更しない）。
//   node tools/parity/style_effect_audit.js [出力JSON]
// 各宣言を目印の値へ一時的に差し替え、当たる要素の計算値が変わるかで判定する。:hover は複製規則＋印のクラスで再現する。
// 文字色・文字サイズの宣言が、どの画面状態でも実際の見た目に効いていないかをブラウザで調べる（ファイルは変更しない）。
// 各宣言を一時的に目印の値へ差し替え、当たる要素の計算値が目印になるかで「効いている」と判定する。
const {launch}=require('./headless');
const fs=require('fs');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const OUT=process.argv[2]||'/tmp/style_effect_audit.json';
const PAGE_LIB=`
window.__ca=window.__ca||{effective:new Set(),matched:new Set(),dynamic:new Set(),all:new Map()};
window.__caRun=function(label){
  const ca=window.__ca, PROPS=['color','-webkit-text-fill-color','font-size'];
  const DYN=/:(hover|focus|focus-visible|focus-within|active|target|visited|checked)\\b/;
  const walk=(list,out)=>{ for(const r of list){ if(r.type===1) out.push(r); else if(r.cssRules) { try{ walk(r.cssRules,out); }catch(e){} } } return out; };
  const rules=[];
  for(const sh of document.styleSheets){ if(!sh.ownerNode||sh.ownerNode.tagName!=='STYLE') continue; try{ walk(sh.cssRules,rules); }catch(e){} }
  const split=s=>{ const out=[];let d=0,st=0; for(let i=0;i<s.length;i++){const c=s[i]; if(c==='('||c==='[')d++; else if(c===')'||c===']')d--; else if(c===','&&d===0){out.push(s.slice(st,i).trim());st=i+1;} } out.push(s.slice(st).trim()); return out.filter(Boolean); };
  let tested=0;
  rules.forEach((rule,ri)=>{
    PROPS.forEach(p=>{
      const v=rule.style.getPropertyValue(p); if(!v) return;
      const key=rule.selectorText+'||'+p+'||'+v+'||'+rule.style.getPropertyPriority(p);
      if(!ca.all.has(key)) ca.all.set(key,{sel:rule.selectorText,prop:p,val:v,imp:rule.style.getPropertyPriority(p)});
      if(ca.effective.has(key)) return;
      const parts=split(rule.selectorText);
      const targets=[];
      parts.forEach(part=>{
        if(DYN.test(part)){ ca.dynamic.add(key); return; }
        const pm=part.match(/::?(before|after|placeholder|marker|first-line|first-letter|selection)\\s*$/);
        const base=pm?part.slice(0,pm.index):part; const pseudo=pm?'::'+pm[1]:null;
        let els=[]; try{ els=[...document.querySelectorAll(base||'*')].slice(0,120); }catch(e){ return; }
        els.forEach(el=>targets.push([el,pseudo]));
      });
      if(!targets.length) return;
      ca.matched.add(key);
      const sentinel=p==='font-size'?'777px':'rgb(1, 2, 3)';
      const before=rule.style.cssText;
      rule.style.setProperty(p,sentinel,rule.style.getPropertyPriority(p));
      let hit=false;
      for(const [el,pseudo] of targets){
        const cs=getComputedStyle(el,pseudo);
        const cv=p==='font-size'?cs.fontSize:(p==='color'?cs.color:cs.webkitTextFillColor);
        if(cv===sentinel){ hit=true; break; }
      }
      rule.style.cssText=before;
      tested++;
      if(hit) ca.effective.add(key);
    });
  });
  return {label,tested,effective:ca.effective.size,matched:ca.matched.size,all:ca.all.size};
};

window.__caForceHover=function(label){
  const ca=window.__ca, PROPS=['color','-webkit-text-fill-color','font-size'];
  const walkS=(list,out,sheet)=>{ for(let i=0;i<list.length;i++){ const r=list[i]; if(r.type===1) out.push([r,list,i]); else if(r.cssRules){ try{ walkS(r.cssRules,out); }catch(e){} } } return out; };
  let n=0;
  for(const sh of document.styleSheets){ if(!sh.ownerNode||sh.ownerNode.tagName!=='STYLE') continue;
    let rs=[]; try{ rs=walkS(sh.cssRules,[]); }catch(e){ continue; }
    for(const [rule] of rs){
      if(!/:hover\\b/.test(rule.selectorText)) continue;
      PROPS.forEach(p=>{
        const v=rule.style.getPropertyValue(p); if(!v) return;
        const key=rule.selectorText+'||'+p+'||'+v+'||'+rule.style.getPropertyPriority(p);
        if(ca.effective.has(key)) return;
        const selF=rule.selectorText.replace(/:hover\\b/g,'.__fh');
        const holder=rule.parentRule||rule.parentStyleSheet;
        const list=holder.cssRules; let idx=[...list].indexOf(rule); if(idx<0) return;
        let els=[]; try{ els=[...document.querySelectorAll(rule.selectorText.split(',').map(s=>{ const m=s.match(/^(.*?):hover\\b/); return m?m[1]:null; }).filter(Boolean).join(','))]; }catch(e){ return; }
        if(!els.length) return;
        els.forEach(el=>el.classList.add('__fh'));
        try{ holder.insertRule(selF+'{'+p+':777px'.replace('777px',p==='font-size'?'777px':'rgb(1, 2, 3)')+(rule.style.getPropertyPriority(p)?' !important':'')+'}',idx+1); }catch(e){ els.forEach(el=>el.classList.remove('__fh')); return; }
        // 元の規則と同じ位置に目印の規則を置き、ホバー中の要素（__fh）の計算値が変わるか
        const targets=[...document.querySelectorAll(selF.replace(/::?(before|after)\\b/g,''))].slice(0,40);
        const sentinel=p==='font-size'?'777px':'rgb(1, 2, 3)';
        const pseudo=(selF.match(/::?(before|after)\\b/)||[])[1];
        const hit=targets.some(el=>{ const cs=getComputedStyle(el,pseudo?'::'+pseudo:null); return (p==='font-size'?cs.fontSize:(p==='color'?cs.color:cs.webkitTextFillColor))===sentinel; });
        holder.deleteRule(idx+1); els.forEach(el=>el.classList.remove('__fh'));
        ca.matched.add(key); n++;
        if(hit) ca.effective.add(key);
      });
    }
  }
  return n;
};
window.__caHover=function(label,limit){
  const els=[...document.querySelectorAll('[data-preview],[data-journey-enemy],[data-keyword-preview],[data-map-power-preview],[data-panel-power-preview],.slot-badge[data-kwdesc]')]
    .filter(el=>{const r=el.getBoundingClientRect(); return r.width>0&&r.height>0;}).slice(0,limit||30);
  const res=[];
  for(const el of els){
    const r=el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,buttons:0}));
    res.push(window.__caRun(label+':hover'));
  }
  return res.length;
};

window.__caRewardSetup=function(){
  G.phase='reward'; G._debugMode=true; G._isShop=false; G._isForge=false;
  G._isItemShop=false; G._isRingExchange=false; G._isVillageMenu=false;
  document.body.classList.add('reward-screen-active');
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  document.getElementById('scr-battle')?.classList.add('active');
};
window.__caPatchOnlineState=function(){
  const st={matching:true,players:[{id:'自分',self:true,alive:true},{id:'相手',self:false,alive:false}],
    nextOpponentId:'相手',deadlineAt:Date.now()+60000,stageFlow:['city','formation','versus']};
  if(typeof OnlineMatch!=='undefined'&&OnlineMatch){
    OnlineMatch.getState=()=>JSON.parse(JSON.stringify(st));
    OnlineMatch.remainingLabel=()=> '1:00';
  }
  G._onlineMode=true;
  return st;
};
`;
const STYLE_AUDIT_STATES=[
  ['title', `showScreen('title');`],
  ['setup', `startGame(true);`, 1800],
  ['village', `openMapVillage&&openMapVillage();`, 1200],
  ['boardFilled', `G.phase=null; goToReward(); await new Promise(r=>setTimeout(r,900));
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    const scr=document.getElementById('scr-battle'); scr.classList.add('active');
    document.body.classList.add('reward-screen-active'); G.phase='reward'; G._debugMode=true;
    const prep=c=>typeof _preparePanelCard==='function'?_preparePanelCard(c):({...c});
    const chars=PANEL_POOL.filter(c=>String(c.category||'')==='キャラクター');
    const enchants=PANEL_POOL.filter(c=>['強化','エンチャント'].includes(String(c.category||'')));
    const byR=r=>chars.find(c=>Number(c.rarity)===r)||chars[0];
    G.mainBoard=new Array(15).fill(null);
    [1,2,3,4,5].forEach((r,i)=>{ G.mainBoard[i]=prep(byR(r)); });
    G.mainBoard[5]=prep(enchants[0]); G.mainBoard[6]=prep(enchants[1]||enchants[0]);
    G.mainBoard[7]=prep(chars[3]); G.mainBoard[7]._tripleMerged=true; G.mainBoard[7].rarity=6;
    const unit=_getPartyBoardUnit(); unit.boardCards=G.mainBoard;
    G.gold=0;
    _rewCards=[prep(byR(1)),prep(byR(3)),{...prep(byR(4)),unique:true},prep(enchants[2]||enchants[0])];
    renderHandEditor(); renderRewCards(); _syncRewardProductionUi&&_syncRewardProductionUi();`, 1200],
  ['shop', `G._isShop=true; document.body.classList.add('shop-screen-active'); G.gold=0; renderRewCards(); renderHandEditor();`, 900],
  ['shopSoldOut', `_rewCards=[null,_rewCards[1],null]; renderRewCards();`, 700],
  ['dragGhost', `const src=document.querySelector('#hand-slots .card'); if(src&&typeof _createDragGhost==='function') _createDragGhost(src); document.body.classList.add('dragzone-board');`, 500],
  ['dragGhostEnd', `typeof _removeDragGhost==='function'&&_removeDragGhost(); document.body.classList.remove('dragzone-board');`, 300],
  ['debugPaletteCharacter', `__caRewardSetup(); G._debugPaletteKind='character'; renderDebugCardPalette&&renderDebugCardPalette();`, 700],
  ['debugPaletteEnchant', `__caRewardSetup(); G._debugPaletteKind='enchant'; renderDebugCardPalette&&renderDebugCardPalette();`, 700],
  ['debugPaletteItem', `__caRewardSetup(); G._debugPaletteKind='item'; renderDebugCardPalette&&renderDebugCardPalette();`, 700],
  ['debugPaletteRing', `__caRewardSetup(); G._debugPaletteKind='ring'; renderDebugCardPalette&&renderDebugCardPalette();`, 700],
  ['itemPicking', `document.body.classList.add('item-use-picking');`, 500],
  ['itemPickingEnd', `document.body.classList.remove('item-use-picking');`, 300],
  ['actionTip', `const a=document.querySelector('.reward-prod-item .reward-prod-slots i')||document.querySelector('#hand-slots .card'); _openRewardActionTooltip(a,'テスト','説明文。終戦：1ゴールドを得る。',[{label:'使う'},{label:'捨てる'}]);`, 600],
  ['ringReturn', `typeof _closeItemUseConfirm==='function'&&_closeItemUseConfirm(); _confirmRingExchangeReturn&&_confirmRingExchangeReturn(()=>{});`, 700],
  ['journeyHover', `__caRewardSetup(); G._wave=2; G._waveStage=4; renderRewCards&&renderRewCards(); _syncRewardJourneyUi&&_syncRewardJourneyUi();`, 900],
  ['forge', `document.getElementById('shop-return-confirm')?.remove(); G._isShop=false; openMapForge&&openMapForge(); await new Promise(r=>setTimeout(r,900)); renderMapForgeOffers&&renderMapForgeOffers();`, 900],
  ['forgeNoTarget', `G._isForge=true; G.phase='reward'; G.gold=9999; G._mapForgeOffers=(typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.slice(0,3).map(x=>({...x})):[]); G.mapPanelPowers=new Array(15).fill(''); renderMapForgeOffers&&renderMapForgeOffers();`, 700],
  ['library', `openMapLibraryFormation&&openMapLibraryFormation();`, 1500],
  ['battle', `G._isLibrary=false; startTestBattle&&startTestBattle();`, 3500],
  ['attackMotion', `const a=(G.allies||[]).find(u=>u&&u.hp>0), t=(G.enemies||[]).find(u=>u&&u.hp>0); if(a&&t&&typeof playAttackMotion==='function'){ renderAll&&renderAll(); void playAttackMotion(a,t,false,()=>{},{firstDuration:900,returnDuration:900}); }`, 120],
  ['battleEnchantAndDead', `G._isLibrary=false; G.phase='reward'; G._debugMode=true; const cs=PANEL_POOL.filter(c=>String(c.category||'')==='キャラクター'); const es=PANEL_POOL.filter(c=>['強化','エンチャント'].includes(String(c.category||''))); const prep=c=>typeof _preparePanelCard==='function'?_preparePanelCard(c):({...c}); G.mainBoard=new Array(15).fill(null); G.mainBoard[0]=prep(cs[0]); G.mainBoard[1]=prep(es[0]); const bu=_getPartyBoardUnit(); bu.boardCards=G.mainBoard; _syncUnitPanelEffectsAfterMove&&_syncUnitPanelEffectsAfterMove(bu); startTestBattle&&startTestBattle(); await new Promise(r=>setTimeout(r,900)); (G.allies||[]).filter(Boolean).slice(0,1).forEach(u=>u.instadead=true); renderAll&&renderAll();`, 1800],
  ['battleBadges', `(G.enemies||[]).filter(Boolean).forEach((u,i)=>{ u.poison=2; u.allyTarget=true; u.hate=true; u.hateTurns=2; u.shield=1; u.stealth=true; u.guardian=true; });
    (G.allies||[]).filter(Boolean).forEach(u=>{ u.poison=1; u.shield=1; });
    G.mana=3; renderAll&&renderAll(); renderManaHud&&renderManaHud();`, 800],
  ['keywordTitle', `const k=document.querySelector('.slot-badge[data-kwdesc]'); if(k){ const r=k.getBoundingClientRect(); k.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+2,clientY:r.top+2})); }`, 500],
  ['battleFx', `const r={left:600,top:600,width:200,height:300,right:800,bottom:900};
    try{ playHitVfxAtRect(r,5,{labelNote:'ATK'}); }catch(e){}
    try{ _spawnFledLabel(r,'逃走'); }catch(e){}
    try{ playWastedLabel(r); }catch(e){}
    try{ _showBattleLine('テスト台詞',1200,900,false); }catch(e){}`, 700],
  ['battleLineEnemy', `try{ _showBattleLine('テスト台詞',2400,900,true); }catch(e){}`, 700],
  ['retreat', `showBattleCutin&&showBattleCutin('retreat',{durationMs:4000});`, 900],
  ['continue', `const ov=document.getElementById('battle-start-intro'); try{ _armBattleContinue(ov,()=>{},{}); }catch(e){}`, 900],
  ['manaHud', `G.phase='player'; document.getElementById('scr-battle')?.classList.remove('active'); renderManaHud&&renderManaHud();`, 500],
  ['online', `__caPatchOnlineState(); try{ showOnlineMatching(); }catch(e){} try{ initOnlineRivalHud(); renderOnlineHud(); }catch(e){}`, 900],
  ['titleMenuHover', `showScreen('title'); const t=document.getElementById('scr-title'); t&&t.classList.add('active','startup-menu-ready','startup-menu-hover-ready'); const m=t&&t.querySelector('.title-menu-item'); if(m){ const r=m.getBoundingClientRect(); t.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.left+2,clientY:r.top+2})); }`, 700],
  ['itemSellHover', `G.phase='reward'; G._isShop=true; G._isForge=false; G._isItemShop=true; G.spellSlots=[PANEL_POOL.find(c=>c&&(c.type==='item'||c.kind==='item'||['アイテム','道具'].includes(String(c.category||''))))||null,null,null,null]; _syncRewardProductionUi&&_syncRewardProductionUi();`, 700],
  ['testBattleEnd', `G._testBattleMode=true; G._libraryTestBattleMode=false; document.body.classList.add('test-battle-active'); G.phase='player'; const cut=document.createElement('div'); cut.id='battle-start-intro'; document.body.appendChild(cut); try{ _armBattleContinue(cut,()=>{},{}); }catch(e){} renderControls&&renderControls();`, 500],
  ['villageMove', `openMapVillage&&openMapVillage(); await new Promise(r=>setTimeout(r,900));`, 1200],
  ['gameover', `try{ hideOnlineMatching(); }catch(e){} gameOver();`, 3500],
];

// style_state_diff.js と状態生成を共有する。require 時は監査を起動しない。
if(typeof module!=='undefined') module.exports={STATES:STYLE_AUDIT_STATES,PAGE_LIB};

if(require.main===module)(async()=>{
  const b=await launch({width:3840,height:2160});
  const log=[];
  try{
    await b.goto(URL,1500);
    await b.waitFor('typeof startGame==="function"&&typeof goToReward==="function"',30000);
    await b.eval(PAGE_LIB+'return 1;');
    for(const [label,code,wait] of STYLE_AUDIT_STATES){
      try{
        await b.eval(`try{ ${code} }catch(e){ console.warn('state',${JSON.stringify(label)},e); } await new Promise(r=>setTimeout(r,${wait||900})); return 1;`);
      }catch(e){ log.push([label,'setup-error',String(e.message||e)]); }
      try{
        const r=await b.eval(`return window.__caRun(${JSON.stringify(label)});`);
        const h=await b.eval(`return window.__caHover(${JSON.stringify(label)},60)+':fh'+window.__caForceHover(${JSON.stringify(label)});`);
        log.push([label,r,'hover',h]);
      }catch(e){ log.push([label,'run-error',String(e.message||e)]); }
    }
    const data=await b.eval(`const ca=window.__ca; return [...ca.all.entries()].map(([k,v])=>({...v,effective:ca.effective.has(k),matched:ca.matched.has(k),dynamic:ca.dynamic.has(k)}));`);
    fs.writeFileSync(OUT,JSON.stringify({log,data},null,1));
    console.log(JSON.stringify(log));
    const never=data.filter(d=>!d.effective);
    console.log('宣言',data.length,'効いた',data.length-never.length,'未確認',never.length,'（うち要素あり',never.filter(d=>d.matched).length,'／状態依存',never.filter(d=>d.dynamic).length,'）');
    never.forEach(d=>{
      const kind=d.dynamic?'ホバー':(d.matched?'要素あり':'要素なし');
      console.log(`${kind}／${d.prop}／${d.val}／${d.sel}`);
    });
  }finally{ await b.close(); }
})().catch(e=>{ console.error(e); process.exit(1); });
