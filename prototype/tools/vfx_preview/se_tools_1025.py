#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2026-10-25 LAB の指摘で SE を加工する道具（原音・素材ライブラリは変更しない）。
- combine(out, parts)：複数の音を時刻をずらして重ねる（ヘルナイト：剣で切断する音 → 候補1）
- fade_tail(path, start, end)：後半をなめらかに消す（アラストル：後半の高音）
- gain(path, db)：音量を上げる（瘴気の吸収：小さい）
出力は 48kHz・16bit、ピーク -1dBFS（gain は指定の分だけ上げて -1dBFS を上限にする）。"""
import math, subprocess, tempfile, wave
from pathlib import Path
import numpy as np
SR = 48000
def load(path):
    with tempfile.TemporaryDirectory() as tmp:
        conv = Path(tmp) / 'c.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@48000', str(path), str(conv)], check=True, capture_output=True)
        w = wave.open(str(conv)); ch = w.getnchannels()
        d = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, ch).astype(np.float64)
    if ch == 1: d = np.repeat(d, 2, axis=1)
    return d[:, :2]
def save(path, d, peak_db=-1.0):
    d = d * (32767 * 10 ** (peak_db / 20) / max(1, np.abs(d).max()))
    d = np.clip(np.round(d), -32767, 32767).astype('<i2')
    w = wave.open(str(path), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes()); w.close()
def trim_head(d):
    a = np.abs(d).max(axis=1); thr = max(30, a.max() * .012)
    first = int(np.argmax(a > thr)); return d[max(0, first - int(.005 * SR)):]
def cos2_tail(d, ms):
    n = min(len(d), int(ms / 1000 * SR))
    if n > 1: d[-n:] *= (np.cos(np.linspace(0, math.pi / 2, n)) ** 2)[:, None]
    return d
def combine(out, parts, total=2.2):
    """parts: [(path, 開始秒, 長さ秒 or None, 倍率[, 素材の何秒目から使うか])]"""
    mix = np.zeros((int(total * SR), 2))
    for part in parts:
        path, at, length, scale = part[:4]; skip = part[4] if len(part) > 4 else 0
        d = load(path)
        if skip:   # 長い溜めのある素材は、山場の手前から使う（頭を40msで立ち上げる）
            d = d[int(skip * SR):].copy(); f = int(.04 * SR); d[:f] *= np.linspace(0, 1, f)[:, None]
        d = trim_head(d) / 32767.0
        if length: d = cos2_tail(d[:int(length * SR)].copy(), 120)
        d = d / max(1e-9, np.abs(d).max())   # 素材ごとの音量差をそろえてから倍率を掛ける
        s = int(at * SR); e = min(len(mix), s + len(d)); mix[s:e] += d[:e - s] * scale
    mix = cos2_tail(mix, 300)
    save(out, mix * 32767)
def fade_tail(path, start, end, out=None):
    d = load(path); s, e = int(start * SR), min(len(d), int(end * SR))
    curve = np.ones(len(d)); curve[s:e] = np.cos(np.linspace(0, math.pi / 2, e - s)) ** 2; curve[e:] = 0
    d = d * curve[:, None]; d = d[:max(e, 1)]
    save(out or path, d)
def soften_tail(path, start, end, cutoff, fade_at, fade_end, out=None):
    """後半の高音だけを消す（2026-10-25 アラストル：音量ごと切ると「音が切れた」感じになる）。
    start〜end の間に原音から低域だけの音（cutoff Hz 以下、なだらかな肩）へ移し、残った低い響きは fade_at〜fade_end でゆっくり消す。"""
    d = load(path); n = len(d)
    f = np.fft.rfftfreq(n, 1 / SR); shoulder = np.clip((cutoff * 1.6 - f) / (cutoff * .6), 0, 1) ** 2
    low = np.stack([np.fft.irfft(np.fft.rfft(d[:, c]) * shoulder, n) for c in range(2)], axis=1)
    t = np.arange(n) / SR; mix = np.clip((t - start) / max(1e-6, end - start), 0, 1); mix = (np.sin(mix * math.pi / 2)) ** 2
    y = d * (1 - mix)[:, None] + low * mix[:, None]
    amp = np.ones(n); a, b = int(fade_at * SR), min(n, int(fade_end * SR))
    amp[a:b] = np.cos(np.linspace(0, math.pi / 2, b - a)) ** 2; amp[b:] = 0
    y = (y * amp[:, None])[:max(b, 1)]
    save(out or path, y)
def gain(path, db, out=None):
    d = load(path) * 10 ** (db / 20)
    peak = np.abs(d).max(); lim = 32767 * 10 ** (-1 / 20)
    save(out or path, d, peak_db=min(-1.0, 20 * math.log10(min(peak, lim) / 32767)))
def band_profile(path, step=.05):
    """時刻ごとの高域（4kHz以上）の割合。後半の高音の位置を探す。"""
    d = load(path).mean(axis=1); n = int(step * SR); out = []
    for i in range(0, len(d) - n, n):
        seg = d[i:i + n] * np.hanning(n); sp = np.abs(np.fft.rfft(seg)); f = np.fft.rfftfreq(n, 1 / SR)
        tot = sp.sum() + 1e-9; out.append((round(i / SR, 2), round(float(sp[f >= 4000].sum() / tot), 3), round(float(np.sqrt((seg ** 2).mean())), 1)))
    return out

# ── 候補の差し替え（LAB の指摘「SE2、3を再選定」など）。切り出しは prepare_se_1017.py と同じ。──────────
import hashlib, json, os, re, unicodedata
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tools/vfx_preview/se'
SOURCE_ROOT = Path('/Users/yuki/マイドライブ/Argante/デジタル/素材/効果音')
BAD = re.compile(r'Human|Voice|Whisper|Speak|Chant|Scream|Howl|Growl|Creature|Animal|Monster|Vocal|Roar', re.I)
def _catalog():
    s = (OUT.parent / 'se_catalog.js').read_text(); return s[:s.index('{')], json.loads(s[s.index('{'):s.rindex('}') + 1]), s[s.rindex('}') + 1:]
def _cut(src, dst):
    d = load(src); original = len(d) / SR; a = np.abs(d).max(axis=1); thr = max(30, a.max() * .012)
    first = int(np.argmax(a > thr)); start = max(0, first - int(.01 * SR))
    k = int(.02 * SR); env = np.convolve(a, np.ones(k) / k, 'same'); peak = int(env.argmax()); fade_in = 0
    if peak - start > int(.6 * SR): start = peak - int(.45 * SR); fade_in = int(.04 * SR)
    end = min(len(d), start + int(1.95 * SR)); out = d[start:end].copy()
    if fade_in: out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    long = end < len(d); tail = min(len(out), int((.4 if long else .03) * SR))
    if tail > 1: out[-tail:] *= (np.cos(np.linspace(0, math.pi / 2, tail)) ** 2)[:, None]
    save(dst, out)
    e = np.convolve(np.abs(load(dst)).max(axis=1), np.ones(k) / k, 'same')
    return {'duration': round(len(out) / SR, 6), 'originalDuration': round(original, 6), 'start': round(start / SR, 6), 'trimmed': bool(start or long),
            'peak': round(int(e.argmax()) / SR, 6), 'tailFadeMs': round(tail / SR * 1000)}
def replace_candidate(name, idx, query, why, index_file):
    head, cat, tail = _catalog(); N = lambda s: unicodedata.normalize('NFC', s)
    used = {N(v['filename']) for v in cat['sounds'].values()}
    lines = [N(l.strip()[2:]) for l in open(index_file) if l.strip()]
    m = sorted(l for l in lines if query in l and os.path.basename(l) not in used and not BAD.search(l))
    assert m, (name, idx, query)
    src = SOURCE_ROOT / m[0]; key = f'{name}-{idx}'; dst = OUT / f'{key}.wav'; meta = _cut(src, dst)
    cat['sounds'][key] = {'id': key, 'filename': os.path.basename(m[0]), 'source': str(src), 'url': f'vfx_preview/se/{key}.wav', **meta, 'peakDbfs': -1,
                          'peakMode': 'envelope20ms', 'adopted': False, 'provisional': False, 'reason': why, 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()}
    if key not in cat['effects'].setdefault(name, []): cat['effects'][name].append(key)
    (OUT.parent / 'se_catalog.js').write_text(head + json.dumps(cat, ensure_ascii=False, indent=2) + tail)
    man = json.loads((OUT / 'manifest.json').read_text()); man['effects'][name] = cat['effects'][name]; man['sounds'][key] = cat['sounds'][key]
    (OUT / 'manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n')
    return key, os.path.basename(m[0]), meta
def register_file(name, idx, path, why, sources):
    """加工して作った候補（合成など）を候補一覧へ登録する。"""
    head, cat, tail = _catalog(); key = f'{name}-{idx}'
    d = load(path); k = int(.02 * SR); e = np.convolve(np.abs(d).max(axis=1), np.ones(k) / k, 'same')
    # 既存の候補を加工し直した時（フェード・音量）は、元の素材の記録（原音の長さ・切り出し位置）を残して上書きする。
    # LAB（preview.js refreshSound）は originalDuration・start・trimmed を必ず読むので、新しい候補にも入れる（2026-10-25 欠けていて SE を切り替えられなかった）。
    old = cat['sounds'].get(key) or {}
    base = old if old.get('source') != 'tools/vfx_preview/se_tools_1025.py' else {}
    duration = round(len(d) / SR, 6)
    cat['sounds'][key] = {**{'originalDuration': duration, 'start': 0, 'trimmed': False}, **base,
                          'id': key, 'url': f'vfx_preview/se/{key}.wav', 'duration': duration, 'peak': round(int(e.argmax()) / SR, 6),
                          'peakDbfs': -1, 'peakMode': 'envelope20ms', 'adopted': bool(old.get('adopted')), 'provisional': False,
                          'reason': why, 'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}
    if not base: cat['sounds'][key].update({'filename': ' + '.join(sources), 'source': 'tools/vfx_preview/se_tools_1025.py'})
    if key not in cat['effects'].setdefault(name, []): cat['effects'][name].append(key)
    (OUT.parent / 'se_catalog.js').write_text(head + json.dumps(cat, ensure_ascii=False, indent=2) + tail)
    man = json.loads((OUT / 'manifest.json').read_text()); man['effects'][name] = cat['effects'][name]; man['sounds'][key] = cat['sounds'][key]
    (OUT / 'manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n')
    return key
