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
export const STAGES = ['Arriving from the decelerator', 'Caught in the 5 T trap', 'Compressed between two electrodes', 'Pulsed out towards 1 T', 'Expanding in the 1 T trap', 'Leaving through the far end'];

// ---------- geometry as page model data (same shape as the CAD models) ----------
export async function penningData(base) {
    const T = await (await fetch(base + 'penning.json')).json();
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
    const add = (gi, geoIdx, z, ex, name) => {
        const m = new THREE.Matrix4().makeTranslation(z, 0, 0);
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
    // detectors: remember which instance is which
    return {
        name: 'AEgIS Penning trap', procedural: true, trap: T,
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
        this.live = []; this.clock = 0.6; this.period = 0.8; this.speed = 5.2;        // ns of event time per second shown
        this.group = new THREE.Group(); holder.add(this.group);
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
        this.cycle = 0; this.CYCLE = 15;
        this.NP = 300; this.pb = []; const pp = new Float32Array(this.NP * 3), pa = new Float32Array(this.NP);
        const gauss = () => { let a = 0; for (let i = 0; i < 6; i++) a += Math.random(); return (a - 3) / 0.7071; };
        for (let i = 0; i < this.NP; i++) this.pb.push({ u: gauss(), r: Math.abs(gauss()) * 0.7, a: rnd(0, Math.PI * 2), w: rnd(0, Math.PI * 2), f: rnd(0.8, 1.25), zg: 0 });
        const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('aA', new THREE.BufferAttribute(pa, 1));
        this.pbU = { uScale: { value: 400 }, uOn: { value: 0 } };
        this.pbPts = new THREE.Points(pg, new THREE.ShaderMaterial({
            uniforms: this.pbU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            vertexShader: `attribute float aA; uniform float uScale, uOn; varying float vA;
                void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(3.5, 6.0 * uScale / -mv.z); vA = aA * uOn; }`,
            fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(0.86, 0.9, 1.0, a); }`
        }));
        // a soft halo around the bunch, sized to it, so it reads even when the whole trap is in view
        this.haloU = { uScale: this.pbU.uScale, uOn: this.pbU.uOn, uSize: { value: 60 }, uA: { value: 0.5 } };
        const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
        this.halo = new THREE.Points(hg, new THREE.ShaderMaterial({
            uniforms: this.haloU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
            vertexShader: `uniform float uScale, uSize; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(26.0, uSize * uScale / -mv.z); }`,
            fragmentShader: `uniform float uOn, uA; void main() { float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 2.2) * uA * uOn; gl_FragColor = vec4(0.62, 0.72, 1.0, a); }`
        }));
        this.halo.frustumCulled = false; holder.add(this.halo);
        this.centre = new THREE.Vector3();
        this.pbPts.frustumCulled = false; holder.add(this.pbPts);
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
        const t = this.cycle;
        return t < 2.2 ? 0 : t < 5 ? 1 : t < 8 ? 2 : t < 9.6 ? 3 : t < 12 ? 4 : 5;
    }
    stepPbars(dt) {
        this.cycle = (this.cycle + dt) % this.CYCLE;
        const t = this.cycle, Z = this.Z, S = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
        const pos = this.pbPts.geometry.attributes.position.array, al = this.pbPts.geometry.attributes.aA.array, v = new THREE.Vector3();
        const cc = (Z.catch0 + Z.catch1) / 2, ca = (Z.catch1 - Z.catch0) / 2, bc = (Z.b0 + Z.b1) / 2, ba = (Z.b1 - Z.b0) / 2;
        this.pb.forEach((p, i) => {
            let z, r, alpha = 0.75;
            const osc = Math.sin(p.w + t * 7.5 * p.f);                     // fast axial bounce in a well
            if (t < 2.2) {                                                   // arriving as a bunch, slowed by the foil
                const zc = t < 1.1 ? -950 + 949 * (t / 1.1) : -1 + (Z.catch0 + 40) * S(1.1, 2.2, t);
                z = zc + p.u * (t < 1.1 ? 55 : 30); r = p.r * (t < 1.1 ? 2.5 : 2.5 + 3 * S(1.1, 2.2, t)); alpha = 0.95;
            } else if (t < 5) {                                              // caught: bouncing between the HV electrodes
                const k = S(2.2, 3.0, t), start = Z.catch0 + 40 + p.u * 30;
                z = start + ((cc + ca * 0.92 * osc) - start) * k; r = p.r * 5.5;
            } else if (t < 8) {                                              // compressed to a small bunch between two electrodes
                const k = S(5, 7.6, t), c = cc + (Z.comp - cc) * k, A = ca * 0.92 + (9 - ca * 0.92) * k;
                z = c + A * osc; r = p.r * (5.5 + (1.3 - 5.5) * k); alpha = 0.75 + 0.2 * k;
            } else if (t < 9.6) {                                            // pulsed out towards the 1 T trap
                const k = S(8, 9.6, t), zc = Z.comp + (bc - Z.comp) * k;
                z = zc + p.u * (6 + 34 * k); r = p.r * (1.3 + 1.6 * S(0.55, 1, k)); alpha = 0.95;
            } else if (t < 12) {                                             // expanding in the 1 T trap (radius x ~sqrt(5/1))
                const k = S(9.6, 11.2, t), A = 20 + (ba * 0.9 - 20) * k;
                z = bc + A * osc; r = p.r * (2.9 + 3.2 * k);
            } else {                                                         // released: the cloud drifts out through the far end and is gone
                const k = S(12, 14.2, t), A = ba * 0.9 * (1 - S(12, 12.8, t)), zc = bc + (Z.out - bc) * k;
                z = zc + A * osc + p.u * 40 * k; r = p.r * (6.1 + 3 * k); alpha = 0.8 * (1 - S(Z.end, Z.out, z));
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
        this.haloU.uA.value = 0.55 * (1 - S(this.Z.end, this.Z.out, zc));
    }
    spawn() {
        const zv = Math.min(this.Z.end - 5, this.pb[Math.floor(Math.random() * this.NP)].zg);
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
    step(dt, vis, pxScale) {
        this.group.visible = vis > 0.01;
        this.pbU.uOn.value = vis; this.pbU.uScale.value = pxScale; this.pbPts.visible = this.halo.visible = vis > 0.01;
        if (vis > 0.01) this.stepPbars(Math.min(dt, 0.05));
        this.glow.forEach(g => { g.userData.f *= Math.exp(-dt * 3); g.material.opacity = g.userData.f * 0.75 * vis; });
        if (vis < 0.01) return;
        this.clock += dt;
        const st = this.stage();
        if (this.clock >= this.period) { this.clock = 0; if (st >= 1 && (st <= 4 || this.centreZ < this.Z.end)) this.spawn(); }
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
