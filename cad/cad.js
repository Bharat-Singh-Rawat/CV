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
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { penningData, PenningEvents, DetectorPlots, STAGES } from './penning.js?v=20261124g';
import { hpfcData, CoolingFlow, ThermalView } from './hpfc.js?v=20261124c';
import { Reflector } from 'three/addons/objects/Reflector.js';

// languages (cad/i18n.js, same choice as the CV): UI strings, model names, subsystems, story beats, Penning stages
const T = window.CT || (s => s);
const L10N = window.CAD_I18N || {};
const STAGES_L = L10N.stages || STAGES;

const MODELS = [
    { key: 'oris', short: 'Ion source', photo: '/CV/v2/img/oris.webp', beam: true },
    { key: 'fc-array', short: 'Faraday cups', photo: '/CV/v2/img/fc-array.webp', profile: true, deskAz: 1.25 },
    { key: 'hp-cup', short: '10 kW cup', photo: '/CV/v2/img/hp-fc-assembly.webp', procedural: 'hpfc', water: true, noAR: true, az0: -0.64, pol0: 1.36, fit: 1.3, sweep: 0.3, cutN: [-1, 0, 0], cutC: 0, cutAz: 0.95 },   // stands upright, mouth to the viewer, near eye level; the cut runs through the cup's axis (and the drive's), the view turns to it
    { key: 'magnetic-rpa', short: 'Magnetic RPA', photo: '/CV/v2/img/magnet-rpa.webp' },
    { key: 'penning', short: 'Penning trap', photo: '/CV/v2/img/at-aegis.webp', procedural: true, noAR: true, az0: -0.4, sweep: 0.35 }   // ~6 m long with the positron line and deflectometer: kept side-on
];
MODELS.forEach(m => { const t = L10N.models && L10N.models[m.key]; if (t) m.short = t[0]; });
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
// guided story (every screen): beats shown in the assembled view before it comes apart; each frames one subsystem or set of parts
const STORY = {
    'oris': [
        { sys: 'Filament & feedthroughs', title: 'Electrons first', text: 'A hot filament boils off electrons. Vacuum feedthroughs carry its current in through the back flange.' },
        { sys: 'Plasma chamber', title: 'Lighting the plasma', text: 'The electrons collide with the gas in the octagonal chamber and ionise it.' },
        { sys: 'Ring-cusp magnets', title: 'Keeping it dense', text: 'Rings of magnets line the walls. Electrons spiral along the cusp field and bounce back, so they stay in the plasma for longer.', fx: 'field' },
        { sys: 'Extraction grids', title: 'Out comes the beam', text: 'Two grids a short gap apart pull the ions out through thousands of apertures, as a beam.', fx: 'beam' },
        { sys: 'Insulators & hardware', title: 'Holding the voltage', text: 'Alumina bushes keep every electrode at its own potential.' }
    ],
    'fc-array': [
        { parts: ['Faraday cup'], title: 'Catching the beam', text: 'Eleven copper cups each collect the current that lands on them. Side by side, they read the beam profile.', fx: 'profile' },
        { parts: ['Suppressor electrode'], title: 'No escaping electrons', text: 'Biased negative, the suppressor turns secondary electrons back into the cups, so each reading stays honest.' },
        { parts: ['Earth electrode and base'], title: 'A defined view', text: 'The grounded front electrode shields the cups and sets the patch of beam each one sees.' },
        { parts: ['Ceramic bush', 'Stepped ceramic bush', 'Plain ceramic bush'], title: 'Every cup on its own', text: 'Ceramic bushes isolate the cups, so every current is measured separately.' }
    ],
    'magnetic-rpa': [
        { parts: ['Front cover'], title: 'Ions in', text: 'Ions enter through the aperture in the front cover.' },
        { parts: ['Side cusp magnet'], title: 'Electrons out', text: 'Magnets on both sides set up a field across the path that turns electrons away, so only ions go on.', fx: 'field' },
        { parts: ['Copper collector'], title: 'Counting what passes', text: 'The copper collector measures the ions that get past the retarding potential.' }
    ]
};
STORY['hp-cup'] = [
    { parts: ['Cup body'], title: 'Ten kilowatts on copper', text: 'The ion beam stops on the floor of a solid copper cup. At full current that is around 10 kW of heat, in a block you can hold in one hand.', fx: 'heat', az: 0 },
    { parts: ['Suppressor ring', 'Ceramic isolator', 'Ceramic bushes'], title: 'Keeping the electrons in', text: 'Ions hitting copper knock out secondary electrons. A suppressor ring at the front, biased negative and isolated from the cup by ceramic, turns them back, so the measured current stays honest.', fx: 'suppress', az: 0 },
    { parts: ['Cooling coil'], title: 'Water takes the heat', text: 'A copper tube is brazed round the cup in five turns. Cold water comes in along the arm, winds round the cup and leaves warm.', fx: 'water', az: 0 },
    { parts: ['Ceramic standoffs', 'Cup bracket', 'Arm and shaft'], title: 'Hanging on ceramic', text: 'The cup hangs from a steel arm on ceramic standoffs, so the only way its charge can leave is through the signal lead.', fx: 'water', az: 0 },
    { parts: ['Pneumatic cylinder', 'Edge-welded bellows', 'Bellows flanges', 'Piston rod', 'Tie rods', 'Actuator plate', 'Air fittings', 'Mounting flange'], title: 'Into the beam', text: 'A pneumatic cylinder pushes the arm through two edge-welded bellows, which keep the vacuum sealed. The cup goes into the beam to measure, and comes back out to let the beam through.', fx: 'drive', az: 0,
      frame: ['Cup body', 'Back plate', 'Suppressor ring', 'Ceramic isolator', 'Cooling coil', 'Cup bracket', 'Ceramic standoffs'] }
];
STORY['penning'] = [
    { parts: ['Degrader foil'], title: 'Slowing the antiprotons', text: 'Antiprotons from CERN\'s decelerator pass a thin foil that slows them enough to be caught.' },
    { parts: ['Catching electrodes (C)', 'High-voltage electrodes', '5 T solenoid'], title: 'Caught in 5 tesla', text: 'High voltage on the gold electrodes and a 5 tesla field hold the antiprotons in a Penning–Malmberg trap.' },
    { parts: ['B electrodes', 'Rotating-wall electrode', '1 T solenoid'], title: 'The 1 tesla trap', text: 'Further along, a second trap sits in the 1 tesla magnet, with a rotating-wall electrode to compress the cloud.' },
    { parts: ['Positron source', 'Buffer-gas trap', 'Positron accumulator', 'Diverter', 'Positron transfer line'], title: 'Positrons join in', text: 'A sodium-22 source gives positrons. A buffer-gas trap and an accumulator stack them up, then a line brings them down into the magnet, where they turn into positronium.' },
    { parts: ['Liquid-helium vessels', 'Helium reservoirs', 'Liquid-nitrogen shields', 'Outer vacuum vessel'], title: 'Kept at 4 kelvin', text: 'The superconducting magnets and the traps sit in liquid helium at 4.2 K, inside a 77 K liquid-nitrogen shield and an insulating vacuum vessel.' },
    { parts: ['Scintillator detectors'], title: 'Annihilation', text: 'When an antiproton meets matter it annihilates into pions, photons and nuclear fragments. The scintillators catch the charged ones.' },
    { parts: ['Positronium converter', 'Gate valve', 'Deflectometer housing', 'Moiré gratings', 'Position detector'], title: 'Does antimatter fall?', text: 'Positronium meets the antiprotons to form antihydrogen. Downstream, a moiré deflectometer measures how far it falls on its way.' }
];
const STORY_W0 = 0.12, STORY_W1 = 0.64, STORY_MOVE = 0.45;   // a beat moves on after 45% of its scroll
const FIELD = { 'oris': { seeds: 3, reach: 0.62, box: true }, 'magnetic-rpa': { seeds: 3, reach: 0.8, gap: true } };
const BASE = '/CV/cad/models/';

// studio materials: one finish per kind of part
// brush: strength of the fine machining grain (roughness streaks along the part's own x axis, a touch of tone)
const FINISH = {
    steel:    { color: 0xc6c9ce, metalness: 1, roughness: 0.30, brush: 1, label: '' },
    grid:     { color: 0xbcc0c6, metalness: 1, roughness: 0.17, brush: 0.5, label: '' },
    fastener: { color: 0x8f949b, metalness: 1, roughness: 0.34, brush: 0.6, label: 'Steel' },
    brass:    { color: 0xdcb462, metalness: 1, roughness: 0.22, brush: 0.8, label: 'Brass' },
    copper:   { color: 0xe08a5e, metalness: 1, roughness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.18, brush: 0.9, label: 'Copper' },
    alu:      { color: 0xcfd3d8, metalness: 0.88, roughness: 0.5, sheen: 0.35, sheenRoughness: 0.6, sheenColor: 0xe8ecf2, brush: 0.35, label: 'Aluminium' },     // anodised: soft, satin
    ceramic:  { color: 0xf6f4ef, metalness: 0, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.07, sheen: 0.25, sheenRoughness: 0.5, sheenColor: 0xffffff, label: 'Ceramic' },   // glazed
    ptfe:     { color: 0xf2f2ee, metalness: 0, roughness: 0.6, sheen: 0.4, sheenRoughness: 0.8, label: 'PTFE' },
    magnet:   { color: 0x63666c, metalness: 1, roughness: 0.24, clearcoat: 0.2, clearcoatRoughness: 0.3, label: 'Magnet' },   // nickel-plated
    bellows:  { color: 0x6e7176, metalness: 1, roughness: 0.42, brush: 0.5, label: 'Steel' },
    fitting:  { color: 0x2f6fd6, metalness: 0.2, roughness: 0.4, label: '' },
    filament: { color: 0x9d968c, metalness: 1, roughness: 0.38, label: '' },
    gold:     { color: 0xe8c47c, metalness: 1, roughness: 0.2, label: 'Gold' },
    coil:     { color: 0x9aa3b5, metalness: 0.6, roughness: 0.35, opacity: 0.16, label: '' },
    scint:    { color: 0x34c759, metalness: 0, roughness: 0.3, opacity: 0.22, label: '' },
    foil:     { color: 0xf2f2f7, metalness: 0.3, roughness: 0.3, opacity: 0.7, label: '' },
    lhe:      { color: 0x7cc8ff, metalness: 0.2, roughness: 0.15, opacity: 0.2, label: '' },      // liquid helium in its vessel: see-through
    ln2:      { color: 0xb9b2ff, metalness: 0.2, roughness: 0.2, opacity: 0.1, label: '' },
    vessel:   { color: 0xc4c8d0, metalness: 0.85, roughness: 0.3, opacity: 0.07, label: '' }     // outer vacuum vessel: a faint glass-like skin
};

// one chapter of scroll: [progress, distance (× fit), explode]; eased between keys
// chapters with a story: the beats run in the assembled view, then it comes apart
const KEYS_STORY = [
    [0.00, 2.5, 0], [0.08, 1.0, 0], [0.64, 1.0, 0], [0.70, 0.85, 0.18],
    [0.78, 1.14, 1], [0.88, 1.14, 1], [0.95, 1.35, 0], [1.00, 2.5, 0]
];
const KEYS = [
    [0.00, 2.5, 0], [0.16, 1.0, 0], [0.32, 0.68, 0], [0.42, 0.82, 0.18],
    [0.58, 1.14, 1], [0.80, 1.14, 1], [0.93, 1.35, 0], [1.00, 2.5, 0]
];
const AZ0 = 0.64, POL0 = 1.15;            // three-quarter view from slightly above

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
// phones: lighter textures, shadows and pixel ratio so the page loads and runs smoothly
const phone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
// desktop only: electrons in the cusp field, detector plots, the floor reflection (phones keep the lighter version)
const desk = !phone && innerWidth >= 900;
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
renderer.setPixelRatio(Math.min(devicePixelRatio, phone ? 1.5 : 2));
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
key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
key.shadow.radius = 14;
key.shadow.blurSamples = 20;
key.shadow.bias = -0.0004;
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.35));

// floor: soft cast shadow + a contact shadow blob, both follow the lowest part
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.16 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.material.depthWrite = false; scene.add(floor);   // no depth: a beam can rise through it
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55 }));
blob.rotation.x = -Math.PI / 2; blob.renderOrder = -1; scene.add(blob);
function blobTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.45, 'rgba(0,0,0,0.22)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// soft floor reflection (desktop): a half-resolution mirror, blurred and faded out from the model, a few percent strong
let mirror = null;
if (!phone) {
    mirror = new Reflector(new THREE.PlaneGeometry(1, 1), {
        textureWidth: 1024, textureHeight: 1024, clipBias: 0.003,
        shader: {
            name: 'SoftFloorReflection',
            uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStrength: { value: 0.1 }, uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) } },
            vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vLoc;
                void main() { vUv = textureMatrix * modelMatrix * vec4(position, 1.0); vLoc = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform sampler2D tDiffuse; uniform float uStrength; uniform vec2 uTexel; varying vec4 vUv; varying vec2 vLoc;
                void main() {
                    vec2 uv = vUv.xy / vUv.w; vec4 c = vec4(0.0);
                    for (int x = -2; x <= 2; x++) for (int y = -2; y <= 2; y++) c += texture2D(tDiffuse, uv + vec2(float(x), float(y)) * uTexel * 2.2);
                    c /= 25.0;
                    float fade = smoothstep(0.5, 0.06, length(vLoc));
                    gl_FragColor = vec4(c.rgb, c.a * fade * uStrength);
                }`
        }
    });
    mirror.material.transparent = true; mirror.material.depthWrite = false;
    mirror.rotation.x = -Math.PI / 2; mirror.renderOrder = -2; scene.add(mirror);
}
const applyTheme = () => {
    // the stage is graphite in both page themes: shadows, reflection and studio light always use the dark-stage values
    floor.material.opacity = 0.42;
    blob.material.opacity = 0.85;
    scene.environmentIntensity = 0.9;
    if (mirror) mirror.material.uniforms.uStrength.value = 0.16;
};
applyTheme();
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
// the site bar switches to dark glass while the graphite stage is under it
{
    const bar = document.querySelector('.bar');
    const onStage = () => { const r = stage.getBoundingClientRect(), h = bar.offsetHeight; bar.classList.toggle('on-stage', r.top < h && r.bottom > h * 0.5); };
    addEventListener('scroll', onStage, { passive: true }); addEventListener('resize', onStage); onStage();
}

// CAD is z-up; the root turns it to three.js y-up
const root = new THREE.Group(); root.rotation.x = -Math.PI / 2; scene.add(root); root.updateMatrixWorld(true);
const cutPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

// ---------- state ----------
const built = [];          // per chapter: the built model, once loaded
let active = -1, model = null;
let explodeT = 0, cut = false, cutAzS = 0;
let hovered = -1, selected = -1, solo = false;
let focus = -1, hoverSys = -1;   // subsystem in focus / under the pointer (models that define subsystems)
let userAz = 0, userPol = 0, velAz = 0, velPol = 0;
let gTarget = 0, gSmooth = 0, pending = null, plotLift = 0;
const followC = new THREE.Vector3();
let beamOn = false, fieldOn = false, photoOn = false, beamVis = 0, fieldVis = 0;
let profileOn = false, profVis = 0, storyOn = false;
const storyFx = { field: 0, beam: 0, profile: 0, water: 0, heat: 0, suppress: 0, drive: 0 };
let driveOut = false, driveX = 0, driveShown = 0;
let heatOn = false, thermVis = 0;
let waterOn = false, waterVis = 0, heatVis = 0, supVis = 0, beatAz = 0, beatAzS = 0;

// ---------- loading ----------
// a download with progress (percent of Content-Length; silent when the server does not say, or sends it compressed)
async function fetchBuf(url, onProg) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ': ' + res.status);
    const total = +res.headers.get('Content-Length') || 0, enc = res.headers.get('Content-Encoding');
    if (!res.body || !total || (enc && enc !== 'identity')) return res.arrayBuffer();
    const reader = res.body.getReader(), out = new Uint8Array(total);
    let got = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (got + value.length > total) return (await new Response(new Blob([out.subarray(0, got), value])).arrayBuffer());   // length was wrong: fall back
        out.set(value, got); got += value.length;
        onProg && onProg(Math.min(99, Math.round(got / total * 100)));
    }
    return out.buffer.slice(0, got);
}
async function fetchModel(k, onProg) {
    const data = await (await fetch(BASE + k + '.json')).json();
    const buf = await fetchBuf(BASE + data.bin, onProg);
    if (data.codec === 'meshopt') {      // compressed: 16-bit positions, 8-bit normals, meshopt-coded streams
        await MeshoptDecoder.ready;
        const u8 = new Uint8Array(buf), part = r => u8.subarray(r[0], r[0] + r[1]);
        data.geo = data.geoms.map(g => {
            const q = new Int16Array(g.n * 4), nn = new Int8Array(g.n * 4), ib = new Uint32Array(g.ni);
            MeshoptDecoder.decodeVertexBuffer(new Uint8Array(q.buffer), g.n, 8, part(g.pos));
            MeshoptDecoder.decodeVertexBuffer(new Uint8Array(nn.buffer), g.n, 4, part(g.nrm));
            MeshoptDecoder.decodeIndexBuffer(new Uint8Array(ib.buffer), g.ni, 4, part(g.idx));
            const P = new Float32Array(g.n * 3), N = new Int8Array(g.n * 3), o = g.q.o, sc = g.q.s;
            for (let i = 0; i < g.n; i++) for (let k = 0; k < 3; k++) { P[3 * i + k] = o[k] + (q[4 * i + k] + 32767) * sc; N[3 * i + k] = nn[4 * i + k]; }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
            geo.setAttribute('normal', new THREE.BufferAttribute(N, 3, true));
            geo.setIndex(new THREE.BufferAttribute(g.idxType === 'u16' ? Uint16Array.from(ib) : ib, 1));
            geo.computeBoundingBox(); geo.computeBoundingSphere();
            if (g.apertures) geo.userData.mask = perforate(geo, g.apertures, g.bbox);
            return geo;
        });
        return data;
    }
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
    const N = phone ? 2048 : 4096, c = document.createElement('canvas'); c.width = c.height = N;
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
        sheen: f.sheen || 0, sheenRoughness: f.sheenRoughness || 1, sheenColor: new THREE.Color(f.sheenColor ?? 0xffffff),
        envMapIntensity: 1, clipShadows: true
    });
    m.emissive = new THREE.Color(0x0071e3); m.emissiveIntensity = 0;
    if (f.opacity) { m.userData.baseOpacity = f.opacity; m.transparent = true; m.depthWrite = false; m.opacity = f.opacity; m.side = THREE.DoubleSide; m.userData.perforated = true; }
    // the cut-away shows inner faces as a darker "section" tone
    const cap = new THREE.Color(f.color).multiplyScalar(f.metalness ? 0.42 : 0.7);
    m.userData.capOn = { value: 0 };
    const brush = phone ? 0 : (f.brush || 0);
    m.onBeforeCompile = s => {
        s.uniforms.capColor = { value: cap }; s.uniforms.capOn = m.userData.capOn; s.uniforms.uBrush = { value: brush };
        // brushed grain: value noise in the part's own coordinates (mm), stretched along x, nudges roughness and tone a little
        s.vertexShader = 'varying vec3 vObj;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
        s.fragmentShader = 'uniform float uBrush;\nvarying vec3 vObj;\n' +
            'float bh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n' +
            'float bn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);\n' +
            ' return mix(mix(mix(bh(i), bh(i + vec3(1,0,0)), f.x), mix(bh(i + vec3(0,1,0)), bh(i + vec3(1,1,0)), f.x), f.y),\n' +
            '            mix(mix(bh(i + vec3(0,0,1)), bh(i + vec3(1,0,1)), f.x), mix(bh(i + vec3(0,1,1)), bh(i + vec3(1,1,1)), f.x), f.y), f.z); }\n' +
            s.fragmentShader
                .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' +
                    ' if (uBrush > 0.0) { vec3 q = vObj * vec3(0.04, 0.7, 0.7); float g = bn(q) * 0.65 + bn(q * 2.1 + 7.0) * 0.35;\n' +
                    // fade the grain out where it would be finer than a pixel (no moiré from far away)
                    '  float aa = uBrush * (1.0 - smoothstep(0.25, 0.8, length(fwidth(q))));\n' +
                    '  roughnessFactor = clamp(roughnessFactor * (1.0 + aa * 0.24 * (g - 0.5)), 0.04, 1.0);\n' +
                    '  diffuseColor.rgb *= 1.0 + aa * 0.03 * (g - 0.5); }');
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
        // a model may be stood on its mount (data.mount, a rotation): the drive still works in the model's own axes
        if (data.mount) {
            mesh.userData.pre = mesh.userData.base.clone();
            mesh.userData.base = data.mount.clone().multiply(mesh.userData.pre);
            mesh.userData.ex.applyMatrix4(data.mount);
        }
        mesh.userData.g = inst.g; mesh.userData.drive = inst.drive;
        mesh.castShadow = mesh.receiveShadow = true;
        const bb = data.geo[inst.geo].boundingBox.clone().applyMatrix4(mesh.userData.base);
        mesh.userData.zmin = bb.min.z; mesh.userData.bb = bb; mesh.userData.c = bb.getCenter(new THREE.Vector3());
        mesh.matrix.copy(mesh.userData.base);
        g.meshes.push(mesh); holder.add(mesh);
        return mesh;
    });
    const M = { data, groups, meshes, holder, systems: (data.systems || []).map(x => {
        const t = L10N.systems && L10N.systems[x.label];   // label stays the English key (the story refers to it)
        return { ...x, name: t ? t[0] : x.label, note: t ? t[1] : x.blurb, set: new Set(x.groups), count: x.groups.reduce((n, i) => n + data.groups[i].count, 0) };
    }) };
    M.fit0 = boundsOf(M, 0).getBoundingSphere(new THREE.Sphere());
    if (data.core) { const cs = new Set(groups.map((g, i) => data.core.includes(g.label) ? i : -1).filter(i => i >= 0)); M.core = boundsOf(M, 0, cs).getBoundingSphere(new THREE.Sphere()); }
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
    // the cut: by default a plane facing the viewer (world z = cutZ); a model may give its own plane (cutN, cutC) and turn to it (cutAz)
    if (MODELS[i].cutN) cutPlane.normal.fromArray(MODELS[i].cutN); else cutPlane.normal.set(0, 0, -1);
    cutPlane.constant = MODELS[i].cutN ? MODELS[i].cutC || 0 : MODELS[i].cutZ || 0;
    applyCut();
    const r = model.radius;
    Object.assign(key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 8 });
    key.shadow.camera.updateProjectionMatrix();
    $('c-num').textContent = String(i + 1).padStart(2, '0') + ' / ' + String(MODELS.length).padStart(2, '0');
    $('m-name').textContent = model.data.name;
    $('m-blurb').textContent = model.data.blurb || '';
    $('c-hint').textContent = T(model.systems.length ? 'Tap a system to look closer.' : 'Tap any part to look closer.');
    buildLabels();
    applyExplode(true);
    paint();
    document.querySelectorAll('#chapters button').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    {   // narrow screens: the tab row scrolls, keep the current model's tab in view
        const nav = $('chapters'), tb = nav.children[i];
        if (tb && nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: tb.offsetLeft - (nav.clientWidth - tb.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    // per-model extras
    $('t-beam').hidden = !(MODELS[i].beam || MODELS[i].profile); $('t-field').hidden = !POLES[MODELS[i].key];
    $('t-water').hidden = !MODELS[i].water; $('t-water').setAttribute('aria-pressed', 'false');
    $('t-heat').hidden = !MODELS[i].water; $('t-heat').setAttribute('aria-pressed', 'false'); heatOn = false; thermVis = 0;
    if (MODELS[i].water && !model.thermal) model.thermal = new ThermalView(model);
    $('t-drive').hidden = !MODELS[i].water; $('t-drive').setAttribute('aria-pressed', 'false'); driveOut = false; driveX = 0; driveShown = 0;
    beamOn = fieldOn = profileOn = waterOn = false; beamVis = fieldVis = profVis = waterVis = heatVis = supVis = 0;
    if (MODELS[i].water && !model.cooling) model.cooling = new CoolingFlow(model, model.holder);
    if (hasStory(i) && !model.story) {          // the story: beats, plus whatever they show
        model.story = buildStory(model, MODELS[i].key);
        model.story.forEach(b => {
            if (b.fx === 'field' && !model.field) model.field = buildField(model);
            if (b.fx === 'beam' && !model.beam) model.beam = buildBeam(model);
            if (b.fx === 'profile' && !model.profile) model.profile = buildProfile(model);
            if (b.fx === 'profile' && model.profile) b.sph = new THREE.Box3().setFromPoints([...model.profile.extent, ...[0, 1].map(k => b.sph.center.clone().addScaledVector(new THREE.Vector3(0, 1, 0), (k ? 1 : -1) * b.sph.radius))]).getBoundingSphere(new THREE.Sphere());
        });
    }
    if (desk && model.field && !model.electrons) model.electrons = buildElectrons(model);
    $('cap-story').style.opacity = 0; storyDom = -1;
    $('t-beam').setAttribute('aria-pressed', 'false'); $('t-field').setAttribute('aria-pressed', 'false'); $('legend').hidden = true;
    $('cmp-img').src = $('cmp-bg').src = MODELS[i].photo; $('cmp-img').alt = T('labPhoto', model.data.name);
    $('ar-pop').hidden = true;
    $('t-ar-ios').href = `/CV/cad/ar/${MODELS[i].key}.usdz`;
    const noAR = !!MODELS[i].noAR;
    $('t-ar').hidden = noAR || (isIOS && quickLook); $('t-ar-ios').hidden = noAR || !(isIOS && quickLook);
    stage.classList.toggle('night', MODELS[i].key === 'penning');
    if (mirror) mirror.visible = MODELS[i].key !== 'penning';     // the trap floats in its dark event display
    if (MODELS[i].key === 'penning' && !model.events) {
        model.events = new PenningEvents(model, model.holder, det => { if (model.plots) model.plots.hit(det); });
        if (desk) model.plots = new DetectorPlots($('plots'), model.events);
    }
    $('plots').hidden = true; $('phase').hidden = true;
    showLoading(i, false);
}

const _bs = new THREE.Matrix4();
function applyExplode(force) {
    if (!model) return;
    const t = explodeT;
    let zmin = Infinity;
    model.meshes.forEach(m => {
        const d = m.userData.drive;
        if (d && d.bel) {          // a bellows stretches between its two (moving) ends
            const [[xa, ka], [xb, kb]] = d.bel, a = xa + ka * driveX, b = xb + kb * driveX;
            m.matrix.makeTranslation(a, 0, 0).multiply(_bs.makeScale(b - a, 1, 1));
            if (model.data.mount) m.matrix.premultiply(model.data.mount);
        } else if (d && d.move && m.userData.pre) {
            m.matrix.copy(m.userData.pre); m.matrix.elements[12] += d.move * driveX; m.matrix.premultiply(model.data.mount);
        } else {
            m.matrix.copy(m.userData.base);
            if (d && d.move) m.matrix.elements[12] += d.move * driveX;
        }
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
    if (mirror) { const k = Math.max(s.x, s.z) * 2.4; mirror.scale.set(k, k, 1); mirror.position.set(c.x, y + 0.02, c.z); }
    const R = model.radius;
    key.position.set(c.x + R * 0.6, y + R * 2.4, c.z + R * 0.9); key.target.position.set(c.x, y, c.z);
    if (force) root.updateMatrixWorld(true);
}

// ---------- scroll: which chapter, how far into it ----------
const track = $('chapter-track');
// chapters with a story are longer (one extra stretch of scroll per beat; a little shorter on small screens)
const hasStory = i => !!STORY[MODELS[i].key];
const small = innerWidth < 900;
track.innerHTML = MODELS.map((m, i) => hasStory(i) ? `<div style="height:${small ? 260 + 115 * STORY[m.key].length : 320 + 150 * STORY[m.key].length}vh"></div>` : '<div></div>').join('');
const chapterSpans = () => { let t = 0; return [...track.children].map(el => { const a = t; t += el.offsetHeight; return [a, el.offsetHeight]; }); };
function scrollG() {
    const s = -scrolly.getBoundingClientRect().top, spans = chapterSpans();
    if (s <= 0) return 0;
    for (let i = 0; i < spans.length; i++) if (s < spans[i][0] + spans[i][1]) return i + (s - spans[i][0]) / spans[i][1];
    return MODELS.length - 1e-4;
}
function scrollToChapter(i, p, instant) {
    const [a, h] = chapterSpans()[i];
    window.scrollTo({ top: scrolly.getBoundingClientRect().top + scrollY + a + p * h, behavior: instant || reduce ? 'auto' : 'smooth' });
}
const holdP = i => hasStory(i) ? 0.83 : 0.68;      // where a chapter rests fully exploded
function keyAt(p, story) {
    const K = story ? KEYS_STORY : KEYS;
    // one smooth curve through all keys (monotone cubic): no stop-and-go at the in-between keys, holds stay still, no overshoot
    const e = hermite(K, 2, p);
    // reduced motion: no fly-in, no zoom, no gradual take-apart; the view cuts between assembled and exploded
    if (reduce) return e > 0.5 ? { m: 1.14, e: 1 } : { m: 1.0, e: 0 };
    return { m: hermite(K, 1, p), e };
}
// Fritsch–Carlson monotone cubic through keys K[i] = [x, ...values]; j picks the value column
function hermite(K, j, x) {
    let k = 0; while (k < K.length - 2 && x > K[k + 1][0]) k++;
    const sl = i => (K[i + 1][j] - K[i][j]) / (K[i + 1][0] - K[i][0]);
    const tan = i => {
        if (i <= 0 || i >= K.length - 1) return 0;            // start/end of a chapter: at rest
        const a = sl(i - 1), b = sl(i);
        if (a * b <= 0) return 0;                              // a turning point or a hold: flat
        const ha = K[i][0] - K[i - 1][0], hb = K[i + 1][0] - K[i][0], wa = 2 * hb + ha, wb = hb + 2 * ha;
        return (wa + wb) / (wa / a + wb / b);
    };
    const h = K[k + 1][0] - K[k][0], t = clamp((x - K[k][0]) / h), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * K[k][j] + (t3 - 2 * t2 + t) * h * tan(k) + (-2 * t3 + 3 * t2) * K[k + 1][j] + (t3 - t2) * h * tan(k + 1);
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
        const goal = (g.goalFade ?? 1) * (g.label === 'Cooling coil' && model.cooling ? 1 - 0.62 * waterVis : 1);
        const f = m.userData.fade + (goal - m.userData.fade) * k;
        m.userData.fade = f;
        const baseOp = m.userData.baseOpacity || 1, transparent = f < 0.995 || baseOp < 1;
        // faded "ghost" parts still write depth: only their nearest surface shows, so parts behind them don't poke through
        // depending on draw order (see-through-by-design parts such as grids and coils keep depthWrite off)
        if (m.transparent !== transparent) { m.transparent = transparent; m.depthWrite = baseOp >= 1; m.needsUpdate = true; }
        m.opacity = transparent ? f * baseOp : 1;
        const hot = g.label === 'Filament' ? beamVis * 2.4 * (reduce ? 1 : 0.92 + 0.08 * Math.sin(performance.now() / 45)) : 0;
        if (hot > 0.02) m.emissive.setHex(0xff6a1a); else if (m.emissiveIntensity < 0.3) m.emissive.setHex(0x0071e3);
        m.emissiveIntensity += (Math.max(g.goalGlow || 0, hot) - m.emissiveIntensity) * k;
        g.meshes.forEach(me => { me.castShadow = f > 0.5 && baseOp >= 1; });
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
    $('i-mat').textContent = T(g.material || (FINISH[g.kind] || FINISH.steel).label);
    $('i-name').textContent = g.label;
    $('i-blurb').textContent = g.blurb || '';
    $('i-qty-t').textContent = T('Quantity'); $('i-size-t').textContent = T('Envelope');
    $('i-qty').textContent = '× ' + g.count;
    $('i-size').textContent = dims.join(' × ') + ' mm';
    $('info').hidden = false;
}
function closeInfo() { $('info').hidden = true; }
function showSystemCard() {
    const sy = model.systems[focus];
    $('i-mat').textContent = T('Subsystem');
    $('i-name').textContent = sy.name;
    $('i-blurb').textContent = sy.note || '';
    $('i-qty-t').textContent = T('Parts'); $('i-size-t').textContent = T('Part types');
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
    if (explodeT < 0.55) scrollToChapter(active, holdP(active));   // labels live on the exploded view
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
        <span><span class="p-name">${esc(g.label)}</span><span class="p-mat">${esc(T(g.material || (FINISH[g.kind] || FINISH.steel).label))}</span></span>
        <span class="p-qty">× ${g.count}</span></button></li>`; };
    ul.innerHTML = M.systems.length
        ? M.systems.map((sy, s) => `<li class="sys-h"><button type="button" class="sys-btn" data-s="${s}" aria-pressed="false"><b>${esc(sy.name)}</b><span>${esc(sy.note)}</span></button></li>` + sy.groups.map(part).join('')).join('')
        : M.groups.map((g, i) => part(i)).join('');
    const here = () => listIdx === active;
    ul.querySelectorAll('.part').forEach(b => {
        const i = +b.dataset.i;
        b.addEventListener('click', () => { pending = { chapter: listIdx, kind: 'g', idx: i }; scrollToChapter(listIdx, holdP(listIdx)); });
        b.addEventListener('pointerenter', () => { tick(); if (here()) { hovered = i; paint(); } });
        b.addEventListener('pointerleave', () => { if (here()) { hovered = -1; paint(); } });
    });
    ul.querySelectorAll('.sys-btn').forEach(b => {
        const s = +b.dataset.s;
        b.addEventListener('click', () => { pending = { chapter: listIdx, kind: 's', idx: s }; scrollToChapter(listIdx, holdP(listIdx)); });
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
        el.addEventListener('focus', () => { if (kind === 's') hoverSys = idx; else hovered = idx; paint(); tick(); });
        el.addEventListener('blur', () => { hoverSys = hovered = -1; paint(); });
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
    model.systems.forEach((sy, s) => mk('s', s, sy.groups, `<span>${esc(sy.name)}<em>${sy.count}</em></span>`));
}
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const hide = c => { if (c.el.classList.contains('vis')) { c.el.classList.remove('vis'); c.el.tabIndex = -1; } c.leader.style.opacity = c.dot.style.opacity = 0; };
function placeLabels() {
    const t = explodeT, on = !!model && t > 0.55;
    labelsEl.classList.toggle('on', on);
    if (!on) { if (callouts.some(c => c.el.tabIndex === 0)) callouts.forEach(hide); return; }
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
            if (cut && cutPlane.distanceToPoint(_v) < 0) return;
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
            if (!c.el.classList.contains('vis')) { c.el.classList.add('vis'); c.el.tabIndex = 0; }
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
let pointer = null, down = null, dragging = false, lastPick = null;
function pick(x, y) {
    if (!model) return -1;
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(model.meshes.filter(m => m.visible && m.material.userData.fade > 0.5), false);
    for (const h of hits) {
        if (cut && cutPlane.distanceToPoint(h.point) < -0.01) continue;   // ignore the cut-away half
        lastPick = h.object;
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
    userAz += velAz; userPol = clamp(userPol + velPol, -1.1, 1.45);
});
const endDrag = e => {
    canvas.classList.remove('grabbing');
    if (down && !dragging && e.type === 'pointerup') {
        const g = pick(e.clientX, e.clientY);
        if (g >= 0) { sound('click'); select(g); if (model.plots && lastPick && lastPick.userData.det >= 0) model.plots.pin(lastPick.userData.det); }
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
// ---------- keyboard: arrows turn the model, Tab walks the labels, Esc closes, 1-5 jump to a model ----------
canvas.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key, step = e.shiftKey ? 0.3 : 0.12;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { velAz = 0; userAz += (k === 'ArrowLeft' ? 1 : -1) * step; }
    else if (k === 'ArrowUp' || k === 'ArrowDown') { velPol = 0; userPol = clamp(userPol + (k === 'ArrowUp' ? 1 : -1) * step * 0.6, -1.1, 1.45); }
    else if (k === 'Home') { userAz = userPol = velAz = velPol = 0; }
    else return;
    e.preventDefault();
});
document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'Escape') {
        if (!$('ar-pop').hidden) { $('ar-pop').hidden = true; return; }
        if (selected >= 0 && focus >= 0) focusSystem(focus, false); else if (selected >= 0 || focus >= 0) clearAll();
        return;
    }
    const n = +e.key;
    if (n >= 1 && n <= MODELS.length && (e.target === canvas || stage.contains(e.target))) { scrollToChapter(n - 1, 0.17); e.preventDefault(); }
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
        if (cfg.box && line.some(p => !box.containsPoint(p))) return false;   // keep the picture inside the source
        for (let s2 = 0; s2 < line.length - 1; s2++) {
            pos.push(line[s2].x, line[s2].y, line[s2].z, line[s2 + 1].x, line[s2 + 1].y, line[s2 + 1].z);
            for (const q2 of [line[s2], line[s2 + 1]]) { const c3 = shade(B(q2, tmpB).length() * kG); col.push(c3.r, c3.g, c3.b); }
        }
        return true;
    }
    const kept = [];
    mags.forEach(g => {
        const nu = cfg.seeds, nv = cfg.seeds;
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
            const fu = nu > 1 ? (i / (nu - 1) - 0.5) * 1.4 : 0, fv = nv > 1 ? (j / (nv - 1) - 0.5) * 1.4 : 0;
            const p = g.c.clone().addScaledVector(g.m, g.h + ds * 0.3).addScaledVector(g.u, fu * g.hu).addScaledVector(g.v, fv * g.hv);
            const line = trace(p, 1);
            if (line && addLine(line)) kept.push(line);      // only loops that return to a magnet: the cusps, not the stray outer flux
        }
    });
    // filter gap: seed across the middle and trace both ways, so the field that crosses the gap is drawn too
    if (cfg.gap) {
        const mid = mags.reduce((a, g) => a.add(g.c), new THREE.Vector3()).divideScalar(mags.length), m0 = mags[0];
        const span = mags.reduce((a, g) => Math.max(a, Math.abs(g.c.clone().sub(mid).dot(m0.u)) + g.hu), 0) * 0.8;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
            const p0 = mid.clone().addScaledVector(m0.u, i / 2 * span).addScaledVector(m0.v, j / 2 * m0.hv * 0.8);
            const back = trace(p0.clone(), -1), fwd = trace(p0.clone(), 1);
            if (back && fwd) { const l = back.reverse().concat(fwd.slice(1)); if (addLine(l)) kept.push(l); }
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
    grp.material = mat; grp.ghost = ghostMat; grp.lines = kept;
    M.holder.add(grp);
    return grp;
}

function stepExtras(dt, time) {
    if (!model) return;
    const away = 1 - smooth(0.04, 0.2, explodeT);          // extras belong to the assembled view
    beamVis += (Math.max(beamOn ? 1 : 0, storyFx.beam) * away - beamVis) * (1 - Math.exp(-dt * 4));
    fieldVis += (Math.max(fieldOn ? 1 : 0, storyFx.field) * away - fieldVis) * (1 - Math.exp(-dt * 5));
    profVis += (Math.max(profileOn ? 1 : 0, storyFx.profile) * away - profVis) * (1 - Math.exp(-dt * 4));
    const pxScale = stage.clientHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    if (model.profile) {
        const P = model.profile; P.uOn.value = profVis; P.uTime.value = time; P.uScale.value = pxScale;
        P.holder.visible = profVis > 0.01; if (P.holder.visible) P.step(profVis, time);
    }
    if (model.electrons) {
        const E = model.electrons; E.uniforms.uOn.value = fieldVis; E.uniforms.uScale.value = pxScale;
        E.pts.visible = fieldVis > 0.01; if (E.pts.visible) E.step(reduce ? 0 : Math.min(dt, 0.033));
    }
    if (model.beam) {
        const u = model.beam.uniforms; u.uOn.value = beamVis; u.uTime.value = time;
        u.uScale.value = stage.clientHeight * renderer.getPixelRatio() / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
        model.beam.holder.visible = beamVis > 0.01;
        plasmaLight.intensity = beamVis * model.radius * model.radius * 0.5 * (0.9 + 0.1 * Math.sin(time * 23));
        plasmaLight.position.copy(model.beam.cc).applyMatrix4(root.matrixWorld);
    } else plasmaLight.intensity = 0;
    if (model.field) {
        model.field.material.opacity = fieldVis * 0.95; model.field.ghost.opacity = fieldVis * 0.28;
        if (!reduce) model.field.material.dashOffset -= dt * model.radius * 0.06; model.field.ghost.dashOffset = model.field.material.dashOffset;
        model.field.visible = fieldVis > 0.01;
    }
    $('legend').hidden = !(fieldVis > 0.3) || (small && storyCard);     // phones: the story card sits where the legend goes
    if (model.cooling) {        // 10 kW cup: water through the pipe, the beam's heat on the cup floor
        waterVis += (Math.max(waterOn ? 1 : 0, storyFx.water) * away - waterVis) * (1 - Math.exp(-dt * 4));
        heatVis += (Math.max(waterOn || driveOut || heatOn ? 1 : 0, storyFx.heat, storyFx.suppress, storyFx.drive, storyFx.water * 0.6) * away - heatVis) * (1 - Math.exp(-dt * 4));
        supVis += (storyFx.suppress * away - supVis) * (1 - Math.exp(-dt * 4));
        // the drive: parked or in the beam (button), or cycling in and out during its story beat
        const S = model.data.drive.stroke;
        let goal = driveOut ? -S : 0;
        if (storyFx.drive > 0.5 && away > 0.5) goal = (time % 7) < 3.5 ? -S : 0;
        if (away < 0.5) goal = 0;
        const nx = driveX + (goal - driveX) * (1 - Math.exp(-dt * 2.6));
        if (Math.abs(nx - driveX) > 0.005) { driveX = Math.abs(goal - nx) < 0.02 ? goal : nx; applyExplode(); }
        model.cooling.step(waterVis, heatVis, time, pxScale, supVis, driveX);
        if (model.thermal) {     // live heat map: on with the button, and while the story talks about the water
            thermVis += (Math.max(heatOn ? 1 : 0, storyFx.water) * away - thermVis) * (1 - Math.exp(-dt * 4));
            const inBeam = 1 - clamp((-driveX - 20) / 45);
            model.thermal.step(dt, thermVis, heatVis > 0.5 ? inBeam : 0, waterVis > 0.5 ? 1 : 0, cut ? cutPlane : null);
        }
        driveShown = (storyFx.drive > 0.3 || driveOut || driveX < -1) && away > 0.6 ? 1 : 0;
        const chip = $('phase'), parked = driveX < -S * 0.45;
        chip.hidden = !driveShown;
        if (driveShown && chip.dataset.s !== (parked ? 'p' : 'i')) { chip.dataset.s = parked ? 'p' : 'i'; chip.querySelector('span').textContent = T(parked ? 'Parked: the beam goes past' : 'In the beam: measuring'); chip.classList.remove('tick'); void chip.offsetWidth; chip.classList.add('tick'); }
    }
    const thermLegend = !!model.thermal && thermVis > 0.3;
    $('legend-t').hidden = !thermLegend || (small && storyCard);
    $('legend-w').hidden = !(model.cooling && waterVis > 0.3) || thermLegend || (small && storyCard);
    if (model.events) {
        if (reduce && !model.events.warm) { model.events.warm = true; for (let k = 0; k < 200; k++) model.events.step(1 / 60, 1, pxScale); }   // one still frame, a few tracks in it
        model.events.step(reduce ? 0 : dt, away, pxScale);
        const chip = $('phase'), si = model.events.stage();
        chip.hidden = away < 0.6;
        if (chip.dataset.s !== String(si)) { chip.dataset.s = si; chip.querySelector('span').textContent = STAGES_L[si] || STAGES[si]; chip.classList.remove('tick'); void chip.offsetWidth; chip.classList.add('tick'); }
        const showPlots = !!model.plots && away > 0.6 && $('info').hidden;
        $('plots').hidden = !showPlots;
        if (showPlots) model.plots.step(dt);
    }
}

$('t-beam').addEventListener('click', e => {
    if (!model) return;
    if (MODELS[active].profile) {      // Faraday cups: the beam arrives and the profile is read out
        if (!model.profile) model.profile = buildProfile(model);
        profileOn = !profileOn; e.currentTarget.setAttribute('aria-pressed', String(profileOn)); sound('toggle'); return;
    }
    if (!model.beam) model.beam = buildBeam(model);
    beamOn = !beamOn; e.currentTarget.setAttribute('aria-pressed', String(beamOn)); sound('toggle');
});
$('t-drive').addEventListener('click', e => {
    if (!model || !model.data.drive) return;
    driveOut = !driveOut; e.currentTarget.setAttribute('aria-pressed', String(driveOut)); sound('toggle');
});
$('t-heat').addEventListener('click', e => {
    if (!model || !model.thermal) return;
    heatOn = !heatOn; e.currentTarget.setAttribute('aria-pressed', String(heatOn)); sound('toggle');
    if (heatOn && !waterOn) { waterOn = true; $('t-water').setAttribute('aria-pressed', 'true'); }   // start cooled; switch the water off to watch it heat
});
$('t-water').addEventListener('click', e => {
    if (!model || !model.cooling) return;
    waterOn = !waterOn; e.currentTarget.setAttribute('aria-pressed', String(waterOn)); sound('toggle');
});
$('t-field').addEventListener('click', e => {
    if (!model) return;
    if (!model.field) model.field = buildField(model);
    if (desk && model.field && !model.electrons) model.electrons = buildElectrons(model);
    fieldOn = !fieldOn; e.currentTarget.setAttribute('aria-pressed', String(fieldOn)); sound('toggle');
    if (fieldOn && !cut) { cut = true; applyCut(); }   // the cusps live inside the chamber: open it up
});


// --- story: beats that frame one subsystem at a time ---
let storyDom = -1, storyCard = false;
function buildStory(M, key) {
    const tr = L10N.story && L10N.story[key];
    return (STORY[key] || []).map((b, k) => {
        if (tr && tr[k]) b = { ...b, title: tr[k][0], text: tr[k][1] };
        let set = null;
        if (b.sys) { const sy = M.systems.find(x => x.label === b.sys); set = sy && sy.set; }
        else set = new Set(M.groups.map((g, i) => b.parts.includes(g.label) ? i : -1).filter(i => i >= 0));
        if (!set || !set.size) return null;
        let sph = boundsOf(M, 0, set).getBoundingSphere(new THREE.Sphere());
        const ms = M.meshes.filter(m => set.has(m.userData.g));
        // parts that ride on a drive: the camera follows them in and out of the beam
        const rides = !!(M.data.drive && ms.length && ms.every(m => m.userData.drive && m.userData.drive.move === 1));
        // the drive's own beat frames the whole assembly over the full stroke, so the cup never leaves the screen
        if (b.fx === 'drive' && M.data.drive) {
            const fr = b.frame ? new Set(M.groups.map((g, i) => b.frame.includes(g.label) ? i : -1).filter(i => i >= 0)) : null;
            const all = boundsOf(M, 0, fr && fr.size ? fr : null), out = all.clone().translate(driveWorld(M, -M.data.drive.stroke));
            sph = all.union(out).getBoundingSphere(new THREE.Sphere());
        }
        return { ...b, set, sph, rides };
    }).filter(Boolean);
}
// the drive's displacement (model x, mm) as a world-space vector
const _rootRot = new THREE.Matrix4();
function driveWorld(M, x) {
    const v = new THREE.Vector3(x, 0, 0);
    if (M.data.mount) v.applyMatrix4(M.data.mount);
    return v.applyMatrix4(_rootRot.extractRotation(root.matrixWorld));
}
// where in the story we are: which beat leads, how far the camera has moved between beats, how visible the text is
function storyAt(p, n) {
    const slot = (STORY_W1 - STORY_W0) / n;
    if (p < STORY_W0) { const b = smooth(STORY_W0 - 0.05, STORY_W0 + 0.015, p); return { from: -1, to: 0, b, w: b, dom: 0, text: smooth(STORY_W0 - 0.01, STORY_W0 + 0.03, p) }; }
    if (p >= STORY_W1) { const b = smooth(STORY_W1 - 0.015, STORY_W1 + 0.05, p); return { from: n - 1, to: -1, b, w: 1 - b, dom: n - 1, text: 1 - smooth(STORY_W1 - 0.03, STORY_W1 + 0.005, p) }; }
    const u = (p - STORY_W0) / slot, k = Math.min(n - 1, Math.floor(u)), f = u - k;
    // each beat: a slow push-in while it is read, then a long, gentle move to the next one (the camera never stands still)
    const push = Math.min(1, f / STORY_MOVE);
    if (k < n - 1 && f > STORY_MOVE) { const b = smooth(STORY_MOVE, 1, f); return { from: k, to: k + 1, b, w: 1, dom: b < 0.5 ? k : k + 1, text: 1 - 4 * b * (1 - b), push: push * (1 - b) }; }
    return { from: k, to: k, b: 0, w: 1, dom: k, text: 1, push };
}

// --- electrons (desktop): gyrating along the traced field lines, bouncing near the magnets (magnetic mirrors) ---
function buildElectrons(M) {
    const all = M.field && M.field.lines;
    if (!all || !all.length) return null;
    // electrons live in the plasma: keep only the stretches of field line inside the discharge chamber
    // (or, in the RPA, inside the gap between the magnets); they turn back at the ends of those stretches
    const ch = M.groups.find(g => g.label === 'Discharge chamber'), mg = M.groups.find(g => /cusp magnet/i.test(g.label));
    let inside;
    if (ch) {
        const b = ch.meshes[0].userData.bb, c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
        const R = Math.min(sz.x, sz.y) / 2 * 0.86, z0 = b.min.z + sz.z * 0.06, z1 = b.max.z - sz.z * 0.06;
        inside = p => Math.hypot(p.x - c.x, p.y - c.y) < R && p.z > z0 && p.z < z1;
    } else if (mg) {
        const cs = mg.meshes.map(m => m.userData.c), c = cs.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(cs.length);
        const half = mg.meshes[0].userData.bb.getSize(new THREE.Vector3()).multiplyScalar(0.5);
        const gapX = Math.min(...cs.map(v => Math.abs(v.x - c.x))) - half.x, ySpan = Math.max(...cs.map(v => Math.abs(v.y - c.y))) + half.y;
        inside = p => Math.abs(p.x - c.x) < gapX * 0.92 && Math.abs(p.y - c.y) < ySpan && Math.abs(p.z - c.z) < half.z;
    } else return null;
    const lines = [];
    all.forEach(l => { let run = []; l.forEach(p => { if (inside(p)) run.push(p); else { if (run.length > 8) lines.push(run); run = []; } }); if (run.length > 8) lines.push(run); });
    if (!lines.length) return null;
    const NE = 36, TR = 6, n = NE * TR, pos = new Float32Array(n * 3), fade = new Float32Array(n);
    for (let e = 0; e < NE; e++) for (let k = 0; k < TR; k++) fade[e * TR + k] = Math.pow(1 - k / TR, 1.5);
    const ds = M.radius * 0.01, list = [];
    for (let e = 0; e < NE; e++) {
        const line = lines[Math.floor(Math.random() * lines.length)], L = line.length;
        list.push({ line, s: 1 + (L - 3) * Math.random(), dir: Math.random() < 0.5 ? -1 : 1, v: (16 + 14 * Math.random()), ph: Math.random() * 6.28, w: 9 + 4 * Math.random() });
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aFade', new THREE.BufferAttribute(fade, 1));
    const uniforms = { uOn: { value: 0 }, uScale: { value: 400 }, uSize: { value: M.radius * 0.0065 } };
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
        uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aFade; uniform float uScale, uSize, uOn; varying float vA;
            void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uScale / -mv.z * (0.5 + 0.5 * aFade); vA = uOn * aFade; }`,
        fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(vec3(0.45, 0.82, 1.0), a * 0.8); }`
    }));
    pts.frustumCulled = false; pts.renderOrder = 3; pts.visible = false; M.holder.add(pts);
    const rg = M.radius * 0.0035, up = new THREE.Vector3(0, 0, 1), T = new THREE.Vector3(), A = new THREE.Vector3(), Bv = new THREE.Vector3(), P = new THREE.Vector3();
    const at = (line, s) => { const i = clamp(Math.floor(s), 0, line.length - 2), f = clamp(s - i, 0, 1); P.copy(line[i]).lerp(line[i + 1], f); T.copy(line[i + 1]).sub(line[i]).normalize(); return P; };
    return {
        pts, uniforms,
        step(dt) {
            list.forEach((e, ei) => {
                const L = e.line.length, lo = 1, hi = L - 2;
                e.s += e.dir * e.v * dt; if (e.s > hi) { e.s = hi; e.dir = -1; } if (e.s < lo) { e.s = lo; e.dir = 1; }
                e.ph += e.w * dt;
                for (let k = 0; k < TR; k++) {
                    at(e.line, e.s - e.dir * k * 0.55);
                    A.crossVectors(T, Math.abs(T.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize(); Bv.crossVectors(T, A);
                    const ph = e.ph - k * 0.3;
                    P.addScaledVector(A, Math.cos(ph) * rg).addScaledVector(Bv, Math.sin(ph) * rg);
                    pos.set([P.x, P.y, P.z], (ei * TR + k) * 3);
                }
            });
            geo.attributes.position.needsUpdate = true;
        }
    };
}

// --- beam on the Faraday cups: a beam comes in, each cup glows, a live profile rises above the array ---
function buildProfile(M) {
    const cg = M.groups.find(g => g.label === 'Faraday cup'), eg = M.groups.find(g => g.label === 'Earth electrode and base'), sg = M.groups.find(g => g.label === 'Suppressor electrode');
    if (!cg || !eg || !sg) return null;
    const cups = cg.meshes.map(m => m.userData.c.clone());
    const cb = new THREE.Box3().setFromPoints(cups), csz = cb.getSize(new THREE.Vector3()), cc = cb.getCenter(new THREE.Vector3());
    const u = csz.x >= csz.y && csz.x >= csz.z ? new THREE.Vector3(1, 0, 0) : csz.y >= csz.z ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    // the beam side: the suppressor electrodes sit in front of the cups
    const eb = eg.meshes[0].userData.bb, sc = sg.meshes.reduce((a, m) => a.add(m.userData.c), new THREE.Vector3()).divideScalar(sg.meshes.length);
    const nrm = sc.clone().sub(cc); nrm.addScaledVector(u, -nrm.dot(u)); nrm.normalize();
    const w = new THREE.Vector3().crossVectors(nrm, u).normalize();
    const corners = []; for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? eb.max.x : eb.min.x, i & 2 ? eb.max.y : eb.min.y, i & 4 ? eb.max.z : eb.min.z));
    const top = Math.max(...corners.map(c => c.dot(nrm))), width = Math.max(...corners.map(c => c.dot(w))) - Math.min(...corners.map(c => c.dot(w)));
    cups.sort((a, b) => a.dot(u) - b.dot(u));
    const xs = cups.map(c => c.dot(u)), span = xs[xs.length - 1] - xs[0], pitch = span / Math.max(1, cups.length - 1);
    const mu = (xs[0] + xs[xs.length - 1]) / 2 + span * 0.08, sig = span * 0.26, gauss = x => Math.exp(-((x - mu) ** 2) / (2 * sig * sig));
    const onPlane = c => c.clone().addScaledVector(nrm, top - c.dot(nrm));
    const holder = new THREE.Group(); holder.visible = false; M.holder.add(holder);
    const uScale = { value: 400 }, uOn = { value: 0 }, uTime = { value: 0 };
    // incoming beam
    const L = M.radius * 0.5, NB = 1500, start = new Float32Array(NB * 3), seed = new Float32Array(NB);
    const g2 = () => { let a = 0; for (let i = 0; i < 6; i++) a += Math.random(); return (a - 3) / Math.sqrt(0.5); };
    const base = onPlane(cc);
    for (let i = 0; i < NB; i++) {
        const p0 = base.clone().addScaledVector(u, mu - cc.dot(u) + g2() * sig * 0.5).addScaledVector(w, (Math.random() - 0.5) * width * 0.45).addScaledVector(nrm, L);
        start.set([p0.x, p0.y, p0.z], i * 3); seed[i] = Math.random();
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(start, 3)); bg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const beam = new THREE.Points(bg, new THREE.ShaderMaterial({
        uniforms: { uOn, uTime, uScale, uLen: { value: L }, uDir: { value: nrm.clone().negate() }, uSize: { value: M.radius * 0.007 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; uniform float uTime, uLen, uScale, uSize, uOn; uniform vec3 uDir; varying float vA;
            void main() { float s = fract(aSeed + uTime * 0.6); vec3 p = position + uDir * (s * uLen); vec4 mv = modelViewMatrix * vec4(p, 1.0);
              gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uScale / -mv.z; vA = uOn * smoothstep(0.0, 0.25, s) * (1.0 - smoothstep(0.96, 1.0, s)); }`,
        fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA; gl_FragColor = vec4(vec3(0.56, 0.64, 1.0) + 0.3 * a, a); }`
    }));
    beam.frustumCulled = false;
    // cup glows at each aperture
    const glowPos = new Float32Array(cups.length * 3), glowI = new Float32Array(cups.length);
    cups.forEach((c, k) => { const p = onPlane(c).addScaledVector(nrm, 0.6); glowPos.set([p.x, p.y, p.z], k * 3); glowI[k] = gauss(xs[k]); });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(glowPos, 3)); gg.setAttribute('aI', new THREE.BufferAttribute(glowI, 1));
    const glows = new THREE.Points(gg, new THREE.ShaderMaterial({
        uniforms: { uOn, uTime, uScale, uSize: { value: pitch * 1.15 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aI; uniform float uTime, uScale, uSize, uOn; varying float vA;
            void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * uScale / -mv.z;
              vA = uOn * aI * (0.85 + 0.15 * sin(uTime * 9.0 + position.x)); }`,
        fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 1.6) * vA; gl_FragColor = vec4(1.0, 0.62, 0.32, a); }`
    }));
    glows.frustumCulled = false;
    // live profile: one bar per cup above the array, and the fitted Gaussian
    const lift = M.radius * 0.08, Hmax = M.radius * 0.22;
    const barMat = new THREE.MeshBasicMaterial({ color: 0x0a84ff, transparent: true, opacity: 0, depthWrite: false });
    const bars = cups.map(c => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), barMat); m.matrixAutoUpdate = false; m.userData.b = onPlane(c).addScaledVector(nrm, lift); holder.add(m); return m; });
    const NC = 80, curvePos = new Float32Array(NC * 3), curveGeo = new THREE.BufferGeometry(); curveGeo.setAttribute('position', new THREE.BufferAttribute(curvePos, 3));
    const curveMat = new THREE.LineBasicMaterial({ color: 0xff9f0a, transparent: true, opacity: 0, depthWrite: false });
    const curve = new THREE.Line(curveGeo, curveMat); curve.frustumCulled = false;
    const baseLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([onPlane(cups[0]).addScaledVector(u, -pitch).addScaledVector(nrm, lift), onPlane(cups[cups.length - 1]).addScaledVector(u, pitch).addScaledVector(nrm, lift)]),
        new THREE.LineBasicMaterial({ color: 0x86868b, transparent: true, opacity: 0, depthWrite: false }));
    holder.add(beam, glows, curve, baseLine);
    const M4 = new THREE.Matrix4(), bw = pitch * 0.55, bd = Math.min(width * 0.18, pitch * 0.5), x0 = xs[0] - pitch, x1 = xs[xs.length - 1] + pitch;
    const extent = [onPlane(cups[0]).addScaledVector(u, -pitch), onPlane(cups[cups.length - 1]).addScaledVector(u, pitch),
        onPlane(cups[0]).addScaledVector(nrm, lift + Hmax * 1.1), onPlane(cups[cups.length - 1]).addScaledVector(nrm, lift + Hmax * 1.1)].map(v => v.applyMatrix4(root.matrixWorld));
    return {
        holder, uOn, uTime, uScale, extent,
        step(vis, time) {
            barMat.opacity = 0.85 * vis; curveMat.opacity = vis; baseLine.material.opacity = 0.6 * vis;
            bars.forEach((m, k) => {
                const h = Math.max(0.01, Hmax * glowI[k] * (0.94 + 0.06 * Math.sin(time * 5 + k * 1.7)) * vis);
                M4.makeBasis(u.clone().multiplyScalar(bw), nrm.clone().multiplyScalar(h), w.clone().multiplyScalar(bd));
                M4.setPosition(m.userData.b.clone().addScaledVector(nrm, h / 2)); m.matrix.copy(M4); m.matrixWorldNeedsUpdate = true;
            });
            for (let i = 0; i < NC; i++) {
                const x = x0 + (x1 - x0) * i / (NC - 1), p = onPlane(cc).addScaledVector(u, x - cc.dot(u)).addScaledVector(nrm, lift + Hmax * gauss(x) * vis + 0.4);
                curvePos.set([p.x, p.y, p.z], i * 3);
            }
            curveGeo.attributes.position.needsUpdate = true;
        }
    };
}

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
    if (!pop.hidden) qrInto($('ar-qr'), new URL(`/CV/cad/ar/?m=${k}`, location.href).href);   // the code opens AR directly
});
$('ar-x').addEventListener('click', () => { $('ar-pop').hidden = true; });
// on iPhone / iPad the AR button is the native Quick Look link itself: Safari opens it on tap, no script in between
if (isIOS && quickLook) { $('t-ar').hidden = true; $('t-ar-ios').hidden = false; }
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
    gSmooth = reduce ? gTarget : gSmooth + (gTarget - gSmooth) * (1 - Math.exp(-dt * 6));
    if (Math.abs(gTarget - gSmooth) < 1e-4) gSmooth = gTarget;
    const ci = Math.min(MODELS.length - 1, Math.floor(gSmooth)), p = gSmooth - ci;
    activate(ci);
    document.querySelectorAll('#chapters button i').forEach((el, k) => el.style.setProperty('--p', k === ci ? p.toFixed(3) : 0));
    if (!model || active !== ci) { showLoading(ci, true); return; }

    // scroll keyframes: distance, explode; the turntable follows the scroll
    const story = hasStory(ci) && model.story && model.story.length ? model.story : null;
    const kf = keyAt(p, !!story);
    if (Math.abs(kf.e - explodeT) > 1e-4) { explodeT = kf.e; applyExplode(); }
    // fade between chapters, captions per phase
    const fadeIn = ci > 0 ? smooth(0, 0.05, p) : 1, fadeOut = ci < MODELS.length - 1 ? 1 - smooth(0.95, 1, p) : 1;
    const vis = fadeIn * fadeOut;
    canvas.style.opacity = vis.toFixed(3); labelsEl.style.setProperty('--vis', vis.toFixed(3));
    const intro = (ci > 0 ? smooth(0.0, 0.05, p) : 1) * (story ? 1 - smooth(0.06, 0.11, p) : 1 - smooth(0.17, 0.27, p));
    const exCap = (story ? smooth(0.74, 0.79, p) * (1 - smooth(0.88, 0.92, p)) : smooth(0.52, 0.6, p) * (1 - smooth(0.84, 0.9, p))) * (focus < 0 && selected < 0 ? 1 : 0);
    // the story: which beat, its caption, what it shows, what fades back
    let st = null;
    storyCard = false;
    storyFx.field = storyFx.beam = storyFx.profile = storyFx.water = storyFx.heat = storyFx.suppress = storyFx.drive = 0;
    if (story) {
        st = storyAt(p, story.length);
        const beat = story[st.dom], capS = $('cap-story');
        if (storyDom !== st.dom) {
            storyDom = st.dom;
            $('s-step').textContent = `${st.dom + 1} / ${story.length}`; $('s-title').textContent = beat.title; $('s-text').textContent = beat.text;
        }
        const tOp = st.w * st.text * (focus < 0 && selected < 0 ? 1 : 0);
        storyCard = tOp > 0.05;
        capS.style.opacity = tOp.toFixed(3); capS.style.setProperty('--ty', (reduce ? 0 : 14 * (1 - st.text)).toFixed(1) + 'px');
        if (beat.fx) storyFx[beat.fx] = st.w * st.text;
        if (selected < 0 && focus < 0 && st.w > 0.001) {
            model.groups.forEach((g, i) => { g.goalFade = beat.set.has(i) ? 1 : 1 - 0.86 * st.w; });
            storyOn = true;
        } else if (storyOn) { storyOn = false; paint(); }
    } else if (storyOn) { storyOn = false; paint(); }
    // Penning trap close-ups (positronium, lasers, antihydrogen happen inside the electrodes): the stack turns to a ghost
    if (model.events && !storyOn && selected < 0 && focus < 0) {
        const close = (model.events.zoom || 1) < 0.4;
        model.groups.forEach(g => { g.goalFade = !close ? 1 : /electrode|converter/i.test(g.label) ? 0.16 : /helium|nitrogen|vessel|solenoid|coil/i.test(g.label) ? 0.3 : 1; });
    }
    const capI = $('cap-intro'), capE = $('cap-explode');
    capI.style.opacity = intro.toFixed(3); capI.style.transform = `translateY(${(-24 * (1 - intro)).toFixed(1)}px)`;
    capE.style.opacity = exCap.toFixed(3);

    // user drag on top, with a little inertia
    if (!dragging) { velAz *= Math.exp(-dt * 5); velPol *= Math.exp(-dt * 5); userAz += velAz; userPol = clamp(userPol + velPol, -1.1, 1.45); }
    const sph = model.fit0.clone();
    sph.center.lerp(model.fit1.center, explodeT); sph.radius += (model.fit1.radius - sph.radius) * explodeT;
    const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const fitK = 1 / Math.sin(Math.min(vfov, hfov) / 2);
    let dist = sph.radius * fitK * kf.m * (MODELS[ci].fit || 1);     // tall models get a margin clear of the tabs and the toolbar
    if (model.events && explodeT < 0.3) {     // Penning trap: come closer and follow the antiproton bunch along the trap
        const fw = (1 - (st ? st.w : 0)) * (1 - smooth(0.05, 0.3, explodeT)), c3 = model.events.centre.clone().applyMatrix4(root.matrixWorld);
        followC.lerp(c3, 1 - Math.exp(-dt * ((model.events.zoom || 1) < 0.7 ? 6 : 2.5)));     // keeps up with the fast positron bunch
        sph.center.lerp(followC, fw * ((model.events.zoom || 1) < 0.7 ? 1 : 0.85));     // close-ups centre exactly on the action
        const dCore = (model.core ? model.core.radius * fitK * kf.m : dist) * 0.58 * (model.events.zoom || 1);   // close-up sized to the trap (and closer still for the mm-scale antihydrogen steps)
        dist += (Math.min(dist, dCore) - dist) * fw;
    }
    if (st && st.w > 0) {        // move the camera to the beat's subsystem (and between beats)
        const room = camera.aspect < 1 ? 1.22 : 1;      // portrait phones: the card covers the bottom, keep some margin round the beat
        const anchor = i => i < 0 ? { c: sph.center, d: dist } : { c: story[i].rides && driveX ? story[i].sph.center.clone().add(driveWorld(model, driveX)) : story[i].sph.center, d: clamp(story[i].sph.radius * fitK * 1.75 * room, dist * 0.38, dist * 1.05 * room) };
        const A = anchor(st.from), B2 = anchor(st.to), sb = reduce ? (st.b < 0.5 ? 0 : 1) : st.b;
        sph.center = A.c.clone().lerp(B2.c, sb); dist = A.d + (B2.d - A.d) * sb;
        if (!reduce) dist *= 1.03 - 0.07 * (st.push || 0) * st.w;     // slow dolly-in while a beat is read
        // a beat may also turn the model (e.g. to look into the 10 kW cup, or at its back)
        const tw = i => i < 0 ? 0 : story[i].az || 0;
        beatAz = (tw(st.from) + (tw(st.to) - tw(st.from)) * sb);
    } else beatAz = 0;
    beatAzS = reduce ? beatAz : beatAzS + (beatAz - beatAzS) * (1 - Math.exp(-dt * 5));
    const cutGoal = cut ? MODELS[ci].cutAz || 0 : 0;
    cutAzS = reduce ? cutGoal : cutAzS + (cutGoal - cutAzS) * (1 - Math.exp(-dt * 4));
    // long models keep a side view: their own offset and a smaller turn over the chapter
    const az = AZ0 + (desk && MODELS[ci].deskAz || 0) + (MODELS[ci].az0 || 0) + (reduce ? 0 : (p - 0.45) * 1.9 * (MODELS[ci].sweep ?? 1)) + userAz + beatAzS + cutAzS, pol = clamp((MODELS[ci].pol0 || POL0) + userPol - (reduce ? 0 : 0.1 * Math.sin(Math.PI * p)), 0.06, 2.6);   // top view down to well under the floor (not past the poles)
    _c.copy(sph.center);
    camera.position.set(_c.x + dist * Math.sin(pol) * Math.sin(az), _c.y + dist * Math.cos(pol), _c.z + dist * Math.sin(pol) * Math.cos(az));
    camera.lookAt(_c);
    // keep the depth range tight around the model: better depth precision, no shimmer when close
    camera.near = Math.max(model.radius * 0.004, dist - model.radius * 2.2); camera.far = dist + model.radius * 3; camera.updateProjectionMatrix();
    // while the title shows on the left, slide the model to the right of it
    const W = stage.clientWidth, H = stage.clientHeight;
    const shift = W > 900 ? Math.max(intro, st ? st.w * st.text : 0) * W * 0.16 : 0;
    const liftGoal = !$('plots').hidden ? H * 0.1 : (W <= 900 && st ? st.w * st.text * H * 0.13 : 0);
    plotLift = reduce ? liftGoal : plotLift + (liftGoal - plotLift) * (1 - Math.exp(-dt * 4));
    if (shift > 0.5 || plotLift > 0.5) camera.setViewOffset(W, H, -shift, plotLift, W, H); else camera.clearViewOffset();

    // a list click waits until the scroll has arrived
    if (pending && pending.chapter === ci && explodeT > 0.9) {
        if (pending.kind === 's') { focus = -1; focusSystem(pending.idx, false); } else { focus = -1; select(pending.idx); }
        pending = null;
    }

    stepExtras(dt, reduce ? 5 : now / 1000);     // reduced motion: effects hold still (a frozen frame of the beam, the water, the drive in the beam)
    stepMaterials(dt);
    hoverStep();
    placeLabels();
    renderer.render(scene, camera);
}

// ---------- start: the model in the link (or the first one) first, the others in the background ----------
// While a model is still on its way the stage shows a blurred still of it (posters/<key>.webp, rendered from this page).
const loadPct = [];
let posterFor = -1;
function setLoadText(ci) { const p = loadPct[ci]; $('load-txt').textContent = p > 0 && p < 100 ? T('loadingPct', p) : T('Loading model'); }
function showLoading(ci, on) {
    $('loading').classList.toggle('done', !on);
    const P = $('poster');
    if (!on) { P.classList.remove('on'); posterFor = -1; return; }
    if (posterFor === ci) return;
    posterFor = ci; setLoadText(ci);
    const src = `/CV/cad/posters/${MODELS[ci].key}.webp`;
    if (P.getAttribute('src') === src && P.complete) { P.classList.add('on'); return; }
    P.classList.remove('on');
    P.onload = () => { if (posterFor === ci) P.classList.add('on'); };
    P.src = src;
}
function localize(data, key) {
    const t = L10N.models && L10N.models[key];
    if (t) { data.name = t[1]; data.blurb = t[2]; }
    return data;
}
(async () => {
    try {
        const h = MODELS.findIndex(m => m.key === location.hash.slice(1));
        const order = MODELS.map((m, i) => i);
        if (h > 0) { order.splice(h, 1); order.unshift(h); }
        let first = true;
        for (const i of order) {
            const key = MODELS[i].key, prog = p => { loadPct[i] = p; if (posterFor === i) setLoadText(i); };
            const data = MODELS[i].procedural === 'hpfc' ? hpfcData() : MODELS[i].procedural ? await penningData(BASE) : await fetchModel(key, prog);
            loadPct[i] = 100;
            built[i] = build(localize(data, key));
            if (i === listIdx) renderParts();
            if (first) {
                first = false;
                requestAnimationFrame(loop);
                if (h >= 0) setTimeout(() => scrollToChapter(h, 0.17, true), 50);
            }
        }
    } catch (err) {
        $('loading').innerHTML = `<span>${esc(T('Could not load the model.'))}</span>`; console.error(err);
    }
})();
