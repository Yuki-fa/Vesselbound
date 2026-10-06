'use strict';
// Node検査専用。描画ピクセルは検証せず、実JSのDOM操作と時計を動かす。
const fs = require('node:fs');
const { fileURLToPath } = require('node:url');
function sandbox(baseURI) {
  let now = 0, nextId = 1;
  const pending = new Map();
  const observers = [];
  function classChanged(el) {
    for (const observer of observers) {
      let parent = el; while (parent && parent !== observer.target) parent = parent.parentNode;
      if (parent) Promise.resolve().then(() => observer.callback([{ target: el }]));
    }
  }
  function schedule(fn, ms, repeat = 0) { const id = nextId++; pending.set(id, { fn, at: now + Math.max(1, ms), repeat }); return id; }
  async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
  async function drive(promise) {
    let done = false, result, error;
    promise.then(v => { result = v; done = true; }, e => { error = e; done = true; });
    for (let steps = 0; steps < 30000 && !done; steps++) {
      await flush(); if (done) break;
      const entry = [...pending].sort((a, b) => a[1].at - b[1].at)[0];
      if (!entry) throw new Error('Node検査の待機先がない');
      const [id, task] = entry; pending.delete(id); now = task.at;
      if (task.repeat) pending.set(id, { ...task, at: now + task.repeat });
      task.fn(now);
    }
    if (!done) throw new Error('Node検査のイベント上限を超えた');
    if (error) throw error; return result;
  }
  class Events {
    constructor() { this.listeners = {}; }
    addEventListener(type, fn, options) { (this.listeners[type] ||= []).push({ fn, once: !!options?.once }); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(x => x.fn !== fn); }
    dispatchEvent(event) { event.target ||= this; for (const item of [...this.listeners[event.type] || []]) {
      item.fn.call(this, event); if (item.once) this.removeEventListener(event.type, item.fn);
      if (event.stopped) break;
    } return !event.defaultPrevented; }
  }
  class Event {
    constructor(type, init = {}) { this.type = type; this.isTrusted = false; Object.assign(this, init); }
    preventDefault() { this.defaultPrevented = true; }
    stopImmediatePropagation() { this.stopped = true; }
  }
  function styleObject() {
    const values = new Map(), priorities = new Map();
    const dashed = key => key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const methods = { setProperty(key, val, priority) { values.set(key, String(val)); priorities.set(key, priority || ''); },
      getPropertyValue: key => values.get(key) || '', getPropertyPriority: key => priorities.get(key) || '',
      removeProperty(key) { values.delete(key); priorities.delete(key); } };
    return new Proxy(methods, { get(obj, key) {
      if (key === 'cssText') return [...values].map(([k, v]) => k + ': ' + v + (priorities.get(k) ? ' !important' : '') + ';').join(' ');
      return obj[key] || values.get(dashed(key)) || '';
    }, set(obj, key, val) {
      if (key === 'cssText') { values.clear(); priorities.clear();
        for (const [k, v] of String(val).split(';').map(s => s.split(':')).filter(x => x.length === 2)) methods.setProperty(k.trim(), v.trim());
      } else methods.setProperty(dashed(key), val); return true;
    } });
  }
  function simple(el, selector) {
    let valid = true;
    selector = selector.replace(/:not\(([^)]+)\)/g, (_, inner) => { if (simple(el, inner)) valid = false; return ''; });
    if (!valid) return false;
    if (selector.includes(':checked')) { if (!el.checked) return false; selector = selector.replace(':checked', ''); }
    selector = selector.replace(/\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]/g, (_, key, val) => {
      const actual = el.getAttribute(key); if (actual == null || val != null && actual !== val) valid = false; return '';
    });
    if (!valid) return false;
    const tag = selector.match(/^[\w-]+/); if (tag && el.tagName !== tag[0].toUpperCase()) return false;
    const id = selector.match(/#([\w-]+)/); if (id && el.id !== id[1]) return false;
    for (const [, cls] of selector.matchAll(/\.([\w-]+)/g)) if (!el.classList.contains(cls)) return false;
    return true;
  }
  function matches(el, selector) {
    const parts = selector.trim().split(/\s+/); if (!simple(el, parts.pop())) return false;
    let parent = el.parentNode;
    while (parts.length) { const part = parts.pop(); while (parent && !simple(parent, part)) parent = parent.parentNode;
      if (!parent) return false; parent = parent.parentNode;
    } return true;
  }
  const canvasContext = () => new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    measureText: text => ({ width: String(text).length * 10 }) }, { get(obj, key) {
      if (key in obj) return obj[key];
      if (String(key).startsWith('create') && String(key).endsWith('Gradient')) return () => ({ addColorStop() {} });
      return () => {};
    } });
  class Element extends Events {
    constructor(tag) { super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null;
      this.style = styleObject(); this.dataset = {}; this.attributes = {}; this.id = ''; this.value = ''; this.hidden = false; this.disabled = false;
      this._classes = new Set(); this.classList = { contains: c => this._classes.has(c), add: (...cs) => { cs.forEach(c => this._classes.add(c)); classChanged(this); },
        remove: (...cs) => { cs.forEach(c => this._classes.delete(c)); classChanged(this); }, toggle: (c, state) => {
          const value = state == null ? !this._classes.has(c) : state; if (value) this._classes.add(c); else this._classes.delete(c); classChanged(this); return value;
        } }; this._text = ''; this.complete = true; this.naturalWidth = 1024; this.naturalHeight = 1024;
    }
    set className(text) { this._classes = new Set(String(text).split(/\s+/).filter(Boolean)); classChanged(this); }
    get className() { return [...this._classes].join(' '); }
    set textContent(text) { this._text = String(text); this.replaceChildren(); }
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
    set innerHTML(text) { this.replaceChildren(); parse(text, this); }
    set src(url) { this._src = new URL(url, baseURI).href; }
    get src() { return this._src || ''; }
    decode() { const delay = api.imageDelay;
      return new Promise((resolve, reject) => schedule(() => {
        try { if (this.src.startsWith('file:') && !fs.existsSync(fileURLToPath(new URL(this.src)))) throw new Error('画像がない: ' + this.src); resolve(); }
        catch (e) { reject(e); }
      }, delay));
    }
    setAttribute(key, val) { val = String(val); this.attributes[key] = val;
      if (key === 'class') this.className = val;
      else if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
      else if (key === 'style') this.style.cssText = val;
      else if (['hidden', 'disabled', 'checked'].includes(key)) this[key] = true;
      else this[key] = val;
    }
    getAttribute(key) { if (key.startsWith('data-')) return this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] ?? null;
      return key === 'class' ? this.className : this.attributes[key] ?? null;
    }
    removeAttribute(key) { delete this.attributes[key]; if (key === 'src') this._src = ''; }
    appendChild(child) { child.remove(); child.parentNode = this; this.children.push(child);
      if (this.tagName === 'SELECT' && this.children.length === 1) this.value = child.value; return child;
    }
    append(...children) { children.forEach(c => this.appendChild(c)); }
    insertBefore(child, before) { if (!before) return this.appendChild(child); child.remove(); const i = this.children.indexOf(before);
      if (i < 0) throw new Error('挿入先がない'); this.children.splice(i, 0, child); child.parentNode = this; return child;
    }
    prepend(child) { this.insertBefore(child, this.children[0]); }
    before(child) { this.parentNode.insertBefore(child, this); }
    after(child) { this.parentNode.insertBefore(child, this.nextSibling); }
    get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
    replaceChildren(...children) { for (const c of this.children) c.parentNode = null; this.children = []; children.forEach(c => this.appendChild(c)); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; }
    querySelectorAll(selector) { const selectors = selector.split(',').map(s => s.trim()); const all = [];
      function visit(el) { el.children.forEach(c => { if (selectors.some(s => matches(c, s))) all.push(c); visit(c); }); } visit(this); return all;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { const choices = selector.split(','); let el = this; while (el) { if (choices.some(s => matches(el, s))) return el; el = el.parentNode; } return null; }
    cloneNode(deep) { const copy = new Element(this.tagName); copy.id = this.id; copy.className = this.className; copy.style.cssText = this.style.cssText;
      copy.dataset = { ...this.dataset }; if (deep) this.children.forEach(c => copy.appendChild(c.cloneNode(true))); return copy;
    }
    get offsetWidth() { return parseFloat(this.style.width) || (this.id === 'board-design' ? 3840 : this.classList.contains('lab-card') ? 260 : this.id === 'stage' ? 1536 : 0); }
    get offsetHeight() { return parseFloat(this.style.height) || (this.id === 'board-design' ? 2160 : this.classList.contains('lab-card') ? 395 : this.id === 'stage' ? 864 : 0); }
    get offsetLeft() { return parseFloat(this.style.left) || 0; }
    get offsetTop() { return parseFloat(this.style.top) || 0; }
    get clientWidth() { return this.offsetWidth; } get clientHeight() { return this.offsetHeight; }
    getBoundingClientRect() { const board = this.closest('#board-design'), scale = board ? .4 : 1;
      const left = this.id === 'board-design' ? 0 : this.offsetLeft * scale, top = this.id === 'board-design' ? 0 : this.offsetTop * scale;
      return { left, top, width: this.offsetWidth * scale, height: this.offsetHeight * scale, right: left + this.offsetWidth * scale, bottom: top + this.offsetHeight * scale };
    }
    getContext() { return this.context ||= canvasContext(); }
    animate() { return { cancel() {}, finished: Promise.resolve() }; }
    scrollIntoView() {} click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
  }
  function parse(html, parent) {
    const stack = [parent], tags = String(html).match(/<!--[^]*?-->|<[^>]+>|[^<]+/g) || [];
    for (const tag of tags) {
      if (tag.startsWith('<!--')) continue;
      if (tag.startsWith('</')) { stack.pop(); continue; }
      if (!tag.startsWith('<')) { stack.at(-1)._text += tag; continue; }
      const name = tag.match(/^<([\w-]+)/)?.[1]; if (!name) continue;
      const el = new Element(name);
      const attrs = tag.slice(name.length + 1, -1);
      for (const [, key, quoted, single, plain] of attrs.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) el.setAttribute(key, quoted ?? single ?? plain ?? '');
      stack.at(-1).appendChild(el);
      if (!['img','input','meta','link','br','hr','source'].includes(name)) stack.push(el);
    }
  }
  const document = new Events(); document.body = new Element('body'); document.documentElement = new Element('html');
  document.documentElement.appendChild(document.body); document.baseURI = baseURI; document.readyState = 'loading'; document.currentScript = null;
  document.createElement = tag => new Element(tag); document.createTextNode = text => { const el = new Element('#text'); el.textContent = text; return el; };
  document.createComment = text => document.createTextNode(text);
  document.getElementById = id => document.body.querySelector('#' + id);
  document.querySelectorAll = sel => document.body.querySelectorAll(sel); document.querySelector = sel => document.body.querySelector(sel);
  document.fonts = { ready: Promise.resolve() };
  class Audio extends Events {
    constructor(src) { super(); this.currentTime = 0; this.volume = 1; if (src) this.src = src; }
    set src(url) { this._src = url;
      try {
        // 実WAVの尺を使う。カタログの期待値をそのままAudio.durationへ写さない。
        const data = fs.readFileSync(fileURLToPath(new URL(url, baseURI)));
        if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') throw new Error('WAVではない: ' + url);
        let bytes = 0, rate = 0;
        for (let pos = 12; pos + 8 <= data.length;) {
          const tag = data.toString('ascii', pos, pos + 4), n = data.readUInt32LE(pos + 4), at = pos + 8;
          if (at + n > data.length) throw new Error('WAVが途中で切れている: ' + url);
          if (tag === 'fmt ') rate = data.readUInt32LE(at + 8);
          if (tag === 'data') bytes += n;
          pos = at + n + n % 2;
        }
        if (!rate || !bytes) throw new Error('WAVの尺を読めない: ' + url);
        this.duration = bytes / rate; schedule(() => this.dispatchEvent(new Event('loadedmetadata')), 1);
      } catch (error) { this.duration = 0; schedule(() => this.dispatchEvent(new Event('error', { error })), 1); }
    }
    get src() { return this._src; }
    play() { this.ended = false; this.timer = schedule(() => { this.ended = true; this.dispatchEvent(new Event('ended')); }, this.duration * 1000); return Promise.resolve(); }
    pause() { pending.delete(this.timer); } removeAttribute() { this._src = ''; } load() {}
  }
  const window = new Events(), storage = new Map();
  Object.assign(window, { document, Event, Audio, Image: function () { return new Element('img'); }, URL, URLSearchParams,
    MutationObserver: class { constructor(callback) { this.callback = callback; } observe(target) { this.target = target; observers.push(this); } },
    console: { log() {}, error() {} }, performance: { now: () => now }, location: { protocol: 'file:', search: '' },
    innerWidth: 1536, innerHeight: 864, devicePixelRatio: 1,
    getComputedStyle: el => ({ transform: el.style.transform || 'none', filter: el.style.filter || 'none' }),
    localStorage: { getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val) },
    // Nodeは20fps相当の時計。画素の見た目は検査せず、全尺と命中・後片付けを確認する。
    requestAnimationFrame: fn => schedule(fn, 50), cancelAnimationFrame: id => pending.delete(id),
    setTimeout: (fn, ms = 0) => schedule(fn, ms), clearTimeout: id => pending.delete(id),
    setInterval: (fn, ms) => schedule(fn, ms, ms), clearInterval: id => pending.delete(id) });
  window.window = window; window.parent = window;
  const api = { context: window, document, drive, flush, Event, imageDelay: 1, parse: html => parse(html, document.body), now: () => now,
    advance: ms => drive(new Promise(resolve => schedule(resolve, ms))) };
  return api;
}
module.exports = { sandbox };
