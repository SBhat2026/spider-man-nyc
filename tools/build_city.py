#!/usr/bin/env python3
"""Build the Midtown → Central Park world from raw Overpass dumps.

Bakes in the data-quality filters we derived from the road scan:
  * drop h<1 "buildings" (invisible junk)
  * drop footprints that ENCLOSE other buildings  (OSM complex/plaza outlines)
  * drop footprints with >=6 distinct streets through them (plaza outlines)
Those three rules recovered ~3.4km of buried road.

Usage: python3 tools/build_city.py <rawdir> <outfile>
"""
import json, math, sys

BBOX = (40.7435, -73.9950, 40.7880, -73.9480)   # s, w, n, e
LAT0 = (BBOX[0] + BBOX[2]) / 2
LON0 = (BBOX[1] + BBOX[3]) / 2
R = 6371000.0
COSLAT = math.cos(math.radians(LAT0))

# Central Park is a rectangle locked to the avenue grid (59th–110th, 5th Ave–CPW).
# Fetching the relation kept getting rate-limited, so use its real corners.
CENTRAL_PARK = [
    (40.7681, -73.9819),   # SW  59th & Central Park West
    (40.7644, -73.9732),   # SE  59th & 5th Ave
    (40.7968, -73.9495),   # NE  110th & 5th Ave
    (40.8005, -73.9582),   # NW  110th & CPW
]

def proj(lat, lon):
    return (math.radians(lon - LON0) * R * COSLAT,
            -math.radians(lat - LAT0) * R)

def poly_area(pts):
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, z1 = pts[i]; x2, z2 = pts[(i + 1) % n]
        a += x1 * z2 - x2 * z1
    return abs(a) * 0.5

def centroid(pts):
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))

def point_in(x, z, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]; xj, zj = poly[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            inside = not inside
        j = i
    return inside

def parse_height(tags, area):
    h = tags.get('height') or tags.get('building:height')
    if h:
        try: return float(str(h).replace('m', '').replace(' ', '').split(';')[0])
        except ValueError: pass
    lv = tags.get('building:levels')
    if lv:
        try: return max(4.0, float(str(lv).split(';')[0]) * 3.3)
        except ValueError: pass
    seed = int(area * 7.13) % 97
    return 12.0 + (seed / 97.0) * 30.0

def simplify(pts, min_dist=1.2):
    if len(pts) <= 4: return pts
    out = [pts[0]]
    for p in pts[1:]:
        dx = p[0] - out[-1][0]; dz = p[1] - out[-1][1]
        if dx * dx + dz * dz >= min_dist * min_dist: out.append(p)
    return out if len(out) >= 3 else pts

def main(raw, outfile):
    bdata = json.load(open(f'{raw}/mid_bldg.json'))
    rdata = json.load(open(f'{raw}/mid_roads.json'))
    try: pdata = json.load(open(f'{raw}/mid_parks.json'))
    except Exception: pdata = {'elements': []}

    # ---- buildings ----
    builds = []
    for e in bdata['elements']:
        if e['type'] != 'way' or 'geometry' not in e: continue
        tags = e.get('tags', {})
        if tags.get('building') in ('roof', 'no'): continue
        pts = [proj(g['lat'], g['lon']) for g in e['geometry']]
        if len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
        if len(pts) < 3: continue
        area = poly_area(pts)
        if area < 20: continue
        pts = simplify(pts)
        if len(pts) < 3: continue
        h = parse_height(tags, area)
        if h < 1: continue                       # filter: invisible junk
        b = {'p': [[round(x, 1), round(z, 1)] for x, z in pts], 'h': round(h, 1)}
        nm = tags.get('name', '')
        if nm and (h > 90 or 'Empire' in nm or 'Chrysler' in nm or 'Rockefeller' in nm):
            b['n'] = nm
        b['_a'] = area; b['_c'] = centroid(pts)
        builds.append(b)

    # ---- roads ----
    roads = []
    for e in rdata.get('elements', []):
        if e['type'] != 'way' or 'geometry' not in e: continue
        hw = e.get('tags', {}).get('highway', 'residential')
        w = {'trunk': 20, 'primary': 18, 'secondary': 15, 'tertiary': 12}.get(hw, 10)
        pts = [proj(g['lat'], g['lon']) for g in e['geometry']]
        if len(pts) < 2: continue
        roads.append({'p': [[round(x, 1), round(z, 1)] for x, z in pts], 'w': w,
                      'o': 1 if e.get('tags', {}).get('oneway') == 'yes' else 0})

    # ---- filter: footprints that ENCLOSE other buildings are complex outlines ----
    drop = set()
    for i, b in enumerate(builds):
        if b['_a'] < 5000: continue
        nested = 0
        for o in builds:
            if o is b or o['_a'] > b['_a']: continue
            if point_in(o['_c'][0], o['_c'][1], b['p']):
                nested += 1
                if nested >= 2: break
        if nested >= 2: drop.add(i)

    # ---- filter: footprints with many distinct streets through them ----
    for i, b in enumerate(builds):
        if i in drop or b['_a'] < 5000: continue
        hits = 0
        for r in roads:
            through = False
            for k in range(1, len(r['p'])):
                ax, az = r['p'][k-1]; bx, bz = r['p'][k]
                L = math.hypot(bx-ax, bz-az)
                if L < 0.5: continue
                steps = max(2, int(L / 4))
                for s in range(steps + 1):
                    t = s / steps
                    if point_in(ax + (bx-ax)*t, az + (bz-az)*t, b['p']):
                        through = True; break
                if through: break
            if through:
                hits += 1
                if hits >= 6: break
        if hits >= 6: drop.add(i)

    # superblock monoliths & bridge structures: anything that renders as a
    # giant blank wall. Three shapes of artifact:
    #   * huge both axes + hyper-complex outline (museum/terminal outlines)
    #   * tall + complex + big both axes (Queensboro Bridge structure ways)
    #   * near-rectangles (<=8 pts) covering a whole superblock
    for i, b in enumerate(builds):
        if i in drop or b.get('n'): continue
        xs=[p[0] for p in b['p']]; zs=[p[1] for p in b['p']]
        w = max(xs)-min(xs); d = max(zs)-min(zs); pts = len(b['p'])
        if w > 150 and d > 150 and pts >= 40:
            drop.add(i)
        elif b['h'] > 40 and pts >= 40 and w > 90 and d > 90:
            drop.add(i)
        elif pts <= 8 and w > 180 and d > 140 and b['h'] > 25:
            drop.add(i)

    kept = [b for i, b in enumerate(builds) if i not in drop]
    for b in kept: b.pop('_a', None); b.pop('_c', None)

    # ---- parks ----
    parks = [{'p': [[round(x,1), round(z,1)] for x, z in
                    (proj(la, lo) for la, lo in CENTRAL_PARK)], 'n': 'Central Park'}]
    for e in pdata.get('elements', []):
        if e['type'] != 'way' or 'geometry' not in e: continue
        pts = [proj(g['lat'], g['lon']) for g in e['geometry']]
        if len(pts) > 1 and pts[0] == pts[-1]: pts = pts[:-1]
        if len(pts) < 3 or poly_area(pts) < 400: continue
        pk = {'p': [[round(x,1), round(z,1)] for x, z in simplify(pts, 2.0)]}
        nm = e.get('tags', {}).get('name')
        if nm: pk['n'] = nm
        parks.append(pk)

    # buildings inside a park are park structures — drop so the park reads open
    final = []
    for b in kept:
        c = centroid(b['p'])
        if any(point_in(c[0], c[1], pk['p']) for pk in parks[:1]):   # Central Park only
            continue
        final.append(b)

    out = {'name': 'Manhattan', 'origin': [LAT0, LON0],
           'buildings': final, 'roads': roads, 'parks': parks}
    with open(outfile, 'w') as f:
        f.write('window.CITY_MIDTOWN = ')
        json.dump(out, f, separators=(',', ':'))
        f.write(';\n')
    hs = sorted((b['h'] for b in final), reverse=True)
    print(f'buildings {len(builds)} → {len(final)} (dropped {len(drop)} artifacts, '
          f'{len(kept)-len(final)} inside Central Park)')
    print(f'roads {len(roads)} · parks {len(parks)} · tallest {hs[:4]}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
