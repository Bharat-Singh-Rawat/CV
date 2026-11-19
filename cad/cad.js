// Hardware in 3D: CAD assemblies shown like product renders.
// Model data (/CV/cad/models/<key>.json + .bin) is exported from the original SolidWorks / STEP files:
// one geometry per unique part, instances with 4x4 matrices (CAD axes, z up, mm), explode offsets (mm, CAD axes).
// Grid apertures are not meshed: their centres come with the grid and are drawn as a see-through perforation mask.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODELS = [
    { key: 'oris', name: 'Ring-cusp ion source' },
    { key: 'fc-array', name: 'Faraday cup array' },
    { key: 'magnetic-rpa', name: 'Magnetic RPA' }
];
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
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = id => document.getElementById(id);
const dark = () => document.documentElement.dataset.theme === 'dark';
// interface sounds come from the CV's own sfx.js (same tick / tock, same mute switch); buttons already click through it
const sound = k => { try { window.cvSfx && window.cvSfx[k] && window.cvSfx[k](); } catch (e) { /* audio not ready */ } };
let lastTick = 0;
const tick = () => { const n = performance.now(); if (n - lastTick > 70) { lastTick = n; sound('hover'); } };

// ---------- renderer, scene, camera ----------
const canvas = $('view'), stage = $('stage');
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

// photo studio for reflections: dim cyclorama, a big overhead softbox, two tall strip lights and a warm bounce card
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
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotateSpeed = 1.1;
controls.screenSpacePanning = true;

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
const cache = new Map();
let model = null;          // { data, meshes: [], groups: [{mat, meshes, ...}], ... }
let explodeT = 0, explodeGoal = 0, cut = false;
let hovered = -1, selected = -1, solo = false;
let focus = -1, hoverSys = -1;   // subsystem in focus / under the pointer (models that define subsystems)
const camGoal = { pos: null, target: null };

// ---------- loading ----------
async function fetchModel(k) {
    if (cache.has(k)) return cache.get(k);
    const p = (async () => {
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
    })();
    cache.set(k, p);
    return p;
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
            '#include <dithering_fragment>\n if (!gl_FrontFacing && capOn > 0.5) gl_FragColor.rgb = capColor;');
    };
    m.userData.fade = 1;
    return m;
}

function partMaterial(g, data) {
    const m = makeMaterial(g.kind);
    const geo = data.geo[data.instances.find(x => x.g === data.groups.indexOf(g.src)).geo];
    if (geo.userData.mask) { m.alphaMap = geo.userData.mask; m.alphaTest = 0.5; m.side = THREE.DoubleSide; m.userData.perforated = true; }
    return m;
}

async function show(k) {
    const entry = MODELS.find(m => m.key === k) || MODELS[0];
    document.querySelectorAll('#models button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.key === entry.key)));
    $('loading').classList.remove('done');
    const data = await fetchModel(entry.key);
    if (model) { model.meshes.forEach(m => root.remove(m)); model.groups.forEach(g => g.mat.dispose()); }
    selected = hovered = focus = hoverSys = -1; solo = false; closeInfo();

    const groups = data.groups.map(g => ({ ...g, src: g, meshes: [] }));
    groups.forEach(g => { g.mat = partMaterial(g, data); });
    const meshes = data.instances.map((inst, i) => {
        const g = groups[inst.g];
        const mesh = new THREE.Mesh(data.geo[inst.geo], g.mat);
        mesh.matrixAutoUpdate = false;
        mesh.userData.base = new THREE.Matrix4().set(...inst.m);
        const e = data.explode[i] || 0;
        mesh.userData.ex = Array.isArray(e) ? new THREE.Vector3(...e) : new THREE.Vector3(0, 0, e);
        mesh.userData.g = inst.g;
        mesh.castShadow = mesh.receiveShadow = true;
        const bb = data.geo[inst.geo].boundingBox.clone().applyMatrix4(mesh.userData.base);
        mesh.userData.zmin = bb.min.z; mesh.userData.bb = bb; mesh.userData.c = bb.getCenter(new THREE.Vector3());
        g.meshes.push(mesh); root.add(mesh);
        return mesh;
    });
    model = { key: entry.key, data, groups, meshes, systems: (data.systems || []).map(x => ({ ...x, set: new Set(x.groups), count: x.groups.reduce((n, i) => n + data.groups[i].count, 0) })) };
    applyExplode(true);
    applyCut();

    // shadow camera covers the whole exploded range
    const all = boundsAt(0).union(boundsAt(1));
    const s = all.getSize(new THREE.Vector3()), r = Math.max(s.x, s.y, s.z) * 0.9;
    Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 8 });
    key.shadow.camera.updateProjectionMatrix();
    model.radius = r;

    $('m-name').textContent = data.name;
    $('m-blurb').textContent = data.blurb || '';
    renderParts();
    buildLabels();
    frame(true);
    $('loading').classList.add('done');
    if (location.hash.slice(1) !== entry.key) history.replaceState(null, '', '#' + entry.key);
}

// world-space (three.js) bounds of the assembly at an explode amount
function boundsAt(t, only = null) {
    const b = new THREE.Box3(), v = new THREE.Box3();
    if (typeof only === 'number') only = only >= 0 ? new Set([only]) : null;
    model.meshes.forEach(m => {
        if (only && !only.has(m.userData.g)) return;
        if (!m.visible) return;
        v.copy(m.userData.bb).translate(m.userData.ex.clone().multiplyScalar(t));
        b.union(v);
    });
    return b.applyMatrix4(root.matrixWorld);
}

function applyExplode(force) {
    if (!model) return;
    const t = ease(explodeT);
    let zmin = Infinity;
    model.meshes.forEach(m => {
        m.matrix.copy(m.userData.base);
        m.matrix.elements[12] += m.userData.ex.x * t; m.matrix.elements[13] += m.userData.ex.y * t; m.matrix.elements[14] += m.userData.ex.z * t;
        m.matrixWorldNeedsUpdate = true;
        if (m.visible) zmin = Math.min(zmin, m.userData.zmin + m.userData.ex.z * t);
    });
    const y = zmin - 0.3;
    floor.position.y = y; blob.position.y = y + 0.05;
    const b = boundsAt(t), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const w = Math.max(s.x, s.z);
    floor.scale.set(w * 6, w * 6, 1); floor.position.x = c.x; floor.position.z = c.z;
    blob.scale.set(s.x * 1.35, s.z * 1.35, 1); blob.position.x = c.x; blob.position.z = c.z;
    const R = model.radius || w;
    key.position.set(c.x + R * 0.6, y + R * 2.4, c.z + R * 0.9); key.target.position.set(c.x, y, c.z);
    if (force) root.updateMatrixWorld(true);
}
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// camera fit: three-quarter product view from slightly above
function fitFor(t, group = null) {
    const b = boundsAt(ease(t), group), sph = b.getBoundingSphere(new THREE.Sphere());
    const fov = THREE.MathUtils.degToRad(camera.fov), aspect = camera.aspect;
    const fit = sph.radius / Math.sin(Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * aspect)) / 2);
    const dir = camera.position.clone().sub(controls.target);
    if (!dir.lengthSq() || !camGoal.keepDir) dir.set(1, 0.72, 1.35);
    dir.normalize();
    return { target: sph.center, pos: sph.center.clone().add(dir.multiplyScalar(fit * (group != null && group !== -1 ? 1.15 : 0.98 + 0.3 * ease(explodeGoal)))) };
}
function frame(reset, group = null) {
    camGoal.keepDir = !reset;
    const f = fitFor(explodeGoal, group);
    camGoal.pos = f.pos; camGoal.target = f.target;
    if (reset && !camera.userData.ready) { camera.position.copy(f.pos); controls.target.copy(f.target); camera.userData.ready = true; }
    controls.minDistance = (model.radius || 50) * 0.25;
    controls.maxDistance = (model.radius || 50) * 12;
    camera.near = (model.radius || 50) * 0.02; camera.far = (model.radius || 50) * 40; camera.updateProjectionMatrix();
}

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
    document.querySelectorAll('#parts .part').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === selected)));
    document.querySelectorAll('#parts .sys-btn').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.s === focus)));
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
        m.emissiveIntensity += ((g.goalGlow || 0) - m.emissiveIntensity) * k;
        g.meshes.forEach(me => { me.castShadow = f > 0.5; });
    });
}

function select(i, fromList) {
    selected = i === selected ? -1 : i;
    solo = false; $('i-solo').setAttribute('aria-pressed', 'false');
    paint();
    if (selected < 0) { closeInfo(); return; }
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
    const sr = stage.getBoundingClientRect();
    if (fromList && (sr.top < 0 || sr.bottom > innerHeight)) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
function closeInfo() { $('info').hidden = true; }
// subsystem focus: fade everything else, name only its parts, and describe it in the card
function focusSystem(sIdx, fromList, toggle = true) {
    focus = toggle && sIdx === focus ? -1 : sIdx; selected = -1; hoverSys = -1;
    solo = false; $('i-solo').setAttribute('aria-pressed', 'false');
    if (focus >= 0 && explodeGoal < 0.6) { explodeGoal = 1; slider.value = 1; slider.style.setProperty('--p', '100%'); }
    paint();
    if (focus < 0) { closeInfo(); frame(false); return; }
    const sy = model.systems[focus];
    $('i-mat').textContent = 'Subsystem';
    $('i-name').textContent = sy.label;
    $('i-blurb').textContent = sy.blurb || '';
    $('i-qty-t').textContent = 'Parts'; $('i-size-t').textContent = 'Part types';
    $('i-qty').textContent = sy.count; $('i-size').textContent = sy.groups.length;
    $('info').hidden = false;
    frame(false, sy.set);
    const sr = stage.getBoundingClientRect();
    if (fromList && (sr.top < 0 || sr.bottom > innerHeight)) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
function clearAll() { selected = -1; focus = -1; solo = false; paint(); closeInfo(); }
$('sys-back').addEventListener('click', () => { focusSystem(focus); });
$('info-x').addEventListener('click', () => { if (selected >= 0 && focus >= 0) focusSystem(focus, false, false); else clearAll(); });
$('i-solo').addEventListener('click', e => {
    solo = !solo; e.currentTarget.setAttribute('aria-pressed', String(solo)); paint(); applyExplode();
});
$('i-zoom').addEventListener('click', () => { if (selected >= 0) frame(false, selected); else if (focus >= 0) frame(false, model.systems[focus].set); });

// ---------- parts list ----------
function swatch(kind) {
    const c = new THREE.Color((FINISH[kind] || FINISH.steel).color).getStyle();
    const metal = (FINISH[kind] || FINISH.steel).metalness;
    return metal
        ? `background: radial-gradient(circle at 32% 28%, #fff 0%, ${c} 38%, color-mix(in srgb, ${c} 55%, #000) 100%)`
        : `background: radial-gradient(circle at 32% 28%, #fff 0%, ${c} 55%, color-mix(in srgb, ${c} 80%, #000) 100%)`;
}
function renderParts() {
    const ul = $('parts');
    const part = i => { const g = model.groups[i]; return `<li><button type="button" class="part" data-i="${i}" aria-pressed="false">
        <span class="sw" style="${swatch(g.kind)}" aria-hidden="true"></span>
        <span><span class="p-name">${esc(g.label)}</span><span class="p-mat">${esc(g.material || (FINISH[g.kind] || FINISH.steel).label)}</span></span>
        <span class="p-qty">× ${g.count}</span></button></li>`; };
    ul.innerHTML = model.systems.length
        ? model.systems.map((sy, s) => `<li class="sys-h"><button type="button" class="sys-btn" data-s="${s}" aria-pressed="false"><b>${esc(sy.label)}</b><span>${esc(sy.blurb)}</span></button></li>` + sy.groups.map(part).join('')).join('')
        : model.groups.map((g, i) => part(i)).join('');
    ul.querySelectorAll('.part').forEach(b => {
        const i = +b.dataset.i;
        b.addEventListener('click', () => select(i, true));
        b.addEventListener('pointerenter', () => { hovered = i; paint(); tick(); });
        b.addEventListener('pointerleave', () => { hovered = -1; paint(); });
    });
    ul.querySelectorAll('.sys-btn').forEach(b => {
        const s = +b.dataset.s;
        b.addEventListener('click', () => focusSystem(s, true));
        b.addEventListener('pointerenter', () => { hoverSys = s; paint(); tick(); });
        b.addEventListener('pointerleave', () => { hoverSys = -1; paint(); });
    });
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
        const c = { kind, idx, groups, el, leader, dot };
        if (kind === 's') {
            el.addEventListener('click', () => focusSystem(idx));
            el.addEventListener('pointerenter', () => { hoverSys = idx; paint(); tick(); });
            el.addEventListener('pointerleave', () => { hoverSys = -1; paint(); });
        } else {
            el.addEventListener('click', () => select(idx));
            el.addEventListener('pointerenter', () => { hovered = idx; paint(); tick(); });
            el.addEventListener('pointerleave', () => { hovered = -1; paint(); });
        }
        callouts.push(c);
    };
    callouts = [];
    model.groups.forEach((g, i) => mk('g', i, [i], `<span>${esc(g.label)}</span>`));
    model.systems.forEach((sy, s) => mk('s', s, sy.groups, `<span>${esc(sy.label)}<em>${sy.count}</em></span>`));
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const hide = c => { c.el.classList.remove('vis'); c.leader.style.opacity = c.dot.style.opacity = 0; };
function placeLabels() {
    const t = ease(explodeT), on = !!model && t > 0.55;
    labelsEl.classList.toggle('on', on);
    if (!on) return;
    const W = stage.clientWidth, H = stage.clientHeight, small = W < 640;
    const top = small ? 64 : 92, bottom = H - (small ? 78 : 92), gap = small ? 21 : 27;
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
    const pad = small ? 18 : 46;
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

// ---------- picking ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let pointer = null, down = null;
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
canvas.addEventListener('pointermove', e => { pointer = { x: e.clientX, y: e.clientY, type: e.pointerType }; });
canvas.addEventListener('pointerleave', () => { pointer = null; if (hovered >= 0) { hovered = -1; paint(); } $('tip').classList.remove('on'); canvas.classList.remove('over'); });
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; canvas.classList.add('grabbing'); stopSpin(); });
canvas.addEventListener('pointerup', e => {
    canvas.classList.remove('grabbing');
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const g = pick(e.clientX, e.clientY);
    if (g >= 0) { sound('click'); select(g); }
    else if (selected >= 0 && focus >= 0) { sound('click'); focusSystem(focus, false, false); }
    else if (selected >= 0 || focus >= 0) { sound('click'); clearAll(); }
});
function hoverStep() {
    if (!pointer || pointer.type !== 'mouse' || down && controlsBusy) return;
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
let controlsBusy = false;
controls.addEventListener('start', () => { controlsBusy = true; camGoal.pos = null; });
controls.addEventListener('end', () => { controlsBusy = false; down = null; });

// ---------- dock ----------
const slider = $('explode');
let detent = 0;
slider.addEventListener('input', () => {
    explodeGoal = +slider.value;
    const d = Math.round(explodeGoal * 10); if (d !== detent) { detent = d; tick(); }
    slider.style.setProperty('--p', (explodeGoal * 100) + '%');
    frame(false);
});
$('t-cut').addEventListener('click', () => { cut = !cut; applyCut(); sound('toggle'); });
const spinBtn = $('t-spin');
function stopSpin() { controls.autoRotate = false; spinBtn.setAttribute('aria-pressed', 'false'); }
spinBtn.addEventListener('click', () => { sound('toggle'); controls.autoRotate = !controls.autoRotate; spinBtn.setAttribute('aria-pressed', String(controls.autoRotate)); });
$('t-reset').addEventListener('click', () => {
    selected = hovered = focus = hoverSys = -1; solo = false; paint(); closeInfo();
    explodeGoal = 0; slider.value = 0; slider.style.setProperty('--p', '0%');
    cut = false; applyCut();
    camGoal.keepDir = false; const f = fitFor(0); camGoal.pos = f.pos; camGoal.target = f.target;
});

document.addEventListener('pointerover', e => {
    const el = e.target.closest('#models button, .tool, .pill-btn, .info .x, .sys-back');
    if (el && !el.contains(e.relatedTarget)) tick();
}, { passive: true });

// ---------- model switcher ----------
$('models').innerHTML = MODELS.map(m => `<button type="button" role="tab" data-key="${m.key}" aria-selected="false">${esc(m.name)}</button>`).join('');
$('models').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || (model && b.dataset.key === model.key)) return;
    camera.userData.ready = false; show(b.dataset.key);
});
window.addEventListener('hashchange', () => { const k = location.hash.slice(1); if (MODELS.some(m => m.key === k) && (!model || model.key !== k)) { camera.userData.ready = false; show(k); } });

// ---------- loop ----------
function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage); resize();

let visible = true, last = performance.now();
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) return;
    if (Math.abs(explodeGoal - explodeT) > 1e-4) {
        explodeT += (explodeGoal - explodeT) * (reduce ? 1 : 1 - Math.exp(-dt * 7));
        applyExplode();
    }
    if (camGoal.pos) {
        const k = reduce ? 1 : 1 - Math.exp(-dt * 5);
        camera.position.lerp(camGoal.pos, k); controls.target.lerp(camGoal.target, k);
        if (camera.position.distanceTo(camGoal.pos) < 0.05) camGoal.pos = null;
    }
    stepMaterials(dt);
    controls.update();
    hoverStep();
    placeLabels();
    renderer.render(scene, camera);
}
requestAnimationFrame(loop);

const start = MODELS.some(m => m.key === location.hash.slice(1)) ? location.hash.slice(1) : MODELS[0].key;
show(start).catch(err => { $('loading').innerHTML = '<span>Could not load the model.</span>'; console.error(err); });
