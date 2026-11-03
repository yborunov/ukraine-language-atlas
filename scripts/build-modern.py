"""Convert geoBoundaries gbOpen UKR ADM1 simplified GeoJSON into regional SVG paths.
Usage: python scripts/build-modern.py input.geojson (requires Shapely 2.1+).
The derived boundary data is available under ODbL 1.0.
"""
import json
import sys
from pathlib import Path
from shapely import make_valid, maximum_inscribed_circle
from shapely.geometry import Point, shape

def xy(x, y):
    return round(32+(x-22)*43, 1), round(28+(52.5-y)*66, 1)

def polygons(g):
    if g.geom_type == 'Polygon':
        yield g
    elif hasattr(g, 'geoms'):
        for part in g.geoms:
            yield from polygons(part)

def path(p):
    return ''.join('M'+'L'.join(f'{x:g},{y:g}' for x,y in map(lambda q:xy(*q[:2]),ring.coords[:-1]))+'Z' for ring in (p.exterior,*p.interiors))

rows = {}
for f in json.loads(Path(sys.argv[1]).read_text())['features']:
    code = f['properties']['shapeISO'][-2:]
    g = make_valid(shape(f['geometry'])).simplify(.012,preserve_topology=True)
    parts = [p for p in polygons(g) if p.area > .0002]
    if code == '43':
        assert g.covers(Point(34.1,44.95))
    assert code not in rows
    point = maximum_inscribed_circle(max(parts,key=lambda p:p.area), tolerance=.02).coords[0]
    rows[code] = [''.join(map(path,parts)), *xy(*point)]
assert len(rows)==27 and {'30','40','43'} <= rows.keys()
Path('modern-boundaries.js').write_text('// Derived from geoBoundaries / OpenStreetMap contributors; ODbL 1.0. See README.\nwindow.modernBoundaries = '+json.dumps(rows, separators=(',',':'))+';\n')
