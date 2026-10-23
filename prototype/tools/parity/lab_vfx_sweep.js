'use strict';
// 全カードの効果を実戦のコア→PvE presenter→本物のVbFxで発動させ、出たVFXを一覧にする（2026-10-23 利用者指定
// 「LABと合わせてVFXの再検証を行ってください。ゴーレムなど、出なくなったものがあります。」）。
// 本文のトリガ（攻撃・負傷・死亡・開戦・Nマナ・終戦・解放・一部の常時）ごとに1回ずつ発動させる。
// VB_URL で別の版（改訂前の worktree など）を指せる。VB_OUT に結果のJSONを書く。VB_ONLY=C003,E001 で絞れる。
const fs=require('node:fs'),path=require('node:path');
const {launch}=require('./headless');
const BASE=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
const OUT=process.env.VB_OUT||'';
const fixtures=fs.readFileSync(path.join(__dirname,'lab_vfx_fixtures.js'),'utf8');
const setup=`
  vbLabVfxResetBattle();
  document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
  document.getElementById('scr-battle').classList.add('active');document.body.className='';
  setScreenAssetBackground('battle','stage1');
`;
(async()=>{
  const b=await launch();
  const rows=[];
  try {
    await b.call('Emulation.setDeviceMetricsOverride',{width:1860,height:1180,deviceScaleFactor:1,mobile:false});
    await b.goto(BASE,1800);await b.waitFor("typeof PANEL_POOL!=='undefined'&&PANEL_POOL.length>0&&typeof VbFx!=='undefined'");
    await b.eval(fixtures+`
      window.__labCalls=[];window.__labSounds=[];
      const originalPlay=VbFx.play,originalSfx=window.playSfx;
      window.playSfx=function(code,opt){window.__labSounds.push(String(code));return originalSfx.apply(this,arguments);};
      window.getBattlePresentationSpeedScale=()=>3;
      VbFx.play=function(name,opt){window.__labCalls.push(name);return originalPlay(name,opt);};
      Object.assign(window,{vbLabVfxFixture,vbLabVfxTriggers,vbLabVfxResetBattle,vbLabVfxStartPve});
      // 常時の誘発は本文の言い回しから観測の入口を選ぶ。
      window.__sweepTriggers=desc=>{
        const out=new Set(),text=String(desc||'');
        for(const m of text.matchAll(/(?:^|[。\\n])\\s*((?:攻撃|負傷|死亡)(?:[＆&](?:攻撃|負傷|死亡))*|開戦|終戦|解放|常時|\\d+マナ毎?)\\s*[：:]([^。]*)/g)){
          const label=m[1],body=m[2];
          for(const t of label.split(/[＆&]/)){
            if(t==='攻撃')out.add('attack');else if(t==='負傷')out.add('injury');else if(t==='死亡')out.add('death');
            else if(t==='開戦')out.add('opening');else if(t==='終戦')out.add('battleEnd');else if(t==='解放')out.add('release');
            else if(/マナ/.test(t))out.add('mana');
            else if(t==='常時'){
              if(/死亡する(?:たび|度)|死亡した/.test(body))out.add('observerDeath');
              if(/結界を失/.test(body))out.add('shieldLost');
              if(/攻撃(?:する|した)(?:たび|度)|攻撃効果/.test(body))out.add('allyAttack');
              if(/ATKを得る(?:たび|度)/.test(body))out.add('atkGain');
            }
          }
        }
        return [...out];
      };
      unlockSfx();
      return true;
    `);
    const cases=await b.eval(`
      const only=${JSON.stringify(process.env.VB_ONLY||'')}.split(',').filter(Boolean);
      return PANEL_POOL.filter(c=>c&&c.no&&/^(C|E)\\d{3}$/.test(c.no)&&c._implemented!==false&&c.desc&&['キャラクター','エンチャント'].includes(c.category)
        &&(!only.length||only.includes(c.no)))
        .flatMap(c=>__sweepTriggers(c.desc).map(t=>[c.no,c.name,c.desc,t]));
    `);
    console.log('cases',cases.length);
    for(const [no,name,desc,trigger] of cases) {
      let result;
      try {
        result=await b.eval(setup+`
          const state=vbLabVfxFixture(${JSON.stringify(no)});
          G.allies=state.units.p1;G.enemies=state.units.p2;
          actionBannerSetBattleData({units:state.units,items:state.items,rings:state.rings});renderAll();
          if(_battleFxFrame)cancelAnimationFrame(_battleFxFrame);_battleFxFrame=-1;
          await new Promise(r=>requestAnimationFrame(r));
          window.__labCalls=[];window.__labSounds=[];
          let error='';
          const run=vbLabVfxStartPve(${JSON.stringify(no)},state,${JSON.stringify(trigger)});
          await Promise.race([run.done.catch(e=>{error=String(e&&e.message||e);}),new Promise(r=>setTimeout(r,9000))]);
          const calls=window.__labCalls.filter(n=>!/-state$/.test(n)),sounds=[...new Set(window.__labSounds)];
          _forceStopAllVfx();
          await new Promise(r=>requestAnimationFrame(r));
          return {events:run.events.map(e=>e.type+(e.reason?':'+e.reason:e.kind?':'+e.kind:'')),calls,sounds,error};
        `);
      } catch(e) { result={events:[],calls:[],sounds:[],error:String(e&&e.message||e)}; }
      rows.push({no,name,desc,trigger,...result});
      console.log([no,name,trigger,result.calls.join('|')||'-','SE:'+(result.sounds.join('|')||'-'),result.events.filter(e=>!/^(effect_flash|turn_begin)/.test(e)).slice(0,6).join(' '),result.error].join('\t'));
    }
  } finally {await b.close();}
  if(OUT) fs.writeFileSync(OUT,JSON.stringify(rows,null,1));
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
