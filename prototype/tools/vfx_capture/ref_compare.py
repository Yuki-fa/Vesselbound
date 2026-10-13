#!/usr/bin/env python3
"""元のWebP全尺8コマと、新しい定義の撮影8コマを同じ相対時刻で並べる。"""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw
from compare import capture, layout

HERE = Path(__file__).resolve().parent


def fit(image, width, height):
    result = Image.new('RGB', (width, height), '#101713')
    rgba = image.convert('RGBA')
    rgba.thumbnail((width, height), Image.Resampling.LANCZOS)
    result.paste(rgba, ((width - rgba.width)//2, (height - rgba.height)//2), rgba)
    return result


def compare_refs(new, out):
    manifest = json.loads((HERE / 'webp_manifest.json').read_text())
    report = capture(new)
    if report is None:
        raise ValueError('capture.jsonが必要です')
    records = {e['name']: e for e in report['effects']}
    names = {e['name'] for e in manifest['effects']}
    missing = sorted(names - records.keys())
    if missing:
        raise ValueError('新しい撮影が不足しています: ' + ', '.join(missing))
    # 不足・時刻の取り違えは画像を生成する前に検出する。
    validated = []
    for target in manifest['effects']:
        entry = records[target['name']]
        duration = entry['durationMs']
        if not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
            raise ValueError(target['name'] + ': 全尺が不正です')
        file = new / entry['file']
        if file.resolve().parent != new.resolve():
            raise ValueError(target['name'] + ': 撮影画像がフォルダの外を指しています')
        image = Image.open(file)
        times, header, width, height = layout(image, report, entry['file'])
        if len(times) != 8 or any(not math.isfinite(t) or abs(t-duration*i/8)>1e-5 for i,t in enumerate(times)):
            raise ValueError(target['name'] + ': 全尺のi/8の撮影8コマが必要です')
        ref = HERE / 'refs' / target['asset']
        info = json.loads((ref / 'reference.json').read_text())
        frames = [Image.open(ref / f'frame_{i}.png').convert('RGBA') for i in range(8)]
        validated.append((target, entry, image.convert('RGB'), times, header, width, height, info, frames))
    out.mkdir(parents=True, exist_ok=True)
    results = []
    for target, entry, image, times, header, width, height, info, frames in validated:
        title = 40
        joined = Image.new('RGB', (width*8, 2*(height+24+title)), '#101713')
        draw = ImageDraw.Draw(joined)
        source_ms = info['durationMs']
        draw.text((8, 10), f"REFERENCE {target['asset']} | raw {source_ms:g}ms | game {target['playbackMs']:g}ms", fill='white')
        base = title+24+height
        draw.text((8, base+10), f"NEW {target['name']} | {entry['durationMs']:g}ms | impact {entry.get('impactMs', [])}", fill='white')
        for i, frame in enumerate(frames):
            draw.text((i*width+8, title+6), f'{i}/8 | {source_ms*i/8:.1f}ms', fill='#dacfb9')
            joined.paste(fit(frame, width, height), (i*width,title+24))
            draw.text((i*width+8, base+title+6), f'{i}/8 | {times[i]:.1f}ms', fill='#dacfb9')
            joined.paste(image.crop((i*width,header,(i+1)*width,header+height)), (i*width,base+title+24))
        output = target['name']+'.png'
        joined.save(out/output)
        results.append({'name':target['name'], 'sourceCode':target['asset'], 'file':output,
                        'referenceMs':source_ms, 'legacyPlaybackMs':target['playbackMs'],
                        'newPlaybackMs':entry['durationMs'], 'impactMs':entry.get('impactMs'),
                        'visualReview':'UNREVIEWED'})
        print(target['name'] + ' → ' + str(out/output))
    (out/'ref_compare.json').write_text(json.dumps({'effects':results,'sampling':'i/8','visualReview':'UNREVIEWED'},ensure_ascii=False,indent=2)+'\n')
    # 人の目による確認をこの道具の実行結果で置き換えない。
    (out/'REVIEW.md').write_text('# WebP方向性の比較\n\n上段は元の素材全尺、下段は新しい定義の全尺。同じ相対時刻i/8で並べています。\n'
        '元の素材とゲーム内で切り取られていた尺は異なります。命中・カード出現の合図はヘッダとcapture.jsonも確認してください。\n'
        '色・形・動き・明るさ・密度・カードの視認性は全効果を目視し、判定をREVIEW_WEBP_*.mdに記録してください。\n'
        'この道具はSTATUS.txtを変更しません。\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--new', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    try:
        compare_refs(args.new.resolve(), args.out.resolve())
    except (ValueError, KeyError, FileNotFoundError) as exc:
        parser.exit(1, '比較失敗: '+str(exc)+'\n')


if __name__ == '__main__':
    main()
