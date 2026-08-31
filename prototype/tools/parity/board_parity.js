// ═══════════════════════════════════════
// tools/parity/board_parity.js — 編成→ユニット変換のパリティ検査（段階0）
//
// 同じ魔導板から
//   ・PvE経路（applyNewPanelBattleStart の deploySlotGroup と同じ選択規則）
//   ・オンライン経路（versus.js の buildSelfFormation）
// でユニットを作り、食い違いを列挙する。
//
// index.html からは読み込まない。ブラウザのコンソール（またはClaudeの検証）で
// このファイルの中身を評価してから window.checkBoardParity() を呼ぶ。
//
// 注意：盤面を壊さないこと。永劫の力はカード本体へ加算する副作用があるため、
//       必ず魔導板をディープコピーしてから両経路へ通す。
// ═══════════════════════════════════════

(function () {
  const num = v => Number(v) || 0;
  const str = v => String(v == null ? '' : v);
  const arr = v => (Array.isArray(v) ? v.slice() : []);

  // 比較する形へ両経路の出力を正規化する。
  // オンラインは一部の値を effectData に載せて送るため、ここで同じ場所へ寄せる。
  function normalize(unit) {
    if (!unit) return null;
    const ed = unit.effectData || {};
    return {
      name: str(unit.name),
      lane: str(unit.lane || 'front'),
      atk: num(unit.atk),
      hp: num(unit.hp),
      maxHp: num(unit.maxHp != null ? unit.maxHp : unit.hp),
      color: str(unit.color),
      race: str(unit.race),
      no: str(unit.no),
      desc: str(unit.desc),
      keywords: arr(unit.keywords).map(str).sort(),
      manaCost: num(unit.manaCost || ed.manaCost),
      manaRepeat: !!(unit.manaRepeat || ed.manaRepeat),
      manaThresholdDesc: str(unit._manaThresholdDesc || unit.manaThresholdDesc || ed.manaThresholdDesc),
      extraManaThresholds: arr(unit._extraManaThresholds || ed.extraManaThresholds)
        .map(t => `${num(t.cost)}|${t.repeat ? 1 : 0}|${str(t.desc)}`).sort(),
      manaOnAttack: num(unit.manaOnAttack),
      manaOnInjury: num(unit.manaOnInjury),
      manaOnDeath: num(unit.manaOnDeath),
      goldOnBattleEnd: num(unit.goldOnBattleEnd),
      goldOnDeath: num(unit.goldOnDeath),
      randomItemOnBattleEnd: !!unit.randomItemOnBattleEnd,
      weakenOnHit: num(unit.weakenOnHit),
      effectRepeatBonus: num(unit._effectRepeatBonus || ed.effectRepeatBonus),
      uniteGroups: arr(unit._uniteGroups).map(str).sort(),
      resonanceEffectNames: arr(unit._resonanceEffectNames || ed.effectNames).map(str).sort(),
      adjacentAbilities: arr(unit._adjacentPanelAbilities || ed.adjacentAbilities).map(str).sort(),
      adjacentEffectTexts: arr(unit._adjacentPanelEffectTexts || ed.effectTexts).map(str).sort(),
      strategyCount: num(unit._adjacentPanelStrategyCount || ed.strategyCount),
      summonCount: num(unit.summonCount || 1),
      mapPanelPower: str(unit._mapPanelPower),
      openingDuplicate: !!unit._openingDuplicate,
    };
  }

  // 段階1以降、出撃の決定は共通ビルダー（battle/formation.js）が唯一の実装。
  // ここでは「共通ビルダーの出力」と「オンラインが実際に送る形」を突き合わせ、
  // versus.js の写し取りで値が落ちていないか・並び順が保たれているかを見る。
  // PvE側が共通ビルダーを使っていること自体は offline_online_regression.js が検査する。
  function buildSharedFormation(board) {
    if (typeof buildBoardFormation !== 'function') return [];
    // persistEternal=false：検査で魔導板のカード本体を書き換えない。
    return buildBoardFormation(board, { persistEternal: false }).ordered.map(entry => {
      const u = entry.unit;
      u._paritySlot = entry.slotIdx;
      u._parityBattleSlot = entry.assignedSlot;
      u._parityCopyIndex = entry.copyIndex;
      u.lane = entry.lane;
      return u;
    });
  }

  function diffUnits(a, b) {
    const diffs = [];
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    keys.forEach(k => {
      const av = JSON.stringify(a ? a[k] : undefined);
      const bv = JSON.stringify(b ? b[k] : undefined);
      if (av !== bv) diffs.push(`${k}: PvE=${av} / online=${bv}`);
    });
    return diffs;
  }

  function checkBoardParity() {
    if (typeof _getPartyBoardUnit !== 'function' || typeof buildOnlineSelfFormation !== 'function') {
      return { error: '_getPartyBoardUnit / buildOnlineSelfFormation が見つからない' };
    }
    const live = _getPartyBoardUnit();
    // 永劫の力がカード本体を書き換えるため、必ずコピーへ通す。
    const snapshot = JSON.parse(JSON.stringify(live.equipment || []));
    const restore = () => { live.equipment.length = 0; snapshot.forEach(p => live.equipment.push(p ? JSON.parse(JSON.stringify(p)) : null)); };

    restore();
    const onlineUnits = (buildOnlineSelfFormation() || {}).units || [];
    restore();
    const pveUnits = buildSharedFormation(live);
    restore();

    // 並び順の違いと内容の違いを分けて見る。
    // 突き合わせの鍵は「魔導板のスロット番号＋そのスロットの何体目か」。
    // オンラインのidは `self-<idx>` / `self-<idx>-copy-<n>` なのでそこから復元する。
    const keyOfPve = u => `${num(u._paritySlot)}#${num(u._parityCopyIndex)}`;
    const keyOfOnline = id => {
      const m = String(id || '').match(/^self-(\d+)(?:-copy-(\d+))?$/);
      return m ? `${Number(m[1])}#${m[2] ? Number(m[2]) : 0}` : String(id || '');
    };
    const pveEntries = pveUnits.map(u => ({ key: keyOfPve(u), unit: normalize(u) }));
    const onlineEntries = onlineUnits.map(u => ({ key: keyOfOnline(u.id), unit: normalize(u) }));
    const pveMap = new Map(pveEntries.map(e => [e.key, e.unit]));
    const onlineMap = new Map(onlineEntries.map(e => [e.key, e.unit]));

    const report = {
      pveCount: pveEntries.length,
      onlineCount: onlineEntries.length,
      countMismatch: pveEntries.length !== onlineEntries.length,
      // 生成順（deploySlotGroupの処理順）
      pveGenerationOrder: pveEntries.map(e => `${e.key}:${e.unit.name}`),
      // PvEが希望する最終並び（列マッピング）。同じ戦闘スロットを希望した場合の
      // 衝突解決は_summonPanelUnitToFront側にあり、ここでは再現しない。
      pveDesiredOrder: pveUnits.map(u => `slot${u._paritySlot}→battle${u._parityBattleSlot}:${u.name}`),
      onlineOrder: onlineEntries.map(e => `${e.key}:${e.unit.name}`),
      orderMismatch: false,
      onlyInPve: [], onlyInOnline: [], units: [],
    };
    report.orderMismatch = JSON.stringify(report.pveDesiredOrder.map(x => x.split(':').pop()))
      !== JSON.stringify(report.onlineOrder.map(x => x.split(':').pop()));
    pveMap.forEach((u, k) => { if (!onlineMap.has(k)) report.onlyInPve.push(`${k}:${u.name}`); });
    onlineMap.forEach((u, k) => { if (!pveMap.has(k)) report.onlyInOnline.push(`${k}:${u.name}`); });
    pveMap.forEach((u, k) => {
      if (!onlineMap.has(k)) return;
      const d = diffUnits(u, onlineMap.get(k));
      if (d.length) report.units.push({ key: k, name: u.name, diffs: d });
    });
    report.divergentUnits = report.units.length;
    return report;
  }

  window.checkBoardParity = checkBoardParity;
  window.__parityBuildSharedFormation = buildSharedFormation;
  window.__parityNormalize = normalize;
})();
