// ═══════════════════════════════════════
// reward.js — 報酬フェイズ・フィールドエディタ
// 依存: constants.js, state.js, pool.js, render.js
// ═══════════════════════════════════════

let _rewCards=[];
let _placingChar=null; // フィールド配置待ちのキャラカード

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

  // エリート撃破ボーナス：高レアリティ宝箱を自動開封して報酬欄に追加
  if(G._pendingEliteChest){
    G._pendingEliteChest=false;
    G._pendingTreasure=false;
    const fd=FLOOR_DATA[G.floor];
    const maxGrade=fd?(fd.grade||1):1;
    const eliteItem=drawTreasure({2:65,3:35},{wand:40,consumable:40,ring:20},maxGrade);
    if(eliteItem){ _rewCards.push(eliteItem); }
    log('⭐ エリート撃破：高レアリティ宝箱が出現！','gold');
  }

  // 宝箱：moveMasksからchestを除去し、中身を報酬欄に無料で追加
  if(G._pendingTreasure){
    G.moveMasks=G.moveMasks.map(m=>m==='chest'?null:m);
    G.visibleMoves=G.visibleMoves.filter(i=>G.moveMasks[i]);
    const fd2=FLOOR_DATA[G.floor];
    const maxGrade2=fd2?(fd2.grade||1):1;
    const treasureItem=drawTreasure({1:60,2:30,3:10},{wand:40,consumable:40,ring:20},maxGrade2);
    if(treasureItem){ _rewCards.push(treasureItem); }
    log('📦 宝箱の中身が報酬欄に追加された！','gold');
    G._pendingTreasure=false;
  }

  // 報酬フェイズUI
  document.getElementById('f-ally').innerHTML='';
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
  {id:'action',      label:'行動権永続+1',           desc:'永続的に行動回数が+1される。',             apply:()=>{ G._bonusAction=(G._bonusAction||0)+1; G.actionsPerTurn=calcActions(); updateHUD(); log(`ボス報酬：行動権永続+1（現在${G.actionsPerTurn}行動/ターン）`,'gold'); }},
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
        // _generateMasterHand()実行後なので全種類を直接masterHandへ
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
    if(opts.length===0) opts.push({nodeType:FLOOR_DATA[G.floor+1]&&FLOOR_DATA[G.floor+1].boss?'boss':'battle',idx:-1});
  }
  opts.slice(0,3).forEach(opt=>{
    const nt=NODE_TYPES[opt.nodeType];
    const btn=document.createElement('button');
    btn.className='btn rew-move-btn';
    btn.innerHTML=`<span style="font-size:1.1rem">${nt.icon}</span><span>${nt.label}</span>`;
    btn.onclick=()=>chooseMoveInline(opt.nodeType);
    el.appendChild(btn);
  });
}

function chooseMoveInline(nt){
  G._isShop=false; // 行商モード解除
  // イベントアイテム受け取り中なら状態更新コールバックを先に実行
  if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); }
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
  c.hp=Math.max(0,c.hp-dmg);
  if(c.hp<=0){
    log(`${c.name}：報酬枠から消滅`,'bad');
    _rewCards[rewIdx]=null;
    renderRewCards();
    return;
  }
  // 負傷トリガー（常在・誘発・負傷のみ）
  if(c.injury) _triggerRewCharInjury(c, dmg);
  renderRewCards();
}

// 報酬フェイズ中の負傷トリガー（開戦・終戦・攻撃・召喚は除く）
function _triggerRewCharInjury(unit, dmg=0){
  if(!unit||!unit.injury) return;
  switch(unit.injury){
    case 'mummy':{
      const mv=1+(G.hasGoldenDrop?1:0);
      G._undeadHpBonus=(G._undeadHpBonus||0)+mv;
      G.enemyUndeadAtkBonus=(G.enemyUndeadAtkBonus||0)+mv;
      log(`${unit.name}：今後現れるG2以上が+${mv}/±0（累計+${G._undeadHpBonus}）`,'good');
      break;
    }
    case 'freyr':{
      const scDef2={id:'c_stone_cat',name:'ストーンキャット',race:'-',grade:1,atk:4,hp:6,cost:0,unique:false,icon:'🗿',desc:'反撃　アーティファクト',counter:true,keywords:['アーティファクト']};
      addRewChar(makeUnitFromDef(scDef2));
      log(`${unit.name}：負傷→ストーンキャットを報酬枠に召喚`,'good');
      break;
    }
    case 'kettcat':{
      const _ncDef={id:'c_nightcat',name:'ナイトキャット',race:'獣',grade:1,atk:1,hp:3,cost:0,unique:false,icon:'🐈‍⬛',desc:''};
      addRewChar(makeUnitFromDef(_ncDef));
      log(`${unit.name}：負傷→ナイトキャット(1/3)を報酬枠に召喚`,'good');
      break;
    }
    case 'ran':{
      const ranHp=Math.max(1,dmg);
      const ranDef={id:'c_ran_spawn',name:'海の眷属',race:'亜人',grade:unit.grade||1,atk:10,hp:ranHp,cost:0,unique:false,icon:'🐚',desc:''};
      addRewChar(makeUnitFromDef(ranDef));
      log(`${unit.name}：負傷→海の眷属(10/${ranHp})を報酬枠に召喚`,'good');
      break;
    }
    case 'banshee':{
      // 「バンシー」以外の全キャラに1ダメ
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0&&a!==unit) dealDmgToAlly(a,1,ai,null); });
      _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0&&c!==unit) dealDmgToRewChar(ri,1); });
      log(`${unit.name}：負傷→全キャラに1ダメ`,'good');
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
  const _kColorMap={'即死':'#e060e0','浸食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090'};
  const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc}"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
  const charRow=document.createElement('div');
  charRow.className='field';
  charRow.style='margin-bottom:8px;width:100%';
  for(let i=0;i<6;i++){
    const card=(_rewCards[i]&&_rewCards[i]._isChar)?_rewCards[i]:null;
    const slot=document.createElement('div');
    if(!card){
      slot.className='slot empty';
    } else {
      slot.className='slot';
      slot.dataset.rewIdx=String(i);
      const cost=card._buyPrice??2;
      const canBuy=G.gold>=cost;
      const hasSlot=G.allies.some(a=>!a||a.hp<=0)||G.allies.length<6;
      const atkBonus=((card.grade||1)>=2&&G._undeadHpBonus?G._undeadHpBonus:0);
      const dispAtk=card.atk+atkBonus;
      const dispHp=card.hp;
      // 仲間加入プレビュー
      // グリマルキン・黄金の雫は召喚効果で出るユニットにのみ影響（X/Y、パターンのある説明文のみ対象）
      const _summonBonus=(G._grimalkinBonus||0)+(G.hasGoldenDrop?1:0);
      const _hasSummonDesc=_summonBonus>0&&/\d+\/\d+、/.test(card.desc||'');
      let _previewStr='';
      if(_hasSummonDesc){
        const _modDesc=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_summonBonus}/${parseInt(h)+_summonBonus}、`);
        _previewStr=`グリマルキン：${_modDesc}`;
      } else if(atkBonus>0){
        _previewStr=`仲間になった時: ${card.atk+atkBonus} / ${card.hp}`;
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
      // 状態異常バッジ：絶対配置（センタリング列の外）でアイコン/名前を固定
      const statusBlock=_stBadges.length?`<div style="position:absolute;top:20px;left:0;right:0;display:flex;justify-content:center;flex-wrap:wrap;gap:2px;z-index:3">${_stBadges.join('')}</div>`:'';
      slot.style.borderTop='2px solid var(--teal2)';
      if(!canBuy) slot.style.background='var(--bg)';
      if(_previewStr) slot.setAttribute('data-preview',_previewStr);
      slot.innerHTML=`${gradeTag}${costTag}${shortBadge}${statusBlock}<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:20px"><div style="font-size:1.1rem">${card.icon||'❓'}</div><div class="slot-name">${card.name}</div><div class="slot-race">${card.race||'-'}</div><div class="slot-stats"><span class="a">${dispAtk}</span><span class="s">/</span><span class="h">${dispHp}</span></div></div><div style="position:absolute;bottom:6px;left:0;right:0;display:flex;flex-direction:column;align-items:stretch;padding:0 2px">${kwBlock}${descTag}</div>`;
      // ドラッグで購入・配置・重ね
      if(canBuy&&hasSlot){
        slot.draggable=true;
        slot.style.cursor='grab';
        slot.addEventListener('dragstart',e=>{
          _rewDragSrc=i;
          e.dataTransfer.effectAllowed='move';
          e.dataTransfer.setData('text/plain',String(i));
          _updateFieldDropHighlights(card.name,cost);
          setTimeout(()=>slot.classList.add('dragging'),0);
        });
        slot.addEventListener('dragend',()=>{
          if(_rewDragSrc>=0){ _rewDragSrc=-1; _clearFieldDropHighlights(); }
          slot.classList.remove('dragging');
          document.querySelectorAll('.stack-preview-ov').forEach(p=>p.remove());
        });
      }
      // 報酬カード同士の入れ替え（他のキャラスロットへドロップ）
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
  const isTreasure=!!card._isTreasure;
  div.className='rew-card'+(canBuy?'':' cant')+(isLegend?' legend':'')+(isTreasure?' treasure':'');

  if(card._isChar){
    // キャラクターカード
    const hasSlot=G.allies.includes(null);
    const disabled=!hasSlot;
    div.className='rew-card'+(canBuy&&!disabled?'':' cant')+(isLegend?' legend':'');
    const raceBadge=`<div style="font-size:.55rem;color:var(--text2);margin-bottom:1px">${card.race||'-'}</div>`;
    // G2以上ATKボーナス表示（マミー負傷効果）
    const atkBonus=(card.grade||1)>=2&&G._undeadHpBonus?G._undeadHpBonus:0;
    const displayAtk=card.atk+atkBonus;
    const atkStr=atkBonus>0
      ?`<span style="color:var(--teal2)">${displayAtk}</span><span style="font-size:.5rem;color:var(--teal2);margin-left:1px">(+${atkBonus})</span>`
      :`<span style="color:var(--teal2)">${card.atk}</span>`;
    const statsLine=`<div style="font-size:.68rem;font-weight:700;margin-top:2px">${atkStr}<span style="color:var(--text2)">/</span><span style="color:#60d090">${card.hp}</span></div>`;
    const costLine=`<div class="rew-card-cost">${isTreasure?'📦 宝箱（無料）':cost+'ソウル'}${disabled?' （盤面満杯）':''}</div>`;
    const uniqueBadge=card.unique?`<div class="rew-legend-badge">⭐ ユニーク</div>`:'';
    const gradeTag=card.grade?` <span class="rew-grade">${gradeStr(card.grade)}</span>`:'';
    const shortBadge=!canBuy&&!isTreasure?`<div style="position:absolute;top:2px;left:50%;transform:translateX(-50%);background:rgba(180,40,40,.9);border:1px solid #e06060;border-radius:3px;padding:0 4px;font-size:.48rem;color:#fff;font-weight:700;white-space:nowrap;z-index:10">ソウル不足</div>`:'';
    const _rewCharDesc=_stripKeywordsFromDesc(card.desc?computeDesc(card):'',card);
    const _sumBonusCard=(G._grimalkinBonus||0)+(G.hasGoldenDrop?1:0);
    const _hasSumDescCard=_sumBonusCard>0&&/\d+\/\d+、/.test(card.desc||'');
    if(_hasSumDescCard){
      const _modDescCard=(card.desc||'').replace(/(\d+)\/(\d+)、/g,(_m,a,h)=>`${parseInt(a)+_sumBonusCard}/${parseInt(h)+_sumBonusCard}、`);
      div.setAttribute('data-preview',`グリマルキン：${_modDescCard}`);
    } else if(atkBonus>0){
      div.setAttribute('data-preview',`仲間になった時: ${card.atk+atkBonus} / ${card.hp}`);
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
  const priceTagItem=isTreasure
    ?`<div style="position:absolute;top:3px;right:5px;font-size:.75rem;color:#5cf;font-weight:700;z-index:4;pointer-events:none;text-shadow:0 0 6px rgba(60,160,255,.8)">無料</div>`
    :`<div style="position:absolute;top:3px;right:5px;font-size:1.05rem;color:var(--gold2);font-weight:700;z-index:4;pointer-events:none;line-height:1">${_circleCost(cost)}</div>`;
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
    G.gold-=cost;
    const unit=makeUnitFromDef(card, undefined, true); // 購入：効果召喚ボーナスは対象外
    G.allies[emptyIdx]=unit;
    log(`${card.name} を獲得（盤面[${emptyIdx}]へ配置）`,'good');
    // 召喚時効果（addAlly と同じ処理を実行）
    if(unit.effect==='jack_summon'){
      G.allies.forEach(a=>{ if(a&&a.hp>0&&a!==unit&&!a.shield){ a.shield=1; }});
      log(`${unit.name}：全ての味方にシールドを付与`,'good');
    }
    if(unit.effect==='centaur_summon'){
      const _cv=2+(G.hasGoldenDrop?1:0);
      G.magicLevel=(G.magicLevel||1)+_cv;
      if(typeof syncHarpyAtk==='function') syncHarpyAtk();
      log(`${unit.name}：召喚→魔術レベル+${_cv}（Lv${G.magicLevel}）`,'good');
    }
    if(unit.effect==='chimera_summon'){
      const _pool=['即死','侵食5','狩人','標的','成長5','加護','反撃','二段攻撃'];
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
    // ミテーラ：自分の場（G.allies）に2/2ペリカンを直接配置
    if(unit.effect==='mitera_summon'){
      const _pelDef={id:'c_pelican',name:'ペリカン',race:'獣',grade:1,atk:2,hp:2,cost:0,unique:false,icon:'🦤',desc:''};
      const _pelUnit=makeUnitFromDef(_pelDef);
      const _pei=G.allies.findIndex(a=>!a||a.hp<=0);
      if(_pei>=0){ G.allies[_pei]=_pelUnit; log(`${unit.name}：ペリカン(2/2)を盤面に召喚`,'good'); }
    }
    // ジャッカロープ：「霊峰の秘薬」を2枚手札に追加
    if(unit.effect==='jackalope_summon'){
      const _herb=SPELL_POOL.find(s=>s.id==='c_reiki_herb');
      if(_herb){ let _ha=0;
        for(let _hi=0;_ha<2&&_hi<G.spells.length;_hi++){
          if(!G.spells[_hi]){ G.spells[_hi]=clone(_herb); _ha++; }
        }
        if(_ha>0) log(`${unit.name}：霊峰の秘薬×${_ha}を入手`,'good');
      }
    }
    // スリン：全仲間に「成長1」を付与
    if(unit.effect==='slin_summon'){
      G.allies.forEach(a=>{ if(a&&a.hp>0&&a!==unit){ if(!a.keywords) a.keywords=[]; if(!a.keywords.includes('成長1')) a.keywords.push('成長1'); }});
      log(`${unit.name}：全仲間に「成長1」を付与`,'good');
    }
    // 指輪の on_summon トリガーを発火（報酬フェーズ中は addAlly → addRewChar へ誘導される）
    fireTrigger('on_summon', null);
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
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
    // 行動の指輪：装備時点でactionsPerTurnを更新
    if(rc.unique==='extra_action'){
      G.actionsPerTurn=calcActions();
    }
    log(card.name+' を取得（指輪スロット['+ringIdx+']）','good');
    _rewCards[i]=null;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
    if(_eventItemDone){ const fn=_eventItemDone; _eventItemDone=null; fn(); renderMoveSlotsInEnemy(); }
    return;
  }

  // アイテム（杖・消耗品）
  const handIdx=G.spells.indexOf(null);
  if(handIdx<0){ log(`手札が満杯（${G.handSlots}枠）です。アイテムを捨ててください。`,'bad'); return; }

  G.gold-=cost;
  const nc=clone(card);
  if(nc.type==='wand'&&nc.usesLeft===undefined){ nc.usesLeft=nc.baseUses||randUses(); }
  if(nc.type==='wand') nc._maxUses=nc.usesLeft;
  G.spells[handIdx]=nc;

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
  // フィールド（キャラクター）: f-allyに直接描画
  const fAlly=document.getElementById('f-ally');
  if(fAlly) _renderFieldRow(fAlly);

  // 手札（アイテム）
  renderHandEditor();
}

function _renderFieldRow(el){
  el.innerHTML='';
  for(let i=0;i<6;i++){
    const unit=G.allies[i];
    const div=document.createElement('div');
    if(unit){
      div.className='slot';
      div.draggable=true;
      const badges=[];
      const _sd=(k)=>{const d=KW_DESC_MAP[k]||'';return d?` data-kwdesc="${d.replace(/"/g,'&quot;')}"`:'';};
      if(unit.hate)    badges.push(`<span class="slot-badge b-hate"${_sd('標的')}>標的</span>`);
      if(unit.shield>0)badges.push(`<span class="slot-badge b-shield"${_sd('シールド')}>🛡</span>`);
      if(unit.poison>0)badges.push(`<span class="slot-badge b-psn" data-kwdesc="敵のターン終了時にライフをX失う。">毒${unit.poison}</span>`);
      if(unit.doomed>0)badges.push(`<span class="slot-badge b-dead" data-kwdesc="破滅が10になると死亡する。">破滅${unit.doomed}</span>`);
      const badgeBlock=badges.length?`<div class="slot-badges">${badges.join('')}</div>`:'';
      const gradeTag=unit.grade?`<div class="slot-grade">G${unit.grade}</div>`:'';
      const _rawDesc=unit.desc?computeDesc(unit):'';
      const _desc=_stripKeywordsFromDesc(_rawDesc,unit);
      const descTag=_desc?`<div class="slot-desc">${_desc}</div>`:'';
      const dragonetSub=unit.effect==='dragonet_end'?`<div style="font-size:.42rem;color:var(--gold)">あと${(3+(unit._dragonetBonus||0))-(unit._dragonetCount||0)}戦</div>`:'';
      const raceTag=unit.race&&unit.race!=='-'?`<div class="slot-race">${unit.race}</div>`:'';
      const _kColorMap={'即死':'#e060e0','浸食':'#a060d0','加護':'#60b0e0','エリート':'#ffd700','ボス':'#ff8040','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','狩人':'#d08040','魂喰らい':'#d060d0','結束':'#80d0d0','邪眼':'#c060c0','シールド':'#60a0e0','呪詛':'#8060d0','反撃':'#e0a060','標的':'#60c0c0','成長':'#60d090'};
      const _mkKwSpan=k=>{const kb=k.replace(/\d+$/,'');const kc=_kColorMap[k]||_kColorMap[kb]||'#888';const kd=KW_DESC_MAP[k]||KW_DESC_MAP[kb]||'';return `<span class="slot-badge" style="background:rgba(0,0,0,.4);color:${kc};border:1px solid ${kc};cursor:help"${kd?` data-kwdesc="${kd.replace(/"/g,'&quot;')}"`:''}>${k}</span>`;};
      const _allKws=[...new Set([...(unit.keywords||[]),...(unit.counter?['反撃']:[])])];
      const _topKws=_allKws.filter(k=>k==='エリート'||k==='ボス');
      const _normKws=_allKws.filter(k=>k!=='エリート'&&k!=='ボス');
      const _topRow=_topKws.length?`<div style="display:flex;justify-content:center;gap:2px;margin-bottom:2px">${_topKws.map(_mkKwSpan).join('')}</div>`:'';
      const _normRow=_normKws.length?`<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px">${_normKws.map(_mkKwSpan).join('')}</div>`:'';
      let kwBlock='';
      if(_topKws.length||_normKws.length) kwBlock=`<div style="margin:4px 0 3px;padding:0 2px">${_topRow}${_normRow}</div>`;
      const _infoStyle='position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-bottom:20px';
      const _btmStyle='position:absolute;bottom:22px;left:0;right:0;background:inherit;display:flex;flex-direction:column;align-items:stretch;padding:0 2px 0';
      div.style.borderTop='2px solid var(--teal2)';
      div.innerHTML=`${badgeBlock}${gradeTag}<div style="${_infoStyle}"><div style="font-size:1.1rem">${unit.icon||'❓'}</div><div class="slot-name">${unit.name}</div>${raceTag}<div class="slot-stats"><span class="a">${unit.atk}</span><span class="s">/</span><span class="h">${unit.hp}</span></div></div><div style="${_btmStyle}">${kwBlock}${dragonetSub}${descTag}</div><button class="return-btn">還魂（ソウル+1）</button>`;
      div.querySelector('.return-btn').onclick=ev=>{ ev.stopPropagation(); sellFieldUnit(i); };
      div.addEventListener('dragstart',e=>{
        _fieldDragSrc=i; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move';
        _updateFieldDropHighlights(unit.name,0,true,i);
      });
      div.addEventListener('dragend',()=>{
        div.classList.remove('dragging'); _clearFieldMergeTimer(); _clearFieldDropHighlights();
        document.querySelectorAll('.stack-preview-ov').forEach(p=>p.remove());
      });
      div.addEventListener('dragover',e=>{
        if(_rewDragSrc>=0){
          const rc=_rewCards[_rewDragSrc];
          if(!rc?._isChar) return;
          if(unit.name===rc.name&&(unit.grade||1)<5&&G.gold>=(rc._buyPrice??2)){
            e.preventDefault();
            if(!div.querySelector('.stack-preview-ov')) _showStackPreviewOverlay(div,unit,rc);
          }
        } else if(_fieldDragSrc>=0&&_fieldDragSrc!==i){
          e.preventDefault();
          const srcUnit=G.allies[_fieldDragSrc];
          if(srcUnit&&unit.name===srcUnit.name&&(unit.grade||1)<5){
            // 同名・マージ候補：0.5秒タイマー
            if(_fieldMergeTarget!==i){
              _clearFieldMergeTimer();
              _fieldMergeTarget=i;
              _fieldMergeTimer=setTimeout(()=>{
                _fieldMergeReady=true;
                const fAlly=document.getElementById('f-ally');
                if(fAlly&&fAlly.children[i]) fAlly.children[i].classList.add('merge-ready');
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
        if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          const rc=_rewCards[src];
          if(rc?._isChar&&unit.name===rc.name&&(unit.grade||1)<5) _applyStack(i,src);
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
          if(rc?._isChar&&G.gold>=(rc._buyPrice??2)){ e.preventDefault(); div.classList.add('drag-over'); }
        } else if(_fieldDragSrc>=0){ e.preventDefault(); div.classList.add('drag-over'); }
      });
      div.addEventListener('dragleave',()=>div.classList.remove('drag-over'));
      div.addEventListener('drop',e=>{
        e.preventDefault(); div.classList.remove('drag-over');
        if(_rewDragSrc>=0){
          const src=_rewDragSrc; _rewDragSrc=-1; _clearFieldDropHighlights();
          takeRewCard(src,i);
        } else if(_fieldDragSrc>=0){ _dropFieldUnit(i); }
      });
    }
    el.appendChild(div);
  }
}

let _fieldDragSrc=-1;
let _rewDragSrc=-1;       // 報酬欄からドラッグ中のインデックス
let _fieldMergeTimer=null;// 盤面内重ねの0.5秒タイマー
let _fieldMergeTarget=-1; // タイマー対象のスロットインデックス
let _fieldMergeReady=false;// タイマー発火済みフラグ

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
  log(`${dst.name} を重ねた（盤面内）→ ${result.atk}/${result.hp} G${result.grade}`,'good');
  updateHUD(); renderRewCards(); renderFieldEditor(); renderGradeUpBtn();
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
  const newGrade=Math.min(5,baseGrade+newStackCount);
  const baseDesc=fieldUnit._baseDesc!=null?fieldUnit._baseDesc:(fieldUnit.desc||'');
  // 専用重ね効果があればそれを優先
  const def=UNIT_POOL.find(u=>u.id===(fieldUnit.defId||fieldUnit.id)||u.name===fieldUnit.name);
  const stackEffect=def?.stackEffect||null;
  const newDesc=stackEffect||_applyDescStack(baseDesc,newStackCount);
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
  if((fieldUnit.grade||1)>=5){ log('グレード5には重ねられません','bad'); return; }
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
  // 使役効果（重ね後も発動）
  if(fieldUnit.effect==='jack_summon'){
    G.allies.forEach(a=>{ if(a&&a.hp>0&&a!==fieldUnit&&!a.shield){ a.shield=1; }});
    log(`${fieldUnit.name}：全ての味方にシールドを付与`,'good');
  }
  if(fieldUnit.effect==='centaur_summon'){
    const _cv=2+(G.hasGoldenDrop?1:0);
    G.magicLevel=(G.magicLevel||1)+_cv;
    if(typeof syncHarpyAtk==='function') syncHarpyAtk();
    log(`${fieldUnit.name}：魔術レベル+${_cv}（Lv${G.magicLevel}）`,'good');
  }
  if(fieldUnit.effect==='chimera_summon'){
    const _pool=['即死','侵食5','狩人','標的','成長5','加護','反撃','二段攻撃'];
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
    const _pelDef={id:'c_pelican',name:'ペリカン',race:'獣',grade:1,atk:2,hp:2,cost:0,unique:false,icon:'🦤',desc:''};
    const _pelUnit=makeUnitFromDef(_pelDef);
    const _pei=G.allies.findIndex(a=>!a||a.hp<=0);
    if(_pei>=0){ G.allies[_pei]=_pelUnit; log(`${fieldUnit.name}：ペリカン(2/2)を盤面に召喚`,'good'); }
  }
  if(fieldUnit.effect==='jackalope_summon'){
    const _herb=SPELL_POOL.find(s=>s.id==='c_reiki_herb');
    if(_herb){ let _ha=0;
      for(let _hi=0;_ha<2&&_hi<G.spells.length;_hi++){
        if(!G.spells[_hi]){ G.spells[_hi]=clone(_herb); _ha++; }
      }
      if(_ha>0) log(`${fieldUnit.name}：霊峰の秘薬×${_ha}を入手`,'good');
    }
  }
  if(fieldUnit.effect==='slin_summon'){
    G.allies.forEach(a=>{ if(a&&a.hp>0&&a!==fieldUnit){ if(!a.keywords) a.keywords=[]; if(!a.keywords.includes('成長1')) a.keywords.push('成長1'); }});
    log(`${fieldUnit.name}：全仲間に「成長1」を付与`,'good');
  }
  fireTrigger('on_summon', null);
  _rewCards[rewIdx]=null;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderFieldEditor(); renderEnemyHand(); renderGradeUpBtn();
}

// フィールドスロットをドラッグ中にハイライト
function _updateFieldDropHighlights(cardName, cost, isFieldDrag, excludeIdx){
  const fAlly=document.getElementById('f-ally');
  if(!fAlly) return;
  const canAfford=isFieldDrag||G.gold>=cost;
  Array.from(fAlly.children).forEach((slotEl,i)=>{
    if(i===excludeIdx) return;
    const unit=G.allies[i];
    if(!unit){
      if(canAfford){ slotEl.style.boxShadow='0 0 10px 2px var(--teal2)'; slotEl.style.outline='2px solid var(--teal2)'; }
    } else if(unit.name===cardName){
      if((unit.grade||1)>=5){ slotEl.style.opacity='0.35'; slotEl.style.outline='2px solid #555'; }
      else if(canAfford){ slotEl.style.boxShadow='0 0 12px 2px var(--gold2)'; slotEl.style.outline='2px dashed var(--gold2)'; }
    }
  });
}
function _clearFieldDropHighlights(){
  const fAlly=document.getElementById('f-ally');
  if(!fAlly) return;
  Array.from(fAlly.children).forEach(s=>{ s.style.boxShadow=''; s.style.outline=''; s.style.opacity=''; });
}

// フィールドスロットに重ねプレビューオーバーレイを表示
function _getRewCardSlotEl(){
  const charRow=document.querySelector('#rw-cards .field');
  if(!charRow||_rewDragSrc<0) return null;
  return charRow.children[_rewDragSrc]||null;
}
function _showStackPreviewOverlay(_ignored, fieldUnit, rewCard){
  const srcEl=_getRewCardSlotEl();
  if(!srcEl||srcEl.querySelector('.stack-preview-ov')) return;
  const result=_computeStackResult(fieldUnit,rewCard);
  const ov=document.createElement('div');
  ov.className='stack-preview-ov';
  ov.style='position:absolute;inset:0;background:rgba(0,0,0,.88);z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border-radius:6px;border:2px solid var(--gold2);pointer-events:none';
  const _kc={'反撃':'#e0a060','成長':'#60d090','シールド':'#60a0e0','加護':'#60b0e0','即死':'#e060e0','二段攻撃':'#60d0e0','三段攻撃':'#60d0e0','全体攻撃':'#e04040','アーティファクト':'#b0a080'};
  const kwHtml=result.keywords.length?result.keywords.map(k=>{const kb=k.replace(/\d+$/,'');const c=_kc[k]||_kc[kb]||'#888';return `<span style="font-size:.38rem;background:rgba(0,0,0,.4);color:${c};border:1px solid ${c};border-radius:2px;padding:0 2px">${k}</span>`}).join(''):'';
  const gradeColors=['','#aaa','#7cf','#fa0','#f60','#f0f'];
  const gc=gradeColors[result.grade]||'#fff';
  ov.innerHTML=`<div style="font-size:.42rem;color:var(--gold2);font-weight:700">重ね後</div><div style="font-size:.82rem;font-weight:700;color:var(--text)"><span style="color:var(--teal2)">${result.atk}</span><span style="color:var(--text2)">/</span><span style="color:#60d090">${result.hp}</span></div><div style="font-size:.46rem;font-weight:700;color:${gc}">G${result.grade}</div><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:2px;padding:0 2px">${kwHtml}</div>`;
  srcEl.style.position='relative';
  srcEl.appendChild(ov);
}
function _removeStackPreviewOverlay(_ignored){
  const srcEl=_getRewCardSlotEl();
  if(srcEl){ const ov=srcEl.querySelector('.stack-preview-ov'); if(ov) ov.remove(); }
  // フォールバック：残っているオーバーレイを全消去
  document.querySelectorAll('.stack-preview-ov').forEach(p=>p.remove());
}

function sellFieldUnit(idx){
  const unit=G.allies[idx]; if(!unit) return;
  G.allies[idx]=null;
  G.gold+=1; G.earnedGold+=1;
  log(`${unit.name} を還魂（+1ソウル）`,'gold');
  // グリマルキン：フィールドに残っているときに別の仲間が還魂されたらボーナス発動
  const grimalkin=G.allies.find(a=>a&&a.effect==='grimalkin_sell');
  if(grimalkin){
    const _incr=1+(G.hasGoldenDrop?1:0);
    G._grimalkinBonus=(G._grimalkinBonus||0)+_incr;
    log(`${grimalkin.name}：以後の召喚ユニットが+${_incr}/+${_incr}（累計+${G._grimalkinBonus}/+${G._grimalkinBonus}）`,'good');
  }
  // コカトリス：ソウルストーン以外の仲間を還魂すると0/1の「ソウルストーン」を召喚
  if(unit.name!=='ソウルストーン'){
    G.allies.forEach(cc=>{
      if(!cc||cc.hp<=0||cc.effect!=='cocatrice_sell') return;
      const ssDef={id:'c_soulstone',name:'ソウルストーン',race:'-',grade:1,atk:0,hp:1,cost:0,unique:false,icon:'💎',desc:''};
      const empty=G.allies.findIndex(s=>!s||s.hp<=0);
      if(empty>=0){ G.allies[empty]=makeUnitFromDef(ssDef); log(`${cc.name}：ソウルストーン(0/1)を召喚`,'good'); }
    });
  }
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
      const _ringBtn=G._isShop?`<button class="discard-btn" title="売却+1ソウル" style="color:var(--gold2)">売 +1</button>`:`<button class="discard-btn" title="破棄">破棄</button>`;
      div.innerHTML=`<div class="card-tp ring">指輪</div><div class="card-grade">${gradeStr(ring.grade||1)}</div><div class="card-name">${ring.name}</div><div class="card-desc">${computeDesc(ring)}</div>${_ringBtn}`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); if(G._isShop){ G.rings[i]=null; G.gold+=1; updateHUD(); const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold; log(ring.name+' を売却（+1ソウル）','gold'); renderHandEditor(); } else discardRing(i); };
      el.appendChild(div);
    } else {
      const ph=document.createElement('div');
      ph.className='card-empty';
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
      const t=card.type||'wand';
      div.className=`card ${t}`;
      div.style.paddingBottom='22px'; // 破棄ボタン分の余白確保
      div.draggable=true;
      const _gradeEl=card.grade?`<span class="card-grade${card.legend?' legend-grade':''}">${gradeStr(card.grade||1)}</span>`:'';
      const _charges=t==='wand'?(card.usesLeft!==undefined?card.usesLeft:(card.baseUses||card._maxUses||'?')):null;
      const _chargeHtml=_charges!==null?`<div class="card-charge">チャージ：${_charges}</div>`:'';
      const _spellBtn=G._isShop?`<button class="discard-btn" title="売却+1ソウル" style="color:var(--gold2)">売 +1</button>`:`<button class="discard-btn" title="破棄">破棄</button>`;
      div.innerHTML=`${_gradeEl}<div class="card-tp ${t}">${t==='wand'?'杖':'アイテム'}</div><div class="card-name">${card.name}</div><div class="card-desc">${computeDesc(card)}</div>${_chargeHtml}${_spellBtn}`;
      div.querySelector('.discard-btn').onclick=ev=>{ ev.stopPropagation(); if(G._isShop){ arr[i]=null; G.gold+=1; updateHUD(); const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold; log(card.name+' を売却（+1ソウル）','gold'); renderHandEditor(); } else discardHeCard(arrName,i); };
      if(G.phase==='reward'&&arrName==='spells'&&!card.noRewardUse){
        const _isWand=t==='wand';
        const _hasCharge=!_isWand||(card.usesLeft===undefined||card.usesLeft>0);
        if(_hasCharge){ div.onclick=()=>useSpell(i); div.style.cursor='pointer'; }
      }
      div.addEventListener('dragstart',e=>{ _dragSrc={arr:arrName,idx:i}; div.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
      div.addEventListener('dragend',()=>div.classList.remove('dragging'));
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
  if(srcArr!==destArr) return;
  const arr=srcArr==='rings'?G.rings:G.spells;
  const tmp=arr[srcIdx]; arr[srcIdx]=arr[destIdx]; arr[destIdx]=tmp;
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
  const maxGrade=4; // 最大G4まで
  if(count>=GRADE_UP_COSTS.length||(G.rewardGrade||1)>=maxGrade){
    el.style.display='none'; return;
  }
  const cost=GRADE_UP_COSTS[count];
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

  document.getElementById('f-ally').innerHTML='';
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
  // 杖・消耗品に加えて、宝箱由来の指輪もmasterHandへ移動
  G.masterHand=_rewCards.filter(c=>c&&(c.type==='wand'||c.type==='consumable'||(c._isTreasure&&(c.kind==='summon'||c.kind==='passive'||c.type==='ring'))));
  _rewCards=_rewCards.map(c=>{
    if(!c) return c;
    if(c.type==='wand'||c.type==='consumable') return null;
    if(c._isTreasure&&(c.kind==='summon'||c.kind==='passive'||c.type==='ring')) return null;
    return c;
  });
}

// マスター手札アイテムを購入
function buyMasterHandItem(idx){
  const sp=G.masterHand[idx]; if(!sp) return;
  const cost=sp._buyPrice??2;
  if(G.gold<cost){ log('ソウルが足りません','bad'); return; }
  const isRing=sp.kind==='summon'||sp.kind==='passive'||sp.type==='ring';
  if(isRing){
    const ringIdx=G.rings.slice(0,G.ringSlots).indexOf(null);
    if(ringIdx<0){ log(`指輪スロット（${G.ringSlots}枠）が満杯です。フィールドの指輪を破棄してください。`,'bad'); return; }
    G.gold-=cost;
    delete sp._buyPrice;
    G.rings[ringIdx]=sp;
    if(sp.legend||sp._isLegend) G._seenLegendRings.add(sp.id);
    updateGoldenDrop();
  } else {
    const handIdx=G.spells.indexOf(null);
    if(handIdx<0){ log(`手札（${G.handSlots||5}枠）が満杯です`,'bad'); return; }
    G.gold-=cost;
    delete sp._buyPrice;   // 購入後は価格バッジを消す
    G.spells[handIdx]=sp;
  }
  G.masterHand[idx]=null;
  log(`${sp.name} を取得（-${cost}ソウル）`,'good');
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD();
  renderFieldEditor(); // プレイヤー手札（廃棄ボタン付き）を再描画
  renderEnemyHand();   // マスター手札を再描画
  renderRewCards();    // 提示カードのソウル不足状態を更新
  renderGradeUpBtn();  // ソウル不足状態を更新
}

// 誘発「オーナーが〜」のオーナー判定：将来マスターが行動した時に呼ぶ
// 現時点ではマスターは行動しないため発動なし
function _checkMasterTrigger(_triggerType){
  // TODO: マスターがアクションを起こした時に実装
}
