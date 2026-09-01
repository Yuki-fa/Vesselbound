'use strict';
// ═══════════════════════════════════════
// tools/parity/online_receivers.js — 再生側の受け口の欠落を検出する。
//
// コアが出すイベントに受け口が無いと、その効果は「内部では起きているのに
// 画面には出ない」状態になる。オンライン専用の不具合として現れやすい。
//
//   node tools/parity/online_receivers.js
//
// **コアへ新しいイベント種別を足したら、オンライン再生（board.js）と
// PvE再生（battle.js）の両方に受け口を書くこと。**
// 受け口が要らないものは下の NO_RECEIVER_NEEDED へ理由付きで登録する。
// ═══════════════════════════════════════
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const core = read('js/battle/core.js');
const board = read('js/online/board.js');
const battle = read('js/engine/battle.js');
const protocol = read('js/online/protocol.js');

const emitted = [...new Set([...core.matchAll(/emit\(\{\s*type:\s*'([a-z_]+)'/g)].map(m => m[1]))].sort();

// board.js は ONLINE_EVENT.XXX で分岐するため、protocol.js の対応表で名前を解く。
const eventConst = {};
for (const m of protocol.matchAll(/([A-Z_]+)\s*:\s*'([a-z_]+)'/g)) eventConst[m[1]] = m[2];
const boardHandled = new Set();
for (const m of board.matchAll(/case\s+ONLINE_EVENT\.([A-Z_]+)/g)) {
  if (eventConst[m[1]]) boardHandled.add(eventConst[m[1]]);
}
for (const m of board.matchAll(/case\s+'([a-z_]+)'/g)) boardHandled.add(m[1]);

const battleHandled = new Set();
for (const m of battle.matchAll(/e\.type===['"]([a-z_]+)['"]/g)) battleHandled.add(m[1]);
for (const m of battle.matchAll(/ev\.type===['"]([a-z_]+)['"]/g)) battleHandled.add(m[1]);
for (const m of battle.matchAll(/type===['"]([a-z_]+)['"]/g)) battleHandled.add(m[1]);

// 受け口が要らないもの。**理由を必ず書くこと。**
const NO_RECEIVER_NEEDED = {
  battle_start: '再生の開始そのもの',
  battle_end: '勝敗は outcome を見る',
  turn_begin: '手番の区切り。演出は無い',
  summon_rejected: '上限拒否の記録用。画面には出さない',
  bonus_reward: '報酬画面で処理する',
  item_reward: '報酬画面で処理する',
  gold_spend: 'ゴールドはHUDが state から読む',
  keyword_effect: '種類ごとに個別の受け口がある',
};

// 判定はオンライン側だけを対象にする。
// **PvEはイベントを消費して状態を作る方式ではない。** コアへ渡した state を
// 自分で読み戻すため、受け口が無いのは正常。一方オンラインはイベント列だけが
// 情報源なので、受け口が無い＝その効果が画面に出ない。
const rows = emitted.map(t => ({
  type: t,
  online: boardHandled.has(t),
  pve: battleHandled.has(t),
  skip: !!NO_RECEIVER_NEEDED[t],
}));
const ng = rows.filter(r => !r.skip && !r.online);

console.log(`${'イベント'.padEnd(22)}${'オンライン受け口'.padEnd(18)}PvE（参考）`);
rows.forEach(r => {
  if (r.skip || r.online) return;
  console.log(`${r.type.padEnd(22)}${'★無し'.padEnd(18)}${r.pve ? 'あり' : '—'}`);
});
if (!ng.length) console.log('（オンラインの受け口に欠落なし）');
console.log(`\n再生受け口検証: NG ${ng.length}`);
process.exitCode = ng.length ? 1 : 0;
