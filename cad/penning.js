// AEgIS Penning trap, built from Bharat's G4beamline model (PenningTrap.g4bl): the gold electrode stack, the 5 T and 1 T
// solenoids, the corrector coils and the scintillator arcs, all at their real positions.
// The annihilation events are generated here (not replayed from Geant4): an antiproton annihilates on the trap wall into
// charged and neutral pions, photons and nuclear fragments; charged tracks are followed through the solenoid fields and
// the scintillators register the ones that cross them. Physics is qualitative; decay-in-flight and photon conversion
// rates are raised so muons and electrons actually appear in a short loop.
import * as THREE from 'three';

// g4beamline (x, y, z along the beam) -> page CAD axes (x along the trap, z up)
const toCad = (x, y, z, out = new THREE.Vector3()) => out.set(z, x, y);

export const PARTICLES = {
    pi: { label: 'π±', name: 'Pions', color: 0xff9f0a, q: true, m: 139.57 },
    mu: { label: 'μ±', name: 'Muons', color: 0xbf5af2, q: true, m: 105.66 },
    e: { label: 'e±', name: 'Electrons', color: 0x64d2ff, q: true, m: 0.511 },
    p: { label: 'p', name: 'Protons', color: 0xff375f, q: true, m: 938.27 },
    gamma: { label: 'γ', name: 'Photons', color: 0xffd60a, q: false, m: 0 },
    n: { label: 'n', name: 'Neutrons', color: 0xa1a1a6, q: false, m: 939.57 },
    pbar: { label: 'p̄', name: 'Antiproton', color: 0xffffff, q: true, m: 938.27 }
};
export const CHARGED = ['pi', 'mu', 'e', 'p'];
// the AEgIS antihydrogen cycle (as in the digital twin): catch, cool and compress the antiprotons in 5 T, move them to the 1 T trap
// next to the positronium target at A0, fire a positron bunch at the target, excite the positronium with two lasers to Rydberg
// states, let it meet the antiprotons (charge exchange) and send the antihydrogen to the detector
export const STAGES = ['Arriving from the decelerator', 'Caught in the 5 T trap', 'Cooled and compressed', 'Moved to the 1 T trap, next to A0',
    'Positrons fired at the target', 'Positronium excited by two lasers', 'Antihydrogen forms', 'Antihydrogen reaches the detector', 'Leftover antiprotons released'];
// cycle timeline, seconds shown: stage k runs from TL[k] to TL[k + 1]
const TL = [0, 2.2, 5, 8, 10.4, 13.6, 16.0, 17.2, 20.6, 22.9];

// ---------- geometry as page model data (same shape as the CAD models) ----------
export async function penningData(base) {
    const T = await (await fetch(base + 'penning.json?v=20261124c')).json();
    const geo = [], instances = [], explode = [], groups = [];
    const group = (label, kind, material, blurb) => { let i = groups.findIndex(g => g.label === label); if (i < 0) { i = groups.length; groups.push({ label, kind, material, blurb, count: 0, id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') }); } return i; };
    const tube = (ri, ro, len, seg, phi0 = 0, dphi = Math.PI * 2) => {
        const prof = [new THREE.Vector2(ri, -len / 2), new THREE.Vector2(ro, -len / 2), new THREE.Vector2(ro, len / 2), new THREE.Vector2(ri, len / 2), new THREE.Vector2(ri, -len / 2)];
        const g = new THREE.LatheGeometry(prof, seg, phi0, dphi);
        g.rotateZ(-Math.PI / 2);          // lathe axis (y) -> trap axis (CAD x)
        g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
        return g;
    };
    const cache = new Map(), shared = (key, make) => { if (!cache.has(key)) { cache.set(key, geo.length); geo.push(make()); } return cache.get(key); };
    const add = (gi, geoIdx, z, ex, name, up = 0) => {
        const m = new THREE.Matrix4().makeTranslation(z, 0, up);
        instances.push({ name, g: gi, geo: geoIdx, m: m.transpose().elements.slice() }); explode.push(ex); groups[gi].count++;
    };
    // electrodes, grouped as in the model
    const EG = [
        [/^C\d/, 'Catching electrodes (C)', 'Gold electrodes of the catching trap in the 5 T magnet.'],
        [/^HV/, 'High-voltage electrodes', 'Electrodes that take the high voltage used to catch the antiprotons.'],
        [/^P\d/, 'P electrodes', 'Gold electrode group P along the 5 T trap.'],
        [/^T\d/, 'T electrodes', 'Gold electrode group T, between the two magnets.'],
        [/^B0$/, 'Rotating-wall electrode', 'Segmented electrode that drives a rotating field to compress the cloud.'],
        [/^B\d/, 'B electrodes', 'Gold electrode group B in the 1 T trap.'],
        [/^A\d/, 'A electrodes', 'Gold electrode group A at the far end of the stack.']
    ];
    T.electrodes.forEach(e => {
        const eg = EG.find(([re]) => re.test(e.name)); if (!eg) return;
        const gi = group(eg[1], 'gold', 'Gold', eg[2]);
        add(gi, shared(`e${e.ri},${e.ro},${e.len}`, () => tube(e.ri, e.ro, e.len, 48)), e.z, 0, e.name);
    });
    // degrader foil
    const gf = group('Degrader foil', 'foil', 'Parylene N, aluminium-coated', 'A thin foil that slows the incoming antiprotons enough to be caught.');
    add(gf, shared('foil', () => tube(0.01, T.foil.r, 0.6, 48)), T.foil.z, 0, 'ParyleneN_Foil');
    // magnets
    T.solenoids.forEach(s => {
        const main = s.len > 500, five = main && s.ri < 100;
        const label = main ? (five ? '5 T solenoid' : '1 T solenoid') : 'Corrector coils';
        const blurb = main ? `Superconducting solenoid giving about ${five ? 5 : 1} tesla along the trap axis.` : 'Small coils that shape the field between and around the two main magnets.';
        const gi = group(label, 'coil', 'Niobium (superconducting coil)', blurb);
        add(gi, shared(`s${s.ri},${s.ro},${s.len}`, () => tube(s.ri, s.ro, s.len, 96)), s.z, main ? [0, 0, five ? 300 : 340] : [0, 0, 460], s.name);
    });
    // scintillator arcs (each its own instance so it can light up)
    const gd = group('Scintillator detectors', 'scint', 'Polypropylene scintillator', 'Arcs of plastic scintillator around the magnets that record the charged annihilation products.');
    T.detectors.forEach(d => {
        // g4beamline phi is measured from +x in the x-y plane; the lathe after rotateZ starts 90 degrees later
        const gIdx = shared(`d${d.name}`, () => tube(d.ri, d.ro, d.len, 40, THREE.MathUtils.degToRad(d.phi0 - 90), THREE.MathUtils.degToRad(d.phi1 - d.phi0)));
        const mid = THREE.MathUtils.degToRad((d.phi0 + d.phi1) / 2);
        add(gd, gIdx, d.z, [0, Math.cos(mid) * 260, Math.sin(mid) * 260], d.name);
    });
    const core = groups.map(g => g.label);       // the trap itself: the close-up camera frames these
    // ---------- around the trap (from the AEgIS digital twin): cryostats, vacuum vessel, positron line, deflectometer ----------
    const disc = (r, len, seg = 64) => tube(0.01, r, len, seg);
    if (T.cryo) T.cryo.forEach(v => v.segments.forEach((sg, k) => {
        const tank = sg.ri < 1 && sg.yc > 0, he = v.cryogen === 'LHe';
        const gi = tank ? group('Helium reservoirs', 'lhe', 'Liquid helium, 4.2 K, in stainless steel', 'Tanks of liquid helium above each magnet that keep the bath topped up.')
            : he ? group('Liquid-helium vessels', 'lhe', 'Liquid helium, 4.2 K, in stainless steel', 'The helium bath around the superconducting coils and the traps, at 4.2 kelvin.')
            : group('Liquid-nitrogen shields', 'ln2', 'Liquid nitrogen, 77 K, in stainless steel', 'A 77 K jacket of liquid nitrogen round the helium vessel: a radiation shield that also speeds up the cool-down.');
        const len = sg.z1 - sg.z0;
        add(gi, shared(`cr${sg.ri},${sg.ro},${len}`, () => tube(Math.max(sg.ri, 0.01), sg.ro, len, 96)), (sg.z0 + sg.z1) / 2,
            tank ? [0, 0, 520] : he ? [0, 0, 380] : [0, 0, 900], `${v.id}_${k}`, sg.yc || 0);
    }));
    if (T.ovc) {
        const o = T.ovc, gi = group('Outer vacuum vessel', 'vessel', 'Stainless steel', 'The outer vessel: an insulating vacuum round the cold parts. The scintillators sit on its outside.');
        o.cans.forEach((c, k) => add(gi, shared(`ovc${k}`, () => tube(o.ro - o.wall, o.ro, c.z1 - c.z0, 128)), (c.z0 + c.z1) / 2, [0, 0, 1400], `OVC_${k}`));
        add(gi, shared('ovcEnd0', () => tube(o.apertures[0], o.ro, o.end, 128)), o.z0 - o.end / 2, [-300, 0, 1400], 'OVC_end0');
        add(gi, shared('ovcEnd1', () => tube(o.apertures[1], o.ro, o.end, 128)), o.z1 + o.end / 2, [300, 0, 1400], 'OVC_end1');
    }
    if (T.positron) {
        const P = T.positron, path = P.path;
        const yAt = zz => { for (let i = 0; i + 1 < path.length; i++) { const [a, ya] = path[i], [b, yb] = path[i + 1]; if (zz >= a && zz <= b) return ya + (yb - ya) * (zz - a) / (b - a); } return path[0][1]; };
        const PN = { source: ['Positron source', 'Sodium-22 and neon', 'A radioactive sodium-22 source; a layer of solid neon at 7 K slows its positrons down to a few eV.'],
            surko: ['Buffer-gas trap', 'Stainless steel and gold', 'A Surko trap: nitrogen gas takes the positrons\' energy so they stay trapped.'],
            accum: ['Positron accumulator', 'Stainless steel and gold', 'Stacks positrons from many fills, about two million in 110 s, before they are sent on.'],
            diverter: ['Diverter', 'Stainless steel', 'Sends the positrons either to a test chamber or down the line into the trap.'] };
        P.parts.forEach(pt => {
            const [label, mat, blurb] = PN[pt.id] || [pt.name, 'Stainless steel', pt.name];
            add(group(label, 'steel', mat, blurb), shared(`pp${pt.id}`, () => disc(pt.r, pt.z1 - pt.z0)), (pt.z0 + pt.z1) / 2, [-250, 0, 380], pt.name, yAt((pt.z0 + pt.z1) / 2));
        });
        // the transfer line: a pipe from the source along the waypoints down to the magnet's entrance (inside, the positrons run on the axis)
        const enter = T.ovc ? T.ovc.z0 - 40 : path[path.length - 2][0] + 80;
        const pts = path.filter(([zz]) => zz <= enter).map(([zz, y]) => new THREE.Vector3(zz, 0, y)); pts.push(new THREE.Vector3(enter, 0, 0));
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3);
        const gl = group('Positron transfer line', 'steel', 'Stainless steel', 'Carries the positron bunches down into the 5 T magnet. Its route is drawn schematically.');
        add(gl, shared('eline', () => { const g = new THREE.TubeGeometry(curve, 240, 19, 20, false); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }), 0, [-250, 0, 380], 'PositronLine');
        T.positronCurve = pts.map(v => v.toArray()).concat([[T.converter ? T.converter.z_face : path[path.length - 1][0], 0, 0]]);
    }
    if (T.converter) {
        const c = T.converter, gi = group('Positronium converter', 'gold', 'Nanochannelled silicon on titanium', 'Positrons hitting this porous silicon target come back out as positronium, which meets the antiprotons to form antihydrogen.');
        add(gi, shared('conv', () => disc(c.size[0] * 1.6, 2)), c.z_face + 1, 0, 'PsConverter');
    }
    if (T.moire) {
        const m = T.moire;
        const gv = group('Gate valve', 'steel', 'Stainless steel', 'Separates the trap\'s vacuum from the deflectometer.');
        add(gv, shared('gv', () => tube(m.housing_r - 4, m.housing_r + 40, m.gate_valve[1] - m.gate_valve[0], 64)), (m.gate_valve[0] + m.gate_valve[1]) / 2, [300, 0, 0], 'GateValve');
        const gh = group('Deflectometer housing', 'vessel', 'Stainless steel', 'Vacuum housing of the moiré deflectometer.');
        const h0 = m.gate_valve[1], h1 = m.det + 40;
        add(gh, shared('mh', () => tube(m.housing_r - 3, m.housing_r, h1 - h0, 96)), (h0 + h1) / 2, [600, 0, 0], 'MoireHousing');
        const gg = group('Moiré gratings', 'foil', 'Silicon', 'Two fine gratings 50 cm apart: falling antihydrogen shifts the moiré pattern they cast on the detector.');
        add(gg, shared('mg', () => disc(m.r * 1.6, 3)), m.g1, [700, 0, 0], 'Grating1'); add(gg, shared('mg', () => disc(m.r * 1.6, 3)), m.g2, [800, 0, 0], 'Grating2');
        const gdx = group('Position detector', 'alu', 'Silicon pixel detector', 'Records where each antihydrogen atom lands, to micrometres, to see how far it fell.');
        add(gdx, shared('mdet', () => disc(m.r * 2, 12)), m.det, [900, 0, 0], 'MoireDetector');
    }
    return {
        name: 'AEgIS Penning trap', procedural: true, trap: T, core,
        blurb: 'My Geant4 / G4beamline model of the AEgIS antiproton trap. Antiprotons annihilate on the trap wall and the scintillators pick up what flies out.',
        groups, instances, explode, geo, geoms: geo.map(() => ({})), systems: []
    };
}

// ---------- field: the two main solenoids (finite-solenoid on-axis field, confined to the bore) ----------
function makeField(T) {
    const mains = T.solenoids.filter(s => s.len > 500).map(s => {
        const R = (s.ri + s.ro) / 2, h = s.len / 2, B0 = s.ri < 100 ? 5 : 1;
        return { ...s, R, h, k: B0 / (h / Math.hypot(h, R)) };
    });
    return (x, y, z) => {
        const r = Math.hypot(x, y); let b = 0;
        for (const s of mains) {
            const z1 = z - (s.z - s.h), z2 = z - (s.z + s.h);
            const onAxis = 0.5 * s.k * (z1 / Math.hypot(z1, s.R) - z2 / Math.hypot(z2, s.R));
            const t = Math.min(1, Math.max(0, (r - s.ri) / (s.ro + 60 - s.ri)));
            b += onAxis * (1 - t * t * (3 - 2 * t));
        }
        return b;
    };
}

// ---------- event generator + tracking ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const iso = () => { const c = rnd(-1, 1), s = Math.sqrt(1 - c * c), f = rnd(0, Math.PI * 2); return [s * Math.cos(f), s * Math.sin(f), c]; };
const C_MM_NS = 299.792;

function generate(T, Bz, zAt) {
    const coils = T.solenoids.filter(s => s.len > 500);
    const zone = Math.random() < 0.75 ? [150, 430] : [1080, 1470];       // mostly the 5 T catching trap (where the cloud sits), some in the 1 T trap
    const phi = rnd(0, Math.PI * 2), vz = zAt != null ? zAt + rnd(-6, 6) : rnd(zone[0], zone[1]);
    const vtx = [15 * Math.cos(phi), 15 * Math.sin(phi), vz];
    const tracks = [];
    const follow = (type, sign, p, pos, dir, t0) => {
        const P = PARTICLES[type], tr = { type, pts: [], ts: [], hits: [] };
        const E = Math.hypot(p, P.m), v = (p / E) * C_MM_NS;
        let [x, y, z] = pos, [dx, dy, dz] = dir, t = t0, len = 0;
        const maxLen = type === 'p' ? rnd(70, 160) : type === 'e' ? 1400 : 3200;
        const decayAt = type === 'pi' && Math.random() < 0.3 ? rnd(120, 650) : Infinity;   // pi -> mu nu (rate raised for display)
        let converted = false;
        tr.pts.push(x, y, z); tr.ts.push(t);
        for (let st = 0; st < 4000; st++) {
            const b = P.q ? Bz(x, y, z) : 0, ds = Math.abs(b) > 0.05 ? 3 : 10;
            if (b) {                                  // helix: rotate the transverse direction about z
                const ang = -sign * 0.3 * b / (p / 1000) * ds / 1000, c = Math.cos(ang), s = Math.sin(ang);
                const nx = dx * c - dy * s, ny = dx * s + dy * c; dx = nx; dy = ny;
            }
            const r0 = Math.hypot(x, y);
            x += dx * ds; y += dy * ds; z += dz * ds; t += ds / v; len += ds;
            const r = Math.hypot(x, y);
            if (st % 2 === 0) { tr.pts.push(x, y, z); tr.ts.push(t); }
            // scintillator arcs at r = 700..710 mm
            if (P.q && r0 < 700 && r >= 700) {
                let a = Math.atan2(y, x) * 180 / Math.PI; if (a < 0) a += 360;
                T.detectors.forEach((d, di) => {
                    if (Math.abs(z - d.z) <= d.len / 2 && a >= d.phi0 && a <= d.phi1) {
                        const cosI = Math.max(0.2, Math.abs((dx * x + dy * y) / r));
                        const edep = type === 'p' ? rnd(6, 16) : 1.9 / cosI * (1 + 0.18 * -Math.log(Math.random()));
                        tr.hits.push({ det: di, t, pos: [x, y, z], edep, type });
                    }
                });
            }
            // photon conversion in a magnet coil (rate raised for display)
            if (type === 'gamma' && !converted) for (const s of coils) {
                if (r0 < s.ri && r >= s.ri && Math.abs(z - s.z) < s.len / 2 && Math.random() < 0.35) {
                    converted = true; const f = rnd(0.2, 0.8), Eg = p * 0.9;
                    [[f, -1], [1 - f, 1]].forEach(([k, sg]) => follow('e', sg, Math.max(8, Eg * k), [x, y, z], jitter([dx, dy, dz], 0.06), t));
                }
            }
            if (converted) break;
            if (len >= decayAt) { follow('mu', sign, p * 0.82, [x, y, z], jitter([dx, dy, dz], 0.18), t); break; }
            if (len > maxLen || r > 980 || z < -900 || z > 2900) break;
        }
        tr.pts.push(x, y, z); tr.ts.push(t);
        tracks.push(tr);
    };
    const jitter = (d, a) => { const j = iso(); const v = new THREE.Vector3(d[0] + j[0] * a, d[1] + j[1] * a, d[2] + j[2] * a).normalize(); return [v.x, v.y, v.z]; };
    // the antiproton arriving from the trap centre to the wall
    const pbar = { type: 'pbar', pts: [], ts: [], hits: [] };
    for (let i = 0; i <= 30; i++) { const f = i / 30; pbar.pts.push(vtx[0] * f, vtx[1] * f, vz - 160 * (1 - f)); pbar.ts.push(-1.6 * (1 - f)); }
    tracks.push(pbar);
    // annihilation products (typical multiplicities for antiproton-nucleus annihilation)
    const nPi = pick([2, 3, 3, 4, 4, 5]), nPi0 = pick([0, 1, 1, 2, 2, 3]);
    for (let i = 0; i < nPi; i++) follow('pi', i % 2 ? 1 : -1, Math.min(900, 90 + -Math.log(Math.random()) * 260), vtx, iso(), 0);
    for (let i = 0; i < nPi0 * 2; i++) follow('gamma', 0, rnd(60, 380), vtx, iso(), 0);
    for (let i = 0, n = pick([0, 0, 1, 1, 2]); i < n; i++) follow('p', 1, rnd(200, 450), vtx, iso(), 0);
    for (let i = 0, n = pick([1, 2, 2, 3]); i < n; i++) follow('n', 0, rnd(150, 500), vtx, iso(), 0);
    return { vtx, tracks };
}

// ---------- events: generate, draw as growing glowing tracks, light the detectors, keep statistics ----------
export class PenningEvents {
    constructor(M, holder, onHit) {
        this.T = M.data.trap; this.Bz = makeField(this.T); this.holder = holder; this.onHit = onHit;
        this.live = []; this.clock = 0.6; this.period = matchMedia('(pointer: coarse)').matches ? 0.5 : 0.28; this.speed = 5.2;        // a new annihilation every ~0.3 s (phones ~0.5 s); ns of event time per second shown
        this.group = new THREE.Group(); holder.add(this.group);
        // positrons: a steady stream of dots from the sodium-22 source, down the transfer line and along the axis to the converter
        if (this.T.positronCurve) {
            const P = this.T.positronCurve.map(a => new THREE.Vector3(...a)), L = [0];
            for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
            const N = 220, pos = new Float32Array(N * 3), g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            this.ep = { P, L, N, seed: Array.from({ length: N }, () => [Math.random(), rnd(-1, 1), rnd(-1, 1)]), t: 0, u: { uOn: { value: 0 }, uScale: { value: 400 } } };
            this.ep.pts = new THREE.Points(g, new THREE.ShaderMaterial({
                uniforms: this.ep.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                vertexShader: `uniform float uScale, uOn; varying float vA; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(2.5, 9.0 * uScale / -mv.z); vA = uOn; }`,
                fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(0.75, 0.42, 1.0, a * 0.9); }`
            }));
            this.ep.pts.frustumCulled = false; holder.add(this.ep.pts);
        }
        // one glow overlay per scintillator arc
        this.detMeshes = M.meshes.filter(m => /^SC/.test(M.data.instances[M.meshes.indexOf(m)].name));
        this.glow = this.detMeshes.map((m, i) => {
            m.userData.det = i;
            const g = new THREE.Mesh(m.geometry, new THREE.MeshBasicMaterial({ color: 0x30d158, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
            g.matrixAutoUpdate = false; g.matrix = m.matrix; g.userData.f = 0; holder.add(g); return g;
        });
        this.stats = this.T.detectors.map(d => ({ name: d.name, hits: 0, types: { pi: 0, mu: 0, e: 0, p: 0 }, edep: [] }));
        // the antiproton bunch: arrives, is caught, compressed, pulsed to the 1 T trap and expands there (one cycle ~15 s)
        const el = n => this.T.electrodes.find(e => e.name === n);
        const mid = e => e.z, C9 = el('C9'), C11 = el('C11'), HV1 = el('HV1'), HV2 = el('HV2'), B1 = el('B1'), B7 = el('B7') || el('B6');
        this.Z = {
            catch0: HV1.z + HV1.len / 2 + 4, catch1: HV2.z - HV2.len / 2 - 4,                    // catching well between the HV electrodes
            comp: (mid(C9) + mid(C11)) / 2,                                                     // compressed bunch: centred on C10, between C9 and C11
            b0: B1.z - B1.len / 2, b1: B7.z + B7.len / 2,                                       // the 1 T trap (B electrodes)
            end: Math.max(...this.T.electrodes.map(e => e.z + e.len / 2)), out: Math.max(...this.T.solenoids.map(s => s.z + s.len / 2)) + 150   // past the A electrodes, out of the magnet
        };
        this.cycle = 0; this.CYCLE = TL[TL.length - 1];
        this.NP = 300; this.pb = []; const pp = new Float32Array(this.NP * 3), pa = new Float32Array(this.NP);
        const gauss = () => { let a = 0; for (let i = 0; i < 6; i++) a += Math.random(); return (a - 3) / 0.7071; };
        for (let i = 0; i < this.NP; i++) this.pb.push({ u: gauss(), r: Math.abs(gauss()) * 0.7, a: rnd(0, Math.PI * 2), w: rnd(0, Math.PI * 2), f: rnd(0.8, 1.25), zg: 0 });
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aA', new THREE.BufferAttribute(pa, 1));
        this.pbU = { uScale: { value: 400 }, uOn: { value: 0 } };
        this.pbPts = new THREE.Points(pg, new THREE.ShaderMaterial({
            uniforms: this.pbU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            vertexShader: `attribute float aA; uniform float uScale, uOn; varying float vA;
                void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(6.0 * uScale / -mv.z, 3.5, 10.0); vA = aA * uOn; }    // capped: no blobs in the close-ups`,
            fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(0.86, 0.9, 1.0, a); }`
        }));
        // a soft halo around the bunch, sized to it, so it reads even when the whole trap is in view
        this.haloU = { uScale: this.pbU.uScale, uOn: this.pbU.uOn, uSize: { value: 60 }, uA: { value: 0.5 } };
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
        this.halo = new THREE.Points(hg, new THREE.ShaderMaterial({
            uniforms: this.haloU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
            vertexShader: `uniform float uScale, uSize; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uSize * uScale / -mv.z, 26.0, 220.0); }`,
            fragmentShader: `uniform float uOn, uA; void main() { float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 2.2) * uA * uOn; gl_FragColor = vec4(0.62, 0.72, 1.0, a); }`
        }));
        this.halo.frustumCulled = false; holder.add(this.halo);
        this.centre = new THREE.Vector3();
        this.pbPts.frustumCulled = false; holder.add(this.pbPts);
        this.buildHbar(holder);
        // the plots start from a quick background run (a few hundred events take ~0.1 s), then every live event adds to them
        this.events = 0;
        for (let i = 0; i < 2000; i++) this.record(generate(this.T, this.Bz).tracks.flatMap(t => t.hits));
    }
    record(hits) {
        this.events++;
        hits.forEach(h => { const s = this.stats[h.det]; s.hits++; s.types[h.type] = (s.types[h.type] || 0) + 1; s.edep.push(h.edep); if (s.edep.length > 800) s.edep.shift(); });
    }
    // where the bunch is in its cycle: returns the stage and, per antiproton, its place along (g4bl z) and off the axis
    stage() {
        const t = this.cycle; let k = 0; while (k < TL.length - 2 && t >= TL[k + 1]) k++; return k;
    }
    stepPbars(dt) {
        this.cycle = (this.cycle + dt) % this.CYCLE;
        const t = this.cycle, Z = this.Z, S = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
        const pos = this.pbPts.geometry.attributes.position.array, al = this.pbPts.geometry.attributes.aA.array, v = new THREE.Vector3();
        const cc = (Z.catch0 + Z.catch1) / 2, ca = (Z.catch1 - Z.catch0) / 2, H = this.T.hbar, cz = H ? H.cloud : (Z.b0 + Z.b1) / 2, ch = H ? H.cloud_half : 20;
        this.pb.forEach((p, i) => {
            let z, r, alpha = 0.75;
            const osc = Math.sin(p.w + t * 7.5 * p.f);                     // fast axial bounce in a well
            if (t < TL[1]) {                                                 // arriving as a bunch, slowed by the foil
                const zc = t < 1.1 ? -950 + 949 * (t / 1.1) : -1 + (Z.catch0 + 40) * S(1.1, 2.2, t);
                z = zc + p.u * (t < 1.1 ? 55 : 30); r = p.r * (t < 1.1 ? 2.5 : 2.5 + 3 * S(1.1, 2.2, t)); alpha = 0.95;
            } else if (t < TL[2]) {                                          // caught: bouncing between the HV electrodes
                const k = S(2.2, 3.0, t), start = Z.catch0 + 40 + p.u * 30;
                z = start + ((cc + ca * 0.92 * osc) - start) * k; r = p.r * 5.5;
            } else if (t < TL[3]) {                                          // cooled by electrons and compressed to a small bunch
                const k = S(5, 7.6, t), c = cc + (Z.comp - cc) * k, A = ca * 0.92 + (9 - ca * 0.92) * k;
                z = c + A * osc; r = p.r * (5.5 + (1.3 - 5.5) * k); alpha = 0.75 + 0.2 * k;
            } else if (t < TL[4]) {                                          // moved into the 1 T trap, parked just before the target at A0
                const k = S(8, 10, t), zc = Z.comp + (cz - Z.comp) * k;
                z = zc + p.u * (6 + 24 * Math.sin(Math.PI * k)) + ch * 0.8 * osc * S(9.4, 10.4, t); r = p.r * (1.3 + 1.2 * k); alpha = 0.95;
            } else if (t < TL[8]) {                                          // stored as a cloud (r ~5 mm, ±10 mm) while the antihydrogen is made
                z = cz + ch * 0.85 * osc; r = p.r * 2.5;
                alpha = 0.9 - (t > TL[6] ? 0.25 * S(TL[6], TL[6] + 0.6, t) : 0);       // a share of them leave as antihydrogen
            } else {                                                         // the rest are released through the far end and annihilate there
                const k = S(TL[8], TL[8] + 1.8, t), zc = cz + (Z.out - cz) * k;
                z = zc + ch * osc * (1 - k) + p.u * 40 * k; r = p.r * (2.5 + 4 * k); alpha = 0.7 * (1 - S(Z.end, Z.out, z));
            }
        p.zg = z;
            toCad(r * Math.cos(p.a), r * Math.sin(p.a), z, v); pos.set([v.x, v.y, v.z], i * 3);
            al[i] = alpha;
        });
        this.pbPts.geometry.attributes.position.needsUpdate = true; this.pbPts.geometry.attributes.aA.needsUpdate = true;
        // halo at the bunch centre, as long as the bunch
        let zs = 0, zmin = Infinity, zmax = -Infinity; this.pb.forEach(p => { zs += p.zg; zmin = Math.min(zmin, p.zg); zmax = Math.max(zmax, p.zg); });
        const zc = zs / this.NP; this.centreZ = zc; toCad(0, 0, zc, this.centre);
        this.halo.geometry.attributes.position.array.set([this.centre.x, this.centre.y, this.centre.z]); this.halo.geometry.attributes.position.needsUpdate = true;
        this.haloU.uSize.value = Math.min(260, 30 + (zmax - zmin) * 0.6);
        this.haloU.uA.value = 0.55 * (1 - S(this.Z.end, this.Z.out, zc)) * Math.min(1, (this.zoom || 1) * 2.5);   // fades in the close-ups
    }
    // ---------- the antihydrogen part of the cycle (positrons -> positronium -> lasers -> H̄ -> detector) ----------
    buildHbar(holder) {
        const T = this.T; if (!T.hbar || !T.converter || !T.positronCurve) { this.hx = null; return; }
        const dots = (n, color, size, front = false, maxPx = 26) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(n), 1));
            const u = { uScale: this.pbU.uScale, uOn: this.pbU.uOn, uSize: { value: size }, uMax: { value: maxPx }, uC: { value: new THREE.Color(color) } };
            const pts = new THREE.Points(g, new THREE.ShaderMaterial({
                uniforms: u, transparent: true, depthWrite: false, depthTest: !front, blending: THREE.AdditiveBlending,
                vertexShader: `attribute float aA; uniform float uScale, uSize, uOn, uMax; varying float vA;
                    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uSize * uScale / -mv.z, 2.0, uMax); vA = aA * uOn; }`,
                fragmentShader: `uniform vec3 uC; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 1.6) * vA; gl_FragColor = vec4(uC + 0.25 * a, a); }`
            }));
            pts.frustumCulled = false; pts.renderOrder = 6; holder.add(pts); return pts;
        };
        const H = T.hbar, face = T.converter.z_face, rng = (a, b) => a + Math.random() * (b - a);
        const P = T.positronCurve.map(a => new THREE.Vector3(...a)), L = [0];
        for (let i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
        const acc = (T.positron.parts.find(q => q.id === 'accum') || { z1: P[1].x }).z1;
        const hx = this.hx = { P, L, sAcc: Math.max(0, acc - P[0].x), face, H };
        hx.e = dots(90, 0xc98bff, 22, true);                         // the positron bunch from the accumulator
        hx.eGlow = dots(1, 0xbf5af2, 260, true, 140);              // a glow on its head so it reads from far away
        hx.flash = dots(1, 0xfff2b0, 60, true, 240);               // implant / formation flashes
        hx.ps = dots(160, 0x9cff9c, 2.6, true);                        // positronium leaving the target towards the cloud
        hx.ryd = dots(160, 0x64d2ff, 3.6, true);                      // laser-excited (Rydberg) positronium
        hx.hb = dots(90, 0xffd60a, 10, true);                        // antihydrogen
        hx.hits = dots(40, 0xffd60a, 16, true);                      // where it landed on the detector
        const cone = Math.cos(THREE.MathUtils.degToRad(H.ps_cone || 60));
        hx.psDir = Array.from({ length: 160 }, () => { const c = rng(cone, 1), f = rng(0, Math.PI * 2), sn = Math.sqrt(1 - c * c);
            return { d: [-c, sn * Math.cos(f), sn * Math.sin(f)], v: rng(0.7, 1.3), ryd: Math.random() < 0.45, life: rng(0.8, 1.6) }; });
        const det = T.moire ? T.moire.det : face + 2000;
        hx.det = det;
        hx.hbDat = Array.from({ length: 90 }, (_, i) => ({ y0: rng(-4, 4), z0: rng(-4, 4), straight: i < 40, vy: rng(-1, 1), vz: rng(-1, 1), v: rng(0.85, 1.15), hit: [rng(-18, 18), rng(-18, 18)] }));
        // the two lasers cross the trap just upstream of the target: 205 nm (UV, violet) and 1693 nm (IR, red)
        const beam = (r, color) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 260, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
            m.position.set(H.laser, 0, 0); m.rotation.x = Math.PI / 2; m.renderOrder = 7; holder.add(m); return m; };     // vertical: across the beam, seen from the side
        hx.uv = beam(2.4, 0xb18cff); hx.ir = beam(1.7, 0xff453a); hx.ir.position.x += 1.5;
        hx.dets = 0;
    }
    stepHbar(t, vis) {
        const hx = this.hx; if (!hx) return;
        const S = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
        const set = (pts, f) => { const p = pts.geometry.attributes.position, a = pts.geometry.attributes.aA; for (let i = 0; i < a.count; i++) { const r = f(i); if (r) { p.setXYZ(i, r[0], r[1], r[2]); a.setX(i, r[3]); } else a.setX(i, 0); } p.needsUpdate = a.needsUpdate = true; };
        const along = d => { const L = hx.L, P = hx.P; let k = 1; while (k < L.length - 1 && L[k] < d) k++; const f = (d - L[k - 1]) / (L[k] - L[k - 1]); return P[k - 1].clone().lerp(P[k], Math.min(1, Math.max(0, f))); };
        const tot = hx.L[hx.L.length - 1], cz = hx.H.cloud, face = hx.face;
        // 1) the positron bunch: out of the accumulator, down the line and along the axis onto the target
        const te = S(TL[4] + 0.2, TL[5] - 0.3, t), head = along(hx.sAcc + (tot - hx.sAcc) * te);
        set(hx.e, i => { if (t < TL[4] || t > TL[5] - 0.15) return null; const d = hx.sAcc + (tot - hx.sAcc) * te - i * 6; const q = along(Math.max(hx.sAcc, d)); return [q.x, q.y + Math.sin(i * 2.1) * 5, q.z + Math.cos(i * 1.3) * 5, d < hx.sAcc ? 0 : 0.95 * (1 - i / 110)]; });
        set(hx.eGlow, () => t >= TL[4] && t < TL[5] - 0.15 ? [head.x, head.y, head.z, 0.5] : null);
        // 2) flash on the target, then positronium flies back out in a cone towards the antiproton cloud
        const tp = t - (TL[5] - 0.2), tl = TL[5] + 0.9;                     // implant time, laser time
        const ps = i => { const q = hx.psDir[i], s = tp * 26 * q.v; return [face - 1 + q.d[0] * s, q.d[1] * s * 0.55, q.d[2] * s * 0.55]; };
        set(hx.ps, i => { const q = hx.psDir[i]; if (tp < 0 || (q.ryd && t > tl) || tp > q.life * 1.6 + (q.ryd ? 0 : 0)) return null; const r = ps(i); return [...r, 0.9 * (1 - S(q.life, q.life * 1.6, tp))]; });
        // 3) the lasers fire: the positronium inside them is lifted to Rydberg states and keeps flying into the cloud
        const lf = t > tl - 0.1 && t < tl + 0.7 ? 1 - Math.abs(t - tl - 0.15) / 0.6 : 0;
        hx.uv.material.opacity = 0.7 * Math.max(0, lf) * vis; hx.ir.material.opacity = 0.5 * Math.max(0, lf) * vis;
        set(hx.ryd, i => { const q = hx.psDir[i]; if (!q.ryd || t < tl || t > TL[6] + 0.3) return null; const r = ps(i); r[0] = Math.max(r[0], cz - 6); return [...r, 0.95 * (1 - S(TL[6], TL[6] + 0.3, t))]; });
        // 4) antihydrogen forms in the cloud (flash) and 5) flies downstream: most hit the trap wall, the straight ones reach the detector
        const th = t - TL[6] - 0.15, run = hx.det - cz, tf = (TL[7] - TL[6] - 0.5);
        set(hx.hb, i => { if (th < 0 || t >= TL[8]) return null; const q = hx.hbDat[i], k = Math.min(1, th / tf * q.v), x = cz + run * k * k * 0.15 + run * k * 0.85;
            const off = (x - cz) * 0.02, y = q.y0 + (q.straight ? q.hit[0] * k : q.vy * off * 4), z = q.z0 + (q.straight ? q.hit[1] * k : q.vz * off * 4);
            if (!q.straight && Math.hypot(y, z) > 15) return null;                                   // hit the 15 mm bore: annihilates there
            return [Math.min(x, hx.det - 6), y, z, k >= 1 ? 0.35 : 0.95]; });
        const arrived = t >= TL[6] + 0.15 + tf / 1.15;
        set(hx.hits, i => { if (!arrived || t >= TL[8] + 0.8 || i >= hx.hbDat.length) return null; const q = hx.hbDat[i]; if (!q.straight) return null; return [hx.det - 6, q.hit[0], q.hit[1], 0.9 * (1 - S(TL[8], TL[8] + 0.8, t))]; });
        // flashes: positron implant on the target, antihydrogen formation in the cloud
        const f1 = tp >= 0 && tp < 0.5 ? 1 - tp / 0.5 : 0, f2 = th >= -0.15 && th < 0.6 ? 1 - (th + 0.15) / 0.75 : 0;
        set(hx.flash, () => f1 > 0 ? [face, 0, 0, f1] : f2 > 0 ? [cz, 0, 0, f2] : null);
        // antihydrogen annihilating on the detector: a few events there while it arrives
        if (t < TL[7]) hx.dets = 0;
        if (arrived && t < TL[8] && hx.dets < 4 && t > TL[6] + 0.15 + tf / 1.15 + hx.dets * 0.45) { hx.dets++; this.spawn(hx.det - 6); }
        // the camera: follows the positron bunch down the line, closes in on the target and the cloud (mm scale), then follows the H̄
        if (t >= TL[4] && t < TL[5]) { const k = S(TL[5] - 1.0, TL[5] - 0.2, t); return { x: head.x + ((cz + face) / 2 - head.x) * k, z: head.z * (1 - k), zoom: 0.55 + (0.045 - 0.55) * k }; }
        if (t >= TL[5] && t < TL[6] + 0.6) return { x: (cz + face) / 2, z: 0, zoom: 0.045 };
        if (t >= TL[6] + 0.6 && t < TL[8]) { const k = Math.min(1, Math.max(0, th) / tf); return { x: cz + run * (0.15 * k * k + 0.85 * k), z: 0, zoom: 0.045 + 0.3 * S(0, 0.25, k) }; }
        return null;
    }
    spawn(zAt) {

        const zv = zAt != null ? zAt : Math.min(this.Z.end - 5, this.pb[Math.floor(Math.random() * this.NP)].zg);
        const ev = generate(this.T, this.Bz, zv), pos = [], col = [], tt = [], dim = [];
        const c = new THREE.Color(), v = new THREE.Vector3();
        ev.tracks.forEach(tr => {
            c.setHex(PARTICLES[tr.type].color);
            const neutral = !PARTICLES[tr.type].q, d = neutral ? 0.4 : 1;
            for (let i = 0; i + 1 < tr.ts.length; i++) {
                for (const k of [i, i + 1]) { toCad(tr.pts[3 * k], tr.pts[3 * k + 1], tr.pts[3 * k + 2], v); pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); tt.push(tr.ts[k]); dim.push(d); }
            }
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1)); g.setAttribute('aDim', new THREE.Float32BufferAttribute(dim, 1));
        const u = { uT: { value: -2 }, uFade: { value: 1 } };
        const lines = new THREE.LineSegments(g, new THREE.ShaderMaterial({
            uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
            vertexShader: `attribute float aT; attribute float aDim; varying float vT; varying float vD; varying vec3 vC;
                void main() { vT = aT; vD = aDim; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform float uT, uFade; varying float vT; varying float vD; varying vec3 vC;
                void main() { if (vT > uT) discard; float head = exp(-(uT - vT) * 2.2); float a = vD * uFade * (0.42 + 0.58 * head);
                  gl_FragColor = vec4(vC * (1.0 + 0.8 * head), a); }`
        }));
        lines.frustumCulled = false; this.group.add(lines);
        // hit markers
        const hits = ev.tracks.flatMap(tr => tr.hits).sort((a, b) => a.t - b.t);
        const hp = new Float32Array(hits.length * 3); hits.forEach((h, i) => { toCad(h.pos[0], h.pos[1], h.pos[2], v); hp.set([v.x, v.y, v.z], i * 3); });
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
        const ht = new Float32Array(hits.map(h => h.t)); hg.setAttribute('aT', new THREE.BufferAttribute(ht, 1));
        const hu = { uT: u.uT, uFade: u.uFade, uScale: { value: 400 } };
        const marks = new THREE.Points(hg, new THREE.ShaderMaterial({
            uniforms: hu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            vertexShader: `attribute float aT; uniform float uT, uScale, uFade; varying float vA;
                void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; float age = uT - aT;
                  vA = age < 0.0 ? 0.0 : uFade * exp(-age * 0.6); gl_PointSize = (26.0 + 40.0 * exp(-age * 3.0)) * uScale / -mv.z; }`,
            fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(0.45, 1.0, 0.6, a); }`
        }));
        marks.frustumCulled = false; this.group.add(marks);
        this.events++;
        this.live.push({ lines, marks, u, hu, hits, next: 0, age: 0 });
    }
    stepPositrons(dt, vis, pxScale) {
        const E = this.ep; if (!E) return;
        E.u.uOn.value = vis; E.u.uScale.value = pxScale; E.pts.visible = vis > 0.01; if (vis < 0.01) return;
        E.t += dt * 0.045;
        const pos = E.pts.geometry.attributes.position, tot = E.L[E.L.length - 1], v = new THREE.Vector3();
        E.seed.forEach(([s0, a, b], i) => {
            const d = ((s0 + E.t) % 1) * (this.hx ? this.hx.sAcc : tot); let k = 1;      // a steady trickle from the source fills the accumulator while (k < E.L.length - 1 && E.L[k] < d) k++;
            v.copy(E.P[k - 1]).lerp(E.P[k], (d - E.L[k - 1]) / (E.L[k] - E.L[k - 1]));
            const spread = v.z > 1 || v.x < E.P[E.P.length - 2].x ? 9 : 3;      // a thin beam in the line, tighter on the axis
            pos.setXYZ(i, v.x, v.y + a * spread, v.z + b * spread);
        });
        pos.needsUpdate = true;
    }
    step(dt, vis, pxScale) {
        this.stepPositrons(dt, vis, pxScale);
        this.group.visible = vis > 0.01;
        this.pbU.uOn.value = vis; this.pbU.uScale.value = pxScale; this.pbPts.visible = this.halo.visible = vis > 0.01;
        if (vis > 0.01) {
            this.stepPbars(Math.min(dt, 0.05));
            const look = this.stepHbar(this.cycle, vis);
            if (look) this.centre.set(look.x, 0, look.z);                  // CAD coordinates: the camera follows the action
            // how close the follow camera sits (1 = the whole trap); eased so the cuts never jump
            const zg = look ? look.zoom : 1;
            this.zoom = Math.exp(Math.log(this.zoom || 1) + (Math.log(zg) - Math.log(this.zoom || 1)) * (1 - Math.exp(-dt * 2.2)));
        }
        this.glow.forEach(g => { g.userData.f *= Math.exp(-dt * 3); g.material.opacity = g.userData.f * 0.75 * vis; });
        if (vis < 0.01) return;
        this.clock += dt;
        const st = this.stage();
        // antiproton losses while they are caught, cooled and stored; the leftovers annihilate as they are released
        if (this.clock >= this.period) { this.clock = 0; if (st >= 1 && st !== 7 && (st <= 6 || this.centreZ < this.Z.end)) this.spawn(); }
        this.live.forEach(ev => {
            ev.age += dt; ev.u.uT.value = -1.8 + ev.age * this.speed; ev.hu.uScale.value = pxScale;
            ev.u.uFade.value = vis * (ev.age < 3.4 ? 1 : Math.max(0, 1 - (ev.age - 3.4) / 1.4));
            while (ev.next < ev.hits.length && ev.hits[ev.next].t <= ev.u.uT.value) {
                const h = ev.hits[ev.next++], s = this.stats[h.det];
                s.hits++; s.types[h.type] = (s.types[h.type] || 0) + 1; s.edep.push(h.edep); if (s.edep.length > 800) s.edep.shift();
                if (this.glow[h.det]) this.glow[h.det].userData.f = 1;
                this.onHit && this.onHit(h.det, h);
            }
        });
        this.live = this.live.filter(ev => {
            if (ev.age < 4.8) return true;
            this.group.remove(ev.lines, ev.marks); ev.lines.geometry.dispose(); ev.lines.material.dispose(); ev.marks.geometry.dispose(); ev.marks.material.dispose();
            return false;
        });
    }
}

// ---------- side plots (desktop): hits per detector, and the particle mix and energy deposit of the active one ----------
export class DetectorPlots {
    constructor(el, events) {
        this.el = el; this.ev = events; this.pinned = -1; this.dirty = true; this.t = 0;
        this.active = events.stats.reduce((b, s, i, a) => s.hits > a[b].hits ? i : b, 0);     // start on the busiest arc
        el.innerHTML = `<div class="pl-head"><p class="pl-eyebrow" id="pl-eye">Scintillator</p><h3 id="pl-name">Waiting for a hit</h3><p class="pl-sub" id="pl-sub">Annihilation products crossing the arcs light them up.</p></div>
            <div class="pl-col"><p class="pl-t">Hits per detector</p><canvas id="pl-hits"></canvas></div>
            <div class="pl-col"><p class="pl-t">Particles in this detector</p><canvas id="pl-types"></canvas></div>
            <div class="pl-col"><p class="pl-t">Energy deposited <span>MeV</span></p><canvas id="pl-edep"></canvas></div>`;
        this.cv = ['pl-hits', 'pl-types', 'pl-edep'].map(id => el.querySelector('#' + id));
        this.cv[0].addEventListener('click', e => {
            const r = this.cv[0].getBoundingClientRect(), n = this.ev.stats.length, i = Math.floor((e.clientX - r.left) / r.width * n);
            this.pin(i === this.pinned ? -1 : i);
        });
    }
    hit(det) { if (this.pinned < 0) this.active = det; this.dirty = true; }
    pin(det) { this.pinned = det; if (det >= 0) this.active = det; this.dirty = true; }
    step(dt) {
        this.t += dt; if (!this.dirty || this.t < 0.1) return; this.t = 0; this.dirty = false;
        const cs = getComputedStyle(this.el), ink = cs.getPropertyValue('--text').trim() || '#fff', muted = cs.getPropertyValue('--muted').trim() || '#999', line = cs.getPropertyValue('--line').trim() || 'rgba(255,255,255,.12)';
        const S = this.ev.stats, A = this.active >= 0 ? S[this.active] : null, dpr = Math.min(devicePixelRatio, 2);
        const prep = c => { const w = c.clientWidth, h = c.clientHeight; if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; } const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); return [g, w, h]; };
        // hits per detector
        { const [g, w, h] = prep(this.cv[0]), n = S.length, mx = Math.max(1, ...S.map(s => s.hits)), bw = w / n;
          g.font = '600 9px -apple-system, Inter, sans-serif'; g.textAlign = 'center';
          S.forEach((s, i) => { const bh = (h - 18) * s.hits / mx; g.fillStyle = i === this.active ? '#30d158' : line; g.beginPath(); g.roundRect(i * bw + 2, h - 14 - bh, bw - 4, Math.max(2, bh), 3); g.fill();
            g.fillStyle = i === this.active ? ink : muted; g.fillText(s.name.replace('SC', ''), i * bw + bw / 2, h - 2); }); }
        // particle mix
        { const [g, w, h] = prep(this.cv[1]), keys = CHARGED, tot = A ? Math.max(1, ...keys.map(k => A.types[k] || 0)) : 1, rh = h / keys.length;
          g.font = '600 11px -apple-system, Inter, sans-serif'; g.textBaseline = 'middle';
          keys.forEach((k, i) => { const P = PARTICLES[k], v = A ? A.types[k] || 0 : 0, y = i * rh + rh / 2;
            g.fillStyle = muted; g.textAlign = 'left'; g.fillText(P.label, 0, y);
            g.fillStyle = line; g.beginPath(); g.roundRect(30, y - 5, w - 70, 10, 5); g.fill();
            g.fillStyle = '#' + P.color.toString(16).padStart(6, '0'); g.beginPath(); g.roundRect(30, y - 5, Math.max(v ? 6 : 0, (w - 70) * v / tot), 10, 5); g.fill();
            g.fillStyle = ink; g.textAlign = 'right'; g.fillText(String(v), w, y); }); }
        // energy deposit histogram, 0..12 MeV
        { const [g, w, h] = prep(this.cv[2]), nb = 24, bins = new Array(nb).fill(0), E = A ? A.edep : [];
          E.forEach(e => { const b = Math.min(nb - 1, Math.floor(e / 12 * nb)); bins[b]++; });
          const mx = Math.max(1, ...bins), bw = w / nb;
          bins.forEach((v, i) => { const bh = (h - 16) * v / mx; g.fillStyle = '#64d2ff'; g.globalAlpha = 0.85; g.fillRect(i * bw + 1, h - 14 - bh, bw - 2, bh); });
          g.globalAlpha = 1; g.fillStyle = muted; g.font = '600 9px -apple-system, Inter, sans-serif'; g.textAlign = 'center';
          [0, 3, 6, 9, 12].forEach(x => g.fillText(String(x), Math.min(w - 6, Math.max(6, x / 12 * w)), h - 2)); }
        const name = this.el.querySelector('#pl-name'), sub = this.el.querySelector('#pl-sub');
        if (A) {
            const d = this.ev.T.detectors[this.active];
            name.textContent = A.name + (this.pinned >= 0 ? ' · pinned' : '');
            sub.textContent = `${A.hits} hit${A.hits === 1 ? '' : 's'} · z = ${Math.round(d.z)} mm · ${d.phi0 < 180 ? 'upper' : 'lower'} arc`;
            this.el.querySelector('#pl-eye').textContent = `Scintillator · ${this.ev.events.toLocaleString()} events`;
        }
    }
}
