// 10 kW Faraday cup, rebuilt from the thesis photos (ETP copper cup, Fig. 52): a solid copper cup with a stepped bore,
// a U-shaped cooling groove machined into its back face (open to the rim, the two slots the pipe leaves through),
// a copper pipe pressed into the groove and a copper back plate screwed over it.
// Dimensions are read off the photos, not the drawings, so they are close, not exact.
// The extras: cooling water running through the pipe (cold in, warm out) and the ion beam dumping its heat on the cup floor.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// cup coordinates (u, v across the back face, w along the axis, back face at w = 0) -> page CAD axes:
// the axis lies along CAD x (front towards +x) and the groove opens upwards (towards CAD +z)
const TO_CAD = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
const cad = (u, v, w) => new THREE.Vector3(w, v, -u);

// mm
const R = 40, L = 85;               // outer radius, length
const RB = 25, RC = 31, CB = 8;     // bore, front counterbore radius and depth
const TB = 22;                      // cup floor (back wall thickness)
const GD = 6.6, GW = 7;             // groove depth and width
const A = 10.5, UC = 12;            // groove legs at v = ±A, U turns about (UC, 0)
const RP = 3.175, RI = 2.3;         // 1/4" pipe: outer and inner radius
const TP = 8;                       // back plate thickness
const BOLT = 32;                    // bolt circle on the back

// one face of a body of revolution (2-point profile keeps the edges sharp); points ordered with the solid on the left
function ring(r0, w0, r1, w1, seg = 128) {
    const g = new THREE.LatheGeometry([new THREE.Vector2(r0, w0), new THREE.Vector2(r1, w1)], seg);
    g.rotateX(Math.PI / 2);          // lathe axis y -> cup axis w
    return g.toNonIndexed();
}
// extruded plate between w0 and w1; side walls on the given circles get smooth (radial) normals
function plate(shapes, w0, w1, circles) {
    const g = new THREE.ExtrudeGeometry(shapes, { depth: w1 - w0, bevelEnabled: false, curveSegments: 96 });
    g.translate(0, 0, w0);
    const p = g.attributes.position, n = g.attributes.normal, d = new THREE.Vector2();
    for (let i = 0; i < p.count; i++) {
        if (Math.abs(n.getZ(i)) > 0.5) continue;
        for (const [cx, cy, r] of circles) {
            d.set(p.getX(i) - cx, p.getY(i) - cy);
            if (Math.abs(d.length() - r) > 0.02) continue;
            d.normalize();
            const dot = d.x * n.getX(i) + d.y * n.getY(i);
            if (Math.abs(dot) > 0.7) { const s = Math.sign(dot); n.setXYZ(i, d.x * s, d.y * s, 0); }
            break;
        }
    }
    g.deleteAttribute('uv');
    return g;
}
const hole = (x, y, r) => { const h = new THREE.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); return h; };
const circle = r => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
const merge = (parts) => {
    const g = mergeGeometries(parts.map(x => { x.deleteAttribute('uv'); return x.index ? x.toNonIndexed() : x; }));
    g.applyMatrix4(TO_CAD); g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
};
const BOLTS = [45, 135, 225, 315].map(a => [BOLT * Math.cos(a * Math.PI / 180), BOLT * Math.sin(a * Math.PI / 180)]);
const FRONT = [45, 135, 225, 315].map(a => [35.5 * Math.cos(a * Math.PI / 180), 35.5 * Math.sin(a * Math.PI / 180)]);
// front: alumina isolator ring on the cup face, then the suppressor ring; screws in ceramic top-hat bushes keep it off the cup
const TI = 6, TS = 6, RS = 20;      // isolator and suppressor thickness, suppressor aperture radius

function cupBody() {
    // back layer with the U groove: the island inside the U and the rest of the disc, both reaching the rim
    const ri = A - GW / 2, ro = A + GW / 2;
    const rimU = v => -Math.sqrt(R * R - v * v);
    const island = new THREE.Shape();
    island.moveTo(rimU(ri), ri); island.lineTo(UC, ri);
    island.absarc(UC, 0, ri, Math.PI / 2, -Math.PI / 2, true);
    island.lineTo(rimU(ri), -ri);
    island.absarc(0, 0, R, Math.atan2(-ri, rimU(ri)) + Math.PI * 2, Math.atan2(ri, rimU(ri)), true);
    const outer = new THREE.Shape();
    outer.moveTo(rimU(ro), ro);
    outer.absarc(0, 0, R, Math.atan2(ro, rimU(ro)), Math.atan2(-ro, rimU(ro)), true);
    outer.lineTo(UC, -ro);
    outer.absarc(UC, 0, ro, -Math.PI / 2, Math.PI / 2, false);
    outer.lineTo(rimU(ro), ro);
    BOLTS.forEach(([x, y]) => outer.holes.push(hole(x, y, 2.5)));
    const back = plate([island, outer], 0, GD, [[0, 0, R], [UC, 0, ri], [UC, 0, ro], ...BOLTS.map(([x, y]) => [x, y, 2.5])]);
    // front collar with the counterbore and four tapped holes
    const fb = FRONT;
    const collar = circle(R); collar.holes.push(hole(0, 0, RC)); fb.forEach(([x, y]) => collar.holes.push(hole(x, y, 2.2)));
    const front = plate([collar], L - CB, L, [[0, 0, R], [0, 0, RC], ...fb.map(([x, y]) => [x, y, 2.2])]);
    return merge([
        back, front,
        ring(R, GD, R, L - CB),          // outer wall
        ring(R, L - CB, RB, L - CB),     // step face (and the bottoms of the front holes)
        ring(RB, L - CB, RB, TB),        // bore
        ring(RB, TB, 0, TB),             // floor where the beam lands
        ring(0, GD, R, GD)               // groove floor
    ]);
}
function backPlate() {
    const s = circle(R);
    BOLTS.forEach(([x, y]) => s.holes.push(hole(x, y, 2.75)));
    s.holes.push(hole(31, 0, 4.5));      // the larger hole: signal lead
    return merge([plate([s], -TP, 0, [[0, 0, R], [31, 0, 4.5], ...BOLTS.map(([x, y]) => [x, y, 2.75])])]);
}
function capScrew() {
    // M5 socket cap screw, head on the outside of the plate, hex socket from a 6-sided lathe
    const h0 = -TP - 5, k = 4.2, s = 2.1;
    return merge([
        ring(k, h0, k, h0 + 5, 48),            // head side
        ring(s, h0, k, h0, 48),                // head face
        ring(s, h0 + 2.6, s, h0, 6),           // hex socket wall
        ring(0, h0 + 2.6, s, h0 + 2.6, 6),     // socket bottom
        ring(2.5, h0 + 5, 2.5, 5, 24)          // shank (mostly hidden)
    ]);
}

function isolator() {
    const s = circle(R); s.holes.push(hole(0, 0, 27)); FRONT.forEach(([x, y]) => s.holes.push(hole(x, y, 2.4)));
    return merge([plate([s], L, L + TI, [[0, 0, R], [0, 0, 27], ...FRONT.map(([x, y]) => [x, y, 2.4])])]);
}
function suppressor() {
    const s = circle(R); s.holes.push(hole(0, 0, RS)); FRONT.forEach(([x, y]) => s.holes.push(hole(x, y, 3.2)));
    return merge([plate([s], L + TI, L + TI + TS, [[0, 0, R], [0, 0, RS], ...FRONT.map(([x, y]) => [x, y, 3.2])])]);
}
function bush() {
    // top-hat bush: sleeve through the suppressor, flange on top, so the screw never touches the suppressor
    const w0 = L + TI + 0.2, w1 = L + TI + TS, w2 = w1 + 2;
    return merge([
        ring(3.0, w0, 3.0, w1, 32), ring(2.1, w0, 3.0, w0, 32), ring(3.0, w1, 4.6, w1, 32),
        ring(4.6, w1, 4.6, w2, 32), ring(4.6, w2, 2.1, w2, 32), ring(2.1, w2, 2.1, w0, 32)
    ]);
}
function frontScrew() {
    // M4 socket cap screw seated on the bush, threaded into the cup face
    const w0 = L + TI + TS + 2, k = 3.5, s = 1.5;
    return merge([
        ring(k, w0, k, w0 + 4, 40), ring(k, w0 + 4, s, w0 + 4, 40),
        ring(s, w0 + 4, s, w0 + 1.8, 6), ring(s, w0 + 1.8, 0, w0 + 1.8, 6),
        ring(2, L - 6, 2, w0, 20)
    ]);
}

// the pipe's centre line, CAD coordinates: in from the back, down through the slot, round the U, out the other slot
class Arc extends THREE.Curve {
    constructor() { super(); }
    getPoint(t, out = new THREE.Vector3()) { const a = Math.PI / 2 - t * Math.PI; return out.copy(cad(UC + A * Math.cos(a), A * Math.sin(a), GD / 2)); }
}
function pipePath() {
    const wc = GD / 2, ux = -R - 15, wEnd = -95, P = new THREE.CurvePath();
    const L3 = (a, b) => P.add(new THREE.LineCurve3(a, b));
    const Q3 = (a, c, b) => P.add(new THREE.QuadraticBezierCurve3(a, c, b));
    L3(cad(ux, A, wEnd), cad(ux, A, wc - 15));
    Q3(cad(ux, A, wc - 15), cad(ux, A, wc), cad(-R + 1, A, wc));
    L3(cad(-R + 1, A, wc), cad(UC, A, wc));
    P.add(new Arc());
    L3(cad(UC, -A, wc), cad(-R + 1, -A, wc));
    Q3(cad(-R + 1, -A, wc), cad(ux, -A, wc), cad(ux, -A, wc - 15));
    L3(cad(ux, -A, wc - 15), cad(ux, -A, wEnd));
    const lens = P.getCurveLengths(), total = P.getLength();
    return { path: P, total, inS: lens[1] - 1, outS: lens[4] + 1, ends: [cad(ux, A, wEnd), cad(ux, -A, wEnd)] };
}
function pipe(pp) {
    const tube = new THREE.TubeGeometry(pp.path, 700, RP, 24, false);
    // open ends: a copper lip and a short bore so the ends read as tube, not rod
    const lip = [ring(RP, 0, RI, 0, 24), ring(RI, 0, RI, -14, 24)].map(g => g.rotateY(-Math.PI / 2));
    const ends = pp.ends.flatMap(e => lip.map(g => g.clone().translate(e.x, e.y, e.z)));
    const g = mergeGeometries([tube.toNonIndexed(), ...ends].map(x => { if (x.attributes.uv) x.deleteAttribute('uv'); return x; }));
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
}

export function hpfcData() {
    const pp = pipePath();
    const groups = [
        { label: 'Cup body', kind: 'copper', material: 'ETP copper', count: 1, id: 'cup-body', blurb: 'One piece of electrolytic copper. The beam stops on the floor of the bore, and copper spreads the heat fast towards the cooling groove machined into the back.' },
        { label: 'Cooling pipe', kind: 'copper', material: 'Copper tube', count: 1, id: 'cooling-pipe', blurb: 'Copper tube bent into a U and pressed into the groove at the back. Water flows in through one slot and out through the other, carrying away up to around 10 kW.' },
        { label: 'Back plate', kind: 'copper', material: 'ETP copper', count: 1, id: 'back-plate', blurb: 'Copper plate screwed over the back of the cup. It clamps the pipe into its groove for good thermal contact, and carries a hole for the signal lead.' },
        { label: 'Cap screws', kind: 'fastener', material: 'Stainless steel', count: 4, id: 'cap-screws', blurb: 'Socket cap screws holding the back plate on.' },
        { label: 'Ceramic isolator', kind: 'ceramic', material: 'Alumina (Al₂O₃)', count: 1, id: 'ceramic-isolator', blurb: 'Alumina ring between the cup and the suppressor. It holds them apart and keeps the suppressor bias off the cup.' },
        { label: 'Suppressor ring', kind: 'steel', material: 'Stainless steel', count: 1, id: 'suppressor-ring', blurb: 'Ring electrode at the mouth of the cup, biased negative. Secondary electrons knocked out of the copper are turned back into the cup, so they do not distort the measured current.' },
        { label: 'Ceramic bushes', kind: 'ceramic', material: 'Alumina (Al₂O₃)', count: 4, id: 'ceramic-bushes', blurb: 'Top-hat bushes in the suppressor holes. The screws sit on them, so the suppressor stays isolated from the cup.' },
        { label: 'Suppressor screws', kind: 'fastener', material: 'Stainless steel', count: 4, id: 'suppressor-screws', blurb: 'Socket cap screws through the bushes and the isolator into the tapped holes on the cup face.' }
    ];
    const geo = [cupBody(), pipe(pp), backPlate(), capScrew(), isolator(), suppressor(), bush(), frontScrew()];
    const I = new THREE.Matrix4().elements.slice();
    const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z).transpose().elements.slice();
    const instances = [
        { name: 'Cup', g: 0, geo: 0, m: I },
        { name: 'Pipe', g: 1, geo: 1, m: I },
        { name: 'Back plate', g: 2, geo: 2, m: I },
        ...BOLTS.map(([u, v], k) => { const c = cad(u, v, 0); return { name: 'Screw ' + (k + 1), g: 3, geo: 3, m: at(c.x, c.y, c.z) }; }),
        { name: 'Isolator', g: 4, geo: 4, m: I },
        { name: 'Suppressor', g: 5, geo: 5, m: I },
        ...FRONT.map(([u, v], k) => { const c = cad(u, v, 0); return { name: 'Bush ' + (k + 1), g: 6, geo: 6, m: at(c.x, c.y, c.z) }; }),
        ...FRONT.map(([u, v], k) => { const c = cad(u, v, 0); return { name: 'Front screw ' + (k + 1), g: 7, geo: 7, m: at(c.x, c.y, c.z) }; })
    ];
    const explode = [0, [-40, 0, 62], [-82, 0, 0], ...BOLTS.map(() => [-128, 0, 0]),
        [38, 0, 0], [76, 0, 0], ...FRONT.map(() => [106, 0, 0]), ...FRONT.map(() => [140, 0, 0])];
    return {
        name: '10 kW Faraday cup', procedural: true, cooling: pp,
        blurb: 'A water-cooled copper Faraday cup for 20–30 mA ion beams, with a suppressor ring on a ceramic isolator at the front. Water runs through a pipe in a groove at the back and carries the beam power away.',
        groups, instances, explode, geo, geoms: geo.map(() => ({})), systems: []
    };
}

// ---------- the extras: cooling water and the beam's heat ----------
const COLD = new THREE.Color(0x0a84ff), WARM = new THREE.Color(0xff8a1f);
export class CoolingFlow {
    constructor(M, holder) {
        const pp = M.data.cooling;
        this.holder = new THREE.Group(); holder.add(this.holder);
        this.u = {
            uOn: { value: 0 }, uTime: { value: 0 }, uLen: { value: pp.total }, uIn: { value: pp.inS }, uOut: { value: pp.outS },
            uCold: { value: COLD }, uWarm: { value: WARM }, uHeat: { value: 0 }, uA: { value: 1 }
        };
        // water: a tube just inside the pipe's bore. Streaks move with the flow and the colour warms along the groove.
        const wgeo = new THREE.TubeGeometry(pp.path, 700, RI * 0.96, 16, false);
        const vs = `varying vec2 vUv; varying vec3 vN, vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
        const fs = `uniform float uOn, uTime, uLen, uIn, uOut, uHeat, uA; uniform vec3 uCold, uWarm; varying vec2 vUv; varying vec3 vN, vV;
            float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
            void main() {
                float s = vUv.x * uLen;                        // mm along the pipe
                float x = s - uTime * 70.0;                    // the water moves at a visible pace
                float k = floor(x / 9.0), f = fract(x / 9.0);
                float streak = smoothstep(0.0, 0.25, f) * (1.0 - smoothstep(0.35, 0.9, f));
                float ang = vUv.y * 6.2832, bub = step(0.82, h(k + floor(ang * 1.2) * 13.0)) * streak;
                float t = clamp((s - uIn) / (uOut - uIn), 0.0, 1.0) * uHeat;   // picks up heat along the groove
                vec3 c = mix(uCold, uWarm, smoothstep(0.0, 1.0, t));
                float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
                vec3 col = c * (0.75 + 0.35 * streak) + vec3(1.0) * (0.45 * bub + 0.25 * rim);
                gl_FragColor = vec4(col, uOn * uA * (0.62 + 0.3 * streak + 0.2 * rim));
            }`;
        const mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false });
        const water = new THREE.Mesh(wgeo, mat); water.renderOrder = 3;
        // a faint x-ray copy shows the water where the cup and plate hide the pipe
        const gu = { ...this.u, uA: { value: 0.32 } };
        const ghost = new THREE.Mesh(wgeo, new THREE.ShaderMaterial({ uniforms: gu, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false }));
        ghost.renderOrder = 4;
        this.holder.add(ghost, water);

        // the beam: ions streaming into the bore and stopping on the floor
        const N = 420, pos = new Float32Array(N * 3), seed = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const r = 15 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
            pos.set([0, r * Math.cos(a), r * Math.sin(a)], 3 * i); seed[i] = Math.random();
        }
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
        this.bu = { uTime: this.u.uTime, uOn: { value: 0 }, uScale: { value: 400 }, x0: { value: L + 160 }, x1: { value: TB + 0.6 } };
        this.beam = new THREE.Points(bg, new THREE.ShaderMaterial({
            uniforms: this.bu, transparent: true, depthWrite: false,
            vertexShader: `attribute float aSeed; uniform float uTime, uScale, uOn, x0, x1; varying float vA;
                void main() { float s = fract(aSeed + uTime * 0.5); vec3 p = position; p.x = mix(x0, x1, s); p.yz *= 1.0 - 0.25 * s;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
                    gl_PointSize = 2.2 * uScale / -mv.z; vA = uOn * smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(0.96, 1.0, s)); }`,
            fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(0.42, 0.5, 1.0, a * 0.9); }`
        }));
        this.beam.renderOrder = 2; this.holder.add(this.beam);
        // where it lands: a glowing patch on the cup floor
        const spot = new THREE.Mesh(new THREE.CircleGeometry(RB * 0.98, 48), new THREE.ShaderMaterial({
            uniforms: { uOn: this.bu.uOn, uTime: this.u.uTime }, transparent: true, depthWrite: false,
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform float uOn, uTime; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; float g = exp(-d * d * 3.2) * (0.9 + 0.1 * sin(uTime * 19.0));
                vec3 c = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.85, 0.5), g); gl_FragColor = vec4(c, uOn * g * 0.85); }`
        }));
        spot.rotation.y = Math.PI / 2; spot.position.set(TB + 0.15, 0, 0); spot.renderOrder = 2;
        this.holder.add(spot);
        // secondary electrons: knocked out of the floor, they fly towards the mouth and the suppressor's field turns them back
        const NE = 90, ep = new Float32Array(NE * 3), es = new Float32Array(NE);
        for (let i = 0; i < NE; i++) { const a = Math.random() * Math.PI * 2, r = 13 * Math.sqrt(Math.random()); ep.set([Math.cos(a), Math.sin(a), r], 3 * i); es[i] = Math.random(); }
        const eg = new THREE.BufferGeometry();
        eg.setAttribute('position', new THREE.BufferAttribute(ep, 3)); eg.setAttribute('aSeed', new THREE.BufferAttribute(es, 1));
        this.eu = { uTime: this.u.uTime, uOn: { value: 0 }, uScale: this.bu.uScale, x0: { value: TB + 0.5 }, x1: { value: L + TI + TS * 0.5 } };
        this.elec = new THREE.Points(eg, new THREE.ShaderMaterial({
            uniforms: this.eu, transparent: true, depthWrite: false, depthTest: false,
            vertexShader: `attribute float aSeed; uniform float uTime, uScale, uOn, x0, x1; varying float vA;
                void main() { float s = fract(aSeed + uTime * 0.38); float h = 4.0 * s * (1.0 - s);      // out and back: turns near the suppressor
                    float reach = mix(0.72, 1.0, fract(aSeed * 7.3));
                    float r = position.z + 9.0 * h * fract(aSeed * 3.1);
                    vec3 p = vec3(mix(x0, x1, h * reach), position.x * r, position.y * r);
                    vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
                    gl_PointSize = 2.3 * uScale / -mv.z; vA = uOn * smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.94, 1.0, s)); }`,
            fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(0.19, 0.82, 0.35, a); }`
        }));
        this.elec.renderOrder = 5; this.holder.add(this.elec);
        this.holder.visible = false;
    }
    step(water, heat, time, pxScale, sup = 0) {
        this.eu.uOn.value = sup; this.elec.visible = sup > 0.01;
        this.u.uOn.value = water; this.u.uTime.value = time; this.u.uHeat.value = Math.max(heat, water > 0 ? 1 : 0);
        this.bu.uOn.value = heat; this.bu.uScale.value = pxScale;
        this.beam.visible = heat > 0.01;
        this.holder.visible = water > 0.01 || heat > 0.01 || sup > 0.01;
    }
}
