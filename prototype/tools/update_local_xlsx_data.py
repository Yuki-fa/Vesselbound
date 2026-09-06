#!/usr/bin/env python3
"""Vesselbound_data.xlsx の一部シートを js/data/local_xlsx_data.js へ焼き直す。

local_xlsx_data.js は file:// で開いた時（fetchでxlsxを読めない時）に使う内蔵CSV。
シートを編集したら該当キーだけを更新する。既存キーの数値表記（"1.0" など）を
壊さないよう、指定したキーのみ差し替える。

  python3 tools/update_local_xlsx_data.py textMessage region
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
RNS = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'js' / 'data' / 'local_xlsx_data.js'

# local_xlsx_data.js のキー → xlsx のシート名（loader.js の _XLSX_SHEETS と同じ）
SHEET_BY_KEY = {
    'floor': ['階層データ', '計算式', '資料'],
    'grade': ['グレードアップ'],
    'char': ['NPC', 'プレイヤー'],
    'enemy': ['敵'],
    'keyword': ['キーワード'],
    'card': ['キャラクター', 'カード'],
    'enchant': ['エンチャント', '強化'],
    'spell': ['魔法'],
    'item': ['アイテム', 'Item'],
    'ring': ['指輪'],
    'mapPanelPower': ['魔導板強化'],
    'deepLevel': ['深層レベル', '階層グレード'],
    'specialFx': ['特殊演出'],
    'region': ['地域情報'],
    'textMessage': ['テキストメッセージ'],
}


def find_xlsx():
    for p in sorted(ROOT.glob('Vesselbound_data*.xlsx')):
        return p
    raise SystemExit('Vesselbound_data*.xlsx が見つかりません')


def col_index(ref):
    letters = re.match(r'([A-Z]+)', ref or 'A').group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def sheet_rows(zf, name):
    shared = []
    try:
        sst = ET.fromstring(zf.read('xl/sharedStrings.xml'))
        for si in sst.iter(NS + 'si'):
            shared.append(''.join(t.text or '' for t in si.iter(NS + 't')))
    except KeyError:
        pass
    rels = {e.get('Id'): e.get('Target') for e in ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))}
    wb = ET.fromstring(zf.read('xl/workbook.xml'))
    target = None
    for s in wb.iter(NS + 'sheet'):
        if s.get('name') == name:
            target = rels[s.get(RNS + 'id')]
    if target is None:
        return None
    path = 'xl/' + target.lstrip('/').replace('xl/', '', 1)
    sh = ET.fromstring(zf.read(path))
    rows = []
    for row in sh.iter(NS + 'row'):
        cells = {}
        for c in row.iter(NS + 'c'):
            v = c.find(NS + 'v')
            if v is None:
                isx = c.find(NS + 'is')
                text = ''.join(x.text or '' for x in isx.iter(NS + 't')) if isx is not None else ''
            elif c.get('t') == 's':
                text = shared[int(v.text)]
            else:
                text = v.text or ''
                # 12.0 → 12（SheetJSのsheet_to_csvと同じ見え方にする）
                if re.fullmatch(r'-?\d+\.0+', text):
                    text = text.split('.')[0]
            cells[col_index(c.get('r') or 'A')] = text
        rows.append(cells)
    return rows


def to_csv(rows):
    width = 0
    for cells in rows:
        if cells:
            width = max(width, max(cells) + 1)
    out = []
    for cells in rows:
        vals = []
        for i in range(width):
            v = cells.get(i, '')
            if any(ch in v for ch in ',"\n\r'):
                v = '"' + v.replace('"', '""') + '"'
            vals.append(v)
        while vals and vals[-1] == '':
            vals.pop()
        out.append(','.join(vals))
    while out and out[-1] == '':
        out.pop()
    return '\n'.join(out) + '\n'


def main():
    keys = sys.argv[1:] or ['textMessage', 'region']
    xlsx = find_xlsx()
    src = TARGET.read_text(encoding='utf-8')
    data = json.loads(src[src.index('{'):src.rindex('}') + 1])
    with zipfile.ZipFile(xlsx) as zf:
        for key in keys:
            names = SHEET_BY_KEY.get(key)
            if not names:
                raise SystemExit('未知のキー: ' + key)
            rows = None
            for n in names:
                rows = sheet_rows(zf, n)
                if rows is not None:
                    break
            if rows is None:
                raise SystemExit('シートが見つかりません: ' + ' / '.join(names))
            data[key] = to_csv(rows)
            print(f'{key}: {len(data[key])} chars ({xlsx.name})')
    TARGET.write_text(
        'window.VESSELBOUND_LOCAL_XLSX_CSV = '
        + json.dumps(data, ensure_ascii=False)
        + ';\n',
        encoding='utf-8',
    )


if __name__ == '__main__':
    main()
