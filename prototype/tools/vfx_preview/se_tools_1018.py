#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""2026-10-18：LABのSE候補を個別に作り直す・加工する道具（利用者の指摘への対応）。
原音は変えない。切り出しは prepare_se_1017.py と同じ（頭の無音を詰める・ピーク約-1dBFS・48kHz/16bit）に、
長さ・末尾フェード・高音の抑え・音程の変更・アタックの柔らげを足せる。

使い方（Pythonから）:
  make(key, source_path, reason, start=None, max_sec=1.95, tail_ms=400, high_cut=None, pitch=1.0, soften=0.0, high_shelf_db=0)
  replace_effect(effect, [key1, key2, key3])   # 効果の候補一覧を差し替える
  save()                                       # se_catalog.js・manifest.json へ書き出す
"""
import json, math, subprocess, tempfile, wave, hashlib
from pathlib import Path
import numpy as np
PROJECT = Path(__file__).resolve().parents[2]
SE = PROJECT / 'tools/vfx_preview/se'
SR = 48000
_cat_path = PROJECT / 'tools/vfx_preview/se_catalog.js'
_s = _cat_path.read_text()
_head, _tail = _s[:_s.index('{')], _s[_s.rindex('}') + 1:]
CAT = json.loads(_s[_s.index('{'):_s.rindex('}') + 1])
MAN = json.loads((SE / 'manifest.json').read_text())

def _load(src):
    with tempfile.TemporaryDirectory() as tmp:
        conv = Path(tmp) / 'c.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@48000', str(src), str(conv)], check=True, capture_output=True)
        w = wave.open(str(conv)); ch = w.getnchannels()
        d = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, ch).astype(np.float64)
    return d, ch

def _lowpass(d, cut, width=1500):
    N = len(d); F = np.fft.rfft(d, axis=0); f = np.fft.rfftfreq(N, 1 / SR)
    g = np.clip((cut + width - f) / width, 0, 1); g = np.sin(g * math.pi / 2) ** 2
    return np.fft.irfft(F * g[:, None], n=N, axis=0)

def _high_shelf(d, corner, db):
    N = len(d); F = np.fft.rfft(d, axis=0); f = np.fft.rfftfreq(N, 1 / SR)
    t = np.clip((f - corner * 0.6) / (corner * 0.8), 0, 1)
    g = 10 ** (db * t / 20)
    return np.fft.irfft(F * g[:, None], n=N, axis=0)

def _pitch(d, ratio):
    if abs(ratio - 1) < 1e-6: return d
    n = len(d); idx = np.arange(0, n - 1, ratio)
    return np.stack([np.interp(idx, np.arange(n), d[:, c]) for c in range(d.shape[1])], axis=1)

def _soften(d, amount):
    # アタックの角を丸める：短い包絡線で突出部だけを抑える（不快な鋭さを和らげる）
    if amount <= 0: return d
    a = np.abs(d).max(axis=1); k = int(0.004 * SR)
    env = np.convolve(a, np.ones(k) / k, 'same'); slow = np.convolve(a, np.ones(k * 10) / (k * 10), 'same')
    ratio = np.where(env > slow * 1.5, (slow * 1.5 / np.maximum(env, 1)) ** amount, 1.0)
    ratio = np.convolve(ratio, np.ones(k) / k, 'same')
    return d * ratio[:, None]

def make(key, src, reason, start=None, max_sec=1.95, tail_ms=400, high_cut=None, pitch=1.0, soften=0.0, high_shelf_db=0.0, shelf_corner=3000):
    src = Path(src); d, ch = _load(src); original = len(d) / SR
    d = _pitch(d, pitch)
    a = np.abs(d).max(axis=1); thr = max(30, a.max() * .012)
    if start is None:
        first = int(np.argmax(a > thr)); st = max(0, first - int(.01 * SR))
        k = int(.02 * SR); env = np.convolve(a, np.ones(k) / k, 'same'); peak = int(env.argmax())
        if peak - st > int(.6 * SR): st = peak - int(.45 * SR)
    else:
        st = int(start * SR)
    end = min(len(d), st + int(max_sec * SR)); out = d[st:end].copy()
    if st > 0: fi = int(.03 * SR); out[:fi] *= np.linspace(0, 1, fi)[:, None]
    if high_cut: out = _lowpass(out, high_cut)
    if high_shelf_db: out = _high_shelf(out, shelf_corner, high_shelf_db)
    if soften: out = _soften(out, soften)
    long = end < len(d)
    tail = min(len(out), int((tail_ms if long else min(tail_ms, 60)) / 1000 * SR))
    if tail > 1: out[-tail:] *= (np.cos(np.linspace(0, math.pi / 2, tail)) ** 2)[:, None]
    out *= 32767 * 10 ** (-1 / 20) / max(1, np.abs(out).max())
    out = np.clip(np.round(out), -32767, 32767).astype('<i2')
    dst = SE / f'{key}.wav'
    w = wave.open(str(dst), 'wb'); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
    k = int(.02 * SR); e = np.convolve(np.abs(out.astype(np.float64)).max(axis=1), np.ones(k) / k, 'same')
    meta = {'id': key, 'filename': src.name, 'source': str(src), 'url': f'vfx_preview/se/{key}.wav', 'duration': round(len(out) / SR, 6),
            'originalDuration': round(original, 6), 'start': round(st / SR, 6), 'trimmed': bool(st or long), 'peak': round(int(e.argmax()) / SR, 6),
            'tailFadeMs': round(tail / SR * 1000), 'peakDbfs': -1, 'peakMode': 'envelope20ms', 'adopted': False, 'provisional': False, 'reason': reason,
            'edit': {k2: v for k2, v in {'highCutHz': high_cut, 'pitch': pitch if pitch != 1 else None, 'soften': soften or None,
                                          'highShelfDb': high_shelf_db or None, 'maxSec': max_sec, 'tailMs': tail_ms}.items() if v is not None},
            'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()}
    CAT['sounds'][key] = meta; MAN['sounds'][key] = meta
    return meta

def replace_effect(effect, keys):
    CAT['effects'][effect] = keys; MAN['effects'][effect] = keys

def save():
    _cat_path.write_text(_head + json.dumps(CAT, ensure_ascii=False, indent=2) + _tail)
    (SE / 'manifest.json').write_text(json.dumps(MAN, ensure_ascii=False, indent=2) + '\n')

def find(index_path, query, exclude=()):
    import re
    bad = re.compile(r'Human|Voice|Whisper|Speak|Chant|Scream|Howl|Growl|Creature|Animal|Monster|Vocal|Roar|Cartoon', re.I)
    used = {s['filename'] for s in CAT['sounds'].values()} | set(exclude)
    root = Path('/Users/yuki/マイドライブ/Argante/デジタル/素材/効果音')
    for l in open(index_path):
        l = l.strip()[2:]
        if query in l and not bad.search(l) and Path(l).name not in used: return root / l
    return None
