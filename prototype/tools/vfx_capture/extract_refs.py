#!/usr/bin/env python3
"""Animated WebP/横一列アトラスの参考コマをPillowだけで取り出す。"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def read_frames(asset):
    path = ROOT / 'assets/vfx' / (asset + '.webp')
    frames, durations = [], []
    with Image.open(path) as image:
        if asset == 'appearance_sheet':
            image.load()
            width = image.width // 34
            frames = [image.crop((i * width, 0, (i + 1) * width, image.height)).convert('RGBA') for i in range(34)]
            durations = [33] * 34
        else:
            for i in range(image.n_frames):
                image.seek(i)
                image.load()  # WebPのdurationはload後に設定される。
                frames.append(image.convert('RGBA').copy())
                durations.append(image.info.get('duration', 0) or 1)
    return frames, durations


def at_time(durations, time):
    elapsed = 0
    for i, duration in enumerate(durations):
        elapsed += duration
        if time < elapsed:
            return i
    return len(durations) - 1


def panel(frame, title, size=(240, 204)):
    out = Image.new('RGB', size, '#0d151a')
    copy = frame.copy()
    copy.thumbnail((size[0] - 12, size[1] - 30))
    out.paste(copy, ((size[0] - copy.width) // 2, 27 + (size[1] - 30 - copy.height) // 2), copy)
    ImageDraw.Draw(out).text((7, 7), title, fill='#d4dfdb')
    return out


def extract(asset, output):
    frames, durations = read_frames(asset)
    total = sum(durations)
    output.mkdir(parents=True, exist_ok=True)
    times = [total * i / 8 for i in range(8)]
    chosen = [at_time(durations, t) for t in times]
    strip = Image.new('RGB', (240 * 8, 204), '#0d151a')
    for i, (time, index) in enumerate(zip(times, chosen)):
        frames[index].save(output / ('frame_%d.png' % i))
        strip.paste(panel(frames[index], '%s / %.0f ms / #%d' % (asset, time, index)), (240 * i, 0))
    strip.save(output / 'eight.png')
    cols, tile = 10, (160, 144)
    all_frames = Image.new('RGB', (cols * tile[0], ((len(frames) + cols - 1) // cols) * tile[1]), '#0d151a')
    elapsed = 0
    for i, (frame, duration) in enumerate(zip(frames, durations)):
        all_frames.paste(panel(frame, '#%d / %d ms' % (i, elapsed), tile), ((i % cols) * tile[0], (i // cols) * tile[1]))
        elapsed += duration
    all_frames.save(output / 'all.png')
    info = dict(asset=asset, width=frames[0].width, height=frames[0].height, frameCount=len(frames),
                durationMs=total, frameDurations=durations, times=times, indices=chosen)
    (output / 'reference.json').write_text(json.dumps(info, indent=2) + '\n')
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=Path(__file__).parent / 'refs')
    parser.add_argument('--assets', help='素材IDをカンマ区切りで指定。省略時は対象一覧の参考素材全件。')
    args = parser.parse_args()
    manifest = json.loads((Path(__file__).parent / 'webp_manifest.json').read_text())
    assets = args.assets.split(',') if args.assets else list(dict.fromkeys(d['asset'] for d in manifest['effects']))
    for asset in assets:
        info = extract(asset, args.out / asset)
        print('%s: %d frames / %d ms → %s' % (asset, info['frameCount'], info['durationMs'], args.out / asset))


if __name__ == '__main__':
    main()
