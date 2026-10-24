# -*- coding: utf-8 -*-
"""シートのカード番号を振り直した後、コード・素材・検査の番号を新しい番号へ揃える。

2026-10-24：各色5枚の追加で C001→C006 のように番号がずれ、召喚専用の7枚は CF001〜 へ移った。
絵・効果音・VFX/LAB の表・検査の多くがカード番号を鍵にしているので、名前で旧→新を対応づけて一括で書き換える。

使い方（prototype/ で）：
  python3 tools/update_local_xlsx_data.py card      # 先に新しいシートを取り込む
  python3 tools/renumber_cards.py                   # 旧＝HEAD の local_xlsx_data.js、新＝作業中のもの
  python3 tools/renumber_cards.py --old-ref <commit> --dry-run

書き換えるのは git 管理下の文字ファイル（*.md・*.svg・シート取り込み結果は除く。ADOPTED.md は表なので含める）。
SVG のパス命令（"C100 50"）と取り違えないよう、番号の直後が数字・空白・カンマ・ハイフン・「.数字」のものは触らない。
ファイル名の付け替え：git 管理下のパスに含まれる番号（絵・効果音・VFX撮影の基準など）。
"""
import argparse, csv, io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = 'js/data/local_xlsx_data.js'
HISTORY = 'tools/balance_sim/card_renumber_history.json'
CODE = re.compile(r'(?<![A-Za-z0-9])(C[F]?\d{3})(?![\d ,\-]|\.\d)')
# ADOPTED.md の表は「| C043 |」と番号の後ろに空白が来る（SVG のパスは無い）。
CODE_TABLE = re.compile(r'(?<![A-Za-z0-9])(C[F]?\d{3})(?!\d)')
SKIP_EXT = ('.md', '.svg', '.jpg', '.png', '.webp', '.wav', '.mp3', '.ogg', '.mp4', '.webm', '.xlsx', '.ttf', '.otf', '.woff', '.woff2', '.gif', '.ico', '.pdf')


def _cards(text):
    d = json.loads(text[text.index('{'):text.rindex('}') + 1])
    return [r for r in csv.DictReader(io.StringIO(d['card'])) if r.get('No.') and r.get('名前')]


def mapping(old_ref):
    old = _cards(subprocess.run(['git', 'show', f'{old_ref}:prototype/{DATA}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    new = _cards(open(os.path.join(ROOT, DATA), encoding='utf-8').read())
    by_new = {}
    for r in new:
        if r['名前'] in by_new:
            sys.exit(f'新しいシートで名前が重複：{r["名前"]}')
        by_new[r['名前']] = r['No.']
    nos = [r['No.'] for r in new]
    dup = sorted({n for n in nos if nos.count(n) > 1})
    if dup:
        sys.exit(f'新しいシートで番号が重複：{dup}')
    m = {}
    for r in old:
        n = by_new.get(r['名前'])
        if n is None:
            print(f'  注意：{r["No."]} {r["名前"]} が新しいシートに無い（書き換えない）')
        elif n != r['No.']:
            m[r['No.']] = n
    return m


def rewrite_text(m, dry):
    files = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\0')
    changed, refs = 0, 0
    for f in files:
        # *.md は記録なので触らない。ただし ADOPTED.md（LAB の採用SE表）は検査とSE素材の生成が読むデータ。
        if not f or f == DATA or (f.lower().endswith(SKIP_EXT) and not f.endswith('/ADOPTED.md')) or f.startswith('tools/renumber_cards') or f == HISTORY:
            continue
        p = os.path.join(ROOT, f)
        try:
            s = open(p, encoding='utf-8').read()
        except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError):
            continue
        n = [0]
        def sub(mo):
            to = m.get(mo.group(1))
            if to is None:
                return mo.group(0)
            n[0] += 1
            return to
        t = (CODE_TABLE if f.endswith('/ADOPTED.md') else CODE).sub(sub, s)
        if n[0]:
            changed += 1; refs += n[0]
            if not dry:
                open(p, 'w', encoding='utf-8').write(t)
    print(f'文字の書き換え：{changed} ファイル・{refs} か所')


def rename_files(m, dry):
    # パスの中の番号（assets/art/characters/C006.jpg、assets/sfx/C043.wav、vfx_capture/refs/C043/、ref_C043.jpg 等）を書き換える。
    files = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\0')
    moves = []
    for f in files:
        if not f:
            continue
        t = CODE.sub(lambda mo: m.get(mo.group(1), mo.group(0)), f)
        if t != f:
            moves.append((f, t))
    print(f'ファイル名の付け替え：{len(moves)} 件')
    if dry:
        return
    # 旧と新の名前が重なるので、いったん仮の名前へ逃がしてから付ける。
    for a, _ in moves:
        subprocess.run(['git', 'mv', a, a + '.renumber_tmp'], cwd=ROOT, check=True)
    for a, b in moves:
        os.makedirs(os.path.dirname(os.path.join(ROOT, b)), exist_ok=True)
        subprocess.run(['git', 'mv', a + '.renumber_tmp', b], cwd=ROOT, check=True)
    for a, _ in moves:
        d = os.path.dirname(os.path.join(ROOT, a))
        if os.path.isdir(d) and not os.listdir(d):
            os.rmdir(d)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--old-ref', default='HEAD')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--date', default=__import__('datetime').date.today().isoformat())
    ap.add_argument('--note', default='')
    a = ap.parse_args()
    m = mapping(a.old_ref)
    print(f'番号が変わったカード：{len(m)} 枚')
    if not m:
        return
    rewrite_text(m, a.dry_run)
    rename_files(m, a.dry_run)
    if not a.dry_run:
        # 検査が git show で読む前の版を今の番号へ読み替えるための履歴（tools/balance_sim/card_renumber.js が読む）。
        hp = os.path.join(ROOT, HISTORY)
        hist = json.load(open(hp, encoding='utf-8')) if os.path.exists(hp) else []
        ref = subprocess.run(['git', 'rev-parse', '--short', a.old_ref], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
        hist.append({'date': a.date, 'from': ref, 'note': a.note, 'map': m})
        json.dump(hist, open(hp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'履歴：{HISTORY} に追記')


if __name__ == '__main__':
    main()
