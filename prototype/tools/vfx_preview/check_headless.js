#!/usr/bin/env node
'use strict';
// 既存 headless.jsを使用。自然なrAF検査と、固定4時刻＋4段階のコマ撮影。
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launch, sleep } = require('../parity/headless');
const project = path.resolve(__dirname, '../..');
const outputDirectory = process.env.VB_VFX_QA_OUTPUT || __dirname;
const shots = path.join(outputDirectory, 'shots');
const output = path.join(outputDirectory, 'headless_results.json');
const checksOnly = process.argv.includes('--checks-only');

async function capture(browser, effect, report) {
  const base = pathToFileURL(path.join(project, 'tools/vfx_preview.html')).href;
  const cases = [150,450,800,1200].map(ms=>({ms,phase:'fixed'}))
    .concat(['begin','middle','impact','end'].map(phase=>({phase})));
  for (const shot of cases) {
    const url = base + '?photo=' + encodeURIComponent(effect.name) + (shot.phase === 'fixed' ? '&ms=' + shot.ms : '&phase=' + shot.phase);
    await browser.goto(url);
    await browser.waitFor('window.VbFxLabFrame && window.VbFxLabFrame.ready', 15000);
    const state = await browser.eval('return VbFxLabFrame;');
    if (state.error) throw new Error(effect.name + ': ' + state.error);
    const filename = effect.name + '_' + state.requestedMs + '.png';
    await browser.screenshot(path.join(shots,filename));
    report.screenshots.push({name:effect.name,label:effect.label,phase:shot.phase,frameMs:state.requestedMs,file:'shots/'+filename,impacts:state.impacts});
  }
}
function gallery(report) {
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const labels = { begin: '始め', middle: '中盤', impact: '命中', end: '終わり' };
  const groups = [...new Set(report.screenshots.map(s => s.name))];
  const html = '<!doctype html><meta charset="utf-8"><title>VFXコマ比較</title><style>body{background:#101713;color:#eee;font:14px sans-serif;padding:20px}img{width:100%}.frames{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0}section{margin:36px 0}figcaption{padding:8px}a{color:#edc788}</style>'
    + '<h1>VFX · 4段階のコマ比較</h1><p><a href="../../vfx_preview.html">プレビューへ戻る</a> · 60fps刻みで指定時刻まで描画して保持したコマ。再生と後片付けは別の実時間検査で確認。</p>'
    + ['C018','S008','C043'].map(n=>'<figure><img src="../ref_'+n+'.jpg"><figcaption>基準 '+n+'</figcaption></figure>').join('')
    + groups.map(name => '<section><h2>'+esc(report.screenshots.find(s=>s.name===name).label)+'</h2><div class="frames">'
      + ['begin','middle','impact','end'].map(phase => {
        const s=report.screenshots.find(s=>s.name===name&&s.phase===phase);
        return s?'<figure><a href="'+esc(path.basename(s.file))+'"><img loading="lazy" src="'+esc(path.basename(s.file))+'"></a><figcaption>'+labels[phase]+' · '+s.frameMs+'ms</figcaption></figure>':'';
      }).join('')+'</div></section>').join('');
  fs.writeFileSync(path.join(shots,'index.html'),html);
}
async function main() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const report = { date: new Date().toISOString(), status: 'running', protocols: [], screenshots: [], errors: [] };
  let browser, launched = false;
  try {
    for (const [protocol, url] of [
      ['file', pathToFileURL(path.join(project, 'tools/vfx_preview.html')).href],
      ['http', 'http://127.0.0.1:5500/tools/vfx_preview.html'],
    ]) {
      browser = await launch({ width: 1600, height: 900 }); launched = true;
      await browser.call('Emulation.setDeviceMetricsOverride',{width:1600,height:900,deviceScaleFactor:2,mobile:false});
      try {
        await browser.goto(url + '?verify=auto');
        await browser.waitFor('window.VbFxPreview && window.VbFxPreview.ready');
        await browser.waitFor('window.VbFxLabLastResult', 120000);
        const result = await browser.eval('return VbFxLabLastResult;');
        report.protocols.push({ protocol, ...result });
        if (!result.pass) throw new Error(result.failure);
        const effects = await browser.eval('return VbFx.effects.map(d=>({name:d.name,label:d.label,ms:d.ms,loop:d.loop}));');
        report.errors.push(...browser.consoleErrors(),...browser.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params?.exceptionDetails?.exception?.description||'Runtime exception'));
        if (report.errors.length) throw new Error(report.errors.join('\n'));
        if (protocol === 'file' && !checksOnly) {
          fs.mkdirSync(shots, { recursive: true });
          await browser.goto(url); await browser.waitFor('window.VbFxPreview && window.VbFxPreview.ready');
          await browser.eval("document.getElementById('volume').value='0'; return true;");
          for (const effect of effects) await capture(browser, effect, report);
          gallery(report);
        }
      } finally { await browser.close(); browser = null; }
    }
    report.status = 'passed';
    for (const result of report.protocols) console.log(result.protocol + ': 演出' + result.effects.length + '/' + result.expected.effects
      + '、状態' + result.states.length + '/' + result.expected.states + '、逆方向' + result.reverse.length + '/' + result.expected.reverse
      + '、追加' + result.extras.length + '/' + result.expected.extras + '、SE' + result.audioFiles + '/' + result.expected.audioFiles
      + '（採用' + result.expected.adoptedAudioFiles + '）。' + (checksOnly ? '' : '固定4時刻と4段階のコマを保存。'));
  } catch (error) {
    report.status = launched ? 'failed' : 'unexecuted'; report.reason = error.message;
    console.error((launched ? '検査失敗: ' : '未実行: ') + error.message);
    process.exitCode = launched ? 1 : 2;
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
