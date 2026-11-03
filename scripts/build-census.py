"""Build language counts from the official 2001 regional census PDF.
Run pdftotext -layout cens2001.pdf census.txt, then python scripts/build-census.py census.txt.
Source: https://2001.ukrcensus.gov.ua/i/u/cens2001.pdf
"""
import json
import re
import sys
from pathlib import Path

CODES = '43 05 07 12 14 18 21 23 26 32 35 09 46 48 51 53 56 59 61 63 65 68 71 77 74 30 40'.split()
FIELDS = [
    'uk ru be bg',
    'hy gg ct mo de',
    'pl rm ro sk hu',
    'ka jw el other unstated',
]
pages = Path(sys.argv[1]).read_text().split('\f')
data = {}
names = None
for i, fields in enumerate(FIELDS):
    rows = []
    for line in pages[i].splitlines():
        m = re.fullmatch(r'\s*(.+?)\s{2,}([\d-]+(?:\s+[\d,-]+)+)\s*', line)
        if m and len(m[2].split()) == (9 if i == 0 else 10) and m[1] != 'А' and not m[1].isdigit():
            rows.append((m[1], m[2].split()))
    assert len(rows) == 28 and rows[0][0] == 'Україна', [r[0] for r in rows]
    if names is None:
        names = [r[0] for r in rows]
    assert [r[0] for r in rows] == names
    for code, (_, cells) in zip(['UA', *CODES], rows):
        if i == 0:
            data[code] = {'total': int(cells.pop(0))}
        counts = [int(n) if n != '-' else 0 for n in cells[::2]]
        data[code].update(zip(fields.split(), counts))

assert data['UA']['total'] == 48240902 and data['43']['ct'] == 229311
for code, row in data.items():
    assert sum(v for k,v in row.items() if k != 'total') == row['total'], (code,row)
for k,v in data['UA'].items():
    assert sum(data[c][k] for c in CODES) == v, k
Path('modern-census.js').write_text('// Official 2001 Ukrainian census: reported native language, counts.\nwindow.modernCensus = '+json.dumps(data,separators=(',',':'))+';\n')
