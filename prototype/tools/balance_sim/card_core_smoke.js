'use strict';

// 通常モードのカード／強化カードを共通コアの各トリガ入口へ投入するスモーク検証。
// 数値結果の仕様テストは offline_online_regression.js が担当し、ここでは全データが
// 開戦・攻撃・負傷・死亡・マナ閾値・終戦の流れで例外なく処理できることを確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const core = require('../../js/battle/core');
const SaveMigrations = require('../../js/save/migrations');
const sheetData = require('./sheet_data');
const {createSeededRng} = require('../../js/online/protocol');

const ROOT = path.resolve(__dirname, '../..');

// ブラウザと同じ読み込み順で loader.js を動かし、シート列から作られた
// 通常形／合体形を検査する。コアの単体テストだけでは mergedForm の生成漏れを拾えない。
function runtimeCatalogSnapshot() {
  const script = String.raw`
    const fs=require('fs'),vm=require('vm');
    require('./tools/balance_sim/stub');
    console.log=()=>{};console.warn=()=>{};console.table=()=>{};
    for(const file of ['js/engine/constants.js','js/data/floors.js','js/data/events.js',
      'js/data/local_xlsx_data.js','js/data/loader.js','js/data/units.js','js/engine/state.js','js/engine/pool.js']){
      vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
    }
    const codeOf=value=>String(value&&value.no||value&&value.No||value&&value['No.']||'').toUpperCase();
    const view=code=>{
      const base=PANEL_POOL.find(card=>card&&card.category==='エンチャント'&&codeOf(card)===code);
      if(!base) return null;
      const merged=JSON.parse(JSON.stringify(base));
      if(typeof applyMergedPanelForm==='function') applyMergedPanelForm(merged);
      const pick=card=>({name:card.name,desc:card.desc,adjacentKeywords:card.adjacentKeywords||[],
        adjacentAtkBonus:Number(card.adjacentAtkBonus)||0,adjacentHpBonus:Number(card.adjacentHpBonus)||0,
        initial:!!card.initial,reward:!!card._rewardAvailable,shop:!!card._shopAvailable});
      return {base:pick(base),merged:pick(merged)};
    };
    (async()=>{
      await loadGameData();
      const rings=Object.fromEntries(RING_POOL.filter(r=>['R041','R042','R043'].includes(codeOf(r)))
        .map(r=>[codeOf(r),{name:r.name,desc:r.desc}]));
      const out={panels:Object.fromEntries(['E002','E003','E014','E026','E034'].map(code=>[code,view(code)])),
        hasRetiredE015:PANEL_POOL.some(card=>card&&card.category==='エンチャント'&&codeOf(card)==='E015'),rings};
      process.stdout.write(JSON.stringify(out));
    })().catch(error=>{process.stderr.write(error.stack||String(error));process.exit(1);});
  `;
  return JSON.parse(cp.execFileSync(process.execPath, ['-e', script], {cwd: ROOT, encoding: 'utf8'}));
}

function assertSheetDrivenMergedForms() {
  const catalog = runtimeCatalogSnapshot();
  assert.deepEqual([catalog.panels.E002.base.adjacentAtkBonus, catalog.panels.E002.base.adjacentHpBonus,
    catalog.panels.E002.merged.adjacentAtkBonus, catalog.panels.E002.merged.adjacentHpBonus], [0, 5, 0, 10],
  'E002の通常／合体HPがシート値と一致しない');
  assert.deepEqual([catalog.panels.E003.base.adjacentAtkBonus, catalog.panels.E003.base.adjacentHpBonus,
    catalog.panels.E003.merged.adjacentAtkBonus, catalog.panels.E003.merged.adjacentHpBonus], [3, 2, 6, 4],
  'E003の通常／合体値がシート値と一致しない');
  assert.match(catalog.panels.E026.base.desc, /^常時：/, 'E026が常時効果として読み込まれていない');
  assert.match(catalog.panels.E026.merged.desc, /味方の数の2倍/, 'E026合体効果の倍率がシートから読まれていない');
  assert.deepEqual([catalog.panels.E034.base.adjacentAtkBonus, catalog.panels.E034.base.adjacentHpBonus,
    catalog.panels.E034.merged.adjacentAtkBonus, catalog.panels.E034.merged.adjacentHpBonus], [8, -3, 16, -3],
  'E034合体時にHP減少まで機械的に倍化されている');
  assert.equal(catalog.panels.E014.base.name, '多段攻撃', 'E014の改名が反映されていない');
  assert.deepEqual(catalog.panels.E014.base.adjacentKeywords, ['二段攻撃'], 'E014通常キーワードが不正');
  assert.deepEqual(catalog.panels.E014.merged.adjacentKeywords, ['三段攻撃'], 'E014合体キーワードが不正');
  assert.deepEqual([catalog.panels.E014.base.initial,catalog.panels.E014.base.reward,catalog.panels.E014.base.shop],
    [false,true,true], 'E014の初期／報酬／ショップ設定が不正');
  assert.equal(catalog.hasRetiredE015, false, '廃止E015が実行時プールに残っている');
  assert.deepEqual(catalog.rings, {
    R041:{name:'憎悪の指輪',desc:'開戦：全ての敵は三方向攻撃を得る。'},
    R042:{name:'呪いの指輪',desc:'開戦：全ての敵は+5/+5を得る。'},
    R043:{name:'破滅の指輪',desc:'開戦：全ての敵は結界1を得る。'},
  }, 'R041〜R043の番号または効果文がシートと一致しない');
}

function assertCatalogMigrations() {
  const run = SaveMigrations.migrate('run', {saveVersion:3,gameVersion:'old',state:{owned:[
    {id:'panel_triple_attack',no:'015',name:'三段攻撃',category:'エンチャント',adjacentKeywords:['三段攻撃']},
    {id:'ring_呪いの指輪',no:'043',name:'呪いの指輪',type:'ring',art:'assets/art/rings/R043.jpg'},
  ]}});
  const card = run.state.owned[0], ring = run.state.owned[1];
  assert.equal(run.saveVersion, 4, 'ランセーブのカード／指輪移行版が進んでいない');
  assert.deepEqual([card.id,card.no,card.name,card._tripleMerged,card.directionCount,card.adjacentKeywords[0]],
    ['panel_double_attack','E014','多段攻撃',true,4,'三段攻撃'], '旧E015がE014合体版へ移行されていない');
  assert.deepEqual([ring.no,ring.name,ring.art], ['R042','呪いの指輪','assets/art/rings/R042.jpg'],
    '旧R043の呪いの指輪がR042へ移行されていない');

  const profile = SaveMigrations.migrate('profile', {saveVersion:2,gameVersion:'old',
    cards:{E014:{seen:true,acquired:false},E015:{seen:true,acquired:true}},
    rings:{R042:{seen:true,acquired:false},R043:{seen:true,acquired:true}}});
  assert.deepEqual(profile.cards, {E014:{seen:true,acquired:true}}, 'プロフィールのE015取得履歴がE014へ統合されていない');
  assert.deepEqual(profile.rings, {R042:{seen:true,acquired:true}}, 'プロフィールの旧R043取得履歴がR042へ統合されていない');
}

// 列は必ずヘッダ名で引く（sheet_data.js）。位置で引くとシートへ列を1本足しただけで
// 別の列を効果文として読み、スモークが静かに無意味になる。
const cards = sheetData.characterCards();
const enchantments = sheetData.enchantCards();
const summonDefs = cards.map(c => ({
  name: c.name, power: c.power || 1, life: c.life || 3,
  color: c.color, keywords: c.keywords, desc: c.desc,
}));
const failures = [];

for (const [kind, rows] of [['card', cards], ['enchant', enchantments]]) {
  for (const row of rows) {
    const isCard = kind === 'card';
    const desc = isCard ? row.desc || '' : '';
    const mana = desc.match(/^(\d+)マナ(毎)?[:：]\s*(.+)$/);
    const unit = {
      id: 'smoke-unit', name: isCard ? row.name : 'スモーク対象',
      atk: isCard ? row.power || 1 : 2, hp: isCard ? row.life || 3 : 3,
      maxHp: isCard ? row.life || 3 : 3, color: isCard ? row.color || '赤' : '赤',
      desc,
      keywords: isCard ? row.keywords.slice() : [],
      effectData: isCard ? {} : {effectNames: [row.name], effectTexts: [row.desc || '']},
      // これまでのスモークはマナ閾値フィールドを作っていなかったため、
      // 「全カードを通った」だけでマナ効果の実行経路を検査できていなかった。
      manaCost: mana ? Number(mana[1]) : 0,
      manaRepeat: !!(mana && mana[2]),
      manaThresholdDesc: mana ? mana[3] : '',
    };
    try {
      const state = core.createBattleState({
        resources: {p1: {mana: 20, gold: 200}, p2: {mana: 20, gold: 0}},
        sides: {p1: {units: [unit]}, p2: {units: [{id: 'enemy', name: '敵', atk: 3, hp: 30, maxHp: 30, color: '青'}]}},
        summonDefs, itemDefs: [],
      });
      core.runBattleCore(state, createSeededRng(123), {turnLimit: 8});
    } catch (error) {
      failures.push(`${kind}:${row.name} => ${error.stack}`);
    }
  }
}

assert.equal(failures.length, 0, failures.slice(0, 3).join('\n'));
assertSheetDrivenMergedForms();
assertCatalogMigrations();
console.log(`card core smoke ok: ${cards.length + enchantments.length} entries`);
