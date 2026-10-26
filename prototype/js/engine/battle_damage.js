// battle_damage.js — ダメージ・負傷・死亡・結界破壊のPvE受け口
// 2026-10-25 リファクタリング：battle.js から移した（処理は変えていない）。

// ── 味方の負傷トリガー効果一式（マナ獲得＋名前別の負傷効果）。発動したら true を返す ──
// 執念の炎：常時：このキャラクターの負傷効果は1回追加で発動する。
// 戻り値は「発動したか」ではなく「実際に発動した回数」。
// エティンのような「負傷効果が発動するたび」の効果は、執念の炎・激怒の指輪等で
// 発動回数が増えた分だけ繰り返す必要があるため、回数を呼び出し元へ返す。
// 敵側の負傷効果。味方側の負傷フックとは別経路で処理し、敵の効果だけを追加する。
async function _runCoreLiveInjuryEffects(unit, actualDmg, isEnemySide, source, dispatchToken){
  if(!unit||unit.hp<=0) return 0;
  // 負傷効果が追加ダメージを発生させる場合、その再帰経路から同じ対象の
  // 負傷効果が重ねて入らないようにする。別ヒットではfinally後に再度発動できる。
  if(unit._coreInjuryEffectsResolving) return 0;
  // 1回のダメージバッチを複数の互換フックが観測しても、同じ負傷イベントを
  // もう一度解決しない。別ヒットではバッチ番号が変わるため正常に発動する。
  if(dispatchToken!=null&&unit._lastInjuryEffectDispatch===dispatchToken) return 0;
  if(dispatchToken!=null) unit._lastInjuryEffectDispatch=dispatchToken;
  _recordBattleTrace('injury_dispatch_start',{unitId:unit.id,dispatchToken,actualDmg,isEnemySide});
  unit._coreInjuryEffectsResolving=true;
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
    deferManaThresholdEffects:true,
    _deferLichSummons:true,
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{
    if(!u) return;
    touched.push([u,u.side,u.slot]);
    u.side=state.units.p1.includes(u)?'p1':'p2';
    u.slot=i;
  });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
    const localEvents=[];
  const emit=ev=>{ localEvents.push(ev); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  // **オプションをコアへそのまま渡すこと。** ここで落とすと、コアが
  // 「全員にダメージを入れてからまとめて誘発」（coreHitAll の deferTriggers/collect）を
  // 指示しても PvE 側だけ1体ずつ即誘発になり、オンラインと結果が食い違う。
  const applyHit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>{
    return coreResolveHit(state,source,target,amount,counter,coreMathRng,emit,
      Object.assign({skipSourceEffects:!!skipSourceEffects,skipTough:!!skipTough},options||{}));
  };
  const side=isEnemySide?'p2':'p1';
  // 反復回数はコア（coreResolveHit内の負傷反復）と同じ式にする。旧式は
  //   ・敵側を一律1回に固定（isEnemySide?1:…）
  //   ・_ringCount()が陣営を問わずプレイヤーの指輪を数える
  // という2点でコアと食い違い、PvEとオンラインで負傷効果の回数がずれていた。
  // stateのringsはp1のみ実体を持つため、coreRingCountは敵側で0を返す＝
  // 「敵にプレイヤーの指輪を適用しない」旧PvEの意図もそのまま保たれる。
  const repeat=1+coreRingCount(state,side,'激怒の指輪')+coreExtraTriggerTimes(unit,'負傷',coreEffectCount(unit,'執念の炎'))
    +coreAllyExtraTriggerTimes(unit,state,'負傷')
    +Math.max(0,Number(unit._effectRepeatBonus)||Number(unit.effectData&&unit.effectData.effectRepeatBonus)||0);
  let fired=0;
  const previousDeferMana=!!G._deferManaThresholdEffects;
  G._deferManaThresholdEffects=true;
  // 負傷効果のコア処理で生成された召喚は、負傷固有VFXの完了を待たずに
  // 盤面へ接続する。VFXを先にawaitすると、召喚体だけ内部状態と表示が
  // 分離し、次の攻撃まで姿が出ない共通遅延になる。
  const flushedSummonEvents=new Set();
  try{
    for(let i=0;i<repeat&&unit.hp>0;i++){
      const beforeMana=Number(state.resources[side].mana)||0;
      coreTriggerManaOnInjury(unit,state,emit);
      const injuryEventSeq=state._coreInjuryEventSeq=(Number(state._coreInjuryEventSeq)||0)+1;
      coreApplyInjuryEffects(unit,actualDmg,state,coreMathRng,emit,applyHit,source||null,`${injuryEventSeq}:${i}`);
      if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
      const summonEvents=localEvents.filter(ev=>ev&&ev.type==='summon'&&!flushedSummonEvents.has(ev));
      if(summonEvents.length){
        await _flushCorePveHitEvents(state,summonEvents,before);
        summonEvents.forEach(ev=>flushedSummonEvents.add(ev));
      }
      // C008（ゴーレム）／C012（コボルド）の共通負傷演出は、
      // 攻撃時のstat_changeではなく、実際に負傷効果を解決したここでだけ再生する。
      const injuryCode=_effectPresentationCode(unit);
      if((injuryCode==='C008'||injuryCode==='C012')&&typeof _playCardEffectSfx==='function'){
        _recordBattleTrace('injury_effect_vfx_start',{unitId:unit.id,code:injuryCode,
          side:isEnemySide?'p2':'p1',actualDmg:Number(actualDmg)||0});
        _playCardEffectSfx('C008');
        // 負傷VFXは攻撃モーションの接触処理を停止させない。演出自体は
        // playHitVfxAtRect側で保持され、モーションと並行して再生される。
        void _playCardEffectVfx('C008',[unit],{gateMs:0,waitForFinish:false});
        _recordBattleTrace('injury_effect_vfx_done',{unitId:unit.id,code:injuryCode});
      }
      if((Number(state.resources[side].mana)||0)!==beforeMana||coreEffectCount(unit,'治癒能力')||
        coreEffectCount(unit,'ゴーレム')||coreEffectCount(unit,'ギガンテス')||coreEffectCount(unit,'フォルモール')||
        coreEffectCount(unit,'ブラウニー')||coreEffectCount(unit,'エルフ')||coreEffectCount(unit,'コボルド')||
        coreEffectCount(unit,'インキュバス')||coreEffectCount(unit,'カオス・インプ')||coreEffectCount(unit,'逆上')||
        coreEffectCount(unit,'メデューサ')||coreEffectCount(unit,'ケットシー')||coreEffectCount(unit,'波の娘"ラン・ドーター"')||
        coreEffectCount(unit,'鉄の拳"フォルニョート"')||coreEffectCount(unit,'残響の魔導師"アバドン"')||
        coreEffectCount(unit,'夜刻の巫女"ウムブラ"')||coreEffectCount(unit,'ミノタウロス')||
        coreEffectCount(unit,'咬竜"グレイプニル"')) fired++;
    }
    _recordBattleTrace('mana_threshold_scan',{phase:'injury',unitId:unit.id,mana:Number(state.resources[side]?.mana)||0,side});
    coreApplyManaThresholdEffects(state,coreMathRng,emit,applyHit);
    if(typeof coreFlushPendingLichSummons==='function') coreFlushPendingLichSummons(state,emit);
    _syncCoreResourcesToG(state);
    _refreshManaDisplays();
  }finally{
    G._deferManaThresholdEffects=previousDeferMana;
    delete unit._coreInjuryEffectsResolving;
    touched.forEach(([u,oldSide,slot])=>{
      if(oldSide==null) delete u.side; else u.side=oldSide;
      if(slot==null) delete u.slot; else u.slot=slot;
    });
  }
  // コア生成物はsummonイベントの処理側で初めてGへ追加する。
  // ここで先行追加すると、後段が「既に存在する」と判定して描画を飛ばす。
  await _flushCorePveHitEvents(state,localEvents.filter(ev=>!flushedSummonEvents.has(ev)),before);
  _recordBattleTrace('injury_dispatch_end',{unitId:unit.id,dispatchToken,fired});
  return fired;
}

async function _fireAllyInjuryEffects(unit, actualDmg, source, dispatchToken){
  return _runCoreLiveInjuryEffects(unit,actualDmg,false,source,dispatchToken);
}
async function _fireEnemyInjuryEffects(unit, actualDmg, source, dispatchToken){
  return _runCoreLiveInjuryEffects(unit,actualDmg,true,source,dispatchToken);
}


async function applyDamageBatch(entries, options){
  const opt=options||{};
  const injuryDispatchToken=G._injuryDispatchSequence=(Number(G._injuryDispatchSequence)||0)+1;
  const prepared=(entries||[])
    .filter(e=>e&&e.unit&&e.unit.hp>0&&!_isSealed(e.unit)&&e.amount>0)
    .map(e=>{
      const side=e.side||_battleSideOfUnit(e.unit);
      return {...e,side,rect:e.rect||_captureUnitDamageRect(e.unit,side)};
    })
    .filter(e=>e.side);
  if(!prepared.length) return [];

  // 分散・軽減・キーワード・状態変化の判定は共通コアへ一本化する。
  // deferTriggersで演出と死亡処理だけをPvE側へ残し、coreResolveHitが出した
  // 各対象のdamageイベントを従来のVFX／死亡パイプラインへ接続する。
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
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{if(u){touched.push([u,u.side,u.slot]);u.side=state.units.p1.includes(u)?'p1':'p2';u.slot=i;}});
  const beforeHp=new Map(prepared.map(e=>[e.unit,Number(e.unit.hp)||0]));
  const coreEvents=[];
  const emit=ev=>{coreEvents.push(ev);if(Array.isArray(G._battleCoreEvents))G._battleCoreEvents.push(ev);};
  const attackContactSources=new Map();
  if(opt.normalAttack){
    prepared.forEach(e=>{
      if(!e.source||e._counterDamage||attackContactSources.has(e.source)) return;
      attackContactSources.set(e.source,Object.prototype.hasOwnProperty.call(e.source,'_coreAttackContact')
        ?e.source._coreAttackContact:undefined);
      e.source._coreAttackContact=true;
    });
  }
  try{
    prepared.forEach(e=>coreResolveHit(state,e.source||opt.source,e.unit,e.amount,!!e._counterDamage,coreMathRng,emit,
      {deferTriggers:true,effect:!!opt.effect,suppressAttackHitSfx:!!e.suppressAttackHitSfx}));
    // deferTriggers はダメージ確定だけを遅延する契約。通常攻撃の命中キーワードは
    // PvE側で再実装せず、同じコア関数を一度だけ後段から呼ぶ。
    if(opt.normalAttack){
      coreEvents.filter(e=>e&&e.type==='damage'&&Number(e.amount)>0).forEach(e=>{
        const target=[...(state.units.p1||[]),...(state.units.p2||[])].find(u=>u&&String(u.id)===String(e.unitId));
        const source=e.sourceId!=null
          ?[...(state.units.p1||[]),...(state.units.p2||[])].find(u=>u&&String(u.id)===String(e.sourceId))
          :null;
        if(!target||!source) return;
        const beforeHp=Math.max(Number(target.hp)||0, Number(target.hp||0)+Number(e.amount||0));
        const keywordResult=coreApplyKeywordOnHit(source,target,Number(e.amount)||0,beforeHp,state,emit);
        if(keywordResult&&keywordResult.killed) emit({type:'death',side:target.side,unitId:target.id});
      });
    }
  }finally{
    touched.forEach(([u,side,slot])=>{if(side==null)delete u.side;else u.side=side;if(slot==null)delete u.slot;else u.slot=slot;});
  }
  const damageEvents=coreEvents.filter(ev=>ev&&ev.type==='damage');
  const preparedByUnit=new Map(); prepared.forEach(e=>{if(!preparedByUnit.has(e.unit))preparedByUnit.set(e.unit,e);});
  const results=damageEvents.map(ev=>{
    const unit=[...(G.allies||[]),...(G.enemies||[])].find(u=>u&&String(u.id)===String(ev.unitId));
    const base=preparedByUnit.get(unit)||prepared.find(e=>e.unit===unit)||{};
    const side=ev.side==='p1'?'ally':'enemy';
    const actualDmg=Math.max(0,Number(ev.amount)||0);
    const sourceById=ev.sourceId!=null
      ?[...(G.allies||[]),...(G.enemies||[])].find(u=>u&&String(u.id)===String(ev.sourceId))||null
      :null;
    const source=sourceById||base.source||opt.source||null;
    return {unit,side,actualDmg,damageEvent:ev,died:!!(unit&&unit.hp<=0),blocked:actualDmg<=0,
      source,preHp:beforeHp.get(unit)||0,redirectedFrom:ev.redirectedFrom||null,
      needsAllyInjuryEffects:actualDmg>0&&side==='ally'&&unit&&unit.hp>0,
      needsEnemyInjuryEffects:actualDmg>0&&side==='enemy'&&unit&&unit.hp>0,
      rect:_captureUnitDamageRect(unit,side),attackSfxSource:base.attackSfxSource||opt.attackSfxSource||null,
      suppressAttackHitSfx:!!base.suppressAttackHitSfx,
      effectSource:opt.effect?source:null,keywordEffect:opt.keywordEffect||null,
      counterDamage:!!ev.counter};
  });
  results.forEach(r=>{
    if(!r.unit||r.actualDmg<=0) return;
    if(typeof _recordRunStatsDamage==='function') _recordRunStatsDamage(r.actualDmg,r.source&&r.source._damageType||'');
    r.unit._lastDamageWasCounter=!!r.counterDamage;
  });
  coreEvents.filter(ev=>ev&&ev.type==='shield_lost').forEach(ev=>{
    const unit=[...(G.allies||[]),...(G.enemies||[])].find(u=>u&&String(u.id)===String(ev.unitId));
    if(unit){
      const isEnemySide=ev.side==='p2';
      if(typeof playSfx==='function') playSfx(getKeywordEffectSfxKey('結界'),{group:'combat'});
      if(isEnemySide) onEnemyShieldLost(unit); else onAllyShieldLost(unit);
    }
  });
  if(typeof coreApplyLuckyRing==='function'){
    results.forEach(r=>coreApplyLuckyRing(r.unit,r.actualDmg,state,emit));
    _syncCoreResourcesToG(state);
  }

  // コアのサキュバス判定は「通常攻撃の接触で倒した敵」だけを捕獲対象にする。
  // PvEでは通常攻撃のダメージ適用がこの関数へ入るため、コアのrunBattleCoreが
  // 立てる接触印をここでも同じタイミングで立てる。反撃・効果ダメージには印を
  // 付けず、反撃で誤って仲間化する回帰を防ぐ。死亡効果の解決が終わるまで印を
  // 保持し、終了時に元の状態へ戻す。
  _recordBattleTrace('damage_apply_start',{token:injuryDispatchToken,entries:prepared.map(e=>({
    unitId:e.unit&&e.unit.id||null,sourceId:e.source&&e.source.id||null,amount:Number(e.amount)||0,
    counter:!!e._counterDamage,effect:!!e.effect
  }))});

  if(opt.keywordEffect==='毒'&&typeof _recordRunStatsDamage==='function'){
    results.forEach(r=>_recordRunStatsDamage(r.actualDmg,'毒'));
  }
  // PvEの通常攻撃もオンラインと同じ判定イベント列へ記録する。演出の実行は従来経路を使う。
  if(opt.normalAttack&&Array.isArray(G._battleCoreEvents)){
    results.forEach(r=>{
      if(r.unit&&r.unit.hp<=0) G._battleCoreEvents.push({type:'death',side:r.side==='ally'?'p1':'p2',unitId:r.unit.id});
    });
  }

  if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // 生命吸収はバッチ内の全ダメージ（反撃等、攻撃者自身が受ける分も含む）が確定した後に処理する。
  // 攻撃者がこのバッチの中で同時に死亡していた場合は回復しない。
  results.forEach(r=>{
    if(!r.lifeDrain) return;
    const {source,healAmt}=r.lifeDrain;
    if(!source||source.hp<=0) return;
    const _isPlayerAllySrc=(G.allies||[]).includes(source);
    addUnitHp(source,healAmt,_isPlayerAllySrc?'ally':'enemy');
  });

  const damaged=results.filter(r=>r.actualDmg>0);
  damaged.forEach(r=>{ if(r.attackSfxSource&&!r.suppressAttackHitSfx) playAttackDamageSfx(r.attackSfxSource,r.actualDmg); });
  // 同じキャラクターが1バッチ内で複数回ダメージを受けると（攻撃＋効果ダメージ等）、
  // ダメージ数値が同じ位置に重なって読めなくなる。表示自体は従来どおり投げっぱなしの
  // まま、対象ごとに「前の数値が消えてから次を出す」順番待ちだけを入れる。
  // 対象が違う場合は待たないので、複数キャラへの同時ダメージは同時に表示される。
  // 同じ対象へ2件目以降の数値が入った＝表示が重なるキャラクター。
  // 負傷効果を待たせるのはこの場合だけでよい。
  const damageOverlapUnits=new Set();
  damaged.forEach((r,i)=>{
    const key=r.unit&&r.unit.id!=null?`u:${r.unit.id}`:`i:${i}`;
    const show=(useLiveSlot)=>{
      try{
        // 2026-10-11: ライブ効果の旧表示経路も、数値を出す時刻で共通の振動入口を呼ぶ。
        if(typeof presentDamageImpact==='function') presentDamageImpact(r.damageEvent);
        // 数値の重なり防止は対象IDで判定する。矩形（座標）で判定すると、
        // 盤面が詰め直された直後に別位置扱いになり、通常攻撃・反撃・効果ダメージが
        // 同じキャラクターの上で重なって出る。
        const vfxOptions={...(opt.vfxOptions||{}),
          effectSource:(r.effectSource&&_characterVfxAllowedForDamage(r.effectSource))?r.effectSource:null,
          keywordEffect:r.keywordEffect,
          ...(r.unit&&r.unit.id!=null?{labelKey:`u:${r.unit.id}`}:{})};
        // 順番待ちで遅らせた分は保存済み矩形が古くなっている可能性があるため、
        // 現在のDOMスロットから引き直す（取れなければ保存済み矩形へ戻す）。
        if(useLiveSlot&&typeof playHitVfx==='function'&&r.unit){
          return Promise.resolve(playHitVfx(r.side,r.unit,r.actualDmg,vfxOptions)).catch(()=>{});
        }
        if(r.rect&&typeof playHitVfxAtRect==='function'){
          return Promise.resolve(playHitVfxAtRect(r.rect,r.actualDmg,vfxOptions)).catch(()=>{});
        }
        if(typeof playHitVfx==='function'){
          return Promise.resolve(playHitVfx(r.side,r.unit,r.actualDmg,vfxOptions)).catch(()=>{});
        }
      }catch(e){
        console.error('[applyDamageBatch VFX]',e);
      }
      return Promise.resolve();
    };
    // 表示枠を1つ予約する。待ち時刻は present.js が呼び出しをまたいで共有するため、
    // 同じキャラクターへ別経路から同時にダメージが入っても数値は重ならない。
    // 待ちは前の数値が消えるまでではなく、読める最小限だけ（既定150ms）。
    // 効果ダメージが大量に出ても「-1 -1 -1」と連続表示になる。
    const wait=damageLabelGate?Math.max(0,damageLabelGate.reserve(key)):0;
    if(wait<=0){ show(false); return; }
    if(r.unit) damageOverlapUnits.add(r.unit);
    void sleep(wait).then(()=>show(true)).catch(()=>{});
  });
  damaged.filter(r=>r.effectVfxCode).forEach(r=>{
    // マータの分散VFXは分割時に保存した矩形ではなく、ダメージ表示直前の
    // 肩代わり先実DOMから再取得する。人数変化・FLIP中に古い矩形を使うと、
    // VFXだけ元の被弾キャラへ表示される。
    const target=r.effectVfxTarget||r.unit;
    const side=target&&((G.enemies||[]).includes(target)?'enemy':'ally');
    const rect=target&&typeof _captureUnitDamageRect==='function'
      ?_captureUnitDamageRect(target,side):r.effectVfxRect;
    if(!rect||typeof playHitVfxAtRect!=='function') return;
    void Promise.resolve(playHitVfxAtRect(rect,0,{
      effectSource:_effectVfxSource(r.effectVfxCode),gateMs:180,hitDuration:900,vfxScale:.5
    })).catch(()=>{});
  });
  if(typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // 負傷効果は「そのダメージ表示が出てから少し間を置いて」発動させる。
  // 表示開始と同時に走らせると、ダメージ数値より先に負傷効果が動いて見え、
  // 原因（被弾）と結果（負傷効果）の順序が逆に見える。
  // 特にミノタウロスの「直ちに攻撃する」は、被弾表示より先に攻撃し始めて見えていた。
  const injuredAllies=[];
  const injuredAllyUnits=new Set();
  results.forEach(r=>{
    if(!r.needsAllyInjuryEffects||!r.unit||r.unit.hp<=0||injuredAllyUnits.has(r.unit)) return;
    injuredAllyUnits.add(r.unit);
    injuredAllies.push(r);
  });
  const injuredEnemies=[];
  const injuredEnemyUnits=new Set();
  results.forEach(r=>{
    if(!r.needsEnemyInjuryEffects||!r.unit||r.unit.hp<=0||injuredEnemyUnits.has(r.unit)) return;
    injuredEnemyUnits.add(r.unit);
    injuredEnemies.push(r);
  });
  // 味方・敵それぞれで待つと2回ぶん間延びするため、発動前に1回だけ待つ。
  // ただし待つのは「同じキャラクターへ数値が重なって出る」場合だけにする。
  // 1発だけのダメージでも毎回待つと、命中してから戻るまでが常に一拍長くなり、
  // 攻撃が当たるたびに止まって見える。
  const _needsInjuryBeat=[...injuredAllies,...injuredEnemies].some(r=>r&&damageOverlapUnits.has(r.unit));
  if(_needsInjuryBeat) await sleep(INJURY_EFFECT_DELAY_MS);
  for(const r of injuredAllies) await _fireAllyInjuryEffects(r.unit,r.actualDmg,r.source,injuryDispatchToken);
  if(injuredAllies.length&&typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();
  for(const r of injuredEnemies) await _fireEnemyInjuryEffects(r.unit,r.actualDmg,r.source,injuryDispatchToken);
  if(injuredEnemies.length&&typeof _refreshAllUnitStatsUi==='function') _refreshAllUnitStatsUi();

  // VFX終了後に死亡処理を行う。HP0のカード自体はここではまだ盤面から消さない
  // （消去・詰め直しはrequestBattleCompact()経由で、モーション全体が終わってから一度だけ行う）
  const deaths=results.filter(r=>r.unit&&r.unit.hp<=0&&!r.unit._fled);
  if(deaths.length){
    _beginDeathCompactDelay();
    G._resolvingDamageBatchDeaths=(G._resolvingDamageBatchDeaths||0)+1;
    try{
      // 死亡効果の論理解決は従来どおり発生順に行うが、死亡演出の開始は
      // 同時死亡者全員で同じ時点にする。先に1体の死亡効果をawaitすると、
      // 攻撃側の死亡VFXだけが後ろへずれ、同時撃破に見えなくなる。
      deaths.forEach(r=>{
        if(typeof playUnitDeathBurn!=='function') return;
        _playDeathBurnOnce(r.unit,r.side==='enemy');
      });
      for(const r of deaths){
        if(r.side==='enemy') await processEnemyDeath(r.unit,G.enemies.indexOf(r.unit));
        else await processAllyDeath(r.unit);
      }
    } finally {
      G._resolvingDamageBatchDeaths=Math.max(0,(G._resolvingDamageBatchDeaths||0)-1);
      _endDeathCompactDelay();
    }
  }

  attackContactSources.forEach((previous,source)=>{
    if(previous===undefined) delete source._coreAttackContact;
    else source._coreAttackContact=previous;
  });
  return results;
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
    if(typeof playSfx==='function') playSfx(getKeywordEffectSfxKey('結界'),{group:'combat'});
    onAllyShieldLost(unit);
    return false; // ダメージをシールドで防いだ
  }

  const actualDmg=Math.max(0, dmg);
  unit._lastDamageSource=src||unit._lastDamageSource||null;
  unit.hp=Math.max(0,unit.hp-actualDmg);
  if(actualDmg>0&&typeof playHitVfx==='function') playHitVfx('ally',unit,actualDmg);
  // マナ獲得と負傷効果は applyDamageBatch() 後段の
  // _fireAllyInjuryEffects() が共通コアで一度だけ解決する。
  if(dmg>0&&src){
    _applyCoreKeywordOnHitPve(src,unit,actualDmg,unit._preDeathSnapshot&&unit._preDeathSnapshot.hp);
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

// ── 味方の死亡処理 ──────────────────────────────

// 死亡処理は非同期（死亡効果がapplyDamageBatchをawaitする）だが、dealDmgToAlly()等の
// 同期経路からはfire-and-forgetで呼ばれる。最後の味方が倒れた時、解決を待たずに
// ゲームオーバーへ進むと闇の炎などの死亡効果が画面に出ないまま終わるため、
// 解決中の件数を数えてhandleBattleDefeat()側で待てるようにする。
// 2026-10-26：所持金を配分した敵（applyEnemyGoldPlan）を奪った場合、二重払いを避けるため、
// 奪ったキャラが死んだ時点で倒した時と同じ額を得る（終戦まで生き残ったら終戦時。_payStolenEnemyGoldAtEnd）。
function _payStolenEnemyGold(unit){
  if(!unit||!unit._stolen||!unit._goldPlanned||unit._enemyGoldPaid) return 0;
  unit._enemyGoldPaid=true;
  const gold=_rollEnemyGold(unit);
  return gold>0&&typeof onGoldGained==='function'?onGoldGained(gold):0;
}
function _payStolenEnemyGoldAtEnd(){
  (G.allies||[]).forEach(u=>{ if(u&&u.hp>0) _payStolenEnemyGold(u); });
}
async function processAllyDeath(unit){
  _payStolenEnemyGold(unit);
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
    await _applyDeathKeywordEffects(unit,false);
    _onAllyDeathPanelSummons();
    G.battleCounters.deaths++;
    if(typeof _onAnyCharDeath==='function') _onAnyCharDeath(unit);
    _reviveWithHalvedStats(unit,false);
    // 戦闘中に召喚される（蘇生も含む）キャラクターは必ず前衛に置く。
    unit.lane='front';
    // 復活時の旧監視処理は通す。眷属の付与・光の指輪などの召喚時効果は対象外。
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
    _reviveWithHalvedStats(unit,false);
    delete unit._deathProcessing;
    // 根性は「致死ダメージを受けてもHP1で耐える」効果のため、HPが一瞬0になったことで
    // 通常のダメージ処理内（hp>0判定）ではスキップされてしまう負傷トリガーをここで代わりに発動する
    if(reviveKw==='根性'){
      await _fireAllyInjuryEffects(unit,0);
    }
    requestBattleCompact();
    return;
  }
  unit._deathProcessed=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  _playDeathBurnOnce(unit,false);
  await _applyDeathKeywordEffects(unit,false);
  _onAllyDeathPanelSummons();

  G.battleCounters.deaths++;
  if(G.runStats) G.runStats.allyDeaths=(G.runStats.allyDeaths||0)+1;

  // ナグルファル：キャラクター死亡ごとに+2/+1
  _onAnyCharDeath(unit);
  await _resolveSeals();
  if(!G._resolvingDamageBatchDeaths) compactBattleUnitsAfterDeath();
}

// 死亡観測は coreApplyDeathObservers() に一本化したため、旧呼び出し名は互換用の空関数にする。
function _onAnyCharDeath(){ }

// ── シールド喪失時 ──────────────────────────────

async function _applyCoreShieldLostEffectsLive(lostUnit){
  if(!lostUnit||typeof coreApplyShieldLostEffects!=='function') return;
  // コア駆動の戦闘では coreResolveHit() が既に結界喪失効果を解決している。
  // ここで再度呼ぶと、カーバンクル・グリマルキン等が二重に発動する。
  if(G._coreDrivenBattle) return;
  const state={
    units:{p1:G.allies||[],p2:G.enemies||[]}, rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},
    summonDefs:[...(typeof PANEL_POOL!=='undefined'&&Array.isArray(PANEL_POOL)?PANEL_POOL:[]),...(typeof ENEMY_POOL!=='undefined'&&Array.isArray(ENEMY_POOL)?ENEMY_POOL:[])],
    itemDefs:typeof ITEM_POOL!=='undefined'&&Array.isArray(ITEM_POOL)?ITEM_POOL:[],
    items:{p1:Array.isArray(G.activeBattleItems)?G.activeBattleItems:[],p2:[]},
    resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},
    ..._pveCoreStageFields(),
    life:{p1:_currentBattleLife(),p2:0},
    maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},
    blood:{p1:Math.max(0,Number(G._blood)||0),p2:0},
  };
  const touched=[];
  [...state.units.p1,...state.units.p2].forEach((u,i)=>{ if(u){ touched.push([u,u.side,u.slot]); u.side=state.units.p1.includes(u)?'p1':'p2'; u.slot=i; } });
  const before=new Set([...state.units.p1,...state.units.p2].filter(Boolean));
  const localEvents=[];
  const emit=ev=>{ localEvents.push(ev); if(Array.isArray(G._battleCoreEvents)) G._battleCoreEvents.push(ev); };
  // オプションはコアへそのまま渡す（deferTriggers/collect を落とすと誘発順が食い違う）。
  const applyHit=(source,target,amount,counter,skipSourceEffects,skipTough,options)=>
    coreResolveHit(state,source,target,amount,counter,coreMathRng,emit,
      Object.assign({skipSourceEffects:!!skipSourceEffects,skipTough:!!skipTough},options||{}));
  try{ coreApplyShieldLostEffects(lostUnit,state,coreMathRng,emit,applyHit); }
  finally{ touched.forEach(([u,side,slot])=>{ if(side==null)delete u.side;else u.side=side;if(slot==null)delete u.slot;else u.slot=slot; }); }
  await _flushCorePveHitEvents(state,localEvents,before);
}

function onAllyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'ally');
  _applyCoreShieldLostEffectsLive(lostUnit);
}
function onEnemyShieldLost(lostUnit){
  if(typeof updateUnitShieldUi==='function') updateUnitShieldUi(lostUnit,'enemy');
  _applyCoreShieldLostEffectsLive(lostUnit);
}

// ── キーワード効果 ─────────────────────────────

function _applyCoreKeywordOnHitPve(attacker, target, damageDone, targetPreHp, skipLifeDrain){
  if(!attacker||!target||damageDone<=0||typeof coreApplyKeywordOnHit!=='function') return null;
  const attackerSide=(G.allies||[]).includes(attacker)?'p1':'p2';
  const targetSide=(G.allies||[]).includes(target)?'p1':'p2';
  const oldAttackerSide=attacker.side, oldTargetSide=target.side;
  attacker.side=attackerSide; target.side=targetSide;
  const state={rings:{p1:typeof _effectiveRings==='function'?_effectiveRings():[],p2:[]},units:{p1:G.allies||[],p2:G.enemies||[]},resources:{p1:{mana:Number(_ensureMana())||0,gold:Number(G.gold)||0},p2:{mana:0,gold:0}},life:{p1:_currentBattleLife(),p2:0},maxLife:{p1:_currentBattleLifeMax(),p2:_currentBattleLifeMax()},blood:{p1:Math.max(0,Number(G._blood)||0),p2:0}};
  try{
    const result=coreApplyKeywordOnHit(attacker,target,damageDone,targetPreHp,state,()=>{}, {skipLifeDrain:!!skipLifeDrain});
    if(result&&result.cursed&&attacker.hp<=0){
      if(attackerSide==='p1') processAllyDeath(attacker); else processEnemyDeath(attacker,G.enemies.indexOf(attacker));
    }
    return result;
  }finally{
    _syncCoreLifeToG(state);
    if(oldAttackerSide==null) delete attacker.side; else attacker.side=oldAttackerSide;
    if(oldTargetSide==null) delete target.side; else target.side=oldTargetSide;
  }
  /* 旧PvE専用の命中後実装は廃止済み。 */
  /*
  // 呪詛：このキャラクターにダメージを与えたキャラクターは即死する（対象自身の生死やskipLifeDrain経路と無関係に判定する）。
  // attacker側が加護を持つ場合は即死を受けない（他の付与系即死効果と同じ扱い）。
  if(damageDone>0&&attacker&&attacker.hp>0&&!_isAilmentImmune(attacker)){
    const targetKws=_unitPanelKeywords(target);
    if(targetKws.some(k=>k==='呪詛'||/^呪詛\d+$/.test(k))){
      attacker.hp=0;
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
  }
  const _isPlayerAlly=G.allies.some(a=>a===attacker);
  const _gdKw=_isPlayerAlly&&G.hasGoldenDrop?1:0;
  if(!attacker||!target||damageDone<=0) return;
  // 純粋な命中数値・状態異常・生命吸収は共通コアに委譲する。G依存の幸運だけはここで保持する。
  const attackerSide=_isPlayerAlly?'p1':'p2';
  const targetSide=_isPlayerAlly?'p2':'p1';
  const oldAttackerSide=attacker.side, oldTargetSide=target.side;
  attacker.side=attackerSide; target.side=targetSide;
  const ringList=typeof _effectiveRings==='function'?_effectiveRings():[];
  const state={rings:{p1:ringList,p2:ringList},units:{p1:G.allies||[],p2:G.enemies||[]}};
  try{
    const result=coreApplyKeywordOnHit(attacker,target,damageDone,targetPreHp,state,()=>{},
      {skipLifeDrain:!!skipLifeDrain,bonus:_gdKw});
  }finally{
    if(oldAttackerSide==null) delete attacker.side; else attacker.side=oldAttackerSide;
    if(oldTargetSide==null) delete target.side; else target.side=oldTargetSide;
  }
  */
}

// ── 敵へのダメージ処理 ──────────────────────────

// 通常撃破・即死は同じ配分額を一度だけ支払う。保存再生では確定済みの額を使う。
function grantEnemyDefeatGold(unit, event) {
  if (!unit || unit._enemyGoldPaid) return 0;
  unit._enemyGoldPaid = true;
  const gold = G._savedBattleReplaying ? Number(event && event.pveRewardGold) || 0 : _rollEnemyGold(unit);
  if (gold > 0 && typeof onGoldGained === 'function') onGoldGained(gold);
  return gold;
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
    _reviveWithHalvedStats(e,true);
    if(reviveKw==='根性') await _fireEnemyInjuryEffects(e,0);
    requestBattleCompact();
    return;
  }
  e._dp=true;
  if(typeof playSfx==='function') playSfx('death',{group:'combat'});
  _playDeathBurnOnce(e,true);
  G._enemyDeathsThisBattle=(G._enemyDeathsThisBattle||0)+1;
  if(G.runStats) G.runStats.enemyKills=(G.runStats.enemyKills||0)+1;
  await _applyDeathKeywordEffects(e,true);
  // エリート判定：キーワードではなくインデックスで判定（ENEMY_POOLデータにエリートKWが混入しても誤発火しない）
  const _isActualElite=G._isEliteFight&&G._eliteIdx>=0&&eIdx===G._eliteIdx;
  if(_isActualElite) G._eliteKilled=true;
  grantEnemyDefeatGold(e);
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
