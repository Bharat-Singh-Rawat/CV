// Hardware in 3D: CAD assemblies shown like product renders, driven by the page scroll.
// The stage is pinned full-screen while one tall "chapter" per model scrolls past. In each chapter the model
// flies in, comes close, explodes (with labels), holds, reassembles and flies out, then the next one takes over.
// Model data (/CV/cad/models/<key>.json + .bin) is exported from the original SolidWorks / STEP files:
// one geometry per unique part, instances with 4x4 matrices (CAD axes, z up, mm), explode offsets (mm, CAD axes).
// Grid apertures are not meshed: their centres come with the grid and are drawn as a see-through perforation mask.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const MODELS = [
    { key: 'oris', short: 'Ion source', photo: '/CV/v2/img/oris.webp', beam: true },
    { key: 'fc-array', short: 'Faraday cups', photo: '/CV/v2/img/fc-array.webp' },
    { key: 'magnetic-rpa', short: 'Magnetic RPA', photo: '/CV/v2/img/magnet-rpa.webp' }
];
// magnet polarity per model (not in the CAD): returns the magnetisation direction (S to N inside the magnet), CAD axes.
//  ORIS: ring-cusp, each ring one pole towards the plasma, neighbouring rings alternate (front N in, rear S in, back N in).
//  Magnetic RPA: the two stacks face N to S across the collector (transverse filter field).
const POLES = {
    'oris': (label, c, ctx) => {
        if (label === 'Side cusp magnet') { const r = new THREE.Vector3(c.x - ctx.axis.x, c.y - ctx.axis.y, 0).normalize(); return (c.z - ctx.sideMid) * ctx.dirSign > 0 ? r.negate() : r; }
        if (label === 'Back cusp magnet') return new THREE.Vector3(0, 0, ctx.dirSign);
        return null;
    },
    'magnetic-rpa': label => label === 'Side cusp magnet' ? new THREE.Vector3(1, 0, 0) : null
};
// field-line seeding per model: seeds per pole face (odd), how far lines may wander, and seeds across a filter gap
// surface field of the permanent magnets (both models): the model is calibrated so the pole faces read this
const SURFACE_GAUSS = 2500, G_MIN = 20;
const FIELD = { 'oris': { seeds: 3, reach: 0.62, box: true }, 'magnetic-rpa': { seeds: 3, reach: 0.8, gap: true } };
const BASE = '/CV/cad/models/';

// studio materials: one finish per kind of part
const FINISH = {
    steel:    { color: 0xc6c9ce, metalness: 1, roughness: 0.30, label: '' },
    grid:     { color: 0xbcc0c6, metalness: 1, roughness: 0.17, label: '' },
    fastener: { color: 0x8f949b, metalness: 1, roughness: 0.34, label: 'Steel' },
    brass:    { color: 0xdcb462, metalness: 1, roughness: 0.22, label: 'Brass' },
    copper:   { color: 0xe39066, metalness: 1, roughness: 0.22, label: 'Copper' },
    alu:      { color: 0xd4d7db, metalness: 1, roughness: 0.42, label: 'Aluminium' },
    ceramic:  { color: 0xf6f4ef, metalness: 0, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.12, label: 'Ceramic' },
    ptfe:     { color: 0xf2f2ee, metalness: 0, roughness: 0.6, sheen: 0.4, sheenRoughness: 0.8, label: 'PTFE' },
    magnet:   { color: 0x5b5e64, metalness: 1, roughness: 0.26, label: 'Magnet' },
    filament: { color: 0x9d968c, metalness: 1, roughness: 0.38, label: '' }
};

// one chapter of scroll: [progress, distance (× fit), explode]; eased between keys
const KEYS = [
    [0.00, 2.5, 0], [0.16, 1.0, 0], [0.32, 0.68, 0], [0.42, 0.82, 0.18],
    [0.58, 1.14, 1], [0.80, 1.14, 1], [0.93, 1.35, 0], [1.00, 2.5, 0]
];
const AZ0 = 0.64, POL0 = 1.15;            // three-quarter view from slightly above

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const dark = () => document.documentElement.dataset.theme === 'dark';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// interface sounds come from the CV's own sfx.js (same tick / tock, same mute switch); buttons already click through it
const sound = k => { try { window.cvSfx && window.cvSfx[k] && window.cvSfx[k](); } catch (e) { /* audio not ready */ } };
let lastTick = 0;
const tick = () => { const n = performance.now(); if (n - lastTick > 70) { lastTick = n; sound('hover'); } };

// ---------- renderer, scene, camera ----------
const canvas = $('view'), stage = $('stage'), scrolly = $('scrolly');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studio(), 0.02).texture;
scene.environmentIntensity = 1.05;

// photo studio for reflections: dim cyclorama, a big overhead softbox, strip lights, a warm bounce card and a front fill
function studio() {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    const pos = room.geometry.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) {   // darker at the floor, lighter towards the ceiling
        const y = pos.getY(i) / 50, v = 0.16 + 0.26 * Math.max(0, y) + 0.05 * (1 - Math.abs(y));
        col.push(v, v, v * 1.02);
    }
    room.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    env.add(room);
    const panel = (w, h, x, y, z, c, k) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(40, 22, 0, 34, 6, 0xffffff, 5.5);      // overhead softbox
    panel(7, 34, -32, 6, 18, 0xffffff, 7);       // strip left
    panel(7, 34, 32, 4, -14, 0xffffff, 5);       // strip right / rim
    panel(26, 10, 6, -6, 38, 0xfff4e8, 1.6);     // warm bounce card in front
    panel(30, 18, 26, 6, 30, 0xffffff, 2.2);     // big front fill, camera side
    panel(18, 18, -14, 10, -36, 0xe8f0ff, 1.8);  // cool kicker behind
    return env;
}

const camera = new THREE.PerspectiveCamera(30, 1, 1, 20000);

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 14;
key.shadow.blurSamples = 20;
key.shadow.bias = -0.0004;
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.35));

// floor: soft cast shadow + a contact shadow blob, both follow the lowest part
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.16 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55 }));
blob.rotation.x = -Math.PI / 2; blob.renderOrder = -1; scene.add(blob);
function blobTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.45, 'rgba(0,0,0,0.22)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const applyTheme = () => {
    floor.material.opacity = dark() ? 0.42 : 0.16;
    blob.material.opacity = dark() ? 0.85 : 0.5;
    scene.environmentIntensity = dark() ? 0.9 : 1.05;
};
applyTheme();
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// CAD is z-up; the root turns it to three.js y-up
const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root); root.updateMatrixWorld(true);
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

// ---------- state ----------
const built = [];          // per chapter: the built model, once loaded
let active = -1, model = null;
let explodeT = 0, cut = false;
let hovered = -1, selected = -1, solo = false;
let focus = -1, hoverSys = -1;   // subsystem in focus / under the pointer (models that define subsystems)
let userAz = 0, userPol = 0, velAz = 0, velPol = 0;
let gTarget = 0, gSmooth = 0, pending = null;
let beamOn = false, fieldOn = false, photoOn = false, beamVis = 0, fieldVis = 0;

// ---------- loading ----------
async function fetchModel(k) {
    const data = await (await fetch(BASE + k + '.json')).json();
    const buf = await (await fetch(BASE + data.bin)).arrayBuffer();
    data.geo = data.geoms.map(g => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, g.pos[0], g.pos[1]), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(buf, g.nrm[0], g.nrm[1]), 3, true));
        geo.setIndex(new THREE.BufferAttribute(g.idxType === 'u16' ? new Uint16Array(buf, g.idx[0], g.idx[1]) : new Uint32Array(buf, g.idx[0], g.idx[1]), 1));
        geo.computeBoundingBox(); geo.computeBoundingSphere();
        if (g.apertures) geo.userData.mask = perforate(geo, g.apertures, g.bbox);
        return geo;
    });
    return data;
}

// grid apertures: planar UVs over the plate and an alpha mask with one hole per aperture
function perforate(geo, ap, bb) {
    const [x0, y0, , x1, y1] = bb, w = x1 - x0, h = y1 - y0;
    const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) { uv[2 * i] = (pos.getX(i) - x0) / w; uv[2 * i + 1] = (pos.getY(i) - y0) / h; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const N = 4096, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.fillStyle = '#000';
    const rx = ap.r / w * N, ry = ap.r / h * N;
    g.beginPath();
    ap.c.forEach(([x, y]) => { const u = (x - x0) / w * N, v = (1 - (y - y0) / h) * N; g.moveTo(u + rx, v); g.ellipse(u, v, rx, ry, 0, 0, Math.PI * 2); });
    g.fill();
    const t = new THREE.CanvasTexture(c); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true;
    return t;
}

function makeMaterial(kind) {
    const f = FINISH[kind] || FINISH.steel;
    const m = new THREE.MeshPhysicalMaterial({
        color: f.color, metalness: f.metalness, roughness: f.roughness,
        clearcoat: f.clearcoat || 0, clearcoatRoughness: f.clearcoatRoughness || 0,
        sheen: f.sheen || 0, sheenRoughness: f.sheenRoughness || 1,
        envMapIntensity: 1, clipShadows: true
    });
    m.emissive = new THREE.Color(0x0071e3); m.emissiveIntensity = 0;
    // the cut-away shows inner faces as a darker "section" tone
    const cap = new THREE.Color(f.color).multiplyScalar(f.metalness ? 0.42 : 0.7);
    m.userData.capOn = { value: 0 };
    m.onBeforeCompile = s => {
        s.uniforms.capColor = { value: cap }; s.uniforms.capOn = m.userData.capOn;
        s.fragmentShader = 'uniform vec3 capColor;\nuniform float capOn;\n' + s.fragmentShader.replace('#include <dithering_fragment>',
            '#include <dithering_fragment>\n' +
            // a face is "inside" when its own normal points away from the camera (winding from CAD exports is not reliable).
            // Inside faces get the section tone and sit a hair behind any real surface, so touching parts never flicker.
            ' float facing = dot(normalize(vNormal), normalize(vViewPosition));\n' +
            ' if (facing < 0.0 && capOn > 0.5) gl_FragColor.rgb = capColor;\n' +
            ' gl_FragDepth = gl_FragCoord.z + (facing < 0.0 ? capOn * (4.0 * fwidth(gl_FragCoord.z) + 0.00002) : 0.0);');
    };
    m.userData.fade = 1;
    return m;
}

// build every mesh of a model once, inside its own (hidden) group
function build(data) {
    const holder = new THREE.Group(); holder.visible = false; root.add(holder);
    const groups = data.groups.map((g, gi) => {
        const m = makeMaterial(g.kind);
        const geo = data.geo[data.instances.find(x => x.g === gi).geo];
        if (geo.userData.mask) { m.alphaMap = geo.userData.mask; m.alphaTest = 0.5; m.side = THREE.DoubleSide; m.userData.perforated = true; }
        return { ...g, mat: m, meshes: [] };
    });
    const meshes = data.instances.map((inst, i) => {
        const g = groups[inst.g];
        const mesh = new THREE.Mesh(data.geo[inst.geo], g.mat);
        mesh.matrixAutoUpdate = false;
        // shrink each part by a hair about its own centre: parts that touch (stacked magnets, bushes on flanges)
        // then never share a plane exactly, so their faces cannot flicker against each other
        const gc = data.geo[inst.geo].boundingBox.getCenter(new THREE.Vector3()), k = 1 - 0.0015;
        mesh.userData.base = new THREE.Matrix4().set(...inst.m)
            .multiply(new THREE.Matrix4().makeTranslation(gc.x, gc.y, gc.z))
            .multiply(new THREE.Matrix4().makeScale(k, k, k))
            .multiply(new THREE.Matrix4().makeTranslation(-gc.x, -gc.y, -gc.z));
        const e = data.explode[i] || 0;
        mesh.userData.ex = Array.isArray(e) ? new THREE.Vector3(...e) : new THREE.Vector3(0, 0, e);
        mesh.userData.g = inst.g;
        mesh.castShadow = mesh.receiveShadow = true;
        const bb = data.geo[inst.geo].boundingBox.clone().applyMatrix4(mesh.userData.base);
        mesh.userData.zmin = bb.min.z; mesh.userData.bb = bb; mesh.userData.c = bb.getCenter(new THREE.Vector3());
        mesh.matrix.copy(mesh.userData.base);
        g.meshes.push(mesh); holder.add(mesh);
        return mesh;
    });
    const M = { data, groups, meshes, holder, systems: (data.systems || []).map(x => ({ ...x, set: new Set(x.groups), count: x.groups.reduce((n, i) => n + data.groups[i].count, 0) })) };
    M.fit0 = boundsOf(M, 0).getBoundingSphere(new THREE.Sphere());
    M.fit1 = boundsOf(M, 1).getBoundingSphere(new THREE.Sphere());
    const all = boundsOf(M, 0).union(boundsOf(M, 1)), s = all.getSize(new THREE.Vector3());
    M.radius = Math.max(s.x, s.y, s.z) * 0.9;
    return M;
}

// world-space (three.js) bounds of a model at an explode amount
function boundsOf(M, t, only = null) {
    const b = new THREE.Box3(), v = new THREE.Box3();
    M.meshes.forEach(m => {
        if (only && !only.has(m.userData.g)) return;
        if (M === model && !m.visible) return;
        v.copy(m.userData.bb).translate(m.userData.ex.clone().multiplyScalar(t));
        b.union(v);
    });
    return b.applyMatrix4(root.matrixWorld);
}

function activate(i) {
    if (i === active || !built[i]) return;
    if (model) model.holder.visible = false;
    active = i; model = built[i]; model.holder.visible = true;
    selected = hovered = focus = hoverSys = -1; solo = false; closeInfo();
    applyCut();
    const r = model.radius;
    Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 8 });
    key.shadow.camera.updateProjectionMatrix();
    $('c-num').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(MODELS.length).padStart(2, '0');
    $('m-name').textContent = model.data.name;
    $('m-blurb').textContent = model.data.blurb || '';
    $('c-hint').textContent = model.systems.length ? 'Tap a system to look closer.' : 'Tap any part to look closer.';
    buildLabels();
    applyExplode(true);
    paint();
    document.querySelectorAll('#chapters button').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    // per-model extras
    $('t-beam').hidden = !MODELS[i].beam; $('t-field').hidden = !POLES[MODELS[i].key];
    beamOn = fieldOn = false; beamVis = fieldVis = 0;
    $('t-beam').setAttribute('aria-pressed', 'false'); $('t-field').setAttribute('aria-pressed', 'false'); $('legend').hidden = true;
    $('cmp-img').src = $('cmp-bg').src = MODELS[i].photo; $('cmp-img').alt = 'Lab photo of the ' + model.data.name;
    $('ar-pop').hidden = true;
    $('loading').classList.add('done');
}

function applyExplode(force) {
    if (!model) return;
    const t = explodeT;
    let zmin = Infinity;
    model.meshes.forEach(m => {
        m.matrix.copy(m.userData.base);
        m.matrix.elements[12] += m.userData.ex.x * t; m.matrix.elements[13] += m.userData.ex.y * t; m.matrix.elements[14] += m.userData.ex.z * t;
        m.matrixWorldNeedsUpdate = true;
        if (m.visible) zmin = Math.min(zmin, m.userData.zmin + m.userData.ex.z * t);
    });
    const y = zmin - 0.3;
    floor.position.y = y; blob.position.y = y + 0.05;
    const b = boundsOf(model, t), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const w = Math.max(s.x, s.z);
    floor.scale.set(w * 6, w * 6, 1); floor.position.x = c.x; floor.position.z = c.z;
    blob.scale.set(s.x * 1.35, s.z * 1.35, 1); blob.position.x = c.x; blob.position.z = c.z;
    const R = model.radius;
    key.position.set(c.x + R * 0.6, y + R * 2.4, c.z + R * 0.9); key.target.position.set(c.x, y, c.z);
    if (force) root.updateMatrixWorld(true);
}

// ---------- scroll: which chapter, how far into it ----------
const track = $('chapter-track');
track.innerHTML = MODELS.map(() => '<div></div>').join('');
const chapterLen = () => track.firstElementChild.offsetHeight;
function scrollG() {
    const s = -scrolly.getBoundingClientRect().top;
    return clamp(s / chapterLen(), 0, MODELS.length - 1e-4);
}
function scrollToChapter(i, p, instant) {
    const top = scrolly.getBoundingClientRect().top + scrollY + (i + p) * chapterLen();
    window.scrollTo({ top, behavior: instant || reduce ? 'auto' : 'smooth' });
}
function keyAt(p) {
    let k = 0; while (k < KEYS.length - 2 && p > KEYS[k + 1][0]) k++;
    const [p0, m0, e0] = KEYS[k], [p1, m1, e1] = KEYS[k + 1], s = smooth(p0, p1, p);
    return { m: m0 + (m1 - m0) * s, e: e0 + (e1 - e0) * s };
}

$('chapters').innerHTML = MODELS.map((m, i) => `<button type="button" role="tab" data-i="${i}" aria-selected="false">${esc(m.short)}<i></i></button>`).join('');
$('chapters').addEventListener('click', e => { const b = e.target.closest('button'); if (b) scrollToChapter(+b.dataset.i, 0.17); });

// ---------- cut-away ----------
function applyCut() {
    if (!model) return;
    model.groups.forEach(g => {
        g.mat.clippingPlanes = cut ? [cutPlane] : null;
        g.mat.side = cut || g.mat.userData.perforated ? THREE.DoubleSide : THREE.FrontSide;
        g.mat.userData.capOn.value = cut ? 1 : 0;
        g.mat.needsUpdate = true;
    });
    $('t-cut').setAttribute('aria-pressed', String(cut));
}

// ---------- highlight, selection ----------
function paint() {
    if (!model) return;
    model.groups.forEach((g, i) => {
        const inFocus = focus < 0 || model.systems[focus].set.has(i);
        g.goalFade = selected >= 0 ? (i === selected ? 1 : 0.1) : (inFocus ? 1 : 0.08);
        const hot = i === hovered || (hoverSys >= 0 && model.systems[hoverSys].set.has(i));
        g.goalGlow = hot && i !== selected ? 0.22 : (i === selected ? 0.08 : 0);
        g.meshes.forEach(m => { m.visible = !(solo && (selected >= 0 ? i !== selected : !inFocus)); });
    });
    const same = listIdx === active;
    document.querySelectorAll('#parts .part').forEach(b => b.setAttribute('aria-pressed', String(same && +b.dataset.i === selected)));
    document.querySelectorAll('#parts .sys-btn').forEach(b => b.setAttribute('aria-pressed', String(same && +b.dataset.s === focus)));
    $('sys-back').hidden = focus < 0;
}
function stepMaterials(dt) {
    if (!model) return;
    const k = 1 - Math.exp(-dt * 12);
    model.groups.forEach(g => {
        const m = g.mat;
        const f = m.userData.fade + ((g.goalFade ?? 1) - m.userData.fade) * k;
        m.userData.fade = f;
        const transparent = f < 0.995;
        if (m.transparent !== transparent) { m.transparent = transparent; m.depthWrite = !transparent; m.needsUpdate = true; }
        m.opacity = transparent ? f : 1;
        const hot = g.label === 'Filament' ? beamVis * 2.4 * (0.92 + 0.08 * Math.sin(performance.now() / 45)) : 0;
        if (hot > 0.02) m.emissive.setHex(0xff6a1a); else if (m.emissiveIntensity < 0.3) m.emissive.setHex(0x0071e3);
        m.emissiveIntensity += (Math.max(g.goalGlow || 0, hot) - m.emissiveIntensity) * k;
        g.meshes.forEach(me => { me.castShadow = f > 0.5; });
    });
}

function select(i) {
    selected = i === selected ? -1 : i;
    solo = false; $('i-solo').setAttribute('aria-pressed', 'false');
    paint();
    if (selected < 0) { if (focus >= 0) showSystemCard(); else closeInfo(); return; }
    const g = model.groups[selected], d = model.data;
    const geo = d.geo[d.instances.find(x => x.g === selected).geo];
    const s = geo.boundingBox.getSize(new THREE.Vector3());
    const dims = [s.x, s.y, s.z].sort((a, b) => b - a).map(v => v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
    $('i-mat').textContent = g.material || (FINISH[g.kind] || FINISH.steel).label;
    $('i-name').textContent = g.label;
    $('i-blurb').textContent = g.blurb || '';
    $('i-qty-t').textContent = 'Quantity'; $('i-size-t').textContent = 'Envelope';
    $('i-qty').textContent = '× ' + g.count;
    $('i-size').textContent = dims.join(' × ') + ' mm';
    $('info').hidden = false;
}
function closeInfo() { $('info').hidden = true; }
function showSystemCard() {
    const sy = model.systems[focus];
    $('i-mat').textContent = 'Subsystem';
    $('i-name').textContent = sy.label;
    $('i-blurb').textContent = sy.blurb || '';
    $('i-qty-t').textContent = 'Parts'; $('i-size-t').textContent = 'Part types';
    $('i-qty').textContent = sy.count; $('i-size').textContent = sy.groups.length;
    $('info').hidden = false;
}
// subsystem focus: fade everything else, name only its parts, and describe it in the card
function focusSystem(sIdx, toggle = true) {
    focus = toggle && sIdx === focus ? -1 : sIdx; selected = -1; hoverSys = -1;
    solo = false; $('i-solo').setAttribute('aria-pressed', 'false');
    paint();
    if (focus < 0) { closeInfo(); return; }
    showSystemCard();
    if (explodeT < 0.55) scrollToChapter(active, 0.68);   // labels live on the exploded view
}
function clearAll() { selected = -1; focus = -1; solo = false; paint(); closeInfo(); }
$('sys-back').addEventListener('click', () => focusSystem(focus));
$('info-x').addEventListener('click', () => { if (selected >= 0 && focus >= 0) focusSystem(focus, false); else clearAll(); });
$('i-solo').addEventListener('click', e => {
    solo = !solo; e.currentTarget.setAttribute('aria-pressed', String(solo)); paint(); applyExplode();
});

// ---------- parts list (below the story; any model, jumps up to it) ----------
let listIdx = 0;
function swatch(kind) {
    const c = new THREE.Color((FINISH[kind] || FINISH.steel).color).getStyle();
    const metal = (FINISH[kind] || FINISH.steel).metalness;
    return metal
        ? `background: radial-gradient(circle at 32% 28%, #fff 0%, ${c} 38%, color-mix(in srgb, ${c} 55%, #000) 100%)`
        : `background: radial-gradient(circle at 32% 28%, #fff 0%, ${c} 55%, color-mix(in srgb, ${c} 80%, #000) 100%)`;
}
function renderParts() {
    document.querySelectorAll('#models button').forEach((b, k) => b.setAttribute('aria-selected', String(k === listIdx)));
    const M = built[listIdx], ul = $('parts');
    if (!M) { ul.innerHTML = ''; return; }
    const part = i => { const g = M.groups[i]; return `<li><button type="button" class="part" data-i="${i}" aria-pressed="false">
        <span class="sw" style="${swatch(g.kind)}" aria-hidden="true"></span>
        <span><span class="p-name">${esc(g.label)}</span><span class="p-mat">${esc(g.material || (FINISH[g.kind] || FINISH.steel).label)}</span></span>
        <span class="p-qty">× ${g.count}</span></button></li>`; };
    ul.innerHTML = M.systems.length
        ? M.systems.map((sy, s) => `<li class="sys-h"><button type="button" class="sys-btn" data-s="${s}" aria-pressed="false"><b>${esc(sy.label)}</b><span>${esc(sy.blurb)}</span></button></li>` + sy.groups.map(part).join('')).join('')
        : M.groups.map((g, i) => part(i)).join('');
    const here = () => listIdx === active;
    ul.querySelectorAll('.part').forEach(b => {
        const i = +b.dataset.i;
        b.addEventListener('click', () => { pending = { chapter: listIdx, kind: 'g', idx: i }; scrollToChapter(listIdx, 0.68); });
        b.addEventListener('pointerenter', () => { tick(); if (here()) { hovered = i; paint(); } });
        b.addEventListener('pointerleave', () => { if (here()) { hovered = -1; paint(); } });
    });
    ul.querySelectorAll('.sys-btn').forEach(b => {
        const s = +b.dataset.s;
        b.addEventListener('click', () => { pending = { chapter: listIdx, kind: 's', idx: s }; scrollToChapter(listIdx, 0.68); });
        b.addEventListener('pointerenter', () => { tick(); if (here()) { hoverSys = s; paint(); } });
        b.addEventListener('pointerleave', () => { if (here()) { hoverSys = -1; paint(); } });
    });
    paint();
}
$('models').innerHTML = MODELS.map((m, i) => `<button type="button" role="tab" data-i="${i}" aria-selected="false">${esc(m.short)}</button>`).join('');
$('models').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { listIdx = +b.dataset.i; renderParts(); } });

// ---------- labels on the exploded view ----------
// Two callout columns with leader lines. Models with subsystems show one label per subsystem;
// clicking one focuses it and names only its parts. Smaller models name every part.
const labelsEl = $('labels'); let callouts = [];
const SVGNS = 'http://www.w3.org/2000/svg';
function buildLabels() {
    labelsEl.innerHTML = '<svg class="leaders"></svg>';
    const svg = labelsEl.querySelector('svg');
    const mk = (kind, idx, groups, html) => {
        const el = document.createElement('button');
        el.type = 'button'; el.className = 'lbl' + (kind === 's' ? ' sys' : ''); el.tabIndex = -1; el.innerHTML = html;
        labelsEl.appendChild(el);
        const leader = svg.appendChild(document.createElementNS(SVGNS, 'path'));
        const dot = svg.appendChild(document.createElementNS(SVGNS, 'circle')); dot.setAttribute('r', kind === 's' ? '4.5' : '3.5');
        if (kind === 's') {
            el.addEventListener('click', () => focusSystem(idx));
            el.addEventListener('pointerenter', () => { hoverSys = idx; paint(); tick(); });
            el.addEventListener('pointerleave', () => { hoverSys = -1; paint(); });
        } else {
            el.addEventListener('click', () => select(idx));
            el.addEventListener('pointerenter', () => { hovered = idx; paint(); tick(); });
            el.addEventListener('pointerleave', () => { hovered = -1; paint(); });
        }
        callouts.push({ kind, idx, groups, el, leader, dot });
    };
    callouts = [];
    model.groups.forEach((g, i) => mk('g', i, [i], `<span>${esc(g.label)}</span>`));
    model.systems.forEach((sy, s) => mk('s', s, sy.groups, `<span>${esc(sy.label)}<em>${sy.count}</em></span>`));
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const hide = c => { c.el.classList.remove('vis'); c.leader.style.opacity = c.dot.style.opacity = 0; };
function placeLabels() {
    const t = explodeT, on = !!model && t > 0.55;
    labelsEl.classList.toggle('on', on);
    if (!on) return;
    const W = stage.clientWidth, H = stage.clientHeight, small = W < 640;
    const top = small ? 156 : 190, bottom = H - (small ? 84 : 96), gap = small ? 21 : 27;
    const sys = model.systems.length > 0;
    const active = c => !sys ? c.kind === 'g' : (focus < 0 ? c.kind === 's' : c.kind === 'g' && model.systems[focus].set.has(c.idx));
    const items = [];
    callouts.forEach(c => {
        if (!active(c)) { hide(c); return; }
        // anchor: the copy nearest the camera (on the visible half when cut)
        let best = null, bd = Infinity;
        c.groups.forEach(gi => model.groups[gi].meshes.forEach(m => {
            if (!m.visible) return;
            _v.copy(m.userData.ex).multiplyScalar(t).add(m.userData.c).applyMatrix4(root.matrixWorld);
            if (cut && _v.z > 0) return;
            const d = _v.distanceToSquared(camera.position);
            if (d < bd) { bd = d; best = _v.clone(); }
        }));
        if (!best || (solo && selected >= 0 && c.idx !== selected && c.kind === 'g')) { hide(c); return; }
        _w.copy(best).project(camera);
        items.push({ c, x: (_w.x + 1) / 2 * W, y: (1 - _w.y) / 2 * H, w: c.el.offsetWidth });
    });
    if (!items.length) return;
    // split into left / right of the model, then balance so both columns fit
    const cx = items.reduce((s, it) => s + it.x, 0) / items.length;
    const left = items.filter(it => it.x < cx), right = items.filter(it => it.x >= cx);
    const cap = Math.max(1, Math.floor((bottom - top) / gap) + 1);
    const move = (from, to, pickMax) => { from.sort((a, b) => a.x - b.x); to.push(pickMax ? from.pop() : from.shift()); };
    while (left.length > right.length + 1 && right.length < cap) move(left, right, true);
    while (right.length > left.length + 1 && left.length < cap) move(right, left, false);
    const minX = Math.min(...items.map(it => it.x)), maxX = Math.max(...items.map(it => it.x));
    const pad = small ? 18 : 56;
    const colL = Math.max(10 + Math.max(0, ...left.map(it => it.w)), minX - pad), colR = Math.min(W - 10 - Math.max(0, ...right.map(it => it.w)), maxX + pad);
    const isHot = c => c.kind === 's' ? c.idx === hoverSys || c.idx === focus : c.idx === hovered || c.idx === selected;
    const isDim = c => c.kind === 'g' && selected >= 0 && c.idx !== selected;
    const spread = (col, side) => {
        col.sort((a, b) => a.y - b.y);
        col.forEach((it, k) => { it.ly = Math.max(it.y, k ? col[k - 1].ly + gap : top); });
        for (let k = col.length - 1; k >= 0; k--) { const lim = k === col.length - 1 ? bottom : col[k + 1].ly - gap; if (col[k].ly > lim) col[k].ly = lim; }
        col.forEach((it, k) => { if (it.ly < top + k * gap) it.ly = top + k * gap; });
        col.forEach(it => {
            const c = it.c, lx = side < 0 ? colL - it.w : colR;
            c.el.style.transform = `translate(${lx}px, ${it.ly - 12}px)`;
            c.el.classList.add('vis');
            c.el.classList.toggle('dim', isDim(c));
            const ex = side < 0 ? colL + 4 : colR - 4, knee = ex - side * 14;
            c.leader.setAttribute('d', `M${it.x.toFixed(1)},${it.y.toFixed(1)} L${knee.toFixed(1)},${it.ly.toFixed(1)} L${ex.toFixed(1)},${it.ly.toFixed(1)}`);
            c.dot.setAttribute('cx', it.x.toFixed(1)); c.dot.setAttribute('cy', it.y.toFixed(1));
            const o = isDim(c) ? 0.2 : (isHot(c) ? 1 : 0.65);
            c.leader.style.opacity = o; c.dot.style.opacity = Math.min(1, o + 0.2);
            c.leader.classList.toggle('hot', isHot(c));
        });
    };
    spread(left, -1); spread(right, 1);
}

// ---------- pointer: drag to turn (on top of the scroll turntable), hover names, click to inspect ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let pointer = null, down = null, dragging = false;
function pick(x, y) {
    if (!model) return -1;
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(model.meshes.filter(m => m.visible && m.material.userData.fade > 0.5), false);
    for (const h of hits) {
        if (cut && h.point.z > 0.01) continue;   // ignore the cut-away half
        return h.object.userData.g;
    }
    return -1;
}
canvas.addEventListener('pointerdown', e => {
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, type: e.pointerType, t: performance.now() };
    dragging = false;
    if (e.pointerType === 'mouse') { canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing'); }
});
canvas.addEventListener('pointermove', e => {
    pointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
    if (!down) return;
    const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
    down.lx = e.clientX; down.ly = e.clientY;
    if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) dragging = true;
    if (!dragging) return;
    // touch: only sideways drags turn the model (vertical swipes keep scrolling the page)
    velAz = -dx * 0.008;
    velPol = down.type === 'mouse' ? -dy * 0.006 : 0;
    userAz += velAz; userPol = clamp(userPol + velPol, -0.75, 0.5);
});
const endDrag = e => {
    canvas.classList.remove('grabbing');
    if (down && !dragging && e.type === 'pointerup') {
        const g = pick(e.clientX, e.clientY);
        if (g >= 0) { sound('click'); select(g); }
        else if (selected >= 0 && focus >= 0) { sound('click'); focusSystem(focus, false); }
        else if (selected >= 0 || focus >= 0) { sound('click'); clearAll(); }
    }
    down = null; dragging = false;
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { pointer = null; if (hovered >= 0) { hovered = -1; paint(); } $('tip').classList.remove('on'); canvas.classList.remove('over'); });
function hoverStep() {
    if (!pointer || pointer.type !== 'mouse' || dragging) return;
    const g = pick(pointer.x, pointer.y);
    if (g !== hovered) { hovered = g; paint(); if (g >= 0) tick(); }
    const tip = $('tip');
    canvas.classList.toggle('over', g >= 0);
    if (g >= 0) {
        const r = stage.getBoundingClientRect();
        tip.innerHTML = esc(model.groups[g].label) + (model.groups[g].count > 1 ? `<small>× ${model.groups[g].count}</small>` : '');
        tip.style.left = (pointer.x - r.left) + 'px'; tip.style.top = (pointer.y - r.top) + 'px';
        tip.classList.add('on');
    } else tip.classList.remove('on');
}

// ---------- dock ----------
$('t-cut').addEventListener('click', () => { cut = !cut; applyCut(); sound('toggle'); });
$('t-reset').addEventListener('click', () => {
    selected = hovered = focus = hoverSys = -1; solo = false; paint(); closeInfo();
    cut = false; applyCut();
    userAz = userPol = velAz = velPol = 0;
});
document.addEventListener('pointerover', e => {
    const el = e.target.closest('#models button, #chapters button, .tool, .pill-btn, .info .x, .sys-back');
    if (el && !el.contains(e.relatedTarget)) tick();
}, { passive: true });


// ---------- extras: beam on, magnetic field lines, lab photo, AR ----------
const helpers = M => {
    const by = label => M.groups.find(g => g.label === label);
    const C = new THREE.Vector3(); M.meshes.forEach(m => C.add(m.userData.c)); C.divideScalar(M.meshes.length);
    return { by, C };
};

// --- beam: the filament glows, plasma fills the chamber, beamlets stream from every aperture ---
const plasmaLight = new THREE.PointLight(0x7a6bff, 0, 0, 2);
scene.add(plasmaLight);
function buildBeam(M) {
    const { by } = helpers(M);
    const ch = by('Discharge chamber'), ag = by('Acceleration grid');
    if (!ch || !ag) return null;
    const chamber = ch.meshes[0], grid = ag.meshes[0];
    const inst = M.data.instances.find(x => x.g === M.groups.indexOf(ag)), G = M.data.geoms[inst.geo], gb = M.data.geo[inst.geo].boundingBox;
    const cc = chamber.userData.c.clone(), gc = grid.userData.c.clone(), dir = gc.clone().sub(cc).normalize();
    const base = grid.userData.base;
    const zTop = new THREE.Vector3(0, 0, gb.max.z).applyMatrix4(base).dot(dir) > new THREE.Vector3(0, 0, gb.min.z).applyMatrix4(base).dot(dir) ? gb.max.z : gb.min.z;
    // beamlets: three particles per aperture
    const ap = G.apertures.c, n = ap.length * 3, start = new Float32Array(n * 3), seed = new Float32Array(n), perp = new Float32Array(n * 3);
    const tmp = new THREE.Vector3(), a = new THREE.Vector3(1, 0, 0).cross(dir).normalize(), b = dir.clone().cross(a);
    let rMax = 0;
    for (let i = 0; i < n; i++) {
        const [x, y] = ap[i % ap.length];
        tmp.set(x, y, zTop).applyMatrix4(base);
        start.set([tmp.x, tmp.y, tmp.z], i * 3);
        rMax = Math.max(rMax, tmp.clone().sub(gc).sub(dir.clone().multiplyScalar(tmp.clone().sub(gc).dot(dir))).length());
        seed[i] = Math.random();
        const t = Math.random() * Math.PI * 2, r = Math.random();
        perp.set([(a.x * Math.cos(t) + b.x * Math.sin(t)) * r, (a.y * Math.cos(t) + b.y * Math.sin(t)) * r, (a.z * Math.cos(t) + b.z * Math.sin(t)) * r], i * 3);
    }
    const len = M.radius * 1.15;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(start, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); pg.setAttribute('aPerp', new THREE.BufferAttribute(perp, 3));
    const uniforms = { uTime: { value: 0 }, uOn: { value: 0 }, uLen: { value: len }, uDir: { value: dir }, uScale: { value: 400 }, uSize: { value: 2.4 }, uColor: { value: new THREE.Color(0x8fa2ff) } };
    const beamlets = new THREE.Points(pg, new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; attribute vec3 aPerp; uniform float uTime, uLen, uScale, uSize, uOn; uniform vec3 uDir; varying float vA;
            void main() { float s = fract(aSeed + uTime * 0.55); vec3 p = position + uDir * (s * uLen) + aPerp * (s * uLen * 0.035);
              vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
              gl_PointSize = uSize * uScale / -mv.z; vA = uOn * smoothstep(0.0, 0.04, s) * pow(1.0 - s, 1.6); }`,
        fragmentShader: `uniform vec3 uColor; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(uColor + 0.35 * a, a); }`
    }));
    beamlets.frustumCulled = false;
    // beam envelope: a soft additive column ahead of the grid
    const col = new THREE.Mesh(new THREE.CylinderGeometry(rMax * 1.02, rMax * 1.6, len, 64, 1, true), new THREE.ShaderMaterial({
        uniforms: { uOn: uniforms.uOn, uColor: { value: new THREE.Color(0x5f6dff) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vUv; varying vec3 vN, vV; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform float uOn; uniform vec3 uColor; varying vec2 vUv; varying vec3 vN, vV; void main() { float f = pow(abs(dot(vN, vV)), 2.0); float a = uOn * 0.22 * f * pow(vUv.y, 1.4); gl_FragColor = vec4(uColor, a); }`
    }));
    col.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    col.position.copy(gc).add(dir.clone().multiplyScalar(len / 2 + 0.5));
    // plasma: soft flickering glow filling the chamber (seen through the apertures, or with Cut)
    const cs = chamber.userData.bb.getSize(new THREE.Vector3()), R = Math.min(cs.x, cs.y) * 0.4, H = cs.z * 0.8, np = 320;
    const pp = new Float32Array(np * 3), ps = new Float32Array(np);
    for (let i = 0; i < np; i++) {
        const t = Math.random() * Math.PI * 2, r = R * Math.sqrt(Math.random()), z = (Math.random() - 0.5) * H;
        pp.set([cc.x + r * Math.cos(t), cc.y + r * Math.sin(t), cc.z + z], i * 3); ps[i] = Math.random();
    }
    const plg = new THREE.BufferGeometry(); plg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); plg.setAttribute('aSeed', new THREE.BufferAttribute(ps, 1));
    const plasma = new THREE.Points(plg, new THREE.ShaderMaterial({
        uniforms: { uTime: uniforms.uTime, uOn: uniforms.uOn, uScale: uniforms.uScale, uSize: { value: R * 0.75 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; uniform float uTime, uScale, uSize, uOn; varying float vA; varying float vS;
            void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uScale / -mv.z;
              vA = uOn * (0.55 + 0.45 * sin(uTime * (3.0 + aSeed * 5.0) + aSeed * 40.0)); vS = aSeed; }`,
        fragmentShader: `varying float vA; varying float vS; void main() { float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 2.0) * vA * 0.32;
            vec3 c = mix(vec3(0.42, 0.36, 1.0), vec3(0.75, 0.45, 1.0), vS); gl_FragColor = vec4(c, a); }`
    }));
    plasma.frustumCulled = false;
    const holder = new THREE.Group(); holder.add(plasma, col, beamlets); holder.visible = false; M.holder.add(holder);
    return { holder, uniforms, cc };
}

// --- magnetic field lines: magnets as uniformly magnetised blocks (pole-face charges), traced from N faces ---
function buildField(M) {
    const pole = POLES[MODELS[built.indexOf(M)].key];
    if (!pole) return null;
    const { by, C } = helpers(M);
    const ch = by('Discharge chamber'), gr = by('Acceleration grid') || by('Screen grid');
    const ctx = { axis: C, dirSign: ch && gr ? Math.sign(gr.meshes[0].userData.c.z - ch.meshes[0].userData.c.z) || 1 : 1, sideMid: 0 };
    const side = by('Side cusp magnet');
    if (side) ctx.sideMid = side.meshes.reduce((s, m) => s + m.userData.c.z, 0) / side.meshes.length;
    const mags = [];
    M.groups.forEach((g, gi) => g.meshes.forEach(mesh => {
        const c = mesh.userData.c, m = pole(g.label, c, ctx);
        if (!m) return;
        const inst = M.data.instances[M.meshes.indexOf(mesh)], size = M.data.geo[inst.geo].boundingBox.getSize(new THREE.Vector3());
        const e = mesh.userData.base.elements, axes = [0, 1, 2].map(k => new THREE.Vector3(e[k * 4], e[k * 4 + 1], e[k * 4 + 2]));
        const half = axes.map((a, k) => a.length() * [size.x, size.y, size.z][k] / 2), dirs = axes.map(a => a.clone().normalize());
        const k = [0, 1, 2].sort((x, y) => Math.abs(dirs[y].dot(m)) - Math.abs(dirs[x].dot(m)))[0], o = [0, 1, 2].filter(x => x !== k);
        mags.push({ c, m, h: half[k], u: dirs[o[0]], hu: half[o[0]], v: dirs[o[1]], hv: half[o[1]] });
    }));
    if (!mags.length) return null;
    const q = [];   // pole-face charges
    mags.forEach(g => [1, -1].forEach(sg => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
        q.push({ p: g.c.clone().addScaledVector(g.m, sg * g.h).addScaledVector(g.u, i * g.hu * 0.66).addScaledVector(g.v, j * g.hv * 0.66), s: sg / 9 }); }));
    const eps = 0.25, B = (p, out) => {
        out.set(0, 0, 0);
        for (const c of q) { const dx = p.x - c.p.x, dy = p.y - c.p.y, dz = p.z - c.p.z, r2 = dx * dx + dy * dy + dz * dz + eps, f = c.s / (r2 * Math.sqrt(r2)); out.x += dx * f; out.y += dy * f; out.z += dz * f; }
        return out;
    };
    const inside = p => mags.some(g => { const d = p.clone().sub(g.c); return Math.abs(d.dot(g.m)) < g.h && Math.abs(d.dot(g.u)) < g.hu && Math.abs(d.dot(g.v)) < g.hv; });
    const cfg = FIELD[MODELS[built.indexOf(M)].key] || { seeds: 3, reach: 0.8 };
    const ds = M.radius * 0.01, Rdom = M.radius * cfg.reach, pos = [], col = [];
    // calibrate: the field just off the centre of each N pole face averages SURFACE_GAUSS
    const probe = new THREE.Vector3(), tmpB = new THREE.Vector3();
    const kG = SURFACE_GAUSS / (mags.reduce((a, g) => a + B(probe.copy(g.c).addScaledVector(g.m, g.h + 0.5), tmpB).length(), 0) / mags.length);
    // colour by local strength, log scale from G_MIN (indigo) to the surface value (yellow)
    const STOPS = [[0, 0x5e5ce6], [0.4, 0xbf5af2], [0.72, 0xff375f], [1, 0xffd60a]].map(([t, c]) => [t, new THREE.Color(c)]);
    const cc = new THREE.Color();
    const shade = gauss => {
        const t = clamp((Math.log10(Math.max(gauss, 1)) - Math.log10(G_MIN)) / (Math.log10(SURFACE_GAUSS) - Math.log10(G_MIN)));
        let k = 0; while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++;
        return cc.copy(STOPS[k][1]).lerp(STOPS[k + 1][1], (t - STOPS[k][0]) / (STOPS[k + 1][0] - STOPS[k][0]));
    };
    const b1 = new THREE.Vector3(), b2 = new THREE.Vector3();
    function trace(p, sign) {      // follow the field until the line enters a magnet (closed) or wanders off (dropped)
        const line = [p.clone()];
        for (let st = 0; st < 900; st++) {
            const d1 = B(p, b1).normalize().multiplyScalar(sign); if (!isFinite(d1.x)) return null;
            const mid = p.clone().addScaledVector(d1, ds / 2), d2 = B(mid, b2).normalize().multiplyScalar(sign);
            p.addScaledVector(d2, ds); line.push(p.clone());
            if (st > 2 && inside(p)) return line.length > 3 ? line : null;
            if (p.distanceTo(C) > Rdom) return null;
        }
        return null;
    }
    const box = new THREE.Box3(); M.meshes.forEach(m => box.union(m.userData.bb)); box.expandByScalar(M.radius * 0.01);
    function addLine(line) {        // coloured N (red) to S (blue), drawn as segments
        if (cfg.box && line.some(p => !box.containsPoint(p))) return;   // keep the picture inside the source
        for (let s2 = 0; s2 < line.length - 1; s2++) {
            pos.push(line[s2].x, line[s2].y, line[s2].z, line[s2 + 1].x, line[s2 + 1].y, line[s2 + 1].z);
            for (const q2 of [line[s2], line[s2 + 1]]) { const c3 = shade(B(q2, tmpB).length() * kG); col.push(c3.r, c3.g, c3.b); }
        }
    }
    mags.forEach(g => {
        const nu = cfg.seeds, nv = cfg.seeds;
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
            const fu = nu > 1 ? (i / (nu - 1) - 0.5) * 1.4 : 0, fv = nv > 1 ? (j / (nv - 1) - 0.5) * 1.4 : 0;
            const p = g.c.clone().addScaledVector(g.m, g.h + ds * 0.3).addScaledVector(g.u, fu * g.hu).addScaledVector(g.v, fv * g.hv);
            const line = trace(p, 1);
            if (line) addLine(line);      // only loops that return to a magnet: the cusps, not the stray outer flux
        }
    });
    // filter gap: seed across the middle and trace both ways, so the field that crosses the gap is drawn too
    if (cfg.gap) {
        const mid = mags.reduce((a, g) => a.add(g.c), new THREE.Vector3()).divideScalar(mags.length), m0 = mags[0];
        const span = mags.reduce((a, g) => Math.max(a, Math.abs(g.c.clone().sub(mid).dot(m0.u)) + g.hu), 0) * 0.8;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
            const p0 = mid.clone().addScaledVector(m0.u, i / 2 * span).addScaledVector(m0.v, j / 2 * m0.hv * 0.8);
            const back = trace(p0.clone(), -1), fwd = trace(p0.clone(), 1);
            if (back && fwd) addLine(back.reverse().concat(fwd.slice(1)));
        }
    }
    const geo = new LineSegmentsGeometry(); geo.setPositions(pos); geo.setColors(col);
    const mat = new LineMaterial({ vertexColors: true, linewidth: 2.2, transparent: true, opacity: 0, depthWrite: false, dashed: true, dashSize: ds * 4, gapSize: ds * 2.2 });
    mat.resolution.set(stage.clientWidth, stage.clientHeight);
    const lines = new LineSegments2(geo, mat); lines.computeLineDistances(); lines.renderOrder = 2;
    // a faint x-ray copy shows the field where it runs through solid parts (e.g. across the RPA collector)
    const ghostMat = mat.clone(); ghostMat.depthTest = false; ghostMat.resolution = mat.resolution;
    const ghost = new LineSegments2(geo, ghostMat); ghost.renderOrder = 1;
    const grp = new THREE.Group(); grp.add(ghost, lines); grp.visible = false;
    grp.material = mat; grp.ghost = ghostMat;
    M.holder.add(grp);
    return grp;
}

function stepExtras(dt, time) {
    if (!model) return;
    const away = 1 - smooth(0.04, 0.2, explodeT);          // extras belong to the assembled view
    beamVis += ((beamOn ? away : 0) - beamVis) * (1 - Math.exp(-dt * 4));
    fieldVis += ((fieldOn ? away : 0) - fieldVis) * (1 - Math.exp(-dt * 5));
    if (model.beam) {
        const u = model.beam.uniforms; u.uOn.value = beamVis; u.uTime.value = time;
        u.uScale.value = stage.clientHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        model.beam.holder.visible = beamVis > 0.01;
        plasmaLight.intensity = beamVis * model.radius * model.radius * 0.5 * (0.9 + 0.1 * Math.sin(time * 23));
        plasmaLight.position.copy(model.beam.cc).applyMatrix4(root.matrixWorld);
    } else plasmaLight.intensity = 0;
    if (model.field) {
        model.field.material.opacity = fieldVis * 0.95; model.field.ghost.opacity = fieldVis * 0.28;
        model.field.material.dashOffset -= dt * model.radius * 0.06; model.field.ghost.dashOffset = model.field.material.dashOffset;
        model.field.visible = fieldVis > 0.01;
    }
    $('legend').hidden = !(fieldOn && fieldVis > 0.3);
}

$('t-beam').addEventListener('click', e => {
    if (!model) return;
    if (!model.beam) model.beam = buildBeam(model);
    beamOn = !beamOn; e.currentTarget.setAttribute('aria-pressed', String(beamOn)); sound('toggle');
});
$('t-field').addEventListener('click', e => {
    if (!model) return;
    if (!model.field) model.field = buildField(model);
    fieldOn = !fieldOn; e.currentTarget.setAttribute('aria-pressed', String(fieldOn)); sound('toggle');
    if (fieldOn && !cut) { cut = true; applyCut(); }   // the cusps live inside the chamber: open it up
});

// --- lab photo: drag the divider to wipe between the live model and the photo ---
const cmp = $('compare'), bar = $('cmp-bar');
const setCmp = x => { const v = clamp(x, 0.04, 0.96); cmp.style.setProperty('--x', (v * 100).toFixed(2) + '%'); bar.setAttribute('aria-valuenow', Math.round(v * 100)); };
$('t-photo').addEventListener('click', e => {
    photoOn = !photoOn; cmp.hidden = !photoOn; e.currentTarget.setAttribute('aria-pressed', String(photoOn)); sound('toggle');
    if (photoOn) setCmp(0.5);
});
let cmpDrag = false;
bar.addEventListener('pointerdown', e => { cmpDrag = true; bar.setPointerCapture(e.pointerId); });
bar.addEventListener('pointermove', e => { if (!cmpDrag) return; const r = stage.getBoundingClientRect(); setCmp((e.clientX - r.left) / r.width); });
bar.addEventListener('pointerup', () => { cmpDrag = false; });
bar.addEventListener('keydown', e => {
    const v = parseFloat(cmp.style.getPropertyValue('--x')) / 100 || 0.5;
    if (e.key === 'ArrowLeft') { setCmp(v - 0.05); e.preventDefault(); } if (e.key === 'ArrowRight') { setCmp(v + 0.05); e.preventDefault(); }
});

// --- AR: Quick Look on iPhone / iPad, Scene Viewer on Android, a QR code everywhere else ---
const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(ua);
const quickLook = (() => { try { return document.createElement('a').relList.supports('ar'); } catch (e) { return false; } })();
$('t-ar').addEventListener('click', () => {
    if (!model) return;
    const k = MODELS[active].key, abs = u => new URL(u, location.href).href;
    if (isIOS && quickLook) {
        const a = document.createElement('a'); a.rel = 'ar'; a.href = `/CV/cad/ar/${k}.usdz`; a.appendChild(document.createElement('img')); a.click(); return;
    }
    if (isAndroid) {
        const glb = abs(`/CV/cad/ar/${k}.glb`), back = location.href.split('#')[0] + '#' + k;
        location.href = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glb)}&mode=ar_preferred&title=${encodeURIComponent(model.data.name)}` +
            `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(back)};end;`;
        return;
    }
    const pop = $('ar-pop'); pop.hidden = !pop.hidden; sound('toggle');
    if (!pop.hidden) qrInto($('ar-qr'), location.href.split('#')[0] + '#' + k);
});
$('ar-x').addEventListener('click', () => { $('ar-pop').hidden = true; });
let qrLib = null;
function qrInto(el, text) {
    el.innerHTML = '';
    qrLib = qrLib || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'; s.onload = () => res(window.qrcode); s.onerror = rej; document.head.appendChild(s); });
    qrLib.then(qrcode => { const q = qrcode(0, 'M'); q.addData(text); q.make(); el.innerHTML = q.createSvgTag({ scalable: true, margin: 0 }); })
        .catch(() => { el.textContent = text; });
}

// ---------- loop ----------
function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    built.forEach(M => { if (M && M.field) M.field.material.resolution.set(w, h); });
}
new ResizeObserver(resize).observe(stage); resize();

let visible = true, last = performance.now();
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
const _c = new THREE.Vector3();
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;

    gTarget = scrollG();
    gSmooth = reduce ? gTarget : gSmooth + (gTarget - gSmooth) * (1 - Math.exp(-dt * 9));
    if (Math.abs(gTarget - gSmooth) < 1e-4) gSmooth = gTarget;
    const ci = Math.min(MODELS.length - 1, Math.floor(gSmooth)), p = gSmooth - ci;
    activate(ci);
    document.querySelectorAll('#chapters button i').forEach((el, k) => el.style.setProperty('--p', k === ci ? p.toFixed(3) : 0));
    if (!model || active !== ci) { $('loading').classList.remove('done'); return; }

    // scroll keyframes: distance, explode; the turntable follows the scroll
    const kf = keyAt(p);
    if (Math.abs(kf.e - explodeT) > 1e-4) { explodeT = kf.e; applyExplode(); }
    // fade between chapters, captions per phase
    const fadeIn = ci > 0 ? smooth(0, 0.05, p) : 1, fadeOut = ci < MODELS.length - 1 ? 1 - smooth(0.95, 1, p) : 1;
    const vis = fadeIn * fadeOut;
    canvas.style.opacity = vis.toFixed(3); labelsEl.style.setProperty('--vis', vis.toFixed(3));
    const intro = (ci > 0 ? smooth(0.0, 0.05, p) : 1) * (1 - smooth(0.17, 0.27, p));
    const exCap = smooth(0.52, 0.6, p) * (1 - smooth(0.84, 0.9, p)) * (focus < 0 && selected < 0 ? 1 : 0);
    const capI = $('cap-intro'), capE = $('cap-explode');
    capI.style.opacity = intro.toFixed(3); capI.style.transform = `translateY(${(-24 * (1 - intro)).toFixed(1)}px)`;
    capE.style.opacity = exCap.toFixed(3);

    // user drag on top, with a little inertia
    if (!dragging) { velAz *= Math.exp(-dt * 5); velPol *= Math.exp(-dt * 5); userAz += velAz; userPol = clamp(userPol + velPol, -0.75, 0.5); }
    const sph = model.fit0.clone();
    sph.center.lerp(model.fit1.center, explodeT); sph.radius += (model.fit1.radius - sph.radius) * explodeT;
    const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = sph.radius / Math.sin(Math.min(vfov, hfov) / 2) * kf.m;
    const az = AZ0 + (p - 0.45) * 1.9 + userAz, pol = POL0 + userPol - 0.1 * Math.sin(Math.PI * p);
    _c.copy(sph.center);
    camera.position.set(_c.x + dist * Math.sin(pol) * Math.sin(az), _c.y + dist * Math.cos(pol), _c.z + dist * Math.sin(pol) * Math.cos(az));
    camera.lookAt(_c);
    // keep the depth range tight around the model: better depth precision, no shimmer when close
    camera.near = Math.max(model.radius * 0.004, dist - model.radius * 2.2); camera.far = dist + model.radius * 3; camera.updateProjectionMatrix();
    // while the title shows on the left, slide the model to the right of it
    const W = stage.clientWidth, H = stage.clientHeight;
    const shift = W > 900 ? intro * W * 0.16 : 0;
    if (shift > 0.5) camera.setViewOffset(W, H, -shift, 0, W, H); else camera.clearViewOffset();

    // a list click waits until the scroll has arrived
    if (pending && pending.chapter === ci && explodeT > 0.9) {
        if (pending.kind === 's') { focus = -1; focusSystem(pending.idx, false); } else { focus = -1; select(pending.idx); }
        pending = null;
    }

    stepExtras(dt, now / 1000);
    stepMaterials(dt);
    hoverStep();
    placeLabels();
    renderer.render(scene, camera);
}

// ---------- start: the first model first, the others in the background ----------
(async () => {
    try {
        for (let i = 0; i < MODELS.length; i++) {
            const data = await fetchModel(MODELS[i].key);
            built[i] = build(data);
            if (i === listIdx) renderParts();
            if (i === 0) {
                requestAnimationFrame(loop);
                const h = MODELS.findIndex(m => m.key === location.hash.slice(1));
                if (h >= 0) setTimeout(() => scrollToChapter(h, 0.17, true), 50);
            }
        }
    } catch (err) {
        $('loading').innerHTML = '<span>Could not load the model.</span>'; console.error(err);
    }
})();
