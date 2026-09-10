// battle_events.js — コアのイベント列をPvE画面へ再生する受け口
async function _flushCorePveHitEvents(state, events, beforeUnits){
  // コアの資源変更を、演出開始前にPvE側へ共通反映する。
  _syncCoreLifeToG(state);
  G._battleEventPlaybackDepth=(Number(G._battleEventPlaybackDepth)||0)+1;
  presentBeginPlayback();
  try{ return await _flushCorePveHitEventsInner(state,events,beforeUnits); }
  finally{
    presentEndPlayback();
    G._battleEventPlaybackDepth=Math.max(0,(Number(G._battleEventPlaybackDepth)||1)-1);
    if(!G._battleEventPlaybackDepth&&G._battleVictoryCheckPending){
      G._battleVictoryCheckPending=false;
      if(typeof _livingCombatUnits==='function'&&!_livingCombatUnits(G.enemies).length){
        // 味方側の全滅や蘇生指輪の有無も含め、通常の最終判定へ戻す。
        _onAllEnemiesDefeated();
      }
    }
  }
}
async function _flushCorePveHitEventsInner(state, events, beforeUnits){
  // コアがライフを変えた場合（我慢の指輪・負傷:ライフが+Nされる 等）の唯一の反映点。
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
    if(idx>=0){ slots[idx]=clone(e.item); ; }
  });
  // ── 攻撃効果は「少し動き出した時点」で見せる ───────────────
  // コアは攻撃効果を接触より先に解決するため、イベント列では
  //   [攻撃効果…] → attack → 接触ダメージ
  // の順に並ぶ。そのまま順に再生すると、攻撃者が動く前に効果だけが出る
  // （アラッサスの薙ぎ払い、サイレンの全体ダメージ）。
  // そこで、効果より前に攻撃モーションを始めて25%地点で止め、効果を見せてから
  // 接触まで進める。止める仕組みは _playAttackMotionCore の onImpactPause。
  // **PvEとオンラインで同じ扱いにすること。**
  // 接触の瞬間に出す攻撃範囲の演出（貫通・三方向攻撃・全体攻撃）。
  // コアが attack より前に出すので、ここで持っておき onContact で鳴らす。
  let _pendingContactVfx=null;
  // 貫通だけは「絵が通り過ぎた瞬間」に数値を出す。通過するまで、その体への
  // ダメージ表示を待たせるための約束をここに置く（キー＝side:unitId）。
  const _contactHolds=new Map();
  const _releaseContactHold=unit=>{
    if(!unit) return;
    const key=`${unit.side||''}:${unit.id}`;
    const hold=_contactHolds.get(key);
    if(hold){ _contactHolds.delete(key); hold.release(); }
  };
  const _awaitContactHold=async ev=>{
    const key=`${ev&&ev.side||''}:${ev&&ev.unitId}`;
    const hold=_contactHolds.get(key);
    if(!hold) return;
    // 演出が届かない時に戦闘を止めないよう、必ず時間で切り上げる。
    await Promise.race([hold.promise,sleep(900)]);
    _contactHolds.delete(key);
  };
  const _firePendingContactVfx=()=>{
    const ev=_pendingContactVfx;
    if(!ev) return;
    _pendingContactVfx=null;
    // **待たない。** 待つと複数対象のダメージ数値の出る時刻がずれる。
    try{
      presentAttackContactVfxEvent(ev,{findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        playVfx:playAttackContactVfx,
        holdForContact:units=>(units||[]).forEach(u=>{
          if(!u) return;
          let release=()=>{};
          const promise=new Promise(resolve=>{ release=resolve; });
          _contactHolds.set(`${u.side||''}:${u.id}`,{promise,release});
        }),
        onContactPass:unit=>_releaseContactHold(unit),
      });
    }catch(err){ console.error('[attack contact vfx]',err); }
  };
  // 保留が残ったまま再生が終わらないよう、必ず全部解放する。
  const _releaseAllContactHolds=()=>{
    _contactHolds.forEach(h=>h.release());
    _contactHolds.clear();
  };
  // 画面揺れの強さは「実際に入った量」で決める。**予測しない。**
  // コアは演出より先にHPを減らし終えているため、接触の時点で相手が倒れていることがあり、
  // 予測（_predictFinalDamage）は0を返す。大ダメージでも画面が揺れなかったのはこれ。
  // その攻撃イベントに対応する damage イベント（反撃ではないもの）の量を使う。
  const _attackShakeAmount=ev=>{
    if(!ev||ev.targetId==null) return 0;
    const from=eventList.indexOf(ev);
    if(from<0) return 0;
    for(let i=from+1;i<eventList.length;i++){
      const d=eventList[i];
      if(!d) break;
      if(d.type==='turn_begin') break;
      if(d.type!=='damage') continue;
      if(d.counter) continue;
      if(String(d.unitId)!==String(ev.targetId)) continue;
      return Math.max(0,Number(d.amount)||0);
    }
    return 0;
  };
  const _shakeForAttack=ev=>{
    const amount=_attackShakeAmount(ev);
    if(amount>0&&typeof _shakeWithFinalDamage==='function') _shakeWithFinalDamage(amount);
  };
  // 命中音を二重に鳴らさないための印（まとめ鳴らし用）。
  const damageSfxDone=new Set();
  const sweepSources=new Set();
  // 薙ぎ払い（アラッサス）は対象ごとの命中VFXを出さない代わりに、
  // 炎が当たった瞬間にダメージ数値だけを出す。ここで出さないと数値がまったく出ない。
  // **イベント単位で覚える。** 対象単位で覚えると、同じ相手への通常攻撃の数値まで
  // 「薙ぎ払いで表示済み」と誤判定され、以後その相手のダメージ数値が出なくなる。
  // 逃走を二重に見せないための印（束の2件目以降を素通りさせる）。
  const fledShown=new Set();
  const sweepShownEvents=new Set();
  // 矢の着弾で出したキーワード演出（毒牙など）。イベント順では出し直さない。
  const keywordShownEvents=new Set();
  // **ダメージではなく戦闘修正でHPが0になった体に印を付ける。**
  // コアは「修正でHPが0になった」ことを死亡イベントでは知らせない
  // （修正で落ちた体は死亡効果も血も伴わないため、death イベント自体が出ない）。
  // そのため death の直前だけを遡っていた頃は印が一度も立たず、
  // 実際の消滅を受け持つ renderField() のフォールバックが常に焼失で消していた。
  // イベント列を**前から**追い、その体のHPを最後に削ったものが何かを覚える。
  // 印はイベントではなく**体そのもの**へ付けるので、消えるのが後のフラッシュに
  // ずれても残る。見せ方は render.js の _playUnitDeathCardFx が唯一の実装。
  (events||[]).forEach(e=>{
    if(!e||e.unitId==null) return;
    // ATKへのダメージ（武器破壊）はHPを削らないので数に入れない。
    const byDamage=(e.type==='damage'&&e.damageTo!=='atk')||e.type==='instant_death';
    const byDrain=e.type==='stat_change'&&Number(e.hp)<0;
    if(!byDamage&&!byDrain) return;
    const u=findLiveUnit(e.side,e.unitId,findUnit(e.side,e.unitId));
    if(!u) return;
    // コアは解決済みなので u.hp は最終値。最後にHPを削ったのが修正で、
    // かつ倒れているなら「修正で落ちた」。
    if(byDamage) delete u._deathByStatDrain;
    else if(Number(u.hp)<=0) u._deathByStatDrain=true;
  });
  // **これから解放される封印キャラは、演出が届くまで暗転を保つ。**
  // コアは計算の時点で `_sealed` を落としてしまうので、この時点では既に
  // 解放済みの状態になっている。そのまま描くと、画面ではまだ味方が生きているのに
  // 封印キャラだけ先に明るくなる。印を立てて renderField() に暗転を続けさせ、
  // presentSealReleaseEvent() が再生した時に落とす。
  (events||[]).filter(x=>x&&x.type==='seal_release').forEach(x=>{
    const u=findLiveUnit(x.side,x.unitId,findUnit(x.side,x.unitId));
    if(u) u._sealShownPending=true;
  });
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
  // **一撃の中の死亡は、その一撃の数値を全部出してから見せる。**
  // 並べ替えの規則は present.js が唯一の実装（オンラインと同じものを使う）。
  // これを通さないと、全体攻撃・三方向攻撃で1体目の数値の直後に死亡演出が挟まり、
  // 2体目以降の数値が約1秒ずつ遅れて出る（＝1体ずつ削っているように見える）。
  // **奪われる体を、演出が始まるまで元の位置へ留める。**（規則は render.js）
  // PvEはコアと盤面配列を共有しているため、ここへ来た時点でコアは既に体を移し終えている。
  // 何もしないと最初の再描画で移動先へカードが現れる＝ワープになる。
  // まだ画面が前の手番の並びのうちに、いま見えている位置へ複製を貼り付けておく。
  for(const e of (events||[])){
    if(!e||e.type!=='unit_stolen'||typeof beginUnitStealPresentation!=='function') continue;
    const other=e.side==='p1'?'p2':'p1';
    const u=findUnit(e.side,e.unitId)||findUnit(other,e.unitId);
    // **await しないこと。** ここで待つと、その隙の再描画でカードが移動先へ現れる。
    if(u) beginUnitStealPresentation(u,e.side);
  }
  // 死亡効果の青い発光も、カードが消える前へ寄せる（規則は present.js）。
  // 奪われる体は死なない（同じ一撃の中の死亡を落とす）。同じく present.js が唯一の実装。
  const _reordered=typeof presentReorderDeathsAfterDamageBatch==='function'
    ?presentReorderDeathsAfterDamageBatch(events||[])
    :(events||[]).filter(Boolean);
  const _noStolenDeaths=typeof presentDropDeathsOfStolen==='function'
    ?presentDropDeathsOfStolen(_reordered):_reordered;
  const eventList=typeof presentReorderDeathFlashesBeforeDeath==='function'
    ?presentReorderDeathFlashesBeforeDeath(_noStolenDeaths):_noStolenDeaths;
  // 攻撃前効果のイベント順は変えず、各一撃のモーションだけを先に開始して25%で止める。
  // 二段・三段攻撃では、1撃目のattackを解放した後、次の効果列の先頭で新しい計画を作る。
  let _preAttack=null;
  const _startPreAttackAt=eventIndex=>{
    if(_preAttack||typeof presentPreAttackPlan!=='function'||typeof playAttackMotion!=='function') return;
    const plan=presentPreAttackPlan(eventList,eventIndex);
    const attackEvent=plan&&plan.event;
    if(!attackEvent) return;
    const side=attackEvent.side==='p2'?'p2':'p1';
    const foe=side==='p1'?'p2':'p1';
    const attacker=findLiveUnit(side,attackEvent.attackerId,findUnit(side,attackEvent.attackerId));
    const target=findLiveUnit(foe,attackEvent.targetId,null)
      ||findLiveUnit(side,attackEvent.targetId,null)
      ||findUnit(foe,attackEvent.targetId)||findUnit(side,attackEvent.targetId);
    if(!attacker||!target) return;
    let release=()=>{};
    const stopped=new Promise(resolve=>{ release=resolve; });
    if(typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:`combat:effect-attack:${uid()}`,guardMs:0});
    beginBattleMotion();
    let markReady=()=>{};
    const ready=new Promise(resolve=>{ markReady=resolve; });
    const motion=(async()=>{
      try{
        await playAttackMotion(attacker,target,side==='p2',()=>{ markReady(); return stopped; },
          {...PRESENT_ATTACK_MOTION,
           onContact:_firePendingContactVfx,
           onHit:()=>_shakeForAttack(attackEvent),
           targetRect:target._lastVisualRect||null});
      } finally { markReady(); endBattleMotion(); }
    })();
    _preAttack={ev:attackEvent,attackIndex:plan.index,release,motion,ready};
  };
  // HUDに描いてあるマナの値。変わった時だけ描き直すために持つ。
  let _shownManaValue=Number(G.mana)||0;
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
  // 「Xマナ毎」が到達回数ぶん発動したときは、**回数ぶん見せる**（間引かない）。
  // このゲートは「そのキャラクターで初めての発動か」を返すだけに使い、
  // 2回目以降は高速な繰り返し演出へ落とす（規則は present_events.js）。
  // 区切りは実際の攻撃モーション（即時攻撃）だけにする。マナ閾値効果自身が出す
  // damage（アラクネ等）で区切ると、ひと続きの発動が途中で1回目に戻る。
  const manaCueGate=presentCreateOnceGate();
  // 同じ瞬間（同じ発動回）に同じ効果が乗る分は、1体目の演出でまとめて見せる。
  const manaWaveGate=presentCreateOnceGate();
  for(const [eventIndex,e] of eventList.entries()){
    if(!_preAttack&&(e.type==='turn_begin'||e.type==='battle_start'
      ||(typeof presentPreAttackActorId==='function'&&presentPreAttackActorId(e)!=null))){
      _startPreAttackAt(eventIndex);
    }
    // 攻撃効果は、攻撃者が少し動いて25%地点へ着いてから見せる。
    // モーションを開始しただけでイベント処理を続けると、最初の描画フレームより先に
    // 固有VFXと数値が出る。attack自体と手番境界はここでは待たない。
    if(_preAttack&&eventIndex<_preAttack.attackIndex
      &&e.type!=='turn_begin'&&e.type!=='battle_start') await _preAttack.ready;
    // コア駆動の戦闘では、通常の攻撃もこの経路で描く（PvE専用の攻撃アクションは通らない）。
    const _isPlayableAttack=e.type==='attack'&&(e.immediate||G._coreDrivenBattle);
    // マナ解決のひと続きが途切れたか＝present.js が唯一の実装（オンラインと同じ）。
    // ここで途切れたら、続けて出していた効果固有VFXも止めて数え直す。
    // 攻撃だけを区切りにしていた頃は、死亡演出の最中も活性化のVFXが出続けていた。
    // 何も走っていない時は await しない。ここで毎イベント1回ずつ待ちを挟むと、
    // 数値の表示と盤面の詰めの間に描画が割り込み、数値がカード外へ出ることがある。
    if(typeof presentBreaksManaRun==='function'&&presentBreaksManaRun(e)){
      manaCueGate.reset();
      manaWaveGate.reset();
      if(_manaEffectRunning()) await _endManaEffectRun();
    }
    // **一撃が変わったら、固有VFX・固有SEの重複判定をやり直す。**
    // 重複判定は「1回の一撃で複数対象へ同じ効果が乗る」ためのもの。一撃をまたいで
    // 持ち越していたため、二段・三段攻撃の2回目以降は効果は出ているのに
    // VFXだけ出なかった。区切りの判定は present.js が唯一の実装。
    if(typeof presentBreaksEffectRun==='function'&&presentBreaksEffectRun(e)){
      effectStatCueKeys.clear();
      effectStatVfxGate.reset();
    }
    if(e.type==='effect_flash'){
      await presentEffectFlashEvent(e,{ findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)) });
      continue;
    }
    if(e.type==='attack_contact_vfx'){
      // **ここでは鳴らさない。** 攻撃モーションが対象へ接触した瞬間に鳴らす
      // （_firePendingContactVfx）。ここで再生すると、コアのイベント順のせいで
      // 攻撃モーションを再生し終えた＝キャラクターが戻った後になる。
      _pendingContactVfx=e;
      continue;
    }
    if(e.type==='summon_buff'){
      // 「この戦闘中、召喚された味方は+X/+Yを得る」の記録。
      // 実際の加算は召喚時にコアが行い、summonイベントの中身に載っている。
      // ここでは見せるものが無い（数値は召喚された体に最初から付いている）。
      _recordBattleTrace('summon_buff',{side:e.side,atk:Number(e.atk)||0,hp:Number(e.hp)||0});
      continue;
    }
    if(e.type==='unit_stolen'){
      // **奪うのは移動であって召喚ではない**（規則は core.js の coreStealUnit）。
      // コアが体そのものを敵陣から味方陣の前衛右端へ移し済みで、PvEはコアと
      // 同じ配列を共有しているため、盤面の入れ替えは済んでいる。
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      _recordBattleTrace('unit_stolen',{side:e.side,unitId:e.unitId,toSide:e.toSide||null});
      await presentUnitStolenEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id))
          ||findLiveUnit(side==='p1'?'p2':'p1',id,findUnit(side==='p1'?'p2':'p1',id)),
        applyStats:(unit,snap)=>{
          if(typeof presentAdvanceShown!=='function'||!unit||!snap) return;
          presentAdvanceShown(unit,{
            atk:Math.max(0,Number(snap.atk)||0),
            hp:Math.max(0,Number(snap.hp)||0),
            maxHp:Math.max(1,Number(snap.maxHp)||Number(snap.hp)||1),
          });
        },
        // PvEはコアと同じ配列なので、詰め直して描き直すだけ。
        // **force を付けて必ずこの場で詰める。** 奪うのは死亡効果の解決中に起きるため、
        // 保留されると移動先のスロットが無いまま演出が終わり、後から反映されてワープする。
        moveOnBoard:()=>{
          if(typeof requestBattleCompact==='function') requestBattleCompact({force:true,forceDuringMotion:true,forceRender:true});
          else if(typeof renderAll==='function') renderAll();
        },
        motion:(unit,fromSide,toSide,applyBoard)=>(typeof playUnitStealMotion==='function'
          ?playUnitStealMotion(unit,fromSide,toSide,applyBoard)
          :Promise.resolve(applyBoard())),
      });
      continue;
    }
    if(e.type==='revive'){
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      await presentReviveEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        // 蘇生後の値まで表示を進める（根性で耐えた体のHPが0のまま残らないように）。
        applyStats:(unit,ev)=>{
          if(typeof presentAdvanceShown!=='function') return;
          presentAdvanceShown(unit,{
            atk:Math.max(0,Number(ev.atk)||0),
            hp:Math.max(0,Number(ev.hp)||0),
            maxHp:Math.max(1,Number(ev.maxHp)||Number(ev.hp)||1),
          });
          if(typeof updateUnitDamageUi==='function') updateUnitDamageUi(unit,e.side==='p1'?'ally':'enemy');
        },
        render:()=>{ if(typeof requestBattleCompact==='function') requestBattleCompact({forceDuringMotion:true});
          else if(typeof renderAll==='function') renderAll(); },
      });
      continue;
    }
    // **再生するイベントの一覧。ここに無い種類は下の分岐まで届かない。**
    // 逃走（fled）が抜けていたため、武器破壊でATKが0になっても FLED 表示が出なかった。
    if(!(e.type==='mana_threshold'||e.type==='mana_gain'||e.type==='gold_gain'||e.type==='summon'||e.type==='transform'||e.type==='damage'||e.type==='stat_change'||e.type==='shield_lost'||e.type==='keyword_effect'||e.type==='instant_death'||e.type==='fled'||e.type==='death'||e.type==='seal_release'||e.type==='sweep_vfx'||_isPlayableAttack)) continue;
    if(e.type==='sweep_vfx'){
      const source=findLiveUnit(e.side,e.unitId,findUnit(e.side,e.unitId));
      const foeSide=e.side==='p1'?'p2':'p1';
      const sideByTarget=new Map();
      const targets=(e.targetIds||[]).map(id=>{
        const foe=findLiveUnit(foeSide,id,findUnit(foeSide,id));
        if(foe){ sideByTarget.set(foe,foeSide); return foe; }
        const own=findLiveUnit(e.side,id,findUnit(e.side,id));
        if(own){ sideByTarget.set(own,e.side); return own; }
        return null;
      }).filter(Boolean);
      if(!source||!targets.length) continue;
      sweepSources.add(source.id);
      const byTarget=typeof presentSweepDamageEvents==='function'
        ?presentSweepDamageEvents(eventList,eventIndex,e):new Map();
      await presentSweepAttack(source,e.side==='p2',targets,
        target=>byTarget.get(`${sideByTarget.get(target)||foeSide}:${target.id}`),
        (target,ev)=>{
          if(ev) sweepShownEvents.add(ev);
          if(ev&&typeof presentAdvanceShown==='function') presentAdvanceShown(target,{hp:ev.hpAfter});
        },
        {sideOf:target=>(sideByTarget.get(target)==='p2'?'enemy':'ally')});
      continue;
    }
    if(e.type==='instant_death'){
      // 即死の見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      // 状態はコアが確定済みなので、ここは演出だけ。
      presentInstantDeathEvent(e,{ findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)) });
      continue;
    }
    if(e.type==='keyword_effect'){
      // 矢の着弾で出し済みなら、ここでは出さない（二重に出る）。
      if(keywordShownEvents.has(e)) continue;
      // 状態異常を受けた瞬間の見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      // PvEはコアと同じ実体を共有しているので、ここでは見た目だけを出す（状態は触らない）。
      presentKeywordEffectEvent(e,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
      });
      continue;
    }
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
      // **同じ瞬間に倒れた分はまとめて1回で見せる**（どこまでが同じ瞬間かは present.js）。
      // 束の2件目以降は markDone 済みになるので、このループが後で届いても素通りする。
      const _deathGroup=typeof presentDeathBatchEvents==='function'
        ?presentDeathBatchEvents(eventList,eventIndex):[e];
      await presentDeathBatch(_deathGroup,{
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)),
        isDone:ev=>deaths.has(`${ev.side}:${ev.unitId}`),
        markDone:ev=>deaths.add(`${ev.side}:${ev.unitId}`),
        beat:()=>sleep(PRESENT_HIT_BEAT_MS),
        // **カードの消失演出は同時に倒れた全員で同じ時点に始める。**
        // 死亡効果（processDeath）を先に待つと、その間だけ他のカードが場に残る。
        // 二重発火は _deathFxStarted が防ぐので、後段の processDeath 内の
        // 同じ呼び出しは何もしない。
        startFx:(unit,side)=>{ if(typeof _playDeathBurnOnce==='function') _playDeathBurnOnce(unit,side!=='p1'); },
        // 陣営ごとの後始末（ログ・報酬・撃破数）はPvEだけが行う。
        // オンラインはサーバーが確定済みなので何もしない。
        processDeath:async(unit,side)=>{
          const goldBefore=Math.max(0,Number(G.gold)||0);
          if(G._savedBattleReplaying) SaveRun.recordDeath(unit,side,
            _deathGroup.find(x=>x&&x.side===side&&String(x.unitId)===String(unit&&unit.id))||e);
          else if(side==='p1') await processAllyDeath(unit);
          else await processEnemyDeath(unit,(state.units.p2||[]).indexOf(unit));
          // 敵撃破報酬はPvE側の後始末（onGoldGained）で確定する。コア状態へは
          // **増えた分だけを足す。** 実値を代入すると、コアが確定済みでまだ演出を
          // 出していないゴールド（マミーの死亡効果など）がここで消え、あとから
          // 演出で足した分が手番の終わりの同期で減って見える。
          const gained=Math.max(0,Number(G.gold)||0)-goldBefore;
          if(gained&&state.resources&&state.resources.p1){
            state.resources.p1.gold=Math.max(0,(Number(state.resources.p1.gold)||0)+gained);
          }
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
      // **対象は相手陣営とは限らない。** ピクシーで操られた敵は同じ陣営の敵を殴る
      // （コアは attack イベントの side に「攻撃した体の陣営」を入れる）。
      // 相手陣営に見つからなければ同じ陣営から探す。見つからないとモーションが出ない。
      const target=findLiveUnit(targetSide,e.targetId,null)
        ||findLiveUnit(attackSide,e.targetId,null)
        ||findUnit(targetSide,e.targetId)||findUnit(attackSide,e.targetId);
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
      if(_preAttack&&_preAttack.ev===e){
        // 効果より前に始めておいたモーション。ここで接触まで進める。
        const held=_preAttack;
        _preAttack=null;
        held.release(e.effectOnly?{abort:true}:undefined);
        await held.motion;
      } else if(attacker&&target&&typeof playAttackMotion==='function'){
        if(e.attackVisual===false) continue;
        if(typeof playSfx==='function') playSfx('attack',{group:'combat',guardKey:`combat:effect-attack:${uid()}`,guardMs:0});
        beginBattleMotion();
        try{
          await playAttackMotion(attacker,target,attackSide==='p2',null,{...PRESENT_ATTACK_MOTION,
            onContact:_firePendingContactVfx,
            // **大ダメージの画面揺れは接触の瞬間**（オンラインの受け口と同じ扱い）。
            onHit:()=>_shakeForAttack(e),
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
        waveGate:manaWaveGate,
        // 同じ瞬間に同じ効果が発動する全員を先読みする（判定は present.js）。
        waveEvents:ev=>presentManaWaveEvents(eventList,Math.max(0,eventList.indexOf(ev))),
        // 飛ばす効果（炎の矢）用。その効果が起こしたダメージ＝対象（判定は present.js）。
        effectDamage:ev=>presentEffectDamageEvents(eventList,Math.max(0,eventList.indexOf(ev))),
        // 着弾の瞬間に見せるキーワード演出（毒牙など。判定は present.js）。
        effectKeywords:dmg=>(typeof presentEffectKeywordEvents==='function'
          ?presentEffectKeywordEvents(eventList,dmg):[]),
        // **1件ずつ待つ。** 投げっぱなしにすると、直前の効果のVFXが出ている最中に
        // 次の効果が始まり、別々の効果が同時に見える（サテュロスのマナ発生と
        // マータの活性化が重なっていた）。
        playCue:(cueUnits,cueOpt)=>_playManaEffectCue(cueUnits,{...cueOpt,
          // 着弾で数値を出すので、通常のダメージ演出には出させない（薙ぎ払いと同じ印）。
          markShown:dmg=>{ if(dmg) sweepShownEvents.add(dmg); },
          // キーワード演出も着弾で出すので、イベント順では出させない。
          markKeywordShown:kw=>{ if(kw) keywordShownEvents.add(kw); },
          playKeyword:kw=>{ if(kw) presentKeywordEffectEvent(kw,{
            findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id)) }); },
          onImpact:(target,dmg)=>{
            if(target&&dmg&&typeof presentAdvanceShown==='function') presentAdvanceShown(target,{hp:dmg.hpAfter});
            if(target&&typeof updateUnitDamageUi==='function') updateUnitDamageUi(target,target.side==='p2'?'enemy':'ally');
          },
        }),
      });
      if(e.deferred&&e.deferredAfter&&typeof coreRestoreDeferredState==='function'){
        coreRestoreDeferredState(state,e.deferredAfter);
        G.mana=Math.max(0,Number(state.resources.p1?.mana)||0);
        _syncCoreResourcesToG(state);
        // **マナの数字は、値が変わったら必ずその場で描き直す。**
        // 「次も閾値なら描かない」にしていた頃は、「Xマナ毎」が続く間ずっと
        // 古い数字のまま止まり、効果でマナが増えてもカウントが動かなかった。
        // 連続発動でHUDが何十回も走らないよう、抑えるのは「値が同じ時」だけにする。
        if(_shownManaValue!==G.mana){
          _shownManaValue=G.mana;
          _refreshManaDisplays();
        }
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
      // マナを得た合図（S004）は**発生させたキャラクターの上**に出す。
      // 見せ方は render.js が唯一の実装（オンラインと同じ）。
      const _manaVfxShown=!!(source&&Number(e.amount)>0&&typeof playManaGainVfx==='function'
        &&playManaGainVfx(source,e.side==='p2'?'enemy':'ally'));
      // **数字はVFXが見え始めてから動かす**（尺は present.js が唯一の定義）。
      if(_manaVfxShown){
        await sleep((typeof PRESENT_MANA_GAIN_VALUE_DELAY_MS==='number'&&PRESENT_MANA_GAIN_VALUE_DELAY_MS)||140);
      }
      if(e.side==='p1'){
        _recordBattleTrace('mana_state_apply',{unitId:e.unitId,amount:Number(e.amount)||0});
        G.mana=Math.max(0,(Number(G.mana)||0)+(Number(e.amount)||0));
        _shownManaValue=G.mana;
        _refreshManaDisplays();
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
      // **逃走した敵からもゴールドは得る。** 逃走は死亡ではないので撃破数・血・
      // 死亡効果は発生しないが、報酬だけは撃破時と同じ計算で渡す（利用者指定）。
      // 盤面から外される前にここで確定させる（外れると体を引けなくなる）。
      const _fledUnit=e.side==='p2'?findLiveUnit('p2',e.unitId,findUnit('p2',e.unitId)):null;
      if(_fledUnit&&typeof _rollEnemyGold==='function'&&typeof onGoldGained==='function'){
        const _fledGold=G._savedBattleReplaying?(e.pveRewardGold||0):_rollEnemyGold(_fledUnit);
        const _gained=_fledGold>0?onGoldGained(_fledGold):0;
        // **増えた分だけコア状態へ足す。** 撃破報酬と同じ理由（代入は演出待ちの分を消す）。
        if(_gained>0&&state.resources&&state.resources.p1){
          state.resources.p1.gold=Math.max(0,(Number(state.resources.p1.gold)||0)+_gained);
        }
      }
      // 見せ方は present_events.js が唯一の実装（オンラインと同じ）。
      // **同じ瞬間に逃走する分はまとめて1回で見せる**（ずらし方は present_events.js）。
      // 束の2件目以降は markDone 済みになるので、このループが後で届いても素通りする。
      const _fledGroup=typeof presentFledBatchEvents==='function'
        ?presentFledBatchEvents(eventList,eventIndex):[e];
      await presentFledBatch(_fledGroup,{
        // 陣営を跨いで探す（奪われた直後など、配列の側が入れ替わっていることがある）。
        findUnit:(side,id)=>findLiveUnit(side,id,findUnit(side,id))
          ||findLiveUnit(side==='p1'?'p2':'p1',id,findUnit(side==='p1'?'p2':'p1',id)),
        isDone:ev=>fledShown.has(`${ev.side}:${ev.unitId}`),
        markDone:ev=>fledShown.add(`${ev.side}:${ev.unitId}`),
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
            maxHp:Math.max(1,presentShownMaxHp(only)+(Number(e.maxHp!==undefined?e.maxHp:e.hp)||0)),
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
            maxHp:Math.max(1,presentShownMaxHp(unit)+(Number(ev.maxHp!==undefined?ev.maxHp:ev.hp)||0)),
          });
        },
        cueKeys:effectStatCueKeys,
        vfxGate:effectStatVfxGate,
        ownEffectText:_ownCardEffectText,
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
      // 開戦の召喚も**1体ずつ姿が出る**ようにする（オンラインと同じ見え方）。
      // 開戦では体が先に配列とDOMへ入るため _summonHasDom が真になり、
      // 保留のまま最後にまとめて出ていた。戦闘ループが始まる前は必ず即時描画する。
      const _openingSummon=!G._battlePhaseRunning;
      if(typeof requestBattleCompact==='function') requestBattleCompact(
        (_summonHasDom&&!_openingSummon)?undefined:{forceDuringMotion:true});
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
      // 登場演出（S001）。**逆再生開始でカードが出る**まで待ってから次へ進む。
      // 見せ方は playSummonAppearVfx（render.js）が唯一の実装。
      if(typeof playSummonAppearVfx==='function'){
        try{ await playSummonAppearVfx(unit,e.side==='p2'?'enemy':'ally'); }
        catch(err){ console.error('[summon vfx]',err); }
      }
      await _afterPanelSummon(unit,e.side==='p2',false,true);
      continue;
    }
    if(e.type!=='damage'||!(Number(e.amount)>0)) continue;
    // **最大ダメージの記録はここ。** コア駆動の戦闘ではダメージの適用がコア側で終わり、
    // 旧経路（applyDamageBatch）は通らないため、記録がそこだけにあると
    // 結果画面の「最大ダメージ」が常に0になる。イベント列は必ずここを通る。
    if(typeof _recordRunStatsDamage==='function'){
      _recordRunStatsDamage(Number(e.amount)||0,String(e.keywordEffect||'')==='毒'?'毒':'');
    }
    // 貫通で貫かれた体は、**絵がその位置を通り過ぎるまで**数値を出さない。
    // 待たされるのは貫通の対象だけで、他のダメージはVFXに依存しない。
    await _awaitContactHold(e);
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
      // 同じ瞬間の命中はどれか＝present_events.js の束が唯一の実装（オンラインと同じ）。
      sfxBatch:ev=>presentDamageSfxBatch(eventList,Math.max(0,eventList.indexOf(ev))),
      // 次も同じ種類のダメージなら、数値をその間隔で出し切る（判定は present.js）。
      runAheadMs:ev=>presentDamageRunAheadMs(eventList,Math.max(0,eventList.indexOf(ev))),
      // 状態異常を付けたダメージの絵（弱体＝K004）。判定は present.js。
      vfxKeyword:ev=>(typeof presentDamageVfxKeyword==='function'
        ?presentDamageVfxKeyword(eventList,ev):''),
      // 効果の素材はシートの「VFX/SE」列で引く。
      effectFxCode:no=>(no&&typeof _effectFxCodeByNo==='function'?_effectFxCodeByNo(no):no),
      alreadyShown:ev=>sweepShownEvents.has(ev),
      noteEffectSource:unit=>{ if(!sweepSources.has(unit.id)) effectDamageSources.add(unit.id); },
      onEffectDamage:(ev,src)=>{
        if(!sweepSources.has(src.id)&&typeof playDamageEffectSfx==='function') playDamageEffectSfx('single');
      },
    });
  }
  // 先出ししたモーションが解放されないまま残らないようにする
  // （attackイベントに到達せず抜けた場合の保険）。
  if(_preAttack){
    const held=_preAttack;
    _preAttack=null;
    held.release();
    try{ await held.motion; }catch(err){ /* 演出の失敗で再生を止めない */ }
  }
  // 接触フックまで届かなかった接触VFXの保険（攻撃者・対象が盤面に無い等）。
  // 出ないまま消すと「攻撃範囲の演出が時々出ない」になる。
  _firePendingContactVfx();
  _releaseAllContactHolds();
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
  // 続けて出していた効果固有VFXは、この再生の終わりで必ず止める。
  // 止め忘れると次の手番・報酬画面までループし続ける。
  if(_manaEffectRunning()) await _endManaEffectRun();
  if(typeof requestBattleRender==='function') requestBattleRender();
  _syncCoreBloodToG(state);
}

// PvEも攻撃時効果の判定・数値変更は共通コアを使う。DOM演出だけは、コアが返す
// ダメージを既存のapplyDamageBatchへ戻して再生する。
