#!/usr/bin/env python3
"""Chromeの4コマ撮影ページから保存した画像を、盤面PNGと比較JPGへ分ける。"""
import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
TIMES = [150, 450, 800, 1200]

def tiles(source, crop):
    im = Image.open(source).convert('RGB')
    if crop:
        x, y, w, h = crop
    else:
        # macOS Chrome・DPR2。横幅が変わっても4コマページの16:9を維持する。
        scale = min((im.width / 2 - 26) / 3200, ((im.height - 242) / 2 - 138) / 1800)
        w, h = round(3200 * scale), round(1800 * scale)
        x, y = round((im.width - w * 2 - 20) / 2), 430
    if im.width < 2 * (w + x) or im.height < y + 2 * h + 76:
        raise ValueError(f'{source.name}: 撮影サイズが違います {im.size}')
    samples = list(im.crop((x, y, x + w, y + h)).resize((64, 36)).getdata())
    sky = sum(1 for r, g, b in samples if b - r > 12 and g - r > 8) / len(samples)
    if sky < .12:
        raise ValueError(f'{source.name}: 戦闘背景を確認できないため採用しません')
    return [im.crop((x + (w + 20) * (i % 2), y + (h + 76) * (i // 2),
                     x + (w + 20) * (i % 2) + w, y + (h + 76) * (i // 2) + h)) for i in range(4)]

def load_definitions():
    # 古いJS配列の書式へ依存せず、ブラウザと同じ登録データを検証して読む。
    source = "process.stdout.write(JSON.stringify(require('./tools/vfx_export').validatedBundle().bundle.effects));"
    effects = json.loads(subprocess.check_output(['node', '-e', source], cwd=PROJECT, text=True))
    return [(d['name'], d['label'], d['ms']) for d in effects]

def build(native_dir, crop):
    definitions = load_definitions()
    font = ImageFont.truetype(str(PROJECT / 'assets/fonts/ShipporiMincho-Medium.ttf'), 22)
    small = ImageFont.truetype(str(PROJECT / 'assets/fonts/ShipporiMincho-Medium.ttf'), 18)
    shots = HERE / 'shots'; shots.mkdir(exist_ok=True)
    review = HERE / 'review'; review.mkdir(exist_ok=True)
    report = []
    phase_count = 0
    for name, label, ms in definitions:
        source = native_dir / f'vb-fx-{name}-screen.png'
        if not source.exists():
            continue
        boards = tiles(source, crop)
        sheet = Image.new('RGB', (1600, 1004), '#111712')
        pen = ImageDraw.Draw(sheet)
        pen.text((18, 8), f'{label} / {name} · {ms}ms', font=font, fill='#ebd6ac')
        for i, time in enumerate(TIMES):
            tile = boards[i]
            tile.save(shots / f'{name}_{time}.png')
            dx = (i % 2) * 800; dy = 44 + (i // 2) * 480
            pen.text((dx + 14, dy + 3), f'{time}ms', font=small, fill='#ebd6ac')
            sheet.paste(tile.resize((800, 450), Image.Resampling.LANCZOS), (dx, dy + 30))
        sheet.save(review / f'sheet_{name}_revised.jpg', quality=94, subsampling=0)
        row = {'name': name, 'label': label, 'durationMs': int(ms), 'timesMs': TIMES, 'sheet': f'sheet_{name}_revised.jpg', 'phases': []}
        phase_source = native_dir / f'vb-fx-{name}--phases-screen.png'
        phase_meta = native_dir / f'vb-fx-{name}--phases-frames.json'
        if phase_source.exists() and phase_meta.exists():
            captions = json.loads(phase_meta.read_text())['captions']
            if len(captions) != 4:
                raise ValueError(f'{name}: 段階ごとの時刻が4つありません')
            boards = tiles(phase_source, crop)
            sheet = Image.new('RGB', (1600, 1004), '#111712')
            pen = ImageDraw.Draw(sheet)
            pen.text((18, 8), f'{label} / {name} · 始め・中盤・命中・終わり', font=font, fill='#ebd6ac')
            for i, caption in enumerate(captions):
                time = caption['ms']
                boards[i].save(shots / f'{name}_{time}.png')
                dx = (i % 2) * 800; dy = 44 + (i // 2) * 480
                pen.text((dx + 14, dy + 3), f'{caption["phase"]} · {time}ms', font=small, fill='#ebd6ac')
                sheet.paste(boards[i].resize((800, 450), Image.Resampling.LANCZOS), (dx, dy + 30))
            row['phases'] = captions
            row['phaseSheet'] = f'sheet_{name}_phases.jpg'
            sheet.save(review / row['phaseSheet'], quality=94, subsampling=0)
            phase_count += 1
        report.append(row)
    (review / 'capture_manifest.json').write_text(json.dumps({'method': '実ChromeのCanvasを60fps刻みで指定時刻まで描画して保持。実時間の機能検査とは別。', 'effects': report}, ensure_ascii=False, indent=2) + '\n')
    html = '<!doctype html><html lang="ja"><meta charset="utf-8"><title>VFX 4コマ比較</title><style>body{background:#111712;color:#eae6dc;font:14px sans-serif;margin:24px}a{color:#e0bf83}img{width:100%;height:auto}section{max-width:1600px;margin:30px auto}h2{font-size:18px}details{margin:18px 0}</style><h1>VFX · 150 / 450 / 800 / 1200ms</h1><p><a href="../../vfx_preview.html">プレビュー</a> · <a href="../review_capture.html">再撮影</a> · 左上150、右上450、左下800、右下1200ms。短い演出の終了後は通常の盤面。</p>'
    html += '<details><summary>既存素材の基準</summary>' + ''.join(f'<img src="../ref_{n}.jpg" alt="{n}">' for n in ['C023', 'S008', 'C058']) + '</details>'
    for row in report:
        html += f'<section><h2>{row["label"]} · {row["durationMs"]}ms</h2><a href="{row["sheet"]}"><img loading="lazy" src="{row["sheet"]}" alt="{row["label"]}の4コマ"></a></section>'
        if row['phases']:
            html += f'<section><details><summary>{row["label"]} · 始め・中盤・命中・終わり</summary><a href="{row["phaseSheet"]}"><img loading="lazy" src="{row["phaseSheet"]}" alt="{row["label"]}の4段階"></a></details></section>'
    html += '<details><summary>利用者提供の変更前4コマ（保存したまま）</summary>' + ''.join(f'<img src="sheet_{n}.jpg" alt="変更前 {n}">' for n in ['dark-fire', 'leprechaun', 'shockwave', 'banshee']) + '</details></html>'
    (review / 'index.html').write_text(html)
    print(f'固定時刻 {len(report)}演出 / 4段階 {phase_count}演出 / PNG {(len(report) + phase_count) * 4}枚 / JPG {len(report) + phase_count}枚')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--native-dir', type=Path, default=Path('/private/tmp'))
    parser.add_argument('--crop', type=int, nargs=4, metavar=('X', 'Y', 'W', 'H'))
    args = parser.parse_args()
    build(args.native_dir, args.crop)
