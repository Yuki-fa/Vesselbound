// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _placingChar=null; // フィールド配置待ちのキャラカード

// 指輪を空き指輪スロットに直接装備する（成功→スロットindex、失敗→false）
function _autoEquipRingInner(ring){
  const rIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
  if(rIdx<0) return false;
  const rc=clone(ring); delete rc._buyPrice;
  G.rings[rIdx]=rc;
  if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
  if(rc.unique==='great_mother'){
    G.allies.forEach(a=>{ if(a&&a.effect==='dragonet_end') a._dragonetBonus=(a._dragonetBonus||0)+1; });
  }
  updateGoldenDrop();
  if(rc.unique==='fury_start'){
    const _fb=3*(rc.grade||1);
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_fb; a.baseAtk=(a.baseAtk||0)+_fb; } });
    log(`憤激の指輪：全仲間パワー+${_fb}/±0`,'good');
  }
  if(rc.unique==='extra_action'){
    const _oldPT=G.actionsPerTurn;
    G.actionsPerTurn=calcActions();
    G.actionsLeft=G.actionsLeft+(G.actionsPerTurn-_oldPT);
  }
  return rIdx;
}
const _isRingCard=c=>c&&(c.kind==='summon'||c.kind==='passive'||c.type==='ring');

// ── 報酬フェイズ開始 ────────────────────────────

function goToReward(){
  // 戦闘フェイズ中に呼ばれた場合は何もしない（stale timer・hideVictoryOverlay 等から保護）
  if(G.phase==='player'||G.phase==='enemy'||G.phase==='commander') return;
  G.rings.forEach(r=>{ if(r) r._count=0; });
  arcanaPhaseStart();
  _rewCards=drawRewards();
  _padRewCharSlots(); // キャラ0-5・アイテム6+に整列
  G.phase='reward';
  // 商談フェイズ突入時に行動権を戦闘フェイズと同値にリセット
  G.actionsPerTurn=calcActions();
  G.actionsLeft=G.actionsPerTurn;
  G._familiarUsed=false; // ファミリア：商談フェイズ開始時にリセット

  // エリート撃破ボーナス：高レアリティ宝箱を自動開封して報酬欄に追加
  if(G._pendingEliteChest){
    G._pendingEliteChest=false;
    G._pendingTreasure=false;
    const fd=FLOOR_DATA[G.floor];
    const maxGrade=fd?(fd.grade||1):1;
    const eliteItem=drawTreasure({2:65,3:35},{wand:40,consumable:40,ring:20},maxGrade);
    if(eliteItem){
      _rewCards.push(eliteItem);
      log('⭐ エリート撃破：高レアリティ宝箱が出現！','gold');
    }
  }

  // 洞窟ボーナス：rarity4消耗品1つを報酬欄に追加（リロール消失）
  if(G._pendingCaveBonus){
    G._pendingCaveBonus=false;
    const _cavePool=SPELL_POOL.filter(s=>s.rarity===4&&s.type==='consumable');
    if(_cavePool.length){
      const _caveItem=clone(randFrom(_cavePool));
      _caveItem._buyPrice=_caveItem.cost||calcBuyPrice(_caveItem); _caveItem._caveBonus=true; // リロール消失フラグ
      _rewCards.push(_caveItem);
      log('⛩️ 洞窟の秘宝：レアアイテムが出現！','gold');
    }
  }

  // 池ボーナス：rarity≤2の指輪2つを指輪スロットに直接装備（満杯なら報酬欄へ）
  if(G._pendingPondBonus){
    G._pendingPondBonus=false;
    const _pondPool=RING_POOL.filter(r=>(r.grade||1)<=2);
    for(let _pi=0;_pi<2;_pi++){
      if(!_pondPool.length) break;
      const _pondRing=clone(randFrom(_pondPool));
      _pondRing._buyPrice=_pondRing.cost||4; _pondRing._pondBonus=true;
      _rewCards.push(_pondRing);
    }
    log('💧 池の恵み：指輪2つが出現！','gold');
  }

  // 宝箱：moveMasksからchestを除去し、中身を指輪スロットまたは報酬欄へ
  if(G._pendingTreasure){
    G.moveMasks=G.moveMasks.map(m=>m==='chest'?null:m);
    G.visibleMoves=G.visibleMoves.filter(i=>G.moveMasks[i]);
    const fd2=FLOOR_DATA[G.floor];
    const maxGrade2=fd2?(fd2.grade||1):1;
    const treasureItem=drawTreasure({1:70,2:30},{wand:40,consumable:40,ring:20},maxGrade2);
    if(treasureItem){
      _rewCards.push(treasureItem);
      log('📦 宝箱の中身が報酬欄に追加された！','gold');
    }
    G._pendingTreasure=false;
  }

  // 報酬フェイズUI
  const _faf=document.getElementById('f-ally'); if(_faf) _faf.innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eArea=document.getElementById('enemy-area');
  if(eArea) eArea.style.display='none';
  // 報酬フェイズでenemy-hand-areaを表示（renderEnemyHandが内容を制御）
  const eHandArea=document.getElementById('enemy-hand-area');
  if(eHandArea) eHandArea.style.display='';
  const rMoveBtns=document.getElementById('reward-move-btns');
  if(rMoveBtns) rMoveBtns.style.display='';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  const logWrap=document.getElementById('log-wrap');
  if(logWrap) logWrap.style.display='none';

  // リスNPCを明示的に表示（squirrelSayが空メッセージの場合でも表示する）
  const _sqEl=document.getElementById('squirrel-npc');
  if(_sqEl) _sqEl.classList.add('visible');
  squirrelSay('入店時');

  const bossNotice=document.getElementById('boss-reward-notice');
  if(G._eliteKilled){
    if(bossNotice){ bossNotice.style.display=''; bossNotice.textContent='⭐ エリート撃破：高レアリティ宝箱が出現！'; }
  } else {
    if(bossNotice) bossNotice.style.display='none';
  }

  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent=5;
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.style.display=''; rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; }

  renderAll(); // フィールド（仲間エリア）も再描画
  _updateLaneOffset(); // スロット描画後に同期計測してオフセットを確定
  // renderAll→renderControls が textContent を上書きするので必ず後で設定する
  document.getElementById('ph-badge').textContent='商談フェイズ';
  document.getElementById('ph-badge').className='ph-badge';
  document.getElementById('h-floor').textContent=G.floor+1;
  const _nl=document.getElementById('h-next-label'); if(_nl) _nl.style.display='';
  _generateMasterHand(); // renderRewCards前に杖・アイテムを抽出してmasterHandへ
  renderRewCards();
  renderGradeUpBtn();
  renderArcanaInfo();
  renderMoveSlotsInEnemy();
  renderFieldEditor();
  renderEnemyHand();
  setHint('ソウルを支払ってキャラクターやアイテムを購入しましょう');
  updateHUD();
  if(_isBossFight) _showBossRewardOverlay();
}

// ── ボス報酬選択オーバーレイ ─────────────────────

const _BOSS_REWARD_OPTIONS=[
  {id:'ring_slot',   label:'指輪スロット拡張',     desc:'指輪を装備できるスロットが+1される。',     apply:()=>{ G.ringSlots++; log(`ボス報酬：指輪スロット+1（現在${G.ringSlots}枠）`,'gold'); }},
  {id:'wand_slot',   label:'杖・アイテムスロット拡張',desc:'杖・アイテムを持てるスロットが+1される。', apply:()=>{ G.handSlots=(G.handSlots||5)+1; G.spells.push(null); log(`ボス報酬：杖・アイテムスロット+1（現在${G.handSlots}枠）`,'gold'); }},
  {id:'magic',       label:'魔術レベル+3',          desc:'魔術レベルが3上昇する。',                  apply:()=>{ G.magicLevel=(G.magicLevel||1)+3; if(typeof syncHarpyAtk==='function') syncHarpyAtk(); log(`ボス報酬：魔術レベル+3（現在${G.magicLevel}）`,'gold'); }},
  {id:'action',      label:'行動権永続+1',           desc:'永続的に行動回数が+1される。',             apply:()=>{ G._bonusAction=(G._bonusAction||0)+1; G.actionsPerTurn=calcActions(); G.actionsLeft=G.actionsPerTurn; updateHUD(); log(`ボス報酬：行動権永続+1（現在${G.actionsPerTurn}行動/ターン）`,'gold'); }},
  {id:'soul',        label:'ソウル+5',               desc:'ソウルを5獲得する。',                      apply:()=>{ G.gold+=5; updateHUD(); log(`ボス報酬：ソウル+5`,'gold'); }},
];

function _showBossRewardOverlay(){
  // 3つランダムに選ぶ
  const shuffled=[..._BOSS_REWARD_OPTIONS].sort(()=>Math.random()-0.5);
  const choices=shuffled.slice(0,3);

  // オーバーレイ生成
  const ov=document.createElement('div');
  ov.id='boss-reward-overlay';
  ov.style=`position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px`;
  const title=document.createElement('div');
  title.style='font-size:1.3rem;font-weight:700;color:var(--gold2);margin-bottom:8px';
  title.textContent='🏆 ボスクリア報酬 — 1つ選択してください';
  ov.appendChild(title);
  const row=document.createElement('div');
  row.style='display:flex;gap:12px;flex-wrap:wrap;justify-content:center';
  choices.forEach(opt=>{
    const card=document.createElement('div');
    card.style=`background:var(--card);border:2px solid var(--gold);border-radius:10px;padding:16px 20px;min-width:160px;max-width:210px;cursor:pointer;text-align:center;transition:transform .15s`;
    card.onmouseenter=()=>card.style.transform='scale(1.04)';
    card.onmouseleave=()=>card.style.transform='';
    const labelEl=document.createElement('div');
    labelEl.style='font-weight:700;font-size:.95rem;color:var(--gold2);margin-bottom:6px';
    labelEl.textContent=opt.label;
    const descEl=document.createElement('div');
    descEl.style='font-size:.75rem;color:var(--text2);line-height:1.4';
    descEl.textContent=opt.desc;
    card.appendChild(labelEl);
    card.appendChild(descEl);
    card.onclick=()=>{
      ov.remove();
      opt.apply();
      // ボス確定宝箱（R3）を報酬欄に追加
      const fd=FLOOR_DATA[G.floor];
      const maxGrade=fd?(fd.grade||1):1;
      const bossTreasure=drawTreasure({3:100},{wand:30,consumable:20,ring:50},maxGrade);
      if(bossTreasure){
        G.masterHand.push(bossTreasure);
        log('🏆 ボス宝箱（R3）が出現！','gold');
      }
      document.getElementById('rw-gold').textContent=G.gold;
      updateHUD();
      renderRewCards();
      renderGradeUpBtn();
      renderHandEditor();
      renderEnemyHand();
    };
    row.appendChild(card);
  });
  ov.appendChild(row);
  document.body.appendChild(ov);
}

// ── 行き先ノード表示 ───────────────────────────

function renderMoveSlotsInEnemy(){
  const el=document.getElementById('reward-move-btns');
  if(!el) return;
  el.innerHTML='';
  let opts;
  if(G._retreated&&G._retreatTargetNodeType){
    opts=[{nodeType:G._retreatTargetNodeType,idx:-1}];
  } else if(G._isShop){
    const _nextIsBoss=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss;
    opts=[{nodeType:_nextIsBoss?'boss':'battle',idx:-1}];
  } else if(G._retryFloor){
    const nodeType=FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle';
    opts=[{nodeType,idx:-1}];
  } else {
    opts=G.visibleMoves.filter(i=>G.moveMasks[i]&&G.moveMasks[i]!=='chest').map(i=>({nodeType:G.moveMasks[i],idx:i}));
    // イベントアイテム受け取り中（宿屋・祭壇から遷移）は戦闘/ボス戦のみ表示
    if(_eventItemDone) opts=opts.filter(o=>o.nodeType==='battle'||o.nodeType==='boss');
    // 表示順を固定：forest（battle）→ 湖（rest）→ 洞窟（smithy）→ その他
    const _moveOrder={battle:0,rest:1,smithy:2,boss:3,shop:4,chest:5};
    opts.sort((a,b)=>(_moveOrder[a.nodeType]??9)-(_moveOrder[b.nodeType]??9));
    if(opts.length===0) opts.push({nodeType:FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle',idx:-1});
  }
  opts.slice(0,3).forEach(opt=>{
    const nt=NODE_TYPES[opt.nodeType];
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.innerHTML=`<span style="font-size:1.1rem">${nt.icon}</span><span>${nt.label}</span>${nt.desc?`<span class="rew-move-btn-desc">${nt.desc}</span>`:''}`;
    btn.onclick=()=>chooseMoveInline(opt.nodeType);
    el.appendChild(btn);
  });
}

function chooseMoveInline(nt){
  squirrelSay('退店時');
  G._isShop=false; // 行商モード解除
  // イベントアイテム受け取り中なら状態更新コールバックを先に実行
  if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); }
  // 退店メッセージを読ませるため少し遅らせてから画面遷移
  setTimeout(()=>{
    squirrelHide();
    document.getElementById('reward-info-bar').style.display='none';
    document.getElementById('reward-cards-section').style.display='none';
    const rMoveBtns=document.getElementById('reward-move-btns');
    if(rMoveBtns) rMoveBtns.style.display='none';
    const eArea=document.getElementById('enemy-area');
    if(eArea) eArea.style.display='';
    const eLabel=document.getElementById('enemy-field-label');
    if(eLabel) eLabel.style.display='';
    document.getElementById('btn-pass').style.display='';
    if(G._retryFloor){ G._retryFloor=false; G.floor--; }
    chooseMove(nt);
  }, 900);
}

// ── リロール ──────────────────────────────────

function rerollRewards(){
  if(G.gold<1) return;
  G.gold-=1;
  G.rerollCount=(G.rerollCount||0)+1;
  // 召喚済みキャラも含め全リセット
  _rewCards=drawRewards();
  _padRewCharSlots();

  // 試行の指輪
  const trialsRing=G.rings.find(r=>r&&r.unique==='trials');
  if(trialsRing){
    trialsRing._rerollProgress=(trialsRing._rerollProgress||0)+1;
    if(trialsRing._rerollProgress>=4){
      trialsRing._rerollProgress=0;
      const eligible=G.rings.filter(r=>r&&(r.grade||1)<MAX_GRADE);
      if(eligible.length){
        const picked=randFrom(eligible);
        const newG=Math.min(MAX_GRADE,(picked.grade||1)+1);
        picked.grade=newG;
        log(`🎯 試行の指輪：${picked.name} → ${gradeStr(newG)}`,'gold');
      }
    }
  }

  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  const rb=document.getElementById('rw-reroll'); if(rb){ rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; }
  _generateMasterHand(); // renderRewCards前に再生成
  renderRewCards();
  renderEnemyHand();
  renderGradeUpBtn();
}

// ── 報酬キャラクター：ダメージ・召喚・負傷トリガー ─────────

// 報酬枠のキャラクターにダメージを与える
function dealDmgToRewChar(rewIdx, dmg){
  const c=_rewCards[rewIdx];
  if(!c||!c._isChar||c.hp<=0) return;
  if(c.shield>0){ c.shield--; log(`${c.name}：シールドがダメージを防いだ`,'sys'); renderRewCards(); return; }
  // ガーゴイル：報酬キャラにガーゴイルがいる場合、受けるダメージを-1
  const _grReduction=_rewCards.some(rc=>rc&&rc._isChar&&rc.hp>0&&rc.effect==='gargoyle_shield')?1:0;
  const actualRewDmg=Math.max(0,dmg-_grReduction);
  c.hp=Math.max(0,c.hp-actualRewDmg);
  if(c.hp<=0){
    // スケルトン：死亡時に同スロットへ「骨」を残す
    if(c.effect==='skeleton_bone'){
      const _boneG=c.grade||1;
      const _boneHp=4*_boneG;
      const _deadAtk=c.atk||0;
      const _deadHp=c.maxHp!=null?c.maxHp:(7*_boneG);
      const _deadKws=[...(c.keywords||[])];
      const _boneDef={id:'c_bone',name:'骨',race:'不死',grade:_boneG,atk:0,hp:_boneHp,maxHp:_boneHp,cost:0,unique:false,icon:'🦴',desc:`誘発：ターン開始時、${_deadAtk}/${_deadHp}、不死の「スケルトン」に変身する。`,effect:'bone_transform'};
      const _boneCard=Object.assign({},makeUnitFromDef(_boneDef));
      _boneCard._skelAtk=_deadAtk; _boneCard._skelHp=_deadHp; _boneCard._skelKws=[..._deadKws];
      _boneCard._isChar=true; _boneCard._buyPrice=2; _boneCard._rewSummoned=true;
      _rewCards[rewIdx]=_boneCard;
      log(`${c.name}：死亡→骨(0/${_boneHp})を残した`,'good');
      renderRewCards();
      return;
    }
    log(`${c.name}：報酬枠から消滅`,'bad');
    squirrelSay('提示カードを死亡させた時');
    _rewCards[rewIdx]=null;
    renderRewCards();
    return;
  }
  squirrelSay('提示カードにダメージを与えた時');
  // 負傷トリガー（常在・誘発・負傷のみ）
  if(c.injury) _triggerRewCharInjury(c, dmg);
  renderRewCards();
}

// 商談フェイズ：リンドヴルムの「仲間の負傷発動時、全仲間の竜+1/+1」トリガー
function _triggerLindwormRew(){
  const _lv=1+(G.hasGoldenDrop?1:0);
  // 提示カードのリンドヴルム
  _rewCards.forEach(lw=>{
    if(!lw||!lw._isChar||lw.hp<=0||lw.effect!=='lindworm_injury') return;
    _rewCards.forEach(d=>{ if(d&&d._isChar&&d.hp>0&&(d.race==='竜'||d.race==='全て')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    G.allies.forEach(d=>{ if(d&&d.hp>0&&(d.race==='竜'||d.race==='全て')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    log(`${lw.name}：仲間負傷→全竜+${_lv}/+${_lv}`,'good');
  });
  // 盤面のリンドヴルム
  G.allies.forEach(lw=>{
    if(!lw||lw.hp<=0||lw.effect!=='lindworm_injury') return;
    _rewCards.forEach(d=>{ if(d&&d._isChar&&d.hp>0&&(d.race==='竜'||d.race==='全て')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    G.allies.forEach(d=>{ if(d&&d.hp>0&&(d.race==='竜'||d.race==='全て')){ d.atk+=_lv; d.baseAtk=(d.baseAtk||0)+_lv; d.hp+=_lv; d.maxHp+=_lv; }});
    log(`${lw.name}：仲間負傷→全竜+${_lv}/+${_lv}`,'good');
  });
}

// 報酬フェイズ中の負傷トリガー（開戦・終戦・攻撃・召喚は除く）
function _triggerRewCharInjury(unit, dmg=0){
  if(!unit||!unit.injury) return;
  switch(unit.injury){
    case 'slin':{
      const _slv=2*((unit._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
      unit.hp+=_slv; unit.maxHp+=_slv;
      log(`${unit.name}：負傷→±0/+${_slv}`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'worm':{
      const _wv=((unit._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
      _rewCards.forEach(c=>{ if(c&&c._isChar&&c.hp>0&&c!==unit){ c.atk+=_wv; c.baseAtk=(c.baseAtk||0)+_wv; }});
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_wv; a.baseAtk=(a.baseAtk||0)+_wv; }});
      log(`${unit.name}：負傷→全仲間+${_wv}/±0`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'hydra':{
      const _hdv=2*((unit._stackCount||0)+1)+(G.hasGoldenDrop?1:0);
      unit.atk+=_hdv; unit.baseAtk=(unit.baseAtk||0)+_hdv; unit.hp+=_hdv; unit.maxHp+=_hdv;
      log(`${unit.name}：負傷→+${_hdv}/+${_hdv}`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'limslus':{
      // 商談フェイズでは敵がいないため効果なし
      log(`${unit.name}：負傷→敵不在のため効果なし`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'mummy':{
      const mv=1+(G.hasGoldenDrop?1:0);
      G._undeadHpBonus=(G._undeadHpBonus||0)+mv;
      // 既にフィールドにいる不死キャラにもボーナスを適用
      G.allies.forEach(a=>{ if(a&&a.hp>0&&(a.race==='不死'||a.race==='全て')){ a.atk+=mv; a.baseAtk=(a.baseAtk||0)+mv; }});
      log(`${unit.name}：不死が+${mv}/±0（累計+${G._undeadHpBonus}）`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'freyr':{
      const scDef2={id:'c_stone_cat',name:'ストーンキャット',race:'-',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'🗿',desc:'反撃　アーティファクト',counter:true,keywords:['アーティファクト']};
      addRewChar(makeUnitFromDef(scDef2));
      log(`${unit.name}：負傷→ストーンキャットを報酬枠に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'kettcat':{
      const _ncRG=unit.grade||1, _ncRA=_ncRG, _ncRH=2*_ncRG;
      const _ncDef={id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:_ncRG,atk:_ncRA,hp:_ncRH,cost:0,unique:false,icon:'🐈‍⬛',desc:''};
      const _nc=makeUnitFromDef(_ncDef, undefined, true); // skipSummonBonus=true
      addRewChar(_nc);
      log(`${unit.name}：負傷→ナイトキャット(${_ncRA}/${_ncRH})を報酬枠に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'ran':{
      const ranHp=Math.max(1,dmg);
      const ranDef={id:'c_ran_spawn',name:'海の眷属',race:'亜人',grade:unit.grade||1,atk:10,hp:ranHp,cost:0,unique:false,icon:'🐚',desc:''};
      addRewChar(makeUnitFromDef(ranDef));
      log(`${unit.name}：負傷→海の眷属(10/${ranHp})を報酬枠に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'banshee':{
      // 「バンシー」以外の全キャラに1ダメ
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0&&a!==unit) dealDmgToAlly(a,1,ai,null); });
      _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0&&c!==unit) dealDmgToRewChar(ri,1); });
      log(`${unit.name}：負傷→全キャラに1ダメ`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'warg':{
      const _wgv=1+(G.hasGoldenDrop?1:0);
      _rewCards.forEach(c=>{ if(c&&c._isChar&&c.hp>0&&c!==unit&&(c.race==='獣'||c.race==='全て')){ c.atk+=_wgv; c.baseAtk=(c.baseAtk||0)+_wgv; c.hp+=_wgv; c.maxHp+=_wgv; }});
      G.allies.forEach(a=>{ if(a&&a.hp>0&&(a.race==='獣'||a.race==='全て')){ a.atk+=_wgv; a.baseAtk=(a.baseAtk||0)+_wgv; a.hp+=_wgv; a.maxHp+=_wgv; }});
      log(`${unit.name}：負傷→全仲間の獣+${_wgv}/+${_wgv}`,'good');
      _triggerLindwormRew();
      break;
    }
    case 'alp':{
      // 提示カード側の反対（仲間の場）にソウルボムを召喚
      const _alpG=unit.grade||1;
      const _sbG=Math.max(1,_alpG-1);
      const _sbHp=_sbG;
      const _sbDmg=5*_sbG;
      const _alpDef={id:'c_soul_bomb',name:'ソウルボム',race:'精霊',grade:_sbG,atk:0,hp:_sbHp,cost:0,unique:false,icon:'💣',desc:`誘発：死亡した場合、すべての仲間に${_sbDmg}ダメージを与える。`,effect:'soul_bomb_death'};
      const _alpSlot=G.allies.findIndex(a=>!a||a.hp<=0);
      if(_alpSlot>=0) G.allies[_alpSlot]=makeUnitFromDef(_alpDef);
      log(`${unit.name}：負傷→ソウルボム(0/${_sbHp})を仲間の場に召喚`,'good');
      _triggerLindwormRew();
      break;
    }
  }
}

// _rewCards を常に「キャラスロット0-5・アイテム6+」構造に整列する
function _padRewCharSlots(){
  const chars=_rewCards.filter(c=>c&&c._isChar);
  const items=_rewCards.filter(c=>c&&!c._isChar);
  const padded=[...chars];
  while(padded.length<6) padded.push(null);
  _rewCards=[...padded,...items];
}

// 報酬枠にユニットを追加（召喚時：2ソウルで購入可・リロール時消滅）
function addRewChar(unit){
  const card=Object.assign({},unit);
  card._isChar=true;
  card._buyPrice=2;
  card._rewSummoned=true; // リロール時消滅フラグ
  // 0-5のcharスロットの空きを探す
  let slot=-1;
  for(let i=0;i<6;i++){ if(!_rewCards[i]||!_rewCards[i]._isChar||_rewCards[i].hp<=0){ slot=i; break; } }
  if(slot>=0) _rewCards[slot]=card;
  else _rewCards.push(card); // 全スロット埋まっている場合はoverflow
  renderRewCards();
}

// ── 報酬カード描画 ─────────────────────────────

function renderRewCards(){
  const el=document.getElementById('rw-cards');
  el.innerHTML='';

  // ①常に6枠のキャラクタースロットを描画（_rewCards[0-5]）
  const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090'};
  const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
  const charRow=document.createElement('div');
  charRow.className='field';
  charRow.style='margin-top:20px;margin-bottom:0px;width:100%;position:relative';  // 後衛上シフト分の上余白
  for(let i=0;i<6;i++){
    const card=(_rewCards[i]&&_rewCards[i]._isChar)?_rewCards[i]:null;
    const slot=document.createElement('div');
    if(!card){
      slot.className='slot empty is-rear';
      // 空の報酬スロット：他のキャラカードをドラッグして移動できる
      slot.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0&&_rewDragSrc!==i){ e.preventDefault(); slot.classList.add('drag-over'); }
      });
      slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
      slot.addEventListener('drop',e=>{
        e.preventDefault(); slot.classList.remove('drag-over');
        if(_rewDragSrc>=0&&_rewDragSrc!==i){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const tmp=_rewCards[src]; _rewCards[src]=_rewCards[i]; _rewCards[i]=tmp;
          renderRewCards();
        }
      });
    } else {
      slot.className='slot is-rear';
      slot.dataset.rewIdx=String(i);
      const cost=card._buyPrice??2;
      const canBuy=G.gold>=cost;
      const hasSlot=G.allies.some(a=>!a||a.hp<=0)||G.allies.length<6;
      // マミーボーナスは drawCharacters で card.atk に反映済み（_bonusApplied フラグ）
      const dispAtk=card.atk;
      const dispHp=card.hp;
      // 仲間加入プレビュー（ペリュトン：キャラ効果召喚のスタッツ変動のみ表示）
      const _sumBonusAtk=(G._grimalkinBonus||0)+(G.hasGoldenDrop?1:0);
      const _sumBonusHp=(G.hasGoldenDrop?1:0);
      const _hasSummonDesc=(_sumBonusAtk>0||_sumBonusHp>0)&&/\d+\/\d+、/.test(card.desc||'');
      let _previewStr='';
      if(_hasSummonDesc){
        const _modDesc=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_sumBonusAtk}/${parseInt(h)+_sumBonusHp}、`);
        _previewStr=`ペリュトン：${_modDesc}`;
      };
      const _allKws=[...new Set([...(card.keywords||[]),...(card.counter?['反撃']:[])])];
      const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
      const kwBlock=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;margin-top:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
      const _rawDesc=card.desc?computeDesc(card):'';
      const _strippedDesc=_stripKeywordsFromDesc(_rawDesc,card);
      const descTag=_strippedDesc?`<div class="slot-desc">${_strippedDesc}</div>`:'';
      const gradeTag=card.grade?`<div class="slot-grade">${gradeStr(card.grade)}</div>`:'';
      const costTag=`<div style="position:absolute;top:3px;right:5px;font-size:1.05rem;color:var(--gold2);font-weight:700;z-index:4;pointer-events:none;line-height:1">${_circleCost(cost)}</div>`;

      const shortBadge=!canBuy?`<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ソウル不足</div>`:'';
      const _stBadges=[];
      if(card.shield>0) _stBadges.push(`<span class="slot-badge b-shield">🛡${card.shield>1?'×'+card.shield:''}</span>`);
      if(card.poison>0) _stBadges.push(`<span class="slot-badge b-psn">毒${card.poison}</span>`);
      if(card.doomed>0) _stBadges.push(`<span class="slot-badge b-dead">破滅${card.doomed}</span>`);
      const statusBlock=_stBadges.length?`<div style="position:absolute;top:20px;left:0;right:0;display:flex;justify-content:center;flex-wrap:wrap;gap:2px;z-index:3">${_stBadges.join('')}</div>`:'';
      slot.style.borderTop='2px solid var(--teal2)';
      if(!canBuy) slot.style.background='var(--bg)';
      if(_previewStr) slot.setAttribute('data-preview',_previewStr);
      slot.innerHTML=`${gradeTag}${costTag}${shortBadge}${statusBlock}<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none"><div style="font-size:1.1rem">${card.icon||'❓'}</div><div class="slot-name">${card.name}</div><div class="slot-race">${card.race||'-'}</div><div class="slot-stats"><span class="a">${dispAtk}</span><span class="s">/</span><span class="h">${dispHp}</span></div></div><div style="position:absolute;bottom:6px;left:0;right:0;display:flex;flex-direction:column;align-items:stretch;padding:0 2px">${kwBlock}${descTag}</div>`;
      // クリックで購入
      if(canBuy && hasSlot){
        slot.style.cursor='pointer';
        slot.onclick=()=>takeRewCard(i);
      } else {
        slot.style.cursor='default';
      }
      // ドラッグで移動・重ね・盤面配置
      slot.draggable=true;
      slot.addEventListener('dragstart',e=>{
        _rewDragSrc=i; slot.classList.add('dragging');
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _updateFieldDropHighlights(card.name,card.grade||1,false,-1);
        _createDragGhost(slot);
      });
      slot.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      slot.addEventListener('dragend',()=>{
        slot.classList.remove('dragging'); _removeDragGhost(); _clearFieldDropHighlights();
        if(_rewDragSrc===i) _rewDragSrc=-1;
        renderRewCards();
      });
      slot.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0&&_rewDragSrc!==i){ e.preventDefault(); slot.classList.add('drag-over'); }
      });
      slot.addEventListener('dragleave',()=>slot.classList.remove('drag-over'));
      slot.addEventListener('drop',e=>{
        e.preventDefault(); slot.classList.remove('drag-over');
        if(_rewDragSrc>=0&&_rewDragSrc!==i){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const tmp=_rewCards[src]; _rewCards[src]=_rewCards[i]; _rewCards[i]=tmp;
          renderRewCards();
        }
      });
    }
    charRow.appendChild(slot);
  }
  el.appendChild(charRow);
  // 前衛ガイドライン（前衛位置の赤いライン）
  const _frontGuide=document.createElement('div');
  _frontGuide.style='width:100%;height:1px;margin-top:4px;margin-bottom:4px;flex-shrink:0;background:rgba(224,80,80,.28);pointer-events:none';
  el.appendChild(_frontGuide);

  // ②アイテム・指輪は従来の小カードで描画（index 6以降）
  _rewCards.forEach((card,i)=>{
    if(i<6||!card||card._isChar) return;
    el.appendChild(_mkRewDiv(card, ()=>takeRewCard(i)));
  });

  const rb=document.getElementById('rw-reroll'); if(rb){ rb.disabled=G.gold<1; rb.style.opacity=G.gold<1?'0.4':''; }
  requestAnimationFrame(fitCardDescs);
}

function _mkRewDiv(card, onBuy){
  const div=document.createElement('div');
  const cost=card._buyPrice??1;
  const canBuy=cost===0||G.gold>=cost;
  const isLegend=!!card._isLegend;
  const _isRingCard=card.kind==='summon'||card.kind==='passive'||card.type==='ring';
  const isTreasure=!!card._isTreasure;
  div.className='rew-card'+(canBuy?'':' cant')+(isLegend?' legend':'')+(isTreasure?' treasure':'');

  if(card._isChar){
    // キャラクターカード
    const hasSlot=G.allies.includes(null);
    const disabled=!hasSlot;
    div.className='rew-card'+(canBuy&&!disabled?'':' cant')+(isLegend?' legend':'');
    const raceBadge=`<div style="font-size:.55rem;color:var(--text2);margin-bottom:1px">${card.race||'-'}</div>`;
    // マミーボーナスは drawCharacters で card.atk に反映済み
    const atkStr=`<span style="color:var(--teal2)">${card.atk}</span>`;
    const statsLine=`<div style="font-size:.68rem;font-weight:700;margin-top:2px">${atkStr}<span style="color:var(--text2)">/</span><span style="color:#60d090">${card.hp}</span></div>`;
    const costLine=`<div class="rew-card-cost">${cost}ソウル${disabled?' （盤面満杯）':''}</div>`;
    const uniqueBadge=card.unique?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
    const gradeTag=card.grade?` <span class="rew-grade">${gradeStr(card.grade)}</span>`:'';
    const shortBadge=!canBuy&&!isTreasure?`<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 4px;font-size:.48rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ソウル不足</div>`:'';
    const _rewCharDesc=_stripKeywordsFromDesc(card.desc?computeDesc(card):'',card);
    const _sumBonusCardAtk=(G._grimalkinBonus||0)+(G.hasGoldenDrop?1:0);
    const _sumBonusCardHp=(G.hasGoldenDrop?1:0);
    const _hasSumDescCard=(_sumBonusCardAtk>0||_sumBonusCardHp>0)&&/\d+\/\d+、/.test(card.desc||'');
    if(_hasSumDescCard){
      const _modDescCard=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_sumBonusCardAtk}/${parseInt(h)+_sumBonusCardHp}、`);
      div.setAttribute('data-preview',`ペリュトン：${_modDescCard}`);
    }
    div.innerHTML=`${shortBadge}${costLine}<div style="font-size:.62rem;color:var(--purple2);margin-bottom:1px">キャラクター</div>${raceBadge}<div class="rew-card-name">${card.name}${gradeTag}</div>${_rewCharDesc?`<div class="rew-card-desc">${_rewCharDesc}</div>`:''}<div style="font-size:.5rem;color:var(--text2);margin:1px 0">${[...new Set([...(card.keywords||[]),...(card.counter?['反撃']:[])])].filter(Boolean).join('　')}</div>${statsLine}${uniqueBadge}`;
    if(canBuy&&!disabled) div.onclick=onBuy;
    return div;
  }

  // アイテムカード（杖・消耗品）
  const typeLabel={ring:'指輪',wand:'杖',consumable:'アイテム'};
  const t=card.type||'ring';
  const tColor=t==='ring'?'purple2':t==='wand'?'blue2':'red2';
  const g=card.grade||1;
  const gs=card.legend?'★':gradeStr(g);
  const rdesc=computeDesc(card);
  const refund=cardRefund(card);
  const isRingCard=!card.type||card.type==='ring'||card.kind==='summon'||card.kind==='passive';
  const refundTxt=isRingCard
    ?`<div class="rew-card-refund" style="color:var(--red2)">破棄（ソウルなし）</div>`
    :refund>0?`<div class="rew-card-refund">還魂（ソウル+${refund}）</div>`:'';
  const tpLabel=typeLabel[t]||'指輪';
  const legendBadge=isLegend?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
  const gradeTagItem=gs?`<div style="position:absolute;top:3px;left:4px;font-size:.68rem;color:var(--gold);font-weight:700">${gs}</div>`:'';
  const priceTagItem=`<div style="position:absolute;top:3px;right:5px;font-size:1.05rem;color:var(--gold2);font-weight:700;z-index:4;pointer-events:none;line-height:1">${_circleCost(cost)}</div>`;
  const shortBadgeItem=!canBuy&&!isTreasure?`<div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 3px;font-size:.44rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ソウル不足</div>`:'';
  div.innerHTML=`${gradeTagItem}${priceTagItem}${shortBadgeItem}<div style="margin-top:20px"><div class="rew-card-tp" style="color:var(--${tColor});text-align:center">${tpLabel}</div><div class="rew-card-name" style="text-align:center">${card.name}</div><div class="rew-card-desc">${rdesc}</div>${refundTxt}${legendBadge}</div>`;
  if(canBuy) div.onclick=onBuy;
  return div;
}

// ── カード購入処理 ──────────────────────────────

function takeRewCard(i, targetSlot){
  const card=_rewCards[i]; if(!card) return;
  const cost=card._buyPrice??1;
  if(G.gold<cost) return;

  if(card._isChar){
    // キャラクター：指定スロット or 最初の空きへ配置
    let emptyIdx;
    if(targetSlot!=null){
      if(G.allies[targetSlot]!=null){ log('盤面が満杯です。','bad'); return; }
      emptyIdx=targetSlot;
    } else {
      emptyIdx=G.allies.indexOf(null);
    }
    if(emptyIdx<0){ log('盤面が満杯です。フィールドのキャラクターを還魂してください。','bad'); return; }
    // 購入前の盤面平均グレードを記録（リスNPC判定用）
    const _preAllyG=G.allies.filter(a=>a&&a.hp>0);
    const _preBuyAvgG=_preAllyG.length?_preAllyG.reduce((s,a)=>s+(a.grade||1),0)/_preAllyG.length:0;
    G.gold-=cost;
    const unit=makeUnitFromDef(card, undefined, true); // 購入：効果召喚ボーナスは対象外
    G.allies[emptyIdx]=unit;
    // 提示カードから購入したキャラは後衛で配置
    unit.hate=false;
    unit.hateTurns=0;
    log(`${card.name} を獲得（盤面[${emptyIdx}]へ配置）`,'good');
    // 召喚時効果（addAlly と同じ処理を実行）
    if(unit.effect==='chimera_summon'){
      const _pool=['即死','毒牙5','狩人','標的','成長5','加護','反撃','二段攻撃'];
      const _avail=[..._pool];
      const _chosen=[];
      for(let _ci=0;_ci<3&&_avail.length>0;_ci++){
        const _idx=Math.floor(Math.random()*_avail.length);
        _chosen.push(_avail.splice(_idx,1)[0]);
      }
      if(!unit.keywords) unit.keywords=[];
      _chosen.forEach(k=>{ if(!unit.keywords.includes(k)) unit.keywords.push(k); });
      if(_chosen.includes('反撃')) unit.counter=true;
      if(_chosen.includes('標的')){ unit.hate=true; unit.hateTurns=99; }
      log(`${unit.name}：召喚→キーワード${_chosen.join('、')}を獲得`,'good');
    }
    // ミテーラ：自分の場（G.allies）にペリカンを直接配置（グレードスケール）
    if(unit.effect==='mitera_summon'){
      const _pelG=unit.grade||1;
      const _pelDef={id:'c_pelican',name:'ペリカン',race:'獣',grade:_pelG,atk:_pelG,hp:3*_pelG,cost:0,unique:false,icon:'🦤',desc:''};
      const _pelUnit=makeUnitFromDef(_pelDef);
      const _pei=G.allies.findIndex(a=>!a||a.hp<=0);
      if(_pei>=0){
        G.allies[_pei]=_pelUnit;
        log(`${unit.name}：ペリカン(${_pelG}/${3*_pelG})を盤面に召喚`,'good');
        // グリマルキン・コカトリス：カード効果召喚バフ
        const _gd=G.hasGoldenDrop?1:0;
        G.allies.forEach(g=>{ if(g&&g.hp>0&&g!==_pelUnit){
          if(g.effect==='grimalkin_passive'){ const _gbv=1+_gd; _pelUnit.atk+=_gbv; _pelUnit.baseAtk=(_pelUnit.baseAtk||0)+_gbv; _pelUnit.hp+=_gbv; _pelUnit.maxHp+=_gbv; log(`${g.name}：カード効果召喚→${_pelUnit.name}+${_gbv}/+${_gbv}`,'good'); }
          if(g.effect==='cocatrice_passive'){ const _cv=1+_gd; g.atk+=_cv; g.baseAtk=(g.baseAtk||0)+_cv; g.hp+=_cv; g.maxHp+=_cv; log(`${g.name}：キャラ効果召喚→+${_cv}/+${_cv}`,'good'); }
        }});
      }
    }
    // コボルド：最も左の杖に充填数+(_stackCount+1)
    if(unit.effect==='kobold_summon'){
      const _wi=G.spells.findIndex(s=>s&&s.type==='wand');
      const _kc=(unit._stackCount||0)+1;
      if(_wi>=0){ G.spells[_wi].usesLeft=(G.spells[_wi].usesLeft||0)+_kc; log(`${unit.name}：${G.spells[_wi].name}に充填+${_kc}`,'good'); }
    }
    // マーメイド：使役時に魔術レベル+1
    if(unit.effect==='mermaid_start'){
      const _mv=1+(G.hasGoldenDrop?1:0);
      if(typeof onMagicLevelUp==='function') onMagicLevelUp(_mv);
      else { G.magicLevel=(G.magicLevel||1)+_mv; if(typeof syncHarpyAtk==='function') syncHarpyAtk(); }
      log(`${unit.name}：使役→魔術レベル+${_mv}（Lv${G.magicLevel}）`,'good');
    }
    // シルフ：使役時、隣接する仲間が+1/+2を得る
    if(unit.effect==='sylph_summon'){
      const _sli=G.allies.indexOf(unit); const _slv=(unit._stackCount||0)+1+(G.hasGoldenDrop?1:0);
      [G.allies[_sli-1],G.allies[_sli+1]].forEach(b=>{ if(b&&b.hp>0){ b.atk+=_slv; b.baseAtk=(b.baseAtk||0)+_slv; b.hp+=_slv*2; b.maxHp+=_slv*2; }});
      log(`${unit.name}：隣接仲間に+${_slv}/+${_slv*2}`,'good');
    }
    // インプ：使役時、ランダムなG1アイテムを得る
    if(unit.effect==='imp_summon'){
      const _ei=G.spells.indexOf(null);
      if(_ei>=0){ const _item=typeof drawConsumable==='function'?drawConsumable(1):null; if(_item){ G.spells[_ei]=_item; log(`${unit.name}：G1アイテムを入手`,'good'); }}
    }
    // 指輪の on_summon トリガーを発火（報酬フェーズ中は addAlly → addRewChar へ誘導される）
    fireTrigger('on_summon', null);
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    // リスNPC：キャラ購入時（購入前の盤面平均グレードと比較）
    squirrelSay((unit.grade||1)>=_preBuyAvgG?'現在グレードのキャラを購入時':'現在グレード未満のキャラを購入時');
    updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // 指輪
  if(card.kind==='passive'||card.kind==='summon'||card.type==='ring'){
    const ringIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
    if(ringIdx<0){ log(`指輪スロット（${G.ringSlots}枠）が満杯です。フィールドの指輪を破棄してください。`,'bad'); return; }
    G.gold-=cost;
    const rc=clone(card);
    delete rc._buyPrice;
    G.rings[ringIdx]=rc;
    // ユニーク指輪取得時に再出現しないよう記録
    if(card.legend||card._isLegend) G._seenLegendRings.add(card.id);
    // 黄金の雫：ドラゴネットがいれば「あとX戦」を+1
    if(rc.unique==='great_mother'){
      G.allies.forEach(a=>{ if(a&&a.effect==='dragonet_end') a._dragonetBonus=(a._dragonetBonus||0)+1; });
    }
    updateGoldenDrop();
    // 憤激の指輪：装備時点で全仲間に即座に+3/±0を適用
    if(rc.unique==='fury_start'){
      const _fb=3*(rc.grade||1);
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_fb; a.baseAtk=(a.baseAtk||0)+_fb; } });
      log(`憤激の指輪：全仲間パワー+${_fb}/±0`,'good');
    }
    // 行動の指輪：装備時点でactionsPerTurnを更新し、差分をactionsLeftに加算
    if(rc.unique==='extra_action'){
      const _oldPT=G.actionsPerTurn;
      G.actionsPerTurn=calcActions();
      G.actionsLeft=G.actionsLeft+(G.actionsPerTurn-_oldPT);
    }
    log(card.name+' を取得（指輪スロット['+ringIdx+']）','good');
    // ファミリア：商談フェイズで最初に購入したアイテムのコピーを得る（指輪の場合）
    if(G.phase==='reward'&&!G._familiarUsed&&G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='familiar_shop')){
      G._familiarUsed=true;
      // 通常スロット内を優先。空きがなければ最大4枠まで拡張して配置
      let _famRingIdx=G.rings.indexOf(null);
      if(_famRingIdx>=0){
        if(_famRingIdx>=G.ringSlots) G.ringSlots=_famRingIdx+1;
        const _famCopy=clone(rc); delete _famCopy._buyPrice;
        G.rings[_famRingIdx]=_famCopy;
        log(`ファミリア：${rc.name}のコピーを獲得（指輪スロット[${_famRingIdx}]）`,'good');
      }
    }
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // アイテム（杖・消耗品）
  const handIdx=G.spells.indexOf(null);
  if(handIdx<0){ log(`インベントリが満杯（${G.handSlots}枠）です。アイテムを捨ててください。`,'bad'); return; }

  G.gold-=cost;
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined){ nc.usesLeft=nc.baseUses||randUses(); }
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  G.spells[handIdx]=nc;

  // ファミリア：商談フェイズで最初に購入した消耗品のコピーを得る（杖は対象外）
  if(nc.type==='consumable'&&G.phase==='reward'&&!G._familiarUsed&&G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='familiar_shop')){
    G._familiarUsed=true;
    const _famHandIdx=G.spells.indexOf(null);
    if(_famHandIdx>=0){
      const _famCopy=clone(nc);
      G.spells[_famHandIdx]=_famCopy;
      log(`ファミリア：${nc.name}のコピーを獲得`,'good');
    }
  }

  log(card.name+' を'+cost+'ソウルで取得','good');
  _rewCards[i]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderRewCards();
  renderFieldEditor();
  renderEnemyHand();
  renderGradeUpBtn();
}

// ── フィールドエディタ（報酬フェイズ中の配置変更・売却）──

function renderFieldEditor(){
  const fAlly=document.getElementById('f-ally');
  if(fAlly) _renderFieldRow(fAlly);
  renderHandEditor();
}

function _renderFieldRow(el){
  el.innerHTML='';
  for(let i=0;i<6;i++){
    const unit=G.allies[i];
    const div=document.createElement('div');
    if(unit&&unit.hp>0){
      div.className='slot'+(unit.hate&&unit.hateTurns>0?' is-front':'');
      div.draggable=true;
      const badges=[];
      const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';}; 
      // 標的バッジは非表示（is-front の視覚的シフトで代用）
      if(unit.guardian)badges.push(`<span class="slot-badge b-guard"${_sd('守護')}>守護</span>`);
      if(unit.shield>0)badges.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
      if(unit.sealed>0)badges.push(`<span class="slot-badge b-seal"${_sd('封印')}>封印</span>`);
      if(unit.instadead)badges.push(`<span class="slot-badge b-dead"${_sd('即死')}>即死</span>`);
      if(unit.poison>0)badges.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${unit.poison}</span>`);
      if(unit.doomed>0)badges.push(`<span class="slot-badge b-dead" data-kwdesc="破滅が10になると死亡する。">破滅${unit.doomed}</span>`);
      if(unit.regen)badges.push(`<span class="slot-badge b-regen"${_sd('再生')}>再生${unit.regen}</span>`);
      if(unit.stealth)badges.push(`<span class="slot-badge b-stealth"${_sd('隠密')}>隠密</span>`);
      if(unit.allyTarget)badges.push(`<span class="slot-badge b-hate"${_sd('狙われ')}>狙われ</span>`);
      const badgeBlock=badges.length?`<div class="slot-badges">${badges.join('')}</div>`:'';
      const gradeTag=unit.grade?`<div class="slot-grade">${gradeStr(unit.grade)}</div>`:'';
      const _rawDesc=unit.desc?computeDesc(unit):'';
      const _desc=_stripKeywordsFromDesc(_rawDesc,unit);
      const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
      const dragonetSub=unit.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(unit._dragonetBonus||0))-(unit._dragonetCount||0)}戦</div>`:'';
      const raceTag=unit.race&&unit.race!=='-'?`<div class="slot-race">${unit.race}</div>`:'';
      const _kColorMap={'即死':'#e060e0','侵食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090'};
      const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
      const _allKws=[...new Set([...(unit.keywords||[]),...(unit.counter?['反撃']:[])])];
      const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
      const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
      const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:2px;pointer-events:auto">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
      const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
      let kwBlock='';
      if(_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_normRow}</div>`;
      const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:60px;pointer-events:none';
      const _btmStyle='position:absolute;bottom:22px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0';
      div.style.borderTop=unit.hate&&unit.hateTurns>0?'':'2px solid var(--teal2)';
      div.innerHTML=`${badgeBlock}${gradeTag}<div style="${_infoStyle}"><div style="font-size:1.1rem">${unit.icon||'❓'}</div><div class="slot-name">${unit.name}</div>${raceTag}<div class="slot-stats"><span class="a">${unit.atk}</span><span class="s">/</span><span class="h">${unit.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div><button class="return-btn">還魂（ソウル+1）</button>`;
      div.querySelector('.return-btn').onclick=ev=>{ ev.stopPropagation(); sellFieldUnit(i); };
      // 継承ボタン（3枚重ね完了時のみ表示）
      if(unit._canInherit){
        const inheritBtn=document.createElement('button');
        inheritBtn.className='inherit-btn';
        inheritBtn.textContent='継承';
        inheritBtn.onclick=ev=>{ ev.stopPropagation(); startInherit(i); };
        div.appendChild(inheritBtn);
      }
      // クリックでヘイト切り替え
      div.onclick=e=>{
        if(e.detail===0) return; // プログラム的クリックは無視
        const u=G.allies[i]; if(!u||u.hp<=0) return;
        if(u.hate&&u.hateTurns>0){
          u.hate=false; u.hateTurns=0;
          log(`${u.name}が後衛に下がった`,'sys');
        } else {
          u.hate=true; u.hateTurns=99;
          log(`${u.name}が前衛に出た`,'good');
        }
        updateHUD(); renderFieldEditor();
      };
      div.addEventListener('dragstart',e=>{
        _fieldDragSrc=i; _fieldDragSrcEl=div; _fieldDragStartY=e.clientY;
        div.classList.add('dragging'); e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setDragImage(_transparentDragImg,0,0);
        _updateFieldDropHighlights(unit.name,0,true,i);
        _createDragGhost(div);
      });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',e=>{
        const srcIdx=_fieldDragSrc; // dropで既に-1になっていれば移動済み
        div.classList.remove('dragging'); _clearFieldMergeTimer(); _clearFieldDropHighlights();
        _removeDragGhost(); _removeStackPreviewOverlay(); _fieldDragSrcEl=null;
        _fieldDragSrc=-1;
        // 移動・合体なしのドラッグ終了 → Y方向で前衛後衛切り替え
        if(srcIdx>=0){
          const u=G.allies[srcIdx];
          if(u&&u.hp>0){
            const dy=e.clientY-_fieldDragStartY;
            if(dy < -30&&!(u.hate&&u.hateTurns>0)){
              u.hate=true; u.hateTurns=99;
              log(`${u.name}が前衛に出た`,'good');
              updateHUD(); renderFieldEditor();
            } else if(dy > 30&&(u.hate&&u.hateTurns>0)){
              u.hate=false; u.hateTurns=0;
              log(`${u.name}が後衛に下がった`,'sys');
              updateHUD(); renderFieldEditor();
            }
          }
        }
      });
      div.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0){
          const rc=_rewCards[_rewDragSrc];
          if(!rc?._isChar) return;
          if(unit.name===rc.name&&(unit._stackCount||0)<2&&G.gold>=(rc._buyPrice??2)){
            e.preventDefault();
            _showStackPreviewOverlay(null,unit,rc,e.clientX,e.clientY);
          }
        } else if(_fieldDragSrc>=0&&_fieldDragSrc!==i){
          e.preventDefault();
          _lastDragX=e.clientX; _lastDragY=e.clientY;
          _moveStackPreview(e.clientX,e.clientY);
          const srcUnit=G.allies[_fieldDragSrc];
          if(srcUnit&&unit.name===srcUnit.name&&(unit._stackCount||0)<2){
            if(_fieldMergeTarget!==i){
              _clearFieldMergeTimer();
              _fieldMergeTarget=i;
              _fieldMergeTimer=setTimeout(()=>{
                _fieldMergeReady=true;
                const fAlly=document.getElementById('f-ally');
                if(fAlly&&fAlly.children[i]) fAlly.children[i].classList.add('merge-ready');
                _showStackPreviewOverlay(null,unit,srcUnit,_lastDragX||0,_lastDragY||0);
              },500);
            }
          } else {
            if(_fieldMergeTarget===i) _clearFieldMergeTimer();
            div.classList.add('drag-over');
          }
        }
      });
      div.addEventListener('dragleave',e=>{
        if(div.contains(e.relatedTarget)) return;
        if(_fieldMergeTarget===i){ _clearFieldMergeTimer(); div.classList.remove('merge-ready'); }
        _removeStackPreviewOverlay(div); div.classList.remove('drag-over');
      });
      div.addEventListener('drop',e=>{
        e.preventDefault();
        const wasMergeReady=_fieldMergeReady&&_fieldMergeTarget===i;
        _clearFieldMergeTimer(); _removeStackPreviewOverlay(div);
        div.classList.remove('drag-over','merge-ready');
        if(_rewDragSrc<=-100){
          // 相手手札からのドラッグ購入（既存ユニット上でも発動）
          const handIdx=-(_rewDragSrc+100); _rewDragSrc=-1;
          buyMasterHandItem(handIdx);
        } else if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc?._isChar&&unit.name===rc.name&&(unit._stackCount||0)<2) _applyStack(i,src);
        } else if(_fieldDragSrc>=0){
          _clearFieldDropHighlights();
          if(wasMergeReady){ _applyFieldMerge(_fieldDragSrc,i); }
          else { _dropFieldUnit(i); }
        }
      });
    } else {
      div.className='slot empty';
      div.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0){
          const rc=_rewCards[_rewDragSrc];
          if(rc?._isChar){ e.preventDefault(); div.classList.add('drag-over'); }
        } else if(_rewDragSrc<=-100){ e.preventDefault(); div.classList.add('drag-over'); }
        else if(_fieldDragSrc>=0){ e.preventDefault(); div.classList.add('drag-over'); }
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{
        e.preventDefault(); div.classList.remove('drag-over');
        if(_rewDragSrc<=-100){
          // 相手手札からのドラッグ購入
          const handIdx=-(_rewDragSrc+100); _rewDragSrc=-1;
          buyMasterHandItem(handIdx);
        } else if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc&&rc._isChar){
            if(G.gold>=(rc._buyPrice??2)){
              takeRewCard(src,i);
            } else {
              log('ソウルが不足しています','bad');
              renderRewCards();
            }
          }
        } else if(_fieldDragSrc>=0){ _dropFieldUnit(i); }
      });
    }
    el.appendChild(div);
  }
}



let _fieldDragSrc=-1;
let _fieldDragSrcEl=null; // 盤面ドラッグ中のソース要素
let _rewDragSrc=-1;       // 報酬欄からドラッグ中のインデックス
let _fieldMergeTimer=null;// 盤面内重ねの0.5秒タイマー
let _fieldMergeTarget=-1; // タイマー対象のスロットインデックス
let _fieldMergeReady=false;// タイマー発火済みフラグ
let _lastDragX=0, _lastDragY=0; // dragover座標キャッシュ
let _fieldDragStartY=0;   // dragstart時のY座標（前衛後衛切り替え判定用）

function _clearFieldMergeTimer(){
  clearTimeout(_fieldMergeTimer);
  _fieldMergeTimer=null; _fieldMergeTarget=-1; _fieldMergeReady=false;
}

function _dropFieldUnit(destIdx){
  if(_fieldDragSrc<0) return;
  const src=_fieldDragSrc; _fieldDragSrc=-1;
  const tmp=G.allies[src]; G.allies[src]=G.allies[destIdx]; G.allies[destIdx]=tmp;
  renderFieldEditor();
}

// 盤面内重ね（使役効果なし）
function _applyFieldMerge(srcIdx, dstIdx){
  const src=G.allies[srcIdx]; const dst=G.allies[dstIdx];
  if(!src||!dst) return;
  if((dst._stackCount||0)>=2){ log(`${dst.name} はこれ以上重ねられません（最大3枚）`,'bad'); return; }
  const result=_computeStackResult(dst,src);
  dst.atk=result.atk; dst.baseAtk=result.atk;
  dst.hp=result.hp; dst.maxHp=result.hp;
  dst.grade=result.grade;
  dst.desc=result.desc;
  dst.keywords=result.keywords;
  dst._stackCount=result.stackCount;
  dst._baseGrade=result.baseGrade;
  dst._baseDesc=result.baseDesc;
  if(result.keywords.includes('反撃')) dst.counter=true;
  G.allies[srcIdx]=null;
  _fieldDragSrc=-1;
  log(`${dst.name} を重ねた（盤面内）→ ${result.atk}/${result.hp}`,'good');
  // 3枚重ね（_stackCount=2）で継承可能フラグを立てる
  if(dst._stackCount>=2){
    dst._canInherit=true;
    log(`${dst.name}：3枚重ね完了！継承が可能になった`,'gold');
  }
  updateHUD(); renderRewCards(); renderFieldEditor(); renderGradeUpBtn();
}

// ── 継承システム ──────────────────────────────────

// 継承モード：継承元スロットを記録
let _inheritSrc=-1;

function startInherit(fieldIdx){
  _inheritSrc=fieldIdx;
  const unit=G.allies[fieldIdx];
  const liveOthers=G.allies.filter((a,i)=>a&&a.hp>0&&i!==fieldIdx);
  if(!liveOthers.length){ log(`継承先のキャラクターがいません`,'bad'); _inheritSrc=-1; return; }
  log(`${unit.name} から継承先を選んでください`,'gold');
  // 継承先として選択可能なスロットをハイライト（継承元以外の生存キャラ）
  _getAllyDomSlots().forEach((slotEl,i)=>{
    if(i===fieldIdx) return;
    const u=G.allies[i];
    if(u&&u.hp>0){
      slotEl.classList.add('selectable');
      slotEl.onclick=()=>{ clearSelectable(); applyInherit(fieldIdx,i); };
    }
  });
}

function applyInherit(srcIdx, dstIdx){
  const src=G.allies[srcIdx];
  const dst=G.allies[dstIdx];
  if(!src||!dst) return;
  // ATKを継承
  dst.atk+=src.atk; dst.baseAtk=(dst.baseAtk||0)+src.atk;
  // HPを継承
  dst.hp+=src.hp; dst.maxHp=(dst.maxHp||0)+src.hp;
  // キーワードを継承（重複除外）
  const srcKws=(src.keywords||[]).filter(k=>!(dst.keywords||[]).includes(k));
  if(srcKws.length>0){
    dst.keywords=[...(dst.keywords||[]),...srcKws];
    if(srcKws.includes('反撃')) dst.counter=true;
  }
  log(`${src.name} → ${dst.name} に継承！ATK+${src.atk}、HP+${src.hp}、キーワード：${srcKws.join('、')||'なし'}`,'gold');
  // 継承元を還魂
  G.allies[srcIdx]=null;
  G.gold+=2; // 還魂ソウル
  document.getElementById('rw-gold').textContent=G.gold;
  _inheritSrc=-1;
  updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
  checkSolitudeBuff();
}

// ── 重ねシステム ヘルパー ──────────────────────────

// ベースdesc の各数値に n 回分の加算を適用（結果 = baseNum * (n+1)）
function _applyDescStack(baseDesc, newStackCount){
  if(!baseDesc||newStackCount<=0) return baseDesc||'';
  const baseNums=[...baseDesc.matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  if(!baseNums.length) return baseDesc;
  let idx=0;
  return baseDesc.replace(/\d+/g,()=>{
    const bNum=idx<baseNums.length?baseNums[idx++]:0;
    return String(bNum*(newStackCount+1));
  });
}

// キーワード配列をマージ（数値付きキーワードは数値を加算）
function _mergeKeywords(baseKws, addKws){
  const result=[...baseKws];
  (addKws||[]).forEach(kw=>{
    const base=kw.replace(/\d+$/,'');
    const num=parseInt(kw.match(/\d+$/)?.[0]);
    const existIdx=result.findIndex(k=>k.replace(/\d+$/,'')===base);
    if(existIdx>=0){
      if(!isNaN(num)){
        const existNum=parseInt(result[existIdx].match(/\d+$/)?.[0])||0;
        result[existIdx]=base+(existNum+num);
      }
    } else { result.push(kw); }
  });
  return result;
}

// 重ね後のスタッツ・テキストを計算（プレビュー・実行共用）
function _computeStackResult(fieldUnit, srcUnit){
  const newAtk=fieldUnit.atk+srcUnit.atk;
  const newHp=fieldUnit.hp+srcUnit.hp;
  const fSC=fieldUnit._stackCount||0;
  const sSC=srcUnit._stackCount||0;
  const newStackCount=fSC+sSC+1;
  const baseGrade=fieldUnit._baseGrade||fieldUnit.grade||1;
  // グレードアップしない（スタッツ合算のみ）
  const newGrade=baseGrade;
  const baseDesc=fieldUnit._baseDesc!=null?fieldUnit._baseDesc:(fieldUnit.desc||'');
  // 重ね段階に応じた説明文を使用
  const def=UNIT_POOL.find(u=>u.id===(fieldUnit.defId||fieldUnit.id)||u.name===fieldUnit.name);
  let newDesc=baseDesc;
  if(newStackCount>=1&&def?.stackEnhDesc) newDesc=def.stackEnhDesc; // シートの「強化」列が優先
  else if(def?.stackEffect) newDesc=def.stackEffect; // 後方互換（旧重ね効果列）
  else newDesc=_applyDescStack(baseDesc,newStackCount); // 未設定時：従来通りカードテキストの値+1
  const newKws=_mergeKeywords(fieldUnit.keywords||[],srcUnit.keywords||[]);
  return {atk:newAtk,hp:newHp,grade:newGrade,desc:newDesc,keywords:newKws,
    stackCount:newStackCount,baseGrade,baseDesc};
}

// 重ねを実行する
function _applyStack(fieldIdx, rewIdx){
  const rewCard=_rewCards[rewIdx];
  const fieldUnit=G.allies[fieldIdx];
  if(!rewCard||!fieldUnit) return;
  const cost=rewCard._buyPrice??2;
  if(G.gold<cost){ log('ソウルが不足しています','bad'); return; }
  if((fieldUnit._stackCount||0)>=2){ log(`${fieldUnit.name} はこれ以上重ねられません（最大3枚）`,'bad'); return; }
  G.gold-=cost;
  const result=_computeStackResult(fieldUnit,rewCard);
  fieldUnit.atk=result.atk; fieldUnit.baseAtk=result.atk;
  fieldUnit.hp=result.hp; fieldUnit.maxHp=result.hp;
  fieldUnit.grade=result.grade;
  fieldUnit.desc=result.desc;
  fieldUnit.keywords=result.keywords;
  fieldUnit._stackCount=result.stackCount;
  fieldUnit._baseGrade=result.baseGrade;
  fieldUnit._baseDesc=result.baseDesc;
  if(result.keywords.includes('反撃')) fieldUnit.counter=true;
  log(`${fieldUnit.name} を重ねた → ${result.atk}/${result.hp} G${result.grade}`,'good');
  squirrelSay('カードを重ねた時');
  // 使役効果（重ね後も発動）
  if(fieldUnit.effect==='chimera_summon'){
    const _pool=['即死','毒牙5','狩人','標的','成長5','加護','反撃','二段攻撃'];
    const _avail=[..._pool.filter(k=>!(fieldUnit.keywords||[]).includes(k))];
    const _chosen=[];
    for(let _ci=0;_ci<3&&_avail.length>0;_ci++){
      const _idx=Math.floor(Math.random()*_avail.length);
      _chosen.push(_avail.splice(_idx,1)[0]);
    }
    if(!fieldUnit.keywords) fieldUnit.keywords=[];
    _chosen.forEach(k=>{ if(!fieldUnit.keywords.includes(k)) fieldUnit.keywords.push(k); });
    if(_chosen.includes('反撃')) fieldUnit.counter=true;
    if(_chosen.includes('標的')){ fieldUnit.hate=true; fieldUnit.hateTurns=99; }
    log(`${fieldUnit.name}：キーワード${_chosen.join('、')}を追加獲得`,'good');
  }
  if(fieldUnit.effect==='mitera_summon'){
    const _pelG=fieldUnit.grade||1;
    const _pelDef={id:'c_pelican',name:'ペリカン',race:'獣',grade:_pelG,atk:_pelG,hp:3*_pelG,cost:0,unique:false,icon:'🦤',desc:''};
    const _pelUnit=makeUnitFromDef(_pelDef);
    const _pei=G.allies.findIndex(a=>!a||a.hp<=0);
    if(_pei>=0){
      G.allies[_pei]=_pelUnit;
      log(`${fieldUnit.name}：ペリカン(${_pelG}/${3*_pelG})を盤面に召喚`,'good');
      // グリマルキン（passive）・コカトリス：カード効果召喚バフ
      const _gd=G.hasGoldenDrop?1:0;
      G.allies.forEach(g=>{ if(g&&g.hp>0&&g!==_pelUnit){
        if(g.effect==='grimalkin_passive'){ const _gbv=1+_gd; _pelUnit.atk+=_gbv; _pelUnit.baseAtk=(_pelUnit.baseAtk||0)+_gbv; _pelUnit.hp+=_gbv; _pelUnit.maxHp+=_gbv; log(`${g.name}：カード効果召喚→${_pelUnit.name}+${_gbv}/+${_gbv}`,'good'); }
        if(g.effect==='cocatrice_passive'){ const _cv=1+_gd; g.atk+=_cv; g.baseAtk=(g.baseAtk||0)+_cv; g.hp+=_cv; g.maxHp+=_cv; log(`${g.name}：キャラ効果召喚→+${_cv}/+${_cv}`,'good'); }
      }});
    }
  }
  if(fieldUnit.effect==='kobold_summon'){
    const _wi=G.spells.findIndex(s=>s&&s.type==='wand');
    const _kcs=fieldUnit._stackCount||0; // 増分（新スタック数分）
    if(_kcs>0&&_wi>=0){ G.spells[_wi].usesLeft=(G.spells[_wi].usesLeft||0)+_kcs; log(`${fieldUnit.name}：${G.spells[_wi].name}に充填+${_kcs}`,'good'); }
  }
  // slin_summon は削除済み（スリンの新効果は負傷）
  fireTrigger('on_summon', null);
  // 3枚重ね（_stackCount=2）で継承可能フラグを立てる
  if(fieldUnit._stackCount>=2){
    fieldUnit._canInherit=true;
    log(`${fieldUnit.name}：3枚重ね完了！継承が可能になった`,'gold');
  }
  _rewCards[rewIdx]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
}

// フィールドスロットをドラッグ中にハイライト
function _updateFieldDropHighlights(cardName, cost, isFieldDrag, excludeIdx){
  const canAfford=isFieldDrag||G.gold>=cost;
  _getAllyDomSlots().forEach((slotEl,i)=>{
    if(!slotEl||i===excludeIdx) return;
    const unit=G.allies[i];
    if(!unit||unit.hp<=0){
      if(canAfford){ slotEl.style.boxShadow='0 0 10px 2px var(--teal2)'; slotEl.style.outline='2px solid var(--teal2)'; }
    } else if(unit.name===cardName){
      if((unit._stackCount||0)>=2){ slotEl.style.opacity='0.35'; slotEl.style.outline='2px solid #555'; }
      else if(canAfford){ slotEl.style.boxShadow='0 0 12px 2px var(--gold2)'; slotEl.style.outline='2px dashed var(--gold2)'; }
    }
  });
}
function _clearFieldDropHighlights(){
  _getAllyDomSlots().forEach(s=>{ if(s){ s.style.boxShadow=''; s.style.outline=''; s.style.opacity=''; } });
}

// ── カスタムドラッグゴースト＋合成プレビュー ─────────
// ブラウザネイティブのドラッグゴーストはCSSのz-indexより上のコンポジタレイヤーに描画される。
// setDragImageで透明画像に差し替え、自前のゴーストdivを使うことでプレビューを上に出す。

// setDragImage 用の透明画像（DOMに追加済みのimg要素が最も確実に動作する）
const _transparentDragImg=(()=>{
  const img=document.createElement('img');
  img.src='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  img.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px';
  document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(img));
  return img;
})();

let _dragGhostDiv=null;
// ドロップ後にDOMが再構築されると dragend が発火しない場合があるため、グローバルで確実に除去
document.addEventListener('dragend', ()=>{ _removeDragGhost(); _removeStackPreviewOverlay(); }, true);
function _createDragGhost(srcEl){
  _removeDragGhost();
  const d=srcEl.cloneNode(true);
  d.querySelectorAll('button').forEach(b=>b.remove()); // 還魂ボタン等を除去
  const W=srcEl.offsetWidth||80, H=srcEl.offsetHeight||80;
  d.style.cssText=`position:fixed;pointer-events:none;z-index:9998;opacity:.82;visibility:hidden;`+
    `width:${W}px;height:${H}px;`+
    `transform:scale(.95);transition:none;left:0;top:0;`+
    `border-radius:6px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.6)`;
  d._ghostW=W; d._ghostH=H;
  document.body.appendChild(d);
  _dragGhostDiv=d;
}
function _moveDragGhost(clientX,clientY){
  if(!_dragGhostDiv) return;
  const W=_dragGhostDiv._ghostW||_dragGhostDiv.offsetWidth||80;
  const H=_dragGhostDiv._ghostH||_dragGhostDiv.offsetHeight||80;
  _dragGhostDiv.style.left=(clientX-W/2)+'px';
  _dragGhostDiv.style.top=(clientY-H/2)+'px';
  _dragGhostDiv.style.visibility='visible';
}
function _removeDragGhost(){
  if(_dragGhostDiv){ _dragGhostDiv.remove(); _dragGhostDiv=null; }
}

let _stackPreviewEl=null;

function _buildStackPreviewEl(fieldUnit, srcUnit){
  const result=_computeStackResult(fieldUnit,srcUnit);
  const el=document.getElementById('stack-preview-float')||document.createElement('div');
  el.id='stack-preview-float';
  el.className='stack-preview-ov';
  el.style=`position:fixed;width:90px;z-index:9999;pointer-events:none;display:flex;flex-direction:column;
    background:var(--card,#1e1e2e);border:2px solid var(--gold2);border-radius:6px;overflow:hidden;
    box-shadow:0 4px 24px rgba(0,0,0,.7)`;
  const gradeColors=['','#aaa','#7cf','#fa0','#f60','#f0f','#fff'];  // G6=白金
  const gc=gradeColors[result.grade]||'#fff';
  const _kColorMap={'即死':'#e060e0','毒牙':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090','アーティファクト':'#b0a080'};
  const _mkKw=k=>{const kb=k.replace(/\d+$/,'');const c=_kColorMap[k]||_kColorMap[kb]||'#888';return `<span style="font-size:.38rem;background:rgba(0,0,0,.4);color:${c};border:1px solid ${c};border-radius:2px;padding:0 2px">${k}</span>`;};
  const kwHtml=result.keywords.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;padding:0 2px">${result.keywords.map(_mkKw).join('')}</div>`:'';

  // ── DESC: 現在の実効値（補正込み）＋ src の基礎値 ──
  // computeDesc(fieldUnit) は fieldUnit が G.allies にある実オブジェクトなので
  // グリマルキン・黄金の雫ボーナスが正しく適用される
  const _currDescHtml = fieldUnit.desc ? computeDesc(fieldUnit) : '';
  const _currDescPlain = _currDescHtml.replace(/<[^>]+>/g,'');
  const _currNums = [..._currDescPlain.matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  const _srcBaseDesc = srcUnit._baseDesc!=null ? srcUnit._baseDesc : (srcUnit.desc||'');
  const _srcNums = [..._srcBaseDesc.matchAll(/\d+/g)].map(m=>parseInt(m[0]));
  let _ni=0;
  const _previewDescHtml = _currDescPlain.replace(/\d+/g,()=>{
    const curr=_currNums[_ni]??0;
    const add=_srcNums[_ni]??0;
    _ni++;
    const sum=curr+add;
    return add>0
      ? `<span style="color:var(--gold2);font-weight:700">${sum}</span>`
      : String(curr);
  });
  const _fakeForStrip={keywords:result.keywords,counter:result.keywords.includes('反撃')};
  const _stripped = _stripKeywordsFromDesc(_previewDescHtml, _fakeForStrip);
  const descHtml = _stripped ? `<div class="slot-desc" style="font-size:.42rem;padding:0 3px 3px">${_stripped}</div>` : '';

  // ── ATK/HP: 変化があれば金色で表示 ──
  const _atkChanged = result.atk !== fieldUnit.atk;
  const _hpChanged  = result.hp  !== fieldUnit.hp;
  const atkHtml = _atkChanged
    ? `<span class="a" style="color:var(--gold2);font-weight:700">${result.atk}</span>`
    : `<span class="a">${result.atk}</span>`;
  const hpHtml = _hpChanged
    ? `<span class="h" style="color:var(--gold2);font-weight:700">${result.hp}</span>`
    : `<span class="h">${result.hp}</span>`;

  el.innerHTML=`
    <div style="text-align:center;border-bottom:1px solid var(--gold2);padding:2px 4px;font-size:.42rem;color:var(--gold2);font-weight:700">合成プレビュー</div>
    <div class="slot-grade" style="color:${gc}">${gradeStr(result.grade)}</div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 2px 4px">
      <div style="font-size:1.0rem">${fieldUnit.icon||'❓'}</div>
      <div class="slot-name">${fieldUnit.name}</div>
      <div class="slot-race">${fieldUnit.race||'-'}</div>
      <div class="slot-stats">${atkHtml}<span class="s">/</span>${hpHtml}</div>
    </div>
    ${kwHtml}${descHtml}`;
  if(!el.parentNode) document.body.appendChild(el);
  _stackPreviewEl=el;
}

function _moveStackPreview(clientX, clientY){
  if(!_stackPreviewEl) return;
  const W=_stackPreviewEl.offsetWidth||90;
  const H=_stackPreviewEl.offsetHeight||120;
  const vw=window.innerWidth, vh=window.innerHeight;
  let x=clientX+16, y=clientY+16;
  if(x+W>vw) x=clientX-W-8;
  if(y+H>vh) y=clientY-H-8;
  _stackPreviewEl.style.left=x+'px';
  _stackPreviewEl.style.top=y+'px';
}

function _showStackPreviewOverlay(_ignored, fieldUnit, srcUnit, clientX, clientY){
  _buildStackPreviewEl(fieldUnit, srcUnit);
  _moveStackPreview(clientX||0, clientY||0);
}
function _removeStackPreviewOverlay(){
  if(_stackPreviewEl){ _stackPreviewEl.remove(); _stackPreviewEl=null; }
  document.querySelectorAll('.stack-preview-ov').forEach(p=>p.remove());
}

function sellFieldUnit(idx){
  const unit=G.allies[idx]; if(!unit) return;
  G.allies[idx]=null;
  const _baseGold=1;
  // ゴールデンエッグ：還魂時に追加ソウル（X=グレード）
  const _eggBonus=(unit.effect==='golden_egg_sell')?(unit.grade||1):0;
  const _totalGold=_baseGold+_eggBonus;
  G.gold+=_totalGold; G.earnedGold+=_totalGold;
  if(_eggBonus>0) log(`${unit.name} を還魂（+${_totalGold}ソウル：ゴールデンエッグ+${_eggBonus}）`,'gold');
  else log(`${unit.name} を還魂（+1ソウル）`,'gold');
  squirrelSay('カードを売却した時');
  // レプラコーン：ソウルを得るたびに全キャラ±0/+1
  { const _gd=G.hasGoldenDrop?1:0; const _lv=1+_gd;
    const _hasLep=G.allies.some(a=>a&&a.hp>0&&a.effect==='leprechaun_gold');
    if(_hasLep){
      G.allies.forEach(a=>{ if(a&&a.hp>0){ a.hp+=_lv; a.maxHp+=_lv; }});
      log(`レプラコーン：ソウル獲得→全仲間±0/+${_lv}`,'good');
    }
  }
  // ペリュトン：フィールドに残っているときに別の仲間が還魂されたら以後のキャラ効果召喚ATK+1
  const perytons=G.allies.find(a=>a&&a.effect==='perytons_sell');
  if(perytons){
    const _incr=1+(G.hasGoldenDrop?1:0);
    G._grimalkinBonus=(G._grimalkinBonus||0)+_incr;
    log(`${perytons.name}：以後のキャラクター効果召喚が+${_incr}/±0（累計+${G._grimalkinBonus}）`,'good');
  }
  // imp_sell 削除済み（インプの新効果は使役時）
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderRewCards();
  renderEnemyHand();
  renderFieldEditor();
  renderGradeUpBtn();
}

// ── 手札エディタ（アイテム）──────────────────────

let _dragSrc=null;
function renderHandEditor(){
  renderHeRow('hand-slots', G.spells, 0, G.handSlots, 'spells');
  const hc=document.getElementById('hand-count'); if(hc) hc.textContent=G.spells.filter(s=>s).length;
  // 指輪スロット
  renderHeRingSlots();
  requestAnimationFrame(fitCardDescs);
}

function renderHeRingSlots(){
  const el=document.getElementById('ring-slots');
  if(!el) return;
  el.innerHTML='';
  const R=G.ringSlots;
  el.style.gridTemplateColumns=`repeat(${R},1fr)`;
  const ringPane=document.getElementById('ring-pane');
  if(ringPane) ringPane.style.flex=R;
  const handPaneRe=document.getElementById('hand-pane');
  if(handPaneRe) handPaneRe.style.flex=10-R;
  const rc=document.getElementById('ring-count'); if(rc) rc.textContent=G.rings.filter(r=>r).length;
  const rm=document.getElementById('ring-max');   if(rm) rm.textContent=R;
  for(let i=0;i<R;i++){
    const ring=G.rings[i];
    if(ring){
      const div=document.createElement('div');
      div.className='card ring';
      div.draggable=true;
      const _ringBtn=G._isShop?`<button class="discard-btn" title="売却+1ソウル" style="color:var(--gold2)">売 +1</button>`:`<button class="discard-btn" title="破棄">破棄</button>`;
      div.innerHTML=`<div class="card-tp ring">指輪</div><div class="card-grade">${gradeStr(ring.grade||1)}</div><div class="card-name">${ring.name}</div><div class="card-desc">${computeDesc(ring)}</div>${_ringBtn}`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); if(G._isShop){ G.rings[i]=null; G.gold+=1; updateHUD(); const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold; log(ring.name+' を売却（+1ソウル）','gold'); squirrelSay('カードを売却した時'); renderHandEditor(); } else discardRing(i); };
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:'rings',idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); });
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard('rings',i); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty';
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{ e.preventDefault(); ph.classList.remove('drag-over'); dropOnCard('rings',i); });
      el.appendChild(ph);
    }
  }
}

function renderHeRow(elId, arr, startIdx, count, arrName){
  const el=document.getElementById(elId);
  if(!el) return;
  el.innerHTML='';
  const Hcols=10-(G.ringSlots||2); // 常に10枠合計
  el.style.gridTemplateColumns=`repeat(${Hcols},1fr)`;
  if(elId==='hand-slots'){
    const handPane=document.getElementById('hand-pane');
    if(handPane) handPane.style.flex=Hcols;
  }
  for(let i=startIdx;i<startIdx+Hcols;i++){
    if(i>=startIdx+count){
      // 未解放スロット
      const ph=document.createElement('div'); ph.className='card-empty spell'; ph.style.opacity='0.1'; el.appendChild(ph); continue;
    }
    const card=arr[i];
    if(card){
      const div=document.createElement('div');
      const _isRingInHand=!card.type||(card.kind==='summon'||card.kind==='passive');
      const t=_isRingInHand?'ring':(card.type||'wand');
      div.className=`card ${t}`;
      div.style.paddingBottom='22px'; // 破棄ボタン分の余白確保
      div.draggable=true;
      const _gradeEl=`<span class="card-grade${card.legend?' legend-grade':''}">${gradeStr(card.grade||1)}</span>`;
      const _charges=t==='wand'?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?')):null;
      const _chargeHtml=_charges!==null?`<div class="card-charge">チャージ：${_charges}</div>`:'';
      const _spellBtn=G._isShop?`<button class="discard-btn" title="売却+1ソウル" style="color:var(--gold2)">売 +1</button>`:`<button class="discard-btn" title="破棄">破棄</button>`;
      div.innerHTML=`${_gradeEl}<div class="card-tp ${t}">${t==='ring'?'指輪':t==='wand'?'杖':'アイテム'}</div><div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${_chargeHtml}${_spellBtn}`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); if(G._isShop){ arr[i]=null; G.gold+=1; updateHUD(); const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold; log(card.name+' を売却（+1ソウル）','gold'); squirrelSay('カードを売却した時'); renderHandEditor(); } else discardHeCard(arrName,i); };
      if(G.phase==='reward'&&arrName==='spells'&&!card.noRewardUse){
        const _isWand=t==='wand';
        const _hasCharge=!_isWand||(card.usesLeft===undefined||card.usesLeft>0);
        if(_hasCharge){ div.onclick=()=>useSpell(i); div.style.cursor='pointer'; }
      }
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:arrName,idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; e.dataTransfer.setDragImage(_transparentDragImg,0,0); _createDragGhost(div); });
      div.addEventListener('drag',e=>{ if(e.clientX||e.clientY) _moveDragGhost(e.clientX,e.clientY); });
      div.addEventListener('dragend',()=>{ div.classList.remove('dragging'); _removeDragGhost(); });
      div.addEventListener('dragover',e=>{ e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{ e.preventDefault(); div.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty spell';
      ph.addEventListener('dragover',e=>{ e.preventDefault(); ph.classList.add('drag-over'); });
      ph.addEventListener('dragleave',()=>ph.classList.remove('drag-over'));
      ph.addEventListener('drop',e=>{ e.preventDefault(); ph.classList.remove('drag-over'); dropOnCard(arrName,i); });
      el.appendChild(ph);
    }
  }
}

function dropOnCard(destArr,destIdx){
  if(!_dragSrc) return;
  const srcArr=_dragSrc.arr; const srcIdx=_dragSrc.idx;
  _dragSrc=null;
  const _isRingCard=c=>c&&(c.kind==='summon'||c.kind==='passive'||c.type==='ring');
  if(srcArr===destArr){
    // 同一配列内の入れ替え
    const arr=srcArr==='rings'?G.rings:G.spells;
    const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
  } else {
    // 異なる配列間（指輪スロット↔インベントリ）
    const srcArrObj=srcArr==='rings'?G.rings:G.spells;
    const destArrObj=destArr==='rings'?G.rings:G.spells;
    const srcCard=srcArrObj[srcIdx];
    const destCard=destArrObj[destIdx];
    // 移動先に指輪でないカードがある場合は交換不可
    if(destCard&&!_isRingCard(destCard)) return;
    if(srcCard&&!_isRingCard(srcCard)) return;
    // 交換
    srcArrObj[srcIdx]=destCard||null;
    destArrObj[destIdx]=srcCard||null;
  }
  renderHandEditor();
}

function discardHeCard(arrName, idx){
  const arr=arrName==='rings'?G.rings:G.spells;
  const card=arr[idx]; if(!card) return;
  arr[idx]=null;
  const refund=cardRefund(card);
  if(refund>0){
    G.gold+=refund;
    updateHUD();
    const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
    try{ log(card.name+' を還魂（+'+refund+'ソウル）','gold'); }catch(e){}
  } else {
    try{ log(card.name+' を破棄','sys'); }catch(e){}
  }
  renderHandEditor();
  try{ renderRewCards(); }catch(e){}
  try{ renderEnemyHand(); }catch(e){}
  try{ renderGradeUpBtn(); }catch(e){}
}

function discardRing(idx){
  const ring=G.rings[idx]; if(!ring) return;
  G.rings[idx]=null;
  updateGoldenDrop();
  // ユニーク指輪は破棄時に再出現しないよう記録
  if(ring.legend||ring._isLegend) G._seenLegendRings.add(ring.id);
  updateHUD();
  const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
  log(ring.name+' を破棄','sys');
  renderHandEditor();
  renderGradeUpBtn();
}

// ── 報酬グレードアップUI ────────────────────────

function renderGradeUpBtn(){
  // reward-info-bar 内に grade-up ボタンを動的挿入
  let el=document.getElementById('rw-grade-up-btn');
  if(!el){
    el=document.createElement('button');
    el.id='rw-grade-up-btn';
    el.className='btn tiny';
    el.style='border-color:var(--gold);color:var(--gold2);margin-left:6px';
    document.getElementById('reward-info-bar').appendChild(el);
  }
  const count=G.rewardGradeUpCount||0;
  const maxGrade=5; // 最大G5まで（報酬グレードアップの上限）
  if(count>=GRADE_UP_COSTS.length||(G.rewardGrade||1)>=maxGrade){
    el.style.display='none'; return;
  }
  const cost=Math.max(0, GRADE_UP_COSTS[count]-(G._gradeUpCostBonus||0));
  const canAfford=G.gold>=cost;
  el.style.display='';
  el.textContent=`報酬G${(G.rewardGrade||1)}→G${(G.rewardGrade||1)+1}（${cost}ソウル）`;
  el.disabled=!canAfford;
  el.style.opacity=canAfford?'':'0.4';
  el.onclick=()=>{
    if(G.gold<cost) return;
    G.gold-=cost;
    G.rewardGrade=(G.rewardGrade||1)+1;
    G.rewardGradeUpCount=(G.rewardGradeUpCount||0)+1;
    // 報酬キャラ出現数を+1（最大6）し、即座に1体追加
    if((G.rewardCharCount||3)<6){
      G.rewardCharCount=(G.rewardCharCount||3)+1;
      const newChars=drawCharacters(1);
      if(newChars.length){ _rewCards.push(newChars[0]); _padRewCharSlots(); }
    }
    log(`📈 報酬グレードアップ：G${G.rewardGrade}　報酬キャラ${G.rewardCharCount}体`,'gold');
    squirrelSay('グレードを上げた時');
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD();
    renderGradeUpBtn();
    renderRewCards();
    renderEnemyHand();
  };
}

// ── イベント（祭壇・宿屋）単品アイテム受け取り画面 ─────
// onDone は受け取り後または「戻る」を押したときに呼ばれるコールバック

let _eventItemDone=null;

function showEventItemPickup(item, onDone){
  const itemCopy=clone(item);
  itemCopy._buyPrice=0;
  _rewCards=[itemCopy];
  _eventItemDone=onDone||null;

  const _faf2=document.getElementById('f-ally'); if(_faf2) _faf2.innerHTML='';
  document.getElementById('ally-section').style.display='';
  const eArea2=document.getElementById('enemy-area');
  if(eArea2) eArea2.style.display='none';
  const rMB2=document.getElementById('reward-move-btns');
  if(rMB2) rMB2.style.display='';
  document.getElementById('reward-info-bar').style.display='';
  document.getElementById('reward-cards-section').style.display='';
  document.getElementById('btn-pass').style.display='none';
  document.getElementById('ph-badge').textContent='アイテム受け取り';
  document.getElementById('ph-badge').className='ph-badge';
  const bossNotice=document.getElementById('boss-reward-notice');
  if(bossNotice) bossNotice.style.display='none';
  document.getElementById('rw-gold').textContent=G.gold;
  document.getElementById('rw-count').textContent='';
  const gradeBtn=document.getElementById('rw-grade-up-btn');
  if(gradeBtn) gradeBtn.style.display='none';
  const rerollBtn=document.getElementById('rw-reroll');
  if(rerollBtn) rerollBtn.style.display='none';

  showScreen('battle');
  renderAll(); renderRewCards(); renderMoveSlotsInEnemy(); renderFieldEditor(); updateHUD();
}

function _eventItemBack(){
  if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); }
}

// ── エンチャントモーダル（互換）──────────────────

let _encCtx={src:'reward',cost:0};
let _encTargetIdx=-1;

function openEncModal(src='reward',cost=0,presetEnchantType=null){
  _encCtx={src,cost};
  _encTargetIdx=-1;
  const rings=G.rings.map((r,i)=>({card:r,idx:i})).filter(x=>x.card&&x.card.kind==='summon');
  if(!rings.length){ alert('手持ちの召喚指輪がありません'); return; }
  const el=document.getElementById('enc-rings');
  el.innerHTML='';
  rings.forEach(({card,idx})=>{
    const div=document.createElement('div');
    div.className='enc-item';
    div.textContent=`${card.name} ${gradeStr(card.grade||1)}${card.enchants?.length?' ['+card.enchants.join('・')+']':''}`;
    div.onclick=()=>{ _encTargetIdx=idx; if(presetEnchantType){ applyEnc(presetEnchantType); } else showEncStep2(); };
    el.appendChild(div);
  });
  document.getElementById('enc-s1').style.display='';
  document.getElementById('enc-s2').style.display='none';
  document.getElementById('enc-modal').classList.add('open');
}
function showEncStep2(){
  document.getElementById('enc-s1').style.display='none';
  document.getElementById('enc-s2').style.display='';
  const el=document.getElementById('enc-types');
  el.innerHTML='';
  ENCHANT_TYPES.forEach(et=>{
    const div=document.createElement('div');
    div.className='enc-type';
    div.innerHTML=`<strong>${et.id}</strong><div style="font-size:.65rem;color:var(--text2);margin-top:2px">${et.effect}</div>`;
    div.onclick=()=>applyEnc(et.id);
    el.appendChild(div);
  });
}
function encBack(){ document.getElementById('enc-s1').style.display=''; document.getElementById('enc-s2').style.display='none'; }
function applyEnc(et){
  if(_encTargetIdx<0) return;
  const ring=G.rings[_encTargetIdx]; if(!ring) return;
  if(!ring.enchants) ring.enchants=[];
  ring.enchants.push(et);
  if(_encCtx.cost>0){ G.gold-=_encCtx.cost; updateHUD(); }
  log(ring.name+' に「'+et+'」付与','good');
  closeEncModal();
  if(_encCtx.src==='reward'){ renderHandEditor(); renderRewCards(); }
  else if(_encCtx.src==='smithy'){
    if(_encCtx.farsight){
      log(`${ring.name} に「${et}」を付与`,'good');
      _smithyChosen&&_smithyChosen.add(_encCtx.smithyKey||'enc0');
      doSmithy&&doSmithy(false);
    } else {
      showEvent&&showEvent('祭壇',`${ring.name} に「${et}」を付与した。`,`エンチャント「${et}」付与`);
    }
  }
}
function closeEncModal(){ document.getElementById('enc-modal').classList.remove('open'); }

// ── マスターオーナーシステム ─────────────────────────

// マスターの手札を生成（報酬グレード以下の杖・アイテムからランダム5枚）
// _rewCards から杖・アイテムをmasterHandに移動（キャラクターのみ報酬エリアに残す）
function _generateMasterHand(){
  const _isRing=c=>c.kind==='summon'||c.kind==='passive'||c.type==='ring';
  G.masterHand=_rewCards.filter(c=>c&&(c.type==='wand'||c.type==='consumable'||_isRing(c)));
  G.masterRings=[]; // 使用しない
  _rewCards=_rewCards.map(c=>{
    if(!c) return c;
    if(c.type==='wand'||c.type==='consumable'||_isRing(c)) return null;
    return c;
  });
}

// マスター手札アイテムを購入（杖・消耗品・指輪）
function buyMasterHandItem(idx){
  const sp=G.masterHand[idx]; if(!sp) return;
  const cost=sp._buyPrice??2;
  if(G.gold<cost){ log('ソウルが足りません','bad'); return; }
  const _isRingCard=sp.kind==='summon'||sp.kind==='passive'||sp.type==='ring';
  if(_isRingCard){
    const ringIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
    if(ringIdx<0){
      // 指輪スロットが満杯の場合はスペルスロットへ（ドラッグで後から移動可）
      const spIdx=G.spells.indexOf(null);
      if(spIdx<0){ log(`スロットが満杯です`,'bad'); return; }
      G.gold-=cost;
      const rc=clone(sp); delete rc._buyPrice;
      G.spells[spIdx]=rc;
      if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
      log(`${rc.name} を取得（インベントリへ、-${cost}ソウル）`,'good');
    } else {
      G.gold-=cost;
      const rc=clone(sp); delete rc._buyPrice;
      G.rings[ringIdx]=rc;
      if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
      updateGoldenDrop();
      if(rc.unique==='fury_start'){
        const _fb=3*(rc.grade||1);
        G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_fb; a.baseAtk=(a.baseAtk||0)+_fb; }});
        log(`憤激の指輪：全仲間パワー+${_fb}/±0`,'good');
      }
      if(rc.unique==='extra_action'){
        const _oldPT=G.actionsPerTurn;
        G.actionsPerTurn=calcActions();
        G.actionsLeft=G.actionsLeft+(G.actionsPerTurn-_oldPT);
      }
      log(`${rc.name} を装備（-${cost}ソウル）`,'good');
    }
    G.masterHand[idx]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD();
    renderFieldEditor();
    renderEnemyHand();
    renderRewCards();
    renderGradeUpBtn();
    return;
  }
  const handIdx=G.spells.indexOf(null);
  if(handIdx<0){ log(`インベントリ（${G.handSlots||5}枠）が満杯です`,'bad'); return; }
  G.gold-=cost;
  delete sp._buyPrice;
  G.spells[handIdx]=sp;
  // ファミリア：商談フェイズで最初に購入した消耗品のコピーを得る（杖は対象外）
  if(sp.type==='consumable'&&G.phase==='reward'&&!G._familiarUsed&&G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='familiar_shop')){
    G._familiarUsed=true;
    const _famHandIdx=G.spells.indexOf(null);
    if(_famHandIdx>=0){
      const _famCopy=clone(sp);
      G.spells[_famHandIdx]=_famCopy;
      log(`ファミリア：${sp.name}のコピーを獲得`,'good');
    }
  }
  G.masterHand[idx]=null;
  log(`${sp.name} を取得（-${cost}ソウル）`,'good');
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderFieldEditor();
  renderEnemyHand();
  renderRewCards();
  renderGradeUpBtn();
}

// マスター指輪を購入
function buyMasterRingItem(idx){
  const ring=G.masterRings&&G.masterRings[idx]; if(!ring) return;
  const cost=ring._buyPrice??4;
  if(G.gold<cost){ log('ソウルが足りません','bad'); return; }
  const ringIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
  if(ringIdx<0){ log(`指輪スロット（${G.ringSlots}枠）が満杯です。破棄してください。`,'bad'); return; }
  G.gold-=cost;
  const rc=clone(ring); delete rc._buyPrice;
  G.rings[ringIdx]=rc;
  if(rc.legend||rc._isLegend){ G._seenLegendRings=G._seenLegendRings||new Set(); G._seenLegendRings.add(rc.id); }
  updateGoldenDrop();
  if(rc.unique==='fury_start'){
    const _fb=3*(rc.grade||1);
    G.allies.forEach(a=>{ if(a&&a.hp>0){ a.atk+=_fb; a.baseAtk=(a.baseAtk||0)+_fb; }});
    log(`憤激の指輪：全仲間パワー+${_fb}/±0`,'good');
  }
  if(rc.unique==='extra_action'){
    const _oldPT=G.actionsPerTurn;
    G.actionsPerTurn=calcActions();
    G.actionsLeft=G.actionsLeft+(G.actionsPerTurn-_oldPT);
  }
  G.masterRings[idx]=null;
  log(`${rc.name} を装備（-${cost}ソウル）`,'good');
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderEnemyHand();
  renderRewCards();
  renderGradeUpBtn();
}

// 誘発「オーナーが〜」のオーナー判定：将来マスターが行動した時に呼ぶ
// 現時点ではマスターは行動しないため発動なし
function _checkMasterTrigger(_triggerType){
  // TODO: マスターがアクションを起こした時に実装
}
