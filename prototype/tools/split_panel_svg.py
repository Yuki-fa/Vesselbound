#!/usr/bin/env python3
"""外部の一体型SVGを、9スライス外枠と原寸の見出し装飾へ一度だけ分離する。

例: python3 tools/split_panel_svg.py /path/to/panel.svg --name main_left
分離後は assets/ui/*_frame.svg と *_decoration.svg が正本。入力SVGの保持は不要。
--check は外部の入力SVGと分離後の素材が一致するかだけを調べる。
"""
import argparse
import copy
from pathlib import Path
import re
import xml.etree.ElementTree as ET

SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/ui'


def make_layers(input_path, name):
    source = ET.parse(input_path).getroot()
    if source.get('viewBox') != '0 0 1020 455':
        raise ValueError('元素材のサイズが変わりました。CSSのスライス寸法も確認してください。')
    group = source.find(".//{%s}g[@id='_x3C_グループ_x3E_']" % SVG)
    bar = next(node for node in group if 'decoration' in node.get('id', ''))
    backdrop = next(node for node in group if node.tag == '{%s}rect' % SVG)
    if backdrop.attrib != {'class': 'st0', 'width': '1020', 'height': '455'}:
        raise ValueError('背景の構造が変わりました。枠の一部を誤って消さないよう確認してください。')
    defs = source.find('{%s}defs' % SVG)
    rules = re.findall(r'([^{}]+)\{([^{}]+)\}', defs.find('{%s}style' % SVG).text)
    frame = copy.deepcopy(source)
    frame_group = frame.find(".//{%s}g[@id='_x3C_グループ_x3E_']" % SVG)
    for node in list(frame_group):
        if node.tag == '{%s}rect' % SVG or 'decoration' in node.get('id', ''):
            frame_group.remove(node)
    # decoration は元の座標のまま。表示先では1020×455の原寸を中央上に配置する。
    decoration = ET.Element('{%s}svg' % SVG, {'viewBox': source.get('viewBox')})
    used_classes = {c for node in bar.iter() for c in node.get('class', '').split()}
    style = ET.SubElement(ET.SubElement(decoration, '{%s}defs' % SVG), '{%s}style' % SVG)
    style.text = '\n'.join(selector.strip() + '{' + body.strip() + '}'
                           for selector, body in rules
                           if set(re.findall(r'\.([\w-]+)', selector)) & used_classes)
    if 'url(' in style.text:
        raise ValueError('装飾バーがグラデーションを参照するようになりました。defsの分離を確認してください。')
    decoration.append(copy.deepcopy(bar))
    for part, layer in [('frame', frame), ('decoration', decoration)]:
        # SVGのborder-image切り出し単位をCSS pxに一致させる。
        layer.set('width', '1020')
        layer.set('height', '455')
        data = ET.tostring(layer, encoding='unicode')
        note = ('9-slice frame: source/display slice 85px; edit this asset directly.' if part == 'frame'
                else 'Title decoration: display at 1020x455, top center; edit this asset directly.')
        yield name + '_' + part + '.svg', '<!-- ' + note + ' -->\n' + data + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='分離する一体型SVG（実行時のみ必要）')
    parser.add_argument('--name', choices=['main_left', 'main_right'], required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for name, data in make_layers(args.source, args.name):
        path = OUTPUT / name
        if args.check:
            if not path.exists() or path.read_text() != data:
                raise SystemExit('再生成が必要: ' + str(path))
        else:
            OUTPUT.mkdir(exist_ok=True)
            path.write_text(data)
        print(('OK ' if args.check else 'Generated ') + name)
