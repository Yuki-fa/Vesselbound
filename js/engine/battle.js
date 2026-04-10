// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, pool.js
// ═══════════════════════════════════════

let _isBossFight = false;

// ドリアード：攻撃時にランダムな仲間2体+1/+1（旧バフ系トリガーは廃止）
function triggerDryadBuff(){ /* 廃止済み - ドリアードは攻撃時効果に変更 */ }

// 魔術レベル上昇時の共通処理（ハーピー誘発等）
function onMagicLevelUp(amount){
  G.magicLevel=(G.magicLevel||1)+amount;
  syncHarpyAtk();
  // ハーピー：魔術レベルが上がるたびに全仲間+1/+2
  const _gd=G.hasGoldenDrop?1:0;
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='harpy_magiclevel') return;
    G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=1+_gd; b.baseAtk=(b.baseAtk||0)+1+_gd; b.hp+=2+_gd; b.maxHp+=2+_gd; }});
    log(`${a.name}：魔術Lv上昇→全仲間+${1+_gd}/+${2+_gd}`,'good');
  });
  // アラクネ：（杖が壊れた時に呼ばれるため、ここでは不要）
}

// ゴールド獲得時の共通処理（レプラコーン誘発）
function onGoldGained(amount){
  G.gold+=amount; G.earnedGold+=amount;
  updateHUD();
  // レプラコーン：ソウルを得るたびに全キャラ±0/+1
  const _gd=G.hasGoldenDrop?1:0;
  const hasLep=G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='leprechaun_gold');
  if(hasLep){
    const _lv=1+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=_lv; a.maxHp+=_lv; }});
    G.enemies.forEach(e=>{ if(e&&e.hp>0){ e.hp+=_lv; e.maxHp+=_lv; }});
    log(`レプラコーン：ソウル獲得→全キャラ±0/+${_lv}`,'good');
  }
}

function _handleVictory(){
  // stale setTimeout が次の戦闘中に発火した場合は何もしない
  if(G.phase!=='reward') return;
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showScreen('clear');
  } else {
    showVictoryOverlay();
  }
}

// ── リーダーボーナス（敵側）──────────────────────

function applyLeaderBonus(){
  const leader=G.enemies.find(e=>e.keywords&&e.keywords.includes('リーダー')&&e.hp>0);
  if(!leader) return;
  const bonus=Math.ceil(FLOOR_DATA[G.floor]?.grade||1);
  leader._leaderBonus=bonus;
  G.enemies.forEach(e=>{
    if(e.id!==leader.id&&e.hp>0){ e.atk+=bonus; e.hp+=bonus*2; e.maxHp+=bonus*2; }
  });
  log(`👑 リーダー「${leader.name}」が他の敵を強化（+${bonus}/+${bonus*2}）`,'bad');
}
function removeLeaderBonus(leader){
  if(!leader._leaderBonus) return;
  const bonus=leader._leaderBonus;
  G.enemies.forEach(e=>{
    if(e.id!==leader.id&&e.hp>0){ e.atk=Math.max(1,e.atk-bonus); e.hp=Math.max(1,e.hp-bonus*2); e.maxHp=Math.max(1,e.maxHp-bonus*2); }
  });
  log(`👑 リーダー死亡：強化が消えた`,'sys');
}

// ── 戦闘開始 ──────────────────────────────────

async function startBattle(){
  clearLog();

  // 宝箱・撤退フラグをリセット（前の戦闘の状態を持ち越さない）
  updateGoldenDrop();
  G._pendingTreasure=false;
  G._pendingEliteChest=false;
  G._retreated=false;
  G._retreatTargetNodeType=null;
  G._pendingSkelRevive=[];
  G._manaCycleUsed=false;
  G.allies.forEach(a=>{ if(a) delete a._deathProcessed; });
  G.enemies.forEach(e=>{ if(e) delete e._deathProcessed; });


  // ソウル引き継ぎ（arcanaCarryGold は強欲アルカナ用のみ加算して消費）
  G.gold += G.arcanaCarryGold||0; G.arcanaCarryGold=0;

  // フェイズを先行設定（報酬フェイズから遷移時、addAlly/renderAll 等が reward UI を誤操作しないよう）
  G.phase='player';

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

  const fd=FLOOR_DATA[G.floor];
  _isBossFight=!!(fd&&fd.boss);
  // 敵オーナー手札・指輪をすべての階層で読み込む（持ち物がなければ空配列）
  G.bossHand=(fd?.enemyHand||[]).map(s=>Object.assign({},s));
  G.bossRings=(fd?.enemyRings||[]).map(r=>Object.assign({},r));
  G.enemyMagicLevel=fd?.magicLevel||0;
  // 動的取得モード：戦闘開始時に持ち物がない場合、戦闘中取得は手札3・指輪非表示
  G._enemyHandDynamic=G.bossHand.length===0&&G.bossRings.length===0;

  G.turn=0; G.earnedGold=0; G.spreadActive=false; G.spreadMult=0;
  G._isEliteFight=false; G._eliteIdx=-1; G._eliteKilled=false;
  G.battleCounters={damage:0,deaths:0};

  G.enemies=generateEnemies(G.floor);
  // 永続敵強化（魂喰X・マミー敵）を新規敵に適用
  G.enemies.forEach(e=>{
    if(!e) return;
    const pa=G.enemyPermanentBonus||{atk:0,hp:0};
    if(pa.atk){ e.atk+=pa.atk; e.baseAtk=(e.baseAtk||0)+pa.atk; }
    if(pa.hp){ e.hp+=pa.hp; e.maxHp+=pa.hp; }
    const ua=G.enemyUndeadAtkBonus||0;
    if(ua&&(e.grade||1)>=2){ e.atk+=ua; e.baseAtk=(e.baseAtk||0)+ua; }
    e.allyTarget=false;
  });
  G.moveMasks=generateMoveMasks();
  G.visibleMoves=[];
  G.fogNext=false;

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    a.sealed=0; a._dp=false; a.powerBroken=false;
    a.nullified=0; a.instadead=false;
    a._battleStartHp=a.hp;
    delete a._weakenedSavedAtk;
  });

  log(`── 階層 ${G.floor} ──`,'sys');
  if(_isBossFight) log('⚠ ボス戦！','bad');
  log(`敵 ${G.enemies.length}体が現れた`,'em');
  applyLeaderBonus();

  // 戦闘開始時キャラクター効果
  onBattleStart();

  updateHUD();
  renderAll();
  await nextTurn();
}

// ── ターンループ ───────────────────────────────

async function nextTurn(){
  G.turn++;
  updateHUD();
  log(`── ターン ${G.turn} ──`,'sys');
  await commanderPhase(); // 敵オーナーが何も持っていなければ即return
  startPlayerPhase();
}

// ── 敵AIパーソナリティ思考システム ────────────────

const _PERSONALITY_WEIGHTS = {
  aggressive: { kill:3.0, damage:2.0, debuff:1.5, buff:0.5, sustain:0.3, control:0.5 },
  defensive:  { kill:1.0, damage:0.5, debuff:0.8, buff:2.0, sustain:3.0, control:0.8 },
  tactical:   { kill:2.0, damage:1.0, debuff:2.5, buff:1.5, sustain:1.0, control:3.0 },
  chaotic:    { kill:1.0, damage:1.0, debuff:1.0, buff:1.0, sustain:1.0, control:1.0 },
};

const _COMBO_SYNERGIES = {
  magic_book: { doom:20, flash_blade:5 },
  weaken:     { doom:8, flash_blade:5 },
  doom:       { flash_blade:3 },
  swap_stats: { weaken:10, doom:8 },
};

function _buildBattleState(usedEffects){
  return {
    allies: G.enemies.filter(e=>e&&e.hp>0).map(e=>({
      id:e.id, hp:e.hp, maxHp:e.maxHp, atk:e.atk, shield:e.shield||0,
      isBoss:!!(e.keywords&&e.keywords.includes('ボス')),
      isElite:!!(e.keywords&&e.keywords.includes('エリート')),
      keywords:e.keywords||[], position:G.enemies.indexOf(e), poison:e.poison||0,
    })),
    enemies: G.allies.filter(a=>a&&a.hp>0).map(a=>({
      id:a.id, hp:a.hp, maxHp:a.maxHp, atk:a.atk, shield:a.shield||0,
      isBoss:!!(a.keywords&&a.keywords.includes('ボス')),
      isElite:!!(a.keywords&&a.keywords.includes('エリート')),
      keywords:a.keywords||[], position:G.allies.indexOf(a), poison:a.poison||0,
    })),
    magicLevel: G.enemyMagicLevel||0,
    usedEffects: usedEffects||[],
  };
}

function _scoreEffect(effect, battleState, personality){
  const w = _PERSONALITY_WEIGHTS[personality] || _PERSONALITY_WEIGHTS.chaotic;
  const { allies, enemies, magicLevel } = battleState;
  switch(effect){
    case 'weaken':{
      const maxAtk = Math.max(...enemies.map(e=>e.atk), 0);
      return maxAtk * w.debuff * 1.5;
    }
    case 'doom':{
      const kills = enemies.filter(e=>e.hp<=magicLevel).length;
      return kills * w.kill * 10 + enemies.length * magicLevel * w.damage;
    }
    case 'shield_wand':{
      const unshielded = allies.filter(a=>a.shield===0);
      if(!unshielded.length) return 0;
      const mt = unshielded.reduce((a,b)=>a.hp<b.hp?a:b);
      return Math.max(10-mt.hp, 1) * w.sustain * 2;
    }
    case 'poison_wand':{
      const unpoisoned = enemies.filter(e=>e.poison===0);
      return unpoisoned.length * w.debuff;
    }
    case 'boost_atk': case 'boost':{
      const maxAllyAtk = Math.max(...allies.map(a=>a.atk), 0);
      return maxAllyAtk * w.buff;
    }
    case 'rally': case 'big_rally':{
      return allies.length * w.buff * 1.5;
    }
    case 'heal_ally':{
      const damaged = allies.filter(a=>a.hp<a.maxHp);
      return damaged.length * w.sustain * 2;
    }
    case 'flash_blade':{
      const eKills = enemies.filter(e=>e.hp<=1).length;
      return eKills * w.kill * 10 - allies.length * w.sustain * 2;
    }
    case 'swap_stats':{
      const swappable = enemies.filter(e=>e.atk<e.hp);
      if(!swappable.length) return -5;
      const best = swappable.reduce((a,b)=>(b.hp-b.atk)>(a.hp-a.atk)?b:a);
      return (best.hp - best.atk) * w.control;
    }
    case 'growth_wand':{
      const ungrown = allies.filter(a=>!a.keywords.some(k=>/^成長/.test(k)));
      return ungrown.length * w.buff * 1.2;
    }
    case 'sacrifice':{
      if(!allies.length) return -999;
      const weakest = allies.reduce((a,b)=>a.hp<b.hp?a:b);
      const totalDmg = enemies.length * (weakest.atk||0);
      return (weakest.hp<=1?5:-5) * w.sustain + totalDmg * w.damage;
    }
    case 'magic_book':{
      return magicLevel * w.damage + 5;
    }
    case 'sacrifice_doll':{
      const targets = enemies.filter(e=>!e.isBoss&&!e.isElite);
      if(!targets.length) return -999;
      const avgAtk = targets.reduce((s,e)=>s+e.atk,0)/targets.length;
      return avgAtk * w.kill * 2;
    }
    case 'counter_scroll':{
      const without = allies.filter(a=>!a.keywords.includes('反撃'));
      return without.length * w.buff * 1.5;
    }
    case 'purify_hate':{
      const poisoned = allies.filter(a=>a.poison>0);
      return poisoned.length * w.sustain * 3;
    }
    case 'revive':{
      const dead = G.enemies.filter(e=>e&&e.hp<=0&&e.maxHp>0);
      return dead.length * w.sustain * 4;
    }
    case 'golem': case 'double_hp': case 'spread':
      return 5 * w.buff;
    case 'fire': case 'meteor': case 'meteor_multi': case 'bomb':{
      const dmg = magicLevel||1;
      const kills = enemies.filter(e=>e.hp<=dmg).length;
      return kills * w.kill * 10 + enemies.length * dmg * w.damage * 0.5;
    }
    case 'instakill':
      return enemies.filter(e=>e.atk<=(magicLevel||0)).length * w.kill * 15;
    case 'hate': case 'seal': case 'nullify':
      return enemies.length>0 ? 5 * w.debuff : 0;
    default: return 0;
  }
}

function _getComboBonus(effect, usedEffects){
  let bonus = 0;
  for(const used of usedEffects){
    bonus += (_COMBO_SYNERGIES[used]?.[effect] ?? 0);
  }
  return bonus;
}

const _USE_THRESHOLD = 5;
const _CHAOS_NOISE   = 30;

function _chooseBestItem(hand, battleState, personality){
  if(!hand.length) return null;
  const scored = hand.map(item=>{
    let score = _scoreEffect(item.effect, battleState, personality);
    if(personality==='tactical') score += _getComboBonus(item.effect, battleState.usedEffects);
    if(personality==='chaotic')  score += Math.random() * _CHAOS_NOISE;
    return { item, score };
  });
  scored.sort((a,b)=>b.score-a.score);
  if(scored[0].score < _USE_THRESHOLD) return null;
  return scored[0].item;
}

// ── 敵オーナーフェイズ（全階層共通）────────────────

async function commanderPhase(){
  const _liveHand=(G.bossHand||[]).filter(s=>s&&(s.type!=='wand'||(s.usesLeft??1)>0));
  if(!_liveHand.length&&!_isBossFight) return;

  G.phase='commander';
  renderControls();
  log('👹 敵フェイズ','bad');
  // ボス指輪：ターン開始トリガー（ボス戦のみ）
  if(_isBossFight&&G.bossRings&&G.bossRings.length) fireBossRingTrigger('turn_start');

  // パーソナリティ・行動数を取得
  const _fd = FLOOR_DATA[G.floor]||{};
  const _personality = _fd.personality||'chaotic';
  const _actionCount = _fd.actionCount||1;
  const _usedEffects = [];

  for(let _ai=0; _ai<_actionCount; _ai++){
    const liveHand=(G.bossHand||[]).filter(s=>s&&(s.type!=='wand'||(s.usesLeft??1)>0));
    if(!liveHand.length) break;

    const _bs = _buildBattleState(_usedEffects);
    const chosen = _chooseBestItem(liveHand, _bs, _personality);
    if(!chosen) break;

    applyBossSpell(chosen);
    _usedEffects.push(chosen.effect);

    if(chosen.type==='wand'){
      chosen.usesLeft=(chosen.usesLeft??1)-1;
      if(chosen.usesLeft<=0){
        G.bossHand.splice(G.bossHand.indexOf(chosen),1);
        log(`敵の「${chosen.name}」チャージが切れた`,'sys');
      }
    } else {
      G.bossHand.splice(G.bossHand.indexOf(chosen),1);
    }

    if(_ai < _actionCount-1){ renderAll(); await sleep(400); }
  }

  renderAll();
  await sleep(700);
}

// ── プレイヤーフェイズ ────────────────────────

function startPlayerPhase(){
  G.phase='player';
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G.spreadActive=false;
  applyTurnStart();
  // 毒処理後も仲間が全滅していたらゲームオーバー
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){ setTimeout(()=>gameOver(),300); return; }
  renderAll();
  const liveA=G.allies.filter(a=>a&&a.hp>0&&!a._isSoul);
  setHint(liveA.length===0?'仲間がいない！魔法で倒すか撤退を':'行動を終えたらターン終了してください。');
}

// ── ターン開始時効果 ───────────────────────────

function applyTurnStart(){
  // パワーブレイク回復（1ターンのみ）
  G.enemies.forEach(e=>{
    if(e&&e.powerBroken){
      e.atk=e._savedAtk!==undefined?e._savedAtk:(e.baseAtk||0);
      e.powerBroken=false;
      delete e._savedAtk;
      log(`${e.name} のパワーブレイクが回復（ATK→${e.atk}）`,'sys');
    }
  });
  // 脱力回復（プレイヤーターン開始時にATK復元）
  [...G.enemies,...G.allies].forEach(u=>{
    if(u&&u._weakenedSavedAtk!==undefined){
      u.atk=(u.atk||0)+u._weakenedSavedAtk;
      log(`${u.name} の脱力が回復（ATK→${u.atk}）`,'sys');
      delete u._weakenedSavedAtk;
    }
  });

  // 指輪パッシブ（針など）
  G.rings.forEach(ring=>{
    if(!ring) return;
    if(ring.unique==='needle'){
      const dmg=G.turn||1; // X = 現在ターン数
      const ts=G.enemies.filter(e=>e&&e.hp>0); if(!ts.length) return;
      ts.forEach(e=>{ dealDmgToEnemy(e,dmg,G.enemies.indexOf(e)); });
      log(`🎯 針の指輪：全敵に${dmg}ダメージ（ターン${G.turn}）`,'good');
      if(checkInstantVictory()) return;
    }
  });
  // エインセル①・ヴィーザル：ターン開始時効果（敵）
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    if(e.effect==='einsel'||e.effect==='einsel_shieldlost'){
      const liveIdxs=G.enemies.map((u,i)=>u&&u.hp>0?i:-1).filter(i=>i>=0);
      if(liveIdxs.length){
        const r=G.enemies[liveIdxs[liveIdxs.length-1]];
        if(!r.shield) r.shield=1;
        log(`${e.name}：${r.name}にシールド+1`,'bad');
      }
    }
    if(e.effect==='vidar_turn'){
      G.enemies.forEach(f=>{ if(f&&f.hp>0){ f.atk+=2; f.hp+=2; f.maxHp+=2; }});
      log(`${e.name}：全仲間+2/+2`,'bad');
    }
  });
  // エインセル①・ヴィーザル：ターン開始時効果（味方）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    if(a.effect==='einsel'||a.effect==='einsel_shieldlost'){
      const liveIdxs=G.allies.map((u,i)=>u&&u.hp>0?i:-1).filter(i=>i>=0);
      if(liveIdxs.length){
        const r=G.allies[liveIdxs[liveIdxs.length-1]];
        if(!r.shield) r.shield=1;
        log(`${a.name}：${r.name}にシールド+1`,'good');
      }
    }
    if(a.effect==='vidar_turn'){
      const vv=2+(G.hasGoldenDrop?1:0);
      G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=vv; b.hp+=vv; b.maxHp+=vv; }});
      log(`${a.name}：全仲間+${vv}/+${vv}`,'good');
      triggerDryadBuff();
    }
  });
  // 城壁・ハーピーATK同期
  syncWallAtk();
  syncHarpyAtk();
  // patience 指輪：battle_start トリガーをターン開始時に発動
  if(G.rings&&G.rings.some(r=>r&&r.unique==='patience')) fireTrigger('battle_start');
  checkSolitudeBuff();
}

// ── 戦闘フェイズ（インターリーブ攻撃）─────────────

async function battlePhase(){
  G.phase='enemy';
  renderControls();
  log(`── T${G.turn} 戦闘フェイズ ──`,'sys');

  for(let i=0;i<6;i++){
    // 敵 i 番目の攻撃
    const enemy=G.enemies[i];
    if(enemy&&enemy.hp>0){
      await enemyAttackAction(enemy,i);
      if(_checkBattleOver()) return;
    }
    // 味方 i 番目の攻撃
    const ally=G.allies[i];
    if(ally&&ally.hp>0&&!ally._isSoul){
      await allyAttackAction(ally,i);
      if(_checkBattleOver()) return;
    }
  }

  // 全攻撃後：勝敗判定
  if(G.enemies.filter(e=>e&&e.hp>0).length===0){
    _onAllEnemiesDefeated();
    return;
  }
  const liveA=G.allies.filter(a=>a&&(a.hp>0));
  if(!liveA.length){ await sleep(200); gameOver(); return; }

  // 毒ティック（敵ターン終了時）
  const catRing=G.rings.find(r=>r&&r.unique==='catalyst');
  const catMult=catRing?(catRing.grade||1)+1:1;
  G.enemies.forEach(e=>{
    if(e&&e.poison>0&&e.hp>0){
      const dmg=e.poison*catMult;
      e.hp=Math.max(0,e.hp-dmg);
      log(`☠ ${e.name}が毒でHP-${dmg}${catMult>1?'（触媒×'+catMult+'）':''}（残HP:${e.hp}）`,'bad');
      if(e.hp<=0) processEnemyDeath(e,G.enemies.indexOf(e));
    }
  });
  if(checkInstantVictory()) return;
  G.allies.forEach(a=>{
    if(a&&a.poison>0&&a.hp>0){
      a.hp=Math.max(0,a.hp-a.poison);
      log(`☠ ${a.name}が毒でHP-${a.poison}（残HP:${a.hp}）`,'bad');
      if(a.hp<=0) processAllyDeath(a, G.allies.indexOf(a));
    }
  });
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){ await sleep(200); gameOver(); return; }
  renderAll();

  await sleep(400);
  await nextTurn();
}

function _checkBattleOver(){
  if(G.enemies.filter(e=>e&&e.hp>0).length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!G.allies.filter(a=>a&&(a.hp>0)).length){ setTimeout(()=>gameOver(),200); return true; }
  return false;
}

function _onAllEnemiesDefeated(){
  log('全敵撃破！','gold');
  G.moveMasks.forEach((_,i)=>{ if(G.moveMasks[i]&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i); });
  applyVictoryBonuses();
  G.phase='reward';
  updateHUD();
  setTimeout(()=>_handleVictory(),600);
}

// ── 味方攻撃アクション ──────────────────────────

function _applyAllyAttackEffects(ally){
  if(!ally||ally.hp<=0) return;
  const _gd=G.hasGoldenDrop?1:0;
  if(ally.effect==='elf_attack'||ally.effect==='elf_shield'){
    const v=1+_gd; ally.atk+=v; ally.baseAtk+=v;
    log(`${ally.name}：攻撃時+${v}/±0`,'good');
  }
  if(ally.effect==='brownie_attack'){
    const _hpGain=1+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=_hpGain; a.maxHp+=_hpGain; }});
    log(`${ally.name}：攻撃時→全仲間±0/+${_hpGain}`,'good');
  }
  if(ally.effect==='forniot'){
    const v=1+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=v; a.baseAtk=(a.baseAtk||0)+v; }});
    log(`${ally.name}：攻撃時→全仲間+${v}/±0`,'good');
  }
  if(ally.effect==='vampire_attack'){
    const va=2+_gd, vh=1+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0&&a.race==='不死'){ a.atk+=va; a.baseAtk=(a.baseAtk||0)+va; a.hp+=vh; a.maxHp+=vh; }});
    log(`${ally.name}：攻撃→全不死+${va}/+${vh}`,'good');
  }
  if(ally.effect==='sylph_attack'){
    const _si=G.allies.indexOf(ally); const _sv=1+_gd;
    [G.allies[_si-1],G.allies[_si+1]].forEach(b=>{ if(b&&b.hp>0){ b.atk+=_sv; b.baseAtk=(b.baseAtk||0)+_sv; }});
    log(`${ally.name}：攻撃→隣接仲間+${_sv}/±0`,'good');
  }
  if(ally.effect==='arachas_attack'){
    G.enemies.forEach(e=>{ if(e&&e.hp>0) e.poison=(e.poison||0)+1; });
    log(`${ally.name}：攻撃→全敵に毒牙1`,'good');
  }
  if(ally.effect==='dryad_attack'){
    const _liveA=G.allies.filter(a=>a&&a.hp>0&&a!==ally);
    for(let _di=0;_di<2&&_liveA.length>0;_di++){
      const _ti=Math.floor(Math.random()*_liveA.length);
      const _t=_liveA.splice(_ti,1)[0];
      const _dv=1+_gd; _t.atk+=_dv; _t.baseAtk=(_t.baseAtk||0)+_dv; _t.hp+=_dv; _t.maxHp+=_dv;
    }
    log(`${ally.name}：攻撃→ランダムな仲間2体に+${1+_gd}/+${1+_gd}`,'good');
  }
  if(ally.effect==='pegasus_attack'){
    const _rightmost=G.allies.filter(a=>a&&a.hp>0).pop();
    if(_rightmost){ const _pv=4+_gd; _rightmost.hp+=_pv; _rightmost.maxHp+=_pv; log(`${ally.name}：攻撃→右端の${_rightmost.name}に±0/+${_pv}`,'good'); }
  }
  if(ally.effect==='lizardman_attack'){
    const _lv=1+_gd; ally.hp+=_lv; ally.maxHp+=_lv;
    log(`${ally.name}：攻撃時±0/+${_lv}`,'good');
  }
  if(ally.effect==='specter_attack'){
    const _sv=1+_gd;
    G._specterBonus=(G._specterBonus||0)+_sv;
    log(`${ally.name}：攻撃→今後の「不死」に+${_sv}/+${_sv}（累計+${G._specterBonus}）`,'good');
  }
  if(ally.effect==='draug_attack'){
    // 攻撃後に処理（ターゲットはallyAttackActionで管理）- フラグで通知
    ally._draugJustAttacked=true;
  }
  // ウンディーネ：生存中の場合、攻撃した味方自身が+1/+1（ウンディーネ自身も含む）
  if(ally!==null&&G.allies.some(a=>a&&a.hp>0&&a.effect==='undine_passive')){
    const _uv=1+_gd; ally.atk+=_uv; ally.baseAtk=(ally.baseAtk||0)+_uv; ally.hp+=_uv; ally.maxHp+=_uv;
    log(`ウンディーネ：${ally.name}が+${_uv}/+${_uv}`,'good');
  }
}

function _applyEnemyAttackEffects(enemy){
  if(!enemy||enemy.hp<=0) return;
  if(enemy.effect==='forniot'){
    G.enemies.forEach(f=>{ if(f&&f.hp>0) f.atk+=1; });
    log(`${enemy.name}：攻撃時→全仲間+1/±0`,'bad');
  }
  if(enemy.effect==='elf_attack'||enemy.effect==='elf_shield'){
    enemy.atk+=1; log(`${enemy.name}：攻撃時+1/±0`,'bad');
  }
  if(enemy.effect==='brownie_attack'){
    G.enemies.forEach(f=>{ if(f&&f.hp>0){ f.hp+=1; f.maxHp+=1; }});
    log(`${enemy.name}：攻撃時→全仲間±0/+1`,'bad');
  }
  if(enemy.effect==='sylph_attack'){
    const _esi=G.enemies.indexOf(enemy);
    [G.enemies[_esi-1],G.enemies[_esi+1]].forEach(f=>{ if(f&&f.hp>0){ f.atk+=1; }});
    log(`${enemy.name}：攻撃→隣接+1/±0`,'bad');
  }
  if(enemy.effect==='arachas_attack'){
    G.allies.forEach(a=>{ if(a&&a.hp>0) a.poison=(a.poison||0)+1; });
    log(`${enemy.name}：攻撃→全仲間に毒牙1`,'bad');
  }
}

async function allyAttackAction(ally, allyIdx){
  if(ally.atk<=0) return; // ATK0は攻撃しない
  const liveE=G.enemies.filter(e=>e&&e.hp>0);
  if(!liveE.length) return;

  // アニメーション（代表ターゲット）
  const forcedT=liveE.find(e=>e.allyTarget);
  const target=forcedT||liveE[liveE.length-1];
  const eIdx=G.enemies.indexOf(target);
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[allyIdx];
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[eIdx];
  if(aSlot) aSlot.classList.add('glow-blue');
  if(eSlot) eSlot.classList.add('glow-red');
  await sleep(300);
  if(aSlot) aSlot.classList.remove('glow-blue');
  if(eSlot) eSlot.classList.remove('glow-red');

  if(ally.stealth){ ally.stealth=false; log(`${ally.name}の隠密が解除された`,'sys'); }

  // 攻撃時効果（ダメージを与える前に発動）
  if(ally.hp>0) _applyAllyAttackEffects(ally);

  // 全体攻撃キーワード：全ての敵を攻撃
  const isGlobal=ally.keywords&&ally.keywords.includes('全体攻撃');
  const attackTargets=isGlobal?[...liveE]:[target];

  attackTargets.forEach(t=>{
    const ti=G.enemies.indexOf(t);
    dealDmgToEnemy(t,ally.atk,ti,ally);
    // 敵の反撃
    if(t.hp>0&&t.keywords&&t.keywords.includes('反撃')&&ally.hp>0){
      dealDmgToAlly(ally,t.atk,allyIdx,t);
      log(`⚔ ${t.name}の反撃：${ally.name}に${t.atk}ダメ`,'bad');
    }
  });
  log(`${ally.name}(${ally.atk})→${isGlobal?'全敵':target.name}`);

  // 多段攻撃（三段=×2、二段=×1）：ターゲットが死亡した場合は新ターゲットへ
  if(ally.hp>0&&!isGlobal){
    const extraHits=ally.keywords&&ally.keywords.includes('三段攻撃')?2:ally.keywords&&ally.keywords.includes('二段攻撃')?1:0;
    let curTgt=target;
    for(let hi=0;hi<extraHits;hi++){
      if(!curTgt||curTgt.hp<=0){
        const _newLiveE=G.enemies.filter(e=>e&&e.hp>0);
        if(!_newLiveE.length) break;
        const _newForced=_newLiveE.find(e=>e.allyTarget);
        curTgt=_newForced||_newLiveE[_newLiveE.length-1];
      }
      if(!curTgt||curTgt.hp<=0) break;
      // 攻撃時効果（各段攻撃ごとに発動）
      if(ally.hp>0) _applyAllyAttackEffects(ally);
      dealDmgToEnemy(curTgt,ally.atk,G.enemies.indexOf(curTgt),ally);
      log(`${ally.name}：${hi+2}段目→${curTgt.name}`,'good');
    }
  }

  // ドラウグ：攻撃した敵に毒3を付与
  if(ally.hp>0&&ally._draugJustAttacked){
    delete ally._draugJustAttacked;
    const _draugTgt=target.hp>0?target:(G.enemies.filter(e=>e&&e.hp>0).pop());
    if(_draugTgt){ _draugTgt.poison=(_draugTgt.poison||0)+3+(G.hasGoldenDrop?1:0); log(`${ally.name}：攻撃した敵に毒3`,'good'); }
  }

  renderAll();
  await sleep(300);
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;

  // 行動不能（封印）：このターンはスキップしてカウンタを減らす
  if(enemy.sealed>0){
    enemy.sealed--;
    log(`${enemy.name}：行動不能`,'sys');
    return;
  }

  // ターゲット選択：標的持ち全員 or 最右端（隠密除外）
  const hateTgts=liveA.filter(a=>a.hate&&a.hateTurns>0&&!a.stealth);
  const visibleA=liveA.filter(a=>!a.stealth);
  const candidates=visibleA.length?visibleA:liveA;
  const targets=hateTgts.length>0?hateTgts:[candidates[candidates.length-1]];
  const primaryIdx=G.allies.indexOf(targets[0]);

  // アニメーション（先頭ターゲット代表）
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[enemyIdx];
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[primaryIdx];
  if(eSlot) eSlot.classList.add('glow-blue');
  if(aSlot) aSlot.classList.add('glow-red');
  await sleep(300);
  if(eSlot) eSlot.classList.remove('glow-blue');
  if(aSlot) aSlot.classList.remove('glow-red');

  const atkVal=enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;

  // 攻撃時効果（フォルニョート・エルフ等、敵陣営版）
  if(atkVal>0&&enemy.hp>0) _applyEnemyAttackEffects(enemy);

  // 全体攻撃キーワード：全ての味方を攻撃
  const isGlobalAtk=enemy.keywords&&enemy.keywords.includes('全体攻撃');
  const liveAllForGlobal=G.allies.filter(a=>a&&a.hp>0&&!a.stealth);
  const finalTargets=isGlobalAtk?liveAllForGlobal:targets;

  // 全ターゲットを攻撃
  const hitNames=[];
  const hitSet=new Set();
  finalTargets.forEach(tgt=>{
    const aIdx=G.allies.indexOf(tgt);
    if(!hitSet.has(tgt.id)){
      const _dmgPassed=dealDmgToAlly(tgt,atkVal,aIdx,enemy);
      hitSet.add(tgt.id);
      // キーワード効果：ダメージが通った場合のみ（シールドブロック時は発動しない）
      if(_dmgPassed&&tgt.hp>0) applyKeywordOnHit(enemy,tgt);
    }
    hitNames.push(tgt.name);
  });

  log(`${enemy.name}(${atkVal})→${isGlobalAtk?'全体':hitNames.join('・')}`);

  // 多段攻撃キーワード（三段=×2、二段=×1）：ターゲットが死亡した場合は新ターゲットへ
  if(!isGlobalAtk&&enemy.hp>0){
    const extraHits=enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0;
    let reTgt=finalTargets[0];
    for(let hi=0;hi<extraHits;hi++){
      if(!reTgt||reTgt.hp<=0){
        const nextLive=G.allies.filter(a=>a&&a.hp>0&&!a.stealth);
        if(!nextLive.length) break;
        const nextHate=nextLive.filter(a=>a.hate&&a.hateTurns>0);
        reTgt=nextHate.length>0?nextHate[nextHate.length-1]:nextLive[nextLive.length-1];
      }
      if(!reTgt||reTgt.hp<=0) break;
      // 攻撃時効果（各段攻撃ごとに発動）
      if(enemy.hp>0) _applyEnemyAttackEffects(enemy);
      const _dmgPassed2=dealDmgToAlly(reTgt,enemy.atk,G.allies.indexOf(reTgt),enemy);
      if(_dmgPassed2&&reTgt.hp>0) applyKeywordOnHit(enemy,reTgt);
      log(`${enemy.name}：${hi+2}段目→${reTgt.name}`,'bad');
    }
  }

  // 標的ターン消費
  G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });

  renderAll();
  await sleep(300);
}

// ── 味方へのダメージ処理 ─────────────────────────

// 戻り値：ダメージが通った(true) / 0ダメまたはシールドでブロック(false)
function dealDmgToAlly(unit, dmg, _fieldIdx, src){
  if(!unit||unit.hp<=0) return false;

  // 0ダメ（封印・無効化）：反撃は攻撃行為に対して発動（生存確定なので発動OK）
  if(dmg<=0){
    if(unit.counter&&src&&unit.hp>0){
      const srcIdx=G.enemies.indexOf(src);
      if(srcIdx>=0){ dealDmgToEnemy(src,unit.atk,srcIdx,unit); log(`⚔ ${unit.name}の反撃：${src.name}に${unit.atk}ダメ`,'good'); }
    }
    return false;
  }

  // シールド
  if(unit.shield>0){
    unit.shield--;
    log(`🛡 ${unit.name}のシールドがダメージを防いだ（残${unit.shield}）`,'sys');
    onAllyShieldLost();
    // 反撃：シールドで防いでも生き残っているので発動
    if(unit.counter&&src&&unit.hp>0){
      const srcIdx=G.enemies.indexOf(src);
      if(srcIdx>=0){ dealDmgToEnemy(src,unit.atk,srcIdx,unit); log(`⚔ ${unit.name}の反撃：${src.name}に${unit.atk}ダメ`,'good'); }
    }
    return false; // ダメージをシールドで防いだ
  }

  // ガーゴイル：味方全体のダメージを-1（ガーゴイル自身も含む）
  const _gargoyleReduction=G.allies.some(a=>a&&a.hp>0&&a.effect==='gargoyle_shield')?1:0;
  // 呪詛加算
  const actualDmg=Math.max(0, dmg - _gargoyleReduction)+(unit.curse||0);
  unit.hp=Math.max(0,unit.hp-actualDmg);

  // 負傷トリガー：生き残った場合のみ発動
  const willDie=unit.hp<=0;
  if(unit.injury&&!willDie){
    triggerInjury(unit, actualDmg);
  }

  // 反撃：ダメージを受けて生き残った場合のみ発動
  if(!willDie&&unit.counter&&src&&unit.hp>0){
    const srcIdx=G.enemies.indexOf(src);
    if(srcIdx>=0){ dealDmgToEnemy(src,unit.atk,srcIdx,unit); log(`⚔ ${unit.name}の反撃：${src.name}に${unit.atk}ダメ`,'good'); }
  }

  if(willDie){ unit.hp=0; processAllyDeath(unit); } // 負傷でHP回復しても死亡確定
  return true; // ダメージが通った
}

// ── 味方の死亡処理 ──────────────────────────────

function processAllyDeath(unit){
  if(unit.hp>0||unit._deathProcessed) return;
  unit._deathProcessed=true;

  log(`${unit.name} が倒れた…`,'bad');
  G.battleCounters.deaths++;
  checkSolitudeBuff();

  // 石像効果
  if(unit.onDeath==='stone_death'){
    const stB=2;
    G.allies.forEach(a=>{ if(a&&a.id!==unit.id&&a.hp>0){ a.hp+=stB; a.maxHp+=stB; }});
    log(`🗿 石像効果：全仲間ライフ+${stB}`,'good');
    triggerDryadBuff();
  }

  // レイス：死亡時、全ての敵に攻撃力に等しいダメージを与える
  if(unit.effect==='wraith_death'){
    const x=(unit.atk||0);
    if(x>0){
      const _wrCopy=[...G.enemies];
      _wrCopy.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,x,ei); });
      log(`${unit.name}：死亡→全ての敵に${x}ダメ`,'good');
    }
  }
  // スケルトン：死亡時に0/4の「骨」を即座に召喚
  if(unit.effect==='skeleton_bone'){
    const _boneDef={id:'c_bone',name:'骨',race:'不死',grade:unit.grade||1,atk:0,hp:4,cost:0,unique:false,icon:'🦴',desc:''};
    const _boneSlot=G.allies.findIndex(a=>!a||a.hp<=0);
    if(_boneSlot>=0){
      G.allies[_boneSlot]=makeUnitFromDef(_boneDef);
      log(`${unit.name}：死亡→骨(0/4)を召喚`,'good');
      checkSolitudeBuff();
    }
  }
  // ファントム：アク以外の仲間が死んだ時、0/1不死の「アク」を召喚
  if(unit.name!=='アク'){
    G.allies.forEach(ph=>{
      if(!ph||ph.hp<=0||ph.effect!=='phantom_onallydie') return;
      const akDef={id:'c_aku',name:'アク',race:'不死',grade:ph.grade||1,atk:0,hp:1,cost:0,unique:false,icon:'🌑',desc:''};
      const empty=G.allies.findIndex(s=>!s||s.hp<=0);
      if(empty>=0){ G.allies[empty]=makeUnitFromDef(akDef); log(`${ph.name}：${unit.name}の死→アク(0/1)を召喚`,'good'); checkSolitudeBuff(); }
    });
  }
  // ナグルファル：キャラクター死亡ごとに+2/+1
  _onAnyCharDeath();
}

function _onAnyCharDeath(){
  const _gd0=G.hasGoldenDrop?1:0;
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&a.effect==='naglfar_ondeath'){
      const nv=2+_gd0, nhv=1+_gd0;
      a.atk+=nv; a.baseAtk=(a.baseAtk||0)+nv; a.hp+=nhv; a.maxHp+=nhv;
      log(`${a.name}：キャラ死亡→+${nv}/+${nhv}`,'good');
    }
    // ゴースト：他のキャラクターが死亡するたびに+1/+1
    if(a&&a.hp>0&&a.effect==='ghost_ondeath'){
      const gv=1+_gd0;
      a.atk+=gv; a.baseAtk=(a.baseAtk||0)+gv; a.hp+=gv; a.maxHp+=gv;
      log(`${a.name}：キャラ死亡→+${gv}/+${gv}`,'good');
    }
  });
  G.enemies.forEach(e=>{
    if(e&&e.hp>0&&e.effect==='naglfar_ondeath'){
      e.atk+=2; e.hp+=1; e.maxHp+=1;
      log(`${e.name}：キャラ死亡→+2/+1`,'bad');
    }
    if(e&&e.hp>0&&e.effect==='ghost_ondeath'){
      e.atk+=1; e.hp+=1; e.maxHp+=1;
      log(`${e.name}：キャラ死亡→+1/+1`,'bad');
    }
  });
}

// ── 負傷トリガー ──────────────────────────────

function triggerInjury(unit, dmg=0){
  // 自陣・敵陣を自動判定（憑依済みでも正しく処理）
  const isEnemy=G.enemies.indexOf(unit)>=0;
  const ownSide =isEnemy?G.enemies:G.allies;
  const oppSide =isEnemy?G.allies :G.enemies;
  const col=isEnemy?'bad':'good';
  const rgDef={id:'c_royal_guard',name:'ロイヤルガード',race:'獣',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'💂',desc:'反撃',counter:true};
  switch(unit.injury){
    case 'mummy':{
      const _mv=1+(G.hasGoldenDrop?1:0);
      G._undeadHpBonus=(G._undeadHpBonus||0)+_mv;
      G.enemyUndeadAtkBonus=(G.enemyUndeadAtkBonus||0)+_mv;
      log(`${unit.name}：今後現れる不死が+${_mv}/±0（累計+${G._undeadHpBonus}）`,col);
      break;
    }
    case 'freyr':{
      // 最も右の空きスロットにストーンキャットを召喚（自陣）
      const scDef={id:'c_stone_cat',name:'ストーンキャット',race:'-',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'🗿',desc:'反撃　アーティファクト',counter:true,keywords:['アーティファクト']};
      const freeIdx=ownSide.map((a,i)=>(!a||a.hp<=0)?i:-1).filter(i=>i>=0);
      if(freeIdx.length){
        const slot=freeIdx[freeIdx.length-1];
        ownSide[slot]=makeUnitFromDef(scDef);
        log(`${unit.name}：ストーンキャット(4/6+反撃)を召喚`,col);
        if(!isEnemy) checkSolitudeBuff();
      }
      break;
    }
    case 'worm':{
      const _wv=1+(G.hasGoldenDrop&&!isEnemy?1:0);
      ownSide.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_wv; a.baseAtk=(a.baseAtk||0)+_wv; }});
      log(`${unit.name}：負傷→全仲間+${_wv}/±0`,col);
      if(!isEnemy){
        // リンドヴルム：仲間の負傷発動時、全仲間竜+1/+1
        const _lv=1+(G.hasGoldenDrop?1:0);
        G.allies.forEach(lw=>{ if(lw&&lw.hp>0&&lw.effect==='lindworm_injury'){ G.allies.forEach(d=>{ if(d&&d.hp>0&&d.race==='竜'){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }}); log(`${lw.name}：仲間負傷→全仲間の竜+${_lv}/+${_lv}`,'good'); }});
        triggerDryadBuff();
      }
      break;
    }
    case 'minotaur':{
      const mts=oppSide.filter(u=>u&&u.hp>0);
      if(mts.length){
        const mt=randFrom(mts);
        if(isEnemy) dealDmgToAlly(mt,unit.atk,G.allies.indexOf(mt),unit);
        else dealDmgToEnemy(mt,unit.atk,G.enemies.indexOf(mt),unit);
        log(`${unit.name}：負傷→ランダムな相手に攻撃`,col);
      }
      break;
    }
    case 'lizardman':{
      const ts=oppSide.filter(u=>u&&u.hp>0);
      if(ts.length){
        const t=randFrom(ts);
        if(isEnemy) dealDmgToAlly(t,unit.baseAtk,G.allies.indexOf(t),unit);
        else dealDmgToEnemy(t,unit.baseAtk,G.enemies.indexOf(t),unit);
      }
      break;
    }
    case 'kettcat':{
      const def={id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:1,atk:1,hp:2,cost:0,unique:false,icon:'🐱',desc:''};
      const ei=ownSide.findIndex(a=>!a||a.hp<=0);
      if(ei>=0){ ownSide[ei]=makeUnitFromDef(def); log(`${unit.name}：ナイトキャット(1/2)を召喚`,col); if(!isEnemy) checkSolitudeBuff(); }
      break;
    }
    case 'ran':{
      // 10/X（X=被ダメージ）の「海の眷属」を左端に召喚（自陣）
      const ranHp=Math.max(1,dmg);
      const ranDef={id:'c_ran_spawn',name:'海の眷属',race:'亜人',grade:unit.grade||1,atk:10,hp:ranHp,cost:0,unique:false,icon:'🐚',desc:''};
      const ri=ownSide.findIndex(a=>!a||a.hp<=0);
      if(ri>=0){ ownSide[ri]=makeUnitFromDef(ranDef); log(`${unit.name}：海の眷属(10/${ranHp})を召喚`,col); if(!isEnemy) checkSolitudeBuff(); }
      break;
    }
    case 'limslus':{
      // 負傷：敵（opposing side）全体に3ダメ
      const _ldmg=3+(!isEnemy&&G.hasGoldenDrop?1:0);
      oppSide.forEach((u,ui)=>{
        if(!u||u.hp<=0) return;
        if(isEnemy) dealDmgToAlly(u,_ldmg,ui,unit);
        else dealDmgToEnemy(u,_ldmg,ui,unit);
      });
      log(`${unit.name}：負傷→相手全体に${_ldmg}ダメ`,col);
      break;
    }
    case 'banshee':{
      // 「バンシー」以外の全キャラに1ダメ
      const _bdmg=1+(!isEnemy&&G.hasGoldenDrop?1:0);
      [...G.allies,...G.enemies].forEach(u=>{
        if(!u||u.hp<=0||u===unit) return;
        const _bi=G.allies.includes(u)?G.allies.indexOf(u):G.enemies.indexOf(u);
        if(G.allies.includes(u)) dealDmgToAlly(u,_bdmg,_bi,unit);
        else dealDmgToEnemy(u,_bdmg,_bi,unit);
      });
      log(`${unit.name}：負傷→全キャラに${_bdmg}ダメ`,col);
      break;
    }
    case 'warg':{
      // 全ての仲間の獣が+1/+1
      const _wgv=1+(!isEnemy&&G.hasGoldenDrop?1:0);
      ownSide.forEach(a=>{ if(a&&a.hp>0&&a.race==='獣'){ a.atk+=_wgv; a.baseAtk=(a.baseAtk||0)+_wgv; a.hp+=_wgv; a.maxHp+=_wgv; }});
      log(`${unit.name}：負傷→全仲間の獣+${_wgv}/+${_wgv}`,col);
      break;
    }
    case 'alp':{
      // 敵の場に0/1「ソウルボム」を召喚
      const _alpDef={id:'c_soul_bomb',name:'ソウルボム',race:'精霊',grade:1,atk:0,hp:1,cost:0,unique:false,icon:'💣',desc:''};
      const _alpSlot=oppSide.findIndex(a=>!a||a.hp<=0);
      if(_alpSlot>=0){
        oppSide[_alpSlot]=makeUnitFromDef(_alpDef);
        log(`${unit.name}：負傷→ソウルボム(0/1)を敵陣に召喚`,col);
      }
      break;
    }
    case 'hydra':{
      // 自身+2/+2
      const _hdv=2+(!isEnemy&&G.hasGoldenDrop?1:0);
      unit.atk+=_hdv; unit.baseAtk=(unit.baseAtk||0)+_hdv; unit.hp+=_hdv; unit.maxHp+=_hdv;
      log(`${unit.name}：負傷→+${_hdv}/+${_hdv}`,col);
      break;
    }
  }
  // リンドヴルム：仲間の負傷発動時（worm以外）、全仲間竜+1/+1
  if(!isEnemy && unit.injury !== 'worm'){
    const _lv=1+(G.hasGoldenDrop?1:0);
    G.allies.forEach(lw=>{ if(lw&&lw.hp>0&&lw.effect==='lindworm_injury'){ G.allies.forEach(d=>{ if(d&&d.hp>0&&d.race==='竜'){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }}); log(`${lw.name}：仲間負傷→全仲間の竜+${_lv}/+${_lv}`,'good'); }});
  }
}

// ── シールド喪失時 ──────────────────────────────

function onAllyShieldLost(){
  // エインセル②：味方がシールドを失うと+1/+2を得る
  const _gde=G.hasGoldenDrop?1:0;
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&(a.effect==='einsel'||a.effect==='einsel_shieldlost')){
      const ea=1+_gde, eh=2+_gde;
      a.atk+=ea; a.baseAtk+=ea; a.hp+=eh; a.maxHp+=eh;
      log(`${a.name}：シールド喪失→+${ea}/+${eh}`,'good');
      triggerDryadBuff();
    }
  });
}

function onEnemyShieldLost(){
  // エインセル（敵）：仲間がシールドを失うと+1/+2
  G.enemies.forEach(f=>{
    if(f&&f.hp>0&&(f.effect==='einsel'||f.effect==='einsel_shieldlost')){
      f.atk+=1; f.hp+=2; f.maxHp+=2;
      log(`${f.name}：シールド喪失→+1/+2`,'bad');
    }
  });
}

// ── 戦闘開始時キャラクター効果 ───────────────────

function onBattleStart(){
  // ① 敵指輪の自動効果
  if(G.bossRings&&G.bossRings.length) fireBossRingTrigger('battle_start');

  // ② プレイヤー指輪の自動効果
  // 絆の指輪：全仲間に「結束X」キーワードを一時付与（戦闘終了時に削除）
  const _bondRing=G.rings&&G.rings.find(r=>r&&r.unique==='bond');
  if(_bondRing){
    const _bx=_bondRing.grade||1;
    G.allies.forEach(a=>{ if(a&&a.hp>0&&!a._bondKw){ a.keywords=(a.keywords||[]).concat([`結束${_bx}`]); a._bondKw=`結束${_bx}`; }});
  }
  // patience 指輪がない場合、battle_start 指輪トリガーを発火（召喚ユニット生成）
  const _hasPatience=G.rings&&G.rings.some(r=>r&&r.unique==='patience');
  if(!_hasPatience) fireTrigger('battle_start');
  // 憤激の指輪：全召喚完了後に全仲間へ+3/±0（召喚ユニットにも適用）
  G.rings.forEach(r=>{
    if(r&&r.unique==='fury_start'){
      const fb=3*(r.grade||1);
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=fb; a.baseAtk+=fb; }});
      log(`憤激の指輪：全仲間パワー+${fb}/±0`,'good');
      triggerDryadBuff();
    }
  });

  // ③ 敵キャラクターの自動効果
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0||!e.effect) return;
    switch(e.effect){
      case 'mermaid_start':
        G.magicLevel++; log(`${e.name}：魔術レベル+1`,'bad'); break;
      case 'homunculus_start':
        if(!e.shield) e.shield=1; log(`${e.name}：シールドを得た`,'bad'); break;
      case 'manigans_start':
        G.enemies.forEach(f=>{ if(f&&f.hp>0&&!f.shield) f.shield=1; });
        log(`${e.name}：全仲間にシールドを付与`,'bad'); break;
      case 'gremlin_start':{
        const liveA=G.allies.filter(a=>a&&a.hp>0);
        if(liveA.length){
          const top=randFrom(liveA);
          const eHp=e.hp; const aHp=top.hp;
          e.hp=aHp; e.maxHp=Math.max(e.maxHp,aHp); top.hp=eHp;
          log(`${e.name}：${top.name}とライフを入れ替え（${eHp}⇔${aHp}）`,'bad');
        }
        break;
      }
      case 'salamander_start':
        G.allies.forEach(a=>{ if(a&&a.hp>0) dealDmgToAlly(a,4,G.allies.indexOf(a),e); });
        log(`${e.name}：開幕全仲間に4ダメ`,'bad');
        break;
      case 'minotaur_start':
        if(G.allies.some(a=>a&&a.boss)){
          G._minotaurBonus=(G._minotaurBonus||0)+1;
          log(`${e.name}：ボスと対戦→行動回数+1`,'bad');
        }
        break;
    }
  });
  // 結束X（敵側）
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    const kw=(e.keywords||[]).find(k=>/^結束\d+$/.test(k));
    if(kw){ const x=parseInt(kw.slice(2)); G.enemies.forEach(f=>{ if(f&&f.hp>0){ f.atk+=x; f.hp+=x; f.maxHp+=x; }}); log(`${e.name}：結束${x}→全仲間+${x}/+${x}`,'bad'); }
  });

  // ④ プレイヤーキャラクターの自動効果
  G.allies.forEach((a)=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'gremlin_start':
        { const _gdGrem=G.hasGoldenDrop?1:0; const _gmv=1+_gdGrem;
          G.enemies.forEach(e=>{ if(e&&e.hp>0){ e.atk=Math.max(0,e.atk-_gmv); e.baseAtk=Math.max(0,(e.baseAtk||0)-_gmv); }});
          log(`${a.name}：開戦→全敵-${_gmv}/±0`,'good'); }
        break;
      case 'mermaid_start':
        { const _mv=1+(G.hasGoldenDrop?1:0); onMagicLevelUp(_mv); log(`${a.name}：魔術レベル+${_mv}（Lv${G.magicLevel}）`,'good'); } break;
      case 'manigans_start':
        G.allies.forEach(b=>{ if(b&&b.hp>0&&!b.shield) b.shield=1; });
        log(`${a.name}：全仲間にシールドを付与`,'good'); break;
      case 'jackalope_start':
        { const _herb=SPELL_POOL.find(s=>s.effect==='heal_ally');
          if(_herb){ const _hi=G.spells.findIndex(s=>!s); if(_hi>=0){ G.spells[_hi]=clone(_herb); log(`${a.name}：治癒の薬を入手`,'good'); }} }
        break;
      case 'drake_start':
        { const _dkdmg=1+(G.hasGoldenDrop?1:0);
          [...G.allies,...G.enemies].forEach(u=>{ if(!u||u.hp<=0) return; const _ui=G.allies.includes(u)?G.allies.indexOf(u):G.enemies.indexOf(u); if(G.allies.includes(u)) dealDmgToAlly(u,_dkdmg,_ui,a); else dealDmgToEnemy(u,_dkdmg,_ui,a); });
          log(`${a.name}：開戦→全キャラに${_dkdmg}ダメ`,'good'); }
        break;
      case 'salamander_start':
        { const _sdmg=4+(G.hasGoldenDrop?1:0); G.enemies.forEach(e=>{ if(e&&e.hp>0) dealDmgToEnemy(e,_sdmg,G.enemies.indexOf(e),a); }); log(`${a.name}：開幕全敵に${_sdmg}ダメ`,'good'); }
        break;
      case 'minotaur_gradeup':
        { const _mg=1+(G.hasGoldenDrop?1:0);
          G._gradeUpCostBonus=(G._gradeUpCostBonus||0)+_mg;
          log(`${a.name}：グレードアップコスト-${_mg}（累計-${G._gradeUpCostBonus}）`,'good'); }
        break;
      case 'jack_start':
        { const _liveJ=G.allies.filter(b=>b&&b.hp>0&&!b.shield&&b!==a);
          if(_liveJ.length){ const _jt=randFrom(_liveJ); _jt.shield=1; log(`${a.name}：${_jt.name}にシールドを付与`,'good'); } }
        break;
      case 'shadow_start':
        { const _shadowIdx=G.allies.indexOf(a);
          const _frontE=G.enemies[_shadowIdx]||(G.enemies.find(e=>e&&e.hp>0));
          if(_frontE&&_frontE.hp>0){
            a.name=_frontE.name; a.icon=_frontE.icon; a.race=_frontE.race||'-';
            a.atk=_frontE.atk; a.baseAtk=_frontE.atk;
            a.hp=_frontE.hp; a.maxHp=_frontE.hp;
            if(_frontE.keywords&&_frontE.keywords.length) a.keywords=[..._frontE.keywords];
            if(_frontE.counter) a.counter=true;
            log(`${_frontE.name}に変身！（${a.atk}/${a.hp}）`,'good');
          }
          a.effect=null; // 変身後は effect を削除 }
        }
        break;
      case 'homunculus_start':
        { const _races=new Set(G.allies.filter(b=>b&&b.hp>0&&b!==a&&b.race&&b.race!=='-').map(b=>b.race));
          const _hx=_races.size+(G.hasGoldenDrop?1:0);
          if(_hx>0){ a.atk+=_hx; a.baseAtk=(a.baseAtk||0)+_hx; a.hp+=_hx; a.maxHp+=_hx; log(`${a.name}：種族数${_races.size}→+${_hx}/+${_hx}`,'good'); } }
        break;
      case 'frost_start':
        { const _fsi=G.allies.indexOf(a);
          const _fe=G.enemies[_fsi]||(G.enemies.find(e=>e&&e.hp>0));
          if(_fe&&_fe.hp>0){ _fe.sealed=(_fe.sealed||0)+1; log(`${a.name}：正面の${_fe.name}を1T行動不能に`,'good'); } }
        break;
      case 'sea_serpent_start':
        { const _sdmg2=2+(G.hasGoldenDrop?1:0);
          G.enemies.forEach(e=>{ if(e&&e.hp>0) dealDmgToEnemy(e,_sdmg2,G.enemies.indexOf(e),a); });
          log(`${a.name}：開戦→全敵に${_sdmg2}ダメ`,'good'); }
        break;
      case 'golden_goose_start':
        { const _ggDef={id:'c_golden_egg',name:'ゴールデンエッグ',race:'獣',grade:1,atk:0,hp:1,cost:0,unique:false,icon:'🥚',desc:''};
          const _ggi=G.allies.findIndex(b=>!b||b.hp<=0);
          if(_ggi>=0){ G.allies[_ggi]=makeUnitFromDef(_ggDef); log(`${a.name}：ゴールデンエッグ(0/1)を召喚`,'good'); checkSolitudeBuff(); } }
        break;
    }
  });
  // 結束X：戦闘開始時、全味方+X/+X（味方側）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const kw=(a.keywords||[]).find(k=>/^結束\d+$/.test(k));
    if(kw){ const x=parseInt(kw.slice(2))+(G.hasGoldenDrop?1:0); G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=x; b.hp+=x; b.maxHp+=x; }}); log(`${a.name}：結束${x}→全味方+${x}/+${x}`,'good'); triggerDryadBuff(); }
  });
  // harpy_magic：魔術レベルが確定した後にATKを同期
  syncHarpyAtk();
}

// ── 戦闘終了時処理（勝利・撤退共通）────────────────

function onBattleEnd(){
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


  // ドラゴネット：3回目の戦闘終了時にランダムなG2竜へ変身
  G.allies.forEach((a,i)=>{
    if(!a||a.effect!=='dragonet_end') return;
    a._dragonetCount=(a._dragonetCount||0)+1;
    if(a._dragonetCount>=(3+(a._dragonetBonus||0))){
      const _g2dragons=UNIT_POOL.filter(u=>u.race==='竜'&&(u.grade||1)>=2&&u.id!=='c_dragonet');
      const _target=_g2dragons.length?randFrom(_g2dragons):UNIT_POOL.find(u=>u.id==='c_worm');
      if(_target){
        const w=clone(_target); w._isChar=true; w.maxHp=w.hp;
        G.allies[i]=w;
        log(`🐲 ドラゴネット：3戦目→${w.name}に変身！`,'gold');
      }
    } else {
      log(`🐲 ドラゴネット：変身まで${(3+(a._dragonetBonus||0))-a._dragonetCount}戦`,'sys');
    }
  });

  // ラミア：戦闘終了時、魔術レベル5（黄金の雫：6）につきソウル1（黄金の雫：2）を得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='lamia_end') return;
    const _lt=5+(G.hasGoldenDrop?1:0); const _lg=1+(G.hasGoldenDrop?1:0);
    const bonus=Math.floor((G.magicLevel||1)/_lt)*_lg;
    if(bonus>0){ G.gold+=bonus; log(`🐍 ラミア：魔術Lv${G.magicLevel}→ソウル+${bonus}`,'gold'); }
  });

  // gnome_end（ホムンクルス等）：戦闘終了時、2ソウル（黄金の雫：3）を得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='gnome_end') return;
    const _gv=2+(G.hasGoldenDrop?1:0);
    G.gold+=_gv; log(`${a.name}：終戦→ソウル+${_gv}`,'gold');
  });
  // ゾンビ：戦闘終了時、±0/+3（黄金の雫：+4）を得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='zombie_end') return;
    const zv=3+(G.hasGoldenDrop?1:0);
    a.hp+=zv; a.maxHp+=zv;
    log(`${a.name}：終戦±0/+${zv}`,'good');
  });

  // 絆の指輪：一時付与した「結束X」キーワードを削除
  G.allies.forEach(a=>{ if(a&&a._bondKw){ a.keywords=(a.keywords||[]).filter(k=>k!==a._bondKw); delete a._bondKw; }});

  // 成長X：戦闘終了時、+X/+Xを得る（生存時のみ）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const growKw=a.keywords&&a.keywords.find(k=>/^成長\d+$/.test(k));
    if(!growKw) return;
    const x=parseInt(growKw.slice(2))+(G.hasGoldenDrop?1:0);
    a.atk+=x; a.baseAtk=(a.baseAtk||0)+x; a.hp+=x; a.maxHp+=x;
    log(`🌱 ${a.name} 成長${x}：+${x}/+${x}`,'good');
    triggerDryadBuff();
  });

  // 死亡ユニット（再生・復活で回復しなかった）をフィールドから除去
  for(let i=0;i<G.allies.length;i++){
    const a=G.allies[i];
    if(a&&a.hp<=0) G.allies[i]=null;
  }
}

// ── 勝利ボーナス ───────────────────────────────

function applyVictoryBonuses(){
  // 生命の指輪：全ての味方が±0/+1を得る
  G.rings.forEach(r=>{
    if(r&&r.unique==='life_reg'){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=1; a.maxHp+=1; }});
      log(`生命の指輪：全仲間ライフ+1`,'good');
      triggerDryadBuff();
    }
  });

  // ステージ突破ボーナス
  const fl=G.floor;
  const _sib=G._soulIncomeBonus||0;
  const stageBonus=(fl>=15?4:fl>=10?3:fl>=5?2:1)+_sib;
  G.gold+=stageBonus; G.earnedGold+=stageBonus;
  log(`ステージ突破ボーナス：${stageBonus}ソウル`+(_sib>0?`（+${_sib}魔神）`:''),'gold');

  onBattleEnd();
}

// ── スペル使用後の勝利チェック ──────────────────

function checkInstantVictory(){
  if(G.phase==='player'&&G.enemies.filter(e=>e&&e.hp>0).length===0){
    G.moveMasks.forEach((_,i)=>{ if(G.moveMasks[i]&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i); });
    applyVictoryBonuses();
    log('全敵撃破！','gold');
    updateHUD(); renderAll();
    G.phase='reward';
    setTimeout(()=>_handleVictory(),400);
    return true;
  }
  return false;
}

// ── キーワード効果 ─────────────────────────────

function applyKeywordOnHit(attacker, target){
  const kws=attacker.keywords||[];
  if(!kws.length||target.hp<=0) return;
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  if(kws.includes('即死')){ target.hp=0; log(`💀 即死：${attacker.name}の攻撃で${target.name}が即死！`,'bad'); }
  // 毒牙X：命中時に毒Xを付与（加算）
  const erosionKw=kws.find(k=>/^毒牙\d+$/.test(k));
  if(erosionKw&&target.hp>0){
    const pv=parseInt(erosionKw.slice(2))+_gdKw;
    target.poison=(target.poison||0)+pv;
    log(`☠ 毒牙${pv}：${attacker.name}が${target.name}に毒+${pv}`,'bad');
  }
  // 侵食X：命中時に毒Xを付与（毒牙と同様）
  const corrosionKw=kws.find(k=>/^侵食\d+$/.test(k));
  if(corrosionKw&&target.hp>0){
    const cv2=parseInt(corrosionKw.slice(2))+_gdKw;
    target.poison=(target.poison||0)+cv2;
    log(`🌫 侵食${cv2}：${attacker.name}が${target.name}に毒+${cv2}`,'bad');
  }
  // 邪眼X：命中時にターゲットのATKをX減少
  const evilEyeKw=kws.find(k=>/^邪眼\d+$/.test(k));
  if(evilEyeKw&&target.hp>0){
    const ev=parseInt(evilEyeKw.slice(2))+_gdKw;
    const before=target.atk;
    target.atk=Math.max(0,target.atk-ev);
    target.baseAtk=Math.max(0,(target.baseAtk||target.atk)-ev);
    log(`👁 邪眼${ev}：${attacker.name}が${target.name}のATK-${ev}（${before}→${target.atk}）`,'bad');
  }
  // 呪詛X：命中時に破滅Xを付与（加算）。10で即死
  const curseKw=kws.find(k=>/^呪詛\d+$/.test(k));
  if(curseKw&&target.hp>0){
    const cv=parseInt(curseKw.slice(2))+_gdKw;
    target.doomed=(target.doomed||0)+cv;
    log(`🌑 呪詛${cv}：${attacker.name}が${target.name}に破滅+${cv}（累計${target.doomed}）`,'bad');
    if(target.doomed>=10){
      target.hp=0;
      log(`💀 破滅10達成：${target.name}が即死！`,'bad');
    }
  }
  if(kws.includes('パワーブレイク')&&!target.powerBroken&&target.hp>0){
    const pbX=G.floor||1;
    target.powerBroken=true; target._savedAtk=target.atk;
    target.atk=Math.max(0,target.atk-pbX);
    log(`💢 パワーブレイク${pbX}：${attacker.name}が${target.name}のATK-${pbX}（${target._savedAtk}→${target.atk}）`,'bad');
  }
  // 魂喰（味方専用）：攻撃時、1ソウル消費→攻撃者にシールド+1
  if(kws.includes('魂喰')&&target.hp>0){
    if(G.gold>=1){
      G.gold-=1;
      if(!attacker.shield) attacker.shield=1;
      updateHUD();
      log(`💀 魂喰：1ソウル消費→${attacker.name}にシールド+1`,'good');
    }
  }
  // 魂喰X（敵専用）：攻撃時、Xソウル消費→全敵に永続+X/+X
  const soulKwE=kws.find(k=>/^魂喰\d+$/.test(k));
  if(soulKwE&&target.hp>0){
    const x=parseInt(soulKwE.slice(2));
    if(G.gold>=x){
      G.gold-=x;
      const gain=x;
      G.enemyPermanentBonus=G.enemyPermanentBonus||{atk:0,hp:0};
      G.enemyPermanentBonus.atk+=gain;
      G.enemyPermanentBonus.hp+=gain;
      G.enemies.forEach(e=>{ if(e&&e.hp>0){ e.atk+=gain; e.baseAtk=(e.baseAtk||0)+gain; e.hp+=gain; e.maxHp+=gain; }});
      updateHUD(); renderAll();
      log(`💀 魂喰${x}：${x}ソウル消費→全敵に永続+${gain}/+${gain}`,'bad');
    }
  }
}

// ── 敵へのダメージ処理 ──────────────────────────

function applyPoisonOnDmg(e,srcUnit){
  if(!e||e.hp<=0) return;
  G.rings.forEach(pr=>{
    if(!pr||pr.unique!=='poison_aura') return;
    const pm=GRADE_MULT[pr.grade||1];
    e.poison=(e.poison||0)+3*pm;
    log('☠ '+e.name+'に毒+'+3*pm+'（合計HP-'+e.poison+'/T）','bad');
  });
  if(srcUnit&&srcUnit.enchants&&srcUnit.enchants.includes('猛毒')){
    e.poison=(e.poison||0)+3;
    log('☠ 猛毒：'+e.name+'に毒+3（合計HP-'+e.poison+'/T）','bad');
  }
}

function dealDmgToEnemy(e,dmg,eIdx,srcUnit){
  if(e.shield>0&&dmg>0){
    e.shield--;
    log(`🛡 ${e.name}のシールドがダメージを防いだ（残${e.shield}）`,'sys');
    onEnemyShieldLost();
    return;
  }
  e.hp=Math.max(0,e.hp-dmg);
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
    applyPoisonOnDmg(e,srcUnit);
    if(srcUnit&&srcUnit.keywords&&srcUnit.keywords.length&&e.hp>0){
      applyKeywordOnHit(srcUnit,e);
    }
    // 負傷トリガー：生き残った場合のみ発動
    if(e.injury&&e.hp>0) triggerInjury(e, dmg);
    // リリス・ヴェノム：敵がダメージを受けた時、毒3を与える
    if(e.hp>0){
      G.allies.forEach(li=>{ if(li&&li.hp>0&&li.effect==='lilith_ondmg'&&li!==e){ e.poison=(e.poison||0)+3; log(`🎤 ${li.name}：${e.name}に毒+3`,'bad'); }});
    }
  }
  if(e.hp<=0) processEnemyDeath(e,eIdx);
}

function processEnemyDeath(e,eIdx){
  if(e._dp) return;
  e._dp=true;
  if(e.keywords&&e.keywords.includes('エリート')) G._eliteKilled=true;
  if(e.keywords&&e.keywords.includes('リーダー')) removeLeaderBonus(e);
  const _isArtifact=e.keywords&&e.keywords.includes('アーティファクト');
  const gold=_isArtifact?0:(G.baseIncome||1);
  if(gold>0){ G.earnedGold+=gold; G.gold+=gold; log(`${e.name} 撃破！ソウル+${gold}`,'gold'); }
  else { log(`${e.name} 撃破！（アーティファクト：ソウルを持たない）`,'silver'); }
  // 宝箱ドロップ（5%・1戦闘1個・撤退時は無効、強欲の指輪で2倍）
  // エリート戦ではエリート本体が宝箱を確定ドロップ（他の敵は落とさない）
  if(e.keywords&&e.keywords.includes('エリート')){
    G._pendingEliteChest=true;
    log(`📦 ${e.name}が宝箱を落とした！`,'gold');
  } else if(!G._pendingTreasure&&!G._retreated&&!G._isEliteFight){
    const hasGreed=G.rings&&G.rings.some(r=>r&&r.unique==='greed');
    // ノーム：1体=1.5倍（黄金の雫：2倍）、複数体は乗算
    const gnomeCount=G.allies?G.allies.filter(a=>a&&a.hp>0&&a.effect==='gnome_treasure').length:0;
    const gnomeMult=gnomeCount===0?1:Math.pow(G.hasGoldenDrop?2:1.5,gnomeCount);
    const rate=(hasGreed?2:1)*gnomeMult*0.05;
    if(Math.random()<rate){
      G._pendingTreasure=true;
      G.moveMasks[eIdx]='chest';
      log(`📦 ${e.name}が宝箱を落とした！`,'gold');
    }
  }
  if(G.moveMasks[eIdx]&&!G.visibleMoves.includes(eIdx)){
    G.visibleMoves.push(eIdx);
    log(`移動マスが出現：${NODE_TYPES[G.moveMasks[eIdx]].label}`,'sys');
  }
  // ナグルファル：敵死亡でも+2/+1
  _onAnyCharDeath();
  updateHUD();
}

// ── 杖使用トリガー（キャラクター効果）───────────────

function onWandUsed(){
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'dwarf_wand':{
        const _gainD=1+(G.hasGoldenDrop?1:0)+(G._grimalkinBonus||0);
        const _di=G.allies.indexOf(a);
        const _adjD=[G.allies[_di-1],G.allies[_di+1]].filter(b=>b&&b.hp>0);
        _adjD.forEach(b=>{ b.atk+=_gainD; b.baseAtk+=_gainD; b.hp+=_gainD; b.maxHp+=_gainD; });
        if(_adjD.length) log(`ドワーフ：杖使用→隣接仲間+${_gainD}/+${_gainD}`,'good');
        triggerDryadBuff();
        break;}

      case 'gremlin_wand':
        G.enemies.forEach(e=>{ if(e&&e.hp>0){ e.atk=Math.max(0,e.atk-1); }});
        log(`グレムリン：杖使用→全敵ATK-1`,'good');
        break;
      case 'jack_wand':{
        const alive=G.allies.filter(b=>b&&b.hp>0);
        if(alive.length){ const t=alive[Math.floor(Math.random()*alive.length)]; if(!t.shield) t.shield=1; log(`ジャック：杖使用→${t.name}にシールド+1`,'good'); }
        break;
      }
    }
  });
}

// ── プレイヤーパス ────────────────────────────

async function playerPass(){
  if(G.phase!=='player') return;
  document.getElementById('btn-pass').textContent='ターン終了';
  await battlePhase();
}

// ── 撤退 ──────────────────────────────────────

function retreat(){
  if(G.phase!=='player') return;
  if(!G.visibleMoves.some(i=>G.moveMasks[i])) return;
  log('撤退を選択','sys');
  G._retreated=true;
  applyVictoryBonuses();
  G.phase='reward';
  goToReward();
}

// ── ボスオーナーシステム ──────────────────────

// 敵スロットの moveMask を明示的に除去する（宝箱取得など、マスを消費した場合に呼ぶ）
// 注意：召喚時には呼ばない。renderField でライブユニットが moveMask より優先描画される。
function _clearEnemyMoveMask(idx){
  if(G.moveMasks[idx]){
    G.moveMasks[idx]=null;
    const vi=G.visibleMoves.indexOf(idx);
    if(vi>=0) G.visibleMoves.splice(vi,1);
  }
}

// ボス指輪のトリガーを発火（敵側から召喚・バフ）
function fireBossRingTrigger(trigger){
  if(!G.bossRings||!G.bossRings.length) return;
  G.bossRings.forEach(ring=>{
    if(!ring||ring.trigger!==trigger) return;
    if(ring.kind==='summon'&&ring.summon){
      const count=ring.count||1;
      for(let i=0;i<count;i++){
        const s=ring.summon;
        const grade=ring.grade||1;
        const mult=(typeof GRADE_MULT!=='undefined'?GRADE_MULT[grade]:1)||1;
        const pa=G.enemyPermanentBonus||{atk:0,hp:0};
        const ne={id:uid(),name:s.name,icon:s.icon,
          atk:Math.round(s.atk*mult)+(pa.atk||0),hp:Math.round(s.hp*mult)+(pa.hp||0),
          maxHp:Math.round(s.hp*mult)+(pa.hp||0),baseAtk:Math.round(s.atk*mult)+(pa.atk||0),
          grade:grade,sealed:0,instadead:false,nullified:0,poison:0,_dp:false,shield:0,keywords:[...(s.keywords||[])],powerBroken:false};
        const ei=G.enemies.findIndex(e=>!e||e.hp<=0);
        if(ei>=0) G.enemies[ei]=ne;
        else if(G.enemies.length<6) G.enemies.push(ne);
        log(`👹 ボス指輪「${ring.name}」：${ne.name}(${ne.atk}/${ne.hp})を召喚`,'bad');
      }
    }
  });
}

// 戦闘中に敵オーナーが手札アイテムを取得（動的モード：手札3・指輪非表示）
function addEnemyHandItem(item){
  if(!item) return false;
  const cap=G._enemyHandDynamic?3:8;
  if((G.bossHand||[]).filter(s=>s).length>=cap) return false;
  if(!G.bossHand) G.bossHand=[];
  delete item._buyPrice;
  G.bossHand.push(item);
  renderEnemyHand(); // 即時更新
  return true;
}

// 敵オーナーが手札から魔法を使用（敵側視点：「敵」=プレイヤー側、「味方」=敵側）
function applyBossSpell(sp){
  const liveA=G.allies.filter(a=>a&&a.hp>0);   // プレイヤー側（敵の「敵」）
  const liveE=G.enemies.filter(e=>e&&e.hp>0);  // 敵側（敵の「味方」）
  const grade=FLOOR_DATA[G.floor]?.grade||1;
  const eml=G.enemyMagicLevel||0;              // 敵オーナーの魔術レベル
  log(`👹 敵「${sp.name}」を使用`,'bad');
  switch(sp.effect){
    // ── ダメージ・デバフ系（プレイヤー側を対象）──
    case 'fire':{
      if(!liveA.length) break;
      const t=randFrom(liveA); const dmg=Math.ceil(grade*3);
      dealDmgToAlly(t,dmg,G.allies.indexOf(t),null);
      log(`→ ${t.name}に${dmg}ダメージ`,'bad');
      break;
    }
    case 'meteor':{
      const dmg=Math.ceil(grade*2);
      liveA.forEach(a=>dealDmgToAlly(a,dmg,G.allies.indexOf(a),null));
      log(`→ 全仲間に${dmg}ダメージ`,'bad');
      break;
    }
    case 'meteor_multi':{
      // ランダムな仲間（プレイヤー側）にeml回×emlダメージ
      const _hits=eml||1;
      for(let _mi=0;_mi<_hits;_mi++){
        const live=G.allies.filter(a=>a&&a.hp>0);
        if(!live.length) break;
        const t=randFrom(live);
        dealDmgToAlly(t,eml||1,G.allies.indexOf(t),null);
      }
      log(`→ ランダムな仲間に${eml}ダメ×${_hits}回`,'bad');
      break;
    }
    case 'bomb':{
      const dmg=Math.ceil(grade*2);
      liveA.forEach(a=>dealDmgToAlly(a,dmg,G.allies.indexOf(a),null));
      liveE.forEach(e=>dealDmgToEnemy(e,dmg,G.enemies.indexOf(e),null));
      log(`→ 全キャラに${dmg}ダメージ`,'bad');
      break;
    }
    case 'hate':{
      const eligible=liveA.filter(a=>!a.keywords||!a.keywords.includes('加護'));
      if(!eligible.length) break;
      G.allies.forEach(a=>{ if(a) a.hate=false; });
      const t=randFrom(eligible); t.hate=true; t.hateTurns=99;
      log(`→ ${t.name}に標的を付与`,'bad');
      break;
    }
    case 'seal':{
      if(!liveA.length) break;
      const t=randFrom(liveA); t.sealed=(t.sealed||0)+1;
      log(`→ ${t.name}に封印`,'bad');
      break;
    }
    case 'nullify':{
      if(!liveA.length) break;
      const t=randFrom(liveA); t.nullified=(t.nullified||0)+1;
      log(`→ ${t.name}を無効化`,'bad');
      break;
    }
    case 'instakill':{
      // 魔術レベル以下のパワーを持つ仲間（プレイヤー側）を即死
      const eligible=liveA.filter(a=>a.atk<=eml&&!a.instadead&&(!a.keywords||!a.keywords.includes('加護')));
      if(!eligible.length){ log(`→ 対象なし（魔術レベル${eml}以下の仲間がいない）`,'sys'); break; }
      const t=randFrom(eligible);
      dealDmgToAlly(t,t.hp+999,G.allies.indexOf(t),null);
      break;
    }
    case 'spread':{
      // 次の効果を2倍に（敵側の「スプレッド」は敵の次の使用アイテム効果2倍）
      G._enemySpreadActive=true;
      log(`→ 次の効果が2倍になる`,'bad');
      break;
    }
    // ── 強化系（敵側を対象）──
    case 'boost':{
      if(!liveE.length) break;
      const t=randFrom(liveE); const v=Math.ceil(grade*2)*(G._enemySpreadActive?2:1);
      G._enemySpreadActive=false;
      t.atk+=v; t.baseAtk=(t.baseAtk||0)+v;
      log(`→ ${t.name}パワー+${v}`,'bad');
      break;
    }
    case 'rally': case 'big_rally':{
      const base=sp.effect==='big_rally'?2:1;
      const v=Math.ceil(grade*base)*(G._enemySpreadActive?2:1);
      G._enemySpreadActive=false;
      liveE.forEach(e=>{ e.atk+=v; e.baseAtk=(e.baseAtk||0)+v; });
      log(`→ 全敵パワー+${v}`,'bad');
      break;
    }
    case 'heal_ally':{
      if(!liveE.length) break;
      const t=randFrom(liveE); const hp=Math.ceil(grade*3)*(G._enemySpreadActive?2:1);
      G._enemySpreadActive=false;
      t.hp=Math.min(t.maxHp,t.hp+hp);
      log(`→ ${t.name}HP+${hp}`,'bad');
      break;
    }
    case 'double_hp':{
      if(!liveE.length) break;
      const t=randFrom(liveE);
      t.hp=Math.min(t.maxHp,t.hp*2); t.maxHp=t.maxHp*2;
      log(`→ ${t.name}最大HP×2`,'bad');
      break;
    }
    case 'golem':{
      const ne={id:uid(),name:'ゴーレム',icon:'🗿',atk:eml,hp:eml,maxHp:eml,baseAtk:eml,
        grade:1,sealed:0,instadead:false,nullified:0,poison:0,_dp:false,shield:0,keywords:['アーティファクト'],powerBroken:false};
      const ei=G.enemies.findIndex(e=>!e||e.hp<=0);
      if(ei>=0) G.enemies[ei]=ne;
      else if(G.enemies.length<6) G.enemies.push(ne);
      log(`→ ゴーレム(${eml}/${eml})を召喚`,'bad');
      break;
    }
    case 'weaken':{
      // 脱力の杖：ランダムな仲間（プレイヤー側）のATKを1ターン0にする
      if(!liveA.length) break;
      const t=randFrom(liveA);
      t._weakenedSavedAtk=t.atk;
      t.atk=0;
      log(`→ ${t.name}のパワーを0にした（1ターン）`,'bad');
      break;
    }
    case 'doom':{
      // 破滅の杖：全ての仲間（プレイヤー側）に魔術レベル分のダメージ
      const dmg=eml||1;
      liveA.forEach(a=>dealDmgToAlly(a,dmg,G.allies.indexOf(a),null));
      log(`→ 全仲間に${dmg}ダメージ`,'bad');
      break;
    }
    case 'shield_wand':{
      // 光輝の杖：ランダムな敵（ボス側の仲間）にシールドを付与
      if(!liveE.length) break;
      const t=randFrom(liveE);
      t.shield=(t.shield||0)+1;
      log(`→ ${t.name}にシールドを付与`,'bad');
      break;
    }
    case 'revive':{
      const dead=G.enemies.map((e,i)=>({e,i})).filter(x=>x.e&&x.e.hp<=0&&x.e.maxHp>0);
      if(!dead.length) break;
      const {e}=randFrom(dead); e.hp=Math.ceil(e.maxHp/2);
      log(`→ ${e.name}を復活(HP:${e.hp})`,'bad');
      break;
    }
    case 'poison_wand':{
      // 毒の杖：ランダムな仲間（プレイヤー側）に毒を与える
      if(!liveA.length) break;
      const t=randFrom(liveA); const pv=eml||1;
      t.poison=(t.poison||0)+pv;
      log(`→ ${t.name}に毒+${pv}`,'bad');
      break;
    }
    case 'boost_atk':{
      // 強化の杖：ランダムな敵（ボス側）のATKを強化
      if(!liveE.length) break;
      const t=randFrom(liveE); const v=Math.ceil(grade*2)*(G._enemySpreadActive?2:1);
      G._enemySpreadActive=false;
      t.atk+=v; t.baseAtk=(t.baseAtk||0)+v;
      log(`→ ${t.name}パワー+${v}`,'bad');
      break;
    }
    case 'flash_blade':{
      // 閃刃の杖：全キャラに1ダメージ
      liveA.forEach(a=>dealDmgToAlly(a,1,G.allies.indexOf(a),null));
      liveE.forEach(e=>dealDmgToEnemy(e,1,G.enemies.indexOf(e),null));
      log(`→ 全キャラに1ダメージ`,'bad');
      break;
    }
    case 'swap_stats':{
      // 混乱の杖：ランダムな仲間（プレイヤー側）のATKとHPを入れ替え
      if(!liveA.length) break;
      const t=randFrom(liveA);
      const _sa=t.atk, _sh=t.hp, _sm=t.maxHp;
      t.atk=_sh; t.baseAtk=_sh;
      t.hp=_sa; t.maxHp=Math.max(_sa,_sm);
      log(`→ ${t.name}のATKとHPを入れ替え（${_sa}/${_sh}→${t.atk}/${t.hp}）`,'bad');
      break;
    }
    case 'growth_wand':{
      // 成長の杖：ランダムな敵（ボス側）に成長Xを付与
      if(!liveE.length) break;
      const t=randFrom(liveE); const gv=eml||1;
      if(!t.keywords) t.keywords=[];
      const existG=t.keywords.findIndex(k=>/^成長\d+$/.test(k));
      if(existG>=0) t.keywords[existG]='成長'+(parseInt(t.keywords[existG].slice(2))+gv);
      else t.keywords.push(`成長${gv}`);
      log(`→ ${t.name}に成長${gv}を付与`,'bad');
      break;
    }
    case 'sacrifice':{
      // 犠牲の杖：最もHPの低い敵（ボス側）を生贄に、プレイヤー側全体にそのATK分ダメージ
      if(!liveE.length) break;
      const t=liveE.reduce((a,b)=>a.hp<=b.hp?a:b);
      const dmg=t.atk||0;
      t.hp=0; processEnemyDeath(t,G.enemies.indexOf(t));
      if(dmg>0) liveA.forEach(a=>dealDmgToAlly(a,dmg,G.allies.indexOf(a),null));
      log(`→ ${t.name}を生贄に、全仲間に${dmg}ダメージ`,'bad');
      break;
    }
    case 'magic_book':{
      // 叡智の巻物：敵の魔術レベルを+2する
      G.enemyMagicLevel=(G.enemyMagicLevel||0)+2;
      log(`→ 敵の魔術レベルが+2（現在${G.enemyMagicLevel}）`,'bad');
      break;
    }
    case 'sacrifice_doll':{
      // 破壊の巻物：ランダムな仲間（プレイヤー側・ボス・エリート以外）を破壊
      const eligible=liveA.filter(a=>!a.keywords||(!a.keywords.includes('ボス')&&!a.keywords.includes('エリート')));
      if(!eligible.length) break;
      const t=randFrom(eligible);
      dealDmgToAlly(t,t.hp+999,G.allies.indexOf(t),null);
      log(`→ ${t.name}を破壊`,'bad');
      break;
    }
    case 'counter_scroll':{
      // 反逆の薬：ランダムな敵（ボス側）に反撃を付与
      if(!liveE.length) break;
      const t=randFrom(liveE);
      if(!t.keywords) t.keywords=[];
      if(!t.keywords.includes('反撃')) t.keywords.push('反撃');
      t.counter=true;
      log(`→ ${t.name}に反撃を付与`,'bad');
      break;
    }
    case 'purify_hate':{
      // 浄化の薬：ランダムな敵（ボス側）の毒を除去
      if(!liveE.length) break;
      const poisoned=liveE.filter(e=>e.poison>0);
      if(!poisoned.length){ log(`→ 毒状態の仲間なし`,'sys'); break; }
      const t=randFrom(poisoned); t.poison=0;
      log(`→ ${t.name}の毒を除去`,'bad');
      break;
    }
    default: log(`→ 効果なし（未対応：${sp.effect}）`,'sys'); break;
  }
  G._enemySpreadActive=false; // 未消費のspreadは次ターンに持ち越さない
}

// ── 降伏 ──────────────────────────────────────

function surrender(){
  if(G.phase==='reward') return;
  log('降伏を選択','sys');
  gameOver();
}


// ── 勝利オーバーレイ ──────────────────────────

function showVictoryOverlay(){
  const ov=document.getElementById('victory-overlay');
  if(ov) ov.style.display='flex';
}
