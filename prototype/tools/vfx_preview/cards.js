/* 全カードの確認画面。preview.jsの再生・SE同期は変更せず公開APIを呼ぶ。 */
var VbFxCards = (function () {
  'use strict';
  var cards = [], selected = null, token = 0, voices = [], animations = [], hosts = [];
  var history = [], activeRecord = null;
  var listed = [], cardList;
  // チェック用の★。全カードに付けられる（2026-10-06 利用者指定）。この端末のブラウザにだけ保存する。
  var STAR_KEY = 'vbfx-card-stars', stars = {};
  try { stars = JSON.parse(localStorage.getItem(STAR_KEY) || '{}') || {}; } catch (e) { stars = {}; }
  function hasOwnVfx(card) { return card.vfxSetting === '専用' || (card.lab && card.lab.length > 0); }
  function starButton(card) {
    var b = element('span', 'card-star' + (stars[card.no] ? ' on' : ''), stars[card.no] ? '★' : '☆');
    b.setAttribute('role', 'button'); b.tabIndex = 0; b.title = card.no + ' のチェック';
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (stars[card.no]) delete stars[card.no]; else stars[card.no] = true;
      try { localStorage.setItem(STAR_KEY, JSON.stringify(stars)); } catch (e) { /* 保存できない環境では表示だけ */ }
      document.querySelectorAll('.card-star[data-no="' + card.no + '"]').forEach(function (x) { x.textContent = stars[card.no] ? '★' : '☆'; x.classList.toggle('on', !!stars[card.no]); });
    });
    b.dataset.no = card.no; return b;
  }
  var page, detail, tableBody, stageMount, stage, playbar, stageAnchor, playAnchor, original, sidebar;
  var $ = function (id) { return document.getElementById(id); };
  function element(tag, className, value) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = value;
    return el;
  }
  function button(text, fn) {
    var b = element('button', '', text); b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  function status(message) { $('card-play-status').textContent = message; }
  function label(text) {
    var el = element('span', 'card-label', text); el.dataset.setting = text; return el;
  }
  function stop() {
    if (window.VbFxLabCheck && VbFxLabCheck.busy()) return;
    if (activeRecord && !activeRecord.completed && activeRecord.status !== 'failed') {
      activeRecord.status = 'cancelled'; activeRecord.finishedAt = performance.now();
    }
    token++;
    voices.forEach(function (a) { a.pause(); a.currentTime = 0; if (a._vbFinish) a._vbFinish(); }); voices = [];
    animations.forEach(function (a) { a.cancel(); }); animations = [];
    hosts.forEach(function (h) { h.remove(); }); hosts = [];
    if (window.VbFxPreview) VbFxPreview.stop();
  }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function showPlayback() {
    if (!page.hidden) stage.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function timing(vfx) {
    return vfx.loop ? '常時（停止操作まで表示）'
      : 'ゲーム ' + vfx.ms + 'ms / 素材1周 ' + (vfx.asset && vfx.asset.durationMs || 0) + 'ms'
        + (vfx.fadeMs ? ' ＋ フェード' + vfx.fadeMs + 'ms' : '');
  }
  function record(card, kind, name) {
    var entry = { id: token, card: card.no, kind: kind, name: name, status: 'loading', requestedAt: performance.now(), completed: false };
    history.push(entry); if (history.length > 100) history.shift(); activeRecord = entry;
    return entry;
  }
  function audio(path) {
    var voice = new Audio(new URL('../' + path, document.baseURI).href);
    voice.volume = Number($('volume').value); voices.push(voice);
    return new Promise(function (resolve) {
      voice._vbFinish = resolve;
      voice.addEventListener('ended', resolve, { once: true });
      voice.addEventListener('error', function () { status('SEを読み込めません：' + path); resolve(); }, { once: true });
      voice.play().catch(function (err) { status('SE再生：' + err.message); resolve(); });
    });
  }
  function animate(el, frames, ms) {
    var a = el.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
    animations.push(a); return a;
  }
  function choose(no) {
    selected = cards.find(function (c) { return c.no === no; });
    if (!selected) return;
    tableBody.querySelectorAll('tr').forEach(function (r) { r.classList.toggle('selected', r.dataset.no === no); });
    if (cardList) cardList.querySelectorAll('button').forEach(function (b) { var on = b.dataset.no === no; b.classList.toggle('selected', on); b.setAttribute('aria-current', on ? 'true' : 'false'); if (on) b.scrollIntoView({ block: 'nearest' }); });
    detail.replaceChildren();
    var heading = element('h2'); heading.appendChild(element('code', '', selected.no));
    heading.appendChild(document.createTextNode(' · ' + selected.name)); detail.appendChild(heading);
    detail.appendChild(element('p', '', selected.type + ' / 現行VFX：' + selected.vfxSetting + ' / 現行SE：' + selected.seSetting));
    detail.appendChild(element('p', '', selected.effect || selected.keywords || '効果文なし'));
    var controls = element('div', 'card-detail-controls');
    if (selected.lab.length) {
      var labs = element('select'); labs.id = 'card-lab-choice'; labs.setAttribute('aria-label', 'LAB演出');
      selected.lab.forEach(function (fx) { var op = element('option', '', fx.name + (fx.adopted ? '（SE採用済み）' : '（試作）')); op.value = fx.name; labs.appendChild(op); });
      controls.appendChild(labs); controls.appendChild(button('LAB再生', function () { playLab(selected); }));
    }
    var choice = element('select'); choice.id = 'card-current-choice'; choice.setAttribute('aria-label', '現行演出の経路');
    var all = element('option', '', '確認できた現行演出を順に比較'); all.value = '-1'; choice.appendChild(all);
    selected.vfx.forEach(function (vfx, i) {
      var op = element('option', '', (i + 1) + '. ' + (vfx.path || vfx.fn) + ' / ' + vfx.trigger + ' / ' + timing(vfx));
      op.value = String(i); choice.appendChild(op);
    });
    choice.value = String(VbFxCardCatalog.defaultVfxIndex(selected));
    choice.disabled = !selected.vfx.length; controls.appendChild(choice);
    controls.appendChild(button('現行再生（近似）', function () { playCurrent(selected); }));
    var currentSe = button('現行SEだけ', function () { listen(selected, false); });
    currentSe.disabled = !selected.se.length; controls.appendChild(currentSe);
    if (selected.adopted) controls.appendChild(button('採用SEだけ', function () { listen(selected, true); }));
    controls.appendChild(button('停止', function () { stop(); status('停止しました'); }));
    var volumeLabel = element('label', '', '音量 '), volume = element('input');
    volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '.01'; volume.value = $('volume').value;
    volume.addEventListener('input', function () {
      $('volume').value = volume.value; $('volume').dispatchEvent(new Event('input'));
      voices.forEach(function (voice) { voice.volume = Number(volume.value); });
    });
    volumeLabel.appendChild(volume); controls.appendChild(volumeLabel);
    detail.appendChild(controls);
    var ps = element('p', 'card-play-status', '番号を指定して改良内容を伝えられます。'); ps.id = 'card-play-status'; ps.setAttribute('role', 'status'); detail.appendChild(ps);
    detail.appendChild(element('p', '', 'LAB再生は既存のVbFxPreview.playを使用（既存の候補選択・命中時刻とのSE合わせを維持）。現行再生は本体で採取した素材／関数と尺による近似です。'));
    if (selected.unknown.vfx.length || selected.unknown.se.length) {
      detail.appendChild(element('p', 'card-unknown', '不明：' + selected.unknown.vfx.concat(selected.unknown.se).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' / ')));
    }
  }
  async function playLab(card) {
    if (window.VbFxLabCheck && VbFxLabCheck.busy()) return;
    if (!selected || selected.no !== card.no) choose(card.no); stop();
    showPlayback();
    var name = $('card-lab-choice').value;
    var id = token, entry = record(card, 'lab', name);
    entry.status = 'playing'; entry.startedAt = performance.now();
    entry.expectedMs = VbFx.duration(name, Number($('speed').value));
    status(card.no + ' · LAB ' + name + '（既存のSE合わせ）');
    try {
      var result = await VbFxPreview.play(name);
      entry.result = result.result; entry.finishedAt = performance.now();
      entry.elapsedMs = entry.finishedAt - entry.startedAt;
      entry.completed = !result.result.cancelled; entry.status = entry.completed ? 'completed' : 'cancelled';
      entry.looping = !!result.result.looping;
      if (id === token) status(card.no + ' · LAB ' + name + (entry.completed ? ' 再生完了' : ' 停止されました') + (entry.looping ? '（常時表示は継続）' : ''));
    } catch (err) { entry.status = 'failed'; entry.error = err.message; if (id === token) status('LAB再生：' + err.message); }
  }
  // 発生元は味方前衛の真ん中、対象は敵（前衛の真ん中。全体の演出は敵全体）。2026-10-06 利用者指定。
  function middleOf(side, lane) {
    var row = Array.from(document.querySelectorAll('.lab-card[data-side="' + side + '"][data-lane="' + lane + '"]'))
      .filter(function (el) { return !el.classList.contains('summon-slot') || el.classList.contains('is-summoned'); })
      .sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
    return row[Math.floor((row.length - 1) / 2)] || null;
  }
  function sourceAndTarget() {
    var snapshot = VbFxPreview.snapshot();
    var source = middleOf('ally', 'front') || $(snapshot.sourceId), target = middleOf('enemy', 'front') || $(snapshot.targetIds[0]) || source;
    var foes = Array.from(document.querySelectorAll('.lab-card[data-side="enemy"]'));
    return { source: source, target: target, targets: foes.length ? foes : [target] };
  }
  async function playAsset(vfx, nodes, id, entry, onStart, retainLoop) {
    if (id !== token) return;
    var board = $('board-design'), source = nodes.source;
    var target = vfx.mode === 'death' ? source : nodes.target;
    if (!target || !source) throw new Error('発生元または対象のカードがありません');
    var ms = VbFxLabGeometry.visibleMs(vfx, Number($('speed').value));
    var fadeMs = Math.max(0, Number(vfx.fadeMs) || 0);
    var host;
    var definition = (String(vfx.path || '').match(/^vfx:[^:]+:([^:]+)$/) || [])[1];
    var playing = null;
    if (definition) {
      host = element('div', 'card-current-vfx');
      var at = vfx.geometry && vfx.geometry.anchor === 'source' ? source : target;
      var rect = at.getBoundingClientRect(), scale = Number($('size').value);
      Object.assign(host.style,{ position:'fixed',left:rect.left+'px',top:rect.top+'px',
        width:rect.width+'px',height:rect.height+'px',transform:'none',pointerEvents:'none' });
      document.body.appendChild(host);
      VbFx.settings.layer = document.body;
      playing = VbFx.play(definition,{ source:host,targets:[host],durationMs:Math.max(1,ms),size:scale,
        repeat:!!vfx.loop,followGeometry:true,followOpacity:true,seed:53,dir:1,key:'card-current:'+id });
      playing.catch(function(err){ status('定義の再生：'+err.message); });
      entry.geometry = {width:rect.width*scale,height:rect.height*scale,centerX:rect.left+rect.width/2,centerY:rect.top+rect.height/2,cardWidth:source.offsetWidth};
    } else if (vfx.path) {
      host = element('img', 'card-current-vfx'); host.alt = vfx.path;
      host.src = new URL('../' + vfx.path, document.baseURI).href + '?card-lab=' + id;
      // デコード待ちを演出尺に含めない。初回のfile://読み込みでも最後のコマまで見せる。
      await host.decode();
      if (id !== token) return;
      var box = VbFxLabGeometry.mediaBox(vfx, source, target, nodes.targets), multiplier = Number($('size').value);
      var width = box.width * multiplier, x = box.left, y = box.top;
      host.style.width = width + 'px'; host.style.height = box.height ? box.height * multiplier + 'px' : 'auto';
      host.style.objectFit = vfx.geometry && vfx.geometry.fit || 'contain';
      if (vfx.geometry && vfx.geometry.blend) host.style.mixBlendMode = vfx.geometry.blend;
      entry.geometry = { width: width, height: box.height ? box.height * multiplier : (vfx.asset && vfx.asset.width ? width * vfx.asset.height / vfx.asset.width : null),
        centerX: x, centerY: y, cardWidth: source.offsetWidth };
      host.style.left = x + 'px'; host.style.top = y + 'px'; board.appendChild(host);
      if (vfx.mode === 'projectile') {
        var sx = source.offsetLeft + source.offsetWidth / 2, sy = source.offsetTop + source.offsetHeight / 2;
        host.style.left = sx + 'px'; host.style.top = sy + 'px';
        animate(host, [{ transform: 'translate(-50%,-50%)' },
          { transform: 'translate(calc(-50% + ' + (x - sx) + 'px),calc(-50% + ' + (y - sy) + 'px))' }], ms);
      } else if (box.rise) {
        animate(host, [{ transform: 'translate(-50%,-50%)' },
          { transform: 'translate(-50%,calc(-50% - ' + box.rise + 'px))' }], ms);
      }
    } else if (vfx.mode === 'death') {
      host = target.cloneNode(true); host.removeAttribute('id'); host.style.pointerEvents = 'none'; board.appendChild(host);
      animate(host, [{ opacity: 1, filter: 'brightness(1)' }, { opacity: 0, filter: 'brightness(2) grayscale(1)' }], ms);
    } else {
      host = element('div', 'card-current-flash');
      host.style.setProperty('--flash-color', { red: '#f16659', yellow: '#ebc36a', blue: '#80aff0', green: '#77dd93', white: '#fff' }[vfx.trigger] || '#fff');
      source.appendChild(host); animate(host, [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }], ms);
    }
    hosts.push(host);
    await new Promise(function (resolve) {
      var fallback = setTimeout(resolve, 500);
      requestAnimationFrame(function () { clearTimeout(fallback); resolve(); });
    });
    if (id !== token) return;
    entry.status = 'playing'; entry.startedAt = performance.now(); entry.expectedMs = ms + (vfx.loop ? 0 : fadeMs);
    if (onStart) onStart();
    await wait(ms);
    if (id !== token) return;
    if (!vfx.loop && fadeMs) { animate(host, [{ opacity: 1 }, { opacity: 0 }], fadeMs); await wait(fadeMs); }
    if (id !== token) return;
    entry.finishedAt = performance.now(); entry.elapsedMs = entry.finishedAt - entry.startedAt;
    entry.completed = true; entry.status = 'completed'; entry.looping = !!(vfx.loop && retainLoop);
    if (!entry.looping) { if(definition) VbFx.stop({name:definition,key:'card-current:'+id}); host.remove(); hosts = hosts.filter(function (h) { return h !== host; }); }
  }
  async function playCurrent(card) {
    if (window.VbFxLabCheck && VbFxLabCheck.busy()) return;
    if (!selected || selected.no !== card.no) choose(card.no); stop(); var id = token;
    showPlayback();
    // 既存の盤面を使い、発生元・対象・速さ・大きさの選択を維持する。
    var nodes = sourceAndTarget(), value = Number($('card-current-choice').value);
    // 肩代わり（マータ等）は、ゲームでは肩代わりした本人が被弾した位置に固有VFXが出る（present.js presentDamageVfxSource）。
    // 一覧では本人＝味方前衛の真ん中に出す（2026-10-06 利用者指摘：マータのVFXが敵側に出る）。
    if (/代わりに受ける/.test(card.effect || '')) { nodes.target = nodes.source; nodes.targets = [nodes.source]; }
    var paths = value < 0 ? card.vfx : card.vfx.slice(value, value + 1);
    if (!paths.length) {
      if (card.se.length) { status(card.no + ' · VFXなし、現行SEを再生'); for (var sound of card.se) { if (id !== token) break; await audio(sound.path); } }
      else status(card.no + ' · ' + (card.unknown.vfx.length || card.unknown.se.length ? '演出を確定できません。注記を確認してください。' : '確認した経路にVFX・SEはありません。'));
      return;
    }
    for (var vfx of paths) {
      if (id !== token) return;
      status(card.no + ' · 近似：' + (vfx.path || vfx.fn) + ' / ' + timing(vfx) + '（等速時）');
      // 同じコアイベントで実際に鳴った音だけを合わせる。LABの同期処理とは独立。
      var entry = record(card, 'current', vfx.path || vfx.fn), sounds = [];
      try {
        await playAsset(vfx, nodes, id, entry, function () {
          var sounded = new Set();
          card.seRoutes.filter(function (se) { return se.trigger === vfx.trigger; }).forEach(function (se) {
            if (!sounded.has(se.path)) { sounded.add(se.path); sounds.push(audio(se.path)); }
          });
        }, paths.length === 1);
        await Promise.all(sounds); // 素材やSEを次の経路の開始で切らない。
      } catch (err) {
        entry.status = 'failed'; entry.error = err.message;
        if (id === token) status('現行再生：' + err.message); return;
      }
    }
    if (id === token) status(card.no + ' · 現行演出の近似再生が完了' + (activeRecord && activeRecord.looping ? '（常時素材は停止操作まで表示）' : ''));
  }
  async function listen(card, adopted) {
    if (window.VbFxLabCheck && VbFxLabCheck.busy()) return;
    if (!selected || selected.no !== card.no) choose(card.no); stop(); var id = token;
    var sounds = adopted && card.adopted ? [{ path: card.adopted.path }] : card.se;
    for (var se of sounds) { if (id !== token) return; status(card.no + ' · ' + (adopted ? '採用SE' : '現行SE') + '：' + se.path); await audio(se.path); }
    if (id === token && sounds.length) status(card.no + ' · SE再生が完了');
  }
  function playCard(card) { if (card.lab.length) return playLab(card); return playCurrent(card); }
  function mediaCell(card, kind) {
    var td = element('td', 'card-media'); td.appendChild(label(kind === 'vfx' ? card.vfxSetting : card.seSetting));
    if (kind === 'vfx' && card.vfx.length) td.appendChild(label('現行再生は近似'));
    card[kind].forEach(function (x) {
      var p = element('div', 'card-media-entry'); p.appendChild(element('code', '', x.path || x.fn + '()'));
      p.appendChild(element('small', '', x.fn + ' / ' + x.trigger + (kind === 'vfx' ? ' / ' + timing(x) : ''))); td.appendChild(p);
    });
    if (card.unknown[kind].length) {
      var note = element('details', 'card-unknown'); note.appendChild(element('summary', '', '不明の理由'));
      card.unknown[kind].forEach(function (reason) { note.appendChild(element('p', '', reason)); }); td.appendChild(note);
    }
    return td;
  }
  function render() {
    var result = VbFxCardCatalog.filter(cards, { search: $('card-search').value, kind: $('card-kind').value,
      vfx: $('card-vfx-filter').value, se: $('card-se-filter').value, lab: $('card-lab-filter').value });
    $('card-result-count').textContent = result.length + ' / ' + cards.length + '件';
    // 左側の一覧（絞り込みと同じ並び）。押すとそのカードを選んで再生する（2026-10-06 利用者指定）。
    listed = result;
    if (cardList) {
      cardList.replaceChildren();
      result.forEach(function (card) {
        var b = element('button'); b.type = 'button'; b.dataset.no = card.no;
        b.appendChild(element('span', 'number', card.no)); b.appendChild(element('span', 'card-list-name', card.name));
        b.appendChild(starButton(card));
        b.classList.toggle('selected', !!selected && selected.no === card.no);
        b.addEventListener('click', function () { pick(card.no, true); });
        cardList.appendChild(b);
      });
    }
    tableBody.replaceChildren();
    result.forEach(function (card) {
      var tr = element('tr'); tr.dataset.no = card.no; tr.classList.toggle('selected', selected && selected.no === card.no);
      var no = element('td'); no.appendChild(element('code', '', card.no)); tr.appendChild(no);
      var title = element('td', 'card-title'); var strong = element('strong', '', card.name); strong.appendChild(starButton(card)); title.appendChild(strong); title.appendChild(element('div', '', card.type)); tr.appendChild(title);
      var effect = element('td', 'card-effect'); effect.appendChild(element('div', '', card.effect || '効果文なし'));
      if (card.keywords) effect.appendChild(element('div', '', 'キーワード：' + card.keywords));
      if (card.mergedEffect) { var merged = element('details'); merged.appendChild(element('summary', '', '合体時の効果')); merged.appendChild(element('p', '', card.mergedEffect)); effect.appendChild(merged); }
      tr.appendChild(effect); tr.appendChild(mediaCell(card, 'vfx')); tr.appendChild(mediaCell(card, 'se'));
      var lab = element('td', 'card-media');
      card.lab.forEach(function (fx) { lab.appendChild(element('code', '', fx.name)); lab.appendChild(element('div', '', fx.adopted ? 'SE採用済み / ADOPTED.md' : '試作 / LAB演出名・試験設定')); });
      if (!card.lab.length) lab.appendChild(document.createTextNode('割当なし'));
      if (card.adopted) { lab.appendChild(element('code', '', card.adopted.path)); lab.appendChild(element('div', '', card.adopted.seconds + '秒 / peak ' + card.adopted.peak + '秒')); }
      tr.appendChild(lab);
      var actions = element('td', 'card-buttons'); var play = button('再生' + (card.lab.length ? ' · LAB' : ' · 現行'), function () { playCard(card); }); play.title = card.no + ' ' + card.name; actions.appendChild(play);
      if (card.lab.length) actions.appendChild(button('現行と比較', function () { playCurrent(card); }));
      var seOnly = button('現行SEだけ', function () { listen(card, false); }); seOnly.disabled = !card.se.length; actions.appendChild(seOnly);
      if (card.adopted) actions.appendChild(button('採用SEだけ', function () { listen(card, true); }));
      actions.appendChild(button('詳細', function () { choose(card.no); })); tr.appendChild(actions); tableBody.appendChild(tr);
    });
    $('card-empty').hidden = result.length > 0;
  }
  function pick(no, play) {
    choose(no);
    var card = cards.find(function (c) { return c.no === no; });
    if (play && card) playCard(card);
  }
  // 矢印キーで前後のカードへ（入力欄・選択欄にいる時は除く）。
  document.addEventListener('keydown', function (ev) {
    if (!page || page.hidden || (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp')) return;
    if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    if (!listed.length) return;
    ev.preventDefault();
    var i = selected ? listed.findIndex(function (c) { return c.no === selected.no; }) : -1;
    var next = listed[Math.max(0, Math.min(listed.length - 1, i + (ev.key === 'ArrowDown' ? 1 : -1)))];
    if (next && (!selected || next.no !== selected.no)) pick(next.no, true);
  });
  function switchTab(which) {
    if (window.VbFxLabCheck && VbFxLabCheck.busy()) return;
    stop(); var catalog = which === 'cards';
    page.hidden = !catalog; sidebar.hidden = !catalog;
    original.forEach(function (el) { if (catalog) el.setAttribute('data-card-lab-hidden', ''); else el.removeAttribute('data-card-lab-hidden'); });
    document.querySelectorAll('.lab-tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === which)); });
    if (catalog) { stageMount.appendChild(stage); stageMount.appendChild(playbar); }
    else { stageAnchor.after(stage); playAnchor.after(playbar); }
    window.dispatchEvent(new Event('resize'));
  }
  function selectFilter(container, id, title, options) {
    var lab = element('label', '', title + ' '), select = element('select'); select.id = id;
    options.forEach(function (pair) { var op = element('option', '', pair[1]); op.value = pair[0]; select.appendChild(op); });
    select.addEventListener('change', render); lab.appendChild(select); container.appendChild(lab);
  }
  function init() {
    cards = VbFxCardCatalog.build(window.VESSELBOUND_LOCAL_XLSX_CSV, _parseCSVWithHeader, VbFxCardRoutes, VbFx.effects, VbFxPreviewCatalog);
    stage = document.querySelector('.stage-wrap'); playbar = document.querySelector('.playbar');
    stageAnchor = document.createComment('全カードタブから盤面を戻す位置'); stage.before(stageAnchor);
    playAnchor = document.createComment('全カードタブから操作を戻す位置'); playbar.before(playAnchor);
    original = Array.from(document.querySelector('main').children).filter(function (el) { return el !== stage && el !== playbar; });
    original = original.concat(Array.from(document.querySelector('.library').children).filter(function (el) { return !el.classList.contains('brand') && !el.classList.contains('library-note'); }));
    var tabs = element('nav', 'lab-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'VFX LABの画面');
    [['effects', '演出の一覧'], ['cards', '全カード VFX・SE']].forEach(function (pair) {
      var b = button(pair[1], function () { switchTab(pair[0]); }); b.dataset.tab = pair[0]; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(pair[0] === 'effects')); tabs.appendChild(b);
    });
    document.querySelector('main').prepend(tabs);
    page = element('section', 'cards-page'); page.id = 'card-catalog'; page.hidden = true;
    var heading = element('header', 'cards-heading'); heading.appendChild(element('h1', '', '全カードのVFX・SE'));
    var count = element('span'); count.id = 'card-result-count'; heading.appendChild(count); page.appendChild(heading);
    page.appendChild(element('p', 'cards-intro', '敵・NPC・特殊マスも番号ごとに表示。同じ演出を使うカードも省略しません。再生ボタンはLABの割当を優先します。'));
    var filters = element('div', 'card-filters'); var searchLabel = element('label', '', '検索 '), search = element('input'); search.id = 'card-search'; search.type = 'search'; search.placeholder = 'C037 / デュラハン'; search.addEventListener('input', render); searchLabel.appendChild(search); filters.appendChild(searchLabel);
    selectFilter(filters, 'card-kind', 'カード種', [['', '全種類']].concat(Object.keys(VbFxCardCatalog.kinds).map(function (k) { return [k, VbFxCardCatalog.kinds[k]]; })));
    ['vfx', 'se'].forEach(function (kind) { selectFilter(filters, 'card-' + kind + '-filter', kind.toUpperCase(), [['', '全設定'], ['専用', '専用あり'], ['汎用', '汎用'], ['無し', '無し'], ['不明', '不明']]); });
    selectFilter(filters, 'card-lab-filter', 'LAB割当', [['', 'すべて'], ['yes', '割当済み'], ['no', '割当なし']]); page.appendChild(filters);
    var review = element('section', 'card-review'); stageMount = element('div', 'card-stage-mount'); review.appendChild(stageMount);
    detail = element('div', 'card-detail'); review.appendChild(detail); page.appendChild(review);
    var wrap = element('div', 'card-table-wrap'), table = element('table', 'card-table'), head = element('thead'), titles = element('tr');
    ['番号', '名前／種別', '効果文', '現行ゲーム VFX', '現行ゲーム SE', 'LAB割当／採用済みSE', '再生'].forEach(function (t) { var th = element('th', '', t); th.scope = 'col'; titles.appendChild(th); }); head.appendChild(titles); table.appendChild(head);
    tableBody = element('tbody'); tableBody.id = 'card-catalog-rows'; table.appendChild(tableBody); wrap.appendChild(table); page.appendChild(wrap);
    var empty = element('p', 'empty', '該当するカードはありません。'); empty.id = 'card-empty'; empty.hidden = true; page.appendChild(empty);
    var notes = element('details', 'card-notes'); notes.appendChild(element('summary', '', '判定方法・不明と近似の扱い'));
    var list = element('ul');
    ['データはlocal_xlsx_data.jsの内蔵CSVを既存loader.jsのヘッダ名パーサーで読む。通常カード'
      + cards.filter(function (c) { return c.kind !== 'specialFx'; }).length + '件＋共通演出'
      + cards.filter(function (c) { return c.kind === 'specialFx'; }).length
      + '件。名前が空の予約行はカードとして扱わず、合体効果は同じ番号の詳細へ収録。',
      '現行経路はcards_scan.cjsで本体コア→PvEの受け口→共通presenter→render.jsを実行して採取。魔導板のアイテム使用・マス変更・結界の状態素材も本体の処理を呼ぶ。通常攻撃・キーワード・効果・合体時も含む。選ばれなかった登録素材を使用中とは表示しない。',
      '専用＝その番号またはシートの指定番号の個別素材。汎用＝共通S素材・他カードやキーワードと共通の演出・通常命中・フラッシュ等。各カードに複数経路があれば専用を優先。不明は未成立の条件や未実装・台帳の古さがある場合（採取できた経路は併記）。',
      'LABの正式なVFX／SE割当はse/ADOPTED.mdの対応表。正式採用前は演出ラベル・カード名・試験設定が一致する試作だけを併記。SE採用はゲームへの接続済みを意味しない。',
      '現行VFXの既定は専用素材、無ければ先頭の実経路。素材をデコードしてから、ゲームの指定尺と素材1周の長い方を最後まで表示する。常時素材は停止操作まで表示。幅・縦横比・中心は本体の描画関数とCSSから採取。関数のみのフラッシュ・死亡等、対象選択・束・移動・逆再生は近似。LAB再生は既存の公開APIをそのまま使用。',
      '不明の理由は各行に表示。未検出を推測で埋めない。確認した盤面で演出がない経路は無し。永続状態のCSS／全ての条件の網羅は本体での実戦確認が別途必要。'
    ].forEach(function (t) { list.appendChild(element('li', '', t)); }); notes.appendChild(list); page.appendChild(notes); document.querySelector('main').appendChild(page);
    sidebar = element('section', 'card-sidebar'); sidebar.hidden = true;
    cardList = element('nav'); cardList.id = 'card-list'; cardList.setAttribute('aria-label', '全カードの一覧'); sidebar.appendChild(cardList);
    var totalsBox = element('details', 'card-totals'); totalsBox.appendChild(element('summary', '', '収録カードの集計'));
    var totals = VbFxCardCatalog.summary(cards), counts = element('div', 'cards-counts');
    Object.keys(totals.kinds).forEach(function (kind) { counts.appendChild(element('div', '', kind + ' · ' + totals.kinds[kind] + '件')); }); totalsBox.appendChild(counts);
    totalsBox.appendChild(element('p', '', 'VFX　専用 ' + totals.vfx['専用'] + ' / 汎用 ' + totals.vfx['汎用'] + ' / 無し ' + totals.vfx['無し'] + ' / 不明 ' + totals.vfx['不明']));
    totalsBox.appendChild(element('p', '', 'SE　専用 ' + totals.se['専用'] + ' / 汎用 ' + totals.se['汎用'] + ' / 無し ' + totals.se['無し'] + ' / 不明 ' + totals.se['不明']));
    totalsBox.appendChild(element('p', '', '改良指示には番号を使えます。例：C037 のVFXを変更。↑↓キーで前後のカードへ。'));
    sidebar.appendChild(totalsBox);
    document.querySelector('.library').appendChild(sidebar);
    render(); choose(cards[0].no);
    $('stop').addEventListener('click', stop); window.addEventListener('pagehide', stop);
  }
  init();
  return { cards: function () { return cards.slice(); }, summary: function () { return VbFxCardCatalog.summary(cards); },
    choose: choose, show: switchTab, play: function (no) { var c = cards.find(function (x) { return x.no === no; }); if (c) return playCard(c); },
    playCurrent: function (no) { var c = cards.find(function (x) { return x.no === no; }); if (c) return playCurrent(c); },
    history: function () { return history.map(function (entry) { return Object.assign({}, entry); }); }, stop: stop };
})();
