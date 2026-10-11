'use strict';
// 2026-10-11: 実際のモーション・数値DOM・画面振動を、4経路×3速度×PvE/オンラインの1本で検査。
const assert=require('node:assert/strict');
const {launch}=require('./headless');
const URL=process.env.VB_URL||'http://127.0.0.1:5500/index.html';
// 2026-10-11: 数値はopacity:0から始まる。固定2フレームではCSSアニメーションの開始時点を拾うため、
// そのラベルが表示されるフレームを観測する。色・不透明度・画面内の位置は実値で判定し、消失／1.5秒で打ち切る。
function observeDamageLabel(label){
  const deadline=performance.now()+1500;
  return new Promise(resolve=>{
    let frame=0,timer=0,done=false,frames=0,first=null,last=null;
    const finish=visible=>{
      if(done)return;done=true;
      cancelAnimationFrame(frame);clearTimeout(timer);
      resolve({visible,frames,first,last,...(visible?{visibleAt:last.at}:{})});
    };
    const sample=()=>{
      if(done)return;
      const s=getComputedStyle(label),r=label.getBoundingClientRect();
      let parentHidden=false;
      for(let p=label.parentElement;p;p=p.parentElement){
        const style=getComputedStyle(p);
        if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)<=0){parentHidden=true;break;}
      }
      last={at:performance.now(),connected:label.isConnected,display:s.display,visibility:s.visibility,opacity:s.opacity,color:s.color,parentHidden,
        rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      if(!first)first=last;frames++;
      const visible=last.connected&&!parentHidden&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&s.color!=='rgba(0, 0, 0, 0)'
        &&r.width>0&&r.height>0&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;
      if(visible||!last.connected||last.at>=deadline)finish(visible);
      else frame=requestAnimationFrame(sample);
    };
    timer=setTimeout(()=>finish(false),1500);
    frame=requestAnimationFrame(sample);
  });
}
async function run(){
  const b=await launch({width:1920,height:1080});
  try {
    let checked=0;
    for(const kind of ['normal','attack_effect','counter','effect']) for(const speed of [1,2,3]) for(const online of [false,true]) {
      // ページを分け、前ケースのタイマー・VFX・表示値を次ケースへ持ち越さない。
      await b.goto(URL);await b.waitFor('typeof initializeBattlePresentationState==="function"&&typeof PANEL_POOL!=="undefined"&&PANEL_POOL.length>0',20000);
      const result=await b.eval(`
        const kind=${JSON.stringify(kind)},speed=${speed},online=${online};
        // 2026-10-11: 通常戦闘／保存戦闘の再生と同じコア駆動フラグを立て、PvEの通常攻撃モーションを通す。
        initState();G._debugMode=true;G.phase='battle';G._coreDrivenBattle=true;G._savedBattleReplaying=true;G._battleSpeed=1;
        window.VB_OPTION_SPEED=speed===1?'normal':speed===2?'x2':'x3';
        document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
        const screen=document.getElementById('scr-battle');screen.classList.add('active');screen.style.setProperty('display','block','important');document.body.className='test-battle-active';
        const unit=(id,atk,desc='')=>({id,name:id,atk,hp:1000,maxHp:1000,lane:'front',color:'赤',keywords:[],desc,_panelSummoned:true});
        const state=createBattleState({sides:{p1:{units:[unit('attacker',kind==='normal'?80:1,kind==='attack_effect'?'攻撃：全ての敵に80ダメージを与える。':''),unit('helper',1)]},
          p2:{units:[unit('target',kind==='counter'?80:1)]}}});
        const before=structuredClone(state),events=[];
        if(kind==='effect')coreWithDamageKind(state,'other',()=>coreResolveHit(state,state.units.p1[0],state.units.p2[0],80,false,createSeededRng(7),e=>events.push(e),{effect:true,skipSourceEffects:true}));
        else runBattleCore(state,createSeededRng(7),{turnLimit:1,onEvent:e=>events.push(e)});
        G.allies=state.units.p1;G.enemies=state.units.p2;initializeBattlePresentationState();
        for(const side of ['p1','p2'])for(const u of state.units[side]){const start=before.units[side].find(x=>x.id===u.id);presentHoldShown(u,start.atk,start.hp,start.maxHp,start.shield||0);}
        renderField('f-ally',G.allies,false);renderField('f-enemy',G.enemies,true);
        actionBannerSetBattleData({units:state.units,rings:state.rings,items:state.items});
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        const shakes=[],hits=[],returns=[],visibilityChecks=[];
        const observeDamageLabel=${observeDamageLabel.toString()};
        const shake=triggerBattleScreenShake,hit=playHitVfx,trace=_recordBattleTrace;
        triggerBattleScreenShake=function(opt){
          const at=performance.now(),promise=shake(opt);
          if(_battleScreenShakeTier(opt.damage))shakes.push({at,amount:opt.damage,active:!!_battleScreenShakeAnimation||screen.classList.contains('battle-screen-shake')});
          return promise;
        };
        playHitVfx=function(side,u,amount,opt){
          const previous=amount>=50?new Set(document.querySelectorAll('.vfx-damage-label')):null;
          const at=performance.now(),promise=hit(side,u,amount,opt);
          if(amount>=50){
            const label=[...document.querySelectorAll('.vfx-damage-label')].find(el=>!previous.has(el)&&el.textContent==='-'+amount);
            const record={at,amount,unitId:u.id,dom:!!label,visible:false};hits.push(record);
            if(label)visibilityChecks.push(observeDamageLabel(label).then(observed=>Object.assign(record,observed)));
          }
          return promise;
        };
        _recordBattleTrace=function(type,data){if(type==='attack_motion_end')returns.push(performance.now());return trace(type,data);};
        if(online){
          const result={events:[{type:'battle_start',sides:structuredClone(before.units)},...structuredClone(events)],
            formations:Object.fromEntries(['p1','p2'].map(side=>[side,{units:structuredClone(before.units[side]),rings:[],items:[]}]))};
          beginOnlineVersusField(result);await playOnlineBattleEvents(result,{onEvent:(ev,ctx)=>renderOnlineVersusBoard(ev,ctx)});
        }else await _flushCorePveHitEvents(state,events,new Set([...state.units.p1,...state.units.p2]));
        await Promise.all(visibilityChecks);
        if(online)hideOnlineVersusBoard();
        await new Promise(r=>setTimeout(r,80));
        return {shakes,hits,returns,expected:events.filter(e=>e.type==='damage'&&e.amount>=50).length};
      `);
      const name=`${kind} ${speed}倍 ${online?'オンライン':'PvE'}`;
      assert.equal(result.expected,1,name+' コアの大ダメージ');
      assert.equal(result.hits.length,1,name+' 数値の重複／欠落');
      assert.ok(result.hits[0].dom&&result.hits[0].visible,name+' ダメージ数値が画面上で見える: '+JSON.stringify(result.hits[0]));
      // 2026-10-12 利用者指定：振動は攻撃で与えた大ダメージだけ。反撃・攻撃効果・効果ダメージでは振動しない。
      if(kind!=='normal'){assert.equal(result.shakes.length,0,name+' 攻撃以外は振動しない');console.log('OK '+name);checked++;continue;}
      assert.equal(result.shakes.length,1,name+' 振動の重複／欠落');
      assert.ok(result.shakes[0].active,name+' 実際の振動アニメーションが開始している');
      assert.ok(result.hits[0].dom&&result.hits[0].visible,name+' ダメージ数値が画面上で見える: '+JSON.stringify(result.hits[0]));
      assert.ok(Math.abs(result.shakes[0].at-result.hits[0].at)<48,name+' 数値・被弾VFXと同じフレームで振動を開始: '+JSON.stringify(result));
      if(kind!=='effect'){assert.ok(result.returns.length,name+' 攻撃者の戻り完了');assert.ok(result.shakes[0].at<result.returns[0],name+' 戻る前に振動を開始');}
      console.log('OK '+name);checked++;
    }
    console.log('2026-10-11 ダメージ振動: '+checked+'組合せOK');
  } finally {await b.close();}
}
if(require.main===module)run().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={observeDamageLabel};
