"""Build the atlas map from the Cliopatria v0.2.1 ZIP and Natural Earth Ukraine POV GeoJSON.
Usage: python scripts/build-history.py cliopatria.geojson.zip countries-ukr.geojson
Requires Shapely 2.1+. Run from the repository root.
"""
import json
import sys
from pathlib import Path
from zipfile import ZipFile

from shapely import make_valid, maximum_inscribed_circle
from shapely.geometry import Point, box, shape

VIEW = box(15, 41, 46, 60)
MIN_YEAR = 882
MODERN_YEAR = 2024
W, H = 960, 790


def xy(x, y):
    return (round((x - 15) / 31 * W, 1), round((60 - y) / 19 * H, 1))


def polygon_parts(g):
    if g.geom_type == 'Polygon':
        if not g.is_empty:
            yield g
    elif hasattr(g, 'geoms'):
        for part in g.geoms:
            yield from polygon_parts(part)


def path(g):
    return ''.join(
        'M' + 'L'.join(f'{x:g},{y:g}' for x, y in (xy(*q[:2]) for q in ring.coords[:-1])) + 'Z'
        for p in polygon_parts(g) for ring in [p.exterior, *p.interiors]
    )


def feature(name, start, end, g):
    if not g.intersects(VIEW):
        return None
    clipped = make_valid(g).intersection(VIEW).simplify(.022, preserve_topology=True)
    parts = [part for part in polygon_parts(clipped) if part.area > .003]
    if not parts:
        return None
    largest = max(parts, key=lambda part: part.area)
    center = maximum_inscribed_circle(largest, tolerance=.035).coords[0]
    return [name, start, end, ''.join(map(path, parts)), *xy(*center), round(sum(p.area for p in parts), 3)]


with ZipFile(sys.argv[1]) as archive:
    with archive.open(archive.namelist()[0]) as data:
        # The pinned release writes one GeoJSON feature per line.
        rows = []
        for line in data:
            if not line.startswith(b'{ "type": "Feature",'):
                continue
            f = json.loads(line.rstrip().rstrip(b','))
            p = f['properties']
            start, end = p['FromYear'], p['ToYear']
            if p['Type'] != 'POLITY' or p['Components'] or end < MIN_YEAR or start >= MODERN_YEAR:
                continue
            row = feature(p['Name'], start, min(end, MODERN_YEAR-1), shape(f['geometry']))
            if row:
                rows.append(row)

base = []
countries = json.loads(Path(sys.argv[2]).read_text())['features']
for f in countries:
    p = f['properties']
    g = shape(f['geometry'])
    row = feature(p['ADMIN'], MODERN_YEAR, None, g)
    if row:
        base.append(row)
        if p['ADM0_A3'] in ('UKR', 'RUS'):
            assert g.covers(Point(34.1, 44.95)) == (p['ADM0_A3'] == 'UKR')
        if p['ADM0_A3'] == 'UKR':
            ukraine = row[3]

assert rows and len(base) > 10 and ukraine
assert all(any(start <= y <= end for _,start,end,*_ in rows) for y in range(MIN_YEAR,MODERN_YEAR))
result = {'min': MIN_YEAR, 'modern': MODERN_YEAR, 'width': W, 'height': H,
          'history': rows, 'modernCountries': base, 'ukraine': ukraine, 'kyiv': xy(30.52, 50.45)}
Path('history-data.js').write_text('window.atlasData = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(rows), 'historical geometries;', len(base), 'modern countries')
print('\n'.join(sorted(set(r[0] for r in rows + base))))
