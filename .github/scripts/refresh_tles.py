"""Daily refresh of the orbital elements behind EP in Space (thrusters/data/orbits.json).

Replaces every stored two-line element set (TLE) with the newest one from CelesTrak:
  - single spacecraft: looked up by NORAD number in the GP group "active" (one download); objects not found there
    are queried one by one (CATNR); an object CelesTrak no longer lists loses its TLE and the page falls back to its
    catalogued orbit (SATCAT inclination / perigee / apogee, kept in the file);
  - constellations: the stored sample is refreshed from its GP group; members that left the group are replaced by
    other members of the same group, so the sample keeps its size.
Nothing is written if a download fails or looks wrong (the previous file stays live). Python standard library only."""
import json, random, sys, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

FILE = Path(__file__).resolve().parents[2] / 'thrusters' / 'data' / 'orbits.json'
GP = 'https://celestrak.org/NORAD/elements/gp.php?{q}&FORMAT=tle'
GROUPS = {'SpaceX Starlink': 'starlink', 'OneWeb': 'oneweb', 'Amazon Leo': 'kuiper', 'Qianfan': 'qianfan'}
UA = {'User-Agent': 'ep-in-space-tle-refresh/1.0 (GitHub Actions; daily)'}


def get(q, min_sets=1):
    for attempt in range(3):
        try:
            txt = urllib.request.urlopen(urllib.request.Request(GP.format(q=q), headers=UA), timeout=120).read().decode()
            L = [l.rstrip() for l in txt.splitlines() if l.strip()]
            sets = {}
            for i in range(len(L) - 2):
                if L[i + 1].startswith('1 ') and L[i + 2].startswith('2 ') and L[i + 1][2:7] == L[i + 2][2:7]:
                    sets[int(L[i + 1][2:7])] = [L[i + 1], L[i + 2]]
            if len(sets) >= min_sets or 'No GP data found' in txt:
                return sets
            raise ValueError(f'only {len(sets)} element sets')
        except Exception as e:
            err = e
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f'CelesTrak {q}: {err}')


def main():
    D = json.loads(FILE.read_text())
    ms = D['missions']
    try:
        active = get('GROUP=active', min_sets=5000)
        groups = {g: get(f'GROUP={g}', min_sets=20) for g in sorted(set(GROUPS.values()))}
    except RuntimeError as e:
        print('Download failed, orbits.json left unchanged:', e)
        return 0
    n_new = n_lookup = n_lost = 0
    for name, ent in ms.items():
        for o in ent.get('objects', []):
            if not o.get('tle'):
                continue  # objects without elements (re-entered, never matched) stay on their catalogued orbit
            n = o['norad']
            t = active.get(n)
            if t is None:
                n_lookup += 1
                time.sleep(2)
                try:
                    t = get(f'CATNR={n}').get(n)
                except RuntimeError as e:
                    print('Lookup failed, keeping old elements:', n, e)
                    continue
            if t is None:
                o['tle'] = None
                n_lost += 1
                print(f'{name}: NORAD {n} no longer listed by CelesTrak -> catalogued orbit')
            else:
                n_new += o['tle'] != t
                o['tle'] = t
        g = next((v for k, v in GROUPS.items() if name.startswith(k)), None)
        if g and ent.get('cluster_tles'):
            pool = groups[g]
            old = [int(l1[2:7]) for l1, _ in ent['cluster_tles']]
            keep = [n for n in old if n in pool]
            rest = sorted(set(pool) - set(keep))
            random.Random(f'{name}{len(keep)}').shuffle(rest)
            keep += rest[:len(old) - len(keep)]
            ent['cluster_tles'] = [pool[n] for n in keep]
            ent['cluster_source'] = f'CelesTrak GP group "{g}" ({len(pool)} objects in orbit, sample of {len(keep)})'
    D['generated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
    FILE.write_text(json.dumps(D))
    print(f'updated {n_new} single-spacecraft TLEs ({n_lookup} looked up by CATNR, {n_lost} no longer listed); '
          f'constellations: ' + ', '.join(f'{g} {len(p)}' for g, p in groups.items()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
