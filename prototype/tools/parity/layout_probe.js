// 画面レイアウトの実測プローブ。index.htmlからは読み込まない。
// ブラウザのコンソールにこのファイルの中身を貼って実行する（戦闘画面／編成画面のどちらでも可）。
(function () {
  const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
  const out = { viewport: { w: innerWidth, h: innerHeight } };

  // ── 1. 戦闘画面の上下の余白 ──
  const stage = document.getElementById('scr-battle');
  const cs = getComputedStyle(document.documentElement);
  out.canvas = {
    scale: cs.getPropertyValue('--game-scale').trim(),
    offsetY: cs.getPropertyValue('--game-offset-y').trim(),
    clipTop: cs.getPropertyValue('--stage-clip-top').trim(),
    clipBottom: cs.getPropertyValue('--stage-clip-bottom').trim(),
  };
  const cards = id => [...document.querySelectorAll('#' + id + ' .slot')].filter(el => el.dataset.unitId).map(r);
  const en = cards('f-enemy'), al = cards('f-ally');
  if (stage && en.length && al.length) {
    const s = r(stage);
    const enTop = Math.min(...en.map(x => x.top));
    const alBottom = Math.max(...al.map(x => x.bottom));
    out.battle = {
      画面: s, 敵カード数: en.length, 味方カード数: al.length,
      敵の最上辺: enTop, 味方の最下辺: alBottom,
      '上の余白': enTop - s.top, '下の余白': s.bottom - alBottom,
      差: (enTop - s.top) - (s.bottom - alBottom),
      敵枠: r(document.getElementById('f-enemy')), 味方枠: r(document.getElementById('f-ally')),
    };
  } else out.battle = '戦闘画面ではないか、カードが無い';

  // ── 1b. 戦闘背景が画面下辺まで届いているか ──
  if (stage) {
    const bs = getComputedStyle(stage, '::before');
    const url = (bs.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] || '';
    const R = stage.getBoundingClientRect();
    out.背景 = {
      classes: stage.className,
      file: url.split('/').pop(),
      size: bs.backgroundSize, position: bs.backgroundPosition,
      display: bs.display, content: bs.content, opacity: bs.opacity,
      画面高: Math.round(R.height),
      stageVideo: (() => { const v = document.getElementById('stage-bg-video'); if (!v) return null; const c = getComputedStyle(v); return { active: v.classList.contains('is-active'), display: c.display, opacity: c.opacity, objectFit: c.objectFit, rect: r(v), src: (v.getAttribute('src') || '').split('/').pop() }; })(),
      facilityBg: document.body.classList.contains('facility-bg-active'),
    };
    // 画像の自然サイズが取れるなら、cover計算で「画像下端−画面下辺」を出す
    if (url) {
      const im = new Image();
      im.src = url;
      if (im.complete && im.naturalHeight) {
        const sc = Math.max(R.width / im.naturalWidth, R.height / im.naturalHeight);
        const drawH = im.naturalHeight * sc;
        const pct = parseFloat((bs.backgroundPosition.split(' ')[1] || '50%'));
        const y = (R.height - drawH) * (pct / 100);
        out.背景.自然サイズ = { w: im.naturalWidth, h: im.naturalHeight };
        out.背景['画像下端−画面下辺'] = Math.round((y + drawH) - R.height);
      } else out.背景.自然サイズ = '未ロード（もう一度実行してください）';
    }
  }

  // ── 2. 「所持金」を描画している要素をすべて列挙する ──
  const money = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.children.length) return;
    const t = (el.textContent || '').trim();
    const before = getComputedStyle(el, '::before').content || '';
    if (!/所持金/.test(t) && !/所持金/.test(before)) return;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;
    money.push({ id: el.id || '', cls: el.className || '', text: t.slice(0, 12), before: before.slice(0, 12), rect: r(el), fontSize: getComputedStyle(el).fontSize, 親: (el.parentElement && (el.parentElement.id || el.parentElement.className)) || '' });
  });
  out.所持金を描いている要素 = money;
  out.bodyClass = document.body.className;
  return JSON.stringify(out, null, 1);
})()
