/* VFXプレビュー専用。ゲームの G・戦闘コア・保存データには触れない。 */
var VbFxPreview = (function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var effect = VbFx.effects[0].name, sourceId = '', targetIds = [], cycleToken = 0;
  var audioVoices = new Set(), audioTimers = new Set();
  var poseHosts = new Set();
  var choices = {}, playCount = 0, lastImpacts = [], running = 0, generation = 0;
  var allyPortraits = ['C041', 'C024', 'C046', 'C067', 'C077'];
  var enemyPortraits = ['EN001', 'EN020', 'EN005', 'EN010', 'EN011'];
  var colorFrames = { 赤: 1, 青: 2, 緑: 3, 黄: 4, 紫: 5 };
  var allNames = VbFx.effects.map(function (d) { return d.name; }), activeScene = null;
  try { choices = JSON.parse(localStorage.getItem('vb-fx-lab-choices') || '{}'); } catch (_) {}
  function saveChoices() { try { localStorage.setItem('vb-fx-lab-choices', JSON.stringify(choices)); } catch (_) {} }
  function message(text) { $('message').textContent = text; }
  function ownSide() { return $('side').value; }
  function cardsFor(side) { return Array.from(document.querySelectorAll('.lab-card[data-side="' + side + '"]:not(.summon-slot)')); }
  function card(id) { return document.getElementById(id); }
  function def(name) { return VbFx.effects.find(function (d) { return d.name === (name || effect); }); }
  function config(name) { return VbFxPreviewCatalog[name || effect] || {source:'C041',mode:'self',note:'プレビュー設定未採取。戦闘盤面のカード上で確認します。'}; }
  function applyPortrait(el, no) {
    var c = VbFxPreviewCards[no];
    if (!c) throw new Error('プレビュー用カードがありません: ' + no);
    var dir = /^(BC|NPC|MC)/.test(no)?'npcs':no.indexOf('EN') === 0 ? 'enemies' : 'characters';
    var artNo = no === 'C081' ? 'C061' : no;
    el.querySelector('.art').src = '../assets/art/' + dir + '/' + artNo + '.jpg';
    el.querySelector('.frame').src = '../assets/cards/' + (el.dataset.side === 'enemy' ? 'enemy_frame.svg' : 'character_frame' + (colorFrames[c.color] || 3) + '.svg');
    el.querySelector('.name').textContent = c.name; el.dataset.previewName = c.name; el.dataset.no = no; el.dataset.color = c.color;
    el.setAttribute('aria-label', (el.dataset.side === 'enemy' ? '敵 ' : '味方 ') + c.name);
  }
  function buildCard(side, i, no, summon, frontCount) {
    var el = document.createElement('button'); el.type = 'button';
    el.id = side + '-' + (summon ? 'wolf' : i); el.className = 'lab-card' + (summon ? ' summon-slot' : '');
    el.dataset.vbFxCard = '1'; el.dataset.side = side;
    var lane = summon || i < 3 ? 'front' : 'rear', pos = summon ? 3 : i < 3 ? i : i - 3;
    VbFxLabGeometry.applyCard(el, side, lane, lane === 'front' ? frontCount : 2, pos);
    el.innerHTML = '<img class="art" alt=""><img class="frame" alt=""><span class="frame-border"></span><img class="stats-overlay" src="../assets/cards/status_overlay.png" alt=""><span class="name"></span><span class="stats"><b>6</b><b>8</b></span><span class="card-caption"></span>';
    el.querySelector('.card-caption').textContent = summon ? '召喚先' : (i < 3 ? '前衛' : '後衛');
    applyPortrait(el, no); el.addEventListener('click', function () { pickCard(el.id); }); return el;
  }
  function configureBoard() {
    activeScene=null; $('board-design').classList.remove('lab-board-scene');
    document.querySelectorAll('.lab-board-decoration').forEach(function(el){el.remove();});
    $('side').disabled=false; $('background').disabled=false;
    var cards = $('cards'); cards.replaceChildren();
    var conf = config(), side = ownSide(), frontCount = conf.mode === 'summon' ? 4 : 3;
    allyPortraits.forEach(function (no, i) { cards.appendChild(buildCard('ally', i, no, false, 3)); });
    enemyPortraits.forEach(function (no, i) { cards.appendChild(buildCard('enemy', i, no, false, 3)); });
    var own = cardsFor(side);
    sourceId = own[1].id; applyPortrait(own[1], conf.source);
    if (conf.deadOrigin) {
      applyPortrait(own[2], conf.source); applyPortrait(own[1], 'C102');
      own[1].classList.add('is-dead'); own[1].querySelector('.card-caption').textContent = '死亡した味方';
    }
    if (conf.mode === 'green' && side === 'enemy') { applyPortrait(own[0], 'C046'); applyPortrait(own[4], 'C041'); }
    if(conf.mode==='colors'){
      var palette=['赤','青','緑','黄','紫'];
      palette.forEach(function(color,i){var no=Object.keys(VbFxPreviewCards).find(function(k){return /^C\d/.test(k)&&VbFxPreviewCards[k].color===color;});if(no)applyPortrait(own[i],no);});
      var at=palette.indexOf(VbFxPreviewCards[conf.source].color);sourceId=own[at>=0?at:1].id;applyPortrait(card(sourceId),conf.source);
    }
    if (conf.mode === 'purple') { applyPortrait(own[0], 'C082'); applyPortrait(own[3], 'C082'); }
    if (conf.mode === 'summon') {
      var wolf = buildCard(side, 5, 'C102', true, frontCount); cards.appendChild(wolf);
    }
    if (effect === 'worm') cardsFor(side === 'ally' ? 'enemy' : 'ally').forEach(function (el, i) {
      if (i % 2 === 0) { var tag = document.createElement('span'); tag.className = 'poison'; tag.textContent = '毒'; el.appendChild(tag); }
    });
    chooseDefaultTargets(); refreshSourceSelect(); refreshSelection(); lastImpacts = [];
  }
  // 分類ページからだけシーンを変更する。効果名でselectする撮影APIの配置は変えない。
  function scenePortrait(el,no) {
    var c=VbFxPreviewCards[no];if(!c)return;
    applyPortrait(el,no);
    if(typeof getCharacterNoArtPath==='function')el.querySelector('.art').src='../'+getCharacterNoArtPath({no:no});
  }
  function applyScene(scene) {
    configureBoard();
    activeScene=scene;
    if(scene.type==='board') {
      var board=$('board-design'),frame=document.createElement('div');frame.className='lab-board-decoration lab-board-frame';board.appendChild(frame);
      var heading=document.createElement('span');heading.className='lab-board-decoration lab-board-heading';heading.textContent='魔導板';board.appendChild(heading);
      board.classList.add('lab-board-scene');$('cards').replaceChildren();
      for(var i=0;i<15;i++) {
        var el=buildCard('ally',i,'C041',false,3);el.id='lab-board-'+i;el.classList.add('lab-board-cell');
        el.dataset.cell=String(i);el.dataset.lane='board';el.style.left=(1214+(i%5)*288)+'px';el.style.top=(465+Math.floor(i/5)*423)+'px';
        el.querySelector('.frame').src='../assets/cards/magic_board6.svg';
        el.querySelector('.art').hidden=i!==7;el.querySelector('.stats-overlay').hidden=i!==7;el.querySelector('.stats').hidden=i!==7;
        if(i===7)el.querySelector('.frame').src='../assets/cards/character_frame3.svg';
        el.setAttribute('aria-label','魔導板 '+(Math.floor(i/5)+1)+'行'+(i%5+1)+'列');$('cards').appendChild(el);
      }
      sourceId='lab-board-'+(scene.cell==null?7:scene.cell);targetIds=[sourceId];$('side').value='ally';
      $('side').disabled=true;$('background').disabled=true;
    } else {
      var side=scene.side||'ally';$('side').value=side;
      if(side==='enemy' && scene.lane==='rear') {
        var rear=cardsFor('enemy').filter(function(el){return el.dataset.lane==='rear';});
        if(rear.length===2) {
          VbFxLabGeometry.applyCard(rear[0],'enemy','rear',3,0);VbFxLabGeometry.applyCard(rear[1],'enemy','rear',3,2);
          var middle=buildCard('enemy',5,'EN001',false,3);VbFxLabGeometry.applyCard(middle,'enemy','rear',3,1);$('cards').appendChild(middle);
        }
        sourceId='enemy-5';
      } else sourceId=side+'-1';
      if(['card','enemy','char'].indexOf(scene.kind)>=0)scenePortrait(card(sourceId),scene.no);
      chooseDefaultTargets();if(scene.self)targetIds=[sourceId];
    }
    refreshSourceSelect();refreshSelection();
  }
  function layoutSummonRow(el) {
    var side = el.dataset.side;
    var row = Array.from(document.querySelectorAll('.lab-card[data-side="' + side + '"][data-lane="front"]'));
    var visible = row.filter(function (card) { return !card.classList.contains('summon-slot') || card.classList.contains('is-summoned'); });
    visible.forEach(function (card, index) { VbFxLabGeometry.applyCard(card, side, 'front', visible.length, index); });
  }
  function chooseDefaultTargets() {
    var conf = config(), side = card(sourceId).dataset.side, own = cardsFor(side), foes = cardsFor(side === 'ally' ? 'enemy' : 'ally');
    var selected;
    if (conf.mode === 'self') selected = [card(sourceId)];
    else if (conf.mode === 'foes') selected = foes;
    else if (conf.mode === 'front') selected = foes.filter(function (el) { return el.dataset.lane === 'front'; });
    else if (conf.mode === 'friends') selected = own;
    else if (conf.mode === 'colors') { var seenColors=new Set(); selected=own.filter(function(el){if(seenColors.has(el.dataset.color))return false;seenColors.add(el.dataset.color);return true;}); }
    else if (conf.mode === 'kenzoku') selected = [own[0],own[3]];
    else if (conf.mode === 'purple') selected = own.filter(function(el){return el.dataset.color==='紫';});
    else if (conf.mode === 'sequence') selected = [own[0],own[4],own[0]];
    else if (conf.mode === 'friend') selected = [own.find(function (el) { return el.id !== sourceId; })];
    else if (conf.mode === 'green') selected = own.filter(function (el) { return el.id !== sourceId && el.dataset.color === '緑'; });
    else if (conf.mode === 'others') selected = own.concat(foes).filter(function (el) { return el.id !== sourceId; });
    else if (conf.mode === 'pair') selected = [foes[1], foes[2]];
    else if (conf.mode === 'summon') selected = [card(side + '-wolf')];
    else if (effect === 'cockatrice' || effect === 'atk-down') selected = [foes[0]];
    else selected = [foes[1]];
    targetIds = selected.filter(Boolean).map(function (el) { return el.id; });
  }
  function refreshSourceSelect() {
    var select = $('source-select'); select.replaceChildren();
    cardsFor('ally').concat(cardsFor('enemy')).forEach(function (el) {
      var option = document.createElement('option'); option.value = el.id;
      option.textContent = (el.dataset.side === 'ally' ? '味方 ' : '敵 ') + el.dataset.previewName;
      select.appendChild(option);
    }); select.value = sourceId;
  }
  function refreshSelection() {
    document.querySelectorAll('.lab-card').forEach(function (el) {
      el.classList.toggle('is-source', el.id === sourceId); el.classList.toggle('is-target', targetIds.indexOf(el.id) >= 0);
    }); $('source-select').value = sourceId;
  }
  function pickCard(id) {
    if(activeScene && activeScene.type==='board') {
      sourceId=id;targetIds=[id];
    } else if ($('pick-mode').value === 'source') {
      sourceId = id; $('side').value = card(id).dataset.side; chooseDefaultTargets();
    } else {
      var multi = ['foes', 'front', 'friends', 'green', 'others', 'colors', 'kenzoku', 'purple', 'sequence'].indexOf(config().mode) >= 0;
      if (multi) {
        if (targetIds.indexOf(id) >= 0) { if (targetIds.length > 1) targetIds = targetIds.filter(function (x) { return x !== id; }); }
        else targetIds.push(id);
      } else if (config().mode === 'pair') {
        if (targetIds.indexOf(id) < 0) targetIds = [targetIds[1] || targetIds[0], id];
      } else targetIds = [id];
    } refreshSelection();
  }
  // 状態異常の表示などSEの無い演出（2026-10-05 利用者指定：状態を示すだけなのでSE不要）。
  var NO_SOUND = { id: '', filename: '（SEなし）', source: '', url: '', duration: 0, originalDuration: 0, reason: '状態の表示のみ', trimmed: false, start: 0, peak: 0 };
  // LABの候補一覧に無い効果（webp をコード描画へ置き換えた効果など）は、ゲームで鳴らしている効果音を使う
  // （2026-10-14 利用者指摘：カード名から再生するとメデューサ・サイレン等でSEが鳴らなかった）。
  function gameSound(name) {
    var def = VbFx.effects.find(function (d) { return d.name === name; }), code = def && def.sourceCode;
    var key = code === 'appearance_sheet' ? 'appearance' : code === 'hit' ? 'attack' : code;
    // 飛ぶ矢と着弾で番号が分かれる効果（C019_1／C019_2、E058_1／E058_2）は、ゲームの音のキーが「番号」と「番号_HIT」。
    var split = /^(.+)_([12])$/.exec(key || '');
    if (split) key = split[1] + (split[2] === '2' ? '_HIT' : '');
    var file = key && typeof Assets !== 'undefined' && Assets.sfx && Assets.sfx[key];
    // 登場・盤面変化の音はキー名が番号ではない（js/engine/audio.js が直接ファイルで鳴らす）。
    if (!file && ['appearance', 'board_change1', 'board_change2'].indexOf(key) >= 0) file = 'assets/sfx/' + key + '.wav';
    // マナ獲得（S004）はゲームで鳴らさない（2026-10-15 利用者指定）。LABも合わせて無音にする。
    if (!file || key === 'S004') return null;
    return { id: 'game:' + key, filename: key + '.wav（ゲームの効果音）', source: file, url: '../' + file, duration: 0, originalDuration: 0, reason: 'ゲームで鳴らしている効果音', trimmed: false, start: 0,
      // ピーク（実測）を演出の山場へ合わせる。ゲームと同じ表（present.js PRESENT_SFX_PEAK_SEC）。
      peak: typeof presentSfxPeakSec === 'function' ? presentSfxPeakSec(key) : 0 };
  }
  function selectedSound(name) {
    var ids = VbFxSeCatalog.effects[name || effect] || [], selected = choices[name || effect];
    if (!ids.length) return gameSound(name || effect) || NO_SOUND;
    return VbFxSeCatalog.sounds[ids.indexOf(selected) >= 0 ? selected : ids[0]];
  }
  function stopAudio() {
    audioTimers.forEach(clearTimeout); audioTimers.clear();
    audioVoices.forEach(function (a) { a._vbCancelled = true; a.pause(); a.removeAttribute('src'); a.load(); }); audioVoices.clear();
  }
  // offset：音の何秒目から鳴らすか。fadeAt／fadeEnd：鳴らし始めからの ms で、その間に音量を0へ下げる。
  function playSound(sound, opts) {
    if (!sound || !sound.url || Number($('volume').value) === 0) return null;
    opts = opts || {};
    var base = Number($('volume').value), audio = new Audio(sound.url + (sound.sha256 ? '?v=' + sound.sha256.slice(0, 10) : '')); audio.volume = base; audioVoices.add(audio);
    if (opts.offset > 0) audio.currentTime = opts.offset;
    // 音の途中から鳴らす時は、頭の60msで立ち上げる（途中で切った所がプツッと鳴らないように）。
    var fadeIn = opts.offset > 0 ? 60 : 0;
    if (fadeIn) audio.volume = 0;
    if (opts.fadeEnd > 0 || fadeIn) {
      var began = performance.now(), fadeAt = Math.max(0, opts.fadeAt || 0), fadeEnd = Math.max(fadeAt + 1, opts.fadeEnd || 0);
      var tick = setInterval(function () {
        var e = performance.now() - began;
        if (audio._vbCancelled || audio.ended) { clearInterval(tick); return; }
        if (opts.fadeEnd > 0 && e >= fadeEnd) { audio.volume = 0; audio.pause(); clearInterval(tick); return; }
        var v = base;
        if (fadeIn && e < fadeIn) v *= e / fadeIn;
        if (opts.fadeEnd > 0 && e > fadeAt) v *= Math.pow(Math.cos(Math.min(1, (e - fadeAt) / (fadeEnd - fadeAt)) * Math.PI / 2), 2);
        audio.volume = Math.max(0, Math.min(1, v));
        if (!(opts.fadeEnd > 0) && e >= fadeIn) clearInterval(tick);
      }, 16);
    }
    var dispose = function () { audioVoices.delete(audio); };
    audio.addEventListener('ended', dispose, { once: true }); audio.addEventListener('error', function () { dispose(); if (!audio._vbCancelled) message('SEを読み込めません: ' + sound.filename); }, { once: true });
    audio.play().catch(function (err) { dispose(); if (!audio._vbCancelled) message('音声再生が拒否されました: ' + err.message); }); return audio;
  }
  function timer(fn, ms) {
    var id = setTimeout(function () { audioTimers.delete(id); fn(); }, ms); audioTimers.add(id); return id;
  }
  function audition(id) { stopAudio(); playSound(VbFxSeCatalog.sounds[id] || selectedSound()); }
  function refreshSound() {
    var ids = VbFxSeCatalog.effects[effect] || [], selected = selectedSound();
    $('sound-select').replaceChildren(); $('candidate-details').replaceChildren();
    ids.forEach(function (id, i) {
      var sound = VbFxSeCatalog.sounds[id], option = document.createElement('option');
      option.value = id; option.textContent = (sound.adopted ? '【採用】' : sound.provisional ? '【仮・候補1】' : (i + 1) + '. ') + sound.filename + ' / ' + sound.duration.toFixed(3) + '秒'; $('sound-select').appendChild(option);
      var row = document.createElement('div'); row.className = 'candidate';
      var strong = document.createElement('strong'); strong.textContent = (i + 1) + '. ' + sound.filename;
      var path = document.createElement('code'); path.textContent = sound.source;
      var info = document.createElement('span'); info.textContent = 'コピー ' + sound.duration.toFixed(3) + '秒 / 原音 ' + sound.originalDuration.toFixed(3) + '秒 / ' + sound.reason;
      var button = document.createElement('button'); button.textContent = 'この候補を聴く'; button.addEventListener('click', function () { choices[effect] = id; saveChoices(); refreshSound(); audition(id); });
      row.append(strong, info, path, button); $('candidate-details').appendChild(row);
    });
    if (!ids || !ids.length) {
      $('sound-name').textContent = selected.filename; $('sound-duration').textContent = ''; $('sound-source').textContent = selected.source; $('sound-reason').textContent = selected.reason;
      $('aux-sound').hidden = true; return;
    }
    $('sound-select').value = selected.id; $('sound-name').textContent = selected.filename;
    $('sound-duration').textContent = selected.duration.toFixed(3) + '秒 / −1dBFS'; $('sound-source').textContent = selected.source;
    $('sound-reason').textContent = selected.reason + (selected.trimmed ? ' · 原音 ' + selected.originalDuration.toFixed(3) + '秒の ' + selected.start.toFixed(3) + '秒位置から切出し' : ' · 全尺');
    var aux = config().auxiliary;
    $('aux-sound').hidden = !aux;
    if (aux) {
      var sound = VbFxSeCatalog.sounds[aux];
      $('aux-sound').textContent = (aux === 'revive' ? '続く復活' : '続くウルフの登場') + 'のSE: ' + sound.filename + ' · ' + sound.duration.toFixed(3) + '秒 · ' + sound.source;
    }
  }
  function select(name, shouldPlay) {
    if (allNames.indexOf(name) < 0) throw new Error('演出がありません: ' + name);
    stop(); effect = name; generation++; configureBoard();
    var d = def(), conf = config();
    $('effect-title').textContent = VbFxLabStore.meta(name).title; $('duration').textContent = (d.ms / 1000).toFixed(2) + ' s'; $('description').textContent = conf.note;
    var reference = $('webp-reference');
    reference.hidden = !conf.sourceCode;
    if (conf.sourceCode) {
      $('webp-reference-label').textContent = '元の参考 · ' + conf.sourceCode + ' · 全尺8コマ';
      $('webp-reference-image').src = 'vfx_capture/refs/' + conf.sourceCode + '/eight.png';
      $('webp-reference-all').href = 'vfx_capture/refs/' + conf.sourceCode + '/all.png';
    } else $('webp-reference-image').removeAttribute('src');
    $('notice').hidden = !conf.notice; $('notice').textContent = conf.notice || '';
    $('attack-proposals').hidden = !conf.proposal;
    document.querySelectorAll('#effect-list button').forEach(function (b) { b.classList.toggle('selected', b.dataset.name === name); b.setAttribute('aria-current', b.dataset.name === name ? 'true' : 'false'); });
    refreshSound(); message(''); if(window.VbFxLabUI)VbFxLabUI.select(name);
    if (shouldPlay) return play(); return Promise.resolve();
  }
  function impact(index, targets, name, impacts, token) {
    if (token !== generation) return;
    var r = targets[index]; if (!r) return;
    var time = performance.now() - impacts.start, entry = { targetIndex: index, target: r.element.dataset.previewName, ms: Math.round(time) };
    impacts.push(entry); lastImpacts = impacts;
    if (name === 'dragonnet' || name === 'bandersnatch') applyPortrait(r.element, config(name).morph);
    if (name === 'direwolf') r.element.classList.add('is-summoned');
  }
  // 新しい定義の配置を本体と同じ座標・合図で確認する。ここは入れ物だけを動かす。
  // 絵の部品や色はjs/vfx/defsにあり、このプレビューでは描かない。
  function definitionPlacement(conf, source, targets, ms) {
    if (!conf.sourceCode) return { source: source, targets: targets, dispose: function () {} };
    if (!conf.motion) return { source: targets[0] || source, targets: targets, dispose: function () {} };
    var host = document.createElement('div'), disposed = false, began = null;
    var from = { x: source.left + source.width / 2, y: source.top + source.height / 2 };
    var to = targets[0] || source, target = { x: to.left + to.width / 2, y: to.top + to.height / 2 + to.height * (conf.impactOffsetY || 0) };
    var diag = Math.hypot(window.innerWidth, window.innerHeight), impactTimes;
    var w = source.width, h = source.height, angle = 0, length, startAngle, endAngle;
    var cp = presentMissileControlPoints(from, target, -2 / 3);
    function bezier(t) {
      var u = 1 - t;
      return { x: u*u*u*from.x+3*u*u*t*cp.c1.x+3*u*t*t*cp.c2.x+t*t*t*target.x,
        y: u*u*u*from.y+3*u*u*t*cp.c1.y+3*u*t*t*cp.c2.y+t*t*t*target.y };
    }
    if (conf.motion === 'sweep') {
      from = { x: source.left + source.width * .5, y: source.top + (ownSide() === 'enemy' ? source.height : 0) };
      var angles = targets.map(function (r) { return Math.atan2(r.top+r.height/2-from.y,r.left+r.width/2-from.x); });
      length = Math.max(80, Math.max.apply(null, targets.map(function (r) { return Math.hypot(r.left+r.width/2-from.x,r.top+r.height/2-from.y); }))*1.2)*2;
      startAngle = Math.min.apply(null, angles); endAngle = Math.max.apply(null, angles); w = h = length;
      impactTimes = angles.map(function(a){return presentSweepTargetHitMs(a,startAngle,endAngle,ms);});
    } else if (conf.motion === 'expand') {
      w = h = source.width * PRESENT_EXPAND_VFX_START;
      var startRadius=w/2*PRESENT_EXPAND_VFX_HIT_RATIO,endRadius=diag*PRESENT_EXPAND_VFX_END/2*PRESENT_EXPAND_VFX_HIT_RATIO;
      impactTimes=targets.map(function(r){
        var distance=Math.hypot(r.left+r.width/2-from.x,r.top+r.height/2-from.y);
        var fraction=Math.max(0,Math.min(1,(distance-startRadius)/(endRadius-startRadius)));
        var grow=1-Math.sqrt(1-fraction);
        return ms*(PRESENT_EXPAND_VFX_FADE_MS+PRESENT_EXPAND_VFX_GROW_MS*grow)/(PRESENT_EXPAND_VFX_FADE_MS+PRESENT_EXPAND_VFX_GROW_MS);
      });
    } else if (conf.motion === 'pierce') {
      var deep = targets[targets.length - 1] || to;
      var vx = deep.left + deep.width / 2 - from.x, vy = deep.top + deep.height / 2 - from.y;
      var distance = Math.hypot(vx, vy) || 1; vx /= distance; vy /= distance;
      var along = Math.max(0, Math.hypot(target.x-from.x,target.y-from.y)-to.height*PRESENT_CONTACT_PIERCE_START_OFFSET);
      from = { x: from.x+vx*along+to.width*PRESENT_CONTACT_PIERCE_OFFSET_X, y: from.y+vy*along };
      length = Math.max(window.innerWidth,window.innerHeight)*PRESENT_CONTACT_PIERCE_OVERSHOOT;
      target = { x: from.x+vx*length, y: from.y+vy*length };
      w = h = to.width*PRESENT_CONTACT_PIERCE_WIDTH; angle = Math.atan2(vy,vx)+Math.PI/2;
      impactTimes = targets.map(function (r) {
        var progress = Math.max(0,Math.min(1,((r.left+r.width/2-from.x)*vx+(r.top+r.height/2-from.y)*vy)/length));
        var lo = 0, hi = 1;
        for (var i = 0; i < 32; i++) { var mid = (lo+hi)/2; if (presentMissileEase(mid) < progress) lo = mid; else hi = mid; }
        return (lo+hi)/2*ms;
      });
    } else if (conf.motion === 'row') {
      var left = Math.min.apply(null,targets.map(function(r){return r.left;}));
      var right = Math.max.apply(null,targets.map(function(r){return r.left+r.width;}));
      var top = Math.min.apply(null,targets.map(function(r){return r.top;}));
      w = h = (right-left)*PRESENT_CONTACT_TRI_WIDTH;
      from = { x: (left+right)/2+w*PRESENT_CONTACT_TRI_OFFSET_X,
        y: top+Math.max.apply(null,targets.map(function(r){return r.height;}))/2 };
    } else if (conf.motion === 'board') {
      w = Math.max(to.width,to.height)*2.6; h = w*1080/1920;
      from = { x: to.left+to.width/2, y: to.top+to.height/2 };
    } else if (conf.motion === 'rise') { w = h = source.width * .55; from.y -= source.height * PRESENT_MANA_GAIN_VFX_START_Y; }
    else if (conf.motion === 'opening') { w = source.width * 2.44; h = source.height * 2.44; }
    Object.assign(host.style, { position: 'fixed', left: (from.x-w/2)+'px', top: (from.y-h/2)+'px', width: w+'px', height: h+'px', pointerEvents: 'none', transformOrigin: 'center' });
    document.body.appendChild(host); poseHosts.add(host);
    function step(now) {
      if (disposed || !host.isConnected) return;
      if (began == null) began = now;
      var t = Math.max(0, Math.min(1, (now-began)/ms)), p = from, opacity = 1, scaleY = 1;
      if (conf.motion === 'projectile') {
        var progress = presentMissileEase(t); p = bezier(progress);
        var ahead = bezier(Math.min(1,progress+.02)), behind = bezier(Math.max(0,progress-.02));
        angle = Math.atan2(ahead.y-behind.y,ahead.x-behind.x)+Math.PI/2;
      } else if (conf.motion === 'pierce') {
        var progress = presentMissileEase(t);
        p = { x: from.x+(target.x-from.x)*progress, y: from.y+(target.y-from.y)*progress };
      } else if (conf.motion === 'expand') {
        var fadeRatio = PRESENT_EXPAND_VFX_FADE_MS/(PRESENT_EXPAND_VFX_FADE_MS+PRESENT_EXPAND_VFX_GROW_MS);
        var progress = Math.max(0,Math.min(1,(t-fadeRatio)/(1-fadeRatio)));
        w = h = source.width*PRESENT_EXPAND_VFX_START+(diag*PRESENT_EXPAND_VFX_END-source.width*PRESENT_EXPAND_VFX_START)*(1-Math.pow(1-progress,2));
        opacity = Math.min(1,t/fadeRatio);
      } else if (conf.motion === 'sweep') {
        var progress = Math.max(0,Math.min(1,(t-.1)/.65));
        angle = startAngle+(endAngle-startAngle)*progress; scaleY = 2;
        opacity = Math.min(1,t/.1,(1-t)/.25);
      } else if (conf.motion === 'rise') p = { x: from.x, y: from.y-source.height*PRESENT_MANA_GAIN_VFX_RISE*t };
      else if (conf.motion === 'opening') opacity = t < 560/980 ? 1 : (1-t)/(420/980);
      Object.assign(host.style,{ left:(p.x-w/2)+'px',top:(p.y-h/2)+'px',width:w+'px',height:h+'px',
        opacity:String(Math.max(0,opacity)),transform:'rotate('+angle+'rad) scaleY('+scaleY+')' });
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return { source: host, targets: targets, followGeometry: true, followOpacity: true, impactTimesMs: impactTimes,
      dispose: function () { disposed = true; host.remove(); poseHosts.delete(host); } };
  }
  function play(name, options) {
    if (name && name !== effect) return select(name).then(function(){return play(null,options);});
    options=options||{};
    if (!targetIds.length) { message('対象がありません'); return Promise.reject(new Error('対象なし')); }
    if (!VbFx.activeCount()) {
      if (effect === 'dragonnet' || effect === 'bandersnatch') targetIds.forEach(function (id) { applyPortrait(card(id), config().source); });
      if (effect === 'direwolf') targetIds.forEach(function (id) { card(id).classList.remove('is-summoned'); });
      if (effect === 'direwolf') targetIds.forEach(function (id) { layoutSummonRow(card(id)); });
    }
    var name = effect, conf = config(name), sound = Object.prototype.hasOwnProperty.call(options,'sound')?options.sound:selectedSound(name), token = generation;
    var targetColors=PRESENT_LAB_CARD_COLORS;
    var targets = targetIds.map(function (id) { var r=VbFx.rect(card(id));if(conf.mode==='colors')r.color=targetColors[card(id).dataset.color];return r; }), impacts = [];
    impacts.start = performance.now(); playCount++; running++; $('active-status').textContent = '再生中 ' + running;
    var ms = VbFx.duration(name, Number($('speed').value));
    // 2026-10-12指定・撮影第2回: LABも共通定義の各脈動へ命中表示を合わせる。
    var pulseCues = conf.mode === 'purple' ? VbFx.pulseTimes(name, conf.value).map(function (t) { return t * ms; }) : null;
    // SEの一番大きい所（sound.peak 秒）を演出の命中の瞬間に合わせる。前倒しが要る時は音の途中から鳴らす。
    // 演出の終わり（ms）から 260ms でフェードアウトし、演出の後に音だけ長く残らないようにする（2026-10-05 利用者指定）。
    if (sound && sound.url && !VbFx.effects.find(function (d) { return d.name === name && d.loop; })) {
      var hit = pulseCues ? pulseCues[0] : VbFx.impactMs(name, Number($('speed').value)), lead = hit - (sound.peak || 0) * 1000;
      var startAt = Math.max(0, lead), offset = lead < 0 ? -lead / 1000 : 0;
      // ダイアウルフは遠吠えの区間（全体の42%）で音を閉じ、ウルフ登場の音（補助）と重ねない。
      var soundEnd = name === 'direwolf' ? ms * .44 : ms;
      // 2026-10-06 利用者指摘「最後に途切れる感じ」：演出の終わりから1.1秒かけて、なだらかに消す（命中直後には消し始めない）。
      var fadeAt = Math.max(0, Math.max(hit + 250, soundEnd * .95) - startAt), fadeEnd = fadeAt + 1100;
      timer(function () { if (generation === token) playSound(sound, { offset: offset, fadeAt: fadeAt, fadeEnd: fadeEnd }); }, startAt);
    }
    if (conf.auxiliary) timer(function () { if (generation === token) playSound(VbFxSeCatalog.sounds[conf.auxiliary]); }, ms * .46);
    var placement = definitionPlacement(conf, VbFx.rect(card(sourceId)), targets, ms);
    return VbFx.play(name, {
      source: placement.source, targets: placement.targets, side: ownSide(),
      followGeometry: !!placement.followGeometry, followOpacity: !!placement.followOpacity, impactTimesMs: placement.impactTimesMs,
      board: conf.sourceCode || conf.new1012 ? $('board-design') : undefined,
      allies: cardsFor('ally').map(VbFx.rect), enemies: cardsFor('enemy').map(VbFx.rect),
      speed: Number($('speed').value), size: Number($('size').value),
      value: conf.mode==='colors'?targets.length:conf.value,
      impactTimesMs: conf.mode==='sequence'?targets.map(function(_,i){return ms*(.43+.49*i/Math.max(1,targets.length-1));}):pulseCues?targets.map(function(){return pulseCues[0];}):placement.impactTimesMs,
      cueTimesMs: pulseCues || undefined,
      onCue: pulseCues ? function () { targets.forEach(function (_, i) { impact(i, targets, name, impacts, token); }); } : undefined,
      onImpact: function (i) { if (!pulseCues) impact(i, targets, name, impacts, token); }
    }).then(function (result) {
      if (result.assetErrors.length) message('素材を読み込めません: ' + result.assetErrors.join(', '));
      // 続けて出す演出（例：ヴリコラカス → 復活獲得）。ゲームでも本来のVFXの後に自動で続ける予定（2026-10-06 利用者指定）。
      if (conf.then && (options.suppress || []).indexOf(conf.then)<0 && generation === token && !result.cancelled) (conf.thenAt==='source'?[sourceId]:targetIds).forEach(function (id) { playChained(conf.then, card(id), token); });
      return { name: name, result: result, impacts: impacts.slice() };
    }).catch(function (err) { message('演出エラー: ' + err.message); throw err; }).finally(function () {
      placement.dispose();
      if (generation === token) { running = Math.max(0, running - 1); $('active-status').textContent = running ? '再生中 ' + running : '待機中'; }
    });
  }
  function playChained(name, el, token) {
    if (!el) return;
    var sound = selectedSound(name), speed = Number($('speed').value);
    if (sound && sound.url) {
      var lead = VbFx.impactMs(name, speed) - (sound.peak || 0) * 1000, startAt = Math.max(0, lead), ms = VbFx.duration(name, speed);
      timer(function () { if (generation === token) playSound(sound, { offset: lead < 0 ? -lead / 1000 : 0, fadeAt: Math.max(0, ms * .95 - startAt), fadeEnd: Math.max(0, ms * .95 - startAt) + 1100 }); }, startAt);
    }
    VbFx.play(name, { source: VbFx.rect(el), targets: [], side: el.dataset.side, speed: speed, size: Number($('size').value) }).catch(function () {});
  }
  function stop() {
    cycleToken++; generation++; VbFx.stopAll(); stopAudio(); running = 0;
    poseHosts.forEach(function (host) { host.remove(); }); poseHosts.clear();
    $('active-status').textContent = '待機中'; $('play-all').textContent = '全部を順に再生';
  }
  async function playAll() {
    stop(); var cycle = ++cycleToken;
    for (var i = 0; i < allNames.length; i++) {
      if (cycle !== cycleToken) break;
      // select() はユーザーの切替と同じ片付けを使う。巡回のトークンだけ継続する。
      await select(allNames[i]); cycle = cycleToken;
      $('play-all').textContent = (i + 1) + ' / ' + allNames.length + ' 再生中';
      var selected = document.querySelector('#effect-list .selected'); if (selected) selected.scrollIntoView({ block: 'nearest' });
      var started = performance.now(), sound = selectedSound(), conf = config();
      var ms = VbFx.duration(effect, Number($('speed').value));
      var audioEnd = ms + 1200;
      if (conf.auxiliary) audioEnd = Math.max(audioEnd, ms * .46 + VbFxSeCatalog.sounds[conf.auxiliary].duration * 1000);
      await play();
      if (cycle !== cycleToken) break;
      await new Promise(function (resolve) { setTimeout(resolve, Math.max(160, audioEnd - (performance.now() - started) + 160)); });
    }
    $('play-all').textContent = '全部を順に再生';
  }
  function exportChoices() {
    var values = VbFx.effects.map(function (d) {
      var s = selectedSound(d.name);
      return { name: d.name, label: d.label, se: s.filename, copiedFile: s.url, originalPath: s.source, seconds: s.duration };
    });
    var data = { date: new Date().toISOString(), volume: Number($('volume').value), speed: Number($('speed').value), size: Number($('size').value), choices: values };
    var url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    var anchor = document.createElement('a'); anchor.href = url; anchor.download = 'vesselbound-vfx-selection.json'; anchor.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000); message('選択したSEの一覧を保存しました');
  }
  function refreshList() {
    var list=VbFxLabModel.effects(VbFx.effects,VbFxLabStore.get(),VbFxLabMeta);
    allNames=list.map(function(e){return e.name;});
    list.forEach(function (entry, i) {
      var d=entry.definition,b=document.querySelector('#effect-list button[data-name="'+d.name+'"]');
      if(!b){
        b=document.createElement('button');b.dataset.name=d.name;
        var number=document.createElement('span');number.className='number';
        var label=document.createElement('span'),caption=document.createElement('span');caption.className='effect-caption';
        var tags=document.createElement('small');tags.className='effect-tags';label.append(caption,tags);b.append(number,label);
        b.addEventListener('click',function(){select(d.name,true).catch(function(){});});
      }
      b.querySelector('.number').textContent=String(i+1).padStart(2,'0');
      b.querySelector('.effect-caption').textContent=entry.meta.title+(entry.meta.missing?'（新規・見出し未設定）':'');
      b.querySelector('.effect-tags').textContent=entry.meta.tags.join(' / ');
      b.dataset.search=[d.name,entry.meta.title].concat(entry.meta.tags,window.VbFxLabUI?VbFxLabUI.searchText(d.name):[]).join(' ').toLowerCase();
      b.classList.toggle('selected',effect===d.name);b.setAttribute('aria-current',effect===d.name?'true':'false');
      var at=$('effect-list').children[i];if(at!==b)$('effect-list').insertBefore(b,at||null);
    });filterList();
  }
  function filterList() {
    var query=$('search').value.toLowerCase().trim();document.querySelectorAll('#effect-list button').forEach(function(b){b.hidden=!(b.dataset.search||b.textContent.toLowerCase()).includes(query);b.style.display=b.hidden?'none':'';});
    $('effect-count').textContent=document.querySelectorAll('#effect-list button').length+'種類';
  }
  refreshList();
  ['all-sweep', 'all-ring', 'all-cross'].forEach(function (name) {
    var b = document.createElement('button'); b.textContent = def(name).label;
    var note = document.createElement('small'); note.textContent = { 'all-sweep': '速い薙ぎ払い・460ms', 'all-ring': '中央から広がる一撃・580ms', 'all-cross': '斬撃の交差・460ms' }[name];
    b.appendChild(note); b.addEventListener('click', function () { select(name, true).catch(function () {}); }); $('proposal-buttons').appendChild(b);
  });
  $('effect-count').textContent = VbFx.effects.length + '種類'; $('protocol').textContent = location.protocol === 'file:' ? 'FILE:// LOCAL' : 'HTTP PREVIEW';
  $('search').addEventListener('input', filterList);
  $('source-select').addEventListener('change', function () { sourceId = this.value; $('side').value = card(sourceId).dataset.side; chooseDefaultTargets(); refreshSelection(); });
  $('auto-target').addEventListener('click', function () { var scene=activeScene;stop();configureBoard();if(scene)applyScene(scene); });
  $('side').addEventListener('change', function () { stop(); configureBoard(); });
  $('background').addEventListener('change', function () { $('board-design').style.backgroundImage = 'url("../assets/art/backgrounds/' + this.value + '")'; });
  $('replay').addEventListener('click', function () { play().catch(function () {}); });
  $('play-all').addEventListener('click', function () { playAll().catch(function (err) { message(err.message); }); });
  $('stop').addEventListener('click', stop);
  $('sound-select').addEventListener('change', function () { choices[effect] = this.value; saveChoices(); refreshSound(); audition(this.value); });
  $('sound-only').addEventListener('click', function () { audition(selectedSound().id); });
  $('export').addEventListener('click', exportChoices);
  $('volume').addEventListener('input', function () { $('volume-value').textContent = Math.round(Number(this.value) * 100) + '%'; audioVoices.forEach(function (a) { a.volume = Number($('volume').value); }); });
  ['speed', 'size'].forEach(function (id) { $(id).addEventListener('input', function () { $(id + '-value').textContent = Number(this.value).toFixed(1) + '×'; }); });
  window.addEventListener('pagehide', stop);
  // 演出の一覧も↑↓キーで前後へ（全カードタブを開いている時はそちらが受け持つ）。
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    var catalog = document.getElementById('card-catalog'); if (catalog && !catalog.hidden) return;
    if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    ev.preventDefault();
    var i = allNames.indexOf(effect), next = allNames[Math.max(0, Math.min(allNames.length - 1, i + (ev.key === 'ArrowDown' ? 1 : -1)))];
    if (next && next !== effect) { select(next, true); var b = document.querySelector('#effect-list button[data-name="' + next + '"]'); if (b) b.scrollIntoView({ block: 'nearest' }); }
  });
  // 状態の重ね表示（2026-10-06 利用者指定）：選んだ状態異常のループを、発生元のカード1枚に同時に出す。
  (function buildStackPanel() {
    var bar = document.querySelector('.playbar'); if (!bar) return;
    var panel = document.createElement('section'); panel.className = 'stack-panel';
    panel.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;padding:6px 10px;font-size:13px';
    var title = document.createElement('strong'); title.textContent = '状態の重ね表示'; panel.appendChild(title);
    VbFx.effects.filter(function (d) { return d.loop; }).forEach(function (d) {
      var label = document.createElement('label'), box = document.createElement('input');
      box.type = 'checkbox'; box.value = d.name; box.checked = ['shield-state', 'guts-state', 'revive-state'].indexOf(d.name) >= 0;
      label.appendChild(box); label.appendChild(document.createTextNode(' ' + d.label));
      // 結界は値＝重ね数、毒・弱体は値で15まで少しずつ禍々しくなる。
      if (d.name === 'shield-state' || d.name === 'poison-state' || d.name === 'weaken-state') {
        var num = document.createElement('input'); num.type = 'number'; num.min = '1'; num.max = '30'; num.value = '1';
        num.style.width = '3.4em'; num.dataset.valueFor = d.name; num.title = d.label + 'の値'; label.appendChild(num);
      }
      panel.appendChild(label);
    });
    var button = document.createElement('button'); button.textContent = '発生元のカードに重ねて表示'; panel.appendChild(button);
    button.addEventListener('click', function () {
      stop();
      var names = Array.prototype.slice.call(panel.querySelectorAll('input:checked')).map(function (b) { return b.value; });
      if (!names.length) { message('状態を選んでください'); return; }
      names.forEach(function (name) {
        var valueInput = panel.querySelector('[data-value-for="' + name + '"]');
        VbFx.play(name, { source: VbFx.rect(card(sourceId)), targets: [], side: ownSide(), value: valueInput ? Number(valueInput.value) || 1 : undefined,
          allies: cardsFor('ally').map(VbFx.rect), enemies: cardsFor('enemy').map(VbFx.rect),
          speed: Number($('speed').value), size: Number($('size').value) }).catch(function () {});
      });
      $('active-status').textContent = '重ね表示 ' + names.length;
    });
    panel.addEventListener('change', function (ev) {
      var name = ev.target && ev.target.dataset && ev.target.dataset.valueFor; if (!name) return;
      var box = panel.querySelector('input[type=checkbox][value="' + name + '"]'); if (!box || !box.checked) return;
      VbFx.play(name, { source: VbFx.rect(card(sourceId)), targets: [], side: ownSide(), value: Number(ev.target.value) || 1 }).catch(function () {});
    });
    bar.parentNode.insertBefore(panel, bar.nextSibling);
  })();
  function scaleBoard() {
    var game = VbFxLabGeometry.game;
    var stage = $('stage'), scale = Math.min(stage.clientWidth / game.width, stage.clientHeight / game.height);
    $('board-design').style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
  }
  window.addEventListener('resize', scaleBoard); scaleBoard();
  if (typeof MutationObserver === 'function') {
    new MutationObserver(function (changes) {
      changes.forEach(function (change) { if (change.target.classList.contains('summon-slot')) layoutSummonRow(change.target); });
    }).observe($('cards'), { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  select(effect);
  return { select: select, play: play, playAll: playAll, stop: stop, audition: audition, ready: true,
    refreshList:refreshList, applyScene:applyScene, gameSound:gameSound,
    playInScene:function(name,scene,options){return select(name).then(function(){applyScene(scene);return play(null,options);});},
    snapshot: function () { return { name: effect, sourceId: sourceId, targetIds: targetIds.slice(), impacts: lastImpacts.slice(), active: VbFx.activeCount(), plays: playCount, se: selectedSound().id }; } };
})();
