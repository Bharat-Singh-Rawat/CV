/* =====================================================================
   Background physics scenes (faint graphite, behind section content):
   - #research     : ion thruster — ions accelerated through grids into a diverging plume
   - #publications : collider event display — tracks curling out of a collision vertex
   - #contact      : pulsed electron beam fracturing rock
   Each scene only animates while its section is on screen. Reduced-motion: one still frame.
   ===================================================================== */
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = () => window.innerWidth < 760;
    const INK = a => `rgba(29, 29, 31, ${Math.max(0, a).toFixed(3)})`;
    const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };   // deterministic events
    const scenes = [];

    function scene(id, band, init, frame) {
        const sec = document.getElementById(id);
        if (!sec) return;
        sec.classList.add('has-scene');
        const c = document.createElement('canvas');
        c.className = 'bg-scene'; c.setAttribute('aria-hidden', 'true');
        sec.prepend(c);
        scenes.push({ sec, c, ctx: c.getContext('2d'), band, init, frame, W: 0, H: 0, top: 0, running: false, visible: false, last: 0, t0: performance.now(), s: null });
    }

    function layout() {
        for (const S of scenes) {
            const dpr = Math.min(small() ? 1.25 : 1.5, window.devicePixelRatio || 1);
            S.W = S.sec.clientWidth;
            S.H = Math.min(S.band(S.sec), S.sec.clientHeight);
            S.c.style.height = S.H + 'px';
            S.c.width = Math.round(S.W * dpr); S.c.height = Math.round(S.H * dpr);
            S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            S.top = S.sec.getBoundingClientRect().top + window.scrollY;
            S.s = S.init(S);
            if (reduce) { S.ctx.clearRect(0, 0, S.W, S.H); S.frame(S, 2.6, 0); }
        }
        check();
    }

    function check() {
        if (reduce) return;
        const y = window.scrollY, vh = window.innerHeight;
        for (const S of scenes) {
            S.visible = !document.hidden && y + vh > S.top && y < S.top + S.H;
            if (S.visible && !S.running) { S.running = true; S.last = 0; requestAnimationFrame(n => loop(S, n)); }
        }
    }

    function loop(S, now) {
        if (!S.visible) { S.running = false; return; }
        const dt = S.last ? Math.min(0.05, (now - S.last) / 1000) : 0.016;
        S.last = now;
        S.ctx.clearRect(0, 0, S.W, S.H);
        S.frame(S, (now - S.t0) / 1000, dt);
        requestAnimationFrame(n => loop(S, n));
    }

    // ---------------------------------------------------------------- Faraday cup
    // A beam enters from the left, passes the suppressor ring and is collected on a 30° cone;
    // secondary electrons leave the cone and are turned back by the suppressor potential.
    scene('research', () => (small() ? 300 : 400), S => {
        const sm = small(), W = S.W, wrapW = Math.min(W, 1280) - 44, right = (W + wrapW) / 2;
        const s = {
            cx: sm ? W - 64 - 30 : Math.min(W - 120 - 60, right - 120 - 30),   // cup entrance (x): whole cup + shield stays on screen
            cy: sm ? 96 : 170, ap: sm ? 12 : 26, depth: sm ? 56 : 120, wall: sm ? 16 : 34,
            ions: [], sec: [], flashes: []
        };
        for (let i = 0; i < (sm ? 40 : 90); i++) s.ions.push(spawnBeamIon(s, true));
        return s;
    }, (S, t, dt) => {
        const { ctx } = S, s = S.s, x0 = s.cx, x1 = s.cx + s.depth, top = s.cy - s.ap - s.wall, bot = s.cy + s.ap + s.wall;
        ctx.lineWidth = 1;
        // grounded shield (outer housing)
        ctx.strokeStyle = INK(0.1);
        ctx.strokeRect(x0 - 26, top - 12, s.depth + 44, (bot - top) + 24);
        // suppressor electrode: two short plates either side of the entrance
        ctx.strokeStyle = INK(0.3); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0 - 12, top + 4); ctx.lineTo(x0 - 12, s.cy - s.ap - 4); ctx.moveTo(x0 - 12, s.cy + s.ap + 4); ctx.lineTo(x0 - 12, bot - 4); ctx.stroke();
        ctx.lineWidth = 1;
        // collector cup (cross-section): front lips, side walls, back with a 30° cone
        const coneH = s.ap * 1.15, coneL = coneH / Math.tan(Math.PI / 6) * 0.45;
        ctx.strokeStyle = INK(0.32);
        ctx.beginPath();
        ctx.moveTo(x0, s.cy - s.ap); ctx.lineTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(x1, bot); ctx.lineTo(x0, bot); ctx.lineTo(x0, s.cy + s.ap);
        ctx.stroke();
        ctx.strokeStyle = INK(0.22);                                          // inner bore + cone
        ctx.beginPath();
        ctx.moveTo(x0, s.cy - s.ap); ctx.lineTo(x1 - 14 - coneL, s.cy - s.ap); ctx.lineTo(x1 - 14, s.cy); ctx.lineTo(x1 - 14 - coneL, s.cy + s.ap); ctx.lineTo(x0, s.cy + s.ap);
        ctx.stroke();
        // cooling channels in the back wall
        ctx.strokeStyle = INK(0.12);
        for (const dy of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.arc(x1 - 7, s.cy + dy * (s.ap + s.wall * 0.6), 2.5, 0, Math.PI * 2); ctx.stroke(); }
        // beam envelope converging on the entrance
        ctx.strokeStyle = INK(0.045);
        ctx.beginPath(); ctx.moveTo(0, s.cy - s.ap * 2.2); ctx.lineTo(x0 - 12, s.cy - s.ap * 0.9); ctx.moveTo(0, s.cy + s.ap * 2.2); ctx.lineTo(x0 - 12, s.cy + s.ap * 0.9); ctx.stroke();
        // ions
        ctx.lineCap = 'round';
        const hitX = p => x1 - 14 - coneL * (Math.abs(p.y - s.cy) / s.ap);   // where an ion meets the cone face
        for (let i = 0; i < s.ions.length; i++) {
            const p = s.ions[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x > x0 - 12 && Math.abs(p.y - s.cy) > s.ap) { s.ions[i] = spawnBeamIon(s, false); continue; }    // clipped by the suppressor
            if (p.x >= hitX(p)) {                                               // collected
                if (Math.random() < 0.5) s.flashes.push({ x: p.x, y: p.y, life: 1 });
                if (Math.random() < 0.25) s.sec.push({ x: p.x - 2, y: p.y, vx: -(70 + Math.random() * 90), vy: (Math.random() - 0.5) * 80, life: 1 });
                s.ions[i] = spawnBeamIon(s, false); continue;
            }
            const fadeIn = Math.min(1, p.x / (S.W * 0.25));
            ctx.strokeStyle = INK(0.34 * p.a * fadeIn);
            ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        // collection flashes on the cone
        for (let i = s.flashes.length - 1; i >= 0; i--) {
            const f = s.flashes[i]; f.life -= dt * 4;
            if (f.life <= 0) { s.flashes.splice(i, 1); continue; }
            ctx.fillStyle = INK(0.3 * f.life); ctx.beginPath(); ctx.arc(f.x, f.y, 1.5 + (1 - f.life) * 3, 0, Math.PI * 2); ctx.fill();
        }
        // secondary electrons: pushed back toward the cone by the suppressor field
        ctx.fillStyle = INK(0.4);
        for (let i = s.sec.length - 1; i >= 0; i--) {
            const e = s.sec[i];
            e.vx += 900 * dt;                                                   // retarding field near the entrance turns them round
            e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt * 0.9;
            if (e.life <= 0 || e.x > x1 || Math.abs(e.y - s.cy) > s.ap) { s.sec.splice(i, 1); continue; }
            ctx.beginPath(); ctx.arc(e.x, e.y, 1.1, 0, Math.PI * 2); ctx.fill();
        }
    });
    function spawnBeamIon(s, anywhere) {
        const y0 = s.cy + (Math.random() * 2 - 1) * s.ap * 2.1, yT = s.cy + (Math.random() * 2 - 1) * s.ap * 0.85;
        const v = 170 + Math.random() * 90, len = s.cx;
        const p = { x: -10, y: y0, vx: v, vy: (yT - y0) / len * v, a: 0.5 + Math.random() * 0.5 };
        if (anywhere) { const k = Math.random() * (s.cx + s.depth * 0.6) / v; p.x += p.vx * k; p.y += p.vy * k; }
        return p;
    }

    // ---------------------------------------------------------------- collider event display
    scene('publications', () => (small() ? 560 : 820), S => {
        const W = S.W, wide = W >= 1200;
        const head = S.sec.querySelector('.sec-head'), list = S.sec.querySelector('.pubs');
        const secR = S.sec.getBoundingClientRect();
        const padTop0 = parseFloat(getComputedStyle(S.sec).paddingTop) || 0, hh = head ? head.getBoundingClientRect().height : 200;
        // medium screens and phones: a smaller detector beside the centred heading, in the free space to the right
        let sc = small() ? 0.34 : 0.55;
        let cx = W - 18 - 222 * sc - (small() ? 0 : Math.max(0, (W - 1100) / 2));
        let cy = padTop0 + hh / 2;
        if (wide && head && list) {
            const hr = head.getBoundingClientRect(), lr = list.getBoundingClientRect();
            const colL = hr.left - secR.left, colR = lr.left - secR.left - 28;   // the empty left column, with a margin
            const outer = 222;                                                // outermost drawn radius at scale 1 (rings + deposits)
            sc = Math.min(0.95, (colR - colL) / 2 / outer);
            cx = (colL + colR) / 2;
            // vertical place from the section's padding + heading height: both are unaffected by the sticky offset
            const padTop = parseFloat(getComputedStyle(S.sec).paddingTop) || 0;
            cy = padTop + hr.height + outer * sc + 40;
        }
        const lim = S.H - 12;                                                // keep the outer ring inside the canvas
        if (cy + 222 * sc > lim) { sc = Math.max(0.4, (lim - cy) / 222); if (cy + 222 * sc > lim) cy = lim - 222 * sc; }
        return {
            cx, cy, sc,
            a: wide ? 1 : (small() ? 0.75 : 0.9),
            period: 3.2
        };
    }, (S, t) => {
        const { ctx } = S, s = S.s, R = [38, 64, 96, 130, 168, 200].map(r => r * s.sc);
        // detector layers
        ctx.lineWidth = 1;
        R.forEach((r, k) => { ctx.strokeStyle = INK((k === R.length - 1 ? 0.1 : 0.06) * s.a); ctx.beginPath(); ctx.arc(s.cx, s.cy, r, 0, Math.PI * 2); ctx.stroke(); });
        ctx.strokeStyle = INK(0.05 * s.a);
        for (let k = 0; k < 24; k++) {                                        // calorimeter segmentation
            const a = k / 24 * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(s.cx + Math.cos(a) * R[4], s.cy + Math.sin(a) * R[4]); ctx.lineTo(s.cx + Math.cos(a) * R[5], s.cy + Math.sin(a) * R[5]); ctx.stroke();
        }
        const idx = Math.floor(t / s.period), age = t - idx * s.period;
        drawEvent(S, idx, age, R);
        if (age < 1.2) drawEvent(S, idx - 1, age + s.period, R);             // previous event still fading out
    });
    function drawEvent(S, idx, age, R) {
        const { ctx } = S, s = S.s, rnd = rng(1000 + idx * 7919);
        const grow = Math.min(1, age / 0.7), ease = 1 - Math.pow(1 - grow, 3);
        const fade = age < 1.6 ? 1 : Math.max(0, 1 - (age - 1.6) / 1.6);
        if (fade <= 0) return;
        const n = 10 + Math.floor(rnd() * 12), Rmax = R[4];
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
            const phi = rnd() * Math.PI * 2, neutral = rnd() < 0.18;
            const k = neutral ? 0 : (rnd() - 0.5) * 0.028 / s.sc;            // curvature ∝ charge / momentum
            const len = (0.45 + rnd() * 0.55) * Rmax * (neutral ? 1.05 : 1.25), segs = 26;
            ctx.strokeStyle = INK((neutral ? 0.18 : 0.32) * fade * s.a);
            ctx.setLineDash(neutral ? [3, 4] : []);
            ctx.beginPath(); ctx.moveTo(s.cx, s.cy);
            let ex = s.cx, ey = s.cy, inside = true;
            for (let j = 1; j <= segs && inside; j++) {
                const sl = len * ease * j / segs;
                const x = Math.abs(k) < 1e-6 ? s.cx + Math.cos(phi) * sl : s.cx + (Math.sin(phi + k * sl) - Math.sin(phi)) / k;
                const y = Math.abs(k) < 1e-6 ? s.cy + Math.sin(phi) * sl : s.cy - (Math.cos(phi + k * sl) - Math.cos(phi)) / k;
                if (Math.hypot(x - s.cx, y - s.cy) > Rmax) inside = false;
                ctx.lineTo(x, y); ex = x; ey = y;
            }
            ctx.stroke();
            if (!inside && grow >= 1 && !neutral) {                          // energy deposit in the calorimeter
                const a = Math.atan2(ey - s.cy, ex - s.cx);
                ctx.setLineDash([]);
                ctx.strokeStyle = INK(0.35 * fade * s.a); ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(s.cx + Math.cos(a) * R[4], s.cy + Math.sin(a) * R[4]); ctx.lineTo(s.cx + Math.cos(a) * (R[4] + 6 + rnd() * 18), s.cy + Math.sin(a) * (R[4] + 6 + rnd() * 18)); ctx.stroke();
                ctx.lineWidth = 1;
            }
        }
        ctx.setLineDash([]);
        ctx.fillStyle = INK(0.5 * fade * s.a);                                // vertex
        ctx.beginPath(); ctx.arc(s.cx, s.cy, 2, 0, Math.PI * 2); ctx.fill();
    }

    // ---------------------------------------------------------------- pulsed electron beam breaking rock
    scene('contact', sec => sec.clientHeight, S => {
        const sm = small();
        const s = {
            rx: S.W * (sm ? 0.8 : 0.8), r: sm ? 24 : 54, ry: S.H - (sm ? 24 : 54) * 0.9 - (sm ? 14 : 22),   // bottom-right, below the links
            pulse: 1.25, lastPulse: -1, hits: 0, cracks: [], frags: [], verts: [], broken: -1, bunches: []
        };
        newRock(s);
        if (reduce) { s.hits = 4; for (let i = 0; i < 4; i++) crack(s); }
        return s;
    }, (S, t, dt) => {
        const { ctx } = S, s = S.s, by = s.ry, x0 = 0;
        const hitX = s.verts.length ? (s.lastFace = faceX(s)) : (s.lastFace || s.rx - s.r);   // beam meets the rock's current surface
        const pIdx = Math.floor(t / s.pulse);
        // new pulse: launch a bunch
        if (!reduce && pIdx !== s.lastPulse && s.broken < 0) { s.lastPulse = pIdx; s.bunches.push({ x: x0 }); }
        // beam pipe line (faint) + pulse glow
        const since = t - pIdx * s.pulse;
        ctx.lineWidth = 1;
        ctx.strokeStyle = INK(0.07); ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(hitX, by); ctx.stroke();
        // bunches travel to the rock
        ctx.lineCap = 'round';
        for (let i = s.bunches.length - 1; i >= 0; i--) {
            const b = s.bunches[i];
            b.x += S.W * 1.6 * dt;
            ctx.strokeStyle = INK(0.45); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(Math.max(x0, b.x - 60), by); ctx.lineTo(Math.min(b.x, hitX), by); ctx.stroke();
            ctx.lineWidth = 1;
            if (b.x >= hitX) { s.bunches.splice(i, 1); impact(s); }
        }
        // impact flash
        if (since < 0.18 && s.broken < 0 && !reduce) {
            ctx.fillStyle = INK(0.18 * (1 - since / 0.18));
            ctx.beginPath(); ctx.arc(hitX, by, 6 + since * 60, 0, Math.PI * 2); ctx.fill();
        }
        // rock
        if (s.broken < 0 || t - s.broken < 0) {
            ctx.fillStyle = 'rgba(29, 29, 31, 0.035)'; ctx.strokeStyle = INK(0.22);
            ctx.beginPath(); s.verts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = INK(0.28);
            for (const c of s.cracks) { ctx.beginPath(); c.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
        } else if (t - s.broken > 1.8) newRock(s);                           // a fresh rock rolls in
        // fragments with gravity
        for (let i = s.frags.length - 1; i >= 0; i--) {
            const f = s.frags[i];
            f.vy += 420 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; f.life -= dt * 0.7;
            if (f.life <= 0 || f.y > S.H + 20) { s.frags.splice(i, 1); continue; }
            ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
            ctx.strokeStyle = INK(0.3 * f.life); ctx.beginPath(); ctx.moveTo(-f.sz, -f.sz * 0.4); ctx.lineTo(f.sz * 0.6, -f.sz * 0.7); ctx.lineTo(f.sz * 0.3, f.sz * 0.6); ctx.closePath(); ctx.stroke();
            ctx.restore();
        }
        if (s.broken >= 0 && t - s.broken < 0) s.broken = -1;
        if (s.pendingBreak) { s.broken = t; s.pendingBreak = false; }
    });
    function newRock(s) {
        const n = 32, out = [];                                              // enough vertices for a crater to form
        for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2, rr = s.r * (0.82 + Math.random() * 0.26) * (k === n / 2 ? 1 : 1);
            out.push([s.rx + Math.cos(a) * rr * 1.15, s.ry + Math.sin(a) * rr * 0.75]);
        }
        s.verts = out; s.cracks = []; s.hits = 0; s.broken = -1; s.bunches = []; s.lastFace = faceX(s);
    }
    // leftmost point where the beam line (y = ry) crosses the rock outline = where the beam actually hits
    function faceX(s) {
        let best = Infinity;
        const v = s.verts;
        for (let k = 0; k < v.length; k++) {
            const [x1, y1] = v[k], [x2, y2] = v[(k + 1) % v.length];
            if ((y1 - s.ry) * (y2 - s.ry) <= 0 && y1 !== y2) {
                const x = x1 + (s.ry - y1) * (x2 - x1) / (y2 - y1);
                if (x < best) best = x;
            }
        }
        return isFinite(best) ? best : s.rx - s.r;
    }
    function crack(s) {
        const pts = [[faceX(s), s.ry]];                                      // cracks start at the current impact point
        let [x, y] = pts[0], a = (Math.random() - 0.5) * 0.9;
        const steps = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < steps; i++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * s.r * 0.18; y += Math.sin(a) * s.r * 0.18; pts.push([x, y]); }
        s.cracks.push(pts);
    }
    function impact(s) {
        s.hits++;
        const hx = faceX(s), reach = s.r * 0.42, depth = s.r * 0.1;
        // bore a crater: material nearest the impact point is removed most, so the face recedes where the beam hits
        s.verts = s.verts.map(([x, y]) => {
            const d = Math.hypot(x - hx, (y - s.ry) * 1.3);
            return d < reach ? [x + depth * (1 - d / reach) ** 1.5, y] : [x, y];
        });
        // cracks spread from the new crater floor and older cracks move with it
        crack(s);
        for (let i = 0; i < 6; i++) s.frags.push({ x: hx, y: s.ry + (Math.random() - 0.5) * 6, vx: -40 - Math.random() * 120, vy: -120 - Math.random() * 160, rot: 0, vr: (Math.random() - 0.5) * 8, sz: 2 + Math.random() * 4, life: 1 });
        if (s.hits >= 9) {                                                    // fracture: the whole rock bursts into fragments
            for (const [vx, vy] of s.verts.filter((_, k) => k % 2 === 0)) s.frags.push({ x: vx, y: vy, vx: (vx - s.rx) * 2.2 + (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 180, rot: 0, vr: (Math.random() - 0.5) * 10, sz: 4 + Math.random() * 7, life: 1.2 });
            s.cracks = []; s.verts = []; s.pendingBreak = true;
        }
    }

    // ---------------------------------------------------------------- wiring
    let ticking = false;
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; check(); }); } }, { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(layout));
    window.addEventListener('load', layout);
    document.addEventListener('visibilitychange', check);
    layout();
})();
