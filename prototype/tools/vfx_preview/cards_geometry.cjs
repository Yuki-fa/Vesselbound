'use strict';
// 本体は変更せず、現在のCSS・素材からLABが使う寸法を採取する。
const fs = require('node:fs');
const path = require('node:path');
function gameGeometry(root) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [...html.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  function value(selector, property) {
    let result;
    for (const [, selectors, body] of rules) if (selectors.trim().split(',').map(s => s.trim()).includes(selector)) {
      for (const [, key, val] of body.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)) {
        if (key === property) result = val.replace(/\s*!important\s*$/, '').trim();
      }
    }
    if (result == null) throw new Error('ゲームのCSSに値がない: ' + selector + ' / ' + property);
    return result;
  }
  const px = (selector, property) => {
    const text = value(selector, property);
    if (!/^[\d.]+px$/.test(text)) throw new Error('px値ではない: ' + property + '=' + text);
    return parseFloat(text);
  };
  const result = {
    width: px(':root', '--game-w'), height: px(':root', '--game-h'),
    cardWidth: px(':root', '--prod-card-w'), cardHeight: px(':root', '--prod-card-h'),
    gap: px(':root', '--unit-field-gap'),
    enemyTop: px('html body:not(.reward-screen-active) #enemy-area', 'top'),
    allyTop: px('html body:not(.reward-screen-active) #ally-section', 'top'),
    backgroundPosition: value('#scr-battle.asset-backed::before', 'background-position'),
    artLeft: parseFloat(value('html body', '--new-card-art-left')) / 100,
    artTop: parseFloat(value('html body', '--new-card-art-top')) / 100,
    artHeight: parseFloat(value('html body', '--new-card-art-h')) / 100,
    hitWidthRatio: parseFloat(value('.damage-vfx-host .vfx-hit-video', 'width')) / 100,
    statAtkLeft: value(':root', '--unit-stat-atk-left'), statHpRight: value(':root', '--unit-stat-hp-right'),
    statBottom: value(':root', '--unit-stat-bottom'), statWidth: px(':root', '--unit-stat-w'),
    statFontSize: px('html body .slot.unit-card .slot-stats', 'font-size'),
    shieldBlend: value('html body .slot.unit-card .unit-portrait .unit-shield-layer', 'mix-blend-mode'),
  };
  const constants = fs.readFileSync(path.join(root, 'js/engine/constants.js'), 'utf8');
  result.frontSlots = Number(constants.match(/const ENEMY_FRONT_SLOTS\s*=\s*(\d+)/)[1]);
  result.fieldWidth = result.cardWidth * result.frontSlots + result.gap * (result.frontSlots - 1);
  result.fieldHeight = result.cardHeight * 2 + result.gap;
  return result;
}
function webpInfo(file) {
  const data = fs.readFileSync(file), frames = [];
  let width = 0, height = 0, loops = null;
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    for (let pos = 12; pos + 8 <= data.length;) {
      const tag = data.toString('ascii', pos, pos + 4), n = data.readUInt32LE(pos + 4), at = pos + 8;
      if (at + n > data.length) throw new Error('WebPが途中で切れている: ' + file);
      if (tag === 'VP8X') { width = data.readUIntLE(at + 4, 3) + 1; height = data.readUIntLE(at + 7, 3) + 1; }
      if (tag === 'ANIM') loops = data.readUInt16LE(at + 4);
      if (tag === 'ANMF') frames.push(data.readUIntLE(at + 12, 3));
      pos = at + n + (n % 2);
    }
  } else if (data.toString('ascii', 1, 4) === 'PNG') {
    width = data.readUInt32BE(16); height = data.readUInt32BE(20);
  }
  return { width, height, frameCount: frames.length, frameDurations: frames,
    durationMs: frames.reduce((a, b) => a + b, 0), loops };
}
module.exports = { gameGeometry, webpInfo };
