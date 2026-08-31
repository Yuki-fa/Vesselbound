// ═══════════════════════════════════════
// battle/formation.js — 魔導板 → 出撃ユニットへの変換（PvE／オンライン共通）
//
// 「どのスロットが出撃するか」「前衛か後衛か」「何体出るか」「どの順に並ぶか」を
// ここだけで決める。DOM配置・イベント送信は呼び出し側の担当。
//
// ここで乱数を引かないこと。勝敗・ダメージも計算しないこと。
// 以前はPvE（applyNewPanelBattleStart）とオンライン（versus.js）が別実装で、
// レーン判定と出撃順が食い違っていた。二重実装へ戻さないこと。
// ═══════════════════════════════════════

// 出撃するスロットを、PvEの出撃順（グループ順・各グループは末尾から）で列挙する。
// 並び自体は _battleSlotForMainBoardSlot() の希望スロットで最終的に決まるが、
// 希望スロットが衝突したときの解決順が生成順に依存するため、順序を保つ。
function formationDeploySlots(board) {
  const equip = (board && Array.isArray(board.equipment)) ? board.equipment : [];
  const frontSlots = (typeof MAIN_BOARD_FRONT_SLOTS !== 'undefined' && MAIN_BOARD_FRONT_SLOTS) || [1, 3];
  const rearSlots = (typeof MAIN_BOARD_REAR_SLOTS !== 'undefined' && MAIN_BOARD_REAR_SLOTS) || [10, 12, 14];
  const baseDeploy = new Set([...frontSlots, ...rearSlots]);
  const powerAt = idx => (typeof _mapPanelPowerAt === 'function') ? _mapPanelPowerAt(idx)
    : ((typeof mapPanelPowerIdAt === 'function') ? mapPanelPowerIdAt(idx) : '');
  const powered = Object.keys((typeof G !== 'undefined' && G && G.mapPanelPowers) || {})
    .map(n => parseInt(n, 10))
    .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < equip.length
      && !baseDeploy.has(idx) && powerAt(idx));
  const groups = [
    { slots: frontSlots, toRear: false },
    { slots: rearSlots, toRear: true },
    { slots: powered.filter(i => i < 10), toRear: false },
    { slots: powered.filter(i => i >= 10), toRear: true },
  ];
  const out = [];
  groups.forEach(g => {
    // PvEのdeploySlotGroupは末尾から処理する。生成順＝衝突解決順なので合わせる。
    for (let oi = g.slots.length - 1; oi >= 0; oi--) out.push({ idx: g.slots[oi], toRear: g.toRear });
  });
  return out;
}

// _summonPanelUnitToFront/Rear と同じ「希望スロット→空いていなければ近い順」の解決。
// 盤面配列を触らずに最終的な並びを知るため、占有集合だけで同じ判定を行う。
function formationAssignSlot(occupied, preferredSlot, from, to) {
  const free = i => i >= from && i < to && !occupied.has(i);
  if (Number.isInteger(preferredSlot) && free(preferredSlot)) return preferredSlot;
  const span = to - from;
  for (let distance = 1; distance < span; distance++) {
    const left = preferredSlot - distance;
    const right = preferredSlot + distance;
    if (free(left)) return left;
    if (free(right)) return right;
  }
  return -1;
}

// 魔導板から出撃ユニットを作る。戻り値の entries は「PvEの生成順」。
// 画面・イベント上の並びは entry.assignedSlot の昇順。
//
// opts.persistEternal … 永劫の力の+1/+1をカード本体へ永久加算するか。
//   PvE=true（従来どおり次戦闘以降も残る）／オンライン=false（その戦闘だけ）。
//   ここは意図的な差分なので、変える場合はAGENTS.mdの登録表を更新すること。
function buildBoardFormation(board, opts) {
  const options = opts || {};
  const persistEternal = !!options.persistEternal;
  const equip = (board && Array.isArray(board.equipment)) ? board.equipment : [];
  const max = (typeof MAX_ALLIES !== 'undefined' && MAX_ALLIES) || 14;
  const frontCount = Math.min((typeof ENEMY_FRONT_SLOTS !== 'undefined' && ENEMY_FRONT_SLOTS) || 7, max);
  const occupiedFront = new Set();
  const occupiedRear = new Set();
  const entries = [];

  formationDeploySlots(board).forEach(({ idx, toRear }) => {
    const panel = equip[idx];
    if (!panel) return;
    if (typeof _panelSummonSpec !== 'function') return;
    const spec = _panelSummonSpec(panel);
    if (!spec) return;
    const panelPower = (typeof _mapPanelPowerAt === 'function') ? _mapPanelPowerAt(idx)
      : ((typeof mapPanelPowerIdAt === 'function') ? mapPanelPowerIdAt(idx) : '');
    // 永劫の力：戦闘開始のたびに+1/+1。基礎値から再構成せず現在値へ累積する。
    let sourcePanel = panel;
    if (panelPower === 'eternal') {
      const nextPower = (Number(panel.power != null ? panel.power : panel.atk) || 0) + 1;
      const nextLife = (Number(panel.life != null ? panel.life : panel.hp) || 1) + 1;
      if (persistEternal) {
        panel.power = nextPower; panel.life = nextLife;
        if (panel.atk != null) panel.atk = panel.power;
        if (panel.hp != null) panel.hp = panel.life;
      } else {
        sourcePanel = { ...panel, power: nextPower, life: nextLife };
        if (panel.atk != null) sourcePanel.atk = nextPower;
        if (panel.hp != null) sourcePanel.hp = nextLife;
      }
      spec.atk = nextPower;
      spec.hp = nextLife;
    }
    const openingCopy = /^開戦\s*[：:]\s*コピーを1体召喚する/.test(String(spec.desc || ''));
    const rawCount = Math.max(1, Number(spec.count) || 1);
    const baseCount = openingCopy ? 1 : rawCount + (panelPower === 'duplicate' ? 1 : 0);
    const enh = (typeof _collectAdjacentEnhancements === 'function') ? _collectAdjacentEnhancements(board, idx) : null;
    const contributingPanels = (typeof _collectEnhancementPanelsForSlot === 'function')
      ? _collectEnhancementPanelsForSlot(board, idx) : [];
    const openingCopyExtra = (baseCount > 1 && typeof _panelEffectKeywordCount === 'function')
      ? _panelEffectKeywordCount(contributingPanels, '恩寵') : 0;
    const desiredSlot = (typeof _battleSlotForMainBoardSlot === 'function')
      ? _battleSlotForMainBoardSlot(idx, toRear) : -1;

    for (let n = 0; n < baseCount + openingCopyExtra; n++) {
      // enh.keywordsは_applyAdjacentPanelEnhancements()側で付与する。ここで渡すと
      // 同じキーワードが二重に加算され、逆襲・闇の儀式等の回数依存効果がずれる。
      const unit = (typeof _makePanelSummonUnit === 'function')
        ? _makePanelSummonUnit({ ...spec, panelName: panel.name, summonCount: openingCopy ? 1 : baseCount }, [])
        : null;
      if (!unit) continue;
      unit._mapPanelPower = panelPower;
      if (n > 0 && panelPower === 'duplicate') unit._openingDuplicate = true;
      if (enh && typeof _applyAdjacentPanelEnhancements === 'function') _applyAdjacentPanelEnhancements(unit, enh);
      unit._mainBoardSlot = idx;
      unit.lane = toRear ? 'rear' : 'front';
      unit._battleSlot = desiredSlot;
      const occupied = toRear ? occupiedRear : occupiedFront;
      const assignedSlot = formationAssignSlot(occupied, desiredSlot,
        toRear ? frontCount : 0, toRear ? max : frontCount);
      if (assignedSlot >= 0) occupied.add(assignedSlot);
      entries.push({
        slotIdx: idx, toRear, lane: unit.lane, panel, sourcePanel, spec, unit,
        contributingPanels, panelPower, copyIndex: n, baseCount, openingCopy,
        desiredSlot, assignedSlot,
      });
    }
  });

  // 画面・イベント上の並び。assignedSlot が付かなかった分（枠溢れ）は末尾へ。
  const ordered = entries.slice().sort((a, b) => {
    const av = a.assignedSlot < 0 ? Number.MAX_SAFE_INTEGER : a.assignedSlot;
    const bv = b.assignedSlot < 0 ? Number.MAX_SAFE_INTEGER : b.assignedSlot;
    return av - bv || entries.indexOf(a) - entries.indexOf(b);
  });
  return { entries, ordered };
}

if (typeof window !== 'undefined') {
  window.formationDeploySlots = formationDeploySlots;
  window.formationAssignSlot = formationAssignSlot;
  window.buildBoardFormation = buildBoardFormation;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formationDeploySlots, formationAssignSlot, buildBoardFormation };
}
