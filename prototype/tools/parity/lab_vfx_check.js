'use strict';
// 実戦のコアイベント→PvE presenter→本物のVbFxをChromeで再生する。
// VB_ONLY=C054,E067 / VB_SPEED=3 で絞れる。画面描画を代替しない。
const fs=require('node:fs'),path=require('node:path');
const {launch}=require('./headless');
const BASE=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const SPEED=Math.max(1,Math.min(3,Number(process.env.VB_SPEED)||1));
const fixtures=fs.readFileSync(path.join(__dirname,'lab_vfx_fixtures.js'),'utf8');
const setup=`
  vbLabVfxResetBattle();
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  document.getElementById('scr-battle').classList.add('active');document.body.className='';
  setScreenAssetBackground('battle','stage1');
`;
const results=[];
function check(name,ok,detail){results.push({name,ok:!!ok,detail});console.log((ok?'OK ':'NG ')+name+(detail?' '+detail:''));}
(async()=>{
  const b=await launch();
  try {
    await b.call('Network.enable');
    await b.call('Emulation.setDeviceMetricsOverride',{width:1860,height:1180,deviceScaleFactor:1,mobile:false});
    await b.goto(BASE,1800);await b.waitFor("typeof PANEL_POOL!=='undefined'&&PANEL_POOL.length>0&&typeof VbFx!=='undefined'");
    await b.eval(fixtures+`
      window.__labCalls=[];window.__labSound=[];window.__labDone=[];
      window.__labScale=${SPEED};
      const originalPlay=VbFx.play,originalSound=playSfx,originalBegin=presentLabBeginEvent;
      window.presentLabBeginEvent=async function(ev,...rest){window.__labEventType=ev.type;return originalBegin(ev,...rest);};
      window.getBattlePresentationSpeedScale=()=>window.__labScale;
      VbFx.play=function(name,opt){
        window.__labCalls.push({name,speed:opt.speed,value:opt.value,event:window.__labEventType,impacts:[],at:performance.now(),
          board:!!opt.board&&(opt.board===document.getElementById('battle-field')||opt.board===document.querySelector('#scr-battle .battle-area'))});
        const entry=window.__labCalls[window.__labCalls.length-1],impact=opt.onImpact;
        return originalPlay(name,{...opt,onImpact:i=>{entry.impacts.push(i);(entry.impactAt=entry.impactAt||[]).push(performance.now());if(impact)impact(i);}})
          .then(result=>{window.__labDone.push(result);return result;});
      };
      // 2026-10-12: ダメージ数値を出した時刻（隕石の巻物は墜落の後に出す）。
      window.__labHits=[];const originalHit=window.playHitVfx;window.playHitVfx=function(side,target,amount){window.__labHits.push(performance.now());return originalHit.apply(this,arguments);};
      window.playSfx=function(code,opt){window.__labSound.push({code,offsetMs:opt&&opt.offsetMs});return originalSound(code,opt);};
      // fixtures は eval の関数内で評価されるため、後続の eval から見えるよう window へ出す。
      Object.assign(window,{vbLabVfxFixture,vbLabVfxTriggers,vbLabVfxCases,vbLabVfx1012Cases,vbLabVfxExtraCases,vbLabVfxPrepare,
        vbLabVfxResetBattle,vbLabVfxStartPve,vbLabVfxExpectedCalls});
      unlockSfx();
      return true;
    `);
    const cases=await b.eval('return [...Object.entries(vbLabVfx1012Cases).map(([no,trigger])=>[no,no,trigger]),...Object.entries(vbLabVfxCases).map(([no,trigger])=>[no,no,trigger]),...vbLabVfxExtraCases()];');
    for(const [no,card,trigger]of cases.filter(([no])=>!process.env.VB_ONLY||process.env.VB_ONLY.split(',').includes(no))) {
      const result=await b.eval(setup+`
        const state=vbLabVfxFixture(${JSON.stringify(card)});vbLabVfxPrepare(${JSON.stringify(no)},state);
        G.allies=state.units.p1;G.enemies=state.units.p2;
        actionBannerSetBattleData({units:state.units,items:state.items,rings:state.rings});renderAll();
        // 単発の画素を測る間は状態ループを止める。状態の画素だけで合格するのを防ぐ。
        if(_battleFxFrame)cancelAnimationFrame(_battleFxFrame);_battleFxFrame=-1;
        await new Promise(r=>requestAnimationFrame(r));
        window.__labCalls=[];window.__labSound=[];window.__labDone=[];window.__labHits=[];
        const name=presentLabFx(${JSON.stringify(no)})[0];let settled=false,error='',frames=0,painted=false,layerOK=false;
        const run=vbLabVfxStartPve(${JSON.stringify(no)},state,${JSON.stringify(trigger)});
        const promise=run.done
          .then(()=>{settled=true;},e=>{settled=true;error=String(e.stack||e);});
        const start=performance.now();
        // 結界消失のように並行で流す演出は、処理が先に終わる。演出が消えるまで見る。
        while((!settled||VbFx.snapshot().some(job=>job.name===name))&&performance.now()-start<15000) {
          await new Promise(r=>requestAnimationFrame(r));
          if(!VbFx.snapshot().some(job=>job.name===name&&job.frameMs>0))continue;
          frames++;
          const canvas=document.querySelector('[data-vb-fx-canvas]'),root=canvas&&canvas.parentNode;
          layerOK=!!root&&root.parentNode===document.getElementById('vfx-frame-clip')&&root.closest('#scr-battle')!==null;
          if(canvas&&!painted){const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
            for(let i=3;i<data.length;i+=64){if(data[i]>5){painted=true;break;}}}
        }
        if(settled)await promise;
        const calls=window.__labCalls.filter(c=>c.name===name),sounds=window.__labSound.filter(c=>c.code===${JSON.stringify(no)});
        const assetErrors=window.__labDone.flatMap(r=>r.assetErrors||[]);
        const all=window.__labCalls.filter(c=>!c.name.endsWith('-state')).map(c=>c.name);
        const ordered=vbLabVfxExpectedCalls(${JSON.stringify(no)},all)
          &&(${JSON.stringify(trigger)}!=='mana'||!vbLabVfxCases[${JSON.stringify(no)}]||calls.every(c=>c.event==='mana_threshold'));
        _forceStopAllVfx();
        await new Promise(r=>requestAnimationFrame(r));
        const firstImpact=Math.min(...calls.flatMap(c=>c.impactAt||[])),firstHit=Math.min(...window.__labHits);
        return {firstImpact,firstHit,hitAfterImpact:Number.isFinite(firstHit)&&Number.isFinite(firstImpact)&&firstHit>=firstImpact-20,evs:run.events.map(e=>e.type+':'+(e.effectNo||e.trigger||e.reason||'')),all,ordered,
          calls:calls.length,sounds:sounds.length,speeds:calls.map(c=>c.speed),boardOK:calls.every(c=>c.board),frames,painted,layerOK,settled,error,assetErrors,
          remaining:VbFx.activeCount()+document.querySelectorAll('[data-vb-fx-local],[data-battle-lab-fx]').length};
      `);
      check(no+' 実戦でLAB演出・SE・描画・後片付け',result.calls>0&&result.ordered&&(no==='shield_break'?result.sounds===0:result.sounds>0)&&result.speeds.every(s=>s===1.5*(no==='S001'?2.5:1)*SPEED)&&result.boardOK&&result.frames>0&&result.painted&&result.layerOK&&result.settled&&!result.error&&!result.assetErrors.length&&!result.remaining,
        JSON.stringify(result));
      if(no==='I006') check('I006 隕石が墜落した後にダメージを出す（2026-10-12）',result.hitAfterImpact,JSON.stringify({firstImpact:result.firstImpact,firstHit:result.firstHit}));
    }
    const states=await b.eval(setup+`
      const state=vbLabVfxFixture('C003');G.allies=state.units.p1;G.enemies=state.units.p2;
      [...G.allies,...G.enemies].forEach(u=>{u.keywords=[];u.desc='';u.poison=u.shield=u.weaken=0;});
      const u=G.allies[0];u.keywords=['根性','復活'];u.shield=3;u.poison=4;u.weaken=2;
      renderAll();await new Promise(r=>setTimeout(r,100));
      const names=['shield-state','poison-state','weaken-state','guts-state','revive-state'];
      const unique=names.every(name=>VbFx.snapshot().filter(j=>j.name===name).length===1);
      const slot=getCurrentUnitSlot('ally',u),poison=slot.querySelector('[data-vb-fx-local]'),frame=slot.querySelector('.unit-frame-layer'),status=slot.querySelector('.unit-stat-overlay-layer');
      const pz=poison&&Number(getComputedStyle(poison).zIndex),fz=frame&&Number(getComputedStyle(frame).zIndex),sz=status&&Number(getComputedStyle(status).zIndex);
      const poisonLayer=!!poison&&fz<=pz&&pz<sz&&Array.from(slot.children).indexOf(poison)>Array.from(slot.children).indexOf(frame);
      battleFxAdvanceStates(u,{poison:9});await new Promise(r=>setTimeout(r,80));
      const updated=window.__labCalls.some(c=>c.name==='poison-state'&&c.value===9)&&VbFx.snapshot().filter(j=>j.name==='poison-state').length===1;
      document.getElementById('scr-battle').classList.remove('active');await new Promise(r=>setTimeout(r,80));
      return {unique,poisonLayer,updated,pz,fz,sz,remaining:VbFx.activeCount()+document.querySelectorAll('[data-vb-fx-local]').length};
    `);
    check('状態5種・毒の層・値更新・画面切替停止',states.unique&&states.poisonLayer&&states.updated&&!states.remaining,JSON.stringify(states));
    // textだけのconsoleErrorsでは404のURLが失われる。応答/失敗もURL付きで残す。
    const requests=new Map(b.events.filter(e=>e.method==='Network.requestWillBeSent')
      .map(e=>[e.params.requestId,e.params.request.url]));
    const failed=b.events.flatMap(e=>e.method==='Network.responseReceived'&&e.params.response.status>=400
      ?[`${e.params.response.status} ${e.params.response.url}`]
      :e.method==='Network.loadingFailed'&&!e.params.canceled?[`${e.params.errorText} ${requests.get(e.params.requestId)||e.params.requestId}`]:[]);
    check('素材・通信の読み込み',failed.length===0,[...new Set(failed)].join('\n'));
    const errors=b.events.filter(e=>e.method==='Log.entryAdded'&&e.params.entry.level==='error')
      .map(e=>e.params.entry.text+(e.params.entry.url?' '+e.params.entry.url:''));
    check('ブラウザ例外なし',errors.length===0,errors.join('\n'));
  } finally {await b.close();}
  if(results.some(r=>!r.ok))process.exitCode=1;
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
