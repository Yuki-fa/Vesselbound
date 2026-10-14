/* 全カードの行を内蔵CSVから作る。採取した演出経路とは番号で結び、欠落を隠さない。 */
var VbFxCardCatalog = (function () {
  'use strict';
  var kinds = { card: 'キャラ', enemy: 'エネミー', char: 'NPC', enchant: 'エンチャント',
    item: 'アイテム', ring: '指輪', mapPanelPower: 'マス', keyword: 'キーワード', specialFx: '共通演出' };
  function signature(row) {
    return JSON.stringify([row['No.'], row['名前'], row['効果'] || '', row['キーワード'] || '',
      row['合体効果'] || '', row['合体キーワード'] || '', row['VFX/SE'] || '', row['効果音'] || '']);
  }
  function unique(list, key) {
    var seen = new Set();
    return list.filter(function (x) { var value = key(x); if (seen.has(value)) return false; seen.add(value); return true; });
  }
  function dedicated(row, media, kind) {
    if (kind === 'specialFx' || media.generic) return false;
    var codes = [row['No.']].concat(String(row['VFX/SE'] || '').split(/[\s,、/]+/)).filter(Boolean);
    var code = media.sourceCode || (String(media.path || '').match(/^vfx:([^:]+):/) || [])[1] || String(media.path || '').split('/').pop().split('.')[0];
    return !/^S\d/.test(code) && (codes.indexOf(code) >= 0 || codes.indexOf(code.replace(/_\d+$/, '')) >= 0);
  }
  function setting(row, list, unknown, kind) {
    if (unknown.length) return '不明';
    if (!list.length) return '無し';
    return list.some(function (x) { return dedicated(row, x, kind); }) ? '専用' : '汎用';
  }
  function defaultVfxIndex(card) {
    var index = card.vfx.findIndex(function (vfx) { return dedicated(card.row, vfx, card.kind); });
    return index >= 0 ? index : card.vfx.length ? 0 : -1;
  }
  function labAssignments(row, kind, routes, definitions, catalog) {
    var adopted = routes.adopted[row['No.']], result = [];
    if (adopted) result.push({ name: adopted.name, basis: 'ADOPTED.md', adopted: !adopted.provisional, provisional: !!adopted.provisional });
    // 正式採用前の追加試作は、演出のラベルとカード名が一致するものだけ。
    // catalog.sourceだけでは大盾等の試験用素体をカードの割当と誤認する。
    definitions.forEach(function (fx) {
      var label = String(fx.label || ''), name = row['名前'];
      var matches = !!fx.sourceCode && [row['No.']].concat(String(row['VFX/SE'] || '').split(/[\s,、/]+/)).indexOf(fx.sourceCode.replace(/_\d+$/, '')) >= 0 || label === name || label.indexOf(name + '（') === 0 || label === name + '状態' || label === name + '獲得';
      if (!matches || result.some(function (x) { return x.name === fx.name; })) return;
      var conf = catalog[fx.name] || {};
      if (kind !== 'keyword' && kind !== 'specialFx' && conf.source !== row['No.']) return;
      result.push({ name: fx.name, basis: 'LABの演出名／試験設定', adopted: false });
    });
    return result;
  }
  function build(data, parse, routes, definitions, catalog) {
    var cards = [];
    Object.keys(kinds).forEach(function (kind) {
      var csv = data[kind] || (kind === 'card' ? data.panel : '') || '';
      parse(csv, ['No.', '名前']).forEach(function (row) {
        if (!row['名前'] || !/^[A-Z]+\d{3}(?:_\d+)?$/.test(row['No.'] || '')) return;
        var recorded = routes.records[row['No.']];
        var stale = !recorded || recorded.signature !== signature(row);
        var unknown = stale ? { vfx: ['演出台帳が未採取、またはシートが採取後に変更された。cards_scan.cjsで更新が必要'],
          se: ['演出台帳が未採取、またはシートが採取後に変更された。cards_scan.cjsで更新が必要'] }
          : recorded.unknown;
        // 被弾（hit）・カードの消滅・発動の光は全カード共通の演出なので一覧から外す（2026-10-06 利用者指定）。
        var vfx = stale ? [] : unique(recorded.vfx.filter(function (x) {
          return x.sourceCode !== 'hit' && !/(^|\/)hit\.webp$/.test(x.path || '') && !/^(playCardBurnAway|playEffectFlash)\b/.test(x.fn || '');
        }), function (x) { return [x.path, x.fn, x.ms, x.fadeMs, x.trigger].join('|'); });
        var se = stale ? [] : unique(recorded.se, function (x) { return x.path; });
        cards.push({ no: row['No.'], name: row['名前'], kind: kind, type: kinds[kind],
          effect: row['効果'] || '', keywords: row['キーワード'] || '', mergedEffect: row['合体効果'] || '',
          color: row['カラー'] || '', row: row, vfx: vfx, se: se, unknown: unknown,
          seRoutes: stale ? [] : recorded.se,
          vfxSetting: setting(row, vfx, unknown.vfx, kind), seSetting: setting(row, se, unknown.se, kind),
          lab: labAssignments(row, kind, routes, definitions || [], catalog || {}),
          adopted: routes.adopted[row['No.']] || null, notes: recorded && recorded.notes || [],
          approximate: vfx.length > 0 });
      });
    });
    return cards;
  }
  function filter(cards, query) {
    var search = String(query.search || '').trim().toLocaleLowerCase();
    return cards.filter(function (c) {
      return (!query.kind || c.kind === query.kind) && (!query.vfx || c.vfxSetting === query.vfx)
        && (!query.se || c.seSetting === query.se) && (!query.lab || (query.lab === 'yes') === !!c.lab.length)
        && (!search || (c.no + ' ' + c.name).toLocaleLowerCase().indexOf(search) >= 0);
    });
  }
  function summary(cards) {
    var result = { total: cards.length, kinds: {}, vfx: {}, se: {}, lab: 0, approximate: [], unknown: [] };
    ['専用', '汎用', '無し', '不明'].forEach(function (s) { result.vfx[s] = result.se[s] = 0; });
    cards.forEach(function (c) {
      result.kinds[c.type] = (result.kinds[c.type] || 0) + 1;
      result.vfx[c.vfxSetting]++; result.se[c.seSetting]++;
      if (c.lab.length) result.lab++;
      if (c.approximate) result.approximate.push(c.no);
      if (c.unknown.vfx.length || c.unknown.se.length) result.unknown.push({ no: c.no, name: c.name, reasons: c.unknown });
    });
    return result;
  }
  return { kinds: kinds, signature: signature, build: build, filter: filter, summary: summary,
    dedicated: dedicated, defaultVfxIndex: defaultVfxIndex };
})();
