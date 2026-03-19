// ═══════════════════════════════════════
// spell.js — 魔法使用ロジック
// 依存: constants.js, state.js, battle.js, render.js, summon.js
// ═══════════════════════════════════════

let _tgtCtx=null;

function useSpell(idx){
  const sp=G.spells[idx];
  if(!sp||G.actionsLeft<=0) return;
  if(sp.type==='wand'&&sp.usesLeft<=0) return; // チャージ切れ
  if(sp.needsAlly) pickTarget('ally',idx);
  else if(sp.needsEnemy){
    if(G.spreadActive) applySpell(sp,idx,null);
    else pickTarget('enemy',idx,true); // 加護チェックあり
  } else applySpell(sp,idx,null);
}

function pickTarget(who,idx,checkBless){
  _tgtCtx={who,idx};
  setHint(`対象を選択（ESCでキャンセル）`);
  const units=who==='ally'?G.allies:G.enemies;
  document.getElementById(who==='ally'?'f-ally':'f-enemy').querySelectorAll('.slot').forEach((slot,i)=>{
    const u=units[i];
    if(u&&u.hp>0&&!slot.classList.contains('has-move')){
      // 加護：杖の効果対象にならない
      if(checkBless&&who==='enemy'&&u.keywords&&u.keywords.includes('加護')){
        slot.classList.add('empty'); // グレーアウト表示
        return;
      }
      slot.classList.add('selectable');
      slot.onclick=()=>{ clearSelectable(); applySpell(G.spells[idx],idx,{who,idx:i}); };
    }
  });
  document.addEventListener('keydown',escCancel,{once:true});
}

function escCancel(e){ if(e.key==='Escape'){ clearSelectable(); renderHand(); setHint('魔法カードを使うかパスしてください'); } }
function clearSelectable(){ document.querySelectorAll('.selectable').forEach(s=>{ s.classList.remove('selectable'); s.onclick=null; }); }

function applySpell(sp,idx,tgt){
  clearSelectable();
  log(`→ ${sp.name} を使用`,'em');
  const spread=G.spreadActive&&sp.needsEnemy;

  const g=sp.grade||1;
  switch(sp.effect){
    case 'fire':{
      const dmg=2*g;
      if(spread){ G.enemies.forEach((e,i)=>{ if(e.hp>0) dealDmgToEnemy(e,dmg,i); }); log(`炎（拡散）全敵に${dmg}ダメ`,'good'); }
      else { const e=G.enemies[tgt.idx]; dealDmgToEnemy(e,dmg,tgt.idx); log(`炎の杖：${e.name}に${dmg}ダメ`,'good'); }
    break;}
    case 'hate':{ G.allies.forEach(a=>a.hate=false); const a=G.allies[tgt.idx]; a.hate=true; a.hateTurns=99; log(`${a.name}にヘイト（戦闘終了まで）`); break;}
    case 'double_hp':{ const a=G.allies[tgt.idx]; a.hp*=2; a.maxHp*=2; log(`${a.name} HP×2→${a.hp}`,'good'); break;}
    case 'swap_all':{ [...G.allies,...G.enemies].forEach(u=>{ const t=u.atk; u.atk=u.hp; u.hp=Math.max(1,t); u.maxHp=Math.max(u.maxHp,u.hp); }); log('全キャラATK/HP入れ替え','sys'); break;}
    case 'nullify':{
      if(spread){ G.enemies.forEach(e=>{ if(e.hp>0) e.nullified=1; }); log('沈黙（拡散）全敵','good'); }
      else { G.enemies[tgt.idx].nullified=1; log(`${G.enemies[tgt.idx].name} 沈黙1T`,'good'); }
    break;}
    case 'boost':{ const a=G.allies[tgt.idx]; const br=0.5*g; a.atk=Math.round(a.atk*(1+br)); a.hp=Math.min(Math.round(a.hp+a.maxHp*br),Math.round(a.maxHp*(1+br))); log(`${a.name} ATK/HP+${Math.round(br*100)}%`,'good'); break;}
    case 'rally':{ const rr=0.3*g; G.allies.forEach(a=>{ a.atk=Math.round(a.atk*(1+rr)); }); log(`全仲間ATK+${Math.round(rr*100)}%`,'good'); break;}
    case 'heal_ally':{ const a=G.allies[tgt.idx]; const h=Math.round(a.maxHp*.3*g); a.hp=Math.min(a.hp+h,a.maxHp); log(`${a.name} HP+${h}`,'good'); break;}
    case 'seal':{
      if(spread){ G.enemies.forEach(e=>{ if(e.hp>0) e.sealed=1; }); log('封印（拡散）全敵','good'); }
      else { G.enemies[tgt.idx].sealed=1; log(`${G.enemies[tgt.idx].name} 封印1T`,'good'); }
    break;}
    case 'spread':{
      G.spreadMult=sp.grade||1; // Grade+1回発動 = Grade回追加
      log(`拡散：もう一方の杖が${G.spreadMult+1}回発動するようになる`,'sys');
    break;}
    case 'instakill':{
      // 付与されたキャラを攻撃したユニットが即死
      if(tgt){
        const all=[...G.allies,...G.enemies];
        const tu=all[tgt.idx]||G.enemies[tgt.idx]||G.allies[tgt.idx];
        // needsAny: can target any
        const target=G.enemies[tgt.idx]||G.allies[tgt.idx];
        if(target){ target.instadead=true; log(`${target.name}に即死付与（攻撃したユニットが即死）`,'good'); }
      }
    break;}
    case 'golem':{
      if(G.allies.filter(a=>a.hp>0).length<6){
        const gAtk=Math.round(10*g), gHp=Math.round(10*g);
        const golem={id:uid(),name:'ゴーレム',icon:'🗼',atk:gAtk,baseAtk:gAtk,hp:gHp,maxHp:gHp,
          ringId:'w_golem',ringIdx:-1,hate:true,hateTurns:99,instadead:false,sealed:0,nullified:0,
          enchants:[],regen:false,onDeath:undefined,onHit:undefined,taunt50:false,guardian:false,unique:undefined};
        const emptySlot=G.allies.findIndex(a=>a.hp<=0);
        if(emptySlot>=0) G.allies[emptySlot]=golem;
        else if(G.allies.length<6) G.allies.push(golem);
        log(`🗼 ゴーレム（${gAtk}/${gHp}・ヘイト）を召喚`,'good');
      }
    break;}
    case 'meteor':{
      const mDmg=3*g;
      const mHits=2;
      for(let mi=0;mi<mHits;mi++){
        const all=[...G.enemies.filter(e=>e.hp>0),...G.allies.filter(a=>a.hp>0)];
        if(!all.length) break;
        const mt=randFrom(all);
        const isEnemy=G.enemies.includes(mt);
        if(isEnemy) dealDmgToEnemy(mt,mDmg,G.enemies.indexOf(mt));
        else { mt.hp=Math.max(0,mt.hp-mDmg); log(`☄ 隕石：${mt.name}に${mDmg}ダメ`,'bad'); }
      }
      log(`☄ 隕石の杖：${mHits}回ランダムに${mDmg}ダメ`,'bad');
    break;}
    case 'bomb':{ const dmg=(G.enemies[0]?.grade||1)*5; G.enemies.forEach((e,i)=>{ if(e.hp>0) dealDmgToEnemy(e,dmg,i); }); log(`全体爆弾 全敵に${dmg}ダメ`,'bad'); break;}
    case 'revive':{ if(G.lastDead){ const c=clone(G.lastDead); c.hp=Math.floor(c.maxHp*.5); c.id=uid(); const s=G.allies.findIndex(a=>a.hp<=0); if(s>=0) G.allies[s]=c; else if(G.allies.length<6) G.allies.push(c); log(`${c.name} 復活！`,'good'); } else log('復活対象なし'); break;}
    case 'big_rally':{ G.allies.forEach(a=>{ a.atk*=2; a.maxHp*=2; a.hp=Math.min(a.hp*2,a.maxHp); }); log('鼓舞の旗：全仲間+100%！','good'); break;}
    case 'gold_8':{ G.gold+=8; log('金+8','gold'); break;}
  }

  if(sp.effect!=='spread') G.spreadActive=false;
  if(sp.type==='consumable') G.spells[idx]=null;

  // 石像の指輪：杖使用トリガー
  if(sp.type==='wand'||sp.type==='consumable') onSpellUsed();

  // 拡散の杖：もう一方の杖をspreadMult回追加発動
  if(sp.effect!=='spread'&&G.spreadMult>0){
    const otherIdx=idx===0?1:0;
    const other=G.spells[otherIdx];
    if(other&&other.type==='wand'&&other.usesLeft>0){
      for(let si=0;si<G.spreadMult;si++){
        if(other.usesLeft<=0) break;
        log(`拡散発動：${other.name}を追加実行（${si+1}/${G.spreadMult}）`,'sys');
        // re-invoke without target for non-targeted, or skip targeted
        if(!other.needsEnemy&&!other.needsAlly&&!other.needsAny) applySpell(other,otherIdx,null);
      }
    }
    G.spreadMult=0;
  }

  // 使用回数管理
  if(sp.type==='wand'){
    if(sp.usesLeft===undefined) sp.usesLeft=1; // fallback
    if(sp.effect!=='spread') sp.usesLeft--;
    if(sp.usesLeft<=0){ log(`${sp.name}のチャージが切れた`,'sys'); G.spells[idx]=null; }
  }

  G.actionsLeft--;
  renderAll();
  if(checkInstantVictory()) return;
  if(G.actionsLeft<=0){
    setHint('行動終了。自動でターンを終了します...');
    setTimeout(()=>{ if(G.phase==='player') playerPass(); },500);
  } else {
    const hasUsable=G.spells.some(sp=>sp&&(sp.type==='consumable'||(sp.type==='wand'&&(sp.usesLeft===undefined||sp.usesLeft>0))));
    if(!hasUsable){ setHint('使用できる魔法がありません。自動でターンを終了します...'); setTimeout(()=>{ if(G.phase==='player') playerPass(); },500); }
    else setHint('あと'+G.actionsLeft+'回行動できます');
  }
}
