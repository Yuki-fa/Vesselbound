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
const CDP_CLOSE_GRACE_MS = 1600;
const TERM_CLOSE_GRACE_MS = 900;
const LIVE_BROWSERS = new Set();

let _cleanupHooksInstalled = false;
let _signalShutdown = null;
let _exitCodeWatcher = null;
let _exitCodeCleanupStarted = false;

function _childIsAlive(proc) {
  return !!proc && proc.exitCode == null && proc.signalCode == null;
}

function _waitForChildExit(proc, timeoutMs) {
  if (!_childIsAlive(proc)) return Promise.resolve(true);
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      proc.removeListener('exit', onExit);
      resolve(value);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(!_childIsAlive(proc)), Math.max(0, timeoutMs));
    proc.once('exit', onExit);
  });
}

function _removeUserDataDir(userDataDir) {
  if (!userDataDir) return;
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
  } catch (_) {}
}

function _stopExitCodeWatcherIfIdle() {
  if (LIVE_BROWSERS.size || !_exitCodeWatcher) return;
  clearInterval(_exitCodeWatcher);
  _exitCodeWatcher = null;
  _exitCodeCleanupStarted = false;
}

function _watchForHandledFailureExit() {
  if (_exitCodeWatcher) return;
  // 検査側の catch が process.exitCode を設定しただけでChromeを閉じ忘れると、
  // 子プロセスがevent loopを保ち beforeExit まで進まない。その終了意図を拾って閉じる。
  _exitCodeWatcher = setInterval(() => {
    if (!LIVE_BROWSERS.size) { _stopExitCodeWatcherIfIdle(); return; }
    if (process.exitCode == null || _exitCodeCleanupStarted) return;
    _exitCodeCleanupStarted = true;
    void _closeAllBrowsers().finally(() => { _exitCodeCleanupStarted = false; });
  }, 100);
  // Chrome/WebSocketが残っている時だけ動けばよいため、タイマー自体は終了を妨げない。
  if (typeof _exitCodeWatcher.unref === 'function') _exitCodeWatcher.unref();
}

function _createBrowserController(proc, userDataDir) {
  let ws = null;
  let sendBrowserClose = null;
  let closePromise = null;

  const controller = {
    proc,
    userDataDir,
    setSocket(socket) { ws = socket; },
    setBrowserCloseSender(fn) { sendBrowserClose = fn; },
    requestBrowserClose() {
      if (!_childIsAlive(proc) || !ws || ws.readyState !== 1 || typeof sendBrowserClose !== 'function') return false;
      try { return sendBrowserClose() !== false; } catch (_) { return false; }
    },
    async close() {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        // Browser.close はChrome自身にプロファイルを正常終了させる。
        // WebSocketを先に閉じると命令が届かないので、子プロセスのexitを待ってから閉じる。
        const requested = controller.requestBrowserClose();
        if (requested) await _waitForChildExit(proc, CDP_CLOSE_GRACE_MS);
        if (_childIsAlive(proc)) {
          try { proc.kill('SIGTERM'); } catch (_) {}
          await _waitForChildExit(proc, TERM_CLOSE_GRACE_MS);
        }
        if (_childIsAlive(proc)) {
          try { proc.kill('SIGKILL'); } catch (_) {}
          await _waitForChildExit(proc, TERM_CLOSE_GRACE_MS);
        }
      })().finally(() => {
        try { if (ws && ws.readyState < 2) ws.close(); } catch (_) {}
        LIVE_BROWSERS.delete(controller);
        _removeUserDataDir(userDataDir);
        _stopExitCodeWatcherIfIdle();
      });
      return closePromise;
    },
    // processのexitイベントでは非同期待機ができない。
    // Browser.closeを先に投げ、残った親プロセスへSIGTERMを送る最後の安全弁。
    emergencyClose() {
      controller.requestBrowserClose();
      if (_childIsAlive(proc)) {
        try { proc.kill('SIGTERM'); } catch (_) {}
      }
      try { proc.unref(); } catch (_) {}
      _removeUserDataDir(userDataDir);
    },
    processExited() {
      if (closePromise) return;
      try { if (ws && ws.readyState < 2) ws.close(); } catch (_) {}
      LIVE_BROWSERS.delete(controller);
      _removeUserDataDir(userDataDir);
      _stopExitCodeWatcherIfIdle();
    },
  };
  return controller;
}

async function _closeAllBrowsers() {
  await Promise.allSettled([...LIVE_BROWSERS].map(controller => controller.close()));
}

function _emergencyCloseAllBrowsers() {
  [...LIVE_BROWSERS].forEach(controller => controller.emergencyClose());
}

function _shutdownForSignal(signal) {
  const exitCode = signal === 'SIGINT' ? 130 : 143;
  if (_signalShutdown) {
    _emergencyCloseAllBrowsers();
    process.exit(exitCode);
    return;
  }
  _signalShutdown = _closeAllBrowsers()
    .finally(() => process.exit(exitCode));
}

function _installCleanupHooks() {
  if (_cleanupHooksInstalled) return;
  _cleanupHooksInstalled = true;
  process.on('SIGINT', () => _shutdownForSignal('SIGINT'));
  process.on('SIGTERM', () => _shutdownForSignal('SIGTERM'));
  // 通常のevent loop終了時にも、呼び出し側がclose()を忘れたChromeを畳む。
  process.on('beforeExit', () => {
    if (LIVE_BROWSERS.size) void _closeAllBrowsers();
  });
  // exit / uncaught exceptionではawaitできないため、同期的な最終安全弁を使う。
  process.on('exit', _emergencyCloseAllBrowsers);
  process.on('uncaughtExceptionMonitor', _emergencyCloseAllBrowsers);
}

async function launch(opts = {}) {
  _installCleanupHooks();
  const port = opts.port || (9300 + Math.floor(Math.random() * 300));
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chrome-'));
  const args = [
    // headless=new は合成器が動くので rAF もCSSトランジションも進む。
    opts.headed ? '--auto-open-devtools-for-tabs' : '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--no-default-browser-check',
    // 検査用プロファイルが強制終了に至っても、利用者画面へ
    // クラッシュ報告・エラーダイアログ・復元バブルを出さない。
    '--disable-breakpad', '--disable-crash-reporter', '--noerrdialogs',
    '--disable-session-crashed-bubble', '--hide-crash-restore-bubble',
    '--disable-extensions', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    // 自動再生の判定を固定して、BGMの経路を再現できるようにする。
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    `--window-size=${opts.width || 1600},${opts.height || 1000}`,
    'about:blank',
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore', detached: false });
  const controller = _createBrowserController(proc, userDataDir);
  LIVE_BROWSERS.add(controller);
  _watchForHandledFailureExit();
  proc.once('exit', () => controller.processExited());

  let spawnError = null;
  proc.once('error', error => { spawnError = error; });

  try {
    // /json/version が返るまで待つ。起動の途中でChromeが落ちた時も打ち切る。
    let wsUrl = null;
    for (let i = 0; i < 120 && !wsUrl; i++) {
      if (spawnError || !_childIsAlive(proc)) break;
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (res.ok) wsUrl = (await res.json()).webSocketDebuggerUrl;
      } catch (_) {}
      if (!wsUrl) await sleep(100);
    }
    if (!wsUrl) throw spawnError || new Error('Chromeへ接続できない');

    const ws = new WebSocket(wsUrl);
    controller.setSocket(ws);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('ChromeのDevTools WebSocketへ接続できない'));
      ws.onclose = () => reject(new Error('ChromeのDevTools WebSocketが接続中に閉じた'));
    });
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
    ws.onerror = () => {};
    ws.onclose = () => {
      const error = new Error('ChromeのDevTools WebSocketが閉じた');
      pending.forEach(({ reject }) => reject(error));
      pending.clear();
    };
    const send = (method, params, sessionId) => new Promise((resolve, reject) => {
      if (ws.readyState !== 1) { reject(new Error('ChromeのDevTools WebSocketは閉じている')); return; }
      const n = ++id;
      pending.set(n, { resolve, reject });
      try {
        ws.send(JSON.stringify({ id: n, method, params: params || {}, sessionId }));
      } catch (error) {
        pending.delete(n);
        reject(error);
      }
    });
    // Browser.closeはタブのsessionIdを付けず、ブラウザー側のCDPに送る。
    controller.setBrowserCloseSender(() => {
      if (ws.readyState !== 1) return false;
      ws.send(JSON.stringify({ id: ++id, method: 'Browser.close', params: {} }));
      return true;
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
      async close() { await controller.close(); },
    };
    return api;
  } catch (error) {
    await controller.close();
    throw error;
  }
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
