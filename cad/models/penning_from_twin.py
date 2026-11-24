#!/usr/bin/env python3
"""Refresh penning.json (Hardware in 3D, AEgIS chapter) from the AEgIS digital twin's geometry.

    python3 penning_from_twin.py [~/AEgIS_G4BeamlineTwin/digital_twin]

Keeps the trap data the page's physics uses (electrodes, solenoids, scintillators, foil: G4beamline frame) and adds the
twin's surroundings: LHe / LN2 cryostat vessels, the outer vacuum vessel, the positron line, the Ps converter and the
moire deflectometer. The twin works in the CST frame (C0 starts at z = -1068 mm); the page uses the G4beamline frame
(C0 starts at z = 0), so every z is shifted by +1068 mm.
"""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TWIN = Path(os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/AEgIS_G4BeamlineTwin/digital_twin'))
sys.path[:0] = [str(TWIN), str(TWIN / 'gui')]
import server  # noqa: E402  (the twin's GUI server: geometry() builds everything from its model files)

g = server.geometry()
DZ = -g['electrodes'][0]['z0']          # CST -> G4beamline
r1 = lambda v: round(float(v), 1)
z = lambda v: r1(v + DZ)

out = json.loads((HERE / 'penning.json').read_text())
out['frame'] = f'G4beamline (CST z + {DZ:g} mm)'
out['cryo'] = [dict(id=v['id'], cryogen=v['cryogen'], magnet=v['magnet'], name=v['name'], T=v['T'], wall=v['wall'],
                    segments=[dict(z0=z(s['z0']), z1=z(s['z1']), ri=r1(s['ri']), ro=r1(s['ro']), yc=r1(s.get('yc', 0))) for s in v['segments']])
               for v in g['cryo']]
o = g['ovc']
out['ovc'] = dict(name=o['name'], z0=z(o['z0']), z1=z(o['z1']), ro=r1(o['ro']), wall=r1(o['wall']), end=r1(o['end']),
                  apertures=[r1(a) for a in o['apertures']], cans=[dict(name=c['name'], z0=z(c['z0']), z1=z(c['z1'])) for c in o['cans']])
h = g['hbar']
P = h['positron']
out['positron'] = dict(path=[[z(a), r1(b)] for a, b in P['path']],
                       parts=[dict(id=p['id'], name=p['name'], z0=z(p['z0']), z1=z(p['z1']), r=r1(p['r'])) for p in P['parts']],
                       schematic=bool(P.get('schematic')))
C = h['converter']
out['converter'] = dict(z_face=z(C['z_face']), size=C['size_mm'], material=C['material'])
M = h['moire']
out['moire'] = dict(g1=z(M['g1_z']), g2=z(M['g2_z']), det=z(M['det_z']), r=r1(M['r_mm']), housing_r=r1(M['housing_r']),
                    gate_valve=[z(v) for v in M['gate_valve']])
Hh, L = h['hbar'], h['lasers']
out['hbar'] = dict(cloud=z(Hh['cloud_z']), cloud_r=r1(Hh['pbar_r_mm']), cloud_half=r1(Hh['pbar_half_len_mm']), laser=z(L['z']),
                   ps_cone=C['ps_cone_deg'], uv_nm=L['uv']['nm'], ir_nm=L['ir']['nm'], n=L['n_ps'], laser_delay_ns=L['delay_ns'])
out['source'] = out.get('source', '') .split(' + ')[0] + ' + AEgIS digital twin (cryostats, positron line, deflectometer)'
(HERE / 'penning.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print('penning.json:', ', '.join(f'{k}' for k in out), f'(frame shift {DZ:g} mm)')
