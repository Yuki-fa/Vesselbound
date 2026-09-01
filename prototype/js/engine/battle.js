// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, pool.js
// ═══════════════════════════════════════

let _isBossFight = false;

// デバッグ実機でのみ有効にする戦闘タイムライン。通常プレイの状態・性能には影響させない。
// コアへ渡すstateの資源をGへ書き戻す唯一の経路。
// goldだけ書き戻してlifeを忘れると、我慢の指輪のように
// オンラインでは効くのにPvEでは効かない効果ができる。
// 画面に出ているライフは G._waveLife（宿屋の回復・敗北の減少はこちらを動かす）。
// G.life は旧来の値で、HUDは参照していない。コアへ渡す値と書き戻し先を
// 取り違えると、ジャック・オ・ランタンのようなライフ参照の効果が
// 「表示は減っているのに満タン扱い」になる。ここを唯一の入口にする。
function _currentBattleLife(){
  if(typeof G==='undefined'||!G) return 3;
  if(G._waveLife!=null) return Math.max(0,Number(G._waveLife)||0);
  return G.life==null?3:Math.max(0,Number(G.life)||0);
}
function _currentBattleLifeMax(){
  return typeof waveLifeMax==='function'?Math.max(1,Number(waveLifeMax())||3):3;
}
function _syncCoreLifeToG(state){
  if(!state||!state.life||state.life.p1==null) return;
  const next=Math.max(0,Number(state.life.p1)||0);
  // 表示に使われている方を必ず更新する。片方だけ書くと画面と食い違う。
  if(G._waveLife!=null) G._waveLife=next;
  G.life=next;
  if(typeof updateHUD==='function') updateHUD();
}
function _syncCoreResourcesToG(state){
  if(!state) return;
  if(state.resources&&state.resources.p1) G.gold=Math.max(0,Number(state.resources.p1.gold)||0);
  if(state.life&&state.life.p1!=null) G.life=Math.max(0,Number(state.life.p1)||0);
  if(state.blood){ G._blood=Math.max(0,Number(state.blood.p1)||0); G._enemyBlood=Math.max(0,Number(state.blood.p2)||0); }
}
function _syncCoreBloodToG(state){
  if(!state||!state.blood) return;
  G._blood=Math.max(0,Number(state.blood.p1)||0);
  G._enemyBlood=Math.max(0,Number(state.blood.p2)||0);
}
// 不具合の切り分け用。デバッグモードで再現した直後にコンソールで vbDiag() を実行すると、
// 盤面・召喚体・マナ効果VFX・攻撃モーションの状態をまとめて出す。
// 推測で直す前に、まずここで実際に起きていることを確認すること。
function _vbDiagRun(){
  const out=[];
  const dom=side=>{
    const f=document.getElementById(side==='p1'?'f-ally':'f-enemy');
    if(!f) return [];
    return [...f.querySelectorAll('.slot[data-unit-id]')].map(x=>{
      const r=x.getBoundingClientRect();
      return {id:String(x.dataset.unitId||''),左:Math.round(r.left),幅:Math.round(r.width),
        見える:r.width>0&&getComputedStyle(x).visibility!=='hidden'};
    });
  };
  ['p1','p2'].forEach(side=>{
    const arr=side==='p1'?(G.allies||[]):(G.enemies||[]);
    const d=dom(side);
    out.push(`■ ${side==='p1'?'味方':'敵'} 配列`);
    arr.forEach((u,i)=>{ if(!u) return;
      const has=d.some(x=>x.id===String(u.id));
      out.push(`   [${i}] ${u.name} hp${u.hp} ${u.lane||'front'}`
        +(u._corePendingSummon?' ★保留':'')+(u._isObject?' obj':'')+(u._isSoul?' soul':'')
        +(has?'':' ★DOM無し'));
    });
    out.push(`   DOM: ${d.map(x=>x.id+'@'+x.左+(x.見える?'':'(不可視)')).join(' ')||'（なし）'}`);
  });
  const tr=(window.__battleTrace||[]);
  const pick=re=>tr.filter(e=>re.test(String(e.stage))).slice(-14)
    .map(e=>`   ${Math.round(e.t)} ${e.stage} ${e.unitId||e.attackerId||e.name||''}`
      +(e.reason?` [${e.reason}]`:'')+(e.missing?' ★位置が取れずVFX無し':'')
      +(e.attackerFound===false?' 攻撃者不明':'')+(e.targetFound===false?' 対象不明':'')
      +(e.味方?` ライフ${e.life!=null?e.life:'?'}/state${e.stateLife!=null?e.stateLife:'?'} 味方=[${e.味方}]`:'')
      +(e.盤面?` 盤面=[${e.盤面}]`:'')+(e.取得===false?' ★位置取得できず':'')
      +(e.スロット有===false?' スロット無し':''));
  out.push('■ 召喚', ...pick(/summon|render_skip_pending/));
  out.push('■ 開戦', ...pick(/opening_effects_done|opening_mana_scan_done/));
  out.push('■ マナ効果VFX', ...pick(/mana_vfx|mana_state/));
  const battleShown=!!document.querySelector('#scr-battle.active');
  if(!battleShown) out.push('   ※戦闘画面が表示されていない状態で採取（DOM欄は当てになりません）');
  out.push('■ 攻撃モーション', ...pick(/attack_motion/));
  const vfx=[...document.querySelectorAll('.damage-vfx-host')].map(h=>{
    const hr=h.getBoundingClientRect(); const m=h.querySelector('img,video,canvas');
    const mr=m?m.getBoundingClientRect():null;
    return `枠${Math.round(hr.width)}x${Math.round(hr.height)}@${Math.round(hr.left)},${Math.round(hr.top)}`
      +(m?` 絵${Math.round(mr.width)}x${Math.round(mr.height)} 不透明度${getComputedStyle(m).opacity}`:' 絵なし');
  });
  out.push('■ 表示中のVFX', ...(vfx.length?vfx.map(v=>'   '+v):['   （なし）']));
  const text=out.join('\n');
  console.log(text);
  try{ if(navigator.clipboard) navigator.clipboard.writeText(text); }catch(_){ }
  return text;
}
// コンソールで `vbDiag` と打っても `vbDiag()` と打っても結果が出るようにする。
// 括弧を忘れると関数そのものが表示されるだけで、何も分からないため。
if(typeof window!=='undefined'){
  try{
    // 実体は _vbDiagRun。ここを function vbDiag(){} で宣言してしまうと
    // グローバルのプロパティが configurable:false になり、この定義が失敗して
    // 括弧なしでは関数本体が表示されるだけになる。
    Object.defineProperty(window,'vbDiag',{configurable:true,get(){
      const text=_vbDiagRun();
      const f=()=>text; f.toString=()=>text;
      return f;
    }});
  }catch(_){ window.vbDiag=_vbDiagRun; }
  window.vbdiag=_vbDiagRun;
}
function _recordBattleTrace(stage, data){
  const debugMode=(typeof G!=='undefined'&&G&&G._debugMode)
    || (typeof document!=='undefined'&&document.body&&document.body.classList.contains('debug-mode'));
  if(typeof window==='undefined'||(!window.__captureBattleTrace&&!debugMode)) return;
  const trace=window.__battleTrace||(window.__battleTrace=[]);
  const entry={stage,t:performance.now(),...(data||{})};
  trace.push(entry);
  // 上限検証の拒否と表示待ちタイムアウトは、通常の直近100件ログから
  // 押し出されても実機判定できるよう、デバッグ専用の別ログへ保持する。
  // 通常モードではこの関数自体が早期returnするため状態・性能へ影響しない。
  if(/rejected|timeout|death_vfx_start|summon_(?:flush|dom|animation|event_generated)|unit_dom_append|attack_effect_(?:dispatch|iteration)|injury_effect_vfx_(?:start|done)|stat_change_effect_cue|mana_(?:vfx|state|threshold)_(?:start|deferred|reverse_start|reverse_confirmed|apply|restore_start|restore_done|generated|missing)|battle_compact_(?:layout|flip|transition_start|transition_sample)|battle_opening_layout_settled|attack_motion_rects/.test(String(stage))){
    const important=window.__battleTraceImportant||(window.__battleTraceImportant=[]);
    important.push(entry);
    if(typeof document!=='undefined'&&document.documentElement){
      document.documentElement.dataset.battleTraceImportant=_battleTraceJson(important.slice(-300));
    }
  }
  // ブラウザ自動化環境ではwindowへのプロパティ追加が禁止される場合があるため、
  // DOM属性にも直列化して公開する。デバッグモード限定で、通常画面には残さない。
  if(typeof document!=='undefined'&&document.documentElement){
    document.documentElement.dataset.battleTrace=_battleTraceJson(trace.slice(-100));
  }
}
// 記録には稀にユニットそのものが混ざり、ユニット同士が互いを指す（_lastDamageSource等）ため
// JSON.stringify が循環参照で例外を投げる。ログの直列化が戦闘処理を止めてはならないので、
// 循環は伏せ字にし、それでも失敗したら記録を諦める。
function _battleTraceJson(list){
  const seen=new WeakSet();
  try{
    return JSON.stringify(list,(key,value)=>{
      if(value&&typeof value==='object'){
        if(seen.has(value)) return '[循環]';
        seen.add(value);
      }
      return value;
    });
  }catch(_){ return '[]'; }
}

// 魔術レベル上昇時の共通処理

// ゴールド獲得時の共通処理
function goldIncomeMultiplier(){
  return typeof _hasRingNamed==='function'&&_hasRingNamed('強欲の指輪')?1.2:1;
}

function goldIncomeAmount(amount){
  const base=Math.max(0,Number(amount)||0);
  return Math.floor(base*goldIncomeMultiplier());
}

function onGoldGained(amount){
  // 図書館の試験戦闘は練習用。敵を倒してもゴールドは入らない。
  // 個々の獲得経路（撃破報酬・効果・指輪）を全て塞ぐより入口で止める方が漏れがない。
  if(G&&G._testBattleMode) return 0;
  const gained=goldIncomeAmount(amount);
  G.gold=(G.gold||0)+gained;
  G.earnedGold=(G.earnedGold||0)+gained;
  updateHUD();
  return gained;
}

function _normalizeAttackSfxType(unit){
  const raw=String(unit?.sfxType||unit?.attackSfx||unit?.soundType||'').trim().toLowerCase();
  if(['sword','axe','punch','kick'].includes(raw)) return raw;
  if(raw==='剣') return 'sword';
  if(raw==='斧') return 'axe';
  if(raw==='パンチ') return 'punch';
  if(raw==='キック') return 'kick';
  return '';
}

function _attackSfxLevel(amount){
  const n=Number(amount)||0;
  if(n>=51) return 3;
  if(n>=21) return 2;
  if(n>=1) return 1;
  return 0;
}

function playAttackDamageSfx(attacker,amount){
  if(typeof playSfx!=='function') return false;
  const type=_normalizeAttackSfxType(attacker);
  const lv=_attackSfxLevel(amount);
  // attack.wavは攻撃開始時、武器種別SEは命中時に鳴らす旧来の2段構成へ戻す。
  if(!type||!lv) return false;
  return playSfx(`${type}${lv}`,{group:'combat',guardKey:`combat:${type}${lv}:${uid()}`,guardMs:0});
}

function playDamageEffectSfx(kind){
  if(typeof playSfx!=='function') return false;
  if(kind==='all') return playSfx('superMagic',{group:'magic'});
  return playSfx('fire',{group:'magic'});
}

function _playCardEffectSfx(code){
  if(typeof playSfx!=='function') return false;
  return playSfx(code,{group:'magic',guardKey:`effect:${code}:${uid()}`,guardMs:0});
}

function _effectVfxSource(code){
  return {artCode:code,no:code,_code:code};
}

function _effectPresentationCode(unit){
  const code=String(unit?.no||unit?.artCode||'').toUpperCase();
  // コボルドの効果演出・SEはカード固有素材ではなくC003を共用する。
  return code==='C007'?'C003':code;
}

// カード固有VFXは「そのカード本来の効果」の演出である。
// 強化カードで得た効果（ノームに闇の炎を付けた場合の死亡ダメージ等）で再生すると、
// 効果と無関係な演出（ノームなら金貨）が対象へ出てしまう。
// マスターデータ上の本来の効果文にダメージを与える記述が無いキャラクターは、
// ダメージ演出に固有VFXを使わない（通常の被弾VFXへ戻す）。
function _ownCardEffectText(unit){
  if(!unit) return '';
  const code=_effectPresentationCode(unit);
  const pool=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))?PANEL_POOL:[];
  const base=pool.find(p=>p&&String(p.no||p.artCode||'').toUpperCase()===code)
    ||pool.find(p=>p&&p.name===unit.name);
  return String((base&&base.desc)||'');
}
function _characterVfxAllowedForDamage(unit){
  if(!unit) return false;
  return /ダメージ/.test(_ownCardEffectText(unit));
}

function _playCardEffectVfx(code,targets,options){
  const list=[...(targets||[])].filter(Boolean);
  if(!list.length||typeof playHitVfxAtRect!=='function') return Promise.resolve();
  const opt=options||{};
  return Promise.all(list.map(target=>{
    const side=(G.enemies||[]).includes(target)?'enemy':'ally';
    const getRect=()=>typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(target,side):null;
    const play=rect=>Promise.resolve(playHitVfxAtRect(rect,0,{
      effectSource:_effectVfxSource(code),
      gateMs:opt.gateMs??180,
      hitDuration:opt.hitDuration??900,
      waitForFinish:!!opt.waitForFinish,
      getRect,
      onFadeStart:opt.onFadeStart,
      // 大きさは playHitVfxAtRect が present.js の規則で決める（ここには書かない）。
      vfxScale:opt.vfxScale,
    })).catch(()=>{});
    const rect=getRect();
    if(rect&&rect.width>0&&rect.height>0) return play(rect);
    // 効果イベント直後のrenderAll()とレイアウト確定が別フレームになる場合がある。
    // 取得不能時だけ短時間再試行し、カードが消えた場合は何も再生しない。
    return (async()=>{
      for(let i=0;i<12;i++){
        await _awaitFrame();
        const retry=getRect();
        if(retry&&retry.width>0&&retry.height>0) return play(retry);
      }
    })();
  }));
}
async function _waitForPendingVfx(){
  // 通常戦闘の終了処理でも呼ばれるため、ここでは「今再生中のVFX」のスナップショットだけを待つ。
  // 新たに始まった演出まで待ち続けると、勝利処理が演出の連鎖に引きずられて遅れる。
  const active=window.__activeVfxPromises;
  if(!active||!active.size) return;
  await Promise.all([...active].map(p=>Promise.resolve(p).catch(()=>{})));
}
async function _playManaEffectCue(unit,isEnemySide){
  if(!unit) return;
  _recordBattleTrace('mana_vfx_start',{unitId:unit.id});
  if(typeof playSfx==='function') playSfx('K026',{group:'magic',guardKey:`mana-effect:${uid()}`,guardMs:0});
  let rect=null;
  // 開戦直後・召喚直後はrenderAll()とレイアウト確定が別フレームになる。
  // ここでnullのまま返すと、VFXなしでマナ効果だけが先に解決されるため、
  // DOM上の対象矩形が取れるまで短時間だけ再取得する。
  if(typeof _captureUnitDamageRect==='function'){
    for(let i=0;i<24&&!rect;i++){
      rect=_captureUnitDamageRect(unit,isEnemySide?'enemy':'ally');
      if(rect&&rect.width>0&&rect.height>0) break;
      rect=null;
      // 開戦直後はマナ効果がDOM描画より先に走るため、待つだけでは
      // 何フレーム経ってもスロットが生まれない。数フレームで取れない時は
      // 一度こちらから盤面を描かせる。これをしないと _captureUnitDamageRect()
      // が最後までnullのままになり、VFXを1枚も出さずに200msだけ待って
      // 抜ける経路へ落ちる（＝マナ効果VFXが出ない）。
      if(i===3||i===11){
        if(typeof requestBattleCompact==='function') requestBattleCompact({forceDuringMotion:true});
        else if(typeof renderAll==='function') renderAll();
      }
      await _awaitFrame();
    }
  }
  // それでも位置が取れない場合は、盤面の味方／敵エリアの中央へ出す。
  // 「出ない」より「位置がずれても出る」ほうが、効果が働いたことは伝わる。
  _recordBattleTrace('mana_vfx_rect',{unitId:unit.id,取得:!!rect,
    幅:rect?Math.round(rect.width):0,左:rect?Math.round(rect.left):0,
    スロット有:!!(typeof getCurrentUnitSlot==='function'&&getCurrentUnitSlot(isEnemySide?'enemy':'ally',unit))});
  if(!rect){
    const field=document.getElementById(isEnemySide?'f-enemy':'f-ally');
    const fr=field&&field.getBoundingClientRect&&field.getBoundingClientRect();
    if(fr&&fr.width>0&&fr.height>0){
      const w=Math.min(fr.width,fr.height*0.7)||fr.width;
      rect={left:fr.left+(fr.width-w)/2,top:fr.top+fr.height/4,width:w,height:fr.height/2};
      _recordBattleTrace('mana_vfx_field_fallback',{unitId:unit.id});
    }
  }
  if(!rect||typeof playHitVfxAtRect!=='function'){
    // 開戦直後などで対象DOMを取得できない場合でも、状態だけを即時に
    // 反映してしまうと、VFXが出た場合と処理時刻が変わる。旧演出の
    // 「命中表示→逆再生開始」に相当する時刻まで待ってから、同じ
    // コールバック境界を通す。これにより、VFXの有無で召喚・バフ・
    // マナ閾値効果の順序が変わらない。
    _recordBattleTrace('mana_vfx_missing',{unitId:unit.id});
    await new Promise(resolve=>setTimeout(resolve,200));
    _recordBattleTrace('mana_vfx_reverse_start',{unitId:unit.id,missing:true});
    _recordBattleTrace('mana_vfx_reverse_confirmed',{unitId:unit.id,missing:true});
    return;
  }
  let resolveReverseStart;
  const reverseStart=new Promise(resolve=>{ resolveReverseStart=resolve; });
  playHitVfxAtRect(rect,0,{
    keywordEffect:'マナ効果',
    gateMs:0,
    hitDuration:900,
    fadeDuration:700,
    vfxScale:.5,
    spin:true,
    getRect:()=>_captureUnitDamageRect(unit,isEnemySide?'enemy':'ally'),
    onFadeStart:()=>{ _recordBattleTrace('mana_vfx_reverse_start',{unitId:unit.id}); resolveReverseStart(); },
  }).catch(()=>resolveReverseStart());
  // マナ効果の状態変更・追加召喚は、VFXの消え始め（逆再生開始）まで保留する。
  // VFXアセットの読み込み失敗などでonFadeStartが届かない場合だけ安全弁を使う。
  // 通常時は必ず逆再生開始コールバックが先に解決するため、状態変更時刻は変わらない。
  const reverseFallback=new Promise(resolve=>setTimeout(resolve,1100));
  await Promise.race([reverseStart,reverseFallback]);
  _recordBattleTrace('mana_vfx_reverse_confirmed',{unitId:unit.id});
}

function _liveBattleUnits(list,isEnemy){
  return (list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!_isSealed(u)&&(isEnemy||!u._isSoul));
}

function _battleAttackValue(unit,isEnemy){
  if(!unit||unit.hp<=0||_isSealed(unit)) return 0;
  if(isEnemy) return unit.nullified>0?0:(unit.atk||0);
  return typeof _attackDamageValue==='function'?_attackDamageValue(unit):(unit.atk||0);
}

function _battleAttackCapableUnits(list,isEnemy){
  return _liveBattleUnits(list,isEnemy).filter(u=>_battleAttackValue(u,isEnemy)>0||u.poison>0);
}

function _battleEstimateRoundsLeft(){
  const allies=_liveBattleUnits(G.allies,false);
  const enemies=_liveBattleUnits(G.enemies,true);
  const allyAtk=allies.reduce((s,u)=>s+Math.max(0,_battleAttackValue(u,false)),0);
  const enemyAtk=enemies.reduce((s,u)=>s+Math.max(0,_battleAttackValue(u,true)),0);
  const allyHp=allies.reduce((s,u)=>s+(u.hp||0),0);
  const enemyHp=enemies.reduce((s,u)=>s+(u.hp||0),0);
  const toEnemies=allyAtk>0?enemyHp/allyAtk:Infinity;
  const toAllies=enemyAtk>0?allyHp/enemyAtk:Infinity;
  return Math.min(toEnemies,toAllies);
}

function _battleAnySideUnable(){
  const allies=_liveBattleUnits(G.allies,false);
  const enemies=_liveBattleUnits(G.enemies,true);
  const allyUnable=allies.length>0&&allies.every(u=>_battleAttackValue(u,false)<=0&&!u.poison);
  const enemyUnable=enemies.length>0&&enemies.every(u=>_battleAttackValue(u,true)<=0&&!u.poison);
  return allyUnable||enemyUnable;
}

function _battleAllCapableAttacked(){
  const seen=G._battleAttackedIds||{};
  const units=[
    ..._battleAttackCapableUnits(G.allies,false),
    ..._battleAttackCapableUnits(G.enemies,true),
  ];
  return units.length>0&&units.every(u=>seen[u.id]);
}

function _estimateBattleRemainingMs(){
  const liveCount=_liveBattleUnits(G.allies,false).length+_liveBattleUnits(G.enemies,true).length;
  const rounds=_battleEstimateRoundsLeft();
  if(!Number.isFinite(rounds)) return Infinity;
  return rounds*Math.max(1,liveCount)*520;
}

function getBattleSpeedScale(){
  if(!G) return 1;
  const from=Number(G._battleSpeedFrom||G._battleSpeed||1);
  const target=Number(G._battleSpeedTarget||1);
  const changed=Number(G._battleSpeedChangedAt||performance.now());
  const t=Math.min(1,(performance.now()-changed)/3000);
  const scale=from+(target-from)*t;
  G._battleSpeed=scale;
  return Math.max(1,Math.min(1.5,scale));
}

function _setBattleSpeedTarget(target){
  target=Math.max(1,Math.min(1.5,target||1));
  if(!G||G._battleSpeedTarget===target) return;
  G._battleSpeedFrom=getBattleSpeedScale();
  G._battleSpeedTarget=target;
  G._battleSpeedChangedAt=performance.now();
}

function updateBattleSpeedMode(){
  if(!G||G.phase!=='enemy') return getBattleSpeedScale();
  const liveTotal=_liveBattleUnits(G.allies,false).length+_liveBattleUnits(G.enemies,true).length;
  const elapsed=performance.now()-(G._battleStartedAt||performance.now());
  const shouldSlow=liveTotal<=5;
  const roundsLeft=_battleEstimateRoundsLeft();
  const fastReasons=[];
  if(!shouldSlow&&_battleAllCapableAttacked()&&roundsLeft>=2) fastReasons.push('all_capable_attacked');
  if(!shouldSlow&&elapsed>=15000&&_estimateBattleRemainingMs()>=30000) fastReasons.push('elapsed_15s_remaining_30s');
  if(!shouldSlow&&_battleAnySideUnable()) fastReasons.push('side_unable');
  const shouldFast=fastReasons.length>0;
  const speedReason=shouldSlow?'slow_5_or_less':(fastReasons.join('+')||'normal');
  if(G._battleSpeedReason!==speedReason){
    G._battleSpeedReason=speedReason;
    _recordBattleTrace('battle_speed_condition',{reason:speedReason,liveTotal,elapsed:Math.round(elapsed),roundsLeft});
  }
  _setBattleSpeedTarget(shouldFast?1.5:1);
  return getBattleSpeedScale();
}

function battleSleep(ms){
  updateBattleSpeedMode();
  const speed=getBattleSpeedScale();
  // 通常速度は1.60倍まで遅くし、1.5倍速時は従来の1.12倍相当へ戻して加速後のテンポを維持する。
  const fastProgress=Math.max(0,Math.min(1,(speed-1)/.5));
  const tempoMul=1.6-(.48*fastProgress);
  return sleep((Number(ms)||0)*tempoMul/speed);
}

function _markBattleAttacked(unit){
  if(!unit) return;
  G._battleAttackedIds=G._battleAttackedIds||{};
  G._battleAttackedIds[unit.id]=true;
}

function _hasRingEffect(key){
  return _effectiveRings().some(r=>r&&r.ringEffectKey===key);
}

// 装備中の指輪（4枠）から、効果判定に使う「実効指輪」一覧を返す。
// 鏡の指輪は「右隣（配列で1つ後ろ）の指輪と同じ効果を持つ」ため、右隣の指輪に解決してから
// 判定する。鏡の指輪が連続する等の循環を避けるため、解決は最大4回までに留める。
function _effectiveRings(){
  const rings=Array.isArray(G.rings)?G.rings:[];
  return rings.map((r,i)=>{
    if(!r||r._disabled) return null;
    let cur=r,idx=i,depth=0;
    while(cur&&cur.name==='鏡の指輪'&&depth<4){
      idx+=1;
      cur=rings[idx]||null;
      if(cur&&cur._disabled) return null;
      depth++;
    }
    return cur;
  }).filter(Boolean);
}
function _hasRingNamed(name){
  return _effectiveRings().some(r=>r&&r.name===name);
}
function _ringCount(name){
  return _effectiveRings().filter(r=>r&&r.name===name).length;
}
// 加護X：敵から与えられる状態異常をX回無効化する。
// 加護の指輪装備時は、従来どおり味方全員を無制限に保護する。
function _isAilmentImmune(unit){
  // 指輪による無条件保護だけがG依存。加護Xの残り回数の消費はコアが持つ。
  if((G.allies||[]).includes(unit)&&_hasRingNamed('加護の指輪')) return true;
  return coreConsumeWardCharge(unit);
}

function _tryNecromancerRingRevive(){
  // コア駆動の戦闘では復活（指輪・キーワード）は coreTryRevive() が解決する。
  // ここで別の復活を足すと、コアが知らない蘇生が起きて盤面が食い違う。
  if(G._coreDrivenBattle) return false;
  if(G._necromancerRingUsed||!_hasRingEffect('necromancer_ghosts')) return false;
  const hasLivingFront=(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&!_isSealed(a)&&String(a.lane||'front')==='front');
  if(hasLivingFront) return false;
  G._necromancerRingUsed=true;
  for(let i=0;i<3;i++) void _spawnAdhocAllyUnit('青スケルトン',4,2,false,{rightmost:true});
  log('不死の指輪が発動し、青スケルトンを3体召喚した。','good');
  renderAll();
  return true;
}

// applyDamageBatch() は死亡VFXを全死亡者分まとめて先に開始し、死亡効果の完了後に
// processAllyDeath()/processEnemyDeath()を呼ぶ。後者でも同じVFXを開始すると、死亡音は
// 1回でもカードの消失・死亡VFXだけが2回重なり、同時死亡時の表示時刻も崩れる。
function _playDeathBurnOnce(unit,isEnemySide){
  if(!unit||typeof playUnitDeathBurn!=='function') return;
  if(unit._deathFxStarted) return;
  unit._deathFxStarted=true;
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('death_vfx_start',{unitId:unit.id||null,side:isEnemySide?'p2':'p1'});
  playUnitDeathBurn(unit,isEnemySide?'enemy':'ally');
}

function _rollEnemyGold(enemy){
  const range=Array.isArray(enemy&&enemy.goldRange)?enemy.goldRange:null;
  if(!range) return 1;
  const lo=Math.max(0,Number(range[0])||0);
  const hi=Math.max(lo,Number(range[1])||lo);
  return randi(lo,hi);
}

function _initSealStates(){
  // 誰が封印されるか・何体必要かはコアが決める。盤面上の並び順だけG側から渡す。
  coreInitSealStates(_allBattleCharacters(), _fieldOrderOfUnit);
}

// 生贄が揃った時点で盤面に並ぶ生贄キャラを、左上（盤面順）から優先し、キャラごとに
// わずかにタイミングをずらしながら1体ずつS003演出で破棄する（特殊演出シート仕様）。
async function _sacrificeUnitsForSeal(requiredCount){
  if(_battleVictoryAlreadyPending()) return [];
  if(!_livingCombatUnits(G.enemies).length) return [];
  // 誰が生贄になるかの判定はコアが持つ（必要数以上揃った場合は盤面上の生贄持ちを全て捧げる。
  // 例：封印1に生贄3体なら、1体ではなく3体とも犠牲にする）。
  const available=coreSacrificeUnits(_allBattleCharacters());
  if(Number.isFinite(requiredCount)&&available.length<requiredCount) return [];
  const sacrificed=available;
  if(!sacrificed.length) return [];
  const snap=sacrificed.map(u=>clone(u));
  const ordered=[...sacrificed].sort((a,b)=>_fieldOrderOfUnit(a)-_fieldOrderOfUnit(b));
  const STAGGER_MS=180;
  // 生贄で破壊されるキャラクターの死亡効果も、通常の死亡処理と同様に発動させる
  // （死亡処理そのもの＝processAllyDeath/processEnemyDeathは経由しない。破棄演出の完了直後に
  // 死亡効果本体だけを発動し、死亡カウンター等の付随処理も揃える）。
  const fireDeathEffects=async u=>{
    const isEnemySide=(G.enemies||[]).includes(u);
    await _applyDeathKeywordEffects(u,isEnemySide);
    G.battleCounters.deaths=(G.battleCounters.deaths||0)+1;
    if(typeof _onAnyCharDeath==='function') _onAnyCharDeath(u);
  };
  if(typeof playSacrificeDestroyVfx==='function'){
    await Promise.all(ordered.map((u,i)=>sleep(i*STAGGER_MS).then(async()=>{
      if(_battleVictoryAlreadyPending()) return;
      const isEnemySide=(G.enemies||[]).includes(u);
      let deathStarted=false;
      let deathPromise=null;
      // S003は順再生後に逆再生へ切り替わる。死亡フラグと死亡効果は
      // 逆再生の開始点で発生させ、演出全体の完了待ちで後ろへずらさない。
      await playSacrificeDestroyVfx(u,isEnemySide?'enemy':'ally',()=>{
        if(deathStarted||_battleVictoryAlreadyPending()) return;
        deathStarted=true;
        deathPromise=fireDeathEffects(u);
      });
      // VFXが未ロードで中間点コールバックを通らない実装でも、既存の
      // 戦闘を停止させないためのフォールバック。通常の素材再生では不要。
      if(!deathStarted&&!_battleVictoryAlreadyPending()) deathPromise=fireDeathEffects(u);
      if(deathPromise) await deathPromise;
    })));
  } else {
    for(const u of sacrificed){
      u.hp=0;
      u._deathProcessed=true;
      u._dp=true;
      u._sacrificedForSeal=true;
      await fireDeathEffects(u);
    }
  }
  log(`封印解放のため、生贄${sacrificed.length}体を破壊した。`,'sys');
  requestBattleCompact();
  return snap;
}

function _releaseRepeatCount(unit,isEnemySide){
  const side=isEnemySide?G.enemies:G.allies;
  // 秘紋の指輪：常時：味方の解放効果は1回追加で発動する。（敵側のunitには適用しない）
  const ringExtra=isEnemySide?0:_ringCount('秘紋の指輪');
  return 1+ringExtra+_unitKeywordCount(unit,'禁断の力')+(Number(unit._effectRepeatBonus)||0);
}

// 解放効果のルール本体は共通コアへ委譲する。生贄破棄・VFX・ログはこのファイルの責務。
async function _applyReleaseEffect(unit,isEnemySide,sacrificed){
  if(!unit||unit.hp<=0||typeof coreApplyReleaseEffects!=='function') return;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[
      ...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),
      ...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])
    ],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    deferManaThresholdEffects:true,
    _deferLichSummons:true,
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot,u._voidWalkerBonus]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  // オンラインのcreateBattleState()と同じく、戦闘開始前にヴォイド・ウォーカーの
  // 戦闘修正値を紫キャラクターへ注入する。PvE側だけこの初期化が抜けていると、
  // coreStatBonus()が常に0を受け取り、魔導板の効果が編成画面には出ても戦闘中に
  // 反映されない。戦闘終了後は、アダプタ固有の一時値を元へ戻す。
  ['p1','p2'].forEach(sideKey=>{
    const sideUnits=state.units[sideKey]||[];
    const hasVoidWalker=sideUnits.some(u=>u&&u.hp>0&&coreHasEffect(u,'ヴォイド・ウォーカー'));
    sideUnits.forEach(u=>{
      if(!u) return;
      u._voidWalkerBonus=hasVoidWalker&&u.color==='紫'?1:0;
    });
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{
    localEvents.push(ev);
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  const applyHit=(source,target,amount,counter)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  };
  try{
    coreApplyReleaseEffects(unit,(sacrificed||[]).map(x=>x&&x._releaseSnapshot||x),state,coreMathRng,emit,applyHit);
  }finally{
    touched.forEach(([u,oldSide,slot,oldVoidWalkerBonus])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
      if(oldVoidWalkerBonus==null) delete u._voidWalkerBonus;
      else u._voidWalkerBonus=oldVoidWalkerBonus;
    });
  }
  const spawned=[...state.units.p1,...state.units.p2].filter(u=>u&&!before.has(u)&&!u._corePendingSummon);
  for(const spawnedUnit of spawned){
    const targetList=state.units.p1.includes(spawnedUnit)?G.allies:G.enemies;
    if(!targetList.includes(spawnedUnit)) targetList.push(spawnedUnit);
    await _afterPanelSummon(spawnedUnit,targetList===G.enemies,false,true);
  }
  await _flushCorePveHitEvents(state,localEvents,before);
}

// 被弾のダメージ表示が出てから負傷効果を発動するまでの間（ms）。
// 値は battle/present.js の PRESENT_HIT_BEAT_MS が唯一の定義。オンラインの再生も同じ値を使う。
// ここで別の数値を書くと、PvEとオンラインでテンポが食い違う。
// ダメージ数値の順番待ち。present.js が待ち時刻を共有するので、
// applyDamageBatch とイベント再生のどちらから出しても重ならない。
const damageLabelGate=typeof presentCreateDamageGate==='function'?presentCreateDamageGate():null;
const INJURY_EFFECT_DELAY_MS=(typeof PRESENT_HIT_BEAT_MS==='number'&&PRESENT_HIT_BEAT_MS)||260;

// 次のフレームを待つ。ただし必ず有限時間で戻る。
// requestAnimationFrame はタブが非表示・最小化・スロットリング中は発火しないため、
// 素の `await new Promise(r=>requestAnimationFrame(r))` は戦闘フローを止め得る
// （＝画面が固まったまま進まない）。演出の同期はベストエフォートで十分なので、
// フレームが来ないときは timeoutMs で打ち切って先へ進める。
function _awaitFrame(timeoutMs=400){
  return new Promise(resolve=>{
    let settled=false;
    const done=()=>{ if(settled) return; settled=true; resolve(); };
    requestAnimationFrame(()=>done());
    setTimeout(done,Math.max(16,Number(timeoutMs)||400));
  });
}

async function _resolveSeals(){
  // コア駆動の戦闘では coreBattleStep() が毎接触ごとに封印を再判定している。
  // ここで再度回すと生贄が二重に消費され、解放の回数が食い違う。
  if(G._coreDrivenBattle) return false;
  if(_battleVictoryAlreadyPending()) return false;
  if(!_livingCombatUnits(G.enemies).length) return false;
  if(G._resolvingSeals) return false;
  const candidates=_orderedBattleCharacters().filter(u=>_isSealed(u));
  if(!candidates.length) return false;
  G._resolvingSeals=true;
  try{
    for(const unit of candidates){
      if(_battleVictoryAlreadyPending()||!_livingCombatUnits(G.enemies).length) return false;
      if(!unit||unit.hp<=0||!_isSealed(unit)) continue;
      const required=Math.max(1,Number(_sealValue(unit)||unit._sealValue)||1);
      // 封印解除は1体ずつ判定する。血は封印されたキャラクターの陣営ごとに管理する。
      const unitBlood=String((G.allies||[]).includes(unit)?'p1':'p2')==='p1'
        ?Math.max(0,Number(G._blood)||0):Math.max(0,Number(G._enemyBlood)||0);
      if(unitBlood<required) continue;
      unit._sealReady=true;
      renderAll();
      await _awaitFrame();
      if(_battleVictoryAlreadyPending()||!_livingCombatUnits(G.enemies).length) return false;
      await sleep(120);
      if(_battleVictoryAlreadyPending()||!_livingCombatUnits(G.enemies).length) return false;
      // 血は解放条件の判定にのみ使い、解放時には消費しない。
      const sacrificed=[];
      const isEnemySide=(G.enemies||[]).includes(unit);
      if(typeof playSealReleaseVfx==='function'){
        await playSealReleaseVfx(unit,isEnemySide?'enemy':'ally');
      } else {
        unit._sealed=false;
        delete unit._sealValue;
      }
      delete unit._sealReady;
      delete unit._coreDeathEffectsTriggered;
      log(`${_lc(unit.name,isEnemySide)}の封印が解放された。`,'gold');
      // 封印から解放されたキャラクターは「戦闘中に召喚された」扱いにする
      // （ナーガ・ヘルナイト・光の指輪・リッチ等の召喚時効果の対象になる）。
      await _afterPanelSummon(unit,isEnemySide);
      const repeats=_releaseRepeatCount(unit,isEnemySide);
      for(let i=0;i<repeats;i++) await _applyReleaseEffect(unit,isEnemySide,[]);
      // 呼応の指輪：常時：味方が解放された時、そのコピーを召喚する。
      if(!isEnemySide&&unit.hp>0){
        const echoCount=_ringCount('呼応の指輪');
        for(let i=0;i<echoCount;i++){
          log(`呼応の指輪の効果で${_lc(unit.name,false)}のコピーを召喚した。`,'good');
          await _spawnAdhocAllyUnit(unit.name,unit.baseAtk||unit.atk,unit.maxHp||unit.hp,false,{rightmost:true});
        }
      }
    }
    requestBattleCompact();
    return true;
  }finally{
    candidates.forEach(u=>{ delete u._sealReady; });
    G._resolvingSeals=false;
  }
}

function _handleVictory(){
  // stale setTimeout が次の戦闘中に発火した場合は何もしない
  if(G.phase!=='reward') return;
  if(G._battleDefeatHandled) return;
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx({preserveDamage:true});
  if(typeof finishWaveBattleVictory==='function'&&finishWaveBattleVictory(true)) return;
  if(typeof finishMapBattleVictory==='function'&&finishMapBattleVictory()) return;
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showVictoryOverlay(()=>{
      _cleanupBattleEndTransientUnits();
      showScreen('clear');
    });
  } else {
    // 表示タイマーと非表示タイマーを独立したsetTimeoutで走らせず、表示が確定してから
    // 一定時間後に非表示にするようチェーンする（メインスレッドが混雑していても表示が
    // 一瞬で消えないようにするため）。
    showVictoryOverlay(()=>{
      const ov=document.getElementById('victory-overlay');
      if(ov) ov.style.display='none';
      _cleanupBattleEndTransientUnits();
      if(G._libraryTestBattleMode){
        _exitTestBattle();
        return;
      }
      if(G.phase==='reward') goToReward();
    });
  }
}

// ── HP増加共通関数──────
// ATKを増加させる共通関数
function addUnitAtk(unit, amount){
  if(!unit||amount<=0) return 0;
  const total = amount + (_isBattleGainPhase()&&_unitHasKeyword(unit,'熟練')?1:0);
  unit.atk = (unit.atk||0) + total;
  unit.baseAtk = (unit.baseAtk||0) + total;
  return total;
}

function addUnitHp(unit, amount, sideOverride){
  if(!unit||amount<=0) return 0;
  const total=amount+(_isBattleGainPhase()&&_unitHasKeyword(unit,'熟練')?1:0);
  unit.hp+=total; unit.maxHp+=total;
  return total;
}

function _isBattleGainPhase(){
  return !!(G&&['player','enemy','commander'].includes(G.phase));
}

function snapshotAlliesAtBattleStart(){
  G._allyBattleStartSnapshot=(G.allies||[]).map(a=>a?clone(a):null);
  G._rewardBattleStateRestored=false;
}




// ── 戦闘開始 ──────────────────────────────────

// 戦闘カットインのタイトル（固有名）。「地域情報」シートの
// 「街までの名前」（街より前のstage1〜4）／「塔までの名前」（街より後のstage5〜）を使う。
// シートに名前が無い場合は従来の「戦 闘 開 始」にフォールバックする。
function _waveBattleRouteName(){
  const info=typeof regionInfoForWave==='function'?regionInfoForWave(G._wave):null;
  if(!info) return '';
  const stage=Number(G._waveStage)||1;
  // 街を過ぎていれば「塔までの名前」、それ以前は「街までの名前」。
  // 街のstage番号はwaveごとに違う（wave1は5、wave2〜4は4、wave5は1が街）ため、
  // stage番号の決め打ちではなくルートから街の位置を引いて判定する。
  // ※以前は stage>=5 固定で、街が先頭にあるwave5だけ判定が反転していた
  //   （フォルセティ出発後に「塔までの名前」ではなく「街までの名前」を拾っていた）。
  const afterCity=typeof waveStageIsAfterCity==='function'
    ?waveStageIsAfterCity(G._wave,stage)
    :stage>=5;
  const primary=afterCity?info.toTowerName:info.toTownName;
  const fallback=afterCity?info.toTownName:info.toTowerName;
  return String(primary||fallback||'').trim();
}
function _battleStartIntroText(){
  if(G&&G._libraryTestBattleMode) return {title:'戦 闘 開 始',subtitle:'試験戦闘',kind:'normal'};
  const mapBattle=G._mapBattle||null;
  const kind=String(G._waveBattleType||mapBattle?.type||'');
  const isBoss=kind==='boss'||_isBossFight||!!mapBattle?.forcedBoss;
  const isElite=kind==='elite'||!!G._isEliteFight;
  // 大きい文字（タイトル）は戦闘種別に関わらず「戦 闘 開 始」で統一し、
  // 小さい文字（サブタイトル）に道中の固有名を出す。
  const routeName=_waveBattleRouteName();
  if(isBoss) return {title:'戦 闘 開 始',subtitle:routeName,kind:'boss'};
  if(isElite) return {title:'戦 闘 開 始',subtitle:routeName,kind:'elite'};
  return {title:'戦 闘 開 始',subtitle:routeName,kind:'normal'};
}

function _battleCutinHost(){
  return document.getElementById('scr-battle');
}

function _showBattleEndFade(){
  const el=document.getElementById('battle-end-fade');
  if(!el) return;
  el.style.display='block';
  el.style.visibility='visible';
  el.classList.remove('is-visible');
  void el.offsetWidth;
  el.classList.add('is-visible');
}

function _fadeBattleLife(){
  // 試験戦闘は練習用でライフを失わないため、演出もSEも出さない。
  if(G&&G._testBattleMode) return;
  // 戦闘中は左から空になるため、現在表示されている左端のハートを対象にする。
  const life=document.querySelector('#battle-life-value .battle-life-heart-filled:first-of-type')||document.querySelector('#h-life .life-heart:last-child')||document.querySelector('#h-life .life-full');
  if(life) life.classList.add('life-lost-cutin');
  try{
    const src=(typeof Assets!=='undefined'&&Assets.sfx&&Assets.sfx.lifeLost)||'assets/sfx/life_lost.wav';
    if(typeof playFileSfx==='function') playFileSfx(src);
    else { const audio=new Audio(src); audio.volume=sfxFallbackVolume(.8); audio.play().catch(()=>{}); }
  }catch(e){}
}

// 戦闘開始・勝利・撤退で共用するカットイン生成関数。
// start は _playBattleStartIntro が背景スクロールと退場タイミングを管理する。
function showBattleCutin(type='start',options={}){
  const host=_battleCutinHost();
  if(!host) return Promise.resolve(null);
  const mode=['start','victory','retreat'].includes(type)?type:'start';
  const old=document.getElementById('battle-start-intro');
  if(old) old.remove();
  const info=options.info||_battleStartIntroText();
  const title=mode==='victory'?'勝 利':mode==='retreat'?'撤 退':(String(options.title||info.title||'').trim()||'戦 闘 開 始');
  // 結果画面でも開始画面と同じ高さを確保する。空文字だけでは行ボックスが
  // 縮み、タイトルとラインが上へ再配置されるため、不可視の空白を残す。
  const subtitle=mode==='victory'||mode==='retreat'?'\u00a0':(String(info.subtitle||'').trim()||'\u00a0');
  const overlay=document.createElement('div');
  overlay.id='battle-start-intro';
  overlay.className=`battle-start-intro cutin-${mode} battle-start-${info.kind||'normal'}`;
  overlay.innerHTML=`<div class="battle-start-aura"></div><div class="battle-cut-in-particles" aria-hidden="true"></div><img class="battle-start-line" src="assets/ui/battle_line.svg" alt=""><span class="battle-start-icon-wrap"><img class="battle-start-icon" src="assets/ui/main_icon.svg" alt=""></span><div class="battle-start-title">${_escapePreviewHtml(title)}</div><div class="battle-start-subtitle">${_escapePreviewHtml(options.subtitle||((mode==='start')?(String(info.subtitle||'').trim()||'\u00a0'):subtitle))}</div>`;
  host.appendChild(overlay);
  if(mode==='start') return overlay;
  // 勝利・撤退の結果表示中は、戦場カードを操作・ホバーできないようにする。
  // 勝利時はfinishBattleAsVictory()で既に付与済みだが、撤退時も同じロックを使う。
  document.body.classList.add('battle-victory-pending');
  _showBattleEndFade();
  if(typeof stopBgm==='function'&&!(G&&G._libraryTestBattleMode)) stopBgm(700);
  if(mode==='retreat') window.setTimeout(_fadeBattleLife,520);
  return new Promise(resolve=>{
    // 勝利は表示位置を保持したまま待機する。退場アニメーションを挟むと
    // 「勝利」が一度消え、flex再配置によってラインと本文も移動してしまう。
    if(mode!=='victory'&&mode!=='retreat'){
      window.setTimeout(()=>overlay.classList.add('battle-start-closing'),Math.max(900,Number(options.holdMs)||1200));
    }
    window.setTimeout(()=>{
      const fade=document.getElementById('battle-end-fade');
      if(fade && (mode==='victory'||mode==='retreat')){
        // 結果表示後は背景を保持した暗転状態で停止する。進むボタン押下時だけ
        // battle-transition-fade を使って完全に暗転し、次画面へ遷移する。
        window.setTimeout(()=>{
          overlay.classList.remove('battle-start-closing');
          overlay.classList.add('awaiting-continue');
          resolve(overlay);
        },240);
      }else if(fade){
        fade.classList.add('is-final');
        window.setTimeout(()=>{
          fade.classList.remove('is-visible','is-final');
          fade.removeAttribute('style');
          overlay.remove();
          resolve(null);
        },360);
      } else if(mode==='victory'||mode==='retreat'){
        overlay.classList.remove('battle-start-closing');
        overlay.classList.add('awaiting-continue');
        resolve(overlay);
      } else { overlay.remove(); resolve(null); }
    },Math.max(1500,Number(options.durationMs)||2200));
  });
}

// infoOverride：カットインの文言を呼び出し側で指定する（省略時は従来どおり戦闘種別から作る）。
function _playBattleStartIntro(infoOverride){
  const host=document.getElementById('scr-battle');
  if(!host) return Promise.resolve();
  const endFade=document.getElementById('battle-end-fade');
  if(endFade){ endFade.classList.remove('is-visible','is-final'); endFade.removeAttribute('style'); }
  // 前回の戦闘でeffect.pngを非表示にした状態を、新しい戦闘開始時だけリセットする。
  host.classList.remove('battle-start-playing','battle-start-no-effect','battle-bg-normal','battle-bg-reveal','battle-bg-scroll-ready','battle-bg-scrolling','battle-start-units-collapsed','battle-start-units-revealing','battle-opening-active');
  host.classList.add('battle-opening-pending');
  void host.offsetWidth;
  const old=document.getElementById('battle-start-intro');
  if(old) old.remove();
  // ラスボス戦は戦闘開始演出（カットイン・背景スクロール）を行わない。
  // movie3 → last_battle.webm のフェードインから途切れずに戦闘へ入るため。
  if(typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()){
    host.classList.add('battle-bg-reveal');
    return Promise.resolve('boss');
  }
  const info=infoOverride||_battleStartIntroText();
  const needsScroll=info.kind==='elite'||info.kind==='boss';
  host.classList.add(needsScroll?'battle-bg-reveal':'battle-bg-normal');
  const overlay=showBattleCutin('start',{info});
  if(needsScroll) host.classList.add('battle-start-no-effect');
  else host.classList.add('battle-start-playing');
  return new Promise(resolve=>{
    window.setTimeout(()=>{
      const closeIntro=()=>{
        overlay.classList.add('battle-start-closing');
        window.setTimeout(()=>{
          overlay.remove();
          // effect.pngは次の戦闘開始まで非表示状態を維持する。
          resolve(info.kind);
        },360);
      };
      if(!needsScroll){ closeIntro(); return; }
      // 開幕演出を表示しきった後、背景だけを3秒かけて下端へ移動する。
      host.classList.add('battle-bg-scroll-ready');
      void host.offsetWidth;
      host.classList.add('battle-bg-scrolling');
      window.setTimeout(closeIntro,3000);
    },1800);
  });
}

// 開戦演出中は編成画面の右クリック覗き見を受け付けない。
// ここでright-card-peekが切り替わると、演出中のカードにも透明化CSSが適用され、
// 演出終了時の再描画までカードが消えたように見える。
if(!window._battleOpeningContextMenuGuardBound){
  window._battleOpeningContextMenuGuardBound=true;
  const isOpening=()=>{
    const host=document.getElementById('scr-battle');
    return !!(host&&(
      host.classList.contains('battle-opening-pending')||
      host.classList.contains('battle-opening-active')||
      document.getElementById('battle-start-intro')
    ));
  };
  document.addEventListener('contextmenu',e=>{
    // 開戦演出中もオプション（およびデバッグ時のミュート）は操作可能にする。
    if(e.target&&e.target.closest&&e.target.closest('#battle-options-btn,#battle-mute-btn')) return;
    if(!isOpening()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
  document.addEventListener('click',e=>{
    // 場面外クリックでreward.jsの再描画処理が走ると、開戦演出中のカードが消えるため止める。
    if(e.target&&e.target.closest&&e.target.closest('#battle-options-btn,#battle-mute-btn')) return;
    if(!isOpening()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
}

function renderBattleCounters(){
  const root=document.getElementById('battle-counters');
  if(!root) return;
  const active=!!(G&&(G.phase==='battle'||G.phase==='player'||G.phase==='enemy'||G.phase==='commander'||G._battleVictoryPending||G._waveWithdraw));
  root.style.display=active?'flex':'none';
  const status=document.getElementById('battle-status-hud');
  if(status) status.style.display=active?'flex':'none';
  if(!active) return;
  const mana=typeof _ensureMana==='function'?Number(_ensureMana()) : 0;
  const manaEl=document.getElementById('battle-mana-value');
  if(manaEl) manaEl.textContent=String(Math.max(0,mana));
  const sacrifice=typeof _sacrificeCount==='function'?Number(_sacrificeCount()):0;
  const sacEl=document.getElementById('battle-sacrifice-value');
  if(sacEl) sacEl.textContent=String(Math.max(0,sacrifice));
}

function _playBattleOpeningAppearanceSfx(){
  try{
    if(typeof playFileSfx==='function'){ playFileSfx('assets/sfx/appearance.wav'); return; }
    const audio=new Audio('assets/sfx/appearance.wav');
    audio.preload='auto';
    audio.volume=sfxFallbackVolume(.8);
    audio.play().catch(()=>{});
  }catch(e){}
}

function _battleOpeningSlotList(selector,isEnemy,isRear){
  const root=document.querySelector(selector);
  if(!root) return [];
  return [...root.querySelectorAll('.unit-card')]
    .filter(slot=>{
      const idx=Number(slot.dataset.unitIdx);
      const unit=(isEnemy?G.enemies:G.allies)?.[idx];
      if(!unit||unit.hp<=0) return false;
      if(_battleOpeningIsSealed(unit)) return false;
      return isEnemy ? (isRear?slot.classList.contains('is-rear'):slot.classList.contains('is-front'))
        : (!!(unit.lane==='rear')===isRear);
    })
    .sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
}

function _battleOpeningIsSealed(unit){
  if(!unit) return false;
  if(_isSealed(unit)||Number(unit._sealValue)>0) return true;
  return typeof _sealValue==='function'&&_sealValue(unit)>0;
}

function _battleOpeningSealedSlotList(selector,isEnemy){
  const root=document.querySelector(selector);
  if(!root) return [];
  return [...root.querySelectorAll('.unit-card')].filter(slot=>{
    const idx=Number(slot.dataset.unitIdx);
    const unit=(isEnemy?G.enemies:G.allies)?.[idx];
    return !!(unit&&unit.hp>0&&_battleOpeningIsSealed(unit));
  }).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
}

function _battleOpeningLandingVfx(slot){
  const fx=document.createElement('div');
  fx.className='battle-opening-appearance-vfx';
  slot.insertBefore(fx,slot.firstChild);
  _playBattleOpeningAppearanceSfx();
  window.setTimeout(()=>fx.classList.add('is-fading'),180);
  window.setTimeout(()=>fx.remove(),620);
}

function _animateBattleOpeningSlot(slot,delayMs){
  slot.classList.add('battle-opening-card');
  slot.style.setProperty('z-index','80','important');
  slot.style.visibility='visible';
  slot.style.setProperty('opacity','0','important');
  slot.style.setProperty('transform','translateX(-110vw) scale(.96)','important');
  slot.style.setProperty('transition','none','important');
  return new Promise(resolve=>{
    window.setTimeout(()=>{
      slot.style.setProperty('transition','transform 420ms cubic-bezier(.2,.8,.25,1), opacity 420ms cubic-bezier(.2,.8,.25,1)','important');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        slot.style.setProperty('transform','translateX(0) scale(1.12)','important');
        slot.style.setProperty('opacity','1','important');
      }));
      window.setTimeout(()=>slot.style.setProperty('transform','translateX(0) scale(1)','important'),270);
    },delayMs);
    window.setTimeout(()=>{
      slot.style.removeProperty('z-index');
      slot.style.removeProperty('visibility');
      slot.style.removeProperty('opacity');
      slot.style.removeProperty('transform');
      slot.style.removeProperty('transition');
      slot.classList.remove('battle-opening-card');
      slot.classList.add('battle-opening-done');
      resolve();
    },delayMs+420);
    window.setTimeout(()=>_battleOpeningLandingVfx(slot),delayMs);
  });
}

async function _playBattleOpeningLaneStep(groups){
  const totalSpan=360;
  const jobs=[];
  groups.forEach(slots=>{
    const count=slots.length;
    const interval=count>1?totalSpan/(count-1):0;
    slots.forEach((slot,index)=>jobs.push(_animateBattleOpeningSlot(slot,index*interval)));
  });
  await Promise.all(jobs);
  await sleep(80);
}

async function _fadeInBattleOpeningSealedSlots(slots){
  if(!slots.length) return;
  slots.forEach(slot=>{
    slot.classList.add('battle-opening-sealed-card');
    slot.style.setProperty('z-index','70','important');
    slot.style.setProperty('visibility','visible','important');
    slot.style.setProperty('opacity','0','important');
    slot.style.setProperty('transform','scale(.98)','important');
    slot.style.setProperty('transition','none','important');
  });
  await _awaitFrame(); await _awaitFrame();
  slots.forEach(slot=>{
    slot.style.setProperty('transition','opacity 520ms ease, transform 520ms ease','important');
    slot.style.setProperty('opacity','1','important');
    slot.style.setProperty('transform','scale(1)','important');
  });
  await sleep(540);
  slots.forEach(slot=>{
    slot.style.removeProperty('z-index');
    slot.style.removeProperty('visibility');
    slot.style.removeProperty('opacity');
    slot.style.removeProperty('transform');
    slot.style.removeProperty('transition');
    slot.classList.remove('battle-opening-sealed-card');
    slot.classList.add('battle-opening-done');
  });
}

// ── 戦闘開始時の台詞（敵シートの「台詞1〜3」列）───────────────
// 全員が場に出撃した後、台詞を持つキャラクターの分だけ順に吹き出しを出す。
// 尻尾の先端をそのキャラクターの中心X・下記のYへ合わせ、敵は上向き／味方は下向き。
const BATTLE_LINE_TAIL_Y={enemyRear:435,enemyFront:854,allyFront:1542,allyRear:1969};
// 枠と尻尾はSVGをそのまま貼る。淡色＝speechbubble1/2、暗色＝speechbubble3/4。
// 枠は元SVG（speechbubble1/3.svg、1091.39x194.88）と同じ六角形をJS側で組み立てる。
// 元の頂点：(1033.69,2.62)(57.7,2.62)(2.89,97.56)(57.7,192.5)(1033.69,192.5)(1088.51,97.56)
// ・線の内側オフセット：上下2.62 / 左右2.89（stroke-width 5 の半分ぶん）
// ・斜辺の傾き：横54.81 ÷ 縦94.94 → 高さの半分あたり 0.57731 だけ横へ寄る
// これらを保ったまま幅と高さだけ変えるので、斜辺の角度は常に元SVGと同一になる。
// 線の太さは viewBox を実寸（1ユニット＝設計座標1px）にすることで常に5pxで一定。
const BATTLE_LINE_FRAME_INSET_Y=2.62;
const BATTLE_LINE_FRAME_INSET_X=2.89;
const BATTLE_LINE_FRAME_SLOPE=54.81/94.94;  // ≒0.57731
const BATTLE_LINE_FRAME_STROKE=5;
const BATTLE_LINE_FRAME_FILL_DARK='#1b130b';
const BATTLE_LINE_FRAME_FILL_LIGHT='#e2cdba';
const BATTLE_LINE_FRAME_STROKE_COLOR='#8c5c2d';
// 高さから斜辺の横オフセット（左右の「キャップ幅」）を求める。
function _battleLineCapW(h){
  return BATTLE_LINE_FRAME_INSET_X+Math.max(0,h/2-BATTLE_LINE_FRAME_INSET_Y)*BATTLE_LINE_FRAME_SLOPE;
}
// 尻尾(viewBox 237x170)は尖端が左下(0,170)、付け根が上辺 x100.1〜237。
// 敵は180度回転（尖端＝右上／付け根＝下辺 0〜57.76%）、味方は左右反転（尖端＝右下／付け根＝上辺）。
const BATTLE_LINE_TAIL_W=180;
const BATTLE_LINE_TAIL_H=129;
const BATTLE_LINE_TAIL_BASE_X=0.5776;
// 尻尾の茶色い線（cls-2）の付け根は y=25.16 で、そこから先（暗色のcls-1）は枠の内側へ潜り込む
// はみ出し分。枠の線と尻尾の線をきれいに繋ぐには、枠の辺をこの位置に合わせる必要がある。
const BATTLE_LINE_TAIL_BASE_INSET=BATTLE_LINE_TAIL_H*(25.16/170);
// 枠SVGの上下の線は画像の端から2.62px内側にある（9スライスで等倍描画するのでこの値のまま）。
// 尻尾の線と枠の線をぴったり合わせるには、枠の要素をこの分だけ外側へずらす必要がある。
const BATTLE_LINE_FRAME_EDGE=2.62;
const BATTLE_LINE_BUBBLE_MARGIN=24;   // 付け根から枠の斜辺までの余白
// 枠の寸法。高さは行数から決め打ちにする（実測だとフォント読み込みの前後で
// 同じ行数でも高さが変わってしまうため）。
const BATTLE_LINE_FONT=60;
const BATTLE_LINE_LINE_H=1.45;
const BATTLE_LINE_PAD_X=96;
const BATTLE_LINE_PAD_Y=44;
const BATTLE_LINE_MIN_W=520;
function _battleLineLayer(){
  let layer=document.getElementById('battle-line-layer');
  if(!layer){
    layer=document.createElement('div');
    layer.id='battle-line-layer';
    layer.innerHTML='<div id="battle-line-stage">'
      +'<div id="battle-line-bubble">'
      +'<svg id="battle-line-bubble-shape" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">'
      +'<polygon id="battle-line-bubble-poly"></polygon></svg>'
      +'<div id="battle-line-text"></div></div>'
      +'<div id="battle-line-tail"></div>'
      +'</div>';
    document.body.appendChild(layer);
  }
  _syncBattleLineStage();
  // 会話中はカードのホバー説明（#kw-tooltip）が台詞枠より前面に出るようにする。
  document.body.classList.add('battle-line-active');
  return layer;
}
// 設計座標(3840x2160)のまま子要素を置けるよう、画面の拡大率・オフセットを反映する。
// 台詞表示中にウィンドウサイズが変わると倍率とオフセットがずれ、枠と尻尾だけが
// キャラクターから離れてしまうため、リサイズのたびに貼り直す。
function _syncBattleLineStage(){
  const stage=document.getElementById('battle-line-stage');
  if(!stage) return;
  const rootStyle=getComputedStyle(document.documentElement);
  const scale=parseFloat(rootStyle.getPropertyValue('--game-scale'))||1;
  const offX=parseFloat(rootStyle.getPropertyValue('--game-offset-x'))||0;
  const offY=parseFloat(rootStyle.getPropertyValue('--game-offset-y'))||0;
  stage.style.left=`${offX}px`;
  stage.style.top=`${offY}px`;
  stage.style.transform=`scale(${scale})`;
}
window.addEventListener('resize',()=>{
  // fitVesselboundViewport()が--game-scale等を更新した後に反映されるよう次フレームで実行する。
  requestAnimationFrame(_syncBattleLineStage);
});
function _removeBattleLineLayer(){
  const layer=document.getElementById('battle-line-layer');
  if(layer) layer.remove();
  document.body.classList.remove('battle-line-active');
}
// ユニットのスロット要素から、設計座標での中心Xを求める。
function _battleLineUnitCenterX(unit,isEnemySide){
  const root=document.querySelector(isEnemySide?'#f-enemy':'#f-ally');
  const list=isEnemySide?G.enemies:G.allies;
  const idx=(list||[]).indexOf(unit);
  const slot=root&&idx>=0?root.querySelector(`.unit-card[data-unit-idx="${idx}"]`):null;
  const rootStyle=getComputedStyle(document.documentElement);
  const scale=parseFloat(rootStyle.getPropertyValue('--game-scale'))||1;
  const offX=parseFloat(rootStyle.getPropertyValue('--game-offset-x'))||0;
  if(!slot) return 1920;
  const r=slot.getBoundingClientRect();
  return ((r.left+r.width/2)-offX)/(scale||1);
}
function _battleLineTailY(isEnemySide,isRear){
  if(isEnemySide) return isRear?BATTLE_LINE_TAIL_Y.enemyRear:BATTLE_LINE_TAIL_Y.enemyFront;
  return isRear?BATTLE_LINE_TAIL_Y.allyRear:BATTLE_LINE_TAIL_Y.allyFront;
}
// 枠（六角形）を実寸で組み立てる。viewBoxを 0 0 w h にすることで
// 1ユニット＝設計座標1pxとなり、stroke-widthが枠の大小に影響されない。
function _drawBattleLineFrame(layer,w,h,dark){
  const svg=layer.querySelector('#battle-line-bubble-shape');
  const poly=layer.querySelector('#battle-line-bubble-poly');
  if(!svg||!poly) return;
  const insetY=BATTLE_LINE_FRAME_INSET_Y;
  const insetX=BATTLE_LINE_FRAME_INSET_X;
  const cap=_battleLineCapW(h);
  const midY=h/2;
  const r=n=>Math.round(n*100)/100;
  const pts=[
    [w-cap,insetY],[cap,insetY],[insetX,midY],
    [cap,h-insetY],[w-cap,h-insetY],[w-insetX,midY],
  ].map(([x,y])=>`${r(x)},${r(y)}`).join(' ');
  svg.setAttribute('viewBox',`0 0 ${r(w)} ${r(h)}`);
  svg.setAttribute('width',`${r(w)}`);
  svg.setAttribute('height',`${r(h)}`);
  poly.setAttribute('points',pts);
  poly.setAttribute('fill',dark?BATTLE_LINE_FRAME_FILL_DARK:BATTLE_LINE_FRAME_FILL_LIGHT);
  poly.setAttribute('stroke',BATTLE_LINE_FRAME_STROKE_COLOR);
  poly.setAttribute('stroke-width',String(BATTLE_LINE_FRAME_STROKE));
  poly.setAttribute('stroke-miterlimit','10');
}
// 1つの台詞を表示し、左クリックされるまで待つ。
function _showBattleLine(text,centerX,tailY,isEnemySide){
  const layer=_battleLineLayer();
  const tail=layer.querySelector('#battle-line-tail');
  const bubble=layer.querySelector('#battle-line-bubble');
  const textEl=layer.querySelector('#battle-line-text');
  const raw=String(text||'');
  textEl.textContent=raw;
  // 高さは行数から決め打ちにする（offsetHeightを使うと、Webフォントの読み込み前後で
  // 同じ行数でも高さが変わってしまう）。幅は一番長い行をcanvasで測って決める。
  const rows=raw.split('\n');
  const h=BATTLE_LINE_PAD_Y*2+rows.length*Math.round(BATTLE_LINE_FONT*BATTLE_LINE_LINE_H);
  const cs=getComputedStyle(textEl);
  const ctx=(_showBattleLine._ctx||(_showBattleLine._ctx=document.createElement('canvas').getContext('2d')));
  ctx.font=`${cs.fontWeight} ${BATTLE_LINE_FONT}px ${cs.fontFamily}`;
  const letter=parseFloat(cs.letterSpacing)||0;
  const textW=Math.max.apply(null,rows.map(t=>ctx.measureText(t).width+letter*t.length));
  // 斜辺の横オフセットは高さから決まる。テキスト幅＋左右パディングに、その分を足す。
  const cap=_battleLineCapW(h);
  const w=Math.max(BATTLE_LINE_MIN_W,Math.ceil(textW)+BATTLE_LINE_PAD_X*2+Math.ceil(cap*2));
  bubble.style.width=`${w}px`;
  bubble.style.height=`${h}px`;
  // 敵の台詞は暗色（speechbubble3/4）、味方の台詞は淡色（speechbubble1/2）。
  const dark=isEnemySide;
  layer.classList.toggle('is-dark',dark);
  _drawBattleLineFrame(layer,w,h,dark);
  tail.style.setProperty('background-image',`url("assets/ui/speechbubble${dark?4:2}.svg")`,'important');
  // 敵は話し手の右側、味方は左側に出す。
  // 元SVGは尖端が左下(0,170)・付け根が上辺 x100.1〜237。
  //   敵（右側）  ：上下反転（尖端＝左上／付け根＝下辺 x100.1〜237＝42.24%〜100%）
  //   味方（左側）：左右反転（尖端＝右下／付け根＝上辺 x0〜136.9＝0%〜57.76%）
  tail.style.width=`${BATTLE_LINE_TAIL_W}px`;
  tail.style.height=`${BATTLE_LINE_TAIL_H}px`;
  tail.style.transform=isEnemySide?'scaleY(-1)':'scaleX(-1)';
  // 尖端のXは、敵＝箱の左端／味方＝箱の右端。どちらも話し手の中心に合わせる。
  const tailLeft=isEnemySide?centerX:(centerX-BATTLE_LINE_TAIL_W);
  const tailTop=isEnemySide?tailY:(tailY-BATTLE_LINE_TAIL_H);
  tail.style.left=`${tailLeft}px`;
  tail.style.top=`${tailTop}px`;
  // 枠は、尻尾の付け根が「キャップより内側の平らな辺」に載るように寄せる。
  if(isEnemySide){
    // 付け根の左端＝tailLeft+(1-0.5776)×180。そこからマージンとキャップ分だけ外側へ。
    const baseLeft=tailLeft+(1-BATTLE_LINE_TAIL_BASE_X)*BATTLE_LINE_TAIL_W;
    const bubbleLeft=baseLeft-BATTLE_LINE_BUBBLE_MARGIN-cap;
    bubble.style.left=`${Math.max(20,Math.min(bubbleLeft,3840-20-w))}px`;
  }else{
    const bubbleRight=tailLeft+BATTLE_LINE_TAIL_BASE_X*BATTLE_LINE_TAIL_W+BATTLE_LINE_BUBBLE_MARGIN+cap;
    bubble.style.left=`${Math.max(20,bubbleRight-w)}px`;
  }
  // 枠の線が尻尾の茶色い線の付け根と重なるように置く（敵＝尻尾の下側、味方＝尻尾の上側）。
  const tailLineY=isEnemySide
    ?tailTop+BATTLE_LINE_TAIL_H-BATTLE_LINE_TAIL_BASE_INSET
    :tailTop+BATTLE_LINE_TAIL_BASE_INSET;
  bubble.style.top=isEnemySide
    ?`${Math.round(tailLineY-BATTLE_LINE_FRAME_EDGE)}px`
    :`${Math.round(tailLineY+BATTLE_LINE_FRAME_EDGE-h)}px`;
  layer.classList.add('is-visible');
  return new Promise(resolve=>{
    // 会話中もカードのホバー説明を見られるよう、レイヤー自体はpointer-events:noneにし、
    // クリックだけをdocumentのキャプチャ段階で拾う（カード側のクリック処理には渡さない）。
    const onClick=e=>{
      if(e.button!==undefined&&e.button!==0) return;
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener('pointerdown',onClick,true);
      resolve();
    };
    document.addEventListener('pointerdown',onClick,true);
  });
}
// 台詞を持つキャラクターを、盤面の並び順で集める。
function _battleStartLineSpeakers(){
  const out=[];
  (typeof _orderedBattleCharacters==='function'?_orderedBattleCharacters():[]).forEach(unit=>{
    if(!unit||unit.hp<=0) return;
    const lines=Array.isArray(unit.battleLines)?unit.battleLines.filter(t=>String(t||'').trim()):[];
    if(!lines.length) return;
    const isEnemySide=(G.enemies||[]).includes(unit);
    out.push({unit,isEnemySide,isRear:String(unit.lane||'front')==='rear',lines});
  });
  return out;
}
// 開幕演出（全員の出撃）後に呼ぶ。台詞が無ければ何もしない。
async function playBattleStartLines(){
  const speakers=_battleStartLineSpeakers();
  if(!speakers.length) return;
  // Webフォントの読み込み前に幅を測ると、台詞ごとに枠の長さがばらつく。
  try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(_e){}
  try{
    for(const sp of speakers){
      const centerX=_battleLineUnitCenterX(sp.unit,sp.isEnemySide);
      const tailY=_battleLineTailY(sp.isEnemySide,sp.isRear);
      for(const line of sp.lines){
        await _showBattleLine(line,centerX,tailY,sp.isEnemySide);
      }
    }
  }finally{
    _removeBattleLineLayer();
  }
  // 全ての台詞を終えたら1秒待ってから通常通り戦闘を開始する。
  await sleep(1000);
}

async function playBattleOpeningSequence(){
  const host=document.getElementById('scr-battle');
  if(!host) return;
  host.classList.remove('battle-opening-pending');
  host.classList.add('battle-opening-active');
  const enemyRear=_battleOpeningSlotList('#f-enemy',true,true);
  const allyRear=_battleOpeningSlotList('#f-ally',false,true);
  const enemyFront=_battleOpeningSlotList('#f-enemy',true,false);
  const allyFront=_battleOpeningSlotList('#f-ally',false,false);
  const sealed=[
    ..._battleOpeningSealedSlotList('#f-enemy',true),
    ..._battleOpeningSealedSlotList('#f-ally',false)
  ];
  // ラスボス戦は通常の登場演出（落下＋着地VFX）を使わず、
  // 封印キャラも含めて全員を同時にフェードインで出す。
  if(typeof isFinalBossBattleNow==='function'&&isFinalBossBattleNow()){
    await _fadeInBattleOpeningSealedSlots([...enemyFront,...allyFront,...enemyRear,...allyRear,...sealed]);
    host.classList.remove('battle-opening-active');
    return;
  }
  await _playBattleOpeningLaneStep([enemyFront,allyFront]);
  await _playBattleOpeningLaneStep([enemyRear,allyRear]);
  await _fadeInBattleOpeningSealedSlots(sealed);
  host.classList.remove('battle-opening-active');
}

// 開幕カードのtransform解除直後は、複数体時の絶対left/top再配置がまだ
// ブラウザのレイアウトへ反映されていないことがある。最初の攻撃前に同期的に
// レイアウトを確定させ、攻撃モーションが演出中の矩形を拾わないようにする。
function _settleBattleOpeningLayout(){
  const host=document.getElementById('scr-battle');
  if(!host) return;
  void host.offsetWidth;
  const slots=host.querySelectorAll('#f-enemy .unit-card,#f-ally .unit-card');
  let visible=0;
  slots.forEach(slot=>{
    const rect=slot.getBoundingClientRect();
    if(rect.width>0&&rect.height>0) visible++;
  });
  G._battleOpeningLayoutSettledAt=performance.now();
  _recordBattleTrace('battle_opening_layout_settled',{visibleSlots:visible,totalSlots:slots.length});
}

// デバッグモードで戦闘中に編成画面を開いたとき、走っている非同期の戦闘処理を
// その場で無効化するための世代番号。_debugFormationAbortだけだと、次の戦闘の
// startBattle()でフラグが落ちた瞬間に前の戦闘のループが再開し、二重に進行してしまう
// （＝「編成画面にしても戦闘が続く」「次の移動先で前の戦闘が続く」の原因）。
function _bumpBattleRunId(){
  G._battleRunId=(Number(G._battleRunId)||0)+1;
  return G._battleRunId;
}
function _battleRunStale(runId){
  return !!G._debugFormationAbort||Number(G._battleRunId)!==Number(runId);
}
// デバッグ用：走っている戦闘を即座に打ち切り、持ち越すと次の戦闘を壊す状態を落とす。
function abortBattleForDebug(){
  G._debugFormationAbort=true;
  _bumpBattleRunId();
  G._battlePhaseRunning=false;
  G._battleVictoryPending=false;
  G._battleDraw=false;
  G._checkingManaUnitEffects=false;
  delete G._manaUnitEffectsPromise;
  document.body.classList.remove('battle-turn-active','battle-victory-pending','right-card-peek');
}

// 命中音は「同じ瞬間に複数鳴る」ことが多い（攻撃と反撃、全体攻撃）。
// 音源の読み込みが済んでいないと鳴り始めが1回ごとにばらつき、ずれて聞こえる。
// 戦闘の頭で、使う可能性のある命中音を鳴らせる状態にしておく。
function _warmBattleHitSfx(){
  if(typeof warmSfxVoices!=='function') return;
  const keys=[];
  ['sword','axe','punch','kick'].forEach(t=>{ for(let lv=1;lv<=3;lv++) keys.push(`${t}${lv}`); });
  keys.push('attack','hit','death','shield');
  warmSfxVoices(keys);
}

async function startBattle(){
  G._debugFormationAbort=false;
  _warmBattleHitSfx();
  // 例外で抜けた回数が残ると、以後ずっと盤面が詰まらない。戦闘の頭で必ず戻す。
  presentResetPlayback();
  G._battleCoreEvents=[];
  G._coreConsumedItemEvents=new Set();
  G._injuryDispatchSequence=0;
  if(typeof coreMathRng!=='undefined'&&coreMathRng&&typeof coreMathRng.seed==='function'){
    // オンライン／シミュレーションはサーバー側のseedで再現し、通常のPvEは旧来どおり
    // 戦闘ごとに乱数系列を変える。固定seedをPvEにも使うと、前衛内のランダム対象が
    // 試験戦闘のたびに同じ個体へ偏って見える。
    const deterministicSeed=(Number(G.floor)||0)*100000+(Number(G.battleCount)||0)*1000+(Number(G.wave)||0);
    const hasExplicitSeed=Number.isFinite(Number(G._battleCoreSeed));
    const seed=hasExplicitSeed?Number(G._battleCoreSeed)
      :(G._isSimulating?deterministicSeed:(deterministicSeed^Math.floor(Math.random()*0x100000000)));
    coreMathRng.seed(seed);
  }
  const _runId=_bumpBattleRunId();
  G._battleDraw=false;
  // 勝利SEは goToReward() より前に鳴るため、_bossJustDefeated が既に消えている場合に備えて
  // _isBossRewardCycle も参照している（main.js の _wasBossWin）。ただしこのフラグは
  // 次に goToReward() が走るまで前回のボス報酬サイクルの値を保持し続けるため、
  // 塔や施設を挟んだ次の通常戦闘の勝利までボス勝利SEが鳴ってしまう。戦闘開始時に必ず落とす。
  G._isBossRewardCycle=false;
  document.body.classList.remove('right-card-peek');
  G._battleSummonedAllyCount=0;
  // battle-victory-pending は #kw-tooltip 等を display:none で隠すクラス。
  // 解除が goToReward() 側にしか無いため、報酬画面を挟まない遷移
  // （ステージ5のエリート勝利→ラスボス直行など）では付いたまま次の戦闘に入り、
  // その戦闘中ずっとホバー説明が出なくなる。戦闘開始時に必ず落とす。
  document.body.classList.remove('reward-screen-active','ring-offer-phase','ring-offer-resolved','battle-victory-pending');
  const pendingItems=[
    ...(Array.isArray(G.pendingBattleItems)?G.pendingBattleItems:[]),
    ...(Array.isArray(G.nextBattleItems)?G.nextBattleItems:[])
  ];
  const seenItemKeys=new Set();
  G.activeBattleItems=pendingItems.map(c=>clone(c)).filter(c=>{
    if(!c) return false;
    if(!['silence_scroll','meteor_scroll'].includes(String(c.itemEffectKey||''))) return false;
    const key=String(c.itemEffectKey||'')==='meteor_scroll'
      ?'meteor_scroll'
      :(c._itemUseInstanceId||('__legacy__'+String(c.id||c.name||'')+'|'+String(c.itemEffectKey||'')));
    if(seenItemKeys.has(key)) return false;
    seenItemKeys.add(key);
    return true;
  });
  G.pendingBattleItems=[];
  G.nextBattleItems=[];
  (G.activeBattleItems||[]).forEach(c=>{ if(c){ delete c._firedThisBattle; delete c._manaFireCount; } });
  (G.allies||[]).forEach(u=>{
    (u?.equipment||[]).forEach(p=>{
      if(p){
        delete p._rewardReturnCard;
        delete p._rewardReturnIdx;
        delete p._rewardReturnPhaseId;
      }
    });
  });
  if(typeof setBattleStageBackground==='function') setBattleStageBackground();
  _updateLaneOffset();
  clearLog();

  updateGoldenDrop();
  if(typeof syncUnitPanelStatBonuses==='function') G.allies.forEach(a=>syncUnitPanelStatBonuses(a));
  G._masterHandReady=false;
  G._manaCycleUsed=false;
  G._eidolonDeathCount=0;
  G._genericAllyDeaths=0;
  G.mana=0;
  [...(G.allies||[]),...(G.enemies||[])].forEach(u=>{ if(u){
    delete u._deathProcessed; delete u._manaFireCount;
    delete u._coreDeathTriggered; delete u._coreDeathEffectsTriggered;
    delete u._coreDeathObserved; delete u._wardCharges;
  } });

  // フェイズを先行設定（報酬フェイズから遷移時、addAlly/renderAll 等が reward UI を誤操作しないよう）
  G.phase='player';
  G._showGlobalPanels=true;
  G._battleDefeatHandled=false;
  G._selectedEquipUnitIdx=-1;

  // 報酬フェイズUI非表示
  const rInfo=document.getElementById('reward-info-bar');
  const rCards=document.getElementById('reward-cards-section');
  const rHand=document.getElementById('inline-hand-editor');
  const rMove=document.getElementById('move-inline');
  const allySection=document.getElementById('ally-section');
  if(rInfo)  rInfo.style.display='none';
  if(rCards) rCards.style.display='none';
  if(rHand)  rHand.style.display='none';
  if(rMove)  rMove.style.display='none';
  if(allySection) allySection.style.display='';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display='';
  const eArea=document.getElementById('enemy-area');
  if(eArea) eArea.style.display='';
  const rMoveBtns=document.getElementById('reward-move-btns');
  if(rMoveBtns) rMoveBtns.style.display='none';
  const eLabel=document.getElementById('enemy-field-label');
  if(eLabel) eLabel.style.display='';
  // 報酬フェイズから素早く次戦へ移行した際、報酬カード置き場（旧配置順置き場）とメイン置き場が
  // 直前のレンダリング内容のまま画面に残ってしまう（renderAll()はこれらを更新しないため）のを防ぐ
  const battleOrderSection=document.getElementById('battle-order-section');
  if(battleOrderSection) battleOrderSection.style.display='none';
  const battleOrderRow=document.getElementById('battle-order-row');
  if(battleOrderRow) battleOrderRow.innerHTML='';
  if(typeof renderHandEditor==='function') renderHandEditor();

  const mapBattle=G._mapBattle||null;
  const battleFloor=mapBattle?mapBattle.floor:G.floor;
  const fd=FLOOR_DATA[battleFloor];
  _isBossFight=!!(mapBattle?(mapBattle.type==='boss'||mapBattle.forcedBoss):(fd&&fd.boss));

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G.battleCounters={damage:0,deaths:0};
  G._blood=0;
  G._enemyBlood=0;
  G._battleStartedAt=performance.now();
  G._battleVictoryPending=false;
  G._battleSpeed=1;
  G._battleSpeedFrom=1;
  G._battleSpeedTarget=1;
  G._battleSpeedChangedAt=performance.now();
  G._battleSpeedReason='';
  G._battleAttackedIds={};
  // コアの現在の到達回数カウンタを戦闘単位でリセットする。
  [...(G.allies||[]),...(G.enemies||[])].forEach(u=>{ if(u) delete u._manaFireCounts; });
  G._battleEndEffectsApplied=false;
  G._necromancerRingUsed=false;
  G._revivalRingUsed=false;
  G._oniRingAttackCount=0;
  G._stormRingFireCount=0;
  G._enemyDeathsThisBattle=0;

  const waveEnemyKey=`${Number(G._wave)||1}:${Number(G._waveStage)||1}:${String(G._waveBattleType||'')}`;
  // デバッグ試験戦闘は「毎回まったく同じ内容」であること。通常戦闘のリトライ用
  // 敵スナップショットを流用すると、直前に戦った敵（効果・演出まで）がそのまま出て
  // ATK/HPだけ書き換わった状態になる。生成も乱数固定にして構成のぶれを無くす。
  const fixedTestBattle=!!(G._testBattleMode&&!G._libraryTestBattleMode);
  const reuseWaveEnemies=!fixedTestBattle
    &&!!(waveEnemyKey&&G._waveRetryEnemyKey===waveEnemyKey&&Array.isArray(G._waveEnemySnapshot));
  G.enemies=reuseWaveEnemies
    ?clone(G._waveEnemySnapshot)
    :(fixedTestBattle
      ?_withFixedRandom(TEST_BATTLE_ENEMY_SEED,()=>generateEnemies(battleFloor))
      :((mapBattle&&mapBattle.type==='elite'&&typeof generateEliteEnemies==='function')
        ?generateEliteEnemies(battleFloor)
        :generateEnemies(battleFloor)));
  if(G._libraryTestBattleMode){
    const _testEnemy=(atk,hp,name)=>{
      const e=_mkEnemy(atk,hp,name,null,1,0,[], '亜人');
      const def=typeof ENEMY_POOL!=='undefined'?(ENEMY_POOL||[]).find(x=>x&&x.name===name):null;
      if(def&&typeof _applyEnemyDefAbilities==='function') _applyEnemyDefAbilities(e,def);
      return e;
    };
    const goblin1=_testEnemy(1,2,'ゴブリン');
    const goblin2=_testEnemy(1,2,'ゴブリン');
    const orc=_testEnemy(2,2,'オーク');
    goblin1.lane='front'; goblin2.lane='front'; orc.lane='rear';
    G.enemies=[goblin1,goblin2,orc];
  }
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    G.enemies.forEach(e=>{
      if(!e) return;
      e.atk=3; e.baseAtk=3; e.hp=300; e.maxHp=300;
    });
  }
  // 敵は前衛5体・後衛3体の最大8枠へ整列。オブジェクトは出現させない。
  {
    // ステージごとの明示指定（_sceneEnemyCount）で数と前後衛が確定している場合は、
    // 序盤の間引き・水増し・自動レーン配置をすべて行わない。
    const _laneFixed=!!G._enemyLaneFixed;
    G._enemyLaneFixed=false;
    const _scriptedOpening=!mapBattle&&typeof usesOpeningBattleEnemyFormation==='function'&&usesOpeningBattleEnemyFormation(G.floor);
    const _actualEnemies=G.enemies.filter(e=>e&&!e._isObject);
    const _mapNormalBattleNo=mapBattle&&mapBattle.type==='battle'&&Number(mapBattle.mapIndex)===1&&Number(mapBattle.turn)<=4?Number(mapBattle.normalBattleNo)||0:0;
    const _earlyBattleCount=(!_isBossFight&&!_laneFixed)?(_mapNormalBattleNo===1?1:(_mapNormalBattleNo===2?2:(!mapBattle&&battleFloor===1?1:(!mapBattle&&battleFloor===2?2:0)))):0;
    if(_earlyBattleCount>0&&_actualEnemies.length>_earlyBattleCount){
      _actualEnemies.splice(_earlyBattleCount);
    }
    while(!_laneFixed&&!_scriptedOpening&&!_earlyBattleCount&&_actualEnemies.length<4&&_actualEnemies.length>0){
      const base=_actualEnemies[_actualEnemies.length%_actualEnemies.length]||_actualEnemies[0];
      const extra=JSON.parse(JSON.stringify(base));
      extra.id=uid();
      extra.lane='front';
      _actualEnemies.push(extra);
    }
    const _newEnemies=new Array(MAX_ENEMIES||8).fill(null);
    if(!_isBossFight&&!_scriptedOpening&&!_laneFixed) _layoutEnemyLanes(_actualEnemies);
    _actualEnemies.forEach((e,idx)=>{ if(idx<_newEnemies.length) _newEnemies[idx]=e; });
    G.enemies=_newEnemies;
    compactBattleUnits();
    if(_isBossFight) G._bossSlot=G.enemies.findIndex(e=>e&&(e.boss||(e.keywords||[]).includes('ボス')));
    // エリートの位置を再特定（撃破ボーナス判定で参照するため）
    if(G._isEliteFight) G._eliteIdx=G.enemies.findIndex(e=>e&&e.keywords&&e.keywords.includes('エリート'));
  }
  if(G.runStats){
    const kind=String(G._waveBattleType||G._mapBattle?.type||'');
    const special=kind==='boss'||kind==='elite';
    const leader=special
      ? G.enemies.find(e=>e&&(e.boss||e.elite||(e.keywords||[]).includes(kind==='boss'?'ボス':'エリート')))
      : (G.enemies[5]||G.enemies.find(e=>e));
    G.runStats.finalBattle=leader?.name||'';
    G.runStats.areaName=typeof _runStatsAreaName==='function'?_runStatsAreaName():G.runStats.areaName;
  }
  // 試験戦闘の敵を通常戦闘のリトライ用スナップショットへ書き込まない
  // （書き込むと、次の通常戦闘のリトライに試験戦闘の敵が出る）。
  if(waveEnemyKey&&!fixedTestBattle){
    if(reuseWaveEnemies) G._waveRetryEnemyKey=null;
    else G._waveEnemySnapshot=clone(G.enemies);
  }
  G.enemies.forEach(e=>{
    if(!e) return;
    if(e._isObject) return;
    e.allyTarget=false;
    delete e._deathFxStarted;
  });
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    delete a._deathFxStarted;
    a._dp=false; a.powerBroken=false;
    a.nullified=0; a.instadead=false;
    a._battleStartHp=a.hp;
    const hasBattleHate=(a._panelSummoned&&a.guardian);
    if(hasBattleHate){ a.hate=true; a.hateTurns=99; }
    else { a.hate=false; a.hateTurns=0; }
    delete a._weakenedSavedAtk; delete a._weakenPhaseApplied;
  });
  snapshotAlliesAtBattleStart();
  if(_isBossFight){
    const _bossUnit=G.enemies[G._bossSlot];
    log(`${_lc(_bossUnit?.name||'ボス',true)} が現れた！`,'bad');
  }
  log(`${G.enemies.filter(e=>e&&!e._isObject).length}体の敵が現れた。`,'em');

  // 味方出撃処理が既存の盤面DOMを再描画する前に、全戦闘でカードを
  // 非表示にして、一瞬だけ見えるフラッシュを防ぐ。
  const preIntroHost=document.getElementById('scr-battle');
  if(preIntroHost){
    preIntroHost.classList.remove('battle-start-units-revealing');
    preIntroHost.classList.add('battle-opening-pending');
  }

  // カードの実体だけを先に構築し、開戦時効果は配置演出後まで保留する。
  G._deferManaThresholdEffects=true;
  _initSealStates();
  if(typeof applyNewPanelBattleStart==='function') await applyNewPanelBattleStart({deferOpeningEffects:true});
  // 接続した強化カード由来の封印も含め、開幕演出の前に封印状態を再計算する。
  _initSealStates();
  _applyTerrainReinforcements();

  // 通常・エリート・ボスを問わず、開幕演出が終わるまでカードは非表示にする。
  renderAll();
  if(_battleRunStale(_runId)) return;
  const introKind=await _playBattleStartIntro();
  if(_battleRunStale(_runId)) return;

  updateHUD();
  renderAll();
  await playBattleOpeningSequence();
  if(_battleRunStale(_runId)) return;
  _settleBattleOpeningLayout();
  // 全員が出撃した後、台詞を持つキャラクターがいれば吹き出しで順に出す。
  await playBattleStartLines();
  if(_battleRunStale(_runId)) return;
  if(G._debugGameOver){
    G._battleDefeatHandled=true;
    gameOver();
    return;
  }
  onBattleStart();
  try{
    await _finishNewPanelBattleStartEffects();
  }finally{
    // 開幕効果中に例外が起き、以降のマナ効果が永久に保留されるのを防ぐ。
    G._deferManaThresholdEffects=false;
  }
  // 開戦時のマナ閾値は _finishNewPanelBattleStartEffects() 内で
  // 共通コアが処理済み。ここで旧マナ閾値走査を再実行すると、
  // コアが記録した発動回数を消して同じ効果がオフラインだけ二重発動する。
  _queueRingManaThresholdEffects();
  await _flushRingManaThresholdEffects();
  renderAll();
  // 配置演出終了後、既存仕様の待機時間を経て攻撃を開始する。
  await sleep(introKind==='elite'?500:1000);
  if(_battleRunStale(_runId)) return;
  // 開幕効果で全敵が倒された場合、勝利判定。
  // 開戦効果（マナ効果・アイテム・死亡効果等）で敵が全滅すると、この行に来る前に
  // finishBattleAsVictory()がG.phaseを'reward'にしていることがある。その場合
  // checkInstantVictory()はG.phase==='player'の条件に掛からずfalseを返すため、
  // ここで打ち切らないとnextTurn()→battlePhase()へ進んでG.phaseが'enemy'へ上書きされ、
  // 以後_battleVictoryPendingが立ったままで勝利処理が二度と走らなくなる（戦闘が停止する）。
  if(G.phase==='reward'||G._battleVictoryPending) return;
  if(checkInstantVictory()) return;
  requestAnimationFrame(_updateLaneOffset); // スロット描画後にオフセット再計算
  await nextTurn();
}

// ── ターンループ ───────────────────────────────

async function nextTurn(){
  G.turn++;
  updateHUD();
  startPlayerPhase();
}

// ── ターン開始（行動回数リセット・ステータス同期）──────

function startPlayerPhase(){
  G.phase='player';
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G.spreadActive=false;
  // 毒処理後も仲間が全滅していたらゲームオーバー
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){
    // 屍術師の指輪で蘇生できた場合は、そのまま戦闘フェイズへ進める（ここでreturnしてしまうと
    // 蘇生後にターンが誰にも進められず、戦闘が永久に停止してしまう）。
    if(!_tryNecromancerRingRevive()){
      setTimeout(()=>handleBattleDefeat(),300);
      return;
    }
  }
  renderAll();
  if(G._testBattleMode){
    setHint(G._libraryTestBattleMode?'試験戦闘中：勝敗が付くまで戦います。':'試験戦闘中：「戦闘終了」でいつでも編成画面に戻れます。');
  }
  // 戦闘開始ボタンは廃止し、間を置かず自動で戦闘フェイズへ進む
  _advanceToBattlePhase();
}

// ── 戦闘フェイズ（インターリーブ攻撃）─────────────

// 戦闘中ずっと使い回すコア状態。**盤面配列はGと共有する**（同じ実体を指す）。
// コアは side/slot を見て判定するため、戦闘中は付け替えたままにし、終了時に戻す。
function _createPveCoreState(){
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:Math.max(0,Number(G._enemyBlood)||0)},
    // createBattleState() が用意する足場。ここはユニットを複製できないため
    // 手で組むが、**欠けると coreBattleStep() が落ちる**ので必ず揃えること。
    mapIndex:Math.max(1,Number(G.floor)||1),
    turn:0,
    lane:{p1:{lane:'front',attacked:new Set()},p2:{lane:'front',attacked:new Set()}},
    deadUnits:[],
    maxUnits:{p1:(typeof MAX_ALLIES==='number'&&MAX_ALLIES)||14,
      p2:(typeof MAX_ENEMIES==='number'&&MAX_ENEMIES)||14},
    frontSlots:(typeof ENEMY_FRONT_SLOTS==='number'&&ENEMY_FRONT_SLOTS)||7,
  };
  return state;
}
// コアが判定に使う side/slot を盤面へ焼き付ける。戦闘中は付けたままにする。
function _stampCoreSideSlots(state){
  ['p1','p2'].forEach(side=>{
    (state.units[side]||[]).forEach((u,i)=>{ if(!u) return; u.side=side; u.slot=i; });
  });
}

async function battlePhase(){
  const _runId=Number(G._battleRunId)||0;
  G.phase='enemy';
  document.body.classList.add('battle-turn-active');
  renderControls();
  log(`戦闘開始！`,'sys');

  // ── 戦闘の進め方はコアが唯一の実装 ──────────────────────────
  // 攻撃順・対象選択・効果の解決・終了判定はすべて coreBattleStep() が決める。
  // PvEは1手進めるごとに、その手番で出たイベントだけを演出へ流す。
  // **ここに独自のターン処理を書き戻さないこと。** オンラインと結果が食い違う。
  const state=_createPveCoreState();
  _stampCoreSideSlots(state);
  const events=[];
  const emit=ev=>{
    events.push(ev);
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  // 開戦処理は startBattle() 側で済んでいるので飛ばす。
  const runner=createBattleRunner(state,coreMathRng,emit,{skipOpening:true});
  G._coreDrivenBattle=true;
  const beforeUnits=new Set([...(state.units.p1||[]),...(state.units.p2||[])].filter(Boolean));
  const _turnLimit=(typeof BATTLE_CORE_TURN_LIMIT==='number'&&BATTLE_CORE_TURN_LIMIT)||500;
  let guard=0;
  try{
    while(!runner.result&&guard++<_turnLimit&&!G._testBattleAbort&&!_battleRunStale(_runId)){
      const from=events.length;
      let stop=false;
      // 詰め処理は演出の後に回す。先に詰めると、再生時に攻撃対象が
      // 盤面から消えていてモーションが出せない。
      // コアは同期的にHPを減らすので、step()の時点で盤面のHPは0になっている。
      // 演出フラグはstep()の前から立てておく。ここが0のまま再描画が挟まると、
      // 死亡した体が「空きスロット（7枠等間隔）」へ描き直され、そのあとに出る
      // ダメージ数値や個別VFXが何もない場所へ出てしまう。
      presentBeginPlayback();
      // 画面に出すATK/HPは「この手番が始まる前」の値で据え置く。
      // コアは1手番ぶんを先に解決するため、据え置かないと数値・VFXが出る前に
      // HP/ATKだけが変わって見える。進めるのは演出を出す瞬間（_flushCorePveHitEvents）。
      const _shownBefore=[...(G.allies||[]),...(G.enemies||[])].filter(Boolean)
        .map(u=>[u,Number(u.atk)||0,Number(u.hp)||0,Number(u.maxHp)||Number(u.hp)||1]);
      let stepped=false;
      try{
        try{ stop=runner.step({deferCompact:true}); stepped=true; }
        catch(e){ console.error('[coreBattleStep]',e); }
        // この手番で出たぶんだけを再生する。
        if(stepped){
          _shownBefore.forEach(([u,atk,hp,maxHp])=>presentHoldShown(u,atk,hp,maxHp));
          try{ await _flushCorePveHitEvents(state,events.slice(from),beforeUnits); }
          finally{ _shownBefore.forEach(([u])=>presentReleaseShown(u)); }
        }
      } finally {
        presentEndPlayback();
      }
      if(!stepped) break;
      if(typeof runner.compact==='function') runner.compact();
      _syncCoreResourcesToG(state);
      if(typeof _syncCoreBloodToG==='function') _syncCoreBloodToG(state);
      if(typeof renderManaHud==='function') renderManaHud();
      requestBattleCompact();
      _stampCoreSideSlots(state);
      // 1体の行動が終わってから次が動き出すまで、少し間を置く。
      // 途切れなく続くと何が起きているか追えない。値は present.js が唯一の定義。
      // **盤面を詰め終えてから待つ**（オンラインは次の手番の頭で待つため、
      // ここで詰める前に待つと、途中の並びだけが片側に増えて食い違う）。
      if(events.length>from) await sleep(PRESENT_TURN_GAP_MS);
      if(_battleRunStale(_runId)){ G._battlePhaseRunning=false; document.body.classList.remove('battle-turn-active'); return; }
      if(G._testBattleAbort){ _exitTestBattle(); return; }
      if(_checkBattleOver()) return;
      if(stop) break;
    }
  } finally {
    G._coreDrivenBattle=false;
  }
  if(_battleRunStale(_runId)){ G._battlePhaseRunning=false; document.body.classList.remove('battle-turn-active'); return; }
  if(G._testBattleAbort){ _exitTestBattle(); return; }
  if(guard>=_turnLimit){
    log('戦闘が長引いたため停止しました','sys');
  }
  renderAll();
  _checkBattleOver();
}

// 指定レーン内の攻撃可能ユニットのスロット添字を左（若い添字）から順に列挙する
// 手番を得られるユニットの列挙も、次に行動するユニットの選択も、
// 規則はコア（coreLaneAttackCandidates / corePickAttacker）が唯一の実装。
// ここへ規則を書き戻さないこと（オンラインと攻撃順が食い違う原因になる）。
function _laneAttackCandidates(arr,isEnemy,lane){
  return coreLaneAttackCandidates(arr,lane,isEnemy);
}
function _pickLaneAttacker(arr,isEnemy,state){
  // corePickAttacker は state.lane / state.attacked を自分で更新する。
  // 呼び出し側が使う {idx, lane, switched} の形へ写すだけにする。
  const laneBefore=state.lane;
  const attackedBefore=state.attacked;
  const unit=corePickAttacker(arr,state,isEnemy);
  if(!unit) return null;
  const idx=arr.indexOf(unit);
  if(idx<0) return null;
  const switched=(state.lane!==laneBefore)||(state.attacked!==attackedBefore);
  return {idx,lane:state.lane,switched};
}

function clampUnitStats(unit){
  if(!unit) return unit;
  unit.atk=Math.max(0,Number(unit.atk)||0);
  unit.baseAtk=Math.max(0,Number(unit.baseAtk??unit.atk)||0);
  unit.maxHp=Math.max(0,Number(unit.maxHp??unit.hp)||0);
  unit.hp=Math.max(0,Math.min(unit.maxHp,Number(unit.hp)||0));
  return unit;
}

function _battleLogName(unit,list){
  if(!unit) return '';
  const name=unit.name||'';
  const same=(list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul&&(u.name||'')===name);
  if(same.length<=1) return name;
  const idx=same.indexOf(unit);
  const suffix=String.fromCharCode(65+Math.max(0,idx));
  return `${name}（${suffix}）`;
}

function _layoutEnemyLanes(enemies){
  const live=(enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject);
  if(!live.length) return enemies;
  let rear=live.filter(e=>(e.lane||'front')==='rear');
  let front=live.filter(e=>(e.lane||'front')!=='rear');
  if(rear.length<1&&front.length>1) rear.push(front.pop());
  while(front.length<Math.min(3,live.length-1)&&rear.length>1) front.push(rear.shift());
  while(rear.length>(ENEMY_REAR_SLOTS||5)) front.push(rear.shift());
  while(rear.length>front.length&&rear.length>1) front.push(rear.shift());
  front=front.slice(0,ENEMY_FRONT_SLOTS||7);
  rear=rear.slice(0,ENEMY_REAR_SLOTS||7);
  if(front.length>0&&rear.length<1&&live.length>1) rear.push(front.pop());
  while(front.length<Math.min(3,live.length-1)&&rear.length>1) front.push(rear.shift());
  while(rear.length>front.length&&rear.length>1) front.push(rear.shift());
  front.forEach(e=>{ e.lane='front'; });
  rear.forEach(e=>{ e.lane='rear'; });
  enemies.length=0;
  front.forEach(e=>enemies.push(e));
  rear.forEach(e=>enemies.push(e));
  return enemies;
}

function compactBattleUnits(){
  // pending召喚体はコアの上限枠を占有するが、まだ表示されていないため
  // 画面の人数・中央寄せ・FLIPの対象には含めない。
  const liveCount=arr=>(arr||[]).filter(u=>u&&u.hp>0&&!u._corePendingSummon&&!u._isSoul&&!u._isObject).length;
  const compactCounts={allies:liveCount(G.allies),enemies:liveCount(G.enemies)};
  const previousCounts=G._lastCompactLiveCounts;
  // コアの召喚・死亡処理はDOMより先に配列を更新するため、前回の配列人数だけを
  // 比較すると「人数変化なし」と誤判定することがある。DOM上の実人数も比較し、
  // 先行更新後でも必ず新しい配置をFLIPの対象にする。
  const domCount=fieldId=>{
    const field=document.getElementById(fieldId);
    return field?[...field.querySelectorAll('.slot[data-unit-id]')].length:0;
  };
  const previousDomCounts={allies:domCount('f-ally'),enemies:domCount('f-enemy')};
  _recordBattleTrace('battle_compact_layout',{previous:previousCounts||null,next:compactCounts,motionDepth:G._battleMotionDepth||0,pending:!!G._pendingBattleCompact});
  // 人数が変わった場合は旧スロットを固定せず、現在の並び順のまま中央へ再配置する。
  // 旧位置を優先すると人数が減ってもカードが詰まらず、FLIPの移動元／移動先も同じになる。
  G._compactRecenterOnNext=!!previousCounts&&(
    previousCounts.allies!==compactCounts.allies||previousCounts.enemies!==compactCounts.enemies||
    previousDomCounts.allies!==compactCounts.allies||previousDomCounts.enemies!==compactCounts.enemies);
  G._lastCompactLiveCounts=compactCounts;
  const maxA=MAX_ALLIES||10;
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  // renderField() は前衛7枠＋後衛7枠（最大14体）を描画できる。
  // ここを後衛3枠に制限すると、8体目以降が配列から落ち、召喚上限前でも
  // 左端への一時表示・攻撃対象と表示キャラの不一致が発生する。
  const rearSlots=Math.max(0,maxA-frontSlots);
  const nextAllies=new Array(maxA).fill(null);
  const pendingAllies=(G.allies||[]).filter(a=>a&&a.hp>0&&a._corePendingSummon&&!a._isSoul&&!a._isObject);
  const liveAllies=(G.allies||[]).filter(a=>a&&a.hp>0&&!a._corePendingSummon&&!a._isSoul&&!a._isObject);
  liveAllies.forEach(clampUnitStats);
  const placeFixed=units=>{
    const rest=[];
    units.forEach(u=>{
      const pos=Number.isInteger(u._battleSlot)?u._battleSlot:-1;
      if(!G._compactRecenterOnNext&&pos>=0&&pos<nextAllies.length&&!nextAllies[pos]){
        u.lane=pos<frontSlots?'front':'rear';
        nextAllies[pos]=u;
      }else{
        rest.push(u);
      }
    });
    return rest;
  };
  const allyFront=placeFixed(liveAllies.filter(a=>(a.lane||'front')!=='rear'));
  const allyRear=placeFixed(liveAllies.filter(a=>(a.lane||'front')==='rear'));
  _placeCenteredRow(nextAllies,allyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextAllies,allyRear.slice(0,rearSlots),frontSlots,rearSlots,'rear');
  // 戦闘コアの state.units.p1 と G.allies は同じ配列を参照している。
  // 配列自体を差し替えると、コアが保持している旧配列だけに召喚・攻撃結果が
  // 残り、描画側とイベント側の対象が食い違う。内容だけを置き換えて参照を維持する。
  // 表示待ちの召喚体は、配置済みユニットのレイアウトを汚染しない空き枠へ
  // 保持する。上限計算とコアの後続効果からは消さない。
  pendingAllies.forEach(u=>{
    const old=Number.isInteger(u._battleSlot)?u._battleSlot:-1;
    let pos=old>=0&&old<nextAllies.length&&!nextAllies[old]?old:nextAllies.findIndex(x=>!x);
    if(pos>=0) nextAllies[pos]=u;
  });
  // コア駆動の戦闘では、盤面配列の並びをコアと同じ「生存を左詰め」に保つ。
  // 表示用の並び（_battleSlot基準の疎配列）へ組み替えると、コアの配列と
  // 順序が食い違い、全体ダメージの対象順・三方向の隣接・ランダム対象の結果がずれる。
  // renderField() は生存ユニットの「順序」から位置を決めるため、
  // 左詰めにしても見た目（中央寄せ）は変わらない。
  if(G._coreDrivenBattle&&typeof coreCompactUnits==='function'){
    // 「まだ外さない体」の判定は present.js が唯一の実装（描画側と同じ規則）。
    coreCompactUnits({units:{p1:G.allies,p2:G.enemies}},presentKeepsOnBoard);
  } else {
  if(Array.isArray(G.allies)) G.allies.splice(0,G.allies.length,...nextAllies);
  else G.allies=nextAllies;
  const maxE=MAX_ENEMIES||10;
  const enemyRearSlots=Math.max(0,maxE-frontSlots);
  const nextEnemies=new Array(maxE).fill(null);
  const pendingEnemies=(G.enemies||[]).filter(e=>e&&e.hp>0&&e._corePendingSummon&&!e._isObject);
  const liveEnemies=(G.enemies||[]).filter(e=>e&&e.hp>0&&!e._corePendingSummon&&!e._isObject);
  liveEnemies.forEach(clampUnitStats);
  const enemyFront=liveEnemies.filter(e=>(e.lane||'front')!=='rear');
  const enemyRear=liveEnemies.filter(e=>(e.lane||'front')==='rear');
  _placeCenteredRow(nextEnemies,enemyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextEnemies,enemyRear.slice(0,enemyRearSlots),frontSlots,enemyRearSlots,'rear');
  pendingEnemies.forEach(u=>{
    const old=Number.isInteger(u._battleSlot)?u._battleSlot:-1;
    let pos=old>=0&&old<nextEnemies.length&&!nextEnemies[old]?old:nextEnemies.findIndex(x=>!x);
    if(pos>=0) nextEnemies[pos]=u;
  });
  if(Array.isArray(G.enemies)) G.enemies.splice(0,G.enemies.length,...nextEnemies);
  else G.enemies=nextEnemies;
  }
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');
  G._compactRecenterOnNext=false;
}

function _placeCenteredRow(dest, units, offset, slots, lane){
  const start=Math.max(0,Math.floor((slots-units.length)/2));
  units.forEach((u,i)=>{
    if(!u) return;
    let pos=offset+start+i;
    while(pos<offset+slots&&dest[pos]) pos++;
    if(pos>=offset+slots){
      pos=offset;
      while(pos<offset+slots&&dest[pos]) pos++;
    }
    if(pos<offset||pos>=offset+slots||pos>=dest.length) return;
    u.lane=lane;
    // 再配置後のスロットを次回以降の基準に更新する。古いスロットを残すと、
    // 次の人数変化で再び旧位置へ戻り、FLIPの移動元と移動先が同じになる。
    u._battleSlot=pos;
    dest[pos]=u;
  });
}

// 盤面の人数・並び・レーンだけを比較する。攻撃中のステータス更新や
// ターン更新で requestBattleCompact() が呼ばれても、レイアウトが同じなら
// DOMを作り直さない。毎回再構築すると、進行中のFLIPを途中で取り直して
// 移動が止まって見えたり、攻撃モーションのフレーム落ちを起こす。
function _battleLayoutSignature(){
  const side=arr=>(arr||[]).filter(u=>u&&u.hp>0&&!u._isSoul&&!u._isObject)
    .map(u=>`${u.id||''}:${u.lane||'front'}`).join('|');
  return `${side(G.allies)}||${side(G.enemies)}`;
}

function compactBattleUnitsAfterDeath(){
  if(G._isSimulating||G._compactingAfterDeath||G._deferBattleCompact) return;
  _recordBattleTrace('battle_compact_request',{reason:'death',motionDepth:G._battleMotionDepth||0});
  G._compactingAfterDeath=true;
  requestBattleCompact();
  G._compactingAfterDeath=false;
  _checkRearCenterAllyGameOver();
}

function _beginDeathCompactDelay(){
  G._deferBattleCompact=(G._deferBattleCompact||0)+1;
}

function _endDeathCompactDelay(){
  G._deferBattleCompact=Math.max(0,(G._deferBattleCompact||0)-1);
  if(!G._deferBattleCompact) compactBattleUnitsAfterDeath();
}

// 攻撃モーション（接触攻撃＋反撃を含む一連の演出）が完全に終了するまで、
// 盤面詰め直し・renderAll()を遅延させるためのロック。
// _dealAttackDamageWithMutual()/_dealMultiAttackDamageWithMutual()の実行区間全体を
// beginBattleMotion()/endBattleMotion()で囲むことで、演出中にDOMが再構築されて
// （visibility:hiddenにした元要素が古いDOM参照になり）ユニットが一瞬消える事象を防ぐ。
function beginBattleMotion(){
  G._battleMotionDepth=(G._battleMotionDepth||0)+1;
}

function endBattleMotion(){
  G._battleMotionDepth=Math.max(0,(G._battleMotionDepth||0)-1);
  if(!G._battleMotionDepth&&G._pendingBattleCompact){
    _recordBattleTrace('battle_compact_flush_after_motion',{reason:'motion_end'});
    G._pendingBattleCompact=false;
    G._pendingBattleRender=false;
    compactBattleUnits();
    _renderAfterBattleCompact();
  } else if(!G._battleMotionDepth&&G._pendingBattleRender){
    G._pendingBattleRender=false;
    if(typeof renderAll==='function') renderAll();
  }
  // 攻撃時効果の解決途中で最後の敵が倒れた場合、勝利処理（終戦効果を含む）を
  // 攻撃モーションの上に重ねず、接触演出が完全に終わってから開始する。
  if(!G._battleMotionDepth&&G._pendingVictoryReason){
    const reason=G._pendingVictoryReason;
    delete G._pendingVictoryReason;
    Promise.resolve().then(()=>finishBattleAsVictory(reason));
  }
}

function _renderAfterBattleCompact(){
  G._animateBattleCompact=true;
  G._battleCompactAnimatingUntil=performance.now()+260;
  _recordBattleTrace('battle_compact_render_begin',{allies:(G.allies||[]).filter(u=>u&&u.hp>0).length,enemies:(G.enemies||[]).filter(u=>u&&u.hp>0).length});
  try{
    if(typeof renderAll==='function') renderAll();
  }finally{
    G._animateBattleCompact=false;
  }
}

function requestBattleCompact(options){
  const forceDuringMotion=!!(options&&options.forceDuringMotion)||!!G._forceBattleCompactDuringMotion;
  // イベントを再生している最中は盤面を詰めない。詰めると死亡したキャラクターの
  // カードが先に消え、そのあとに来るダメージ数値・VFXが行き場を失って
  // 何もない場所へ出る。再生が終わってから battlePhase() 側でまとめて詰める。
  if(presentIsPlaying()&&!forceDuringMotion){
    G._pendingBattleCompact=true;
    G._pendingBattleRender=true;
    return;
  }
  _recordBattleTrace('battle_compact_request',{reason:'request',motionDepth:G._battleMotionDepth||0,pending:!!G._pendingBattleCompact});
  // 死亡バッチ中は死亡ユニットの旧DOMをFLIPの移動元として保持する。
  // ここで死亡効果内の召喚・変身が先にrenderAll()すると、死亡ユニットがDOMから
  // 消えた後の矩形しか取れず、残存キャラが瞬間移動する。
  if((G._battleMotionDepth>0&&!forceDuringMotion)||G._resolvingDamageBatchDeaths>0||G._pendingDeathEffects>0){
    G._pendingBattleCompact=true;
    G._pendingBattleRender=true;
    return;
  }
  const beforeLayout=_battleLayoutSignature();
  // 召喚・変身・死亡では、コア／配置ヘルパーが先にG配列を新しい順序へ
  // 並べ替えるため、配列だけを比較すると「変更なし」と誤判定する。
  // DOMにまだ存在しない召喚体や、DOM上の順序が古い状態を検出し、
  // 配列と画面の実体が一致した場合だけ再描画を省略する。
  const liveDomLayout=side=>{
    const field=document.getElementById(side==='p1'?'f-ally':'f-enemy');
    return field?[...field.querySelectorAll('.slot[data-unit-id]')].map(x=>String(x.dataset.unitId||'')).join('|'):'';
  };
  const liveArrayLayout=arr=>(arr||[]).filter(u=>u&&u.hp>0&&!u._isSoul&&!u._isObject&&u.id!=null)
    .map(u=>String(u.id)).join('|');
  const domBefore=`${liveDomLayout('p1')}||${liveDomLayout('p2')}`;
  // compactBattleUnits()は死亡ユニットを配列から除去するため、renderField()へ
  // 到達した時点では死亡直前のDOM矩形をユニットから探せない場合がある。
  // 詰め処理の直前なら旧DOMと死亡ユニットのIDがまだ対応しているので、ここで
  // 保存しておき、死亡効果VFX（マミー等）が後段でも同じ位置を使えるようにする。
  ['p1','p2'].forEach(side=>{
    const field=document.getElementById(side==='p1'?'f-ally':'f-enemy');
    const units=side==='p1'?(G.allies||[]):(G.enemies||[]);
    if(!field) return;
    for(const oldSlot of field.querySelectorAll('.slot[data-unit-id]')){
      const dead=units.find(u=>u&&String(u.id)===String(oldSlot.dataset.unitId)&&u.hp<=0);
      if(!dead) continue;
      const r=oldSlot.getBoundingClientRect();
      if(r&&r.width>0&&r.height>0) dead._lastVisualRect={left:r.left,top:r.top,width:r.width,height:r.height};
    }
  });
  compactBattleUnits();
  const afterLayout=_battleLayoutSignature();
  const domAfterExpected=`${liveArrayLayout(G.allies)}||${liveArrayLayout(G.enemies)}`;
  const domNeedsSync=domBefore!==domAfterExpected;
  if(beforeLayout===afterLayout&&!domNeedsSync&&!(options&&options.forceRender)){
    _recordBattleTrace('battle_compact_skip_unchanged',{signature:afterLayout});
    return;
  }
  _recordBattleTrace('battle_compact_render',{allies:(G.allies||[]).filter(u=>u&&u.hp>0).length,enemies:(G.enemies||[]).filter(u=>u&&u.hp>0).length});
  _renderAfterBattleCompact();
}

function requestBattleRender(){
  if(G._battleMotionDepth>0||G._resolvingDamageBatchDeaths>0||G._pendingDeathEffects>0){
    G._pendingBattleRender=true;
    return;
  }
  if(typeof renderAll==='function') renderAll();
}

function _delayDeathCompact(ms){
  // タイマーでの詰め直しは、VFX中に位置が変わる原因になる。
  // 死亡確定と詰め直しは applyDamageBatch() 完了時に行う。
}

function _checkBattleOver(){
  if(_checkRearCenterAllyGameOver()) return true;
  _tryNecromancerRingRevive();
  const liveEnemies=G.enemies.filter(e=>e&&e.hp>0&&!e._isObject&&!_isSealed(e));
  const liveAllies=G.allies.filter(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&!_isSealed(a));
  if(liveEnemies.length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!liveAllies.length){
    if(_tryNecromancerRingRevive()){
      return false;
    }
    setTimeout(()=>handleBattleDefeat(),200);
    return true;
  }
  return false;
}

function handleBattleDefeat(){
  if(G._battleDefeatHandled) return;
  // 最後の味方が倒れた時、その死亡効果（闇の炎・怨念等）がまだ解決中のことがある。
  // 先にゲームオーバーへ進むと効果が画面に出ないまま終わるため、終わるまで待つ。
  if((G._pendingDeathEffects||0)>0){
    G._defeatWaitTicks=(G._defeatWaitTicks||0)+1;
    if(G._defeatWaitTicks<=40){ setTimeout(()=>handleBattleDefeat(),100); return; }
  }
  G._defeatWaitTicks=0;
  // 死亡効果で敵が全滅した場合は敗北ではなく勝利として扱う。
  if(typeof _livingCombatUnits==='function'&&!_livingCombatUnits(G.enemies).length
     &&typeof _onAllEnemiesDefeated==='function'){
    _onAllEnemiesDefeated();
    return;
  }
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    _exitTestBattle();
    return;
  }
  if(typeof _removeAbsentKiemetsuCards==='function') _removeAbsentKiemetsuCards();
  if(typeof handleWaveBattleDefeat==='function'&&handleWaveBattleDefeat()) return;
  if(typeof handleMapBattleDefeat==='function'&&handleMapBattleDefeat()) return;
  G._battleDefeatHandled=true;
  gameOver();
}

// メイン置き場に固定リーダー（後衛中央）が存在した旧仕様の名残。
// 現行仕様では後衛は任意（後衛不在の編成も許可）のため、この条件による敗北判定は行わない。
// 全滅判定は_checkBattleOver()/_onAllEnemiesDefeated()側で別途行う。
function _checkRearCenterAllyGameOver(){
  return false;
}

// ── 勝利確定（敵全滅・引き分けの両方から呼ばれる共通処理）─────────
// 二重発火防止（G.phase==='reward'なら何もしない）は必須。
async function finishBattleAsVictory(reason){
  if(G.phase==='reward'||G._battleVictoryPending) return;
  if(G._battleMotionDepth>0){
    G._pendingVictoryReason=reason||'敵を全滅させた！';
    return;
  }
  // 試験戦闘は敵を全滅しても通常の勝利・報酬フローへ入れない。
  // ここで専用終了しないと _testBattleMode が残り、次の「戦闘開始」も試験戦闘になる。
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    _exitTestBattle();
    return;
  }
  // 敵全滅を理由にする場合は、召喚済みの敵を含めて最後に再確認する。
  if(reason==='敵を全滅させた！'&&_livingCombatUnits(G.enemies).length) return;
  // Scene 5のボス（万象の揺り籠“エピトメ”）は勝利演出・報酬を通さず、
  // 全敵撃破が確定したこの時点から movie3 → 伏せられたラスボス戦の導入へ入る。
  if(typeof isEpitomeVictoryBattle==='function'&&isEpitomeVictoryBattle()){
    G._battleVictoryPending=true;
    G._battlePhaseRunning=false;
    G.phase='clear-cutscene';
    document.body.classList.add('battle-victory-pending');
    document.body.classList.remove('battle-turn-active');
    if(reason) log(reason,'gold');
    updateHUD();
    if(typeof startFinalBossIntroSequence==='function') void startFinalBossIntroSequence();
    return;
  }
  // Scene 5のラスボスは通常の勝利カットイン・終戦効果・報酬を通さず、
  // 全敵撃破が確定したこの時点から専用エンディング動画へ入る。
  if(typeof isFinalBossVictoryBattle==='function'&&isFinalBossVictoryBattle()){
    G._battleVictoryPending=true;
    G._battlePhaseRunning=false;
    G.phase='clear-cutscene';
    document.body.classList.add('battle-victory-pending');
    document.body.classList.remove('battle-turn-active');
    if(reason) log(reason,'gold');
    updateHUD();
    if(typeof startFinalBossClearSequence==='function') void startFinalBossClearSequence();
    return;
  }
  G._battleVictoryPending=true;
  // 引き分け等、_onAllEnemiesDefeated()/checkInstantVictory()を経由しない勝利確定ルートでも、
  // ボス戦であれば必ずボス撃破フラグを立てる（指輪報酬フェイズの判定に使うため）。
  if(_isBossFight) G._bossJustDefeated=true;
  if(reason) log(reason,'gold');
  await applyVictoryBonuses();
  // ダメージVFXは勝利・引き分け演出へ渡す。ここで全削除すると、短い戦闘では
  // 命中直後に表示される前に消えてしまうため、次画面への遷移時に掃除する。
  updateHUD();
  G.phase='reward';
  G._battlePhaseRunning=false;
  document.body.classList.add('battle-victory-pending');
  document.body.classList.remove('battle-turn-active');
  setTimeout(()=>_handleVictory(),1000);
}
function _battleVictoryAlreadyPending(){
  return G.phase==='reward'||!!G._battleVictoryPending;
}

function _onAllEnemiesDefeated(){
  if(G.phase==='reward') return; // 二重呼び出し防止
  // 死亡効果・指輪効果の召喚処理中に古い全滅通知が届くことがある。
  // 生存中の敵が残っている場合は、勝利を確定しない。
  if(_livingCombatUnits(G.enemies).length) return;
  if(!(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul)){
    if(_tryNecromancerRingRevive()){
      if(_checkRearCenterAllyGameOver()) return;
      if(_isBossFight) G._bossJustDefeated=true;
      finishBattleAsVictory('敵を全滅させた！');
      return;
    }
    G._battleDraw=true;
    finishBattleAsVictory('Draw');
    return;
  }
  if(_checkRearCenterAllyGameOver()) return;
  if(_isBossFight) G._bossJustDefeated=true;
  finishBattleAsVictory('敵を全滅させた！');
}

// ── 味方攻撃アクション ──────────────────────────

// 共通コアが即時確定した二次ヒットを、PvEの既存演出・死亡処理へ接続する。
// 数値・対象・死亡判定は coreResolveHit() が確定済みであり、ここでは再計算しない。
async function _flushCorePveHitEvents(state, events, beforeUnits){
  presentBeginPlayback();
  try{ return await _flushCorePveHitEventsInner(state,events,beforeUnits); }
  finally{ presentEndPlayback(); }
}
async function _flushCorePveHitEventsInner(state, events, beforeUnits){
  // コアがライフを変えた場合（我慢の指輪・負傷:ライフが+Nされる 等）の唯一の反映点。
  _syncCoreLifeToG(state);
  // 血は死亡イベントの発行時点でコア側へ加算される。マナ・ゴールドの表示反映を
  // 先行させないため、資源全体ではなく血だけをここでGへ戻す。
  _syncCoreBloodToG(state);
  const findUnit=(side,id)=>(state.units[side]||[]).find(u=>u&&u.id===id);
  const findLiveUnit=(side,id,fallback)=>{
    const list=side==='p1'?(G.allies||[]):(G.enemies||[]);
    return list.find(u=>u&&id&&u.id===id)||fallback||null;
  };
  const deaths=new Set();
  const consumedItems=G._coreConsumedItemEvents||(G._coreConsumedItemEvents=new Set());
  // coreSummonUnit() は同一コア処理中の効果判定のため、生成直後に state.units へ
  // 追加する。しかしそのまま描画すると、まだイベント再生していない召喚体が
  // 配置済みスロットとして扱われ、連続召喚の順序・上限・対象位置が崩れる。
  // コアの計算完了後、表示待ちの召喚体だけを一度退避し、下のイベントループで
  // 発生順に1体ずつ実盤面へ戻す。state.units と G 配列は同一参照なので片側だけ
  // 差し替えず、内容を splice して参照を維持する。
  const pendingSummons=new Map();
  // 先行フラッシュ時に後続の召喚体まで退避すると、その後のイベント処理が
  // 参照できなくなる。今回のイベント列に含まれる召喚IDだけを対象にする。
  const requestedSummonIds=new Set((events||[])
    .filter(e=>e&&e.type==='summon'&&e.unit&&e.unit.id!=null)
    .map(e=>String(e.unit.id)));
  ['p1','p2'].forEach(side=>{
    const list=state.units[side]||[];
    const pending=list.filter(u=>u&&u._corePendingSummon&&u.id!=null
      &&requestedSummonIds.has(String(u.id)));
    pending.forEach(u=>pendingSummons.set(String(u.id),u));
    if(pending.length){
      const pendingSet=new Set(pending);
      list.splice(0,list.length,...list.filter(u=>!pendingSet.has(u)));
    }
  });
  (events||[]).filter(e=>e&&e.type==='item_reward'&&e.side==='p1'&&e.item&&!consumedItems.has(e)).forEach(e=>{
    consumedItems.add(e);
    const slots=G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:new Array(4).fill(null);
    while(slots.length<4) slots.push(null);
    const idx=slots.findIndex(x=>!x);
    if(idx>=0){ slots[idx]=clone(e.item); log(`${e.item.name||'アイテム'}を得た。`,'good'); }
  });
  // ── 攻撃効果は「少し動き出した時点」で見せる ───────────────
  // コアは攻撃効果を接触より先に解決するため、イベント列では
  //   [攻撃効果…] → attack → 接触ダメージ
  // の順に並ぶ。そのまま順に再生すると、攻撃者が動く前に効果だけが出る
  // （アラッサスの薙ぎ払い、サイレンの全体ダメージ）。
  // そこで、効果より前に攻撃モーションを始めて25%地点で止め、効果を見せてから
  // 接触まで進める。止める仕組みは _playAttackMotionCore の onImpactPause。
  // **PvEとオンラインで同じ扱いにすること。**
  const _preAttackList=(events||[]).filter(Boolean);
  // 効果の発生元＝この手番で動いているキャラクター。
  // **最初のattackを掴んではいけない。** ミノタウロスの「負傷：直ちに攻撃する」のように
  // 効果の途中で別のキャラクターが割り込んで攻撃することがあり、それを先出しすると
  // 割り込んだ側が動いている間に、動いていないキャラクターの効果が出てしまう。
  const _preAttackEffect=_preAttackList.find(e=>e&&e.type!=='attack'
    &&((e.type==='damage'&&e.sourceId!=null)||(e.type==='stat_change'&&e.sourceId!=null)
      ||(e.type==='sweep_vfx'&&e.unitId!=null)||(e.type==='summon'&&e.sourceId!=null)));
  const _preAttackActorId=_preAttackEffect
    ?String(_preAttackEffect.type==='sweep_vfx'?_preAttackEffect.unitId:_preAttackEffect.sourceId):null;
  const _preAttackIndex=_preAttackActorId==null?-1
    :_preAttackList.findIndex(e=>e&&e.type==='attack'&&String(e.attackerId)===_preAttackActorId);
  const _preAttackEvent=_preAttackIndex>=0?_preAttackList[_preAttackIndex]:null;
  // その攻撃より前に、その本人が起こした効果があるときだけ先出しする。
  const _preAttackHasEffects=!!_preAttackEvent&&_preAttackList.slice(0,_preAttackIndex)
    .some(e=>e&&e!==_preAttackEvent&&(e.type==='damage'||e.type==='sweep_vfx'||e.type==='stat_change'||e.type==='summon'));
  let _preAttackMotion=null,_releasePreAttackStop=null;
  if(_preAttackEvent&&_preAttackHasEffects&&typeof playAttackMotion==='function'){
    const _side=_preAttackEvent.side==='p2'?'p2':'p1';
    const _foe=_side==='p1'?'p2':'p1';
    const _attacker=findLiveUnit(_side,_preAttackEvent.attackerId,findUnit(_side,_preAttackEvent.attackerId));
    const _target=findLiveUnit(_foe,_preAttackEvent.targetId,findUnit(_foe,_preAttackEvent.targetId));
    if(_attacker&&_target){
      const _stopped=new Promise(resolve=>{ _releasePreAttackStop=resolve; });
      if(typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:`combat:effect-attack:${uid()}`,guardMs:0});
      beginBattleMotion();
      _preAttackMotion=(async()=>{
        try{
          await playAttackMotion(_attacker,_target,_side==='p2',()=>_stopped,
            {...PRESENT_ATTACK_MOTION,
             targetRect:_target._lastVisualRect||null});
        } finally { endBattleMotion(); }
      })();
    }
  }
  // 命中音を二重に鳴らさないための印（まとめ鳴らし用）。
  const damageSfxDone=new Set();
  const sweepSources=new Set();
  // 薙ぎ払い（アラッサス）は対象ごとの命中VFXを出さない代わりに、
  // 炎が当たった瞬間にダメージ数値だけを出す。ここで出さないと数値がまったく出ない。
  // **イベント単位で覚える。** 対象単位で覚えると、同じ相手への通常攻撃の数値まで
  // 「薙ぎ払いで表示済み」と誤判定され、以後その相手のダメージ数値が出なくなる。
  const sweepShownEvents=new Set();
  const damageEventByTarget=new Map();
  (events||[]).filter(x=>x&&x.type==='damage'&&Number(x.amount)>0).forEach(x=>{
    const key=`${x.side}:${x.unitId}`;
    if(!damageEventByTarget.has(key)) damageEventByTarget.set(key,x);
  });
  for(const e of (events||[]).filter(x=>x&&x.type==='sweep_vfx')){
    const source=findLiveUnit(e.side,e.unitId,findUnit(e.side,e.unitId));
    const targetSide=e.side==='p1'?'p2':'p1';
    const targets=(e.targetIds||[]).map(id=>findLiveUnit(targetSide,id,findUnit(targetSide,id))).filter(Boolean);
    if(!source||!targets.length) continue;
    sweepSources.add(source.id);
    // 見せ方は presentSweepAttack() が唯一の実装（オンラインと同じ）。
    await presentSweepAttack(source,e.side==='p2',targets,
      target=>damageEventByTarget.get(`${targetSide}:${target.id}`),
      (target,ev)=>{
        if(ev) sweepShownEvents.add(ev);
        if(ev&&typeof presentAdvanceShown==='function') presentAdvanceShown(target,{hp:ev.hpAfter});
      });
  }
  const effectDamageSources=new Set();
  // stat_change は対象ごとに生成されるが、カード効果の固有SEは効果1回につき
  // 1回だけ鳴らす。VFXは各対象へ出すため、SEとVFXの重複単位を分離する。
  const effectStatCueKeys=new Set();
  // 「どういう規則で見せるか」は battle/present.js が唯一の実装。ここへ書き戻さないこと。
  //   ・同じ発生元・効果・対象へのstat_change固有VFXは1回だけ（毎回awaitすると開戦が数秒止まる）
  //   ・同じキャラへの連続ダメージは、前の数値が消えてから次を出す
  const effectStatVfxGate=presentCreateOnceGate();
  const damageGate=presentCreateDamageGate(
    ()=>(typeof damageLabelDurationMs==='function'?damageLabelDurationMs():950));
  // マナ効果・召喚・ダメージは、コアが出した順番をそのまま表示へ反映する。
  // 種別ごとに別ループへ分けると、召喚が攻撃後まで遅延したり、召喚後の姿が
  // 次のrenderAllで上書きされたりするため、ここだけは逐次処理する。
  const eventList=(events||[]).filter(Boolean);
  // コアは「召喚→その体が攻撃→反撃で死亡」までを一息に解決してから演出を渡す。
  // HP1の召喚体（スケルトンキングの青スケルトン等）は反撃で必ず即死するため、
  // 演出を再生する頃には既にHP0で、盤面に描画されず攻撃モーションも出せない。
  // ＝「召喚も割り込み攻撃も見えず、いきなり敵にダメージが入る」状態になる。
  // このフラッシュ内で攻撃者として登場する体は、攻撃を見せ終えるまで
  // 表示上だけ生かしておく（死亡はその後の death イベントで通常どおり演出する）。
  const _attackerIdsInFlush=new Set(eventList
    .filter(e=>e&&e.type==='attack'&&e.immediate&&e.attackerId!=null)
    .map(e=>String(e.attackerId)));
  // 閾値効果を含むイベント列では、閾値へ到達させたマナ獲得も同じ演出単位にする。
  // コアは後続の判定に必要なので数値を先に計算するが、UI側のG.manaだけを先に
  // 書き換えると、ユーザーには「マナ効果→逆再生開始」より前に効果が進んで見える。
  // 最初の遅延閾値より前にある mana_gain を、閾値の deferredAfter 復元まで保留する。
  const firstDeferredThreshold={p1:-1,p2:-1};
  eventList.forEach((x,i)=>{
    if(x.type==='mana_threshold'&&x.deferred&&firstDeferredThreshold[x.side]<0) firstDeferredThreshold[x.side]=i;
  });
  // 同時に発動した複数のマナ閾値効果では、マナ効果VFX（とSE）を
  // キャラクターごとに1回だけ再生する。「Xマナ毎」が到達回数ぶん発動したとき、
  // 同じ演出が同じカードへ何重にも重なって見えるため。別のキャラクターが
  // 同時に発動した分は、それぞれのカード上で同時に再生する。
  // 区切りは実際の攻撃モーション（即時攻撃）だけにする。マナ閾値効果自身が出す
  // damage（アラクネ等）で区切ると、同時発動でも2回目以降に演出が復活してしまう。
  // なお_playManaEffectCue()はvoidで投げっぱなしのため、ここを間引いても
  // 効果の解決順・タイミングは変わらない。
  const manaCueGate=presentCreateOnceGate();
  for(const [eventIndex,e] of eventList.entries()){
    // コア駆動の戦闘では、通常の攻撃もこの経路で描く（PvE専用の攻撃アクションは通らない）。
    const _isPlayableAttack=e.type==='attack'&&(e.immediate||G._coreDrivenBattle);
    if(!(e.type==='mana_threshold'||e.type==='mana_gain'||e.type==='gold_gain'||e.type==='summon'||e.type==='transform'||e.type==='damage'||e.type==='stat_change'||e.type==='shield_lost'||e.type==='death'||e.type==='seal_release'||_isPlayableAttack)) continue;
    if(_isPlayableAttack) manaCueGate.reset();
    if(e.type==='shield_lost'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      // コアが結界喪失効果そのものは解決済みなので、ここでは見た目と音だけ。
      presentShieldLostEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        logLine:u=>`${_lc(u.name,e.side==='p2')}の結界がダメージを防いだ。`,
      });
      continue;
    }
    if(e.type==='seal_release'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      // コア駆動では _resolveSeals() を通らないため、ここで演出する。
      await presentSealReleaseEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        logLine:u=>`${_lc(u.name,e.side==='p2')}の封印が解放された。`,
        compact:()=>{ if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true}); },
      });
      continue;
    }
    // 死亡も**コアが出したイベントの順番のまま**処理する（オンラインと同じ）。
    // 以前は末尾でまとめて処理していたため、同じ盤面でもオンラインと消える順番が
    // 食い違っていた。「数値を出し終えるまでカードを消さない」は
    // presentKeepsOnBoard（present.js）が受け持つので、ここで後回しにする必要はない。
    if(e.type==='death'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      await presentDeathEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        isDone:ev=>deaths.has(`${ev.side}:${ev.unitId}`),
        markDone:ev=>deaths.add(`${ev.side}:${ev.unitId}`),
        beat:()=>sleep(PRESENT_HIT_BEAT_MS),
        // 陣営ごとの後始末（ログ・報酬・撃破数）はPvEだけが行う。
        // オンラインはサーバーが確定済みなので何もしない。
        processDeath:async(unit,side)=>{
          if(side==='p1') await processAllyDeath(unit);
          else await processEnemyDeath(unit,(state.units.p2||[]).indexOf(unit));
        },
        compact:()=>{ if(typeof requestBattleCompact==='function') requestBattleCompact({forceRender:true}); },
      });
      continue;
    }
    if(_isPlayableAttack){
      // ミノタウロス等の負傷誘発攻撃はコアで命中結果だけを確定するが、
      // 通常攻撃と同じ接触モーションをここで再生する。これを省くと
      // 「いきなり被ダメージ」になり、攻撃者と表示上の攻撃がずれる。
      const attackSide=e.side==='p2'?'p2':'p1';
      const attacker=findLiveUnit(attackSide,e.attackerId,findUnit(attackSide,e.attackerId));
      const targetSide=attackSide==='p1'?'p2':'p1';
      const target=findLiveUnit(targetSide,e.targetId,findUnit(targetSide,e.targetId));
      // コアは攻撃イベントを命中・死亡確定より先に生成する。対象がこの時点で
      // HP0でも、死亡処理とDOM除去は後段なので、攻撃イベントを演出ごと捨てない。
      if(!attacker||!target){
        // 攻撃者（多くは直前に召喚された体）が盤面に見つからないと、モーション無しで
        // ダメージだけが出る。原因を残さないと「いきなりダメージ」の再現が追えない。
        const _arr=attackSide==='p1'?(G.allies||[]):(G.enemies||[]);
        _recordBattleTrace('attack_motion_skipped',{attackerId:e.attackerId,targetId:e.targetId,
          attackerFound:!!attacker,targetFound:!!target,
          盤面:_arr.filter(Boolean).map(u=>String(u.id)+(u._corePendingSummon?'(保留)':'')).join(',')});
      }
      if(e===_preAttackEvent&&_preAttackMotion){
        // 効果より前に始めておいたモーション。ここで接触まで進める。
        if(typeof _releasePreAttackStop==='function') _releasePreAttackStop();
        await _preAttackMotion;
        _preAttackMotion=null;
      } else if(attacker&&target&&typeof playAttackMotion==='function'){
        if(typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:`combat:effect-attack:${uid()}`,guardMs:0});
        beginBattleMotion();
        try{
          await playAttackMotion(attacker,target,attackSide==='p2',null,{...PRESENT_ATTACK_MOTION,
            targetRect:target._lastVisualRect||null});
        } finally {
          endBattleMotion();
        }
      }
      // 表示のために生かしていた召喚体は、攻撃を見せ終えた時点で本来の死亡状態へ戻す。
      // このあとの damage / death イベントが通常どおり数値と死亡演出を出す。
      if(attacker&&attacker._presentSummonDeathPending){
        delete attacker._presentSummonDeathPending;
        attacker.hp=0;
        _recordBattleTrace('summon_present_revive_end',{unitId:attacker.id});
      }
      continue;
    }
    if(e.type==='mana_threshold'){
      _recordBattleTrace('mana_state_restore_start',{unitId:e.unitId});
      // 間引きの規則は present_events.js が唯一の実装（オンラインと同じ）。
      // PvEはここで待たない（効果の解決はVFXの逆再生開始に合わせて別途行う）。
      await presentManaThresholdEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        gate:manaCueGate,
        playCue:(unit,isEnemySide)=>{ if(unit) void _playManaEffectCue(unit,isEnemySide); },
      });
      if(e.deferred&&e.deferredAfter&&typeof coreRestoreDeferredState==='function'){
        coreRestoreDeferredState(state,e.deferredAfter);
        G.mana=Math.max(0,Number(state.resources.p1?.mana)||0);
        _syncCoreResourcesToG(state);
        // 「Xマナ毎」が到達回数ぶん連続発動すると、この分岐が数十〜百回走る。
        // 1回ごとにHUDを描き直すと開戦がその分止まるため、連続する閾値の
        // 最後の1回だけ描画する（G.mana/G.gold自体は毎回更新済み）。
        const nextEvent=eventList[eventIndex+1];
        if(!(nextEvent&&nextEvent.type==='mana_threshold')&&typeof renderManaHud==='function') renderManaHud();
        _recordBattleTrace('mana_state_restore_done',{unitId:e.unitId});
      }
      continue;
    }
    if(e.type==='mana_gain'){
      if(e.deferredAppliedByThreshold){
        // 閾値イベントの逆再生開始時に deferredAfter を復元済み。
        // ここで同じmana_gainを再加算すると、閾値効果だけマナが二重になる。
        _recordBattleTrace('mana_state_skip_deferred',{unitId:e.unitId,amount:Number(e.amount)||0});
        continue;
      }
      const deferUntilThreshold=firstDeferredThreshold[e.side]>eventIndex;
      if(deferUntilThreshold){
        _recordBattleTrace('mana_state_deferred',{unitId:e.unitId,amount:Number(e.amount)||0,
          untilEvent:firstDeferredThreshold[e.side]});
        continue;
      }
      // 単純なマナ取得は旧オフライン挙動どおり、専用マナVFXを再生せず即時反映する。
      // 逆再生開始まで待つ必要があるのは、同じイベント列に続く閾値効果
      // （mana_threshold）だけである。ここで全mana_gainを待つと、通常の
      // manaOnAttack/manaOnInjury/manaOnDeathまで新しい演出待ちになり、
      // 召喚や次の戦闘イベントが遅延する。
      const source=findLiveUnit(e.side,e.unitId,findUnit(e.side,e.unitId));
      if(e.side==='p1'){
        _recordBattleTrace('mana_state_apply',{unitId:e.unitId,amount:Number(e.amount)||0});
        G.mana=Math.max(0,(Number(G.mana)||0)+(Number(e.amount)||0));
        if(typeof renderManaHud==='function') renderManaHud();
      }
      continue;
    }
    if(e.type==='gold_gain'){
      if(e.side==='p1'&&Number(e.amount)>0){
        // 死亡処理中に先行した詰め処理で配列から見えなくなっても、死亡イベントの
        // スナップショットを使って固有VFXと状態反映を落とさない。
        const source=findLiveUnit('p1',e.unitId,findUnit('p1',e.unitId))
          || (e.unit?{...e.unit,_lastVisualRect:e.lastVisualRect}:null);
        if(source){
          _recordBattleTrace('gold_vfx_start',{unitId:e.unitId,amount:Number(e.amount)||0});
          if(typeof _playCardEffectSfx==='function') _playCardEffectSfx('C001');
          let resolveReverseStart;
          const reverseStart=new Promise(resolve=>{ resolveReverseStart=resolve; });
          const vfx=typeof _playCardEffectVfx==='function'
            ?_playCardEffectVfx('C001',[source],{gateMs:0,hitDuration:900,waitForFinish:false,
              onFadeStart:()=>{ _recordBattleTrace('gold_vfx_reverse_start',{unitId:e.unitId}); resolveReverseStart(); }})
            :Promise.resolve();
          // ゴールドの状態変更は固有VFXの逆再生開始と同時に確定する。
          // VFX終了まで待つと、旧版より効果解決が遅くなる。
          // 対象矩形を取得できない環境ではonFadeStartが呼ばれないため、
          // VFX呼び出しが即時完了した場合だけ安全弁を置く。
          const reverseFallback=new Promise(resolve=>setTimeout(resolve,1100));
          await Promise.race([reverseStart,reverseFallback]).catch(()=>{});
          _recordBattleTrace('gold_state_apply',{unitId:e.unitId,amount:Number(e.amount)||0});
          G.gold=Math.max(0,Number(G.gold||0)+(Number(e.amount)||0));
          if(typeof updateHUD==='function') updateHUD();
          log(`${_lc(source.name,false)}の効果で${e.amount}ゴールドを得た。`,'good');
        }
      }
      continue;
    }
    if(e.type==='transform'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      presentTransformEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        setForm:(unit,ev)=>_setBattleUnitForm(unit,ev.name,ev.atk,ev.maxHp,unit.color),
        advanceShown:unit=>{
          if(typeof presentAdvanceShown==='function'){
            presentAdvanceShown(unit,{atk:unit.atk,hp:unit.hp,maxHp:unit.maxHp});
          }
        },
        render:()=>{ if(typeof renderAll==='function') renderAll(); },
      });
      continue;
    }
    if(e.type==='fled'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      await presentFledEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        removeFromBoard:(unit,side)=>{
          const list=side==='p1'?G.allies:G.enemies;
          const index=list.indexOf(unit);
          if(index>=0) list[index]=null;
        },
        compact:()=>{ if(typeof requestBattleCompact==='function') requestBattleCompact({forceDuringMotion:true}); },
      });
      continue;
    }
    if(e.type==='stat_change'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      // どの理由で固有VFXを出すかは present.js。ここへ規則を書き戻さないこと。
      if(!presentStatChangeVfxAllowed(e)){
        // 演出しない変化でも、画面に出すATK/HPだけは進めておく。
        const only=findLiveUnit(e.side,e.unitId,findUnit(e.side,e.unitId));
        if(only&&typeof presentAdvanceShown==='function'){
          presentAdvanceShown(only,{
            atk:Math.max(0,presentShownAtk(only)+(Number(e.atk)||0)),
            hp:Math.max(0,presentShownHp(only)+(Number(e.hp)||0)),
            maxHp:Math.max(1,presentShownMaxHp(only)+(Number(e.hp)||0)),
          });
          if(typeof updateUnitDamageUi==='function') updateUnitDamageUi(only,e.side==='p1'?'ally':'enemy');
        }
        continue;
      }
      await presentStatChangeEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        findAnyUnit:id=>findLiveUnit('p1',id,findUnit('p1',id))||findLiveUnit('p2',id,findUnit('p2',id)),
        applyStats:(unit,ev)=>{
          if(typeof presentAdvanceShown!=='function') return;
          presentAdvanceShown(unit,{
            atk:Math.max(0,presentShownAtk(unit)+(Number(ev.atk)||0)),
            hp:Math.max(0,presentShownHp(unit)+(Number(ev.hp)||0)),
            maxHp:Math.max(1,presentShownMaxHp(unit)+(Number(ev.hp)||0)),
          });
        },
        cueKeys:effectStatCueKeys,
        vfxGate:effectStatVfxGate,
        trace:info=>_recordBattleTrace('stat_change_effect_cue',info),
      });
      continue;
    }
    if(e.type==='summon'&&e.unit){
      _recordBattleTrace('summon_flush_start',{unitId:e.unit.id,sourceId:e.sourceId||null});
      const list=e.side==='p1'?G.allies:G.enemies;
      if(!list) continue;
      // coreSummonUnit() は state.units と G の配列を共有しているため、生成時点で
      // 一度末尾へ入っている。そこを「既に表示済み」とみなして飛ばすと、内部では
      // 攻撃できるのに表示スロットがなく姿が出ない。生成済みの同一IDを取り出し、
      // 通常召喚と同じ前衛配置へ通す。
      const existingIndex=list.findIndex(u=>u&&u.id===e.unit.id);
      const existing=existingIndex>=0?list[existingIndex]:null;
      // コア駆動の戦闘では、盤面配列のどこへ入れるかは coreInsertSummonedUnit() が
      // 既に決めている。ここで抜いて置き直すと配列の順序がコアと食い違い、
      // 前衛優先・三方向の隣接・ランダム対象の結果がオンラインとずれる。
      const keepCorePlacement=!!G._coreDrivenBattle&&existingIndex>=0;
      if(existingIndex>=0&&!keepCorePlacement) list.splice(existingIndex,1);
      const pending=pendingSummons.get(String(e.unit.id));
      const unit=existing||pending||{...e.unit, keywords:Array.isArray(e.unit.keywords)?e.unit.keywords.slice():[],
        effectData:e.unit.effectData?{...e.unit.effectData}: {}};
      // 一度実盤面へ戻した召喚体を保留表に残すと、後続イベントが古い参照を
      // 「まだ表示前の召喚元」として扱い、rightOfSource/leftOfSource の挿入を
      // 失敗して末尾・左端へフォールバックする。表示へ接続した時点で消費する。
      pendingSummons.delete(String(e.unit.id));
      delete unit._corePendingSummon;
      // 同じコア処理内で「本体 summon → その本体を起点にした誘発 summon」が
      // 連続して出る場合、次のイベントを表示するまで本体は pendingSummons に
      // 退避している。G 配列だけを見ていると source が見つからず、誘発体が
      // 右端へフォールバックして本体の左側／別の場所へ飛ぶ。
      const source=(e.sourceId&&(
        findLiveUnit(e.side,e.sourceId,findUnit(e.side,e.sourceId))
        ||pendingSummons.get(String(e.sourceId))
      ))||null;
      // 同じ効果元から複数体が連続して出る場合、後続体を常に効果元の直後へ
      // 挿入すると表示順が逆転する。配置ヘルパーが同一召喚群を時系列順に
      // 連結できるよう、イベントの親IDを実体へ引き継ぐ。
      if(e.sourceId!=null) unit._summonedFromId=String(e.sourceId);
      const placementTarget=e.placementTargetId!=null
        ?(list.find(u=>u&&String(u.id)===String(e.placementTargetId))||null):null;
      const placement=e.placement==='rightOfSource'&&source?{rightOf:source}
        :e.placement==='leftOfSource'&&source?{leftOf:source}
        :e.placement==='rightOfTarget'&&placementTarget?{rightOf:placementTarget}
        :e.placement==='leftOfTarget'&&placementTarget?{leftOf:placementTarget}
        :e.placement==='rightEdge'?{frontEdge:'right'}:null;
      // 位置の決定は coreInsertSummonedUnit() が唯一の実装。
      // コア駆動では、既に配列にあるならその位置を使い、無ければ同じ関数で入れ直す。
      // ここでPvE独自の配置へ落とすと、コアと配列の並びが食い違い、
      // 全体ダメージの対象順・三方向の隣接・ランダム対象の結果がずれる。
      let placed;
      if(G._coreDrivenBattle&&typeof coreInsertSummonedUnit==='function'){
        if(!list.includes(unit)){
          coreInsertSummonedUnit(list,unit,e,(typeof ENEMY_FRONT_SLOTS==='number'&&ENEMY_FRONT_SLOTS)||7);
        }
        unit.lane='front';
        unit._battleSlot=list.indexOf(unit);
        placed=list.indexOf(unit);
      } else {
        placed=typeof _summonMidBattleAllyFront==='function'
          ?_summonMidBattleAllyFront(unit,e.side==='p2',placement):-1;
      }
      // 戦闘中の召喚は前衛の右端にだけ出す。後衛へ逃がさない。
      // 以前は前衛が満杯なら後衛へ収めていたが、それだと陣営の上限を超えたり、
      // 編成していない後衛枠にキャラクターが現れたりする。
      // 前衛に入らない召喚は成立させない（コア側も同じ条件で拒否する）。
      // 前衛の配置枠または陣営上限に達した召喚は、別位置へ押し込まない。
      if(placed<0){
        const rejectArr=e.side==='p2'?G.enemies:G.allies;
        // 配置を試すために一度配列から抜いてあるので、失敗したら元の位置へ戻す。
        // 抜いたままにすると、コアはこの召喚体の攻撃・ダメージイベントを既に
        // 出しているのに盤面に本人がおらず、攻撃モーションが再生されないまま
        // 「いきなり敵にダメージが入る」状態になる。
        // （スケルトンキングの「召喚し、代わりに攻撃させる」で実際に起きていた）
        if(existingIndex>=0&&!list.includes(unit)) list.splice(existingIndex,0,unit);
        _recordBattleTrace('summon_dom_rejected',{unitId:unit.id,name:unit.name,
          reason:'no_battle_slot_or_cap',liveCount:(rejectArr||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length,
          arrayLength:(rejectArr||[]).length});
        continue;
      }
      // 攻撃を見せる前に死んでいる召喚体は、表示のあいだだけHPを戻す。
      // ここで戻さないと配置も描画もされず、直後の攻撃モーションが出せない。
      if(unit.hp<=0&&_attackerIdsInFlush.has(String(unit.id))){
        unit._presentSummonDeathPending=true;
        unit.hp=Math.max(1,Number(unit.maxHp)||1);
        _recordBattleTrace('summon_present_revive',{unitId:unit.id,name:unit.name,hp:unit.hp});
      }
      // 召喚で人数が増えた場合も、死亡時と同じFLIP詰め処理を通す。
      // renderAll()だけでは新しい人数の中央寄せへ瞬間移動し、既存キャラの
      // 表示位置とコア上のスロットが一時的に一致しない。
      // 攻撃モーションのクローンはbody直下で独立して再生され、実スロットは
      // _motionHiddenで保護される。召喚体だけはモーション終了を待たず即時描画し、
      // 次の攻撃が「内部にはいるが画面にいない」状態へ進まないようにする。
      // 攻撃モーション中に盤面を再構築すると、進行中の攻撃クローンが保持している
      // DOM参照とFLIPの移動元が無効になり、攻撃モーションの飛び・攻撃者と処理対象の
      // 不一致・召喚体の一時的な左端表示を引き起こす。召喚体の状態は既にコアへ追加
      // 済みなので、表示の詰め直しだけをモーション完了後へ遅延する。
      // 召喚体にまだDOMスロットが無い場合だけ、攻撃モーション中でも描画を進める。
      // 遅延したままだと、召喚体は画面に出ないのに内部では攻撃・被弾するため、
      // 攻撃モーションが再生されず、ダメージ数値だけが既定位置（左端）へ出る。
      // （ミテーラのペリカン／スケルトンキングのスケルトンで実際に起きていた）
      const _summonFieldId=e.side==='p2'?'f-enemy':'f-ally';
      const _summonHasDom=!!document.querySelector(
        `#${_summonFieldId} .slot[data-unit-id="${String(unit.id).replace(/"/g,'\\"')}"]`);
      if(typeof requestBattleCompact==='function') requestBattleCompact(_summonHasDom?undefined:{forceDuringMotion:true});
      if(typeof requestBattleCompact!=='function'&&typeof renderAll==='function') renderAll();
      const readyArr=e.side==='p2'?G.enemies:G.allies;
      // renderAll() は同期的にスロットを作るため、召喚イベントごとのDOM待ちは行わない。
      const fieldId=e.side==='p2'?'f-enemy':'f-ally';
      const readySlot=typeof getCurrentUnitSlot==='function'
        ?getCurrentUnitSlot(e.side==='p2'?'enemy':'ally',unit):null;
      const readyRect=readySlot?.getBoundingClientRect?.();
      const readyExpected=(readyArr||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul&&u.id!=null).map(u=>String(u.id));
      const readyActual=[...document.querySelectorAll(`#${fieldId} .slot[data-unit-id]`)].map(x=>String(x.dataset.unitId));
      _recordBattleTrace('summon_dom_ready',{unitId:unit.id,name:unit.name,lane:unit.lane,
        left:readyRect?.left||0,top:readyRect?.top||0,index:list.indexOf(unit),
        liveCount:(readyArr||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length,
        domCount:document.querySelectorAll(`#f-${e.side==='p2'?'enemy':'ally'} .slot[data-unit-id]`).length,
        expectedIds:readyExpected,actualIds:readyActual});
      await _afterPanelSummon(unit,e.side==='p2',false,true);
      continue;
    }
    if(e.type!=='damage'||!(Number(e.amount)>0)) continue;
    // 1件のダメージをどう見せるかは present_events.js が唯一の実装（オンラインと同じ）。
    // ここでの違い（ユニットの引き方・HPの進め方・先読みするイベント列）だけを渡す。
    await presentDamageEvent(e,{
      findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
      findAnyUnit:id=>findLiveUnit('p1',id,(state.units.p1||[]).concat(state.units.p2||[]).find(u=>u&&u.id===id))
        ||findLiveUnit('p2',id,null),
      applyHp:(unit,hpAfter)=>{ if(typeof presentAdvanceShown==='function') presentAdvanceShown(unit,{hp:hpAfter}); },
      gate:damageGate,
      sleep,
      ownEffectText:_ownCardEffectText,
      sfxDone:damageSfxDone,
      // 連続するdamageイベントが「同じ瞬間の命中」。ここまでをまとめて鳴らす。
      sfxBatch:ev=>{
        const out=[];
        for(let j=Math.max(0,eventList.indexOf(ev));j<eventList.length;j++){
          const d=eventList[j];
          if(!d||d.type!=='damage'||!(Number(d.amount)>0)) break;
          out.push(d);
        }
        return out;
      },
      alreadyShown:ev=>sweepShownEvents.has(ev),
      noteEffectSource:unit=>{ if(!sweepSources.has(unit.id)) effectDamageSources.add(unit.id); },
      onEffectDamage:(ev,src)=>{
        if(!sweepSources.has(src.id)&&typeof playDamageEffectSfx==='function') playDamageEffectSfx('single');
      },
    });
  }
  // 先出ししたモーションが解放されないまま残らないようにする
  // （attackイベントに到達せず抜けた場合の保険）。
  if(_preAttackMotion){
    if(typeof _releasePreAttackStop==='function') _releasePreAttackStop();
    try{ await _preAttackMotion; }catch(err){ /* 演出の失敗で再生を止めない */ }
    _preAttackMotion=null;
  }
  effectDamageSources.forEach(id=>{
    const source=(state.units.p1||[]).concat(state.units.p2||[]).find(u=>u&&u.id===id);
    const code=source&&_effectPresentationCode(source).match(/^C\d{3}$/i);
    if(code&&typeof _playCardEffectSfx==='function') _playCardEffectSfx(code[0].toUpperCase());
  });
  const spawned=[...(state.units.p1||[]),...(state.units.p2||[])].filter(u=>u&&!(beforeUnits||new Set()).has(u));
  for(const spawnedUnit of spawned){
    // coreSummonUnit() の保留召喚は、上のイベント逐次処理で配置できたものだけを
    // G配列へ接続する。前衛満杯／陣営上限で配置できなかった保留体をここで末尾追加すると、
    // 上限超過・左端への一時表示・コアとDOMの人数不一致が発生する。
    if(spawnedUnit._corePendingSummon) continue;
    const targetList=(state.units.p1||[]).includes(spawnedUnit)?G.allies:G.enemies;
    if(targetList.some(u=>u&&u.id===spawnedUnit.id)) continue;
    targetList.push(spawnedUnit);
    await _afterPanelSummon(spawnedUnit,targetList===G.enemies,false,true);
  }
  if(typeof requestBattleRender==='function') requestBattleRender();
  _syncCoreBloodToG(state);
}

// PvEも攻撃時効果の判定・数値変更は共通コアを使う。DOM演出だけは、コアが返す
// ダメージを既存のapplyDamageBatchへ戻して再生する。
async function _applyUnitAttackEffects(unit,isEnemySide){
  if(!unit||unit.hp<=0||_isSealed(unit)) return;
  _recordBattleTrace('attack_effect_dispatch_start',{unitId:unit.id,isEnemySide});
  if((unit._scrollSilencedUntilAttack||unit._silenced)){
    delete unit._scrollSilencedUntilAttack;
    delete unit._silenced;
    return;
  }
  const allies=isEnemySide?(G.enemies||[]):(G.allies||[]);
  const foes=isEnemySide?(G.allies||[]):(G.enemies||[]);
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    deferManaThresholdEffects:true,
  };
  const touched=[];
  // コアはside/slotを見て判定するため、呼ぶ前に一時的に付け替える。
  // 反復ごとに演出を挟むので、付け替えと復帰を関数にして往復できるようにする。
  const _applyCoreSideSlots=()=>{
    [...state.units.p1,...state.units.p2].forEach((u,i)=>{
      if(!u) return;
      u.side=state.units.p1.includes(u)?'p1':'p2';
      u.slot=i;
    });
  };
  const _restoreSideSlots=()=>{
    touched.forEach(([u,side,slot])=>{
      if(side==null) delete u.side; else u.side=side;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  };
  [...state.units.p1,...state.units.p2].forEach(u=>{ if(u) touched.push([u,u.side,u.slot]); });
  _applyCoreSideSlots();
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{ localEvents.push(ev); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  const applyHit=(source,target,amount,counter)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  };
  const beforeUnits=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const previousDeferMana=!!G._deferManaThresholdEffects;
  let skipAttack=false;
  // 反復ごとに再生した位置。残りは最後にまとめて再生する。
  let flushedEventCount=0;
  G._deferManaThresholdEffects=true;
  try{
    // 攻撃効果の反復回数は共通コアと同じ入口で一度だけ計算する。
    // 旧互換ラッパー側でも同じ回数を呼ぶと、ユミル等が二重発動する。
    const attackRepeats=1+coreEffectCount(unit,'闇の儀式')
      +_ringCount('狂戦士の指輪')+(Number(unit.effectData&&unit.effectData.effectRepeatBonus)||0);
    for(let i=0;i<attackRepeats&&unit.hp>0;i++){
      const effectBeforeAtk=Number(unit.atk)||0, effectBeforeHp=Number(unit.hp)||0;
      _recordBattleTrace('attack_effect_iteration',{unitId:unit.id,index:i+1,total:attackRepeats,
        effectCount:coreEffectCount(unit,unit.name),targetId:unit._currentAttackTarget&&unit._currentAttackTarget.id||null,
        beforeAtk:effectBeforeAtk,beforeHp:effectBeforeHp});
      // 攻撃時マナも攻撃効果の一部として、PvE/PvP共通コアから解決する。
      coreTriggerManaOnAttack(unit,state,emit);
      const attackEventSeq=state._coreAttackEventSeq=(Number(state._coreAttackEventSeq)||0)+1;
      const coreResult=coreApplyAttackEffects(unit,state,coreMathRng,emit,applyHit,`${attackEventSeq}:${i}`);
      if(coreResult&&coreResult.skipAttack) skipAttack=true;
      if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
      _recordBattleTrace('attack_effect_iteration_result',{unitId:unit.id,index:i+1,
        afterAtk:Number(unit.atk)||0,afterHp:Number(unit.hp)||0,
        deltaAtk:(Number(unit.atk)||0)-effectBeforeAtk,deltaHp:(Number(unit.hp)||0)-effectBeforeHp});
      // 反復ごとにここまでの分を再生する。全反復を解決し切ってから再生すると、
      // HPは最後に一度だけ動いて見え、ミノタウロスの「直ちに攻撃」も
      // まとめて連続発火して見える。1回分ずつ「効果→割り込み攻撃」を見せる。
      if(flushedEventCount<localEvents.length){
        const slice=localEvents.slice(flushedEventCount);
        flushedEventCount=localEvents.length;
        _restoreSideSlots();
        try{ await _flushCorePveHitEvents(state,slice,beforeUnits); }
        finally{ _applyCoreSideSlots(); }
      }
    }
    _recordBattleTrace('mana_threshold_scan',{phase:'attack',unitId:unit.id,mana:Number(state.resources.p1?.mana)||0});
    coreApplyManaThresholdEffects(state,coreMathRng,emit,applyHit);
    if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
    _syncCoreResourcesToG(state);
    if(typeof renderManaHud==='function') renderManaHud();
  }finally{
    G._deferManaThresholdEffects=previousDeferMana;
    _restoreSideSlots();
  }
  // コア召喚をPvEの盤面・演出へ接続する。反復中に再生済みの分は除く。
  await _flushCorePveHitEvents(state,localEvents.slice(flushedEventCount),beforeUnits);
  _recordBattleTrace('attack_effect_dispatch_end',{unitId:unit.id});
  return skipAttack;
}

// 闇の儀式：常時：このキャラクターの攻撃効果は1回追加で発動する。（接続枚数分繰り返す）
// 狂戦士の指輪：常時：味方の攻撃効果は1回追加で発動する。（陣営全体）
// 味方の攻撃効果の追加発動回数。
//   闇の儀式：常時：このキャラクターの攻撃効果は1回追加で発動する。（接続枚数分）
//   狂戦士の指輪：常時：味方の攻撃効果は1回追加で発動する。（陣営全体）
// 「攻撃：◯マナを得る」（マナ生成）も攻撃効果なので、同じ回数だけ繰り返す。
function _allyAttackEffectExtra(ally){
  if(!ally) return 0;
  return _enhancementCount(ally,'闇の儀式')+_ringCount('狂戦士の指輪')+(Number(ally._effectRepeatBonus)||0);
}
async function _applyAllyAttackEffects(ally){
  return await _applyUnitAttackEffects(ally,false);
}

async function _applyEnemyAttackEffects(enemy){
  return await _applyUnitAttackEffects(enemy,true);
}

async function _applyAllyAttackEffectsWithElf(ally){
  if(!ally||ally.hp<=0) return;
  return await _applyAllyAttackEffects(ally);
}

async function _applyEnemyAttackEffectsWithElf(enemy){
  if(!enemy||enemy.hp<=0) return;
  return await _applyEnemyAttackEffects(enemy);
}


// ── 戦闘ルールは js/battle/core.js が唯一の実装場所 ──────────────
// 以下は既存の呼び出し名を保つための委譲。ここに条件やルールを書き足さないこと
// （書き足すとPvEとPvPでルールが食い違う）。変更はコア側で行う。
function _unitPanelKeywords(unit){ return coreUnitKeywords(unit); }

function _unitHasKeyword(unit, kw){ return coreUnitHasKeyword(unit, kw); }

function _unitKeywordCount(unit, kw){ return coreUnitKeywordCount(unit, kw); }

function _unitHasSacrifice(unit){ return coreUnitHasSacrifice(unit); }

function _sealValue(unit){ return coreSealValue(unit); }

function _isSealed(unit){ return coreIsSealed(unit); }

function _canReceiveBattleEffect(unit){ return coreCanAct(unit); }

function _livingCombatUnits(list){
  return (list||[]).filter(_canReceiveBattleEffect);
}

function _battleSideOfUnit(unit){
  if((G.allies||[]).includes(unit)) return 'ally';
  if((G.enemies||[]).includes(unit)) return 'enemy';
  return '';
}

// includeSealed=true の場合は封印中のキャラクターにも適用する（常時効果は封印の有無を問わず
// 常に最優先で適用されるルールのため。開戦効果等の通常のトリガー効果は従来通り封印でブロックする）。
function _addBattleStats(unit, atk, hp, side, includeSealed){
  if(!unit||unit.hp<=0||(!includeSealed&&_isSealed(unit))) return;
  if(atk){
    const gain=atk>0&&_isBattleGainPhase()&&_unitHasKeyword(unit,'熟練')?atk+1:atk;
    unit.atk=Math.max(0,(unit.atk||0)+gain);
    unit.baseAtk=Math.max(0,(unit.baseAtk||0)+gain);
  }
  if(hp) addUnitHp(unit,hp,side||_battleSideOfUnit(unit));
}

function _isWoundedUnit(unit){
  return !!(unit&&unit.hp>0&&Number(unit.hp)<Number(unit.maxHp||unit.hp));
}

function _randomLiving(list, pred){
  const pool=(list||[]).filter(u=>_canReceiveBattleEffect(u)&&(!pred||pred(u)));
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
}

// 狙撃持ちが「ランダムな敵」を選ぶ際に共有する優先順位。
// 死亡した対象は次回同期時に除外し、戦闘中に新しく出現した対象は末尾へ追加する。
function _sniperTargetOrder(foes){
  const key=foes===G.enemies?'enemies':'allies';
  G._sniperTargetOrders=G._sniperTargetOrders||{enemies:[],allies:[]};
  const alive=(foes||[]).filter(_canReceiveBattleEffect);
  const previous=Array.isArray(G._sniperTargetOrders[key])?G._sniperTargetOrders[key]:[];
  const order=previous.filter(u=>alive.includes(u));
  alive.forEach(u=>{ if(!order.includes(u)) order.push(u); });
  G._sniperTargetOrders[key]=order;
  return order;
}

function _pickRandomEnemyTargets(foes, source, count=1){
  const alive=(foes||[]).filter(_canReceiveBattleEffect);
  if(!alive.length) return [];
  if(source&&_unitHasKeyword(source,'狙撃')) return _sniperTargetOrder(foes).slice(0,count);
  const pool=[...alive], picked=[];
  while(pool.length&&picked.length<count){
    picked.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  }
  return picked;
}

function _grantUnitKeyword(unit, kw){
  if(!unit||!kw) return false;
  if(!(unit.keywords||[]).includes(kw)) unit.keywords=[...(unit.keywords||[]),kw];
  return true;
}

function _setBattleUnitForm(unit, name, fallbackAtk, fallbackHp, color){
  if(!unit||!name) return;
  const m=String(name).match(/^([赤青緑黄紫])(.+)$/);
  const finalColor=color||(m?m[1]:'');
  const baseName=m?m[2]:String(name);
  const basePanel=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(p=>p&&p.name===baseName)
    :null;
  const atk=Math.max(0,Number(basePanel?.power??fallbackAtk??unit.atk)||0);
  const hp=Math.max(1,Number(basePanel?.life??fallbackHp??unit.maxHp??unit.hp)||1);
  unit.name=baseName;
  unit.atk=atk;
  unit.baseAtk=atk;
  unit.hp=hp;
  unit.maxHp=hp;
  unit.color=finalColor||(basePanel&&basePanel.color)||unit.color||'';
  unit.race=(basePanel&&basePanel.race)||unit.race||'召喚';
  unit.desc=(basePanel&&basePanel.desc)||unit.desc||'';
  unit.keywords=[...(basePanel&&basePanel.keywords||[])];
  unit.manaCost=basePanel&&basePanel.manaCost||0;
  unit.manaRepeat=!!(basePanel&&basePanel.manaRepeat);
  delete unit._manaFireCount;
  if(basePanel&&typeof getPanelArtPath==='function') unit.art=getPanelArtPath(basePanel);
  if(basePanel&&(basePanel.no||basePanel.artCode||basePanel._artCode)) unit.no=basePanel.no||basePanel.artCode||basePanel._artCode;
  const shieldValue=_unitShieldValue(unit);
  unit.shield=shieldValue>0?shieldValue:0;
}

function _unitToRewardPanel(unit){
  if(!unit) return null;
  const rawName=String(unit.name||'').trim();
  const colorNameMatch=rawName.match(/^([赤青緑黄紫])(.+)$/);
  const baseName=colorNameMatch?colorNameMatch[2]:rawName;
  const sourceName=String(unit._sourcePanelName||'').trim();
  const nameCandidates=[sourceName,rawName,baseName].filter(Boolean);
  const base=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(p=>p&&String(p.category||'')==='キャラクター'&&nameCandidates.includes(String(p.name||'').trim()))
    :null;
  const card=clone(base||{
    id:'reward_' + (rawName||uid()),
    name:rawName,
    type:'panel',
    kind:'panel',
    panelScope:'unit',
    category:'キャラクター',
    rarity:1,
    grade:1,
    cost:1,
    slot:1,
  });
  if(!base){
    card.name=rawName;
    card.color=unit.color||card.color||'';
    card.race=unit.race||card.race||'';
    card.power=Math.max(0,Number(unit.atk)||Number(card.power)||0);
    card.life=Math.max(1,Number(unit.maxHp??unit.hp)||Number(card.life)||1);
    card.desc=unit.desc||card.desc||'';
    card.keywords=[...(unit.keywords||card.keywords||[])];
  }else{
    card.type='panel';
    card.kind='panel';
    card.panelScope='unit';
    card.category='キャラクター';
    card.power=Math.max(0,Number(base.power)||0);
    card.life=Math.max(1,Number(base.life)||1);
    card.desc=base.desc||'';
    card.keywords=[...(base.keywords||[])];
  }
  // 戦闘ユニットから直接報酬化する場合は、PANEL_POOLの雛形だけでなく
  // 実際に表示されていた敵の画像・識別番号・方向情報を引き継ぐ。
  // これがないとレムレース等で敵を報酬化した際、名前だけのカードになる。
  const unitArt=unit.art||unit.image||'';
  if(unitArt) card.art=unitArt;
  if(unit.artCode) card.artCode=unit.artCode;
  if(unit.imageNo) card.imageNo=unit.imageNo;
  if(unit.no) card.no=unit.no;
  if(Array.isArray(unit.directions)&&unit.directions.length) card.directions=[...unit.directions];
  // 通常の報酬カードはmakePanel()で方向を生成するが、戦闘中ユニットから
  // 直接作る追加報酬カードはその経路を通らないため、ここで同じ情報を補う。
  if(!Array.isArray(card.directions)||!card.directions.length){
    const directionCount=Math.max(1,Math.min(4,Number(card.directionCount)||2));
    card.directions=typeof _rollPanelDirections==='function'
      ?_rollPanelDirections(directionCount,{avoidOpposite:directionCount===2})
      :['up','right','down','left'].slice(0,directionCount);
  }
  card._temporaryRewardAreaCard=true;
  card._bonusRewardCard=true;
  return card;
}

function _queueBonusRewardPanel(unit){
  const card=_unitToRewardPanel(unit);
  if(!card) return false;
  G._bonusRewardPanels=G._bonusRewardPanels||[];
  G._bonusRewardPanels.push(card);
  return true;
}

function _combatModifierBonus(source,isEnemySide){
  if(!source||String(source.color||'')!=='紫') return 0;
  const side=isEnemySide?G.enemies:G.allies;
  return (side||[]).some(u=>u&&u.hp>0&&!_isSealed(u)&&u.name==='ヴォイド・ウォーカー')?1:0;
}

function _allBattleCharacters(){
  return [...(G.allies||[]),...(G.enemies||[])].filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul);
}

// 同時に発動するキャラクター効果の優先順：前衛左→前衛右→後衛左→後衛右。
// 陣営間の順序は従来どおり味方→敵を維持する。
function _orderedBattleCharacters(){
  const orderSide=arr=>(arr||[]).map((unit,index)=>({unit,index})).filter(x=>x.unit&&x.unit.hp>0&&!x.unit._isObject&&!x.unit._isSoul)
    .sort((a,b)=>{
      const laneA=(a.unit.lane||'front')==='rear'?1:0;
      const laneB=(b.unit.lane||'front')==='rear'?1:0;
      return laneA-laneB||a.index-b.index;
    }).map(x=>x.unit);
  return [...orderSide(G.allies),...orderSide(G.enemies)];
}

function _openingBattleCharacters(){
  // 開戦効果だけは敵陣営を先に解決する。通常の同時効果の順序は変更しない。
  const order=arr=>(arr||[]).map((unit,index)=>({unit,index})).filter(x=>x.unit&&x.unit.hp>0&&!x.unit._isObject&&!x.unit._isSoul)
    .sort((a,b)=>{
      const laneA=(a.unit.lane||'front')==='rear'?1:0;
      const laneB=(b.unit.lane||'front')==='rear'?1:0;
      return laneA-laneB||a.index-b.index;
    }).map(x=>x.unit);
  return [...order(G.enemies),...order(G.allies)];
}

function _sacrificeCount(){ return Math.max(0,Number(G._blood)||0); }

function _fieldOrderOfUnit(unit){
  let idx=(G.allies||[]).indexOf(unit);
  if(idx>=0) return idx;
  idx=(G.enemies||[]).indexOf(unit);
  return idx>=0?100+idx:999;
}

function _connectedEnhancementCount(unit){
  if(unit&&Number.isInteger(unit._mainBoardSlot)&&typeof _getPartyBoardUnit==='function'&&typeof _collectEnhancementPanelsForSlot==='function'){
    const board=_getPartyBoardUnit();
    const idx=unit._mainBoardSlot;
    if(board&&Array.isArray(board.equipment)&&board.equipment[idx]){
      return _collectEnhancementPanelsForSlot(board,idx).length;
    }
  }
  return (Array.isArray(unit&&unit.equipment)?unit.equipment:[])
    .filter(p=>p&&String(p.category||'')!=='キャラクター').length;
}

function _shieldValueFromKeyword(k){ return coreShieldValueFromKeyword(k); }

function _unitShieldValue(unit){ return coreUnitShieldValue(unit); }

// 強化カード由来の効果は「キーワードとして持っている数」と「接続している同名パネルの枚数」の
// 大きい方で数える（錬成・野生の力と同じ数え方）。
// シートの「キーワード」列が空の強化カードは _unitHasKeyword() では絶対に拾えない
// （_adjacentPanelAbilities に載るのは keywordPanels のハードコード集合だけ）ため、
// 強化カード名で判定する箇所は必ずこれを使うこと。
function _enhancementCount(unit, name){
  return Math.max(_unitKeywordCount(unit,name),_unitEffectPanelCount(unit,name));
}

function _unitEffectPanelCount(unit, kw){
  if(!unit||!kw) return 0;
  if(Number.isInteger(unit._mainBoardSlot)&&typeof _getPartyBoardUnit==='function'&&typeof _collectEnhancementPanelsForSlot==='function'){
    const board=_getPartyBoardUnit();
    if(board&&Array.isArray(board.equipment)){
      return _panelEffectKeywordCount(_collectEnhancementPanelsForSlot(board,unit._mainBoardSlot),kw);
    }
  }
  // 接続数のカウントはequipment配列の添字（盤面上の位置＝物理的に別々の接続）で数える。
  // p.id/p.uidは同じ強化カードを複数枚接続した場合でも同じ値（テンプレート由来）になるため、
  // これをキーにすると2枚目以降が「同一パネル」とみなされ重複発動しなくなるバグの原因だった。
  let count=0;
  (Array.isArray(unit.equipment)?unit.equipment:[]).forEach((p,i)=>{
    if(!p||String(p.category||'')==='キャラクター') return;
    const names=[p.name,...(p.keywords||[]),...(p.adjacentKeywords||[])].filter(Boolean);
    if(names.includes(kw)) count+=(p._tripleMerged?2:1)+(Number(p._effectRepeatBonus||p.effectRepeatBonus)||0);
  });
  return count;
}

function _openingEffectRepeatCount(unit){
  if(!unit) return 1;
  return 1+Math.max(_unitKeywordCount(unit,'恩寵'),_unitEffectPanelCount(unit,'恩寵'))+(Number(unit._effectRepeatBonus)||0);
}

function _panelEffectKeywordCount(panels, kw){
  const seen=new Map();
  (panels||[]).forEach((entry,i)=>{
    const panel=entry&&entry.panel?entry.panel:entry;
    if(!panel||String(panel.category||'')==='キャラクター') return;
    const names=[panel.name,...(panel.keywords||[]),...(panel.adjacentKeywords||[])].filter(Boolean);
    if(names.includes(kw)){
      const key=entry&&entry.idx!=null?entry.idx:i;
      seen.set(key,(panel._tripleMerged?2:1)+(Number(panel._effectRepeatBonus||panel.effectRepeatBonus)||0));
    }
  });
  return [...seen.values()].reduce((sum,n)=>sum+n,0);
}

function _unitEffectNames(unit){
  const names=[];
  if(unit&&unit.name) names.push(unit.name);
  (unit&&unit._resonanceEffectNames||[]).forEach(n=>{
    const name=String(n||'').trim();
    if(name) names.push(name);
  });
  return names;
}

function _unitHasEffectName(unit, name){
  const normalize=s=>String(s||'').replace(/[“”]/g,'"').trim();
  const target=normalize(name);
  return _unitEffectNames(unit).some(n=>normalize(n)===target);
}

function _unitEffectScale(unit,name){
  if(!unit||!name) return 1;
  const own=unit._tripleMerged&&String(unit.name||'')===String(name)?2:1;
  const connected=Math.max(1,Number(unit._resonanceEffectScales&&unit._resonanceEffectScales[name])||1);
  return Math.max(own,connected);
}

function _attackDamageValue(unit){ return coreAttackDamage(unit); }

async function _applyAttackEffectsForSide(unit,isEnemySide){
  if(isEnemySide) return await _applyEnemyAttackEffectsWithElf(unit);
  return await _applyAllyAttackEffectsWithElf(unit);
}

function _hasAttackEffectsForPause(unit){
  if(!unit||unit.hp<=0||_isSealed(unit)) return false;
  const desc=typeof coreUnitEffectText==='function'
    ? coreUnitEffectText(unit) : String(unit.desc||unit.effectText||unit.effect||'');
  const hasName=name=>_unitHasEffectName(unit,name);
  if(_unitEffectPanelCount(unit,'懺悔')>0) return true;
  if(hasName('ブラウニー')||hasName('ファミリア')||hasName('ユミル')||hasName('ラミア')||hasName('センチネル')||hasName('エルヴンメイジ')||hasName('インプ')||hasName('黄金の瞳"フレイ"')||hasName('万象の揺り籠"エピトメ"')||hasName('スケルトンキング')) return true;
  const attackText=typeof coreUnitTriggerText==='function'
    ?coreUnitTriggerText(unit,'攻撃') : desc;
  if(/^\s*攻撃(?:[＆&](?:攻撃|負傷))?\s*[：:]/.test(attackText)) return true;
  if(/全ての仲間のHPが\+[12]/.test(desc)||hasName('サイレン')) return true;
  if(/^攻撃：ランダムな敵にXダメージ/.test(desc)) return true;
  if(_unitHasKeyword(unit,'竜の契約')||_unitEffectPanelCount(unit,'竜の契約')>0) return true;
  if(_unitHasKeyword(unit,'共振')||_unitHasKeyword(unit,'戦術')) return true;
  if(_enhancementCount(unit,'剣技')>0) return true;
  if(hasName('日刻の巫女"ルミア"')) return true;
  return false;
}

function _applyGremlinAttackSwap(attacker,target,isEnemySide){
  // 互換名。入れ替えのルール本体は coreApplyAttackEffects() に一本化する。
}

function _summonSuccubusVictimIfNeeded(deadEnemy){
  const src=deadEnemy&&deadEnemy._lastDamageSource;
  if(!src||src.hp<=0||src.name!=='サキュバス'||!(G.allies||[]).includes(src)) return;
  const snap=deadEnemy._preDeathSnapshot||deadEnemy;
  const unit={...deadEnemy,...snap};
  unit.id=uid();
  unit.hp=Math.max(1,Number(snap.hp)||Number(snap.maxHp)||1);
  unit.maxHp=Math.max(1,Number(snap.maxHp)||unit.hp);
  unit.atk=Math.max(0,Number(snap.atk)||0);
  unit.baseAtk=Math.max(0,Number(snap.baseAtk??snap.atk)||0);
  unit.keywords=[...(snap.keywords||deadEnemy.keywords||[])];
  unit._panelSummoned=true;
  unit._summonedBySuccubus=true;
  unit._useEnemyVisualFrame=false;
  unit._dp=false;
  unit._deathProcessed=false;
  delete unit._lastDamageSource;
  delete unit._preDeathSnapshot;
  delete unit._sacrificedForSeal;
  const placed=_summonMidBattleAllyFront(unit,false,{rightOf:src});
  if(placed>=0){
    _afterPanelSummon(unit,false);
    log(`${_lc(src.name,false)}の効果で${_lc(unit.name,false)}を召喚した。`,'good');
  }
}

function _battleUnitSnapshot(unit, hpOverride){
  if(!unit) return null;
  return {
    name:unit.name,
    atk:Math.max(0,Number(unit.atk)||0),
    baseAtk:Math.max(0,Number(unit.baseAtk??unit.atk)||0),
    hp:Math.max(0,Number(hpOverride??unit.hp)||0),
    maxHp:Math.max(1,Number(unit.maxHp??unit.hp)||1),
    color:unit.color||'',
    race:unit.race||'',
    desc:unit.desc||'',
    keywords:[...(unit.keywords||[])],
    art:unit.art||'',
    artCode:unit.artCode||'',
    imageNo:unit.imageNo||'',
    no:unit.no||''
  };
}

function _damageSideOf(unit){
  if((G.allies||[]).includes(unit)) return 'ally';
  if((G.enemies||[]).includes(unit)) return 'enemy';
  return '';
}

function _captureUnitDamageRect(unit, side){
  if(!unit||!side||typeof getCurrentUnitSlot!=='function') return null;
  const slot=getCurrentUnitSlot(side==='enemy'?'enemy':'ally',unit);
  const slotIsDeadEmpty=slot&&slot.classList&&slot.classList.contains('dead-empty');
  // ダメージVFX・数値は攻撃モーション中のカードではなく、盤面の定位置へ固定する。
  const visual=!slotIsDeadEmpty?slot:null;
  const rect=visual&&typeof visual.getBoundingClientRect==='function'
    ?visual.getBoundingClientRect():unit._lastVisualRect;
  if(!rect||!rect.width||!rect.height) return null;
  return {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
}

// 通常攻撃の大ダメージ用画面揺れ。後から設定でON/OFF・強度変更できるよう、
// 攻撃処理やダメージ計算から分離しておく。
const BATTLE_SCREEN_SHAKE_CONFIG={enabled:true,strength:1};
const BATTLE_SCREEN_SHAKE_TIERS=[
  {min:50,max:74,amplitude:7,duration:150,hitStop:0},
  {min:75,max:99,amplitude:11,duration:180,hitStop:0},
  {min:100,max:149,amplitude:16,duration:220,hitStop:30},
  {min:150,max:199,amplitude:22,duration:260,hitStop:45},
  {min:200,amplitude:30,duration:320,hitStop:60,heavy:true}
];
let _battleScreenShakeAnimation=null;
function _battleScreenShakeTier(damage){
  const value=Number(damage)||0;
  return BATTLE_SCREEN_SHAKE_TIERS.find(t=>value>=t.min&&(!Number.isFinite(t.max)||value<=t.max))||null;
}
async function triggerBattleScreenShake(options){
  const cfg={...BATTLE_SCREEN_SHAKE_CONFIG,...(options||{})};
  if(!cfg.enabled) return;
  const host=document.getElementById('scr-battle');
  if(!host||!host.classList.contains('active')) return;
  const tier=_battleScreenShakeTier(cfg.damage);
  if(!tier) return;
  // ヒットストップを先に待つと、ダメージ表示より振動が遅れて見えるため、即時開始する。
  if(_battleScreenShakeAnimation&&typeof _battleScreenShakeAnimation.cancel==='function') _battleScreenShakeAnimation.cancel();
  const strength=Number.isFinite(Number(cfg.strength))?Math.max(0,Number(cfg.strength)):1;
  const amount=Math.max(0,tier.amplitude*strength);
  const duration=tier.duration;
  const first=tier.heavy?1.18:1;
  // キーフレームに var(--game-scale) を残すと毎フレーム変数解決が必要になり、
  // アニメーションがコンポジタへ乗らず本スレッドで処理されて一瞬固まる。
  // 開始時点の値を数値として焼き込む（振動中に画面サイズが変わることは無い）。
  const gameScale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-scale'))||1;
  const transform=(x,y)=>`scale(${gameScale}) translate3d(${x}px,${y}px,0)`;
  if(typeof host.animate==='function'){
    const animation=host.animate([
      {transform:transform(0,0)},
      {transform:transform(-amount*first,amount*.62*first),offset:.04},
      {transform:transform(amount,-amount*.52),offset:.2},
      {transform:transform(-amount*.52,amount*.3),offset:.42},
      {transform:transform(amount*.25,-amount*.14),offset:.66},
      {transform:transform(-amount*.1,amount*.06),offset:.84},
      {transform:transform(0,0)}
    ],{duration,easing:'ease-out',fill:'none'});
    _battleScreenShakeAnimation=animation;
    animation.finished.catch(()=>{}).finally(()=>{ if(_battleScreenShakeAnimation===animation) _battleScreenShakeAnimation=null; });
    return;
  }
  host.classList.remove('battle-screen-shake');
  void host.offsetWidth;
  host.style.setProperty('--battle-shake-distance',`${amount}px`);
  host.style.setProperty('--battle-shake-initial-x',`${-amount*first}px`);
  host.style.setProperty('--battle-shake-initial-y',`${amount*.62*first}px`);
  host.style.setProperty('--battle-shake-duration',`${duration}ms`);
  host.classList.add('battle-screen-shake');
}

// 画面揺れを「ぶつかった瞬間」に鳴らすため、コアと同じ規則で
// 最終ダメージだけを先読みする。状態は一切変更しない（結界も減らさない）。
function _predictFinalDamage(unit, dmg, skipTough){
  return coreResolveIncomingDamage(unit,dmg,{skipTough}).amount;
}

// 接触時に画面揺れを開始する。applyDamageBatch()側は二重に揺らさないよう、このフラグを消費する。
// 接触フック（onHit）は攻撃モーションの接近区間が終わった時点で呼ばれる。
// そこから実際にカードがぶつかって見えるまでにわずかな間があるため、
// この分だけ振動を遅らせて衝突の瞬間に合わせる。速すぎ／遅すぎる場合はここを調整する。
// 現在値はダメージVFXの再生開始に合わせてある（接触フックからVFXまでの実測は435-441ms／17回）。
const BATTLE_SHAKE_CONTACT_DELAY_MS=440;
function _shakeOnAttackContact(target, damage){
  const predicted=_predictFinalDamage(target,damage);
  if(predicted<50) return;
  // フラグは即座に立てる。applyDamageBatch()側が「接触で揺らし済み」と判断できるよう、
  // 実際の振動開始（setTimeout）を待たない。
  G._contactShakeFired=true;
  if(BATTLE_SHAKE_CONTACT_DELAY_MS>0){
    const active=window.__activeBattleVfxPromises||(window.__activeBattleVfxPromises=new Set());
    let resolveDelay;
    const delayPromise=new Promise(resolve=>{ resolveDelay=resolve; });
    active.add(delayPromise);
    window.setTimeout(()=>{
      Promise.resolve(triggerBattleScreenShake({damage:predicted})).finally(()=>{
        resolveDelay();
        active.delete(delayPromise);
      });
    },BATTLE_SHAKE_CONTACT_DELAY_MS);
  }else{
    triggerBattleScreenShake({damage:predicted});
  }
}

// ── 味方の負傷トリガー効果一式（マナ獲得＋名前別の負傷効果）。発動したら true を返す ──
// 執念の炎：常時：このキャラクターの負傷効果は1回追加で発動する。
// 戻り値は「発動したか」ではなく「実際に発動した回数」。
// エティンのような「負傷効果が発動するたび」の効果は、執念の炎・激怒の指輪等で
// 発動回数が増えた分だけ繰り返す必要があるため、回数を呼び出し元へ返す。
// 敵側の負傷効果。味方側の負傷フックとは別経路で処理し、敵の効果だけを追加する。
async function _runCoreLiveInjuryEffects(unit, actualDmg, isEnemySide, source, dispatchToken){
  if(!unit||unit.hp<=0) return 0;
  // 負傷効果が追加ダメージを発生させる場合、その再帰経路から同じ対象の
  // 負傷効果が重ねて入らないようにする。別ヒットではfinally後に再度発動できる。
  if(unit._coreInjuryEffectsResolving) return 0;
  // 1回のダメージバッチを複数の互換フックが観測しても、同じ負傷イベントを
  // もう一度解決しない。別ヒットではバッチ番号が変わるため正常に発動する。
  if(dispatchToken!=null&&unit._lastInjuryEffectDispatch===dispatchToken) return 0;
  if(dispatchToken!=null) unit._lastInjuryEffectDispatch=dispatchToken;
  _recordBattleTrace('injury_dispatch_start',{unitId:unit.id,dispatchToken,actualDmg,isEnemySide});
  unit._coreInjuryEffectsResolving=true;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    deferManaThresholdEffects:true,
    _deferLichSummons:true,
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
    const localEvents=[];
  const emit=ev=>{ localEvents.push(ev); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  const applyHit=(source,target,amount,counter)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  };
  const side=isEnemySide?'p2':'p1';
  // 反復回数はコア（coreResolveHit内の負傷反復）と同じ式にする。旧式は
  //   ・敵側を一律1回に固定（isEnemySide?1:…）
  //   ・_ringCount()が陣営を問わずプレイヤーの指輪を数える
  // という2点でコアと食い違い、PvEとオンラインで負傷効果の回数がずれていた。
  // stateのringsはp1のみ実体を持つため、coreRingCountは敵側で0を返す＝
  // 「敵にプレイヤーの指輪を適用しない」旧PvEの意図もそのまま保たれる。
  const repeat=1+coreRingCount(state,side,'激怒の指輪')+coreEffectCount(unit,'執念の炎')
    +Math.max(0,Number(unit._effectRepeatBonus)||Number(unit.effectData&&unit.effectData.effectRepeatBonus)||0);
  let fired=0;
  const previousDeferMana=!!G._deferManaThresholdEffects;
  G._deferManaThresholdEffects=true;
  // 負傷効果のコア処理で生成された召喚は、負傷固有VFXの完了を待たずに
  // 盤面へ接続する。VFXを先にawaitすると、召喚体だけ内部状態と表示が
  // 分離し、次の攻撃まで姿が出ない共通遅延になる。
  const flushedSummonEvents=new Set();
  try{
    for(let i=0;i<repeat&&unit.hp>0;i++){
      const beforeMana=Number(state.resources[side].mana)||0;
      coreTriggerManaOnInjury(unit,state,emit);
      const injuryEventSeq=state._coreInjuryEventSeq=(Number(state._coreInjuryEventSeq)||0)+1;
      coreApplyInjuryEffects(unit,actualDmg,state,coreMathRng,emit,applyHit,source||null,`${injuryEventSeq}:${i}`);
      if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
      const summonEvents=localEvents.filter(ev=>ev&&ev.type==='summon'&&!flushedSummonEvents.has(ev));
      if(summonEvents.length){
        await _flushCorePveHitEvents(state,summonEvents,before);
        summonEvents.forEach(ev=>flushedSummonEvents.add(ev));
      }
      // C003（ゴーレム）／C007（コボルド）の共通負傷演出は、
      // 攻撃時のstat_changeではなく、実際に負傷効果を解決したここでだけ再生する。
      const injuryCode=_effectPresentationCode(unit);
      if((injuryCode==='C003'||injuryCode==='C007')&&typeof _playCardEffectSfx==='function'){
        _recordBattleTrace('injury_effect_vfx_start',{unitId:unit.id,code:injuryCode,
          side:isEnemySide?'p2':'p1',actualDmg:Number(actualDmg)||0});
        _playCardEffectSfx('C003');
        // 負傷VFXは攻撃モーションの接触処理を停止させない。演出自体は
        // playHitVfxAtRect側で保持され、モーションと並行して再生される。
        void _playCardEffectVfx('C003',[unit],{gateMs:0,waitForFinish:false});
        _recordBattleTrace('injury_effect_vfx_done',{unitId:unit.id,code:injuryCode});
      }
      if((Number(state.resources[side].mana)||0)!==beforeMana||coreEffectCount(unit,'治癒能力')||
        coreEffectCount(unit,'ゴーレム')||coreEffectCount(unit,'ギガンテス')||coreEffectCount(unit,'フォルモール')||
        coreEffectCount(unit,'ブラウニー')||coreEffectCount(unit,'エルフ')||coreEffectCount(unit,'コボルド')||
        coreEffectCount(unit,'インキュバス')||coreEffectCount(unit,'カオス・インプ')||coreEffectCount(unit,'逆上')||
        coreEffectCount(unit,'メデューサ')||coreEffectCount(unit,'ケットシー')||coreEffectCount(unit,'波の娘"ラン・ドーター"')||
        coreEffectCount(unit,'鉄の拳"フォルニョート"')||coreEffectCount(unit,'残響の魔導師"アバドン"')||
        coreEffectCount(unit,'夜刻の巫女"ウムブラ"')||coreEffectCount(unit,'ミノタウロス')||
        coreEffectCount(unit,'咬竜"グレイプニル"')) fired++;
    }
    _recordBattleTrace('mana_threshold_scan',{phase:'injury',unitId:unit.id,mana:Number(state.resources[side]?.mana)||0,side});
    coreApplyManaThresholdEffects(state,coreMathRng,emit,applyHit);
    if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
    _syncCoreResourcesToG(state);
    if(typeof renderManaHud==='function') renderManaHud();
  }finally{
    G._deferManaThresholdEffects=previousDeferMana;
    delete unit._coreInjuryEffectsResolving;
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  // コア生成物はsummonイベントの処理側で初めてGへ追加する。
  // ここで先行追加すると、後段が「既に存在する」と判定して描画を飛ばす。
  await _flushCorePveHitEvents(state,localEvents.filter(ev=>!flushedSummonEvents.has(ev)),before);
  _recordBattleTrace('injury_dispatch_end',{unitId:unit.id,dispatchToken,fired});
  return fired;
}

async function _fireAllyInjuryEffects(unit, actualDmg, source, dispatchToken){
  return _runCoreLiveInjuryEffects(unit,actualDmg,false,source,dispatchToken);
}
async function _fireEnemyInjuryEffects(unit, actualDmg, source, dispatchToken){
  return _runCoreLiveInjuryEffects(unit,actualDmg,true,source,dispatchToken);
}

// エティン：常時：味方の負傷効果が発動するたび、このキャラクターは+2/+1を得る。
// times＝負傷効果が発動した回数。執念の炎等で2回発動したなら2回分得る。
function _bumpEtinOnAllyInjuryEffect(times){
  const n=Math.max(0,Number(times)||0);
  if(!n) return;
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0) return;
    if(!/常時：味方の負傷効果が発動するたび、このキャラクターは\+2\/\+1を得る。/.test(String(u.desc||''))) return;
    let atkSum=0, hpSum=0;
    for(let i=0;i<n;i++){
      atkSum+=addUnitAtk(u,2);
      hpSum+=addUnitHp(u,1,'ally');
    }
    log(`${_lc(u.name,false)}の効果が${n}回発動した。+${atkSum}/+${hpSum}を得た。`,'good');
  });
}

async function applyDamageBatch(entries, options){
  const opt=options||{};
  const injuryDispatchToken=G._injuryDispatchSequence=(Number(G._injuryDispatchSequence)||0)+1;
  const prepared=(entries||[])
    .filter(e=>e&&e.unit&&e.unit.hp>0&&!_isSealed(e.unit)&&e.amount>0)
    .map(e=>{
      const side=e.side||_damageSideOf(e.unit);
      return {...e,side,rect:e.rect||_captureUnitDamageRect(e.unit,side)};
    })
    .filter(e=>e.side);
  if(!prepared.length) return [];

  // 分散・軽減・キーワード・状態変化の判定は共通コアへ一本化する。
  // deferTriggersで演出と死亡処理だけをPvE側へ残し、coreResolveHitが出した
  // 各対象のdamageイベントを従来のVFX／死亡パイプラインへ接続する。
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{if(u){touched.push([u,u.side,u.slot]);u.side=state.units.p1.includes(u)?'p1':'p2';u.slot=i;}});
  const beforeHp=new Map(prepared.map(e=>[e.unit,Number(e.unit.hp)||0]));
  const coreEvents=[];
  const emit=ev=>{coreEvents.push(ev);if(Array.isArray(G._battleCoreEvents))G._battleCoreEvents.push(ev);};
  const attackContactSources=new Map();
  if(opt.normalAttack){
    prepared.forEach(e=>{
      if(!e.source||e._counterDamage||attackContactSources.has(e.source)) return;
      attackContactSources.set(e.source,Object.prototype.hasOwnProperty.call(e.source,'_coreAttackContact')
        ?e.source._coreAttackContact:undefined);
      e.source._coreAttackContact=true;
    });
  }
  try{
    prepared.forEach(e=>coreResolveHit(state,e.source||opt.source,e.unit,e.amount,!!e._counterDamage,coreMathRng,emit,{deferTriggers:true,effect:!!opt.effect}));
    // deferTriggers はダメージ確定だけを遅延する契約。通常攻撃の命中キーワードは
    // PvE側で再実装せず、同じコア関数を一度だけ後段から呼ぶ。
    if(opt.normalAttack){
      coreEvents.filter(e=>e&&e.type==='damage'&&Number(e.amount)>0).forEach(e=>{
        const target=[...(state.units.p1||[]),...(state.units.p2||[])].find(u=>u&&String(u.id)===String(e.unitId));
        const source=e.sourceId!=null
          ?[...(state.units.p1||[]),...(state.units.p2||[])].find(u=>u&&String(u.id)===String(e.sourceId))
          :null;
        if(!target||!source) return;
        const beforeHp=Math.max(Number(target.hp)||0, Number(target.hp||0)+Number(e.amount||0));
        const keywordResult=coreApplyKeywordOnHit(source,target,Number(e.amount)||0,beforeHp,state,emit);
        if(keywordResult&&keywordResult.killed) emit({type:'death',side:target.side,unitId:target.id});
      });
    }
  }finally{
    touched.forEach(([u,side,slot])=>{if(side==null)delete u.side;else u.side=side;if(slot==null)delete u.slot;else u.slot=slot;});
  }
  const damageEvents=coreEvents.filter(ev=>ev&&ev.type==='damage');
  const preparedByUnit=new Map(); prepared.forEach(e=>{if(!preparedByUnit.has(e.unit))preparedByUnit.set(e.unit,e);});
  const results=damageEvents.map(ev=>{
    const unit=[...(G.allies||[]),...(G.enemies||[])].find(u=>u&&String(u.id)===String(ev.unitId));
    const base=preparedByUnit.get(unit)||prepared.find(e=>e.unit===unit)||{};
    const side=ev.side==='p1'?'ally':'enemy';
    const actualDmg=Math.max(0,Number(ev.amount)||0);
    const sourceById=ev.sourceId!=null
      ?[...(G.allies||[]),...(G.enemies||[])].find(u=>u&&String(u.id)===String(ev.sourceId))||null
      :null;
    const source=sourceById||base.source||opt.source||null;
    return {unit,side,actualDmg,died:!!(unit&&unit.hp<=0),blocked:actualDmg<=0,
      source,preHp:beforeHp.get(unit)||0,redirectedFrom:ev.redirectedFrom||null,
      needsAllyInjuryEffects:actualDmg>0&&side==='ally'&&unit&&unit.hp>0,
      needsEnemyInjuryEffects:actualDmg>0&&side==='enemy'&&unit&&unit.hp>0,
      rect:_captureUnitDamageRect(unit,side),attackSfxSource:base.attackSfxSource||opt.attackSfxSource||null,
      effectSource:opt.effect?source:null,keywordEffect:opt.keywordEffect||null,
      counterDamage:!!ev.counter};
  });
  // コアのマータ分散で肩代わりした対象にも、従来どおりC002の専用VFXを出す。
  prepared.forEach(original=>{
    if(!(Number(original.amount)>=2)||!original.unit) return;
    const side=original.side||_damageSideOf(original.unit);
    const mata=(side==='ally'?G.allies:G.enemies||[]).find(u=>u&&u!==original.unit&&u.hp>0&&
      (typeof coreHasEffect==='function'?coreHasEffect(u,'マータ'):_unitHasEffectName(u,'マータ')));
    if(!mata) return;
    const redirected=results.find(r=>r.unit===mata&&
      String(r.redirectedFrom||'')===String(original.unit.id))||results.find(r=>r.unit===mata);
    if(redirected){ redirected.effectVfxCode='C002'; redirected.effectVfxTarget=mata; }
  });
  results.forEach(r=>{
    if(!r.unit||r.actualDmg<=0) return;
    if(typeof _recordRunStatsDamage==='function') _recordRunStatsDamage(r.actualDmg,r.source&&r.source._damageType||'');
    r.unit._lastDamageWasCounter=!!r.counterDamage;
  });
  coreEvents.filter(ev=>ev&&ev.type==='shield_lost').forEach(ev=>{
    const unit=[...(G.allies||[]),...(G.enemies||[])].find(u=>u&&String(u.id)===String(ev.unitId));
    if(unit){
      const isEnemySide=ev.side==='p2';
      log(`${_lc(unit.name,isEnemySide)}の結界がダメージを防いだ。`,'sys');
      if(typeof playSfx==='function') playSfx('shield',{group:'combat'});
      if(isEnemySide) onEnemyShieldLost(unit); else onAllyShieldLost(unit);
    }
  });
  if(typeof coreApplyLuckyRing==='function'){
    results.forEach(r=>coreApplyLuckyRing(r.unit,r.actualDmg,state,emit));
    _syncCoreResourcesToG(state);
  }

  // コアのサキュバス判定は「通常攻撃の接触で倒した敵」だけを捕獲対象にする。
  // PvEでは通常攻撃のダメージ適用がこの関数へ入るため、コアのrunBattleCoreが
  // 立てる接触印をここでも同じタイミングで立てる。反撃・効果ダメージには印を
  // 付けず、反撃で誤って仲間化する回帰を防ぐ。死亡効果の解決が終わるまで印を
  // 保持し、終了時に元の状態へ戻す。
  _recordBattleTrace('damage_apply_start',{token:injuryDispatchToken,entries:prepared.map(e=>({
    unitId:e.unit&&e.unit.id||null,sourceId:e.source&&e.source.id||null,amount:Number(e.amount)||0,
    counter:!!e._counterDamage,effect:!!e.effect
  }))});

  if(opt.keywordEffect==='毒'&&typeof _recordRunStatsDamage==='function'){
    results.forEach(r=>_recordRunStatsDamage(r.actualDmg,'毒'));
  }
  // PvEの通常攻撃もオンラインと同じ判定イベント列へ記録する。演出の実行は従来経路を使う。
  if(opt.normalAttack&&Array.isArray(G._battleCoreEvents)){
    results.forEach(r=>{
      if(r.unit&&r.unit.hp<=0) G._battleCoreEvents.push({type:'death',side:r.side==='ally'?'p1':'p2',unitId:r.unit.id});
    });
  }

  // 通常攻撃の各ダメージ単位ごとに、軽減後の実ダメージで判定する。
  // バッチ内に50以上が1件でもあれば1回だけ揺らす（多段攻撃の合計では判定しない）。
  if(opt.normalAttack){
    // 各ヒットを個別に判定し、合計値ではなく最大の最終ダメージを揺れ強度へ反映する。
    const shakeDamage=results.reduce((max,r)=>{
      if(r.counterDamage) return max;
      const damage=Number(r.actualDmg)||0;
      return damage>=50?Math.max(max,damage):max;
    },0);
    // 通常攻撃は接触時（_shakeOnAttackContact）に既に揺らしているため、ここでは揺らさない。
    // 接触モーションを伴わない経路（効果ダメージ等）だけがここで揺れる。
    if(G._contactShakeFired) G._contactShakeFired=false;
    else if(shakeDamage>=50) triggerBattleScreenShake({damage:shakeDamage});
  }
  // 振動を先に開始し、重いステータス再描画による体感遅延を避ける。
  // ダメージ値は確定済みなので、表示更新は直後に行う。
  if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // 生命吸収はバッチ内の全ダメージ（反撃等、攻撃者自身が受ける分も含む）が確定した後に処理する。
  // 攻撃者がこのバッチの中で同時に死亡していた場合は回復しない。
  results.forEach(r=>{
    if(!r.lifeDrain) return;
    const {source,healAmt}=r.lifeDrain;
    if(!source||source.hp<=0) return;
    const _isPlayerAllySrc=(G.allies||[]).includes(source);
    addUnitHp(source,healAmt,_isPlayerAllySrc?'ally':'enemy');
    log(`${_lc(source.name,!_isPlayerAllySrc)}の生命吸収：HP+${healAmt}`,_isPlayerAllySrc?'good':'bad');
  });

  const damaged=results.filter(r=>r.actualDmg>0);
  damaged.forEach(r=>{ if(r.attackSfxSource) playAttackDamageSfx(r.attackSfxSource,r.actualDmg); });
  // 同じキャラクターが1バッチ内で複数回ダメージを受けると（攻撃＋効果ダメージ等）、
  // ダメージ数値が同じ位置に重なって読めなくなる。表示自体は従来どおり投げっぱなしの
  // まま、対象ごとに「前の数値が消えてから次を出す」順番待ちだけを入れる。
  // 対象が違う場合は待たないので、複数キャラへの同時ダメージは同時に表示される。
  // 同じ対象へ2件目以降の数値が入った＝表示が重なるキャラクター。
  // 負傷効果を待たせるのはこの場合だけでよい。
  const damageOverlapUnits=new Set();
  damaged.forEach((r,i)=>{
    const key=r.unit&&r.unit.id!=null?`u:${r.unit.id}`:`i:${i}`;
    const show=(useLiveSlot)=>{
      try{
        // 数値の重なり防止は対象IDで判定する。矩形（座標）で判定すると、
        // 盤面が詰め直された直後に別位置扱いになり、通常攻撃・反撃・効果ダメージが
        // 同じキャラクターの上で重なって出る。
        const vfxOptions={...(opt.vfxOptions||{}),
          effectSource:(r.effectSource&&_characterVfxAllowedForDamage(r.effectSource))?r.effectSource:null,
          keywordEffect:r.keywordEffect,
          ...(r.unit&&r.unit.id!=null?{labelKey:`u:${r.unit.id}`}:{})};
        // 順番待ちで遅らせた分は保存済み矩形が古くなっている可能性があるため、
        // 現在のDOMスロットから引き直す（取れなければ保存済み矩形へ戻す）。
        if(useLiveSlot&&typeof playHitVfx==='function'&&r.unit){
          return Promise.resolve(playHitVfx(r.side,r.unit,r.actualDmg,vfxOptions)).catch(()=>{});
        }
        if(r.rect&&typeof playHitVfxAtRect==='function'){
          return Promise.resolve(playHitVfxAtRect(r.rect,r.actualDmg,vfxOptions)).catch(()=>{});
        }
        if(typeof playHitVfx==='function'){
          return Promise.resolve(playHitVfx(r.side,r.unit,r.actualDmg,vfxOptions)).catch(()=>{});
        }
      }catch(e){
        console.error('[applyDamageBatch VFX]',e);
      }
      return Promise.resolve();
    };
    // 表示枠を1つ予約する。待ち時刻は present.js が呼び出しをまたいで共有するため、
    // 同じキャラクターへ別経路から同時にダメージが入っても数値は重ならない。
    // 待ちは前の数値が消えるまでではなく、読める最小限だけ（既定150ms）。
    // 効果ダメージが大量に出ても「-1 -1 -1」と連続表示になる。
    const wait=damageLabelGate?Math.max(0,damageLabelGate.reserve(key)):0;
    if(wait<=0){ show(false); return; }
    if(r.unit) damageOverlapUnits.add(r.unit);
    void sleep(wait).then(()=>show(true)).catch(()=>{});
  });
  damaged.filter(r=>r.effectVfxCode).forEach(r=>{
    // マータの分散VFXは分割時に保存した矩形ではなく、ダメージ表示直前の
    // 肩代わり先実DOMから再取得する。人数変化・FLIP中に古い矩形を使うと、
    // VFXだけ元の被弾キャラへ表示される。
    const target=r.effectVfxTarget||r.unit;
    const side=target&&((G.enemies||[]).includes(target)?'enemy':'ally');
    const rect=target&&typeof _captureUnitDamageRect==='function'
      ?_captureUnitDamageRect(target,side):r.effectVfxRect;
    if(!rect||typeof playHitVfxAtRect!=='function') return;
    void Promise.resolve(playHitVfxAtRect(rect,0,{
      effectSource:_effectVfxSource(r.effectVfxCode),gateMs:180,hitDuration:900,vfxScale:.5
    })).catch(()=>{});
  });
  if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // 負傷効果は「そのダメージ表示が出てから少し間を置いて」発動させる。
  // 表示開始と同時に走らせると、ダメージ数値より先に負傷効果が動いて見え、
  // 原因（被弾）と結果（負傷効果）の順序が逆に見える。
  // 特にミノタウロスの「直ちに攻撃する」は、被弾表示より先に攻撃し始めて見えていた。
  const injuredAllies=[];
  const injuredAllyUnits=new Set();
  results.forEach(r=>{
    if(!r.needsAllyInjuryEffects||!r.unit||r.unit.hp<=0||injuredAllyUnits.has(r.unit)) return;
    injuredAllyUnits.add(r.unit);
    injuredAllies.push(r);
  });
  const injuredEnemies=[];
  const injuredEnemyUnits=new Set();
  results.forEach(r=>{
    if(!r.needsEnemyInjuryEffects||!r.unit||r.unit.hp<=0||injuredEnemyUnits.has(r.unit)) return;
    injuredEnemyUnits.add(r.unit);
    injuredEnemies.push(r);
  });
  // 味方・敵それぞれで待つと2回ぶん間延びするため、発動前に1回だけ待つ。
  // ただし待つのは「同じキャラクターへ数値が重なって出る」場合だけにする。
  // 1発だけのダメージでも毎回待つと、命中してから戻るまでが常に一拍長くなり、
  // 攻撃が当たるたびに止まって見える。
  const _needsInjuryBeat=[...injuredAllies,...injuredEnemies].some(r=>r&&damageOverlapUnits.has(r.unit));
  if(_needsInjuryBeat) await sleep(INJURY_EFFECT_DELAY_MS);
  for(const r of injuredAllies) await _fireAllyInjuryEffects(r.unit,r.actualDmg,r.source,injuryDispatchToken);
  if(injuredAllies.length&&typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
  for(const r of injuredEnemies) await _fireEnemyInjuryEffects(r.unit,r.actualDmg,r.source,injuryDispatchToken);
  if(injuredEnemies.length&&typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // VFX終了後に死亡処理を行う。HP0のカード自体はここではまだ盤面から消さない
  // （消去・詰め直しはrequestBattleCompact()経由で、モーション全体が終わってから一度だけ行う）
  const deaths=results.filter(r=>r.unit&&r.unit.hp<=0&&!r.unit._fled);
  if(deaths.length){
    _beginDeathCompactDelay();
    G._resolvingDamageBatchDeaths=(G._resolvingDamageBatchDeaths||0)+1;
    try{
      // 死亡効果の論理解決は従来どおり発生順に行うが、死亡演出の開始は
      // 同時死亡者全員で同じ時点にする。先に1体の死亡効果をawaitすると、
      // 攻撃側の死亡VFXだけが後ろへずれ、同時撃破に見えなくなる。
      deaths.forEach(r=>{
        if(typeof playUnitDeathBurn!=='function') return;
        _playDeathBurnOnce(r.unit,r.side==='enemy');
      });
      for(const r of deaths){
        if(r.side==='enemy') await processEnemyDeath(r.unit,G.enemies.indexOf(r.unit));
        else await processAllyDeath(r.unit);
      }
    } finally {
      G._resolvingDamageBatchDeaths=Math.max(0,(G._resolvingDamageBatchDeaths||0)-1);
      _endDeathCompactDelay();
    }
  }

  attackContactSources.forEach((previous,source)=>{
    if(previous===undefined) delete source._coreAttackContact;
    else source._coreAttackContact=previous;
  });
  return results;
}

async function _consumeAttackEffectPause(unit,isEnemySide,target){
  if(!unit||!unit._attackEffectPending||unit.hp<=0) return;
  // 接触コールバックと攻撃演出のフォールバックが同一フレームに重なった場合、
  // pending フラグの再設定で攻撃効果が二重に入ることがある。追加発動（闇の儀式等）は
  // この関数が完了してから次の呼び出しへ進むため、実行中だけ再入を拒否する。
  if(unit._attackEffectDispatching) return;
  unit._attackEffectDispatching=true;
  unit._attackEffectPending=false;
  unit._currentAttackTarget=target||null;
  unit._attackTargetWasWounded=!!(target&&target.hp>0&&target.hp<target.maxHp);
  _applyGremlinAttackSwap(unit,target,isEnemySide);
  try{
    if(unit._scrollSilencedUntilAttack||unit._silenced){
      delete unit._scrollSilencedUntilAttack;
      delete unit._silenced;
      return;
    }
    // コアと同じ順序：攻撃観測を攻撃効果より先に解決する。
    await _runCoreLiveAttackObservers(unit,isEnemySide);
    unit._attackObserverFired=true;
    const skipAttack=await _applyAttackEffectsForSide(unit,isEnemySide);
    if(skipAttack) unit._skipCurrentAttack=true;
    await _flushRingManaThresholdEffects();
  }finally{
    delete unit._attackEffectDispatching;
    delete unit._currentAttackTarget;
    delete unit._attackTargetWasWounded;
  }
}

async function _resolveAttackEffectsAtImpact(attacker,isEnemySide,target,result){
  await _consumeAttackEffectPause(attacker,isEnemySide,target);
  if(attacker&&attacker._skipCurrentAttack){
    delete attacker._skipCurrentAttack;
    // 「代わりに攻撃させる」等で本体の攻撃が省かれる場合でも、モーションは
    // 途中で引き返さず最後まで見せる。25%地点から戻ると、召喚体の攻撃だけが
    // 起きて本体は動かないように見える。damage/反撃は skipAttack で抑止する。
    result.skipAttack=true;
    return null;
  }
  result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
  result.targetDiedBeforeContact=!target||target.hp<=0;
  return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
}

function _isArassusPreDamageAttack(unit){
  if(!unit||!unit._attackEffectPending) return false;
  const text=typeof coreUnitTriggerText==='function'
    ? coreUnitTriggerText(unit,'攻撃') : String(unit.desc||unit.effectText||unit.effect||'');
  // アラッサス/サイレン/ケンタウロス/ボーンチャリオットは通常攻撃の接触前に攻撃時効果を解決する。
  // 効果で本来の攻撃対象が倒れた場合は通常攻撃と反撃を中断する。
  if(['アラッサス','サイレン'].includes(unit.name)){
    return /全ての(敵|キャラクター)に1ダメージ/.test(text);
  }
  if(unit.name==='ケンタウロス'){
    return /ランダムな敵にXダメージ/.test(text);
  }
  if(unit.name==='グレムリン') return true;
  return false;
}

async function _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage,onContact){
  // 前の攻撃で接触揺れフラグが消費されずに残ると、次の揺れが抑制されてしまうため毎回落とす。
  G._contactShakeFired=false;
  const result={
    contacted:false,
    targetDiedBeforeContact:false,
    attackerDiedBeforeContact:false,
    actualTarget:target
  };
  if(!attacker||attacker.hp<=0){
    result.attackerDiedBeforeContact=true;
    return result;
  }
  if(!target||target.hp<=0){
    result.targetDiedBeforeContact=true;
    return result;
  }
  if(damage>0&&typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:`combat:attack-start:${uid()}`,guardMs:0});
  if(isEnemySide){
    let actualTarget=target;
    let actualIdx=targetIdx;
    if(damage>0){
      actualTarget=_redirectToBodyguard(G.allies,target,'good');
      actualIdx=G.allies.indexOf(actualTarget);
    }
    result.actualTarget=actualTarget;
    if(damage>0&&_isArassusPreDamageAttack(attacker)&&typeof playArassusAttackMotion==='function'){
      await playArassusAttackMotion(attacker,actualTarget,true,async()=>{
        await _consumeAttackEffectPause(attacker,true,actualTarget);
        result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
        result.targetDiedBeforeContact=!actualTarget||actualTarget.hp<=0;
        return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
      });
      if(result.attackerDiedBeforeContact||result.targetDiedBeforeContact) return result;
    } else if(damage>0&&typeof playAttackMotion==='function'){
      const onImpact=attacker._attackEffectPending
        ?()=>_resolveAttackEffectsAtImpact(attacker,true,actualTarget,result)
        :null;
      await playAttackMotion(attacker,actualTarget,true,onImpact,{...PRESENT_ATTACK_MOTION,
        onHit:()=>_shakeOnAttackContact(actualTarget,damage),
        onContact:async()=>{ if(typeof onContact==='function') await onContact(result); }});
    } else {
      await _consumeAttackEffectPause(attacker,true,actualTarget);
    }
    // 攻撃効果中に召喚・詰め直しが走ると配列要素が置き換わるため、接触直前に
    // IDで現在の戦闘オブジェクトへ再結合する。演出対象とダメージ対象を同一IDに揃える。
    attacker=_battleUnitById(G.enemies,attacker)||attacker;
    actualTarget=_battleUnitById(G.allies,actualTarget)||actualTarget;
    result.actualTarget=actualTarget;
    if(!attacker||attacker.hp<=0){
      result.attackerDiedBeforeContact=true;
      return result;
    }
    if(!actualTarget||actualTarget.hp<=0){
      result.targetDiedBeforeContact=true;
      return result;
    }
    // ダメージの実適用はここでは行わない。反撃と同じ接触として_dealAttackDamageWithMutual側で
    // まとめてapplyDamageBatch()に渡すことで、防御側の死亡確定より前に反撃の可否を確定できるようにする。
    result.contacted=damage>0&&!result.skipAttack;
    return result;
  }
  result.actualTarget=target;
  if(damage>0&&_isArassusPreDamageAttack(attacker)&&typeof playArassusAttackMotion==='function'){
    await playArassusAttackMotion(attacker,target,false,async()=>{
      await _consumeAttackEffectPause(attacker,false,target);
      result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
      result.targetDiedBeforeContact=!target||target.hp<=0;
      return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
    });
    if(result.attackerDiedBeforeContact||result.targetDiedBeforeContact) return result;
  } else if(damage>0&&typeof playAttackMotion==='function'){
    const onImpact=attacker._attackEffectPending
      ?()=>_resolveAttackEffectsAtImpact(attacker,false,target,result)
      :null;
    await playAttackMotion(attacker,target,false,onImpact,{...PRESENT_ATTACK_MOTION,
      onHit:()=>_shakeOnAttackContact(target,damage),
      onContact:async()=>{ if(typeof onContact==='function') await onContact(result); }});
  } else {
    await _consumeAttackEffectPause(attacker,false,target);
  }
  // 味方側も攻撃効果による召喚・変身後に、IDで最新の参照へ戻す。
  attacker=_battleUnitById(G.allies,attacker)||attacker;
  target=_battleUnitById(G.enemies,target)||target;
  result.actualTarget=target;
  if(!attacker||attacker.hp<=0){
    result.attackerDiedBeforeContact=true;
    return result;
  }
  if(!target||target.hp<=0||!G.enemies.includes(target)){
    result.targetDiedBeforeContact=true;
    return result;
  }
  // ダメージの実適用はここでは行わない。反撃と同じ接触として_dealAttackDamageWithMutual側で
  // まとめてapplyDamageBatch()に渡すことで、防御側の死亡確定より前に反撃の可否を確定できるようにする。
  result.contacted=damage>0&&!result.skipAttack;
  return result;
}
// ラミア：攻撃：対象のキャラクターの攻撃力がこのキャラクターより低い場合、そのキャラクターを仲間にする。
// ラミアで一時的に仲間にしたキャラクターを、報酬フェイズ突入時・敗北時に取り除く
function _removeLamiaCapturedUnits(){
  if(!Array.isArray(G.allies)) return;
  G.allies.splice(0,G.allies.length,...G.allies.map(a=>a&&a._lamiaCaptured?null:a));
}


async function _dealAttackDamageWithMutual(attacker,isEnemySide,target,targetIdx,damage){
  attacker=_battleUnitById(isEnemySide?G.enemies:G.allies,attacker)||attacker;
  target=_battleUnitById(isEnemySide?G.allies:G.enemies,target)||target;
  if(!attacker||!target) return null;
  // 接触攻撃＋反撃を含む一連の演出が完全に終わるまで、盤面詰め直し・renderAll()を遅延させる
  beginBattleMotion();
  try{
    if(attacker.hp<=0) return null;
    const applyContactDamage=async attackResult=>{
      if(!attackResult||attackResult.attackerDiedBeforeContact||attackResult.targetDiedBeforeContact) return;
      // 攻撃を召喚体へ肩代わりさせた場合（スケルトンキング等）は、本体の攻撃も
      // それに対する反撃も起こさない。コアは skipAttack で同じ判断をしており、
      // ここで見ていないとPvEだけ本体が殴り、反撃ダメージまで受けていた。
      if(attackResult.skipAttack) return;
      let liveAttacker=_battleUnitById(isEnemySide?G.enemies:G.allies,attacker)||attacker;
      const defender=_battleUnitById(isEnemySide?G.allies:G.enemies,attackResult.actualTarget||target)||(attackResult.actualTarget||target);
      if(!liveAttacker||liveAttacker.hp<=0||!defender||defender.hp<=0) return;
      const attackerHasFirstStrike=_unitHasKeyword(liveAttacker,'先制')&&!_unitHasKeyword(defender,'先制');
      const suppressCounterBySniper=_unitHasKeyword(liveAttacker,'狙撃')||_unitHasKeyword(defender,'狙撃');
      const counterAmount=typeof coreCounterDamage==='function'
        ?coreCounterDamage(liveAttacker,defender):Math.max(0,defender.atk||0);
      const defenderSide=isEnemySide?'ally':'enemy';
      const attackerSide=isEnemySide?'enemy':'ally';
      const entries=[{unit:defender,side:defenderSide,amount:damage,source:liveAttacker,attackSfxSource:liveAttacker}];
      if(!suppressCounterBySniper&&counterAmount>0){
        entries.push({unit:liveAttacker,side:attackerSide,amount:counterAmount,source:defender,
          attackSfxSource:defender,_counterDamage:true});
      }
      if(attackerHasFirstStrike&&!suppressCounterBySniper){
        await applyDamageBatch([entries[0]],{normalAttack:true});
        if(defender.hp>0&&liveAttacker.hp>0&&counterAmount>0) await applyDamageBatch([entries[1]],{normalAttack:true});
      }else await applyDamageBatch(entries,{normalAttack:true});
      attackResult.damageAppliedAtContact=true;
      attackResult.actualTarget=defender;
      if(!suppressCounterBySniper&&counterAmount>0){
        const defenderList=isEnemySide?G.allies:G.enemies;
        const attackerList=isEnemySide?G.enemies:G.allies;
        log(`${_lc(_battleLogName(defender,defenderList),!isEnemySide)}が${_lc(_battleLogName(liveAttacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
      }
    };
    const attackResult=await _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage,applyContactDamage);
    if(attackResult?.damageAppliedAtContact) return attackResult;
    const defender=attackResult?.actualTarget||target;
    if(!attackResult?.contacted||attacker.hp<=0||!defender||defender.hp<=0){
      return attackResult;
    }
    if(!attacker._attackObserverFired) await _runCoreLiveAttackObservers(attacker,isEnemySide);
    delete attacker._attackObserverFired;
    // 攻撃・反撃を「同じ接触で同時に成立する相互ダメージ」として扱う。反撃の可否・値は
    // ダメージ適用前（接触直前）の状態でスナップショットし、攻撃で倒れたことを理由に反撃を
    // 取り消さない。先制は攻撃側が相手を仕留めた場合のみ反撃を免除する（相手も先制を持つ場合は無効）。
    // 狙撃は反撃されず、反撃もできない。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制')&&!_unitHasKeyword(defender,'先制');
    const suppressCounterBySniper=_unitHasKeyword(attacker,'狙撃')||_unitHasKeyword(defender,'狙撃');
    const counterAmount=typeof coreCounterDamage==='function'
      ?coreCounterDamage(attacker,defender):Math.max(0,defender.atk||0);
    const defenderSide=isEnemySide?'ally':'enemy';
    const attackerSide=isEnemySide?'enemy':'ally';
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push({
      type:'attack', side:isEnemySide?'p2':'p1', attackerId:attacker.id, targetId:defender.id,
      damage:Math.max(0,Number(damage)||0), counterDamage:counterAmount
    });
    // 先制だけは実ダメージを先に確定し、結界・強靭等を通した後も生存していた時だけ反撃させる。
    // これにより先制攻撃で倒した敵から同時ダメージを受けない。
    if(attackerHasFirstStrike&&!suppressCounterBySniper){
      await applyDamageBatch([{unit:defender,side:defenderSide,amount:damage,source:attacker,attackSfxSource:attacker}],{normalAttack:true});
      if(defender.hp>0&&attacker.hp>0&&counterAmount>0){
        await applyDamageBatch([{unit:attacker,side:attackerSide,amount:counterAmount,source:defender,attackSfxSource:defender,_counterDamage:true}],{normalAttack:true});
        const defenderList=isEnemySide?G.allies:G.enemies;
        const attackerList=isEnemySide?G.enemies:G.allies;
        log(`${_lc(_battleLogName(defender,defenderList),!isEnemySide)}が${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
      }
      return attackResult;
    }
    const suppressCounter=suppressCounterBySniper;
    const entries=[{unit:defender,side:defenderSide,amount:damage,source:attacker,attackSfxSource:attacker}];
    if(!suppressCounter&&counterAmount>0){
      entries.push({unit:attacker,side:attackerSide,amount:counterAmount,source:defender,attackSfxSource:defender,_counterDamage:true});
    }
    await applyDamageBatch(entries,{normalAttack:true});
    if(!suppressCounter&&counterAmount>0){
      const defenderList=isEnemySide?G.allies:G.enemies;
      const attackerList=isEnemySide?G.enemies:G.allies;
      log(`${_lc(_battleLogName(defender,defenderList),!isEnemySide)}が${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
    }
    return attackResult;
  } finally {
    endBattleMotion();
  }
}

function _battleUnitById(list, unit){
  if(!unit||!Array.isArray(list)) return null;
  return list.find(x=>x&&x.id===unit.id)||null;
}

async function _dealMultiAttackDamageWithMutual(attacker,isEnemySide,primaryTarget,targets,damage){
  attacker=_battleUnitById(isEnemySide?G.enemies:G.allies,attacker)||attacker;
  primaryTarget=_battleUnitById(isEnemySide?G.allies:G.enemies,primaryTarget)||primaryTarget;
  if(!attacker||attacker.hp<=0||!primaryTarget||primaryTarget.hp<=0) return null;
  // 接触攻撃＋反撃を含む一連の演出が完全に終わるまで、盤面詰め直し・renderAll()を遅延させる
  beginBattleMotion();
  try{
    if(attacker.hp<=0) return null;
    if(damage>0&&typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:`combat:attack-start:${uid()}`,guardMs:0});
    const result={contacted:false,targetDiedBeforeContact:false,attackerDiedBeforeContact:false,actualTarget:primaryTarget};
    let damageAppliedAtContact=false;
    const applyMultiContactDamage=async()=>{
      if(!attacker||attacker.hp<=0||!primaryTarget||primaryTarget.hp<=0) return;
      if(!attacker._attackObserverFired) await _runCoreLiveAttackObservers(attacker,isEnemySide);
      delete attacker._attackObserverFired;
      const seen=new Set();
      const side=isEnemySide?'ally':'enemy';
      const liveTargets=(targets||[])
        .map(t=>_battleUnitById(isEnemySide?G.allies:G.enemies,t)||t)
        .filter(t=>t&&t.hp>0&&!seen.has(t.id)&&!t._isObject&&!t._isSoul)
        .map(t=>{seen.add(t.id);return t;});
      const primary=_battleUnitById(isEnemySide?G.allies:G.enemies,primaryTarget)||primaryTarget;
      const entries=liveTargets.map(t=>({unit:t,side,amount:damage,source:attacker,attackSfxSource:attacker}));
      if(!entries.length) return;
      result.contacted=damage>0&&!result.skipAttack;
      const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制')&&!_unitHasKeyword(primary,'先制');
      const suppressBySniper=_unitHasKeyword(attacker,'狙撃')||_unitHasKeyword(primary,'狙撃');
      const counterAmount=liveTargets.includes(primary)&&!suppressBySniper
        ?(typeof coreCounterDamage==='function'?coreCounterDamage(attacker,primary):Math.max(0,primary.atk||0)):0;
      if(Array.isArray(G._battleCoreEvents)) liveTargets.forEach(victim=>G._battleCoreEvents.push({
        type:'attack',side:isEnemySide?'p2':'p1',attackerId:attacker.id,targetId:victim.id,
        damage:Math.max(0,Number(damage)||0),counterDamage:victim===primary?counterAmount:0
      }));
      if(attackerHasFirstStrike&&!suppressBySniper){
        await applyDamageBatch([entries.find(e=>e.unit===primary)||entries[0]],{normalAttack:true});
        if(primary.hp>0&&attacker.hp>0&&counterAmount>0) await applyDamageBatch([{unit:attacker,side:isEnemySide?'enemy':'ally',amount:counterAmount,source:primary,attackSfxSource:primary,_counterDamage:true}],{normalAttack:true});
      }else{
        if(counterAmount>0) entries.push({unit:attacker,side:isEnemySide?'enemy':'ally',amount:counterAmount,source:primary,attackSfxSource:primary,_counterDamage:true});
        await applyDamageBatch(entries,{normalAttack:true});
      }
      damageAppliedAtContact=true;
      result.actualTarget=primary;
      if(counterAmount>0) log(`反撃で${_lc(_battleLogName(attacker,isEnemySide?G.enemies:G.allies),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
    };
    if(damage>0&&_isArassusPreDamageAttack(attacker)&&typeof playArassusAttackMotion==='function'){
      await playArassusAttackMotion(attacker,primaryTarget,isEnemySide,async()=>{
        await _consumeAttackEffectPause(attacker,isEnemySide,primaryTarget);
        result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
        result.targetDiedBeforeContact=!primaryTarget||primaryTarget.hp<=0;
        return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
      });
      if(result.attackerDiedBeforeContact||result.targetDiedBeforeContact) return result;
    } else if(damage>0&&typeof playAttackMotion==='function'){
      const onImpact=attacker._attackEffectPending
        ?()=>_resolveAttackEffectsAtImpact(attacker,isEnemySide,primaryTarget,result)
        :null;
      await playAttackMotion(attacker,primaryTarget,isEnemySide,onImpact,{...PRESENT_ATTACK_MOTION,
        onContact:applyMultiContactDamage});
    } else {
      await _consumeAttackEffectPause(attacker,isEnemySide,primaryTarget);
    }
    if(!attacker||attacker.hp<=0){
      result.attackerDiedBeforeContact=true;
      return result;
    }
    if(!primaryTarget||primaryTarget.hp<=0){
      result.targetDiedBeforeContact=true;
      return result;
    }
    if(damageAppliedAtContact) return result;

    // 接触直前（ダメージ適用前）に生存していた対象のみ攻撃対象とする
    const seen=new Set();
    const side=isEnemySide?'ally':'enemy';
    const liveTargets=(targets||[])
      .filter(t=>t&&t.hp>0&&!seen.has(t.id)&&!t._isObject&&!t._isSoul)
      .map(t=>{ seen.add(t.id); return t; });
    const entries=liveTargets.map(t=>({unit:t,side,amount:damage,source:attacker,attackSfxSource:attacker}));
    result.contacted=damage>0&&entries.length>0;
    if(result.contacted && !attacker._attackObserverFired) await _runCoreLiveAttackObservers(attacker,isEnemySide);
    delete attacker._attackObserverFired;

    // 反撃は本来の攻撃対象（primaryTarget）からのみ発生する。全体攻撃／三方向攻撃で追加ダメージを
    // 受けた他のキャラクターは反撃しない。反撃可否・値はダメージ適用前にスナップショットし、
    // このヒットで倒れたことを理由に反撃を取り消さない。先制は攻撃側が相手を仕留めた場合のみ反撃を免除する
    // （相手も先制を持つ場合は無効）。狙撃は反撃されず、反撃もできない。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制')&&!_unitHasKeyword(primaryTarget,'先制');
    const suppressBySniper=_unitHasKeyword(attacker,'狙撃')||_unitHasKeyword(primaryTarget,'狙撃');
    const counterAmount=liveTargets.includes(primaryTarget)&&!suppressBySniper
      ?(typeof coreCounterDamage==='function'?coreCounterDamage(attacker,primaryTarget):Math.max(0,primaryTarget.atk||0)):0;
    if(Array.isArray(G._battleCoreEvents)) liveTargets.forEach(victim=>G._battleCoreEvents.push({
      type:'attack', side:isEnemySide?'p2':'p1', attackerId:attacker.id, targetId:victim.id,
      damage:Math.max(0,Number(damage)||0), counterDamage:victim===primaryTarget?counterAmount:0
    }));
    // 複数対象攻撃でも先制時は主対象への実ダメージ確定後にだけ反撃可否を判断する。
    if(attackerHasFirstStrike&&!suppressBySniper){
      await applyDamageBatch(entries,{normalAttack:true});
      if(counterAmount>0){
        const attackerSide=isEnemySide?'enemy':'ally';
        await applyDamageBatch([{unit:attacker,side:attackerSide,amount:counterAmount,source:primaryTarget,attackSfxSource:primaryTarget,_counterDamage:true}],{normalAttack:true});
        const attackerList=isEnemySide?G.enemies:G.allies;
        log(`反撃で${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
      }
      return result;
    }
    const primaryCanCounter=liveTargets.includes(primaryTarget)&&!suppressBySniper;
    const normalCounterAmount=primaryCanCounter
      ?(typeof coreCounterDamage==='function'?coreCounterDamage(attacker,primaryTarget):Math.max(0,primaryTarget.atk||0)):0;
    const attackerSide=isEnemySide?'enemy':'ally';
    if(normalCounterAmount>0){
      entries.push({unit:attacker,side:attackerSide,amount:normalCounterAmount,source:primaryTarget,attackSfxSource:primaryTarget,_counterDamage:true});
    }
    await applyDamageBatch(entries,{normalAttack:true});
    if(normalCounterAmount>0){
      const attackerList=isEnemySide?G.enemies:G.allies;
      log(`反撃で${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${normalCounterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
    }
    return result;
  } finally {
    endBattleMotion();
  }
}

// 毒のターン処理はコアでダメージ量と死亡判定を決め、PvE側は演出と死亡後処理だけを接続する。
async function _applyPoisonBeforeAttack(unit){
  if(!unit||unit.hp<=0||_isSealed(unit)||!(unit.poison>0)||typeof coreApplyPoisonBeforeTurn!=='function') return;
  const isEnemySide=(G.enemies||[]).includes(unit);
  const side=isEnemySide?'p2':'p1';
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  const oldSide=unit.side, oldSlot=unit.slot;
  unit.side=side; unit.slot=(side==='p1'?G.allies:G.enemies).indexOf(unit);
  const events=[];
  const emit=ev=>{ events.push(ev); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  const beforeHp=unit.hp;
  let result;
  try{ result=coreApplyPoisonBeforeTurn(unit,emit); }
  finally{
    if(oldSide==null) delete unit.side; else unit.side=oldSide;
    if(oldSlot==null) delete unit.slot; else unit.slot=oldSlot;
  }
  _syncCoreLifeToG(state);
  if(!result||result.amount<=0) return;
  log(`${_lc(unit.name,isEnemySide)}が毒で${result.amount}ダメージを受けた。`,isEnemySide?'bad':'good');
  if(typeof playSfx==='function') playSfx('poison',{group:'combat'});
  // 毒は通常ダメージのVFXではなくK007を確実に選び、表示開始を待ってから
  // 死亡処理・次の攻撃へ進める。ここをfire-and-forgetにすると、直後の
  // renderAll()/死亡処理でVFXが消え、通常ダメージだけに見える。
  if(typeof playHitVfx==='function') await playHitVfx(isEnemySide?'enemy':'ally',unit,result.amount,{keywordEffect:'毒'});
  if(unit.hp<=0){
    unit._preDeathSnapshot=_battleUnitSnapshot(unit,beforeHp);
    if(isEnemySide) await processEnemyDeath(unit,G.enemies.indexOf(unit));
    else await processAllyDeath(unit);
  }
}

// 全体攻撃：攻撃対象だけでなく、前衛・後衛を問わず相手陣営の生存キャラクター全員にダメージを与える。
function _targetsInSameAttackRow(target, list){
  if(!target) return [];
  return (list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul);
}

function _panelGridPos(idx){
  const cols=(typeof MAIN_BOARD_COLS!=='undefined'&&MAIN_BOARD_COLS)||5;
  return {x:idx%cols,y:Math.floor(idx/cols)};
}

function _isAdjacentPanelSlot(a,b){
  const pa=_panelGridPos(a), pb=_panelGridPos(b);
  return Math.abs(pa.x-pb.x)+Math.abs(pa.y-pb.y)===1;
}


function _isEnhancementPanel(panel){
  const c=String(panel?.category||'');
  return c==='強化'||c==='エンチャント';
}

function _isCharacterPanel(panel){
  return String(panel?.category||'')==='キャラクター';
}

function _mapPanelPowerAt(idx){
  if(typeof mapPanelPowerIdAt==='function') return mapPanelPowerIdAt(idx);
  const explicit=String(G&&G.mapPanelPowers&&G.mapPanelPowers[idx]||'');
  if(explicit) return explicit;
  return (typeof MAIN_BOARD_DEPLOY_SLOTS!=='undefined'&&MAIN_BOARD_DEPLOY_SLOTS.includes(idx))?'summon':'';
}

function _isEnhancementConnectorPanel(panel){
  return _isEnhancementPanel(panel);
}

function _directionFromPanelToSlot(panelIdx, targetIdx){
  const p=_panelGridPos(panelIdx), t=_panelGridPos(targetIdx);
  const dx=t.x-p.x, dy=t.y-p.y;
  if(dx===0&&dy===-1) return 'up';
  if(dx===1&&dy===0) return 'right';
  if(dx===0&&dy===1) return 'down';
  if(dx===-1&&dy===0) return 'left';
  return '';
}

function _panelAllowsDirection(panel, dir){
  if(!_isEnhancementPanel(panel)&&!_isCharacterPanel(panel)) return false;
  if(!Array.isArray(panel.directions)||!panel.directions.length) return false;
  return panel.directions.includes(dir);
}


// 強化カードの各矢印について、実際に「つながっている」状態か（矢印を消してunite画像を表示すべきか）を判定する。
// 「つながっている」＝①矢印の先が本体(idx0)または召喚キャラクターパネルである（直接）、
// または②矢印の先が別の強化カードで、その強化カード側の矢印もこちらを向いている（相互）。
const _PANEL_DIR_DELTA={up:{dx:0,dy:-1},right:{dx:1,dy:0},down:{dx:0,dy:1},left:{dx:-1,dy:0}};
function _panelDirectionConnectivity(unit, idx){
  const connectivity={};
  const eq=Array.isArray(unit?.equipment)?unit.equipment:[];
  const panel=eq[idx];
  if(!panel||!Array.isArray(panel.directions)) return connectivity;
  const pos=_panelGridPos(idx);
  panel.directions.forEach(d=>{
    const delta=_PANEL_DIR_DELTA[d];
    if(!delta){ connectivity[d]='open'; return; }
    const targetPos={x:pos.x+delta.dx,y:pos.y+delta.dy};
    let targetIdx=-1;
    for(let i=0;i<eq.length;i++){
      const p=_panelGridPos(i);
      if(p.x===targetPos.x&&p.y===targetPos.y){ targetIdx=i; break; }
    }
    if(targetIdx<0){ connectivity[d]='open'; return; }
    const targetPanel=eq[targetIdx];
    if(targetPanel&&_isCharacterPanel(targetPanel)){
      const backDir=_directionFromPanelToSlot(targetIdx,idx);
      connectivity[d]=_panelAllowsDirection(targetPanel,backDir)?'connected':'open';
      return;
    }
    if(targetPanel&&_isEnhancementPanel(targetPanel)){
      const backDir=_directionFromPanelToSlot(targetIdx,idx);
      connectivity[d]=_panelAllowsDirection(targetPanel,backDir)?'connected':'open';
      return;
    }
    connectivity[d]='open';
  });
  return connectivity;
}

// 強化の連結ルール：
// ①キャラクターに隣接し、矢印がキャラクターを向いている強化カード（直接接続）
// ②①の強化カードに隣接し、かつ矢印が互いを向いている（相互）強化カード
// ※②以降も相互矢印が続く限り連鎖する
function _collectEnhancementPanelsForSlot(unit, slotIdx){
  const panels=Array.isArray(unit?.equipment)?unit.equipment:[];
  const result=[];
  const seen=new Set();
  const queue=[];
  panels.forEach((panel,idx)=>{
    if(idx===slotIdx||!panel||!_isEnhancementConnectorPanel(panel)) return;
    if(!_isAdjacentPanelSlot(slotIdx,idx)) return;
    if(!_panelAllowsDirection(panel,_directionFromPanelToSlot(idx,slotIdx))) return;
    if(!_panelAllowsDirection(panels[slotIdx],_directionFromPanelToSlot(slotIdx,idx))) return;
    seen.add(idx);
    queue.push(idx);
    result.push({panel,idx});
  });
  while(queue.length){
    const idx=queue.shift();
    const panel=panels[idx];
    panels.forEach((next,nIdx)=>{
      if(seen.has(nIdx)||nIdx===slotIdx||!next||!_isEnhancementConnectorPanel(next)) return;
      if(!_isAdjacentPanelSlot(idx,nIdx)) return;
      const mutual=_panelAllowsDirection(panel,_directionFromPanelToSlot(idx,nIdx))&&
        _panelAllowsDirection(next,_directionFromPanelToSlot(nIdx,idx));
      if(!mutual) return;
      seen.add(nIdx);
      queue.push(nIdx);
      result.push({panel:next,idx:nIdx});
    });
  }
  return result;
}

function _collectAdjacentEnhancements(unit, slotIdx){
  const enh={atk:0,hp:0,keywords:[],abilities:[],strategyCount:0,weakenOnHit:0,manaOnAttack:0,manaOnInjury:0,manaOnDeath:0,goldOnBattleEnd:0,goldOnDeath:0,randomItemOnBattleEnd:false,randomItemCost:0,effectRepeatBonus:0,uniteGroups:[],manaThresholds:[],effectNames:[],effectScales:{},effectTexts:[],releaseAtkBonus:0,releaseHpBonus:0};
  const panels=_collectEnhancementPanelsForSlot(unit,slotIdx);
  _recordBattleTrace('adjacent_enhancements_resolved',{slotIdx,unitId:unit&&unit.id||null,names:panels.map(x=>x&&x.panel&&x.panel.name||''),indices:panels.map(x=>x&&x.idx)});
  const effectivePanel=entry=>{
    const panel=entry.panel;
    if(!panel||panel.name!=='複製') return panel;
    return panels.find(other=>other.idx!==entry.idx&&other.panel&&other.panel.name!=='複製')?.panel||panel;
  };
  panels.forEach(entry=>{
    const panel=effectivePanel(entry);
    if(!panel) return;
    if(panel.desc) enh.effectTexts.push(String(panel.desc));
    if(String(panel.name||'')==='団結') enh.uniteGroups.push(String(entry.idx));
    // 強化カード名は、効果文に名前が書かれていないトリガ効果の識別子になる。
    // 例：「逆上」「執念の炎」「恩寵」など。合体枚数もスケールへ反映する。
    if(panel.name && String(panel.category || '') !== 'キャラクター') {
      const name=String(panel.name);
      const copies=(panel._tripleMerged?2:1)+(Number(panel._effectRepeatBonus||panel.effectRepeatBonus)||0);
      for(let i=0;i<copies;i++) enh.effectNames.push(name);
      enh.effectScales[name]=Math.max(enh.effectScales[name]||1,copies);
    }
    enh.atk+=panel.adjacentAtkBonus||0;
    enh.hp+=panel.adjacentHpBonus||0;
    enh.releaseAtkBonus=Math.max(enh.releaseAtkBonus,Number(panel.releaseAtkBonus)||0);
    enh.releaseHpBonus=Math.max(enh.releaseHpBonus,Number(panel.releaseHpBonus)||0);
    enh.manaOnAttack+=panel.manaOnAttack||0;
    enh.manaOnInjury+=panel.manaOnInjury||0;
    enh.manaOnDeath+=panel.manaOnDeath||0;
    enh.goldOnBattleEnd+=panel.goldOnBattleEnd||0;
    enh.goldOnDeath+=panel.goldOnDeath||0;
    enh.randomItemOnBattleEnd=enh.randomItemOnBattleEnd||!!panel.randomItemOnBattleEnd||/終戦：.*ランダムなアイテムを得る/.test(String(panel.desc||''));
    const itemCost=String(panel.desc||'').match(/終戦：\s*(\d+)Gと引き換えに、ランダムなアイテムを得る/);
    if(itemCost) enh.randomItemCost=Math.max(enh.randomItemCost||0,Number(itemCost[1])||0);
    const deathMana=String(panel.desc||'').match(/死亡：\s*(\d+)マナを?得る/);
    if(deathMana) enh.manaOnDeath+=Number(deathMana[1])||0;
    const deathGold=String(panel.desc||'').match(/死亡：\s*(\d+)ゴールドを?得る/);
    if(deathGold) enh.goldOnDeath+=Number(deathGold[1])||0;
    const battleGold=String(panel.desc||'').match(/終戦：\s*(\d+)ゴールドを?得る/);
    if(battleGold) enh.goldOnBattleEnd+=Number(battleGold[1])||0;
    enh.effectRepeatBonus+=Number(panel.effectRepeatBonus||panel._effectRepeatBonus)||0;
    if(panel.manaCost){
      enh.manaThresholds.push({cost:Number(panel.manaCost)||0,repeat:!!panel.manaRepeat,desc:String(panel._manaThresholdDesc||panel.desc||'').replace(/^\d+マナ(?:毎)?[:：]\s*/,'')});
    }
    if(panel._resonanceEffectName && panel._resonanceEffectName!==panel.name){
      enh.effectNames.push(panel._resonanceEffectName);
      enh.effectScales[panel._resonanceEffectName]=Math.max(enh.effectScales[panel._resonanceEffectName]||1,panel._tripleMerged?2:1);
    }
    const keywordPanels=new Set(['防戦','熟練','遺志','共振','団結','禁断の力','武器破壊','戦術','大盾','策士']);
    const panelKeywords=[...(panel.adjacentKeywords||[])];
    if(keywordPanels.has(String(panel.name||''))&&!enh.abilities.includes(panel.name)) enh.abilities.push(panel.name);
    if(panel.name==='策士') enh.strategyCount+=(panel._tripleMerged?2:1);
    if(panel.name==='封印されしもの'&&!panelKeywords.some(k=>/^封印\d+$/.test(String(k||'')))) panelKeywords.push('封印1');
    panelKeywords.forEach(k=>{
      enh.effectScales[k]=Math.max(enh.effectScales[k]||1,panel._tripleMerged?2:1);
      // 衝撃X：このキャラクター自身が弱体化するのではなく、攻撃/ダメージ効果で
      // 対象に衝撃Xを付与する常時能力として扱う。表示上はキーワードとしても残す。
      const wm=/^衝撃(\d+)$/.exec(k);
      if(wm){
        enh.weakenOnHit+=parseInt(wm[1],10)||0;
        enh.keywords.push(k);
        return;
      }
      enh.keywords.push(k);
    });
  });
  // 策士：所持キーワード1つにつき+2/+2。合体済みは1枚で2枚分として扱う。
  if(enh.strategyCount>0){
    const cardNames=CORE_KEYWORD_CARD_NAMES;  // 一覧はコア側が持つ（2箇所で持たない）
    const keywordCount=new Set([...(typeof _unitPanelKeywords==='function'?_unitPanelKeywords(unit):unit.keywords||[]),...(enh.keywords||[])]
      .map(k=>String(k||'').trim().replace(/\d+$/,''))
      .filter(k=>k&&!cardNames.has(k))).size;
    enh.atk+=keywordCount*2*enh.strategyCount;
    enh.hp+=keywordCount*2*enh.strategyCount;
  }
  return enh;
}


function _clearAdjacentPanelEnhancements(unit){
  const prev=unit?._adjacentPanelEnhancements;
  if(!unit||!prev) return;
  if(prev.atk){
    unit.atk=Math.max(0,(unit.atk||0)-prev.atk);
    unit.baseAtk=Math.max(0,(unit.baseAtk||0)-prev.atk);
  }
  if(prev.hp){
    unit.maxHp=Math.max(0,(unit.maxHp||0)-prev.hp);
    unit.hp=Math.max(0,Math.min((unit.hp||0)-prev.hp,unit.maxHp));
  }
  if(prev.keywords&&prev.keywords.length){
    const removeCounts={};
    prev.keywords.forEach(k=>{ removeCounts[k]=(removeCounts[k]||0)+1; });
    unit.keywords=(unit.keywords||[]).filter(k=>{
      if(removeCounts[k]>0){ removeCounts[k]--; return false; }
      return true;
    });
  }
  if(prev.weakenOnHit){
    unit.weakenOnHit=Math.max(0,(unit.weakenOnHit||0)-prev.weakenOnHit);
  }
  if(prev.manaOnAttack){
    unit.manaOnAttack=Math.max(0,(unit.manaOnAttack||0)-prev.manaOnAttack);
  }
  if(prev.manaOnInjury){
    unit.manaOnInjury=Math.max(0,(unit.manaOnInjury||0)-prev.manaOnInjury);
  }
  if(prev.manaOnDeath){
    unit.manaOnDeath=Math.max(0,(unit.manaOnDeath||0)-prev.manaOnDeath);
  }
  if(prev.goldOnBattleEnd){
    unit.goldOnBattleEnd=Math.max(0,(unit.goldOnBattleEnd||0)-prev.goldOnBattleEnd);
  }
  if(prev.goldOnDeath){
    unit.goldOnDeath=Math.max(0,(unit.goldOnDeath||0)-prev.goldOnDeath);
  }
  if(prev.randomItemOnBattleEnd) unit.randomItemOnBattleEnd=false;
  if(prev.randomItemCost) unit.randomItemCost=Math.max(0,(unit.randomItemCost||0)-prev.randomItemCost);
  if(prev.effectRepeatBonus){
    unit._effectRepeatBonus=Math.max(0,(unit._effectRepeatBonus||0)-prev.effectRepeatBonus);
  }
  unit._releaseAtkBonus=0;
  unit._releaseHpBonus=0;
  delete unit._adjacentPanelEnhancements;
  delete unit._adjacentPanelAbilities;
  delete unit._adjacentPanelStrategyCount;
  delete unit._adjacentPanelEffectTexts;
  delete unit._uniteGroups;
  delete unit._adjacentPanelSignature;
  delete unit._resonanceEffectNames;
  delete unit._resonanceEffectScales;
  delete unit._extraManaCosts;
  delete unit._extraManaThresholds;
  if(prev.manaThresholdAdded){
    delete unit.manaCost;
    delete unit.manaRepeat;
    delete unit._manaThresholdDesc;
    delete unit._manaFireCount;
  }
}

function _applyAdjacentPanelEnhancements(unit, enh){
  if(!unit||!enh) return;
  const cardNames=CORE_KEYWORD_CARD_NAMES;  // 一覧はコア側が持つ（2箇所で持たない）
  // 旧バージョンで混入したカード名キーワードも、再計算の有無にかかわらず除去する。
  unit.keywords=(unit.keywords||[]).filter(k=>!cardNames.has(String(k||'').trim()));
  const side=_battleSideOfUnit(unit);
  const modifierBonus=_combatModifierBonus(unit,side==='enemy');
  const hasSkill=(_unitPanelKeywords(unit)||[]).includes('熟練')||(enh.keywords||[]).includes('熟練')||(enh.abilities||[]).includes('熟練');
  const atkBonus=(enh.atk||0)+(enh.atk>0?modifierBonus:0)+(hasSkill&&_isBattleGainPhase()&&enh.atk>0?1:0);
  const hpBonus=(enh.hp||0)+(enh.hp>0?modifierBonus:0)+(hasSkill&&_isBattleGainPhase()&&enh.hp>0?1:0);
  const releaseAtkBonus=Number(enh.releaseAtkBonus)||0;
  const releaseHpBonus=Number(enh.releaseHpBonus)||0;
  const enhancementKeywords=[...(enh.keywords||[])];
  if(releaseAtkBonus||releaseHpBonus){
    if(!enhancementKeywords.some(k=>/^封印\d+$/.test(String(k||'')))) enhancementKeywords.push('封印1');
  }
  const abilities=[...(enh.abilities||[])];
  const strategyCount=Number(enh.strategyCount)||0;
  const effectTexts=[...(enh.effectTexts||[])].filter(Boolean);
  const sig=JSON.stringify({atk:atkBonus,hp:hpBonus,keywords:[...enhancementKeywords].sort(),abilities:[...abilities].sort(),strategyCount,releaseAtkBonus,releaseHpBonus,weakenOnHit:enh.weakenOnHit||0,manaOnAttack:enh.manaOnAttack||0,manaOnInjury:enh.manaOnInjury||0,manaOnDeath:enh.manaOnDeath||0,goldOnBattleEnd:enh.goldOnBattleEnd||0,goldOnDeath:enh.goldOnDeath||0,randomItemOnBattleEnd:!!enh.randomItemOnBattleEnd,randomItemCost:enh.randomItemCost||0,effectRepeatBonus:enh.effectRepeatBonus||0,uniteGroups:[...(enh.uniteGroups||[])].sort(),manaThresholds:enh.manaThresholds||[],effectNames:[...(enh.effectNames||[])].sort(),effectScales:enh.effectScales||{},effectTexts:[...effectTexts].sort()});
  if(unit._adjacentPanelSignature===sig) return;
  _clearAdjacentPanelEnhancements(unit);
  unit._adjacentPanelSignature=sig;
  unit._adjacentPanelEnhancements={atk:atkBonus,hp:hpBonus,keywords:[...enhancementKeywords],releaseAtkBonus,releaseHpBonus,weakenOnHit:enh.weakenOnHit||0,manaOnAttack:enh.manaOnAttack||0,manaOnInjury:enh.manaOnInjury||0,manaOnDeath:enh.manaOnDeath||0,goldOnBattleEnd:enh.goldOnBattleEnd||0,goldOnDeath:enh.goldOnDeath||0,randomItemOnBattleEnd:!!enh.randomItemOnBattleEnd,randomItemCost:enh.randomItemCost||0,effectRepeatBonus:enh.effectRepeatBonus||0,manaThresholdAdded:false,effectTexts};
  unit._adjacentPanelAbilities=abilities;
  unit._adjacentPanelStrategyCount=strategyCount;
  unit._releaseAtkBonus=releaseAtkBonus;
  unit._releaseHpBonus=releaseHpBonus;
  const manaThresholds=Array.isArray(enh.manaThresholds)?enh.manaThresholds.filter(t=>Number(t&&t.cost)>0):[];
  if(enh.manaThresholds&&enh.manaThresholds.length&&!unit.manaCost){
    const first=enh.manaThresholds[0];
    unit.manaCost=first.cost;
    unit.manaRepeat=first.repeat;
    unit._manaThresholdDesc=first.desc;
    unit._adjacentPanelEnhancements.manaThresholdAdded=true;
  }
  const extraThresholds=manaThresholds.slice(unit._adjacentPanelEnhancements.manaThresholdAdded?1:0);
  unit._extraManaThresholds=extraThresholds.map(t=>({cost:Number(t.cost)||0,repeat:!!t.repeat,desc:String(t.desc||'')})).filter(t=>t.cost>0);
  unit._extraManaCosts=extraThresholds.map(t=>Number(t.cost)||0).filter(Boolean);
  unit._resonanceEffectNames=[...(enh.effectNames||[])].filter(Boolean);
  unit._resonanceEffectScales={...(enh.effectScales||{})};
  unit._adjacentPanelEffectTexts=effectTexts.slice();
  unit._uniteGroups=[...(enh.uniteGroups||[])];
  if(atkBonus){
    unit.atk=(unit.atk||0)+atkBonus;
    unit.baseAtk=(unit.baseAtk||0)+atkBonus;
  }
  if(hpBonus){
    // HPを減少させる強化（adjacentHpBonusが負の値）でHPが0未満にならないようクランプする
    const nextMaxHp=Math.max(0,(unit.maxHp||0)+hpBonus);
    unit.hp=Math.max(0,Math.min((unit.hp||0)+hpBonus,nextMaxHp));
    unit.maxHp=nextMaxHp;
  }
  if(enhancementKeywords.length){
  unit.keywords=[...(unit.keywords||[]),...enhancementKeywords].filter(k=>!cardNames.has(String(k||'').trim()));
  }
  if(enh.weakenOnHit){
    unit.weakenOnHit=(unit.weakenOnHit||0)+enh.weakenOnHit;
  }
  if(enh.manaOnAttack){
    unit.manaOnAttack=(unit.manaOnAttack||0)+enh.manaOnAttack;
  }
  if(enh.manaOnInjury){
    unit.manaOnInjury=(unit.manaOnInjury||0)+enh.manaOnInjury;
  }
  if(enh.manaOnDeath) unit.manaOnDeath=(unit.manaOnDeath||0)+enh.manaOnDeath;
  if(enh.goldOnBattleEnd) unit.goldOnBattleEnd=(unit.goldOnBattleEnd||0)+enh.goldOnBattleEnd;
  if(enh.goldOnDeath) unit.goldOnDeath=(unit.goldOnDeath||0)+enh.goldOnDeath;
  if(enh.randomItemOnBattleEnd) unit.randomItemOnBattleEnd=true;
  if(enh.randomItemCost) unit.randomItemCost=Math.max(unit.randomItemCost||0,enh.randomItemCost);
  if(enh.effectRepeatBonus){
    unit._effectRepeatBonus=(unit._effectRepeatBonus||0)+enh.effectRepeatBonus;
  }
  // シールドはonBattleStart()より後に接続されるパネル召喚キャラでも、接続時点で自前で付与しておく
  const shieldValue=_unitShieldValue(unit);
  if(shieldValue>0&&(unit.shield||0)<shieldValue){
    unit.shield=shieldValue;
  }
}

function _makePanelSummonUnit(spec, keywords){
  const atk=spec.atk||0, hp=spec.hp||1;
  const mergedKeywords=[...(spec.keywords||[]),...(keywords||[])];
  return {
    id:uid(),
    name:spec.name||'召喚',
    icon:spec.icon||'',
    race:spec.race||'召喚',
    desc:spec.desc||'',
    grade:1,
    atk,
    baseAtk:atk,
    hp,
    maxHp:hp,
    keywords:[...mergedKeywords],
    // シールドは通常onBattleStart()で戦闘開始時に付与されるが、パネル召喚キャラは
    // onBattleStart()より後に盤面へ現れるため、召喚時点で自前で付与しておく
    shield:mergedKeywords.reduce((sum,k)=>sum+_shieldValueFromKeyword(k),0),
    sfxType:spec.sfxType||'',
    equipment:[],
    _panelSummoned:true,
    summonCount:Math.max(1,Number(spec.summonCount||spec.count)||1),
    // 生贄人形で封印を完全に消したキャラクターは、解放効果を開戦効果として発動する。
    // カード側のフラグをユニットへ引き継がないと、開戦時に判定できない。
    _releaseConvertedToOpening:!!spec._releaseConvertedToOpening,
    _sourcePanelName:spec.panelName||spec.name||'',
    manaOnAttack:spec.manaOnAttack||0,
    manaOnInjury:spec.manaOnInjury||0,
    manaOnDeath:spec.manaOnDeath||0,
    manaCost:spec.manaCost||0,
    manaRepeat:!!spec.manaRepeat,
    _manaThresholdDesc:spec.manaThresholdDesc||'',
    goldOnBattleEnd:spec.goldOnBattleEnd||0,
    goldOnDeath:spec.goldOnDeath||0,
    randomItemOnBattleEnd:!!spec.randomItemOnBattleEnd,
    randomItemCost:Number(spec.randomItemCost)||0,
    _effectRepeatBonus:Number(spec.effectRepeatBonus||spec._effectRepeatBonus)||0,
    _merged:!!spec._merged,
    _tripleMerged:!!spec._tripleMerged,
    _tripleDescApplied:!!spec._tripleDescApplied,
    color:spec.color||'',
    art:spec.art||'',
    no:spec.no||'',
    lane:'front'
  };
}

function _terrainNpcSpec(name, fallbackAtk, fallbackHp){
  const base=(typeof UNIT_POOL!=='undefined'&&Array.isArray(UNIT_POOL))
    ?UNIT_POOL.find(u=>u&&u.name===name)
    :null;
  const mapNo=Math.max(1,Number(G&&G._mapBattle&&G._mapBattle.mapIndex)||Number(G&&G.worldMap&&G.worldMap.index)||1);
  const atk=Math.max(0,Math.round(Number(base&&base.atk)||Number(fallbackAtk)||0));
  const hp=Math.max(1,Math.round(Number(base&&base.hp)||Number(fallbackHp)||1));
  return {
    name,
    atk,
    hp,
    race:(base&&base.race)||'NPC',
    desc:(base&&base.desc)||(name==='戦士'?'負傷：このキャラクターにダメージを与えた敵はHP-Xを得る。Xはこのキャラクターが受けたダメージに等しい。':'常時：全ての味方は+X/+Xを得る。（Xは現在のマップの2倍に等しい）'),
    keywords:[...(base&&base.keywords||[])],
    color:(base&&base.color)||'',
    sfxType:(base&&base.sfxType)||'',
    art:(base&&typeof getCardAsset==='function'?getCardAsset(base):'')||'',
    no:(base&&(base.no||base.imageNo||base.artCode||base._artCode))||'',
    panelName:name,
    _terrainNpc:true,
    _terrainMapNo:mapNo,
  };
}
function _placeTerrainNpcAt(slotIdx, spec){
  const max=MAX_ALLIES||14;
  if(!Number.isInteger(slotIdx)||slotIdx<0||slotIdx>=max) return null;
  G.allies=Array.isArray(G.allies)?G.allies:new Array(max).fill(null);
  while(G.allies.length<max) G.allies.push(null);
  if(G.allies[slotIdx]&&G.allies[slotIdx].hp>0&&!G.allies[slotIdx]._isObject&&!G.allies[slotIdx]._isSoul) return null;
  const unit=_makePanelSummonUnit(spec,[]);
  unit._terrainNpc=true;
  unit._battleSlot=slotIdx;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  unit.lane=slotIdx<frontSlots?'front':'rear';
  G.allies[slotIdx]=unit;
  return unit;
}
function _applyTerrainReinforcements(){
  const b=G&&G._mapBattle;
  if(!b||b._terrainReinforcementsApplied) return;
  b._terrainReinforcementsApplied=true;
  const terrain=String(b.terrainType||'');
  const max=MAX_ALLIES||14;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const added=[];
  if(terrain==='village'){
    const spec=_terrainNpcSpec('戦士',0,1);
    [0,frontSlots-1].forEach(slot=>{ const u=_placeTerrainNpcAt(slot,spec); if(u) added.push(u); });
  }else if(terrain==='start'){
    const spec=_terrainNpcSpec('魔術師',0,1);
    [frontSlots,frontSlots+Math.max(0,rearSlots-1)].forEach(slot=>{ const u=_placeTerrainNpcAt(slot,spec); if(u) added.push(u); });
    const buff=Math.max(0,(Number(b.mapIndex)||Number(G.worldMap&&G.worldMap.index)||1)*2);
    if(buff>0){
      (G.allies||[]).forEach(u=>{
        if(!u||u.hp<=0||u._isObject||u._isSoul) return;
        u.atk=Math.max(0,(u.atk||0)+buff);
        u.baseAtk=Math.max(0,(u.baseAtk||0)+buff);
        addUnitHp(u,buff,'ally');
      });
    }
  }
  if(added.length) log(`${terrain==='village'?'村':'初期地点'}の援軍が現れた。`,'good');
}

function _panelSummonSpec(panel){
  if(!panel) return null;
  const openingSpec=panel.summonOnBattleStart&&typeof panel.summonOnBattleStart==='object'
    ?panel.summonOnBattleStart:null;
  if(_isCharacterPanel(panel)||openingSpec){
    const desc=String(panel.desc||openingSpec&&openingSpec.desc||'');
    const manaLine=desc.match(/(?:^|\n)\s*(\d+)マナ(毎)?[：:]\s*([^\n]*)/);
    return {
      ...(openingSpec||{}),
      name:openingSpec&&openingSpec.name||panel.name,
      atk:Number(openingSpec?.atk??panel.power??panel.atk??0),
      hp:Number(openingSpec?.hp??panel.life??panel.hp??1),
      count:openingSpec&&openingSpec.count||panel.summonCount||1,
      race:openingSpec&&openingSpec.race||panel.race||'',
      desc,
      keywords:openingSpec&&openingSpec.keywords||panel.keywords||[],
      color:openingSpec&&openingSpec.color||panel.color||panel.カラー||'',
      sfxType:openingSpec&&openingSpec.sfxType||panel.sfxType||panel.attackSfx||panel.soundType||'',
      manaOnAttack:openingSpec&&openingSpec.manaOnAttack||panel.manaOnAttack||0,
      manaOnInjury:openingSpec&&openingSpec.manaOnInjury||panel.manaOnInjury||0,
      manaOnDeath:openingSpec&&openingSpec.manaOnDeath||panel.manaOnDeath||0,
      manaCost:Number(openingSpec&&openingSpec.manaCost||panel.manaCost||panel.costMana||(manaLine&&manaLine[1])||0),
      manaRepeat:!!(openingSpec&&openingSpec.manaRepeat)||!!panel.manaRepeat||!!(manaLine&&manaLine[2]),
      manaThresholdDesc:String(openingSpec&&(openingSpec.manaThresholdDesc||openingSpec._manaThresholdDesc)||(manaLine&&manaLine[3])||''),
      goldOnBattleEnd:openingSpec&&openingSpec.goldOnBattleEnd||panel.goldOnBattleEnd||0,
      goldOnDeath:openingSpec&&openingSpec.goldOnDeath||panel.goldOnDeath||0,
      randomItemOnBattleEnd:!!(openingSpec&&openingSpec.randomItemOnBattleEnd)||!!panel.randomItemOnBattleEnd,
      effectRepeatBonus:Number(openingSpec&&openingSpec.effectRepeatBonus||panel.effectRepeatBonus||panel._effectRepeatBonus)||0,
      _merged:!!panel._merged,
      _tripleMerged:!!panel._tripleMerged,
      _tripleDescApplied:!!panel._tripleDescApplied,
      // 生贄人形で封印を完全に消したキャラクターは、解放効果を開戦効果として発動する。
      _releaseConvertedToOpening:!!panel._releaseConvertedToOpening,
      art:typeof getPanelArtPath==='function'?getPanelArtPath(panel):(panel.art||''),
      no:panel.no||panel.artCode||panel._artCode||panel['No.']||'',
      panelName:panel.name
    };
  }
  return null;
}

// 「色」はカード自体の見た目・種族分類（茶は廃止し黄に統一、紫を追加）にのみ使う汎用キー変換。
// マナ自体は色を持たない単一プールのため、マナの支払い・獲得には使わない。
function _colorKey(color){
  const c=String(color||'').trim().toLowerCase();
  if(c==='赤'||c==='red') return 'red';
  if(c==='青'||c==='blue') return 'blue';
  if(c==='緑'||c==='green') return 'green';
  if(c==='黄'||c==='茶'||c==='yellow') return 'yellow';
  if(c==='紫'||c==='purple') return 'purple';
  return '';
}

// ── 「リーダー」＝メイン置き場⑥（後衛中央）から出撃したキャラクター。⑥が空/死亡の場合は後衛の誰か ──
function _getLeaderAlly(){
  const leaderSlot=(typeof MAIN_BOARD_REAR_SLOTS!=='undefined'&&MAIN_BOARD_REAR_SLOTS[1])||17;
  const bySlot=(G.allies||[]).find(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&a._mainBoardSlot===leaderSlot);
  if(bySlot) return bySlot;
  return (G.allies||[]).find(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&(a.lane||'front')==='rear')||null;
}
// 前衛レーンにおける左右隣接の味方（配列の昇順=左→右）
function _allyFrontOrder(){
  return (G.allies||[]).filter(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&(a.lane||'front')!=='rear');
}

// ── 効果によるアドホックな味方召喚（例：センチネルの「赤ゴーレム」、スケルトンキングの「青スケルトン」）──
// 色が付いた名前（例：「赤ゴーレム」）は色部分を色分類に、残りを実際のキャラクター名として扱う。
// 召喚されるキャラクターは「オリジナル」でなければならない：プレイヤーがメイン置き場に同名の
// キャラクターパネルを所持していれば、そのインスタンス（隣接する強化パネルの効果を含む）を
// そのまま召喚する。所持していない場合のみ、PANEL_POOLの基礎値＋色別永続強化にフォールバックする。
async function _spawnAdhocAllyUnit(name, atk, hp, isEnemySide, placement){
  // 旧互換の直接召喚も、共通コア経由の召喚と同じ陣営総数上限で拒否する。
  // ここを個別の配置ヘルパーだけに任せると、生成→配置失敗の一瞬だけ配列へ
  // 追加され、renderAll()で左端へ描画される経路が残る。
  const summonList=isEnemySide?(G.enemies||[]):(G.allies||[]);
  const summonMax=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const summonLiveCount=summonList.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(summonLiveCount>=summonMax){
    _recordBattleTrace('summon_rejected',{side:isEnemySide?'p2':'p1',name:String(name||''),
      liveCount:summonLiveCount,max:summonMax,reason:'summon_limit_legacy_entry'});
    return null;
  }
  const m=String(name||'').match(/^([赤青緑黄紫黒])(.+)$/);
  const color=m?m[1]:'';
  const baseName=m?m[2]:String(name||'');
  const board=!isEnemySide&&typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const eq=board&&Array.isArray(board.equipment)?board.equipment:[];
  const ownedIdx=eq.findIndex(p=>p&&String(p.category||'')==='キャラクター'&&p.name===baseName);
  if(ownedIdx>=0){
    const panel=eq[ownedIdx];
    const spec=typeof _panelSummonSpec==='function'?_panelSummonSpec(panel):null;
    if(spec){
      const enh=typeof _collectAdjacentEnhancements==='function'?_collectAdjacentEnhancements(board,ownedIdx):{atk:0,hp:0,keywords:[]};
      const contributingPanels=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(board,ownedIdx):[];
      // enh.keywordsは直後のapplyAdjacentPanelEnhancements()側で付与するため、ここでは渡さない
      // （両方に渡すと同じキーワードが二重に加算され、逆襲・闇の儀式等のカウント依存効果が
      // 意図した回数より多く発動してしまう）
    const summoned=_makePanelSummonUnit({...spec,name:baseName,panelName:panel.name},[]);
      _applyAdjacentPanelEnhancements(summoned,enh);
      summoned._mainBoardSlot=ownedIdx;
      // 寄与している強化パネルの効果全文（キーワード以外）も戦闘中の説明文に表示されるよう、
      // applyNewPanelBattleStart()と同様に複製して引き継ぐ
      if(contributingPanels.length){
        summoned.equipment=_panelSummonDisplayEquipment(panel,contributingPanels);
      }
      // 召喚は前衛の右端にだけ出す。前衛が満杯なら成立させない（後衛へ逃がさない）。
      // 後衛へ送ると陣営の上限を超え、編成していない後衛枠にキャラクターが現れる。
      const rearIdx=_summonMidBattleAllyFront(summoned,isEnemySide,placement);
      if(rearIdx>=0){
        await _afterPanelSummon(summoned,isEnemySide);
        if(!(placement&&placement.deferCompact)) requestBattleCompact();
      }
      return rearIdx>=0?summoned:null;
    }
  }
  const basePanel=(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL))
    ?PANEL_POOL.find(p=>p&&p.name===baseName)
    :null;
  let finalAtk=Number(basePanel?.power??atk)||Number(atk)||0;
  let finalHp=Math.max(1,Number(basePanel?.life??hp)||Number(hp)||1);
  // 戦闘中に敵が召喚したキャラクターは、召喚元（エリート・ボス）自身のステータスの80%。
  const _enemyScaled=isEnemySide?_enemySummonStats(placement&&placement.rightOf):null;
  if(_enemyScaled){ finalAtk=_enemyScaled.atk; finalHp=_enemyScaled.hp; }
  if(color){
    const key=_colorKey(color);
    const cb=G&&G.panelColorPermanentBuffs&&G.panelColorPermanentBuffs[key];
    if(cb){ finalAtk+=Number(cb.atk||0); finalHp+=Number(cb.hp||0); }
  }
  const unit=_makePanelSummonUnit({
    name:baseName,
    atk:finalAtk,
    hp:finalHp,
    color:color||(basePanel&&basePanel.color)||'',
    race:(basePanel&&basePanel.race)||'召喚',
    desc:basePanel&&basePanel.desc||'',
    keywords:basePanel&&basePanel.keywords||[],
    art:basePanel&&typeof getPanelArtPath==='function'?getPanelArtPath(basePanel):(basePanel&&basePanel.art)||'',
    no:(basePanel&&(basePanel.no||basePanel.artCode||basePanel._artCode))||''
  },[]);
  const placedIdx=_summonMidBattleAllyFront(unit,isEnemySide,placement);
  // 召喚は前衛の右端にだけ出す。前衛が満杯なら成立させない（後衛へ逃がさない）。
  const rearIdx=placedIdx;
  if(rearIdx>=0){
    await _afterPanelSummon(unit,isEnemySide);
    if(!(placement&&placement.deferCompact)) requestBattleCompact();
  }
  return rearIdx>=0?unit:null;
}

function _panelSummonDisplayEquipment(sourcePanel, contributingPanels){
  const center=sourcePanel?{...clone(sourcePanel),directions:['up','down','left','right']}:null;
  const panels=(contributingPanels||[]).map(entry=>{
    const p=entry&&entry.panel?entry.panel:entry;
    return p?{...clone(p),directions:['up','down','left','right']}:null;
  }).filter(Boolean);
  return [center,...panels];
}

// 「黒マッドキャット」のように敵シートのキャラクターを戦闘中に召喚する。
// _spawnAdhocAllyUnit()はプレイヤー側のPANEL_POOLを引くため、敵専用カード（マッドキャット等）は
// 名前だけのユニットになり絵も効果も付かない。こちらは敵シート定義（ENEMY_POOL）から生成する。
// 「黒」は敵カードの色（シートの色列）なので、名前解決の際は取り除く。
async function _spawnEnemyUnitByName(name, atk, hp, isEnemySide, source, placement){
  const norm=s=>String(s||'').replace(/[\u201c\u201d]/g,'"').trim();
  const baseName=norm(name).replace(/^\u9ed2/,'');
  const pool=(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL))?ENEMY_POOL:[];
  const targetList=isEnemySide?(G.enemies||[]):(G.allies||[]);
  const targetMax=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const targetLive=targetList.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(targetLive>=targetMax){
    _recordBattleTrace('summon_rejected',{side:isEnemySide?'p2':'p1',name:baseName,
      liveCount:targetLive,max:targetMax,reason:'summon_limit_enemy_helper'});
    return null;
  }
  const def=pool.find(d=>d&&norm(d.name)===baseName)||null;
  // 敵側の召喚は召喚元（エリート・ボス）自身のステータスの80%。
  const scaled=isEnemySide?_enemySummonStats(source):null;
  const finalAtk=scaled?scaled.atk:Math.max(0,Number(atk)||0);
  const finalHp=scaled?scaled.hp:Math.max(1,Number(hp)||1);
  const e=_mkEnemy(finalAtk,finalHp,def?def.name:baseName,def&&def.icon,(def&&def.grade)||1,
    def?_kwShield(def):0,[...((def&&def.keywords)||[])],(def&&def.race)||'-');
  if(def) _applyEnemyDefAbilities(e,def);
  e.lane='front';
  const idx=_summonMidBattleAllyFront(e,!!isEnemySide,placement||(source?{rightOf:source}:undefined));
  const resolvedPlacement=placement||(source?{rightOf:source}:undefined);
  // 召喚は前衛の右端にだけ出す。前衛が満杯なら成立させない（後衛へ逃がさない）。
  const rearIdx=idx;
  if(rearIdx<0) return null;
  await _afterPanelSummon(e,!!isEnemySide);
  requestBattleCompact();
  return e;
}

async function _spawnRandomEnemyBoss(source){
  const excluded=['万象の揺り籠','刻を織る者','日刻の巫女','夜刻の巫女'];
  const targetList=G.enemies||[];
  const targetMax=MAX_ENEMIES||14;
  const targetLive=targetList.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(targetLive>=targetMax){
    _recordBattleTrace('summon_rejected',{side:'p2',name:'random_boss',
      liveCount:targetLive,max:targetMax,reason:'summon_limit_boss_helper'});
    return null;
  }
  const candidates=(typeof ENEMY_POOL!=='undefined'?ENEMY_POOL:[]).filter(def=>def&&def.bossOnly&&!excluded.some(n=>String(def.name||'').includes(n)));
  const def=randFrom(candidates);
  if(!def) return null;
  const floor=Number(G._mapBattle?.floor??G.floor)||1;
  // 召喚されるボスのステータスは召喚元（エピトメ）自身の80%。深層レベル・ボス補正は
  // 召喚元のステータスに既に乗っているため、ここで改めて掛ける必要はない。
  const st=_enemySummonStats(source)||enemyStats({...def,baseAtk:[17,20],baseHp:[34,40]},floor,
    Number(G._battleBossMult)||Number(G._forceBossMult)||Number(G._extraBattleMult)||1.5);
  const e=_mkEnemy(st.atk,st.hp,def.name,def.icon,def.grade||1,_kwShield(def),[...(def.keywords||[]),'ボス'],def.race||'-');
  _applyEnemyDefAbilities(e,def); e.boss=true; e.lane='front';
  const idx=_summonMidBattleAllyFront(e,true,{rightOf:source});
  if(idx<0) return null;
  await _afterPanelSummon(e,true); requestBattleCompact();
  log(`${_lc(source.name,true)}の効果で「${e.name}」を召喚した。`,'bad');
  return e;
}

// ── 動的に再計算が必要な「常時」パッシブ（マナ数依存・リーダー依存）を反映する ──
// マナ・リーダーのステータスは増加方向にのみ追従する（減少時に強制的にHPを削らないための簡易措置）
function _recomputeDynamicPanelStats(){
  const leader=_getLeaderAlly();
  const manaCount=_ensureMana();
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0) return;
    const desc=String(u.desc||'');
    if(/常時：このキャラクターは\+X\/\+Xを得る。Xはマナの数に等しい。/.test(desc)){
      const prev=u._manaScaleApplied||0;
      const delta=manaCount-prev;
      if(delta){
        u.atk=Math.max(0,(u.atk||0)+delta); u.baseAtk=Math.max(0,(u.baseAtk||0)+delta);
        if(delta>0) addUnitHp(u,delta,'ally');
        u._manaScaleApplied=manaCount;
      }
    }
    if(/常時：XはリーダーのATK、HPの2倍に等しい。/.test(desc)&&leader&&leader!==u){
      // 自身の元々のステータス（シート値）とは無関係に、常にリーダーの2倍を絶対値として設定する
      const targetAtk=Math.max(0,(leader.atk||0)*2), targetHp=Math.max(1,(leader.maxHp||leader.hp||0)*2);
      const hpDiff=targetHp-(u.maxHp||0);
      u.atk=targetAtk; u.baseAtk=targetAtk;
      u.maxHp=targetHp;
      u.hp=hpDiff>0?(u.hp||0)+hpDiff:Math.min(u.hp||0,u.maxHp);
    }
  });
  (G.enemies||[]).forEach(u=>{
    if(!u||u.hp<=0||!_unitHasEffectName(u,'蝕の翼"スコル・ハティ"')) return;
    const prev=u._manaScaleApplied||0;
    const target=manaCount*4;
    const delta=target-prev;
    if(delta>0){ _addBattleStats(u,delta,delta,'enemy'); u._manaScaleApplied=target; }
  });
}
function _ensureMana(){
  G.mana=Number(G.mana)||0;
  return G.mana;
}
function _gainMana(amount, source){
  let n=Math.max(1,Number(amount)||1);
  const srcUnit=source&&typeof source==='object'?source:(G.allies||[]).find(u=>u&&u.hp>0&&u.name===source);
  const sourceName=source&&typeof source==='object'?source.name:source;
  G.mana=_ensureMana()+n;
  log(`${sourceName?_lc(sourceName,false):'マナ'}の効果でマナを${n}つ獲得した。`,'good');
  if(typeof renderManaHud==='function') renderManaHud();
  // ユニットのマナ閾値は共通コアがイベント単位で一度だけ解決する。
  // 旧マナ閾値走査をここで予約すると、コア処理と
  // 二重実行され、召喚・VFX・効果回数が崩れる。
  if(!G._deferManaThresholdEffects) _queueRingManaThresholdEffects();
  _recomputeDynamicPanelStats();
}
function _queueRingManaThresholdEffects(){
  if(!_hasRingNamed('嵐の指輪')) return;
  G._ringManaEffectPromise=(G._ringManaEffectPromise||Promise.resolve())
    .then(()=>_checkRingManaThresholdEffects())
    .catch(e=>console.error('[ring mana effects]',e));
}
async function _flushRingManaThresholdEffects(){
  // ユニットのマナ閾値は共通コアのイベント処理で完了済み。旧キューを
  // 待つと旧処理の再実行を許し、召喚やVFXを次の攻撃まで遅延させる。
  if(G._ringManaEffectPromise) await G._ringManaEffectPromise;
}
// 嵐の指輪：10マナ：全ての敵にXダメージを与える。Xはマナの5倍に等しい。（10マナ到達ごとに繰り返し発動する）
async function _checkRingManaThresholdEffects(){
  if(G._checkingRingManaEffects||!_hasRingNamed('嵐の指輪')) return;
  G._checkingRingManaEffects=true;
  try{
    const progress=Math.floor(_ensureMana()/10);
    while((G._stormRingFireCount||0)<progress){
      if(_battleVictoryAlreadyPending()) break;
      G._stormRingFireCount=(G._stormRingFireCount||0)+1;
      const x=_ensureMana()*5;
      const entries=(G.enemies||[]).filter(_canReceiveBattleEffect).map(t=>({unit:t,side:'enemy',amount:x,source:null}));
      if(entries.length){
        playDamageEffectSfx('all');
        await applyDamageBatch(entries,{effect:true});
        log(`嵐の指輪の効果で全ての敵に${x}ダメージを与えた。`,'good');
        if(_battleVictoryAlreadyPending()) break;
      }
    }
  } finally {
    G._checkingRingManaEffects=false;
  }
}
// マナは消費しない共有蓄積値（G.mana）。カードごとに必要数（manaCost）到達回数を
// _manaFireCountで独立管理し、非repeatは1回のみ、manaRepeat=trueは閾値到達のたびに繰り返し発動する。
function _manaFireProgress(entity){
  const cost=Number(entity&&entity.manaCost)||0;
  if(!cost) return 0;
  return Math.floor(_ensureMana()/cost);
}
function _manaShouldFireAgain(entity){
  const cost=Number(entity&&entity.manaCost)||0;
  if(!cost) return false;
  const fired=entity._manaFireCount||0;
  if(!entity.manaRepeat&&fired>=1) return false;
  return _manaFireProgress(entity)>fired;
}

// 復活：死亡時、ATK/HPを半分にして「召喚」する（召喚トリガーを発動させる）。
function _reviveWithHalvedStats(unit,isEnemySide){
  if(!unit||typeof coreTryRevive!=='function') return false;
  const side=isEnemySide?'p2':'p1';
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  state._revivalRingUsed=!!G._revivalRingUsed;
  const oldSide=unit.side, oldSlot=unit.slot;
  unit.side=side; unit.slot=(side==='p1'?G.allies:G.enemies).indexOf(unit);
  const reason=_unitHasKeyword(unit,'復活')?'復活':(_unitHasKeyword(unit,'根性')?'根性':'');
  const emit=ev=>{ if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  let revived=false;
  try{ revived=coreTryRevive(unit,state,emit); }
  finally{
    if(oldSide==null) delete unit.side; else unit.side=oldSide;
    if(oldSlot==null) delete unit.slot; else unit.slot=oldSlot;
  }
  if(!revived) return false;
  _syncCoreLifeToG(state);
  if(state._revivalRingUsed) G._revivalRingUsed=true;
  delete unit._deathFxDone;
  delete unit._deathFxReady;
  if(reason==='復活'){
    unit._panelSummoned=true;
    _afterPanelSummon(unit,isEnemySide);
  }
  return true;
}
function _applyRingPassiveBuffToSummonedUnit(unit,isEnemySide){
  if(!unit||unit.hp<=0) return;
  const rings=_effectiveRings();
  if(!rings.length) return;
  const colorRingMap={'赤い瞳の指輪':'赤','青い瞳の指輪':'青','緑の瞳の指輪':'緑','黄の瞳の指輪':'黄','紫の瞳の指輪':'紫'};
  const color=String(unit.color||'');
  if(!color) return;
  const counts={};
  rings.forEach(r=>{
    const c=colorRingMap[r&&r.name];
    if(c) counts[c]=(counts[c]||0)+1;
  });
  const targetCount=counts[color]||0;
  if(!targetCount) return;
  unit._ringPassiveSummonBuffs=unit._ringPassiveSummonBuffs||{};
  const applied=unit._ringPassiveSummonBuffs[color]||0;
  const delta=targetCount-applied;
  if(delta<=0) return;
  _addBattleStats(unit,10*delta,10*delta,isEnemySide?'enemy':'ally');
  unit._ringPassiveSummonBuffs[color]=targetCount;
  log(`${_lc(unit.name,isEnemySide)}は${color}の瞳の指輪の効果で+${10*delta}/+${10*delta}を得た。`,isEnemySide?'bad':'good');
}
async function _afterPanelSummon(unit,isEnemySide,isInitialDeploy,fromCore){
  if(!unit) return;
  if(isEnemySide) return;
  // ヘルナイトの「戦闘中に召喚された味方に生贄を付与する」は、開戦時のパネルからの通常出撃
  // （isInitialDeploy）ではなく、戦闘中に実際に発生した召喚（死亡・復活・効果による召喚等）にのみ適用する。
  if(!isInitialDeploy){
    G._battleSummonedAllyCount=(G._battleSummonedAllyCount||0)+1;
  }
  // 旧PvEの召喚経路は共通コアを通らないため、ここでリッチの召喚監視を補完する。
  // 共通コアが既に連鎖召喚イベントを出した場合は fromCore=true で二重発動を防ぐ。
  if(!fromCore&&!isInitialDeploy&&unit.name!=='青シャドウ'&&!G._resolvingLichSummon){
    const lich=(G.allies||[]).find(x=>x&&x.hp>0&&!_isSealed(x)
      &&((typeof coreHasEffect==='function'&&coreHasEffect(x,'リッチ'))
        || _unitHasEffectName(x,'リッチ')
        || /味方が召喚された時[、,]?「青シャドウ」を1体召喚する/.test(
          typeof coreUnitEffectText==='function'?coreUnitEffectText(x):(x.effect||x.desc||'')
        )));
    if(lich){
      G._resolvingLichSummon=true;
      try{ await _spawnAdhocAllyUnit('青シャドウ',1,1,false,{rightOf:lich}); }
      finally{ G._resolvingLichSummon=false; }
    }
  }
  // 開戦時の通常出撃（isInitialDeploy）では、まだ全キャラクターの配置・描画が完了していないため
  // ここではまだ封印解放を行わない（DOM未確定のままgetBoundingClientRect()すると位置がズレる／
  // 演出無しで即解封されてしまう）。applyNewPanelBattleStart()側で全員の配置・再描画完了後に
  // まとめて一度だけ_resolveSeals()を呼ぶ。
  if(!isInitialDeploy) await _resolveSeals();
}
// 戦闘に持ち込まれたアイテム。以前は静寂の巻物だけを返していたため、
// _applyOpeningItemEffects() の隕石の巻物などの分岐が一度も実行されなかった。
// activeBattleItems へ入る時点（startBattle）で対象キーは既に絞られているので、ここでは絞らない。
function _battleItemCards(){
  return (G.activeBattleItems||[]).filter(c=>c&&(c.type==='consumable'||c.kind==='item'||c.category==='アイテム'));
}
function _itemBondScrollCount(){
  return _battleItemCards().filter(c=>c.itemEffectKey==='bond_scroll'||c.name==='絆の巻物').length;
}
function _applyItemPassiveToUnit(unit,isEnemySide){
  if(isEnemySide||!_canReceiveBattleEffect(unit)) return;
  const count=_itemBondScrollCount();
  if(count) _addBattleStats(unit,5*count,5*count,'ally');
}
function _livingFrontAllies(){
  return (G.allies||[]).filter(u=>_canReceiveBattleEffect(u)&&(u.lane||'front')==='front');
}
function _isUnitSilencedByScroll(unit){
  return !!(unit&&unit._scrollSilencedUntilAttack);
}
async function _releaseSealWithoutSacrifice(unit,isEnemySide){
  if(!unit||unit.hp<=0||!_isSealed(unit)) return false;
  unit._sealReady=true;
  renderAll();
  await _awaitFrame();
  if(typeof playSealReleaseVfx==='function') await playSealReleaseVfx(unit,isEnemySide?'enemy':'ally');
  unit._sealed=false;
  delete unit._sealValue;
  delete unit._sealReady;
  log(`${_lc(unit.name,isEnemySide)}の封印が生贄なしで解放された。`,'gold');
  // 封印から解放されたキャラクターは「戦闘中に召喚された」扱いにする。
  await _afterPanelSummon(unit,isEnemySide);
  const repeats=_releaseRepeatCount(unit,isEnemySide);
  for(let i=0;i<repeats;i++) await _applyReleaseEffect(unit,isEnemySide,[]);
  requestBattleCompact();
  return true;
}
async function _applyItemPassiveBattleStartEffects(){
  const count=_itemBondScrollCount();
  if(!count) return;
  const atk=5*count, hp=5*count;
  (G.allies||[]).forEach(u=>{ if(_canReceiveBattleEffect(u)) _addBattleStats(u,atk,hp,'ally'); });
  log(`絆の巻物の効果で全ての味方は+${atk}/+${hp}を得た。`,'good');
}
async function _applyOpeningItemEffects(){
  const items=_battleItemCards();
  if(!items.length) return;
  for(const card of items){
    const key=card.itemEffectKey||'';
    if(key==='bond_scroll') continue;
    if(key==='silence_scroll'){
      (G.enemies||[]).forEach(e=>{ if(e&&e.hp>0) e._scrollSilencedUntilAttack=true; });
      log('静寂の巻物の効果で、全ての敵の効果を一度攻撃するまで無効化した。','good');
    }else if(key==='shield_scroll'){
      _livingFrontAllies().forEach(u=>{ u.shield=(u.shield||0)+1; });
      log('盾の巻物の効果で全ての味方前衛に結界1を与えた。','good');
    }else if(key==='underworld_scroll'){
      const targets=_livingFrontAllies();
      for(const u of targets) await _applyDeathKeywordEffects(u,false);
      log('冥府の巻物の効果で全ての味方前衛の死亡効果を発動した。','good');
    }else if(key==='giant_scroll'){
      const target=(G.allies||[]).filter(_canReceiveBattleEffect).sort((a,b)=>(b.maxHp||b.hp||0)-(a.maxHp||a.hp||0))[0];
      if(target){
        target.atk=Math.max(0,Math.round((target.atk||0)*2));
        target.baseAtk=Math.max(0,Math.round((target.baseAtk||0)*2));
        target.hp=Math.max(1,Math.round((target.hp||1)*2));
        target.maxHp=Math.max(target.hp,Math.round((target.maxHp||target.hp||1)*2));
        log(`巨大化の巻物の効果で${_lc(target.name,false)}のATKとHPが2倍になった。`,'good');
      }
    }else if(key==='meteor_scroll'){
      const entries=(G.enemies||[]).filter(e=>e&&e.hp>0).map(e=>({unit:e,side:'enemy',amount:Math.max(1,Math.ceil((Number(e.hp)||0)/2)),source:null}));
      if(entries.length){
        playDamageEffectSfx('single');
        await applyDamageBatch(entries,{effect:true});
        log('隕石の巻物の効果で全ての敵にHPの半分のダメージを与えた。','good');
      }
    }else if(key==='sacrifice_doll'){
      const targets=(G.allies||[]).filter(u=>u&&u.hp>0&&_isSealed(u));
      const target=targets.length?targets[Math.floor(Math.random()*targets.length)]:null;
      if(target) await _releaseSealWithoutSacrifice(target,false);
    }else if(key==='weakening_scroll'){
      (G.enemies||[]).forEach(e=>{ if(e&&e.hp>0&&!_isAilmentImmune(e)) e.weaken=(e.weaken||0)+2; });
      log('衰弱の巻物の効果で全ての敵は弱体2を得た。','good');
    }else if(key==='illusion_scroll'){
      for(let i=0;i<3;i++) await _spawnAdhocAllyUnit('青ワイルドハント',20,20,false);
      log('幻影の巻物の効果で「青ワイルドハント」を3体召喚した。','good');
    }else if(key==='mana_scroll'){
      _gainMana(3,card.name);
    }else if(key==='inspire_flag'){
      _livingFrontAllies().forEach(u=>_grantUnitKeyword(u,'根性'));
      log('鼓舞の旗の効果で全ての味方前衛に根性を与えた。','good');
    }
    card._firedThisBattle=true;
  }
  renderAll();
}
// ── 「Xマナ：効果」「Xマナ毎：効果」形式の説明文を持つキャラクター・強化パネル共通のマナ発動効果 ──
// マナは消費されない共有蓄積値。非repeatはXマナ到達で1戦闘1回、manaRepeatはXマナ貯まるたびに繰り返し発動する。
async function _applyManaThresholdEffectText(unit,text,isEnemySide){
  const rawText=String(text||'');
  const buff=String(text||'').match(/^(?:このキャラクターは)?\s*\+(\d+)\s*\/\s*\+(\d+)を得る/);
  if(buff){
    const atk=parseInt(buff[1],10)||0, hp=parseInt(buff[2],10)||0;
    const gAtk=atk?addUnitAtk(unit,atk):0;
    const gHp=hp?addUnitHp(unit,hp,isEnemySide?'enemy':'ally'):0;
    log(`${_lc(unit.name,isEnemySide)}の効果が発動した。+${gAtk}/+${gHp}を得た。`,isEnemySide?'bad':'good');
    return;
  }
  // センチネル等：「〇〇」（atk/hp）を召喚する。
  const summon=String(text||'').match(/^「(.+?)」（(\d+)\/(\d+)）を召喚する。/);
  if(summon&&!isEnemySide){
    const [,summonName,summonAtkStr,summonHpStr]=summon;
    log(`${_lc(unit.name,isEnemySide)}の効果が発動した。「${summonName}」を召喚する。`,'good');
    await _spawnAdhocAllyUnit(summonName,parseInt(summonAtkStr,10)||0,parseInt(summonHpStr,10)||1,isEnemySide,{rightOf:unit});
    return;
  }
  // サテュロス等：Xマナを得る。
  const manaGain=String(text||'').match(/^(\d+)マナを?得る/);
  if(manaGain){
    const n=parseInt(manaGain[1],10)||0;
    if(n) _gainMana(n,unit.name);
    return;
  }
  const fireArrow=String(text||'').match(/^ランダムな敵に(\d+)ダメージを与える/);
  if(fireArrow){
    const foes=isEnemySide?G.allies:G.enemies;
    const target=_pickRandomEnemyTargets(foes,unit)[0];
    if(target){
      const dmg=parseInt(fireArrow[1],10)||0;
      playDamageEffectSfx('single');
      await applyDamageBatch([{unit:target,side:isEnemySide?'ally':'enemy',amount:dmg,source:unit}],{source:unit,effect:true});
      log(`${_lc(unit.name,isEnemySide)}の炎の矢が${_lc(target.name,!isEnemySide)}に${dmg}ダメージを与えた。`,isEnemySide?'bad':'good');
    }
    return;
  }
  // ドワーフ・ダークワン等：ランダムなA色（の）キャラクター（N体）は+X/+Yを得る。
  // 「2体」のように体数が付く場合は、その数だけ重複なしで対象を選ぶ（足りなければいる分だけ）。
  const randColorBuff=String(text||'').match(/^ランダムな([赤青緑黄紫])の?キャラクター(?:(\d+)体)?は\+(\d+)\/\+(\d+)を得る/);
  if(randColorBuff){
    const [,buffColor,countStr,atkStr,hpStr]=randColorBuff;
    const side=isEnemySide?G.enemies:G.allies;
    const candidates=(side||[]).filter(u=>_canReceiveBattleEffect(u)&&String(u.color||'')===_normalizeColorTextForBattle(buffColor));
    const want=Math.max(1,parseInt(countStr,10)||1);
    const pool=candidates.slice();
    const targets=[];
    while(targets.length<want&&pool.length){
      targets.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
    }
    const bonus=_combatModifierBonus(unit,isEnemySide);
    const atk=(parseInt(atkStr,10)||0)+bonus, hp=(parseInt(hpStr,10)||0)+bonus;
    targets.forEach(target=>{
      const gAtk=atk?addUnitAtk(target,atk):0;
      const gHp=hp?addUnitHp(target,hp,isEnemySide?'enemy':'ally'):0;
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,isEnemySide)}は+${gAtk}/+${gHp}を得た。`,isEnemySide?'bad':'good');
    });
    return;
  }
  const randEnemySac=String(text||'').match(/^ランダムな敵に生贄を付与する/);
  if(randEnemySac){
    const foes=isEnemySide?G.allies:G.enemies;
    const candidates=_livingCombatUnits(foes);
    if(candidates.length){
      const target=_pickRandomEnemyTargets(foes,unit)[0];
      if(_isAilmentImmune(target)) return;
      target.keywords=[...(target.keywords||[]),'生贄'];
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,!isEnemySide)}に生贄を付与した。`,isEnemySide?'bad':'good');
      await _resolveSeals();
    }
    return;
  }
  if(/^「緑ウルフ」を召喚する/.test(rawText)){
    await _spawnAdhocAllyUnit('緑ウルフ',3,3,isEnemySide,{rightOf:unit});
    log(`${_lc(unit.name,isEnemySide)}の効果で「緑ウルフ」を召喚した。`,isEnemySide?'bad':'good');
    return;
  }
  if(/^「緑ドラゴン」に変身する/.test(rawText)||unit.name==='ドラゴネット'){
    _setBattleUnitForm(unit,'緑ドラゴン',20,20,'緑');
    log(`${_lc(unit.name,isEnemySide)}に変身した。`,isEnemySide?'bad':'good');
    return;
  }
  if(/^全ての緑キャラクターは\+1\/\+1を得る/.test(rawText)){
    _allBattleCharacters().forEach(u=>{
      if(_canReceiveBattleEffect(u)&&String(u.color||'')==='緑') _addBattleStats(u,1,1,_battleSideOfUnit(u));
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての緑キャラクターは+1/+1を得た。`,isEnemySide?'bad':'good');
    return;
  }
  const randomEnemyTransform=String(rawText).match(/^ランダムな敵を「([^」]+)」に変身させる/);
  if(randomEnemyTransform){
    const foes=isEnemySide?G.allies:G.enemies;
    const target=_pickRandomEnemyTargets(foes,unit)[0];
    if(target){
      const formName=randomEnemyTransform[1];
      const formPanel=(PANEL_POOL||[]).find(p=>p&&String(p.category||'')==='キャラクター'&&(
        p.name===formName || `${p.color||''}${p.name||''}`===formName
      ));
      const formAtk=Number(formPanel?.power??formPanel?.atk)||3;
      const formHp=Number(formPanel?.life??formPanel?.hp)||3;
      const formColor=String(formPanel?.color||'緑');
      _setBattleUnitForm(target,formName,formAtk,formHp,formColor);
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,!isEnemySide)}を「${formName}」に変身させた。`,isEnemySide?'bad':'good');
    }
    return;
  }
  const allEnemyPoison=String(rawText||'').match(/^全ての敵に毒(\d+)を与える/);
  if(allEnemyPoison){
    const poison=Math.max(1,parseInt(allEnemyPoison[1],10)||1);
    const foes=isEnemySide?G.allies:G.enemies;
    _livingCombatUnits(foes).forEach(t=>{ if(!_isAilmentImmune(t)) t.poison=(t.poison||0)+poison; });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての敵に毒${poison}を与えた。`,isEnemySide?'bad':'good');
    return;
  }
  if(/^ランダムな敵に防戦を与える/.test(rawText)){
    const foes=isEnemySide?G.allies:G.enemies;
    const target=_pickRandomEnemyTargets(foes,unit)[0];
    if(target&&!_isAilmentImmune(target)){
      if(!(target.keywords||[]).includes('防戦')) target.keywords=[...(target.keywords||[]),'防戦'];
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,!isEnemySide)}に防戦を与えた。`,isEnemySide?'bad':'good');
    }
    return;
  }
  const arachneEffect=String(rawText||'').match(/^全ての味方に\+(\d+)\/\+(\d+)を与えた後、(\d+)ダメージを与える/);
  if(unit.name==='アラクネ'||arachneEffect){
    const effectScale=_unitEffectScale(unit,'アラクネ');
    const atk=Math.max(1,Number(arachneEffect&&arachneEffect[1])||2*effectScale);
    const hp=Math.max(1,Number(arachneEffect&&arachneEffect[2])||2*effectScale);
    const damage=Math.max(1,Number(arachneEffect&&arachneEffect[3])||effectScale);
    const allies=isEnemySide?G.enemies:G.allies;
    const side=isEnemySide?'enemy':'ally';
    const targets=_livingCombatUnits(allies);
    targets.forEach(t=>_addBattleStats(t,atk,hp,side));
    const entries=targets.filter(t=>t.hp>0).map(t=>({unit:t,side,amount:damage,source:unit}));
    if(entries.length) await applyDamageBatch(entries,{source:unit,effect:true});
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての味方は+${atk}/+${hp}を得た後、${damage}ダメージを受けた。`,isEnemySide?'bad':'good');
    return;
  }
  const randAllyRevive=String(text||'').match(/^ランダムな味方が復活を得る/);
  if(randAllyRevive){
    const allies=isEnemySide?G.enemies:G.allies;
    const candidates=_livingCombatUnits(allies);
    if(candidates.length){
      const target=_pickRandomEnemyTargets(candidates,unit)[0];
      if(_isAilmentImmune(target)) return;
      if(!(target.keywords||[]).includes('復活')) target.keywords=[...(target.keywords||[]),'復活'];
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,isEnemySide)}は「復活」を得た。`,isEnemySide?'bad':'good');
    }
    return;
  }
  // スペクター等：全てのA色キャラクターはATK+Xを得る。
  const allColorAtkBuff=String(text||'').match(/^全ての([赤青緑黄紫])キャラクターはATK\+(\d+)を得る/);
  if(allColorAtkBuff){
    const [,buffColor,atkStr]=allColorAtkBuff;
    const atk=(parseInt(atkStr,10)||0)+_combatModifierBonus(unit,isEnemySide);
    const side=isEnemySide?G.enemies:G.allies;
    (side||[]).forEach(u=>{
      if(u&&u.hp>0&&String(u.color||'')===_normalizeColorTextForBattle(buffColor)&&atk){
        addUnitAtk(u,atk);
      }
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての${buffColor}キャラクターはATK+${atk}を得た。`,isEnemySide?'bad':'good');
    return;
  }
  // サイクロプス・ヴリコラカス等：（自身が）〇〇（キーワード）を得る。
  const kwGain=String(text||'').match(/^([^\s、。]+)を得る。?$/);
  if(kwGain){
    const kw=kwGain[1];
    if(!(unit.keywords||[]).includes(kw)) unit.keywords=[...(unit.keywords||[]),kw];
    log(`${_lc(unit.name,isEnemySide)}の効果で「${kw}」を得た。`,isEnemySide?'bad':'good');
    return;
  }
  log(`${_lc(unit.name,isEnemySide)}の効果が発動した。`,isEnemySide?'bad':'good');
}
function _normalizeColorTextForBattle(c){
  return String(c||'')==='茶'?'黄':String(c||'');
}
function _summonPanelUnitToFront(unit, isEnemySide, preferredSlot){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 初期出撃・旧互換入口も、戦闘中召喚と同じ陣営総数上限を先に確認する。
  // ここを通さず空き枠だけを見ると、上限超過体が一度配列へ入り、
  // compact/render の間だけ左端や空き位置へ表示される。
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  // 開戦召喚だけは魔導板由来の希望スロットを優先する。衝突時は近傍へ
  // 寄せるが、通常の戦闘中召喚（preferredSlotなし）の右詰め挙動は維持する。
  if(Number.isInteger(preferredSlot)&&preferredSlot>=0&&preferredSlot<frontSlots){
    let slot=isFree(arr[preferredSlot])?preferredSlot:-1;
    for(let distance=1;slot<0&&distance<frontSlots;distance++){
      const left=preferredSlot-distance;
      const right=preferredSlot+distance;
      if(left>=0&&isFree(arr[left])) slot=left;
      else if(right<frontSlots&&isFree(arr[right])) slot=right;
    }
    if(slot>=0){
      unit.lane='front';
      unit._battleSlot=slot;
      arr[slot]=unit;
      return slot;
    }
    return -1;
  }
  for(let i=frontSlots-1;i>=0;i--){
    if(isFree(arr[i])){
      unit.lane='front';
      unit._battleSlot=i;
      arr[i]=unit;
      return i;
    }
  }
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(!arr[i]||arr[i].hp<=0||arr[i]._isObject||arr[i]._isSoul){
      unit.lane='rear';
      unit._battleSlot=i;
      arr[i]=unit;
      return i;
    }
  }
  return -1;
}
// 開戦時のパネル出撃（isInitialDeploy）とは異なり、戦闘中に実際に発生した召喚
// （効果による召喚・仲間化・蘇生等）は必ず前衛に置く。後衛には絶対に溢れさせない
// （前衛が満杯なら召喚自体を諦める）。
// 戦闘中に敵（エリート・ボス）がキャラクターを召喚する場合、召喚されたキャラクターの
// ATK/HPは召喚元自身のステータスの80%とする。HPは被ダメージで揺れないよう最大HPを基準にする。
const ENEMY_SUMMON_STAT_RATIO=0.8;
function _enemySummonStats(source){
  if(!source) return null;
  const baseHp=Number(source.maxHp)||Number(source.hp)||0;
  return {
    atk:Math.max(0,Math.round((Number(source.atk)||0)*ENEMY_SUMMON_STAT_RATIO)),
    hp:Math.max(1,Math.round(baseHp*ENEMY_SUMMON_STAT_RATIO)),
  };
}

// 前衛の左端／右端へ召喚する（placement:{frontEdge:'left'|'right'}）。
// 端が埋まっている場合は前衛全体を反対側へ1つ寄せて端を空ける。
function _summonMidBattleFrontEdge(unit, isEnemySide, edge){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 盤面枠が空いていても、陣営の総数上限に達している召喚は生成しない。
  // ここを通る端寄せ召喚だけ上限判定を持たないと、生成直後に左端へ一瞬現れる。
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  const front=arr.slice(0,frontSlots).filter(u=>!isFree(u));
  if(front.length>=frontSlots) return -1;
  if(edge==='left') front.unshift(unit); else front.push(unit);
  for(let i=0;i<frontSlots;i++) arr[i]=front[i]||null;
  front.forEach((u,i)=>{ u.lane='front'; u._battleSlot=i; });
  return edge==='left'?0:front.length-1;
}

function _summonMidBattleAllyFront(unit, isEnemySide, placement){
  // 「前衛の両端へ」のように置き場所が決まっている召喚は専用の配置に回す。
  if(placement&&placement.frontEdge) return _summonMidBattleFrontEdge(unit,isEnemySide,placement.frontEdge);
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);

  // 空き扱いにできる枠（未使用・戦闘不能・オブジェクト・ソウル）。
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  // 置いた位置を_battleSlotへ書き戻す。compactBattleUnits()は_battleSlotを持つユニットだけを
  // その枠へ固定し、持たないユニットは行の中央へ寄せ直す。召喚したユニットに_battleSlotが
  // 無いと、直後のrequestBattleCompact()で中央へ動かされ「効果元の左に出る」「戦闘中に
  // 並び順が入れ替わる」ことになる。挿入で他のユニットもずれるため、前衛全体を振り直す。
  const rebuildFront=(front)=>{
    for(let i=0;i<frontSlots;i++) arr[i]=front[i]||null;
    front.forEach((u,i)=>{ u.lane='front'; u._battleSlot=i; });
  };

  // 戦闘中の召喚は前衛へ置く。前衛の効果元だけは右隣への挿入を優先し、
  // 後衛の効果元からの召喚は前衛右端へ回す（後衛には置かない）。
  const source=placement&&placement.rightOf;
  if(source){
    // コアイベントから渡るsourceは、state.unitsの実体またはスナップショット由来の
    // 別オブジェクトになり得る。参照一致だけで検索すると、sourceIdx=-1になって
    // rightOfSourceが右端／後衛へフォールバックし、召喚順と表示順が崩れる。
    let sourceIdx=arr.indexOf(source);
    if(sourceIdx<0&&source.id!=null) sourceIdx=arr.findIndex(u=>u&&u.id===source.id);
    // 明示されたrightOfSourceを解決できない場合に、後衛／右端へ落とすと
    // 召喚イベントの親子順と画面上の位置が壊れる。位置指定付き召喚は
    // 別位置へ置かず、呼び出し側の上限・配置失敗処理へ返す。
    if(sourceIdx<0) return -1;
    const actualSource=sourceIdx>=0?arr[sourceIdx]:source;
    unit._summonedFromId=String(actualSource.id||'');
    const sourceIsRear=(actualSource.lane||'front')==='rear';
    if(sourceIsRear&&sourceIdx>=frontSlots){
      const rear=arr.slice(frontSlots,frontSlots+(max-frontSlots)).filter(u=>!isFree(u));
      if(rear.length>=max-frontSlots) return -1;
      const logicalSource=rear.indexOf(actualSource);
      if(logicalSource>=0){
        rear.splice(logicalSource+1,0,unit);
        for(let i=0;i<max-frontSlots;i++) arr[frontSlots+i]=rear[i]||null;
        rear.forEach((u,i)=>{ u.lane='rear'; u._battleSlot=frontSlots+i; });
        return frontSlots+logicalSource+1;
      }
    }
    if(!sourceIsRear&&sourceIdx>=0){
      // ① 効果元より右に空きがあれば、間の味方を右へ1つずつ寄せて右隣へ挿入する。
      const front=arr.slice(0,frontSlots).filter(u=>!isFree(u));
      if(front.length>=frontSlots) return -1;
      const logicalSource=front.indexOf(actualSource);
      if(logicalSource<0) return -1;
      let insertAt=placement&&placement.leftOf?logicalSource:logicalSource+1;
      // rightOfSource の連続召喚は、同じ親から直前までに追加された召喚体の
      // 後ろへ置く。これにより Kitty→Cat1→Cat2 の時系列を保持し、毎回親の
      // 直後へ差し込んで Cat2→Cat1 になる逆転を防ぐ。
      if(!(placement&&placement.leftOf)){
        while(insertAt<front.length&&front[insertAt]&&
          String(front[insertAt]._summonedFromId||'')===String(actualSource.id||'')) insertAt++;
      }
      front.splice(insertAt,0,unit);
      rebuildFront(front);
      // 呼び出し側が次の召喚の基準に使うのは、効果元ではなく今回の
      // 召喚体の実スロット。leftOf の場合に source+1 を返すと、コアの
      // 連続召喚が「元の右隣」を再利用し、表示順とイベント順が崩れる。
      return insertAt;
    }
  }

  // 指輪など、効果元の位置を持たない召喚は一番右の空き枠へ置く。
  const front=arr.slice(0,frontSlots).filter(u=>!isFree(u));
  if(front.length>=frontSlots) return -1;
  front.push(unit);
  rebuildFront(front);
  return front.length-1;
}

function _summonPanelUnitToRear(unit, isEnemySide, preferredSlot){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  // 表示待ちの召喚体も生成済みとして上限枠を占有する。
  const liveCount=arr.filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  if(liveCount>=max) return -1;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  if(Number.isInteger(preferredSlot)&&preferredSlot>=frontSlots&&preferredSlot<frontSlots+rearSlots){
    let slot=isFree(arr[preferredSlot])?preferredSlot:-1;
    for(let distance=1;slot<0&&distance<rearSlots;distance++){
      const left=preferredSlot-distance;
      const right=preferredSlot+distance;
      if(left>=frontSlots&&isFree(arr[left])) slot=left;
      else if(right<frontSlots+rearSlots&&isFree(arr[right])) slot=right;
    }
    if(slot>=0){
      unit.lane='rear';
      unit._battleSlot=slot;
      arr[slot]=unit;
      return slot;
    }
    return -1;
  }
  // renderField() は後衛を配列順（左→右）に描画する。右端の物理スロットから
  // 逆順に埋めると、2体目以降の召喚で先に出たキャラクターが左へ飛び、
  // 召喚イベント順と見た目の順序が逆転する。後衛も論理列を組み直し、
  // 新しい召喚体を右側へ追加する。
  const rear=arr.slice(frontSlots,frontSlots+rearSlots)
    .filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul);
  if(rear.length>=rearSlots) return -1;
  rear.push(unit);
  for(let i=0;i<rearSlots;i++) arr[frontSlots+i]=rear[i]||null;
  rear.forEach((u,i)=>{
    u.lane='rear';
    u._battleSlot=frontSlots+i;
  });
  return frontSlots+rear.length-1;
}

function _battleSlotForMainBoardSlot(idx,toRear){
  const max=MAX_ALLIES||14;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.max(0,max-frontSlots);
  const col=Math.max(0,Math.min(4,Number(idx)%5));
  if(toRear){
    if(rearSlots<=0) return -1;
    const mapped=rearSlots>=5
      ?Math.floor((rearSlots-5)/2)+col
      :Math.round(col*Math.max(0,rearSlots-1)/4);
    return frontSlots+Math.max(0,Math.min(rearSlots-1,mapped));
  }
  const mapped=frontSlots>=5
    ?Math.floor((frontSlots-5)/2)+col
    :Math.round(col*Math.max(0,frontSlots-1)/4);
  return Math.max(0,Math.min(frontSlots-1,mapped));
}

async function applyNewPanelBattleStart(options){
  const deferOpeningEffects=options===true||!!(options&&options.deferOpeningEffects);
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const equip=board&&Array.isArray(board.equipment)?board.equipment:[];
  // 共鳴の力：開戦時に場に出た同色の味方全員へ+3/+3を与える。対象キャラの出撃が全て終わった後に
  // まとめて適用するため、該当パネルの色だけここに集めておく（deploySlotGroup内では未出撃の味方に
  // 反映漏れが起きるため）。
  // メイン置き場①〜⑦の物理位置がそのまま出撃順を決める。前衛①②③④、後衛⑤⑥⑦。
  // 開戦召喚は魔導板の列に対応する希望スロットへ配置する。
  // 「どのスロットが出撃するか・レーン・体数・並び順」は共通ビルダー（battle/formation.js）が決める。
  // ここで独自に組み立て直さないこと（オンライン側と二重実装になり、レーンと出撃順が食い違った）。
  // persistEternal=true：永劫の力の+1/+1をカード本体へ永久加算する（オンラインはfalse）。
  _recordBattleTrace('opening_panel_scan',{equip:equip.map((p,i)=>p?{i,name:p.name,category:p.category}:null),
    frontSlots:[...((typeof MAIN_BOARD_FRONT_SLOTS!=='undefined'&&MAIN_BOARD_FRONT_SLOTS)||[1,3])],
    rearSlots:[...((typeof MAIN_BOARD_REAR_SLOTS!=='undefined'&&MAIN_BOARD_REAR_SLOTS)||[10,12,14])]});
  const formation=typeof buildBoardFormation==='function'
    ?buildBoardFormation(board,{persistEternal:true}):{entries:[]};
  for(const entry of formation.entries){
    const summoned=entry.unit;
    const panel=entry.panel;
    // コピー召喚先にも強化カードの効果全文がフロー表示されるよう、寄与している強化パネルを複製して引き継ぐ
    if(entry.contributingPanels.length){
      summoned.equipment=_panelSummonDisplayEquipment(panel,entry.contributingPanels);
    }
    const placed=entry.toRear
      ?_summonPanelUnitToRear(summoned,false,summoned._battleSlot)
      :_summonPanelUnitToFront(summoned,false,summoned._battleSlot);
    if(placed>=0){
      _recordBattleTrace('opening_summon_placed',{sourceId:panel.id||panel.name,unitId:summoned.id,name:summoned.name,
        liveCount:(G.allies||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length});
      // 1枚目は通常出撃、複製分は「戦闘中に召喚された」扱いにする。
      // ツインデビル等のコピーでもリッチ等の召喚時効果を確実に完了させる。
      await _afterPanelSummon(summoned,false,entry.copyIndex===0);
      log(`${panel.name}が${_lc(summoned.name,false)}を召喚した。`,'good');
    }else{
      _recordBattleTrace('opening_summon_rejected',{sourceId:panel.id||panel.name,unitId:summoned.id,name:summoned.name,
        liveCount:(G.allies||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length,
        max:MAX_ALLIES||14});
    }
  }
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0||!Number.isInteger(u._mainBoardSlot)) return;
    _applyAdjacentPanelEnhancements(u,_collectAdjacentEnhancements(board,u._mainBoardSlot));
  });
  compactBattleUnits();
  // 全キャラクターの配置が確定したのでここで一度描画し、封印解放等のVFXが正しい座標
  // （getBoundingClientRect）を取得できるようDOMのレイアウト確定を待つ。
  if(typeof renderAll==='function') renderAll();
  await _awaitFrame(); await sleep(50);
  if(deferOpeningEffects) return;
  await _finishNewPanelBattleStartEffects();
}

// 開戦時の戦闘ルールも共通コアへ委譲する。配置・封印解放のDOM演出だけは
// この関数の後段で既存処理へ戻す。
async function _finishNewPanelBattleStartEffects(){
  _recordBattleTrace('opening_core_start',{allyCount:(G.allies||[]).filter(Boolean).length});
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    deferManaThresholdEffects:true,
    _deferLichSummons:true,
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{
    localEvents.push(ev);
    if(ev&&ev.type==='mana_gain') _recordBattleTrace('mana_gain_generated',{unitId:ev.unitId||null,side:ev.side,amount:Number(ev.amount)||0,reason:ev.reason||''});
    if(ev&&ev.type==='summon') _recordBattleTrace('summon_event_generated',{unitId:ev.unit&&ev.unit.id||null,sourceId:ev.sourceId||null,side:ev.side,placement:ev.placement||''});
    if(ev&&ev.type==='mana_threshold') _recordBattleTrace('mana_threshold_generated',{unitId:ev.unitId||null,side:ev.side,cost:ev.cost,deferred:!!ev.deferred,desc:ev.desc||''});
    if(ev&&ev.type==='summon_rejected') _recordBattleTrace('summon_rejected',{
      sourceId:ev.sourceId||null,name:ev.name||'',liveCount:ev.liveCount,max:ev.max,reason:ev.reason||''
    });
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  const applyHit=(source,target,amount,counter)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  };
  try{
    // 開戦処理は coreRunOpening() が唯一の実装。**ここへ手順を書き戻さないこと。**
    // 以前はPvEとオンラインで同じ手順が別々に書かれており、
    // 「生命の力」のHP2倍のようにPvEにしか無い／コアにしか無い工程があった。
    const _openingResolveSeals=()=>{ /* PvEの封印解放は演出付きで後段の _resolveSeals() が行う */ };
    coreRunOpening(state,coreMathRng,emit,applyHit,_openingResolveSeals);
    _recordBattleTrace('opening_effects_done',{life:_currentBattleLife(),
      stateLife:Number(state.life&&state.life.p1)||0,
      味方:(state.units.p1||[]).filter(Boolean).filter(u=>u.hp>0)
        .map(u=>`${u.name}:${u.atk}/${u.hp}`).join(' ')});
    _syncCoreResourcesToG(state);
  }finally{
    state._openingPhase=false;
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  // マナ閾値による変身は、名前だけでなく変身先カードの能力・キーワードも反映する。
  localEvents.filter(ev=>ev&&ev.type==='transform'&&!ev.from).forEach(ev=>{
    const target=(ev.side==='p1'?G.allies:G.enemies).find(u=>u&&u.id===ev.unitId);
    if(target){
      // 共通コアの変身スナップショットをそのまま反映する。名前・数値だけを
      // 書き換えると、ドラゴネット／バンダースナッチの絵・枠・説明が旧形態に残る。
      if(ev.unit) Object.assign(target,ev.unit);
      else _setBattleUnitForm(target,ev.name,ev.atk,ev.maxHp,target.color);
    }
  });
  const spawned=[...state.units.p1,...state.units.p2].filter(u=>u&&!before.has(u)&&!u._corePendingSummon);
  for(const spawnedUnit of spawned){
    const targetList=state.units.p1.includes(spawnedUnit)?G.allies:G.enemies;
    if(!targetList.includes(spawnedUnit)) targetList.push(spawnedUnit);
    await _afterPanelSummon(spawnedUnit,targetList===G.enemies,true,true);
  }
  _recordBattleTrace('opening_core_events',{count:localEvents.length,types:localEvents.map(e=>e&&e.type).filter(Boolean)});
  await _flushCorePveHitEvents(state,localEvents,before);
  // 生命の力のHP2倍は coreRunOpening() の中で解決済み。
  // ここで再度呼ぶと2回適用され、オンラインと食い違う。
  if(typeof renderAll==='function') renderAll();
  await _resolveSeals();
  _recomputeDynamicPanelStats();
}

// 装備中の指輪による開戦効果をまとめて処理する。
// 常時効果はいかなるときも最優先される（開戦効果や封印解放より先に、封印の有無を問わず適用する）ため、
// 指輪の「常時」効果（色+10/+10）だけを分離し、_initSealStates()/_applyNewOpeningEffects()より前に呼ぶ。
function _applyRingPassiveBattleStartEffects(){
  const rings=_effectiveRings();
  if(!rings.length) return;
  // 赤/青/緑/黄/紫の瞳の指輪：常時：全てのX色キャラクターは+10/+10を得る。（自陣営・敵陣営問わず該当色全員）
  const colorRingMap={'赤い瞳の指輪':'赤','青い瞳の指輪':'青','緑の瞳の指輪':'緑','黄の瞳の指輪':'黄','紫の瞳の指輪':'紫'};
  rings.forEach(r=>{
    const color=colorRingMap[r&&r.name];
    // 常時効果はいかなるときも最優先されるため、封印中のキャラクターにも適用する（includeSealed=true）。
    if(color) _buffAllBattleColor(color,10,10,r.name,false,true);
  });
  // 虹の瞳の指輪：常時：全ての味方は+X/+Xを得る。
  // Xは味方に存在する異なる色の数×3（最大5色）。
  if(rings.some(r=>r&&r.name==='虹の瞳の指輪')){
    const colors=new Set();
    (G.allies||[]).forEach(unit=>{
      if(!unit||unit.hp<=0||unit._isObject||unit._isSoul) return;
      String(unit.color||'').split(/[／/、,，\s]+/).map(_colorKey).filter(Boolean).forEach(c=>colors.add(c));
    });
    const x=Math.min(5,colors.size)*3;
    if(x>0){
      (G.allies||[]).forEach(unit=>{
        if(unit&&unit.hp>0&&!unit._isObject&&!unit._isSoul) _addBattleStats(unit,x,x,'ally',true);
      });
      log(`虹の瞳の指輪の効果で全ての味方は+${x}/+${x}を得た。`,'good');
    }
  }
}
// 数値計算は「足し算引き算を先に行い、最後に掛け算を行う」ルールに従うため、
// 加算系（ダメージ・キーワード付与）を先に処理し、乗算系（HP2倍・ATK2倍）は最後に行う。
// 指輪の「開戦」効果はキャラクターの開戦効果と同格（常時の次に優先）のため、
// _applyRingPassiveBattleStartEffects()より後、_applyNewOpeningEffects()と同じタイミング帯で処理する。
async function _applyRingBattleStartEffects(){
  const rings=_effectiveRings();
  if(!rings.length) return;
  // 苦行の指輪：開戦：全ての味方に1ダメージを与える。
  const painCount=rings.filter(r=>r&&r.name==='苦行の指輪').length;
  for(let i=0;i<painCount;i++){
    const entries=(G.allies||[]).filter(_canReceiveBattleEffect).map(t=>({unit:t,side:'ally',amount:1,source:null}));
    if(entries.length){
      await applyDamageBatch(entries,{effect:true});
      log('苦行の指輪の効果で全ての味方に1ダメージを与えた。','good');
    }
  }
  // 威圧の指輪：開戦：全ての敵に弱体2を与える。（タイタンと同じ処理）
  if(rings.some(r=>r&&r.name==='威圧の指輪')){
    (G.enemies||[]).forEach(e=>{
      if(e&&e.hp>0&&!_isAilmentImmune(e)) e.weaken=(e.weaken||0)+2;
    });
    log('威圧の指輪の効果で全ての敵は弱体2を得た。','good');
  }
  // 神速の指輪：開戦：左端のキャラクターのATKを2倍にし、先攻になる。
  // （ATKの2倍化は最終値への乗算のため、上記の加算処理より後に行う。「先攻になる」はbattlePhase()側で判定する）
  const speedRing=rings.find(r=>r&&(r.name==='神速の指輪'||r.name==='疾風の指輪'));
  if(speedRing){
    const leftmost=(G.allies||[]).find(u=>u&&u.hp>0);
    if(leftmost){
      leftmost.atk=(leftmost.atk||0)*2;
      leftmost.baseAtk=(leftmost.baseAtk||0)*2;
      log(`${speedRing.name}の効果で${_lc(leftmost.name,false)}のATKが2倍になった。`,'good');
    }
  }
  // 聖騎士の指輪：開戦：全ての味方のHPを2倍にする。（乗算は最後に行うルールのため、上記加算確定後の最終HPに乗算する）
  if(rings.some(r=>r&&r.name==='聖騎士の指輪')){
    (G.allies||[]).forEach(u=>{
      if(!_canReceiveBattleEffect(u)) return;
      u.hp=(u.hp||0)*2;
      u.maxHp=Math.max(u.hp,(u.maxHp||0)*2);
    });
    log('聖騎士の指輪の効果で全ての味方のHPが2倍になった。','good');
  }
}


// includeSealed=true の場合は封印中のキャラクターにも適用する（呼び出し元が「常時」効果の場合に指定する）。
function _buffAllBattleColor(color, atk, hp, sourceName, unitIsEnemy, includeSealed){
  const c=_normalizeColorTextForBattle(color);
  _allBattleCharacters().forEach(u=>{
    const eligible=includeSealed?!!(u&&u.hp>0&&!u._isObject&&!u._isSoul):_canReceiveBattleEffect(u);
    if(eligible&&String(u.color||'')===c) _addBattleStats(u,atk,hp,_battleSideOfUnit(u),includeSealed);
  });
  log(`${_lc(sourceName||c,unitIsEnemy)}の効果で全ての${c}キャラクターは+${atk}/+${hp}を得た。`,unitIsEnemy?'bad':'good');
}

function _grantRandomItem(sourceName, options){
  const free=!!(options&&options.free);
  const arr=G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:new Array(4).fill(null);
  while(arr.length<4) arr.push(null);
  const idx=arr.findIndex(c=>!c);
  if(idx<0){
    log(`${_lc(sourceName||'錬成',false)}はアイテム枠が満杯のため発動しなかった。`,'sys');
    return false;
  }
  const card=(typeof drawItems==='function'?drawItems(1,5)[0]:null)||clone((typeof ITEM_POOL!=='undefined'?ITEM_POOL:[])[0]||null);
  if(!card) return false;
  // 錬成はアイテムを購入して得る扱い。通常の報酬カードは _buyPrice=0 なので、
  // その場合も最低1Gを消費し、複数枚で所持金不足になった時点で停止する。
  const price=Math.max(1,Number(card._buyPrice|| (typeof calcBuyPrice==='function'?calcBuyPrice(card):1)));
  if(!free&&Number(G.gold||0)<price){
    log(`${_lc(sourceName||'錬成',false)}は所持金不足のため発動しなかった。`,'sys');
    return false;
  }
  if(!free) G.gold=Number(G.gold||0)-price;
  arr[idx]=card;
  if(typeof updateHUD==='function') updateHUD();
  log(`${_lc(sourceName||'錬成',false)}の効果で${card.name}を得た。`,'good');
  return true;
}

// 開戦効果は次の順で処理する（stageで段階を指定する。未指定なら全部）。
//   'add'   … 戦闘力の足し算・引き算
//   'mul'   … 戦闘力の掛け算・割り算
//   （この間に生命の力マスのHP2倍が入る＝_applyLifePanelPowerHpDouble）
//   'other' … それ以外の開戦効果
async function _applyNewOpeningEffects(stage){
  const want=s=>!stage||stage===s;
  let alchemyBlocked=false;
  for(const unit of _openingBattleCharacters()){
    if(!_canReceiveBattleEffect(unit)) continue;
    const isEnemySide=(G.enemies||[]).includes(unit);
    if(isEnemySide&&_isUnitSilencedByScroll(unit)) continue;
    const openingRepeats=_openingEffectRepeatCount(unit);
    const hasName=name=>_unitHasEffectName(unit,name);
    for(let trigger=0;trigger<openingRepeats&&unit&&unit.hp>0&&!_isSealed(unit);trigger++){
      const side=isEnemySide?'enemy':'ally';
      const wild=Math.max(_unitEffectPanelCount(unit,'野生の力'),_unitKeywordCount(unit,'野生の力'));
      if(want('other')&&wild&&!unit._openingDuplicate&&trigger===0) _gainMana(wild*2,unit);
      // 生贄人形で封印を消したキャラクターは封印解放が起きないため、
      // 解放効果をここで開戦効果として発動する。
      if(want('other')&&unit._releaseConvertedToOpening) await _applyReleaseEffect(unit,isEnemySide,[]);
      if(want('add')&&(_unitHasKeyword(unit,'奇妙な絆')||_unitEffectPanelCount(unit,'奇妙な絆')>0)){
        const allies=isEnemySide?G.enemies:G.allies;
        const x=allies.filter(a=>_canReceiveBattleEffect(a)&&(_unitHasKeyword(a,'奇妙な絆')||_unitEffectPanelCount(a,'奇妙な絆')>0)).length;
        if(x) _addBattleStats(unit,x,x,side);
      }
      const roarCount=want('mul')?_unitEffectPanelCount(unit,'咆哮'):0;
      for(let i=0;i<roarCount;i++){
        const atk=Math.max(0,Number(unit.atk)||0);
        if(atk) _addBattleStats(unit,atk,0,side);
      }
      const majestyCount=want('mul')?_unitEffectPanelCount(unit,'威光'):0;
      for(let i=0;i<majestyCount;i++){
        // 「HPを2倍」を枚数分繰り返す（2枚なら4倍）。毎回その時点のmaxHpを足す。
        const hp=Math.max(0,Number(unit.maxHp)||0);
        if(hp) addUnitHp(unit,hp,side);
      }
      if(want('add')&&hasName('ガーゴイル')){
        // 「全ての紫キャラに+1/+1」の基本発動1回＋接続している強化カードの数だけ追加で繰り返す
        const repeat=1+_connectedEnhancementCount(unit);
        const bonus=_combatModifierBonus(unit,isEnemySide);
        for(let i=0;i<repeat;i++) _buffAllBattleColor('紫',1+bonus,1+bonus,unit.name,isEnemySide);
      }
      if(want('add')&&hasName('ウェンディゴ')){
        const repeat=Math.max(1,Math.floor((unit.maxHp||unit.hp||0)/10));
        const foes=isEnemySide?G.allies:G.enemies;
        for(let i=0;i<repeat;i++){
          _livingCombatUnits(foes).forEach(t=>_addBattleStats(t,-1,-1,isEnemySide?'ally':'enemy'));
        }
        log(`${_lc(unit.name,isEnemySide)}の効果で全ての敵は-${repeat}/-${repeat}を得た。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('リリス')){
        const allies=isEnemySide?G.enemies:G.allies;
        const repeat=Math.max(1,Math.floor((unit.atk||0)/10));
        for(let i=0;i<repeat;i++){
          const candidates=_livingCombatUnits(allies);
          if(!candidates.length) break;
          const target=candidates[Math.floor(Math.random()*candidates.length)];
          if(!_isAilmentImmune(target)) target.shield=(target.shield||0)+1;
        }
        log(`${_lc(unit.name,isEnemySide)}の効果でランダムな味方に結界を付与した。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('ミテーラ')){
        // 3体を個別に詰め直すと、各FLIPアニメーションの途中で次のカードが追加され、
        // 前衛の既存カード上に召喚カードが重なって見える。配置を確定してから一度だけ描画する。
        for(let i=0;i<3;i++) await _spawnAdhocAllyUnit('緑ペリカン',1,1,isEnemySide,{frontEdge:'right',deferCompact:true});
        requestBattleCompact();
        log(`${_lc(unit.name,isEnemySide)}の効果で「緑ペリカン」を3体召喚した。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('ジャッカロープ')){
        const allies=isEnemySide?G.enemies:G.allies;
        const x=(allies||[]).filter(a=>_canReceiveBattleEffect(a)&&String(a.color||'')==='緑').length;
        if(x>0) _gainMana(x,unit);
      }
      if(want('other')&&hasName('エレメンタル')){
        const allies=isEnemySide?G.enemies:G.allies;
        // 条件判定は「効果を受けられるか」ではなく、場に生存している
        // 味方キャラクターの色で行う。封印中のキャラも色の存在として数え、
        // シートで旧表記される「茶」は「黄」として扱う。
        const colors=new Set();
        (allies||[]).forEach(a=>{
          if(!a||a.hp<=0||a._isObject||a._isSoul) return;
          const raw=String(a.color||'');
          raw.split(/[\/／、,，\s]+/).map(_normalizeColorTextForBattle)
            .filter(Boolean).forEach(c=>colors.add(c));
        });
        if(['赤','青','緑','黄','紫'].every(c=>colors.has(c))){
          _grantUnitKeyword(unit,'生命吸収');
          log(`${_lc(unit.name,isEnemySide)}は生命吸収を得た。`,isEnemySide?'bad':'good');
        }
      }
      if(want('add')&&hasName('緑域の隠者"ヴィーザル"')){
        const allies=isEnemySide?G.enemies:G.allies;
        allies.filter(_canReceiveBattleEffect).forEach(a=>_addBattleStats(a,4,4,side));
        log(`${_lc(unit.name,isEnemySide)}の効果で全ての味方は+4/+4を得た。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('金床の賢者"シンドリ"')){
        (isEnemySide?G.enemies:G.allies).filter(_canReceiveBattleEffect).forEach(a=>_grantUnitKeyword(a,'貫通'));
        log(`${_lc(unit.name,isEnemySide)}の効果で全ての味方は貫通を得た。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('反逆の熾火"ヘイズ"')){
        (isEnemySide?G.enemies:G.allies).filter(_canReceiveBattleEffect).forEach(a=>_grantUnitKeyword(a,'強靭1'));
        log(`${_lc(unit.name,isEnemySide)}の効果で全ての味方は強靭1を得た。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('原初の大蛇"エイトルヴォルム"')){
        const foes=isEnemySide?G.allies:G.enemies;
        foes.filter(_canReceiveBattleEffect).forEach(a=>{if(!_isAilmentImmune(a)) a.poison=(a.poison||0)+12;});
        log(`${_lc(unit.name,isEnemySide)}の効果で全ての敵に毒12を与えた。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('古王"フォルセティ"')){
        (isEnemySide?G.enemies:G.allies).filter(_canReceiveBattleEffect).forEach(a=>{a.shield=(a.shield||0)+1;});
        log(`${_lc(unit.name,isEnemySide)}の効果で全ての味方は結界1を得た。`,isEnemySide?'bad':'good');
      }
      if(want('other')&&hasName('刻を織る者"ウルズ・ラグナ"')){
        if(G._waveLife!=null) G._waveLife=1;
        G.life=1;
        _fadeBattleLife();
        if(typeof updateHUD==='function') updateHUD();
        log(`${_lc(unit.name,true)}の効果でプレイヤーのライフが1になった。`,'bad');
      }
      if(want('other')&&unit._releaseConvertedToOpening){
        await _applyReleaseEffect(unit,isEnemySide,[]);
      }
      const alchemyCount=want('other')?Math.max(_unitKeywordCount(unit,'錬成'),_unitEffectPanelCount(unit,'錬成')):0;
      for(let i=0;i<alchemyCount&&!alchemyBlocked;i++){
        if(!_grantRandomItem(unit.name)) alchemyBlocked=true;
      }
    }
  }
  if(want('other')) await _resolveSeals();
}

// 生命の力マス：置いたキャラクターのHPを2倍にする。
// 開戦の戦闘修正（足し引き → 掛け割り）が全て終わった後に適用することで、
// 修正後の最終HPが2倍になる（基礎値を2倍してから加算されるのではない）。
// 旧PvE専用の実装。coreRunOpening() へ移したため呼び出し元は無い。
// **復活させないこと。** コアと二重に適用される。
function _applyLifePanelPowerHpDouble(){
  return;
  if(typeof _mapPanelPowerAt!=='function') return;
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0||u._isObject||u._isSoul) return;
    if(!Number.isInteger(u._mainBoardSlot)) return;
    if(_mapPanelPowerAt(u._mainBoardSlot)!=='life') return;
    if(u._lifePanelDoubled) return;   // 同一戦闘での二重適用を防ぐ
    u._lifePanelDoubled=true;
    const add=Math.max(0,Number(u.maxHp)||0);
    if(add) addUnitHp(u,add,'ally');
  });
}

// ボーンチャリオット等、攻撃前に隣接キャラクターの死亡効果を発動する能力を持つユニットについて、
// 対象に実際に発動する死亡効果が無い（＝何も起こらない）場合は演出の一時停止を行わないための判定。
// _applyDeathKeywordEffects()が実際に何か処理する条件と対応させている。

async function _applyDeathKeywordEffects(unit, unitIsEnemy){
  // コア駆動の戦闘では coreBattleStep() が死亡トリガ（死亡効果・観測・復活）を
  // 既に解決している。ここで再度呼ぶと死亡効果が二重に発動する。
  // 演出は死亡イベントの再生側が担当する。
  if(G._coreDrivenBattle) return;
  if(!unit) return;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    // 死亡効果内のマナ閾値も、他の戦闘トリガと同じく逆再生開始まで保留する。
    deferManaThresholdEffects:true,
    // この関数は死亡1件ごとに一時コア状態を作る。累積型の死亡観測値は
    // G側へ橋渡ししないと、各死亡で0に戻ってしまう。
    _enemyDeaths:unitIsEnemy?Math.max(0,(Number(G._enemyDeathsThisBattle)||0)-1):0,
    _eidolonDeathCount:Number(G._eidolonDeathCount)||0,
    _genericAllyDeaths:Number(G._genericAllyDeaths)||0,
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const goldBefore=Math.max(0,Number(G.gold)||0);
  const emit=ev=>{
    localEvents.push(ev);
    // 死亡処理は一時コアstateで解決するため、血だけはイベント発行時点で
    // PvEのグローバル状態へ反映する。後段の演出待ちや盤面整理で処理が
    // 中断されても、封印解放判定が参照するカウンターを失わないようにする。
    if(ev&&ev.type==='blood_set'&&ev.side==='p1'){
      G._blood=Math.max(0,Number(ev.amount)||0);
      if(typeof renderBattleCounters==='function') renderBattleCounters();
    }
    if(ev&&ev.type==='gold_gain'&&ev.unitId===unit.id&&unit._lastVisualRect){
      ev.lastVisualRect={...unit._lastVisualRect};
    }
    if(ev&&(ev.type==='mana_gain'||ev.type==='gold_gain')) _recordBattleTrace(`${ev.type}_generated`,{unitId:ev.unitId||null,side:ev.side,amount:Number(ev.amount)||0,reason:ev.reason||''});
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  const applyHit=(source,target,amount,counter)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  };
  try{
      coreTriggerDeath(unit,state,emit);
      coreApplyDeathEffects(unit,state,coreMathRng,emit,applyHit);
      coreApplyDeathObservers(unit,state,coreMathRng,emit,applyHit);
      // side は引数に無い。死亡ユニットの陣営（unitIsEnemy）から解決する。
      // 未定義参照のままだと死亡処理で例外になり、戦闘ループがそこで止まる。
      const _deathSide=unitIsEnemy?'p2':'p1';
      _recordBattleTrace('mana_threshold_scan',{phase:'death',unitId:unit.id,mana:Number(state.resources[_deathSide]?.mana)||0,side:_deathSide});
      coreApplyManaThresholdEffects(state,coreMathRng,emit,applyHit);
      if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
      // 次の死亡処理へ累積カウンタを引き継ぐ。敵死亡数は
      // processEnemyDeath() が現在の死亡を加算済みなのでG側をそのまま保持する。
      G._eidolonDeathCount=Math.max(0,Number(state._eidolonDeathCount)||0);
      G._genericAllyDeaths=Math.max(0,Number(state._genericAllyDeaths)||0);
    // gold_gain はコアで確定済みだが、画面上の反映は死亡固有VFXの開始時に行う。
    G.gold=goldBefore;
    if(typeof renderManaHud==='function') renderManaHud();
  }finally{
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  const spawned=[...state.units.p1,...state.units.p2].filter(u=>u&&!before.has(u)&&!u._corePendingSummon);
  for(const spawnedUnit of spawned){
    const targetList=state.units.p1.includes(spawnedUnit)?G.allies:G.enemies;
    if(!targetList.includes(spawnedUnit)) targetList.push(spawnedUnit);
    await _afterPanelSummon(spawnedUnit,targetList===G.enemies,false,true);
  }
  await _flushCorePveHitEvents(state,localEvents,before);
}

function _onEnemyDeathPanelSummons(deadEnemy){
}

async function _onAllyInjuredByPanel(unit,actualDmg){
  if(!unit||unit.hp<=0) return false;
  let fired=false;
  const healCount=_enhancementCount(unit,'治癒能力');
  if(healCount>0){
    const heal=2*_unitEffectScale(unit,'治癒能力')*healCount;
    unit.hp+=heal;
    unit.maxHp=(unit.maxHp||0)+heal;
    log(`${_lc(unit.name,false)}の治癒能力が発動した。HP+${heal}を得た。`,'good');
    _playCardEffectSfx('C003');
    void _playCardEffectVfx('C003',[unit],{gateMs:0,waitForFinish:false});
    fired=true;
  }
  const hasName=name=>_unitHasEffectName(unit,name);
  const name=unit.name;
  if(hasName('ゴーレム')){
    _addBattleStats(unit,2,2,'ally');
    log(`${_lc(unit.name,false)}の効果で+2/+2を得た。`,'good');
    _playCardEffectSfx('C003');
    void _playCardEffectVfx('C003',[unit],{gateMs:0,waitForFinish:false});
    fired=true;
  }
  if(hasName('ギガンテス')){
    const x=Math.max(0,Number(actualDmg)||0);
    if(x>0){
      (G.allies||[]).forEach(a=>{
        if(_canReceiveBattleEffect(a)) _addBattleStats(a,x,0,'ally');
      });
      log(`${_lc(unit.name,false)}の効果で全ての味方はATK+${x}を得た。`,'good');
      fired=true;
    }
  }
  if(hasName('フォルモール')){
    unit.keywords=[...(unit.keywords||[]),'強靭1'];
    log(`${_lc(unit.name,false)}の効果で強靭1を得た。`,'good');
    fired=true;
  }
  if(hasName('ブラウニー')){
    (G.allies||[]).forEach(a=>{ if(_canReceiveBattleEffect(a)) addUnitHp(a,2,'ally'); });
    log(`${_lc(unit.name,false)}の効果で全ての仲間のHPが+2された。`,'good');
    fired=true;
  }
  if(hasName('ケットシー')){
    await _spawnAdhocAllyUnit('黄ナイトキャット',1,2,false,{rightOf:unit});
    log(`${_lc(unit.name,false)}の効果で「黄ナイトキャット」を召喚した。`,'good');
    fired=true;
  }
  if(hasName('エルフ')){
    unit.shield=(unit.shield||0)+1;
    log(`${_lc(unit.name,false)}の効果で結界1を得た。`,'good');
    fired=true;
  }
  if(hasName('コボルド')){
    const scale=_unitEffectScale(unit,'コボルド');
    const buffTargets=(G.allies||[]).filter(a=>a&&a.hp>0&&String(a.color||'')==='赤');
    buffTargets.forEach(a=>{
      if(a&&a.hp>0&&String(a.color||'')==='赤'){
        addUnitAtk(a,scale);
        addUnitHp(a,scale,'ally');
      }
    });
    log(`${_lc(unit.name,false)}の効果で全ての赤キャラクターは+${scale}/+${scale}を得た。`,'good');
    _playCardEffectSfx('C003');
    void _playCardEffectVfx('C003',buffTargets,{gateMs:0,waitForFinish:false});
    fired=true;
  }
  if(hasName('インキュバス')){
    (G.enemies||[]).forEach(e=>{
      if(_canReceiveBattleEffect(e)){ e.atk=Math.max(0,(e.atk||0)-1); e.baseAtk=Math.max(0,(e.baseAtk||0)-1); }
    });
    log(`${_lc(unit.name,false)}の効果で全ての敵はATK-1を得た。`,'good');
    fired=true;
  }
  if(hasName('カオス・インプ')){
    _allBattleCharacters().forEach(u=>{
      if(_canReceiveBattleEffect(u)&&_unitHasSacrifice(u)) addUnitHp(u,1,_battleSideOfUnit(u));
    });
    log(`${_lc(unit.name,false)}の効果で生贄を持つキャラクターはHP+1を得た。`,'good');
    fired=true;
  }
  const furyCount=_enhancementCount(unit,'逆上');
  for(let f=0;f<furyCount;f++){
    const target=_pickRandomEnemyTargets(G.enemies,unit)[0];
    if(target){
      playDamageEffectSfx('all');
      // 逆上はキーワード由来の効果でありカード固有の効果ではないため、
      // ダメージ源キャラクターの専用VFX（CXXX.mp4）は使わない（通常のhit.mp4を使う）。
      const dmg=unit._tripleMerged?6:3;
      await applyDamageBatch([{unit:target,side:'enemy',amount:dmg,source:unit}],{source:unit});
      log(`${_lc(unit.name,false)}の逆上が発動した。ランダムな敵に${dmg}ダメージ。`,'good');
      fired=true;
    }
  }
  // ミノタウロス：負傷：直ちにランダムな敵に攻撃する。二段攻撃・三段攻撃を持つ場合は
  // それも含めて攻撃が完全に終わるまで、他のキャラクターの処理より優先して待つ
  // （呼び出し元のapplyDamageBatch/_fireAllyInjuryEffectsが直列にawaitしている）。
  if(hasName('ミノタウロス')){
    const extraHits=coreExtraAttackCount(unit);
    for(let hi=0;hi<=extraHits&&unit.hp>0;hi++){
      const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
      if(!alive.length) break;
      let target=_pickRandomEnemyTargets(alive,unit)[0];
      // 負傷で発生した攻撃でも通常攻撃と同じく攻撃時効果を発動させる
      // （_dealAttackDamageWithMutual内の接触タイミングで_consumeAttackEffectPauseが解決する）。
      if(_hasAttackEffectsForPause(unit)) unit._attackEffectPending=true;
      if(unit.manaOnAttack){
        const _ritualExtraInj=_allyAttackEffectExtra(unit);
        for(let mi=0;mi<1+_ritualExtraInj;mi++) _gainMana(unit.manaOnAttack,unit);
        await _flushRingManaThresholdEffects();
        if(unit.hp<=0) break;
        if(!target||target.hp<=0) target=getAttackTarget(unit,G.enemies);
        if(!target||target.hp<=0) break;
      }
      log(`${_lc(unit.name,false)}が直ちに${_lc(target.name,true)}に攻撃した。`,'good');
      await _dealAttackDamageWithMutual(unit,false,target,G.enemies.indexOf(target),Math.max(0,unit.atk||0));
    }
    fired=true;
  }
  // メデューサ：負傷効果のダメージはsetTimeoutで後回しにしない。後回しにすると、
  // 呼び出し元（applyDamageBatch→_fireAllyInjuryEffects）のawait列から外れて戦闘進行が先に進み、
  // 後続キャラクターが「この効果でこれから死ぬ敵」を攻撃対象に選んでしまう。
  // 負傷効果自体が通常攻撃のVFX完了後に直列awaitで実行されるため、演出の重なりも起きない。
  if(hasName('メデューサ')){
    const alive=(G.enemies||[]).filter(_canReceiveBattleEffect);
    if(alive.length&&actualDmg>0){
      const target=_pickRandomEnemyTargets(alive,unit)[0];
      log(`${_lc(unit.name,false)}の効果で${_lc(target.name,true)}に${actualDmg}ダメージを与えた。`,'good');
      playDamageEffectSfx('single');
      await applyDamageBatch([{unit:target,side:'enemy',amount:actualDmg,source:unit}],{source:unit,effect:true});
    }
    fired=true;
  }
  return fired;
}

function _onAllyDeathPanelSummons(){
}

// 攻撃ターゲットを決定する
function getAttackTarget(attacker, targets){
  // 守護が常時有効なのは敵側の盤面か、魔導板から召喚された味方だけ。
  // その区別（G.enemies かどうか）はG依存なので、ここで判定してコアへ渡す。
  return coreSelectAttackTarget(attacker, targets, coreMathRng, { defendersAreEnemies: targets===G.enemies });
}

// 貫通：前衛キャラクターへの攻撃時、その後ろに位置する後衛キャラクター（最大3人）にも同じダメージを与える。
// 前衛F人・後衛R人の場合、後衛R人をF分割し、front側の位置indexに対応する区画を「真後ろ」とみなす。
function _pierceRearTargets(target, list){ return corePierceRearTargets(target, list); }

async function allyAttackAction(ally, allyIdx){
  _recordBattleTrace('attack_action_enter',{side:'p1',unitId:ally&&ally.id,name:ally&&ally.name,idx:allyIdx,atk:ally&&ally.atk,hp:ally&&ally.hp});
  // 毒は「攻撃するタイミング」ではなく「このキャラクターの手番」に発動するため、
  // ATK0で攻撃自体がスキップされる場合も先に処理する
  await _applyPoisonBeforeAttack(ally);
  ally=_battleUnitById(G.allies,ally);
  allyIdx=ally?G.allies.indexOf(ally):-1;
  if(!ally||ally.hp<=0||_isSealed(ally)){ _recordBattleTrace('attack_action_skip',{side:'p1',reason:'not_attackable'}); return false; }
  delete ally._attackObserverFired;
  if(_unitHasKeyword(ally,'防戦')){ _recordBattleTrace('attack_action_skip',{side:'p1',reason:'defense'}); return false; }
  const attackDmg=_attackDamageValue(ally);
  if(attackDmg<=0){ _recordBattleTrace('attack_action_skip',{side:'p1',reason:'zero_attack',attackDmg}); return false; } // ATK0は攻撃しない
  await _runCoreLiveAttackRing(false);
  const liveE=G.enemies.filter(_canReceiveBattleEffect);
  if(!liveE.length){ _recordBattleTrace('attack_action_skip',{side:'p1',reason:'no_targets'}); return false; }

  let target=getAttackTarget(ally,G.enemies);
  if(!target){ _recordBattleTrace('attack_action_skip',{side:'p1',reason:'target_null'}); return false; }
  _recordBattleTrace('attack_action_target',{side:'p1',attackerId:ally.id,targetId:target.id,attackDmg});
  const isGlobal=coreAttackSpread(ally)==='all';
  const isTriDir=coreAttackSpread(ally)==='tri';
  hideAttackLine();

  if(ally.stealth){ ally.stealth=false; log(`${_lc(ally.name,false)}の隠密が解除された。`,'sys'); }

  // 攻撃時効果はアニメーション途中で発動する
  if(ally.hp>0&&_hasAttackEffectsForPause(ally)) ally._attackEffectPending=true;
  // 全体攻撃・三方向攻撃・単体攻撃の振り分け
  const eIdx=G.enemies.indexOf(target);
  let attackTargets=isGlobal?_targetsInSameAttackRow(target,G.enemies).filter(_canReceiveBattleEffect):isTriDir?([eIdx-1,eIdx,eIdx+1].filter(i=>i>=0&&i<G.enemies.length).map(i=>G.enemies[i]).filter(_canReceiveBattleEffect)):[target];
  // 貫通：前衛の対象への攻撃なら、真後ろの後衛キャラクターにも同じダメージを追加する
  const pierceExtra=_unitHasKeyword(ally,'貫通')?_pierceRearTargets(target,G.enemies).filter(_canReceiveBattleEffect):[];
  pierceExtra.forEach(t=>{ if(t&&!attackTargets.includes(t)) attackTargets=[...attackTargets,t]; });
  const _allyNm=_lc(_battleLogName(ally,G.allies),false);
  if(isGlobal) log(`${_allyNm}が全ての敵に${attackDmg}ダメージを与えた。`);
  else if(isTriDir) log(`${_allyNm}が${_lc(_battleLogName(target,G.enemies),true)}と、隣接するキャラクターに${attackDmg}ダメージを与えた。`);
  else log(`${_allyNm}が${_lc(_battleLogName(target,G.enemies),true)}に${attackDmg}ダメージを与えた。`);
  if(pierceExtra.length) log(`${_allyNm}の貫通で後衛にも${attackDmg}ダメージを与えた。`);

  if(attackTargets.length>1){
    await _dealMultiAttackDamageWithMutual(ally,false,target,attackTargets,attackDmg);
  } else {
    await _dealAttackDamageWithMutual(ally,false,target,eIdx,attackDmg);
  }
  // 多段攻撃（三段=×2、二段=×1）：1回目の攻撃には全体攻撃／三方向攻撃の対象選択がそのまま適用される。
  // 2段目以降の追加攻撃は単体攻撃扱いで、全体攻撃／三方向攻撃を持つ場合は発生しない。
  if(ally.hp>0&&!isGlobal&&!isTriDir){
    // 追加攻撃回数の数え方はコア（coreExtraAttackTotal）が唯一の実装。
    // 以前はここで疾風の指輪を数え忘れていた（指輪の効果文は「味方の攻撃回数は1回追加される」）。
    const extraHits=coreExtraAttackTotal(ally,G.allies||[],_ringCount('疾風の指輪'));
    let curTgt=target;
    for(let hi=0;hi<extraHits;hi++){
      if(!curTgt||curTgt.hp<=0){
        curTgt=getAttackTarget(ally,G.enemies);
      }
      if(!curTgt||curTgt.hp<=0) break;
      hideAttackLine();
      // 攻撃時効果はアニメーション途中で発動する
      if(ally.hp>0&&_hasAttackEffectsForPause(ally)) ally._attackEffectPending=true;
      log(`${_lc(_battleLogName(ally,G.allies),false)}の${hi+2}段攻撃！ ${_lc(_battleLogName(curTgt,G.enemies),true)}に${attackDmg}ダメージを与えた。`,'good');
      await _dealAttackDamageWithMutual(ally,false,curTgt,G.enemies.indexOf(curTgt),attackDmg);
    }
  }


  renderAll();
  await battleSleep(180);
  return true;
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  _recordBattleTrace('attack_action_enter',{side:'p2',unitId:enemy&&enemy.id,name:enemy&&enemy.name,idx:enemyIdx,atk:enemy&&enemy.atk,hp:enemy&&enemy.hp});
  // 毒は「攻撃するタイミング」ではなく「このキャラクターの手番」に発動するため、
  // ATK0で攻撃自体がスキップされる場合も先に処理する
  await _applyPoisonBeforeAttack(enemy);
  enemy=_battleUnitById(G.enemies,enemy);
  enemyIdx=enemy?G.enemies.indexOf(enemy):-1;
  if(!enemy||enemy.hp<=0||_isSealed(enemy)) return false;
  delete enemy._attackObserverFired;
  if(_unitHasKeyword(enemy,'防戦')) return false;
  if(enemy.atk<=0) return false; // ATK0は攻撃しない
  const liveA=G.allies.filter(_canReceiveBattleEffect);
  if(!liveA.length) return false;

  // ターゲット選択（前衛後衛ルール）
  const primaryTarget=getAttackTarget(enemy,G.allies);
  if(!primaryTarget) return false;
  // 敵側も旧オフライン版と同じく、スケルトンキングの代理攻撃を先に解決する。
  if(enemy.name==='スケルトンキング'){
    if(enemy.stealth){ enemy.stealth=false; log(`${_lc(enemy.name,true)}の隠密が解除された。`,'sys'); }
    const skel=await _spawnAdhocAllyUnit('青スケルトン',4,2,true,{rightOf:enemy});
    if(skel&&skel.hp>0){
      log(`${_lc(enemy.name,true)}の効果で「${skel.name}」を召喚し、代わりに攻撃させた。`,'bad');
      const si=G.enemies.indexOf(skel);
      if(si>=0) await enemyAttackAction(skel,si);
    }
    renderAll();
    await battleSleep(180);
    return true;
  }
  const targets=[primaryTarget];
  const primaryIdx=G.allies.indexOf(primaryTarget);

  // ※敵側は従来からキーワード列だけを見ており、効果文からは拾わない（味方側とは異なる）。
  //   挙動を変えないため fromKeywordsOnly を明示している。揃えるかは要判断。
  const isGlobalAtk=coreAttackSpread(enemy,{fromKeywordsOnly:true})==='all';
  const isTriDirAtk=coreAttackSpread(enemy,{fromKeywordsOnly:true})==='tri';
  const liveAllForGlobal=_targetsInSameAttackRow(primaryTarget,G.allies).filter(a=>_canReceiveBattleEffect(a)&&!a.stealth);
  hideAttackLine();

  if(enemy.stealth){ enemy.stealth=false; log(`${_lc(enemy.name,true)}の隠密が解除された。`,'sys'); }

  const atkVal=enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;

  // 攻撃時効果はアニメーション途中で発動する
  if(atkVal>0&&enemy.hp>0&&_hasAttackEffectsForPause(enemy)) enemy._attackEffectPending=true;

  // 全体攻撃・三方向攻撃・単体攻撃の振り分け（三方向攻撃：隣接3スロット、隠密は除外）
  const _triAIdxs=isTriDirAtk?[primaryIdx-1,primaryIdx,primaryIdx+1].filter(i=>i>=0&&i<G.allies.length&&_canReceiveBattleEffect(G.allies[i])&&!G.allies[i].stealth):[];
  let finalTargets=isGlobalAtk?liveAllForGlobal:isTriDirAtk?_triAIdxs.map(i=>G.allies[i]):targets;
  // 貫通：前衛の対象への攻撃なら、真後ろの後衛キャラクターにも同じダメージを追加する
  const pierceExtra=_unitHasKeyword(enemy,'貫通')?_pierceRearTargets(primaryTarget,G.allies).filter(a=>_canReceiveBattleEffect(a)&&!a.stealth):[];
  pierceExtra.forEach(t=>{ if(t&&!finalTargets.includes(t)) finalTargets=[...finalTargets,t]; });

  // 全ターゲットを攻撃
  const _enemyNm=_lc(_battleLogName(enemy,G.enemies),true);
  if(isGlobalAtk) log(`${_enemyNm}が全ての味方に${atkVal}ダメージを与えた。`);
  else if(isTriDirAtk) log(`${_enemyNm}が${_lc(_battleLogName(primaryTarget,G.allies),false)}と、隣接するキャラクターに${atkVal}ダメージを与えた。`);
  else log(`${_enemyNm}が${_lc(_battleLogName(primaryTarget,G.allies),false)}に${atkVal}ダメージを与えた。`);
  if(pierceExtra.length) log(`${_enemyNm}の貫通で後衛にも${atkVal}ダメージを与えた。`);
  if(finalTargets.length>1){
    await _dealMultiAttackDamageWithMutual(enemy,true,primaryTarget,finalTargets,atkVal);
  } else {
    await _dealAttackDamageWithMutual(enemy,true,primaryTarget,primaryIdx,atkVal);
  }

  // 多段攻撃キーワード（三段=×2、二段=×1）：1回目の攻撃には全体攻撃／三方向攻撃の対象選択がそのまま適用される。
  // 2段目以降の追加攻撃は単体攻撃扱いで、全体攻撃／三方向攻撃を持つ場合は発生しない。
  if(!isGlobalAtk&&!isTriDirAtk&&enemy.hp>0){
    // 敵側は fromKeywordsOnly（効果文からのキーワード推定を使わない）を維持する。
    // PvE専用の生成敵にだけ効く指定で、両陣営とも編成盤面のPvPには存在しない条件のため、
    // PvE/PvPのパリティ問題にはならない。疾風の指輪は味方の指輪なので敵側は0。
    const extraHits=coreExtraAttackTotal(enemy,G.enemies||[],0,{fromKeywordsOnly:true});
    let reTgt=finalTargets[0];
    for(let hi=0;hi<extraHits;hi++){
      if(!reTgt||reTgt.hp<=0){
        reTgt=getAttackTarget(enemy,G.allies);
      }
      if(!reTgt||reTgt.hp<=0) break;
      hideAttackLine();
      // 攻撃時効果はアニメーション途中で発動する
      if(atkVal>0&&enemy.hp>0&&_hasAttackEffectsForPause(enemy)) enemy._attackEffectPending=true;
      log(`${_lc(enemy.name,true)}の${hi+2}段攻撃！ ${_lc(reTgt.name,false)}に${atkVal}ダメージを与えた。`,'bad');
      await _dealAttackDamageWithMutual(enemy,true,reTgt,G.allies.indexOf(reTgt),atkVal);
    }
  }

  // 標的ターン消費はbattlePhaseで1ラウンドに1回行う
  if(enemy&&enemy._scrollSilencedUntilAttack){
    delete enemy._scrollSilencedUntilAttack;
    log(`${_lc(enemy.name,true)}の静寂が解けた。`,'sys');
  }

  renderAll();
  await battleSleep(180);
  return true;
}

// ── 味方へのダメージ処理 ─────────────────────────

function _redirectToBodyguard(list, unit, tone) {
  return unit;
}

// 戻り値：ダメージが通った(true) / 0ダメまたはシールドでブロック(false)
function dealDmgToAlly(unit, dmg, _fieldIdx, src, _suppressCounter, _skipRedirect, _skipPanelCounter){
  if(!unit||unit.hp<=0||_isSealed(unit)) return false;
  if(dmg>0&&!_skipRedirect){
    const redirected=_redirectToBodyguard(G.allies, unit, 'good');
    if(redirected!==unit){
      unit=redirected;
      _fieldIdx=G.allies.indexOf(unit);
    }
  }

  // 0ダメ（無効化）
  if(dmg<=0){
    return false;
  }

  // 結界
  if(unit.shield>0){
    unit.shield--;
    log(`${_lc(unit.name,false)}の結界がダメージを防いだ。`,'sys');
    if(typeof playSfx==='function') playSfx('shield',{group:'combat'});
    onAllyShieldLost(unit);
    return false; // ダメージをシールドで防いだ
  }

  const actualDmg=Math.max(0, dmg);
  unit._lastDamageSource=src||unit._lastDamageSource||null;
  unit.hp=Math.max(0,unit.hp-actualDmg);
  if(actualDmg>0&&typeof playHitVfx==='function') playHitVfx('ally',unit,actualDmg);
  // マナ獲得と負傷効果は applyDamageBatch() 後段の
  // _fireAllyInjuryEffects() が共通コアで一度だけ解決する。
  if(dmg>0&&src){
    _applyCoreKeywordOnHitPve(src,unit,actualDmg,unit._preDeathSnapshot&&unit._preDeathSnapshot.hp);
  }

  const willDie=unit.hp<=0;

  if(willDie){
    unit.hp=0;
    _delayDeathCompact(850);
    processAllyDeath(unit);
  } // 負傷でHP回復しても死亡確定
  return true; // ダメージが通った
}

// レムレース：負傷：このキャラクターをダメージを与えたキャラクターに変身する。
// 外観・ATK/HPとも、ダメージを与えたキャラクターの「その時点（＝現在）の状態」をそのまま引き継ぐ
// （開戦時の値ではなく、蓄積したバフ・被ダメージ後の現在HPを含む）。

// ── 味方の死亡処理 ──────────────────────────────

// 死亡処理は非同期（死亡効果がapplyDamageBatchをawaitする）だが、dealDmgToAlly()等の
// 同期経路からはfire-and-forgetで呼ばれる。最後の味方が倒れた時、解決を待たずに
// ゲームオーバーへ進むと闇の炎などの死亡効果が画面に出ないまま終わるため、
// 解決中の件数を数えてhandleBattleDefeat()側で待てるようにする。
async function processAllyDeath(unit){
  G._pendingDeathEffects=(G._pendingDeathEffects||0)+1;
  try{ return await _processAllyDeathInner(unit); }
  finally{ G._pendingDeathEffects=Math.max(0,(G._pendingDeathEffects||0)-1); }
}
async function _processAllyDeathInner(unit){
  // 同じ死亡が複数の経路から重複して届く場合、復活処理中の二重復帰を防ぐ。
  if(unit.hp>0||unit._deathProcessed||unit._deathProcessing) return;
  unit._deathProcessing=true;
  // 復活の指輪：常時：戦闘中、最初に死んだ味方は最大HPで復活する。（1戦闘1回だけ）
  if(!G._revivalRingUsed&&_hasRingNamed('復活の指輪')){
    await _applyDeathKeywordEffects(unit,false);
    _onAllyDeathPanelSummons();
    G.battleCounters.deaths++;
    if(typeof _onAnyCharDeath==='function') _onAnyCharDeath(unit);
    _reviveWithHalvedStats(unit,false);
    // 戦闘中に召喚される（蘇生も含む）キャラクターは必ず前衛に置く。
    unit.lane='front';
    log(`${_lc(unit.name,false)}は復活の指輪の効果で最大HPで復活した。`,'good');
    // 根性・復活キーワードによる蘇生（_reviveWithHalvedStats）と同様、戦闘中に「現れた」ものとして
    // _afterPanelSummon()を通す（ヘルナイトの生贄付与・光の指輪の結界付与等が正しく適用されるようにする）。
    await _afterPanelSummon(unit,false);
    requestBattleCompact();
    delete unit._deathProcessing;
    return;
  }
  const reviveKw=['復活','根性'].find(k=>_unitHasKeyword(unit,k));
  if(reviveKw&&!unit._starterRegenUsed){
    await _applyDeathKeywordEffects(unit,false);
    _onAllyDeathPanelSummons();
    G.battleCounters.deaths++;
    if(typeof _onAnyCharDeath==='function') _onAnyCharDeath(unit);
    _reviveWithHalvedStats(unit,false);
    delete unit._deathProcessing;
    // 根性は「致死ダメージを受けてもHP1で耐える」効果のため、HPが一瞬0になったことで
    // 通常のダメージ処理内（hp>0判定）ではスキップされてしまう負傷トリガーをここで代わりに発動する
    if(reviveKw==='根性'){
      await _fireAllyInjuryEffects(unit,0);
    }
    log(reviveKw==='復活'?`${_lc(unit.name,false)}が復活の効果で召喚された。`:`${_lc(unit.name,false)}が${reviveKw}の効果で蘇った。`,'good');
    requestBattleCompact();
    return;
  }
  unit._deathProcessed=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  _playDeathBurnOnce(unit,false);
  await _applyDeathKeywordEffects(unit,false);
  _onAllyDeathPanelSummons();

  log(`${_lc(unit.name,false)}が倒れた…`,'bad');
  G.battleCounters.deaths++;
  if(G.runStats) G.runStats.allyDeaths=(G.runStats.allyDeaths||0)+1;

  // ナグルファル：キャラクター死亡ごとに+2/+1
  _onAnyCharDeath(unit);
  await _resolveSeals();
  if(!G._resolvingDamageBatchDeaths) compactBattleUnitsAfterDeath();
}

// 死亡観測は coreApplyDeathObservers() に一本化したため、旧呼び出し名は互換用の空関数にする。
function _onAnyCharDeath(){ }

async function _runCoreLiveAttackObservers(attacker,isEnemySide){
  if(!attacker||attacker.hp<=0||typeof coreApplyAttackObservers!=='function') return;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]); u.side=state.units.p1.includes(u)?'p1':'p2'; u.slot=i;
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{ localEvents.push(ev); if(ev&&ev.type==='mana_gain') _recordBattleTrace('mana_gain_generated',{unitId:ev.unitId||null,side:ev.side,amount:Number(ev.amount)||0,reason:ev.reason||''}); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  const applyHit=(source,target,amount,counter)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  };
  try{ coreApplyAttackObservers(attacker,state,coreMathRng,emit,applyHit); }
  finally{
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  const spawned=[...state.units.p1,...state.units.p2].filter(u=>u&&!before.has(u)&&!u._corePendingSummon);
  for(const u of spawned){ const list=state.units.p1.includes(u)?G.allies:G.enemies; if(!list.includes(u)) list.push(u); await _afterPanelSummon(u,list===G.enemies,false,true); }
  await _flushCorePveHitEvents(state,localEvents,before);
}

async function _runCoreLiveAttackRing(isEnemySide){
  if(isEnemySide||!_hasRingNamed('鬼神の指輪')||typeof coreApplyAttackRing!=='function') return;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    _oniRingAttackCount:G._oniRingAttackCount||0,
  };
  G._oniRingAttackCount=state._oniRingAttackCount;
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{if(u){touched.push([u,u.side,u.slot]);u.side=state.units.p1.includes(u)?'p1':'p2';u.slot=i;}});
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{localEvents.push(ev);if(Array.isArray(G._battleCoreEvents))G._battleCoreEvents.push(ev);};
  const applyHit=(source,target,amount,counter)=>coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  try{coreApplyAttackRing(state,'p1',coreMathRng,emit,applyHit);}finally{
    G._oniRingAttackCount=state._oniRingAttackCount;
    touched.forEach(([u,side,slot])=>{if(side==null)delete u.side;else u.side=side;if(slot==null)delete u.slot;else u.slot=slot;});
  }
  const spawned=[...state.units.p1,...state.units.p2].filter(u=>u&&!before.has(u)&&!u._corePendingSummon);
  for(const u of spawned){const list=state.units.p1.includes(u)?G.allies:G.enemies;if(!list.includes(u))list.push(u);await _afterPanelSummon(u,list===G.enemies,false,true);}
  await _flushCorePveHitEvents(state,localEvents,before);
}


// ── シールド喪失時 ──────────────────────────────

async function _applyCoreShieldLostEffectsLive(lostUnit){
  if(!lostUnit||typeof coreApplyShieldLostEffects!=='function') return;
  // コア駆動の戦闘では coreResolveHit() が既に結界喪失効果を解決している。
  // ここで再度呼ぶと、カーバンクル・グリマルキン等が二重に発動する。
  if(G._coreDrivenBattle) return;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]}, rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{ if(u){ touched.push([u,u.side,u.slot]); u.side=state.units.p1.includes(u)?'p1':'p2'; u.slot=i; } });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{ localEvents.push(ev); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  const applyHit=(source,target,amount,counter)=>coreResolveHit(state,source,target,amount,counter,coreMathRng,emit);
  try{ coreApplyShieldLostEffects(lostUnit,state,coreMathRng,emit,applyHit); }
  finally{ touched.forEach(([u,side,slot])=>{ if(side==null)delete u.side;else u.side=side;if(slot==null)delete u.slot;else u.slot=slot; }); }
  await _flushCorePveHitEvents(state,localEvents,before);
}

function onAllyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'ally');
  _applyCoreShieldLostEffectsLive(lostUnit);
}
function onEnemyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'enemy');
  _applyCoreShieldLostEffectsLive(lostUnit);
}

function onBattleStart(){
  G._freeItemPhase='battle';
  G._freeItemUsed=false;

  // 結界X：戦闘開始時にX回分のダメージ無効化結界を得る。
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||_isSealed(a)) return;
    const shieldValue=_unitShieldValue(a);
    if(shieldValue>0&&(a.shield||0)<shieldValue){
      a.shield=shieldValue;
      log(`${_lc(a.name,false)}が結界${shieldValue}を得た。`,'good');
    }
  });
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0||_isSealed(e)) return;
    const shieldValue=_unitShieldValue(e);
    if(shieldValue>0&&(e.shield||0)<shieldValue){
      e.shield=shieldValue;
      log(`${_lc(e.name,true)}が結界${shieldValue}を得た。`,'bad');
    }
  });
}

// ── 戦闘終了時処理 ───────────────────────────

async function _applyCoreBattleEndEffectsLive(){
  _recordBattleTrace('battle_end_dispatch_start',{phase:G.phase,gold:Number(G.gold)||0,mana:Number(_ensureMana())||0});
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  const emit=ev=>{ if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  try{ coreTriggerBattleEnd(state,emit,coreMathRng); _syncCoreResourcesToG(state); }
  finally{
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  _recordBattleTrace('battle_end_dispatch_done',{events:(G._battleCoreEvents||[]).filter(e=>e&&e.type==='gold_gain').length,gold:Number(G.gold)||0});
  G._coreBattleEndTriggered=true;
}

async function onBattleEnd(){
  if(G._battleEndEffectsApplied) return;
  G._battleEndEffectsApplied=true;
  G._coreBattleEndTriggered=false;
  await _applyCoreBattleEndEffectsLive();
  (G._battleCoreEvents||[]).filter(e=>e&&e.type==='bonus_reward'&&e.side==='p1'&&e.unit).forEach(e=>{
    if(typeof _queueBonusRewardPanel==='function') _queueBonusRewardPanel(e.unit);
  });
  // ノーム等：終戦：Xゴールドを得る。（パネル召喚キャラは直後に盤面から除去されるため先に処理する）
  const goldEffectUnits=[];
  // ゴールド本体はコアが既に加算済み。ここではコアイベントをVFX/ログへ接続し、二重加算しない。
  (G._battleCoreEvents||[]).filter(e=>e&&e.type==='gold_gain'&&e.reason==='goldOnBattleEnd').forEach(e=>{
    const unit=(G.allies||[]).find(a=>a&&a.id===e.unitId);
    if(unit) goldEffectUnits.push({unit,amount:e.amount});
  });
  // コアは判定時点で所持金を確定するが、表示上の獲得タイミングは固有VFXの開始時に揃える。
  // ここで一度だけ表示値を効果前へ戻し、各VFXを開始する直前に対応額を反映する。
  const pendingGold=goldEffectUnits.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  if(pendingGold){
    G.gold=Math.max(0,Number(G.gold||0)-pendingGold);
    updateHUD();
  }
  const randomItemEffectUnits=[];
  for(const a of (G.allies||[])){
    if(!G._coreBattleEndTriggered&&a&&a.hp>0&&a.randomItemOnBattleEnd){
      const repeatCount=1+(Number(a._effectRepeatBonus)||0);
      for(let repeat=0;repeat<repeatCount;repeat++) randomItemEffectUnits.push(a);
    }
  }
  // 終戦時のゴールド演出は、他の終戦時効果の処理・演出が終わってから開始する。
  await _waitForPendingVfx();
  for(const {unit:a,amount} of goldEffectUnits){
    _playCardEffectSfx('C001');
    G.gold=Math.max(0,Number(G.gold||0)+(Number(amount)||0));
    // VFXのDOM生成直後に反映し、画面上の獲得演出と所持金表示を同時に開始する。
    const vfx=_playCardEffectVfx('C001',[a],{gateMs:0,hitDuration:900,waitForFinish:true});
    updateHUD();
    log(`${_lc(a.name,false)}の効果で${amount}ゴールドを得た。`,'good');
    await vfx;
  }
  for(const a of randomItemEffectUnits) _grantRandomItem(a.name,{free:true});
  const itemRewards=(G._battleCoreEvents||[]).filter(e=>e&&e.type==='item_reward');
  await _flushCorePveHitEvents({units:{p1:G.allies||[],p2:G.enemies||[]}},itemRewards,new Set([...G.allies||[],...G.enemies||[]]));
}

function _removeAbsentKiemetsuCards(){
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const equip=board&&Array.isArray(board.equipment)?board.equipment:null;
  if(!equip) return;
  const absentKiemetsuSlots=new Set();
  // 戦闘中ユニットには、強化カードから付与された帰滅も反映されているため、
  // まず死亡・未配置の実体側から対象スロットを特定する。
  (G.allies||[]).forEach(unit=>{
    if(!unit||!Number.isInteger(unit._mainBoardSlot)||unit.hp>0||!_unitHasKeyword(unit,'帰滅')) return;
    absentKiemetsuSlots.add(unit._mainBoardSlot);
  });
  // 開戦時に出撃できなかったキャラクターも「場にいない」ため消滅させる。
  equip.forEach((panel,slot)=>{
    if(!panel||String(panel.category||'')!=='キャラクター') return;
    const hasKiemetsu=Array.isArray(panel.keywords)&&panel.keywords.includes('帰滅')||String(panel.desc||'').includes('帰滅');
    if(!hasKiemetsu) return;
    const aliveOnField=(G.allies||[]).some(u=>u&&u.hp>0&&u._mainBoardSlot===slot&&!u._isObject&&!u._isSoul);
    if(!aliveOnField) absentKiemetsuSlots.add(slot);
  });
  absentKiemetsuSlots.forEach(slot=>{
    if((G.allies||[]).some(u=>u&&u.hp>0&&u._mainBoardSlot===slot&&!u._isObject&&!u._isSoul)){
      absentKiemetsuSlots.delete(slot);
    }
  });
  absentKiemetsuSlots.forEach(slot=>{
    const panel=equip[slot];
    if(!panel) return;
    equip[slot]=null;
    log(`${panel.name||'帰滅を持つキャラクター'}は戦闘終了時に場にいなかったため消滅した。`,'sys');
  });
}

function _cleanupBattleEndTransientUnits(){
  _removeAbsentKiemetsuCards();
  if(Array.isArray(G.allies)) G.allies.splice(0,G.allies.length,...G.allies.map(u=>u&&u._panelSummoned?null:u));
  if(Array.isArray(G.enemies)) G.enemies.splice(0,G.enemies.length,...G.enemies.map(u=>u&&u._panelSummoned?null:u));
  // ラミアで一時的に仲間にしたキャラクターは、メイン置き場由来ではないため報酬フェイズへは持ち越さない
  _removeLamiaCapturedUnits();
  // 仲間になったエリート/ボスの属性を解除
  G.allies.forEach(a=>{
    if(!a||!a.keywords) return;
    const had=a.keywords.some(k=>k==='エリート'||k==='ボス');
    if(had){
      a.keywords=a.keywords.filter(k=>k!=='エリート'&&k!=='ボス');
      if(a.boss) delete a.boss;
      log(`${a.name}：エリート/ボス属性を解除`,'sys');
    }
  });

  // 死亡ユニット（復活・根性で回復しなかった）をフィールドから除去
  for(let i=0;i<G.allies.length;i++){
    const a=G.allies[i];
    if(a&&a.hp<=0) G.allies[i]=null;
  }
}

// ── 勝利ボーナス ───────────────────────────────

async function applyVictoryBonuses(){
  await onBattleEnd();
}

// ── スペル使用後の勝利チェック ──────────────────

function checkInstantVictory(){
  if(G.phase==='player'&&G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){
    if(_checkRearCenterAllyGameOver()) return true;
    if(_isBossFight) G._bossJustDefeated=true;
    finishBattleAsVictory('敵を全滅させた！');
    return true;
  }
  return false;
}

// ── キーワード効果 ─────────────────────────────

// 生命吸収の回復量（対象の残りライフを上回るダメージの場合は、実際に削った分だけ回復する）
function _lifeDrainHealAmount(damageDone, targetPreHp){
  return targetPreHp!=null?Math.max(0,Math.min(damageDone,targetPreHp)):damageDone;
}
function _applyCoreKeywordOnHitPve(attacker, target, damageDone, targetPreHp, skipLifeDrain){
  if(!attacker||!target||damageDone<=0||typeof coreApplyKeywordOnHit!=='function') return null;
  const attackerSide=(G.allies||[]).includes(attacker)?'p1':'p2';
  const targetSide=(G.allies||[]).includes(target)?'p1':'p2';
  const oldAttackerSide=attacker.side, oldTargetSide=target.side;
  attacker.side=attackerSide; target.side=targetSide;
  const state={rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},units:{p1:G.allies||[],p2:G.enemies||[]},resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},life:{p1:_currentBattleLife(),p2:0},maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},blood:{p1:Math.max(0,Number(G._blood)||0),p2:0}};
  try{
    const result=coreApplyKeywordOnHit(attacker,target,damageDone,targetPreHp,state,()=>{}, {skipLifeDrain:!!skipLifeDrain});
    if(result&&result.cursed&&attacker.hp<=0){
      if(attackerSide==='p1') processAllyDeath(attacker); else processEnemyDeath(attacker,G.enemies.indexOf(attacker));
    }
    return result;
  }finally{
    _syncCoreLifeToG(state);
    if(oldAttackerSide==null) delete attacker.side; else attacker.side=oldAttackerSide;
    if(oldTargetSide==null) delete target.side; else target.side=oldTargetSide;
  }
  /* 旧PvE専用の命中後実装は廃止済み。 */
  /*
  // 呪詛：このキャラクターにダメージを与えたキャラクターは即死する（対象自身の生死やskipLifeDrain経路と無関係に判定する）。
  // attacker側が加護を持つ場合は即死を受けない（他の付与系即死効果と同じ扱い）。
  if(damageDone>0&&attacker&&attacker.hp>0&&!_isAilmentImmune(attacker)){
    const targetKws=_unitPanelKeywords(target);
    if(targetKws.some(k=>k==='呪詛'||/^呪詛\d+$/.test(k))){
      attacker.hp=0;
      log(`${_lc(target.name,_isPlayerAllyForCurse)}の呪詛で${_lc(attacker.name,!_isPlayerAllyForCurse)}が即死した。`,_isPlayerAllyForCurse?'good':'bad');
      // attackerはこの関数の戻り値経路（applyDamageBatchのresults）には乗らないため、
      // 死亡処理（死亡効果・撃破処理・盤面整理）をここで明示的に発火する（他の箇所の
      // fire-and-forgetな死亡処理呼び出しと同様の扱い。processAllyDeath/processEnemyDeath
      // 側で二重発火は自前でガードされているため、同一バッチ内で他経路と重複しても安全）。
      if((G.allies||[]).includes(attacker)){
        if(typeof processAllyDeath==='function') processAllyDeath(attacker);
      } else if((G.enemies||[]).includes(attacker)){
        if(typeof processEnemyDeath==='function') processEnemyDeath(attacker,G.enemies.indexOf(attacker));
      }
    }
  }
  // 幸運の指輪：常時：ダメージを受けたキャラクターのHPが7、または77、または777になった場合、そのゴールドを得る。
  if(damageDone>0&&target&&(target.hp===7||target.hp===77||target.hp===777)&&_hasRingNamed('幸運の指輪')){
    onGoldGained(target.hp);
    log(`幸運の指輪の効果で${target.hp}ゴールドを得た。`,'good');
  }
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  if(!attacker||!target||damageDone<=0) return;
  // 純粋な命中数値・状態異常・生命吸収は共通コアに委譲する。G依存の幸運だけはここで保持する。
  const attackerSide=_isPlayerAlly?'p1':'p2';
  const targetSide=_isPlayerAlly?'p2':'p1';
  const oldAttackerSide=attacker.side, oldTargetSide=target.side;
  attacker.side=attackerSide; target.side=targetSide;
  const ringList=typeof _effectiveRings==='function'?_effectiveRings():[];
  const state={rings:{p1:ringList,p2:ringList},units:{p1:G.allies||[],p2:G.enemies||[]}};
  try{
    const result=coreApplyKeywordOnHit(attacker,target,damageDone,targetPreHp,state,()=>{},
      {skipLifeDrain:!!skipLifeDrain,bonus:_gdKw});
    if(result&&result.killed) log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}を即死させた！`,'bad');
    if(result&&result.healed) log(`${_lc(attacker.name,!_isPlayerAlly)}の生命吸収：HP+${result.healed}`,_isPlayerAlly?'good':'bad');
  }finally{
    if(oldAttackerSide==null) delete attacker.side; else attacker.side=oldAttackerSide;
    if(oldTargetSide==null) delete target.side; else target.side=oldTargetSide;
  }
  */
}

// ── 敵へのダメージ処理 ──────────────────────────

async function dealDmgToEnemy(e,dmg,eIdx,srcUnit){
  if(!e||e.hp<=0||_isSealed(e)) return;
  if(dmg>0){
    const redirected=_redirectToBodyguard(G.enemies, e, 'bad');
    if(redirected!==e){
      e=redirected;
      eIdx=G.enemies.indexOf(e);
    }
  }
  // 結界・強靭の判定はコアが持つ。
  // ※この経路だけは従来から弱体を加算していないため、skipWeaken でその挙動を保つ。
  //   （旧ダメージ経路側は弱体を加算する。仕様として揃えるかは要判断）
  const _resE=coreResolveIncomingDamage(e,dmg,{skipWeaken:true});
  if(_resE.blocked&&_resE.reason==='shield'){
    if(_resE.consumesShield) e.shield=Math.max(0,(e.shield||0)-1);
    log(`${_lc(e.name,true)}の結界がダメージを防いだ。`,'sys');
    if(typeof playSfx==='function') playSfx('shield',{group:'combat'});
    onEnemyShieldLost(e);
    return;
  }
  const actualDmgToEnemy=_resE.amount;
  const _preHpEnemy=e.hp;
  e._lastDamageSource=srcUnit||e._lastDamageSource||null;
  e._preDeathSnapshot=_battleUnitSnapshot(e,_preHpEnemy);
  e.hp=Math.max(0,e.hp-actualDmgToEnemy);
  if(typeof updateUnitDamageUi==='function') updateUnitDamageUi(e,'enemy');
  if(actualDmgToEnemy>0&&typeof playHitVfx==='function') playHitVfx('enemy',e,actualDmgToEnemy);
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
    // 生命吸収等は対象を倒した場合も発動するため、e.hp>0では絞り込まない。
    // 呪詛（対象側キーワードで攻撃者を即死させる）の判定のため、srcUnit自身の
    // キーワード有無に関わらず呼び出す。
    if(srcUnit){
      _applyCoreKeywordOnHitPve(srcUnit,e,actualDmgToEnemy,_preHpEnemy);
    }
  }
  if(e.hp<=0){
    _delayDeathCompact(850);
    // 死亡効果による敵召喚が完了するまで、全滅判定より先に待つ。
    await processEnemyDeath(e,eIdx);
  }
}

async function processEnemyDeath(e,eIdx){
  G._pendingDeathEffects=(G._pendingDeathEffects||0)+1;
  try{ return await _processEnemyDeathInner(e,eIdx); }
  finally{ G._pendingDeathEffects=Math.max(0,(G._pendingDeathEffects||0)-1); }
}
async function _processEnemyDeathInner(e,eIdx){
  if(e._dp) return;
  const reviveKw=['復活','根性'].find(k=>_unitHasKeyword(e,k));
  if(reviveKw&&!e._starterRegenUsed){
    await _applyDeathKeywordEffects(e,true);
    _onEnemyDeathPanelSummons(e);
    _onAnyCharDeath(e);
    _reviveWithHalvedStats(e,true);
    if(reviveKw==='根性') await _fireEnemyInjuryEffects(e,0);
    log(reviveKw==='復活'?`${_lc(e.name,true)}が復活の効果で召喚された。`:`${_lc(e.name,true)}が${reviveKw}の効果で蘇った。`,'bad');
    requestBattleCompact();
    return;
  }
  e._dp=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  _playDeathBurnOnce(e,true);
  G._enemyDeathsThisBattle=(G._enemyDeathsThisBattle||0)+1;
  if(G.runStats) G.runStats.enemyKills=(G.runStats.enemyKills||0)+1;
  await _applyDeathKeywordEffects(e,true);
  // エリート判定：キーワードではなくインデックスで判定（ENEMY_POOLデータにエリートKWが混入しても誤発火しない）
  const _isActualElite=G._isEliteFight&&G._eliteIdx>=0&&eIdx===G._eliteIdx;
  if(_isActualElite) G._eliteKilled=true;
  log(`${_lc(e.name,true)}撃破！`,'gold');
  const gold=_rollEnemyGold(e);
  if(gold>0&&typeof onGoldGained==='function') onGoldGained(gold);
  _onEnemyDeathPanelSummons(e);
  // ナグルファル：敵死亡でも+2/+1
  _onAnyCharDeath(e);
  if(!_livingCombatUnits(G.enemies).length){
    _onAllEnemiesDefeated();
    updateHUD();
    return;
  }
  await _resolveSeals();
  if(!G._resolvingDamageBatchDeaths) compactBattleUnitsAfterDeath();
  updateHUD();
}

// ── プレイヤーパス ────────────────────────────
// 戦闘開始ボタンは廃止し、プレイヤーターンになったら自動で戦闘フェイズへ進む。
// この関数はその内部処理そのもの（自動呼び出し・後方互換の手動呼び出し双方から使う）。
async function _advanceToBattlePhase(){
  if(G.phase!=='player'||G._battlePhaseRunning) return;
  G._battlePhaseRunning=true;
  G._showGlobalPanels=false;
  const hp=document.getElementById('hand-pane');
  const hs=document.getElementById('hand-slots');
  if(hp) hp.style.display='none';
  if(hs) hs.innerHTML='';
  if(!G._testBattleMode){
    const passBtn=document.getElementById('btn-pass');
    if(passBtn){ passBtn.style.display='none'; passBtn.disabled=true; }
  }
  await battlePhase();
}

// #btn-passのクリックハンドラ。試験戦闘中は「試験終了」として機能する。
// 通常フローでは戦闘開始ボタン自体を廃止したため呼ばれないが、後方互換として残す。
async function playerPass(){
  if(G._testBattleMode){ stopTestBattle(); return; }
  await _advanceToBattlePhase();
}

// デバッグ試験戦闘の敵構成を固定するための種。値を変えると試験戦闘の敵が変わる。
const TEST_BATTLE_ENEMY_SEED=20240219;
// fnの実行中だけMath.randomを線形合同法の固定列へ差し替える。
// 敵生成の乱数を固定して、試験戦闘を毎回同じ内容にするためだけに使う。
function _withFixedRandom(seed,fn){
  const original=Math.random;
  let state=(Number(seed)||1)>>>0;
  Math.random=()=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
  try{ return fn(); }
  finally{ Math.random=original; }
}

// ── 演出確認用の試験戦闘（デバッグモード専用）────────────────
// ステージ20の敵構成を使い、キャラクターの効果・演出を試せるようにする。
function startTestBattle(){
  if(!G||G.phase!=='reward') return;
  // 図書館の「試験戦闘」は通常プレイの機能なので、デバッグモードでなくても開始できる。
  // デバッグ用の試験戦闘ボタン（#btn-test-battle）はデバッグモード中しか表示されない。
  if(!G._debugMode&&!G._isLibrary) return;
  G._testBattleMode=true;
  G._testBattleExitPending=false;
  G._libraryTestBattleMode=!!G._isLibrary;
  if(G._libraryTestBattleMode){
    G._libraryLoanCardsState=typeof clone==='function'?clone(_rewCards||[]):(_rewCards||[]).slice();
    document.body.classList.remove('library-formation-active');
    if(typeof _setOverrideBackground==='function') _setOverrideBackground(null);
  }
  G._testBattleAbort=false;
  G._testBattleSavedFloor=G.floor;
  document.body.classList.add('test-battle-active');
  // 図書館の試験戦闘は勝敗が付くまで行うため「戦闘終了」ボタンを出さない。
  // ボタンの表示はCSS（body.test-battle-active）が担うので、専用クラスで打ち消す。
  document.body.classList.toggle('library-test-battle-active',!!G._libraryTestBattleMode);
  G.floor=19; // ステージ20（0-indexed）
  showScreen('battle');
  startBattle();
}

// 「戦闘終了」クリック時：進行中の戦闘ループに中断を通知するだけに留める。
// 実際の画面遷移はbattlePhase()のループを安全に抜けた後（_exitTestBattle）で行う。
function stopTestBattle(){
  if(!G._testBattleMode) return;
  G._testBattleAbort=true;
  // 攻撃演出やVFXの待機中は戦闘ループが安全に抜けるのを待つ。
  // ここで画面を切り替えると、進行中の複製カード・死亡演出が編成画面へ残る。
  if(!G._battlePhaseRunning) void _exitTestBattle();
}

async function _exitTestBattle(){
  if(G._testBattleExitPending) return;
  if(!G._testBattleMode&&G.phase==='reward') return;
  G._testBattleExitPending=true;
  // 決着後の遷移が長くなりすぎたため、全演出の終了待ちは行わない。
  // 残っている演出は直後の _forceStopAllVfx() で打ち切る。
  const returnToLibrary=!!G._libraryTestBattleMode;
  // デバッグ試験戦闘でも、戦闘を終えた時点の終戦効果を実戦闘経路と同じく確定する。
  await onBattleEnd();
  G._testBattleMode=false;
  G._libraryTestBattleMode=false;
  G._testBattleAbort=false;
  if(G._testBattleSavedFloor!=null){ G.floor=G._testBattleSavedFloor; G._testBattleSavedFloor=null; }
  document.body.classList.remove('battle-turn-active');
  document.body.classList.remove('test-battle-active');
  document.body.classList.remove('library-test-battle-active');
  document.body.classList.remove('battle-opening-active','battle-start-playing','battle-start-no-effect','battle-start-units-collapsed','battle-start-units-revealing','battle-victory-pending','gameover-active','game-clear-active');
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
  if(typeof hideAttackLine==='function') hideAttackLine();
  if(typeof _clearAllLogFx==='function') _clearAllLogFx();
  // 通常の戦闘終了時はonBattleEnd()がパネル召喚ユニット（＝現行仕様の全味方）をG.alliesから
  // 除去してから報酬/編成画面に戻るが、試験戦闘の中断はその経路を通らない。これを怠ると、
  // 次回の試験戦闘開始時にapplyNewPanelBattleStart()が現在の編成を「今回分」として追加召喚する際、
  // 前回分の残留ユニットと重複し、出撃から外したキャラが残ったり同じキャラが増殖したりする。
  if(Array.isArray(G.allies)) G.allies.splice(0,G.allies.length,...G.allies.map(u=>u&&u._panelSummoned?null:u));
  if(Array.isArray(G.enemies)) G.enemies.splice(0,G.enemies.length,...G.enemies.map(u=>u&&u._panelSummoned?null:u));
  // goToReward()はG.phaseが'player'/'enemy'の間は何もしないガードを持つため、
  // 戦闘フェイズの残留状態のまま呼んでも遷移しないよう先に外しておく。
  G.phase=null;
  if(returnToLibrary&&typeof openMapLibraryFormation==='function'){
    openMapLibraryFormation();
    G._testBattleExitPending=false;
    return;
  }
  if(typeof goToReward==='function') goToReward();
  G._testBattleExitPending=false;
}

// showVictoryOverlay()はmain.jsで定義（スクリプト読み込み順の都合上こちらは重複のため削除済み）

// summon.js から統合（論理削除用）
function calcActions() {
  return 3;
}
function fireTrigger(trigger, sourceRingId) {
  // 指輪トリガー（廃止済み）の名残：安全な no-op として維持
}
