'use strict';

// 指定したCSS宣言を1本だけ外し、計算済みスタイルが変わるかを実ブラウザで調べる。
// 状態ごとにブラウザを作り直すので、状態同士のDOM・G・CSSOMを共有しない。
const { launch } = require('./headless');
const { STATES, PAGE_LIB } = require('./style_effect_audit');

const URL = process.env.VB_URL || 'http://127.0.0.1:5500/index.html';
const ONLY = process.env.VB_ONLY || '';

const stateByName = Object.fromEntries(STATES.map(([name, code, wait]) =>
  [name, { code, wait: wait || 900 }]));

// 既存監査では前の状態から引き継いでいたものだけ、単独実行できるよう補う。
stateByName.ringReturn = {
  code: `G.phase='reward'; G._isRingExchange=true; G._ringOfferPhase=true;
    G._ringOfferResolved=false; G._boardDiscardCount=1; renderRewCards&&renderRewCards();
    _confirmRingExchangeReturn&&_confirmRingExchangeReturn(()=>{});`,
  wait: 700,
};
stateByName.forgeNoTarget = {
  code: `openMapForge&&openMapForge(); await new Promise(r=>setTimeout(r,500));
    G.phase='reward'; G._debugMode=true; G._isShop=false; G._isForge=true;
    G._isItemShop=false; G._isRingExchange=false; G._isVillageMenu=false;
    document.body.classList.add('reward-screen-active');
    document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
    document.getElementById('scr-battle')?.classList.add('active');
    G.gold=9999; G._mapForgeOffers=(typeof MAP_PANEL_POWERS!=='undefined'?MAP_PANEL_POWERS.slice(0,3).map(x=>({...x})):[]);
    G.mapPanelPowers=new Array(15).fill(''); renderMapForgeOffers&&renderMapForgeOffers();`,
  wait: 700,
};
stateByName.battleBadges = {
  code: `G._isLibrary=false; startTestBattle&&startTestBattle(); await new Promise(r=>setTimeout(r,900));
    (G.enemies||[]).filter(Boolean).forEach(u=>{ u.poison=2; u.allyTarget=true; u.hate=true; u.hateTurns=2; u.shield=1; u.stealth=true; u.guardian=true; });
    (G.allies||[]).filter(Boolean).forEach(u=>{ u.poison=1; u.shield=1; });
    G.mana=3; renderAll&&renderAll(); renderManaHud&&renderManaHud();`,
  wait: 800,
};
stateByName.itemSellHover = {
  code: `__caRewardSetup(); G._isShop=true; G._isForge=false; G._isItemShop=true;
    G.spellSlots=[PANEL_POOL.find(c=>c&&(c.type==='item'||c.kind==='item'||['アイテム','道具'].includes(String(c.category||''))))||null,null,null,null];
    _syncRewardProductionUi&&_syncRewardProductionUi();`,
  wait: 700,
};

const TARGETS = [
  { id: 1, selector: 'html body.test-battle-active #scr-battle.active #btn-pass', prop: 'font-size', value: '34px', chain: true,
    // 共有の testBattleEnd 状態は戦闘画面を active にしないので、セレクタの #scr-battle.active が一致しない。
    extra: `document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active')); document.getElementById('scr-battle').classList.add('active'); try{ renderControls(); }catch(e){} await new Promise(r=>setTimeout(r,300));`, state: 'testBattleEnd', setup: '_armBattleContinue / renderControls' },
  { id: 2, selector: '#gameover-actions .btn', prop: 'font-size', value: '18px', media: 'max-width', state: 'gameover', width: 1000, height: 1080, setup: 'gameOver' },
  { id: 3, selector: 'body.village-screen-active #village-move-btns .rew-move-btn', prop: 'font-size', value: '26px', state: 'villageMove', setup: 'openMapVillage' },
  { id: 4, selector: '#scr-title.startup-menu-hover-ready .title-menu-item:hover', prop: 'color', value: 'rgb(255, 255, 255)', state: 'titleMenuHover', hover: true, setup: 'showScreen / startup-menu-hover-ready' },
  { id: 5, selector: '.slot-desc-enchant-line', prop: 'color', value: 'var(--blue2)', chain: true, state: 'battleEnchantAndDead', setup: 'startTestBattle / renderAll' },
  { id: 6, selector: '.b-dead', prop: 'color', value: 'var(--red2)', chain: true, state: 'battleEnchantAndDead', setup: 'startTestBattle / instadead / renderAll' },
  { id: 7, selector: '.card-badge', prop: 'color', value: 'var(--gold2)', chain: true, state: 'battleBadges', setup: 'renderAll' },
  { id: 8, selector: '.card-badge', prop: 'font-size', value: '29px', chain: true, state: 'battleBadges', setup: 'renderAll' },
  { id: 9, selector: '#mana-hud .mana-row', prop: 'color', value: '#f4e7c8', state: 'manaHud', setup: 'renderManaHud' },
  { id: 10, selector: '#mana-hud .mana-row', prop: 'font-size', value: '13px', state: 'manaHud', setup: 'renderManaHud' },
  { id: 11, selector: '#shop-return-confirm .shop-return-confirm-box', prop: 'color', value: 'var(--gold2)', state: 'ringReturn', setup: '_confirmRingExchangeReturn' },
  { id: 12, selector: '#shop-return-confirm .shop-return-confirm-msg', prop: 'color', value: '#f0d080', state: 'ringReturn', setup: '_confirmRingExchangeReturn' },
  { id: 13, selector: '#shop-return-confirm .shop-return-confirm-msg', prop: 'font-size', value: 'calc(26px * var(--game-scale))', state: 'ringReturn', setup: '_confirmRingExchangeReturn' },
  { id: 14, selector: '#shop-return-confirm .btn', prop: 'font-size', value: 'calc(22px * var(--game-scale))', state: 'ringReturn', setup: '_confirmRingExchangeReturn' },
  { id: 15, selector: '#online-matching-overlay .omo-player', prop: 'font-size', value: '56px', state: 'online', setup: '__caPatchOnlineState / showOnlineMatching' },
  { id: 16, selector: '#online-matching-overlay .omo-player.is-self', prop: 'color', value: '#f4e7c8', state: 'online', setup: '__caPatchOnlineState / showOnlineMatching' },
  { id: 17, selector: '#online-rival-hud .orh-slot.is-defeated .orh-id', prop: 'color', value: '#8b7c67', chain: true,
    // 対戦相手の枠はマッチング中（matching:true）には出ないので、マッチング後の状態に差し替えて描き直す。
    extra: `const __st=__caPatchOnlineState(); __st.matching=false; OnlineMatch.getState=()=>JSON.parse(JSON.stringify(__st)); try{ renderOnlineHud(); }catch(e){} await new Promise(r=>setTimeout(r,300));`, state: 'online', setup: '__caPatchOnlineState / renderOnlineHud' },
  { id: 18, selector: 'html body #reward-offer-row > .rew-card.forge-card.forge-no-target > .shop-buy-price', prop: 'color', value: '#a58768', chain: true, state: 'forgeNoTarget', setup: 'openMapForge / renderMapForgeOffers' },
  { id: 19, selector: 'html body.reward-screen-active .reward-prod-item .reward-prod-slots i > .shop-board-sell-value.item-shop-sell-action:hover', prop: 'color', value: 'var(--gold2)', chain: true, state: 'itemSellHover', hover: true, setup: '_syncRewardProductionUi' },
];

const DYNAMIC_PSEUDO = /:(hover|focus|focus-visible|focus-within|active|target|visited|checked)\b/g;
const ELEMENT_PSEUDO = /::?(before|after|placeholder|marker|first-line|first-letter|selection)\s*$/;

function normalizeSelector(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1')
    .replace(/\s*([,:>+~])\s*/g, '$1')
    .trim();
}

function splitSelectorList(value) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === '(' || c === '[') depth += 1;
    else if (c === ')' || c === ']') depth -= 1;
    else if (c === ',' && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out.filter(Boolean);
}

async function inspectTarget(browser, target) {
  return browser.eval(`
    const target = ${JSON.stringify(target)};
    const normalize = ${normalizeSelector.toString()};
    const splitSelectorList = ${splitSelectorList.toString()};
    const dynamicPseudo = /:(hover|focus|focus-visible|focus-within|active|target|visited|checked)\\b/g;
    const elementPseudo = /::?(before|after|placeholder|marker|first-line|first-letter|selection)\\s*$/;
    const rules = [];
    const walk = (list, parent) => {
      for (const rule of list || []) {
        if (rule.type === CSSRule.STYLE_RULE) rules.push({ rule, parent });
        else if (rule.cssRules) { try { walk(rule.cssRules, rule); } catch (_) {} }
      }
    };
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules, sheet); } catch (_) {}
    }
    const wanted = normalize(target.selector);
    const computedValue = (el, pseudo) => {
      const cs = getComputedStyle(el, pseudo || null);
      if (target.prop === 'font-size') return cs.fontSize;
      if (target.prop === '-webkit-text-fill-color') return cs.webkitTextFillColor;
      return cs.getPropertyValue(target.prop);
    };
    const freeze = (el) => {
      const saved = {};
      for (const p of ['transition', 'animation']) {
        saved[p] = [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)];
        el.style.setProperty(p, 'none', 'important');
      }
      return () => Object.entries(saved).forEach(([p, [v, pri]]) => {
        if (v) el.style.setProperty(p, v, pri); else el.style.removeProperty(p);
      });
    };
    const readable = el => {
      if (!el) return '';
      const id = el.id ? '#' + el.id : '';
      const cls = el.classList && el.classList.length ? '.' + [...el.classList].slice(0, 3).join('.') : '';
      return el.tagName.toLowerCase() + id + cls;
    };
    const targetsFor = (selectorParts, forceHover) => {
      const found = [];
      for (const part of selectorParts) {
        const pseudoMatch = part.match(elementPseudo);
        const pseudo = pseudoMatch ? '::' + pseudoMatch[1] : null;
        let base = pseudoMatch ? part.slice(0, pseudoMatch.index) : part;
        if (forceHover) base = base.replace(dynamicPseudo, '').trim();
        try {
          for (const el of document.querySelectorAll(base || '*')) found.push({ el, pseudo });
        } catch (_) {}
      }
      return [...new Map(found.map(x => [x.el, x])).values()];
    };
    const results = [];
    for (const { rule, parent } of rules) {
      if (!rule.selectorText) continue;
      const parts = splitSelectorList(rule.selectorText);
      const matchingParts = parts.filter(part => normalize(part) === wanted);
      if (!matchingParts.length || !rule.style.getPropertyValue(target.prop)) continue;
      // **同じセレクタの別の規則まで外さない。** 値と @media 条件が対象の宣言と一致する規則だけを調べる
      // （以前は #gameover-actions .btn の 44px!important まで外し、18px が効いていると誤判定した）。
      const hexToRgb = v => String(v).replace(/#([0-9a-f]{6})\\b/gi, (m, h) => 'rgb(' + [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')');
      const valNorm = v => hexToRgb(String(v || '')).replace(/\\s+/g, '').toLowerCase();
      if (target.value && valNorm(rule.style.getPropertyValue(target.prop)) !== valNorm(target.value)) continue;
      if (target.media && !String(parent && parent.conditionText || '').includes(target.media)) continue;
      if (!target.media && parent && parent.conditionText) continue;
      const isHover = target.hover || matchingParts.some(part => dynamicPseudo.test(part));
      dynamicPseudo.lastIndex = 0;
      let cssRule = rule;
      let holder = parent;
      let index = [...holder.cssRules].indexOf(rule);
      let restoreHover = () => {};
      try {
        if (isHover) {
          const forcedSelector = rule.selectorText.replace(/:hover\\b/g, '.__decl-effect-hover');
          const cssText = forcedSelector + '{' + rule.style.cssText + '}';
          holder.insertRule(cssText, index + 1);
          cssRule = holder.cssRules[index + 1];
          index += 1;
          const hoverEls = targetsFor(matchingParts, true);
          hoverEls.forEach(({ el }) => el.classList.add('__decl-effect-hover'));
          restoreHover = () => hoverEls.forEach(({ el }) => el.classList.remove('__decl-effect-hover'));
        }
        const matched = targetsFor(matchingParts, isHover);
        const cleanups = matched.map(({ el }) => freeze(el));
        const before = matched.map(({ el, pseudo }) => computedValue(el, pseudo));
        const oldValue = cssRule.style.getPropertyValue(target.prop);
        const oldPriority = cssRule.style.getPropertyPriority(target.prop);
        cssRule.style.removeProperty(target.prop);
        const after = matched.map(({ el, pseudo }) => computedValue(el, pseudo));
        cssRule.style.setProperty(target.prop, oldValue, oldPriority);
        cleanups.forEach(fn => fn());
        const changed = [];
        before.forEach((value, i) => { if (value !== after[i] && changed.length < 3) changed.push({ element: readable(matched[i].el), before: value, after: after[i] }); });
        results.push({ selector: rule.selectorText, prop: target.prop, media: holder.conditionText || null,
          matched: matched.length, changed, outcome: matched.length === 0 ? '状態が作れていない' : changed.length ? '効いている（残す）' : '効いていない（削除候補）' });
      } catch (error) {
        results.push({ selector: rule.selectorText, prop: target.prop, matched: 0, outcome: '検査エラー', error: String(error && error.message || error) });
      } finally {
        restoreHover();
        if (isHover && index >= 0) { try { holder.deleteRule(index); } catch (_) {} }
      }
    }
    if (!results.length) return { found: false, outcome: '規則なし', matched: 0, changed: [] };
    const matched = results.reduce((n, r) => n + r.matched, 0);
    const changed = results.reduce((n, r) => n + r.changed.length, 0);
    return { found: true, outcome: matched === 0 ? '状態が作れていない' : changed ? '効いている（残す）' : '効いていない（削除候補）',
      matched, changed: results.flatMap(r => r.changed).slice(0, 3), rules: results };
  `);
}

async function runOne(target) {
  const state = stateByName[target.state];
  if (!state) return { id: target.id, selector: target.selector, outcome: '状態が作れていない', reason: `状態定義なし: ${target.state}` };
  const browser = await launch({ width: target.width || 1920, height: target.height || 1080 });
  try {
    await browser.goto(URL, 1500);
    await browser.waitFor('typeof startGame === "function" && typeof G !== "undefined"', 30000);
    await browser.eval(PAGE_LIB + 'return 1;');
    const chainCodes = target.chain ? STATES.slice(0, STATES.findIndex(([n]) => n === target.state)).map(([n, c, w]) => `try{ ${c} }catch(e){} await new Promise(r=>setTimeout(r,${w || 900}));`).join('\n') : '';
    const setup = await browser.eval(`
      ${chainCodes}
      try { ${state.code}; await new Promise(r => setTimeout(r, ${state.wait})); ${target.extra || ''} return { ok: true }; }
      catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
    `);
    if (!setup || !setup.ok) return { id: target.id, selector: target.selector, prop: target.prop, state: target.state, setup: target.setup, outcome: '状態が作れていない', reason: setup && setup.reason || '状態生成に失敗' };
    const result = await inspectTarget(browser, target);
    return { id: target.id, selector: target.selector, prop: target.prop, state: target.state, setup: target.setup, ...result };
  } catch (error) {
    return { id: target.id, selector: target.selector, prop: target.prop, state: target.state, setup: target.setup, outcome: '状態が作れていない', reason: String(error && error.message || error) };
  } finally {
    await browser.close();
  }
}

(async () => {
  const targets = TARGETS.filter(t => !ONLY || `${t.id} ${t.selector} ${t.state}`.includes(ONLY));
  if (!targets.length) throw new Error(`VB_ONLY に一致する対象がありません: ${ONLY}`);
  const results = [];
  for (const target of targets) {
    const result = await runOne(target);
    results.push(result);
    console.log(`${result.id}. ${result.outcome}／一致要素数=${result.matched || 0}／${result.selector}／状態=${result.state}`);
    if (result.changed && result.changed.length) console.log('   変更例:', JSON.stringify(result.changed));
    if (result.reason) console.log('   理由:', result.reason);
  }
  const counts = {};
  results.forEach(r => { counts[r.outcome] = (counts[r.outcome] || 0) + 1; });
  console.log('判定件数:', JSON.stringify(counts));
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
