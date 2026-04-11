// ═══════════════════════════════════════
// spell.js — 魔法使用ロジック
// 依存: constants.js, state.js, battle.js, render.js, summon.js
// ═══════════════════════════════════════

let _tgtCtx=null;
let _swapFirst=-1;
let _spreadTargetPending=false;

function useSpell(idx){
  const sp=G.spells[idx];
  if(!sp) return;
  if(sp.type==='wand'&&sp.usesLeft<=0) return;
  if(G.actionsLeft<=0&&!G._debugMode) return;
  if(sp.effect==='swap_pos'){ startSwapPick(idx); return; }
  if(sp.effect==='charm'){ pickTargetCharm(idx); return; }
  if(sp.needsAlly) pickTarget('ally',idx);
  else if(sp.needsEnemy) pickTarget('enemy',idx,true); // 加護チェックあり
  else if(sp.needsAny) pickTargetAny(idx);
  else applySpell(sp,idx,null);
}

// 転移の杖：2体選択UI（味方-味方 または 敵-敵）
function startSwapPick(idx){
  clearSelectable(); // 前の選択状態を必ずクリア
  _swapFirst=-1;
  setHint('入れ替える1体目を選択（味方同士または敵同士・ESC or 右クリックでキャンセル）');
  // 味方スロット
  document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
    if(G.allies[i]&&G.allies[i].hp>0){
      slot.classList.add('selectable');
      slot.onclick=()=>{
        clearSelectable();
        _swapFirst=i;
        setHint(`${G.allies[i].name}を選択。2体目の味方を選択（ESC or 右クリックでキャンセル）`);
        document.getElementById('f-ally').querySelectorAll('.slot').forEach((s2,j)=>{
          if(G.allies[j]&&G.allies[j].hp>0&&j!==i){
            s2.classList.add('selectable');
            s2.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'pair',team:'ally',idx1:_swapFirst,idx2:j}); _swapFirst=-1; };
          }
        });
        _addCancelListeners();
      };
    }
  });
  // 敵スロット
  document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
    if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){
      slot.classList.add('selectable');
      slot.onclick=()=>{
        clearSelectable();
        _swapFirst=i;
        setHint(`${G.enemies[i].name}を選択。2体目の敵を選択（ESC or 右クリックでキャンセル）`);
        document.getElementById('f-enemy').querySelectorAll('.slot').forEach((s2,j)=>{
          if(G.enemies[j]&&G.enemies[j].hp>0&&!s2.classList.contains('has-move')&&j!==i){
            s2.classList.add('selectable');
            s2.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'pair',team:'enemy',idx1:_swapFirst,idx2:j}); _swapFirst=-1; };
          }
        });
        _addCancelListeners();
      };
    }
  });
  _addCancelListeners();
}

// 任意キャラクター選択（needsAny）
function pickTargetAny(idx){
  clearSelectable(); // 前の選択状態をリセット
  _tgtCtx={who:'any',idx};
  setHint('対象を選択（ESC or 右クリックでキャンセル）');
  // 味方
  document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
    if(G.allies[i]&&G.allies[i].hp>0){
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'ally',idx:i}); };
    }
  });
  if(G.phase==='reward'){
    // 報酬フェイズ：報酬キャラクターを選択肢に追加
    document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
      const ri=parseInt(slot.dataset.rewIdx);
      const c=_rewCards[ri];
      if(!c||!c._isChar||c.hp<=0) return;
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'rew-char',idx:ri}); };
    });
  } else {
    // 戦闘中：敵を選択肢に追加
    document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){
        slot.classList.add('selectable');
        slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'enemy',idx:i}); };
      }
    });
  }
  _addCancelListeners();
}

function pickTarget(who,idx,checkBless){
  clearSelectable(); // 前の選択状態をリセット
  _tgtCtx={who,idx};
  setHint(`対象を選択（ESC or 右クリックでキャンセル）`);
  // 報酬フェイズ中に「敵」を対象にする場合は報酬キャラクターをターゲットにする
  if(G.phase==='reward'&&who==='enemy'){
    document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
      const ri=parseInt(slot.dataset.rewIdx);
      const c=_rewCards[ri];
      if(!c||!c._isChar||c.hp<=0) return;
      if(checkBless&&c.keywords&&c.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'rew-char',idx:ri}); };
    });
    _addCancelListeners();
    return;
  }
  const units=who==='ally'?G.allies:G.enemies;
  document.getElementById(who==='ally'?'f-ally':'f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
    const u=units[i];
    if(u&&u.hp>0&&!slot.classList.contains('has-move')){
      // 加護：杖の効果対象にならない
      if(checkBless&&who==='enemy'&&u.keywords&&u.keywords.includes('加護')){
        slot.classList.add('bless-blocked'); // グレーアウト表示
        return;
      }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who,idx:i}); };
    }
  });
  _addCancelListeners();
}

// 魅了の杖専用：ATK > 魔術レベルの敵は選択不可（加護と同様にグレーアウト）
function pickTargetCharm(idx){
  clearSelectable();
  _tgtCtx={who:'enemy',idx};
  setHint(`対象を選択（ESC or 右クリックでキャンセル）`);
  const ml=G.magicLevel||1;
  if(G.phase==='reward'){
    document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
      const ri=parseInt(slot.dataset.rewIdx);
      const c=(_rewCards||[])[ri];
      if(!c||!c._isChar||c.hp<=0) return;
      if(c.keywords&&c.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
      if(c.atk>ml){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'rew-char',idx:ri}); };
    });
  } else {
    document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
      const u=G.enemies[i];
      if(!u||u.hp<=0||slot.classList.contains('has-move')) return;
      if((u.keywords&&u.keywords.includes('加護'))||u.atk>ml){ slot.classList.add('bless-blocked'); return; }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who:'enemy',idx:i}); };
    });
  }
  _addCancelListeners();
}

function _cancelPick(){
  document.removeEventListener('keydown',_cancelPickKD);
  document.removeEventListener('contextmenu',_cancelPickCM);
  clearSelectable();
  if(G.phase==='reward'){ renderRewCards(); renderFieldEditor(); renderMoveSlotsInEnemy(); setHint('報酬を獲得してください'); }
  else { renderHand(); setHint('行動を終えたらターン終了してください。'); }
}
function _cancelPickKD(e){ if(e.key==='Escape') _cancelPick(); }
function _cancelPickCM(e){ e.preventDefault(); _cancelPick(); }
function _addCancelListeners(){
  document.removeEventListener('keydown',_cancelPickKD);
  document.removeEventListener('contextmenu',_cancelPickCM);
  document.addEventListener('keydown',_cancelPickKD);
  document.addEventListener('contextmenu',_cancelPickCM);
}
// 拡散専用キャンセル（_spreadTargetPending もリセット）
function _cancelSpread(){
  document.removeEventListener('keydown',_cancelSpreadKD);
  document.removeEventListener('contextmenu',_cancelSpreadCM);
  clearSelectable(); _spreadTargetPending=false;
  if(G.phase==='reward'){
    renderRewCards(); renderFieldEditor(); renderMoveSlotsInEnemy(); setHint('報酬を獲得してください');
  } else {
    renderHand(); setHint('行動を終えたらターン終了してください。');
  }
}
function _cancelSpreadKD(e){ if(e.key==='Escape') _cancelSpread(); }
function _cancelSpreadCM(e){ e.preventDefault(); _cancelSpread(); }
function _addSpreadCancelListeners(){
  document.removeEventListener('keydown',_cancelSpreadKD);
  document.removeEventListener('contextmenu',_cancelSpreadCM);
  document.addEventListener('keydown',_cancelSpreadKD);
  document.addEventListener('contextmenu',_cancelSpreadCM);
}
// 後方互換
function escCancel(e){ if(e.key==='Escape') _cancelPick(); }

// 拡散の杖：対象選択が必要な右隣杖のためのピッカー
function _pickForSpread(rw,rightIdx){
  setHint(`拡散：${rw.name}の対象を選択（ESC or 右クリックでキャンセル）`);
  const applyFn=tgt=>applySpell(rw,rightIdx,tgt,true); // _noDecrement=true：右隣杖のチャージ消費なし
  if(rw.needsAny){
    document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.allies[i]&&G.allies[i].hp>0){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'ally',idx:i}); }; }
    });
    document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.enemies[i]&&G.enemies[i].hp>0&&!slot.classList.contains('has-move')){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'enemy',idx:i}); }; }
    });
  } else if(rw.needsEnemy){
    const _charmML=rw.effect==='charm'?(G.magicLevel||1):null;
    if(G.phase==='reward'){
      document.querySelectorAll('[data-rew-idx]').forEach(slot=>{
        const ri=parseInt(slot.dataset.rewIdx);
        const c=_rewCards[ri];
        if(!c||!c._isChar||c.hp<=0) return;
        if(_charmML!==null&&c.atk>_charmML){ slot.classList.add('bless-blocked'); return; }
        slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'rew-char',idx:ri}); };
      });
    } else {
      document.getElementById('f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
        const u=G.enemies[i]; if(!u||u.hp<=0||slot.classList.contains('has-move')) return;
        if(u.keywords&&u.keywords.includes('加護')){ slot.classList.add('bless-blocked'); return; }
        if(_charmML!==null&&u.atk>_charmML){ slot.classList.add('bless-blocked'); return; }
        slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'enemy',idx:i}); };
      });
    }
  } else if(rw.needsAlly){
    document.getElementById('f-ally').querySelectorAll('.slot').forEach((slot,i)=>{
      if(G.allies[i]&&G.allies[i].hp>0){ slot.classList.add('selectable'); slot.onclick=()=>{ clearSelectable(); applyFn({who:'ally',idx:i}); }; }
    });
  }
  _addSpreadCancelListeners();
}

function clearSelectable(){
  document.querySelectorAll('.selectable').forEach(s=>{ s.classList.remove('selectable'); s.onclick=null; });
  document.querySelectorAll('.bless-blocked').forEach(s=>s.classList.remove('bless-blocked'));
}

function applySpell(sp,idx,tgt,_noDecrement){
  clearSelectable();
  log(`→ ${sp.name} を使用`,'em');

  // 触媒の指輪：杖の効果が2倍
  const catRingC=G.rings.find(r=>r&&r.unique==='catalyst_ring');
  const cMult=(sp.type==='wand'&&catRingC)?2:1;
  const _inReward=G.phase==='reward';
  _spreadTargetPending=false;
  let _spreadPick=null;
  // インキュバス：アイテム使用時、効果処理の前にナイトメアを召喚
  if(sp.type==='consumable'){
    G.allies.forEach(ic=>{
      if(!ic||ic.hp<=0||ic.effect!=='incubus_spell') return;
      const _nmDef={id:'c_nightmare',name:'ナイトメア',race:'悪魔',grade:1,atk:3,hp:1,cost:0,unique:false,icon:'😱',desc:''};
      const _nm=makeUnitFromDef(_nmDef);
      const _ei=G.allies.findIndex(a=>!a||a.hp<=0);
      if(_ei>=0){ G.allies[_ei]=_nm; log(`${ic.name}：ナイトメア(4/1)を召喚`,'good'); }
    });
  }
  switch(sp.effect){
    case 'fire':{
      const fd=G.magicLevel||1;
      if(tgt.who==='ally'){
        const a=G.allies[tgt.idx];
        if(a){ log(`炎の杖：${a.name}に${fd}ダメ`,'good'); dealDmgToAlly(a,fd,tgt.idx,null); }
      } else if(tgt.who==='rew-char'){
        const c=_rewCards[tgt.idx]; if(c){ log(`炎の杖：${c.name}に${fd}ダメ`,'good'); dealDmgToRewChar(tgt.idx,fd); }
      } else {
        const e=G.enemies[tgt.idx]; dealDmgToEnemy(e,fd,tgt.idx); log(`炎の杖：${e.name}に${fd}ダメ`,'good');
      }
    break;}
    case 'hate':{
      if(tgt.who==='ally'){
        G.allies.forEach(a=>{ if(a) a.hate=false; });
        const a=G.allies[tgt.idx];
        if(a){ a.hate=true; a.hateTurns=99; log(`${a.name}に標的付与（敵が優先的に狙う）`,'good'); }
      } else if(tgt.who==='rew-char'){
        const c=_rewCards[tgt.idx]; if(c){ log(`${c.name}を優先ターゲットに設定`,'good'); }
      } else {
        G.enemies.forEach(e=>{ if(e) e.allyTarget=false; });
        const e=G.enemies[tgt.idx];
        if(e){ e.allyTarget=true; log(`${e.name}を強制ターゲットに設定（味方が優先的に狙う）`,'good'); }
      }
    break;}
    case 'double_hp':{ const a=G.allies[tgt.idx]; if(a){ a.hp*=2; a.maxHp*=2; log(`${a.name} HP×2→${a.hp}`,'good'); } break;}
    case 'swap_all':{
      // 死亡ユニットを除いてATK/HP入れ替え
      const _swapTargets=_inReward
        ?[...G.allies,..._rewCards.filter(c=>c&&c._isChar)]
        :[...G.allies,...G.enemies];
      _swapTargets.forEach(u=>{
        if(!u||u.hp<=0) return;
        const t=u.atk; u.atk=u.hp; u.hp=Math.max(1,t); u.maxHp=Math.max(u.maxHp,u.hp);
      });
      // 入れ替え後に狼オーラを再付与
      G.rings.forEach(r=>{
        if(!r||r.unique!=='wolf_aura') return;
        if(G.allies.some(a=>a&&a.hp>0&&a.ringId===r.id)){
          const bonus=r.grade||1;
          G.allies.forEach(a=>{ if(a&&a.hp>0) a.atk+=bonus; });
        }
      });
      log('全キャラATK/HP入れ替え','sys');
    break;}
    case 'nullify':{
      if(tgt.who==='rew-char'){ const rc=_rewCards[tgt.idx]; if(rc) log(`${rc.name}：報酬フェイズ中は沈黙効果なし`,'sys'); }
      else { const nu=G.enemies[tgt.idx]; if(nu){ nu.nullified=1; log(`${nu.name} 沈黙1T`,'good'); } }
    break;}
    case 'weaken':{
      const wu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(wu){
        wu._weakenedSavedAtk=wu.atk; // 元のATKを保存
        wu.atk=0;                     // 表示ATKを0に
        wu.nullified=1;
        log(`${wu.name} 脱力1T（ATK→0）`,'good');
      }
    break;}
    case 'stealth':{ const sa=G.allies[tgt.idx]; if(sa){ sa.stealth=true; log(`${sa.name}に隠密付与`,'good'); } break;}
    case 'poison_wand':{
      const pv=G.magicLevel||1;
      if(tgt.who==='rew-char'){ const rc=_rewCards[tgt.idx]; if(rc){ rc.poison=(rc.poison||0)+pv; log(`${rc.name}に毒+${pv}付与`,'good'); dealDmgToRewChar(tgt.idx,pv); } }
      else { const pe=G.enemies[tgt.idx]; if(pe){ pe.poison=(pe.poison||0)+pv; log(`${pe.name}に毒+${pv}付与（毒${pe.poison}）`,'good'); } }
    break;}
    case 'sacrifice':{
      const si=tgt.idx;
      const sa2=G.allies[si]; if(!sa2) break;
      const dmg=sa2.atk;
      sa2.hp=0;
      processAllyDeath(sa2);
      log(`犠牲：${sa2.name}を破壊、全敵に${dmg}ダメ`,'good');
      G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dmg,ei); });
    break;}
    case 'boost_atk':{ const ba=G.allies[tgt.idx]; if(ba){ const bav=(G.magicLevel||1)+(G.hasGoldenDrop?1:0); ba.atk+=bav; ba.baseAtk=(ba.baseAtk||0)+bav; log(`${ba.name}：ATK+${bav}`,'good'); triggerDryadBuff(); } break;}
    case 'swap_pos':{
      if(!tgt||tgt.who!=='pair') break;
      const {idx1,idx2,team}=tgt;
      const _swapArr=team==='enemy'?G.enemies:G.allies;
      const tmp=_swapArr[idx1]; _swapArr[idx1]=_swapArr[idx2]; _swapArr[idx2]=tmp;
      log(`転移：${team==='enemy'?'敵':'味方'}スロット${idx1+1}↔${idx2+1}を入れ替え`,'good');
    break;}
    case 'doom':{ const dd=G.magicLevel||1;
      if(_inReward){ _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,dd); }); log(`破滅の杖：全報酬キャラに${dd}ダメ`,'good'); }
      else { G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dd,ei); }); log(`破滅の杖：全敵に${dd}ダメ`,'good'); }
    break;}
    case 'possess':{
      const pi=tgt.idx;
      const pa=G.allies[pi]; if(!pa) break;
      if(_inReward){
        // 報酬フェーズ：最もパワーの低い報酬キャラと入れ替え
        const rewLive=_rewCards.map((c,ri)=>({c,ri})).filter(({c})=>c&&c._isChar&&c.hp>0);
        if(!rewLive.length) break;
        const weakR=rewLive.reduce((m,x)=>x.c.atk<m.c.atk?x:m,rewLive[0]);
        const newAlly=makeUnitFromDef(weakR.c);
        // 仲間→報酬スロット、報酬キャラ→仲間フィールド
        G.allies[pi]=newAlly;
        _rewCards[weakR.ri]=Object.assign(clone(pa),{_isChar:true,_buyPrice:pa.cost||2});
        log(`憑依：${pa.name}⟺${weakR.c.name}（報酬枠${weakR.ri}）`,'good');
        // 召喚時効果（使役）
        applyUnitSummonEffect(newAlly, null);
        renderRewCards(); renderAll();
      } else {
        const liveE=G.enemies.map((e,i)=>({e,i})).filter(x=>x.e&&x.e.hp>0);
        if(!liveE.length) break;
        const weakE=liveE.reduce((m,x)=>x.e.atk<m.e.atk?x:m,liveE[0]);
        const ei=weakE.i;
        // チーム間で入れ替え：味方→敵陣、敵→味方陣
        G.allies[pi]=weakE.e;
        G.enemies[ei]=pa;
        log(`憑依：${pa.name}(${pi+1})⟺${weakE.e.name}(${ei+1})`,'good');
        // 召喚時効果（使役）
        applyUnitSummonEffect(weakE.e, null);
      }
    break;}
    case 'battle_start_book':{ log('開幕の書：戦闘開始時効果を発動','good'); onBattleStart(); break;}
    case 'magic_book':{ G.magicLevel=(G.magicLevel||0)+1*cMult; log(`叡智の薬：魔術レベル+${1*cMult}（現在${G.magicLevel}）`,'good'); break;}
    case 'magic_book_3':{ G.magicLevel=(G.magicLevel||0)+3*cMult; log(`賢者の秘薬：魔術レベル+${3*cMult}（現在${G.magicLevel}）`,'good'); break;}
    case 'sacrifice_doll':{
      if(!tgt) break;
      if(tgt.who==='rew-char'){
        const rc=_rewCards[tgt.idx]; if(!rc) break;
        _rewCards[tgt.idx]=null; log(`破壊の巻物：${rc.name}を破壊`,'good');
        renderRewCards();
      } else {
        const sdu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
        if(!sdu) break;
        if(tgt.who==='enemy'){
          if(sdu.boss){ log('破壊の巻物：ボスには効果がない','sys'); break; }
          if(sdu.keywords&&sdu.keywords.includes('エリート')){ log('破壊の巻物：エリートには効果がない','sys'); break; }
          sdu.hp=0; processEnemyDeath(sdu,tgt.idx);
        } else G.allies[tgt.idx]=null;
        log(`破壊の巻物：${sdu.name}を破壊`,'good');
      }
    break;}
    case 'swap_stats':{
      if(!tgt) break;
      const ssu=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx];
      if(!ssu) break;
      const sst=ssu.atk; ssu.atk=ssu.hp; ssu.hp=Math.max(1,sst); ssu.maxHp=Math.max(ssu.maxHp,ssu.hp);
      log(`混乱の杖：${ssu.name} ATK↔HP（${ssu.atk}/${ssu.hp}）`,'good');
    break;}
    case 'counter_scroll':{
      const csa=G.allies[tgt.idx];
      if(csa){ csa.counter=true; log(`無力化の巻物：${csa.name}に反撃付与`,'good'); }
    break;}
    case 'purify_hate':{
      if(!tgt) break;
      const phu=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
      if(phu){ phu.poison=0; log(`浄化の薬：${phu.name}の毒を消した`,'good'); }
    break;}
    case 'boost':{ const a=G.allies[tgt.idx]; if(a){ const bv=(G.magicLevel||1)+(G.hasGoldenDrop?1:0); a.atk+=bv; a.baseAtk=(a.baseAtk||0)+bv; log(`${a.name}：ATK+${bv}`,'good'); triggerDryadBuff(); } break;}
    case 'rally':{ G.allies.forEach(a=>{ if(a&&a.hp>0) a.atk=Math.round(a.atk*1.2); }); log('全仲間ATK×1.2','good'); break;}
    case 'heal_ally':{ G.allies.forEach(a=>{ if(a&&a.hp>0) a.hp=a.maxHp; }); log('全仲間HP全回復','good'); break;}
    case 'seal':{
      if(tgt.who==='rew-char'){ const rc=_rewCards[tgt.idx]; if(rc) log(`${rc.name}：報酬フェイズ中は封印効果なし`,'sys'); }
      else { const su=G.enemies[tgt.idx]; if(su){ su.sealed=1; log(`${su.name} 封印1T`,'good'); } }
    break;}
    case 'spread':{
      const rightIdx=idx+1;
      const rw=(rightIdx<(G.handSlots||5))?G.spells[rightIdx]:null;
      if(rw&&rw.type==='wand'&&(rw.usesLeft===undefined||rw.usesLeft>0)){
        log(`拡散：${rw.name}を発動`,'sys');
        if(!rw.needsEnemy&&!rw.needsAlly&&!rw.needsAny){
          G.actionsLeft++; // 内部呼出のデクリメントを補償
          applySpell(rw,rightIdx,null,true); // _noDecrement=true：右隣杖のチャージ消費なし
        } else {
          // 対象選択が必要な場合：renderAll後にピッカーを起動
          _spreadTargetPending=true;
          _spreadPick=()=>_pickForSpread(rw,rightIdx);
        }
      } else {
        log('拡散：右隣に有効な杖がない','sys');
      }
    break;}
    case 'instakill':{
      if(tgt){
        const iku=tgt.who==='ally'?G.allies[tgt.idx]:G.enemies[tgt.idx];
        if(iku&&iku.hp>0){
          if(!iku.keywords) iku.keywords=[];
          if(!iku.keywords.includes('即死')) iku.keywords.push('即死');
          log(`禁呪の薬：${iku.name}に即死を付与`,'good');
        }
      }
    break;}
    case 'growth_grant':{
      const gga=G.allies[tgt.idx];
      if(gga){
        if(!gga.keywords) gga.keywords=[];
        const _gi=gga.keywords.findIndex(k=>/^成長\d+$/.test(k));
        if(_gi>=0){ const _gv=parseInt(gga.keywords[_gi].slice(2)); gga.keywords[_gi]=`成長${_gv+3}`; }
        else gga.keywords.push('成長3');
        log(`成長の薬：${gga.name}に成長3を付与`,'good');
      }
    break;}
    case 'golem':{
      if(G.allies.filter(a=>a&&a.hp>0).length<6){
        const gl=G.magicLevel||1;
        const golem={id:uid(),name:'ゴーレム',icon:'🗼',atk:gl,baseAtk:gl,hp:gl,maxHp:gl,
          ringId:'w_golem',ringIdx:-1,hate:false,hateTurns:0,instadead:false,sealed:0,nullified:0,
          enchants:[],regen:false,regenUsed:false,onDeath:undefined,onHit:undefined,
          taunt50:false,guardian:false,unique:undefined,keywords:['アーティファクト'],poison:0,shield:0,_dp:false};
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot>=0) G.allies[emptySlot]=golem;
        else if(G.allies.length<6) G.allies.push(golem);
        log(`🗼 ゴーレム（${gl}/${gl}）を召喚`,'good');
      }
    break;}
    case 'meteor':{
      if(_inReward){
        _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,1); });
      } else {
        G.enemies.forEach((e,i)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,1,i); });
      }
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0) dealDmgToAlly(a,1,ai,null); });
      log('☄ 隕石の杖：全キャラに1ダメ','bad');
    break;}
    case 'meteor_multi':{
      const ml=G.magicLevel||1;
      const _hits=ml*cMult;
      if(_inReward){
        for(let _mi=0;_mi<_hits;_mi++){
          const liveR=_rewCards.map((c,ri)=>({c,ri})).filter(({c})=>c&&c._isChar&&c.hp>0);
          if(!liveR.length) break;
          const {ri}=randFrom(liveR);
          dealDmgToRewChar(ri,ml);
        }
        log(`☄ 隕石の杖：ランダムな報酬キャラに${ml}ダメ×${_hits}回`,'good');
      } else {
        for(let _mi=0;_mi<_hits;_mi++){
          const liveE=G.enemies.filter(e=>e&&e.hp>0);
          if(!liveE.length) break;
          const mt=randFrom(liveE);
          dealDmgToEnemy(mt,ml,G.enemies.indexOf(mt));
        }
        log(`☄ 隕石の杖：ランダムな敵に${ml}ダメ×${_hits}回`,'good');
      }
    break;}
    case 'shield_wand':{
      const sw=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='rew-char'?_rewCards[tgt.idx]:G.enemies[tgt.idx];
      if(sw){ sw.shield=(sw.shield||0)+1; log(`光輝の杖：${sw.name}にシールドを付与`,'good'); }
    break;}
    case 'growth_wand':{
      const gwA=G.allies[tgt.idx];
      if(gwA){
        if(!gwA.keywords) gwA.keywords=[];
        const gwV=(G.magicLevel||1)*cMult;
        const gwI=gwA.keywords.findIndex(k=>/^成長\d+$/.test(k));
        if(gwI>=0){ const _v=parseInt(gwA.keywords[gwI].slice(2)); gwA.keywords[gwI]=`成長${_v+gwV}`; }
        else gwA.keywords.push(`成長${gwV}`);
        log(`成長の杖：${gwA.name}に成長${gwV}を付与`,'good');
      }
    break;}
    case 'bomb':{ const dmg=(_inReward?(_rewCards.find(c=>c&&c._isChar)?.grade||1):(G.enemies[0]?.grade||1))*5*cMult;
      if(_inReward){ _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,dmg); }); log(`全体爆弾 全報酬キャラに${dmg}ダメ`+(cMult>1?' [×2]':''),'bad'); }
      else { G.enemies.forEach((e,i)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,dmg,i); }); log(`全体爆弾 全敵に${dmg}ダメ`+(cMult>1?' [×2]':''),'bad'); }
    break;}
    case 'revive':{ if(G.lastDead){ const c=clone(G.lastDead); c.hp=Math.min(Math.floor(c.maxHp*.5*cMult),c.maxHp); c.id=uid(); const s=G.allies.findIndex(a=>!a||a.hp<=0); if(s>=0) G.allies[s]=c; else if(G.allies.length<6) G.allies.push(c); log(`${c.name} 復活！`+(cMult>1?' [HP×2]':''),'good'); } else log('復活対象なし'); break;}
    case 'big_rally':{ const rbonus=5*cMult; G.allies.forEach(a=>{ if(a&&a.hp>0){ a.maxHp+=rbonus; a.hp+=rbonus; } }); log(`鼓舞の巻物：全仲間HP+${rbonus}！`+(cMult>1?' [×2]':''),'good'); break;}
    case 'reiki_herb':{
      const _ru=tgt.who==='ally'?G.allies[tgt.idx]:tgt.who==='enemy'?G.enemies[tgt.idx]:(tgt.who==='rew-char'?_rewCards[tgt.idx]:null);
      if(_ru&&_ru.hp>0){
        _ru.hp+=3; _ru.maxHp+=3;
        log(`治癒の薬：${_ru.name}に±0/+3`,'good');
        if(!_inReward) triggerDryadBuff();
      }
    break;}
    case 'gold_8':{ G.gold+=8*cMult; log(`ソウル+${8*cMult}`+(cMult>1?' [×2]':''),'gold'); break;}
    case 'soul_dregs':{
      // G4以下の契約を1つ選んでグレードを次の戦闘終了まで+1
      const eligible=G.rings.filter(r=>r&&(r.grade||1)<MAX_GRADE);
      if(!eligible.length){ log('魂の残滓：グレードを上げられる契約がない','sys'); break; }
      if(eligible.length===1){
        eligible[0].grade++;
        eligible[0]._tempGrade=true;
        log(`💀 魂の残滓：${eligible[0].name} グレード+1（次の戦闘終了まで）`,'good');
      } else {
        // 複数ある場合は選択UI（arcana-pick-overlayを再利用）
        _arcanaPickTarget('魂の残滓', eligible.map(r=>({...r,_isRing:true})), (target)=>{
          const ring=G.rings.find(r=>r&&r.id===target.id);
          if(ring){ ring.grade++; ring._tempGrade=true; log(`💀 魂の残滓：${ring.name} グレード+1（次の戦闘終了まで）`,'good'); }
        });
      }
    break;}
    case 'soul_income':{ G._soulIncomeBonus=(G._soulIncomeBonus||0)+1; log(`魔神の秘薬：戦闘終了時ソウル獲得+1（現在+${G._soulIncomeBonus}）`,'good'); break;}
    case 'bonus_action_herb':{ G._bonusAction=(G._bonusAction||0)+1; G.actionsPerTurn=calcActions(); log(`聖王の秘薬：行動回数+1（現在${G.actionsPerTurn}行動/ターン）`,'good'); break;}
    case 'shield_ally':{ const a=G.allies[tgt.idx]; if(a){ if(!a.shield) a.shield=1; log(`🛡 ${a.name}にシールドを付与`,'good'); } break;}
    case 'copy_scroll':{
      const _cwSrc=(G.bossHand||[]).filter(s=>s&&s.type==='wand');
      if(!_cwSrc.length){ log('複製の巻物：敵の手札に杖がない','sys'); break; }
      if(G.spells.filter(s=>s).length>=(G.handSlots||5)){ log('手札が満杯','bad'); break; }
      const picked=randFrom(_cwSrc);
      const pw=clone(picked); pw.usesLeft=pw.baseUses||3; pw._maxUses=pw.usesLeft;
      for(let j=0;j<(G.handSlots||5);j++){ if(!G.spells[j]){ G.spells[j]=pw; break; } }
      log(`📜 複製の巻物：${pw.name} を入手`,'good');
    break;}
    case 'destroy_scroll':{
      const _dwSrc=(G.bossHand||[]).filter(s=>s);
      if(!_dwSrc.length){ log('破壊の巻物：敵の手札がない','sys'); break; }
      const dw=randFrom(_dwSrc);
      G.bossHand.splice(G.bossHand.indexOf(dw),1);
      G.gold+=3; updateHUD();
      const rwg=document.getElementById('rw-gold'); if(rwg) rwg.textContent=G.gold;
      log(`🔥 破壊の巻物：敵の「${dw.name}」を破壊してソウル+3`,'gold');
    break;}
    case 'flash_blade':{
      // 全キャラに1ダメージ（報酬フェイズ：仲間＋報酬キャラ、戦闘：仲間＋全敵）
      G.allies.forEach((a,ai)=>{ if(a&&a.hp>0) dealDmgToAlly(a,1,ai,null); });
      if(_inReward){
        _rewCards.forEach((c,ri)=>{ if(c&&c._isChar&&c.hp>0) dealDmgToRewChar(ri,1); });
      } else {
        G.enemies.forEach((e,ei)=>{ if(e&&e.hp>0) dealDmgToEnemy(e,1,ei); });
      }
      log('⚡ 閃刃の杖：全キャラに1ダメ','bad');
    break;}
    case 'charm':{
      if(!tgt) break;
      const ml=G.magicLevel||1;
      if(tgt.who==='rew-char'){
        const rc=_rewCards[tgt.idx];
        if(!rc||!rc._isChar||rc.hp<=0) break;
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot<0){ log('魅了の杖：盤面が満杯','bad'); break; }
        const charmed=makeUnitFromDef(rc);
        G.allies[emptySlot]=charmed;
        _rewCards[tgt.idx]=null;
        log(`✨ 魅了の杖：${rc.name}(ATK${rc.atk}≤${ml})を仲間にした！`,'good');
        if(typeof squirrelSay==='function') squirrelSay('提示カードのコントロールを得た時');
        renderRewCards();
      } else if(tgt.who==='enemy'){
        const e=G.enemies[tgt.idx];
        if(!e||e.hp<=0) break;
        const emptySlot=G.allies.findIndex(a=>!a||a.hp<=0);
        if(emptySlot<0){ log('魅了の杖：盤面が満杯','bad'); break; }
        G.allies[emptySlot]=e;
        G.enemies[tgt.idx]=null;
        log(`✨ 魅了の杖：${e.name}(ATK${e.atk}≤${ml})を仲間にした！`,'good');
      }
    break;}
  }

  if(sp.type==='consumable') G.spells[idx]=null;

  // 杖使用トリガー
  if(sp.type==='wand'){ onSpellUsed(); onWandUsed(); }

  // 使用回数管理
  if(sp.type==='wand'){
    if(sp.usesLeft===undefined) sp.usesLeft=1; // fallback
    const manaCycle=G.rings.find(r=>r&&r.unique==='mana_cycle');
    let skipDecrement=false;
    // _noDecrement=true（拡散の内部呼び出し等）の場合はmana_cycleを消費しない
    if(!_noDecrement&&manaCycle&&!G._manaCycleUsed){ G._manaCycleUsed=true; skipDecrement=true; log(`魔導の指輪：最初の杖のチャージ消費をスキップ`,'sys'); }
    if(!_noDecrement&&!skipDecrement){
      sp.usesLeft--;
      if(sp.usesLeft<=0){
        log(`${sp.name}のチャージが切れた`,'sys');
        // アラクネ：杖が壊れた時、魔術レベル+1
        if(G.allies&&G.allies.some(a=>a&&a.hp>0&&a.effect==='arachne_wand')){
          if(typeof onMagicLevelUp==='function') onMagicLevelUp(1+(G.hasGoldenDrop?1:0));
        }
        G.spells[idx]=null;
      }
    }
  }

  if(!_spreadTargetPending){ G.actionsLeft--; if(G._debugMode) G.actionsLeft=G.actionsPerTurn; }
  // ヘルハウンド：アイテム（消耗品）使用時のみランダムな敵を攻撃（杖は対象外）
  if(sp.type==='consumable'){
    G.allies.forEach(hh=>{
      if(!hh||hh.hp<=0||hh.effect!=='hellhound_spell') return;
      const _liveE=G.enemies.filter(e=>e&&e.hp>0);
      if(!_liveE.length) return;
      const _ht=randFrom(_liveE);
      dealDmgToEnemy(_ht,hh.atk,G.enemies.indexOf(_ht),hh);
      log(`${hh.name}：アイテム使用→${_ht.name}に${hh.atk}ダメ`,'good');
    });
    // ダークワン：アイテム使用時、全仲間の悪魔+1/+1
    { const _dkv=1+(G.hasGoldenDrop?1:0);
      let _dkTriggered=false;
      G.allies.forEach(dk=>{ if(dk&&dk.hp>0&&dk.effect==='darkone_spell'){ _dkTriggered=true; }});
      if(_dkTriggered){ G.allies.forEach(a=>{ if(a&&a.hp>0&&a.race==='悪魔'){ a.atk+=_dkv; a.baseAtk=(a.baseAtk||0)+_dkv; a.hp+=_dkv; a.maxHp+=_dkv; }}); log(`ダークワン：アイテム使用→全仲間の悪魔+${_dkv}/+${_dkv}`,'good'); }
    }
  }
  syncHarpyAtk(); // magic_book等で魔術レベルが変化した場合にATKを更新
  renderAll();
  if(!_inReward&&checkInstantVictory()) return;
  if(_inReward){
    // 報酬フェイズ：renderAll()が上書きした各UIを復元してから、必要なら拡散ピッカーを起動
    setHint('報酬を獲得してください');
    renderRewCards();
    renderFieldEditor();      // f-ally還魂ボタン＋hand-slots廃棄ボタンを復元
    renderMoveSlotsInEnemy(); // f-enemyの移動マスを復元
    if(_spreadPick) _spreadPick(); // 拡散対象選択：報酬UI復元後に起動
    return;
  }
  if(_spreadPick){ _spreadPick(); return; } // 拡散対象選択：renderAll後にピッカー起動
  const hasUsable=G.spells.some(s=>s&&(s.type==='consumable'||(s.type==='wand'&&(s.usesLeft===undefined||s.usesLeft>0))));
  if(G.actionsLeft<=0&&!G._debugMode){
    setHint('行動終了。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else if(!hasUsable&&!G._debugMode){
    setHint('使用できる魔法がありません。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else {
    setHint('あと'+G.actionsLeft+'回行動できます');
  }
}
