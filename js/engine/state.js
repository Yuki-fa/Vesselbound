// ═══════════════════════════════════════
// state.js — ゲーム状態とユーティリティ
// 依存: constants.js, rings.js, spells.js
// ═══════════════════════════════════════

// ゲームのグローバル状態
let G={};

// ユーティリティ
const uid      = ()    => '_'+Math.random().toString(36).slice(2,8);
const randFrom = a     => a[Math.floor(Math.random()*a.length)];
const randi    = (a,b) => a+Math.floor(Math.random()*(b-a+1));
const clone    = o     => JSON.parse(JSON.stringify(o));

function initState(){
  G={
    floor:1, life:20, gold:0, rewardLv:1, rewardLvInvested:0,
    rings:[], spells:[],
    allies:[], enemies:[],
    moveMasks:[], visibleMoves:[],
    turn:0, phase:'init',
    actionsPerTurn:1, actionsLeft:0,
    ringSlots:5, wandSlots:2, consumSlots:2, // 動的スロット数（指輪上限7、杖+消耗品合計上限7）
    lastDead:null, fogNext:false,
    prevNodeType:'battle', earnedGold:0,
    spreadActive:false,
    spreadMult:0,
    battleCounters:{damage:0,deaths:0,summons:0,deathTriggerNext:10,damageTriggerNext:12},
    buffAdjBonuses:{},  // ringId→{atk,hp} 永続累積ボーナス
    rewardTaken:false,
  };
  // 初期装備
  G.rings=[clone(RING_POOL[0])];                       // 狼の指輪
  const fireWand=clone(SPELL_POOL[0]); fireWand.usesLeft=5; fireWand._maxUses=5;
  const hateWand=clone(SPELL_POOL[1]); hateWand.usesLeft=randUses(); hateWand._maxUses=hateWand.usesLeft;
  G.spells=[fireWand, hateWand];                       // 炎の杖, ヘイトの杖（3枠目は空）
}
