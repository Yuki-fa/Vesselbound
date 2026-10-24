#!/usr/bin/env python3
"""ingame_compareの既知画素・同じ盤面の条件・欠落を検査する（実画面ではない）。"""
import copy
import json
import math
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from compare import strip
from ingame_compare import compare_ingame, presence, roi, mask_iou, card_crops


def main(root):
    geometry = dict(stage=dict(x=0, y=0, width=128, height=96, scale=1), cards=[
        dict(id='source', no='C056', left=36, top=26, width=16, height=24),
        dict(id='target', no='C023', left=68, top=26, width=16, height=24)],
        source='source', targets=['target'])
    entry = dict(source='source', targets=['target'])
    mask, card_area, identities = roi(geometry, entry, 128, 96)
    assert identities == ['source', 'target'] and card_area == 768 and int(mask.sum()) == 4480
    # RGBの差から独立に求められる面積・輝度・色相。領域外の光は数えない。
    base = np.full((96, 128, 3), 20, dtype=np.uint8)
    rgb = base.copy(); rgb[30:32, 40:42] += np.array([100, 0, 0], dtype=np.uint8); rgb[0, 0] = 255
    measured = presence(rgb, base, mask, card_area)
    assert measured['changed_pixels'] == 4 and abs(measured['brightness_sum']-85.04) < 1e-8
    assert measured['hue_deg'] == 0 and math.isclose(measured['area_pct_of_cards'], 4/768*100)
    assert math.isclose(measured['core_top5_mean'], 41.26)
    assert math.isclose(measured['core_top5_increment_mean'], 21.26)
    # 21画素の上位5%は2画素。合計が同じでも局所的な核を区別する。
    concentrated = base.copy(); concentrated[30, 40:61] = 40
    concentrated[30, 40:42] = [200, 100, 20]
    v = presence(concentrated, base, mask, card_area)
    assert math.isclose(v['core_top5_mean'], 115.484)
    assert math.isclose(v['core_top5_increment_mean'], 95.484)
    empty = presence(base, base, mask, card_area)
    assert empty['core_top5_mean'] == empty['core_top5_increment_mean'] == 0
    # 位置合わせで隠さないIoU。4画素の形を1列移動すれば共通2／和集合6。
    ma = np.zeros((4, 6), dtype=bool); ma[1:3, 1:3] = True
    mb = np.zeros_like(ma); mb[1:3, 2:4] = True
    assert mask_iou(ma, mb) == 1/3 and mask_iou(ma, ma) == 1
    mb[:] = False
    assert mask_iou(ma, mb) == 0 and mask_iou(mb, mb) is None
    for delta, hue in [([0, 100, 0], 120), ([0, 0, 100], 240), ([100, 100, 0], 60), ([0, 100, 100], 180), ([100, 100, 100], None)]:
        colored = base.copy(); colored[30:32, 40:42] += np.array(delta, dtype=np.uint8)
        actual = presence(colored, base, mask, card_area)['hue_deg']
        assert actual is None if hue is None else math.isclose(actual, hue, abs_tol=1e-8)
    subtle = base.copy(); subtle[30:32, 40:42] += 2
    assert presence(subtle, base, mask, card_area)['brightness_sum'] == 0
    darker = base.copy(); darker[30:32, 40:42] -= 10
    # 暗い煙を正の明るさ増分として数えない。
    value = presence(darker, base, mask, card_area)
    assert value['changed_pixels'] == 4 and value['brightness_sum'] == 0 and math.isclose(value['darkening_sum'], 40)
    assert value['core_top5_increment_mean'] == 0 and math.isclose(value['core_top5_mean'], 10)
    outside = copy.deepcopy(geometry); outside['cards'][0]['left'] = -1000; outside['cards'][1]['top'] = 1000
    try:
        roi(outside, entry, 128, 96)
    except ValueError as exc:
        assert '空' in str(exc)
    else:
        raise AssertionError('盤面外のカードを末尾へ巻き込まない')
    manifest = json.loads((Path(__file__).parent/'webp_manifest.json').read_text())
    old, new, out = root/'old-ingame', root/'new-ingame', root/'cmp-ingame'
    records = []
    for folder, legacy in [(old, True), (new, False)]:
        (folder/'baselines').mkdir(parents=True)
        baseline = Image.new('RGB', (128, 96), (20, 30, 40))
        for effect in manifest['effects']:
            name = effect['name']; duration = effect['playbackMs']; times = [duration*i/8 for i in range(8)]
            files = []
            for index in range(8):
                image = baseline.copy()
                increment = ({1: 40, 2: 80} if legacy else {2: 30, 3: 60}).get(index, 0)
                for y in range(30, 34):
                    for x in range(40, 44):
                        image.putpixel((x, y), (20+increment, 30+increment, 40+increment))
                image.putpixel((0, 0), (255, 255, 255))
                file = root/f'{legacy}-{index}.png'; image.save(file); files.append(file)
            strip(folder/(name+'.png'), times, files); baseline.save(folder/'baselines'/(name+'.png'))
            if legacy:
                records.append(dict(name=name, file=name+'.png', baselineFile='baselines/'+name+'.png',
                                    geometry=geometry, source='source', targets=['target'], durationMs=duration,
                                    impactMs=[duration/2], times=times, legacyAsset=effect['asset'],
                                    legacyRoute=dict(entry='playHitVfxAtRect', kind='hit')))
    before = dict(seed=53, speed=1.5, value=1, frames=8, status='captured', kind='legacy-ingame', baseline='5d9e1d2', effects=records)
    after = {key: copy.deepcopy(value) for key, value in before.items() if key not in ['kind', 'baseline']}

    def write(a, b):
        (old/'capture.json').write_text(json.dumps(a)); (new/'capture.json').write_text(json.dumps(b))

    write(before, after)
    report = compare_ingame(old, new, out)
    assert report['all_32_present'] and report['visual_review'] == 'UNREVIEWED' and len(report['effects']) == 32
    for result in report['effects']:
        assert result['status'] == 'METRIC_GUIDE_OK' and result['presence_status'] == 'PRESENCE_RANGE_OK' and result['visual_review'] == 'UNREVIEWED'
        assert result['peaks']['area']['old'] == result['peaks']['area']['new'] == 16
        assert result['peaks']['area']['ratio'] == 1
        assert math.isclose(result['peaks']['brightness']['ratio'], .75)
        assert result['peaks']['brightness']['old_frame'] == 2 and result['peaks']['brightness']['new_frame'] == 3
        assert result['peaks']['brightness']['mask_iou'] == result['peaks']['area']['mask_iou'] == 1
        assert math.isclose(result['peaks']['core_rendered']['ratio'], (60+28.596)/(80+28.596))
        assert math.isclose(result['peaks']['core']['ratio'], .75)
        assert result['frames'][2]['mask_iou'] == 1 and result['frames'][3]['mask_iou'] == 0
        assert result['frames'][0]['mask_iou'] is None
        frame = Image.open(out/result['file']); assert frame.size == (1024, 320)
        assert frame.getpixel((2*128+40, 64+30)) == (100, 110, 120)
        assert frame.getpixel((3*128+40, 224+30)) == (80, 90, 100)
        crop = result['card_crops']
        assert crop['card'] == 'source' and crop['box'] == [20, 10, 68, 66] and crop['scale'] == 2
        for file in crop['files']:
            assert Image.open(out/file).size == (384, 272)
        enlarged = Image.open(out/crop['files'][0])
        assert enlarged.getpixel((2*96+40, 24+40)) == (100, 110, 120)
        assert enlarged.getpixel((2*96+41, 24+41)) == (100, 110, 120), '原画素を補間せず2倍にする'
    assert len((out/'frames.csv').read_text().splitlines()) == 1+32*8
    assert '75.00%' in (out/'metrics.md').read_text()
    assert '核ΔY+ピーク' in (out/'metrics.md').read_text() and '同時刻IoU' in (out/'metrics.md').read_text()
    # 発生元が盤面外で効果も空でも、見える対象カードの拡大画像は出せる。
    crop_entry = copy.deepcopy(records[0]); crop_entry['geometry']['cards'][0]['left'] = -1000
    blank = Image.new('RGB', (1024, 120))
    clipped = card_crops(crop_entry, blank, blank, [np.zeros((96, 128), dtype=bool)],
                         ['source', 'target'], out, records[0]['times'], 24, 128, 96)
    assert clipped['card'] == 'target' and clipped['box'] == [52, 10, 100, 66]
    tests = [
        ('seed', lambda a, b: b.update(seed=1), '撮影条件'),
        ('failed', lambda a, b: a.update(status='failed'), '撮影が完了'),
        ('baseline', lambda a, b: a.update(baseline='fd294ee'), '5d9e1d2'),
        ('missing-effect', lambda a, b: b['effects'].pop(), '効果一覧'),
        ('duplicate', lambda a, b: a['effects'].append(a['effects'][0]), '重複'),
        ('placement', lambda a, b: b['effects'][0]['geometry']['cards'][0].update(left=37), 'カード配置'),
        ('missing-baseline', lambda a, b: b['effects'][0].pop('baselineFile'), '再撮影'),
        ('times', lambda a, b: b['effects'][0]['times'].__setitem__(1, 123), '撮影記録'),
        ('outside-folder', lambda a, b: [d['effects'][0].update(baselineFile='../no.png') for d in [a, b]], 'フォルダ外'),
        ('duration', lambda a, b: [d['effects'][0].update(durationMs=0) for d in [a, b]], '尺が不正'),
        ('not-i-8', lambda a, b: [d['effects'][0]['times'].__setitem__(1, 123) for d in [a, b]], 'i/8'),
        ('png-metadata', lambda a, b: [d['effects'][0].update(durationMs=888, times=[888*i/8 for i in range(8)]) for d in [a, b]], 'PNGの撮影情報')]
    for label, mutate, expected in tests:
        a, b = copy.deepcopy(before), copy.deepcopy(after); mutate(a, b); write(a, b)
        bad = root/('bad-'+label)
        try:
            compare_ingame(old, new, bad)
        except ValueError as exc:
            assert expected in str(exc), (label, exc)
        else:
            raise AssertionError('不正な入力を受け入れた: '+label)
        assert not bad.exists(), '不正入力から比較画像・数値を作らない'
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    a['effects'] = a['effects'][:1]; b['effects'] = b['effects'][:1]; write(a, b)
    name = records[0]['name']
    # 面積・合計が通っても、位置が離れた形は新しいIoUの目安で落とす。
    moved = []
    for i in range(8):
        image = Image.open(new/'baselines'/(name+'.png')).convert('RGB')
        if i == 3:
            for y in range(30, 34):
                for x in range(60, 64):
                    image.putpixel((x, y), (80, 90, 100))
        file = root/f'moved-{i}.png'; image.save(file); moved.append(file)
    strip(new/(name+'.png'), records[0]['times'], moved)
    moved_report = compare_ingame(old, new, root/'wrong-location')['effects'][0]
    assert moved_report['presence_status'] == 'PRESENCE_RANGE_OK' and moved_report['status'] == 'ADJUST'
    assert moved_report['peaks']['brightness']['mask_iou'] == 0
    # 同じ合計・面積でも、明るい2画素の核が一様な16画素へ薄まったら落とす。
    focused, flat = [], []
    for side, output in [(old, focused), (new, flat)]:
        for i in range(8):
            image = Image.open(side/'baselines'/(name+'.png')).convert('RGB')
            if i == 3:
                for y in range(30, 34):
                    for x in range(40, 44):
                        amount = 120 if side == old and y == 30 and x < 42 else 24 if side == new else 10
                        image.putpixel((x, y), (20+amount, 30+amount, 40+amount))
            file = root/f'core-{side.name}-{i}.png'; image.save(file); output.append(file)
        strip(side/(name+'.png'), records[0]['times'], output)
    flat_report = compare_ingame(old, new, root/'missing-core')['effects'][0]
    assert flat_report['presence_status'] == 'PRESENCE_RANGE_OK' and flat_report['status'] == 'ADJUST'
    assert flat_report['peaks']['brightness']['mask_iou'] == 1
    assert math.isclose(flat_report['peaks']['core']['ratio'], .2)
    # 元が全コマ基準盤面と同じなら、0を分母に合格させない。
    files = [old/'baselines'/(name+'.png')]*8; strip(old/(name+'.png'), records[0]['times'], files)
    single = compare_ingame(old, new, root/'no-old-presence')
    assert not single['all_32_present'] and single['effects'][0]['status'] == 'UNMEASURABLE'
    # 基準盤面そのものの取り違えは、効果の差へ算入しない。
    Image.new('RGB', (128, 96), (50, 30, 40)).save(new/'baselines'/(name+'.png'))
    try:
        compare_ingame(old, new, root/'different-board')
    except ValueError as exc:
        assert 'VFXなしの盤面が違' in str(exc)
    else:
        raise AssertionError('盤面が異なる入力を受け入れた')
    print('ゲーム内比較の既知画素・32効果・不正入力拒否 OK')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
