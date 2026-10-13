#!/usr/bin/env python3
"""同じゲーム盤面の旧WebP／新定義8コマと、VFXなしの盤面との差を比較する。"""
import argparse
import csv
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from compare import capture, layout, validate_reports

THRESHOLD = 3  # 255段階中。微小な合成・丸め差を存在感に数えない。
PADDING = 1.0  # 各カードの幅1枚分を上下左右に加えた領域の和集合。
RANGE = (0.70, 1.30)
CORE_FRACTION = .05
IOU_MIN = .35
LUMA = np.array([0.2126, 0.7152, 0.0722])


def safe_file(root, name, baseline=False):
    relative = Path(name)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('撮影画像がフォルダ外を指しています: ' + name)
    expected = root / 'baselines' if baseline else root
    file = root / relative
    if file.resolve().parent != expected.resolve():
        raise ValueError('撮影画像の置き場所が不正です: ' + name)
    return file


def roi(geometry, entry, width, height):
    stage = geometry['stage']
    for key in ['width', 'height']:
        if not isinstance(stage[key], (int, float)) or not math.isfinite(stage[key]) or stage[key] <= 0:
            raise ValueError('盤面の寸法が不正です')
    cards = {c['id']: c for c in geometry['cards']}
    if len(cards) != len(geometry['cards']):
        raise ValueError('カード位置が重複しています')
    ids = list(dict.fromkeys([entry['source'], *entry['targets']]))
    mask = np.zeros((height, width), dtype=bool)
    card_mask = mask.copy()
    sx, sy = width / stage['width'], height / stage['height']
    for identity in ids:
        if identity not in cards:
            raise ValueError('カード位置がありません: ' + identity)
        c = cards[identity]
        for key in ['left', 'top', 'width', 'height']:
            if not isinstance(c[key], (int, float)) or not math.isfinite(c[key]):
                raise ValueError('カード座標が不正です: ' + identity)
        if c['width'] <= 0 or c['height'] <= 0:
            raise ValueError('カードの大きさが不正です: ' + identity)
        for target, pad in [(mask, c['width'] * PADDING), (card_mask, 0)]:
            x0 = min(width, max(0, math.floor((c['left'] - pad) * sx)))
            y0 = min(height, max(0, math.floor((c['top'] - pad) * sy)))
            x1 = max(0, min(width, math.ceil((c['left'] + c['width'] + pad) * sx)))
            y1 = max(0, min(height, math.ceil((c['top'] + c['height'] + pad) * sy)))
            target[y0:y1, x0:x1] = True
    if not mask.any() or not card_mask.any():
        raise ValueError('カード周辺領域が空です')
    return mask, int(card_mask.sum()), ids


def change_mask(image, baseline, mask):
    return mask & (np.abs(image.astype(float)-baseline.astype(float)).max(axis=2) >= THRESHOLD)


def top_mean(values):
    """端数を切り上げた上位5%。変化がないコマを明るい核として数えない。"""
    count = math.ceil(len(values)*CORE_FRACTION)
    return float(np.partition(values, len(values)-count)[-count:].mean()) if count else 0


def mask_iou(old, new):
    union = int((old | new).sum())
    return int((old & new).sum())/union if union else None


def presence(image, baseline, mask, card_area):
    delta = image.astype(float) - baseline.astype(float)
    changed = change_mask(image, baseline, mask)
    increment = np.maximum(delta @ LUMA, 0)
    # 正のRGB増分の色相。灰色・白を赤(0度)と誤判定しない。
    rgb = np.maximum(delta[changed], 0)
    hue = None
    if len(rgb):
        maximum, minimum = rgb.max(axis=1), rgb.min(axis=1)
        chroma = maximum - minimum
        colored = (chroma > 1e-8) & (chroma / np.maximum(maximum, 1e-8) >= .05)
        if colored.any():
            r, g, b = rgb[colored].T
            c, m = chroma[colored], maximum[colored]
            h = np.zeros(len(c))
            red, green = (m == r), (m == g) & (m != r)
            blue = ~(red | green)
            h[red] = ((g[red]-b[red])/c[red]) % 6
            h[green] = (b[green]-r[green])/c[green]+2
            h[blue] = (r[blue]-g[blue])/c[blue]+4
            angles = h * math.pi / 3
            weights = c * np.maximum(rgb[colored] @ LUMA, 1e-8)
            vector = (weights * np.exp(1j*angles)).sum()
            if abs(vector) > weights.sum() * 1e-6:
                hue = float(np.angle(vector) * 180 / math.pi % 360)
    pixels = int(changed.sum())
    brightness = float(increment[changed].sum())
    return dict(changed_pixels=pixels, area_pct_of_cards=pixels/card_area*100,
                brightness_sum=brightness, brightness_mean_roi=brightness/int(mask.sum()),
                brightness_mean_changed=float(increment[changed].mean()) if pixels else 0,
                core_top5_mean=top_mean((image.astype(float) @ LUMA)[changed]),
                core_top5_increment_mean=top_mean(increment[changed]),
                darkening_sum=float(np.maximum(-(delta @ LUMA), 0)[changed].sum()), hue_deg=hue)


def ratio(new, old):
    return new/old if old > 1e-9 else None


def text(value, precision=2):
    return '—' if value is None else f'{value:.{precision}f}'


def card_crops(entry, ia, ib, masks, ids, out, times, header, w, h):
    """変化が最も多い指定カードを選び、旧新に同じ固定矩形を使う。"""
    stage = entry['geometry']['stage']
    sx, sy = w/stage['width'], h/stage['height']
    cards = [c for c in entry['geometry']['cards'] if c['id'] in ids]

    def box(card, pad):
        return (min(w, max(0, math.floor((card['left']-pad)*sx))),
                min(h, max(0, math.floor((card['top']-pad)*sy))),
                max(0, min(w, math.ceil((card['left']+card['width']+pad)*sx))),
                max(0, min(h, math.ceil((card['top']+card['height']+pad)*sy))))

    def score(card):
        x0, y0, x1, y1 = box(card, 0)
        return max(int(m[y0:y1, x0:x1].sum()) for m in masks)

    cards = [c for c in cards if box(c, 0)[0] < box(c, 0)[2] and box(c, 0)[1] < box(c, 0)[3]]
    focus = max(cards, key=score)
    x0, y0, x1, y1 = box(focus, focus['width'])
    cw, ch = (x1-x0)*2, (y1-y0)*2
    (out/'crops').mkdir(exist_ok=True)
    files = []
    for page in range(2):
        joined = Image.new('RGB', (cw*4, 2*(ch+24)), '#101713')
        draw = ImageDraw.Draw(joined)
        for row, source in enumerate([ia, ib]):
            for column in range(4):
                i = page*4+column
                tile = source.crop((i*w+x0, header+y0, i*w+x1, header+y1))
                # 補正なしの最近傍2倍。原画素を混ぜず、核・輪郭を見られる。
                joined.paste(tile.resize((cw, ch), Image.Resampling.NEAREST), (column*cw, row*(ch+24)+24))
                draw.text((column*cw+4, row*(ch+24)+5), f'{"OLD" if row == 0 else "NEW"} {i}/8 | {times[i]:.3f}ms | 2x', fill='white')
        file = 'crops/'+entry['name']+'-'+str(page)+'.png'
        joined.save(out/file); files.append(file)
    return dict(card=focus['id'], box=[x0, y0, x1, y1], scale=2, files=files)


def compare_ingame(old, new, out):
    a, b = capture(old), capture(new)
    if a is None or b is None:
        raise ValueError('旧・新ともcapture.jsonが必要です')
    if a.get('kind') != 'legacy-ingame' or a.get('baseline') != '5d9e1d2':
        raise ValueError('旧はlegacy_ingame.js（5d9e1d2）の撮影を指定してください')
    validate_reports(a, b)
    manifest = json.loads((Path(__file__).parent/'webp_manifest.json').read_text())
    target_names = {e['name'] for e in manifest['effects']}
    newer = {e['name']: e for e in b['effects']}
    validated = []
    for entry in a['effects']:
        name, other = entry['name'], newer[entry['name']]
        if name not in target_names:
            raise ValueError('新32種に無い効果: '+name)
        for item in [entry, other]:
            if 'baselineFile' not in item or 'geometry' not in item:
                raise ValueError(name+': VFXなしの盤面・カード座標が必要です。更新したcapture.jsで再撮影してください')
        if entry['geometry'] != other['geometry']:
            raise ValueError(name+': 旧・新の盤面・カード配置が違います')
        ia, ib = Image.open(safe_file(old, entry['file'])), Image.open(safe_file(new, other['file']))
        times, header, w, h = layout(ia, a, entry['file'])
        if (times, header, w, h) != layout(ib, b, other['file']) or ia.size != ib.size:
            raise ValueError(name+': 8コマの寸法が違います')
        duration = entry['durationMs']
        if not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
            raise ValueError(name+': 効果の尺が不正です')
        if a['frames'] != 8 or len(times) != 8 or any(not math.isfinite(t) or abs(t-duration*i/8) > 1e-5 for i, t in enumerate(times)):
            raise ValueError(name+': 全尺のi/8の8コマが必要です')
        for image in [ia, ib]:
            meta = json.loads(image.info.get('vfx_capture', '{}'))
            if (meta.get('frameWidth'), meta.get('frameHeight'), meta.get('headerHeight')) != (w, h, header) or meta.get('times') != times:
                raise ValueError(name+': PNGの撮影情報とcapture.jsonが違います')
        ba = Image.open(safe_file(old, entry['baselineFile'], True)).convert('RGB')
        bb = Image.open(safe_file(new, other['baselineFile'], True)).convert('RGB')
        if ba.size != (w, h) or bb.size != (w, h):
            raise ValueError(name+': VFXなしの盤面の寸法が違います')
        baseline_mae = float(np.abs(np.asarray(ba).astype(float)-np.asarray(bb)).mean())
        if baseline_mae > .25:
            raise ValueError(name+': VFXなしの盤面が違います（MAE='+str(baseline_mae)+'）')
        mask, card_area, ids = roi(entry['geometry'], entry, w, h)
        validated.append((entry, ia.convert('RGB'), ib.convert('RGB'), np.asarray(ba), np.asarray(bb), mask, card_area, ids, times, header, w, h, baseline_mae))
    if not validated:
        raise ValueError('撮影された効果がありません')
    out.mkdir(parents=True, exist_ok=True)
    rows, effects = [], []
    for entry, ia, ib, ba, bb, mask, card_area, ids, times, header, w, h, baseline_mae in validated:
        name = entry['name']
        joined = Image.new('RGB', (w*8, 2*(h+64)), '#101713')
        draw = ImageDraw.Draw(joined)
        label = entry['legacyRoute'].get('applicability', 'game-route')
        draw.text((8, 8), 'OLD '+name+' | 5d9e1d2 | '+entry['legacyRoute']['entry']+' | '+label, fill='white')
        draw.text((8, h+72), 'NEW '+name+' | same board / cards / times', fill='white')
        frames, old_masks, new_masks = [], [], []
        for i, ms in enumerate(times):
            old_frame = ia.crop((i*w, header, (i+1)*w, header+h))
            new_frame = ib.crop((i*w, header, (i+1)*w, header+h))
            for offset, frame in [(0, old_frame), (h+64, new_frame)]:
                draw.text((i*w+8, offset+42), f'{i}/8 | {ms:.3f}ms', fill='#dacfb9')
                joined.paste(frame, (i*w, offset+64))
            before, after = presence(np.asarray(old_frame), ba, mask, card_area), presence(np.asarray(new_frame), bb, mask, card_area)
            old_masks.append(change_mask(np.asarray(old_frame), ba, mask))
            new_masks.append(change_mask(np.asarray(new_frame), bb, mask))
            record = dict(name=name, frame=i, time_ms=ms, old=before, new=after,
                          area_ratio=ratio(after['changed_pixels'], before['changed_pixels']),
                          brightness_ratio=ratio(after['brightness_sum'], before['brightness_sum']),
                          core_ratio=ratio(after['core_top5_increment_mean'], before['core_top5_increment_mean']),
                          core_rendered_ratio=ratio(after['core_top5_mean'], before['core_top5_mean']),
                          mask_iou=mask_iou(old_masks[-1], new_masks[-1]))
            frames.append(record); rows.append(record)
        joined.save(out/(name+'.png'))
        peak = {}
        for metric, key in [('area', 'changed_pixels'), ('brightness', 'brightness_sum'),
                            ('core', 'core_top5_increment_mean'), ('core_rendered', 'core_top5_mean')]:
            oi = max(range(8), key=lambda i: frames[i]['old'][key])
            ni = max(range(8), key=lambda i: frames[i]['new'][key])
            ov, nv = frames[oi]['old'][key], frames[ni]['new'][key]
            peak[metric] = dict(old=ov, new=nv, old_frame=oi, new_frame=ni, ratio=ratio(nv, ov))
        for key in ['area', 'brightness']:
            oi, ni = peak[key]['old_frame'], peak[key]['new_frame']
            peak[key]['mask_iou'] = mask_iou(old_masks[oi], new_masks[ni])
        ratios = [peak[key]['ratio'] for key in ['area', 'brightness', 'core']]
        peak_iou = peak['brightness']['mask_iou']
        presence_status = 'UNMEASURABLE' if None in ratios[:2] else 'PRESENCE_RANGE_OK' if all(RANGE[0] <= r <= RANGE[1] for r in ratios[:2]) else 'ADJUST'
        status = 'UNMEASURABLE' if None in ratios or peak_iou is None else 'METRIC_GUIDE_OK' if all(RANGE[0] <= r <= RANGE[1] for r in ratios) and peak_iou >= IOU_MIN else 'ADJUST'
        crops = card_crops(entry, ia, ib, old_masks+new_masks, ids, out, times, header, w, h)
        effects.append(dict(name=name, file=name+'.png', legacy_route=entry['legacyRoute'],
                            roi_cards=ids, roi_pixels=int(mask.sum()), card_pixels=card_area,
                            baseline_mae=baseline_mae, peaks=peak, presence_status=presence_status,
                            status=status, visual_review='UNREVIEWED', card_crops=crops, frames=frames))
        print(name+': area '+text(ratios[0])+' / brightness '+text(ratios[1])+' / core '+text(ratios[2])+' / IoU '+text(peak_iou, 3)+' / '+status)
    report = dict(old=str(old), new=str(new), threshold=THRESHOLD, padding_card_widths=PADDING,
                  acceptable_peak_ratio=list(RANGE), core_top_fraction=CORE_FRACTION, peak_iou_min=IOU_MIN,
                  all_32_present={e['name'] for e in effects} == target_names,
                  visual_review='UNREVIEWED', effects=effects)
    (out/'ingame_compare.json').write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
    columns = ['name', 'frame', 'time_ms', 'area_ratio', 'brightness_ratio', 'core_ratio', 'core_rendered_ratio', 'mask_iou']
    metric_keys = list(rows[0]['old'])
    with (out/'frames.csv').open('w', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=columns+[side+'_'+key for side in ['old', 'new'] for key in metric_keys])
        writer.writeheader()
        for row in rows:
            writer.writerow({**{key: row[key] for key in columns}, **{side+'_'+key: value for side in ['old', 'new'] for key, value in row[side].items()}})
    lines = ['# ゲーム内の旧WebP／新定義の存在感', '',
             '上段＝旧、下段＝新。同じ盤面・カード・実時刻の全8コマ。画像の縮小・明るさ補正はしない。', '',
             'crops/にはカード周辺の旧／新を原画素の最近傍2倍で拡大した画像を2枚ずつ保存する（0〜3/8、4〜7/8）。指定カードの中で変化が最も多い1枚を選び、幅1枚分の余白を付けた固定矩形を全コマ・旧新に共用する。選択カードと切り出し座標はJSONのcard_cropsに記録。数値は拡大前の盤面で測る。', '',
             f'領域は発生元＋対象カードを各幅{PADDING:g}枚分だけ上下左右へ拡張した和集合。変化面積は各自のVFXなし盤面からRGBのいずれかが{THRESHOLD}段階以上変わった画素数。カード比%は元のカード矩形の和集合を分母にする（光が周囲へ広がれば100%を超える）。', '',
             '明るさ増分はΔY+=max(0,0.2126ΔR+0.7152ΔG+0.0722ΔB)の変化画素内合計（3段階未満の差は含めない）。RGBは0〜255のsRGB値。ROI平均・変化画素平均・暗くなる増分もJSON/CSVへ記録する。色相は正のRGB増分から彩度と輝度で加重した円平均（0=赤、60=黄、120=緑、180=水色、240=青、300=紫）。無彩色は—。', '',
             '核の明るさは、変化画素の輝度増分ΔY+の上位5%（個数の端数は切り上げ）の平均。元のカードの白い部分を核として借りないため、増分を主指標にする。描画後の輝度Yの上位5%平均も補助値として併記する。変化がないコマは両方0。', '',
             '形の重なりIoUは変化マスクの共通画素数／和集合画素数。旧・新それぞれの明るさ合計ピークのマスクを同じ盤面座標で比較し、移動・拡大・位置合わせはしない（面積ピーク同士のIoUもJSONに記録）。時刻のずれを隠さないよう、同じ時刻同士のIoUを各コマに出す。両方のマスクが空なら—、片側だけ空なら0。', '',
             '面積・明るさ合計・核それぞれの8コマ中の最大値の旧比が70〜130%、明るさピークのIoUが0.35以上ならMETRIC_GUIDE_OK。従来の面積・明るさ2項目の判定はpresence_statusにも残す。数値は目安で、形の目視合格ではない。旧ピークが0ならUNMEASURABLE。元WebPが主経路から既にLABへ置換済みの3種はreference-onlyと明記する。', '',
             '全32種が揃う: '+str(report['all_32_present'])+'。STATUS.txtは変更しない。', '',
             '| 効果 | 面積ピーク 旧px／新px（旧比） | 明るさピーク 旧／新（旧比） | 核ΔY+ピーク 旧／新（旧比） | ピークIoU | ピークコマ 面積・明るさ・核の旧/新 | 判定 |',
             '|---|---|---|---|---|---|---|']
    for effect in effects:
        ar, br, cr = (effect['peaks'][key] for key in ['area', 'brightness', 'core'])
        lines.append(f"| {effect['name']} | {ar['old']}／{ar['new']} ({text(ar['ratio']*100 if ar['ratio'] is not None else None)}%) | {text(br['old'])}／{text(br['new'])} ({text(br['ratio']*100 if br['ratio'] is not None else None)}%) | {text(cr['old'])}／{text(cr['new'])} ({text(cr['ratio']*100 if cr['ratio'] is not None else None)}%) | {text(br['mask_iou'], 3)} | {ar['old_frame']}/{ar['new_frame']}・{br['old_frame']}/{br['new_frame']}・{cr['old_frame']}/{cr['new_frame']} | {effect['status']} / UNREVIEWED |")
    for effect in effects:
        lines.extend(['', '## '+effect['name'], '',
                      '旧経路: '+effect['legacy_route']['entry']+' / '+effect['legacy_route'].get('applicability', 'game-route')+'. '+effect['legacy_route'].get('reason', ''), '',
                      '| コマ／ms | 面積 旧px／新px | カード比% 旧／新 | 面積旧比% | 明るさ増分 旧／新 | 明るさ旧比% | 核Y 旧／新（旧比%） | 核ΔY+ 旧／新（旧比%） | 同時刻IoU | 色相° 旧／新 |',
                      '|---|---|---|---|---|---|---|---|---|---|'])
        for r in effect['frames']:
            o, n = r['old'], r['new']
            lines.append(f"| {r['frame']}/8 / {r['time_ms']:.3f} | {o['changed_pixels']}／{n['changed_pixels']} | {text(o['area_pct_of_cards'])}／{text(n['area_pct_of_cards'])} | {text(r['area_ratio']*100 if r['area_ratio'] is not None else None)} | {text(o['brightness_sum'])}／{text(n['brightness_sum'])} | {text(r['brightness_ratio']*100 if r['brightness_ratio'] is not None else None)} | {text(o['core_top5_mean'])}／{text(n['core_top5_mean'])} ({text(r['core_rendered_ratio']*100 if r['core_rendered_ratio'] is not None else None)}) | {text(o['core_top5_increment_mean'])}／{text(n['core_top5_increment_mean'])} ({text(r['core_ratio']*100 if r['core_ratio'] is not None else None)}) | {text(r['mask_iou'], 3)} | {text(o['hue_deg'])}／{text(n['hue_deg'])} |")
    (out/'metrics.md').write_text('\n'.join(lines)+'\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key in ['old', 'new', 'out']:
        parser.add_argument('--'+key, required=True, type=Path)
    args = parser.parse_args()
    try:
        compare_ingame(args.old.resolve(), args.new.resolve(), args.out.resolve())
    except (ValueError, KeyError, FileNotFoundError) as exc:
        parser.exit(1, '比較失敗: '+str(exc)+'\n')


if __name__ == '__main__':
    main()
