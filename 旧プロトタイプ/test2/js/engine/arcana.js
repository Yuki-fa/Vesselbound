// ═══════════════════════════════════════
// arcana.js — 秘術（ヒーローパワー）システム
// 依存: constants.js, state.js, events.js, spells.js, reward.js
// ═══════════════════════════════════════

// ── 秘術選択画面を表示 ─────────────────────────────

function showArcanaSelect(){
  // スターター杖プールを取得
  const starterWands=SPELL_POOL.filter(s=>s.starterOnly&&s.type==='wand');
  if(!starterWands.length){ _startGameWithArcana(null,null); return; }

  // 3セット生成（秘術とスターター杖をランダムにペア）
  const arcanas=[];
  const arcanaPool=[...ARCANA_POOL];
  for(let i=0;i<3;i++){
    if(!arcanaPool.length) arcanaPool.push(...ARCANA_POOL);
    const ai=Math.floor(Math.random()*arcanaPool.length);
    arcanas.push(arcanaPool.splice(ai,1)[0]);
  }
  const wands=[];
  for(let i=0;i<3;i++) wands.push(starterWands[Math.floor(Math.random()*starterWands.length)]);

  const el=document.getElementById('arcana-sets');
  el.innerHTML='';
  for(let i=0;i<3;i++){
    const arc=arcanas[i];
    const wand=wands[i];
    const div=document.createElement('div');
    div.className='arcana-set';
    div.innerHTML=`
      <div class="arcana-wand">
        <div class="arcana-wand-icon">🪄</div>
        <div class="arcana-wand-name">${wand.name}</div>
        <div class="arcana-wand-desc">${wand.desc||''}</div>
      </div>
      <div class="arcana-plus">＋</div>
      <div class="arcana-card ${arc.type}">
        <div class="arcana-icon">${arc.icon}</div>
        <div class="arcana-name">${arc.id}</div>
        <div class="arcana-type-badge">${arc.type==='passive'?'パッシブ':'能動（1回/報酬）'}</div>
        <div class="arcana-cost">${arc.cost>0?arc.cost+'ソウル':'無料'}</div>
        <div class="arcana-desc">${arc.desc}</div>
      </div>
    `;
    div.onclick=(()=>{
      const a=arc,w=wand;
      return ()=>_startGameWithArcana(a,w);
    })();
    el.appendChild(div);
  }
  showScreen('arcana');
}

function _startGameWithArcana(arcana, starterWand){
  G.arcana=arcana;
  G.arcanaUsed=false;
  // スターター杖をセット（炎の杖の代わりに選んだ杖）
  if(starterWand){
    const w=clone(starterWand);
    w.usesLeft=w.baseUses||5; w._maxUses=w.usesLeft;
    G.spells[0]=w;
  }
  // パッシブ秘術の初期効果を適用
  if(arcana&&arcana.id==='熟練'){
    G.rewardCards++;
    log('熟練：報酬枠+1（消耗品枠として追加）','sys');
  }
  showScreen('battle');
  startBattle();
}

// ── 秘術を使用（報酬フェイズ中）──────────────────────

function useArcana(){
  const arc=G.arcana;
  if(!arc||G.arcanaUsed) return;
  if(G.phase!=='reward') return;

  switch(arc.id){
    case '寵愛':  _arcanaFavor();   break;
    case '祈祷':  _arcanaPray();    break;
    case '集中':  _arcanaFocus();   break;
    case '煉獄':  _arcanaPurge();   break;
    case '信頼':  _arcanaTrust();   break;
    case '観察':  _arcanaObserve(); break;
    case '血盟':  _arcanaBlood();   break;
    default: return;
  }
}

// 寵愛：一番左の報酬カードを無料獲得
function _arcanaFavor(){
  if(G.gold<1){ log('ソウルが足りない（寵愛：1ソウル）','bad'); return; }
  // _rewCardsは reward.js のモジュール変数。直接アクセス不可なので公開関数を使う
  const first=_rewCards.find(c=>c);
  if(!first){ log('報酬カードがない','sys'); return; }
  const idx=_rewCards.indexOf(first);
  // 枠チェック
  const isRing=!first.type||first.type==='ring'||first.kind==='summon'||first.kind==='passive';
  const alreadyOwned=isRing&&G.rings.findIndex(r=>r&&r.id===first.id)>=0;
  if(isRing&&!alreadyOwned&&G.rings.filter(r=>r).length>=G.ringSlots){ log('契約枠が満杯（寵愛は使用できない）','bad'); return; }
  if((first.type==='wand'||first.type==='consumable')&&G.spells.filter(s=>s).length>=(G.handSlots||5)){ log('手札が満杯','bad'); return; }
  G.gold-=1;
  // 通常購入と同じ処理（コスト0で強制取得）
  const origPrice=first._buyPrice;
  first._buyPrice=0;
  takeRewCard(idx);
  // takeRewCardが金を引くが0なので整合性OK
  G.gold-=0; // no-op、既に1引いた
  first._buyPrice=origPrice;
  G.arcanaUsed=true;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards(); renderHandEditor();
  _renderArcanaBtn();
  log(`💫 寵愛：${first.name} を1ソウルで獲得`,'gold');
}

// 祈祷：報酬中のランダムな契約グレード+1
function _arcanaPray(){
  if(G.gold<1){ log('ソウルが足りない（祈祷：1ソウル）','bad'); return; }
  const rings=_rewCards.filter(c=>c&&(!c.type||c.type==='ring'||c.kind==='summon'||c.kind==='passive'));
  if(!rings.length){ log('報酬に契約カードがない','sys'); return; }
  G.gold-=1;
  const target=randFrom(rings);
  const newG=Math.min(MAX_GRADE,(target.grade||1)+1);
  target.grade=newG;
  target._buyPrice=Math.max(target._buyPrice||1,(target._buyPrice||1)); // 金額はそのまま
  G.arcanaUsed=true;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards();
  _renderArcanaBtn();
  log(`🙏 祈祷：${target.name} のグレードが ${gradeStr(newG)} に上昇`,'gold');
}

// 集中：報酬の契約カードを所持契約と同種に変化
function _arcanaFocus(){
  if(G.gold<1){ log('ソウルが足りない（集中：1ソウル）','bad'); return; }
  const ownedRings=G.rings.filter(r=>r);
  if(!ownedRings.length){ log('所持している契約がない','sys'); return; }
  const rings=_rewCards.filter(c=>c&&(!c.type||c.type==='ring'||c.kind==='summon'||c.kind==='passive'));
  if(!rings.length){ log('報酬に契約カードがない','sys'); return; }

  // 対象カードを選択させる
  _arcanaPickTarget('集中', rings, (target)=>{
    G.gold-=1;
    const picked=randFrom(ownedRings);
    const nc=clone(picked);
    nc.grade=target.grade;
    nc._buyPrice=target._buyPrice;
    const ti=_rewCards.indexOf(target);
    _rewCards[ti]=nc;
    G.arcanaUsed=true;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards();
    _renderArcanaBtn();
    log(`🎯 集中：${target.name}→${nc.name}（${gradeStr(nc.grade)}）に変化`,'gold');
  });
}

// 煉獄：報酬カードを抹消→魂の残滓に変換
function _arcanaPurge(){
  if(G.gold<1){ log('ソウルが足りない（煉獄：1ソウル）','bad'); return; }
  const valid=_rewCards.filter(c=>c);
  if(!valid.length){ log('報酬カードがない','sys'); return; }

  _arcanaPickTarget('煉獄', valid, (target)=>{
    G.gold-=1;
    const ti=_rewCards.indexOf(target);
    // プールから抹消
    if(target.id&&target.type==='ring'&&!G.bannedRings.includes(target.id)){
      G.bannedRings.push(target.id);
      log(`🔥 煉獄：${target.name} をプールから抹消`,'sys');
    }
    // 魂の残滓消耗品を生成して置き換え
    const dregs=clone(SPELL_POOL.find(s=>s.id==='c_soul_dregs')||{id:'c_soul_dregs',name:'魂の残滓',type:'consumable',effect:'soul_dregs'});
    dregs._buyPrice=1;
    _rewCards[ti]=dregs;
    G.arcanaUsed=true;
    document.getElementById('rw-gold').textContent=G.gold;
    updateHUD(); renderRewCards();
    _renderArcanaBtn();
    log(`🔥 煉獄：魂の残滓に変換`,'gold');
  });
}

// 信頼：召喚契約を選びバフ永続累積
function _arcanaTrust(){
  if(G.gold<2){ log('ソウルが足りない（信頼：2ソウル）','bad'); return; }
  const rings=G.rings.map((r,i)=>({r,i})).filter(x=>x.r&&x.r.kind==='summon');
  if(!rings.length){ log('召喚契約がない','sys'); return; }
  const bonus=G.arcanaTrustCount+1;

  // 選択UI（モーダル流用）
  const el=document.getElementById('enc-rings');
  if(!el){ return; }
  el.innerHTML=`<div style="font-size:.72rem;color:var(--text2);margin-bottom:7px">バフを付与する召喚契約を選択（ATK/HP+${bonus}・永続）</div>`;
  rings.forEach(({r,i})=>{
    const div=document.createElement('div');
    div.className='enc-item';
    div.textContent=`${r.name} ${gradeStr(r.grade||1)}`;
    div.onclick=()=>{
      G.gold-=2;
      if(!G.buffAdjBonuses[r.id]) G.buffAdjBonuses[r.id]={atk:0,hp:0};
      G.buffAdjBonuses[r.id].atk+=bonus;
      G.buffAdjBonuses[r.id].hp+=bonus;
      G.arcanaTrustCount++;
      G.arcanaUsed=true;
      closeEncModal();
      document.getElementById('rw-gold').textContent=G.gold;
      updateHUD(); renderRewCards(); renderHandEditor();
      _renderArcanaBtn();
      log(`🤝 信頼：${r.name} の仲間に永続ATK+${bonus}/HP+${bonus}`,'gold');
    };
    el.appendChild(div);
  });
  document.getElementById('enc-s1').style.display='';
  document.getElementById('enc-s2').style.display='none';
  document.getElementById('enc-modal').classList.add('open');
}

// 観察：次の戦闘で祭壇/休息所が確定
function _arcanaObserve(){
  if(G.gold<1){ log('ソウルが足りない（観察：1ソウル）','bad'); return; }
  G.gold-=1;
  G.arcanaForceNode=true;
  G.arcanaUsed=true;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards();
  _renderArcanaBtn();
  log('👁️ 観察：次の戦闘で祭壇か休息所が確定で出現する','gold');
}

// 血盟：1ダメージを受け1ソウルを得る
function _arcanaBlood(){
  if(G.life<=1){ log('ライフが1以下のため血盟は使えない','bad'); return; }
  G.life=Math.max(1,G.life-1);
  G.gold+=1;
  G.arcanaUsed=true;
  document.getElementById('rw-gold').textContent=G.gold;
  updateHUD(); renderRewCards();
  _renderArcanaBtn();
  log('🩸 血盟：ライフ-1、ソウル+1','gold');
}

// ── ターゲット選択ヘルパー ─────────────────────────

function _arcanaPickTarget(arcanaName, cards, onPick){
  // 1枚しかない場合は即座に選択
  if(cards.length===1){ onPick(cards[0]); return; }
  // 複数ある場合は簡易オーバーレイで選択
  const overlay=document.getElementById('arcana-pick-overlay');
  if(!overlay) return;
  const list=document.getElementById('arcana-pick-list');
  list.innerHTML=`<div style="font-size:.8rem;color:var(--text2);margin-bottom:10px">${arcanaName}：対象を選んでください</div>`;
  cards.forEach(card=>{
    const div=document.createElement('div');
    div.className='choice-opt';
    div.innerHTML=`<div class="choice-label">${card.name} ${gradeStr(card.grade||1)}</div><div class="choice-desc">${computeDesc(card)}</div>`;
    div.onclick=()=>{ overlay.style.display='none'; onPick(card); };
    list.appendChild(div);
  });
  const cancel=document.createElement('button');
  cancel.className='btn tiny'; cancel.textContent='キャンセル'; cancel.style.marginTop='8px';
  cancel.onclick=()=>{ overlay.style.display='none'; };
  list.appendChild(cancel);
  overlay.style.display='flex';
}

// ── 秘術ボタンの表示更新 ─────────────────────────────

function _renderArcanaBtn(){
  const arc=G.arcana;
  const btn=document.getElementById('arcana-btn');
  if(!btn) return;
  if(!arc||arc.type==='passive'){
    btn.style.display='none';
    return;
  }
  btn.style.display='';
  const canUse=!G.arcanaUsed&&G.gold>=arc.cost&&G.phase==='reward';
  btn.disabled=!canUse;
  btn.textContent=`${arc.icon} ${arc.id}（${arc.cost>0?arc.cost+'ソウル':'無料'}）${G.arcanaUsed?'【使用済】':''}`;
  btn.className='btn small'+(canUse?'':' cant-arcana');
  // パッシブ表示（arcana-passive-info）
  const pi=document.getElementById('arcana-passive-info');
  if(pi) pi.style.display='none';
  renderArcanaBar();
}

function renderArcanaInfo(){
  const arc=G.arcana;
  const btn=document.getElementById('arcana-btn');
  const pi=document.getElementById('arcana-passive-info');
  if(!arc){ if(btn) btn.style.display='none'; if(pi) pi.style.display='none'; return; }
  if(arc.type==='passive'){
    if(btn) btn.style.display='none';
    if(pi){ pi.style.display=''; pi.textContent=`${arc.icon} 秘術（パッシブ）：${arc.id} — ${arc.desc}`; }
    return;
  }
  if(btn) btn.style.display='';
  _renderArcanaBtn();
  if(pi) pi.style.display='none';
}

// ── 報酬フェイズ開始時に呼ぶ（使用フラグをリセット）──
function arcanaPhaseStart(){
  G.arcanaUsed=false;
  renderArcanaInfo();
  _renderArcanaBtn();
  renderArcanaBar();
}
