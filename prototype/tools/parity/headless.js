'use strict';
// ═══════════════════════════════════════
// tools/parity/headless.js — 実ブラウザ（Chrome）でアニメーション・見た目を検証するための土台。
//
// Claudeのブラウザペインは document.hidden=true のため requestAnimationFrame も
// CSSトランジションも進まず、アニメーションを一切確認できない。Codexの環境にも
// ブラウザが無い。そこで、この土台からヘッドレスChromeを起動してDevToolsプロトコルで
// 直接操作する。**追加インストールは不要**（Chrome本体とNode標準のWebSocket/fetchだけを使う）。
//
// 使い方（ローカルサーバーを立てておくこと）:
//   const { launch } = require('./headless');
//   const b = await launch();                       // Chromeを起動して接続
//   await b.goto('http://127.0.0.1:5500/index.html');
//   const v = await b.eval('document.hidden');      // ページ内でJSを実行
//   await b.screenshot('/tmp/shot.png');            // PNGを保存
//   await b.close();
//
// 注意：一時プロファイル（/tmp配下）で起動するため、ユーザーのChromeのデータには触らない。
// ═══════════════════════════════════════
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = process.env.VB_CHROME
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

async function launch(opts = {}) {
  const port = opts.port || (9300 + Math.floor(Math.random() * 300));
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chrome-'));
  const args = [
    // headless=new は合成器が動くので rAF もCSSトランジションも進む。
    opts.headed ? '--auto-open-devtools-for-tabs' : '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    // 自動再生の判定を固定して、BGMの経路を再現できるようにする。
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    `--window-size=${opts.width || 1600},${opts.height || 1000}`,
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore', detached: false });

  // /json/version が返るまで待つ
  let wsUrl = null;
  for (let i = 0; i < 120 && !wsUrl; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) wsUrl = (await res.json()).webSocketDebuggerUrl;
    } catch (_) { await sleep(100); }
  }
  if (!wsUrl) { try { proc.kill(); } catch (_) {} throw new Error('Chromeへ接続できない'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) events.push(msg);
  };
  const send = (method, params, sessionId) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params: params || {}, sessionId }));
  });

  // タブ（ターゲット）を1つ作り、そこへセッションを張る
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Log.enable');

  const api = {
    port, userDataDir, events,
    call,
    async goto(url, waitMs = 1200) {
      await call('Page.navigate', { url });
      await sleep(waitMs);
    },
    // 条件が真になるまで待つ。goto()は固定待ちなので、
    // ゲームのグローバル（G など）を触る前は必ずこれで待つこと。
    // 待たずに評価すると「Gが未定義」で偶発的に失敗する。
    async waitFor(exprBool, timeoutMs = 10000, intervalMs = 100) {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        let ok = false;
        try { ok = await api.eval(`return !!(${exprBool});`); } catch (e) { ok = false; }
        if (ok) return true;
        if (Date.now() > deadline) throw new Error(`waitFor がタイムアウト: ${exprBool}`);
        await sleep(intervalMs);
      }
    },
    // ページ内で式を評価して値を返す（Promiseも待つ）
    async eval(expression) {
      const r = await call('Runtime.evaluate', {
        expression: `(async()=>{ ${expression} })()`,
        awaitPromise: true, returnByValue: true,
      });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval失敗');
      return r.result && r.result.value;
    },
    async screenshot(file) {
      const r = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    // 指定ms間隔でPNGを連写する。アニメーションの検証用。
    async record(dir, frames = 10, intervalMs = 100, prefix = 'f') {
      fs.mkdirSync(dir, { recursive: true });
      const out = [];
      for (let i = 0; i < frames; i++) {
        out.push(await api.screenshot(path.join(dir, `${prefix}${String(i).padStart(3, '0')}.png`)));
        await sleep(intervalMs);
      }
      return out;
    },
    consoleErrors() {
      return events.filter(e => e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
        .map(e => e.params.entry.text);
    },
    async close() {
      try { ws.close(); } catch (_) {}
      try { proc.kill(); } catch (_) {}
      await sleep(200);
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
    },
  };
  return api;
}

module.exports = { launch, sleep };

// 直接実行したときは自己診断を行う
if (require.main === module) {
  (async () => {
    const url = process.argv[2] || 'http://127.0.0.1:5500/index.html';
    const b = await launch();
    try {
      await b.goto(url, 2500);
      const info = await b.eval(`
        const t0=performance.now();
        const fired=await Promise.race([
          new Promise(r=>requestAnimationFrame(()=>r(Math.round(performance.now()-t0)))),
          new Promise(r=>setTimeout(()=>r(-1),1500))
        ]);
        return { hidden:document.hidden, visibility:document.visibilityState,
                 rAF: fired<0 ? '未発火' : fired+'msで発火',
                 poolLen: (typeof PANEL_POOL!=='undefined'&&PANEL_POOL)?PANEL_POOL.length:0,
                 isClaudePreview: (typeof _IS_CLAUDE_BROWSER_PREVIEW!=='undefined')?_IS_CLAUDE_BROWSER_PREVIEW:'undef' };
      `);
      console.log('自己診断:', JSON.stringify(info, null, 1));
      console.log('コンソールerror:', b.consoleErrors().slice(0, 3));
    } finally { await b.close(); }
  })().catch(e => { console.error(e); process.exitCode = 1; });
}
