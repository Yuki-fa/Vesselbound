'use strict';
// 実際のfx_lab/preview/cards/check.jsを読み、停止・完了・verify起動をNodeの時計で検査する。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { sandbox } = require('./cards_dom.cjs');
const root = path.resolve(__dirname, '../..');
function boot(search = '') {
  const env = sandbox(pathToFileURL(path.join(root, 'tools/vfx_preview.html')).href);
  env.context.location.search = search;
  const html = fs.readFileSync(path.join(root, 'tools/vfx_preview.html'), 'utf8');
  env.parse(html.match(/<body>([^]*?)<\/body>/)[1].replace(/<script[^]*?<\/script>/g, ''));
  vm.createContext(env.context);
  for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) {
    if (/capture_frames|frame_capture/.test(src)) continue; // 写真専用の時計は通常再生では動かさない。
    const file = path.resolve(root, 'tools', src.split('?')[0]);
    vm.runInContext(fs.readFileSync(file, 'utf8'), env.context, { filename: file });
  }
  return env;
}
async function main() {
  const env = boot(), ctx = env.context, $ = id => env.document.getElementById(id);
  assert.equal($('verification-result'), null, '通常URLでQA表示を作らない');
  assert.equal(ctx.VbFxLabCheck.busy(), false, '通常URLでQAを起動しない');
  await env.drive(ctx.VbFxPreview.select('direwolf'));
  assert.equal(parseFloat($('ally-0').style.left), ctx.VbFxLabGeometry.position('ally', 'front', 3, 0).left, '召喚前は3枚の前衛を中央へ詰める');
  await env.drive(ctx.VbFxPreview.play());
  assert.equal(parseFloat($('ally-0').style.left), ctx.VbFxLabGeometry.position('ally', 'front', 4, 0).left, '召喚後は4枚の前衛を中央へ詰める');
  const play = ctx.VbFx.play; let replaySource;
  ctx.VbFx.play = function (name, opts) { replaySource = opts.source; return play(name, opts); };
  const replay = ctx.VbFxPreview.play();
  assert.equal(replaySource.left, ctx.VbFxLabGeometry.position('ally', 'front', 3, 1).left * .4, '再再生のVFXも3枚に戻した発生元の座標を使う');
  await env.drive(replay); ctx.VbFx.play = play;
  if (process.argv.includes('--layout-only')) { console.log('召喚: 初回の3→4枚、再再生の4→3枚、VFX発生元の座標同期 OK'); return; }
  await env.drive(ctx.VbFxPreview.select('demon-soul'));
  const normal = await env.drive(ctx.VbFxPreview.play());
  assert.equal(normal.result.cancelled, false, '魔族の魂を最後まで再生');
  assert.equal(ctx.VbFx.activeCount(), 0, '魔族の魂の後片付け');
  const interrupted = ctx.VbFxPreview.play();
  await env.advance(100); ctx.VbFxCards.show('cards');
  assert.equal((await env.drive(interrupted)).result.cancelled, true, 'タブ切替→cards.stop→preview.stop→stopAllによる停止を再現');
  ctx.VbFxCards.show('effects');
  const p = ctx.VbFxLabCheck.plan();
  assert.equal(p.effects.length + p.states.length, ctx.VbFx.effects.length, '通常演出と常時状態を全件検査');
  const run = ctx.VbFxLabCheck.run();
  assert.equal(run, ctx.VbFxLabCheck.run(), '検査の二重起動をまとめる');
  await env.advance(100);
  assert.equal(ctx.VbFxLabCheck.busy(), true);
  await assert.rejects(ctx.VbFxLabCheck.one('demon-soul'), /検査中/, '単体検査も全件検査へ割り込まない');
  ctx.VbFxCards.show('cards'); // 検査中のタブ操作はstopAllへ達しない。
  const report = await env.drive(run);
  assert.equal(report.pass, true, report.failure);
  assert.equal(report.effects.length, p.effects.length);
  assert.equal(report.states.length, p.states.length);
  assert.equal(report.audioFiles, p.sounds.length);
  assert.ok(report.stops.every(r => r.expected), '検査中に外部停止がない');
  assert.ok(ctx.VbFxLabCheck.format(report).includes('演出 ' + p.effects.length + '/' + p.effects.length));
  assert.equal(ctx.VbFxLabCheck.busy(), false, '検査終了後に操作を戻す');
  console.log('check.js: ' + report.effects.length + '演出 + ' + report.states.length + '状態 / 反対陣営' + report.reverse.length
    + ' / 追加' + report.extras.length + ' / SE' + report.audioFiles + '（採用' + p.adoptedAudioFiles + '） OK');
  ctx.VbFxCards.show('cards'); ctx.VbFxCards.choose('C008');
  const card = ctx.VbFxCards.cards().find(c => c.no === 'C008');
  assert.equal(card.vfx[Number($('card-current-choice').value)].path, 'assets/vfx/C008.webp', '固有演出を既定選択');
  env.imageDelay = 900;
  const began = env.now(); await env.drive(ctx.VbFxCards.playCurrent('C008'));
  const entry = ctx.VbFxCards.history().at(-1), media = card.vfx[ctx.VbFxCardCatalog.defaultVfxIndex(card)];
  assert.equal(entry.completed, true, '読み込みが遅い素材も完了');
  assert.ok(entry.startedAt - began >= 900, 'デコード前から終了タイマーを進めない');
  assert.ok(entry.elapsedMs >= ctx.VbFxLabGeometry.visibleMs(media), '素材の表示時間は現在のゲームの尺を満たす');
  assert.equal(entry.geometry.width, 260 * 2, 'C008の専用幅はカード幅×2');
  assert.equal(entry.geometry.height, 395 * 2, 'C008の専用高さはカード高×2');
  assert.equal(env.document.querySelector('.card-current-vfx'), null, '有限素材の後片付け');
  ctx.VbFxCards.choose('K018'); // 結界の保持素材。
  const stateCard = ctx.VbFxCards.cards().find(c => c.no === 'K018');
  const stateIndex = stateCard.vfx.findIndex(v => v.loop);
  assert.ok(stateIndex >= 0, '常時素材の経路がある'); $('card-current-choice').value = String(stateIndex);
  await env.drive(ctx.VbFxCards.playCurrent('K018'));
  assert.ok(env.document.querySelector('.card-current-vfx'), '状態素材は3秒で消さず表示を保持');
  ctx.VbFxCards.stop(); assert.equal(env.document.querySelector('.card-current-vfx'), null, '明示停止で状態素材を消す');
  env.imageDelay = 1;
  console.log('全カード再生: 固有既定、900msの読込待ち、ゲームの尺・寸法、状態の継続と停止 OK');
  for (const mode of ['rebuild','clone']) {
    const live = new Map();
    const make = (id,left,top) => {
      const el=env.document.createElement('div');el.dataset.unitId=id;
      Object.assign(el.style,{position:'absolute',left:left+'px',top:top+'px',width:'95px',height:'140px'});
      el.style.setProperty('filter','contrast(1.05)','');
      env.document.body.appendChild(el);live.set(id,el);return el;
    };
    const source=make('source',100,500),old=make('target',250,140);
    const fx=ctx.VbFx.play('weaken',{source:ctx.VbFx.rect(source),targets:[ctx.VbFx.rect(old)],
      resolveElement:el=>live.get(el.dataset.unitId),speed:1.5,dir:1});
    await env.advance(100);
    assert.ok(old.style.transform.includes('translate('),'弱体のDOM演出を再生中');
    const next=make('target',390,140);
    if(mode==='clone') for(const key of ['transform','filter','translate','transition']) {
      const val=old.style.getPropertyValue(key);if(val)next.style.setProperty(key,val,old.style.getPropertyPriority(key));
    }
    old.remove();await env.advance(50);
    assert.ok(next.style.transform.includes('translate('),mode+'後のカードへ演出を移す');
    assert.equal((await env.drive(fx)).cancelled,false,'再描画でも最後まで再生');
    assert.equal(next.style.transform,'',mode+'後の一時transformを消す');
    assert.equal(next.style.filter,'contrast(1.05)',mode+'後も元のfilterへ戻す');
    assert.equal(next.style.translate,'',mode+'後の命中の揺れを消す');
    assert.equal(ctx.VbFx.activeCount(),0,'再描画後の後片付け');source.remove();next.remove();
  }
  console.log('本体のDOM再描画・攻撃クローンへの参照移動と一時スタイルの復元 OK');
  const explicit = boot('?verify=1');
  assert.equal(explicit.document.getElementById('verification-result'), null, '初期化完了までQA開始を待つ');
  explicit.document.readyState = 'complete'; explicit.document.dispatchEvent(new explicit.Event('DOMContentLoaded'));
  assert.equal(explicit.document.getElementById('verification-result'),null,'verify=1は操作待ちで検査を自動起動しない');
  const verifyButton=Array.from(explicit.document.querySelectorAll('button')).find(b=>b.textContent==='全VFX検査を実行');
  assert.ok(verifyButton,'verify=1で手動起動ボタンを表示');verifyButton.dispatchEvent(new explicit.Event('click'));
  assert.ok(explicit.document.getElementById('verification-result'), 'ボタン押下で検査結果を表示');
  await explicit.advance(20); explicit.context.VbFx.stopAll();
  const failed = await explicit.drive(explicit.context.VbFxLabCheckResult);
  assert.equal(failed.pass, false, '外部stopAllは検査失敗にする');
  assert.ok(failed.stops.some(s => !s.expected && s.stack.includes('cards_runtime_check')), '停止元のスタックを記録');
  assert.ok(explicit.document.getElementById('verification-result').textContent.includes('VFX_QA_RESULT'), '検査結果をページへ記録');
  console.log('demon-soul: 通常完走・停止経路の再現・検査との分離・外部停止元の記録 / verify起動条件 OK');
}
main().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
