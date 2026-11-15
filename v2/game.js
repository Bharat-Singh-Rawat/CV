/* =====================================================================
   "Beamline Run": a small original pixel-art platformer.
   A pixel version of me runs through three labs from my career. Collect ions, hit ? blocks
   for power-ups (magnetic shield, ion blaster, plasma mode), stomp or blast electrons, muons
   and spiky neutrons, time the high-voltage sparks, and put the beam into the Faraday cup.
   Top-5 high scores with names are kept in the visitor's browser.
   Keys: ← → / A D move · Space / ↑ / W jump · X / J / Shift shoot · Esc close.
   Touch buttons on phones. Opens from the "Take a break" card under "Beyond the lab".
   ===================================================================== */
(function () {
    const host = document.getElementById('hobbies');
    if (!host) return;
    const T = window.T || (s => s), LANG = window.LANG || 'en';
    const TILE = 16, W = 320, ROWS = 11, H = ROWS * TILE;   // 320 × 176 game pixels
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ---------- facts shown at the info screens ----------
    const FACTS = {
        en: [
            'I built a ring-cusp ion source here, for space propulsion and fusion research.',
            'Faraday cups catch the beam and measure it. I designed a high-power one.',
            'At CERN I modelled Penning–Malmberg traps that hold antiprotons.',
            'A digital twin uses physics and machine learning to predict how the trap behaves.',
            'Now I design electron injectors and beam diagnostics at Basilisk.',
            'Thanks for playing! Let’s talk beams.'
        ],
        es: [
            'Aquí construí una fuente de iones ring-cusp para propulsión espacial y fusión.',
            'Las copas de Faraday atrapan el haz y lo miden. Diseñé una de alta potencia.',
            'En el CERN modelé trampas de Penning–Malmberg que retienen antiprotones.',
            'Un gemelo digital combina física y aprendizaje automático para predecir la trampa.',
            'Ahora diseño inyectores de electrones y diagnósticos de haz en Basilisk.',
            '¡Gracias por jugar! Hablemos de física de aceleradores.'
        ],
        ru: [
            'Здесь я построил ионный источник ring-cusp для космических двигателей и термоядерных исследований.',
            'Цилиндр Фарадея ловит пучок и измеряет его. Я спроектировал мощный цилиндр.',
            'В ЦЕРН я моделировал ловушки Пеннинга–Мальмберга для антипротонов.',
            'Цифровой двойник объединяет физику и машинное обучение, чтобы предсказывать работу ловушки.',
            'Сейчас я проектирую электронные инжекторы и диагностику пучков в Basilisk.',
            'Спасибо за игру! Обсудим пучки частиц.'
        ]
    };
    const facts = FACTS[LANG] || FACTS.en;

    // ---------- levels ----------
    // columns are tiles; ground segments fill from `top` down; plats are one-way (jump up through them);
    // blocks are ? boxes hit from below; enemies: e electron, n neutron (spiky), m muon (flies)
    const LEVELS = [
        { name: T('Ion source lab'), w: 90,
          ground: [[0, 17, 10], [20, 25, 10], [26, 30, 8], [31, 34, 10], [38, 52, 10], [55, 60, 10], [61, 63, 8], [66, 79, 10], [80, 89, 10]],
          plats: [[14, 7, 3], [35, 8, 3], [41, 7, 2], [45, 5, 3], [53, 8, 2], [64, 8, 2]],
          blocks: [[7, 7, 'shield'], [8, 7, 'ion'], [23, 7, 'ion'], [48, 7, 'ion'], [70, 7, 'blaster']],
          enemies: [[24, 9, 'e'], [32, 9, 'e'], [44, 9, 'e'], [50, 9, 'n'], [58, 9, 'e'], [72, 9, 'e'], [76, 7, 'm'], [83, 9, 'e']],
          sparks: [42, 57, 68], signs: [[3, 0], [39, 1]], goal: 86 },
        { name: T('Antimatter lab · CERN'), w: 100,
          ground: [[0, 12, 10], [16, 24, 10], [25, 27, 8], [28, 30, 6], [31, 36, 10], [40, 55, 10], [56, 70, 10], [74, 82, 10], [86, 99, 10]],
          plats: [[13, 8, 3], [37, 8, 3], [46, 6, 3], [61, 7, 4], [71, 8, 3], [83, 8, 3]],
          blocks: [[5, 7, 'ion'], [19, 7, 'blaster'], [44, 7, 'shield'], [66, 7, 'star'], [90, 7, 'ion']],
          enemies: [[20, 9, 'e'], [33, 9, 'n'], [47, 9, 'e'], [50, 7, 'm'], [53, 9, 'n'], [64, 9, 'e'], [68, 9, 'e'], [78, 9, 'n'], [84, 5, 'm'], [92, 9, 'e'], [95, 9, 'n']],
          sparks: [34, 58, 76], signs: [[3, 2], [42, 3]], goal: 96 },
        { name: T('Accelerator hall · Basilisk'), w: 110,
          ground: [[0, 10, 10], [14, 22, 10], [23, 25, 8], [26, 34, 10], [38, 50, 10], [51, 53, 8], [57, 75, 10], [79, 90, 10], [94, 109, 10]],
          plats: [[11, 8, 3], [35, 8, 3], [42, 7, 5], [54, 8, 3], [60, 7, 3], [65, 5, 3], [76, 8, 3], [91, 8, 3]],
          blocks: [[6, 7, 'shield'], [29, 7, 'blaster'], [47, 7, 'ion'], [70, 7, 'star'], [84, 7, 'shield']],
          enemies: [[18, 9, 'e'], [21, 9, 'n'], [30, 9, 'e'], [33, 9, 'n'], [44, 5, 'm'], [48, 9, 'e'], [62, 9, 'n'], [66, 3, 'm'], [68, 9, 'e'], [73, 9, 'n'], [82, 9, 'e'], [86, 6, 'm'], [88, 9, 'n'], [98, 9, 'e'], [101, 9, 'n'], [104, 7, 'm']],
          sparks: [40, 49, 72, 96], signs: [[3, 4], [99, 5]], goal: 106 }
    ];

    // ---------- pixel sprites ----------
    const PAL = { k: '#1d1d1f', w: '#ffffff', g: '#8e8e93', l: '#d2d2d7', s: '#b0784f', h: '#18181a', b: '#0071e3', c: '#c47a3a', d: '#5a3416', y: '#ffd60a',
        e: '#2a2a2c', m: '#2e2420', t: '#fbfbf8', p: '#3d5d92', q: '#d3dced', n: '#1f3157', j: '#3a404c', r: '#ff3b30', o: '#ff9f0a' };
    function sprite(rows) {
        const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
        const x = c.getContext('2d');
        rows.forEach((r, j) => [...r].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }));
        return c;
    }
    function silhouette(src, color) {                     // a one-colour copy, used for glow outlines
        const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const x = c.getContext('2d'); x.drawImage(src, 0, 0);
        x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
        return c;
    }
    // me, from my profile photo: short spiky black hair, moustache and short beard, big smile,
    // ear studs, blue-and-white plaid shirt with a collar, dark jeans
    const HEAD = ['...h.hh.h...', '..hhhhhhhh..', '..hsssssssh.', '.eskssskss..', '..ssmmmmss..', '..smttttms..', '...smmmms...', '....smms....'];
    const BODY = ['..pqwpwqp...', '.ppqpnpqpp..', '.sqpqnqpqs..', '..pqpnpqp...'];
    const LEGS = {
        idle: ['...jj..jj...', '...jj..jj...', '...jj..jj...', '..kkk..kkk..'],
        run1: ['..jj....jj..', '..jj....jj..', '.jj......jj.', '.kk.......kk'],
        run2: ['....jjjj....', '....jjj.....', '...jj.jj....', '...kk..kk...'],
        jump: ['..jjj..jjj..', '..jj....jj..', '..kk....kk..', '............']
    };
    const PLAYER = {}, GLOW = { shield: {}, blaster: {}, star: {} };
    for (const k in LEGS) {
        PLAYER[k] = sprite([...HEAD, ...BODY, ...LEGS[k]]);
        GLOW.shield[k] = silhouette(PLAYER[k], 'rgba(0,113,227,0.85)');
        GLOW.blaster[k] = silhouette(PLAYER[k], 'rgba(255,214,10,0.95)');
        GLOW.star[k] = silhouette(PLAYER[k], 'rgba(255,159,10,0.95)');
    }
    const ION = sprite(['..bbb..', '.bbwbb.', 'bwwwwwb', '.bbwbb.', '..bbb..']);
    const ELECTRON = sprite(['..kkkk..', '.kkkkkk.', 'kkwkkwkk', 'kkkkkkkk', 'kwwwwwwk', 'kkkkkkkk', '.kkkkkk.', '..kkkk..']);
    const NEUTRON = sprite(['k..kk..k', '.kkkkkk.', '.kwkkwk.', 'kkkkkkkk', 'kkrrrrkk', '.kkkkkk.', '.kkkkkk.', 'k..kk..k']);
    const MUON = [
        sprite(['w......w', 'ww....ww', '.wkkkkw.', '.kkwwkk.', '.kkkkkk.', '..kkkk..', '........', '........']),
        sprite(['........', '........', 'wwkkkkww', '.kkwwkk.', '.kkkkkk.', '..kkkk..', '........', '........'])
    ];
    const ITEM = {
        shield: sprite(['..bbbbbb..', '.bwwwwwwb.', 'bwbbbbbbwb', 'bwbwwwwbwb', 'bwbwbbwbwb', 'bwbwbbwbwb', 'bwbwwwwbwb', 'bwbbbbbbwb', '.bwwwwwwb.', '..bbbbbb..']),
        blaster: sprite(['.....kkkk.', '....kyyyk.', '...kyyyk..', '..kyyyyk..', '.kyyyyyyk.', '..kkyyyk..', '...kyyk...', '..kyyk....', '.kyk......', '.kk.......']),
        star: sprite(['....o....', '...oyo...', 'ooooyoooo', '.oyywyyo.', '..oyyyo..', '.oyo.oyo.', '.oo...oo.', 'o.......o'])
    };

    // ---------- tiny sound effects (respect the site's sound toggle) ----------
    let actx = null;
    const muted = () => { try { return localStorage.getItem('cv-sfx') === 'off'; } catch (e) { return false; } };
    function beep(f1, f2, dur, type = 'square', vol = 0.04, delay = 0) {
        if (muted()) return;
        try {
            actx = actx || new (window.AudioContext || window.webkitAudioContext)();
            if (actx.state !== 'running') actx.resume();
            const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
            o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
        } catch (e) { /* no audio */ }
    }
    const SND = {
        jump: () => beep(320, 640, 0.12),
        ion: () => beep(900, 1500, 0.08, 'triangle', 0.05),
        stomp: () => beep(520, 140, 0.12),
        bump: () => beep(180, 120, 0.08, 'square', 0.05),
        power: () => [392, 523, 659, 784].forEach((f, i) => beep(f, f * 1.01, 0.09, 'triangle', 0.05, i * 0.06)),
        shoot: () => beep(1400, 500, 0.08, 'sawtooth', 0.03),
        shrink: () => beep(600, 200, 0.25, 'square', 0.04),
        hurt: () => beep(220, 55, 0.35, 'sawtooth', 0.05),
        clear: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, f, 0.14, 'triangle', 0.05, i * 0.11))
    };

    // ---------- high scores (top 5, kept in this browser) ----------
    const store = {
        top: () => { try { const v = JSON.parse(localStorage.getItem('cv-game-top')); return Array.isArray(v) ? v : []; } catch (e) { return []; } },
        save: list => { try { localStorage.setItem('cv-game-top', JSON.stringify(list)); } catch (e) { /* private mode */ } },
        name: () => { try { return localStorage.getItem('cv-game-name') || ''; } catch (e) { return ''; } },
        setName: n => { try { localStorage.setItem('cv-game-name', n); } catch (e) { /* private mode */ } }
    };
    const qualifies = s => { const t = store.top(); return s > 0 && (t.length < 5 || s > t[t.length - 1].s); };
    function addScore(name, s, lvl) {
        const t = store.top(); t.push({ n: name.slice(0, 14), s, l: lvl, d: Date.now() });
        t.sort((a, b) => b.s - a.s || a.d - b.d);
        const top = t.slice(0, 5); store.save(top); return top;
    }
    const boardHTML = (hi) => {
        const t = store.top();
        if (!t.length) return '';
        return `<ol class="g-board"><li class="g-board-h">${T('Top 5')}</li>${t.map(r => `<li${r.d === hi ? ' class="me"' : ''}><span>${esc(r.n)}</span><b>${r.s}</b></li>`).join('')}</ol>`;
    };

    // ---------- the "Take a break" card ----------
    const card = document.createElement('div');
    card.className = 'play-card';
    card.innerHTML = `
        <canvas class="play-preview" width="48" height="24" aria-hidden="true"></canvas>
        <div class="play-text">
            <h3>${T('Take a break.')}</h3>
            <p>${T('Guide a pixel me down the beamline: collect ions, dodge sparks and land the beam in the Faraday cup.')} <span class="play-best"></span></p>
        </div>
        <button type="button" class="btn play-btn" id="play-open">${T('Play')} ▸</button>`;
    host.insertAdjacentElement('afterend', card);
    function cardBest() {
        const t = store.top()[0];
        card.querySelector('.play-best').textContent = t ? `${T('High score')}: ${t.s} · ${t.n}` : '';
    }
    cardBest();

    const pv = card.querySelector('.play-preview'), pctx = pv.getContext('2d');
    let pvT = 0, pvRaf = 0;
    function preview() {
        pvT++;
        pctx.clearRect(0, 0, 48, 24);
        pctx.fillStyle = '#c7c7cc'; pctx.fillRect(0, 22, 48, 2);
        pctx.drawImage(Math.floor(pvT / 8) % 2 ? PLAYER.run1 : PLAYER.run2, 6, 6);
        pctx.drawImage(ION, Math.round(44 - (pvT * 0.6) % 40), 12 + Math.round(Math.sin(pvT / 8)));
        pvRaf = requestAnimationFrame(preview);
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!pvRaf) preview(); } else { cancelAnimationFrame(pvRaf); pvRaf = 0; } }).observe(card);
    } else { pctx.drawImage(PLAYER.idle, 6, 6); }

    // ---------- the game window ----------
    const ov = document.createElement('div');
    ov.className = 'game-ov'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Beamline Run');
    ov.innerHTML = `
        <div class="game-box">
            <div class="game-top">
                <strong>Beamline Run</strong>
                <span class="game-hud" id="g-hud"></span>
                <button type="button" class="game-close" id="g-close" aria-label="${T('Close')}">✕</button>
            </div>
            <div class="game-stage" id="g-stage" tabindex="-1">
                <canvas id="g-canvas" width="${W}" height="${H}"></canvas>
                <div class="g-fact" id="g-fact"></div>
                <div class="g-msg" id="g-msg"></div>
            </div>
            <div class="game-touch" aria-hidden="true">
                <button type="button" data-k="left">◀</button><button type="button" data-k="right">▶</button>
                <button type="button" data-k="fire" class="fire">⚡</button>
                <button type="button" data-k="jump" class="jump">⤒</button>
            </div>
            <p class="game-help">${T('← → or A D to move · Space or ↑ to jump · X or Shift to shoot · Esc to close')}</p>
        </div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('#g-canvas'), ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const $msg = ov.querySelector('#g-msg'), $fact = ov.querySelector('#g-fact'), $hud = ov.querySelector('#g-hud');

    // ---------- state ----------
    const keys = { left: false, right: false, jump: false, fire: false };
    let mode = 'title', levelIdx = 0, lives = 3, score = 0, lv = null, p = null, cam = 0, frame = 0, timer = 0;
    let checkpoint = null, particles = [], bolts = [], items = [], raf = 0, last = 0, acc = 0, open = false, lastEntry = 0;

    function build(L) {
        const solid = Array.from({ length: ROWS }, () => new Uint8Array(L.w));
        L.ground.forEach(([a, b, top]) => { for (let x = a; x <= b; x++) for (let y = top; y < ROWS; y++) solid[y][x] = 1; });
        L.plats.forEach(([x, y, n]) => { for (let i = 0; i < n; i++) solid[y][x + i] = 2; });
        const blocks = {};
        L.blocks.forEach(([x, y, item]) => { solid[y][x] = 3; blocks[y * 1000 + x] = { item, bump: 0 }; });
        const top = col => { for (let y = 0; y < ROWS; y++) if (solid[y][col] === 1) return y; return ROWS; };
        // ions: along every floor and platform, skipping hazards and anything solid
        const avoid = new Set([...L.sparks, L.goal, L.goal + 1, ...L.signs.map(s => s[0])]);
        const ions = [];
        L.ground.forEach(([a, b, t]) => { for (let x = a + 2; x <= b - 1; x += 3) if (!avoid.has(x) && !avoid.has(x - 1) && !solid[t - 1][x]) ions.push([x, t - 1]); });
        L.plats.forEach(([x, y, n]) => { for (let i = 0; i < n; i++) if (y > 0 && !solid[y - 1][x + i]) ions.push([x + i, y - 1]); });
        return {
            L, solid, top, blocks,
            ions: ions.map(([x, y]) => ({ x: x * TILE + 8, y: y * TILE + 8, got: false })),
            enemies: L.enemies.map(([x, y, t]) => ({ t, x: x * TILE + 4, y: y * TILE + 4, x0: x * TILE + 4, y0: y * TILE + 4, w: 8, h: 8, vx: 0, vy: 0, dir: -1, alive: true, ph: x * 0.7 })),
            sparks: L.sparks.map(x => ({ x: x * TILE, top: top(x) * TILE, phase: (x * 37) % 140 })),
            signs: L.signs.map(([x, i]) => ({ x: x * TILE, top: top(x) * TILE, i, seen: false })),
            goal: { x: L.goal * TILE, top: top(L.goal) * TILE }
        };
    }
    const spawnAt = col => ({ x: col * TILE + 4, y: lv.top(col) * TILE - 14 });
    function loadLevel(i, keepPower) {
        levelIdx = i; lv = build(LEVELS[i]);
        checkpoint = spawnAt(2);
        const pow = keepPower && p ? p.pow : 0;
        p = { ...checkpoint, w: 8, h: 14, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, buffer: 0, inv: 0, pow, star: 0, cool: 0 };
        particles = []; bolts = []; items = []; cam = 0;
        hud();
    }
    function hud() {
        const pw = p && p.star > 0 ? ' ✦' : p && p.pow === 2 ? ' ⚡' : p && p.pow === 1 ? ' 🛡' : '';
        $hud.textContent = `${T('Level')} ${levelIdx + 1}/3 · ${LEVELS[levelIdx].name}   ⚛ ${score}   ${'♥'.repeat(Math.max(0, lives))}${pw}`;
    }
    function message(html, interactive) { $msg.innerHTML = html; $msg.classList.toggle('show', !!html); $msg.classList.toggle('form', !!interactive); }
    function fact(i) { if (i == null) { $fact.classList.remove('show'); return; } $fact.textContent = facts[i]; $fact.classList.add('show'); }

    // ---------- physics ----------
    // tile kinds: 1 ground, 2 one-way platform, 3 ? block, 4 used block
    const tileAt = (px, py) => {
        const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
        if (tx < 0 || tx >= lv.L.w) return 1;
        if (ty < 0 || ty >= ROWS) return 0;
        return lv.solid[ty][tx];
    };
    const hard = t => t === 1 || t === 3 || t === 4;
    function moveX(o) {
        o.x += o.vx; o.hitWall = false;
        const ys = [o.y, o.y + o.h / 2, o.y + o.h - 0.01];
        if (o.vx > 0 && ys.some(y => hard(tileAt(o.x + o.w - 0.01, y)))) { o.x = Math.floor((o.x + o.w) / TILE) * TILE - o.w; o.vx = 0; o.hitWall = true; }
        else if (o.vx < 0 && ys.some(y => hard(tileAt(o.x, y)))) { o.x = Math.floor(o.x / TILE) * TILE + TILE; o.vx = 0; o.hitWall = true; }
    }
    function moveY(o, isPlayer) {
        const prevBottom = o.y + o.h;
        o.y += o.vy; o.onGround = false;
        if (o.vy > 0) {
            const by = o.y + o.h, rowTop = Math.floor(by / TILE) * TILE;
            const land = t => hard(t) || (t === 2 && prevBottom <= rowTop + 0.01);   // platforms only hold you from above
            if (land(tileAt(o.x, by)) || land(tileAt(o.x + o.w - 0.01, by))) { o.y = rowTop - o.h; o.vy = 0; o.onGround = true; }
        } else if (o.vy < 0) {
            const l = tileAt(o.x, o.y), r = tileAt(o.x + o.w - 0.01, o.y);
            if (hard(l) || hard(r)) {
                o.y = Math.floor(o.y / TILE) * TILE + TILE; o.vy = 0;
                if (isPlayer) bumpBlock(Math.floor((o.x + o.w / 2) / TILE), Math.floor((o.y - 1) / TILE));
            }
        }
    }
    function bumpBlock(tx, ty) {
        if (ty < 0 || lv.solid[ty][tx] !== 3) {               // the centre missed: try the neighbour the head touched
            const alt = [tx - 1, tx + 1].find(x => x >= 0 && ty >= 0 && lv.solid[ty][x] === 3 && Math.abs(p.x + 4 - (x * TILE + 8)) < 14);
            if (alt === undefined) { SND.bump(); return; }
            tx = alt;
        }
        const b = lv.blocks[ty * 1000 + tx]; lv.solid[ty][tx] = 4; b.bump = 8;
        // knock out any enemy standing on the block
        for (const e of lv.enemies) if (e.alive && e.t !== 'm' && Math.abs(e.x + 4 - (tx * TILE + 8)) < 12 && Math.abs(e.y + e.h - ty * TILE) < 3) { kill(e, 2); }
        if (b.item === 'ion') { score += 3; SND.ion(); burst(tx * TILE + 8, ty * TILE - 4, '#0071e3', 10); hud(); }
        else { items.push({ kind: b.item, x: tx * TILE + 3, y: ty * TILE, rise: 16, w: 10, h: 10 }); SND.bump(); }
    }
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const sparkOn = s => ((frame + s.phase) % 140) < 55;
    const sparkWarn = s => ((frame + s.phase) % 140) > 110;
    function burst(x, y, color, n = 8) {
        for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.4; particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.5, life: 24 + Math.random() * 12, color }); }
    }
    function kill(e, pts) { e.alive = false; score += pts; burst(e.x + 4, e.y + 4, e.t === 'n' ? '#ff3b30' : '#1d1d1f', 10); hud(); }

    function hurt(fell) {
        if (!fell && (p.inv > 0 || p.star > 0)) return;
        if (!fell && p.pow > 0) { p.pow--; p.inv = 90; SND.shrink(); hud(); return; }   // a power-up takes the hit
        lives--; SND.hurt(); burst(p.x + 4, p.y + 7, '#ff3b30', 12);
        hud();
        if (lives <= 0) { endGame(false); return; }
        p.x = checkpoint.x; p.y = checkpoint.y; p.vx = p.vy = 0; p.inv = 100; p.pow = 0; p.star = 0;
        hud();
    }
    function endGame(won) {
        mode = won ? 'win' : 'over'; fact(won ? 5 : null);
        const title = won ? T('Beam on target!') : T('Game over');
        if (qualifies(score)) {
            mode = 'name';
            message(`<b>${title}</b><span>${T('New high score!')} ⚛ ${score}</span>
                <form class="g-name" id="g-name"><input id="g-name-in" maxlength="14" autocomplete="nickname" placeholder="${T('Your name')}" value="${esc(store.name())}" required>
                <button type="submit">${T('Save')}</button></form>`, true);
            const f = $msg.querySelector('#g-name'), inp = f.querySelector('input');
            setTimeout(() => { inp.focus(); inp.select(); }, 50);
            f.addEventListener('submit', e => {
                e.preventDefault();
                const name = inp.value.trim() || 'Player';
                store.setName(name);
                const top = addScore(name, score, levelIdx + 1); lastEntry = top.find(r => r.n === name.slice(0, 14) && r.s === score)?.d || 0;
                cardBest(); mode = won ? 'win' : 'over';
                message(`<b>${title}</b><span>⚛ ${score}</span>${boardHTML(lastEntry)}<small>${T('Press Space or tap to play again')}</small>`);
                ov.querySelector('#g-stage').focus();
            });
        } else {
            message(`<b>${title}</b><span>⚛ ${score}</span>${boardHTML(0)}<small>${T('Press Space or tap to play again')}</small>`);
        }
    }
    function start() { lives = 3; score = 0; p = null; loadLevel(0); mode = 'play'; message(''); fact(null); }

    function update() {
        frame++;
        if (mode === 'clear') {
            if (++timer > 150) {
                if (levelIdx < LEVELS.length - 1) { loadLevel(levelIdx + 1, true); mode = 'play'; message(''); }
                else { score += lives * 10; endGame(true); }
            }
            updateParticles(); return;
        }
        if (mode !== 'play') { updateParticles(); return; }

        // player
        const ACC = 0.35, MAXV = 1.8, FRIC = 0.72, G = 0.25, JV = -5.4, MAXFALL = 4.5;
        if (keys.left && !keys.right) { p.vx = Math.max(-MAXV, p.vx - ACC); p.face = -1; }
        else if (keys.right && !keys.left) { p.vx = Math.min(MAXV, p.vx + ACC); p.face = 1; }
        else { p.vx *= FRIC; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
        if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
        if (p.buffer > 0) p.buffer--;
        if (p.buffer > 0 && p.coyote > 0) { p.vy = JV; p.buffer = 0; p.coyote = 0; SND.jump(); }
        if (!keys.jump && p.vy < -2) p.vy = -2;              // let go early for a short hop
        p.vy = Math.min(MAXFALL, p.vy + G);
        moveX(p); moveY(p, true);
        if (p.inv > 0) p.inv--;
        if (p.star > 0 && --p.star === 0) hud();
        if (p.cool > 0) p.cool--;
        if (p.y > H + 24) { hurt(true); return; }

        // ion blaster
        if (keys.fire && p.pow === 2 && p.cool === 0 && bolts.length < 3) {
            bolts.push({ x: p.x + (p.face > 0 ? 8 : -4), y: p.y + 7, vx: p.face * 4.2, life: 40, w: 4, h: 2 }); p.cool = 14; SND.shoot();
        }
        for (const b of bolts) {
            b.x += b.vx; b.life--;
            if (hard(tileAt(b.x + 2, b.y))) b.life = 0;
            for (const e of lv.enemies) if (e.alive && b.life > 0 && overlap(b, e)) { kill(e, e.t === 'n' ? 5 : e.t === 'm' ? 3 : 2); SND.stomp(); b.life = 0; }
        }
        bolts = bolts.filter(b => b.life > 0);

        // ions
        for (const o of lv.ions) if (!o.got && Math.abs(p.x + 4 - o.x) < 9 && Math.abs(p.y + 7 - o.y) < 11) { o.got = true; score++; SND.ion(); burst(o.x, o.y, '#0071e3', 6); hud(); }

        // power-ups rise out of their block, then hover
        for (const it of items) {
            if (it.rise > 0) { it.y -= 1; it.rise--; continue; }
            if (overlap(p, it)) {
                it.got = true; SND.power(); burst(it.x + 5, it.y + 5, '#ffd60a', 12);
                if (it.kind === 'shield') p.pow = Math.max(p.pow, 1);
                if (it.kind === 'blaster') p.pow = 2;
                if (it.kind === 'star') p.star = 600;
                score += 5; hud();
            }
        }
        items = items.filter(it => !it.got);
        for (const k in lv.blocks) if (lv.blocks[k].bump > 0) lv.blocks[k].bump--;

        // enemies
        for (const e of lv.enemies) {
            if (!e.alive) continue;
            if (Math.abs(e.x - p.x) > W) continue;              // sleep until close to the screen
            if (e.t === 'm') {                                 // muon: flies a wave around its home
                e.ph += 0.02;
                e.x = e.x0 + Math.sin(e.ph) * 44; e.y = e.y0 + Math.sin(e.ph * 3.3) * 10;
            } else {
                e.vx = e.dir * (e.t === 'n' ? 0.75 : 0.45); e.vy = Math.min(4, e.vy + 0.25);
                moveX(e); if (e.hitWall) e.dir *= -1;
                moveY(e, false);
                if (e.onGround && !tileAt(e.dir > 0 ? e.x + e.w + 1 : e.x - 1, e.y + e.h + 2)) e.dir *= -1;
                if (e.y > H) e.alive = false;
            }
            if (!overlap(p, e)) continue;
            if (p.star > 0) { kill(e, 2); SND.stomp(); continue; }
            const fromAbove = p.vy > 0 && p.y + p.h - p.vy <= e.y + 3;
            if (fromAbove && e.t !== 'n') { kill(e, e.t === 'm' ? 3 : 2); p.vy = keys.jump ? -5 : -3.6; SND.stomp(); }
            else hurt(false);
        }
        // high-voltage sparks between two posts
        for (const s of lv.sparks) if (sparkOn(s) && overlap(p, { x: s.x + 2, y: s.top - 12, w: 12, h: 12 })) hurt(false);

        // info screens: show a fact and become the checkpoint
        let near = null;
        for (const s of lv.signs) if (Math.abs(p.x + 4 - (s.x + 8)) < 34) { near = s; if (!s.seen) { s.seen = true; checkpoint = spawnAt(s.x / TILE); } }
        fact(near ? near.i : null);

        // the Faraday cup
        if (overlap(p, { x: lv.goal.x, y: lv.goal.top - 26, w: 20, h: 26 })) {
            mode = 'clear'; timer = 0; score += 10; SND.clear(); fact(null); hud();
            message(`<b>${T('Beam on target!')}</b><span>${levelIdx < LEVELS.length - 1 ? T('Next') + ': ' + LEVELS[levelIdx + 1].name : ''}</span>`);
        }

        cam = Math.max(0, Math.min(lv.L.w * TILE - W, p.x - W * 0.4));
        updateParticles();
    }
    function updateParticles() {
        for (const q of particles) { q.x += q.vx; q.y += q.vy; q.vy += 0.08; q.life--; }
        particles = particles.filter(q => q.life > 0);
    }

    // ---------- drawing ----------
    function draw() {
        ctx.fillStyle = '#f2f2f5'; ctx.fillRect(0, 0, W, H);
        const c = Math.round(cam);
        ctx.fillStyle = '#e4e4ea';
        for (let i = -1; i < 6; i++) {
            const x = Math.round(i * 96 - (c * 0.35) % 96);
            ctx.fillRect(x + 8, 60, 26, 100); ctx.fillRect(x + 50, 96, 34, 64);
            ctx.fillStyle = '#d9d9e0'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 11, 66 + k * 18, 20, 3); ctx.fillStyle = '#e4e4ea';
            ctx.beginPath(); ctx.arc(x + 67, 92, 13, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#dcdce3'; ctx.fillRect(0, 44, W, 5);
        for (let i = -1; i < 9; i++) { const x = Math.round(i * 48 - (c * 0.6) % 48); ctx.fillRect(x, 40, 4, 13); }

        // tiles
        const c0 = Math.floor(c / TILE), c1 = Math.min(lv.L.w - 1, c0 + W / TILE + 1);
        for (let x = c0; x <= c1; x++) for (let y = 0; y < ROWS; y++) {
            const t = lv.solid[y][x]; if (!t) continue;
            const px = x * TILE - c; let py = y * TILE;
            if (t === 1) {
                ctx.fillStyle = '#c7c7cc'; ctx.fillRect(px, py, TILE, TILE);
                ctx.fillStyle = '#bcbcc2'; ctx.fillRect(px + ((x + y) % 2) * 8 + 2, py + 6, 4, 4);
                if (y === 0 || lv.solid[y - 1][x] !== 1) { ctx.fillStyle = '#8e8e93'; ctx.fillRect(px, py, TILE, 2); }
            } else if (t === 2) {
                ctx.fillStyle = '#a1a1a6'; ctx.fillRect(px, py, TILE, 3); ctx.fillRect(px, py + 13, TILE, 2);
                ctx.fillStyle = '#b8b8be'; for (let k = 0; k < 10; k++) { ctx.fillRect(px + k + 3, py + 3 + k, 2, 1); ctx.fillRect(px + 12 - k, py + 3 + k, 2, 1); }
            } else {
                const b = lv.blocks[y * 1000 + x]; if (b && b.bump) py -= Math.sin(b.bump / 8 * Math.PI) * 4;
                ctx.fillStyle = t === 3 ? '#0071e3' : '#a1a1a6'; ctx.fillRect(px, py, TILE, TILE);
                ctx.fillStyle = t === 3 ? '#005bb5' : '#8e8e93'; ctx.fillRect(px, py + 14, TILE, 2); ctx.fillRect(px + 14, py, 2, TILE);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px + 1, py + 1, 2, 2); ctx.fillRect(px + 13, py + 1, 2, 2); ctx.fillRect(px + 1, py + 13, 2, 2); ctx.fillRect(px + 13, py + 13, 2, 2);
                if (t === 3 && frame % 40 < 34) {                 // the "?" mark
                    ctx.fillRect(px + 6, py + 3, 4, 2); ctx.fillRect(px + 9, py + 5, 2, 2); ctx.fillRect(px + 7, py + 7, 2, 2); ctx.fillRect(px + 7, py + 11, 2, 2);
                }
            }
        }
        // info screens
        for (const s of lv.signs) {
            const x = s.x - c; if (x < -20 || x > W) continue;
            ctx.fillStyle = '#636366'; ctx.fillRect(x + 7, s.top - 12, 2, 12);
            ctx.fillStyle = '#1d1d1f'; ctx.fillRect(x + 1, s.top - 22, 14, 11);
            ctx.fillStyle = frame % 60 < 50 ? '#0071e3' : '#4da3ff'; ctx.fillRect(x + 3, s.top - 20, 10, 7);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 7, s.top - 19, 2, 1); ctx.fillRect(x + 7, s.top - 17, 2, 3);
        }
        // sparks
        for (const s of lv.sparks) {
            const x = s.x - c; if (x < -20 || x > W) continue;
            ctx.fillStyle = '#636366'; ctx.fillRect(x + 2, s.top - 12, 2, 12); ctx.fillRect(x + 12, s.top - 12, 2, 12);
            ctx.fillStyle = '#c47a3a'; ctx.fillRect(x + 1, s.top - 14, 4, 3); ctx.fillRect(x + 11, s.top - 14, 4, 3);
            if (sparkOn(s)) {
                ctx.fillStyle = frame % 4 < 2 ? '#ffd60a' : '#ffffff';
                let yy = s.top - 12;
                for (let k = 0; k < 8; k++) { yy += (Math.random() * 4 - 2) | 0; ctx.fillRect(x + 4 + k, Math.max(s.top - 14, Math.min(s.top - 2, yy)), 1, 2); }
                ctx.fillStyle = 'rgba(255,214,10,0.25)'; ctx.fillRect(x + 2, s.top - 16, 12, 16);
            } else if (sparkWarn(s) && frame % 6 < 3) { ctx.fillStyle = '#ffd60a'; ctx.fillRect(x + 4, s.top - 13, 1, 1); ctx.fillRect(x + 11, s.top - 13, 1, 1); }
        }
        // ions, power-ups, enemies, bolts
        for (const o of lv.ions) if (!o.got) { const x = o.x - c; if (x > -8 && x < W + 8) ctx.drawImage(ION, Math.round(x - 3), Math.round(o.y - 2 + Math.sin((frame + o.x) / 10) * 1.5)); }
        for (const it of items) ctx.drawImage(ITEM[it.kind], Math.round(it.x - c), Math.round(it.y + (it.rise ? 0 : Math.sin(frame / 9) * 1.5)));
        for (const e of lv.enemies) if (e.alive) {
            const spr = e.t === 'n' ? NEUTRON : e.t === 'm' ? MUON[Math.floor(frame / 8) % 2] : ELECTRON;
            ctx.drawImage(spr, Math.round(e.x - c), Math.round(e.y));
        }
        for (const b of bolts) { ctx.fillStyle = '#ffd60a'; ctx.fillRect(Math.round(b.x - c), Math.round(b.y), 5, 2); ctx.fillStyle = '#0071e3'; ctx.fillRect(Math.round(b.x - c + (b.vx > 0 ? 4 : -1)), Math.round(b.y), 2, 2); }
        // Faraday cup
        {
            const x = lv.goal.x - c, t = lv.goal.top;
            ctx.fillStyle = '#c47a3a'; ctx.fillRect(x, t - 26, 20, 26);
            ctx.fillStyle = '#5a3416'; ctx.fillRect(x, t - 20, 13, 14);
            ctx.fillStyle = '#e09a5c'; ctx.fillRect(x + 15, t - 24, 2, 22); ctx.fillRect(x, t - 26, 20, 2);
            ctx.fillStyle = '#636366'; ctx.fillRect(x - 3, t - 22, 2, 18);
            if (mode === 'clear') {
                const len = Math.min(W, timer * 6);
                ctx.fillStyle = 'rgba(0,113,227,0.25)'; ctx.fillRect(x - len, t - 16, len + 4, 6);
                ctx.fillStyle = '#0071e3'; ctx.fillRect(x - len, t - 14, len + 4, 2);
                if (timer % 3 === 0) burst(x + 6, t - 13, '#ffd60a', 2);
            }
        }
        // player: glow for power-ups, flashing in plasma mode, blinking after a hit
        if (!(p.inv > 0 && Math.floor(p.inv / 4) % 2)) {
            const k = !p.onGround ? 'jump' : Math.abs(p.vx) > 0.2 ? (Math.floor(frame / 7) % 2 ? 'run1' : 'run2') : 'idle';
            const x = Math.round(p.x - 2 - c), y = Math.round(p.y - 2);
            const glow = p.star > 0 ? (frame % 6 < 3 ? GLOW.star[k] : GLOW.blaster[k]) : p.pow === 2 ? GLOW.blaster[k] : p.pow === 1 ? GLOW.shield[k] : null;
            const put = img => {
                if (p.face < 0) { ctx.save(); ctx.translate(x + 12, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
                else ctx.drawImage(img, x, y);
            };
            if (glow) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.save(); ctx.translate(dx, dy); put(glow); ctx.restore(); }
            put(PLAYER[k]);
        }
        for (const q of particles) { ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x - c), Math.round(q.y), 2, 2); }
    }

    // ---------- loop ----------
    function loop() {
        raf = requestAnimationFrame(loop);
        const now = performance.now();
        acc += Math.max(0, Math.min(100, now - last)); last = now;
        while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
        draw();
    }

    // ---------- input ----------
    const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
        KeyX: 'fire', KeyJ: 'fire', ShiftLeft: 'fire', ShiftRight: 'fire', KeyF: 'fire' };
    const canStart = () => mode === 'title' || mode === 'over' || mode === 'win';
    function press(k, down) {
        if (k === 'jump' && down && !keys.jump) {
            if (mode === 'play') p.buffer = 6;
            else if (canStart()) start();
        }
        keys[k] = down;
    }
    window.addEventListener('keydown', e => {
        if (!open) return;
        if (e.target && e.target.tagName === 'INPUT') { if (e.key === 'Escape') close(); return; }   // typing a name
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'Enter' && canStart()) { start(); e.preventDefault(); return; }
        const k = KEYMAP[e.code]; if (!k) return;
        e.preventDefault(); e.stopPropagation();
        if (!e.repeat) press(k, true);
    }, true);
    window.addEventListener('keyup', e => { if (!open) return; const k = KEYMAP[e.code]; if (k) { keys[k] = false; if (e.target.tagName !== 'INPUT') e.preventDefault(); } }, true);
    ov.querySelectorAll('.game-touch button').forEach(b => {
        const k = b.dataset.k;
        b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); press(k, true); });
        const up = () => { keys[k] = false; };
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    });
    ov.querySelector('#g-stage').addEventListener('pointerdown', e => { if (e.target.closest('form')) return; if (canStart()) start(); });
    ov.querySelector('#g-close').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    // ---------- open / close ----------
    let lastFocus = null;
    function openGame() {
        lastFocus = document.activeElement;
        open = true; ov.hidden = false; requestAnimationFrame(() => ov.classList.add('open'));
        document.documentElement.classList.add('game-open');
        mode = 'title'; p = null; score = 0; lives = 3; loadLevel(0); fact(null);
        message(`<b>Beamline Run</b><span>${T('Collect ions, dodge sparks, hit the Faraday cup.')}</span>
            <span class="g-legend">🛡 ${T('Shield')} · ⚡ ${T('Ion blaster')} · ✦ ${T('Plasma mode')}</span>${boardHTML(0)}<small>${T('Press Space or tap to start')}</small>`);
        ov.querySelector('#g-stage').focus();
        last = performance.now(); acc = 0; if (!raf) raf = requestAnimationFrame(loop);
    }
    function close() {
        open = false; Object.keys(keys).forEach(k => { keys[k] = false; });
        cancelAnimationFrame(raf); raf = 0;
        ov.classList.remove('open'); document.documentElement.classList.remove('game-open');
        setTimeout(() => { ov.hidden = true; }, 300);
        cardBest();
        lastFocus?.focus?.();
    }
    card.querySelector('#play-open').addEventListener('click', openGame);
    window.cvGame = {
        open: openGame,
        state: () => ({ mode, level: levelIdx + 1, frame, lives, score, pow: p && p.pow, x: p && Math.round(p.x), y: p && Math.round(p.y) }),
        // test hook: advance the game n frames with keys held (used by automated checks)
        _step: (n, k = {}) => { Object.assign(keys, { left: false, right: false, jump: false, fire: false }, k); if (k.pow != null && p) p.pow = k.pow; for (let i = 0; i < n; i++) { if (k.jumpEvery && i % k.jumpEvery === 0 && mode === 'play') p.buffer = 6; update(); } draw(); }
    };
})();
