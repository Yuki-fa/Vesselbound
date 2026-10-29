#!/usr/bin/env python3
"""2026-10-29：LAB の161番（闇の火球の弾 dark-fireball）と180番（戦闘中の高速の永久強化 leprechaun-quick）のSE候補（各3つ）を作る。

  python3 tools/vfx_preview/prepare_se_1029.py <原音を置いたフォルダ>

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
  'dark-fireball': {'max': 1.95, 'why': '161 闇の火球の弾（単体へ飛ぶ黒い火球）。今は旧「闇の炎」E006の音を仮に使用（2026-10-29 利用者指定で再選定）', 'items': [
    ('Production Element Title Transition Whoosh Fire 03.wav', 'Adobe/映像／音響演出用SE・トランジションなど', '炎の塊が飛び去る短い風切り'),
    ('Production Element Title Transition Whoosh Fire 07.wav', 'Adobe/映像／音響演出用SE・トランジションなど', '短めの炎の風切り（軽い）'),
    ('Production Element Title Transition Stab Dark Short 03.wav', 'Adobe/映像／音響演出用SE・トランジションなど', '暗く短い一撃（闇の色を強める）'),
  ]},
  'leprechaun-quick': {'max': 1.0, 'why': '180 戦闘中の高速の永久強化（成長の簡易版、0.7秒）。今は成長C088の音を共有（2026-10-29 利用者指定で別の音へ）', 'items': [
    ('Foley Coin Jingle In Hand Short 01.wav', 'Adobe/物を扱う音、衣擦れなど日常的な実音', '金貨の短いジャラッ（金の永久強化）'),
    ('Impact Coins Multiple Coin Drop On Felt 05.wav', 'Adobe/物を扱う音、衣擦れなど日常的な実音', '軽いコインの落下（短く明るい）'),
    ('C088.wav', 'game:assets/sfx', '成長の音（C088）の頭だけを短く（成長の味のまま）'),
  ]},
}


def read(path):
    w = wave.open(str(path))
    assert w.getsampwidth() == 2 and w.getframerate() == SR, (path, w.getsampwidth(), w.getframerate())
    ch = w.getnchannels()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').reshape(-1, ch).astype(np.float64)
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
            source = f'prototype/assets/sfx/{fn}' if folder.startswith('game:') else f'{DRIVE}/{folder}/{fn}'
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
    head = re.sub(r'^/\* ', '/* 2026-10-29: 161 闇の火球の弾・180 戦闘中の高速の永久強化の3候補を追加。', head, count=1)
    cat_path.write_text(head + json.dumps(cat, ensure_ascii=False, indent=2) + ';\n')
    man_path.write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n')
    readme = OUT / 'README.md'
    t = readme.read_text()
    t = re.sub(r'\n<!-- SE1029_ROWS_BEGIN -->.*?<!-- SE1029_ROWS_END -->', '', t, flags=re.S)
    t = t.split('\n## 2026-10-29追加の原音と加工')[0]
    at = t.index('<!-- SE1025B_ROWS_END -->') + len('<!-- SE1025B_ROWS_END -->')
    t = t[:at] + '\n<!-- SE1029_ROWS_BEGIN -->\n' + '\n'.join(rows) + '\n<!-- SE1029_ROWS_END -->' + t[at:]
    readme.write_text(t.rstrip('\n') + '\n\n## 2026-10-29追加の原音と加工\n\n161 闇の火球の弾（dark-fireball）と180 戦闘中の高速の永久強化（leprechaun-quick）の候補。'
                      'ファイル名と尺による一次選定で、聴感は未確認。ゲームの音は LAB で選ぶまで今のまま。\n\n' + '\n'.join(details))


main()
