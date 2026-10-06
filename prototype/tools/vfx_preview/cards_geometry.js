/* 本体CSSから採取したゲーム内座標。演出の一覧と全カードタブで共用。 */
var VbFxLabGeometry = (function () {
  'use strict';
  var game = VbFxCardRoutes.geometry;
  function position(side, lane, count, index) {
    return { left: (game.width - game.cardWidth) / 2
      + (index - (count - 1) / 2) * (game.cardWidth + game.gap),
      top: (side === 'enemy' ? game.enemyTop : game.allyTop)
        + ((side === 'enemy') === (lane === 'front') ? game.cardHeight + game.gap : 0) };
  }
  function applyCard(el, side, lane, count, index) {
    var p = position(side, lane, count, index);
    el.style.left = p.left + 'px'; el.style.top = p.top + 'px';
    el.dataset.lane = lane; el.dataset.lanePosition = String(index);
  }
  function mediaBox(vfx, source, target, targets) {
    var g = vfx.geometry || {}, anchor = g.anchor === 'source' ? source : target;
    var width = anchor.offsetWidth * (g.widthRatio || game.hitWidthRatio * (Number(vfx.scale) || 1));
    var box = { left: anchor.offsetLeft + anchor.offsetWidth / 2 + anchor.offsetWidth * (g.offsetX || 0),
      top: anchor.offsetTop + anchor.offsetHeight / 2 + anchor.offsetHeight * (g.offsetY || 0),
      width: width, height: g.heightRatio ? anchor.offsetHeight * g.heightRatio : null,
      rise: anchor.offsetHeight * (g.rise || 0), anchor: anchor };
    if (g.contact && targets && targets.length) {
      var left = Math.min.apply(null, targets.map(function (el) { return el.offsetLeft; }));
      var right = Math.max.apply(null, targets.map(function (el) { return el.offsetLeft + el.offsetWidth; }));
      var top = Math.min.apply(null, targets.map(function (el) { return el.offsetTop; }));
      var bottom = Math.max.apply(null, targets.map(function (el) { return el.offsetTop + el.offsetHeight; }));
      if (g.contact === 'all') { box.left = game.width / 2; box.top = (top + bottom) / 2; }
      if (g.contact === 'tri') {
        box.width = (right - left) * g.spanWidthRatio;
        box.left = (left + right) / 2 + box.width * g.drawOffsetX;
        box.top = top + Math.max.apply(null, targets.map(function (el) { return el.offsetHeight; })) / 2;
      }
    }
    return box;
  }
  function visibleMs(vfx) {
    // 実機と同じ再生時間（ゲームが指定する尺。LABの速さのつまみは新しい演出用なので掛けない。2026-10-06 利用者指定）。
    return vfx.loop ? Math.max(1, vfx.asset && vfx.asset.durationMs || 3000) : (Number(vfx.ms) || 800);
  }
  var board = document.getElementById('board-design');
  if (board) {
    var variables = { '--lab-game-w': game.width, '--lab-game-h': game.height,
      '--lab-card-w': game.cardWidth, '--lab-card-h': game.cardHeight,
      '--lab-art-left': game.artLeft * 100 + '%', '--lab-art-top': game.artTop * 100 + '%', '--lab-art-h': game.artHeight * 100 + '%',
      '--lab-stat-atk-left': game.statAtkLeft, '--lab-stat-hp-right': game.statHpRight, '--lab-stat-bottom': game.statBottom,
      '--lab-stat-w': game.statWidth, '--lab-stat-font': game.statFontSize };
    Object.keys(variables).forEach(function (key) { var val = variables[key]; board.style.setProperty(key, typeof val === 'number' ? val + 'px' : val); });
  }
  return { game: game, position: position, applyCard: applyCard, mediaBox: mediaBox, visibleMs: visibleMs };
})();
