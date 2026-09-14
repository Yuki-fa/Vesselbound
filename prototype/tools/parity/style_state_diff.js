'use strict';

// 画面状態ごとに、旧版(BASE)と現行版(HEAD)の計算済みスタイルを比較する。
// 既知の差はここだけで除外する。理由：2026-09-14 の色統合、px整数化、DOM名変更。
const KNOWN_EXCLUSIONS={
  // f9550b2 の「似た文字色29色の統合」。旧色29色、置換組30組（#fff6dcだけ2組）。
  colorPairs:new Set([
    '#f1d996>#f0d080','#eadfca>#f4e7c8','#f7ead0>#f4e7c8','#e5cfac>#efe4c6',
    '#e07070>#e05050','#eefddd>#e8ffe0','#ffe8dd>#ffe8e0','#fffdf2>#fff8e8',
    '#f1d59b>#f0d080','#f04a43>#ff4a4a','#fff4e6>#fff8e8','#f3ead0>#f4e7c8',
    '#d7c0a0>#d8b982','#f2d49a>#f0d080','#8fb9cf>#9098b0','#f2d9a0>#f0d080',
    '#f3d69a>#f0d080','#f0d28b>#f0d080','#f3d58f>#d8b982','#fff7d6>#fff8e8',
    '#f0e9d8>#f4e7c8','#e8c976>#d8b982','#fff6dc>#fff2c8','#e9dcb4>#d8b982',
    '#8b8f9a>#9098b0','#fff6dc>#d8b982','#9a8f7c>#8b7c67','#c8b48a>#a58768',
    '#fff3d3>#fff8e8','#f4dfc0>#f4e7c8'
  ]),
  // b3fe276・2f7f6a4：小数pxの最寄り整数化、および43.82px→44pxの統一。
  sizeRounding:true,
  // c6812fd：旧 equip / battle-order を現行 board / reward-offer へ変更。
  renamed:/equip|battle-order/g,
  // 旧版にだけ残る廃止済み要素（敵手札、DUNGEON CLEAR等）は片側のみとして数える。
  oneSided:true
};

const PROPS=['display','visibility','opacity','color','-webkit-text-fill-color','font-size',
  'font-family','font-weight','letter-spacing','line-height','text-shadow','filter',
  'background-image','background-color','background-clip','box-shadow','border-top-width',
  'border-top-color','width','height','z-index','cursor'];

const {launch}=require('./headless');
const {STATES:SHARED_STATES,PAGE_LIB}=require('./style_effect_audit');
const BASE=process.env.VB_BASE_URL||'http://127.0.0.1:5510/index.html';
const HEAD=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const ONLY=process.env.VB_ONLY||'';

// 監査に無かった状態。root は比較対象の最小の画面／オーバーレイ要素。
const EXTRA_STATES=[
  ['battleStartCutin',`showBattleCutin('start');`,900,'#scr-battle'],
  ['battleVictoryCutin',`const c=showBattleCutin('victory',{durationMs:1500}); await new Promise(r=>setTimeout(r,1900)); _armBattleContinue(document.getElementById('battle-start-intro'),()=>{},{});`,300,'#scr-battle'],
  ['clearBoard',`gameOver({clear:true});`,3500,'#scr-gameover'],
  ['keywordTooltipReward',`G.phase='reward'; G._debugMode=true; document.body.classList.add('reward-screen-active'); const c=PANEL_POOL.find(x=>x&&x.keywords&&x.keywords.length)||PANEL_POOL[0]; G._isShop=false; G._isForge=false; G._isVillageMenu=false; _rewCards=[c]; renderRewCards&&renderRewCards(); await new Promise(r=>setTimeout(r,500)); const a=document.querySelector('#reward-offer-row .rew-card,[data-preview]'); if(a){const r=a.getBoundingClientRect(); a.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));}`,700,'#kw-tooltip'],
  ['keywordTooltipBattle',`G._isLibrary=false; startTestBattle&&startTestBattle(); await new Promise(r=>setTimeout(r,1200)); const a=document.querySelector('[data-keyword-preview],.slot-badge[data-kwdesc]'); if(a){const r=a.getBoundingClientRect(); a.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));}`,800,'#keyword-tooltip'],
  ['mapPowerTooltip',`G._isForge=true; G.phase='reward'; G.gold=9999; G._mapForgeOffers=(typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.slice(0,3).map(x=>({...x})):[]); renderMapForgeOffers&&renderMapForgeOffers(); await new Promise(r=>setTimeout(r,500)); const a=document.querySelector('[data-map-power-preview]'); if(a){const r=a.getBoundingClientRect(); a.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));}`,600,'#map-power-tooltip'],
  ['mapConfirmDialog',`const a=document.querySelector('[data-map-confirm],.map-confirm-trigger'); if(a) a.click();`,500,'#map-confirm-dialog'],
  ['carryGoldWarning',`const a=document.querySelector('[data-carry-gold-warning],#carry-gold-warning-trigger'); if(a) a.click();`,500,'#carry-gold-warning'],
  ['shopPrices',`G.phase='reward'; G._isShop=true; G._isForge=false; G._isItemShop=false; document.body.classList.add('reward-screen-active','shop-screen-active'); renderRewCards&&renderRewCards(); renderHandEditor&&renderHandEditor();`,900,'#scr-battle'],
  ['shopSaleValues',`G.phase='reward'; G._isShop=true; G._isItemShop=true; document.body.classList.add('reward-screen-active','shop-screen-active','item-shop-active'); renderRewCards&&renderRewCards(); renderHandEditor&&renderHandEditor();`,900,'#scr-battle'],
  ['attackMotionClone',`G._isLibrary=false; startTestBattle&&startTestBattle(); await new Promise(r=>setTimeout(r,1200)); const a=(G.allies||[]).find(u=>u&&u.hp>0),t=(G.enemies||[]).find(u=>u&&u.hp>0); if(a&&t){renderAll&&renderAll(); void playAttackMotion(a,t,false,()=>{},{firstDuration:900,returnDuration:900});}`,180,'#scr-battle'],
  ['dragGhostStats',`G.phase='reward'; G._debugMode=true; goToReward&&goToReward(); await new Promise(r=>setTimeout(r,700)); const s=document.querySelector('#hand-slots .card'); if(s&&typeof _createDragGhost==='function') _createDragGhost(s);`,300,'body'],
  ['villageCard',`openMapVillage&&openMapVillage(); await new Promise(r=>setTimeout(r,2800));`,300,'.map-village-card'],
  ['forgeCard',`openMapForge&&openMapForge(); await new Promise(r=>setTimeout(r,700)); renderMapForgeOffers&&renderMapForgeOffers();`,500,'.map-forge-card']
];

const shared=SHARED_STATES.map(([name,code,wait])=>[name,code,wait,
  /^(title|titleMenuHover)$/.test(name)?'#scr-title':
  /^(village|villageMove)$/.test(name)?'#scr-village':
  /^(forge|forgeNoTarget)$/.test(name)?'#scr-battle':
  /^(gameover)$/.test(name)?'#scr-gameover':'#scr-battle']);
const STATES=[...shared,...EXTRA_STATES].filter(x=>!ONLY||x[0].includes(ONLY));

function stripImportant(v){return String(v).replace(/!important\s*$/,'').trim().toLowerCase();}
function colorKey(v){
  const s=stripImportant(v); const m=s.match(/^#([0-9a-f]{3,8})$/i); if(!m)return s;
  let h=m[1]; if(h.length===3)h=h.split('').map(x=>x+x).join('');
  return '#'+h;
}
function comparableColor(v){
  const s=stripImportant(v),m=s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  return m?'#'+[m[1],m[2],m[3]].map(x=>Number(x).toString(16).padStart(2,'0')).join(''):colorKey(s);
}
function number(v){const m=String(v).match(/^(-?\d+(?:\.\d+)?)px$/);return m?Number(m[1]):null;}
function normalizedName(s){return String(s).replace(/battle-order/g,'reward-offer').replace(/equip/g,'board');}
function nodeKey(el,root){
  if(el.id)return 'id:'+normalizedName(el.id);
  const parts=[]; let n=el;
  while(n&&n.nodeType===1&&parts.length<5){
    const sig=normalizedName(n.tagName.toLowerCase()+[...n.classList].sort().map(x=>'.'+x).join(''));
    let i=1; for(let p=n.previousElementSibling;p;p=p.previousElementSibling){const ps=p.tagName.toLowerCase()+[...p.classList].sort().map(x=>'.'+x).join('');if(normalizedName(ps)===sig)i++;}
    parts.unshift(sig+'['+i+']'); if(n===root)break; n=n.parentElement;
  }
  return 'path:'+parts.join('>');
}
async function readState(url,state){
  const b=await launch({width:1920,height:1080});
  try{
    await b.goto(url,1800);
    await b.waitFor('typeof startGame==="function"&&typeof goToReward==="function"',30000);
    const [label,code,wait,rootSelector]=state;
    const prep=!/^(title|titleScreen)$/.test(label)
      ? `try{startGame(true);}catch(e){} await new Promise(r=>setTimeout(r,1100));` : '';
    const result=await b.eval(`
      ${prep}
      ${PAGE_LIB}
      let __setupError=null; try{${code}}catch(e){__setupError=String(e&&e.stack||e);}
      await new Promise(r=>setTimeout(r,${wait||500}));
      const roots=[...document.querySelectorAll(${JSON.stringify(rootSelector)})];
      const props=${JSON.stringify(PROPS)};
      const norm=s=>String(s).replace(/battle-order/g,'reward-offer').replace(/equip/g,'board');
      const keyOf=(el,rt)=>{if(el.id)return 'id:'+norm(el.id);const ps=[];let n=el;while(n&&n.nodeType===1&&ps.length<5){const sig=norm(n.tagName.toLowerCase()+[...n.classList].sort().map(x=>'.'+x).join(''));let i=1;for(let p=n.previousElementSibling;p;p=p.previousElementSibling){const q=p.tagName.toLowerCase()+[...p.classList].sort().map(x=>'.'+x).join('');if(norm(q)===sig)i++;}ps.unshift(sig+'['+i+']');if(n===rt)break;n=n.parentElement;}return 'path:'+ps.join('>');};
      // background-image 等の computed value に含まれる絶対URLから、比較対象外のホストを除く。
      const clean=v=>String(v).replace(/url\\((['"]?)https?:\\/\\/[^/]+\\//g,'url($1/').replace(/\\s+/g,' ').trim();
      const pseudo=(el,p)=>{const s=getComputedStyle(el,p); const c=clean(s.content); if(!c||c==='none'||c==='normal')return null; const o={}; props.forEach(x=>o[x]=clean(s.getPropertyValue(x))); o.__animation=clean(s.animationName);o.__transition=clean(s.transitionProperty);o.__transitionDur=clean(s.transitionDuration);return o;};
      const items=[]; const walk=(el,root)=>{if(!el||el.nodeType!==1)return; const s=getComputedStyle(el),o={key:${JSON.stringify(rootSelector)}+'|'+keyOf(el,root),tag:el.tagName.toLowerCase(),id:el.id||'',classes:[...el.classList].join(' ')}; props.forEach(x=>o[x]=clean(s.getPropertyValue(x)));o.__animation=clean(s.animationName);o.__transition=clean(s.transitionProperty);o.__transitionDur=clean(s.transitionDuration);items.push(o); for(const p of ['::before','::after']){const q=pseudo(el,p);if(q)items.push({...q,key:o.key+p,tag:p});} for(const c of el.children)walk(c,root);};
      roots.forEach(root=>walk(root,root));
      const __rr=roots[0]&&roots[0].getBoundingClientRect();
      return {setupError:__setupError,rootFound:roots.length>0,items,rect:__rr?{x:__rr.left,y:__rr.top,w:__rr.width,h:__rr.height}:null};
    `);
    // VB_SHOT_DIR：根要素の範囲を版ごとに撮る（差の見た目を人が確かめる用）。
    if(process.env.VB_SHOT_DIR&&result&&result.rect&&result.rect.w>0&&result.rect.h>0){
      const pad=24, r=result.rect;
      const shot=await b.call('Page.captureScreenshot',{format:'png',clip:{x:Math.max(0,r.x-pad),y:Math.max(0,r.y-pad),width:Math.min(1920,r.w+pad*2),height:Math.min(1080,r.h+pad*2),scale:1}});
      const tag=url===BASE?'base':'head';
      require('fs').writeFileSync(require('path').join(process.env.VB_SHOT_DIR,`${state[0]}_${tag}.png`),Buffer.from(shot.data,'base64'));
    }
    return result;
  }finally{await b.close();}
}
function allowed(a,b,p){
  if(a[p]===b[p])return true;
  if(p==='opacity' && (a.__animation!=='none'||b.__animation!=='none'||a.__transition.includes('opacity')||b.__transition.includes('opacity')))return true;
  if((p==='width'||p==='height')&&number(a[p])!=null&&number(b[p])!=null&&Math.abs(number(a[p])-number(b[p]))<.5)return true;
  if(p==='font-size'&&KNOWN_EXCLUSIONS.sizeRounding&&number(a[p])!=null&&number(b[p])!=null&&Math.abs(number(a[p])-number(b[p]))<=.5)return true;
  // 字間・行高は文字サイズ（em）から計算されるので、文字サイズの整数化に連れて1px未満ずれる。
  if((p==='letter-spacing'||p==='line-height')&&KNOWN_EXCLUSIONS.sizeRounding&&number(a[p])!=null&&number(b[p])!=null&&Math.abs(number(a[p])-number(b[p]))<.6)return true;
  // b5a0229・e7db2d7：カーソルを専用の絵（cursor1〜4）へ切り替えた。意図的な差。
  if(p==='cursor')return true;
  // 光や影のアニメーション・トランジション途中の値は撮る瞬間でずれる（ノイズ）。
  // transitionProperty の既定値は "all" なので、動いているかは所要時間（0s以外）で判定する。
  const moving=x=>x.__animation!=='none'||!/^0s(, 0s)*$/.test(String(x.__transitionDur||'0s'));
  if(/^(filter|box-shadow|text-shadow)$/.test(p)&&(moving(a)||moving(b)))return true;
  // 枠線の色は文字色（currentColor）に従うので、色の統合の対応表をそのまま使う。
  if(p==='color'||p==='-webkit-text-fill-color'||p==='border-top-color')return KNOWN_EXCLUSIONS.colorPairs.has(comparableColor(a[p])+'>'+comparableColor(b[p]));
  return false;
}
function compare(base,head){
  const bm=new Map(base.items.map(x=>[x.key,x])),hm=new Map(head.items.map(x=>[x.key,x])); const diffs=[],oneSided=[];
  for(const [k,a] of bm){const b=hm.get(k);if(!b){oneSided.push({side:'headなし',key:k,tag:a.tag});continue;} for(const p of PROPS)if(!allowed(a,b,p))diffs.push({element:k,property:p,base:a[p],head:b[p]});}
  for(const [k,b] of hm)if(!bm.has(k))oneSided.push({side:'baseなし',key:k,tag:b.tag});
  return {diffs,oneSided};
}

(async()=>{
  let failed=false;
  console.log(`style_state_diff: ${BASE} vs ${HEAD}`);
  for(const state of STATES){
    const [label,, ,root]=state; let base,head;
    try{base=await readState(BASE,state);head=await readState(HEAD,state);}catch(e){console.error(`\n[${label}] 作れなかった: ${e.message||e}`);failed=true;continue;}
    if(base.setupError||head.setupError){console.log(`\n[${label}] 作れなかった: base=${base.setupError||'なし'} head=${head.setupError||'なし'}`);failed=true;continue;}
    if(!base.rootFound||!head.rootFound){console.log(`\n[${label}] 作れなかった: 根要素 ${root} が base=${base.rootFound?'あり':'なし'} / head=${head.rootFound?'あり':'なし'}`);failed=true;continue;}
    const c=compare(base,head); failed ||= c.diffs.length>0;
    console.log(`\n[${label}] root=${root} 要素数(base/head)=${base.items.length}/${head.items.length} 差=${c.diffs.length} 片側のみ=${c.oneSided.length}`);
    c.diffs.forEach(x=>console.log(`差 ${x.element} / ${x.property} / ${x.base} / ${x.head}`));
    if(c.oneSided.length)console.log(`片側のみ ${c.oneSided.length}件（廃止要素・状態差を含む）`);
  }
  process.exitCode=failed?1:0;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
