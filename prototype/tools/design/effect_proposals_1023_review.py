# -*- coding: utf-8 -*-
# Astra の効果案（EFFECT_PROPOSALS_1023.md）を Claude が独自に検証する。
import re, json, csv, io, difflib, statistics, collections
import sys, os
MD = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'EFFECT_PROPOSALS_1023.md')
DATA = __import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '../../js/data/local_xlsx_data.js')
s = open(DATA, encoding='utf-8').read(); d = json.loads(s[s.index('{'):s.rindex('}') + 1])
cards = list(csv.DictReader(io.StringIO(d['card']))); enchants = list(csv.DictReader(io.StringIO(d['enchant'])))
kws = [r['名前'] for r in csv.DictReader(io.StringIO(d['keyword'])) if r.get('名前')]
existing_names = {r['名前'] for r in cards + enchants if r.get('名前')}
existing_texts = [(r['No.'], r['名前'], (r.get('効果') or '').strip()) for r in cards + enchants if (r.get('効果') or '').strip()]

rows = []; section = None
for line in open(MD, encoding='utf-8'):
    if line.startswith('## '): section = line.strip('# \n')
    if not line.startswith('| ') or line.startswith('| ID') or line.startswith('| ---'): continue
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    if not re.fullmatch(r'[RBGYPE]\d{2}', cells[0]): continue
    rows.append({'id': cells[0], 'name': cells[1], 'rar': cells[2], 'stats': cells[3], 'kw': cells[4], 'text': cells[5], 'up': cells[6], 'section': section, 'impl': cells[-1]})
print('案の数', len(rows), collections.Counter(r['id'][0] for r in rows))

TRIG = r'(?:(?:攻撃|負傷|死亡)(?:[＆&](?:攻撃|負傷|死亡))*|開戦|終戦|解放|常時|起動|\d+マナ毎?)'
issues = collections.defaultdict(list)
norm = lambda t: re.sub(r'[0-9０-９X]+', 'N', t)
for r in rows:
    for key in ('text', 'up'):
        t = r[key]
        sentences = [x for x in re.split(r'(?<=。)', t) if x.strip()]
        if not re.match(TRIG + r'[：:]', t): issues['トリガで始まらない'].append(f"{r['id']} {key}: {t[:40]}")
        if re.search(r'結界\d', t): issues['結界に数（結界は1つまで）'].append(f"{r['id']} {key}: {t[:50]}")
        for q in re.findall(r'「([^」]+)」', t):
            if q not in existing_names and q not in kws and not re.search(r'[：:]', q): issues['「」内が既存のカード・キーワードに無い'].append(f"{r['id']} {key}: 「{q}」")
    # 強化：数値が増えているか（回数・上限の数は除く）
    a = [int(x) for x in re.findall(r'(?<![回体段])(\d+)(?![回体])', re.sub(r'\d+回まで|\d+戦闘|\d+マナ毎?[：:]|\d+体', '', r['text']))]
    b = [int(x) for x in re.findall(r'(?<![回体段])(\d+)(?![回体])', re.sub(r'\d+回まで|\d+戦闘|\d+マナ毎?[：:]|\d+体', '', r['up']))]
    if r['text'] == r['up']: issues['強化効果が通常と同じ'].append(r['id'])
    elif a and b and len(a) == len(b) and sum(b) < sum(a): issues['強化で数値が下がる'].append(f"{r['id']} {a}->{b}")
    if r['name'] in existing_names: issues['仮称が既存カード名と同じ'].append(f"{r['id']} {r['name']}")

# 既存との近さ（数字を伏せて比較）
for r in rows:
    best = max(((difflib.SequenceMatcher(None, norm(r['text']), norm(t)).ratio(), no, nm, t) for no, nm, t in existing_texts), key=lambda x: x[0])
    if best[0] >= .75: issues['既存とよく似ている（数字を伏せて75%以上）'].append(f"{r['id']} {r['text'][:36]} ≒ {best[1]} {best[2]}: {best[3][:36]} ({best[0]:.2f})")
# 案同士の近さ
for i, r in enumerate(rows):
    for q in rows[i + 1:]:
        ratio = difflib.SequenceMatcher(None, norm(r['text']), norm(q['text'])).ratio()
        if ratio >= .8: issues['案同士がよく似ている（80%以上）'].append(f"{r['id']}≒{q['id']} ({ratio:.2f}) {r['text'][:30]} / {q['text'][:30]}")
# 名前の重複
names = collections.Counter(r['name'] for r in rows)
for n, c in names.items():
    if c > 1: issues['仮称が案の中で重複'].append(n)

# 数値：レアリティごとの ATK+HP（既存キャラの中央値と比べる）
by_rar = collections.defaultdict(list)
for c in cards:
    try:
        if str(c.get('実装', '')).lower() != 'true': continue
        by_rar[int(c['レアリティ'])].append(int(c['パワー']) + int(c['ライフ']))
    except Exception: pass
med = {k: statistics.median(v) for k, v in by_rar.items() if v}
print('既存キャラの ATK+HP 中央値', {k: (med[k], len(by_rar[k])) for k in sorted(med)})
for r in rows:
    m = re.match(r'(\d+)/(\d+)', r['stats'])
    if not m: continue
    tot = int(m[1]) + int(m[2]); rar = int(re.sub(r'\D', '', r['rar']) or 0)
    if rar in med and (tot < med[rar] * .7 or tot > med[rar] * 1.3): issues['ATK+HP がレアリティの中央値から±30%外'].append(f"{r['id']} R{rar} {r['stats']}（中央値 {med[rar]}）")

impl = collections.Counter('既存構文' if r['impl'].startswith('既存構文') else '新処理' for r in rows)
print('実装見込み', impl)
limits = sum(1 for r in rows if re.search(r'\d+回まで', r['text']))
print('「1戦闘にN回まで」を使う案', limits, '/', len(rows))
capish = [r['id'] for r in rows if re.search(r'回まで|初めて|まだこの効果を受けていない|1戦闘に', r['text'] + r['up'])]
print('回数制限の言い回し（回まで・初めて・まだ受けていない）', len(capish), capish[:20])
shape = [r['id'] for r in rows if re.search(r'ランダムな(?:[赤青緑黄紫]の)?味方1体は(?:HP|ATK)?\+', r['text'])]
print('「ランダムな味方1体に能力」型', len(shape))
trig = collections.Counter(re.match(TRIG, r['text']).group(0) if re.match(TRIG, r['text']) else '?' for r in rows)
print('トリガの内訳', dict(trig.most_common()))
for k, v in issues.items():
    print(f'\n## {k}（{len(v)}件）'); [print('  ' + x) for x in v[:40]]
