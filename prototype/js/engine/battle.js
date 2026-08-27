// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, pool.js
// ═══════════════════════════════════════

let _isBossFight = false;

// 魔術レベル上昇時の共通処理
function onMagicLevelUp(amount){
  G.magicLevel=(G.magicLevel||1)+amount;
}

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

function _playCardEffectVfx(code,targets,options){
  const list=[...(targets||[])].filter(Boolean);
  if(!list.length||typeof playHitVfxAtRect!=='function') return Promise.resolve();
  const opt=options||{};
  return Promise.all(list.map(target=>{
    const side=(G.enemies||[]).includes(target)?'enemy':'ally';
    const rect=typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(target,side):null;
    if(!rect) return Promise.resolve();
    return Promise.resolve(playHitVfxAtRect(rect,0,{
      effectSource:_effectVfxSource(code),
      gateMs:opt.gateMs??180,
      hitDuration:opt.hitDuration??900,
      waitForFinish:!!opt.waitForFinish,
      vfxScale:opt.vfxScale??((code==='C001'||code==='C002'||code==='C003')?.5:1),
    })).catch(()=>{});
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
  if(!unit||typeof playSfx!=='function') return;
  playSfx('K026',{group:'magic',guardKey:`mana-effect:${uid()}`,guardMs:0});
  const rect=typeof _captureUnitDamageRect==='function'?_captureUnitDamageRect(unit,isEnemySide?'enemy':'ally'):null;
  if(!rect||typeof playHitVfxAtRect!=='function') return;
  await Promise.resolve(playHitVfxAtRect(rect,0,{
    keywordEffect:'マナ効果',
    gateMs:200,
    hitDuration:900,
    fadeDuration:700,
    vfxScale:.5,
    spin:true,
  })).catch(()=>{});
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
  const shouldFast=!shouldSlow&&(
    (_battleAllCapableAttacked()&&roundsLeft>=2)||
    (elapsed>=15000&&_estimateBattleRemainingMs()>=30000)||
    _battleAnySideUnable()
  );
  _setBattleSpeedTarget(shouldFast?1.5:1);
  return getBattleSpeedScale();
}

function battleSleep(ms){
  updateBattleSpeedMode();
  return sleep(ms/getBattleSpeedScale());
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
  if((G.allies||[]).includes(unit)&&_hasRingNamed('加護の指輪')) return true;
  const kw=(_unitPanelKeywords(unit)||[]).find(k=>/^加護\d*$/.test(String(k||'')));
  if(!kw) return false;
  const max=Math.max(1,parseInt(String(kw).replace('加護',''),10)||1);
  if(unit._wardCharges==null||unit._wardCharges>max) unit._wardCharges=max;
  if(unit._wardCharges<=0) return false;
  unit._wardCharges--;
  return true;
}

function _tryNecromancerRingRevive(){
  if(G._necromancerRingUsed||!_hasRingEffect('necromancer_ghosts')) return false;
  const hasLivingFront=(G.allies||[]).some(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul&&!_isSealed(a)&&String(a.lane||'front')==='front');
  if(hasLivingFront) return false;
  G._necromancerRingUsed=true;
  for(let i=0;i<2;i++) void _spawnAdhocAllyUnit('青スケルトン',4,2,false,{rightmost:true});
  log('不死の指輪が発動し、青スケルトンを2体召喚した。','good');
  renderAll();
  return true;
}

function _rollEnemyGold(enemy){
  const range=Array.isArray(enemy&&enemy.goldRange)?enemy.goldRange:null;
  if(!range) return 1;
  const lo=Math.max(0,Number(range[0])||0);
  const hi=Math.max(lo,Number(range[1])||lo);
  return randi(lo,hi);
}

function _initSealStates(){
  _allBattleCharacters().forEach((u,idx)=>{
    const seal=_sealValue(u);
    if(seal>0){
      u._sealed=true;
      u._sealValue=seal;
      u._sealOrder=_fieldOrderOfUnit(u)+idx/1000;
    } else {
      delete u._sealed;
      delete u._sealValue;
      delete u._sealInfinity;
    }
  });
}

// 生贄が揃った時点で盤面に並ぶ生贄キャラを、左上（盤面順）から優先し、キャラごとに
// わずかにタイミングをずらしながら1体ずつS003演出で破棄する（特殊演出シート仕様）。
async function _sacrificeUnitsForSeal(requiredCount){
  if(_battleVictoryAlreadyPending()) return [];
  if(!_livingCombatUnits(G.enemies).length) return [];
  const available=_allBattleCharacters().filter(u=>!_isSealed(u)&&_unitHasSacrifice(u));
  if(Number.isFinite(requiredCount)&&available.length<requiredCount) return [];
  // 必要数以上の生贄が揃った場合は、盤面上の生贄持ちを全て破壊する。
  // 例：封印1に生贄3体なら、1体ではなく3体とも犠牲にする。
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
      await playSacrificeDestroyVfx(u,isEnemySide?'enemy':'ally');
      if(_battleVictoryAlreadyPending()) return;
      await fireDeathEffects(u);
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

async function _applyReleaseEffect(unit,isEnemySide,sacrificed){
  if(!unit||unit.hp<=0) return;
  const hasName=name=>_unitHasEffectName(unit,name);
  const foes=isEnemySide?G.allies:G.enemies;
  const releasePanel=(unit.equipment||[]).find(p=>p&&(p.releaseAtkBonus||p.releaseHpBonus));
  const releaseAtk=Number(unit._releaseAtkBonus)||Number(releasePanel?.releaseAtkBonus)||0;
  const releaseHp=Number(unit._releaseHpBonus)||Number(releasePanel?.releaseHpBonus)||0;
  if(releaseAtk||releaseHp){
    _addBattleStats(unit,releaseAtk,releaseHp,isEnemySide?'enemy':'ally');
    log(`${_lc(unit.name,isEnemySide)}の解放効果で+${releaseAtk}/+${releaseHp}を得た。`,isEnemySide?'bad':'good');
  }
  if(hasName('アークデーモン')){
    const atk=(sacrificed||[]).reduce((s,u)=>s+Math.max(0,Number(u.atk)||0),0);
    const hp=(sacrificed||[]).reduce((s,u)=>s+Math.max(0,Number(u.maxHp??u.hp)||0),0);
    _addBattleStats(unit,atk,hp,isEnemySide?'enemy':'ally');
    log(`${_lc(unit.name,isEnemySide)}の解放効果で生贄の戦闘力を得た。+${atk}/+${hp}`,'bad');
    return;
  }
  if(hasName('オーバーロード')){
    const atk=Math.max(0,Number(unit.atk)||0);
    const hp=Math.max(0,Number(unit.maxHp??unit.hp)||0);
    _addBattleStats(unit,atk,hp,isEnemySide?'enemy':'ally');
    log(`${_lc(unit.name,isEnemySide)}の解放効果で戦闘力が2倍になった。`,'bad');
    return;
  }
  if(hasName('アビス・バロン')){
    const candidates=_livingCombatUnits(foes);
    if(candidates.length){
      const target=_pickRandomEnemyTargets(foes,unit)[0];
      target.keywords=[...(target.keywords||[]),'封印∞'];
      target._sealed=true;
      target._sealValue=Infinity;
      target._sealInfinity=true;
      log(`${_lc(unit.name,isEnemySide)}の解放効果で${_lc(target.name,!isEnemySide)}に封印∞を付与した。`,'bad');
      if(typeof renderAll==='function') renderAll();
    }
    return;
  }
  if(hasName('フィーンド')){
    const repeat=Math.max(1,_connectedEnhancementCount(unit));
    for(let i=0;i<repeat;i++){
      const entries=_livingCombatUnits(foes).map(t=>({unit:t,side:isEnemySide?'ally':'enemy',amount:1,source:unit}));
      if(!entries.length) break;
      playDamageEffectSfx('all');
      await applyDamageBatch(entries,{source:unit,effect:true});
    }
    log(`${_lc(unit.name,isEnemySide)}の解放効果で全ての敵に1ダメージを与えた。`,'bad');
    return;
  }
  if(hasName('ベヒーモス')){
    G.mana=_ensureMana()*2;
    if(typeof renderManaHud==='function') renderManaHud();
    log(`${_lc(unit.name,isEnemySide)}の解放効果でマナが2倍になった。`,isEnemySide?'bad':'good');
  }
}

async function _resolveSeals(){
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
      // 封印解除は1体ずつ判定する。前の解除で生贄が減った場合、後続はその時点の
      // 残数を使って再判定し、不足していれば解除しない。
      if(_sacrificeCount()<required) continue;
      unit._sealReady=true;
      renderAll();
      await new Promise(r=>requestAnimationFrame(()=>r()));
      if(_battleVictoryAlreadyPending()||!_livingCombatUnits(G.enemies).length) return false;
      await sleep(120);
      if(_battleVictoryAlreadyPending()||!_livingCombatUnits(G.enemies).length) return false;
      const sacrificed=await _sacrificeUnitsForSeal(required);
      if(sacrificed.length<required){ delete unit._sealReady; continue; }
      const isEnemySide=(G.enemies||[]).includes(unit);
      if(typeof playSealReleaseVfx==='function'){
        await playSealReleaseVfx(unit,isEnemySide?'enemy':'ally');
      } else {
        unit._sealed=false;
        delete unit._sealValue;
      }
      delete unit._sealReady;
      log(`${_lc(unit.name,isEnemySide)}の封印が解放された。`,'gold');
      // 封印から解放されたキャラクターは「戦闘中に召喚された」扱いにする
      // （ナーガ・ヘルナイト・光の指輪・リッチ等の召喚時効果の対象になる）。
      await _afterPanelSummon(unit,isEnemySide);
      const repeats=_releaseRepeatCount(unit,isEnemySide);
      for(let i=0;i<repeats;i++) await _applyReleaseEffect(unit,isEnemySide,sacrificed);
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
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
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

function restoreAlliesForRewardTransition(){
  if(G._rewardBattleStateRestored) return;
  const snap=G._allyBattleStartSnapshot;
  if(!Array.isArray(snap)) return;
  G.allies=snap.map(a=>a?clone(a):null);
  G._rewardBattleStateRestored=true;
}

function unitMatchesRace(unit, race){
  if(!unit||!race) return false;
  const races=String(unit.race||'').split(/[／/、,，\s]+/).filter(Boolean);
  return race==='全て'||races.includes(race)||races.includes('全て');
}

function applyUnitBuff(unit, atk, hp, sideOverride){
  if(!unit||unit.hp<=0) return {atk:0,hp:0};
  const doneHp=hp>0?hp:0;
  // ATKもHPと同じく熟練（+1）を通す。直接代入していたため熟練が乗らなかった。
  const atkDone=atk>0?addUnitAtk(unit,atk):0;
  const hpDone=doneHp>0?addUnitHp(unit,doneHp,sideOverride):0;
  return {atk:atkDone,hp:hpDone};
}

// ── 戦闘開始 ──────────────────────────────────

// 戦闘カットインのタイトル（固有名）。「地域情報」シートの
// 「街までの名前」（街より前のstage1〜4）／「塔までの名前」（街より後のstage5〜）を使う。
// シートに名前が無い場合は従来の「戦 闘 開 始」にフォールバックする。
function _waveBattleRouteName(){
  if(!G||!G._waveLoopEnabled) return '';
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

function _playBattleStartIntro(){
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
  const info=_battleStartIntroText();
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
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
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

async function startBattle(){
  G._debugFormationAbort=false;
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
  (G.spellSlots||[]).forEach(c=>{ if(c){ delete c._firedThisBattle; delete c._manaFireCount; } });
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
  G.mana=0;
  G.allies.forEach(a=>{ if(a){ delete a._deathProcessed; delete a._manaFireCount; } });
  G.enemies.forEach(e=>{ if(e){ delete e._deathProcessed; delete e._manaFireCount; } });

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
  G._battleStartedAt=performance.now();
  G._battleVictoryPending=false;
  G._battleSpeed=1;
  G._battleSpeedFrom=1;
  G._battleSpeedTarget=1;
  G._battleSpeedChangedAt=performance.now();
  G._battleAttackedIds={};
  G._necromancerRingUsed=false;
  G._revivalRingUsed=false;
  G._oniRingAttackCount=0;
  G._stormRingFireCount=0;
  G._enemyDeathsThisBattle=0;

  const waveEnemyKey=G._waveLoopEnabled
    ?`${Number(G._wave)||1}:${Number(G._waveStage)||1}:${String(G._waveBattleType||'')}`
    :'';
  const reuseWaveEnemies=!!(waveEnemyKey&&G._waveRetryEnemyKey===waveEnemyKey&&Array.isArray(G._waveEnemySnapshot));
  G.enemies=reuseWaveEnemies
    ?clone(G._waveEnemySnapshot)
    :((mapBattle&&mapBattle.type==='elite'&&typeof generateEliteEnemies==='function')
      ?generateEliteEnemies(battleFloor)
      :generateEnemies(battleFloor));
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
  if(waveEnemyKey){
    if(reuseWaveEnemies) G._waveRetryEnemyKey=null;
    else G._waveEnemySnapshot=clone(G.enemies);
  }
  G.enemies.forEach(e=>{
    if(!e) return;
    if(e._isObject) return;
    e.allyTarget=false;
  });
  // 演出確認用の試験戦闘：全敵のATKを3、HPを500に上書きする。
  if(G._testBattleMode&&!G._libraryTestBattleMode){
    G.enemies.forEach(e=>{
      if(!e||e._isObject) return;
      e.atk=3; e.baseAtk=3;
      e.maxHp=500; e.hp=500;
    });
  }
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
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
  // 開戦効果と封印処理がすべて終わってから、そこで溜まったマナを一括判定する。
  // 開戦処理の途中からマナ効果へ再入すると、同じPromiseを待つ経路ができて停止する。
  // 前戦闘や保留中判定の状態を持ち越さず、今回出撃した全キャラを現在マナから再評価する。
  G._checkingManaUnitEffects=false;
  delete G._manaUnitEffectsPromise;
  [...(G.allies||[]),...(G.enemies||[])].forEach(unit=>{ if(unit) delete unit._manaFireCount; });
  await _checkManaThresholdUnitEffects();
  _checkManaCostSpells();
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

async function battlePhase(){
  const _runId=Number(G._battleRunId)||0;
  G.phase='enemy';
  document.body.classList.add('battle-turn-active');
  renderControls();
  log(`戦闘開始！`,'sys');

  let safety=0;
  // 数が多い陣営が先攻（前衛・後衛を問わず生存キャラクター数で比較）
  const _livingCount=arr=>(arr||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!u._isSoul).length;
  let side=_livingCount(G.enemies)>_livingCount(G.allies)?'enemy':'ally';
  // 神速の指輪：開戦：（左端のキャラクターのATKを2倍にし、）先攻になる。
  if(_hasRingNamed('神速の指輪')||_hasRingNamed('疾風の指輪')) side='ally';
  // 前衛が全員攻撃し終えたら後衛、後衛が全員攻撃し終えたら再度前衛の左端から、という
  // レーン単位のサイクルを陣営ごとに管理する（前衛全滅を待つ旧仕様は廃止）
  const enemyLaneState={lane:'front',attacked:new Set()};
  const allyLaneState={lane:'front',attacked:new Set()};
  while(!_checkBattleOver()&&safety++<500&&!G._testBattleAbort&&!_battleRunStale(_runId)){
    updateBattleSpeedMode();
    if(!_pickLaneAttacker(G.enemies,true,enemyLaneState)&&!_pickLaneAttacker(G.allies,false,allyLaneState)){
      G._battleDraw=true;
      // 盤面に生存中の敵が残っていても報酬フェイズへ安全に移行できるようクリアする
      G.enemies=new Array(MAX_ENEMIES||14).fill(null);
      finishBattleAsVictory('Draw');
      return;
    }
    if(side==='enemy'){
      const pick=_pickLaneAttacker(G.enemies,true,enemyLaneState);
      if(!pick){
        side='ally';
        continue;
      }
      if(pick.switched){ enemyLaneState.lane=pick.lane; enemyLaneState.attacked=new Set(); }
      const enemy=G.enemies[pick.idx];
      enemyLaneState.attacked.add(enemy.id);
      _markBattleAttacked(enemy);
      let enemyActed=false;
      try{
        enemyActed=await enemyAttackAction(enemy,pick.idx);
        await _flushRingManaThresholdEffects();
        if(_checkBattleOver()) return;
        await _resolveSeals();
      }catch(e){
        console.error('[enemyAttackAction]',e);
        log('敵の攻撃処理でエラーが発生したため、その攻撃をスキップしました。','sys');
      }
      compactBattleUnits();
      if(_battleRunStale(_runId)){ G._battlePhaseRunning=false; document.body.classList.remove('battle-turn-active'); return; }
      if(G._testBattleAbort){ _exitTestBattle(); return; }
      if(_checkBattleOver()) return;
      if(enemyActed) side='ally';
    } else {
      const pick=_pickLaneAttacker(G.allies,false,allyLaneState);
      if(!pick){
        side='enemy';
        continue;
      }
      if(pick.switched){ allyLaneState.lane=pick.lane; allyLaneState.attacked=new Set(); }
      const ally=G.allies[pick.idx];
      allyLaneState.attacked.add(ally.id);
      _markBattleAttacked(ally);
      let allyActed=false;
      try{
        allyActed=await allyAttackAction(ally,pick.idx);
        await _flushRingManaThresholdEffects();
        if(_checkBattleOver()) return;
        await _resolveSeals();
      }catch(e){
        console.error('[allyAttackAction]',e);
        log('味方の攻撃処理でエラーが発生したため、その攻撃をスキップしました。','sys');
      }
      compactBattleUnits();
      if(_battleRunStale(_runId)){ G._battlePhaseRunning=false; document.body.classList.remove('battle-turn-active'); return; }
      if(G._testBattleAbort){ _exitTestBattle(); return; }
      if(_checkBattleOver()) return;
      if(allyActed) side='enemy';
      G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });
    }
  }
  if(_battleRunStale(_runId)){ G._battlePhaseRunning=false; document.body.classList.remove('battle-turn-active'); return; }
  if(G._testBattleAbort){ _exitTestBattle(); return; }
  if(safety>=500){
    log('戦闘が長引いたため停止しました','sys');
  }
  renderAll();
}

// 指定レーン内の攻撃可能ユニットのスロット添字を左（若い添字）から順に列挙する
function _laneAttackCandidates(arr,isEnemy,lane){
  const max=isEnemy?(MAX_ENEMIES||8):(MAX_ALLIES||5);
  const result=[];
  for(let i=0;i<max;i++){
    const u=arr[i];
    if(!u||u.hp<=0) continue;
    if(_isSealed(u)) continue;
    if(isEnemy&&u._isObject) continue;
    if(!isEnemy&&(u._isSoul||u._isObject)) continue;
    if((u.lane||'front')!==lane) continue;
    const atkVal=isEnemy?(u.nullified>0?0:(u.atk||0)):_attackDamageValue(u);
    // ATK0で攻撃自体はスキップされる場合でも、毒を持つキャラクターは毒ダメージ処理のために手番を得る
    if((atkVal||0)<=0&&!(u.poison>0)) continue;
    result.push(i);
  }
  return result;
}

// state={lane:'front'|'rear', attacked:Set<id>} を参照し、現在のレーンでまだ攻撃していない
// 最も左のユニットを返す。現在のレーンを全員攻撃し終えていれば反対のレーンへの切り替えを提案する
// （実際のレーン切り替え・attacked集合のリセットは呼び出し側がswitched===trueを見て確定させる）。
function _pickLaneAttacker(arr,isEnemy,state){
  const current=_laneAttackCandidates(arr,isEnemy,state.lane).filter(i=>!state.attacked.has(arr[i].id));
  if(current.length) return {idx:current[0],lane:state.lane,switched:false};
  const otherLane=state.lane==='front'?'rear':'front';
  const other=_laneAttackCandidates(arr,isEnemy,otherLane);
  if(other.length) return {idx:other[0],lane:otherLane,switched:true};
  // 反対のレーンに攻撃可能なユニットが一人もいない（後衛不在等）場合、そのままだと
  // 生存者がいても永久にnullを返し続けてしまう（誤って引き分け扱いになるバグの原因だった）。
  // 同じレーンを新しいパスとして再開できないか確認する。
  const resetCurrent=_laneAttackCandidates(arr,isEnemy,state.lane);
  if(resetCurrent.length) return {idx:resetCurrent[0],lane:state.lane,switched:true};
  return null;
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
  const maxA=MAX_ALLIES||10;
  const frontSlots=ENEMY_FRONT_SLOTS||7;
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,maxA-frontSlots));
  const nextAllies=new Array(maxA).fill(null);
  const liveAllies=(G.allies||[]).filter(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject);
  liveAllies.forEach(clampUnitStats);
  const placeFixed=units=>{
    const rest=[];
    units.forEach(u=>{
      const pos=Number.isInteger(u._battleSlot)?u._battleSlot:-1;
      if(pos>=0&&pos<nextAllies.length&&!nextAllies[pos]){
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
  G.allies=nextAllies;
  const maxE=MAX_ENEMIES||10;
  const enemyRearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,maxE-frontSlots));
  const nextEnemies=new Array(maxE).fill(null);
  const liveEnemies=(G.enemies||[]).filter(e=>e&&e.hp>0&&!e._isObject);
  liveEnemies.forEach(clampUnitStats);
  const enemyFront=liveEnemies.filter(e=>(e.lane||'front')!=='rear');
  const enemyRear=liveEnemies.filter(e=>(e.lane||'front')==='rear');
  _placeCenteredRow(nextEnemies,enemyFront.slice(0,frontSlots),0,frontSlots,'front');
  _placeCenteredRow(nextEnemies,enemyRear.slice(0,enemyRearSlots),frontSlots,enemyRearSlots,'rear');
  G.enemies=nextEnemies;
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');
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
    dest[pos]=u;
  });
}

function compactBattleUnitsAfterDeath(){
  if(G._isSimulating||G._compactingAfterDeath||G._deferBattleCompact) return;
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
  try{
    if(typeof renderAll==='function') renderAll();
  }finally{
    G._animateBattleCompact=false;
  }
}

function requestBattleCompact(){
  if(G._battleMotionDepth>0){
    G._pendingBattleCompact=true;
    G._pendingBattleRender=true;
    return;
  }
  compactBattleUnits();
  _renderAfterBattleCompact();
}

function requestBattleRender(){
  if(G._battleMotionDepth>0){
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
  // 終戦効果の完了後、報酬・勝利演出へ進む前に残存VFXを掃除する。
  if(typeof _forceStopAllVfx==='function') _forceStopAllVfx();
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

async function _applyUnitAttackEffects(unit,isEnemySide){
  if(isEnemySide&&_isUnitSilencedByScroll(unit)) return;
  if(!unit||unit.hp<=0||_isSealed(unit)) return;
  const allies=isEnemySide?G.enemies:G.allies;
  const foes=isEnemySide?G.allies:G.enemies;
  const desc=String(unit.desc||'');
  const hasName=name=>_unitHasEffectName(unit,name);
  // 戦術：攻撃時に自身へ+1/+2。共振：同じ色の味方全員へ+1/+1。
  const tacticsCount=Math.max(_unitKeywordCount(unit,'戦術'),_unitEffectPanelCount(unit,'戦術'));
  for(let i=0;i<tacticsCount;i++) _addBattleStats(unit,1,2,isEnemySide?'enemy':'ally');
  const resonanceCount=Math.max(_unitKeywordCount(unit,'共振'),_unitEffectPanelCount(unit,'共振'));
  if(resonanceCount>0){
    const color=_normalizeColorTextForBattle(unit.color);
    const targets=allies.filter(a=>_canReceiveBattleEffect(a)&&_normalizeColorTextForBattle(a.color)===color);
    for(let i=0;i<resonanceCount;i++) targets.forEach(a=>_addBattleStats(a,1,1,isEnemySide?'enemy':'ally'));
    log(`${_lc(unit.name,isEnemySide)}の共振で同じ色の味方は+${resonanceCount}/+${resonanceCount}を得た。`,isEnemySide?'bad':'good');
  }
  // 懺悔はキーワードではなく、接続された強化カード名で判定する。
  const penitenceCount=_unitEffectPanelCount(unit,'懺悔');
  if(penitenceCount>0){
    const side=isEnemySide?'enemy':'ally';
    // 懺悔1枚につき「1ダメージを2回」。カードごと・ダメージごとに
    // 直列処理することで、ケットシー等の負傷効果も各ダメージの直後に1回ずつ発動させる。
    for(let i=0;i<penitenceCount&&unit.hp>0;i++){
      for(let hit=0;hit<2&&unit.hp>0;hit++){
        await applyDamageBatch([{unit,side,amount:1,source:unit}],{source:unit,effect:true});
      }
    }
    log(`${_lc(unit.name,isEnemySide)}の懺悔${penitenceCount}枚が発動した。1ダメージを${penitenceCount*2}回受けた。`,isEnemySide?'bad':'good');
    if(unit.hp<=0) return;
  }
  if(hasName('ブラウニー')||/全ての仲間のHPが\+2/.test(desc)){
    allies.forEach(a=>{
      if(_canReceiveBattleEffect(a)){
        a.hp=(a.hp||0)+2;
        a.maxHp=(a.maxHp||0)+2;
      }
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての仲間のHPが+2された。`,isEnemySide?'bad':'good');
  } else if(/全ての仲間のHPが\+1/.test(desc)){
    allies.forEach(a=>{
      if(_canReceiveBattleEffect(a)){
        a.hp=(a.hp||0)+1;
        a.maxHp=(a.maxHp||0)+1;
      }
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての仲間のHPが+1された。`,isEnemySide?'bad':'good');
  }
  if(/^攻撃[:：]/.test(desc)&&/全ての敵に1ダメージ/.test(desc)){
    const targets=foes.filter(_canReceiveBattleEffect);
    const entries=targets.map(t=>({unit:t,side:isEnemySide?'ally':'enemy',amount:1,source:unit}));
    playDamageEffectSfx('all');
    // アラッサス（C043）等、専用の薙ぎ払い演出を持つキャラクターは通常のヒットVFXの前に再生する
    // （個々のヒットVFXでは同じ動画を対象数だけ重複再生しないよう、その場合はeffect指定しない）
    const isSweepStyle=typeof isSweepStyleEffectVfx==='function'&&isSweepStyleEffectVfx(unit);
    if(isSweepStyle){
      const sweepUrl=typeof getCharacterSweepVfxPath==='function'?getCharacterSweepVfxPath(unit):'';
      if(sweepUrl&&typeof playCharacterSweepVfx==='function') await playCharacterSweepVfx(unit,isEnemySide,targets,sweepUrl);
    }
    await applyDamageBatch(entries,{source:unit,effect:!isSweepStyle});
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての敵に1ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  if(/全ての前衛の味方に1ダメージ/.test(desc)){
    const entries=allies
      .filter(t=>_canReceiveBattleEffect(t)&&(t.lane||'front')!=='rear')
      .map(t=>({unit:t,side:isEnemySide?'enemy':'ally',amount:1,source:unit}));
    await applyDamageBatch(entries,{source:unit,effect:true});
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての前衛の味方に1ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  // サイレン：攻撃：全てのキャラクターに1ダメージを与える。（両陣営とも対象）
  const sirenAttack=String(desc||'').match(/^攻撃：全てのキャラクターに(\d+)ダメージを与える。/);
  if(hasName('サイレン')||sirenAttack){
    const damage=Math.max(1,Number(sirenAttack&&sirenAttack[1])||_unitEffectScale(unit,'サイレン'));
    const entries=[
      ...allies.filter(_canReceiveBattleEffect).map(t=>({unit:t,side:isEnemySide?'enemy':'ally',amount:damage,source:unit})),
      ...foes.filter(_canReceiveBattleEffect).map(t=>({unit:t,side:isEnemySide?'ally':'enemy',amount:damage,source:unit})),
    ];
    playDamageEffectSfx('all');
    await applyDamageBatch(entries,{source:unit,effect:true});
    log(`${_lc(unit.name,isEnemySide)}の効果で全てのキャラクターに${damage}ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  // ケンタウロス：攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。
  if(/^攻撃：ランダムな敵にXダメージを与える。Xはマナの数に等しい。/.test(desc)){
    const alive=foes.filter(_canReceiveBattleEffect);
    const x=_ensureMana();
    if(alive.length&&x>0){
      const target=_pickRandomEnemyTargets(foes,unit)[0];
      playDamageEffectSfx('single');
      await applyDamageBatch([{unit:target,side:isEnemySide?'ally':'enemy',amount:x,source:unit}],{source:unit,effect:true});
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,!isEnemySide)}に${x}ダメージを与えた。`,isEnemySide?'bad':'good');
    }
  }
  // 竜の契約：攻撃：ランダムな敵に5ダメージを与える。
  // 接続枚数だけ繰り返す（咆哮・懺悔と同じ数え方）。以前は枚数を見ずに1回だけ発動していた。
  const dragonCount=Math.max(_unitKeywordCount(unit,'竜の契約'),_unitEffectPanelCount(unit,'竜の契約'));
  for(let i=0;i<dragonCount;i++){
    // 1回目で相手が倒れることがあるため、対象は毎回選び直す。
    const alive=foes.filter(_canReceiveBattleEffect);
    if(!alive.length) break;
    const target=_pickRandomEnemyTargets(foes,unit)[0];
    if(!target) break;
    playDamageEffectSfx('single');
    // 竜の契約はキーワード由来の効果でありカード固有の効果ではないため、
    // ダメージ源キャラクターの専用VFX（CXXX.mp4）は使わない（通常のhit.mp4を使う）。
    await applyDamageBatch([{unit:target,side:isEnemySide?'ally':'enemy',amount:5,source:unit}],{source:unit});
    log(`${_lc(unit.name,isEnemySide)}の竜の契約が発動した。${_lc(target.name,!isEnemySide)}に5ダメージを与えた。`,isEnemySide?'bad':'good');
  }
  if(hasName('ファミリア')){
    const n=_sacrificeCount();
    if(n>0) _gainMana(n,unit.name);
  }
  if(hasName('ユミル')){
    const x=_ensureMana();
    if(x>0){
      _addBattleStats(unit,x,x,isEnemySide?'enemy':'ally');
      log(`${_lc(unit.name,isEnemySide)}の効果で+${x}/+${x}を得た。`,isEnemySide?'bad':'good');
    }
  }
  if(hasName('ラミア')){
    const repeat=1+(_isWoundedUnit(unit._currentAttackTarget)?1:0);
    for(let i=0;i<repeat;i++) _addBattleStats(unit,2,1,isEnemySide?'enemy':'ally');
    log(`${_lc(unit.name,isEnemySide)}の効果で+${2*repeat}/+${repeat}を得た。`,isEnemySide?'bad':'good');
  }
  if(hasName('センチネル')){
    const target=_randomLiving(allies,a=>!(a.name==='センチネル'&&String(a.color||'')==='赤'));
    const x=Math.max(0,Number(unit.hp)||0);
    if(target&&x>0){
      addUnitHp(target,x,isEnemySide?'enemy':'ally');
      log(`${_lc(unit.name,isEnemySide)}の効果で${_lc(target.name,isEnemySide)}はHP+${x}を得た。`,isEnemySide?'bad':'good');
    }
  }
  if(hasName('エルヴンメイジ')){
    allies.forEach(a=>{
      if(_canReceiveBattleEffect(a)&&String(a.color||'')==='黄') _addBattleStats(a,1,1,isEnemySide?'enemy':'ally');
    });
    log(`${_lc(unit.name,isEnemySide)}の効果で全ての黄キャラクターは+1/+1を得た。`,isEnemySide?'bad':'good');
  }
  if(hasName('インプ')){
    let stolen=0;
    _allBattleCharacters().forEach(t=>{
      if(t===unit||!_canReceiveBattleEffect(t)||!_unitHasSacrifice(t)||!(t.atk>0)) return;
      _addBattleStats(t,-1,0,_battleSideOfUnit(t));
      stolen++;
    });
    if(stolen>0){
      _addBattleStats(unit,stolen,0,isEnemySide?'enemy':'ally');
      log(`${_lc(unit.name,isEnemySide)}の効果で生贄を持つキャラクターからATKを${stolen}奪った。`,isEnemySide?'bad':'good');
    }
  }
  if(isEnemySide&&hasName('黄金の瞳"フレイ"')){
    await _spawnEnemyUnitByName('黒マッドキャット',1,2,true,unit);
    log(`${_lc(unit.name,true)}の攻撃で「黒マッドキャット」を召喚した。`,'bad');
  }
  if(isEnemySide&&hasName('万象の揺り籠"エピトメ"')){
    await _spawnRandomEnemyBoss(unit);
  }
  const bladeCount=_enhancementCount(unit,'剣技');
  for(let i=0;i<bladeCount;i++){
    const atk=3+_combatModifierBonus(unit,isEnemySide);
    _addBattleStats(unit,atk,0,isEnemySide?'enemy':'ally');
    log(`${_lc(unit.name,isEnemySide)}の剣技が発動した。ATK+${atk}`,'good');
  }
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
  await _applyUnitAttackEffects(ally,false);
  const extra=_allyAttackEffectExtra(ally);
  for(let i=0;i<extra&&ally&&ally.hp>0;i++){
    await _applyUnitAttackEffects(ally,false);
  }
}

async function _applyEnemyAttackEffects(enemy){
  await _applyUnitAttackEffects(enemy,true);
  const extra=_enhancementCount(enemy,'闇の儀式');
  for(let i=0;i<extra&&enemy&&enemy.hp>0;i++){
    await _applyUnitAttackEffects(enemy,true);
  }
}

async function _applyAllyAttackEffectsWithElf(ally){
  if(!ally||ally.hp<=0) return;
  await _applyAllyAttackEffects(ally);
}

async function _applyEnemyAttackEffectsWithElf(enemy){
  if(!enemy||enemy.hp<=0) return;
  await _applyEnemyAttackEffects(enemy);
}

function _attackRepeatCount(unit){
  const kws=_unitPanelKeywords(unit);
  if(kws.includes('三段攻撃')) return 3;
  if(kws.includes('二段攻撃')) return 2;
  return 1;
}

function _unitPanelKeywords(unit){
  const cardNames=new Set(['封印されしもの','禁断の力','武器破壊','団結','共振','遺志','熟練','戦術','大盾','策士']);
  const kws=[...(unit&&unit.keywords||[])].filter(k=>!cardNames.has(String(k||'').trim()));
  const unitText=[unit&&unit.desc,unit&&unit.effectText,unit&&unit.effect].filter(Boolean).join(' ');
  const passiveText=unitText.replace(/(^|\n)\s*\d+マナ(?:毎)?[:：][^\n。]*(?:。|$)/g,' ');
  const ownPassiveText=passiveText.replace(/(?:ランダムな)?(?:味方|敵|キャラクター|.+?キャラクター)(?:に|が)[^。]*(?:結界|生贄|復活|封印\d*)を(?:付与する|得る)。?/g,' ');
  ['復活','根性','ヘイト','二段攻撃','三段攻撃','三方向攻撃','全体攻撃','先制'].forEach(k=>{
    // 「復活を付与する」は自身ではなく他者に付与する効果文のため、自身の復活キーワードとしては扱わない
    // （レイス等：これを除外しないと、死亡時に自分自身が誤って復活してしまう）
    if(ownPassiveText.includes(k)) kws.push(k);
  });
  const shieldText=ownPassiveText.match(/(?:^|\n)\s*結界\s*(\d*)/);
  if(shieldText) kws.push('結界'+(shieldText[1]||'1'));
  if(/(?:^|\n|\s)生贄(?:\s|。|\n|$)/.test(ownPassiveText)) kws.push('生贄');
  const sealText=ownPassiveText.match(/封印\s*(\d+)/);
  if(sealText) kws.push('封印'+(sealText[1]||'1'));
  // 注：以前はunit.equipment（召喚キャラクターがフロー表示用に複製保持している接続強化パネルの
  // クローン）もここで再スキャンしていたが、そのパネルは既に_collectAdjacentEnhancements経由で
  // unit.keywordsに反映済みのため、再スキャンすると同じキーワードが二重・三重に数えられ、
  // 逆襲/闇の儀式/狂気等のカウント依存効果（death Repeats等）が過剰発動するバグの原因になっていた。
  // unit.keywordsのみを正とする。
  if(kws.includes('三段攻撃')){
    for(let i=kws.length-1;i>=0;i--) if(kws[i]==='二段攻撃') kws.splice(i,1);
  }
  if(kws.includes('全体攻撃')){
    for(let i=kws.length-1;i>=0;i--) if(kws[i]==='三方向攻撃') kws.splice(i,1);
  }
  return kws;
}

function _unitHasKeyword(unit, kw){
  if(kw==='結界') return _unitShieldValue(unit)>0;
  if(kw==='加護') return (_unitPanelKeywords(unit)||[]).some(k=>/^加護\d*$/.test(String(k||'')));
  return _unitPanelKeywords(unit).includes(kw)||((unit&&unit._adjacentPanelAbilities)||[]).includes(kw);
}

function _unitKeywordCount(unit, kw){
  if(!kw) return 0;
  if(kw==='結界') return _unitShieldValue(unit)>0?1:0;
  return _unitPanelKeywords(unit).filter(k=>k===kw).length+(((unit&&unit._adjacentPanelAbilities)||[]).filter(k=>k===kw).length);
}

function _unitHasSacrifice(unit){
  return _unitHasKeyword(unit,'生贄');
}

function _sealValue(unit){
  if(unit&&unit._sealInfinity) return Infinity;
  const kw=(_unitPanelKeywords(unit)||[]).find(k=>/^封印(?:\d+|∞)$/.test(k));
  if(kw&&/∞/.test(kw)) return Infinity;
  return kw?Math.max(1,parseInt(kw.replace('封印',''),10)||1):0;
}

function _isSealed(unit){
  return !!(unit&&unit._sealed);
}

function _canReceiveBattleEffect(unit){
  return !!(unit&&unit.hp>0&&!unit._isObject&&!unit._isSoul&&!_isSealed(unit));
}

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

function _sacrificeCount(){
  return _allBattleCharacters().filter(u=>!_isSealed(u)&&_unitHasSacrifice(u)).length;
}

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

function _shieldValueFromKeyword(k){
  const m=String(k||'').trim().match(/^結界\s*(\d*)$/);
  if(!m) return 0;
  return Math.max(1,parseInt(m[1]||'1',10)||1);
}

function _unitShieldValue(unit){
  const kws=_unitPanelKeywords(unit);
  return kws.reduce((sum,k)=>sum+_shieldValueFromKeyword(k),0);
}

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

function _attackDamageValue(unit){
  return Math.max(0,unit&&unit.atk||0);
}

async function _applyAttackEffectsForSide(unit,isEnemySide){
  if(isEnemySide) await _applyEnemyAttackEffectsWithElf(unit);
  else await _applyAllyAttackEffectsWithElf(unit);
}

function _hasAttackEffectsForPause(unit){
  if(!unit||unit.hp<=0||_isSealed(unit)) return false;
  const desc=String(unit.desc||unit.effectText||unit.effect||'');
  const hasName=name=>_unitHasEffectName(unit,name);
  if(_unitEffectPanelCount(unit,'懺悔')>0) return true;
  if(hasName('ブラウニー')||hasName('ファミリア')||hasName('ユミル')||hasName('ラミア')||hasName('センチネル')||hasName('エルヴンメイジ')||hasName('インプ')||hasName('黄金の瞳"フレイ"')||hasName('万象の揺り籠"エピトメ"')) return true;
  if(/^攻撃[:：]/.test(desc)||/^攻撃：/.test(desc)) return true;
  if(/全ての仲間のHPが\+[12]/.test(desc)||hasName('サイレン')) return true;
  if(/^攻撃：ランダムな敵にXダメージ/.test(desc)) return true;
  if(_unitHasKeyword(unit,'竜の契約')||_unitEffectPanelCount(unit,'竜の契約')>0) return true;
  if(_unitHasKeyword(unit,'共振')||_unitHasKeyword(unit,'戦術')) return true;
  if(_enhancementCount(unit,'剣技')>0) return true;
  if(hasName('日刻の巫女"ルミア"')) return true;
  return false;
}

function _applyGremlinAttackSwap(attacker,target,isEnemySide){
  if(!attacker||!target||attacker.hp<=0||target.hp<=0||attacker.name!=='グレムリン') return;
  const nextHp=Math.max(1,Number(target.atk)||0);
  const nextAtk=Math.max(0,Number(attacker.hp)||0);
  attacker.hp=Math.min(Math.max(1,attacker.maxHp||nextHp),nextHp);
  target.atk=nextAtk;
  target.baseAtk=Math.max(0,nextAtk);
  log(`${_lc(attacker.name,isEnemySide)}の効果でHPと対象のATKを入れ替えた。`,isEnemySide?'bad':'good');
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
  unit._useEnemyVisualFrame=true;
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
  if(!slot||typeof slot.getBoundingClientRect!=='function') return null;
  const rect=slot.getBoundingClientRect();
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

// 画面揺れを「ぶつかった瞬間」に鳴らすため、_applyDamageState() と同じ規則で
// 最終ダメージだけを先読みする。状態は一切変更しない（結界も減らさない）。
function _predictFinalDamage(unit, dmg, skipTough){
  if(!unit||unit.hp<=0||!(dmg>0)) return 0;
  if(_isSealed(unit)) return 0;
  if(unit.shield>0) return 0;
  let v=dmg;
  if(unit.weaken>0) v+=unit.weaken;
  const toughSum=skipTough?0:(unit.keywords||[]).filter(k=>/^強靭\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if(toughSum>0) v-=toughSum;
  return Math.max(0,v);
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

function _applyDamageState(unit, dmg, source, side, skipTough, isAttackDamage){
  if(!unit||unit.hp<=0||!(dmg>0)) return {unit,side,actualDmg:0,died:false,blocked:false};
  if(_isSealed(unit)) return {unit,side,actualDmg:0,died:false,blocked:true};
  if(unit.shield>0){
    unit.shield--;
    log(`${_lc(unit.name,side==='enemy')}の結界がダメージを防いだ。`,'sys');
    if(typeof playSfx==='function') playSfx('shield',{group:'combat'});
    if(side==='ally') onAllyShieldLost(unit);
    else onEnemyShieldLost(unit);
    return {unit,side,actualDmg:0,died:false,blocked:true};
  }
  // 弱体X：このキャラクターが受ける1以上のダメージはX増加する（複数付与された場合は加算値で保持）
  if(unit.weaken>0) dmg+=unit.weaken;
  // 強靭X：このキャラクターが受けるダメージはX減少する（複数所持時は合算）
  const toughSum=skipTough?0:(unit.keywords||[]).filter(k=>/^強靭\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if(toughSum>0) dmg-=toughSum;
  unit._lastDamageSource=source||unit._lastDamageSource||null;
  // 武器破壊：「攻撃：このキャラクターの攻撃はHPではなくATKにダメージを与える。」
  // 武器破壊を持つのは**ダメージを与える側**であり、削られるのは対象のATK。
  // 発動するのは通常攻撃のダメージのみ。効果ダメージ（開戦効果・毒等）と
  // 反撃ダメージ（_counterDamage）では発動しない。
  // 結界・弱体・強靭の処理は通常のダメージと同じ。
  if(isAttackDamage&&source&&source!==unit&&_enhancementCount(source,'武器破壊')>0){
    const actualDmg=Math.max(0,dmg);
    const preAtk=Math.max(0,Number(unit.atk)||0);
    const atkDmg=Math.min(preAtk,actualDmg);
    const hpOverflow=Math.max(0,actualDmg-atkDmg);
    unit.atk=Math.max(0,preAtk-atkDmg);
    unit.baseAtk=Math.max(0,(Number(unit.baseAtk)||preAtk)-atkDmg);
    if(hpOverflow>0) unit.hp=Math.max(0,(unit.hp||0)-hpOverflow);
    if(actualDmg>0) _recordRunStatsDamage(actualDmg,source&&source._damageType||'');
    const preHp=unit.hp||0;
    if(actualDmg>0&&source) applyKeywordOnHit(source,unit,actualDmg,preHp,true);
    return {unit,side,actualDmg,died:unit.hp<=0,blocked:false,lifeDrain:null,needsAllyInjuryEffects:actualDmg>0&&side==='ally',needsEnemyInjuryEffects:actualDmg>0&&side==='enemy'};
  }
  const actualDmg=Math.max(0,dmg);
  if(typeof _recordRunStatsDamage==='function') _recordRunStatsDamage(actualDmg,source&&source._damageType||'');
  const _preHp=unit.hp||0;
  unit._preDeathSnapshot=_battleUnitSnapshot(unit,_preHp);
  unit.hp=Math.max(0,(unit.hp||0)-actualDmg);
  if(side==='enemy'&&actualDmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
  }
  // 味方の負傷効果（ミノタウロス「直ちに攻撃する」等）はここでは発動しない。この関数は
  // applyDamageBatch()内で同期的に（.map()で）呼ばれるためawaitできない。ここでは
  // 「発動が必要」というフラグだけを立て、applyDamageBatch側でバッチ全体の演出・死亡処理が
  // 確定した後にawaitして直列に（＝他の処理を止めて優先的に）発動させる。
  let needsAllyInjuryEffects=false;
  let needsEnemyInjuryEffects=false;
  if(actualDmg>0&&unit.hp>0&&side==='ally'){
    needsAllyInjuryEffects=true;
  }
  if(actualDmg>0&&unit.hp>0&&side==='enemy') needsEnemyInjuryEffects=true;
  // 生命吸収等は対象を倒した場合も発動するため、unit.hp>0では絞り込まない
  // （生命吸収自体はここでは発動させない。反撃等で攻撃者自身も同じバッチ内で同時にダメージを
  // 受ける可能性があるため、applyDamageBatch側でバッチ内の全ダメージ確定後にまとめて処理する）
  let lifeDrain=null;
  // 呪詛（対象側のキーワードで攻撃者を即死させる）はsource側のキーワード有無に関わらず判定する
  // 必要があるため、「sourceが何かしらのキーワードを持つ場合のみ」に絞り込まない。
  if(actualDmg>0&&source){
    applyKeywordOnHit(source,unit,actualDmg,_preHp,true);
    if((source.keywords||[]).includes('生命吸収')){
      const healAmt=_lifeDrainHealAmount(actualDmg,_preHp);
      if(healAmt>0) lifeDrain={source,healAmt};
    }
  }
  if(side==='enemy'&&unit.instadead&&actualDmg>0) unit.hp=0;
  return {unit,side,actualDmg,died:unit.hp<=0,blocked:false,lifeDrain,needsAllyInjuryEffects,needsEnemyInjuryEffects};
}

// 団結：同じ強化パネルに接続している味方へ、強靭適用後のダメージを分散する。
function _splitEntriesForUnite(entries){
  const out=[];
  (entries||[]).forEach(entry=>{
    if(!entry||entry._uniteSplit||entry.side!=='ally'||!(entry.amount>0)||!entry.unit){ out.push(entry); return; }
    const target=entry.unit;
    const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():null;
    const slot=Number.isInteger(target._mainBoardSlot)?target._mainBoardSlot:-1;
    if(!board||slot<0||!Array.isArray(board.equipment)) { out.push(entry); return; }
    const connected=_collectEnhancementPanelsForSlot(board,slot)
      .filter(x=>x&&x.panel&&String(x.panel.name||'')==='団結');
    if(!connected.length){ out.push(entry); return; }
    const panelIdx=new Set(connected.map(x=>x.idx));
    const members=(G.allies||[]).filter(u=>{
      if(!u||u.hp<=0||u._isObject||u._isSoul||_isSealed(u)||!Number.isInteger(u._mainBoardSlot)) return false;
      const links=_collectEnhancementPanelsForSlot(board,u._mainBoardSlot);
      return links.some(x=>x&&panelIdx.has(x.idx)&&x.panel&&String(x.panel.name||'')==='団結');
    });
    if(members.length<2){ out.push(entry); return; }
    const tough=(target.keywords||[]).filter(k=>/^強靭\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
    const distributable=Math.max(0,(Number(entry.amount)||0)-tough);
    const share=Math.floor(distributable/members.length);
    let remainder=distributable-share*members.length;
    members.forEach(member=>{
      const amount=share+(remainder-->0?1:0);
      if(amount>0) out.push({...entry,unit:member,amount,_uniteSplit:true,_skipTough:member===target});
    });
  });
  return out;
}

// ── 味方の負傷トリガー効果一式（マナ獲得＋名前別の負傷効果）。発動したら true を返す ──
// 執念の炎：常時：このキャラクターの負傷効果は1回追加で発動する。
// 戻り値は「発動したか」ではなく「実際に発動した回数」。
// エティンのような「負傷効果が発動するたび」の効果は、執念の炎・激怒の指輪等で
// 発動回数が増えた分だけ繰り返す必要があるため、回数を呼び出し元へ返す。
async function _fireAllyInjuryEffects(unit, actualDmg){
  let firedCount=0;
  // 激怒の指輪：常時：味方の負傷効果は1回追加で発動する。（陣営全体）
  const injuryRepeats=1+_unitEffectPanelCount(unit,'執念の炎')+_ringCount('激怒の指輪')+(Number(unit._effectRepeatBonus)||0);
  for(let i=0;i<injuryRepeats;i++){
    let firedThisRound=false;
    if(unit.manaOnInjury){ _gainMana(unit.manaOnInjury,unit); firedThisRound=true; }
    // ミノタウロス等「直ちに攻撃する」負傷効果は、攻撃が完全に終わるまで他の処理より優先して
    // 待つ必要があるためawaitする（呼び出し元のapplyDamageBatch側も直列にawaitしている）。
    if(await _onAllyInjuredByPanel(unit,actualDmg)) firedThisRound=true;
    if(firedThisRound) firedCount++;
  }
  return firedCount;
}

// 敵側の負傷効果。味方側の負傷フックとは別経路で処理し、敵の効果だけを追加する。
async function _fireEnemyInjuryEffects(unit, actualDmg){
  if(!unit||unit.hp<=0) return 0;
  const hasName=name=>_unitHasEffectName(unit,name);
  let fired=0;
  if(hasName('鉄の拳"フォルニョート"')){
    _addBattleStats(unit,3,1,'enemy');
    log(`${_lc(unit.name,true)}の負傷効果で+3/+1を得た。`,'bad');
    fired++;
  }
  if(hasName('残響の魔導師"アバドン"')){
    const target=_pickRandomEnemyTargets(G.allies,unit)[0];
    if(target){
      playDamageEffectSfx('single');
      await applyDamageBatch([{unit:target,side:'ally',amount:3,source:unit}],{source:unit,effect:true});
      log(`${_lc(unit.name,true)}の負傷効果で${_lc(target.name,false)}に3ダメージを与えた。`,'bad');
    }
    fired++;
  }
  if(hasName('波の娘"ラン・ドーター"')){
    for(let i=0;i<2;i++) await _spawnEnemyUnitByName('黒ケルピー',1,3,true,unit);
    log(`${_lc(unit.name,true)}の負傷効果で「黒ケルピー」を2体召喚した。`,'bad');
    fired++;
  }
  if(hasName('咬竜"グレイプニル"')){
    const target=_pickRandomEnemyTargets(G.allies,unit)[0];
    if(target&&unit.hp>0){
      if(_hasAttackEffectsForPause(unit)) unit._attackEffectPending=true;
      await _dealAttackDamageWithMutual(unit,true,target,G.allies.indexOf(target),Math.max(0,unit.atk||0));
      log(`${_lc(unit.name,true)}の負傷効果で直ちに攻撃した。`,'bad');
    }
    fired++;
  }
  if(hasName('夜刻の巫女"ウムブラ"')){
    (G.enemies||[]).filter(_canReceiveBattleEffect).forEach(a=>_addBattleStats(a,8,8,'enemy'));
    log(`${_lc(unit.name,true)}の効果で全ての味方は+8/+8を得た。`,'bad');
    fired++;
  }
  return fired;
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

// マータ：常時：味方が受ける2以上のダメージの半分を代わりに受ける。
// applyDamageBatch()に渡す前のエントリ段階で振り分けることで、VFX・死亡処理を含む
// 通常のダメージパイプラインにマータ自身へのダメージも自然に乗せる。
function _splitEntriesForMata(entries){
  const out=[];
  (entries||[]).forEach(e=>{
    if(!e||!e.unit||!(e.amount>0)){ out.push(e); return; }
    const side=e.side||_damageSideOf(e.unit);
    if(side==='ally'&&e.amount>=2&&e.unit.name!=='マータ'){
      const mata=(G.allies||[]).find(a=>a&&a.hp>0&&a.name==='マータ'&&a!==e.unit);
      if(mata&&!_isSealed(mata)&&e.unit.shield<=0){
        // マータが受けるのは「半分」だけ。対象を生存させるために
        // 肩代わり量を最大化すると、2ダメージを全てマータが受けることがある。
        const redirected=Math.floor((Number(e.amount)||0)/2);
        if(!redirected){
          out.push(e);
          return;
        }
        const remain=e.amount-redirected;
        log(`マータの効果でダメージの半分（${redirected}）を代わりに受けた。`,'good');
        _playCardEffectSfx('C002');
        out.push({...e,amount:remain,_effectVfxCode:'C002',_effectVfxTarget:e.unit,_effectVfxRect:_captureUnitDamageRect(e.unit,'ally')});
        out.push({...e,unit:mata,side:'ally',amount:redirected});
        return;
      }
    }
    out.push(e);
  });
  return out;
}
async function applyDamageBatch(entries, options){
  const opt=options||{};
  const prepared=_splitEntriesForUnite(_splitEntriesForMata(entries))
    .filter(e=>e&&e.unit&&e.unit.hp>0&&!_isSealed(e.unit)&&e.amount>0)
    .map(e=>{
      const side=e.side||_damageSideOf(e.unit);
      return {...e,side,rect:e.rect||_captureUnitDamageRect(e.unit,side)};
    })
    .filter(e=>e.side);
  if(!prepared.length) return [];

  // 全対象のHP減少を先に確定する（この時点ではまだ死亡処理・盤面詰め直しを行わない）
  const results=prepared.map(e=>({
    // 武器破壊は「攻撃」でのみ発動する。反撃（_counterDamage）は攻撃に含めない。
    ..._applyDamageState(e.unit,e.amount,e.source||opt.source,e.side,e._skipTough,!!opt.normalAttack&&!e._counterDamage),
    rect:e.rect,
    attackSfxSource:e.attackSfxSource||opt.attackSfxSource||null,
    // opt.effect：通常攻撃ではなくキャラクター固有の効果によるダメージであることを示す。
    // その場合のみ、ダメージ源キャラクター専用のヒットVFX（CXXX.mp4）を探す対象にする。
    effectSource:opt.effect?(e.source||opt.source||null):null,
    // opt.keywordEffect：毒等キーワードの発動によるダメージであることを示すキーワード名。
    // キーワード専用のヒットVFX（KXXX.mp4）を探す対象にする。
    keywordEffect:opt.keywordEffect||null,
    effectVfxCode:e._effectVfxCode||null,
    effectVfxTarget:e._effectVfxTarget||null,
    effectVfxRect:e._effectVfxRect||null,
    counterDamage:e._counterDamage===true
  }));
  if(opt.keywordEffect==='毒'&&typeof _recordRunStatsDamage==='function'){
    results.forEach(r=>_recordRunStatsDamage(r.actualDmg,'毒'));
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
  await Promise.all(damaged.map(r=>{
    try{
      const vfxOptions={...(opt.vfxOptions||{}),effectSource:r.effectSource,keywordEffect:r.keywordEffect};
      if(r.rect&&typeof playHitVfxAtRect==='function') return Promise.resolve(playHitVfxAtRect(r.rect,r.actualDmg,vfxOptions)).catch(()=>{});
      if(typeof playHitVfx==='function') return Promise.resolve(playHitVfx(r.side,r.unit,r.actualDmg,vfxOptions)).catch(()=>{});
    }catch(e){
      console.error('[applyDamageBatch VFX]',e);
    }
    return Promise.resolve();
  }));
  await Promise.all(damaged.filter(r=>r.effectVfxCode&&r.effectVfxRect).map(r=>
    Promise.resolve(playHitVfxAtRect(r.effectVfxRect,0,{
      effectSource:_effectVfxSource(r.effectVfxCode),gateMs:180,hitDuration:900,vfxScale:.5
    })).catch(()=>{})
  ));
  if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // VFX終了後に死亡処理を行う。HP0のカード自体はここではまだ盤面から消さない
  // （消去・詰め直しはrequestBattleCompact()経由で、モーション全体が終わってから一度だけ行う）
  const deaths=results.filter(r=>r.unit&&r.unit.hp<=0);
  if(deaths.length){
    _beginDeathCompactDelay();
    G._resolvingDamageBatchDeaths=(G._resolvingDamageBatchDeaths||0)+1;
    try{
      for(const r of deaths){
        if(r.side==='enemy') await processEnemyDeath(r.unit,G.enemies.indexOf(r.unit));
        else await processAllyDeath(r.unit);
      }
    } finally {
      G._resolvingDamageBatchDeaths=Math.max(0,(G._resolvingDamageBatchDeaths||0)-1);
      _endDeathCompactDelay();
    }
  }

  // 味方の負傷効果（ミノタウロス「直ちに攻撃する」等）は、このバッチの演出・死亡処理が
  // 全て確定した後に対象ごとawaitしながら直列で発動する。呼び出し元（攻撃元の攻撃完了処理等）
  // に制御を戻す前に完全に終わらせることで、他のキャラクターの処理と競合しないようにする。
  const injuredAllies=results.filter(r=>r.needsAllyInjuryEffects&&r.unit&&r.unit.hp>0);
  for(const r of injuredAllies){
    _bumpEtinOnAllyInjuryEffect(await _fireAllyInjuryEffects(r.unit,r.actualDmg));
  }
  if(injuredAllies.length&&typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
  const injuredEnemies=results.filter(r=>r.needsEnemyInjuryEffects&&r.unit&&r.unit.hp>0);
  for(const r of injuredEnemies) await _fireEnemyInjuryEffects(r.unit,r.actualDmg);
  if(injuredEnemies.length&&typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
  return results;
}

async function _consumeAttackEffectPause(unit,isEnemySide,target){
  if(!unit||!unit._attackEffectPending||unit.hp<=0) return;
  unit._attackEffectPending=false;
  unit._currentAttackTarget=target||null;
  _applyGremlinAttackSwap(unit,target,isEnemySide);
  try{
    await _applyAttackEffectsForSide(unit,isEnemySide);
    await _flushRingManaThresholdEffects();
  }finally{
    delete unit._currentAttackTarget;
  }
}

async function _resolveAttackEffectsAtImpact(attacker,isEnemySide,target,result){
  await _consumeAttackEffectPause(attacker,isEnemySide,target);
  result.attackerDiedBeforeContact=!attacker||attacker.hp<=0;
  result.targetDiedBeforeContact=!target||target.hp<=0;
  return (result.attackerDiedBeforeContact||result.targetDiedBeforeContact)?{abort:true}:null;
}

function _isArassusPreDamageAttack(unit){
  if(!unit||!unit._attackEffectPending) return false;
  const text=String(unit.desc||unit.effectText||unit.effect||'');
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

async function _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage){
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
  if(damage>0&&typeof playSfx==='function'){
    playSfx('attack',{group:'combat',guardKey:'combat:attack'});
  }
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
      await playAttackMotion(attacker,actualTarget,true,onImpact,{stopRatio:.25,firstDuration:260,secondDuration:360,returnDuration:420,
        onHit:()=>_shakeOnAttackContact(actualTarget,damage)});
    } else {
      await _consumeAttackEffectPause(attacker,true,actualTarget);
    }
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
    result.contacted=damage>0;
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
    await playAttackMotion(attacker,target,false,onImpact,{stopRatio:.25,firstDuration:260,secondDuration:360,returnDuration:420,
      onHit:()=>_shakeOnAttackContact(target,damage)});
  } else {
    await _consumeAttackEffectPause(attacker,false,target);
  }
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
  result.contacted=damage>0;
  return result;
}
// ラミア：攻撃：対象のキャラクターの攻撃力がこのキャラクターより低い場合、そのキャラクターを仲間にする。
function _applyLamiaCaptureIfEligible(attacker,target){
  if(!attacker||attacker.hp<=0||attacker.name!=='ラミア') return;
  if(!target||target.hp<=0||!G.enemies.includes(target)) return;
  if((target.atk||0)>=(attacker.atk||0)) return;
  const ei=G.enemies.indexOf(target);
  G.enemies[ei]=null;
  target.lane='front';
  // ラミアで仲間にしたキャラクターはメイン置き場由来ではない一時的な仲間のため、
  // 報酬フェイズ突入時・敗北時に取り除く対象として印を付けておく
  target._lamiaCaptured=true;
  const placed=_summonMidBattleAllyFront(target,false,{rightOf:attacker})>=0;
  if(placed){
    log(`${_lc(attacker.name,false)}の効果で${_lc(target.name,true)}を仲間にした。`,'good');
    requestBattleCompact();
  } else {
    G.enemies[ei]=target;
  }
}
// ラミアで一時的に仲間にしたキャラクターを、報酬フェイズ突入時・敗北時に取り除く
function _removeLamiaCapturedUnits(){
  if(!Array.isArray(G.allies)) return;
  G.allies=G.allies.map(a=>a&&a._lamiaCaptured?null:a);
}

async function _dealCounterDamage(attacker,defender,isEnemySide,amount){
  if(!(amount>0)) return;
  if(isEnemySide){
    await applyDamageBatch([{unit:attacker,side:'enemy',amount,source:defender,attackSfxSource:defender,_counterDamage:true}],{normalAttack:true});
  } else {
    await applyDamageBatch([{unit:attacker,side:'ally',amount,source:defender,attackSfxSource:defender,_counterDamage:true}],{normalAttack:true});
  }
  const defenderList=isEnemySide?G.allies:G.enemies;
  const attackerList=isEnemySide?G.enemies:G.allies;
  log(`${_lc(_battleLogName(defender,defenderList),!isEnemySide)}が${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${amount}ダメージを与えた。`,isEnemySide?'good':'bad');
}

async function _dealAttackDamageWithMutual(attacker,isEnemySide,target,targetIdx,damage){
  if(!attacker||!target) return null;
  // 接触攻撃＋反撃を含む一連の演出が完全に終わるまで、盤面詰め直し・renderAll()を遅延させる
  beginBattleMotion();
  try{
    if(attacker.hp<=0) return null;
    const attackResult=await _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage);
    const defender=attackResult?.actualTarget||target;
    if(!attackResult?.contacted||attacker.hp<=0||!defender||defender.hp<=0){
      return attackResult;
    }
    if(isEnemySide) await _onEnemySideAttack(attacker);
    // 攻撃・反撃を「同じ接触で同時に成立する相互ダメージ」として扱う。反撃の可否・値は
    // ダメージ適用前（接触直前）の状態でスナップショットし、攻撃で倒れたことを理由に反撃を
    // 取り消さない。先制は攻撃側が相手を仕留めた場合のみ反撃を免除する（相手も先制を持つ場合は無効）。
    // 狙撃は反撃されず、反撃もできない。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制')&&!_unitHasKeyword(defender,'先制');
    const suppressCounterBySniper=_unitHasKeyword(attacker,'狙撃')||_unitHasKeyword(defender,'狙撃');
    const counterAmount=(_unitHasKeyword(attacker,'大盾')&&(Number(defender.atk)||0)<(Number(attacker.atk)||0))
      ?0:Math.max(0,defender.atk||0);
    const defenderSide=isEnemySide?'ally':'enemy';
    const attackerSide=isEnemySide?'enemy':'ally';
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

async function _dealMultiAttackDamageWithMutual(attacker,isEnemySide,primaryTarget,targets,damage){
  if(!attacker||attacker.hp<=0||!primaryTarget||primaryTarget.hp<=0) return null;
  // 接触攻撃＋反撃を含む一連の演出が完全に終わるまで、盤面詰め直し・renderAll()を遅延させる
  beginBattleMotion();
  try{
    if(attacker.hp<=0) return null;
    const result={contacted:false,targetDiedBeforeContact:false,attackerDiedBeforeContact:false,actualTarget:primaryTarget};
    if(damage>0&&typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:'combat:attack'});
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
      await playAttackMotion(attacker,primaryTarget,isEnemySide,onImpact,{stopRatio:.25,firstDuration:260,secondDuration:360,returnDuration:420});
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

    // 接触直前（ダメージ適用前）に生存していた対象のみ攻撃対象とする
    const seen=new Set();
    const side=isEnemySide?'ally':'enemy';
    const liveTargets=(targets||[])
      .filter(t=>t&&t.hp>0&&!seen.has(t.id)&&!t._isObject&&!t._isSoul)
      .map(t=>{ seen.add(t.id); return t; });
    const entries=liveTargets.map(t=>({unit:t,side,amount:damage,source:attacker,attackSfxSource:attacker}));
    result.contacted=damage>0&&entries.length>0;
    if(isEnemySide&&result.contacted) await _onEnemySideAttack(attacker);

    // 反撃は本来の攻撃対象（primaryTarget）からのみ発生する。全体攻撃／三方向攻撃で追加ダメージを
    // 受けた他のキャラクターは反撃しない。反撃可否・値はダメージ適用前にスナップショットし、
    // このヒットで倒れたことを理由に反撃を取り消さない。先制は攻撃側が相手を仕留めた場合のみ反撃を免除する
    // （相手も先制を持つ場合は無効）。狙撃は反撃されず、反撃もできない。
    const attackerHasFirstStrike=_unitHasKeyword(attacker,'先制')&&!_unitHasKeyword(primaryTarget,'先制');
    const suppressBySniper=_unitHasKeyword(attacker,'狙撃')||_unitHasKeyword(primaryTarget,'狙撃');
    // 複数対象攻撃でも先制時は主対象への実ダメージ確定後にだけ反撃可否を判断する。
    if(attackerHasFirstStrike&&!suppressBySniper){
      await applyDamageBatch(entries,{normalAttack:true});
      const counterAmount=primaryTarget.hp>0&&attacker.hp>0&&!(
        _unitHasKeyword(attacker,'大盾')&&(Number(primaryTarget.atk)||0)<(Number(attacker.atk)||0)
      )?Math.max(0,primaryTarget.atk||0):0;
      if(counterAmount>0){
        const attackerSide=isEnemySide?'enemy':'ally';
        await applyDamageBatch([{unit:attacker,side:attackerSide,amount:counterAmount,source:primaryTarget,attackSfxSource:primaryTarget,_counterDamage:true}],{normalAttack:true});
        const attackerList=isEnemySide?G.enemies:G.allies;
        log(`反撃で${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
      }
      return result;
    }
    const primaryCanCounter=liveTargets.includes(primaryTarget)&&!suppressBySniper;
    const counterAmount=primaryCanCounter&&(!(_unitHasKeyword(attacker,'大盾')&&(Number(primaryTarget.atk)||0)<(Number(attacker.atk)||0)))
      ?Math.max(0,primaryTarget.atk||0):0;
    const attackerSide=isEnemySide?'enemy':'ally';
    if(counterAmount>0){
      entries.push({unit:attacker,side:attackerSide,amount:counterAmount,source:primaryTarget,attackSfxSource:primaryTarget,_counterDamage:true});
    }
    await applyDamageBatch(entries,{normalAttack:true});
    if(counterAmount>0){
      const attackerList=isEnemySide?G.enemies:G.allies;
      log(`反撃で${_lc(_battleLogName(attacker,attackerList),isEnemySide)}に${counterAmount}ダメージを与えた。`,isEnemySide?'good':'bad');
    }
    return result;
  } finally {
    endBattleMotion();
  }
}

async function _applyPoisonBeforeAttack(unit){
  if(!unit||unit.hp<=0||_isSealed(unit)||!(unit.poison>0)) return;
  const dmg=unit.poison;
  const side=(G.enemies||[]).includes(unit)?'enemy':((G.allies||[]).includes(unit)?'ally':null);
  if(!side) return;
  log(`${_lc(unit.name,G.enemies.includes(unit))}が毒で${dmg}ダメージを受けた。`,G.enemies.includes(unit)?'bad':'good');
  if(typeof playSfx==='function') playSfx('poison',{group:'combat'});
  await applyDamageBatch([{unit,side,amount:dmg,source:null}],{keywordEffect:'毒'});
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

function _panelName(panel){ return String(panel?.name||'').trim(); }

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

function _forEachUnitPanel(unit, fn){
  const eq=Array.isArray(unit?.equipment)?unit.equipment:[];
  eq.forEach((panel,idx)=>{ if(panel) fn(panel,idx); });
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
  const enh={atk:0,hp:0,keywords:[],abilities:[],strategyCount:0,weakenOnHit:0,manaOnAttack:0,manaThresholds:[],effectNames:[],effectScales:{},releaseAtkBonus:0,releaseHpBonus:0};
  const panels=_collectEnhancementPanelsForSlot(unit,slotIdx);
  const effectivePanel=entry=>{
    const panel=entry.panel;
    if(!panel||panel.name!=='複製') return panel;
    return panels.find(other=>other.idx!==entry.idx&&other.panel&&other.panel.name!=='複製')?.panel||panel;
  };
  panels.forEach(entry=>{
    const panel=effectivePanel(entry);
    if(!panel) return;
    enh.atk+=panel.adjacentAtkBonus||0;
    enh.hp+=panel.adjacentHpBonus||0;
    enh.releaseAtkBonus=Math.max(enh.releaseAtkBonus,Number(panel.releaseAtkBonus)||0);
    enh.releaseHpBonus=Math.max(enh.releaseHpBonus,Number(panel.releaseHpBonus)||0);
    enh.manaOnAttack+=panel.manaOnAttack||0;
    if(panel.manaCost){
      enh.manaThresholds.push({cost:Number(panel.manaCost)||0,repeat:!!panel.manaRepeat,desc:String(panel._manaThresholdDesc||panel.desc||'').replace(/^\d+マナ(?:毎)?[:：]\s*/,'')});
    }
    if(panel._resonanceEffectName){
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
    const cardNames=new Set(['封印されしもの','禁断の力','武器破壊','団結','共振','遺志','熟練','戦術','大盾','策士']);
    const keywordCount=new Set([...(typeof _unitPanelKeywords==='function'?_unitPanelKeywords(unit):unit.keywords||[]),...(enh.keywords||[])]
      .map(k=>String(k||'').trim().replace(/\d+$/,''))
      .filter(k=>k&&!cardNames.has(k))).size;
    enh.atk+=keywordCount*2*enh.strategyCount;
    enh.hp+=keywordCount*2*enh.strategyCount;
  }
  return enh;
}

function refreshUnitPanelEffects(unit){
  if(!unit||unit.hp<=0) return;
  const slot=Number.isInteger(unit._mainBoardSlot)?unit._mainBoardSlot:0;
  const board=typeof _getPartyBoardUnit==='function'?_getPartyBoardUnit():unit;
  _applyAdjacentPanelEnhancements(unit,_collectAdjacentEnhancements(board,slot));
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
  unit._releaseAtkBonus=0;
  unit._releaseHpBonus=0;
  delete unit._adjacentPanelEnhancements;
  delete unit._adjacentPanelAbilities;
  delete unit._adjacentPanelStrategyCount;
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
  const cardNames=new Set(['封印されしもの','禁断の力','武器破壊','団結','共振','遺志','熟練','戦術','大盾','策士']);
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
  const sig=JSON.stringify({atk:atkBonus,hp:hpBonus,keywords:[...enhancementKeywords].sort(),abilities:[...abilities].sort(),strategyCount,releaseAtkBonus,releaseHpBonus,weakenOnHit:enh.weakenOnHit||0,manaOnAttack:enh.manaOnAttack||0,manaThresholds:enh.manaThresholds||[],effectNames:[...(enh.effectNames||[])].sort(),effectScales:enh.effectScales||{}});
  if(unit._adjacentPanelSignature===sig) return;
  _clearAdjacentPanelEnhancements(unit);
  unit._adjacentPanelSignature=sig;
  unit._adjacentPanelEnhancements={atk:atkBonus,hp:hpBonus,keywords:[...enhancementKeywords],releaseAtkBonus,releaseHpBonus,weakenOnHit:enh.weakenOnHit||0,manaOnAttack:enh.manaOnAttack||0,manaThresholdAdded:false};
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
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,max-frontSlots));
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
function _colorLabel(key){
  return {red:'赤',blue:'青',green:'緑',yellow:'黄',purple:'紫'}[key]||key;
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
function _rightNeighborAlly(unit){
  const order=_allyFrontOrder();
  const idx=order.indexOf(unit);
  if(idx<0||idx>=order.length-1) return null;
  return order[idx+1];
}
function _leftNeighborAlly(unit){
  const order=_allyFrontOrder();
  const idx=order.indexOf(unit);
  if(idx<=0) return null;
  return order[idx-1];
}

// ── 効果によるアドホックな味方召喚（例：センチネルの「赤ゴーレム」、スケルトンキングの「青スケルトン」）──
// 色が付いた名前（例：「赤ゴーレム」）は色部分を色分類に、残りを実際のキャラクター名として扱う。
// 召喚されるキャラクターは「オリジナル」でなければならない：プレイヤーがメイン置き場に同名の
// キャラクターパネルを所持していれば、そのインスタンス（隣接する強化パネルの効果を含む）を
// そのまま召喚する。所持していない場合のみ、PANEL_POOLの基礎値＋色別永続強化にフォールバックする。
async function _spawnAdhocAllyUnit(name, atk, hp, isEnemySide, placement){
  const m=String(name||'').match(/^([赤青緑黄紫])(.+)$/);
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
      const summoned=_makePanelSummonUnit({...spec,panelName:panel.name},[]);
      _applyAdjacentPanelEnhancements(summoned,enh);
      summoned._mainBoardSlot=ownedIdx;
      // 寄与している強化パネルの効果全文（キーワード以外）も戦闘中の説明文に表示されるよう、
      // applyNewPanelBattleStart()と同様に複製して引き継ぐ
      if(contributingPanels.length){
        summoned.equipment=_panelSummonDisplayEquipment(panel,contributingPanels);
      }
      const placedIdx=_summonMidBattleAllyFront(summoned,isEnemySide,placement);
      if(placedIdx>=0){
        await _afterPanelSummon(summoned,isEnemySide);
        if(!(placement&&placement.deferCompact)) requestBattleCompact();
      }
      return placedIdx>=0?summoned:null;
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
  if(placedIdx>=0){
    await _afterPanelSummon(unit,isEnemySide);
    if(!(placement&&placement.deferCompact)) requestBattleCompact();
  }
  return placedIdx>=0?unit:null;
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
  if(idx<0) return null;
  await _afterPanelSummon(e,!!isEnemySide);
  requestBattleCompact();
  return e;
}

async function _spawnRandomEnemyBoss(source){
  const excluded=['万象の揺り籠','刻を織る者','日刻の巫女','夜刻の巫女'];
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
  if(srcUnit&&String(srcUnit.color||'')==='緑'){
    const lamiaCount=(G.allies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&u.name==='マーメイド').length;
    if(lamiaCount) n+=lamiaCount;
  }
  const sourceName=source&&typeof source==='object'?source.name:source;
  G.mana=_ensureMana()+n;
  log(`${sourceName?_lc(sourceName,false):'マナ'}の効果でマナを${n}つ獲得した。`,'good');
  if(typeof renderManaHud==='function') renderManaHud();
  if(!G._deferManaThresholdEffects){
    _checkManaCostSpells();
    // 同時に複数のマナ効果が予約されても、必ず盤面優先順で直列処理する。
    G._manaUnitEffectQueue=(G._manaUnitEffectQueue||Promise.resolve())
      .then(()=>_checkManaThresholdUnitEffects())
      .catch(e=>console.error('[mana unit effects]',e));
    _queueRingManaThresholdEffects();
  }
  _recomputeDynamicPanelStats();
}
function _queueRingManaThresholdEffects(){
  if(!_hasRingNamed('嵐の指輪')) return;
  G._ringManaEffectPromise=(G._ringManaEffectPromise||Promise.resolve())
    .then(()=>_checkRingManaThresholdEffects())
    .catch(e=>console.error('[ring mana effects]',e));
}
async function _flushRingManaThresholdEffects(){
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
  if(!unit) return;
  // 蘇生したら死亡演出のフラグを戻す。残したままだと、次に倒れたとき演出が出ない。
  delete unit._deathFxDone;
  const baseAtk=Math.max(0,Number(unit.baseAtk??unit.atk)||0);
  const baseHp=Math.max(1,Number(unit.maxHp??unit.baseHp??unit.hp)||1);
  const nextAtk=Math.max(0,Math.floor(baseAtk/2));
  const nextHp=Math.max(1,Math.floor(baseHp/2));
  unit.atk=nextAtk;
  unit.baseAtk=nextAtk;
  unit.maxHp=nextHp;
  unit.hp=nextHp;
  unit._panelSummoned=true;
  // 戦闘中に召喚される（蘇生も含む）キャラクターは必ず前衛に置く。
  unit.lane='front';
  _afterPanelSummon(unit,isEnemySide);
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
async function _afterPanelSummon(unit,isEnemySide,isInitialDeploy){
  if(!unit) return;
  if(!isInitialDeploy) _applyRingPassiveBuffToSummonedUnit(unit,isEnemySide);
  if(!isInitialDeploy) _applyItemPassiveToUnit(unit,isEnemySide);
  if(isEnemySide) return;
  // ヘルナイトの「戦闘中に召喚された味方に生贄を付与する」は、開戦時のパネルからの通常出撃
  // （isInitialDeploy）ではなく、戦闘中に実際に発生した召喚（死亡・復活・効果による召喚等）にのみ適用する。
  if(!isInitialDeploy&&(G.allies||[]).some(a=>a&&a.hp>0&&!_isSealed(a)&&a.name==='ヘルナイト')&&!_unitHasSacrifice(unit)){
    unit.keywords=[...(unit.keywords||[]),'生贄'];
    log(`${_lc(unit.name,false)}はヘルナイトの効果で生贄を得た。`,'good');
  }
  // 光の指輪：常時：戦闘中に召喚される味方は結界1を得る。（開戦時の通常出撃は対象外）
  if(!isInitialDeploy&&_hasRingNamed('光の指輪')){
    unit.keywords=[...(unit.keywords||[]),'結界1'];
    // キーワードだけではダメージ判定に使う実シールド値へ反映されないため、
    // 召喚直後に既存の結界と合算して実値も同期する。
    unit.shield=Math.max(Number(unit.shield)||0,_unitShieldValue(unit));
    if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(unit,'ally');
    log(`${_lc(unit.name,false)}は光の指輪の効果で結界1を得た。`,'good');
  }
  if(!isInitialDeploy){
    G._battleSummonedAllyCount=(G._battleSummonedAllyCount||0)+1;
    const nagaCount=(G.allies||[]).filter(a=>a&&a.hp>0&&!_isSealed(a)&&a.name==='ナーガ').length;
    const nagaBonus=nagaCount*(G._battleSummonedAllyCount||0);
    if(nagaBonus>0){
      _addBattleStats(unit,nagaBonus,nagaBonus,'ally');
      log(`${_lc(unit.name,false)}はナーガの効果で+${nagaBonus}/+${nagaBonus}を得た。`,'good');
    }
    const lichCount=(G.allies||[]).filter(a=>a&&a.hp>0&&!_isSealed(a)&&a.name==='リッチ').length;
    if(lichCount&&unit.name!=='シャドウ'&&!unit._lichShadowSummon){
      for(let i=0;i<lichCount;i++){
        log('リッチの効果で「青シャドウ」を召喚した。','good');
        const shadow=await _spawnAdhocAllyUnit('青シャドウ',1,1,false,{rightOf:unit});
        if(shadow) shadow._lichShadowSummon=true;
      }
    }
  }
  // 野生の力は「召喚」効果なので、戦闘中に召喚された場合はここでマナを得る。
  // 開戦時の通常出撃（isInitialDeploy）は_applyNewOpeningEffects()側でのみ処理する。
  if(!isInitialDeploy&&!unit._openingDuplicate){
    const wild=Math.max(_unitEffectPanelCount(unit,'野生の力'),_unitKeywordCount(unit,'野生の力'));
    // 野生の力は接続しているキャラクターごとの開戦効果。合体による本体効果の
    // 追加発動や複製コピーで、同じ接続数を重複加算しない。
    if(wild) _gainMana(wild*2,unit);
  }
  // 開戦時の通常出撃（isInitialDeploy）では、まだ全キャラクターの配置・描画が完了していないため
  // ここではまだ封印解放を行わない（DOM未確定のままgetBoundingClientRect()すると位置がズレる／
  // 演出無しで即解封されてしまう）。applyNewPanelBattleStart()側で全員の配置・再描画完了後に
  // まとめて一度だけ_resolveSeals()を呼ぶ。
  if(!isInitialDeploy) await _resolveSeals();
}
// ── スペルカード：スペル置き場のカードが指定マナに達したら1戦闘1回だけ自動発動 ──
const SPELL_EFFECTS={
  fire_arrow(card){
    const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
    if(!alive.length) return;
    const minHp=Math.min(...alive.map(e=>e.hp));
    const candidates=alive.filter(e=>e.hp===minHp);
    const target=candidates[Math.floor(Math.random()*candidates.length)];
    log(`${card.name}の効果で${_lc(target.name,true)}に5ダメージを与えた。`,'good');
    playDamageEffectSfx('single');
    dealDmgToEnemy(target,5,G.enemies.indexOf(target),null);
  },
};
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
  await new Promise(r=>requestAnimationFrame(()=>r()));
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
function _checkManaCostSpells(){
  if(G._checkingManaSpells) return;
  G._checkingManaSpells=true;
  try{
    (G.spellSlots||[]).forEach(card=>{
      if(!card||!card.manaCost) return;
      while(_manaShouldFireAgain(card)){
        card._manaFireCount=(card._manaFireCount||0)+1;
        card._firedThisBattle=true;
        const effect=SPELL_EFFECTS[card.effectKey];
        if(typeof effect==='function') effect(card);
      }
    });
  }finally{
    G._checkingManaSpells=false;
    if(typeof renderHandEditor==='function') renderHandEditor();
  }
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
async function _checkManaThresholdUnitEffects(){
  // マナ効果の処理中に別の効果でマナが増える場合がある。その再入呼び出しが
  // 自分自身のPromiseを待つと永久待機になるため、外側の走査に処理を委ねて戻る。
  if(G._checkingManaUnitEffects) return;
  G._checkingManaUnitEffects=true;
  const run=(async()=>{
    // 開戦効果の途中で追加マナが発生した場合、最初の走査時点のマナだけでは
    // 到達した閾値を取りこぼすことがあるため、マナが増えなくなるまで再走査する。
    // 効果がマナを連鎖的に増やすケースにも上限を設けて無限ループを防ぐ。
    for(let pass=0;pass<10;pass++){
      const manaBeforePass=_ensureMana();
    const visit=async (unit,isEnemySide)=>{
      if(!unit||unit.hp<=0||_isSealed(unit)) return;
      if(isEnemySide&&_isUnitSilencedByScroll(unit)) return;
      const thresholds=[];
      if(Number(unit.manaCost)>0){
        const m=String(unit.desc||'').match(/^\d+マナ(?:毎)?[:：]\s*(.+)/);
        thresholds.push({owner:unit,cost:Number(unit.manaCost),repeat:!!unit.manaRepeat,desc:unit._manaThresholdDesc||(m?m[1]:'')});
      }
      (Array.isArray(unit._extraManaThresholds)?unit._extraManaThresholds:[]).forEach(threshold=>{
        if(Number(threshold&&threshold.cost)>0) thresholds.push({owner:threshold,cost:Number(threshold.cost),repeat:!!threshold.repeat,desc:String(threshold.desc||'')});
      });
      if(!thresholds.length) return;
      let fired=false;
      // 走査開始時点のマナで各効果の到達回数を固定し、効果自身が生んだマナで
      // 同じ走査中に別の閾値まで連鎖発動しないようにする。
      const manaAtStart=_ensureMana();
      for(const threshold of thresholds){
        const owner=threshold.owner;
        const progress=Math.floor(manaAtStart/threshold.cost);
        const fireLimit=threshold.repeat?progress:1;
        while(progress>(owner._manaFireCount||0)&&(owner._manaFireCount||0)<fireLimit){
          owner._manaFireCount=(owner._manaFireCount||0)+1;
          // マナの種：常時：このキャラクターのマナ効果は1回追加で発動する。
          const repeatCount=1+_unitEffectPanelCount(unit,'マナの種')+(Number(unit._effectRepeatBonus)||0);
          for(let repeat=0;repeat<repeatCount;repeat++){
            await _playManaEffectCue(unit,isEnemySide);
            await _applyManaThresholdEffectText(unit,threshold.desc,isEnemySide);
          }
          fired=true;
          // 賢者の指輪：味方の各マナ効果を追加発動する。
          if(!isEnemySide){
            const ringExtra=_ringCount('賢者の指輪');
            for(let i=0;i<ringExtra;i++){
              await _playManaEffectCue(unit,isEnemySide);
              await _applyManaThresholdEffectText(unit,threshold.desc,isEnemySide);
            }
          }
        }
      }
      if(fired) requestBattleRender();
    };
      // 同じマナ到達で発動する味方・敵の効果は、演出と処理を並列に進める。
      // 各キャラクター内部の閾値順序は維持し、別のマナ到達分だけ次の走査へ回す。
      await Promise.all([
        ...(G.allies||[]).map(u=>visit(u,false)),
        ...(G.enemies||[]).map(u=>visit(u,true)),
      ]);
      if(_ensureMana()<=manaBeforePass) break;
    }
  })();
  G._manaUnitEffectsPromise=run;
  try{
    await run;
  }finally{
    G._checkingManaUnitEffects=false;
    if(G._manaUnitEffectsPromise===run) delete G._manaUnitEffectsPromise;
  }
}

function _summonPanelUnitToFront(unit, isEnemySide){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,max-frontSlots));
  for(let i=frontSlots-1;i>=0;i--){
    if(!arr[i]||arr[i].hp<=0||arr[i]._isObject||arr[i]._isSoul){
      unit.lane='front';
      arr[i]=unit;
      return i;
    }
  }
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(!arr[i]||arr[i].hp<=0||arr[i]._isObject||arr[i]._isSoul){
      unit.lane='rear';
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
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  const sync=()=>{ for(let i=0;i<frontSlots;i++){ const u=arr[i]; if(u&&!isFree(u)) u._battleSlot=i; } };
  const place=idx=>{ unit.lane='front'; arr[idx]=unit; sync(); return idx; };
  let first=-1,last=-1;
  for(let i=0;i<frontSlots;i++){ if(!isFree(arr[i])){ if(first<0) first=i; last=i; } }
  if(first<0) return place(edge==='left'?0:frontSlots-1);
  if(edge==='left'){
    if(first>0) return place(first-1);
    let f=-1;
    for(let i=last+1;i<frontSlots;i++){ if(isFree(arr[i])){ f=i; break; } }
    if(f<0) return -1;
    for(let i=f;i>0;i--) arr[i]=arr[i-1];
    return place(0);
  }
  if(last<frontSlots-1) return place(last+1);
  let f=-1;
  for(let i=first-1;i>=0;i--){ if(isFree(arr[i])){ f=i; break; } }
  if(f<0) return -1;
  for(let i=f;i<frontSlots-1;i++) arr[i]=arr[i+1];
  return place(frontSlots-1);
}

function _summonMidBattleAllyFront(unit, isEnemySide, placement){
  // 「前衛の両端へ」のように置き場所が決まっている召喚は専用の配置に回す。
  if(placement&&placement.frontEdge) return _summonMidBattleFrontEdge(unit,isEnemySide,placement.frontEdge);
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);

  // 空き扱いにできる枠（未使用・戦闘不能・オブジェクト・ソウル）。
  const isFree=u=>!u||u.hp<=0||u._isObject||u._isSoul;
  // 置いた位置を_battleSlotへ書き戻す。compactBattleUnits()は_battleSlotを持つユニットだけを
  // その枠へ固定し、持たないユニットは行の中央へ寄せ直す。召喚したユニットに_battleSlotが
  // 無いと、直後のrequestBattleCompact()で中央へ動かされ「効果元の左に出る」「戦闘中に
  // 並び順が入れ替わる」ことになる。挿入で他のユニットもずれるため、前衛全体を振り直す。
  const syncFrontSlots=()=>{
    for(let i=0;i<frontSlots;i++){
      const u=arr[i];
      if(u&&!isFree(u)) u._battleSlot=i;
    }
  };

  // 戦闘中の召喚は前衛へ置く。前衛の効果元だけは右隣への挿入を優先し、
  // 後衛の効果元からの召喚は前衛右端へ回す（後衛には置かない）。
  const source=placement&&placement.rightOf;
  if(source){
    const sourceIdx=arr.indexOf(source);
    const sourceIsRear=(source.lane||'front')==='rear';
    if(!sourceIsRear&&sourceIdx>=0){
      // ① 効果元より右に空きがあれば、間の味方を右へ1つずつ寄せて右隣へ挿入する。
      let empty=-1;
      for(let i=sourceIdx+1;i<frontSlots;i++){
        if(isFree(arr[i])){ empty=i; break; }
      }
      if(empty>=0){
        for(let i=empty;i>sourceIdx+1;i--) arr[i]=arr[i-1];
        unit.lane='front';
        arr[sourceIdx+1]=unit;
        syncFrontSlots();
        return sourceIdx+1;
      }
      // ② 右が埋まりきっている場合は、左の空きを使って効果元までを左へ1つ寄せ、
      //    空いた効果元の位置へ置く（＝結果として効果元の右隣になる）。
      //    ここで単に左の空き枠へ置くと「効果元の左に召喚される」「並び順が入れ替わる」ため。
      let leftEmpty=-1;
      for(let i=sourceIdx-1;i>=0;i--){
        if(isFree(arr[i])){ leftEmpty=i; break; }
      }
      if(leftEmpty>=0){
        for(let i=leftEmpty;i<sourceIdx;i++) arr[i]=arr[i+1];
        unit.lane='front';
        arr[sourceIdx]=unit;
        syncFrontSlots();
        return sourceIdx;
      }
      // 前衛に空きが1つも無ければ召喚しない（後衛へは溢れさせない）。
      return -1;
    }
  }

  // 指輪など、効果元の位置を持たない召喚は一番右の空き枠へ置く。
  for(let i=frontSlots-1;i>=0;i--){
    if(isFree(arr[i])){
      unit.lane='front';
      arr[i]=unit;
      syncFrontSlots();
      return i;
    }
  }
  return -1;
}

function _summonPanelUnitToRear(unit, isEnemySide){
  const arr=isEnemySide?G.enemies:G.allies;
  const max=isEnemySide?(MAX_ENEMIES||14):(MAX_ALLIES||14);
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,max-frontSlots));
  for(let i=frontSlots+rearSlots-1;i>=frontSlots;i--){
    if(!arr[i]||arr[i].hp<=0||arr[i]._isObject||arr[i]._isSoul){
      unit.lane='rear';
      arr[i]=unit;
      return i;
    }
  }
  return -1;
}

function _battleSlotForMainBoardSlot(idx,toRear){
  const max=MAX_ALLIES||14;
  const frontSlots=Math.min(ENEMY_FRONT_SLOTS||7,max);
  const rearSlots=Math.min(ENEMY_REAR_SLOTS||3,Math.max(0,max-frontSlots));
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
  const pendingResonanceColors=[];
  // メイン置き場①〜⑦の物理位置がそのまま出撃順を決める。前衛①②③④、後衛⑤⑥⑦。
  // _summonPanelUnitToFront/Rearは各レーンの右詰めで配置するため、並び順の先頭が左端に来るよう逆順で召喚する
  const deploySlotGroup=async(slots,toRear)=>{
    for(let oi=slots.length-1;oi>=0;oi--){
      const idx=slots[oi];
      const panel=equip[idx];
      if(!panel) continue;
      const spec=_panelSummonSpec(panel);
      if(!spec) continue;
      const panelPower=_mapPanelPowerAt(idx);
      if(panelPower==='eternal'){
        // 永劫の力は、戦闘開始のたびにカード本体へ+1/+1を永久付与する。
        // 基礎値から再構成せず、現在のカード値へ累積することで次戦闘以降にも残す。
        panel.power=(Number(panel.power??panel.atk??0)||0)+1;
        panel.life=(Number(panel.life??panel.hp??1)||1)+1;
        if(panel.atk!=null) panel.atk=panel.power;
        if(panel.hp!=null) panel.hp=panel.life;
        spec.atk=panel.power;
        spec.hp=panel.life;
      }
      if(panelPower==='duplicate') spec.count=(spec.count||1)+1;
      if(panelPower==='resonance') pendingResonanceColors.push(String(panel.color||''));
      const enh=_collectAdjacentEnhancements(board,idx);
      const contributingPanels=typeof _collectEnhancementPanelsForSlot==='function'?_collectEnhancementPanelsForSlot(board,idx):[];
      const openingCopyExtra=(spec.count||1)>1
        ?_panelEffectKeywordCount(contributingPanels,'恩寵')
        :0;
      for(let n=0;n<(spec.count||1)+openingCopyExtra;n++){
        // enh.keywordsは直後のapplyAdjacentPanelEnhancements()側で付与するため、ここでは渡さない
        // （両方に渡すと同じキーワードが二重に加算され、逆襲・闇の儀式等のカウント依存効果が
        // 意図した回数より多く発動してしまう）
        const summoned=_makePanelSummonUnit({...spec,panelName:panel.name},[]);
        if(n>0&&panelPower==='duplicate') summoned._openingDuplicate=true;
        _applyAdjacentPanelEnhancements(summoned,enh);
        summoned._mainBoardSlot=idx;
        summoned._battleSlot=_battleSlotForMainBoardSlot(idx,toRear);
        // コピー召喚先にも強化カードの効果全文がフロー表示されるよう、寄与している強化パネルを複製して引き継ぐ
        if(contributingPanels.length){
          summoned.equipment=_panelSummonDisplayEquipment(panel,contributingPanels);
        }
        const placed=toRear?_summonPanelUnitToRear(summoned,false):_summonPanelUnitToFront(summoned,false);
        if(placed>=0){
          // 1枚目は通常出撃、複製分は「戦闘中に召喚された」扱いにする。
          // ツインデビル等のコピーでもリッチ等の召喚時効果を確実に完了させる。
          await _afterPanelSummon(summoned,false,n===0);
          log(`${panel.name}が${_lc(summoned.name,false)}を召喚した。`,'good');
        }
      }
    }
  };
  const frontSlots=(typeof MAIN_BOARD_FRONT_SLOTS!=='undefined'&&MAIN_BOARD_FRONT_SLOTS)||[1,3];
  const rearSlots=(typeof MAIN_BOARD_REAR_SLOTS!=='undefined'&&MAIN_BOARD_REAR_SLOTS)||[10,12,14];
  const baseDeploy=new Set([...frontSlots,...rearSlots]);
  const poweredSlots=Object.keys(G.mapPanelPowers||{})
    .map(n=>parseInt(n,10))
    .filter(idx=>Number.isInteger(idx)&&idx>=0&&idx<equip.length&&!baseDeploy.has(idx)&&_mapPanelPowerAt(idx));
  await deploySlotGroup(frontSlots,false);
  await deploySlotGroup(rearSlots,true);
  await deploySlotGroup(poweredSlots.filter(idx=>idx<10),false);
  await deploySlotGroup(poweredSlots.filter(idx=>idx>=10),true);
  pendingResonanceColors.forEach(color=>{
    if(!color) return;
    (G.allies||[]).forEach(u=>{
      if(!u||u.hp<=0||u.color!==color) return;
      u.atk=Math.max(0,(u.atk||0)+3);
      u.baseAtk=Math.max(0,(u.baseAtk||0)+3);
      addUnitHp(u,3,'ally');
    });
  });
  (G.allies||[]).forEach(u=>{
    if(!u||u.hp<=0||!Number.isInteger(u._mainBoardSlot)) return;
    _applyAdjacentPanelEnhancements(u,_collectAdjacentEnhancements(board,u._mainBoardSlot));
  });
  compactBattleUnits();
  // 全キャラクターの配置が確定したのでここで一度描画し、封印解放等のVFXが正しい座標
  // （getBoundingClientRect）を取得できるようDOMのレイアウト確定を待つ。
  if(typeof renderAll==='function') renderAll();
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,50)));
  if(deferOpeningEffects) return;
  await _finishNewPanelBattleStartEffects();
}

async function _finishNewPanelBattleStartEffects(){
  // 常時効果（指輪の色+10/+10等）はいかなるときも最優先されるため、タイタン等の開戦効果や
  // 封印解放より前に、カード配置完了後のこの時点で適用する。
  _applyRingPassiveBattleStartEffects();
  await _applyItemPassiveBattleStartEffects();
  // タイタン：開戦：全ての敵に弱体1を与える。
  for(const titan of (G.allies||[])){
    if(!titan||titan.hp<=0||titan.name!=='タイタン'||_isSealed(titan)) continue;
    const repeat=_openingEffectRepeatCount(titan);
    for(let i=0;i<repeat;i++){
      (G.enemies||[]).forEach(e=>{
        if(e&&e.hp>0&&!_isAilmentImmune(e)) e.weaken=(e.weaken||0)+1;
      });
    }
    log(`タイタンの効果で全ての敵は弱体${repeat}を得た。`,'good');
  }
  _initSealStates();
  await _applyOpeningItemEffects();
  // 戦闘力の足し算・引き算 → 掛け算・割り算 → 生命の力マス → それ以外の開戦効果
  await _applyNewOpeningEffects('add');
  await _applyNewOpeningEffects('mul');
  _applyLifePanelPowerHpDouble();
  await _applyNewOpeningEffects('other');
  await _applyRingBattleStartEffects();
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
  // 強靭の指輪：開戦：全ての味方は強靭1を得る。
  if(rings.some(r=>r&&r.name==='強靭の指輪')){
    (G.allies||[]).forEach(u=>{
      if(_canReceiveBattleEffect(u)) u.keywords=[...(u.keywords||[]),'強靭1'];
    });
    log('強靭の指輪の効果で全ての味方は強靭1を得た。','good');
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

function _refreshPermanentBuffedPanels(panelName){
  if(!panelName||!G.panelPermanentBuffs||!G.panelPermanentBuffs[panelName]) return;
  const buff=G.panelPermanentBuffs[panelName];
  const visit=card=>{
    if(!card||String(card.category||'')!=='キャラクター'||String(card.name||'')!==panelName) return;
    if(card._permBasePower==null) card._permBasePower=Number(card.power??card.atk??0)-Number(card._permBuffAtkApplied||0);
    if(card._permBaseLife==null) card._permBaseLife=Number(card.life??card.hp??1)-Number(card._permBuffHpApplied||0);
    card._permBuffAtkApplied=Number(buff.atk||0);
    card._permBuffHpApplied=Number(buff.hp||0);
    card.power=card._permBasePower+card._permBuffAtkApplied;
    card.life=card._permBaseLife+card._permBuffHpApplied;
  };
  (G.allies||[]).forEach(u=>(u?.equipment||[]).forEach(visit));
  if(typeof _rewCards!=='undefined') (_rewCards||[]).forEach(visit);
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
        for(let i=0;i<3;i++) await _spawnAdhocAllyUnit('緑ペリカン',1,1,isEnemySide,{rightOf:unit,deferCompact:true});
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
function _applyLifePanelPowerHpDouble(){
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
function _hasAnyDeathKeywordEffect(unit){
  if(!unit) return false;
  const count=kw=>_enhancementCount(unit,kw);
  if(count('闇の炎')>0) return true;
  const rawDeathMana=unit.manaOnDeath?(parseInt(unit.manaOnDeath,10)||0):count('狂気');
  if(rawDeathMana>0) return true;
  if(_unitPanelKeywords(unit).some(kw=>/^([赤青緑黄紫])全体強化(\d+)_(\d+)$/.test(kw))) return true;
  if(unit.goldOnDeath) return true;
  if(['レイス','デスナイト','ゴースト','ファントム','レムレース','ボーンチャリオット'].some(n=>_unitHasEffectName(unit,n))) return true;
  if(_unitHasEffectName(unit,'バンシー')&&(unit.atk||0)>0) return true;
  if(_enhancementCount(unit,'怨念')>0&&(unit.atk||0)>0) return true;
  if(unit._grantedDeathSummon) return true;
  if(_unitHasEffectName(unit,'深藍の魔女"ティアマリス"')) return true;
  return false;
}

async function _applyDeathKeywordEffects(unit, unitIsEnemy){
  if(!unit) return;
  if(unitIsEnemy&&_isUnitSilencedByScroll(unit)) return;
  const allies=unitIsEnemy?G.enemies:G.allies;
  const foes=unitIsEnemy?G.allies:G.enemies;
  const count=kw=>_enhancementCount(unit,kw);
  // 屍術師の指輪：常時：味方の死亡効果は1回追加で発動する。（プレイヤー側のみ）
  const _ringDeathExtra=unitIsEnemy?0:_ringCount('屍術師の指輪');
  const deathRepeats=1+count('逆襲')+_ringDeathExtra+(Number(unit._effectRepeatBonus)||0);
  const hasName=name=>_unitHasEffectName(unit,name);
  const willCount=Math.max(_unitKeywordCount(unit,'遺志'),_unitEffectPanelCount(unit,'遺志'));
  for(let i=0;i<willCount;i++){
    // 対象は毎回選び直す（1枚ごとに別の味方へ配られる）。
    const target=_randomLiving(allies,a=>a!==unit);
    if(!target) break;
    _addBattleStats(target,3,2,unitIsEnemy?'enemy':'ally');
    log(`${_lc(unit.name,unitIsEnemy)}の遺志で${_lc(target.name,unitIsEnemy)}は+3/+2を得た。`,unitIsEnemy?'bad':'good');
  }
  const inheritCount=_unitEffectPanelCount(unit,'継承');
  const inheritAtk=Math.max(0,Number(unit.atk)||0);
  for(let i=0;i<inheritCount&&inheritAtk;i++){
    const target=_randomLiving(allies,a=>a!==unit);
    if(!target) break;
    _addBattleStats(target,inheritAtk,0,unitIsEnemy?'enemy':'ally');
    log(`${_lc(unit.name,unitIsEnemy)}の継承で${_lc(target.name,unitIsEnemy)}はATK+${inheritAtk}を得た。`,unitIsEnemy?'bad':'good');
  }
  const darkFlame=count('闇の炎')*deathRepeats;
  for(let i=0;i<darkFlame;i++){
    const entries=foes
      .filter(t=>t&&t.hp>0&&!t._isObject&&!t._isSoul)
      .map(t=>({unit:t,side:(G.allies||[]).includes(t)?'ally':'enemy',amount:1,source:unit}));
    playDamageEffectSfx('all');
    // 闇の炎はキーワード由来の効果でありカード固有の効果ではないため、
    // ダメージ源キャラクターの専用VFX（CXXX.mp4）は使わない（通常のhit.mp4を使う）。
    await applyDamageBatch(entries,{source:unit});
    log(`${_lc(unit.name,unitIsEnemy)}の闇の炎が発動した。全ての敵キャラクターに1ダメージを与えた。`,unitIsEnemy?'bad':'good');
  }
  const rawDeathMana=unit.manaOnDeath ? (parseInt(unit.manaOnDeath,10)||0) : count('狂気');
  const madness=rawDeathMana*deathRepeats;
  for(let i=0;i<madness;i++) _gainMana(1,unit.name);
  // 「死亡：全てのA色キャラクターは+atk/+hpを得る。」（インプ・ゴースト等、色/数値はキーワードに埋め込まれている）
  for(let repeat=0;repeat<deathRepeats;repeat++){
    _unitPanelKeywords(unit).forEach(kw=>{
      const m=/^([赤青緑黄紫])全体強化(\d+)_(\d+)$/.exec(kw);
      if(!m) return;
      const [,buffColor,buffAtkStr,buffHpStr]=m;
      const buffAtk=parseInt(buffAtkStr,10)||0, buffHp=parseInt(buffHpStr,10)||0;
      allies.forEach(a=>{
        if(a&&a.hp>0&&String(a.color||'')===buffColor){
          if(buffAtk) addUnitAtk(a,buffAtk);
          if(buffHp) addUnitHp(a,buffHp,unitIsEnemy?'enemy':'ally');
        }
      });
      log(`${_lc(unit.name,unitIsEnemy)}の効果で全ての${buffColor}キャラクターは+${buffAtk}/+${buffHp}を得た。`,unitIsEnemy?'bad':'good');
    });
  }
  // マミー：死亡：1ゴールドを得る。（終戦Xゴールドと同じ数値パース結果を利用）
  if(unit.goldOnDeath){
    const gold=unit.goldOnDeath*deathRepeats;
    _playCardEffectSfx('C001');
    await _playCardEffectVfx('C001',[unit]);
    onGoldGained(gold);
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${gold}ゴールドを得た。`,unitIsEnemy?'bad':'good');
  }
  // レイス：死亡：ランダムな味方の負傷効果を発動する。
  for(let i=0;i<deathRepeats&&hasName('レイス');i++){
    const candidates=allies.filter(a=>_canReceiveBattleEffect(a)&&a!==unit);
    if(!candidates.length) break;
    const target=candidates[Math.floor(Math.random()*candidates.length)];
    if(unitIsEnemy){
      // 敵側の負傷効果は個別実装が薄いため、プレイヤー側と同じ関数を使える範囲に限定する。
      if(target.manaOnInjury) _gainMana(target.manaOnInjury,target);
    }else{
      // レイスが起こした負傷効果も「味方の負傷効果が発動した」ことに変わりないため、
      // エティンを発動回数分だけ反応させる。
      _bumpEtinOnAllyInjuryEffect(await _fireAllyInjuryEffects(target,0));
    }
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${_lc(target.name,unitIsEnemy)}の負傷効果を発動した。`,unitIsEnemy?'bad':'good');
  }
  // デスナイト：死亡：「青スケルトン」を召喚する。
  for(let i=0;i<deathRepeats&&hasName('デスナイト');i++){
    log(`${_lc(unit.name,unitIsEnemy)}の効果で「青スケルトン」を召喚する。`,unitIsEnemy?'bad':'good');
    await _spawnAdhocAllyUnit('青スケルトン',4,2,unitIsEnemy,{rightOf:unit});
  }
  // バンシー：死亡：ランダムな敵にXダメージを与える。XはこのキャラクターのATKに等しい。
  if(hasName('バンシー')&&(unit.atk||0)>0){
    const dmgAmount=unit.atk||0;
    for(let i=0;i<deathRepeats;i++){
      const target=_pickRandomEnemyTargets(foes,unit)[0];
      if(!target) break;
      playDamageEffectSfx('single');
      await applyDamageBatch([{unit:target,side:(G.allies||[]).includes(target)?'ally':'enemy',amount:dmgAmount,source:unit}],{source:unit,effect:true});
      log(`${_lc(unit.name,unitIsEnemy)}の効果で${_lc(target.name,!unitIsEnemy)}に${dmgAmount}ダメージを与えた。`,unitIsEnemy?'bad':'good');
    }
  }
  if(unitIsEnemy&&hasName('深藍の魔女"ティアマリス"')){
    const target=_pickRandomEnemyTargets(G.allies,unit)[0];
    if(target){
      target.hp=0;
      await processAllyDeath(target);
      log(`${_lc(unit.name,true)}の効果で${_lc(target.name,false)}を即死させた。`,'bad');
    }
  }
  // ゴースト：死亡：ランダムな青キャラクターは+2/+1を得る。
  for(let i=0;i<deathRepeats&&hasName('ゴースト');i++){
    const target=_randomLiving(allies,a=>a!==unit&&String(a.color||'')==='青');
    if(!target) break;
    _addBattleStats(target,2,1,unitIsEnemy?'enemy':'ally');
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${_lc(target.name,unitIsEnemy)}は+2/+1を得た。`,unitIsEnemy?'bad':'good');
  }
  // ファントム：死亡：「青シャドウ」を3体召喚する。
  for(let i=0;i<deathRepeats&&hasName('ファントム');i++){
    for(let j=0;j<3;j++) await _spawnAdhocAllyUnit('青シャドウ',1,1,unitIsEnemy,{rightOf:unit});
    log(`${_lc(unit.name,unitIsEnemy)}の効果で「青シャドウ」を3体召喚した。`,unitIsEnemy?'bad':'good');
  }
  // レムレース：死亡：このキャラクターを倒したキャラクターが報酬に出現する。
  if(!unitIsEnemy&&hasName('レムレース')){
    const killer=unit._lastDamageSource;
    if(killer&&killer!==unit){
      _queueBonusRewardPanel(killer._preDeathSnapshot||killer);
      log(`${_lc(unit.name,false)}の効果で${_lc(killer.name,(G.enemies||[]).includes(killer))}が報酬に出現する。`,'good');
    }
  }
  // ボーンチャリオット：死亡：ランダムな味方に「死亡：「青スケルトン」を召喚する。」を付与する。
  for(let i=0;i<deathRepeats&&hasName('ボーンチャリオット');i++){
    const target=_randomLiving(allies,a=>a!==unit&&!a._grantedDeathSummon);
    if(!target) break;
    target._grantedDeathSummon={name:'青スケルトン',atk:4,hp:2};
    log(`${_lc(unit.name,unitIsEnemy)}の効果で${_lc(target.name,unitIsEnemy)}に「死亡：「青スケルトン」を召喚する。」を付与した。`,unitIsEnemy?'bad':'good');
  }
  const grudgeCount=_enhancementCount(unit,'怨念');
  if(grudgeCount>0&&(unit.atk||0)>0){
    for(let i=0;i<deathRepeats*grudgeCount;i++){
      const candidates=_livingCombatUnits(foes);
      if(!candidates.length) break;
      const target=candidates[Math.floor(Math.random()*candidates.length)];
      log(`${_lc(unit.name,unitIsEnemy)}の怨念が発動した。${_lc(target.name,!unitIsEnemy)}に${unit.atk}ダメージ。`,unitIsEnemy?'bad':'good');
      playDamageEffectSfx('single');
      // 怨念はキーワード由来の効果でありカード固有の効果ではないため、
      // ダメージ源キャラクターの専用VFX（CXXX.mp4）は使わない（通常のhit.mp4を使う）。
      await applyDamageBatch([{unit:target,side:unitIsEnemy?'ally':'enemy',amount:unit.atk,source:unit}],{source:unit});
    }
  }
  // レイス由来：死亡：「青ゴースト」を召喚する。（逆襲・リッチ等の死亡効果複数回発動にも対応する）
  for(let i=0;i<deathRepeats&&unit._grantedDeathSummon;i++){
    const spec=unit._grantedDeathSummon;
    log(`${_lc(unit.name,unitIsEnemy)}の効果で「${spec.name}」を召喚する。`,unitIsEnemy?'bad':'good');
    await _spawnAdhocAllyUnit(spec.name,spec.atk,spec.hp,unitIsEnemy,{rightOf:unit});
  }
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
    await _playCardEffectVfx('C003',[unit]);
    fired=true;
  }
  const hasName=name=>_unitHasEffectName(unit,name);
  const name=unit.name;
  if(hasName('ゴーレム')){
    _addBattleStats(unit,2,2,'ally');
    log(`${_lc(unit.name,false)}の効果で+2/+2を得た。`,'good');
    _playCardEffectSfx('C003');
    await _playCardEffectVfx('C003',[unit]);
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
    await _playCardEffectVfx('C003',buffTargets);
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
    const extraHits=_unitHasKeyword(unit,'三段攻撃')?2:_unitHasKeyword(unit,'二段攻撃')?1:0;
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
  const live=targets.filter(u=>u&&u.hp>0&&!u._isObject&&!_isSealed(u));
  if(!live.length) return null;
  const isFront=u=>(u.lane||'front')==='front';
  const isGuard=u=>{
    const canUseStaticGuard=(targets===G.enemies)||u._panelSummoned;
    return (u.hate&&u.hateTurns>0)||(canUseStaticGuard&&u.guardian);
  };
  const isStealth=u=>!!u.stealth;
  const laneLocked=live.some(isFront)?live.filter(isFront):live;
  const visibleLane=laneLocked.filter(u=>!isStealth(u));
  const guardLine=visibleLane.filter(isGuard);
  if(guardLine.length) return randFrom(guardLine);
  // 狩人：前衛か後衛かを問わず、生存する全キャラクターの中から最もライフの低い相手を狙う
  if(_unitHasKeyword(attacker,'狩人')){
    const visibleAll=live.filter(u=>!isStealth(u));
    const hunterPool=visibleAll.length?visibleAll:live;
    return hunterPool.reduce((a,b)=>a.hp<b.hp?a:b);
  }
  // 1. 前衛が存在する場合は前衛のみを対象にする
  const pool=visibleLane.length>0?visibleLane:laneLocked;
  const finalPool=pool.length>0?pool:live;
  // 2. ランダム
  return randFrom(finalPool);
}

// 貫通：前衛キャラクターへの攻撃時、その後ろに位置する後衛キャラクター（最大3人）にも同じダメージを与える。
// 前衛F人・後衛R人の場合、後衛R人をF分割し、front側の位置indexに対応する区画を「真後ろ」とみなす。
function _pierceRearTargets(target, list){
  if(!target||(target.lane||'front')==='rear') return [];
  const live=(list||[]).filter(u=>u&&u.hp>0&&!u._isObject&&!_isSealed(u));
  const front=live.filter(u=>(u.lane||'front')!=='rear');
  const rear=live.filter(u=>(u.lane||'front')==='rear');
  const idx=front.indexOf(target);
  if(idx<0||!rear.length) return [];
  const F=front.length,R=rear.length;
  const start=Math.round(idx*R/F);
  const end=Math.round((idx+1)*R/F)-1;
  if(end<start) return [];
  return rear.slice(start,end+1);
}

async function allyAttackAction(ally, allyIdx){
  // 毒は「攻撃するタイミング」ではなく「このキャラクターの手番」に発動するため、
  // ATK0で攻撃自体がスキップされる場合も先に処理する
  await _applyPoisonBeforeAttack(ally);
  if(!ally||ally.hp<=0||_isSealed(ally)) return false;
  if(_unitHasKeyword(ally,'防戦')) return false;
  const attackDmg=_attackDamageValue(ally);
  if(attackDmg<=0) return false; // ATK0は攻撃しない
  const liveE=G.enemies.filter(_canReceiveBattleEffect);
  if(!liveE.length) return false;

  let target=getAttackTarget(ally,G.enemies);
  if(!target) return false;
  if(ally.name==='スケルトンキング'){
    if(ally.stealth){ ally.stealth=false; log(`${_lc(ally.name,false)}の隠密が解除された。`,'sys'); }
    const skel=await _spawnAdhocAllyUnit('青スケルトン',4,2,false,{rightOf:ally});
    if(skel&&skel.hp>0){
      log(`${_lc(ally.name,false)}の効果で「青スケルトン」を召喚し、代わりに攻撃させた。`,'good');
      const si=G.allies.indexOf(skel);
      if(si>=0) await allyAttackAction(skel,si);
    }
    renderAll();
    await battleSleep(180);
    return true;
  }
  const isGlobal=_unitHasKeyword(ally,'全体攻撃');
  const isTriDir=_unitHasKeyword(ally,'三方向攻撃');
  hideAttackLine();

  if(ally.stealth){ ally.stealth=false; log(`${_lc(ally.name,false)}の隠密が解除された。`,'sys'); }

  // 攻撃時効果はアニメーション途中で発動する
  if(ally.hp>0&&_hasAttackEffectsForPause(ally)) ally._attackEffectPending=true;
  // 闇の儀式・狂戦士の指輪の追加発動は「攻撃：◯マナを得る」（マナ生成）にも掛かる。
  if(ally.hp>0&&ally.manaOnAttack){
    const _ritualExtra=_allyAttackEffectExtra(ally);
    for(let mi=0;mi<1+_ritualExtra;mi++) _gainMana(ally.manaOnAttack,ally);
    await _flushRingManaThresholdEffects();
    if(_checkBattleOver()) return true;
    if(!target||target.hp<=0) target=getAttackTarget(ally,G.enemies);
    if(!target) return false;
  }

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
    const titaniaExtra=(G.allies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&u.name==='タイタニア').length;
    const extraHits=(_unitHasKeyword(ally,'三段攻撃')?2:_unitHasKeyword(ally,'二段攻撃')?1:0)+titaniaExtra;
    let curTgt=target;
    for(let hi=0;hi<extraHits;hi++){
      if(!curTgt||curTgt.hp<=0){
        curTgt=getAttackTarget(ally,G.enemies);
      }
      if(!curTgt||curTgt.hp<=0) break;
      hideAttackLine();
      // 攻撃時効果はアニメーション途中で発動する
      if(ally.hp>0&&_hasAttackEffectsForPause(ally)) ally._attackEffectPending=true;
      if(ally.hp>0&&ally.manaOnAttack){
        const _ritualExtra2=_allyAttackEffectExtra(ally);
        for(let mi=0;mi<1+_ritualExtra2;mi++) _gainMana(ally.manaOnAttack,ally);
        await _flushRingManaThresholdEffects();
        if(_checkBattleOver()) return true;
        if(!curTgt||curTgt.hp<=0) curTgt=getAttackTarget(ally,G.enemies);
        if(!curTgt||curTgt.hp<=0) break;
      }
      log(`${_lc(_battleLogName(ally,G.allies),false)}の${hi+2}段攻撃！ ${_lc(_battleLogName(curTgt,G.enemies),true)}に${attackDmg}ダメージを与えた。`,'good');
      await _dealAttackDamageWithMutual(ally,false,curTgt,G.enemies.indexOf(curTgt),attackDmg);
    }
  }

  // 鬼神の指輪：常時：味方が12回攻撃するたび、「鬼神」（赤、♾️/1）を召喚し、直ちに攻撃させる。
  if(_hasRingNamed('鬼神の指輪')){
    G._oniRingAttackCount=(G._oniRingAttackCount||0)+1;
    if(G._oniRingAttackCount>=12){
      G._oniRingAttackCount=0;
      const oni=await _spawnAdhocAllyUnit('赤鬼神',99999,1,false,{rightmost:true});
      if(oni&&oni.hp>0){
        log('鬼神の指輪の効果で「鬼神」を召喚し、直ちに攻撃させた。','good');
        const oniIdx=G.allies.indexOf(oni);
        if(oniIdx>=0) await allyAttackAction(oni,oniIdx);
      }
    }
  }

  renderAll();
  await battleSleep(180);
  return true;
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  // 毒は「攻撃するタイミング」ではなく「このキャラクターの手番」に発動するため、
  // ATK0で攻撃自体がスキップされる場合も先に処理する
  await _applyPoisonBeforeAttack(enemy);
  if(!enemy||enemy.hp<=0||_isSealed(enemy)) return false;
  if(_unitHasKeyword(enemy,'防戦')) return false;
  if(enemy.atk<=0) return false; // ATK0は攻撃しない
  const liveA=G.allies.filter(_canReceiveBattleEffect);
  if(!liveA.length) return false;

  // ターゲット選択（前衛後衛ルール）
  const primaryTarget=getAttackTarget(enemy,G.allies);
  if(!primaryTarget) return false;
  if(enemy.name==='スケルトンキング'){
    if(enemy.stealth){ enemy.stealth=false; log(`${_lc(enemy.name,true)}の隠密が解除された。`,'sys'); }
    const skel=await _spawnAdhocAllyUnit('青スケルトン',4,2,true,{rightOf:enemy});
    if(skel&&skel.hp>0){
      log(`${_lc(enemy.name,true)}の効果で「青スケルトン」を召喚し、代わりに攻撃させた。`,'bad');
      const si=G.enemies.indexOf(skel);
      if(si>=0) await enemyAttackAction(skel,si);
    }
    renderAll();
    await battleSleep(180);
    return true;
  }
  const targets=[primaryTarget];
  const primaryIdx=G.allies.indexOf(primaryTarget);

  const isGlobalAtk=enemy.keywords&&enemy.keywords.includes('全体攻撃');
  const isTriDirAtk=enemy.keywords&&enemy.keywords.includes('三方向攻撃');
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
    const titaniaExtra=(G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&u.name==='タイタニア').length;
    const extraHits=(enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0)+titaniaExtra;
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
  if(actualDmg>0&&unit.hp>0){
    if(unit.manaOnInjury) _gainMana(unit.manaOnInjury,unit);
    _onAllyInjuredByPanel(unit,actualDmg);
  }
  if(dmg>0&&src){
    applyKeywordOnHit(src,unit,actualDmg);
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
function _applyLemuresInjuryTransform(unit){
  if(!unit||unit.hp<=0||unit.name!=='レムレース') return;
  const src=unit._lastDamageSource;
  if(!src||src===unit||src.hp<=0) return;
  const isEnemyKiller=(G.enemies||[]).includes(src);
  log(`${_lc(unit.name,false)}が${_lc(src.name,isEnemyKiller)}に変身した。`,'good');
  unit.name=src.name;
  unit.race=src.race||unit.race;
  unit.atk=Math.max(0,src.atk||0);
  unit.baseAtk=Math.max(0,src.baseAtk||src.atk||0);
  unit.maxHp=Math.max(1,src.maxHp||src.hp||1);
  unit.hp=Math.max(1,Math.min(unit.maxHp,src.hp||unit.maxHp));
  unit.color=src.color||unit.color;
  unit.keywords=[...(src.keywords||[])];
  unit.desc=src.desc||'';
  // 外観（アートワーク）もsrcのものに差し替える。unit.artが残っていると
  // 名前を変えても旧レムレースの絵のまま表示されてしまうため、明示的に上書き/削除する。
  if(src.art) unit.art=src.art; else delete unit.art;
  if(src.artCode) unit.artCode=src.artCode; else delete unit.artCode;
  if(src.imageNo) unit.imageNo=src.imageNo; else delete unit.imageNo;
  if(src.no) unit.no=src.no; else delete unit.no;
  delete unit._lastDamageSource;
  requestBattleCompact();
}

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
    G._revivalRingUsed=true;
    await _applyDeathKeywordEffects(unit,false);
    _onAllyDeathPanelSummons();
    G.battleCounters.deaths++;
    if(typeof _onAnyCharDeath==='function') _onAnyCharDeath(unit);
    unit.hp=Math.max(1,unit.maxHp||unit.hp||1);
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
    unit._starterRegenUsed=true;
    delete unit._deathFxDone;
    unit.keywords=(unit.keywords||[]).filter(k=>k!==reviveKw);
    if(reviveKw==='復活') _reviveWithHalvedStats(unit,false);
    else unit.hp=1;
    delete unit._deathProcessing;
    // 根性は「致死ダメージを受けてもHP1で耐える」効果のため、HPが一瞬0になったことで
    // 通常のダメージ処理内（hp>0判定）ではスキップされてしまう負傷トリガーをここで代わりに発動する
    if(reviveKw==='根性'){
      _bumpEtinOnAllyInjuryEffect(await _fireAllyInjuryEffects(unit,0));
    }
    log(reviveKw==='復活'?`${_lc(unit.name,false)}が復活の効果で召喚された。`:`${_lc(unit.name,false)}が${reviveKw}の効果で蘇った。`,'good');
    requestBattleCompact();
    return;
  }
  unit._deathProcessed=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  if(typeof playUnitDeathBurn==='function') playUnitDeathBurn(unit,'ally');
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

function _onAnyCharDeath(deadUnit){
  if(!deadUnit) return;
  const deadIsEnemy=(G.enemies||[]).includes(deadUnit);
  const applyToSide=(units,isEnemySide)=>{
    (units||[]).forEach(unit=>{
      if(!unit||unit.hp<=0||unit===deadUnit) return;
      const text=String(unit.desc||unit.effectText||'');
      if(!text.includes('仲間が死亡するたび')||!text.includes('+2/+1')) return;
      if(isEnemySide!==deadIsEnemy) return;
      unit.atk=Math.max(0,(Number(unit.atk)||0)+2);
      unit.baseAtk=Math.max(0,(Number(unit.baseAtk)||0)+2);
      addUnitHp(unit,1,isEnemySide?'enemy':'ally');
      log(`${_lc(unit.name,isEnemySide)}：仲間の死に応じて+2/+1`,'good');
    });
  };
  applyToSide(G.enemies,true);
  applyToSide(G.allies,false);
  // ヴァンパイアロード：常時：キャラクターが死亡するたび、全ての味方はHP+1を得る。（陣営問わず発動）
  if((G.allies||[]).some(u=>u&&u.hp>0&&u.name==='ヴァンパイアロード')){
    (G.allies||[]).forEach(u=>{ if(u&&u.hp>0) addUnitHp(u,1,'ally'); });
    log('ヴァンパイアロードの効果で全ての味方はHP+1を得た。','good');
  }
  if(!deadIsEnemy){
    // デュラハン：常時：味方が死亡するたび、ランダムな敵に4ダメージを与える。
    (G.allies||[]).filter(u=>u&&u.hp>0&&u.name==='デュラハン').forEach(dh=>{
      const alive=(G.enemies||[]).filter(e=>e&&e.hp>0);
      if(!alive.length) return;
      const target=_pickRandomEnemyTargets(G.enemies,dh)[0];
      log(`${_lc(dh.name,false)}の効果で${_lc(target.name,true)}に4ダメージを与えた。`,'good');
      playDamageEffectSfx('single');
      dealDmgToEnemy(target,4,G.enemies.indexOf(target),dh);
    });
    // レヴナント：常時：味方が死亡するたび、このキャラクターは+1/+1を得る。
    (G.allies||[]).filter(u=>u&&u.hp>0&&u.name==='レヴナント').forEach(rv=>{
      const gAtk=addUnitAtk(rv,1);
      const gHp=addUnitHp(rv,1,'ally');
      log(`${_lc(rv.name,false)}の効果で+${gAtk}/+${gHp}を得た。`,'good');
    });
    // エイドロン：常時：味方が3体死亡するたび、1マナを得る。
    if((G.allies||[]).some(u=>u&&u.hp>0&&u.name==='エイドロン')){
      G._eidolonDeathCount=(G._eidolonDeathCount||0)+1;
      if(G._eidolonDeathCount>=3){
        G._eidolonDeathCount=0;
        _gainMana(1,'エイドロン');
      }
    }
  }
  // 屍術：キャラクターが死亡するたび、この効果を持つキャラクターは+1/+1を得る。
  // 死亡者の陣営を問わず、場に残っている屍術保持者へ適用する。
  [...(G.allies||[]),...(G.enemies||[])].forEach(holder=>{
    if(!holder||holder.hp<=0) return;
    const count=_unitEffectPanelCount(holder,'屍術');
    if(count<=0) return;
    const isEnemyHolder=(G.enemies||[]).includes(holder);
    holder.atk=(Number(holder.atk)||0)+count;
    holder.baseAtk=(Number(holder.baseAtk)||0)+count;
    addUnitHp(holder,count,isEnemyHolder?'enemy':'ally');
    log(`${_lc(holder.name,isEnemyHolder)}の屍術で+${count}/+${count}を得た。`,isEnemyHolder?'bad':'good');
  });
  (G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&_unitHasEffectName(u,'虚空の渡し守"ナグルファル"')).forEach(u=>{
    _addBattleStats(u,3,1,'enemy');
    log(`${_lc(u.name,true)}の効果で+3/+1を得た。`,'bad');
  });
  if(!deadIsEnemy){
    (G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&_unitHasEffectName(u,'忘却の骸"ゲルミール"')).forEach(u=>{
      (G.enemies||[]).filter(_canReceiveBattleEffect).forEach(e=>_addBattleStats(e,4,3,'enemy'));
      log(`${_lc(u.name,true)}の効果で全ての味方は+4/+3を得た。`,'bad');
    });
  }
}

async function _onEnemySideAttack(attacker){
  if(!attacker||attacker.hp<=0) return;
  (G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&_unitHasEffectName(u,'隻眼の魔狼"ガルム・グリーム"')).forEach(g=>{
    (G.enemies||[]).filter(_canReceiveBattleEffect).forEach(e=>_addBattleStats(e,1,1,'enemy'));
    log(`${_lc(g.name,true)}の効果で全ての味方は+1/+1を得た。`,'bad');
  });
  for(const g of (G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&_unitHasEffectName(u,'極光の女王"グンダ"'))){
    const entries=(G.allies||[]).filter(_canReceiveBattleEffect).map(a=>({unit:a,side:'ally',amount:1,source:g}));
    if(entries.length) await applyDamageBatch(entries,{source:g,effect:true});
    log(`${_lc(g.name,true)}の効果で全ての敵に1ダメージを与えた。`,'bad');
  }
  for(const l of (G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&_unitHasEffectName(u,'日刻の巫女"ルミア"'))){
    const entries=(G.allies||[]).filter(_canReceiveBattleEffect).map(a=>({unit:a,side:'ally',amount:8,source:l}));
    if(entries.length) await applyDamageBatch(entries,{source:l,effect:true});
    log(`${_lc(l.name,true)}の効果で全ての敵に8ダメージを与えた。`,'bad');
  }
}


// ── シールド喪失時 ──────────────────────────────

function onAllyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'ally');
  (G.allies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&u.name==='カーバンクル').forEach(c=>{
    const entries=_livingCombatUnits(G.enemies).map(e=>({unit:e,side:'enemy',amount:1,source:c}));
    if(!entries.length) return;
    playDamageEffectSfx('all');
    applyDamageBatch(entries,{source:c,effect:true});
    log(`${_lc(c.name,false)}の効果で全ての敵に1ダメージを与えた。`,'good');
  });
}

function onEnemyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'enemy');
  (G.enemies||[]).filter(u=>u&&u===lostUnit&&u.hp>0&&!_isSealed(u)&&_unitHasEffectName(u,'惑わしの妖精"エインセル"')).forEach(a=>{
    (G.enemies||[]).filter(_canReceiveBattleEffect).forEach(e=>_addBattleStats(e,2,2,'enemy'));
    log(`${_lc(a.name,true)}の効果で全ての味方は+2/+2を得た。`,'bad');
  });
  (G.enemies||[]).filter(u=>u&&u.hp>0&&!_isSealed(u)&&u.name==='カーバンクル').forEach(c=>{
    const entries=_livingCombatUnits(G.allies).map(a=>({unit:a,side:'ally',amount:1,source:c}));
    if(!entries.length) return;
    playDamageEffectSfx('all');
    applyDamageBatch(entries,{source:c,effect:true});
    log(`${_lc(c.name,true)}の効果で全ての敵に1ダメージを与えた。`,'bad');
  });
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

async function onBattleEnd(){
  // ノーム等：終戦：Xゴールドを得る。（パネル召喚キャラは直後に盤面から除去されるため先に処理する）
  const goldEffectUnits=[];
  for(const a of (G.allies||[])){
    if(a&&a.hp>0&&a.goldOnBattleEnd){
      const repeatCount=1+(Number(a._effectRepeatBonus)||0);
      for(let repeat=0;repeat<repeatCount;repeat++){
        goldEffectUnits.push({unit:a,amount:a.goldOnBattleEnd});
      }
    }
  }
  const randomItemEffectUnits=[];
  for(const a of (G.allies||[])){
    if(a&&a.hp>0&&a.randomItemOnBattleEnd){
      const repeatCount=1+(Number(a._effectRepeatBonus)||0);
      for(let repeat=0;repeat<repeatCount;repeat++) randomItemEffectUnits.push(a);
    }
  }
  (G.allies||[]).filter(a=>a&&a.hp>0&&a.name==='ハイドラ').forEach(h=>{
    const candidates=(G.allies||[]).filter(a=>a&&a.hp>0&&a!==h&&!a._isObject&&!a._isSoul&&!_isSealed(a));
    const picked=candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
    if(picked){
      _queueBonusRewardPanel(picked);
      log(`${_lc(h.name,false)}の効果で、生存したキャラクター1体が報酬に出現する。`,'good');
    }
  });
  // 終戦時のゴールド演出は、他の終戦時効果の処理・演出が終わってから開始する。
  await _waitForPendingVfx();
  for(const {unit:a,amount} of goldEffectUnits){
    _playCardEffectSfx('C001');
    // VFXのDOM生成直後に加算し、画面上の獲得演出と所持金表示を同時に開始する。
    const vfx=_playCardEffectVfx('C001',[a],{gateMs:0,hitDuration:900,waitForFinish:true});
    onGoldGained(amount);
    log(`${_lc(a.name,false)}の効果で${amount}ゴールドを得た。`,'good');
    await vfx;
  }
  for(const a of randomItemEffectUnits) _grantRandomItem(a.name,{free:true});
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
  G.allies=(G.allies||[]).map(u=>u&&u._panelSummoned?null:u);
  G.enemies=(G.enemies||[]).map(u=>u&&u._panelSummoned?null:u);
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
function applyKeywordOnHit(attacker, target, damageDone, targetPreHp, skipLifeDrain){
  const _isPlayerAllyForCurse=G.allies.some(a=>a===target);
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
  const kws=attacker.keywords||[];
  if(!kws.length&&!(attacker.weakenOnHit>0)) return;
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  // 生命吸収：与えたダメージ分HPを増加する。対象を倒した場合も発動する。
  // 反撃等、攻撃者自身も同じ接触で同時にダメージを受ける経路（applyDamageBatch）では、
  // ここでは処理せずバッチ確定後にまとめて処理する（攻撃者が同時に死亡した場合は回復しない）。
  if(!skipLifeDrain&&damageDone>0&&kws.includes('生命吸収')){
    const healAmt=_lifeDrainHealAmount(damageDone,targetPreHp);
    if(healAmt>0){
      addUnitHp(attacker,healAmt,_isPlayerAlly?'ally':'enemy');
      log(`${_lc(attacker.name,!_isPlayerAlly)}の生命吸収：HP+${healAmt}`,_isPlayerAlly?'good':'bad');
    }
  }
  if(target.hp<=0) return;
  // 加護：ダメージ以外の効果（即死・毒牙・衝撃・邪眼等の付与）を受けない（加護の指輪装備時は味方全員）
  const isProtected=_isAilmentImmune(target);
  if(kws.includes('即死')&&!isProtected){ target.hp=0; log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}を即死させた！`,'bad'); }
  // 毒沼の指輪：常時：敵が得る毒は2倍になる（毒牙X・毒Xいずれの付与も対象）。
  // 掛け算は最後に行うルールのため、加算（毒牙X等の合算値）確定後の最終値にのみ乗算する。
  const _poisonRingMult=((G.enemies||[]).includes(target)&&_hasRingNamed('毒沼の指輪'))?2:1;
  // 毒牙X：命中時に毒Xを付与（加算）。同種の変数は合算する
  const erosionSum=kws.filter(k=>/^毒牙\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if((erosionSum>0||kws.includes('毒牙'))&&target.hp>0&&!isProtected){
    const basePoison=erosionSum>0?erosionSum:Math.max(0,Math.floor(damageDone??attacker.atk??0));
    const pv=(basePoison+_gdKw)*_poisonRingMult;
    target.poison=(target.poison||0)+pv;
    log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}に毒${pv}を与えた。`,'bad');
  }
  const poisonBladeSum=kws.filter(k=>/^毒\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(1),10)||0),0);
  if(poisonBladeSum>0&&target.hp>0&&!isProtected){
    const pv=(poisonBladeSum+_gdKw)*_poisonRingMult;
    target.poison=(target.poison||0)+pv;
    log(`${_lc(attacker.name,!_isPlayerAlly)} が${_lc(target.name,_isPlayerAlly)}に毒${pv}を与えた。`,'bad');
  }
  // 邪眼X：命中時にターゲットのATKをX減少。同種の変数は合算する
  const evilEyeSum=kws.filter(k=>/^邪眼\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if(evilEyeSum>0&&target.hp>0&&!isProtected){
    const ev=evilEyeSum+_gdKw;
    target.atk=Math.max(0,target.atk-ev);
    target.baseAtk=Math.max(0,(target.baseAtk||target.atk)-ev);
    log(`${_lc(attacker.name,!_isPlayerAlly)}が${_lc(target.name,_isPlayerAlly)}の攻撃力を${ev}減少させ、${target.atk}にした。`,'bad');
  }
  // 衝撃X：このキャラクター自身ではなく、攻撃/ダメージ効果を与えた対象に「弱体X」を付与する
  // （衝撃＝付与する能力名、弱体X＝付与される状態。複数回付与された場合はXを加算して保持する。
  // 付与された弱体Xは_applyDamageState側で「受けるダメージ+X」として manifest する）
  if((attacker.weakenOnHit||0)>0&&target.hp>0&&!isProtected){
    const wv=(attacker.weakenOnHit||0)+_gdKw;
    target.weaken=(target.weaken||0)+wv;
    log(`${_lc(attacker.name,!_isPlayerAlly)}が${_lc(target.name,_isPlayerAlly)}に弱体${wv}を与えた。`,'bad');
  }
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
  if(e.shield>0&&dmg>0){
    e.shield--;
    log(`${_lc(e.name,true)}の結界がダメージを防いだ。`,'sys');
    if(typeof playSfx==='function') playSfx('shield',{group:'combat'});
    onEnemyShieldLost(e);
    return;
  }
  const toughSumE=(e.keywords||[]).filter(k=>/^強靭\d+$/.test(k)).reduce((s,k)=>s+(parseInt(k.slice(2),10)||0),0);
  if(toughSumE>0) dmg-=toughSumE;
  const actualDmgToEnemy=Math.max(0,dmg);
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
      applyKeywordOnHit(srcUnit,e,actualDmgToEnemy,_preHpEnemy);
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
    e._starterRegenUsed=true;
    delete e._deathFxDone;
    e.keywords=(e.keywords||[]).filter(k=>k!==reviveKw);
    if(reviveKw==='復活') _reviveWithHalvedStats(e,true);
    else e.hp=1;
    if(reviveKw==='根性') await _fireEnemyInjuryEffects(e,0);
    log(reviveKw==='復活'?`${_lc(e.name,true)}が復活の効果で召喚された。`:`${_lc(e.name,true)}が${reviveKw}の効果で蘇った。`,'bad');
    requestBattleCompact();
    return;
  }
  e._dp=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  if(typeof playUnitDeathBurn==='function') playUnitDeathBurn(e,'enemy');
  _summonSuccubusVictimIfNeeded(e);
  // 魔力の指輪：常時：敵が死亡するたびに2マナを得る。
  {
    const manaRingCount=_ringCount('魔力の指輪');
    if(manaRingCount) _gainMana(2*manaRingCount,'魔力の指輪');
  }
  G._enemyDeathsThisBattle=(G._enemyDeathsThisBattle||0)+1;
  if(G.runStats) G.runStats.enemyKills=(G.runStats.enemyKills||0)+1;
  (G.allies||[]).filter(a=>a&&a.hp>0&&!_isSealed(a)&&a.name==='ヘルハウンド').forEach(h=>{
    _addBattleStats(h,G._enemyDeathsThisBattle,G._enemyDeathsThisBattle,'ally');
    log(`${_lc(h.name,false)}の効果で+${G._enemyDeathsThisBattle}/+${G._enemyDeathsThisBattle}を得た。`,'good');
  });
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

// ── 演出確認用の試験戦闘（デバッグモード専用）────────────────
// ステージ20の敵構成を使うが、全敵のATKを0・HPを500に上書きし、被弾せず何度でも
// キャラクターの効果・演出を試せるようにする。
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
  G.allies=(G.allies||[]).map(u=>u&&u._panelSummoned?null:u);
  G.enemies=(G.enemies||[]).map(u=>u&&u._panelSummoned?null:u);
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
