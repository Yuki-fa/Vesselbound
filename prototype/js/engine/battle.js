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
  if(state.defeatedEnemies) G.defeatedEnemies=coreDefeatedEnemyFields(state.defeatedEnemies).defeatedEnemies;
  if(state.runEffects&&state.runEffects.p1) applyCoreRunEffectEvent({type:'run_effect',side:'p1',effects:state.runEffects.p1});
  if(state.gameSummonBuff&&state.gameSummonBuff.p1) G.gameSummonBuff={...state.gameSummonBuff.p1};
  // **所持金だけは再生中に書き戻さない。** コアは1手番ぶんを先に解決するので、
  // 再生の途中でコアの値（もう加算済み）を入れると、その後の gold_gain の演出で
  // もう一度足されて多く見え、手番の終わりの同期で正しい値へ戻る＝一瞬増えて減る。
  // 所持金の表示を進めるのは gold_gain の演出だけ（マミーの死亡で実際に起きていた）。
  const _playing=typeof presentIsPlaying==='function'&&presentIsPlaying();
  if(state.resources&&state.resources.p1&&!_playing) G.gold=Math.max(0,Number(state.resources.p1.gold)||0);
  if(state.life&&state.life.p1!=null) G.life=Math.max(0,Number(state.life.p1)||0);
  if(state.blood){ G._blood=Math.max(0,Number(state.blood.p1)||0); G._enemyBlood=Math.max(0,Number(state.blood.p2)||0); }
}
function _syncCoreManaToG(state){
  if(!state||!state.resources||!state.resources.p1) return;
  G.mana=Math.max(0,Number(state.resources.p1.mana)||0);
  // 嵐の指輪の発動済み回数も戻す（継戦の次の戦闘へ引き継ぐ）。
  if(state._stormRingFireCount!=null) G._stormRingFireCount=Math.max(0,Number(state._stormRingFireCount)||0);
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
  try{ if(navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{}); }catch(_){ }
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

// 命中音の鍵（武器種別＋威力段階）。同じ瞬間に鳴る命中を1本にまとめる判定に使う。
function _attackDamageSfxKey(attacker,amount){
  const type=_normalizeAttackSfxType(attacker);
  const lv=_attackSfxLevel(amount);
  // attack.wavは攻撃開始時、武器種別SEは命中時に鳴らす旧来の2段構成へ戻す。
  if(!type||!lv) return '';
  return `${type}${lv}`;
}

function playAttackDamageSfx(attacker,amount){
  if(typeof playSfx!=='function') return false;
  const key=_attackDamageSfxKey(attacker,amount);
  if(!key) return false;
  return playSfx(key,{group:'combat',guardKey:`combat:${key}:${uid()}`,guardMs:0});
}

function playDamageEffectSfx(kind){
  if(typeof playSfx!=='function') return false;
  // 全体へ広がる効果ダメージ＝C058（アラッサス）／単体＝効果ダメージの汎用SE。
  if(kind==='all') return playSfx('C058',{group:'magic'});
  return playSfx('effectDamage',{group:'magic'});
}

function _playCardEffectSfx(code){
  if(typeof presentLabFx==='function'&&presentLabFx(code)) return false;
  if(typeof playSfx!=='function') return false;
  return playSfx(code,{group:'magic',guardKey:`effect:${code}:${uid()}`,guardMs:0});
}

// 能力変化の固有VFX（S005〜S009等）と一緒に鳴らす固有SE。SEのピークをVFXの山場（定義の impact）へ合わせる（2026-10-15）。
// 定義に山場が無い（impact 0）演出は従来どおり始まりと同時に鳴らす。
function _playCardEffectSfxAtCue(code,durationMs){
  if(typeof presentLabFx==='function'&&presentLabFx(code)) return false;
  const url=typeof getCharacterEffectVfxPath==='function'?getCharacterEffectVfxPath(_effectVfxSource(code)):'';
  const speedMul=(typeof G!=='undefined'&&G&&Number(G._effectVfxSpeedMultiplier))||1;
  const cue=url&&typeof _definedVfxCueMs==='function'?_definedVfxCueMs(url,(Number(durationMs)||700)/speedMul):0;
  if(!(cue>0)||typeof _playSfxAtVfxCue!=='function'||typeof getEffectSfxKey!=='function'||!getEffectSfxKey(code)) return _playCardEffectSfx(code);
  _playSfxAtVfxCue(code,cue,{group:'magic',guardKey:`effect:${code}:${uid()}`,guardMs:0});
  return true;
}

function _effectVfxSource(code){
  return {artCode:code,no:code,_code:code};
}

// カードの演出の番号（loader.js CARD_PRESENTATION_FX_CODES。2026-10-22 にシートの「VFX/SE」列から移した。空白・カンマ区切りで複数可）。
function _effectPresentationCodes(unit){
  return String(unit?.fxCode||'').split(/[\s,、\/]+/).map(x=>x.trim().toUpperCase())
    .filter(Boolean).map(x=>/^\d{3}$/.test(x)?`C${x}`:x);
}

// その強化カードの演出の番号。表（loader.js CARD_PRESENTATION_FX_CODES）か、固有の絵を持つ強化カード（活性化・炎の矢）の No.。
// それ以外は空（発動の種類ごとの汎用の演出を present.js が選ぶ）。2026-10-22：シートの「VFX/SE」列をやめた。
// **カード名から推測せず、読み込んだカードデータを引く。**
function _enchantFxCode(name){
  const key=String(name||'').trim();
  if(!key||typeof PANEL_POOL==='undefined'||!Array.isArray(PANEL_POOL)) return '';
  const panel=PANEL_POOL.find(p=>p&&String(p.name||'').trim()===key);
  if(!panel) return '';
  const fx=_effectPresentationCodes(panel)[0]||'';
  if(fx) return fx;
  const own=String(panel.no||panel.artCode||'').trim().toUpperCase();
  return own&&typeof Assets!=='undefined'&&Assets.vfx&&Assets.vfx.enchantEffect&&Assets.vfx.enchantEffect[own]?own:'';
}

// 効果名（コアが damage.fxEffect に載せる。援護射撃 等）→ その強化カードの演出番号。
// VFX/SE列があればそれ、無ければカードのNo.（援護射撃＝E067）。**カード名から番号を推測しない。**
function _enchantPresentationNo(name){
  const key=String(name||'').trim();
  if(!key||typeof PANEL_POOL==='undefined'||!Array.isArray(PANEL_POOL)) return '';
  const panel=PANEL_POOL.find(p=>p&&String(p.name||'').trim()===key);
  if(!panel) return '';
  return _effectPresentationCodes(panel)[0]||String(panel.no||panel.artCode||'').trim().toUpperCase();
}
if(typeof window!=='undefined') window._enchantPresentationNo=_enchantPresentationNo;
// 効果のカードNo.（コアが載せる effectNo）→ そのカードのVFX/SE列の番号。
// **effectNo は効果の識別子なので置き換えない。** 素材を引く時だけこちらを使う。
// 指定が無ければ effectNo をそのまま使う（従来どおり）。
function _effectFxCodeByNo(no){
  const key=String(no||'').trim().toUpperCase();
  if(!key||typeof PANEL_POOL==='undefined'||!Array.isArray(PANEL_POOL)) return key;
  const panel=PANEL_POOL.find(p=>p&&String(p.no||p.artCode||'').trim().toUpperCase()===key);
  const fx=panel?(_effectPresentationCodes(panel)[0]||''):'';
  return fx||key;
}

function _effectPresentationCode(unit){
  // **演出の番号の表（fxCode。loader.js）が最優先。** 無ければカード自身のNo.を使う。
  // 複数指定されている時は先頭を既定にする（どれを使うかは present.js が決める）。
  const fx=_effectPresentationCodes(unit)[0]||'';
  if(fx) return fx;
  const rawCode=String(unit?.no||unit?.artCode||'').toUpperCase();
  const code=/^\d{3}$/.test(rawCode)?`C${rawCode}`:rawCode;
  // コボルドは演出の番号の表（loader.js CARD_PRESENTATION_FX_CODES の S006）で決まる。
  return code;
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
  const opt=options||{};
  if(!list.length||typeof playHitVfxAtRect!=='function') return Promise.resolve();
  // **固有VFXの素材が無いカードはここを通さない。** playHitVfxAtRect() は
  // 固有VFXが引けないと通常の被弾VFX（hit定義）へ落ちるため、
  // 素材の無いカードの効果を演出すると、強化された味方が「殴られた」ように見える
  // （ギガンテスの負傷効果で味方全員にヒットエフェクトが出ていた）。
  if(typeof getCharacterEffectVfxPath==='function'
    &&!getCharacterEffectVfxPath(_effectVfxSource(code))) return Promise.resolve();
  // アラクネはマナ効果の発生元カードとして、通常の対象矩形上へ確実に出す。
  // 画面固定VFX経路へ戻すと、ダメージ表示や勝利時の停止処理と競合する。
  return Promise.all(list.map(target=>{
    const side=(G.enemies||[]).includes(target)?'enemy':'ally';
    // **効果は「今そのキャラクターが見えている位置」から出す。**
    // 攻撃で動いている最中に発動した効果が盤面の定位置から出ると、別人のように見える。
    const getRect=()=>typeof _captureUnitEffectRect==='function'
      ?_captureUnitEffectRect(target,side)
      :(typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(target,side):null);
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
// マナ効果VFXの尺。**PvEとオンラインで同じ値を使うこと。**
const MANA_CUE_VFX_MS=720;
// ひと続きのマナ効果で走っている演出。**同時に1組だけ。**
//   _manaEffectVfx  … 効果固有VFX（活性化＝E045）。処理が終わるまで出し続ける
//                      （同じ効果が同時に乗る全員ぶん）
//   _manaEffectCueDone … マナ効果VFX（既存素材）の完了
let _manaEffectVfx=[];
let _manaEffectCueDone=null;
// いま演出を出している効果の番号。**別の効果はこれが終わるまで始めない。**
let _manaEffectCurrentCode='';
function _manaEffectRunning(){ return _manaEffectVfx.length>0||!!_manaEffectCueDone; }
// ひと続きのマナ効果の演出を終わらせる。**次の効果はこれを終えてから始める。**
// 呼ぶ場所：別の効果のマナ効果を始める前／マナ解決が途切れた時／再生の終わり。
async function _endManaEffectRun(){
  const vfx=_manaEffectVfx; _manaEffectVfx=[];
  const cueDone=_manaEffectCueDone; _manaEffectCueDone=null;
  _manaEffectCurrentCode='';
  if(vfx.length) await Promise.all(vfx.map(v=>v.stop()));
  if(cueDone) await Promise.race([cueDone,new Promise(resolve=>battlePresentationSetTimeout(resolve,MANA_CUE_VFX_MS+700))]);
}

// 戦闘そのものが中断された時の後始末。**待たずに捨てる。**
// 中断（試験戦闘の終了など）では再生の終わりを通らないため、ここを呼ばないと
// 効果固有VFXがループしたまま次の戦闘へ持ち越され、
// 「一度発動した効果のVFX・SEが、以後関係ない場面で出る」状態になる。
function _resetManaEffectRun(){
  const vfx=_manaEffectVfx;
  _manaEffectVfx=[]; _manaEffectCueDone=null; _manaEffectCurrentCode='';
  vfx.forEach(v=>{ try{ v.stop(); }catch(e){} });
}
// 効果1回ぶんの合図。**SEは発動回数ぶん鳴らす**（活性化＝E045.wav）。
// **VFXはひと続きの処理が終わるまで出し続ける**ので、最初の1回でだけ始める
// （止めるのは `_endManaEffectRun()`）。1回ずつ出し直すと連続再生に見えてしまう。
// **固有の素材が無い効果では何も鳴らさない・出さない。**
// マナ効果SE（既存素材）で代用すると、発動のたびにマナ効果SEが鳴る
// （マナ効果VFX・SEはひと続きにつき1回だけ、が規則）。
// **SEは同じ瞬間に1本だけ。** 人数ぶん重ねると鳴り始めがばらついて濁る。
function _playManaEffectPulse(list,effectNo){
  if(typeof presentLabFx==='function'&&presentLabFx(effectNo)) return;
  // バフの演出（S005〜S009）は**能力変化を受けた対象の上**に出す（present.js が唯一の規則）。
  // ここで出すと発生元の上になり、対象に選ばれていない本人だけが光る（ドワーフで発覚）。
  if(typeof presentIsBuffVfxCode==='function'&&presentIsBuffVfxCode(effectNo)) return;
  const sfxKey=(typeof getEffectSfxKey==='function'&&getEffectSfxKey(effectNo))||'';
  if(sfxKey&&typeof playSfx==='function') playSfx(sfxKey,{group:'magic',guardKey:`mana-effect:${uid()}`,guardMs:0});
  if(_manaEffectVfx.length||!effectNo||typeof playEffectVfxOnUnit!=='function') return;
  list.forEach(({unit,isEnemySide,rect})=>{
    // **合図（既存素材）と同じ位置から出す。** ここは合図の逆再生開始後に呼ばれるため、
    // 攻撃モーションの複製カードが既に消えていることがある。掴み直すと
    // 合図だけ動いた位置・固有VFXは盤面の定位置、とズレる。
    const v=playEffectVfxOnUnit(unit,isEnemySide?'enemy':'ally',effectNo,
      {rect,minDurationMs:(typeof PRESENT_EFFECT_VFX_MIN_MS==='number'&&PRESENT_EFFECT_VFX_MIN_MS)||900});
    if(v) _manaEffectVfx.push(v);
  });
}
// units：同じ瞬間に同じ効果が発動する全員（[{unit,isEnemySide}]）。
// **1体ずつ順に見せない。** 順に見せると「片方が先に強くなる」ように見える。
// opt.repeat：同じ効果の2回目以降の発動。**間引かず高速で繰り返す。**
//
// 見せ方：**マナ効果VFX（既存素材）とSE（既存素材）はその効果につき最初の1回だけ。**
// その逆再生開始から先は、効果固有のVFXを**処理が終わるまで出し続け**、
// 効果固有のSEを**発動回数ぶん**鳴らす。
async function _playManaEffectCue(units,opt){
  const list=(Array.isArray(units)?units:[]).filter(x=>x&&x.unit);
  if(!list.length) return;
  const repeat=!!(opt&&opt.repeat);
  const effectNo=String((opt&&opt.effectNo)||'');
  // **素材はシートの「VFX/SE」列で引く。** effectNo（効果の識別子）は演出の
  // 区切り（今どの効果を出しているか）に使い、素材の番号とは分けて持つ。
  const fxCode=typeof _effectFxCodeByNo==='function'?_effectFxCodeByNo(effectNo):effectNo;
  const gap=(typeof PRESENT_MANA_RUN_GAP_MS==='number'&&PRESENT_MANA_RUN_GAP_MS)||150;
  // **別の効果の演出が出ている間は、VFXもSEも始めない。**
  // 繰り返し（repeat）の経路でもここを通すこと。通していなかった頃は、
  // 活性化の演出が出ている最中に炎の矢の演出が重なった。
  if(_manaEffectRunning()&&_manaEffectCurrentCode!==effectNo) await _endManaEffectRun();
  if(repeat){
    _manaEffectCurrentCode=effectNo;
    _recordBattleTrace('mana_effect_pulse',{unitId:list[0].unit.id,effectNo,人数:list.length});
    _playManaEffectPulse(list,fxCode);
    await new Promise(resolve=>battlePresentationSetTimeout(resolve,gap));
    return;
  }
  // 直前の効果の演出（固有VFX・マナ効果VFX）を終わらせてから始める。
  // 異なる効果を同じ画面に重ねない。
  await _endManaEffectRun();
  // **`_endManaEffectRun()` は「今出している効果」の印を消す。** 印を付けるのはこの後。
  // 先に付けると1回目で消され、2回目が「別の効果」と誤判定されて
  // マナ効果VFXの完了（約1秒）を待ってしまう（1回目と2回目の間だけ不自然に空いた）。
  _manaEffectCurrentCode=effectNo;
  _recordBattleTrace('mana_vfx_start',{unitId:list[0].unit.id,effectNo,人数:list.length});
  // マナ効果SEはひと続きにつき1回だけ。
  if(typeof playSfx==='function') playSfx(getKeywordEffectSfxKey('マナ効果'),{group:'magic',guardKey:`mana-effect:${uid()}`,guardMs:0});
  // 逆再生開始で効果固有の演出へ引き継ぐ（1回目の発動ぶん）。
  let pulsed=false;
  let pulsedAt=0;
  // 合図（既存素材）を出した位置。**効果固有のVFXも同じ位置から出す。**
  // ここで揃えないと、合図は動いた位置・固有VFXは盤面の定位置、とズレる
  // （固有VFXは合図の逆再生開始後に出るので、その頃には複製カードが消えている）。
  let cueTargets=null;
  const startPulse=()=>{
    if(pulsed) return; pulsed=true;
    pulsedAt=(typeof performance!=='undefined'?performance.now():Date.now());
    const pulseList=cueTargets&&cueTargets.length?cueTargets:list;
    _playManaEffectPulse(pulseList,fxCode);
  };
  // 開戦直後・召喚直後はrenderAll()とレイアウト確定が別フレームになる。
  // ここでnullのまま返すと、VFXなしでマナ効果だけが先に解決されるため、
  // DOM上の対象矩形が取れるまで短時間だけ再取得する（代表1体で待てば全員取れる）。
  // マナ効果の合図も「今そのキャラクターが見えている位置」から出す
  // （攻撃で動いた地点で発動した効果が、盤面の定位置から出ないように）。
  const rectOf=({unit,isEnemySide})=>typeof _captureUnitEffectRect==='function'
    ?_captureUnitEffectRect(unit,isEnemySide?'enemy':'ally')
    :(typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(unit,isEnemySide?'enemy':'ally'):null);
  let lead=null;
  for(let i=0;i<24&&!lead;i++){
    const r=rectOf(list[0]);
    if(r&&r.width>0&&r.height>0){ lead=r; break; }
    // 開戦直後はマナ効果がDOM描画より先に走るため、待つだけでは
    // 何フレーム経ってもスロットが生まれない。数フレームで取れない時は
    // 一度こちらから盤面を描かせる。
    if(i===3||i===11){
      if(typeof requestBattleCompact==='function') requestBattleCompact({forceDuringMotion:true});
      else if(typeof renderAll==='function') renderAll();
    }
    await _awaitFrame();
  }
  _recordBattleTrace('mana_vfx_rect',{unitId:list[0].unit.id,取得:!!lead,
    幅:lead?Math.round(lead.width):0,左:lead?Math.round(lead.left):0});
  const targets=list.map(x=>({...x,rect:x===list[0]?lead:rectOf(x)}))
    .filter(x=>x.rect&&x.rect.width>0&&x.rect.height>0);
  cueTargets=targets;
  if(!targets.length||typeof playHitVfxAtRect!=='function'){
    // 対象DOMを取得できない場合でも、状態だけを即時に反映してしまうと、
    // VFXが出た場合と処理時刻が変わる。旧演出の「命中表示→逆再生開始」に
    // 相当する時刻まで待ってから、同じ境界を通す。
    _recordBattleTrace('mana_vfx_missing',{unitId:list[0].unit.id});
    await new Promise(resolve=>setTimeout(resolve,200));
    startPulse();
    return;
  }
  let resolveReverseStart;
  const reverseStart=new Promise(resolve=>{ resolveReverseStart=resolve; });
  const onReverse=()=>{ startPulse(); resolveReverseStart(); };
  // 完了は保持だけしておく。**待つのは次の効果を始める時**（_endManaEffectRun）。
  _manaEffectCueDone=Promise.all(targets.map(({unit,isEnemySide,rect})=>
    playHitVfxAtRect(rect,0,{
      keywordEffect:'マナ効果',
      keywordSfx:false,   // マナ効果SEは上で1回だけ鳴らしている
      gateMs:0,
      hitDuration:MANA_CUE_VFX_MS,
      fadeDuration:700,
      vfxScale:.5,
      spin:true,
      waitForFinish:true,
      getRect:()=>rectOf({unit,isEnemySide}),
      // 逆再生開始＝ここから効果固有の演出へ引き継ぎ、効果の処理を進める。
      onFadeStart:onReverse,
    }).catch(()=>onReverse())));
  // 効果の処理はマナ効果VFXの**逆再生開始**から進める（旧来の演出境界）。
  // 素材の読み込み失敗などでコールバックが届かない場合だけ安全弁を使う。
  await Promise.race([reverseStart,new Promise(resolve=>battlePresentationSetTimeout(resolve,MANA_CUE_VFX_MS))]);
  startPulse();
  // 1回目の効果演出にも次の発動までの間隔を取る。取らないと2回目が同じ瞬間に重なる。
  // **間隔は「1回目を出した時刻」から測る。** マナ効果VFXの逆再生開始を待つ間に
  // 時間が経っていると、ここから改めて待つと1回目と2回目の間だけ不自然に空く。
  const sincePulse=(typeof performance!=='undefined'?performance.now():Date.now())-pulsedAt;
  const rest=Math.max(0,gap-(pulsedAt?sincePulse:0));
  if(rest>0) await new Promise(resolve=>battlePresentationSetTimeout(resolve,rest));
  _recordBattleTrace('mana_vfx_reverse_confirmed',{unitId:list[0].unit.id});
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
  // 自動加速は1.5倍まで（_setBattleSpeedTarget）。オプションの2倍速・3倍速はこの上限の外で固定する。
  return Math.max(1,Math.min(3,scale));
}
// オプションの演出速度（options.js の window.VB_OPTION_SPEED）の倍率。通常は1（自動加速を使う）。
// 旧「高速」（fast）は2倍速として扱う。
function optionBattleSpeedMultiplier(){
  const v=typeof window!=='undefined'?window.VB_OPTION_SPEED:'';
  if(v==='x3') return 3;
  if(v==='x2'||v==='fast') return 2;
  return 1;
}

// 戦闘演出の速度は、PvE／オンラインで同じ入口から読む（唯一の実装）。
// **再生中かどうかは経路ごとに別の印で持つ。**
//   PvE：G._battlePhaseRunning（_advanceToBattlePhase() で立ち、戦闘の終わりで下りる）
//   オンライン：window.__VB_BATTLE_PRESENTATION_PLAYING（board.js の beginOnlineVersusField／endOnlineVersusField）
// 同じ印をPvEでも立てていた頃は、PvEが下ろし忘れて編成画面の待ちまで速くなり、PvEの自動加速も効かなくなっていた。
function _isOnlineBattlePresentationPlaying(){
  return !!(typeof window!=='undefined'&&window.__VB_BATTLE_PRESENTATION_PLAYING);
}
function isBattlePresentationPlaying(){
  // セーブ有効時の戦闘（通常プレイ）は SaveRun.replay() が再生し、_battlePhaseRunning を立てない。
  // これを見ないと、演出速度（自動加速・2倍速・3倍速）が通常プレイの戦闘に一度も掛かっていなかった（2026-09-25）。
  return _isOnlineBattlePresentationPlaying()||!!(typeof G!=='undefined'&&G&&(G._battlePhaseRunning||G._savedBattleReplaying));
}
// 速度倍率 S：再生中でなければ1。オプション「2倍速」「3倍速」は PvE・オンラインとも2・3。
// 「通常」は PvE・オンラインとも同じ自動加速を使う。自動加速の判定更新も
// この入口へ集約し、待ち・タイマー・アニメーション同期の経路差を作らない。
function getBattlePresentationSpeedScale(){
  if(!isBattlePresentationPlaying()) return 1;
  // 終戦の効果の演出は等倍で見せる（2026-10-27 利用者指定「終戦VFXは省略せず、早送りもしません」）。
  if((typeof G!=='undefined'&&G&&G._battleEndPresenting)||(typeof presentBattleEndPhase==='function'&&presentBattleEndPhase())) return 1;
  // オプションの2倍速・3倍速は最初から固定の倍率（自動加速の立ち上がりも無し）。
  const optionMul=optionBattleSpeedMultiplier();
  if(optionMul>1) return optionMul;
  // 速度を読む全経路（sleep・タイマー・rAF・VFX）から同じ判定を通す。
  // イベント再生型のPvEは battleSleep() を通らないため、ここが自動加速判定の入口。
  // rAFは毎フレーム呼ばれるので、短時間の再判定は間引く。
  if(typeof G!=='undefined'&&G){
    const now=performance.now();
    const last=Number(G._battleSpeedLastCheckAt);
    if(!Number.isFinite(last)||now-last>=100){
      G._battleSpeedLastCheckAt=now;
      updateBattleSpeedMode();
    }
  }
  return getBattleSpeedScale();
}
function battlePresentationSetTimeout(fn,ms){
  const speed=typeof getBattlePresentationSpeedScale==='function'
    ?getBattlePresentationSpeedScale():1;
  return setTimeout(fn,Math.max(0,Number(ms)||0)/speed);
}

// CSSアニメーション・element.animate() の再生速度を S に揃える。
// 毎フレーム軽く確かめ、再生が終わった時に一度だけ 1 へ戻す（戦闘後の編成画面の演出を速くしない）。
let _battlePresentationAnimationRaf=0;
let _battlePresentationAnimationRate=1;
function _isBattlePresentationAnimation(anim){
  const target=anim&&anim.effect&&typeof anim.effect.getTiming==='function'
    ?anim.effect.target:null;
  let owner=target;
  while(owner&&typeof owner.closest!=='function') owner=owner.parentElement||owner.parentNode||owner.host||null;
  if(!owner) return false;
  // 行動表示は定数を速度で割ったtransitionを使うため、playbackRateで二重に縮めない。
  if(owner.closest('#options-layer,.click-ripple,button:hover,[data-ui-hover],#battle-action-banners')) return false;
  return !!owner.closest('#scr-battle,.vfx,.damage-label-host,.attack-motion-clone,.death-burn-clone,#battle-start-intro,[data-code-vfx]');
}
function _syncBattlePresentationAnimations(){
  const speed=isBattlePresentationPlaying()?getBattlePresentationSpeedScale():1;
  if((speed!==1||_battlePresentationAnimationRate!==1)&&typeof document!=='undefined'&&typeof document.getAnimations==='function'){
    document.getAnimations({subtree:true}).forEach(anim=>{
      if(_isBattlePresentationAnimation(anim)&&anim.playbackRate!==speed){
        try{ anim.playbackRate=speed; }catch(_e){}
      }
    });
  }
  _battlePresentationAnimationRate=speed;
  _battlePresentationAnimationRaf=typeof requestAnimationFrame==='function'?requestAnimationFrame(_syncBattlePresentationAnimations):0;
}
function setBattlePresentationPlaying(playing){
  // オンラインの再生だけが使う（PvE は G._battlePhaseRunning）。
  if(typeof window!=='undefined') window.__VB_BATTLE_PRESENTATION_PLAYING=!!playing;
  if(!_battlePresentationAnimationRaf&&typeof requestAnimationFrame==='function'){
    _battlePresentationAnimationRaf=requestAnimationFrame(_syncBattlePresentationAnimations);
  }
}
if(typeof requestAnimationFrame==='function'&&typeof window!=='undefined'){
  _battlePresentationAnimationRaf=requestAnimationFrame(_syncBattlePresentationAnimations);
}

function _setBattleSpeedTarget(target){
  target=Math.max(1,Math.min(1.5,target||1));
  if(!G||G._battleSpeedTarget===target) return;
  G._battleSpeedFrom=getBattleSpeedScale();
  G._battleSpeedTarget=target;
  G._battleSpeedChangedAt=performance.now();
}

// PvE／オンラインで同じ戦闘演出速度の基準時刻と状態を使う。
// オンラインは startBattle() を通らないため、入口だけ別に初期化すると
// 自動加速の経過時間や前回の攻撃記録が戦闘をまたいで混ざってしまう。
function initializeBattlePresentationState(){
  if(typeof actionBannerClear==='function') actionBannerClear(true);
  if(!G) return;
  G._battleStartedAt=performance.now();
  G._battleSpeed=1;
  G._battleSpeedFrom=1;
  G._battleSpeedTarget=1;
  G._battleSpeedChangedAt=performance.now();
  G._battleSpeedLastCheckAt=-Infinity;
  G._battleSpeedReason='';
  G._battleAttackedIds={};
}

function updateBattleSpeedMode(){
  // 戦闘演出の再生中だけ判定する。PvE／オンラインの判定は
  // isBattlePresentationPlaying() に集約し、phase名へ依存しない。
  const canUpdate=isBattlePresentationPlaying();
  if(!canUpdate) return getBattleSpeedScale();
  // オプションの演出速度「2倍速」「3倍速」は最初からその倍率で固定する（加速の3秒の立ち上がりも無し）。
  // 「通常」は下の自動加速（長い戦闘だけ速める。最大1.5倍）をそのまま使う。
  // 値は options.js が window.VB_OPTION_SPEED に置く（G は startGame() で作り直されるため G には持たない）。
  const optionMul=optionBattleSpeedMultiplier();
  if(optionMul>1){
    if(G._battleSpeedTarget!==optionMul||G._battleSpeedFrom!==optionMul){
      G._battleSpeedFrom=optionMul; G._battleSpeedTarget=optionMul; G._battleSpeed=optionMul; G._battleSpeedChangedAt=performance.now();
    }
    return getBattleSpeedScale();
  }
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
  const speed=getBattlePresentationSpeedScale();
  // 通常速度は1.60倍まで遅くし、1.5倍速時は従来の1.12倍相当へ戻して加速後のテンポを維持する。
  const fastProgress=Math.max(0,Math.min(1,(speed-1)/.5));
  const tempoMul=1.6-(.48*fastProgress);
  // sleep() 自体も再生中の速度を適用するため、ここでは二重に割らない。
  return sleep((Number(ms)||0)*tempoMul,{skipBattlePresentationSpeed:true});
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
function _tryNecromancerRingRevive(){
  // コア駆動の戦闘では復活（指輪・キーワード）は coreTryRevive() が解決する。
  // ここで別の復活を足すと、コアが知らない蘇生が起きて盤面が食い違う。
  if(G._coreDrivenBattle) return false;
  if(G._necromancerRingUsed||!_hasRingEffect('necromancer_ghosts')) return false;
  const hasLivingFront=(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&!_isSealed(a)&&String(a.lane||'front')==='front');
  if(hasLivingFront) return false;
  G._necromancerRingUsed=true;
  for(let i=0;i<3;i++) void _spawnAdhocAllyUnit('青スケルトン',4,2,false,{rightmost:true});
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

function _rollEnemyGold(enemy,rng){
  const range=Array.isArray(enemy&&enemy.goldRange)?enemy.goldRange:null;
  // 所持金の無い体（戦闘中に召喚された敵など）は0。区間の配分（applyEnemyGoldPlan）の合計を崩さない。
  if(!range) return 0;
  const lo=Math.max(0,Number(range[0])||0);
  const hi=Math.max(lo,Number(range[1])||lo);
  return rng?rng.int(lo,hi):randi(lo,hi);
}

function _initSealStates(){
  // 誰が封印されるか・何体必要かはコアが決める。盤面上の並び順だけG側から渡す。
  const units=_allBattleCharacters().filter(u=>!G._preserveEnemyOpening||!(G.enemies||[]).includes(u));
  coreInitSealStates(units, _fieldOrderOfUnit);
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
  requestBattleCompact();
  return snap;
}

function _releaseRepeatCount(unit,isEnemySide){
  const side=isEnemySide?G.enemies:G.allies;
  // 秘紋の指輪：常時：味方の解放効果は1回追加で発動する。（敵側のunitには適用しない）
  const ringExtra=isEnemySide?0:_ringCount('秘紋の指輪');
  return 1+ringExtra+coreExtraTriggerTimes(unit,'解放',_unitKeywordCount(unit,'禁断の力'))
    +coreAllyExtraTriggerTimes(unit,{units:{[unit.side]:side}},'解放')+(Number(unit._effectRepeatBonus)||0);
}

// PvEの各互換フックから共通コアへ渡す現在地。刻印のXは必ず現在のステージを
// 参照し、保存済みユニットへ以前の値が残っていてもそちらへ戻らないようにする。
function _pveCoreStageFields(){
  return {
    ...runLevelCoreFields(),
    // 薄いstateを作り直す開戦・死亡・召喚の入口でも、同じランの撃破記録を共有する。
    defeatedEnemies:G.defeatedEnemies||(G.defeatedEnemies=coreDefeatedEnemyFields().defeatedEnemies),
    ...coreGameSummonBuffFields({p1:G.gameSummonBuff}),
    ...coreRunEffectFields({p1:G.runEffects||{}}),
    ...coreBattleEndCardFields({p1:G.mainBoard||[]}),
    itemFreeSlots:{p1:(G.spellSlots||[]).filter(x=>!x).length,p2:4},
    mapIndex:Math.max(1,Number(G.floor)||1),
    stageNumber:Math.max(1,Number(G._wave)||1),
    ...(G._preserveEnemyOpening?{openingSides:['p1']}:{}),
  };
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
    ..._pveCoreStageFields(),
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
    deferManaThresholdEffects:true,
    _deferLichSummons:true,
  };
  _takePveSummonState(state);
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot,u._voidWalkerBonus]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  // 2026-10-12: オンラインと同じく、旧保存に残る常時の紫修正だけを初期化する。
  // 現行本文の熟練付与は、この後の共通コアの開戦処理が行う。
  // 戦闘終了後は、アダプタ固有の一時値を元へ戻す。
  // 2026-10-12: 合体の紫修正も本文から読む共通計算を通し、PvEだけ旧値1を渡さない。
  coreRefreshVoidWalkerBonus(state);
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{
    localEvents.push(ev);
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  // **オプションをコアへそのまま渡すこと。** ここで落とすと、コアが
  // 「全員にダメージを入れてからまとめて誘発」（coreHitAll の deferTriggers/collect）を
  // 指示しても PvE 側だけ1体ずつ即誘発になり、オンラインと結果が食い違う。
  const applyHit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit,
      Object.assign({skipSourceEffects:!!skipSourceEffects,skipTough:!!skipTough},options||{}));
  };
  try{
    coreApplyReleaseEffects(unit,(sacrificed||[]).map(x=>x&&x._releaseSnapshot||x),state,coreMathRng,emit,applyHit);
    _keepPveSummonState(state);
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
  const effectsStopped=()=>!!(_pveOpeningSummonState&&_pveOpeningSummonState._coreBattleStopped);
  if(effectsStopped()) return false;
  if(_battleVictoryAlreadyPending()) return false;
  if(!_livingCombatUnits(G.enemies).length) return false;
  if(G._resolvingSeals) return false;
  const candidates=_orderedBattleCharacters().filter(u=>_isSealed(u));
  if(!candidates.length) return false;
  G._resolvingSeals=true;
  try{
    for(const unit of candidates){
      if(effectsStopped()) return false;
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
      const release=()=>{ unit._sealed=false; delete unit._sealValue; };
      if(typeof playSealReleaseVfx==='function'){
        await playSealReleaseVfx(unit,isEnemySide?'enemy':'ally',release);
      } else {
        release();
      }
      delete unit._sealReady;
      delete unit._coreDeathEffectsTriggered;
      // 旧PvEの解放後処理。解放自体は新しい召喚ではなく、眷属を付与しない。
      await _afterPanelSummon(unit,isEnemySide);
      const repeats=_releaseRepeatCount(unit,isEnemySide);
      for(let i=0;i<repeats;i++) await _applyReleaseEffect(unit,isEnemySide,[]);
      if(effectsStopped()) return false;
      // 呼応の指輪：常時：味方が解放された時、そのコピーを召喚する。
      if(!isEnemySide&&unit.hp>0){
        const echoCount=_ringCount('呼応の指輪');
        for(let i=0;i<echoCount;i++){
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
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx({preserveDamage:true,keepActionBanner:true});
  if(typeof questHandleBattleVictory==='function'&&questHandleBattleVictory()) return;
  if(typeof finishWaveBattleVictory==='function'&&finishWaveBattleVictory(true)) return;
  // 表示タイマーと非表示タイマーを独立したsetTimeoutで走らせず、表示が確定してから
  // 一定時間後に非表示にするようチェーンする（メインスレッドが混雑していても表示が
  // 一瞬で消えないようにするため）。
  showVictoryOverlay(()=>{
    _cleanupBattleEndTransientUnits();
    if(G._libraryTestBattleMode){
      _exitTestBattle();
      return;
    }
    if(G.phase==='reward') return goToReward({checkpoint:true});
  });
}


function addUnitHp(unit, amount, sideOverride){
  if(!unit||amount<=0) return 0;
  // 2026-10-12: 旧受け口も熟練Nの数値を再実装せず、共通コアへ委譲する。
  const total=_isBattleGainPhase()?coreStatBonus(unit,amount,unit):amount;
  unit.hp+=total; unit.maxHp+=total;
  return total;
}

function _isBattleGainPhase(){
  return !!(G&&['player','enemy'].includes(G.phase));
}

function snapshotAlliesAtBattleStart(){
  G._allyBattleStartSnapshot=(G.allies||[]).map(a=>a?clone(a):null);
  G._rewardBattleStateRestored=false;
}




async function startBattle(){
  if(typeof guardRingExchangeDeparture==='function'&&!guardRingExchangeDeparture()) return false;
  const savedBattle=typeof SaveRun!=='undefined'?SaveRun.takeResume():null;
  const showBattleStartAutosave=!!(G&&G._battleStartAutosaveRequested)&&!savedBattle;
  if(G) delete G._battleStartAutosaveRequested;
  const arenaBattle=!!(typeof arenaIsActive==='function'&&arenaIsActive());
  const questBattle=!!(typeof questBattleCarryActive==='function'&&questBattleCarryActive());
  const arenaRound=Math.max(1,Number(G._arenaRound)||1);
  // 2戦目以降は前戦闘の味方配列・HP・バフ・資源をそのまま次戦へ渡す。
  // セーブ再開は setup を復元するため、ここでは通常の初期化を通してよい。
  const arenaCarry=arenaBattle&&!savedBattle&&arenaRound>1;
  const questCarry=questBattle&&!savedBattle;
  const carryBattle=arenaCarry||questCarry;
  // 引き継ぐ体には、前の戦闘で付いた「体どうしを指す参照」（_lastDamageSource 等）が残っている。
  // 敵と味方が互いを指して循環し、clone()（JSON）が例外で落ちていた（GN-T0。2026-09-25 利用者報告）。
  // 戦闘ごとの一時的な値なので、次の戦闘の前に外す（セーブの omitted と同じ扱い）。
  if(carryBattle) [...(G.allies||[]),...(G.enemies||[])].forEach(u=>{
    if(!u||typeof u!=='object') return;
    ['_lastDamageSource','_coreRunner','_lastVisualRect','_battleEntryRect'].forEach(k=>{ delete u[k]; });
  });
  const saveBattle=typeof SaveRun!=='undefined'&&SaveRun.enabled();
  G._savePreparing=saveBattle;
  G._savePresentation=!!savedBattle;
  if(saveBattle) SaveRun.lockInput(true);
  G._savedBattleEnd=null;
  G._debugFormationAbort=false;
  G._battleEventPlaybackDepth=0;
  G._battleVictoryCheckPending=false;
  _warmBattleHitSfx();
  // 例外で抜けた回数が残ると、以後ずっと盤面が詰まらない。戦闘の頭で必ず戻す。
  presentResetPlayback();
  // 保留していた発光も捨てる（持ち越すと次の戦闘の頭で無関係のカードが光る）。
  if(typeof presentResetEffectFlashes==='function') presentResetEffectFlashes();
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
  // 次に goToReward() が走るまで前回のボス戦判定値を保持し続けるため、
  // 塔や施設を挟んだ次の通常戦闘の勝利までボス勝利SEが鳴ってしまう。戦闘開始時に必ず落とす。
  G._isBossRewardCycle=false;
  document.body.classList.remove('right-card-peek');
  G._battleSummonedAllyCount=0;
  _pveLiveCoreState=null;
  _pveOpeningSummonState=null;
  // battle-victory-pending は #kw-tooltip 等を display:none で隠すクラス。
  // 解除が goToReward() 側にしか無いため、報酬画面を挟まない遷移
  // （ステージ5のエリート勝利→ラスボス直行など）では付いたまま次の戦闘に入り、
  // その戦闘中ずっとホバー説明が出なくなる。戦闘開始時に必ず落とす。
  document.body.classList.remove('reward-screen-active','ring-offer-phase','ring-offer-resolved','battle-victory-pending');
  _prepareStartingBattleItems(carryBattle);
  if(typeof setBattleStageBackground==='function') setBattleStageBackground();
  _updateLaneOffset();

  updateGoldenDrop();
  if(typeof syncUnitPanelStatBonuses==='function') G.allies.forEach(a=>syncUnitPanelStatBonuses(a));
  G._manaCycleUsed=false;
  G._eidolonDeathCount=0;
  G._genericAllyDeaths=0;
  if(!carryBattle) G.mana=0;
  // **マナ増加SEの基準を、その戦闘の開始値（0）へ戻す。**
  // null（初回）や前の戦闘の値のままだと、開戦で得た最初のマナ
  // （ニンフの「開戦：Xマナを得る」など）でSEが鳴らない。
  _shownManaForSfx=carryBattle?Math.max(0,Number(G.mana)||0):0;
  [...(G.allies||[]),...(G.enemies||[])].forEach(u=>{ if(u){
    delete u._deathProcessed;
    if(!carryBattle||!(G.allies||[]).includes(u)) delete u._manaFireCount;
    delete u._coreDeathTriggered; delete u._coreDeathEffectsTriggered;
    delete u._coreDeathObserved;
    if(!carryBattle) delete u._wardCharges;
  } });

  // フェイズを先行設定（報酬フェイズから遷移時、addAlly/renderAll 等が reward UI を誤操作しないよう）
  G.phase='player';
  G._showGlobalPanels=true;
  G._battleDefeatHandled=false;
  G._selectedBoardUnitIdx=-1;

  _hideRewardUiForBattle();
  const fixedTestBattle=!!(G._testBattleMode&&!G._libraryTestBattleMode);
  const mapBattle=fixedTestBattle?null:(G._mapBattle||null);
  // デバッグ試験戦闘は通常進行の現在nodeから完全に分離し、常に指定階層を使う。
  // 通常戦闘後に残るG._mapBattleを優先すると、序盤戦の敵数制限まで試験戦闘へ混入する。
  const battleFloor=fixedTestBattle?G.floor:(mapBattle?mapBattle.floor:G.floor);
  const fd=FLOOR_DATA[battleFloor];
  const arenaBossRound=arenaBattle&&((typeof arenaRoundKind==='function'
    ?arenaRoundKind(arenaRound)==='boss'
    :arenaRound===6));
  _isBossFight=!!(mapBattle?(mapBattle.type==='boss'||mapBattle.forcedBoss):(fd&&fd.boss))
    ||arenaBossRound;

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G.battleCounters={damage:0,deaths:0};
  if(!carryBattle) G._blood=0;
  G._enemyBlood=0;
  initializeBattlePresentationState();
  G._battleVictoryPending=false;
  // 継戦の味方は発動済み回数も引き継ぐ。消すと前戦で得たマナの効果が開幕に再発動する。
  [...(G.allies||[]),...(G.enemies||[])].forEach(u=>{
    if(u&&(!carryBattle||!(G.allies||[]).includes(u))) delete u._manaFireCounts;
  });
  G._battleEndEffectsApplied=false;
  // 起動は「戦闘終了ごとに1回（累積しない）・獲得即使用は不可」（2026-10-23 利用者指定）。戦闘中に魔導板のカードは
  // 入れ替わらないので、始まる時点の魔導板へ印を立てるのと同じ（勝ち・負け・闘技場のどの終わり方でも漏れない）。
  // 試験戦闘（図書館・デバッグ）では立てない。
  if(!G._testBattleMode&&!G._libraryTestBattleMode&&typeof chargeBoardCardActivations==='function') chargeBoardCardActivations();
  G._necromancerRingUsed=false;
  G._revivalRingUsed=false;
  G._oniRingAttackCount=0;
  G._stormRingFireCount=0;
  // 「報酬に出現」（ハイドラ）はその戦闘の報酬のもの。報酬の無かった戦闘（エリート・ボス等）の残りは持ち越さない。
  if(!carryBattle) G._bonusRewardPanels=[];
  // 闘技場などの継戦：持ち越したマナで到達済みのマナ効果・嵐の指輪は発動済みにする。
  // 前の戦闘で敵が全滅して処理されなかった効果を、この戦闘の開始時に発動させない（2026-10-20 利用者指定）。
  if(carryBattle&&typeof coreConsumeCarriedManaEffects==='function'){
    const carried={units:{p1:(G.allies||[]).slice(),p2:[]},resources:{p1:{mana:Math.max(0,Number(G.mana)||0),gold:0},p2:{mana:0,gold:0}},
      rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},items:{p1:[],p2:[]}};
    (carried.units.p1||[]).forEach((u,i)=>{ if(u){ u.side='p1'; u.slot=i; } });
    coreConsumeCarriedManaEffects(carried);
    G._stormRingFireCount=Number(carried._stormRingFireCount)||0;
  }
  G._enemyDeathsThisBattle=0;

  const waveEnemyKey=`${Number(G._wave)||1}:${Number(G._waveStage)||1}:${String(G._waveBattleType||'')}`;
  // デバッグ試験戦闘は「毎回まったく同じ内容」であること。通常戦闘のリトライ用
  // 敵スナップショットを流用すると、直前に戦った敵（効果・演出まで）がそのまま出て
  // ATK/HPだけ書き換わった状態になる。生成も乱数固定にして構成のぶれを無くす。
  const reuseWaveEnemies=!fixedTestBattle&&!arenaBattle&&!questBattle
    &&!!(waveEnemyKey&&G._waveRetryEnemyKey===waveEnemyKey&&Array.isArray(G._waveEnemySnapshot));
  // 再戦は開始時のスナップショットを使い、敵も通常どおり開戦する。
  // _waveEnemySnapshotAtEnd は、終了時の盤面を維持していた頃（2026-10-07〜10）の古いセーブだけが持つ。
  // 保存した戦闘の再生では、setup の同じ指定から復元する（一時的なGの旗は保存しない）。
  G._preserveEnemyOpening=savedBattle
    ?Array.isArray(savedBattle.setup.openingSides)&&!savedBattle.setup.openingSides.includes('p2')
    :reuseWaveEnemies&&!!G._waveEnemySnapshotAtEnd;
  // 封印の解放条件も同じところから続ける。味方の血は従来どおり初期化する。
  if(!savedBattle&&G._preserveEnemyOpening) G._enemyBlood=Math.max(0,Number(G._waveEnemySnapshotBlood)||0);
  // **同じ戦闘への再挑戦では開幕の会話を飛ばす。** 同じ台詞を毎回読まされるため。
  // 敵を引き継ぐ（＝同じ敵に挑み直した）時が再挑戦。
  G._skipBattleStartLines=reuseWaveEnemies||!!(questBattle&&G._waveIsRetry);
  G.enemies=savedBattle?SaveRun.copy(savedBattle.setup.units.p2):arenaBattle
    ?generateArenaEnemies(arenaRound):reuseWaveEnemies
    ?clone(G._waveEnemySnapshot)
    :questBattle
    ?generateQuestGarmEnemies()
    :(fixedTestBattle
      ?_generateFixedTestBattleEnemies(battleFloor)
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
  _layoutStartingBattleEnemies(savedBattle,reuseWaveEnemies,arenaBattle,questBattle,fixedTestBattle,mapBattle,battleFloor,carryBattle);
  // 2026-10-25：初めて戦う旅程の戦闘だけ、敵の所持金を区間の配分で決める（再戦・保存した戦闘の再生は決めた額のまま）。
  if(waveEnemyKey&&!savedBattle&&!reuseWaveEnemies&&!arenaBattle&&!questBattle&&!fixedTestBattle
    &&!G._testBattleMode&&!G._libraryTestBattleMode&&!G._onlineMode&&typeof applyEnemyGoldPlan==='function'){
    applyEnemyGoldPlan(G.enemies,G._wave,G._waveStage);
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
  if(waveEnemyKey&&!fixedTestBattle&&!arenaBattle&&!questBattle){
    // 再戦は開始時の敵へ戻す（2026-10-10 利用者指定：敗北時の盤面維持をやめ、以前のリセットに戻す）。
    // 並び（前衛・後衛・左右）もこの時点のまま使い、再戦時に配置し直さない。
    if(reuseWaveEnemies) G._waveRetryEnemyKey=null;
    else { G._waveEnemySnapshot=clone(G.enemies); G._waveEnemySnapshotAtEnd=false; G._waveEnemySnapshotBlood=0; }
  }
  G.enemies.forEach(e=>{
    if(!e) return;
    if(e._isObject) return;
    e.allyTarget=false;
    delete e._deathFxStarted;
  });
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');

  _resetStartingBattleAllies(carryBattle);
  // 味方出撃処理が既存の盤面DOMを再描画する前に、全戦闘でカードを
  // 非表示にして、一瞬だけ見えるフラッシュを防ぐ。
  const preIntroHost=document.getElementById('scr-battle');
  if(preIntroHost){
    preIntroHost.classList.remove('battle-start-units-revealing');
    preIntroHost.classList.add('battle-opening-pending');
    // 続きの戦闘では味方は場に居たまま（隠さない）。
    preIntroHost.classList.toggle('battle-carry-allies',_battleCarryOpening());
  }

  // カードの実体だけを先に構築し、開戦時効果は配置演出後まで保留する。
  G._deferManaThresholdEffects=true;
  if(savedBattle){
    SaveRun.installSetup(savedBattle);
  }else if(!carryBattle){
  _initSealStates();
  if(typeof applyNewPanelBattleStart==='function') await applyNewPanelBattleStart({deferOpeningEffects:true,persistEternal:!arenaBattle});
  // 接続した強化カード由来の封印も含め、開幕演出の前に封印状態を再計算する。
  _initSealStates();
  _applyTerrainReinforcements();
  }

  let pendingBattle=null;
  if(saveBattle){
    try{pendingBattle=await SaveRun.prepareBattle(savedBattle);}
    catch(error){SaveRun.failedBattle(error);return;}
    // 「戦闘開始／再戦」の押下で作ったbattleチェックポイントだけを表示する。
    // 黒幕は main.js の入口で固定済みなので、高速表示が消えてから開幕演出へ進む。
    if(showBattleStartAutosave&&pendingBattle&&typeof SaveRun.showAutoSaveIndicator==='function'){
      void SaveRun.showAutoSaveIndicator({fast:true});
    }
    G._savePreparing=false;
    G._savePresentation=true;
  }

  // 通常・エリート・ボスを問わず、開幕演出が終わるまでカードは非表示にする。
  if(typeof actionBannerSetBattleData==='function') actionBannerSetBattleData({
    units:{p1:G.allies||[],p2:G.enemies||[]},
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
  });
  renderAll();
  if(_battleRunStale(_runId)) return;
  const introKind=await _playBattleStartIntro();
  if(_battleRunStale(_runId)) return;

  updateHUD();
  renderAll();
  await playBattleOpeningSequence(introKind);
  if(_battleRunStale(_runId)) return;
  if(pendingBattle){
    [...G.allies,...G.enemies].filter(Boolean).forEach(markCardSeen);
  }
  _settleBattleOpeningLayout();
  // 闘技場は、敵の登場が終わった直後に WAVE を出す。完全に消えてから
  // 敵の開幕台詞へ進めるため、ここで await して順序を固定する。
  await _showArenaWaveIntro();
  if(_battleRunStale(_runId)) return;
  // 全員が出撃した後、台詞を持つキャラクターがいれば吹き出しで順に出す。
  await playBattleStartLines();
  if(_battleRunStale(_runId)) return;
  if(G._debugGameOver){
    G._battleDefeatHandled=true;
    gameOver();
    return;
  }
  if(pendingBattle){
    G._freeItemPhase='battle';G._freeItemUsed=false;
    await SaveRun.replay(pendingBattle,_runId);
    return;
  }
  if(carryBattle){
    // 連戦では onBattleStart() と開戦効果を呼ばない。前戦闘終了時の
    // HP・バフ・結界・マナなどをそのままコアへ渡す。
    G._freeItemPhase='battle';
    G._deferManaThresholdEffects=false;
    renderAll();
    await sleep(introKind==='elite'?500:1000);
    if(_battleRunStale(_runId)) return;
    if(G.phase==='reward'||G._battleVictoryPending) return;
    if(checkInstantVictory()) return;
    requestAnimationFrame(_updateLaneOffset);
    await nextTurn();
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
  // 戦闘開始ボタンは廃止し、間を置かず自動で戦闘フェイズへ進む
  _advanceToBattlePhase();
}

// ── 戦闘フェイズ（インターリーブ攻撃）─────────────

// 戦闘中ずっと使い回すコア状態。**盤面配列はGと共有する**（同じ実体を指す）。
// コアは side/slot を見て判定するため、戦闘中は付け替えたままにし、終了時に戻す。
// 進行中の戦闘のコアの状態（battlePhase が作る）。所持金などの正本で、手番ごとに G へ書き戻す。
// 終戦時の効果は別の state で解決するので、その結果をここへも入れないと、次の書き戻しで消える。
// セーブへ紛れ込まないよう G には載せない。
let _pveLiveCoreState=null;
// セーブを使わないPvEは開戦と通常手番でstateを作り直す。眷属の累計・累積強化を渡す。
// 数値や対象はコアが決める。戦闘開始時に必ず捨て、Gやランセーブには載せない。
// 2026-10-12: 本文による敵死亡観測も両陣営の累計を渡し、開戦／旧死亡入口でリセットしない。
let _pveOpeningSummonState=null;
function _takePveSummonState(state){
  if(!_pveOpeningSummonState) return;
  state._summonCount=_pveOpeningSummonState._summonCount;
  state._summonBuff=_pveOpeningSummonState._summonBuff;
  if(_pveOpeningSummonState.gameSummonBuff) state.gameSummonBuff=_pveOpeningSummonState.gameSummonBuff;
  state._coreEnemyDeaths=_pveOpeningSummonState._coreEnemyDeaths;
  state._coreBattleActive=!!_pveOpeningSummonState._coreBattleActive;
  state._coreBattleStopped=!!_pveOpeningSummonState._coreBattleStopped;
  _pveOpeningSummonState=null;
}
function _keepPveSummonState(state){
  _pveOpeningSummonState={_summonCount:state._summonCount,_summonBuff:state._summonBuff,gameSummonBuff:state.gameSummonBuff,
    _coreEnemyDeaths:state._coreEnemyDeaths,
    _coreBattleActive:!!state._coreBattleActive,_coreBattleStopped:!!state._coreBattleStopped};
}
function _createPveCoreState(){
  const state=coreInitializeBattleState({
    units:{p1:G.allies||[],p2:G.enemies||[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:Math.max(0,Number(G._enemyBlood)||0)},
    // 嵐の指輪の発動済み回数（継戦では前の戦闘から引き継ぐ。通常の戦闘は開始時に0）。
    _stormRingFireCount:Math.max(0,Number(G._stormRingFireCount)||0),
    ..._pveCoreStageFields(),
    maxUnits:{p1:(typeof MAX_ALLIES==='number'&&MAX_ALLIES)||14,
      p2:(typeof MAX_ENEMIES==='number'&&MAX_ENEMIES)||14},
    frontSlots:(typeof ENEMY_FRONT_SLOTS==='number'&&ENEMY_FRONT_SLOTS)||7,
  });
  _takePveSummonState(state);
  return state;
}
// コアが判定に使う side/slot を盤面へ焼き付ける。戦闘中は付けたままにする。
function _stampCoreSideSlots(state){
  ['p1','p2'].forEach(side=>{
    (state.units[side]||[]).forEach((u,i)=>{ if(!u) return; u.side=side; u.slot=i;
      coreEnsurePermanentEffectCards(u);
      // 刻印のXは保存済みユニットの古い値ではなく、この戦闘の現在ステージで毎回更新する。
      u._stageNumber=Math.max(1,Number(state&&state.stageNumber)||Number(G._wave)||1); });
  });
}

async function battlePhase(){
  const _runId=Number(G._battleRunId)||0;
  G.phase='enemy';
  document.body.classList.add('battle-turn-active');
  renderControls();

  // ── 戦闘の進め方はコアが唯一の実装 ──────────────────────────
  // 攻撃順・対象選択・効果の解決・終了判定はすべて coreBattleStep() が決める。
  // PvEは1手進めるごとに、その手番で出たイベントだけを演出へ流す。
  // **ここに独自のターン処理を書き戻さないこと。** オンラインと結果が食い違う。
  const state=_createPveCoreState();
  _pveLiveCoreState=state;
  _stampCoreSideSlots(state);
  const events=[];
  const emit=ev=>{
    events.push(ev);
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
  };
  // 開戦処理は startBattle() 側で済んでいるので飛ばす。
  // 終戦効果を持ち越さない戦闘はstateの入力で指定する。進行の呼び出し形は通常戦闘と共通にする。
  // Q004の魔狼戦は通常勝利の終戦効果を発生させず、直後の選択へ味方状態を渡す。
  // ガルム戦自体は通常戦闘として終戦処理を行う。
  state._skipBattleEnd=!!((typeof arenaIsActive==='function'&&arenaIsActive())
    ||(typeof questIsMagicWolfBattle==='function'&&questIsMagicWolfBattle()));
  // 闘技場は盤面を次の戦闘へ持ち越すので、敵の全滅で効果を打ち切らない（2026-10-29 利用者指定）。
  const continueAfterDecided=!!(typeof arenaIsActive==='function'&&arenaIsActive());
  const runner=createBattleRunner(state,coreMathRng,emit,{skipOpening:true,continueAfterDecided});
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
        .map(u=>[u,Number(u.atk)||0,Number(u.hp)||0,Number(u.maxHp)||Number(u.hp)||1,Number(u.shield)||0,Number(u.weaken)||0]);
      const releaseForms=presentHoldForms(_shownBefore.map(([u])=>u));
      let stepped=false;
      try{
        try{ stop=runner.step({deferCompact:true}); stepped=true; }
        catch(e){ console.error('[coreBattleStep]',e); }
        // この手番で出たぶんだけを再生する。
        if(stepped){
          _shownBefore.forEach(([u,atk,hp,maxHp,shield,weaken])=>presentHoldShown(u,atk,hp,maxHp,shield,weaken));
          try{ await _flushCorePveHitEvents(state,events.slice(from),beforeUnits); }
          // 手番の途中で出た体（複製のコピー等）も据え置いていることがあるので、盤面の全員を戻す。
          finally{ _shownBefore.forEach(([u])=>presentReleaseShown(u)); [...(G.allies||[]),...(G.enemies||[])].forEach(u=>u&&presentReleaseShown(u)); }
          _syncCoreManaToG(state);
          _refreshManaDisplays();
        }
      } finally {
        releaseForms();
        presentEndPlayback();
      }
      if(!stepped) break;
      if(typeof runner.compact==='function') runner.compact();
      _syncCoreResourcesToG(state);
      if(typeof _syncCoreBloodToG==='function') _syncCoreBloodToG(state);
      _refreshManaDisplays();
      requestBattleCompact();
      _stampCoreSideSlots(state);
      // 1体の行動が終わってから次が動き出すまで、少し間を置く。
      // 途切れなく続くと何が起きているか追えない。値は present.js が唯一の定義。
      // **盤面を詰め終えてから待つ**（オンラインは次の手番の頭で待つため、
      // ここで詰める前に待つと、途中の並びだけが片側に増えて食い違う）。
      if(events.length>from
        && !(typeof presentShouldSkipTurnGapBeforeManaEffect === 'function'
          && presentShouldSkipTurnGapBeforeManaEffect(events.slice(from), events.length - from))) {
        await sleep(PRESENT_TURN_GAP_MS);
      }
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
  }
  // 保存なしの闘技場でも、コアの両者防戦・ターン上限の決着を同じ出口へ渡す。
  if(typeof arenaIsActive==='function'&&arenaIsActive()
    &&(runner.result&&runner.result.outcome==='draw'||guard>=_turnLimit)){
    const result=runner.finish();
    if(result.outcome==='draw'){
      G._battleDraw=true;
      await finishBattleAsVictory('Draw');
      return;
    }
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

function compactBattleUnits(options){
  const keepAllyOrder=!!(options&&options.keepAllyOrder);
  // pending召喚体はコアの上限枠を占有するが、まだ表示されていないため
  // 画面の人数・中央寄せ・FLIPの対象には含めない。
  // 強化でHP0になった体（_deployedAtZeroHp）は、開戦の瞳の指輪が掛かるまで盤面に残す（コアが開戦の指輪の後に印を外す）。
  const alive=u=>u&&(u.hp>0||u._deployedAtZeroHp);
  const liveCount=arr=>(arr||[]).filter(u=>alive(u)&&!u._corePendingSummon&&!u._isSoul&&!u._isObject).length;
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
  // 相手側の死亡・召喚で人数が変わっても、攻撃中の自陣まで再センタリングしない。
  // 以前はどちらか一方の人数変化を全陣営へ適用していたため、多段攻撃の途中で
  // 敵が減ると、攻撃者まで左右へ移動してから元の位置へ戻るFLIPが発生していた。
  // 前回の記録（_lastCompactLiveCounts）が無い最初の詰め直しでも、画面上の枚数と死亡体は比べる。
  // オンラインは戦闘の最初の詰め直しが召喚のことがあり、記録が無いと「人数の変化なし」として旧配置を保持し、
  // 2体目を1体の時の位置の隣へ置いたまま列が中央からずれていた（2026-10-27 全キーワードのミテーラ・ペリカン）。
  const compactSideChanged={
    allies:(!!previousCounts&&previousCounts.allies!==compactCounts.allies)||previousDomCounts.allies!==compactCounts.allies
      // 死亡体がまだ配列に残る再生中は、前回のcompactで人数だけ先に記録されて
      // いても、今回の死亡側を詰める必要がある。これを見落とすとholdLayoutが
      // 古いleftを採用し、後段の通常renderAll()でFLIPなしに隙間を詰めてしまう。
      ||(G.allies||[]).some(u=>u&&u.hp<=0&&!u._isSoul&&!u._isObject)
      // 死亡枠を残した再生中はIDの並びが既に生存体だけに見えることがある。
      // それでも旧位置は詰まっていないため、保留印がある側は必ずFLIPする。
      ||!!G._battleCompactHeldGaps?.allies,
    enemies:(!!previousCounts&&previousCounts.enemies!==compactCounts.enemies)||previousDomCounts.enemies!==compactCounts.enemies
      ||(G.enemies||[]).some(u=>u&&u.hp<=0&&!u._isSoul&&!u._isObject)
      ||!!G._battleCompactHeldGaps?.enemies,
  };
  G._compactRecenterSides=compactSideChanged;
  G._compactHoldSides={
    allies:!compactSideChanged.allies,
    enemies:!compactSideChanged.enemies,
  };
  // 既存の診断・互換参照は残すが、配置判定は必ず陣営別フラグを使う。
  G._compactRecenterOnNext=compactSideChanged.allies||compactSideChanged.enemies;
  G._lastCompactLiveCounts=compactCounts;
  const maxA=MAX_ALLIES||10;
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  // renderField() は前衛7枠＋後衛7枠（最大14体）を描画できる。
  // ここを後衛3枠に制限すると、8体目以降が配列から落ち、召喚上限前でも
  // 左端への一時表示・攻撃対象と表示キャラの不一致が発生する。
  const rearSlots=Math.max(0,maxA-frontSlots);
  const nextAllies=new Array(maxA).fill(null);
  const pendingAllies=(G.allies||[]).filter(a=>alive(a)&&a._corePendingSummon&&!a._isSoul&&!a._isObject);
  const liveAllies=(G.allies||[]).filter(a=>alive(a)&&!a._corePendingSummon&&!a._isSoul&&!a._isObject);
  if(!keepAllyOrder) liveAllies.forEach(clampUnitStats);
  // **固定できるのは「自分の列の中の空き」だけ。**
  // 以前はスロット番号から lane を決め直していたため、召喚（複製など）で前衛が
  // 増えると、前衛の体が後衛の枠番号を持ったまま後衛列へ居座り、
  // 本来の後衛が置き場を失って**画面から消えていた**
  // （人数が変わって _compactRecenterOnNext が立つまで戻らない＝「続けていると出てくる」）。
  const placeFixed=(units,offset,slots)=>{
    const rest=[];
    units.forEach(u=>{
      const pos=Number.isInteger(u._battleSlot)?u._battleSlot:-1;
      if(!compactSideChanged.allies&&pos>=offset&&pos<offset+slots&&pos<nextAllies.length&&!nextAllies[pos]){
        nextAllies[pos]=u;
      }else{
        rest.push(u);
      }
    });
    return rest;
  };
  if(keepAllyOrder){
    // 連戦の味方は前戦終了時のコア順。出撃時の_battleSlotと召喚後の番号は
    // 衝突するため、枠へ戻すと生存アラッサスより左へペリカンが移る。
    // 並べ直さず、死亡・空欄だけを通常のコア規則で詰める。配列の参照も保つ。
    coreCompactUnits({units:{p1:G.allies}});
  }else{
    const allyFront=placeFixed(liveAllies.filter(a=>(a.lane||'front')!=='rear'),0,frontSlots);
    const allyRear=placeFixed(liveAllies.filter(a=>(a.lane||'front')==='rear'),frontSlots,rearSlots);
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
  }
  // コア駆動の戦闘では、盤面配列の並びをコアと同じ「生存を左詰め」に保つ。
  // 表示用の並び（_battleSlot基準の疎配列）へ組み替えると、コアの配列と
  // 順序が食い違い、全体ダメージの対象順・三方向の隣接・ランダム対象の結果がずれる。
  // renderField() は生存ユニットの「順序」から位置を決めるため、
  // 左詰めにしても見た目（中央寄せ）は変わらない。
  if(G._coreDrivenBattle&&typeof coreCompactUnits==='function'){
    // 「まだ外さない体」の判定は present.js が唯一の実装（描画側と同じ規則）。
    coreCompactUnits({units:{p1:G.allies,p2:G.enemies}},presentKeepsOnBoard);
  } else {
  if(!keepAllyOrder){
    if(Array.isArray(G.allies)) G.allies.splice(0,G.allies.length,...nextAllies);
    else G.allies=nextAllies;
  }
  const maxE=MAX_ENEMIES||10;
  const enemyRearSlots=Math.max(0,maxE-frontSlots);
  const nextEnemies=new Array(maxE).fill(null);
  // 再戦の開戦準備では、敵の配列・空欄・死亡状態・位置を変えない。
  // 戦闘中の詰め直しは上の共通コアの経路が引き続き行う。
  if(!G._preserveEnemyOpening){
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
  }
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');
  G._compactRecenterOnNext=false;
  G._compactRecenterSides=null;
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

// コアの生存配列と、現在画面にあるカードのID順を比べる。
// 召喚・死亡ではコアが演出より先に最終状態まで解決するため、
// _battleLayoutSignature() の前後比較だけでは「配列は新しいがDOMは旧配置」を拾えない。
function _battleDomUnitIds(side){
  const field=document.getElementById(side==='p1'?'f-ally':'f-enemy');
  return field?[...field.querySelectorAll('.slot[data-unit-id]')]
    .map(slot=>String(slot.dataset.unitId||'')).join('|'):'';
}
function _battleArrayUnitIds(arr){
  return (arr||[]).filter(u=>u&&u.hp>0&&!u._isSoul&&!u._isObject&&u.id!=null)
    .map(u=>String(u.id)).join('|');
}
function _battleDomLayoutMatchesUnits(){
  return `${_battleDomUnitIds('p1')}||${_battleDomUnitIds('p2')}`
    ===`${_battleArrayUnitIds(G.allies)}||${_battleArrayUnitIds(G.enemies)}`;
}

function compactBattleUnitsAfterDeath(){
  if(G._isSimulating||G._compactingAfterDeath||G._deferBattleCompact) return;
  _recordBattleTrace('battle_compact_request',{reason:'death',motionDepth:G._battleMotionDepth||0});
  G._compactingAfterDeath=true;
  requestBattleCompact();
  G._compactingAfterDeath=false;
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
// コアイベントの攻撃モーションの実行区間全体を
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
    // 詰めと描画は必ず requestBattleCompact() を通す。ここで compactBattleUnits() と
    // renderAll() を直に呼ぶと、PvEの死亡イベント再生中に配列だけ先に詰めた状態を
    // 描画してしまい、旧矩形のスナップショットなしで残りのカードが瞬間移動する。
    // 再生中なら requestBattleCompact() 自身が再度保留し、再生終了後にFLIPを作る。
    requestBattleCompact({forceRender:true});
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
    // 死亡枠保留を検出した次のcompactで、詰めた位置までのFLIPを作り終えた。
    // この印を残すと、後続の通常再描画まで毎回「人数変化あり」になる。
    G._battleCompactHeldGaps=null;
    // 退避矩形はこの詰め1回だけの移動元。残すと後続の無関係な再描画へ
    // 古い位置を持ち越し、別のカードまで逆方向へFLIPする。
    delete G._battleCompactPreviousRects;
    G._animateBattleCompact=false;
  }
  window.setTimeout(()=>{
    if(G._compactHoldSides&&performance.now()>=Number(G._battleCompactAnimatingUntil||0)){
      // 初回FLIPで保持した側を、ここでrenderAll()だけして詰め直してはいけない。
      // 次回の共通compact入口が最新のpreviousRectsを取得して移動を表現する。
      G._compactHoldSides=null;
    }
  },270);
}

function requestBattleCompact(options){
  const forceDuringMotion=!!(options&&options.forceDuringMotion)||!!G._forceBattleCompactDuringMotion;
  // **force：保留せず必ずこの場で詰める。**
  // 「奪う」の移動演出は、詰め直した後の位置へカードを運ぶため、
  // ここで保留されると移動先が無いまま演出が終わり、後から保留分が反映されて
  // カードがワープする。死亡効果の解決中（_pendingDeathEffects>0）に起きるので、
  // forceDuringMotion だけでは足りない。
  const force=!!(options&&options.force);
  // イベントを再生している最中は盤面を詰めない。詰めると死亡したキャラクターの
  // カードが先に消え、そのあとに来るダメージ数値・VFXが行き場を失って
  // 何もない場所へ出る。再生が終わってから battlePhase() 側でまとめて詰める。
  if(presentIsPlaying()&&!forceDuringMotion&&!force){
    if(typeof captureBattleCompactPreviousRects==='function'&&!G._battleCompactPreviousRects)
      captureBattleCompactPreviousRects();
    G._pendingBattleCompact=true;
    G._pendingBattleRender=true;
    return;
  }
  _recordBattleTrace('battle_compact_request',{reason:'request',motionDepth:G._battleMotionDepth||0,pending:!!G._pendingBattleCompact});
  // 死亡バッチ中は死亡ユニットの旧DOMをFLIPの移動元として保持する。
  // ここで死亡効果内の召喚・変身が先にrenderAll()すると、死亡ユニットがDOMから
  // 消えた後の矩形しか取れず、残存キャラが瞬間移動する。
  if(!force&&((G._battleMotionDepth>0&&!forceDuringMotion)||G._resolvingDamageBatchDeaths>0||G._pendingDeathEffects>0)){
    if(typeof captureBattleCompactPreviousRects==='function'&&!G._battleCompactPreviousRects)
      captureBattleCompactPreviousRects();
    G._pendingBattleCompact=true;
    G._pendingBattleRender=true;
    return;
  }
  const beforeLayout=_battleLayoutSignature();
  // 召喚・変身・死亡では、コア／配置ヘルパーが先にG配列を新しい順序へ
  // 並べ替えるため、配列だけを比較すると「変更なし」と誤判定する。
  // DOMにまだ存在しない召喚体や、DOM上の順序が古い状態を検出し、
  // 配列と画面の実体が一致した場合だけ再描画を省略する。
  const liveDomLayout=side=>_battleDomUnitIds(side);
  const liveArrayLayout=arr=>_battleArrayUnitIds(arr);
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
      if(r&&r.width>0&&r.height>0) dead._lastVisualRect=_copyBattleVisualRect(r);
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
  if(G._savedBattleReplaying) return false;
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
  if(typeof arenaIsActive==='function'&&arenaIsActive()
     &&typeof arenaHandleBattleDefeat==='function'){
    void arenaHandleBattleDefeat();
    return;
  }
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    _exitTestBattle();
    return;
  }
  if(typeof _removeAbsentKiemetsuCards==='function') _removeAbsentKiemetsuCards();
  if(typeof handleWaveBattleDefeat==='function'&&handleWaveBattleDefeat()) return;
  G._battleDefeatHandled=true;
  void (async()=>{
    if(typeof playBattlePlayerDefeatLines==='function') await playBattlePlayerDefeatLines();
    gameOver();
  })();
}

// ── 勝利確定（敵全滅・引き分けの両方から呼ばれる共通処理）─────────
// 二重発火防止（G.phase==='reward'なら何もしない）は必須。
async function finishBattleAsVictory(reason){
  if(G.phase==='reward'||G._battleVictoryPending) return;
  // 敵全滅を理由にする場合は、召喚済みの敵を含めて最後に再確認する。
  // 復活・召喚後なら、演出も勝利処理も止めない。
  if(reason==='敵を全滅させた！'&&_livingCombatUnits(G.enemies).length) return;
  if(G._battleMotionDepth>0){
    G._pendingVictoryReason=reason||'敵を全滅させた！';
    return;
  }
  await _waitForPendingVfx();
  if(G.phase==='reward'||G._battleVictoryPending) return;
  // 試験戦闘は敵を全滅しても通常の勝利・報酬フローへ入れない。
  // ここで専用終了しないと _testBattleMode が残り、次の「戦闘開始」も試験戦闘になる。
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    _exitTestBattle();
    return;
  }
  if(typeof questHandleMagicWolfVictory==='function'&&questHandleMagicWolfVictory()) return;
  if(typeof arenaIsActive==='function'&&arenaIsActive()
     &&typeof arenaHandleBattleVictory==='function'){
    G._battleVictoryPending=true;
    G._battlePhaseRunning=false;
    G.phase='reward';
    document.body.classList.add('battle-victory-pending');
    document.body.classList.remove('battle-turn-active');
    updateHUD();
    if(reason==='Draw'||G._battleDraw) void arenaHandleBattleDraw();
    else void arenaHandleBattleVictory();
    return;
  }
  // Scene 5のボス（万象の揺り籠“エピトメ”）は勝利演出・報酬を通さず、
  // 全敵撃破が確定したこの時点から movie3 → 伏せられたラスボス戦の導入へ入る。
  if(typeof isEpitomeVictoryBattle==='function'&&isEpitomeVictoryBattle()){
    G._battleVictoryPending=true;
    G._battlePhaseRunning=false;
    G.phase='clear-cutscene';
    document.body.classList.add('battle-victory-pending');
    document.body.classList.remove('battle-turn-active');
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
    updateHUD();
    if(typeof startFinalBossClearSequence==='function') void startFinalBossClearSequence();
    return;
  }
  G._battleVictoryPending=true;
  // 引き分け等、_onAllEnemiesDefeated()/checkInstantVictory()を経由しない勝利確定ルートでも、
  // ボス戦であれば必ずボス撃破フラグを立てる（指輪報酬フェイズの判定に使うため）。
  if(_isBossFight) G._bossJustDefeated=true;
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
  if(G._savedBattleReplaying) return;
  if(G.phase==='reward') return; // 二重呼び出し防止
  // コアのイベント列には、この直後に蘇生・召喚が続くことがある。
  // 列全体を再生し終えるまで勝利を確定せず、最後の盤面だけで判定する。
  if((Number(G._battleEventPlaybackDepth)||0)>0){
    G._battleVictoryCheckPending=true;
    return;
  }
  // 死亡効果・指輪効果の召喚処理中に古い全滅通知が届くことがある。
  // 生存中の敵が残っている場合は、勝利を確定しない。
  if(_livingCombatUnits(G.enemies).length) return;
  if(!(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul)){
    if(_tryNecromancerRingRevive()){
      if(_isBossFight) G._bossJustDefeated=true;
      finishBattleAsVictory('敵を全滅させた！');
      return;
    }
    G._battleDraw=true;
    finishBattleAsVictory('Draw');
    return;
  }
  if(_isBossFight) G._bossJustDefeated=true;
  finishBattleAsVictory('敵を全滅させた！');
}

// ── 味方攻撃アクション ──────────────────────────

// ── 戦闘ルールは js/battle/core.js が唯一の実装場所 ──────────────
// 以下は既存の呼び出し名を保つための委譲。ここに条件やルールを書き足さないこと
// （書き足すとPvEとPvPでルールが食い違う）。変更はコア側で行う。
function _unitPanelKeywords(unit){ return coreUnitKeywords(unit); }

function _unitHasKeyword(unit, kw){ return coreUnitHasKeyword(unit, kw); }

function _unitKeywordCount(unit, kw){ return coreUnitKeywordCount(unit, kw); }


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
    const gain=_isBattleGainPhase()?coreStatBonus(unit,atk,unit):atk;
    unit.atk=Math.max(0,(unit.atk||0)+gain);
    unit.baseAtk=Math.max(0,(unit.baseAtk||0)+gain);
  }
  if(hp) addUnitHp(unit,hp,side||_battleSideOfUnit(unit));
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
  if(basePanel&&typeof getPanelArtPath==='function') unit.art=getPanelArtPath(basePanel)||'';
  // 番号（artCode）も置き換える。_assetCodeRaw()はnoよりartCodeを先に見るため、
  // ここを残すと絵・VFX・SEが旧形態のまま引かれる。
  if(basePanel&&(basePanel.no||basePanel.artCode||basePanel._artCode)){
    const _code=String(basePanel.no||basePanel.artCode||basePanel._artCode);
    unit.no=_code; unit.artCode=_code; unit._artCode=_code; unit.imageNo=_code;
  }
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
  // **敵の枠の印も引き継ぐ。**（利用者報告：レムレース＋ハイドラで報酬に出たウィスプが緑の枠になっていた）
  // 敵を仲間にした体・敵に変身した体の枠は、報酬や魔導板へ移っても変えない（AGENTS.md）。
  // 敵側の体（「倒したキャラクターが報酬に出現する」で出る敵）も敵の枠のまま出す。
  if(unit._useEnemyVisualFrame||unit.side==='p2') card._useEnemyVisualFrame=true;
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
  // 2026-10-12: 接続強化への紫修正も共通コアが本文の通常／合体の値を決める。
  return corePurpleModifierBonus(side);
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


function _sacrificeCount(){ return Math.max(0,Number(G._blood)||0); }

function _fieldOrderOfUnit(unit){
  let idx=(G.allies||[]).indexOf(unit);
  if(idx>=0) return idx;
  idx=(G.enemies||[]).indexOf(unit);
  return idx>=0?100+idx:999;
}


function _unitShieldValue(unit){ return coreUnitShieldValue(unit); }


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


function _attackDamageValue(unit){ return coreAttackDamage(unit); }

// 攻撃モーション中に画面で動いている複製カードの位置。
// **効果の演出（VFX）はここを発生源にする。** 攻撃で少し動いた地点から
// 効果が出るように見せるため（攻撃そのもののVFXと数値は盤面の定位置のまま）。
function _motionCloneRect(unit){
  if(!unit||unit.id==null||typeof document==='undefined') return null;
  const id=String(unit.id);
  const el=[...document.querySelectorAll('.attack-motion-clone[data-unit-id]')]
    .find(x=>String(x.dataset.unitId||'')===id);
  const rect=el&&typeof el.getBoundingClientRect==='function'?el.getBoundingClientRect():null;
  return rect&&rect.width>0&&rect.height>0
    ?_copyBattleVisualRect(rect):null;
}

// 効果の演出を出す位置。**動いている最中はその位置を使う。**
// ダメージ数値・被弾VFXは盤面の定位置（_captureUnitDamageRect）のままにする。
function _captureUnitEffectRect(unit, side){
  return _motionCloneRect(unit)||_captureUnitDamageRect(unit,side);
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
  return _copyBattleVisualRect(rect);
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
  // 大ダメージの衝撃（hit_impact.webm）は振動と同時に出す。
  if(typeof playBattleHitImpact==='function') playBattleHitImpact();
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
  // **画面（#scr-battle）の箱は動かさない。** 箱を動かすと、動いた分だけ
  // 画面指定サイズの外へはみ出す（または縁に画面外が見える）。
  // 背景レイヤーと戦場だけを動かす（CSSの --battle-shake-x/y）。
  // 背景は寄せてあるので、揺れても縁から外が覗かない。
  const step=(x,y)=>({'--battle-shake-x':`${x}px`,'--battle-shake-y':`${y}px`});
  const rest=step(0,0);
  if(typeof host.animate==='function'){
    const animation=host.animate([
      rest,
      {...step(-amount*first,amount*.62*first),offset:.04},
      {...step(amount,-amount*.52),offset:.2},
      {...step(-amount*.52,amount*.3),offset:.42},
      {...step(amount*.25,-amount*.14),offset:.66},
      {...step(-amount*.1,amount*.06),offset:.84},
      rest
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

// 2026-10-11: 接触から440ms待つ旧経路を撤去。振動はpresentDamageImpactが数値表示と同時に始める。

function _grantRandomItem(sourceName, options){
  const free=!!(options&&options.free);
  const arr=G.spellSlots=Array.isArray(G.spellSlots)?G.spellSlots:new Array(4).fill(null);
  while(arr.length<4) arr.push(null);
  const idx=arr.findIndex(c=>!c);
  if(idx<0){
    return false;
  }
  const card=(typeof drawItems==='function'?drawItems(1,5)[0]:null)||clone((typeof ITEM_POOL!=='undefined'?ITEM_POOL:[])[0]||null);
  if(!card) return false;
  // 錬成はアイテムを購入して得る扱い。通常の報酬カードは _buyPrice=0 なので、
  // その場合も最低1Gを消費し、複数枚で所持金不足になった時点で停止する。
  const price=Math.max(1,Number(card._buyPrice|| (typeof calcBuyPrice==='function'?calcBuyPrice(card):1)));
  if(!free&&Number(G.gold||0)<price){
    return false;
  }
  if(!free) G.gold=Number(G.gold||0)-price;
  arr[idx]=card;
  if(typeof updateHUD==='function') updateHUD();
  return true;
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
    ..._pveCoreStageFields(),
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
  _takePveSummonState(state);
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
    if(ev&&ev.type==='run_effect') {applyCoreRunEffectEvent(ev);applyCoreBattleEndCardEvent(ev);}
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
  // **オプションをコアへそのまま渡すこと。** ここで落とすと、コアが
  // 「全員にダメージを入れてからまとめて誘発」（coreHitAll の deferTriggers/collect）を
  // 指示しても PvE 側だけ1体ずつ即誘発になり、オンラインと結果が食い違う。
  const applyHit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit,
      Object.assign({skipSourceEffects:!!skipSourceEffects,skipTough:!!skipTough},options||{}));
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
      _keepPveSummonState(state);
    // gold_gain はコアで確定済みだが、画面上の反映は死亡固有VFXの開始時に行う。
    G.gold=goldBefore;
    _refreshManaDisplays();
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


function _onAllyDeathPanelSummons(){
}

// 貫通：前衛キャラクターへの攻撃時、その後ろに位置する後衛キャラクター（最大3人）にも同じダメージを与える。
// 前衛F人・後衛R人の場合、後衛R人をF分割し、front側の位置indexに対応する区画を「真後ろ」とみなす。
function onBattleStart(){
  G._freeItemPhase='battle';
  G._freeItemUsed=false;

  // 結界：戦闘開始時に1回だけダメージを無効化する結界を得る。
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||_isSealed(a)) return;
    const shieldValue=_unitShieldValue(a);
    if(shieldValue>0&&(a.shield||0)<shieldValue){
      a.shield=shieldValue;
    }
  });
  (G._preserveEnemyOpening?[]:G.enemies).forEach(e=>{
    if(!e||e.hp<=0||_isSealed(e)) return;
    const shieldValue=_unitShieldValue(e);
    if(shieldValue>0&&(e.shield||0)<shieldValue){
      e.shield=shieldValue;
    }
  });
}

// ── 戦闘終了時処理 ───────────────────────────

async function _applyCoreBattleEndEffectsLive(){
  if(typeof SaveRun!=='undefined'&&SaveRun.applyEnd({units:{p1:G.allies,p2:G.enemies}})) return;
  if(typeof _payStolenEnemyGoldAtEnd==='function') _payStolenEnemyGoldAtEnd();
  _recordBattleTrace('battle_end_dispatch_start',{phase:G.phase,gold:Number(G.gold)||0,mana:Number(_ensureMana())||0});
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]},
    rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    ..._pveCoreStageFields(),
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
  const emit=ev=>{
    if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev);
    if(ev&&ev.type==='run_effect') {applyCoreRunEffectEvent(ev);applyCoreBattleEndCardEvent(ev);}
    // 終戦の「永久に+X/+Y」（レプラコーン）は魔導板のカードへ書き込む。
    // 戦闘中の再生（battle_events.js）と違い、ここはイベントを流さないので、書き込まないと効果が消えていた（利用者報告）。
    if(!(typeof arenaIsActive==='function'&&arenaIsActive())
      &&ev&&ev.type==='stat_change'&&ev.persistent&&ev.side==='p1'
      &&typeof persistBoardCharacterStats==='function'&&typeof _getPartyBoardUnit==='function'){
      _persistPermanentStatOrWarn(_getPartyBoardUnit(),ev);
    }
  };
  try{
    coreTriggerBattleEnd(state,emit,coreMathRng);
    _syncCoreResourcesToG(state);
    // **終戦時の所持金は、演出の再生中でも必ず反映する。** _syncCoreResourcesToG は再生中の所持金を
    // 書き戻さない（手番の途中の二重表示を防ぐため）が、終戦はここで決まり、後で書き戻す機会が無い。
    // このため終戦時にゴールドを得る効果（ノームなど）の分が所持金に一度も入っていなかった
    // （表示だけ一度減らして足し戻していたので、演出は出てもお金は増えていなかった。2026-09-24）。
    // この state は直前の所持金から作っているので、差分は終戦時の効果の分だけ。
    // 画面への見せ方（演出の時に数え上げる）は onBattleEnd の goldFxDefer／goldFxRelease が受け持つ。
    if(state.resources&&state.resources.p1){
      G.gold=Math.max(0,Number(state.resources.p1.gold)||0);
      // 進行中の戦闘のコアへも入れる。入れないと直後の手番の書き戻し（_syncCoreResourcesToG）で
      // 終戦時の分が消える（150→170→150 になっていた）。
      if(_pveLiveCoreState&&_pveLiveCoreState.resources&&_pveLiveCoreState.resources.p1) _pveLiveCoreState.resources.p1.gold=G.gold;
    }
  }
  finally{
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  _recordBattleTrace('battle_end_dispatch_done',{events:(G._battleCoreEvents||[]).filter(e=>e&&e.type==='gold_gain').length,gold:Number(G.gold)||0});
  G._coreBattleEndTriggered=true;
}

// 終戦の「永久に+X/+Y」を魔導板のカードへ書き戻す。**書けなかった時は必ず記録を残すこと。**
// 「終戦では上がるのに編成画面へ戻ると元に戻っている」という報告があり、
// 静かに失敗していると原因を追えない（2026-09-22、再現条件を特定できていない）。
function _persistPermanentStatOrWarn(board,ev){
  const ok=persistBoardCharacterStats(board,ev&&ev.boardSlot,ev&&ev.atk,ev&&(ev.persistentHp??ev.hp),runLevelBattleValues());
  if(ok) return true;
  const cards=board&&Array.isArray(board.boardCards)?board.boardCards:null;
  const card=cards?cards[Number(ev&&ev.boardSlot)]:null;
  const info={unitId:(ev&&ev.unitId)||null,boardSlot:ev&&ev.boardSlot,
    atk:ev&&ev.atk,hp:ev&&ev.hp,reason:(ev&&ev.reason)||'',
    盤面あり:!!cards,カードあり:!!card,種別:card?String(card.category||''):'',
    カード名:card?String(card.name||''):''};
  if(typeof _recordBattleTrace==='function') _recordBattleTrace('persist_stats_failed',info);
  console.warn('[Vesselbound] 永久強化を魔導板へ書き戻せなかった',info);
  return false;
}

function _persistPermanentEffectDamageOrWarn(board,ev){
  if(!ev||!ev.persistent||(ev.effectOwnerSide||ev.side)!=='p1') return false;
  const ok=persistBoardEffectDamage(board,ev);
  // 闘技場は入場時の盤面を復元する。カード1枚の消耗値だけは、その保存先にも残す。
  if(G._arenaActive&&G._arenaEntrySnapshot){
    persistBoardEffectDamage({boardCards:G._arenaEntrySnapshot.mainBoard},ev);
  }
  if(!ok){
    const info={cardId:ev.effectCardId,boardSlot:ev.boardSlot,damage:ev.damage};
    if(typeof _recordBattleTrace==='function') _recordBattleTrace('persist_effect_damage_failed',info);
    console.warn('[Vesselbound] 永久ダメージ値を魔導板へ書き戻せなかった',info);
  }
  return ok;
}

async function onBattleEnd(){
  if(G._battleEndEffectsApplied) return;
  G._battleEndEffectsApplied=true;
  G._coreBattleEndTriggered=false;
  const endEventStart=(G._battleCoreEvents||[]).length;
  await _applyCoreBattleEndEffectsLive();
  const endEvents=(G._battleCoreEvents||[]).slice(endEventStart);
  (G._battleCoreEvents||[]).filter(e=>e&&e.type==='bonus_reward'&&e.side==='p1'&&e.unit).forEach(e=>{
    if(typeof _queueBonusRewardPanel==='function') _queueBonusRewardPanel(e.unit);
  });
  // ノーム等：終戦：Xゴールドを得る。（パネル召喚キャラは直後に盤面から除去されるため先に処理する）
  const goldEffectUnits=[];
  // ゴールド本体はコアが既に加算済み。ここではコアイベントをVFX/ログへ接続し、二重加算しない。
  (G._battleCoreEvents||[]).filter(e=>e&&e.type==='gold_gain'&&e.reason==='goldOnBattleEnd').forEach(e=>{
    const unit=(G.allies||[]).find(a=>a&&a.id===e.unitId);
    if(unit) goldEffectUnits.push({unit,amount:e.amount,event:e});
  });
  // コアは判定時点で所持金を確定するが、表示上の獲得タイミングは固有VFXの開始時に揃える。
  // ここで一度だけ表示値を効果前へ戻し、各VFXを開始する直前に対応額を反映する。
  // 所持金そのものは減らさず、表示だけ預ける（gold_fx.js）。所持金を一度減らして足し戻すと、
  // 共通の所持金演出が「-X」「+X」を出してしまう。
  const pendingGold=goldEffectUnits.reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  if(pendingGold&&typeof goldFxDefer==='function') goldFxDefer(pendingGold);
  const randomItemEffectUnits=[];
  for(const a of (G.allies||[])){
    if(!G._coreBattleEndTriggered&&a&&a.hp>0&&a.randomItemOnBattleEnd){
      const repeatCount=1+(Number(a._effectRepeatBonus)||0);
      for(let repeat=0;repeat<repeatCount;repeat++) randomItemEffectUnits.push(a);
    }
  }
  // 終戦時のゴールド演出は、他の終戦時効果の処理・演出が終わってから開始する。
  await _waitForPendingVfx();
  // 終戦のstat_changeは計算・永続化済み。PvE／保存再生も共通presenterでVFXだけを出す。
  // ゴールドの既存演出をイベント順へ挟み、終戦効果の順序・資源を変えない。
  const endGold=new Map(goldEffectUnits.map(x=>[x.event,x]));
  const endFind=(side,id)=>((side==='p2'?G.enemies:G.allies)||[]).find(u=>u&&u.id===id)||null;
  G._battleEndPresenting=true;
  try{
  await presentLabCommittedEvents(endEvents,{
    findUnit:endFind,
    units:side=>side==='p2'?G.enemies||[]:G.allies||[],
  },async event=>{
    // 終戦効果の演出は全て省かない（2026-10-26 利用者指定「ユミルなど」）。ラン効果（リロール・接続エンチャントの強化・報酬の強化）は
    // 戦闘中と同じ presentRunEffectEvent で出す（以前は終戦では出していなかった。効果の適用は終戦の処理で済んでいる）。
    if(event&&event.type==='run_effect'&&typeof presentRunEffectEvent==='function'){await presentRunEffectEvent(event,{findUnit:endFind});return;}
    // 固有の演出の無い終戦の能力変化は、常時・終戦のバフ演出（S009）で出す。
    if(event&&event.type==='stat_change'&&(Number(event.atk)||Number(event.hp))
      &&!(typeof presentLabEventHandled==='function'&&presentLabEventHandled(event))&&typeof _playCardEffectVfx==='function'){
      const unit=endFind(event.side,event.unitId);
      if(unit){const ms=typeof PRESENT_CARD_EFFECT_VFX_MS==='number'?PRESENT_CARD_EFFECT_VFX_MS:700;
        if(typeof _playCardEffectSfxAtCue==='function')_playCardEffectSfxAtCue('S009',ms);
        await _playCardEffectVfx('S009',[unit],{gateMs:0,hitDuration:ms});}
      return;
    }
    const gold=endGold.get(event);if(!gold)return;
    const {unit:a,amount}=gold;
    await presentGoldGainEvent(event||{type:'gold_gain',side:'p1',unitId:a.id,unit:a,amount}, {
      findUnit:(side,id)=>(G.allies||[]).find(u=>u&&u.id===id)||null,
      getVisualRect:(ev,source)=>ev.lastVisualRect||source._lastVisualRect||null,
      applyGold:value=>{ if(typeof goldFxRelease==='function') goldFxRelease(value); },
      updateHud:()=>updateHUD(),
    });
  });
  // 汎用VFXは発動の合図だけで戻る経路もある。等倍の印を外す前に最後まで待つ。
  await _waitForPendingVfx();
  }finally{ delete G._battleEndPresenting; }
  // 途中で抜けても預けた分を残さない（表示と所持金を必ず一致させる）。
  if(pendingGold&&typeof goldFxRelease==='function') goldFxRelease(pendingGold);
  for(const a of randomItemEffectUnits) _grantRandomItem(a.name,{free:true});
  const itemRewards=(G._battleCoreEvents||[]).filter(e=>e&&e.type==='item_reward');
  await _flushCorePveHitEvents({units:{p1:G.allies||[],p2:G.enemies||[]}},itemRewards,new Set([...G.allies||[],...G.enemies||[]]));
}

// ── 帰滅─────────────────────────────────────────
// 「このキャラクターは戦闘中のHP変化が永続化し、復活の効果を持たずに死亡、逃走した場合は消滅する。」
//   ・死亡後に復活イベントが続いたら、その1回は消滅しない。
//   ・復活を消費した後の死亡、または逃走は魔導板のカードごと消す。
//   ・生き残ったら、戦闘中のHPの増減を魔導板のカードのライフへ書き戻す。
//     増減は「戦闘開始時（開戦効果の前）のコアの写し」との差で測る。開戦効果や他のカードの
//     常時効果は次の戦闘でもまた掛かるので、開戦後の値との差にすると二重に入る。
//   以前の文面（戦闘終了時に場にいない場合、消滅）では出撃できなかっただけでも消していたが、
//   今の文面は死亡・逃走だけなので、出撃しなかったカードは残す（2026-09-24 利用者指定）。
//   **1戦につき1回だけ。** 敗北・撤退の経路では片付け（_cleanupBattleEndTransientUnits）の前にも
//   呼ばれるので、戦闘のイベント列を目印にして二重に書き戻さない。
//   試験戦闘（G._testBattleMode）では魔導板へ書き戻さない。
function _removeAbsentKiemetsuCards(){
  const events=G._battleCoreEvents;
  if(Array.isArray(events)&&G._kiemetsuAppliedEvents===events) return;
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
  const equip=board&&Array.isArray(board.boardCards)?board.boardCards:null;
  if(!equip) return;
  if(Array.isArray(events)) G._kiemetsuAppliedEvents=events;
  const startEv=(events||[]).find(e=>e&&e.type==='battle_start');
  const startUnits=((startEv&&startEv.sides&&startEv.sides.p1)||[]).filter(Boolean);
  // **倒れた体は、ここへ来る時点で G.allies から外れていることがある**（敗北時は全員外れている）。
  // そのため戦闘開始時の写しを基準にし、生存実体と既存イベント列を
  // coreKiemetsuBattleOutcome() へ渡す。復活の成否や逃走のルールをここで再構成しない。
  const vanished=new Map();
  const hpDelta=new Map();
  const startsById=new Map(startUnits.filter(u=>u&&u.id!=null).map(u=>[String(u.id),u]));
  const liveById=new Map((G.allies||[]).filter(u=>u&&u.id!=null&&!u._isObject&&!u._isSoul)
    .map(u=>[String(u.id),u]));
  const candidateIds=new Set([...startsById.keys(),...liveById.keys()]);
  candidateIds.forEach(id=>{
    const start=startsById.get(id)||null;
    const live=liveById.get(id)||null;
    const outcome=coreKiemetsuBattleOutcome(start,live,events||[]);
    if(!outcome.applies) return;
    const rawSlot=live&&live._mainBoardSlot!=null?live._mainBoardSlot:start&&start._mainBoardSlot;
    const slot=Number.isInteger(Number(rawSlot))?Number(rawSlot):null;
    if(!Number.isInteger(slot)) return;
    if(outcome.vanished){ vanished.set(slot,outcome.reason); return; }
    if(outcome.hpDelta) hpDelta.set(slot,(hpDelta.get(slot)||0)+outcome.hpDelta);
  });
  vanished.forEach((reason,slot)=>{
    const card=equip[slot];
    if(!card) return;
    equip[slot]=null;
    if(!G._testBattleMode&&typeof questOnCardLost==='function') questOnCardLost(card,reason);
  });
  if(G._testBattleMode) return;
  hpDelta.forEach((delta,slot)=>{
    if(vanished.has(slot)) return;
    _persistPermanentStatOrWarn(board,{boardSlot:slot,atk:0,hp:delta,reason:'kiemetsu'});
  });
  // 常時：このキャラクターの毒は永続化する（預言者"ディナ"、2026-10-11）。生き残った体の毒をカードへ書き戻す。
  // 次の戦闘は formation.js がこの値から始める（効果文の（状態異常：毒N）より優先）。
  liveById.forEach(live=>{
    if(typeof corePoisonPersists!=='function'||!corePoisonPersists(live)||!(live.hp>0)) return;
    const slot=Number(live._mainBoardSlot);
    if(!Number.isInteger(slot)||vanished.has(slot)||!equip[slot]) return;
    equip[slot]._persistentPoison=Math.max(0,Number(live.poison)||0);
  });
  // 帰滅カードの死亡・逃走による盤面消失を、酒場クエストの失敗判定へ一本化して通知する。
  if(typeof checkQ009CompanionPresence==='function') checkQ009CompanionPresence();
}

function _cleanupBattleEndTransientUnits(){
  _removeAbsentKiemetsuCards();
  // **盤面は空にする。** パネル召喚の印が付いた体だけを消していた頃は、
  // 戦闘中に召喚された体・変身した体が残り、次の戦闘で編成ぶんが改めて出撃して
  // **キャラクターが複製された**（試験戦闘を途中で終えて通常戦闘へ入った時）。
  // 次の戦闘は編成から作り直すので、ここで残す必要のある体は無い。
  if(Array.isArray(G.allies)) G.allies.length=0;
  if(Array.isArray(G.enemies)) G.enemies.length=0;
  // ラミアで一時的に仲間にしたキャラクターは、メイン置き場由来ではないため報酬フェイズへは持ち越さない
  _removeLamiaCapturedUnits();
  // 仲間になったエリート/ボスの属性を解除
  G.allies.forEach(a=>{
    if(!a||!a.keywords) return;
    const had=a.keywords.some(k=>k==='エリート'||k==='ボス');
    if(had){
      a.keywords=a.keywords.filter(k=>k!=='エリート'&&k!=='ボス');
      if(a.boss) delete a.boss;
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
    if(_isBossFight) G._bossJustDefeated=true;
    finishBattleAsVictory('敵を全滅させた！');
    return true;
  }
  return false;
}

// ── プレイヤーパス ────────────────────────────
// 戦闘開始ボタンは廃止し、プレイヤーターンになったら自動で戦闘フェイズへ進む。
// この関数はその内部処理そのもの（自動呼び出し・後方互換の手動呼び出し双方から使う）。
async function _advanceToBattlePhase(){
  // **実行中フラグは「今の戦闘のもの」だけを見る。**
  // 試験戦闘を途中で終了すると battlePhase() は return で抜けるだけなので、
  // 中断のされ方によってはフラグが立ったまま残る。そのまま次の戦闘を始めると、
  // ここで弾かれて**前の盤面のまま何も進まない**（利用者報告の再現条件）。
  // 戦闘IDが変わっていれば、前の戦闘の残りとみなして無視する。
  if(G._battlePhaseRunning&&Number(G._battlePhaseRunId)===Number(G._battleRunId)) return;
  if(G.phase!=='player') return;
  G._battlePhaseRunning=true;
  G._battlePhaseRunId=Number(G._battleRunId)||0;
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

// 通常戦闘のnode情報（ボス種別・序盤の敵数制限等）を試験戦闘へ持ち込まず、
// 固定seedと固定階層だけで毎回同じ敵編成を生成する。
function _generateFixedTestBattleEnemies(floor){
  const savedMapBattle=G._mapBattle;
  const savedLaneFixed=G._enemyLaneFixed;
  G._mapBattle=null;
  G._enemyLaneFixed=false;
  try{ return _withFixedRandom(TEST_BATTLE_ENEMY_SEED,()=>generateEnemies(floor)); }
  finally{
    G._mapBattle=savedMapBattle;
    G._enemyLaneFixed=savedLaneFixed;
  }
}
