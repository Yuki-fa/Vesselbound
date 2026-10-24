'use strict';
const assert=require('node:assert/strict');
const {initialize}=require('./run_bot'),{makeElement}=require('./stub');
let now=0,timers=[],serial=1,animations=[],plays=[],views=[],saves=[],passed=0,failed=0,slots=new Map();
async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
async function advance(ms){const end=now+ms;for(let i=0;i<100;i++){
  await flush();timers.sort((a,b)=>a.at-b.at||a.id-b.id);if(!timers.length||timers[0].at>end)break;
  const job=timers.shift();now=job.at;job.fn();
}now=end;await flush();}
async function check(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){failed++;console.error('NG '+name+'\n'+e.stack);}}
function style(){const values=new Map();return {setProperty:(k,v)=>values.set(k,String(v)),getPropertyValue:k=>values.get(k)||'',removeProperty:k=>values.delete(k),
  [Symbol.iterator]:()=>values.keys()};}
function node(tag='div'){
  const n=makeElement(tag);n.style=style();n.offsetWidth=200;n.offsetHeight=300;n.isConnected=true;
  n.getBoundingClientRect=()=>({left:50,top:80,width:100,height:150,right:150,bottom:230});
  n.appendChild=c=>{c.parentElement=n;c.parentNode=n;n.children.push(c);return c;};
  n.remove=()=>{n.removed=true;n.isConnected=false;if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(c=>c!==n);};
  const descendants=()=>n.children.flatMap(c=>[c,...c.querySelectorAll('*')]);
  const match=(c,s)=>s==='*'||s==='[id]'?s==='*'||!!c.id:s.startsWith('.')?c.className.split(' ').includes(s.slice(1)):c.tagName===s.toUpperCase();
  n.querySelectorAll=selector=>descendants().filter(c=>selector.split(',').some(s=>match(c,s.trim())));
  n.querySelector=s=>n.querySelectorAll(s)[0]||null;
  n.cloneNode=deep=>{const c=node(tag);c.className=n.className;c.textContent=n.textContent;c.dataset={...n.dataset};
    for(const k of n.style)c.style.setProperty(k,n.style.getPropertyValue(k));if(deep)n.children.forEach(child=>c.appendChild(child.cloneNode(true)));return c;};
  n.animate=(frames,options)=>{animations.push({node:n,at:now,frames,options});return {finished:new Promise(resolve=>setTimeout(resolve,options.duration)),cancel(){}};};
  return n;
}
function panel(no){const def=PANEL_POOL.find(c=>c.no===no);assert.ok(def);return makePanel(def.id);}
(async()=>{
  const api=await initialize();
  global.setTimeout=(fn,ms)=>{const id=serial++;timers.push({id,at:now+Math.max(0,Number(ms)||0),fn});return id;};
  global.clearTimeout=id=>{timers=timers.filter(t=>t.id!==id);};
  document.createElement=node;document.body=node('body');
  global.getComputedStyle=el=>el.style;
  global.getBoardSlotElement=i=>slots.get(i)||null;
  const draw=()=>{
    views.push({at:now,values:G.mainBoard.map((c,i)=>c?cardActivationShownStats(c,_panelCharacterPreviewStats(_getPartyBoardUnit(),i,c)):null)});
    slots=new Map(G.mainBoard.map((c,i)=>{
      const el=node();el.dataset.boardIdx=String(i);el.className='card';el.style.setProperty('--card-frame',c?.color||'');
      const frame=node('span');frame.className='character-frame-layer';frame.style.setProperty('background-image',c?.color||'');frame.style.setProperty('opacity','1');el.appendChild(frame);return [i,el];
    }));
  };
  renderHandEditor=draw;renderRewCards=()=>{};updateHUD=()=>{};_storeRewardStartSnapshot=()=>{};
  SaveRun.enabled=()=>true;SaveRun.checkpoint=type=>{saves.push(SaveRun.buildRunSave(type));return true;};
  VbFx.play=(name,options)=>{plays.push({name,options,at:now});return new Promise(resolve=>setTimeout(resolve,1500));};
  function fresh(no){api.resetRun();initState();SaveRun.begin();G.phase='reward';G._wave=2;G._waveStage=1;G._waveLife=3;G.gold=800;
    G.mainBoard.fill(null);G.mainBoard[1]=panel(no);G.mainBoard[3]=panel('C006');_rewCards=[];G.mainBoard[1]._activationReady=true;
    _pendingCardActivation=null;now=0;timers=[];animations=[];plays=[];views=[];saves=[];document.body.children=[];draw();
  }
  await check('インキュバス：適用・保存は即時。旧枠は山場470msまで残し、400msで消す',async()=>{
    fresh('C109');const source=G.mainBoard[1],target=G.mainBoard[3],before=[target.power,target.life],old=target.color;
    assert.equal(cardActivationClick(1),true);assert.equal(handleCardActivationTarget(3),true);
    const amount=coreUnitTriggerText(source,'起動').match(/\+(\d+)\/\+(\d+)/);
    assert.deepEqual([target.power,target.life],[before[0]+Number(amount[1]),before[1]+Number(amount[2])]);
    assert.equal(source._activationReady,undefined);assert.equal(saves.length,1);assert.equal(saves[0].state.player.mainBoard[3].color,target.color);
    const overlay=slots.get(3).querySelector('.activation-old-frame');assert.ok(overlay);assert.equal(overlay.style.getPropertyValue('background-image'),old);
    assert.equal(overlay.style.getPropertyValue('opacity'),'');assert.equal(plays[0].name,'activation-empower');
    const peak=VbFx.impactMs('activation-empower',1);await advance(peak-1);assert.equal(animations.length,0);
    await advance(1);assert.equal(animations.length,1);assert.equal(animations[0].at,peak);assert.equal(animations[0].options.duration,400);
    await advance(399);assert.ok(!overlay.removed);await advance(1);assert.ok(overlay.removed);
  });
  for(const reward of [false,true])await check(`ヘルナイト：${reward?'報酬枠':'魔導板'}を複製して260msに斜め切断、500msで消滅、900msで能力表示`,async()=>{
    fresh('C116');const source=G.mainBoard[1],victim=G.mainBoard[3],before={...views.at(-1).values[1]};
    if(reward){G.mainBoard[3]=null;_rewCards=[victim];draw();const offerEl=node();offerEl.className='rew-card';offerEl.appendChild(node('span'));
      document.querySelector=selector=>selector.includes('data-merge-rew-idx')?offerEl:null;
    }
    cardActivationClick(1);
    if(reward)assert.equal(handleCardActivationRewardTarget(0),true);else assert.equal(handleCardActivationTarget(3),true);
    assert.ok(source.power>before.atk);assert.equal(saves.length,1);assert.equal(saves[0].state.player.mainBoard[1].power,source.power);
    assert.equal(source._activationReady,undefined);assert.deepEqual(views.at(-1).values[1],before,'画面上の値はまだ旧値');
    assert.ok(reward?_rewCards.length===0:G.mainBoard[3]===null,'実体は既に消費済み');
    const halves=document.body.children.filter(c=>c.className==='activation-cut-half');assert.equal(halves.length,2);
    assert.equal(halves[0].style.clipPath,'polygon(0 0,100% 0,100% 100%)');assert.equal(halves[1].style.clipPath,'polygon(0 0,100% 100%,0 100%)');
    assert.ok(halves.every(h=>h.children[0].children.length>0),'消す前のカードの子要素を保持');
    assert.ok(halves.every(h=>h.children[0].style.getPropertyValue('pointer-events')==='none'),'写しがクリックを奪わない');
    await advance(259);assert.equal(animations.length,0);await advance(1);assert.equal(animations.length,2);
    assert.deepEqual(animations.map(a=>a.frames[1].transform),['translate(20px,-20px)','translate(-20px,20px)']);
    assert.ok(animations.every(a=>a.at===260&&a.options.duration===500));
    await advance(499);assert.ok(halves.every(h=>!h.removed));await advance(1);assert.ok(halves.every(h=>h.removed));
    await advance(139);assert.deepEqual(views.at(-1).values[1],before);await advance(1);assert.equal(views.at(-1).at,900);
    assert.deepEqual(views.at(-1).values[1],_panelCharacterPreviewStats(_getPartyBoardUnit(),1,source));
    assert.equal(saves.length,1,'演出中に効果・保存を再実行しない');
  });
  await check('ヘルナイト：新しい剣戟の定義が登録されたら同じ起動経路で選ぶ',()=>{
    fresh('C116');const original=VbFx;
    try{global.VbFx={...original,effects:[...original.effects,{name:'hellknight-slash'}]};
      cardActivationClick(1);handleCardActivationTarget(3);assert.equal(plays[0].name,'hellknight-slash');
    }finally{global.VbFx=original;}
  });
  await check('起動の規則：取得直後は不可、戦闘終了で1回充填、使用後は不可',()=>{
    fresh('C109');const card=G.mainBoard[1];delete card._activationReady;assert.equal(cardActivationCanUse(card),false);
    chargeBoardCardActivations();assert.equal(cardActivationCanUse(card),true);chargeBoardCardActivations();assert.equal(card._activationReady,true);
    cardActivationClick(1);handleCardActivationTarget(3);assert.equal(cardActivationCanUse(card),false);
    const el=node();card._activationReady=true;wireCardActivation(el,card,1);assert.ok(el.children.some(c=>c.className==='card-activation-ready-label'));
  });
  console.log(`activation_1025: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
