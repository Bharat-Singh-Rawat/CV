// Launch replay for EP in Space: the real launch site, rocket and event timeline of a mission (data/launches.json),
// with booster / stage / fairing separations and the upper stage burning to orbit and releasing the spacecraft.
// Event times come from the cited press kits. The ascent path is reconstructed: altitude and inertial speed follow the
// published profile points where a source prints them (otherwise a generic profile scaled to the parking orbit), and
// after the first orbit insertion the flight is integrated (two-body gravity + tangential thrust during the listed burns).
// Two render passes: the Earth scene (1 unit = 1 Earth radius), then the rocket scene in metres centred on the rocket.
import * as THREE from 'three';

export function setupLaunch(C) {
  const { scene, camera, controls, renderer, stage, earth, earthMesh, clouds, stars, keep, RE, MU, gmst, envAt, SUN_DIR, studioEnv, payloadModel, sadmList, data } = C;
  const V3 = THREE.Vector3, D2R = Math.PI / 180, RM = RE * 1000, W_E = 7.2921159e-5, Y = new V3(0, 1, 0);
  const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- data ----------
  function find(m) { if (!m) return null; for (const L of data.launches) { const key = L.missions.find(n => m.name.startsWith(n)); if (key) return { L, key }; } return null; }
  const isPay = (ev, key) => ev[3] === 'pay' || ev[3] === 'pay:' + key;
  const payTime = (L, key) => (L.events.find(e => isPay(e, key)) || L.events[L.events.length - 1])[0];

  // ---------- reconstructed trajectory ----------
  // generic normalised ascent (t/tI, h/hI, v/vI), taken from the Delta II / Deep Space 1 press-kit profile
  const GEN = [[0.1003, 0.0825, 0.1205], [0.42, 0.538, 0.689], [0.474, 0.661, 0.697], [1, 1, 1]];
  function pchip(xs, ys, slope0, slopeN) {   // monotone cubic (harmonic-mean slopes)
    const n = xs.length, d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = slope0 ?? d[0]; m[n - 1] = slopeN ?? d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]);
    return x => { if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
      let i = 0; while (x > xs[i + 1]) i++; const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]; };
  }
  // Earth-fixed unit vector (Earth mesh frame: +Y north, Greenwich at +X, east = -Z at lon 0) and its inertial (scene) direction
  const padLocal = (lat, lon) => { const ph = (lon + 180) / 360 * 2 * Math.PI, th = (90 - lat) * D2R; return new V3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); };
  const rotY = (v, a, out) => { const c = Math.cos(a), s = Math.sin(a); return out.set(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); };
  const DT = 0.25, TS = -20;
  function trajectory(L, key) {
    const T0 = Date.parse(L.t0), A = L.ascent, e0 = 0.4651 * Math.cos(L.lat * D2R), az = L.az * D2R, sa = Math.sin(az);
    const P = [[0, 0, e0], ...(A.pts || GEN.map(([x, h, v]) => [x * A.tI, h * A.hI, v * A.vI]))];
    if (P[P.length - 1][0] < A.tI - 1e-6) P.push([A.tI, A.hI, A.vI]);
    const hF = pchip(P.map(p => p[0]), P.map(p => p[1]), 0, 0),   // starts from rest, levels off at orbit insertion
      vF = pchip(P.map(p => p[0]), P.map(p => p[2]));
    const pu = padLocal(L.lat, L.lon), east = new V3().crossVectors(Y, pu).normalize(), north = new V3().crossVectors(pu, east);
    const dir = north.clone().multiplyScalar(Math.cos(az)).addScaledVector(east, sa);
    const tEnd = payTime(L, key) + 170, N = Math.ceil((tEnd - TS) / DT) + 2, pos = new Float64Array(N * 3), tmp = new V3(), w = new V3();
    let s = 0, i = 0;
    for (; i < N; i++) {
      const t = TS + i * DT; if (t > A.tI + 1e-9) break;
      let h = 0;
      if (t > 0) { h = hF(t); const v = vF(t), vr = (h - hF(Math.max(0, t - DT))) / DT;
        const u = -e0 * sa + Math.sqrt(Math.max(0, e0 * e0 * sa * sa - e0 * e0 + v * v)); s += Math.sqrt(Math.max(0, u * u - vr * vr)) * DT; }
      const ph = s / RE; tmp.copy(pu).multiplyScalar(Math.cos(ph)).addScaledVector(dir, Math.sin(ph)).multiplyScalar(RE + h);
      rotY(tmp, gmst(T0 + t * 1000), w); pos[i * 3] = w.x; pos[i * 3 + 1] = w.y; pos[i * 3 + 2] = w.z;
    }
    // orbit phase: state from the end of the ascent, horizontal speed set to the profile's inertial speed
    let k = i - 1, r = [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]], v = [0, 1, 2].map(j => (pos[k * 3 + j] - pos[(k - 1) * 3 + j]) / DT);
    { const rn = Math.hypot(...r), u = r.map(x => x / rn), vr = v[0] * u[0] + v[1] * u[1] + v[2] * u[2], vh = v.map((x, j) => x - vr * u[j]), hn = Math.hypot(...vh);
      const orbital = A.vI >= 0.97 * Math.sqrt(MU / rn), vr2 = orbital ? 0 : vr;   // reaching orbit: insertion is horizontal
      const want = Math.sqrt(Math.max(0, A.vI * A.vI - vr2 * vr2)); v = vh.map((x, j) => x / hn * want + vr2 * u[j]); }
    const burns = L.burns.filter(b => b[3] && b[2] > A.tI).map(b => ({ t0: Math.max(b[1], A.tI), t1: b[2], tg: b[3], a: null }));
    const acc = (rr, vv, th) => { const rn = Math.hypot(...rr), g = -MU / (rn * rn * rn); let a = rr.map(x => g * x);
      if (th) { const vn = Math.hypot(...vv); a = a.map((x, j) => x + th * vv[j] / vn); } return a; };
    for (; i < N; i++) {
      const t = TS + (i - 1) * DT; let th = 0;
      for (const b of burns) if (t >= b.t0 - 1e-9 && t < b.t1) {
        if (b.a === null) { const rn = Math.hypot(...r), vn = Math.hypot(...v), T = b.tg; let need = vn;
          if (T.apo != null) { const ra = RE + T.apo; need = Math.sqrt(MU * (2 / rn - 2 / (rn + ra))); }
          else if (T.c3 != null) need = Math.sqrt(2 * MU / rn + T.c3); else if (T.v != null) need = T.v; else if (T.circ) need = Math.sqrt(MU / rn);
          b.a = (need - vn) / (b.t1 - b.t0); }
        th = b.a; }
      // RK4
      const k1v = acc(r, v, th), k1r = v;
      const r2 = r.map((x, j) => x + k1r[j] * DT / 2), v2 = v.map((x, j) => x + k1v[j] * DT / 2), k2v = acc(r2, v2, th), k2r = v2;
      const r3 = r.map((x, j) => x + k2r[j] * DT / 2), v3 = v.map((x, j) => x + k2v[j] * DT / 2), k3v = acc(r3, v3, th), k3r = v3;
      const r4 = r.map((x, j) => x + k3r[j] * DT), v4 = v.map((x, j) => x + k3v[j] * DT), k4v = acc(r4, v4, th), k4r = v4;
      r = r.map((x, j) => x + DT / 6 * (k1r[j] + 2 * k2r[j] + 2 * k3r[j] + k4r[j])); v = v.map((x, j) => x + DT / 6 * (k1v[j] + 2 * k2v[j] + 2 * k3v[j] + k4v[j]));
      { const rn = Math.hypot(...r); if (rn < RE + 110) { const u = r.map(x => x / rn), vr = v[0] * u[0] + v[1] * u[1] + v[2] * u[2]; r = u.map(x => x * (RE + 110)); if (vr < 0) v = v.map((x, j) => x - vr * u[j]); } }
      pos[i * 3] = r[0]; pos[i * 3 + 1] = r[1]; pos[i * 3 + 2] = r[2];
    }
    const at = (t, out) => { const f = Math.min(N - 2, Math.max(0, (t - TS) / DT)), j = Math.floor(f), u = f - j;
      return out.set(pos[j * 3] + (pos[j * 3 + 3] - pos[j * 3]) * u, pos[j * 3 + 1] + (pos[j * 3 + 4] - pos[j * 3 + 1]) * u, pos[j * 3 + 2] + (pos[j * 3 + 5] - pos[j * 3 + 2]) * u); };
    return { T0, tEnd, tI: A.tI, at, pu, east, north };
  }

  // ---------- rocket models (metres, +Y = rocket axis, base of the first stage at y = 0) ----------
  const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const MAT = { white: std(0xf1f1ee, 0.5, 0.05), black: std(0x1d1d20, 0.55, 0.25), teal: std(0x3d8d97, 0.5, 0.1), cream: std(0xebe6da, 0.6, 0), grey: std(0x9a9ea6, 0.45, 0.5),
    dark: std(0x55585f, 0.5, 0.4), nozzle: Object.assign(std(0x3b3d42, 0.35, 0.85), { side: THREE.DoubleSide }), olive: std(0x6c7563, 0.6, 0.1), pad: std(0x6f6e69, 0.95, 0), tower: std(0x8f9398, 0.55, 0.6) };
  const KIND = { kero: [0xffa64a, 1.0, 10], solid: [0xfff0c8, 1.15, 13], hydro: [0x9ec4ff, 0.45, 6], hyper: [0xffc68a, 0.5, 5], vac: [0xffb36a, 0.75, 9] };
  const plumeGeo = (() => { const g = new THREE.CylinderGeometry(1, 2.4, 1, 28, 10, true); g.translate(0, -0.5, 0); return g; })();
  const plumeMat = (col, I) => new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(col) }, uI: { value: I }, uT: { value: 0 } },
    vertexShader: 'varying float vS; varying vec3 vN; varying vec3 vV; void main(){ vS = -position.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uI; uniform float uT; varying float vS; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(vN, vV)); float s = clamp(vS, 0.0, 1.0); float a = uI * pow(1.0 - s, 1.5) * (0.2 + 0.8 * f * f) * (0.88 + 0.12 * sin(uT * 47.0 + s * 33.0)); gl_FragColor = vec4(mix(vec3(1.0, 0.98, 0.92), uC, smoothstep(0.0, 0.35, s)) * a * 1.7, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  function cyl(g, r, y0, h, mat, x = 0, z = 0, rTop = r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, 40), mat); m.position.set(x, y0 + h / 2, z); g.add(m); return m; }
  function nose(g, r, y0, h, mat, x = 0, z = 0) { const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(r * Math.pow(Math.cos(t * Math.PI / 2), 0.75) + 1e-3, t * h)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat); m.position.set(x, y0, z); g.add(m); return m; }
  function bell(g, r, yExit, h, x = 0, z = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.38, r, h, 32, 1, true), MAT.nozzle); m.position.set(x, yExit + h / 2, z); g.add(m); return m; }
  function engine(g, kind, r, y, x = 0, z = 0) { const [c, I] = KIND[kind], o = new THREE.Group(); o.position.set(x, y, z);
    const outer = new THREE.Mesh(plumeGeo, plumeMat(c, I)), inner = new THREE.Mesh(plumeGeo, plumeMat(0xfffbef, I * 0.9)); inner.scale.set(0.45, 1, 0.45); outer.userData.plume = inner.userData.plume = true; o.add(outer, inner);
    o.userData = { kind, r, outer, inner }; o.visible = false; g.add(o); (g.userData.eng ??= []).push(o); return o; }
  function fairing(R, P, r0, r, y0, hc, hn, boat = 0) {   // two halves, split along the X axis
    const pts = [new THREE.Vector2(r0, 0)]; if (boat) pts.push(new THREE.Vector2(r, boat)); pts.push(new THREE.Vector2(r, boat + hc));
    for (let i = 1; i <= 18; i++) { const t = i / 18; pts.push(new THREE.Vector2(r * Math.pow(Math.cos(t * Math.PI / 2), 0.8) + 0.002, boat + hc + t * hn)); }
    for (const k of [0, 1]) { const p = new THREE.Group(); p.name = 'fairing' + k; P[p.name] = p; R.add(p);
      const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24, k * Math.PI, Math.PI), Object.assign(MAT.white.clone(), { side: THREE.DoubleSide })); m.position.y = y0; p.add(m); }
    return y0 + boat + hc + hn;
  }
  function vehicle(id) {
    const R = new THREE.Group(), P = {}, part = n => { const g = new THREE.Group(); g.name = n; P[n] = g; R.add(g); return g; };
    let payY = 0, rf = 1.3, top = 0, upper = 's2', sTop = 0, sR = 1.2;   // upper stage that carries the spacecraft, its top and radius
    if (id === 'delta7326' || id === 'delta7925h') {
      const heavy = id === 'delta7925h', n = heavy ? 9 : 3, rS = heavy ? 0.58 : 0.51, hS = heavy ? 14.7 : 11;
      const s1 = part('s1'); cyl(s1, 1.22, 0, 26, MAT.teal); cyl(s1, 1.22, 26, 4.6, MAT.white); bell(s1, 0.62, -1.4, 1.4); engine(s1, 'kero', 0.62, -1.4);
      for (let k = 0; k < n; k++) { const a = k / n * 2 * Math.PI + 0.35, d = 1.22 + rS + 0.04, x = Math.cos(a) * d, z = Math.sin(a) * d, p = part('srb' + k);
        cyl(p, rS, 0.6, hS, MAT.white, x, z); nose(p, rS, 0.6 + hS, 1.5, MAT.white, x, z); bell(p, rS * 0.75, -0.4, 1.0, x, z); engine(p, 'solid', rS * 0.75, -0.4, x, z); }
      const s2 = part('s2'); cyl(s2, 1.22, 30.6, 3.2, MAT.black); bell(s2, 0.5, 28.8, 1.8); engine(s2, 'hyper', 0.5, 28.8);
      const s3 = part('s3'); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), MAT.dark); ball.scale.y = 0.8; ball.position.y = 34.9; s3.add(ball); bell(s3, 0.34, 34.0, 0.5); engine(s3, 'solid', 0.34, 34.0);
      top = fairing(R, P, 1.22, 1.45, 33.8, 5.2, 3.4, 0.4); payY = 35.9; rf = 1.32; upper = 's3'; sTop = 35.35; sR = 0.5;
    } else if (id === 'falcon9' || id === 'falcon9v11' || id === 'falconheavy') {
      const legs = id !== 'falcon9v11';
      const core = (p, x, nosecone, withLegs) => { cyl(p, 1.83, 0, nosecone ? 36 : 35, MAT.white, x); if (nosecone) nose(p, 1.83, 36, 4.5, MAT.white, x); else cyl(p, 1.83, 35, 6, MAT.black, x);
        const ow = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.5, 40), MAT.dark); ow.position.set(x, 0.25, 0); p.add(ow);
        for (let k = 0; k < 9; k++) { const a = k / 8 * 2 * Math.PI, rr = k === 8 ? 0 : 1.15; bell(p, 0.42, -1.3, 1.3, x + Math.cos(a) * rr, Math.sin(a) * rr); }
        if (withLegs) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, l = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 0.35), MAT.black); l.position.set(x + Math.cos(a) * 1.9, 4.9, Math.sin(a) * 1.9); l.rotation.y = -a; p.add(l); }
        if (withLegs) for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, f = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.2), MAT.dark); f.position.set(x + Math.cos(a) * 2.3, (nosecone ? 34 : 40), Math.sin(a) * 2.3); f.rotation.y = -a; p.add(f); }
        engine(p, 'kero', 1.65, -1.3, x); };
      core(part('s1'), 0, false, legs && id === 'falcon9');
      if (id === 'falconheavy') { core(part('side0'), 3.95, true, true); core(part('side1'), -3.95, true, true); }
      const s2 = part('s2'); cyl(s2, 1.83, 41, 9, MAT.white); bell(s2, 1.2, 37.8, 3.2); engine(s2, 'vac', 1.2, 37.8);
      top = fairing(R, P, 1.83, 2.6, 50, 6.7, 6.4, 0.9); payY = 51.4; rf = 2.4; sTop = 50; sR = 1.83;
    } else if (id === 'ariane5eca' || id === 'ariane5g') {
      const s1 = part('s1'); cyl(s1, 2.7, 0, 30.5, MAT.cream); bell(s1, 1.05, -2.8, 2.8); engine(s1, 'hydro', 1.05, -2.8);
      for (const k of [0, 1]) { const x = (k ? -1 : 1) * (2.7 + 1.55 + 0.25), p = part('eap' + k); cyl(p, 1.55, -3.5, 30.5, MAT.white, x); nose(p, 1.55, 27, 3.8, MAT.white, x); bell(p, 1.45, -6.6, 3.1, x); engine(p, 'solid', 1.45, -6.6, x); }
      const s2 = part('s2');
      if (id === 'ariane5eca') { cyl(s2, 2.7, 30.5, 4.6, MAT.dark); bell(s2, 0.5, 29.5, 1.0); engine(s2, 'hydro', 0.5, 29.5); top = fairing(R, P, 2.7, 2.7, 35.1, 11, 6); payY = 36.2; sTop = 35.1; }
      else { cyl(s2, 2.7, 30.5, 1.6, MAT.grey); bell(s2, 0.4, 29.9, 0.6); engine(s2, 'hyper', 0.4, 29.9); top = fairing(R, P, 2.7, 2.7, 32.1, 8.5, 5.5); payY = 33.2; sTop = 32.1; }
      rf = 2.45; sR = 2.7;
    } else if (id === 'h2a202') {
      const s1 = part('s1'); cyl(s1, 2, 0, 35.2, MAT.white); cyl(s1, 2, 35.2, 2, MAT.black); bell(s1, 0.95, -2.6, 2.6); engine(s1, 'hydro', 0.95, -2.6);
      for (const k of [0, 1]) { const x = (k ? -1 : 1) * (2 + 1.25 + 0.2), p = part('srb' + k); cyl(p, 1.25, 1.8, 15.1, MAT.white, x); nose(p, 1.25, 16.9, 2.6, MAT.white, x); bell(p, 1.0, -0.4, 2.2, x); engine(p, 'solid', 1.0, -0.4, x); }
      const s2 = part('s2'); cyl(s2, 2, 37.2, 9.2, MAT.white); bell(s2, 0.6, 35.6, 1.6); engine(s2, 'hydro', 0.6, 35.6);
      top = fairing(R, P, 2, 2.05, 46.4, 7, 5); payY = 47.4; rf = 1.9; sTop = 46.4; sR = 2;
    } else {   // Rockot / Breeze-KM
      const s1 = part('s1'); cyl(s1, 1.25, 0, 17.2, MAT.olive); bell(s1, 0.7, -1.2, 1.2); engine(s1, 'hyper', 0.7, -1.2);
      const s2 = part('s2'); cyl(s2, 1.25, 17.2, 4, MAT.olive); bell(s2, 0.5, 16.2, 1.0); engine(s2, 'hyper', 0.5, 16.2);
      const s3 = part('s3'); cyl(s3, 1.25, 21.2, 1.4, MAT.grey); bell(s3, 0.3, 20.7, 0.5); engine(s3, 'hyper', 0.3, 20.7);
      top = fairing(R, P, 1.25, 1.31, 21.2, 3.5, 3.2); payY = 23.3; rf = 1.2; upper = 's3'; sTop = 22.6; sR = 1.25;
    }
    // centre the stack on its centre of length so the camera orbits the middle of the rocket
    // payload adapter: a cone from the top of the upper stage up to the spacecraft's interface ring (it stays on the stage at separation)
    const ad = new THREE.Group(), h = payY - sTop, rb = Math.min(sR * 0.8, 1.7), rt = Math.min(0.62, rb);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 40, 1, true), Object.assign(MAT.grey.clone(), { side: THREE.DoubleSide })); cone.position.y = sTop + h / 2; ad.add(cone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.05, 8, 40), MAT.dark); ring.rotation.x = Math.PI / 2; ring.position.y = payY; ad.add(ring);
    P[upper].add(ad);
    return { R, P, payY, rf, len: top + 3 };
  }

  // ---------- rocket scene (metres, origin = followed object) ----------
  const lscene = new THREE.Scene(), cam2 = new THREE.PerspectiveCamera(40, 1, 0.3, 4e6);
  queueMicrotask(() => { lscene.environment = studioEnv(renderer); });
  const sunL = new THREE.DirectionalLight(0xfff4e6, 2.4), hemi = new THREE.HemisphereLight(0xcfe0ff, 0x30302c, 0.35), fire = new THREE.PointLight(0xffa860, 0, 0, 1.2);
  const head = new THREE.DirectionalLight(0xdfe6f5, 0.7); lscene.add(sunL, sunL.target, hemi, fire, head, head.target, new THREE.AmbientLight(0xffffff, 0.08));
  // ground patch around the pad: the same NASA day map, sampled at each vertex's latitude/longitude, plus pad and tower
  let ground = null;
  function makeGround(L, tr) {
    const Rm = 30000, g = new THREE.CircleGeometry(Rm, 96, 0, Math.PI * 2), p = g.attributes.position, uv = g.attributes.uv, q = new V3();
    for (let i = 0; i < p.count; i++) { q.copy(tr.pu).multiplyScalar(RE).addScaledVector(tr.east, p.getX(i) / 1000).addScaledVector(tr.north, p.getY(i) / 1000).normalize();
      const lat = Math.asin(q.y) / D2R, ph = Math.atan2(q.z, -q.x); let lon = ph / D2R - 180; if (lon < -180) lon += 360; uv.setXY(i, (lon + 180) / 360, (lat + 90) / 180); }
    const a = document.createElement('canvas'); a.width = a.height = 256; const x = a.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#fff'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const mat = new THREE.MeshBasicMaterial({ map: C.dayMap(), alphaMap: new THREE.CanvasTexture(a), transparent: true, depthWrite: false });
    const disc = new THREE.Mesh(g, mat), G = new THREE.Group(); G.add(disc);
    const padM = new THREE.Mesh(new THREE.BoxGeometry(80, 60, 2), MAT.pad); padM.position.z = 1; G.add(padM);
    const tw = new THREE.Group(); tw.position.set(-22, 0, 0); G.add(tw);   // steel lattice umbilical tower (built for height H in buildStack)
    const trench = new THREE.Mesh(new THREE.BoxGeometry(14, 40, 1), MAT.black); trench.position.set(0, 30, 2.6); G.add(trench);
    G.userData = { disc, tw }; return G;
  }
  function towerFor(tw, H) {   // 4 corner columns, horizontal frames every 4 m, diagonal braces, swing arm at the top
    tw.clear(); const w = 5, col = new THREE.BoxGeometry(0.45, 0.45, 1), bar = new THREE.BoxGeometry(1, 0.22, 0.22);
    const add = (geo, x, y, z, sx, sy, sz, rz = 0, ry = 0) => { const m = new THREE.Mesh(geo, MAT.tower); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(0, ry, rz); tw.add(m); };
    for (const x of [-w / 2, w / 2]) for (const y of [-w / 2, w / 2]) add(col, x, y, H / 2, 1, 1, H);
    const dz = 4, dl = Math.hypot(w, dz);
    for (let z = 0; z <= H; z += dz) { add(bar, 0, -w / 2, z, w, 1, 1); add(bar, 0, w / 2, z, w, 1, 1); add(bar, -w / 2, 0, z, w, 1, 1, Math.PI / 2); add(bar, w / 2, 0, z, w, 1, 1, Math.PI / 2);
      if (z + dz <= H) for (const y of [-w / 2, w / 2]) add(bar, 0, y, z + dz / 2, dl, 1, 1, 0, -Math.atan2(dz, w) * (z / dz % 2 ? 1 : -1)); }
    add(bar, 9, 0, H - 3, 18, 1.6, 1.6);
  }
  // smoke and steam puffs (positions kept in inertial km, drawn relative to the followed object)
  const NP = 700, sPos = new Float32Array(NP * 3), sSize = new Float32Array(NP), sA = new Float32Array(NP), puffs = [];
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1)); sGeo.setAttribute('aA', new THREE.BufferAttribute(sA, 1));
  const SOFT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const smokeMat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: SOFT }, uScale: { value: 500 }, uL: { value: new THREE.Color(0xdddddd) } },
    vertexShader: 'attribute float aSize; attribute float aA; varying float vA; uniform float uScale; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(2048.0, aSize * uScale / max(0.5, -mv.z)); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D uTex; uniform vec3 uL; varying float vA; void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(uL, a); }',
    transparent: true, depthWrite: false });
  const smoke = new THREE.Points(sGeo, smokeMat); smoke.frustumCulled = false; lscene.add(smoke);

  // ---------- state ----------
  let L = null, key = '', tr = null, veh = null, payObj = null, payInner = null, T = -10, lastT = -10, playing = true, SPEED = 'auto', rate = 1, userZoom = false, debris = [], nextPuff = 0, mission = null;
  const P = new V3(), Pn = new V3(), up = new V3(), prevUp = new V3(), tmp = new V3(), tmp2 = new V3(), qa = new THREE.Quaternion(), att = new V3(), vel = new V3();
  const burning = (name, t) => L.burns.some(b => b[0].includes(name) && t >= b[1] && t < b[2]);
  const anyBurn = t => L.burns.some(b => t >= b[1] && t < b[2]);
  const _g = new V3(), grav = (r, out) => out.copy(r).multiplyScalar(-MU / Math.pow(r.length(), 3));
  function advance(d, t1) {   // leapfrog, 0.5 s steps (km, km/s)
    while (d.t < t1 - 1e-9) { const h = Math.min(0.5, t1 - d.t); d.v.addScaledVector(grav(d.r, _g), h / 2); d.r.addScaledVector(d.v, h); d.v.addScaledVector(grav(d.r, _g), h / 2); d.t += h;
      if (d.r.length() < RE) { d.r.setLength(RE); d.v.set(0, 0, 0); } } }
  function velAt(t, out) { tr.at(t + 0.5, tmp2); tr.at(t - 0.5, out); return out.subVectors(tmp2, out); }   // km/s, inertial

  function buildStack() {
    if (veh) lscene.remove(veh.R); for (const d of debris) lscene.remove(d.obj); debris = []; puffs.length = 0;
    veh = vehicle(L.vehicle); lscene.add(veh.R);
    // the spacecraft (its own detailed model), arrays stowed, standing on the upper stage with its thrust axis down
    payObj = new THREE.Group(); payInner = payloadModel(mission); if (payInner.userData.thr) payInner.userData.thr.visible = false;
    payObj.add(payInner); payInner.rotation.z = Math.PI / 2; veh.R.add(payObj); payObj.userData.fit = -1; fitPayload(); veh.R.quaternion.setFromUnitVectors(Y, tr.at(-10, new V3()).normalize()); stackSize();
    if (ground) lscene.remove(ground); ground = makeGround(L, tr); towerFor(ground.userData.tw, Math.ceil((veh.len + 6) / 4) * 4); lscene.add(ground);
  }
  function fitPayload() {   // scale the spacecraft to fit inside the fairing (refit when the official model has loaded)
    const real = payInner.userData.real ? 1 : 0; if (payObj.userData.fit === real) return; payObj.userData.fit = real;
    const sad = sadmList(payInner); for (const g of sad) g.scale.z = 0.08;
    payObj.scale.setScalar(1); payObj.position.set(0, 0, 0); payObj.updateMatrixWorld(true);
    const thr = payInner.userData.thr; if (thr) payInner.remove(thr);   // its (hidden) plume must not count as spacecraft
    const b = new THREE.Box3(); payInner.traverse(o => { if (o.isMesh) b.expandByObject(o); }); if (thr) payInner.add(thr); const s = b.getSize(new V3()), k = Math.min(6, 2 * veh.rf * 0.82 / Math.max(s.x, s.z, 0.01), 7 / Math.max(s.y, 0.01));
    payObj.scale.setScalar(k); payObj.position.y = veh.payY - b.min.y * k; payObj.userData.sad = sad;
  }
  function detach(names, t) {
    tr.at(t, tmp); velAt(t, vel);
    for (const n0 of names) for (const n of (n0 === 'fairing' ? ['fairing0', 'fairing1'] : [n0])) {
      const p = veh.P[n]; if (!p || !p.parent) continue;
      veh.R.updateMatrixWorld(true); const box = new THREE.Box3(); p.traverse(o => { if (o.isMesh && !o.userData.plume) box.expandByObject(o); }); const c = box.getCenter(new V3());   // centre, rocket frame = world (rocket at origin)
      const wq = new THREE.Quaternion(); p.getWorldQuaternion(wq); const wp = new V3(); p.getWorldPosition(wp);
      lscene.attach(p); for (const ch of p.children) ch.position.sub(p.worldToLocal(c.clone()));
      p.position.copy(c); p.updateMatrixWorld(true);
      for (const e of p.userData.eng || []) e.visible = false;
      // separation kick (m/s): boosters and fairing halves outwards, stages backwards along the axis
      const axis = new V3(0, 1, 0).applyQuaternion(veh.R.quaternion), out = c.clone().projectOnPlane(axis); if (out.lengthSq() < 1e-6) out.set(1, 0, 0).applyQuaternion(veh.R.quaternion).projectOnPlane(axis);
      out.normalize(); const fair = n.startsWith('fairing'); if (fair) out.set(n === 'fairing0' ? 1 : -1, 0, 0).applyQuaternion(veh.R.quaternion);
      const kick = /^(srb|eap|side)/.test(n) ? out.clone().multiplyScalar(n.startsWith('side') ? 3 : 6).addScaledVector(axis, -1.5) : fair ? out.clone().multiplyScalar(5) : axis.clone().multiplyScalar(n === 's1' ? -1.2 : -0.5);
      const spinAx = fair ? new V3().crossVectors(axis, out).normalize() : new V3().crossVectors(axis, out.lengthSq() ? out : new V3(1, 0, 0)).normalize();
      veh.dirty = true; debris.push({ obj: p, t0: t, t: t, r: tmp.clone().addScaledVector(c, 1 / 1000), v: vel.clone().addScaledVector(kick, 1 / 1000), q0: p.quaternion.clone(), ax: spinAx, w: fair ? 0.9 : /^(srb|eap)/.test(n) ? 0.35 : n.startsWith('side') ? 0.05 : 0.04 });
    }
  }
  function seek(t) { buildStack(); for (const ev of L.events) if (ev[0] <= t && ev[2] && actionable(ev)) detach(ev[2], ev[0]); T = lastT = t; nextPuff = t; }
  const actionable = ev => !String(ev[3] || '').startsWith('pay') || isPay(ev, key);

  // ---------- UI ----------
  const bar = document.createElement('div'); bar.className = 'vseg lbar'; bar.id = 'v-launch'; bar.hidden = true;
  bar.innerHTML = '<button data-a="play" aria-label="Pause">❚❚</button><input type="range" min="0" max="1000" value="0" aria-label="Launch time"><button data-s="auto" aria-pressed="true">Auto</button><button data-s="1">×1</button><button data-s="10">×10</button><button data-s="100">×100</button>';
  $('.vbar').appendChild(bar);
  const panel = document.createElement('div'); panel.className = 'lpanel'; panel.hidden = true; stage.appendChild(panel);
  const slider = bar.querySelector('input'), playB = bar.querySelector('[data-a=play]');
  playB.onclick = () => { if (T >= tr.tEnd - 0.01) seek(-10); playing = !playing; syncPlay(); };
  const syncPlay = () => { playB.textContent = playing ? '❚❚' : '▶'; playB.setAttribute('aria-label', playing ? 'Pause' : 'Play'); };
  bar.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { SPEED = b.dataset.s; bar.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  slider.oninput = () => { seek(-10 + (tr.tEnd + 10) * slider.value / 1000); };
  // own orbit camera in the local vertical frame (horizon stays level): drag = turn, wheel / pinch = zoom
  const CAM = { az: -2.2, el: 0.18, d: 200 }, ptr = new Map(); let pinch0 = 0, d0 = 0;
  const el = renderer.domElement, active = () => L && C.view() === 'launch';
  el.addEventListener('pointerdown', e => { if (!active()) return; ptr.set(e.pointerId, [e.clientX, e.clientY]); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); d0 = CAM.d; } });
  el.addEventListener('pointermove', e => { if (!active() || !ptr.has(e.pointerId)) return; const [x0, y0] = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 1) { CAM.az -= (e.clientX - x0) * 0.006; CAM.el = Math.max(-1.45, Math.min(1.45, CAM.el + (e.clientY - y0) * 0.006)); }
    else if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) { CAM.d = Math.max(3, Math.min(2e6, d0 * pinch0 / d)); userZoom = true; } } });
  const up_ = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch0 = 0; }; el.addEventListener('pointerup', up_); el.addEventListener('pointercancel', up_);
  el.addEventListener('wheel', e => { if (!active()) return; e.preventDefault(); CAM.d = Math.max(3, Math.min(2e6, CAM.d * Math.exp(e.deltaY * 0.0012))); userZoom = true; }, { passive: false });
  const fmt = t => { const s = Math.abs(t), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = Math.floor(s % 60); return (t < 0 ? 'T−' : 'T+') + (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); };
  function renderPanel() {
    const evs = L.events;
    panel.innerHTML = `<div class="lph"><b>${esc(L.vname)}</b><span>${esc(L.pad)} · ${esc(L.t0.replace('T', ' ').replace('Z', ' UTC').slice(0, 20))}</span></div><ol>` +
      evs.map((e, i) => `<li data-i="${i}" data-t="${e[0]}"><button><i>${fmt(e[0])}</i>${esc(e[1])}</button></li>`).join('') + '</ol>' +
      `<p class="lpf">Event times: <a href="${esc(L.sources[0])}" target="_blank" rel="noopener">${esc(L.srcLabel)}</a>. Path reconstructed from them${L.ascent.pts ? ' and the published altitude/speed points' : ''}; launch azimuth ${L.azSrc ? 'from the source' : 'approximate'}.</p>` +
      (L.video ? `<p class="lpv">${L.video.map(v => `<a href="${esc(v.url)}" target="_blank" rel="noopener">▶ ${esc(v.label)} ›</a>`).join('')}</p>` : '<p class="lpv lpn">No official launch video found for this flight.</p>');
    panel.querySelectorAll('li').forEach(li => li.querySelector('button').onclick = () => { seek(Math.max(-10, +li.dataset.t - 4)); playing = true; syncPlay(); });
  }

  // ---------- enter / exit ----------
  let saved = null, hiRes = null;
  function enter(m) {
    const f = find(m); if (!f) return false; L = f.L; key = f.key; mission = m; tr = trajectory(L, key);
    saved = { near: camera.near, pos: camera.position.clone(), tgt: controls.target.clone(), minD: controls.minDistance, maxD: controls.maxDistance, damp: controls.enableDamping, cs: clouds.scale.x, vis: new Map() };
    for (const c of scene.children) if (!keep.includes(c) && !c.isLight) { saved.vis.set(c, c.visible); c.visible = false; }
    for (const c of earth.children) if (c !== earthMesh && c !== clouds && c !== C.atmo) { saved.vis.set(c, c.visible); c.visible = false; }   // ground track etc.
    if (C.atmo) C.atmo.visible = false; hiRes ??= new THREE.SphereGeometry(1, 720, 360); saved.geo = earthMesh.geometry; earthMesh.geometry = hiRes; clouds.scale.setScalar(1.0016 / 1.008);
    controls.minDistance = 1e-6; controls.maxDistance = 3; controls.enableDamping = false; userZoom = false;
    seek(-10); playing = true; syncPlay(); SPEED = 'auto'; bar.querySelectorAll('[data-s]').forEach(x => x.setAttribute('aria-pressed', x.dataset.s === 'auto'));
    tr.at(T, P); up.copy(P).normalize(); prevUp.copy(up);
        stackSize(); CAM.az = -2.2; CAM.el = 0.18; CAM.d = dist(); controls.enabled = false; saved.up = camera.up.clone();
    bar.hidden = false; panel.hidden = false; renderPanel(); return true;
  }
  function exit() {
    if (!saved) return; if (C.atmo) C.atmo.visible = true; for (const [c, v] of saved.vis) c.visible = v; earthMesh.geometry = saved.geo; clouds.scale.setScalar(saved.cs); clouds.visible = true;
    camera.near = saved.near; camera.up.copy(saved.up); camera.updateProjectionMatrix(); camera.position.copy(saved.pos); controls.enabled = true; controls.target.copy(saved.tgt); controls.minDistance = saved.minD; controls.maxDistance = saved.maxD; controls.enableDamping = saved.damp;
    renderer.setClearColor(0x000000, 0); if (stars.material) { stars.material.opacity = 1; stars.material.transparent = false; }
    for (const d of debris) lscene.remove(d.obj); debris = []; puffs.length = 0;   // nothing from this flight may linger into the next one
    bar.hidden = true; panel.hidden = true; saved = null;
  }
  // camera distance (m): rocket length plus a share of the altitude; after separation the spacecraft is small
  const stackSize = () => { veh.R.updateMatrixWorld(true); const b = new THREE.Box3(); veh.R.traverse(o => { if (o.isMesh && !o.userData.plume) b.expandByObject(o); }); const s = b.getSize(new V3()); veh.stack = Math.max(s.x, s.y, s.z); veh.midL = veh.R.worldToLocal(b.getCenter(new V3())); };
  const dist = () => { const alt = Math.max(0, P.length() - RE); return veh.stack * 2.4 + 15 + Math.min(alt * 4, 300) * Math.min(1, veh.stack / 40); };

  // ---------- per-frame ----------
  function autoRate(t) {
    const near = L.events.some(e => e[2] && actionable(e) && t > e[0] - 5 && t < e[0] + 8);
    if (t < 25 || near) return 1; if (t < tr.tI) return 6; return anyBurn(t) ? 12 : 90;
  }
  function step(dt, now) {
    if (!L) return;
    if (playing) { const want = SPEED === 'auto' ? autoRate(T) : +SPEED; rate += (want - rate) * Math.min(1, dt * 3); T += dt * rate; }
    if (T >= tr.tEnd) { T = tr.tEnd; playing = false; syncPlay(); }
    for (const ev of L.events) if (ev[2] && actionable(ev) && ev[0] > lastT && ev[0] <= T) detach(ev[2], ev[0]);
    lastT = T; slider.value = Math.round((T + 10) / (tr.tEnd + 10) * 1000);
    const ms = tr.T0 + T * 1000; envAt(ms);
    tr.at(T, P); up.copy(P).normalize(); const alt = P.length() - RE;
    // attitude: vertical on the pad, then along the Earth-relative velocity during the climb, prograde in orbit
    velAt(T, vel); const vrel = tmp.copy(vel).sub(tmp2.set(W_E * P.z, 0, -W_E * P.x));   // v − ω × r (ω along +Y)
    att.copy(T < 8 ? up : (T < tr.tI ? vrel : vel)).normalize(); if (T >= 8 && T < 20) att.lerp(up, (20 - T) / 12).normalize();
    qa.setFromUnitVectors(Y, att); veh.R.quaternion.slerp(qa, T < 1 ? 1 : Math.min(1, dt * 4 * Math.max(1, rate / 4)));
    // engines
    let burn = 0; const aF = Math.min(10, 1 + alt / 12);
    for (const [n, p] of Object.entries(veh.P)) { if (p.parent !== veh.R) continue; for (const e of p.userData.eng || []) { const on = T >= 0 && burning(n, T); e.visible = on;
      if (on) { const [, I, Lk] = KIND[e.userData.kind], L0 = e.userData.r * Lk * (1 + alt / 18) * (T < 3 ? T / 3 : 1); const wF = e.userData.r * (1 + (aF - 1) * 0.45); e.scale.set(wF, Math.min(L0, 600 + e.userData.r * 80), wF);
        e.userData.outer.material.uniforms.uT.value = now / 1000; e.userData.inner.material.uniforms.uT.value = now / 1000; burn = Math.max(burn, I * e.userData.r); } } }
    fire.intensity = burn ? 4e4 * burn * (T < 200 ? 1 : 0.4) : 0; fire.position.set(0, -6, 0).applyQuaternion(veh.R.quaternion);
    // payload: arrays deploy over ~40 s after separation, official model refit when loaded
    fitPayload(); const tp = payTime(L, key); const dep = Math.min(1, Math.max(0, (T - tp - 12) / 40));
    for (const g of payObj.userData.sad || []) g.scale.z = 0.08 + 0.92 * (dep * dep * (3 - 2 * dep));
    if (dep > 0 && payObj.userData.sad && payObj.userData.sad.length) C.sunTrack(payObj.userData.sad, SUN_DIR);
    // debris: ballistic from the separation state (no thrust), tumbling
    for (const d of debris) { const s = T - d.t0; advance(d, T); tmp.copy(d.r);
      d.obj.position.copy(tmp.sub(P).multiplyScalar(1000)); d.obj.quaternion.copy(d.q0).premultiply(new THREE.Quaternion().setFromAxisAngle(d.ax, d.w * s));
      d.obj.visible = d.obj.position.length() < 80000 && s < 400; }
    // smoke / steam trail below ~45 km
    const solidOrKero = Object.entries(veh.P).some(([n, p]) => p.parent === veh.R && T >= 0 && burning(n, T) && (p.userData.eng || []).some(e => e.userData.kind === 'solid' || e.userData.kind === 'kero'));
    if (T >= 0 && alt < 45 && anyBurn(T)) while (nextPuff < T) { tr.at(nextPuff, tmp); const bot = new V3(0, -4, 0).applyQuaternion(veh.R.quaternion);
      puffs.push({ p: tmp.clone().addScaledVector(bot, 1 / 1000), t: nextPuff, k: solidOrKero ? 1 : 0.45 }); if (puffs.length > NP) puffs.shift(); nextPuff += Math.max(0.12, 0.06 * rate); }
    else nextPuff = Math.max(nextPuff, T);
    let n = 0; for (const f of puffs) { const age = T - f.t; if (age < 0) continue; tmp.copy(f.p).sub(P).multiplyScalar(1000);
      sPos[n * 3] = tmp.x; sPos[n * 3 + 1] = tmp.y; sPos[n * 3 + 2] = tmp.z; sSize[n] = 18 + 9 * age + 0.6 * age * age; sA[n] = f.k * 0.55 * Math.exp(-age / 70) * Math.min(1, age * 4); n++; }
    sGeo.setDrawRange(0, n); sGeo.attributes.position.needsUpdate = sGeo.attributes.aSize.needsUpdate = sGeo.attributes.aA.needsUpdate = true;
    const day = THREE.MathUtils.smoothstep(up.dot(SUN_DIR), -0.12, 0.12);
    smokeMat.uniforms.uL.value.setRGB(0.25 + 0.65 * day, 0.25 + 0.64 * day, 0.27 + 0.63 * day);
    // ground patch follows the rotating Earth, fades out with altitude
    { const pw = rotY(tr.pu, gmst(ms), new V3()), ew = rotY(tr.east, gmst(ms), new V3()), nw = rotY(tr.north, gmst(ms), new V3());
      ground.position.copy(pw).multiplyScalar(RE).sub(P).multiplyScalar(1000); ground.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ew, nw, pw));
      const f = 1 - THREE.MathUtils.smoothstep(alt, 6, 22); ground.visible = f > 0.01; ground.userData.disc.material.opacity = f;
      ground.userData.disc.material.color.setScalar(0.06 + 1.0 * Math.max(0, pw.dot(SUN_DIR)) + 0.04); }
    // lights: the Sun unless the rocket is in the Earth's shadow
    { const d = P.dot(SUN_DIR) / P.length(), shadow = d < 0 && P.length() * Math.sqrt(1 - d * d) < RE; sunL.intensity = shadow ? 0 : 2.4; sunL.position.copy(SUN_DIR).multiplyScalar(1000); sunL.target.position.set(0, 0, 0); }
    // camera: follow, keep the horizon steady (offset turns with the local vertical), auto distance unless the user zoomed
    if (veh.dirty) { veh.dirty = false; stackSize(); }
    const look = veh.midL.clone().applyQuaternion(veh.R.quaternion).divideScalar(1000);   // km from the base to the middle of the stack
    if (!userZoom) CAM.d += (dist() - CAM.d) * Math.min(1, dt * 1.5);
    const E = new V3().crossVectors(Y, up).normalize(), Nn = new V3().crossVectors(up, E), ce = Math.cos(CAM.el);
    const off = tmp2.copy(E).multiplyScalar(ce * Math.cos(CAM.az)).addScaledVector(Nn, ce * Math.sin(CAM.az)).addScaledVector(up, Math.sin(CAM.el)).multiplyScalar(CAM.d / RM);
    const tgt = tmp.copy(P).add(look).divideScalar(RE); controls.target.copy(tgt); camera.position.copy(tgt).add(off); camera.up.copy(up); camera.lookAt(tgt);
    const camAlt = (camera.position.length() - 1) * RE; camera.near = Math.min(0.01, Math.max(2e-7, 0.4 * Math.max(0.001, camAlt) / RE)); camera.updateProjectionMatrix();
    clouds.visible = camAlt > 30;
    // sky: blue by day near the ground, black in space
    const sky = day * Math.exp(-Math.max(0, camAlt) / 14); renderer.setClearColor(new THREE.Color(0.30 * sky, 0.50 * sky, 0.82 * sky), 1);
    if (stars.material) { stars.material.transparent = true; stars.material.opacity = Math.max(0, 1 - sky * 2.5); }
    // pass 1: Earth; pass 2: rocket scene in metres around the followed object
    renderer.render(scene, camera);
    cam2.fov = camera.fov; cam2.aspect = camera.aspect; cam2.updateProjectionMatrix(); cam2.quaternion.copy(camera.quaternion); cam2.position.copy(off).multiplyScalar(RM).addScaledVector(look, 1000); head.position.copy(cam2.position); head.target.position.copy(look).multiplyScalar(1000);
    smokeMat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(cam2.fov * Math.PI / 360));
    renderer.autoClear = false; renderer.clearDepth(); renderer.render(lscene, cam2); renderer.autoClear = true;
    // panel highlight
    let cur = -1; L.events.forEach((e, i) => { if (e[0] <= T) cur = i; });
    panel.querySelectorAll('li').forEach((li, i) => { li.classList.toggle('on', i === cur); li.classList.toggle('done', i < cur); });
    const li = panel.querySelector('li.on'); if (li && li.dataset.i !== panel.dataset.cur) { panel.dataset.cur = li.dataset.i; li.scrollIntoView({ block: 'nearest' }); }
  }
  function hud() {
    if (!L) return ''; let cur = null; for (const e of L.events) if (e[0] <= T) cur = e;
    const v = velAt(T, vel).length(), alt = P.length() - RE;
    return `<b>${esc(L.vname)} · ${esc(mission.name)}</b><br>${esc(L.pad)}<br><span class="clk">${fmt(T)} · ${T >= 0 ? `altitude ≈ ${alt < 10 ? alt.toFixed(1) : Math.round(alt).toLocaleString('en')} km · speed ≈ ${v.toFixed(2)} km/s (inertial)` : 'on the pad'} · ×${Math.round(rate)}</span>` +
      (cur ? `<br><span class="clk">${esc(cur[1])}</span>` : '');
  }
  return { has: m => !!find(m), info: m => { const f = find(m); return f && f.L; }, enter, exit, step, hud };
}
