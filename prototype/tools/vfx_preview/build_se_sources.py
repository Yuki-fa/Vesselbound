#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ゲームのSEファイル（assets/sfx/*.wav）と元ファイル名の対応表 se_sources.js を作る（2026-10-20 利用者指定）。

出どころ：
  1. シート「アセットリスト」の SFX 節（ファイル名・元ファイル・備考）
  2. tools/vfx_preview/se/ADOPTED.md（LABで採用して assets/sfx へ置いた音。シートより新しいので優先）
LAB の「SE候補」タブで、以前から決まっていたSEも元ファイル名を表示するために使う。
シートか ADOPTED.md を更新したら、もう一度実行する：
  python3 tools/vfx_preview/build_se_sources.py
"""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XLSX = ROOT / 'Vesselbound_data.xlsx'
ADOPTED = ROOT / 'tools/vfx_preview/se/ADOPTED.md'
OUT = ROOT / 'tools/vfx_preview/se_sources.js'
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RNS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def asset_list_rows():
    z = zipfile.ZipFile(XLSX)
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheet = next(s for s in wb.iter(NS + 'sheet') if s.get('name') == 'アセットリスト')
    target = rels[sheet.get(RNS)].replace('/xl/', '').lstrip('/')
    shared = [''.join(t.text or '' for t in si.iter(NS + 't'))
              for si in ET.fromstring(z.read('xl/sharedStrings.xml')).iter(NS + 'si')]
    section = None
    for row in ET.fromstring(z.read('xl/' + target)).iter(NS + 'row'):
        cells = {}
        for c in row.iter(NS + 'c'):
            col = ''.join(ch for ch in c.get('r') if ch.isalpha())
            v = c.find(NS + 'v')
            if c.get('t') == 's' and v is not None:
                cells[col] = shared[int(v.text)]
            elif v is not None:
                cells[col] = v.text
            else:
                cells[col] = ''.join(t.text or '' for t in c.iter(NS + 't'))
        a, b, note = (cells.get(k, '').strip() for k in 'ABC')
        if a and not b and not note:
            section = a
            continue
        if a == 'ファイル名' or not a:
            continue
        yield section, a, b, note


RENAMED_1022 = {'E042_1': 'C019_1', 'E042_2': 'C019_2', 'E083': 'C020', 'E043': 'C021', 'E031': 'C064', 'E056': 'C042',
                'E024': 'C084', 'E082': 'C096', 'C040': 'C039', 'C082': 'C099', 'C099': 'C082'}


def main():
    table = {}
    last_note = last_source = ''
    for section, name, source, note in asset_list_rows():
        if section != 'SFX':
            continue
        # シートの「同上」は上の行と同じ意味。表示では元の語に置き換える。
        note = last_note if note == '同上' else note
        source = last_source if source == '同上' else source
        last_note, last_source = note, source
        table[name] = {'source': source, 'note': note, 'basis': 'アセットリスト'}
    provisional = False
    for line in ADOPTED.read_text().splitlines():
        if line.startswith('## '):
            provisional = '仮' in line
        cells = [c.strip() for c in line.split('|')]
        if len(cells) < 6 or not re.match(r'^[A-Za-z]+[\w:]*$', cells[1]) or cells[1] == '番号':
            continue
        code = cells[1]
        if ':' in code:  # map:duplicate など、ファイル名に直接ならないものは演出名で引く
            continue
        table[code + '.wav'] = {'source': Path(cells[3]).name, 'path': cells[3], 'effect': cells[2],
                                'basis': 'ADOPTED.md（仮）' if provisional else 'ADOPTED.md'}
    # 2026-10-22 シート改訂：効果が別の番号へ移ったので、SE のファイル名も新しい番号へ付け替えた（新 ← 旧）。
    # シートのアセットリスト・ADOPTED.md は旧い名前のままなので、ここで読み替える（入れ替えた C082／C099 も同時に）。
    snapshot = dict(table)
    for now, was in RENAMED_1022.items():
        if was + '.wav' in snapshot:
            table[now + '.wav'] = {**snapshot[was + '.wav'], 'note': (snapshot[was + '.wav'].get('note') or '') + f'（2026-10-22 {was}.wav から改名）'}
            if was not in RENAMED_1022:
                table.pop(was + '.wav', None)
    OUT.write_text('/* build_se_sources.py が生成：ゲームのSEファイル → 元ファイル名（アセットリスト・ADOPTED.md）。手で編集しない。 */\n'
                   'var VbFxSeSources = ' + json.dumps(table, ensure_ascii=False, indent=1) + ';\n')
    print(f'{len(table)}件 → {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
