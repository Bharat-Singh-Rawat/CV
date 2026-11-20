// 10 kW Faraday cup, rebuilt from the thesis photos (Figs. 52, 56, 57): a solid ETP copper cup with a stepped bore, a suppressor
// ring on an alumina isolator at the front, and a copper tube brazed round the outside as a cooling coil. The cup hangs on
// ceramic standoffs from a steel arm; the arm runs through two edge-welded bellows and a pneumatic cylinder pushes it
// into the beam and pulls it out again.
// Dimensions are read off the photos, not the drawings, so they are close, not exact.
// The extras: cooling water through the coil (cold in, warm out), the beam's heat on the cup floor, secondary electrons
// turned back by the suppressor, and the drive stroke.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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

// ---------- where things are (CAD axes, mm) ----------
// The drive axis is CAD x: the mounting flange's vacuum face at x = 0, the vacuum side towards +x.
// The cup sits in front of the end of the arm with its mouth towards -y, i.e. facing the viewer;
// the beam runs along +y (into the screen) through x = XC.
// Every part is modelled with the cup in the beam; the drive pulls the moving parts back by up to STROKE.
const XC = 230, YC = -29, STROKE = 80;
const CUP_M = new THREE.Matrix4().makeTranslation(XC, YC, 0).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2));
const cupPt = (u, v, w) => cad(u, v, w).applyMatrix4(CUP_M);       // cup coordinates -> CAD
const RCOIL = R + RP;                                               // tube centre, brazed on the outer wall
const COIL_W0 = 74, COIL_W1 = 14, TURNS = 5;                        // the coil runs from near the mouth back to near the back
const LEAD = [[-18, 16], [-18, -16]];                               // (y, z) of the two leads, along the arm

// plain merge for parts modelled straight in CAD axes
const mergeRaw = parts => {
    const g = mergeGeometries(parts.map(x => { if (x.attributes.uv) x.deleteAttribute('uv'); return x.index ? x.toNonIndexed() : x; }));
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
};
const alongX = (g) => g.rotateZ(-Math.PI / 2);                       // three.js primitives along y -> along CAD x
const rod = (r, x0, x1, y = 0, z = 0, seg = 32) => alongX(new THREE.CylinderGeometry(r, r, x1 - x0, seg)).translate((x0 + x1) / 2, y, z);
const box = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

// round flange plate along x, from x = 0 to thick (vacuum-style: bolt circle, optional guide holes for the tie rods)
const RODS = [45, 135, 225, 315].map(a => [60 * Math.cos(a * Math.PI / 180), 60 * Math.sin(a * Math.PI / 180)]);
function flange(ro, ri, thick, bolts = 0, guides = false) {
    const s = circle(ro), cs = [[0, 0, ro]];
    if (ri) { s.holes.push(hole(0, 0, ri)); cs.push([0, 0, ri]); }
    for (let k = 0; k < bolts; k++) { const a = (k + 0.5) / bolts * Math.PI * 2, x = (ro - 9) * Math.cos(a), y = (ro - 9) * Math.sin(a); s.holes.push(hole(x, y, 3.4)); cs.push([x, y, 3.4]); }
    if (guides) RODS.forEach(([x, y]) => { s.holes.push(hole(x, y, 4.6)); cs.push([x, y, 4.6]); });
    return merge([plate([s], 0, thick, cs)]);
}
// edge-welded bellows: a zig-zag of thin plates, modelled over unit length along x (scaled as it compresses)
function bellows(ri, ro, n = 26) {
    const pts = [];
    for (let k = 0; k <= 2 * n; k++) pts.push(new THREE.Vector2(k % 2 ? ro : ri, k / (2 * n)));
    const g = new THREE.LatheGeometry(pts, 96); g.rotateZ(-Math.PI / 2);
    // closed tube inside (thin wall), so a cut shows a wall, not a hole
    const inner = new THREE.LatheGeometry([new THREE.Vector2(ri, 1), new THREE.Vector2(ri, 0)], 96); inner.rotateZ(-Math.PI / 2);
    return mergeRaw([g, inner]);
}

// cooling coil: in along the arm, round the cup five times (mouth end first), back out along the arm
class Helix extends THREE.Curve {
    getPoint(t, out = new THREE.Vector3()) {
        const a = -Math.PI / 2 + t * TURNS * Math.PI * 2, w = COIL_W0 + (COIL_W1 - COIL_W0) * t;
        return out.copy(cupPt(RCOIL * Math.cos(a), RCOIL * Math.sin(a), w));
    }
}
function coilPath() {
    const P = new THREE.CurvePath(), H = new Helix();
    const xEnd = -175, xBend = XC - RCOIL - 60;
    const a0 = new THREE.Vector3(xEnd, LEAD[0][0], LEAD[0][1]), a1 = new THREE.Vector3(xBend, LEAD[0][0], LEAD[0][1]);
    const b1 = new THREE.Vector3(xBend, LEAD[1][0], LEAD[1][1]), b0 = new THREE.Vector3(xEnd, LEAD[1][0], LEAD[1][1]);
    const h0 = H.getPoint(0), h1 = H.getPoint(1), t0 = H.getTangent(0), t1 = H.getTangent(1);
    P.add(new THREE.LineCurve3(a0, a1));
    P.add(new THREE.CubicBezierCurve3(a1, a1.clone().add(new THREE.Vector3(40, 0, 0)), h0.clone().addScaledVector(t0, -40), h0));
    P.add(H);
    P.add(new THREE.CubicBezierCurve3(h1, h1.clone().addScaledVector(t1, 40), b1.clone().add(new THREE.Vector3(40, 0, 0)), b1));
    P.add(new THREE.LineCurve3(b1, b0));
    const lens = P.getCurveLengths(), total = P.getLength();
    return { path: P, total, inS: lens[1], outS: lens[2], ends: [a0, b0] };
}
function coil(pp) {
    const tube = new THREE.TubeGeometry(pp.path, 900, RP, 20, false);
    // open ends: a copper lip and a short bore so the ends read as tube, not rod (the ends point along -x)
    const lip = [ring(RP, 0, RI, 0, 24), ring(RI, 0, RI, -14, 24)].map(g => g.rotateY(-Math.PI / 2));
    const ends = pp.ends.flatMap(e => lip.map(g => g.clone().translate(e.x, e.y, e.z)));
    return mergeRaw([tube, ...ends]);
}

// drive (positions with the cup in the beam)
const XF = 0, TF = 20;                       // mounting flange, vacuum face at x = 0
const XM = -74, TM = 20, XR = -148, TR = 18; // middle and rear (moving) bellows flanges: two equal bellows
const XA = -270, TA = 10;                    // actuator plate
const CYL0 = -470;                           // back of the pneumatic cylinder

function cylinderBody() {
    const body = new RoundedBoxGeometry(XA - CYL0 - 36, 62, 62, 4, 5); body.translate((XA + CYL0) / 2, 0, 0);
    const capA = new RoundedBoxGeometry(18, 68, 68, 3, 4); capA.translate(XA - 9, 0, 0);
    const capB = new RoundedBoxGeometry(18, 68, 68, 3, 4); capB.translate(CYL0 + 9, 0, 0);
    return mergeRaw([body, capA, capB]);
}
function fittings() {   // push-in air fittings on the end caps
    const up = (r, h, z, seg) => new THREE.CylinderGeometry(r, r, h, seg).rotateX(Math.PI / 2);
    return mergeRaw([XA - 9, CYL0 + 9].flatMap(x => [up(4.5, 10, 0, 24).translate(x, 0, 39), up(6, 5, 0, 6).translate(x, 0, 35.5)]));
}
function pistonRod() {
    const b = XR - TR, nut = new THREE.CylinderGeometry(13, 13, 14, 6); alongX(nut).translate(b - 7, 0, 0);
    return mergeRaw([rod(8, b - 190, b), nut]);
}
function shaftArm() {
    return mergeRaw([
        rod(10, XR, 112),                                  // shaft through the bellows
        box(96, 126, -13, 13, -15, 15),                    // clamp block (clears the flange when parked)
        box(110, XC + 36, -4, 4, -12.5, 12.5)              // flat bar out to the cup
    ]);
}
const cupBracket = () => mergeRaw([box(XC - 36, XC + 36, -9, -4, -30, 30)]);
const standoff = () => mergeRaw([new THREE.CylinderGeometry(6, 6, 12, 32).translate(0, -15, 0)]);
const tieRod = () => mergeRaw([rod(4, XA + TA, XF - TF, 0, 0, 20),
    alongX(new THREE.CylinderGeometry(7.5, 7.5, 6, 6)).translate(XA + TA + 3, 0, 0), alongX(new THREE.CylinderGeometry(7.5, 7.5, 6, 6)).translate(XF - TF - 3, 0, 0)]);

export function hpfcData() {
    const pp = coilPath();
    const G = [
        ['Cup body', 'copper', 'ETP copper', 'One piece of electrolytic copper. The beam stops on the floor of the bore, and copper spreads the heat fast to the cooling coil on the outside.'],
        ['Cooling coil', 'copper', 'Copper tube, brazed', 'Copper tube brazed round the outside of the cup in five turns. Water comes in along the arm, goes round the cup and leaves warm, carrying away up to around 10 kW.'],
        ['Back plate', 'copper', 'ETP copper', 'Copper plate screwed over the back of the cup, with a hole for the signal lead.'],
        ['Cap screws', 'fastener', 'Stainless steel', 'Socket cap screws holding the back plate on.'],
        ['Ceramic isolator', 'ceramic', 'Alumina (Al₂O₃)', 'Alumina ring between the cup and the suppressor. It holds them apart and keeps the suppressor bias off the cup.'],
        ['Suppressor ring', 'steel', 'Stainless steel', 'Ring electrode at the mouth of the cup, biased negative. Secondary electrons knocked out of the copper are turned back into the cup, so they do not distort the measured current.'],
        ['Ceramic bushes', 'ceramic', 'Alumina (Al₂O₃)', 'Top-hat bushes in the suppressor holes. The screws sit on them, so the suppressor stays isolated from the cup.'],
        ['Suppressor screws', 'fastener', 'Stainless steel', 'Socket cap screws through the bushes and the isolator into the tapped holes on the cup face.'],
        ['Ceramic standoffs', 'ceramic', 'Alumina (Al₂O₃)', 'The cup hangs from the arm on two ceramic standoffs, so its only path to ground is the signal lead.'],
        ['Cup bracket', 'steel', 'Stainless steel', 'Plate at the end of the arm that carries the cup.'],
        ['Arm and shaft', 'steel', 'Stainless steel', 'Shaft through the bellows and a flat bar out to the cup. The whole arm moves with the cylinder.'],
        ['Mounting flange', 'steel', 'Stainless steel', 'Bolts to the vacuum chamber. Everything to the right of it is inside the vacuum.'],
        ['Edge-welded bellows', 'bellows', 'Stainless steel, edge-welded', 'Two bellows let the arm slide in and out while keeping the vacuum sealed.'],
        ['Bellows flanges', 'steel', 'Stainless steel', 'Flanges between and behind the bellows. The rear one is pushed by the cylinder, the middle one rides halfway.'],
        ['Tie rods', 'steel', 'Stainless steel', 'Rods from the mounting flange to the actuator plate. The moving flanges slide on them, so the arm cannot twist.'],
        ['Actuator plate', 'steel', 'Stainless steel', 'Holds the pneumatic cylinder at the end of the tie rods.'],
        ['Pneumatic cylinder', 'alu', 'Anodised aluminium', 'Compressed air drives the piston: the cup goes into the beam to measure and comes out again to let the beam through.'],
        ['Piston rod', 'steel', 'Stainless steel', 'Couples the cylinder to the rear bellows flange.'],
        ['Air fittings', 'fitting', 'Push-in fittings', 'Air in and out of the two ends of the cylinder.']
    ];
    const groups = G.map(([label, kind, material, blurb]) => ({ label, kind, material, blurb, count: 0, id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
    const gi = l => G.findIndex(x => x[0] === l);
    const geo = [], instances = [], explode = [];
    const add = (label, g, m, ex, drive) => {
        let k = geo.indexOf(g); if (k < 0) { k = geo.length; geo.push(g); }
        const i = gi(label); groups[i].count++;
        instances.push({ name: label, g: i, geo: k, m: m.clone().transpose().elements.slice(), drive });
        explode.push(ex);
    };
    const I = new THREE.Matrix4(), T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
    const cupAt = (u, v) => CUP_M.clone().multiply(T(...cad(u, v, 0).toArray()));
    // exploded: the cup comes off the arm (+x), its front parts out of the mouth towards the viewer, its back parts back towards the arm;
    // the drive spreads back along -x
    const CUPX = 120, up = d => [CUPX, d, 0], down = d => [CUPX + d * 0.9, -d, 0];
    const MOV = { move: 1 };
    add('Cup body', cupBody(), CUP_M, [CUPX, 0, 0], MOV);
    add('Back plate', backPlate(), CUP_M, up(40), MOV);
    const sc = capScrew(); BOLTS.forEach(([u, v]) => add('Cap screws', sc, cupAt(u, v), up(62), MOV));
    add('Ceramic isolator', isolator(), CUP_M, down(40), MOV);
    add('Suppressor ring', suppressor(), CUP_M, down(76), MOV);
    const bu = bush(), fs = frontScrew();
    FRONT.forEach(([u, v]) => add('Ceramic bushes', bu, cupAt(u, v), down(106), MOV));
    FRONT.forEach(([u, v]) => add('Suppressor screws', fs, cupAt(u, v), down(140), MOV));
    add('Cooling coil', coil(pp), I, [CUPX + 40, 0, 110], MOV);
    const so = standoff(); [-18, 18].forEach(dx => add('Ceramic standoffs', so, T(XC + dx, 0, 0), [CUPX * 0.6, 22, 0], MOV));
    add('Cup bracket', cupBracket(), I, [CUPX * 0.4, 40, 0], MOV);
    add('Arm and shaft', shaftArm(), I, [0, 0, 0], MOV);
    add('Mounting flange', flange(76, 32, TF, 8, true), T(XF - TF, 0, 0), [-40, 0, 0]);
    const bl = bellows(40, 54);
    const BS = (a, b) => T(a, 0, 0).multiply(new THREE.Matrix4().makeScale(b - a, 1, 1));
    add('Edge-welded bellows', bl, BS(XM, XF - TF), [-70, 0, 0], { bel: [[XM, 0.5], [XF - TF, 0]] });
    add('Edge-welded bellows', bl, BS(XR, XM - TM), [-120, 0, 0], { bel: [[XR, 1], [XM - TM, 0.5]] });
    add('Bellows flanges', flange(76, 32, TM, 8, true), T(XM - TM, 0, 0), [-95, 0, 0], { move: 0.5 });
    add('Bellows flanges', flange(72, 0, TR, 6, true), T(XR - TR, 0, 0), [-145, 0, 0], MOV);
    const tr = tieRod(); RODS.forEach(([u, v]) => { const c = cad(u, v, 0); add('Tie rods', tr, T(0, c.y, c.z), [-190, c.y * 0.9, c.z * 0.9]); });
    add('Actuator plate', flange(76, 32, TA, 0, false), T(XA, 0, 0), [-230, 0, 0]);
    add('Piston rod', pistonRod(), I, [-175, 0, 0], MOV);
    add('Pneumatic cylinder', cylinderBody(), I, [-290, 0, 0]);
    add('Air fittings', fittings(), I, [-290, 0, 0]);
    return {
        name: '10 kW Faraday cup', procedural: true, cooling: pp,
        drive: { stroke: STROKE },
        blurb: 'A water-cooled copper Faraday cup for 20–30 mA ion beams, on a pneumatic bellows drive that pushes it into the beam. A suppressor ring on a ceramic isolator sits at its mouth.',
        groups, instances, explode, geo, geoms: geo.map(() => ({})), systems: []
    };
}

// ---------- the extras: cooling water, the beam's heat, secondary electrons ----------
const COLD = new THREE.Color(0x0a84ff), WARM = new THREE.Color(0xff8a1f);
export class CoolingFlow {
    constructor(M, holder) {
        const pp = M.data.cooling;
        this.holder = new THREE.Group(); holder.add(this.holder);
        this.mover = new THREE.Group(); this.holder.add(this.mover);       // rides with the arm
        this.cupG = new THREE.Group(); this.cupG.matrixAutoUpdate = false; this.cupG.matrix.copy(CUP_M); this.mover.add(this.cupG);
        this.u = {
            uOn: { value: 0 }, uTime: { value: 0 }, uLen: { value: pp.total }, uIn: { value: pp.inS }, uOut: { value: pp.outS },
            uCold: { value: COLD }, uWarm: { value: WARM }, uHeat: { value: 0 }, uA: { value: 1 }
        };
        // water: a tube just inside the coil's bore. Streaks move with the flow and the colour warms round the cup.
        const wgeo = new THREE.TubeGeometry(pp.path, 900, RI * 0.96, 12, false);
        const vs = `varying vec2 vUv; varying vec3 vN, vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
        const fs = `uniform float uOn, uTime, uLen, uIn, uOut, uHeat, uA; uniform vec3 uCold, uWarm; varying vec2 vUv; varying vec3 vN, vV;
            float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
            void main() {
                float s = vUv.x * uLen;                        // mm along the tube
                float x = s - uTime * 90.0;                    // the water moves at a visible pace
                float k = floor(x / 10.0), f = fract(x / 10.0);
                float streak = smoothstep(0.0, 0.25, f) * (1.0 - smoothstep(0.35, 0.9, f));
                float ang = vUv.y * 6.2832, bub = step(0.82, h(k + floor(ang * 1.2) * 13.0)) * streak;
                float t = clamp((s - uIn) / (uOut - uIn), 0.0, 1.0) * uHeat;   // picks up heat round the cup
                vec3 c = mix(uCold, uWarm, smoothstep(0.0, 1.0, t));
                float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
                vec3 col = c * (0.75 + 0.35 * streak) + vec3(1.0) * (0.45 * bub + 0.25 * rim);
                gl_FragColor = vec4(col, uOn * uA * (0.62 + 0.3 * streak + 0.2 * rim));
            }`;
        const water = new THREE.Mesh(wgeo, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false }));
        water.renderOrder = 3;
        // a faint x-ray copy shows the water where the cup hides the coil
        const ghost = new THREE.Mesh(wgeo, new THREE.ShaderMaterial({ uniforms: { ...this.u, uA: { value: 0.32 } }, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, depthTest: false }));
        ghost.renderOrder = 4;
        this.mover.add(ghost, water);

        // the beam: fixed in space, running into the screen (+y) through x = XC; it stops on the cup floor while the cup is in
        const N = 520, pos = new Float32Array(N * 3), seed = new Float32Array(N);
        for (let i = 0; i < N; i++) { const r = 15 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2; pos.set([r * Math.cos(a), 0, r * Math.sin(a)], 3 * i); seed[i] = Math.random(); }
        const bg = new THREE.BufferGeometry();
        bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
        this.bu = { uTime: this.u.uTime, uOn: { value: 0 }, uScale: { value: 400 }, y0: { value: YC - L - 110 }, y1: { value: YC - TB - 0.6 }, xc: { value: XC } };
        this.beam = new THREE.Points(bg, new THREE.ShaderMaterial({
            uniforms: this.bu, transparent: true, depthWrite: false,
            vertexShader: `attribute float aSeed; uniform float uTime, uScale, uOn, y0, y1, xc; varying float vA;
                void main() { float s = fract(aSeed + uTime * 0.5); vec3 p = position; float yy = y0 + s * 230.0;
                    if (yy > y1) { vA = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
                    p.y = yy; p.x += xc;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
                    gl_PointSize = 2.2 * uScale / -mv.z; vA = uOn * smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(y1 - 6.0, y1, yy) * 0.6) * (1.0 - smoothstep(0.92, 1.0, s)); }`,
            fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(0.42, 0.5, 1.0, a * 0.9); }`
        }));
        this.beam.renderOrder = 2; this.holder.add(this.beam);
        // where it lands: a glowing patch on the cup floor (cup coordinates: axis along x)
        this.spotOn = { value: 0 };
        const spot = new THREE.Mesh(new THREE.CircleGeometry(RB * 0.98, 48), new THREE.ShaderMaterial({
            uniforms: { uOn: this.spotOn, uTime: this.u.uTime }, transparent: true, depthWrite: false,
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform float uOn, uTime; varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; float g = exp(-d * d * 3.2) * (0.9 + 0.1 * sin(uTime * 19.0));
                vec3 c = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.85, 0.5), g); gl_FragColor = vec4(c, uOn * g * 0.85); }`
        }));
        spot.rotation.y = Math.PI / 2; spot.position.set(TB + 0.15, 0, 0); spot.renderOrder = 2;
        this.cupG.add(spot);
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
        this.elec.renderOrder = 5; this.cupG.add(this.elec);
        this.holder.visible = false;
    }
    // dx: drive position (0 = cup in the beam, -STROKE = parked)
    step(water, heat, time, pxScale, sup = 0, dx = 0) {
        const inBeam = 1 - Math.min(1, Math.max(0, (-dx - 20) / 45));      // the cup still catches the beam for the first ~20 mm
        this.mover.position.x = dx;
        this.eu.uOn.value = sup * inBeam; this.elec.visible = sup * inBeam > 0.01;
        this.u.uOn.value = water; this.u.uTime.value = time; this.u.uHeat.value = Math.max(heat * inBeam, water > 0 ? inBeam : 0);
        this.bu.uOn.value = heat; this.bu.uScale.value = pxScale; this.spotOn.value = heat * inBeam;
        this.bu.y1.value = inBeam > 0.5 ? YC - TB - 0.6 : 400;               // parked: the beam carries on past
        this.beam.visible = heat > 0.01;
        this.holder.visible = water > 0.01 || heat > 0.01 || sup > 0.01;
    }
}
