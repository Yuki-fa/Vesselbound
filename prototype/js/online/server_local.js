// ═══════════════════════════════════════
// online/server_local.js — ローカルのスタブ「サーバー」
//
// 本番のサーバー権威型へ移行する時は、このファイルの実装だけを差し替える。
// match.js から見える API（下の OnlineServer）は本番と同一に保つこと。
//
// ここが権威を持つもの（クライアントが決めてはいけないもの）
//   - マッチング／相手の編成
//   - 乱数seed
//   - 戦闘の計算結果（sim.jsを呼ぶのはここだけ）
//   - ライフ／ステージ進行／制限時間の締め切り／最終勝敗
//
// すべて非同期（Promise）で返す。本番で通信になっても match.js を書き換えずに済むようにするため。
// ═══════════════════════════════════════

// ステージ構成（サーバーが配る。クライアントは並べ替えない）
//   通常ステージ：一般戦闘, 一般戦闘, オンライン対戦, 街, 一般戦闘×3, オンライン対戦, 塔
//   ステージ5   ：街(フォルセティ), 一般戦闘, 一般戦闘, オンライン対戦
// 通常戦闘は行わず、編成画面だけを挟む。編成3回ごとにオンライン対戦。
//   編成×3 → オンライン対戦 → 街 → 編成×3 → オンライン対戦 → 塔
// ステージ1だけ先頭に「風止みの村 リーゼ」が入る。
const ONLINE_STAGE_FLOW_STANDARD = ['formation', 'formation', 'formation', 'versus', 'city', 'formation', 'formation', 'formation', 'versus', 'tower'];
const ONLINE_STAGE_FLOW_FINAL = ['city', 'formation', 'formation', 'formation', 'versus'];
const ONLINE_STAGE_COUNT = 5;
// 1組の人数。自分＋CPU3人。
const ONLINE_MATCH_SIZE = 4;
// 編成何回でオンライン対戦になるか（ボタン表示「編成完了 1/3」用）。
const ONLINE_FORMATION_PER_VERSUS = 3;

// 制限時間（ミリ秒）。サーバーが締め切りを持ち、クライアントは表示するだけ。
const ONLINE_TIME_LIMIT_MS = {
  // 編成画面の持ち時間は1マスごとではなく、編成に入ってから「編成完了 3/3」までの通し。
  // 1/3→2/3→3/3 では締め切りを引き継ぐ（_advance を参照）。
  // 実際の秒数はステージごとに変わるので ONLINE_FORMATION_TIME_MS を使う。
  formation: 90 * 1000,
  tower: 60 * 1000,     // 塔
  city: 90 * 1000,      // 街
};
// 編成の持ち時間（ステージ別）。ステージ1=90秒、2=120秒、3=150秒、4以降=180秒。
const ONLINE_FORMATION_TIME_MS = [90, 120, 150, 180].map(sec => sec * 1000);
// 編成データの rings/items は、配列でも {p1:[…],p2:[]} の形でも渡ってくる。
// どちらでも「その陣営の配列」を取り出す。形の取り違えで丸ごと失うのを防ぐ。
function _sideList(value, side){
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[side])) return value[side];
  if (value && Array.isArray(value.p1)) return value.p1;
  return [];
}
function onlineFormationTimeMs(stage) {
  const i = Math.max(1, Number(stage) || 1) - 1;
  return ONLINE_FORMATION_TIME_MS[Math.min(i, ONLINE_FORMATION_TIME_MS.length - 1)];
}
// マッチング中、次の参加者が現れるまでの間隔（ミリ秒）。本番では実際の参加を待つ。
const ONLINE_MATCH_JOIN_INTERVAL_MS = 1200;

const ONLINE_START_LIFE = 5;
// 対戦マスを終えた時の報酬ゴールド。金額はサーバーが決める。
const ONLINE_VERSUS_GOLD = 100;

(function () {
  // ── 内部状態（本番ではサーバー側のセッションに相当）──
  const _matches = new Map();
  let _matchSeq = 0;

  const _now = () => Date.now();

  function _stageFlow(stage) {
    // マッチング成立後は編成画面から始める（街には入らない）。
    if (stage >= ONLINE_STAGE_COUNT) return ONLINE_STAGE_FLOW_FINAL.slice();
    return ONLINE_STAGE_FLOW_STANDARD.slice();
  }

  // 参加者のID。本番では実アカウント名に置き換わる。
  const _NAME_POOL = ['Tanaken', 'Mikuriya', 'Alderan', 'Kohaku', 'Selvie', 'Rugner', 'Estelle', 'Byrne'];
  function _makePlayers(rng, selfId) {
    // 先に募集していた人が上に来ることもある（自分の並び順はサーバーが決める）。
    const others = [];
    const used = new Set([selfId]);
    while (others.length < ONLINE_MATCH_SIZE - 1) {
      const base = _NAME_POOL[rng.int(0, _NAME_POOL.length - 1)];
      const name = used.has(base) ? `${base}${rng.int(2, 99)}` : base;
      if (used.has(name)) continue;
      used.add(name);
      others.push(name);
    }
    const selfIndex = rng.int(0, ONLINE_MATCH_SIZE - 1);
    const ids = others.slice();
    ids.splice(selfIndex, 0, selfId);
    return ids.map(id => ({ id, life: ONLINE_START_LIFE, alive: true, self: id === selfId }));
  }

  // 相手（CPU）の編成をseedから決める。本番では実プレイヤーの提出内容に置き換わる。
  // 相手も「他プレイヤーが魔導板に並べたキャラクター」なので、実在のキャラクターカードから選ぶ。
  // （本番では提出された編成がそのまま来るため、このカード表からの抽選ごと不要になる）
  function _opponentCardPool() {
    if (typeof PANEL_POOL === 'undefined' || !Array.isArray(PANEL_POOL)) return [];
    return PANEL_POOL.filter(p => p && p.category === 'キャラクター' && p.rarity !== -1 && p.no);
  }
  function _makeOpponentFormation(rng, stage) {
    const size = Math.min(7, 2 + stage);
    const pool = _opponentCardPool();
    const bonus = Math.max(0, stage - 1);
    const units = [];
    for (let i = 0; i < size; i++) {
      const def = pool.length ? pool[rng.int(0, pool.length - 1)] : null;
      const spec = def && typeof _panelSummonSpec === 'function' ? _panelSummonSpec(def) : null;
      const source = spec || def || {};
      const preview = source && typeof _makePanelSummonUnit === 'function'
        ? _makePanelSummonUnit({ ...source, panelName: def && def.name }, []) : null;
      const unit = preview || source;
      units.push({
        id: `cpu-${stage}-${i}`,
        no: def ? String(def.no || source.no || '') : '',
        name: def ? String(unit.name || def.name || '') : `対戦相手${i + 1}`,
        atk: Math.max(0, Number(unit.atk ?? def.power) || 0) + bonus,
        hp: Math.max(1, Number(unit.hp ?? def.life) || 1) + bonus,
        lane: i < Math.ceil(size * 0.6) ? 'front' : 'rear',
        color: def ? String(unit.color || def.color || '') : '',
        race: def ? String(unit.race || def.race || '') : '',
        grade: def ? (Number(def.grade) || 1) : 1,
        desc: def ? String(unit.desc || def.desc || '') : '',
        sfxType: def ? String(unit.sfxType || def.sfxType || '') : '',
        keywords: Array.isArray(unit.keywords) ? unit.keywords.slice() : (Array.isArray(def && def.keywords) ? def.keywords.slice() : []),
        poison: Number(unit.poison ?? def.poison) || 0,
        weakenOnHit: Number(unit.weakenOnHit ?? def.weakenOnHit) || 0,
        manaOnAttack: Number(unit.manaOnAttack ?? def.manaOnAttack) || 0,
        manaOnInjury: Number(unit.manaOnInjury ?? def.manaOnInjury) || 0,
        manaOnDeath: Number(unit.manaOnDeath ?? def.manaOnDeath) || 0,
        goldOnBattleEnd: Number(unit.goldOnBattleEnd ?? def.goldOnBattleEnd) || 0,
        goldOnDeath: Number(unit.goldOnDeath ?? def.goldOnDeath) || 0,
        randomItemOnBattleEnd: !!(unit.randomItemOnBattleEnd ?? def.randomItemOnBattleEnd),
        randomItemCost: Number(unit.randomItemCost ?? def.randomItemCost) || 0,
        manaCost: Number(unit.manaCost ?? def.manaCost ?? def.costMana) || 0,
        manaRepeat: !!(unit.manaRepeat ?? def.manaRepeat),
        manaThresholdDesc: String(unit.manaThresholdDesc ?? unit._manaThresholdDesc ?? def.manaThresholdDesc ?? def._manaThresholdDesc ?? ''),
        manaThresholdNo: String(unit.manaThresholdNo ?? unit._manaThresholdNo ?? def.manaThresholdNo ?? def._manaThresholdNo ?? ''),
        manaThresholdOrder: unit.manaThresholdOrder ?? unit._manaThresholdOrder ?? def.manaThresholdOrder ?? def._manaThresholdOrder,
        manaOrder: unit.manaOrder ?? def.manaOrder,
        fxCode: String(unit.fxCode ?? def.fxCode ?? ''),
        extraManaThresholds: Array.isArray(unit.extraManaThresholds)
          ? unit.extraManaThresholds.map(x => ({ ...x }))
          : (Array.isArray(def.extraManaThresholds) ? def.extraManaThresholds.map(x => ({ ...x })) : []),
        _adjacentPanelAbilities: Array.isArray(unit._adjacentPanelAbilities) ? unit._adjacentPanelAbilities.slice() : [],
        _releaseAtkBonus: Number(unit._releaseAtkBonus ?? def._releaseAtkBonus ?? def.releaseAtkBonus) || 0,
        _releaseHpBonus: Number(unit._releaseHpBonus ?? def._releaseHpBonus ?? def.releaseHpBonus) || 0,
        equipment: Array.isArray(unit.equipment) ? unit.equipment.map(x => ({ ...x })) : [],
        effectData: {
          ...(def && def.effectData && typeof def.effectData === 'object' ? def.effectData : {}),
          ...(unit.effectData && typeof unit.effectData === 'object' ? unit.effectData : {}),
        },
      });
    }
    return { units };
  }

  function _match(matchId) {
    const m = _matches.get(String(matchId));
    if (!m) throw new Error('online: unknown matchId ' + matchId);
    return m;
  }

  // 権威状態のうち、クライアントへ渡してよい形だけを返す。
  // match.js はこの戻り値を保持するだけで、値を自分で書き換えてはいけない。
  function _publicState(m) {
    return {
      matchId: m.matchId,
      protocolVersion: ONLINE_PROTOCOL_VERSION,
      stage: m.stage,
      step: m.step,
      stageFlow: _stageFlow(m.stage),
      nodeType: _stageFlow(m.stage)[m.step] || null,
      life: { self: m.life.self, opponent: m.life.opponent },
      phase: m.phase,                 // 'formation' | 'city' | 'tower' | 'battle' | 'finished'
      deadlineAt: m.deadlineAt,       // 制限時間の締め切り（epoch ms）。nullなら無期限
      selfReady: m.ready.self,
      opponentReady: m.ready.opponent,
      finished: m.phase === 'finished',
      result: m.result,               // 'clear' | 'gameover' | null（サーバーが決める）
      opponentWasGameOver: m.opponentWasGameOver,
      // ── 4人マッチの参加者。並び順もサーバーが決める（クライアントで並べ替えない）──
      matchSize: ONLINE_MATCH_SIZE,
      matching: m.matching,           // マッチング中か
      joined: m.players.length,       // 現在の参加人数
      players: m.players.map(p => ({ id: p.id, life: p.life, alive: p.alive, self: !!p.self })),
      selfId: m.selfId,
      nextOpponentId: m.nextOpponentId,
      // 「編成完了 1/3」表示用。versusまであと何回の編成か。
      formationIndex: m.formationIndex,
      formationTotal: ONLINE_FORMATION_PER_VERSUS,
    };
  }

  // 現在のマス種別から、その画面の制限時間を決める。
  function _phaseForNode(nodeType) {
    if (nodeType === 'city') return 'city';
    if (nodeType === 'tower') return 'tower';
    return 'formation'; // formation / versus
  }
  // 次のオンライン対戦までに残っている編成回数を数える（表示用）。
  function _updateFormationIndex(m) {
    const flow = _stageFlow(m.stage);
    let count = 0;
    for (let i = 0; i <= m.step && i < flow.length; i++) {
      if (flow[i] === 'formation') count++;
      else if (flow[i] === 'versus') count = 0;
    }
    m.formationIndex = count;
  }
  // 次に戦う相手（発光させる枠）をサーバーが決める。
  function _updateNextOpponent(m) {
    const alive = m.players.filter(p => p && p.alive && !p.self);
    m.nextOpponentId = alive.length ? alive[m.rng.int(0, alive.length - 1)].id : null;
  }

  function _armDeadline(m) {
    const limit = m.phase === 'formation'
      ? onlineFormationTimeMs(m.stage)
      : ONLINE_TIME_LIMIT_MS[m.phase];
    m.deadlineAt = limit ? _now() + limit : null;
    m.ready.self = false;
    m.ready.opponent = false;
  }

  // 双方が準備完了、または締め切り到達で次のマスへ進む。
  // 「2人が常に同じタイミングで次へ進む」ため、進行の決定はここに集約する。
  function _advance(m) {
    const flow = _stageFlow(m.stage);
    const prevNode = flow[m.step] || null;
    m.step++;
    if (m.step >= flow.length) {
      m.step = 0;
      m.stage++;
      if (m.stage > ONLINE_STAGE_COUNT) {
        m.phase = 'finished';
        // 最後まで生き残った＝相手のライフを0にしたものとして扱う（仕様）。
        if (!m.result) m.result = m.life.self > 0 ? 'clear' : 'gameover';
        m.deadlineAt = null;
        return;
      }
    }
    const nextNode = _stageFlow(m.stage)[m.step];
    m.phase = _phaseForNode(nextNode);
    _updateFormationIndex(m);
    // 対戦相手は編成3回の途中では固定し、対戦マスへ入る時だけ更新する。
    if (nextNode === 'versus') _updateNextOpponent(m);
    // 編成→編成は同じ持ち時間の続き。ここで締め切りを引き直すと
    // 1マスごとに90秒与えることになってしまう。
    if (nextNode === 'formation' && prevNode === 'formation' && m.deadlineAt) {
      m.ready.self = false;
      m.ready.opponent = false;
    } else {
      _armDeadline(m);
    }
  }

  const OnlineServer = {
    // マッチングを要求する。相手が見つかった状態のマッチIDを返す。
    requestMatch(opts) {
      const seedSource = (opts && opts.seedSource) || `match-${++_matchSeq}-${_now()}`;
      const matchId = `m${_matchSeq}`;
      const seed = onlineSeedFromString(seedSource);
      const rng = createSeededRng(seed);
      const selfId = String((opts && opts.selfId) || 'あなた');
      const roster = _makePlayers(rng, selfId);
      const m = {
        matchId,
        seed,
        rng,
        selfId,
        roster,                 // 4人揃った時の最終的な並び（サーバーが決める）
        players: [],            // 現在までに参加した人（マッチング演出用）
        matching: true,
        joinAt: _now(),
        stage: 1,
        step: 0,
        life: { self: ONLINE_START_LIFE, opponent: ONLINE_START_LIFE },
        ready: { self: false, opponent: false },
        phase: 'matching',
        deadlineAt: null,
        result: null,
        opponentWasGameOver: false,
        selfFormation: null,
        nextOpponentId: null,
        formationIndex: 0,
      };
      // 自分より先に募集していた人がいることもある。自分の位置までを最初の参加者とする。
      const selfIdx = roster.findIndex(p => p.self);
      m.players = roster.slice(0, selfIdx + 1);
      _matches.set(matchId, m);
      return Promise.resolve(_publicState(m));
    },

    // いま表示すべき権威状態を取る（ポーリング用）。締め切り超過はここで進行させる。
    getState(matchId) {
      const m = _match(matchId);
      if (m.matching) {
        // 本番では実際の参加通知。ここでは一定間隔で1人ずつ増える。
        const want = Math.min(ONLINE_MATCH_SIZE,
          m.players.length + Math.floor((_now() - m.joinAt) / ONLINE_MATCH_JOIN_INTERVAL_MS));
        while (m.players.length < want) m.players.push(m.roster[m.players.length]);
        if (m.players.length >= ONLINE_MATCH_SIZE) {
          m.matching = false;
          m.phase = _phaseForNode(_stageFlow(m.stage)[m.step]);
          _updateFormationIndex(m);
          _updateNextOpponent(m);
          _armDeadline(m);
        }
        return Promise.resolve(_publicState(m));
      }
      // 編成マスは締め切りを共有しているので、時間切れなら残りの編成を飛ばして対戦マスまで進む。
      // （新しい締め切りが張られた時点でループは止まる）
      let guard = 0;
      while (m.phase !== 'finished' && m.deadlineAt && _now() >= m.deadlineAt && guard++ < 64) _advance(m);
      return Promise.resolve(_publicState(m));
    },

    // 自分の準備完了（戦闘開始／出発する）を通知する。
    // 相手（CPU）は締め切りまでのランダムなタイミングで準備完了になる。
    setReady(matchId, formation) {
      const m = _match(matchId);
      if (m.phase === 'finished') return Promise.resolve(_publicState(m));
      m.ready.self = true;
      if (formation) m.selfFormation = formation;
      const node = _stageFlow(m.stage)[m.step];
      // 編成1/3・2/3は自分だけの操作なので、相手を待たずにすぐ次の編成画面へ進む。
      // 相手を待つのは、対戦マスの直前になる「編成完了 3/3」だけ。
      if (node === 'formation' && m.formationIndex < ONLINE_FORMATION_PER_VERSUS) { _advance(m); return Promise.resolve(_publicState(m)); }
      // 相手の準備完了はサーバーが決める（クライアントからは見えない内部判断）。
      if (!m.ready.opponent) m.ready.opponent = m.rng.next() < 0.85;
      if (m.ready.self && m.ready.opponent) _advance(m);
      return Promise.resolve(_publicState(m));
    },

    // オンライン対戦マスの戦闘結果を取る。乱数も計算もサーバー側で完結させる。
    // クライアントは events を再生し、outcome をそのまま表示するだけ。
    resolveVersusBattle(matchId, selfFormation) {
      const m = _match(matchId);
      const battleSeed = onlineSeedFromString(`${m.matchId}:${m.stage}:${m.step}:${m.seed}`);
      const rng = createSeededRng(battleSeed);
      // 相手がCPU戦でゲームオーバーになっていた場合、その編成・ライフ1で戦う（仕様）。
      const opponent = _makeOpponentFormation(rng, m.stage);
      const sim = simulateOnlineBattle({
        seed: battleSeed,
        sides: {
          p1: { units: (selfFormation && selfFormation.units) || [] },
          p2: opponent,
        },
        resources: selfFormation && selfFormation.resources,
        // buildSelfFormation() は rings/items を {p1:[…],p2:[]} の形で返す。
        // そのまま p1 へ入れると配列ではなくなり、createBattleState() の
        // Array.isArray 判定で弾かれて**指輪もアイテムも全て失われる**
        // （オンラインで光の指輪などが効かない原因だった）。
        // 配列でも {p1:[…]} でも受けられるようにして取り違えを防ぐ。
        rings: {
          p1: _sideList(selfFormation && selfFormation.rings, 'p1'),
          p2: _sideList(opponent && opponent.rings, 'p2'),
        },
        items: {
          p1: _sideList(selfFormation && selfFormation.items, 'p1'),
          p2: _sideList(opponent && opponent.items, 'p2'),
        },
        summonDefs: [
          ...(typeof PANEL_POOL !== 'undefined' && Array.isArray(PANEL_POOL) ? PANEL_POOL : []),
          ...(typeof ENEMY_POOL !== 'undefined' && Array.isArray(ENEMY_POOL) ? ENEMY_POOL : []),
        ],
        itemDefs: typeof ITEM_POOL !== 'undefined' && Array.isArray(ITEM_POOL) ? ITEM_POOL : [],
      });
      // ライフの増減もサーバーが決める。引き分けは双方ライフを失わない。
      const selfP = m.players.find(p => p.self);
      const foeP = m.players.find(p => p.id === m.nextOpponentId) || m.players.find(p => !p.self && p.alive);
      const lose = p => { if (!p) return; p.life = Math.max(0, p.life - 1); if (p.life <= 0) p.alive = false; };
      if (sim.outcome === ONLINE_OUTCOME_P1) lose(foeP);
      else if (sim.outcome === ONLINE_OUTCOME_P2) lose(selfP);
      m.life.self = selfP ? selfP.life : 0;
      m.life.opponent = foeP ? foeP.life : 0;
      const aliveOthers = m.players.filter(p => p && p.alive && !p.self).length;
      if (selfP && !selfP.alive) { m.phase = 'finished'; m.result = 'gameover'; m.deadlineAt = null; }
      else if (aliveOthers === 0) { m.phase = 'finished'; m.result = 'clear'; m.deadlineAt = null; }
      // 対戦マスに制限時間は無い（戦闘の再生中に次のマスの持ち時間が減らないようにする）。
      // 次のマスへ進むのは、再生の完了が報告された時（reportVersusPlaybackDone）。
      else m.deadlineAt = null;
      return Promise.resolve({
        battleId: `${m.matchId}-${m.stage}-${m.step}`,
        protocolVersion: sim.version,
        seed: sim.seed,
        events: sim.events,
        outcome: sim.outcome,      // ← 表示はこれをそのまま使う
        endReason: sim.endReason,
        finalState: sim.finalState,
        // 演出用。戦闘コアはルールに要る値しか持たないので、絵・説明はここで添える。
        formations: { p1: { units: (selfFormation && selfFormation.units) || [] }, p2: opponent },
        goldReward: ONLINE_VERSUS_GOLD,
        state: _publicState(m),
      });
    },

    // 対戦の再生が終わったことの報告。ここで初めて次のマスへ進め、その持ち時間を張る。
    // 本番では再生完了の通知＋サーバー側のタイムアウトで同じことを行う。
    reportVersusPlaybackDone(matchId) {
      const m = _match(matchId);
      if (m.phase !== 'finished' && !m.matching && _stageFlow(m.stage)[m.step] === 'versus') _advance(m);
      return Promise.resolve(_publicState(m));
    },

    // 通常戦闘（CPU）でゲームオーバーになったことを通知する。
    // 仕様上、相手には通知されない＝ここでは自分の状態だけを更新する。
    reportSelfGameOver(matchId) {
      const m = _match(matchId);
      const selfP = m.players.find(p => p.self);
      if (selfP) { selfP.life = 0; selfP.alive = false; }
      m.life.self = 0;
      m.phase = 'finished';
      m.result = 'gameover';
      m.deadlineAt = null;
      return Promise.resolve(_publicState(m));
    },
  };

  if (typeof window !== 'undefined') {
    window.OnlineServer = OnlineServer;
    window.ONLINE_STAGE_FLOW_STANDARD = ONLINE_STAGE_FLOW_STANDARD;
    window.ONLINE_STAGE_FLOW_FINAL = ONLINE_STAGE_FLOW_FINAL;
    window.ONLINE_STAGE_COUNT = ONLINE_STAGE_COUNT;
    window.ONLINE_TIME_LIMIT_MS = ONLINE_TIME_LIMIT_MS;
    window.ONLINE_FORMATION_TIME_MS = ONLINE_FORMATION_TIME_MS;
    window.onlineFormationTimeMs = onlineFormationTimeMs;
    window.ONLINE_START_LIFE = ONLINE_START_LIFE;
    window.ONLINE_VERSUS_GOLD = ONLINE_VERSUS_GOLD;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OnlineServer, ONLINE_STAGE_FLOW_STANDARD, ONLINE_STAGE_FLOW_FINAL, ONLINE_STAGE_COUNT, ONLINE_TIME_LIMIT_MS, ONLINE_START_LIFE };
  }
})();
