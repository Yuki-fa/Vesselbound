#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LAB で利用者が選んだSE候補をゲームへ採用する道具（2026-10-20）。

1件ごとに：候補の wav を assets/sfx/<ファイル> へ置き、assets.js の sfx 登録・audio.js の音量（LAB採用音の標準 .70）・
present.js の PRESENT_LAB_FX のピーク（山場の時刻）を揃え、台帳（ADOPTED.md・adopted_<日付>.json）と
候補一覧（manifest.json・se_catalog.js の adopted 印）を更新する。原音・素材ライブラリは変更しない。

使い方（Pythonから）:
  import adopt_se as A
  A.adopt('paladin-ring', 2, codes=['R019'])
  A.adopt('centaur-impact', 1, codes=[('C019_HIT', 'C019_2.wav')])   # 登録キーとファイル名が違う時
  A.adopt('spriggan', 1, codes=['C079'], gain_db=6)                    # 原音の音量が小さい時は持ち上げる
  A.save('2026-10-20')
"""
import hashlib
import json
import re
import shutil
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SE = ROOT / 'tools/vfx_preview/se'
ASSETS_JS = ROOT / 'assets.js'
AUDIO_JS = ROOT / 'js/engine/audio.js'
PRESENT_JS = ROOT / 'js/battle/present.js'
CATALOG = ROOT / 'tools/vfx_preview/se_catalog.js'
_cat_text = CATALOG.read_text()
_head, _tail = _cat_text[:_cat_text.index('{')], _cat_text[_cat_text.rindex('}') + 1:]
CAT = json.loads(_cat_text[_cat_text.index('{'):_cat_text.rindex('}') + 1])
MAN = json.loads((SE / 'manifest.json').read_text())
LEDGER = []


def _read(path):
    w = wave.open(str(path))
    ch, sr = w.getnchannels(), w.getframerate()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, ch).astype(np.float64)
    return d, ch, sr


def _write(path, d, ch, sr):
    d = np.clip(np.round(d), -32767, 32767).astype('<i2')
    w = wave.open(str(path), 'wb')
    w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr); w.writeframes(d.tobytes()); w.close()


def _peak_seconds(d, sr):
    k = int(.02 * sr)
    env = np.convolve(np.abs(d).max(axis=1), np.ones(k) / k, 'same')
    return round(int(env.argmax()) / sr, 6)


def _ensure_line(path, anchor_regex, key_literal, line):
    """登録の表に key が無ければ、anchor（同じ表の既存行）の直後へ1行足す。あれば値を置き換える。
    同じ番号が別の表（assets.js の VFX の登録など）にもあるので、anchor を含む表（前後の空行まで）の中だけを探す。"""
    text = path.read_text()
    a = re.search(anchor_regex, text, re.M)
    assert a, (path, anchor_regex)
    lo = text.rfind('{', 0, a.start()); hi = text.find('\n  }', a.end())
    pat = re.compile(r'^(\s*)' + re.escape(key_literal) + r'\s*:.*$', re.M)
    m = pat.search(text, lo, hi)
    if m:
        text = text[:m.start()] + m.group(1) + line + text[m.end():]
    else:
        a = re.search(anchor_regex, text, re.M)
        assert a, (path, anchor_regex)
        end = text.index('\n', a.end()) + 1
        indent = re.match(r'\s*', text[a.start():]).group(0)
        text = text[:end] + indent + line + '\n' + text[end:]
    path.write_text(text)


def adopt(effect, index=None, codes=(), key=None, gain_db=0.0, note='', cut_after=None, keep_peak=False):
    """effect の候補 index（1始まり）か key を、codes（登録キー or (登録キー, ファイル名)）へ採用する。"""
    # LAB が読む se_catalog.js を正とする（manifest.json に無い候補もある）。
    key = key or CAT['effects'][effect][index - 1]
    sound = CAT['sounds'][key]
    src = SE / f'{key}.wav'
    d, ch, sr = _read(src)
    edited = bool(gain_db or cut_after)
    if cut_after:
        a = int(cut_after * sr); f = int(.12 * sr)
        d = d[:a + f].copy(); d[a:a + f] *= (np.cos(np.linspace(0, np.pi / 2, len(d[a:a + f]))) ** 2)[:, None]
    if gain_db:
        d *= 10 ** (gain_db / 20)
        d *= min(1.0, 32767 * 10 ** (-1 / 20) / max(1, np.abs(d).max()))
    # 山場の時刻は候補一覧に記録済みの値（LAB の試聴と同じ基準）を使う。無い時だけ測る。
    peak = sound.get('peak') if sound.get('peak') is not None else _peak_seconds(d, sr)
    for code in codes:
        reg, file = (code if isinstance(code, tuple) else (code, code.replace(':', '_') + '.wav'))
        dst = ROOT / 'assets/sfx' / file
        if edited:
            _write(dst, d, ch, sr)
        else:
            shutil.copyfile(src, dst)
        lit = f"'{reg}'" if ':' in reg else reg
        comment = f' // LAB採用（2026-10-20 {effect} 候補{index or key}{("・" + note) if note else ""}）'
        _ensure_line(ASSETS_JS, r"^\s*K009: 'assets/sfx/K009\.wav'", lit, f"{lit}: 'assets/sfx/{file}',{comment}")
        _ensure_line(AUDIO_JS, r"^\s*K009: \{group:'magic',volume:\.70,maxPlayMs:0\}", lit,
                     f"{lit}: {{group:'magic',volume:.70,maxPlayMs:0}},{comment}")
        pres = PRESENT_JS.read_text()
        if keep_peak:  # 以前に手で合わせたピークは変えない
            pat = re.compile(r'(?!x)x')
        else:
            pat = re.compile(r"(" + re.escape(lit) + r":\['" + re.escape(effect) + r"',)([^,\]]+)(,)")
        pres, n = pat.subn(lambda m: m.group(1) + f'{peak}' + m.group(3), pres)
        PRESENT_JS.write_text(pres)
        LEDGER.append({'code': reg, 'effect': effect, 'candidate': key, 'file': f'assets/sfx/{file}',
                       'source': sound['filename'], 'sourcePath': sound['source'], 'peak': peak,
                       'gainDb': gain_db or None, 'note': note or None, 'labWired': bool(n),
                       'duration': round(len(d) / sr, 6), 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()})
    for D in (CAT, MAN):
        for k in D['effects'].get(effect, []):
            if k in D['sounds']:
                D['sounds'][k]['adopted'] = (k == key)
                D['sounds'][k]['provisional'] = False
    return peak


def mark_only(effect, index):
    """ゲームで使っていない演出：候補一覧の採用印だけ付ける。"""
    key = CAT['effects'][effect][index - 1]
    for D in (CAT, MAN):
        for k in D['effects'].get(effect, []):
            if k in D['sounds']: D['sounds'][k]['adopted'] = (k == key)
    LEDGER.append({'code': None, 'effect': effect, 'candidate': key, 'file': None,
                   'source': CAT['sounds'][key]['filename'], 'note': 'ゲーム未使用のVFX。採用印だけ'})


def save(date):
    CATALOG.write_text(_head + json.dumps(CAT, ensure_ascii=False, indent=2) + _tail)
    (SE / 'manifest.json').write_text(json.dumps(MAN, ensure_ascii=False, indent=2) + '\n')
    path = SE / f'adopted_{date.replace("-", "")[4:]}.json'
    book = json.loads(path.read_text()) if path.exists() else {}
    for row in LEDGER:
        book[row['code'] or row['effect']] = row
    path.write_text(json.dumps(book, ensure_ascii=False, indent=2) + '\n')
    rows = [r for r in book.values() if r.get('code') and r.get('sourcePath')]  # 加工だけの行（E071 など）は既存の表のまま
    title = f'## {date} 正式採用（利用者がLABで選択）'
    text = (SE / 'ADOPTED.md').read_text()
    if title in text:  # 同じ日の節は台帳から作り直す
        i = text.index(title); j = text.index('\n## ', i + 1) + 1
        text = text[:i] + text[j:]
    for r in rows:  # 同じ番号の古い行（仮・以前の採用）は消し、最新の採用だけを正とする
        text = re.sub(r'^\| ' + re.escape(r['code']) + r' \|.*\n', '', text, flags=re.M)
    body = (title + '\n\n台帳 ' + path.name + '。ゲームの assets/sfx に配置済み。\n\n| 番号 | 演出 | 元の素材 | 長さ | peak |\n|---|---|---|---|---|\n'
            + '\n'.join(f"| {r['code']} | {r['effect']} | {r['sourcePath'].split('効果音/')[-1]} | {r['duration']}秒 | {r['peak']} |" for r in rows) + '\n\n')
    i = text.index('## 2026-10-18 正式採用')
    (SE / 'ADOPTED.md').write_text(text[:i] + body + text[i:])
    return path
