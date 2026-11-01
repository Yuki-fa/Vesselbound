#!/usr/bin/env python3
"""2026-11-01：呪いの印（E066）の「呪いが栄光に変わる」演出 curse-to-glory のSE候補を3つ作る。

  python3 tools/vfx_preview/prepare_se_1101.py <原音を置いたフォルダ>

96kHz の原音は 2:1 で 48kHz へ落とす（隣り合う2標本の平均＝簡易の低域通過）。それ以外は prepare_se_1029.py と同じ。

原音は Google Drive の 素材/効果音 から取り出した WAV（48kHz・16bit）。成長の音を短くした候補だけは
ゲームの assets/sfx/C088.wav（成長＝leprechaun の採用音）から切る。
切り出しは prepare_se_1025b.py と同じ（頭の無音を詰める。ピークが0.6秒より後ならピークの0.45秒前から始めて40msでフェードイン。
上限を超える音は末尾400msをcos²で消す。ピーク約-1dBFS、48kHz・16bit）。上限は演出の尺に合わせて効果ごとに決める。
afconvert（Mac専用）を使わず、WAVを直接読む。候補を足すだけで、ゲームの音は変えない（LABで選んだ後に別作業で反映）。"""
from pathlib import Path
import hashlib, json, math, re, sys, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tools/vfx_preview/se'
DRIVE = '/Users/yuki/マイドライブ/Argante/デジタル/素材/効果音'
SR = 48000
PICKS = {
  'curse-to-glory': {'max': 1.95, 'why': 'E066 呪いの印：4回目の終戦で英雄の印へ（紫の呪印が砕けて金の光の柱。演出2.2秒・砕ける山場は約40%）', 'items': [
    ('SORCERY - DESIGNED - MAGIC ICE Break Out Of Spell-02.wav', 'drive:Sounds/分割', '呪縛を破って抜け出す音（呪いが砕ける）'),
    ('SORCERY - DESIGNED - MAGIC WHITE Deflect Spell 01-02.wav', 'drive:Sounds/分割', '白魔法のきらめき（栄光・聖なる光）'),
    ('Production Element Title Transition Ascend 10.wav', 'Adobe/映像／音響演出用SE・トランジションなど', '昇っていく遷移音（光の柱が立ち上がる）'),
  ]},
}


def read(path):
    w = wave.open(str(path))
    assert w.getsampwidth() == 2 and w.getframerate() in (SR, SR * 2), (path, w.getsampwidth(), w.getframerate())
    ch = w.getnchannels()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, ch).astype(np.float64)
    if w.getframerate() == SR * 2:
        d = d[:len(d) // 2 * 2].reshape(-1, 2, ch).mean(axis=1)
    return d, ch


def cut(src, dst, max_sec):
    d, ch = read(src)
    original = len(d) / SR
    a = np.abs(d).max(axis=1); thr = max(30, a.max() * .012)
    first = int(np.argmax(a > thr)); start = max(0, first - int(.01 * SR))
    k = int(.02 * SR); env = np.convolve(a, np.ones(k) / k, 'same'); peak = int(env.argmax())
    fade_in = 0
    if peak - start > int(.6 * SR): start = peak - int(.45 * SR); fade_in = int(.04 * SR)
    end = min(len(d), start + int(max_sec * SR)); out = d[start:end].copy()
    if fade_in: out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    long = end < len(d)
    tail = min(len(out), int((min(.4, max_sec * .3) if long else .03) * SR))
    if tail > 1: out[-tail:] *= (np.cos(np.linspace(0, math.pi / 2, tail)) ** 2)[:, None]
    out *= 32767 * 10 ** (-1 / 20) / max(1, np.abs(out).max()); out = np.clip(np.round(out), -32767, 32767).astype('<i2')
    w = wave.open(str(dst), 'wb'); w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes()); w.close()
    e = np.convolve(np.abs(out.astype(np.float64)).max(axis=1), np.ones(k) / k, 'same')
    return {'duration': round(len(out) / SR, 6), 'originalDuration': round(original, 6), 'start': round(start / SR, 6),
            'trimmed': bool(start or long), 'peak': round(int(e.argmax()) / SR, 6), 'tailFadeMs': round(tail / SR * 1000)}


def main():
    src_dir = Path(sys.argv[1])
    cat_path = OUT.parent / 'se_catalog.js'
    text = cat_path.read_text()
    head, body = text[:text.index('{')], text[text.index('{'):text.rindex('}') + 1]
    cat = json.loads(body)
    man_path = OUT / 'manifest.json'
    man = json.loads(man_path.read_text())
    rows, details = [], []
    for name, spec in PICKS.items():
        keys = []
        for i, (fn, folder, why) in enumerate(spec['items'], 1):
            src = (ROOT / 'assets/sfx' / fn) if folder.startswith('game:') else src_dir / fn
            if not src.exists():
                print('原音が無いので外す:', fn); continue
            key = f'{name}-{len(keys) + 1}'
            dst = OUT / f'{key}.wav'
            meta = cut(src, dst, spec['max'])
            # drive: は素材/効果音の外（マイドライブ内の別フォルダ）。フォルダ名だけを残す。
            source = (f'prototype/assets/sfx/{fn}' if folder.startswith('game:')
                      else f'Google Drive: {folder[6:]}/{fn}' if folder.startswith('drive:') else f'{DRIVE}/{folder}/{fn}')
            cat['sounds'][key] = {'id': key, 'filename': fn, 'source': source, 'url': f'vfx_preview/se/{key}.wav', **meta,
                                  'peakDbfs': -1, 'peakMode': 'envelope20ms', 'adopted': False, 'provisional': False,
                                  'reason': f'{spec["why"]}／{why}', 'sha256': hashlib.sha256(dst.read_bytes()).hexdigest()}
            keys.append(key)
            details += [f'<a id="{key}"></a>', f'### {key} / {fn}', '', f'- 元素材: `{source}`', f'- 理由: {why}',
                        f'- 原音 {meta["originalDuration"]:.3f}秒 / 開始 {meta["start"]:.3f}秒 / 出力 {meta["duration"]:.3f}秒 / peak {meta["peak"]:.3f}秒 / 末尾フェード {meta["tailFadeMs"]}ms', '']
        cat['effects'][name] = keys
        man['effects'][name] = keys
        for k in keys: man['sounds'][k] = cat['sounds'][k]
        rows.append('| ' + name + ' | ' + ' | '.join(f'[{cat["sounds"][k]["filename"]}](#{k}) · {cat["sounds"][k]["duration"]:.3f}秒 / peak {cat["sounds"][k]["peak"]:.3f}' for k in keys) + ' |')
        print(name, [(cat['sounds'][k]['filename'][:44], cat['sounds'][k]['duration'], cat['sounds'][k]['peak']) for k in keys])
    head = re.sub(r'^/\* ', '/* 2026-11-01: 呪いの印（E066）curse-to-glory の3候補を追加。', head, count=1)
    cat_path.write_text(head + json.dumps(cat, ensure_ascii=False, indent=2) + ';\n')
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n')
    readme = OUT / 'README.md'
    t = readme.read_text()
    t = re.sub(r'\n<!-- SE1101_ROWS_BEGIN -->.*?<!-- SE1101_ROWS_END -->', '', t, flags=re.S)
    t = t.split('\n## 2026-11-01追加の原音と加工')[0]
    at = t.index('<!-- SE1029_ROWS_END -->') + len('<!-- SE1029_ROWS_END -->')
    t = t[:at] + '\n<!-- SE1101_ROWS_BEGIN -->\n' + '\n'.join(rows) + '\n<!-- SE1101_ROWS_END -->' + t[at:]
    readme.write_text(t.rstrip('\n') + '\n\n## 2026-11-01追加の原音と加工\n\n呪いの印（E066）の「呪いが栄光に変わる」演出（curse-to-glory）の候補。'
                      'ファイル名と尺による一次選定で、聴感は未確認。ゲームの音は LAB で選ぶまで今のまま。\n\n' + '\n'.join(details))


main()
