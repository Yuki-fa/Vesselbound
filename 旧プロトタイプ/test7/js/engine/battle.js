// ═══════════════════════════════════════
// battle.js — 戦闘フロー・ダメージ処理
// 依存: constants.js, state.js, floors.js, events.js, pool.js
// ═══════════════════════════════════════

let _isBossFight = false;

// 特殊オブジェクト定義（非ボス戦でランダム配置）
const BATTLE_OBJECTS=[
  {id:'rock',        name:'岩',   icon:'🪨', prob:0.15, hpMult:5, effect:null,          desc:'効果なし'},
  {id:'barrel',      name:'樽',   icon:'🛢️', prob:0.10, hpMult:3, effect:'barrel',      desc:'破壊で宝箱30%／爆発20%／何も無し50%'},
  {id:'spirit_tree', name:'霊木', icon:'🌳', prob:0.05, hpMult:4, effect:'spirit_tree', desc:'破壊でソウル+1'},
];

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
    const _sc_h=(a._stackCount||0)+1;
    G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=_sc_h+_gd; b.baseAtk=(b.baseAtk||0)+_sc_h+_gd; b.hp+=2*_sc_h+_gd; b.maxHp+=2*_sc_h+_gd; }});
    log(`${a.name}：魔術Lv上昇→全仲間+${_sc_h+_gd}/+${2*_sc_h+_gd}`,'good');
  });
  // アラクネ：（杖が壊れた時に呼ばれるため、ここでは不要）
}

// ゴールド獲得時の共通処理（レプラコーン誘発）
function onGoldGained(amount){
  G.gold+=amount; G.earnedGold+=amount;
  if(amount>0&&typeof playSfx==='function') playSfx('goldGain',{group:'reward'});
  updateHUD();
  // レプラコーン：ソウルを得るたびに全仲間±0/+1
  const _gd=G.hasGoldenDrop?1:0;
  const hasLep=G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='leprechaun_gold');
  if(hasLep){
    const _lepUnit=G.allies.find(a=>a&&a.hp>0&&a.effect==='leprechaun_gold');
    const _lepNums=[...((_lepUnit&&_lepUnit.desc)||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
    const _lv=(_lepNums[0]||1)+_gd;
    let _allyLv=_lv, _enemyLv=_lv;
    G.allies.forEach(a=>{ if(a&&a.hp>0) _allyLv=addUnitHp(a,_lv,'ally'); });
    const _jkbNote=_allyLv!==_lv?`（実値+${_allyLv}）`:'';
    log(`レプラコーン：ソウル獲得→全仲間±0/+${_lv}${_jkbNote}`,'good');
  }
}

function _handleVictory(){
  // stale setTimeout が次の戦闘中に発火した場合は何もしない
  if(G.phase!=='reward') return;
  if(typeof WORLD_MAP_ENABLED!=='undefined'&&WORLD_MAP_ENABLED&&G._mapNodeType&&typeof completeWorldMapBattle==='function'){
    completeWorldMapBattle();
    return;
  }
  if(_isBossFight && G.floor===FLOOR_DATA.length-1){
    showScreen('clear');
  } else {
    showVictoryOverlay();
  }
}

// ── リーダーボーナス（敵側）──────────────────────

function applyLeaderBonus(){
  const leader=G.enemies.find(e=>e&&e.keywords&&e.keywords.includes('リーダー')&&e.hp>0);
  if(!leader) return;
  const bonus=Math.ceil(FLOOR_DATA[G.floor]?.grade||1);
  leader._leaderBonus=bonus;
  G.enemies.forEach(e=>{
    if(e&&e.id!==leader.id&&e.hp>0){ e.atk+=bonus; e.hp+=bonus*2; e.maxHp+=bonus*2; }
  });
  log(`👑 リーダー「${leader.name}」が他の敵を強化（+${bonus}/+${bonus*2}）`,'bad');
}
function removeLeaderBonus(leader){
  if(!leader._leaderBonus) return;
  const bonus=leader._leaderBonus;
  G.enemies.forEach(e=>{
    if(e&&e.id!==leader.id&&e.hp>0){ e.atk=Math.max(1,e.atk-bonus); e.hp=Math.max(1,e.hp-bonus*2); e.maxHp=Math.max(1,e.maxHp-bonus*2); }
  });
  log(`👑 リーダー死亡：強化が消えた`,'sys');
}

// ── HP増加共通関数（ジャッカロープボーナス自動付与）──────
// ATKを増加させる共通関数（ガーゴイル効果を自動適用）
function addUnitAtk(unit, amount){
  if(!unit||amount<=0) return 0;
  const side=G.allies.includes(unit)?'ally':G.enemies.includes(unit)?'enemy':null;
  const _gargAtk = unitMatchesRace(unit,'悪魔') ? getDemonBuffBonus(side) : 0;
  const total = amount + _gargAtk;
  unit.atk += total;
  unit.baseAtk = (unit.baseAtk||0) + total;
  return total;
}

function addUnitHp(unit, amount, sideOverride){
  if(!unit||amount<=0) return 0;
  const onAllySide=sideOverride==='ally'||(!sideOverride&&G.allies.includes(unit));
  const onEnemySide=sideOverride==='enemy'||(!sideOverride&&G.enemies.includes(unit));
  const _jkb=onAllySide?getJackalopeHpBonus('ally'):onEnemySide?getJackalopeHpBonus('enemy'):0;
  const total=amount+_jkb;
  unit.hp+=total; unit.maxHp+=total;
  return total;
}

function getJackalopeHpBonus(side){
  const units=side==='enemy'?G.enemies:G.allies;
  const _gd=side==='ally'&&G.hasGoldenDrop?1:0;
  return (units||[]).reduce((sum,u)=>{
    if(!u||u.hp<=0||u.effect!=='jackalope_passive') return sum;
    return sum+(u._stackCount||0)+1+_gd;
  },0);
}

function unitMatchesRace(unit, race){
  if(!unit||!race) return false;
  const races=String(unit.race||'').split(/[／/、,，\s]+/).filter(Boolean);
  return race==='全て'||races.includes(race)||races.includes('全て');
}

function addUnitRace(unit, race){
  if(!unit||!race||race==='-') return false;
  const races=String(unit.race||'-').split(/[／/、,，\s]+/).filter(r=>r&&r!=='-');
  if(races.includes('全て')||races.includes(race)) return false;
  races.push(race);
  unit.race=races.length?races.join('／'):race;
  return true;
}

function applyUnitBuff(unit, atk, hp, sideOverride){
  if(!unit||unit.hp<=0) return {atk:0,hp:0};
  const side=sideOverride?sideOverride:(G.allies.includes(unit)?'ally':G.enemies.includes(unit)?'enemy':null);
  const demonBonus=unitMatchesRace(unit,'悪魔')?getDemonBuffBonus(side):0;
  const doneAtk=atk>0?atk+demonBonus:0;
  const doneHp=hp>0?hp+demonBonus:0;
  if(atk>0){
    unit.atk+=doneAtk;
    unit.baseAtk=(unit.baseAtk||0)+doneAtk;
  }
  const hpDone=doneHp>0?addUnitHp(unit,doneHp,sideOverride):0;
  return {atk:doneAtk,hp:hpDone};
}

function getDemonBuffBonus(side){
  const units=side==='enemy'?G.enemies:G.allies;
  return (units||[]).some(u=>u&&u.hp>0&&u.effect==='gargoyle_bonus')?1:0;
}

function addRaceBuff(race, atk, hp, side='ally', sourceName=''){
  if(!race) return;
  if(side==='ally'){
    if(!G.raceBuffs) G.raceBuffs={};
    if(!G.raceBuffs[race]) G.raceBuffs[race]={atk:0,hp:0};
    G.raceBuffs[race].atk+=(atk||0);
    G.raceBuffs[race].hp+=(hp||0);
  }
  const units=side==='enemy'?G.enemies:G.allies;
  let shownHp=hp||0;
  (units||[]).forEach(u=>{
    if(u&&u.hp>0&&unitMatchesRace(u,race)){
      const done=applyUnitBuff(u,atk||0,hp||0,side);
      shownHp=done.hp;
    }
  });
  if(side==='ally'&&typeof _rewCards!=='undefined'){
    (_rewCards||[]).forEach(c=>{
      if(c&&c._isChar&&c.hp>0&&unitMatchesRace(c,race)){
        if(atk>0){ const _prevAtk=c.atk||0; c.atk=_prevAtk+atk; c.baseAtk=(c.baseAtk!=null?c.baseAtk:_prevAtk)+atk; }
        if(hp>0){ const _cm=c.maxHp||c.hp; c.hp+=hp; c.maxHp=_cm+hp; }
      }
    });
  }
  const prefix=sourceName?`${sourceName}：`:'';
  const col=side==='enemy'?'bad':'good';
  log(`${prefix}${race}が+${atk||0}/+${shownHp}`,col);
  if(typeof renderRaceBuffSummary==='function') renderRaceBuffSummary();
}

function applyRaceBuffsToUnit(unit, sideOverride){
  if(!unit||!G.raceBuffs) return;
  Object.entries(G.raceBuffs).forEach(([race,b])=>{
    if(!unitMatchesRace(unit,race)) return;
    applyUnitBuff(unit,b.atk||0,b.hp||0,sideOverride);
  });
}

function triggerDeathEffectTriggered(sourceUnit){
  const isEnemy=sourceUnit&&G.enemies.includes(sourceUnit);
  const side=isEnemy?'enemy':'ally';
  const units=isEnemy?G.enemies:G.allies;
  const col=isEnemy?'bad':'good';
  (units||[]).forEach(u=>{
    if(!u||u.hp<=0||u.effect!=='ghost_death_effect') return;
    const v=(u._stackCount||0)+1+(!isEnemy&&G.hasGoldenDrop?1:0);
    if(side==='ally') addRaceBuff('不死',v,v,'ally',u.name);
    else {
      (G.enemies||[]).forEach(e=>{ if(e&&e.hp>0&&unitMatchesRace(e,'不死')) applyUnitBuff(e,v,v,'enemy'); });
      log(`${u.name}：死亡効果発動→敵の不死+${v}/+${v}`,col);
    }
  });
}

function triggerInjuryEffectTriggered(unit){
  const isEnemy=unit&&G.enemies.includes(unit);
  const side=isEnemy?'enemy':'ally';
  const units=isEnemy?G.enemies:G.allies;
  (units||[]).forEach(s=>{
    if(!s||s.hp<=0||s.effect!=='slin_injury_aura') return;
    const v=(s._stackCount||0)+1+(!isEnemy&&G.hasGoldenDrop?1:0);
    if(side==='ally') addRaceBuff('竜',0,v,'ally',s.name);
    else {
      (G.enemies||[]).forEach(e=>{ if(e&&e.hp>0&&unitMatchesRace(e,'竜')) applyUnitBuff(e,0,v,'enemy'); });
      log(`${s.name}：負傷効果発動→敵の竜±0/+${v}`,'bad');
    }
  });
}

// ── 戦力スコア計算 ────────────────────────────
function calcUnitScore(unit){
  if(!unit||unit.hp<=0) return 0;
  const kws=unit.keywords||[];
  const dok=kws.find(k=>/^毒牙\d+$/.test(k));
  const dokBonus=dok?parseInt(dok.slice(2))*3:(kws.includes('毒牙')?(unit.atk||0):0);
  const effectiveAtk=unit.atk+dokBonus;
  let score=effectiveAtk*unit.hp;
  if(kws.includes('即死'))       score*=3.0;
  if(kws.includes('三段攻撃'))   score*=2.5;
  if(kws.includes('二段攻撃'))   score*=1.8;
  if(kws.includes('全体攻撃'))   score*=2.0;
  if(kws.includes('三方向攻撃')) score*=1.5;
  if(kws.includes('反撃'))       score*=1.4;
  if(kws.includes('狩人'))       score*=1.2;
  if(unit.shield>0)              score*=1.3;
  const juk=kws.find(k=>/^呪詛\d+$/.test(k));
  if(juk){ const jv=parseInt(juk.slice(2)); score*=jv>=10?3.0:1+jv*0.05; }
  const egk=kws.find(k=>/^邪眼\d+$/.test(k));
  if(egk) score*=1+parseInt(egk.slice(2))*0.1;
  const grk=kws.find(k=>/^成長\d+$/.test(k));
  if(grk) score*=1.1;
  return score;
}
function calcPartyScore(units, opposingUnits){
  const live=(units||[]).filter(u=>u&&u.hp>0&&!u._isObject);
  if(!live.length) return 0;
  let total=live.reduce((s,u)=>s+calcUnitScore(u),0);
  // キャラ数補正：攻撃回数に相当（6体満員を1.0として）
  const countMult=live.length/6;
  total*=countMult;
  // 反撃補正：反撃持ちは相手の生存数分だけ追加攻撃するに等しい
  if(opposingUnits){
    const oppLive=(opposingUnits||[]).filter(u=>u&&u.hp>0&&!u._isObject).length;
    if(oppLive>1){
      live.forEach(u=>{
        if((u.keywords||[]).includes('反撃')){
          total+=calcUnitScore(u)*(oppLive-1)/6;
        }
      });
    }
  }
  // 先制：パーティに1人でもいれば×1.3（重複なし）
  if(live.some(u=>(u.keywords||[]).includes('先制'))) total*=1.3;
  return total;
}
function scoreToRank(score){
  const thr=[
    [15000,'SSS'],[10000,'SS'],[7000,'S'],
    [5000,'AAA'],[3500,'AA+'],[2500,'AA'],[1800,'AA-'],
    [1300,'A+'],[900,'A'],[650,'A-'],
    [450,'BBB'],[320,'BB+'],[220,'BB'],[150,'BB-'],
    [100,'B+'],[70,'B'],[50,'B-'],
    [30,'CCC'],[20,'CC'],[10,'C'],[5,'D'],[0,'E'],
  ];
  for(const [t,r] of thr){ if(score>=t) return r; }
  return 'E-';
}
function getMatchupLabel(allyScore, enemyScore){
  if(enemyScore<=0) return '圧勝';
  const ratio=allyScore/enemyScore;
  if(ratio>=2.0) return '圧勝';
  if(ratio>=1.4) return '有利';
  if(ratio>=0.75) return '互角';
  if(ratio>=0.5) return '不利';
  return '危険';
}

// ── 戦闘開始 ──────────────────────────────────

async function startBattle(){
  if(typeof setBattleStageBackground==='function') setBattleStageBackground();
  _updateLaneOffset();
  clearLog();

  // 宝箱・撤退フラグをリセット（前の戦闘の状態を持ち越さない）
  updateGoldenDrop();
  G._pendingTreasure=false;
  G._pendingEliteChest=false;
  G._pendingTreasureItems=[];
  G._isTreasurePhase=false;
  G._masterHandReady=false;
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
  G._enemiesKilledThisBattle=0;
  G._battleAutoMode=true;
  G._openingIntervention=false;

  G.enemies=generateEnemies(G.floor);
  // 敵はslot 0を確保して残りslot 1-5にランダム分散する。
  // オブジェクトは現仕様では出現させない。
  if(!FLOOR_DATA[G.floor]?.boss){
    const _actualEnemies=G.enemies.filter(e=>e!==null);
    const _newEnemies=new Array(6).fill(null);
    if(_actualEnemies.length>0){
      _newEnemies[0]=_actualEnemies[0];
      const _restSlots=[1,2,3,4,5];
      for(let _si=_restSlots.length-1;_si>0;_si--){
        const _sj=Math.floor(Math.random()*(_si+1));
        [_restSlots[_si],_restSlots[_sj]]=[_restSlots[_sj],_restSlots[_si]];
      }
      _actualEnemies.slice(1).forEach((e,_ei)=>{ _newEnemies[_restSlots[_ei]]=e; });
    }
    G.enemies=_newEnemies;
    // エリートの位置を再特定（generateMoveMasks が参照するため）
    if(G._isEliteFight) G._eliteIdx=G.enemies.findIndex(e=>e&&e.keywords&&e.keywords.includes('エリート'));
  }
  // 永続敵強化（魂喰X・マミー敵）を新規敵に適用
  G.enemies.forEach(e=>{
    if(!e) return;
    if(e._isObject) return;
    const pa=G.enemyPermanentBonus||{atk:0,hp:0};
    if(pa.atk){ e.atk+=pa.atk; e.baseAtk=(e.baseAtk||0)+pa.atk; }
    if(pa.hp){ e.hp+=pa.hp; e.maxHp+=pa.hp; }
    const ua=G.enemyUndeadAtkBonus||0;
    if(ua&&(e.grade||1)>=2){ e.atk+=ua; e.baseAtk=(e.baseAtk||0)+ua; }
    e.allyTarget=false;
  });
  G.moveMasks=generateMoveMasks();
  G.moveMaskLanes=G.enemies.map(e=>e?(e.lane||'front'):'front');
  G.visibleMoves=[];
  G.fogNext=false;

  // 開戦時：宝ドロップ対象・樽効果・開戦配置宝を全て決定
  G._chestDropper=null;
  G._openingChestIdx=-1;
  G._barrelTreasure=null;
  G._pendingEliteTreasureItem=null;
  G._pendingTreasureBySlot={};
  if(!FLOOR_DATA[G.floor]?.boss){
    const hasGreed=G.rings&&G.rings.some(r=>r&&r.unique==='greed');
    const gnomeUnit=G.allies&&G.allies.find(a=>a&&a.hp>0&&a.effect==='gnome_treasure');
    const gnomeMult=gnomeUnit
      ?(gnomeUnit._stackCount||0)>=2?4:(gnomeUnit._stackCount||0)>=1?2:1.5
      :1;
    const rate=Math.min(0.8,(hasGreed?2:1)*gnomeMult*0.05);
    if(!G._isEliteFight){
      const _dropCandidates=G.enemies.filter(e=>e&&e.hp>0&&!e._isObject&&!(e.keywords||[]).includes('エリート'));
      if(_dropCandidates.length>0&&Math.random()<rate){
        G._chestDropper=randFrom(_dropCandidates);
        G._chestDropper._willDropChest=true;
      }
    }
    // 樽の効果を開戦時に決定（chest 30% / explode 30% / null 40%）
    G.enemies.forEach(e=>{
      if(!e||!e._isObject||e._objectEffect!=='barrel') return;
      const roll=Math.random();
      e._barrelEffect=roll<0.30?'chest':roll<0.60?'explode':null;
    });
    // 開戦時から配置される宝（20%）：前衛レーン敵がいる列に配置（前衛が死ぬまで隠れる）
    if(!G._isEliteFight&&Math.random()<0.20){
      const _typeRoll=Math.random();
      const _chestType=_typeRoll<0.4?'chest_wand':_typeRoll<0.7?'chest_ring':'chest_item';
      const _frontSlots=[0,1,2,3,4,5].filter(i=>{
        const e=G.enemies[i];
        return !G.moveMasks[i]&&e&&e.lane==='front'&&!e._isObject;
      });
      if(_frontSlots.length>0){
        const _ri=_frontSlots[Math.floor(Math.random()*_frontSlots.length)];
        G.moveMasks[_ri]=_chestType;
        G._openingChestIdx=_ri;
        G._pendingTreasure=true;
      }
    }
  }

  // ── 味方の戦闘状態をリセット（HP は保持）──
  G.allies.forEach(a=>{
    if(!a) return;
    // 憤激の指輪ボーナスは着脱時のみ変動（戦闘開始時のリセット・再適用は行わない）
    a.sealed=0; a._dp=false; a.powerBroken=false;
    a.nullified=0; a.instadead=false;
    a._battleStartHp=a.hp;
    if(a.hate) a.hateTurns=99; // 前衛設定を戦闘ごとにリセット
    delete a._weakenedSavedAtk; delete a._weakenPhaseApplied;
  });

  log(`── 階層 ${G.floor} ──`,'sys');
  if(_isBossFight) log('⚠ ボス戦！','bad');
  log(`敵 ${G.enemies.filter(e=>e&&!e._isObject).length}体が現れた`,'em');
  applyLeaderBonus();

  // 戦闘開始時キャラクター効果
  onBattleStart();

  updateHUD();
  renderAll();
  // 開幕効果で全敵が倒された場合、勝利判定
  if(checkInstantVictory()) return;
  requestAnimationFrame(_updateLaneOffset); // スロット描画後にオフセット再計算
  await nextTurn();
}

// ── ターンループ ───────────────────────────────

// ターン開始時の毒ダメージ処理。戦闘終了した場合 true を返す
async function applyPoisonTick(){
  const _catRing=G.rings.find(r=>r&&r.unique==='catalyst');
  const _catMult=_catRing?(_catRing.grade||1)+1:1;
  const _poisonedE=G.enemies.filter(e=>e&&e.poison>0&&e.hp>0);
  if(_poisonedE.length){
    _poisonedE.forEach(e=>{
      const dmg=e.poison*_catMult;
      e.hp=Math.max(0,e.hp-dmg);
      log(`☠ ${e.name}が毒でHP-${dmg}${_catMult>1?'（触媒×'+_catMult+'）':''}（残HP:${e.hp}）`,'bad');
      if(e.hp<=0) processEnemyDeath(e,G.enemies.indexOf(e));
    });
    if(G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){ _onAllEnemiesDefeated(); return true; }
    if(checkInstantVictory()) return true;
  }
  const _poisonedA=G.allies.filter(a=>a&&a.poison>0&&a.hp>0);
  if(_poisonedA.length){
    _poisonedA.forEach(a=>{
      a.hp=Math.max(0,a.hp-a.poison);
      log(`☠ ${a.name}が毒でHP-${a.poison}（残HP:${a.hp}）`,'bad');
      if(a.hp<=0) processAllyDeath(a,G.allies.indexOf(a));
    });
    if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){ await sleep(200); gameOver(); return true; }
  }
  return false;
}

async function nextTurn(){
  G.turn++;
  updateHUD();
  log(`── ターン ${G.turn} ──`,'sys');
  if(await applyPoisonTick()) return;
  const allowOpeningIntervention=G._battleAutoMode&&G._openingIntervention;
  if(!G._battleAutoMode||allowOpeningIntervention){
    await commanderPhase(); // 敵オーナーが何も持っていなければ即return
  }
  if(G._battleAutoMode&&!allowOpeningIntervention){
    G.phase='player';
    applyTurnStart();
    if(G.phase!=='player') return;
    if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul&&!a._isObject).length){ setTimeout(()=>gameOver(),300); return; }
    await battlePhase();
    return;
  }
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
    case 'hate': case 'seal': case 'nullify': case 'change_formation':
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
  // 手札が1枚だけの場合はスコアが正ならば必ず使う（パーソナリティによる不使用を防ぐ）
  const _effectiveThreshold = hand.length === 1 ? 0 : _USE_THRESHOLD;
  if(scored[0].score < _effectiveThreshold) return null;
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
  G.spreadActive=false;
  applyTurnStart();
  if(G.phase!=='player') return; // 針の指輪等でターン開始時に勝利確定した場合は中断
  // 毒処理後も仲間が全滅していたらゲームオーバー
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isSoul).length){ setTimeout(()=>gameOver(),300); return; }
  if(typeof startManualPlayerTurn==='function') startManualPlayerTurn();
  else {
    G.actionsPerTurn=calcActions();
    G.actionsLeft=G.actionsPerTurn;
  }
  renderAll();
  const liveA=G.allies.filter(a=>a&&a.hp>0&&!a._isSoul);
  setHint(liveA.length===0?'仲間がいない！':'未行動の仲間を選び、下部スロットから行動を選択してください。');
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
  // 脱力回復（プレイヤーフェーズ適用分のみ：敵フェーズ適用分はbattlePhase冒頭で解除）
  [...G.enemies,...G.allies].forEach(u=>{
    if(u&&u._weakenedSavedAtk!==undefined&&u._weakenPhaseApplied!=='battle'){
      u.atk=(u.atk||0)+u._weakenedSavedAtk; // 脱力中のバフ + 脱力前のATK
      log(`${u.name} の脱力が回復（ATK→${u.atk}）`,'sys');
      delete u._weakenedSavedAtk;
      delete u._weakenPhaseApplied;
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
      const _eCandsE=G.enemies.filter(u=>u&&u.hp>0&&!u._isObject&&u.name!=='惑わしの妖精"エインセル"'&&u.name!=='エインセル'&&u!==e);
      if(_eCandsE.length){
        const r=_eCandsE[Math.floor(Math.random()*_eCandsE.length)];
        if(!r.shield) r.shield=1;
        log(`${e.name}：${r.name}にシールド+1`,'bad');
      }
    }
    if(e.effect==='vidar_turn'){
      G.enemies.forEach(f=>{ if(f&&f.hp>0){ f.atk+=2; f.hp+=2; f.maxHp+=2; }});
      log(`${e.name}：全仲間+2/+2`,'bad');
    }
    if(e.effect==='nuckelavee_turn'){
      const slot=G.enemies.findIndex(f=>!f||f.hp<=0);
      if(slot>=0){
        const def=makeSheetBackedUnitDef({id:'c_whitehand',name:'ホワイトハンド',race:'獣',grade:1,atk:3,hp:2,cost:0,unique:false,icon:'🤚',desc:''});
        const u=makeUnitFromDef(def);
        G.enemies[slot]=u;
        if(typeof triggerCheshireSummon==='function') triggerCheshireSummon(u,'enemy');
        log(`${e.name}：ターン開始→ホワイトハンド(3/2)を召喚`,'bad');
      }
    }
  });
  // エインセル：ターン開始時、「エインセル」以外のランダムな仲間がシールドを得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    if(a.effect==='einsel'||a.effect==='einsel_shieldlost'){
      const _eCands=G.allies.filter(u=>u&&u.hp>0&&u.name!=='惑わしの妖精"エインセル"'&&u.name!=='エインセル'&&u!==a);
      if(_eCands.length){
        const r=_eCands[Math.floor(Math.random()*_eCands.length)];
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
    if(a.effect==='nuckelavee_turn'){
      const slot=G.allies.findIndex(b=>!b||b.hp<=0);
      if(slot>=0){
        const def=makeSheetBackedUnitDef({id:'c_whitehand',name:'ホワイトハンド',race:'獣',grade:1,atk:3,hp:2,cost:0,unique:false,icon:'🤚',desc:''});
        const u=makeUnitFromDef(def);
        G.allies[slot]=u;
        if(typeof triggerCheshireSummon==='function') triggerCheshireSummon(u,'ally');
        log(`${a.name}：ターン開始→ホワイトハンド(3/2)を召喚`,'good');
      }
    }
  });
  // 骨：ターン開始時にスケルトンへ変身（味方）
  G.allies.forEach((a,i)=>{
    if(!a||a.hp<=0||a.effect!=='bone_transform') return;
    const _bkg=a.grade||1;
    const _skDef=UNIT_POOL?UNIT_POOL.find(u=>u.id==='c_skeleton'):null;
    const _skAtk=a._skelAtk!=null?a._skelAtk:7*_bkg;
    const _skHp =a._skelHp !=null?a._skelHp :7*_bkg;
    const _skelKws=[...(a._skelKws||[])];
    const _skBase=_skDef?{..._skDef,atk:_skAtk,hp:_skHp,maxHp:_skHp,grade:_bkg,keywords:[..._skelKws]}:{id:'c_skeleton',name:'スケルトン',race:'不死',grade:_bkg,atk:_skAtk,hp:_skHp,maxHp:_skHp,cost:0,unique:false,icon:'💀',desc:'',effect:'skeleton_bone',keywords:[..._skelKws]};
    const _newSkel=makeUnitFromDef(_skBase);
    _newSkel.keywords=[..._skelKws];
    if(_skelKws.includes('反撃')) _newSkel.counter=true;
    G.allies[i]=_newSkel;
    log(`骨：スケルトン(${_skAtk}/${_skHp})に変身`,'good');
  });
  // 骨：ターン開始時にスケルトンへ変身（敵）
  G.enemies.forEach((a,i)=>{
    if(!a||a.hp<=0||a.effect!=='bone_transform') return;
    const _bkg=a.grade||1;
    const _skDef=UNIT_POOL?UNIT_POOL.find(u=>u.id==='c_skeleton'):null;
    const _skAtk=a._skelAtk!=null?a._skelAtk:7*_bkg;
    const _skHp =a._skelHp !=null?a._skelHp :7*_bkg;
    const _skelKws=[...(a._skelKws||[])];
    const _skBase=_skDef?{..._skDef,atk:_skAtk,hp:_skHp,maxHp:_skHp,grade:_bkg,keywords:[..._skelKws]}:{id:'c_skeleton',name:'スケルトン',race:'不死',grade:_bkg,atk:_skAtk,hp:_skHp,maxHp:_skHp,cost:0,unique:false,icon:'💀',desc:'',effect:'skeleton_bone',keywords:[..._skelKws]};
    const _newSkel=makeUnitFromDef(_skBase);
    _newSkel.keywords=[..._skelKws];
    if(_skelKws.includes('反撃')) _newSkel.counter=true;
    G.enemies[i]=_newSkel;
    log(`骨（敵）：スケルトン(${_skAtk}/${_skHp})に変身`,'bad');
  });
  // 城壁・ハーピーATK同期
  syncWallAtk();
  syncHarpyAtk();
  // patience 指輪：battle_start トリガーをターン開始時に発動
  if(G.rings&&G.rings.some(r=>r&&r.unique==='patience')) fireTrigger('battle_start');
  checkSolitudeBuff();
}

// ── 敵フェイズ ─────────────────────────────

async function battlePhase(){
  G.phase='enemy';
  renderControls();
  log(`── T${G.turn} 戦闘フェイズ ──`,'sys');
  // 脱力回復（前ターンの敵フェーズで適用された分をここで解除：プレイヤーフェーズ中ATK=0が見えた後）
  [...G.enemies,...G.allies].forEach(u=>{
    if(u&&u._weakenedSavedAtk!==undefined&&u._weakenPhaseApplied==='battle'){
      u.atk=(u.atk||0)+u._weakenedSavedAtk; // 脱力中のバフ + 脱力前のATK
      log(`${u.name} の脱力が回復（ATK→${u.atk}）`,'sys');
      delete u._weakenedSavedAtk;
      delete u._weakenPhaseApplied;
    }
  });

  for(let i=0;i<Math.max(G.allies.length,G.enemies.length);i++){
    const ally=G.allies[i];
    if(ally&&ally.hp>0&&!ally._isObject&&!ally._isSoul){
      await allyAttackAction(ally,i);
      if(_checkBattleOver()) return;
    }
    const enemy=G.enemies[i];
    if(!enemy||enemy.hp<=0||enemy._isObject) continue;
    await enemyAttackAction(enemy,i);
    if(_checkBattleOver()) return;
  }

  // 標的ターン消費（1ラウンドに1回）
  G.allies.forEach(a=>{ if(a&&a.hate&&a.hateTurns>0){ a.hateTurns--; if(a.hateTurns<=0) a.hate=false; } });

  // 全攻撃後：勝敗判定
  if(G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){
    _onAllEnemiesDefeated();
    return;
  }
  const liveA=G.allies.filter(a=>a&&(a.hp>0));
  if(!liveA.length){ await sleep(200); gameOver(); return; }

  renderAll();

  await sleep(400);
  await nextTurn();
}

function _checkBattleOver(){
  if(G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){
    _onAllEnemiesDefeated();
    return true;
  }
  if(!G.allies.filter(a=>a&&a.hp>0&&!a._isObject&&!a._isSoul).length){ setTimeout(()=>gameOver(),200); return true; }
  return false;
}

// 宝・移動マスを配置するスロットを探す
// 仕様：必ず「前衛レーン（moveMaskLanes='front'）の列」に配置
// 後衛レーンの列には配置しない（後衛敵の背後にマスが出るのを防ぐ）
function _findRearSlot(sourceIdx){
  const _canPlace=(i)=>{
    const e=G.enemies[i];
    const isEmpty=!e||e.hp<=0;
    const noMask=!G.moveMasks[i];
    const noObj=!e?._isObject;
    return isEmpty&&noMask&&noObj;
  };
  const _isFrontLane=(i)=>(G.moveMaskLanes?.[i]||'front')==='front';
  // 1. 前衛レーンの空きスロットを優先
  for(let i=0;i<6;i++){
    if(_isFrontLane(i)&&_canPlace(i)) return i;
  }
  // 2. なければ source 自身（前衛レーンの場合のみ）
  if(sourceIdx>=0&&_isFrontLane(sourceIdx)&&_canPlace(sourceIdx)) return sourceIdx;
  // 3. 前衛レーンに置けない場合は配置を諦める（-1 で報酬欄へ流す）
  return -1;
}

// 各マスは「同じスロットの敵が死亡/不在」になった時のみ表示する
// （他のスロットの敵が死んでも自スロットのマスは表示されない）
function _updateRearVisibility(){
  G.moveMasks.forEach((mask,i)=>{
    if(!mask) return;
    const e=G.enemies[i];
    const slotEmpty=!e||e.hp<=0;
    if(slotEmpty){
      if(!G.visibleMoves.includes(i)) G.visibleMoves.push(i);
    } else {
      const vi=G.visibleMoves.indexOf(i);
      if(vi>=0) G.visibleMoves.splice(vi,1);
    }
  });
}

// 宝箱クリック処理（行動力1消費）
function onChestClick(idx){
  if(G.phase!=='player') return;
  if(G.actionsLeft<=0){ if(typeof setHint==='function') setHint('行動力が足りません'); return; }
  const mask=G.moveMasks[idx];
  if(!mask||!String(mask).startsWith('chest')) return;
  const grade=FLOOR_DATA[G.floor]?.grade||1;
  let item=null;
  // スロットごとに確定済みの中身があれば最優先で採用
  if(G._pendingTreasureBySlot&&G._pendingTreasureBySlot[idx]){
    item=G._pendingTreasureBySlot[idx];
    delete G._pendingTreasureBySlot[idx];
    if(G._pendingEliteTreasureItem===item) G._pendingEliteTreasureItem=null;
    if(G._barrelTreasure===item) G._barrelTreasure=null;
  }
  // 旧形式の保留データが残っている場合のフォールバック
  if(!item&&G._pendingEliteTreasureItem){
    const _eli=G._pendingEliteTreasureItem;
    const _eliType=_eli.type==='ring'?'chest_ring':_eli.type==='wand'?'chest_wand':'chest_item';
    if(_eliType===mask){ item=_eli; G._pendingEliteTreasureItem=null; }
  }
  if(!item){
    const typeMap={'chest_wand':'wand','chest_ring':'ring','chest_item':'consumable'};
    const forced=typeMap[mask]||null;
    const tw=forced?{
      wand:forced==='wand'?100:0,
      ring:forced==='ring'?100:0,
      consumable:forced==='consumable'?100:0,
    }:{wand:40,consumable:40,ring:20};
    item=drawTreasure({1:60,2:30,3:10},tw,grade+1);
  }
  if(item){
    if(typeof takeCardToHand==='function') takeCardToHand(item);
    else { (G.spells||[]).push(item); }
    log(`📦 ${item.name}を取得！（行動力-1）`,'gold');
  }
  // moveMask クリア
  G.moveMasks[idx]=null;
  const vi=G.visibleMoves.indexOf(idx);
  if(vi>=0) G.visibleMoves.splice(vi,1);
  G._pendingTreasure=G.moveMasks.some(m=>String(m||'').startsWith('chest'));
  G.actionsLeft--;
  updateHUD();
  renderAll();
  // 行動力0なら自動でターン終了
  if(G.actionsLeft<=0&&!G._debugMode&&G.phase==='player'){
    if(typeof setHint==='function') setHint('行動終了。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  }
}

function _onAllEnemiesDefeated(){
  if(G.phase==='reward') return; // 二重呼び出し防止
  log('全敵撃破！','gold');
  if(_isBossFight) G._bossJustDefeated=true;
  G.moveMasks.forEach((_,i)=>{
    if(G.moveMasks[i]&&!String(G.moveMasks[i]).startsWith('chest')&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i);
  });
  _dropPondRingIfNeeded();
  applyVictoryBonuses();
  updateHUD(); renderAll();
  G.phase='reward';
  setTimeout(()=>_handleVictory(),600);
}

function _dropPondRingIfNeeded(){
  if(!G._pendingPondBonus) return;
  G._pendingPondBonus=false;
  const _pondPool=typeof getRingPool==='function'?getRingPool():[];
  if(_pondPool.length){
    const _pondRing=randFrom(_pondPool);
    if(!G._pendingTreasureItems) G._pendingTreasureItems=[];
    G._pendingTreasureItems.push(clone(_pondRing));
    log(`💧 湖：${_pondRing.name}をドロップ`,'gold');
  }
}

// ── 味方攻撃アクション ──────────────────────────

function _applyAllyAttackEffects(ally){
  if(!ally||ally.hp<=0) return;
  const _gd=G.hasGoldenDrop?1:0;
  const _sc=(ally._stackCount||0)+1; // 重ね倍率（G1=1, G2=2, ...）
  // ケンタウロス：攻撃時、魔術レベル+1
  if(ally.effect==='centaur_attack'){
    const v=_sc+_gd;
    onMagicLevelUp(v);
    log(`${ally.name}：攻撃→魔術レベル+${v}（Lv${G.magicLevel}）`,'good');
  }
  if(ally.effect==='brownie_attack'){
    const _nums=[...((ally.desc||'').matchAll(/\d+/g))].map(m=>parseInt(m[0]));
    const _base=(_nums[0]||1)*_sc+_gd; let _hpGain=_base;
    G.allies.forEach(a=>{ if(a&&a.hp>0) _hpGain=addUnitHp(a,_base); });
    log(`${ally.name}：攻撃時→全仲間±0/+${_hpGain}`,'good');
  }
  if(ally.effect==='forniot'){
    const v=_sc+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=v; a.baseAtk=(a.baseAtk||0)+v; }});
    log(`${ally.name}：攻撃時→全仲間+${v}/±0`,'good');
  }
  if(ally.effect==='vampire_attack'){
    const va=2*_sc+_gd; let _vh=_sc+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0&&unitMatchesRace(a,'不死')){ a.atk+=va; a.baseAtk=(a.baseAtk||0)+va; _vh=addUnitHp(a,_sc+_gd); }});
    log(`${ally.name}：攻撃→全不死+${va}/+${_vh}`,'good');
  }
  if(ally.effect==='gremlin_attack'){
    // 新仕様では負傷効果
  }
  if(ally.effect==='siren_attack'){
    // 現行シートでは開戦効果。
  }
  if(ally.effect==='jack_attack'){
    const _jv=_sc+(G.hasGoldenDrop?1:0);
    G._jackBonus=(G._jackBonus||0)+_jv;
    log(`${ally.name}：攻撃→以後の商談キャラHP+${_jv}（累計+${G._jackBonus}）`,'good');
  }
  // arachas_attack（旧効果）は廃止（新仕様：負傷時に敵後衛へ1ダメ）
  if(ally.effect==='dryad_attack'){
    const _dv=_sc+_gd;
    G.allies.forEach(a=>{ if(a&&a.hp>0&&unitMatchesRace(a,'精霊')) applyUnitBuff(a,_dv,_dv,'ally'); });
    log(`${ally.name}：攻撃→全仲間の精霊+${_dv}/+${_dv}`,'good');
  }
  if(ally.effect==='pegasus_attack'){
    const _rightmost=G.allies.filter(a=>a&&a.hp>0).pop();
    if(_rightmost){ const _pv=4*_sc+_gd; _rightmost.hp+=_pv; _rightmost.maxHp+=_pv; log(`${ally.name}：攻撃→右端の${_rightmost.name}に±0/+${_pv}`,'good'); }
  }
  if(ally.effect==='scylla_attack'){
    const live=G.allies.filter(a=>a&&a.hp>0);
    if(live.length){
      const t=live.reduce((m,a)=>(a.atk||0)<(m.atk||0)?a:m,live[0]);
      const gain=Math.max(0,(ally.atk||0)-(t.atk||0));
      if(gain>0) addUnitAtk(t,gain);
      log(`${ally.name}：攻撃→${t.name}のパワーを${ally.atk}にした`,'good');
    }
  }
  if(ally.effect==='lizardman_attack'){
    const _lv=_sc+_gd;
    addUnitAtk(ally,_lv);
    log(`${ally.name}：攻撃→パワー+${_lv}`,'good');
  }
  if(ally.effect==='specter_attack'){
    const _sv=_sc+_gd;
    G._specterBonus=(G._specterBonus||0)+_sv;
    log(`${ally.name}：攻撃→今後の「不死」に+${_sv}/+${_sv}（累計+${G._specterBonus}）`,'good');
  }
  if(ally.effect==='werewolf_attack'){
    const v=2*_sc+_gd;
    addUnitHp(ally,v,'ally');
    addRaceBuff('亜人',0,v,'ally',ally.name);
  }
  if(ally.effect==='alraune_attack'){
    const live=G.allies.filter(a=>a&&a.hp>0);
    if(live.length){
      const t=live.reduce((m,a)=>(a.atk||0)<(m.atk||0)?a:m,live[0]);
      const v=G.magicLevel||1;
      applyUnitBuff(t,v,0,'ally');
      log(`${ally.name}：攻撃→${t.name}に強化の杖（ATK+${v}）`,'good');
    }
  }
  if(ally.effect==='phantom_attack'){
    const live=G.allies.filter(a=>a&&a.hp>0);
    if(live.length){
      const t=randFrom(live);
      const added=addUnitRace(t,'不死');
      log(`${ally.name}：攻撃→${t.name}${added?'に不死の種族を追加':'は既に不死'}`,'good');
    }
  }
  if(ally.effect==='nymph_attack'){
    const i=G.allies.indexOf(ally);
    const v=6*_sc+_gd;
    [i-1,i+1].forEach(j=>{ const t=G.allies[j]; if(t&&t.hp>0) addUnitHp(t,v,'ally'); });
    log(`${ally.name}：攻撃→隣接する仲間のライフ+${v}`,'good');
  }
  if(ally.effect==='lesser_demon_attack'){
    const _ldsc=_sc;
    if(!G._isSimulating){
      G._lesserDemonDiscount=(G._lesserDemonDiscount||0)+_ldsc;
      log(`${ally.name}：攻撃→次の購入アイテムが-${_ldsc}ソウル（累計-${G._lesserDemonDiscount}）`,'good');
    }
  }
  // ドラウグは受動効果（攻撃時ではなく被攻撃時）のため、ここでは処理しない
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
  if(enemy.effect==='gremlin_attack'){
    // 新仕様では負傷効果
  }
  if(enemy.effect==='brownie_attack'){
    const _nums=[...((enemy.desc||'').matchAll(/\d+/g))].map(m=>parseInt(m[0]));
    const _bv=_nums[0]||1;
    G.enemies.forEach(f=>{ if(f&&f.hp>0) addUnitHp(f,_bv,'enemy'); });
    log(`${enemy.name}：攻撃時→全仲間±0/+${_bv}`,'bad');
  }
  // arachas_attack（旧効果）は廃止
  if(enemy.effect==='vampire_attack'){
    const va=2, vh=1;
    G.enemies.forEach(f=>{ if(f&&f.hp>0&&unitMatchesRace(f,'不死')){ f.atk+=va; f.baseAtk=(f.baseAtk||0)+va; f.hp+=vh; f.maxHp+=vh; }});
    log(`${enemy.name}：攻撃→全不死+${va}/+${vh}`,'bad');
  }
  if(enemy.effect==='dryad_attack'){
    G.enemies.forEach(f=>{ if(f&&f.hp>0&&unitMatchesRace(f,'精霊')) applyUnitBuff(f,1,1,'enemy'); });
    log(`${enemy.name}：攻撃→全仲間の精霊+1/+1`,'bad');
  }
  if(enemy.effect==='pegasus_attack'){
    const _rightmost=G.enemies.filter(f=>f&&f.hp>0).pop();
    if(_rightmost){ _rightmost.hp+=4; _rightmost.maxHp+=4; log(`${enemy.name}：攻撃→右端の${_rightmost.name}に±0/+4`,'bad'); }
  }
  if(enemy.effect==='lizardman_attack'){
    addUnitAtk(enemy,1);
    log(`${enemy.name}：攻撃→パワー+1`,'bad');
  }
  if(enemy.effect==='specter_attack'){
    G._enemySpecterBonus=(G._enemySpecterBonus||0)+1;
    log(`${enemy.name}：攻撃→今後の「不死」に+1/+1蓄積`,'bad');
  }
  if(enemy.effect==='siren_attack'){
    // 現行シートでは開戦効果。
  }
}

function _applyAllyAttackEffectsWithElf(ally){
  if(!ally||ally.hp<=0) return;
  _applyAllyAttackEffects(ally);
  const idx=G.allies.indexOf(ally);
  if(idx>0){
    const elf=G.allies[idx-1];
    if(elf&&elf.hp>0&&elf.effect==='elf_double_right') _applyAllyAttackEffects(ally);
  }
}

function _applyEnemyAttackEffectsWithElf(enemy){
  if(!enemy||enemy.hp<=0) return;
  _applyEnemyAttackEffects(enemy);
  const idx=G.enemies.indexOf(enemy);
  if(idx>0){
    const elf=G.enemies[idx-1];
    if(elf&&elf.hp>0&&elf.effect==='elf_double_right') _applyEnemyAttackEffects(enemy);
  }
}

function _attackRepeatCount(unit){
  const kws=unit&&unit.keywords||[];
  if(kws.includes('三段攻撃')) return 3;
  if(kws.includes('二段攻撃')) return 2;
  return 1;
}

function _applyAttackEffectsForSide(unit,isEnemySide){
  if(isEnemySide) _applyEnemyAttackEffectsWithElf(unit);
  else _applyAllyAttackEffectsWithElf(unit);
}

function _dealAttackDamage(attacker,isEnemySide,target,targetIdx,damage,suppressAutoRetaliate){
  if(damage>0&&typeof playSfx==='function'){
    playSfx('attackLight',{group:'combat',guardKey:'combat:attack'});
  }
  if(isEnemySide){
    let actualTarget=target;
    let actualIdx=targetIdx;
    if(damage>0){
      actualTarget=_redirectToBodyguard(G.allies,target,'good');
      actualIdx=G.allies.indexOf(actualTarget);
    }
    dealDmgToAlly(actualTarget,damage,actualIdx,attacker,true,true);
    return actualTarget;
  }
  dealDmgToEnemy(target,damage,targetIdx,attacker,suppressAutoRetaliate!==false);
  return target;
}

function _mutualStrikeBack(attacker, attackerIsEnemySide, defender, retaliateDamage){
  if(!attacker||!defender||attacker.hp<=0) return;
  if(attacker._isObject||defender._isObject) return;
  const dmg=Math.max(0,retaliateDamage??defender.atk??0);
  if(dmg<=0) return;
  log(`${defender.name}の応戦→${attacker.name}に${dmg}ダメ`,attackerIsEnemySide?'good':'bad');
  if(attackerIsEnemySide){
    const idx=G.enemies.indexOf(attacker);
    if(idx>=0) dealDmgToEnemy(attacker,dmg,idx,defender);
  } else {
    const idx=G.allies.indexOf(attacker);
    if(idx>=0) dealDmgToAlly(attacker,dmg,idx,defender,true,true);
  }
}

function _maybeCounterAttack(defender,defenderIsAlly,attacker){
  if(!defender||!attacker||defender.hp<=0||attacker.hp<=0) return;
  const hasCounter=defender.counter||(defender.keywords||[]).includes('反撃');
  if(!hasCounter||defender.atk<=0) return;
  const maxHits=_attackRepeatCount(defender);
  for(let hi=0;hi<maxHits;hi++){
    if(!defender||!attacker||defender.hp<=0||attacker.hp<=0) break;
    _applyAttackEffectsForSide(defender,!defenderIsAlly);
    if(defenderIsAlly){
      const srcIdx=G.enemies.indexOf(attacker);
      if(srcIdx<0) break;
      log(`⚔ ${defender.name}の反撃${hi>0?`：${hi+1}段目`:''}：${attacker.name}に${defender.atk}ダメ`,'good');
      dealDmgToEnemy(attacker,defender.atk,srcIdx,defender);
    } else {
      const srcIdx=G.allies.indexOf(attacker);
      if(srcIdx<0) break;
      log(`⚔ ${defender.name}の反撃${hi>0?`：${hi+1}段目`:''}：${attacker.name}に${defender.atk}ダメ`,'bad');
      _dealAttackDamage(defender,true,attacker,srcIdx,defender.atk);
    }
  }
}

function _effectAttackSequence(attacker,isEnemySide,forcedTarget,actionLabel='効果攻撃'){
  if(!attacker||attacker.hp<=0||attacker.atk<=0) return false;
  const opponents=isEnemySide?G.allies:G.enemies;
  let target=forcedTarget&&forcedTarget.hp>0?forcedTarget:null;
  const hits=_attackRepeatCount(attacker);
  let didHit=false;
  for(let hi=0;hi<hits;hi++){
    if(!attacker||attacker.hp<=0) break;
    if(!target||target.hp<=0||target._isObject) target=getAttackTarget(attacker,opponents);
    if(!target||target.hp<=0) break;
    const targetIdx=opponents.indexOf(target);
    if(targetIdx<0) break;
    _applyAttackEffectsForSide(attacker,isEnemySide);
    log(`${attacker.name}：${actionLabel}${hi>0?`（${hi+1}段目）`:''}→${target.name}`,isEnemySide?'bad':'good');
    const actualTarget=_dealAttackDamage(attacker,isEnemySide,target,targetIdx,attacker.atk);
    const defender=actualTarget||target;
    _mutualStrikeBack(attacker,isEnemySide,defender,defender?.atk||0);
    _maybeCounterAttack(defender,!isEnemySide,attacker);
    didHit=true;
  }
  return didHit;
}

// 攻撃ターゲットを決定する
function getAttackTarget(attacker, targets){
  const live=targets.filter(u=>u&&u.hp>0&&!u._isObject); // オブジェクトは攻撃対象から除外
  if(!live.length) return null;
  const pool=live.filter(u=>!u.stealth);
  return randFrom(pool.length?pool:live);
}

async function allyAttackAction(ally, allyIdx){
  if(ally.atk<=0) return; // ATK0は攻撃しない
  const liveE=G.enemies.filter(e=>e&&e.hp>0);
  if(!liveE.length) return;

  // アニメーション（攻撃ライン＋グロー）
  const target=getAttackTarget(ally,G.enemies);
  if(!target) return;
  const eIdx=G.enemies.indexOf(target);
  const aSlot=document.getElementById('f-ally')?.querySelectorAll('.slot')[allyIdx];
  const eAllSlots=document.getElementById('f-enemy')?.querySelectorAll('.slot');
  const eSlot=eAllSlots?.[eIdx];
  const isGlobal=ally.keywords&&ally.keywords.includes('全体攻撃');
  const isTriDir=ally.keywords&&ally.keywords.includes('三方向攻撃');
  if(aSlot) aSlot.classList.add('glow-blue');
  if(eSlot) eSlot.classList.add('glow-red');
  if(isGlobal){
    const allTgtSlots=liveE.map(e=>eAllSlots?.[G.enemies.indexOf(e)]).filter(Boolean);
    showAttackLine(aSlot,allTgtSlots,'#4080ff');
  } else if(isTriDir){
    const _tdIdxs=[eIdx-1,eIdx,eIdx+1].filter(i=>i>=0&&i<G.enemies.length&&G.enemies[i]&&G.enemies[i].hp>0);
    showAttackLine(aSlot,_tdIdxs.map(i=>eAllSlots?.[i]).filter(Boolean),'#4080ff');
  } else {
    showAttackLine(aSlot,eSlot?[eSlot]:[],'#4080ff');
  }
  await sleep(300);
  if(aSlot) aSlot.classList.remove('glow-blue');
  if(eSlot) eSlot.classList.remove('glow-red');
  hideAttackLine();

  if(ally.stealth){ ally.stealth=false; log(`${ally.name}の隠密が解除された`,'sys'); }

  // 攻撃時効果（ダメージを与える前に発動）
  if(ally.hp>0) _applyAllyAttackEffectsWithElf(ally);

  // 全体攻撃・三方向攻撃・単体攻撃の振り分け
  const attackTargets=isGlobal?[...liveE]:isTriDir?([eIdx-1,eIdx,eIdx+1].filter(i=>i>=0&&i<G.enemies.length).map(i=>G.enemies[i]).filter(e=>e&&e.hp>0)):[target];
  const _atkLabel=isGlobal?'全敵':isTriDir?`${target.name}周辺3体`:target.name;
  log(`${ally.name}(${ally.atk})→${_atkLabel}`);

  attackTargets.forEach(t=>{
    const ti=G.enemies.indexOf(t);
    const actualTarget=_dealAttackDamage(ally,false,t,ti,ally.atk,false);
    const defender=actualTarget||t;
    // 反撃キーワード持ちはさらに追加ダメージ（生き残った場合のみ・攻撃効果も発動）
    _maybeCounterAttack(defender,false,ally);
  });
  // 多段攻撃（三段=×2、二段=×1）：三方向攻撃とは併用しない
  if(ally.hp>0&&!isGlobal&&!isTriDir){
    const extraHits=ally.keywords&&ally.keywords.includes('三段攻撃')?2:ally.keywords&&ally.keywords.includes('二段攻撃')?1:0;
    let curTgt=target;
    for(let hi=0;hi<extraHits;hi++){
      if(!curTgt||curTgt.hp<=0){
        curTgt=getAttackTarget(ally,G.enemies);
      }
      if(!curTgt||curTgt.hp<=0) break;
      // 各段ごとにアニメーション
      const hitSlot=eAllSlots?.[G.enemies.indexOf(curTgt)];
      if(aSlot) aSlot.classList.add('glow-blue');
      if(hitSlot) hitSlot.classList.add('glow-red');
      showAttackLine(aSlot,hitSlot?[hitSlot]:[],'#4080ff');
      await sleep(200);
      if(aSlot) aSlot.classList.remove('glow-blue');
      if(hitSlot) hitSlot.classList.remove('glow-red');
      hideAttackLine();
      // 攻撃時効果（各段攻撃ごとに発動）
      if(ally.hp>0) _applyAllyAttackEffectsWithElf(ally);
      log(`${ally.name}：${hi+2}段目→${curTgt.name}`,'good');
      const actualTarget=_dealAttackDamage(ally,false,curTgt,G.enemies.indexOf(curTgt),ally.atk,false);
      const defender=actualTarget||curTgt;
      _maybeCounterAttack(defender,false,ally);
    }
  }

  renderAll();
  await sleep(300);
}

// ── 敵攻撃アクション ──────────────────────────

async function enemyAttackAction(enemy, enemyIdx){
  if(enemy.atk<=0) return; // ATK0は攻撃しない
  const liveA=G.allies.filter(a=>a&&a.hp>0);
  if(!liveA.length) return;

  // 行動不能（封印）：このターンはスキップしてカウンタを減らす
  if(enemy.sealed>0){
    enemy.sealed--;
    log(`${enemy.name}：行動不能`,'sys');
    return;
  }

  // ターゲット選択（前衛後衛ルール）
  const primaryTarget=getAttackTarget(enemy,G.allies);
  if(!primaryTarget) return;
  const targets=[primaryTarget];
  const primaryIdx=G.allies.indexOf(primaryTarget);

  // アニメーション（攻撃ライン＋グロー）
  const eSlot=document.getElementById('f-enemy')?.querySelectorAll('.slot')[enemyIdx];
  const aAllSlots=document.getElementById('f-ally')?.querySelectorAll('.slot');
  const aSlot=aAllSlots?.[primaryIdx];
  const isGlobalAtk=enemy.keywords&&enemy.keywords.includes('全体攻撃');
  const isTriDirAtk=enemy.keywords&&enemy.keywords.includes('三方向攻撃');
  const liveAllForGlobal=G.allies.filter(a=>a&&a.hp>0&&!a.stealth);
  if(eSlot) eSlot.classList.add('glow-blue');
  if(aSlot) aSlot.classList.add('glow-red');
  if(isGlobalAtk){
    const allTgtSlots=liveAllForGlobal.map(a=>aAllSlots?.[G.allies.indexOf(a)]).filter(Boolean);
    showAttackLine(eSlot,allTgtSlots,'#ff4040');
  } else if(isTriDirAtk){
    const _tdAIdxs=[primaryIdx-1,primaryIdx,primaryIdx+1].filter(i=>i>=0&&i<G.allies.length&&G.allies[i]&&G.allies[i].hp>0&&!G.allies[i].stealth);
    showAttackLine(eSlot,_tdAIdxs.map(i=>aAllSlots?.[i]).filter(Boolean),'#ff4040');
  } else {
    showAttackLine(eSlot,aSlot?[aSlot]:[],'#ff4040');
  }
  await sleep(300);
  if(eSlot) eSlot.classList.remove('glow-blue');
  if(aSlot) aSlot.classList.remove('glow-red');
  hideAttackLine();

  const atkVal=enemy.nullified>0?0:enemy.atk;
  if(enemy.nullified>0) enemy.nullified--;

  // 攻撃時効果（フォルニョート等、敵陣営版）
  if(atkVal>0&&enemy.hp>0) _applyEnemyAttackEffectsWithElf(enemy);

  // 全体攻撃・三方向攻撃・単体攻撃の振り分け（三方向攻撃：隣接3スロット、隠密は除外）
  const _triAIdxs=isTriDirAtk?[primaryIdx-1,primaryIdx,primaryIdx+1].filter(i=>i>=0&&i<G.allies.length&&G.allies[i]&&G.allies[i].hp>0&&!G.allies[i].stealth):[];
  const finalTargets=isGlobalAtk?liveAllForGlobal:isTriDirAtk?_triAIdxs.map(i=>G.allies[i]):targets;

  // 全ターゲットを攻撃
  const hitNames=[];
  const hitSet=new Set();
  finalTargets.forEach(tgt=>hitNames.push(tgt.name));
  log(`${enemy.name}(${atkVal})→${isGlobalAtk?'全体':isTriDirAtk?`${primaryTarget.name}周辺3体`:hitNames.join('・')}`);
  finalTargets.forEach(tgt=>{
    const aIdx=G.allies.indexOf(tgt);
    if(!hitSet.has(tgt.id)){
      const actualTarget=_dealAttackDamage(enemy,true,tgt,aIdx,atkVal);
      const defender=actualTarget||tgt;
      _mutualStrikeBack(enemy,true,defender,defender?.atk||0);
      _maybeCounterAttack(defender,true,enemy);
      hitSet.add(tgt.id);
    }
  });

  // 多段攻撃キーワード（三段=×2、二段=×1）：三方向攻撃とは併用しない
  if(!isGlobalAtk&&!isTriDirAtk&&enemy.hp>0){
    const extraHits=enemy.keywords&&enemy.keywords.includes('三段攻撃')?2:enemy.keywords&&enemy.keywords.includes('二段攻撃')?1:0;
    let reTgt=finalTargets[0];
    for(let hi=0;hi<extraHits;hi++){
      if(!reTgt||reTgt.hp<=0){
        reTgt=getAttackTarget(enemy,G.allies);
      }
      if(!reTgt||reTgt.hp<=0) break;
      // 各段ごとにアニメーション
      const reHitSlot=aAllSlots?.[G.allies.indexOf(reTgt)];
      if(eSlot) eSlot.classList.add('glow-blue');
      if(reHitSlot) reHitSlot.classList.add('glow-red');
      showAttackLine(eSlot,reHitSlot?[reHitSlot]:[],'#ff4040');
      await sleep(200);
      if(eSlot) eSlot.classList.remove('glow-blue');
      if(reHitSlot) reHitSlot.classList.remove('glow-red');
      hideAttackLine();
      // 攻撃時効果（各段攻撃ごとに発動）
      if(enemy.hp>0) _applyEnemyAttackEffectsWithElf(enemy);
      log(`${enemy.name}：${hi+2}段目→${reTgt.name}`,'bad');
      const actualTarget=_dealAttackDamage(enemy,true,reTgt,G.allies.indexOf(reTgt),atkVal);
      const defender=actualTarget||reTgt;
      _mutualStrikeBack(enemy,true,defender,defender?.atk||0);
      _maybeCounterAttack(defender,true,enemy);
    }
  }

  // 標的ターン消費はbattlePhaseで1ラウンドに1回行う

  // ドラウグ：攻撃した敵に毒3（受動効果：攻撃を行った敵が毒を受ける）
  if(enemy.hp>0&&G.allies.some(a=>a&&a.hp>0&&a.effect==='draug_attack')){
    const _dpv=3+(G.hasGoldenDrop?1:0);
    enemy.poison=(enemy.poison||0)+_dpv;
    log(`ドラウグ：${enemy.name}が攻撃→毒${_dpv}`,'good');
  }

  renderAll();
  await sleep(300);
}

// ── 味方へのダメージ処理 ─────────────────────────

function _redirectToBodyguard(list, unit, tone) {
  if (!unit || unit.effect === 'bodyguard') return unit;
  const guard = (list || []).find(a => a && a.hp > 0 && a !== unit && a.effect === 'bodyguard');
  if (!guard) return unit;
  log(`${guard.name}：${unit.name}の身代わりになった`, tone || 'sys');
  return guard;
}

// 戻り値：ダメージが通った(true) / 0ダメまたはシールドでブロック(false)
function dealDmgToAlly(unit, dmg, _fieldIdx, src, _suppressCounter, _skipRedirect){
  if(!unit||unit.hp<=0) return false;
  if(dmg>0&&!_skipRedirect){
    const redirected=_redirectToBodyguard(G.allies, unit, 'good');
    if(redirected!==unit){
      unit=redirected;
      _fieldIdx=G.allies.indexOf(unit);
    }
  }

  // 0ダメ（封印・無効化）：反撃は攻撃行為に対して発動（生存確定なので発動OK）
  if(dmg<=0){
    if(!_suppressCounter) _maybeCounterAttack(unit,true,src);
    return false;
  }

  // シールド
  if(unit.shield>0){
    unit.shield--;
    log(`🛡 ${unit.name}のシールドがダメージを防いだ（残${unit.shield}）`,'sys');
    onAllyShieldLost(unit);
    // 反撃：シールドで防いでも生き残っているので発動
    if(!_suppressCounter) _maybeCounterAttack(unit,true,src);
    return false; // ダメージをシールドで防いだ
  }

  // ドレイク（常時）：仲間がダメージを受ける時、その仲間のライフが+2される（ダメージ前処理）
  if(dmg>0&&G.allies.some(a=>a&&a.hp>0&&a.effect==='drake_mitigate'&&a!==unit)){
    const _drv=2;
    unit.hp+=_drv; unit.maxHp+=_drv;
    log(`🐲 ドレイク：${unit.name}のライフ+${_drv}（ダメージ前処理）`,'good');
  }
  // 呪詛加算
  const actualDmg=Math.max(0, dmg)+(unit.curse||0);
  unit.hp=Math.max(0,unit.hp-actualDmg);
  if(actualDmg>0&&typeof playHitVfx==='function') playHitVfx('ally',_fieldIdx);
  if(actualDmg>0&&typeof playSfx==='function') playSfx('hitLight',{group:'combat'});
  if(dmg>0&&src&&src.keywords&&src.keywords.length&&unit.hp>0){
    applyKeywordOnHit(src,unit,actualDmg);
  }

  // 負傷トリガー：生き残った場合のみ発動
  const willDie=unit.hp<=0;
  if(unit.injury&&!willDie){
    triggerInjury(unit, actualDmg);
  }

  // 反撃：ダメージを受けて生き残った場合のみ発動
  if(!willDie&&!_suppressCounter) _maybeCounterAttack(unit,true,src);

  // リリス・ヴェノム（敵側）：味方がダメージを受けた時、毒3を与える
  if(!willDie && actualDmg>0){
    G.enemies.forEach(li=>{ if(li&&li.hp>0&&li.effect==='lilith_ondmg'){ unit.poison=(unit.poison||0)+3; log(`🎤 ${li.name}：${unit.name}に毒+3`,'bad'); }});
  }

  if(willDie){ unit.hp=0; processAllyDeath(unit); } // 負傷でHP回復しても死亡確定
  return true; // ダメージが通った
}

// ── 味方の死亡処理 ──────────────────────────────

function processAllyDeath(unit){
  if(unit.hp>0||unit._deathProcessed) return;
  unit._deathProcessed=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});

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
    triggerDeathEffectTriggered(unit);
  }
  if(unit._deathAlliesDmg){
    const dmg=unit._deathAlliesDmg;
    G.allies.forEach((a,ai)=>{ if(a&&a.hp>0&&a!==unit) dealDmgToAlly(a,dmg,ai,unit); });
    log(`${unit.name}：死亡→全ての味方に${dmg}ダメ`,'bad');
    triggerDeathEffectTriggered(unit);
  }
  // スケルトン：死亡時に0/4の「骨」を即座に召喚
  if(unit.effect==='skeleton_bone'){
    const _boneG=unit.grade||1;
    const _boneHp=1;
    const _deadAtk=unit.atk||0;
    const _deadHp=unit.maxHp!=null?unit.maxHp:(7*_boneG);
    const _deadKws=[...(unit.keywords||[])];
    const _boneDef=makeSheetBackedUnitDef({id:'c_bone',name:'骨',race:'不死',grade:_boneG,atk:0,hp:_boneHp,cost:0,unique:false,icon:'🦴',desc:`誘発：ターン開始時、${_deadAtk}/${_deadHp}、不死の「スケルトン」に変身する。`,effect:'bone_transform'});
    const _boneSlot=G.allies.findIndex(a=>a===unit);
    if(_boneSlot>=0){
      const _boneUnit=makeUnitFromDef(_boneDef);
      _boneUnit._skelAtk=_deadAtk; _boneUnit._skelHp=_deadHp; _boneUnit._skelKws=[..._deadKws];
      G.allies[_boneSlot]=_boneUnit;
      log(`${unit.name}：死亡→骨(0/${_boneHp})を召喚`,'good');
      // グリマルキン（passive）：カード効果で召喚された仲間が+1/+1
      if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_boneUnit,G.allies);
      // コカトリス：キャラクター効果で召喚されるとコカトリス自身が+1/+1を得る
      if(typeof triggerCocatrice==='function') triggerCocatrice(_boneUnit);
      checkSolitudeBuff();
    }
    triggerDeathEffectTriggered(unit);
  }
  // ソウルボム（アルプ負傷）：死亡時、仲間全員にダメージ
  if(unit.effect==='soul_bomb_death'){
    const _sbdmg=5*(unit.grade||1);
    const _sbCopy=[...G.allies];
    _sbCopy.forEach((a,ai)=>{ if(a&&a.hp>0&&a!==unit) dealDmgToAlly(a,_sbdmg,ai,unit); });
    log(`${unit.name}：死亡→仲間全員に${_sbdmg}ダメ`,'bad');
    triggerDeathEffectTriggered(unit);
  }
  // ファントム：アク以外の仲間が死んだ時、0/1不死の「アク」を召喚
  if(unit.name!=='アク'){
    G.allies.forEach(ph=>{
      if(!ph||ph.hp<=0||ph.effect!=='phantom_onallydie') return;
      const akDef=makeSheetBackedUnitDef({id:'c_aku',name:'アク',race:'不死',grade:ph.grade||1,atk:0,hp:1,cost:0,unique:false,icon:'🌑',desc:''});
      const empty=G.allies.findIndex(s=>!s||s.hp<=0);
      if(empty>=0){
        const _akUnit=makeUnitFromDef(akDef);
        G.allies[empty]=_akUnit;
        log(`${ph.name}：${unit.name}の死→アク(0/1)を召喚`,'good');
        // グリマルキン（passive）：カード効果で召喚された仲間が+1/+1
        if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_akUnit,G.allies);
        // コカトリス：キャラクター効果で召喚されるとコカトリス自身が+1/+1を得る
        if(typeof triggerCocatrice==='function') triggerCocatrice(_akUnit);
        checkSolitudeBuff();
      }
    });
  }
  // マミー：死亡時、3ソウルを得る
  if(unit.effect==='mummy_death'&&!G._isSimulating){
    const mv=3+(G.hasGoldenDrop?1:0);
    onGoldGained(mv);
    log(`${unit.name}：死亡→ソウル+${mv}`,'gold');
    triggerDeathEffectTriggered(unit);
  }
  if(unit.effect==='banshee_death'){
    const v=2+(G.hasGoldenDrop?1:0);
    G._futureCharAtkBonus=(G._futureCharAtkBonus||0)+v;
    log(`${unit.name}：死亡→以後の商談キャラATK+${v}（累計+${G._futureCharAtkBonus}）`,'good');
    triggerDeathEffectTriggered(unit);
  }
  if(unit.effect==='fecht_death'){
    G._pendingFechtRevives=G._pendingFechtRevives||[];
    G._pendingFechtRevives.push(clone(unit));
    log(`${unit.name}：死亡→戦闘終了時に復活予約`,'good');
    triggerDeathEffectTriggered(unit);
  }
  if(unit.effect==='eidolon_death'){
    const av=2+(G.hasGoldenDrop?1:0), hv=1+(G.hasGoldenDrop?1:0);
    G.allies.forEach(a=>{
      if(a&&a.hp>0&&unitMatchesRace(a,'不死')){
        applyUnitBuff(a,av,hv,'ally');
        if(!a.shield) a.shield=1;
      }
    });
    log(`${unit.name}：死亡→全仲間の不死+${av}/+${hv}とシールド`,'good');
    triggerDeathEffectTriggered(unit);
  }
  // ナグルファル：キャラクター死亡ごとに+2/+1
  _onAnyCharDeath(unit);
}

function _onAnyCharDeath(deadUnit){
  const _gd0=G.hasGoldenDrop?1:0;
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&a.effect==='naglfar_ondeath'){
      const _nnums=[...(a.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
      const nv=(_nnums[0]||2)+_gd0, nhv=(_nnums[1]||1)+_gd0;
      a.atk+=nv; a.baseAtk=(a.baseAtk||0)+nv; a.hp+=nhv; a.maxHp+=nhv;
      log(`${a.name}：キャラ死亡→+${nv}/+${nhv}`,'good');
    }
    if(a&&a.hp>0&&a.effect==='bandersnatch_ally_death'&&deadUnit&&G.allies.includes(deadUnit)&&deadUnit!==a){
      G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,4,ei,a); });
      log(`${a.name}：仲間死亡→全相手に4ダメ`,'good');
    }
  });
  G.enemies.forEach(e=>{
    if(e&&e.hp>0&&e.effect==='naglfar_ondeath'){
      e.atk+=2; e.hp+=1; e.maxHp+=1;
      log(`${e.name}：キャラ死亡→+2/+1`,'bad');
    }
    if(e&&e.hp>0&&e.effect==='bandersnatch_ally_death'&&deadUnit&&G.enemies.includes(deadUnit)&&deadUnit!==e){
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0) dealDmgToAlly(a,4,ai,e); });
      log(`${e.name}：仲間死亡→全相手に4ダメ`,'bad');
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
  const rgDef=makeSheetBackedUnitDef({id:'c_royal_guard',name:'ロイヤルガード',race:'獣',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'💂',desc:'反撃',counter:true});
  switch(unit.injury){
    case 'slin':{
      const _nums=[...((unit.desc||'').matchAll(/\d+/g))].map(m=>parseInt(m[0]));
      const _sv=(_nums[0]||2)+(!isEnemy&&G.hasGoldenDrop?1:0);
      const _done=addUnitHp(unit,_sv,isEnemy?'enemy':'ally');
      log(`${unit.name}：負傷→ライフ+${_done}`,col);
      break;
    }
    case 'freyr':{
      // 最も右の空きスロットにストーンキャットを召喚（自陣）
      const scDef=makeSheetBackedUnitDef({id:'c_stone_cat',name:'ストーンキャット',race:'-',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'🗿',desc:'',counter:true,keywords:['反撃','アーティファクト']});
      // 右（スロット5）から順に空きを探す（配列長に依存しない）
      let _fSlot=-1;
      for(let _fsi=5;_fsi>=0;_fsi--){ if(!ownSide[_fsi]||ownSide[_fsi].hp<=0){_fSlot=_fsi;break;} }
      if(_fSlot>=0){
        const slot=_fSlot;
        const _freyrUnit=makeUnitFromDef(scDef);
        ownSide[slot]=_freyrUnit;
        log(`${unit.name}：ストーンキャット(4/6+反撃)を召喚`,col);
        if(!isEnemy){
          // グリマルキン（passive）：カード効果で召喚された仲間が+1/+1
          if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_freyrUnit,G.allies);
          checkSolitudeBuff();
        }
        if(typeof triggerCocatrice==='function') triggerCocatrice(_freyrUnit);
      }
      break;
    }
    case 'worm':{
      const _wnums=[...(unit.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
      const _wv=(_wnums[0]||1)+(G.hasGoldenDrop&&!isEnemy?1:0);
      ownSide.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_wv; a.baseAtk=(a.baseAtk||0)+_wv; }});
      log(`${unit.name}：負傷→全仲間+${_wv}/±0`,col);
      if(!isEnemy){
        // リンドヴルム：仲間の負傷発動時、全仲間竜+1/+1
        G.allies.forEach(lw=>{ if(lw&&lw.hp>0&&lw.effect==='lindworm_injury'){ const _lwn=[...(lw.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0])); const _lv=(_lwn[0]||1)+(G.hasGoldenDrop?1:0); G.allies.forEach(d=>{ if(d&&d.hp>0&&unitMatchesRace(d,'竜')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }}); log(`${lw.name}：仲間負傷→全仲間の竜+${_lv}/+${_lv}`,'good'); }});
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
    case 'kettcat':{
      const _ncG=unit.grade||1, _ncAtk=_ncG, _ncHp=2*_ncG;
      const def=makeSheetBackedUnitDef({id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:_ncG,atk:_ncAtk,hp:_ncHp,cost:0,unique:false,icon:'🐱',desc:''});
      if(!isEnemy){
        const _nc=makeUnitFromDef(def);
        const ei=G.allies.findIndex(a=>!a||a.hp<=0);
        if(ei>=0){
          G.allies[ei]=_nc;
          log(`${unit.name}：ナイトキャット(${_ncAtk}/${_ncHp})を召喚`,'good');
          // グリマルキン（passive）：カード効果で召喚された仲間が+1/+1
          if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_nc,G.allies);
          checkSolitudeBuff();
        }
      } else {
        const ei=ownSide.findIndex(a=>!a||a.hp<=0);
        if(ei>=0){
          const _nc=makeUnitFromDef(def);
          ownSide[ei]=_nc;
          log(`${unit.name}：ナイトキャット(${_ncAtk}/${_ncHp})を召喚`,col);
          if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_nc,ownSide,col);
        }
      }
      break;
    }
    case 'ran':{
      // 10/X（X=被ダメージ）の「海の眷属」を左端に召喚（自陣）
      const ranHp=Math.max(1,dmg);
      const ranDef=makeSheetBackedUnitDef({id:'c_ran_spawn',name:'海の眷属',race:'亜人',grade:unit.grade||1,atk:10,hp:ranHp,cost:0,unique:false,icon:'🐚',desc:''});
      const ri=ownSide.findIndex(a=>!a||a.hp<=0);
      if(ri>=0){ ownSide[ri]=makeUnitFromDef(ranDef); log(`${unit.name}：海の眷属(10/${ranHp})を召喚`,col); if(!isEnemy) checkSolitudeBuff(); }
      break;
    }
    case 'limslus':{
      // 負傷：敵（opposing side）全体に3ダメ＋呪詛などキーワード効果を適用
      const _lnums=[...(unit.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
      const _ldmg=(_lnums[_lnums.length-1]||3)+(!isEnemy&&G.hasGoldenDrop?1:0);
      oppSide.forEach((u,ui)=>{
        if(!u||u.hp<=0) return;
        if(isEnemy) dealDmgToAlly(u,_ldmg,ui,unit);
        else dealDmgToEnemy(u,_ldmg,ui,unit);
      });
      log(`${unit.name}：負傷→相手全体に${_ldmg}ダメ`,col);
      break;
    }
    case 'arachas':{
      const _admg=1+(!isEnemy&&G.hasGoldenDrop?1:0);
      [...G.allies,...G.enemies].forEach(u=>{
        if(!u||u.hp<=0||u._isObject||u===unit) return;
        const i=G.allies.includes(u)?G.allies.indexOf(u):G.enemies.indexOf(u);
        if(G.allies.includes(u)) dealDmgToAlly(u,_admg,i,unit);
        else dealDmgToEnemy(u,_admg,i,unit);
      });
      log(`${unit.name}：負傷→自身以外の全キャラに${_admg}ダメ`,col);
      break;
    }
    case 'banshee':{
      // 新仕様では死亡効果誘発（banshee_death_trigger）に移行
      break;
    }
    case 'warg':{
      // 全ての仲間の獣が+1/+1
      const _wgnums=[...(unit.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
      const _wgv=(_wgnums[0]||1)+(!isEnemy&&G.hasGoldenDrop?1:0);
      ownSide.forEach(a=>{ if(a&&a.hp>0&&unitMatchesRace(a,'獣')){ a.atk+=_wgv; a.baseAtk=(a.baseAtk||0)+_wgv; a.hp+=_wgv; a.maxHp+=_wgv; }});
      log(`${unit.name}：負傷→全仲間の獣+${_wgv}/+${_wgv}`,col);
      break;
    }
    case 'alp':{
      // 相手の場に0/N「ソウルボム」を召喚（死亡時、その仲間全員にダメージ）
      const _alpG=unit.grade||1;
      const _sbG=Math.max(1,_alpG-1); // G1→sbG=1, G2→sbG=1, G3→sbG=2, G4→sbG=3
      const _sbHp=_sbG;
      const _sbDmg=5*_sbG;
      const _alpDef=makeSheetBackedUnitDef({id:'c_soul_bomb',name:'ソウルボム',race:'精霊',grade:_sbG,atk:0,hp:_sbHp,cost:0,unique:false,icon:'💣',desc:`誘発：死亡した場合、すべての仲間に${_sbDmg}ダメージを与える。`,effect:'soul_bomb_death'});
      if(G.phase==='reward'&&!isEnemy){
        // 報酬フェイズ中の味方アルプ：提示カードにソウルボムを追加
        const _sbCard=Object.assign({},makeUnitFromDef(_alpDef));
        _sbCard._isChar=true; _sbCard._rewSummoned=true;
        let _rslot=-1;
        for(let _ri=0;_ri<6;_ri++){ if(!_rewCards[_ri]||!_rewCards[_ri]._isChar||_rewCards[_ri].hp<=0){ _rslot=_ri; break; } }
        if(_rslot>=0) _rewCards[_rslot]=_sbCard; else _rewCards.push(_sbCard);
        if(typeof renderRewCards==='function') renderRewCards();
        log(`${unit.name}：負傷→ソウルボム(0/${_sbHp})を提示カードに召喚`,col);
        if(typeof triggerCocatrice==='function') triggerCocatrice(_sbCard);
        break;
      }
      const _alpSlot=oppSide.slice(0,6).findIndex(a=>!a||a.hp<=0);
      const _sbUnit=makeUnitFromDef(_alpDef);
      if(_alpSlot>=0) oppSide[_alpSlot]=_sbUnit;
      else if(oppSide.length<6) oppSide.push(_sbUnit);
      else { log(`${unit.name}：負傷→相手陣が満杯のためソウルボム出現せず`,col); break; }
      log(`${unit.name}：負傷→ソウルボム(0/${_sbHp})を相手陣に召喚`,col);
      if(typeof triggerCocatrice==='function') triggerCocatrice(_sbUnit);
      break;
    }
    case 'hydra':{
      const targets=oppSide.filter(u=>u&&u.hp>0&&!u._isObject);
      if(targets.length){
        const t=randFrom(targets);
        t.sealed=(t.sealed||0)+1;
        log(`${unit.name}：負傷→${t.name}を1ターン行動不能にする`,col);
      }
      break;
    }
    case 'sea_serpent':{
      const dmg=2+(!isEnemy&&G.hasGoldenDrop?1:0);
      oppSide.forEach((u,ui)=>{
        if(!u||u.hp<=0) return;
        if(isEnemy) dealDmgToAlly(u,dmg,ui,unit);
        else dealDmgToEnemy(u,dmg,ui,unit);
      });
      log(`${unit.name}：負傷→全ての相手に${dmg}ダメ`,col);
      break;
    }
    case 'shadow':{
      // 正面のキャラクターに変身（スタッツも含む）
      const _shadowIdx=ownSide.indexOf(unit);
      const _frontOpp=oppSide[_shadowIdx];
      if(_frontOpp&&_frontOpp.hp>0){
        const _prevName=unit.name;
        unit.name=_frontOpp.name; unit.icon=_frontOpp.icon; unit.race=_frontOpp.race||'-';
        unit.atk=_frontOpp.atk||0; unit.baseAtk=_frontOpp.baseAtk||unit.atk;
        unit.hp=_frontOpp.hp||1; unit.maxHp=_frontOpp.maxHp||unit.hp;
        unit.keywords=_frontOpp.keywords&&_frontOpp.keywords.length?[..._frontOpp.keywords]:[];
        unit.counter=_frontOpp.counter||false;
        unit.effect=_frontOpp.effect||null;
        unit.injury='shadow'; // 負傷は維持（再変身可能）
        unit.desc=_frontOpp.desc||'';
        log(`${_prevName}：負傷→${unit.name}に変身（${unit.atk}/${unit.hp}）`,col);
        if(!isEnemy) checkSolitudeBuff();
      }
      break;
    }
  }
  if(unit.effect==='gremlin_attack'){
    const oppHand=isEnemy?G.spells:G.bossHand;
    const oppRings=isEnemy?G.rings:G.bossRings;
    const cards=[];
    (oppHand||[]).forEach((c,i)=>{ if(c) cards.push({arr:oppHand,i,c}); });
    (oppRings||[]).forEach((c,i)=>{ if(c) cards.push({arr:oppRings,i,c}); });
    if(cards.length){
      const pick=randFrom(cards);
      pick.arr[pick.i]=null;
      if(isEnemy) log(`${unit.name}：負傷→${pick.c.name}を破壊`,'bad');
      else { onGoldGained(1); log(`${unit.name}：負傷→${pick.c.name}を破壊しソウル+1`,'good'); }
    } else if(!isEnemy){ onGoldGained(1); log(`${unit.name}：負傷→破壊対象なし、ソウル+1`,'good'); }
  }
  if(unit.effect==='lizardman_attack'){
    // 現行シートでは攻撃効果。旧セーブ互換で負傷側に残っていても何もしない。
  }
  triggerInjuryEffectTriggered(unit);
  // リンドヴルム：仲間の負傷発動時（worm以外）、全仲間竜+1/+1
  if(!isEnemy && unit.injury !== 'worm'){
    const _lv=1+(G.hasGoldenDrop?1:0);
    G.allies.forEach(lw=>{ if(lw&&lw.hp>0&&lw.effect==='lindworm_injury'){ const _lwn=[...(lw.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0])); const _lv=(_lwn[0]||1)+(G.hasGoldenDrop?1:0); G.allies.forEach(d=>{ if(d&&d.hp>0&&unitMatchesRace(d,'竜')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }}); log(`${lw.name}：仲間負傷→全仲間の竜+${_lv}/+${_lv}`,'good'); }});
  }
}

// ── シールド喪失時 ──────────────────────────────

function onAllyShieldLost(lostUnit){
  if(lostUnit&&lostUnit.hp>0&&lostUnit.effect==='shana_shield_lost'){
    lostUnit.hate=false;
    lostUnit.hateTurns=0;
    lostUnit._visualShift=true;
    log(`${lostUnit.name}：シールド喪失→後衛に下がる`,'good');
  }
  // エインセル②：味方がシールドを失うと+1/+1を得る
  const _gde=G.hasGoldenDrop?1:0;
  G.allies.forEach(a=>{
    if(a&&a.hp>0&&(a.effect==='einsel'||a.effect==='einsel_shieldlost')){
      const ea=1+_gde, eh=1+_gde;
      a.atk+=ea; a.baseAtk+=ea; a.hp+=eh; a.maxHp+=eh;
      log(`${a.name}：シールド喪失→+${ea}/+${eh}`,'good');
      triggerDryadBuff();
    }
  });
}

function onEnemyShieldLost(){
  // エインセル（敵）：仲間がシールドを失うと+1/+1
  G.enemies.forEach(f=>{
    if(f&&f.hp>0&&(f.effect==='einsel'||f.effect==='einsel_shieldlost')){
      f.atk+=1; f.hp+=1; f.maxHp+=1;
      log(`${f.name}：シールド喪失→+1/+1`,'bad');
    }
  });
}

// ── 戦闘開始時キャラクター効果 ───────────────────

function _triggerScyllaStart(unit, isEnemySide) {
  if (!unit || unit.hp <= 0) return;
  const targets = (isEnemySide ? G.allies : G.enemies).filter(x => x && x.hp > 0);
  if (!targets.length) return;
  const target = randFrom(targets);
  const uHp = unit.hp;
  const tHp = target.hp;
  unit.hp = tHp;
  target.hp = uHp;
  unit.maxHp = Math.max(unit.maxHp || unit.hp, unit.hp);
  target.maxHp = Math.max(target.maxHp || target.hp, target.hp);
  log(`${unit.name}：${target.name}とライフを入れ替え（${uHp}⇔${tHp}）`, isEnemySide ? 'bad' : 'good');
}

function _triggerMedusaDrain(unit, isEnemySide) {
  if (!unit || unit.hp <= 0) return;
  let gained = 0;
  const targets = [];
  G.allies.forEach((a, i) => { if (a && a.hp > 0 && a !== unit) targets.push({unit:a, side:'ally', idx:i}); });
  G.enemies.forEach((e, i) => { if (e && e.hp > 0 && e !== unit) targets.push({unit:e, side:'enemy', idx:i}); });
  targets.forEach(t => {
    if (!t.unit || t.unit.hp <= 0) return;
    const loss = Math.min(2, t.unit.hp);
    if (loss <= 0) return;
    t.unit.hp = Math.max(0, t.unit.hp - loss);
    gained += loss;
    if (t.unit.hp <= 0) {
      if (t.side === 'ally') processAllyDeath(t.unit);
      else processEnemyDeath(t.unit, t.idx);
    }
  });
  if (gained > 0 && unit.hp > 0) {
    unit.hp += gained;
    unit.maxHp = (unit.maxHp || unit.hp) + gained;
    log(`${unit.name}：全キャラクターからライフを奪い+0/+${gained}`, isEnemySide ? 'bad' : 'good');
  }
}

function _grantDeathAlliesDamage(unit, isEnemySide){
  const targets=(isEnemySide?G.allies:G.enemies).filter(x=>x&&x.hp>0&&!x._isObject);
  if(!unit||unit.hp<=0||!targets.length) return;
  const t=randFrom(targets);
  t._deathAlliesDmg=4;
  log(`${unit.name}：${t.name}に「死亡：全ての味方に4ダメージ」を付与`,isEnemySide?'bad':'good');
}

function _triggerCrocuttaAttack(unit, isEnemySide){
  const opp=isEnemySide?G.allies:G.enemies;
  const live=opp.map((u,i)=>({u,i})).filter(x=>x.u&&x.u.hp>0&&!x.u._isObject);
  if(!live.length) return;
  const t=randFrom(live);
  _effectAttackSequence(unit,isEnemySide,t.u,'開戦');
}

function _triggerSeaBishopStart(unit, isEnemySide){
  let gained=0;
  const all=[...G.allies.map((u,i)=>({u,i,side:'ally'})),...G.enemies.map((u,i)=>({u,i,side:'enemy'}))];
  all.forEach(x=>{
    if(!x.u||x.u.hp<=0||x.u===unit) return;
    const before=x.u.hp;
    if(x.side==='ally') dealDmgToAlly(x.u,2,x.i,unit);
    else dealDmgToEnemy(x.u,2,x.i,unit);
    gained+=Math.min(2,before);
  });
  if(gained>0) addUnitHp(unit,gained,isEnemySide?'enemy':'ally');
  log(`${unit.name}：開戦→他の全キャラからライフを2奪う`,isEnemySide?'bad':'good');
}

function _gainRandomWand(uses, isEnemySide, source){
  const pool=(typeof SPELL_POOL!=='undefined'?SPELL_POOL:[]).filter(s=>s&&s.type==='wand'&&!s.starterOnly&&s.rarity!==-1);
  if(!pool.length) return;
  const w=clone(randFrom(pool));
  w.usesLeft=uses; w._maxUses=uses;
  if(isEnemySide){
    if(typeof addEnemyHandItem==='function') addEnemyHandItem(w);
  } else {
    const i=G.spells.findIndex(s=>!s);
    if(i>=0) G.spells[i]=w;
  }
  log(`${source.name}：チャージ${uses}の${w.name}を得た`,isEnemySide?'bad':'good');
}

function onBattleStart(){
  G._freeItemPhase='battle';
  G._freeItemUsed=false;
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
  // 憤激の指輪：戦闘中に召喚された仲間には summon.js 側で適用。
  // 既存仲間へのボーナスは指輪装備時（reward.js）にのみ適用され、戦闘開始時には再適用しない。
  // battle_start トリガーで召喚された仲間にボーナスを適用
  const _furyR2=G.rings&&G.rings.find(r=>r&&r.unique==='fury_start');
  if(_furyR2){
    const fb=3*(_furyR2.grade||1);
    G.allies.forEach(a=>{
      if(a&&a.hp>0&&!a._furyAtk){
        a.atk+=fb; a.baseAtk=(a.baseAtk||0)+fb; a._furyAtk=fb;
      }
    });
  }

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
      case 'scylla_start':
        _triggerScyllaStart(e, true);
        break;
      case 'medusa_drain':
        _triggerMedusaDrain(e, true);
        break;
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
      case 'imp_summon':
        break;
      case 'siren_start':
        G.enemyMagicLevel=(G.enemyMagicLevel||0)+1; log(`${e.name}：開戦→敵魔術レベル+1`,'bad'); break;
      case 'pegasus_start':
        G.enemies.forEach(f=>{ if(f&&f.hp>0&&(f.hate||f.lane==='front')) addUnitHp(f,4,'enemy'); });
        log(`${e.name}：開戦→前衛の仲間ライフ+4`,'bad'); break;
      case 'frost_start':{
        const i=G.enemies.indexOf(e);
        [i-1,i+1].forEach(j=>{ const f=G.enemies[j]; if(f&&f.hp>0&&!f.shield) f.shield=1; });
        log(`${e.name}：隣接する仲間にシールド付与`,'bad'); break;}
      case 'specter_start':
        _grantDeathAlliesDamage(e,true); break;
      case 'crocutta_start':
        _triggerCrocuttaAttack(e,true); break;
      case 'sea_bishop_start':
        _triggerSeaBishopStart(e,true); break;
      case 'selkie_start':
        _gainRandomWand(1,true,e); break;
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
      case 'manigans_start':
        G.allies.forEach(b=>{ if(b&&b.hp>0&&!b.shield) b.shield=1; });
        log(`${a.name}：全仲間にシールドを付与`,'good'); break;
      case 'scylla_start':
        _triggerScyllaStart(a, false);
        break;
      case 'medusa_drain':
        _triggerMedusaDrain(a, false);
        break;
      // drake_start（旧効果）は廃止 → drake_mitigate（dealDmgToAlly内）
      case 'salamander_start':
        { const _sdmg=4*((a._stackCount||0)+1)+(G.hasGoldenDrop?1:0); G.enemies.forEach(e=>{ if(e&&e.hp>0) dealDmgToEnemy(e,_sdmg,G.enemies.indexOf(e),a); }); log(`${a.name}：開幕全敵に${_sdmg}ダメ`,'good'); }
        break;
      case 'minotaur_gradeup':
        { const _mg=((a._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
          G._gradeUpCostBonus=(G._gradeUpCostBonus||0)+_mg;
          log(`${a.name}：グレードアップコスト-${_mg}（累計-${G._gradeUpCostBonus}）`,'good'); }
        break;
      case 'imp_summon':
        break;
      case 'siren_start':
        { const v=(a._stackCount||0)+1+(G.hasGoldenDrop?1:0); onMagicLevelUp(v); log(`${a.name}：開戦→魔術レベル+${v}（Lv${G.magicLevel}）`,'good'); }
        break;
      case 'pegasus_start':
        { const v=4*((a._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
          G.allies.forEach(b=>{ if(b&&b.hp>0&&(b.hate||b.lane==='front')) addUnitHp(b,v,'ally'); });
          log(`${a.name}：開戦→前衛の仲間ライフ+${v}`,'good'); }
        break;
      case 'homunculus_start':
        { const _races=new Set(G.allies.filter(b=>b&&b.hp>0&&b!==a&&b.race&&b.race!=='-'&&b.race!=='全て').map(b=>b.race));
          const _hx=_races.size+1+(G.hasGoldenDrop?1:0); // +1 for ホムンクルス自身の種族（「全て」として1カウント）
          if(_hx>0){ a.atk+=_hx; a.baseAtk=(a.baseAtk||0)+_hx; a.hp+=_hx; a.maxHp+=_hx; log(`${a.name}：種族数${_races.size}＋自身→+${_hx}/+${_hx}`,'good'); } }
        break;
      case 'frost_start':
        { const _fsi=G.allies.indexOf(a);
          [G.allies[_fsi-1],G.allies[_fsi+1]].forEach(t=>{ if(t&&t.hp>0&&!t.shield) t.shield=1; });
          log(`${a.name}：隣接する仲間にシールド付与`,'good'); }
        break;
      case 'specter_start':
        _grantDeathAlliesDamage(a,false); break;
      case 'crocutta_start':
        _triggerCrocuttaAttack(a,false); break;
      case 'sea_bishop_start':
        _triggerSeaBishopStart(a,false); break;
      case 'selkie_start':
        _gainRandomWand(1,false,a); break;
      // centaur_start（旧効果）は廃止 → centaur_attack（_applyAllyAttackEffects内）
      case 'golden_goose_start':
        { const _ggG=Math.max(1,(a.grade||1)-1);
          const _ggHp=_ggG;
          const _ggDef=makeSheetBackedUnitDef({id:'c_golden_egg',name:'ゴールデンエッグ',race:'獣',grade:_ggG,atk:0,hp:_ggHp,cost:0,unique:false,icon:'🥚',desc:`誘発：このキャラクターを還魂した時、ソウルを追加で${_ggG}得る。`,effect:'golden_egg_sell'});
          const _ggi=G.allies.findIndex(b=>!b||b.hp<=0);
          if(_ggi>=0){
            const _ggUnit2=makeUnitFromDef(_ggDef);
            G.allies[_ggi]=_ggUnit2;
            log(`${a.name}：ゴールデンエッグ(0/${_ggHp})を召喚`,'good');
            // グリマルキン（passive）：カード効果で召喚された仲間が+1/+1
            if(typeof applyGrimalkinSummonBonus==='function') applyGrimalkinSummonBonus(_ggUnit2,G.allies);
            if(typeof triggerCocatrice==='function') triggerCocatrice(_ggUnit2);
            checkSolitudeBuff();
          } }
        break;
    }
  });
  // 結束X：戦闘開始時、全味方+X/+X（味方側）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const kw=(a.keywords||[]).find(k=>/^結束\d+$/.test(k));
    if(kw){ const x=parseInt(kw.slice(2))+(G.hasGoldenDrop?1:0); let _xh=x; G.allies.forEach(b=>{ if(b&&b.hp>0){ b.atk+=x; _xh=addUnitHp(b,x); }}); log(`${a.name}：結束${x}→全味方+${x}/+${_xh}`,'good'); triggerDryadBuff(); }
  });
  // 成長X：戦闘開始時、+X/+Xを得る（自身のみ・両陣営）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const growKw=(a.keywords||[]).find(k=>/^成長\d+$/.test(k));
    if(!growKw) return;
    const x=parseInt(growKw.slice(2))+(G.hasGoldenDrop?1:0);
    a.atk+=x; a.baseAtk=(a.baseAtk||0)+x;
    const _xhg=addUnitHp(a,x);
    log(`🌱 ${a.name} 成長${x}：+${x}/+${_xhg}`,'good');
    triggerDryadBuff();
  });
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    const growKw=(e.keywords||[]).find(k=>/^成長\d+$/.test(k));
    if(!growKw) return;
    const x=parseInt(growKw.slice(2));
    e.atk+=x; e.baseAtk=(e.baseAtk||0)+x;
    e.hp+=x; e.maxHp+=x;
    log(`🌱 ${e.name} 成長${x}：+${x}/+${x}`,'bad');
  });
  // A・シールド（旧シールド・キーワード）：戦闘開始時にダメージ無効化シールドを得る（重複しない）
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    const kws=a.keywords||[];
    if((kws.includes('A・シールド')||kws.includes('シールド'))&&!a.shield){
      a.shield=1;
      log(`🛡 ${a.name}：A・シールドでシールドを得た`,'good');
    }
  });
  G.enemies.forEach(e=>{
    if(!e||e.hp<=0) return;
    const kws=e.keywords||[];
    if((kws.includes('A・シールド')||kws.includes('シールド'))&&!e.shield){
      e.shield=1;
      log(`🛡 ${e.name}：A・シールドでシールドを得た`,'bad');
    }
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
  let _dragonetTransformed=false;
  G.allies.forEach((a,i)=>{
    if(!a||a.effect!=='dragonet_end') return;
    a._dragonetCount=(a._dragonetCount||0)+1;
    if(a._dragonetCount>=(3+(a._dragonetBonus||0))){
      const _sc=a._stackCount||0;
      const _targetGrade=_sc>=2?4:2;
      const _allowNamed=_sc>=5;
      const _dragons=UNIT_POOL.filter(u=>u.race==='竜'&&(u.grade||1)===_targetGrade&&u.id!=='c_dragonet'&&(_allowNamed||!u.unique));
      const _target=_dragons.length?randFrom(_dragons):(UNIT_POOL.find(u=>u.id==='c_worm')||null);
      if(_target){
        const w=makeUnitFromDef(_target); w._isChar=true;
        G.allies[i]=w;
        _dragonetTransformed=true;
        log(`🐲 ドラゴネット：3戦目→${w.name}(G${_targetGrade})に変身！`,'gold');
      }
    } else {
      log(`🐲 ドラゴネット：変身まで${(3+(a._dragonetBonus||0))-a._dragonetCount}戦`,'sys');
    }
  });
  if(_dragonetTransformed) checkSolitudeBuff();

  // ラミア：戦闘終了時、魔術レベルが(desc上限)以下の場合、魔術レベルが+(desc増加量)される
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='lamia_end') return;
    const _ml=G.magicLevel||1;
    // descから数値を読み取る（例：「魔術レベルが6以下の場合、魔術レベルが+2される。」→[6,2]）
    const _laNums=[...(a.desc||'').matchAll(/\d+/g)].map(m=>parseInt(m[0]));
    const _mlCap=_laNums[0]||3;
    const _laGain=_laNums[1]||1;
    if(_ml<=_mlCap){
      const _lv=_laGain+(G.hasGoldenDrop?1:0);
      if(typeof onMagicLevelUp==='function') onMagicLevelUp(_lv);
      else { G.magicLevel=_ml+_lv; if(typeof syncHarpyAtk==='function') syncHarpyAtk(); }
      log(`${a.name}：終戦→魔術レベル+${_lv}（Lv${G.magicLevel}）`,'good');
    }
  });

  // gnome_end（ホムンクルス等）：戦闘終了時、2ソウル（黄金の雫：3）を得る
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='gnome_end') return;
    const _gv=2+(G.hasGoldenDrop?1:0);
    G.gold+=_gv; log(`${a.name}：終戦→ソウル+${_gv}`,'gold');
  });
  G.allies.forEach(a=>{
    if(!a||a.hp<=0||a.effect!=='zombie_end') return;
    a.hp=10;
    a.maxHp=Math.max(a.maxHp||10,10);
    log(`${a.name}：終戦→ライフが10になった`,'good');
  });

  if(G._pendingFechtRevives&&G._pendingFechtRevives.length){
    G._pendingFechtRevives.forEach(src=>{
      const slot=G.allies.findIndex(a=>!a||a.hp<=0);
      if(slot<0) return;
      const def=makeSheetBackedUnitDef(src);
      const u=makeUnitFromDef(def,undefined,true);
      u.hp=Math.max(1,u.hp||src.maxHp||1);
      G.allies[slot]=u;
      log(`${src.name}：戦闘終了時に復活`,'good');
    });
    G._pendingFechtRevives=[];
  }

  // 絆の指輪：一時付与した「結束X」キーワードを削除
  G.allies.forEach(a=>{ if(a&&a._bondKw){ a.keywords=(a.keywords||[]).filter(k=>k!==a._bondKw); delete a._bondKw; }});

  // 成長X は戦闘開始時に適用（onBattleStart 側）

  // 死亡ユニット（再生・復活で回復しなかった）をフィールドから除去
  for(let i=0;i<G.allies.length;i++){
    const a=G.allies[i];
    if(a&&a.hp<=0) G.allies[i]=null;
  }
}

// ── 勝利ボーナス ───────────────────────────────

function applyVictoryBonuses(){
  const killBonus=Math.max(0,G._enemiesKilledThisBattle||0);
  if(killBonus>0){
    G.allies.forEach(a=>{
      if(!a||a._isObject||a._isSoul) return;
      a.atk=(a.atk||0)+killBonus;
      a.baseAtk=(a.baseAtk||0)+killBonus;
      a.maxHp=(a.maxHp||a.hp||0)+killBonus;
      a.hp=(a.hp||0)+killBonus;
    });
    log(`勝利成長：全キャラ ATK/最大ライフ/現在ライフ +${killBonus}`,'good');
  }

  // 生命の指輪：全ての味方が±0/+1を得る
  G.rings.forEach(r=>{
    if(r&&r.unique==='life_reg'){
      G.allies.forEach(a=>{ if(a&&a.hp>0) addUnitHp(a,1); });
      log(`生命の指輪：全仲間ライフ+1`,'good');
      triggerDryadBuff();
    }
  });

  // ステージ突破ボーナス
  const fl=G.floor;
  const _sib=G._soulIncomeBonus||0;
  const stageBonus=(fl>=16?4:fl>=11?3:fl>=6?2:1)+_sib;
  G.gold+=stageBonus; G.earnedGold+=stageBonus;
  log(`ステージ突破ボーナス：${stageBonus}ソウル`+(_sib>0?`（+${_sib}魔神）`:''),'gold');

  onBattleEnd();
}

// ── スペル使用後の勝利チェック ──────────────────

function checkInstantVictory(){
  if(G.phase==='player'&&G.enemies.filter(e=>e&&e.hp>0&&!e._isObject).length===0){
    G.moveMasks.forEach((_,i)=>{ if(G.moveMasks[i]&&!G.visibleMoves.includes(i)) G.visibleMoves.push(i); });
    if(_isBossFight) G._bossJustDefeated=true;
    _dropPondRingIfNeeded();
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

function applyKeywordOnHit(attacker, target, damageDone){
  const kws=attacker.keywords||[];
  if(!kws.length||target.hp<=0) return;
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  if(kws.includes('即死')){ target.hp=0; log(`💀 即死：${attacker.name}の攻撃で${target.name}が即死！`,'bad'); }
  // 毒牙X：命中時に毒Xを付与（加算）
  const erosionKw=kws.find(k=>/^毒牙\d+$/.test(k));
  if((erosionKw||kws.includes('毒牙'))&&target.hp>0){
    const basePoison=erosionKw?parseInt(erosionKw.slice(2)):Math.max(0,Math.floor(damageDone??attacker.atk??0));
    const pv=basePoison+_gdKw;
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

function dealDmgToEnemy(e,dmg,eIdx,srcUnit,_suppressAutoRetaliate){
  if(!e||e.hp<=0) return;
  if(dmg>0){
    const redirected=_redirectToBodyguard(G.enemies, e, 'bad');
    if(redirected!==e){
      e=redirected;
      eIdx=G.enemies.indexOf(e);
    }
  }
  if(e.shield>0&&dmg>0){
    e.shield--;
    log(`🛡 ${e.name}のシールドがダメージを防いだ（残${e.shield}）`,'sys');
    onEnemyShieldLost();
    if(!_suppressAutoRetaliate&&srcUnit&&G.allies&&G.allies.includes(srcUnit)){
      _mutualStrikeBack(srcUnit,false,e,e.atk||0);
    }
    return;
  }
  // ガーゴイル：敵の場にガーゴイルがいる場合、敵が受けるダメージを-1
  const actualDmgToEnemy=Math.max(0,dmg);
  e.hp=Math.max(0,e.hp-actualDmgToEnemy);
  if(actualDmgToEnemy>0&&typeof playHitVfx==='function') playHitVfx('enemy',eIdx);
  if(actualDmgToEnemy>0&&typeof playSfx==='function') playSfx('hitLight',{group:'combat'});
  if(e.instadead&&dmg>0) e.hp=0;
  if(dmg>0){
    G.battleCounters.damage=(G.battleCounters.damage||0)+1;
    applyPoisonOnDmg(e,srcUnit);
    if(srcUnit&&srcUnit.keywords&&srcUnit.keywords.length&&e.hp>0){
      applyKeywordOnHit(srcUnit,e,actualDmgToEnemy);
    }
    // 負傷トリガー：生き残った場合のみ発動
    if(e.injury&&e.hp>0) triggerInjury(e, dmg);
    // リリス・ヴェノム：敵がダメージを受けた時、毒3を与える
    if(e.hp>0){
      G.allies.forEach(li=>{ if(li&&li.hp>0&&li.effect==='lilith_ondmg'&&li!==e){ e.poison=(e.poison||0)+3; log(`🎤 ${li.name}：${e.name}に毒+3`,'bad'); }});
    }
  }
  if(!_suppressAutoRetaliate&&srcUnit&&G.allies&&G.allies.includes(srcUnit)){
    _mutualStrikeBack(srcUnit,false,e,e.atk||0);
  }
  if(e.hp<=0) processEnemyDeath(e,eIdx);
}

function processEnemyDeath(e,eIdx){
  if(e._dp) return;
  e._dp=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  // 特殊オブジェクトの破壊処理（通常の死亡処理をスキップ）
  if(e._isObject){
    if(e._objectEffect==='barrel'){
      // 開戦時に決定済みの _barrelEffect を参照
      if(e._barrelEffect==='chest'&&!G._isSimulating&&!G.moveMasks[eIdx]){
        const _bGrade=FLOOR_DATA[G.floor]?.grade||1;
        const _bItem=drawTreasure({1:70,2:30},{wand:40,consumable:40,ring:20},_bGrade);
        if(_bItem){
          const _bType=_bItem.type==='ring'?'chest_ring':_bItem.type==='wand'?'chest_wand':'chest_item';
          // 樽自身のスロットに種別マスを配置
          G.moveMasks[eIdx]=_bType;
          G._barrelTreasure=_bItem;
          G._pendingTreasureBySlot=G._pendingTreasureBySlot||{};
          G._pendingTreasureBySlot[eIdx]=_bItem;
          G._pendingTreasure=true;
          _updateRearVisibility();
          log(`🛢️ 樽：宝箱（${NODE_TYPES[_bType]?.label||'?'}）が出現！`,'gold');
        }
      } else if(e._barrelEffect==='explode'){
        log(`💥 樽が爆発！`,'bad');
        [eIdx-1,eIdx+1].forEach(ni=>{
          if(ni<0||ni>=6) return;
          const ne=G.enemies[ni];
          if(ne&&ne.hp>0&&!ne._isObject){
            log(`💥 樽爆発：${ne.name}が即死！`,'bad');
            ne.hp=0;
            processEnemyDeath(ne,ni);
          }
        });
      } else {
        log(`🛢️ 樽：何も出なかった`,'sys');
      }
    } else if(e._objectEffect==='spirit_tree'){
      onGoldGained(1);
      log(`🌳 霊木破壊：ソウル+1`,'gold');
    }
    e.hp=0;
    renderAll();
    return;
  }
  G._enemiesKilledThisBattle=(G._enemiesKilledThisBattle||0)+1;
  // エリート判定：キーワードではなくインデックスで判定（ENEMY_POOLデータにエリートKWが混入しても誤発火しない）
  const _isActualElite=G._isEliteFight&&G._eliteIdx>=0&&eIdx===G._eliteIdx;
  if(_isActualElite) G._eliteKilled=true;
  if(e.keywords&&e.keywords.includes('リーダー')) removeLeaderBonus(e);
  const _isArtifact=e.keywords&&e.keywords.includes('アーティファクト');
  const _isNamed=!!(e.unique||e._isNamed);
  const goldPerKill=_isArtifact?0:_isNamed?3:(G.baseIncome||1);
  if(goldPerKill>0){ log(`${e.name} 撃破！ソウル+${goldPerKill}`,'gold'); onGoldGained(goldPerKill); }
  else { log(`${e.name} 撃破！（アーティファクト：ソウルを持たない）`,'silver'); }
  // エリート本体：開戦時に自スロットへ generic chest が置かれているため、
  // 撃破時に必ず中身を確定してスロットへ紐づける。
  if(_isActualElite&&!G._isSimulating&&(!G._pendingTreasureBySlot||!G._pendingTreasureBySlot[eIdx])&&(!G.moveMasks[eIdx]||String(G.moveMasks[eIdx]).startsWith('chest'))){
    const _elGrade=FLOOR_DATA[G.floor]?.grade||1;
    const _elItem=drawTreasure({2:65,3:35},{wand:40,consumable:40,ring:20},_elGrade);
    if(_elItem){
      const _elType=_elItem.type==='ring'?'chest_ring':_elItem.type==='wand'?'chest_wand':'chest_item';
      G.moveMasks[eIdx]=_elType;
      G._pendingEliteTreasureItem=_elItem;
      G._pendingTreasureBySlot=G._pendingTreasureBySlot||{};
      G._pendingTreasureBySlot[eIdx]=_elItem;
      G._pendingTreasure=true;
      if(!G.visibleMoves.includes(eIdx)) G.visibleMoves.push(eIdx);
      log(`📦 エリートが宝箱（${NODE_TYPES[_elType]?.label||'?'}）を残した`,'gold');
    }
  }
  // 通常敵：開戦時に決定された _willDropChest フラグでのみドロップ
  // ただし、その敵がいる列に既にマスがある場合はドロップしない
  if(e._willDropChest&&!G._retreated&&!G._isSimulating&&!G.moveMasks[eIdx]){
    const _ndGrade=FLOOR_DATA[G.floor]?.grade||1;
    const _ndItem=drawTreasure({1:60,2:30,3:10},{wand:40,consumable:40,ring:20},_ndGrade+1);
    if(_ndItem){
      const _ndType=_ndItem.type==='ring'?'chest_ring':_ndItem.type==='wand'?'chest_wand':'chest_item';
      // ドロップ位置は倒した敵のスロット（前衛レーン）に固定
      const _ndRear=eIdx;
      if(_ndRear>=0){
        G.moveMasks[_ndRear]=_ndType;
        G._pendingEliteTreasureItem=_ndItem;
        G._pendingTreasureBySlot=G._pendingTreasureBySlot||{};
        G._pendingTreasureBySlot[_ndRear]=_ndItem;
        G._pendingTreasure=true;
        log(`📦 ${e.name}が宝箱（${NODE_TYPES[_ndType]?.label||'?'}）を落とした！`,'gold');
      } else {
        if(!G._pendingTreasureItems) G._pendingTreasureItems=[];
        G._pendingTreasureItems.push(_ndItem);
      }
    }
  }
  // 通常移動マスの可視化（既存ロジック）
  if(G.moveMasks[eIdx]&&!G.visibleMoves.includes(eIdx)&&!String(G.moveMasks[eIdx]).startsWith('chest')){
    G.visibleMoves.push(eIdx);
    log(`移動マスが出現：${NODE_TYPES[G.moveMasks[eIdx]].label}`,'sys');
  }
  // 後衛の宝・移動マスの表示更新
  _updateRearVisibility();
  // ソウルボム（アルプ負傷・敵陣）：死亡時、敵全員にダメージ（プレイヤーに有利）
  if(e.effect==='soul_bomb_death'){
    const _sbdmg=5*(e.grade||1);
    const _sbCopy=[...G.enemies];
    _sbCopy.forEach((f,fi)=>{ if(f&&f.hp>0&&f!==e) dealDmgToEnemy(f,_sbdmg,fi,e); });
    log(`${e.name}：死亡→敵全員に${_sbdmg}ダメ`,'good');
    triggerDeathEffectTriggered(e);
  }
  // レイス（敵）：死亡時、全ての味方（プレイヤー側）にATKダメージを与える
  if(e.effect==='wraith_death'){
    const x=(e.atk||0);
    if(x>0){
      const _wrCopy=[...G.allies];
      _wrCopy.forEach((a,ai)=>{ if(a&&a.hp>0) dealDmgToAlly(a,x,ai,e); });
      log(`${e.name}：死亡→全ての味方に${x}ダメ`,'bad');
    }
    triggerDeathEffectTriggered(e);
  }
  if(e._deathAlliesDmg){
    const dmg=e._deathAlliesDmg;
    G.enemies.forEach((f,fi)=>{ if(f&&f.hp>0&&f!==e) dealDmgToEnemy(f,dmg,fi,e); });
    log(`${e.name}：死亡→全ての味方に${dmg}ダメ`,'good');
    triggerDeathEffectTriggered(e);
  }
  if(e.effect==='mummy_death'){
    log(`${e.name}：死亡→敵オーナーにソウル+3相当`,'bad');
    triggerDeathEffectTriggered(e);
  }
  if(e.effect==='banshee_death'){
    log(`${e.name}：死亡→敵オーナーの商談キャラATK+2相当`,'bad');
    triggerDeathEffectTriggered(e);
  }
  if(e.effect==='fecht_death'){
    e._fechtReviveEnemy=true;
    triggerDeathEffectTriggered(e);
  }
  if(e.effect==='eidolon_death'){
    G.enemies.forEach(f=>{
      if(f&&f.hp>0&&unitMatchesRace(f,'不死')){
        applyUnitBuff(f,2,1,'enemy');
        if(!f.shield) f.shield=1;
      }
    });
    log(`${e.name}：死亡→敵の不死+2/+1とシールド`,'bad');
    triggerDeathEffectTriggered(e);
  }
  // スケルトン（敵）：死亡時、骨を敵陣に召喚
  if(e.effect==='skeleton_bone'){
    const _boneG=e.grade||1;
    const _boneHp=1;
    const _deadAtk=e.atk||0;
    const _deadHp=e.maxHp!=null?e.maxHp:(7*_boneG);
    const _deadKws=[...(e.keywords||[])];
    const _boneDef=makeSheetBackedUnitDef({id:'c_bone',name:'骨',race:'不死',grade:_boneG,atk:0,hp:_boneHp,cost:0,unique:false,icon:'🦴',desc:`誘発：ターン開始時、${_deadAtk}/${_deadHp}、不死の「スケルトン」に変身する。`,effect:'bone_transform'});
    const _boneSlot=G.enemies.findIndex(f=>f===e);
    if(_boneSlot>=0){
      const _boneEnemy=makeUnitFromDef(_boneDef);
      _boneEnemy._skelAtk=_deadAtk; _boneEnemy._skelHp=_deadHp; _boneEnemy._skelKws=[..._deadKws];
      G.enemies[_boneSlot]=_boneEnemy;
      log(`${e.name}：死亡→骨(0/${_boneHp})を召喚`,'bad');
      if(typeof triggerCocatrice==='function') triggerCocatrice(_boneEnemy);
    }
    triggerDeathEffectTriggered(e);
  }
  // ファントム（敵）：仲間（敵）が死亡したとき、アクを召喚
  G.enemies.forEach(ph=>{
    if(!ph||ph.hp<=0||ph.effect!=='phantom_onallydie'||ph===e) return;
    const akDef=makeSheetBackedUnitDef({id:'c_aku',name:'アク',race:'不死',grade:ph.grade||1,atk:0,hp:1,cost:0,unique:false,icon:'🌑',desc:''});
    const empty=G.enemies.findIndex(f=>!f||f.hp<=0);
    if(empty>=0){
      const _akEnemy=makeUnitFromDef(akDef);
      G.enemies[empty]=_akEnemy;
      log(`${ph.name}：${e.name}の死→アク(0/1)を召喚`,'bad');
      if(typeof triggerCocatrice==='function') triggerCocatrice(_akEnemy);
    }
  });
  // ナグルファル：敵死亡でも+2/+1
  _onAnyCharDeath(e);
  updateHUD();
}

// ── 杖使用トリガー（キャラクター効果）───────────────

function onWandUsed(){
  G.allies.forEach(a=>{
    if(!a||a.hp<=0) return;
    switch(a.effect){
      case 'kobold_wand':{
        const _kh=2*((a._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
        let _shownKh=_kh;
        G.allies.forEach(b=>{ if(b&&b.hp>0) _shownKh=addUnitHp(b,_kh,'ally'); });
        log(`${a.name}：杖効果発動→全仲間ライフ+${_shownKh}`,'good');
        break;}
      case 'faun_wand':{
        a._faunWandCount=(a._faunWandCount||0)+1;
        if(a._faunWandCount>=7){
          a._faunWandCount=0;
          G.actionsLeft=(G.actionsLeft||0)+1;
          log(`${a.name}：杖7回使用→行動回数+1`,'good');
        }
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
  G._openingIntervention=false;
  if(typeof syncManualActionCounts==='function'){
    syncManualActionCounts();
    if(G.actionsLeft>0&&!G._debugMode){
      setHint('未行動の仲間がいます。全員が1回ずつ行動すると敵ターンへ移行できます。');
      return;
    }
  }
  document.getElementById('btn-pass').textContent='ターン終了';
  await battlePhase();
}

// ── 撤退 ──────────────────────────────────────

function retreat(){
  if(G.phase!=='player') return;
  // 撤退には宝以外の移動マス（戦闘・洞窟・湖等）が見える必要がある
  if(!G.visibleMoves.some(i=>G.moveMasks[i]&&!String(G.moveMasks[i]).startsWith('chest'))) return;
  if(G.actionsLeft<=0){ if(typeof setHint==='function') setHint('行動力が足りません。ターン終了して次のターンに撤退してください。'); return; }
  G.actionsLeft--;
  log('撤退を選択（行動力-1）','sys');
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
      const ne=makeUnitFromDef(makeSheetBackedUnitDef({id:'c_spell_golem',name:'ゴーレム',icon:'🗿',race:'-',atk:eml,hp:eml,
        grade:1,cost:0,unique:false,keywords:['アーティファクト'],lane:'front'}), undefined, true);
      ne.lane='front';
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
      t._weakenPhaseApplied='battle'; // 敵フェーズ適用→プレイヤーフェーズで可視化、次のbattlePhase冒頭で回復
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
  if(typeof playSfx==='function') playSfx('victory',{group:'ui'});
  if(ov) ov.style.display='flex';
}
