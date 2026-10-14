#!/usr/bin/env node
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const { launch } = require('../parity/headless');
const { installCaptureClock } = require('./clock');
const { frameSource, decodeImage } = require('./images');

function argumentsFor(argv) {
  const opts = { frames: 8, seed: 53, speed: 1.5, value: 1 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help') return null;
    if (!['--url','--out','--names','--frames','--seed','--speed','--value'].includes(key) || !argv[i + 1]) throw new Error('不明／不足の引数: ' + key);
    opts[key.slice(2)] = argv[++i];
  }
  if (!opts.url || !opts.out) throw new Error('--url と --out は必須です');
  const url = new URL(opts.url);
  if (!['file:','http:','https:'].includes(url.protocol)) throw new Error('ページURLを指定してください');
  if (url.searchParams.has('photo')) throw new Error('旧photo撮影モードを含まないLABのURLを指定してください');
  for (const key of ['frames','seed','speed','value']) opts[key] = Number(opts[key]);
  if (!Number.isInteger(opts.frames) || opts.frames < 2 || opts.frames > 64) throw new Error('--frames は2〜64です');
  if (!Number.isFinite(opts.seed) || !(opts.speed >= .4 && opts.speed <= 12) || !(opts.value >= 1)) throw new Error('seed/speed/value が不正です');
  if (opts.names && fs.existsSync(opts.names)) opts.names = fs.readFileSync(opts.names,'utf8')
    .split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).join(',');
  if (opts.names) {
    const names = opts.names.split(',').map(s=>s.trim());
    if(names.some(s=>!s)||new Set(names).size!==names.length) throw new Error('--names の空欄・重複は使えません');
    opts.names = names.join(',');
  }
  opts.out = path.resolve(opts.out); return opts;
}
async function assetsReady(browser) {
  await browser.eval(`
    const decodeImage = ${decodeImage.toString()};
    await document.fonts.ready;
    await Promise.all(Array.from(document.querySelectorAll('.lab-card img')).map(i => decodeImage(i, i.src)));
    const bg = new Image(), bgSource = new URL('../assets/art/backgrounds/stage2_battlestage.webp', location.href).href;
    await decodeImage(bg, bgSource, bgSource);
    window.dispatchEvent(new Event('resize'));
  `);
}
async function captureBaseline(browser, out, name) {
  const geometry = await browser.eval(`
    const stage=document.getElementById('stage').getBoundingClientRect(), state=VbFxPreview.snapshot();
    const cards=Array.from(document.querySelectorAll('.lab-card')).map(el=>{
      const r=el.getBoundingClientRect();
      return {id:el.id,no:el.dataset.no,left:r.left-stage.left,top:r.top-stage.top,width:r.width,height:r.height};
    });
    return {stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height,scale:1},cards,
      source:state.sourceId,targets:state.targetIds};
  `);
  fs.mkdirSync(path.join(out,'baselines'),{recursive:true});
  const shot=await browser.call('Page.captureScreenshot',{format:'png',clip:geometry.stage});
  const baselineFile='baselines/'+name+'.png';
  fs.writeFileSync(path.join(out,baselineFile),Buffer.from(shot.data,'base64'));
  return {geometry,baselineFile};
}
async function freezeSprites(browser) {
  // 第1段では残すAnimated WebPだけ、旧LABに既にある静止コマを外から選ぶ。
  // 独自のデコード時計を持つ画像にperformance.nowの差し替えは効かない。
  const requested = await browser.eval(`
    return Array.from(document.querySelectorAll('[data-vb-fx-layer] img')).map((image, index) => {
      // 2026-10-12指定: カード残像の静止JPEG/PNGはコマ固定せず、下で読み込みを待つ。
      // data URLへ置換済みのWebPはcaptureKeyで追跡。indexは全画像の並びを保つ。
      if (!image.dataset.captureKey && !/\\.webp(?:[?#]|$)/i.test(image.src)) return null;
      const key = image.dataset.captureKey || (image.src.match(/(K\\d{3})\\.webp/) || [])[1];
      const list = window.VbFxCaptureFrames && VbFxCaptureFrames[key];
      if (!list || !list.length) throw new Error('静止コマの無いAnimated WebP: ' + (key || image.src));
      const elapsed = Math.max(0, __vfxCaptureClock.now() - __vfxCaptureClock.imageStart(image));
      const frame = list.find(f => f.at + f.duration > elapsed) || list[list.length - 1];
      return {index, key, file: frame.file};
    }).filter(Boolean);
  `);
  // 撮影対象のサーバーへ静止コマのURLを要求しない。道具側の画像をdata URLで渡す。
  const frozen = Object.fromEntries([...new Set(requested.map(r => r.file))].map(file => [file, frameSource(file)]));
  await browser.eval(`
    const decodeImage = ${decodeImage.toString()}, frozen = ${JSON.stringify(frozen)};
    const images = document.querySelectorAll('[data-vb-fx-layer] img');
    for (const request of ${JSON.stringify(requested)}) {
      const image = images[request.index];
      image.dataset.captureKey = request.key;
      await decodeImage(image, request.file, frozen[request.file]);
      image.dataset.captureFrame = request.file;
    }
    await Promise.all(Array.from(document.querySelectorAll('[data-vb-fx-layer] img, .lab-card img')).map(i => decodeImage(i, i.src)));
  `);
}
async function main(argv) {
  const opts = argumentsFor(argv);
  if (!opts) { console.log('node tools/vfx_capture/capture.js --url <ページURL> --out <フォルダ> [--names a,b または一覧txt] [--frames 8] [--value 1]'); return; }
  // 前後比較に必要な時刻・シード・配置を画像と一緒に記録する。
  fs.mkdirSync(opts.out, { recursive: true });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-vfx-capture-'));
  let browser;
  const report = { ...opts, effects: [], status: 'running' };
  try {
    browser = await launch({ width: 1600, height: 1000 });
    await browser.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
    await browser.call('Page.addScriptToEvaluateOnNewDocument', { source: '(' + installCaptureClock.toString() + ')(' + opts.seed + ');' });
    await browser.goto(opts.url);
    await browser.waitFor('window.VbFxPreview && VbFxPreview.ready');
    const all = await browser.eval('return VbFx.effects.map(d => d.name);');
    const legacy = await browser.eval('return VbFx.effects.filter(d => !d.sourceCode).map(d => d.name);');
    const names = opts.names ? opts.names.split(',') : legacy;
    for (const name of names) if (!all.includes(name)) throw new Error('未知の効果: ' + name);
    for (const name of names) {
      report.current = { name, stage: 'ページ・素材の読み込み' };
      await browser.goto(opts.url); await browser.waitFor('window.VbFxPreview && VbFxPreview.ready');
      await browser.eval(`await VbFxPreview.select(${JSON.stringify(name)}, false); document.getElementById('volume').value='0'; document.getElementById('speed').value=${opts.speed}; VbFx.settings.seed=${opts.seed};`);
      await assetsReady(browser);
      const baseline = await captureBaseline(browser,opts.out,name);
      const info = await browser.eval(`
        const original = VbFx.play;
        // 2026-10-12: 新規だけはLABの回数サンプル／共有定義の派生値を保持。旧82種の撮影値はそのまま。
        VbFx.play = function(name, options) {
          const conf=VbFxPreviewCatalog[name];
          const value=conf&&conf.new1012&&${opts.value}===1?(options.value||conf.sampleValue||1):${opts.value};
          return original(name, Object.assign({}, options, {value, dir:1, speed:${opts.speed}}));
        };
        window.__captureError = null;
        VbFxPreview.play().catch(e => { window.__captureError = e.message; });
        await __vfxCaptureClock.step(0);
        const state=VbFxPreview.snapshot(), job=VbFx.snapshot()[0];
        if(!job) throw new Error(window.__captureError || '再生が開始しませんでした');
        // 2026-10-12指定・撮影第2回: 脈動ごとの合図を記録し、固定1回の命中と区別する。
        return {source:state.sourceId,targets:state.targetIds,durationMs:job.durationMs,impactMs:job.impactsMs,cueTimesMs:job.cueTimesMs||[]};
      `);
      const times = Array.from({ length: opts.frames }, (_, i) => info.durationMs * i / opts.frames);
      // 0〜(N-1)/N。終端は後片付け後なので、最後の余韻は終端直前で撮る。
      const files = [];
      for (let i = 0; i < times.length; i++) {
        report.current = { name, stage: 'コマ撮影', frame: i + 1, timeMs: times[i] };
        await browser.eval(`
          const end=${times[i]};
          while(__vfxCaptureClock.now() + 1000/60 < end - .000001) await __vfxCaptureClock.step(__vfxCaptureClock.now()+1000/60);
          await __vfxCaptureClock.step(end);
          if(window.__captureError) throw new Error(window.__captureError);
        `);
        await freezeSprites(browser);
        const r = await browser.eval('const r=document.getElementById("stage").getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};');
        const shot = await browser.call('Page.captureScreenshot', { format: 'png', clip: r });
        const file = path.join(temp, `${name}_${i}.png`); fs.writeFileSync(file, Buffer.from(shot.data, 'base64')); files.push(file);
      }
      report.current = { name, stage: 'PNGの連結' };
      const output = path.join(opts.out, name + '.png');
      const stitched = spawnSync('python3', [path.join(__dirname, 'compare.py'), '--strip', output, JSON.stringify(times), ...files], { encoding: 'utf8' });
      if (stitched.status !== 0) throw new Error(stitched.stderr || 'PNGの連結に失敗');
      report.effects.push({ name, ...info, ...baseline, times, file: name + '.png' });
      delete report.current;
      console.log(name + ': ' + opts.frames + 'コマ → ' + output);
    }
    report.status = 'captured';
  } catch (e) {
    const current = report.current;
    const context = current ? current.name + ' / ' + current.stage +
      (current.frame ? ' / ' + current.frame + 'コマ目 (' + current.timeMs + 'ms)' : '') + ': ' : '';
    report.status = browser ? 'failed' : 'unexecuted'; report.reason = context + e.message;
    throw new Error(report.reason, { cause: e });
  }
  finally {
    if (browser) await browser.close();
    fs.rmSync(temp, { recursive: true, force: true });
    fs.writeFileSync(path.join(opts.out, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
if (require.main === module) main(process.argv.slice(2)).catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { argumentsFor, assetsReady, captureBaseline, freezeSprites, main };
